import { Router } from 'express';
import { OrderImageCategory } from '@prisma/client';
import { z } from 'zod';
import prisma from '../../lib/prisma';

const router = Router();

const orderParamsSchema = z.object({
  orderId: z.string().min(1)
});

const listQuerySchema = z.object({
  category: z.nativeEnum(OrderImageCategory).optional()
});

const optionalTagSchema = z
  .preprocess(
    (value) => (typeof value === 'string' ? value.trim() : value),
    z.string().min(1).max(80)
  )
  .optional()
  .nullable();

const optionalNoteSchema = z
  .preprocess(
    (value) => (typeof value === 'string' ? value.trim() : value),
    z.string().min(1).max(500)
  )
  .optional()
  .nullable();

const createImageSchema = z.object({
  category: z.nativeEnum(OrderImageCategory),
  url: z.string().url(),
  tag: optionalTagSchema,
  note: optionalNoteSchema
});

const createImagesSchema = z.object({
  images: z
    .array(
      z.object({
        category: z.nativeEnum(OrderImageCategory),
        url: z.string().url(),
        tag: optionalTagSchema,
        note: optionalNoteSchema
      })
    )
    .min(1)
    .max(25)
});

const deleteParamsSchema = z.object({
  orderId: z.string().min(1),
  imageId: z.string().min(1)
});

const ensureOrderExists = async (orderId: string) => {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { id: true }
  });

  return Boolean(order);
};

router.get('/:orderId/images', async (req, res) => {
  try {
    const { orderId } = orderParamsSchema.parse(req.params);
    const { category } = listQuerySchema.parse(req.query);

    const orderExists = await ensureOrderExists(orderId);
    if (!orderExists) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const images = await prisma.orderImage.findMany({
      where: {
        orderId,
        ...(category ? { category } : {})
      },
      orderBy: { createdAt: 'desc' }
    });

    return res.json({
      success: true,
      images
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Invalid request payload',
        details: error.errors
      });
    }

    console.error('Error loading order images:', error);
    return res.status(500).json({
      error: 'Failed to load order images',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

router.post('/:orderId/images', async (req, res) => {
  try {
    const { orderId } = orderParamsSchema.parse(req.params);
    const payload = createImageSchema.parse(req.body);

    const orderExists = await ensureOrderExists(orderId);
    if (!orderExists) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const image = await prisma.orderImage.upsert({
      where: {
        orderId_category_url: {
          orderId,
          category: payload.category,
          url: payload.url
        }
      },
      create: {
        orderId,
        category: payload.category,
        url: payload.url,
        tag: payload.tag ?? null,
        note: payload.note ?? null
      },
      update: {
        tag: payload.tag ?? null,
        note: payload.note ?? null
      }
    });

    return res.status(201).json({
      success: true,
      image
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Invalid request payload',
        details: error.errors
      });
    }

    console.error('Error saving order image:', error);
    return res.status(500).json({
      error: 'Failed to save order image',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

router.post('/:orderId/images/bulk', async (req, res) => {
  try {
    const { orderId } = orderParamsSchema.parse(req.params);
    const payload = createImagesSchema.parse(req.body);

    const orderExists = await ensureOrderExists(orderId);
    if (!orderExists) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const uniquePayload = Array.from(
      new Map(payload.images.map((image) => [`${image.category}::${image.url}`, image])).values()
    );

    const images = await prisma.$transaction(async (tx) => {
      const upserts = await Promise.all(
        uniquePayload.map((image) =>
          tx.orderImage.upsert({
            where: {
              orderId_category_url: {
                orderId,
                category: image.category,
                url: image.url
              }
            },
            create: {
              orderId,
              category: image.category,
              url: image.url,
              tag: image.tag ?? null,
              note: image.note ?? null
            },
            update: {
              tag: image.tag ?? null,
              note: image.note ?? null
            }
          })
        )
      );

      return upserts.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    });

    return res.status(201).json({
      success: true,
      images
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Invalid request payload',
        details: error.errors
      });
    }

    console.error('Error saving order images:', error);
    return res.status(500).json({
      error: 'Failed to save order images',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

router.delete('/:orderId/images/:imageId', async (req, res) => {
  try {
    const { orderId, imageId } = deleteParamsSchema.parse(req.params);

    const image = await prisma.orderImage.findFirst({
      where: {
        id: imageId,
        orderId
      }
    });

    if (!image) {
      return res.status(404).json({ error: 'Order image not found' });
    }

    const deletedImage = await prisma.orderImage.delete({
      where: { id: imageId }
    });

    return res.json({
      success: true,
      image: deletedImage
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Invalid request payload',
        details: error.errors
      });
    }

    console.error('Error deleting order image:', error);
    return res.status(500).json({
      error: 'Failed to delete order image',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
