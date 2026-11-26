import { existsSync } from 'node:fs'
import { spawn } from 'node:child_process'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { endpoint, loadNativeEnv, requiredValue, sanitizedError } from './taxi-native-env.mjs'

export function startNativeWebServer(env, options = {}) {
  const url = new URL(env.TAXI_NATIVE_WALLET_URL ?? 'http://127.0.0.1:3002')
  if (url.protocol !== 'http:' || !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) || !url.port)
    throw new Error('TAXI_NATIVE_WALLET_URL must be a loopback HTTP URL with an explicit port')
  if (!existsSync(resolve('public/wallet-service-worker.mjs')))
    throw new Error('Build the wallet worker before starting this test server')
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
        // The native stack starts only the emulator profile: no Executor answers at the regtest default.
        VITE_EXECUTOR_ENABLED: 'false',
      },
      ...options,
    },
  )
  return child
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  let env = process.env
  try {
    env = loadNativeEnv({ required: true })
    const child = startNativeWebServer(env)
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
}
