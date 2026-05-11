import { cn } from '@/lib/utils'
import { ArrowRight, LucideIcon } from 'lucide-react'
import Link from 'next/link'

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hover?: boolean
  padding?: 'sm' | 'md' | 'lg' | 'none'
}

export function Card({ className, hover, padding = 'md', children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'bg-white rounded-2xl border border-gray-100',
        padding === 'sm' && 'p-4',
        padding === 'md' && 'p-5',
        padding === 'lg' && 'p-6',
        padding === 'none' && '',
        hover && 'card-hover',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

interface CardHeaderProps {
  icon?: LucideIcon
  iconColor?: string
  iconBg?: string
  title: string
  href?: string
  action?: React.ReactNode
}

export function CardHeader({ icon: Icon, iconColor = 'text-gray-600', iconBg = 'bg-gray-50', title, href, action }: CardHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h2 className="font-semibold text-gray-900 flex items-center gap-2 text-sm">
        {Icon && (
          <span className={cn('inline-flex w-6 h-6 items-center justify-center rounded-lg', iconBg)}>
            <Icon size={14} className={iconColor} />
          </span>
        )}
        {title}
      </h2>
      {href ? (
        <Link href={href} className="text-xs text-indigo-600 hover:text-indigo-700 flex items-center gap-1 font-medium transition-colors">
          View all <ArrowRight size={12} />
        </Link>
      ) : action}
    </div>
  )
}

export function StatCard({
  label,
  value,
  icon: Icon,
  color,
  bg,
  href,
  trend,
}: {
  label: string
  value: string | number
  icon: LucideIcon
  color: string
  bg: string
  href?: string
  trend?: { value: number; label: string }
}) {
  const content = (
    <div className="bg-white rounded-2xl p-4 border border-gray-100 card-hover cursor-pointer">
      <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center mb-3', bg)}>
        <Icon size={18} className={color} />
      </div>
      <p className="text-2xl font-bold text-gray-900 tabular-nums">{value}</p>
      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
      {trend && (
        <p className={cn('text-xs mt-1.5 font-medium', trend.value >= 0 ? 'text-emerald-600' : 'text-red-600')}>
          {trend.value >= 0 ? '↑' : '↓'} {Math.abs(trend.value)}% {trend.label}
        </p>
      )}
    </div>
  )

  return href ? <Link href={href}>{content}</Link> : content
}
