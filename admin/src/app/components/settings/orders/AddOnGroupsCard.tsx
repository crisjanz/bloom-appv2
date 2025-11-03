import { useMemo, useState } from "react";
import ComponentCard from "@shared/ui/common/ComponentCard";
import Button from "@shared/ui/components/ui/button/Button";
import useAddOnGroups, {
  type AddOnGroup,
  type CreateAddOnGroupPayload,
} from "@shared/hooks/useAddOnGroups";
import { useApiClient } from "@shared/hooks/useApiClient";
import AddOnGroupForm from "./AddOnGroupForm";

const ensureSuccess = (status: number, data: any, fallbackMessage: string) => {
  if (status >= 400) {
    if (data && typeof data === "object" && data.error) {
      throw new Error(String(data.error));
    }
    throw new Error(fallbackMessage);
  }
  return data;
};

const buildInitialValues = (group: AddOnGroup | null): CreateAddOnGroupPayload => {
  if (!group) {
    return {
      name: "",
      isDefault: false,
      productIds: [],
      addonProductIds: [],
    };
  }

  return {
    name: group.name,
    isDefault: group.isDefault,
    productIds: group.products?.map((product) => product.productId) ?? [],
    addonProductIds: group.addOns?.map((addon) => addon.productId) ?? [],
  };
};

