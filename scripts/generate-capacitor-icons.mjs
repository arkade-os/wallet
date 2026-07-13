#!/usr/bin/env node
// Regenerates native app icons for the Capacitor android/ios projects from the
// source images in resources/. Run after `npx cap add android|ios`, since those
// folders are gitignored, regenerated scaffold (see README.md "Mobile (Capacitor)").
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import path from 'node:path'
import { Jimp, PNGColorType, intToRGBA } from 'jimp'

const ROOT = path.resolve(import.meta.dirname, '..')
const RESOURCES = path.join(ROOT, 'resources')

const ANDROID_DENSITIES = [
  { dir: 'mipmap-mdpi', legacy: 48, foreground: 108 },
  { dir: 'mipmap-hdpi', legacy: 72, foreground: 162 },
  { dir: 'mipmap-xhdpi', legacy: 96, foreground: 216 },
  { dir: 'mipmap-xxhdpi', legacy: 144, foreground: 324 },
  { dir: 'mipmap-xxxhdpi', legacy: 192, foreground: 432 },
]

async function circularMask(image, size) {
  const masked = image.clone().resize({ w: size, h: size })
  const r = size / 2
  masked.scan(0, 0, size, size, (x, y, idx) => {
    const dx = x + 0.5 - r
    const dy = y + 0.5 - r
    if (dx * dx + dy * dy > r * r) {
      masked.bitmap.data[idx + 3] = 0
    }
  })
  return masked
}

function hexColor(image) {
  const { r, g, b } = intToRGBA(image.getPixelColor(0, 0))
  return `#${[r, g, b].map((c) => c.toString(16).padStart(2, '0')).join('')}`
}

async function generateAndroid(iconOnly, iconForeground, iconBackground) {
  const androidRes = path.join(ROOT, 'android/app/src/main/res')
  if (!existsSync(androidRes)) {
    console.log('android/ not present, skipping (run `npx cap add android` first)')
    return
  }

  const bgColorXml = path.join(androidRes, 'values/ic_launcher_background.xml')
  const bgColor = hexColor(iconBackground).toUpperCase()
  writeFileSync(
    bgColorXml,
    `<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">${bgColor}</color>\n</resources>\n`,
  )

  for (const { dir, legacy, foreground } of ANDROID_DENSITIES) {
    const outDir = path.join(androidRes, dir)
    if (!existsSync(outDir)) continue

    const legacyIcon = iconOnly.clone().resize({ w: legacy, h: legacy })
    await legacyIcon.write(path.join(outDir, 'ic_launcher.png'))

    const roundIcon = await circularMask(iconOnly, legacy)
    await roundIcon.write(path.join(outDir, 'ic_launcher_round.png'))

    const fgIcon = iconForeground.clone().resize({ w: foreground, h: foreground })
    await fgIcon.write(path.join(outDir, 'ic_launcher_foreground.png'))
  }
  console.log('Android icons generated.')
}

async function generateIos(iconOnly) {
  const appIconSet = path.join(ROOT, 'ios/App/App/Assets.xcassets/AppIcon.appiconset')
  const contentsPath = path.join(appIconSet, 'Contents.json')
  if (!existsSync(contentsPath)) {
    console.log('ios/ not present, skipping (run `npx cap add ios` first)')
    return
  }

  const contents = JSON.parse(readFileSync(contentsPath, 'utf8'))
  for (const image of contents.images) {
    const [pointSize] = image.size.split('x').map(Number)
    const scale = Number(image.scale?.replace('x', '') ?? '1')
    const pixelSize = pointSize * scale
    const resized = iconOnly.clone().resize({ w: pixelSize, h: pixelSize })
    const buf = await resized.getBuffer('image/png', { colorType: PNGColorType.COLOR })
    writeFileSync(path.join(appIconSet, image.filename), buf)
  }
  console.log('iOS icon generated.')
}

const [iconOnly, iconForeground, iconBackground] = await Promise.all([
  Jimp.read(path.join(RESOURCES, 'icon-only.png')),
  Jimp.read(path.join(RESOURCES, 'icon-foreground.png')),
  Jimp.read(path.join(RESOURCES, 'icon-background.png')),
])

await generateAndroid(iconOnly, iconForeground, iconBackground)
await generateIos(iconOnly)
