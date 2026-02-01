import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import GoogleMapsProvider from "@shared/ui/forms/GoogleMapsProvider";

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
import AppLayout from "@shared/ui/layout/AppLayout";
import { ScrollToTop } from "@shared/ui/common/ScrollToTop";
import ProtectedRoute from "@shared/ui/common/ProtectedRoute";
import { EmployeeType } from "./contexts/AuthContext";
import Home from "./pages/Dashboard/Home";
import ProductsPage from "./pages/products/ProductsPage";
import NewProductPage from "./pages/products/NewProductPage";
import EditProductPage from "./pages/products/EditProductPage";
import TakeOrderPage from "./pages/orders/TakeOrderPage";
import CategoriesPage from "./pages/products/CategoriesPage";
import CustomersPage from "./pages/customers/CustomersPage";
import CustomerFormPage from "./pages/customers/CustomerFormPage";
import DuplicatesPage from "./pages/customers/DuplicatesPage";
import OrdersListPage from "./pages/orders/OrdersListPage";
import OrderEditPage from "./pages/orders/OrderEditPage";
import FulfillmentPage from "./pages/FulfillmentPage";
import SettingsIndexPage from "./pages/settings";
import BusinessPage from "./pages/settings/business";
import PaymentsPage from "./pages/settings/payments";
import DeliverySettingsPage from "./pages/settings/delivery";
import DeliveryManagementPage from "./pages/delivery/DeliveryPage";
import RouteBuilderPage from "./pages/delivery/RouteBuilderPage";
import NotificationsPage from "./pages/settings/notifications";
import OrdersPage from "./pages/settings/orders";
import DiscountsPage from "./pages/settings/discounts";
import POSSettingsPage from "./pages/settings/pos";
import PrintPage from "./pages/settings/print";
import EmailSettingsPage from "./pages/settings/email";
import EventsPage from "./pages/settings/events";
import WebsitePage from "./pages/settings/website";
import MiscPage from "./pages/settings/misc";
import ExternalProvidersPage from "./pages/settings/external-providers";
import POSPage from "./pages/pos/POSPage"; 
import FullscreenPOS from "./pages/pos/FullscreenPOS";
import GiftCardsPage from "./pages/gift-cards/GiftCardsPage";
import UnifiedDiscountsPage from "./pages/discounts/DiscountsPage";
import EventsListPage from "./pages/events/EventsListPage";
import CreateEventPage from "./pages/events/CreateEventPage";
import EventDetailPage from "./pages/events/EventDetailPage";
import EventPaymentsPage from "./pages/events/EventPaymentsPage";
import SalesReportPage from "./pages/reports/SalesReportPage";
import TaxExportPage from "./pages/reports/TaxExportPage";
import TransactionsReportPage from "./pages/reports/TransactionsReportPage";
import WireProductsPage from "./pages/wire-products/WireProductsPage";
import MobileHomePage from "./pages/mobile/MobileHomePage";
import MobileScanPage from "./pages/mobile/MobileScanPage";
import MobileFulfillmentPage from "./pages/mobile/MobileFulfillmentPage";
import MobileDeliveryPage from "./pages/mobile/MobileDeliveryPage";
import MobileRedirect from "./components/MobileRedirect";
import ExternalOrdersPage from "./pages/orders/ExternalOrdersPage";
import DriverRoutePage from "./pages/driver/DriverRoutePage";
import BirthdayGiftsPage from "./pages/marketing/BirthdayGiftsPage";

