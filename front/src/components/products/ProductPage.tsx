import { useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';

function ProductPage() {
  const { id: slug } = useParams<{ id: string }>();
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;

    fetch('http://localhost:3000/shop-api', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: `
          query GetProductBySlug($slug: String!) {
            product(slug: $slug) {
              id
              name
              description
              featuredAsset {
                preview
              }
              variants {
                id
                name
                priceWithTax
              }
            }
          }
        `,
        variables: { slug },
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        setProduct(data.data.product);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [slug]);

  if (loading) return <div>Loading...</div>;
  if (!product) return <div>Product not found.</div>;

  return (
    <div className="max-w-4xl mx-auto bg-white p-6 rounded shadow-md">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <img
          src={product.featuredAsset?.preview ?? 'https://via.placeholder.com/600x400?text=No+Image'}
          alt={product.name}
          className="w-full h-auto rounded-lg object-cover"
        />
        <div>
          <h1 className="text-3xl font-bold mb-2">{product.name}</h1>
          <p className="text-gray-600 mb-4">{product.description}</p>
          <h2 className="text-xl font-semibold mb-2">Variants</h2>
          <ul>
            {product.variants.map((variant: any) => (
              <li key={variant.id} className="mb-1">
                {variant.name} – <strong>${(variant.priceWithTax / 100).toFixed(2)}</strong>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

export default ProductPage;
