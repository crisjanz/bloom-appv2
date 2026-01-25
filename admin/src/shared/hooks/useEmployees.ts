import { useCallback, useEffect, useState } from "react";
import { useApiClient } from "./useApiClient";

export type Employee = {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  type: string;
  isActive?: boolean;
  hasPassword?: boolean;
};

export type EmployeePayload = {
  name: string;
  email?: string | null;
  phone?: string | null;
  type: string;
};

const ensureResponse = <T,>(status: number, data: T): T => {
  if (status >= 400) {
    let message = "Request failed";

    if (typeof data === "object" && data !== null) {
      if ("message" in data && (data as any).message) {
        message = String((data as any).message);
      } else if ("error" in data) {
        const errorValue = (data as any).error;
        if (Array.isArray(errorValue)) {
          const details = errorValue
            .map((item) => item?.message)
            .filter(Boolean);
          if (details.length > 0) {
            message = details.join(", ");
          } else {
            message = "Request failed";
          }
        } else if (errorValue) {
          message = String(errorValue);
        }
      }
    }
    throw new Error(message);
  }
  return data;
};

const normalizeEmployee = (employee: any): Employee => ({
  id: employee.id,
  name: employee.name ?? "",
  email: employee.email ?? null,
  phone: employee.phone ?? null,
  type: employee.type,
  isActive: employee.isActive,
  hasPassword: Boolean(employee.hasPassword ?? employee.password),
});

const sortEmployees = (list: Employee[]) =>
  [...list].sort((a, b) => a.name.localeCompare(b.name));

export const useEmployees = () => {
  const apiClient = useApiClient();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.get("/api/employees");
      const data = ensureResponse(response.status, response.data);
      const normalized = Array.isArray(data)
        ? (data as any[]).map(normalizeEmployee)
        : [];
      setEmployees(sortEmployees(normalized));
    } catch (err: any) {
      console.error("Failed to load employees:", err);
      setError(err?.message ?? "Failed to load employees");
    } finally {
      setLoading(false);
    }
  }, [apiClient]);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  const createEmployee = useCallback(
    async (payload: EmployeePayload) => {
      const response = await apiClient.post("/api/employees", payload);
      const data = ensureResponse(response.status, response.data);
      const normalized = normalizeEmployee(data);
      setEmployees((prev) => sortEmployees([...prev, normalized]));
      return normalized;
    },
    [apiClient]
  );

  const updateEmployee = useCallback(
    async (employeeId: string, payload: EmployeePayload) => {
      const response = await apiClient.put(`/api/employees/${employeeId}`, payload);
      const data = ensureResponse(response.status, response.data);
      const normalized = normalizeEmployee(data);
      setEmployees((prev) =>
        sortEmployees(prev.map((emp) => (emp.id === normalized.id ? normalized : emp)))
      );
      return normalized;
    },
    [apiClient]
  );

  const deleteEmployee = useCallback(
    async (employeeId: string) => {
      const response = await apiClient.delete(`/api/employees/${employeeId}`);
      ensureResponse(response.status, response.data);
      setEmployees((prev) => prev.filter((emp) => emp.id !== employeeId));
    },
    [apiClient]
  );

  const setPassword = useCallback(
    async (employeeId: string, password: string) => {
      const response = await apiClient.post(`/api/employees/${employeeId}/set-password`, {
        password,
      });
      const data = ensureResponse(response.status, response.data);
      const employeeData = (data as any).employee ?? data;
      const normalized = normalizeEmployee(employeeData);
      setEmployees((prev) =>
        sortEmployees(prev.map((emp) => (emp.id === normalized.id ? normalized : emp)))
      );
      return normalized;
    },
    [apiClient]
  );

  const resetPassword = useCallback(
    async (employeeId: string) => {
      const response = await apiClient.post(`/api/employees/${employeeId}/reset-password`);
      const data = ensureResponse(response.status, response.data);
      const employeeData = (data as any).employee ?? data;
      const normalized = normalizeEmployee(employeeData);
      setEmployees((prev) =>
        sortEmployees(prev.map((emp) => (emp.id === normalized.id ? normalized : emp)))
      );
      return normalized;
    },
    [apiClient]
  );

  return {
    employees,
    loading,
    error,
    refresh: fetchEmployees,
    createEmployee,
    updateEmployee,
    deleteEmployee,
    setPassword,
    resetPassword,
  };
};

export default useEmployees;
