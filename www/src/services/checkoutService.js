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

export default {
  createCustomer,
  createCustomerAddress,
  linkRecipientToCustomer,
  createOrderDraft,
};
