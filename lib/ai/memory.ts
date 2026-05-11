import OpenAI from 'openai'
import { db } from '@/lib/db'

// Lazy-initialize to avoid build-time credential errors
let _openaiClient: OpenAI | null = null
function getClient() {
  if (!_openaiClient) _openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  return _openaiClient
}

export async function storeMemory(
  householdId: string,
  content: string,
  category: string,
  importance: number = 0.5
) {
  try {
    const embeddingResponse = await getClient().embeddings.create({
      model: 'text-embedding-3-small',
      input: content,
    })
    const embedding = embeddingResponse.data[0].embedding

    // Store via raw SQL since Prisma doesn't support pgvector writes natively
    await db.$executeRaw`
      INSERT INTO ai_memories (id, household_id, content, category, importance, embedding, created_at)
      VALUES (gen_random_uuid(), ${householdId}::uuid, ${content}, ${category}, ${importance}, ${JSON.stringify(embedding)}::vector, now())
    `
  } catch (error) {
    console.error('Failed to store memory:', error)
  }
}

export async function searchMemories(
  householdId: string,
  query: string,
  limit: number = 5
): Promise<string[]> {
  try {
    const embeddingResponse = await getClient().embeddings.create({
      model: 'text-embedding-3-small',
      input: query,
    })
    const embedding = embeddingResponse.data[0].embedding

    const memories = await db.$queryRaw<Array<{ content: string; importance: number }>>`
      SELECT content, importance
      FROM ai_memories
      WHERE household_id = ${householdId}::uuid
        AND (expires_at IS NULL OR expires_at > now())
      ORDER BY embedding <=> ${JSON.stringify(embedding)}::vector
      LIMIT ${limit}
    `

    return memories.map((m) => m.content)
  } catch (error) {
    console.error('Failed to search memories:', error)
    return []
  }
}

export async function getRecentMemories(
  householdId: string,
  limit: number = 10
): Promise<string[]> {
  const memories = await db.aIMemory.findMany({
    where: { householdId },
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: { content: true },
  })
  return memories.map((m) => m.content)
}
