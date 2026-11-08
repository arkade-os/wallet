# Additional native signers

The wallet uses the SDK's existing `Identity` interface. A second device should
implement that interface at the native connection boundary and supply its own
pairing/unlock/approval UI. Satochip PIN, seed import and recovery-code setup are
specific to Satochip. They must not become requirements for every signer.

## Compatibility requirements

Check complete signing behavior before exposing a device in onboarding:

- Exact existing tapscript bytes, key order, fixed NUMS internal key and tree
  commitments: default CHECKSIGVERIFY chains, delegate three-party leaves,
  CHECKSIGADD, CSV/CLTV DROP and VHTLC conditions.
- Version-3 transactions, selected inputs, existing cosigner signatures and
  unknown Ark PSBT fields. Decode through the SDK's `Transaction` wrapper.
- Synthetic zero-value ownership proofs with ALL sighash and BIP322 proofs.
- Raw 32-byte BIP340 swap digests, without Bitcoin-message hashing.
- The same identity's BIP86 onchain key-path address, including its key tweak.
- Local verification of signatures and public-key binding; cancel, denial,
  removal and stale-result handling. Reconnection cannot authorize a payment.

Settlement `TreeSignerSession` uses an independent ephemeral session key; it does
not require the hardware device to implement MuSig2. Capability checks must happen
before creating an obligation or exposing an address the signer cannot spend.

The Satochip conformance tests exercise exact published-SDK contract leaves,
ownership/BIP322 proofs and BIP86 tweaking with a software card fixture. Passing
those fixtures is a prerequisite, not physical-device evidence.

## Vendor source assessment, 2026-11-07

| Device | Current blocker for the complete wallet |
| --- | --- |
| Ledger | Registered Miniscript policies require extended-key/wildcard expressions and reconstruct the full tree. Existing fixed raw keys, NUMS/tree commitments and CSV DROP leaves are not admitted unchanged. No raw32 Schnorr endpoint was established. |
| Trezor | The current Bitcoin hasher implements key-path Taproot only, without a tapscript extension. |
| BitBox02 | Inspected firmware rejects zero-value inputs and uses DEFAULT Taproot sighash; ownership proofs require ALL. |
| OneKey Pro | Released Nostr raw32 Schnorr signing is promising for script paths and swap digests. It has no tweak parameter, and its Nostr key paths cannot also sign the same mainnet BIP86 account through the Bitcoin endpoint. |

These are source assessments, not claims about tested physical devices:
[Ledger policy contract](https://github.com/LedgerHQ/app-bitcoin/blob/f8f790a325ba772dcce8eb8f9441ebf5289020d0/doc/wallet.md),
[Trezor hasher](https://github.com/trezor/trezor-firmware/blob/9d4f7db2b06fc91e2b5d64d6d6426fb0cd44a3d7/core/src/apps/bitcoin/sign_tx/sig_hasher.py#L168-L169),
[BitBox input checks](https://github.com/BitBoxSwiss/bitbox02-firmware/blob/firmware/v9.27.1/src/rust/bitbox02-rust/src/hww/api/bitcoin/signtx.rs#L265-L272),
[OneKey raw signing](https://github.com/OneKeyHQ/firmware-pro/blob/251a1b762065357059f80f32b28cb502609510d3/core/src/apps/nostr/schnorr.py#L16-L41)
and [key-path enforcement](https://github.com/OneKeyHQ/firmware-pro/blob/251a1b762065357059f80f32b28cb502609510d3/core/src/apps/common/keychain.py#L104-L117).

HWI/BHWI can provide transport and PSBT protocols after a device passes the signing
requirements. They cannot supply firmware features or convert legacy ECDSA message
signing into raw BIP340. BHWI's [message contract](https://github.com/wizardsardine/bhwi/blob/401105e98055b9a4ba4cbb86fb768d87a8a068a7/bhwi-async/src/lib.rs#L199-L204)
and [explicit Ledger policy workflow](https://github.com/wizardsardine/bhwi/blob/401105e98055b9a4ba4cbb86fb768d87a8a068a7/docs/HWI_PARITY.md#L159-L180)
still have those constraints. No dormant vendor dependency or unsupported device
selection is included.
