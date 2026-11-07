import { spawnSync } from 'node:child_process'
import { copyFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const nativeRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')

export function parseOptions(args) {
  const options = { useExistingEnvironment: false }
  for (let index = 0; index < args.length; index++) {
    const argument = args[index]
    if (argument === '--use-existing-environment' && !options.useExistingEnvironment) {
      options.useExistingEnvironment = true
    } else if (['--python', '--target'].includes(argument) && !options[argument.slice(2)]) {
      const value = args[++index]
      if (!value || value.startsWith('--')) throw new Error(`Provide a value for ${argument}`)
      options[argument.slice(2)] = value
    } else {
      throw new Error(`Unsupported or duplicate option: ${argument}`)
    }
  }
  if (options.useExistingEnvironment && !options.python) {
    throw new Error('--use-existing-environment requires an explicit virtualenv --python path')
  }
  return options
}

export function rustHost(version) {
  const host = version.match(/^host:\s*(\S+)\s*$/m)?.[1]
  if (!host) throw new Error('Unable to determine the native Rust host triple')
  return host
}

export function sidecarTarget(platform, arch, host, requested = host) {
  const architecture = { x64: 'x86_64', arm64: 'aarch64' }[arch]
  const suffix = { win32: 'pc-windows-msvc', darwin: 'apple-darwin' }[platform]
  const valid =
    architecture &&
    (platform === 'linux'
      ? new RegExp(`^${architecture}-unknown-linux-(gnu|musl)$`).test(host)
      : suffix && host === `${architecture}-${suffix}`)
  if (!valid || requested !== host) {
    throw new Error(
      'Build the Satochip helper on its matching native OS and architecture; PyInstaller is not a cross-compiler',
    )
  }
  return {
    triple: host,
    executable: platform === 'win32' ? 'satochip-bridge.exe' : 'satochip-bridge',
    bundled: `satochip-bridge-${host}${platform === 'win32' ? '.exe' : ''}`,
  }
}

export function virtualenvPython(root, platform) {
  return join(root, '.sidecar-venv', ...(platform === 'win32' ? ['Scripts', 'python.exe'] : ['bin', 'python']))
}

export function virtualenvEnvironment(scriptsDirectory, environment = process.env, platform = process.platform) {
  const pathKey =
    platform === 'win32' ? Object.keys(environment).find((key) => key.toLowerCase() === 'path') || 'PATH' : 'PATH'
  return {
    ...environment,
    [pathKey]: [scriptsDirectory, environment[pathKey]].filter(Boolean).join(platform === 'win32' ? ';' : ':'),
  }
}

export function pinnedRequirements(contents) {
  const requirements = contents
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'))
  if (!requirements.length || requirements.some((line) => !/^[\w.-]+==[\w.+!-]+(?:\s*;.+)?$/.test(line))) {
    throw new Error('Sidecar dependencies must all use exact versions')
  }
  const bootstrap = ['setuptools', 'pycparser', 'cffi', 'maturin'].map((dependency) => {
    const requirement = requirements.find((line) => new RegExp(`^${dependency}==[^;\\s]+$`).test(line))
    if (!requirement) throw new Error(`Pin ${dependency} before building sidecar dependencies`)
    return requirement
  })
  return { requirements, bootstrap }
}

export function checkPython(info, platform, arch, requireVirtualenv) {
  const machine = { x86_64: 'x64', amd64: 'x64', aarch64: 'arm64', arm64: 'arm64' }[info.machine.toLowerCase()]
  if (info.platform !== platform || machine !== arch || (requireVirtualenv && !info.virtualenv)) {
    throw new Error('Use a virtualenv Python matching the native build OS and architecture')
  }
}

export function pyInstallerArguments(root) {
  return [
    '-m',
    'PyInstaller',
    '--noconfirm',
    '--clean',
    '--onefile',
    '--console',
    '--name',
    'satochip-bridge',
    '--collect-all',
    'pysatochip',
    '--collect-all',
    'smartcard',
    '--distpath',
    join(root, 'binaries'),
    '--workpath',
    join(root, '.sidecar-build', 'work'),
    '--specpath',
    join(root, '.sidecar-build'),
    join(root, 'resources', 'bridge.py'),
  ]
}

function run(executable, args, capture = false, env) {
  const result = spawnSync(executable, args, {
    stdio: capture ? 'pipe' : 'inherit',
    encoding: 'utf8',
    shell: false,
    env,
  })
  if (result.error || result.status !== 0) throw new Error(`Sidecar build command failed: ${executable}`)
  return result.stdout?.trim()
}

function pythonInfo(executable, prefix = []) {
  return JSON.parse(
    run(
      executable,
      [
        ...prefix,
        '-c',
        'import json,platform,sys,sysconfig; print(json.dumps({"platform":sys.platform,"machine":platform.machine(),"virtualenv":sys.prefix!=sys.base_prefix,"scriptsDirectory":sysconfig.get_path("scripts")}))',
      ],
      true,
    ),
  )
}

export function buildSidecar(options) {
  const target = sidecarTarget(process.platform, process.arch, rustHost(run('rustc', ['-vV'], true)), options.target)
  const requirementsPath = join(nativeRoot, 'resources', 'requirements.txt')
  const { bootstrap } = pinnedRequirements(readFileSync(requirementsPath, 'utf8'))
  let python
  if (options.useExistingEnvironment) {
    python = options.python
  } else {
    python = virtualenvPython(nativeRoot, process.platform)
    if (!existsSync(python)) {
      const creator = options.python || (process.platform === 'win32' ? 'py' : 'python3')
      const prefix = !options.python && process.platform === 'win32' ? ['-3'] : []
      checkPython(pythonInfo(creator, prefix), process.platform, process.arch, false)
      run(creator, [...prefix, '-m', 'venv', join(nativeRoot, '.sidecar-venv')])
    }
  }
  const info = pythonInfo(python)
  checkPython(info, process.platform, process.arch, true)
  const environment = virtualenvEnvironment(info.scriptsDirectory)
  const runPython = (args) => run(python, args, false, environment)
  const install = ['-m', 'pip', 'install', '--disable-pip-version-check', '--no-deps', '--no-build-isolation']
  // Source builds prepare metadata before installing other requirements, so their backends must already exist.
  for (const requirement of bootstrap) runPython([...install, requirement])
  runPython([...install, '-r', requirementsPath])
  runPython(['-m', 'pip', 'check'])
  runPython([join(nativeRoot, 'scripts', 'collect-licenses.py')])
  mkdirSync(join(nativeRoot, 'binaries'), { recursive: true })
  mkdirSync(join(nativeRoot, '.sidecar-build'), { recursive: true })
  runPython(pyInstallerArguments(nativeRoot))
  copyFileSync(join(nativeRoot, 'binaries', target.executable), join(nativeRoot, 'binaries', target.bundled))
  process.stdout.write(`Built Satochip sidecar for ${target.triple}\n`)
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    buildSidecar(parseOptions(process.argv.slice(2)))
  } catch (error) {
    process.stderr.write(`${error.message}\n`)
    process.exitCode = 1
  }
}
