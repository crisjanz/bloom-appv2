import api from "./api";

export async function validateCoupon(payload) {
  return api.post("/discounts/validate", payload);
}

export default {
  validateCoupon,
};
