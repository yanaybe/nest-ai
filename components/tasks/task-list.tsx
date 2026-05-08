'use client'

import { useState } from 'react'
import type { HouseholdMember, Task } from '@prisma/client'
import {
  CheckSquare, Plus, X, Loader2, Trash2, Calendar, User, ChevronDown, ChevronRight,
  Circle, Clock, CheckCircle2, XCircle,
} from 'lucide-react'
import { format, isToday, isTomorrow, isPast } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

type TaskWithRelations = Task & {
  assignee: HouseholdMember | null
  creator: HouseholdMember | null
}

interface Props {
  initialTasks: TaskWithRelations[]
  members: HouseholdMember[]
  currentMemberId: string
}

const PRIORITY_COLORS: Record<string, string> = {
  URGENT: 'bg-red-100 text-red-700 border border-red-200',
  HIGH: 'bg-orange-100 text-orange-700 border border-orange-200',
  MEDIUM: 'bg-blue-100 text-blue-700 border border-blue-200',
  LOW: 'bg-gray-100 text-gray-600 border border-gray-200',
}

const STATUS_META: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  TODO: { label: 'To Do', icon: Circle, color: 'text-gray-500' },
  IN_PROGRESS: { label: 'In Progress', icon: Clock, color: 'text-blue-500' },
  DONE: { label: 'Done', icon: CheckCircle2, color: 'text-emerald-500' },
  CANCELLED: { label: 'Cancelled', icon: XCircle, color: 'text-gray-400' },
}

interface AddForm {
  title: string
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
  dueDate: string
  assigneeId: string
  category: string
}

const emptyForm: AddForm = { title: '', priority: 'MEDIUM', dueDate: '', assigneeId: '', category: '' }

function formatDueDate(date: Date) {
  if (isToday(date)) return 'Today'
  if (isTomorrow(date)) return 'Tomorrow'
  return format(date, 'MMM d')
}

