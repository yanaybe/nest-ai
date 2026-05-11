import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import { redirect } from 'next/navigation'
import { MealPlanner } from '@/components/meals/meal-planner'
import { startOfWeek } from 'date-fns'

export const dynamic = 'force-dynamic'

export default async function MealsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const member = await db.householdMember.findFirst({ where: { userId: user.id } })
  if (!member) redirect('/onboarding')

  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 })

  const currentPlan = await db.mealPlan.findUnique({
    where: {
      householdId_weekStart: {
        householdId: member.householdId,
        weekStart,
      },
    },
  })

  return <MealPlanner currentPlan={currentPlan} householdId={member.householdId} />
}
