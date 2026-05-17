// TODO [UX / FEATURE]:
// The expense tracker lacks several critical features that users expect from a financial tracking app:
//
// 1. NO receipt scanning — the Expense model has receiptUrl field but there's no upload UI.
//    Adding photo receipt scanning (via OpenAI Vision) would auto-populate title, amount,
//    and category from a photo. This is a premium differentiator.
//
// 2. NO expense splitting — when David pays for dinner for the family, there's no way to
//    split the expense and track who owes whom. The model has paidById but no split logic.
//    This is the core feature of apps like Splitwise, which Nest should compete with.
//
// 3. NO budget enforcement — the Budget model exists but there are no alerts when a category
//    exceeds budget. Add: POST expense → check if category budget is exceeded → create
//    Notification "You've exceeded your Dining budget this month".
//
// 4. NO recurring expense support — isRecurring and recurringRule exist in schema but the UI
//    has no way to create recurring expenses and no cron job to auto-create them.
//
// TODO [SCALABILITY]: The expense GET handler returns ALL expenses for the month with no
// pagination or limit. For high-frequency expense tracking (50+ expenses/month), this is
// fine. But the month's expense data includes JOIN with paidBy for every record — consider
// adding ?includeDetails=false for summary-only views.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { startOfMonth, endOfMonth } from 'date-fns'

const createSchema = z.object({
  title: z.string().min(1).max(300),
  amount: z.number().positive(),
  category: z.enum([
    'GROCERIES', 'DINING', 'TRANSPORT', 'UTILITIES', 'HOUSING',
    'HEALTHCARE', 'EDUCATION', 'ENTERTAINMENT', 'CLOTHING',
    'PERSONAL_CARE', 'SUBSCRIPTIONS', 'SAVINGS', 'OTHER',
  ]),
  paidAt: z.string().datetime().optional(),
  notes: z.string().optional(),
})

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const member = await db.householdMember.findFirst({ where: { userId: user.id } })
    if (!member) return NextResponse.json({ error: 'No household' }, { status: 403 })

    const { searchParams } = new URL(req.url)
    const monthParam = searchParams.get('month') // YYYY-MM

    let fromDate: Date
    let toDate: Date

    if (monthParam) {
      const [year, month] = monthParam.split('-').map(Number)
      const ref = new Date(year, month - 1, 1)
      fromDate = startOfMonth(ref)
      toDate = endOfMonth(ref)
    } else {
      fromDate = startOfMonth(new Date())
      toDate = endOfMonth(new Date())
    }

    const [expenses, budgets] = await Promise.all([
      db.expense.findMany({
        where: {
          householdId: member.householdId,
          paidAt: { gte: fromDate, lte: toDate },
        },
        include: { paidBy: true },
        orderBy: { paidAt: 'desc' },
      }),
      db.budget.findMany({
        where: { householdId: member.householdId },
      }),
    ])

    return NextResponse.json({ expenses, budgets })
  } catch (err) {
    console.error('GET expenses error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const member = await db.householdMember.findFirst({
      where: { userId: user.id },
      include: { household: true },
    })
    if (!member) return NextResponse.json({ error: 'No household' }, { status: 403 })

    const body = await req.json()
    const data = createSchema.parse(body)

    const expense = await db.expense.create({
      data: {
        householdId: member.householdId,
        paidById: member.id,
        title: data.title,
        amount: data.amount,
        currency: member.household.currency ?? 'USD',
        category: data.category,
        paidAt: data.paidAt ? new Date(data.paidAt) : new Date(),
        notes: data.notes,
      },
      include: { paidBy: true },
    })

    revalidatePath('/expenses')
    return NextResponse.json({ expense }, { status: 201 })
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.issues }, { status: 400 })
    console.error('POST expenses error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