export function TaskList({ initialTasks, members, currentMemberId }: Props) {
  const [tasks, setTasks] = useState<TaskWithRelations[]>(initialTasks)
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL')
  const [showAddForm, setShowAddForm] = useState(false)
  const [form, setForm] = useState<AddForm>(emptyForm)
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set(['DONE', 'CANCELLED']))

  const filtered = tasks.filter(t => {
    if (statusFilter !== 'ALL' && t.status !== statusFilter) return false
    if (priorityFilter !== 'ALL' && t.priority !== priorityFilter) return false
    return true
  })

  const groups: Record<string, TaskWithRelations[]> = {
    TODO: [],
    IN_PROGRESS: [],
    DONE: [],
    CANCELLED: [],
  }
  filtered.forEach(t => {
    groups[t.status].push(t)
  })

  function toggleGroup(status: string) {
    setCollapsedGroups(prev => {
      const next = new Set(prev)
      next.has(status) ? next.delete(status) : next.add(status)
      return next
    })
  }

  async function changeStatus(task: TaskWithRelations, status: string) {
    const prev = tasks
    setTasks(t => t.map(i => i.id === task.id ? { ...i, status: status as Task['status'] } : i))
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (res.ok) {
        const { task: updated } = await res.json()
        setTasks(t => t.map(i => i.id === updated.id ? updated : i))
      } else {
        setTasks(prev)
      }
    } catch {
      setTasks(prev)
    }
  }

  async function deleteTask(id: string) {
    setTasks(prev => prev.filter(t => t.id !== id))
    try {
      await fetch(`/api/tasks/${id}`, { method: 'DELETE' })
    } catch {
      // silent
    }
  }

  async function addTask() {
    setFormError('')
    if (!form.title.trim()) {
      setFormError('Task title is required')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title.trim(),
          priority: form.priority,
          dueDate: form.dueDate ? new Date(form.dueDate).toISOString() : null,
          assigneeId: form.assigneeId || null,
          category: form.category || undefined,
        }),
      })
      if (res.ok) {
        const { task } = await res.json()
        setTasks(prev => [task, ...prev])
        setForm(emptyForm)
        setShowAddForm(false)
      } else {
        const data = await res.json()
        setFormError(typeof data.error === 'string' ? data.error : 'Failed to add task')
      }
    } catch {
      setFormError('Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  const STATUS_ORDER = ['TODO', 'IN_PROGRESS', 'DONE', 'CANCELLED']

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
            <CheckSquare size={20} className="text-indigo-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Tasks</h1>
            <p className="text-sm text-gray-500">
              {tasks.filter(t => t.status === 'TODO' || t.status === 'IN_PROGRESS').length} open tasks
            </p>
          </div>
        </div>
        <Button onClick={() => { setShowAddForm(true); setForm(emptyForm); setFormError('') }} className="bg-indigo-600 hover:bg-indigo-700 gap-2">
          <Plus size={16} /> Add task
        </Button>
      </div>

      {/* Add form */}
      {showAddForm && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">New task</h3>
            <button onClick={() => setShowAddForm(false)} className="text-gray-400 hover:text-gray-600">
              <X size={18} />
            </button>
          </div>
          <div className="space-y-3">
            <div>
              <Label htmlFor="taskTitle">Title *</Label>
              <Input
                id="taskTitle"
                placeholder="e.g. Buy groceries"
                value={form.title}
                onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))}
                onKeyDown={(e) => e.key === 'Enter' && addTask()}
                autoFocus
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="priority">Priority</Label>
                <select
                  id="priority"
                  value={form.priority}
                  onChange={(e) => setForm(f => ({ ...f, priority: e.target.value as AddForm['priority'] }))}
                  className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="URGENT">Urgent</option>
                </select>
              </div>
              <div>
                <Label htmlFor="dueDate">Due date</Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={form.dueDate}
                  onChange={(e) => setForm(f => ({ ...f, dueDate: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="assignee">Assignee</Label>
                <select
                  id="assignee"
                  value={form.assigneeId}
                  onChange={(e) => setForm(f => ({ ...f, assigneeId: e.target.value }))}
                  className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="">Unassigned</option>
                  {members.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.displayName}{m.id === currentMemberId ? ' (you)' : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="category">Category</Label>
                <Input
                  id="category"
                  placeholder="e.g. Cleaning"
                  value={form.category}
                  onChange={(e) => setForm(f => ({ ...f, category: e.target.value }))}
                />
              </div>
            </div>
            {formError && <p className="text-sm text-red-600">{formError}</p>}
            <div className="flex gap-3 pt-1">
              <Button variant="outline" onClick={() => setShowAddForm(false)} className="flex-1">Cancel</Button>
              <Button onClick={addTask} disabled={submitting} className="flex-1 bg-indigo-600 hover:bg-indigo-700">
                {submitting ? <Loader2 size={16} className="animate-spin" /> : 'Add task'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1 bg-white rounded-xl border border-gray-200 p-1">
          {['ALL', 'TODO', 'IN_PROGRESS', 'DONE'].map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                statusFilter === s ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-100'
              )}
            >
              {s === 'ALL' ? 'All' : s === 'IN_PROGRESS' ? 'In Progress' : s.charAt(0) + s.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1 bg-white rounded-xl border border-gray-200 p-1">
          {['ALL', 'URGENT', 'HIGH', 'MEDIUM', 'LOW'].map(p => (
            <button
              key={p}
              onClick={() => setPriorityFilter(p)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                priorityFilter === p ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-100'
              )}
            >
              {p === 'ALL' ? 'All' : p.charAt(0) + p.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Grouped tasks */}
      <div className="space-y-4">
        {STATUS_ORDER.map(status => {
          const groupTasks = groups[status]
          if (groupTasks.length === 0 && statusFilter === 'ALL') return null
          const meta = STATUS_META[status]
          const Icon = meta.icon
          const collapsed = collapsedGroups.has(status)

          return (
            <div key={status} className="bg-white rounded-2xl border border-gray-100">
              <button
                onClick={() => toggleGroup(status)}
                className="w-full flex items-center justify-between p-4 hover:bg-gray-50 rounded-2xl transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Icon size={16} className={meta.color} />
                  <span className="font-semibold text-gray-900 text-sm">{meta.label}</span>
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{groupTasks.length}</span>
                </div>
                {collapsed ? <ChevronRight size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
              </button>

              {!collapsed && (
                <div className="px-4 pb-4 space-y-2">
                  {groupTasks.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-4">No tasks here</p>
                  ) : (
                    groupTasks.map(task => (
                      <div key={task.id} className="flex items-start gap-3 p-3 rounded-xl hover:bg-gray-50 group transition-colors border border-transparent hover:border-gray-100">
                        {/* Status toggle */}
                        <button
                          onClick={() => changeStatus(task, task.status === 'TODO' ? 'IN_PROGRESS' : task.status === 'IN_PROGRESS' ? 'DONE' : 'TODO')}
                          className={cn('mt-0.5 flex-shrink-0 transition-colors', meta.color)}
                          title="Change status"
                        >
                          <Icon size={18} />
                        </button>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={cn(
                              'text-sm font-medium text-gray-900',
                              task.status === 'DONE' && 'line-through text-gray-400',
                              task.status === 'CANCELLED' && 'line-through text-gray-300'
                            )}>
                              {task.title}
                            </span>
                            <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', PRIORITY_COLORS[task.priority])}>
                              {task.priority.toLowerCase()}
                            </span>
                            {task.category && (
                              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{task.category}</span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-1">
                            {task.dueDate && (
                              <span className={cn(
                                'text-xs flex items-center gap-1',
                                isPast(new Date(task.dueDate)) && task.status !== 'DONE' ? 'text-red-500' : 'text-gray-400'
                              )}>
                                <Calendar size={11} />
                                {formatDueDate(new Date(task.dueDate))}
                              </span>
                            )}
                            {task.assignee && (
                              <span className="text-xs flex items-center gap-1 text-gray-400">
                                <div
                                  className="w-4 h-4 rounded-full flex items-center justify-center text-white text-[8px] font-bold flex-shrink-0"
                                  style={{ backgroundColor: task.assignee.color }}
                                >
                                  {task.assignee.displayName[0].toUpperCase()}
                                </div>
                                {task.assignee.displayName}
                              </span>
                            )}
                            {!task.assignee && (
                              <span className="text-xs flex items-center gap-1 text-gray-300">
                                <User size={11} /> Unassigned
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Status selector + delete */}
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                          <select
                            value={task.status}
                            onChange={(e) => changeStatus(task, e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white text-gray-600 focus:outline-none"
                          >
                            <option value="TODO">Todo</option>
                            <option value="IN_PROGRESS">In Progress</option>
                            <option value="DONE">Done</option>
                            <option value="CANCELLED">Cancelled</option>
                          </select>
                          <button
                            onClick={() => deleteTask(task.id)}
                            className="text-gray-400 hover:text-red-500 transition-colors p-1"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <CheckSquare size={40} className="mx-auto mb-3 opacity-20" />
          <p>No tasks match your filters</p>
        </div>
      )}
    </div>
  )
}
