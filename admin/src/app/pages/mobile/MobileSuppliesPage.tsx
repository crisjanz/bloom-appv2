import { useCallback, useEffect, useState } from 'react';
import { useApiClient } from '@shared/hooks/useApiClient';
import { toast } from 'sonner';
import MobilePageHeader from '@app/components/mobile/MobilePageHeader';
import InputField from '@shared/ui/forms/input/InputField';
import { Modal } from '@shared/ui/components/ui/modal';
import FormFooter from '@shared/ui/components/ui/form/FormFooter';
import { SaveIcon } from '@shared/assets/icons';

interface Supply {
  id: number;
  name: string;
  imageUrl: string | null;
  shop: number;
  backShelf: number;
  boxed: number;
}

type LocationKey = 'shop' | 'backShelf' | 'boxed';

const LOCATIONS: { key: LocationKey; label: string }[] = [
  { key: 'shop', label: 'Shop' },
  { key: 'backShelf', label: 'Back Shelf' },
  { key: 'boxed', label: 'Boxed' },
];

const emptyForm = { name: '', imageUrl: null as string | null, shop: 0, backShelf: 0, boxed: 0 };

export default function MobileSuppliesPage() {
  const api = useApiClient();
  const [supplies, setSupplies] = useState<Supply[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Supply | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const fetchSupplies = useCallback(async () => {
    try {
      const { data } = await api.get('/api/supplies');
      setSupplies(data);
    } catch {
      toast.error('Failed to load supplies');
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    fetchSupplies();
  }, [fetchSupplies]);

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (supply: Supply) => {
    setEditing(supply);
    setForm({
      name: supply.name,
      imageUrl: supply.imageUrl,
      shop: supply.shop,
      backShelf: supply.backShelf,
      boxed: supply.boxed,
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditing(null);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error('Name is required');
      return;
    }

    setSaving(true);
    try {
      if (editing) {
        const { data } = await api.put(`/api/supplies/${editing.id}`, form);
        setSupplies((prev) => prev.map((s) => (s.id === editing.id ? data : s)));
        toast.success('Supply updated');
      } else {
        const { data } = await api.post('/api/supplies', form);
        setSupplies((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
        toast.success('Supply added');
      }
      closeModal();
    } catch {
      toast.error('Failed to save supply');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      await api.delete(`/api/supplies/${editing.id}`);
      setSupplies((prev) => prev.filter((s) => s.id !== editing.id));
      toast.success('Supply deleted');
      closeModal();
    } catch {
      toast.error('Failed to delete supply');
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', 'supplies');
      const { data } = await api.post('/api/images/upload', formData);
      if (data?.url) {
        setForm((prev) => ({ ...prev, imageUrl: data.url }));
        toast.success('Image uploaded');
      }
    } catch {
      toast.error('Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  // Quick quantity adjust directly on a card
  const quickAdjust = async (supply: Supply, key: LocationKey, delta: number) => {
    const newVal = Math.max(0, supply[key] + delta);
    // Optimistic update
    setSupplies((prev) =>
      prev.map((s) => (s.id === supply.id ? { ...s, [key]: newVal } : s))
    );
    try {
      await api.put(`/api/supplies/${supply.id}`, { [key]: newVal });
    } catch {
      // Revert on failure
      setSupplies((prev) =>
        prev.map((s) => (s.id === supply.id ? { ...s, [key]: supply[key] } : s))
      );
      toast.error('Failed to update quantity');
    }
  };

  const filtered = filter.trim()
    ? supplies.filter((s) => s.name.toLowerCase().includes(filter.toLowerCase()))
    : supplies;

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-gray-950">
      <div className="mx-auto w-full max-w-md px-4 py-5 space-y-6">
        <MobilePageHeader title="Supplies" showBackButton />

        {/* Search */}
        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-md p-4">
          <InputField
            label="Search"
            placeholder="Filter supplies..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
        </div>

        {/* Supply list */}
        {loading ? (
          <div className="text-center text-gray-500 dark:text-gray-400 py-8">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center text-gray-500 dark:text-gray-400 py-8">
            {supplies.length === 0 ? 'No supplies yet. Tap + to add one.' : 'No matches.'}
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((supply) => (
              <div
                key={supply.id}
                className="bg-white dark:bg-gray-800 rounded-3xl shadow-md p-4 space-y-3"
              >
                {/* Header row — tap to edit */}
                <button
                  type="button"
                  onClick={() => openEdit(supply)}
                  className="flex items-center gap-3 w-full text-left"
                >
                  {supply.imageUrl ? (
                    <img
                      src={supply.imageUrl}
                      alt={supply.name}
                      className="w-12 h-12 rounded-xl object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-gray-700 flex-shrink-0" />
                  )}
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                      {supply.name}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Total: {supply.shop + supply.backShelf + supply.boxed}
                    </p>
                  </div>
                  <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
                  </svg>
                </button>

                {/* Quantity steppers */}
                <div className="grid grid-cols-3 gap-2">
                  {LOCATIONS.map(({ key, label }) => (
                    <div key={key} className="text-center space-y-1">
                      <div className="text-[10px] font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                        {label}
                      </div>
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => quickAdjust(supply, key, -1)}
                          className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-sm font-semibold text-gray-700 dark:text-gray-200"
                        >
                          -
                        </button>
                        <span className="w-8 text-center text-sm font-semibold text-gray-900 dark:text-white">
                          {supply[key]}
                        </span>
                        <button
                          type="button"
                          onClick={() => quickAdjust(supply, key, 1)}
                          className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-sm font-semibold text-gray-700 dark:text-gray-200"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Floating add button */}
        <button
          type="button"
          onClick={openAdd}
          className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-brand-500 hover:bg-brand-600 text-white shadow-lg flex items-center justify-center text-2xl font-light z-30"
          aria-label="Add supply"
        >
          +
        </button>
      </div>

      {/* Add/Edit Modal */}
      <Modal isOpen={modalOpen} onClose={closeModal} className="max-w-md">
        <div className="p-6 space-y-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {editing ? 'Edit Supply' : 'Add Supply'}
          </h2>

          {/* Image */}
          <div className="flex items-center gap-4">
            {form.imageUrl ? (
              <img
                src={form.imageUrl}
                alt="Supply"
                className="w-16 h-16 rounded-xl object-cover"
              />
            ) : (
              <div className="w-16 h-16 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-400">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.41a2.25 2.25 0 013.182 0l2.909 2.91m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                </svg>
              </div>
            )}
            <label className="cursor-pointer text-sm font-medium text-brand-500 hover:text-brand-600">
              {uploading ? 'Uploading...' : form.imageUrl ? 'Change Photo' : 'Add Photo'}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageUpload}
                disabled={uploading}
              />
            </label>
            {form.imageUrl && (
              <button
                type="button"
                onClick={() => setForm((prev) => ({ ...prev, imageUrl: null }))}
                className="text-sm text-red-500 hover:text-red-600"
              >
                Remove
              </button>
            )}
          </div>

          <InputField
            label="Name"
            placeholder="e.g. Ribbon - Red Satin"
            value={form.name || ''}
            onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
          />

          <div className="grid grid-cols-3 gap-3">
            {LOCATIONS.map(({ key, label }) => (
              <div key={key} className="space-y-1">
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
                  {label}
                </label>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, [key]: Math.max(0, prev[key] - 1) }))}
                    className="w-8 h-9 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-sm font-semibold"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min="0"
                    value={form[key]}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, [key]: Math.max(0, Number(e.target.value) || 0) }))
                    }
                    className="w-full h-9 text-center rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, [key]: prev[key] + 1 }))}
                    className="w-8 h-9 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-sm font-semibold"
                  >
                    +
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="text-sm text-gray-500 dark:text-gray-400 text-right">
            Total: <span className="font-semibold text-gray-900 dark:text-white">{form.shop + form.backShelf + form.boxed}</span>
          </div>

          {editing && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={saving}
              className="w-full text-sm text-red-500 hover:text-red-600 py-2"
            >
              Delete Supply
            </button>
          )}

          <FormFooter
            onCancel={closeModal}
            onSubmit={handleSave}
            submitting={saving}
            submitText={editing ? 'Save Changes' : 'Add Supply'}
            submitIcon={<SaveIcon className="w-4 h-4" />}
          />
        </div>
      </Modal>
    </div>
  );
}
