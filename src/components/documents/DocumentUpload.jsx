import { useState, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { DAEP_DOCUMENT_LABELS } from '../../lib/constants'

const ACCEPTED_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]
const MAX_SIZE = 10 * 1024 * 1024 // 10MB
const ACCEPT_STRING = '.pdf,.jpg,.jpeg,.png,.doc,.docx'

export default function DocumentUpload({
  documentType,
  label,
  required = false,
  existingDocument,
  onUploadComplete,
  onRemove,
  incidentId,
}) {
  const { districtId, user } = useAuth()
  const [dragActive, setDragActive] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState(null)
  const fileInputRef = useRef(null)

  const displayLabel = label || DAEP_DOCUMENT_LABELS[documentType] || documentType

  const validateFile = (file) => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      return 'Invalid file type. Please upload a PDF, JPG, PNG, or Word document.'
    }
    if (file.size > MAX_SIZE) {
      return 'File is too large. Maximum size is 10MB.'
    }
    return null
  }

  const uploadFile = async (file) => {
    const validationError = validateFile(file)
    if (validationError) {
      setError(validationError)
      return
    }

    setError(null)
    setUploading(true)

    try {
      const timestamp = Date.now()
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
      const storagePath = `${districtId}/incidents/${incidentId}/${documentType}_${timestamp}_${safeName}`

      const { error: uploadError } = await supabase.storage
        .from('daep-documents')
        .upload(storagePath, file)

      if (uploadError) throw uploadError

      const metadata = {
        type: documentType,
        filename: file.name,
        storage_path: storagePath,
        uploaded_at: new Date().toISOString(),
        uploaded_by: user.id,
        file_size: file.size,
        mime_type: file.type,
      }

      onUploadComplete?.(metadata)
    } catch (err) {
      console.error('Upload error:', err)
      setError('Failed to upload file. Please try again.')
    } finally {
      setUploading(false)
    }
  }

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
      uploadFile(e.dataTransfer.files[0])
    }
  }

  const handleFileChange = (e) => {
    if (e.target.files?.[0]) {
      uploadFile(e.target.files[0])
    }
  }

  const handleView = async () => {
    if (!existingDocument?.storage_path) return
    try {
      const { data, error } = await supabase.storage
        .from('daep-documents')
        .createSignedUrl(existingDocument.storage_path, 300)
      if (error) throw error
      window.open(data.signedUrl, '_blank')
    } catch (err) {
      console.error('Error creating signed URL:', err)
    }
  }

  const handleRemove = async () => {
    if (!existingDocument?.storage_path) return
    try {
      await supabase.storage
        .from('daep-documents')
        .remove([existingDocument.storage_path])
    } catch (err) {
      console.error('Error removing file:', err)
    }
    onRemove?.()
  }

  // Show uploaded state
  if (existingDocument) {
    return (
      <div className="border-2 border-green-200 bg-green-50 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <svg className="h-6 w-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="text-sm font-medium text-gray-900">{displayLabel}</p>
              <p className="text-xs text-gray-500">{existingDocument.filename}</p>
              <p className="text-xs text-gray-400">
                {(existingDocument.file_size / 1024).toFixed(1)} KB
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleView}
              className="text-xs text-orange-600 hover:text-orange-700 font-medium"
            >
              View
            </button>
            <button
              type="button"
              onClick={handleRemove}
              className="text-xs text-red-600 hover:text-red-700 font-medium"
            >
              Remove
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Show upload state
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {displayLabel} {required && <span className="text-red-500">*</span>}
      </label>
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => !uploading && fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
          uploading
            ? 'border-gray-300 bg-gray-50 cursor-wait'
            : dragActive
              ? 'border-orange-500 bg-orange-50'
              : 'border-gray-300 hover:border-gray-400'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPT_STRING}
          onChange={handleFileChange}
          className="hidden"
        />
        {uploading ? (
          <div>
            <svg className="mx-auto h-6 w-6 text-orange-500 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <p className="mt-2 text-sm text-gray-500">Uploading...</p>
          </div>
        ) : (
          <div>
            <svg className="mx-auto h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
            <p className="mt-1 text-sm text-gray-600">
              <span className="font-medium text-orange-600">Click to upload</span> or drag and drop
            </p>
            <p className="text-xs text-gray-500 mt-0.5">PDF, JPG, PNG, or Word (max 10MB)</p>
          </div>
        )}
      </div>
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  )
}
