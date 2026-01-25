import { Router } from "express";
import { z } from "zod";
import prisma from "../lib/prisma";
import { authenticateToken, requireAdmin } from "../middleware/auth";
import { hashPassword, validatePasswordStrength } from "../utils/auth";
import { EmployeeType } from "@prisma/client";

const router = Router();

const emptyToUndefined = (value: unknown) => (value === "" ? undefined : value);

const employeeSchema = z.object({
  name: z.string().trim().min(1),
  email: z.preprocess(
    emptyToUndefined,
    z.string().trim().email().optional().nullable()
  ),
  phone: z.preprocess(
    emptyToUndefined,
    z.string().trim().min(1).optional().nullable()
  ),
  type: z.nativeEnum(EmployeeType),
});

const passwordSchema = z.object({
  password: z.string().min(1),
});

type EmployeeRecord = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  type: EmployeeType;
  isActive: boolean;
  password: string | null;
};

const employeeSelect = {
  id: true,
  name: true,
  email: true,
  phone: true,
  type: true,
  isActive: true,
  password: true,
};

const formatEmployee = (employee: EmployeeRecord) => ({
  id: employee.id,
  name: employee.name,
  email: employee.email,
  phone: employee.phone,
  type: employee.type,
  isActive: employee.isActive,
  hasPassword: Boolean(employee.password),
});

// Get all employees
router.get("/", async (_req, res) => {
  try {
    const employees = await prisma.employee.findMany({
      orderBy: { name: "asc" },
      select: employeeSelect,
    });
    res.json(employees.map(formatEmployee));
  } catch (err) {
    console.error("Error fetching employees:", err);
    res.status(500).json({ error: "Failed to load employees" });
  }
});

// Create a new employee
router.post("/", async (req, res) => {
  try {
    const payload = employeeSchema.parse(req.body);

    const employee = await prisma.employee.create({
      data: {
        name: payload.name,
        email: payload.email ?? null,
        phone: payload.phone ?? null,
        type: payload.type,
      },
      select: employeeSelect,
    });

    res.status(201).json(formatEmployee(employee));
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors });
    }

    if (err?.code === "P2002") {
      return res.status(409).json({
        error: "Email already exists",
        message: "An employee with this email already exists",
      });
    }

    console.error("Error creating employee:", err);
    res.status(500).json({ error: "Failed to create employee" });
  }
});

// Delete employee
router.delete("/:id", async (req, res) => {
  const { id } = req.params;

  try {
    await prisma.employee.delete({ where: { id } });
    res.status(204).end();
  } catch (err) {
    console.error("Failed to delete employee:", err);
    res.status(500).json({ error: "Could not delete employee" });
  }
});

// Update employee
router.put("/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const payload = employeeSchema.parse(req.body);

    const updated = await prisma.employee.update({
      where: { id },
      data: {
        name: payload.name,
        email: payload.email ?? null,
        phone: payload.phone ?? null,
        type: payload.type,
      },
      select: employeeSelect,
    });

    res.json(formatEmployee(updated));
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors });
    }

    console.error("Error updating employee:", err);
    res.status(500).json({ error: "Failed to update employee" });
  }
});

// Set password for employee (admin only)
router.post("/:id/set-password", authenticateToken, requireAdmin, async (req, res) => {
  const { id } = req.params;

  try {
    const payload = passwordSchema.parse(req.body);

    const employee = await prisma.employee.findUnique({
      where: { id },
      select: employeeSelect,
    });

    if (!employee) {
      return res.status(404).json({
        error: "Employee not found",
        message: "Employee account not found",
      });
    }

    if (!employee.email) {
      return res.status(400).json({
        error: "Email required",
        message: "Employee must have an email before setting a password",
      });
    }

    const passwordValidation = validatePasswordStrength(payload.password);
    if (!passwordValidation.isValid) {
      return res.status(400).json({
        error: "Password validation failed",
        message: passwordValidation.errors.join(", "),
      });
    }

    const hashedPassword = await hashPassword(payload.password);

    const updated = await prisma.employee.update({
      where: { id },
      data: {
        password: hashedPassword,
        failedLoginAttempts: 0,
        accountLockedUntil: null,
      },
      select: employeeSelect,
    });

    res.json({
      message: "Password set successfully",
      employee: formatEmployee(updated),
    });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors });
    }

    console.error("Error setting employee password:", err);
    res.status(500).json({ error: "Failed to set employee password" });
  }
});

// Reset employee password (admin only)
router.post("/:id/reset-password", authenticateToken, requireAdmin, async (req, res) => {
  const { id } = req.params;

  try {
    const employee = await prisma.employee.findUnique({
      where: { id },
      select: employeeSelect,
    });

    if (!employee) {
      return res.status(404).json({
        error: "Employee not found",
        message: "Employee account not found",
      });
    }

    const updated = await prisma.employee.update({
      where: { id },
      data: {
        password: null,
        failedLoginAttempts: 0,
        accountLockedUntil: null,
      },
      select: employeeSelect,
    });

    res.json({
      message: "Password reset successfully",
      employee: formatEmployee(updated),
    });
  } catch (err) {
    console.error("Error resetting employee password:", err);
    res.status(500).json({ error: "Failed to reset employee password" });
  }
});

export default router;
