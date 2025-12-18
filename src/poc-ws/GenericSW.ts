import { IUpdater } from '@arkade-os/sdk'

declare const self: ServiceWorkerGlobalScope

type WorkerOptions = {
  updaters: IUpdater[]
  tickIntervalMs?: number
  debug?: boolean
}

export class GenericSW {
  private updaters: Map<string, IUpdater>
  private tickIntervalMs: number
  private running = false
  private tickTimeout: number | null = null
  private debug = false

  constructor({ updaters, tickIntervalMs = 30_000, debug = false }: WorkerOptions) {
    this.updaters = new Map(updaters.map((u) => [u.messagePrefix, u]))
    this.tickIntervalMs = tickIntervalMs
    this.debug = debug
  }

  async start() {
    console.log('Starting service worker...')
    if (this.running) return
    this.running = true

    // Start all updaters
    for (const updater of this.updaters.values()) {
      await updater.start()
    }

    // Hook message routing
    self.addEventListener('message', this.onMessage)

    // Kick off scheduler
    this.scheduleNextTick()
  }

  async stop() {
    this.running = false

    if (this.tickTimeout !== null) {
      clearTimeout(this.tickTimeout)
    }

    self.removeEventListener('message', this.onMessage)

    for (const updater of this.updaters.values()) {
      updater.stop()
    }
  }

  private scheduleNextTick() {
    if (!this.running) return

    this.tickTimeout = self.setTimeout(() => this.runTick(), this.tickIntervalMs)
  }

  private async runTick() {
    if (!this.running) return

    const now = Date.now()

    for (const updater of this.updaters.values()) {
      try {
        const response = await updater.tick(now)
        if (this.debug) console.log(`[${updater.messagePrefix}] outgoing tick response:`, response)
        if (response) {
          self.clients.matchAll({ includeUncontrolled: true, type: 'window' }).then((clients) => {
            clients.forEach((client) => {
              client.postMessage(response)
            })
          })
        }
      } catch (err) {
        console.error(`[${updater.messagePrefix}] tick failed`, err)
      }
    }

    this.scheduleNextTick()
  }

  private onMessage = async (event: ExtendableMessageEvent) => {
    const { id, prefix, payload } = event.data

    if (this.debug) {
      console.log(`[${prefix}] incoming message:`, event.data)
    }

    const updater = this.updaters.get(prefix)
    if (!updater) {
      console.warn(`[${prefix}] unknown message prefix`)
      return
    }

    try {
      const response = await updater.handleMessage({ id, type: payload.type, payload: event.data.payload })
      if (this.debug) console.log(`[${prefix}] outgoing response:`, response)
      if (response) {
        event.source?.postMessage(response)
      }
    } catch (err) {
      console.error(`[${prefix}] handleMessage failed`, err)
      event.source?.postMessage({ id, error: String(err) })
    }
  }
}
