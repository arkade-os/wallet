import { ArkAddress, asset, type IWallet } from '@arkade-os/sdk'
import { sendOffChain } from '../asp'
import { BEACON_READ_FEE, PAIR, PREDICT_LOCK_S, QUOTE_TTL_S, type PredictConfig, type PredictKind } from './constants'
import { backupKeyMatches, beaconIdOf, bindPredictContracts, parseOracleBeacon, verifiedSignerKey } from './contracts'
import { registerPredictExecutorDelegations } from './executor'
import { bytesToHex, hexToBytes, xOnly } from './hex'
import {
  cancelLivePredictIntent,
  connectPredictClient,
  reboardLivePredictVault,
  refreshLivePosition,
  refundLivePredictVault,
  settleLivePredictVault,
} from './lifecycle'
import { collectRfqReplies, randomRfqId, type PredictRfqRequest } from './nostrRfq'
import { holderPayoff, payoutMultiplier, payoutRefusal, predictMultiplier, predictPayout } from './pricing'
import type { PredictPosition } from './storage'

export interface PredictQuoteInput {
  kind: PredictKind
  lineCents: number
  stakeSats: bigint
  expiry: number
  holderAddress: string
  holderPubkey: string
  spotCents?: number
  vol?: number
}

export interface PredictQuote {
  rfqId: string
  deskName: string
  deskPkHex: string
  backupPkHex: string
  kind: PredictKind
  lineCents: number
  stakeSats: bigint
  payoutSats: bigint
  multiplier: number
  validUntil: number
  deadline: number
  expiry: number
  exit: number
  voidAfter: number
  fallbackDelay: number
  finalExitDelay: number
  beaconTxid: string
  beaconGidx: number
  intentAddress: string
  vaultAddress: string
}

export interface PredictEngine {
  readonly mode: 'live' | 'demo'
  requestQuote(input: PredictQuoteInput): Promise<{ quotes: PredictQuote[]; note: string }>
  fundQuote(quote: PredictQuote, holderAddress: string, holderPubkey: string): Promise<PredictPosition>
  refreshPosition(position: PredictPosition, currentSpotCents?: number | null): Promise<PredictPosition>
  cancelPosition(position: PredictPosition): Promise<{ txid: string }>
  settlePosition(
    position: PredictPosition,
    currentSpotCents?: number | null,
  ): Promise<{
    result: string
    txid?: string
    payoutSats?: bigint
    settleCents?: bigint
  }>
  refundVoidPosition(position: PredictPosition): Promise<{ result: string; txid?: string }>
  reboardPosition(position: PredictPosition): Promise<{ result: 'reboarded' | 'missing'; commitmentTxid?: string }>
}

