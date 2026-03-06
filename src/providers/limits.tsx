import { ReactNode, createContext, useContext, useEffect, useRef } from 'react'
import { Satoshis } from '../lib/types'
import { AspContext } from './asp'
import { consoleError } from '../lib/logs'
import { WalletContext } from './wallet'
import { SwapsContext } from './swaps'

enum TxType {
  arkToBtc = 'arkToBtc',
  btcToArk = 'btcToArk',
  swap = 'swap',
  utxo = 'utxo',
  vtxo = 'vtxo',
}

type LimitsContextProps = {
  amountIsAboveMaxLimit: (sats: Satoshis) => boolean
  amountIsBelowMinLimit: (sats: Satoshis) => boolean
  validArkToBtc: (sats: Satoshis) => boolean
  validBtcToArk: (sats: Satoshis) => boolean
  validLnSwap: (sats: Satoshis) => boolean
  validUtxoTx: (sats: Satoshis) => boolean
  validVtxoTx: (sats: Satoshis) => boolean
  arkToBtcAllowed: () => boolean
  btcToArkAllowed: () => boolean
  lnSwapsAllowed: () => boolean
  utxoTxsAllowed: () => boolean
  vtxoTxsAllowed: () => boolean
  minSwapAllowed: () => number
  maxSwapAllowed: () => number
}

type LimitAmounts = {
  min: bigint
  max: bigint
}

type LimitTxTypes = Record<TxType, LimitAmounts>

export const LimitsContext = createContext<LimitsContextProps>({
  amountIsAboveMaxLimit: () => false,
  amountIsBelowMinLimit: () => false,
  arkToBtcAllowed: () => false,
  btcToArkAllowed: () => false,
  lnSwapsAllowed: () => false,
  utxoTxsAllowed: () => false,
  vtxoTxsAllowed: () => false,
  validArkToBtc: () => false,
  validBtcToArk: () => false,
  validLnSwap: () => false,
  validUtxoTx: () => false,
  validVtxoTx: () => false,
  minSwapAllowed: () => 0,
  maxSwapAllowed: () => 0,
})

