import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import { z } from 'zod'
import { revalidatePath } from 'next/cache'

const addSchema = z.object({
  name: z.string().min(1).max(200),
  quantity: z.number().optional(),
  unit: z.string().optional(),
  category: z.string().optional(),
  urgent: z.boolean().optional().default(false),
  estimatedCost: z.number().optional(),
})

export async function GET(_req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const member = await db.householdMember.findFirst({ where: { userId: user.id } })
    if (!member) return NextResponse.json({ error: 'No household' }, { status: 403 })

    const items = await db.groceryItem.findMany({
      where: { householdId: member.householdId },
      orderBy: [{ urgent: 'desc' }, { checked: 'asc' }, { createdAt: 'asc' }],
    })

    return NextResponse.json({ items })
  } catch (err) {
    console.error('GET grocery error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const member = await db.householdMember.findFirst({ where: { userId: user.id } })
    if (!member) return NextResponse.json({ error: 'No household' }, { status: 403 })

    const body = await req.json()
    const data = addSchema.parse(body)

    const item = await db.groceryItem.create({
      data: {
        householdId: member.householdId,
        addedBy: member.id,
        ...data,
      },
    })

    revalidatePath('/grocery')
    return NextResponse.json({ item }, { status: 201 })
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.issues }, { status: 400 })
    console.error('POST grocery error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
