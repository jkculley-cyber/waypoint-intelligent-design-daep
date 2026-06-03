-- Forensics on the unaudited live Navigator records (READ-ONLY)
-- =============================================================
-- The cross-check found ~half of live placements/referrals have no chain
-- snapshot. This determines WHY: are they old records that predate the audit
-- trigger (migration 066), or is the trigger currently failing to fire?
--
-- Interpretation:
--   * If the NOT-in_chain group has in_audit_log=false AND an EARLIER created_at
--     range than the in_chain group  -> they predate the audit trigger. The
--     trigger is healthy now; the gap is purely historical -> backfill baselines.
--   * If NOT-in_chain rows have RECENT created_at -> the trigger is currently
--     being bypassed on insert -> stop and fix that before any backfill.
--   * If any NOT-in_chain row has in_audit_log=true -> a mirror gap (would
--     contradict Block 2's unmirrored=0; investigate).

WITH pl AS (
  SELECT p.id, p.created_at,
    EXISTS (SELECT 1 FROM audit_edit_log ae
              WHERE ae.entity_type='navigator_placements' AND ae.entity_id=p.id) AS in_chain,
    EXISTS (SELECT 1 FROM audit_log al
              WHERE al.entity_type='navigator_placements' AND al.entity_id=p.id) AS in_audit_log
  FROM navigator_placements p
),
rf AS (
  SELECT r.id, r.created_at,
    EXISTS (SELECT 1 FROM audit_edit_log ae
              WHERE ae.entity_type='navigator_referrals' AND ae.entity_id=r.id) AS in_chain,
    EXISTS (SELECT 1 FROM audit_log al
              WHERE al.entity_type='navigator_referrals' AND al.entity_id=r.id) AS in_audit_log
  FROM navigator_referrals r
)
SELECT 'navigator_placements' AS et, in_chain, in_audit_log, count(*) AS n,
       min(created_at) AS earliest, max(created_at) AS latest
FROM pl GROUP BY in_chain, in_audit_log
UNION ALL
SELECT 'navigator_referrals', in_chain, in_audit_log, count(*),
       min(created_at), max(created_at)
FROM rf GROUP BY in_chain, in_audit_log
ORDER BY et, in_chain;
