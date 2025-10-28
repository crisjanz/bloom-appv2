import { Request, Response, NextFunction } from 'express';
import { verifyCustomerAccessToken } from '../utils/auth';

declare global {
  namespace Express {
    interface Request {
      customer?: {
        id: string;
        email: string | null;
        firstName: string;
        lastName: string;
        isRegistered: boolean;
      };
    }
  }
}

export const authenticateCustomer = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      res.status(401).json({
        error: 'Access denied',
        message: 'No customer token provided',
      });
      return;
    }

    const decoded = verifyCustomerAccessToken(token);

    req.customer = {
      id: decoded.id,
      email: decoded.email ?? null,
      firstName: decoded.firstName,
      lastName: decoded.lastName,
      isRegistered: decoded.isRegistered,
    };

    next();
  } catch (error) {
    console.error('Customer authentication error:', error);
    res.status(403).json({
      error: 'Access denied',
      message: 'Invalid or expired customer token',
    });
  }
};

export const optionalCustomerAuth = (req: Request, _res: Response, next: NextFunction): void => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      const decoded = verifyCustomerAccessToken(token);
      req.customer = {
        id: decoded.id,
        email: decoded.email ?? null,
        firstName: decoded.firstName,
        lastName: decoded.lastName,
        isRegistered: decoded.isRegistered,
      };
    }
  } catch (error) {
    console.log('Optional customer auth failed, continuing without authentication');
  }

  next();
};
