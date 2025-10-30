import api from "./api";

export async function createDigitalGiftCardPaymentIntent({ amount, purchaser, recipient }) {
  const payload = {
    amount,
    currency: "cad",
    customerEmail: purchaser.email,
    customerName: purchaser.name,
    description: `Bloom Flower Shop digital gift card for ${purchaser.name || "guest"}`,
    metadata: {
      purchaseType: "gift-card",
      giftCardMode: "digital",
      recipientEmail: recipient.email,
      recipientName: recipient.name,
      purchaserEmail: purchaser.email,
      purchaserName: purchaser.name,
    },
  };

  return api.post("/stripe/payment-intent", payload);
}

export async function purchaseDigitalGiftCard({ amount, recipient, purchaser, message }) {
  const payload = {
    purchasedBy: purchaser.name,
    cards: [
      {
        amount,
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
