/**
 * RFQ v1 — the maker / intent-submitter side of quoted swaps.
 *
 * RFQ is the negotiation layer only. After the quote, **filling is
 * non-interactive maker-taker** for both corridors this module serves — the
 * MAKER is this side (the trader posting and funding the intent), the TAKER
 * is the solver that fills it:
 *
 * - `arkade:BTC|asset -> lightning:BTC` — the trader funds its own locally
 *   derived covenant contract (the `lightning-send` program below) and may go
 *   offline; the solver observes the funding on-chain, pays the invoice,
 *   and claims with the preimage — which appears publicly in the claim
 *   witness as the receipt. A failed swap refunds by covenant to the trader's
 *   address, pushable by anyone, no trader keys or state.
 * - `arkade:BTC|asset -> arkade:BTC|asset` — the trader accepts the quote by
 *   creating and funding an Intents **offer** (`createOffer`) bound to the
 *   quoted terms; the offer covenant lets any filler deliver, so the solver
 *   fills without further interaction, or the trader cancels cooperatively.
 *
 * There is deliberately NO accept message anywhere: acceptance is funding.
 *
 * Trust model, identical to the offer side: from a quote the trader uses only
 * the binding fields — `solver_pubkey`, `refund_locktime`, `valid_until`, the
 * amounts. Every other contract parameter is the trader's own data (its
 * invoice, its Ark server connection, its emulator endpoint, its refund
 * address). Anything address-shaped the solver sends is compare-only:
 * a mismatch means refuse-to-fund, never "use theirs".
 *
 * Transport is symmetric-outbound: the reference framing below speaks the dev
 * broker (`{op:"sub"|"event"}` over WebSocket) or plain HTTP; the production
 * target is Nostr (directed kind + NIP-44), which changes only the transport
 * functions here, nothing above them.
 */
import { hex } from "@scure/base";
import { ripemd160 } from "@noble/hashes/legacy.js";
import {
    ArkAddress,
    RestArkProvider,
    RestEmulatorProvider,
    arkade,
    asset,
    getNetwork,
    type IWallet,
    type NetworkName,
} from "@arkade-os/sdk";

import lightningSendProgramJson from "./swap-lightning-send.program.json";
import {
    MAX_MIN_CONFIRMATIONS,
    ONCHAIN_CLAIM_MARGIN_SECONDS,
    ONCHAIN_ORDER_MARGIN_SECONDS,
    ONCHAIN_SECONDS_PER_BLOCK,
    newPreimage,
    onchainHtlcScript,
    paymentHashOf,
    type OnchainHtlc,
    type OnchainNetwork,
} from "./onchainHtlc";

export {
    MAX_MIN_CONFIRMATIONS,
    ONCHAIN_CLAIM_MARGIN_SECONDS,
    ONCHAIN_ORDER_MARGIN_SECONDS,
} from "./onchainHtlc";

/** Drop the prefix of a 33-byte compressed key; pass an x-only key through —
 * same rule as offer.ts, kept local so this module stays self-contained. */
const xOnly = (key: Uint8Array, label: string): Uint8Array => {
    if (key.length === 32) return key;
    if (key.length !== 33 || (key[0] !== 0x02 && key[0] !== 0x03)) {
        throw new Error(`${label} is not a compressed or x-only public key`);
    }
    return key.slice(1);
};

type Artifact = Parameters<typeof arkade.parseArtifact>[0];

/** The lightning-send contract — pure data, byte-identical to the reference
 * solver's script (pinned by the golden test): claim = preimage + solver +
 * server; refund = CLTV + server + covenant-tweaked emulator key pinning the
 * payout to the trader's address; unilateralClaim = solver alone after a CSV. */
export const lightningSendProgram: ReturnType<typeof arkade.parseArtifact> = arkade.parseArtifact(
    lightningSendProgramJson as Artifact,
);

// ── Pairs ────────────────────────────────────────────────────────────────────

/** Legs are `<corridor>:<asset>`; a pair is directional, `from->to`. Arkade
 * asset legs stay coarse (`arkade:ASSET`) — the exact asset ids ride the
 * request profile, mirroring how the offer TLV identifies assets. */
export const ARKADE_BTC = "arkade:BTC";
export const ARKADE_ASSET = "arkade:ASSET";
export const LIGHTNING_BTC = "lightning:BTC";

