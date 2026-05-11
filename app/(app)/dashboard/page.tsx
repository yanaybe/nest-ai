import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import { redirect } from 'next/navigation'
import { DashboardContent } from '@/components/dashboard/dashboard-content'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const member = await db.householdMember.findFirst({
    where: { userId: user.id },
    include: { household: { include: { members: true } } },
  })
  if (!member) redirect('/onboarding')

  const householdId = member.householdId
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1)

  const [pendingTasks, groceryItems, upcomingEvents, recentExpenses] = await Promise.all([
    db.task.findMany({
      where: { householdId, status: { in: ['TODO', 'IN_PROGRESS'] } },
      include: { assignee: true },
      orderBy: [{ priority: 'desc' }, { dueDate: 'asc' }],
      take: 5,
    }),
    db.groceryItem.findMany({
      where: { householdId, checked: false },
      orderBy: [{ urgent: 'desc' }, { createdAt: 'asc' }],
      take: 6,
    }),
    db.calendarEvent.findMany({
      where: { householdId, startAt: { gte: new Date() } },
      orderBy: { startAt: 'asc' },
      take: 5,
    }),
    db.expense.findMany({
      where: { householdId, paidAt: { gte: monthStart } },
      orderBy: { paidAt: 'desc' },
      take: 5,
    }),
  ])

  const totalSpentThisMonth = recentExpenses.reduce((sum: number, e: { amount: number }) => sum + e.amount, 0)

  return (
    <DashboardContent
      member={member}
      household={member.household}
      pendingTasks={pendingTasks}
      groceryItems={groceryItems}
      upcomingEvents={upcomingEvents}
      totalSpentThisMonth={totalSpentThisMonth}
      recentExpenses={recentExpenses}
    />
  )
}
