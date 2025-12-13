import axios from 'axios';
import { EventEmitter } from 'events';
import { logger } from '../main';
import { PrintJob } from './websocket';

export class PollingConnectionManager extends EventEmitter {
  private pollInterval: NodeJS.Timeout | null = null;
  private backendUrl: string;
  private agentId: string;
  private isPolling = false;
  private pollFrequency = 5000; // Poll every 5 seconds

  constructor(backendUrl: string, agentId: string = 'agent-001') {
    super();
    this.backendUrl = backendUrl;
    this.agentId = agentId;
  }

  /**
   * Start polling for print jobs
   */
  start(): void {
    if (this.isPolling) {
      logger.warn('Already polling');
      return;
    }

    logger.info('Starting HTTP polling fallback');
    this.isPolling = true;
    this.emit('status', 'connected');

    // Poll immediately, then at intervals
    this.poll();

    this.pollInterval = setInterval(() => {
      this.poll();
    }, this.pollFrequency);
  }

  /**
   * Stop polling
   */
  stop(): void {
    logger.info('Stopping HTTP polling');
    this.isPolling = false;

    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }

    this.emit('status', 'disconnected');
  }

  /**
   * Poll for pending print jobs
   */
  private async poll(): Promise<void> {
    try {
      const response = await axios.get(`${this.backendUrl}/api/print-jobs/pending`, {
        params: {
          agentId: this.agentId,
          limit: 10
        },
        timeout: 10000 // 10 second timeout
      });

      const jobs = response.data.jobs || [];

      if (jobs.length > 0) {
        logger.info(`Fetched ${jobs.length} pending print jobs`);

        // Emit each job
        jobs.forEach((job: PrintJob) => {
          this.emit('printJob', job);
        });
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
          logger.error('Backend not reachable - polling will continue');
        } else {
          logger.error('Polling error:', error.message);
        }
      } else {
        logger.error('Polling error:', error);
      }

      // Don't emit disconnected status on every error - keep trying
    }
  }

  /**
   * Send job status update to backend
   */
  async sendJobStatus(jobId: string, status: 'COMPLETED' | 'FAILED', errorMessage?: string): Promise<void> {
    try {
      await axios.patch(
        `${this.backendUrl}/api/print-jobs/${jobId}/status`,
        {
          status,
          agentId: this.agentId,
          errorMessage,
          printedAt: new Date().toISOString()
        },
        {
          timeout: 10000
        }
      );

      logger.info(`Job status updated: ${jobId} - ${status}`);
    } catch (error) {
      logger.error('Failed to update job status:', error);
      throw error;
    }
  }

  /**
   * Check if polling is active
   */
  isActive(): boolean {
    return this.isPolling;
  }
}
