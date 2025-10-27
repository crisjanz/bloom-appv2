import api from './api';

/**
 * Fetch business hours
 */
export async function getBusinessHours() {
  return api.get('/settings/business-hours');
}

/**
 * Fetch holidays
 */
export async function getHolidays() {
  return api.get('/settings/holidays');
}

/**
 * Calculate available delivery dates based on business hours and holidays
 */
export function calculateAvailableDates(businessHours, holidays, daysAhead = 60) {
  const availableDates = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Start from tomorrow (or today if before cutoff time)
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() + 1);

  for (let i = 0; i < daysAhead; i++) {
    const checkDate = new Date(startDate);
    checkDate.setDate(checkDate.getDate() + i);

    const dayOfWeek = checkDate.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const dateString = checkDate.toISOString().split('T')[0];

    // Check if day of week is enabled
    const dayEnabled = isDayEnabled(dayOfWeek, businessHours);
    if (!dayEnabled) continue;

    // Check if it's a holiday
    const isHoliday = holidays.some(holiday => {
      const holidayStart = new Date(holiday.startDate);
      const holidayEnd = new Date(holiday.endDate);
      holidayStart.setHours(0, 0, 0, 0);
      holidayEnd.setHours(0, 0, 0, 0);

      // Check if checkDate falls within holiday range and shop is closed
      return checkDate >= holidayStart && checkDate <= holidayEnd && !holiday.isOpen;
    });

    if (!isHoliday) {
      availableDates.push(dateString);
    }
  }

  return availableDates;
}

/**
 * Check if a specific day of week is enabled
 */
function isDayEnabled(dayOfWeek, businessHours) {
  const dayMap = {
    0: 'sundayEnabled',
    1: 'mondayEnabled',
    2: 'tuesdayEnabled',
    3: 'wednesdayEnabled',
    4: 'thursdayEnabled',
    5: 'fridayEnabled',
    6: 'saturdayEnabled',
  };

  return businessHours[dayMap[dayOfWeek]] === true;
}

/**
 * Format date for display (e.g., "Monday, Jan 15")
 */
export function formatDeliveryDate(dateString) {
  const date = new Date(dateString + 'T12:00:00');
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric'
  });
}
