import { EventEmitter } from 'events';
import { WebSocketConnectionManager, PrintJob } from './websocket';
import { PollingConnectionManager } from './polling';
import { logger } from '../main';

/**
 * Hybrid connection manager that uses WebSocket with HTTP polling fallback
 */
export class ConnectionManager extends EventEmitter {
  private wsManager: WebSocketConnectionManager;
  private pollingManager: PollingConnectionManager;
  private backendUrl: string;
  private agentId: string;
  private useWebSocket = true;
  private connectionCheckInterval: NodeJS.Timeout | null = null;

  constructor(backendUrl: string, agentId: string = 'agent-001') {
    super();
    this.backendUrl = backendUrl;
    this.agentId = agentId;

    // Initialize both managers
    this.wsManager = new WebSocketConnectionManager(backendUrl, agentId);
    this.pollingManager = new PollingConnectionManager(backendUrl, agentId);

    this.setupEventHandlers();
  }

  /**
   * Set up event handlers for both connection types
   */
  private setupEventHandlers(): void {
    // WebSocket events
    this.wsManager.on('status', (status: string) => {
      logger.info(`WebSocket status: ${status}`);
      this.emit('status', status);

      // If WebSocket disconnects, fall back to polling
      if (status === 'disconnected' && this.useWebSocket) {
        logger.info('WebSocket disconnected - falling back to HTTP polling');
        this.startPolling();
      } else if (status === 'connected') {
        // If WebSocket reconnects, stop polling
        this.stopPolling();
      }
    });

    this.wsManager.on('printJob', (job: PrintJob) => {
      logger.info(`Print job received via WebSocket: ${job.id}`);
      this.emit('printJob', job);
    });

    // Polling events
    this.pollingManager.on('status', (status: string) => {
      // Only emit polling status if WebSocket is not connected
      if (!this.wsManager.isConnected()) {
        this.emit('status', status);
      }
    });

    this.pollingManager.on('printJob', (job: PrintJob) => {
      logger.info(`Print job received via polling: ${job.id}`);
      this.emit('printJob', job);
    });
  }

  /**
   * Start connection (tries WebSocket first)
   */
  connect(): void {
    logger.info('Connection manager starting...');

    // Try WebSocket first
    this.wsManager.connect();

    // Start monitoring connection health
    this.startConnectionMonitoring();
  }

  /**
   * Disconnect from backend
   */
  disconnect(): void {
    logger.info('Connection manager disconnecting...');

    this.wsManager.disconnect();
    this.stopPolling();
    this.stopConnectionMonitoring();

    this.emit('status', 'disconnected');
  }

  /**
   * Send job status update
   */
  async sendJobStatus(jobId: string, status: 'COMPLETED' | 'FAILED', errorMessage?: string): Promise<void> {
    try {
      if (this.wsManager.isConnected()) {
        // Send via WebSocket
        this.wsManager.sendJobStatus(jobId, status, errorMessage);
      } else if (this.pollingManager.isActive()) {
        // Send via HTTP
        await this.pollingManager.sendJobStatus(jobId, status, errorMessage);
      } else {
        logger.error('Cannot send job status - no active connection');
        throw new Error('No active connection');
      }
    } catch (error) {
      logger.error('Failed to send job status:', error);
      throw error;
    }
  }

  /**
   * Start HTTP polling fallback
   */
  private startPolling(): void {
    if (!this.pollingManager.isActive()) {
      logger.info('Starting HTTP polling fallback');
      this.pollingManager.start();
    }
  }

  /**
   * Stop HTTP polling
   */
  private stopPolling(): void {
    if (this.pollingManager.isActive()) {
      logger.info('Stopping HTTP polling (WebSocket active)');
      this.pollingManager.stop();
    }
  }

  /**
   * Monitor connection health and manage fallback
   */
  private startConnectionMonitoring(): void {
    this.connectionCheckInterval = setInterval(() => {
      const wsConnected = this.wsManager.isConnected();
      const pollingActive = this.pollingManager.isActive();

      logger.debug(`Connection status: WS=${wsConnected}, Polling=${pollingActive}`);

      // If WebSocket is down and polling is not active, start polling
      if (!wsConnected && !pollingActive) {
        logger.warn('No active connection - starting polling fallback');
        this.startPolling();
      }

      // If WebSocket is up and polling is active, stop polling
      if (wsConnected && pollingActive) {
        this.stopPolling();
      }
    }, 15000); // Check every 15 seconds
  }

  /**
   * Stop connection monitoring
   */
  private stopConnectionMonitoring(): void {
    if (this.connectionCheckInterval) {
      clearInterval(this.connectionCheckInterval);
      this.connectionCheckInterval = null;
    }
  }

  /**
   * Get current connection status
   */
  getStatus(): { websocket: boolean; polling: boolean } {
    return {
      websocket: this.wsManager.isConnected(),
      polling: this.pollingManager.isActive()
    };
  }

  /**
   * Update backend URL (e.g., from settings)
   */
  updateBackendUrl(newUrl: string): void {
    if (newUrl !== this.backendUrl) {
      logger.info(`Updating backend URL: ${this.backendUrl} → ${newUrl}`);
      this.backendUrl = newUrl;

      // Reconnect with new URL
      this.disconnect();
      this.wsManager = new WebSocketConnectionManager(newUrl, this.agentId);
      this.pollingManager = new PollingConnectionManager(newUrl, this.agentId);
      this.setupEventHandlers();
      this.connect();
    }
  }
}
