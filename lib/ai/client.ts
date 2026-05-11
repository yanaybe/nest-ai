import { createOpenAI } from '@ai-sdk/openai'

// Lazy-initialize to avoid build-time errors when env vars aren't present
let _openai: ReturnType<typeof createOpenAI> | null = null

export function getOpenAI() {
  if (!_openai) {
    _openai = createOpenAI({
      apiKey: process.env.OPENAI_API_KEY!,
      compatibility: 'strict',
    })
  }
  return _openai
}

// Keep the named export for backwards compatibility — but now it's a getter
export const openai = new Proxy({} as ReturnType<typeof createOpenAI>, {
  get(_, prop) {
    return getOpenAI()[prop as keyof ReturnType<typeof createOpenAI>]
  },
})

export const MAIN_MODEL = 'gpt-4o'
export const FAST_MODEL = 'gpt-4o-mini'
export const EMBEDDING_MODEL = 'text-embedding-3-small'
