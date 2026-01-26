const SKU_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

export const generateSkuCode = (): string => {
  let sku = '';
  for (let i = 0; i < 6; i += 1) {
    sku += SKU_CHARS.charAt(Math.floor(Math.random() * SKU_CHARS.length));
  }
  return sku;
};
