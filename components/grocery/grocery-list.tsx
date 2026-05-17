'use client'

// TODO [UX]:
// The grocery list is the most-used feature for most households — it's checked multiple
// times per week during shopping. The current UI works but misses features that matter in the
// real-world context (shopping in a store, one hand on a cart):
//
// 1. NO item grouping by store aisle/section:
//    When shopping, users need items grouped by where they are in the store (produce, dairy,
//    bakery, etc.) — not sorted by urgency. The category filter helps but doesn't auto-group.
//    Add: "Shopping mode" that groups items by category with large, tap-friendly checkboxes.
//
// 2. NO quick-add via voice or barcode:
//    The add form requires 4 taps minimum (Add item → type name → category → add).
//    In a kitchen, users want to say "milk" or scan a barcode and have it added instantly.
//    Consider: Web Speech API for voice add, and a barcode scanning button using the camera.
//
// 3. NO shared shopping — when multiple family members shop simultaneously, they can both
//    check the same item without knowing the other did it. Need real-time sync so both
//    users see the same checked state (Supabase realtime subscriptions).
//
// 4. NO price tracking — estimatedCost is in the schema but not shown. If all items have
//    estimated costs, show a running total ("Estimated total: ~$47") that updates as you check off.
//
// TODO [PERFORMANCE]:
// The grocery list loads all items (unchecked + 7-day checked history) on initial render.
// For households that have been using Nest for months, this could be hundreds of items.
// The component uses useOptimistic correctly for check/uncheck, but the initial data fetch
// (server-side) has no pagination. Add: virtual scrolling or pagination for large lists.

import { useState, useOptimistic, useTransition, useEffect } from 'react'
import type { GroceryItem } from '@prisma/client'
import { ShoppingCart, Plus, Flame, Trash2, X, Check, Loader2, RotateCcw } from 'lucide-react'
import { format, subDays } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

const CATEGORIES = ['All', 'Produce', 'Dairy', 'Meat', 'Bakery', 'Pantry', 'Frozen', 'Beverages', 'Household', 'Other']
const CATEGORY_COLORS: Record<string, string> = {
  Produce: 'bg-green-100 text-green-700',
  Dairy: 'bg-blue-100 text-blue-700',
  Meat: 'bg-red-100 text-red-700',
  Bakery: 'bg-amber-100 text-amber-700',
  Pantry: 'bg-orange-100 text-orange-700',
  Frozen: 'bg-cyan-100 text-cyan-700',
  Beverages: 'bg-purple-100 text-purple-700',
  Household: 'bg-gray-100 text-gray-700',
  Other: 'bg-gray-100 text-gray-600',
}

interface Props {
  initialItems: GroceryItem[]
}

interface AddForm {
  name: string
  quantity: string
  unit: string
  category: string
  urgent: boolean
}

const emptyForm: AddForm = { name: '', quantity: '', unit: '', category: '', urgent: false }

interface DeletePending {
  id: string
  name: string
  item: GroceryItem
  timer: ReturnType<typeof setTimeout>
}

