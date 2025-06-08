import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET /api/settings/holidays
export const getHolidays = async (req: Request, res: Response) => {
  try {
    const holidays = await prisma.holiday.findMany({
      orderBy: {
        startDate: 'asc'
      }
    });
    
    res.json({
      holidays: holidays || []
    });
  } catch (error) {
    console.error('Failed to fetch holidays:', error);
    res.status(500).json({ error: 'Failed to fetch holidays' });
  }
};

// POST /api/settings/holidays - Create new holiday
export const createHoliday = async (req: Request, res: Response) => {
  try {
    const data = req.body;
    
    // Validate required fields
    if (!data.name || !data.startDate || !data.endDate) {
      return res.status(400).json({ error: 'Name, start date, and end date are required' });
    }

    // Validate date range
    if (data.startDate > data.endDate) {
      return res.status(400).json({ error: 'Start date cannot be after end date' });
    }

    // If isOpen is true, require special hours
    if (data.isOpen && (!data.openTime || !data.closeTime)) {
      return res.status(400).json({ error: 'Open and close times are required when holiday is open' });
    }

    const holiday = await prisma.holiday.create({
      data: {
        name: data.name,
        startDate: data.startDate,
        endDate: data.endDate,
        isOpen: data.isOpen || false,
        openTime: data.isOpen ? data.openTime : null,
        closeTime: data.isOpen ? data.closeTime : null,
        color: data.color || 'red',
        notes: data.notes || null,
      }
    });
    
    res.status(201).json(holiday);
  } catch (error) {
    console.error('Failed to create holiday:', error);
    res.status(500).json({ error: 'Failed to create holiday' });
  }
};

// PUT /api/settings/holidays/:id - Update existing holiday
export const updateHoliday = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const data = req.body;
    
    // Check if holiday exists
    const existingHoliday = await prisma.holiday.findUnique({
      where: { id }
    });

    if (!existingHoliday) {
      return res.status(404).json({ error: 'Holiday not found' });
    }

    // Validate required fields
    if (!data.name || !data.startDate || !data.endDate) {
      return res.status(400).json({ error: 'Name, start date, and end date are required' });
    }

    // Validate date range
    if (data.startDate > data.endDate) {
      return res.status(400).json({ error: 'Start date cannot be after end date' });
    }

    // If isOpen is true, require special hours
    if (data.isOpen && (!data.openTime || !data.closeTime)) {
      return res.status(400).json({ error: 'Open and close times are required when holiday is open' });
    }

    const holiday = await prisma.holiday.update({
      where: { id },
      data: {
        name: data.name,
        startDate: data.startDate,
        endDate: data.endDate,
        isOpen: data.isOpen || false,
        openTime: data.isOpen ? data.openTime : null,
        closeTime: data.isOpen ? data.closeTime : null,
        color: data.color || 'red',
        notes: data.notes || null,
      }
    });
    
    res.json(holiday);
  } catch (error) {
    console.error('Failed to update holiday:', error);
    res.status(500).json({ error: 'Failed to update holiday' });
  }
};

// DELETE /api/settings/holidays/:id - Delete holiday
export const deleteHoliday = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Check if holiday exists
    const existingHoliday = await prisma.holiday.findUnique({
      where: { id }
    });

    if (!existingHoliday) {
      return res.status(404).json({ error: 'Holiday not found' });
    }

    await prisma.holiday.delete({
      where: { id }
    });
    
    res.json({ message: 'Holiday deleted successfully' });
  } catch (error) {
    console.error('Failed to delete holiday:', error);
    res.status(500).json({ error: 'Failed to delete holiday' });
  }
};

// GET /api/settings/holidays/upcoming - Get upcoming holidays (next 3 months)
export const getUpcomingHolidays = async (req: Request, res: Response) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const threeMonthsFromNow = new Date();
    threeMonthsFromNow.setMonth(threeMonthsFromNow.getMonth() + 3);
    const futureDate = threeMonthsFromNow.toISOString().split('T')[0];

    const holidays = await prisma.holiday.findMany({
      where: {
        startDate: {
          gte: today,
          lte: futureDate
        }
      },
      orderBy: {
        startDate: 'asc'
      },
      take: 10 // Limit to next 10 holidays
    });
    
    res.json({
      holidays: holidays || []
    });
  } catch (error) {
    console.error('Failed to fetch upcoming holidays:', error);
    res.status(500).json({ error: 'Failed to fetch upcoming holidays' });
  }
};

// GET /api/settings/holidays/active/:date - Check if date has active holiday
export const getActiveHoliday = async (req: Request, res: Response) => {
  try {
    const { date } = req.params;
    
    const holiday = await prisma.holiday.findFirst({
      where: {
        startDate: {
          lte: date
        },
        endDate: {
          gte: date
        }
      }
    });
    
    if (holiday) {
      res.json({ holiday });
    } else {
      res.json({ holiday: null });
    }
  } catch (error) {
    console.error('Failed to check active holiday:', error);
    res.status(500).json({ error: 'Failed to check active holiday' });
  }
};