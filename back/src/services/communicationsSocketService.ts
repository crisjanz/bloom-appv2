import { WebSocketServer } from 'ws';

let wss: WebSocketServer | null = null;

export function setCommunicationsWebSocketServer(server: WebSocketServer) {
  wss = server;
}

export function broadcastCommunicationsEvent(message: object) {
  if (!wss) return;

  const payload = JSON.stringify(message);
  wss.clients.forEach((client) => {
    if (client.readyState === 1) {
      client.send(payload);
    }
  });
}

export function broadcastSmsReceived(data: {
  orderId: string;
  message: string;
  createdAt: string;
  communicationId: string;
  totalUnreadCount: number;
  orderUnreadCount: number;
}) {
  broadcastCommunicationsEvent({
    type: 'sms:received',
    data
  });
}

export function broadcastSmsStatusUpdated(data: {
  communicationId: string;
  orderId: string;
  status: string;
}) {
  broadcastCommunicationsEvent({
    type: 'sms:status_updated',
    data
  });
}
