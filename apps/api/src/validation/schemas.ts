import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const createAccountSchema = z.object({
  name: z.string().trim().min(1, 'Account name is required').max(100, 'Account name too long'),
  initialBalance: z
    .union([z.number().int().nonnegative(), z.string().regex(/^\d+$/)])
    .optional()
    .default(0),
  overdraftLimit: z
    .union([z.number().int().nonnegative(), z.string().regex(/^\d+$/)])
    .optional()
    .default(0),
  holderUserIds: z.array(z.string().min(1)).optional().default([]),
});

export const transferSchema = z
  .object({
    type: z.enum(['transfer', 'deposit', 'withdrawal'], {
      errorMap: () => ({ message: "type must be 'transfer', 'deposit', or 'withdrawal'" }),
    }),
    fromAccountId: z.string().min(1).optional(),
    toAccountId: z.string().min(1, 'toAccountId is required'),
    amount: z
      .union([
        z.number().int().positive('amount must be a positive integer in smallest units'),
        z.string().regex(/^[1-9]\d*$/, 'amount must be a positive integer in smallest units'),
      ])
      .refine(
        (val) => {
          try {
            return BigInt(val) > 0n;
          } catch {
            return false;
          }
        },
        { message: 'amount must be a valid positive integer' }
      ),
    note: z.string().max(255).optional(),
  })
  .refine(
    (data) => {
      if (data.type === 'transfer' && !data.fromAccountId) {
        return false;
      }
      return true;
    },
    { message: 'fromAccountId is required for transfer operations', path: ['fromAccountId'] }
  );

/**
 * Express middleware to validate request body against a Zod schema.
 * Rejects malformed types, extra keys, or bad formats with clean HTTP 400.
 */
export function validateBody<T>(schema: z.ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction) => {
    const parseResult = schema.safeParse(req.body);
    if (!parseResult.success) {
      const issues = parseResult.error.issues.map((i) => ({
        field: i.path.join('.'),
        message: i.message,
      }));
      return res.status(400).json({
        error: 'Validation failed',
        details: issues,
      });
    }
    req.body = parseResult.data;
    next();
  };
}

