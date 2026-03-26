import { useNavigate } from 'react-router-dom'
import { useWaypointLinked } from '../../hooks/useMeridian'
import { Skeleton, Card } from './MeridianUI'

const SYNC_LOG = [
  { time: 'Today 4:12 PM',  event: 'Auto-sync complete — SPED records checked against Waypoint DAEP database', type: 'ok'   },
  { time: 'Today 6:02 AM',  event: 'DAEP/IEP overlap flags generated — escalations sent to SPED Director',     type: 'warn' },
  { time: 'Yesterday',      event: 'New DAEP placement logged in Waypoint — Meridian ARD alert triggered',      type: 'warn' },
  { time: 'Feb 17',         event: 'Re-evaluation ARD window breach detected via Waypoint sync',                 type: 'error'},
  { time: 'Feb 16',         event: 'Auto-sync complete — no new flags',                                          type: 'ok'   },
]

export default function MeridianWaypointSyncPage() {
  const navigate = useNavigate()
  const { data: linked, loading } = useWaypointLinked()

  const issueCount = linked?.filter(s => {
    const iep = s.meridian_ieps?.find(i => i.status === 'active')
    if (!iep) return false
    return iep.annual_review_due && !iep.annual_review_held && new Date(iep.annual_review_due) < new Date()
  }).length ?? 0

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Waypoint Integration</h1>
          <p className="text-sm text-gray-500 mt-0.5">DAEP placements overlapping with active IEPs and 504 plans</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold font-mono bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            LIVE SYNC
          </div>
          <button className="px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 transition-colors">
            Force Sync
          </button>
        </div>
      </div>

      {/* Explainer */}
      <div className="px-6 py-5 bg-purple-50 border border-purple-200 rounded-xl">
        <h2 className="text-sm font-bold text-gray-900 mb-2">Meridian ↔ Waypoint Student Record Sharing</h2>
        <p className="text-sm text-gray-600 leading-relaxed">
          Students placed in DAEP through Waypoint who have an active IEP or 504 are automatically flagged here.
          IDEA requires special education services continue during DAEP placements.
        </p>
      </div>

      {/* Issue alert */}
      {issueCount > 0 && (
        <div className="flex items-center gap-3 px-5 py-4 bg-red-50 border border-red-200 rounded-xl">
          <span className="text-xl">🚨</span>
          <div>
            <p className="text-sm font-bold text-red-700">{issueCount} student{issueCount !== 1 ? 's' : ''} in DAEP have IEP compliance issues</p>
            <p className="text-sm text-gray-600">Federal IDEA requirements mandate services continue during DAEP. Immediate review required.</p>
          </div>
        </div>
      )}

      {/* Linked students */}
      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-4">DAEP Students with SPED Records</h3>
        {loading
          ? Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-xl mb-3" />)
          : (linked ?? []).length === 0
            ? (
                <Card className="px-5 py-8 text-center">
                  <p className="text-sm text-gray-400">No students currently linked between Waypoint and Meridian.</p>
                </Card>
              )
            : (linked ?? []).map(s => {
                const iep = s.meridian_ieps?.find(i => i.status === 'active')
                const isOverdue = iep?.annual_review_due && !iep?.annual_review_held && new Date(iep.annual_review_due) < new Date()
                const daysOverdue = isOverdue ? Math.abs(Math.round((new Date(iep.annual_review_due) - new Date()) / 86400000)) : null

                return (
                  <Card key={s.id} className="flex items-center gap-5 px-6 py-4 mb-3 cursor-pointer">
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-900">{s.first_name} {s.last_name}</p>
                      <p className="text-xs text-gray-400">Grade {s.grade} • {s.campus?.name}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 uppercase tracking-wider font-mono mb-1">Waypoint ID</p>
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono bg-amber-50 text-amber-700 border border-amber-200">
                        {s.waypoint_student_id}
                      </span>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 uppercase tracking-wider font-mono mb-1">Meridian Status</p>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-mono ${isOverdue ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}`}>
                        {isOverdue ? `Annual Review ${daysOverdue}d Overdue` : 'IEP Current'}
                      </span>
                    </div>
                    <button
                      onClick={e => { e.stopPropagation(); navigate(`/meridian/students/${s.id}`) }}
                      className="text-xs text-purple-600 hover:text-purple-700 font-medium px-2 py-1 rounded hover:bg-purple-50"
                    >
                      Open →
                    </button>
                  </Card>
                )
              })
        }
      </div>

      {/* Sync log */}
      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Sync Log</h3>
        <Card>
          {SYNC_LOG.map((log, i) => (
            <div key={i} className={`flex items-start gap-3 px-5 py-3 ${i < SYNC_LOG.length - 1 ? 'border-b border-gray-100' : ''}`}>
              <span className={`mt-0.5 text-sm ${log.type === 'ok' ? 'text-emerald-600' : log.type === 'warn' ? 'text-amber-500' : 'text-red-500'}`}>
                {log.type === 'ok' ? '✓' : log.type === 'warn' ? '⚠' : '✕'}
              </span>
              <p className="text-xs text-gray-600 flex-1 font-mono">{log.event}</p>
              <span className="text-xs text-gray-400 whitespace-nowrap font-mono">{log.time}</span>
            </div>
          ))}
        </Card>
      </div>
    </div>
  )
}
