import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const CARD_CHARS = 'ABCDEFGHIJKLMNPQRSTUVWXYZ23456789'; // Exclude confusing chars
const SEGMENT_COUNT = 3;
const SEGMENT_LENGTH = 4;
const MAX_ATTEMPTS = 100;

const buildCardNumber = (prefix: 'GC' | 'EGC') => {
  const segments: string[] = [];

  for (let i = 0; i < SEGMENT_COUNT; i += 1) {
    let segment = '';
    for (let j = 0; j < SEGMENT_LENGTH; j += 1) {
      segment += CARD_CHARS.charAt(Math.floor(Math.random() * CARD_CHARS.length));
    }
    segments.push(segment);
  }

  return `${prefix}-${segments.join('-')}`;
};

const ensureUniqueNumber = async (prefix: 'GC' | 'EGC') => {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    const cardNumber = buildCardNumber(prefix);
    const existing = await prisma.giftCard.findUnique({
      where: { cardNumber },
      select: { id: true },
    });
    if (!existing) {
      return cardNumber;
    }
  }

  throw new Error('Unable to generate unique gift card number');
};

const generateBatchNumbers = async (prefix: 'GC' | 'EGC', quantity: number) => {
  const cardNumbers = new Set<string>();

  while (cardNumbers.size < quantity) {
    const cardNumber = await ensureUniqueNumber(prefix);
    cardNumbers.add(cardNumber);
  }

  return Array.from(cardNumbers);
};

export const giftCardService = {
  generatePhysicalNumber: () => ensureUniqueNumber('GC'),
  generateElectronicNumber: () => ensureUniqueNumber('EGC'),
  generateBatchNumbers,
};
