'use client'

import { useState } from 'react'
import type { Bill } from '@prisma/client'
import {
  Receipt, Plus, Check, Trash2, CreditCard, Zap,
  Wifi, Home, Car, Phone, Shield, Tv, MoreVertical, X
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { cn } from '@/lib/utils'
import { format, addDays, startOfMonth, getDate } from 'date-fns'
import { useRouter } from 'next/navigation'

const CATEGORY_ICONS: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  utilities: { icon: Zap,      color: 'text-amber-600',  bg: 'bg-amber-50' },
  internet:  { icon: Wifi,     color: 'text-sky-600',    bg: 'bg-sky-50' },
  rent:      { icon: Home,     color: 'text-indigo-600', bg: 'bg-indigo-50' },
  insurance: { icon: Shield,   color: 'text-emerald-600',bg: 'bg-emerald-50' },
  car:       { icon: Car,      color: 'text-violet-600', bg: 'bg-violet-50' },
  phone:     { icon: Phone,    color: 'text-pink-600',   bg: 'bg-pink-50' },
  streaming: { icon: Tv,       color: 'text-red-600',    bg: 'bg-red-50' },
  credit:    { icon: CreditCard,color: 'text-orange-600',bg: 'bg-orange-50' },
  other:     { icon: Receipt,  color: 'text-gray-600',   bg: 'bg-gray-100' },
}

const CATEGORIES = Object.keys(CATEGORY_ICONS)

