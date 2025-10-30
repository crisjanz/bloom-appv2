import { Routes, Route } from "react-router-dom";
import Home from "../pages/Home.jsx";
import DefaultLayout from "../layouts/DefaultLayout.jsx";
import Checkout from "../pages/Checkout.jsx";
import Filters from "../pages/Filters.jsx";
import OrderSummary from "../pages/OrderSummary.jsx";
import ProductDetails from "../pages/ProductDetails.jsx";
import ShoppingCart from "../pages/ShoppingCart.jsx";
import Contact from "../pages/Contact.jsx";
import Wishlist from "../pages/Wishlist.jsx";
import Login from "../pages/Login.jsx";
import Profile from "../pages/Profile.jsx";
import Signup from "../pages/Signup.jsx";
import GiftCard from "../pages/GiftCard.jsx";
import GiftCardEmailPreview from "../pages/GiftCardEmailPreview.jsx";

const Root = () => {
  return (
    <>
      <Routes>
        <Route path="/" element={<DefaultLayout />}>
          <Route index element={<Home />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/filters" element={<Filters />} />
          <Route path="/order-summary" element={<OrderSummary />} />
          <Route path="/product-details" element={<ProductDetails />} />
          <Route path="/shopping-cart" element={<ShoppingCart />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/wishlist" element={<Wishlist />} />
          <Route path="/login" element={<Login />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/gift-cards" element={<GiftCard />} />
          <Route path="/gift-card-email-preview" element={<GiftCardEmailPreview />} />
        </Route>
      </Routes>
    </>
  );
};

export default Root;
