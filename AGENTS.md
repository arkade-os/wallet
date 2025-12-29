# Repository Guidelines

## Project Structure & Module Organization
- `src/` contains the React + Ionic application code. Entry points are `src/index.tsx` and `src/App.tsx`.
- `src/components/` holds reusable UI building blocks (e.g., `AlertBox.tsx`, `Button.tsx`).
- `src/screens/` groups feature flows by area (e.g., `Apps/`, `Settings/`, `Wallet/`).
- `src/lib/` and `src/providers/` contain shared utilities and context/state providers.
- `src/test/` mirrors app structure for unit/integration tests, with `src/test/e2e/` for Playwright specs.
- `public/` stores static assets; `docs/` and `mockup/` hold documentation and imagery.
- `scripts/` includes helper scripts like `scripts/git-commit-info.js`.

## Build, Test, and Development Commands
- `pnpm install`: install dependencies.
- `pnpm start`: run the dev server (Vite) at `http://localhost:3002`.
- `pnpm build`: production build to `dist/`.
- `pnpm test`: run all Vitest tests.
- `pnpm test:unit`: run unit/integration tests (excludes e2e).
- `pnpm test:coverage`: run tests with coverage reporting.
- `pnpm test:e2e`: run Playwright e2e tests (requires regtest).
- `pnpm regtest`: set up the local regtest stack via Docker and Nigiri.
- `pnpm lint` / `pnpm format`: lint or format `src/`.

## Coding Style & Naming Conventions
- TypeScript + React, bundled with Vite; keep changes compatible with Ionic components.
- Prettier enforces 2-space indentation, single quotes, no semicolons, 120-char lines.
- ESLint uses `react-app`; fix issues before pushing.
- Component files use PascalCase; tests use `*.test.ts` or `*.test.tsx` naming.

## Testing Guidelines
- Unit/integration tests use Vitest + React Testing Library under `src/test/`.
- E2E tests use Playwright in `src/test/e2e/` and require `pnpm regtest`.
- Keep tests colocated with the matching feature area where possible.

## Commit & Pull Request Guidelines
- Commit history favors concise, imperative summaries (e.g., “fix …”, “Introduce …”).
- PRs should include: purpose, testing notes (commands run), and screenshots for UI changes.
- Link related issues or tickets when applicable.

## Security & Configuration Tips
- Use `VITE_*` environment variables to point at Ark/Boltz endpoints or enable services.
- Store local overrides in a non-committed env file (e.g., `.env.local`).
- Never commit secrets or production credentials.
