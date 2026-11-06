import { Router, Request, Response } from 'express';
import { Role } from '@prisma/client';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/roleGuard';
import { reconcileAllAccounts } from '../services/reconciliationService';

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

export default router;
