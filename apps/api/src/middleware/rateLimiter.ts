import rateLimit from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import { Request, Response } from 'express';
import redisClient from '../config/redis';

function createRedisStore(prefix: string) {
  if (redisClient) {
    return new RedisStore({
      prefix,
      sendCommand: (...args: string[]) => (redisClient as any).call(args[0], ...args.slice(1)),
    });
  }
  return undefined; // Graceful in-memory fallback
}

/**
 * User-scoped distributed rate limiter for money-moving endpoints.
 * Keyed on authenticated userId (not IP) to prevent proxy collisions and resource exhaustion.
 * Backed by Redis when REDIS_URL is configured; seamlessly falls back to memory.
 * Allows max 30 requests per minute per user, returning HTTP 429 with standard headers.
 */
export const transferRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: process.env.NODE_ENV === 'test' ? 500 : 30,
  standardHeaders: true,
  legacyHeaders: true,
  store: createRedisStore('rl:transfer:'),
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

/**
 * IP-scoped distributed rate limiter for authentication endpoints.
 * Protects against credential stuffing and brute-force attacks.
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'test' ? 500 : 20,
  standardHeaders: true,
  legacyHeaders: true,
  store: createRedisStore('rl:auth:'),
  handler: (_req: Request, res: Response) => {
    res.setHeader('Retry-After', '900');
    return res.status(429).json({
      error: 'Too many authentication attempts. Please try again after 15 minutes.',
      retryAfterSeconds: 900,
    });
  },
});

export default transferRateLimiter;
