import { GoogleGenerativeAI } from '@google/generative-ai';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export type ScanProvider = 'FTD' | 'DOORDASH';

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
  "cardMessage": "",
  "specialInstructions": ""
}`;

function normalizeProvider(provider?: string): ScanProvider {
  const normalized = (provider || 'FTD').toUpperCase();
  if (normalized === 'FTD' || normalized === 'DOORDASH') {
    return normalized as ScanProvider;
  }

  throw new Error(`Unsupported scan provider: ${provider}`);
}
