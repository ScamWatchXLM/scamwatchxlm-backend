import type { WebSocket } from 'ws';

import { childLogger } from '../config/logger.js';

const log = childLogger('ws-hub');

interface Subscriber {
  socket: WebSocket;
  topics: Set<string>;
}

/**
 * In-process fan-out hub for WebSocket clients. Clients subscribe to one or
 * more topics (see WEBSOCKET_TOPICS) and receive JSON-encoded events pushed
 * by the alert/detection pipeline. Single-process only — for multi-instance
 * deployments, back this with Redis pub/sub instead.
 */
export class WebSocketHub {
  private readonly subscribers = new Set<Subscriber>();

  register(socket: WebSocket): void {
    const subscriber: Subscriber = { socket, topics: new Set(['alerts']) };
    this.subscribers.add(subscriber);

    socket.on('message', (raw: Buffer) => {
      try {
        const message = JSON.parse(raw.toString());
        if (message.action === 'subscribe' && Array.isArray(message.topics)) {
          subscriber.topics = new Set(message.topics);
        }
      } catch {
        // ignore malformed client messages
      }
    });

    socket.on('close', () => this.subscribers.delete(subscriber));
    socket.on('error', (err: Error) => log.warn({ err }, 'WebSocket client error'));
  }

  broadcast(topic: string, payload: unknown): void {
    const message = JSON.stringify({ topic, payload, timestamp: new Date().toISOString() });
    for (const subscriber of this.subscribers) {
      if (subscriber.topics.has(topic) && subscriber.socket.readyState === subscriber.socket.OPEN) {
        subscriber.socket.send(message);
      }
    }
  }

  get connectionCount(): number {
    return this.subscribers.size;
  }
}

export const wsHub = new WebSocketHub();
