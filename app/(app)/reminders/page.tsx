import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import { redirect } from 'next/navigation'
import { RemindersView } from '@/components/reminders/reminders-view'

export const dynamic = 'force-dynamic'

export default async function RemindersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const member = await db.householdMember.findFirst({
    where: { userId: user.id },
    include: { household: { include: { members: true } } },
  })
  if (!member) redirect('/onboarding')

  const reminders = await db.reminder.findMany({
    where: { householdId: member.householdId },
    include: { member: true },
    orderBy: { remindAt: 'asc' },
  })

  return (
    <RemindersView
      initialReminders={reminders}
      members={member.household.members}
      currentMemberId={member.id}
    />
  )
}
