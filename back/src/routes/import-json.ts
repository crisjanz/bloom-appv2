import { Router, Request, Response } from 'express';
import multer from 'multer';
import prisma from '../lib/prisma';

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
  fileFilter: (_req, file, cb) => {
    const isJson =
      file.mimetype === 'application/json' ||
      file.originalname.toLowerCase().endsWith('.json');

    if (!isJson) {
      return cb(new Error('Only JSON files are allowed'));
    }

    cb(null, true);
  },
});

type FloranextCustomer = {
  entity_id: string;
  name?: string;
  billing_firstname?: string;
  billing_lastname?: string;
  email?: string;
  billing_telephone?: string;
  [key: string]: any;
};

type FloranextRecipient = {
  entity_id: string;
  firstname: string;
  lastname: string;
  company?: string;
  street?: string;
  city?: string;
  region?: string;
  postcode?: string;
  country_id?: string;
  telephone?: string;
  [key: string]: any;
};

type ImportResult = {
  success: boolean;
  totalCustomers: number;
  totalRecipients: number;
  createdCustomers: number;
  createdRecipients: number;
  skippedCustomers: number;
  skippedRecipients: number;
  errors: Array<{
    customerId: string;
    error: string;
  }>;
};

const normalizeCountry = (rawValue: string | undefined): string => {
  if (!rawValue) return 'CA';
  const value = rawValue.trim();
  if (!value) return 'CA';

  const lower = value.toLowerCase();
  if (lower === 'canada' || lower === 'ca') return 'CA';
  if (lower === 'united states' || lower === 'usa' || lower === 'us') return 'US';

  return value.length >= 2 ? value.slice(0, 2).toUpperCase() : 'CA';
};

const normalizePhone = (rawValue: string | undefined): string | null => {
  if (!rawValue) return null;
  const digits = rawValue.replace(/\D/g, '');
  if (!digits || /^0+$/.test(digits)) return null;
  return digits;
};

const clean = (value: string | undefined | null): string => value?.trim() ?? '';

