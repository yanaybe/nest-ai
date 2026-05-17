'use client'

// TODO [AI]:
// The meal planner's AI generation works but has a brittle implementation:
// 1. It hits the full /api/ai/chat endpoint (designed for conversations) just to generate
//    a meal plan. This uses the expensive streaming infrastructure unnecessarily.
//    Better: create a dedicated /api/ai/meals/generate endpoint that uses a single
//    non-streaming OpenAI call with a structured output schema (JSON mode).
//
// 2. The JSON parsing uses a regex to extract JSON from the AI response (`/\[[\s\S]*\]/`).
//    If the AI wraps the JSON in backticks (```json ... ```) or adds any text before/after,
//    the regex fails and falls back to template meals silently. This is a silent failure that
//    users won't understand. Use OpenAI's structured output (response_format: { type: 'json_object' })
//    to guarantee valid JSON without regex parsing.
//
// 3. The meal plan has no dietary preference awareness — it generates suggestions without
//    knowing about allergies, vegetarian/vegan preferences, or cultural restrictions.
//    These should be stored as household memories and passed in the AI generation prompt.
//    A meal plan that suggests "Beef stir-fry" to a vegetarian family is a trust breaker.

// TODO [FEATURE]:
// The meal planner is currently disconnected from the grocery list. The "Add to grocery"
// button in the UI exists but likely only adds a few items. The real value is:
// "Generate this week's meal plan" → AI identifies all required ingredients → adds them
// all to the grocery list categorized by store section → user goes shopping once with a
// complete list.
//
// This end-to-end meal-to-grocery flow is the #1 feature that would make Nest genuinely
// valuable for families who meal plan. Without it, meal planning is just a pretty table.

// TODO [UX]:
// The meal planner has no way to view previous weeks' plans. Users might want to repeat
// last week's meal plan or see patterns in what they cook. Add week navigation (like the
// expense tracker's month navigation) to browse meal history.

