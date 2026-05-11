import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import { z } from 'zod'

const UpdateBillSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  amount: z.number().positive().optional(),
  dueDay: z.number().int().min(1).max(31).optional(),
  category: z.string().optional(),
  isAutoPay: z.boolean().optional(),
  notes: z.string().optional(),
  lastPaidAt: z.string().datetime().optional(),
})

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const member = await db.householdMember.findFirst({ where: { userId: user.id } })
  if (!member) return NextResponse.json({ error: 'No household' }, { status: 403 })

  const bill = await db.bill.findUnique({ where: { id } })
  if (!bill || bill.householdId !== member.householdId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const body = await req.json()
  const parsed = UpdateBillSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const updated = await db.bill.update({
    where: { id },
    data: {
      ...parsed.data,
      lastPaidAt: parsed.data.lastPaidAt ? new Date(parsed.data.lastPaidAt) : undefined,
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

  const bill = await db.bill.findUnique({ where: { id } })
  if (!bill || bill.householdId !== member.householdId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  await db.bill.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
