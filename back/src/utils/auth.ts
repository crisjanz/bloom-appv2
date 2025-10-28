import bcrypt from 'bcryptjs';
import jwt, { Secret } from 'jsonwebtoken';
import { Employee, EmployeeType, Customer } from '@prisma/client';

// JWT secrets are REQUIRED - no fallbacks for security
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;

if (!JWT_SECRET || !JWT_REFRESH_SECRET) {
  throw new Error(
    'FATAL: JWT_SECRET and JWT_REFRESH_SECRET must be set in environment variables.\n' +
    'Generate secure secrets with: node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'hex\'))"'
  );
}

const JWT_EXPIRES_IN = '24h';
const JWT_REFRESH_EXPIRES_IN = '7d';
const CUSTOMER_JWT_EXPIRES_IN = '30d';
const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || '12');

/**
 * Hash a password using bcrypt
 */
export const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
};

/**
 * Verify a password against its hash
 */
export const verifyPassword = async (password: string, hash: string): Promise<boolean> => {
  return bcrypt.compare(password, hash);
};

/**
 * Generate JWT access token
 */
export const generateAccessToken = (employee: Employee): string => {
  const payload = {
    id: employee.id,
    email: employee.email,
    name: employee.name,
    type: employee.type,
    isActive: employee.isActive,
    subject: 'employee',
  };

  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

/**
 * Generate JWT refresh token
 */
export const generateRefreshToken = (employee: Employee): string => {
  const payload = {
    id: employee.id,
    type: 'refresh',
    subject: 'employee',
  };

  return jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: JWT_REFRESH_EXPIRES_IN });
};

/**
 * Verify JWT access token
 */
export const verifyAccessToken = (token: string): any => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    throw new Error('Invalid or expired access token');
  }
};

/**
 * Verify JWT refresh token
 */
export const verifyRefreshToken = (token: string): any => {
  try {
    return jwt.verify(token, JWT_REFRESH_SECRET);
  } catch (error) {
    throw new Error('Invalid or expired refresh token');
  }
};

/**
 * Generate JWT access token for customers
 */
export const generateCustomerAccessToken = (
  customer: Pick<Customer, 'id' | 'email' | 'firstName' | 'lastName' | 'isRegistered'>
): string => {
  const payload = {
    id: customer.id,
    email: customer.email,
    firstName: customer.firstName,
    lastName: customer.lastName,
    isRegistered: customer.isRegistered,
    subject: 'customer',
  };

  return jwt.sign(payload, JWT_SECRET, { expiresIn: CUSTOMER_JWT_EXPIRES_IN });
};

/**
 * Verify customer access token
 */
export const verifyCustomerAccessToken = (token: string): any => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if ((decoded as any).subject !== 'customer') {
      throw new Error('Invalid token subject');
    }
    return decoded;
  } catch (error) {
    throw new Error('Invalid or expired customer token');
  }
};

/**
 * Check if employee has required role(s)
 */
export const hasRole = (employeeType: EmployeeType, requiredRoles: EmployeeType[]): boolean => {
  return requiredRoles.includes(employeeType);
};

/**
 * Check if employee is admin
 */
export const isAdmin = (employeeType: EmployeeType): boolean => {
  return employeeType === EmployeeType.ADMIN;
};

/**
 * Generate secure random password (for initial setup)
 */
export const generateSecurePassword = (length: number = 12): string => {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let password = '';

  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }

  return password;
};

/**
 * Validate password strength
 */
export const validatePasswordStrength = (password: string): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};
