import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';

/**
 * User-scoped rate limiter for money-moving endpoints.
 * Keyed on authenticated userId (not IP) to prevent proxy collisions and resource exhaustion.
 * Allows max 30 requests per minute per user, returning HTTP 429 with a Retry-After header.
 */
export const transferRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: process.env.NODE_ENV === 'test' ? 500 : 30,
  standardHeaders: true, // Return standard RateLimit headers
  legacyHeaders: true,
  validate: { keyGeneratorIpFallback: false },
  keyGenerator: (req: Request) => {
    return req.user?.userId || req.ip || 'anonymous';
  },
  handler: (_req: Request, res: Response) => {
    res.setHeader('Retry-After', '60');
    return res.status(429).json({
      error: 'Too many transfer requests. Rate limit is 30 requests per minute per user.',
      retryAfterSeconds: 60,
    });
  },
});

export default transferRateLimiter;
