import { streamText } from 'ai'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import { openai, MAIN_MODEL } from '@/lib/ai/client'
import { buildSystemPrompt } from '@/lib/ai/prompts'
import { createTools } from '@/lib/ai/tools'
import { searchMemories, storeMemory } from '@/lib/ai/memory'
import { aiRatelimit } from '@/lib/redis'
import { z } from 'zod'

const schema = z.object({
  messages: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string(),
  })).min(1),
  conversationId: z.string().uuid().optional(),
})

export async function POST(req: NextRequest) {
  try {
    // Auth
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Rate limit
    const { success, remaining } = await aiRatelimit.limit(user.id)
    if (!success) {
      return NextResponse.json(
        { error: 'Too many requests. Please slow down.' },
        { status: 429, headers: { 'X-RateLimit-Remaining': remaining.toString() } }
      )
    }

    // Get household + member
    const member = await db.householdMember.findFirst({
      where: { userId: user.id },
      include: { household: { include: { members: true } } },
    })
    if (!member) return NextResponse.json({ error: 'No household found' }, { status: 404 })

    const { messages, conversationId } = schema.parse(await req.json())
    const lastUserMessage = messages[messages.length - 1].content

    // Search relevant memories for context
    const memories = await searchMemories(member.householdId, lastUserMessage, 6)

    // Build system prompt
    const systemPrompt = buildSystemPrompt(member.household, member, memories)

    // Get or create conversation
    let convId = conversationId
    if (!convId) {
      const conv = await db.aIConversation.create({
        data: {
          householdId: member.householdId,
          memberId: member.id,
          title: lastUserMessage.slice(0, 60),
        },
      })
      convId = conv.id
    }

    // Save user message to DB
    await db.aIMessage.create({
      data: {
        conversationId: convId,
        role: 'USER',
        content: lastUserMessage,
      },
    })

    const tools = createTools(member.householdId, member.id)

    // Stream response
    const result = streamText({
      model: openai(MAIN_MODEL),
      system: systemPrompt,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      tools,
      maxSteps: 5,
      onFinish: async ({ text, usage }) => {
        // Save assistant response
        await db.aIMessage.create({
          data: {
            conversationId: convId!,
            role: 'ASSISTANT',
            content: text,
            tokens: usage.totalTokens,
          },
        })

        // Store important user messages as memories (async, non-blocking)
        if (lastUserMessage.length > 20) {
          storeMemory(
            member.householdId,
            `User said: "${lastUserMessage.slice(0, 200)}"`,
            'conversation',
            0.3
          ).catch(console.error)
        }
      },
    })

    const responseHeaders: Record<string, string> = {}
    if (convId) responseHeaders['X-Conversation-Id'] = convId
    return result.toDataStreamResponse({ headers: responseHeaders })
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.issues }, { status: 400 })
    console.error('AI chat error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
