import { existsSync } from 'node:fs'
import { spawn } from 'node:child_process'
import { resolve } from 'node:path'
import { endpoint, loadNativeEnv, requiredValue, sanitizedError } from './taxi-native-env.mjs'

let env = process.env
try {
  env = loadNativeEnv({ required: true })
  const url = new URL(env.TAXI_NATIVE_WALLET_URL ?? 'http://127.0.0.1:3002')
  if (url.protocol !== 'http:' || !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) || !url.port)
    throw new Error('TAXI_NATIVE_WALLET_URL must be a loopback HTTP URL with an explicit port')
  if (!existsSync(resolve('public/wallet-service-worker.mjs')))
    throw new Error('Build the wallet worker from the frozen native packages before starting this test server')
  const child = spawn(
    process.execPath,
    [
      resolve('node_modules/vite/bin/vite.js'),
      '--host',
      url.hostname.replace(/^\[|\]$/g, ''),
      '--port',
      url.port,
      '--strictPort',
    ],
    {
      cwd: process.cwd(),
      windowsHide: true,
      stdio: 'inherit',
      env: {
        ...env,
        VITE_ARK_SERVER: endpoint(env, 'TAXI_REGTEST_ARKD_URL'),
        VITE_TAXI_URL: endpoint(env, 'TAXI_REGTEST_URL'),
        VITE_SOLVER_REGISTRY_URL: `${url.origin}/solver-registry/regtest.json`,
        VITE_NOSTR_RELAY_URL: endpoint(env, 'TAXI_NATIVE_ADVERTISED_RELAY_URL', ['wss:']),
        VITE_EMULATOR_PUBKEY: requiredValue(env, 'VITE_EMULATOR_PUBKEY'),
        VITE_DELEGATE_ENABLED: 'false',
      },
    },
  )
  child.once('error', () => {
    console.error('Native wallet dev server failed to start')
    process.exitCode = 1
  })
  child.once('exit', (code) => {
    process.exitCode = code ?? 1
  })
  process.once('SIGINT', () => child.kill('SIGINT'))
  process.once('SIGTERM', () => child.kill('SIGTERM'))
} catch (error) {
  console.error(sanitizedError(error, env))
  process.exitCode = 1
}
