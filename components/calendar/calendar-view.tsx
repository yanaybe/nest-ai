'use client'

import { useState } from 'react'
import type { CalendarEvent } from '@prisma/client'
import {
  Calendar, ChevronLeft, ChevronRight, Plus, X, Loader2, Trash2, MapPin, Clock,
} from 'lucide-react'
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, endOfWeek,
  isSameMonth, isSameDay, isToday, addMonths, subMonths, parseISO,
} from 'date-fns'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

type EventWithAttendees = CalendarEvent & {
  attendees: Array<{ id: string; memberId: string; member: { id: string; displayName: string; color: string } }>
}

interface Props {
  initialEvents: EventWithAttendees[]
}

const EVENT_COLORS = [
  { value: '#6366f1', label: 'Indigo' },
  { value: '#10b981', label: 'Emerald' },
  { value: '#f59e0b', label: 'Amber' },
  { value: '#ef4444', label: 'Red' },
  { value: '#8b5cf6', label: 'Violet' },
  { value: '#0ea5e9', label: 'Sky' },
]

const WEEK_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

interface AddForm {
  title: string
  description: string
  location: string
  startAt: string
  endAt: string
  allDay: boolean
  color: string
  category: string
}

function toDatetimeLocal(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function makeEmptyForm(day?: Date): AddForm {
  const start = day ? new Date(day.setHours(9, 0, 0, 0)) : new Date()
  const end = new Date(start.getTime() + 60 * 60 * 1000)
  return {
    title: '', description: '', location: '',
    startAt: toDatetimeLocal(start),
    endAt: toDatetimeLocal(end),
    allDay: false, color: '#6366f1', category: '',
  }
}

export function CalendarView({ initialEvents }: Props) {
  const [events, setEvents] = useState<EventWithAttendees[]>(initialEvents)
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDay, setSelectedDay] = useState<Date>(new Date())
  const [showAddForm, setShowAddForm] = useState(false)
  const [form, setForm] = useState<AddForm>(() => makeEmptyForm(new Date()))
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const calStart = startOfWeek(monthStart)
  const calEnd = endOfWeek(monthEnd)
  const calDays = eachDayOfInterval({ start: calStart, end: calEnd })

  function getEventsForDay(day: Date) {
    return events.filter(e => isSameDay(new Date(e.startAt), day))
  }

  const selectedDayEvents = getEventsForDay(selectedDay)

  async function deleteEvent(id: string) {
    setEvents(prev => prev.filter(e => e.id !== id))
    try {
      await fetch(`/api/events/${id}`, { method: 'DELETE' })
    } catch {
      // silent
    }
  }

  async function addEvent() {
    setFormError('')
    if (!form.title.trim()) {
      setFormError('Title is required')
      return
    }
    if (!form.startAt || !form.endAt) {
      setFormError('Start and end time are required')
      return
    }
    const start = new Date(form.startAt)
    const end = new Date(form.endAt)
    if (end <= start && !form.allDay) {
      setFormError('End time must be after start time')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title.trim(),
          description: form.description.trim() || undefined,
          location: form.location.trim() || undefined,
          startAt: start.toISOString(),
          endAt: form.allDay ? new Date(start.setHours(23, 59, 0, 0)).toISOString() : end.toISOString(),
          allDay: form.allDay,
          color: form.color,
          category: form.category.trim() || undefined,
        }),
      })
      if (res.ok) {
        const { event } = await res.json()
        setEvents(prev => [...prev, event])
        setShowAddForm(false)
        setSelectedDay(new Date(event.startAt))
      } else {
        const data = await res.json()
        setFormError(typeof data.error === 'string' ? data.error : 'Failed to create event')
      }
    } catch {
      setFormError('Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  function openAddForDay(day: Date) {
    const d = new Date(day)
    setForm(makeEmptyForm(d))
    setShowAddForm(true)
    setFormError('')
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-violet-100 rounded-xl flex items-center justify-center">
            <Calendar size={20} className="text-violet-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Calendar</h1>
        </div>
        <Button onClick={() => { setForm(makeEmptyForm(new Date())); setShowAddForm(true); setFormError('') }} className="bg-indigo-600 hover:bg-indigo-700 gap-2">
          <Plus size={16} /> Add event
        </Button>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Calendar grid */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 p-5">
          {/* Month nav */}
          <div className="flex items-center justify-between mb-5">
            <button
              onClick={() => setCurrentMonth(m => subMonths(m, 1))}
              className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center transition-colors"
            >
              <ChevronLeft size={18} />
            </button>
            <h2 className="font-bold text-gray-900 text-lg">
              {format(currentMonth, 'MMMM yyyy')}
            </h2>
            <button
              onClick={() => setCurrentMonth(m => addMonths(m, 1))}
              className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center transition-colors"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 mb-2">
            {WEEK_DAYS.map(d => (
              <div key={d} className="text-center text-xs font-medium text-gray-400 py-1">{d}</div>
            ))}
          </div>

          {/* Days grid */}
          <div className="grid grid-cols-7">
            {calDays.map((day, i) => {
              const dayEvents = getEventsForDay(day)
              const isCurrentMonth = isSameMonth(day, currentMonth)
              const isSelected = isSameDay(day, selectedDay)
              const isCurrentDay = isToday(day)

              return (
                <button
                  key={i}
                  onClick={() => setSelectedDay(day)}
                  onDoubleClick={() => openAddForDay(day)}
                  className={cn(
                    'aspect-square p-1 flex flex-col items-center rounded-xl transition-all group',
                    isSelected ? 'bg-indigo-600' : isCurrentDay ? 'bg-indigo-50' : 'hover:bg-gray-50',
                    !isCurrentMonth && 'opacity-30'
                  )}
                >
                  <span className={cn(
                    'text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full',
                    isSelected ? 'text-white' : isCurrentDay ? 'text-indigo-600 font-bold' : 'text-gray-700'
                  )}>
                    {format(day, 'd')}
                  </span>
                  {/* Event dots */}
                  <div className="flex gap-0.5 flex-wrap justify-center mt-0.5 max-w-full">
                    {dayEvents.slice(0, 3).map(e => (
                      <div
                        key={e.id}
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ backgroundColor: isSelected ? 'rgba(255,255,255,0.7)' : e.color }}
                      />
                    ))}
                    {dayEvents.length > 3 && (
                      <span className={cn('text-[8px]', isSelected ? 'text-white/70' : 'text-gray-400')}>+{dayEvents.length - 3}</span>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
          <p className="text-xs text-gray-400 text-center mt-3">Double-click a day to add an event</p>
        </div>

        {/* Side panel: selected day events */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">
                {isToday(selectedDay) ? 'Today' : format(selectedDay, 'EEEE, MMM d')}
              </h3>
              <button
                onClick={() => openAddForDay(selectedDay)}
                className="text-indigo-600 hover:bg-indigo-50 p-1.5 rounded-lg transition-colors"
              >
                <Plus size={16} />
              </button>
            </div>
            <div className="space-y-2">
              {selectedDayEvents.length === 0 ? (
                <div className="text-center py-6 text-gray-400">
                  <Calendar size={28} className="mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Nothing scheduled</p>
                  <button
                    onClick={() => openAddForDay(selectedDay)}
                    className="mt-2 text-xs text-indigo-600 hover:text-indigo-700"
                  >
                    + Add event
                  </button>
                </div>
              ) : (
                selectedDayEvents.map(event => (
                  <div
                    key={event.id}
                    className="p-3 rounded-xl border border-gray-100 hover:border-gray-200 group transition-colors"
                    style={{ borderLeftWidth: 3, borderLeftColor: event.color }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{event.title}</p>
                        {event.allDay ? (
                          <p className="text-xs text-gray-400 mt-0.5">All day</p>
                        ) : (
                          <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                            <Clock size={10} />
                            {format(new Date(event.startAt), 'h:mm a')} – {format(new Date(event.endAt), 'h:mm a')}
                          </p>
                        )}
                        {event.location && (
                          <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                            <MapPin size={10} /> {event.location}
                          </p>
                        )}
                        {event.description && (
                          <p className="text-xs text-gray-500 mt-1 line-clamp-2">{event.description}</p>
                        )}
                      </div>
                      <button
                        onClick={() => deleteEvent(event.id)}
                        className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-all flex-shrink-0"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Upcoming events */}
          {(() => {
            const upcoming = events
              .filter(e => new Date(e.startAt) > new Date() && !isSameDay(new Date(e.startAt), selectedDay))
              .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())
              .slice(0, 5)
            if (upcoming.length === 0) return null
            return (
              <div className="bg-white rounded-2xl border border-gray-100 p-5">
                <h3 className="font-semibold text-gray-900 mb-3 text-sm">Upcoming</h3>
                <div className="space-y-2">
                  {upcoming.map(event => (
                    <button
                      key={event.id}
                      onClick={() => { setSelectedDay(new Date(event.startAt)); setCurrentMonth(new Date(event.startAt)) }}
                      className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-gray-50 text-left transition-colors group"
                    >
                      <div className="w-9 h-9 rounded-xl flex flex-col items-center justify-center flex-shrink-0" style={{ backgroundColor: event.color + '20' }}>
                        <span className="text-[9px] font-medium uppercase" style={{ color: event.color }}>{format(new Date(event.startAt), 'MMM')}</span>
                        <span className="text-sm font-bold" style={{ color: event.color }}>{format(new Date(event.startAt), 'd')}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{event.title}</p>
                        <p className="text-xs text-gray-400">{format(new Date(event.startAt), 'EEE, MMM d')}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )
          })()}
        </div>
      </div>

      {/* Add event modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-gray-900">New event</h3>
              <button onClick={() => setShowAddForm(false)} className="text-gray-400 hover:text-gray-600 p-1">
                <X size={20} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <Label htmlFor="eventTitle">Title *</Label>
                <Input
                  id="eventTitle"
                  placeholder="e.g. Family dinner"
                  value={form.title}
                  onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))}
                  autoFocus
                />
              </div>
              <div>
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  placeholder="e.g. Home"
                  value={form.location}
                  onChange={(e) => setForm(f => ({ ...f, location: e.target.value }))}
                />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.allDay}
                  onChange={(e) => setForm(f => ({ ...f, allDay: e.target.checked }))}
                  className="w-4 h-4 accent-indigo-600"
                />
                <span className="text-sm text-gray-700">All day</span>
              </label>
              {!form.allDay && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="startAt">Start *</Label>
                    <Input
                      id="startAt"
                      type="datetime-local"
                      value={form.startAt}
                      onChange={(e) => setForm(f => ({ ...f, startAt: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="endAt">End *</Label>
                    <Input
                      id="endAt"
                      type="datetime-local"
                      value={form.endAt}
                      onChange={(e) => setForm(f => ({ ...f, endAt: e.target.value }))}
                    />
                  </div>
                </div>
              )}
              {form.allDay && (
                <div>
                  <Label htmlFor="startDate">Date *</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={form.startAt.split('T')[0]}
                    onChange={(e) => setForm(f => ({ ...f, startAt: e.target.value + 'T00:00', endAt: e.target.value + 'T23:59' }))}
                  />
                </div>
              )}
              <div>
                <Label htmlFor="description">Description</Label>
                <textarea
                  id="description"
                  placeholder="Optional notes..."
                  value={form.description}
                  onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
                  className="flex w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring min-h-[72px] resize-none"
                />
              </div>
              <div>
                <Label>Color</Label>
                <div className="flex gap-2 mt-1">
                  {EVENT_COLORS.map(c => (
                    <button
                      key={c.value}
                      onClick={() => setForm(f => ({ ...f, color: c.value }))}
                      title={c.label}
                      className={cn(
                        'w-8 h-8 rounded-full transition-all',
                        form.color === c.value ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : 'hover:scale-105'
                      )}
                      style={{ backgroundColor: c.value }}
                    />
                  ))}
                </div>
              </div>
              <div>
                <Label htmlFor="eventCategory">Category</Label>
                <Input
                  id="eventCategory"
                  placeholder="e.g. Family, Work"
                  value={form.category}
                  onChange={(e) => setForm(f => ({ ...f, category: e.target.value }))}
                />
              </div>
              {formError && <p className="text-sm text-red-600">{formError}</p>}
              <div className="flex gap-3 pt-2">
                <Button variant="outline" onClick={() => setShowAddForm(false)} className="flex-1">Cancel</Button>
                <Button onClick={addEvent} disabled={submitting} className="flex-1 bg-indigo-600 hover:bg-indigo-700">
                  {submitting ? <Loader2 size={16} className="animate-spin" /> : 'Save event'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
