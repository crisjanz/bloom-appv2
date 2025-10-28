import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import {
  hashPassword,
  verifyPassword,
  validatePasswordStrength,
  generateCustomerAccessToken,
} from '../utils/auth';
import { authenticateCustomer } from '../middleware/customerAuth';

const router = Router();

const sanitizeEmail = (email?: string): string | null => {
  if (!email) return null;
  return email.trim().toLowerCase();
};

const customerPublicFields = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  phone: true,
  notes: true,
  isRegistered: true,
  lastLogin: true,
  createdAt: true,
  updatedAt: true,
};

router.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, password, firstName, lastName, phone } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Email and password are required',
      });
    }

    const sanitizedEmail = sanitizeEmail(email);

    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.isValid) {
      return res.status(400).json({
        error: 'Weak password',
        message: passwordValidation.errors.join('. '),
      });
    }

    const existingCustomer = await prisma.customer.findUnique({
      where: { email: sanitizedEmail },
    });

    const passwordHash = await hashPassword(password);
    let customer;

    if (!existingCustomer) {
      if (!firstName || !lastName) {
        return res.status(400).json({
          error: 'Validation error',
          message: 'First name and last name are required to create an account',
        });
      }

      customer = await prisma.customer.create({
        data: {
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          phone: phone?.trim() || null,
          email: sanitizedEmail,
          password: passwordHash,
          isRegistered: true,
          lastLogin: new Date(),
        },
        select: customerPublicFields,
      });
    } else {
      if (existingCustomer.isRegistered && existingCustomer.password) {
        return res.status(409).json({
          error: 'Account exists',
          message: 'An account with this email already exists. Please log in.',
        });
      }

      customer = await prisma.customer.update({
        where: { id: existingCustomer.id },
        data: {
          password: passwordHash,
          isRegistered: true,
          lastLogin: new Date(),
          firstName: firstName ? firstName.trim() : existingCustomer.firstName,
          lastName: lastName ? lastName.trim() : existingCustomer.lastName,
          phone: phone?.trim() || existingCustomer.phone,
        },
        select: customerPublicFields,
      });
    }

    const token = generateCustomerAccessToken({
      id: customer.id,
      email: customer.email,
      firstName: customer.firstName,
      lastName: customer.lastName,
      isRegistered: customer.isRegistered,
    });

    res.status(201).json({
      customer,
      token,
      expiresIn: '30d',
    });
  } catch (error: any) {
    console.error('Customer register error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error?.message || 'Failed to register customer',
    });
  }
});

router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Email and password are required',
      });
    }

    const sanitizedEmail = sanitizeEmail(email);

    const customer = await prisma.customer.findUnique({
      where: { email: sanitizedEmail },
    });

    const authError = {
      error: 'Authentication failed',
      message: 'Invalid credentials',
    };

    if (!customer || !customer.password || !customer.isRegistered) {
      return res.status(401).json(authError);
    }

    const isValid = await verifyPassword(password, customer.password);
    if (!isValid) {
      return res.status(401).json(authError);
    }

    const updatedCustomer = await prisma.customer.update({
      where: { id: customer.id },
      data: {
        lastLogin: new Date(),
      },
      select: customerPublicFields,
    });

    const token = generateCustomerAccessToken({
      id: updatedCustomer.id,
      email: updatedCustomer.email,
      firstName: updatedCustomer.firstName,
      lastName: updatedCustomer.lastName,
      isRegistered: updatedCustomer.isRegistered,
    });

    res.json({
      customer: updatedCustomer,
      token,
      expiresIn: '30d',
    });
  } catch (error: any) {
    console.error('Customer login error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error?.message || 'An error occurred during login',
    });
  }
});

router.get('/me', authenticateCustomer, async (req: Request, res: Response) => {
  try {
    const customer = await prisma.customer.findUnique({
      where: { id: req.customer!.id },
      select: {
        ...customerPublicFields,
        addresses: true,
        savedRecipients: {
          include: {
            recipient: true,
          },
        },
      },
    });

    if (!customer) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Customer not found',
      });
    }

    res.json(customer);
  } catch (error: any) {
    console.error('Customer profile error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error?.message || 'Failed to load profile',
    });
  }
});

router.put('/me', authenticateCustomer, async (req: Request, res: Response) => {
  try {
    const { firstName, lastName, phone, email, notes } = req.body;

    const data: any = {};
    if (firstName) data.firstName = firstName.trim();
    if (lastName) data.lastName = lastName.trim();
    if (phone !== undefined) data.phone = phone ? phone.trim() : null;
    if (notes !== undefined) data.notes = notes?.trim() || null;
    if (email !== undefined) {
      const sanitizedEmail = sanitizeEmail(email);
      if (!sanitizedEmail) {
        return res.status(400).json({
          error: 'Validation error',
          message: 'Email cannot be empty',
        });
      }
      data.email = sanitizedEmail;
    }

    if (Object.keys(data).length === 0) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'No changes provided',
      });
    }

    const updated = await prisma.customer.update({
      where: { id: req.customer!.id },
      data,
      select: customerPublicFields,
    });

    res.json(updated);
  } catch (error: any) {
    console.error('Update customer error:', error);

    if (error.code === 'P2002') {
      return res.status(409).json({
        error: 'Duplicate email',
        message: 'This email is already associated with another account',
      });
    }

    res.status(500).json({
      error: 'Internal server error',
      message: error?.message || 'Failed to update profile',
    });
  }
});

router.put('/me/password', authenticateCustomer, async (req: Request, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Current and new passwords are required',
      });
    }

    const passwordValidation = validatePasswordStrength(newPassword);
    if (!passwordValidation.isValid) {
      return res.status(400).json({
        error: 'Weak password',
        message: passwordValidation.errors.join('. '),
      });
    }

    const customer = await prisma.customer.findUnique({
      where: { id: req.customer!.id },
    });

    if (!customer || !customer.password) {
      return res.status(400).json({
        error: 'No password set',
        message: 'Please create an account before changing the password',
      });
    }

    const validCurrent = await verifyPassword(currentPassword, customer.password);
    if (!validCurrent) {
      return res.status(401).json({
        error: 'Authentication failed',
        message: 'Current password is incorrect',
      });
    }

    const newHash = await hashPassword(newPassword);
    await prisma.customer.update({
      where: { id: customer.id },
      data: {
        password: newHash,
        isRegistered: true,
      },
    });

    res.json({ success: true });
  } catch (error: any) {
    console.error('Change password error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error?.message || 'Failed to change password',
    });
  }
});

router.get('/me/orders', authenticateCustomer, async (req: Request, res: Response) => {
  try {
    const orders = await prisma.order.findMany({
      where: {
        OR: [
          { customerId: req.customer!.id },
          { recipientCustomerId: req.customer!.id },
        ],
      },
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        orderItems: true,
        deliveryAddress: true,
      },
    });

    res.json(orders);
  } catch (error: any) {
    console.error('Customer orders error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error?.message || 'Failed to load orders',
    });
  }
});

router.post('/logout', (_req: Request, res: Response) => {
  res.json({ success: true });
});

export default router;
