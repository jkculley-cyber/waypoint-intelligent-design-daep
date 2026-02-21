import { supabase } from './supabase'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

/**
 * Send a notification email via the Supabase Edge Function.
 * Silently ignores errors to avoid blocking the caller's primary action.
 *
 * @param {object} params
 * @param {string} params.to       - Recipient email
 * @param {string} params.subject  - Email subject
 * @param {string} params.template - Template name (e.g. 'incident_approved')
 * @param {object} params.data     - Template data
 */
export async function sendNotification({ to, subject, template, data }) {
  if (!to || !SUPABASE_URL) return

  try {
    // Check recipient's notification preferences first
    const { data: prefs } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('profile_id', data?.recipientProfileId)
      .maybeSingle()

    // Map template to preference key
    const prefKey = {
      incident_submitted: 'incident_submitted',
      incident_approved:  'incident_approved',
      incident_denied:    'incident_denied',
      placement_starting: 'placement_reminders',
      review_due:         'review_due_alerts',
      parent_notice:      'incident_submitted',
    }[template]

    // If preferences exist and the relevant pref is explicitly false, skip
    if (prefs && prefKey && prefs[prefKey] === false) return

    const { data: { session } } = await supabase.auth.getSession()
    const headers = {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_ANON_KEY,
    }
    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`
    }

    await fetch(`${SUPABASE_URL}/functions/v1/send-notification`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ to, subject, template, data }),
    })
  } catch {
    // Never block the caller
  }
}
