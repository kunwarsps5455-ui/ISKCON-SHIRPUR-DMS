import { Router } from 'express';
import { prisma } from '../db.js';
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth.js';
import { runFifteenMinuteRefresh } from '../services/dataRefreshService.js';

const router = Router();
router.use(authenticate);

// Authenticated 15-minute CRM & birthday refresh trigger (safe when CRON_SECRET is set in production)
router.post('/refresh', async (_req: AuthRequest, res) => {
  try {
    const result = await runFifteenMinuteRefresh();
    res.json({
      message: '15-minute data refresh executed successfully',
      ...result
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to execute CRM data refresh' });
  }
});

// ============================================================================
// 1. CRM DASHBOARD & ANALYTICS OVERVIEW
// ============================================================================

router.get('/stats', async (_req, res) => {
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    // Fetch tasks counts
    const [allTasks, allDonors, recentInteractions] = await Promise.all([
      prisma.crmTask.findMany().catch(() => []),
      prisma.donor.findMany({ select: { id: true, stage: true } }).catch(() => []),
      prisma.interaction.findMany({
        take: 10,
        orderBy: { interactionDate: 'desc' },
        include: {
          donor: { select: { id: true, fullName: true, donorId: true, stage: true } }
        }
      }).catch(() => [])
    ]);

    const pendingTasks = allTasks.filter((t: any) => t.status === 'PENDING' || t.status === 'IN_PROGRESS');
    const completedTasks = allTasks.filter((t: any) => t.status === 'COMPLETED');
    const dueTodayTasks = pendingTasks.filter((t: any) => {
      if (!t.dueDate) return false;
      const d = new Date(t.dueDate);
      return d >= todayStart && d <= todayEnd;
    });
    const overdueTasks = pendingTasks.filter((t: any) => {
      if (!t.dueDate) return false;
      return new Date(t.dueDate) < todayStart;
    });

    // Stage counts
    const stageCounts: Record<string, number> = {
      PROSPECT: 0,
      FIRST_TIME: 0,
      REGULAR: 0,
      PATRON: 0,
      LIFE_PATRON: 0,
      LAPSED: 0,
    };

    allDonors.forEach((d: any) => {
      const s = d.stage || 'REGULAR';
      if (stageCounts[s] !== undefined) stageCounts[s]++;
      else stageCounts[s] = 1;
    });

    res.json({
      tasks: {
        totalPending: pendingTasks.length,
        dueToday: dueTodayTasks.length,
        overdue: overdueTasks.length,
        completed: completedTasks.length,
      },
      stages: stageCounts,
      totalDonors: allDonors.length,
      recentInteractions
    });
  } catch (error) {
    console.error('Failed to get CRM stats:', error);
    res.status(500).json({ error: 'Failed to fetch CRM statistics' });
  }
});

// ============================================================================
// 2. CRM TASK MANAGEMENT
// ============================================================================

router.get('/tasks', async (req, res) => {
  try {
    const { status, priority, filter, donorId } = req.query as Record<string, string>;
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    let whereClause: any = {};

    if (donorId) whereClause.donorId = donorId;
    if (priority) whereClause.priority = priority;

    if (status) {
      whereClause.status = status;
    } else if (filter === 'completed') {
      whereClause.status = 'COMPLETED';
    } else if (filter === 'today') {
      whereClause.status = { in: ['PENDING', 'IN_PROGRESS'] };
      whereClause.dueDate = { gte: todayStart, lte: todayEnd };
    } else if (filter === 'overdue') {
      whereClause.status = { in: ['PENDING', 'IN_PROGRESS'] };
      whereClause.dueDate = { lt: todayStart };
    } else if (filter === 'upcoming') {
      whereClause.status = { in: ['PENDING', 'IN_PROGRESS'] };
      whereClause.dueDate = { gt: todayEnd };
    } else if (filter === 'pending') {
      whereClause.status = { in: ['PENDING', 'IN_PROGRESS'] };
    }

    const tasks = await prisma.crmTask.findMany({
      where: whereClause,
      orderBy: [
        { priority: 'desc' },
        { dueDate: 'asc' },
        { createdAt: 'desc' }
      ],
      include: {
        donor: {
          select: { id: true, fullName: true, donorId: true, mobile: true, stage: true }
        }
      }
    }).catch(() => []);

    res.json(tasks);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch CRM tasks' });
  }
});

// Create task
router.post('/tasks', async (req: AuthRequest, res) => {
  try {
    const { donorId, title, description, dueDate, priority = 'MEDIUM', assignedTo } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Task title is required' });
    }

    const task = await prisma.crmTask.create({
      data: {
        donorId: donorId || null,
        title,
        description,
        dueDate: dueDate ? new Date(dueDate) : null,
        priority,
        status: 'PENDING',
        assignedTo,
        createdBy: req.user!.name || req.user!.id
      },
      include: {
        donor: {
          select: { id: true, fullName: true, donorId: true, mobile: true, stage: true }
        }
      }
    });

    res.status(201).json(task);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create CRM task' });
  }
});

