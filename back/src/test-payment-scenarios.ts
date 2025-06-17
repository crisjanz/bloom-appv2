/**
 * Comprehensive test script for PT-XXXX payment transaction system
 * Tests all payment scenarios including split payments and multi-order transactions
 */

import transactionService from './services/transactionService';
import prisma from './lib/prisma';

interface TestScenario {
  name: string;
  description: string;
  data: any;
  expectedResult?: any;
}

const testScenarios: TestScenario[] = [
  {
    name: "Single Order, Cash Payment",
    description: "Simple cash payment for one order",
    data: {
      customerId: "test-customer-1",
      employeeId: "test-employee-1", 
      channel: "POS" as const,
      totalAmount: 75.00,
      taxAmount: 5.00,
      tipAmount: 0,
      notes: "Cash payment test",
      paymentMethods: [
        {
          type: "CASH" as const,
          provider: "INTERNAL" as const,
          amount: 75.00
        }
      ],
      orderIds: ["test-order-1"]
    }
  },
  {
    name: "Single Order, Split Payment (Cash + Card)",
    description: "Split payment: $50 cash + $25 card for one order",
    data: {
      customerId: "test-customer-1",
      employeeId: "test-employee-1",
      channel: "POS" as const,
      totalAmount: 75.00,
      taxAmount: 5.00,
      tipAmount: 0,
      notes: "Split payment test",
      paymentMethods: [
        {
          type: "CASH" as const,
          provider: "INTERNAL" as const,
          amount: 50.00
        },
        {
          type: "CARD" as const,
          provider: "SQUARE" as const,
          amount: 25.00,
          providerTransactionId: "sq_test_12345",
          cardLast4: "4242",
          cardBrand: "visa"
        }
      ],
      orderIds: ["test-order-1"]
    }
  },
  {
    name: "Multiple Orders, Single Payment",
    description: "One card payment covering two orders",
    data: {
      customerId: "test-customer-1",
      employeeId: "test-employee-1",
      channel: "PHONE" as const,
      totalAmount: 150.00,
      taxAmount: 10.00,
      tipAmount: 5.00,
      notes: "Phone order with multiple arrangements",
      paymentMethods: [
        {
          type: "CARD" as const,
          provider: "STRIPE" as const,
          amount: 150.00,
          providerTransactionId: "pi_test_67890",
          cardLast4: "1234",
          cardBrand: "mastercard"
        }
      ],
      orderIds: ["test-order-2", "test-order-3"]
    }
  },
  {
    name: "Multiple Orders, Split Payment",
    description: "Two orders paid with cash, card, and gift card",
    data: {
      customerId: "test-customer-1",
      employeeId: "test-employee-1",
      channel: "POS" as const,
      totalAmount: 200.00,
      taxAmount: 15.00,
      tipAmount: 10.00,
      notes: "Complex multi-order split payment",
      paymentMethods: [
        {
          type: "CASH" as const,
          provider: "INTERNAL" as const,
          amount: 100.00
        },
        {
          type: "CARD" as const,
          provider: "SQUARE" as const,
          amount: 75.00,
          providerTransactionId: "sq_test_99999",
          cardLast4: "5678",
          cardBrand: "amex"
        },
        {
          type: "GIFT_CARD" as const,
          provider: "INTERNAL" as const,
          amount: 25.00,
          giftCardNumber: "GC-TEST-001"
        }
      ],
      orderIds: ["test-order-4", "test-order-5"]
    }
  },
  {
    name: "Gift Card Redemption",
    description: "Single order paid entirely with gift card",
    data: {
      customerId: "test-customer-2",
      employeeId: "test-employee-1",
      channel: "POS" as const,
      totalAmount: 50.00,
      taxAmount: 3.50,
      tipAmount: 0,
      notes: "Gift card redemption test",
      paymentMethods: [
        {
          type: "GIFT_CARD" as const,
          provider: "INTERNAL" as const,
          amount: 50.00,
          giftCardNumber: "GC-TEST-002"
        }
      ],
      orderIds: ["test-order-6"]
    }
  },
  {
    name: "Website Order with Stripe",
    description: "Online order processed through Stripe",
    data: {
      customerId: "test-customer-3",
      channel: "WEBSITE" as const,
      totalAmount: 89.99,
      taxAmount: 6.30,
      tipAmount: 0,
      notes: "Website order test",
      receiptEmail: "customer@example.com",
      paymentMethods: [
        {
          type: "CARD" as const,
          provider: "STRIPE" as const,
          amount: 89.99,
          providerTransactionId: "pi_website_test_001",
          cardLast4: "9999",
          cardBrand: "visa"
        }
      ],
      orderIds: ["test-order-7"]
    }
  }
];

