import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { chmod, copyFile, mkdir, mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import test from 'node:test'
import {
  checkPython,
  parseOptions,
  pinnedRequirements,
  pyInstallerArguments,
  rustHost,
  sidecarTarget,
  virtualenvEnvironment,
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

test('prepends virtualenv tools to child PATH without mutating the parent environment', () => {
  const windows = { Path: 'C:\\tools;C:\\Windows', HOME: 'wallet' }
  assert.deepEqual(virtualenvEnvironment('C:\\venv\\Scripts', windows, 'win32'), {
    Path: 'C:\\venv\\Scripts;C:\\tools;C:\\Windows',
    HOME: 'wallet',
  })
  assert.equal(windows.Path, 'C:\\tools;C:\\Windows')
  assert.deepEqual(virtualenvEnvironment('/venv/bin', { PATH: '/usr/bin', path: 'preserved' }, 'darwin'), {
    PATH: '/venv/bin:/usr/bin',
    path: 'preserved',
  })
})

test('source-build subprocesses can discover an executable installed in the virtualenv', async (context) => {
  const root = await mkdtemp(join(tmpdir(), 'sidecar-build-environment-'))
  assert.equal(dirname(root), tmpdir())
  const scriptsDirectory = join(root, 'scripts')
  await mkdir(scriptsDirectory)
  context.after(() => rm(root, { recursive: true, force: true }))
  const tool = 'sidecar-backend-fixture'
  const executable = join(scriptsDirectory, `${tool}${process.platform === 'win32' ? '.exe' : ''}`)
  await copyFile(process.execPath, executable)
  await chmod(executable, 0o755)
  const originalPath = process.env.PATH
  const result = spawnSync(tool, ['-e', 'process.stdout.write("backend available")'], {
    env: virtualenvEnvironment(scriptsDirectory),
    encoding: 'utf8',
    shell: false,
  })
  assert.equal(result.error, undefined)
  assert.equal(result.status, 0, result.stderr)
  assert.equal(result.stdout, 'backend available')
  assert.equal(process.env.PATH, originalPath)
})

test('keeps all dependency versions pinned, including platform-only build dependencies', async () => {
  const contents = await readFile(new URL('../resources/requirements.txt', import.meta.url), 'utf8')
  const { requirements } = pinnedRequirements(contents)
  assert.ok(requirements.includes('macholib==1.16.4; sys_platform == "darwin"'))
  assert.ok(requirements.includes('pywin32-ctypes==0.2.3; sys_platform == "win32"'))
  assert.ok(requirements.includes('pefile==2023.2.7; sys_platform == "win32"'))
  assert.throws(() => pinnedRequirements('setuptools>=70\npysatochip==0.18.5'))
  assert.throws(() => pinnedRequirements('pysatochip==0.18.5'))
})

test('bootstraps the pinned cryptography source-build dependencies in dependency order', () => {
  const contents = ['cryptography==50.0.2', 'maturin==1.14.1', 'cffi==2.1.1', 'setuptools==84.2.1', 'pycparser==3.12']
  assert.deepEqual(pinnedRequirements(contents.join('\n')).bootstrap, [
    'setuptools==84.2.1',
    'pycparser==3.12',
    'cffi==2.1.1',
    'maturin==1.14.1',
  ])
  for (const dependency of ['setuptools', 'pycparser', 'cffi', 'maturin']) {
    assert.throws(
      () => pinnedRequirements(contents.filter((line) => !line.startsWith(`${dependency}==`)).join('\n')),
      new RegExp(`Pin ${dependency} before building sidecar dependencies`),
    )
  }
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
