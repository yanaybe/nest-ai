'use client'

import Link from 'next/link'
import type { CalendarEvent, GroceryItem, Household, HouseholdMember, Task } from '@prisma/client'
import { ShoppingCart, CheckSquare, Calendar, DollarSign, Plus, MessageSquare, ArrowRight, Flame } from 'lucide-react'
import { format, isToday, isTomorrow } from 'date-fns'
import { Button } from '@/components/ui/button'

interface Props {
  member: HouseholdMember
  household: Household & { members: HouseholdMember[] }
  pendingTasks: (Task & { assignee: HouseholdMember | null })[]
  groceryItems: GroceryItem[]
  upcomingEvents: CalendarEvent[]
  totalSpentThisMonth: number
}

const priorityColors: Record<string, string> = {
  URGENT: 'text-red-600 bg-red-50',
  HIGH: 'text-orange-600 bg-orange-50',
  MEDIUM: 'text-blue-600 bg-blue-50',
  LOW: 'text-gray-600 bg-gray-50',
}

function formatEventDate(date: Date) {
  if (isToday(date)) return 'Today'
  if (isTomorrow(date)) return 'Tomorrow'
  return format(date, 'MMM d')
}

export function DashboardContent({
  member,
  household,
  pendingTasks,
  groceryItems,
  upcomingEvents,
  totalSpentThisMonth,
}: Props) {
  const hour = new Date().getHours()
  const greeting =
    hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {greeting}, {member.displayName} 👋
          </h1>
          <p className="text-gray-500 mt-1">
            {household.name} · {format(new Date(), 'EEEE, MMMM d')}
          </p>
        </div>
        <Link href="/chat">
          <Button className="bg-indigo-600 hover:bg-indigo-700 gap-2">
            <MessageSquare size={16} />
            Ask Nest
          </Button>
        </Link>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Open tasks', value: pendingTasks.length, icon: CheckSquare, color: 'text-indigo-600', bg: 'bg-indigo-50', href: '/tasks' },
          { label: 'Grocery items', value: groceryItems.length, icon: ShoppingCart, color: 'text-emerald-600', bg: 'bg-emerald-50', href: '/grocery' },
          { label: 'Upcoming events', value: upcomingEvents.length, icon: Calendar, color: 'text-violet-600', bg: 'bg-violet-50', href: '/calendar' },
          { label: 'Spent this month', value: `$${totalSpentThisMonth.toFixed(0)}`, icon: DollarSign, color: 'text-amber-600', bg: 'bg-amber-50', href: '/expenses' },
        ].map((stat) => (
          <Link key={stat.href} href={stat.href}>
            <div className="bg-white rounded-2xl p-4 border border-gray-100 hover:shadow-md transition-shadow cursor-pointer">
              <div className={`w-9 h-9 ${stat.bg} rounded-xl flex items-center justify-center mb-3`}>
                <stat.icon size={18} className={stat.color} />
              </div>
              <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{stat.label}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Main grid */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Tasks */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <CheckSquare size={16} className="text-indigo-600" />
              Tasks
            </h2>
            <Link href="/tasks" className="text-xs text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
              View all <ArrowRight size={12} />
            </Link>
          </div>
          <div className="space-y-2">
            {pendingTasks.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">All caught up! 🎉</p>
            ) : (
              pendingTasks.map((task) => (
                <div key={task.id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50 transition-colors">
                  <div className="w-4 h-4 rounded border-2 border-gray-300 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{task.title}</p>
                    {task.assignee && (
                      <p className="text-xs text-gray-500">{task.assignee.displayName}</p>
                    )}
                  </div>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${priorityColors[task.priority]}`}>
                    {task.priority.toLowerCase()}
                  </span>
                </div>
              ))
            )}
          </div>
          <Link href="/tasks?new=1">
            <button className="mt-3 w-full flex items-center justify-center gap-2 py-2 text-xs text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors">
              <Plus size={14} />
              Add task
            </button>
          </Link>
        </div>

        {/* Grocery */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <ShoppingCart size={16} className="text-emerald-600" />
              Grocery list
            </h2>
            <Link href="/grocery" className="text-xs text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
              View all <ArrowRight size={12} />
            </Link>
          </div>
          <div className="space-y-2">
            {groceryItems.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">Grocery list is empty</p>
            ) : (
              groceryItems.map((item) => (
                <div key={item.id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50">
                  <div className="w-4 h-4 rounded border-2 border-gray-300 flex-shrink-0" />
                  <span className="text-sm text-gray-800 flex-1">{item.name}</span>
                  {item.urgent && (
                    <Flame size={14} className="text-red-500" />
                  )}
                  {item.quantity && (
                    <span className="text-xs text-gray-400">{item.quantity}{item.unit ? ` ${item.unit}` : ''}</span>
                  )}
                </div>
              ))
            )}
          </div>
          <Link href="/grocery?new=1">
            <button className="mt-3 w-full flex items-center justify-center gap-2 py-2 text-xs text-emerald-600 hover:bg-emerald-50 rounded-xl transition-colors">
              <Plus size={14} />
              Add item
            </button>
          </Link>
        </div>

        {/* Calendar */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <Calendar size={16} className="text-violet-600" />
              Upcoming
            </h2>
            <Link href="/calendar" className="text-xs text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
              View all <ArrowRight size={12} />
            </Link>
          </div>
          <div className="space-y-2">
            {upcomingEvents.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">Nothing scheduled</p>
            ) : (
              upcomingEvents.map((event) => (
                <div key={event.id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50">
                  <div className="w-10 h-10 bg-violet-50 rounded-xl flex flex-col items-center justify-center flex-shrink-0">
                    <span className="text-[10px] font-medium text-violet-600 uppercase">
                      {format(new Date(event.startAt), 'MMM')}
                    </span>
                    <span className="text-sm font-bold text-violet-700">
                      {format(new Date(event.startAt), 'd')}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{event.title}</p>
                    <p className="text-xs text-gray-500">
                      {formatEventDate(new Date(event.startAt))} · {format(new Date(event.startAt), 'h:mm a')}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* AI Chat CTA */}
        <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-5 text-white">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
              <MessageSquare size={18} className="text-white" />
            </div>
            <h2 className="font-semibold">Ask Nest anything</h2>
          </div>
          <p className="text-sm text-white/80 mb-4 leading-relaxed">
            &quot;Add milk and eggs to grocery&quot;, &quot;What&apos;s on the calendar this week?&quot;, &quot;We spent too much on dining&quot;
          </p>
          <div className="space-y-2">
            {[
              "What do I need to buy?",
              "What's happening this week?",
              "How much did we spend?",
            ].map((suggestion) => (
              <Link key={suggestion} href={`/chat?q=${encodeURIComponent(suggestion)}`}>
                <div className="bg-white/10 hover:bg-white/20 transition-colors rounded-xl px-3 py-2 text-sm text-white/90 cursor-pointer">
                  {suggestion}
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
