import ProductList from './components/ProductList';

import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import ProductsPage from "./pages/ProductsPage";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/products" element={<ProductsPage />} />
        {/* Add other routes here */}
      </Routes>
    </Router>
  );
}

export default App;
