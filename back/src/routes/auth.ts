import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import {
  hashPassword,
  verifyPassword,
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  validatePasswordStrength,
} from '../utils/auth';
import { authenticateToken } from '../middleware/auth';
import { EmployeeType } from '@prisma/client';

const router = Router();

/**
 * POST /api/auth/login
 * Authenticate employee and return JWT tokens
 */
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Email and password are required'
      });
    }

    // Find employee by email
    const employee = await prisma.employee.findUnique({
      where: { email },
    });

    // Generic error message to prevent email enumeration
    const authError = {
      error: 'Authentication failed',
      message: 'Invalid credentials'
    };

    if (!employee) {
      return res.status(401).json(authError);
    }

    // Check if employee is active
    if (!employee.isActive) {
      return res.status(401).json(authError);
    }

    // Check if employee has a password set
    if (!employee.password) {
      return res.status(401).json(authError);
    }

    // Check if account is locked
    if (employee.accountLockedUntil && employee.accountLockedUntil > new Date()) {
      const minutesLeft = Math.ceil((employee.accountLockedUntil.getTime() - Date.now()) / 60000);
      return res.status(403).json({
        error: 'Account locked',
        message: `Too many failed attempts. Try again in ${minutesLeft} minutes.`
      });
    }

    // Verify password
    const isValidPassword = await verifyPassword(password, employee.password);

    if (!isValidPassword) {
      const failedAttempts = employee.failedLoginAttempts + 1;
      const maxAttempts = 5;

      // Lock account after 5 failed attempts
      if (failedAttempts >= maxAttempts) {
        const lockUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

        await prisma.employee.update({
          where: { id: employee.id },
          data: {
            failedLoginAttempts: failedAttempts,
            accountLockedUntil: lockUntil,
          }
        });

        return res.status(403).json({
          error: 'Account locked',
          message: 'Too many failed attempts. Account locked for 30 minutes.'
        });
      }

      // Increment failed attempts
      await prisma.employee.update({
        where: { id: employee.id },
        data: { failedLoginAttempts: failedAttempts }
      });

      const attemptsRemaining = maxAttempts - failedAttempts;
      return res.status(401).json({
        error: 'Authentication failed',
        message: `Invalid credentials. ${attemptsRemaining} attempts remaining.`
      });
    }

    // SUCCESS - Reset failed attempts and update last login
    await prisma.employee.update({
      where: { id: employee.id },
      data: {
        lastLogin: new Date(),
        failedLoginAttempts: 0,
        accountLockedUntil: null,
      }
    });

    // Generate tokens
    const accessToken = generateAccessToken(employee);
    const refreshToken = generateRefreshToken(employee);

    // Return employee info and tokens
    res.json({
      employee: {
        id: employee.id,
        name: employee.name,
        email: employee.email,
        type: employee.type,
        isActive: employee.isActive,
        lastLogin: employee.lastLogin,
      },
      tokens: {
        accessToken,
        refreshToken,
        expiresIn: '24h', // Access token expiry
      },
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'An error occurred during login'
    });
  }
});

/**
 * POST /api/auth/refresh
 * Refresh access token using refresh token
 */
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Refresh token is required'
      });
    }

    // Verify refresh token
    const decoded = verifyRefreshToken(refreshToken);

    // Find employee
    const employee = await prisma.employee.findUnique({
      where: { id: decoded.id },
    });

    if (!employee || !employee.isActive) {
      return res.status(403).json({
        error: 'Invalid refresh token',
        message: 'Employee not found or account disabled'
      });
    }

    // Generate new access token
    const newAccessToken = generateAccessToken(employee);

    res.json({
      accessToken: newAccessToken,
      expiresIn: '24h',
    });

  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(403).json({
      error: 'Invalid refresh token',
      message: 'Token refresh failed'
    });
  }
});

/**
 * GET /api/auth/me
 * Get current authenticated employee information
 */
