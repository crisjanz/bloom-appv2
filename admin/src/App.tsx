import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import GoogleMapsProvider from "./components/form/GoogleMapsProvider";

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
import TakeOrderPage from "./pages/orders/TakeOrderPage";
import CategoriesPage from "./pages/products/CategoriesPage";
import CustomersPage from "./pages/customers/CustomersPage";
import CustomerFormPage from "./pages/customers/CustomerFormPage";
import ViewProductPage from "./pages/products/ViewProductPage";
import OrdersListPage from "./pages/orders/OrdersListPage"; 
import OrderEditPage from "./pages/orders/OrderEditPage";
import SettingsIndexPage from "./pages/settings";
import BusinessPage from "./pages/settings/business";
import PaymentsPage from "./pages/settings/payments";
import DeliveryPage from "./pages/settings/delivery";
import NotificationsPage from "./pages/settings/notifications";
import OrdersPage from "./pages/settings/orders";
import DiscountsPage from "./pages/settings/discounts";
import POSSettingsPage from "./pages/settings/pos";
import PrintPage from "./pages/settings/print";
import EventsPage from "./pages/settings/events";
import WebsitePage from "./pages/settings/website";
import MiscPage from "./pages/settings/misc";
import POSPage from "./pages/pos/POSPage"; 
import FullscreenPOS from "./pages/pos/FullscreenPOS";
import GiftCardsPage from "./pages/gift-cards/GiftCardsPage";
import CouponsPage from "./pages/coupons/CouponsPage";

export default function App() {
  return (
    <GoogleMapsProvider>
      <Router>
        <ScrollToTop />
        <Routes>
          {/* Public routes */}
          <Route path="/signin" element={<SignIn />} />
          <Route path="/signup" element={<SignUp />} />

          {/* POS route - OUTSIDE AppLayout for fullscreen */}
          <Route path="/pos" element={<POSPage />} />
	  <Route path="/pos/fullscreen" element={<FullscreenPOS />} />

          {/* Main dashboard layout */}
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
            
            {/* Product routes */}
            <Route path="products" element={<ProductsPage />} />
            <Route path="products/new" element={<NewProductPage />} />
            <Route path="products/edit/:id" element={<NewProductPage />} />
            <Route path="products/view/:id" element={<ViewProductPage />} />
            <Route path="products/categories" element={<CategoriesPage />} />
            
            {/* Order routes */}
            <Route path="orders/new" element={<TakeOrderPage />} />
            <Route path="orders" element={<OrdersListPage />} />
            <Route path="orders/:id/edit" element={<OrderEditPage />} /> 
            <Route path="orders/:id" element={<OrderEditPage />} />
            
            {/* Customer routes */}
            <Route path="customers" element={<CustomersPage />} />
            <Route path="customers/new" element={<CustomerFormPage />} />
            <Route path="customers/:id" element={<CustomerFormPage />} />

            {/* Gift Cards route */}
            <Route path="gift-cards" element={<GiftCardsPage />} />

            {/* Coupons route */}
            <Route path="coupons" element={<CouponsPage />} />

            {/* Settings routes */}
            <Route path="settings" element={<SettingsIndexPage />} />
            <Route path="settings/business" element={<BusinessPage />} />
            <Route path="settings/payments" element={<PaymentsPage />} />
            <Route path="settings/delivery" element={<DeliveryPage />} />
            <Route path="settings/notifications" element={<NotificationsPage />} />
            <Route path="settings/orders" element={<OrdersPage />} />
            <Route path="settings/discounts" element={<DiscountsPage />} />
            <Route path="settings/pos" element={<POSSettingsPage />} />
            <Route path="settings/print" element={<PrintPage />} />
            <Route path="settings/events" element={<EventsPage />} />
            <Route path="settings/website" element={<WebsitePage />} />
            <Route path="settings/misc" element={<MiscPage />} />
          </Route>

          {/* Fallback route */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Router>
    </GoogleMapsProvider>
  );
}