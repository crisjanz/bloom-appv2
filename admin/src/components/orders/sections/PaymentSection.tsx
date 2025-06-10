import React, { useState, useEffect } from 'react';
import PaymentCard from '../PaymentCard';
import PaymentModal from '../PaymentModal';

type Props = {
  customerState: any;
  orderState: any;
  itemTotal: number;
  gst: number;
  pst: number;
  grandTotal: number;
  employee: string;
  orderSource: "phone" | "walkin";
  cleanPhoneNumber: (value: string) => string;
  onOrderComplete: () => void;
  totalDeliveryFee: number; // ✅ Changed from deliveryCharge to totalDeliveryFee
};

const PaymentSection: React.FC<Props> = ({
  customerState,
  orderState,
  itemTotal,
  gst,
  pst,
  grandTotal,
  employee,
  orderSource,
  cleanPhoneNumber,
  onOrderComplete,
  totalDeliveryFee, // ✅ Receive the total
}) => {
  // 🔥 MOVED: All payment state here
  const [couponCode, setCouponCode] = useState("");
  const [discount, setDiscount] = useState(0);
  const [discountType, setDiscountType] = useState<"$" | "%">("$");
  const [subscribe, setSubscribe] = useState(false);
  const [showPaymentPopup, setShowPaymentPopup] = useState(false);
  const [sendEmailReceipt, setSendEmailReceipt] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // ✅ Add useEffect to track delivery fee changes (for debugging if needed)
  useEffect(() => {
    console.log("💳 PaymentSection - totalDeliveryFee changed to:", totalDeliveryFee);
  }, [totalDeliveryFee]);

  // 🔥 MOVED: Payment submission logic here
  const handlePaymentConfirm = async (payments: any[]) => {
    if (!payments.length) {
      setFormError("No payments were entered.");
      return;
    }

    const groupId = crypto.randomUUID();

    try {
      for (const order of orderState.orders) {
        const res = await fetch("/api/orders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            customer: customerState.customer,
            recipient: {
              firstName: order.recipientFirstName,
              lastName: order.recipientLastName,
              company: order.recipientCompany,
              phone: cleanPhoneNumber(order.recipientPhone),
              address: order.recipientAddress,
            },
            orderType: order.orderType,
            deliveryDate: order.deliveryDate,
            deliveryTime: order.deliveryTime,
            deliveryInstructions: order.deliveryInstructions,
            cardMessage: order.cardMessage,
            products: order.customProducts,
            payments,
            paymentMethod: payments.map((p) => p.method).join(" + "),
            status: payments.some((p) =>
              ["Pay in POS", "COD", "House Account", "Wire"].includes(p.method)
            )
              ? "unpaid"
              : "paid",
            groupId,
            employeeId: employee,
            orderSource: orderSource,
            deliveryCharge: order.deliveryFee, // ✅ Use order.deliveryFee from the order state
          }),
        });

        if (!res.ok) {
          console.error("❌ Failed to save order");
          setFormError("Failed to save order. Try again.");
          return;
        }

        // Auto-save recipient
        if (
          order.orderType === "DELIVERY" &&
          customerState.customerId &&
          order.recipientFirstName &&
          order.recipientAddress.address1
        ) {
          try {
            await fetch(`/api/customers/${customerState.customerId}/recipients`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                firstName: order.recipientFirstName,
                lastName: order.recipientLastName,
                phone: cleanPhoneNumber(order.recipientPhone),
                address1: order.recipientAddress.address1,
                address2: order.recipientAddress.address2,
                city: order.recipientAddress.city,
                province: order.recipientAddress.province,
                postalCode: order.recipientAddress.postalCode,
                country: order.recipientAddress.country || "CA",
                company: order.recipientCompany,
              }),
            });
          } catch (error) {
            console.error("Failed to auto-save recipient:", error);
          }
        }
      }

      // Success! Reset everything
      setShowPaymentPopup(false);
      alert("✅ All orders saved successfully.");
      
      // Reset payment state
      setCouponCode("");
      setDiscount(0);
      
      // Call parent reset
      onOrderComplete();
      
    } catch (error) {
      console.error("Error saving orders:", error);
      setFormError("An error occurred while saving orders.");
    }
  };

  return (
    <>
      <PaymentCard
        deliveryCharge={totalDeliveryFee} // ✅ Pass the total as display value
        setDeliveryCharge={() => {}} // ✅ Empty function - no manual editing needed
        couponCode={couponCode}
        setCouponCode={setCouponCode}
        discount={discount}
        setDiscount={setDiscount}
        discountType={discountType}
        setDiscountType={setDiscountType}
        itemTotal={itemTotal}
        gst={gst}
        pst={pst}
        grandTotal={grandTotal}
        subscribe={subscribe}
        setSubscribe={setSubscribe}
        sendEmailReceipt={sendEmailReceipt}
        setSendEmailReceipt={setSendEmailReceipt}
        onTriggerPayment={() => setShowPaymentPopup(true)}
      />

      <PaymentModal
        open={showPaymentPopup}
        onClose={() => setShowPaymentPopup(false)}
        total={grandTotal}
        employee={employee}
        setFormError={setFormError}
        onConfirm={handlePaymentConfirm}
      />
    </>
  );
};

export default PaymentSection;