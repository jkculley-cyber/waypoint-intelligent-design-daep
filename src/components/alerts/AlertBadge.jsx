import { cn } from '../../lib/utils'

export default function AlertBadge({ count, className }) {
  if (!count || count === 0) return null

  return (
    <span
      className={cn(
        'inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold rounded-full',
        count > 0 ? 'bg-red-500 text-white' : 'bg-gray-400 text-white',
        className
      )}
    >
      {count > 99 ? '99+' : count}
    </span>
  )
}
