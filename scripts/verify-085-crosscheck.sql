-- 085 cross-check logic validation + live tamper scan (READ-ONLY)
-- ===============================================================
-- Replicates fn_navigator_verify_student_history's core comparison across ALL
-- Navigator records (no auth gate, so it runs in the SQL Editor). Proves the
-- cross-check logic against real prod data AND scans for any record whose live
-- *_history JSONB diverges from the immutable chain (= edited outside the
-- audited path). Run it; paste the result.
--
-- Expected for a healthy system: unaudited=0, history_mismatch=0, value_mismatch=0
-- for both entity types. Any nonzero history_mismatch is a record to investigate
-- (the 072 attack vector: JSONB edited with the audit trigger bypassed).

WITH pl AS (
  SELECT id, reason, reason_history FROM navigator_placements
),
pl_chain AS (
  SELECT DISTINCT ON (entity_id) entity_id, seq, changes->'new' AS snap
    FROM audit_edit_log WHERE entity_type='navigator_placements'
   ORDER BY entity_id, seq DESC
),
rf AS (
  SELECT id, description, description_history FROM navigator_referrals
),
rf_chain AS (
  SELECT DISTINCT ON (entity_id) entity_id, seq, changes->'new' AS snap
    FROM audit_edit_log WHERE entity_type='navigator_referrals'
   ORDER BY entity_id, seq DESC
),
checks AS (
  SELECT 'navigator_placements' AS et, pl.id,
         (c.seq IS NOT NULL) AS audited,
         COALESCE(pl.reason_history,'[]'::jsonb) = COALESCE(c.snap->'reason_history','[]'::jsonb) AS hist_ok,
         COALESCE(pl.reason,'')                  = COALESCE(c.snap->>'reason','')                 AS val_ok
  FROM pl LEFT JOIN pl_chain c ON c.entity_id = pl.id
  UNION ALL
  SELECT 'navigator_referrals', rf.id,
         (c.seq IS NOT NULL),
         COALESCE(rf.description_history,'[]'::jsonb) = COALESCE(c.snap->'description_history','[]'::jsonb),
         COALESCE(rf.description,'')                  = COALESCE(c.snap->>'description','')
  FROM rf LEFT JOIN rf_chain c ON c.entity_id = rf.id
)
SELECT et,
       count(*)                              AS records,
       count(*) FILTER (WHERE audited)       AS audited,
       count(*) FILTER (WHERE NOT audited)   AS unaudited,        -- expect 0
       count(*) FILTER (WHERE NOT hist_ok)   AS history_mismatch, -- expect 0
       count(*) FILTER (WHERE NOT val_ok)    AS value_mismatch    -- expect 0
FROM checks
GROUP BY et
ORDER BY et;
