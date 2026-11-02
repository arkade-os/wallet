import { spawn } from 'node:child_process'
import { createHash } from 'node:crypto'
import { copyFile, mkdir, readFile, stat, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { prepareAndroidHost } from './prepare-host.mjs'

const androidTargets = {
  aarch64: { triple: 'aarch64-linux-android', abi: 'arm64-v8a', arch: 'arm64', variant: 'Arm64' },
  x86_64: { triple: 'x86_64-linux-android', abi: 'x86_64', arch: 'x86_64', variant: 'X86_64' },
}

export function androidBuildTarget(args) {
  const targets = []
  for (let index = 0; index < args.length; index++) {
    if (args[index] === '--target') targets.push(args[++index])
    else if (args[index].startsWith('--target=')) targets.push(args[index].slice('--target='.length))
  }
  if (targets.length !== 1 || !Object.hasOwn(androidTargets, targets[0])) return undefined
  return { name: targets[0], ...androidTargets[targets[0]] }
}

export function canCopyWindowsLibrary(platform, args, output) {
  const target = androidBuildTarget(args)
  return (
    platform === 'win32' &&
    args.includes('--debug') &&
    args.includes('--apk') &&
    target !== undefined &&
    /Finished[^\n]*`dev` profile/.test(output) &&
    new RegExp(`symlinking lib [^\\n]*${target.triple}[^\\n]*debug[^\\n]*libarkade_native_lib\\.so`).test(output) &&
    output.includes('Creation symbolic link is not allowed for this system.')
  )
}

function run(command, args, cwd) {
  return new Promise((accept, reject) => {
    const child = spawn(command, args, { cwd, stdio: ['inherit', 'pipe', 'pipe'], windowsHide: true })
    let output = ''
    for (const [stream, destination] of [
      [child.stdout, process.stdout],
      [child.stderr, process.stderr],
    ]) {
      stream.on('data', (data) => {
        destination.write(data)
        output += data.toString()
      })
    }
    child.once('error', reject)
    child.once('close', (code) => accept({ code: code ?? 1, output: output.replace(/\x1b\[[0-9;]*m/g, '') }))
  })
}

async function hash(file) {
  return createHash('sha256')
    .update(await readFile(file))
    .digest('hex')
}

export async function buildAndroidHost(walletDirectory, args) {
  const tauriDirectory = resolve(walletDirectory, 'src-tauri')
  const androidDirectory = resolve(tauriDirectory, 'gen/android')
  await prepareAndroidHost(androidDirectory)
  const started = new Date()
  const result = await run(
    process.execPath,
    [
      resolve(walletDirectory, 'node_modules/@tauri-apps/cli/tauri.js'),
      'android',
      'build',
      '--config',
      'src-tauri/tauri.android.conf.json',
      ...args,
    ],
    walletDirectory,
  )
  if (result.code === 0) return
  if (!canCopyWindowsLibrary(process.platform, args, result.output)) {
    throw new Error(`Tauri Android build failed with exit code ${result.code}; no fallback was applied.`)
  }
  const target = androidBuildTarget(args)
  const targetDirectory = process.env.CARGO_TARGET_DIR
    ? resolve(tauriDirectory, process.env.CARGO_TARGET_DIR)
    : resolve(tauriDirectory, 'target')
  const nativeLibrary = resolve(targetDirectory, `${target.triple}/debug/libarkade_native_lib.so`)
  const nativeMetadata = await stat(nativeLibrary)
  if (!nativeMetadata.isFile() || nativeMetadata.size < 1024) {
    throw new Error('The completed Rust build did not produce the expected Android library.')
  }
  const reportedPaths = [...result.output.matchAll(/symlinking lib "([^"]+)"/g)].map((match) =>
    resolve(match[1].replaceAll('\\\\', '\\')),
  )
  if (!reportedPaths.some((file) => file.toLowerCase() === nativeLibrary.toLowerCase())) {
    throw new Error('Tauri reported a different native library; refusing to copy an unverified artifact.')
  }
  const destinationDirectory = resolve(androidDirectory, `app/src/main/jniLibs/${target.abi}`)
  const destination = resolve(destinationDirectory, 'libarkade_native_lib.so')
  await mkdir(destinationDirectory, { recursive: true })
  const nativeHash = await hash(nativeLibrary)
  await copyFile(nativeLibrary, destination)
  if ((await hash(destination)) !== nativeHash) throw new Error('The copied native library checksum did not match.')
  console.log('Rust build completed; copying its verified library because Windows denied symbolic links.')
  const java = process.env.JAVA_HOME ? resolve(process.env.JAVA_HOME, 'bin/java.exe') : 'java'
  const gradle = await run(
    java,
    [
      '-classpath',
      resolve(androidDirectory, 'gradle/wrapper/gradle-wrapper.jar'),
      'org.gradle.wrapper.GradleWrapperMain',
      '--no-daemon',
      '--console=plain',
      `:app:assemble${target.variant}Debug`,
      '-x',
      `:app:rustBuild${target.variant}Debug`,
      `-PtargetList=${target.name}`,
      `-ParchList=${target.arch}`,
      `-PabiList=${target.abi}`,
    ],
    androidDirectory,
  )
  if (gradle.code !== 0) throw new Error(`Android Gradle packaging failed with exit code ${gradle.code}.`)
  const apk = resolve(androidDirectory, `app/build/outputs/apk/${target.arch}/debug/app-${target.arch}-debug.apk`)
  const receipt = {
    target: target.triple,
    profile: 'debug',
    buildStartedAt: started.toISOString(),
    buildFinishedAt: new Date().toISOString(),
    nativeLibraryModifiedAt: nativeMetadata.mtime.toISOString(),
    nativeLibrarySha256: nativeHash,
    apkSha256: await hash(apk),
    copyReason: 'Windows symbolic-link privilege unavailable after successful Rust build',
  }
  await writeFile(resolve(dirname(apk), 'native-build-receipt.json'), `${JSON.stringify(receipt, null, 2)}\n`)
  console.log(`APK: ${apk}\nSHA256: ${receipt.apkSha256}`)
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const walletDirectory = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..')
  try {
    await buildAndroidHost(walletDirectory, process.argv.slice(2))
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  }
}
