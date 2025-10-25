import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Employee types matching backend
export enum EmployeeType {
  CASHIER = 'CASHIER',
  DESIGNER = 'DESIGNER',
  DRIVER = 'DRIVER',
  ADMIN = 'ADMIN',
}

export interface Employee {
  id: string;
  name: string;
  email: string | null;
  type: EmployeeType;
  isActive: boolean;
  lastLogin: Date | null;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
}

export interface LoginResponse {
  employee: Employee;
  tokens: AuthTokens;
}

export interface AuthContextType {
  employee: Employee | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshToken: () => Promise<void>;
  hasRole: (roles: EmployeeType[]) => boolean;
  isAdmin: () => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

// Token storage keys
const ACCESS_TOKEN_KEY = 'bloom_access_token';
const REFRESH_TOKEN_KEY = 'bloom_refresh_token';

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check if user is authenticated on app start
  useEffect(() => {
    const initializeAuth = async () => {
      const accessToken = localStorage.getItem(ACCESS_TOKEN_KEY);

      if (accessToken) {
        try {
          // Verify token by fetching current user
          const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
          });

          if (response.ok) {
            const data = await response.json();
            setEmployee(data.employee);
          } else {
            // Token is invalid, try to refresh
            await refreshToken();
          }
        } catch (error) {
          console.error('Auth initialization failed:', error);
          // Clear invalid tokens
          localStorage.removeItem(ACCESS_TOKEN_KEY);
          localStorage.removeItem(REFRESH_TOKEN_KEY);
        }
      }

      setIsLoading(false);
    };

    initializeAuth();
  }, []);

  const login = async (email: string, password: string): Promise<void> => {
    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Login failed');
      }

      const data: LoginResponse = await response.json();

      // Store tokens
      localStorage.setItem(ACCESS_TOKEN_KEY, data.tokens.accessToken);
      localStorage.setItem(REFRESH_TOKEN_KEY, data.tokens.refreshToken);

      // Set employee data
      setEmployee(data.employee);
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = (): void => {
    // Clear tokens
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);

    // Clear employee data
    setEmployee(null);
  };

  const refreshToken = async (): Promise<void> => {
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);

    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) {
        throw new Error('Token refresh failed');
      }

      const data = await response.json();

      // Store new access token
      localStorage.setItem(ACCESS_TOKEN_KEY, data.accessToken);

    } catch (error) {
      console.error('Token refresh error:', error);
      // Clear tokens on refresh failure
      logout();
      throw error;
    }
  };

  const hasRole = (roles: EmployeeType[]): boolean => {
    return employee ? roles.includes(employee.type) : false;
  };

  const isAdmin = (): boolean => {
    return employee?.type === EmployeeType.ADMIN;
  };

  const value: AuthContextType = {
    employee,
    isAuthenticated: !!employee,
    isLoading,
    login,
    logout,
    refreshToken,
    hasRole,
    isAdmin,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};