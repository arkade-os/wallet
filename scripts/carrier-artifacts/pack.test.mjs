// @vitest-environment node
import { spawnSync } from 'node:child_process'
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect, it } from 'vitest'

const scripts = dirname(fileURLToPath(import.meta.url))
const manifestText = readFileSync(join(scripts, '../../vendor/carrier/manifest.json'), 'utf8')

it.each([undefined, null, 42, {}, '', '.', '..', 'manifest.json', '../archive.tgz', '..\\archive.tgz', 'archive.tar'])(
  'rejects invalid archive filename %j before touching vendor files',
  (file) => {
    const root = mkdtempSync(join(tmpdir(), 'wallet-pack-filename-'))
    try {
      const scriptDir = join(root, 'scripts', 'carrier-artifacts')
      const bundle = join(root, 'bundle')
      const vendor = join(root, 'vendor', 'carrier')
      mkdirSync(scriptDir, { recursive: true })
      mkdirSync(bundle)
      mkdirSync(vendor, { recursive: true })
      for (const script of ['pack.mjs', 'lib.mjs']) copyFileSync(join(scripts, script), join(scriptDir, script))
      writeFileSync(join(vendor, 'manifest.json'), 'existing manifest')
      writeFileSync(join(vendor, 'archive.tgz'), 'existing archive')
      const manifest = JSON.parse(manifestText)
      manifest.artifacts[0].file = file
      writeFileSync(join(bundle, 'manifest.json'), JSON.stringify(manifest))

      const result = spawnSync(process.execPath, [join(scriptDir, 'pack.mjs'), '--bundle', bundle], {
        encoding: 'utf8',
      })

      expect(result.status).toBe(1)
      expect(result.stderr).toContain('archive filename must be a .tgz basename')
      expect(result.stderr).not.toContain('TypeError')
      expect(readdirSync(vendor).sort()).toEqual(['archive.tgz', 'manifest.json'])
      expect(readFileSync(join(vendor, 'manifest.json'), 'utf8')).toBe('existing manifest')
      expect(readFileSync(join(vendor, 'archive.tgz'), 'utf8')).toBe('existing archive')
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  },
)
