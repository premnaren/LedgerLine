import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { idempotencyMiddleware } from '../middleware/idempotency';
import { executeTransfer } from '../services/transferService';
import { LedgerError } from '../services/errors';

const router = Router();

router.use(authenticate);

// POST /transfers (protected with idempotency middleware)
router.post('/', idempotencyMiddleware, async (req: Request, res: Response) => {
  try {
    const { type, fromAccountId, toAccountId, amount, note } = req.body;

    if (!type || !toAccountId || amount === undefined || amount === null) {
      return res.status(400).json({ error: 'type, toAccountId, and amount are required' });
    }

    // Validate integer amount (paise/pence)
    const parsedAmount = Number(amount);
    if (isNaN(parsedAmount) || !Number.isInteger(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ error: 'amount must be a positive integer in smallest units (paise/pence)' });
    }

    const amountBigInt = BigInt(amount);

    // Optional test hook for simulated concurrency delay
    if (req.headers['x-test-delay']) {
      await new Promise((r) => setTimeout(r, Number(req.headers['x-test-delay'])));
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
    if (error instanceof LedgerError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    console.error('Transfer handler error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
