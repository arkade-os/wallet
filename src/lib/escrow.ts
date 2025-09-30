import { ArkInfo, ServiceWorkerWallet } from '@arkade-os/sdk'
import { bytesToHex, hexToBytes } from '@noble/hashes/utils'
import { getPrivateKey } from './privateKey'
import { schnorr } from '@noble/curves/secp256k1'

const fetcher = <T>(p: Promise<Response>): Promise<T> =>
  p.then(r => r.ok ? r.json() as T : Promise.reject(r))


export class EscrowClient {

  private accessToken: string | null = null

  constructor(private readonly baseUrl: string,
              private readonly aspInfo: ArkInfo,
              private readonly svcWallet:ServiceWorkerWallet) {
  }

  async signin(priv:  Uint8Array<ArrayBufferLike>) {
    const publicKey = this.svcWallet.xOnlyPublicKey()

    const challengeRes = await fetcher<{hashToSignHex: string,challengeId:string}>(fetch(`${this.baseUrl}/api/v1/auth/signup/challenge`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'http://localhost:test',
      },
      body: JSON.stringify({        publicKey      })
    }))

    if (!challengeRes.hashToSignHex || !challengeRes.challengeId) {
      throw new Error('Invalid challenge response')
    }

    const signatureHex = schnorr.sign(
      hexToBytes(challengeRes.hashToSignHex),
      priv,
    );

    const {accessToken} = await fetcher<{accessToken: string}>(fetch(
      `${this.baseUrl}/api/v1/auth/signup/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'http://localhost:test',
      },
      body: JSON.stringify({
        publicKey,
        signature: bytesToHex(signatureHex),
        challengeId: challengeRes.challengeId,
      })
    }))

    if (!accessToken) {
      throw new Error('Invalid verify response')
    }

    console.log(`signed in!!! ${accessToken}` )
    this.accessToken = accessToken
  }

  async signout() {
    // TODO: proper signout on server side
    this.accessToken = null
  }

  isSignedIn(): boolean {
    return this.accessToken !== null
  }
}