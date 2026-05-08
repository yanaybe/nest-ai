import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import { CalendarView } from '@/components/calendar/calendar-view'
import { subMonths, addMonths, startOfMonth, endOfMonth } from 'date-fns'

export default async function CalendarPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const member = await db.householdMember.findFirst({
    where: { userId: user.id },
    include: { household: true },
  })
  if (!member) redirect('/onboarding')

  const now = new Date()
  const from = startOfMonth(subMonths(now, 1))
  const to = endOfMonth(addMonths(now, 2))

  const events = await db.calendarEvent.findMany({
    where: {
      householdId: member.householdId,
      startAt: { gte: from, lte: to },
    },
    include: {
      attendees: {
        include: { member: true },
      },
    },
    orderBy: { startAt: 'asc' },
  })

  return <CalendarView initialEvents={events} />
}
