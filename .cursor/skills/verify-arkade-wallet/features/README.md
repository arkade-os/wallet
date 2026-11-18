# Feature map

What a user can do in the Arkade wallet, and how to prove each part still works. One file per feature. Every
file answers the same four questions: what it is made of, how a person reaches it, how to drive it with
Playwright, and what has bitten before.

| Feature | File | Journey | Entry points |
| --- | --- | --- | --- |
| Onboarding | `onboarding.md` | `onboarding` | First open with no wallet |
| Home | `home.md` | `home` | App open with a wallet; sidebar Home on desktop |
| Receive | `receive.md` | `receive` | Home → Receive; asset detail → Receive |
| Send | `send.md` | `send` | Home → Send; Scan; asset detail → Send; a `bitcoin:` / `lightning:` link |
| Settings and theme | `settings-and-theme.md` | `settings-theme` | Home header gear; sidebar Settings on desktop |

A proof through one entry point is not a proof of the others. Each file names the entry points its journey
does not cover.

Run a journey with `node .cursor/skills/verify-arkade-wallet/scripts/drive.cjs <journey>` after `launch.sh`.
See `../SKILL.md`.

Not mapped yet: Swap, Activity and transaction detail, asset detail, restore, password and lock, Notes, the
Assets app, Buy or sell. Add a file here and a journey in `scripts/drive.cjs` when you touch one.
