import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import SignIn from "./pages/AuthPages/SignIn";
import SignUp from "./pages/AuthPages/SignUp";
import NotFound from "./pages/OtherPage/NotFound";
import UserProfiles from "./pages/UserProfiles";
import Videos from "./pages/UiElements/Videos";
import Images from "./pages/UiElements/Images";
import Alerts from "./pages/UiElements/Alerts";
import Badges from "./pages/UiElements/Badges";
import Avatars from "./pages/UiElements/Avatars";
import Buttons from "./pages/UiElements/Buttons";
import LineChart from "./pages/Charts/LineChart";
import BarChart from "./pages/Charts/BarChart";
import Calendar from "./pages/Calendar";
import BasicTables from "./pages/Tables/BasicTables";
import FormElements from "./pages/Forms/FormElements";
import Blank from "./pages/Blank";
import AppLayout from "./layout/AppLayout";
import { ScrollToTop } from "./components/common/ScrollToTop";
import Home from "./pages/Dashboard/Home";
import ProductsPage from "./pages/products/ProductsPage";
import NewProductPage from "./pages/products/NewProductPage";
import EditProductPage from "./pages/products/EditProductPage";
import TakeOrderPage from "./pages/orders/TakeOrderPage"; // adjust path if needed
import ShortcutsPage from "./pages/settings/Shortcuts";
import OrdersSettings from "./pages/settings/OrdersSettings";
import CategoriesPage from "./pages/products/CategoriesPage";
import CustomersPage from "./pages/customers/CustomersPage";
import CustomersNewPage from "./pages/customers/CustomersNewPage";
import CustomersEditPage from "./pages/customers/CustomersEditPage";



export default function App() {
  return (
    <Router>
      <ScrollToTop />
      <Routes>

        {/* Public routes */}
        <Route path="/signin" element={<SignIn />} />
        <Route path="/signup" element={<SignUp />} />

        {/* Dashboard layout */}
        <Route path="/" element={<AppLayout />}>
          <Route index element={<Home />} />
          <Route path="profile" element={<UserProfiles />} />
          <Route path="calendar" element={<Calendar />} />
          <Route path="blank" element={<Blank />} />
          <Route path="form-elements" element={<FormElements />} />
          <Route path="basic-tables" element={<BasicTables />} />
          <Route path="alerts" element={<Alerts />} />
          <Route path="avatars" element={<Avatars />} />
          <Route path="badge" element={<Badges />} />
          <Route path="buttons" element={<Buttons />} />
          <Route path="images" element={<Images />} />
          <Route path="videos" element={<Videos />} />
          <Route path="line-chart" element={<LineChart />} />
          <Route path="bar-chart" element={<BarChart />} />
          <Route path="products" element={<ProductsPage />} />
          <Route path="products/new" element={<NewProductPage />} />
          <Route path="products/edit/:id" element={<EditProductPage />} />
          <Route path="/orders/new" element={<TakeOrderPage />} />
          <Route path="settings/shortcuts" element={<ShortcutsPage />} />
          <Route path="settings/orders" element={<OrdersSettings />} />
          <Route path="products/categories" element={<CategoriesPage />} />
          <Route path="customers" element={<CustomersPage />} />
          <Route path="customers/new" element={<CustomersNewPage />} />
          <Route path="customers/:id" element={<CustomersEditPage />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<NotFound />} />

      </Routes>
    </Router>
  );
}