import { useState } from 'react'
import type { MealPlan } from '@prisma/client'
import { ChefHat, Plus, Sparkles, Loader2, ShoppingCart, X, Edit2, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { EmptyState } from '@/components/ui/empty-state'
import { cn } from '@/lib/utils'
import { format, startOfWeek, addDays } from 'date-fns'
import { useRouter } from 'next/navigation'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const MEAL_TYPES = ['breakfast', 'lunch', 'dinner'] as const
type MealType = typeof MEAL_TYPES[number]

const MEAL_TYPE_STYLE: Record<MealType, { label: string; color: string; bg: string }> = {
  breakfast: { label: 'Breakfast', color: 'text-amber-700',  bg: 'bg-amber-50 border-amber-100' },
  lunch:     { label: 'Lunch',     color: 'text-emerald-700',bg: 'bg-emerald-50 border-emerald-100' },
  dinner:    { label: 'Dinner',    color: 'text-indigo-700', bg: 'bg-indigo-50 border-indigo-100' },
}

type MealsJson = Record<string, Record<MealType, string>>

const MEAL_SUGGESTIONS = [
  'Pasta with marinara sauce',
  'Grilled chicken salad',
  'Tacos with ground beef',
  'Vegetable stir-fry',
  'Homemade pizza',
  'Salmon with roasted veggies',
  'Pancakes',
  'Avocado toast',
  'Greek yogurt with granola',
  'BLT sandwich',
  'Tomato soup',
]

interface Props {
  currentPlan: MealPlan | null
  householdId: string
}

export function MealPlanner({ currentPlan, householdId }: Props) {
  const router = useRouter()
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 })

  const parseMeals = (plan: MealPlan | null): MealsJson => {
    if (!plan) return {}
    try {
      return (plan.meals as MealsJson) ?? {}
    } catch {
      return {}
    }
  }

  const [meals, setMeals] = useState<MealsJson>(parseMeals(currentPlan))
  const [generating, setGenerating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editCell, setEditCell] = useState<{ day: string; type: MealType } | null>(null)
  const [editValue, setEditValue] = useState('')
  const [addingToGrocery, setAddingToGrocery] = useState(false)

  function getMeal(day: string, type: MealType): string {
    return meals[day]?.[type] ?? ''
  }

  function setMeal(day: string, type: MealType, value: string) {
    setMeals((prev) => ({
      ...prev,
      [day]: { ...prev[day], [type]: value },
    }))
  }

  function startEdit(day: string, type: MealType) {
    setEditCell({ day, type })
    setEditValue(getMeal(day, type))
  }

  function commitEdit() {
    if (!editCell) return
    setMeal(editCell.day, editCell.type, editValue.trim())
    setEditCell(null)
    setEditValue('')
  }

  async function savePlan() {
    setSaving(true)
    try {
      await fetch('/api/meals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weekStart: weekStart.toISOString(), meals }),
      })
      router.refresh()
    } finally {
      setSaving(false)
    }
  }

  async function generateWithAI() {
    setGenerating(true)
    try {
      const res = await fetch('/api/ai/meals', { method: 'POST' })
      if (res.ok) {
        const { meals: generated } = await res.json()
        if (generated && typeof generated === 'object') {
          setMeals(generated as MealsJson)
        }
      }
    } finally {
      setGenerating(false)
    }
  }

  async function addAllToGrocery() {
    setAddingToGrocery(true)
    try {
      // Collect unique meal ingredients hint
      const allMeals = Object.values(meals).flatMap((day) => Object.values(day)).filter(Boolean)
      await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{
            role: 'user',
            content: `Add grocery ingredients for these meals to my shopping list: ${allMeals.join(', ')}. Just the key ingredients needed.`
          }]
        }),
      })
      router.push('/grocery')
    } finally {
      setAddingToGrocery(false)
    }
  }

  const hasMeals = Object.keys(meals).length > 0

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto animate-fade-in-up">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Meal Planner</h1>
          <p className="text-gray-400 text-sm mt-0.5">
            Week of {format(weekStart, 'MMMM d, yyyy')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {hasMeals && (
            <>
              <Button
                variant="outline"
                onClick={addAllToGrocery}
                disabled={addingToGrocery}
                className="gap-1.5 h-9 text-xs hidden sm:flex"
              >
                {addingToGrocery ? <Loader2 size={13} className="animate-spin" /> : <ShoppingCart size={13} />}
                To grocery
              </Button>
              <Button
                variant="outline"
                onClick={savePlan}
                disabled={saving}
                className="gap-1.5 h-9 text-xs"
              >
                {saving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                Save
              </Button>
            </>
          )}
          <Button
            onClick={generateWithAI}
            disabled={generating}
            className="bg-indigo-600 hover:bg-indigo-700 gap-2 h-9 text-xs press-effect"
          >
            {generating ? (
              <><Loader2 size={13} className="animate-spin" /> Generating…</>
            ) : (
              <><Sparkles size={13} /> AI suggest</>
            )}
          </Button>
        </div>
      </div>

      {!hasMeals ? (
        <EmptyState
          icon={ChefHat}
          title="No meal plan yet"
          description="Let AI suggest a balanced meal plan for the week, or add meals manually by clicking any cell."
          iconBg="bg-rose-50"
          iconColor="text-rose-500"
          action={
            <Button
              onClick={generateWithAI}
              disabled={generating}
              className="bg-indigo-600 hover:bg-indigo-700 gap-2 press-effect"
            >
              {generating ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
              Generate with AI
            </Button>
          }
        />
      ) : (
        <>
          {/* Desktop: full grid */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider py-2 pr-4 w-28">Day</th>
                  {MEAL_TYPES.map((type) => (
                    <th key={type} className="text-left text-xs font-semibold uppercase tracking-wider py-2 px-3">
                      <span className={cn('font-semibold', MEAL_TYPE_STYLE[type].color)}>
                        {MEAL_TYPE_STYLE[type].label}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {DAYS.map((day, i) => {
                  const date = addDays(weekStart, i)
                  const isToday = format(date, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')
                  return (
                    <tr key={day} className={cn('border-t border-gray-100', isToday && 'bg-indigo-50/30')}>
                      <td className="py-3 pr-4">
                        <div>
                          <p className={cn('text-sm font-semibold', isToday ? 'text-indigo-700' : 'text-gray-700')}>{day}</p>
                          <p className="text-[11px] text-gray-400">{format(date, 'MMM d')}</p>
                        </div>
                      </td>
                      {MEAL_TYPES.map((type) => {
                        const meal = getMeal(day, type)
                        const isEditing = editCell?.day === day && editCell?.type === type
                        const style = MEAL_TYPE_STYLE[type]
                        return (
                          <td key={type} className="py-2 px-2">
                            {isEditing ? (
                              <div className="flex items-center gap-1">
                                <Input
                                  value={editValue}
                                  onChange={(e) => setEditValue(e.target.value)}
                                  onBlur={commitEdit}
                                  onKeyDown={(e) => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') setEditCell(null) }}
                                  autoFocus
                                  className="h-8 text-xs"
                                  list={`suggestions-${day}-${type}`}
                                />
                                <datalist id={`suggestions-${day}-${type}`}>
                                  {MEAL_SUGGESTIONS.map((s) => <option key={s} value={s} />)}
                                </datalist>
                              </div>
                            ) : (
                              <button
                                onClick={() => startEdit(day, type)}
                                className={cn(
                                  'w-full text-left rounded-xl px-3 py-2 text-xs border transition-all group min-h-[36px]',
                                  meal ? `${style.bg} ${style.color} font-medium` : 'bg-gray-50 border-gray-100 text-gray-300 hover:bg-gray-100'
                                )}
                              >
                                {meal || (
                                  <span className="flex items-center gap-1">
                                    <Plus size={11} /> Add meal
                                  </span>
                                )}
                              </button>
                            )}
                          </td>
                        )
                      })}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile: stacked cards */}
          <div className="md:hidden space-y-4">
            {DAYS.map((day, i) => {
              const date = addDays(weekStart, i)
              const isToday = format(date, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')
              return (
                <div key={day} className={cn('bg-white rounded-2xl border p-4', isToday ? 'border-indigo-200' : 'border-gray-100')}>
                  <div className="flex items-center gap-2 mb-3">
                    <p className={cn('font-semibold text-sm', isToday ? 'text-indigo-700' : 'text-gray-800')}>{day}</p>
                    <p className="text-xs text-gray-400">{format(date, 'MMM d')}</p>
                    {isToday && <span className="text-[10px] bg-indigo-600 text-white px-2 py-0.5 rounded-full font-semibold ml-auto">Today</span>}
                  </div>
                  <div className="space-y-2">
                    {MEAL_TYPES.map((type) => {
                      const meal = getMeal(day, type)
                      const style = MEAL_TYPE_STYLE[type]
                      const isEditing = editCell?.day === day && editCell?.type === type
                      return (
                        <div key={type} className="flex items-center gap-2">
                          <span className={cn('text-[10px] font-semibold uppercase w-16 flex-shrink-0', style.color)}>
                            {style.label}
                          </span>
                          {isEditing ? (
                            <Input
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onBlur={commitEdit}
                              onKeyDown={(e) => { if (e.key === 'Enter') commitEdit() }}
                              autoFocus
                              className="h-8 text-xs flex-1"
                            />
                          ) : (
                            <button
                              onClick={() => startEdit(day, type)}
                              className={cn('flex-1 text-left text-xs rounded-lg px-2.5 py-1.5 border transition-all', meal ? `${style.bg} ${style.color} font-medium border-transparent` : 'text-gray-300 border-gray-100 hover:bg-gray-50')}
                            >
                              {meal || '+ Add'}
                            </button>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Actions */}
          <div className="flex gap-3 mt-6 sm:hidden">
            <Button variant="outline" onClick={addAllToGrocery} disabled={addingToGrocery} className="flex-1 gap-2">
              {addingToGrocery ? <Loader2 size={14} className="animate-spin" /> : <ShoppingCart size={14} />}
              To grocery
            </Button>
            <Button onClick={savePlan} disabled={saving} className="flex-1 bg-indigo-600 hover:bg-indigo-700 gap-2">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              Save plan
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
