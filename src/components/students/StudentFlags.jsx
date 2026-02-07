import Badge from '../ui/Badge'
import { getStudentFlags } from '../../lib/utils'
import { SPED_ELIGIBILITY_CODES } from '../../lib/constants'

export default function StudentFlags({ student, size = 'md' }) {
  const flags = getStudentFlags(student)

  if (flags.length === 0) return null

  return (
    <div className="flex flex-wrap gap-1">
      {flags.map((flag) => (
        <Badge key={flag.key} color={flag.color} size={size}>
          {flag.label}
          {flag.detail && ` (${SPED_ELIGIBILITY_CODES[flag.detail] || flag.detail})`}
        </Badge>
      ))}
    </div>
  )
}

export function StudentFlagsSummary({ student }) {
  const flags = getStudentFlags(student)
  if (flags.length === 0) return <span className="text-gray-400 text-sm">None</span>

  return (
    <div className="flex flex-wrap gap-1">
      {flags.map((flag) => (
        <Badge key={flag.key} color={flag.color} size="sm">
          {flag.label}
        </Badge>
      ))}
    </div>
  )
}
