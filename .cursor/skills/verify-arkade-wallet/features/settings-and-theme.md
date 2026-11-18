# Settings and theme

Where preferences live, including the dark theme.

## Sub-features

- Menu: **Buy or sell Bitcoin** first, then General (Currency, Display, Notifications, Language, Notes, About,
  Support, Advanced) and Security (Backup, Lock, Reset wallet). Rows sit in flat groups.
- Display → Theme: Auto, Dark, Light. Auto follows the system and says which it resolved to.
- The choice is stored in `localStorage.config.theme`, applied as `palette-dark` on `<html>`, and mirrored in
  `meta[name="theme-color"]` (`#0e0c12` dark, `#fff` light) so the browser chrome matches.
- The QR code stays black on white in both themes so it scans.

## How to get to it (user POV)

Home → the gear at the top right → **Display** → **Theme**. On desktop, Settings is in the sidebar.

## Driving it with Playwright

`node .cursor/skills/verify-arkade-wallet/scripts/drive.cjs settings-theme [--viewport=desktop]`

- Open: `top-right-settings` (phone) or `desktop-nav-settings`, then `header-title-settings`.
- Rows: `.settings-row__label`; Buy or sell is `settings-buy-sell`.
- Theme options: `select-option-0` Auto, `select-option-1` Dark, `select-option-2` Light.
- Back: `header-back-btn`; on desktop `desktop-nav-home`.

Proof for each choice: `config.theme`, the `palette-dark` class and the `theme-color` meta all agree, and Dark
still holds after a reload. The journey ends on Auto so that `--theme` decides what later journeys see.

## Gotchas

- An explicit Dark or Light overrides the system scheme. If a `--theme=dark` run looks light, an earlier
  journey or a person left the profile on Light; `settings-theme` puts it back on Auto.
- Dark needs a look as well as a pass. Run `home` and `receive` with `--theme=dark` and read the screenshots:
  the assertions prove the theme applied, not that every surface is legible.
- Not covered: the other settings screens, changing language or currency, Backup, Lock and Reset. Backup shows
  the recovery phrase; do not screenshot or log it.
