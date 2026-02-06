import api from "./api";

export async function validateCoupon(payload) {
  return api.post("/discounts/validate", payload);
}

export async function autoApplyDiscounts(payload) {
  return api.post("/discounts/auto-apply", payload);
}

export default {
  validateCoupon,
  autoApplyDiscounts,
};
