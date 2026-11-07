import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

export async function prepareAndroidHost(projectDirectory) {
  const appGradle = resolve(projectDirectory, 'app/build.gradle.kts')
  const manifestFile = resolve(projectDirectory, 'app/src/main/AndroidManifest.xml')
  const propertiesFile = resolve(projectDirectory, 'gradle.properties')
  const [gradle, manifest, properties] = await Promise.all([
    readFile(appGradle, 'utf8'),
    readFile(manifestFile, 'utf8'),
    readFile(propertiesFile, 'utf8'),
  ])
  if (!gradle.includes('id("com.android.application")')) {
    throw new Error('The Android app Gradle file does not match the supported Tauri template.')
  }
  for (const setting of ['compileSdk', 'targetSdk']) {
    const versions = [...gradle.matchAll(new RegExp(`\\b${setting}\\s*=\\s*(\\d+)`, 'g'))]
    if (versions.length !== 1 || !['36', '37'].includes(versions[0][1])) {
      throw new Error(`Expected one ${setting} setting using SDK 36 or the Tauri template SDK 37.`)
    }
  }
  if (!/<manifest\b[^>]*>/.test(manifest) || !/<application\b/.test(manifest)) {
    throw new Error('The Android manifest does not match the supported Tauri template.')
  }
  if ([...manifest.matchAll(/<activity\b[^>]*android:name="\.MainActivity"[^>]*>/g)].length !== 1) {
    throw new Error('Expected one MainActivity declaration in the supported Tauri manifest.')
  }
  let preparedManifest = manifest
  const additions = []
  if (!manifest.includes('android:name="android.permission.CAMERA"')) {
    additions.push('    <uses-permission android:name="android.permission.CAMERA" />')
  }
  if (!manifest.includes('android:name="android.permission.POST_NOTIFICATIONS"')) {
    additions.push('    <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />')
  }
  if (!manifest.includes('android:name="android.hardware.camera"')) {
    additions.push('    <uses-feature android:name="android.hardware.camera" android:required="false" />')
  }
  if (additions.length) {
    preparedManifest = manifest.replace(/<manifest\b[^>]*>/, (opening) => `${opening}\n${additions.join('\n')}`)
  }
  const applicationAttributes = {
    allowBackup: 'false',
    fullBackupContent: 'false',
    dataExtractionRules: '@xml/wallet_data_extraction_rules',
  }
  preparedManifest = preparedManifest.replace(/<application\b[^>]*>/, (opening) => {
    for (const [key, value] of Object.entries(applicationAttributes)) {
      const attribute = new RegExp(`\\sandroid:${key}="[^"]*"`, 'g')
      opening = opening.replace(attribute, '')
      opening = opening.replace(/\s*\/?\s*>$/, (ending) => ` android:${key}="${value}"${ending}`)
    }
    return opening
  })
  if (!preparedManifest.includes('android:scheme="web+arkade"')) {
    const filter = `
            <intent-filter>
                <action android:name="android.intent.action.VIEW" />
                <category android:name="android.intent.category.DEFAULT" />
                <category android:name="android.intent.category.BROWSABLE" />
                <data android:scheme="bitcoin" />
                <data android:scheme="lightning" />
                <data android:scheme="arkade" />
                <data android:scheme="web+arkade" />
            </intent-filter>
`
    preparedManifest = preparedManifest.replace(/(<activity\b[^>]*android:name="\.MainActivity"[^>]*>)([\s\S]*?)(<\/activity>)/,
      (_, opening, contents, ending) => `${opening}${contents}${filter}${ending}`)
  }
  const preparedGradle = gradle.replace(/\b(compileSdk|targetSdk)\s*=\s*37\b/g, '$1 = 36')
  const preparedProperties = /^android\.useAndroidX=/m.test(properties)
    ? properties.replace(/^android\.useAndroidX=.*$/m, 'android.useAndroidX=true')
    : `${properties.trimEnd()}\nandroid.useAndroidX=true\n`
  const rulesDirectory = resolve(projectDirectory, 'app/src/main/res/xml')
  await mkdir(rulesDirectory, { recursive: true })
  const excludes = ['root', 'file', 'database', 'sharedpref', 'external', 'device_root', 'device_file', 'device_database', 'device_sharedpref']
    .map((domain) => `        <exclude domain="${domain}" path="." />`).join('\n')
  const extractionRules = `<?xml version="1.0" encoding="utf-8"?>\n<data-extraction-rules>\n    <cloud-backup>\n${excludes}\n    </cloud-backup>\n    <device-transfer>\n${excludes}\n    </device-transfer>\n</data-extraction-rules>\n`
  await Promise.all([
    writeFile(appGradle, preparedGradle),
    writeFile(manifestFile, preparedManifest),
    writeFile(propertiesFile, preparedProperties),
    writeFile(resolve(rulesDirectory, 'wallet_data_extraction_rules.xml'), extractionRules),
  ])
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const projectDirectory = resolve(dirname(fileURLToPath(import.meta.url)), '../gen/android')
  try {
    await prepareAndroidHost(projectDirectory)
    console.log('Android host prepared: SDK 36, optional QR camera, and AndroidX.')
  } catch (error) {
    console.error(`Android host preparation failed: ${error instanceof Error ? error.message : String(error)}`)
    console.error('Run pnpm exec tauri android init first; a changed template needs review before building.')
    process.exitCode = 1
  }
}