export const ONCHAIN_BTC = "onchain:BTC";

export const rfqPair = (from: string, to: string): string => `${from}->${to}`;

/** The implemented pair: pay a BOLT11 invoice out of an Arkade balance. */
export const LIGHTNING_SEND_PAIR = rfqPair(ARKADE_BTC, LIGHTNING_BTC);
/** Off-board: Arkade sats out to a Bitcoin-L1 HTLC. */
export const ONCHAIN_SEND_PAIR = rfqPair(ARKADE_BTC, ONCHAIN_BTC);
/** On-board: a Bitcoin-L1 HTLC in, Arkade sats out (milestone 2). */
export const ONCHAIN_RECEIVE_PAIR = rfqPair(ONCHAIN_BTC, ARKADE_BTC);

// ── Errors and closed sets ───────────────────────────────────────────────────

/** The closed refusal set. Treat any unknown reason as a generic decline. */
export type RfqRefusalReason =
    | "unsupported_pair"
    | "unsupported_payload"
    | "amount_out_of_range"
    | "exposure_cap"
    | "invoice_expired"
    | "quote_conflict"
    | "pricing_unavailable";

/** Lifecycle vocabulary; states after which nothing more will happen. */
export const RFQ_TERMINAL_STATES = ["settled", "refused", "expired", "refunded", "stuck"] as const;

/** A refusal from the solver, carrying its closed-set reason. */
export class SwapRefusal extends Error {
    readonly reason: string;
    readonly rfqId: string | undefined;
    constructor(reason: string, rfqId?: string) {
        super(`solver refused: ${reason}`);
        this.name = "SwapRefusal";
        this.reason = reason;
        this.rfqId = rfqId;
    }
}

/** The solver's address does not match the local derivation. NEVER fund past this. */
export class AddressMismatch extends Error {
    readonly derived: string;
    readonly quoted: string | undefined;
    constructor(derived: string, quoted?: string) {
        super("solver lockup address does not match local derivation — refusing to fund");
        this.name = "AddressMismatch";
        this.derived = derived;
        this.quoted = quoted;
    }
}

// ── Messages ─────────────────────────────────────────────────────────────────

/** A fresh client-chosen negotiation id: 32 random bytes, lowercase hex. */
export const newRfqId = (): string => hex.encode(crypto.getRandomValues(new Uint8Array(32)));

export interface RfqQuote {
    v: 1;
    type: "rfq_quote";
    rfq_id: string;
    pair: string;
    from_amount: number;
    to_amount: number;
    solver_pubkey: string;
    valid_until: number;
    /** HTLC-class quotes only; absent for arkade↔arkade. */
    refund_locktime?: number;
    profile: { [key: string]: unknown; payment_hash?: string; lockup_address?: string };
    [key: string]: unknown;
}

export interface RfqStatus {
    v: 1;
    type: "rfq_status";
    rfq_id: string;
    state: string;
    updated_at: number;
    profile: Record<string, unknown>;
    [key: string]: unknown;
}

/** The rfq_request for the lightning send profile. A BOLT11 profile is always
 * exact-out: the invoice fixes the amount, so none is restated here. */
export const lightningSendRequest = (input: {
    rfqId: string;
    invoice: string;
    refundAddress: string;
}): Record<string, unknown> => ({
    v: 1,
    type: "rfq_request",
    rfq_id: input.rfqId,
    pair: LIGHTNING_SEND_PAIR,
    amount_side: "to",
    profile: { invoice: input.invoice, refund_address: input.refundAddress },
});

/** The rfq_request for an arkade↔arkade swap. Exactly one side may name an
 * asset id per direction (BTC has none); the pair string stays coarse and the
 * ids ride the profile, like the offer TLV. Forward-looking: the wire shape is
 * specified, the reference solver does not serve it yet. */
