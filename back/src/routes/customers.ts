import express from "express";
import prisma from "../lib/prisma";

const router = express.Router();

// ========================================
// ADDRESS ROUTES (MUST COME FIRST!)
// ========================================

// PUT update address by ID
router.put('/addresses/:id', async (req, res) => {
  const { id } = req.params;
  const { label, firstName, lastName, address1, address2, city, province, postalCode, phone, country, company, addressType } = req.body;

  try {
    const updateData: any = {
      address1: address1?.trim() || "",
      address2: address2?.trim() || null,
      city: city?.trim() || "",
      province: province?.trim() || "",
      postalCode: postalCode?.trim() || "",
      phone: phone?.trim() || null,
      country: country?.trim() || "CA",
    };

    // Only update label if provided
    if (label !== undefined) {
      updateData.label = label?.trim() || null;
    }

    // Only update firstName/lastName if provided
    if (firstName !== undefined) {
      updateData.firstName = firstName?.trim() || "";
    }
    if (lastName !== undefined) {
      updateData.lastName = lastName?.trim() || "";
    }

    // Update optional fields
    if (company !== undefined) {
      updateData.company = company?.trim() || null;
    }
    if (addressType !== undefined) {
      updateData.addressType = addressType;
    }

    const updatedAddress = await prisma.address.update({
      where: { id },
      data: updateData,
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

// GET /quick-search - Quick customer search for POS/TakeOrder
router.get("/quick-search", async (req, res) => {
  try {
    const query = req.query.query?.toString().trim();
    const limit = parseInt(req.query.limit?.toString() || "10");

    if (!query || query.length < 2) {
      return res.json([]);
    }
    
    const customers = await prisma.customer.findMany({
      where: {
        OR: [
          { firstName: { contains: query, mode: "insensitive" } },
          { lastName: { contains: query, mode: "insensitive" } },
          { email: { contains: query, mode: "insensitive" } },
          { phone: { contains: query } },
        ],
      },
      orderBy: { lastName: "asc" },
      take: limit,
    });

    res.json(customers);
  } catch (err: any) {
    console.error("Failed to search customers:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET all customers
router.get("/", async (req, res) => {
  try {
    const q = req.query.q?.toString().trim();
    const paginated = req.query.paginated === 'true';
    const page = Math.max(parseInt(req.query.page?.toString() ?? '0', 10) || 0, 0);
    const pageSizeRaw = parseInt(req.query.pageSize?.toString() ?? '25', 10);
    const pageSize = Math.min(Math.max(pageSizeRaw || 25, 1), 100);

    const where = q
      ? {
          OR: [
            { firstName: { contains: q, mode: "insensitive" as const } },
            { lastName: { contains: q, mode: "insensitive" as const } },
            { email: { contains: q, mode: "insensitive" as const } },
            { phone: { contains: q } },
          ],
        }
      : undefined;

    if (paginated) {
      const [total, customers] = await Promise.all([
        prisma.customer.count({ where }),
        prisma.customer.findMany({
          where,
          orderBy: { lastName: "asc" },
          skip: page * pageSize,
          take: pageSize,
        }),
      ]);

      return res.json({
        items: customers,
        total,
        page,
        pageSize,
      });
    }

    const customers = await prisma.customer.findMany({
      where,
      orderBy: { lastName: "asc" },
      take: pageSize,
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

// POST /api/customers/merge - Merge customers
router.post("/merge", async (req, res) => {
  const { sourceIds, targetId, keepAddressIds } = req.body;

  if (!sourceIds || !Array.isArray(sourceIds) || sourceIds.length === 0) {
    return res.status(400).json({ error: "sourceIds array is required" });
  }

  if (!targetId) {
    return res.status(400).json({ error: "targetId is required" });
  }

  if (sourceIds.includes(targetId)) {
    return res.status(400).json({ error: "Cannot merge a customer into itself" });
  }

  const keepAddressIdsSet = keepAddressIds ? new Set(keepAddressIds) : null;

  try {
    let totalOrdersMerged = 0;
    let totalAddressesMerged = 0;
    let totalTransactionsMerged = 0;

    // If keepAddressIds provided, delete unselected addresses from target customer first
    if (keepAddressIdsSet) {
      const targetAddresses = await prisma.address.findMany({
        where: { customerId: targetId }
      });

      for (const addr of targetAddresses) {
        if (!keepAddressIdsSet.has(addr.id)) {
          // Check if any orders use this address
          const ordersUsingAddress = await prisma.order.count({
            where: { deliveryAddressId: addr.id }
          });

          if (ordersUsingAddress === 0) {
            // Safe to delete - no orders reference it
            await prisma.address.delete({ where: { id: addr.id } });
          }
          // If orders exist, keep the address (don't break order references)
        }
      }
    }

    // For each source customer, transfer their data to the target
    for (const sourceId of sourceIds) {
      // Transfer all orders
      const orderResult = await prisma.order.updateMany({
        where: { customerId: sourceId },
        data: { customerId: targetId }
      });
      totalOrdersMerged += orderResult.count;

      // Transfer all payment transactions
      const transactionResult = await prisma.paymentTransaction.updateMany({
        where: { customerId: sourceId },
        data: { customerId: targetId }
      });
      totalTransactionsMerged += transactionResult.count;

      // Transfer selected addresses (or all if no selection provided)
      const sourceAddresses = await prisma.address.findMany({
        where: { customerId: sourceId }
      });

      for (const addr of sourceAddresses) {
        // Skip if address not in keep list (when provided)
        if (keepAddressIdsSet && !keepAddressIdsSet.has(addr.id)) {
          // Delete address not selected for keeping
          await prisma.address.delete({ where: { id: addr.id } });
          continue;
        }
        // Normalize address2 for comparison (treat null and empty string as same)
        const normalizedAddr2 = addr.address2?.trim() || null;

        // Check if target already has this PHYSICAL ADDRESS (ignore name differences)
        const existingAddress = await prisma.address.findFirst({
          where: {
            customerId: targetId,
            address1: addr.address1,
            address2: normalizedAddr2,
            city: addr.city,
            province: addr.province,
            postalCode: addr.postalCode,
            country: addr.country
          }
        });

        let addressIdToUse: string;

        if (existingAddress) {
          // Address already exists - UPDATE it with better data if available
          const updateData: any = {};

          // Keep phone if existing is missing and source has one
          if (!existingAddress.phone && addr.phone) {
            updateData.phone = addr.phone;
          }

          // Keep company if existing is missing and source has one
          if (!existingAddress.company && addr.company) {
            updateData.company = addr.company;
          }

          // Update if we have improvements
          if (Object.keys(updateData).length > 0) {
            await prisma.address.update({
              where: { id: existingAddress.id },
              data: updateData
            });
          }

          addressIdToUse = existingAddress.id;
        } else {
          // Create new address for target customer
          const newAddress = await prisma.address.create({
            data: {
              firstName: addr.firstName,
              lastName: addr.lastName,
              phone: addr.phone,
              address1: addr.address1,
              address2: addr.address2,
              city: addr.city,
              province: addr.province,
              postalCode: addr.postalCode,
              country: addr.country,
              company: addr.company,
              label: addr.label,
              addressType: addr.addressType,
              customerId: targetId
            }
          });
          addressIdToUse = newAddress.id;
          totalAddressesMerged++;
        }

        // Update orders that use this address for delivery
        await prisma.order.updateMany({
          where: { deliveryAddressId: addr.id },
          data: { deliveryAddressId: addressIdToUse }
        });
      }

      // Delete old addresses from source customer
      await prisma.address.deleteMany({
        where: { customerId: sourceId }
      });

      // Transfer CustomerRecipient relationships where source is the SENDER
      const senderRecipients = await prisma.customerRecipient.findMany({
        where: { senderId: sourceId }
      });

      for (const rel of senderRecipients) {
        // Check if target already has this recipient relationship
        const existingRel = await prisma.customerRecipient.findUnique({
          where: {
            senderId_recipientId: {
              senderId: targetId,
              recipientId: rel.recipientId
            }
          }
        });

        if (!existingRel) {
          // Create new relationship for target
          await prisma.customerRecipient.create({
            data: {
              senderId: targetId,
              recipientId: rel.recipientId
            }
          });
        }

        // Delete old relationship
        await prisma.customerRecipient.delete({
          where: { id: rel.id }
        });
      }

      // Transfer CustomerRecipient relationships where source is the RECIPIENT
      const recipientSenders = await prisma.customerRecipient.findMany({
        where: { recipientId: sourceId }
      });

      for (const rel of recipientSenders) {
        // Check if this sender already has target as recipient
        const existingRel = await prisma.customerRecipient.findUnique({
          where: {
            senderId_recipientId: {
              senderId: rel.senderId,
              recipientId: targetId
            }
          }
        });

        if (!existingRel) {
          // Create new relationship with target as recipient
          await prisma.customerRecipient.create({
            data: {
              senderId: rel.senderId,
              recipientId: targetId
            }
          });
        }

        // Delete old relationship
        await prisma.customerRecipient.delete({
          where: { id: rel.id }
        });
      }

      // Delete source customer
      await prisma.customer.delete({
        where: { id: sourceId }
      });
    }

    res.json({
      success: true,
      customersMerged: sourceIds.length,
      ordersMerged: totalOrdersMerged,
      addressesMerged: totalAddressesMerged,
      transactionsMerged: totalTransactionsMerged
    });
  } catch (err) {
    console.error("Failed to merge customers:", err);
    res.status(500).json({ error: "Failed to merge customers" });
  }
});

// DELETE customer
router.delete("/:id", async (req, res) => {
  const { id } = req.params;

  try {
    // Unlink orders from this customer (set customerId to null)
    // Orders retain all customer data (name, address, etc.), just lose the FK reference
    const orderCount = await prisma.order.count({
      where: { customerId: id }
    });

    if (orderCount > 0) {
      await prisma.order.updateMany({
        where: { customerId: id },
        data: { customerId: null as any }
      });
      console.log(`Unlinked ${orderCount} orders from customer ${id}`);
    }

    // Delete all addresses associated with this customer
    const addressCount = await prisma.address.count({
      where: { customerId: id }
    });

    if (addressCount > 0) {
      await prisma.address.deleteMany({
        where: { customerId: id }
      });
      console.log(`Deleted ${addressCount} addresses for customer ${id}`);
    }

    // Now safe to delete customer
    await prisma.customer.delete({ where: { id } });

    res.json({
      success: true,
      ordersUnlinked: orderCount,
      addressesDeleted: addressCount
    });
  } catch (err) {
    console.error("Failed to delete customer:", err);
    res.status(500).json({ error: "Failed to delete customer" });
  }
});

// GET /api/customers/:id/recipients - Returns Customer[] (not Address[])
router.get("/:id/recipients", async (req, res) => {
  const { id } = req.params;
  const paginated = req.query.paginated === 'true';
  const page = Math.max(parseInt(req.query.page?.toString() ?? '0', 10) || 0, 0);
  const pageSizeRaw = parseInt(req.query.pageSize?.toString() ?? '25', 10);
  const pageSize = Math.min(Math.max(pageSizeRaw || 25, 1), 100);

  try {
    if (paginated) {
      const total = await prisma.customerRecipient.count({
        where: { senderId: id },
      });

      const recipientLinks = await prisma.customerRecipient.findMany({
        where: { senderId: id },
        include: {
          recipient: {
            include: {
              homeAddress: true,
              addresses: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip: page * pageSize,
        take: pageSize,
      });

      const recipients = recipientLinks.map((link) => link.recipient);

      return res.json({
        items: recipients,
        total,
        page,
        pageSize,
      });
    }

    const recipientLinks = await prisma.customerRecipient.findMany({
      where: { senderId: id },
      include: {
        recipient: {
          include: {
            homeAddress: true,
            addresses: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const recipients = recipientLinks.map((link) => link.recipient);
    res.json(recipients);
  } catch (err) {
    console.error("Failed to fetch saved recipients:", (err as any)?.message || err);
    res.status(500).json({ error: "Failed to fetch saved recipients" });
  }
});

// POST /api/customers/:id/save-recipient - Link customer as recipient
router.post("/:id/save-recipient", async (req, res) => {
  const { id } = req.params;
  const { recipientCustomerId } = req.body;

  if (!recipientCustomerId) {
    return res.status(400).json({ error: "recipientCustomerId is required" });
  }

  try {
    // Check if both customers exist
    const [sender, recipient] = await Promise.all([
      prisma.customer.findUnique({ where: { id } }),
      prisma.customer.findUnique({ where: { id: recipientCustomerId } }),
    ]);

    if (!sender) {
      return res.status(404).json({ error: "Sender customer not found" });
    }

    if (!recipient) {
      return res.status(404).json({ error: "Recipient customer not found" });
    }

    // Check if link already exists
    const existingLink = await prisma.customerRecipient.findUnique({
      where: {
        senderId_recipientId: {
          senderId: id,
          recipientId: recipientCustomerId,
        },
      },
    });

    if (existingLink) {
      return res.json({ message: "Recipient already saved", link: existingLink });
    }

    // Create the link
    const link = await prisma.customerRecipient.create({
      data: {
        senderId: id,
        recipientId: recipientCustomerId,
      },
      include: {
        recipient: {
          include: {
            homeAddress: true,
            addresses: true,
          },
        },
      },
    });

    res.status(201).json(link);
  } catch (err) {
    console.error("Failed to save recipient:", (err as any)?.message || err);
    res.status(500).json({ error: "Failed to save recipient" });
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

    res.json(updatedRecipient);
  } catch (err) {
    console.error("Failed to update recipient:", (err as any)?.message || err);
    res.status(500).json({ error: "Failed to update recipient" });
  }
});

// DELETE /api/customers/:customerId/recipients/:recipientId
router.delete("/:customerId/recipients/:recipientId", async (req, res) => {
  const { customerId, recipientId } = req.params;

  try {
    await prisma.customerRecipient.delete({
      where: {
        senderId_recipientId: {
          senderId: customerId,
          recipientId,
        },
      },
    });

    res.status(204).end();
  } catch (err) {
    console.error("Failed to delete recipient:", (err as any)?.message || err);
    res.status(500).json({ error: "Failed to delete recipient" });
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
      data.country = "CA";
    }

    // Auto-populate firstName/lastName from customer if not provided
    if (!data.firstName || !data.lastName) {
      const customer = await prisma.customer.findUnique({
        where: { id },
        select: { firstName: true, lastName: true },
      });

      if (customer) {
        data.firstName = data.firstName || customer.firstName;
        data.lastName = data.lastName || customer.lastName;
      }
    }

    // Ensure label field is included
    if (!data.label) {
      data.label = "Address"; // Default label
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

// GET /api/customers/:id/orders - get all orders (as buyer OR recipient)
router.get("/:id/orders", async (req, res) => {
  const { id } = req.params;

  try {
    // Fetch orders where customer is EITHER the buyer OR the recipient
    const orders = await prisma.order.findMany({
      where: {
        OR: [
          { customerId: id },           // Orders purchased by this customer
          { recipientCustomerId: id }   // Orders received by this customer
        ]
      },
      include: {
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true
          }
        },
        recipientCustomer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true
          }
        },
        orderItems: {
          select: {
            id: true,
            customName: true,
            unitPrice: true,
            quantity: true,
            rowTotal: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json({
      success: true,
      orders
    });
  } catch (err) {
    console.error("Failed to fetch customer orders:", err);
    res.status(500).json({ error: "Failed to load customer orders" });
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
