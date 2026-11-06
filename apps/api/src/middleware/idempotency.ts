import { Request, Response, NextFunction } from 'express';
import { IdempotencyStatus } from '@prisma/client';
import { claimIdempotencyKey, finalizeIdempotencyKey } from '../services/idempotencyService';

export async function idempotencyMiddleware(req: Request, res: Response, next: NextFunction) {
  const idempotencyKey = req.header('Idempotency-Key');

  // a. If no Idempotency-Key header, return 400 for POST /transfers routes
  if (!idempotencyKey || typeof idempotencyKey !== 'string' || idempotencyKey.trim().length === 0) {
    return res.status(400).json({ error: 'Missing required Idempotency-Key header' });
  }

  const trimmedKey = idempotencyKey.trim();

  try {
    // Atomic insert with ON CONFLICT DO NOTHING to avoid read-then-write race
    const result = await claimIdempotencyKey(trimmedKey);

    if (!result.isNew) {
      // c. If status='COMPLETE': return the stored httpStatus + responseBody immediately
      if (result.status === IdempotencyStatus.COMPLETE) {
        return res
          .status(result.httpStatus || 200)
          .json(result.responseBody);
      }

      // d. If status='PROCESSING': return 409 { error: "request_in_flight" }
      if (result.status === IdempotencyStatus.PROCESSING) {
        return res.status(409).json({ error: 'request_in_flight' });
      }

      // If status='FAILED', return the failure response
      if (result.status === IdempotencyStatus.FAILED) {
        return res
          .status(result.httpStatus || 400)
          .json(result.responseBody || { error: 'Previous request failed' });
      }
    }

    // e. If newly inserted: attach the key ID to req.idempotencyKeyId, then call next()
    req.idempotencyKeyId = result.keyId;

    // f. Response intercept wrapper to capture response body and status
    let capturedBody: any = null;
    const originalJson = res.json.bind(res);
    const originalSend = res.send.bind(res);

    res.json = function (body: any) {
      capturedBody = body;
      return originalJson(body);
    };

    res.send = function (body: any) {
      if (capturedBody === null) {
        try {
          capturedBody = typeof body === 'string' ? JSON.parse(body) : body;
        } catch {
          capturedBody = body;
        }
      }
      return originalSend(body);
    };

    res.on('finish', async () => {
      if (!req.idempotencyKeyId) return;

      const isSuccess = res.statusCode >= 200 && res.statusCode < 400;
      const status = isSuccess ? IdempotencyStatus.COMPLETE : IdempotencyStatus.FAILED;

      await finalizeIdempotencyKey(
        req.idempotencyKeyId,
        status,
        res.statusCode,
        capturedBody
      );
    });

    next();
  } catch (error) {
    console.error('Idempotency middleware error:', error);
    return res.status(500).json({ error: 'Internal idempotency failure' });
  }
}

export default idempotencyMiddleware;

