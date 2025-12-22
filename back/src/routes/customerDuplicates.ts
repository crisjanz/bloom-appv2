import { Router } from 'express';
import prisma from '../lib/prisma';

const router = Router();

// Simple Levenshtein distance for fuzzy string matching
function levenshteinDistance(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();

  const matrix: number[][] = [];

  for (let i = 0; i <= s2.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= s1.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= s2.length; i++) {
    for (let j = 1; j <= s1.length; j++) {
      if (s2.charAt(i - 1) === s1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[s2.length][s1.length];
}

// Calculate similarity ratio (0-1, where 1 is identical)
function similarityRatio(str1: string, str2: string): number {
  if (!str1 || !str2) return 0;

  const distance = levenshteinDistance(str1, str2);
  const maxLength = Math.max(str1.length, str2.length);

  if (maxLength === 0) return 1;

  return 1 - distance / maxLength;
}

// Normalize phone number for comparison
function normalizePhone(phone: string | null): string {
  if (!phone) return '';
  return phone.replace(/\D/g, '');
}

// Normalize email for comparison
function normalizeEmail(email: string | null): string {
  if (!email) return '';
  return email.toLowerCase().trim();
}

interface CustomerWithOrderCount {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  notes: string | null;
  createdAt: Date;
  _count: {
    ordersAsBuyer: number;
  };
}

interface DuplicateGroup {
  id: string;
  confidence: number;
  matchType: string;
  customers: Array<{
    id: string;
    firstName: string;
    lastName: string;
    email: string | null;
    phone: string | null;
    orderCount: number;
    createdAt: string;
  }>;
  suggestedTarget: string;
  reason: string;
}

// GET /api/customers/find-duplicates
router.get('/find-duplicates', async (req, res) => {
  try {
    const threshold = parseInt(req.query.threshold as string) || 60;

    // Fetch all customers with order counts
    const customers = await prisma.customer.findMany({
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        notes: true,
        createdAt: true,
        _count: {
          select: {
            ordersAsBuyer: true,
          },
        },
      },
    });

    const duplicateGroups: DuplicateGroup[] = [];
    const processedIds = new Set<string>();

    // Find duplicate groups
    for (let i = 0; i < customers.length; i++) {
      if (processedIds.has(customers[i].id)) continue;

      const customer = customers[i];
      const group: CustomerWithOrderCount[] = [customer];
      let highestConfidence = 0;
      let matchType = '';
      let reason = '';
      let hasExactMatch = false; // Track if group has exact email/phone matches

      // Compare with remaining customers
      for (let j = i + 1; j < customers.length; j++) {
        if (processedIds.has(customers[j].id)) continue;

        const other = customers[j];
        let confidence = 0;
        let currentMatchType = '';
        let currentReason = '';
        let isExactMatch = false;

        // 1. Exact email match (100% confidence)
        if (
          customer.email &&
          other.email &&
          normalizeEmail(customer.email) === normalizeEmail(other.email)
        ) {
          confidence = 100;
          currentMatchType = 'exact_email';
          currentReason = `Exact email match: ${customer.email}`;
          isExactMatch = true;
        }
        // 2. Exact phone match (100% confidence)
        else if (
          customer.phone &&
          other.phone &&
          normalizePhone(customer.phone) === normalizePhone(other.phone) &&
          normalizePhone(customer.phone).length >= 10
        ) {
          confidence = 100;
          currentMatchType = 'exact_phone';
          currentReason = `Exact phone match: ${customer.phone}`;
          isExactMatch = true;
        }
        // 3. Exact name match (95% confidence)
        else if (
          customer.firstName.toLowerCase().trim() === other.firstName.toLowerCase().trim() &&
          customer.lastName.toLowerCase().trim() === other.lastName.toLowerCase().trim()
        ) {
          confidence = 95;
          currentMatchType = 'exact_name';
          currentReason = `Exact name match: ${customer.firstName} ${customer.lastName}`;
        }
        // 4. Similar name + same phone (90% confidence)
        else if (
          customer.phone &&
          other.phone &&
          normalizePhone(customer.phone) === normalizePhone(other.phone) &&
          normalizePhone(customer.phone).length >= 10
        ) {
          const fullName1 = `${customer.firstName} ${customer.lastName}`;
          const fullName2 = `${other.firstName} ${other.lastName}`;
          const nameSimilarity = similarityRatio(fullName1, fullName2);

          if (nameSimilarity >= 0.7) {
            confidence = 90;
            currentMatchType = 'similar_name_same_phone';
            currentReason = `Similar name (${Math.round(nameSimilarity * 100)}%) + same phone`;
          }
        }
        // 5. Very similar name (85% confidence if >90% similar)
        else {
          const fullName1 = `${customer.firstName} ${customer.lastName}`;
          const fullName2 = `${other.firstName} ${other.lastName}`;
          const nameSimilarity = similarityRatio(fullName1, fullName2);

          if (nameSimilarity >= 0.9) {
            confidence = 85;
            currentMatchType = 'very_similar_name';
            currentReason = `Very similar name (${Math.round(nameSimilarity * 100)}% match)`;
          } else if (nameSimilarity >= 0.8) {
            confidence = 75;
            currentMatchType = 'similar_name';
            currentReason = `Similar name (${Math.round(nameSimilarity * 100)}% match)`;
          } else if (nameSimilarity >= 0.7) {
            confidence = 65;
            currentMatchType = 'somewhat_similar_name';
            currentReason = `Somewhat similar name (${Math.round(nameSimilarity * 100)}% match)`;
          }
        }

        // Add to group if above threshold
        // Don't mix exact matches (email/phone) with name-only matches
        if (confidence >= threshold) {
          const shouldAdd = !hasExactMatch || isExactMatch;

          if (shouldAdd) {
            group.push(other);
            processedIds.add(other.id);

            if (isExactMatch) {
              hasExactMatch = true;
            }

            if (confidence > highestConfidence) {
              highestConfidence = confidence;
              matchType = currentMatchType;
              reason = currentReason;
            }
          }
        }
      }

      // If we found duplicates for this customer
      if (group.length > 1) {
        processedIds.add(customer.id);

        // Sort by order count (descending) to suggest best merge target
        group.sort((a, b) => b._count.ordersAsBuyer - a._count.ordersAsBuyer);

        duplicateGroups.push({
          id: `group-${duplicateGroups.length + 1}`,
          confidence: highestConfidence,
          matchType,
          customers: group.map((c) => ({
            id: c.id,
            firstName: c.firstName,
            lastName: c.lastName,
            email: c.email,
            phone: c.phone,
            orderCount: c._count.ordersAsBuyer,
            createdAt: c.createdAt.toISOString(),
          })),
          suggestedTarget: group[0].id, // Customer with most orders
          reason,
        });
      }
    }

    // Sort groups by confidence (descending)
    duplicateGroups.sort((a, b) => b.confidence - a.confidence);

    // Calculate statistics
    const highConfidence = duplicateGroups.filter((g) => g.confidence >= 90).length;
    const mediumConfidence = duplicateGroups.filter(
      (g) => g.confidence >= 70 && g.confidence < 90
    ).length;
    const lowConfidence = duplicateGroups.filter((g) => g.confidence < 70).length;

    res.json({
      duplicateGroups,
      totalDuplicates: duplicateGroups.length,
      highConfidence,
      mediumConfidence,
      lowConfidence,
      threshold,
    });
  } catch (error) {
    console.error('Failed to find duplicate customers:', error);
    res.status(500).json({ error: 'Failed to find duplicate customers' });
  }
});

export default router;
