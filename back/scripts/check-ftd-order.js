"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function checkFtdOrder() {
    console.log('\n=== FTD Settings ===');
    const settings = await prisma.ftdSettings.findFirst();
    console.log('Notification Phone:', settings?.notifyPhoneNumber);
    console.log('Notification Email:', settings?.notifyEmail);
    console.log('Polling Enabled:', settings?.pollingEnabled);
    console.log('\n=== Latest FTD Order ===');
    const latestFtd = await prisma.ftdOrder.findFirst({
        where: { externalId: 'Z5210L-9004' },
        include: {
            linkedOrder: {
                include: {
                    customer: true,
                    deliveryAddress: true,
                    orderItems: true,
                }
            }
        }
    });
    if (!latestFtd) {
        console.log('Order not found!');
        return;
    }
    console.log('\nFTD Order Info:');
    console.log('  ID:', latestFtd.id);
    console.log('  External ID:', latestFtd.externalId);
    console.log('  Status:', latestFtd.status);
    console.log('  Needs Approval:', latestFtd.needsApproval);
    console.log('  Linked Order ID:', latestFtd.linkedOrderId);
    console.log('  Recipient Name:', latestFtd.recipientFirstName, latestFtd.recipientLastName);
    console.log('  Recipient Phone:', latestFtd.recipientPhone);
    console.log('  City:', latestFtd.city);
    console.log('  Address1:', latestFtd.address1);
    console.log('  Province:', latestFtd.province);
    console.log('  Postal Code:', latestFtd.postalCode);
    if (latestFtd.linkedOrder) {
        console.log('\nLinked Bloom Order:');
        console.log('  Order #:', latestFtd.linkedOrder.orderNumber);
        console.log('  Status:', latestFtd.linkedOrder.status);
        console.log('  Customer:', latestFtd.linkedOrder.customer?.firstName, latestFtd.linkedOrder.customer?.lastName);
        console.log('  Delivery Address ID:', latestFtd.linkedOrder.deliveryAddressId);
        if (latestFtd.linkedOrder.deliveryAddress) {
            console.log('  Delivery Address:');
            console.log('    Name:', latestFtd.linkedOrder.deliveryAddress.firstName, latestFtd.linkedOrder.deliveryAddress.lastName);
            console.log('    Address:', latestFtd.linkedOrder.deliveryAddress.address1);
            console.log('    City:', latestFtd.linkedOrder.deliveryAddress.city);
            console.log('    Province:', latestFtd.linkedOrder.deliveryAddress.province);
            console.log('    Postal Code:', latestFtd.linkedOrder.deliveryAddress.postalCode);
            console.log('    Phone:', latestFtd.linkedOrder.deliveryAddress.phone);
        }
        else {
            console.log('  ⚠️  No delivery address found!');
        }
        console.log('  Items:', latestFtd.linkedOrder.orderItems.length);
        latestFtd.linkedOrder.orderItems.forEach((item, i) => {
            console.log(`    ${i + 1}. ${item.customName} x${item.quantity} - $${(item.unitPrice / 100).toFixed(2)}`);
        });
    }
    console.log('\n=== Check Needs Approval Query ===');
    const needsApproval = await prisma.ftdOrder.findMany({
        where: {
            needsApproval: true,
            linkedOrderId: { not: null },
        },
        select: {
            id: true,
            externalId: true,
            needsApproval: true,
            linkedOrderId: true,
        }
    });
    console.log(`Found ${needsApproval.length} orders needing approval:`);
    needsApproval.forEach(o => {
        console.log(`  - ${o.externalId} (needsApproval: ${o.needsApproval}, linkedOrderId: ${o.linkedOrderId})`);
    });
    await prisma.$disconnect();
}
checkFtdOrder().catch(console.error);
