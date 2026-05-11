'use client'

// TODO [UX]:
// The sidebar has no notification badge system. When a new task is assigned, a reminder fires,
// or a bill is due, there's no visual indicator in the nav. Users have to visit each page
// manually to discover what needs attention.
//
// Suggested: Add unread badges to nav items:
// - Tasks: count of overdue tasks (red badge)
// - Grocery: count of urgent items (red badge)
// - Bills: count of bills due within 7 days (amber badge)
// - Reminders: count of due/upcoming reminders (blue badge)
// Fetch badge counts in the layout server component (already fetching member/household data)
// and pass them as props to AppSidebar.
//
// TODO [UX]: The sidebar profile card at the bottom links to /settings when clicked, but
// it's visually indistinguishable from a non-clickable element. Add a subtle "→" icon or
// "Edit profile" text to make it obviously interactive.

// TODO [REFACTOR]: The navSections array is defined inside this module. If the mobile drawer
// in app-header.tsx needs the same navigation structure, it redefines its own `mobileNavItems`
// array (same items, different format). This means any nav change requires updating two places.
// Extract a shared `getNavItems()` function in a separate file (e.g., lib/nav-config.ts)
// that both components import, ensuring the navigation structure stays in sync.

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { Household, HouseholdMember } from '@prisma/client'
import {
  LayoutDashboard, MessageSquare, ShoppingCart, CheckSquare,
  Calendar, DollarSign, Bell, Settings, Home, UtensilsCrossed,
  Receipt, Repeat, Sparkles
} from 'lucide-react'
import { cn } from '@/lib/utils'

type NavItem = { href: string; icon: React.ElementType; label: string; highlight?: boolean }
type NavSection = { label: string | null; items: NavItem[] }

const navSections: NavSection[] = [
  {
    label: null,
    items: [
      { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
      { href: '/chat', icon: MessageSquare, label: 'Ask Nest', highlight: true },
    ],
  },
  {
    label: 'Household',
    items: [
      { href: '/grocery',  icon: ShoppingCart,    label: 'Grocery' },
      { href: '/tasks',    icon: CheckSquare,     label: 'Tasks' },
      { href: '/calendar', icon: Calendar,        label: 'Calendar' },
      { href: '/expenses', icon: DollarSign,      label: 'Expenses' },
    ],
  },
  {
    label: 'Planning',
    items: [
      { href: '/meals',     icon: UtensilsCrossed, label: 'Meals' },
      { href: '/bills',     icon: Receipt,         label: 'Bills' },
      { href: '/routines',  icon: Repeat,          label: 'Routines' },
      { href: '/reminders', icon: Bell,            label: 'Reminders' },
    ],
  },
]

interface Props {
  household: Household
  member: HouseholdMember
}

export function AppSidebar({ household, member }: Props) {
  const pathname = usePathname()

  return (
    <div className="hidden md:flex flex-col w-64 bg-white border-r border-gray-100 h-screen sticky top-0 overflow-y-auto">
      {/* Logo / Household */}
      <div className="px-5 pt-5 pb-4 border-b border-gray-50">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center shadow-sm flex-shrink-0">
            <Home className="w-4.5 h-4.5 text-white" size={18} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="font-bold text-gray-900 text-sm leading-tight">Nest</p>
              <Sparkles size={11} className="text-indigo-400" />
            </div>
            <p className="text-xs text-gray-400 truncate">{household.name}</p>
          </div>
        </div>
      </div>

      {/* Nav sections */}
      <nav className="flex-1 px-3 py-3 space-y-4">
        {navSections.map((section) => (
          <div key={section.label ?? 'main'}>
            {section.label && (
              <p className="px-3 text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                {section.label}
              </p>
            )}
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const active = pathname === item.href || pathname.startsWith(item.href + '/')
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all group',
                      active
                        ? 'bg-indigo-50 text-indigo-700'
                        : item.highlight
                        ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    )}
                  >
                    <item.icon
                      size={16}
                      className={cn(
                        'flex-shrink-0 transition-transform group-hover:scale-110',
                        active ? 'text-indigo-600' : item.highlight ? 'text-white' : 'text-gray-400 group-hover:text-gray-600'
                      )}
                    />
                    <span className="truncate">{item.label}</span>
                    {active && !item.highlight && (
                      <div className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-500" />
                    )}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom: Settings + Profile */}
      <div className="px-3 pb-4 pt-3 border-t border-gray-50 space-y-0.5">
        <Link
          href="/settings"
          className={cn(
            'flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all group',
            pathname === '/settings'
              ? 'bg-indigo-50 text-indigo-700'
              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
          )}
        >
          <Settings
            size={16}
            className={cn(
              'flex-shrink-0 transition-transform group-hover:scale-110',
              pathname === '/settings' ? 'text-indigo-600' : 'text-gray-400 group-hover:text-gray-600'
            )}
          />
          Settings
        </Link>

        {/* Profile card */}
        <Link
          href="/settings"
          className="flex items-center gap-3 px-3 py-2.5 mt-2 rounded-xl hover:bg-gray-50 transition-all group"
        >
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ring-2 ring-white shadow-sm"
            style={{ backgroundColor: member.color ?? '#6366f1' }}
          >
            {member.displayName.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-gray-900 truncate leading-tight">{member.displayName}</p>
            <p className="text-[11px] text-gray-400 capitalize">{member.role.toLowerCase()}</p>
          </div>
        </Link>
      </div>
    </div>
  )
}
