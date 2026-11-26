// @vitest-environment node
import assert from 'node:assert/strict'
import { mkdtemp, mkdir, readFile, rm, utimes, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { basename, dirname, join, resolve } from 'node:path'
import { createServer } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import { it, vi } from 'vitest'

async function watchFixture(ignore) {
  const root = await mkdtemp(join(tmpdir(), 'wallet-native-watch-'))
  let server
  let socket
  try {
    await mkdir(join(root, '.git'))
    await mkdir(join(root, '.local-tests', 'owned'), { recursive: true })
    await writeFile(join(root, '.gitignore'), ignore)
    const heartbeat = join(root, '.local-tests', 'owned', 'relay-health')
    const source = join(root, 'source.html')
    await writeFile(heartbeat, 'healthy')
    await writeFile(source, '<div class="bg-red-500"></div>')
    const css = resolve('node_modules/tailwindcss/index.css').replaceAll('\\', '/')
    await writeFile(join(root, 'app.css'), `@import '${css}';`)
    server = await createServer({
      configFile: false,
      root,
      plugins: [tailwindcss()],
      logLevel: 'silent',
      server: {
        host: '127.0.0.1',
        port: 0,
        strictPort: true,
        async hotUpdateEnvironments(server, hmr) {
          await Promise.all(Object.values(server.environments).map(hmr))
          server.ws.send({ type: 'custom', event: 'watch-complete' })
        },
      },
    })
    await server.listen()
    const port = server.httpServer.address().port
    const messages = []
    socket = new WebSocket(`ws://127.0.0.1:${port}/?token=${server.config.webSocketToken}`, 'vite-hmr')
    await new Promise((done, reject) => {
      socket.addEventListener('open', done, { once: true })
      socket.addEventListener('error', reject, { once: true })
    })
    let completed
    socket.addEventListener('message', ({ data }) => {
      const message = JSON.parse(data)
      messages.push(message)
      if (message.event === 'watch-complete') completed?.()
    })
    const response = await fetch(`http://127.0.0.1:${port}/app.css`)
    assert.equal(response.status, 200)
    assert((await response.text()).includes('bg-red-500'))
    await vi.waitFor(() => {
      const watched = Object.entries(server.watcher.getWatched())
      for (const file of [heartbeat, source]) {
        assert(
          watched.some(([directory, files]) => resolve(directory) === dirname(file) && files.includes(basename(file))),
          `The owned fixture is not watched yet: ${file}`,
        )
      }
    })
    const changes = []
    server.watcher.on('change', (file) => changes.push(file.replaceAll('\\', '/')))
    const heartbeatUpdate = new Promise((done) => (completed = done))
    await utimes(heartbeat, new Date(), new Date())
    await heartbeatUpdate
    const heartbeatMessages = messages.splice(0).filter(({ type }) => type === 'full-reload')
    const sourceUpdate = new Promise((done) => (completed = done))
    await writeFile(source, '<div class="bg-blue-500"></div>')
    await sourceUpdate
    assert(
      changes.includes(source.replaceAll('\\', '/')),
      `The owned source edit was not watched: ${JSON.stringify(changes)}`,
    )
    assert(
      messages.some(({ type }) => type === 'full-reload'),
      'The real source edit did not reload',
    )
    assert((await (await fetch(`http://127.0.0.1:${port}/app.css`)).text()).includes('bg-blue-500'))
    return { heartbeatMessages, changes, heartbeat: heartbeat.replaceAll('\\', '/') }
  } finally {
    socket?.close()
    await server?.close()
    assert.equal(dirname(resolve(root)), resolve(tmpdir()))
    assert(basename(root).startsWith('wallet-native-watch-'))
    await rm(root, { recursive: true, force: true })
  }
}

it('keeps runtime relay heartbeats out of Tailwind HMR while retaining source reloads', async () => {
  const ignore = await readFile(new URL('../.gitignore', import.meta.url), 'utf8')
  const control = await watchFixture(ignore.replace(/^\/\.local-tests\/\r?\n/gm, ''))
  assert(control.changes.includes(control.heartbeat), 'The unignored heartbeat was not watched')
  assert(control.heartbeatMessages.length > 0, 'The unignored heartbeat did not reproduce the reload')
  const fixed = await watchFixture(ignore)
  assert.equal(fixed.heartbeatMessages.length, 0, 'Runtime heartbeat reset the wallet document')
}, 15_000)
