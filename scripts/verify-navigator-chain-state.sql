-- Navigator audit-chain state verification (READ-ONLY) — SINGLE-QUERY version
-- ==========================================================================
-- The Supabase SQL Editor only returns the LAST statement's result when a
-- multi-statement script is run, so this is consolidated into ONE query that
-- returns a single JSON cell with every diagnostic. Run it and paste `result`.
--
-- Purpose: confirm (or refute) that Navigator's audit trail is ALREADY covered
-- by migration 081's tamper-evident hash chain — fn_navigator_audit_trigger (067)
-- writes into the shared `audit_log`, which 081's trg_audit_log_mirror chains
-- into `audit_edit_log` regardless of row source.
--
-- digest() lives in the `extensions` schema on Supabase (pgcrypto). If the query
-- errors with "function extensions.digest does not exist", replace the two
-- `extensions.digest(` with bare `digest(` and re-run.
--
-- If it errors with "relation audit_edit_log does not exist", that IS the answer:
-- migration 081 was never applied — Navigator (and Waypoint) have no chain.

WITH applied AS (
  SELECT
    to_regclass('public.audit_edit_log')::text                 AS edit_log_table,
    (SELECT count(*) FROM pg_trigger
       WHERE tgrelid = 'public.audit_log'::regclass
         AND tgname  = 'trg_audit_log_mirror'
         AND NOT tgisinternal)                                  AS mirror_trigger_cnt,
    to_regprocedure('public.fn_append_audit_edit_log(uuid)')::text   AS append_fn,
    to_regprocedure('public.fn_verify_audit_edit_log_chain()')::text AS verify_fn,
    (SELECT count(*) FROM audit_edit_log)                       AS chain_rows,
    (SELECT count(*) FROM audit_log)                            AS audit_log_rows
),
nav_raw AS (
  SELECT al.entity_type,
         count(DISTINCT al.id)                                   AS in_audit_log,
         count(DISTINCT ae.audit_log_id)                         AS in_chain,
         count(DISTINCT al.id) - count(DISTINCT ae.audit_log_id) AS unmirrored
  FROM audit_log al
  LEFT JOIN audit_edit_log ae ON ae.audit_log_id = al.id
  WHERE al.entity_type LIKE 'navigator%'
     OR al.entity_type = 'manifestation_determinations'
  GROUP BY al.entity_type
),
nav_cov AS (
  SELECT coalesce(sum(unmirrored), 0) AS total_unmirrored,
         coalesce(jsonb_object_agg(entity_type,
           jsonb_build_object('in_audit_log', in_audit_log,
                              'in_chain', in_chain,
                              'unmirrored', unmirrored)), '{}'::jsonb) AS by_entity
  FROM nav_raw
),
chain AS (
  SELECT seq, row_canonical, prev_row_hash, row_hash,
         LAG(row_hash) OVER (ORDER BY seq) AS computed_prev
  FROM audit_edit_log
),
integ AS (
  SELECT count(*) AS total_rows,
    count(*) FILTER (
      WHERE row_hash <> encode(extensions.digest(coalesce(computed_prev,'') || row_canonical,'sha256'),'hex')
         OR prev_row_hash IS DISTINCT FROM computed_prev) AS broken_rows,
    min(seq) FILTER (
      WHERE row_hash <> encode(extensions.digest(coalesce(computed_prev,'') || row_canonical,'sha256'),'hex')
         OR prev_row_hash IS DISTINCT FROM computed_prev) AS first_broken_seq
  FROM chain
),
snap AS (
  SELECT
    count(*) FILTER (WHERE entity_type='navigator_placements')                                                       AS placements_total,
    count(*) FILTER (WHERE entity_type='navigator_placements' AND changes->'new'->'reason_history' IS NOT NULL)      AS placements_with_reason_snap,
    count(*) FILTER (WHERE entity_type='navigator_referrals')                                                        AS referrals_total,
    count(*) FILTER (WHERE entity_type='navigator_referrals'  AND changes->'new'->'description_history' IS NOT NULL) AS referrals_with_desc_snap
  FROM audit_edit_log
  WHERE entity_type IN ('navigator_placements','navigator_referrals')
)
SELECT jsonb_pretty(jsonb_build_object(
  'block1_applied',              to_jsonb(applied.*),
  'block2_nav_unmirrored_total', nav_cov.total_unmirrored,
  'block2_by_entity',            nav_cov.by_entity,
  'block3_integrity',            to_jsonb(integ.*),
  'block4_snapshot',             to_jsonb(snap.*)
)) AS result
FROM applied, nav_cov, integ, snap;
