import { useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { parseFile, autoDetectMapping, applyMapping, fetchValidationContext, processImport } from '../lib/importUtils'
import { validateAllRows } from '../lib/importValidators'
import { IMPORT_TEMPLATES } from '../lib/importTemplates'

const STEPS = ['upload', 'mapping', 'validation', 'confirm']

/**
 * Wizard state machine for data import
 */
export function useImportWizard() {
  const { profile, districtId } = useAuth()

  // Wizard state
  const [step, setStep] = useState(0)
  const [importType, setImportType] = useState('')
  const [duplicateStrategy, setDuplicateStrategy] = useState('skip')
  const [file, setFile] = useState(null)
  const [rawRows, setRawRows] = useState([])
  const [fileHeaders, setFileHeaders] = useState([])

  // Mapping state
  const [columnMapping, setColumnMapping] = useState({})

  // Validation state
  const [validationResults, setValidationResults] = useState(null)
  const [validating, setValidating] = useState(false)

  // Import state
  const [importing, setImporting] = useState(false)
  const [importProgress, setImportProgress] = useState({ processed: 0, total: 0 })
  const [importResult, setImportResult] = useState(null)

  const [error, setError] = useState(null)

  const currentStep = STEPS[step]

  // Step 1: Upload file
  const handleFileUpload = useCallback(async (selectedFile, selectedType, selectedStrategy) => {
    setError(null)
    setImportType(selectedType)
    setDuplicateStrategy(selectedStrategy)
    setFile(selectedFile)

    try {
      const rows = await parseFile(selectedFile)
      if (!rows.length) {
        setError('File contains no data rows')
        return
      }

      setRawRows(rows)
      const headers = Object.keys(rows[0])
      setFileHeaders(headers)

      // Auto-detect column mapping
      const template = IMPORT_TEMPLATES[selectedType]
      const mapping = autoDetectMapping(headers, template.headers)
      setColumnMapping(mapping)

      setStep(1) // Move to mapping step
    } catch (err) {
      setError(err.message)
    }
  }, [])

  // Step 2: Confirm mapping and validate
  const handleMappingConfirm = useCallback(async (finalMapping) => {
    setError(null)
    setColumnMapping(finalMapping)
    setValidating(true)

    try {
      // Apply mapping to raw rows
      const mappedRows = applyMapping(rawRows, finalMapping)

      // Fetch validation context
      const context = await fetchValidationContext(importType, districtId)

      // Validate all rows
      const results = validateAllRows(importType, mappedRows, context)
      setValidationResults(results)

      setStep(2) // Move to validation step
    } catch (err) {
      setError(err.message)
    } finally {
      setValidating(false)
    }
  }, [rawRows, importType, districtId])

  // Step 3: Confirm and start import
  const handleImportConfirm = useCallback(async () => {
    if (!validationResults?.valid.length) return

    setError(null)
    setImporting(true)
    setImportProgress({ processed: 0, total: validationResults.valid.length })

    // Create import history record
    const { data: historyRecord, error: historyError } = await supabase
      .from('import_history')
      .insert({
        district_id: districtId,
        imported_by: profile.id,
        import_type: importType,
        file_name: file?.name || 'unknown',
        status: 'processing',
        total_rows: rawRows.length,
        duplicate_strategy: duplicateStrategy,
        column_mapping: columnMapping,
      })
      .select()
      .single()

    if (historyError) {
      setError('Failed to create import record: ' + historyError.message)
      setImporting(false)
      return
    }

    try {
      const result = await processImport({
        importType,
        validRows: validationResults.valid,
        districtId,
        duplicateStrategy,
        onProgress: (processed, total) => {
          setImportProgress({ processed, total })
        },
      })

      // Log errors to import_errors table
      if (result.errors.length > 0) {
        const errorRecords = result.errors.map(e => ({
          import_history_id: historyRecord.id,
          row_number: e.rowNumber,
          error_type: e.error_type || 'validation',
          error_message: e.error_message || e.errors?.join('; ') || 'Unknown error',
          row_data: e.row_data || {},
        }))

        await supabase.from('import_errors').insert(errorRecords)
      }

      // Update import history
      const finalStatus = result.errorCount > 0
        ? (result.successCount > 0 ? 'partial' : 'failed')
        : 'completed'

      await supabase
        .from('import_history')
        .update({
          status: finalStatus,
          success_count: result.successCount,
          error_count: result.errorCount + (validationResults.errors?.length || 0),
          skipped_count: result.skippedCount,
          completed_at: new Date().toISOString(),
        })
        .eq('id', historyRecord.id)

      setImportResult({
        ...result,
        validationErrors: validationResults.errors?.length || 0,
        status: finalStatus,
      })
      setStep(3) // Move to complete step
    } catch (err) {
      await supabase
        .from('import_history')
        .update({ status: 'failed', completed_at: new Date().toISOString() })
        .eq('id', historyRecord.id)

      setError('Import failed: ' + err.message)
    } finally {
      setImporting(false)
    }
  }, [validationResults, districtId, profile, importType, file, rawRows, duplicateStrategy, columnMapping])

  // Reset wizard
  const reset = useCallback(() => {
    setStep(0)
    setImportType('')
    setDuplicateStrategy('skip')
    setFile(null)
    setRawRows([])
    setFileHeaders([])
    setColumnMapping({})
    setValidationResults(null)
    setImportResult(null)
    setError(null)
    setImporting(false)
    setImportProgress({ processed: 0, total: 0 })
  }, [])

  // Go back one step
  const goBack = useCallback(() => {
    if (step > 0) setStep(step - 1)
  }, [step])

  return {
    // State
    step,
    currentStep,
    steps: STEPS,
    importType,
    duplicateStrategy,
    file,
    rawRows,
    fileHeaders,
    columnMapping,
    validationResults,
    validating,
    importing,
    importProgress,
    importResult,
    error,

    // Actions
    handleFileUpload,
    handleMappingConfirm,
    handleImportConfirm,
    setColumnMapping,
    goBack,
    reset,
  }
}
