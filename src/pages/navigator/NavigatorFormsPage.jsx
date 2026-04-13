import { useState, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import Topbar from '../../components/layout/Topbar'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'

const FORMS = [
  { id: 'iss_reflection', label: 'ISS Reflection Form', icon: '📝', description: 'Restorative reflection for students during ISS — what happened, who was affected, re-entry goal.' },
  { id: 'cico', label: 'CICO Daily Tracking Sheet', icon: '✓', description: 'Check-In/Check-Out daily behavior tracking — morning check-in, period-by-period rating, afternoon check-out.' },
  { id: 'behavior_contract', label: 'Behavior Contract', icon: '📋', description: 'Student-staff agreement on specific behavior expectations, consequences, and rewards.' },
  { id: 'parent_agreement', label: 'Parent-Student Behavior Agreement (HB 6)', icon: '👥', description: 'HB 6 required — DAEP conference documentation with student/school commitments, incident summary, 30-day review disposition.' },
  { id: 'stay_away', label: 'Stay-Away / No-Contact Agreement', icon: '🚫', description: 'No-contact order between two students — terms, boundaries, consequences for violation, review date.' },
]

const SKILL_GAP_ACTIVITIES = {
  emotional_regulation: {
    title: 'Emotional Regulation',
    prompt: 'Think about a time this week when you felt overwhelmed or upset. What was happening? What did your body feel like?',
    activity: 'Draw or write about 3 strategies you can use when you feel emotions getting too big. Examples: deep breathing (4-7-8), counting to 10, asking for a break, squeezing a stress ball.',
    goal_prompt: 'When I feel [emotion], I will try [strategy] before reacting.',
  },
  impulse_control: {
    title: 'Impulse Control',
    prompt: 'Think about the moment right before the incident. What were you thinking? Was there a split second where you could have made a different choice?',
    activity: 'Complete the STOP technique: S = Stop what you\'re doing. T = Take a breath. O = Observe what\'s happening. P = Proceed with a better choice. Write about how you would apply STOP to your situation.',
    goal_prompt: 'Before I act, I will STOP and ask myself: "What will happen if I do this?"',
  },
  peer_conflict_resolution: {
    title: 'Peer Conflict Resolution',
    prompt: 'Describe the conflict from the OTHER person\'s perspective. What were they feeling? What did they want?',
    activity: 'Write out 3 ways this conflict could have been resolved without physical or verbal aggression. For each one, explain what you would say and do differently.',
    goal_prompt: 'When I have a disagreement with a peer, I will [specific strategy] instead of [previous behavior].',
  },
  executive_functioning: {
    title: 'Executive Functioning',
    prompt: 'Think about what led to this situation. Was it related to organization, following directions, managing time, or staying on task?',
    activity: 'Create a personal checklist for the class period where the incident occurred. Include: materials needed, steps to follow directions, what to do when stuck, how to ask for help appropriately.',
    goal_prompt: 'To stay on track in class, I will [specific strategy] every day this week.',
  },
  adult_communication: {
    title: 'Adult Communication',
    prompt: 'Think about how you spoke to the staff member. How would you feel if someone spoke to YOU that way?',
    activity: 'Rewrite the conversation using respectful communication. Include: "I" statements ("I feel frustrated when..."), asking for clarification ("Can you help me understand..."), and requesting a break ("I need a moment to calm down").',
    goal_prompt: 'When I disagree with a staff member, I will use "I" statements and a respectful tone.',
  },
  academic_frustration_tolerance: {
    title: 'Academic Frustration Tolerance',
    prompt: 'What subject or assignment was causing frustration? What specifically felt hard or unfair about it?',
    activity: 'Write about 3 things you CAN do when schoolwork feels too hard: 1) Ask the teacher for help. 2) Break the task into smaller steps. 3) Take a short brain break and come back. Practice: pick one assignment you\'re struggling with and break it into 3 small steps.',
    goal_prompt: 'When I feel frustrated with schoolwork, I will [strategy] instead of shutting down or acting out.',
  },
}

export default function NavigatorFormsPage() {
  const [activeForm, setActiveForm] = useState(null)
  const [searchParams] = useSearchParams()
  const studentParam = searchParams.get('student')

  return (
    <div>
      <Topbar
        title="Navigator — Forms & Resources"
        subtitle="Intervention forms, reflection sheets, and behavior contracts"
      />

      <div className="p-6 space-y-6">
        {!activeForm ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {FORMS.map(f => (
                <button
                  key={f.id}
                  onClick={() => setActiveForm(f.id)}
                  className="bg-white border border-gray-200 rounded-xl p-5 text-left hover:border-blue-300 hover:shadow-md transition-all"
                >
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">{f.icon}</span>
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900">{f.label}</h3>
                      <p className="text-xs text-gray-500 mt-1 leading-relaxed">{f.description}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {/* Intervention Resource Library */}
            <ResourceLibrary onOpenReflection={(key) => setActiveForm('iss_reflection_' + key)} />
          </>
        ) : activeForm === 'iss_reflection' || activeForm.startsWith('iss_reflection_') ? (
          <ISSReflectionForm
            skillGap={activeForm.replace('iss_reflection_', '').replace('iss_reflection', '')}
            studentId={studentParam}
            onBack={() => setActiveForm(null)}
          />
        ) : activeForm === 'cico' ? (
          <CICOTrackingSheet studentId={studentParam} onBack={() => setActiveForm(null)} />
        ) : activeForm === 'behavior_contract' ? (
          <BehaviorContractForm studentId={studentParam} onBack={() => setActiveForm(null)} />
        ) : activeForm === 'parent_agreement' ? (
          <ParentAgreementForm studentId={studentParam} onBack={() => setActiveForm(null)} />
        ) : activeForm === 'stay_away' ? (
          <StayAwayAgreementForm onBack={() => setActiveForm(null)} />
        ) : null}
      </div>
    </div>
  )
}

// ─── ISS Reflection Form ─────────────────────────────────────────────────────

function ISSReflectionForm({ skillGap, studentId, onBack }) {
  const printRef = useRef()
  const skill = SKILL_GAP_ACTIVITIES[skillGap] || null

  return (
    <div>
      <button onClick={onBack} className="text-sm text-blue-600 hover:text-blue-800 font-medium mb-4">← Back to Forms</button>
      <div className="flex justify-end mb-2">
        <button onClick={() => window.print()} className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">Print Form</button>
      </div>
      <div ref={printRef} className="bg-white border border-gray-200 rounded-xl p-8 max-w-3xl mx-auto print:border-none print:shadow-none print:p-4">
        <div className="text-center mb-6">
          <h1 className="text-lg font-bold text-gray-900">ISS Reflection Form</h1>
          <p className="text-xs text-gray-500 mt-1">Complete all sections thoughtfully. Your responses will be reviewed before you return to class.</p>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-6 text-sm">
          <div><span className="text-xs text-gray-500 block">Student Name</span><div className="border-b border-gray-300 mt-1 pb-1 min-h-[24px]"></div></div>
          <div><span className="text-xs text-gray-500 block">Date</span><div className="border-b border-gray-300 mt-1 pb-1 min-h-[24px]"></div></div>
          <div><span className="text-xs text-gray-500 block">Grade / Campus</span><div className="border-b border-gray-300 mt-1 pb-1 min-h-[24px]"></div></div>
        </div>

        <div className="space-y-5">
          <Section title="Part 1: What Happened" number="1">
            <p className="text-xs text-gray-600 mb-2">Describe the incident in your own words. Be honest and specific.</p>
            <Lines count={4} />
          </Section>

          <Section title="Part 2: Who Was Affected" number="2">
            <p className="text-xs text-gray-600 mb-2">Think about everyone involved — other students, teachers, your family. How did your actions affect them?</p>
            <Lines count={3} />
          </Section>

          <Section title="Part 3: What Were You Thinking / Feeling" number="3">
            <p className="text-xs text-gray-600 mb-2">What emotions were you experiencing? What thoughts were going through your head right before the incident?</p>
            <Lines count={3} />
          </Section>

          {skill && (
            <Section title={`Part 4: Skill Focus — ${skill.title}`} number="4" highlight>
              <p className="text-xs text-gray-700 mb-2 font-medium">{skill.prompt}</p>
              <Lines count={3} />
              <p className="text-xs text-gray-700 mt-3 mb-2 font-medium">Activity: {skill.activity}</p>
              <Lines count={4} />
            </Section>
          )}

          <Section title={skill ? 'Part 5: Re-Entry Goal' : 'Part 4: Re-Entry Goal'} number={skill ? '5' : '4'}>
            <p className="text-xs text-gray-600 mb-2">What will you do differently when you return to class? Write a specific, measurable goal.</p>
            {skill && <p className="text-xs text-gray-500 italic mb-2">Suggestion: {skill.goal_prompt}</p>}
            <Lines count={3} />
          </Section>

          <Section title={skill ? 'Part 6: Signatures' : 'Part 5: Signatures'} number={skill ? '6' : '5'}>
            <div className="grid grid-cols-2 gap-6 mt-2">
              <div>
                <div className="border-b border-gray-300 mt-8 mb-1"></div>
                <p className="text-xs text-gray-500">Student Signature / Date</p>
              </div>
              <div>
                <div className="border-b border-gray-300 mt-8 mb-1"></div>
                <p className="text-xs text-gray-500">Administrator Signature / Date</p>
              </div>
            </div>
          </Section>
        </div>

        <p className="text-[10px] text-gray-400 mt-6 text-center">Navigator by Clear Path Education Group · clearpathedgroup.com</p>
      </div>
    </div>
  )
}

// ─── CICO Daily Tracking Sheet ───────────────────────────────────────────────

function CICOTrackingSheet({ studentId, onBack }) {
  const periods = ['Period 1', 'Period 2', 'Period 3', 'Period 4', 'Lunch', 'Period 5', 'Period 6', 'Period 7']
  const goals = ['Respectful', 'Responsible', 'On Task']

  return (
    <div>
      <button onClick={onBack} className="text-sm text-blue-600 hover:text-blue-800 font-medium mb-4">← Back to Forms</button>
      <div className="flex justify-end mb-2">
        <button onClick={() => window.print()} className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">Print Form</button>
      </div>
      <div className="bg-white border border-gray-200 rounded-xl p-8 max-w-4xl mx-auto print:border-none print:shadow-none print:p-4">
        <div className="text-center mb-6">
          <h1 className="text-lg font-bold text-gray-900">CICO Daily Tracking Sheet</h1>
          <p className="text-xs text-gray-500 mt-1">Check-In / Check-Out — Rate each period: 2 = Met expectations, 1 = Partial, 0 = Did not meet</p>
        </div>

        <div className="grid grid-cols-4 gap-4 mb-6 text-sm">
          <div><span className="text-xs text-gray-500 block">Student Name</span><div className="border-b border-gray-300 mt-1 pb-1 min-h-[24px]"></div></div>
          <div><span className="text-xs text-gray-500 block">Week of</span><div className="border-b border-gray-300 mt-1 pb-1 min-h-[24px]"></div></div>
          <div><span className="text-xs text-gray-500 block">Grade</span><div className="border-b border-gray-300 mt-1 pb-1 min-h-[24px]"></div></div>
          <div><span className="text-xs text-gray-500 block">Mentor</span><div className="border-b border-gray-300 mt-1 pb-1 min-h-[24px]"></div></div>
        </div>

        <p className="text-xs font-semibold text-gray-700 mb-2">Daily Goal: _____ / {periods.length * goals.length * 2} points ({Math.round(periods.length * goals.length * 2 * 0.8)} needed for 80%)</p>

        {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map(day => (
          <div key={day} className="mb-4">
            <p className="text-xs font-bold text-gray-800 mb-1 bg-gray-50 px-2 py-1 rounded">{day}</p>
            <table className="w-full text-xs border border-gray-200">
              <thead>
                <tr className="bg-gray-50">
                  <th className="border border-gray-200 px-2 py-1 text-left w-20">Goal</th>
                  {periods.map(p => <th key={p} className="border border-gray-200 px-1 py-1 text-center" style={{fontSize: '10px'}}>{p}</th>)}
                  <th className="border border-gray-200 px-2 py-1 text-center w-12">Total</th>
                </tr>
              </thead>
              <tbody>
                {goals.map(g => (
                  <tr key={g}>
                    <td className="border border-gray-200 px-2 py-2 font-medium">{g}</td>
                    {periods.map(p => <td key={p} className="border border-gray-200 px-1 py-2 text-center"></td>)}
                    <td className="border border-gray-200 px-2 py-2 text-center font-semibold"></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex justify-between mt-1 text-[10px] text-gray-500">
              <span>Morning check-in: _____ (mood 1-5)</span>
              <span>Afternoon check-out: _____ (mood 1-5)</span>
              <span>Daily total: _____ / {periods.length * goals.length * 2}</span>
              <span>Met goal? Y / N</span>
            </div>
          </div>
        ))}

        <div className="mt-4 border-t border-gray-200 pt-3">
          <p className="text-xs font-semibold text-gray-700 mb-1">Weekly Summary</p>
          <div className="grid grid-cols-5 gap-2 text-xs text-center">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].map(d => (
              <div key={d}>
                <p className="text-gray-500">{d}</p>
                <div className="border border-gray-300 rounded h-6 mt-1"></div>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-6 mt-4">
            <div><div className="border-b border-gray-300 mt-6 mb-1"></div><p className="text-xs text-gray-500">Student Signature / Date</p></div>
            <div><div className="border-b border-gray-300 mt-6 mb-1"></div><p className="text-xs text-gray-500">Mentor Signature / Date</p></div>
          </div>
        </div>

        <p className="text-[10px] text-gray-400 mt-6 text-center">Navigator by Clear Path Education Group · clearpathedgroup.com</p>
      </div>
    </div>
  )
}

// ─── Behavior Contract ───────────────────────────────────────────────────────

function BehaviorContractForm({ studentId, onBack }) {
  return (
    <div>
      <button onClick={onBack} className="text-sm text-blue-600 hover:text-blue-800 font-medium mb-4">← Back to Forms</button>
      <div className="flex justify-end mb-2">
        <button onClick={() => window.print()} className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">Print Form</button>
      </div>
      <div className="bg-white border border-gray-200 rounded-xl p-8 max-w-3xl mx-auto print:border-none print:shadow-none print:p-4">
        <div className="text-center mb-6">
          <h1 className="text-lg font-bold text-gray-900">Student Behavior Contract</h1>
          <p className="text-xs text-gray-500 mt-1">This agreement outlines expectations, supports, and consequences for behavior improvement.</p>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-6 text-sm">
          <div><span className="text-xs text-gray-500 block">Student Name</span><div className="border-b border-gray-300 mt-1 pb-1 min-h-[24px]"></div></div>
          <div><span className="text-xs text-gray-500 block">Date</span><div className="border-b border-gray-300 mt-1 pb-1 min-h-[24px]"></div></div>
          <div><span className="text-xs text-gray-500 block">Grade / Campus</span><div className="border-b border-gray-300 mt-1 pb-1 min-h-[24px]"></div></div>
        </div>

        <div className="space-y-5">
          <Section title="Reason for This Contract" number="1">
            <p className="text-xs text-gray-600 mb-2">Describe the behavior(s) that led to this contract.</p>
            <Lines count={3} />
          </Section>

          <Section title="Behavior Expectations" number="2">
            <p className="text-xs text-gray-600 mb-2">I agree to the following specific behavior goals:</p>
            <div className="space-y-2">
              {[1, 2, 3].map(n => (
                <div key={n} className="flex items-start gap-2">
                  <span className="text-xs font-bold text-gray-500 mt-1">{n}.</span>
                  <div className="flex-1 border-b border-gray-300 pb-1 min-h-[24px]"></div>
                </div>
              ))}
            </div>
          </Section>

          <Section title="Supports Provided" number="3">
            <p className="text-xs text-gray-600 mb-2">The school will provide the following supports to help me succeed:</p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs mt-2">
              {['Check-In/Check-Out (CICO)', 'Counseling sessions', 'Mentoring', 'Modified schedule', 'Preferential seating', 'Break pass', 'Parent communication plan', 'Other: ___________'].map(s => (
                <label key={s} className="flex items-center gap-2 py-1">
                  <span className="w-3 h-3 border border-gray-400 rounded-sm inline-block shrink-0"></span>
                  <span className="text-gray-700">{s}</span>
                </label>
              ))}
            </div>
          </Section>

          <Section title="Positive Consequences" number="4">
            <p className="text-xs text-gray-600 mb-2">When I meet my behavior goals, I will earn:</p>
            <Lines count={2} />
          </Section>

          <Section title="If Goals Are Not Met" number="5">
            <p className="text-xs text-gray-600 mb-2">If I do not meet my behavior goals, the following will happen:</p>
            <Lines count={2} />
          </Section>

          <Section title="Review Date" number="6">
            <p className="text-xs text-gray-600 mb-2">This contract will be reviewed on: _________________ (date)</p>
            <p className="text-xs text-gray-600">At the review, we will decide whether to: continue / modify / end this contract.</p>
          </Section>

          <Section title="Signatures" number="7">
            <div className="grid grid-cols-2 gap-6 mt-2">
              <div><div className="border-b border-gray-300 mt-8 mb-1"></div><p className="text-xs text-gray-500">Student Signature / Date</p></div>
              <div><div className="border-b border-gray-300 mt-8 mb-1"></div><p className="text-xs text-gray-500">Administrator Signature / Date</p></div>
              <div><div className="border-b border-gray-300 mt-8 mb-1"></div><p className="text-xs text-gray-500">Parent/Guardian Signature / Date</p></div>
              <div><div className="border-b border-gray-300 mt-8 mb-1"></div><p className="text-xs text-gray-500">Counselor Signature / Date</p></div>
            </div>
          </Section>
        </div>

        <p className="text-[10px] text-gray-400 mt-6 text-center">Navigator by Clear Path Education Group · clearpathedgroup.com</p>
      </div>
    </div>
  )
}

// ─── Parent Behavior Agreement ───────────────────────────────────────────────

function ParentAgreementForm({ studentId, onBack }) {
  return (
    <div>
      <button onClick={onBack} className="text-sm text-blue-600 hover:text-blue-800 font-medium mb-4 print:hidden">← Back to Forms</button>
      <div className="flex justify-end mb-2 print:hidden">
        <button onClick={() => window.print()} className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">Print Form</button>
      </div>
      <div className="bg-white border border-gray-200 rounded-xl p-8 max-w-3xl mx-auto print:border-none print:shadow-none print:p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-1">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Parent-Student Behavior Agreement</h1>
            <p className="text-sm text-gray-600 font-medium">HB 6 Texas &bull; DAEP Conference Documentation</p>
            <p className="text-xs text-gray-500 mt-0.5">Under HB 6, parents may request a behavior agreement when their child is placed in DAEP — TEC §37.009</p>
          </div>
          <span className="px-3 py-1.5 bg-orange-600 text-white text-xs font-bold rounded shrink-0">HB 6 REQUIRED</span>
        </div>

        <div className="space-y-4 mt-4">
          {/* Section 1 — Student Information */}
          <FormSection title="SECTION 1 — Student Information">
            <div className="grid grid-cols-4 gap-3">
              <FieldLine label="Student Name" span={2} />
              <FieldLine label="Student ID" />
              <FieldLine label="Grade" />
            </div>
            <div className="grid grid-cols-3 gap-3 mt-2">
              <FieldLine label="Date of Conference" />
              <FieldLine label="Administrator" />
              <FieldLine label="Counselor" />
            </div>
          </FormSection>

          {/* Section 2 — Incident Summary */}
          <FormSection title="SECTION 2 — Incident Summary">
            <div className="grid grid-cols-3 gap-3">
              <FieldLine label="Date of Incident" />
              <FieldLine label="Offense / Behavior" span={2} />
            </div>
            <div className="grid grid-cols-3 gap-3 mt-2">
              <FieldLine label="TEC Reference" />
              <FieldLine label="Prior Incidents (count)" />
              <FieldLine label="Days Assigned" />
            </div>
            <div className="grid grid-cols-2 gap-3 mt-2">
              <FieldLine label="Behavior Code" />
              <FieldLine label="Discipline Code" />
            </div>
          </FormSection>

          {/* Section 3 — Student Commitments */}
          <FormSection title="SECTION 3 — Student Commitments (The student agrees to:)">
            {[1, 2, 3, 4, 5].map(n => (
              <div key={n} className="flex items-start gap-2 mt-2">
                <span className="text-xs font-bold text-gray-600 mt-1 w-4">{n}</span>
                <div className="flex-1 border-b border-gray-300 pb-1 min-h-[22px]"></div>
              </div>
            ))}
          </FormSection>

          {/* Section 4 — School Commitments */}
          <FormSection title="SECTION 4 — School Commitments (The school agrees to:)">
            {[1, 2, 3].map(n => (
              <div key={n} className="flex items-start gap-2 mt-2">
                <span className="text-xs font-bold text-gray-600 mt-1 w-4">{n}</span>
                <div className="flex-1 border-b border-gray-300 pb-1 min-h-[22px]"></div>
              </div>
            ))}
          </FormSection>

          {/* Section 5 — Consequences if Agreement is Violated */}
          <FormSection title="SECTION 5 — Consequences if Agreement is Violated">
            <p className="text-xs text-gray-500 italic mb-1">Describe consequences for non-compliance...</p>
            <Lines count={3} />
          </FormSection>

          {/* Section 6 — Signatures & Authorization */}
          <FormSection title="SECTION 6 — Signatures & Authorization">
            <div className="space-y-4 mt-2">
              {['Student Signature', 'Parent / Guardian Signature', 'Administrator Signature', 'Counselor Signature (if present)'].map(label => (
                <div key={label} className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-xs font-medium text-gray-700">{label}:</span>
                    <div className="border-b border-gray-300 mt-1 min-h-[22px]"></div>
                  </div>
                  <div>
                    <span className="text-xs font-medium text-gray-700">Date:</span>
                    <div className="border-b border-gray-300 mt-1 min-h-[22px]"></div>
                  </div>
                </div>
              ))}
            </div>
          </FormSection>

          {/* Section 7 — 30-Day Review */}
          <FormSection title="SECTION 7 — 30-Day Review">
            <div className="grid grid-cols-3 gap-3">
              <FieldLine label="30-Day Review Date" />
              <FieldLine label="Conducted By" />
              <FieldLine label="Review Outcome" />
            </div>
            <div className="flex items-center gap-6 mt-3">
              <span className="text-xs font-medium text-gray-700">Disposition:</span>
              {['Agreement Extended', 'Agreement Modified', 'Agreement Completed', 'DAEP Extended'].map(d => (
                <label key={d} className="flex items-center gap-1.5 text-xs text-gray-700">
                  <span className="w-3.5 h-3.5 border border-gray-400 rounded-sm inline-block shrink-0"></span>
                  {d}
                </label>
              ))}
            </div>
          </FormSection>
        </div>

        <div className="flex justify-between items-center mt-6 pt-3 border-t border-gray-200">
          <p className="text-[10px] text-gray-400">© Clear Path Education Group | TEC §37.009 | HB 6 | 2025-2026</p>
          <p className="text-[10px] text-gray-400">Full HB 6 Compliance Toolkit → clearpathedgroup.com/store</p>
        </div>
      </div>
    </div>
  )
}

// ─── Intervention Resource Library ────────────────────────────────────────────

const DELIVERY_LABELS = { '1on1': '1-on-1', 'small_group': 'Small Group', 'self_guided': 'Self-Guided', 'parent': 'Parent Resource', 'check_in': 'Check-In' }
const DELIVERY_COLORS = { '1on1': 'bg-blue-100 text-blue-700', 'small_group': 'bg-purple-100 text-purple-700', 'self_guided': 'bg-green-100 text-green-700', 'parent': 'bg-amber-100 text-amber-700', 'check_in': 'bg-teal-100 text-teal-700' }

const RESOURCE_LIBRARY = {
  emotional_regulation: {
    title: 'Emotional Regulation',
    color: 'border-blue-200 bg-blue-50',
    resources: [
      { id: 'er1', name: 'Feelings Thermometer', delivery: '1on1', time: '15 min', who: 'Counselor', description: 'Student identifies triggers at each temperature level (calm → frustrated → angry → explosive). Creates a personalized cool-down plan for each stage.', materials: 'Feelings thermometer worksheet (printable)' },
      { id: 'er2', name: 'Body Scan Activity', delivery: '1on1', time: '10 min', who: 'Counselor', description: 'Where do you feel anger or anxiety physically? Student maps body sensations to emotions and identifies early warning signs before escalation.', materials: 'Body outline worksheet' },
      { id: 'er3', name: 'Coping Strategy Menu', delivery: 'self_guided', time: '15 min', who: 'Student', description: 'Pick 3 strategies from a menu of 12 options. Try each one this week. Rate how well they worked (1-5). Report back at next check-in.', materials: 'Strategy menu card (printable)' },
      { id: 'er4', name: 'Cool-Down Plan Card', delivery: 'check_in', time: '10 min', who: 'AP / Counselor', description: 'Student creates a personalized 4-step cool-down plan they carry with them. Steps: recognize → remove → regulate → return. Laminate and keep in pocket.', materials: 'Plan card template' },
      { id: 'er5', name: 'Zones of Regulation Check-In', delivery: 'small_group', time: '20 min', who: 'Counselor', description: 'Group identifies which "zone" they are in (blue=sad, green=calm, yellow=anxious, red=angry). Practice strategies for moving back to green zone.', materials: 'Zones chart poster' },
      { id: 'er6', name: 'Parent: Evening Check-In Guide', delivery: 'parent', time: '5 min', who: 'Parent', description: '5 questions to ask your child each evening about their day. Focuses on emotions, not just behavior. Builds emotional vocabulary at home.', materials: 'Parent handout (printable)' },
    ]
  },
  impulse_control: {
    title: 'Impulse Control',
    color: 'border-red-200 bg-red-50',
    resources: [
      { id: 'ic1', name: 'STOP Technique Practice', delivery: '1on1', time: '15 min', who: 'Counselor / AP', description: 'S=Stop. T=Take a breath. O=Observe what\'s happening. P=Proceed with a better choice. Practice with 5 real scenarios from the student\'s life.', materials: 'STOP cards (printable)' },
      { id: 'ic2', name: 'Decision Tree Worksheet', delivery: 'self_guided', time: '15 min', who: 'Student', description: '"If I do X, then Y will happen." Student maps out consequences of impulsive choices vs. thoughtful choices for 3 real situations.', materials: 'Decision tree template' },
      { id: 'ic3', name: 'Red Light / Green Light Thinking', delivery: 'small_group', time: '20 min', who: 'Counselor', description: 'Group practice: read a scenario, hold up red (stop and think) or green (safe to act) card. Discuss why. Builds automatic pause-before-acting habit.', materials: 'Red/green cards, scenario cards' },
      { id: 'ic4', name: 'Weekly Impulse Journal', delivery: 'self_guided', time: '5 min/day', who: 'Student', description: 'Daily log: one moment I paused before reacting, one moment I didn\'t. What happened each time? Track pattern over 2 weeks.', materials: 'Journal template (printable)' },
      { id: 'ic5', name: 'Choices & Consequences Role-Play', delivery: '1on1', time: '20 min', who: 'Counselor', description: 'Counselor and student act out the moment of choice. Replay it 3 times with different decisions. Student experiences the consequence of each path.', materials: 'Scenario scripts' },
      { id: 'ic6', name: 'Parent: Reinforcing the Pause', delivery: 'parent', time: '5 min', who: 'Parent', description: 'How to praise "the pause" at home. When your child stops themselves before reacting, name it: "I saw you stop and think. That takes strength."', materials: 'Parent tip sheet' },
    ]
  },
  peer_conflict_resolution: {
    title: 'Peer Conflict Resolution',
    color: 'border-purple-200 bg-purple-50',
    resources: [
      { id: 'pc1', name: 'Perspective-Taking Worksheet', delivery: 'self_guided', time: '15 min', who: 'Student', description: 'Write the conflict from the other person\'s point of view. What were they feeling? What did they want? What did they see you do?', materials: 'Perspective worksheet' },
      { id: 'pc2', name: '"I" Statement Practice Cards', delivery: '1on1', time: '15 min', who: 'Counselor', description: '10 common conflict scenarios. Student rewrites each using "I feel... when... because..." instead of "You always..." or name-calling.', materials: 'Scenario cards (printable)' },
      { id: 'pc3', name: 'Conflict Resolution Role-Play Scripts', delivery: 'small_group', time: '25 min', who: 'Counselor', description: '5 scripted conflicts based on real school situations. Groups of 3 act out: two in conflict + one mediator. Rotate roles.', materials: 'Script booklet' },
      { id: 'pc4', name: 'Apology Letter Framework', delivery: 'self_guided', time: '15 min', who: 'Student', description: 'Structured apology: What happened → How it affected them → What I\'ll do differently → Why this matters to me. Not forced — student chooses whether to deliver.', materials: 'Letter template' },
      { id: 'pc5', name: 'Peer Mediation Agreement', delivery: '1on1', time: '20 min', who: 'Counselor / AP', description: 'Structured mediation between two students. Each shares their side, identifies common ground, agrees on 3 specific commitments going forward.', materials: 'Mediation agreement form' },
      { id: 'pc6', name: 'Parent: Conflict at Home Guide', delivery: 'parent', time: '5 min', who: 'Parent', description: 'How to coach conflict resolution at home with siblings or friends. Model "I" statements. Ask "What could you do differently?" instead of "What did they do?"', materials: 'Parent handout' },
    ]
  },
  executive_functioning: {
    title: 'Executive Functioning',
    color: 'border-amber-200 bg-amber-50',
    resources: [
      { id: 'ef1', name: 'Personal Class Checklist', delivery: 'check_in', time: '10 min', who: 'AP / Teacher', description: 'Student builds a checklist for each class period: materials needed, steps to follow directions, what to do when stuck, how to ask for help. Posted inside binder.', materials: 'Checklist template' },
      { id: 'ef2', name: 'Task Breakdown Practice', delivery: '1on1', time: '15 min', who: 'Counselor', description: 'Take one overwhelming assignment and break it into 3-5 small steps. Student estimates time for each step. Practice with 2 real assignments.', materials: 'Task breakdown worksheet' },
      { id: 'ef3', name: 'Phone/Device Management Plan', delivery: 'check_in', time: '10 min', who: 'AP', description: 'Student identifies when device use is a problem (which class, what time). Creates a specific plan: phone in backpack during X, allowed during Y. Signs agreement.', materials: 'Device plan card' },
      { id: 'ef4', name: 'Morning Routine Builder', delivery: 'self_guided', time: '10 min', who: 'Student', description: 'Map out a morning routine that gets you to school ready to learn. What time to wake up, what to prepare the night before, what to bring. Post it where you\'ll see it.', materials: 'Routine template' },
      { id: 'ef5', name: 'Transition Strategy Cards', delivery: 'small_group', time: '15 min', who: 'Counselor', description: 'Practice moving between activities without disruption. 3 strategies: pack up 2 min early, walk with a buddy, have a transition task (3 deep breaths). Group picks their strategies.', materials: 'Strategy cards' },
      { id: 'ef6', name: 'Parent: Organization Support', delivery: 'parent', time: '5 min', who: 'Parent', description: 'Help your child organize without doing it for them. Sunday night backpack check routine. "What do you need tomorrow?" question each evening.', materials: 'Parent checklist' },
    ]
  },
  adult_communication: {
    title: 'Adult Communication',
    color: 'border-teal-200 bg-teal-50',
    resources: [
      { id: 'ac1', name: 'Tone of Voice Practice', delivery: '1on1', time: '15 min', who: 'Counselor', description: 'Say the same sentence 3 different ways: aggressive, passive, assertive. Which gets the best result? Practice with 5 common school situations.', materials: 'Tone practice cards' },
      { id: 'ac2', name: 'Requesting Help Script Cards', delivery: 'self_guided', time: '10 min', who: 'Student', description: '5 templates for asking teachers for what you need: "Can you explain that again?", "I need a minute to calm down", "Can I talk to you after class?"', materials: 'Script cards (printable)' },
      { id: 'ac3', name: 'De-Escalation Self-Talk', delivery: '1on1', time: '15 min', who: 'Counselor', description: 'What to say to yourself when frustrated with staff: "This isn\'t worth losing my day over." "I can disagree respectfully." "Walk away, come back calm."', materials: 'Self-talk card (laminate)' },
      { id: 'ac4', name: 'Respectful Disagreement Practice', delivery: 'small_group', time: '20 min', who: 'Counselor', description: 'Role-play disagreeing with a teacher about a grade, a rule, or a consequence. Practice: "I see it differently because..." and "Can we talk about this?"', materials: 'Scenario cards' },
      { id: 'ac5', name: 'Conversation Repair Worksheet', delivery: 'self_guided', time: '15 min', who: 'Student', description: 'After a negative interaction with staff: What happened? What did I say? How could I have said it differently? Write a conversation repair script to use next time.', materials: 'Repair worksheet' },
      { id: 'ac6', name: 'Parent: Modeling Respectful Communication', delivery: 'parent', time: '5 min', who: 'Parent', description: 'How you talk to your child is how they learn to talk to adults. Model: "I\'m frustrated because..." instead of yelling. Praise respectful disagreement when you see it.', materials: 'Parent guide' },
    ]
  },
  academic_frustration_tolerance: {
    title: 'Academic Frustration Tolerance',
    color: 'border-green-200 bg-green-50',
    resources: [
      { id: 'af1', name: 'Frustration Scale & Action Plan', delivery: '1on1', time: '15 min', who: 'Counselor', description: 'Rate your frustration 1-10. At each level, what\'s one thing you can do? Level 3: ask for help. Level 5: take a brain break. Level 7: use your cool-down plan.', materials: 'Frustration scale worksheet' },
      { id: 'af2', name: 'Growth Mindset Challenge', delivery: 'small_group', time: '20 min', who: 'Counselor', description: 'Replace "I can\'t do this" with "I can\'t do this YET." Group shares something they once couldn\'t do but learned. Apply to current academic struggle.', materials: 'Growth mindset cards' },
      { id: 'af3', name: 'Brain Break Menu', delivery: 'self_guided', time: '5 min', who: 'Student', description: '8 quick brain breaks to use when work feels overwhelming: stretch, doodle for 60 seconds, count backwards from 20, drink water, 4-7-8 breathing, walk to sharpen pencil.', materials: 'Brain break menu card' },
      { id: 'af4', name: 'Help-Seeking Practice', delivery: 'check_in', time: '10 min', who: 'Teacher / AP', description: 'Practice asking for help before frustration builds: "I\'m stuck on step 2. Can you show me how to start?" Role-play with 3 real assignments.', materials: 'Help-seeking script cards' },
      { id: 'af5', name: 'Small Wins Tracker', delivery: 'self_guided', time: '5 min/day', who: 'Student', description: 'Each day, write one thing you accomplished academically — even something tiny. "I finished problem 1." "I asked for help." Build evidence that you CAN do hard things.', materials: 'Tracker card (weekly)' },
      { id: 'af6', name: 'Parent: Supporting Without Rescuing', delivery: 'parent', time: '5 min', who: 'Parent', description: 'When your child is frustrated with homework: don\'t do it for them. Ask: "What part is hard?" "What have you tried?" "Who could you ask tomorrow?" Build persistence.', materials: 'Parent tip sheet' },
    ]
  },
}

function ResourceLibrary({ onOpenReflection }) {
  const [selectedSkill, setSelectedSkill] = useState(null)
  const [deliveryFilter, setDeliveryFilter] = useState('')

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-sm font-semibold text-gray-900">Intervention Resource Library</h2>
          <span className="text-xs text-gray-400">{Object.values(RESOURCE_LIBRARY).reduce((s, g) => s + g.resources.length, 0)} resources</span>
        </div>
        <p className="text-xs text-gray-500 mb-4">Activities, worksheets, and discussion starters for counselors, APs, mentors, and parents. Click a skill area to see resources.</p>

        {/* Skill Gap Tabs */}
        <div className="flex flex-wrap gap-2 mb-4">
          {Object.entries(RESOURCE_LIBRARY).map(([key, group]) => (
            <button
              key={key}
              onClick={() => setSelectedSkill(selectedSkill === key ? null : key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                selectedSkill === key ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {group.title} ({group.resources.length})
            </button>
          ))}
        </div>

        {/* Delivery Filter */}
        {selectedSkill && (
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xs text-gray-500">Filter:</span>
            <button onClick={() => setDeliveryFilter('')} className={`px-2 py-1 rounded text-xs ${!deliveryFilter ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600'}`}>All</button>
            {Object.entries(DELIVERY_LABELS).map(([k, v]) => (
              <button key={k} onClick={() => setDeliveryFilter(k)} className={`px-2 py-1 rounded text-xs ${deliveryFilter === k ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600'}`}>{v}</button>
            ))}
          </div>
        )}

        {/* Resource Cards */}
        {selectedSkill && (
          <div className="space-y-3">
            {RESOURCE_LIBRARY[selectedSkill].resources
              .filter(r => !deliveryFilter || r.delivery === deliveryFilter)
              .map(r => (
                <div key={r.id} className={`border rounded-lg p-4 ${RESOURCE_LIBRARY[selectedSkill].color}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="text-sm font-semibold text-gray-900">{r.name}</h4>
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${DELIVERY_COLORS[r.delivery]}`}>{DELIVERY_LABELS[r.delivery]}</span>
                      </div>
                      <p className="text-xs text-gray-700 leading-relaxed">{r.description}</p>
                      <div className="flex items-center gap-4 mt-2 text-[10px] text-gray-500">
                        <span>Delivered by: {r.who}</span>
                        <span>Time: {r.time}</span>
                        <span>Materials: {r.materials}</span>
                      </div>
                    </div>
                    <button onClick={() => window.print()} className="text-xs text-gray-400 hover:text-gray-600 shrink-0 ml-3">Print</button>
                  </div>
                </div>
              ))}
            {RESOURCE_LIBRARY[selectedSkill].resources.filter(r => !deliveryFilter || r.delivery === deliveryFilter).length === 0 && (
              <p className="text-xs text-gray-400 text-center py-4">No resources match this filter.</p>
            )}
            <button onClick={() => onOpenReflection(selectedSkill)} className="w-full py-2 text-xs text-blue-600 font-medium hover:text-blue-800 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors">
              Open ISS Reflection Form for {RESOURCE_LIBRARY[selectedSkill].title} →
            </button>
          </div>
        )}

        {/* No skill selected */}
        {!selectedSkill && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {Object.entries(RESOURCE_LIBRARY).map(([key, group]) => (
              <button key={key} onClick={() => setSelectedSkill(key)} className={`border rounded-lg p-3 text-left hover:shadow-md transition-all ${group.color}`}>
                <h4 className="text-xs font-semibold text-gray-800 mb-1">{group.title}</h4>
                <p className="text-[10px] text-gray-500">{group.resources.length} resources — {group.resources.filter(r => r.delivery === '1on1').length} counselor, {group.resources.filter(r => r.delivery === 'self_guided').length} self-guided, {group.resources.filter(r => r.delivery === 'parent').length} parent</p>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Discussion Starters */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-sm font-semibold text-gray-900 mb-1">Discussion Starters</h2>
        <p className="text-xs text-gray-500 mb-3">Use during mentoring, counseling sessions, or re-entry check-ins. Pick 2-3 per session.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {[
            'What would your best day at school look like?',
            'Who at this school do you trust? What makes you trust them?',
            'What\'s one thing teachers do that helps you? One thing that makes it harder?',
            'If you could change one thing about how you handled the incident, what would it be?',
            'What does respect look like to you? Do you feel respected here?',
            'What\'s going on outside of school that affects how you show up here?',
            'When you\'re having a bad day, what\'s the first sign? What could someone do to help?',
            'What are you proud of this week — even something small?',
            'What\'s one goal you have for yourself this semester? What\'s getting in the way?',
            'If I called your parent right now, what would they say about how things are going?',
          ].map((q, i) => (
            <div key={i} className="flex items-start gap-2 p-2 bg-gray-50 rounded-lg">
              <span className="text-xs font-bold text-gray-400 mt-0.5 w-4 shrink-0">{i + 1}.</span>
              <p className="text-xs text-gray-700 leading-relaxed">{q}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Stay-Away / No-Contact Agreement ────────────────────────────────────────

function StayAwayAgreementForm({ onBack }) {
  return (
    <div>
      <button onClick={onBack} className="text-sm text-blue-600 hover:text-blue-800 font-medium mb-4 print:hidden">← Back to Forms</button>
      <div className="flex justify-end mb-2 print:hidden">
        <button onClick={() => window.print()} className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">Print Form</button>
      </div>
      <div className="bg-white border border-gray-200 rounded-xl p-8 max-w-3xl mx-auto print:border-none print:shadow-none print:p-4">
        <div className="text-center mb-6">
          <h1 className="text-xl font-bold text-gray-900">Stay-Away / No-Contact Agreement</h1>
          <p className="text-sm text-gray-600">Campus Safety &bull; Student Separation Order</p>
          <p className="text-xs text-gray-500 mt-1">This agreement prohibits contact between the named students to ensure campus safety and prevent further incidents.</p>
        </div>

        <div className="space-y-4">
          <FormSection title="SECTION 1 — Student Information">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <p className="text-xs font-bold text-gray-700 uppercase">Student A</p>
                <FieldLine label="Name" />
                <FieldLine label="Student ID" />
                <FieldLine label="Grade / Campus" />
              </div>
              <div className="space-y-2">
                <p className="text-xs font-bold text-gray-700 uppercase">Student B</p>
                <FieldLine label="Name" />
                <FieldLine label="Student ID" />
                <FieldLine label="Grade / Campus" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-3">
              <FieldLine label="Date of Agreement" />
              <FieldLine label="Issuing Administrator" />
            </div>
          </FormSection>

          <FormSection title="SECTION 2 — Incident Leading to This Agreement">
            <div className="grid grid-cols-2 gap-3">
              <FieldLine label="Date of Incident" />
              <FieldLine label="Location" />
            </div>
            <div className="mt-2">
              <span className="text-xs font-medium text-gray-600">Description of Incident:</span>
              <Lines count={3} />
            </div>
          </FormSection>

          <FormSection title="SECTION 3 — Terms of the No-Contact Agreement">
            <p className="text-xs text-gray-600 mb-2">Both students named above agree to the following terms:</p>
            <div className="space-y-1.5 text-xs text-gray-700">
              {[
                'No verbal communication (including through other students)',
                'No physical contact of any kind',
                'No electronic communication (text, social media, messaging apps)',
                'No gestures, staring, or intimidating behavior',
                'Maintain a reasonable distance at all times on campus',
                'Report immediately to an adult if the other student initiates contact',
                'Follow any modified schedule, seating, or routing assigned by administration',
              ].map((term, i) => (
                <label key={i} className="flex items-start gap-2">
                  <span className="w-3.5 h-3.5 border border-gray-400 rounded-sm inline-block shrink-0 mt-0.5"></span>
                  <span>{term}</span>
                </label>
              ))}
            </div>
          </FormSection>

          <FormSection title="SECTION 4 — Schedule / Routing Modifications">
            <p className="text-xs text-gray-600 mb-2">The following modifications are in effect to minimize contact:</p>
            <div className="space-y-1.5 text-xs text-gray-700">
              {[
                'Lunch period: ___________________________________________',
                'Class transitions: ______________________________________',
                'Arrival / dismissal: ____________________________________',
                'Shared classes (if any): _________________________________',
                'Other: __________________________________________________',
              ].map((mod, i) => (
                <p key={i} className="py-0.5">{mod}</p>
              ))}
            </div>
          </FormSection>

          <FormSection title="SECTION 5 — Consequences for Violation">
            <p className="text-xs text-gray-600 mb-2">If either student violates the terms of this agreement, the following consequences may apply:</p>
            <div className="space-y-1.5 text-xs text-gray-700">
              {[
                'First violation: conference with administrator + parent notification',
                'Second violation: ISS placement + parent conference',
                'Third violation: OSS placement + possible DAEP referral',
                'Any violation involving threats or physical contact: immediate disciplinary action per Student Code of Conduct',
              ].map((c, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="font-bold text-gray-500 w-4 shrink-0">{i + 1}.</span>
                  <span>{c}</span>
                </div>
              ))}
            </div>
          </FormSection>

          <FormSection title="SECTION 6 — Acknowledgment & Signatures">
            <p className="text-xs text-gray-600 mb-3">By signing below, all parties acknowledge they understand the terms of this agreement and the consequences for violation.</p>
            <div className="space-y-4">
              <p className="text-xs font-bold text-gray-700 uppercase">Student A</p>
              <div className="grid grid-cols-2 gap-4">
                <div><div className="border-b border-gray-300 mt-4 mb-1"></div><p className="text-xs text-gray-500">Student A Signature / Date</p></div>
                <div><div className="border-b border-gray-300 mt-4 mb-1"></div><p className="text-xs text-gray-500">Parent/Guardian of Student A / Date</p></div>
              </div>
              <p className="text-xs font-bold text-gray-700 uppercase mt-3">Student B</p>
              <div className="grid grid-cols-2 gap-4">
                <div><div className="border-b border-gray-300 mt-4 mb-1"></div><p className="text-xs text-gray-500">Student B Signature / Date</p></div>
                <div><div className="border-b border-gray-300 mt-4 mb-1"></div><p className="text-xs text-gray-500">Parent/Guardian of Student B / Date</p></div>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-3">
                <div><div className="border-b border-gray-300 mt-4 mb-1"></div><p className="text-xs text-gray-500">Administrator Signature / Date</p></div>
                <div><div className="border-b border-gray-300 mt-4 mb-1"></div><p className="text-xs text-gray-500">Counselor Signature (if present) / Date</p></div>
              </div>
            </div>
          </FormSection>

          <FormSection title="SECTION 7 — Review">
            <div className="grid grid-cols-3 gap-3">
              <FieldLine label="Review Date" />
              <FieldLine label="Reviewed By" />
              <FieldLine label="Outcome" />
            </div>
            <div className="flex items-center gap-6 mt-3">
              <span className="text-xs font-medium text-gray-700">Disposition:</span>
              {['Agreement Continues', 'Agreement Modified', 'Agreement Lifted', 'Escalated'].map(d => (
                <label key={d} className="flex items-center gap-1.5 text-xs text-gray-700">
                  <span className="w-3.5 h-3.5 border border-gray-400 rounded-sm inline-block shrink-0"></span>
                  {d}
                </label>
              ))}
            </div>
          </FormSection>
        </div>

        <div className="flex justify-between items-center mt-6 pt-3 border-t border-gray-200">
          <p className="text-[10px] text-gray-400">© Clear Path Education Group | 2025-2026</p>
          <p className="text-[10px] text-gray-400">Navigator by Clear Path Education Group · clearpathedgroup.com</p>
        </div>
      </div>
    </div>
  )
}

function FormSection({ title, children }) {
  return (
    <div>
      <div className="bg-gray-800 text-white px-3 py-1.5 rounded-t text-xs font-bold tracking-wide">{title}</div>
      <div className="border border-gray-200 border-t-0 rounded-b p-3">{children}</div>
    </div>
  )
}

function FieldLine({ label, span }) {
  return (
    <div className={span === 2 ? 'col-span-2' : ''}>
      <span className="text-xs font-medium text-gray-600">{label}:</span>
      <div className="border-b border-gray-300 mt-1 pb-1 min-h-[22px]"></div>
    </div>
  )
}

// ─── Shared Components ───────────────────────────────────────────────────────

function Section({ title, number, highlight, children }) {
  return (
    <div className={`${highlight ? 'bg-blue-50 border border-blue-200 rounded-lg p-4' : ''}`}>
      <h3 className={`text-sm font-bold mb-2 ${highlight ? 'text-blue-800' : 'text-gray-800'}`}>
        {number && <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-gray-200 text-gray-700 text-xs font-bold mr-2">{number}</span>}
        {title}
      </h3>
      {children}
    </div>
  )
}

function Lines({ count }) {
  return (
    <div className="space-y-3">
      {[...Array(count)].map((_, i) => (
        <div key={i} className="border-b border-gray-300 min-h-[20px]"></div>
      ))}
    </div>
  )
}
