import express from 'express';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/settings/faqs - List all FAQs ordered by position
router.get('/', async (req, res) => {
  try {
    const faqs = await prisma.fAQ.findMany({
      orderBy: {
        position: 'asc',
      },
    });

    res.json({ success: true, data: faqs });
  } catch (error) {
    console.error('Error fetching FAQs:', error);
    res.status(500).json({ success: false, error: 'Could not fetch FAQs' });
  }
});

// POST /api/settings/faqs - Create new FAQ
router.post('/', async (req, res) => {
  const { question, answer, isActive } = req.body;

  // Validation
  if (!question || !answer) {
    return res.status(400).json({
      success: false,
      error: 'Question and answer are required',
    });
  }

  try {
    // Get the next available position
    const lastFaq = await prisma.fAQ.findFirst({
      orderBy: {
        position: 'desc',
      },
    });

    const nextPosition = lastFaq ? lastFaq.position + 1 : 1;

    const newFaq = await prisma.fAQ.create({
      data: {
        question,
        answer,
        position: nextPosition,
        isActive: isActive !== undefined ? isActive : true,
      },
    });

    res.json({ success: true, data: newFaq });
  } catch (error) {
    console.error('Error creating FAQ:', error);
    res.status(500).json({ success: false, error: 'Could not create FAQ' });
  }
});

// PUT /api/settings/faqs/:id - Update FAQ
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { question, answer, isActive } = req.body;

  // Build update data object with only provided fields
  const updateData: {
    question?: string;
    answer?: string;
    isActive?: boolean;
  } = {};

  if (question !== undefined) updateData.question = question;
  if (answer !== undefined) updateData.answer = answer;
  if (isActive !== undefined) updateData.isActive = isActive;

  try {
    const updatedFaq = await prisma.fAQ.update({
      where: { id },
      data: updateData,
    });

    res.json({ success: true, data: updatedFaq });
  } catch (error) {
    console.error('Error updating FAQ:', error);
    res.status(500).json({ success: false, error: 'Could not update FAQ' });
  }
});

// DELETE /api/settings/faqs/:id - Delete FAQ and compact positions
router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    // Get the FAQ to be deleted
    const faqToDelete = await prisma.fAQ.findUnique({
      where: { id },
    });

    if (!faqToDelete) {
      return res.status(404).json({ success: false, error: 'FAQ not found' });
    }

    // Delete the FAQ
    await prisma.fAQ.delete({
      where: { id },
    });

    // Compact positions - decrement all FAQs with position > deleted position
    await prisma.$executeRaw`
      UPDATE "FAQ"
      SET position = position - 1
      WHERE position > ${faqToDelete.position}
    `;

    res.json({ success: true, message: 'FAQ deleted successfully' });
  } catch (error) {
    console.error('Error deleting FAQ:', error);
    res.status(500).json({ success: false, error: 'Could not delete FAQ' });
  }
});

// POST /api/settings/faqs/reorder - Reorder FAQs
router.post('/reorder', async (req, res) => {
  const { faqIds } = req.body;

  // Validation
  if (!Array.isArray(faqIds) || faqIds.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'faqIds must be a non-empty array',
    });
  }

  try {
    // Update positions in a transaction
    await prisma.$transaction(
      faqIds.map((faqId, index) =>
        prisma.fAQ.update({
          where: { id: faqId },
          data: { position: index + 1 },
        })
      )
    );

    const reorderedFaqs = await prisma.fAQ.findMany({
      orderBy: {
        position: 'asc',
      },
    });

    res.json({ success: true, data: reorderedFaqs });
  } catch (error) {
    console.error('Error reordering FAQs:', error);
    res.status(500).json({ success: false, error: 'Could not reorder FAQs' });
  }
});

export default router;
