'use client'

// TODO [MOBILE]:
// The bottom tab bar is the primary navigation for all mobile users, but has several issues:
//
// 1. ICON INCONSISTENCY in the "More" sheet:
//    The primary nav uses Lucide icons (LayoutDashboard, MessageSquare, etc.) but the "More"
//    sheet uses emoji icons ('💰', '🍽️', '🧾', '🔔', '⚙️'). This creates a jarring visual
//    inconsistency — half the app feels modern, the other half feels like a prototype.
//    Fix: Replace all emoji icons in the More sheet with Lucide icons.
//
// 2. NO active state in the More sheet:
//    When the user is on /expenses, the bottom tab bar shows no active item (Expenses is in
//    the "More" section, not the primary nav). The user has no visual indication of where they
//    are. Fix: highlight the "More" button when any secondary page is active, and show the
//    active item in the More sheet.
//
// 3. SAFE AREA handling uses `pb-safe` which requires Tailwind's safe-area plugin to be
//    properly configured. Verify this is set up via `env(safe-area-inset-bottom)` in CSS.
//    Without it, the nav overlaps the home indicator bar on iPhone, making the bottom items
//    partially obscured.
//
// 4. NO haptic feedback:
//    Mobile users expect vibration when tapping nav items. Add navigator.vibrate(10) on click
//    for Android users (iOS Safari doesn't support it, so it silently no-ops).
//
// TODO [MOBILE]:
// The "More" bottom sheet has no keyboard shortcut or back-navigation support. On Android,
// pressing the hardware back button while the sheet is open should close it, not navigate
// away from the page. Add a useEffect that listens for popstate events or the Android back
// button to close the sheet gracefully.

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, MessageSquare, ShoppingCart, CheckSquare, Calendar, MoreHorizontal } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useState } from 'react'

const primaryNav = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Home' },
  { href: '/chat',      icon: MessageSquare,   label: 'Ask AI', highlight: true },
  { href: '/grocery',   icon: ShoppingCart,    label: 'Grocery' },
  { href: '/tasks',     icon: CheckSquare,     label: 'Tasks' },
  { href: '/calendar',  icon: Calendar,        label: 'Calendar' },
]

export function MobileNav() {
  const pathname = usePathname()
  const [moreOpen, setMoreOpen] = useState(false)

  return (
    <>
      {/* Bottom tab bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 pb-safe">
        <div className="flex items-stretch h-16">
          {primaryNav.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex-1 flex flex-col items-center justify-center gap-0.5 transition-all press-effect',
                  item.highlight
                    ? active
                      ? 'text-indigo-600'
                      : 'text-indigo-600'
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
            className="flex-1 flex flex-col items-center justify-center gap-0.5 text-gray-400 press-effect"
          >
            <div className="w-11 h-8 flex items-center justify-center rounded-2xl">
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
              {/* TODO [MOBILE]: Replace these emoji icons with Lucide icons to match the
              primary nav. Current icons: 💰 → DollarSign, 🍽️ → UtensilsCrossed,
              🧾 → Receipt, 🔔 → Bell, ⚙️ → Settings. The inconsistency is immediately
              noticeable and makes the app feel unfinished. */}
            {[
                { href: '/expenses', icon: '💰', label: 'Expenses' },
                { href: '/meals',    icon: '🍽️', label: 'Meals' },
                { href: '/bills',    icon: '🧾', label: 'Bills' },
                { href: '/reminders',icon: '🔔', label: 'Reminders' },
                { href: '/settings', icon: '⚙️', label: 'Settings' },
              ].map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMoreOpen(false)}
                  className="flex flex-col items-center gap-2 p-3 rounded-2xl hover:bg-gray-50 transition-colors"
                >
                  <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center text-2xl">
                    {item.icon}
                  </div>
                  <span className="text-xs font-medium text-gray-700">{item.label}</span>
                </Link>
              ))}
            </div>
          </div>
        </>
      )}
    </>
  )
}
