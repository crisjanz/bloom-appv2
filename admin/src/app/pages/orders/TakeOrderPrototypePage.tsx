// TakeOrderPrototypePage.tsx - Prototype for new stepwise order flow
// NO database connections - pure UX demonstration
import { useState } from "react";
import StepperNavigation from "./prototype/StepperNavigation";
import CustomerSection from "./prototype/CustomerSection";
import RecipientSection from "./prototype/RecipientSection";
import DeliverySection from "./prototype/DeliverySection";
import ProductsSection from "./prototype/ProductsSection";
import PaymentSection from "./prototype/PaymentSection";
import CompactOrderSummary from "./prototype/CompactOrderSummary";
import FloatingLabelInput from "./prototype/FloatingLabelInput";

export interface OrderPrototypeState {
  // Customer
  customer: {
    id?: string;
    firstName: string;
    lastName: string;
    phone: string;
    email: string;
  };
  orderType: "PHONE" | "WALKIN" | "WIREIN";
  orderMethod: "DELIVERY" | "PICKUP";

  // Recipient
  recipient: {
    useCustomer: boolean;
    firstName: string;
    lastName: string;
    phone: string;
    company: string;
    address: {
      address1: string;
      address2: string;
      city: string;
      province: string;
      postalCode: string;
    };
    addressLabel: string;
  };

  // Delivery
  delivery: {
    date: string;
    time: string;
    instructions: string;
    cardMessage: string;
    fee: number;
  };

  // Products
  products: Array<{
    id: string;
    description: string;
    category: string;
    price: number;
    qty: number;
    tax: boolean;
  }>;

  // Payment
  payment: {
    subtotal: number;
    deliveryFee: number;
    discount: number;
    couponCode: string;
    gst: number;
    pst: number;
    total: number;
  };
}

const INITIAL_STATE: OrderPrototypeState = {
  customer: {
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
  },
  orderType: "PHONE",
  orderMethod: "DELIVERY",
  recipient: {
    useCustomer: false,
    firstName: "",
    lastName: "",
    phone: "",
    company: "",
    address: {
      address1: "",
      address2: "",
      city: "",
      province: "",
      postalCode: "",
    },
    addressLabel: "",
  },
  delivery: {
    date: "",
    time: "",
    instructions: "",
    cardMessage: "",
    fee: 0,
  },
  products: [],
  payment: {
    subtotal: 0,
    deliveryFee: 0,
    discount: 0,
    couponCode: "",
    gst: 0,
    pst: 0,
    total: 0,
  },
};

const STEPS = [
  { id: 1, name: "Customer & Order Type", key: "customer" },
  { id: 2, name: "Recipient", key: "recipient" },
  { id: 3, name: "Delivery & Message", key: "delivery" },
  { id: 4, name: "Products", key: "products" },
  { id: 5, name: "Review & Payment", key: "payment" },
];

