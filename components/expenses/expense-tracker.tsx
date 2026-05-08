'use client'

import { useState } from 'react'
import type { Budget, Expense, HouseholdMember } from '@prisma/client'
import { DollarSign, Plus, X, Loader2, Trash2, ChevronLeft, ChevronRight, TrendingUp } from 'lucide-react'
import { format, startOfMonth, endOfMonth, isSameDay, addMonths, subMonths } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

type ExpenseWithPaidBy = Expense & { paidBy: HouseholdMember | null }

interface Props {
  initialExpenses: ExpenseWithPaidBy[]
  initialBudgets: Budget[]
  currency: string
}

const CATEGORIES = [
  'GROCERIES', 'DINING', 'TRANSPORT', 'UTILITIES', 'HOUSING',
  'HEALTHCARE', 'EDUCATION', 'ENTERTAINMENT', 'CLOTHING',
  'PERSONAL_CARE', 'SUBSCRIPTIONS', 'SAVINGS', 'OTHER',
] as const

type CategoryType = typeof CATEGORIES[number]

const CATEGORY_META: Record<CategoryType, { label: string; color: string; bg: string }> = {
  GROCERIES: { label: 'Groceries', color: '#10b981', bg: '#d1fae5' },
  DINING: { label: 'Dining', color: '#f59e0b', bg: '#fef3c7' },
  TRANSPORT: { label: 'Transport', color: '#3b82f6', bg: '#dbeafe' },
  UTILITIES: { label: 'Utilities', color: '#6366f1', bg: '#e0e7ff' },
  HOUSING: { label: 'Housing', color: '#8b5cf6', bg: '#ede9fe' },
  HEALTHCARE: { label: 'Healthcare', color: '#ef4444', bg: '#fee2e2' },
  EDUCATION: { label: 'Education', color: '#0ea5e9', bg: '#e0f2fe' },
  ENTERTAINMENT: { label: 'Entertainment', color: '#ec4899', bg: '#fce7f3' },
  CLOTHING: { label: 'Clothing', color: '#f97316', bg: '#ffedd5' },
  PERSONAL_CARE: { label: 'Personal Care', color: '#14b8a6', bg: '#ccfbf1' },
  SUBSCRIPTIONS: { label: 'Subscriptions', color: '#64748b', bg: '#f1f5f9' },
  SAVINGS: { label: 'Savings', color: '#22c55e', bg: '#dcfce7' },
  OTHER: { label: 'Other', color: '#9ca3af', bg: '#f3f4f6' },
}

interface AddForm {
  title: string
  amount: string
  category: CategoryType
  paidAt: string
  notes: string
}

