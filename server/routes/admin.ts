import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../db.js';
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth.js';
import { logAudit } from '../middleware/audit.js';

const router = Router();
router.use(authenticate);
router.use(requireAdmin);

// === AUDIT LOGS ===
router.get('/audit-logs', async (req, res) => {
  try {
    const skip = parseInt(req.query.skip as string) || 0;
    const take = parseInt(req.query.take as string) || 50;
    
    const logs = await prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      skip,
      take
    });
    
    const total = await prisma.auditLog.count();
    res.json({ data: logs, total, skip, take });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

// === SETTINGS ===
router.get('/settings', async (req, res) => {
  try {
    const settings = await prisma.systemSetting.findMany();
    const config = settings.reduce((acc, curr) => ({ ...acc, [curr.key]: curr.value }), {});
    res.json(config);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

router.put('/settings', logAudit('UPDATE_SETTINGS', 'SystemSetting'), async (req: AuthRequest, res) => {
  try {
    const settings = req.body;
    
    for (const [key, value] of Object.entries(settings)) {
      await prisma.systemSetting.upsert({
        where: { key },
        update: { value: String(value), updatedBy: req.user!.id },
        create: { key, value: String(value), updatedBy: req.user!.id }
      });
    }

    res.locals.auditNewData = settings;
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// === USERS (CHECKERS) ===
router.get('/users', async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, name: true, email: true, role: true, active: true, lastLoginAt: true }
    });
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

router.post('/users', logAudit('CREATE_USER', 'User'), async (req: AuthRequest, res) => {
  try {
    const { name, email, password, role } = req.body;
    
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(400).json({ error: 'Email already exists' });

    const passwordHash = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: { name, email, passwordHash, role: role || 'CHECKER' },
      select: { id: true, name: true, email: true, role: true, active: true }
    });

    res.locals.entityId = newUser.id;
    res.locals.auditNewData = { name, email, role: newUser.role };

    res.status(201).json(newUser);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create user' });
  }
});

router.patch('/users/:id/status', logAudit('UPDATE_USER_STATUS', 'User'), async (req: AuthRequest, res) => {
  try {
    const { active } = req.body;
    
    // Prevent disabling the last admin
    if (!active) {
      const user = await prisma.user.findUnique({ where: { id: req.params.id } });
      if (user?.role === 'ADMIN') {
        const activeAdmins = await prisma.user.count({ where: { role: 'ADMIN', active: true } });
        if (activeAdmins <= 1) {
          return res.status(400).json({ error: 'Cannot disable the last active Admin' });
        }
      }
    }

    const updated = await prisma.user.update({
      where: { id: req.params.id },
      data: { active },
      select: { id: true, name: true, email: true, role: true, active: true }
    });

    res.locals.auditNewData = { active };
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update user status' });
  }
});

export default router;
