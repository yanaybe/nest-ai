import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import OpenAI from 'openai'
import { aiRatelimitByHousehold } from '@/lib/redis'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

function getOpenAIClient() {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY! })
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const member = await db.householdMember.findFirst({
      where: { userId: user.id },
      include: { household: true },
    })
    if (!member) return NextResponse.json({ error: 'No household' }, { status: 403 })

    const { success } = await aiRatelimitByHousehold.limit(member.householdId)
    if (!success) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

    const openai = getOpenAIClient()

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `You are a helpful meal planning assistant for a household. Generate a balanced, practical weekly meal plan with variety across the week. Return a JSON object where keys are day names and values have breakfast, lunch, and dinner fields. Keep meal names concise (3-6 words).`,
        },
        {
          role: 'user',
          content: `Generate a balanced weekly meal plan for the ${member.household.name} household. Return JSON with exactly this structure:
{
  "Monday": { "breakfast": "...", "lunch": "...", "dinner": "..." },
  "Tuesday": { "breakfast": "...", "lunch": "...", "dinner": "..." },
  "Wednesday": { "breakfast": "...", "lunch": "...", "dinner": "..." },
  "Thursday": { "breakfast": "...", "lunch": "...", "dinner": "..." },
  "Friday": { "breakfast": "...", "lunch": "...", "dinner": "..." },
  "Saturday": { "breakfast": "...", "lunch": "...", "dinner": "..." },
  "Sunday": { "breakfast": "...", "lunch": "...", "dinner": "..." }
}`,
        },
      ],
      max_tokens: 800,
    })

    const content = completion.choices[0]?.message?.content
    if (!content) return NextResponse.json({ error: 'No response from AI' }, { status: 500 })

    const parsed = JSON.parse(content)

    // Validate that all 7 days and 3 meal types are present
    const meals: Record<string, Record<string, string>> = {}
    for (const day of DAYS) {
      if (parsed[day]) {
        meals[day] = {
          breakfast: String(parsed[day].breakfast ?? ''),
          lunch: String(parsed[day].lunch ?? ''),
          dinner: String(parsed[day].dinner ?? ''),
        }
      }
    }

    return NextResponse.json({ meals })
  } catch (err) {
    console.error('AI meal generation error:', err)
    return NextResponse.json({ error: 'Failed to generate meal plan' }, { status: 500 })
  }
}
