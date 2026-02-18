import { GoogleGenerativeAI } from '@google/generative-ai';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export type ScanProvider = 'FTD' | 'DOORDASH' | 'FLORANEXT';

// Floranext web order structure (your own website orders)
export interface FloranextOrderData {
  orderNumber: string;
  orderSource: 'FLORANEXT';
  orderDate: string;
  sender: {
    name: string;
    company?: string;
    address: string;
    city: string;
    province: string;
    postalCode: string;
    country: string;
    phone: string;
    email?: string;
  };
  recipient: {
    name: string;
    company?: string;
    address: string;
    city: string;
    province: string;
    postalCode: string;
    country: string;
    phone: string;
  };
  deliveryDate: string;
  deliveryType: string; // "Delivery" or "Pickup"
  deliveryInstructions?: string;
  cardMessage?: string;
  products: Array<{
    name: string;
    description?: string;
    productId?: string;
    option?: string;
    unitPrice: number;
    quantity: number;
  }>;
  subtotal: number;
  deliveryFee: number;
  gst: number;
  pst: number;
  taxTotal: number;
  grandTotal: number;
  paymentMethod: string;
  isPrepaid: boolean;
}

// Wire order structure (FTD, DoorDash)
export interface ParsedOrderData {
  orderNumber: string;
  orderSource: ScanProvider;
  orderPlacedDate?: string | null;
  deliveryDate?: string | null;
  deliveryTime?: string | null;
  sender?: {
    shopName: string;
    shopCode: string;
    phone: string;
  };
  recipient?: {
    firstName: string;
    lastName: string;
    phone: string;
  };
  address?: {
    address1: string;
    address2?: string;
    city: string;
    province: string;
    postalCode: string;
    country: string;
  };
  product?: {
    code: string;
    description: string;
    fullText: string; // Full product text from scan (code + description)
  };
  orderTotal?: number | null;
  taxTotal?: number | null;
  cardMessage?: string | null;
  itemsSummary?: string | null;
  specialInstructions?: string;
  occasion?: string;
}

/**
 * Parse order image using Google Gemini Vision
 */
