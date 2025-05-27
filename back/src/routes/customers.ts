import express from "express";
import prisma from "../lib/prisma";


const router = express.Router();


// GET all customers
router.get("/", async (req, res) => {
  try {
    const q = req.query.q?.toString().trim();

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

// ✅ GET customer by ID (with addresses)
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


// POST /api/customers/:id/addresses
router.post('/:id/addresses', async (req, res) => {
    const { id } = req.params;
    const data = { ...req.body };
  
    try {
      // Remove 'id' if sent from frontend to prevent duplicate key error
      delete data.id;
  
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
  

export default router;
