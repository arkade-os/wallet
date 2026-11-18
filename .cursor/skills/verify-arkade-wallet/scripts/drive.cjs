#!/usr/bin/env node
/**
 * Drive the Arkade wallet the way a user would and leave evidence behind.
 *
 *   node .cursor/skills/verify-arkade-wallet/scripts/drive.cjs <journey...> [--theme=light|dark] [--viewport=mobile|desktop] [--run=<id>]
 *
 * Journeys: onboarding, home, receive, settings-theme, send (see ../features/).
 * It drives the instance launch.sh started (port read from the run directory)
 * through the real UI only: no test endpoints, no storage writes, no mocks.
 * Storage, the service worker and the clipboard are READ to prove side effects.
 * It never reads or records the recovery phrase or any private key.
 */
const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '../../../..')
const RUN_DIR = path.join(ROOT, '.verify/arkade-wallet/run')
const EVIDENCE_DIR = path.join(ROOT, '.verify/arkade-wallet/evidence')

function loadPlaywright() {
  // The repo's own Playwright first; a global one when its browser is not installed.
  for (const name of ['@playwright/test', 'playwright']) {
    try {
      const pw = require(name)
      if (fs.existsSync(pw.chromium.executablePath())) return pw
    } catch {
      /* try the next one */
    }
  }
  throw new Error('No Playwright with an installed Chromium. Run: pnpm exec playwright install chromium')
}

const args = process.argv.slice(2)
const flag = (name, fallback) => (args.find((a) => a.startsWith(`--${name}=`)) ?? `--${name}=${fallback}`).split('=')[1]
const journeys = args.filter((a) => !a.startsWith('--'))
const theme = flag('theme', 'light')
const viewport = flag('viewport', 'mobile')
const runId = flag('run', new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19))

class Precondition extends Error {}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function main() {
  if (!journeys.length) throw new Error('Name at least one journey: onboarding, home, receive, settings-theme, send')
  if (!fs.existsSync(path.join(RUN_DIR, 'port'))) throw new Error('No launched instance. Run launch.sh, then doctor.sh.')
  const port = fs.readFileSync(path.join(RUN_DIR, 'port'), 'utf8').trim()
  const base = `http://localhost:${port}`
  const { chromium, devices } = loadPlaywright()

  // One profile per run: journeys share the throwaway wallet, and cleanup removes it.
  const context = await chromium.launchPersistentContext(path.join(RUN_DIR, 'profile'), {
    ...(viewport === 'mobile' ? devices['Pixel 7'] : { viewport: { width: 1280, height: 800 } }),
    colorScheme: theme === 'dark' ? 'dark' : 'light',
    locale: 'en-US',
    permissions: ['clipboard-read', 'clipboard-write'],
  })
  const page = context.pages()[0] ?? (await context.newPage())
  const results = []
  let failed = false

  for (const name of journeys) {
    const journey = JOURNEYS[name]
    if (!journey) throw new Error(`Unknown journey "${name}"`)
    const dir = path.join(EVIDENCE_DIR, runId, `${name}-${viewport}-${theme}`)
    fs.mkdirSync(dir, { recursive: true })
    const log = { journey: name, viewport, theme, base, startedAt: new Date().toISOString(), steps: [], pageErrors: [] }
    const consoleErrors = []
    const onPageError = (e) => log.pageErrors.push(String(e.message ?? e))
    const onConsole = (m) => m.type() === 'error' && consoleErrors.push(m.text())
    page.on('pageerror', onPageError)
    page.on('console', onConsole)

    let n = 0
    const shot = async (label) => {
      const file = `${String(++n).padStart(2, '0')}-${label}.png`
      await page.screenshot({ path: path.join(dir, file) })
      return file
    }
    /** One user action plus the state it left behind. A screenshot follows every step. */
    const step = async (label, fn) => {
      const entry = { step: label, ok: false }
      log.steps.push(entry)
      try {
        entry.observed = (await fn()) ?? null
        await sleep(450) // let the transition settle so the picture shows the resulting state
        entry.screenshot = await shot(label)
        entry.ok = true
      } catch (err) {
        entry.error = String(err.message ?? err).split('\n')[0]
        entry.precondition = err instanceof Precondition
        entry.screenshot = await shot(`${label}-FAILED`).catch(() => undefined)
        throw err
      }
    }

    try {
      await journey({ page, base, step, context })
      if (log.pageErrors.length) throw new Error(`uncaught page error: ${log.pageErrors[0]}`)
      log.result = 'passed'
    } catch (err) {
      failed = true
      log.result = err instanceof Precondition ? 'failed (precondition)' : 'failed'
      log.reason = String(err.message ?? err).split('\n')[0]
    }
    page.off('pageerror', onPageError)
    page.off('console', onConsole)
    log.finishedAt = new Date().toISOString()
    fs.writeFileSync(path.join(dir, 'steps.json'), JSON.stringify(log, null, 2))
    fs.writeFileSync(path.join(dir, 'console-errors.log'), consoleErrors.join('\n'))
    results.push(`${log.result.padEnd(22)} ${name}  ->  ${path.relative(ROOT, dir)}${log.reason ? `\n    ${log.reason}` : ''}`)
  }

