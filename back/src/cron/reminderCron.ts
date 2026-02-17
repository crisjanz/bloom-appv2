import { ReminderType } from '@prisma/client';
import prisma from '../lib/prisma';
import { emailService } from '../services/emailService';
import { buildBirthdayReminderEmail } from '../templates/email/birthday-reminder';
import { buildAnniversaryReminderEmail } from '../templates/email/anniversary-reminder';
import { buildOccasionReminderEmail } from '../templates/email/occasion-reminder';
import {
  getMonthDay,
  getTargetDate,
  normalizeOccasionLabel,
  parseReminderDays,
  getWebsiteBaseUrl,
  getStoreInfo,
  buildUnsubscribeUrl,
} from '../utils/reminderUtils';

const coerceString = (value: unknown) => {
  if (typeof value !== 'string') return '';
  return value.trim();
};

const applyTemplateTokens = (template: string, replacements: Record<string, string | number | null | undefined>) => {
  let output = template;
  for (const [key, value] of Object.entries(replacements)) {
    output = output.replace(new RegExp(`{{\\s*${key}\\s*}}`, 'g'), String(value ?? ''));
  }
  return output;
};

async function recordReminderEmail(
  customerId: string,
  reminderId: string | null,
  type: ReminderType,
  year: number,
  daysBefore: number,
  emailTo: string,
) {
  await prisma.reminderEmail.create({
    data: {
      customerId,
      reminderId,
      type,
      year,
      daysBefore,
      emailTo,
    },
  });
}

async function reminderAlreadySent(
  customerId: string,
  reminderId: string | null,
  type: ReminderType,
  year: number,
  daysBefore: number,
) {
  const existing = await prisma.reminderEmail.findFirst({
    where: {
      customerId,
      reminderId,
      type,
      year,
      daysBefore,
    },
    select: {
      id: true,
    },
  });

  return Boolean(existing);
}

