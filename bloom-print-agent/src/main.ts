import { app, BrowserWindow, Tray, Menu, nativeImage, ipcMain } from 'electron';
import * as path from 'path';
import { createTray, updateTrayStatus } from './tray';
import * as winston from 'winston';
import Store from 'electron-store';
import { ConnectionManager } from './connection/manager';
import { JobProcessor } from './job-processor';
import { PrintJob } from './connection/websocket';

// Track if app is quitting
let isQuitting = false;

// Configure logger (will be initialized after app is ready)
export let logger: winston.Logger;

function initializeLogger() {
  const fs = require('fs');
  const logDir = path.join(app.getPath('userData'), 'logs');

  // Create logs directory if it doesn't exist
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }

  const logFile = path.join(logDir, 'agent-test.log');

  logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.printf(({ timestamp, level, message }) => {
        return `${timestamp} [${level}]: ${message}`;
      })
    ),
    transports: [
      new winston.transports.Console(),
      new winston.transports.File({ filename: logFile })
    ]
  });

  logger.info('Logger initialized at: ' + logFile);
}

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let connectionManager: ConnectionManager | null = null;
let jobProcessor: JobProcessor | null = null;

// Persistent settings storage
const store: any = new Store({
  defaults: {
    thermalPrinter: '',
    laserPrinter: '',
    labelPrinter: '',
    backendUrl: 'https://api.hellobloom.ca'
  }
});

// Prevent multiple instances
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    show: true, // Show window on startup for testing
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  // Load the settings UI
  mainWindow.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));

  // When page finishes loading, send current connection status
  mainWindow.webContents.on('did-finish-load', () => {
    if (connectionManager) {
      const status = connectionManager.getStatus();
      const connectionStatus = status.websocket ? 'connected' : (status.polling ? 'reconnecting' : 'disconnected');
      mainWindow?.webContents.send('connection-status', connectionStatus);
      logger.info(`Sent initial connection status to renderer: ${connectionStatus}`);
    }
  });

  // Handle window close - hide instead of quit
  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow?.hide();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  logger.info('Settings window created');
}

// IPC Handlers
function setupIPCHandlers() {
  // Get available printers
  ipcMain.handle('get-printers', async () => {
    try {
      const { webContents } = mainWindow || {};
      if (!webContents) return [];

      const printers = await webContents.getPrintersAsync();
      logger.info(`Found ${printers.length} printers`);
      return printers;
    } catch (error) {
      logger.error('Failed to get printers:', error);
      return [];
    }
  });

  // Save settings
  ipcMain.handle('save-settings', async (_event, settings) => {
    try {
      store.set('thermalPrinter', settings.thermalPrinter);
      store.set('laserPrinter', settings.laserPrinter);
      store.set('labelPrinter', settings.labelPrinter);
      logger.info('Settings saved:', settings);
    } catch (error) {
      logger.error('Failed to save settings:', error);
      throw error;
    }
  });

  // Get settings
  ipcMain.handle('get-settings', async () => {
    try {
      return {
        thermalPrinter: store.get('thermalPrinter'),
        laserPrinter: store.get('laserPrinter'),
        labelPrinter: store.get('labelPrinter'),
        backendUrl: store.get('backendUrl')
      };
    } catch (error) {
      logger.error('Failed to get settings:', error);
      return {};
    }
  });

  // Test print
  ipcMain.handle('test-print', async (_event, printerName, type) => {
    try {
      logger.info(`Test print requested: ${type} on ${printerName}`);

      // Create a simple test page
      const testHTML = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial; padding: 20px; }
            h1 { color: #597485; }
          </style>
        </head>
        <body>
          <h1>🌸 Bloom Print Agent Test</h1>
          <p>Printer: ${printerName}</p>
          <p>Type: ${type}</p>
          <p>Date: ${new Date().toLocaleString()}</p>
          <p>This is a test print to verify printer connectivity.</p>
        </body>
        </html>
      `;

      // Create hidden window for printing
      const printWindow = new BrowserWindow({
        show: false,
        webPreferences: { nodeIntegration: false }
      });

      logger.info('Loading test HTML into print window...');
      await printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(testHTML)}`);

      logger.info(`Sending print job to: ${printerName}`);

      // Generate PDF and use Mac's lpr command (Electron's print is broken)
      const { exec } = require('child_process');
      const fs = require('fs');
      const os = require('os');
      const path = require('path');

      const pdfPath = path.join(os.tmpdir(), `bloom-test-${Date.now()}.pdf`);

      const pdfData = await printWindow.webContents.printToPDF({
        printBackground: true,
        pageSize: 'Letter',
        landscape: true
      });

      fs.writeFileSync(pdfPath, pdfData);
      printWindow.destroy();

      logger.info(`PDF generated: ${pdfPath}`);
      logger.info(`Sending to printer: ${printerName}`);

      // Use Mac's lpr command to actually print
      exec(`lpr -P "${printerName}" "${pdfPath}"`, (error: any, stdout: any, stderr: any) => {
        if (error) {
          logger.error(`Print command failed: ${error.message}`);
          logger.error(`stderr: ${stderr}`);
        } else {
          logger.info('✅ Test print sent successfully via lpr');
        }

        // Clean up PDF file
        fs.unlinkSync(pdfPath);
      });
    } catch (error) {
      logger.error('❌ Test print failed:', error);
      throw error;
    }
  });

  // Get recent jobs
  ipcMain.handle('get-recent-jobs', async () => {
    if (jobProcessor) {
      return jobProcessor.getRecentJobs();
    }
    return [];
  });

  // View logs
  ipcMain.handle('view-logs', async () => {
    const { app, shell } = require('electron');
    const path = require('path');
    const logPath = path.join(app.getPath('userData'), 'logs', 'agent-test.log');
    await shell.openPath(logPath);
    return logPath;
  });

  logger.info('IPC handlers registered');
}

