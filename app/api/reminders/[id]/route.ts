import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import { z } from 'zod'

const UpdateReminderSchema = z.object({
  dismissed: z.boolean().optional(),
  title: z.string().min(1).max(200).optional(),
  remindAt: z.string().datetime().optional(),
})

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const member = await db.householdMember.findFirst({ where: { userId: user.id } })
  if (!member) return NextResponse.json({ error: 'No household' }, { status: 403 })

  const reminder = await db.reminder.findUnique({ where: { id } })
  if (!reminder || reminder.householdId !== member.householdId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const body = await req.json()
  const parsed = UpdateReminderSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const updated = await db.reminder.update({
    where: { id },
    data: {
      ...parsed.data,
      remindAt: parsed.data.remindAt ? new Date(parsed.data.remindAt) : undefined,
    },
  })

  return NextResponse.json(updated)
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const member = await db.householdMember.findFirst({ where: { userId: user.id } })
  if (!member) return NextResponse.json({ error: 'No household' }, { status: 403 })

  const reminder = await db.reminder.findUnique({ where: { id } })
  if (!reminder || reminder.householdId !== member.householdId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  await db.reminder.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
