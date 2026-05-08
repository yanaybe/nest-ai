'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { Household, HouseholdMember } from '@prisma/client'
import {
  LayoutDashboard, MessageSquare, ShoppingCart, CheckSquare,
  Calendar, DollarSign, Bell, Settings, Home, UtensilsCrossed,
  Receipt, Repeat
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/chat', icon: MessageSquare, label: 'Ask Nest', highlight: true },
  { href: '/grocery', icon: ShoppingCart, label: 'Grocery' },
  { href: '/tasks', icon: CheckSquare, label: 'Tasks' },
  { href: '/calendar', icon: Calendar, label: 'Calendar' },
  { href: '/expenses', icon: DollarSign, label: 'Expenses' },
  { href: '/meals', icon: UtensilsCrossed, label: 'Meals' },
  { href: '/bills', icon: Receipt, label: 'Bills' },
  { href: '/routines', icon: Repeat, label: 'Routines' },
  { href: '/reminders', icon: Bell, label: 'Reminders' },
]

interface Props {
  household: Household
  member: HouseholdMember
}

export function AppSidebar({ household, member }: Props) {
  const pathname = usePathname()

  return (
    <div className="hidden md:flex flex-col w-64 bg-white border-r border-gray-200 py-6">
      {/* Logo */}
      <div className="px-6 mb-8">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center">
            <Home className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-bold text-gray-900 text-sm">Nest</p>
            <p className="text-xs text-gray-500 truncate max-w-[120px]">{household.name}</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 space-y-1">
        {navItems.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                active
                  ? 'bg-indigo-50 text-indigo-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                item.highlight && !active && 'bg-indigo-600 text-white hover:bg-indigo-700'
              )}
            >
              <item.icon className={cn('w-4.5 h-4.5', item.highlight && !active ? 'text-white' : '')} size={18} />
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* Bottom */}
      <div className="px-3 mt-4 pt-4 border-t border-gray-100">
        <Link
          href="/settings"
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-all"
        >
          <Settings size={18} />
          Settings
        </Link>
        <div className="flex items-center gap-3 px-3 py-2.5 mt-1">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold"
            style={{ backgroundColor: member.color }}
          >
            {member.displayName.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{member.displayName}</p>
            <p className="text-xs text-gray-500 capitalize">{member.role.toLowerCase()}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
