-- Add anniversary fields to Customer
ALTER TABLE "Customer"
  ADD COLUMN "anniversaryMonth" INTEGER,
  ADD COLUMN "anniversaryDay" INTEGER,
  ADD COLUMN "anniversaryYear" INTEGER,
  ADD COLUMN "anniversaryOptIn" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "anniversaryUpdatedAt" TIMESTAMP(3);

-- Create reminder type enum
CREATE TYPE "ReminderType" AS ENUM ('BIRTHDAY', 'ANNIVERSARY', 'OCCASION');

-- Create customer reminders from checkout "remember this date"
CREATE TABLE "CustomerReminder" (
  "id" TEXT NOT NULL,
  "customerId" TEXT NOT NULL,
  "occasion" TEXT NOT NULL,
  "month" INTEGER NOT NULL,
  "day" INTEGER NOT NULL,
  "recipientName" TEXT,
  "note" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CustomerReminder_pkey" PRIMARY KEY ("id")
);

-- Track sent reminder emails to avoid duplicates
CREATE TABLE "ReminderEmail" (
  "id" TEXT NOT NULL,
  "customerId" TEXT NOT NULL,
  "reminderId" TEXT,
  "type" "ReminderType" NOT NULL,
  "year" INTEGER NOT NULL,
  "daysBefore" INTEGER NOT NULL,
  "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "emailTo" TEXT NOT NULL,
  CONSTRAINT "ReminderEmail_pkey" PRIMARY KEY ("id")
);

-- Singleton reminder settings record for admin
CREATE TABLE "ReminderSettings" (
  "id" TEXT NOT NULL,
  "birthdayEnabled" BOOLEAN NOT NULL DEFAULT false,
  "anniversaryEnabled" BOOLEAN NOT NULL DEFAULT false,
  "occasionEnabled" BOOLEAN NOT NULL DEFAULT false,
  "reminderDaysBefore" JSONB NOT NULL DEFAULT '[7, 1]',
  "birthdaySubject" TEXT NOT NULL DEFAULT 'A Special Day is Coming Up!',
  "birthdayTemplate" TEXT,
  "anniversarySubject" TEXT NOT NULL DEFAULT 'Your Anniversary is Coming Up!',
  "anniversaryTemplate" TEXT,
  "occasionSubject" TEXT NOT NULL DEFAULT 'Don''t Forget - A Special Occasion is Coming!',
  "occasionTemplate" TEXT,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ReminderSettings_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CustomerReminder_customerId_idx" ON "CustomerReminder"("customerId");
CREATE INDEX "CustomerReminder_month_day_idx" ON "CustomerReminder"("month", "day");
CREATE INDEX "ReminderEmail_customerId_idx" ON "ReminderEmail"("customerId");

CREATE UNIQUE INDEX "ReminderEmail_customerId_type_year_daysBefore_reminderId_key"
  ON "ReminderEmail"("customerId", "type", "year", "daysBefore", "reminderId");

ALTER TABLE "CustomerReminder"
  ADD CONSTRAINT "CustomerReminder_customerId_fkey"
  FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ReminderEmail"
  ADD CONSTRAINT "ReminderEmail_customerId_fkey"
  FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ReminderEmail"
  ADD CONSTRAINT "ReminderEmail_reminderId_fkey"
  FOREIGN KEY ("reminderId") REFERENCES "CustomerReminder"("id") ON DELETE SET NULL ON UPDATE CASCADE;
