// Supabase Edge Function: send-notification
// Sends transactional emails via Resend API.
// Deploy with: supabase functions deploy send-notification
// Set secret: supabase secrets set RESEND_API_KEY=re_xxxxx

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const FROM_EMAIL = Deno.env.get('FROM_EMAIL') || 'Waypoint <noreply@clearpathedgroup.com>'

interface NotificationRequest {
  to: string
  subject: string
  template: string
  data: Record<string, unknown>
}

const TEMPLATES: Record<string, (data: Record<string, unknown>) => string> = {
  incident_submitted: (d) => `
    <h2>New Incident Submitted</h2>
    <p>An incident has been submitted for <strong>${d.studentName}</strong>.</p>
    <p><strong>Date:</strong> ${d.incidentDate}</p>
    <p><strong>Offense:</strong> ${d.offense || 'Not specified'}</p>
    <p>Please log in to Waypoint to review and take action.</p>
    <p><a href="${d.incidentUrl}" style="background:#f97316;color:white;padding:10px 20px;border-radius:6px;text-decoration:none;display:inline-block;margin-top:12px;">Review Incident</a></p>
  `,
  incident_approved: (d) => `
    <h2>Incident Approved</h2>
    <p>Your submitted incident for <strong>${d.studentName}</strong> has been <strong>approved</strong> by ${d.approvedBy}.</p>
    <p><a href="${d.incidentUrl}" style="background:#22c55e;color:white;padding:10px 20px;border-radius:6px;text-decoration:none;display:inline-block;margin-top:12px;">View Incident</a></p>
  `,
  incident_denied: (d) => `
    <h2>Incident Denied</h2>
    <p>Your submitted incident for <strong>${d.studentName}</strong> has been <strong>denied</strong> by ${d.deniedBy}.</p>
    ${d.reason ? `<p><strong>Reason:</strong> ${d.reason}</p>` : ''}
    <p><a href="${d.incidentUrl}" style="background:#ef4444;color:white;padding:10px 20px;border-radius:6px;text-decoration:none;display:inline-block;margin-top:12px;">View Incident</a></p>
  `,
  placement_starting: (d) => `
    <h2>DAEP Placement Starting</h2>
    <p>The DAEP placement for <strong>${d.studentName}</strong> begins today.</p>
    <p><strong>Duration:</strong> ${d.days} days</p>
    <p><strong>End Date:</strong> ${d.endDate}</p>
    <p><a href="${d.incidentUrl}" style="background:#f97316;color:white;padding:10px 20px;border-radius:6px;text-decoration:none;display:inline-block;margin-top:12px;">View Details</a></p>
  `,
  review_due: (d) => `
    <h2>Review Due</h2>
    <p>A <strong>${d.reviewType}</strong> review is due for <strong>${d.studentName}</strong>.</p>
    <p><strong>Due Date:</strong> ${d.dueDate}</p>
    <p><a href="${d.planUrl}" style="background:#8b5cf6;color:white;padding:10px 20px;border-radius:6px;text-decoration:none;display:inline-block;margin-top:12px;">View Plan</a></p>
  `,
  parent_notice: (d) => `
    <h2>Notice Regarding Your Child</h2>
    <p>A discipline record has been added for <strong>${d.studentName}</strong>.</p>
    <p>Please log in to the Waypoint Parent Portal to review the details and acknowledge receipt.</p>
    <p><a href="${d.portalUrl}" style="background:#f97316;color:white;padding:10px 20px;border-radius:6px;text-decoration:none;display:inline-block;margin-top:12px;">View in Parent Portal</a></p>
  `,

  welcome_demo_request: (_d) => `
    <h2 style="color:#1f2937;margin-top:0;">You're on our list — here's what's next</h2>
    <p>Thank you for reaching out. We've received your request and will be in touch shortly to schedule a focused, 30-minute walkthrough tailored to your district's biggest compliance challenges.</p>
    <p>While you wait, feel free to explore Waypoint yourself using the sandbox credentials below.</p>

    <div style="background:#fffbeb;border:1px solid #fcd34d;border-radius:8px;padding:20px 24px;margin:24px 0;">
      <p style="font-size:0.75rem;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#92400e;margin:0 0 12px;">Sandbox Access — Explorer ISD</p>
      <table style="border-collapse:collapse;width:100%;">
        <tr>
          <td style="padding:6px 0;font-size:0.85rem;color:#78350f;font-weight:600;width:100px;">URL</td>
          <td style="padding:6px 0;font-size:0.85rem;"><a href="https://waypoint.clearpathedgroup.com" style="color:#d97706;">waypoint.clearpathedgroup.com</a></td>
        </tr>
        <tr>
          <td style="padding:6px 0;font-size:0.85rem;color:#78350f;font-weight:600;">Email</td>
          <td style="padding:6px 0;font-size:0.85rem;font-family:monospace;">explore@clearpathedgroup.com</td>
        </tr>
        <tr>
          <td style="padding:6px 0;font-size:0.85rem;color:#78350f;font-weight:600;">Password</td>
          <td style="padding:6px 0;font-size:0.85rem;font-family:monospace;">Explore2026!</td>
        </tr>
      </table>
      <p style="font-size:0.75rem;color:#92400e;margin:12px 0 0;">The sandbox is pre-loaded with realistic student and incident data. Explore freely — nothing you do here affects real data.</p>
    </div>

    <p>We look forward to connecting with you.</p>
    <p style="margin:0;"><strong>The Waypoint Team</strong><br/><span style="color:#9ca3af;font-size:0.85rem;">Clear Path Education Group, LLC</span></p>
  `,

  welcome_pilot_application: (_d) => `
    <h2 style="color:#1f2937;margin-top:0;">We received your Waypoint Founding District application</h2>
    <p>Thank you for applying to be a Waypoint Founding District. This means a lot to us — we're building Waypoint alongside districts like yours, and your feedback will directly shape the product.</p>
    <p>Our team reviews every application personally. We'll be in touch within a few business days to discuss next steps.</p>

    <div style="background:#fffbeb;border:1px solid #fcd34d;border-radius:8px;padding:20px 24px;margin:24px 0;">
      <p style="font-size:0.75rem;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#92400e;margin:0 0 12px;">Explore Now — Sandbox Credentials</p>
      <table style="border-collapse:collapse;width:100%;">
        <tr>
          <td style="padding:6px 0;font-size:0.85rem;color:#78350f;font-weight:600;width:100px;">URL</td>
          <td style="padding:6px 0;font-size:0.85rem;"><a href="https://waypoint.clearpathedgroup.com" style="color:#d97706;">waypoint.clearpathedgroup.com</a></td>
        </tr>
        <tr>
          <td style="padding:6px 0;font-size:0.85rem;color:#78350f;font-weight:600;">Email</td>
          <td style="padding:6px 0;font-size:0.85rem;font-family:monospace;">explore@clearpathedgroup.com</td>
        </tr>
        <tr>
          <td style="padding:6px 0;font-size:0.85rem;color:#78350f;font-weight:600;">Password</td>
          <td style="padding:6px 0;font-size:0.85rem;font-family:monospace;">Explore2026!</td>
        </tr>
      </table>
      <p style="font-size:0.75rem;color:#92400e;margin:12px 0 0;">Explorer ISD is a pre-loaded sandbox district. Feel free to explore all features — incidents, compliance workflows, SPED timelines, and more.</p>
    </div>

    <p><strong>What happens next:</strong></p>
    <ol style="color:#374151;line-height:1.8;">
      <li>We review your application (2–3 business days)</li>
      <li>We schedule a 30-minute discovery call</li>
      <li>We align on a pilot timeline and scope</li>
    </ol>
    <p>Founding Districts receive preferred pricing and direct access to our product team throughout the pilot.</p>
    <p style="margin:0;"><strong>The Waypoint Team</strong><br/><span style="color:#9ca3af;font-size:0.85rem;">Clear Path Education Group, LLC</span></p>
  `,
}

