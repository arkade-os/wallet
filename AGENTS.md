# AGENTS.md

This file defines working guidelines for AI coding agents in this repository.

## Project Overview

- Name: Arkade OS Wallet
- Stack: React + TypeScript + Vite + Vitest + Playwright
- Package manager: pnpm (workspace present)
- App source: `src/`
- UI components: `src/components/`
- Tests: `src/test/`, `playwright.config.ts`, `test-results/`
- Regtest tooling: `regtest/`

## Primary Goals For Agents

1. Make minimal, focused changes that solve the user request.
2. Preserve existing architecture, naming, and style conventions.
3. Keep wallet behavior safe and predictable (no silent behavior changes).
4. Validate changes with relevant tests or type checks when feasible.

## Safety Rules

- Do not hardcode secrets, private keys, mnemonics, or tokens.
- Do not log sensitive values (passwords, seeds, `nsec`, auth headers, session material).
- Do not weaken existing security controls (auth, middleware, CSP/service worker behavior).
- Avoid destructive git commands unless explicitly requested.

## Editing Guidelines

- Prefer small diffs over broad refactors.
- Match existing coding patterns before introducing new abstractions.
- Add brief comments only for non-obvious logic.
- Update docs when behavior, flows, or developer commands change.

## Frontend Conventions

- Reuse shared components from `src/components/` before creating new ones.
- Keep state close to the feature; lift only when needed.
- Preserve accessibility basics: labels, keyboard flow, focus visibility, semantic elements.
- Keep responsive behavior intact for mobile-first wallet usage.
- Respect current styling tokens and CSS organization (`src/app.css`, `src/index.css`, `src/tokens.css`).
- Prefer Tailwind utilities for new UI work; add or update CSS only when utilities are insufficient or when maintaining shared design tokens/global styles.

## TypeScript And Quality Bar

- Favor explicit types on public boundaries and complex return values.
- Avoid `any` unless there is no practical alternative.
- Handle nullable/undefined values defensively around wallet and network operations.
- Surface user-facing errors clearly with existing UI primitives.

## Testing Expectations

Use the smallest meaningful validation first, then expand if needed.

- Unit/integration (Vitest): target impacted files and logic paths.
- E2E (Playwright): run when changes affect critical flows (onboarding, send/receive, swaps).
- For bug fixes, add or update at least one test when practical.

Suggested commands (run from repository root):

```bash
pnpm install
pnpm test
pnpm vitest
pnpm playwright test
pnpm build
```

If a script differs, inspect `package.json` and use the exact available command.

## Regtest And Local Infra

- Use `regtest/` tooling and docs when reproducing chain/swap behavior.
- Prefer deterministic, scriptable steps over manual one-off setup.
- Record assumptions in PR/patch notes when environment parity is incomplete.

## Workflow For Agents

1. Read the request and inspect only relevant files.
2. Propose or apply minimal changes.
3. Run focused checks/tests for touched behavior.
4. Summarize what changed, validation performed, and residual risks.

## Commit Guidance

- Keep commits atomic and descriptive.
- Group related code + tests + docs in the same commit.
- Avoid mixing unrelated cleanups with functional changes.

## Definition Of Done

A task is complete when:

1. The requested behavior is implemented.
2. Relevant checks/tests pass or failures are explained.
3. No obvious regressions are introduced in nearby flows.
4. Documentation is updated when needed.

## Quick File Map

- App entry: `src/index.tsx`, `src/App.tsx`
- Shared UI: `src/components/`
- Hooks/providers/lib: `src/hooks/`, `src/providers/`, `src/lib/`
- Service worker: `src/wallet-service-worker.ts`, `public/wallet-service-worker.mjs`
- Build and tooling config: `vite.config.ts`, `vitest.config.ts`, `playwright.config.ts`, `tsconfig.json`

## Notes For Future Agents

- Prefer `rg` for fast search and targeted code discovery.
- Validate only what is relevant to keep iteration fast.
- If you discover repository-specific conventions not listed here, append them to this file.
