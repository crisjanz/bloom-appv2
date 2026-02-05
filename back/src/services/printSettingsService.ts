import { PrismaClient, PrintJobType } from '@prisma/client';

const prisma = new PrismaClient();

export type PrintDestination = 'browser' | 'receipt-agent' | 'electron-agent';

export interface PrintSettingsUpdate {
  receiptsEnabled: boolean;
  receiptsDestination: PrintDestination;
  receiptsCopies: number;
  receiptsPrinterName?: string | null;
  receiptsPrinterTray?: number | null;
  ticketsEnabled: boolean;
  ticketsDestination: PrintDestination;
  ticketsPrinterName?: string | null;
  ticketsPrinterTray?: number | null;
  documentsEnabled: boolean;
  documentsDestination: PrintDestination;
  documentsPrinterName?: string | null;
  documentsPrinterTray?: number | null;
  labelsEnabled: boolean;
  labelsDestination: PrintDestination;
  labelsPrinterName?: string | null;
  labelsPrinterTray?: number | null;
}

export interface PrintTypeConfig {
  enabled: boolean;
  destination: PrintDestination;
  printerName?: string | null;
  printerTray?: number | null;
  copies: number;
}

const normalizePrinterName = (value: string | null | undefined) => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
};

const normalizeTray = (value: number | null | undefined) => {
  return value === undefined ? null : value;
};

const normalizeCopies = (value: number | null | undefined) => {
  if (!value || value < 1) return 1;
  return Math.min(Math.max(Math.round(value), 1), 3);
};

export class PrintSettingsService {
  async getSettings() {
    const existing = await prisma.printSettings.findFirst();
    if (existing) {
      return existing;
    }

    return prisma.printSettings.create({ data: {} });
  }

  async updateSettings(payload: PrintSettingsUpdate) {
    const settings = await this.getSettings();

    return prisma.printSettings.update({
      where: { id: settings.id },
      data: {
        receiptsEnabled: payload.receiptsEnabled,
        receiptsDestination: payload.receiptsDestination,
        receiptsCopies: normalizeCopies(payload.receiptsCopies),
        receiptsPrinterName: normalizePrinterName(payload.receiptsPrinterName),
        receiptsPrinterTray: normalizeTray(payload.receiptsPrinterTray),
        ticketsEnabled: payload.ticketsEnabled,
        ticketsDestination: payload.ticketsDestination,
        ticketsPrinterName: normalizePrinterName(payload.ticketsPrinterName),
        ticketsPrinterTray: normalizeTray(payload.ticketsPrinterTray),
        documentsEnabled: payload.documentsEnabled,
        documentsDestination: payload.documentsDestination,
        documentsPrinterName: normalizePrinterName(payload.documentsPrinterName),
        documentsPrinterTray: normalizeTray(payload.documentsPrinterTray),
        labelsEnabled: payload.labelsEnabled,
        labelsDestination: payload.labelsDestination,
        labelsPrinterName: normalizePrinterName(payload.labelsPrinterName),
        labelsPrinterTray: normalizeTray(payload.labelsPrinterTray),
      },
    });
  }

  async getConfigForType(type: PrintJobType): Promise<PrintTypeConfig> {
    const settings = await this.getSettings();

    switch (type) {
      case PrintJobType.RECEIPT:
        return {
          enabled: settings.receiptsEnabled,
          destination: settings.receiptsDestination as PrintDestination,
          printerName: settings.receiptsPrinterName,
          printerTray: settings.receiptsPrinterTray,
          copies: normalizeCopies(settings.receiptsCopies),
        };
      case PrintJobType.ORDER_TICKET:
        return {
          enabled: settings.ticketsEnabled,
          destination: settings.ticketsDestination as PrintDestination,
          printerName: settings.ticketsPrinterName,
          printerTray: settings.ticketsPrinterTray,
          copies: 1,
        };
      case PrintJobType.REPORT:
        return {
          enabled: settings.documentsEnabled,
          destination: settings.documentsDestination as PrintDestination,
          printerName: settings.documentsPrinterName,
          printerTray: settings.documentsPrinterTray,
          copies: 1,
        };
      case PrintJobType.LABEL:
        return {
          enabled: settings.labelsEnabled,
          destination: settings.labelsDestination as PrintDestination,
          printerName: settings.labelsPrinterName,
          printerTray: settings.labelsPrinterTray,
          copies: 1,
        };
      default:
        return {
          enabled: false,
          destination: 'browser',
          copies: 1,
        };
    }
  }
}

export const printSettingsService = new PrintSettingsService();
