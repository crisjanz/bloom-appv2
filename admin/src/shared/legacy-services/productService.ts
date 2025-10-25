const PRODUCTS_API_PATH = "/api/products";

async function handleResponse(res: Response, errorMessage: string) {
  if (!res.ok) throw new Error(errorMessage);
  return res.json();
}

export async function getAllProducts() {
  const res = await fetch(PRODUCTS_API_PATH);
  return handleResponse(res, "Failed to fetch products");
}

export async function createProduct(data: { name: string; price: number }) {
  const res = await fetch(PRODUCTS_API_PATH, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  return handleResponse(res, "Failed to create product");
}

export async function getProductById(id: string) {
  const res = await fetch(`${PRODUCTS_API_PATH}/${id}`);
  return handleResponse(res, "Failed to fetch product");
}

export async function updateProduct(id: string, data: any) {
  const res = await fetch(`${PRODUCTS_API_PATH}/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  return handleResponse(res, "Failed to update product");
}