export function createLivePredictEngine(config: PredictConfig, svcWallet: IWallet | undefined): PredictEngine {
  return {
    mode: 'live',

    async requestQuote(input) {
      const { profile, desks, relays, backupPubkey, beacon } = config
      const names = new Map(desks.map((d) => [d.pubkey.toLowerCase(), d.name]))
      const decoded = ArkAddress.decode(input.holderAddress)
      if (decoded.hrp !== profile.hrp) {
        throw new Error(`Wallet address HRP (${decoded.hrp}) does not match ${profile.label}`)
      }
      const { client } = await connectPredictClient(profile)
      if (!client.emulatorKey) throw new Error('Emulator key unavailable')
      if (bytesToHex(xOnly(client.serverKey)) !== bytesToHex(xOnly(decoded.serverPubKey))) {
        throw new Error('Wallet address belongs to a different Arkade server')
      }

      const payoutKey = xOnly(decoded.vtxoTaprootKey)
      const signerKey = verifiedSignerKey(input.holderAddress, input.holderPubkey, client.serverKey, profile.exit)
      const rfqId = randomRfqId()
      const request: PredictRfqRequest = {
        v: 1,
        type: 'rfq_request',
        rfq_id: rfqId,
        pair: PAIR,
        amount_side: 'from',
        amount: input.stakeSats.toString(),
        profile: {
          kind: input.kind,
          strike: input.lineCents,
          expiry: input.expiry,
          holder_pubkey: bytesToHex(signerKey ?? payoutKey),
          holder_pk_script: bytesToHex(decoded.pkScript),
        },
      }

      let replies = await collectRfqReplies({
        relays,
        recipients: desks.map((d) => d.pubkey),
        payload: request,
        timeoutMs: 8_000,
      })
      if (replies.length === 0) {
        replies = await collectRfqReplies({
          relays,
          recipients: desks.map((d) => d.pubkey),
          payload: request,
          timeoutMs: 8_000,
        })
      }

      const now = Math.floor(Date.now() / 1000)
      const quotes: PredictQuote[] = []
      const reasons: string[] = []

      for (const incoming of replies) {
        if (!names.has(incoming.from)) continue
        if (incoming.message.type === 'rfq_refusal') {
          reasons.push(incoming.message.reason)
          continue
        }
        const q = incoming.message
        if (q.from_amount !== request.amount) continue
        if (q.solver_pubkey !== incoming.from || q.profile.writer_pubkey !== incoming.from) continue
        if (q.valid_until <= now || q.profile.deadline < now + 15) continue
        if (q.profile.deadline > input.expiry - 30) continue
        if (q.profile.exit !== Number(profile.exit)) continue
        if (q.profile.void_after !== Number(profile.voidAfter)) continue
        if (q.profile.fallback_delay !== Number(profile.fallbackDelay)) continue
        if (q.profile.final_exit_delay !== Number(profile.finalExitDelay)) continue
        if (!parseOracleBeacon(beacon, q.profile.beacon_txid, q.profile.beacon_gidx, profile.hrp).ok) continue
        if (
          !backupKeyMatches(
            q.profile.backup_pubkey,
            q.profile.writer_pubkey,
            client.emulatorKey,
            backupPubkey,
            profile.id,
          )
        ) {
          continue
        }
        const payoutSats = BigInt(q.to_amount)
        if (payoutRefusal(payoutSats, input.stakeSats, BEACON_READ_FEE, profile.qMax)) continue

        let bound
        try {
          bound = bindPredictContracts({
            kind: input.kind,
            strike: BigInt(input.lineCents),
            collateral: payoutSats,
            stake: input.stakeSats,
            expiry: BigInt(input.expiry),
            deadline: BigInt(q.profile.deadline),
            exit: profile.exit,
            writerPk: hexToBytes(q.profile.writer_pubkey),
            holderPk: signerKey ?? payoutKey,
            holderPayoutKey: signerKey ? undefined : payoutKey,
            backupPk: hexToBytes(q.profile.backup_pubkey),
            voidAfter: BigInt(q.profile.void_after),
            fallbackDelay: BigInt(q.profile.fallback_delay),
            finalExitDelay: BigInt(q.profile.final_exit_delay),
            beacon: beaconIdOf(asset.AssetId.create(q.profile.beacon_txid, q.profile.beacon_gidx)),
            readFee: BEACON_READ_FEE,
            serverKey: client.serverKey,
            emulatorKey: client.emulatorKey,
            hrp: profile.hrp,
          })
        } catch {
          continue
        }

        if (bound.intentAddress !== q.profile.intent_address) continue
        if (bound.vaultAddress !== q.profile.vault_address) continue
        if (bytesToHex(bound.writerPkScript) !== q.profile.writer_pk_script) continue

        quotes.push({
          rfqId,
          deskName: names.get(incoming.from) ?? 'Desk',
          deskPkHex: q.profile.writer_pubkey,
          backupPkHex: q.profile.backup_pubkey,
          kind: input.kind,
          lineCents: input.lineCents,
          stakeSats: input.stakeSats,
          payoutSats,
          multiplier: payoutMultiplier(input.stakeSats, payoutSats),
          validUntil: q.valid_until,
          deadline: q.profile.deadline,
          expiry: input.expiry,
          exit: q.profile.exit,
          voidAfter: q.profile.void_after,
          fallbackDelay: q.profile.fallback_delay,
          finalExitDelay: q.profile.final_exit_delay,
          beaconTxid: q.profile.beacon_txid,
          beaconGidx: q.profile.beacon_gidx,
          intentAddress: q.profile.intent_address,
          vaultAddress: q.profile.vault_address,
        })
      }

      if (quotes.length === 0) {
        return {
          quotes,
          note: reasons[0] ? reasons[0] : 'no_answer',
        }
      }
      quotes.sort((a, b) => (a.payoutSats > b.payoutSats ? -1 : a.payoutSats < b.payoutSats ? 1 : 0))
      return { quotes, note: '' }
    },

    async fundQuote(quote, holderAddress, holderPubkey) {
      if (!svcWallet) throw new Error('Wallet is not ready')
      const fundingTxid = await sendOffChain(svcWallet, Number(quote.stakeSats), quote.intentAddress)

      // Fire-and-forget best-effort executord delegations so unfilled intents auto-refund & vaults reboard.
      void (async () => {
        try {
          const { client } = await connectPredictClient(config.profile)
          if (!client.emulatorKey) return
          const decoded = ArkAddress.decode(holderAddress)
          const payoutKey = xOnly(decoded.vtxoTaprootKey)
          const signerKey = verifiedSignerKey(holderAddress, holderPubkey, client.serverKey, BigInt(quote.exit))
          const bound = bindPredictContracts({
            kind: quote.kind,
            strike: BigInt(quote.lineCents),
            collateral: quote.payoutSats,
            stake: quote.stakeSats,
            expiry: BigInt(quote.expiry),
            deadline: BigInt(quote.deadline),
            exit: BigInt(quote.exit),
            writerPk: hexToBytes(quote.deskPkHex),
            holderPk: signerKey ?? payoutKey,
            holderPayoutKey: signerKey ? undefined : payoutKey,
            backupPk: hexToBytes(quote.backupPkHex),
            voidAfter: BigInt(quote.voidAfter),
            fallbackDelay: BigInt(quote.fallbackDelay),
            finalExitDelay: BigInt(quote.finalExitDelay),
            beacon: beaconIdOf(asset.AssetId.create(quote.beaconTxid, quote.beaconGidx)),
            readFee: BEACON_READ_FEE,
            serverKey: client.serverKey,
            emulatorKey: client.emulatorKey,
            hrp: config.profile.hrp,
          })
          await registerPredictExecutorDelegations({
            executorUrl: config.profile.executorUrl,
            serverKey: client.serverKey,
            emulatorKey: client.emulatorKey,
            bound,
          })
        } catch {
          // Non-fatal: manual cancel/reboard remain available in Positions.
        }
      })()

      return {
        id: quote.rfqId,
        rfqId: quote.rfqId,
        network: config.profile.id,
        mode: 'live',
        kind: quote.kind,
        strikeCents: quote.lineCents.toString(),
        stakeSats: quote.stakeSats.toString(),
        payoutSats: quote.payoutSats.toString(),
        multiplier: quote.multiplier,
        expiry: quote.expiry,
        deadline: quote.deadline,
        exit: quote.exit,
        voidAfter: quote.voidAfter,
        fallbackDelay: quote.fallbackDelay,
        finalExitDelay: quote.finalExitDelay,
        holderAddress,
        holderPubkey,
        deskName: quote.deskName,
        deskPkHex: quote.deskPkHex,
        backupPkHex: quote.backupPkHex,
        beaconTxid: quote.beaconTxid,
        beaconGidx: quote.beaconGidx,
        intentAddress: quote.intentAddress,
        vaultAddress: quote.vaultAddress,
        phase: 'funded',
        refundable: false,
        fundingTxid,
        createdAt: Math.floor(Date.now() / 1000),
      }
    },

    async refreshPosition(position) {
      return refreshLivePosition(position, config.profile)
    },

    async cancelPosition(position) {
      return cancelLivePredictIntent(position, config.profile)
    },

    async settlePosition(position) {
      return settleLivePredictVault(position, config.profile, config.beacon)
    },

    async refundVoidPosition(position) {
      return refundLivePredictVault(position, config.profile)
    },

    async reboardPosition(position) {
      return reboardLivePredictVault(position, config.profile)
    },
  }
}

