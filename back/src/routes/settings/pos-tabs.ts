// back/routes/settings/pos-tabs.ts
import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface POSTab {
  id: string;
  name: string;
  productIds: string[];
  order: number;
}

// Get POS tab configuration
export const getPOSTabs = async (req: Request, res: Response) => {
  try {
    const settings = await prisma.pOSSettings.findFirst();

    if (!settings || !settings.tabs) {
      // Return default configuration
      const defaultTabs: POSTab[] = [
        { id: 'tab1', name: 'Tab 1', productIds: [], order: 1 },
        { id: 'tab2', name: 'Tab 2', productIds: [], order: 2 },
        { id: 'tab3', name: 'Tab 3', productIds: [], order: 3 },
        { id: 'tab4', name: 'Tab 4', productIds: [], order: 4 },
      ];
      
      return res.json({ success: true, tabs: defaultTabs, defaultTab: 'all' });
    }

    // Properly cast JSON to POSTab array
    const tabs = settings.tabs as unknown as POSTab[];
    res.json({ success: true, tabs, defaultTab: settings.defaultTab || 'all' });
  } catch (error) {
    console.error('Error fetching POS tabs:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch POS tab configuration' 
    });
  }
};

// Save POS tab configuration
export const savePOSTabs = async (req: Request, res: Response) => {
  try {
    const { tabs, defaultTab }: { tabs: POSTab[]; defaultTab?: string } = req.body;

    if (!tabs || !Array.isArray(tabs)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid tabs data'
      });
    }

    // Validate tab structure
    const validTabs = tabs.every(tab => 
      tab.id && 
      tab.name && 
      Array.isArray(tab.productIds) &&
      typeof tab.order === 'number'
    );

    if (!validTabs) {
      return res.status(400).json({
        success: false,
        error: 'Invalid tab structure'
      });
    }

    // Save or update the settings
    const settings = await prisma.pOSSettings.upsert({
      where: { id: 'pos-settings' }, // Use a fixed ID since we only need one record
      update: {
        tabs: tabs as unknown as any,
        defaultTab: defaultTab || 'all',
        updatedAt: new Date()
      },
      create: {
        id: 'pos-settings',
        tabs: tabs as unknown as any,
        defaultTab: defaultTab || 'all',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });

    res.json({ 
      success: true, 
      message: 'POS tab configuration saved successfully',
      tabs 
    });
  } catch (error) {
    console.error('Error saving POS tabs:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to save POS tab configuration' 
    });
  }
};