import express from "express";
import { z } from "zod";
import prisma from "../lib/prisma";

const router = express.Router();

const matchSchema = z.object({
  cardFingerprint: z.string().min(4),
});

router.post("/match", async (req, res) => {
  try {
    const { cardFingerprint } = matchSchema.parse(req.body);

    const matches = await prisma.customerPaymentMethod.findMany({
      where: { cardFingerprint },
      take: 5,
      include: {
        customer: {
          select: { id: true, firstName: true, lastName: true, email: true, phone: true },
        },
      },
    });

    const customers = matches
      .map((m) => m.customer)
      .filter(Boolean)
      .filter((c) => !(c!.firstName === 'Walk-in' && c!.lastName === 'Customer'))
      .map((c) => ({
        id: c!.id,
        firstName: c!.firstName,
        lastName: c!.lastName,
        email: c!.email,
        phone: c!.phone,
      }));

    res.json({ matches: customers });
  } catch (error) {
    console.error("Failed to match card fingerprint:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors.map((e) => e.message).join(", ") });
    }
    res.status(500).json({ error: "Failed to lookup fingerprint" });
  }
});

export default router;
