import { isWithinBusinessHours, getMinutesUntilOpen } from '../src/utils/businessHours';

async function testBusinessHours() {
  console.log('\n=== Testing Business Hours ===\n');

  const isOpen = await isWithinBusinessHours();
  const minutesUntilOpen = await getMinutesUntilOpen();

  console.log('\n📊 Results:');
  console.log('  Currently open:', isOpen ? 'YES ✅' : 'NO 🚫');

  if (!isOpen && minutesUntilOpen > 0) {
    const hours = Math.floor(minutesUntilOpen / 60);
    const mins = minutesUntilOpen % 60;
    console.log(`  Opens in: ${hours}h ${mins}m`);
  }

  console.log('\n💡 FTD Polling Behavior:');
  if (isOpen) {
    console.log('  ✅ FTD polling will run normally');
  } else {
    console.log('  ⏸️  FTD polling is paused until business hours');
    console.log('  ℹ️  Manual "Update Orders" button still works anytime');
  }

  process.exit(0);
}

testBusinessHours().catch(console.error);
