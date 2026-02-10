import { downloadTemplate } from '../../lib/importTemplates'

export default function TemplateDownloadButton({ importType, className = '' }) {
  if (!importType) return null

  return (
    <button
      type="button"
      onClick={() => downloadTemplate(importType)}
      className={`inline-flex items-center gap-1.5 text-sm text-orange-600 hover:text-orange-700 font-medium ${className}`}
    >
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
      </svg>
      Download Template
    </button>
  )
}
