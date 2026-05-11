import { cn } from '@/lib/utils'
import { cva, type VariantProps } from 'class-variance-authority'

const badgeVariants = cva(
  'inline-flex items-center gap-1 font-medium rounded-full border transition-colors',
  {
    variants: {
      variant: {
        default:     'bg-indigo-50 text-indigo-700 border-indigo-100',
        success:     'bg-emerald-50 text-emerald-700 border-emerald-100',
        warning:     'bg-amber-50 text-amber-700 border-amber-100',
        danger:      'bg-red-50 text-red-700 border-red-100',
        secondary:   'bg-gray-100 text-gray-600 border-gray-200',
        outline:     'border-gray-200 text-gray-600 bg-transparent',
        violet:      'bg-violet-50 text-violet-700 border-violet-100',
        sky:         'bg-sky-50 text-sky-700 border-sky-100',
        pink:        'bg-pink-50 text-pink-700 border-pink-100',
        orange:      'bg-orange-50 text-orange-700 border-orange-100',
      },
      size: {
        sm:  'text-[10px] px-2 py-0.5',
        md:  'text-xs px-2.5 py-0.5',
        lg:  'text-sm px-3 py-1',
      },
    },
    defaultVariants: { variant: 'default', size: 'md' },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, size, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant, size }), className)} {...props} />
}

/* Priority badge helper */
const PRIORITY_MAP: Record<string, { variant: BadgeProps['variant']; label: string }> = {
  URGENT: { variant: 'danger',   label: 'Urgent' },
  HIGH:   { variant: 'orange',   label: 'High' },
  MEDIUM: { variant: 'default',  label: 'Medium' },
  LOW:    { variant: 'secondary',label: 'Low' },
}

export function PriorityBadge({ priority }: { priority: string }) {
  const cfg = PRIORITY_MAP[priority] ?? PRIORITY_MAP.LOW
  return <Badge variant={cfg.variant}>{cfg.label}</Badge>
}

/* Status badge helper */
const STATUS_MAP: Record<string, { variant: BadgeProps['variant']; label: string }> = {
  TODO:        { variant: 'secondary', label: 'To do' },
  IN_PROGRESS: { variant: 'sky',      label: 'In progress' },
  DONE:        { variant: 'success',  label: 'Done' },
  CANCELLED:   { variant: 'outline',  label: 'Cancelled' },
}

export function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_MAP[status] ?? STATUS_MAP.TODO
  return <Badge variant={cfg.variant}>{cfg.label}</Badge>
}