function getDueDaysFromNow(dueDay: number): number {
  const today = new Date()
  const currentDay = getDate(today)
  if (dueDay >= currentDay) return dueDay - currentDay
  // Due next month
  const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, dueDay)
  return Math.ceil((nextMonth.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

function BillCard({
  bill,
  onMarkPaid,
  onDelete,
}: {
  bill: Bill
  onMarkPaid: (id: string) => void
  onDelete: (id: string) => void
}) {
  const catKey = bill.category.toLowerCase()
  const cfg = CATEGORY_ICONS[catKey] ?? CATEGORY_ICONS.other
  const Icon = cfg.icon
  const daysUntil = getDueDaysFromNow(bill.dueDay)
  const isOverdue = daysUntil < 0
  const isDueSoon = daysUntil >= 0 && daysUntil <= 5
  const paidThisMonth = bill.lastPaidAt && getDate(new Date(bill.lastPaidAt)) > 0 &&
    new Date(bill.lastPaidAt) >= startOfMonth(new Date())

  return (
    <div className={cn(
      'bg-white rounded-2xl border p-5 transition-all',
      isOverdue ? 'border-red-200 bg-red-50/30' : isDueSoon ? 'border-amber-200' : 'border-gray-100',
      paidThisMonth && 'opacity-60'
    )}>
      <div className="flex items-start gap-3">
        <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0', cfg.bg)}>
          <Icon size={18} className={cfg.color} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-semibold text-gray-900 text-sm">{bill.name}</p>
              <p className="text-xs text-gray-400 capitalize mt-0.5">{bill.category}</p>
            </div>
            <p className="font-bold text-gray-900 text-base tabular-nums flex-shrink-0">
              ${bill.amount.toFixed(2)}
            </p>
          </div>

          <div className="flex items-center gap-2 mt-3 flex-wrap">
            {paidThisMonth ? (
              <Badge variant="success" size="sm">Paid this month</Badge>
            ) : isOverdue ? (
              <Badge variant="danger" size="sm">Overdue</Badge>
            ) : isDueSoon ? (
              <Badge variant="warning" size="sm">Due in {daysUntil}d</Badge>
            ) : (
              <Badge variant="secondary" size="sm">Due on {bill.dueDay}th</Badge>
            )}
            {bill.isAutoPay && (
              <Badge variant="sky" size="sm">Auto-pay</Badge>
            )}
          </div>
        </div>
      </div>

      {!paidThisMonth && (
        <div className="flex gap-2 mt-4">
          <button
            onClick={() => onMarkPaid(bill.id)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl transition-colors press-effect"
          >
            <Check size={13} />
            Mark paid
          </button>
          <button
            onClick={() => onDelete(bill.id)}
            className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors press-effect"
          >
            <Trash2 size={14} />
          </button>
        </div>
      )}
    </div>
  )
}

interface Props {
  initialBills: Bill[]
}

export function BillsTracker({ initialBills }: Props) {
  const router = useRouter()
  const [bills, setBills] = useState(initialBills)
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(false)

  const [name, setName] = useState('')
  const [amount, setAmount] = useState('')
  const [dueDay, setDueDay] = useState('1')
  const [category, setCategory] = useState('utilities')
  const [isAutoPay, setIsAutoPay] = useState(false)

  const totalMonthly = bills.reduce((s, b) => s + b.amount, 0)
  const dueThisWeek = bills.filter((b) => {
    const d = getDueDaysFromNow(b.dueDay)
    return d >= 0 && d <= 7
  })

  async function handleAdd() {
    if (!name.trim() || !amount) return
    setLoading(true)
    try {
      const res = await fetch('/api/bills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          amount: parseFloat(amount),
          dueDay: parseInt(dueDay),
          category,
          isAutoPay,
        }),
      })
      if (res.ok) {
        const bill = await res.json()
        setBills((prev) => [...prev, bill].sort((a, b) => a.dueDay - b.dueDay))
        setName(''); setAmount(''); setDueDay('1'); setCategory('utilities'); setIsAutoPay(false)
        setShowForm(false)
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleMarkPaid(id: string) {
    await fetch(`/api/bills/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lastPaidAt: new Date().toISOString() }),
    })
    setBills((prev) => prev.map((b) => b.id === id ? { ...b, lastPaidAt: new Date() } : b))
  }

  async function handleDelete(id: string) {
    await fetch(`/api/bills/${id}`, { method: 'DELETE' })
    setBills((prev) => prev.filter((b) => b.id !== id))
  }

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto animate-fade-in-up">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bills</h1>
          <p className="text-gray-400 text-sm mt-0.5">Track recurring monthly bills</p>
        </div>
        <Button
          onClick={() => setShowForm(true)}
          className="bg-indigo-600 hover:bg-indigo-700 gap-2 h-9 text-xs press-effect"
        >
          <Plus size={14} />
          Add bill
        </Button>
      </div>

      {/* Summary */}
      {bills.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
          <div className="bg-white rounded-2xl p-4 border border-gray-100">
            <p className="text-xs text-gray-400 mb-1">Monthly total</p>
            <p className="text-2xl font-bold text-gray-900">${totalMonthly.toFixed(0)}</p>
          </div>
          <div className="bg-white rounded-2xl p-4 border border-gray-100">
            <p className="text-xs text-gray-400 mb-1">Due this week</p>
            <p className="text-2xl font-bold text-amber-600">{dueThisWeek.length}</p>
          </div>
          <div className="bg-white rounded-2xl p-4 border border-gray-100 col-span-2 sm:col-span-1">
            <p className="text-xs text-gray-400 mb-1">Total bills</p>
            <p className="text-2xl font-bold text-gray-900">{bills.length}</p>
          </div>
        </div>
      )}

      {/* Add form */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-6 animate-scale-in">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">New bill</h3>
            <button onClick={() => setShowForm(false)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 press-effect">
              <X size={14} />
            </button>
          </div>
          <div className="grid sm:grid-cols-2 gap-4 mb-4">
            <div className="space-y-1.5">
              <Label>Bill name</Label>
              <Input placeholder="e.g. Electric bill" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
            </div>
            <div className="space-y-1.5">
              <Label>Monthly amount ($)</Label>
              <Input type="number" placeholder="0.00" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Due day of month</Label>
              <Input type="number" min="1" max="31" value={dueDay} onChange={(e) => setDueDay(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Category</Label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring capitalize"
              >
                {CATEGORIES.map((c) => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
              </select>
            </div>
          </div>
          <div className="flex items-center gap-3 mb-4">
            <input type="checkbox" id="autopay" checked={isAutoPay} onChange={(e) => setIsAutoPay(e.target.checked)} className="w-4 h-4 rounded accent-indigo-600" />
            <Label htmlFor="autopay" className="cursor-pointer">Auto-pay enabled</Label>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={loading || !name.trim() || !amount} className="bg-indigo-600 hover:bg-indigo-700 flex-1">
              Add bill
            </Button>
          </div>
        </div>
      )}

      {/* Bills list */}
      {bills.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="No bills yet"
          description="Add your recurring bills to track them each month and never miss a payment."
          iconBg="bg-orange-50"
          iconColor="text-orange-500"
          action={
            <Button onClick={() => setShowForm(true)} className="bg-indigo-600 hover:bg-indigo-700 gap-2 press-effect">
              <Plus size={14} />
              Add your first bill
            </Button>
          }
        />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {bills.map((bill) => (
            <BillCard key={bill.id} bill={bill} onMarkPaid={handleMarkPaid} onDelete={handleDelete} />
          ))}
        </div>
      )}
    </div>
  )
}
