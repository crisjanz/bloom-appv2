import express from "express";
import prisma from "../lib/prisma";

const router = express.Router();

// ========================================
// ADDRESS ROUTES (MUST COME FIRST!)
// ========================================

// PUT update address by ID
router.put('/addresses/:id', async (req, res) => {
  const { id } = req.params;
  const { firstName, lastName, address1, address2, city, province, postalCode, phone, country } = req.body;

  try {
    const updatedAddress = await prisma.address.update({
      where: { id },
      data: {
        firstName: firstName?.trim() || "",
        lastName: lastName?.trim() || "",
        address1: address1?.trim() || "",
        address2: address2?.trim() || null,
        city: city?.trim() || "",
        province: province?.trim() || "",
        postalCode: postalCode?.trim() || "",
        phone: phone?.trim() || null,
        country: country?.trim() || "CA", // ✅ Already updated
      },
    });

    res.json(updatedAddress);
  } catch (err) {
    console.error("Failed to update address:", err);
    res.status(500).json({ error: "Failed to update address" });
  }
});

// DELETE address by ID
router.delete('/addresses/:id', async (req, res) => {
  const { id } = req.params;

  try {
    await prisma.address.delete({
      where: { id },
    });

    res.status(204).end();
  } catch (err) {
    console.error("Failed to delete address:", err);
    res.status(500).json({ error: "Failed to delete address" });
  }
});

// ========================================
// CUSTOMER ROUTES
// ========================================

