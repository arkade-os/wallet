import { finalizeEvent, generateSecretKey, getPublicKey, verifyEvent } from 'nostr-tools/pure'
import { decrypt, encrypt, getConversationKey } from 'nostr-tools/nip44'
import { PAIR, POSITION_KIND, POSITION_TAG, PREDICT_VAULT_PROGRAM_ID, RFQ_KIND, type PredictKind } from './constants'
import { bytesToHex } from './hex'

const ARKADE_RELAY = 'wss://nostr.arkade.sh'
const HEX64 = /^[0-9a-f]{64}$/
const AMOUNT = /^[1-9][0-9]{0,15}$/
const SCRIPT = /^51[0-9a-f]{66}$/

export interface PredictRfqRequest {
  v: 1
  type: 'rfq_request'
  rfq_id: string
  pair: typeof PAIR
  amount_side: 'from'
  amount: string
  profile: {
    kind: PredictKind
    strike: number
    expiry: number
    holder_pubkey: string
    holder_pk_script: string
  }
}

export interface PredictRfqQuote {
  v: 1
  type: 'rfq_quote'
  rfq_id: string
  pair: typeof PAIR
  from_amount: string
  to_amount: string
  valid_until: number
  solver_pubkey: string
  profile: {
    deadline: number
    exit: number
    writer_pubkey: string
    writer_pk_script: string
    backup_pubkey: string
    void_after: number
    fallback_delay: number
    final_exit_delay: number
    beacon_txid: string
    beacon_gidx: number
    intent_address: string
    vault_address: string
  }
}

export interface PredictRfqRefusal {
  v: 1
  type: 'rfq_refusal'
  rfq_id: string
  reason: string
}

export interface NostrPredictPosition {
  v: 1
  type: 'option_position'
  program_id: string
  rfq_id: string
  pair: typeof PAIR
  kind: PredictKind
  collateral: string
  stake: string
  strike: number
  expiry: number
  exit: number
  writer_pubkey: string
  writer_pk_script: string
  holder_pubkey: string
  holder_pk_script: string
  backup_pubkey: string
  void_after: number
  fallback_delay: number
  final_exit_delay: number
  beacon_txid: string
  beacon_gidx: number
  vault_address: string
  fill_txid: string
}

type WireReply = PredictRfqQuote | PredictRfqRefusal

interface SealedEvent {
  id: string
  pubkey: string
  content: string
  kind: number
  tags: string[][]
  created_at: number
  sig: string
}

export function randomRfqId(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return bytesToHex(bytes)
}

export function quoteRelayUrl(relays: readonly string[]): string {
  const arkade = relays.find((url) => url.replace(/\/$/, '') === ARKADE_RELAY)
  if (arkade) return ARKADE_RELAY
  const first = relays.find((url) => url.startsWith('wss://') || url.startsWith('ws://'))
  if (!first) throw new Error('No Nostr relay configured')
  return first.replace(/\/$/, '')
}

function isHex64(value: unknown): value is string {
  return typeof value === 'string' && HEX64.test(value.toLowerCase())
}

function isAmount(value: unknown): value is string {
  return typeof value === 'string' && AMOUNT.test(value)
}

function isScript(value: unknown): value is string {
  return typeof value === 'string' && SCRIPT.test(value.toLowerCase())
}

function isSafeInt(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
}

export function parseRfqReply(raw: unknown): WireReply | null {
  if (!raw || typeof raw !== 'object') return null
  const body = raw as Record<string, unknown>
  if (body.v !== 1 || !isHex64(body.rfq_id)) return null

  if (body.type === 'rfq_refusal') {
    if (typeof body.reason !== 'string' || !body.reason.trim()) return null
    return { v: 1, type: 'rfq_refusal', rfq_id: body.rfq_id.toLowerCase(), reason: body.reason.trim() }
  }

  if (body.type !== 'rfq_quote' || body.pair !== PAIR) return null
  if (!isAmount(body.from_amount) || !isAmount(body.to_amount)) return null
  if (!isSafeInt(body.valid_until) || !isHex64(body.solver_pubkey)) return null

  const p = body.profile as Record<string, unknown> | undefined
  if (!p || typeof p !== 'object') return null
  if (
    !isSafeInt(p.deadline) ||
    !isSafeInt(p.exit) ||
    !isSafeInt(p.void_after) ||
    !isSafeInt(p.fallback_delay) ||
    !isSafeInt(p.final_exit_delay) ||
    !isSafeInt(p.beacon_gidx)
  ) {
    return null
  }
  if (
    !isHex64(p.writer_pubkey) ||
    !isScript(p.writer_pk_script) ||
    !isHex64(p.backup_pubkey) ||
    !isHex64(p.beacon_txid)
  ) {
    return null
  }
  if (typeof p.intent_address !== 'string' || typeof p.vault_address !== 'string') return null

  return {
    v: 1,
    type: 'rfq_quote',
    rfq_id: body.rfq_id.toLowerCase(),
    pair: PAIR,
    from_amount: body.from_amount,
    to_amount: body.to_amount,
    valid_until: body.valid_until,
    solver_pubkey: body.solver_pubkey.toLowerCase(),
    profile: {
      deadline: p.deadline,
      exit: p.exit,
      writer_pubkey: p.writer_pubkey.toLowerCase(),
      writer_pk_script: p.writer_pk_script.toLowerCase(),
      backup_pubkey: p.backup_pubkey.toLowerCase(),
      void_after: p.void_after,
      fallback_delay: p.fallback_delay,
      final_exit_delay: p.final_exit_delay,
      beacon_txid: p.beacon_txid.toLowerCase(),
      beacon_gidx: p.beacon_gidx,
      intent_address: p.intent_address,
      vault_address: p.vault_address,
    },
  }
}