export const arkadeSwapRequest = (input: {
    rfqId: string;
    /** Asset the trader deposits; omit when depositing BTC. */
    offerAsset?: asset.AssetId;
    /** Asset the trader wants; omit when wanting BTC. */
    wantAsset?: asset.AssetId;
    amountSide: "from" | "to";
    /** Integer base units of the side named by `amountSide`. */
    amount: number;
}): Record<string, unknown> => {
    if (Boolean(input.wantAsset) === Boolean(input.offerAsset)) {
        throw new Error("set exactly one of wantAsset (BTC->asset) or offerAsset (asset->BTC)");
    }
    return {
        v: 1,
        type: "rfq_request",
        rfq_id: input.rfqId,
        pair: rfqPair(
            input.offerAsset ? ARKADE_ASSET : ARKADE_BTC,
            input.wantAsset ? ARKADE_ASSET : ARKADE_BTC,
        ),
        amount_side: input.amountSide,
        amount: input.amount,
        profile: {
            ...(input.offerAsset && { offer_asset: hex.encode(input.offerAsset.serialize()) }),
            ...(input.wantAsset && { want_asset: hex.encode(input.wantAsset.serialize()) }),
        },
    };
};

// ── Guardrails ───────────────────────────────────────────────────────────────

/** Funding gate: refuse unless ≥90 min remain before the refund path opens.
 * 90 because the refund CLTV matures against median-time-past (BIP-113),
 * which lags wall clock by ~1h — a smaller wall-clock margin is no margin. */
export const MIN_HEADROOM_SECONDS = 90 * 60;

/** Compare-only check of the solver's address against YOUR derivation.
 * Throws {@link AddressMismatch}; returns the address so calls chain. */
export const verifyLockupAddress = (quote: RfqQuote, derivedAddress: string): string => {
    const quoted = quote.profile?.lockup_address;
    if (derivedAddress !== quoted) throw new AddressMismatch(derivedAddress, quoted);
    return derivedAddress;
};

/** The maker's gates, checked immediately before funding — never at quote
 * time. Throws with a stable `reason` property. `invoiceExpiresAt` applies to
 * BOLT11 profiles only; `onchain` adds the L1-HTLC gates (§ guardrails of the
 * onchain spec) and is required for the onchain pairs. */
export const assertFundable = (input: {
    quote: RfqQuote;
    invoiceExpiresAt?: number;
    now: number;
    onchain?: {
        htlcLocktime: number;
        minConfirmations: number;
        /** "send" = arkade->onchain (the L1 timelock-order gate applies). */
        direction: "send" | "receive";
    };
}): void => {
    const fail = (reason: string, message: string): never => {
        const error = new Error(message) as Error & { reason: string };
        error.reason = reason;
        throw error;
    };
    if (input.invoiceExpiresAt !== undefined && input.now >= input.invoiceExpiresAt) {
        fail("invoice_expired", "invoice expired");
    }
    if (input.now >= input.quote.valid_until)
        fail("quote_expired", "quote expired — request a fresh one");
    if (
        input.quote.refund_locktime !== undefined &&
        input.quote.refund_locktime - input.now < MIN_HEADROOM_SECONDS
    ) {
        fail("insufficient_headroom", "refund deadline headroom below 90 minutes");
    }
    if (input.onchain) {
        const { htlcLocktime, minConfirmations, direction } = input.onchain;
        if (
            !Number.isInteger(minConfirmations) ||
            minConfirmations < 1 ||
            minConfirmations > MAX_MIN_CONFIRMATIONS
        ) {
            fail(
                "confirmations_out_of_range",
                `min_confirmations must be 1..${MAX_MIN_CONFIRMATIONS}, got ${minConfirmations}`,
            );
        }
        // Enough room to confirm the fill AND claim well before the refund
        // leaf opens (MTP lag + confirmation time).
        const needed = minConfirmations * ONCHAIN_SECONDS_PER_BLOCK + ONCHAIN_CLAIM_MARGIN_SECONDS;
        if (htlcLocktime - input.now <= needed) {
            fail("claim_window_too_short", "L1 HTLC locktime leaves no safe claim window");
        }
        if (direction === "send") {
            // The solver claims Arkade with P AFTER the maker's L1 claim; the
            // maker's Arkade refund must therefore open LAST, with reorg margin.
            if (
                input.quote.refund_locktime === undefined ||
                htlcLocktime + ONCHAIN_ORDER_MARGIN_SECONDS > input.quote.refund_locktime
            ) {
                fail(
                    "timelock_order",
                    "L1 HTLC locktime + margin must fall before the Arkade refund locktime",
                );
            }
        }
    }
};

// ── Transports ───────────────────────────────────────────────────────────────

