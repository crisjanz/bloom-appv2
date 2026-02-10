import { Router } from 'express';
import multer from 'multer';
import { parse } from 'csv-parse/sync';
import prisma from '../lib/prisma';

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (_req, file, cb) => {
    const isCsv =
      file.mimetype === 'text/csv' ||
      file.mimetype === 'application/vnd.ms-excel' ||
      file.originalname.toLowerCase().endsWith('.csv');

    if (!isCsv) {
      return cb(new Error('Only CSV files are allowed'));
    }

    cb(null, true);
  },
});

const REQUIRED_COLUMNS = [
  'firstname',
  'lastname',
  'street',
  'city',
  'region',
  'postcode',
  'country',
  'telephone',
];

type FloranextRecord = {
  customer_id?: string;
  firstname?: string;
  lastname?: string;
  company?: string;
  street?: string;
  city?: string;
  region?: string;
  postcode?: string;
  country?: string;
  telephone?: string;
};

type ImportSummary = {
  success: boolean;
  total: number;
  created: number;
  errors: number;
  errorDetails: Array<{
    row: number;
    firstname: string | null;
    lastname: string | null;
    error: string;
  }>;
  customerId: string;
  createdCustomer: boolean;
  customerName: string;
};

const cuidPattern = /^c[0-9a-z]{24}$/i;

const normalizeCountry = (rawValue: string | undefined): string => {
  if (!rawValue) {
    return 'CA';
  }

  const value = rawValue.trim();

  if (!value) {
    return 'CA';
  }

  const lower = value.toLowerCase();

  if (lower === 'canada') {
    return 'CA';
  }

  if (lower === 'united states' || lower === 'usa' || lower === 'us') {
    return 'US';
  }

  if (value.length >= 2) {
    return value.slice(0, 2).toUpperCase();
  }

  return value.toUpperCase();
};

const normalizePhone = (rawValue: string | undefined): string | null => {
  if (!rawValue) {
    return null;
  }

  const digits = rawValue.replace(/\D/g, '');

  if (!digits || /^0+$/.test(digits)) {
    return null;
  }

  return digits;
};

const clean = (value: string | undefined | null): string => value?.trim() ?? '';

const buildRecipientDedupKey = (
  firstName: string,
  lastName: string,
  address1: string,
  postalCode: string,
): string => {
  return [firstName, lastName, address1, postalCode]
    .map((part) => part.trim().toLowerCase())
    .join('::');
};

const buildCustomerName = (firstName?: string | null, lastName?: string | null): string => {
  const composed = `${firstName ?? ''} ${lastName ?? ''}`.trim();
  if (composed) {
    return composed;
  }
  return firstName ?? lastName ?? 'Customer';
};

