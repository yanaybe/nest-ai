import OpenAI from 'openai'
import { db } from '@/lib/db'

// TODO [AI]:
// The memory system stores embeddings for semantic recall, but has several architectural problems:
//
// 1. NO memory decay or deduplication:
//    Every user message gets stored as a memory. After 6 months of daily use, a household will have
//    thousands of low-quality memories ("User said: 'add milk'", "User said: 'ok thanks'") that
//    dilute the quality of semantic search results. The signal-to-noise ratio degrades over time.
//
//    Suggested fix:
//    - Run a periodic job (cron or Vercel cron) to expire memories older than 90 days with
//      importance < 0.4 (the `expiresAt` column already exists in the schema — use it!)
//    - Deduplicate near-identical memories (cosine similarity > 0.95) keeping only the most recent
//    - Promote important memories (importance → 0.8+) for things like dietary restrictions,
//      household rules, recurring patterns detected by AI analysis
//
// 2. NO memory categorization for targeted recall:
//    All memories are searched together. A query about groceries will return memories about
//    expenses, tasks, and preferences mixed together. The `category` column exists but the
//    search function ignores it — it fetches ALL categories for every query.
//
//    Suggested fix:
//    - Infer the category from the query and filter: if the query mentions "grocery" or "food",
//      search only in category='grocery' AND category='preference'
//    - Store memories in typed categories: 'preference', 'routine', 'fact', 'conversation'
//      and weight them differently in the search results
//
// 3. NO importance scoring intelligence:
//    storeMemory is called from the chat route with a hardcoded importance of 0.3 for all
//    conversation memories. This means the AI learns everything equally — "add milk" gets the
//    same importance as "we have a severe nut allergy in the family". This is dangerous.
//
//    Suggested fix:
//    - Have the AI itself score importance: add a post-processing step that asks the AI
//      "How important is this information for future interactions? Score 0.0-1.0 and explain."
//    - Auto-elevate importance for: dietary restrictions, medical info, financial limits,
//      recurring schedules, family member preferences
//
// 4. COST CONCERN — every message creates an embedding API call:
//    text-embedding-3-small costs $0.00002 per 1K tokens. With 20 messages/day per household
//    and 1000 households, that's 20,000 embeddings/day = ~$0.40/day. Manageable now, but at
//    10K households it's $4/day just for embeddings. Cache embeddings for identical strings.

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

    // TODO [SCALABILITY]: This query does a full pgvector cosine distance scan over ALL memories
    // for a household. With no index, this is O(n) — every new memory makes search slower.
    // Add an HNSW or IVFFlat index on the embedding column for approximate nearest neighbor search:
    //   CREATE INDEX ai_memories_embedding_idx ON ai_memories
    //   USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64);
    // This brings search from O(n) to O(log n) and is critical before scaling past 10K memories/household.
    //
    // Also: consider adding a WHERE category = $inferredCategory condition to reduce the
    // search space further. See the module-level TODO for the category filtering design.
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
