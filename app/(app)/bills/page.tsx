import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import { redirect } from 'next/navigation'
import { BillsTracker } from '@/components/bills/bills-tracker'

export const dynamic = 'force-dynamic'

export default async function BillsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const member = await db.householdMember.findFirst({ where: { userId: user.id } })
  if (!member) redirect('/onboarding')

  const bills = await db.bill.findMany({
    where: { householdId: member.householdId },
    orderBy: { dueDay: 'asc' },
  })

  return <BillsTracker initialBills={bills} />
}
