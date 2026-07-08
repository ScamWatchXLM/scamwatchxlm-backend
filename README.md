# scamwatchxlm-backend

The intelligence engine that monitors the Stellar network and powers the ScamWatchXLM API — an open-source scam detection platform for the Stellar ecosystem.

It streams live Horizon activity, runs it through a rule-based scam detection engine, computes risk scores, raises alerts, and exposes everything over a REST API, OpenAPI docs, and WebSockets.

## Features

- **Horizon Monitor** — streams new accounts, trustlines, payments, path payments, asset issuance, offers, account merges, signer changes, and threshold changes in near real time.
- **Detection engine** — ten rule-based detectors covering fake issuers, asset impersonation, dust attacks, spam payments, memo spam, rapid trustline/account creation, suspicious issuer activity, high-volume campaigns, and coordinated transfers.
- **Risk scoring** — every entity (account, asset, issuer) gets a 0–100 score with severity, confidence, reasons, and history.
- **Alert engine** — deduplicated alerts across four severities, exposed via REST and WebSockets.
- **Community reports** — validated report submission with evidence and a moderation workflow.
- **Search & analytics** — cross-entity search plus trending scams, top malicious assets/issuers, and network activity stats.
- **Auth** — JWT for users, hashed API keys for machine clients, role-based access, rate limiting, Helmet, CORS.
- **Background workers** — BullMQ-driven risk recalculation, alert cleanup, statistics generation, and notification dispatch.
- **Notifications** — Discord, Slack, generic webhooks, and email.

## Stack

Node.js · TypeScript · Fastify · PostgreSQL · Prisma · Redis · BullMQ · Docker · Stellar SDK · WebSockets

## Quick start

```bash
cp .env.example .env
docker compose -f docker-compose.dev.yml up -d   # Postgres + Redis only
npm install
npm run prisma:migrate
npm run prisma:seed
npm run dev            # API on :3000, docs at /docs
npm run worker:dev      # in a second terminal — Horizon monitor + background jobs
```

Run everything (API, worker, Postgres, Redis) in containers instead:

```bash
docker compose up --build
```

## Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [API reference](docs/API.md) (also served live at `/docs` via Swagger UI)
- [ER diagram](docs/ER_DIAGRAM.md)
- [Contributing](docs/CONTRIBUTING.md)
- [Deployment](docs/DEPLOYMENT.md)

## Project layout

```
src/
  api/          Fastify routes, request schemas, plugins (cors, helmet, swagger, websocket, rate limit)
  detectors/    Rule-based scam detectors + registry
  risk/         Risk scoring engine and history
  alerts/       Alert engine and severity handling
  notifications/ Discord/Slack/webhook/email delivery channels
  services/     Horizon streaming, business/domain services
  workers/      BullMQ worker processes
  jobs/         Queue definitions and cron scheduling
  websocket/    WebSocket hub and cross-process pub/sub bridge
  config/       Env validation, constants, logging
  db/           Prisma and Redis clients
  middleware/   Auth, validation, error handling
  utils/        Shared helpers
  types/        Shared TypeScript types
```

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the API with hot reload |
| `npm run worker:dev` | Start the Horizon monitor + background workers with hot reload |
| `npm run build` / `npm start` | Compile and run the production API |
| `npm test` / `npm run test:coverage` | Run the Vitest suite |
| `npm run lint` / `npm run format` | Lint and format |
| `npm run prisma:migrate` / `prisma:studio` | Database migrations / GUI |

## License

MIT