export interface RfqTransport {
    requestQuote(payload: Record<string, unknown>): Promise<RfqQuote>;
    status(rfqId: string): Promise<RfqStatus | null>;
    close(): Promise<void>;
}

const expectQuote = (payload: unknown, rfqId: string): RfqQuote => {
    const p = payload as { type?: string; reason?: string; rfq_id?: string } | null;
    if (p?.type === "rfq_refusal") throw new SwapRefusal(p.reason ?? "unknown", p.rfq_id ?? rfqId);
    if (p?.type !== "rfq_quote" || p.rfq_id !== rfqId) {
        throw new Error(`unexpected reply: ${p?.type ?? "no payload"}`);
    }
    return payload as RfqQuote;
};

/** HTTP: POST /v1/swap for quotes, GET /v1/rfq/<rfq_id> for status.
 * `fetchImpl` is injectable for tests and non-global-fetch runtimes. */
export const httpTransport = (
    baseUrl: string,
    options: { fetchImpl?: typeof fetch } = {},
): RfqTransport => {
    const fetchImpl = options.fetchImpl ?? fetch;
    return {
        async requestQuote(payload) {
            const response = await fetchImpl(`${baseUrl}/v1/swap`, {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify(payload),
            });
            return expectQuote(await response.json(), String(payload.rfq_id));
        },
        async status(rfqId) {
            const response = await fetchImpl(`${baseUrl}/v1/rfq/${rfqId}`, { method: "GET" });
            if (response.status === 404) return null;
            const payload = (await response.json()) as { type?: string } | null;
            return payload?.type === "rfq_status" ? (payload as RfqStatus) : null;
        },
        async close() {},
    };
};

/** Minimal WebSocket surface the relay transport needs — satisfied by the DOM
 * WebSocket and by `ws` alike, so neither becomes a dependency. */
export interface RelaySocket {
    send(data: string): void;
    close(): void;
    addEventListener(type: "open" | "message" | "error", listener: (event: any) => void): void;
}

/** Relay: both parties outbound, addressed by x-only pubkey, speaking the dev
 * broker framing. Nostr (directed kind + NIP-44) replaces only this function.
 * One socket; replies correlated by rfq_id. */
export const relayTransport = (
    relayUrl: string,
    options: {
        solverPubkey: string;
        clientPubkey: string;
        WebSocketCtor?: new (url: string) => RelaySocket;
        timeoutMs?: number;
    },
): RfqTransport => {
    const timeoutMs = options.timeoutMs ?? 30_000;
    const Ctor =
        options.WebSocketCtor ?? (WebSocket as unknown as new (url: string) => RelaySocket);
    const pending = new Map<string, (payload: unknown) => void>();
    let sequence = 0;

    const socketReady = new Promise<RelaySocket>((resolve, reject) => {
        const ws = new Ctor(relayUrl);
        ws.addEventListener("open", () => {
            ws.send(
                JSON.stringify({
                    op: "sub",
                    id: "s1",
                    filter: { recipient: options.clientPubkey },
                }),
            );
            resolve(ws);
        });
        ws.addEventListener("error", () => reject(new Error("relay connection failed")));
        ws.addEventListener("message", (event: { data: unknown }) => {
            let frame: { op?: string; event?: { payload?: { rfq_id?: string } } };
            try {
                frame = JSON.parse(String(event.data));
            } catch {
                return;
            }
            if (frame.op !== "event") return;
            const payload = frame.event?.payload;
            const rfqId = payload?.rfq_id;
            const settle = rfqId !== undefined ? pending.get(rfqId) : undefined;
            if (settle && rfqId !== undefined) {
                pending.delete(rfqId);
                settle(payload);
            }
        });
    });

    const roundTrip = async (payload: Record<string, unknown>, rfqId: string): Promise<unknown> => {
        const ws = await socketReady;
        const reply = new Promise<unknown>((resolve, reject) => {
            const timer = setTimeout(() => {
                pending.delete(rfqId);
                reject(new Error(`no reply within ${timeoutMs}ms`));
            }, timeoutMs);
            pending.set(rfqId, (p) => {
                clearTimeout(timer);
                resolve(p);
            });
        });
        ws.send(
            JSON.stringify({
                op: "event",
                event: {
                    id: `${options.clientPubkey}:${(sequence += 1)}`,
                    author: options.clientPubkey,
                    recipient: options.solverPubkey,
                    createdAtMs: Date.now(),
                    payload,
                },
            }),
        );
        return reply;
    };

    return {
        async requestQuote(payload) {
            return expectQuote(
                await roundTrip(payload, String(payload.rfq_id)),
                String(payload.rfq_id),
            );
        },
        async status(rfqId) {
            const payload = (await roundTrip(
                { v: 1, type: "rfq_status_request", rfq_id: rfqId },
                rfqId,
            )) as { type?: string } | null;
            return payload?.type === "rfq_status" ? (payload as RfqStatus) : null;
        },
        async close() {
            try {
                (await socketReady).close();
            } catch {
                // socket never opened; nothing to close
            }
        },
    };
};

