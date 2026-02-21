import { useState, useRef } from 'react'
import { IMPORT_TYPES, DUPLICATE_STRATEGIES } from '../../lib/constants'
import TemplateDownloadButton from './TemplateDownloadButton'

export default function ImportStepUpload({ onNext, onCancel, allowedTypes }) {
  const [importType, setImportType] = useState('')
  const [duplicateStrategy, setDuplicateStrategy] = useState('skip')
  const [file, setFile] = useState(null)
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef(null)

  const availableTypes = IMPORT_TYPES.filter(t => !allowedTypes || allowedTypes.includes(t.value))

  const handleDrag = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (e.dataTransfer.files?.[0]) {
      setFile(e.dataTransfer.files[0])
    }
  }

  const handleFileChange = (e) => {
    if (e.target.files?.[0]) {
      setFile(e.target.files[0])
    }
  }

  const canProceed = importType && file

  return (
    <div className="space-y-6">
      {/* Import Type */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Data Type</label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {availableTypes.map((type) => (
            <button
              key={type.value}
              type="button"
              onClick={() => setImportType(type.value)}
              className={`p-3 rounded-lg border-2 text-left transition-colors ${
                importType === type.value
                  ? 'border-orange-500 bg-orange-50 text-orange-700'
                  : 'border-gray-200 hover:border-gray-300 text-gray-700'
              }`}
            >
              <div className="text-sm font-medium">{type.label}</div>
              <div className="text-xs text-gray-500 mt-0.5">{type.description}</div>
            </button>
          ))}
        </div>
      </div>

      {/* File Upload */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-gray-700">Upload File</label>
          {importType && <TemplateDownloadButton importType={importType} />}
        </div>
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
            dragActive
              ? 'border-orange-500 bg-orange-50'
              : file
                ? 'border-green-300 bg-green-50'
                : 'border-gray-300 hover:border-gray-400'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={handleFileChange}
            className="hidden"
          />
          {file ? (
            <div>
              <svg className="mx-auto h-8 w-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="mt-2 text-sm font-medium text-gray-900">{file.name}</p>
              <p className="text-xs text-gray-500">{(file.size / 1024).toFixed(1)} KB</p>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setFile(null) }}
                className="mt-2 text-xs text-red-600 hover:text-red-700"
              >
                Remove
              </button>
            </div>
          ) : (
            <div>
              <svg className="mx-auto h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
              </svg>
              <p className="mt-2 text-sm text-gray-600">
                <span className="font-medium text-orange-600">Click to upload</span> or drag and drop
              </p>
              <p className="text-xs text-gray-500 mt-1">CSV or Excel (.xlsx, .xls)</p>
            </div>
          )}
        </div>
      </div>

      {/* Duplicate Strategy */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Duplicate Handling</label>
        <div className="space-y-2">
          {DUPLICATE_STRATEGIES.map((strategy) => (
            <label
              key={strategy.value}
              className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                duplicateStrategy === strategy.value
                  ? 'border-orange-500 bg-orange-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <input
                type="radio"
                name="duplicateStrategy"
                value={strategy.value}
                checked={duplicateStrategy === strategy.value}
                onChange={() => setDuplicateStrategy(strategy.value)}
                className="mt-0.5 text-orange-500 focus:ring-orange-500"
              />
              <div>
                <div className="text-sm font-medium text-gray-900">{strategy.label}</div>
                <div className="text-xs text-gray-500">{strategy.description}</div>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Next Button */}
      <div className="flex justify-between items-center">
        {onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
        ) : <span />}
        <button
          type="button"
          disabled={!canProceed}
          onClick={() => onNext(file, importType, duplicateStrategy)}
          className="px-6 py-2.5 bg-orange-500 text-white text-sm font-medium rounded-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Next: Map Columns
        </button>
      </div>
    </div>
  )
}
