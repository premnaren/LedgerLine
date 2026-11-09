import Redis from 'ioredis';
import logger from './logger';

const redisUrl = process.env.REDIS_URL;

let redisClient: Redis | null = null;
let isConnected = false;

if (redisUrl && redisUrl.trim() !== '') {
  try {
    redisClient = new Redis(redisUrl, {
      maxRetriesPerRequest: 2,
      enableOfflineQueue: false,
      lazyConnect: false,
      connectTimeout: 5000,
      retryStrategy: (times) => {
        if (times > 5) {
          logger.warn('Redis reconnection attempts exceeded. Falling back to in-memory store.');
          return null; // Stop reconnecting after 5 attempts
        }
        return Math.min(times * 500, 3000);
      },
    });

    redisClient.on('connect', () => {
      isConnected = true;
      logger.info('Redis connection established for distributed rate limiting.');
    });

    redisClient.on('ready', () => {
      isConnected = true;
    });

    redisClient.on('error', (err) => {
      isConnected = false;
      logger.warn({ err: err.message }, 'Redis error encountered. Falling back gracefully to memory rate limiting.');
    });

    redisClient.on('close', () => {
      isConnected = false;
    });
  } catch (err: any) {
    logger.warn({ err: err.message }, 'Failed to initialize Redis client. Using in-memory fallback.');
    redisClient = null;
  }
} else {
  logger.info('REDIS_URL not configured. Operating with in-memory rate limiter.');
}

export function getRedisClient(): Redis | null {
  return isConnected ? redisClient : null;
}

export function getRedisStatus(): {
  configured: boolean;
  connected: boolean;
  mode: 'distributed_redis' | 'local_memory';
  urlRedacted?: string;
} {
  const configured = Boolean(redisUrl && redisUrl.trim() !== '');
  let urlRedacted: string | undefined = undefined;

  if (configured && redisUrl) {
    try {
      const parsed = new URL(redisUrl);
      if (parsed.password) parsed.password = '***';
      urlRedacted = parsed.toString();
    } catch {
      urlRedacted = 'redis://[configured]';
    }
  }

  return {
    configured,
    connected: isConnected,
    mode: isConnected ? 'distributed_redis' : 'local_memory',
    urlRedacted,
  };
}

export default redisClient;

