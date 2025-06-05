import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import ComponentCard from "../../components/common/ComponentCard";

export default function ViewProductPage() {
  const { id } = useParams<{ id: string }>(); // Get product ID from URL
  const navigate = useNavigate();
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const res = await fetch(`/api/products/${id}`);
        if (!res.ok) {
          throw new Error("Failed to fetch product");
        }
        const data = await res.json();
        setProduct(data);
        setLoading(false);
      } catch (err: any) {
        setError(err.message);
        setLoading(false);
      }
    };
    fetchProduct();
  }, [id]);

  if (loading) {
    return (
      <div className="bg-whiten dark:bg-boxdark min-h-screen flex items-center justify-center">
        <p className="text-lg text-black dark:text-white">Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-whiten dark:bg-boxdark min-h-screen flex items-center justify-center">
        <p className="text-lg text-red-500">Error: {error}</p>
      </div>
    );
  }

  return (
    <div className="bg-whiten dark:bg-boxdark min-h-screen">
      <div className="mx-auto max-w-screen-2xl p-4 md:p-6 2xl:p-10">
        <PageMeta title={product.name} />
        <PageBreadcrumb pageTitle={product.name} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
          {/* Main Column */}
          <div className="lg:col-span-2 space-y-6">
            <ComponentCard title="Product Info">
              <div>
                <div className="mb-5.5">
                  <p className="text-sm font-medium text-black dark:text-white">Product Title</p>
                  <p className="text-gray-600 dark:text-gray-300">{product.name}</p>
                </div>
                <div className="mb-5.5">
                  <p className="text-sm font-medium text-black dark:text-white">Product Description</p>
                  <p className="text-gray-600 dark:text-gray-300">{product.description}</p>
                </div>
                <div className="mb-5.5">
                  <p className="text-sm font-medium text-black dark:text-white">Images</p>
                  {product.images && product.images.length > 0 ? (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {product.images.map((image: string, index: number) => (
                        <img
                          key={index}
                          src={image}
                          alt={`Product image ${index + 1}`}
                          className="w-16 h-16 object-cover rounded-md"
                        />
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-600 dark:text-gray-300">No images available</p>
                  )}
                </div>
              </div>
            </ComponentCard>
          </div>

          {/* Sidebar Column */}
          <div className="space-y-6">
            <ComponentCard title="Settings">
              <div className="mb-5.5">
                <p className="text-sm font-medium text-black dark:text-white">Status</p>
                <p className="text-gray-600 dark:text-gray-300">{product.status}</p>
              </div>
              <div className="mb-5.5">
                <p className="text-sm font-medium text-black dark:text-white">Visibility</p>
                <p className="text-gray-600 dark:text-gray-300">{product.visibility}</p>
              </div>
              <div className="mb-5.5">
                <p className="text-sm font-medium text-black dark:text-white">Category ID</p>
                <p className="text-gray-600 dark:text-gray-300">{product.categoryId}</p>
              </div>
              <div className="mb-5.5">
                <p className="text-sm font-medium text-black dark:text-white">Reporting Category ID</p>
                <p className="text-gray-600 dark:text-gray-300">{product.reportingCategoryId}</p>
              </div>
              <div className="mb-5.5">
                <p className="text-sm font-medium text-black dark:text-white">Taxable</p>
                <p className="text-gray-600 dark:text-gray-300">{product.isTaxable ? "Yes" : "No"}</p>
              </div>
              <div className="mb-5.5">
                <p className="text-sm font-medium text-black dark:text-white">Active</p>
                <p className="text-gray-600 dark:text-gray-300">{product.isActive ? "Yes" : "No"}</p>
              </div>
              <div className="mb-5.5">
                <p className="text-sm font-medium text-black dark:text-white">Show on Front Page</p>
                <p className="text-gray-600 dark:text-gray-300">{product.showOnHomepage ? "Yes" : "No"}</p>
              </div>
              <div className="mb-5.5">
                <p className="text-sm font-medium text-black dark:text-white">Slug</p>
                <p className="text-gray-600 dark:text-gray-300">{product.slug}</p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => navigate(`/products/edit/${product.id}`)} // Adjust route as needed
                  className="flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium text-white rounded-lg bg-[#597485] hover:bg-[#4e6575] w-full"
                >
                  Edit Product
                </button>
                <button
                  onClick={() => navigate("/products/new")}
                  className="flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium text-white rounded-lg bg-[#597485] hover:bg-[#4e6575] w-full"
                >
                  Create New Product
                </button>
              </div>
            </ComponentCard>
          </div>
        </div>
      </div>
    </div>
  );
}