export function createDemoPredictEngine(config: PredictConfig): PredictEngine {
  return {
    mode: 'demo',

    async requestQuote(input) {
      const now = Math.floor(Date.now() / 1000)
      const years = Math.max(60, input.expiry - now) / (365.25 * 86_400)
      const spot = input.spotCents ?? input.lineCents
      const vol = input.vol ?? 0.55
      const mult =
        predictMultiplier({
          kind: input.kind,
          spotCents: spot,
          lineCents: input.lineCents,
          years,
          vol,
        }) ?? 1.9
      const payoutSats = predictPayout(input.stakeSats, mult)
      if (payoutRefusal(payoutSats, input.stakeSats, BEACON_READ_FEE, config.profile.qMax)) {
        return { quotes: [], note: 'payout' }
      }
      const rfqId = randomRfqId()
      const prefix = config.profile.hrp
      return {
        quotes: [
          {
            rfqId,
            deskName: `${config.desks[0]?.name ?? 'COINFLIP'} (Demo)`,
            deskPkHex: config.desks[0]?.pubkey ?? '0'.repeat(64),
            backupPkHex: config.backupPubkey ?? '1'.repeat(64),
            kind: input.kind,
            lineCents: input.lineCents,
            stakeSats: input.stakeSats,
            payoutSats,
            multiplier: mult,
            validUntil: now + QUOTE_TTL_S,
            deadline: Math.min(now + PREDICT_LOCK_S, input.expiry - 30),
            expiry: input.expiry,
            exit: Number(config.profile.exit),
            voidAfter: Number(config.profile.voidAfter),
            fallbackDelay: Number(config.profile.fallbackDelay),
            finalExitDelay: Number(config.profile.finalExitDelay),
            beaconTxid: config.beacon.issueTxid,
            beaconGidx: 0,
            intentAddress: `${prefix}1demo${rfqId.slice(0, 32)}`,
            vaultAddress: `${prefix}1vlt${rfqId.slice(0, 32)}`,
          },
        ],
        note: '',
      }
    },

    async fundQuote(quote, holderAddress, holderPubkey) {
      const now = Math.floor(Date.now() / 1000)
      return {
        id: quote.rfqId,
        rfqId: quote.rfqId,
        network: config.profile.id,
        mode: 'demo',
        kind: quote.kind,
        strikeCents: quote.lineCents.toString(),
        stakeSats: quote.stakeSats.toString(),
        payoutSats: quote.payoutSats.toString(),
        multiplier: quote.multiplier,
        expiry: quote.expiry,
        deadline: quote.deadline,
        exit: quote.exit,
        voidAfter: quote.voidAfter,
        fallbackDelay: quote.fallbackDelay,
        finalExitDelay: quote.finalExitDelay,
        holderAddress,
        holderPubkey,
        deskName: quote.deskName,
        deskPkHex: quote.deskPkHex,
        backupPkHex: quote.backupPkHex,
        beaconTxid: quote.beaconTxid,
        beaconGidx: quote.beaconGidx,
        intentAddress: quote.intentAddress,
        vaultAddress: quote.vaultAddress,
        phase: 'funded',
        refundable: false,
        fundingTxid: `demo${quote.rfqId.slice(4)}`,
        createdAt: now,
      }
    },

    async refreshPosition(position, currentSpotCents) {
      const now = Math.floor(Date.now() / 1000)
      if (position.phase === 'settled' || position.phase === 'refunded') return position
      if (position.phase === 'funded' && now - position.createdAt >= 2) {
        return {
          ...position,
          phase: 'filled',
          fillTxid: position.fillTxid || `fill${position.id.slice(4)}`,
        }
      }
      if (position.phase === 'filled' && now >= position.expiry) {
        const settlePrice = BigInt(currentSpotCents ?? Number(position.strikeCents))
        const payout = BigInt(position.payoutSats)
        const gross = holderPayoff(position.kind, settlePrice, BigInt(position.strikeCents), payout)
        const net = payout > BEACON_READ_FEE ? payout - BEACON_READ_FEE : 0n
        return {
          ...position,
          phase: 'settled',
          settleTxid: `setl${position.id.slice(4)}`,
          settleCents: settlePrice.toString(),
          userPayoutSats: gross > 0n ? net.toString() : '0',
          deskPayoutSats: gross > 0n ? '0' : net.toString(),
        }
      }
      return position
    },

    async cancelPosition(position) {
      return { txid: `cncl${position.id.slice(4)}` }
    },

    async settlePosition(position, currentSpotCents) {
      const settlePrice = BigInt(currentSpotCents ?? Number(position.strikeCents))
      const payout = BigInt(position.payoutSats)
      const gross = holderPayoff(position.kind, settlePrice, BigInt(position.strikeCents), payout)
      const net = payout > BEACON_READ_FEE ? payout - BEACON_READ_FEE : 0n
      return {
        result: 'settled',
        txid: `setl${position.id.slice(4)}`,
        payoutSats: gross > 0n ? net : 0n,
        settleCents: settlePrice,
      }
    },

    async refundVoidPosition(position) {
      return { result: 'refunded', txid: `void${position.id.slice(4)}` }
    },

    async reboardPosition() {
      return { result: 'reboarded', commitmentTxid: 'demo-commitment' }
    },
  }
}
