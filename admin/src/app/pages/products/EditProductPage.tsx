import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import ProductForm from "@app/components/products/ProductForm";
import PageMeta from "@shared/ui/common/PageMeta";
import PageBreadcrumb from "@shared/ui/common/PageBreadCrumb";
import { getProductById } from "@shared/legacy-services/productService";

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
    console.log('🟢 EditProductPage handleSubmit called with data:', data);
    if (!id) return;

    try {
      // Images are already uploaded to Supabase, just send the URLs
      console.log('🟢 Sending PUT request to:', `/api/products/${id}`);
      const response = await fetch(`/api/products/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      console.log('🟢 Response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error ${response.status}`);
      }

      navigate("/products");
    } catch (error) {
      console.error('Error saving product:', error);
      alert(`Failed to save product: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  if (loading) {
    return (
      <div className="bg-whiten dark:bg-boxdark min-h-screen relative">
        <div className="mx-auto max-w-screen-2xl p-4 md:p-6 2xl:p-10">
          <div className="flex items-center justify-center h-64">
            <div className="flex items-center gap-3">
              <svg
                className="animate-spin h-6 w-6 text-[#597485]"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              <span className="text-lg font-medium text-black dark:text-white">Loading product...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="bg-whiten dark:bg-boxdark min-h-screen relative">
        <div className="mx-auto max-w-screen-2xl p-4 md:p-6 2xl:p-10">
          <PageMeta title="Edit Product" />
          <PageBreadcrumb pageName="Edit Product" />
          <div className="text-center mt-10">
            <p className="text-lg text-gray-600 dark:text-gray-400">Product not found.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-whiten dark:bg-boxdark min-h-screen relative">
      <div className="mx-auto max-w-screen-2xl p-4 md:p-6 2xl:p-10">
        <PageMeta title="Edit Product" />
        <PageBreadcrumb pageName="Edit Product" />
        <div className="mt-6">
          <ProductForm initialData={product} onSubmit={handleSubmit} />
        </div>
      </div>
    </div>
  );
};

export default EditProductPage;