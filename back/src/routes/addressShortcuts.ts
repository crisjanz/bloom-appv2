import { Router } from "express";
import prisma from "../lib/prisma";

const router = Router();

// Get all shortcuts
router.get("/", async (req, res) => {
  try {
    const shortcuts = await prisma.addressShortcut.findMany({
      orderBy: { label: "asc" },
    });
    res.json(shortcuts);
  } catch (err) {
    console.error("Failed to fetch shortcuts:", err);
    res.status(500).json({ error: "Could not load address shortcuts" });
  }
});

// Add new shortcut
router.post("/", async (req, res) => {
  const { label, type, address1, address2, city, province, postalCode, phoneNumbers } = req.body;

  if (!label || !type || !address1 || !city || !province || !postalCode) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    const newShortcut = await prisma.addressShortcut.create({
      data: {
        label,
        type,
        address1,
        address2,
        city,
        province,
        postalCode,
        phoneNumbers,
      },
    });
    res.status(201).json(newShortcut);
  } catch (err) {
    console.error("Failed to create shortcut:", err);
    res.status(500).json({ error: "Could not create address shortcut" });
  }
});

// Delete shortcut
router.delete("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.addressShortcut.delete({ where: { id } });
    res.status(204).end();
  } catch (err) {
    console.error("Failed to delete shortcut:", err);
    res.status(500).json({ error: "Could not delete address shortcut" });
  }
});

export default router;
