import React, { useState } from 'react';
import { toast } from 'sonner';
import ComponentCard from '@shared/ui/common/ComponentCard';
import InputField from '@shared/ui/forms/input/InputField';
import { Modal } from '@shared/ui/components/ui/modal';
import { useSubscriptionPlans, SubscriptionPlan } from '@shared/hooks/useSubscriptionPlans';
import { formatCurrency, dollarsToCents } from '@shared/utils/currency';

export default function SubscriptionPlans() {
  const { plans, loading, createPlan, updatePlan, deletePlan, refresh } = useSubscriptionPlans();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  const [form, setForm] = useState({ name: '', description: '', priceDollars: '', image: '', isActive: true, sortOrder: 0 });
  const [saving, setSaving] = useState(false);

  const openCreate = () => {
    setEditingPlan(null);
    setForm({ name: '', description: '', priceDollars: '', image: '', isActive: true, sortOrder: 0 });
    setIsModalOpen(true);
  };

  const openEdit = (plan: SubscriptionPlan) => {
    setEditingPlan(plan);
    setForm({
      name: plan.name,
      description: plan.description || '',
      priceDollars: (plan.priceCents / 100).toFixed(2),
      image: plan.image || '',
      isActive: plan.isActive,
      sortOrder: plan.sortOrder,
    });
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.priceDollars) {
      toast.error('Name and price are required');
      return;
    }
    setSaving(true);
    try {
      const data = {
        name: form.name,
        description: form.description || null,
        priceCents: dollarsToCents(parseFloat(form.priceDollars)),
        image: form.image || null,
        isActive: form.isActive,
        sortOrder: form.sortOrder,
      };

      if (editingPlan) {
        await updatePlan(editingPlan.id, data);
        toast.success('Plan updated');
      } else {
        await createPlan(data);
        toast.success('Plan created');
      }
      setIsModalOpen(false);
    } catch {
      toast.error('Failed to save plan');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (plan: SubscriptionPlan) => {
    if (!confirm(`Delete "${plan.name}"?`)) return;
    try {
      await deletePlan(plan.id);
      toast.success('Plan deleted');
    } catch {
      toast.error('Failed to delete plan');
    }
  };

  if (loading) {
    return (
      <ComponentCard title="Subscription Plans">
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500"></div>
        </div>
      </ComponentCard>
    );
  }

  return (
    <>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Subscription Plans</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Designer's Choice price tiers</p>
          </div>
          <button onClick={openCreate} className="px-4 py-2 text-sm font-medium text-white bg-brand-500 rounded-lg hover:bg-brand-600">
            + Add Plan
          </button>
        </div>

        <ComponentCard>
          {plans.length === 0 ? (
            <p className="text-gray-500 text-sm py-8 text-center">No plans yet. Create your first Designer's Choice tier.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
              {plans.map((plan) => (
                <div key={plan.id} className={`border rounded-lg p-4 ${plan.isActive ? 'border-gray-200 dark:border-gray-700' : 'border-gray-200 dark:border-gray-700 opacity-50'}`}>
                  {plan.image && (
                    <img src={plan.image} alt={plan.name} className="w-full h-32 object-cover rounded-lg mb-3" />
                  )}
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-medium text-gray-900 dark:text-white">{plan.name}</h3>
                      <div className="text-lg font-semibold text-brand-500 mt-1">{formatCurrency(plan.priceCents)}/delivery</div>
                      {plan.description && <p className="text-sm text-gray-500 mt-1">{plan.description}</p>}
                      {!plan.isActive && <span className="text-xs text-red-500">Inactive</span>}
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <button onClick={() => openEdit(plan)} className="text-xs text-brand-500 hover:text-brand-600">Edit</button>
                    <button onClick={() => handleDelete(plan)} className="text-xs text-red-500 hover:text-red-600">Delete</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ComponentCard>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} className="max-w-md">
        <div className="p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            {editingPlan ? 'Edit Plan' : 'New Plan'}
          </h2>
          <div className="space-y-4">
            <InputField label="Name *" value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Classic Arrangement" />
            <InputField label="Price per Delivery *" value={form.priceDollars || ''} onChange={(e) => setForm({ ...form, priceDollars: e.target.value })} placeholder="55.00" />
            <InputField label="Description" value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Optional description" />
            <InputField label="Image URL" value={form.image || ''} onChange={(e) => setForm({ ...form, image: e.target.value })} placeholder="https://..." />
            <InputField label="Sort Order" type="number" value={String(form.sortOrder)} onChange={(e) => setForm({ ...form, sortOrder: parseInt(e.target.value) || 0 })} />
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="rounded" />
              <span className="text-sm text-gray-700 dark:text-gray-300">Active</span>
            </label>
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600">
              Cancel
            </button>
            <button onClick={handleSave} disabled={saving} className="px-4 py-2 text-sm text-white bg-brand-500 rounded-lg hover:bg-brand-600 disabled:opacity-50">
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