export async function processReminders() {
  const startedAt = Date.now();

  try {
    const settings = await prisma.reminderSettings.findFirst();
    if (!settings) {
      console.log('[reminders] Skipping run: no ReminderSettings configured yet.');
      return;
    }

    if (!settings.birthdayEnabled && !settings.anniversaryEnabled && !settings.occasionEnabled) {
      console.log('[reminders] Skipping run: all reminder toggles are disabled.');
      return;
    }

    const storeInfo = await getStoreInfo();
    const shopUrl = getWebsiteBaseUrl();
    const reminderDaysBefore = parseReminderDays(settings.reminderDaysBefore);

    let sentCount = 0;
    let skippedCount = 0;
    let failedCount = 0;

    for (const daysBefore of reminderDaysBefore) {
      const targetDate = getTargetDate(daysBefore);
      const { month, day } = getMonthDay(targetDate);
      const targetYear = targetDate.getUTCFullYear();

      if (settings.birthdayEnabled) {
        const birthdayCustomers = await prisma.customer.findMany({
          where: {
            birthdayOptIn: true,
            birthdayMonth: month,
            birthdayDay: day,
            email: { not: null },
          },
          select: {
            id: true,
            firstName: true,
            email: true,
          },
        });

        for (const customer of birthdayCustomers) {
          try {
            if (!customer.email) {
              skippedCount += 1;
              continue;
            }

            const alreadySent = await reminderAlreadySent(
              customer.id,
              null,
              ReminderType.BIRTHDAY,
              targetYear,
              daysBefore,
            );

            if (alreadySent) {
              skippedCount += 1;
              continue;
            }

            const unsubscribeUrl = buildUnsubscribeUrl(customer.id, 'birthday');
            const defaultHtml = buildBirthdayReminderEmail({
              firstName: customer.firstName,
              recipientName: customer.firstName,
              daysBefore,
              shopName: storeInfo.storeName,
              shopUrl,
              logoUrl: storeInfo.logoUrl,
              unsubscribeUrl,
              storeAddress: storeInfo.storeAddress,
              storePhone: storeInfo.storePhone,
              storeEmail: storeInfo.storeEmail,
            });

            const html = settings.birthdayTemplate
              ? applyTemplateTokens(settings.birthdayTemplate, {
                  firstName: customer.firstName,
                  daysBefore,
                  shopName: storeInfo.storeName,
                  shopUrl,
                  unsubscribeUrl,
                })
              : defaultHtml;

            const sent = await emailService.sendEmail({
              to: customer.email,
              subject: settings.birthdaySubject,
              html,
            });

            if (!sent) {
              failedCount += 1;
              continue;
            }

            await recordReminderEmail(
              customer.id,
              null,
              ReminderType.BIRTHDAY,
              targetYear,
              daysBefore,
              customer.email,
            );
            sentCount += 1;
          } catch (error) {
            failedCount += 1;
            console.error('[reminders] Birthday reminder failed:', error);
          }
        }
      }

      if (settings.anniversaryEnabled) {
        const anniversaryCustomers = await prisma.customer.findMany({
          where: {
            anniversaryOptIn: true,
            anniversaryMonth: month,
            anniversaryDay: day,
            email: { not: null },
          },
          select: {
            id: true,
            firstName: true,
            email: true,
          },
        });

        for (const customer of anniversaryCustomers) {
          try {
            if (!customer.email) {
              skippedCount += 1;
              continue;
            }

            const alreadySent = await reminderAlreadySent(
              customer.id,
              null,
              ReminderType.ANNIVERSARY,
              targetYear,
              daysBefore,
            );

            if (alreadySent) {
              skippedCount += 1;
              continue;
            }

            const unsubscribeUrl = buildUnsubscribeUrl(customer.id, 'anniversary');
            const defaultHtml = buildAnniversaryReminderEmail({
              firstName: customer.firstName,
              daysBefore,
              shopName: storeInfo.storeName,
              shopUrl,
              logoUrl: storeInfo.logoUrl,
              unsubscribeUrl,
              storeAddress: storeInfo.storeAddress,
              storePhone: storeInfo.storePhone,
              storeEmail: storeInfo.storeEmail,
            });

            const html = settings.anniversaryTemplate
              ? applyTemplateTokens(settings.anniversaryTemplate, {
                  firstName: customer.firstName,
                  daysBefore,
                  shopName: storeInfo.storeName,
                  shopUrl,
                  unsubscribeUrl,
                })
              : defaultHtml;

            const sent = await emailService.sendEmail({
              to: customer.email,
              subject: settings.anniversarySubject,
              html,
            });

            if (!sent) {
              failedCount += 1;
              continue;
            }

            await recordReminderEmail(
              customer.id,
              null,
              ReminderType.ANNIVERSARY,
              targetYear,
              daysBefore,
              customer.email,
            );
            sentCount += 1;
          } catch (error) {
            failedCount += 1;
            console.error('[reminders] Anniversary reminder failed:', error);
          }
        }
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
                email: true,
              },
            },
          },
        });

        for (const reminder of occasionReminders) {
          try {
            const email = coerceString(reminder.customer.email);
            if (!email) {
              skippedCount += 1;
              continue;
            }

            const alreadySent = await reminderAlreadySent(
              reminder.customer.id,
              reminder.id,
              ReminderType.OCCASION,
              targetYear,
              daysBefore,
            );

            if (alreadySent) {
              skippedCount += 1;
              continue;
            }

            const occasionLabel = normalizeOccasionLabel(reminder.occasion);
            const unsubscribeUrl = buildUnsubscribeUrl(reminder.customer.id, 'occasion', reminder.id);
            const defaultHtml = buildOccasionReminderEmail({
              firstName: reminder.customer.firstName,
              occasion: occasionLabel,
              recipientName: reminder.recipientName,
              daysBefore,
              shopName: storeInfo.storeName,
              shopUrl,
              logoUrl: storeInfo.logoUrl,
              unsubscribeUrl,
              storeAddress: storeInfo.storeAddress,
              storePhone: storeInfo.storePhone,
              storeEmail: storeInfo.storeEmail,
            });

            const html = settings.occasionTemplate
              ? applyTemplateTokens(settings.occasionTemplate, {
                  firstName: reminder.customer.firstName,
                  occasion: occasionLabel,
                  recipientName: reminder.recipientName,
                  daysBefore,
                  shopName: storeInfo.storeName,
                  shopUrl,
                  unsubscribeUrl,
                })
              : defaultHtml;

            const sent = await emailService.sendEmail({
              to: email,
              subject: settings.occasionSubject,
              html,
            });

            if (!sent) {
              failedCount += 1;
              continue;
            }

            await recordReminderEmail(
              reminder.customer.id,
              reminder.id,
              ReminderType.OCCASION,
              targetYear,
              daysBefore,
              email,
            );
            sentCount += 1;
          } catch (error) {
            failedCount += 1;
            console.error('[reminders] Occasion reminder failed:', error);
          }
        }
      }
    }

    const elapsed = Date.now() - startedAt;
    console.log(
      `[reminders] Completed run in ${elapsed}ms - sent=${sentCount}, skipped=${skippedCount}, failed=${failedCount}`,
    );
  } catch (error) {
    const elapsed = Date.now() - startedAt;
    console.error(`[reminders] Failed run after ${elapsed}ms:`, error);
  }
}

import cron from 'node-cron';

export function startReminderScheduler() {
  // Daily at 8:00 AM Pacific
  cron.schedule('0 8 * * *', () => {
    processReminders().catch((err) =>
      console.error('[reminders] Unhandled error in scheduled run:', err)
    );
  }, { timezone: 'America/Vancouver' });

  console.log('[reminders] Cron scheduled: daily at 08:00 America/Vancouver');
}
