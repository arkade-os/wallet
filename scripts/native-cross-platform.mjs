import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { rustHost, sidecarTarget } from '../src-tauri/scripts/build-sidecar.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const cli = resolve(root, 'node_modules/@tauri-apps/cli/tauri.js')
const prepare = resolve(root, 'src-tauri/ios/prepare-host.py')

export function resolvePlatform(requested, host) {
  const detected = { win32: 'windows', darwin: 'macos', linux: 'linux' }[host]
  const platform = requested === 'auto' ? detected : requested
  if (!['windows', 'macos', 'linux', 'ios'].includes(platform)) throw new Error('Unsupported native platform')
  if ((platform === 'ios' ? 'macos' : platform) !== detected) {
    throw new Error(`Build ${platform} on its native ${platform === 'ios' ? 'macOS/Xcode' : platform} host`)
  }
  return platform
}

export function requestedDesktopTarget(args) {
  const targets = []
  for (let index = 0; index < args.length; index++) {
    if (args[index] === '--target' || args[index] === '-t') targets.push(args[++index])
    else if (args[index].startsWith('--target=')) targets.push(args[index].slice(9))
  }
  if (targets.length > 1 || (targets.length && !targets[0])) throw new Error('Provide one native build target')
  return targets[0]
}

export function tauriArguments(platform, action, args = []) {
  if (!['dev', 'build', 'init', 'prepare'].includes(action)
      || (platform !== 'ios' && !['dev', 'build'].includes(action))) {
    throw new Error('Use dev/build for desktop, or init/prepare/dev/build for iOS')
  }
  if (platform === 'ios' && action === 'prepare') return null
  return platform === 'windows'
    ? [action, ...args]
    : [...(platform === 'ios' ? ['ios'] : []), action, '--config', `src-tauri/tauri.${platform}.conf.json`, ...args]
}

function run(command, args, capture = false) {
  const result = spawnSync(command, args, { cwd: root, shell: false, stdio: capture ? 'pipe' : 'inherit', encoding: 'utf8' })
  if (result.error || result.status !== 0) throw new Error(`Native command failed: ${command} (exit ${result.status ?? 'unavailable'})`)
  return result.stdout?.trim()
}

export function main([requested = 'auto', action = 'dev', ...args] = process.argv.slice(2)) {
  if (args[0] === '--') args.shift()
  const platform = resolvePlatform(requested, process.platform)
  const tauri = tauriArguments(platform, action, args)
  const help = args.includes('--help') || args.includes('-h')
  if (tauri === null && help) {
    console.log('Prepare existing iOS metadata: pnpm native:ios:prepare [--check]')
    return
  }
  if (platform === 'ios' && !help) {
    const project = resolve(root, 'src-tauri/gen/apple')
    if (action === 'init' && !existsSync(project)) run(process.execPath, [cli, ...tauri])
    else if (!existsSync(project)) throw new Error('Run pnpm native:ios:init first on a Mac with Xcode')
    run('python3', [prepare, project, ...(action === 'prepare' ? args : [])])
    if (action === 'init' || action === 'prepare') return
  }
  if (['macos', 'linux'].includes(platform) && !help) {
    const host = rustHost(run('rustc', ['-vV'], true))
    sidecarTarget(process.platform, process.arch, host, requestedDesktopTarget(args) ?? host)
    run(process.execPath, [resolve(root, 'src-tauri/scripts/build-sidecar.mjs'), '--target', host])
  }
  run(process.execPath, [cli, ...tauri])
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { main() } catch (error) {
    console.error(error.message)
    process.exitCode = 1
  }
}
