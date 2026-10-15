// @vitest-environment node
import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { promisify } from 'node:util'
import { fileURLToPath } from 'node:url'
import { it } from 'vitest'

const execute = promisify(execFile)

it.each([false, true])(
  'closes setup context and redacts all disposal failures (close rejects: %s)',
  async (closeRejects) => {
    const directory = await mkdtemp(join(tmpdir(), 'taxi-setup-cleanup-'))
    assert.equal(dirname(directory), tmpdir())
    const write = async (path, content) => {
      const target = join(directory, path)
      await mkdir(dirname(target), { recursive: true })
      await writeFile(target, content)
    }
    try {
      const assetId = 'ab'.repeat(34)
      const token = 'setup-private-fixture-token'
      const marker = join(directory, 'closed.txt')
      const solver = join(directory, 'solver')
      const env = {
        ...process.env,
        TAXI_NATIVE_REGTEST_ENV_FILE: join(directory, 'wallet.env'),
        TAXI_NATIVE_SOLVER_ROOT: solver,
        TAXI_NATIVE_SOLVER_ENV_FILE: join(directory, 'solver.env'),
        TAXI_NATIVE_REGTEST_FIXTURE_FILE: 'fixture.json',
        TAXI_REGTEST_ENV_FILE: join(directory, 'infra.env'),
        TAXI_NATIVE_RFQ_ASSET_ID: assetId,
        TAXI_NATIVE_PRICE_FEED_URL: 'http://localhost:8080/price',
        TAXI_NATIVE_ADVERTISED_RELAY_URL: 'wss://localhost:8081',
        TAXI_REGTEST_ARKD_URL: 'http://localhost:8082',
        TAXI_REGTEST_URL: 'http://localhost:8083',
        TAXI_REGTEST_ADMIN_URL: 'http://localhost:8084',
        ARK_SERVER_URL: 'http://localhost:8082',
        TAXI_URL: 'http://localhost:8083',
        SWAP_NETWORK: 'regtest',
        TAXI_RECEIVER_ALLOW_PRIVATE: '1',
        ASSET_MARKETS: `ARFQ:${assetId}`,
        VITE_EMULATOR_PUBKEY: `02${'11'.repeat(32)}`,
        TAXI_NATIVE_TEST_TOKEN: token,
        TAXI_NATIVE_TEST_MARKER: marker,
      }
      for (const file of ['wallet.env', 'solver.env', 'infra.env']) await write(file, '')
      await write('solver/package.json', JSON.stringify({ type: 'module' }))
      await write(
        'solver/node_modules/@arkade-os/sdk/package.json',
        JSON.stringify({ version: '0.5.0-test', main: 'dist/index.js' }),
      )
      await write('solver/node_modules/@arkade-os/sdk/dist/index.js', '')
      await write(
        'solver/packages/solver-app/dist/config.js',
        'export const loadConfig = () => ({ assetQuoteValiditySeconds: 60, arkade: {} })',
      )
      await write('solver/packages/solver-app/dist/admin/db.js', 'export const AdminStore = {}')
      await write('solver/packages/solver-corridors/dist/db/layout.js', 'export const resolveDbLayout = () => ({})')
      await write('solver/packages/solver-core/dist/core/assetMarketConfig.js', 'export const DEFAULT_SERVING = {}')
      await write(
        'solver/packages/solver-arkade/dist/arkade/wallet.js',
        `
      import { appendFileSync } from 'node:fs'
      export const createArkadeContext = async () => ({
        wallet: {
          indexerProvider: { getAssetDetails: async () => { throw new Error('fixture preparation failed') } },
          dispose: async () => { throw new Error('disposal failed: ' + process.env.TAXI_NATIVE_TEST_TOKEN) },
        },
        close: () => {
          appendFileSync(process.env.TAXI_NATIVE_TEST_MARKER, 'closed\\n')
          if (${closeRejects}) throw new Error('close failed: ' + process.env.TAXI_NATIVE_TEST_TOKEN)
        },
      })
    `,
      )
      const script = fileURLToPath(new URL('./taxi-native-setup.mjs', import.meta.url))
      const result = await execute(process.execPath, [script], { cwd: directory, env, windowsHide: true }).catch(
        (error) => error,
      )
      assert.equal(result.code, 1)
      assert.equal(await readFile(marker, 'utf8'), 'closed\n')
      assert.match(result.stderr, /fixture preparation failed/)
      assert.match(result.stderr, /disposal failed: \[redacted\]/)
      if (closeRejects) assert.match(result.stderr, /close failed: \[redacted\]/)
      assert(!`${result.stdout}${result.stderr}`.includes(token))
    } finally {
      assert.equal(dirname(resolve(directory)), tmpdir())
      await rm(directory, { recursive: true, force: true })
    }
  },
)
