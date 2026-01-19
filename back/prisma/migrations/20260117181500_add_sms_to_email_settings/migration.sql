-- Add SMS/Twilio fields to email_settings
ALTER TABLE "email_settings" ADD COLUMN IF NOT EXISTS "smsEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "email_settings" ADD COLUMN IF NOT EXISTS "twilioAccountSid" TEXT;
ALTER TABLE "email_settings" ADD COLUMN IF NOT EXISTS "twilioAuthToken" TEXT;
ALTER TABLE "email_settings" ADD COLUMN IF NOT EXISTS "twilioPhoneNumber" TEXT;