export async function parseOrderImage(
  imageBuffer: Buffer,
  options: { provider?: string } = {}
): Promise<ParsedOrderData> {
  // Get Gemini API key from ShopProfile
  const shopProfile = await prisma.shopProfile.findFirst();

  if (!shopProfile?.googleGeminiApiKey) {
    throw new Error('Gemini API key not configured in ShopProfile. Please add it in settings.');
  }

  const provider = normalizeProvider(options.provider);
  const genAI = new GoogleGenerativeAI(shopProfile.googleGeminiApiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

  // Convert buffer to base64
  const base64Image = imageBuffer.toString('base64');

  const prompt = provider === 'DOORDASH' ? DOORDASH_PROMPT : FTD_PROMPT;

  try {
    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: base64Image,
          mimeType: 'image/jpeg', // Works for PNG, JPG, and PDF
        },
      },
    ]);

    const response = await result.response;
    const text = response.text();

    // Remove markdown code blocks if present
    const jsonText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    // Parse JSON response
    const parsed: ParsedOrderData = JSON.parse(jsonText);

    return {
      ...parsed,
      orderSource: provider,
    };
  } catch (error) {
    console.error('Gemini OCR Error:', error);
    throw new Error(`Failed to parse order image: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

const FTD_PROMPT = `You are parsing a printed FTD wire service order. Extract the following information into a structured JSON format.

IMPORTANT PARSING RULES:
1. SENDER INFO: Extract from "Sending Shop Code" (shop name + code) and "Sending Phone"
2. RECIPIENT NAME:
   - If "Deliver To" shows "The [Name] Family", set firstName="" and lastName="The [Name] Family"
   - If shows "First Last", parse normally
3. SPECIAL INSTRUCTIONS: Only include actual delivery instructions, NOT product descriptions
4. PRICING:
   - Extract ONLY the total order amount (orderTotal)
   - Do NOT extract product price or delivery fee separately

REQUIRED FIELDS:
- Order Number (e.g., "F7151V-9124")
- Order Source: always "FTD"
- Order Placed Date & Time (from "Day & Time" field, format: YYYY-MM-DD)
- Delivery Date (format: YYYY-MM-DD)
- Sender Shop Name (from "Sending Shop Code")
- Sender Shop Code (from "Sending Shop Code")
- Sender Phone (from "Sending Phone", digits only)
- Recipient Name (from "Deliver To")
- Recipient Phone (digits only)
- Delivery Address
- Product Code (e.g., "B35D")
- Product Description (ONLY the product name/description, no prices or instructions)
- Product Full Text (complete product text from scan including code, e.g., "B35D Sweet and Pretty Bouquet")
- Order Total (total amount in dollars, e.g., 95.00)
- Card Message (full text from card message section)

OPTIONAL FIELDS:
- Address Line 2 (apartment, suite, etc.)
- Special Instructions (delivery notes ONLY, exclude product info)
- Occasion

Return ONLY valid JSON in this exact format (no markdown, no explanation):
{
  "orderNumber": "F7151V-9124",
  "orderSource": "FTD",
  "orderPlacedDate": "2026-01-05",
  "deliveryDate": "2026-01-06",
  "sender": {
    "shopName": "Smith's Flowers",
    "shopCode": "12345",
    "phone": "2501234567"
  },
  "recipient": {
    "firstName": "",
    "lastName": "The Sims Family",
    "phone": "2505617079"
  },
  "address": {
    "address1": "137 Lyon st S",
    "address2": "",
    "city": "PRINCE GEORGE",
    "province": "BC",
    "postalCode": "V2M3K7",
    "country": "CA"
  },
  "product": {
    "code": "B35D",
    "description": "Sweet and Pretty Bouquet",
    "fullText": "B35D Sweet and Pretty Bouquet"
  },
  "orderTotal": 95.00,
  "cardMessage": "Dear John and Vivien...",
  "specialInstructions": "Leave at front door",
  "occasion": "Other"
}`;

const DOORDASH_PROMPT = `You are parsing a DoorDash pickup order (not delivery). Extract minimal tracking information into JSON.

IMPORTANT PARSING RULES:
1. PICKUP ONLY: No delivery address is needed.
2. CUSTOMER NAME: DoorDash may show shortened names (e.g., "Dave J."). If present, split into firstName/lastName and leave phone empty.
3. MESSAGE: If there is a card message, note, or special request for flowers, capture it as cardMessage.
4. ITEMS SUMMARY: Provide a short comma-separated list of items or a brief summary.

REQUIRED FIELDS:
- Order Number
- Order Source: always "DOORDASH"
- Items Summary

OPTIONAL FIELDS:
- Order Placed Date (format: YYYY-MM-DD)
- Pickup Date (use deliveryDate, format: YYYY-MM-DD)
- Pickup Time (use deliveryTime, e.g., "2:45 PM")
- Customer Name (recipient)
- Order Total (number) - if missing, use null
- Tax Total (number) - combined tax amount if shown (GST+PST or just "Tax"). If missing, use null
- Card Message
- Special Instructions

Return ONLY valid JSON in this exact format (no markdown, no explanation):
{
  "orderNumber": "123456",
  "orderSource": "DOORDASH",
  "orderPlacedDate": "2026-01-05",
  "deliveryDate": "2026-01-05",
  "deliveryTime": "2:45 PM",
  "recipient": {
    "firstName": "Dave",
    "lastName": "J.",
    "phone": ""
  },
  "itemsSummary": "2x Roses Bouquet, 1x Card",
  "orderTotal": null,
  "taxTotal": null,
  "cardMessage": "",
  "specialInstructions": ""
}`;

function normalizeProvider(provider?: string): ScanProvider {
  const normalized = (provider || 'FTD').toUpperCase();
  if (normalized === 'FTD' || normalized === 'DOORDASH' || normalized === 'FLORANEXT') {
    return normalized as ScanProvider;
  }

  throw new Error(`Unsupported scan provider: ${provider}`);
}

/**
 * Parse Floranext web order email/screenshot using Google Gemini Vision
 */
export async function parseFloranextOrder(
  imageBuffer: Buffer
): Promise<FloranextOrderData> {
  const shopProfile = await prisma.shopProfile.findFirst();

  if (!shopProfile?.googleGeminiApiKey) {
    throw new Error('Gemini API key not configured in ShopProfile. Please add it in settings.');
  }

  const genAI = new GoogleGenerativeAI(shopProfile.googleGeminiApiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

  const base64Image = imageBuffer.toString('base64');

  try {
    const result = await model.generateContent([
      FLORANEXT_PROMPT,
      {
        inlineData: {
          data: base64Image,
          mimeType: 'image/jpeg',
        },
      },
    ]);

    const response = await result.response;
    const text = response.text();

    const jsonText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed: FloranextOrderData = JSON.parse(jsonText);

    const normalizeCompanyAddress = <T extends { address: string; company?: string }>(contact: T): T => {
      if (!contact?.address) {
        return contact;
      }

      const addressText = contact.address.trim();
      const lines = addressText
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);

      if (lines.length < 2) {
        const segments = addressText
          .split(',')
          .map((segment) => segment.trim())
          .filter(Boolean);

        if (segments.length < 2) {
          return contact;
        }

        const [firstSegment, ...restSegments] = segments;
        const restAddress = restSegments.join(', ');

        if (!contact.company) {
          const firstHasNumber = /\d/.test(firstSegment);
          const restHasNumber = /\d/.test(restAddress);
          if (!firstHasNumber && restHasNumber) {
            return {
              ...contact,
              company: firstSegment,
              address: restAddress,
            } as T;
          }
        }

        return {
          ...contact,
          address: segments.join(', '),
        } as T;
      }

      const [firstLine, ...rest] = lines;
      const restAddress = rest.join(' ');

      if (!contact.company) {
        const firstHasNumber = /\d/.test(firstLine);
        const restHasNumber = /\d/.test(restAddress);
        if (!firstHasNumber && restHasNumber) {
          return {
            ...contact,
            company: firstLine,
            address: restAddress,
          } as T;
        }
      }

      return {
        ...contact,
        address: lines.join(' '),
      } as T;
    };

    const normalizedSender = normalizeCompanyAddress(parsed.sender);
    const normalizedRecipient = normalizeCompanyAddress(parsed.recipient);

    return {
      ...parsed,
      sender: normalizedSender,
      recipient: normalizedRecipient,
      orderSource: 'FLORANEXT',
      isPrepaid: true,
    };
  } catch (error) {
    console.error('Floranext OCR Error:', error);
    throw new Error(`Failed to parse Floranext order: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

const FLORANEXT_PROMPT = `You are parsing a Floranext web order confirmation email. Extract all order information into a structured JSON format.

IMPORTANT PARSING RULES:
1. PRICES: Extract as numbers without currency symbols (e.g., 120.00 not "CA$120.00")
2. PHONE NUMBERS: Extract digits only (e.g., "2508335000" not "250-833-5000")
3. DATES: Format as YYYY-MM-DD (e.g., "2026-01-29")
4. PROVINCE: Use 2-letter code (e.g., "BC" not "British Columbia")
5. ADDRESS: Parse city, province, postal code separately from street address
   - If a company is listed on its own line between name and street address, store it in company
   - Do NOT include the company in the street address
6. PRODUCTS: Extract each line item with name, option (if shown like "Deluxe"), and Product ID if present

REQUIRED FIELDS:
- Order Number (from subject or header). If no order number is visible, use "" (empty string)
- Order Date (when placed)
- Sender: name, address, city, province, postalCode, country, phone
- Recipient: name, address, city, province, postalCode, country, phone
- Delivery Date
- Delivery Type ("Delivery" or "Pickup")
- Products array with: name, description (if present), productId (if present), option (if present like "Deluxe"), unitPrice, quantity
- Subtotal, Delivery Fee, GST, PST, Tax Total, Grand Total
- Payment Method

OPTIONAL FIELDS:
- Sender company (line between name and address)
- Recipient company (line between name and address)
- Sender email
- Delivery Instructions
- Card Message

Return ONLY valid JSON in this exact format (no markdown, no explanation):
{
  "orderNumber": "WEB-99999",
  "orderSource": "FLORANEXT",
  "orderDate": "2026-01-26",
  "sender": {
    "name": "Leona Orchard",
    "company": "",
    "address": "5653 Tatlow Road",
    "city": "Salmon Arm",
    "province": "BC",
    "postalCode": "V1E2P8",
    "country": "CA",
    "phone": "2508335000",
    "email": "kolokayaks@telus.net"
  },
  "recipient": {
    "name": "Joann and Ron Kennedy",
    "company": "",
    "address": "1292 Eaglet Cres.",
    "city": "Prince George",
    "province": "BC",
    "postalCode": "V2M4H5",
    "country": "CA",
    "phone": "2505644680"
  },
  "deliveryDate": "2026-01-29",
  "deliveryType": "Delivery",
  "deliveryInstructions": "",
  "cardMessage": "Happy 60th. Enjoy your visit with your family.",
  "products": [
    {
      "name": "Sunny Day Bouquet",
      "description": "This vibrant spring bouquet combines sunny yellow lilies...",
      "productId": "IYV-sunnyday",
      "option": "Deluxe",
      "unitPrice": 120.00,
      "quantity": 1
    }
  ],
  "subtotal": 120.00,
  "deliveryFee": 10.00,
  "gst": 6.50,
  "pst": 8.40,
  "taxTotal": 14.90,
  "grandTotal": 144.90,
  "paymentMethod": "Credit Card",
  "isPrepaid": true
}`;
