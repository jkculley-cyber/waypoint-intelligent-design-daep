import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'

export default function ImportStepConfirm({
  importing,
  importProgress,
  importResult,
  importType,
  error,
  onReset,
}) {
  const { processed, total } = importProgress
  const progressPct = total > 0 ? Math.round((processed / total) * 100) : 0

  if (importing) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 mx-auto mb-4">
          <svg className="animate-spin h-16 w-16 text-orange-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Importing Data...</h3>
        <p className="text-sm text-gray-500 mb-4">{processed} of {total} rows processed</p>

        {/* Progress Bar */}
        <div className="max-w-md mx-auto">
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className="bg-orange-500 h-3 rounded-full transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            ></div>
          </div>
          <p className="text-xs text-gray-400 mt-2">{progressPct}% complete</p>
        </div>
        <button
          type="button"
          onClick={onReset}
          className="mt-6 px-4 py-2 text-sm text-gray-500 border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          Cancel
        </button>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
          <svg className="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-red-900 mb-2">Import Failed</h3>
        <p className="text-sm text-red-600 mb-6">{error}</p>
        <button
          type="button"
          onClick={onReset}
          className="px-6 py-2.5 bg-orange-500 text-white text-sm font-medium rounded-lg hover:bg-orange-600"
        >
          Start New Import
        </button>
      </div>
    )
  }

  if (importResult) {
    const { successCount, errorCount, skippedCount, validationErrors, status } = importResult
    const isFullSuccess = status === 'completed'

    return (
      <div className="text-center py-12">
        <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4 ${
          isFullSuccess ? 'bg-green-100' : 'bg-yellow-100'
        }`}>
          {isFullSuccess ? (
            <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ) : (
            <svg className="h-8 w-8 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          )}
        </div>

        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          {isFullSuccess ? 'Import Complete!' : 'Import Completed with Issues'}
        </h3>

        <div className="grid grid-cols-3 gap-4 max-w-sm mx-auto mt-6">
          <div className="bg-green-50 rounded-lg p-3">
            <div className="text-xl font-bold text-green-900">{successCount}</div>
            <div className="text-xs text-green-700">Imported</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-xl font-bold text-gray-900">{skippedCount}</div>
            <div className="text-xs text-gray-700">Skipped</div>
          </div>
          <div className="bg-red-50 rounded-lg p-3">
            <div className="text-xl font-bold text-red-900">{errorCount + validationErrors}</div>
            <div className="text-xs text-red-700">Errors</div>
          </div>
        </div>

        {importType === 'profiles' && successCount > 0 && (
          <StaffInvitePanel successCount={successCount} />
        )}

        <button
          type="button"
          onClick={onReset}
          className="mt-8 px-6 py-2.5 bg-orange-500 text-white text-sm font-medium rounded-lg hover:bg-orange-600"
        >
          Start New Import
        </button>
      </div>
    )
  }

  return null
}

function StaffInvitePanel({ successCount }) {
  const { districtId } = useAuth()
  const [inviting, setInviting] = useState(false)
  const [result, setResult] = useState(null)

  async function handleInvite() {
    setInviting(true)
    setResult(null)
    try {
      const { data, error } = await supabase.functions.invoke('invite-staff', {
        body: { district_id: districtId },
      })
      if (error) throw error
      setResult({ ok: true, ...data })
    } catch (err) {
      setResult({ ok: false, message: err.message || 'Failed to send invitations' })
    } finally {
      setInviting(false)
    }
  }

  if (result?.ok) {
    return (
      <div className="mt-6 max-w-sm mx-auto bg-green-50 border border-green-200 rounded-lg p-4 text-left">
        <p className="text-sm font-medium text-green-900">Invitations sent</p>
        <p className="text-xs text-green-700 mt-1">
          {result.invited} new invitation{result.invited !== 1 ? 's' : ''} sent.
          {result.already_active > 0 && ` ${result.already_active} staff already had accounts.`}
        </p>
        {result.errors?.length > 0 && (
          <p className="text-xs text-yellow-700 mt-1">{result.errors.length} email(s) failed — check Import History.</p>
        )}
      </div>
    )
  }

  if (result && !result.ok) {
    return (
      <div className="mt-6 max-w-sm mx-auto bg-red-50 border border-red-200 rounded-lg p-4 text-left">
        <p className="text-sm font-medium text-red-900">Invitation failed</p>
        <p className="text-xs text-red-700 mt-1">{result.message}</p>
      </div>
    )
  }

  return (
    <div className="mt-6 max-w-sm mx-auto bg-blue-50 border border-blue-200 rounded-lg p-4 text-left">
      <p className="text-sm font-semibold text-blue-900 mb-1">Send Login Invitations</p>
      <p className="text-xs text-blue-700 mb-3">
        {successCount} staff profile{successCount !== 1 ? 's' : ''} imported. Send each person an email invitation so they can set their password and log in.
      </p>
      <button
        type="button"
        onClick={handleInvite}
        disabled={inviting}
        className="w-full px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
      >
        {inviting ? 'Sending invitations…' : 'Send Login Invitations'}
      </button>
    </div>
  )
}
