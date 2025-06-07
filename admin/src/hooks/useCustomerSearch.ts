import { useState, useEffect } from 'react';

type Customer = {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  notes: string;
};

export const useCustomerSearch = () => {
  const [customer, setCustomer] = useState<Customer>({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    notes: "",
  });

  const [customerQuery, setCustomerQuery] = useState("");
  const [customerResults, setCustomerResults] = useState<any[]>([]);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [savedRecipients, setSavedRecipients] = useState<any[]>([]);

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