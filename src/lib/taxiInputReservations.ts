import type { ServiceWorkerWallet } from '@arkade-os/sdk'
import type { RecyclePlan, VerifiedClaim } from '@arkade-taxi/client/wallet'
import { hex } from '@scure/base'

type Outpoint = { txid: string; vout: number }
type Reservation = { release: () => void | Promise<void> }
type ReservationWallet = Pick<ServiceWorkerWallet, 'identity' | 'getArkadeReader' | 'getContractManager'> & {
  reserveVtxos?: (outpoints: Outpoint[], reservationId: string) => Reservation | Promise<Reservation>
}
type TaxiInputReservation = {
  id: string
  outpoints: Outpoint[]
  phase: 'reserving' | 'submitting' | 'submitted'
  claimTxid?: string
}

const txid = (value: unknown): value is string => typeof value === 'string' && /^[0-9a-f]{64}$/.test(value)
const storageKey = async (wallet: ReservationWallet, network: string, serverUrl: string) =>
  `taxi-input-reservations:${network}:${serverUrl}:${hex.encode(await wallet.identity.xOnlyPublicKey())}`

const read = (key: string): TaxiInputReservation[] => {
  const raw = localStorage.getItem(key)
  if (!raw) return []
  const entries: unknown = JSON.parse(raw)
  if (
    !Array.isArray(entries) ||
    entries.some(
      (entry) =>
        !entry ||
        typeof entry.id !== 'string' ||
        !/^taxi-(claim|send):/.test(entry.id) ||
        !Array.isArray(entry.outpoints) ||
        !entry.outpoints.length ||
        entry.outpoints.some(
          (outpoint: Outpoint) => !txid(outpoint?.txid) || !Number.isSafeInteger(outpoint?.vout) || outpoint.vout < 0,
        ) ||
        !['reserving', 'submitting', 'submitted'].includes(entry.phase) ||
        (entry.claimTxid !== undefined && !txid(entry.claimTxid)),
    )
  )
    throw new Error('Taxi payment recovery records are invalid')
  return entries
}

const write = (key: string, entry: TaxiInputReservation) => {
  const entries = read(key).filter((other) => other.id !== entry.id)
  localStorage.setItem(key, JSON.stringify([...entries, entry]))
}

const remove = (key: string, id: string) => {
  const entries = read(key).filter((entry) => entry.id !== id)
  if (entries.length) localStorage.setItem(key, JSON.stringify(entries))
  else localStorage.removeItem(key)
}

const releaseObserved = async (
  wallet: ReservationWallet,
  key: string,
  entry: TaxiInputReservation,
  hold: Reservation,
) => {
  if (entry.phase !== 'reserving') {
    const spent = (coins: { txid: string; vout: number; isSpent?: boolean }[]) =>
      entry.outpoints.every((outpoint) =>
        coins.some((coin) => coin.txid === outpoint.txid && coin.vout === outpoint.vout && coin.isSpent),
      )
    const reader = await wallet.getArkadeReader()
    const { vtxos } = await reader.getVtxos({ outpoints: entry.outpoints })
    if (!spent(vtxos)) return
    const manager = await wallet.getContractManager()
    await manager.refreshOutpoints(entry.outpoints)
    const stored = await manager.getStoredContractsWithVtxos()
    if (!spent(stored.flatMap(({ vtxos }) => vtxos))) return
  }
  await hold.release()
  remove(key, entry.id)
}

export const reconcileTaxiInputReservations = async (wallet: ReservationWallet, network: string, serverUrl: string) => {
  const key = await storageKey(wallet, network, serverUrl)
  const entries = read(key)
  if (!entries.length) return
  if (!wallet.reserveVtxos) throw new Error('This wallet cannot safely reserve Taxi payment inputs')
  for (const entry of entries) {
    const hold = await wallet.reserveVtxos(entry.outpoints, entry.id)
    await releaseObserved(wallet, key, entry, hold)
  }
}

export const reserveTaxiInputs = async (
  wallet: ReservationWallet,
  network: string,
  serverUrl: string,
  id: string,
  outpoints: Outpoint[],
  resume = false,
) => {
  if (!wallet.reserveVtxos) throw new Error('This wallet cannot safely reserve Taxi payment inputs')
  const selected = outpoints.map(({ txid, vout }) => ({ txid, vout }))
  const key = await storageKey(wallet, network, serverUrl)
  const known = read(key).find((entry) => entry.id === id)
  if (known && !resume) throw new Error('Check the previous Taxi payment before retrying')
  if (known && JSON.stringify(known.outpoints) !== JSON.stringify(selected))
    throw new Error('Taxi payment inputs differ from its recovery record')
  const entry: TaxiInputReservation = known ?? {
    id,
    outpoints: selected,
    phase: resume ? 'submitting' : 'reserving',
  }
  write(key, entry)
  const hold = await wallet.reserveVtxos(entry.outpoints, id)
  if (entry.phase === 'reserving') entry.phase = 'submitting'
  write(key, entry)
  return {
    release: async (claimTxid?: string) => {
      if (claimTxid !== undefined && !txid(claimTxid)) throw new Error('Taxi returned an invalid claim transaction')
      entry.phase = claimTxid ? 'submitted' : 'reserving'
      entry.claimTxid = claimTxid
      write(key, entry)
      await releaseObserved(wallet, key, entry, hold)
    },
  }
}

export const reserveTaxiClaim = (
  wallet: ReservationWallet,
  network: string,
  serverUrl: string,
  offer: VerifiedClaim,
  plan: RecyclePlan,
) =>
  reserveTaxiInputs(wallet, network, serverUrl, `taxi-claim:${offer.taxi.url}:${offer.claim.transferId}`, [
    { txid: plan.coin.txid, vout: plan.coin.vout },
  ])
