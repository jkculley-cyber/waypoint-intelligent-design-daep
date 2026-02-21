import { useState } from 'react'
import Topbar from '../components/layout/Topbar'
import Card from '../components/ui/Card'
import ImportWizard from '../components/import/ImportWizard'
import ImportHistoryTable from '../components/import/ImportHistoryTable'
import LaserficheImportPanel from '../components/import/LaserficheImportPanel'
import { useAuth } from '../contexts/AuthContext'
import { getImportableTypes, getImportTier } from '../lib/importPermissions'
import { ROLES } from '../lib/constants'

export default function ImportDataPage() {
  const [activeTab, setActiveTab] = useState('import')
  const { profile } = useAuth()

  const tier = getImportTier(profile?.district?.settings)
  const allowedTypes = getImportableTypes({ role: profile?.role, tier })
  const isAdmin = profile?.role === ROLES.ADMIN

  const tabs = [
    { id: 'import', label: 'New Import' },
    { id: 'laserfiche', label: 'Laserfiche Sync', adminOnly: true },
    { id: 'history', label: 'Import History' },
  ]

  return (
    <div>
      <Topbar
        title="Data Import"
        subtitle="Bulk upload data via CSV or Excel files"
      />

      <div className="p-6">
        {/* Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex gap-6">
            {tabs.filter(tab => !tab.adminOnly || isAdmin).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-3 px-1 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-orange-500 text-orange-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'import' && (
          <Card>
            {allowedTypes.length > 0 ? (
              <ImportWizard allowedTypes={allowedTypes} />
            ) : (
              <div className="text-center py-12">
                <svg className="mx-auto h-12 w-12 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                </svg>
                <p className="mt-2 text-sm text-gray-500">
                  You don't have permission to import data. Contact your administrator.
                </p>
              </div>
            )}
          </Card>
        )}

        {activeTab === 'laserfiche' && isAdmin && (
          <Card>
            <LaserficheImportPanel />
          </Card>
        )}

        {activeTab === 'history' && (
          <ImportHistoryTable />
        )}
      </div>
    </div>
  )
}