  await context.close()
  console.log(results.join('\n'))
  process.exit(failed ? 1 : 0)
}

// ── What the app shows ────────────────────────────────────────────────

const onHome = (page) => page.getByTestId('home-action-send')
// From 1024px the header actions give way to a sidebar (DesktopWalletShell).
const isDesktop = (page) => (page.viewportSize()?.width ?? 0) >= 1024
const settingsEntry = (page) => page.getByTestId(isDesktop(page) ? 'desktop-nav-settings' : 'top-right-settings')
/** Leave a settings screen for Home: the sidebar on desktop, Back until Home on a phone. */
async function backToHome(page) {
  if (isDesktop(page)) await page.getByTestId('desktop-nav-home').click()
  // Home stays in the DOM while the next screen slides over it, so "Send is visible" is not
  // enough: Home is where we are only once no screen with a Back button is on top of it.
  const back = page.getByTestId('header-back-btn')
  const atHome = async () =>
    (await onHome(page).isVisible().catch(() => false)) && !(await back.isVisible().catch(() => false))
  await sleep(450)
  for (let i = 0; i < 6 && !(await atHome()); i++) {
    await back.click()
    await sleep(450)
  }
  await back.waitFor({ state: 'hidden' })
  await onHome(page).waitFor({ state: 'visible' })
}
const welcome = (page) => page.getByTestId('onboarding-devmode-tap')
const createChoice = (page) => page.getByTestId('onboarding-create')

/** Public facts only. The wallet record holds no secret, and nothing here reads one. */
const persisted = (page) =>
  page.evaluate(async () => {
    const wallet = JSON.parse(localStorage.getItem('wallet') ?? '{}')
    const config = JSON.parse(localStorage.getItem('config') ?? '{}')
    const reg = await navigator.serviceWorker?.getRegistration()
    return {
      hasWallet: Boolean(wallet.pubkey),
      theme: config.theme ?? null,
      serviceWorker: reg?.active?.state ?? null,
      darkClass: document.documentElement.classList.contains('palette-dark'),
      themeColor: document.querySelector('meta[name="theme-color"]')?.getAttribute('content') ?? null,
    }
  })

const clipboard = (page) => page.evaluate(() => navigator.clipboard.readText())
const short = (v) => (v.length > 44 ? `${v.slice(0, 28)}…${v.slice(-8)} (${v.length} chars)` : v)

async function waitForHome(page, timeout = 120_000) {
  const stuck = page.getByText('Continue anyway')
  await onHome(page).or(stuck).first().waitFor({ state: 'visible', timeout })
  if (await stuck.isVisible().catch(() => false)) throw new Error('boot stopped on its error screen ("Continue anyway")')
}

/** Home, with a wallet. Creates the throwaway wallet through onboarding when the profile is fresh. */
async function openHome({ page, base, step }) {
  await step('open', async () => {
    await page.goto(base)
    await onHome(page).or(welcome(page)).first().waitFor({ state: 'visible', timeout: 90_000 })
    return (await welcome(page).isVisible()) ? 'fresh profile: onboarding shown' : 'wallet present: Home shown'
  })
  if (await welcome(page).isVisible()) {
    await step('create-wallet', async () => {
      await createChoice(page).click()
      await waitForHome(page)
      return persisted(page)
    })
  }
}

// ── Journeys ──────────────────────────────────────────────────────────

