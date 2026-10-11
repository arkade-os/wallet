// @vitest-environment node
import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { it } from 'vitest'
import { appendEvidence, cleanupOwnedStages } from './taxi-native-ci.mjs'

it('cleans actual infrastructure after failure before any relay was created', async () => {
  const calls = []
  const failures = await cleanupOwnedStages({
    relayStarted: false,
    captureLogs: async () => calls.push('logs'),
    cleanRelay: async () => {
      throw new Error('Missing relay.json')
    },
    cleanInfra: async () => calls.push('infra'),
    cleanImages: async () => calls.push('images'),
  })
  assert.deepEqual(calls, ['logs', 'infra', 'images'])
  assert.deepEqual(failures, [])
})

it('retains cleanup failures while still cleaning every attempted resource', async () => {
  const calls = []
  const failures = await cleanupOwnedStages({
    relayStarted: true,
    captureLogs: async () => calls.push('logs'),
    cleanRelay: async () => {
      calls.push('relay')
      throw new Error('Relay down failed')
    },
    cleanInfra: async () => {
      calls.push('infra')
      throw new Error('Infra down failed')
    },
    cleanImages: async () => calls.push('images'),
  })
  assert.deepEqual(calls, ['logs', 'relay', 'infra', 'images'])
  assert.deepEqual(failures, ['Relay down failed', 'Infra down failed'])
})

it('preserves the first crash diagnosis when fallback captures empty logs', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'taxi-native-evidence-'))
  assert.equal(dirname(directory), tmpdir())
  try {
    const file = join(directory, 'service-logs.log')
    await appendEvidence(file, 'Taxi crashed: provider rejected startup\n{"private_key":"never-upload"}')
    await appendEvidence(file, '\n')
    const saved = await readFile(file, 'utf8')
    assert(saved.includes('Taxi crashed: provider rejected startup'))
    assert(saved.includes('"private_key":"[redacted]"'))
    assert(!saved.includes('never-upload'))
  } finally {
    await rm(directory, { recursive: true })
  }
})
