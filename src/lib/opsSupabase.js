import { createClient } from '@supabase/supabase-js'
import { supabase } from './supabase'

export const opsSupabase = createClient(
  'https://xbpuqaqpcbixxodblaes.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhicHVxYXFwY2JpeHhvZGJsYWVzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIzNjk4MDQsImV4cCI6MjA4Nzk0NTgwNH0.9Rhmz-FLUXnEQXpRCkg3G2ppzPxs2DinaYDmdD_wvPA'
)

// demo_leads on the ops project is RLS-locked to anon-INSERT-only, so reads/edits
// must go through the ops-leads Edge Function (main project), which verifies the
// caller is a waypoint_admin and uses the ops service role server-side.
// action: 'list' | 'update' ({ id, status }) | 'delete' ({ id })
export async function opsLeads(action, payload = {}) {
  const { data, error } = await supabase.functions.invoke('ops-leads', {
    body: { action, ...payload },
  })
  if (error) throw error
  if (data?.error) throw new Error(data.error)
  return data
}
