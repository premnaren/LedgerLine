import { Router, Request, Response } from 'express';
import { Role } from '@prisma/client';
import { performance } from 'perf_hooks';
import { prisma } from '../config/db';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/roleGuard';
import { reconcileAllAccounts } from '../services/reconciliationService';
import { executeTransfer } from '../services/transferService';

const router = Router();

router.use(authenticate);
router.use(requireRole(Role.ADMIN));

// GET /admin/reconcile-all - ADMIN only
router.get('/reconcile-all', async (req: Request, res: Response) => {
  try {
    const result = await reconcileAllAccounts();
    return res.status(200).json(result);
  } catch (error) {
    console.error('System reconciliation error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /admin/simulate-stress - Live real-time concurrency stress & ACID telemetry
router.post('/simulate-stress', async (req: Request, res: Response) => {
  try {
    const concurrency = Math.min(Math.max(Number(req.body?.concurrency) || 10, 2), 50);
    const amountPence = BigInt(req.body?.amountPence || 100); // Default ₹1.00

    let fromAccountId = req.body?.fromAccountId;
    let toAccountId = req.body?.toAccountId;

    // If accounts not explicitly specified, pick top 2 accounts with largest balances
    if (!fromAccountId || !toAccountId) {
      const topAccounts = await prisma.account.findMany({
        orderBy: { balancePence: 'desc' },
        take: 2,
      });

      if (topAccounts.length < 2) {
        return res.status(400).json({ error: 'At least 2 accounts required for stress simulation' });
      }

      fromAccountId = topAccounts[0].id;
      toAccountId = topAccounts[1].id;
    }

    const startFromAcc = await prisma.account.findUnique({ where: { id: fromAccountId } });
    const startToAcc = await prisma.account.findUnique({ where: { id: toAccountId } });

    if (!startFromAcc || !startToAcc) {
      return res.status(404).json({ error: 'One or both target accounts not found' });
    }

    const startFromBalance = BigInt(startFromAcc.balancePence);
    const startToBalance = BigInt(startToAcc.balancePence);

    const startTime = performance.now();

    // Fire all concurrent transfers simultaneously via Promise.all
    const runId = Math.random().toString(36).substring(2, 7);
    const tasks = Array.from({ length: concurrency }, async (_, i) => {
      try {
        const result = await executeTransfer({
          type: 'transfer',
          fromAccountId,
          toAccountId,
          amount: amountPence,
          user: req.user!,
          note: `Concurrency Stress Test #${i + 1}/${concurrency} [run-${runId}]`,
        });
        return { success: true, index: i, result };
      } catch (err: any) {
        return {
          success: false,
          index: i,
          error: err.message || 'Transaction aborted',
          code: err.code || err.name,
        };
      }
    });

    const results = await Promise.all(tasks);
    const durationMs = Math.round(performance.now() - startTime);

    const successful = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;
    const transfersPerSec = durationMs > 0 ? Math.round((concurrency / (durationMs / 1000)) * 10) / 10 : concurrency;

    // Post-flight inspection
    const endFromAcc = await prisma.account.findUnique({ where: { id: fromAccountId } });
    const endToAcc = await prisma.account.findUnique({ where: { id: toAccountId } });

    const endFromBalance = BigInt(endFromAcc!.balancePence);
    const endToBalance = BigInt(endToAcc!.balancePence);

    const deltaFrom = endFromBalance - startFromBalance;
    const deltaTo = endToBalance - startToBalance;

    const zeroSumInvariantPreserved = deltaFrom + deltaTo === 0n;
    const expectedTransferSum = BigInt(successful) * amountPence;
    const exactBalanceDeltaMatch = deltaTo === expectedTransferSum && deltaFrom === -expectedTransferSum;

    // Complete system double-entry and cryptographic chain audit
    const reconResult = await reconcileAllAccounts();

    return res.status(200).json({
      success: true,
      telemetry: {
        concurrency,
        amountPence: amountPence.toString(),
        amountRupees: (Number(amountPence) / 100).toFixed(2),
        durationMs,
        transfersPerSecond: transfersPerSec,
        successful,
        failed,
      },
      invariants: {
        zeroSumPreserved: zeroSumInvariantPreserved && exactBalanceDeltaMatch,
        conservationVerified: reconResult.allMatch,
        deltaFromPence: deltaFrom.toString(),
        deltaToPence: deltaTo.toString(),
        fromAccount: {
          id: fromAccountId,
          name: startFromAcc.name,
          startBalancePence: startFromBalance.toString(),
          endBalancePence: endFromBalance.toString(),
        },
        toAccount: {
          id: toAccountId,
          name: startToAcc.name,
          startBalancePence: startToBalance.toString(),
          endBalancePence: endToBalance.toString(),
        },
      },
      cryptographicProof: {
        chainVerified: reconResult.cryptographicIntegrity.verified,
        headHash: reconResult.cryptographicIntegrity.headHash,
        totalEntries: reconResult.cryptographicIntegrity.totalEntries,
      },
    });
  } catch (error) {
    console.error('Simulate stress error:', error);
    return res.status(500).json({ error: 'Internal server error during stress simulation' });
  }
});

export default router;
