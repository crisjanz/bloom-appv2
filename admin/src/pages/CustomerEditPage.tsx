import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

type Customer = {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  notes?: string;
  homeAddress?: Address;
};

  

type Address = {
    id: string;
    firstName: string;
    lastName: string;
    address1: string;
    address2?: string;
    city: string;
    province: string;
    postalCode: string;
    phone?: string;
  };
  

export default function CustomerEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [newAddress, setNewAddress] = useState<Address>({
    id: "",
    firstName: "",
    lastName: "",
    address1: "",
    address2: "",
    city: "",
    province: "",
    postalCode: "",
    phone: "",
  });

  useEffect(() => {
    fetch(`/api/customers/${id}`)
      .then((res) => res.json())
      .then((data) => {
        setCustomer(data);
        setAddresses(data.addresses || []);
      })
      .catch(() => setError("Failed to load customer"))
      .finally(() => setLoading(false));
  }, [id]);

  const handleChange = (field: keyof Customer, value: string) => {
    if (!customer) return;
    setCustomer({ ...customer, [field]: value });
  };

  const handleSaveCustomer = async () => {
    const res = await fetch(`/api/customers/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...customer,
        homeAddress: {
          ...customer?.homeAddress,
        },
      }),
    });
  
    if (!res.ok) setError("Failed to save customer");
  };
  

  const handleAddAddress = async () => {
    if (!customer) return;
    const res = await fetch(`/api/customers/${id}/addresses`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newAddress),
    });

    if (res.ok) {
      const added = await res.json();
      setAddresses((prev) => [...prev, added]);
      setNewAddress({
        id: "",
        firstName: "",
        lastName: "",
        address1: "",
        address2: "",
        city: "",
        province: "",
        postalCode: "",
        phone: "",
      });
    } else {
      alert("Failed to add address");
    }
  };

  const handleDeleteAddress = async (addrId: string) => {
    const res = await fetch(`/api/addresses/${addrId}`, {
      method: "DELETE",
    });

    if (res.ok) {
      setAddresses((prev) => prev.filter((a) => a.id !== addrId));
    } else {
      alert("Failed to delete address");
    }
  };

  if (loading) return <div className="p-6">Loading...</div>;
  if (!customer) return <div className="p-6 text-red-600">{error || "Customer not found"}</div>;

  return (
    <div className="p-6 max-w-3xl space-y-6">
      <div>
        <h1 className="text-xl font-bold mb-4">Edit Customer</h1>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
  <div>
    <label className="block mb-2">First Name</label>
    <input
      className="w-full p-2 border"
      value={customer.firstName || ""}
      onChange={(e) => handleChange("firstName", e.target.value)}
    />
  </div>
  <div>
    <label className="block mb-2">Last Name</label>
    <input
      className="w-full p-2 border"
      value={customer.lastName || ""}
      onChange={(e) => handleChange("lastName", e.target.value)}
    />
  </div>
</div>


        <label className="block mb-2">Email</label>
        <input
          className="w-full mb-4 p-2 border"
          value={customer.email || ""}
          onChange={(e) => handleChange("email", e.target.value)}
        />

        <label className="block mb-2">Phone</label>
        <input
          className="w-full mb-4 p-2 border"
          value={customer.phone || ""}
          onChange={(e) => handleChange("phone", e.target.value)}
        />

        <label className="block mb-2">Notes</label>
        <textarea
          className="w-full mb-4 p-2 border"
          value={customer.notes || ""}
          onChange={(e) => handleChange("notes", e.target.value)}
        />
<h2 className="text-lg font-bold mt-8 mb-2">Home Address</h2>

<div className="grid grid-cols-2 gap-2 mb-6">
  <input
    placeholder="Address Line 1"
    className="border p-2"
    value={customer.homeAddress?.address1 || ""}
    onChange={(e) =>
      setCustomer({
        ...customer,
        homeAddress: {
          ...customer.homeAddress,
          address1: e.target.value,
        },
      })
    }
  />
  <input
    placeholder="Address Line 2"
    className="border p-2"
    value={customer.homeAddress?.address2 || ""}
    onChange={(e) =>
      setCustomer({
        ...customer,
        homeAddress: {
          ...customer.homeAddress,
          address2: e.target.value,
        },
      })
    }
  />
  <input
    placeholder="City"
    className="border p-2"
    value={customer.homeAddress?.city || ""}
    onChange={(e) =>
      setCustomer({
        ...customer,
        homeAddress: {
          ...customer.homeAddress,
          city: e.target.value,
        },
      })
    }
  />
  <input
    placeholder="Province"
    className="border p-2"
    value={customer.homeAddress?.province || ""}
    onChange={(e) =>
      setCustomer({
        ...customer,
        homeAddress: {
          ...customer.homeAddress,
          province: e.target.value,
        },
      })
    }
  />
  <input
    placeholder="Postal Code"
    className="border p-2"
    value={customer.homeAddress?.postalCode || ""}
    onChange={(e) =>
      setCustomer({
        ...customer,
        homeAddress: {
          ...customer.homeAddress,
          postalCode: e.target.value,
        },
      })
    }
  />
  <input
    placeholder="Phone"
    className="border p-2"
    value={customer.homeAddress?.phone || ""}
    onChange={(e) =>
      setCustomer({
        ...customer,
        homeAddress: {
          ...customer.homeAddress,
          phone: e.target.value,
        },
      })
    }
  />
</div>

        <button
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
          onClick={handleSaveCustomer}
        >
          Save Customer
        </button>
      </div>

      <div>
        <h2 className="text-lg font-bold mb-2">Addresses</h2>

        <div className="grid grid-cols-2 gap-2 mb-4">
        <input
  placeholder="First Name"
  className="border p-2"
  value={newAddress.firstName}
  onChange={(e) => setNewAddress({ ...newAddress, firstName: e.target.value })}
/>
<input
  placeholder="Last Name"
  className="border p-2"
  value={newAddress.lastName}
  onChange={(e) => setNewAddress({ ...newAddress, lastName: e.target.value })}
/>

          <input
            placeholder="Address Line 1"
            className="border p-2"
            value={newAddress.address1}
            onChange={(e) => setNewAddress({ ...newAddress, address1: e.target.value })}
          />
          <input
            placeholder="Address Line 2"
            className="border p-2"
            value={newAddress.address2}
            onChange={(e) => setNewAddress({ ...newAddress, address2: e.target.value })}
          />
          <input
            placeholder="City"
            className="border p-2"
            value={newAddress.city}
            onChange={(e) => setNewAddress({ ...newAddress, city: e.target.value })}
          />
          <input
            placeholder="Province"
            className="border p-2"
            value={newAddress.province}
            onChange={(e) => setNewAddress({ ...newAddress, province: e.target.value })}
          />
          <input
            placeholder="Postal Code"
            className="border p-2"
            value={newAddress.postalCode}
            onChange={(e) => setNewAddress({ ...newAddress, postalCode: e.target.value })}
          />
          <input
            placeholder="Phone"
            className="border p-2"
            value={newAddress.phone}
            onChange={(e) => setNewAddress({ ...newAddress, phone: e.target.value })}
          />
        </div>

        <button
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 mb-6"
          onClick={handleAddAddress}
        >
          + Add Address
        </button>

        {addresses.length > 0 ? (
          <ul className="space-y-2">
            {addresses.map((addr) => (
              <li key={addr.id} className="border p-3 rounded flex justify-between items-center">
                <div>
                <div className="font-medium">{addr.firstName} {addr.lastName}</div>

                  <div className="text-sm text-gray-600">
                    {addr.address1}, {addr.address2 && addr.address2 + ", "}
                    {addr.city}, {addr.province} {addr.postalCode}
                  </div>
                  <div className="text-sm text-gray-600">{addr.phone}</div>
                </div>
                <button
                  className="text-sm text-red-600 hover:underline"
                  onClick={() => handleDeleteAddress(addr.id)}
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-gray-500">No addresses added yet.</p>
        )}
      </div>
    </div>
  );
}