export function GroceryList({ initialItems }: Props) {
  const [items, setItems] = useState<GroceryItem[]>(initialItems)
  const [activeTab, setActiveTab] = useState<'tobuy' | 'done'>('tobuy')
  const [categoryFilter, setCategoryFilter] = useState('All')
  const [showAddForm, setShowAddForm] = useState(false)
  const [form, setForm] = useState<AddForm>(emptyForm)
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [clearingChecked, setClearingChecked] = useState(false)
  const [deletePending, setDeletePending] = useState<DeletePending | null>(null)
  const [, startTransition] = useTransition()
  const [optimisticItems, applyOptimistic] = useOptimistic(items, (state, update: Partial<GroceryItem> & { id: string }) => {
    return state.map(i => i.id === update.id ? { ...i, ...update } : i)
  })

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (deletePending) clearTimeout(deletePending.timer)
    }
  }, [deletePending])

  const sevenDaysAgo = subDays(new Date(), 7)
  const unchecked = optimisticItems.filter(i => !i.checked)
  const recentlyChecked = optimisticItems.filter(i => i.checked && i.checkedAt && new Date(i.checkedAt) >= sevenDaysAgo)

  function filterByCategory(list: GroceryItem[]) {
    if (categoryFilter === 'All') return list
    return list.filter(i => i.category === categoryFilter)
  }

  const displayItems = activeTab === 'tobuy'
    ? filterByCategory(unchecked).sort((a, b) => (b.urgent ? 1 : 0) - (a.urgent ? 1 : 0))
    : filterByCategory(recentlyChecked)

  async function toggleCheck(item: GroceryItem) {
    const newChecked = !item.checked
    startTransition(() => {
      applyOptimistic({ id: item.id, checked: newChecked, checkedAt: newChecked ? new Date() : null })
    })
    try {
      const res = await fetch(`/api/grocery/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ checked: newChecked }),
      })
      if (res.ok) {
        const { item: updated } = await res.json()
        setItems(prev => prev.map(i => i.id === updated.id ? updated : i))
      } else {
        // Revert
        setItems(prev => [...prev])
      }
    } catch {
      setItems(prev => [...prev])
    }
  }

  async function deleteItem(id: string) {
    const item = items.find(i => i.id === id)
    if (!item) return

    // Cancel any pending delete first
    if (deletePending) {
      clearTimeout(deletePending.timer)
      // Fire the previous pending delete immediately
      fetch(`/api/grocery/${deletePending.id}`, { method: 'DELETE' }).catch(() => {})
    }

    // Optimistically remove from UI
    setItems(prev => prev.filter(i => i.id !== id))

    // Start 4-second timer before actually deleting
    const timer = setTimeout(async () => {
      try {
        await fetch(`/api/grocery/${id}`, { method: 'DELETE' })
      } catch {
        // silent
      }
      setDeletePending(null)
    }, 4000)

    setDeletePending({ id, name: item.name, item, timer })
  }

  function undoDelete() {
    if (!deletePending) return
    clearTimeout(deletePending.timer)
    setItems(prev => [deletePending.item, ...prev])
    setDeletePending(null)
  }

  async function addItem() {
    setFormError('')
    if (!form.name.trim()) {
      setFormError('Item name is required')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/grocery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          quantity: form.quantity ? parseFloat(form.quantity) : undefined,
          unit: form.unit.trim() || undefined,
          category: form.category || undefined,
          urgent: form.urgent,
        }),
      })
      if (res.ok) {
        const { item } = await res.json()
        setItems(prev => [item, ...prev])
        setForm(emptyForm)
        setShowAddForm(false)
      } else {
        const data = await res.json()
        setFormError(typeof data.error === 'string' ? data.error : 'Failed to add item')
      }
    } catch {
      setFormError('Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  async function clearChecked() {
    setClearingChecked(true)
    const checkedItems = items.filter(i => i.checked)
    setItems(prev => prev.filter(i => !i.checked))
    try {
      const ids = checkedItems.map(i => i.id)
      await fetch('/api/grocery/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      })
    } catch {
      // silent
    } finally {
      setClearingChecked(false)
    }
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6 relative">
      {/* Undo toast */}
      {deletePending && (
        <div className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-gray-900 text-white px-4 py-3 rounded-2xl shadow-xl animate-fade-in-up">
          <span className="text-sm">Removed <span className="font-medium">{deletePending.name}</span></span>
          <span className="text-gray-500">·</span>
          <button
            onClick={undoDelete}
            className="text-sm font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1.5 transition-colors"
          >
            <RotateCcw size={13} /> Undo
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
            <ShoppingCart size={20} className="text-emerald-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Grocery List</h1>
            <p className="text-sm text-gray-500">{unchecked.length} items to buy</p>
          </div>
        </div>
        <Button onClick={() => { setShowAddForm(true); setForm(emptyForm); setFormError('') }} className="bg-indigo-600 hover:bg-indigo-700 gap-2">
          <Plus size={16} /> Add item
        </Button>
      </div>

      {/* Add form */}
      {showAddForm && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Add item</h3>
            <button onClick={() => setShowAddForm(false)} className="text-gray-400 hover:text-gray-600">
              <X size={18} />
            </button>
          </div>
          <div className="space-y-3">
            <div>
              <Label htmlFor="itemName">Name *</Label>
              <Input
                id="itemName"
                placeholder="e.g. Milk"
                value={form.name}
                onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                onKeyDown={(e) => e.key === 'Enter' && addItem()}
                autoFocus
              />
            </div>
            <div className="flex gap-3">
              <div className="flex-1">
                <Label htmlFor="qty">Quantity</Label>
                <Input
                  id="qty"
                  type="number"
                  placeholder="2"
                  value={form.quantity}
                  onChange={(e) => setForm(f => ({ ...f, quantity: e.target.value }))}
                  min={0}
                />
              </div>
              <div className="flex-1">
                <Label htmlFor="unit">Unit</Label>
                <Input
                  id="unit"
                  placeholder="e.g. kg, L"
                  value={form.unit}
                  onChange={(e) => setForm(f => ({ ...f, unit: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="cat">Category</Label>
              <select
                id="cat"
                value={form.category}
                onChange={(e) => setForm(f => ({ ...f, category: e.target.value }))}
                className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">Select category</option>
                {CATEGORIES.filter(c => c !== 'All').map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.urgent}
                onChange={(e) => setForm(f => ({ ...f, urgent: e.target.checked }))}
                className="w-4 h-4 accent-red-500"
              />
              <span className="text-sm text-gray-700 flex items-center gap-1.5">
                <Flame size={14} className="text-red-500" /> Mark as urgent
              </span>
            </label>
            {formError && <p className="text-sm text-red-600">{formError}</p>}
            <div className="flex gap-3 pt-1">
              <Button variant="outline" onClick={() => setShowAddForm(false)} className="flex-1">Cancel</Button>
              <Button onClick={addItem} disabled={submitting} className="flex-1 bg-indigo-600 hover:bg-indigo-700">
                {submitting ? <Loader2 size={16} className="animate-spin" /> : 'Add item'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white rounded-2xl border border-gray-100">
        <div className="flex border-b border-gray-100">
          {(['tobuy', 'done'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                'flex-1 py-3 text-sm font-medium transition-colors',
                activeTab === tab ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500 hover:text-gray-700'
              )}
            >
              {tab === 'tobuy' ? `To Buy (${unchecked.length})` : `Done (${recentlyChecked.length})`}
            </button>
          ))}
        </div>

        {/* Category filter */}
        <div className="flex gap-2 p-3 overflow-x-auto scrollbar-hide border-b border-gray-50">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={cn(
                'px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors',
                categoryFilter === cat
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              )}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Items */}
        <div className="divide-y divide-gray-50">
          {displayItems.length === 0 ? (
            <div className="py-12 text-center text-gray-400">
              <ShoppingCart size={32} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">
                {activeTab === 'tobuy' ? 'Nothing to buy — enjoy the break!' : 'No recently checked items'}
              </p>
            </div>
          ) : (
            displayItems.map(item => (
              <div
                key={item.id}
                className={cn(
                  'flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors group',
                  item.checked && 'opacity-60'
                )}
              >
                <button
                  onClick={() => toggleCheck(item)}
                  className={cn(
                    'w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all',
                    item.checked ? 'bg-emerald-500 border-emerald-500' : 'border-gray-300 hover:border-indigo-500'
                  )}
                >
                  {item.checked && <Check size={12} className="text-white" />}
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={cn('text-sm font-medium text-gray-900', item.checked && 'line-through text-gray-400')}>
                      {item.name}
                    </span>
                    {item.urgent && !item.checked && (
                      <Flame size={14} className="text-red-500 flex-shrink-0" />
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    {item.quantity && (
                      <span className="text-xs text-gray-400">
                        {item.quantity}{item.unit ? ` ${item.unit}` : ''}
                      </span>
                    )}
                    {item.category && (
                      <span className={cn(
                        'text-xs px-1.5 py-0.5 rounded-full font-medium',
                        CATEGORY_COLORS[item.category] ?? 'bg-gray-100 text-gray-600'
                      )}>
                        {item.category}
                      </span>
                    )}
                    {item.checked && item.checkedAt && (
                      <span className="text-xs text-gray-400">{format(new Date(item.checkedAt), 'MMM d')}</span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => deleteItem(item.id)}
                  className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-all ml-1"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Clear checked */}
        {activeTab === 'done' && recentlyChecked.length > 0 && (
          <div className="p-3 border-t border-gray-100">
            <Button
              variant="outline"
              onClick={clearChecked}
              disabled={clearingChecked}
              className="w-full text-sm text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
            >
              {clearingChecked ? <Loader2 size={14} className="animate-spin mr-2" /> : <Trash2 size={14} className="mr-2" />}
              Clear all checked ({recentlyChecked.length})
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
