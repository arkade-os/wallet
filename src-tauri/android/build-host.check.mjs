import assert from 'node:assert/strict'
import test from 'node:test'
import { androidBuildTarget, canCopyWindowsLibrary } from './build-host.mjs'

const completedBuild =
  'Finished `dev` profile [unoptimized + debuginfo] target(s)\nInfo symlinking lib "C:/build/aarch64-linux-android/debug/libarkade_native_lib.so" in jniLibs dir\nCreation symbolic link is not allowed for this system.'
const debugArgs = ['--debug', '--apk', '--target', 'aarch64']

test('permits the copy fallback only after the exact Windows ARM64 debug symlink failure', () => {
  assert.equal(canCopyWindowsLibrary('win32', debugArgs, completedBuild), true)
  assert.equal(canCopyWindowsLibrary('linux', debugArgs, completedBuild), false)
  assert.equal(canCopyWindowsLibrary('win32', ['--apk', '--target', 'aarch64'], completedBuild), false)
  assert.equal(canCopyWindowsLibrary('win32', ['--debug', '--apk', '--target', 'x86_64'], completedBuild), false)
})

test('does not turn compile, packaging, or missing-build failures into success', () => {
  assert.equal(canCopyWindowsLibrary('win32', debugArgs, 'Rust compilation failed'), false)
  assert.equal(canCopyWindowsLibrary('win32', debugArgs, completedBuild.replace('Finished', 'Failed')), false)
  assert.equal(
    canCopyWindowsLibrary(
      'win32',
      debugArgs,
      completedBuild.replace('Creation symbolic link is not allowed for this system.', 'Gradle compilation failed'),
    ),
    false,
  )
})

test('supports explicit x86_64 emulator builds with the matching completed library', () => {
  const output = completedBuild.replace('aarch64-linux-android', 'x86_64-linux-android')
  const args = ['--debug', '--apk', '--target', 'x86_64']
  assert.equal(canCopyWindowsLibrary('win32', args, output), true)
  assert.equal(canCopyWindowsLibrary('win32', ['--debug', '--apk', '--target=x86_64'], output), true)
  assert.equal(canCopyWindowsLibrary('win32', args, completedBuild), false)
  assert.deepEqual(androidBuildTarget(args), {
    name: 'x86_64',
    triple: 'x86_64-linux-android',
    abi: 'x86_64',
    arch: 'x86_64',
    variant: 'X86_64',
  })
})

test('refuses missing, unsupported, duplicate, and multi-target fallback requests', () => {
  for (const args of [
    [],
    ['--target'],
    ['--target', 'armv7'],
    ['--target', 'aarch64,x86_64'],
    ['--target', 'aarch64', '--target=x86_64'],
  ]) {
    assert.equal(androidBuildTarget(args), undefined)
    assert.equal(canCopyWindowsLibrary('win32', ['--debug', '--apk', ...args], completedBuild), false)
  }
})
