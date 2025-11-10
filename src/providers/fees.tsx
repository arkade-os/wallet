import { ReactNode, createContext, useContext } from 'react'
import { Vtxo } from '../lib/types'
import { AspContext } from './asp'

interface FeesContextProps {
  calcOffchainInputFee: (vtxo: Vtxo) => number
  calcOffchainOutputFee: (vtxo: Vtxo) => number
  calcOnchainInputFee: (vtxo: Vtxo) => number
  calcOnchainOutputFee: (vtxo: Vtxo) => number
}

export const FeesContext = createContext<FeesContextProps>({
  calcOffchainInputFee: () => 0,
  calcOffchainOutputFee: () => 0,
  calcOnchainInputFee: () => 0,
  calcOnchainOutputFee: () => 0,
})

export const FeesProvider = ({ children }: { children: ReactNode }) => {
  const { aspInfo } = useContext(AspContext)

  /**
   * Calculates the offchain input fee for a given vtxo.
   * @param vtxo
   * @returns
   */
  const calcOffchainInputFee = (vtxo: Vtxo): number => {
    if (!aspInfo.fees || !aspInfo.fees.intentFee.offchainInput) return 0
    return Number(aspInfo.fees.intentFee.offchainInput) * vtxo.value // TODO
  }

  /**
   * Calculates the offchain output fee for a given vtxo.
   * @param vtxo
   * @returns
   */
  const calcOffchainOutputFee = (vtxo: Vtxo): number => {
    if (!aspInfo.fees?.intentFee?.offchainOutput) return 0
    return Number(aspInfo.fees.intentFee.offchainOutput) * vtxo.value // TODO
  }

  /**
   * Calculates the onchain input fee for a given vtxo.
   * @param vtxo
   * @returns
   */
  const calcOnchainInputFee = (vtxo: Vtxo): number => {
    if (!aspInfo.fees || !aspInfo.fees.intentFee.onchainInput) return 0
    return Number(aspInfo.fees.intentFee.onchainInput) * vtxo.value // TODO
  }

  /**
   * Calculates the onchain output fee for a given vtxo.
   * @param _vtxo
   * @returns
   */
  const calcOnchainOutputFee = (): number => {
    if (!aspInfo.fees?.intentFee?.onchainOutput) return 0
    return Number(aspInfo.fees.intentFee.onchainOutput) // TODO
  }

  return (
    <FeesContext.Provider
      value={{
        calcOffchainInputFee,
        calcOffchainOutputFee,
        calcOnchainInputFee,
        calcOnchainOutputFee,
      }}
    >
      {children}
    </FeesContext.Provider>
  )
}
