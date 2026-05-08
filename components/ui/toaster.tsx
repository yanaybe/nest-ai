'use client'

import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

export function Toaster() {
  const { toasts } = useToast()

  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2 max-w-sm w-full">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={cn(
            'bg-white border rounded-xl shadow-lg px-4 py-3',
            toast.variant === 'destructive' ? 'border-red-200 bg-red-50' : 'border-gray-200'
          )}
        >
          {toast.title && (
            <p className={cn('text-sm font-semibold', toast.variant === 'destructive' ? 'text-red-800' : 'text-gray-900')}>
              {toast.title}
            </p>
          )}
          {toast.description && (
            <p className={cn('text-xs mt-0.5', toast.variant === 'destructive' ? 'text-red-600' : 'text-gray-500')}>
              {toast.description}
            </p>
          )}
        </div>
      ))}
    </div>
  )
}
