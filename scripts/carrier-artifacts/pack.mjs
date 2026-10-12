#!/usr/bin/env node

import { copyFileSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  MANIFEST_PATH,
  PINNED_DIGESTS,
  PINNED_PACKAGES,
  VENDOR_DIR,
  archiveManifest,
  pinnedSourceMismatch,
  readJson,
  sha256,
} from './lib.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')
const bundleFlag = process.argv.indexOf('--bundle')
if (bundleFlag < 0 || !process.argv[bundleFlag + 1])
  throw new Error('usage: pack.mjs --bundle <frozen five-archive bundle>')
const bundle = resolve(process.argv[bundleFlag + 1])
const manifest = readJson(join(bundle, 'manifest.json'))
const artifacts = manifest.artifacts ?? []
if (JSON.stringify(artifacts.map(({ package: name }) => name).sort()) !== JSON.stringify([...PINNED_PACKAGES].sort()))
  throw new Error('bundle must contain exactly the five pinned packages')
for (const artifact of artifacts) {
  if (
    typeof artifact.file !== 'string' ||
    !artifact.file.endsWith('.tgz') ||
    artifact.file !== artifact.file.split(/[\\/]/).pop()
  )
    throw new Error('archive filename must be a .tgz basename')
  const mismatch = pinnedSourceMismatch(artifact)
  if (mismatch) throw new Error(mismatch)
  const bytes = readFileSync(join(bundle, artifact.file))
  if (sha256(bytes) !== PINNED_DIGESTS[artifact.package] || artifact.sha256 !== PINNED_DIGESTS[artifact.package])
    throw new Error(`${artifact.file} differs from the frozen candidate bytes`)
  const packed = archiveManifest(join(bundle, artifact.file))
  if (bytes.length !== artifact.bytes || packed.name !== artifact.package || packed.version !== artifact.version)
    throw new Error(`${artifact.file} has inconsistent archive metadata`)
  if (!artifact.license || !artifact.toolchain?.node || !artifact.toolchain?.pnpm || !artifact.toolchain?.command)
    throw new Error(`${artifact.file} is missing provenance metadata`)
}
const destination = join(root, VENDOR_DIR)
mkdirSync(destination, { recursive: true })
const unexpected = readdirSync(destination).filter(
  (file) => file !== 'manifest.json' && !artifacts.some((artifact) => artifact.file === file),
)
if (unexpected.length) throw new Error(`destination contains other files: ${unexpected.join(', ')}`)
for (const artifact of artifacts) copyFileSync(join(bundle, artifact.file), join(destination, artifact.file))
writeFileSync(join(root, MANIFEST_PATH), `${JSON.stringify(manifest, null, 2)}\n`)
process.stdout.write(`copied ${artifacts.length} authenticated frozen archives without repacking\n`)