function pad(n: number) { return String(n).padStart(2, '0') }
function toDateInput(d: Date) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` }

function emptyForm(): AddForm {
  return { title: '', amount: '', category: 'GROCERIES', paidAt: toDateInput(new Date()), notes: '' }
}

export function ExpenseTracker({ initialExpenses, initialBudgets, currency }: Props) {
  const [viewMonth, setViewMonth] = useState(new Date())
  const [expenses, setExpenses] = useState<ExpenseWithPaidBy[]>(initialExpenses)
  const [budgets] = useState<Budget[]>(initialBudgets)
  const [showAddForm, setShowAddForm] = useState(false)
  const [form, setForm] = useState<AddForm>(emptyForm)
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const monthStart = startOfMonth(viewMonth)
  const monthEnd = endOfMonth(viewMonth)

  // Filter expenses for current view month
  const monthExpenses = expenses.filter(e => {
    const d = new Date(e.paidAt)
    return d >= monthStart && d <= monthEnd
  })

  const total = monthExpenses.reduce((sum, e) => sum + e.amount, 0)

  // Category breakdown
  const byCategory = CATEGORIES.map(cat => {
    const catExpenses = monthExpenses.filter(e => e.category === cat)
    const spent = catExpenses.reduce((sum, e) => sum + e.amount, 0)
    const budget = budgets.find(b => b.category === cat)
    return { cat, spent, budget: budget?.amount ?? null, label: CATEGORY_META[cat].label, color: CATEGORY_META[cat].color, bg: CATEGORY_META[cat].bg }
  }).filter(c => c.spent > 0 || c.budget !== null).sort((a, b) => b.spent - a.spent)

  // Group expenses by date
  const groupedByDate: Map<string, ExpenseWithPaidBy[]> = new Map()
  monthExpenses.forEach(e => {
    const key = format(new Date(e.paidAt), 'yyyy-MM-dd')
    if (!groupedByDate.has(key)) groupedByDate.set(key, [])
    groupedByDate.get(key)!.push(e)
  })
  const sortedDates = Array.from(groupedByDate.keys()).sort((a, b) => b.localeCompare(a))

  async function loadMonthExpenses(month: Date) {
    const monthStr = format(month, 'yyyy-MM')
    try {
      const res = await fetch(`/api/expenses?month=${monthStr}`)
      if (res.ok) {
        const { expenses: fetched } = await res.json()
        setExpenses(fetched)
      }
    } catch {
      // silent
    }
  }

  function changeMonth(direction: -1 | 1) {
    const newMonth = direction === 1 ? addMonths(viewMonth, 1) : subMonths(viewMonth, 1)
    setViewMonth(newMonth)
    loadMonthExpenses(newMonth)
  }

  async function addExpense() {
    setFormError('')
    if (!form.title.trim()) { setFormError('Title is required'); return }
    const amount = parseFloat(form.amount)
    if (isNaN(amount) || amount <= 0) { setFormError('Enter a valid amount'); return }

    setSubmitting(true)
    try {
      const paidAt = new Date(form.paidAt + 'T12:00:00')
      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title.trim(),
          amount,
          category: form.category,
          paidAt: paidAt.toISOString(),
          notes: form.notes.trim() || undefined,
        }),
      })
      if (res.ok) {
        const { expense } = await res.json()
        // Only add to view if it falls in current month
        const eDate = new Date(expense.paidAt)
        if (eDate >= monthStart && eDate <= monthEnd) {
          setExpenses(prev => [expense, ...prev])
        }
        setForm(emptyForm())
        setShowAddForm(false)
      } else {
        const data = await res.json()
        setFormError(typeof data.error === 'string' ? data.error : 'Failed to add expense')
      }
    } catch {
      setFormError('Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  async function deleteExpense(id: string) {
    setExpenses(prev => prev.filter(e => e.id !== id))
    try {
      await fetch(`/api/expenses/${id}`, { method: 'DELETE' })
    } catch {
      // silent
    }
  }

  const currencySymbol = currency === 'ILS' ? '₪' : currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : '$'

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
            <DollarSign size={20} className="text-amber-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Expenses</h1>
        </div>
        <Button onClick={() => { setForm(emptyForm()); setShowAddForm(true); setFormError('') }} className="bg-indigo-600 hover:bg-indigo-700 gap-2">
          <Plus size={16} /> Add expense
        </Button>
      </div>

      {/* Month selector + total */}
      <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-6 text-white">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => changeMonth(-1)}
            className="w-9 h-9 bg-white/10 hover:bg-white/20 rounded-xl flex items-center justify-center transition-colors"
          >
            <ChevronLeft size={18} />
          </button>
          <div className="text-center">
            <p className="text-white/70 text-sm font-medium">{format(viewMonth, 'MMMM yyyy')}</p>
            <p className="text-4xl font-bold mt-1">{currencySymbol}{total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            <p className="text-white/60 text-sm mt-1">{monthExpenses.length} transactions</p>
          </div>
          <button
            onClick={() => changeMonth(1)}
            className="w-9 h-9 bg-white/10 hover:bg-white/20 rounded-xl flex items-center justify-center transition-colors"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* Add form */}
      {showAddForm && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Add expense</h3>
            <button onClick={() => setShowAddForm(false)} className="text-gray-400 hover:text-gray-600">
              <X size={18} />
            </button>
          </div>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="expTitle">Title *</Label>
                <Input
                  id="expTitle"
                  placeholder="e.g. Supermarket"
                  value={form.title}
                  onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))}
                  autoFocus
                />
              </div>
              <div>
                <Label htmlFor="amount">Amount *</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">{currencySymbol}</span>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={form.amount}
                    onChange={(e) => setForm(f => ({ ...f, amount: e.target.value }))}
                    className="pl-7"
                  />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="expCategory">Category</Label>
                <select
                  id="expCategory"
                  value={form.category}
                  onChange={(e) => setForm(f => ({ ...f, category: e.target.value as CategoryType }))}
                  className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {CATEGORIES.map(c => (
                    <option key={c} value={c}>{CATEGORY_META[c].label}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="paidAt">Date</Label>
                <Input
                  id="paidAt"
                  type="date"
                  value={form.paidAt}
                  onChange={(e) => setForm(f => ({ ...f, paidAt: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="notes">Notes</Label>
              <Input
                id="notes"
                placeholder="Optional"
                value={form.notes}
                onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))}
              />
            </div>
            {formError && <p className="text-sm text-red-600">{formError}</p>}
            <div className="flex gap-3 pt-1">
              <Button variant="outline" onClick={() => setShowAddForm(false)} className="flex-1">Cancel</Button>
              <Button onClick={addExpense} disabled={submitting} className="flex-1 bg-indigo-600 hover:bg-indigo-700">
                {submitting ? <Loader2 size={16} className="animate-spin" /> : 'Add expense'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Category breakdown */}
      {byCategory.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={16} className="text-indigo-600" />
            <h3 className="font-semibold text-gray-900">Breakdown</h3>
          </div>
          <div className="space-y-3">
            {byCategory.map(({ cat, spent, budget, label, color, bg }) => {
              const pct = budget ? Math.min((spent / budget) * 100, 100) : null
              const over = budget ? spent > budget : false
              return (
                <div key={cat}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span
                        className="text-xs font-semibold px-2 py-0.5 rounded-full"
                        style={{ color, backgroundColor: bg }}
                      >
                        {label}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <span className={cn('font-semibold', over ? 'text-red-600' : 'text-gray-900')}>
                        {currencySymbol}{spent.toFixed(2)}
                      </span>
                      {budget && (
                        <span className="text-gray-400">/ {currencySymbol}{budget.toFixed(2)}</span>
                      )}
                    </div>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    {pct !== null ? (
                      <div
                        className={cn('h-full rounded-full transition-all', over ? 'bg-red-500' : 'bg-indigo-500')}
                        style={{ width: `${pct}%` }}
                      />
                    ) : (
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${Math.min((spent / total) * 100, 100)}%`, backgroundColor: color }}
                      />
                    )}
                  </div>
                  {over && budget && (
                    <p className="text-xs text-red-500 mt-0.5">
                      {currencySymbol}{(spent - budget).toFixed(2)} over budget
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Expense list grouped by date */}
      <div className="space-y-4">
        {sortedDates.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <DollarSign size={40} className="mx-auto mb-3 opacity-20" />
            <p>No expenses this month</p>
            <button
              onClick={() => { setForm(emptyForm()); setShowAddForm(true) }}
              className="mt-2 text-sm text-indigo-600 hover:text-indigo-700"
            >
              Add your first expense
            </button>
          </div>
        ) : (
          sortedDates.map(dateKey => {
            const dayExpenses = groupedByDate.get(dateKey)!
            const dayTotal = dayExpenses.reduce((sum, e) => sum + e.amount, 0)
            const date = new Date(dateKey + 'T12:00:00')
            const isCurrentDay = isSameDay(date, new Date())

            return (
              <div key={dateKey} className="bg-white rounded-2xl border border-gray-100">
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50">
                  <span className="text-sm font-semibold text-gray-700">
                    {isCurrentDay ? 'Today' : format(date, 'EEEE, MMM d')}
                  </span>
                  <span className="text-sm font-semibold text-gray-900">
                    {currencySymbol}{dayTotal.toFixed(2)}
                  </span>
                </div>
                <div className="divide-y divide-gray-50">
                  {dayExpenses.map(expense => {
                    const meta = CATEGORY_META[expense.category as CategoryType] ?? CATEGORY_META.OTHER
                    return (
                      <div key={expense.id} className="flex items-center gap-3 px-4 py-3 group hover:bg-gray-50 transition-colors">
                        <div
                          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-sm"
                          style={{ backgroundColor: meta.bg, color: meta.color }}
                        >
                          {meta.label[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{expense.title}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span
                              className="text-xs px-1.5 py-0.5 rounded-full font-medium"
                              style={{ backgroundColor: meta.bg, color: meta.color }}
                            >
                              {meta.label}
                            </span>
                            {expense.paidBy && (
                              <span className="text-xs text-gray-400">{expense.paidBy.displayName}</span>
                            )}
                            {expense.notes && (
                              <span className="text-xs text-gray-400 truncate">{expense.notes}</span>
                            )}
                          </div>
                        </div>
                        <span className="font-semibold text-gray-900 text-sm flex-shrink-0">
                          {currencySymbol}{expense.amount.toFixed(2)}
                        </span>
                        <button
                          onClick={() => deleteExpense(expense.id)}
                          className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-all ml-1"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
