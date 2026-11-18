// Dev tool: screenshots of preview-harness screens, tiled side by side.
// Usage: node scripts/preview-shots.cjs <out.png> <light|dark|both> <Screen[@state]> [...]
// Needs `pnpm vite --port 3002` running. See docs/redesign/README.md.
let chromium
try {
  chromium = require('playwright').chromium
} catch {
  chromium = require('@playwright/test').chromium
}

const [out, themeArg, ...specs] = process.argv.slice(2)
const themes = themeArg === 'both' ? ['light', 'dark'] : [themeArg]
const base = process.env.PREVIEW_URL ?? 'http://localhost:3002/preview.html'
const W = 390
const H = Number(process.env.SHOT_H ?? 844)
const frames = []
for (const theme of themes) {
  for (const spec of specs) {
    const [screen, state = ''] = spec.split('@')
    frames.push(`${base}?screen=${screen}&theme=${theme}&state=${state}`)
  }
}
const cols = Math.min(frames.length, Number(process.env.SHOT_COLS ?? 4))
const rows = Math.ceil(frames.length / cols)
const html = `<body style="margin:0;background:#888;display:grid;grid-template-columns:repeat(${cols},${W}px);gap:12px;padding:12px">${frames
  .map((src) => `<iframe src="${src}" style="width:${W}px;height:${H}px;border:0;background:#fff"></iframe>`)
  .join('')}</body>`
;(async () => {
const browser = await chromium.launch()
const page = await browser.newPage({
  viewport: { width: cols * (W + 12) + 12, height: rows * (H + 12) + 12 },
  deviceScaleFactor: Number(process.env.SHOT_SCALE ?? 1),
})
await page.setContent(html)
await page.waitForTimeout(Number(process.env.SHOT_WAIT ?? 2500))
await page.screenshot({ path: out })
await browser.close()
})()
