# Architecture

## Overview

ScamWatchXLM's backend is split into two runtime processes that share the same codebase and Postgres/Redis instances:

- **API process** (`src/index.ts`) — Fastify HTTP + WebSocket server. Stateless; safe to run multiple replicas behind a load balancer.
- **Worker process** (`src/workers/index.ts`) — runs the live Horizon stream and all BullMQ workers (risk recalculation, alert cleanup, statistics generation, notification dispatch). Intended to run as a single replica (the Horizon stream itself isn't sharded); the job queues it drives can scale out independently if needed later.

Both processes talk to the same PostgreSQL database (via Prisma) and Redis instance (cache, BullMQ, pub/sub, rate limiting).

```
                         ┌─────────────────────┐
                         │   Stellar Horizon    │
                         └──────────┬───────────┘
                                    │ operations stream
                                    ▼
┌───────────────────────────────────────────────────────────┐
│ worker process                                             │
│                                                              │
│  HorizonMonitorService ──▶ StreamProcessorService            │
│                              │                               │
│                              ├─▶ DetectorRegistry (10 rules)  │
│                              ├─▶ RiskScorer + RiskHistory     │
│                              └─▶ AlertEngine ──┬─▶ BullMQ:    │
│                                                │  notification-dispatch
│                                                └─▶ Redis pub/sub (ws bridge)
│                                                              │
│  BullMQ workers: risk-recalculation, alert-cleanup,          │
│                   statistics-generation, notification-dispatch │
└───────────────────────────────┬───────────────────────────┘
                                 │
                    PostgreSQL  │  Redis
                                 │
┌───────────────────────────────┴───────────────────────────┐
│ API process                                                 │
│                                                              │
│  Fastify routes ──▶ services (account/asset/report/search/  │
│                      analytics/auth/apiKey) ──▶ Prisma        │
│                                                              │
│  /ws  ──▶ WebSocketHub  ◀── Redis pub/sub subscriber          │
└───────────────────────────────────────────────────────────┘
```

## Why a Redis pub/sub bridge for WebSockets?

Detections happen in the worker process, but WebSocket clients connect to API replicas. Rather than couple the two processes directly, the worker publishes alert/detection/network-activity events to a Redis channel (`src/websocket/pubsub.ts`); every API replica subscribes and fans events out to its own connected clients via `WebSocketHub`. This keeps the API stateless and horizontally scalable.

## Detection pipeline

1. `HorizonMonitorService` streams Horizon operations and normalizes them into `NormalizedHorizonEvent` (`src/types/horizon.ts`), mapping Horizon's operation types onto our domain event types (`ACCOUNT_CREATED`, `PAYMENT`, `TRUSTLINE_CREATED`, etc.).
2. `StreamProcessorService` persists the raw event, upserts the `Account`/`Asset` rows it touches, then hands the event to the `DetectorRegistry`.
3. Each `Detector` (`src/detectors/*.detector.ts`) is registered against the event types it cares about. Detectors are side-effect free — they read recent history via Prisma and return zero or more `DetectionResult`s; they never write.
4. For every detection, `StreamProcessorService` persists a `Detection` row (deduplicated by a detector-specific `dedupeKey`), computes a `RiskScoreResult` via `RiskScorer`, persists it, flags the entity if warranted, and asks `AlertEngine` to evaluate whether it clears the alerting threshold.
5. `AlertEngine` dedupes against existing open alerts for the same entity, creates an `Alert`, and fires registered hooks — in the worker process, that means enqueueing a `notification-dispatch` job and publishing a WebSocket bridge event.

## Risk scoring model

`src/risk/riskFactors.ts` converts each detection's `(severity, confidence)` pair into a 0–100 point contribution, then combines multiple contributions with a noisy-OR (`1 - Π(1 - p_i)`) so corroborating detections raise the score without letting many weak signals trivially outscore one strong one. `applyDecay` blends against the entity's previous score: escalations apply immediately, de-escalations fade gradually, so a scam campaign that goes quiet doesn't instantly look clean.

## Adding a new detector

1. Create `src/detectors/<name>.detector.ts` implementing `BaseDetector` (`src/detectors/base/Detector.ts`).
2. Declare which `HorizonEventType`s it applies to in `appliesTo`.
3. Return `DetectionResult[]` with a stable `dedupeKey` so re-processing the same event (or the same underlying fact from a different event) doesn't create duplicate detections.
4. Register it in `src/detectors/index.ts`.
5. Add a unit test under `tests/unit/detectors/` using a fake Prisma client (see `tests/unit/detectors/dustAttack.test.ts` for the pattern).

## Adding a new notification channel

Implement `NotificationChannelHandler` (`src/notifications/types.ts`) and pass it into `NotificationDispatcher`'s constructor alongside the existing channels.
