-- ============================================================================
-- ISKCON SHIRPUR DONOR & SEVA MANAGEMENT SYSTEM (DMS & CRM)
-- SUPABASE POSTGRESQL DATABASE SCHEMA BOOTSTRAP SCRIPT
-- ============================================================================
-- You can run this script directly in the Supabase SQL Editor:
-- (Supabase Dashboard -> Project -> SQL Editor -> New Query -> Paste & Run)
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. USERS TABLE
CREATE TABLE IF NOT EXISTS "User" (
    "id" TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
    "name" TEXT NOT NULL,
    "email" TEXT UNIQUE NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'CHECKER', -- ADMIN, CHECKER
    "active" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3) WITH TIME ZONE,
    "createdAt" TIMESTAMP(3) WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2. DONORS TABLE (With CRM Stage & Omnichannel Preferences)
CREATE TABLE IF NOT EXISTS "Donor" (
    "id" TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
    "donorId" TEXT UNIQUE NOT NULL, -- e.g. ISK-000001
    "fullName" TEXT NOT NULL,
    "dob" TIMESTAMP(3) WITH TIME ZONE,
    "gender" TEXT,
    "mobile" TEXT,
    "email" TEXT,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "pincode" TEXT,
    "stage" TEXT NOT NULL DEFAULT 'REGULAR', -- PROSPECT, FIRST_TIME, REGULAR, PATRON, LIFE_PATRON, LAPSED
    "preferredChannel" TEXT NOT NULL DEFAULT 'WHATSAPP', -- WHATSAPP, SMS
    "whatsappPermission" TEXT NOT NULL DEFAULT 'ALLOWED', -- ALLOWED, NOT_ALLOWED, UNKNOWN
    "smsPermission" TEXT NOT NULL DEFAULT 'UNKNOWN',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE', -- ACTIVE, ARCHIVED
    "notes" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "idx_donor_mobile" ON "Donor"("mobile");
CREATE INDEX IF NOT EXISTS "idx_donor_stage" ON "Donor"("stage");
CREATE INDEX IF NOT EXISTS "idx_donor_status" ON "Donor"("status");

-- 3. DONATIONS TABLE
CREATE TABLE IF NOT EXISTS "Donation" (
    "id" TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
    "donationId" TEXT UNIQUE NOT NULL, -- e.g. DON-000001
    "donorId" TEXT NOT NULL REFERENCES "Donor"("id") ON DELETE CASCADE,
    "amount" DOUBLE PRECISION NOT NULL,
    "donationDate" TIMESTAMP(3) WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paymentMethod" TEXT NOT NULL, -- CASH, UPI, BANK_TRANSFER, CHEQUE, CARD, OTHER
    "transactionReference" TEXT,
    "purpose" TEXT,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'VALID', -- VALID, VOIDED
    "receiptSent" BOOLEAN NOT NULL DEFAULT false,
    "receiptChannel" TEXT, -- WHATSAPP, SMS
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "idx_donation_donor" ON "Donation"("donorId");
CREATE INDEX IF NOT EXISTS "idx_donation_date" ON "Donation"("donationDate");

-- 4. FAMILY MEMBERS TABLE
CREATE TABLE IF NOT EXISTS "FamilyMember" (
    "id" TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
    "donorId" TEXT NOT NULL REFERENCES "Donor"("id") ON DELETE CASCADE,
    "fullName" TEXT NOT NULL,
    "relationship" TEXT NOT NULL,
    "dob" TIMESTAMP(3) WITH TIME ZONE,
    "mobile" TEXT,
    "email" TEXT,
    "whatsappPermission" TEXT NOT NULL DEFAULT 'ALLOWED',
    "smsPermission" TEXT NOT NULL DEFAULT 'UNKNOWN',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "idx_family_donor" ON "FamilyMember"("donorId");

-- 5. CRM INTERACTIONS (Timeline of calls, temple visits, meetings, follow-ups)
CREATE TABLE IF NOT EXISTS "Interaction" (
    "id" TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
    "donorId" TEXT NOT NULL REFERENCES "Donor"("id") ON DELETE CASCADE,
    "type" TEXT NOT NULL, -- PHONE_CALL, TEMPLE_VISIT, MEETING, WHATSAPP, PRASADAM_SEVA, NOTE
    "subject" TEXT NOT NULL,
    "notes" TEXT,
    "outcome" TEXT,
    "interactionDate" TIMESTAMP(3) WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "idx_interaction_donor" ON "Interaction"("donorId");
CREATE INDEX IF NOT EXISTS "idx_interaction_date" ON "Interaction"("interactionDate");

-- 6. CRM TASKS (Follow-ups & Action Items)
CREATE TABLE IF NOT EXISTS "CrmTask" (
    "id" TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
    "donorId" TEXT REFERENCES "Donor"("id") ON DELETE SET NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "dueDate" TIMESTAMP(3) WITH TIME ZONE,
    "priority" TEXT NOT NULL DEFAULT 'MEDIUM', -- LOW, MEDIUM, HIGH, URGENT
    "status" TEXT NOT NULL DEFAULT 'PENDING', -- PENDING, IN_PROGRESS, COMPLETED, CANCELLED
    "assignedTo" TEXT,
    "completedAt" TIMESTAMP(3) WITH TIME ZONE,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "idx_crmtask_status" ON "CrmTask"("status");
CREATE INDEX IF NOT EXISTS "idx_crmtask_due" ON "CrmTask"("dueDate");

-- 7. BIRTHDAY MESSAGES (Zero-duplicate protection per calendar year)
CREATE TABLE IF NOT EXISTS "BirthdayMessage" (
    "id" TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
    "personType" TEXT NOT NULL, -- DONOR, FAMILY_MEMBER
    "personId" TEXT NOT NULL,
    "donorId" TEXT REFERENCES "Donor"("id") ON DELETE SET NULL,
    "birthdayDate" TIMESTAMP(3) WITH TIME ZONE NOT NULL,
    "birthdayYear" INTEGER NOT NULL,
    "channel" TEXT NOT NULL DEFAULT 'WHATSAPP', -- WHATSAPP, SMS
    "recipient" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "templateId" TEXT,
    "provider" TEXT,
    "providerMessageId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING', -- PENDING, QUEUED, SENT, DELIVERED, READ, FAILED, SKIPPED, REJECTED
    "sentAt" TIMESTAMP(3) WITH TIME ZONE,
    "deliveredAt" TIMESTAMP(3) WITH TIME ZONE,
    "failureReason" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "unique_person_year_channel" UNIQUE ("personId", "birthdayYear", "channel")
);

-- 8. META WHATSAPP LOGS (Real-time webhook and delivery tracking)
CREATE TABLE IF NOT EXISTS "WhatsAppLog" (
    "id" TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
    "recipientPhone" TEXT NOT NULL,
    "donorId" TEXT,
    "messageType" TEXT NOT NULL DEFAULT 'TEMPLATE', -- TEMPLATE, TEXT
    "templateName" TEXT,
    "content" TEXT,
    "metaMessageId" TEXT UNIQUE,
    "status" TEXT NOT NULL DEFAULT 'PENDING', -- PENDING, SENT, DELIVERED, READ, FAILED
    "errorDetails" TEXT,
    "sentAt" TIMESTAMP(3) WITH TIME ZONE,
    "deliveredAt" TIMESTAMP(3) WITH TIME ZONE,
    "readAt" TIMESTAMP(3) WITH TIME ZONE,
    "createdAt" TIMESTAMP(3) WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 9. MESSAGE TEMPLATES
CREATE TABLE IF NOT EXISTS "MessageTemplate" (
    "id" TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
    "name" TEXT NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'HI',
    "channel" TEXT NOT NULL DEFAULT 'WHATSAPP',
    "message" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 10. AUDIT LOGS
CREATE TABLE IF NOT EXISTS "AuditLog" (
    "id" TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
    "userId" TEXT NOT NULL,
    "userName" TEXT NOT NULL,
    "userRole" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "oldData" TEXT,
    "newData" TEXT,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 11. SYSTEM SETTINGS
CREATE TABLE IF NOT EXISTS "SystemSetting" (
    "id" TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
    "key" TEXT UNIQUE NOT NULL,
    "value" TEXT NOT NULL,
    "updatedBy" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- DEFAULT SYSTEM SEED DATA
-- ============================================================================

-- Default Settings
INSERT INTO "SystemSetting" ("id", "key", "value", "updatedBy", "updatedAt") VALUES
    (uuid_generate_v4()::TEXT, 'ORG_NAME', 'ISKCON Shirpur', 'system', CURRENT_TIMESTAMP),
    (uuid_generate_v4()::TEXT, 'ORG_DEITY', 'श्री श्री राधा गोपीनाथ', 'system', CURRENT_TIMESTAMP),
    (uuid_generate_v4()::TEXT, 'AUTO_WHATSAPP_ENABLED', 'true', 'system', CURRENT_TIMESTAMP),
    (uuid_generate_v4()::TEXT, 'AUTO_RECEIPT_ENABLED', 'true', 'system', CURRENT_TIMESTAMP),
    (uuid_generate_v4()::TEXT, 'AI_ENABLED', 'false', 'system', CURRENT_TIMESTAMP),
    (uuid_generate_v4()::TEXT, 'MESSAGING_TIME', '08:00', 'system', CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO NOTHING;

-- Default Hindi WhatsApp Birthday Template
INSERT INTO "MessageTemplate" ("id", "name", "language", "channel", "message", "active", "isDefault", "createdBy", "createdAt", "updatedAt") VALUES
    (uuid_generate_v4()::TEXT, 'Default Hindi WhatsApp Birthday Blessing', 'HI', 'WHATSAPP', 
    'प्रिय {{name}} जी,\n\nहरे कृष्ण! दण्डवत प्रणाम 🙏\n\nश्री श्री राधा गोपीनाथ एवं श्रील प्रभुपाद की असीम कृपा से आपका यह शुभ जन्मदिन सुख, शांति, उत्तम स्वास्थ्य एवं कृष्ण भावनामृत भक्ति रस से परिपूर्ण हो।\n\nइस्कॉन शिरपुर (ISKCON Shirpur) परिवार की ओर से आपको एवं आपके परिवार को जन्मदिन की हार्दिक शुभकामनाएँ एवं आशीर्वाद।\n\nहरे कृष्ण हरे कृष्ण कृष्ण कृष्ण हरे हरे।\nहरे राम हरे राम राम राम हरे हरे॥',
    true, true, 'system', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT DO NOTHING;
