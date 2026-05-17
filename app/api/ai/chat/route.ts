// TODO [MONETIZATION]:
// This endpoint is the core value driver of Nest — every AI message is a cost and a feature.
// Currently there is no monetization gate. All users (free and paid) get identical access.
// The Subscription model in Prisma schema has FREE/STARTER/FAMILY/PREMIUM plans but they are
// never checked here.
//
// Suggested tiered limits:
// - FREE: 30 AI messages/month, 5 AI tool calls/day
// - STARTER ($4.99/mo): 200 AI messages/month, unlimited tool calls
// - FAMILY ($9.99/mo): unlimited messages, AI memory prioritization, receipt scanning
// - PREMIUM ($19.99/mo): unlimited + proactive AI suggestions + priority support
//
// Implementation steps:
// 1. Add monthly message counter to Subscription model (or track via Redis)
// 2. Check plan limits before processing the request
// 3. Return 402 Payment Required with a clear upgrade CTA when limit is exceeded
// 4. Track per-household monthly token usage for cost monitoring
// 5. Add Stripe webhooks to update plan status in DB

// TODO [SECURITY]:
// The conversationId from the request body is trusted without ownership verification.
// A malicious user could pass another household's conversationId and append messages to it.
// Before saving a user message to a conversationId, verify that the conversation belongs
// to the user's household:
//   const conv = await db.aIConversation.findFirst({
//     where: { id: convId, householdId: member.householdId }
//   })
//   if (!conv) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

// TODO [SCALABILITY]:
// Every AI request does a full DB member lookup with household include. For high-traffic
// periods, this adds latency and DB load. Cache the member+household data in Redis with
// a 5-minute TTL keyed by userId. Invalidate on household membership changes.
// Estimated savings: 20-40ms per request at scale.

import { streamText } from 'ai'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import { openai, MAIN_MODEL } from '@/lib/ai/client'
import { buildSystemPrompt } from '@/lib/ai/prompts'
import { createTools } from '@/lib/ai/tools'
import { searchMemories, storeMemory } from '@/lib/ai/memory'
import { aiRatelimitByHousehold } from '@/lib/redis'
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

    // Get household + member first (needed for rate limiting by household)
    const member = await db.householdMember.findFirst({
      where: { userId: user.id },
      include: { household: { include: { members: true } } },
    })
    if (!member) return NextResponse.json({ error: 'No household found' }, { status: 404 })

    // Rate limit by household (not just user) to prevent multi-member abuse
    const { success, remaining } = await aiRatelimitByHousehold.limit(member.householdId)
    if (!success) {
      return NextResponse.json(
        { error: 'Too many requests. Please slow down.' },
        { status: 429, headers: { 'X-RateLimit-Remaining': remaining.toString() } }
      )
    }

    const { messages, conversationId } = schema.parse(await req.json())
    const lastUserMessage = messages[messages.length - 1].content

    // Parallelize: conversation ownership check (or creation) + memory search
    let convId = conversationId
    let memories: Awaited<ReturnType<typeof searchMemories>>

    if (convId) {
      // Continuing an existing conversation: verify ownership and search memories in parallel
      const [verifiedConv, memories_] = await Promise.all([
        db.aIConversation.findFirst({ where: { id: convId, householdId: member.householdId } }),
        searchMemories(member.householdId, lastUserMessage, 6),
      ])
      if (!verifiedConv) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      memories = memories_
    } else {
      // New conversation: create it and search memories in parallel
      const [conv, memories_] = await Promise.all([
        db.aIConversation.create({
          data: {
            householdId: member.householdId,
            memberId: member.id,
            title: lastUserMessage.slice(0, 60),
          },
        }),
        searchMemories(member.householdId, lastUserMessage, 6),
      ])
      convId = conv.id
      memories = memories_
    }

    // Build system prompt
    const systemPrompt = buildSystemPrompt(member.household, member, memories)

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

        // TODO [AI]: Current memory storage is naive — every message longer than 20 chars
        // is stored with the same format ("User said: ...") and the same importance (0.3).
        // This means low-quality memories ("User said: 'ok great'") pollute the semantic
        // search results and reduce the quality of future context.
        //
        // Better approach:
        // 1. Use a separate lightweight AI call (GPT-4o-mini) to evaluate if a message
        //    contains household-relevant facts worth storing (dietary restrictions, preferences,
        //    routines, financial information). Skip storage if not relevant.
        // 2. Extract structured facts rather than raw messages:
        //    Instead of: "User said: 'we don't eat pork'"
        //    Store: "FACT: The household does not consume pork. Category: dietary. Importance: 0.9"
        // 3. Deduplicate before storing — if a very similar memory already exists (cosine > 0.92),
        //    update it rather than creating a duplicate
        // 4. Store the assistant's response when it includes facts or confirmations, not just user messages
        //
        // TODO [AI]: Also store tool call results as memories with higher importance:
        // When the AI adds a grocery item, that action is more important than the user saying it.
        // Store: "FACT: Milk was added to grocery list on [date]. Pattern: milk is a regular purchase."

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
