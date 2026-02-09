import api from "./api";

const authService = {
  login: (email, password, rememberMe = false) =>
    api.post("/customers/login", { email, password, rememberMe }),

  register: (payload) =>
    api.post("/customers/register", payload),

  logout: () => api.post("/customers/logout"),

  getProfile: () => api.get("/customers/me"),

  updateProfile: (data) => api.put("/customers/me", data),

  changePassword: (currentPassword, newPassword) =>
    api.put("/customers/me/password", { currentPassword, newPassword }),

  getOrders: () => api.get("/customers/me/orders"),
};

export default authService;
