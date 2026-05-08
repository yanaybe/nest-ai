import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import { redirect } from 'next/navigation'
import { ChatInterface } from '@/components/chat/chat-interface'

export default async function ChatPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const member = await db.householdMember.findFirst({
    where: { userId: user.id },
    include: { household: { include: { members: true } } },
  })
  if (!member) redirect('/onboarding')

  const recentConversations = await db.aIConversation.findMany({
    where: { householdId: member.householdId },
    orderBy: { updatedAt: 'desc' },
    take: 10,
    include: {
      _count: { select: { messages: true } },
    },
  })

  const params = await searchParams
  const initialQuery = params.q

  return (
    <ChatInterface
      member={member}
      initialQuery={initialQuery}
      recentConversations={recentConversations}
    />
  )
}
