'use client'

import { useState } from 'react'
import type { HouseholdMember, Reminder } from '@prisma/client'
import { Bell, Plus, Check, Trash2, X, Clock, CalendarCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { EmptyState } from '@/components/ui/empty-state'
import { cn } from '@/lib/utils'
import { format, isToday, isTomorrow, isPast, formatDistanceToNow } from 'date-fns'

type ReminderWithMember = Reminder & { member: HouseholdMember | null }

function ReminderCard({
  reminder,
  onDismiss,
  onDelete,
}: {
  reminder: ReminderWithMember
  onDismiss: (id: string) => void
  onDelete: (id: string) => void
}) {
  const date = new Date(reminder.remindAt)
  const overdue = isPast(date) && !reminder.dismissed
  const soon = !isPast(date) && (date.getTime() - Date.now()) < 24 * 60 * 60 * 1000

  return (
    <div className={cn(
      'bg-white rounded-2xl border p-4 transition-all flex items-start gap-4',
      reminder.dismissed ? 'opacity-50 border-gray-100' : overdue ? 'border-red-200 bg-red-50/20' : soon ? 'border-amber-200' : 'border-gray-100'
    )}>
      <div className={cn(
        'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0',
        reminder.dismissed ? 'bg-gray-50' : overdue ? 'bg-red-50' : soon ? 'bg-amber-50' : 'bg-indigo-50'
      )}>
        {reminder.dismissed ? (
          <Check size={16} className="text-gray-400" />
        ) : (
          <Bell size={16} className={overdue ? 'text-red-500' : soon ? 'text-amber-600' : 'text-indigo-600'} />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className={cn('font-semibold text-sm', reminder.dismissed ? 'line-through text-gray-400' : 'text-gray-900')}>
          {reminder.title}
        </p>
        {reminder.body && (
          <p className="text-xs text-gray-500 mt-0.5">{reminder.body}</p>
        )}
        <div className="flex items-center gap-2 mt-2">
          <Clock size={11} className="text-gray-400" />
          <p className={cn('text-[11px] font-medium', overdue ? 'text-red-500' : 'text-gray-400')}>
            {isToday(date) ? `Today at ${format(date, 'h:mm a')}`
              : isTomorrow(date) ? `Tomorrow at ${format(date, 'h:mm a')}`
              : overdue ? `${formatDistanceToNow(date, { addSuffix: true })}`
              : format(date, 'MMM d · h:mm a')}
          </p>
          {reminder.member && (
            <>
              <span className="text-gray-300">·</span>
              <div className="flex items-center gap-1">
                <div
                  className="w-3.5 h-3.5 rounded-full"
                  style={{ backgroundColor: reminder.member.color ?? '#6366f1' }}
                />
                <span className="text-[11px] text-gray-400">{reminder.member.displayName}</span>
              </div>
            </>
          )}
        </div>
      </div>

      {!reminder.dismissed && (
        <div className="flex items-center gap-1">
          <button
            onClick={() => onDismiss(reminder.id)}
            className="w-7 h-7 flex items-center justify-center rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-600 transition-colors press-effect"
            title="Dismiss"
          >
            <Check size={13} />
          </button>
          <button
            onClick={() => onDelete(reminder.id)}
            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors press-effect"
            title="Delete"
          >
            <Trash2 size={13} />
          </button>
        </div>
      )}
    </div>
  )
}

interface Props {
  initialReminders: ReminderWithMember[]
  members: HouseholdMember[]
  currentMemberId: string
}

export function RemindersView({ initialReminders, members, currentMemberId }: Props) {
  const [reminders, setReminders] = useState(initialReminders)
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [showDismissed, setShowDismissed] = useState(false)

  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [remindAt, setRemindAt] = useState('')
  const [memberId, setMemberId] = useState(currentMemberId)

  const active = reminders.filter((r) => !r.dismissed)
  const dismissed = reminders.filter((r) => r.dismissed)
  const overdue = active.filter((r) => isPast(new Date(r.remindAt)))
  const upcoming = active.filter((r) => !isPast(new Date(r.remindAt)))

  async function handleAdd() {
    if (!title.trim() || !remindAt) return
    setLoading(true)
    try {
      const res = await fetch('/api/reminders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), body: body.trim() || undefined, remindAt: new Date(remindAt).toISOString(), memberId }),
      })
      if (res.ok) {
        const r = await res.json()
        setReminders((prev) => [r, ...prev].sort((a, b) => new Date(a.remindAt).getTime() - new Date(b.remindAt).getTime()))
        setTitle(''); setBody(''); setRemindAt(''); setShowForm(false)
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleDismiss(id: string) {
    await fetch(`/api/reminders/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dismissed: true }),
    })
    setReminders((prev) => prev.map((r) => r.id === id ? { ...r, dismissed: true } : r))
  }

  async function handleDelete(id: string) {
    await fetch(`/api/reminders/${id}`, { method: 'DELETE' })
    setReminders((prev) => prev.filter((r) => r.id !== id))
  }

  // Minimum datetime: now + 1 min
  const minDateTime = new Date(Date.now() + 60000).toISOString().slice(0, 16)

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto animate-fade-in-up">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reminders</h1>
          <p className="text-gray-400 text-sm mt-0.5">
            {active.length} active{overdue.length > 0 && ` · ${overdue.length} overdue`}
          </p>
        </div>
        <Button onClick={() => setShowForm(true)} className="bg-indigo-600 hover:bg-indigo-700 gap-2 h-9 text-xs press-effect">
          <Plus size={14} />
          Add reminder
        </Button>
      </div>

      {/* Add form */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-6 animate-scale-in">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">New reminder</h3>
            <button onClick={() => setShowForm(false)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 press-effect">
              <X size={14} />
            </button>
          </div>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>What should I remind you about?</Label>
              <Input placeholder="e.g. Pay the rent" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
            </div>
            <div className="space-y-1.5">
              <Label>Details (optional)</Label>
              <Input placeholder="Additional notes..." value={body} onChange={(e) => setBody(e.target.value)} />
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>When</Label>
                <Input type="datetime-local" min={minDateTime} value={remindAt} onChange={(e) => setRemindAt(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>For</Label>
                <select
                  value={memberId}
                  onChange={(e) => setMemberId(e.target.value)}
                  className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {members.map((m) => <option key={m.id} value={m.id}>{m.displayName}</option>)}
                </select>
              </div>
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={loading || !title.trim() || !remindAt} className="bg-indigo-600 hover:bg-indigo-700 flex-1">
              Set reminder
            </Button>
          </div>
        </div>
      )}

      {/* Active reminders */}
      {active.length === 0 && dismissed.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="No reminders yet"
          description="Add reminders for tasks, bills, events, or anything you don't want to forget."
          iconBg="bg-pink-50"
          iconColor="text-pink-500"
          action={
            <Button onClick={() => setShowForm(true)} className="bg-indigo-600 hover:bg-indigo-700 gap-2 press-effect">
              <Plus size={14} />
              Set a reminder
            </Button>
          }
        />
      ) : (
        <div className="space-y-6">
          {overdue.length > 0 && (
            <section>
              <h2 className="text-xs font-semibold text-red-600 uppercase tracking-wider mb-2 px-1">Overdue</h2>
              <div className="space-y-2">
                {overdue.map((r) => <ReminderCard key={r.id} reminder={r} onDismiss={handleDismiss} onDelete={handleDelete} />)}
              </div>
            </section>
          )}

          {upcoming.length > 0 && (
            <section>
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-1">Upcoming</h2>
              <div className="space-y-2">
                {upcoming.map((r) => <ReminderCard key={r.id} reminder={r} onDismiss={handleDismiss} onDelete={handleDelete} />)}
              </div>
            </section>
          )}

          {dismissed.length > 0 && (
            <section>
              <button
                onClick={() => setShowDismissed((v) => !v)}
                className="text-xs text-gray-400 hover:text-gray-600 transition-colors flex items-center gap-1.5 px-1 mb-2"
              >
                <CalendarCheck size={12} />
                {showDismissed ? 'Hide' : 'Show'} {dismissed.length} dismissed
              </button>
              {showDismissed && (
                <div className="space-y-2">
                  {dismissed.map((r) => <ReminderCard key={r.id} reminder={r} onDismiss={handleDismiss} onDelete={handleDelete} />)}
                </div>
              )}
            </section>
          )}
        </div>
      )}
    </div>
  )
}
