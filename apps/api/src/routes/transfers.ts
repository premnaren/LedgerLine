import { Router, Request, Response } from 'express';
import { IdempotencyStatus } from '@prisma/client';
import { authenticate } from '../middleware/auth';
import { idempotencyMiddleware } from '../middleware/idempotency';
import { finalizeIdempotencyKey } from '../services/idempotencyService';
import { executeTransfer } from '../services/transferService';
import { LedgerError } from '../services/errors';
import { validateBody, transferSchema } from '../validation/schemas';

const router = Router();

router.use(authenticate);

// POST /transfers (protected with idempotency middleware and zod input validation)
router.post(
  '/',
  idempotencyMiddleware,
  validateBody(transferSchema),
  async (req: Request, res: Response) => {
    try {
      const { type, fromAccountId, toAccountId, amount, note } = req.body;
      const amountBigInt = BigInt(amount);

      // Reject if amount > 10,000,000 (10 M paise) without admin role
      if (amountBigInt > 10000000n && req.user?.role !== 'ADMIN') {
        return res.status(403).json({
          error: 'Transfers exceeding 10,000,000 paise (₹100,000) require ADMIN privileges',
        });
      }

      // Guard test delay hook: disabled in production, capped at 2000ms in non-production
      if (process.env.NODE_ENV !== 'production' && req.headers['x-test-delay']) {
        await new Promise((r) =>
          setTimeout(r, Math.min(Number(req.headers['x-test-delay']) || 0, 2000))
        );
      }

      const result = await executeTransfer({
        type,
        fromAccountId,
        toAccountId,
        amount: amountBigInt,
        user: req.user!,
        note,
        idempotencyKeyId: req.idempotencyKeyId,
      });

      return res.status(200).json(result);
  } catch (error: any) {
    // Explicitly finalize idempotency key to FAILED on any uncaught throw
    if (req.idempotencyKeyId) {
      try {
        await finalizeIdempotencyKey(
          req.idempotencyKeyId,
          IdempotencyStatus.FAILED,
          error instanceof LedgerError ? error.statusCode : 500,
          { error: error?.message || 'Transfer failed' }
        );
      } catch (finalizeErr) {
        console.error('Failed to finalize idempotency key on error:', finalizeErr);
      }
    }

    if (error instanceof LedgerError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    console.error('Transfer handler error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
