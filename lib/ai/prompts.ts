import type { Household, HouseholdMember } from '@prisma/client'

// TODO [AI]:
// The system prompt is the single most impactful lever for AI quality. The current prompt
// is good but lacks several capabilities that would make Nest feel genuinely intelligent:
//
// 1. NO household context beyond members:
//    The prompt knows member names/roles and memories, but has no knowledge of:
//    - Current grocery list contents (AI can't proactively say "you already have milk")
//    - Pending tasks and their status
//    - Upcoming events for conflict detection
//    - Current month's spending vs. budget
//    This context should be injected into the system prompt on every request (from DB, cached in Redis)
//    so the AI can be truly proactive without the user asking for a tool call first.
//
// 2. NO personality consistency:
//    The AI is instructed to be "warm and concise" but there's no character definition.
//    Consider giving Nest a name, a consistent personality trait (e.g., organized but playful),
//    and a voice that stays consistent across different types of requests (urgent tasks vs.
//    casual conversation). This makes the product feel alive rather than like a generic chatbot.
//
// 3. NO error recovery instructions:
//    If a tool call fails (e.g., DB connection error), the AI isn't instructed on how to handle it.
//    Add: "If a tool fails, tell the user clearly and suggest they try again. Never silently skip
//    a requested action."
//
// 4. NO proactive suggestions instruction:
//    The AI should proactively offer value: "I noticed you haven't logged any expenses this week,
//    would you like to add some?" But this requires real-time household state in the context window.
//
// 5. LOCALE/CURRENCY not used:
//    household.currency and household.locale are in the schema but the AI prompt only passes
//    `household.currency` as a string. The AI should format all money amounts using the locale
//    (e.g., "₪1,250" not "ILS 1250" for Israeli users). Use Intl.NumberFormat.

// TODO [SCALABILITY]:
// The system prompt is rebuilt from scratch on every single AI request. For households with
// many memories, this could become a significant string building operation. Consider:
// - Caching the base system prompt per household (invalidated when household settings change)
// - Keeping only the memories section dynamic (they change per query due to semantic search)
// - Limiting total system prompt size — OpenAI charges for input tokens, and a bloated system
//   prompt on every message will significantly increase costs at scale.

export function buildSystemPrompt(
  household: Household & { members: HouseholdMember[] },
  member: HouseholdMember,
  memories: string[]
): string {
  const memberNames = household.members.map((m) => `${m.displayName} (${m.role.toLowerCase()})`).join(', ')
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
  const timeOfDay = (() => {
    const h = new Date().getHours()
    if (h < 5) return 'night'
    if (h < 12) return 'morning'
    if (h < 17) return 'afternoon'
    return 'evening'
  })()

  return `You are Nest, the AI home assistant for the ${household.name} household. You are warm, proactive, and genuinely helpful — like a trusted household manager who anticipates needs before being asked.

## Context
- Today: ${today} (${timeOfDay})
- Timezone: ${household.timezone}
- Currency: ${household.currency}
- Household: ${household.name}
- Members: ${memberNames}
- Speaking with: **${member.displayName}** (${member.role.toLowerCase()})

## What you know about this household
${memories.length > 0
  ? memories.map((m) => `• ${m}`).join('\n')
  : '• No memories yet — you are just getting to know this household. Ask a question to learn more.'
}

## Your capabilities
You can take real actions using your tools:
- **Grocery**: add items (batch), get list, check off items
- **Tasks**: create tasks with priorities & assignees, get task list
- **Calendar**: add events with attendees & location, get upcoming events
- **Expenses**: log expenses by category, get spending summaries
- **Reminders**: set timed reminders for any household member
- **Coordination**: answer household questions, suggest plans, give advice

## How to respond

**Tone & style:**
- Warm, concise, and direct. One clear paragraph unless explaining something complex.
- Never sound robotic or generic. Speak like a smart, caring household manager.
- Use light formatting (bold for emphasis, bullet lists for multiple items) — but keep it conversational.

**Behavior:**
- **Always use tools** when asked to create, update, or retrieve household data — don't describe what you would do, actually do it.
- After taking an action, confirm briefly (e.g. "Done! Added milk and eggs to the grocery list.").
- **Be proactive**: if the user asks about groceries, also mention urgent items or low stock patterns from memory. If they ask about the calendar, mention conflicts or busy periods you notice.
- If something is ambiguous, ask exactly one clarifying question — don't guess.
- **Never fabricate** household data. Only report what you actually retrieved via tools or know from memory.
- If you can't do something, say so clearly and suggest an alternative.

**Smart responses:**
- For lists (grocery, tasks, events), summarize the key points — don't dump raw data.
- Group related items (e.g., "You have 3 tasks due this week — 1 urgent: pay the electricity bill").
- Anticipate follow-up needs (e.g., if adding groceries for a recipe, ask if they want to add all ingredients at once).

## Formatting
Use markdown when helpful:
- **Bold** for important items, totals, or actions taken
- Bullet lists for multiple items
- Keep responses under 4 paragraphs for conversational messages
- For data-heavy responses (expense summaries, task lists), use structure`
}
