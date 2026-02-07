import { useState } from 'react'
import toast from 'react-hot-toast'
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import {
  useAnalyticsSummary,
  useDisproportionalityData,
  useIncidentTrends,
  useRecidivismData,
  useInterventionEffectiveness,
  usePeimsExport,
} from '../hooks/useReports'
import Topbar from '../components/layout/Topbar'
import Card, { CardTitle } from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import { CONSEQUENCE_TYPE_LABELS, INTERVENTION_CATEGORY_LABELS } from '../lib/constants'
import { getSchoolYearLabel } from '../lib/utils'

const CHART_COLORS = ['#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316']
const CONSEQUENCE_COLORS = {
  warning: '#9ca3af', detention: '#f59e0b', iss: '#f97316',
  oss: '#ef4444', daep: '#dc2626', expulsion: '#7f1d1d', unassigned: '#d1d5db',
}

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState('overview')

  const tabs = [
    { key: 'overview', label: 'Overview' },
    { key: 'disproportionality', label: 'Disproportionality' },
    { key: 'recidivism', label: 'Recidivism' },
    { key: 'interventions', label: 'Interventions' },
    { key: 'export', label: 'PEIMS Export' },
  ]

  return (
    <div>
      <Topbar
        title="Reports & Analytics"
        subtitle={`${getSchoolYearLabel()} School Year`}
      />

      <div className="p-6">
        {/* Tab Navigation */}
        <div className="flex border-b border-gray-200 mb-6">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
                activeTab === tab.key
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && <OverviewTab />}
        {activeTab === 'disproportionality' && <DisproportionalityTab />}
        {activeTab === 'recidivism' && <RecidivismTab />}
        {activeTab === 'interventions' && <InterventionsTab />}
        {activeTab === 'export' && <ExportTab />}
      </div>
    </div>
  )
}

// =================== OVERVIEW TAB ===================

