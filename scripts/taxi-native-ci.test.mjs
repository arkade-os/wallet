// @vitest-environment node
import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { it } from 'vitest'
import { appendEvidence, cleanupOwnedStages, port, refs } from './taxi-native-ci.mjs'

it('uses the actual workflow source checkpoints for every native checkout', async () => {
  const workflow = await readFile(new URL('../.github/workflows/playwright.yml', import.meta.url), 'utf8')
  const pins = new Map(
    [...workflow.matchAll(/^\s+repository: (\S+)\r?\n\s+ref: ([a-f0-9]{40})\r?$/gm)].map(([, repo, ref]) => [
      repo,
      ref,
    ]),
  )
  for (const [name, repository] of [
    ['solver', 'arkade-os/intent-solver'],
    ['taxi', 'ArkLabsHQ/arkade-taxi'],
    ['regtest', 'ArkLabsHQ/arkade-regtest'],
  ])
    assert.equal(refs[name], pins.get(repository), `Wrong ${name} source checkpoint`)
  assert(Object.isFrozen(refs))
})

it('refuses an occupied required port and leaves its existing owner running', async () => {
  const server = createServer((_request, response) => response.end('existing owner'))
  await new Promise((done, reject) => server.once('error', reject).listen(0, '127.0.0.1', done))
  const occupied = server.address().port
  try {
    await assert.rejects(port(occupied), /Required native port .* is unavailable/)
  } finally {
    try {
      assert.equal(await (await fetch(`http://127.0.0.1:${occupied}`)).text(), 'existing owner')
    } finally {
      await new Promise((done) => server.close(done))
    }
  }
})

it('uses an available required port while retaining distinct dynamic allocations', async () => {
  const server = createServer()
  await new Promise((done, reject) => server.once('error', reject).listen(0, '127.0.0.1', done))
  const requested = server.address().port
  await new Promise((done) => server.close(done))

  assert.equal(await port(requested), String(requested))
  const first = await port()
  const second = await port()
  assert.notEqual(first, second)
  for (const value of [first, second]) assert(!['60413', '60423', '60432', '60433'].includes(value))
})

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

it('cleans infrastructure and restores registries after browser cleanup rejects', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'taxi-native-cleanup-'))
  const file = join(directory, 'registry.json')
  const temporary = join(directory, 'temporary.json')
  const calls = []
  try {
    await writeFile(file, 'modified registry')
    await writeFile(temporary, 'temporary registry')
    const failures = await cleanupOwnedStages({
      before: [
        async () => {
          throw new Error('Evidence directory failed')
        },
      ],
      context: {
        wallet: {
          dispose: async () => {
            throw new Error('Wallet dispose failed')
          },
        },
        close: async () => {
          throw new Error('Context close failed {"private_key":"never-upload"}')
        },
      },
      closeFeed: async () => calls.push('feed'),
      saveLogs: async () => {
        throw null
      },
      relayStarted: true,
      captureLogs: async () => calls.push('logs'),
      cleanRelay: async () => calls.push('relay'),
      cleanInfra: async () => calls.push('infra'),
      cleanImages: async () => calls.push('images'),
      registryBackups: [
        [join(directory, 'missing', 'registry.json'), 'original registry'],
        [file, 'original registry'],
        [temporary, null],
      ],
    })
    assert.deepEqual(calls, ['feed', 'logs', 'relay', 'infra', 'images'])
    assert.deepEqual(failures.slice(0, 4), [
      'Evidence directory failed',
      'Wallet dispose failed',
      'Context close failed {"private_key":"[redacted]"}',
      'null',
    ])
    assert.equal(failures.length, 5)
    assert.match(failures[4], /ENOENT/)
    assert.equal(await readFile(file, 'utf8'), 'original registry')
    await assert.rejects(readFile(temporary), { code: 'ENOENT' })
  } finally {
    await rm(directory, { recursive: true })
  }
})
