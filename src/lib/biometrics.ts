import { hex } from '@scure/base'

function generateRandomArray(length: number): Uint8Array {
  const array = new Uint8Array(length)
  window.crypto.getRandomValues(array)
  return array
}

// used to validate the challenge.
// webauth api does some transformations to the base64 string
// so we need to do the same transformations to validate the challenge
function arrayToBase64(data: Uint8Array | ArrayBuffer): string {
  const array = data instanceof ArrayBuffer ? new Uint8Array(data) : data
  return btoa(String.fromCharCode(...array))
    .replaceAll('=', '')
    .replaceAll('+', '-')
    .replaceAll('/', '_')
}

export function isBiometricsSupported(): boolean {
  return 'credentials' in navigator
}

// Function to register a new user
export async function registerUser(): Promise<{ password: string; passkeyId: string }> {
  const decoder = new TextDecoder()
  const challenge = generateRandomArray(32)
  const password = generateRandomArray(21)

  const options: PublicKeyCredentialCreationOptions = {
    authenticatorSelection: {
      authenticatorAttachment: 'platform',
      residentKey: 'required',
      requireResidentKey: true,
    },
    challenge: challenge as BufferSource,
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
      id: password as BufferSource,
      name: 'Arkade wallet',
      displayName: 'Arkade wallet',
    },
  }

  const credentials = (await navigator.credentials.create({ publicKey: options })) as PublicKeyCredential
  const authResponse = credentials.response as AuthenticatorAttestationResponse
  const clientDataJSON = JSON.parse(decoder.decode(authResponse.clientDataJSON))

  if (clientDataJSON.type !== 'webauthn.create') throw new Error('Invalid clientDataJSON type')
  if (clientDataJSON.challenge !== arrayToBase64(challenge)) throw new Error('Invalid challenge')
  if (clientDataJSON.origin !== window.location.origin) throw new Error('Invalid origin')

  return { password: hex.encode(password), passkeyId: hex.encode(new Uint8Array(credentials.rawId)) }
}

// Function to authenticate a user
export async function authenticateUser(passkeyId: string | undefined): Promise<string> {
  if (!passkeyId) throw new Error('Missing passkey id')
  const decoder = new TextDecoder()
  const challenge = generateRandomArray(32)

  const options: PublicKeyCredentialRequestOptions = {
    allowCredentials: [
      {
        id: hex.decode(passkeyId) as BufferSource,
        type: 'public-key',
      },
    ],
    challenge: challenge as BufferSource,
    rpId: window.location.hostname,
    timeout: 60000,
  }

  const credentials = (await navigator.credentials.get({ publicKey: options })) as PublicKeyCredential
  const authResponse = credentials.response as AuthenticatorAssertionResponse
  const clientDataJSON = JSON.parse(decoder.decode(authResponse.clientDataJSON))
  const userHandle = new Uint8Array(authResponse.userHandle ?? new ArrayBuffer(0))

  if (clientDataJSON.type !== 'webauthn.get') throw new Error('Invalid clientDataJSON type')
  if (clientDataJSON.challenge !== arrayToBase64(challenge)) throw new Error('Invalid challenge')
  if (clientDataJSON.origin !== window.location.origin) throw new Error('Invalid origin')

  return hex.encode(userHandle)
}