// ── Lightning send: derivation + the maker flow ──────────────────────────────

/** BIP68 sequence granularity; the delay derivation rounds up to it. */
const SEQUENCE_GRANULARITY_SECONDS = 512;

/** The solver's unilateral-claim delay, derived from the Ark server's reported
 * exit delay exactly as the reference solver derives it — both sides read the
 * SAME server, so the derivation (not a quote field) is what keeps the two
 * scripts identical. */
export const unilateralClaimDelay = (serverExitDelaySeconds: number): number => {
    if (
        !Number.isFinite(serverExitDelaySeconds) ||
        serverExitDelaySeconds < SEQUENCE_GRANULARITY_SECONDS
    ) {
        throw new Error(
            `server exit delay must be at least ${SEQUENCE_GRANULARITY_SECONDS}s of seconds, got ${serverExitDelaySeconds}`,
        );
    }
    if (serverExitDelaySeconds > 0xffff * SEQUENCE_GRANULARITY_SECONDS) {
        throw new Error(
            `server exit delay ${serverExitDelaySeconds}s exceeds what BIP68 can encode`,
        );
    }
    return (
        Math.ceil(serverExitDelaySeconds / SEQUENCE_GRANULARITY_SECONDS) *
        SEQUENCE_GRANULARITY_SECONDS
    );
};

/** Compile the lightning-send contract from the quote's binding fields plus
 * the trader's own data. `paymentHash` is the BOLT11 payment hash
 * (`sha256(P)`, hex); the script's HASH160 commitment is derived from it here,
 * which is why the trader never needs to see `P`. */
export function lightningSendVtxoScript(params: {
    /** Binding field #1: the solver's x-only key, from the quote. */
    solverPubkey: Uint8Array;
    /** Binding field #2: when the trader's refund path opens, from the quote. */
    refundLocktime: number;
    /** The Ark server's x-only key — the trader's OWN connection. */
    serverPubkey: Uint8Array;
    /** BOLT11 payment hash, hex — from the trader's OWN invoice decode. */
    paymentHash: string;
    /** From {@link unilateralClaimDelay} over the trader's OWN server info. */
    claimDelay: number;
    /** Emulator x-only key — the trader's OWN endpoint. */
    emulatorPubkey: Uint8Array;
    /** Where a refund must pay: the trader's P2TR pkScript (34 bytes). */
    refundPkScript: Uint8Array;
}): InstanceType<typeof arkade.ArkadeProgramScript> {
    return new arkade.ArkadeProgramScript(
        lightningSendProgram,
        {
            receiver: params.solverPubkey,
            server: params.serverPubkey,
            preimageHash: ripemd160(hex.decode(params.paymentHash)),
            refundLocktime: BigInt(params.refundLocktime),
            claimDelay: BigInt(params.claimDelay),
            // the covenant commits to the x-only key; the 0x5120 prefix is
            // re-added by the introspection opcode reading the output script
            refundKey: params.refundPkScript.subarray(2),
        },
        { serverKey: params.serverPubkey, emulatorKey: params.emulatorPubkey },
    );
}

/** The BOLT11 facts the trader read from its OWN decode — this module takes
 * the facts, not the decoder, so any wallet's existing decoder serves. */
export interface InvoiceFacts {
    /** The raw BOLT11 — what travels in the request profile. */
    raw: string;
    /** `sha256(P)`, hex (64 chars). */
    paymentHash: string;
    amountSats: number;
    /** Absolute expiry, unix seconds. */
    expiresAt: number;
}

