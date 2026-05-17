import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { joinRatelimit } from '@/lib/redis'

const schema = z.object({
  inviteCode: z.string().length(8),
  displayName: z.string().min(1).max(50),
  color: z.string().optional(),
})

export async function POST(req: NextRequest) {
  try {
    // Rate limit by IP to prevent brute-force invite code enumeration
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      ?? req.headers.get('x-real-ip')
      ?? 'unknown'
    const { success: rateLimitOk } = await joinRatelimit.limit(ip)
    if (!rateLimitOk) {
      return NextResponse.json({ error: 'Too many attempts. Please wait a minute.' }, { status: 429 })
    }

    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { inviteCode, displayName, color } = schema.parse(body)

    // Check if user already has a household
    const existing = await db.householdMember.findFirst({
      where: { userId: user.id },
    })
    if (existing) {
      return NextResponse.json({ error: 'Already in a household' }, { status: 400 })
    }

    // Find household by invite code
    const household = await db.household.findUnique({
      where: { inviteCode },
    })
    if (!household) {
      return NextResponse.json({ error: 'Invalid invite code' }, { status: 404 })
    }

    const member = await db.householdMember.create({
      data: {
        householdId: household.id,
        userId: user.id,
        role: 'MEMBER',
        displayName,
        color: color ?? '#6366f1',
      },
    })

    revalidatePath('/dashboard')
    return NextResponse.json({ member, household }, { status: 201 })
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.issues }, { status: 400 })
    console.error('Join household error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
