import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import { GroceryList } from '@/components/grocery/grocery-list'

export default async function GroceryPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const member = await db.householdMember.findFirst({
    where: { userId: user.id },
    include: { household: true },
  })
  if (!member) redirect('/onboarding')

  const items = await db.groceryItem.findMany({
    where: { householdId: member.householdId },
    orderBy: [{ urgent: 'desc' }, { checked: 'asc' }, { createdAt: 'asc' }],
  })

  return <GroceryList initialItems={items} />
}
