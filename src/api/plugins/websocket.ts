import websocket from '@fastify/websocket';
import type { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';

import { childLogger } from '../../config/logger.js';
import { subscribeWsEvents } from '../../websocket/pubsub.js';
import { wsHub } from '../../websocket/wsHub.js';

const log = childLogger('websocket-plugin');

export default fp(async function websocketPlugin(app: FastifyInstance) {
  await app.register(websocket);

  app.get('/ws', { websocket: true }, (socket) => {
    wsHub.register(socket);
    log.debug({ connections: wsHub.connectionCount }, 'WebSocket client connected');
  });

  const unsubscribe = subscribeWsEvents((event) => wsHub.broadcast(event.topic, event.payload));
  app.addHook('onClose', async () => {
    await unsubscribe();
  });
});
