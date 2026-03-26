import { useState } from 'react'
import toast from 'react-hot-toast'
import { useOriginsReplaySessions } from '../../hooks/useOrigins'
import { StatusBadge, Card, SectionHeader, EmptyState } from './OriginsUI'

export default function OriginsReplayToolPage() {
  const [statusFilter, setStatusFilter] = useState(null)
  const { data: sessions, loading } = useOriginsReplaySessions({ status: statusFilter })

  const tabs = [
    { key: null,          label: 'All' },
    { key: 'assigned',    label: 'Assigned' },
    { key: 'in_progress', label: 'In Progress' },
    { key: 'completed',   label: 'Completed' },
  ]

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Replay Tool</h1>
          <p className="text-sm text-gray-500 mt-1">Structured reflection sessions — linked to Waypoint incidents</p>
        </div>
        <button
          onClick={() => toast('Session assignment coming soon', { icon: '\uD83D\uDD1C' })}
          className="px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 transition-colors"
        >
          + Assign Session
        </button>
      </div>

      {/* Status tabs */}
      <div className="flex gap-2 border-b border-gray-200 pb-0">
        {tabs.map(t => (
          <button
            key={String(t.key)}
            onClick={() => setStatusFilter(t.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
              statusFilter === t.key
                ? 'border-teal-600 text-teal-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Sessions list */}
      <Card>
        <SectionHeader title="Replay Sessions" />
        {loading ? (
          <div className="divide-y divide-gray-100">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-3.5 animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-32" />
                <div className="h-4 bg-gray-100 rounded w-24" />
                <div className="h-4 bg-gray-100 rounded w-20 ml-auto" />
              </div>
            ))}
          </div>
        ) : !sessions?.length ? (
          <EmptyState
            title="No replay sessions"
            description="Assign a Replay Tool session to a student to get started."
          />
        ) : (
          <div className="divide-y divide-gray-100">
            {sessions.map(session => (
              <ReplaySessionRow key={session.id} session={session} />
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}

function ReplaySessionRow({ session }) {
  const studentName = session.student
    ? `${session.student.first_name} ${session.student.last_name}`
    : 'Unknown Student'

  const assignedDate = session.assigned_at
    ? new Date(session.assigned_at).toLocaleDateString()
    : '—'

  return (
    <div className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 transition-colors">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">{studentName}</p>
        <p className="text-xs text-gray-400">Grade {session.student?.grade ?? '—'} · Assigned {assignedDate}</p>
      </div>
      {session.incident_id && (
        <span className="text-xs text-teal-600 font-mono">Incident linked</span>
      )}
      <StatusBadge status={session.status} />
      <button className="text-xs text-teal-600 hover:text-teal-700 font-medium shrink-0">
        View →
      </button>
    </div>
  )
}
