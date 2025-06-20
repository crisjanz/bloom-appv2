import { useState, useEffect } from 'react';

type Customer = {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  notes: string;
};

export const useCustomerSearch = (initialCustomer?: any) => {
  const [customer, setCustomer] = useState<Customer>(() => {
    if (initialCustomer) {
      return {
        firstName: initialCustomer.firstName || "",
        lastName: initialCustomer.lastName || "",
        phone: initialCustomer.phone || "",
        email: initialCustomer.email || "",
        notes: initialCustomer.notes || "",
      };
    }
    return {
      firstName: "",
      lastName: "",
      phone: "",
      email: "",
      notes: "",
    };
  });

  const [customerQuery, setCustomerQuery] = useState("");
  const [customerResults, setCustomerResults] = useState<any[]>([]);
  const [customerId, setCustomerId] = useState<string | null>(initialCustomer?.id || null);
  const [savedRecipients, setSavedRecipients] = useState<any[]>([]);

  // Load recipients when customer is initialized
  useEffect(() => {
    if (initialCustomer?.id) {
      fetch(`/api/customers/${initialCustomer.id}/recipients`)
        .then((res) => res.json())
        .then((data) => setSavedRecipients(data || []))
        .catch((err) => {
          console.error("Failed to load recipients for initial customer:", err);
          setSavedRecipients([]);
        });
    }
  }, [initialCustomer?.id]);

  // Search customers when query changes
  useEffect(() => {
    if (customerQuery.trim() !== "") {
      const timeout = setTimeout(() => {
        fetch(`/api/customers?q=${encodeURIComponent(customerQuery)}`)
          .then((res) => res.json())
          .then((data) => setCustomerResults(data))
          .catch((err) => console.error("Search failed:", err));
      }, 300);

      return () => clearTimeout(timeout);
    } else {
      setCustomerResults([]);
    }
  }, [customerQuery]);

  const clearSavedRecipients = () => setSavedRecipients([]);

  const resetCustomer = () => {
    setCustomer({
      firstName: "",
      lastName: "",
      phone: "",
      email: "",
      notes: "",
    });
    setCustomerQuery("");
    setCustomerResults([]);
    setCustomerId(null);
    setSavedRecipients([]);
  };

  return {
    // Customer state
    customer,
    setCustomer,
    customerId,
    setCustomerId,
    
    // Search state
    customerQuery,
    setCustomerQuery,
    customerResults,
    setCustomerResults,
    
    // Recipients state
    savedRecipients,
    setSavedRecipients,
    clearSavedRecipients,
    
    // Actions
    resetCustomer,
  };
};