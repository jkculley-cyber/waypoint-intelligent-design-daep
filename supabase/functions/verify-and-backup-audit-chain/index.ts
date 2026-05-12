// Supabase Edge Function: verify-and-backup-audit-chain
//
// CC24 T3 Phase 2 — externalizes the audit_edit_log chain head + delta
// rows to a write-only Supabase Storage bucket so a privileged DB attacker
// who rewrites the in-DB chain must also rewrite every Storage object to
// stay undetected. Cron-invoked hourly via pg_cron (migration 082).
//
// Algorithm:
//   1. Try to acquire the singleton run-lock via fn_try_acquire_audit_backup_lock.
//      Returns false if another run is in progress and not stale (>5 min).
//   2. Call fn_verify_audit_edit_log_chain — returns head_hash / head_seq
//      / broken_count / first_broken_seq / total_count.
//   3. Call fn_verify_audit_log_matches_edit_log — returns audit_log ↔
//      audit_edit_log discrepancy counts.
//   4. Fetch audit_edit_log rows since last_backed_up_seq.
//   5. Write rows as JSONL to Storage at
//      YYYY/MM/DD/<runISO>_<runId>_rows_<start>_<end>.jsonl
//   6. Write chain_head.json summary to same folder.
//   7. Call fn_complete_audit_backup_run to flip state.last_status to 'ok'
//      or 'integrity_failure' based on verify results.
//
// On error: state.last_status flipped to 'error' + last_error populated.
// Phase 3 UI surface polls state.last_status / last_run_at to alarm on
// stale runs (>4 hours at hourly cadence).
//
// Deploy:
//   npx supabase functions deploy verify-and-backup-audit-chain \
//     --project-ref kvxecksvkimcgwhxxyhw --no-verify-jwt
//
// --no-verify-jwt because the function is invoked by pg_cron with a
// service-role bearer (not a user JWT). The function uses SERVICE_ROLE_KEY
// internally for all DB/Storage operations; the bearer is only used by
// the gateway. Manual invocation by waypoint_admin during smoke test
// works the same way (any bearer accepted at the gateway; the function
// uses its own service-role internally regardless of caller).
//
// Required secrets: SUPABASE_URL, SERVICE_ROLE_KEY.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SERVICE_ROLE_KEY')!
const BUCKET = 'audit-edit-log-backups'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function datePrefix(iso: string): string {
  return iso.slice(0, 10).replace(/-/g, '/')
}

interface ChainVerify {
  first_broken_seq: number | null
  broken_count: number
  total_count: number
  head_hash: string | null
  head_seq: number | null
}

