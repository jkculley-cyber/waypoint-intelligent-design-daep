import { useParams, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useOriginsStudent } from '../../hooks/useOrigins'
import { Card, SectionHeader, SkillBadge, StatusBadge, ProgressBar, EmptyState, PATHWAYS } from './OriginsUI'

export default function OriginsStudentDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { data, loading, error } = useOriginsStudent(id)

  if (loading) {
    return (
      <div className="p-6 space-y-4 animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-64" />
        <div className="h-4 bg-gray-100 rounded w-40" />
        <div className="grid grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => <div key={i} className="h-24 bg-gray-100 rounded-xl" />)}
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="p-6">
        <p className="text-sm text-red-600">Student not found or not enrolled in Origins.</p>
        <button onClick={() => navigate('/origins/pathways')} className="mt-3 text-sm text-teal-600 hover:underline">
          ← Back to Skill Pathways
        </button>
      </div>
    )
  }

  const student = data.student
  const studentName = student ? `${student.first_name} ${student.last_name}` : 'Unknown Student'
  const sessions       = data.sessions || []
  const replaySessions = data.replay_sessions || []
  const familyActs     = data.family_activities || []

  const completedSessions = sessions.filter(s => s.status === 'completed')
  const avgScore = completedSessions.length > 0
    ? Math.round(completedSessions.reduce((sum, s) => sum + (s.score || 0), 0) / completedSessions.length)
    : null

  // Pathway progress
  const pathwayProgress = PATHWAYS.map(p => {
    const pathwaySessions = sessions.filter(s => s.skill_pathway === p.key)
    const completed = pathwaySessions.filter(s => s.status === 'completed').length
    return { ...p, total: pathwaySessions.length, completed }
  })

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <button onClick={() => navigate(-1)} className="text-xs text-gray-400 hover:text-gray-600 mb-2 flex items-center gap-1">
          ← Back
        </button>
        <h1 className="text-2xl font-semibold text-gray-900">{studentName}</h1>
        <p className="text-sm text-gray-500 mt-1">
          Grade {student?.grade} · {student?.campus?.name} · Enrolled {data.enrolled_at ? new Date(data.enrolled_at).toLocaleDateString() : '—'}
        </p>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl px-5 py-4 border-t-2 border-t-teal-500">
          <p className="text-xs text-gray-400 uppercase tracking-widest font-mono mb-2">Sessions</p>
          <p className="font-mono text-3xl font-medium text-teal-600">{sessions.length}</p>
          <p className="text-xs text-gray-400">{completedSessions.length} completed</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl px-5 py-4 border-t-2 border-t-emerald-500">
          <p className="text-xs text-gray-400 uppercase tracking-widest font-mono mb-2">Avg Score</p>
          <p className="font-mono text-3xl font-medium text-emerald-600">{avgScore ?? '—'}</p>
          <p className="text-xs text-gray-400">across completed sessions</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl px-5 py-4 border-t-2 border-t-teal-500">
          <p className="text-xs text-gray-400 uppercase tracking-widest font-mono mb-2">Replays</p>
          <p className="font-mono text-3xl font-medium text-teal-600">{replaySessions.length}</p>
          <p className="text-xs text-gray-400">{replaySessions.filter(r => r.status === 'completed').length} completed</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl px-5 py-4 border-t-2 border-t-emerald-500">
          <p className="text-xs text-gray-400 uppercase tracking-widest font-mono mb-2">Family Acts</p>
          <p className="font-mono text-3xl font-medium text-emerald-600">{familyActs.length}</p>
          <p className="text-xs text-gray-400">{familyActs.filter(f => f.completed_at).length} completed</p>
        </div>
      </div>

      {/* Pathway progress */}
      <Card>
        <SectionHeader title="Pathway Progress" />
        <div className="divide-y divide-gray-100">
          {pathwayProgress.map(p => (
            <div key={p.key} className="px-5 py-4">
              <div className="flex items-center justify-between mb-2">
                <SkillBadge pathway={p.key} />
                <span className="text-xs font-mono text-gray-500">{p.completed}/{p.total} sessions</span>
              </div>
              <ProgressBar value={p.completed} max={Math.max(p.total, 1)} />
            </div>
          ))}
        </div>
      </Card>

      {/* Sessions list */}
      <Card>
        <SectionHeader title="Response Moment Sessions" action="+ Assign Scenario" onAction={() => toast('Scenario assignment coming soon', { icon: '\uD83D\uDD1C' })} />
        {!sessions.length ? (
          <EmptyState title="No sessions assigned" description="Assign a scenario from the Response Moments library." />
        ) : (
          <div className="divide-y divide-gray-100">
            {sessions.map(session => (
              <div key={session.id} className="flex items-center gap-4 px-5 py-3.5">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {session.scenario?.title || 'Scenario'}
                  </p>
                  <p className="text-xs text-gray-400">
                    {session.assigned_at ? new Date(session.assigned_at).toLocaleDateString() : '—'}
                  </p>
                </div>
                <SkillBadge pathway={session.skill_pathway} />
                {session.score !== null && (
                  <span className="text-xs font-mono text-teal-600 font-semibold">{session.score}pts</span>
                )}
                <StatusBadge status={session.status} />
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Replay sessions */}
      <Card>
        <SectionHeader title="Replay Tool Sessions" action="+ Assign Replay" onAction={() => toast('Replay assignment coming soon', { icon: '\uD83D\uDD1C' })} />
        {!replaySessions.length ? (
          <EmptyState title="No replay sessions" description="Use the Replay Tool after a Waypoint incident to guide structured reflection." />
        ) : (
          <div className="divide-y divide-gray-100">
            {replaySessions.map(rs => (
              <div key={rs.id} className="flex items-center gap-4 px-5 py-3.5">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">
                    Reflection — {rs.assigned_at ? new Date(rs.assigned_at).toLocaleDateString() : '—'}
                  </p>
                  {rs.incident_id && (
                    <p className="text-xs text-teal-600">Linked to Waypoint incident</p>
                  )}
                </div>
                <StatusBadge status={rs.status} />
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
