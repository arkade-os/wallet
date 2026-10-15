import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import ClaimSheet from '../../../screens/Wallet/Receive/ClaimSheet'
import { AspContext } from '../../../providers/asp'
import { ConfigContext } from '../../../providers/config'
import { WalletContext } from '../../../providers/wallet'
import { deliveredAssetId, type ClaimPlan, type ReceiverClaim } from '../../../lib/receiverClaims'
import { truncatedAssetId } from '../../../lib/assets'
import { mockAspContextValue, mockConfigContextValue, mockWalletContextValue } from '../mocks'

const claim: ReceiverClaim = {
  transferId: 'delivery',
  receiverAddress: 'receiver',
  state: 'locked',
  claimable: true,
  updatedAt: 0,
  claim: {
    params: {
      receiverKey: '11'.repeat(32),
      senderKey: '22'.repeat(32),
      operatorKey: '33'.repeat(32),
      operatorSignerKey: '44'.repeat(32),
      dust: '330',
      topup: '330',
      assetId: { txid: 'ab'.repeat(32), groupIndex: 0 },
      locktime: '100',
      exitDelay: { type: 'blocks', value: '10' },
      recoveryRecipient: 'receiver',
      claimMode: 'recycle',
      receiverFare: { currency: 'asset', units: '1000' },
    },
    covenantAddress: 'covenant',
    outpoint: { txid: '55'.repeat(32), vout: 0 },
    assetUnits: '10000',
    fare: { currency: 'asset', units: '1000' },
    batchExpiry: { kind: 'height', value: '200' },
    recoveryLocktime: { kind: 'height', value: '100' },
    unclaimedMode: 'reclaim',
  },
}
const plan = {
  kind: 'recycle',
  coin: { value: 1000 },
  mergedSats: 1000n,
  feeUnits: 1000n,
  deliveredUnits: 9000n,
} as ClaimPlan
const assetId = deliveredAssetId(claim)!

describe('Taxi claim asset amounts', () => {
  it.each(
    [
      {
        verified: false,
        metadataTicker: 'USD',
        decimals: 4,
        ticker: truncatedAssetId(assetId),
        delivery: '1',
        fare: '0.1',
        retained: '0.9',
      },
      {
        verified: true,
        metadataTicker: 'USD',
        decimals: 4,
        ticker: 'USD',
        delivery: '1.00',
        fare: '0.10',
        retained: '0.90',
      },
      {
        verified: false,
        metadataTicker: 'USD',
        decimals: undefined,
        ticker: 'atomic units',
        delivery: '10K',
        fare: '1,000',
        retained: '9,000',
      },
      {
        verified: true,
        metadataTicker: 'USD',
        decimals: 19,
        ticker: 'atomic units',
        delivery: '10K',
        fare: '1,000',
        retained: '9,000',
      },
      {
        verified: false,
        metadataTicker: undefined,
        decimals: 4,
        ticker: truncatedAssetId(assetId),
        delivery: '1',
        fare: '0.1',
        retained: '0.9',
      },
      {
        verified: true,
        metadataTicker: '',
        decimals: 4,
        ticker: truncatedAssetId(assetId),
        delivery: '1',
        fare: '0.1',
        retained: '0.9',
      },
      {
        verified: false,
        metadataTicker: '   ',
        decimals: 4,
        ticker: truncatedAssetId(assetId),
        delivery: '1',
        fare: '0.1',
        retained: '0.9',
      },
    ].flatMap((testCase) => [true, false].map((showBalance) => ({ ...testCase, showBalance }))),
  )(
    'uses $ticker with verified=$verified, decimals=$decimals and showBalance=$showBalance',
    ({ verified, metadataTicker, decimals, ticker, delivery, fare, retained, showBalance }) => {
      render(
        <AspContext.Provider value={mockAspContextValue}>
          <ConfigContext.Provider
            value={{ ...mockConfigContextValue, config: { ...mockConfigContextValue.config, showBalance } }}
          >
            <WalletContext.Provider
              value={{
                ...mockWalletContextValue,
                isVerifiedAsset: () => verified,
                assetMetadataCache: new Map([
                  [assetId, { assetId, cachedAt: 0, supply: 10000n, metadata: { ticker: metadataTicker, decimals } }],
                ]),
              }}
            >
              <ClaimSheet claim={claim} plan={plan} />
            </WalletContext.Provider>
          </ConfigContext.Provider>
        </AspContext.Provider>,
      )
      expect(
        screen.getByText(showBalance ? `${delivery} ${ticker}` : `\u2022\u2022\u2022\u2022 ${ticker}`),
      ).toBeInTheDocument()
      expect(screen.getByTestId('claim-fare')).toHaveTextContent(`Fare: ${fare} ${ticker}, paid out of the delivery.`)
      expect(screen.getByTestId('claim-plan')).toHaveTextContent(`You receive ${retained} ${ticker}.`)
      if (!verified) expect(screen.getByText('Unverified')).toBeInTheDocument()
    },
  )
})