router.get('/me', authenticateToken, async (req: Request, res: Response) => {
  try {
    // Employee info is already added by authenticateToken middleware
    const employee = await prisma.employee.findUnique({
      where: { id: req.employee!.id },
      select: {
        id: true,
        name: true,
        email: true,
        type: true,
        isActive: true,
        lastLogin: true,
        // Don't include password hash
      },
    });

    if (!employee) {
      return res.status(404).json({
        error: 'Employee not found',
        message: 'Employee account no longer exists'
      });
    }

    res.json({ employee });
  } catch (error) {
    console.error('Get employee error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to retrieve employee information'
    });
  }
});

/**
 * POST /api/auth/logout
 * Logout (client-side token removal)
 */
router.post('/logout', (req: Request, res: Response) => {
  // In a stateless JWT system, logout is handled client-side
  // by removing tokens from storage
  res.json({
    message: 'Logged out successfully',
    success: true
  });
});

/**
 * POST /api/auth/setup-admin
 * One-time setup endpoint to create initial admin user
 * This should be disabled/removed after first admin is created
 */
router.post('/setup-admin', async (req: Request, res: Response) => {
  try {
    const { email, password, name } = req.body;

    // Validate input
    if (!email || !password || !name) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Email, password, and name are required'
      });
    }

    // Validate password strength
    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.isValid) {
      return res.status(400).json({
        error: 'Password validation failed',
        message: passwordValidation.errors.join(', ')
      });
    }

    // Check if any admin already exists
    const existingAdmin = await prisma.employee.findFirst({
      where: {
        type: EmployeeType.ADMIN,
        isActive: true
      }
    });

    if (existingAdmin) {
      return res.status(403).json({
        error: 'Admin already exists',
        message: 'An admin user has already been created. Use regular login instead.'
      });
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create admin employee
    const admin = await prisma.employee.create({
      data: {
        name,
        email,
        password: hashedPassword,
        type: EmployeeType.ADMIN,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        type: true,
        isActive: true,
      }
    });

    // Generate tokens for immediate login
    const accessToken = generateAccessToken(admin as any);
    const refreshToken = generateRefreshToken(admin as any);

    res.status(201).json({
      message: 'Admin user created successfully',
      employee: admin,
      tokens: {
        accessToken,
        refreshToken,
        expiresIn: '24h',
      },
    });

  } catch (error) {
    console.error('Admin setup error:', error);

    // Handle unique constraint violation
    if (error.code === 'P2002') {
      return res.status(409).json({
        error: 'Email already exists',
        message: 'An employee with this email already exists'
      });
    }

    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to create admin user'
    });
  }
});

/**
 * POST /api/auth/change-password
 * Change password for authenticated employee
 */
router.post('/change-password', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Current password and new password are required'
      });
    }

    // Validate new password strength
    const passwordValidation = validatePasswordStrength(newPassword);
    if (!passwordValidation.isValid) {
      return res.status(400).json({
        error: 'Password validation failed',
        message: passwordValidation.errors.join(', ')
      });
    }

    // Get employee with password
    const employee = await prisma.employee.findUnique({
      where: { id: req.employee!.id },
    });

    if (!employee || !employee.password) {
      return res.status(404).json({
        error: 'Employee not found',
        message: 'Employee account not found'
      });
    }

    // Verify current password
    const isValidCurrentPassword = await verifyPassword(currentPassword, employee.password);
    if (!isValidCurrentPassword) {
      return res.status(401).json({
        error: 'Authentication failed',
        message: 'Current password is incorrect'
      });
    }

    // Hash new password
    const hashedNewPassword = await hashPassword(newPassword);

    // Update password
    await prisma.employee.update({
      where: { id: employee.id },
      data: { password: hashedNewPassword },
    });

    res.json({
      message: 'Password changed successfully',
      success: true
    });

  } catch (error) {
    console.error('Password change error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to change password'
    });
  }
});

export default router;