import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

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

function run(command, args) {
  const result = spawnSync(command, args, { cwd: root, shell: false, stdio: 'inherit', encoding: 'utf8' })
  if (result.error || result.status !== 0) throw new Error(`Native command failed: ${command} (exit ${result.status ?? 'unavailable'})`)
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
  if (platform === 'macos' && !help) {
    run(process.execPath, [cli, 'icon', 'public/arkade-icon-512.png', '--output', 'src-tauri/icons'])
  }
  run(process.execPath, [cli, ...tauri])
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { main() } catch (error) {
    console.error(error.message)
    process.exitCode = 1
  }
}
