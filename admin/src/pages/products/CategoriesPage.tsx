import { useEffect, useState } from "react";

type Category = {
  id: string;
  name: string;
};

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [newName, setNewName] = useState("");

  useEffect(() => {
    fetch("/api/categories")
      .then((res) => res.json())
      .then(setCategories)
      .catch(() => alert("Failed to load categories"));
  }, []);

  const handleAdd = async () => {
    if (!newName) return;
  
    const res = await fetch("/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName }),
    });
  
    if (res.ok) {
      const added = await res.json();
      setCategories([...categories, added]);
      setNewName("");
    } else {
      alert("Failed to add category");
    }
  };
  
  

  return (
    <div>
      <h1 className="text-xl font-bold mb-4">Categories</h1>
  
      <div className="flex gap-2 mb-6">
        <input
          className="border p-2 flex-1"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="New category name"
        />
        <button
          onClick={handleAdd}
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
        >
          Add
        </button>
      </div>
  
      <ul className="space-y-2">
        {categories.map((cat) => (
          <li key={cat.id} className="border px-3 py-2 rounded bg-white shadow-sm flex justify-between items-center">
            <input
              value={cat.name}
              onChange={(e) =>
                setCategories((prev) =>
                  prev.map((c) => (c.id === cat.id ? { ...c, name: e.target.value } : c))
                )
              }
              className="border p-1 rounded w-1/2"
            />
            <div className="flex gap-2">
              <button
                className="text-sm text-blue-600 hover:underline"
                onClick={async () => {
                  const res = await fetch(`/api/categories/${cat.id}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ name: cat.name }),
                  });
  
                  if (!res.ok) alert("Failed to save");
                }}
              >
                Save
              </button>
              <button
                className="text-sm text-red-600 hover:underline"
                onClick={async () => {
                  const res = await fetch(`/api/categories/${cat.id}`, { method: "DELETE" });
                  if (res.ok) {
                    setCategories((prev) => prev.filter((c) => c.id !== cat.id));
                  } else {
                    alert("Failed to delete");
                  }
                }}
              >
                Delete
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
  
}
