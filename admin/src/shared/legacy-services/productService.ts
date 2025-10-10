export async function getAllProducts() {
  const res = await fetch("http://cristians-macbook-air.local:4000/api/products");
  if (!res.ok) throw new Error("Failed to fetch products");
  return res.json();
}

export async function createProduct(data: { name: string; price: number }) {
  const res = await fetch("http://cristians-macbook-air.local:4000/api/products", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!res.ok) throw new Error("Failed to create product");
  return res.json();
}
export async function getProductById(id: string) {
  const res = await fetch(`http://cristians-macbook-air.local:4000/api/products/${id}`);
  if (!res.ok) throw new Error("Failed to fetch product");
  return res.json();
}

export async function updateProduct(id: string, data: any) {
  const res = await fetch(`http://cristians-macbook-air.local:4000/api/products/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!res.ok) throw new Error("Failed to update product");
  return res.json();
}