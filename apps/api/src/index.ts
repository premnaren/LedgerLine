import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import YAML from 'yamljs';
import swaggerUi from 'swagger-ui-express';
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

// Security headers with CSP allowing Swagger UI assets
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:"],
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

// OpenAPI Documentation served at /api-docs
const openApiFilePath = [
  path.join(__dirname, '../openapi.yaml'),
  path.join(process.cwd(), 'openapi.yaml'),
  path.join(process.cwd(), 'apps/api/openapi.yaml'),
].find((p) => fs.existsSync(p));

if (openApiFilePath) {
  const swaggerDocument = YAML.load(openApiFilePath);
  app.use(
    '/api-docs',
    swaggerUi.serve,
    swaggerUi.setup(swaggerDocument, {
      swaggerOptions: {
        docExpansion: 'list',
        displayRequestDuration: true,
        filter: true,
      },
      customSiteTitle: 'LedgerLine Core Financial Ledger API Reference',
      customCss: `
        .topbar { background-color: #090d16 !important; border-bottom: 1px solid #1e293b; }
        .topbar-wrapper .link { display: flex; align-items: center; gap: 8px; }
        .topbar-wrapper img { content: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='28' height='28' viewBox='0 0 24 24' fill='none' stroke='%2338bdf8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6'/></svg>"); }
        .swagger-ui .info { margin: 24px 0 20px 0; }
        .swagger-ui .info .title { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-weight: 700; color: #0f172a; }
        .swagger-ui .info p, .swagger-ui .info li { font-size: 14px; line-height: 1.6; color: #334155; }
        .swagger-ui .info table { border-collapse: collapse; width: 100%; margin: 16px 0; font-size: 13px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); border-radius: 6px; overflow: hidden; border: 1px solid #e2e8f0; }
        .swagger-ui .info th { background-color: #0f172a; color: #f8fafc; padding: 10px 14px; font-weight: 600; text-align: left; }
        .swagger-ui .info td { border-bottom: 1px solid #e2e8f0; padding: 8px 14px; background-color: #ffffff; }
        .swagger-ui .info tr:nth-child(even) td { background-color: #f8fafc; }
        .swagger-ui .opblock-tag { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size: 18px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; margin-top: 24px; color: #0f172a; }
        .swagger-ui .opblock { border-radius: 8px; box-shadow: 0 1px 2px rgba(0,0,0,0.04); margin-bottom: 12px; }
        .swagger-ui .btn.authorize { background-color: #0284c7; color: #ffffff; border-color: #0284c7; border-radius: 6px; }
        .swagger-ui .btn.authorize svg { fill: #ffffff; }
      `,
    })
  );
  app.get('/openapi.json', (_req, res) => res.json(swaggerDocument));
}

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
