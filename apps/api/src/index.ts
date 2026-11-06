import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import prisma from './config/db';
import authRouter from './routes/auth';
import accountsRouter from './routes/accounts';
import transfersRouter from './routes/transfers';
import statementsRouter from './routes/statements';
import adminRouter from './routes/admin';

dotenv.config();

// Fix BigInt serialization in JSON
(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

export const app = express();

app.use(
  cors({
    origin: process.env.CORS_ORIGIN || true,
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

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
app.use('/transfers', transfersRouter);
app.use('/statements', statementsRouter);
app.use('/admin', adminRouter);

const PORT = process.env.PORT || 4000;

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`LedgerLine API running on port ${PORT}`);
  });
}

export default app;
