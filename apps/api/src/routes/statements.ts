import { Router, Request, Response } from 'express';
import { Role, EntryType, EntryStatus } from '@prisma/client';
import { prisma } from '../config/db';
import { authenticate } from '../middleware/auth';

const router = Router({ mergeParams: true });

router.use(authenticate);

// GET /accounts/audit/entries - ADMIN and AUDITOR only
router.get('/audit/entries', async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    if (user.role !== Role.ADMIN && user.role !== Role.AUDITOR) {
      return res.status(403).json({ error: 'Forbidden: Insufficient privileges' });
    }

    const { accountId, startDate, endDate, limit = '100' } = req.query;

    const where: any = {};
    if (accountId && typeof accountId === 'string') {
      where.OR = [{ debitAccountId: accountId }, { creditAccountId: accountId }];
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate && typeof startDate === 'string') {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate && typeof endDate === 'string') {
        where.createdAt.lte = new Date(endDate);
      }
    }

    const entries = await prisma.ledgerEntry.findMany({
      where,
      take: Math.min(Number(limit) || 100, 500),
      orderBy: { createdAt: 'desc' },
      include: {
        initiatedBy: { select: { email: true } },
        debitAccount: { select: { id: true, name: true } },
        creditAccount: { select: { id: true, name: true } },
      },
    });

    const formatted = entries.map((e) => ({
      id: e.id,
      createdAt: e.createdAt.toISOString(),
      type: e.type,
      status: e.status,
      amountPence: e.amountPence.toString(),
      amountRupees: (Number(e.amountPence) / 100).toFixed(2),
      runningBalance: e.runningBalance.toString(),
      debitAccountId: e.debitAccountId,
      debitAccountName: e.debitAccount?.name || 'N/A',
      creditAccountId: e.creditAccountId,
      creditAccountName: e.creditAccount?.name || 'N/A',
      initiatedByEmail: e.initiatedBy.email,
      note: e.note,
      hash: e.hash,
      prevHash: e.prevHash,
    }));

    return res.status(200).json(formatted);
  } catch (error) {
    console.error('Audit query error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

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

    // 3. Query ledger entries with cursor pagination filed against this account
    const entries = await prisma.ledgerEntry.findMany({
      where: {
        OR: [
          { debitAccountId: accountId, type: { in: [EntryType.TRANSFER_DEBIT, EntryType.WITHDRAWAL] } },
          { creditAccountId: accountId, type: { in: [EntryType.TRANSFER_CREDIT, EntryType.DEPOSIT] } },
          { debitAccountId: accountId, status: EntryStatus.REFUSED },
          { type: EntryType.ADJUSTMENT, OR: [{ debitAccountId: accountId }, { creditAccountId: accountId }] },
        ],
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
      const isDebit =
        entry.type === EntryType.TRANSFER_DEBIT ||
        entry.type === EntryType.WITHDRAWAL ||
        entry.status === EntryStatus.REFUSED ||
        (entry.type === EntryType.ADJUSTMENT && entry.debitAccountId === accountId);
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
        hash: entry.hash,
        prevHash: entry.prevHash,
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
