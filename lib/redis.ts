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
