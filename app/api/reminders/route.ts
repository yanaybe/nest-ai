import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import { z } from 'zod'

const CreateReminderSchema = z.object({
  title: z.string().min(1).max(200),
  body: z.string().optional(),
  remindAt: z.string().datetime(),
  memberId: z.string().uuid().optional(),
})

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const member = await db.householdMember.findFirst({ where: { userId: user.id } })
  if (!member) return NextResponse.json({ error: 'No household' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const showDismissed = searchParams.get('dismissed') === 'true'

  const reminders = await db.reminder.findMany({
    where: {
      householdId: member.householdId,
      dismissed: showDismissed,
    },
    include: { member: true },
    orderBy: { remindAt: 'asc' },
  })

  return NextResponse.json(reminders)
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const member = await db.householdMember.findFirst({ where: { userId: user.id } })
  if (!member) return NextResponse.json({ error: 'No household' }, { status: 403 })

  const body = await req.json()
  const parsed = CreateReminderSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const reminder = await db.reminder.create({
    data: {
      householdId: member.householdId,
      memberId: parsed.data.memberId ?? member.id,
      title: parsed.data.title,
      body: parsed.data.body,
      remindAt: new Date(parsed.data.remindAt),
    },
    include: { member: true },
  })

  return NextResponse.json(reminder, { status: 201 })
}
