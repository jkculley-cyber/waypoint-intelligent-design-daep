// Supabase Edge Function: check-review-reminders
// Runs daily (via pg_cron) to send review-due reminders for DAEP transition plans.
// Notifies admin + counselor when a 30/60/90-day review is due today or overdue.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SERVICE_ROLE_KEY')!

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)
  const today = new Date().toISOString().split('T')[0]

  try {
    // Fetch active transition plans
    const { data: plans, error: plansError } = await adminClient
      .from('transition_plans')
      .select(`
        id, district_id, student_id,
        review_30_date, review_60_date, review_90_date,
        student:students(first_name, last_name)
      `)
      .eq('status', 'active')
      .or(`review_30_date.lte.${today},review_60_date.lte.${today},review_90_date.lte.${today}`)

    if (plansError) throw plansError

    if (!plans?.length) {
      return new Response(JSON.stringify({ success: true, checked: 0, sent: 0 }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Fetch completed reviews for these plans
    const planIds = plans.map(p => p.id)
    const { data: completedReviews } = await adminClient
      .from('transition_plan_reviews')
      .select('plan_id, review_type')
      .in('plan_id', planIds)

    const completedMap: Record<string, Set<string>> = {}
    for (const r of completedReviews || []) {
      if (!completedMap[r.plan_id]) completedMap[r.plan_id] = new Set()
      completedMap[r.plan_id].add(r.review_type)
    }

    // Build due review list
    const reviewsDue: { planId: string; districtId: string; reviewType: string; dueDate: string; studentName: string }[] = []

    for (const plan of plans) {
      const completed = completedMap[plan.id] || new Set()
      const studentName = plan.student ? `${plan.student.first_name} ${plan.student.last_name}` : 'Student'

      const checks = [
        { type: '30_day', date: plan.review_30_date },
        { type: '60_day', date: plan.review_60_date },
        { type: '90_day', date: plan.review_90_date },
      ]

      for (const { type, date } of checks) {
        if (date && date <= today && !completed.has(type)) {
          reviewsDue.push({
            planId: plan.id,
            districtId: plan.district_id,
            reviewType: type.replace('_', '-'),
            dueDate: date,
            studentName,
          })
        }
      }
    }

    if (!reviewsDue.length) {
      return new Response(JSON.stringify({ success: true, checked: plans.length, sent: 0 }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Group by district to batch profile lookups
    const districtIds = [...new Set(reviewsDue.map(r => r.districtId))]
    const { data: allStaff } = await adminClient
      .from('profiles')
      .select('email, district_id')
      .in('district_id', districtIds)
      .in('role', ['admin', 'counselor', 'principal'])

    const staffByDistrict: Record<string, string[]> = {}
    for (const s of allStaff || []) {
      if (!staffByDistrict[s.district_id]) staffByDistrict[s.district_id] = []
      if (s.email) staffByDistrict[s.district_id].push(s.email)
    }

    // Send notifications
    let sent = 0
    const planUrl = (planId: string) => `${SUPABASE_URL.replace('kvxecksvkimcgwhxxyhw.supabase.co', 'waypoint.clearpathedgroup.com')}/plans/${planId}`

    for (const review of reviewsDue) {
      const recipients = staffByDistrict[review.districtId] || []
      for (const email of recipients) {
        const res = await fetch(`${SUPABASE_URL}/functions/v1/send-notification`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
          },
          body: JSON.stringify({
            to: email,
            subject: `Review Due — ${review.studentName} (${review.reviewType})`,
            template: 'review_due',
            data: {
              studentName: review.studentName,
              reviewType: review.reviewType,
              dueDate: review.dueDate,
              planUrl: planUrl(review.planId),
            },
          }),
        })
        if (res.ok) sent++
      }
    }

    return new Response(
      JSON.stringify({ success: true, checked: plans.length, reviews_due: reviewsDue.length, sent }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('check-review-reminders error:', err)
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
