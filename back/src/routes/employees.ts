import { Router } from "express";
import prisma from "../lib/prisma";

const router = Router();

// Get all employees
router.get("/", async (req, res) => {
  try {
    const employees = await prisma.employee.findMany({
      orderBy: { name: "asc" },
    });
    res.json(employees);
  } catch (err) {
    console.error("Error fetching employees:", err);
    res.status(500).json({ error: "Failed to load employees" });
  }
});

// Create a new employee
router.post("/", async (req, res) => {
    const { name, email, type, phone } = req.body;

    if (!name || !type) {
      return res.status(400).json({ error: "Name and type are required" });
    }
    
    const employee = await prisma.employee.create({
      data: { name, email, type, phone },
    });
    

  try {
    const employee = await prisma.employee.create({
      data: { name, email, type },
    });
    res.status(201).json(employee);
  } catch (err) {
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
  const { name, email, type, phone } = req.body;

  if (!name || !type) {
    return res.status(400).json({ error: "Name and type are required" });
  }

  try {
    const updated = await prisma.employee.update({
      where: { id },
      data: { name, email, type, phone },
    });
    res.json(updated);
  } catch (err) {
    console.error("Error updating employee:", err);
    res.status(500).json({ error: "Failed to update employee" });
  }
});
export default router;
