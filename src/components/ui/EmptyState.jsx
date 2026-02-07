import { cn } from '../../lib/utils'
import Button from './Button'

export default function EmptyState({
  icon: Icon,
  title,
  message,
  action,
  actionLabel,
  className,
}) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-12 px-4 text-center', className)}>
      {Icon ? (
        <Icon className="h-12 w-12 text-gray-300 mb-4" />
      ) : (
        <svg className="h-12 w-12 text-gray-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
        </svg>
      )}
      {title && (
        <h3 className="text-base font-medium text-gray-900 mb-1">{title}</h3>
      )}
      <p className="text-sm text-gray-500 max-w-sm mb-4">
        {message || 'No data found'}
      </p>
      {action && actionLabel && (
        <Button onClick={action} size="sm">
          {actionLabel}
        </Button>
      )}
    </div>
  )
}