function OverviewTab() {
  const { stats, loading: statsLoading } = useAnalyticsSummary()
  const { trends, loading: trendsLoading } = useIncidentTrends()

  if (statsLoading) {
    return <div className="flex justify-center py-12"><LoadingSpinner size="lg" /></div>
  }

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        <SummaryCard label="Total Incidents" value={stats?.totalIncidents} color="blue" />
        <SummaryCard label="Active" value={stats?.activeIncidents} color="indigo" />
        <SummaryCard label="DAEP Placements" value={stats?.daepPlacements} color="red" />
        <SummaryCard label="Compliance Holds" value={stats?.complianceHolds} color="yellow" />
        <SummaryCard label="Active Alerts" value={stats?.activeAlerts} color="orange" />
        <SummaryCard label="Active Plans" value={stats?.activePlans} color="green" />
        <SummaryCard label="Students w/ Incidents" value={stats?.uniqueStudents} color="purple" />
      </div>

      {/* Incident Trends Chart */}
      <Card>
        <CardTitle>Incidents Over Time</CardTitle>
        {trendsLoading ? (
          <div className="flex justify-center py-8"><LoadingSpinner /></div>
        ) : trends.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">No incident data available for trend analysis.</p>
        ) : (
          <div className="mt-4" style={{ height: 320 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trends} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <defs>
                  <linearGradient id="totalGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#9ca3af' }} />
                <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} />
                <Tooltip contentStyle={{ fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Area type="monotone" dataKey="total" name="Total" stroke="#3b82f6" fill="url(#totalGrad)" strokeWidth={2} />
                <Line type="monotone" dataKey="iss" name="ISS" stroke="#f97316" strokeWidth={1.5} dot={false} />
                <Line type="monotone" dataKey="oss" name="OSS" stroke="#ef4444" strokeWidth={1.5} dot={false} />
                <Line type="monotone" dataKey="daep" name="DAEP" stroke="#dc2626" strokeWidth={1.5} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>

      {/* Consequence Distribution */}
      {trends.length > 0 && (
        <Card>
          <CardTitle>Consequence Distribution (Year-to-Date)</CardTitle>
          <div className="mt-4" style={{ height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={trends}
                margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#9ca3af' }} />
                <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} />
                <Tooltip contentStyle={{ fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="iss" name="ISS" fill="#f97316" stackId="a" />
                <Bar dataKey="oss" name="OSS" fill="#ef4444" stackId="a" />
                <Bar dataKey="daep" name="DAEP" fill="#dc2626" stackId="a" />
                <Bar dataKey="other" name="Other" fill="#9ca3af" stackId="a" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}
    </div>
  )
}

// =================== DISPROPORTIONALITY TAB ===================

function DisproportionalityTab() {
  const { data, loading } = useDisproportionalityData()

  if (loading) {
    return <div className="flex justify-center py-12"><LoadingSpinner size="lg" /></div>
  }

  if (!data || data.totalIncidents === 0) {
    return (
      <Card>
        <p className="text-sm text-gray-400 text-center py-8">
          No incident data available for disproportionality analysis.
        </p>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Alert for significant disproportionality */}
      {data.bySped?.some((d) => d.riskRatio > 2.0) && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <svg className="h-5 w-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <h3 className="text-sm font-semibold text-red-800">Significant Disproportionality Detected</h3>
          </div>
          <p className="text-sm text-red-700 mt-1">
            One or more student groups show a risk ratio above 2.0, which may indicate significant
            disproportionality. Review the data below and consider intervention strategies.
          </p>
        </div>
      )}

      {/* Race/Ethnicity */}
      <DisproportionalityChart
        title="By Race/Ethnicity"
        data={data.byRace}
        description="Compares discipline incident rates with student population proportions by race."
      />

      {/* SPED Status */}
      <DisproportionalityChart
        title="By SPED / 504 Status"
        data={data.bySped}
        description="Compares discipline rates between SPED, 504, and general education students."
      />

      {/* Gender */}
      <DisproportionalityChart
        title="By Gender"
        data={data.byGender}
        description="Compares discipline incident rates by student gender."
      />

      {/* ELL Status */}
      <DisproportionalityChart
        title="By ELL Status"
        data={data.byEll}
        description="Compares discipline rates between English Language Learners and non-ELL students."
      />
    </div>
  )
}

function DisproportionalityChart({ title, data, description }) {
  if (!data?.length) return null

  return (
    <Card>
      <CardTitle>{title}</CardTitle>
      {description && <p className="text-xs text-gray-500 mt-1">{description}</p>}

      <div className="mt-4" style={{ height: 260 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis type="number" tick={{ fontSize: 11, fill: '#9ca3af' }} unit="%" />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#6b7280' }} width={100} />
            <Tooltip
              contentStyle={{ fontSize: 12 }}
              formatter={(value, name) => [`${value}%`, name]}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="populationPct" name="% of Student Population" fill="#93c5fd" />
            <Bar dataKey="incidentPct" name="% of Incidents" fill="#ef4444" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Risk Ratio Table */}
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-gray-500 uppercase border-b border-gray-100">
              <th className="px-3 py-2">Group</th>
              <th className="px-3 py-2">Incidents</th>
              <th className="px-3 py-2">Population</th>
              <th className="px-3 py-2">Incident %</th>
              <th className="px-3 py-2">Population %</th>
              <th className="px-3 py-2">Risk Ratio</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {data.map((row) => (
              <tr key={row.name}>
                <td className="px-3 py-2 font-medium text-gray-900">{row.name}</td>
                <td className="px-3 py-2 text-gray-600">{row.incidents}</td>
                <td className="px-3 py-2 text-gray-600">{row.population}</td>
                <td className="px-3 py-2 text-gray-600">{row.incidentPct}%</td>
                <td className="px-3 py-2 text-gray-600">{row.populationPct}%</td>
                <td className="px-3 py-2">
                  <Badge
                    color={row.riskRatio > 2.0 ? 'red' : row.riskRatio > 1.5 ? 'yellow' : 'green'}
                    size="sm"
                  >
                    {row.riskRatio.toFixed(2)}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

// =================== RECIDIVISM TAB ===================

function RecidivismTab() {
  const { data, loading } = useRecidivismData()

  if (loading) {
    return <div className="flex justify-center py-12"><LoadingSpinner size="lg" /></div>
  }

  if (!data) {
    return (
      <Card>
        <p className="text-sm text-gray-400 text-center py-8">
          No data available for recidivism analysis.
        </p>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          label="DAEP Recidivism Rate"
          value={`${data.daepRate}%`}
          sublabel={`${data.daepRepeatStudents} of ${data.daepUniqueStudents} students`}
          color={data.daepRate > 30 ? 'red' : data.daepRate > 15 ? 'yellow' : 'green'}
        />
        <MetricCard
          label="Overall Repeat Rate"
          value={`${data.overallRepeatRate}%`}
          sublabel={`${data.repeatOffenders} repeat offenders`}
          color={data.overallRepeatRate > 40 ? 'red' : data.overallRepeatRate > 25 ? 'yellow' : 'green'}
        />
        <MetricCard
          label="Total DAEP Placements"
          value={data.totalDaepPlacements}
          sublabel="This school year"
          color="blue"
        />
        <MetricCard
          label="Unique Students"
          value={data.totalUniqueStudents}
          sublabel="With incidents this year"
          color="purple"
        />
      </div>

      {/* Distribution Chart */}
      {data.distribution?.length > 0 && (
        <Card>
          <CardTitle>Incident Frequency Distribution</CardTitle>
          <p className="text-xs text-gray-500 mt-1">
            How many incidents per student this school year
          </p>
          <div className="mt-4" style={{ height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.distribution} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#9ca3af' }} />
                <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} label={{ value: 'Students', angle: -90, position: 'insideLeft', style: { fontSize: 11, fill: '#9ca3af' } }} />
                <Tooltip contentStyle={{ fontSize: 12 }} />
                <Bar dataKey="count" name="Students" fill="#3b82f6" radius={[4, 4, 0, 0]}>
                  {data.distribution.map((_, index) => (
                    <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      {/* Benchmark */}
      <Card>
        <CardTitle>Recidivism Benchmarks</CardTitle>
        <div className="mt-4 space-y-3">
          <BenchmarkRow
            label="DAEP Recidivism Rate"
            value={data.daepRate}
            benchmark={30}
            unit="%"
            description="National average for DAEP recidivism is 30-50%. Below 30% indicates effective transition planning."
          />
          <BenchmarkRow
            label="Overall Repeat Discipline Rate"
            value={data.overallRepeatRate}
            benchmark={25}
            unit="%"
            description="Below 25% suggests effective early intervention and support systems."
          />
        </div>
      </Card>
    </div>
  )
}

// =================== INTERVENTIONS TAB ===================

function InterventionsTab() {
  const { data, loading } = useInterventionEffectiveness()

  if (loading) {
    return <div className="flex justify-center py-12"><LoadingSpinner size="lg" /></div>
  }

  if (!data.length) {
    return (
      <Card>
        <p className="text-sm text-gray-400 text-center py-8">
          No intervention data available. Assign interventions through transition plans to begin tracking effectiveness.
        </p>
      </Card>
    )
  }

  const TIER_COLORS_MAP = { 1: 'green', 2: 'yellow', 3: 'red' }

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <SummaryCard label="Total Assignments" value={data.reduce((s, d) => s + d.total, 0)} color="blue" />
        <SummaryCard label="Currently Active" value={data.reduce((s, d) => s + d.active, 0)} color="green" />
        <SummaryCard label="Completed" value={data.reduce((s, d) => s + d.completed, 0)} color="indigo" />
        <SummaryCard
          label="Avg Effectiveness"
          value={`${Math.round(data.filter(d => d.effectivenessRate !== null).reduce((s, d) => s + (d.effectivenessRate || 0), 0) / Math.max(1, data.filter(d => d.effectivenessRate !== null).length))}%`}
          color="purple"
        />
      </div>

      {/* Effectiveness Bar Chart */}
      <Card>
        <CardTitle>Intervention Usage</CardTitle>
        <div className="mt-4" style={{ height: Math.max(300, data.length * 40) }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.slice(0, 15)} margin={{ top: 5, right: 10, left: 0, bottom: 5 }} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis type="number" tick={{ fontSize: 11, fill: '#9ca3af' }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: '#6b7280' }} width={160} />
              <Tooltip contentStyle={{ fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="active" name="Active" fill="#22c55e" stackId="a" />
              <Bar dataKey="completed" name="Completed" fill="#3b82f6" stackId="a" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Detail Table */}
      <Card>
        <CardTitle>Intervention Effectiveness Detail</CardTitle>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-500 uppercase border-b border-gray-100">
                <th className="px-3 py-2">Intervention</th>
                <th className="px-3 py-2">Tier</th>
                <th className="px-3 py-2">Category</th>
                <th className="px-3 py-2">Total</th>
                <th className="px-3 py-2">Active</th>
                <th className="px-3 py-2">Effective</th>
                <th className="px-3 py-2">Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {data.map((row) => (
                <tr key={row.name}>
                  <td className="px-3 py-2 font-medium text-gray-900">{row.name}</td>
                  <td className="px-3 py-2">
                    <Badge color={TIER_COLORS_MAP[row.tier] || 'gray'} size="sm">
                      Tier {row.tier}
                    </Badge>
                  </td>
                  <td className="px-3 py-2 text-gray-600">
                    {INTERVENTION_CATEGORY_LABELS[row.category] || row.category}
                  </td>
                  <td className="px-3 py-2 text-gray-600">{row.total}</td>
                  <td className="px-3 py-2 text-gray-600">{row.active}</td>
                  <td className="px-3 py-2 text-gray-600">{row.effective}</td>
                  <td className="px-3 py-2">
                    {row.effectivenessRate !== null ? (
                      <Badge
                        color={row.effectivenessRate >= 70 ? 'green' : row.effectivenessRate >= 40 ? 'yellow' : 'red'}
                        size="sm"
                      >
                        {row.effectivenessRate}%
                      </Badge>
                    ) : (
                      <span className="text-gray-400 text-xs">N/A</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}

// =================== PEIMS EXPORT TAB ===================

function ExportTab() {
  const { generateExport } = usePeimsExport()
  const [exporting, setExporting] = useState(false)
  const [exportResult, setExportResult] = useState(null)

  const handleExport = async () => {
    setExporting(true)
    try {
      const result = await generateExport()
      if (!result) {
        toast.error('No data available for export')
        setExporting(false)
        return
      }
      setExportResult(result)

      // Trigger download
      const blob = new Blob([result.csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = result.filename
      link.click()
      URL.revokeObjectURL(url)

      toast.success(`Exported ${result.recordCount} records`)
    } catch (err) {
      toast.error('Export failed')
      console.error(err)
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardTitle>PEIMS Discipline Data Export</CardTitle>
        <p className="text-sm text-gray-500 mt-2">
          Generate a CSV file matching the TEA PEIMS discipline data format. This export includes
          all approved, active, and completed incidents for the current school year.
        </p>

        <div className="mt-6 space-y-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Export Includes:</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li className="flex items-center gap-2">
                <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Student ID, name, grade level, demographics
              </li>
              <li className="flex items-center gap-2">
                <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Incident date, time, location
              </li>
              <li className="flex items-center gap-2">
                <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Offense code, TEC reference, severity
              </li>
              <li className="flex items-center gap-2">
                <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Consequence type, duration, start/end dates
              </li>
              <li className="flex items-center gap-2">
                <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                SPED, 504, ELL flags
              </li>
              <li className="flex items-center gap-2">
                <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                PEIMS action codes, mandatory placement flags
              </li>
            </ul>
          </div>

          <div className="bg-blue-50 rounded-lg p-4">
            <h4 className="text-sm font-medium text-blue-800 mb-1">Data Period</h4>
            <p className="text-sm text-blue-700">
              {getSchoolYearLabel()} School Year — All approved, active, and completed incidents
            </p>
          </div>

          <Button
            size="lg"
            onClick={handleExport}
            loading={exporting}
            className="w-full sm:w-auto"
          >
            <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            Generate & Download PEIMS Export
          </Button>

          {exportResult && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-sm text-green-800">
                Successfully exported <strong>{exportResult.recordCount}</strong> records to{' '}
                <code className="text-xs bg-green-100 px-1 py-0.5 rounded">{exportResult.filename}</code>
              </p>
            </div>
          )}
        </div>
      </Card>

      {/* Format Reference */}
      <Card>
        <CardTitle>PEIMS Format Reference</CardTitle>
        <p className="text-sm text-gray-500 mt-2 mb-4">
          The exported CSV follows TEA PEIMS discipline data standards. Column mapping:
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-gray-500 uppercase border-b border-gray-100">
                <th className="px-2 py-1.5">Column</th>
                <th className="px-2 py-1.5">Description</th>
                <th className="px-2 py-1.5">Source</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 text-gray-600">
              {[
                ['STUDENT-ID', 'Local student ID number', 'students.student_id_number'],
                ['OFFENSE-CODE', 'District offense code', 'offense_codes.code'],
                ['TEC-REFERENCE', 'Texas Education Code section', 'offense_codes.tec_reference'],
                ['CONSEQUENCE-TYPE', 'Type of discipline action', 'incidents.consequence_type'],
                ['PEIMS-ACTION-CODE', 'TEA PEIMS action code', 'incidents.peims_action_code'],
                ['SPED', 'Special education flag (Y/N)', 'students.is_sped'],
                ['MANDATORY-DAEP', 'Mandatory placement flag', 'offense_codes.is_mandatory_daep'],
              ].map(([col, desc, source]) => (
                <tr key={col}>
                  <td className="px-2 py-1.5 font-mono font-medium text-gray-900">{col}</td>
                  <td className="px-2 py-1.5">{desc}</td>
                  <td className="px-2 py-1.5 font-mono text-gray-400">{source}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}

// =================== SHARED COMPONENTS ===================

function SummaryCard({ label, value, color }) {
  const textColors = {
    blue: 'text-blue-600', red: 'text-red-600', green: 'text-green-600',
    yellow: 'text-yellow-600', orange: 'text-orange-600', purple: 'text-purple-600',
    indigo: 'text-indigo-600',
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg px-4 py-3">
      <p className="text-xs text-gray-500 truncate">{label}</p>
      <p className={`text-2xl font-bold mt-0.5 ${textColors[color] || 'text-gray-900'}`}>
        {value ?? '--'}
      </p>
    </div>
  )
}

function MetricCard({ label, value, sublabel, color }) {
  const bgColors = {
    red: 'bg-red-50 border-red-200',
    yellow: 'bg-yellow-50 border-yellow-200',
    green: 'bg-green-50 border-green-200',
    blue: 'bg-blue-50 border-blue-200',
    purple: 'bg-purple-50 border-purple-200',
  }
  const textColors = {
    red: 'text-red-700', yellow: 'text-yellow-700', green: 'text-green-700',
    blue: 'text-blue-700', purple: 'text-purple-700',
  }

  return (
    <div className={`rounded-lg border px-4 py-3 ${bgColors[color] || 'bg-gray-50 border-gray-200'}`}>
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`text-2xl font-bold mt-0.5 ${textColors[color] || 'text-gray-900'}`}>{value}</p>
      {sublabel && <p className="text-xs text-gray-500 mt-0.5">{sublabel}</p>}
    </div>
  )
}

function BenchmarkRow({ label, value, benchmark, unit, description }) {
  const pct = Math.min((value / (benchmark * 2)) * 100, 100)
  const isGood = value <= benchmark

  return (
    <div className="p-3 bg-gray-50 rounded-lg">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-700">{label}</span>
        <span className={`text-lg font-bold ${isGood ? 'text-green-600' : 'text-red-600'}`}>
          {value}{unit}
        </span>
      </div>
      <div className="relative w-full bg-gray-200 rounded-full h-2.5">
        <div
          className={`h-full rounded-full ${isGood ? 'bg-green-500' : 'bg-red-500'}`}
          style={{ width: `${pct}%` }}
        />
        {/* Benchmark marker */}
        <div
          className="absolute top-0 w-0.5 h-full bg-gray-600"
          style={{ left: `${Math.min((benchmark / (benchmark * 2)) * 100, 100)}%` }}
        />
      </div>
      <div className="flex items-center justify-between mt-1">
        <p className="text-xs text-gray-500">{description}</p>
        <span className="text-xs text-gray-400 whitespace-nowrap ml-2">Benchmark: {benchmark}{unit}</span>
      </div>
    </div>
  )
}