export const LimitsProvider = ({ children }: { children: ReactNode }) => {
  const { aspInfo } = useContext(AspContext)
  const { svcWallet } = useContext(WalletContext)
  const { arkadeSwaps, connected } = useContext(SwapsContext)

  const limits = useRef<LimitTxTypes>({
    arkToBtc: { min: BigInt(0), max: BigInt(0) },
    btcToArk: { min: BigInt(0), max: BigInt(0) },
    swap: { min: BigInt(0), max: BigInt(0) },
    utxo: { min: BigInt(0), max: BigInt(-1) },
    vtxo: { min: BigInt(0), max: BigInt(-1) },
  })

  // update limits when aspInfo or svcWallet changes
  useEffect(() => {
    if (!aspInfo.network || !svcWallet || !connected) return

    limits.current.utxo = {
      min: BigInt(import.meta.env.VITE_UTXO_MIN_AMOUNT || aspInfo.utxoMinAmount || aspInfo.dust || -1),
      max: BigInt(import.meta.env.VITE_UTXO_MAX_AMOUNT || aspInfo.utxoMaxAmount || -1),
    }

    limits.current.vtxo = {
      min: BigInt(import.meta.env.VITE_VTXO_MIN_AMOUNT || aspInfo.vtxoMinAmount || aspInfo.dust || -1),
      max: BigInt(import.meta.env.VITE_VTXO_MAX_AMOUNT || aspInfo.vtxoMaxAmount || -1),
    }
  }, [aspInfo.network, svcWallet, connected])

  // update limits when arkadeSwaps or connected changes
  useEffect(() => {
    if (!arkadeSwaps) return
    if (!connected) {
      limits.current.swap = {
        ...limits.current.swap,
        min: BigInt(0),
        max: BigInt(0),
      }
      limits.current.arkToBtc = {
        ...limits.current.arkToBtc,
        min: BigInt(0),
        max: BigInt(0),
      }
      limits.current.btcToArk = {
        ...limits.current.btcToArk,
        min: BigInt(0),
        max: BigInt(0),
      }
    } else {
      arkadeSwaps
        .getLimits()
        .then((res) => {
          if (!res) return
          limits.current.swap = {
            ...limits.current.swap,
            min: BigInt(res.min),
            max: BigInt(res.max),
          }
        })
        .catch(consoleError)
      arkadeSwaps
        .getLimits('ARK', 'BTC')
        .then((res) => {
          if (!res) return
          limits.current.arkToBtc = {
            ...limits.current.arkToBtc,
            min: BigInt(res.min),
            max: BigInt(res.max),
          }
        })
        .catch(consoleError)
      arkadeSwaps
        .getLimits('BTC', 'ARK')
        .then((res) => {
          if (!res) return
          limits.current.btcToArk = {
            ...limits.current.btcToArk,
            min: BigInt(res.min),
            max: BigInt(res.max),
          }
        })
        .catch(consoleError)
    }
  }, [arkadeSwaps, connected])

  const minSwapAllowed = () => Number(limits.current.swap.min)
  const maxSwapAllowed = () => Number(limits.current.swap.max)

  const validAmount = (sats: Satoshis, txtype: TxType): boolean => {
    if (!sats) return txtype !== TxType.swap
    const bigSats = BigInt(sats)
    const { min, max } = limits.current[txtype]
    return bigSats >= min && (max === BigInt(-1) || bigSats <= max)
  }

  const validLnSwap = (sats: Satoshis): boolean => validAmount(sats, TxType.swap)
  const validUtxoTx = (sats: Satoshis): boolean => validAmount(sats, TxType.utxo)
  const validVtxoTx = (sats: Satoshis): boolean => validAmount(sats, TxType.vtxo)
  const validArkToBtc = (sats: Satoshis): boolean => validAmount(sats, TxType.arkToBtc)
  const validBtcToArk = (sats: Satoshis): boolean => validAmount(sats, TxType.btcToArk)

  /**
   * Calculates the maximum allowed amount based on UTXO and VTXO limits.
   * Uses a decision matrix to determine the appropriate limit:
   * - If VTXO max is -1 (unlimited), return UTXO max or -1
   * - If VTXO max is 0, return UTXO max
   * - If UTXO max is <= 0, return VTXO max
   * - Otherwise, return the minimum of both limits
   * @returns The maximum allowed amount in satoshis, or -1 for unlimited
   *
   *              VTXO max amount
   *              |  -1 |   0 | 666 |
   *              +-----------------+
   * UTXO      -1 |  -1 |  -1 | 666 |
   * max        0 |  -1 |   0 | 666 |
   * amount   444 | 444 | 444 | 444 |
   *
   */
  const getMaxSatsAllowed = (): bigint => {
    const { utxo, vtxo } = limits.current
    if (vtxo.max === BigInt(-1)) return utxo.max > 0 ? utxo.max : BigInt(-1)
    if (vtxo.max === BigInt(0)) return utxo.max
    if (utxo.max <= BigInt(0)) return vtxo.max
    return utxo.max < vtxo.max ? utxo.max : vtxo.max
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
  const getMinSatsAllowed = (): bigint => {
    const { utxo, vtxo } = limits.current
    return utxo.min < vtxo.min ? utxo.min : vtxo.min
  }

  /**
   * Checks if the given amount exceeds the maximum allowed limit.
   * @param sats - The amount in satoshis to check
   * @returns true if the amount is above the maximum limit, false otherwise
   */
  const amountIsAboveMaxLimit = (sats: Satoshis): boolean => {
    const maxAllowed = getMaxSatsAllowed()
    return maxAllowed === BigInt(-1) ? false : BigInt(sats) > maxAllowed
  }

  /**
   * Checks if the given amount is below the minimum dust limit.
   * @param sats - The amount in satoshis to check
   * @returns true if the amount is below the minimum limit, false otherwise
   */
  const amountIsBelowMinLimit = (sats: Satoshis) => {
    return getMinSatsAllowed() < 0 ? false : BigInt(sats) < getMinSatsAllowed()
  }

  const lnSwapsAllowed = () => limits.current.swap.max !== BigInt(0)
  const utxoTxsAllowed = () => limits.current.utxo.max !== BigInt(0)
  const vtxoTxsAllowed = () => limits.current.vtxo.max !== BigInt(0)
  const arkToBtcAllowed = () => limits.current.arkToBtc.max !== BigInt(0)
  const btcToArkAllowed = () => limits.current.btcToArk.max !== BigInt(0)

  return (
    <LimitsContext.Provider
      value={{
        amountIsAboveMaxLimit,
        amountIsBelowMinLimit,
        arkToBtcAllowed,
        btcToArkAllowed,
        minSwapAllowed,
        maxSwapAllowed,
        lnSwapsAllowed,
        utxoTxsAllowed,
        vtxoTxsAllowed,
        validLnSwap,
        validUtxoTx,
        validVtxoTx,
        validArkToBtc,
        validBtcToArk,
      }}
    >
      {children}
    </LimitsContext.Provider>
  )
}
