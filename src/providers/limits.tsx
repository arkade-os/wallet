import { ReactNode, createContext, useContext, useEffect, useRef } from 'react'
import { WalletContext } from './wallet'
import { AspContext } from './asp'

enum TxType {
  utxo = 'utxo',
  vtxo = 'vtxo',
}

type LimitsContextProps = {
  amountIsAboveMaxLimit: (sats: number) => boolean
  amountIsBelowMinLimit: (sats: number) => boolean
  utxoTxsAllowed: () => boolean
  vtxoTxsAllowed: () => boolean
}

type LimitAmounts = {
  min: number
  max: number
}

type LimitTxTypes = Record<TxType, LimitAmounts>

export const LimitsContext = createContext<LimitsContextProps>({
  amountIsAboveMaxLimit: () => false,
  amountIsBelowMinLimit: () => false,
  utxoTxsAllowed: () => false,
  vtxoTxsAllowed: () => false,
})

export const LimitsProvider = ({ children }: { children: ReactNode }) => {
  const { aspInfo } = useContext(AspContext)
  const { svcWallet } = useContext(WalletContext)

  const limits = useRef<LimitTxTypes>({
    utxo: { min: 0, max: -1 },
    vtxo: { min: 0, max: -1 },
  })

  // update limits when aspInfo or svcWallet changes
  useEffect(() => {
    if (!aspInfo.network || !svcWallet) return

    limits.current.utxo = {
      min: Number(import.meta.env.VITE_UTXO_MIN_AMOUNT || aspInfo.utxoMinAmount || aspInfo.dust || -1),
      max: Number(import.meta.env.VITE_UTXO_MAX_AMOUNT || aspInfo.utxoMaxAmount || -1),
    }

    limits.current.vtxo = {
      min: Number(import.meta.env.VITE_VTXO_MIN_AMOUNT || aspInfo.vtxoMinAmount || aspInfo.dust || -1),
      max: Number(import.meta.env.VITE_VTXO_MAX_AMOUNT || aspInfo.vtxoMaxAmount || -1),
    }
  }, [aspInfo.network, svcWallet])

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
  const getMaxSatsAllowed = (): number => {
    const { utxo, vtxo } = limits.current
    if (vtxo.max === -1) return utxo.max > 0 ? utxo.max : -1
    if (vtxo.max === 0) return utxo.max
    if (utxo.max <= 0) return vtxo.max
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
  const getMinSatsAllowed = (): number => {
    const { utxo, vtxo } = limits.current
    return utxo.min < vtxo.min ? utxo.min : vtxo.min
  }

  /**
   * Checks if the given amount exceeds the maximum allowed limit.
   * @param sats - The amount in satoshis to check
   * @returns true if the amount is above the maximum limit, false otherwise
   */
  const amountIsAboveMaxLimit = (sats: number): boolean => {
    const maxAllowed = getMaxSatsAllowed()
    return maxAllowed === -1 ? false : sats > maxAllowed
  }

  /**
   * Checks if the given amount is below the minimum dust limit.
   * @param sats - The amount in satoshis to check
   * @returns true if the amount is below the minimum limit, false otherwise
   */
  const amountIsBelowMinLimit = (sats: number) => {
    return getMinSatsAllowed() < 0 ? false : sats < getMinSatsAllowed()
  }

  const utxoTxsAllowed = () => limits.current.utxo.max !== 0
  const vtxoTxsAllowed = () => limits.current.vtxo.max !== 0

  return (
    <LimitsContext.Provider
      value={{
        amountIsAboveMaxLimit,
        amountIsBelowMinLimit,
        utxoTxsAllowed,
        vtxoTxsAllowed,
      }}
    >
      {children}
    </LimitsContext.Provider>
  )
}
