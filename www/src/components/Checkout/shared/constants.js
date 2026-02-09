import { loadStripe } from "@stripe/stripe-js";

const rawApiUrl = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
const API_BASE = rawApiUrl
  ? (rawApiUrl.endsWith('/api') ? rawApiUrl : `${rawApiUrl}/api`)
  : '/api';

export const stripePromise = fetch(`${API_BASE}/stripe/public-key`)
  .then((res) => (res.ok ? res.json() : null))
  .then((data) => (data?.publicKey ? loadStripe(data.publicKey) : null))
  .catch(() => null);

export const DELIVERY_FEE = 15;
export const TAX_RATE = 0.12;

export const CARD_ELEMENT_OPTIONS = {
  style: {
    base: {
      color: "#111827",
      fontFamily: '"Inter", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      fontSize: "16px",
      "::placeholder": {
        color: "#94a3b8",
      },
    },
    invalid: {
      color: "#dc2626",
    },
  },
};

export const provinceOptions = [
  "BC",
  "AB",
  "SK",
  "MB",
  "ON",
  "QC",
  "NB",
  "NS",
  "PE",
  "NL",
  "YT",
  "NT",
  "NU",
];

export const instructionPresets = [
  "Leave at the door if no answer",
  "Please call on arrival",
  "Gate code 1234",
];

export const initialRecipient = {
  firstName: "",
  lastName: "",
  phone: "",
  email: "",
  address1: "",
  address2: "",
  city: "Vancouver",
  province: "BC",
  postalCode: "",
  cardMessage: "",
  deliveryInstructions: "",
};

export const initialCustomer = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  saveCustomer: true,
  password: "",
};

export const initialPayment = {
  method: "CARD",
  notes: "",
  agreeToTerms: true,
};
