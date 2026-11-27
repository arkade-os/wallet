import { ReactNode, createContext, useContext } from 'react'
import type { IntentFeeConfig } from '@arkade-os/sdk'
import { Vtxo } from '../lib/types'
import { OperatorContext } from './operator'

interface FeesContextProps {
  calcOffchainInputFee: (vtxo: Vtxo) => number
  calcOffchainOutputFee: (vtxo: Vtxo) => number
  calcOnchainInputFee: (vtxo: Vtxo) => number
  calcOnchainOutputFee: () => number
  /** The operator's programs as served, for the SDK's `Estimator`. */
  intentFee: () => IntentFeeConfig | undefined
}

export const FeesContext = createContext<FeesContextProps>({
  calcOffchainInputFee: () => 0,
  calcOffchainOutputFee: () => 0,
  calcOnchainOutputFee: () => 0,
  calcOnchainInputFee: () => 0,
  intentFee: () => undefined,
})

export const FeesProvider = ({ children }: { children: ReactNode }) => {
  const { operatorInfo } = useContext(OperatorContext)

  /**
   * Calculates the offchain input fee for a given vtxo.
   * @returns
   */
  const calcOffchainInputFee = (): number => {
    if (!operatorInfo.fees?.intentFee?.offchainInput) return 0
    return parseInt(operatorInfo.fees?.intentFee?.offchainInput ?? '0', 10) // TODO
  }

  /**
   * Calculates the offchain output fee for a given vtxo.
   * @returns
   */
  const calcOffchainOutputFee = (): number => {
    if (!operatorInfo.fees?.intentFee?.offchainOutput) return 0
    return parseInt(operatorInfo.fees.intentFee.offchainOutput, 10)
  }

  /**
   * Calculates the onchain input fee for a given vtxo.
   * @returns
   */
  const calcOnchainInputFee = (): number => {
    if (!operatorInfo.fees?.intentFee?.onchainInput) return 0
    return parseInt(operatorInfo.fees?.intentFee?.onchainInput ?? '0', 10) // TODO
  }

  /**
   * Calculates the onchain output fee for a given vtxo.
   * @returns
   */
  const calcOnchainOutputFee = (): number => {
    if (!operatorInfo.fees?.intentFee?.onchainOutput) return 0
    return parseInt(operatorInfo.fees?.intentFee?.onchainOutput ?? '0', 10) // TODO
  }

  const intentFee = () => operatorInfo.fees?.intentFee

  return (
    <FeesContext.Provider
      value={{
        calcOffchainInputFee,
        calcOffchainOutputFee,
        calcOnchainInputFee,
        calcOnchainOutputFee,
        intentFee,
      }}
    >
      {children}
    </FeesContext.Provider>
  )
}
