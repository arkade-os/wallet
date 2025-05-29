import { ReactNode, createContext, useContext, useEffect, useRef } from 'react'
import { Satoshis, TxType } from '../lib/types'
import { AspContext } from './asp'
import { getBoltzLimits } from '../lib/boltz'
import { consoleError } from '../lib/logs'

type LimitsContextProps = {
  amountIsAboveMaxLimit: (sats: Satoshis) => boolean
  amountIsBelowMinLimit: (sats: Satoshis) => boolean
  validLnSwap: (sats: Satoshis) => boolean
  validUtxoTx: (sats: Satoshis) => boolean
  validVtxoTx: (sats: Satoshis) => boolean
  lnSwapsAllowed: () => boolean
  utxoTxsAllowed: () => boolean
  vtxoTxsAllowed: () => boolean
}

type LimitAmounts = {
  min: Satoshis
  max: Satoshis
}

type LimitTxTypes = Record<TxType, LimitAmounts>

export const LimitsContext = createContext<LimitsContextProps>({
  amountIsAboveMaxLimit: () => false,
  amountIsBelowMinLimit: () => false,
  validLnSwap: () => false,
  validUtxoTx: () => false,
  validVtxoTx: () => false,
  lnSwapsAllowed: () => false,
  utxoTxsAllowed: () => false,
  vtxoTxsAllowed: () => false,
})

export const LimitsProvider = ({ children }: { children: ReactNode }) => {
  const { aspInfo } = useContext(AspContext)

  const limits = useRef<LimitTxTypes>({
    swap: { min: 1000, max: 4294967 },
    utxo: { min: 0, max: -1 },
    vtxo: { min: 0, max: -1 },
  })

  useEffect(() => {
    if (!aspInfo.network) return

    limits.current.utxo = {
      min: aspInfo.utxoMinAmount ?? aspInfo.dust ?? -1,
      max: aspInfo.utxoMaxAmount ?? -1,
    }

    limits.current.vtxo = {
      min: aspInfo.vtxoMinAmount ?? aspInfo.dust ?? -1,
      max: aspInfo.vtxoMaxAmount ?? -1,
    }

    getBoltzLimits(aspInfo.network)
      .then(({ min, max }) => {
        limits.current.swap = { ...limits.current.swap, min, max }
      })
      .catch(consoleError)
  }, [aspInfo.network])

  const validAmount = (sats: Satoshis, txtype: TxType): boolean => {
    if (!sats) return txtype !== TxType.swap
    const { min, max } = limits.current[txtype]
    return sats >= min && (max === -1 || sats <= max)
  }

  const validLnSwap = (sats: Satoshis): boolean => validAmount(sats, TxType.swap)
  const validUtxoTx = (sats: Satoshis): boolean => validAmount(sats, TxType.utxo)
  const validVtxoTx = (sats: Satoshis): boolean => validAmount(sats, TxType.vtxo)

  // calculate absolute max sats available to send or receive
  // it should be the mininum between utxo and vtxo max amounts,
  // but we need to consider the special value -1 for 'no limits'
  //
  //              VTXO max amount
  //              |  -1 |   0 | 666 |
  //              +-----------------+
  // UTXO      -1 |  -1 |  -1 | 666 |
  // max        0 |  -1 |   0 | 666 |
  // amount   444 | 444 | 444 | 444 |
  //
  const getMaxSatsAllowed = (): Satoshis => {
    const { utxo, vtxo } = limits.current
    if (vtxo.max === -1) return utxo.max > 0 ? utxo.max : -1
    if (vtxo.max === 0) return utxo.max
    if (utxo.max <= 0) return vtxo.max
    return Math.min(utxo.max, vtxo.max)
  }

  // calculate absolute min sats available to send or receive
  // it should be the maximum between utxo and vtxo min amounts,
  // but we need to consider the special value -1 for 'no limits'
  //
  //              VTXO min amount
  //              |  -1 |   0 | 333 |
  //              +-----------------+
  // UTXO      -1 |  -1 |  -1 |  -1 |
  // min        0 |  -1 |   0 |   0 |
  // amount   444 |  -1 |   0 | 333 |
  //
  const getMinSatsAllowed = (): Satoshis => {
    const { utxo, vtxo } = limits.current
    return Math.min(utxo.min, vtxo.min)
  }

  const amountIsAboveMaxLimit = (sats: Satoshis) => {
    return getMaxSatsAllowed() < 0 ? false : sats > getMaxSatsAllowed()
  }

  const amountIsBelowMinLimit = (sats: Satoshis) => {
    return getMinSatsAllowed() < 0 ? false : sats < getMinSatsAllowed()
  }

  const lnSwapsAllowed = () => limits.current.swap.max !== 0
  const utxoTxsAllowed = () => limits.current.utxo.max !== 0
  const vtxoTxsAllowed = () => limits.current.vtxo.max !== 0

  return (
    <LimitsContext.Provider
      value={{
        amountIsAboveMaxLimit,
        amountIsBelowMinLimit,
        validLnSwap,
        validUtxoTx,
        validVtxoTx,
        lnSwapsAllowed,
        utxoTxsAllowed,
        vtxoTxsAllowed,
      }}
    >
      {children}
    </LimitsContext.Provider>
  )
}
