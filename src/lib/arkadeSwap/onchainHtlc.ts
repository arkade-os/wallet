/**
 * The Bitcoin-L1 side of the onchain corridor: a taproot HTLC as pure local
 * derivation, spend builders, and the injected chain-access seam.
 *
 * One HTLC shape serves both directions — only the key roles swap:
 *
 * | direction                             | claimKey            | refundKey          |
 * |---------------------------------------|---------------------|--------------------|
 * | arkade->onchain (solver funds L1)     | maker's payout key  | solver's htlc key  |
 * | onchain->arkade (maker funds L1)      | solver's htlc key   | maker's refund key |
 *
 * The hash-lock commitment is HASH160-style — `ripemd160(sha256(P))` — the
 * same construction the lightning-send program uses, so ONE preimage unlocks
 * both the Arkade leaf and the L1 leaf of a swap.
 *
 * Design rules carried over from the rest of the package:
 * - contracts are locally derived, byte-pinned by golden tests; anything
 *   address-shaped from a solver is compare-only;
 * - the package holds no keys and no backend: signing is a callback over the
 *   BIP-341 sighash, chain access is the injected {@link ChainSource}.
 */
import { hex } from "@scure/base";
import { sha256 } from "@noble/hashes/sha2.js";
import { ripemd160 } from "@noble/hashes/legacy.js";
import * as btc from "@scure/btc-signer";

// ── Guardrail constants (rfq.ts re-exports these; defined here to keep the
//    claim path free of an rfq.ts import cycle) ───────────────────────────────

/** L1 confirmation-depth and reorg margin between dependent timelocks. */
export const ONCHAIN_ORDER_MARGIN_SECONDS = 2 * 60 * 60;
/** Don't broadcast a claim with less than this before the refund leaf opens:
 * MTP lag plus confirmation time. Past this point the safe move is to let the
 * swap die and take the covenant refund — claiming into the counterparty's
 * live refund window risks losing the race AND publishing P. */
export const ONCHAIN_CLAIM_MARGIN_SECONDS = 90 * 60;
/** Bounds on the confirmation depth a quote may demand. */
export const MAX_MIN_CONFIRMATIONS = 6;
/** Conservative block interval for converting depths into wall-clock time. */
export const ONCHAIN_SECONDS_PER_BLOCK = 600;
/** Outputs below this are unspendable in practice; builders refuse them. */
export const ONCHAIN_DUST_SATS = 546n;

// ── Preimage utilities ───────────────────────────────────────────────────────

/** 32 random bytes. The maker generates P for BOTH onchain directions. */
export const newPreimage = (): Uint8Array => crypto.getRandomValues(new Uint8Array(32));

/** `sha256(P)`, hex — the wire `payment_hash`, same convention as BOLT11. */
export const paymentHashOf = (preimage: Uint8Array): string => hex.encode(sha256(preimage));

/** The script-level commitment: `ripemd160(sha256(P))`, from the wire hash. */
const h160FromPaymentHash = (paymentHash: string): Uint8Array => ripemd160(hex.decode(paymentHash));

// ── The taproot HTLC ─────────────────────────────────────────────────────────

export type OnchainNetwork = "bitcoin" | "testnet" | "regtest";

const L1_NETWORKS: Record<OnchainNetwork, typeof btc.NETWORK> = {
    bitcoin: btc.NETWORK,
    testnet: btc.TEST_NETWORK,
    regtest: { ...btc.TEST_NETWORK, bech32: "bcrt" },
};

export interface OnchainHtlcParams {
    /** `sha256(P)`, hex; the HASH160 commitment is derived internally. */
    paymentHash: string;
    /** x-only key that claims with the preimage. */
    claimKey: Uint8Array;
    /** x-only key that refunds after the locktime. */
    refundKey: Uint8Array;
    /** Absolute unix seconds (consensus matures it against median-time-past). */
    refundLocktime: number;
}

export interface OnchainHtlc {
    address: string;
    /** `0x5120…` — the P2TR output script. */
    pkScript: Uint8Array;
    leaves: { claim: Uint8Array; refund: Uint8Array };
    /** Serialized control blocks per leaf, ready for a script-path witness. */
    controlBlocks: { claim: Uint8Array; refund: Uint8Array };
    paymentHash: string;
    refundLocktime: number;
}

/**
 * Derive the two-leaf taproot HTLC. Internal key is the BIP-341 NUMS point, so
 * there is no key-path spend, ever:
 *
 *   claim:  `OP_HASH160 <h160> OP_EQUALVERIFY <claimKey> OP_CHECKSIG`
 *   refund: `<locktime> OP_CHECKLOCKTIMEVERIFY OP_DROP <refundKey> OP_CHECKSIG`
 *
 * Pure derivation — pinned byte-for-byte by the golden test; any drift here
 * changes addresses on BOTH sides of a swap.
 */
