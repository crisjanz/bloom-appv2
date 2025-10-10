import { useEffect, useState } from "react";
import ComponentCard from "@shared/ui/common/ComponentCard";
import InputField from "@shared/ui/forms/input/InputField";
import Label from "@shared/ui/forms/Label";
import Select from "@shared/ui/forms/Select";
import Button from "@shared/ui/components/ui/button/Button";


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
  const [isCardBodyVisible, setIsCardBodyVisible] = useState(false);

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
 <div className="p-0">
      <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
        {/* Custom Header */}
        <div className="flex justify-between items-center px-6 py-5">
          <div>
            <h3 className="text-base font-medium text-gray-800 dark:text-white/90">
              Address Shortcuts
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Card description here
            </p>
          </div>
          <span 
            onClick={() => setIsCardBodyVisible(!isCardBodyVisible)}
            className="text-sm hover:underline font-medium cursor-pointer text-gray-600 dark:text-gray-300"
          >
            {isCardBodyVisible ? "Hide" : "Show"}
          </span>
        </div>

        {/* Card Body - Starts Here */}
        <div
          className={`p-4 border-t border-gray-100 dark:border-gray-800 sm:p-6 ${isCardBodyVisible ? "" : "hidden"}`}
        >
<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
         {/* Left: List */}
          <div className="space-y-2">
            {shortcuts.map((s) => (
              <div
                key={s.id}
                className="border p-2 rounded text-sm flex justify-between"
              >
                <div>
                  <div className="font-medium">{s.label} - {s.address1}</div>
               
                
               
                 
                
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
            <InputField
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

            <InputField
              type="text"
              placeholder="Address Line 1"
              className="input-primary"
              value={address1}
              onChange={(e) => setAddress1(e.target.value)}
            />
            <InputField
              type="text"
              placeholder="Address Line 2 (optional)"
              className="input-primary"
              value={address2}
              onChange={(e) => setAddress2(e.target.value)}
            />
            <InputField
              type="text"
              placeholder="City"
              className="input-primary"
              value={city}
              onChange={(e) => setCity(e.target.value)}
            />
            <InputField
              type="text"
              placeholder="Province"
              className="input-primary"
              value={province}
              onChange={(e) => setProvince(e.target.value)}
            />
            <InputField
              type="text"
              placeholder="Postal Code"
              className="input-primary"
              value={postalCode}
              onChange={(e) => setPostalCode(e.target.value)}
            />
            <InputField
              type="tel"
              placeholder="Phone (optional)"
              className="input-primary"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
            <Button size="sm" onClick={handleAdd}>
              Add Shortcut
            </Button>
          </div>
        </div>
      </div>
    </div>      </div>
  );
}
