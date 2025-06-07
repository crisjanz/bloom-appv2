export interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  notes?: string;
  homeAddress?: Address;
  createdAt?: string;
  updatedAt?: string;
}

export interface Address {
  id: string;
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
  customerId?: string;
  createdAt?: string;
  updatedAt?: string;
}