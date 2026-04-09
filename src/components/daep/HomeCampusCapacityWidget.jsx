import { useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import Card, { CardTitle } from '../ui/Card'
import Button from '../ui/Button'
import Badge from '../ui/Badge'
import { useHomeCampusCapacity, useNearingCompletion, useReleaseSeat } from '../../hooks/useDaepDashboard'
import { useAuth } from '../../contexts/AuthContext'
import { useAccessScope } from '../../hooks/useAccessScope'

/**
 * Home Campus DAEP Capacity + Nearing Completion widget.
 * Shows per-campus seat accounting (Allocation / Active / Pending / Available)
 * plus a list of students nearing DAEP completion (returning to home campus).
 */
export default function HomeCampusCapacityWidget() {
  const { scope } = useAccessScope()
  const { campusRows, loading, refetch } = useHomeCampusCapacity()
  const { students: nearing, loading: nearingLoading } = useNearingCompletion(5)
  const { releaseSeat, loading: releasing } = useReleaseSeat()
  const { hasRole } = useAuth()
  const canRelease = hasRole(['admin', 'principal', 'ap'])
  const [expandedCampus, setExpandedCampus] = useState(null)
  const [drillMode, setDrillMode] = useState(null) // 'active' | 'pending' | 'noShow'

  const handleRelease = async (incidentId) => {
    if (!confirm('Release this seat? The no-show student will no longer count against allocation. This cannot be undone.')) return
    const { success, error } = await releaseSeat(incidentId)
    if (success) {
      toast.success('Seat released')
      refetch()
    } else {
      toast.error(error || 'Failed to release seat')
    }
  }

  const toggleDrill = (campusId, mode) => {
    if (expandedCampus === campusId && drillMode === mode) {
      setExpandedCampus(null)
      setDrillMode(null)
    } else {
      setExpandedCampus(campusId)
      setDrillMode(mode)
    }
  }

  // Only show to campus-scoped staff (e.g. Bluebonnet principal). District-wide admins
  // have the full DAEP dashboard and don't need the per-home-campus view.
  if (scope?.isDistrictWide) return null
  if (loading) return null
  if (!campusRows.length) return null

  return (
    <div className="mb-6 space-y-4">
      {/* Capacity per campus */}
      <Card>
        <div className="flex items-center justify-between mb-3">
          <CardTitle>My Campus DAEP Seats</CardTitle>
          <span className="text-xs text-gray-500">Home campus allocation</span>
        </div>
        <div className="space-y-3">
          {campusRows.map(row => {
            const overAllocated = row.available < 0
            return (
              <div key={row.campus_id} className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-gray-900">{row.campus_name}</p>
                    {row.allocation === 0 && (
                      <span className="text-xs text-gray-500 italic">No allocation set</span>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-4 divide-x divide-gray-200">
                  <Tile
                    label="Allocation"
                    value={row.allocation}
                    color="gray"
                  />
                  <Tile
                    label="Active"
                    value={row.active}
                    color="orange"
                    onClick={row.activeList.length ? () => toggleDrill(row.campus_id, 'active') : null}
                    sublabel={row.noShows > 0 ? `${row.noShows} no-show` : null}
                  />
                  <Tile
                    label="Pending"
                    value={row.pending}
                    color="blue"
                    onClick={row.pendingList.length ? () => toggleDrill(row.campus_id, 'pending') : null}
                  />
                  <Tile
                    label="Available"
                    value={row.available}
                    color={overAllocated ? 'red' : row.available <= 1 ? 'yellow' : 'green'}
                    sublabel={overAllocated ? 'Over allocation' : null}
                  />
                </div>

                {/* Drill-down list */}
                {expandedCampus === row.campus_id && drillMode && (
                  <div className="border-t border-gray-200 bg-white">
                    <DrillList
                      items={drillMode === 'active' ? row.activeList : row.pendingList}
                      noShowIds={new Set(row.noShowList.map(i => i.id))}
                      mode={drillMode}
                      canRelease={canRelease && drillMode === 'active'}
                      releasing={releasing}
                      onRelease={handleRelease}
                    />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </Card>

      {/* Nearing completion / returns */}
      {!nearingLoading && nearing.length > 0 && (
        <Card>
          <div className="flex items-center justify-between mb-3">
            <CardTitle>Returning from DAEP Soon</CardTitle>
            <Badge color="green" size="sm">{nearing.length} student{nearing.length !== 1 ? 's' : ''}</Badge>
          </div>
          <p className="text-xs text-gray-500 mb-3">
            Students within 5 instructional days of completing their assigned DAEP days. Review transition plans before return.
          </p>
          <div className="space-y-2">
            {nearing.map(inc => {
              const plan = (inc.transition_plans && inc.transition_plans[0]) || null
              const planHref = plan ? `/plans/${plan.id}` : `/incidents/${inc.id}`
              return (
                <Link
                  key={inc.id}
                  to={planHref}
                  className="flex items-center justify-between p-3 rounded-lg border border-green-200 bg-green-50 hover:bg-green-100 transition-colors group"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {inc.student.first_name} {inc.student.last_name}
                      <span className="ml-2 text-xs text-gray-500">Grade {inc.student.grade_level}</span>
                    </p>
                    <p className="text-xs text-gray-600 mt-0.5">
                      {inc.student.campus?.name} · {inc.daysServed} of {inc.assigned} days served
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className={`text-lg font-bold ${inc.daysRemaining === 0 ? 'text-green-700' : 'text-gray-900'}`}>
                        {inc.daysRemaining}
                      </p>
                      <p className="text-[10px] text-gray-500 uppercase">days left</p>
                    </div>
                    <svg className="h-4 w-4 text-gray-400 group-hover:text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </Link>
              )
            })}
          </div>
        </Card>
      )}
    </div>
  )
}

function Tile({ label, value, color, sublabel, onClick }) {
  const colorMap = {
    gray: 'text-gray-900',
    orange: 'text-orange-600',
    blue: 'text-blue-600',
    green: 'text-green-600',
    yellow: 'text-yellow-600',
    red: 'text-red-600',
  }
  const Wrap = onClick ? 'button' : 'div'
  return (
    <Wrap
      type={onClick ? 'button' : undefined}
      onClick={onClick || undefined}
      className={`px-4 py-3 text-center ${onClick ? 'hover:bg-gray-50 cursor-pointer' : ''}`}
    >
      <p className={`text-2xl font-bold ${colorMap[color]}`}>{value}</p>
      <p className="text-[10px] text-gray-500 uppercase tracking-wide mt-0.5">{label}</p>
      {sublabel && <p className="text-[10px] text-gray-500 italic mt-0.5">{sublabel}</p>}
    </Wrap>
  )
}

function DrillList({ items, noShowIds, mode, canRelease, releasing, onRelease }) {
  if (!items.length) {
    return <p className="px-4 py-3 text-xs text-gray-500">No students.</p>
  }
  return (
    <ul className="divide-y divide-gray-100">
      {items.map(inc => {
        const isNoShow = noShowIds.has(inc.id)
        return (
          <li key={inc.id} className="px-4 py-2 flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <Link
                to={`/incidents/${inc.id}`}
                className="text-sm text-gray-900 hover:text-orange-600 truncate"
              >
                {inc.student?.first_name} {inc.student?.last_name}
              </Link>
              {isNoShow && <Badge color="red" size="sm">No-show</Badge>}
              <span className="text-xs text-gray-500 capitalize">{inc.status}</span>
            </div>
            {canRelease && isNoShow && (
              <Button
                size="sm"
                variant="secondary"
                disabled={releasing}
                onClick={() => onRelease(inc.id)}
              >
                Release Seat
              </Button>
            )}
          </li>
        )
      })}
    </ul>
  )
}
