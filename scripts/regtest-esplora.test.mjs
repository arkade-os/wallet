// @vitest-environment node
import { expect, it } from 'vitest'
import { withoutMiningAnalytics } from './regtest-esplora.mjs'

const compose = `services:
  another_service:
    environment:
      DATABASE_ENABLED: "true"
  mempool_api:
    environment:
      DATABASE_ENABLED: "true"
      MEMPOOL_BACKEND: electrum
      ELECTRUM_HOST: fulcrum
      CORE_RPC_HOST: bitcoin
  mempool_web:
    environment:
      DATABASE_ENABLED: "true"
`

it('disables only mining analytics while preserving the real Esplora backend', () => {
  const expected = compose.replace(
    '  mempool_api:\n    environment:\n      DATABASE_ENABLED: "true"',
    '  mempool_api:\n    environment:\n      DATABASE_ENABLED: "false"',
  )
  expect(withoutMiningAnalytics(compose)).toBe(expected)
  expect(withoutMiningAnalytics(expected)).toBe(expected)
})

it.each([
  compose.replace('  mempool_api:', '  renamed_api:'),
  compose.replace('  mempool_web:', '  renamed_web:'),
  compose.replace('  mempool_api:', '  mempool_api:\n  mempool_api:'),
  compose.replace(
    '  mempool_api:\n    environment:\n      DATABASE_ENABLED: "true"',
    '  mempool_api:\n    environment:\n      DATABASE_ENABLED: true',
  ),
])('refuses a changed service contract rather than patching another setting', (changed) => {
  expect(() => withoutMiningAnalytics(changed)).toThrow()
})
