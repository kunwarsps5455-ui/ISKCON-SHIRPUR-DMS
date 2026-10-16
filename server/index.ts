import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import cron from 'node-cron';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

import { runBirthdayCheck } from './services/birthdayAutomation.js';
import { runAutomatedFestivalCheck } from './services/festivalService.js';
import { runFifteenMinuteRefresh } from './services/dataRefreshService.js';

// Import Routes
import authRoutes from './routes/auth.js';
import donorRoutes from './routes/donors.js';
import donationRoutes from './routes/donations.js';
import familyRoutes from './routes/family.js';
import birthdayRoutes from './routes/birthdays.js';
import templateRoutes from './routes/templates.js';
import reportRoutes from './routes/reports.js';
import adminRoutes from './routes/admin.js';
import exportRoutes from './routes/export.js';
import importRoutes from './routes/import.js';
import crmRoutes from './routes/crm.js';
import whatsappRoutes from './routes/whatsapp.js';
import festivalRoutes from './routes/festivals.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 5000;

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(cookieParser());

// ============================================================================
// SYSTEM HEALTH & PUBLIC MONITORING ENDPOINTS
// ============================================================================

// System Health Endpoint
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    message: 'ISKCON Shirpur DMS & Devotee CRM Backend Running',
    version: '2.0.0',
    timestamp: new Date().toISOString()
  });
});

/**
 * HTTP Endpoint to trigger 15-minute refresh externally (e.g. Render Cron, UptimeRobot)
 * Solves Render free tier sleeping while automatically refreshing data!
 */
app.get('/api/cron/refresh-15min', async (req, res) => {
  const secret = req.query.secret || req.headers['x-cron-secret'];
  const expectedSecret = process.env.CRON_SECRET;

  if (expectedSecret && secret !== expectedSecret) {
    return res.status(401).json({ error: 'Unauthorized cron request' });
  }

  try {
    const result = await runFifteenMinuteRefresh();
    res.json({ message: '15-minute data refresh executed successfully', ...result });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Refresh execution failed' });
  }
});

// ============================================================================
// MOUNT API ROUTE MODULES
// ============================================================================

app.use('/api/auth', authRoutes);
app.use('/api/donors', donorRoutes);
app.use('/api/donations', donationRoutes);
app.use('/api/family', familyRoutes);
app.use('/api/birthdays', birthdayRoutes);
app.use('/api/templates', templateRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/import', importRoutes);
app.use('/api/crm', crmRoutes);
app.use('/api/whatsapp', whatsappRoutes);
app.use('/api/festivals', festivalRoutes);
app.use('/api', adminRoutes);

// Setup In-Server Scheduled 15-Minute Cron Job
cron.schedule('*/15 * * * *', async () => {
  console.log('[Scheduler] Executing 15-minute data refresh cycle...');
  try {
    await runFifteenMinuteRefresh();
  } catch (error) {
    console.error('[Scheduler] Error running 15-minute refresh:', error);
  }
});

// Setup Daily 8:00 AM Birthday & Hindu Festival Greetings Job
cron.schedule('0 8 * * *', async () => {
  console.log('[Scheduler] Executing daily 8:00 AM morning birthday & festival greetings...');
  try {
    await runBirthdayCheck(false);
    await runAutomatedFestivalCheck(false);
  } catch (error) {
    console.error('[Scheduler] Failed to run morning birthday/festival check:', error);
  }
}, {
  timezone: process.env.TIMEZONE || 'Asia/Kolkata'
});

// ============================================================================
// PRODUCTION STATIC SERVING FOR RENDER DEPLOYMENT
// ============================================================================

const distPath = path.resolve(__dirname, '../dist');
if (fs.existsSync(distPath)) {
  console.log(`[Production] Serving static files from ${distPath}`);
  app.use(express.static(distPath));

  // SPA catch-all fallback
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

app.listen(port, () => {
  console.log(`[Server] ISKCON Shirpur DMS is running on port ${port}`);
  // Automatically reconcile today's birthdays and festivals on server startup (skip on isolated test runner port 5555)
  if (String(port) !== '5555') {
    setTimeout(() => {
      runFifteenMinuteRefresh().catch(err =>
        console.error('[Startup Auto-Sync] Error during initial birthday/festival check:', err)
      );
    }, 2000);
  }
});
