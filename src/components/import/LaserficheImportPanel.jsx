import { useState, useRef, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { parseLaserficheFile, processLaserficheImport } from '../../lib/laserficheImport'
import { format } from 'date-fns'

const PREVIEW_COLS = ['Instance ID', 'First_Name', 'Last_Name', 'Campus', 'Status', 'Current step', 'Date_of_Violation']
const EXPECTED_COLS = ['Instance ID', 'First_Name', 'Last_Name', 'Status', 'Current step']

export default function LaserficheImportPanel() {
  const { profile, districtId } = useAuth()
  const fileRef = useRef(null)

  const [file, setFile] = useState(null)
  const [rows, setRows] = useState([])
  const [parseError, setParseError] = useState(null)
  const [parsing, setParsing] = useState(false)

  const [importing, setImporting] = useState(false)
  const [progress, setProgress] = useState({ done: 0, total: 0 })
  const [result, setResult] = useState(null)

  // ── File handling ──────────────────────────────────────────────────────────

  const handleFileChange = useCallback(async (e) => {
    const f = e.target.files?.[0]
    if (!f) return
    setFile(f)
    setRows([])
    setParseError(null)
    setResult(null)
    setParsing(true)
    try {
      const parsed = await parseLaserficheFile(f)
      // Basic check — make sure key columns exist
      const headers = Object.keys(parsed[0] || {})
      const missing = EXPECTED_COLS.filter(c => !headers.includes(c))
      if (missing.length > 0) {
        setParseError(`File is missing expected columns: ${missing.join(', ')}. Make sure you're uploading the Laserfiche DAEP report.`)
        setParsing(false)
        return
      }
      setRows(parsed)
    } catch (err) {
      setParseError(err.message)
    } finally {
      setParsing(false)
    }
  }, [])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    const f = e.dataTransfer.files?.[0]
    if (f) {
      const fakeEvent = { target: { files: [f] } }
      handleFileChange(fakeEvent)
    }
  }, [handleFileChange])

  // ── Import ─────────────────────────────────────────────────────────────────

  async function handleImport() {
    if (!rows.length || importing) return
    setImporting(true)
    setProgress({ done: 0, total: rows.length })
    setResult(null)

    // Create history record
    const { data: historyRecord } = await supabase
      .from('import_history')
      .insert({
        district_id:       districtId,
        imported_by:       profile.id,
        import_type:       'laserfiche_daep',
        file_name:         file?.name || 'laserfiche_report.xlsx',
        status:            'processing',
        total_rows:        rows.length,
        duplicate_strategy: 'upsert',
        column_mapping:    {},
      })
      .select()
      .single()

    try {
      const res = await processLaserficheImport(rows, districtId, (done, total) => {
        setProgress({ done, total })
      })

      // Log errors
      if (res.errors.length > 0 && historyRecord) {
        const errRecords = res.errors.map(e => ({
          import_history_id: historyRecord.id,
          row_number:        e.rowNumber,
          error_type:        'import_error',
          error_message:     e.error_message,
          row_data:          e.row_data || {},
        }))
        await supabase.from('import_errors').insert(errRecords)
      }

      const finalStatus = res.errorCount > 0
        ? (res.successCount > 0 ? 'partial' : 'failed')
        : 'completed'

      if (historyRecord) {
        await supabase.from('import_history').update({
          status:        finalStatus,
          success_count: res.successCount,
          error_count:   res.errorCount,
          skipped_count: res.skippedCount,
          completed_at:  new Date().toISOString(),
        }).eq('id', historyRecord.id)
      }

      setResult({ ...res, status: finalStatus })
    } catch (err) {
      if (historyRecord) {
        await supabase.from('import_history')
          .update({ status: 'failed', completed_at: new Date().toISOString() })
          .eq('id', historyRecord.id)
      }
      setResult({ successCount: 0, errorCount: rows.length, skippedCount: 0, errors: [{ error_message: err.message }], status: 'failed' })
    } finally {
      setImporting(false)
    }
  }

  function reset() {
    setFile(null)
    setRows([])
    setParseError(null)
    setResult(null)
    setImporting(false)
    setProgress({ done: 0, total: 0 })
    if (fileRef.current) fileRef.current.value = ''
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  if (result) {
    return <ImportResult result={result} onReset={reset} />
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <svg className="w-5 h-5 text-blue-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div className="text-sm text-blue-700">
          <p className="font-medium mb-1">Laserfiche DAEP Report Import</p>
          <p>Upload your daily Laserfiche Excel report. Students and incidents will be created if they don't exist, and existing records will be updated to match the current approval step and status.</p>
        </div>
      </div>

      {/* Drop zone */}
      {!file ? (
        <div
          onDrop={handleDrop}
          onDragOver={e => e.preventDefault()}
          onClick={() => fileRef.current?.click()}
          className="border-2 border-dashed border-gray-300 rounded-xl p-12 text-center cursor-pointer hover:border-orange-400 hover:bg-orange-50 transition-colors"
        >
          <svg className="mx-auto h-12 w-12 text-gray-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-sm font-medium text-gray-700">Drop Laserfiche report here or click to browse</p>
          <p className="text-xs text-gray-400 mt-1">Excel files only (.xlsx, .xls)</p>
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
      ) : (
        <div className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
          <svg className="w-8 h-8 text-green-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
            <p className="text-xs text-gray-500">{parsing ? 'Parsing…' : `${rows.length} rows found`}</p>
          </div>
          <button onClick={reset} className="text-xs text-gray-400 hover:text-gray-600">Change file</button>
        </div>
      )}

      {/* Parse error */}
      {parseError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          <span className="font-medium">File error: </span>{parseError}
        </div>
      )}

      {/* Preview table */}
      {rows.length > 0 && !importing && (
        <>
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-2">
              Preview — {rows.length} record{rows.length !== 1 ? 's' : ''}
              <span className="ml-2 text-xs text-gray-400 font-normal">showing first 5</span>
            </h3>
            <div className="overflow-x-auto border border-gray-200 rounded-lg">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    {PREVIEW_COLS.map(col => (
                      <th key={col} className="px-3 py-2 text-left font-medium text-gray-500 whitespace-nowrap">{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {rows.slice(0, 5).map((row, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      {PREVIEW_COLS.map(col => (
                        <td key={col} className="px-3 py-2 text-gray-700 whitespace-nowrap max-w-xs truncate">
                          {String(row[col] instanceof Date ? row[col].toLocaleDateString() : (row[col] || '—'))}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Status mapping legend */}
          <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
            <p className="text-xs font-medium text-gray-600 mb-2">Status mapping</p>
            <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-xs text-gray-500">
              <span>In progress + Current step = DAEP → <strong className="text-green-700">Active</strong></span>
              <span>Completed → <strong className="text-blue-700">Completed</strong></span>
              <span>In progress + Back to CBC → <strong className="text-orange-700">Returned</strong></span>
              <span>Completed via terminate → <strong className="text-gray-700">Overturned</strong></span>
              <span>In progress (no step) → <strong className="text-yellow-700">Under Review</strong></span>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleImport}
              className="flex-1 px-5 py-3 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-lg transition-colors"
            >
              Import {rows.length} Records
            </button>
            <button
              onClick={reset}
              className="px-5 py-3 border border-gray-300 text-sm text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </>
      )}

      {/* Progress */}
      {importing && (
        <div className="space-y-3">
          <div className="flex justify-between text-sm text-gray-600">
            <span>Processing…</span>
            <span>{progress.done} / {progress.total}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-orange-500 h-2 rounded-full transition-all"
              style={{ width: progress.total ? `${(progress.done / progress.total) * 100}%` : '0%' }}
            />
          </div>
          <div className="flex justify-end">
            <button
              onClick={reset}
              className="px-4 py-1.5 text-sm text-gray-500 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function ImportResult({ result, onReset }) {
  const { successCount, errorCount, skippedCount, errors, status } = result

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className={`p-4 rounded-lg border ${
        status === 'completed' ? 'bg-green-50 border-green-200' :
        status === 'partial'   ? 'bg-yellow-50 border-yellow-200' :
                                 'bg-red-50 border-red-200'
      }`}>
        <div className="flex items-center gap-2 mb-3">
          {status === 'completed' ? (
            <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="w-5 h-5 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
          )}
          <span className="font-medium text-gray-900">
            {status === 'completed' ? 'Import Complete' : status === 'partial' ? 'Import Completed with Errors' : 'Import Failed'}
          </span>
        </div>
        <div className="flex gap-6 text-sm">
          <div><span className="text-gray-500">Processed: </span><span className="font-medium text-green-700">{successCount}</span></div>
          {errorCount > 0 && <div><span className="text-gray-500">Errors: </span><span className="font-medium text-red-700">{errorCount}</span></div>}
          {skippedCount > 0 && <div><span className="text-gray-500">Skipped: </span><span className="font-medium text-gray-700">{skippedCount}</span></div>}
        </div>
      </div>

      {/* Error details */}
      {errors?.length > 0 && (
        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">Errors ({errors.length})</p>
          <div className="border border-red-200 rounded-lg divide-y divide-red-100 max-h-48 overflow-y-auto">
            {errors.map((e, i) => (
              <div key={i} className="px-3 py-2 text-xs">
                {e.rowNumber && <span className="text-gray-400 mr-2">Row {e.rowNumber}</span>}
                <span className="text-red-700">{e.error_message}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <button
        onClick={onReset}
        className="px-4 py-2 border border-gray-300 text-sm text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
      >
        Import Another File
      </button>
    </div>
  )
}
