/**
 * Migrate fulfillment photo URLs from communications to order.images
 *
 * Usage:
 *   npx tsx back/src/scripts/migrate-fulfillment-photos.ts [--dry-run] [--clean-notes]
 */

import prisma from '../lib/prisma';

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const cleanNotes = args.includes('--clean-notes');

const extractUrl = (message: string): string | null => {
  const match = message.match(/url:([^|]+)/i);
  if (!match) return null;
  const url = match[1]?.trim();
  return url || null;
};

const extractNote = (message: string): string | null => {
  const match = message.match(/note:(.*)$/i);
  if (!match) return null;
  const note = match[1]?.trim();
  return note || null;
};

async function run() {
  if (dryRun) {
    console.log('🔍 DRY RUN MODE - No changes will be made\n');
  }

  console.log('📦 Loading fulfillment photo communications...');

  const communications = await prisma.orderCommunication.findMany({
    where: {
      message: {
        contains: 'Fulfillment photo'
      }
    },
    select: {
      id: true,
      orderId: true,
      message: true
    }
  });

  console.log(`Found ${communications.length} matching communications.`);

  const orderToUrls = new Map<string, Set<string>>();
  const messageUpdates: Array<{ id: string; message: string }> = [];

  for (const comm of communications) {
    if (typeof comm.message !== 'string') continue;
    const message = comm.message.trim();
    if (!message.toLowerCase().startsWith('fulfillment photo')) continue;

    const url = extractUrl(message);
    if (url) {
      if (!orderToUrls.has(comm.orderId)) {
        orderToUrls.set(comm.orderId, new Set());
      }
      orderToUrls.get(comm.orderId)!.add(url);
    }

    if (cleanNotes) {
      const note = extractNote(message);
      const nextMessage = note
        ? `Fulfillment note: ${note}`
        : 'Fulfillment note: Fulfillment photo saved.';

      if (nextMessage !== message) {
        messageUpdates.push({ id: comm.id, message: nextMessage });
      }
    }
  }

  console.log(`\n📸 Orders with fulfillment photos: ${orderToUrls.size}`);

  let ordersUpdated = 0;
  let imagesAdded = 0;

  for (const [orderId, urlSet] of orderToUrls.entries()) {
    const urls = Array.from(urlSet);
    if (urls.length === 0) continue;

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { images: true }
    });

    if (!order) {
      console.warn(`⚠️  Order not found: ${orderId}`);
      continue;
    }

    const existingImages = Array.isArray(order.images) ? order.images : [];
    const combined = [...existingImages];

    urls.forEach((url) => {
      if (!combined.includes(url)) {
        combined.push(url);
      }
    });

    if (combined.length === existingImages.length) {
      continue;
    }

    if (!dryRun) {
      await prisma.order.update({
        where: { id: orderId },
        data: { images: combined }
      });
    }

    ordersUpdated += 1;
    imagesAdded += combined.length - existingImages.length;
  }

  if (cleanNotes && messageUpdates.length > 0) {
    console.log(`\n📝 Cleaning ${messageUpdates.length} communication messages...`);

    if (!dryRun) {
      for (const update of messageUpdates) {
        await prisma.orderCommunication.update({
          where: { id: update.id },
          data: { message: update.message }
        });
      }
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ Migration Summary');
  console.log('='.repeat(60));
  console.log(`Orders updated: ${ordersUpdated}`);
  console.log(`Images added: ${imagesAdded}`);
  console.log(`Communications cleaned: ${cleanNotes ? messageUpdates.length : 0}`);

  if (dryRun) {
    console.log('\n⚠️  DRY RUN - No database changes were applied.');
  }
}

run()
  .catch((error) => {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
