import { prisma } from '../config/db';
import logger from '../config/logger';

/**
 * Reaps orphaned or stale idempotency keys stuck in PROCESSING status.
 * Closes THREATS.md residual risk #2 (server crash mid-transaction leaving key stuck in 409).
 */
export async function reapStaleIdempotencyKeys(staleThresholdMinutes: number = 5): Promise<number> {
  try {
    const affected = await prisma.$executeRaw`
      UPDATE "IdempotencyKey"
      SET status = 'FAILED'::"IdempotencyStatus",
          "httpStatus" = 504,
          "responseBody" = '{"error":"Operation timed out in processing state"}'::jsonb
      WHERE status = 'PROCESSING'
        AND "createdAt" < NOW() - (INTERVAL '1 minute' * ${staleThresholdMinutes})
    `;

    if (affected > 0) {
      logger.info({ reapedCount: affected }, 'Reaped stale in-flight idempotency keys');
    }
    return affected;
  } catch (error) {
    logger.error({ error }, 'Failed to execute idempotency key reaper');
    return 0;
  }
}

/**
 * Start periodic background reaper daemon.
 */
export function startIdempotencyReaper(intervalMinutes: number = 10) {
  // Run once on startup
  reapStaleIdempotencyKeys().catch((err) =>
    logger.error({ err }, 'Error during initial idempotency reaper sweep')
  );

  const timer = setInterval(() => {
    reapStaleIdempotencyKeys().catch((err) =>
      logger.error({ err }, 'Error during periodic idempotency reaper sweep')
    );
  }, intervalMinutes * 60 * 1000);

  // Allow process to exit cleanly if this timer is active
  if (timer.unref) {
    timer.unref();
  }

  return () => clearInterval(timer);
}

