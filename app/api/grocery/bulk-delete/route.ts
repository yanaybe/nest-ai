import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import { z } from 'zod'

const schema = z.object({ ids: z.array(z.string().uuid()).min(1) })

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const member = await db.householdMember.findFirst({ where: { userId: user.id } })
    if (!member) return NextResponse.json({ error: 'No household' }, { status: 403 })

    const { ids } = schema.parse(await req.json())

    // Only delete items that belong to this household (security check)
    const { count } = await db.groceryItem.deleteMany({
      where: { id: { in: ids }, householdId: member.householdId },
    })

    return NextResponse.json({ deleted: count })
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.issues }, { status: 400 })
    console.error('Bulk delete grocery error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
