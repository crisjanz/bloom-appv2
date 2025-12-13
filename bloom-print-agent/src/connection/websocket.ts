import WebSocket from 'ws';
import { EventEmitter } from 'events';
import { logger } from '../main';

export interface PrintJob {
  id: string;
  type: 'RECEIPT' | 'ORDER_TICKET' | 'REPORT';
  orderId: string;
  data: any; // Full order object
  template: string;
  priority: number;
  createdAt: string;
}

export class WebSocketConnectionManager extends EventEmitter {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectDelay = 60000; // 1 minute max
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private backendUrl: string;
  private agentId: string;
  private isConnecting = false;
  private shouldReconnect = true;

  constructor(backendUrl: string, agentId: string = 'agent-001') {
    super();
    this.backendUrl = backendUrl;
    this.agentId = agentId;
  }

  /**
   * Connect to backend WebSocket
   */
  connect(): void {
    if (this.isConnecting || (this.ws && this.ws.readyState === WebSocket.OPEN)) {
      logger.warn('Already connected or connecting');
      return;
    }

    this.isConnecting = true;
    this.emit('status', 'reconnecting');

    // Convert HTTP URL to WebSocket URL
    const wsUrl = this.backendUrl.replace(/^https?:/, 'wss:') + '/print-agent';

    logger.info(`Connecting to ${wsUrl}...`);

    try {
      this.ws = new WebSocket(wsUrl, {
        // TODO: Add authentication token in headers
        headers: {
          'User-Agent': 'Bloom Print Agent',
          // 'Authorization': `Bearer ${token}`
        }
      });

      this.ws.on('open', () => {
        logger.info('✅ WebSocket connected');
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        this.emit('status', 'connected');
        this.startHeartbeat();
      });

      this.ws.on('message', (data: WebSocket.Data) => {
        this.handleMessage(data.toString());
      });

      this.ws.on('close', (code: number, reason: Buffer) => {
        logger.warn(`WebSocket closed: ${code} - ${reason.toString()}`);
        this.cleanup();

        if (this.shouldReconnect) {
          this.scheduleReconnect();
        }
      });

      this.ws.on('error', (error: Error) => {
        logger.error('WebSocket error:', error.message);
        this.isConnecting = false;
        this.emit('status', 'disconnected');
      });

    } catch (error) {
      logger.error('Failed to create WebSocket:', error);
      this.isConnecting = false;
      this.emit('status', 'disconnected');
      this.scheduleReconnect();
    }
  }

  /**
   * Disconnect from backend
   */
  disconnect(): void {
    logger.info('Disconnecting WebSocket...');
    this.shouldReconnect = false;
    this.cleanup();

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.emit('status', 'disconnected');
  }

  /**
   * Send job status update to backend
   */
  sendJobStatus(jobId: string, status: 'COMPLETED' | 'FAILED', errorMessage?: string): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      logger.warn('Cannot send job status - WebSocket not connected');
      return;
    }

    const message = {
      type: 'JOB_STATUS',
      jobId,
      status,
      agentId: this.agentId,
      errorMessage,
      printedAt: new Date().toISOString()
    };

    this.ws.send(JSON.stringify(message));
    logger.info(`Sent job status: ${jobId} - ${status}`);
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleMessage(data: string): void {
    try {
      const message = JSON.parse(data);
      logger.info(`Received message: ${message.type}`);

      switch (message.type) {
        case 'PRINT_JOB':
          // New print job received
          this.emit('printJob', message.job as PrintJob);
          break;

        case 'HEARTBEAT_ACK':
          // Heartbeat acknowledged
          logger.debug('Heartbeat acknowledged');
          break;

        case 'ACK':
          // General acknowledgment
          logger.debug(`ACK received for job ${message.jobId}`);
          break;

        default:
          logger.warn(`Unknown message type: ${message.type}`);
      }
    } catch (error) {
      logger.error('Failed to parse WebSocket message:', error);
    }
  }

  /**
   * Send heartbeat to keep connection alive
   */
  private startHeartbeat(): void {
    this.stopHeartbeat();

    this.heartbeatInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        const heartbeat = {
          type: 'HEARTBEAT',
          agentId: this.agentId,
          timestamp: new Date().toISOString()
        };

        this.ws.send(JSON.stringify(heartbeat));
        logger.debug('Heartbeat sent');
      }
    }, 30000); // Every 30 seconds
  }

  /**
   * Stop heartbeat
   */
  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Schedule reconnection with exponential backoff
   */
  private scheduleReconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }

    // Exponential backoff: 1s, 2s, 4s, 8s, 16s, 32s, 60s (max)
    const delay = Math.min(
      1000 * Math.pow(2, this.reconnectAttempts),
      this.maxReconnectDelay
    );

    logger.info(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts + 1})...`);
    this.emit('status', 'reconnecting');

    this.reconnectTimeout = setTimeout(() => {
      this.reconnectAttempts++;
      this.connect();
    }, delay);
  }

  /**
   * Cleanup resources
   */
  private cleanup(): void {
    this.stopHeartbeat();

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    this.isConnecting = false;
  }

  /**
   * Get connection status
   */
  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
}