/**
 * The lightning-send maker flow, mirroring `createOffer`'s shape: quote →
 * derive locally → verify → gate. Pure of funding on purpose — it returns the
 * address and amount, and the caller funds with its own wallet
 * (`wallet.send({ address, amount })`) before `quote.valid_until`, after
 * which the maker may go OFFLINE: filling is non-interactive. Success reveals
 * the preimage in the solver's claim witness (also served via status as
 * `settled`); failure refunds by covenant to `refundAddress`.
 *
 * Throws {@link SwapRefusal} (closed reason), {@link AddressMismatch} (never
 * fund), or a gate error with a stable `reason`.
 */
export async function requestLightningSend(
    wallet: IWallet,
    arkServerUrl: string,
    emulatorUrl: string,
    transport: RfqTransport,
    params: { invoice: InvoiceFacts; rfqId?: string },
): Promise<{
    rfqId: string;
    quote: RfqQuote;
    /** The trader's OWN derivation — the only address to fund. */
    address: string;
    /** What the lockup must carry: the invoice amount, in sats. */
    fundAmount: number;
    /** The covenant's scriptPubKey, for watching the lockup and its spend. */
    swapPkScript: Uint8Array;
    /** Where a failed swap provably refunds. */
    refundAddress: string;
}> {
    const rfqId = params.rfqId ?? newRfqId();
    const [info, emulatorInfo, refundAddress] = await Promise.all([
        new RestArkProvider(arkServerUrl).getInfo(),
        new RestEmulatorProvider(emulatorUrl).getInfo(),
        wallet.getAddress(),
    ]);

    const quote = await transport.requestQuote(
        lightningSendRequest({ rfqId, invoice: params.invoice.raw, refundAddress }),
    );
    if (quote.refund_locktime === undefined) {
        throw new Error("lightning-send quote is missing refund_locktime");
    }

    const serverPubkey = xOnly(hex.decode(info.signerPubkey), "ark signer key");
    const script = lightningSendVtxoScript({
        solverPubkey: xOnly(hex.decode(quote.solver_pubkey), "solver key"),
        refundLocktime: quote.refund_locktime,
        serverPubkey,
        paymentHash: params.invoice.paymentHash,
        claimDelay: unilateralClaimDelay(Number(info.unilateralExitDelay)),
        emulatorPubkey: xOnly(hex.decode(emulatorInfo.signerPubkey), "emulator signer key"),
        refundPkScript: ArkAddress.decode(refundAddress).pkScript,
    });
    const address = script
        .address(getNetwork(info.network as NetworkName).hrp, serverPubkey)
        .encode();
    verifyLockupAddress(quote, address);
    assertFundable({
        quote,
        invoiceExpiresAt: params.invoice.expiresAt,
        now: Math.floor(Date.now() / 1000),
    });

    return {
        rfqId,
        quote,
        address,
        fundAmount: params.invoice.amountSats,
        swapPkScript: script.pkScript,
        refundAddress,
    };
}

// ── Arkade ↔ arkade: quote, then take by funding an offer ───────────────────

/**
 * Map an arkade↔arkade quote onto `createOffer` terms. The trader takes the
 * quote by creating and funding the offer covenant before `valid_until` —
 * the non-interactive fill: the covenant only releases the deposit to a
 * transaction that delivers the quoted want-amount to the trader, so the
 * solver fills or nothing moves. There is no rfq_fill message and no refund
 * timelock; an unfilled offer is cancelled cooperatively (`cancelOffer`).
 */
export const offerTermsFromQuote = (
    quote: RfqQuote,
    assets: { wantAsset?: asset.AssetId; offerAsset?: asset.AssetId },
): { wantAmount: bigint; wantAsset?: asset.AssetId; offerAsset?: asset.AssetId } => {
    if (Boolean(assets.wantAsset) === Boolean(assets.offerAsset)) {
        throw new Error("set exactly one of wantAsset or offerAsset");
    }
    return { wantAmount: BigInt(quote.to_amount), ...assets };
};

// ── Onchain corridor: off-board (arkade->onchain) and on-board wire ─────────

/** The Arkade lockup for an onchain send is byte-identical to the
 * lightning-send program — only the SOURCE of the payment hash differs
 * (maker-generated P instead of a BOLT11). One artifact, one golden test. */
