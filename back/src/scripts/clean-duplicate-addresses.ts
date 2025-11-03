/**
 * Script to clean up duplicate addresses for customers
 * Run this to fix addresses that were duplicated during previous merges
 *
 * Usage: npx tsx back/src/scripts/clean-duplicate-addresses.ts [--dry-run]
 */

import prisma from '../lib/prisma';

interface AddressGroup {
  addresses: Array<{
    id: string;
    firstName: string;
    lastName: string;
    phone: string | null;
    company: string | null;
    label: string | null;
    createdAt: Date;
  }>;
  physicalLocation: string;
}

async function cleanDuplicateAddresses(dryRun: boolean = false) {
  console.log('🔍 Scanning for duplicate addresses...\n');

  // Get all customers
  const customers = await prisma.customer.findMany({
    select: { id: true, firstName: true, lastName: true }
  });

  let totalCustomers = 0;
  let totalDuplicatesFound = 0;
  let totalAddressesRemoved = 0;

  for (const customer of customers) {
    const addresses = await prisma.address.findMany({
      where: { customerId: customer.id },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        phone: true,
        company: true,
        label: true,
        address1: true,
        address2: true,
        city: true,
        province: true,
        postalCode: true,
        country: true,
        createdAt: true,
        _count: {
          select: {
            ordersDeliveredHere: true
          }
        }
      },
      orderBy: { createdAt: 'asc' } // Keep oldest address
    });

    if (addresses.length <= 1) continue;

    // Group addresses by physical location
    const locationMap = new Map<string, AddressGroup>();

    for (const addr of addresses) {
      const locationKey = [
        addr.address1.toLowerCase().trim(),
        (addr.address2 || '').toLowerCase().trim(),
        addr.city.toLowerCase().trim(),
        addr.province.toLowerCase().trim(),
        addr.postalCode.toLowerCase().trim(),
        addr.country.toLowerCase().trim()
      ].join('||');

      if (!locationMap.has(locationKey)) {
        locationMap.set(locationKey, {
          addresses: [],
          physicalLocation: `${addr.address1}, ${addr.city}, ${addr.province} ${addr.postalCode}`
        });
      }

      locationMap.get(locationKey)!.addresses.push({
        id: addr.id,
        firstName: addr.firstName,
        lastName: addr.lastName,
        phone: addr.phone,
        company: addr.company,
        label: addr.label,
        createdAt: addr.createdAt
      });
    }

    // Find duplicates
    for (const [_, group] of locationMap) {
      if (group.addresses.length <= 1) continue;

      totalCustomers++;
      totalDuplicatesFound += group.addresses.length - 1;

      console.log(`\n📍 Customer: ${customer.firstName} ${customer.lastName}`);
      console.log(`   Location: ${group.physicalLocation}`);
      console.log(`   Found ${group.addresses.length} duplicate addresses:`);

      // Keep the first (oldest) address
      const [keepAddress, ...removeAddresses] = group.addresses;

      console.log(`   ✅ KEEP: ${keepAddress.firstName} ${keepAddress.lastName} (${keepAddress.label || 'no label'})`);

      // Merge data: update kept address with any missing info from duplicates
      const updateData: any = {};
      for (const dup of removeAddresses) {
        if (!keepAddress.phone && dup.phone) {
          updateData.phone = dup.phone;
        }
        if (!keepAddress.company && dup.company) {
          updateData.company = dup.company;
        }
      }

      if (!dryRun && Object.keys(updateData).length > 0) {
        await prisma.address.update({
          where: { id: keepAddress.id },
          data: updateData
        });
        console.log(`   📝 Updated kept address with missing data`);
      }

      // Remove duplicates
      for (const dup of removeAddresses) {
        console.log(`   ❌ REMOVE: ${dup.firstName} ${dup.lastName} (${dup.label || 'no label'})`);

        if (!dryRun) {
          // Update any orders using this address
          await prisma.order.updateMany({
            where: { deliveryAddressId: dup.id },
            data: { deliveryAddressId: keepAddress.id }
          });

          // Delete duplicate address
          await prisma.address.delete({
            where: { id: dup.id }
          });

          totalAddressesRemoved++;
        }
      }
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 Cleanup Summary:');
  console.log('='.repeat(60));
  console.log(`Customers with duplicates: ${totalCustomers}`);
  console.log(`Total duplicate addresses found: ${totalDuplicatesFound}`);

  if (dryRun) {
    console.log(`\n⚠️  DRY RUN - No changes made`);
    console.log(`Run without --dry-run to actually remove duplicates`);
  } else {
    console.log(`Duplicate addresses removed: ${totalAddressesRemoved}`);
    console.log(`\n✅ Cleanup complete!`);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');

if (dryRun) {
  console.log('🔍 DRY RUN MODE - No changes will be made\n');
}

cleanDuplicateAddresses(dryRun)
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
