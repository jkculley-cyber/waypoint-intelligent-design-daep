// Supabase Edge Function: verify-and-approve-override
//
// CC22 R2 finding F-R2-4 (Reyes residual + Chen SOC 2 Type 2 readiness):
// migration 078 only requires that supporting_document_url be a non-empty
// string. Smoke test confirmed `storage://test/078-1-fake.pdf` passes —
// "show me the parent waiver" / "that URL returns 404" exposure.
//
// This function adds the missing validation layer between request and
// approval. Workflow:
//   1. Caller authenticates (admin/principal/sped_coordinator).
//   2. Function looks up the override request, reads supporting_document_url.
//   3. Function calls Supabase Storage to confirm file exists with non-zero
//      size and acceptable MIME (PDF/JPG/PNG/Word).
//   4. If valid, function invokes fn_approve_compliance_override RPC under
//      the CALLER's auth — dual-signature CHECK fires (approver != requester)
//      and audit trigger captures caller's auth.uid().
//   5. Returns the verified document metadata in the success body so the UI
//      can confirm to the approver what was actually validated.
//
// Deploy: `supabase functions deploy verify-and-approve-override --no-verify-jwt=false`
// Required secrets: SUPABASE_URL, SERVICE_ROLE_KEY, SUPABASE_ANON_KEY

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SERVICE_ROLE_KEY')!
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!

const ACCEPTED_MIMES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
])

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

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const authHeader = req.headers.get('authorization')
    if (!authHeader) return jsonResponse({ error: 'Missing authorization' }, 401)

    // Caller-scoped client — used to invoke the approve RPC so auth.uid() is
    // the caller (essential for dual-signature CHECK + audit attribution).
    const callerClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: { user }, error: authErr } = await callerClient.auth.getUser()
    if (authErr || !user) return jsonResponse({ error: 'Unauthorized' }, 401)

    const { request_id, approval_notes } = await req.json().catch(() => ({}))
    if (!request_id) return jsonResponse({ error: 'request_id required' }, 400)

    // Service-role client — used to read the request row and inspect Storage.
    // Storage admin API + override_requests SELECT both bypass RLS this way.
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    })

    const { data: request, error: reqErr } = await admin
      .from('compliance_override_requests')
      .select('id, supporting_document_url, approval_status, requested_by')
      .eq('id', request_id)
      .single()

    if (reqErr || !request) {
      return jsonResponse({ error: 'Override request not found' }, 404)
    }

    if (request.approval_status !== 'pending') {
      return jsonResponse({
        error: `Cannot approve: request is already ${request.approval_status}`,
      }, 409)
    }

    if (request.requested_by === user.id) {
      // Belt-and-suspenders. The DB CHECK + RPC both enforce, but reject early
      // here too so we don't waste the storage round-trip.
      return jsonResponse({
        error: 'Same-user approval rejected. A different admin / principal / SPED coordinator must approve.',
      }, 403)
    }

    // ─── DOCUMENT VALIDATION ──────────────────────────────────────────────
    const docPath = request.supporting_document_url
    if (!docPath || typeof docPath !== 'string') {
      return jsonResponse({
        error: 'Supporting document URL is missing on the request',
      }, 422)
    }
    if (docPath.startsWith('http://') || docPath.startsWith('https://')) {
      return jsonResponse({
        error: 'Supporting document URL must be a Supabase Storage path, not an external URL',
      }, 422)
    }

    const lastSlash = docPath.lastIndexOf('/')
    const folder = lastSlash >= 0 ? docPath.slice(0, lastSlash) : ''
    const filename = lastSlash >= 0 ? docPath.slice(lastSlash + 1) : docPath

    if (!filename) {
      return jsonResponse({
        error: 'Supporting document path has no filename component',
      }, 422)
    }

    const { data: files, error: listErr } = await admin.storage
      .from('daep-documents')
      .list(folder, { search: filename, limit: 5 })

    if (listErr) {
      return jsonResponse({
        error: `Storage lookup failed: ${listErr.message}`,
      }, 502)
    }

    const file = (files || []).find((f: { name: string }) => f.name === filename)
    if (!file) {
      return jsonResponse({
        error: 'Supporting document not found in Storage. Withdraw this request and re-submit with a fresh upload.',
      }, 422)
    }

    const mime = (file as { metadata?: { mimetype?: string; size?: number } }).metadata?.mimetype
    const size = (file as { metadata?: { mimetype?: string; size?: number } }).metadata?.size

    if (!size || size === 0) {
      return jsonResponse({
        error: 'Supporting document is empty (0 bytes). Re-upload a real file.',
      }, 422)
    }

    if (mime && !ACCEPTED_MIMES.has(mime)) {
      return jsonResponse({
        error: `Supporting document MIME "${mime}" is not accepted. Use PDF, JPG, PNG, or Word.`,
      }, 422)
    }

    // ─── APPROVAL ─────────────────────────────────────────────────────────
    // Document validated. Invoke the approve RPC under the CALLER's auth so
    // (a) dual-signature CHECK fires (approver != requester at DB level),
    // (b) audit trigger captures the caller's auth.uid() correctly,
    // (c) RPC's role check (admin/principal/sped_coordinator) runs against
    //     the caller, not the service role.
    const { error: approveErr } = await callerClient.rpc('fn_approve_compliance_override', {
      p_request_id: request_id,
      p_approval_notes: approval_notes || null,
    })

    if (approveErr) {
      return jsonResponse({ error: approveErr.message }, approveErr.code === '42501' ? 403 : 400)
    }

    return jsonResponse({
      success: true,
      document_verified: {
        filename: file.name,
        mime: mime || null,
        size_bytes: size,
      },
    })
  } catch (err) {
    console.error('verify-and-approve-override error:', err)
    return jsonResponse({ error: 'Internal server error' }, 500)
  }
})
