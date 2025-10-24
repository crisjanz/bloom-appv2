import { useNavigate } from 'react-router-dom';
import PageMeta from '@shared/ui/common/PageMeta';
import PageBreadcrumb from '@shared/ui/common/PageBreadCrumb';
import ProductForm from '@app/components/products/ProductForm';

const NewProductPage = () => {
  const navigate = useNavigate();

  const handleSubmit = async (data: any) => {
    console.log('🟢 Creating product with payload:', data);
    const response = await fetch('/api/products', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const message = errorData.error || `HTTP error ${response.status}`;
      throw new Error(message);
    }

    const result = await response.json();
    navigate(`/products/view/${result.id}`);
  };

  return (
    <div className="bg-whiten dark:bg-boxdark min-h-screen relative">
      <div className="mx-auto max-w-screen-2xl p-4 md:p-6 2xl:p-10">
        <PageMeta title="New Product" />
        <PageBreadcrumb pageTitle="New Product" />
        <div className="mt-6">
          <ProductForm onSubmit={handleSubmit} />
        </div>
      </div>
    </div>
  );
};

export default NewProductPage;
