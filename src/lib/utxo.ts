import {
  ExtendedCoin,
  hasBoardingTxExpired,
  TapLeafScript,
  IWallet,
  CSVMultisigTapscript,
  VtxoScript,
} from '@arkade-os/sdk'

const isExpiredUtxo = (utxo: ExtendedCoin) => {
  const leaf = VtxoScript.decode(utxo.tapTree).leaves[1] as TapLeafScript
  const script = leaf[1].subarray(0, leaf[1].length - 1) // remove the version byte
  const exitScript = CSVMultisigTapscript.decode(script)
  const boardingTimelock = exitScript.params.timelock
  return hasBoardingTxExpired(utxo, boardingTimelock)
}

export const getConfirmedAndNotExpiredUtxos = async (wallet: IWallet) => {
  return (await wallet.getBoardingUtxos())
    .filter((utxo) => utxo.status.confirmed)
    .filter((utxo) => !isExpiredUtxo(utxo))
}
