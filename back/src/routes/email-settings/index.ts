import { Router } from 'express';
import { z } from 'zod';
import { emailSettingsService } from '../../services/emailSettingsService';
import { emailService } from '../../services/emailService';

const router = Router();

const providerSchema = z.enum(['sendgrid', 'smtp', 'disabled']);

const updateSchema = z.object({
  provider: providerSchema.optional(),
  enabled: z.boolean().optional(),
  apiKey: z.string().nullable().optional(),
  smtpHost: z.string().nullable().optional(),
  smtpPort: z.number().int().min(1).nullable().optional(),
  smtpUser: z.string().nullable().optional(),
  smtpPassword: z.string().nullable().optional(),
  fromEmail: z.string().email().nullable().optional(),
  fromName: z.string().nullable().optional(),
  smsEnabled: z.boolean().optional(),
  twilioAccountSid: z.string().nullable().optional(),
  twilioAuthToken: z.string().nullable().optional(),
  twilioPhoneNumber: z.string().nullable().optional(),
});

const testSchema = z.object({
  email: z.string().email(),
});

router.get('/', async (_req, res) => {
  try {
    const settings = await emailSettingsService.getSettingsForUi();
    res.json(settings);
  } catch (error) {
    console.error('Error fetching email settings:', error);
    res.status(500).json({ error: 'Failed to fetch email settings' });
  }
});

router.put('/', async (req, res) => {
  try {
    const payload = updateSchema.parse(req.body);
    const updated = await emailSettingsService.updateSettings(payload);
    res.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Error updating email settings:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to update email settings' });
  }
});

router.post('/test', async (req, res) => {
  try {
    const payload = testSchema.parse(req.body);
    const success = await emailService.sendTestEmail(payload.email);

    if (!success) {
      return res.status(500).json({ error: 'Failed to send test email' });
    }

    res.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Error sending test email:', error);
    res.status(500).json({ error: 'Failed to send test email' });
  }
});

export default router;
