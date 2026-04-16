# Codex code review — full branch (post-rebase onto latest master)

**Scope:** origin/master..HEAD (15 commits, ~12,889 line diff). Ionic→Tailwind migration + design-system sprint + mobile polish.
**Rounds:** 2
**Final verdict:** APPROVED

## Round 1 — REVISE (4 issues)

1. **[HIGH] Content.tsx:19** — `touch-action: pan-down` blocks upward scrolling
2. **[HIGH] QrCode.tsx:184, :459** — LN timeout/warning fires for sub-minimum amounts (inconsistent with render gate)
3. **[MEDIUM] SheetModal.tsx:20, Reminder.tsx:63** — drawer migration dropped safe-area bottom padding
4. **[MEDIUM] index.css:408, Scanner.tsx:13, Menu.tsx:25, Table.tsx:69** — stale --dark* tokens from master's new commits

## Round 2 — APPROVED

All 4 fixed and verified:
- Content.tsx: `manipulation` (allows both scroll directions, kills double-tap zoom)
- QrCode.tsx: both timeout side-effect AND warning banner gated on `validLnSwap(satoshis)`
- SheetModal + Reminder: `max(padding, env(safe-area-inset-bottom))` restores home-indicator clearance
- All stale `--dark*` / `color='dark'` refs replaced with `--neutral-*` / `--fg`
- Repo-wide sweep confirmed no remaining `--dark*` references
- 171 unit tests pass, build clean
