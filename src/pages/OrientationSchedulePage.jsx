import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import Topbar from '../components/layout/Topbar'
import Card, { CardTitle } from '../components/ui/Card'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import OrientationStudentForm from '../components/daep/OrientationStudentForm'
import { useOrientationSchedule } from '../hooks/useDaepDashboard'
import { formatStudentName } from '../lib/utils'
import { formatTime12h } from '../lib/orientationUtils'

export default function OrientationSchedulePage() {
  const [showPast, setShowPast] = useState(false)
  const { orientations, loading, refetch } = useOrientationSchedule(showPast)
  const navigate = useNavigate()
  const [selectedScheduling, setSelectedScheduling] = useState(null)

  const today = new Date().toISOString().split('T')[0]

  const { needsScheduling, missedByCampus, scheduled, completed } = useMemo(() => {
    const pending = []
    const missed = []
    const upcoming = []
    const done = []

    for (const o of orientations) {
      if (o.orientation_status === 'pending') {
        pending.push(o)
      } else if (o.orientation_status === 'scheduled') {
        if (o.orientation_scheduled_date && o.orientation_scheduled_date < today) {
          missed.push(o)
        } else {
          upcoming.push(o)
        }
      } else if (o.orientation_status === 'completed') {
        done.push(o)
      }
    }

    // Group missed by campus name
    const byCampus = {}
    for (const o of missed) {
      const campusName = o.incident?.campus?.name || 'No Campus Assigned'
      if (!byCampus[campusName]) byCampus[campusName] = []
      byCampus[campusName].push(o)
    }

    // Sort upcoming by date, then time
    upcoming.sort((a, b) => {
      const d = (a.orientation_scheduled_date || '').localeCompare(b.orientation_scheduled_date || '')
      if (d !== 0) return d
      return (a.orientation_scheduled_time || '').localeCompare(b.orientation_scheduled_time || '')
    })

    // Sort completed most-recent first
    done.sort((a, b) =>
      (b.orientation_completed_date || '').localeCompare(a.orientation_completed_date || '')
    )

    return { needsScheduling: pending, missedByCampus: byCampus, scheduled: upcoming, completed: done }
  }, [orientations, today])

  const missedTotal = Object.values(missedByCampus).reduce((s, r) => s + r.length, 0)

  const subtitleParts = [`${orientations.length} orientation${orientations.length !== 1 ? 's' : ''}`]
  if (needsScheduling.length > 0) subtitleParts.push(`${needsScheduling.length} needs scheduling`)
  if (missedTotal > 0) subtitleParts.push(`${missedTotal} missed`)

  return (
    <div>
      <Topbar
        title="Orientation Schedule"
        subtitle={subtitleParts.join(' \u2022 ')}
        actions={
          <button
            onClick={() => setShowPast(!showPast)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg border transition-colors ${
              showPast
                ? 'bg-orange-50 border-orange-300 text-orange-700'
                : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            {showPast ? 'Show Recent Only' : 'Show All History'}
          </button>
        }
      />

      <div className="p-6 space-y-6">
        {loading && (
          <div className="flex justify-center py-12"><LoadingSpinner /></div>
        )}

        {/* Section 1: Needs Scheduling */}
        {!loading && needsScheduling.length > 0 && (
          <Card>
            <div className="flex items-center gap-2 mb-3">
              <svg className="w-5 h-5 text-yellow-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
              <CardTitle>Needs Scheduling ({needsScheduling.length})</CardTitle>
            </div>
            <p className="text-xs text-gray-500 mb-3">
              Approved for DAEP placement but no orientation scheduled yet. Click a row to open the incident and schedule.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-500 uppercase border-b border-gray-100">
                    <th className="px-4 py-2">Student</th>
                    <th className="px-4 py-2">ID</th>
                    <th className="px-4 py-2">Grade</th>
                    <th className="px-4 py-2">Home Campus</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {needsScheduling.map(row => (
                    <tr
                      key={row.id}
                      className="hover:bg-yellow-50 cursor-pointer"
                      onClick={() => row.incident?.id && navigate(`/incidents/${row.incident.id}`)}
                    >
                      <td className="px-4 py-2.5 font-medium text-gray-900 whitespace-nowrap">
                        {row.student ? formatStudentName(row.student) : '—'}
                      </td>
                      <td className="px-4 py-2.5 text-gray-600 whitespace-nowrap">
                        {row.student?.student_id_number || '—'}
                      </td>
                      <td className="px-4 py-2.5 text-gray-600">
                        {row.student?.grade_level != null ? row.student.grade_level : '—'}
                      </td>
                      <td className="px-4 py-2.5 text-gray-600 whitespace-nowrap">
                        {row.incident?.campus?.name || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* Section 2: Missed Orientations — per campus */}
        {!loading && Object.entries(missedByCampus).map(([campusName, rows]) => (
          <div key={campusName} className="rounded-xl border border-red-200 overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-3 bg-red-100 border-b border-red-200">
              <svg className="w-5 h-5 text-red-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
              <div>
                <p className="text-sm font-semibold text-red-800">{campusName}</p>
                <p className="text-xs text-red-600">
                  {rows.length} missed orientation{rows.length !== 1 ? 's' : ''} — reschedule required
                </p>
              </div>
            </div>
            <div className="bg-red-50 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-500 uppercase border-b border-red-200">
                    <th className="px-4 py-2">Student</th>
                    <th className="px-4 py-2">ID</th>
                    <th className="px-4 py-2">Scheduled Date</th>
                    <th className="px-4 py-2">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-red-100">
                  {rows.map(row => (
                    <tr
                      key={row.id}
                      className="hover:bg-red-100 cursor-pointer"
                      onClick={() => row.incident?.id && navigate(`/incidents/${row.incident.id}`)}
                    >
                      <td className="px-4 py-2.5 font-medium text-gray-900 whitespace-nowrap">
                        {row.student ? formatStudentName(row.student) : '—'}
                      </td>
                      <td className="px-4 py-2.5 text-gray-600 whitespace-nowrap">
                        {row.student?.student_id_number || '—'}
                      </td>
                      <td className="px-4 py-2.5 text-red-700 font-medium whitespace-nowrap">
                        {row.orientation_scheduled_date
                          ? new Date(row.orientation_scheduled_date + 'T00:00:00').toLocaleDateString('en-US', {
                              weekday: 'short', month: 'short', day: 'numeric',
                            })
                          : '—'}
                      </td>
                      <td className="px-4 py-2.5 text-gray-600 whitespace-nowrap">
                        {row.orientation_scheduled_time ? formatTime12h(row.orientation_scheduled_time) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}

        {/* Section 3: Upcoming Scheduled Orientations */}
        {!loading && (
          <Card padding={false}>
            <div className="px-4 pt-4 pb-2">
              <CardTitle>
                Scheduled Orientations{scheduled.length > 0 ? ` (${scheduled.length})` : ''}
              </CardTitle>
              <p className="text-xs text-gray-500 mt-0.5">Click a row to open the student reflection &amp; behavior plan form.</p>
            </div>
            {scheduled.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">No upcoming scheduled orientations.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-gray-500 uppercase border-b border-gray-100">
                      <th className="px-4 py-3">Student</th>
                      <th className="px-4 py-3">ID</th>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Time</th>
                      <th className="px-4 py-3">Home Campus</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {scheduled.map(row => (
                      <tr
                        key={row.id}
                        className="hover:bg-orange-50 cursor-pointer"
                        onClick={() => setSelectedScheduling(row)}
                      >
                        <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">
                          {row.student ? formatStudentName(row.student) : '—'}
                        </td>
                        <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                          {row.student?.student_id_number || '—'}
                        </td>
                        <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                          {row.orientation_scheduled_date
                            ? new Date(row.orientation_scheduled_date + 'T00:00:00').toLocaleDateString('en-US', {
                                weekday: 'short', month: 'short', day: 'numeric',
                              })
                            : '—'}
                        </td>
                        <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                          {row.orientation_scheduled_time ? formatTime12h(row.orientation_scheduled_time) : '—'}
                        </td>
                        <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                          {row.incident?.campus?.name || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        )}

        {/* Section 4: Completed Orientations */}
        {!loading && completed.length > 0 && (
          <Card padding={false}>
            <div className="px-4 pt-4 pb-2 flex items-center gap-2">
              <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
              <CardTitle>Completed Orientations ({completed.length})</CardTitle>
            </div>
            <p className="text-xs text-gray-500 px-4 pb-2">Click a row to view the student reflection &amp; behavior plan (read-only).</p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-500 uppercase border-b border-gray-100">
                    <th className="px-4 py-3">Student</th>
                    <th className="px-4 py-3">ID</th>
                    <th className="px-4 py-3">Completed</th>
                    <th className="px-4 py-3">Home Campus</th>
                    <th className="px-4 py-3">Form</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {completed.map(row => (
                    <tr
                      key={row.id}
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => setSelectedScheduling(row)}
                    >
                      <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">
                        {row.student ? formatStudentName(row.student) : '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                        {row.student?.student_id_number || '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                        {row.orientation_completed_date
                          ? new Date(row.orientation_completed_date + 'T00:00:00').toLocaleDateString('en-US', {
                              weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
                            })
                          : '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                        {row.incident?.campus?.name || '—'}
                      </td>
                      <td className="px-4 py-3">
                        {row.orientation_form_data ? (
                          <span className="inline-flex items-center gap-1 text-xs text-green-700 font-medium">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                            </svg>
                            Filled
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {!loading && orientations.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-16">No orientations found.</p>
        )}
      </div>

      {/* Orientation Student Form Modal */}
      {selectedScheduling && (
        <OrientationStudentForm
          scheduling={selectedScheduling}
          student={selectedScheduling.student}
          incident={selectedScheduling.incident}
          onClose={() => setSelectedScheduling(null)}
          onSaved={() => {
            refetch()
            // Update local state so re-open shows fresh data
            setSelectedScheduling(null)
          }}
        />
      )}
    </div>
  )
}
