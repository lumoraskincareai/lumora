import { Prisma, PrismaClient } from '@prisma/client'

// Neon scales an idle database to zero, so the first query after a pause fails
// with P1001 ("Can't reach database server") while it wakes up. That error means
// the query never reached the database, so retrying it is safe, even for writes.
const WAKE_UP_CODES = new Set(['P1001', 'P1002'])
const RETRY_DELAYS_MS = [1500, 3000, 5000]

/** True for "couldn't connect" failures, where the query itself never ran. */
function isConnectFailure(err: unknown): boolean {
  const e = err as { code?: unknown; errorCode?: unknown }
  if (typeof e?.code === 'string' && WAKE_UP_CODES.has(e.code)) return true
  if (typeof e?.errorCode === 'string' && WAKE_UP_CODES.has(e.errorCode)) return true
  // Some Prisma setups throw an initialization error with no code, only a message.
  return (
    err instanceof Prisma.PrismaClientInitializationError &&
    /can't reach database server|timed out/i.test(err.message)
  )
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const base = new PrismaClient()

export const prisma = base.$extends({
  query: {
    async $allOperations({ args, query }) {
      for (let attempt = 0; ; attempt++) {
        try {
          return await query(args)
        } catch (err) {
          const delay = RETRY_DELAYS_MS[attempt]
          if (!isConnectFailure(err) || delay === undefined) throw err
          await sleep(delay)
        }
      }
    },
  },
})

/** Wakes a sleeping database so the first real request doesn't pay for it. */
export async function warmUpDatabase(): Promise<void> {
  try {
    await prisma.$queryRaw`SELECT 1`
  } catch (err) {
    console.warn('[db] Warm-up failed:', (err as Error).message.split('\n').pop())
  }
}
