# Contributing

Thanks for helping build ScamWatchXLM. This is an open-source project and contributions of all sizes are welcome — new detectors, bug fixes, documentation, tests.

## Getting set up

```bash
cp .env.example .env
docker compose -f docker-compose.dev.yml up -d
npm install
npm run prisma:migrate
npm run dev
```

## Development workflow

1. Create a branch off `main`: `git checkout -b feat/short-description`.
2. Make your change. Keep it scoped — one logical change per PR.
3. Add or update tests. New detectors need a unit test (see `tests/unit/detectors/`); new endpoints need an integration test (see `tests/integration/`).
4. Run the checks locally before pushing:
   ```bash
   npm run lint
   npm run typecheck
   npm test
   ```
5. Commits must follow [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`) — enforced by commitlint via a Husky `commit-msg` hook.
6. Open a PR against `main`. CI runs lint, typecheck, tests with coverage, and a Docker build.

## Code style

- Strict TypeScript — avoid `any`; if you must use it, it should be narrowly scoped and commented why.
- Prefer composition and dependency injection (see how services take a `PrismaClient` in their constructor) over singletons and global state, so everything stays unit-testable.
- Detectors must be side-effect free — read via the injected `DetectorContext`, return `DetectionResult[]`. All persistence happens centrally in `StreamProcessorService`.
- Don't add abstractions for hypothetical future needs. Match the existing module boundaries (`api/`, `detectors/`, `services/`, `risk/`, `alerts/`, `notifications/`, `workers/`, `jobs/`).
- Comments explain *why*, not *what* — the code should be readable without them for the "what".

## Adding a detector

See [Architecture → Adding a new detector](ARCHITECTURE.md#adding-a-new-detector).

## Reporting bugs / requesting features

Open a GitHub issue with steps to reproduce (for bugs) or the motivating scam pattern (for detector requests). Include example Horizon transaction/account IDs where possible (testnet is fine).

## Security

If you find a vulnerability, please do not open a public issue — see `SECURITY.md` (or email the maintainers) for responsible disclosure instructions.
