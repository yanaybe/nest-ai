import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import { z } from 'zod'

const SaveMealPlanSchema = z.object({
  weekStart: z.string().datetime(),
  meals: z.record(z.string(), z.record(z.string(), z.string())),
})

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const member = await db.householdMember.findFirst({ where: { userId: user.id } })
  if (!member) return NextResponse.json({ error: 'No household' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const weekStart = searchParams.get('weekStart')

  const where = weekStart
    ? { householdId: member.householdId, weekStart: new Date(weekStart) }
    : { householdId: member.householdId }

  const plans = await db.mealPlan.findMany({
    where,
    orderBy: { weekStart: 'desc' },
    take: 4,
  })

  return NextResponse.json(plans)
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const member = await db.householdMember.findFirst({ where: { userId: user.id } })
  if (!member) return NextResponse.json({ error: 'No household' }, { status: 403 })

  const body = await req.json()
  const parsed = SaveMealPlanSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const plan = await db.mealPlan.upsert({
    where: {
      householdId_weekStart: {
        householdId: member.householdId,
        weekStart: new Date(parsed.data.weekStart),
      },
    },
    update: { meals: parsed.data.meals, generatedBy: member.id },
    create: {
      householdId: member.householdId,
      weekStart: new Date(parsed.data.weekStart),
      meals: parsed.data.meals,
      generatedBy: member.id,
    },
  })

  return NextResponse.json(plan, { status: 201 })
}
