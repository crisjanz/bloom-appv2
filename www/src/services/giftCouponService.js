import api from "./api";

export async function saveGiftCoupon(payload) {
  return api.post("/gifts/coupon/save", payload);
}

export default {
  saveGiftCoupon,
};
