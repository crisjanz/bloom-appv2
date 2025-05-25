import ProductList from './components/ProductList';

import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import ProductsPage from "./pages/ProductsPage";
import ProductsEditPage from "./pages/ProductsEditPage";
import ProductsNewPage from "./pages/ProductsNewPage";





function App() {
  return (
    <Router>
      <Routes>
      <Route path="/products/new" element={<ProductsNewPage />} />

      <Route path="/products/:id" element={<ProductsEditPage />} />
        <Route path="/products" element={<ProductsPage />} />
        {/* Add other routes here */}
      </Routes>
    </Router>
  );
}

export default App;
