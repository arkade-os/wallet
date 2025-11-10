import { ReactNode, createContext, useContext } from 'react'
import { Vtxo } from '../lib/types'
import { AspContext } from './asp'

interface FeesContextProps {
  calcOffchainInputFee: (vtxo: Vtxo) => number
  calcOffchainOutputFee: (vtxo: Vtxo) => number
  calcOnchainInputFee: (vtxo: Vtxo) => number
  calcOnchainOutputFee: () => number
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
   * @returns
   */
  const calcOffchainInputFee = (): number => {
    return Number(aspInfo.fees?.intentFee?.offchainInput ?? 0) // TODO
  }

  /**
   * Calculates the offchain output fee for a given vtxo.
   * @returns
   */
  const calcOffchainOutputFee = (): number => {
    return Number(aspInfo.fees?.intentFee?.offchainOutput ?? 0) // TODO
  }

  /**
   * Calculates the onchain input fee for a given vtxo.
   * @returns
   */
  const calcOnchainInputFee = (): number => {
    return Number(aspInfo.fees?.intentFee?.onchainInput ?? 0) // TODO
  }

  /**
   * Calculates the onchain output fee for a given vtxo.
   * @returns
   */
  const calcOnchainOutputFee = (): number => {
    return Number(aspInfo.fees?.intentFee?.onchainOutput ?? 21) // TODO
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
