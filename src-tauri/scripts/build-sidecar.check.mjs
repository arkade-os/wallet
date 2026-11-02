import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import test from 'node:test'
import {
  checkPython,
  parseOptions,
  pinnedRequirements,
  pyInstallerArguments,
  rustHost,
  sidecarTarget,
  virtualenvPython,
} from './build-sidecar.mjs'

test('maps native desktop architectures to Tauri external binary names', () => {
  for (const [platform, arch, triple] of [
    ['win32', 'x64', 'x86_64-pc-windows-msvc'],
    ['win32', 'arm64', 'aarch64-pc-windows-msvc'],
    ['darwin', 'x64', 'x86_64-apple-darwin'],
    ['darwin', 'arm64', 'aarch64-apple-darwin'],
    ['linux', 'x64', 'x86_64-unknown-linux-gnu'],
    ['linux', 'arm64', 'aarch64-unknown-linux-gnu'],
    ['linux', 'x64', 'x86_64-unknown-linux-musl'],
  ]) {
    const target = sidecarTarget(platform, arch, triple)
    assert.equal(target.bundled, `satochip-bridge-${triple}${platform === 'win32' ? '.exe' : ''}`)
  }
})

test('refuses cross-compiled, wrong-OS and unsupported helper labels', () => {
  assert.throws(() => sidecarTarget('darwin', 'arm64', 'aarch64-apple-darwin', 'x86_64-apple-darwin'))
  assert.throws(() => sidecarTarget('darwin', 'arm64', 'x86_64-apple-darwin'))
  assert.throws(() => sidecarTarget('linux', 'x64', 'x86_64-pc-windows-msvc'))
  assert.throws(() => sidecarTarget('linux', 'riscv64', 'riscv64gc-unknown-linux-gnu'))
  assert.equal(rustHost('rustc 1.96.0\nhost: x86_64-unknown-linux-gnu\nrelease: 1.96.0'), 'x86_64-unknown-linux-gnu')
  assert.throws(() => rustHost('missing host'))
})

test('uses host virtualenv paths and keeps the explicit existing-env option narrow', () => {
  assert.equal(virtualenvPython('native', 'win32'), join('native', '.sidecar-venv', 'Scripts', 'python.exe'))
  assert.equal(virtualenvPython('native', 'darwin'), join('native', '.sidecar-venv', 'bin', 'python'))
  assert.equal(virtualenvPython('native', 'linux'), join('native', '.sidecar-venv', 'bin', 'python'))
  assert.deepEqual(parseOptions(['--python', 'venv/bin/python', '--use-existing-environment']), {
    python: 'venv/bin/python',
    useExistingEnvironment: true,
  })
  assert.throws(() => parseOptions(['--use-existing-environment']))
  assert.throws(() => parseOptions(['--python']))
  assert.throws(() => parseOptions(['--target', 'a', '--target', 'b']))
  assert.throws(() => parseOptions(['--unknown']))
})

test('rejects a global or mismatched Python before dependency installation', () => {
  checkPython({ platform: 'darwin', machine: 'arm64', virtualenv: true }, 'darwin', 'arm64', true)
  checkPython({ platform: 'win32', machine: 'AMD64', virtualenv: true }, 'win32', 'x64', true)
  assert.throws(() => checkPython({ platform: 'darwin', machine: 'x86_64', virtualenv: true }, 'darwin', 'arm64', true))
  assert.throws(() => checkPython({ platform: 'linux', machine: 'x86_64', virtualenv: false }, 'linux', 'x64', true))
})

test('keeps all dependency versions pinned, including platform-only build dependencies', async () => {
  const contents = await readFile(new URL('../resources/requirements.txt', import.meta.url), 'utf8')
  const { requirements, setuptools } = pinnedRequirements(contents)
  assert.match(setuptools, /^setuptools==/)
  assert.ok(requirements.includes('macholib==1.16.4; sys_platform == "darwin"'))
  assert.ok(requirements.includes('pywin32-ctypes==0.2.3; sys_platform == "win32"'))
  assert.ok(requirements.includes('pefile==2023.2.7; sys_platform == "win32"'))
  assert.throws(() => pinnedRequirements('setuptools>=70\npysatochip==0.18.5'))
  assert.throws(() => pinnedRequirements('pysatochip==0.18.5'))
})

test('collects card SDK certificates and native bindings on each host', () => {
  const args = pyInstallerArguments('native')
  assert.deepEqual(args.slice(args.indexOf('--collect-all'), args.indexOf('--distpath')), [
    '--collect-all',
    'pysatochip',
    '--collect-all',
    'smartcard',
  ])
  assert.ok(args.includes('--onefile'))
  assert.ok(args.includes('--console'))
  assert.equal(args.at(-1), join('native', 'resources', 'bridge.py'))
})
