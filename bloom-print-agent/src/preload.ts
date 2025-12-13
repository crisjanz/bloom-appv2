import { contextBridge, ipcRenderer } from 'electron';

// Expose safe IPC methods to renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  // Connection status
  onConnectionStatus: (callback: (status: string) => void) => {
    ipcRenderer.on('connection-status', (_event, status) => callback(status));
  },

  // Print jobs
  onPrintJob: (callback: (job: any) => void) => {
    ipcRenderer.on('print-job', (_event, job) => callback(job));
  },

  // Request printer list
  getPrinters: () => ipcRenderer.invoke('get-printers'),

  // Save settings
  saveSettings: (settings: any) => ipcRenderer.invoke('save-settings', settings),

  // Get settings
  getSettings: () => ipcRenderer.invoke('get-settings'),

  // Test print
  testPrint: (printerName: string, type: 'thermal' | 'laser') =>
    ipcRenderer.invoke('test-print', printerName, type),

  // Get recent jobs
  getRecentJobs: () => ipcRenderer.invoke('get-recent-jobs')
});

// Declare types for TypeScript
declare global {
  interface Window {
    electronAPI: {
      onConnectionStatus: (callback: (status: string) => void) => void;
      onPrintJob: (callback: (job: any) => void) => void;
      getPrinters: () => Promise<any[]>;
      saveSettings: (settings: any) => Promise<void>;
      getSettings: () => Promise<any>;
      testPrint: (printerName: string, type: 'thermal' | 'laser') => Promise<void>;
      getRecentJobs: () => Promise<any[]>;
    };
  }
}