export function parseNostrPredictPosition(raw: unknown): NostrPredictPosition | null {
  if (!raw || typeof raw !== 'object') return null
  const b = raw as Record<string, unknown>
  if (b.v !== 1 || b.type !== 'option_position' || b.pair !== PAIR) return null
  if (b.kind !== 2 && b.kind !== 3) return null
  const programId = typeof b.program_id === 'string' ? b.program_id : PREDICT_VAULT_PROGRAM_ID
  if (!isHex64(b.rfq_id) || !isAmount(b.collateral) || !isAmount(b.stake)) return null
  const strike = isSafeInt(b.strike) ? b.strike : isAmount(b.strike) ? Number(b.strike) : null
  if (
    strike == null ||
    !isSafeInt(strike) ||
    !isSafeInt(b.expiry) ||
    !isSafeInt(b.exit) ||
    !isSafeInt(b.void_after) ||
    !isSafeInt(b.fallback_delay) ||
    !isSafeInt(b.final_exit_delay) ||
    !isSafeInt(b.beacon_gidx)
  ) {
    return null
  }
  if (
    !isHex64(b.writer_pubkey) ||
    !isScript(b.writer_pk_script) ||
    !isHex64(b.holder_pubkey) ||
    !isScript(b.holder_pk_script) ||
    !isHex64(b.backup_pubkey) ||
    !isHex64(b.beacon_txid) ||
    !isHex64(b.fill_txid)
  ) {
    return null
  }
  if (typeof b.vault_address !== 'string') return null
  return {
    v: 1,
    type: 'option_position',
    program_id: programId,
    rfq_id: b.rfq_id.toLowerCase(),
    pair: PAIR,
    kind: b.kind,
    collateral: b.collateral,
    stake: b.stake,
    strike,
    expiry: b.expiry,
    exit: b.exit,
    writer_pubkey: b.writer_pubkey.toLowerCase(),
    writer_pk_script: b.writer_pk_script.toLowerCase(),
    holder_pubkey: b.holder_pubkey.toLowerCase(),
    holder_pk_script: b.holder_pk_script.toLowerCase(),
    backup_pubkey: b.backup_pubkey.toLowerCase(),
    void_after: b.void_after,
    fallback_delay: b.fallback_delay,
    final_exit_delay: b.final_exit_delay,
    beacon_txid: b.beacon_txid.toLowerCase(),
    beacon_gidx: b.beacon_gidx,
    vault_address: b.vault_address,
    fill_txid: b.fill_txid.toLowerCase(),
  }
}

function sealRequest(secretKey: Uint8Array, recipientPubkey: string, payload: PredictRfqRequest): SealedEvent {
  const conversationKey = getConversationKey(secretKey, recipientPubkey)
  return finalizeEvent(
    {
      kind: RFQ_KIND,
      created_at: Math.floor(Date.now() / 1000),
      tags: [['p', recipientPubkey]],
      content: encrypt(JSON.stringify(payload), conversationKey),
    },
    secretKey,
  ) as unknown as SealedEvent
}

function openReply(secretKey: Uint8Array, event: { pubkey: string; content: string }): WireReply | null {
  try {
    const conversationKey = getConversationKey(secretKey, event.pubkey)
    const text = decrypt(event.content, conversationKey)
    return parseRfqReply(JSON.parse(text))
  } catch {
    return null
  }
}

function isSealedEvent(val: unknown): val is SealedEvent {
  if (!val || typeof val !== 'object') return false
  const e = val as Record<string, unknown>
  return (
    typeof e.id === 'string' &&
    typeof e.pubkey === 'string' &&
    typeof e.content === 'string' &&
    typeof e.kind === 'number' &&
    Array.isArray(e.tags) &&
    typeof e.created_at === 'number' &&
    typeof e.sig === 'string'
  )
}

function connectSocket(url: string, timeoutMs = 5_000): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url)
    const timer = setTimeout(() => {
      ws.close()
      reject(new Error('Nostr relay connection timed out'))
    }, timeoutMs)
    ws.addEventListener('open', () => {
      clearTimeout(timer)
      resolve(ws)
    })
    ws.addEventListener('error', () => {
      clearTimeout(timer)
      reject(new Error('Could not connect to Nostr relay'))
    })
  })
}

