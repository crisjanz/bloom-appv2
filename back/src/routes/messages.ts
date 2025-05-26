import { Router } from "express";
import prisma from "../lib/prisma";

const router = Router();

// GET all message suggestions
router.get("/", async (req, res) => {
  try {
    const messages = await prisma.messageSuggestion.findMany({
      orderBy: { label: "asc" },
    });
    res.json(messages);
  } catch (err) {
    console.error("Failed to fetch messages:", err);
    res.status(500).json({ error: "Could not load messages" });
  }
});

// POST create new message suggestion
router.post("/", async (req, res) => {
  const { label, message } = req.body;
  if (!label || !message) {
    return res.status(400).json({ error: "Label and message are required" });
  }

  try {
    const newMessage = await prisma.messageSuggestion.create({
      data: { label, message },
    });
    res.status(201).json(newMessage);
  } catch (err) {
    console.error("Failed to create message:", err);
    res.status(500).json({ error: "Could not create message" });
  }
});

// DELETE a message suggestion
router.delete("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.messageSuggestion.delete({ where: { id } });
    res.status(204).end();
  } catch (err) {
    console.error("Failed to delete message:", err);
    res.status(500).json({ error: "Could not delete message" });
  }
});

export default router;
