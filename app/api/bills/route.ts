import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import { z } from 'zod'

const CreateBillSchema = z.object({
  name: z.string().min(1).max(100),
  amount: z.number().positive(),
  dueDay: z.number().int().min(1).max(31),
  category: z.string().min(1),
  isAutoPay: z.boolean().optional().default(false),
  notes: z.string().optional(),
})

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const member = await db.householdMember.findFirst({ where: { userId: user.id } })
  if (!member) return NextResponse.json({ error: 'No household' }, { status: 403 })

  const bills = await db.bill.findMany({
    where: { householdId: member.householdId },
    orderBy: { dueDay: 'asc' },
  })

  return NextResponse.json(bills)
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const member = await db.householdMember.findFirst({ where: { userId: user.id } })
  if (!member) return NextResponse.json({ error: 'No household' }, { status: 403 })

  const body = await req.json()
  const parsed = CreateBillSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const bill = await db.bill.create({
    data: { householdId: member.householdId, ...parsed.data },
  })

  return NextResponse.json(bill, { status: 201 })
}
