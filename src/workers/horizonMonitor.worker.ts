import { AlertEngine } from '../alerts/AlertEngine.js';
import { WEBSOCKET_TOPICS } from '../config/constants.js';
import { childLogger } from '../config/logger.js';
import { prisma } from '../db/prisma.js';
import { redis } from '../db/redis.js';
import { notificationDispatchQueue } from '../jobs/queues.js';
import { HorizonMonitorService } from '../services/horizonMonitor.service.js';
import { StreamProcessorService } from '../services/streamProcessor.service.js';
import { publishWsEvent } from '../websocket/pubsub.js';

const log = childLogger('worker:horizon-monitor');

/**
 * Wires the live Horizon stream to the detection pipeline. On every alert
 * created, enqueues a durable notification-dispatch job (so delivery
 * survives worker restarts and gets automatic retries) and publishes a
 * WebSocket bridge event so connected API clients see it in real time.
 */
export function startHorizonMonitor(): HorizonMonitorService {
  const alertEngine = new AlertEngine(prisma);
  alertEngine.onAlertCreated(async (alert) => {
    await notificationDispatchQueue.add('dispatch', { alertId: alert.id });
    await publishWsEvent(redis, { topic: WEBSOCKET_TOPICS.ALERTS, payload: alert });
  });

  const processor = new StreamProcessorService(prisma, alertEngine);

  const monitor = new HorizonMonitorService(async (event) => {
    await processor.process(event);
    await publishWsEvent(redis, { topic: WEBSOCKET_TOPICS.NETWORK_ACTIVITY, payload: event });
  });

  monitor.start();
  log.info('Horizon monitor started');
  return monitor;
}
