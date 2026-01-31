import api from "./api";

export async function getStoreInfo() {
  return api.get("/settings/store-info");
}

export default {
  getStoreInfo,
};