// GET all customers
router.get("/", async (req, res) => {
  try {
    const q = req.query.q?.toString().trim();
    console.log("🔍 Search query received:", q);
    const customers = await prisma.customer.findMany({
      where: q
        ? {
            OR: [
              { firstName: { contains: q, mode: "insensitive" } },
              { lastName: { contains: q, mode: "insensitive" } },
              { email: { contains: q, mode: "insensitive" } },
              { phone: { contains: q } },
            ],
          }
        : undefined,
      orderBy: { lastName: "asc" },
      take: 20,
    });

    res.json(customers);
  } catch (err: any) {
    console.error("Failed to create customer:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST new customer
router.post("/", async (req, res) => {
  const { firstName, lastName, email, phone, notes } = req.body;
  const cleanEmail = email?.trim().toLowerCase() || null;
  const cleanPhone = phone?.trim() || null;
  const cleanNotes = notes?.trim() || null;
  
  try {
    const created = await prisma.customer.create({
      data: {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: cleanEmail,
        phone: cleanPhone,
        notes: cleanNotes,
      },
    });
    
    res.status(201).json(created);
  } catch (err) {
    console.error("Failed to create customer:", (err as any)?.message || err);
    res.status(500).json({ error: "Failed to create customer" });
  }
});

// PUT update customer
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { firstName, lastName, email, phone, notes, homeAddress } = req.body;

  try {
    let addressIdToUse: string | null = null;

    if (homeAddress) {
      // Clean fallback values
      const requiredFields = {
        firstName: homeAddress.firstName || "Home",
        lastName: homeAddress.lastName || "Address",
        address1: homeAddress.address1 || "",
        city: homeAddress.city || "",
        province: homeAddress.province || "",
        postalCode: homeAddress.postalCode || "",
        country: homeAddress.country || "CA", // 🆕 Add country support
      };

      const optionalFields = {
        address2: homeAddress.address2 || null,
        phone: homeAddress.phone || null,
      };

      if (homeAddress.id) {
        const updated = await prisma.address.update({
          where: { id: homeAddress.id },
          data: { ...requiredFields, ...optionalFields },
        });
        addressIdToUse = updated.id;
      } else {
        const created = await prisma.address.create({
          data: { ...requiredFields, ...optionalFields },
        });
        addressIdToUse = created.id;
      }
    }

    const updatedCustomer = await prisma.customer.update({
      where: { id },
      data: {
        firstName,
        lastName,
        email,
        phone,
        notes,
        ...(addressIdToUse && {
          homeAddress: { connect: { id: addressIdToUse } },
        }),
      },
      include: {
        homeAddress: true,
        addresses: true,
      },
    });

    res.json(updatedCustomer);
  } catch (err) {
    console.error("Failed to update customer:", err);
    res.status(500).json({ error: "Failed to update customer" });
  }
});

// DELETE customer
router.delete("/:id", async (req, res) => {
  const { id } = req.params;

  try {
    await prisma.customer.delete({ where: { id } });
    res.status(204).end();
  } catch (err) {
    console.error("Failed to delete customer:", err);
    res.status(500).json({ error: "Failed to delete customer" });
  }
});

// GET /api/customers/:id/recipients
router.get("/:id/recipients", async (req, res) => {
  const { id } = req.params;

  try {
    const addresses = await prisma.address.findMany({
      where: { customerId: id },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    });

    res.json(addresses);
  } catch (err) {
    console.error("Failed to fetch saved recipients:", (err as any)?.message || err);
    res.status(500).json({ error: "Failed to fetch saved recipients" });
  }
});

// POST /api/customers/:id/recipients
router.post("/:id/recipients", async (req, res) => {
  const { id } = req.params;
  const { firstName, lastName, phone, address1, address2, city, province, postalCode, company, country } = req.body; // 🆕 Add country
  
  try {
    // Check if customer exists
    const customer = await prisma.customer.findUnique({
      where: { id },
    });
    
    if (!customer) {
      return res.status(404).json({ error: "Customer not found" });
    }
    
    // Check if a recipient with same first and last name already exists
    const existingRecipient = await prisma.address.findFirst({
      where: {
        customerId: id,
        firstName: firstName?.trim() || "",
        lastName: lastName?.trim() || "",
      },
    });
    
    if (existingRecipient) {
      // Update existing recipient
      const updatedRecipient = await prisma.address.update({
        where: { id: existingRecipient.id },
        data: {
          phone: phone?.trim() || null,
          address1: address1?.trim() || "",
          address2: address2?.trim() || null,
          city: city?.trim() || "",
          province: province?.trim() || "",
          postalCode: postalCode?.trim() || "",
          country: country?.trim() || "CA", // 🆕 Add country support
        },
      });
      
      console.log("✅ Updated existing recipient:", updatedRecipient.id);
      return res.json(updatedRecipient);
    }
    
    // Create new recipient if no match found
    const newRecipient = await prisma.address.create({
      data: {
        firstName: firstName?.trim() || "",
        lastName: lastName?.trim() || "",
        phone: phone?.trim() || null,
        address1: address1?.trim() || "",
        address2: address2?.trim() || null,
        city: city?.trim() || "",
        province: province?.trim() || "",
        postalCode: postalCode?.trim() || "",
        country: country?.trim() || "CA", // 🆕 Add country support
        customer: { connect: { id } },
      },
    });
    
    console.log("✅ New recipient saved:", newRecipient.id);
    res.status(201).json(newRecipient);
  } catch (err) {
    console.error("Failed to save recipient:", (err as any)?.message || err);
    res.status(500).json({ error: "Failed to save recipient" });
  }
});

// PUT /api/customers/:customerId/recipients/:recipientId
router.put("/:customerId/recipients/:recipientId", async (req, res) => {
  const { customerId, recipientId } = req.params;
  const { firstName, lastName, phone, address1, address2, city, province, postalCode, company, country } = req.body;
  
  try {
    // Verify the recipient belongs to this customer
    const existingRecipient = await prisma.address.findFirst({
      where: {
        id: recipientId,
        customerId: customerId,
      },
    });
    
    if (!existingRecipient) {
      return res.status(404).json({ error: "Recipient not found for this customer" });
    }
    
    // Update the recipient
    const updatedRecipient = await prisma.address.update({
      where: { id: recipientId },
      data: {
        firstName: firstName?.trim() || "",
        lastName: lastName?.trim() || "",
        phone: phone?.trim() || null,
        address1: address1?.trim() || "",
        address2: address2?.trim() || null,
        city: city?.trim() || "",
        province: province?.trim() || "",
        postalCode: postalCode?.trim() || "",
        country: country?.trim() || "CA",
        company: company?.trim() || null,
      },
    });
    
    console.log("✅ Updated recipient:", updatedRecipient.id);
    res.json(updatedRecipient);
  } catch (err) {
    console.error("Failed to update recipient:", (err as any)?.message || err);
    res.status(500).json({ error: "Failed to update recipient" });
  }
});

// POST /api/customers/:id/addresses
router.post('/:id/addresses', async (req, res) => {
  const { id } = req.params;
  const data = { ...req.body };

  try {
    // Remove 'id' if sent from frontend to prevent duplicate key error
    delete data.id;

    // Ensure country has a default value
    if (!data.country) {
      data.country = "CA"; // 🆕 Add default country
    }

    const address = await prisma.address.create({
      data: {
        ...data,
        customer: { connect: { id } },
      },
    });

    res.status(201).json(address);
  } catch (err) {
    console.error("Failed to add address:", err);
    res.status(500).json({ error: "Failed to add address" });
  }
});

// GET /api/customers/:id/messages - get customer's previous card messages
router.get("/:id/messages", async (req, res) => {
  const { id } = req.params;

  try {
    // Get unique card messages from customer's previous orders
    const orders = await prisma.order.findMany({
      where: { 
        customerId: id,
        cardMessage: { not: null }
      },
      select: { cardMessage: true },
      distinct: ['cardMessage'],
      orderBy: { createdAt: 'desc' },
      take: 10 // Limit to last 10 unique messages
    });

    const messages = orders
      .map(order => order.cardMessage)
      .filter(message => message && message.trim().length > 0);

    res.json(messages);
  } catch (err) {
    console.error("Failed to fetch customer messages:", err);
    res.status(500).json({ error: "Failed to load customer messages" });
  }
});

// GET customer by ID (with addresses) - MUST BE LAST!
router.get("/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        homeAddress: true,
        addresses: true,
      },
    });

    if (!customer) {
      return res.status(404).json({ error: "Customer not found" });
    }

    res.json(customer);
  } catch (err) {
    console.error("Failed to fetch customer:", err);
    res.status(500).json({ error: "Failed to load customer" });
  }
});

export default router;