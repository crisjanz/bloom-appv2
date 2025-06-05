import { FC } from "react";
import { useNavigate } from "react-router-dom";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../ui/table";
import Badge from "../ui/badge/Badge";

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
  image?: string | null;
};

type Props = {
  products: Product[];
};

const ProductTable: FC<Props> = ({ products }) => {
  const navigate = useNavigate();

  const handleClick = (id: string) => {
    navigate(`/products/edit/${id}`);
  };

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
      <div className="max-w-full overflow-x-auto">
        <Table>
          <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
            <TableRow>
              <TableCell
                isHeader
                className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
              >
                Product
              </TableCell>
              <TableCell
                isHeader
                className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
              >
                SKU
              </TableCell>
              <TableCell
                isHeader
                className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
              >
                Category
              </TableCell>
              <TableCell
                isHeader
                className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
              >
                Price
              </TableCell>
              <TableCell
                isHeader
                className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
              >
                Status
              </TableCell>
            </TableRow>
          </TableHeader>

          <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
            {products.map((product) => (
<TableRow key={product.id} className="transition-colors hover:bg-gray-50 dark:hover:bg-white/[0.05]">
  <TableCell className="px-5 py-4">
    <div
      className="flex items-center gap-3 cursor-pointer"
      onClick={() => handleClick(product.id)}
    >
      <div className="w-10 h-10 overflow-hidden rounded-md border-0 border-gray-300 dark:border-gray-700">
        <img
          src={
            product.image ||
            "https://cdn-icons-png.flaticon.com/512/4139/4139981.png"
          }
          alt={product.name}
          className="h-full w-full object-cover border-0"
        />
      </div>
      <span className="font-medium text-gray-800 dark:text-white">
        {product.name}
      </span>
    </div>
  </TableCell>

  <TableCell className="px-5 py-4">
    <div
      className="text-gray-600 dark:text-gray-300 cursor-pointer"
      onClick={() => handleClick(product.id)}
    >
      {product.sku || "—"}
    </div>
  </TableCell>

  <TableCell className="px-5 py-4">
    <div
      className="text-gray-600 dark:text-gray-300 cursor-pointer"
      onClick={() => handleClick(product.id)}
    >
      {product.category?.name || "—"}
    </div>
  </TableCell>

  <TableCell className="px-5 py-4">
    <div
      className="text-gray-600 dark:text-gray-300 cursor-pointer"
      onClick={() => handleClick(product.id)}
    >
      {product.variants?.[0]?.price != null
        ? `$${product.variants[0].price.toFixed(2)}`
        : "N/A"}
    </div>
  </TableCell>

  <TableCell className="px-5 py-4">
    <div onClick={() => handleClick(product.id)} className="cursor-pointer">
      <Badge size="sm" color={product.isActive ? "success" : "error"}>
        {product.isActive ? "Active" : "Inactive"}
      </Badge>
    </div>
  </TableCell>
</TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default ProductTable;