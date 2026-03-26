import { useState } from 'react'
import toast from 'react-hot-toast'
import { useOriginsScenarios } from '../../hooks/useOrigins'
import { Card, SectionHeader, SkillBadge, EmptyState, PATHWAYS } from './OriginsUI'

export default function OriginsSettingsPage() {
  const [activeTab, setActiveTab] = useState('pathways')
  const { data: scenarios, loading } = useOriginsScenarios()

  const tabs = [
    { key: 'pathways',  label: 'Pathway Settings' },
    { key: 'scenarios', label: 'Scenario Library' },
  ]

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Origins Settings</h1>
        <p className="text-sm text-gray-500 mt-1">Program configuration — pathways and scenario library management</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-0 border-b border-gray-200">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              activeTab === t.key
                ? 'border-teal-600 text-teal-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'pathways' && <PathwaySettings />}
      {activeTab === 'scenarios' && <ScenarioLibrarySettings scenarios={scenarios} loading={loading} />}
    </div>
  )
}

function PathwaySettings() {
  return (
    <div className="space-y-4">
      <Card>
        <SectionHeader title="Active Pathways" />
        <div className="divide-y divide-gray-100">
          {PATHWAYS.map(p => (
            <div key={p.key} className="flex items-center justify-between px-5 py-4">
              <div className="flex items-center gap-3">
                <SkillBadge pathway={p.key} />
                <span className="text-sm text-gray-700">{p.label}</span>
              </div>
              {/* Toggle */}
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" defaultChecked className="sr-only peer" />
                <div className="w-9 h-5 bg-gray-200 peer-focus:ring-2 peer-focus:ring-teal-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-teal-600" />
              </label>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-5">
        <h3 className="text-sm font-semibold text-gray-800 mb-1">Grade Band Configuration</h3>
        <p className="text-xs text-gray-400 mb-4">Configure which grade bands are active for your district.</p>
        <div className="flex gap-3">
          {['Middle School', 'High School'].map(band => (
            <label key={band} className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" defaultChecked className="rounded text-teal-600 focus:ring-teal-500" />
              <span className="text-sm text-gray-700">{band}</span>
            </label>
          ))}
        </div>
      </Card>
    </div>
  )
}

function ScenarioLibrarySettings({ scenarios, loading }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600">
          Manage district-specific scenarios. Global (Waypoint-provided) scenarios cannot be edited here.
        </p>
        <button
          onClick={() => toast('Custom scenario creation coming soon', { icon: '\uD83D\uDD1C' })}
          className="px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 transition-colors"
        >
          + Add Scenario
        </button>
      </div>

      <Card>
        <SectionHeader title="Scenario Library" />
        {loading ? (
          <div className="divide-y divide-gray-100">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-3.5 animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-48" />
                <div className="h-4 bg-gray-100 rounded w-32" />
                <div className="h-4 bg-gray-100 rounded w-16 ml-auto" />
              </div>
            ))}
          </div>
        ) : !scenarios?.length ? (
          <EmptyState title="No scenarios" description="Add your first district scenario or use global scenarios from Waypoint." />
        ) : (
          <div className="divide-y divide-gray-100">
            {scenarios.map(s => (
              <div key={s.id} className="flex items-center gap-4 px-5 py-3.5">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{s.title}</p>
                  <p className="text-xs text-gray-400">
                    {s.district_id ? 'District scenario' : 'Global scenario (read-only)'}
                  </p>
                </div>
                <SkillBadge pathway={s.skill_pathway} />
                <span className={`text-xs font-mono ${s.is_active ? 'text-teal-600' : 'text-gray-400'}`}>
                  {s.is_active ? 'Active' : 'Inactive'}
                </span>
                {s.district_id && (
                  <button className="text-xs text-gray-400 hover:text-gray-600">Edit</button>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
