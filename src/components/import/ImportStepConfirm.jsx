export default function ImportStepConfirm({
  importing,
  importProgress,
  importResult,
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