function wrapHtml(body: string, subject: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><title>${subject}</title></head>
<body style="font-family:system-ui,sans-serif;max-width:600px;margin:40px auto;padding:0 20px;color:#1f2937;">
  <div style="background:#f97316;padding:16px 20px;border-radius:8px 8px 0 0;">
    <h1 style="color:white;margin:0;font-size:18px;">Waypoint</h1>
  </div>
  <div style="background:white;border:1px solid #e5e7eb;border-top:none;padding:24px;border-radius:0 0 8px 8px;">
    ${body}
    <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;">
    <p style="color:#9ca3af;font-size:12px;margin:0;">
      This email was sent by Waypoint (Clear Path Education Group, LLC).<br>
      Student records are protected under FERPA.
    </p>
  </div>
</body>
</html>`
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' },
    })
  }

  if (!RESEND_API_KEY) {
    return new Response(JSON.stringify({ error: 'RESEND_API_KEY not configured' }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    const { to, subject, template, data } = await req.json() as NotificationRequest

    if (!to || !subject || !template) {
      return new Response(JSON.stringify({ error: 'Missing required fields: to, subject, template' }), {
        status: 400, headers: { 'Content-Type': 'application/json' },
      })
    }

    const templateFn = TEMPLATES[template]
    if (!templateFn) {
      return new Response(JSON.stringify({ error: `Unknown template: ${template}` }), {
        status: 400, headers: { 'Content-Type': 'application/json' },
      })
    }

    const htmlBody = wrapHtml(templateFn(data), subject)

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [to],
        subject,
        html: htmlBody,
      }),
    })

    const result = await res.json()
    if (!res.ok) {
      return new Response(JSON.stringify({ error: result.message || 'Resend API error' }), {
        status: res.status, headers: { 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ success: true, id: result.id }), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    })
  }
})
