import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

// TODO [SCALABILITY]:
// The DB connection uses a single Pool with default settings. In production on Vercel,
// each serverless function invocation creates a new connection pool. With concurrent traffic,
// this can exhaust PostgreSQL's connection limit (default: 100 connections).
//
// Fix: Configure pool size based on environment:
//   const pool = new Pool({
//     connectionString: process.env.DATABASE_URL,
//     max: process.env.NODE_ENV === 'production' ? 10 : 5,
//     idleTimeoutMillis: 30000,
//     connectionTimeoutMillis: 2000,
//   })
//
// Better fix: Use PgBouncer (connection pooler) in front of PostgreSQL, or use
// Prisma's built-in connection limit: set DATABASE_URL with ?connection_limit=5
// For Vercel serverless: use @prisma/adapter-pg-worker or consider Prisma Accelerate.

// TODO [SCALABILITY]:
// Consider adding Prisma query logging in development with slow query detection:
//   log: [{ level: 'query', emit: 'event' }]
//   db.$on('query', (e) => { if (e.duration > 100) console.warn('Slow query:', e) })
// This surfaces N+1 queries and slow queries during development before they hit production.

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL ?? 'postgresql://localhost:5432/nest_ai',
  })
  const adapter = new PrismaPg(pool)
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  })
}

export const db =
  globalForPrisma.prisma ??
  createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
