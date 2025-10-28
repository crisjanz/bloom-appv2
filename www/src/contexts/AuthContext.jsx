import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import authService from "../services/authService.js";
import { setAuthToken, clearAuthToken } from "../services/api.js";

const AuthContext = createContext(undefined);

const STORAGE_KEY = "bloom_customer_token";

export const AuthProvider = ({ children }) => {
  const [customer, setCustomer] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem(STORAGE_KEY));
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    const bootstrap = async () => {
      if (!token) {
        clearAuthToken();
        setCustomer(null);
        setInitializing(false);
        return;
      }

      try {
        setAuthToken(token);
        const profile = await authService.getProfile();
        setCustomer(profile);
      } catch (error) {
        console.error("Failed to load customer profile:", error);
        clearAuthToken();
        localStorage.removeItem(STORAGE_KEY);
        setCustomer(null);
        setToken(null);
      } finally {
        setInitializing(false);
      }
    };

    bootstrap();
  }, [token]);

  const persistToken = useCallback((nextToken) => {
    if (nextToken) {
      localStorage.setItem(STORAGE_KEY, nextToken);
      setAuthToken(nextToken);
      setToken(nextToken);
    } else {
      localStorage.removeItem(STORAGE_KEY);
      clearAuthToken();
      setToken(null);
    }
  }, []);

  const login = useCallback(async (email, password) => {
    const response = await authService.login(email, password);
    persistToken(response.token);
    setCustomer(response.customer);
    return response.customer;
  }, [persistToken]);

  const register = useCallback(
    async (payload) => {
      const response = await authService.register(payload);
      persistToken(response.token);
      setCustomer(response.customer);
      return response.customer;
    },
    [persistToken],
  );

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } catch (error) {
      console.warn("Customer logout failed (non-blocking):", error);
    } finally {
      persistToken(null);
      setCustomer(null);
    }
  }, [persistToken]);

  const refreshProfile = useCallback(async () => {
    if (!token) return null;
    const profile = await authService.getProfile();
    setCustomer(profile);
    return profile;
  }, [token]);

  const value = useMemo(
    () => ({
      customer,
      isAuthenticated: Boolean(customer),
      initializing,
      login,
      register,
      logout,
      refreshProfile,
      setCustomer,
    }),
    [customer, initializing, login, register, logout, refreshProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

AuthProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export default AuthContext;