export function onchainHtlcScript(params: OnchainHtlcParams, network: OnchainNetwork): OnchainHtlc {
    if (params.claimKey.length !== 32 || params.refundKey.length !== 32) {
        throw new Error("claimKey and refundKey must be 32-byte x-only keys");
    }
    if (!Number.isInteger(params.refundLocktime) || params.refundLocktime <= 0) {
        throw new Error(
            `refundLocktime must be a positive unix timestamp, got ${params.refundLocktime}`,
        );
    }
    const h160 = h160FromPaymentHash(params.paymentHash);
    const claim = btc.Script.encode(["HASH160", h160, "EQUALVERIFY", params.claimKey, "CHECKSIG"]);
    const refund = btc.Script.encode([
        btc.ScriptNum().encode(BigInt(params.refundLocktime)),
        "CHECKLOCKTIMEVERIFY",
        "DROP",
        params.refundKey,
        "CHECKSIG",
    ]);
    const payment = btc.p2tr(
        btc.TAPROOT_UNSPENDABLE_KEY,
        btc.taprootListToTree([{ script: claim }, { script: refund }]),
        L1_NETWORKS[network],
        true,
    );

    const controlBlockFor = (leaf: Uint8Array): Uint8Array => {
        for (const [block, script] of payment.tapLeafScript ?? []) {
            if (
                script.length - 1 === leaf.length &&
                hex.encode(script.subarray(0, leaf.length)) === hex.encode(leaf)
            ) {
                return btc.TaprootControlBlock.encode(block);
            }
        }
        throw new Error("leaf missing from compiled taproot tree"); // unreachable: we just built it
    };

    return {
        address: payment.address!,
        pkScript: payment.script,
        leaves: { claim, refund },
        controlBlocks: { claim: controlBlockFor(claim), refund: controlBlockFor(refund) },
        paymentHash: params.paymentHash,
        refundLocktime: params.refundLocktime,
    };
}

// ── Transaction builders ─────────────────────────────────────────────────────

export interface HtlcUtxo {
    txid: string;
    vout: number;
    amount: bigint;
}

interface SpendResult {
    txHex: string;
    txid: string;
    /** `utxo.amount − fee` — what actually lands at the payout script. */
    payoutAmount: bigint;
}

/** Assemble a one-in-one-out script-path spend; witness decides which leaf. */
const buildLeafSpend = async (input: {
    htlc: OnchainHtlc;
    utxo: HtlcUtxo;
    leaf: Uint8Array;
    controlBlock: Uint8Array;
    /** Witness items ABOVE the signature (e.g. the preimage), bottom-up. */
    stackAboveSig: Uint8Array[];
    payoutPkScript: Uint8Array;
    feeRateSatVb: number;
    sign: (sighash: Uint8Array) => Promise<Uint8Array>;
    lockTime?: number;
    sequence: number;
}): Promise<SpendResult> => {
    if (!Number.isFinite(input.feeRateSatVb) || input.feeRateSatVb <= 0) {
        throw new Error(`feeRateSatVb must be positive, got ${input.feeRateSatVb}`);
    }
    const assemble = (payout: bigint): btc.Transaction => {
        const tx = new btc.Transaction({ lockTime: input.lockTime ?? 0 });
        tx.addInput({
            txid: input.utxo.txid,
            index: input.utxo.vout,
            witnessUtxo: { script: input.htlc.pkScript, amount: input.utxo.amount },
            sequence: input.sequence,
        });
        tx.addOutput({ script: input.payoutPkScript, amount: payout });
        return tx;
    };
    const witness = (sig: Uint8Array): Uint8Array[] => [
        sig,
        ...input.stackAboveSig,
        input.leaf,
        input.controlBlock,
    ];

    // Sizing pass: a DEFAULT-sighash schnorr signature is always 64 bytes and
    // amounts are fixed-width, so a dummy-signed build measures the exact vsize.
    const sizing = assemble(input.utxo.amount);
    sizing.updateInput(0, { finalScriptWitness: witness(new Uint8Array(64)) }, true);
    const fee = BigInt(Math.ceil(sizing.vsize * input.feeRateSatVb));
    const payout = input.utxo.amount - fee;
    if (payout < ONCHAIN_DUST_SATS) {
        throw new Error(
            `fee ${fee} leaves ${payout} sats from a ${input.utxo.amount} sat HTLC — below the ${ONCHAIN_DUST_SATS} sat dust limit`,
        );
    }

    const tx = assemble(payout);
    const sighash = tx.preimageWitnessV1(
        0,
        [input.htlc.pkScript],
        btc.SigHash.DEFAULT,
        [input.utxo.amount],
        undefined,
        input.leaf,
        0xc0,
    );
    const sig = await input.sign(sighash);
    if (sig.length !== 64)
        throw new Error(`sign() must return a 64-byte BIP340 signature, got ${sig.length}`);
    tx.updateInput(0, { finalScriptWitness: witness(sig) }, true);
    return { txHex: tx.hex, txid: tx.id, payoutAmount: payout };
};

