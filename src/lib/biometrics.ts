import { hex } from '@scure/base'
import { IndexedDbCredentials } from './db'

function generateRandomArray(length: number): Uint8Array {
  const array = new Uint8Array(length)
  window.crypto.getRandomValues(array)
  return array
}

export function isBiometricsSupported(): boolean {
  return 'credentials' in navigator
}

// Function to register a new user
export async function registerUser(): Promise<{ password: string }> {
  const password = generateRandomArray(21)
  await encryptWithPasskey(password)
  return { password: hex.encode(password) }
}

// Function to authenticate a user
export async function authenticateUser(): Promise<string> {
  const password = await decryptWithPasskey()
  return hex.encode(password)
}

// encrypt the password using biometrics
async function encryptWithPasskey(payload: Uint8Array): Promise<void> {
  const credentialsDB = await IndexedDbCredentials.create()

  // Generate a unique user ID for the WebAuthn credential
  const userId = new TextEncoder().encode(crypto.randomUUID())

  const prfSalt = crypto.getRandomValues(new Uint8Array(32))

  // Configure WebAuthn credential creation options
  const options: PublicKeyCredentialCreationOptions = {
    challenge: crypto.getRandomValues(new Uint8Array(32)), // Random challenge for security
    rp: { name: 'Arkade' }, // Relying party name
    user: {
      id: userId,
      name: 'arkade-user',
      displayName: 'Arkade User',
    },
    pubKeyCredParams: [
      { type: 'public-key', alg: -7 }, // ES256
      { type: 'public-key', alg: -257 }, // RS256
    ],
    authenticatorSelection: { userVerification: 'required' }, // Require biometric verification
    extensions: {
      prf: {
        eval: {
          first: prfSalt,
        },
      },
    },
  }

  // Create the WebAuthn credential using biometrics
  const credential = await navigator.credentials.create({ publicKey: options })
  if (!credential) {
    throw new Error('Failed to create credentials')
  }

  const credentialId = hex.encode(new Uint8Array((credential as PublicKeyCredential).rawId))

  const prfResult = (credential as PublicKeyCredential).getClientExtensionResults().prf
  if (prfResult && prfResult.enabled && prfResult.results) {
    let prfKey: Uint8Array
    if (prfResult.results.first instanceof ArrayBuffer) {
      prfKey = new Uint8Array(prfResult.results.first)
    } else {
      prfKey = new Uint8Array(prfResult.results.first.buffer)
    }

    // Import the PRF key into the Web Crypto API
    const cryptoKey = await crypto.subtle.importKey('raw', prfKey, { name: 'AES-GCM' }, false, ['encrypt'])

    const iv = crypto.getRandomValues(new Uint8Array(12))

    // Encrypt the seed
    const encryptedData = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, cryptoKey, payload)

    // Combine salt, IV, and encrypted data into a single array for storage
    const combinedData = new Uint8Array(prfSalt.length + iv.length + encryptedData.byteLength)
    combinedData.set(prfSalt, 0)
    combinedData.set(iv, prfSalt.length)
    combinedData.set(new Uint8Array(encryptedData), prfSalt.length + iv.length)

    return credentialsDB.set({
      encryptedPassword: hex.encode(combinedData),
      passkeyId: credentialId,
    })
  } else {
    throw new Error('PRF not enabled')
  }
}

// Decrypts the encrypted password stored in indexed DB using biometric authentication
async function decryptWithPasskey(): Promise<Uint8Array> {
  const credentialsDB = await IndexedDbCredentials.create()
  const credentials = await credentialsDB.get()

  // Decode the combined data from hex
  const combinedData = hex.decode(credentials.encryptedPassword)

  // Extract salt (32 bytes), IV (12 bytes), and encrypted data
  const prfSalt = combinedData.slice(0, 32)
  const iv = combinedData.slice(32, 44)
  const encryptedData = combinedData.slice(44)

  // Request biometric authentication
  const challenge = generateRandomArray(32)
  const options: PublicKeyCredentialRequestOptions = {
    allowCredentials: [
      {
        id: hex.decode(credentials.passkeyId),
        type: 'public-key',
      },
    ],
    userVerification: 'required',
    challenge,
    rpId: window.location.hostname,
    timeout: 60000,
    extensions: {
      prf: {
        eval: {
          first: prfSalt,
        },
      },
    },
  }

  // Get the authenticator response
  const credential = (await navigator.credentials.get({ publicKey: options })) as PublicKeyCredential

  const prfResult = credential.getClientExtensionResults().prf
  if (prfResult && prfResult.results) {
    let prfKey: Uint8Array
    if (prfResult.results.first instanceof ArrayBuffer) {
      prfKey = new Uint8Array(prfResult.results.first)
    } else {
      prfKey = new Uint8Array(prfResult.results.first.buffer)
    }

    const cryptoKey = await crypto.subtle.importKey('raw', prfKey, { name: 'AES-GCM' }, false, ['decrypt'])
    const decryptedData = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv,
      },
      cryptoKey,
      encryptedData,
    )
    return new Uint8Array(decryptedData)
  } else {
    throw new Error('PRF not enabled')
  }
}
