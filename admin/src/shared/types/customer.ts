export interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  notes?: string;
  anniversaryMonth?: number | null;
  anniversaryDay?: number | null;
  anniversaryYear?: number | null;
  anniversaryOptIn?: boolean;
  isHouseAccount?: boolean;
  houseAccountTerms?: string;
  houseAccountNotes?: string;
  primaryAddress?: Address;
  createdAt?: string;
  updatedAt?: string;
}

export interface Address {
  id: string;
  attention?: string; // For business deliveries: "Attn: Reception"
  address1: string;
  address2?: string;
  city: string;
  province: string;
  postalCode: string;
  country: string;
  phone?: string;
  company?: string;
  addressType?: string; // String field - UI provides common options (RESIDENCE, BUSINESS, HOSPITAL, FUNERAL_HOME, Custom)
  customerId?: string;
  createdAt?: string;
  updatedAt?: string;
}
