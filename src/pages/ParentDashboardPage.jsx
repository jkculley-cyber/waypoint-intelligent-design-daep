import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import Topbar from '../components/layout/Topbar'
import Card, { CardTitle } from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import StudentFlags from '../components/students/StudentFlags'
import {
  INCIDENT_STATUS_LABELS,
  INCIDENT_STATUS_COLORS,
  PLAN_STATUS_LABELS,
  PLAN_STATUS_COLORS,
  CONSEQUENCE_TYPE_LABELS,
} from '../lib/constants'
import { formatStudentNameShort, formatDate, daysRemaining, getSchoolYearLabel } from '../lib/utils'

export default function ParentDashboardPage() {
  const { profile, user } = useAuth()
  const [children, setChildren] = useState([])
  const [incidents, setIncidents] = useState([])
  const [plans, setPlans] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchParentData = async () => {
      if (!user?.id) return
      setLoading(true)

      try {
        // Fetch children linked to this parent
        const { data: studentData } = await supabase
          .from('students')
          .select('*')
          .eq('parent_user_id', user.id)
          .eq('is_active', true)

        const kids = studentData || []
        setChildren(kids)

        if (kids.length === 0) {
          setLoading(false)
          return
        }

        const studentIds = kids.map((s) => s.id)

        // Fetch recent incidents
        const { data: incidentData } = await supabase
          .from('incidents')
          .select(`
            id, status, incident_date, consequence_type, consequence_days,
            consequence_start, consequence_end, description,
            students (id, first_name, last_name),
            offense_codes (id, name)
          `)
          .in('student_id', studentIds)
          .order('incident_date', { ascending: false })
          .limit(10)

        setIncidents(incidentData || [])

        // Fetch active plans
        const { data: planData } = await supabase
          .from('transition_plans')
          .select(`
            id, plan_type, status, start_date, end_date, goals,
            students (id, first_name, last_name)
          `)
          .in('student_id', studentIds)
          .in('status', ['draft', 'active', 'under_review', 'extended'])
          .order('created_at', { ascending: false })

        setPlans(planData || [])
      } catch (err) {
        console.error('Error fetching parent data:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchParentData()
  }, [user?.id])

  if (loading) {
    return (
      <div>
        <Topbar title="Parent Dashboard" />
        <div className="flex justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      </div>
    )
  }

  return (
    <div>
      <Topbar
        title={`Welcome, ${profile?.full_name?.split(' ')[0] || 'Parent'}`}
        subtitle={`Parent Portal | ${getSchoolYearLabel()} School Year`}
      />

      <div className="p-6">
        {children.length === 0 ? (
          <Card>
            <div className="text-center py-8">
              <p className="text-gray-500">No students linked to your account.</p>
              <p className="text-sm text-gray-400 mt-1">
                Contact your school to link your child's records.
              </p>
            </div>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Children Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {children.map((child) => (
                <Card key={child.id}>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center text-lg font-bold">
                      {child.first_name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        {child.first_name} {child.last_name}
                      </p>
                      <p className="text-xs text-gray-500">
                        Grade {child.grade_level} | ID: {child.student_id_number}
                      </p>
                      <div className="mt-1">
                        <StudentFlags student={child} compact />
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recent Incidents */}
              <Card>
                <CardTitle>Recent Discipline Records</CardTitle>
                {incidents.length === 0 ? (
                  <p className="mt-4 text-sm text-gray-400 text-center py-4">
                    No discipline records found. Great news!
                  </p>
                ) : (
                  <div className="mt-4 space-y-3">
                    {incidents.map((incident) => (
                      <Link
                        key={incident.id}
                        to={`/parent/incidents/${incident.id}`}
                        className="block p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {incident.offense_codes?.name || 'Incident'}
                            </p>
                            <p className="text-xs text-gray-500 mt-0.5">
                              {formatStudentNameShort(incident.students)} | {formatDate(incident.incident_date)}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge color={INCIDENT_STATUS_COLORS[incident.status]} size="sm">
                              {INCIDENT_STATUS_LABELS[incident.status]}
                            </Badge>
                          </div>
                        </div>
                        {incident.consequence_type && (
                          <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
                            <span>Consequence: {CONSEQUENCE_TYPE_LABELS[incident.consequence_type]}</span>
                            {incident.consequence_days && (
                              <span>({incident.consequence_days} days)</span>
                            )}
                            {incident.consequence_end && incident.status === 'active' && (
                              <Badge color="yellow" size="sm">
                                {daysRemaining(incident.consequence_end)} days left
                              </Badge>
                            )}
                          </div>
                        )}
                      </Link>
                    ))}
                  </div>
                )}
              </Card>

              {/* Active Plans */}
              <Card>
                <CardTitle>Active Transition Plans</CardTitle>
                {plans.length === 0 ? (
                  <p className="mt-4 text-sm text-gray-400 text-center py-4">
                    No active transition plans.
                  </p>
                ) : (
                  <div className="mt-4 space-y-3">
                    {plans.map((plan) => (
                      <Link
                        key={plan.id}
                        to={`/parent/plans/${plan.id}`}
                        className="block p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {formatStudentNameShort(plan.students)}
                            </p>
                            <p className="text-xs text-gray-500 mt-0.5">
                              {formatDate(plan.start_date)} – {formatDate(plan.end_date)}
                            </p>
                          </div>
                          <Badge color={PLAN_STATUS_COLORS[plan.status]} size="sm" dot>
                            {PLAN_STATUS_LABELS[plan.status]}
                          </Badge>
                        </div>
                        {plan.goals && (
                          <p className="text-xs text-gray-600 mt-2 line-clamp-2">
                            {plan.goals.split('\n')[0]}
                          </p>
                        )}
                        {plan.end_date && plan.status === 'active' && (
                          <div className="mt-2">
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                              <span>{daysRemaining(plan.end_date)} days remaining</span>
                            </div>
                          </div>
                        )}
                      </Link>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
