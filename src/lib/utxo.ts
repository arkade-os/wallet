import {
  ExtendedCoin,
  hasBoardingTxExpired,
  VtxoScript,
  IReadonlyWallet,
  RelativeTimelock,
} from '@arkade-os/sdk'

const isExpiredUtxo = (utxo: ExtendedCoin) => {
  const vtxoScript = VtxoScript.decode(utxo.tapTree)
  const exitPaths = vtxoScript.exitPaths()
  let earliestTimelock: RelativeTimelock | undefined = undefined
  for (const path of exitPaths) {
    earliestTimelock = earliestTimelock
      ? path.params.timelock.value < earliestTimelock.value
        ? path.params.timelock
        : earliestTimelock
      : path.params.timelock
  }

  return earliestTimelock ? hasBoardingTxExpired(utxo, earliestTimelock) : false
}

export const getConfirmedAndNotExpiredUtxos = async (wallet: IReadonlyWallet) => {
  return (await wallet.getBoardingUtxos())
    .filter((utxo) => utxo.status.confirmed)
    .filter((utxo) => !isExpiredUtxo(utxo))
}