/** Script-path spend of the claim leaf; the witness reveals P — that is how
 * the counterparty learns it, so never build this unless the claim will win
 * (see {@link claimOnchainFill}). `sign` is BIP340 over the claim key. */
export const buildHtlcClaim = async (input: {
    htlc: OnchainHtlc;
    utxo: HtlcUtxo;
    preimage: Uint8Array;
    payoutPkScript: Uint8Array;
    feeRateSatVb: number;
    sign: (sighash: Uint8Array) => Promise<Uint8Array>;
}): Promise<SpendResult> => {
    if (paymentHashOf(input.preimage) !== input.htlc.paymentHash) {
        throw new Error("preimage does not hash to the HTLC's payment hash");
    }
    return buildLeafSpend({
        htlc: input.htlc,
        utxo: input.utxo,
        leaf: input.htlc.leaves.claim,
        controlBlock: input.htlc.controlBlocks.claim,
        stackAboveSig: [input.preimage],
        payoutPkScript: input.payoutPkScript,
        feeRateSatVb: input.feeRateSatVb,
        sign: input.sign,
        sequence: 0xfffffffd,
    });
};

/** Script-path spend of the refund leaf; consensus-valid only once nLockTime
 * has matured against median-time-past — gate on {@link ChainSource.getMtp},
 * not wall clock. `sign` is BIP340 over the refund key. */
export const buildHtlcRefund = (input: {
    htlc: OnchainHtlc;
    utxo: HtlcUtxo;
    payoutPkScript: Uint8Array;
    feeRateSatVb: number;
    sign: (sighash: Uint8Array) => Promise<Uint8Array>;
}): Promise<SpendResult> =>
    buildLeafSpend({
        htlc: input.htlc,
        utxo: input.utxo,
        leaf: input.htlc.leaves.refund,
        controlBlock: input.htlc.controlBlocks.refund,
        stackAboveSig: [],
        payoutPkScript: input.payoutPkScript,
        feeRateSatVb: input.feeRateSatVb,
        sign: input.sign,
        lockTime: input.htlc.refundLocktime,
        // any value below 0xffffffff enables nLockTime enforcement
        sequence: 0xfffffffe,
    });

// ── ChainSource: the injected L1 backend ─────────────────────────────────────

export interface ChainUtxo extends HtlcUtxo {
    confirmations: number;
}

/** The package's whole view of Bitcoin L1. An esplora-backed implementation
 * belongs to the caller (a reference one lives in the test suite); the package
 * itself stays backend-free. */
export interface ChainSource {
    /** Confirmed+mempool outputs paying a script; used to detect the fill. */
    getScriptUtxos(pkScript: Uint8Array): Promise<ChainUtxo[]>;
    /** The spend of an outpoint, if any — where P is extracted from. */
    getSpendingTx(txid: string, vout: number): Promise<{ txHex: string } | null>;
    broadcast(txHex: string): Promise<string>;
    /** Current median-time-past, unix seconds — gates refund broadcasting. */
    getMtp(): Promise<number>;
}

/** Read P out of a claim spend's witness: the 32-byte item whose sha256 is the
 * payment hash. Null when the tx reveals no matching preimage (e.g. a refund
 * spend, or an unrelated tx). */
export function extractPreimage(txHex: string, paymentHash: string): Uint8Array | null {
    let raw;
    try {
        raw = btc.RawTx.decode(hex.decode(txHex));
    } catch {
        return null;
    }
    for (const stack of raw.witnesses ?? []) {
        for (const item of stack) {
            if (item.length === 32 && hex.encode(sha256(item)) === paymentHash) return item;
        }
    }
    return null;
}

// ── Fill watching, claiming, and crash-recovery classification ──────────────

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/** Poll {@link ChainSource} until the HTLC is funded to the required depth.
 * Picks the largest qualifying output when several exist. Throws (reason
 * `fill_timeout`) once `deadline` (unix seconds) passes without one. */
