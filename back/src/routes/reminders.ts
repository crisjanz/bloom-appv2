import { Router } from 'express';
import prisma from '../lib/prisma';
import { authenticateCustomer } from '../middleware/customerAuth';
import { emailService } from '../services/emailService';
import { buildBirthdayReminderEmail } from '../templates/email/birthday-reminder';
import { buildAnniversaryReminderEmail } from '../templates/email/anniversary-reminder';
import { buildOccasionReminderEmail } from '../templates/email/occasion-reminder';
import {
  verifyReminderUnsubscribeToken,
} from '../utils/reminderTokens';
import {
  parseReminderDays,
  normalizeOccasionLabel,
  getWebsiteBaseUrl,
  getStoreInfo,
  buildUnsubscribeUrl,
} from '../utils/reminderUtils';

const router = Router();

type ReminderSettingsRecord = {
  id: string;
  birthdayEnabled: boolean;
  anniversaryEnabled: boolean;
  occasionEnabled: boolean;
  reminderDaysBefore: unknown;
  birthdaySubject: string;
  birthdayTemplate: string | null;
  anniversarySubject: string;
  anniversaryTemplate: string | null;
  occasionSubject: string;
  occasionTemplate: string | null;
  updatedAt: Date;
};

const toIsoDate = (date: Date) => date.toISOString().slice(0, 10);

const coerceString = (value: unknown) => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed || null;
};

const normalizeEmail = (value: unknown) => {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().toLowerCase();
  return normalized || null;
};

async function getOrCreateReminderSettings(): Promise<ReminderSettingsRecord> {
  const existing = await prisma.reminderSettings.findFirst();
  if (existing) {
    return existing as ReminderSettingsRecord;
  }

  return prisma.reminderSettings.create({ data: {} }) as unknown as ReminderSettingsRecord;
}

