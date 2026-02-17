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

export const STRIPE_APPEARANCE = {
  theme: "stripe",
  variables: {
    colorPrimary: "#3c50e0",
    borderRadius: "8px",
    colorText: "#111827",
    colorDanger: "#dc2626",
  },
};

export const PAYMENT_ELEMENT_OPTIONS = {
  layout: "tabs",
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

export const occasionOptions = [
  { value: "", label: "Select an occasion (optional)" },
  { value: "BIRTHDAY", label: "Birthday" },
  { value: "ANNIVERSARY", label: "Anniversary" },
  { value: "SYMPATHY", label: "Sympathy" },
  { value: "THANK_YOU", label: "Thank You" },
  { value: "LOVE", label: "Love & Romance" },
  { value: "GET_WELL", label: "Get Well" },
  { value: "CONGRATULATIONS", label: "Congratulations" },
  { value: "OTHER", label: "Other" },
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
  occasion: "",
  cardMessage: "",
  deliveryInstructions: "",
  isSurprise: false,
  deliveryDoor: "",
};


export const initialCustomer = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  billingAddress1: "",
  billingAddress2: "",
  billingCity: "Vancouver",
  billingProvince: "BC",
  billingPostalCode: "",
  saveCustomer: false,
  password: "",
};

export const initialPayment = {
  method: "CARD",
  notes: "",
  agreeToTerms: false,
  saveCard: true,
};
