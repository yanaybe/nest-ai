import { cn } from '@/lib/utils'
import { LucideIcon } from 'lucide-react'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
  compact?: boolean
  iconBg?: string
  iconColor?: string
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
  compact = false,
  iconBg = 'bg-gray-100',
  iconColor = 'text-gray-400',
}: EmptyStateProps) {
  return (
    <div className={cn(
      'flex flex-col items-center justify-center text-center',
      compact ? 'py-6 px-4' : 'py-12 px-6',
      className
    )}>
      <div className={cn(
        'rounded-2xl flex items-center justify-center mb-4',
        iconBg,
        compact ? 'w-11 h-11' : 'w-16 h-16'
      )}>
        <Icon size={compact ? 20 : 28} className={iconColor} />
      </div>
      <p className={cn('font-semibold text-gray-700 mb-1', compact ? 'text-sm' : 'text-base')}>{title}</p>
      {description && (
        <p className={cn('text-gray-400 max-w-xs leading-relaxed', compact ? 'text-xs' : 'text-sm')}>
          {description}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
