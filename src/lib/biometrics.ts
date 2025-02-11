function generateRandomUint8Array(size: number = 32): Uint8Array {
  const array = new Uint8Array(size)
  window.crypto.getRandomValues(array)
  return array
}

export function isBiometricsSupported(): boolean {
  return 'credentials' in navigator
}

// Function to register a new user
export async function registerUser(): Promise<string> {
  const username = 'Arkade'
  const publicKeyCredentialCreationOptions: PublicKeyCredentialCreationOptions = {
    authenticatorSelection: {
      authenticatorAttachment: 'platform',
      residentKey: 'required',
      requireResidentKey: true,
    },
    challenge: generateRandomUint8Array(32),
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
      id: new Uint8Array(16),
      name: username,
      displayName: username,
    },
  }

  const credential = await navigator.credentials.create({ publicKey: publicKeyCredentialCreationOptions })
  const pubKeyCred = credential as PublicKeyCredential
  return Buffer.from(pubKeyCred.rawId).toString('hex').slice(0, 21)
}

// Function to authenticate a user
export async function authenticateUser(): Promise<string> {
  const publicKeyCredentialRequestOptions: PublicKeyCredentialRequestOptions = {
    challenge: generateRandomUint8Array(32),
    timeout: 60000,
  }

  const credential = await navigator.credentials.get({ publicKey: publicKeyCredentialRequestOptions })
  const pubKeyCred = credential as PublicKeyCredential
  return Buffer.from(pubKeyCred.rawId).toString('hex').slice(0, 21)
}
