import { BrowserWindow } from 'electron';
import { logger } from './main';
import { PrintJob } from './connection/websocket';
import { generateOrderTicketHTML, parseOrderForTicket } from './templates/order-ticket-template';
import QRCode from 'qrcode';

/**
 * Process print jobs and send to printers
 */
export class JobProcessor {
  private recentJobs: Array<{ job: PrintJob; status: string; timestamp: Date; error?: string }> = [];
  private maxRecentJobs = 20;

  constructor() {
    logger.info('Job processor initialized');
  }

  /**
   * Process a print job
   */
  async processJob(job: PrintJob, thermalPrinter: string, laserPrinter: string): Promise<void> {
    logger.info(`Processing print job: ${job.id} (Type: ${job.type})`);

    try {
      if (job.agentType && job.agentType !== 'electron-agent') {
        logger.info(`Skipping job ${job.id} for agent type: ${job.agentType}`);
        return;
      }

      // Select correct printer based on job type
      const defaultPrinterName = job.type === 'RECEIPT' ? thermalPrinter : laserPrinter;
      const printerName = job.printerName || defaultPrinterName;
      const copies = Math.max(job.copies ?? 1, 1);
      const printOptions = {
        printerTray: job.printerTray ?? null,
        copies
      };

      if (!printerName) {
        throw new Error(`No printer configured for job type: ${job.type}`);
      }

      // Process based on type
      if (job.type === 'RECEIPT') {
        await this.printReceipt(job, printerName, printOptions);
      } else if (job.type === 'ORDER_TICKET') {
        await this.printOrderTicket(job, printerName, printOptions);
      } else if (job.type === 'REPORT') {
        await this.printReport(job, printerName, printOptions);
      } else {
        throw new Error(`Unknown job type: ${job.type}`);
      }

      // Track successful job
      this.addToRecent(job, 'completed');
      logger.info(`✅ Print job completed: ${job.id}`);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`❌ Print job failed: ${job.id} - ${errorMessage}`);

      // Track failed job
      this.addToRecent(job, 'failed', errorMessage);

      throw error;
    }
  }

  /**
   * Print receipt (thermal printer)
   */
  private async printReceipt(
    job: PrintJob,
    printerName: string,
    options: { printerTray?: number | null; copies?: number }
  ): Promise<void> {
    logger.info(`Printing receipt to ${printerName}`);

    // TODO: Format receipt with ESC/POS commands
    // For now, print simple HTML receipt
    const receiptHTML = this.generateReceiptHTML(job.data);
    await this.printHTML(receiptHTML, printerName, options);
  }

  /**
   * Print order ticket (laser printer)
   */
  private async printOrderTicket(
    job: PrintJob,
    printerName: string,
    options: { printerTray?: number | null; copies?: number }
  ): Promise<void> {
    logger.info(`Printing order ticket to ${printerName}`);

    try {
      // Parse order data and generate professional ticket
      logger.info(`Order data received: ${JSON.stringify(job.data).substring(0, 500)}...`);
      const ticketData = parseOrderForTicket(job.data);
      logger.info(`Ticket data parsed: ${JSON.stringify(ticketData).substring(0, 500)}...`);

      if (ticketData.driverRouteUrl) {
        try {
          ticketData.driverRouteQrCodeDataUrl = await QRCode.toDataURL(ticketData.driverRouteUrl, {
            width: 220,
            margin: 1
          });
        } catch (error) {
          logger.warn('Failed to generate QR code for driver route:', error);
        }
      }

      const ticketHTML = generateOrderTicketHTML(ticketData);
      logger.info(`HTML generated, length: ${ticketHTML.length} characters`);
      await this.printHTML(ticketHTML, printerName, options);
    } catch (error) {
      logger.error('Failed to generate ticket:', error);
      throw error;
    }
  }

  /**
   * Print report (laser printer)
   */
  private async printReport(
    job: PrintJob,
    printerName: string,
    options: { printerTray?: number | null; copies?: number }
  ): Promise<void> {
    logger.info(`Printing report to ${printerName}`);

    // TODO: Generate report PDF
    const reportHTML = this.generateReportHTML(job.data);
    await this.printHTML(reportHTML, printerName, options);
  }

  /**
   * Print HTML to printer (using Electron's print API)
   */
  private async printHTML(
    html: string,
    printerName: string,
    options?: { printerTray?: number | null; copies?: number }
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      // Create hidden window for printing
      const printWindow = new BrowserWindow({
        show: false,
        webPreferences: {
          nodeIntegration: false
        }
      });

      printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);

      printWindow.webContents.on('did-finish-load', async () => {
        try {
          // Wait for CSS and fonts to render
          await new Promise(resolve => setTimeout(resolve, 1000));

          // Generate PDF and use Mac's lpr command (Electron's print is broken)
          const { exec } = require('child_process');
          const fs = require('fs');
          const os = require('os');
          const path = require('path');

          const pdfPath = path.join(os.tmpdir(), `bloom-order-${Date.now()}.pdf`);

          const pdfData = await printWindow.webContents.printToPDF({
            printBackground: true,
            landscape: true,
            pageSize: 'Letter'
          });

          fs.writeFileSync(pdfPath, pdfData);
          printWindow.destroy();

          logger.info(`PDF generated: ${pdfPath}`);

          // Use Mac's lpr command to actually print
          const copiesOption = options?.copies && options.copies > 1 ? `-# ${options.copies}` : '';
          const trayOption = options?.printerTray ? `-o InputSlot=Tray${options.printerTray}` : '';
          const printCommand = `lpr ${copiesOption} ${trayOption} -P "${printerName}" "${pdfPath}"`;

          exec(printCommand, (error: any, stdout: any, stderr: any) => {
            if (error) {
              logger.error(`Print command failed: ${error.message}`);
              logger.error(`stderr: ${stderr}`);
              fs.unlinkSync(pdfPath);
              reject(new Error(`Print failed: ${error.message}`));
            } else {
              logger.info('✅ Print job sent successfully via lpr');
              fs.unlinkSync(pdfPath);
              resolve();
            }
          });
        } catch (error) {
          printWindow.destroy();
          reject(error);
        }
      });

      printWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
        printWindow.destroy();
        reject(new Error(`Failed to load print content: ${errorDescription}`));
      });
    });
  }

  /**
   * Generate receipt HTML (placeholder)
   */
  private generateReceiptHTML(orderData: any): string {
    const order = orderData;

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body {
            font-family: monospace;
            width: 58mm;
            margin: 0;
            padding: 10px;
            font-size: 11pt;
          }
          .center { text-align: center; }
          .bold { font-weight: bold; }
          .line { border-bottom: 1px dashed #000; margin: 5px 0; }
          .item { display: flex; justify-content: space-between; }
        </style>
      </head>
      <body>
        <div class="center bold">🌸 BLOOM FLOWERS</div>
        <div class="center">123 Main St, Vancouver BC</div>
        <div class="center">(604) 555-1234</div>
        <div class="line"></div>

        <div>Order #${order.orderNumber || 'N/A'}</div>
        <div>Date: ${new Date().toLocaleString()}</div>
        <div class="line"></div>

        <div class="bold">Items:</div>
        ${order.orderItems?.map((item: any) => `
          <div class="item">
            <span>${item.quantity}x ${item.customName}</span>
            <span>$${(item.rowTotal / 100).toFixed(2)}</span>
          </div>
        `).join('') || '<div>No items</div>'}

        <div class="line"></div>
        <div class="item bold">
          <span>TOTAL:</span>
          <span>$${((order.paymentAmount || 0) / 100).toFixed(2)}</span>
        </div>
        <div class="line"></div>

        <div class="center">Thank you!</div>
        <div class="center">www.hellobloom.ca</div>
      </body>
      </html>
    `;
  }

  /**
   * Generate report HTML (placeholder)
   */
  private generateReportHTML(data: any): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; }
          .header { text-align: center; font-size: 20pt; margin-bottom: 30px; }
        </style>
      </head>
      <body>
        <div class="header">Report</div>
        <pre>${JSON.stringify(data, null, 2)}</pre>
      </body>
      </html>
    `;
  }

  /**
   * Add job to recent jobs list
   */
  private addToRecent(job: PrintJob, status: string, error?: string): void {
    this.recentJobs.unshift({
      job,
      status,
      timestamp: new Date(),
      error
    });

    // Keep only recent jobs
    if (this.recentJobs.length > this.maxRecentJobs) {
      this.recentJobs = this.recentJobs.slice(0, this.maxRecentJobs);
    }
  }

  /**
   * Get recent jobs for UI display
   */
  getRecentJobs() {
    return this.recentJobs.map(item => ({
      orderNumber: item.job.data?.orderNumber || 'Unknown',
      status: item.status,
      timestamp: item.timestamp.toISOString(),
      error: item.error
    }));
  }
}