router.post('/floranext-recipients', (req, res) => {
  upload.single('file')(req, res, async (uploadError: any) => {
    if (uploadError) {
      console.error('Failed to process uploaded file:', uploadError);
      return res.status(400).json({
        success: false,
        error: 'Invalid file. Only CSV uploads up to 10MB are allowed.',
      });
    }

    try {
      const { customerId } = req.body as { customerId?: string };

      const trimmedCustomerId =
        typeof customerId === 'string' ? customerId.trim() : '';

      if (trimmedCustomerId && !cuidPattern.test(trimmedCustomerId)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid customerId format. Expected cuid (starts with "c").',
        });
      }

      if (!req.file || !req.file.buffer) {
        return res.status(400).json({
          success: false,
          error: 'CSV file is required.',
        });
      }

      const csvContent = req.file.buffer.toString('utf-8');

      let records: FloranextRecord[] = [];

      try {
        records = parse(csvContent, {
          bom: true,
          skip_empty_lines: true,
          trim: true,
          columns: (headerRow: string[]) => {
            const normalizedHeaders = headerRow.map((header) =>
              header.trim().toLowerCase(),
            );

            const missingColumns = REQUIRED_COLUMNS.filter(
              (column) => !normalizedHeaders.includes(column),
            );

            if (missingColumns.length > 0) {
              const error = new Error(
                `Invalid CSV headers. Missing: ${missingColumns.join(', ')}`,
              );
              (error as any).code = 'INVALID_HEADERS';
              throw error;
            }

            return normalizedHeaders;
          },
        });
      } catch (parseError: any) {
        console.error('Failed to parse Floranext CSV:', parseError);

        if (parseError?.code === 'INVALID_HEADERS') {
          return res.status(400).json({
            success: false,
            error: 'Invalid CSV headers. Ensure template matches Floranext export.',
          });
        }

        return res.status(400).json({
          success: false,
          error: 'Failed to parse CSV file.',
        });
      }

      if (records.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'CSV file is empty.',
        });
      }

      let customerIdToUse = trimmedCustomerId;
      let createdCustomer = false;

      let senderCustomer =
        customerIdToUse && customerIdToUse.length > 0
          ? await prisma.customer.findUnique({
              where: { id: customerIdToUse },
            })
          : null;

      if (customerIdToUse && !senderCustomer) {
        return res.status(404).json({
          success: false,
          error: 'Customer not found.',
        });
      }

      if (!senderCustomer) {
        const sourceCustomerId =
          records[0]?.customer_id?.toString().trim() ?? '';
        const suffix = sourceCustomerId
          ? `Customer ${sourceCustomerId}`
          : `Import ${new Date().toISOString().slice(0, 10)}`;
        const notes = sourceCustomerId
          ? `Imported from Floranext. Source customer_id ${sourceCustomerId}.`
          : 'Imported from Floranext CSV.';

        senderCustomer = await prisma.customer.create({
          data: {
            firstName: 'Floranext',
            lastName: suffix || 'Import',
            notes,
          },
        });

        customerIdToUse = senderCustomer.id;
        createdCustomer = true;
      }

      if (!senderCustomer) {
        return res.status(500).json({
          success: false,
          error: 'Failed to resolve customer for import.',
        });
      }

      const seenRecipients = new Set<string>();

      const summary: ImportSummary = {
        success: true,
        total: records.length,
        created: 0,
        errors: 0,
        errorDetails: [],
        customerId: customerIdToUse,
        createdCustomer,
        customerName: buildCustomerName(
          senderCustomer.firstName,
          senderCustomer.lastName,
        ),
      };

      for (let index = 0; index < records.length; index += 1) {
        const record = records[index];
        const rowNumber = index + 2; // CSV header is row 1

        const firstName = clean(record.firstname);
        const lastName = clean(record.lastname);
        const address1 = clean(record.street);
        const city = clean(record.city);
        const province = clean(record.region);
        const postalCode = clean(record.postcode);
        const country = normalizeCountry(record.country);
        const phone = normalizePhone(record.telephone);
        const company = clean(record.company);

        const dedupKey = buildRecipientDedupKey(
          firstName,
          lastName,
          address1,
          postalCode,
        );

        if (seenRecipients.has(dedupKey)) {
          summary.errors += 1;
          summary.errorDetails.push({
            row: rowNumber,
            firstname: firstName || null,
            lastname: lastName || null,
            error: 'Duplicate row detected in CSV. Skipped.',
          });
          summary.success = false;
          continue;
        }
        seenRecipients.add(dedupKey);

        const missingFields: string[] = [];

        if (!firstName) missingFields.push('firstname');
        if (!lastName) missingFields.push('lastname');
        if (!address1) missingFields.push('street');
        if (!city) missingFields.push('city');
        if (!province) missingFields.push('region');
        if (!postalCode) missingFields.push('postcode');

        if (missingFields.length > 0) {
          summary.errors += 1;
          summary.errorDetails.push({
            row: rowNumber,
            firstname: firstName || null,
            lastname: lastName || null,
            error: `Missing required field(s): ${missingFields.join(', ')}`,
          });
          summary.success = false;
          continue;
        }

        try {
          await prisma.$transaction(async (tx) => {
            const recipientCustomer = await tx.customer.create({
              data: {
                firstName,
                lastName,
                phone,
                notes: 'Imported from Floranext CSV',
              },
            });

            const address = await tx.address.create({
              data: {
                attention: `${firstName} ${lastName}`.trim(),
                address1,
                address2: null,
                city,
                province,
                postalCode,
                country,
                phone,
                company: company || null,
                addressType: 'RESIDENCE',
                customerId: recipientCustomer.id,
              },
            });

            await tx.customer.update({
              where: { id: recipientCustomer.id },
              data: {
                primaryAddressId: address.id,
              },
            });

            await tx.customerRecipient.create({
              data: {
                senderId: customerIdToUse,
                recipientId: recipientCustomer.id,
              },
            });
          });

          summary.created += 1;
        } catch (error: any) {
          console.error(`Failed to import recipient for row ${rowNumber}:`, error);
          summary.errors += 1;

          const isDuplicateLink =
            typeof error?.code === 'string' && error.code === 'P2002';

          summary.errorDetails.push({
            row: rowNumber,
            firstname: firstName || null,
            lastname: lastName || null,
            error: isDuplicateLink
              ? 'Recipient already linked to this customer.'
              : 'Database error creating recipient.',
          });
          summary.success = false;
        }
      }

      return res.status(200).json(summary);
    } catch (error) {
      console.error('Unexpected error during Floranext import:', error);
      return res.status(500).json({
        success: false,
        error: 'Server error during import.',
      });
    }
  });
});

export default router;
