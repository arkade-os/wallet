import { describe, expect, it, vi } from 'vitest'
import { ArkAddress } from '@arkade-os/sdk'
import { hex } from '@scure/base'
import {
  checkDelegateeKeys,
  delegationParams,
  enableDelegation,
  isCurrentDelegation,
  watchDelegation,
} from '../../lib/delegatee'
import { getEmulatorPubkeyHexForNetwork } from '../../lib/constants'

const SERVER = '02e35799157be4b37565bb5afe4d04e6a0fa0a4b6a4f4e48b0d904685d253cdbdb'
const OTHER = '0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798'
const aspInfo = { network: 'regtest', signerPubkey: SERVER } as any
const info = {
  version: 'test',
  network: 'regtest',
  delegatePubkey: OTHER,
  serverPubkey: SERVER,
  emulatorPubkey: getEmulatorPubkeyHexForNetwork('regtest')!,
}

const registration = (address: string, templateId: string) => ({
  address,
  templateId,
  variables: { owner: OTHER },
  keys: { delegatePubkey: OTHER, serverPubkey: SERVER, emulatorPubkey: info.emulatorPubkey },
  delegation: { id: 1, address, status: 'active', templateId, variables: {}, slots: [] },
})

// regtest: arkd's 512 s and 1024 s, in BIP 68
const params = { exitDelay: 0x400001, boardingExitDelay: 0x400002, renewalWindow: 256, maxFee: 100 }

describe('checkDelegateeKeys', () => {
  it('accepts the Ark server key in either form and the pinned emulator key', () => {
    expect(() => checkDelegateeKeys(info, aspInfo)).not.toThrow()
    expect(() => checkDelegateeKeys(info, { ...aspInfo, signerPubkey: SERVER.slice(2) })).not.toThrow()
  })

  it('refuses another network, server key or emulator key', () => {
    expect(() => checkDelegateeKeys({ ...info, network: 'bitcoin' }, aspInfo)).toThrow('not regtest')
    expect(() => checkDelegateeKeys({ ...info, serverPubkey: OTHER }, aspInfo)).toThrow('server key')
    expect(() => checkDelegateeKeys({ ...info, emulatorPubkey: OTHER }, aspInfo)).toThrow('emulator key')
  })
})

describe('delegationParams', () => {
  it('takes the exit delays from the Ark server and the rest from the network', () => {
    expect(delegationParams({ network: 'regtest', unilateralExitDelay: 512n, boardingExitDelay: 1024n })).toEqual(
      params,
    )
    expect(delegationParams({ network: 'bitcoin', unilateralExitDelay: 605184n, boardingExitDelay: 7776256n })).toEqual(
      {
        exitDelay: 0x400000 | (605184 / 512),
        boardingExitDelay: 0x400000 | (7776256 / 512),
        renewalWindow: 302336,
        maxFee: 300,
      },
    )
    expect(delegationParams({ network: 'regtest', unilateralExitDelay: 144n, boardingExitDelay: 288n })).toMatchObject({
      exitDelay: 144,
      boardingExitDelay: 288,
    })
  })
})

describe('enableDelegation', () => {
  const regtest = { ...aspInfo, unilateralExitDelay: 512n, boardingExitDelay: 1024n }

  it('registers the boarding and renewal watches and moves the VTXOs to the renewal address', async () => {
    const manager = {
      getInfo: vi.fn().mockResolvedValue(info),
      defaultTemplates: vi.fn().mockResolvedValue({ boarding: 'b0', renewal: 'r0' }),
      registerBoarding: vi.fn().mockResolvedValue(registration('bcrt1pboarding', 'b0')),
      delegateVtxos: vi.fn().mockResolvedValue({ ...registration('tark1renewal', 'r0'), txid: 'tx' }),
    }
    const wallet = { getDelegateeManager: async () => manager } as any
    await expect(enableDelegation(wallet, regtest)).resolves.toEqual({
      keys: registration('', '').keys,
      params,
      boarding: { address: 'bcrt1pboarding', templateId: 'b0', variables: { owner: OTHER } },
      renewal: { address: 'tark1renewal', templateId: 'r0', variables: { owner: OTHER } },
    })
    expect(manager.registerBoarding).toHaveBeenCalledWith(params)
    expect(manager.delegateVtxos).toHaveBeenCalledWith(params)
  })

  it('registers nothing for a service of another Ark server', async () => {
    const manager = {
      getInfo: vi.fn().mockResolvedValue({ ...info, serverPubkey: OTHER }),
      defaultTemplates: vi.fn(),
      registerBoarding: vi.fn(),
      delegateVtxos: vi.fn(),
    }
    const wallet = { getDelegateeManager: async () => manager } as any
    await expect(enableDelegation(wallet, regtest)).rejects.toThrow('server key')
    expect(manager.defaultTemplates).not.toHaveBeenCalled()
    expect(manager.delegateVtxos).not.toHaveBeenCalled()
  })

  it('needs a configured delegatee', async () => {
    const wallet = { getDelegateeManager: async () => undefined } as any
    await expect(enableDelegation(wallet, regtest)).rejects.toThrow('not configured')
  })
})

describe('watchDelegation', () => {
  it('registers the delegated contracts from config alone', async () => {
    const createContract = vi.fn(async (c: object) => c)
    const wallet = {
      identity: { compressedPublicKey: async () => hex.decode(OTHER) },
      getAddress: async () =>
        new ArkAddress(hex.decode(SERVER).subarray(1), new Uint8Array(32).fill(1), 'tark').encode(),
      getContractManager: async () => ({ createContract }),
    } as any
    const keys = { delegatePubkey: OTHER, serverPubkey: SERVER, emulatorPubkey: info.emulatorPubkey }
    await watchDelegation(wallet, { keys, params, renewal: {} as any, boarding: {} as any })
    expect(createContract.mock.calls.map(([c]: any) => c.params.template)).toEqual(['renewal', 'boarding'])
    expect(isCurrentDelegation({ boarding: {}, watch: {} })).toBe(false)
  })
})
