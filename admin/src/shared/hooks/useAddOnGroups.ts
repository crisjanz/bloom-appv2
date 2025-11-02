import { useCallback, useEffect, useState } from "react";
import { useApiClient } from "./useApiClient";

export type LinkedProduct = {
  id: string;
  name: string;
  productType: string;
  isActive: boolean;
  price: number | null;
  thumbnail: string | null;
};

export type GroupAssignment = {
  assignmentId: string;
  productId: string;
  product: LinkedProduct | null;
};

export type AddOnGroup = {
  id: string;
  name: string;
  isDefault: boolean;
  productCount: number;
  addOnCount: number;
  products?: GroupAssignment[];
  addOns?: GroupAssignment[];
};

export type AddOnGroupOptions = {
  mainProducts: LinkedProduct[];
  addonProducts: LinkedProduct[];
};

export type CreateAddOnGroupPayload = {
  name: string;
  isDefault: boolean;
  productIds: string[];
  addonProductIds: string[];
};

export type UpdateAddOnGroupPayload = {
  name: string;
  isDefault: boolean;
  productIds: string[];
  addonProductIds: string[];
};

const INITIAL_OPTIONS: AddOnGroupOptions = {
  mainProducts: [],
  addonProducts: [],
};

const ensureResponse = <T,>(status: number, data: T): T => {
  if (status >= 400) {
    const message =
      typeof data === "object" && data !== null && "error" in data
        ? String((data as any).error)
        : "Request failed";
    throw new Error(message);
  }
  return data;
};

export const useAddOnGroups = () => {
  const api = useApiClient();
  const [groups, setGroups] = useState<AddOnGroup[]>([]);
  const [options, setOptions] = useState<AddOnGroupOptions>(INITIAL_OPTIONS);
  const [loading, setLoading] = useState(false);
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchGroups = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get("/api/addon-groups?includeProducts=true");
      const data = ensureResponse(response.status, response.data);
      setGroups(Array.isArray(data) ? (data as AddOnGroup[]) : []);
    } catch (err: any) {
      console.error("Failed to load add-on groups:", err);
      setError(err?.message ?? "Failed to load add-on groups");
    } finally {
      setLoading(false);
    }
  }, [api]);

  const fetchOptions = useCallback(async () => {
    setOptionsLoading(true);
    try {
      const response = await api.get("/api/addon-groups/options");
      const data = ensureResponse(response.status, response.data);
      const normalized: AddOnGroupOptions = {
        mainProducts: Array.isArray(data?.mainProducts)
          ? (data.mainProducts as LinkedProduct[])
          : [],
        addonProducts: Array.isArray(data?.addonProducts)
          ? (data.addonProducts as LinkedProduct[])
          : [],
      };
      setOptions(normalized);
    } catch (err) {
      console.error("Failed to load add-on options:", err);
    } finally {
      setOptionsLoading(false);
    }
  }, [api]);

  useEffect(() => {
    fetchGroups();
    fetchOptions();
  }, [fetchGroups, fetchOptions]);

  const createGroup = useCallback(
    async (payload: CreateAddOnGroupPayload) => {
      const response = await api.post("/api/addon-groups", payload);
      const data = ensureResponse(response.status, response.data);
      await fetchGroups();
      return data as AddOnGroup;
    },
    [api, fetchGroups],
  );

  const updateGroup = useCallback(
    async (groupId: string, payload: UpdateAddOnGroupPayload) => {
      const response = await api.put(`/api/addon-groups/${groupId}`, {
        name: payload.name,
        isDefault: payload.isDefault,
      });
      return ensureResponse(response.status, response.data) as AddOnGroup;
    },
    [api],
  );

  const deleteGroup = useCallback(
    async (groupId: string) => {
      const response = await api.delete(`/api/addon-groups/${groupId}`);
      ensureResponse(response.status, response.data);
      await fetchGroups();
    },
    [api, fetchGroups],
  );

  return {
    groups,
    options,
    loading,
    optionsLoading,
    error,
    refresh: fetchGroups,
    createGroup,
    updateGroup,
    deleteGroup,
  };
};

export default useAddOnGroups;
