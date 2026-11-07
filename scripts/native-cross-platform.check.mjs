import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, join } from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import { resolvePlatform, requestedDesktopTarget, tauriArguments } from './native-cross-platform.mjs'

const json = (path) => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'))

test('native platform selection rejects cross-compiled Python helpers and non-Mac iOS hosts', () => {
  assert.equal(resolvePlatform('auto', 'win32'), 'windows')
  assert.equal(resolvePlatform('auto', 'darwin'), 'macos')
  assert.equal(resolvePlatform('auto', 'linux'), 'linux')
  assert.equal(resolvePlatform('ios', 'darwin'), 'ios')
  for (const [platform, host] of [['ios', 'win32'], ['ios', 'linux'], ['macos', 'linux'], ['linux', 'darwin']]) {
    assert.throws(() => resolvePlatform(platform, host), /native/)
  }
  assert.throws(() => resolvePlatform('auto', 'android'), /Unsupported/)
})

test('Windows command arguments stay intact and each other platform receives its override', () => {
  assert.deepEqual(tauriArguments('windows', 'build', ['--debug']), ['build', '--debug'])
  assert.deepEqual(tauriArguments('linux', 'dev'), ['dev', '--config', 'src-tauri/tauri.linux.conf.json'])
  assert.deepEqual(tauriArguments('macos', 'build'), ['build', '--config', 'src-tauri/tauri.macos.conf.json'])
  assert.deepEqual(tauriArguments('ios', 'init', ['--ci']), ['ios', 'init', '--config', 'src-tauri/tauri.ios.conf.json', '--ci'])
  assert.equal(tauriArguments('ios', 'prepare'), null)
  assert.throws(() => tauriArguments('linux', 'init'))
  assert.throws(() => tauriArguments('ios', 'publish'))
})

test('one explicit desktop target is passed to the matching-native guard', () => {
  assert.equal(requestedDesktopTarget(['--debug', '--target', 'aarch64-apple-darwin']), 'aarch64-apple-darwin')
  assert.equal(requestedDesktopTarget(['--target=x86_64-unknown-linux-gnu']), 'x86_64-unknown-linux-gnu')
  assert.equal(requestedDesktopTarget([]), undefined)
  assert.throws(() => requestedDesktopTarget(['--target']))
  assert.throws(() => requestedDesktopTarget(['-t', 'a', '--target=b']))
})

test('platform overrides retain desktop notices and exclude all Python resources on iOS', () => {
  const base = json('../src-tauri/tauri.conf.json')
  const ios = json('../src-tauri/tauri.ios.conf.json')
  const linux = json('../src-tauri/tauri.linux.conf.json')
  const mac = json('../src-tauri/tauri.macos.conf.json')
  assert.deepEqual(ios.bundle.externalBin, [])
  assert.deepEqual(ios.bundle.resources, [])
  assert.equal(ios.bundle.iOS.minimumSystemVersion, '14.0')
  assert.equal(ios.bundle.iOS.infoPlist, 'ios/Info.plist')
  assert.equal(linux.bundle.resources, undefined)
  assert.equal(mac.bundle.resources, undefined)
  assert.ok(base.bundle.resources.includes('resources/THIRD_PARTY_NOTICES.md'))
  assert.ok(base.bundle.resources.includes('resources/licenses/'))
  assert.ok(base.bundle.externalBin.includes('binaries/satochip-bridge'))
  assert.ok(linux.bundle.linux.deb.depends.includes('libpcsclite1'))
  assert.ok(linux.bundle.linux.deb.recommends.includes('gnome-keyring'))
  assert.equal(mac.bundle.macOS.hardenedRuntime, true)
  assert.equal(mac.bundle.macOS.infoPlist, 'macos/Info.plist')
  assert.equal(mac.bundle.macOS.entitlements, 'macos/Entitlements.plist')
  const cameraEntitlements = readFileSync(new URL('../src-tauri/macos/Entitlements.plist', import.meta.url), 'utf8')
  assert.deepEqual([...cameraEntitlements.matchAll(/<key>([^<]+)<\/key>/g)].map((match) => match[1]),
    ['com.apple.security.device.camera'])
})

test('override fields exist in the installed Tauri configuration schema', () => {
  const schema = json('../node_modules/@tauri-apps/cli/config.schema.json')
  const ios = schema.definitions.IosConfig.properties
  for (const field of ['minimumSystemVersion', 'frameworks', 'infoPlist']) assert.ok(ios[field])
  assert.equal(ios.entitlements, undefined)
  const mac = schema.definitions.MacConfig.properties
  for (const field of ['minimumSystemVersion', 'hardenedRuntime']) assert.ok(mac[field])
  for (const field of ['depends', 'recommends']) assert.ok(schema.definitions.DebConfig.properties[field])
})

test('macOS bundle selects a valid ICNS produced from the wallet icon', () => {
  const base = json('../src-tauri/tauri.conf.json')
  const mac = json('../src-tauri/tauri.macos.conf.json')
  const icons = mac.bundle.icon ?? base.bundle.icon
  const icns = icons.find((path) => path.endsWith('.icns'))
  assert.ok(icns, 'macOS bundling requires an ICNS icon')
  const output = mkdtempSync(join(tmpdir(), 'arkade-icons-'))
  try {
    const cli = fileURLToPath(new URL('../node_modules/@tauri-apps/cli/tauri.js', import.meta.url))
    const source = fileURLToPath(new URL('../public/arkade-icon-512.png', import.meta.url))
    const result = spawnSync(process.execPath, [cli, 'icon', source, '--output', output], {
      cwd: output, encoding: 'utf8',
    })
    assert.equal(result.error, undefined)
    assert.equal(result.status, 0, result.stdout + result.stderr)
    const data = readFileSync(join(output, basename(icns)))
    assert.equal(data.subarray(0, 4).toString(), 'icns')
    assert.equal(data.readUInt32BE(4), data.length)
    assert.ok(data.length > 8)
  } finally {
    rmSync(output, { recursive: true, force: true })
  }
})

test('iOS metadata preparation preserves existing Xcode work and rejects conflicts', () => {
  const script = new URL('../src-tauri/ios/prepare-host.check.py', import.meta.url)
  const result = spawnSync(process.platform === 'win32' ? 'python' : 'python3', [fileURLToPath(script)],
    { encoding: 'utf8', shell: false })
  assert.equal(result.error, undefined)
  assert.equal(result.status, 0, result.stdout + result.stderr)
})
