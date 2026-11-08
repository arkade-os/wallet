import assert from 'node:assert/strict'
import { readFile, readdir } from 'node:fs/promises'
import test from 'node:test'

test('native host forbids remote frames and grants card access only to local windows', async () => {
  const root = new URL('../src-tauri/', import.meta.url)
  const config = JSON.parse(await readFile(new URL('tauri.conf.json', root), 'utf8'))
  const framePolicy = config.app.security.csp
    .split(';')
    .map((value) => value.trim())
    .find((value) => value.startsWith('frame-src '))
  assert.equal(framePolicy, "frame-src 'none'")
  const directory = new URL('capabilities/', root)
  for (const filename of await readdir(directory)) {
    if (!filename.endsWith('.json')) continue
    const capability = JSON.parse(await readFile(new URL(filename, directory), 'utf8'))
    assert.equal(capability.remote, undefined, `${filename} must not grant native access to remote content`)
    assert.deepEqual(capability.windows, ['main'])
    if (capability.identifier === 'native-wallet') {
      assert.ok(capability.permissions.includes('satochip:allow-inspect'))
      assert.ok(capability.permissions.includes('satochip:allow-setup-card'))
    }
  }
})

test('release native libraries are stripped before Android packaging', async () => {
  const config = await readFile(new URL('../src-tauri/Cargo.toml', import.meta.url), 'utf8')
  assert.match(config, /\[profile\.release\]\s+strip = true\s*$/m)
})
