import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import prisma from './config/db';
import logger from './config/logger';
import requestLogger from './middleware/requestLogger';
import transferRateLimiter from './middleware/rateLimiter';
import authRouter from './routes/auth';
import accountsRouter from './routes/accounts';
import transfersRouter from './routes/transfers';
import statementsRouter from './routes/statements';
import adminRouter from './routes/admin';
import { startIdempotencyReaper } from './services/idempotencyReaper';

dotenv.config();

// Fix BigInt serialization in JSON
(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

export const app = express();

// Security headers with restrictive CSP for JSON API
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'none'"],
        frameAncestors: ["'none'"],
      },
    },
    frameguard: { action: 'deny' },
    noSniff: true,
  })
);

app.use(
  cors({
    origin: process.env.CORS_ORIGIN || true,
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());
app.use(requestLogger);

// Health check
app.get('/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', db: 'connected', timestamp: new Date().toISOString() });
  } catch (error: any) {
    res.status(503).json({ status: 'error', db: 'disconnected', error: error?.message });
  }
});

// Routes
app.use('/auth', authRouter);
app.use('/accounts', accountsRouter);
app.use('/transfers', transferRateLimiter, transfersRouter);
app.use('/statements', statementsRouter);
app.use('/admin', adminRouter);

const PORT = process.env.PORT || 4000;

let server: any = null;

if (process.env.NODE_ENV !== 'test') {
  server = app.listen(PORT, () => {
    logger.info(`LedgerLine API running on port ${PORT}`);
    // Start background idempotency key reaper daemon
    startIdempotencyReaper();
  });

  // Graceful shutdown handling for SIGTERM / SIGINT
  const gracefulShutdown = async (signal: string) => {
    logger.info(`Received ${signal}. Starting graceful shutdown...`);
    if (server) {
      server.close(async () => {
        logger.info('HTTP server closed. Draining connections...');
        try {
          await prisma.$disconnect();
          logger.info('Database disconnected cleanly.');
          process.exit(0);
        } catch (err) {
          logger.error({ err }, 'Error during database disconnect');
          process.exit(1);
        }
      });

      // Force close after 10s timeout
      setTimeout(() => {
        logger.error('Graceful shutdown timeout exceeded. Forcing termination.');
        process.exit(1);
      }, 10000).unref();
    }
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
}

export default app;
