import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import { ExpenseTracker } from '@/components/expenses/expense-tracker'
import { startOfMonth, endOfMonth } from 'date-fns'

export default async function ExpensesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const member = await db.householdMember.findFirst({
    where: { userId: user.id },
    include: { household: true },
  })
  if (!member) redirect('/onboarding')

  const householdId = member.householdId
  const now = new Date()

  const [expenses, budgets] = await Promise.all([
    db.expense.findMany({
      where: {
        householdId,
        paidAt: { gte: startOfMonth(now), lte: endOfMonth(now) },
      },
      include: { paidBy: true },
      orderBy: { paidAt: 'desc' },
    }),
    db.budget.findMany({
      where: { householdId },
    }),
  ])

  return (
    <ExpenseTracker
      initialExpenses={expenses}
      initialBudgets={budgets}
      currency={member.household.currency}
    />
  )
}
