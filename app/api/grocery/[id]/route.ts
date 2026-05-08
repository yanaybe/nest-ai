import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import { z } from 'zod'
import { revalidatePath } from 'next/cache'

const patchSchema = z.object({
  checked: z.boolean().optional(),
  name: z.string().min(1).max(200).optional(),
  quantity: z.number().nullable().optional(),
  unit: z.string().nullable().optional(),
  category: z.string().nullable().optional(),
  urgent: z.boolean().optional(),
})

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const member = await db.householdMember.findFirst({ where: { userId: user.id } })
    if (!member) return NextResponse.json({ error: 'No household' }, { status: 403 })

    const body = await req.json()
    const data = patchSchema.parse(body)

    const item = await db.groceryItem.update({
      where: { id, householdId: member.householdId },
      data: {
        ...data,
        ...(data.checked !== undefined && {
          checkedBy: data.checked ? member.id : null,
          checkedAt: data.checked ? new Date() : null,
        }),
      },
    })

    revalidatePath('/grocery')
    return NextResponse.json({ item })
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.issues }, { status: 400 })
    console.error('PATCH grocery error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const member = await db.householdMember.findFirst({ where: { userId: user.id } })
    if (!member) return NextResponse.json({ error: 'No household' }, { status: 403 })

    await db.groceryItem.delete({
      where: { id, householdId: member.householdId },
    })

    revalidatePath('/grocery')
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('DELETE grocery error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
