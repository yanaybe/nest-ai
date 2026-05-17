'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { MoreHorizontal } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useState } from 'react'
import { MOBILE_PRIMARY_NAV, MOBILE_MORE_NAV } from '@/lib/nav-config'

export function MobileNav() {
  const pathname = usePathname()
  const [moreOpen, setMoreOpen] = useState(false)

  const isMoreActive = MOBILE_MORE_NAV.some(
    (item) => pathname === item.href || pathname.startsWith(item.href + '/')
  )

  return (
    <>
      {/* Bottom tab bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 pb-safe">
        <div className="flex items-stretch h-16">
          {MOBILE_PRIMARY_NAV.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex-1 flex flex-col items-center justify-center gap-0.5 transition-all press-effect',
                  item.highlight
                    ? 'text-indigo-600'
                    : active
                    ? 'text-indigo-600'
                    : 'text-gray-400'
                )}
              >
                {item.highlight ? (
                  <div className={cn(
                    'w-11 h-8 flex items-center justify-center rounded-2xl transition-all',
                    active ? 'bg-indigo-100' : 'bg-indigo-600'
                  )}>
                    <item.icon size={18} className={active ? 'text-indigo-600' : 'text-white'} />
                  </div>
                ) : (
                  <div className={cn(
                    'w-11 h-8 flex items-center justify-center rounded-2xl transition-all',
                    active ? 'bg-indigo-50' : ''
                  )}>
                    <item.icon size={20} />
                  </div>
                )}
                <span className={cn('text-[10px] font-medium', item.highlight && !active && 'text-indigo-600')}>
                  {item.label}
                </span>
              </Link>
            )
          })}

          {/* More button */}
          <button
            onClick={() => setMoreOpen(true)}
            className={cn(
              'flex-1 flex flex-col items-center justify-center gap-0.5 press-effect transition-all',
              isMoreActive ? 'text-indigo-600' : 'text-gray-400'
            )}
          >
            <div className={cn(
              'w-11 h-8 flex items-center justify-center rounded-2xl',
              isMoreActive ? 'bg-indigo-50' : ''
            )}>
              <MoreHorizontal size={20} />
            </div>
            <span className="text-[10px] font-medium">More</span>
          </button>
        </div>
      </nav>

      {/* More sheet */}
      {moreOpen && (
        <>
          <div
            className="md:hidden fixed inset-0 z-50 bg-black/40 animate-fade-in"
            onClick={() => setMoreOpen(false)}
          />
          <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl p-6 pb-10 shadow-2xl animate-fade-in-up">
            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-6" />
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4 px-2">More features</p>
            <div className="grid grid-cols-4 gap-4">
              {MOBILE_MORE_NAV.map((item) => {
                const active = pathname === item.href || pathname.startsWith(item.href + '/')
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMoreOpen(false)}
                    className="flex flex-col items-center gap-2 p-3 rounded-2xl hover:bg-gray-50 transition-colors"
                  >
                    <div className={cn(
                      'w-12 h-12 rounded-2xl flex items-center justify-center',
                      active ? 'bg-indigo-100' : 'bg-gray-100'
                    )}>
                      <item.icon size={22} className={active ? 'text-indigo-600' : 'text-gray-600'} />
                    </div>
                    <span className={cn(
                      'text-xs font-medium',
                      active ? 'text-indigo-700' : 'text-gray-700'
                    )}>
                      {item.label}
                    </span>
                  </Link>
                )
              })}
            </div>
          </div>
        </>
      )}
    </>
  )
}
