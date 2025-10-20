/**
 * Seed Canadian (BC) Statutory Holidays for 2025
 *
 * Run with: npx ts-node back/scripts/seed-canadian-holidays-2025.ts
 *
 * All holidays default to closed (isOpen = false).
 * Users can later edit via settings UI to mark open with special hours.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const holidays2025 = [
  {
    name: "New Year's Day",
    startDate: "2025-01-01",
    endDate: "2025-01-01",
    isOpen: false,
    color: "red",
    notes: "Canadian statutory holiday"
  },
  {
    name: "Family Day",
    startDate: "2025-02-17",
    endDate: "2025-02-17",
    isOpen: false,
    color: "red",
    notes: "BC statutory holiday (3rd Monday in February)"
  },
  {
    name: "Good Friday",
    startDate: "2025-04-18",
    endDate: "2025-04-18",
    isOpen: false,
    color: "red",
    notes: "Canadian statutory holiday"
  },
  {
    name: "Easter Monday",
    startDate: "2025-04-21",
    endDate: "2025-04-21",
    isOpen: false,
    color: "red",
    notes: "Optional holiday - mark as open if not observed"
  },
  {
    name: "Victoria Day",
    startDate: "2025-05-19",
    endDate: "2025-05-19",
    isOpen: false,
    color: "red",
    notes: "Canadian statutory holiday (Monday before May 25)"
  },
  {
    name: "Canada Day",
    startDate: "2025-07-01",
    endDate: "2025-07-01",
    isOpen: false,
    color: "red",
    notes: "Canadian statutory holiday"
  },
  {
    name: "BC Day",
    startDate: "2025-08-04",
    endDate: "2025-08-04",
    isOpen: false,
    color: "red",
    notes: "BC statutory holiday (1st Monday in August)"
  },
  {
    name: "Labour Day",
    startDate: "2025-09-01",
    endDate: "2025-09-01",
    isOpen: false,
    color: "red",
    notes: "Canadian statutory holiday (1st Monday in September)"
  },
  {
    name: "Thanksgiving",
    startDate: "2025-10-13",
    endDate: "2025-10-13",
    isOpen: false,
    color: "red",
    notes: "Canadian statutory holiday (2nd Monday in October)"
  },
  {
    name: "Remembrance Day",
    startDate: "2025-11-11",
    endDate: "2025-11-11",
    isOpen: false,
    color: "red",
    notes: "BC statutory holiday"
  },
  {
    name: "Christmas Day",
    startDate: "2025-12-25",
    endDate: "2025-12-25",
    isOpen: false,
    color: "red",
    notes: "Canadian statutory holiday"
  },
  {
    name: "Boxing Day",
    startDate: "2025-12-26",
    endDate: "2025-12-26",
    isOpen: false,
    color: "red",
    notes: "BC statutory holiday"
  }
];

async function seedHolidays() {
  console.log('🎄 Seeding Canadian (BC) holidays for 2025...\n');

  let created = 0;
  let skipped = 0;

  for (const holiday of holidays2025) {
    // Check if holiday already exists
    const existing = await prisma.holiday.findFirst({
      where: {
        name: holiday.name,
        startDate: holiday.startDate
      }
    });

    if (existing) {
      console.log(`⏭️  Skipped: ${holiday.name} (${holiday.startDate}) - already exists`);
      skipped++;
    } else {
      await prisma.holiday.create({
        data: holiday
      });
      console.log(`✅ Created: ${holiday.name} (${holiday.startDate})`);
      created++;
    }
  }

  console.log(`\n📊 Summary:`);
  console.log(`   Created: ${created} holidays`);
  console.log(`   Skipped: ${skipped} holidays (already exist)`);
  console.log(`\n✨ Done! You can now edit holidays via Settings UI or API.`);
  console.log(`   - Mark as open: Set isOpen = true, add openTime/closeTime`);
  console.log(`   - Delete: Remove holidays you don't observe`);
}

seedHolidays()
  .catch((error) => {
    console.error('❌ Error seeding holidays:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