export const htlcSendProgram: ReturnType<typeof arkade.parseArtifact> = lightningSendProgram;

const l1NetworkFromArk = (network: string): OnchainNetwork =>
    network === "bitcoin" ? "bitcoin" : network === "regtest" ? "regtest" : "testnet";

/** The rfq_request for `arkade:BTC->onchain:BTC`. Exact-out means "this much
 * lands in the L1 HTLC". */
export const onchainSendRequest = (input: {
    rfqId: string;
    /** `sha256(P)`, hex — maker-chosen; see {@link paymentHashOf}. */
    paymentHash: string;
    /** Maker's x-only L1 key for the HTLC's claim leaf. */
    payoutPubkey: Uint8Array;
    /** Maker's arkade address — where the covenant refund must pay. */
    refundAddress: string;
    amount: number;
    amountSide: "from" | "to";
}): Record<string, unknown> => ({
    v: 1,
    type: "rfq_request",
    rfq_id: input.rfqId,
    pair: ONCHAIN_SEND_PAIR,
    amount_side: input.amountSide,
    amount: input.amount,
    profile: {
        payment_hash: input.paymentHash,
        payout_pubkey: hex.encode(input.payoutPubkey),
        refund_address: input.refundAddress,
    },
});

/** The rfq_request for `onchain:BTC->arkade:BTC` (milestone 2). The maker
 * funds the L1 HTLC; P travels sealed to covclaimd (see `sealClaimPacket`) so
 * the maker can go offline after funding. NOTE: the Arkade-side verification
 * of the solver-funded VHTLC needs the SDK's non-interactive-claim API, which
 * is not merged upstream yet — see the README before building on this pair. */
export const onchainReceiveRequest = (input: {
    rfqId: string;
    paymentHash: string;
    /** Maker's arkade address — where the swapped sats must land. */
    destinationAddress: string;
    /** Maker's x-only L1 key for the HTLC's refund leaf. */
    refundPubkey: Uint8Array;
    claimPacket: { ciphertext: string; arkade_script: string };
    amount: number;
    amountSide: "from" | "to";
}): Record<string, unknown> => ({
    v: 1,
    type: "rfq_request",
    rfq_id: input.rfqId,
    pair: ONCHAIN_RECEIVE_PAIR,
    amount_side: input.amountSide,
    amount: input.amount,
    profile: {
        payment_hash: input.paymentHash,
        destination_address: input.destinationAddress,
        refund_pubkey: hex.encode(input.refundPubkey),
        claim_packet: input.claimPacket,
    },
});

/**
 * The pure core of {@link requestOnchainSend}: derive BOTH contracts locally
 * from the quote's binding fields plus the maker's own data, and refuse on any
 * mismatch. Binding: `solver_pubkey`, `refund_locktime`, `htlc_pubkey`,
 * `htlc_locktime`, `min_confirmations`; `lockup_address` and `htlc_address`
 * are compare-only.
 */
export function deriveOnchainSend(input: {
    quote: RfqQuote;
    paymentHash: string;
    payoutPubkey: Uint8Array;
    serverPubkey: Uint8Array;
    emulatorPubkey: Uint8Array;
    claimDelay: number;
    hrp: string;
    l1Network: OnchainNetwork;
    refundAddress: string;
}): {
    address: string;
    swapPkScript: Uint8Array;
    htlc: OnchainHtlc;
    refundLocktime: number;
    htlcLocktime: number;
    minConfirmations: number;
} {
    const { quote } = input;
    const profile = quote.profile ?? {};
    const refundLocktime = quote.refund_locktime ?? (profile.refund_locktime as number | undefined);
    const htlcPubkey = profile.htlc_pubkey as string | undefined;
    const htlcLocktime = profile.htlc_locktime as number | undefined;
    const htlcAddress = profile.htlc_address as string | undefined;
    const minConfirmations = profile.min_confirmations as number | undefined;
    if (
        refundLocktime === undefined ||
        htlcPubkey === undefined ||
        htlcLocktime === undefined ||
        minConfirmations === undefined
    ) {
        throw new Error("onchain-send quote is missing a binding field");
    }

    const script = lightningSendVtxoScript({
        solverPubkey: xOnly(hex.decode(quote.solver_pubkey), "solver key"),
        refundLocktime,
        serverPubkey: input.serverPubkey,
        paymentHash: input.paymentHash,
        claimDelay: input.claimDelay,
        emulatorPubkey: input.emulatorPubkey,
        refundPkScript: ArkAddress.decode(input.refundAddress).pkScript,
    });
    const address = script.address(input.hrp, input.serverPubkey).encode();
    verifyLockupAddress(quote, address);

    const htlc = onchainHtlcScript(
        {
            paymentHash: input.paymentHash,
            claimKey: input.payoutPubkey,
            refundKey: xOnly(hex.decode(htlcPubkey), "solver L1 htlc key"),
            refundLocktime: htlcLocktime,
        },
        input.l1Network,
    );
    if (htlc.address !== htlcAddress) throw new AddressMismatch(htlc.address, htlcAddress);

    return {
        address,
        swapPkScript: script.pkScript,
        htlc,
        refundLocktime,
        htlcLocktime,
        minConfirmations,
    };
}