// Update task status or fields
router.patch('/tasks/:id', async (req: AuthRequest, res) => {
  try {
    const id = String(req.params.id);
    const { status, title, description, dueDate, priority, assignedTo } = req.body;

    const dataToUpdate: any = {};
    if (status !== undefined) {
      dataToUpdate.status = status;
      if (status === 'COMPLETED') {
        dataToUpdate.completedAt = new Date();
      } else {
        dataToUpdate.completedAt = null;
      }
    }
    if (title !== undefined) dataToUpdate.title = title;
    if (description !== undefined) dataToUpdate.description = description;
    if (dueDate !== undefined) dataToUpdate.dueDate = dueDate ? new Date(dueDate) : null;
    if (priority !== undefined) dataToUpdate.priority = priority;
    if (assignedTo !== undefined) dataToUpdate.assignedTo = assignedTo;

    const task = await prisma.crmTask.update({
      where: { id },
      data: dataToUpdate,
      include: {
        donor: {
          select: { id: true, fullName: true, donorId: true, mobile: true, stage: true }
        }
      }
    });

    res.json(task);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update CRM task' });
  }
});

// Delete task (Admin only)
router.delete('/tasks/:id', requireAdmin, async (req, res) => {
  try {
    const id = String(req.params.id);
    await prisma.crmTask.delete({ where: { id } });
    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete task' });
  }
});

// ============================================================================
// 3. DEVOTEE INTERACTIONS (Calls, Visits, Meetings, Darshans)
// ============================================================================

// Get interaction history for donor
router.get('/interactions/donor/:donorId', async (req, res) => {
  try {
    const donorId = String(req.params.donorId);
    const interactions = await prisma.interaction.findMany({
      where: { donorId },
      orderBy: { interactionDate: 'desc' }
    }).catch(() => []);

    res.json(interactions);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch donor interactions' });
  }
});

// Log new interaction for donor
router.post('/interactions/donor/:donorId', async (req: AuthRequest, res) => {
  try {
    const donorId = String(req.params.donorId);
    const { type, subject, notes, outcome, interactionDate } = req.body;

    if (!type || !subject) {
      return res.status(400).json({ error: 'Interaction type and subject are required' });
    }

    const interaction = await prisma.interaction.create({
      data: {
        donorId,
        type,
        subject,
        notes,
        outcome,
        interactionDate: interactionDate ? new Date(interactionDate) : new Date(),
        createdBy: req.user!.name || req.user!.id
      }
    });

    res.status(201).json(interaction);
  } catch (error) {
    res.status(500).json({ error: 'Failed to log interaction' });
  }
});

// Update donor CRM stage
router.patch('/donor/:donorId/stage', requireAdmin, async (req, res) => {
  try {
    const donorId = String(req.params.donorId);
    const { stage } = req.body;
    const validStages = ['PROSPECT', 'FIRST_TIME', 'REGULAR', 'PATRON', 'LIFE_PATRON', 'LAPSED'];

    if (!validStages.includes(stage)) {
      return res.status(400).json({ error: 'Invalid stage value' });
    }

    const donor = await prisma.donor.update({
      where: { id: donorId },
      data: { stage }
    });

    res.json(donor);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update donor stage' });
  }
});

export default router;
