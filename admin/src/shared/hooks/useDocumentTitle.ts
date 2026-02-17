import { useEffect } from "react";
import { useLocation } from "react-router";

const ROUTE_TITLES: Record<string, string> = {
  "/": "Dashboard",
  "/products": "Products",
  "/products/new": "New Product",
  "/products/categories": "Categories",
  "/inventory": "Inventory",
  "/orders": "Orders",
  "/orders/new": "New Order",
  "/external-orders": "External Orders",
  "/delivery": "Delivery Management",
  "/delivery/routes": "Route Builder",
  "/customers": "Customers",
  "/customers/duplicates": "Duplicate Customers",
  "/customers/new": "New Customer",
  "/gift-cards": "Gift Cards",
  "/discounts": "Discounts",
  "/events": "Events",
  "/events/new": "New Event",
  "/wire-products": "Wire Products",
  "/reports/sales": "Sales Report",
  "/reports/tax-export": "Tax Export",
  "/reports/transactions": "Transactions Report",
  "/house-accounts": "House Accounts",
  "/marketing/birthday-gifts": "Birthday Gifts",
  "/settings": "Settings",
  "/settings/business": "Business Settings",
  "/settings/payments": "Payment Settings",
  "/settings/delivery": "Delivery Settings",
  "/settings/notifications": "Notification Settings",
  "/settings/orders": "Order Settings",
  "/settings/discounts": "Discount Settings",
  "/settings/pos": "POS Settings",
  "/settings/print": "Print Settings",
  "/settings/email": "Email Settings",
  "/settings/events": "Event Settings",
  "/settings/website": "Website Settings",
  "/settings/misc": "Misc Settings",
  "/settings/external-providers": "External Providers",
  "/pos": "Point of Sale",
  "/pos/fullscreen": "Point of Sale",
  "/mobile": "Mobile",
  "/mobile/scan": "Scan",
  "/mobile/inventory": "Inventory",
  "/mobile/delivery": "Deliveries",
  "/mobile/fulfillment": "Fulfillment",
  "/driver/route": "Driver Route",
  "/profile": "Profile",
  "/calendar": "Calendar",
  "/signin": "Sign In",
  "/signup": "Sign Up",
};

function getTitleFromPath(pathname: string): string {
  // Exact match first
  if (ROUTE_TITLES[pathname]) return ROUTE_TITLES[pathname];

  // Try matching dynamic routes
  const segments = pathname.split("/").filter(Boolean);

  if (segments[0] === "orders" && segments.length === 2) return "Order Details";
  if (segments[0] === "orders" && segments[2] === "edit") return "Edit Order";
  if (segments[0] === "products" && segments[1] === "edit") return "Edit Product";
  if (segments[0] === "customers" && segments.length === 2) return "Edit Customer";
  if (segments[0] === "events" && segments.length === 2) return "Event Details";
  if (segments[0] === "events" && segments[2] === "payments") return "Event Payments";
  if (segments[0] === "house-accounts" && segments[2] === "statement") return "Account Statement";
  if (segments[0] === "house-accounts" && segments.length === 2) return "House Account";
  if (segments[0] === "fulfillment") return "Fulfillment";

  // Fallback: capitalize path segments
  return segments
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1).replace(/-/g, " "))
    .join(" - ");
}

export function useDocumentTitle() {
  const { pathname } = useLocation();

  useEffect(() => {
    const title = getTitleFromPath(pathname);
    document.title = `${title} | Bloom POS`;
  }, [pathname]);
}
