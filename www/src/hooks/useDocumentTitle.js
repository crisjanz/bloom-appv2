import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const ROUTE_TITLES = {
  "/": "Home",
  "/shop": "Shop",
  "/shopping-cart": "Shopping Cart",
  "/checkout": "Checkout",
  "/order-summary": "Order Summary",
  "/contact": "Contact",
  "/wishlist": "Wishlist",
  "/login": "Sign In",
  "/signup": "Sign Up",
  "/forgot-password": "Forgot Password",
  "/reset-password": "Reset Password",
  "/profile": "My Account",
  "/gift-cards": "Gift Cards",
  "/gift-cards/balance": "Gift Card Balance",
  "/gift": "Gift Coupon",
  "/subscriptions": "Flower Subscriptions",
  "/my-subscription": "My Subscription",
  "/faq": "FAQ",
  "/terms": "Terms & Conditions",
};

function getTitleFromPath(pathname) {
  if (ROUTE_TITLES[pathname]) return ROUTE_TITLES[pathname];

  const segments = pathname.split("/").filter(Boolean);

  // /shop/:topSlug or /shop/:topSlug/:childSlug
  if (segments[0] === "shop" && segments.length >= 2) {
    const slug = segments[segments.length - 1];
    return slug.charAt(0).toUpperCase() + slug.slice(1).replace(/-/g, " ");
  }

  if (segments[0] === "product-details") return "Product Details";
  if (segments[0] === "birthday-gift") return "Birthday Gift";
  if (segments[0] === "gift-card-email-preview") return "Gift Card Preview";

  return segments
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1).replace(/-/g, " "))
    .join(" - ");
}

export function useDocumentTitle() {
  const { pathname } = useLocation();

  useEffect(() => {
    const title = getTitleFromPath(pathname);
    document.title = `${title} | In Your Vase Flowers`;
  }, [pathname]);
}
