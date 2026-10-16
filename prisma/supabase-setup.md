# Supabase PostgreSQL Setup & Migration Guide

## Step 1: Create a Supabase Project
1. Log in to [Supabase](https://supabase.com).
2. Click **New Project**, select an organization, name it (e.g. `iskcon-shirpur-dms`), and choose the closest region (e.g., `South Asia (Mumbai)`).
3. Set a strong Database Password and keep it secure.

---

## Step 2: Obtain Connection Strings
In your Supabase project dashboard:
1. Navigate to **Project Settings** (gear icon) -> **Database**.
2. Scroll to the **Connection string** section.
3. Select the **URI** tab:
   - For `DATABASE_URL`: Select **Transaction Pooler** (Port `6543`). The string looks like:
     ```
     postgresql://postgres.[REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true
     ```
   - For `DIRECT_URL`: Select **Session** or **Direct** (Port `5432`). The string looks like:
     ```
     postgresql://postgres.[REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres
     ```
4. Copy these into your `.env` file (or Render Environment Variables).

---

## Step 3: Initialize Database Schema

You have two easy options:

### Option A: Via Supabase SQL Editor (Instant 1-Click Setup)
1. Go to **SQL Editor** in the Supabase Dashboard.
2. Click **New query**.
3. Open [`prisma/supabase_setup.sql`](file:///C:/Users/kunwa/.gemini/antigravity/scratch/iskcon-shirpur-dms/prisma/supabase_setup.sql) in this repository, copy all text, paste it into the SQL editor, and click **Run**.
4. All tables, constraints, default settings, and templates will be created instantly.

### Option B: Via Prisma CLI
Once you configure `DATABASE_URL` and `DIRECT_URL` in `.env`:
```bash
npm run prisma:push
npm run seed
```

---

## Step 4: Verify Default Accounts
After running seed or SQL setup:
- **Admin**: `admin@iskconshirpur.org` / `admin123`
- **Checker**: `checker@iskconshirpur.org` / `checker123`
