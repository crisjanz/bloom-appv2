import { Routes, Route } from "react-router-dom";
import Home from "../pages/Home.jsx";
import DefaultLayout from "../layouts/DefaultLayout.jsx";
import Checkout from "../pages/Checkout.jsx";
import Filters from "../pages/Filters.jsx";
import CategoryPage from "../pages/CategoryPage.jsx";
import OrderSummary from "../pages/OrderSummary.jsx";
import ProductDetails from "../pages/ProductDetails.jsx";
import ShoppingCart from "../pages/ShoppingCart.jsx";
import Contact from "../pages/Contact.jsx";
import Wishlist from "../pages/Wishlist.jsx";
import Login from "../pages/Login.jsx";
import Profile from "../pages/Profile.jsx";
import Signup from "../pages/Signup.jsx";
import GiftCard from "../pages/GiftCard.jsx";
import GiftCardBalance from "../pages/GiftCardBalance.jsx";
import GiftCardEmailPreview from "../pages/GiftCardEmailPreview.jsx";
import FAQ from "../pages/FAQ.jsx";
import Terms from "../pages/Terms.jsx";


const Root = () => {
  return (
    <>
      <Routes>
        <Route path="/" element={<DefaultLayout />}>
          <Route index element={<Home />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/shop" element={<Filters />} />
          <Route path="/shop/:topSlug" element={<CategoryPage />} />
          <Route path="/shop/:topSlug/:childSlug" element={<CategoryPage />} />

          <Route path="/order-summary" element={<OrderSummary />} />
          <Route path="/product-details" element={<ProductDetails />} />
          <Route path="/shopping-cart" element={<ShoppingCart />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/wishlist" element={<Wishlist />} />
          <Route path="/login" element={<Login />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/gift-cards" element={<GiftCard />} />
          <Route path="/gift-cards/balance" element={<GiftCardBalance />} />
          <Route path="/gift-card-email-preview" element={<GiftCardEmailPreview />} />
          <Route path="/faq" element={<FAQ />} />
          <Route path="/terms" element={<Terms />} />
        </Route>
      </Routes>
    </>
  );
};

export default Root;
