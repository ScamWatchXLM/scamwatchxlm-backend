# Deployment

## Docker Compose (single host)

The simplest production-like deployment: `docker-compose.yml` runs Postgres, Redis, the API, and the worker as four containers.

```bash
cp .env.example .env   # set JWT_SECRET, HORIZON_URL/STELLAR_NETWORK, notification webhooks
docker compose up --build -d
docker compose logs -f api worker
```

The `api` container runs `prisma migrate deploy` on boot before starting the server. The `worker` container starts the Horizon monitor and all BullMQ workers.

Scale API replicas horizontally (the worker should stay at one replica — the Horizon stream isn't sharded):

```bash
docker compose up --build -d --scale api=3
```

Put a load balancer in front of the API replicas; WebSocket clients on any replica receive alerts via the Redis pub/sub bridge (see `docs/ARCHITECTURE.md`), so it doesn't matter which replica a client connects to.

## Kubernetes / other orchestrators

The `Dockerfile`'s `runtime` target is a minimal, non-root image suitable for any container platform:

- **api Deployment**: `command: ["node", "dist/index.js"]`, readiness/liveness probe on `GET /health`, horizontally scalable.
- **worker Deployment**: `command: ["node", "dist/workers/index.js"]`, `replicas: 1`.
- **migration Job**: run `npx prisma migrate deploy` as a pre-deploy Job or init container against the api Deployment.
- Both need `DATABASE_URL` and `REDIS_URL` pointed at managed Postgres/Redis (or in-cluster StatefulSets), plus the secrets listed in [Environment variables](#environment-variables).

## Environment variables

See `.env.example` for the full list with defaults. At minimum for production, set:

| Variable | Why |
| --- | --- |
| `DATABASE_URL` | Postgres connection string |
| `REDIS_URL` | Redis connection string |
| `JWT_SECRET` | Long random string — rotating it invalidates all existing sessions |
| `STELLAR_NETWORK`, `HORIZON_URL` | `public` + `https://horizon.stellar.org` for mainnet |
| `CORS_ORIGIN` | Restrict to your frontend's origin(s) instead of `*` |
| `DISCORD_WEBHOOK_URL` / `SLACK_WEBHOOK_URL` / `SMTP_*` / `GENERIC_WEBHOOK_URLS` | At least one notification channel, or alerts are logged but never delivered externally |
| `NOTIFICATIONS_MIN_SEVERITY` | Raise to `critical` in high-volume environments to reduce noise |

## Database migrations

Migrations are managed by Prisma. In development: `npm run prisma:migrate` (creates + applies). In CI/production: `npx prisma migrate deploy` (applies only, never generates — this is what runs automatically in the `api` container's startup command).

## Observability

- Structured JSON logs via Pino (`LOG_LEVEL` controls verbosity); pretty-printed automatically outside `production`.
- `GET /health` reports Postgres and Redis connectivity — wire it to your platform's liveness/readiness checks.
- BullMQ job outcomes are logged by each worker (`failed`/`completed` events in `src/workers/index.ts`); for production visibility, consider adding [Bull Board](https://github.com/felixmosh/bull-board) as an admin-only route.

## Backups

Standard PostgreSQL backup practices apply (managed provider snapshots, `pg_dump`, or WAL archiving). Redis holds only ephemeral queue/cache/pub-sub state — nothing there needs to be durable across a full loss.
