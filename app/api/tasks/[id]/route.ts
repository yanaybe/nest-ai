import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import { z } from 'zod'

const patchSchema = z.object({
  title: z.string().min(1).max(300).optional(),
  description: z.string().nullable().optional(),
  status: z.enum(['TODO', 'IN_PROGRESS', 'DONE', 'CANCELLED']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  dueDate: z.string().datetime().nullable().optional(),
  assigneeId: z.string().uuid().nullable().optional(),
  category: z.string().nullable().optional(),
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

    const task = await db.task.update({
      where: { id, householdId: member.householdId },
      data: {
        ...data,
        dueDate: data.dueDate !== undefined
          ? (data.dueDate ? new Date(data.dueDate) : null)
          : undefined,
        completedAt: data.status === 'DONE' ? new Date() : undefined,
      },
      include: { assignee: true, creator: true },
    })

    return NextResponse.json({ task })
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.issues }, { status: 400 })
    console.error('PATCH task error:', err)
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

    await db.task.delete({
      where: { id, householdId: member.householdId },
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('DELETE task error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