interface CrossVerify {
  audit_log_total: number
  audit_edit_log_total: number
  unmirrored_count: number
  orphaned_count: number
  mismatched_count: number
  first_unmirrored_id: string | null
  first_orphaned_audit_log_id: string | null
  first_mismatched_id: string | null
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  })

  // 1. Acquire singleton lock — atomic via UPDATE-WHERE.
  const { data: gotLock, error: lockErr } = await admin.rpc('fn_try_acquire_audit_backup_lock')
  if (lockErr) {
    return jsonResponse({ status: 'lock_rpc_error', error: lockErr.message }, 500)
  }
  if (!gotLock) {
    return jsonResponse({ status: 'already_running' }, 200)
  }

  // From here, any error must release the lock by calling fn_complete_audit_backup_run.
  const runId = crypto.randomUUID()
  const runStartedAt = new Date().toISOString()

  try {
    // 2. Verify chain integrity
    const { data: chainRaw, error: chainErr } = await admin.rpc('fn_verify_audit_edit_log_chain')
    if (chainErr) throw new Error(`verify chain: ${chainErr.message}`)
    const chain: ChainVerify = Array.isArray(chainRaw) ? chainRaw[0] : chainRaw

    // 3. Verify cross-check
    const { data: crossRaw, error: crossErr } = await admin.rpc('fn_verify_audit_log_matches_edit_log')
    if (crossErr) throw new Error(`verify cross-check: ${crossErr.message}`)
    const cross: CrossVerify = Array.isArray(crossRaw) ? crossRaw[0] : crossRaw

    // 4. Read current cursor
    const { data: stateRow, error: stateErr } = await admin
      .from('audit_chain_backup_state')
      .select('last_backed_up_seq')
      .eq('id', 1)
      .single()
    if (stateErr || !stateRow) throw new Error(`read state: ${stateErr?.message || 'no row'}`)
    const lastSeq: number = stateRow.last_backed_up_seq ?? 0

    // 5. Fetch new rows since cursor — chain delta to back up.
    const { data: newRows, error: rowsErr } = await admin
      .from('audit_edit_log')
      .select('seq,audit_log_id,district_id,user_id,action,entity_type,entity_id,audit_created_at,row_canonical,prev_row_hash,row_hash')
      .gt('seq', lastSeq)
      .order('seq', { ascending: true })
    if (rowsErr) throw new Error(`fetch new rows: ${rowsErr.message}`)

    const folder = datePrefix(runStartedAt)
    let rowsPath: string | null = null

    if (newRows && newRows.length > 0) {
      const startSeq = newRows[0].seq
      const endSeq = newRows[newRows.length - 1].seq
      rowsPath = `${folder}/${runStartedAt}_${runId}_rows_${startSeq}_${endSeq}.jsonl`
      const jsonl = newRows.map((r) => JSON.stringify(r)).join('\n')
      const { error: uploadErr } = await admin
        .storage
        .from(BUCKET)
        .upload(rowsPath, jsonl, { contentType: 'application/x-ndjson', upsert: false })
      if (uploadErr) throw new Error(`upload rows: ${uploadErr.message}`)
    }

    // 6. Write chain_head.json — the authoritative attestation for this run.
    const integrityOk =
      chain.broken_count === 0 &&
      cross.mismatched_count === 0 &&
      cross.orphaned_count === 0

    const headPayload = {
      run_id: runId,
      run_at: runStartedAt,
      cadence: 'hourly',
      chain_head: {
        head_hash: chain.head_hash,
        head_seq: chain.head_seq,
        total_count: chain.total_count,
        broken_count: chain.broken_count,
        first_broken_seq: chain.first_broken_seq,
      },
      cross_check: cross,
      backup: {
        rows_path: rowsPath,
        new_rows_count: newRows?.length ?? 0,
        prior_cursor: lastSeq,
      },
      integrity_ok: integrityOk,
    }
    const headPath = `${folder}/${runStartedAt}_${runId}_chain_head.json`
    const { error: headUploadErr } = await admin
      .storage
      .from(BUCKET)
      .upload(headPath, JSON.stringify(headPayload, null, 2), {
        contentType: 'application/json',
        upsert: false,
      })
    if (headUploadErr) throw new Error(`upload head: ${headUploadErr.message}`)

    // 7. Complete the run — flip state.last_status atomically.
    const status = integrityOk ? 'ok' : 'integrity_failure'
    const errorDetail = integrityOk
      ? null
      : `chain_broken=${chain.broken_count} orphaned=${cross.orphaned_count} mismatched=${cross.mismatched_count} unmirrored=${cross.unmirrored_count} first_broken_seq=${chain.first_broken_seq} first_orphan=${cross.first_orphaned_audit_log_id} first_mismatch=${cross.first_mismatched_id}`

    const { error: completeErr } = await admin.rpc('fn_complete_audit_backup_run', {
      p_status: status,
      p_backed_up_seq: chain.head_seq ?? lastSeq,
      p_head_hash: chain.head_hash,
      p_head_seq: chain.head_seq,
      p_error: errorDetail,
    })
    if (completeErr) {
      console.error('fn_complete_audit_backup_run failed:', completeErr.message)
    }

    return jsonResponse({
      status,
      run_id: runId,
      head_seq: chain.head_seq,
      head_hash: chain.head_hash,
      new_rows_count: newRows?.length ?? 0,
      head_path: headPath,
      rows_path: rowsPath,
      cross_check: cross,
    }, 200)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('verify-and-backup-audit-chain error:', msg)
    await admin.rpc('fn_complete_audit_backup_run', {
      p_status: 'error',
      p_backed_up_seq: null,
      p_head_hash: null,
      p_head_seq: null,
      p_error: msg.slice(0, 1000),
    })
    return jsonResponse({ status: 'error', run_id: runId, error: msg }, 500)
  }
})
