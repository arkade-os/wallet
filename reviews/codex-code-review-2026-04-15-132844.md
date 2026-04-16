# Codex code review — Ionic polish sprint

**Scope:** Uncommitted diff on branch `wt-ionic-polish-20260415` (rebased off `origin/master`, on top of 7 migration commits). Review checks the mobile-polish + design-system pass + receive-qrcode bugfix.

**Rounds:** 2
**Final verdict:** APPROVED

## Round 1 — REVISE (5 issues)

1. **iOS Safari haptics disabled + reduced-motion first-fire bug** (`src/lib/haptics.ts:26`)
   - `if (!WebHaptics.isSupported) return null` gated out iOS, because the library's false branch is exactly where it falls back to the hidden-switch Taptic hack.
   - `reducedMotion` flag read before media query ever loaded.
2. **Haptics typing wrong** (`src/lib/haptics.ts:17`, `src/providers/haptics.tsx:17`)
   - Used `HapticPreset` (object `{pattern}` shape) as the call-site type instead of a string preset name. Caused fresh `tsc` errors in Button / Switch / Checkbox.
3. **Switch thumb off-center** (`src/components/ui/switch.tsx:38`)
   - New `h-6 w-11` track with `size-5` thumb, but checked transform stayed `translate-x-[calc(100%-2px)]` = 18px. Travel distance is 22px → 6px gap on right.
4. **Receive QR loader too broad** (`src/screens/Wallet/Receive/QrCode.tsx:391`)
   - `waitingForLnSwaps` only checked `satoshis > 0 && connected`, not `validLnSwap(satoshis)`. Amounts below LN minimum sat behind a 5s spinner unnecessarily.
5. **Shadow `@theme` self-cycle** (`src/app.css:159`)
   - `--shadow-sm: var(--shadow-sm)` created a CSS custom property cycle; Tailwind v4 utilities didn't resolve to the token values.

## Round 2 — APPROVED

All 5 fixes verified correct:
- `src/lib/haptics.ts`: removed `isSupported` gate, added `ensureReducedMotionInit()` that runs at the top of `triggerHaptic()` before the early return
- `src/lib/haptics.ts` + `src/providers/haptics.tsx`: new local `HapticName` string union (light | medium | heavy | soft | rigid | selection | success | warning | error | nudge | buzz)
- `src/components/ui/switch.tsx`: `translate-x-[calc(100%+2px)]` — works for both `default` (20+2=22px) and `sm` (12+2=14px)
- `src/screens/Wallet/Receive/QrCode.tsx`: added `validLnSwap(satoshis)` to `waitingForLnSwaps`
- `src/tokens.css` renamed `--shadow-*` to `--elevation-*`; `src/app.css` @theme maps `--shadow-*: var(--elevation-*)`

## Verification

- `pnpm build` passes (both rounds)
- `pnpm test:unit`: 170 pass / 2 skipped (includes the 2 formerly-failing receive-qrcode tests, now green)
- `pnpm exec tsc --noEmit`: all haptics-related type errors resolved; remaining errors are pre-existing baseline issues in unrelated files

## Outstanding / flagged as follow-up

- Real-device haptic validation on iOS Safari + Android Chrome
- Failing Playwright tests on CI (separate issue — likely regtest environment, not this diff)
