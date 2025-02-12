import { toUint8Array } from './format'

function generateRandomChallenge(): Uint8Array {
  const array = new Uint8Array(32)
  window.crypto.getRandomValues(array)
  return array
}

function getBrowserId(): string {
  const userAgent = window.navigator.userAgent
  const match = userAgent.match(/\(([^)]+)/)
  if (match?.[1]) return match[1]
  return 'unknown'
}

export function isBiometricsSupported(): boolean {
  return 'credentials' in navigator
}

// Function to register a new user
export async function registerUser(): Promise<string> {
  const publicKeyCredentialCreationOptions: PublicKeyCredentialCreationOptions = {
    authenticatorSelection: {
      authenticatorAttachment: 'platform',
      residentKey: 'required',
      requireResidentKey: true,
    },
    challenge: generateRandomChallenge(),
    pubKeyCredParams: [
      {
        type: 'public-key',
        alg: -7, // ES256 (-7 is the COSE identifier for ES256)
      },
      {
        type: 'public-key',
        alg: -257, // RS256 (-257 is the COSE identifier for RS256)
      },
    ],
    rp: {
      name: 'Arkade',
      id: window.location.hostname,
    },
    timeout: 60000,
    user: {
      id: toUint8Array(getBrowserId()),
      name: getBrowserId(),
      displayName: 'Arkade',
    },
  }

  const credential = await navigator.credentials.create({ publicKey: publicKeyCredentialCreationOptions })
  const pubKeyCred = credential as PublicKeyCredential
  return Buffer.from(pubKeyCred.rawId).toString('hex').slice(0, 21)
}

// Function to authenticate a user
export async function authenticateUser(): Promise<string> {
  const publicKeyCredentialRequestOptions: PublicKeyCredentialRequestOptions = {
    challenge: generateRandomChallenge(),
    timeout: 60000,
  }

  const credential = await navigator.credentials.get({ publicKey: publicKeyCredentialRequestOptions })
  const pubKeyCred = credential as PublicKeyCredential
  return Buffer.from(pubKeyCred.rawId).toString('hex').slice(0, 21)
}
