'use client'

import Link from 'next/link'
import type { CalendarEvent, Expense, GroceryItem, Household, HouseholdMember, Task } from '@prisma/client'
import {
  ShoppingCart, CheckSquare, Calendar, DollarSign, Plus,
  MessageSquare, ArrowRight, Flame, Sparkles, Clock,
  AlertCircle, TrendingUp, ChevronRight
} from 'lucide-react'
import { format, isToday, isTomorrow, isPast, formatDistanceToNow } from 'date-fns'
import { Button } from '@/components/ui/button'
import { PriorityBadge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { cn } from '@/lib/utils'

interface Props {
  member: HouseholdMember
  household: Household & { members: HouseholdMember[] }
  pendingTasks: (Task & { assignee: HouseholdMember | null })[]
  groceryItems: GroceryItem[]
  upcomingEvents: CalendarEvent[]
  totalSpentThisMonth: number
  recentExpenses?: Expense[]
}

function formatEventDate(date: Date) {
  if (isToday(date)) return 'Today'
  if (isTomorrow(date)) return 'Tomorrow'
  return format(date, 'MMM d')
}

const URGENCY_SUGGESTIONS = [
  'Add milk, bread, and eggs',
  "What's on the calendar this week?",
  'How much did we spend this month?',
  'What tasks are due soon?',
]

export function DashboardContent({
  member,
  household,
  pendingTasks,
  groceryItems,
  upcomingEvents,
  totalSpentThisMonth,
  recentExpenses = [],
}: Props) {
  const hour = new Date().getHours()
  const greeting =
    hour < 5 ? 'Good night' :
    hour < 12 ? 'Good morning' :
    hour < 17 ? 'Good afternoon' : 'Good evening'

  const overdueCount = pendingTasks.filter(
    (t) => t.dueDate && isPast(new Date(t.dueDate))
  ).length

  const urgentGrocery = groceryItems.filter((i) => i.urgent).length

  const todayEvents = upcomingEvents.filter((e) => isToday(new Date(e.startAt)))
  const tomorrowEvents = upcomingEvents.filter((e) => isTomorrow(new Date(e.startAt)))

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto animate-fade-in-up">

      {/* ─── Greeting header ─────────────────────────────────────── */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            {greeting}, {member.displayName} 👋
          </h1>
          <p className="text-gray-400 text-sm mt-0.5">
            {household.name} · {format(new Date(), 'EEEE, MMMM d')}
          </p>
        </div>
        <Link href="/chat" className="hidden sm:block">
          <Button className="bg-indigo-600 hover:bg-indigo-700 gap-2 shadow-sm shadow-indigo-200 press-effect h-9 text-xs">
            <Sparkles size={14} />
            Ask Nest
          </Button>
        </Link>
      </div>

      {/* ─── Alert bar (overdue / urgent) ────────────────────────── */}
      {(overdueCount > 0 || urgentGrocery > 0) && (
        <div className="mb-5 flex items-center gap-3 bg-amber-50 border border-amber-100 rounded-2xl px-4 py-3 animate-fade-in-down">
          <AlertCircle size={16} className="text-amber-500 flex-shrink-0" />
          <div className="flex-1 text-sm text-amber-700">
            {overdueCount > 0 && (
              <span className="font-medium">{overdueCount} overdue task{overdueCount > 1 ? 's' : ''}</span>
            )}
            {overdueCount > 0 && urgentGrocery > 0 && <span className="mx-1.5 text-amber-400">·</span>}
            {urgentGrocery > 0 && (
              <span className="font-medium">{urgentGrocery} urgent grocery item{urgentGrocery > 1 ? 's' : ''}</span>
            )}
          </div>
          <Link href="/tasks" className="text-xs font-semibold text-amber-600 hover:text-amber-700 flex items-center gap-1 flex-shrink-0">
            View <ChevronRight size={12} />
          </Link>
        </div>
      )}

      {/* ─── Stats row ───────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {[
          {
            label: 'Open tasks',
            value: pendingTasks.length,
            icon: CheckSquare,
            color: 'text-indigo-600',
            bg: 'bg-indigo-50',
            href: '/tasks',
            sub: overdueCount > 0 ? `${overdueCount} overdue` : 'On track',
            subColor: overdueCount > 0 ? 'text-red-500' : 'text-emerald-500',
          },
          {
            label: 'Need to buy',
            value: groceryItems.length,
            icon: ShoppingCart,
            color: 'text-emerald-600',
            bg: 'bg-emerald-50',
            href: '/grocery',
            sub: urgentGrocery > 0 ? `${urgentGrocery} urgent` : 'All good',
            subColor: urgentGrocery > 0 ? 'text-red-500' : 'text-emerald-500',
          },
          {
            label: 'Events',
            value: upcomingEvents.length,
            icon: Calendar,
            color: 'text-violet-600',
            bg: 'bg-violet-50',
            href: '/calendar',
            sub: todayEvents.length > 0 ? `${todayEvents.length} today` : tomorrowEvents.length > 0 ? `${tomorrowEvents.length} tomorrow` : 'Nothing soon',
            subColor: todayEvents.length > 0 ? 'text-violet-600' : 'text-gray-400',
          },
          {
            label: 'Spent this month',
            value: `$${totalSpentThisMonth.toFixed(0)}`,
            icon: DollarSign,
            color: 'text-amber-600',
            bg: 'bg-amber-50',
            href: '/expenses',
            sub: recentExpenses.length > 0 ? `${recentExpenses.length} recent txns` : 'Track spending',
            subColor: 'text-gray-400',
          },
        ].map((stat) => (
          <Link key={stat.href} href={stat.href}>
            <div className="bg-white rounded-2xl p-4 border border-gray-100 card-hover cursor-pointer h-full">
              <div className={cn('w-8 h-8 rounded-xl flex items-center justify-center mb-2.5', stat.bg)}>
                <stat.icon size={16} className={stat.color} />
              </div>
              <p className="text-2xl font-bold text-gray-900 tabular-nums leading-tight">{stat.value}</p>
              <p className="text-xs text-gray-400 mt-0.5 mb-1.5">{stat.label}</p>
              <p className={cn('text-[11px] font-medium', stat.subColor)}>{stat.sub}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* ─── Main grid ───────────────────────────────────────────── */}
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">

        {/* Tasks */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900 text-sm flex items-center gap-2">
              <span className="w-5 h-5 bg-indigo-50 rounded-lg flex items-center justify-center">
                <CheckSquare size={12} className="text-indigo-600" />
              </span>
              Tasks
            </h2>
            <Link href="/tasks" className="text-xs text-indigo-600 hover:text-indigo-700 flex items-center gap-0.5 font-medium">
              All <ArrowRight size={11} />
            </Link>
          </div>

          {pendingTasks.length === 0 ? (
            <EmptyState
              compact
              icon={CheckSquare}
              iconBg="bg-indigo-50"
              iconColor="text-indigo-400"
              title="All caught up!"
              description="No pending tasks. Great job!"
            />
          ) : (
            <div className="space-y-1.5">
              {pendingTasks.map((task) => {
                const isOverdue = task.dueDate && isPast(new Date(task.dueDate))
                return (
                  <div key={task.id} className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-gray-50 transition-colors group">
                    <div className={cn(
                      'w-4 h-4 rounded border-2 flex-shrink-0 transition-colors',
                      isOverdue ? 'border-red-300' : 'border-gray-300 group-hover:border-indigo-400'
                    )} />
                    <div className="flex-1 min-w-0">
                      <p className={cn('text-sm font-medium truncate', isOverdue ? 'text-red-700' : 'text-gray-900')}>
                        {task.title}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {task.dueDate && (
                          <p className={cn('text-[11px] flex items-center gap-0.5', isOverdue ? 'text-red-500' : 'text-gray-400')}>
                            <Clock size={9} />
                            {isOverdue
                              ? `Overdue ${formatDistanceToNow(new Date(task.dueDate), { addSuffix: true })}`
                              : format(new Date(task.dueDate), 'MMM d')
                            }
                          </p>
                        )}
                        {task.assignee && !task.dueDate && (
                          <p className="text-[11px] text-gray-400">{task.assignee.displayName}</p>
                        )}
                      </div>
                    </div>
                    <PriorityBadge priority={task.priority} />
                  </div>
                )
              })}
            </div>
          )}

          <Link href="/tasks?new=1">
            <button className="mt-3 w-full flex items-center justify-center gap-1.5 py-2 text-xs text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors font-medium press-effect">
              <Plus size={13} />
              Add task
            </button>
          </Link>
        </div>

        {/* Grocery */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900 text-sm flex items-center gap-2">
              <span className="w-5 h-5 bg-emerald-50 rounded-lg flex items-center justify-center">
                <ShoppingCart size={12} className="text-emerald-600" />
              </span>
              Grocery list
            </h2>
            <Link href="/grocery" className="text-xs text-indigo-600 hover:text-indigo-700 flex items-center gap-0.5 font-medium">
              All <ArrowRight size={11} />
            </Link>
          </div>

          {groceryItems.length === 0 ? (
            <EmptyState
              compact
              icon={ShoppingCart}
              iconBg="bg-emerald-50"
              iconColor="text-emerald-400"
              title="List is empty"
              description="Add items or ask Nest to help"
            />
          ) : (
            <div className="space-y-1">
              {groceryItems.map((item) => (
                <div key={item.id} className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-gray-50 transition-colors">
                  <div className="w-4 h-4 rounded border-2 border-gray-300 flex-shrink-0" />
                  <span className="text-sm text-gray-800 flex-1 truncate">{item.name}</span>
                  <div className="flex items-center gap-1.5">
                    {item.urgent && <Flame size={12} className="text-red-500" />}
                    {(item.quantity || item.unit) && (
                      <span className="text-[11px] text-gray-400">
                        {item.quantity}{item.unit ? ` ${item.unit}` : ''}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          <Link href="/grocery?new=1">
            <button className="mt-3 w-full flex items-center justify-center gap-1.5 py-2 text-xs text-emerald-600 hover:bg-emerald-50 rounded-xl transition-colors font-medium press-effect">
              <Plus size={13} />
              Add item
            </button>
          </Link>
        </div>

        {/* Upcoming events */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900 text-sm flex items-center gap-2">
              <span className="w-5 h-5 bg-violet-50 rounded-lg flex items-center justify-center">
                <Calendar size={12} className="text-violet-600" />
              </span>
              Upcoming
            </h2>
            <Link href="/calendar" className="text-xs text-indigo-600 hover:text-indigo-700 flex items-center gap-0.5 font-medium">
              All <ArrowRight size={11} />
            </Link>
          </div>

          {upcomingEvents.length === 0 ? (
            <EmptyState
              compact
              icon={Calendar}
              iconBg="bg-violet-50"
              iconColor="text-violet-400"
              title="Nothing scheduled"
              description="Add an event or ask Nest"
            />
          ) : (
            <div className="space-y-2">
              {upcomingEvents.map((event) => {
                const eventDate = new Date(event.startAt)
                const isEventToday = isToday(eventDate)
                return (
                  <div key={event.id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-gray-50 transition-colors">
                    <div className={cn(
                      'w-9 h-9 rounded-xl flex flex-col items-center justify-center flex-shrink-0',
                      isEventToday ? 'bg-violet-600' : 'bg-violet-50'
                    )}>
                      <span className={cn('text-[9px] font-semibold uppercase', isEventToday ? 'text-violet-200' : 'text-violet-500')}>
                        {format(eventDate, 'MMM')}
                      </span>
                      <span className={cn('text-sm font-bold leading-none', isEventToday ? 'text-white' : 'text-violet-700')}>
                        {format(eventDate, 'd')}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{event.title}</p>
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        {formatEventDate(eventDate)}
                        {!event.allDay && ` · ${format(eventDate, 'h:mm a')}`}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Spending summary */}
        {recentExpenses.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900 text-sm flex items-center gap-2">
                <span className="w-5 h-5 bg-amber-50 rounded-lg flex items-center justify-center">
                  <TrendingUp size={12} className="text-amber-600" />
                </span>
                Recent spending
              </h2>
              <Link href="/expenses" className="text-xs text-indigo-600 hover:text-indigo-700 flex items-center gap-0.5 font-medium">
                All <ArrowRight size={11} />
              </Link>
            </div>
            <div className="space-y-2">
              {recentExpenses.slice(0, 4).map((expense) => (
                <div key={expense.id} className="flex items-center justify-between px-2 py-1.5 rounded-xl hover:bg-gray-50">
                  <div className="flex-1 min-w-0 mr-3">
                    <p className="text-sm font-medium text-gray-900 truncate">{expense.title}</p>
                    <p className="text-[11px] text-gray-400">{format(new Date(expense.paidAt), 'MMM d')}</p>
                  </div>
                  <span className="text-sm font-semibold text-gray-700 tabular-nums">
                    ${expense.amount.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* AI Chat CTA */}
        <div className={cn(
          'bg-gradient-to-br from-indigo-500 via-indigo-600 to-purple-700 rounded-2xl p-5 text-white',
          recentExpenses.length > 0 ? '' : 'md:col-span-1'
        )}>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center">
              <Sparkles size={15} className="text-white" />
            </div>
            <div>
              <h2 className="font-semibold text-sm">Ask Nest anything</h2>
              <p className="text-[11px] text-white/60">Your AI family assistant</p>
            </div>
          </div>
          <div className="space-y-1.5 mb-4">
            {URGENCY_SUGGESTIONS.map((suggestion) => (
              <Link key={suggestion} href={`/chat?q=${encodeURIComponent(suggestion)}`}>
                <div className="bg-white/10 hover:bg-white/20 transition-colors rounded-xl px-3 py-2 text-xs text-white/90 cursor-pointer press-effect flex items-center gap-2">
                  <MessageSquare size={11} className="text-white/60 flex-shrink-0" />
                  {suggestion}
                </div>
              </Link>
            ))}
          </div>
          <Link href="/chat">
            <button className="w-full py-2 bg-white/15 hover:bg-white/25 transition-colors rounded-xl text-sm font-semibold text-white press-effect flex items-center justify-center gap-2">
              Open chat <ArrowRight size={14} />
            </button>
          </Link>
        </div>

        {/* Quick members overview */}
        {household.members.length > 1 && (
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900 text-sm">Household</h2>
              <Link href="/settings" className="text-xs text-indigo-600 hover:text-indigo-700 flex items-center gap-0.5 font-medium">
                Manage <ArrowRight size={11} />
              </Link>
            </div>
            <div className="space-y-2">
              {household.members.map((m) => (
                <div key={m.id} className="flex items-center gap-3 px-2 py-1.5 rounded-xl hover:bg-gray-50 transition-colors">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ring-2 ring-white shadow-sm"
                    style={{ backgroundColor: m.color ?? '#6366f1' }}
                  >
                    {m.displayName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{m.displayName}</p>
                    <p className="text-[11px] text-gray-400 capitalize">{m.role.toLowerCase()}</p>
                  </div>
                  {m.id === member.id && (
                    <span className="ml-auto text-[10px] font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                      You
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
