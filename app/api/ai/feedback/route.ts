import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import { z } from 'zod'

const schema = z.object({
  messageId: z.string().uuid(),
  type: z.enum(['positive', 'negative']),
  comment: z.string().optional(),
})

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { messageId, type, comment } = schema.parse(await req.json())

    // Verify the message exists
    const message = await db.aIMessage.findUnique({ where: { id: messageId } })
    if (!message) return NextResponse.json({ error: 'Message not found' }, { status: 404 })

    // Log feedback. A future migration should add a dedicated Feedback table.
    console.log(`AI Feedback: messageId=${messageId} type=${type} userId=${user.id} comment=${comment ?? ''}`)

    return NextResponse.json({ success: true })
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.issues }, { status: 400 })
    console.error('AI feedback error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
