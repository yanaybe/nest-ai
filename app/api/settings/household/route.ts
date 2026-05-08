import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import { z } from 'zod'
import { revalidatePath } from 'next/cache'

const patchSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  timezone: z.string().optional(),
  currency: z.string().length(3).optional(),
})

export async function PATCH(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const member = await db.householdMember.findFirst({ where: { userId: user.id } })
    if (!member) return NextResponse.json({ error: 'No household' }, { status: 403 })
    if (!['OWNER', 'ADMIN'].includes(member.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await req.json()
    const data = patchSchema.parse(body)

    const household = await db.household.update({
      where: { id: member.householdId },
      data,
    })

    revalidatePath('/settings')
    return NextResponse.json({ household })
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.issues }, { status: 400 })
    console.error('PATCH household settings error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
