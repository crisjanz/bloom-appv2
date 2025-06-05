// ProductTable.tsx
import { FC } from "react";

type Product = {
  id: string;
  name: string;
  status?: string;
  visibility?: string;
  price?: number;
};

type Props = {
  products: Product[];
};

const ProductTable: FC<Props> = ({ products }) => {
  return (
    <div className="max-w-full overflow-x-auto">
      <table className="w-full table-auto text-sm text-left text-body dark:text-white">
        <thead className="bg-gray-2 text-xs font-semibold uppercase text-black dark:bg-meta-4 dark:text-white">
          <tr>
            <th className="px-4 py-3">Name</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Visibility</th>
            <th className="px-4 py-3">Price</th>
            <th className="px-4 py-3">Actions</th>
          </tr>
        </thead>
        <tbody>
          {products.map((product) => (
            <tr
              key={product.id}
              className="border-b border-stroke dark:border-strokedark"
            >
              <td className="px-4 py-3 font-medium text-black dark:text-white">
                {product.name}
              </td>
              <td className="px-4 py-3">{product.status}</td>
              <td className="px-4 py-3">{product.visibility}</td>
              <td className="px-4 py-3">
                {product.price ? `$${product.price.toFixed(2)}` : "N/A"}
              </td>
              <td className="px-4 py-3">
                <a
                  href={`/products/edit/${product.id}`}
                  className="text-brand hover:underline"
                >
                  Edit
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ProductTable;