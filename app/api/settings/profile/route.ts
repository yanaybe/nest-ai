import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import { z } from 'zod'
import { revalidatePath } from 'next/cache'

const patchSchema = z.object({
  displayName: z.string().min(1).max(50).optional(),
  color: z.string().optional(),
})

export async function PATCH(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const existingMember = await db.householdMember.findFirst({ where: { userId: user.id } })
    if (!existingMember) return NextResponse.json({ error: 'No household' }, { status: 403 })

    const body = await req.json()
    const data = patchSchema.parse(body)

    const member = await db.householdMember.update({
      where: { id: existingMember.id },
      data,
    })

    revalidatePath('/settings')
    return NextResponse.json({ member })
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.issues }, { status: 400 })
    console.error('PATCH profile settings error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
