import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import { revalidatePath } from 'next/cache'

export async function DELETE(
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

    await db.expense.delete({
      where: { id, householdId: member.householdId },
    })

    revalidatePath('/expenses')
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('DELETE expense error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
