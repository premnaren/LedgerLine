import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import logger from '../config/logger';

declare global {
  namespace Express {
    interface Request {
      id?: string;
    }
  }
}

/**
 * Structured request logger.
 * Emits JSON logs for every HTTP request, with dedicated operational metadata
 * (amount, operation type, duration, outcome, hashed idempotency key) for money movements.
 */
export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const requestId = crypto.randomUUID();
  req.id = requestId;
  res.setHeader('X-Request-Id', requestId);

  const startTime = Date.now();

  res.on('finish', () => {
    const durationMs = Date.now() - startTime;
    const idempotencyKey = req.header('Idempotency-Key');
    const hashedKey = idempotencyKey
      ? crypto.createHash('sha256').update(idempotencyKey.trim()).digest('hex').slice(0, 16)
      : undefined;

    const isMoneyMoving = req.baseUrl === '/transfers' || req.path.startsWith('/transfers');
    let outcome: 'POSTED' | 'REFUSED' | 'ERROR' | 'INFO' = 'INFO';

    if (isMoneyMoving && req.method === 'POST') {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        outcome = 'POSTED';
      } else if (res.statusCode === 400 || res.statusCode === 403) {
        outcome = 'REFUSED';
      } else {
        outcome = 'ERROR';
      }
    }

    const logPayload: Record<string, any> = {
      requestId,
      method: req.method,
      url: req.originalUrl || req.url,
      statusCode: res.statusCode,
      durationMs,
      userId: req.user?.userId || 'anonymous',
      role: req.user?.role || 'NONE',
    };

    if (hashedKey) {
      logPayload.idempotencyKeyHash = hashedKey;
    }

    if (isMoneyMoving && req.method === 'POST' && req.body) {
      logPayload.operationType = req.body.type;
      logPayload.amount = req.body.amount;
      logPayload.outcome = outcome;
    }

    if (res.statusCode >= 500) {
      logger.error(logPayload, 'HTTP Request Error');
    } else if (res.statusCode >= 400) {
      logger.warn(logPayload, 'HTTP Request Refused/Client Error');
    } else {
      logger.info(logPayload, 'HTTP Request Completed');
    }
  });

  next();
}

export default requestLogger;

