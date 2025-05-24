export async function fetchProducts() {
    const res = await fetch('http://localhost:4000/api/products'); // your custom backend port
    if (!res.ok) throw new Error('Failed to fetch products');
    return res.json();
  }
  