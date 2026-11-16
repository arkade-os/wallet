import { Transaction, type ArkadeReader, type Outpoint } from '@arkade-os/sdk'
import { base64, hex } from '@scure/base'

const point = ({ txid, vout }: Outpoint) => `${txid}:${vout}`
const validPoint = ({ txid, vout }: Outpoint) => /^[0-9a-f]{64}$/.test(txid) && Number.isSafeInteger(vout) && vout >= 0

export const isFinalizedTaxiClaimConflict = async (
  reader: ArkadeReader,
  originalClaim: Outpoint,
  held: readonly Outpoint[],
): Promise<boolean> => {
  if (!validPoint(originalClaim) || !held.length || held.some((outpoint) => !validPoint(outpoint))) return false
  const heldPoints = new Set(held.map(point))
  const { vtxos } = await reader.getVtxos({ outpoints: [originalClaim] })
  const claims = vtxos.filter((coin) => point(coin) === point(originalClaim))
  if (claims.length !== 1) return false
  const claim = claims[0]
  if (!claim.isSpent || !claim.spentBy || !claim.arkTxId) return false
  if (!/^[0-9a-f]{64}$/.test(claim.spentBy) || !/^[0-9a-f]{64}$/.test(claim.arkTxId)) return false

  const readTransactions = async (ids: string[]) => {
    const { txs } = await reader.getVirtualTxs(ids)
    const found = new Map<string, Transaction>()
    for (const raw of txs) {
      try {
        const tx = Transaction.fromPSBT(base64.decode(raw))
        if (!ids.includes(tx.id) || found.has(tx.id)) return
        found.set(tx.id, tx)
      } catch {
        return
      }
    }
    return found.size === ids.length ? found : undefined
  }
  const final = (await readTransactions([claim.arkTxId]))?.get(claim.arkTxId)
  if (!final || !final.inputsLength) return false
  const checkpointIds: string[] = []
  for (let i = 0; i < final.inputsLength; i++) {
    const input = final.getInput(i)
    if (!input.txid || input.index !== 0) return false
    checkpointIds.push(hex.encode(input.txid))
  }
  if (!checkpointIds.includes(claim.spentBy) || new Set(checkpointIds).size !== checkpointIds.length) return false
  const checkpoints = await readTransactions(checkpointIds)
  if (!checkpoints) return false
  for (let i = 0; i < checkpointIds.length; i++) {
    const checkpoint = checkpoints.get(checkpointIds[i])!
    if (checkpoint.inputsLength !== 1) return false
    const input = checkpoint.getInput(0)
    if (!input.txid || input.index === undefined) return false
    const spent = { txid: hex.encode(input.txid), vout: input.index }
    if (!validPoint(spent) || heldPoints.has(point(spent))) return false
    if (checkpoint.id === claim.spentBy && point(spent) !== point(originalClaim)) return false
    const output = checkpoint.outputsLength ? checkpoint.getOutput(0) : undefined
    const witness = final.getInput(i).witnessUtxo
    if (!output?.script || !witness || output.amount !== witness.amount) return false
    if (hex.encode(output.script) !== hex.encode(witness.script)) return false
  }

  // Arkd projects these outputs only after the spending transaction is finalized.
  const output = Array.from({ length: final.outputsLength }, (_, vout) => ({ vout, ...final.getOutput(vout) })).find(
    ({ script, amount }) =>
      script?.length === 34 && script[0] === 0x51 && script[1] === 0x20 && amount !== undefined && amount > 0n,
  )
  if (!output?.script || output.amount === undefined) return false
  const { vtxos: indexed } = await reader.getVtxos({ outpoints: [{ txid: final.id, vout: output.vout }] })
  const matches = indexed.filter((coin) => coin.txid === final.id && coin.vout === output.vout)
  return (
    matches.length === 1 &&
    matches[0].script === hex.encode(output.script) &&
    Number.isSafeInteger(matches[0].value) &&
    BigInt(matches[0].value) === output.amount
  )
}
