import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, hasRole } from '../utils/auth';
import { EmployeeType } from '@prisma/client';

// Extend Express Request interface to include employee
declare global {
  namespace Express {
    interface Request {
      employee?: {
        id: string;
        email: string | null;
        name: string;
        type: EmployeeType;
        isActive: boolean;
      };
    }
  }
}

/**
 * Middleware to authenticate JWT tokens
 * Adds employee information to req.employee if token is valid
 */
export const authenticateToken = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      res.status(401).json({
        error: 'Access denied',
        message: 'No token provided'
      });
      return;
    }

    // Verify the token
    const decoded = verifyAccessToken(token);

    // Add employee info to request
    req.employee = {
      id: decoded.id,
      email: decoded.email,
      name: decoded.name,
      type: decoded.type,
      isActive: decoded.isActive,
    };

    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(403).json({
      error: 'Access denied',
      message: 'Invalid or expired token'
    });
  }
};

/**
 * Middleware to require specific employee role(s)
 * Must be used after authenticateToken middleware
 */
export const requireRole = (requiredRoles: EmployeeType[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.employee) {
      res.status(401).json({
        error: 'Authentication required',
        message: 'Please log in first'
      });
      return;
    }

    if (!req.employee.isActive) {
      res.status(403).json({
        error: 'Account disabled',
        message: 'Your account has been disabled. Please contact an administrator.'
      });
      return;
    }

    if (!hasRole(req.employee.type, requiredRoles)) {
      res.status(403).json({
        error: 'Insufficient permissions',
        message: `This action requires one of the following roles: ${requiredRoles.join(', ')}`
      });
      return;
    }

    next();
  };
};

/**
 * Middleware specifically for admin-only routes
 */
export const requireAdmin = requireRole([EmployeeType.ADMIN]);

/**
 * Middleware for routes that require admin or manager access
 */
export const requireAdminOrManager = requireRole([EmployeeType.ADMIN]);

/**
 * Middleware for POS access (admin, cashier, designer, driver)
 */
export const requirePOSAccess = requireRole([
  EmployeeType.ADMIN,
  EmployeeType.CASHIER,
  EmployeeType.DESIGNER,
  EmployeeType.DRIVER
]);

/**
 * Optional authentication middleware
 * Adds employee info if token is present and valid, but doesn't fail if no token
 */
export const optionalAuth = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      const decoded = verifyAccessToken(token);
      req.employee = {
        id: decoded.id,
        email: decoded.email,
        name: decoded.name,
        type: decoded.type,
        isActive: decoded.isActive,
      };
    }
  } catch (error) {
    // Ignore auth errors for optional auth
    console.log('Optional auth failed, continuing without authentication');
  }

  next();
};