// TODO [SECURITY]:
// Current rate limits are per-user (identified by user.id) but not per-household.
// A single household with multiple members each gets 20 AI requests/minute independently,
// meaning a 4-person household can make 80 AI requests/minute — quadrupling the effective
// rate limit and making cost estimation impossible.
//
// Better approach:
// - AI rate limit: per-household (20 req/min total for the whole household)
// - API rate limit: per-user (each user gets their own API limit)
// - Add a monthly counter: per-user AND per-household to enforce plan limits
//
// TODO [MONETIZATION]:
// The rate limiter returns `{ success: true, remaining: 999 }` when Redis is unavailable.
// This means if Upstash is down, ALL rate limits are bypassed and OpenAI costs could spike
// uncontrollably. For a production system that charges per-usage:
// - Return { success: false } when Redis is unavailable (fail closed, not open)
// - OR: use a fallback in-memory rate limiter (less accurate but prevents complete bypass)
// - Add alerting when Redis is unavailable
//
// TODO [SCALABILITY]:
// A new Ratelimit instance is created on every API call inside the aiRatelimit.limit() and
// apiRatelimit.limit() functions. This is wasteful — the Ratelimit instance should be
// created once and reused (or created lazily and cached). Consider refactoring to use the
// module-level getRateLimiter() factory function consistently.

import { Redis } from '@upstash/redis'
import { Ratelimit } from '@upstash/ratelimit'

function getRedis() {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token || url === 'your_upstash_url') {
    return null
  }
  return new Redis({ url, token })
}

let _redis: Redis | null = null

export function getRedisClient(): Redis | null {
  if (!_redis) {
    _redis = getRedis()
  }
  return _redis
}

export function getRateLimiter(prefix: string, max: number, window: string) {
  const redis = getRedisClient()
  if (!redis) return null
  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(max, window as any),
    analytics: true,
    prefix,
  })
}

export const aiRatelimit = {
  limit: async (identifier: string) => {
    const redis = getRedisClient()
    if (!redis) return { success: true, remaining: 999 }
    const limiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(20, '1 m'),
      analytics: true,
      prefix: 'nest:ai',
    })
    return limiter.limit(identifier)
  },
}

export const apiRatelimit = {
  limit: async (identifier: string) => {
    const redis = getRedisClient()
    if (!redis) return { success: true, remaining: 999 }
    const limiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(100, '1 m'),
      analytics: true,
      prefix: 'nest:api',
    })
    return limiter.limit(identifier)
  },
}
