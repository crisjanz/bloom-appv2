import { useEffect, useState } from "react";

type Shortcut = {
  id: string;
  label: string;
  type: string;
  address1: string;
  address2?: string;
  city: string;
  province: string;
  postalCode: string;
  phoneNumbers: string[];
};

export default function AddressShortcutsCard() {
  const [shortcuts, setShortcuts] = useState<Shortcut[]>([]);
  const [isOpen, setIsOpen] = useState(true);

  const [label, setLabel] = useState("");
  const [type, setType] = useState("CHURCH");
  const [address1, setAddress1] = useState("");
  const [address2, setAddress2] = useState("");
  const [city, setCity] = useState("");
  const [province, setProvince] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [phone, setPhone] = useState("");

  useEffect(() => {
    fetch("/api/shortcuts")
      .then((res) => res.json())
      .then((data) => setShortcuts(data));
  }, []);

  const handleAdd = async () => {
    if (!label || !type || !address1 || !city || !province || !postalCode) return;

    const res = await fetch("/api/shortcuts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        label,
        type,
        address1,
        address2,
        city,
        province,
        postalCode,
        phoneNumbers: phone ? [phone] : [],
      }),
    });

    if (res.ok) {
      const newShortcut = await res.json();
      setShortcuts([...shortcuts, newShortcut]);
      setLabel("");
      setType("CHURCH");
      setAddress1("");
      setAddress2("");
      setCity("");
      setProvince("");
      setPostalCode("");
      setPhone("");
    }
  };

  const handleDelete = async (id: string) => {
    const confirmed = confirm("Delete this address shortcut?");
    if (!confirmed) return;

    const res = await fetch(`/api/shortcuts/${id}`, { method: "DELETE" });
    if (res.ok) {
      setShortcuts(shortcuts.filter((s) => s.id !== id));
    }
  };

  return (
    <div className="bg-card p-4 rounded-2xl shadow">
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-xl font-semibold">Address Shortcuts</h2>
        <button
          className="text-sm text-blue-600 hover:underline"
          onClick={() => setIsOpen(!isOpen)}
        >
          {isOpen ? "Hide" : "Show"}
        </button>
      </div>
      <p className="text-sm text-gray-500 mb-4">
        Predefined delivery locations like churches or funeral homes.
      </p>

      {isOpen && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left: List */}
          <div className="space-y-2">
            {shortcuts.map((s) => (
              <div
                key={s.id}
                className="border p-2 rounded text-sm flex justify-between"
              >
                <div>
                  <div className="font-medium">{s.label}</div>
                  <div className="text-gray-600">{s.type}</div>
                  <div className="text-gray-600">{s.address1}</div>
                  {s.address2 && <div className="text-gray-600">{s.address2}</div>}
                  <div className="text-gray-600">
                    {s.city}, {s.province} {s.postalCode}
                  </div>
                  {s.phoneNumbers.length > 0 && (
                    <div className="text-gray-600">{s.phoneNumbers[0]}</div>
                  )}
                </div>
                <button
                  className="text-red-600 text-sm hover:underline"
                  onClick={() => handleDelete(s.id)}
                >
                  Delete
                </button>
              </div>
            ))}
          </div>

          {/* Right: Form */}
          <div className="flex flex-col gap-3">
            <input
              type="text"
              placeholder="Label (e.g. St. Mary's Church)"
              className="input-primary"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
            />
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="select-input"
            >
              <option value="CHURCH">Church</option>
              <option value="FUNERAL_HOME">Funeral Home</option>
              <option value="SCHOOL">School</option>
              <option value="HOSPITAL">Hospital</option>
              <option value="OTHER">Other</option>
            </select>
            <input
              type="text"
              placeholder="Address Line 1"
              className="input-primary"
              value={address1}
              onChange={(e) => setAddress1(e.target.value)}
            />
            <input
              type="text"
              placeholder="Address Line 2 (optional)"
              className="input-primary"
              value={address2}
              onChange={(e) => setAddress2(e.target.value)}
            />
            <input
              type="text"
              placeholder="City"
              className="input-primary"
              value={city}
              onChange={(e) => setCity(e.target.value)}
            />
            <input
              type="text"
              placeholder="Province"
              className="input-primary"
              value={province}
              onChange={(e) => setProvince(e.target.value)}
            />
            <input
              type="text"
              placeholder="Postal Code"
              className="input-primary"
              value={postalCode}
              onChange={(e) => setPostalCode(e.target.value)}
            />
            <input
              type="tel"
              placeholder="Phone (optional)"
              className="input-primary"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
            <button className="btn-primary w-fit" onClick={handleAdd}>
              Add Shortcut
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
