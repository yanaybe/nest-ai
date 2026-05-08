import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import { z } from 'zod'

const schema = z.object({
  name: z.string().min(1).max(100),
  displayName: z.string().min(1).max(50),
  timezone: z.string().optional(),
  currency: z.string().length(3).optional(),
  color: z.string().optional(),
})

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { name, displayName, timezone, currency, color } = schema.parse(body)

    // Check if user already has a household
    const existing = await db.householdMember.findFirst({
      where: { userId: user.id },
    })
    if (existing) {
      return NextResponse.json({ error: 'Already in a household' }, { status: 400 })
    }

    const household = await db.household.create({
      data: {
        name,
        timezone: timezone ?? 'UTC',
        currency: currency ?? 'USD',
        members: {
          create: {
            userId: user.id,
            role: 'OWNER',
            displayName,
            color: color ?? '#6366f1',
          },
        },
      },
      include: { members: true },
    })

    return NextResponse.json({ household }, { status: 201 })
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.issues }, { status: 400 })
    console.error('Create household error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
