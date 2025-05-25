import { Link, useLocation } from "react-router-dom";

const links = [
  { path: "/products", label: "Products" },
  { path: "/categories", label: "Categories" },
  // Add more as needed
];

export default function AdminSidebar() {
  const { pathname } = useLocation();

  return (
    <aside className="w-52 h-screen bg-gray-100 border-r p-4 fixed">
      <h2 className="text-lg font-bold mb-6">Admin Panel</h2>
      <nav className="space-y-2">
        {links.map(({ path, label }) => (
          <Link
            key={path}
            to={path}
            className={`block px-3 py-2 rounded ${
              pathname.startsWith(path)
                ? "bg-blue-600 text-white"
                : "text-gray-800 hover:bg-gray-200"
            }`}
          >
            {label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
