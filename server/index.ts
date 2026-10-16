import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import cron from 'node-cron';
import { runBirthdayCheck } from './services/birthdayAutomation.js';

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

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
app.use(express.json());
app.use(cookieParser());

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/donors', donorRoutes);
app.use('/api/donations', donationRoutes);
app.use('/api/family', familyRoutes);
app.use('/api/birthdays', birthdayRoutes);
app.use('/api/templates', templateRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/import', importRoutes);
app.use('/api', adminRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'ISKCON Shirpur DMS Backend Running' });
});

// Setup Cron Job for Birthday Automation
// Runs every day at 08:00 AM in Asia/Kolkata timezone
cron.schedule('0 8 * * *', async () => {
  console.log('Running daily birthday automation job...');
  try {
    await runBirthdayCheck(false);
  } catch (error) {
    console.error('Failed to run scheduled birthday check:', error);
  }
}, {
  timezone: process.env.TIMEZONE || 'Asia/Kolkata'
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
