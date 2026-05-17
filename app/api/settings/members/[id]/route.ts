import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import { z } from 'zod'

const schema = z.object({
  role: z.enum(['ADMIN', 'MEMBER', 'CHILD']),
})

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const currentMember = await db.householdMember.findFirst({
      where: { userId: user.id },
    })
    if (!currentMember) return NextResponse.json({ error: 'No household' }, { status: 403 })
    if (!['OWNER', 'ADMIN'].includes(currentMember.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const targetMember = await db.householdMember.findFirst({
      where: { id, householdId: currentMember.householdId },
    })
    if (!targetMember) return NextResponse.json({ error: 'Member not found' }, { status: 404 })
    if (targetMember.role === 'OWNER') return NextResponse.json({ error: 'Cannot change owner role' }, { status: 400 })

    const { role } = schema.parse(await req.json())
    const updated = await db.householdMember.update({
      where: { id },
      data: { role },
    })

    return NextResponse.json({ member: updated })
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.issues }, { status: 400 })
    console.error('PATCH member role error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
