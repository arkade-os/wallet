import assert from 'node:assert/strict'
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import test from 'node:test'
import { prepareAndroidHost } from './prepare-host.mjs'

async function fixture(run) {
  const directory = await mkdtemp(resolve(tmpdir(), 'arkade-android-'))
  await mkdir(resolve(directory, 'app/src/main'), { recursive: true })
  await writeFile(
    resolve(directory, 'app/build.gradle.kts'),
    'plugins { id("com.android.application") }\nandroid {\n compileSdk = 37\n defaultConfig { targetSdk = 37 }\n}\n',
  )
  await writeFile(
    resolve(directory, 'app/src/main/AndroidManifest.xml'),
    '<manifest xmlns:android="http://schemas.android.com/apk/res/android"><application><activity android:name=".MainActivity"></activity></application></manifest>',
  )
  await writeFile(resolve(directory, 'gradle.properties'), 'org.gradle.configuration-cache=true\n')
  try {
    await run(directory)
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
}

test('prepares the generated host idempotently with optional QR camera permission', async () => {
  await fixture(async (directory) => {
    await prepareAndroidHost(directory)
    const manifestFile = resolve(directory, 'app/src/main/AndroidManifest.xml')
    const first = await readFile(manifestFile, 'utf8')
    assert.match(first, /android.permission.CAMERA/)
    assert.match(first, /android.hardware.camera" android:required="false"/)
    assert.match(first, /android:allowBackup="false"/)
    assert.match(first, /android:fullBackupContent="false"/)
    assert.match(first, /android:dataExtractionRules="@xml\/wallet_data_extraction_rules"/)
    assert.equal((first.match(/android.intent.action.VIEW/g) ?? []).length, 1)
    for (const scheme of ['bitcoin', 'lightning', 'arkade', 'web+arkade'])
      assert.ok(first.includes(`android:scheme="${scheme}"`))
    const rules = await readFile(resolve(directory, 'app/src/main/res/xml/wallet_data_extraction_rules.xml'), 'utf8')
    assert.match(rules, /<cloud-backup>/)
    assert.match(rules, /<device-transfer>/)
    assert.match(rules, /<exclude domain="database" path="\."/)
    const gradle = await readFile(resolve(directory, 'app/build.gradle.kts'), 'utf8')
    assert.match(gradle, /compileSdk = 36/)
    assert.match(gradle, /targetSdk = 36/)
    await prepareAndroidHost(directory)
    assert.equal(await readFile(manifestFile, 'utf8'), first)
    assert.match(await readFile(resolve(directory, 'gradle.properties'), 'utf8'), /^android.useAndroidX=true$/m)
  })
})

test('rejects unfamiliar SDK templates before writing any files', async () => {
  await fixture(async (directory) => {
    const appGradle = resolve(directory, 'app/build.gradle.kts')
    await writeFile(appGradle, 'plugins { id("com.android.application") }\nandroid { compileSdk = 99; targetSdk = 99 }')
    const before = await readFile(appGradle, 'utf8')
    await assert.rejects(prepareAndroidHost(directory), /Expected one compileSdk/)
    assert.equal(await readFile(appGradle, 'utf8'), before)
    assert.doesNotMatch(await readFile(resolve(directory, 'app/src/main/AndroidManifest.xml'), 'utf8'), /CAMERA/)
  })
})

test('rejects missing or malformed manifests before changing SDK settings', async () => {
  await fixture(async (directory) => {
    await writeFile(resolve(directory, 'app/src/main/AndroidManifest.xml'), '<broken />')
    await assert.rejects(prepareAndroidHost(directory), /manifest does not match/)
    assert.match(await readFile(resolve(directory, 'app/build.gradle.kts'), 'utf8'), /compileSdk = 37/)
  })
})