async function setupTestData() {
  console.log("🔧 Setting up test data...");
  
  // Create test customers
  const customers = await Promise.all([
    prisma.customer.upsert({
      where: { id: "test-customer-1" },
      update: {},
      create: {
        id: "test-customer-1",
        firstName: "John",
        lastName: "Doe",
        email: "john.doe@example.com",
        phone: "+1234567890"
      }
    }),
    prisma.customer.upsert({
      where: { id: "test-customer-2" },
      update: {},
      create: {
        id: "test-customer-2",
        firstName: "Jane",
        lastName: "Smith",
        email: "jane.smith@example.com",
        phone: "+1987654321"
      }
    }),
    prisma.customer.upsert({
      where: { id: "test-customer-3" },
      update: {},
      create: {
        id: "test-customer-3",
        firstName: "Bob",
        lastName: "Johnson",
        email: "bob.johnson@example.com",
        phone: "+1122334455"
      }
    })
  ]);

  // Create test employee
  const employee = await prisma.employee.upsert({
    where: { id: "test-employee-1" },
    update: {},
    create: {
      id: "test-employee-1",
      name: "Test Employee",
      email: "employee@bloomflowers.com",
      type: "CASHIER"
    }
  });

  // Create test orders
  const orders = await Promise.all([
    prisma.order.upsert({
      where: { id: "test-order-1" },
      update: {},
      create: {
        id: "test-order-1",
        customerId: "test-customer-1",
        type: "PICKUP",
        paymentAmount: 75.00
      }
    }),
    prisma.order.upsert({
      where: { id: "test-order-2" },
      update: {},
      create: {
        id: "test-order-2",
        customerId: "test-customer-1",
        type: "DELIVERY",
        paymentAmount: 80.00
      }
    }),
    prisma.order.upsert({
      where: { id: "test-order-3" },
      update: {},
      create: {
        id: "test-order-3",
        customerId: "test-customer-1",
        type: "DELIVERY", 
        paymentAmount: 70.00
      }
    }),
    prisma.order.upsert({
      where: { id: "test-order-4" },
      update: {},
      create: {
        id: "test-order-4",
        customerId: "test-customer-1",
        type: "PICKUP",
        paymentAmount: 120.00
      }
    }),
    prisma.order.upsert({
      where: { id: "test-order-5" },
      update: {},
      create: {
        id: "test-order-5",
        customerId: "test-customer-1",
        type: "PICKUP",
        paymentAmount: 80.00
      }
    }),
    prisma.order.upsert({
      where: { id: "test-order-6" },
      update: {},
      create: {
        id: "test-order-6",
        customerId: "test-customer-2",
        type: "PICKUP",
        paymentAmount: 50.00
      }
    }),
    prisma.order.upsert({
      where: { id: "test-order-7" },
      update: {},
      create: {
        id: "test-order-7",
        customerId: "test-customer-3",
        type: "DELIVERY",
        paymentAmount: 89.99
      }
    })
  ]);

  console.log(`✅ Created ${customers.length} customers, 1 employee, ${orders.length} orders`);
}

