import { useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import VariationSelector from '../components/VariationSelector';

const VENDURE_API_URL = 'http://localhost:3000/shop-api';

const query = `
  query GetProduct($id: ID!) {
    product(id: $id) {
      id
      name
      description
      featuredAsset {
        preview
      }
      variants {
        id
        name
        price
        customFields

      }
    }
  }
`;


export default function ProductDetail() {
  const { id } = useParams();
  console.log('🪵 Product ID from URL:', id);
  const [product, setProduct] = useState<any>(null);
  const [selectedVariantId, setSelectedVariantId] = useState('');

  useEffect(() => {
    fetch(VENDURE_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, variables: { id } }),
    })
      .then(res => res.json())
      .then(json => {
        console.log('GraphQL response:', json);
        if (json.errors) {
          console.error('GraphQL error:', json.errors);
        }
        const product = json.data.product;
        setProduct(product);
        console.log('🧪 Variant debug:', product.variants);
        if (product.variants.length > 0) {
          setSelectedVariantId(product.variants[0].id);
        }
      });
      
  }, [id]);

  if (!product) return <p className="p-8 text-gray-500">Loading...</p>;

  const selectedVariant = product.variants.find(v => v.id === selectedVariantId);

  return (
    <div className="max-w-3xl mx-auto p-8 bg-white shadow rounded-xl mt-10">
      <img
        src={product.featuredAsset?.preview}
        alt={product.name}
        className="w-full h-64 object-cover rounded mb-6"
      />
      <h1 className="text-3xl font-bold text-green-700">{product.name}</h1>
      <p className="text-gray-600 mt-2 mb-4">{product.description}</p>

      <VariationSelector
        variants={product.variants}
        selectedVariantId={selectedVariantId}
        onChange={setSelectedVariantId}
      />

      {selectedVariant && (
        <p className="text-lg text-green-800 font-semibold">
          Price: ${(selectedVariant.price / 100).toFixed(2)}
        </p>
      )}
    </div> 
  );
}