/**
 * The `arkade:BTC->onchain:BTC` maker flow, mirroring `requestLightningSend`:
 * quote → derive BOTH contracts locally → verify → gate. Pure of funding —
 * the caller funds `address` with its own wallet before `quote.valid_until`.
 *
 * Two obligations, both LOUD:
 * - **Persist `preimage` (with the record) BEFORE funding.** It is the only
 *   thing that can claim the L1 fill, across restarts included.
 * - **Stay claim-capable.** Unlike lightning-send the maker cannot go fully
 *   offline: it must claim the L1 HTLC (`awaitOnchainFill` →
 *   `claimOnchainFill`) before `htlc.refundLocktime`. Missing that window
 *   forfeits the fill and falls back to the Arkade covenant refund.
 */
export async function requestOnchainSend(
    wallet: IWallet,
    arkServerUrl: string,
    emulatorUrl: string,
    transport: RfqTransport,
    params: {
        amount: number;
        amountSide: "from" | "to";
        /** Maker's x-only L1 key that will claim the HTLC. */
        payoutPubkey: Uint8Array;
        preimage?: Uint8Array;
        rfqId?: string;
    },
): Promise<{
    rfqId: string;
    quote: RfqQuote;
    /** Caller MUST persist this before funding. */
    preimage: Uint8Array;
    /** The maker's OWN arkade lockup derivation — the only address to fund. */
    address: string;
    fundAmount: number;
    swapPkScript: Uint8Array;
    refundAddress: string;
    /** The EXPECTED L1 fill, derived locally — watch and claim against this. */
    htlc: OnchainHtlc;
}> {
    const rfqId = params.rfqId ?? newRfqId();
    const preimage = params.preimage ?? newPreimage();
    const paymentHash = paymentHashOf(preimage);
    const [info, emulatorInfo, refundAddress] = await Promise.all([
        new RestArkProvider(arkServerUrl).getInfo(),
        new RestEmulatorProvider(emulatorUrl).getInfo(),
        wallet.getAddress(),
    ]);

    const quote = await transport.requestQuote(
        onchainSendRequest({
            rfqId,
            paymentHash,
            payoutPubkey: params.payoutPubkey,
            refundAddress,
            amount: params.amount,
            amountSide: params.amountSide,
        }),
    );

    const derived = deriveOnchainSend({
        quote,
        paymentHash,
        payoutPubkey: params.payoutPubkey,
        serverPubkey: xOnly(hex.decode(info.signerPubkey), "ark signer key"),
        emulatorPubkey: xOnly(hex.decode(emulatorInfo.signerPubkey), "emulator signer key"),
        claimDelay: unilateralClaimDelay(Number(info.unilateralExitDelay)),
        hrp: getNetwork(info.network as NetworkName).hrp,
        l1Network: l1NetworkFromArk(info.network),
        refundAddress,
    });
    assertFundable({
        quote,
        now: Math.floor(Date.now() / 1000),
        onchain: {
            htlcLocktime: derived.htlcLocktime,
            minConfirmations: derived.minConfirmations,
            direction: "send",
        },
    });

    return {
        rfqId,
        quote,
        preimage,
        address: derived.address,
        fundAmount: quote.from_amount,
        swapPkScript: derived.swapPkScript,
        refundAddress,
        htlc: derived.htlc,
    };
}
