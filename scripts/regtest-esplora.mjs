import assert from 'node:assert/strict'
import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export function withoutMiningAnalytics(compose) {
  const begin = '\n  mempool_api:'
  const end = '\n  mempool_web:'
  assert.equal(compose.split(begin).length, 2, 'Expected one mempool_api service')
  assert.equal(compose.split(end).length, 2, 'Expected one mempool_web service')
  const start = compose.indexOf(begin)
  const stop = compose.indexOf(end)
  assert(stop > start, 'Unexpected mempool service order')
  const service = compose.slice(start, stop)
  const flags = [...service.matchAll(/DATABASE_ENABLED: "(true|false)"/g)]
  assert.equal(flags.length, 1, 'Expected one explicit mempool API database setting')
  return (
    compose.slice(0, start) +
    service.replace('DATABASE_ENABLED: "true"', 'DATABASE_ENABLED: "false"') +
    compose.slice(stop)
  )
}

export async function configureRegtestEsplora(regtestRoot) {
  const file = resolve(regtestRoot, 'docker/compose.base.yml')
  const original = await readFile(file, 'utf8')
  const configured = withoutMiningAnalytics(original)
  if (configured !== original) await writeFile(file, configured)
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await configureRegtestEsplora(resolve(process.argv[2] ?? 'regtest'))
}
