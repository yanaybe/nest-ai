import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import { z } from 'zod'
import { revalidatePath } from 'next/cache'

const createSchema = z.object({
  title: z.string().min(1).max(300),
  description: z.string().optional(),
  location: z.string().optional(),
  startAt: z.string().datetime(),
  endAt: z.string().datetime(),
  allDay: z.boolean().default(false),
  color: z.string().default('#6366f1'),
  category: z.string().optional(),
})

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const member = await db.householdMember.findFirst({ where: { userId: user.id } })
    if (!member) return NextResponse.json({ error: 'No household' }, { status: 403 })

    const { searchParams } = new URL(req.url)
    const from = searchParams.get('from')
    const to = searchParams.get('to')

    const events = await db.calendarEvent.findMany({
      where: {
        householdId: member.householdId,
        ...(from && to && {
          startAt: { gte: new Date(from), lte: new Date(to) },
        }),
      },
      include: { attendees: { include: { member: true } } },
      orderBy: { startAt: 'asc' },
    })

    return NextResponse.json({ events })
  } catch (err) {
    console.error('GET events error:', err)
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

    const event = await db.calendarEvent.create({
      data: {
        householdId: member.householdId,
        title: data.title,
        description: data.description,
        location: data.location,
        startAt: new Date(data.startAt),
        endAt: new Date(data.endAt),
        allDay: data.allDay,
        color: data.color,
        category: data.category,
        attendees: {
          create: { memberId: member.id },
        },
      },
      include: { attendees: { include: { member: true } } },
    })

    revalidatePath('/calendar')
    return NextResponse.json({ event }, { status: 201 })
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.issues }, { status: 400 })
    console.error('POST events error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
