import { Router, Request, Response } from 'express';
import { Role } from '@prisma/client';
import { prisma } from '../config/db';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/roleGuard';
import { reconcileAccount } from '../services/reconciliationService';
import { AccountNotFoundError } from '../services/errors';
import statementsRouter from './statements';

const router = Router();

// Apply auth middleware to all account routes
router.use(authenticate);

// Mount statement sub-routes
router.use('/', statementsRouter);

// GET /accounts - ADMIN: all, AUDITOR: all, HOLDER: own accounts
router.get('/', async (req: Request, res: Response) => {
  try {
    const user = req.user!;

    let accounts;
    if (user.role === Role.ADMIN || user.role === Role.AUDITOR) {
      accounts = await prisma.account.findMany({
        include: {
          holders: {
            include: {
              user: {
                select: { id: true, email: true, role: true },
              },
            },
          },
        },
        orderBy: { name: 'asc' },
      });
    } else {
      // HOLDER: own accounts only
      accounts = await prisma.account.findMany({
        where: {
          holders: {
            some: {
              userId: user.userId,
            },
          },
        },
        include: {
          holders: {
            include: {
              user: {
                select: { id: true, email: true, role: true },
              },
            },
          },
        },
        orderBy: { name: 'asc' },
      });
    }

    // Format BigInt to string for JSON
    const formatted = accounts.map((acc) => ({
      ...acc,
      balancePence: acc.balancePence.toString(),
      overdraftLimit: acc.overdraftLimit.toString(),
    }));

    return res.status(200).json(formatted);
  } catch (error) {
    console.error('Error fetching accounts:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /accounts - ADMIN only
router.post('/', requireRole(Role.ADMIN), async (req: Request, res: Response) => {
  try {
    const { name, initialBalance = 0, overdraftLimit = 0, holderUserIds = [] } = req.body;

    if (!name || typeof name !== 'string') {
      return res.status(400).json({ error: 'Account name is required' });
    }

    const initBalancePence = BigInt(initialBalance);
    const overdraftPence = BigInt(overdraftLimit);

    if (initBalancePence < -overdraftPence) {
      return res.status(400).json({ error: 'Initial balance cannot violate overdraft limit' });
    }

    const account = await prisma.account.create({
      data: {
        name,
        balancePence: initBalancePence,
        overdraftLimit: overdraftPence,
        version: initBalancePence > 0n ? 1 : 0,
        holders: {
          create: holderUserIds.map((userId: string) => ({ userId })),
        },
      },
      include: {
        holders: true,
      },
    });

    if (initBalancePence > 0n) {
      await prisma.ledgerEntry.create({
        data: {
          type: 'DEPOSIT',
          status: 'POSTED',
          amountPence: initBalancePence,
          creditAccountId: account.id,
          initiatedById: req.user!.userId,
          runningBalance: initBalancePence,
          note: 'Initial account balance',
        },
      });
    }

    return res.status(201).json({
      ...account,
      balancePence: account.balancePence.toString(),
      overdraftLimit: account.overdraftLimit.toString(),
    });
  } catch (error) {
    console.error('Error creating account:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /accounts/:id/reconcile - ADMIN and AUDITOR only
router.get(
  '/:id/reconcile',
  requireRole(Role.ADMIN, Role.AUDITOR),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const result = await reconcileAccount(id);
      return res.status(200).json(result);
    } catch (error: any) {
      if (error instanceof AccountNotFoundError) {
        return res.status(404).json({ error: error.message });
      }
      console.error('Reconciliation error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// GET /accounts/:id/balance
router.get('/:id/balance', async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const { id } = req.params;

    const account = await prisma.account.findUnique({
      where: { id },
      include: {
        holders: true,
      },
    });

    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }

    // Authorization check
    if (user.role === Role.HOLDER) {
      const isOwner = account.holders.some((h) => h.userId === user.userId);
      if (!isOwner) {
        return res.status(403).json({ error: 'Forbidden: You do not own this account' });
      }
    }

    return res.status(200).json({
      accountId: account.id,
      balancePence: account.balancePence.toString(),
      overdraftLimit: account.overdraftLimit.toString(),
      version: account.version,
    });
  } catch (error) {
    console.error('Error fetching balance:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
