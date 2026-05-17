import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const member = await db.householdMember.findFirst({
      where: { userId: user.id },
      include: { household: { include: { members: true } } },
    })
    if (!member) return NextResponse.json({ error: 'No household' }, { status: 404 })
    if (member.role === 'OWNER') {
      return NextResponse.json(
        { error: 'Owners cannot leave. Transfer ownership or delete the household.' },
        { status: 400 }
      )
    }

    await db.householdMember.delete({ where: { id: member.id } })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Leave household error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