const AddOnGroupsCard = () => {
  const api = useApiClient();
  const {
    groups,
    options,
    loading,
    optionsLoading,
    error,
    refresh,
    createGroup,
    updateGroup,
    deleteGroup,
  } = useAddOnGroups();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<AddOnGroup | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const sortedGroups = useMemo(
    () => [...groups].sort((a, b) => a.name.localeCompare(b.name)),
    [groups],
  );

  const handleCreateClick = () => {
    setEditingGroup(null);
    setFormError(null);
    setModalOpen(true);
  };

  const handleEditClick = (group: AddOnGroup) => {
    setEditingGroup(group);
    setFormError(null);
    setModalOpen(true);
  };

  const resetModalState = () => {
    setModalOpen(false);
    setEditingGroup(null);
    setFormError(null);
    setSubmitting(false);
  };

  const handleDelete = async (group: AddOnGroup) => {
    const confirmed = window.confirm(
      `Delete "${group.name}"? This action cannot be undone.`,
    );

    if (!confirmed) {
      return;
    }

    setStatusMessage(null);
    try {
      await deleteGroup(group.id);
      setStatusMessage(`Deleted add-on group "${group.name}".`);
    } catch (err: any) {
      console.error("Failed to delete add-on group:", err);
      setStatusMessage(err?.message ?? "Failed to delete add-on group.");
    }
  };

  const syncAssignments = async (
    groupId: string,
    productsToAdd: string[],
    productsToRemove: string[],
    addonsToAdd: string[],
    addonsToRemove: string[],
  ) => {
    if (productsToAdd.length > 0) {
      const response = await api.post(`/api/addon-groups/${groupId}/products`, {
        productIds: productsToAdd,
      });
      ensureSuccess(response.status, response.data, "Failed to assign products.");
    }

    if (productsToRemove.length > 0) {
      await Promise.all(
        productsToRemove.map(async (productId) => {
          const response = await api.delete(
            `/api/addon-groups/${groupId}/products/${productId}`,
          );
          ensureSuccess(
            response.status,
            response.data,
            `Failed to remove product ${productId}.`,
          );
        }),
      );
    }

    if (addonsToAdd.length > 0) {
      const response = await api.post(`/api/addon-groups/${groupId}/addons`, {
        addonProductIds: addonsToAdd,
      });
      ensureSuccess(response.status, response.data, "Failed to assign add-ons.");
    }

    if (addonsToRemove.length > 0) {
      await Promise.all(
        addonsToRemove.map(async (addonId) => {
          const response = await api.delete(
            `/api/addon-groups/${groupId}/addons/${addonId}`,
          );
          ensureSuccess(
            response.status,
            response.data,
            `Failed to remove add-on ${addonId}.`,
          );
        }),
      );
    }
  };

  const handleSubmit = async (values: CreateAddOnGroupPayload) => {
    setSubmitting(true);
    setFormError(null);
    setStatusMessage(null);

    try {
      if (!editingGroup) {
        await createGroup(values);
        setStatusMessage(`Created add-on group "${values.name}".`);
      } else {
        const currentProductIds = new Set(
          editingGroup.products?.map((assignment) => assignment.productId) ?? [],
        );
        const currentAddonIds = new Set(
          editingGroup.addOns?.map((assignment) => assignment.productId) ?? [],
        );

        const nextProductIds = new Set(values.productIds);
        const nextAddonIds = new Set(values.addonProductIds);

        const productsToAdd = values.productIds.filter(
          (id) => !currentProductIds.has(id),
        );
        const productsToRemove = [...currentProductIds].filter(
          (id) => !nextProductIds.has(id),
        );

        const addonsToAdd = values.addonProductIds.filter(
          (id) => !currentAddonIds.has(id),
        );
        const addonsToRemove = [...currentAddonIds].filter(
          (id) => !nextAddonIds.has(id),
        );

        await updateGroup(editingGroup.id, values);
        await syncAssignments(
          editingGroup.id,
          productsToAdd,
          productsToRemove,
          addonsToAdd,
          addonsToRemove,
        );
        await refresh();
        setStatusMessage(`Updated add-on group "${values.name}".`);
      }

      resetModalState();
    } catch (err: any) {
      console.error("Failed to save add-on group:", err);
      setFormError(err?.message ?? "Failed to save add-on group.");
    } finally {
      setSubmitting(false);
    }
  };

  const initialValues = buildInitialValues(editingGroup);
  const modalMode = editingGroup ? "edit" : "create";

  return (
    <>
      <ComponentCard
        title="Add-On Groups"
        desc="Bundle add-on products with main products and configure default availability."
        headerAction={
          <Button size="sm" onClick={handleCreateClick}>
            Create Group
          </Button>
        }
      >
        {statusMessage && (
          <div className="rounded-md border border-primary/30 bg-primary/10 px-3 py-2 text-sm text-primary dark:border-primary/40 dark:bg-primary/20 dark:text-primary-100">
            {statusMessage}
          </div>
        )}

        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/70 dark:bg-red-900/20 dark:text-red-200">
            {error}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
            <thead>
              <tr className="text-left text-sm font-medium text-gray-500 dark:text-gray-400">
                <th className="px-3 pb-3">Group</th>
                <th className="px-3 pb-3">Default</th>
                <th className="px-3 pb-3">Main Products</th>
                <th className="px-3 pb-3">Add-ons</th>
                <th className="px-3 pb-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {loading && (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-sm text-gray-500 dark:text-gray-400">
                    Loading add-on groups…
                  </td>
                </tr>
              )}

              {!loading && sortedGroups.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-sm text-gray-500 dark:text-gray-400">
                    No add-on groups yet. Create one to start bundling extras with main products.
                  </td>
                </tr>
              )}

              {!loading &&
                sortedGroups.map((group) => (
                  <tr key={group.id} className="text-sm text-gray-800 dark:text-gray-200">
                    <td className="px-3 py-3">
                      <div className="font-medium text-gray-900 dark:text-white">{group.name}</div>
                    </td>
                    <td className="px-3 py-3">
                      {group.isDefault ? (
                        <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200">
                          Default
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500 dark:bg-gray-700/50 dark:text-gray-300">
                          Manual
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3">{group.productCount}</td>
                    <td className="px-3 py-3">{group.addOnCount}</td>
                    <td className="px-3 py-3 text-right">
                      <div className="inline-flex items-center gap-3">
                        <button
                          type="button"
                          className="text-sm font-medium text-primary hover:underline"
                          onClick={() => handleEditClick(group)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="text-sm font-medium text-red-600 hover:underline dark:text-red-300"
                          onClick={() => handleDelete(group)}
                          disabled={submitting}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {optionsLoading && (
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Loading product catalogs for assignment…
          </p>
        )}
      </ComponentCard>

      {modalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-3xl rounded-2xl bg-white p-6 shadow-xl dark:bg-boxdark">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {editingGroup ? "Edit Add-On Group" : "Create Add-On Group"}
                </h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Select which add-ons should be available and where they appear.
                </p>
              </div>
            </div>

            <AddOnGroupForm
              initialValues={initialValues}
              options={options}
              submitting={submitting}
              error={formError}
              mode={modalMode}
              onCancel={resetModalState}
              onSubmit={handleSubmit}
            />
          </div>
        </div>
      )}
    </>
  );
};

export default AddOnGroupsCard;
