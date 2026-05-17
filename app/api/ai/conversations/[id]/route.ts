import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'

export async function GET(
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

    const conversation = await db.aIConversation.findFirst({
      where: { id, householdId: member.householdId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          select: { id: true, role: true, content: true, createdAt: true },
        },
      },
    })

    if (!conversation) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    return NextResponse.json({ messages: conversation.messages })
  } catch (err) {
    console.error('GET conversation error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
