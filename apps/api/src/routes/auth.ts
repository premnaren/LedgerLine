import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/db';
import { JwtPayload } from '../middleware/auth';

const router = Router();

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-jwt-key-for-development-ledgerline-2026';
const JWT_REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET || 'super-secret-jwt-refresh-key-for-development-ledgerline-2026';

const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_DAYS = 7;

export function generateTokens(userId: string, role: string, email: string) {
  const accessToken = jwt.sign({ userId, role, email }, JWT_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRY,
  });

  const refreshToken = jwt.sign(
    { userId, jti: crypto.randomUUID() },
    JWT_REFRESH_SECRET,
    { expiresIn: `${REFRESH_TOKEN_DAYS}d` }
  );

  return { accessToken, refreshToken };
}

// POST /auth/login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await prisma.user.findUnique({
      where: { email: String(email).trim().toLowerCase() },
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const passwordMatch = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const { accessToken, refreshToken } = generateTokens(user.id, user.role, user.email);

    // Save refresh token in DB
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000);
    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        active: true,
        expiresAt,
      },
    });

    // Set cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000,
      path: '/',
    });

    return res.status(200).json({
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /auth/refresh
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const refreshToken = req.body?.refreshToken || req.cookies?.refreshToken;

    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token is required' });
    }

    let payload: { userId: string };
    try {
      payload = jwt.verify(refreshToken, JWT_REFRESH_SECRET) as { userId: string };
    } catch (err) {
      return res.status(401).json({ error: 'Invalid or expired refresh token' });
    }

    // Verify in database that token is active and not expired
    const storedToken = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true },
    });

    if (!storedToken || !storedToken.active || storedToken.expiresAt < new Date()) {
      return res.status(401).json({ error: 'Refresh token has been revoked or expired' });
    }

    const user = storedToken.user;
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    const newAccessToken = jwt.sign(
      { userId: user.id, role: user.role, email: user.email },
      JWT_SECRET,
      { expiresIn: ACCESS_TOKEN_EXPIRY }
    );

    return res.status(200).json({
      accessToken: newAccessToken,
    });
  } catch (error) {
    console.error('Refresh error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /auth/logout
router.post('/logout', async (req: Request, res: Response) => {
  try {
    const refreshToken = req.body?.refreshToken || req.cookies?.refreshToken;

    if (refreshToken) {
      await prisma.refreshToken.updateMany({
        where: { token: refreshToken },
        data: { active: false },
      });
    }

    res.clearCookie('refreshToken', { path: '/' });
    return res.status(200).json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