const JOURNEYS = {
  /** A new user goes from the welcome screen to a wallet that is still there after a reload. */
  async onboarding({ page, base, step }) {
    await step('welcome', async () => {
      await page.goto(base)
      await welcome(page).or(onHome(page)).first().waitFor({ state: 'visible', timeout: 90_000 })
      if (await onHome(page).isVisible()) {
        throw new Precondition('this profile already holds a wallet; onboarding needs a fresh run (cleanup.sh, launch.sh)')
      }
      await createChoice(page).waitFor({ state: 'visible' })
      // Both choices only enable once the Arkade server has answered.
      await page.waitForFunction(() => !document.querySelector('[data-testid="onboarding-create"]')?.disabled, null, {
        timeout: 60_000,
      })
      return {
        heading: await welcome(page).textContent(),
        choices: (await page.locator('.onboard__choice').allInnerTexts()).map((t) => t.replace(/\s+/g, ' ')),
        brandMarkOnScreen: await page.locator('svg path[fill="#391998"], [class*="logo" i]').count(),
      }
    })
    await step('restore-is-one-tap-away', async () => {
      // The second way in. Only reached, never filled: this skill does not handle recovery phrases.
      await page.getByTestId('onboarding-restore').click()
      await page.getByTestId('header-title-restore-wallet').waitFor({ state: 'visible' })
      return 'Restore wallet opened straight from the screen'
    })
    await step('back-to-the-choices', async () => {
      await page.getByTestId('header-back-btn').click()
      await createChoice(page).waitFor({ state: 'visible' })
      return { heading: await welcome(page).textContent() }
    })
    await step('create-wallet', async () => {
      await createChoice(page).click()
      await waitForHome(page)
      const state = await persisted(page)
      if (!state.hasWallet) throw new Error('Home is showing but no wallet was persisted')
      return state
    })
    await step('reload-keeps-wallet', async () => {
      await page.reload()
      await waitForHome(page)
      if (await welcome(page).isVisible().catch(() => false)) throw new Error('reload returned to onboarding')
      const state = await persisted(page)
      if (!state.hasWallet) throw new Error('wallet missing after reload')
      if (state.serviceWorker !== 'activated') throw new Error(`service worker is ${state.serviceWorker}, not activated`)
      return state
    })
  },

  /** Home shows the balance, the two money actions, and only Scan and Settings in the header. */
  async home(ctx) {
    const { page, step } = ctx
    await openHome(ctx)
    await step('home', async () => {
      // Scan is on Home at every width: it is the only way to scan, including redeeming a note.
      const expected = isDesktop(page)
        ? ['home-action-receive', 'home-action-send', 'home-action-scan', 'desktop-nav-home', 'desktop-nav-activity', 'desktop-nav-settings']
        : ['home-action-receive', 'home-action-send', 'home-action-scan', 'top-right-settings']
      for (const id of expected) await page.getByTestId(id).waitFor({ state: 'visible' })
      const gone = {}
      for (const id of ['top-right-activity', 'quick-action-apps', 'home-action-apps']) {
        gone[id] = await page.getByTestId(id).count()
        if (gone[id]) throw new Error(`${id} is back on Home`)
      }
      const headerButtons = await page
        .locator('header button:visible')
        .evaluateAll((els) => els.map((e) => e.getAttribute('aria-label')))
      if (!isDesktop(page) && headerButtons.length !== 2) {
        throw new Error(`Home header should hold Scan and Settings only, found: ${headerButtons}`)
      }
      return {
        balance: (await page.locator('.home-hero').first().innerText()).replace(/\s+/g, ' ').trim(),
        headerButtons,
        headings: await page.getByRole('heading').allTextContents(),
        removed: gone,
      }
    })
    await step('settings-and-back', async () => {
      await settingsEntry(page).click()
      await page.getByTestId('header-title-settings').waitFor({ state: 'visible' })
      await backToHome(page)
      return 'Settings opened and Home came back'
    })
    // View all is there with or without history: on a phone it is the only way into Activity.
    await step('activity-and-back', async () => {
      await page.getByTestId('activity-view-all').click()
      await page.getByTestId('header-title-activity').waitFor({ state: 'visible' })
      const empty = await page.getByText('No transactions yet').count()
      await page.goBack()
      await onHome(page).waitFor({ state: 'visible' })
      return { opened: 'Activity', emptyState: Boolean(empty), back: 'browser Back returned to Home' }
    })
  },

  /** Receive: copy the default code, switch format, request an amount. Proven by the clipboard. */
  async receive(ctx) {
    const { page, step } = ctx
    await openHome(ctx)
    const qr = page.getByRole('button', { name: 'Copy QR code' })
    await step('open-receive', async () => {
      await page.getByTestId('home-action-receive').click()
      await page.getByTestId('header-title-receive').waitFor({ state: 'visible' })
      await qr.waitFor({ state: 'visible', timeout: 60_000 })
      await page.waitForFunction(() => !document.querySelector('[aria-label="Copy QR code"]')?.disabled, null, { timeout: 60_000 })
      return { closeLabel: await page.getByTestId('header-back-btn').getAttribute('aria-label') }
    })
    await step('copy-default-code', async () => {
      await qr.click()
      const value = await clipboard(page)
      if (!/^bitcoin:/i.test(value)) throw new Error(`default code should be a unified bitcoin: URI, clipboard holds "${short(value)}"`)
      return { clipboard: short(value), carriesArkAddress: /[?&]ark=/.test(value) }
    })
    await step('open-other-formats', async () => {
      await page.getByTestId('receive-formats').click()
      const group = page.getByRole('radiogroup')
      await group.waitFor({ state: 'visible' })
      const options = await group.getByRole('radio').evaluateAll((els) =>
        els.map((e) => `${e.querySelector('.formats__name')?.textContent} [${e.getAttribute('aria-checked')}]`),
      )
      return { options }
    })
    // The sheet is a named dialog around one radio group: arrows move the selection without
    // closing it, and Back closes the sheet and stays on Receive.
    await step('formats-sheet-keyboard-and-back', async () => {
      const dialog = page.getByRole('dialog', { name: 'Other formats' })
      await dialog.waitFor({ state: 'visible' })
      const radios = dialog.getByRole('radio')
      const checked = () => radios.evaluateAll((els) => els.findIndex((e) => e.getAttribute('aria-checked') === 'true'))
      const before = await checked()
      await radios.nth(before).focus()
      await page.keyboard.press('ArrowDown')
      const after = await checked()
      if (after === before) throw new Error('ArrowDown left the checked format unchanged')
      await page.keyboard.press('ArrowUp')
      if ((await checked()) !== before) throw new Error('ArrowUp did not move the selection back')
      if (!(await dialog.isVisible())) throw new Error('arrow keys closed the sheet')
      await page.goBack()
      await dialog.waitFor({ state: 'hidden' })
      await page.getByTestId('header-title-receive').waitFor({ state: 'visible' })
      await page.getByTestId('receive-formats').click()
      await page.getByRole('radiogroup').waitFor({ state: 'visible' })
      return { dialogName: 'Other formats', arrowDown: `${before} -> ${after}`, back: 'closed the sheet, still on Receive' }
    })
    await step('pick-arkade', async () => {
      await page.getByRole('radiogroup').getByRole('radio', { name: /Arkade/ }).click()
      await page.getByRole('radiogroup').waitFor({ state: 'hidden' })
      const row = await page.getByTestId('receive-formats').innerText()
      await qr.click()
      const value = await clipboard(page)
      if (/^bitcoin:/i.test(value) || !/^t?ark1/i.test(value)) throw new Error(`expected a bare Arkade address, clipboard holds "${short(value)}"`)
      return { formatsRow: row.replace(/\s+/g, ' '), clipboard: short(value) }
    })
    await step('request-amount', async () => {
      await page.getByRole('button', { name: 'Add amount' }).click()
      // Phones get the keypad; a desktop gets a field in a sheet. Either way the user types 1000.
      const keypad = page.getByTestId('keyboard-1')
      const field = page.locator('input[name="receive-amount-sheet"]')
      await keypad.or(field).first().waitFor({ state: 'visible' })
      if (await keypad.isVisible()) {
        for (const key of ['1', '0', '0', '0']) await page.getByTestId(`keyboard-${key}`).click()
        // A request can be any size: an empty wallet asking for 1,000 is not "more than your balance".
        if (await page.getByText('More than your balance').count()) throw new Error('balance warning shown on a requested amount')
        await page.getByTestId('save-amount').click()
      } else {
        await field.fill('1000')
        await page.getByRole('button', { name: 'Set amount' }).click()
      }
      await page.getByTestId('receive-amount').waitFor({ state: 'visible' })
      await page.getByRole('button', { name: 'Edit amount' }).waitFor({ state: 'visible' })
      return { figure: await page.getByTestId('receive-amount').innerText() }
    })
    await step('close', async () => {
      await page.getByTestId('header-back-btn').click()
      await onHome(page).waitFor({ state: 'visible' })
      return 'closed back to Home'
    })
  },

  /** Settings: switch to Dark, prove it persisted across a reload, switch back. */
  async 'settings-theme'(ctx) {
    const { page, step } = ctx
    await openHome(ctx)
    const openSettings = async () => {
      await settingsEntry(page).click()
      await page.getByTestId('header-title-settings').waitFor({ state: 'visible' })
    }
    const openTheme = async () => {
      await page.getByText('Display', { exact: true }).click()
      await page.getByText('Theme', { exact: true }).first().click()
      await page.getByTestId('select-option-0').waitFor({ state: 'visible' })
    }
    await step('settings-menu', async () => {
      await openSettings()
      await page.getByTestId('settings-buy-sell').waitFor({ state: 'visible' })
      return { rows: await page.locator('.settings-row__label').allTextContents() }
    })
    await step('choose-dark', async () => {
      await openTheme()
      await page.getByTestId('select-option-1').click() // Auto, Dark, Light
      await page.waitForFunction(() => document.documentElement.classList.contains('palette-dark'))
      const state = await persisted(page)
      if (state.theme !== 'Dark') throw new Error(`config.theme is ${state.theme}, expected Dark`)
      return state
    })
    await step('dark-survives-reload', async () => {
      await page.reload()
      await waitForHome(page)
      const state = await persisted(page)
      if (!state.darkClass) throw new Error('reload dropped the dark theme')
      return state
    })
    await step('choose-light', async () => {
      await openSettings()
      await openTheme()
      await page.getByTestId('select-option-2').click()
      await page.waitForFunction(() => !document.documentElement.classList.contains('palette-dark'))
      const state = await persisted(page)
      if (state.theme !== 'Light') throw new Error(`config.theme is ${state.theme}, expected Light`)
      return state
    })
    await step('back-to-auto', async () => {
      // Leave the profile following the system, so --theme decides what later journeys see.
      await page.getByTestId('select-option-0').click()
      const wantDark = await page.evaluate(() => matchMedia('(prefers-color-scheme: dark)').matches)
      await page.waitForFunction((dark) => document.documentElement.classList.contains('palette-dark') === dark, wantDark)
      const state = await persisted(page)
      if (state.theme !== 'Auto') throw new Error(`config.theme is ${state.theme}, expected Auto`)
      await backToHome(page)
      return { ...state, systemPrefersDark: wantDark }
    })
  },

  /** Send to an Arkade address, review, sign, and land on the success sheet. Needs funds. */
  async send(ctx) {
    const { page, step } = ctx
    await openHome(ctx)
    await step('balance', async () => {
      const balance = (await page.locator('.home-hero').first().innerText()).replace(/\s+/g, ' ').trim()
      const empty = (await page.getByTestId('activity-view-all').count()) === 0 && /(^|\D)0([.,]00)?(\D|$)/.test(balance)
      if (empty) throw new Precondition(`send needs a funded wallet and this one shows "${balance}" with no history`)
      return { balance }
    })
    let recipient = ''
    await step('get-a-recipient', async () => {
      // Pay ourselves: a real Arkade address, taken the way a payer would get one.
      await page.getByTestId('home-action-receive').click()
      await page.getByTestId('receive-formats').click()
      await page.getByRole('radiogroup').getByRole('radio', { name: /Arkade/ }).click()
      await page.getByRole('radiogroup').waitFor({ state: 'hidden' })
      await page.getByRole('button', { name: 'Copy QR code' }).click()
      recipient = await clipboard(page)
      await page.getByTestId('header-back-btn').click()
      await onHome(page).waitFor({ state: 'visible' })
      return { recipient: short(recipient) }
    })
    await step('enter-recipient-and-amount', async () => {
      await page.getByTestId('home-action-send').click()
      await page.locator('[name="send-address"]').fill(recipient)
      const keypad = page.getByTestId('keyboard-1')
      const field = page.locator('[name="send-amount"]')
      await keypad.or(field).first().waitFor({ state: 'visible', timeout: 30_000 })
      if (await keypad.isVisible()) {
        for (const key of ['1', '0', '0', '0']) await page.getByTestId(`keyboard-${key}`).click()
        // A request can be any size: an empty wallet asking for 1,000 is not "more than your balance".
        if (await page.getByText('More than your balance').count()) throw new Error('balance warning shown on a requested amount')
        await page.getByTestId('save-amount').click()
      } else {
        await field.fill('1000')
        await page.getByRole('button', { name: 'Continue' }).click()
      }
      await page.getByTestId('header-title-sign-transaction').waitFor({ state: 'attached', timeout: 30_000 })
      return 'review sheet shown'
    })
    await step('sign', async () => {
      await page.getByRole('button', { name: 'Tap to Sign' }).click()
      await page.getByTestId('success-sheet').waitFor({ state: 'visible', timeout: 120_000 })
      return { sheet: (await page.getByTestId('success-sheet').innerText()).replace(/\s+/g, ' ') }
    })
    await step('done-shows-activity', async () => {
      await page.getByRole('button', { name: 'Sounds good' }).click()
      await onHome(page).waitFor({ state: 'visible' })
      await page.getByTestId('activity-view-all').waitFor({ state: 'visible', timeout: 30_000 })
      return { firstRow: (await page.locator('.activity-row').first().innerText()).replace(/\s+/g, ' ') }
    })
  },
}

main().catch((err) => {
  console.error(`drive: ${err.message}`)
  process.exit(2)
})
