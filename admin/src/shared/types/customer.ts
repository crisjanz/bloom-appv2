export interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  notes?: string;
  isHouseAccount?: boolean;
  houseAccountTerms?: string;
  houseAccountNotes?: string;
  homeAddress?: Address;
  createdAt?: string;
  updatedAt?: string;
}

export interface Address {
  id: string;
  label?: string; // Custom label like "Home", "Office", "Mom's House"
  firstName: string;
  lastName: string;
  address1: string;
  address2?: string;
  city: string;
  province: string;
  postalCode: string;
  country: string;
  phone?: string;
  company?: string;
  addressType?: string; // RESIDENCE, BUSINESS, etc. - for delivery calculations
  customerId?: string;
  createdAt?: string;
  updatedAt?: string;
}
