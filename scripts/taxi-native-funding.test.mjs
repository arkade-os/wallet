// @vitest-environment node
import assert from 'node:assert/strict'
import { mkdir, mkdtemp, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { afterEach, it, vi } from 'vitest'
import { assertNativeFundingOwnership, fundingFailure } from './taxi-native-funding.mjs'

const directories = []
afterEach(async () => {
  for (const directory of directories.splice(0)) {
    assert.equal(dirname(directory), tmpdir())
    await rm(directory, { recursive: true, force: true })
  }
})

async function fixture() {
  const walletRoot = await mkdtemp(join(tmpdir(), 'native-funding-scope-'))
  directories.push(walletRoot)
  const namespace = 'taxi-native-a1b2c3d4'
  const root = resolve(walletRoot, '.local-tests', namespace)
  await mkdir(root, { recursive: true })
  const infrastructureFile = join(root, 'infrastructure.env')
  const nativeEnvFile = join(root, 'wallet.env')
  const env = {
    TAXI_REGTEST_ENV_FILE: infrastructureFile,
    TAXI_REGTEST_ARKD_URL: 'http://127.0.0.1:32101',
    TAXI_REGTEST_ADMIN_URL: 'http://127.0.0.1:32102',
    TAXI_NATIVE_WALLET_URL: 'http://127.0.0.1:32103',
  }
  const state = { namespace, root, infrastructureEnv: infrastructureFile, taxiStarted: true }
  const saveEnv = () =>
    writeFile(
      nativeEnvFile,
      Object.entries(env)
        .map(([key, value]) => `${key}=${value}`)
        .join('\n'),
    )
  const saveState = () => writeFile(join(walletRoot, '.local-tests/native-ci-state.json'), JSON.stringify(state))
  await writeFile(
    infrastructureFile,
    `REGTEST_PROJECT=${namespace}\nREGTEST_CONTAINER_PREFIX=${namespace}-\nARKD_PORT=32101\nTAXI_ADMIN_PORT=32102\n`,
  )
  await saveEnv()
  await saveState()
  const command = vi.fn(async (name, args) => {
    assert.equal(name, 'docker')
    assert.equal(args[0], 'inspect')
    const port = args.at(-1) === `${namespace}-arkd` ? '32101' : '32102'
    return { stdout: `${namespace}\n${JSON.stringify([{ HostIp: '127.0.0.1', HostPort: port }])}\n` }
  })
  return { walletRoot, root, namespace, nativeEnvFile, env, state, saveEnv, saveState, command }
}

it('checks both owned containers and exact loopback bindings without starting or writing a proof', async () => {
  const f = await fixture()
  const scope = await assertNativeFundingOwnership(f.walletRoot, f.nativeEnvFile, f.command)
  assert.equal(scope.namespace, f.namespace)
  assert.equal(scope.root, f.root)
  assert.deepEqual(
    f.command.mock.calls.map(([, args]) => args.at(-1)),
    [`${f.namespace}-arkd`, `${f.namespace}-taxi`],
  )
  assert.deepEqual((await readdir(f.root)).sort(), ['infrastructure.env', 'wallet.env'])
})

it('reports only bounded public ownership fields, never failure prose or arbitrary properties', () => {
  const error = Object.assign(new Error('password=PRIVATE'), {
    fundingProofScope: {
      service: 'arkd',
      expectedProject: 'taxi-native-a1b2c3d4',
      observedProject: 'other',
      expectedHostPort: '32101',
      bindings: Array.from({ length: 20 }, () => ({ HostIp: '0.0.0.0', HostPort: '32101', privateKey: 'PRIVATE' })),
      mnemonic: 'PRIVATE',
    },
  })
  const summary = fundingFailure(error)
  assert.equal(summary.scope.bindings.length, 8)
  assert.equal(summary.scope.bindings[0].HostIp, '0.0.0.0')
  assert(!JSON.stringify(summary).includes('PRIVATE'))
  assert(!JSON.stringify(summary).includes('password'))
  assert.equal(fundingFailure(undefined).error, 'Error')
})

it('refuses an infrastructure env outside the exact run before opening it or contacting Docker', async () => {
  const f = await fixture()
  f.env.TAXI_REGTEST_ENV_FILE = join(f.walletRoot, 'outside.env')
  await f.saveEnv()
  await assert.rejects(assertNativeFundingOwnership(f.walletRoot, f.nativeEnvFile, f.command), {
    code: 'ERR_ASSERTION',
  })
  assert.equal(f.command.mock.calls.length, 0)
})

it('refuses stale namespace ownership before contacting Docker', async () => {
  const f = await fixture()
  f.state.namespace = 'taxi-native-ffffffff'
  await f.saveState()
  await assert.rejects(assertNativeFundingOwnership(f.walletRoot, f.nativeEnvFile, f.command), {
    code: 'ERR_ASSERTION',
  })
  assert.equal(f.command.mock.calls.length, 0)
})

it.each(['http://example.com:32101', 'http://operator:private@127.0.0.1:32101'])(
  'refuses an unowned or credential-bearing operator endpoint %s',
  async (url) => {
    const f = await fixture()
    f.env.TAXI_REGTEST_ARKD_URL = url
    await f.saveEnv()
    await assert.rejects(assertNativeFundingOwnership(f.walletRoot, f.nativeEnvFile, f.command), {
      code: 'ERR_ASSERTION',
    })
    assert.equal(f.command.mock.calls.length, 0)
  },
)

it.each([
  { project: 'unrelated', ip: '127.0.0.1', port: '32101' },
  { project: 'taxi-native-a1b2c3d4', ip: '0.0.0.0', port: '32101' },
  { project: 'taxi-native-a1b2c3d4', ip: '127.0.0.1', port: '32109' },
])('refuses mismatched live ownership or bindings %j', async ({ project, ip, port }) => {
  const f = await fixture()
  f.command.mockResolvedValue({ stdout: `${project}\n${JSON.stringify([{ HostIp: ip, HostPort: port }])}\n` })
  await assert.rejects(assertNativeFundingOwnership(f.walletRoot, f.nativeEnvFile, f.command), {
    code: 'ERR_ASSERTION',
  })
  assert.equal(f.command.mock.calls.length, 1)
  assert.deepEqual((await readdir(f.root)).sort(), ['infrastructure.env', 'wallet.env'])
})
