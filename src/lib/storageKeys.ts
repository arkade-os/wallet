export const MNEMONIC_STORAGE_KEY = 'encrypted_mnemonic'
export const NSEC_STORAGE_KEY = 'encrypted_private_key'
// legacy: an AES-GCM vault of the mnemonic; superseded by PASSKEY_WALLET_STORAGE_KEY
export const PRF_MNEMONIC_STORAGE_KEY = 'encrypted_mnemonic_prf'
// passkey-derived wallet descriptor { v, credentialId } — holds no secret
export const PASSKEY_WALLET_STORAGE_KEY = 'passkey_wallet'