function parseReminderDate(dateInput: unknown): { month: number; day: number } | null {
  if (typeof dateInput !== 'string') return null;
  const parsed = new Date(`${dateInput}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return null;

  return {
    month: parsed.getMonth() + 1,
    day: parsed.getDate(),
  };
}

router.get('/settings', async (_req, res) => {
  try {
    const settings = await getOrCreateReminderSettings();
    const reminderDaysBefore = parseReminderDays(settings.reminderDaysBefore);

    res.json({
      ...settings,
      reminderDaysBefore,
    });
  } catch (error) {
    console.error('Failed to fetch reminder settings:', error);
    res.status(500).json({ error: 'Failed to fetch reminder settings' });
  }
});

router.patch('/settings', async (req, res) => {
  try {
    const existing = await getOrCreateReminderSettings();
    const updateData: Record<string, unknown> = {};

    if (typeof req.body?.birthdayEnabled === 'boolean') {
      updateData.birthdayEnabled = req.body.birthdayEnabled;
    }
    if (typeof req.body?.anniversaryEnabled === 'boolean') {
      updateData.anniversaryEnabled = req.body.anniversaryEnabled;
    }
    if (typeof req.body?.occasionEnabled === 'boolean') {
      updateData.occasionEnabled = req.body.occasionEnabled;
    }

    if (req.body?.reminderDaysBefore !== undefined) {
      updateData.reminderDaysBefore = parseReminderDays(req.body.reminderDaysBefore);
    }

    const birthdaySubject = coerceString(req.body?.birthdaySubject);
    if (birthdaySubject) updateData.birthdaySubject = birthdaySubject;

    const anniversarySubject = coerceString(req.body?.anniversarySubject);
    if (anniversarySubject) updateData.anniversarySubject = anniversarySubject;

    const occasionSubject = coerceString(req.body?.occasionSubject);
    if (occasionSubject) updateData.occasionSubject = occasionSubject;

    if (req.body?.birthdayTemplate !== undefined) {
      updateData.birthdayTemplate = coerceString(req.body.birthdayTemplate);
    }
    if (req.body?.anniversaryTemplate !== undefined) {
      updateData.anniversaryTemplate = coerceString(req.body.anniversaryTemplate);
    }
    if (req.body?.occasionTemplate !== undefined) {
      updateData.occasionTemplate = coerceString(req.body.occasionTemplate);
    }

    const updated = await prisma.reminderSettings.update({
      where: { id: existing.id },
      data: updateData,
    });

    res.json({
      ...updated,
      reminderDaysBefore: parseReminderDays(updated.reminderDaysBefore),
    });
  } catch (error) {
    console.error('Failed to update reminder settings:', error);
    res.status(500).json({ error: 'Failed to update reminder settings' });
  }
});

router.get('/upcoming', async (req, res) => {
  try {
    const windowDays = Math.min(Math.max(Number(req.query.days) || 30, 1), 90);
    const settings = await getOrCreateReminderSettings();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const upcoming: Array<{
      date: string;
      type: 'BIRTHDAY' | 'ANNIVERSARY' | 'OCCASION';
      customerId: string;
      customerName: string;
      email: string;
      recipientName?: string | null;
      occasion?: string;
      daysUntil: number;
    }> = [];

    for (let offset = 0; offset <= windowDays; offset += 1) {
      const target = new Date(today);
      target.setDate(today.getDate() + offset);
      const month = target.getMonth() + 1;
      const day = target.getDate();

      if (settings.birthdayEnabled) {
        const birthdays = await prisma.customer.findMany({
          where: {
            birthdayOptIn: true,
            birthdayMonth: month,
            birthdayDay: day,
            email: { not: null },
          },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
          take: 200,
        });

        birthdays.forEach((customer) => {
          if (!customer.email) return;
          upcoming.push({
            date: toIsoDate(target),
            type: 'BIRTHDAY',
            customerId: customer.id,
            customerName: `${customer.firstName} ${customer.lastName}`.trim(),
            email: customer.email,
            daysUntil: offset,
          });
        });
      }

      if (settings.anniversaryEnabled) {
        const anniversaries = await prisma.customer.findMany({
          where: {
            anniversaryOptIn: true,
            anniversaryMonth: month,
            anniversaryDay: day,
            email: { not: null },
          },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
          take: 200,
        });

        anniversaries.forEach((customer) => {
          if (!customer.email) return;
          upcoming.push({
            date: toIsoDate(target),
            type: 'ANNIVERSARY',
            customerId: customer.id,
            customerName: `${customer.firstName} ${customer.lastName}`.trim(),
            email: customer.email,
            daysUntil: offset,
          });
        });
      }

      if (settings.occasionEnabled) {
        const occasionReminders = await prisma.customerReminder.findMany({
          where: {
            isActive: true,
            month,
            day,
            customer: {
              email: { not: null },
            },
          },
          include: {
            customer: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
          take: 200,
        });

        occasionReminders.forEach((reminder) => {
          if (!reminder.customer.email) return;
          upcoming.push({
            date: toIsoDate(target),
            type: 'OCCASION',
            customerId: reminder.customer.id,
            customerName: `${reminder.customer.firstName} ${reminder.customer.lastName}`.trim(),
            email: reminder.customer.email,
            recipientName: reminder.recipientName,
            occasion: normalizeOccasionLabel(reminder.occasion),
            daysUntil: offset,
          });
        });
      }
    }

    upcoming.sort((a, b) => a.date.localeCompare(b.date));
    res.json({
      days: windowDays,
      count: upcoming.length,
      items: upcoming,
    });
  } catch (error) {
    console.error('Failed to fetch upcoming reminders:', error);
    res.status(500).json({ error: 'Failed to fetch upcoming reminders' });
  }
});

router.get('/history', async (req, res) => {
  try {
    const page = Math.max(Number(req.query.page) || 0, 0);
    const pageSize = Math.min(Math.max(Number(req.query.pageSize) || 25, 1), 100);

    const [total, items] = await Promise.all([
      prisma.reminderEmail.count(),
      prisma.reminderEmail.findMany({
        include: {
          customer: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          reminder: {
            select: {
              occasion: true,
              recipientName: true,
            },
          },
        },
        orderBy: { sentAt: 'desc' },
        skip: page * pageSize,
        take: pageSize,
      }),
    ]);

    res.json({
      items,
      total,
      page,
      pageSize,
    });
  } catch (error) {
    console.error('Failed to fetch reminder history:', error);
    res.status(500).json({ error: 'Failed to fetch reminder history' });
  }
});

router.post('/send-test', async (req, res) => {
  try {
    const email = coerceString(req.body?.email);
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const requestedType = (coerceString(req.body?.type) || 'birthday').toLowerCase();
    const daysBefore = Math.min(Math.max(Number(req.body?.daysBefore) || 7, 0), 365);

    const settings = await getOrCreateReminderSettings();
    const storeInfo = await getStoreInfo();
    const shopUrl = getWebsiteBaseUrl();

    let subject = settings.birthdaySubject;
    let html = buildBirthdayReminderEmail({
      firstName: 'Customer',
      recipientName: 'Alex',
      daysBefore,
      shopName: storeInfo.storeName,
      shopUrl,
      logoUrl: storeInfo.logoUrl,
      unsubscribeUrl: buildUnsubscribeUrl('test-customer', 'birthday'),
      storeAddress: storeInfo.storeAddress,
      storePhone: storeInfo.storePhone,
      storeEmail: storeInfo.storeEmail,
    });

    if (requestedType === 'anniversary') {
      subject = settings.anniversarySubject;
      html = buildAnniversaryReminderEmail({
        firstName: 'Customer',
        daysBefore,
        shopName: storeInfo.storeName,
        shopUrl,
        logoUrl: storeInfo.logoUrl,
        unsubscribeUrl: buildUnsubscribeUrl('test-customer', 'anniversary'),
        storeAddress: storeInfo.storeAddress,
        storePhone: storeInfo.storePhone,
        storeEmail: storeInfo.storeEmail,
      });
    }

    if (requestedType === 'occasion') {
      subject = settings.occasionSubject;
      html = buildOccasionReminderEmail({
        firstName: 'Customer',
        daysBefore,
        occasion: 'Birthday',
        recipientName: 'Alex',
        shopName: storeInfo.storeName,
        shopUrl,
        logoUrl: storeInfo.logoUrl,
        unsubscribeUrl: buildUnsubscribeUrl('test-customer', 'occasion'),
        storeAddress: storeInfo.storeAddress,
        storePhone: storeInfo.storePhone,
        storeEmail: storeInfo.storeEmail,
      });
    }

    const sent = await emailService.sendEmail({
      to: email,
      subject,
      html,
    });

    if (!sent) {
      return res.status(500).json({ error: 'Failed to send test reminder email' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Failed to send test reminder:', error);
    res.status(500).json({ error: 'Failed to send test reminder' });
  }
});

router.post('/checkout', async (req, res) => {
  try {
    const { occasion, deliveryDate, recipientName, note, customerId, customerEmail } = req.body || {};

    const parsedDate = parseReminderDate(deliveryDate);
    if (!parsedDate) {
      return res.status(400).json({ error: 'Valid deliveryDate is required' });
    }

    const normalizedCustomerId = coerceString(customerId);
    const normalizedCustomerEmail = normalizeEmail(customerEmail);
    if (!normalizedCustomerId || !normalizedCustomerEmail) {
      return res.status(400).json({ error: 'customerId and customerEmail are required' });
    }

    const customer = await prisma.customer.findFirst({
      where: {
        id: normalizedCustomerId,
        email: normalizedCustomerEmail,
      },
      select: {
        id: true,
      },
    });

    if (!customer) {
      return res.status(404).json({ error: 'Customer not found for reminder creation' });
    }

    const normalizedOccasion = coerceString(occasion)?.toUpperCase() || 'OTHER';

    const reminder = await prisma.customerReminder.create({
      data: {
        customerId: customer.id,
        occasion: normalizedOccasion,
        month: parsedDate.month,
        day: parsedDate.day,
        recipientName: coerceString(recipientName),
        note: coerceString(note),
        isActive: true,
      },
    });

    res.status(201).json(reminder);
  } catch (error) {
    console.error('Failed to create checkout reminder:', error);
    res.status(500).json({ error: 'Failed to create reminder' });
  }
});

router.post('/', authenticateCustomer, async (req, res) => {
  try {
    const { occasion, deliveryDate, recipientName, note } = req.body || {};

    const parsedDate = parseReminderDate(deliveryDate);
    if (!parsedDate) {
      return res.status(400).json({ error: 'Valid deliveryDate is required' });
    }

    const normalizedOccasion = coerceString(occasion)?.toUpperCase() || 'OTHER';

    const reminder = await prisma.customerReminder.create({
      data: {
        customerId: req.customer!.id,
        occasion: normalizedOccasion,
        month: parsedDate.month,
        day: parsedDate.day,
        recipientName: coerceString(recipientName),
        note: coerceString(note),
        isActive: true,
      },
    });

    res.status(201).json(reminder);
  } catch (error) {
    console.error('Failed to create reminder:', error);
    res.status(500).json({ error: 'Failed to create reminder' });
  }
});

router.get('/mine', authenticateCustomer, async (req, res) => {
  try {
    const reminders = await prisma.customerReminder.findMany({
      where: {
        customerId: req.customer!.id,
        isActive: true,
      },
      orderBy: [
        { month: 'asc' },
        { day: 'asc' },
        { createdAt: 'desc' },
      ],
    });

    res.json(reminders);
  } catch (error) {
    console.error('Failed to fetch customer reminders:', error);
    res.status(500).json({ error: 'Failed to fetch reminders' });
  }
});

router.delete('/:id', authenticateCustomer, async (req, res) => {
  try {
    const deleted = await prisma.customerReminder.deleteMany({
      where: {
        id: req.params.id,
        customerId: req.customer!.id,
      },
    });

    if (!deleted.count) {
      return res.status(404).json({ error: 'Reminder not found' });
    }

    res.status(204).end();
  } catch (error) {
    console.error('Failed to delete reminder:', error);
    res.status(500).json({ error: 'Failed to delete reminder' });
  }
});

router.get('/unsubscribe', async (req, res) => {
  const token = typeof req.query.token === 'string' ? req.query.token : '';

  try {
    if (!token) {
      throw new Error('Missing token');
    }

    const payload = verifyReminderUnsubscribeToken(token);

    if (payload.type === 'birthday') {
      await prisma.customer.update({
        where: { id: payload.customerId },
        data: {
          birthdayOptIn: false,
          birthdayUpdatedAt: new Date(),
        },
      });
    } else if (payload.type === 'anniversary') {
      await prisma.customer.update({
        where: { id: payload.customerId },
        data: {
          anniversaryOptIn: false,
          anniversaryUpdatedAt: new Date(),
        },
      });
    } else if (payload.type === 'occasion') {
      if (payload.reminderId) {
        await prisma.customerReminder.updateMany({
          where: {
            id: payload.reminderId,
            customerId: payload.customerId,
          },
          data: {
            isActive: false,
          },
        });
      } else {
        await prisma.customerReminder.updateMany({
          where: {
            customerId: payload.customerId,
            isActive: true,
          },
          data: {
            isActive: false,
          },
        });
      }
    }

    res
      .status(200)
      .type('html')
      .send(`
        <html>
          <body style="font-family: Arial, sans-serif; padding: 24px; max-width: 560px; margin: 0 auto;">
            <h1 style="margin-bottom: 12px;">You are unsubscribed</h1>
            <p style="line-height: 1.6; color: #4b5563;">
              Your reminder preference has been updated successfully.
            </p>
          </body>
        </html>
      `);
  } catch (error) {
    console.error('Reminder unsubscribe failed:', error);
    res
      .status(400)
      .type('html')
      .send(`
        <html>
          <body style="font-family: Arial, sans-serif; padding: 24px; max-width: 560px; margin: 0 auto;">
            <h1 style="margin-bottom: 12px;">Unsubscribe link is invalid</h1>
            <p style="line-height: 1.6; color: #4b5563;">
              This link is missing or expired. Please contact the shop to update your reminder preferences.
            </p>
          </body>
        </html>
      `);
  }
});

export default router;