// Set up connection manager and job processor
function setupConnectionManager() {
  const backendUrl = store.get('backendUrl') || 'https://api.hellobloom.ca';

  // Initialize connection manager
  connectionManager = new ConnectionManager(backendUrl);
  jobProcessor = new JobProcessor();

  // Listen for connection status changes
  connectionManager.on('status', (status: string) => {
    logger.info(`Connection status: ${status}`);

    // Update tray status
    if (tray) {
      updateTrayStatus(tray, status as any, () => {
        if (mainWindow === null) {
          createWindow();
        }
        mainWindow?.show();
        mainWindow?.focus();
      });
    }

    // Notify renderer window
    if (mainWindow) {
      mainWindow.webContents.send('connection-status', status);
    }
  });

  // Listen for print jobs
  connectionManager.on('printJob', async (job: PrintJob) => {
    logger.info(`📥 Received print job: ${job.id}`);

    // Get printer settings
    const thermalPrinter = store.get('thermalPrinter') || '';
    const laserPrinter = store.get('laserPrinter') || '';
    const labelPrinter = store.get('labelPrinter') || '';

    try {
      // Process the job
      await jobProcessor!.processJob(job, thermalPrinter, laserPrinter, labelPrinter);

      // Notify backend of success
      await connectionManager!.sendJobStatus(job.id, 'COMPLETED');

      logger.info(`✅ Print job completed: ${job.id}`);

      // Notify renderer of new job
      if (mainWindow) {
        mainWindow.webContents.send('print-job', job);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`❌ Print job failed: ${job.id} - ${errorMessage}`);

      // Notify backend of failure
      try {
        await connectionManager!.sendJobStatus(job.id, 'FAILED', errorMessage);
      } catch (statusError) {
        logger.error('Failed to send job status to backend:', statusError);
      }
    }
  });

  // Start connection
  connectionManager.connect();
  logger.info('Connection manager started');
}

app.whenReady().then(() => {
  // Initialize logger first
  initializeLogger();

  logger.info('Bloom Print Agent starting...');

  // Set up IPC handlers
  setupIPCHandlers();

  // Create system tray
  tray = createTray(() => {
    if (mainWindow === null) {
      createWindow();
    }
    mainWindow?.show();
    mainWindow?.focus();
  });

  // Create window (shown for testing)
  createWindow();

  // Set up connection manager and start connecting to backend
  setupConnectionManager();

  // Auto-start on login (Windows/Mac)
  app.setLoginItemSettings({
    openAtLogin: true,
    openAsHidden: true
  });

  logger.info('Bloom Print Agent ready - running in system tray');
});

app.on('window-all-closed', () => {
  // Don't quit on window close - keep running in tray
  // app.quit() only called when user clicks "Quit" in tray menu
});

app.on('second-instance', () => {
  // Someone tried to run a second instance, focus our window
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  }
});

app.on('before-quit', () => {
  isQuitting = true;

  // Disconnect from backend
  if (connectionManager) {
    logger.info('Disconnecting from backend...');
    connectionManager.disconnect();
  }
});

// Export for other modules
export { mainWindow };
