import { useEffect, useRef } from 'react';

export type CommunicationsSocketEvent = {
  type: 'sms:received';
  data: {
    orderId: string;
    message: string;
    createdAt: string;
    communicationId: string;
    totalUnreadCount?: number;
    orderUnreadCount?: number;
  };
};

type EventHandler = (event: CommunicationsSocketEvent) => void;

// Singleton WebSocket manager
class CommunicationsSocketManager {
  private socket: WebSocket | null = null;
  private handlers: Set<EventHandler> = new Set();
  private reconnectTimer: number | null = null;
  private shouldReconnect = true;

  private resolveBaseUrl() {
    const apiBase = (import.meta.env.VITE_API_URL || import.meta.env.VITE_BACKEND_URL || '').replace(/\/$/, '');
    if (apiBase) {
      return apiBase.replace(/\/api$/, '');
    }

    if (typeof window === 'undefined') {
      return '';
    }

    const { protocol, hostname, port } = window.location;
    if ((hostname === 'localhost' || hostname === '127.0.0.1') && port !== '4000') {
      return `${protocol}//${hostname}:4000`;
    }

    return window.location.origin;
  }

  private buildWebSocketUrl() {
    const baseUrl = this.resolveBaseUrl();
    if (!baseUrl) return '';
    const wsBase = baseUrl.replace(/^http/, 'ws');
    return `${wsBase}/communications`;
  }

  private connect() {
    const url = this.buildWebSocketUrl();
    if (!url) return;

    this.socket = new WebSocket(url);

    this.socket.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data) as CommunicationsSocketEvent;
        if (payload?.type) {
          this.handlers.forEach((handler) => handler(payload));
        }
      } catch (error) {
        console.error('Failed to parse communications WebSocket message:', error);
      }
    };

    this.socket.onclose = () => {
      if (this.shouldReconnect && this.handlers.size > 0) {
        this.reconnectTimer = window.setTimeout(() => this.connect(), 4000);
      }
    };

    this.socket.onerror = (error) => {
      console.error('Communications WebSocket error:', error);
    };
  }

  subscribe(handler: EventHandler) {
    this.handlers.add(handler);

    // Start connection if this is the first subscriber
    if (this.handlers.size === 1 && !this.socket) {
      this.shouldReconnect = true;
      this.connect();
    }

    return () => {
      this.handlers.delete(handler);

      // Close connection if no more subscribers
      if (this.handlers.size === 0) {
        this.shouldReconnect = false;
        if (this.reconnectTimer) {
          window.clearTimeout(this.reconnectTimer);
          this.reconnectTimer = null;
        }
        this.socket?.close();
        this.socket = null;
      }
    };
  }
}

// Single instance shared across all hook usages
const socketManager = new CommunicationsSocketManager();

export function useCommunicationsSocket(
  onEvent: (event: CommunicationsSocketEvent) => void,
  enabled: boolean = true
) {
  const handlerRef = useRef(onEvent);

  useEffect(() => {
    handlerRef.current = onEvent;
  }, [onEvent]);

  useEffect(() => {
    if (!enabled) return;

    const handler = (event: CommunicationsSocketEvent) => {
      handlerRef.current(event);
    };

    return socketManager.subscribe(handler);
  }, [enabled]);
}
