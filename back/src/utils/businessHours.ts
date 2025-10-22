import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Check if current time is within business hours
 * @returns true if within business hours, false otherwise
 */
export async function isWithinBusinessHours(): Promise<boolean> {
  try {
    const settings = await prisma.businessHoursSettings.findFirst();

    if (!settings) {
      console.log('⚠️  No business hours settings found, assuming open');
      return true; // Default to open if no settings
    }

    // Get current time in Vancouver timezone
    const now = new Date();
    const vancouverTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/Vancouver' }));

    const dayOfWeek = vancouverTime.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const currentTime = vancouverTime.toTimeString().substring(0, 5); // "HH:MM"

    // Map day of week to settings
    const daySettings = [
      { enabled: settings.sundayEnabled, open: settings.sundayOpen, close: settings.sundayClose, name: 'Sunday' },
      { enabled: settings.mondayEnabled, open: settings.mondayOpen, close: settings.mondayClose, name: 'Monday' },
      { enabled: settings.tuesdayEnabled, open: settings.tuesdayOpen, close: settings.tuesdayClose, name: 'Tuesday' },
      { enabled: settings.wednesdayEnabled, open: settings.wednesdayOpen, close: settings.wednesdayClose, name: 'Wednesday' },
      { enabled: settings.thursdayEnabled, open: settings.thursdayOpen, close: settings.thursdayClose, name: 'Thursday' },
      { enabled: settings.fridayEnabled, open: settings.fridayOpen, close: settings.fridayClose, name: 'Friday' },
      { enabled: settings.saturdayEnabled, open: settings.saturdayOpen, close: settings.saturdayClose, name: 'Saturday' },
    ];

    const today = daySettings[dayOfWeek];

    // Check if store is enabled for today
    if (!today.enabled) {
      console.log(`🚫 Store closed today (${today.name})`);
      return false;
    }

    // Check if we have open/close times set
    if (!today.open || !today.close) {
      console.log(`⚠️  No hours set for ${today.name}, assuming open`);
      return true;
    }

    // Check if current time is within open hours
    const isOpen = currentTime >= today.open && currentTime <= today.close;

    if (isOpen) {
      console.log(`✅ Within business hours (${today.name} ${today.open}-${today.close}, current: ${currentTime})`);
    } else {
      console.log(`🌙 Outside business hours (${today.name} ${today.open}-${today.close}, current: ${currentTime})`);
    }

    return isOpen;

  } catch (error: any) {
    console.error('Error checking business hours:', error.message);
    return true; // Default to open on error
  }
}

/**
 * Get time until business opens (in minutes)
 * Returns 0 if already open
 */
export async function getMinutesUntilOpen(): Promise<number> {
  try {
    const settings = await prisma.businessHoursSettings.findFirst();
    if (!settings) return 0;

    const now = new Date();
    const vancouverTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/Vancouver' }));
    const dayOfWeek = vancouverTime.getDay();

    const daySettings = [
      { enabled: settings.sundayEnabled, open: settings.sundayOpen },
      { enabled: settings.mondayEnabled, open: settings.mondayOpen },
      { enabled: settings.tuesdayEnabled, open: settings.tuesdayOpen },
      { enabled: settings.wednesdayEnabled, open: settings.wednesdayOpen },
      { enabled: settings.thursdayEnabled, open: settings.thursdayOpen },
      { enabled: settings.fridayEnabled, open: settings.fridayOpen },
      { enabled: settings.saturdayEnabled, open: settings.saturdayOpen },
    ];

    const today = daySettings[dayOfWeek];

    if (!today.enabled || !today.open) {
      // Store closed today, check tomorrow
      return 60; // Check again in 1 hour
    }

    const [openHour, openMinute] = today.open.split(':').map(Number);
    const openTime = new Date(vancouverTime);
    openTime.setHours(openHour, openMinute, 0, 0);

    if (vancouverTime < openTime) {
      // Before opening time today
      const diff = openTime.getTime() - vancouverTime.getTime();
      return Math.floor(diff / 1000 / 60);
    }

    return 0; // Already open or past closing
  } catch (error) {
    return 0;
  }
}