export async function collectRfqReplies(opts: {
  relays: readonly string[]
  recipients: readonly string[]
  payload: PredictRfqRequest
  timeoutMs?: number
}): Promise<{ from: string; message: WireReply }[]> {
  const url = quoteRelayUrl(opts.relays)
  const secretKey = generateSecretKey()
  const pubkey = getPublicKey(secretKey)
  const ws = await connectSocket(url)
  const found: { from: string; message: WireReply }[] = []
  const seen = new Set<string>()
  const subId = `p${Math.random().toString(16).slice(2, 10)}`
  let published = false
  let rejection = ''

  const publish = () => {
    if (published) return
    published = true
    for (const recipient of opts.recipients) {
      ws.send(JSON.stringify(['EVENT', sealRequest(secretKey, recipient, opts.payload)]))
    }
  }

  try {
    await new Promise<void>((resolve, reject) => {
      let settled = false
      const finish = (err?: Error) => {
        if (settled) return
        settled = true
        clearTimeout(timer)
        clearTimeout(early)
        if (err) reject(err)
        else resolve()
      }

      const timer = setTimeout(() => {
        if (!published) finish(new Error('Nostr relay did not accept the request'))
        else finish()
      }, opts.timeoutMs ?? 8_000)

      const early = setTimeout(() => {
        try {
          publish()
        } catch (err) {
          finish(err instanceof Error ? err : new Error('Nostr relay closed'))
        }
      }, 500)

      ws.addEventListener('message', (ev) => {
        let frame: unknown
        try {
          frame = JSON.parse(String(ev.data))
        } catch {
          return
        }
        if (!Array.isArray(frame)) return
        if (frame[0] === 'EVENT' && frame[1] === subId && isSealedEvent(frame[2])) {
          const event = frame[2]
          if (seen.has(event.id)) return
          seen.add(event.id)
          const msg = openReply(secretKey, event)
          if (!msg || msg.rfq_id !== opts.payload.rfq_id) return
          found.push({ from: event.pubkey.toLowerCase(), message: msg })
          if (msg.type === 'rfq_quote') finish()
        } else if (frame[0] === 'EOSE' && frame[1] === subId) {
          clearTimeout(early)
          try {
            publish()
          } catch (err) {
            finish(err instanceof Error ? err : new Error('Nostr relay closed'))
          }
        } else if (frame[0] === 'OK' && frame[2] === false && found.length === 0) {
          rejection = String(frame[3] ?? 'rejected')
          finish(new Error(rejection))
        }
      })

      ws.addEventListener('close', () => {
        if (!published) finish(new Error('Nostr relay closed'))
      })

      try {
        ws.send(JSON.stringify(['REQ', subId, { kinds: [RFQ_KIND], '#p': [pubkey] }]))
      } catch (err) {
        finish(err instanceof Error ? err : new Error('Failed to subscribe on Nostr relay'))
      }
    })

    if (found.length === 0 && rejection) throw new Error(rejection)
    return found
  } finally {
    if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) ws.close()
  }
}

export function watchNostrPredictPositions(opts: {
  relays: readonly string[]
  holderPkScript: string
  onPosition: (position: NostrPredictPosition) => void
}): { close: () => void } {
  let closed = false
  let ws: WebSocket | null = null
  const wantScript = opts.holderPkScript.toLowerCase()
  const subId = `pos${Math.random().toString(16).slice(2, 10)}`

  const open = () => {
    if (closed) return
    let url: string
    try {
      url = quoteRelayUrl(opts.relays)
    } catch {
      return
    }
    const socket = new WebSocket(url)
    ws = socket
    socket.addEventListener('open', () => {
      if (closed) {
        socket.close()
        return
      }
      socket.send(JSON.stringify(['REQ', subId, { kinds: [POSITION_KIND], '#t': [POSITION_TAG] }]))
    })
    socket.addEventListener('message', (ev) => {
      let frame: unknown
      try {
        frame = JSON.parse(String(ev.data))
      } catch {
        return
      }
      if (!Array.isArray(frame) || frame[0] !== 'EVENT' || frame[1] !== subId || !isSealedEvent(frame[2])) return
      const event = frame[2]
      if (event.kind !== POSITION_KIND) return
      if (!event.tags.some((t) => t[0] === 't' && t[1] === POSITION_TAG)) return
      try {
        if (!verifyEvent(event as never)) return
      } catch {
        return
      }
      let parsed: unknown
      try {
        parsed = JSON.parse(event.content)
      } catch {
        return
      }
      const pos = parseNostrPredictPosition(parsed)
      if (!pos) return
      if (pos.holder_pubkey !== event.pubkey.toLowerCase() && pos.writer_pubkey !== event.pubkey.toLowerCase()) return
      if (pos.holder_pk_script !== wantScript) return
      opts.onPosition(pos)
    })
  }

  open()
  return {
    close: () => {
      closed = true
      if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
        ws.close()
      }
    },
  }
}