export default function App() {
  return (
    <AuthProvider>
      <GoogleMapsProvider>
        <Router>
          <ScrollToTop />
          <Routes>
          {/* Public routes */}
          <Route path="/signin" element={<SignIn />} />
          <Route path="/signup" element={<SignUp />} />

          {/* Mobile routes - OUTSIDE AppLayout for mobile-optimized experience */}
          <Route path="/mobile" element={<MobileHomePage />} />
          <Route path="/mobile/scan" element={<MobileScanPage />} />
          <Route path="/mobile/delivery" element={<MobileDeliveryPage />} />
          <Route path="/mobile/fulfillment" element={<MobileFulfillmentPage />} />

          {/* POS route - OUTSIDE AppLayout for fullscreen */}
          <Route path="/pos" element={<POSPage />} />
	  <Route path="/pos/fullscreen" element={<FullscreenPOS />} />

          {/* Fulfillment - OUTSIDE AppLayout for fullscreen iPad view */}
          <Route path="/fulfillment/:id" element={<FulfillmentPage />} />
          <Route path="/driver/route" element={<DriverRoutePage />} />

          {/* Main dashboard layout */}
          <Route path="/" element={<ProtectedRoute requiredRoles={[EmployeeType.ADMIN]}><MobileRedirect><AppLayout /></MobileRedirect></ProtectedRoute>}>
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
            <Route path="products/edit/:id" element={<EditProductPage />} />
            <Route path="products/categories" element={<CategoriesPage />} />
            
            {/* Order routes */}
            <Route path="orders/new" element={<TakeOrderPage />} />
            <Route path="orders" element={<OrdersListPage />} />
            <Route path="orders/:id/edit" element={<OrderEditPage />} />
            <Route path="orders/:id" element={<OrderEditPage />} />

            {/* External Orders route */}
            <Route path="external-orders" element={<ExternalOrdersPage />} />

            {/* Delivery Management route */}
            <Route path="delivery" element={<DeliveryManagementPage />} />
            <Route path="delivery/routes" element={<RouteBuilderPage />} />
            
            {/* Customer routes */}
            <Route path="customers" element={<CustomersPage />} />
            <Route path="customers/duplicates" element={<DuplicatesPage />} />
            <Route path="customers/new" element={<CustomerFormPage />} />
            <Route path="customers/:id" element={<CustomerFormPage />} />

            {/* Gift Cards route */}
            <Route path="gift-cards" element={<GiftCardsPage />} />

            {/* Unified Discounts route */}
            <Route path="discounts" element={<UnifiedDiscountsPage />} />

            {/* Events routes */}
            <Route path="events" element={<EventsListPage />} />
            <Route path="events/new" element={<CreateEventPage />} />
            <Route path="events/:id" element={<EventDetailPage />} />
            <Route path="events/:id/payments" element={<EventPaymentsPage />} />

            {/* Wire Product Library */}
            <Route path="wire-products" element={<WireProductsPage />} />

            {/* Reports */}
            <Route path="reports/sales" element={<SalesReportPage />} />
            <Route path="reports/tax-export" element={<TaxExportPage />} />
            <Route path="reports/transactions" element={<TransactionsReportPage />} />

            {/* Marketing / Campaigns */}
            <Route path="marketing/birthday-gifts" element={<BirthdayGiftsPage />} />

            {/* Settings routes */}
            <Route path="settings" element={<SettingsIndexPage />} />
            <Route path="settings/business" element={<BusinessPage />} />
            <Route path="settings/payments" element={<PaymentsPage />} />
            <Route path="settings/delivery" element={<DeliverySettingsPage />} />
            <Route path="settings/notifications" element={<NotificationsPage />} />
            <Route path="settings/orders" element={<OrdersPage />} />
            <Route path="settings/discounts" element={<DiscountsPage />} />
            <Route path="settings/pos" element={<POSSettingsPage />} />
            <Route path="settings/print" element={<PrintPage />} />
            <Route path="settings/email" element={<EmailSettingsPage />} />
            <Route path="settings/events" element={<EventsPage />} />
            <Route path="settings/website" element={<WebsitePage />} />
            <Route path="settings/misc" element={<MiscPage />} />
            <Route path="settings/external-providers" element={<ExternalProvidersPage />} />
          </Route>

          {/* Fallback route */}
        </Routes>
      </Router>
    </GoogleMapsProvider>
    </AuthProvider>
  );
}