async function runTestScenario(scenario: TestScenario, index: number): Promise<boolean> {
  console.log(`\n🧪 Test ${index + 1}: ${scenario.name}`);
  console.log(`   ${scenario.description}`);
  
  try {
    const transaction = await transactionService.createTransaction(scenario.data);
    
    console.log(`   ✅ Transaction created: ${transaction.transactionNumber}`);
    console.log(`   💰 Total: $${transaction.totalAmount}`);
    console.log(`   💳 Payment methods: ${transaction.paymentMethods.length}`);
    console.log(`   📦 Orders: ${transaction.orderPayments.length}`);
    
    // Validate transaction structure
    if (!transaction.transactionNumber.startsWith('PT-')) {
      throw new Error('Transaction number should start with PT-');
    }
    
    if (transaction.status !== 'COMPLETED') {
      throw new Error(`Expected status COMPLETED, got ${transaction.status}`);
    }
    
    const paymentTotal = transaction.paymentMethods.reduce((sum, pm) => sum + pm.amount, 0);
    if (Math.abs(paymentTotal - transaction.totalAmount) > 0.01) {
      throw new Error(`Payment methods total (${paymentTotal}) doesn't match transaction total (${transaction.totalAmount})`);
    }
    
    return true;
  } catch (error) {
    console.log(`   ❌ Test failed: ${error}`);
    return false;
  }
}

async function testRefundScenario() {
  console.log('\n💸 Testing refund scenario...');
  
  try {
    // Get the first completed transaction
    const transactions = await prisma.paymentTransaction.findMany({
      where: { status: 'COMPLETED' },
      take: 1
    });
    
    if (transactions.length === 0) {
      console.log('   ⚠️  No completed transactions to refund');
      return;
    }
    
    const transaction = transactions[0];
    const refundAmount = 25.00;
    
    const refund = await transactionService.processRefund(transaction.id, {
      amount: refundAmount,
      reason: "Customer requested refund",
      employeeId: "test-employee-1",
      refundMethods: [
        {
          paymentMethodType: "CASH",
          provider: "INTERNAL",
          amount: refundAmount
        }
      ]
    });
    
    console.log(`   ✅ Refund processed: ${refund.refundNumber}`);
    console.log(`   💰 Refund amount: $${refund.amount}`);
    
  } catch (error) {
    console.log(`   ❌ Refund test failed: ${error}`);
  }
}

async function generateReports() {
  console.log('\n📊 Generating test reports...');
  
  try {
    const today = new Date();
    const summary = await transactionService.getDailyTransactionSummary(today);
    
    console.log(`   📈 Daily Summary for ${today.toDateString()}:`);
    console.log(`   • Total transactions: ${summary.totalTransactions}`);
    console.log(`   • Total amount: $${summary.totalAmount.toFixed(2)}`);
    console.log(`   • Total tax: $${summary.totalTax.toFixed(2)}`);
    console.log(`   • Total tips: $${summary.totalTips.toFixed(2)}`);
    
    console.log('   💳 Payment method breakdown:');
    Object.entries(summary.paymentMethodBreakdown).forEach(([method, data]) => {
      console.log(`     - ${method}: ${data.count} transactions, $${data.amount.toFixed(2)}`);
    });
    
  } catch (error) {
    console.log(`   ❌ Report generation failed: ${error}`);
  }
}

async function runAllTests() {
  console.log('🚀 Starting PT-XXXX Payment Transaction System Tests\n');
  
  try {
    await setupTestData();
    
    let passed = 0;
    let failed = 0;
    
    for (let i = 0; i < testScenarios.length; i++) {
      const success = await runTestScenario(testScenarios[i], i);
      if (success) {
        passed++;
      } else {
        failed++;
      }
    }
    
    await testRefundScenario();
    await generateReports();
    
    console.log('\n📋 Test Summary:');
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📊 Total: ${passed + failed}`);
    
    if (failed === 0) {
      console.log('\n🎉 All tests passed! PT-XXXX system is working correctly.');
    } else {
      console.log('\n⚠️  Some tests failed. Please review the errors above.');
    }
    
  } catch (error) {
    console.error('💥 Test suite failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runAllTests();
}

export { runAllTests, testScenarios };