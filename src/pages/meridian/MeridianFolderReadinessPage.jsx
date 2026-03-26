import { useState } from 'react'
import toast from 'react-hot-toast'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { useCampusReadinessScores, useFolderReadiness } from '../../hooks/useMeridian'
import { Skeleton, Card, ReadinessBar } from './MeridianUI'

export default function MeridianFolderReadinessPage() {
  const [selected, setSelected] = useState(null)
  const { data: campuses,    loading: campusLoading }  = useCampusReadinessScores()
  const { data: studentRows, loading: studentLoading } = useFolderReadiness(selected)

  const avgReadiness = campuses?.length
    ? Math.round(campuses.reduce((s, c) => s + c.readiness, 0) / campuses.length)
    : 0
  const totalSped    = campuses?.reduce((s, c) => s + c.spedCount, 0) ?? 0
  const lowCampuses  = campuses?.filter(c => c.readiness < 70).length ?? 0

  const handleExportReport = () => {
    const doc = new jsPDF()
    doc.setFontSize(16)
    doc.text('Meridian — Folder Readiness Report', 14, 18)
    doc.setFontSize(10)
    doc.text(`Generated ${new Date().toLocaleDateString()}`, 14, 25)
    doc.text(`District Average: ${avgReadiness}% | Total SPED: ${totalSped} | Campuses Below 70%: ${lowCampuses}`, 14, 32)

    const rows = (campuses ?? []).sort((a, b) => a.readiness - b.readiness).map(c => [
      c.campus_name,
      c.spedCount,
      `${c.readiness}%`,
      c.readiness < 70 ? 'Below Threshold' : 'On Track',
    ])

    autoTable(doc, {
      startY: 38,
      head: [['Campus', 'SPED Students', 'Readiness', 'Status']],
      body: rows,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [107, 33, 168] },
    })

    doc.save('meridian-folder-readiness.pdf')
    toast.success('Report exported')
  }

  const missingDocs = studentRows?.filter(s => {
    const score = s.iep_readiness_pct ?? s.plan_504_readiness_pct ?? 100
    return score < 100
  }) ?? []

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Folder Readiness Scores</h1>
          <p className="text-sm text-gray-500 mt-0.5">IEP and 504 document completeness by campus</p>
        </div>
        <button
          onClick={handleExportReport}
          className="px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 transition-colors"
        >
          Export Report
        </button>
      </div>

      {/* Summary bar */}
      <Card className="flex items-center gap-8 px-6 py-5">
        {[
          { label: 'District Average', value: `${avgReadiness}%`, color: 'text-blue-600'    },
          { label: 'Total SPED',       value: totalSped,           color: 'text-gray-900'   },
          { label: 'Below 70%',        value: lowCampuses,         color: 'text-red-600'    },
        ].map((s, i) => (
          <div key={i} className="flex items-center gap-6">
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-widest font-mono mb-1">{s.label}</p>
              {campusLoading
                ? <Skeleton className="h-9 w-16" />
                : <p className={`font-mono text-4xl font-medium ${s.color}`}>{s.value}</p>
              }
            </div>
            {i < 2 && <div className="h-12 w-px bg-gray-200" />}
          </div>
        ))}
        <div className="flex-1 ml-4">
          <p className="text-xs text-gray-400 uppercase tracking-widest font-mono mb-2">District Readiness</p>
          <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700 bg-blue-500"
              style={{ width: `${avgReadiness}%` }}
            />
          </div>
        </div>
      </Card>

      {/* Campus grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {campusLoading
          ? Array(6).fill(0).map((_, i) => (
              <Card key={i} className="px-5 py-4">
                <Skeleton className="h-4 w-3/4 mb-2" />
                <Skeleton className="h-3 w-1/2 mb-4" />
                <Skeleton className="h-2 w-full" />
              </Card>
            ))
          : (campuses ?? []).sort((a, b) => a.readiness - b.readiness).map(c => (
              <Card
                key={c.campus_id}
                className={`px-5 py-4 ${selected === c.campus_id ? 'ring-2 ring-purple-400' : ''}`}
                onClick={() => setSelected(selected === c.campus_id ? null : c.campus_id)}
              >
                <p className="text-sm font-semibold text-gray-900 mb-0.5">{c.campus_name}</p>
                <p className="text-xs text-gray-400 mb-4">{c.spedCount} SPED students</p>
                <ReadinessBar score={c.readiness} />

                {selected === c.campus_id && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <p className="text-xs text-gray-400 uppercase tracking-wider font-mono mb-2">Students with Incomplete Folders</p>
                    {studentLoading
                      ? <Skeleton className="h-20 w-full" />
                      : missingDocs.length === 0
                        ? <p className="text-xs text-emerald-600 font-medium">✓ All folders complete</p>
                        : <ul className="space-y-1.5 mb-3 max-h-48 overflow-y-auto">
                            {missingDocs.map(s => (
                              <li key={s.student_id} className="flex items-center justify-between text-xs">
                                <span className="text-gray-700">{s.student_name} (Gr. {s.grade})</span>
                                <span className="font-mono text-red-500 font-semibold">
                                  {Math.round(s.iep_readiness_pct ?? s.plan_504_readiness_pct ?? 0)}%
                                </span>
                              </li>
                            ))}
                          </ul>
                    }
                    <button
                      onClick={e => { e.stopPropagation(); toast.success('Notifications sent to case managers') }}
                      className="w-full py-2 rounded-lg text-xs font-bold bg-purple-600 text-white hover:bg-purple-700 transition-colors"
                    >
                      Notify Case Managers
                    </button>
                  </div>
                )}
              </Card>
            ))
        }
        {!campusLoading && (campuses ?? []).length === 0 && (
          <div className="col-span-3 text-sm text-gray-400 text-center py-8">
            No SPED students found. Import data via Data Integration.
          </div>
        )}
      </div>
    </div>
  )
}
