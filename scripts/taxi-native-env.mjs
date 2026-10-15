import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { parseEnv } from 'node:util'

export const fixtureKeys = [
  'TAXI_NATIVE_RFQ_ASSET_ID',
  'TAXI_NATIVE_RFQ_SOLVER_ADDRESS',
  'TAXI_NATIVE_RFQ_ATOMIC_UNITS',
  'TAXI_NATIVE_RFQ_FARE_SATS',
]

/** @param {NodeJS.ProcessEnv} env @param {string} name */
export function requiredValue(env, name) {
  const value = env[name]?.trim()
  if (!value) throw new Error(`Missing ${name}`)
  return value
}

/** @param {NodeJS.ProcessEnv} env @param {string} name @param {string[]} [protocols] */
export function endpoint(env, name, protocols = ['http:', 'https:']) {
  const value = requiredValue(env, name)
  const url = new URL(value)
  if (!protocols.includes(url.protocol) || url.username || url.password || url.search || url.hash)
    throw new Error(`${name} must be an absolute credential-free endpoint`)
  return url.href.replace(/\/$/, '')
}

export function loadNativeEnv({ required = false, fixture = true } = {}) {
  const path = resolve(process.env.TAXI_NATIVE_REGTEST_ENV_FILE ?? '.env.test.local')
  if (required && !existsSync(path)) throw new Error('Provide a private TAXI_NATIVE_REGTEST_ENV_FILE')
  const env = { ...(existsSync(path) ? parseEnv(readFileSync(path, 'utf8')) : {}), ...process.env }
  const fixturePath = env.TAXI_NATIVE_REGTEST_FIXTURE_FILE
  if (fixture && fixturePath && existsSync(fixturePath)) {
    const values = JSON.parse(readFileSync(fixturePath, 'utf8'))
    for (const key of fixtureKeys) {
      if (typeof values[key] !== 'string') throw new Error(`Native fixture is missing ${key}`)
      env[key] = values[key]
    }
  } else if (required && fixture) throw new Error('Run taxi-native-setup.mjs to create the native fixture first')
  return env
}

/** @param {unknown} error @param {NodeJS.ProcessEnv} env */
export function sanitizedError(error, env) {
  let message = error instanceof Error ? error.message : 'Unknown native regtest failure'
  for (const [key, value] of Object.entries(env)) {
    if (/MNEMONIC|SECRET|PASSWORD|TOKEN|API_KEY/.test(key) && value) message = message.split(value).join('[redacted]')
  }
  return message
}
