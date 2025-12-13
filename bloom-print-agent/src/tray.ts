import { Tray, Menu, nativeImage, app } from 'electron';
import * as path from 'path';
import { logger } from './main';

export function createTray(onOpenSettings: () => void): Tray {
  // Create tray icon - try to load from file, or create a simple one
  let icon: Electron.NativeImage;
  const iconPath = path.join(__dirname, '..', 'assets', 'tray-icon.png');

  try {
    icon = nativeImage.createFromPath(iconPath);
    if (icon.isEmpty()) {
      // Create a simple colored square as placeholder
      icon = nativeImage.createFromDataURL('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAAdgAAAHYBTnsmCAAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAABZSURBVDiNY/j//z8DJYAJGuDi4vqfnp6OrmZgYPgfHh6OoRgbgLp/YGDgP7pmbADsAjTFyAATA0kASw0yQDEAXTEygMUAumJkwIgOQFeMDFBiACwAAABlLhI0VKjXCQAAAABJRU5ErkJggg==');
    }
    icon = icon.resize({ width: 16, height: 16 });
  } catch (error) {
    logger.warn('Failed to load tray icon, using placeholder');
    // Create a simple colored square as placeholder (16x16 blue square)
    icon = nativeImage.createFromDataURL('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAAdgAAAHYBTnsmCAAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAABZSURBVDiNY/j//z8DJYAJGuDi4vqfnp6OrmZgYPgfHh6OoRgbgLp/YGDgP7pmbADsAjTFyAATA0kASw0yQDEAXTEygMUAumJkwIgOQFeMDFBiACwAAABlLhI0VKjXCQAAAABJRU5ErkJggg==');
  }

  const tray = new Tray(icon);
  tray.setToolTip('Bloom Print Agent');

  // Build context menu
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Bloom Print Agent',
      enabled: false
    },
    {
      type: 'separator'
    },
    {
      label: '● Disconnected',
      id: 'status',
      enabled: false
    },
    {
      type: 'separator'
    },
    {
      label: 'Open Settings',
      click: onOpenSettings
    },
    {
      label: 'View Logs',
      click: () => {
        // TODO: Open log file location
        logger.info('View logs clicked');
      }
    },
    {
      type: 'separator'
    },
    {
      label: 'Quit',
      click: () => {
        app.quit();
      }
    }
  ]);

  tray.setContextMenu(contextMenu);

  // Double-click to open settings
  tray.on('double-click', onOpenSettings);

  logger.info('System tray created');

  return tray;
}

export function updateTrayStatus(tray: Tray | null, status: 'connected' | 'disconnected' | 'reconnecting', onOpenSettings: () => void) {
  if (!tray) return;

  const statusLabels = {
    connected: '● Connected',
    disconnected: '● Disconnected',
    reconnecting: '⟳ Reconnecting...'
  };

  // Rebuild context menu with updated status
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Bloom Print Agent',
      enabled: false
    },
    {
      type: 'separator'
    },
    {
      label: statusLabels[status],
      id: 'status',
      enabled: false
    },
    {
      type: 'separator'
    },
    {
      label: 'Open Settings',
      click: onOpenSettings
    },
    {
      label: 'View Logs',
      click: () => {
        logger.info('View logs clicked');
      }
    },
    {
      type: 'separator'
    },
    {
      label: 'Quit',
      click: () => {
        app.quit();
      }
    }
  ]);

  tray.setContextMenu(contextMenu);

  // Update icon color based on status (placeholder for now)
  // TODO: Load different colored icons for each status
  logger.info(`Tray status updated: ${status}`);
}
