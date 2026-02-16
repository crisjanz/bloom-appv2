import api from "./api";

export async function createCustomer(payload) {
  return api.post("/customers", payload);
}

export async function createCustomerAddress(customerId, payload) {
  return api.post(`/customers/${customerId}/addresses`, payload);
}

export async function linkRecipientToCustomer(customerId, recipientCustomerId) {
  return api.post(`/customers/${customerId}/save-recipient`, {
    recipientCustomerId,
  });
}

export async function createOrderDraft(customerId, order) {
  return api.post("/orders/save-draft", {
    customerId,
    orders: [order],
  });
}

export async function createCheckoutPaymentIntent({
  amountInCents,
  customer,
  bloomCustomerId,
  idempotencyKey,
}) {
  const payload = {
    amount: amountInCents,
    currency: "cad",
    bloomCustomerId,
    customerEmail: customer?.email,
    customerPhone: customer?.phone,
    customerName: [customer?.firstName, customer?.lastName].filter(Boolean).join(" ") || customer?.email,
    description: "Web Order - pending",
    metadata: {
      purchaseType: "web-order",
    },
    idempotencyKey,
  };

  return api.post("/stripe/payment-intent", payload);
}

export async function getSavedRecipients(customerId) {
  return api.get(`/customers/${customerId}/recipients`);
}

export default {
  createCustomer,
  createCustomerAddress,
  linkRecipientToCustomer,
  createOrderDraft,
  createCheckoutPaymentIntent,
  getSavedRecipients,
};
