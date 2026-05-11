'use client'

// TODO [UX]:
// The header notification bell shows a red dot permanently (hardcoded in JSX) but clicking it
// does absolutely nothing. This is a broken UI element — users will tap it expecting a
// notification panel and nothing happens. This is worse than not having the bell at all,
// because it creates false expectation and erodes trust.
//
// Two options:
// A) Remove the bell entirely until notifications are implemented
// B) Implement a basic notification system (preferred):
//    1. Create a GET /api/notifications endpoint that returns unread Notification records
//    2. Poll every 60 seconds or use Supabase Realtime on the notifications table
//    3. Show a dropdown with notification items (task assigned, bill due, reminder fired)
//    4. Mark notifications as read when the panel is opened
//    5. Only show the red dot when there are actually unread notifications
//
// The Notification model already exists in Prisma schema — it just needs to be wired up.
// Notifications need to be CREATED somewhere too (e.g., when a task is assigned to a member,
// when a bill is due within 3 days, when a reminder's remindAt time passes).

import { useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import type { Household, HouseholdMember } from '@prisma/client'
import {
  Bell, LogOut, ChevronDown, Settings, Home,
  LayoutDashboard, MessageSquare, ShoppingCart, CheckSquare, Calendar, DollarSign,
  UtensilsCrossed, Receipt, Repeat, X, Sparkles, User
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

const mobileNavItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/chat',      icon: MessageSquare,   label: 'Ask Nest', highlight: true },
  { href: '/grocery',   icon: ShoppingCart,    label: 'Grocery' },
  { href: '/tasks',     icon: CheckSquare,     label: 'Tasks' },
  { href: '/calendar',  icon: Calendar,        label: 'Calendar' },
  { href: '/expenses',  icon: DollarSign,      label: 'Expenses' },
  { href: '/meals',     icon: UtensilsCrossed, label: 'Meals' },
  { href: '/bills',     icon: Receipt,         label: 'Bills' },
  { href: '/routines',  icon: Repeat,          label: 'Routines' },
  { href: '/reminders', icon: Bell,            label: 'Reminders' },
  { href: '/settings',  icon: Settings,        label: 'Settings' },
]

interface Props {
  member: HouseholdMember
  household: Household
}

export function AppHeader({ member, household }: Props) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <>
      <header className="h-14 bg-white/80 backdrop-blur-md border-b border-gray-100 flex items-center justify-between px-4 md:px-6 sticky top-0 z-30">
        {/* Mobile: hamburger + logo */}
        <button
          onClick={() => setDrawerOpen(true)}
          className="md:hidden flex items-center gap-2.5 press-effect"
          aria-label="Open menu"
        >
          <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center">
            <Home size={13} className="text-white" />
          </div>
          <span className="font-bold text-sm text-gray-900">Nest</span>
        </button>

        {/* Desktop: page title area (empty, sidebar handles nav) */}
        <div className="hidden md:block" />

        {/* Right side */}
        <div className="flex items-center gap-2 ml-auto">
          {/* TODO [CRITICAL]: This notification bell is purely decorative. The red dot is
            hardcoded and shows even when there are zero notifications. Clicking does nothing.
            This must be either removed or implemented before user testing. See the module-level
            TODO for the full notification system implementation plan. */}
          {/* Notification bell */}
          <button className="relative w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100 transition-colors text-gray-500 press-effect">
            <Bell size={17} />
            {/* Unread dot */}
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
          </button>

          {/* Profile dropdown */}
          <div className="relative">
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="flex items-center gap-2 pl-1 pr-2.5 py-1 rounded-xl hover:bg-gray-100 transition-colors press-effect"
            >
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold ring-2 ring-white shadow-sm"
                style={{ backgroundColor: member.color ?? '#6366f1' }}
              >
                {member.displayName.charAt(0).toUpperCase()}
              </div>
              <span className="hidden sm:block text-sm font-medium text-gray-700 max-w-[100px] truncate">
                {member.displayName}
              </span>
              <ChevronDown size={13} className={cn('text-gray-400 transition-transform', menuOpen && 'rotate-180')} />
            </button>

            {menuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 z-50 animate-scale-in">
                  <div className="px-4 py-2.5 border-b border-gray-50 mb-1">
                    <p className="text-sm font-semibold text-gray-900 truncate">{member.displayName}</p>
                    <p className="text-xs text-gray-400">{household.name}</p>
                  </div>
                  <Link
                    href="/settings"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2.5 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <User size={14} className="text-gray-400" />
                    Profile &amp; Settings
                  </Link>
                  <div className="border-t border-gray-50 mt-1 pt-1">
                    <button
                      onClick={handleSignOut}
                      className="flex items-center gap-2.5 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <LogOut size={14} />
                      Sign out
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Mobile drawer */}
      {drawerOpen && (
        <>
          <div
            className="md:hidden fixed inset-0 z-50 bg-black/50 animate-fade-in"
            onClick={() => setDrawerOpen(false)}
          />
          <div className="md:hidden fixed inset-y-0 left-0 z-50 w-72 bg-white shadow-2xl flex flex-col animate-slide-in-right">
            {/* Drawer header */}
            <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-indigo-600 rounded-xl flex items-center justify-center">
                  <Home size={15} className="text-white" />
                </div>
                <div>
                  <p className="font-bold text-gray-900 text-sm flex items-center gap-1">
                    Nest <Sparkles size={10} className="text-indigo-400" />
                  </p>
                  <p className="text-xs text-gray-400">{household.name}</p>
                </div>
              </div>
              <button
                onClick={() => setDrawerOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-gray-100 transition-colors text-gray-400 press-effect"
              >
                <X size={16} />
              </button>
            </div>

            {/* Nav */}
            <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5">
              {mobileNavItems.map((item) => {
                const active = pathname === item.href || pathname.startsWith(item.href + '/')
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setDrawerOpen(false)}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                      active
                        ? 'bg-indigo-50 text-indigo-700'
                        : item.highlight
                        ? 'bg-indigo-600 text-white'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    )}
                  >
                    <item.icon size={17} className={cn(
                      active ? 'text-indigo-600' : item.highlight ? 'text-white' : 'text-gray-400'
                    )} />
                    {item.label}
                  </Link>
                )
              })}
            </nav>

            {/* Profile */}
            <div className="px-4 py-4 border-t border-gray-100">
              <div className="flex items-center gap-3 mb-3">
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold ring-2 ring-white shadow-sm"
                  style={{ backgroundColor: member.color ?? '#6366f1' }}
                >
                  {member.displayName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{member.displayName}</p>
                  <p className="text-xs text-gray-400 capitalize">{member.role.toLowerCase()}</p>
                </div>
              </div>
              <button
                onClick={handleSignOut}
                className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded-xl transition-colors press-effect"
              >
                <LogOut size={15} />
                Sign out
              </button>
            </div>
          </div>
        </>
      )}
    </>
  )
}
