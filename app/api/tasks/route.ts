import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import { z } from 'zod'
import { revalidatePath } from 'next/cache'

const createSchema = z.object({
  title: z.string().min(1).max(300),
  description: z.string().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM'),
  dueDate: z.string().datetime().optional().nullable(),
  assigneeId: z.string().uuid().optional().nullable(),
  category: z.string().optional(),
  tags: z.array(z.string()).optional().default([]),
})

export async function GET(_req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const member = await db.householdMember.findFirst({ where: { userId: user.id } })
    if (!member) return NextResponse.json({ error: 'No household' }, { status: 403 })

    const tasks = await db.task.findMany({
      where: { householdId: member.householdId },
      include: { assignee: true, creator: true },
      orderBy: [{ status: 'asc' }, { priority: 'desc' }, { dueDate: 'asc' }],
    })

    return NextResponse.json({ tasks })
  } catch (err) {
    console.error('GET tasks error:', err)
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
    const data = createSchema.parse(body)

    const task = await db.task.create({
      data: {
        householdId: member.householdId,
        creatorId: member.id,
        title: data.title,
        description: data.description,
        priority: data.priority,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        assigneeId: data.assigneeId ?? null,
        category: data.category,
        tags: data.tags,
      },
      include: { assignee: true, creator: true },
    })

    revalidatePath('/tasks')
    return NextResponse.json({ task }, { status: 201 })
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.issues }, { status: 400 })
    console.error('POST tasks error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
