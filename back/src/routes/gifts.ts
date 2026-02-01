import express from "express";
import crypto from "crypto";
import { z } from "zod";
import prisma from "../lib/prisma";

const router = express.Router();

const DEFAULT_GIFT_PERCENT = 15;
const DEFAULT_EXPIRY_DAYS = 180;

function generateToken() {
  return crypto.randomUUID().replace(/-/g, "");
}

function generateCouponCode() {
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i += 1) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return `BDAY-${code}`;
}

function addDays(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
}

const createGiftSchema = z.object({
  orderId: z.string().min(1),
  recipientName: z.string().optional(),
  percentOff: z.number().int().min(1).max(100).optional(),
  expiresInDays: z.number().int().min(1).max(365).optional(),
});

const saveGiftSchema = z
  .object({
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    contactType: z.enum(["email", "sms"]),
    email: z.string().email().optional(),
    phone: z.string().optional(),
    consent: z.boolean(),
    birthdayMonth: z.number().int().min(1).max(12),
    birthdayDay: z.number().int().min(1).max(31),
    birthdayYear: z.number().int().min(1900).max(2100).nullable().optional(),
  })
  .refine((data) => data.consent === true, {
    message: "Consent is required to save the gift",
    path: ["consent"],
  })
  .refine(
    (data) =>
      (data.contactType === "email" && data.email) ||
      (data.contactType === "sms" && data.phone),
    {
      message: "Provide a contact for the selected contact type",
      path: ["contactType"],
    },
  );

router.post("/birthday/create", async (req, res) => {
  try {
    const { orderId, recipientName, percentOff, expiresInDays } =
      createGiftSchema.parse(req.body);

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { recipientCustomer: true },
    });

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    const couponCode = generateCouponCode();
    const couponValue = percentOff ?? DEFAULT_GIFT_PERCENT;
    const expiry = addDays(expiresInDays ?? DEFAULT_EXPIRY_DAYS);

    const coupon = await prisma.coupon.create({
      data: {
        code: couponCode,
        name: "Birthday Gift",
        description: "Birthday gift coupon",
        discountType: "PERCENTAGE",
        value: couponValue,
        usageLimit: 1,
        perCustomerLimit: 1,
        startDate: new Date(),
        endDate: expiry,
        enabled: true,
        webOnly: false,
        posOnly: false,
      },
    });

    const token = generateToken();

    const giftToken = await prisma.giftToken.create({
      data: {
        token,
        type: "BIRTHDAY_RECIPIENT_GIFT",
        status: "ACTIVE",
        expiresAt: expiry,
        issuedForOrderId: orderId,
        issuedToRecipientName: recipientName ?? order.recipientCustomer?.firstName ?? null,
        couponId: coupon.id,
      },
    });

    const url = `/birthday-gift/${giftToken.token}`;

    return res.status(201).json({
      token: giftToken.token,
      url,
      couponCode,
      expiresAt: expiry,
    });
  } catch (error) {
    console.error("Failed to create birthday gift token:", error);
    return res.status(400).json({ error: (error as Error).message });
  }
});

router.get("/birthday/:token", async (req, res) => {
  try {
    const { token } = req.params;

    const gift = await prisma.giftToken.findUnique({
      where: { token },
      include: { coupon: true },
    });

    if (!gift) {
      return res.status(404).json({ error: "Gift not found" });
    }

    if (gift.expiresAt && gift.expiresAt < new Date() && gift.status === "ACTIVE") {
      await prisma.giftToken.update({
        where: { id: gift.id },
        data: { status: "EXPIRED" },
      });
      gift.status = "EXPIRED";
    }

    return res.json({
      token: gift.token,
      status: gift.status,
      expiresAt: gift.expiresAt,
      giftTitle: "Happy Birthday from Bloom",
      giftDescription: "Enjoy a birthday surprise on us.",
      couponCode: gift.coupon?.code ?? null,
      couponType: gift.coupon?.discountType ?? null,
      couponValue: gift.coupon?.value ?? null,
    });
  } catch (error) {
    console.error("Failed to fetch birthday gift:", error);
    return res.status(500).json({ error: "Failed to load gift" });
  }
});

router.post("/birthday/:token/save", async (req, res) => {
  try {
    const { token } = req.params;
    const payload = saveGiftSchema.parse(req.body);

    const gift = await prisma.giftToken.findUnique({
      where: { token },
      include: { coupon: true },
    });

    if (!gift) {
      return res.status(404).json({ error: "Gift not found" });
    }

    if (gift.status !== "ACTIVE") {
      return res.status(400).json({ error: "Gift is not active" });
    }

    if (gift.expiresAt && gift.expiresAt < new Date()) {
      await prisma.giftToken.update({
        where: { id: gift.id },
        data: { status: "EXPIRED" },
      });
      return res.status(400).json({ error: "Gift has expired" });
    }

    const cleanPhone =
      payload.phone
        ?.replace(/[^\d+]/g, "")
        .replace(/^1(\d{10})$/, "$1") || null;

    const existingCustomer = payload.email
      ? await prisma.customer.findUnique({
          where: { email: payload.email.toLowerCase() },
        })
      : cleanPhone
        ? await prisma.customer.findFirst({
            where: { phone: cleanPhone },
          })
        : null;

    const customer = existingCustomer
      ? await prisma.customer.update({
          where: { id: existingCustomer.id },
          data: {
            firstName: payload.firstName,
            lastName: payload.lastName,
            ...(payload.email ? { email: payload.email.toLowerCase() } : {}),
            ...(cleanPhone ? { phone: cleanPhone } : {}),
            birthdayOptIn: true,
            birthdayMonth: payload.birthdayMonth,
            birthdayDay: payload.birthdayDay,
            birthdayYear: payload.birthdayYear ?? null,
            birthdayUpdatedAt: new Date(),
          },
        })
      : await prisma.customer.create({
          data: {
            firstName: payload.firstName,
            lastName: payload.lastName,
            email: payload.email?.toLowerCase() ?? null,
            phone: cleanPhone,
            birthdayOptIn: true,
            birthdayMonth: payload.birthdayMonth,
            birthdayDay: payload.birthdayDay,
            birthdayYear: payload.birthdayYear ?? null,
            birthdayUpdatedAt: new Date(),
          },
        });

    await prisma.giftToken.update({
      where: { id: gift.id },
      data: {
        status: "CLAIMED",
        redeemedByCustomerId: customer.id,
        redeemedAt: new Date(),
      },
    });

    return res.json({
      success: true,
      couponCode: gift.coupon?.code ?? null,
      message: "Saved for later. We'll remember your birthday surprise.",
    });
  } catch (error) {
    console.error("Failed to save birthday gift:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors.map((e) => e.message).join(", ") });
    }
    return res.status(500).json({ error: "Failed to save gift" });
  }
});

export default router;
