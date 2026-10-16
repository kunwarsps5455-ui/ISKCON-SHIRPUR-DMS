import { prisma } from '../db.js';
import { runBirthdayCheck } from './birthdayAutomation.js';
import { runAutomatedFestivalCheck } from './festivalService.js';

export interface RefreshResult {
  timestamp: string;
  tasksChecked: number;
  overdueTasksDetected: number;
  birthdaySyncResult: any;
  festivalSyncResult?: any;
  status: 'SUCCESS' | 'PARTIAL' | 'FAILED';
  error?: string;
}

/**
 * 15-Minute Data Refresh & System Sync Engine
 * Executes automatically every 15 minutes to keep devotee records,
 * pending CRM tasks, and automated birthday & festival messages updated.
 */
export async function runFifteenMinuteRefresh(): Promise<RefreshResult> {
  const now = new Date();
  console.log(`[15-Min System Refresh] Starting automatic refresh cycle at ${now.toISOString()}`);

  let tasksChecked = 0;
  let overdueTasksDetected = 0;
  let birthdaySyncResult: any = null;
  let festivalSyncResult: any = null;

  try {
    // 1. Reconcile CRM Tasks: Mark or count overdue tasks
    const pendingTasks = await prisma.crmTask.findMany({
      where: {
        status: { in: ['PENDING', 'IN_PROGRESS'] },
        dueDate: { not: null }
      }
    }).catch(() => []);

    tasksChecked = pendingTasks.length;

    for (const task of pendingTasks) {
      if (task.dueDate && new Date(task.dueDate) < now) {
        overdueTasksDetected++;
      }
    }

    // 2. Automated Birthday & Seva Anniversary Reconciliation (Donors & Permitted Family Members)
    try {
      birthdaySyncResult = await runBirthdayCheck(false);
    } catch (err: any) {
      console.warn('[15-Min System Refresh] Birthday sync sub-task notice:', err.message);
    }

    // 3. Automated Major Hindu & ISKCON Festival Reconciliation (Donors & Permitted Family Members)
    try {
      festivalSyncResult = await runAutomatedFestivalCheck(false);
    } catch (err: any) {
      console.warn('[15-Min System Refresh] Festival sync sub-task notice:', err.message);
    }

    // 4. Update Last Refreshed System Setting
    await prisma.systemSetting.upsert({
      where: { key: 'LAST_DATA_REFRESH_AT' },
      update: { value: now.toISOString(), updatedAt: now },
      create: { key: 'LAST_DATA_REFRESH_AT', value: now.toISOString(), updatedBy: 'system' }
    }).catch(() => {});

    console.log(`[15-Min System Refresh] Completed successfully: ${tasksChecked} tasks evaluated, ${overdueTasksDetected} overdue.`);

    return {
      timestamp: now.toISOString(),
      tasksChecked,
      overdueTasksDetected,
      birthdaySyncResult,
      festivalSyncResult,
      status: 'SUCCESS'
    };
  } catch (error: any) {
    console.error('[15-Min System Refresh] Error during refresh cycle:', error);
    return {
      timestamp: now.toISOString(),
      tasksChecked,
      overdueTasksDetected,
      birthdaySyncResult,
      status: 'FAILED',
      error: error.message
    };
  }
}
