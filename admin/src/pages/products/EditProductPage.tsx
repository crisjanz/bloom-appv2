import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import ProductForm from "../../components/products/ProductForm";
import { getProductById, updateProduct } from "../../services/productService";

const EditProductPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    getProductById(id)
      .then(setProduct)
      .catch(() => alert("Failed to load product"))
      .finally(() => setLoading(false));
  }, [id]);

  const handleSubmit = async (data: any) => {
    if (!id) return;
    await updateProduct(id, data);
    navigate("/products");
  };

  if (loading) return <p className="p-6">Loading...</p>;
  if (!product) return <p className="p-6">Product not found.</p>;

  return <ProductForm initialData={product} onSubmit={handleSubmit} />;
};

export default EditProductPage;