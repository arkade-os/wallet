import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

describe('design tokens', () => {
  const appCss = readFileSync(resolve(process.cwd(), 'src/app.css'), 'utf8')

  it('keeps heading typography mapped to the heading font family', () => {
    expect(appCss).toContain('--font-heading: var(--font-family-heading);')
    expect(appCss).not.toContain('--font-heading: var(--font-sans);')
  })

  it('keeps shadcn inline theme overrides from redefining font families', () => {
    const inlineThemeStart = appCss.indexOf('@theme inline')
    expect(inlineThemeStart).toBeGreaterThan(-1)

    const inlineTheme = appCss.slice(inlineThemeStart)
    expect(inlineTheme).not.toContain('--font-heading:')
    expect(inlineTheme).not.toContain('--font-sans:')
  })

  it('caps heading typography at medium weight by default', () => {
    const headingWeights = appCss.match(/@utility text-heading-[\w-]+\s*\{[^}]*font-weight:\s*(\d+);/g) ?? []

    expect(headingWeights.length).toBeGreaterThan(0)
    expect(headingWeights.every((declaration) => declaration.endsWith('500;'))).toBe(true)
    expect(appCss).not.toMatch(/@utility text-heading-[\w-]+\s*\{[^}]*font-weight:\s*(600|700|800|900);/)
  })

  it('bundles the heading font into every heading text utility', () => {
    const headingUtilities = appCss.match(/@utility text-heading-[\w-]+\s*\{[^}]*\}/g) ?? []

    expect(headingUtilities.length).toBeGreaterThan(0)
    expect(headingUtilities.every((utility) => utility.includes('font-family: var(--font-family-heading);'))).toBe(true)
  })
})
