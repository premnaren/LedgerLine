import { Router, Request, Response } from 'express';
import { Role } from '@prisma/client';
import { prisma } from '../config/db';
import { authenticate } from '../middleware/auth';

const router = Router({ mergeParams: true });

router.use(authenticate);

// GET /accounts/:id/statement
router.get('/:id/statement', async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const { id: accountId } = req.params;
    const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);
    const cursor = typeof req.query.cursor === 'string' ? req.query.cursor : undefined;

    // 1. Verify account exists
    const account = await prisma.account.findUnique({
      where: { id: accountId },
      include: { holders: true },
    });

    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }

    // 2. Authorization check
    if (user.role === Role.HOLDER) {
      const isOwner = account.holders.some((h) => h.userId === user.userId);
      if (!isOwner) {
        return res.status(403).json({ error: 'Forbidden: You do not own this account' });
      }
    }

    // 3. Query ledger entries with cursor pagination including REFUSED entries
    const entries = await prisma.ledgerEntry.findMany({
      where: {
        OR: [{ debitAccountId: accountId }, { creditAccountId: accountId }],
      },
      take: limit + 1,
      skip: cursor ? 1 : 0,
      cursor: cursor ? { id: cursor } : undefined,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      include: {
        initiatedBy: {
          select: { email: true },
        },
      },
    });

    let nextCursor: string | null = null;
    let paginatedEntries = entries;
    if (entries.length > limit) {
      const nextItem = entries[limit];
      nextCursor = entries[limit - 1].id;
      paginatedEntries = entries.slice(0, limit);
    }

    // 4. Format entries
    const formatted = paginatedEntries.map((entry) => {
      const isDebit = entry.debitAccountId === accountId;
      return {
        id: entry.id,
        createdAt: entry.createdAt.toISOString(),
        type: entry.type,
        status: entry.status,
        amountPence: entry.amountPence.toString(),
        runningBalance: entry.runningBalance.toString(),
        isDebit,
        direction: isDebit ? 'DEBIT' : 'CREDIT',
        debitAccountId: entry.debitAccountId,
        creditAccountId: entry.creditAccountId,
        initiatedBy: {
          email: entry.initiatedBy.email,
        },
        note: entry.note,
      };
    });

    return res.status(200).json({
      accountId,
      accountName: account.name,
      balancePence: account.balancePence.toString(),
      entries: formatted,
      nextCursor,
      hasMore: !!nextCursor,
    });
  } catch (error) {
    console.error('Statement error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
