import { cn, getColorClasses } from '../../lib/utils'

export default function Badge({ children, color = 'gray', dot = false, size = 'md', className }) {
  const colors = getColorClasses(color)
  const sizeClasses = {
    sm: 'px-1.5 py-0.5 text-xs',
    md: 'px-2.5 py-0.5 text-xs',
    lg: 'px-3 py-1 text-sm',
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 font-medium rounded-full',
        colors.bg,
        colors.text,
        sizeClasses[size],
        className
      )}
    >
      {dot && <span className={cn('w-1.5 h-1.5 rounded-full', colors.dot)} />}
      {children}
    </span>
  )
}

export function StatusBadge({ status, labels = {}, colors = {}, ...props }) {
  const label = labels[status] || status
  const color = colors[status] || 'gray'
  return (
    <Badge color={color} dot {...props}>
      {label}
    </Badge>
  )
}
