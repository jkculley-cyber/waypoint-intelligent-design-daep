import { useState, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import Topbar from '../../components/layout/Topbar'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'

const FORMS = [
  { id: 'iss_reflection', label: 'ISS Reflection Form', icon: '📝', description: 'Restorative reflection for students during ISS — what happened, who was affected, re-entry goal.' },
  { id: 'cico', label: 'CICO Daily Tracking Sheet', icon: '✓', description: 'Check-In/Check-Out daily behavior tracking — morning check-in, period-by-period rating, afternoon check-out.' },
  { id: 'behavior_contract', label: 'Behavior Contract', icon: '📋', description: 'Student-staff agreement on specific behavior expectations, consequences, and rewards.' },
  { id: 'parent_agreement', label: 'Parent Behavior Agreement', icon: '👥', description: 'Home-school partnership agreement — shared expectations, communication plan, parent commitments.' },
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

            {/* Skill Gap Resource Bank */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-sm font-semibold text-gray-900 mb-1">Skill Gap Resource Bank</h2>
              <p className="text-xs text-gray-500 mb-4">Activities and prompts organized by behavioral skill deficit. Use during ISS, counseling sessions, or as homework assignments.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {Object.entries(SKILL_GAP_ACTIVITIES).map(([key, skill]) => (
                  <div key={key} className="border border-gray-100 rounded-lg p-3 hover:border-blue-200 transition-colors">
                    <h4 className="text-xs font-semibold text-gray-800 mb-1">{skill.title}</h4>
                    <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">{skill.activity}</p>
                    <button
                      onClick={() => setActiveForm('iss_reflection_' + key)}
                      className="mt-2 text-xs text-blue-600 font-medium hover:text-blue-800"
                    >
                      Open reflection form →
                    </button>
                  </div>
                ))}
              </div>
            </div>
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
      <button onClick={onBack} className="text-sm text-blue-600 hover:text-blue-800 font-medium mb-4">← Back to Forms</button>
      <div className="flex justify-end mb-2">
        <button onClick={() => window.print()} className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">Print Form</button>
      </div>
      <div className="bg-white border border-gray-200 rounded-xl p-8 max-w-3xl mx-auto print:border-none print:shadow-none print:p-4">
        <div className="text-center mb-6">
          <h1 className="text-lg font-bold text-gray-900">Parent-School Behavior Partnership Agreement</h1>
          <p className="text-xs text-gray-500 mt-1">A collaborative commitment between home and school to support student behavior improvement.</p>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
          <div><span className="text-xs text-gray-500 block">Student Name</span><div className="border-b border-gray-300 mt-1 pb-1 min-h-[24px]"></div></div>
          <div><span className="text-xs text-gray-500 block">Date</span><div className="border-b border-gray-300 mt-1 pb-1 min-h-[24px]"></div></div>
          <div><span className="text-xs text-gray-500 block">Parent/Guardian Name</span><div className="border-b border-gray-300 mt-1 pb-1 min-h-[24px]"></div></div>
          <div><span className="text-xs text-gray-500 block">School Contact / Phone</span><div className="border-b border-gray-300 mt-1 pb-1 min-h-[24px]"></div></div>
        </div>

        <div className="space-y-5">
          <Section title="Current Behavior Concern" number="1">
            <p className="text-xs text-gray-600 mb-2">Describe the behavior pattern that has been observed at school.</p>
            <Lines count={3} />
          </Section>

          <Section title="School Commitments" number="2">
            <p className="text-xs text-gray-600 mb-2">The school agrees to:</p>
            <div className="space-y-1 text-xs text-gray-700 mt-2">
              {[
                'Communicate with parent/guardian at least weekly about behavior progress',
                'Provide proactive interventions and supports (specified below)',
                'Notify parent/guardian within 24 hours of any disciplinary action',
                'Schedule follow-up conference within _____ weeks',
                'Other: ___________________________________________',
              ].map((item, i) => (
                <label key={i} className="flex items-start gap-2 py-0.5">
                  <span className="w-3 h-3 border border-gray-400 rounded-sm inline-block shrink-0 mt-0.5"></span>
                  <span>{item}</span>
                </label>
              ))}
            </div>
          </Section>

          <Section title="Parent/Guardian Commitments" number="3">
            <p className="text-xs text-gray-600 mb-2">I agree to:</p>
            <div className="space-y-1 text-xs text-gray-700 mt-2">
              {[
                'Review daily behavior report (CICO sheet) each evening',
                'Sign and return behavior tracking forms daily',
                'Reinforce positive behavior at home with praise and encouragement',
                'Maintain open communication with school staff',
                'Attend scheduled conferences and respond to school communications within 48 hours',
                'Support consequences for behavior that does not meet expectations',
                'Other: ___________________________________________',
              ].map((item, i) => (
                <label key={i} className="flex items-start gap-2 py-0.5">
                  <span className="w-3 h-3 border border-gray-400 rounded-sm inline-block shrink-0 mt-0.5"></span>
                  <span>{item}</span>
                </label>
              ))}
            </div>
          </Section>

          <Section title="Student Commitments" number="4">
            <p className="text-xs text-gray-600 mb-2">I agree to:</p>
            <div className="space-y-1 text-xs text-gray-700 mt-2">
              {[
                'Follow my behavior contract goals every day',
                'Check in with my mentor each morning and afternoon',
                'Use the strategies I learned when I feel upset or frustrated',
                'Ask for help when I need it instead of acting out',
                'Show my CICO sheet to my parent/guardian every day',
              ].map((item, i) => (
                <label key={i} className="flex items-start gap-2 py-0.5">
                  <span className="w-3 h-3 border border-gray-400 rounded-sm inline-block shrink-0 mt-0.5"></span>
                  <span>{item}</span>
                </label>
              ))}
            </div>
          </Section>

          <Section title="Communication Plan" number="5">
            <p className="text-xs text-gray-600 mb-2">How we will stay in contact:</p>
            <div className="grid grid-cols-2 gap-4 text-xs mt-2">
              <div><span className="text-gray-500">Preferred contact method:</span><div className="border-b border-gray-300 mt-1 pb-1"></div></div>
              <div><span className="text-gray-500">Best time to reach parent:</span><div className="border-b border-gray-300 mt-1 pb-1"></div></div>
              <div><span className="text-gray-500">Frequency of updates:</span><div className="border-b border-gray-300 mt-1 pb-1"></div></div>
              <div><span className="text-gray-500">Review conference date:</span><div className="border-b border-gray-300 mt-1 pb-1"></div></div>
            </div>
          </Section>

          <Section title="Signatures" number="6">
            <div className="grid grid-cols-2 gap-6 mt-2">
              <div><div className="border-b border-gray-300 mt-8 mb-1"></div><p className="text-xs text-gray-500">Parent/Guardian Signature / Date</p></div>
              <div><div className="border-b border-gray-300 mt-8 mb-1"></div><p className="text-xs text-gray-500">Administrator Signature / Date</p></div>
              <div><div className="border-b border-gray-300 mt-8 mb-1"></div><p className="text-xs text-gray-500">Student Signature / Date</p></div>
              <div><div className="border-b border-gray-300 mt-8 mb-1"></div><p className="text-xs text-gray-500">Counselor Signature / Date</p></div>
            </div>
          </Section>
        </div>

        <p className="text-[10px] text-gray-400 mt-6 text-center">Navigator by Clear Path Education Group · clearpathedgroup.com</p>
      </div>
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
