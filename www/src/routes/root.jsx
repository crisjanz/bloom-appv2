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
import FAQ from "../pages/FAQ.jsx";
import Terms from "../pages/Terms.jsx";

// Occasion Pages
import BirthdayFlowers from "../pages/occasions/Birthday.jsx";
import WeddingFlowers from "../pages/occasions/WeddingFlowers.jsx";
import SympathyFlowers from "../pages/occasions/SympathyFlowers.jsx";
import GetWell from "../pages/occasions/GetWell.jsx";
import Congrats from "../pages/occasions/Congrats.jsx";
import Anniversary from "../pages/occasions/Anniversary.jsx";
import ThankYou from "../pages/occasions/ThankYou.jsx";
import Baby from "../pages/occasions/Baby.jsx";
import Gifts from "../pages/occasions/Gifts.jsx";
import HousePlants from "../pages/occasions/HousePlants.jsx";

// Holiday Pages
import Christmas from "../pages/holidays/Christmas.jsx";
import Valentines from "../pages/holidays/Valentines.jsx";
import Easter from "../pages/holidays/Easter.jsx";
import MothersDay from "../pages/holidays/MothersDay.jsx";
import Thanksgiving from "../pages/holidays/Thanksgiving.jsx";

const Root = () => {
  return (
    <>
      <Routes>
        <Route path="/" element={<DefaultLayout />}>
          <Route index element={<Home />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/shop" element={<Filters />} />

          {/* Occasion Pages */}
          <Route path="/occasions/birthday" element={<BirthdayFlowers />} />
          <Route path="/occasions/sympathy" element={<SympathyFlowers />} />
          <Route path="/occasions/getwell" element={<GetWell />} />
          <Route path="/occasions/congrats" element={<Congrats />} />
          <Route path="/occasions/anniversary" element={<Anniversary />} />
          <Route path="/occasions/thankyou" element={<ThankYou />} />
          <Route path="/occasions/baby" element={<Baby />} />
          <Route path="/occasions/gifts" element={<Gifts />} />
          <Route path="/occasions/wedding" element={<WeddingFlowers />} />
          <Route path="/occasions/houseplants" element={<HousePlants />} />

          {/* Holiday Pages */}
          <Route path="/holidays/christmas" element={<Christmas />} />
          <Route path="/holidays/valentines" element={<Valentines />} />
          <Route path="/holidays/easter" element={<Easter />} />
          <Route path="/holidays/mday" element={<MothersDay />} />
          <Route path="/holidays/thanksgiving" element={<Thanksgiving />} />

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
          <Route path="/faq" element={<FAQ />} />
          <Route path="/terms" element={<Terms />} />
        </Route>
      </Routes>
    </>
  );
};

export default Root;
