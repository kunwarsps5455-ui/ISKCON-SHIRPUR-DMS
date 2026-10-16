import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../db.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';

const router = Router();

// Per-account failed login attempt tracker (prevents brute force without locking out other accounts)
const failedLoginTracker = new Map<string, { count: number; resetAt: number }>();
const MAX_FAILED_ATTEMPTS = 10;
const LOCKOUT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const now = Date.now();
    const tracker = failedLoginTracker.get(normalizedEmail);

    if (tracker && now < tracker.resetAt && tracker.count >= MAX_FAILED_ATTEMPTS) {
      return res.status(429).json({
        error: 'Too many failed login attempts for this account. Please try again after 15 minutes.'
      });
    }

    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });

    if (!user || !user.active) {
      const current = failedLoginTracker.get(normalizedEmail);
      const count = current && now < current.resetAt ? current.count + 1 : 1;
      failedLoginTracker.set(normalizedEmail, { count, resetAt: now + LOCKOUT_WINDOW_MS });
      return res.status(401).json({ error: 'Invalid credentials or inactive account' });
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      const current = failedLoginTracker.get(normalizedEmail);
      const count = current && now < current.resetAt ? current.count + 1 : 1;
      failedLoginTracker.set(normalizedEmail, { count, resetAt: now + LOCKOUT_WINDOW_MS });
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    failedLoginTracker.delete(normalizedEmail);

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() }
    });

    const token = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.AUTH_SECRET || 'secret',
      { expiresIn: '24h' }
    );

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000 // 24h
    });

    res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      },
      token
    });
  } catch (error) {
    res.status(500).json({ error: 'Login failed' });
  }
});

router.post('/logout', (_req, res) => {
  res.clearCookie('token');
  res.json({ success: true });
});

router.get('/me', authenticate, async (req: AuthRequest, res) => {
  res.json({ user: req.user });
});

export default router;
