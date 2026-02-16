import api from "./api";

const dollarsToCents = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.round(parsed * 100);
};

export async function createDigitalGiftCardPaymentIntent({
  amount,
  purchaser,
  recipient,
  bloomCustomerId,
  storeName,
  idempotencyKey,
}) {
  const resolvedStoreName = (storeName || "").trim() || "Flower Shop";
  const payload = {
    amount: dollarsToCents(amount),
    currency: "cad",
    bloomCustomerId,
    customerEmail: purchaser.email,
    customerName: purchaser.name,
    description: `${resolvedStoreName} digital gift card for ${purchaser.name || "guest"}`,
    metadata: {
      purchaseType: "gift-card",
      giftCardMode: "digital",
      recipientEmail: recipient.email,
      recipientName: recipient.name,
      purchaserEmail: purchaser.email,
      purchaserName: purchaser.name,
    },
    idempotencyKey,
  };

  return api.post("/stripe/payment-intent", payload);
}

export async function purchaseDigitalGiftCard({
  amount,
  recipient,
  purchaser,
  message,
  bloomCustomerId,
  paymentIntentId,
}) {
  const payload = {
    purchasedBy: purchaser.name,
    purchaserEmail: purchaser.email,
    bloomCustomerId,
    paymentIntentId,
    cards: [
      {
        amount: dollarsToCents(amount),
        type: "DIGITAL",
        recipientEmail: recipient.email,
        recipientName: recipient.name,
        message: message?.trim() || "",
      },
    ],
  };

  return api.post("/gift-cards/purchase", payload);
}

export default {
  createDigitalGiftCardPaymentIntent,
  purchaseDigitalGiftCard,
};