export default function TakeOrderPrototypePage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [orders, setOrders] = useState<OrderPrototypeState[]>([INITIAL_STATE]);
  const [activeOrderIndex, setActiveOrderIndex] = useState(0);

  // Get active order
  const orderState = orders[activeOrderIndex] || INITIAL_STATE;

  const updateOrderState = (section: keyof OrderPrototypeState, data: any) => {
    setOrders((prevOrders) => {
      const updated = [...prevOrders];
      const currentOrder = updated[activeOrderIndex];

      // Handle primitive values (orderType, orderMethod)
      if (section === "orderType" || section === "orderMethod") {
        updated[activeOrderIndex] = {
          ...currentOrder,
          [section]: data,
        };
      }
      // Handle array values (products)
      else if (section === "products") {
        updated[activeOrderIndex] = {
          ...currentOrder,
          products: data,
        };
      }
      // Handle nested object updates (customer, recipient, delivery, payment)
      else {
        updated[activeOrderIndex] = {
          ...currentOrder,
          [section]: { ...currentOrder[section], ...data },
        };
      }

      return updated;
    });
  };

  const handleAddOrder = () => {
    if (orders.length >= 5) {
      alert("Maximum 5 orders allowed");
      return;
    }

    // Create new order with customer info copied from first order
    const newOrder: OrderPrototypeState = {
      ...INITIAL_STATE,
      customer: orders[0].customer, // Copy customer info
      orderType: orders[0].orderType,
      orderMethod: orders[0].orderMethod,
    };

    // Update all state together to ensure proper order
    setOrders((prev) => [...prev, newOrder]);
    setActiveOrderIndex((prev) => prev + 1);

    // Start at recipient step since customer is already filled
    setCurrentStep(2);

    // Mark customer step as complete for new order
    setCompletedSteps(new Set([1]));
  };

  const handleRemoveOrder = (index: number) => {
    if (orders.length <= 1) return;

    const updated = [...orders];
    updated.splice(index, 1);
    setOrders(updated);

    // Adjust active index if needed
    if (activeOrderIndex >= updated.length) {
      setActiveOrderIndex(updated.length - 1);
    } else if (activeOrderIndex > index) {
      setActiveOrderIndex(activeOrderIndex - 1);
    }
  };

  const handleSwitchOrder = (index: number) => {
    setActiveOrderIndex(index);
    // Reset to first incomplete step for this order
    setCurrentStep(1);
  };

  const handleNext = () => {
    // Mark current step as completed
    setCompletedSteps((prev) => new Set(prev).add(currentStep));

    // Skip delivery section if PICKUP
    if (currentStep === 2 && orderState.orderMethod === "PICKUP") {
      setCurrentStep(4); // Skip to products
    } else if (currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    // Skip delivery section if PICKUP
    if (currentStep === 4 && orderState.orderMethod === "PICKUP") {
      setCurrentStep(2); // Go back to recipient
    } else if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleStepClick = (stepId: number) => {
    // Allow jumping to completed steps or next step
    if (completedSteps.has(stepId - 1) || stepId === currentStep) {
      setCurrentStep(stepId);
    }
  };

  const handleEdit = (section: string, orderIndex: number) => {
    const stepMap: Record<string, number> = {
      customer: 1,
      recipient: 2,
      delivery: 3,
      products: 4,
      payment: 5,
    };

    // Switch to the order being edited
    setActiveOrderIndex(orderIndex);
    setCurrentStep(stepMap[section] || 1);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Prototype Banner */}
      <div className="bg-yellow-500 text-black px-4 py-1 text-center text-sm font-semibold">
        🔬 PROTOTYPE MODE - No data saved
      </div>

      {/* Compact Stepper Navigation */}
      <div className="bg-white dark:bg-boxdark border-b border-stroke dark:border-strokedark px-4 py-2">
        <StepperNavigation
          steps={STEPS}
          currentStep={currentStep}
          completedSteps={completedSteps}
          onStepClick={handleStepClick}
          orderMethod={orderState.orderMethod}
        />
      </div>

      {/* Main Content - Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 p-4">
        {/* Left Column - Active Section (2/3 width) */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-boxdark rounded-lg border border-stroke dark:border-strokedark p-4">
            {currentStep === 1 && (
              <CustomerSection
                orderState={orderState}
                updateOrderState={updateOrderState}
                onNext={handleNext}
              />
            )}

            {currentStep === 2 && (
              <RecipientSection
                orderState={orderState}
                updateOrderState={updateOrderState}
                onNext={handleNext}
                onPrevious={handlePrevious}
              />
            )}

            {currentStep === 3 && (
              <DeliverySection
                orderState={orderState}
                updateOrderState={updateOrderState}
                onNext={handleNext}
                onPrevious={handlePrevious}
              />
            )}

            {currentStep === 4 && (
              <ProductsSection
                orderState={orderState}
                updateOrderState={updateOrderState}
                onNext={handleNext}
                onPrevious={handlePrevious}
              />
            )}

            {currentStep === 5 && (
              <PaymentSection
                orderState={orderState}
                updateOrderState={updateOrderState}
                onPrevious={handlePrevious}
              />
            )}
          </div>
        </div>

        {/* Right Column - Sticky Summary (1/3 width) */}
        <div className="lg:col-span-1">
          <CompactOrderSummary
            orders={orders}
            activeOrderIndex={activeOrderIndex}
            onEdit={handleEdit}
            onAddOrder={handleAddOrder}
            onRemoveOrder={handleRemoveOrder}
            onSwitchOrder={handleSwitchOrder}
          />
        </div>
      </div>
    </div>
  );
}
