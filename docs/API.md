# API Reference

Full interactive documentation (generated from the route schemas) is served at `/docs` (Swagger UI) and `/docs/json` (raw OpenAPI 3.0 document) when the API is running.

Base path: `/api/v1` (health check is unversioned at `/health`).

## Authentication

Two schemes, either accepted wherever auth is required:

- **JWT** — `Authorization: Bearer <token>`, obtained from `POST /api/v1/auth/login` or `/auth/register`.
- **API key** — `x-api-key: <key>` (header name configurable via `API_KEY_HEADER`), obtained from `POST /api/v1/auth/api-keys` (requires a JWT).

Roles: `USER` (default), `MODERATOR` (can review reports, acknowledge/resolve/dismiss alerts), `ADMIN` (all of the above plus flag/unflag entities and manually trigger jobs).

## Endpoints

### Health

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| GET | `/health` | none | Liveness/readiness probe; checks DB + Redis connectivity |

### Auth

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| POST | `/api/v1/auth/register` | none | Create a user account, returns a JWT |
| POST | `/api/v1/auth/login` | none | Exchange credentials for a JWT |
| POST | `/api/v1/auth/api-keys` | JWT | Create an API key |
| GET | `/api/v1/auth/api-keys` | JWT | List your API keys |
| DELETE | `/api/v1/auth/api-keys/:id` | JWT | Revoke an API key |

### Accounts

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| GET | `/api/v1/accounts` | none | List accounts (`flaggedOnly`, `page`, `pageSize`) |
| GET | `/api/v1/accounts/:publicKey` | none | Account detail with recent risk scores and alerts |
| GET | `/api/v1/accounts/:publicKey/risk-history` | none | Full risk score history |

### Assets

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| GET | `/api/v1/assets` | none | List assets (`flaggedOnly`, `issuer`, `page`, `pageSize`) |
| GET | `/api/v1/assets/:code/:issuer` | none | Asset detail with risk history and alerts |

### Alerts

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| GET | `/api/v1/alerts` | none | List alerts (`severity`, `status`, `entityType`, pagination) |
| GET | `/api/v1/alerts/:id` | none | Alert detail including notifications sent |
| POST | `/api/v1/alerts/:id/acknowledge` | MODERATOR+ | Acknowledge |
| POST | `/api/v1/alerts/:id/resolve` | MODERATOR+ | Resolve |
| POST | `/api/v1/alerts/:id/dismiss` | MODERATOR+ | Dismiss (false positive) |

### Reports

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| POST | `/api/v1/reports` | optional | Submit a community scam report |
| GET | `/api/v1/reports` | none | List reports (`status`, pagination) |
| GET | `/api/v1/reports/:id` | none | Report detail |
| POST | `/api/v1/reports/:id/review` | MODERATOR+ | Confirm/reject/re-open a report |

### Search

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| GET | `/api/v1/search?q=` | none | Search accounts, assets, issuers, transactions, and reports |

### Analytics

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| GET | `/api/v1/analytics/overview` | none | Totals: alerts, reports, detections, flagged entities |
| GET | `/api/v1/analytics/detections?sinceDays=` | none | Detection counts by detector |
| GET | `/api/v1/analytics/trending?sinceDays=&limit=` | none | Trending scams by detection volume |
| GET | `/api/v1/analytics/top-malicious-assets` | none | Highest-risk flagged assets |
| GET | `/api/v1/analytics/top-malicious-issuers` | none | Highest-risk flagged issuers |
| GET | `/api/v1/analytics/network-activity?sinceHours=` | none | Raw Horizon event volume by type |

### Admin

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| POST | `/api/v1/admin/accounts/:publicKey/flag` | ADMIN | Manually flag an account |
| POST | `/api/v1/admin/accounts/:publicKey/unflag` | ADMIN | Manually unflag an account |
| POST | `/api/v1/admin/jobs/risk-recalculation` | ADMIN | Trigger a risk recalculation pass |
| POST | `/api/v1/admin/jobs/alert-cleanup` | ADMIN | Trigger alert cleanup |
| POST | `/api/v1/admin/jobs/statistics-generation` | ADMIN | Trigger a statistics snapshot |

## WebSocket

Connect to `ws://<host>/ws`. On connect you're subscribed to the `alerts` topic by default; send a subscribe message to change topics:

```json
{ "action": "subscribe", "topics": ["alerts", "detections", "network-activity"] }
```

Server pushes:

```json
{ "topic": "alerts", "payload": { "...": "Alert record" }, "timestamp": "2026-01-01T00:00:00.000Z" }
```

## Error shape

All errors follow:

```json
{ "error": { "code": "VALIDATION_ERROR", "message": "...", "details": {} } }
```

Common codes: `VALIDATION_ERROR` (400), `UNAUTHORIZED` (401), `FORBIDDEN` (403), `NOT_FOUND` (404), `CONFLICT` (409), `RATE_LIMITED` (429), `INTERNAL_ERROR` (500).
