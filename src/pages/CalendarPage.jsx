import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useAccessScope } from '../hooks/useAccessScope'
import { applyCampusScope } from '../lib/accessControl'
import Topbar from '../components/layout/Topbar'
import Card from '../components/ui/Card'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  subMonths,
  isSameMonth,
  isSameDay,
  isToday,
  parseISO,
} from 'date-fns'

const EVENT_COLORS = {
  daep_start: { bg: 'bg-red-100', text: 'text-red-800', dot: 'bg-red-500' },
  daep_end:   { bg: 'bg-green-100', text: 'text-green-800', dot: 'bg-green-500' },
  review:     { bg: 'bg-blue-100', text: 'text-blue-800', dot: 'bg-blue-500' },
  milestone:  { bg: 'bg-purple-100', text: 'text-purple-800', dot: 'bg-purple-500' },
}

export default function CalendarPage() {
  const { districtId } = useAuth()
  const { scope } = useAccessScope()
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedDay, setSelectedDay] = useState(null)

  useEffect(() => {
    if (!districtId) return
    const fetchCalendarData = async () => {
      setLoading(true)
      const monthStart = startOfMonth(currentMonth).toISOString().split('T')[0]
      const monthEnd = endOfMonth(currentMonth).toISOString().split('T')[0]

      // Fetch active/approved DAEP incidents with dates in this month
      let incidentQuery = supabase
        .from('incidents')
        .select(`
          id, consequence_start, consequence_end, consequence_days,
          student:students(id, first_name, last_name)
        `)
        .eq('district_id', districtId)
        .eq('consequence_type', 'daep')
        .in('status', ['active', 'approved'])
        .or(`consequence_start.gte.${monthStart},consequence_end.lte.${monthEnd},and(consequence_start.lte.${monthEnd},consequence_end.gte.${monthStart})`)
      incidentQuery = applyCampusScope(incidentQuery, scope)

      // Fetch transition plan reviews due this month
      let reviewQuery = supabase
        .from('transition_plan_reviews')
        .select(`
          id, review_type, scheduled_date,
          plan:transition_plans(id, student:students(first_name, last_name))
        `)
        .eq('district_id', districtId)
        .gte('scheduled_date', monthStart)
        .lte('scheduled_date', monthEnd)
        .in('status', ['scheduled', 'pending'])

      const [incRes, reviewRes] = await Promise.all([incidentQuery, reviewQuery])

      const calEvents = []

      for (const inc of incRes.data || []) {
        const studentName = inc.student ? `${inc.student.first_name} ${inc.student.last_name}` : 'Student'
        if (inc.consequence_start) {
          calEvents.push({
            id: `start-${inc.id}`,
            date: inc.consequence_start,
            type: 'daep_start',
            label: `${studentName} — DAEP Start`,
            href: `/incidents/${inc.id}`,
          })
        }
        if (inc.consequence_end) {
          calEvents.push({
            id: `end-${inc.id}`,
            date: inc.consequence_end,
            type: 'daep_end',
            label: `${studentName} — DAEP End`,
            href: `/incidents/${inc.id}`,
          })
        }
      }

      for (const rev of reviewRes.data || []) {
        const studentName = rev.plan?.student
          ? `${rev.plan.student.first_name} ${rev.plan.student.last_name}`
          : 'Student'
        calEvents.push({
          id: `review-${rev.id}`,
          date: rev.scheduled_date,
          type: 'review',
          label: `${studentName} — ${rev.review_type?.replace('_', ' ')} Review`,
          href: rev.plan?.id ? `/plans/${rev.plan.id}` : '/plans',
        })
      }

      setEvents(calEvents)
      setLoading(false)
    }
    fetchCalendarData()
  }, [districtId, currentMonth, scope])

  // Build calendar grid
  const calendarDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentMonth))
    const end = endOfWeek(endOfMonth(currentMonth))
    const days = []
    let day = start
    while (day <= end) {
      days.push(day)
      day = addDays(day, 1)
    }
    return days
  }, [currentMonth])

  const eventsByDate = useMemo(() => {
    const map = {}
    for (const evt of events) {
      if (!map[evt.date]) map[evt.date] = []
      map[evt.date].push(evt)
    }
    return map
  }, [events])

  const selectedDayEvents = selectedDay
    ? (eventsByDate[format(selectedDay, 'yyyy-MM-dd')] || [])
    : []

  return (
    <div>
      <Topbar
        title="Calendar"
        subtitle="DAEP placements, reviews, and milestones"
      />
      <div className="p-6">
        {/* Month navigation */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">
            {format(currentMonth, 'MMMM yyyy')}
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
            >
              <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
            </button>
            <button
              onClick={() => setCurrentMonth(new Date())}
              className="px-3 py-1.5 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Today
            </button>
            <button
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
            >
              <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
            </button>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 mb-4 flex-wrap">
          {Object.entries(EVENT_COLORS).map(([type, colors]) => (
            <div key={type} className="flex items-center gap-1.5">
              <div className={`w-2.5 h-2.5 rounded-full ${colors.dot}`} />
              <span className="text-xs text-gray-500 capitalize">{type.replace('_', ' ')}</span>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendar grid */}
          <div className="lg:col-span-2">
            <Card padding={false}>
              {loading ? (
                <div className="flex justify-center py-12"><LoadingSpinner /></div>
              ) : (
                <div>
                  {/* Day headers */}
                  <div className="grid grid-cols-7 border-b border-gray-100">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                      <div key={d} className="py-2 text-center text-xs font-medium text-gray-500">{d}</div>
                    ))}
                  </div>
                  {/* Day cells */}
                  <div className="grid grid-cols-7">
                    {calendarDays.map((day, i) => {
                      const dateKey = format(day, 'yyyy-MM-dd')
                      const dayEvents = eventsByDate[dateKey] || []
                      const inMonth = isSameMonth(day, currentMonth)
                      const isSelected = selectedDay && isSameDay(day, selectedDay)
                      const todayDay = isToday(day)

                      return (
                        <div
                          key={i}
                          onClick={() => setSelectedDay(day)}
                          className={`min-h-[80px] p-1.5 border-b border-r border-gray-100 cursor-pointer transition-colors ${
                            isSelected ? 'bg-orange-50' : 'hover:bg-gray-50'
                          } ${!inMonth ? 'bg-gray-50/50' : ''}`}
                        >
                          <div className={`text-xs font-medium mb-1 w-6 h-6 flex items-center justify-center rounded-full ${
                            todayDay
                              ? 'bg-orange-500 text-white'
                              : inMonth
                              ? 'text-gray-900'
                              : 'text-gray-300'
                          }`}>
                            {format(day, 'd')}
                          </div>
                          <div className="space-y-0.5">
                            {dayEvents.slice(0, 2).map(evt => {
                              const colors = EVENT_COLORS[evt.type] || EVENT_COLORS.review
                              return (
                                <div
                                  key={evt.id}
                                  className={`text-[10px] leading-tight px-1 py-0.5 rounded truncate ${colors.bg} ${colors.text}`}
                                >
                                  {evt.label}
                                </div>
                              )
                            })}
                            {dayEvents.length > 2 && (
                              <div className="text-[10px] text-gray-400 px-1">+{dayEvents.length - 2} more</div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </Card>
          </div>

          {/* Day detail panel */}
          <div>
            <Card>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">
                {selectedDay ? format(selectedDay, 'EEEE, MMMM d') : 'Select a day'}
              </h3>
              {!selectedDay ? (
                <p className="text-sm text-gray-400">Click on a day to see events.</p>
              ) : selectedDayEvents.length === 0 ? (
                <p className="text-sm text-gray-400">No events on this day.</p>
              ) : (
                <div className="space-y-2">
                  {selectedDayEvents.map(evt => {
                    const colors = EVENT_COLORS[evt.type] || EVENT_COLORS.review
                    return (
                      <Link
                        key={evt.id}
                        to={evt.href}
                        className={`block p-3 rounded-lg ${colors.bg} hover:opacity-80 transition-opacity`}
                      >
                        <div className="flex items-start gap-2">
                          <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${colors.dot}`} />
                          <p className={`text-xs font-medium ${colors.text}`}>{evt.label}</p>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              )}
            </Card>

            {/* Monthly event summary */}
            <div className="mt-4">
              <Card>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">
                  {format(currentMonth, 'MMMM')} Summary
                </h3>
                <div className="space-y-2">
                  {Object.entries(
                    events.reduce((acc, evt) => {
                      acc[evt.type] = (acc[evt.type] || 0) + 1
                      return acc
                    }, {})
                  ).map(([type, count]) => {
                    const colors = EVENT_COLORS[type] || EVENT_COLORS.review
                    return (
                      <div key={type} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`w-2.5 h-2.5 rounded-full ${colors.dot}`} />
                          <span className="text-xs text-gray-600 capitalize">{type.replace('_', ' ')}</span>
                        </div>
                        <span className="text-xs font-medium text-gray-900">{count}</span>
                      </div>
                    )
                  })}
                  {events.length === 0 && (
                    <p className="text-xs text-gray-400">No events this month.</p>
                  )}
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