export async function awaitOnchainFill(
    chain: ChainSource,
    htlc: OnchainHtlc,
    minConfirmations: number,
    options: { pollMs?: number; deadline?: number } = {},
): Promise<ChainUtxo> {
    const pollMs = options.pollMs ?? 5_000;
    for (;;) {
        const utxos = await chain.getScriptUtxos(htlc.pkScript);
        const eligible = utxos
            .filter((u) => u.confirmations >= minConfirmations)
            .sort((a, b) => (b.amount > a.amount ? 1 : -1));
        if (eligible[0]) return eligible[0];
        if (options.deadline !== undefined && Date.now() / 1000 >= options.deadline) {
            const error = new Error("HTLC was not filled before the deadline") as Error & {
                reason: string;
            };
            error.reason = "fill_timeout";
            throw error;
        }
        await sleep(pollMs);
    }
}

/**
 * Claim the fill: build the claim spend and broadcast it. Broadcasting
 * publishes P (mempool) — by design, it is how the solver gets paid — so this
 * refuses (reason `claim_window_closed`) when less than
 * {@link ONCHAIN_CLAIM_MARGIN_SECONDS} remains before the refund leaf opens:
 * past that point, let the swap die and take the covenant refund instead of
 * racing the counterparty's refund with P exposed.
 */
export async function claimOnchainFill(
    chain: ChainSource,
    input: {
        htlc: OnchainHtlc;
        utxo: HtlcUtxo;
        preimage: Uint8Array;
        payoutPkScript: Uint8Array;
        feeRateSatVb: number;
        sign: (sighash: Uint8Array) => Promise<Uint8Array>;
        /** Injected for tests; defaults to wall clock. */
        now?: number;
    },
): Promise<{ txid: string; payoutAmount: bigint }> {
    const now = input.now ?? Math.floor(Date.now() / 1000);
    if (input.htlc.refundLocktime - now < ONCHAIN_CLAIM_MARGIN_SECONDS) {
        const error = new Error(
            "refund leaf opens too soon to claim safely — take the covenant refund instead",
        ) as Error & { reason: string };
        error.reason = "claim_window_closed";
        throw error;
    }
    const spend = await buildHtlcClaim(input);
    const txid = await chain.broadcast(spend.txHex);
    return { txid, payoutAmount: spend.payoutAmount };
}

/** Where an onchain HTLC stands, for crash recovery (see the store docs:
 * persisting the record BEFORE funding is what makes this classification —
 * and the claim — possible after a restart). */
export type OnchainHtlcPhase =
    | { phase: "unfunded" }
    | { phase: "awaiting_confirmations"; utxo: ChainUtxo }
    | { phase: "claimable"; utxo: ChainUtxo }
    | { phase: "refundable"; utxo: ChainUtxo }
    | { phase: "claimed"; txid: string; preimage: Uint8Array }
    | { phase: "swept"; txid: string };

/**
 * Classify an HTLC from chain state alone. `funding` (the known outpoint from
 * the stored record) is what distinguishes "never funded" from "funded and
 * already spent": without it a spent HTLC looks unfunded.
 *
 * `claimed` carries the preimage read from the spend's witness — the receipt;
 * `swept` is a spend that reveals no preimage (the counterparty's refund).
 */
export async function classifyOnchainHtlc(
    chain: ChainSource,
    input: {
        htlc: OnchainHtlc;
        minConfirmations: number;
        funding?: { txid: string; vout: number };
    },
): Promise<OnchainHtlcPhase> {
    const utxos = await chain.getScriptUtxos(input.htlc.pkScript);
    const best = utxos.sort((a, b) => (b.amount > a.amount ? 1 : -1))[0];
    if (!best) {
        if (!input.funding) return { phase: "unfunded" };
        const spend = await chain.getSpendingTx(input.funding.txid, input.funding.vout);
        if (!spend) return { phase: "unfunded" };
        const preimage = extractPreimage(spend.txHex, input.htlc.paymentHash);
        const txid = btc.Transaction.fromRaw(hex.decode(spend.txHex), {
            allowUnknownInputs: true,
            allowUnknownOutputs: true,
        }).id;
        return preimage ? { phase: "claimed", txid, preimage } : { phase: "swept", txid };
    }
    if (best.confirmations < input.minConfirmations)
        return { phase: "awaiting_confirmations", utxo: best };
    const mtp = await chain.getMtp();
    if (mtp >= input.htlc.refundLocktime) return { phase: "refundable", utxo: best };
    return { phase: "claimable", utxo: best };
}
