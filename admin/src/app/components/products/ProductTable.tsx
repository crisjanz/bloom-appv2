import { FC } from "react";
import { useNavigate } from "react-router-dom";
import Badge from "@shared/ui/components/ui/badge/Badge";
import StandardTable, { ColumnDef } from "@shared/ui/components/ui/table/StandardTable";
import EmptyState from "@shared/ui/components/ui/empty-state/EmptyState";
import { formatCurrency } from "@shared/utils/currency";

// Inline SVG icons
const EyeIcon = ({ className = '' }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const PencilIcon = ({ className = '' }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
  </svg>
);

type Variant = {
  price: number;
};

type Category = {
  name: string;
};

type Product = {
  id: string;
  name: string;
  sku: string;
  category: Category;
  variants: Variant[];
  isActive: boolean;
  images?: string[];
  image?: string;
};

type Props = {
  products: Product[];
};

const ProductTable: FC<Props> = ({ products }) => {
  const navigate = useNavigate();
  const fallbackImage = "https://cdn-icons-png.flaticon.com/512/4139/4139981.png";

  const handleRowClick = (product: Product) => {
    navigate(`/products/view/${product.id}`);
  };

  // Define table columns
  const columns: ColumnDef<Product>[] = [
    {
      key: 'product',
      header: 'Product',
      className: 'w-[300px]',
      render: (product) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 overflow-hidden rounded-md border-0 border-gray-300 dark:border-gray-700 flex-shrink-0">
            <img
              src={product.images?.[0] ?? product.image ?? fallbackImage}
              alt={product.name}
              className="h-full w-full object-cover border-0"
            />
          </div>
          <span className="text-sm font-medium text-gray-800 dark:text-white truncate">
            {product.name}
          </span>
        </div>
      ),
    },
    {
      key: 'sku',
      header: 'SKU',
      className: 'w-[120px]',
      render: (product) => (
        <span className="text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">
          {product.sku || "—"}
        </span>
      ),
    },
    {
      key: 'category',
      header: 'Category',
      className: 'w-[150px]',
      render: (product) => (
        <span className="text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">
          {product.category?.name || "—"}
        </span>
      ),
    },
    {
      key: 'price',
      header: 'Price',
      className: 'w-[100px]',
      render: (product) => (
        <span className="text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">
          {product.variants?.[0]?.price != null
            ? formatCurrency(product.variants[0].price)
            : "N/A"}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      className: 'w-[120px]',
      render: (product) => {
        const isActive = product.isActive;
        const statusColor = isActive ? 'text-green-500' : 'text-gray-500';
        const statusText = isActive ? 'Active' : 'Inactive';
        return (
          <div className="flex items-center gap-2">
            <span className={`text-2xl leading-none ${statusColor}`}>•</span>
            <span className={`text-sm font-medium ${statusColor}`}>{statusText}</span>
          </div>
        );
      },
    },
    {
      key: 'actions',
      header: 'Actions',
      className: 'w-[100px]',
      render: (product) => (
        <div className="flex items-center gap-3">
          <button
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/products/view/${product.id}`);
            }}
            className="text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            title="View product"
          >
            <EyeIcon className="w-5 h-5" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/products/edit/${product.id}`);
            }}
            className="text-gray-400 hover:text-green-600 dark:hover:text-green-400 transition-colors"
            title="Edit product"
          >
            <PencilIcon className="w-5 h-5" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <StandardTable
      columns={columns}
      data={products}
      loading={false}
      emptyState={{
        message: "No products found",
      }}
      onRowClick={handleRowClick}
    />
  );
};

export default ProductTable;
