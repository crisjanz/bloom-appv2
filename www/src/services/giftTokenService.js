import api from "./api";

export const fetchGift = (token) => api.get(`/gifts/birthday/${token}`);

export const saveGift = (token, payload) =>
  api.post(`/gifts/birthday/${token}/save`, payload);

export default {
  fetchGift,
  saveGift,
};
