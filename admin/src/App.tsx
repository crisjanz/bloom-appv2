import ProductList from './components/ProductList';
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import ProductsPage from "./pages/ProductsPage";
import ProductsNewPage from "./pages/ProductsNewPage";
import ProductsEditPage from "./pages/ProductsEditPage";
import AdminSidebar from "./components/AdminSidebar";
import CategoriesPage from './pages/CategoriesPage';
import CustomersPage from './pages/CustomersPage';
import CustomerNewPage from "./pages/CustomerNewPage";
import CustomerEditPage from './pages/CustomerEditPage';

function App() {
  return (
    <Router>
      <div className="flex">
        <AdminSidebar />
        <main className="ml-52 w-full p-6">
          <Routes>
          <Route path="/customers/:id" element={<CustomerEditPage />} />
          <Route path="/customers/new" element={<CustomerNewPage />} />
          <Route path="/customers" element={<CustomersPage />} />
          <Route path="/categories" element={<CategoriesPage />} />
            <Route path="/products" element={<ProductsPage />} />
            <Route path="/products/new" element={<ProductsNewPage />} />
            <Route path="/products/:id" element={<ProductsEditPage />} />
            {/* Categories route to be added next */}
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
