const VENDURE_API_URL = 'http://localhost:3000/shop-api';

const query = `
  query GetProducts {
    products {
      items {
        id
        name
        slug
        description
        featuredAsset {
          preview
        }
        variants {
          price
        }
      }
    }
  }
`;

export async function fetchProducts() {
  const res = await fetch(VENDURE_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });

  const json = await res.json();

  return json.data.products.items.map((item: any) => ({
    id: item.id,
    name: item.name,
    slug: item.slug,
    price: (item.variants[0]?.price ?? 0) / 100,
    imageUrl: item.featuredAsset?.preview ?? 'https://via.placeholder.com/400x300?text=No+Image',
  }));
}