router.post('/floranext-complete', (req: Request, res: Response) => {
  upload.single('file')(req, res, async (uploadError: any) => {
    if (uploadError) {
      console.error('Upload error:', uploadError);
      return res.status(400).json({
        success: false,
        error: 'Invalid file. Only JSON files up to 50MB are allowed.',
      });
    }

    try {
      if (!req.file || !req.file.buffer) {
        return res.status(400).json({
          success: false,
          error: 'JSON file is required.',
        });
      }

      const jsonContent = req.file.buffer.toString('utf-8');
      let exportData: any;

      try {
        exportData = JSON.parse(jsonContent);
      } catch (parseError) {
        console.error('JSON parse error:', parseError);
        return res.status(400).json({
          success: false,
          error: 'Invalid JSON file format.',
        });
      }

      const customers = exportData.customers || [];

      if (customers.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'No customers found in export file.',
        });
      }

      const result: ImportResult = {
        success: true,
        totalCustomers: customers.length,
        totalRecipients: 0,
        createdCustomers: 0,
        createdRecipients: 0,
        skippedCustomers: 0,
        skippedRecipients: 0,
        errors: [],
      };

      // Track existing customers by FloraNext ID to avoid duplicates
      const existingCustomers = await prisma.customer.findMany({
        where: {
          notes: {
            contains: 'FloraNext ID:',
          },
        },
        select: { id: true, notes: true },
      });

      const existingFloranextIds = new Set(
        existingCustomers
          .map((c) => {
            const match = c.notes?.match(/FloraNext ID: (\d+)/);
            return match ? match[1] : null;
          })
          .filter((id): id is string => id !== null),
      );

      // Process each customer with their recipients
      for (const item of customers) {
        const customer: FloranextCustomer = item.customer || {};
        const recipients: FloranextRecipient[] = item.recipients || [];

        const floranextCustomerId = customer.entity_id?.toString();
        if (!floranextCustomerId) {
          result.skippedCustomers++;
          continue;
        }

        result.totalRecipients += recipients.length;

        // Skip if already imported
        if (existingFloranextIds.has(floranextCustomerId)) {
          result.skippedCustomers++;
          result.skippedRecipients += recipients.length;
          continue;
        }

        try {
          await prisma.$transaction(async (tx) => {
            // Create or find sender customer
            const firstName = clean(customer.billing_firstname || customer.name?.split(' ')[0] || 'Customer');
            const lastName = clean(customer.billing_lastname || customer.name?.split(' ').slice(1).join(' ') || floranextCustomerId);
            const email = clean(customer.email);
            const phone = normalizePhone(customer.billing_telephone);

            // Check if customer already exists by email
            let senderCustomer = email ? await tx.customer.findUnique({
              where: { email },
            }) : null;

            if (senderCustomer) {
              // Customer exists - update their notes to track this FloraNext ID
              const existingNotes = senderCustomer.notes || '';
              const hasThisFloranextId = existingNotes.includes(`FloraNext ID: ${floranextCustomerId}`);

              if (!hasThisFloranextId) {
                await tx.customer.update({
                  where: { id: senderCustomer.id },
                  data: {
                    notes: existingNotes
                      ? `${existingNotes}\nFloraNext ID: ${floranextCustomerId}`
                      : `Imported from FloraNext. FloraNext ID: ${floranextCustomerId}`,
                  },
                });
              }
            } else {
              // Create new customer
              senderCustomer = await tx.customer.create({
                data: {
                  firstName,
                  lastName,
                  email: email || null,
                  phone: phone || null,
                  notes: `Imported from FloraNext. FloraNext ID: ${floranextCustomerId}`,
                },
              });
              result.createdCustomers++;
            }

            // Create each recipient
            for (const recipient of recipients) {
              const recipientFirstName = clean(recipient.firstname);
              const recipientLastName = clean(recipient.lastname);

              if (!recipientFirstName || !recipientLastName) {
                result.skippedRecipients++;
                continue;
              }

              const address1 = clean(recipient.street);
              const city = clean(recipient.city);
              const province = clean(recipient.region);
              const postalCode = clean(recipient.postcode);
              const country = normalizeCountry(recipient.country_id);
              const recipientPhone = normalizePhone(recipient.telephone);
              const company = clean(recipient.company);

              if (!address1 || !city || !province || !postalCode) {
                result.skippedRecipients++;
                continue;
              }

              // Check if recipient already exists by first name + last name
              let recipientCustomer = await tx.customer.findFirst({
                where: {
                  firstName: recipientFirstName,
                  lastName: recipientLastName,
                },
              });

              if (recipientCustomer) {
                // Recipient exists - check if relationship already exists
                const existingRelationship = await tx.customerRecipient.findFirst({
                  where: {
                    senderId: senderCustomer.id,
                    recipientId: recipientCustomer.id,
                  },
                });

                if (existingRelationship) {
                  // Already linked, skip
                  result.skippedRecipients++;
                  continue;
                }

                // Link existing recipient to this sender
                await tx.customerRecipient.create({
                  data: {
                    senderId: senderCustomer.id,
                    recipientId: recipientCustomer.id,
                  },
                });

                result.skippedRecipients++;
              } else {
                // Create new recipient as a customer
                recipientCustomer = await tx.customer.create({
                  data: {
                    firstName: recipientFirstName,
                    lastName: recipientLastName,
                    phone: recipientPhone || null,
                    notes: `Imported from FloraNext. Recipient of customer ${floranextCustomerId}`,
                  },
                });

                // Create recipient's address
                const address = await tx.address.create({
                  data: {
                    firstName: recipientFirstName,
                    lastName: recipientLastName,
                    address1,
                    address2: null,
                    city,
                    province,
                    postalCode,
                    country,
                    phone: recipientPhone || null,
                    company: company || null,
                    label: 'Imported',
                    customerId: recipientCustomer.id,
                  },
                });

                // Set as home address
                await tx.customer.update({
                  where: { id: recipientCustomer.id },
                  data: { homeAddressId: address.id },
                });

                // Link recipient to sender
                await tx.customerRecipient.create({
                  data: {
                    senderId: senderCustomer.id,
                    recipientId: recipientCustomer.id,
                  },
                });

                result.createdRecipients++;
              }
            }
          });
        } catch (error: any) {
          console.error(`Error importing customer ${floranextCustomerId}:`, error);
          result.errors.push({
            customerId: floranextCustomerId,
            error: error.message || 'Unknown error',
          });
          result.skippedCustomers++;
        }
      }

      return res.status(200).json(result);
    } catch (error: any) {
      console.error('Import error:', error);
      return res.status(500).json({
        success: false,
        error: 'Server error during import.',
      });
    }
  });
});

export default router;
