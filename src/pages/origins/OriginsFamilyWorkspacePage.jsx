import { useState } from 'react'
import toast from 'react-hot-toast'
import { useOriginsStudents, useOriginsFamilyWorkspace } from '../../hooks/useOrigins'
import { Card, SectionHeader, EmptyState, StatusBadge } from './OriginsUI'

const ACTIVITY_TYPE_LABELS = {
  conversation_starter: 'Conversation Starter',
  micro_activity:       'Micro Activity',
  check_in:             'Check-In',
}

const ACTIVITY_TYPE_COLORS = {
  conversation_starter: 'bg-teal-50 text-teal-700 border-teal-200',
  micro_activity:       'bg-emerald-50 text-emerald-700 border-emerald-200',
  check_in:             'bg-cyan-50 text-cyan-700 border-cyan-200',
}

export default function OriginsFamilyWorkspacePage() {
  const { data: enrollments, loading } = useOriginsStudents()
  const [selectedStudentId, setSelectedStudentId] = useState(null)

  const students = enrollments?.map(e => e.student).filter(Boolean) || []

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Family Workspace</h1>
          <p className="text-sm text-gray-500 mt-1">Conversation starters, micro-activities, and family check-ins</p>
        </div>
        <button
          onClick={() => toast('Activity assignment coming soon', { icon: '\uD83D\uDD1C' })}
          className="px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 transition-colors"
        >
          + Assign Activity
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Student list */}
        <Card>
          <SectionHeader title="Enrolled Students" />
          {loading ? (
            <div className="p-4 space-y-2">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-10 bg-gray-100 rounded animate-pulse" />
              ))}
            </div>
          ) : !students.length ? (
            <EmptyState title="No students enrolled" description="Enroll students via Skill Pathways." />
          ) : (
            <div className="divide-y divide-gray-100">
              {students.map(s => (
                <button
                  key={s.id}
                  onClick={() => setSelectedStudentId(s.id)}
                  className={`w-full text-left flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors ${
                    selectedStudentId === s.id ? 'bg-teal-50' : ''
                  }`}
                >
                  <div className="w-8 h-8 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center text-sm font-medium shrink-0">
                    {s.first_name?.charAt(0)}{s.last_name?.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {s.first_name} {s.last_name}
                    </p>
                    <p className="text-xs text-gray-400">Grade {s.grade} · {s.campus?.name}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </Card>

        {/* Activity log */}
        <div className="lg:col-span-2">
          {selectedStudentId ? (
            <StudentActivities studentId={selectedStudentId} students={students} />
          ) : (
            <Card className="flex items-center justify-center h-64">
              <p className="text-sm text-gray-400">Select a student to view their family workspace</p>
            </Card>
          )}
        </div>
      </div>

      {/* Activity type legend */}
      <Card className="p-5">
        <h3 className="text-sm font-semibold text-gray-800 mb-3">Activity Types</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {Object.entries(ACTIVITY_TYPE_LABELS).map(([key, label]) => (
            <div key={key} className={`border rounded-lg px-4 py-3 ${ACTIVITY_TYPE_COLORS[key]}`}>
              <p className="text-sm font-medium">{label}</p>
              <p className="text-xs mt-1 opacity-75">
                {key === 'conversation_starter' && 'Guided prompts for parent-student dialogue'}
                {key === 'micro_activity'       && 'Short 10–15 min skill-building exercises'}
                {key === 'check_in'             && 'Brief family reflection check-ins'}
              </p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}

function StudentActivities({ studentId, students }) {
  const { data: activities, loading } = useOriginsFamilyWorkspace(studentId)
  const student = students.find(s => s.id === studentId)

  return (
    <Card>
      <SectionHeader
        title={student ? `${student.first_name} ${student.last_name} — Family Activities` : 'Family Activities'}
        action="+ Assign"
        onAction={() => toast('Activity assignment coming soon', { icon: '\uD83D\uDD1C' })}
      />
      {loading ? (
        <div className="p-4 space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-12 bg-gray-100 rounded animate-pulse" />
          ))}
        </div>
      ) : !activities?.length ? (
        <EmptyState title="No activities assigned" description="Assign a conversation starter, micro-activity, or check-in." />
      ) : (
        <div className="divide-y divide-gray-100">
          {activities.map(a => (
            <div key={a.id} className="flex items-center gap-4 px-5 py-3.5">
              <span className={`px-2 py-0.5 rounded text-xs font-medium border ${ACTIVITY_TYPE_COLORS[a.activity_type]}`}>
                {ACTIVITY_TYPE_LABELS[a.activity_type]}
              </span>
              <span className="text-sm text-gray-700 flex-1 truncate">
                {a.content?.title || 'Activity'}
              </span>
              <StatusBadge status={a.completed_at ? 'completed' : 'assigned'} />
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}
