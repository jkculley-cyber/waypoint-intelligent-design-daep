import { useNavigate } from 'react-router-dom'
import OriginsPortalLayout from './OriginsPortalLayout'

// Demo data — will be replaced by real DB queries
const DEMO_STUDENT = {
  name: 'Alex',
  grade: '8th',
  campus: 'Lone Star Middle School',
  sessionsCompleted: 2,
  sessionsTotal: 3,
  lastActive: '2 days ago',
}

const DEMO_FAMILY_ACTIVITIES = [
  {
    id: '1',
    type: 'conversation_starter',
    title: 'The Rewind Conversation',
    description: 'Ask your teen to walk you backward from a tense moment this week. What were they feeling 30 minutes before it happened?',
    tip: 'Try this at dinner or in the car — not as a lesson, just as curiosity.',
    completed: false,
  },
  {
    id: '2',
    type: 'micro_activity',
    title: '"Make Your Case" Practice',
    description: 'Let your teen argue for something they want using calm tone and clear reasons. Coach the HOW, not just the outcome.',
    tip: 'Takes 10 minutes. Works best when there\'s something low-stakes to argue about.',
    completed: false,
  },
  {
    id: '3',
    type: 'check_in',
    title: 'Stress Level Check-In',
    description: 'Ask your teen: "On a scale of 1–10, how stressed are you this week?" Then actually respond to a high number.',
    tip: 'Do this every Sunday. Consistency builds trust.',
    completed: true,
  },
]

const TYPE_STYLES = {
  conversation_starter: { label: 'Conversation Starter', color: 'bg-teal-50 text-teal-700 border-teal-200', dot: 'bg-teal-500' },
  micro_activity:       { label: 'Micro-Activity',        color: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
  check_in:             { label: 'Check-In',              color: 'bg-cyan-50 text-cyan-700 border-cyan-200', dot: 'bg-cyan-500' },
}

const RESOURCES = [
  { title: 'When Your Teen Won\'t Listen', desc: 'How to open real conversations about school stress' },
  { title: 'The "Blame Me" Technique', desc: 'Give your teen a social exit from peer pressure' },
  { title: 'Walking Away ≠ Weakness', desc: 'Help your teen see de-escalation as strength' },
  { title: 'Rebuilding After a Mistake', desc: 'The accountability conversation that builds, not breaks' },
]

export default function OriginsParentPortalPage() {
  const navigate = useNavigate()
  const pending   = DEMO_FAMILY_ACTIVITIES.filter(a => !a.completed)
  const completed = DEMO_FAMILY_ACTIVITIES.filter(a => a.completed)

  const progressPct = DEMO_STUDENT.sessionsTotal > 0
    ? Math.round((DEMO_STUDENT.sessionsCompleted / DEMO_STUDENT.sessionsTotal) * 100)
    : 0

  return (
    <OriginsPortalLayout>
      <button onClick={() => navigate('/family')} className="text-xs text-teal-600 hover:underline mb-6 flex items-center gap-1">
        ← Back
      </button>

      {/* Student progress card */}
      <div className="bg-white rounded-2xl border border-emerald-100 shadow-sm p-6 mb-6">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-lg font-bold shrink-0">
            {DEMO_STUDENT.name.charAt(0)}
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">{DEMO_STUDENT.name}'s Progress</h2>
            <p className="text-sm text-gray-400">Grade {DEMO_STUDENT.grade} · {DEMO_STUDENT.campus}</p>
          </div>
          <span className="ml-auto text-xs text-gray-400">Active {DEMO_STUDENT.lastActive}</span>
        </div>

        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-600">Skill sessions completed</span>
          <span className="text-sm font-mono font-semibold text-emerald-600">
            {DEMO_STUDENT.sessionsCompleted} / {DEMO_STUDENT.sessionsTotal}
          </span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-500 rounded-full transition-all duration-700"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <p className="text-xs text-gray-400 mt-2">
          {progressPct === 100
            ? '🎉 All sessions complete!'
            : `${DEMO_STUDENT.sessionsTotal - DEMO_STUDENT.sessionsCompleted} session${DEMO_STUDENT.sessionsTotal - DEMO_STUDENT.sessionsCompleted !== 1 ? 's' : ''} remaining`}
        </p>
      </div>

      {/* Family activities */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-700">Your Family Activities</h2>
          <span className="text-xs text-gray-400">{pending.length} to do</span>
        </div>
        <div className="space-y-3">
          {pending.map(a => (
            <FamilyActivityCard key={a.id} activity={a} />
          ))}
          {completed.map(a => (
            <FamilyActivityCard key={a.id} activity={a} completed />
          ))}
        </div>
      </div>

      {/* Resource library */}
      <div>
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Parent Resources</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {RESOURCES.map((r, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-100 p-4 hover:border-teal-200 transition-colors cursor-pointer">
              <h3 className="text-sm font-semibold text-gray-900 mb-1">{r.title}</h3>
              <p className="text-xs text-gray-500">{r.desc}</p>
              <span className="text-xs text-teal-600 font-medium mt-2 inline-block">Read more →</span>
            </div>
          ))}
        </div>
      </div>

      {/* Partner note */}
      <div className="mt-8 bg-teal-50 border border-teal-100 rounded-2xl p-5 text-center">
        <p className="text-sm text-teal-800 font-medium mb-1">You're partnering with {DEMO_STUDENT.campus}</p>
        <p className="text-xs text-teal-600">
          Activities are assigned by your child's counselor to support skills they're building at school.
          What you do at home makes the biggest difference. 💛
        </p>
      </div>
    </OriginsPortalLayout>
  )
}

function FamilyActivityCard({ activity, completed }) {
  const style = TYPE_STYLES[activity.type]

  return (
    <div className={`bg-white rounded-2xl border shadow-sm p-5 transition-all ${
      completed ? 'border-gray-100 opacity-60' : 'border-emerald-100 hover:border-emerald-300 hover:shadow-md'
    }`}>
      <div className="flex items-start gap-3 mb-3">
        <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${style.dot}`} />
        <div className="flex-1 min-w-0">
          <span className={`inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded border ${style.color} mb-1.5`}>
            {style.label}
          </span>
          <h3 className="text-base font-semibold text-gray-900">{activity.title}</h3>
          <p className="text-sm text-gray-500 mt-1">{activity.description}</p>
        </div>
      </div>

      {!completed && activity.tip && (
        <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-2.5">
          <p className="text-xs text-amber-700">
            <span className="font-semibold">💡 Tip: </span>{activity.tip}
          </p>
        </div>
      )}

      {!completed && (
        <button className="mt-3 w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-xl transition-colors">
          Mark Complete ✓
        </button>
      )}

      {completed && (
        <div className="flex items-center gap-1.5 text-xs text-gray-400 mt-1">
          <svg className="h-3.5 w-3.5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Completed
        </div>
      )}
    </div>
  )
}
