/*! scure-base - MIT License (c) 2022 Paul Miller (paulmillr.com) */
function Ue(e) {
  return e instanceof Uint8Array || ArrayBuffer.isView(e) && e.constructor.name === "Uint8Array";
}
function Gs(e) {
  if (!Ue(e))
    throw new Error("Uint8Array expected");
}
function js(e, t) {
  return Array.isArray(t) ? t.length === 0 ? !0 : e ? t.every((n) => typeof n == "string") : t.every((n) => Number.isSafeInteger(n)) : !1;
}
function so(e) {
  if (typeof e != "function")
    throw new Error("function expected");
  return !0;
}
function ce(e, t) {
  if (typeof t != "string")
    throw new Error(`${e}: string expected`);
  return !0;
}
function De(e) {
  if (!Number.isSafeInteger(e))
    throw new Error(`invalid integer: ${e}`);
}
function Cn(e) {
  if (!Array.isArray(e))
    throw new Error("array expected");
}
function $n(e, t) {
  if (!js(!0, t))
    throw new Error(`${e}: array of strings expected`);
}
function io(e, t) {
  if (!js(!1, t))
    throw new Error(`${e}: array of numbers expected`);
}
// @__NO_SIDE_EFFECTS__
function an(...e) {
  const t = (s) => s, n = (s, i) => (c) => s(i(c)), r = e.map((s) => s.encode).reduceRight(n, t), o = e.map((s) => s.decode).reduce(n, t);
  return { encode: r, decode: o };
}
// @__NO_SIDE_EFFECTS__
function rr(e) {
  const t = typeof e == "string" ? e.split("") : e, n = t.length;
  $n("alphabet", t);
  const r = new Map(t.map((o, s) => [o, s]));
  return {
    encode: (o) => (Cn(o), o.map((s) => {
      if (!Number.isSafeInteger(s) || s < 0 || s >= n)
        throw new Error(`alphabet.encode: digit index outside alphabet "${s}". Allowed: ${e}`);
      return t[s];
    })),
    decode: (o) => (Cn(o), o.map((s) => {
      ce("alphabet.decode", s);
      const i = r.get(s);
      if (i === void 0)
        throw new Error(`Unknown letter: "${s}". Allowed: ${e}`);
      return i;
    }))
  };
}
// @__NO_SIDE_EFFECTS__
function or(e = "") {
  return ce("join", e), {
    encode: (t) => ($n("join.decode", t), t.join(e)),
    decode: (t) => (ce("join.decode", t), t.split(e))
  };
}
// @__NO_SIDE_EFFECTS__
function Wc(e, t = "=") {
  return De(e), ce("padding", t), {
    encode(n) {
      for ($n("padding.encode", n); n.length * e % 8; )
        n.push(t);
      return n;
    },
    decode(n) {
      $n("padding.decode", n);
      let r = n.length;
      if (r * e % 8)
        throw new Error("padding: invalid, string should have whole number of bytes");
      for (; r > 0 && n[r - 1] === t; r--)
        if ((r - 1) * e % 8 === 0)
          throw new Error("padding: invalid, string has too much padding");
      return n.slice(0, r);
    }
  };
}
// @__NO_SIDE_EFFECTS__
function zc(e) {
  return so(e), { encode: (t) => t, decode: (t) => e(t) };
}
function Ko(e, t, n) {
  if (t < 2)
    throw new Error(`convertRadix: invalid from=${t}, base cannot be less than 2`);
  if (n < 2)
    throw new Error(`convertRadix: invalid to=${n}, base cannot be less than 2`);
  if (Cn(e), !e.length)
    return [];
  let r = 0;
  const o = [], s = Array.from(e, (c) => {
    if (De(c), c < 0 || c >= t)
      throw new Error(`invalid integer: ${c}`);
    return c;
  }), i = s.length;
  for (; ; ) {
    let c = 0, a = !0;
    for (let u = r; u < i; u++) {
      const f = s[u], l = t * c, d = l + f;
      if (!Number.isSafeInteger(d) || l / t !== c || d - f !== l)
        throw new Error("convertRadix: carry overflow");
      const h = d / n;
      c = d % n;
      const g = Math.floor(h);
      if (s[u] = g, !Number.isSafeInteger(g) || g * n + c !== d)
        throw new Error("convertRadix: carry overflow");
      if (a)
        g ? a = !1 : r = u;
      else continue;
    }
    if (o.push(c), a)
      break;
  }
  for (let c = 0; c < e.length - 1 && e[c] === 0; c++)
    o.push(0);
  return o.reverse();
}
const Ys = (e, t) => t === 0 ? e : Ys(t, e % t), Ln = /* @__NO_SIDE_EFFECTS__ */ (e, t) => e + (t - Ys(e, t)), An = /* @__PURE__ */ (() => {
  let e = [];
  for (let t = 0; t < 40; t++)
    e.push(2 ** t);
  return e;
})();
function Ur(e, t, n, r) {
  if (Cn(e), t <= 0 || t > 32)
    throw new Error(`convertRadix2: wrong from=${t}`);
  if (n <= 0 || n > 32)
    throw new Error(`convertRadix2: wrong to=${n}`);
  if (/* @__PURE__ */ Ln(t, n) > 32)
    throw new Error(`convertRadix2: carry overflow from=${t} to=${n} carryBits=${/* @__PURE__ */ Ln(t, n)}`);
  let o = 0, s = 0;
  const i = An[t], c = An[n] - 1, a = [];
  for (const u of e) {
    if (De(u), u >= i)
      throw new Error(`convertRadix2: invalid data word=${u} from=${t}`);
    if (o = o << t | u, s + t > 32)
      throw new Error(`convertRadix2: carry overflow pos=${s} from=${t}`);
    for (s += t; s >= n; s -= n)
      a.push((o >> s - n & c) >>> 0);
    const f = An[s];
    if (f === void 0)
      throw new Error("invalid carry");
    o &= f - 1;
  }
  if (o = o << n - s & c, !r && s >= t)
    throw new Error("Excess padding");
  if (!r && o > 0)
    throw new Error(`Non-zero padding: ${o}`);
  return r && s > 0 && a.push(o >>> 0), a;
}
// @__NO_SIDE_EFFECTS__
function Gc(e) {
  De(e);
  const t = 2 ** 8;
  return {
    encode: (n) => {
      if (!Ue(n))
        throw new Error("radix.encode input should be Uint8Array");
      return Ko(Array.from(n), t, e);
    },
    decode: (n) => (io("radix.decode", n), Uint8Array.from(Ko(n, e, t)))
  };
}
// @__NO_SIDE_EFFECTS__
function co(e, t = !1) {
  if (De(e), e <= 0 || e > 32)
    throw new Error("radix2: bits should be in (0..32]");
  if (/* @__PURE__ */ Ln(8, e) > 32 || /* @__PURE__ */ Ln(e, 8) > 32)
    throw new Error("radix2: carry overflow");
  return {
    encode: (n) => {
      if (!Ue(n))
        throw new Error("radix2.encode input should be Uint8Array");
      return Ur(Array.from(n), 8, e, !t);
    },
    decode: (n) => (io("radix2.decode", n), Uint8Array.from(Ur(n, e, 8, t)))
  };
}
function Fo(e) {
  return so(e), function(...t) {
    try {
      return e.apply(null, t);
    } catch {
    }
  };
}
function jc(e, t) {
  return De(e), so(t), {
    encode(n) {
      if (!Ue(n))
        throw new Error("checksum.encode: input should be Uint8Array");
      const r = t(n).slice(0, e), o = new Uint8Array(n.length + e);
      return o.set(n), o.set(r, n.length), o;
    },
    decode(n) {
      if (!Ue(n))
        throw new Error("checksum.decode: input should be Uint8Array");
      const r = n.slice(0, -e), o = n.slice(-e), s = t(r).slice(0, e);
      for (let i = 0; i < e; i++)
        if (s[i] !== o[i])
          throw new Error("Invalid checksum");
      return r;
    }
  };
}
const Yc = typeof Uint8Array.from([]).toBase64 == "function" && typeof Uint8Array.fromBase64 == "function", qc = (e, t) => {
  ce("base64", e);
  const n = /^[A-Za-z0-9=+/]+$/, r = "base64";
  if (e.length > 0 && !n.test(e))
    throw new Error("invalid base64");
  return Uint8Array.fromBase64(e, { alphabet: r, lastChunkHandling: "strict" });
}, At = Yc ? {
  encode(e) {
    return Gs(e), e.toBase64();
  },
  decode(e) {
    return qc(e);
  }
} : /* @__PURE__ */ an(/* @__PURE__ */ co(6), /* @__PURE__ */ rr("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"), /* @__PURE__ */ Wc(6), /* @__PURE__ */ or("")), Zc = /* @__NO_SIDE_EFFECTS__ */ (e) => /* @__PURE__ */ an(/* @__PURE__ */ Gc(58), /* @__PURE__ */ rr(e), /* @__PURE__ */ or("")), Nr = /* @__PURE__ */ Zc("123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"), Xc = (e) => /* @__PURE__ */ an(jc(4, (t) => e(e(t))), Nr), Cr = /* @__PURE__ */ an(/* @__PURE__ */ rr("qpzry9x8gf2tvdw0s3jn54khce6mua7l"), /* @__PURE__ */ or("")), Wo = [996825010, 642813549, 513874426, 1027748829, 705979059];
function Ke(e) {
  const t = e >> 25;
  let n = (e & 33554431) << 5;
  for (let r = 0; r < Wo.length; r++)
    (t >> r & 1) === 1 && (n ^= Wo[r]);
  return n;
}
function zo(e, t, n = 1) {
  const r = e.length;
  let o = 1;
  for (let s = 0; s < r; s++) {
    const i = e.charCodeAt(s);
    if (i < 33 || i > 126)
      throw new Error(`Invalid prefix (${e})`);
    o = Ke(o) ^ i >> 5;
  }
  o = Ke(o);
  for (let s = 0; s < r; s++)
    o = Ke(o) ^ e.charCodeAt(s) & 31;
  for (let s of t)
    o = Ke(o) ^ s;
  for (let s = 0; s < 6; s++)
    o = Ke(o);
  return o ^= n, Cr.encode(Ur([o % An[30]], 30, 5, !1));
}
// @__NO_SIDE_EFFECTS__
function qs(e) {
  const t = e === "bech32" ? 1 : 734539939, n = /* @__PURE__ */ co(5), r = n.decode, o = n.encode, s = Fo(r);
  function i(l, d, h = 90) {
    ce("bech32.encode prefix", l), Ue(d) && (d = Array.from(d)), io("bech32.encode", d);
    const g = l.length;
    if (g === 0)
      throw new TypeError(`Invalid prefix length ${g}`);
    const p = g + 7 + d.length;
    if (h !== !1 && p > h)
      throw new TypeError(`Length ${p} exceeds limit ${h}`);
    const y = l.toLowerCase(), m = zo(y, d, t);
    return `${y}1${Cr.encode(d)}${m}`;
  }
  function c(l, d = 90) {
    ce("bech32.decode input", l);
    const h = l.length;
    if (h < 8 || d !== !1 && h > d)
      throw new TypeError(`invalid string length: ${h} (${l}). Expected (8..${d})`);
    const g = l.toLowerCase();
    if (l !== g && l !== l.toUpperCase())
      throw new Error("String must be lowercase or uppercase");
    const p = g.lastIndexOf("1");
    if (p === 0 || p === -1)
      throw new Error('Letter "1" must be present between prefix and data only');
    const y = g.slice(0, p), m = g.slice(p + 1);
    if (m.length < 6)
      throw new Error("Data must be at least 6 characters long");
    const b = Cr.decode(m).slice(0, -6), k = zo(y, b, t);
    if (!m.endsWith(k))
      throw new Error(`Invalid checksum in ${l}: expected "${k}"`);
    return { prefix: y, words: b };
  }
  const a = Fo(c);
  function u(l) {
    const { prefix: d, words: h } = c(l, !1);
    return { prefix: d, words: h, bytes: r(h) };
  }
  function f(l, d) {
    return i(l, o(d));
  }
  return {
    encode: i,
    decode: c,
    encodeFromBytes: f,
    decodeToBytes: u,
    decodeUnsafe: a,
    fromWords: r,
    fromWordsUnsafe: s,
    toWords: o
  };
}
const $r = /* @__PURE__ */ qs("bech32"), ve = /* @__PURE__ */ qs("bech32m"), Jc = {
  encode: (e) => new TextDecoder().decode(e),
  decode: (e) => new TextEncoder().encode(e)
}, Qc = typeof Uint8Array.from([]).toHex == "function" && typeof Uint8Array.fromHex == "function", ta = {
  encode(e) {
    return Gs(e), e.toHex();
  },
  decode(e) {
    return ce("hex", e), Uint8Array.fromHex(e);
  }
}, x = Qc ? ta : /* @__PURE__ */ an(/* @__PURE__ */ co(4), /* @__PURE__ */ rr("0123456789abcdef"), /* @__PURE__ */ or(""), /* @__PURE__ */ zc((e) => {
  if (typeof e != "string" || e.length % 2 !== 0)
    throw new TypeError(`hex.decode: expected string, got ${typeof e} with length ${e.length}`);
  return e.toLowerCase();
})), X = /* @__PURE__ */ Uint8Array.of(), Zs = /* @__PURE__ */ Uint8Array.of(0);
function Ne(e, t) {
  if (e.length !== t.length)
    return !1;
  for (let n = 0; n < e.length; n++)
    if (e[n] !== t[n])
      return !1;
  return !0;
}
function It(e) {
  return e instanceof Uint8Array || ArrayBuffer.isView(e) && e.constructor.name === "Uint8Array";
}
function ea(...e) {
  let t = 0;
  for (let r = 0; r < e.length; r++) {
    const o = e[r];
    if (!It(o))
      throw new Error("Uint8Array expected");
    t += o.length;
  }
  const n = new Uint8Array(t);
  for (let r = 0, o = 0; r < e.length; r++) {
    const s = e[r];
    n.set(s, o), o += s.length;
  }
  return n;
}
const Xs = (e) => new DataView(e.buffer, e.byteOffset, e.byteLength);
function un(e) {
  return Object.prototype.toString.call(e) === "[object Object]";
}
function zt(e) {
  return Number.isSafeInteger(e);
}
const ao = {
  equalBytes: Ne,
  isBytes: It,
  concatBytes: ea
}, Js = (e) => {
  if (e !== null && typeof e != "string" && !_t(e) && !It(e) && !zt(e))
    throw new Error(`lengthCoder: expected null | number | Uint8Array | CoderType, got ${e} (${typeof e})`);
  return {
    encodeStream(t, n) {
      if (e === null)
        return;
      if (_t(e))
        return e.encodeStream(t, n);
      let r;
      if (typeof e == "number" ? r = e : typeof e == "string" && (r = Jt.resolve(t.stack, e)), typeof r == "bigint" && (r = Number(r)), r === void 0 || r !== n)
        throw t.err(`Wrong length: ${r} len=${e} exp=${n} (${typeof n})`);
    },
    decodeStream(t) {
      let n;
      if (_t(e) ? n = Number(e.decodeStream(t)) : typeof e == "number" ? n = e : typeof e == "string" && (n = Jt.resolve(t.stack, e)), typeof n == "bigint" && (n = Number(n)), typeof n != "number")
        throw t.err(`Wrong length: ${n}`);
      return n;
    }
  };
}, at = {
  BITS: 32,
  FULL_MASK: -1 >>> 0,
  // 1<<32 will overflow
  len: (e) => Math.ceil(e / 32),
  create: (e) => new Uint32Array(at.len(e)),
  clean: (e) => e.fill(0),
  debug: (e) => Array.from(e).map((t) => (t >>> 0).toString(2).padStart(32, "0")),
  checkLen: (e, t) => {
    if (at.len(t) !== e.length)
      throw new Error(`wrong length=${e.length}. Expected: ${at.len(t)}`);
  },
  chunkLen: (e, t, n) => {
    if (t < 0)
      throw new Error(`wrong pos=${t}`);
    if (t + n > e)
      throw new Error(`wrong range=${t}/${n} of ${e}`);
  },
  set: (e, t, n, r = !0) => !r && (e[t] & n) !== 0 ? !1 : (e[t] |= n, !0),
  pos: (e, t) => ({
    chunk: Math.floor((e + t) / 32),
    mask: 1 << 32 - (e + t) % 32 - 1
  }),
  indices: (e, t, n = !1) => {
    at.checkLen(e, t);
    const { FULL_MASK: r, BITS: o } = at, s = o - t % o, i = s ? r >>> s << s : r, c = [];
    for (let a = 0; a < e.length; a++) {
      let u = e[a];
      if (n && (u = ~u), a === e.length - 1 && (u &= i), u !== 0)
        for (let f = 0; f < o; f++) {
          const l = 1 << o - f - 1;
          u & l && c.push(a * o + f);
        }
    }
    return c;
  },
  range: (e) => {
    const t = [];
    let n;
    for (const r of e)
      n === void 0 || r !== n.pos + n.length ? t.push(n = { pos: r, length: 1 }) : n.length += 1;
    return t;
  },
  rangeDebug: (e, t, n = !1) => `[${at.range(at.indices(e, t, n)).map((r) => `(${r.pos}/${r.length})`).join(", ")}]`,
  setRange: (e, t, n, r, o = !0) => {
    at.chunkLen(t, n, r);
    const { FULL_MASK: s, BITS: i } = at, c = n % i ? Math.floor(n / i) : void 0, a = n + r, u = a % i ? Math.floor(a / i) : void 0;
    if (c !== void 0 && c === u)
      return at.set(e, c, s >>> i - r << i - r - n, o);
    if (c !== void 0 && !at.set(e, c, s >>> n % i, o))
      return !1;
    const f = c !== void 0 ? c + 1 : n / i, l = u !== void 0 ? u : a / i;
    for (let d = f; d < l; d++)
      if (!at.set(e, d, s, o))
        return !1;
    return !(u !== void 0 && c !== u && !at.set(e, u, s << i - a % i, o));
  }
}, Jt = {
  /**
   * Internal method for handling stack of paths (debug, errors, dynamic fields via path)
   * This is looks ugly (callback), but allows us to force stack cleaning by construction (.pop always after function).
   * Also, this makes impossible:
   * - pushing field when stack is empty
   * - pushing field inside of field (real bug)
   * NOTE: we don't want to do '.pop' on error!
   */
  pushObj: (e, t, n) => {
    const r = { obj: t };
    e.push(r), n((o, s) => {
      r.field = o, s(), r.field = void 0;
    }), e.pop();
  },
  path: (e) => {
    const t = [];
    for (const n of e)
      n.field !== void 0 && t.push(n.field);
    return t.join("/");
  },
  err: (e, t, n) => {
    const r = new Error(`${e}(${Jt.path(t)}): ${typeof n == "string" ? n : n.message}`);
    return n instanceof Error && n.stack && (r.stack = n.stack), r;
  },
  resolve: (e, t) => {
    const n = t.split("/"), r = e.map((i) => i.obj);
    let o = 0;
    for (; o < n.length && n[o] === ".."; o++)
      r.pop();
    let s = r.pop();
    for (; o < n.length; o++) {
      if (!s || s[n[o]] === void 0)
        return;
      s = s[n[o]];
    }
    return s;
  }
};
class uo {
  pos = 0;
  data;
  opts;
  stack;
  parent;
  parentOffset;
  bitBuf = 0;
  bitPos = 0;
  bs;
  // bitset
  view;
  constructor(t, n = {}, r = [], o = void 0, s = 0) {
    this.data = t, this.opts = n, this.stack = r, this.parent = o, this.parentOffset = s, this.view = Xs(t);
  }
  /** Internal method for pointers. */
  _enablePointers() {
    if (this.parent)
      return this.parent._enablePointers();
    this.bs || (this.bs = at.create(this.data.length), at.setRange(this.bs, this.data.length, 0, this.pos, this.opts.allowMultipleReads));
  }
  markBytesBS(t, n) {
    return this.parent ? this.parent.markBytesBS(this.parentOffset + t, n) : !n || !this.bs ? !0 : at.setRange(this.bs, this.data.length, t, n, !1);
  }
  markBytes(t) {
    const n = this.pos;
    this.pos += t;
    const r = this.markBytesBS(n, t);
    if (!this.opts.allowMultipleReads && !r)
      throw this.err(`multiple read pos=${this.pos} len=${t}`);
    return r;
  }
  pushObj(t, n) {
    return Jt.pushObj(this.stack, t, n);
  }
  readView(t, n) {
    if (!Number.isFinite(t))
      throw this.err(`readView: wrong length=${t}`);
    if (this.pos + t > this.data.length)
      throw this.err("readView: Unexpected end of buffer");
    const r = n(this.view, this.pos);
    return this.markBytes(t), r;
  }
  // read bytes by absolute offset
  absBytes(t) {
    if (t > this.data.length)
      throw new Error("Unexpected end of buffer");
    return this.data.subarray(t);
  }
  finish() {
    if (!this.opts.allowUnreadBytes) {
      if (this.bitPos)
        throw this.err(`${this.bitPos} bits left after unpack: ${x.encode(this.data.slice(this.pos))}`);
      if (this.bs && !this.parent) {
        const t = at.indices(this.bs, this.data.length, !0);
        if (t.length) {
          const n = at.range(t).map(({ pos: r, length: o }) => `(${r}/${o})[${x.encode(this.data.subarray(r, r + o))}]`).join(", ");
          throw this.err(`unread byte ranges: ${n} (total=${this.data.length})`);
        } else
          return;
      }
      if (!this.isEnd())
        throw this.err(`${this.leftBytes} bytes ${this.bitPos} bits left after unpack: ${x.encode(this.data.slice(this.pos))}`);
    }
  }
  // User methods
  err(t) {
    return Jt.err("Reader", this.stack, t);
  }
  offsetReader(t) {
    if (t > this.data.length)
      throw this.err("offsetReader: Unexpected end of buffer");
    return new uo(this.absBytes(t), this.opts, this.stack, this, t);
  }
  bytes(t, n = !1) {
    if (this.bitPos)
      throw this.err("readBytes: bitPos not empty");
    if (!Number.isFinite(t))
      throw this.err(`readBytes: wrong length=${t}`);
    if (this.pos + t > this.data.length)
      throw this.err("readBytes: Unexpected end of buffer");
    const r = this.data.subarray(this.pos, this.pos + t);
    return n || this.markBytes(t), r;
  }
  byte(t = !1) {
    if (this.bitPos)
      throw this.err("readByte: bitPos not empty");
    if (this.pos + 1 > this.data.length)
      throw this.err("readBytes: Unexpected end of buffer");
    const n = this.data[this.pos];
    return t || this.markBytes(1), n;
  }
  get leftBytes() {
    return this.data.length - this.pos;
  }
  get totalBytes() {
    return this.data.length;
  }
  isEnd() {
    return this.pos >= this.data.length && !this.bitPos;
  }
  // bits are read in BE mode (left to right): (0b1000_0000).readBits(1) == 1
  bits(t) {
    if (t > 32)
      throw this.err("BitReader: cannot read more than 32 bits in single call");
    let n = 0;
    for (; t; ) {
      this.bitPos || (this.bitBuf = this.byte(), this.bitPos = 8);
      const r = Math.min(t, this.bitPos);
      this.bitPos -= r, n = n << r | this.bitBuf >> this.bitPos & 2 ** r - 1, this.bitBuf &= 2 ** this.bitPos - 1, t -= r;
    }
    return n >>> 0;
  }
  find(t, n = this.pos) {
    if (!It(t))
      throw this.err(`find: needle is not bytes! ${t}`);
    if (this.bitPos)
      throw this.err("findByte: bitPos not empty");
    if (!t.length)
      throw this.err("find: needle is empty");
    for (let r = n; (r = this.data.indexOf(t[0], r)) !== -1; r++) {
      if (r === -1 || this.data.length - r < t.length)
        return;
      if (Ne(t, this.data.subarray(r, r + t.length)))
        return r;
    }
  }
}
class na {
  pos = 0;
  stack;
  // We could have a single buffer here and re-alloc it with
  // x1.5-2 size each time it full, but it will be slower:
  // basic/encode bench: 395ns -> 560ns
  buffers = [];
  ptrs = [];
  bitBuf = 0;
  bitPos = 0;
  viewBuf = new Uint8Array(8);
  view;
  finished = !1;
  constructor(t = []) {
    this.stack = t, this.view = Xs(this.viewBuf);
  }
  pushObj(t, n) {
    return Jt.pushObj(this.stack, t, n);
  }
  writeView(t, n) {
    if (this.finished)
      throw this.err("buffer: finished");
    if (!zt(t) || t > 8)
      throw new Error(`wrong writeView length=${t}`);
    n(this.view), this.bytes(this.viewBuf.slice(0, t)), this.viewBuf.fill(0);
  }
  // User methods
  err(t) {
    if (this.finished)
      throw this.err("buffer: finished");
    return Jt.err("Reader", this.stack, t);
  }
  bytes(t) {
    if (this.finished)
      throw this.err("buffer: finished");
    if (this.bitPos)
      throw this.err("writeBytes: ends with non-empty bit buffer");
    this.buffers.push(t), this.pos += t.length;
  }
  byte(t) {
    if (this.finished)
      throw this.err("buffer: finished");
    if (this.bitPos)
      throw this.err("writeByte: ends with non-empty bit buffer");
    this.buffers.push(new Uint8Array([t])), this.pos++;
  }
  finish(t = !0) {
    if (this.finished)
      throw this.err("buffer: finished");
    if (this.bitPos)
      throw this.err("buffer: ends with non-empty bit buffer");
    const n = this.buffers.concat(this.ptrs.map((s) => s.buffer)), r = n.map((s) => s.length).reduce((s, i) => s + i, 0), o = new Uint8Array(r);
    for (let s = 0, i = 0; s < n.length; s++) {
      const c = n[s];
      o.set(c, i), i += c.length;
    }
    for (let s = this.pos, i = 0; i < this.ptrs.length; i++) {
      const c = this.ptrs[i];
      o.set(c.ptr.encode(s), c.pos), s += c.buffer.length;
    }
    if (t) {
      this.buffers = [];
      for (const s of this.ptrs)
        s.buffer.fill(0);
      this.ptrs = [], this.finished = !0, this.bitBuf = 0;
    }
    return o;
  }
  bits(t, n) {
    if (n > 32)
      throw this.err("writeBits: cannot write more than 32 bits in single call");
    if (t >= 2 ** n)
      throw this.err(`writeBits: value (${t}) >= 2**bits (${n})`);
    for (; n; ) {
      const r = Math.min(n, 8 - this.bitPos);
      this.bitBuf = this.bitBuf << r | t >> n - r, this.bitPos += r, n -= r, t &= 2 ** n - 1, this.bitPos === 8 && (this.bitPos = 0, this.buffers.push(new Uint8Array([this.bitBuf])), this.pos++);
    }
  }
}
const Lr = (e) => Uint8Array.from(e).reverse();
function ra(e, t, n) {
  if (n) {
    const r = 2n ** (t - 1n);
    if (e < -r || e >= r)
      throw new Error(`value out of signed bounds. Expected ${-r} <= ${e} < ${r}`);
  } else if (0n > e || e >= 2n ** t)
    throw new Error(`value out of unsigned bounds. Expected 0 <= ${e} < ${2n ** t}`);
}
function Qs(e) {
  return {
    // NOTE: we cannot export validate here, since it is likely mistake.
    encodeStream: e.encodeStream,
    decodeStream: e.decodeStream,
    size: e.size,
    encode: (t) => {
      const n = new na();
      return e.encodeStream(n, t), n.finish();
    },
    decode: (t, n = {}) => {
      const r = new uo(t, n), o = e.decodeStream(r);
      return r.finish(), o;
    }
  };
}
function bt(e, t) {
  if (!_t(e))
    throw new Error(`validate: invalid inner value ${e}`);
  if (typeof t != "function")
    throw new Error("validate: fn should be function");
  return Qs({
    size: e.size,
    encodeStream: (n, r) => {
      let o;
      try {
        o = t(r);
      } catch (s) {
        throw n.err(s);
      }
      e.encodeStream(n, o);
    },
    decodeStream: (n) => {
      const r = e.decodeStream(n);
      try {
        return t(r);
      } catch (o) {
        throw n.err(o);
      }
    }
  });
}
const St = (e) => {
  const t = Qs(e);
  return e.validate ? bt(t, e.validate) : t;
}, sr = (e) => un(e) && typeof e.decode == "function" && typeof e.encode == "function";
function _t(e) {
  return un(e) && sr(e) && typeof e.encodeStream == "function" && typeof e.decodeStream == "function" && (e.size === void 0 || zt(e.size));
}
function oa() {
  return {
    encode: (e) => {
      if (!Array.isArray(e))
        throw new Error("array expected");
      const t = {};
      for (const n of e) {
        if (!Array.isArray(n) || n.length !== 2)
          throw new Error("array of two elements expected");
        const r = n[0], o = n[1];
        if (t[r] !== void 0)
          throw new Error(`key(${r}) appears twice in struct`);
        t[r] = o;
      }
      return t;
    },
    decode: (e) => {
      if (!un(e))
        throw new Error(`expected plain object, got ${e}`);
      return Object.entries(e);
    }
  };
}
const sa = {
  encode: (e) => {
    if (typeof e != "bigint")
      throw new Error(`expected bigint, got ${typeof e}`);
    if (e > BigInt(Number.MAX_SAFE_INTEGER))
      throw new Error(`element bigger than MAX_SAFE_INTEGER=${e}`);
    return Number(e);
  },
  decode: (e) => {
    if (!zt(e))
      throw new Error("element is not a safe integer");
    return BigInt(e);
  }
};
function ia(e) {
  if (!un(e))
    throw new Error("plain object expected");
  return {
    encode: (t) => {
      if (!zt(t) || !(t in e))
        throw new Error(`wrong value ${t}`);
      return e[t];
    },
    decode: (t) => {
      if (typeof t != "string")
        throw new Error(`wrong value ${typeof t}`);
      return e[t];
    }
  };
}
function ca(e, t = !1) {
  if (!zt(e))
    throw new Error(`decimal/precision: wrong value ${e}`);
  if (typeof t != "boolean")
    throw new Error(`decimal/round: expected boolean, got ${typeof t}`);
  const n = 10n ** BigInt(e);
  return {
    encode: (r) => {
      if (typeof r != "bigint")
        throw new Error(`expected bigint, got ${typeof r}`);
      let o = (r < 0n ? -r : r).toString(10), s = o.length - e;
      s < 0 && (o = o.padStart(o.length - s, "0"), s = 0);
      let i = o.length - 1;
      for (; i >= s && o[i] === "0"; i--)
        ;
      let c = o.slice(0, s), a = o.slice(s, i + 1);
      return c || (c = "0"), r < 0n && (c = "-" + c), a ? `${c}.${a}` : c;
    },
    decode: (r) => {
      if (typeof r != "string")
        throw new Error(`expected string, got ${typeof r}`);
      if (r === "-0")
        throw new Error("negative zero is not allowed");
      let o = !1;
      if (r.startsWith("-") && (o = !0, r = r.slice(1)), !/^(0|[1-9]\d*)(\.\d+)?$/.test(r))
        throw new Error(`wrong string value=${r}`);
      let s = r.indexOf(".");
      s = s === -1 ? r.length : s;
      const i = r.slice(0, s), c = r.slice(s + 1).replace(/0+$/, ""), a = BigInt(i) * n;
      if (!t && c.length > e)
        throw new Error(`fractional part cannot be represented with this precision (num=${r}, prec=${e})`);
      const u = Math.min(c.length, e), f = BigInt(c.slice(0, u)) * 10n ** BigInt(e - u), l = a + f;
      return o ? -l : l;
    }
  };
}
function aa(e) {
  if (!Array.isArray(e))
    throw new Error(`expected array, got ${typeof e}`);
  for (const t of e)
    if (!sr(t))
      throw new Error(`wrong base coder ${t}`);
  return {
    encode: (t) => {
      for (const n of e) {
        const r = n.encode(t);
        if (r !== void 0)
          return r;
      }
      throw new Error(`match/encode: cannot find match in ${t}`);
    },
    decode: (t) => {
      for (const n of e) {
        const r = n.decode(t);
        if (r !== void 0)
          return r;
      }
      throw new Error(`match/decode: cannot find match in ${t}`);
    }
  };
}
const ti = (e) => {
  if (!sr(e))
    throw new Error("BaseCoder expected");
  return { encode: e.decode, decode: e.encode };
}, ir = { dict: oa, numberBigint: sa, tsEnum: ia, decimal: ca, match: aa, reverse: ti }, fo = (e, t = !1, n = !1, r = !0) => {
  if (!zt(e))
    throw new Error(`bigint/size: wrong value ${e}`);
  if (typeof t != "boolean")
    throw new Error(`bigint/le: expected boolean, got ${typeof t}`);
  if (typeof n != "boolean")
    throw new Error(`bigint/signed: expected boolean, got ${typeof n}`);
  if (typeof r != "boolean")
    throw new Error(`bigint/sized: expected boolean, got ${typeof r}`);
  const o = BigInt(e), s = 2n ** (8n * o - 1n);
  return St({
    size: r ? e : void 0,
    encodeStream: (i, c) => {
      n && c < 0 && (c = c | s);
      const a = [];
      for (let f = 0; f < e; f++)
        a.push(Number(c & 255n)), c >>= 8n;
      let u = new Uint8Array(a).reverse();
      if (!r) {
        let f = 0;
        for (f = 0; f < u.length && u[f] === 0; f++)
          ;
        u = u.subarray(f);
      }
      i.bytes(t ? u.reverse() : u);
    },
    decodeStream: (i) => {
      const c = i.bytes(r ? e : Math.min(e, i.leftBytes)), a = t ? c : Lr(c);
      let u = 0n;
      for (let f = 0; f < a.length; f++)
        u |= BigInt(a[f]) << 8n * BigInt(f);
      return n && u & s && (u = (u ^ s) - s), u;
    },
    validate: (i) => {
      if (typeof i != "bigint")
        throw new Error(`bigint: invalid value: ${i}`);
      return ra(i, 8n * o, !!n), i;
    }
  });
}, ei = /* @__PURE__ */ fo(32, !1), In = /* @__PURE__ */ fo(8, !0), ua = /* @__PURE__ */ fo(8, !0, !0), fa = (e, t) => St({
  size: e,
  encodeStream: (n, r) => n.writeView(e, (o) => t.write(o, r)),
  decodeStream: (n) => n.readView(e, t.read),
  validate: (n) => {
    if (typeof n != "number")
      throw new Error(`viewCoder: expected number, got ${typeof n}`);
    return t.validate && t.validate(n), n;
  }
}), fn = (e, t, n) => {
  const r = e * 8, o = 2 ** (r - 1), s = (a) => {
    if (!zt(a))
      throw new Error(`sintView: value is not safe integer: ${a}`);
    if (a < -o || a >= o)
      throw new Error(`sintView: value out of bounds. Expected ${-o} <= ${a} < ${o}`);
  }, i = 2 ** r, c = (a) => {
    if (!zt(a))
      throw new Error(`uintView: value is not safe integer: ${a}`);
    if (0 > a || a >= i)
      throw new Error(`uintView: value out of bounds. Expected 0 <= ${a} < ${i}`);
  };
  return fa(e, {
    write: n.write,
    read: n.read,
    validate: t ? s : c
  });
}, W = /* @__PURE__ */ fn(4, !1, {
  read: (e, t) => e.getUint32(t, !0),
  write: (e, t) => e.setUint32(0, t, !0)
}), la = /* @__PURE__ */ fn(4, !1, {
  read: (e, t) => e.getUint32(t, !1),
  write: (e, t) => e.setUint32(0, t, !1)
}), ke = /* @__PURE__ */ fn(4, !0, {
  read: (e, t) => e.getInt32(t, !0),
  write: (e, t) => e.setInt32(0, t, !0)
}), Go = /* @__PURE__ */ fn(2, !1, {
  read: (e, t) => e.getUint16(t, !0),
  write: (e, t) => e.setUint16(0, t, !0)
}), se = /* @__PURE__ */ fn(1, !1, {
  read: (e, t) => e.getUint8(t),
  write: (e, t) => e.setUint8(0, t)
}), Z = (e, t = !1) => {
  if (typeof t != "boolean")
    throw new Error(`bytes/le: expected boolean, got ${typeof t}`);
  const n = Js(e), r = It(e);
  return St({
    size: typeof e == "number" ? e : void 0,
    encodeStream: (o, s) => {
      r || n.encodeStream(o, s.length), o.bytes(t ? Lr(s) : s), r && o.bytes(e);
    },
    decodeStream: (o) => {
      let s;
      if (r) {
        const i = o.find(e);
        if (!i)
          throw o.err("bytes: cannot find terminator");
        s = o.bytes(i - o.pos), o.bytes(e.length);
      } else
        s = o.bytes(e === null ? o.leftBytes : n.decodeStream(o));
      return t ? Lr(s) : s;
    },
    validate: (o) => {
      if (!It(o))
        throw new Error(`bytes: invalid value ${o}`);
      return o;
    }
  });
};
function da(e, t) {
  if (!_t(t))
    throw new Error(`prefix: invalid inner value ${t}`);
  return ae(Z(e), ti(t));
}
const lo = (e, t = !1) => bt(ae(Z(e, t), Jc), (n) => {
  if (typeof n != "string")
    throw new Error(`expected string, got ${typeof n}`);
  return n;
}), ha = (e, t = { isLE: !1, with0x: !1 }) => {
  let n = ae(Z(e, t.isLE), x);
  const r = t.with0x;
  if (typeof r != "boolean")
    throw new Error(`hex/with0x: expected boolean, got ${typeof r}`);
  return r && (n = ae(n, {
    encode: (o) => `0x${o}`,
    decode: (o) => {
      if (!o.startsWith("0x"))
        throw new Error("hex(with0x=true).encode input should start with 0x");
      return o.slice(2);
    }
  })), n;
};
function ae(e, t) {
  if (!_t(e))
    throw new Error(`apply: invalid inner value ${e}`);
  if (!sr(t))
    throw new Error(`apply: invalid base value ${e}`);
  return St({
    size: e.size,
    encodeStream: (n, r) => {
      let o;
      try {
        o = t.decode(r);
      } catch (s) {
        throw n.err("" + s);
      }
      return e.encodeStream(n, o);
    },
    decodeStream: (n) => {
      const r = e.decodeStream(n);
      try {
        return t.encode(r);
      } catch (o) {
        throw n.err("" + o);
      }
    }
  });
}
const pa = (e, t = !1) => {
  if (!It(e))
    throw new Error(`flag/flagValue: expected Uint8Array, got ${typeof e}`);
  if (typeof t != "boolean")
    throw new Error(`flag/xor: expected boolean, got ${typeof t}`);
  return St({
    size: e.length,
    encodeStream: (n, r) => {
      !!r !== t && n.bytes(e);
    },
    decodeStream: (n) => {
      let r = n.leftBytes >= e.length;
      return r && (r = Ne(n.bytes(e.length, !0), e), r && n.bytes(e.length)), r !== t;
    },
    validate: (n) => {
      if (n !== void 0 && typeof n != "boolean")
        throw new Error(`flag: expected boolean value or undefined, got ${typeof n}`);
      return n;
    }
  });
};
function ga(e, t, n) {
  if (!_t(t))
    throw new Error(`flagged: invalid inner value ${t}`);
  return St({
    encodeStream: (r, o) => {
      Jt.resolve(r.stack, e) && t.encodeStream(r, o);
    },
    decodeStream: (r) => {
      let o = !1;
      if (o = !!Jt.resolve(r.stack, e), o)
        return t.decodeStream(r);
    }
  });
}
function ho(e, t, n = !0) {
  if (!_t(e))
    throw new Error(`magic: invalid inner value ${e}`);
  if (typeof n != "boolean")
    throw new Error(`magic: expected boolean, got ${typeof n}`);
  return St({
    size: e.size,
    encodeStream: (r, o) => e.encodeStream(r, t),
    decodeStream: (r) => {
      const o = e.decodeStream(r);
      if (n && typeof o != "object" && o !== t || It(t) && !Ne(t, o))
        throw r.err(`magic: invalid value: ${o} !== ${t}`);
    },
    validate: (r) => {
      if (r !== void 0)
        throw new Error(`magic: wrong value=${typeof r}`);
      return r;
    }
  });
}
function ni(e) {
  let t = 0;
  for (const n of e) {
    if (n.size === void 0)
      return;
    if (!zt(n.size))
      throw new Error(`sizeof: wrong element size=${t}`);
    t += n.size;
  }
  return t;
}
function ut(e) {
  if (!un(e))
    throw new Error(`struct: expected plain object, got ${e}`);
  for (const t in e)
    if (!_t(e[t]))
      throw new Error(`struct: field ${t} is not CoderType`);
  return St({
    size: ni(Object.values(e)),
    encodeStream: (t, n) => {
      t.pushObj(n, (r) => {
        for (const o in e)
          r(o, () => e[o].encodeStream(t, n[o]));
      });
    },
    decodeStream: (t) => {
      const n = {};
      return t.pushObj(n, (r) => {
        for (const o in e)
          r(o, () => n[o] = e[o].decodeStream(t));
      }), n;
    },
    validate: (t) => {
      if (typeof t != "object" || t === null)
        throw new Error(`struct: invalid value ${t}`);
      return t;
    }
  });
}
function wa(e) {
  if (!Array.isArray(e))
    throw new Error(`Packed.Tuple: got ${typeof e} instead of array`);
  for (let t = 0; t < e.length; t++)
    if (!_t(e[t]))
      throw new Error(`tuple: field ${t} is not CoderType`);
  return St({
    size: ni(e),
    encodeStream: (t, n) => {
      if (!Array.isArray(n))
        throw t.err(`tuple: invalid value ${n}`);
      t.pushObj(n, (r) => {
        for (let o = 0; o < e.length; o++)
          r(`${o}`, () => e[o].encodeStream(t, n[o]));
      });
    },
    decodeStream: (t) => {
      const n = [];
      return t.pushObj(n, (r) => {
        for (let o = 0; o < e.length; o++)
          r(`${o}`, () => n.push(e[o].decodeStream(t)));
      }), n;
    },
    validate: (t) => {
      if (!Array.isArray(t))
        throw new Error(`tuple: invalid value ${t}`);
      if (t.length !== e.length)
        throw new Error(`tuple: wrong length=${t.length}, expected ${e.length}`);
      return t;
    }
  });
}
function xt(e, t) {
  if (!_t(t))
    throw new Error(`array: invalid inner value ${t}`);
  const n = Js(typeof e == "string" ? `../${e}` : e);
  return St({
    size: typeof e == "number" && t.size ? e * t.size : void 0,
    encodeStream: (r, o) => {
      const s = r;
      s.pushObj(o, (i) => {
        It(e) || n.encodeStream(r, o.length);
        for (let c = 0; c < o.length; c++)
          i(`${c}`, () => {
            const a = o[c], u = r.pos;
            if (t.encodeStream(r, a), It(e)) {
              if (e.length > s.pos - u)
                return;
              const f = s.finish(!1).subarray(u, s.pos);
              if (Ne(f.subarray(0, e.length), e))
                throw s.err(`array: inner element encoding same as separator. elm=${a} data=${f}`);
            }
          });
      }), It(e) && r.bytes(e);
    },
    decodeStream: (r) => {
      const o = [];
      return r.pushObj(o, (s) => {
        if (e === null)
          for (let i = 0; !r.isEnd() && (s(`${i}`, () => o.push(t.decodeStream(r))), !(t.size && r.leftBytes < t.size)); i++)
            ;
        else if (It(e))
          for (let i = 0; ; i++) {
            if (Ne(r.bytes(e.length, !0), e)) {
              r.bytes(e.length);
              break;
            }
            s(`${i}`, () => o.push(t.decodeStream(r)));
          }
        else {
          let i;
          s("arrayLen", () => i = n.decodeStream(r));
          for (let c = 0; c < i; c++)
            s(`${c}`, () => o.push(t.decodeStream(r)));
        }
      }), o;
    },
    validate: (r) => {
      if (!Array.isArray(r))
        throw new Error(`array: invalid value ${r}`);
      return r;
    }
  });
}
/*! noble-hashes - MIT License (c) 2022 Paul Miller (paulmillr.com) */
function po(e) {
  return e instanceof Uint8Array || ArrayBuffer.isView(e) && e.constructor.name === "Uint8Array";
}
function ue(e, t = "") {
  if (!Number.isSafeInteger(e) || e < 0) {
    const n = t && `"${t}" `;
    throw new Error(`${n}expected integer >0, got ${e}`);
  }
}
function D(e, t, n = "") {
  const r = po(e), o = e?.length, s = t !== void 0;
  if (!r || s && o !== t) {
    const i = n && `"${n}" `, c = s ? ` of length ${t}` : "", a = r ? `length=${o}` : `type=${typeof e}`;
    throw new Error(i + "expected Uint8Array" + c + ", got " + a);
  }
  return e;
}
function ri(e) {
  if (typeof e != "function" || typeof e.create != "function")
    throw new Error("Hash must wrapped by utils.createHasher");
  ue(e.outputLen), ue(e.blockLen);
}
function Rn(e, t = !0) {
  if (e.destroyed)
    throw new Error("Hash instance has been destroyed");
  if (t && e.finished)
    throw new Error("Hash#digest() has already been called");
}
function ya(e, t) {
  D(e, void 0, "digestInto() output");
  const n = t.outputLen;
  if (e.length < n)
    throw new Error('"digestInto() output" expected to be of length >=' + n);
}
function Ce(...e) {
  for (let t = 0; t < e.length; t++)
    e[t].fill(0);
}
function pr(e) {
  return new DataView(e.buffer, e.byteOffset, e.byteLength);
}
function Kt(e, t) {
  return e << 32 - t | e >>> t;
}
function wn(e, t) {
  return e << t | e >>> 32 - t >>> 0;
}
const oi = /* @ts-ignore */ typeof Uint8Array.from([]).toHex == "function" && typeof Uint8Array.fromHex == "function", ma = /* @__PURE__ */ Array.from({ length: 256 }, (e, t) => t.toString(16).padStart(2, "0"));
function cr(e) {
  if (D(e), oi)
    return e.toHex();
  let t = "";
  for (let n = 0; n < e.length; n++)
    t += ma[e[n]];
  return t;
}
const qt = { _0: 48, _9: 57, A: 65, F: 70, a: 97, f: 102 };
function jo(e) {
  if (e >= qt._0 && e <= qt._9)
    return e - qt._0;
  if (e >= qt.A && e <= qt.F)
    return e - (qt.A - 10);
  if (e >= qt.a && e <= qt.f)
    return e - (qt.a - 10);
}
function Pn(e) {
  if (typeof e != "string")
    throw new Error("hex string expected, got " + typeof e);
  if (oi)
    return Uint8Array.fromHex(e);
  const t = e.length, n = t / 2;
  if (t % 2)
    throw new Error("hex string expected, got unpadded hex of length " + t);
  const r = new Uint8Array(n);
  for (let o = 0, s = 0; o < n; o++, s += 2) {
    const i = jo(e.charCodeAt(s)), c = jo(e.charCodeAt(s + 1));
    if (i === void 0 || c === void 0) {
      const a = e[s] + e[s + 1];
      throw new Error('hex string expected, got non-hex character "' + a + '" at index ' + s);
    }
    r[o] = i * 16 + c;
  }
  return r;
}
function Rt(...e) {
  let t = 0;
  for (let r = 0; r < e.length; r++) {
    const o = e[r];
    D(o), t += o.length;
  }
  const n = new Uint8Array(t);
  for (let r = 0, o = 0; r < e.length; r++) {
    const s = e[r];
    n.set(s, o), o += s.length;
  }
  return n;
}
function si(e, t = {}) {
  const n = (o, s) => e(s).update(o).digest(), r = e(void 0);
  return n.outputLen = r.outputLen, n.blockLen = r.blockLen, n.create = (o) => e(o), Object.assign(n, t), Object.freeze(n);
}
function ln(e = 32) {
  const t = typeof globalThis == "object" ? globalThis.crypto : null;
  if (typeof t?.getRandomValues != "function")
    throw new Error("crypto.getRandomValues must be defined");
  return t.getRandomValues(new Uint8Array(e));
}
const Ea = (e) => ({
  oid: Uint8Array.from([6, 9, 96, 134, 72, 1, 101, 3, 4, 2, e])
});
function xa(e, t, n) {
  return e & t ^ ~e & n;
}
function ba(e, t, n) {
  return e & t ^ e & n ^ t & n;
}
class ii {
  blockLen;
  outputLen;
  padOffset;
  isLE;
  // For partial updates less than block size
  buffer;
  view;
  finished = !1;
  length = 0;
  pos = 0;
  destroyed = !1;
  constructor(t, n, r, o) {
    this.blockLen = t, this.outputLen = n, this.padOffset = r, this.isLE = o, this.buffer = new Uint8Array(t), this.view = pr(this.buffer);
  }
  update(t) {
    Rn(this), D(t);
    const { view: n, buffer: r, blockLen: o } = this, s = t.length;
    for (let i = 0; i < s; ) {
      const c = Math.min(o - this.pos, s - i);
      if (c === o) {
        const a = pr(t);
        for (; o <= s - i; i += o)
          this.process(a, i);
        continue;
      }
      r.set(t.subarray(i, i + c), this.pos), this.pos += c, i += c, this.pos === o && (this.process(n, 0), this.pos = 0);
    }
    return this.length += t.length, this.roundClean(), this;
  }
  digestInto(t) {
    Rn(this), ya(t, this), this.finished = !0;
    const { buffer: n, view: r, blockLen: o, isLE: s } = this;
    let { pos: i } = this;
    n[i++] = 128, Ce(this.buffer.subarray(i)), this.padOffset > o - i && (this.process(r, 0), i = 0);
    for (let l = i; l < o; l++)
      n[l] = 0;
    r.setBigUint64(o - 8, BigInt(this.length * 8), s), this.process(r, 0);
    const c = pr(t), a = this.outputLen;
    if (a % 4)
      throw new Error("_sha2: outputLen must be aligned to 32bit");
    const u = a / 4, f = this.get();
    if (u > f.length)
      throw new Error("_sha2: outputLen bigger than state");
    for (let l = 0; l < u; l++)
      c.setUint32(4 * l, f[l], s);
  }
  digest() {
    const { buffer: t, outputLen: n } = this;
    this.digestInto(t);
    const r = t.slice(0, n);
    return this.destroy(), r;
  }
  _cloneInto(t) {
    t ||= new this.constructor(), t.set(...this.get());
    const { blockLen: n, buffer: r, length: o, finished: s, destroyed: i, pos: c } = this;
    return t.destroyed = i, t.finished = s, t.length = o, t.pos = c, o % n && t.buffer.set(r), t;
  }
  clone() {
    return this._cloneInto();
  }
}
const te = /* @__PURE__ */ Uint32Array.from([
  1779033703,
  3144134277,
  1013904242,
  2773480762,
  1359893119,
  2600822924,
  528734635,
  1541459225
]), Sa = /* @__PURE__ */ Uint32Array.from([
  1116352408,
  1899447441,
  3049323471,
  3921009573,
  961987163,
  1508970993,
  2453635748,
  2870763221,
  3624381080,
  310598401,
  607225278,
  1426881987,
  1925078388,
  2162078206,
  2614888103,
  3248222580,
  3835390401,
  4022224774,
  264347078,
  604807628,
  770255983,
  1249150122,
  1555081692,
  1996064986,
  2554220882,
  2821834349,
  2952996808,
  3210313671,
  3336571891,
  3584528711,
  113926993,
  338241895,
  666307205,
  773529912,
  1294757372,
  1396182291,
  1695183700,
  1986661051,
  2177026350,
  2456956037,
  2730485921,
  2820302411,
  3259730800,
  3345764771,
  3516065817,
  3600352804,
  4094571909,
  275423344,
  430227734,
  506948616,
  659060556,
  883997877,
  958139571,
  1322822218,
  1537002063,
  1747873779,
  1955562222,
  2024104815,
  2227730452,
  2361852424,
  2428436474,
  2756734187,
  3204031479,
  3329325298
]), ee = /* @__PURE__ */ new Uint32Array(64);
class Ta extends ii {
  constructor(t) {
    super(64, t, 8, !1);
  }
  get() {
    const { A: t, B: n, C: r, D: o, E: s, F: i, G: c, H: a } = this;
    return [t, n, r, o, s, i, c, a];
  }
  // prettier-ignore
  set(t, n, r, o, s, i, c, a) {
    this.A = t | 0, this.B = n | 0, this.C = r | 0, this.D = o | 0, this.E = s | 0, this.F = i | 0, this.G = c | 0, this.H = a | 0;
  }
  process(t, n) {
    for (let l = 0; l < 16; l++, n += 4)
      ee[l] = t.getUint32(n, !1);
    for (let l = 16; l < 64; l++) {
      const d = ee[l - 15], h = ee[l - 2], g = Kt(d, 7) ^ Kt(d, 18) ^ d >>> 3, p = Kt(h, 17) ^ Kt(h, 19) ^ h >>> 10;
      ee[l] = p + ee[l - 7] + g + ee[l - 16] | 0;
    }
    let { A: r, B: o, C: s, D: i, E: c, F: a, G: u, H: f } = this;
    for (let l = 0; l < 64; l++) {
      const d = Kt(c, 6) ^ Kt(c, 11) ^ Kt(c, 25), h = f + d + xa(c, a, u) + Sa[l] + ee[l] | 0, p = (Kt(r, 2) ^ Kt(r, 13) ^ Kt(r, 22)) + ba(r, o, s) | 0;
      f = u, u = a, a = c, c = i + h | 0, i = s, s = o, o = r, r = h + p | 0;
    }
    r = r + this.A | 0, o = o + this.B | 0, s = s + this.C | 0, i = i + this.D | 0, c = c + this.E | 0, a = a + this.F | 0, u = u + this.G | 0, f = f + this.H | 0, this.set(r, o, s, i, c, a, u, f);
  }
  roundClean() {
    Ce(ee);
  }
  destroy() {
    this.set(0, 0, 0, 0, 0, 0, 0, 0), Ce(this.buffer);
  }
}
class va extends Ta {
  // We cannot use array here since array allows indexing by variable
  // which means optimizer/compiler cannot use registers.
  A = te[0] | 0;
  B = te[1] | 0;
  C = te[2] | 0;
  D = te[3] | 0;
  E = te[4] | 0;
  F = te[5] | 0;
  G = te[6] | 0;
  H = te[7] | 0;
  constructor() {
    super(32);
  }
}
const dt = /* @__PURE__ */ si(
  () => new va(),
  /* @__PURE__ */ Ea(1)
);
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const go = /* @__PURE__ */ BigInt(0), Rr = /* @__PURE__ */ BigInt(1);
function _n(e, t = "") {
  if (typeof e != "boolean") {
    const n = t && `"${t}" `;
    throw new Error(n + "expected boolean, got type=" + typeof e);
  }
  return e;
}
function ci(e) {
  if (typeof e == "bigint") {
    if (!Bn(e))
      throw new Error("positive bigint expected, got " + e);
  } else
    ue(e);
  return e;
}
function yn(e) {
  const t = ci(e).toString(16);
  return t.length & 1 ? "0" + t : t;
}
function ai(e) {
  if (typeof e != "string")
    throw new Error("hex string expected, got " + typeof e);
  return e === "" ? go : BigInt("0x" + e);
}
function Yt(e) {
  return ai(cr(e));
}
function ui(e) {
  return ai(cr(ka(D(e)).reverse()));
}
function dn(e, t) {
  ue(t), e = ci(e);
  const n = Pn(e.toString(16).padStart(t * 2, "0"));
  if (n.length !== t)
    throw new Error("number too large");
  return n;
}
function fi(e, t) {
  return dn(e, t).reverse();
}
function tn(e, t) {
  if (e.length !== t.length)
    return !1;
  let n = 0;
  for (let r = 0; r < e.length; r++)
    n |= e[r] ^ t[r];
  return n === 0;
}
function ka(e) {
  return Uint8Array.from(e);
}
function Aa(e) {
  return Uint8Array.from(e, (t, n) => {
    const r = t.charCodeAt(0);
    if (t.length !== 1 || r > 127)
      throw new Error(`string contains non-ASCII character "${e[n]}" with code ${r} at position ${n}`);
    return r;
  });
}
const Bn = (e) => typeof e == "bigint" && go <= e;
function Ia(e, t, n) {
  return Bn(e) && Bn(t) && Bn(n) && t <= e && e < n;
}
function li(e, t, n, r) {
  if (!Ia(t, n, r))
    throw new Error("expected valid " + e + ": " + n + " <= n < " + r + ", got " + t);
}
function Ba(e) {
  let t;
  for (t = 0; e > go; e >>= Rr, t += 1)
    ;
  return t;
}
const wo = (e) => (Rr << BigInt(e)) - Rr;
function Oa(e, t, n) {
  if (ue(e, "hashLen"), ue(t, "qByteLen"), typeof n != "function")
    throw new Error("hmacFn must be a function");
  const r = (y) => new Uint8Array(y), o = Uint8Array.of(), s = Uint8Array.of(0), i = Uint8Array.of(1), c = 1e3;
  let a = r(e), u = r(e), f = 0;
  const l = () => {
    a.fill(1), u.fill(0), f = 0;
  }, d = (...y) => n(u, Rt(a, ...y)), h = (y = o) => {
    u = d(s, y), a = d(), y.length !== 0 && (u = d(i, y), a = d());
  }, g = () => {
    if (f++ >= c)
      throw new Error("drbg: tried max amount of iterations");
    let y = 0;
    const m = [];
    for (; y < t; ) {
      a = d();
      const b = a.slice();
      m.push(b), y += a.length;
    }
    return Rt(...m);
  };
  return (y, m) => {
    l(), h(y);
    let b;
    for (; !(b = m(g())); )
      h();
    return l(), b;
  };
}
function yo(e, t = {}, n = {}) {
  if (!e || typeof e != "object")
    throw new Error("expected valid options object");
  function r(s, i, c) {
    const a = e[s];
    if (c && a === void 0)
      return;
    const u = typeof a;
    if (u !== i || a === null)
      throw new Error(`param "${s}" is invalid: expected ${i}, got ${u}`);
  }
  const o = (s, i) => Object.entries(s).forEach(([c, a]) => r(c, a, i));
  o(t, !1), o(n, !0);
}
function Yo(e) {
  const t = /* @__PURE__ */ new WeakMap();
  return (n, ...r) => {
    const o = t.get(n);
    if (o !== void 0)
      return o;
    const s = e(n, ...r);
    return t.set(n, s), s;
  };
}
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const Et = /* @__PURE__ */ BigInt(0), yt = /* @__PURE__ */ BigInt(1), he = /* @__PURE__ */ BigInt(2), di = /* @__PURE__ */ BigInt(3), hi = /* @__PURE__ */ BigInt(4), pi = /* @__PURE__ */ BigInt(5), Ua = /* @__PURE__ */ BigInt(7), gi = /* @__PURE__ */ BigInt(8), Na = /* @__PURE__ */ BigInt(9), wi = /* @__PURE__ */ BigInt(16);
function Ct(e, t) {
  const n = e % t;
  return n >= Et ? n : t + n;
}
function kt(e, t, n) {
  let r = e;
  for (; t-- > Et; )
    r *= r, r %= n;
  return r;
}
function qo(e, t) {
  if (e === Et)
    throw new Error("invert: expected non-zero number");
  if (t <= Et)
    throw new Error("invert: expected positive modulus, got " + t);
  let n = Ct(e, t), r = t, o = Et, s = yt;
  for (; n !== Et; ) {
    const c = r / n, a = r % n, u = o - s * c;
    r = n, n = a, o = s, s = u;
  }
  if (r !== yt)
    throw new Error("invert: does not exist");
  return Ct(o, t);
}
function mo(e, t, n) {
  if (!e.eql(e.sqr(t), n))
    throw new Error("Cannot find square root");
}
function yi(e, t) {
  const n = (e.ORDER + yt) / hi, r = e.pow(t, n);
  return mo(e, r, t), r;
}
function Ca(e, t) {
  const n = (e.ORDER - pi) / gi, r = e.mul(t, he), o = e.pow(r, n), s = e.mul(t, o), i = e.mul(e.mul(s, he), o), c = e.mul(s, e.sub(i, e.ONE));
  return mo(e, c, t), c;
}
function $a(e) {
  const t = ar(e), n = mi(e), r = n(t, t.neg(t.ONE)), o = n(t, r), s = n(t, t.neg(r)), i = (e + Ua) / wi;
  return (c, a) => {
    let u = c.pow(a, i), f = c.mul(u, r);
    const l = c.mul(u, o), d = c.mul(u, s), h = c.eql(c.sqr(f), a), g = c.eql(c.sqr(l), a);
    u = c.cmov(u, f, h), f = c.cmov(d, l, g);
    const p = c.eql(c.sqr(f), a), y = c.cmov(u, f, p);
    return mo(c, y, a), y;
  };
}
function mi(e) {
  if (e < di)
    throw new Error("sqrt is not defined for small field");
  let t = e - yt, n = 0;
  for (; t % he === Et; )
    t /= he, n++;
  let r = he;
  const o = ar(e);
  for (; Zo(o, r) === 1; )
    if (r++ > 1e3)
      throw new Error("Cannot find square root: probably non-prime P");
  if (n === 1)
    return yi;
  let s = o.pow(r, t);
  const i = (t + yt) / he;
  return function(a, u) {
    if (a.is0(u))
      return u;
    if (Zo(a, u) !== 1)
      throw new Error("Cannot find square root");
    let f = n, l = a.mul(a.ONE, s), d = a.pow(u, t), h = a.pow(u, i);
    for (; !a.eql(d, a.ONE); ) {
      if (a.is0(d))
        return a.ZERO;
      let g = 1, p = a.sqr(d);
      for (; !a.eql(p, a.ONE); )
        if (g++, p = a.sqr(p), g === f)
          throw new Error("Cannot find square root");
      const y = yt << BigInt(f - g - 1), m = a.pow(l, y);
      f = g, l = a.sqr(m), d = a.mul(d, l), h = a.mul(h, m);
    }
    return h;
  };
}
function La(e) {
  return e % hi === di ? yi : e % gi === pi ? Ca : e % wi === Na ? $a(e) : mi(e);
}
const Ra = [
  "create",
  "isValid",
  "is0",
  "neg",
  "inv",
  "sqrt",
  "sqr",
  "eql",
  "add",
  "sub",
  "mul",
  "pow",
  "div",
  "addN",
  "subN",
  "mulN",
  "sqrN"
];
function Pa(e) {
  const t = {
    ORDER: "bigint",
    BYTES: "number",
    BITS: "number"
  }, n = Ra.reduce((r, o) => (r[o] = "function", r), t);
  return yo(e, n), e;
}
function _a(e, t, n) {
  if (n < Et)
    throw new Error("invalid exponent, negatives unsupported");
  if (n === Et)
    return e.ONE;
  if (n === yt)
    return t;
  let r = e.ONE, o = t;
  for (; n > Et; )
    n & yt && (r = e.mul(r, o)), o = e.sqr(o), n >>= yt;
  return r;
}
function Ei(e, t, n = !1) {
  const r = new Array(t.length).fill(n ? e.ZERO : void 0), o = t.reduce((i, c, a) => e.is0(c) ? i : (r[a] = i, e.mul(i, c)), e.ONE), s = e.inv(o);
  return t.reduceRight((i, c, a) => e.is0(c) ? i : (r[a] = e.mul(i, r[a]), e.mul(i, c)), s), r;
}
function Zo(e, t) {
  const n = (e.ORDER - yt) / he, r = e.pow(t, n), o = e.eql(r, e.ONE), s = e.eql(r, e.ZERO), i = e.eql(r, e.neg(e.ONE));
  if (!o && !s && !i)
    throw new Error("invalid Legendre symbol result");
  return o ? 1 : s ? 0 : -1;
}
function Va(e, t) {
  t !== void 0 && ue(t);
  const n = t !== void 0 ? t : e.toString(2).length, r = Math.ceil(n / 8);
  return { nBitLength: n, nByteLength: r };
}
class Ha {
  ORDER;
  BITS;
  BYTES;
  isLE;
  ZERO = Et;
  ONE = yt;
  _lengths;
  _sqrt;
  // cached sqrt
  _mod;
  constructor(t, n = {}) {
    if (t <= Et)
      throw new Error("invalid field: expected ORDER > 0, got " + t);
    let r;
    this.isLE = !1, n != null && typeof n == "object" && (typeof n.BITS == "number" && (r = n.BITS), typeof n.sqrt == "function" && (this.sqrt = n.sqrt), typeof n.isLE == "boolean" && (this.isLE = n.isLE), n.allowedLengths && (this._lengths = n.allowedLengths?.slice()), typeof n.modFromBytes == "boolean" && (this._mod = n.modFromBytes));
    const { nBitLength: o, nByteLength: s } = Va(t, r);
    if (s > 2048)
      throw new Error("invalid field: expected ORDER of <= 2048 bytes");
    this.ORDER = t, this.BITS = o, this.BYTES = s, this._sqrt = void 0, Object.preventExtensions(this);
  }
  create(t) {
    return Ct(t, this.ORDER);
  }
  isValid(t) {
    if (typeof t != "bigint")
      throw new Error("invalid field element: expected bigint, got " + typeof t);
    return Et <= t && t < this.ORDER;
  }
  is0(t) {
    return t === Et;
  }
  // is valid and invertible
  isValidNot0(t) {
    return !this.is0(t) && this.isValid(t);
  }
  isOdd(t) {
    return (t & yt) === yt;
  }
  neg(t) {
    return Ct(-t, this.ORDER);
  }
  eql(t, n) {
    return t === n;
  }
  sqr(t) {
    return Ct(t * t, this.ORDER);
  }
  add(t, n) {
    return Ct(t + n, this.ORDER);
  }
  sub(t, n) {
    return Ct(t - n, this.ORDER);
  }
  mul(t, n) {
    return Ct(t * n, this.ORDER);
  }
  pow(t, n) {
    return _a(this, t, n);
  }
  div(t, n) {
    return Ct(t * qo(n, this.ORDER), this.ORDER);
  }
  // Same as above, but doesn't normalize
  sqrN(t) {
    return t * t;
  }
  addN(t, n) {
    return t + n;
  }
  subN(t, n) {
    return t - n;
  }
  mulN(t, n) {
    return t * n;
  }
  inv(t) {
    return qo(t, this.ORDER);
  }
  sqrt(t) {
    return this._sqrt || (this._sqrt = La(this.ORDER)), this._sqrt(this, t);
  }
  toBytes(t) {
    return this.isLE ? fi(t, this.BYTES) : dn(t, this.BYTES);
  }
  fromBytes(t, n = !1) {
    D(t);
    const { _lengths: r, BYTES: o, isLE: s, ORDER: i, _mod: c } = this;
    if (r) {
      if (!r.includes(t.length) || t.length > o)
        throw new Error("Field.fromBytes: expected " + r + " bytes, got " + t.length);
      const u = new Uint8Array(o);
      u.set(t, s ? 0 : u.length - t.length), t = u;
    }
    if (t.length !== o)
      throw new Error("Field.fromBytes: expected " + o + " bytes, got " + t.length);
    let a = s ? ui(t) : Yt(t);
    if (c && (a = Ct(a, i)), !n && !this.isValid(a))
      throw new Error("invalid field element: outside of range 0..ORDER");
    return a;
  }
  // TODO: we don't need it here, move out to separate fn
  invertBatch(t) {
    return Ei(this, t);
  }
  // We can't move this out because Fp6, Fp12 implement it
  // and it's unclear what to return in there.
  cmov(t, n, r) {
    return r ? n : t;
  }
}
function ar(e, t = {}) {
  return new Ha(e, t);
}
function xi(e) {
  if (typeof e != "bigint")
    throw new Error("field order must be bigint");
  const t = e.toString(2).length;
  return Math.ceil(t / 8);
}
function bi(e) {
  const t = xi(e);
  return t + Math.ceil(t / 2);
}
function Si(e, t, n = !1) {
  D(e);
  const r = e.length, o = xi(t), s = bi(t);
  if (r < 16 || r < s || r > 1024)
    throw new Error("expected " + s + "-1024 bytes of input, got " + r);
  const i = n ? ui(e) : Yt(e), c = Ct(i, t - yt) + yt;
  return n ? fi(c, o) : dn(c, o);
}
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const $e = /* @__PURE__ */ BigInt(0), pe = /* @__PURE__ */ BigInt(1);
function Vn(e, t) {
  const n = t.negate();
  return e ? n : t;
}
function Xo(e, t) {
  const n = Ei(e.Fp, t.map((r) => r.Z));
  return t.map((r, o) => e.fromAffine(r.toAffine(n[o])));
}
function Ti(e, t) {
  if (!Number.isSafeInteger(e) || e <= 0 || e > t)
    throw new Error("invalid window size, expected [1.." + t + "], got W=" + e);
}
function gr(e, t) {
  Ti(e, t);
  const n = Math.ceil(t / e) + 1, r = 2 ** (e - 1), o = 2 ** e, s = wo(e), i = BigInt(e);
  return { windows: n, windowSize: r, mask: s, maxNumber: o, shiftBy: i };
}
function Jo(e, t, n) {
  const { windowSize: r, mask: o, maxNumber: s, shiftBy: i } = n;
  let c = Number(e & o), a = e >> i;
  c > r && (c -= s, a += pe);
  const u = t * r, f = u + Math.abs(c) - 1, l = c === 0, d = c < 0, h = t % 2 !== 0;
  return { nextN: a, offset: f, isZero: l, isNeg: d, isNegF: h, offsetF: u };
}
const wr = /* @__PURE__ */ new WeakMap(), vi = /* @__PURE__ */ new WeakMap();
function yr(e) {
  return vi.get(e) || 1;
}
function Qo(e) {
  if (e !== $e)
    throw new Error("invalid wNAF");
}
let Da = class {
  BASE;
  ZERO;
  Fn;
  bits;
  // Parametrized with a given Point class (not individual point)
  constructor(t, n) {
    this.BASE = t.BASE, this.ZERO = t.ZERO, this.Fn = t.Fn, this.bits = n;
  }
  // non-const time multiplication ladder
  _unsafeLadder(t, n, r = this.ZERO) {
    let o = t;
    for (; n > $e; )
      n & pe && (r = r.add(o)), o = o.double(), n >>= pe;
    return r;
  }
  /**
   * Creates a wNAF precomputation window. Used for caching.
   * Default window size is set by `utils.precompute()` and is equal to 8.
   * Number of precomputed points depends on the curve size:
   * 2^(𝑊−1) * (Math.ceil(𝑛 / 𝑊) + 1), where:
   * - 𝑊 is the window size
   * - 𝑛 is the bitlength of the curve order.
   * For a 256-bit curve and window size 8, the number of precomputed points is 128 * 33 = 4224.
   * @param point Point instance
   * @param W window size
   * @returns precomputed point tables flattened to a single array
   */
  precomputeWindow(t, n) {
    const { windows: r, windowSize: o } = gr(n, this.bits), s = [];
    let i = t, c = i;
    for (let a = 0; a < r; a++) {
      c = i, s.push(c);
      for (let u = 1; u < o; u++)
        c = c.add(i), s.push(c);
      i = c.double();
    }
    return s;
  }
  /**
   * Implements ec multiplication using precomputed tables and w-ary non-adjacent form.
   * More compact implementation:
   * https://github.com/paulmillr/noble-secp256k1/blob/47cb1669b6e506ad66b35fe7d76132ae97465da2/index.ts#L502-L541
   * @returns real and fake (for const-time) points
   */
  wNAF(t, n, r) {
    if (!this.Fn.isValid(r))
      throw new Error("invalid scalar");
    let o = this.ZERO, s = this.BASE;
    const i = gr(t, this.bits);
    for (let c = 0; c < i.windows; c++) {
      const { nextN: a, offset: u, isZero: f, isNeg: l, isNegF: d, offsetF: h } = Jo(r, c, i);
      r = a, f ? s = s.add(Vn(d, n[h])) : o = o.add(Vn(l, n[u]));
    }
    return Qo(r), { p: o, f: s };
  }
  /**
   * Implements ec unsafe (non const-time) multiplication using precomputed tables and w-ary non-adjacent form.
   * @param acc accumulator point to add result of multiplication
   * @returns point
   */
  wNAFUnsafe(t, n, r, o = this.ZERO) {
    const s = gr(t, this.bits);
    for (let i = 0; i < s.windows && r !== $e; i++) {
      const { nextN: c, offset: a, isZero: u, isNeg: f } = Jo(r, i, s);
      if (r = c, !u) {
        const l = n[a];
        o = o.add(f ? l.negate() : l);
      }
    }
    return Qo(r), o;
  }
  getPrecomputes(t, n, r) {
    let o = wr.get(n);
    return o || (o = this.precomputeWindow(n, t), t !== 1 && (typeof r == "function" && (o = r(o)), wr.set(n, o))), o;
  }
  cached(t, n, r) {
    const o = yr(t);
    return this.wNAF(o, this.getPrecomputes(o, t, r), n);
  }
  unsafe(t, n, r, o) {
    const s = yr(t);
    return s === 1 ? this._unsafeLadder(t, n, o) : this.wNAFUnsafe(s, this.getPrecomputes(s, t, r), n, o);
  }
  // We calculate precomputes for elliptic curve point multiplication
  // using windowed method. This specifies window size and
  // stores precomputed values. Usually only base point would be precomputed.
  createCache(t, n) {
    Ti(n, this.bits), vi.set(t, n), wr.delete(t);
  }
  hasCache(t) {
    return yr(t) !== 1;
  }
};
function Ma(e, t, n, r) {
  let o = t, s = e.ZERO, i = e.ZERO;
  for (; n > $e || r > $e; )
    n & pe && (s = s.add(o)), r & pe && (i = i.add(o)), o = o.double(), n >>= pe, r >>= pe;
  return { p1: s, p2: i };
}
function ts(e, t, n) {
  if (t) {
    if (t.ORDER !== e)
      throw new Error("Field.ORDER must match order: Fp == p, Fn == n");
    return Pa(t), t;
  } else
    return ar(e, { isLE: n });
}
function Ka(e, t, n = {}, r) {
  if (r === void 0 && (r = e === "edwards"), !t || typeof t != "object")
    throw new Error(`expected valid ${e} CURVE object`);
  for (const a of ["p", "n", "h"]) {
    const u = t[a];
    if (!(typeof u == "bigint" && u > $e))
      throw new Error(`CURVE.${a} must be positive bigint`);
  }
  const o = ts(t.p, n.Fp, r), s = ts(t.n, n.Fn, r), c = ["Gx", "Gy", "a", "b"];
  for (const a of c)
    if (!o.isValid(t[a]))
      throw new Error(`CURVE.${a} must be valid field element of CURVE.Fp`);
  return t = Object.freeze(Object.assign({}, t)), { CURVE: t, Fp: o, Fn: s };
}
function ki(e, t) {
  return function(r) {
    const o = e(r);
    return { secretKey: o, publicKey: t(o) };
  };
}
class Ai {
  oHash;
  iHash;
  blockLen;
  outputLen;
  finished = !1;
  destroyed = !1;
  constructor(t, n) {
    if (ri(t), D(n, void 0, "key"), this.iHash = t.create(), typeof this.iHash.update != "function")
      throw new Error("Expected instance of class which extends utils.Hash");
    this.blockLen = this.iHash.blockLen, this.outputLen = this.iHash.outputLen;
    const r = this.blockLen, o = new Uint8Array(r);
    o.set(n.length > r ? t.create().update(n).digest() : n);
    for (let s = 0; s < o.length; s++)
      o[s] ^= 54;
    this.iHash.update(o), this.oHash = t.create();
    for (let s = 0; s < o.length; s++)
      o[s] ^= 106;
    this.oHash.update(o), Ce(o);
  }
  update(t) {
    return Rn(this), this.iHash.update(t), this;
  }
  digestInto(t) {
    Rn(this), D(t, this.outputLen, "output"), this.finished = !0, this.iHash.digestInto(t), this.oHash.update(t), this.oHash.digestInto(t), this.destroy();
  }
  digest() {
    const t = new Uint8Array(this.oHash.outputLen);
    return this.digestInto(t), t;
  }
  _cloneInto(t) {
    t ||= Object.create(Object.getPrototypeOf(this), {});
    const { oHash: n, iHash: r, finished: o, destroyed: s, blockLen: i, outputLen: c } = this;
    return t = t, t.finished = o, t.destroyed = s, t.blockLen = i, t.outputLen = c, t.oHash = n._cloneInto(t.oHash), t.iHash = r._cloneInto(t.iHash), t;
  }
  clone() {
    return this._cloneInto();
  }
  destroy() {
    this.destroyed = !0, this.oHash.destroy(), this.iHash.destroy();
  }
}
const Ii = (e, t, n) => new Ai(e, t).update(n).digest();
Ii.create = (e, t) => new Ai(e, t);
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const es = (e, t) => (e + (e >= 0 ? t : -t) / Bi) / t;
function Fa(e, t, n) {
  const [[r, o], [s, i]] = t, c = es(i * e, n), a = es(-o * e, n);
  let u = e - c * r - a * s, f = -c * o - a * i;
  const l = u < Xt, d = f < Xt;
  l && (u = -u), d && (f = -f);
  const h = wo(Math.ceil(Ba(n) / 2)) + Ie;
  if (u < Xt || u >= h || f < Xt || f >= h)
    throw new Error("splitScalar (endomorphism): failed, k=" + e);
  return { k1neg: l, k1: u, k2neg: d, k2: f };
}
function Pr(e) {
  if (!["compact", "recovered", "der"].includes(e))
    throw new Error('Signature format must be "compact", "recovered", or "der"');
  return e;
}
function mr(e, t) {
  const n = {};
  for (let r of Object.keys(t))
    n[r] = e[r] === void 0 ? t[r] : e[r];
  return _n(n.lowS, "lowS"), _n(n.prehash, "prehash"), n.format !== void 0 && Pr(n.format), n;
}
class Wa extends Error {
  constructor(t = "") {
    super(t);
  }
}
const ne = {
  // asn.1 DER encoding utils
  Err: Wa,
  // Basic building block is TLV (Tag-Length-Value)
  _tlv: {
    encode: (e, t) => {
      const { Err: n } = ne;
      if (e < 0 || e > 256)
        throw new n("tlv.encode: wrong tag");
      if (t.length & 1)
        throw new n("tlv.encode: unpadded data");
      const r = t.length / 2, o = yn(r);
      if (o.length / 2 & 128)
        throw new n("tlv.encode: long form length too big");
      const s = r > 127 ? yn(o.length / 2 | 128) : "";
      return yn(e) + s + o + t;
    },
    // v - value, l - left bytes (unparsed)
    decode(e, t) {
      const { Err: n } = ne;
      let r = 0;
      if (e < 0 || e > 256)
        throw new n("tlv.encode: wrong tag");
      if (t.length < 2 || t[r++] !== e)
        throw new n("tlv.decode: wrong tlv");
      const o = t[r++], s = !!(o & 128);
      let i = 0;
      if (!s)
        i = o;
      else {
        const a = o & 127;
        if (!a)
          throw new n("tlv.decode(long): indefinite length not supported");
        if (a > 4)
          throw new n("tlv.decode(long): byte length is too big");
        const u = t.subarray(r, r + a);
        if (u.length !== a)
          throw new n("tlv.decode: length bytes not complete");
        if (u[0] === 0)
          throw new n("tlv.decode(long): zero leftmost byte");
        for (const f of u)
          i = i << 8 | f;
        if (r += a, i < 128)
          throw new n("tlv.decode(long): not minimal encoding");
      }
      const c = t.subarray(r, r + i);
      if (c.length !== i)
        throw new n("tlv.decode: wrong value length");
      return { v: c, l: t.subarray(r + i) };
    }
  },
  // https://crypto.stackexchange.com/a/57734 Leftmost bit of first byte is 'negative' flag,
  // since we always use positive integers here. It must always be empty:
  // - add zero byte if exists
  // - if next byte doesn't have a flag, leading zero is not allowed (minimal encoding)
  _int: {
    encode(e) {
      const { Err: t } = ne;
      if (e < Xt)
        throw new t("integer: negative integers are not allowed");
      let n = yn(e);
      if (Number.parseInt(n[0], 16) & 8 && (n = "00" + n), n.length & 1)
        throw new t("unexpected DER parsing assertion: unpadded hex");
      return n;
    },
    decode(e) {
      const { Err: t } = ne;
      if (e[0] & 128)
        throw new t("invalid signature integer: negative");
      if (e[0] === 0 && !(e[1] & 128))
        throw new t("invalid signature integer: unnecessary leading zero");
      return Yt(e);
    }
  },
  toSig(e) {
    const { Err: t, _int: n, _tlv: r } = ne, o = D(e, void 0, "signature"), { v: s, l: i } = r.decode(48, o);
    if (i.length)
      throw new t("invalid signature: left bytes after parsing");
    const { v: c, l: a } = r.decode(2, s), { v: u, l: f } = r.decode(2, a);
    if (f.length)
      throw new t("invalid signature: left bytes after parsing");
    return { r: n.decode(c), s: n.decode(u) };
  },
  hexFromSig(e) {
    const { _tlv: t, _int: n } = ne, r = t.encode(2, n.encode(e.r)), o = t.encode(2, n.encode(e.s)), s = r + o;
    return t.encode(48, s);
  }
}, Xt = BigInt(0), Ie = BigInt(1), Bi = BigInt(2), mn = BigInt(3), za = BigInt(4);
function Ga(e, t = {}) {
  const n = Ka("weierstrass", e, t), { Fp: r, Fn: o } = n;
  let s = n.CURVE;
  const { h: i, n: c } = s;
  yo(t, {}, {
    allowInfinityPoint: "boolean",
    clearCofactor: "function",
    isTorsionFree: "function",
    fromBytes: "function",
    toBytes: "function",
    endo: "object"
  });
  const { endo: a } = t;
  if (a && (!r.is0(s.a) || typeof a.beta != "bigint" || !Array.isArray(a.basises)))
    throw new Error('invalid endo: expected "beta": bigint and "basises": array');
  const u = Ui(r, o);
  function f() {
    if (!r.isOdd)
      throw new Error("compression is not supported: Field does not have .isOdd()");
  }
  function l(O, T, S) {
    const { x: E, y: I } = T.toAffine(), C = r.toBytes(E);
    if (_n(S, "isCompressed"), S) {
      f();
      const L = !r.isOdd(I);
      return Rt(Oi(L), C);
    } else
      return Rt(Uint8Array.of(4), C, r.toBytes(I));
  }
  function d(O) {
    D(O, void 0, "Point");
    const { publicKey: T, publicKeyUncompressed: S } = u, E = O.length, I = O[0], C = O.subarray(1);
    if (E === T && (I === 2 || I === 3)) {
      const L = r.fromBytes(C);
      if (!r.isValid(L))
        throw new Error("bad point: is not on curve, wrong x");
      const $ = p(L);
      let U;
      try {
        U = r.sqrt($);
      } catch (et) {
        const q = et instanceof Error ? ": " + et.message : "";
        throw new Error("bad point: is not on curve, sqrt error" + q);
      }
      f();
      const P = r.isOdd(U);
      return (I & 1) === 1 !== P && (U = r.neg(U)), { x: L, y: U };
    } else if (E === S && I === 4) {
      const L = r.BYTES, $ = r.fromBytes(C.subarray(0, L)), U = r.fromBytes(C.subarray(L, L * 2));
      if (!y($, U))
        throw new Error("bad point: is not on curve");
      return { x: $, y: U };
    } else
      throw new Error(`bad point: got length ${E}, expected compressed=${T} or uncompressed=${S}`);
  }
  const h = t.toBytes || l, g = t.fromBytes || d;
  function p(O) {
    const T = r.sqr(O), S = r.mul(T, O);
    return r.add(r.add(S, r.mul(O, s.a)), s.b);
  }
  function y(O, T) {
    const S = r.sqr(T), E = p(O);
    return r.eql(S, E);
  }
  if (!y(s.Gx, s.Gy))
    throw new Error("bad curve params: generator point");
  const m = r.mul(r.pow(s.a, mn), za), b = r.mul(r.sqr(s.b), BigInt(27));
  if (r.is0(r.add(m, b)))
    throw new Error("bad curve params: a or b");
  function k(O, T, S = !1) {
    if (!r.isValid(T) || S && r.is0(T))
      throw new Error(`bad point coordinate ${O}`);
    return T;
  }
  function N(O) {
    if (!(O instanceof K))
      throw new Error("Weierstrass Point expected");
  }
  function A(O) {
    if (!a || !a.basises)
      throw new Error("no endo");
    return Fa(O, a.basises, o.ORDER);
  }
  const z = Yo((O, T) => {
    const { X: S, Y: E, Z: I } = O;
    if (r.eql(I, r.ONE))
      return { x: S, y: E };
    const C = O.is0();
    T == null && (T = C ? r.ONE : r.inv(I));
    const L = r.mul(S, T), $ = r.mul(E, T), U = r.mul(I, T);
    if (C)
      return { x: r.ZERO, y: r.ZERO };
    if (!r.eql(U, r.ONE))
      throw new Error("invZ was invalid");
    return { x: L, y: $ };
  }), w = Yo((O) => {
    if (O.is0()) {
      if (t.allowInfinityPoint && !r.is0(O.Y))
        return;
      throw new Error("bad point: ZERO");
    }
    const { x: T, y: S } = O.toAffine();
    if (!r.isValid(T) || !r.isValid(S))
      throw new Error("bad point: x or y not field elements");
    if (!y(T, S))
      throw new Error("bad point: equation left != right");
    if (!O.isTorsionFree())
      throw new Error("bad point: not in prime-order subgroup");
    return !0;
  });
  function ft(O, T, S, E, I) {
    return S = new K(r.mul(S.X, O), S.Y, S.Z), T = Vn(E, T), S = Vn(I, S), T.add(S);
  }
  class K {
    // base / generator point
    static BASE = new K(s.Gx, s.Gy, r.ONE);
    // zero / infinity / identity point
    static ZERO = new K(r.ZERO, r.ONE, r.ZERO);
    // 0, 1, 0
    // math field
    static Fp = r;
    // scalar field
    static Fn = o;
    X;
    Y;
    Z;
    /** Does NOT validate if the point is valid. Use `.assertValidity()`. */
    constructor(T, S, E) {
      this.X = k("x", T), this.Y = k("y", S, !0), this.Z = k("z", E), Object.freeze(this);
    }
    static CURVE() {
      return s;
    }
    /** Does NOT validate if the point is valid. Use `.assertValidity()`. */
    static fromAffine(T) {
      const { x: S, y: E } = T || {};
      if (!T || !r.isValid(S) || !r.isValid(E))
        throw new Error("invalid affine point");
      if (T instanceof K)
        throw new Error("projective point not allowed");
      return r.is0(S) && r.is0(E) ? K.ZERO : new K(S, E, r.ONE);
    }
    static fromBytes(T) {
      const S = K.fromAffine(g(D(T, void 0, "point")));
      return S.assertValidity(), S;
    }
    static fromHex(T) {
      return K.fromBytes(Pn(T));
    }
    get x() {
      return this.toAffine().x;
    }
    get y() {
      return this.toAffine().y;
    }
    /**
     *
     * @param windowSize
     * @param isLazy true will defer table computation until the first multiplication
     * @returns
     */
    precompute(T = 8, S = !0) {
      return v.createCache(this, T), S || this.multiply(mn), this;
    }
    // TODO: return `this`
    /** A point on curve is valid if it conforms to equation. */
    assertValidity() {
      w(this);
    }
    hasEvenY() {
      const { y: T } = this.toAffine();
      if (!r.isOdd)
        throw new Error("Field doesn't support isOdd");
      return !r.isOdd(T);
    }
    /** Compare one point to another. */
    equals(T) {
      N(T);
      const { X: S, Y: E, Z: I } = this, { X: C, Y: L, Z: $ } = T, U = r.eql(r.mul(S, $), r.mul(C, I)), P = r.eql(r.mul(E, $), r.mul(L, I));
      return U && P;
    }
    /** Flips point to one corresponding to (x, -y) in Affine coordinates. */
    negate() {
      return new K(this.X, r.neg(this.Y), this.Z);
    }
    // Renes-Costello-Batina exception-free doubling formula.
    // There is 30% faster Jacobian formula, but it is not complete.
    // https://eprint.iacr.org/2015/1060, algorithm 3
    // Cost: 8M + 3S + 3*a + 2*b3 + 15add.
    double() {
      const { a: T, b: S } = s, E = r.mul(S, mn), { X: I, Y: C, Z: L } = this;
      let $ = r.ZERO, U = r.ZERO, P = r.ZERO, V = r.mul(I, I), et = r.mul(C, C), q = r.mul(L, L), F = r.mul(I, C);
      return F = r.add(F, F), P = r.mul(I, L), P = r.add(P, P), $ = r.mul(T, P), U = r.mul(E, q), U = r.add($, U), $ = r.sub(et, U), U = r.add(et, U), U = r.mul($, U), $ = r.mul(F, $), P = r.mul(E, P), q = r.mul(T, q), F = r.sub(V, q), F = r.mul(T, F), F = r.add(F, P), P = r.add(V, V), V = r.add(P, V), V = r.add(V, q), V = r.mul(V, F), U = r.add(U, V), q = r.mul(C, L), q = r.add(q, q), V = r.mul(q, F), $ = r.sub($, V), P = r.mul(q, et), P = r.add(P, P), P = r.add(P, P), new K($, U, P);
    }
    // Renes-Costello-Batina exception-free addition formula.
    // There is 30% faster Jacobian formula, but it is not complete.
    // https://eprint.iacr.org/2015/1060, algorithm 1
    // Cost: 12M + 0S + 3*a + 3*b3 + 23add.
    add(T) {
      N(T);
      const { X: S, Y: E, Z: I } = this, { X: C, Y: L, Z: $ } = T;
      let U = r.ZERO, P = r.ZERO, V = r.ZERO;
      const et = s.a, q = r.mul(s.b, mn);
      let F = r.mul(S, C), J = r.mul(E, L), lt = r.mul(I, $), Mt = r.add(S, E), Q = r.add(C, L);
      Mt = r.mul(Mt, Q), Q = r.add(F, J), Mt = r.sub(Mt, Q), Q = r.add(S, I);
      let ht = r.add(C, $);
      return Q = r.mul(Q, ht), ht = r.add(F, lt), Q = r.sub(Q, ht), ht = r.add(E, I), U = r.add(L, $), ht = r.mul(ht, U), U = r.add(J, lt), ht = r.sub(ht, U), V = r.mul(et, Q), U = r.mul(q, lt), V = r.add(U, V), U = r.sub(J, V), V = r.add(J, V), P = r.mul(U, V), J = r.add(F, F), J = r.add(J, F), lt = r.mul(et, lt), Q = r.mul(q, Q), J = r.add(J, lt), lt = r.sub(F, lt), lt = r.mul(et, lt), Q = r.add(Q, lt), F = r.mul(J, Q), P = r.add(P, F), F = r.mul(ht, Q), U = r.mul(Mt, U), U = r.sub(U, F), F = r.mul(Mt, J), V = r.mul(ht, V), V = r.add(V, F), new K(U, P, V);
    }
    subtract(T) {
      return this.add(T.negate());
    }
    is0() {
      return this.equals(K.ZERO);
    }
    /**
     * Constant time multiplication.
     * Uses wNAF method. Windowed method may be 10% faster,
     * but takes 2x longer to generate and consumes 2x memory.
     * Uses precomputes when available.
     * Uses endomorphism for Koblitz curves.
     * @param scalar by which the point would be multiplied
     * @returns New point
     */
    multiply(T) {
      const { endo: S } = t;
      if (!o.isValidNot0(T))
        throw new Error("invalid scalar: out of range");
      let E, I;
      const C = (L) => v.cached(this, L, ($) => Xo(K, $));
      if (S) {
        const { k1neg: L, k1: $, k2neg: U, k2: P } = A(T), { p: V, f: et } = C($), { p: q, f: F } = C(P);
        I = et.add(F), E = ft(S.beta, V, q, L, U);
      } else {
        const { p: L, f: $ } = C(T);
        E = L, I = $;
      }
      return Xo(K, [E, I])[0];
    }
    /**
     * Non-constant-time multiplication. Uses double-and-add algorithm.
     * It's faster, but should only be used when you don't care about
     * an exposed secret key e.g. sig verification, which works over *public* keys.
     */
    multiplyUnsafe(T) {
      const { endo: S } = t, E = this;
      if (!o.isValid(T))
        throw new Error("invalid scalar: out of range");
      if (T === Xt || E.is0())
        return K.ZERO;
      if (T === Ie)
        return E;
      if (v.hasCache(this))
        return this.multiply(T);
      if (S) {
        const { k1neg: I, k1: C, k2neg: L, k2: $ } = A(T), { p1: U, p2: P } = Ma(K, E, C, $);
        return ft(S.beta, U, P, I, L);
      } else
        return v.unsafe(E, T);
    }
    /**
     * Converts Projective point to affine (x, y) coordinates.
     * @param invertedZ Z^-1 (inverted zero) - optional, precomputation is useful for invertBatch
     */
    toAffine(T) {
      return z(this, T);
    }
    /**
     * Checks whether Point is free of torsion elements (is in prime subgroup).
     * Always torsion-free for cofactor=1 curves.
     */
    isTorsionFree() {
      const { isTorsionFree: T } = t;
      return i === Ie ? !0 : T ? T(K, this) : v.unsafe(this, c).is0();
    }
    clearCofactor() {
      const { clearCofactor: T } = t;
      return i === Ie ? this : T ? T(K, this) : this.multiplyUnsafe(i);
    }
    isSmallOrder() {
      return this.multiplyUnsafe(i).is0();
    }
    toBytes(T = !0) {
      return _n(T, "isCompressed"), this.assertValidity(), h(K, this, T);
    }
    toHex(T = !0) {
      return cr(this.toBytes(T));
    }
    toString() {
      return `<Point ${this.is0() ? "ZERO" : this.toHex()}>`;
    }
  }
  const Te = o.BITS, v = new Da(K, t.endo ? Math.ceil(Te / 2) : Te);
  return K.BASE.precompute(8), K;
}
function Oi(e) {
  return Uint8Array.of(e ? 2 : 3);
}
function Ui(e, t) {
  return {
    secretKey: t.BYTES,
    publicKey: 1 + e.BYTES,
    publicKeyUncompressed: 1 + 2 * e.BYTES,
    publicKeyHasPrefix: !0,
    signature: 2 * t.BYTES
  };
}
function ja(e, t = {}) {
  const { Fn: n } = e, r = t.randomBytes || ln, o = Object.assign(Ui(e.Fp, n), { seed: bi(n.ORDER) });
  function s(h) {
    try {
      const g = n.fromBytes(h);
      return n.isValidNot0(g);
    } catch {
      return !1;
    }
  }
  function i(h, g) {
    const { publicKey: p, publicKeyUncompressed: y } = o;
    try {
      const m = h.length;
      return g === !0 && m !== p || g === !1 && m !== y ? !1 : !!e.fromBytes(h);
    } catch {
      return !1;
    }
  }
  function c(h = r(o.seed)) {
    return Si(D(h, o.seed, "seed"), n.ORDER);
  }
  function a(h, g = !0) {
    return e.BASE.multiply(n.fromBytes(h)).toBytes(g);
  }
  function u(h) {
    const { secretKey: g, publicKey: p, publicKeyUncompressed: y } = o;
    if (!po(h) || "_lengths" in n && n._lengths || g === p)
      return;
    const m = D(h, void 0, "key").length;
    return m === p || m === y;
  }
  function f(h, g, p = !0) {
    if (u(h) === !0)
      throw new Error("first arg must be private key");
    if (u(g) === !1)
      throw new Error("second arg must be public key");
    const y = n.fromBytes(h);
    return e.fromBytes(g).multiply(y).toBytes(p);
  }
  const l = {
    isValidSecretKey: s,
    isValidPublicKey: i,
    randomSecretKey: c
  }, d = ki(c, a);
  return Object.freeze({ getPublicKey: a, getSharedSecret: f, keygen: d, Point: e, utils: l, lengths: o });
}
function Ya(e, t, n = {}) {
  ri(t), yo(n, {}, {
    hmac: "function",
    lowS: "boolean",
    randomBytes: "function",
    bits2int: "function",
    bits2int_modN: "function"
  }), n = Object.assign({}, n);
  const r = n.randomBytes || ln, o = n.hmac || ((S, E) => Ii(t, S, E)), { Fp: s, Fn: i } = e, { ORDER: c, BITS: a } = i, { keygen: u, getPublicKey: f, getSharedSecret: l, utils: d, lengths: h } = ja(e, n), g = {
    prehash: !0,
    lowS: typeof n.lowS == "boolean" ? n.lowS : !0,
    format: "compact",
    extraEntropy: !1
  }, p = c * Bi < s.ORDER;
  function y(S) {
    const E = c >> Ie;
    return S > E;
  }
  function m(S, E) {
    if (!i.isValidNot0(E))
      throw new Error(`invalid signature ${S}: out of range 1..Point.Fn.ORDER`);
    return E;
  }
  function b() {
    if (p)
      throw new Error('"recovered" sig type is not supported for cofactor >2 curves');
  }
  function k(S, E) {
    Pr(E);
    const I = h.signature, C = E === "compact" ? I : E === "recovered" ? I + 1 : void 0;
    return D(S, C);
  }
  class N {
    r;
    s;
    recovery;
    constructor(E, I, C) {
      if (this.r = m("r", E), this.s = m("s", I), C != null) {
        if (b(), ![0, 1, 2, 3].includes(C))
          throw new Error("invalid recovery id");
        this.recovery = C;
      }
      Object.freeze(this);
    }
    static fromBytes(E, I = g.format) {
      k(E, I);
      let C;
      if (I === "der") {
        const { r: P, s: V } = ne.toSig(D(E));
        return new N(P, V);
      }
      I === "recovered" && (C = E[0], I = "compact", E = E.subarray(1));
      const L = h.signature / 2, $ = E.subarray(0, L), U = E.subarray(L, L * 2);
      return new N(i.fromBytes($), i.fromBytes(U), C);
    }
    static fromHex(E, I) {
      return this.fromBytes(Pn(E), I);
    }
    assertRecovery() {
      const { recovery: E } = this;
      if (E == null)
        throw new Error("invalid recovery id: must be present");
      return E;
    }
    addRecoveryBit(E) {
      return new N(this.r, this.s, E);
    }
    recoverPublicKey(E) {
      const { r: I, s: C } = this, L = this.assertRecovery(), $ = L === 2 || L === 3 ? I + c : I;
      if (!s.isValid($))
        throw new Error("invalid recovery id: sig.r+curve.n != R.x");
      const U = s.toBytes($), P = e.fromBytes(Rt(Oi((L & 1) === 0), U)), V = i.inv($), et = z(D(E, void 0, "msgHash")), q = i.create(-et * V), F = i.create(C * V), J = e.BASE.multiplyUnsafe(q).add(P.multiplyUnsafe(F));
      if (J.is0())
        throw new Error("invalid recovery: point at infinify");
      return J.assertValidity(), J;
    }
    // Signatures should be low-s, to prevent malleability.
    hasHighS() {
      return y(this.s);
    }
    toBytes(E = g.format) {
      if (Pr(E), E === "der")
        return Pn(ne.hexFromSig(this));
      const { r: I, s: C } = this, L = i.toBytes(I), $ = i.toBytes(C);
      return E === "recovered" ? (b(), Rt(Uint8Array.of(this.assertRecovery()), L, $)) : Rt(L, $);
    }
    toHex(E) {
      return cr(this.toBytes(E));
    }
  }
  const A = n.bits2int || function(E) {
    if (E.length > 8192)
      throw new Error("input is too large");
    const I = Yt(E), C = E.length * 8 - a;
    return C > 0 ? I >> BigInt(C) : I;
  }, z = n.bits2int_modN || function(E) {
    return i.create(A(E));
  }, w = wo(a);
  function ft(S) {
    return li("num < 2^" + a, S, Xt, w), i.toBytes(S);
  }
  function K(S, E) {
    return D(S, void 0, "message"), E ? D(t(S), void 0, "prehashed message") : S;
  }
  function Te(S, E, I) {
    const { lowS: C, prehash: L, extraEntropy: $ } = mr(I, g);
    S = K(S, L);
    const U = z(S), P = i.fromBytes(E);
    if (!i.isValidNot0(P))
      throw new Error("invalid private key");
    const V = [ft(P), ft(U)];
    if ($ != null && $ !== !1) {
      const J = $ === !0 ? r(h.secretKey) : $;
      V.push(D(J, void 0, "extraEntropy"));
    }
    const et = Rt(...V), q = U;
    function F(J) {
      const lt = A(J);
      if (!i.isValidNot0(lt))
        return;
      const Mt = i.inv(lt), Q = e.BASE.multiply(lt).toAffine(), ht = i.create(Q.x);
      if (ht === Xt)
        return;
      const gn = i.create(Mt * i.create(q + ht * P));
      if (gn === Xt)
        return;
      let Do = (Q.x === ht ? 0 : 2) | Number(Q.y & Ie), Mo = gn;
      return C && y(gn) && (Mo = i.neg(gn), Do ^= 1), new N(ht, Mo, p ? void 0 : Do);
    }
    return { seed: et, k2sig: F };
  }
  function v(S, E, I = {}) {
    const { seed: C, k2sig: L } = Te(S, E, I);
    return Oa(t.outputLen, i.BYTES, o)(C, L).toBytes(I.format);
  }
  function O(S, E, I, C = {}) {
    const { lowS: L, prehash: $, format: U } = mr(C, g);
    if (I = D(I, void 0, "publicKey"), E = K(E, $), !po(S)) {
      const P = S instanceof N ? ", use sig.toBytes()" : "";
      throw new Error("verify expects Uint8Array signature" + P);
    }
    k(S, U);
    try {
      const P = N.fromBytes(S, U), V = e.fromBytes(I);
      if (L && P.hasHighS())
        return !1;
      const { r: et, s: q } = P, F = z(E), J = i.inv(q), lt = i.create(F * J), Mt = i.create(et * J), Q = e.BASE.multiplyUnsafe(lt).add(V.multiplyUnsafe(Mt));
      return Q.is0() ? !1 : i.create(Q.x) === et;
    } catch {
      return !1;
    }
  }
  function T(S, E, I = {}) {
    const { prehash: C } = mr(I, g);
    return E = K(E, C), N.fromBytes(S, "recovered").recoverPublicKey(E).toBytes();
  }
  return Object.freeze({
    keygen: u,
    getPublicKey: f,
    getSharedSecret: l,
    utils: d,
    lengths: h,
    Point: e,
    sign: v,
    verify: O,
    recoverPublicKey: T,
    Signature: N,
    hash: t
  });
}
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const ur = {
  p: BigInt("0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffefffffc2f"),
  n: BigInt("0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141"),
  h: BigInt(1),
  a: BigInt(0),
  b: BigInt(7),
  Gx: BigInt("0x79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798"),
  Gy: BigInt("0x483ada7726a3c4655da4fbfc0e1108a8fd17b448a68554199c47d08ffb10d4b8")
}, qa = {
  beta: BigInt("0x7ae96a2b657c07106e64479eac3434e99cf0497512f58995c1396c28719501ee"),
  basises: [
    [BigInt("0x3086d221a7d46bcde86c90e49284eb15"), -BigInt("0xe4437ed6010e88286f547fa90abfe4c3")],
    [BigInt("0x114ca50f7a8e2f3f657c1108d9d44cfd8"), BigInt("0x3086d221a7d46bcde86c90e49284eb15")]
  ]
}, Za = /* @__PURE__ */ BigInt(0), _r = /* @__PURE__ */ BigInt(2);
function Xa(e) {
  const t = ur.p, n = BigInt(3), r = BigInt(6), o = BigInt(11), s = BigInt(22), i = BigInt(23), c = BigInt(44), a = BigInt(88), u = e * e * e % t, f = u * u * e % t, l = kt(f, n, t) * f % t, d = kt(l, n, t) * f % t, h = kt(d, _r, t) * u % t, g = kt(h, o, t) * h % t, p = kt(g, s, t) * g % t, y = kt(p, c, t) * p % t, m = kt(y, a, t) * y % t, b = kt(m, c, t) * p % t, k = kt(b, n, t) * f % t, N = kt(k, i, t) * g % t, A = kt(N, r, t) * u % t, z = kt(A, _r, t);
  if (!Hn.eql(Hn.sqr(z), e))
    throw new Error("Cannot find square root");
  return z;
}
const Hn = ar(ur.p, { sqrt: Xa }), be = /* @__PURE__ */ Ga(ur, {
  Fp: Hn,
  endo: qa
}), Ft = /* @__PURE__ */ Ya(be, dt), ns = {};
function Dn(e, ...t) {
  let n = ns[e];
  if (n === void 0) {
    const r = dt(Aa(e));
    n = Rt(r, r), ns[e] = n;
  }
  return dt(Rt(n, ...t));
}
const Eo = (e) => e.toBytes(!0).slice(1), xo = (e) => e % _r === Za;
function Vr(e) {
  const { Fn: t, BASE: n } = be, r = t.fromBytes(e), o = n.multiply(r);
  return { scalar: xo(o.y) ? r : t.neg(r), bytes: Eo(o) };
}
function Ni(e) {
  const t = Hn;
  if (!t.isValidNot0(e))
    throw new Error("invalid x: Fail if x ≥ p");
  const n = t.create(e * e), r = t.create(n * e + BigInt(7));
  let o = t.sqrt(r);
  xo(o) || (o = t.neg(o));
  const s = be.fromAffine({ x: e, y: o });
  return s.assertValidity(), s;
}
const Ye = Yt;
function Ci(...e) {
  return be.Fn.create(Ye(Dn("BIP0340/challenge", ...e)));
}
function rs(e) {
  return Vr(e).bytes;
}
function Ja(e, t, n = ln(32)) {
  const { Fn: r } = be, o = D(e, void 0, "message"), { bytes: s, scalar: i } = Vr(t), c = D(n, 32, "auxRand"), a = r.toBytes(i ^ Ye(Dn("BIP0340/aux", c))), u = Dn("BIP0340/nonce", a, s, o), { bytes: f, scalar: l } = Vr(u), d = Ci(f, s, o), h = new Uint8Array(64);
  if (h.set(f, 0), h.set(r.toBytes(r.create(l + d * i)), 32), !$i(h, o, s))
    throw new Error("sign: Invalid signature produced");
  return h;
}
function $i(e, t, n) {
  const { Fp: r, Fn: o, BASE: s } = be, i = D(e, 64, "signature"), c = D(t, void 0, "message"), a = D(n, 32, "publicKey");
  try {
    const u = Ni(Ye(a)), f = Ye(i.subarray(0, 32));
    if (!r.isValidNot0(f))
      return !1;
    const l = Ye(i.subarray(32, 64));
    if (!o.isValidNot0(l))
      return !1;
    const d = Ci(o.toBytes(f), Eo(u), c), h = s.multiplyUnsafe(l).add(u.multiplyUnsafe(o.neg(d))), { x: g, y: p } = h.toAffine();
    return !(h.is0() || !xo(p) || g !== f);
  } catch {
    return !1;
  }
}
const Ut = /* @__PURE__ */ (() => {
  const n = (r = ln(48)) => Si(r, ur.n);
  return {
    keygen: ki(n, rs),
    getPublicKey: rs,
    sign: Ja,
    verify: $i,
    Point: be,
    utils: {
      randomSecretKey: n,
      taggedHash: Dn,
      lift_x: Ni,
      pointToBytes: Eo
    },
    lengths: {
      secretKey: 32,
      publicKey: 32,
      publicKeyHasPrefix: !1,
      signature: 64,
      seed: 48
    }
  };
})(), Qa = /* @__PURE__ */ Uint8Array.from([
  7,
  4,
  13,
  1,
  10,
  6,
  15,
  3,
  12,
  0,
  9,
  5,
  2,
  14,
  11,
  8
]), Li = Uint8Array.from(new Array(16).fill(0).map((e, t) => t)), tu = Li.map((e) => (9 * e + 5) % 16), Ri = /* @__PURE__ */ (() => {
  const n = [[Li], [tu]];
  for (let r = 0; r < 4; r++)
    for (let o of n)
      o.push(o[r].map((s) => Qa[s]));
  return n;
})(), Pi = Ri[0], _i = Ri[1], Vi = /* @__PURE__ */ [
  [11, 14, 15, 12, 5, 8, 7, 9, 11, 13, 14, 15, 6, 7, 9, 8],
  [12, 13, 11, 15, 6, 9, 9, 7, 12, 15, 11, 13, 7, 8, 7, 7],
  [13, 15, 14, 11, 7, 7, 6, 8, 13, 14, 13, 12, 5, 5, 6, 9],
  [14, 11, 12, 14, 8, 6, 5, 5, 15, 12, 15, 14, 9, 9, 8, 6],
  [15, 12, 13, 13, 9, 5, 8, 6, 14, 11, 12, 11, 8, 6, 5, 5]
].map((e) => Uint8Array.from(e)), eu = /* @__PURE__ */ Pi.map((e, t) => e.map((n) => Vi[t][n])), nu = /* @__PURE__ */ _i.map((e, t) => e.map((n) => Vi[t][n])), ru = /* @__PURE__ */ Uint32Array.from([
  0,
  1518500249,
  1859775393,
  2400959708,
  2840853838
]), ou = /* @__PURE__ */ Uint32Array.from([
  1352829926,
  1548603684,
  1836072691,
  2053994217,
  0
]);
function os(e, t, n, r) {
  return e === 0 ? t ^ n ^ r : e === 1 ? t & n | ~t & r : e === 2 ? (t | ~n) ^ r : e === 3 ? t & r | n & ~r : t ^ (n | ~r);
}
const En = /* @__PURE__ */ new Uint32Array(16);
class su extends ii {
  h0 = 1732584193;
  h1 = -271733879;
  h2 = -1732584194;
  h3 = 271733878;
  h4 = -1009589776;
  constructor() {
    super(64, 20, 8, !0);
  }
  get() {
    const { h0: t, h1: n, h2: r, h3: o, h4: s } = this;
    return [t, n, r, o, s];
  }
  set(t, n, r, o, s) {
    this.h0 = t | 0, this.h1 = n | 0, this.h2 = r | 0, this.h3 = o | 0, this.h4 = s | 0;
  }
  process(t, n) {
    for (let h = 0; h < 16; h++, n += 4)
      En[h] = t.getUint32(n, !0);
    let r = this.h0 | 0, o = r, s = this.h1 | 0, i = s, c = this.h2 | 0, a = c, u = this.h3 | 0, f = u, l = this.h4 | 0, d = l;
    for (let h = 0; h < 5; h++) {
      const g = 4 - h, p = ru[h], y = ou[h], m = Pi[h], b = _i[h], k = eu[h], N = nu[h];
      for (let A = 0; A < 16; A++) {
        const z = wn(r + os(h, s, c, u) + En[m[A]] + p, k[A]) + l | 0;
        r = l, l = u, u = wn(c, 10) | 0, c = s, s = z;
      }
      for (let A = 0; A < 16; A++) {
        const z = wn(o + os(g, i, a, f) + En[b[A]] + y, N[A]) + d | 0;
        o = d, d = f, f = wn(a, 10) | 0, a = i, i = z;
      }
    }
    this.set(this.h1 + c + f | 0, this.h2 + u + d | 0, this.h3 + l + o | 0, this.h4 + r + i | 0, this.h0 + s + a | 0);
  }
  roundClean() {
    Ce(En);
  }
  destroy() {
    this.destroyed = !0, Ce(this.buffer), this.set(0, 0, 0, 0, 0);
  }
}
const iu = /* @__PURE__ */ si(() => new su()), Me = Ft.Point, ss = Me.Fn, Hi = Me.Fn.ORDER, hn = (e) => e % 2n === 0n, Y = ao.isBytes, re = ao.concatBytes, rt = ao.equalBytes, Di = (e) => iu(dt(e)), pt = (...e) => dt(dt(re(...e))), Hr = Ut.utils.randomSecretKey, bo = Ut.getPublicKey, Mi = Ft.getPublicKey, is = (e) => e.r < Hi / 2n;
function cu(e, t, n = !1) {
  let r = Ft.Signature.fromBytes(Ft.sign(e, t, { prehash: !1 }));
  if (n && !is(r)) {
    const o = new Uint8Array(32);
    let s = 0;
    for (; !is(r); )
      if (o.set(W.encode(s++)), r = Ft.Signature.fromBytes(Ft.sign(e, t, { prehash: !1, extraEntropy: o })), s > 4294967295)
        throw new Error("lowR counter overflow: report the error");
  }
  return r.toBytes("der");
}
const cs = Ut.sign, So = Ut.utils.taggedHash, Tt = {
  ecdsa: 0,
  schnorr: 1
};
function Le(e, t) {
  const n = e.length;
  if (t === Tt.ecdsa) {
    if (n === 32)
      throw new Error("Expected non-Schnorr key");
    return Me.fromBytes(e), e;
  } else if (t === Tt.schnorr) {
    if (n !== 32)
      throw new Error("Expected 32-byte Schnorr key");
    return Ut.utils.lift_x(Yt(e)), e;
  } else
    throw new Error("Unknown key type");
}
function Ki(e, t) {
  const r = Ut.utils.taggedHash("TapTweak", e, t), o = Yt(r);
  if (o >= Hi)
    throw new Error("tweak higher than curve order");
  return o;
}
function au(e, t = Uint8Array.of()) {
  const n = Ut.utils, r = Yt(e), o = Me.BASE.multiply(r), s = hn(o.y) ? r : ss.neg(r), i = n.pointToBytes(o), c = Ki(i, t);
  return dn(ss.add(s, c), 32);
}
function Dr(e, t) {
  const n = Ut.utils, r = Ki(e, t), s = n.lift_x(Yt(e)).add(Me.BASE.multiply(r)), i = hn(s.y) ? 0 : 1;
  return [n.pointToBytes(s), i];
}
const To = dt(Me.BASE.toBytes(!1)), Re = {
  bech32: "bc",
  pubKeyHash: 0,
  scriptHash: 5,
  wif: 128
}, xn = {
  bech32: "tb",
  pubKeyHash: 111,
  scriptHash: 196,
  wif: 239
};
function Mn(e, t) {
  if (!Y(e) || !Y(t))
    throw new Error(`cmp: wrong type a=${typeof e} b=${typeof t}`);
  const n = Math.min(e.length, t.length);
  for (let r = 0; r < n; r++)
    if (e[r] != t[r])
      return Math.sign(e[r] - t[r]);
  return Math.sign(e.length - t.length);
}
function Fi(e) {
  const t = {};
  for (const n in e) {
    if (t[e[n]] !== void 0)
      throw new Error("duplicate key");
    t[e[n]] = n;
  }
  return t;
}
const ct = {
  OP_0: 0,
  PUSHDATA1: 76,
  PUSHDATA2: 77,
  PUSHDATA4: 78,
  "1NEGATE": 79,
  RESERVED: 80,
  OP_1: 81,
  OP_2: 82,
  OP_3: 83,
  OP_4: 84,
  OP_5: 85,
  OP_6: 86,
  OP_7: 87,
  OP_8: 88,
  OP_9: 89,
  OP_10: 90,
  OP_11: 91,
  OP_12: 92,
  OP_13: 93,
  OP_14: 94,
  OP_15: 95,
  OP_16: 96,
  // Control
  NOP: 97,
  VER: 98,
  IF: 99,
  NOTIF: 100,
  VERIF: 101,
  VERNOTIF: 102,
  ELSE: 103,
  ENDIF: 104,
  VERIFY: 105,
  RETURN: 106,
  // Stack
  TOALTSTACK: 107,
  FROMALTSTACK: 108,
  "2DROP": 109,
  "2DUP": 110,
  "3DUP": 111,
  "2OVER": 112,
  "2ROT": 113,
  "2SWAP": 114,
  IFDUP: 115,
  DEPTH: 116,
  DROP: 117,
  DUP: 118,
  NIP: 119,
  OVER: 120,
  PICK: 121,
  ROLL: 122,
  ROT: 123,
  SWAP: 124,
  TUCK: 125,
  // Splice
  CAT: 126,
  SUBSTR: 127,
  LEFT: 128,
  RIGHT: 129,
  SIZE: 130,
  // Boolean logic
  INVERT: 131,
  AND: 132,
  OR: 133,
  XOR: 134,
  EQUAL: 135,
  EQUALVERIFY: 136,
  RESERVED1: 137,
  RESERVED2: 138,
  // Numbers
  "1ADD": 139,
  "1SUB": 140,
  "2MUL": 141,
  "2DIV": 142,
  NEGATE: 143,
  ABS: 144,
  NOT: 145,
  "0NOTEQUAL": 146,
  ADD: 147,
  SUB: 148,
  MUL: 149,
  DIV: 150,
  MOD: 151,
  LSHIFT: 152,
  RSHIFT: 153,
  BOOLAND: 154,
  BOOLOR: 155,
  NUMEQUAL: 156,
  NUMEQUALVERIFY: 157,
  NUMNOTEQUAL: 158,
  LESSTHAN: 159,
  GREATERTHAN: 160,
  LESSTHANOREQUAL: 161,
  GREATERTHANOREQUAL: 162,
  MIN: 163,
  MAX: 164,
  WITHIN: 165,
  // Crypto
  RIPEMD160: 166,
  SHA1: 167,
  SHA256: 168,
  HASH160: 169,
  HASH256: 170,
  CODESEPARATOR: 171,
  CHECKSIG: 172,
  CHECKSIGVERIFY: 173,
  CHECKMULTISIG: 174,
  CHECKMULTISIGVERIFY: 175,
  // Expansion
  NOP1: 176,
  CHECKLOCKTIMEVERIFY: 177,
  CHECKSEQUENCEVERIFY: 178,
  NOP4: 179,
  NOP5: 180,
  NOP6: 181,
  NOP7: 182,
  NOP8: 183,
  NOP9: 184,
  NOP10: 185,
  // BIP 342
  CHECKSIGADD: 186,
  // Invalid
  INVALID: 255
}, uu = Fi(ct);
function vo(e = 6, t = !1) {
  return St({
    encodeStream: (n, r) => {
      if (r === 0n)
        return;
      const o = r < 0, s = BigInt(r), i = [];
      for (let c = o ? -s : s; c; c >>= 8n)
        i.push(Number(c & 0xffn));
      i[i.length - 1] >= 128 ? i.push(o ? 128 : 0) : o && (i[i.length - 1] |= 128), n.bytes(new Uint8Array(i));
    },
    decodeStream: (n) => {
      const r = n.leftBytes;
      if (r > e)
        throw new Error(`ScriptNum: number (${r}) bigger than limit=${e}`);
      if (r === 0)
        return 0n;
      if (t) {
        const i = n.bytes(r, !0);
        if ((i[i.length - 1] & 127) === 0 && (r <= 1 || (i[i.length - 2] & 128) === 0))
          throw new Error("Non-minimally encoded ScriptNum");
      }
      let o = 0, s = 0n;
      for (let i = 0; i < r; ++i)
        o = n.byte(), s |= BigInt(o) << 8n * BigInt(i);
      return o >= 128 && (s &= 2n ** BigInt(r * 8) - 1n >> 1n, s = -s), s;
    }
  });
}
function fu(e, t = 4, n = !0) {
  if (typeof e == "number")
    return e;
  if (Y(e))
    try {
      const r = vo(t, n).decode(e);
      return r > Number.MAX_SAFE_INTEGER ? void 0 : Number(r);
    } catch {
      return;
    }
}
const _ = St({
  encodeStream: (e, t) => {
    for (let n of t) {
      if (typeof n == "string") {
        if (ct[n] === void 0)
          throw new Error(`Unknown opcode=${n}`);
        e.byte(ct[n]);
        continue;
      } else if (typeof n == "number") {
        if (n === 0) {
          e.byte(0);
          continue;
        } else if (1 <= n && n <= 16) {
          e.byte(ct.OP_1 - 1 + n);
          continue;
        }
      }
      if (typeof n == "number" && (n = vo().encode(BigInt(n))), !Y(n))
        throw new Error(`Wrong Script OP=${n} (${typeof n})`);
      const r = n.length;
      r < ct.PUSHDATA1 ? e.byte(r) : r <= 255 ? (e.byte(ct.PUSHDATA1), e.byte(r)) : r <= 65535 ? (e.byte(ct.PUSHDATA2), e.bytes(Go.encode(r))) : (e.byte(ct.PUSHDATA4), e.bytes(W.encode(r))), e.bytes(n);
    }
  },
  decodeStream: (e) => {
    const t = [];
    for (; !e.isEnd(); ) {
      const n = e.byte();
      if (ct.OP_0 < n && n <= ct.PUSHDATA4) {
        let r;
        if (n < ct.PUSHDATA1)
          r = n;
        else if (n === ct.PUSHDATA1)
          r = se.decodeStream(e);
        else if (n === ct.PUSHDATA2)
          r = Go.decodeStream(e);
        else if (n === ct.PUSHDATA4)
          r = W.decodeStream(e);
        else
          throw new Error("Should be not possible");
        t.push(e.bytes(r));
      } else if (n === 0)
        t.push(0);
      else if (ct.OP_1 <= n && n <= ct.OP_16)
        t.push(n - (ct.OP_1 - 1));
      else {
        const r = uu[n];
        if (r === void 0)
          throw new Error(`Unknown opcode=${n.toString(16)}`);
        t.push(r);
      }
    }
    return t;
  }
}), as = {
  253: [253, 2, 253n, 65535n],
  254: [254, 4, 65536n, 4294967295n],
  255: [255, 8, 4294967296n, 18446744073709551615n]
}, fr = St({
  encodeStream: (e, t) => {
    if (typeof t == "number" && (t = BigInt(t)), 0n <= t && t <= 252n)
      return e.byte(Number(t));
    for (const [n, r, o, s] of Object.values(as))
      if (!(o > t || t > s)) {
        e.byte(n);
        for (let i = 0; i < r; i++)
          e.byte(Number(t >> 8n * BigInt(i) & 0xffn));
        return;
      }
    throw e.err(`VarInt too big: ${t}`);
  },
  decodeStream: (e) => {
    const t = e.byte();
    if (t <= 252)
      return BigInt(t);
    const [n, r, o] = as[t];
    let s = 0n;
    for (let i = 0; i < r; i++)
      s |= BigInt(e.byte()) << 8n * BigInt(i);
    if (s < o)
      throw e.err(`Wrong CompactSize(${8 * r})`);
    return s;
  }
}), Vt = ae(fr, ir.numberBigint), $t = Z(fr), ko = xt(Vt, $t), Kn = (e) => xt(fr, e), Wi = ut({
  txid: Z(32, !0),
  // hash(prev_tx),
  index: W,
  // output number of previous tx
  finalScriptSig: $t,
  // btc merges input and output script, executes it. If ok = tx passes
  sequence: W
  // ?
}), ge = ut({ amount: In, script: $t }), lu = ut({
  version: ke,
  segwitFlag: pa(new Uint8Array([0, 1])),
  inputs: Kn(Wi),
  outputs: Kn(ge),
  witnesses: ga("segwitFlag", xt("inputs/length", ko)),
  // < 500000000	Block number at which this transaction is unlocked
  // >= 500000000	UNIX timestamp at which this transaction is unlocked
  // Handled as part of PSBTv2
  lockTime: W
});
function du(e) {
  if (e.segwitFlag && e.witnesses && !e.witnesses.length)
    throw new Error("Segwit flag with empty witnesses array");
  return e;
}
const Be = bt(lu, du), je = ut({
  version: ke,
  inputs: Kn(Wi),
  outputs: Kn(ge),
  lockTime: W
}), Mr = bt(Z(null), (e) => Le(e, Tt.ecdsa)), Fn = bt(Z(32), (e) => Le(e, Tt.schnorr)), us = bt(Z(null), (e) => {
  if (e.length !== 64 && e.length !== 65)
    throw new Error("Schnorr signature should be 64 or 65 bytes long");
  return e;
}), lr = ut({
  fingerprint: la,
  path: xt(null, W)
}), zi = ut({
  hashes: xt(Vt, Z(32)),
  der: lr
}), hu = Z(78), pu = ut({ pubKey: Fn, leafHash: Z(32) }), gu = ut({
  version: se,
  // With parity :(
  internalKey: Z(32),
  merklePath: xt(null, Z(32))
}), Pt = bt(gu, (e) => {
  if (e.merklePath.length > 128)
    throw new Error("TaprootControlBlock: merklePath should be of length 0..128 (inclusive)");
  return e;
}), wu = xt(null, ut({
  depth: se,
  version: se,
  script: $t
})), nt = Z(null), fs = Z(20), Fe = Z(32), Ao = {
  unsignedTx: [0, !1, je, [0], [0], !1],
  xpub: [1, hu, lr, [], [0, 2], !1],
  txVersion: [2, !1, W, [2], [2], !1],
  fallbackLocktime: [3, !1, W, [], [2], !1],
  inputCount: [4, !1, Vt, [2], [2], !1],
  outputCount: [5, !1, Vt, [2], [2], !1],
  txModifiable: [6, !1, se, [], [2], !1],
  // TODO: bitfield
  version: [251, !1, W, [], [0, 2], !1],
  proprietary: [252, nt, nt, [], [0, 2], !1]
}, dr = {
  nonWitnessUtxo: [0, !1, Be, [], [0, 2], !1],
  witnessUtxo: [1, !1, ge, [], [0, 2], !1],
  partialSig: [2, Mr, nt, [], [0, 2], !1],
  sighashType: [3, !1, W, [], [0, 2], !1],
  redeemScript: [4, !1, nt, [], [0, 2], !1],
  witnessScript: [5, !1, nt, [], [0, 2], !1],
  bip32Derivation: [6, Mr, lr, [], [0, 2], !1],
  finalScriptSig: [7, !1, nt, [], [0, 2], !1],
  finalScriptWitness: [8, !1, ko, [], [0, 2], !1],
  porCommitment: [9, !1, nt, [], [0, 2], !1],
  ripemd160: [10, fs, nt, [], [0, 2], !1],
  sha256: [11, Fe, nt, [], [0, 2], !1],
  hash160: [12, fs, nt, [], [0, 2], !1],
  hash256: [13, Fe, nt, [], [0, 2], !1],
  txid: [14, !1, Fe, [2], [2], !0],
  index: [15, !1, W, [2], [2], !0],
  sequence: [16, !1, W, [], [2], !0],
  requiredTimeLocktime: [17, !1, W, [], [2], !1],
  requiredHeightLocktime: [18, !1, W, [], [2], !1],
  tapKeySig: [19, !1, us, [], [0, 2], !1],
  tapScriptSig: [20, pu, us, [], [0, 2], !1],
  tapLeafScript: [21, Pt, nt, [], [0, 2], !1],
  tapBip32Derivation: [22, Fe, zi, [], [0, 2], !1],
  tapInternalKey: [23, !1, Fn, [], [0, 2], !1],
  tapMerkleRoot: [24, !1, Fe, [], [0, 2], !1],
  proprietary: [252, nt, nt, [], [0, 2], !1]
}, yu = [
  "txid",
  "sequence",
  "index",
  "witnessUtxo",
  "nonWitnessUtxo",
  "finalScriptSig",
  "finalScriptWitness",
  "unknown"
], mu = [
  "partialSig",
  "finalScriptSig",
  "finalScriptWitness",
  "tapKeySig",
  "tapScriptSig"
], Wn = {
  redeemScript: [0, !1, nt, [], [0, 2], !1],
  witnessScript: [1, !1, nt, [], [0, 2], !1],
  bip32Derivation: [2, Mr, lr, [], [0, 2], !1],
  amount: [3, !1, ua, [2], [2], !0],
  script: [4, !1, nt, [2], [2], !0],
  tapInternalKey: [5, !1, Fn, [], [0, 2], !1],
  tapTree: [6, !1, wu, [], [0, 2], !1],
  tapBip32Derivation: [7, Fn, zi, [], [0, 2], !1],
  proprietary: [252, nt, nt, [], [0, 2], !1]
}, Eu = [], ls = xt(Zs, ut({
  //  <key> := <keylen> <keytype> <keydata> WHERE keylen = len(keytype)+len(keydata)
  key: da(Vt, ut({ type: Vt, key: Z(null) })),
  //  <value> := <valuelen> <valuedata>
  value: Z(Vt)
}));
function Kr(e) {
  const [t, n, r, o, s, i] = e;
  return { type: t, kc: n, vc: r, reqInc: o, allowInc: s, silentIgnore: i };
}
ut({ type: Vt, key: Z(null) });
function Io(e) {
  const t = {};
  for (const n in e) {
    const [r, o, s] = e[n];
    t[r] = [n, o, s];
  }
  return St({
    encodeStream: (n, r) => {
      let o = [];
      for (const s in e) {
        const i = r[s];
        if (i === void 0)
          continue;
        const [c, a, u] = e[s];
        if (!a)
          o.push({ key: { type: c, key: X }, value: u.encode(i) });
        else {
          const f = i.map(([l, d]) => [
            a.encode(l),
            u.encode(d)
          ]);
          f.sort((l, d) => Mn(l[0], d[0]));
          for (const [l, d] of f)
            o.push({ key: { key: l, type: c }, value: d });
        }
      }
      if (r.unknown) {
        r.unknown.sort((s, i) => Mn(s[0].key, i[0].key));
        for (const [s, i] of r.unknown)
          o.push({ key: s, value: i });
      }
      ls.encodeStream(n, o);
    },
    decodeStream: (n) => {
      const r = ls.decodeStream(n), o = {}, s = {};
      for (const i of r) {
        let c = "unknown", a = i.key.key, u = i.value;
        if (t[i.key.type]) {
          const [f, l, d] = t[i.key.type];
          if (c = f, !l && a.length)
            throw new Error(`PSBT: Non-empty key for ${c} (key=${x.encode(a)} value=${x.encode(u)}`);
          if (a = l ? l.decode(a) : void 0, u = d.decode(u), !l) {
            if (o[c])
              throw new Error(`PSBT: Same keys: ${c} (key=${a} value=${u})`);
            o[c] = u, s[c] = !0;
            continue;
          }
        } else
          a = { type: i.key.type, key: i.key.key };
        if (s[c])
          throw new Error(`PSBT: Key type with empty key and no key=${c} val=${u}`);
        o[c] || (o[c] = []), o[c].push([a, u]);
      }
      return o;
    }
  });
}
const Bo = bt(Io(dr), (e) => {
  if (e.finalScriptWitness && !e.finalScriptWitness.length)
    throw new Error("validateInput: empty finalScriptWitness");
  if (e.partialSig && !e.partialSig.length)
    throw new Error("Empty partialSig");
  if (e.partialSig)
    for (const [t] of e.partialSig)
      Le(t, Tt.ecdsa);
  if (e.bip32Derivation)
    for (const [t] of e.bip32Derivation)
      Le(t, Tt.ecdsa);
  if (e.requiredTimeLocktime !== void 0 && e.requiredTimeLocktime < 5e8)
    throw new Error(`validateInput: wrong timeLocktime=${e.requiredTimeLocktime}`);
  if (e.requiredHeightLocktime !== void 0 && (e.requiredHeightLocktime <= 0 || e.requiredHeightLocktime >= 5e8))
    throw new Error(`validateInput: wrong heighLocktime=${e.requiredHeightLocktime}`);
  if (e.tapLeafScript)
    for (const [t, n] of e.tapLeafScript) {
      if ((t.version & 254) !== n[n.length - 1])
        throw new Error("validateInput: tapLeafScript version mimatch");
      if (n[n.length - 1] & 1)
        throw new Error("validateInput: tapLeafScript version has parity bit!");
    }
  return e;
}), Oo = bt(Io(Wn), (e) => {
  if (e.bip32Derivation)
    for (const [t] of e.bip32Derivation)
      Le(t, Tt.ecdsa);
  return e;
}), Gi = bt(Io(Ao), (e) => {
  if ((e.version || 0) === 0) {
    if (!e.unsignedTx)
      throw new Error("PSBTv0: missing unsignedTx");
    for (const n of e.unsignedTx.inputs)
      if (n.finalScriptSig && n.finalScriptSig.length)
        throw new Error("PSBTv0: input scriptSig found in unsignedTx");
  }
  return e;
}), xu = ut({
  magic: ho(lo(new Uint8Array([255])), "psbt"),
  global: Gi,
  inputs: xt("global/unsignedTx/inputs/length", Bo),
  outputs: xt(null, Oo)
}), bu = ut({
  magic: ho(lo(new Uint8Array([255])), "psbt"),
  global: Gi,
  inputs: xt("global/inputCount", Bo),
  outputs: xt("global/outputCount", Oo)
});
ut({
  magic: ho(lo(new Uint8Array([255])), "psbt"),
  items: xt(null, ae(xt(Zs, wa([ha(Vt), Z(fr)])), ir.dict()))
});
function Er(e, t, n) {
  for (const r in n) {
    if (r === "unknown" || !t[r])
      continue;
    const { allowInc: o } = Kr(t[r]);
    if (!o.includes(e))
      throw new Error(`PSBTv${e}: field ${r} is not allowed`);
  }
  for (const r in t) {
    const { reqInc: o } = Kr(t[r]);
    if (o.includes(e) && n[r] === void 0)
      throw new Error(`PSBTv${e}: missing required field ${r}`);
  }
}
function ds(e, t, n) {
  const r = {};
  for (const o in n) {
    const s = o;
    if (s !== "unknown") {
      if (!t[s])
        continue;
      const { allowInc: i, silentIgnore: c } = Kr(t[s]);
      if (!i.includes(e)) {
        if (c)
          continue;
        throw new Error(`Failed to serialize in PSBTv${e}: ${s} but versions allows inclusion=${i}`);
      }
    }
    r[s] = n[s];
  }
  return r;
}
function ji(e) {
  const t = e && e.global && e.global.version || 0;
  Er(t, Ao, e.global);
  for (const i of e.inputs)
    Er(t, dr, i);
  for (const i of e.outputs)
    Er(t, Wn, i);
  const n = t ? e.global.inputCount : e.global.unsignedTx.inputs.length;
  if (e.inputs.length < n)
    throw new Error("Not enough inputs");
  const r = e.inputs.slice(n);
  if (r.length > 1 || r.length && Object.keys(r[0]).length)
    throw new Error(`Unexpected inputs left in tx=${r}`);
  const o = t ? e.global.outputCount : e.global.unsignedTx.outputs.length;
  if (e.outputs.length < o)
    throw new Error("Not outputs inputs");
  const s = e.outputs.slice(o);
  if (s.length > 1 || s.length && Object.keys(s[0]).length)
    throw new Error(`Unexpected outputs left in tx=${s}`);
  return e;
}
function Fr(e, t, n, r, o) {
  const s = { ...n, ...t };
  for (const i in e) {
    const c = i, [a, u, f] = e[c], l = r && !r.includes(i);
    if (t[i] === void 0 && i in t) {
      if (l)
        throw new Error(`Cannot remove signed field=${i}`);
      delete s[i];
    } else if (u) {
      const d = n && n[i] ? n[i] : [];
      let h = t[c];
      if (h) {
        if (!Array.isArray(h))
          throw new Error(`keyMap(${i}): KV pairs should be [k, v][]`);
        h = h.map((y) => {
          if (y.length !== 2)
            throw new Error(`keyMap(${i}): KV pairs should be [k, v][]`);
          return [
            typeof y[0] == "string" ? u.decode(x.decode(y[0])) : y[0],
            typeof y[1] == "string" ? f.decode(x.decode(y[1])) : y[1]
          ];
        });
        const g = {}, p = (y, m, b) => {
          if (g[y] === void 0) {
            g[y] = [m, b];
            return;
          }
          const k = x.encode(f.encode(g[y][1])), N = x.encode(f.encode(b));
          if (k !== N)
            throw new Error(`keyMap(${c}): same key=${y} oldVal=${k} newVal=${N}`);
        };
        for (const [y, m] of d) {
          const b = x.encode(u.encode(y));
          p(b, y, m);
        }
        for (const [y, m] of h) {
          const b = x.encode(u.encode(y));
          if (m === void 0) {
            if (l)
              throw new Error(`Cannot remove signed field=${c}/${y}`);
            delete g[b];
          } else
            p(b, y, m);
        }
        s[c] = Object.values(g);
      }
    } else if (typeof s[i] == "string")
      s[i] = f.decode(x.decode(s[i]));
    else if (l && i in t && n && n[i] !== void 0 && !rt(f.encode(t[i]), f.encode(n[i])))
      throw new Error(`Cannot change signed field=${i}`);
  }
  for (const i in s)
    if (!e[i]) {
      if (o && i === "unknown")
        continue;
      delete s[i];
    }
  return s;
}
const hs = bt(xu, ji), ps = bt(bu, ji), Su = {
  encode(e) {
    if (!(e.length !== 2 || e[0] !== 1 || !Y(e[1]) || x.encode(e[1]) !== "4e73"))
      return { type: "p2a", script: _.encode(e) };
  },
  decode: (e) => {
    if (e.type === "p2a")
      return [1, x.decode("4e73")];
  }
};
function Ae(e, t) {
  try {
    return Le(e, t), !0;
  } catch {
    return !1;
  }
}
const Tu = {
  encode(e) {
    if (!(e.length !== 2 || !Y(e[0]) || !Ae(e[0], Tt.ecdsa) || e[1] !== "CHECKSIG"))
      return { type: "pk", pubkey: e[0] };
  },
  decode: (e) => e.type === "pk" ? [e.pubkey, "CHECKSIG"] : void 0
}, vu = {
  encode(e) {
    if (!(e.length !== 5 || e[0] !== "DUP" || e[1] !== "HASH160" || !Y(e[2])) && !(e[3] !== "EQUALVERIFY" || e[4] !== "CHECKSIG"))
      return { type: "pkh", hash: e[2] };
  },
  decode: (e) => e.type === "pkh" ? ["DUP", "HASH160", e.hash, "EQUALVERIFY", "CHECKSIG"] : void 0
}, ku = {
  encode(e) {
    if (!(e.length !== 3 || e[0] !== "HASH160" || !Y(e[1]) || e[2] !== "EQUAL"))
      return { type: "sh", hash: e[1] };
  },
  decode: (e) => e.type === "sh" ? ["HASH160", e.hash, "EQUAL"] : void 0
}, Au = {
  encode(e) {
    if (!(e.length !== 2 || e[0] !== 0 || !Y(e[1])) && e[1].length === 32)
      return { type: "wsh", hash: e[1] };
  },
  decode: (e) => e.type === "wsh" ? [0, e.hash] : void 0
}, Iu = {
  encode(e) {
    if (!(e.length !== 2 || e[0] !== 0 || !Y(e[1])) && e[1].length === 20)
      return { type: "wpkh", hash: e[1] };
  },
  decode: (e) => e.type === "wpkh" ? [0, e.hash] : void 0
}, Bu = {
  encode(e) {
    const t = e.length - 1;
    if (e[t] !== "CHECKMULTISIG")
      return;
    const n = e[0], r = e[t - 1];
    if (typeof n != "number" || typeof r != "number")
      return;
    const o = e.slice(1, -2);
    if (r === o.length) {
      for (const s of o)
        if (!Y(s))
          return;
      return { type: "ms", m: n, pubkeys: o };
    }
  },
  // checkmultisig(n, ..pubkeys, m)
  decode: (e) => e.type === "ms" ? [e.m, ...e.pubkeys, e.pubkeys.length, "CHECKMULTISIG"] : void 0
}, Ou = {
  encode(e) {
    if (!(e.length !== 2 || e[0] !== 1 || !Y(e[1])))
      return { type: "tr", pubkey: e[1] };
  },
  decode: (e) => e.type === "tr" ? [1, e.pubkey] : void 0
}, Uu = {
  encode(e) {
    const t = e.length - 1;
    if (e[t] !== "CHECKSIG")
      return;
    const n = [];
    for (let r = 0; r < t; r++) {
      const o = e[r];
      if (r & 1) {
        if (o !== "CHECKSIGVERIFY" || r === t - 1)
          return;
        continue;
      }
      if (!Y(o))
        return;
      n.push(o);
    }
    return { type: "tr_ns", pubkeys: n };
  },
  decode: (e) => {
    if (e.type !== "tr_ns")
      return;
    const t = [];
    for (let n = 0; n < e.pubkeys.length - 1; n++)
      t.push(e.pubkeys[n], "CHECKSIGVERIFY");
    return t.push(e.pubkeys[e.pubkeys.length - 1], "CHECKSIG"), t;
  }
}, Nu = {
  encode(e) {
    const t = e.length - 1;
    if (e[t] !== "NUMEQUAL" || e[1] !== "CHECKSIG")
      return;
    const n = [], r = fu(e[t - 1]);
    if (typeof r == "number") {
      for (let o = 0; o < t - 1; o++) {
        const s = e[o];
        if (o & 1) {
          if (s !== (o === 1 ? "CHECKSIG" : "CHECKSIGADD"))
            throw new Error("OutScript.encode/tr_ms: wrong element");
          continue;
        }
        if (!Y(s))
          throw new Error("OutScript.encode/tr_ms: wrong key element");
        n.push(s);
      }
      return { type: "tr_ms", pubkeys: n, m: r };
    }
  },
  decode: (e) => {
    if (e.type !== "tr_ms")
      return;
    const t = [e.pubkeys[0], "CHECKSIG"];
    for (let n = 1; n < e.pubkeys.length; n++)
      t.push(e.pubkeys[n], "CHECKSIGADD");
    return t.push(e.m, "NUMEQUAL"), t;
  }
}, Cu = {
  encode(e) {
    return { type: "unknown", script: _.encode(e) };
  },
  decode: (e) => e.type === "unknown" ? _.decode(e.script) : void 0
}, $u = [
  Su,
  Tu,
  vu,
  ku,
  Au,
  Iu,
  Bu,
  Ou,
  Uu,
  Nu,
  Cu
], Lu = ae(_, ir.match($u)), st = bt(Lu, (e) => {
  if (e.type === "pk" && !Ae(e.pubkey, Tt.ecdsa))
    throw new Error("OutScript/pk: wrong key");
  if ((e.type === "pkh" || e.type === "sh" || e.type === "wpkh") && (!Y(e.hash) || e.hash.length !== 20))
    throw new Error(`OutScript/${e.type}: wrong hash`);
  if (e.type === "wsh" && (!Y(e.hash) || e.hash.length !== 32))
    throw new Error("OutScript/wsh: wrong hash");
  if (e.type === "tr" && (!Y(e.pubkey) || !Ae(e.pubkey, Tt.schnorr)))
    throw new Error("OutScript/tr: wrong taproot public key");
  if ((e.type === "ms" || e.type === "tr_ns" || e.type === "tr_ms") && !Array.isArray(e.pubkeys))
    throw new Error("OutScript/multisig: wrong pubkeys array");
  if (e.type === "ms") {
    const t = e.pubkeys.length;
    for (const n of e.pubkeys)
      if (!Ae(n, Tt.ecdsa))
        throw new Error("OutScript/multisig: wrong pubkey");
    if (e.m <= 0 || t > 16 || e.m > t)
      throw new Error("OutScript/multisig: invalid params");
  }
  if (e.type === "tr_ns" || e.type === "tr_ms") {
    for (const t of e.pubkeys)
      if (!Ae(t, Tt.schnorr))
        throw new Error(`OutScript/${e.type}: wrong pubkey`);
  }
  if (e.type === "tr_ms") {
    const t = e.pubkeys.length;
    if (e.m <= 0 || t > 999 || e.m > t)
      throw new Error("OutScript/tr_ms: invalid params");
  }
  return e;
});
function gs(e, t) {
  if (!rt(e.hash, dt(t)))
    throw new Error("checkScript: wsh wrong witnessScript hash");
  const n = st.decode(t);
  if (n.type === "tr" || n.type === "tr_ns" || n.type === "tr_ms")
    throw new Error(`checkScript: P2${n.type} cannot be wrapped in P2SH`);
  if (n.type === "wpkh" || n.type === "sh")
    throw new Error(`checkScript: P2${n.type} cannot be wrapped in P2WSH`);
}
function Yi(e, t, n) {
  if (e) {
    const r = st.decode(e);
    if (r.type === "tr_ns" || r.type === "tr_ms" || r.type === "ms" || r.type == "pk")
      throw new Error(`checkScript: non-wrapped ${r.type}`);
    if (r.type === "sh" && t) {
      if (!rt(r.hash, Di(t)))
        throw new Error("checkScript: sh wrong redeemScript hash");
      const o = st.decode(t);
      if (o.type === "tr" || o.type === "tr_ns" || o.type === "tr_ms")
        throw new Error(`checkScript: P2${o.type} cannot be wrapped in P2SH`);
      if (o.type === "sh")
        throw new Error("checkScript: P2SH cannot be wrapped in P2SH");
    }
    r.type === "wsh" && n && gs(r, n);
  }
  if (t) {
    const r = st.decode(t);
    r.type === "wsh" && n && gs(r, n);
  }
}
function Ru(e) {
  const t = {};
  for (const n of e) {
    const r = x.encode(n);
    if (t[r])
      throw new Error(`Multisig: non-uniq pubkey: ${e.map(x.encode)}`);
    t[r] = !0;
  }
}
function Pu(e, t, n = !1, r) {
  const o = st.decode(e);
  if (o.type === "unknown" && n)
    return;
  if (!["tr_ns", "tr_ms"].includes(o.type))
    throw new Error(`P2TR: invalid leaf script=${o.type}`);
  const s = o;
  if (!n && s.pubkeys)
    for (const i of s.pubkeys) {
      if (rt(i, To))
        throw new Error("Unspendable taproot key in leaf script");
      if (rt(i, t))
        throw new Error("Using P2TR with leaf script with same key as internal key is not supported");
    }
}
function qi(e) {
  const t = Array.from(e);
  for (; t.length >= 2; ) {
    t.sort((i, c) => (c.weight || 1) - (i.weight || 1));
    const r = t.pop(), o = t.pop(), s = (o?.weight || 1) + (r?.weight || 1);
    t.push({
      weight: s,
      // Unwrap children array
      // TODO: Very hard to remove any here
      childs: [o?.childs || o, r?.childs || r]
    });
  }
  const n = t[0];
  return n?.childs || n;
}
function Wr(e, t = []) {
  if (!e)
    throw new Error("taprootAddPath: empty tree");
  if (e.type === "leaf")
    return { ...e, path: t };
  if (e.type !== "branch")
    throw new Error(`taprootAddPath: wrong type=${e}`);
  return {
    ...e,
    path: t,
    // Left element has right hash in path and otherwise
    left: Wr(e.left, [e.right.hash, ...t]),
    right: Wr(e.right, [e.left.hash, ...t])
  };
}
function zr(e) {
  if (!e)
    throw new Error("taprootAddPath: empty tree");
  if (e.type === "leaf")
    return [e];
  if (e.type !== "branch")
    throw new Error(`taprootWalkTree: wrong type=${e}`);
  return [...zr(e.left), ...zr(e.right)];
}
function Gr(e, t, n = !1, r) {
  if (!e)
    throw new Error("taprootHashTree: empty tree");
  if (Array.isArray(e) && e.length === 1 && (e = e[0]), !Array.isArray(e)) {
    const { leafVersion: a, script: u } = e;
    if (e.tapLeafScript || e.tapMerkleRoot && !rt(e.tapMerkleRoot, X))
      throw new Error("P2TR: tapRoot leafScript cannot have tree");
    const f = typeof u == "string" ? x.decode(u) : u;
    if (!Y(f))
      throw new Error(`checkScript: wrong script type=${f}`);
    return Pu(f, t, n), {
      type: "leaf",
      version: a,
      script: f,
      hash: qe(f, a)
    };
  }
  if (e.length !== 2 && (e = qi(e)), e.length !== 2)
    throw new Error("hashTree: non binary tree!");
  const o = Gr(e[0], t, n), s = Gr(e[1], t, n);
  let [i, c] = [o.hash, s.hash];
  return Mn(c, i) === -1 && ([i, c] = [c, i]), { type: "branch", left: o, right: s, hash: So("TapBranch", i, c) };
}
const zn = 192, qe = (e, t = zn) => So("TapLeaf", new Uint8Array([t]), $t.encode(e));
function _u(e, t, n = Re, r = !1, o) {
  if (!e && !t)
    throw new Error("p2tr: should have pubKey or scriptTree (or both)");
  const s = typeof e == "string" ? x.decode(e) : e || To;
  if (!Ae(s, Tt.schnorr))
    throw new Error("p2tr: non-schnorr pubkey");
  if (t) {
    let i = Wr(Gr(t, s, r));
    const c = i.hash, [a, u] = Dr(s, c), f = zr(i).map((l) => ({
      ...l,
      controlBlock: Pt.encode({
        version: (l.version || zn) + u,
        internalKey: s,
        merklePath: l.path
      })
    }));
    return {
      type: "tr",
      script: st.encode({ type: "tr", pubkey: a }),
      address: ye(n).encode({ type: "tr", pubkey: a }),
      // For tests
      tweakedPubkey: a,
      // PSBT stuff
      tapInternalKey: s,
      leaves: f,
      tapLeafScript: f.map((l) => [
        Pt.decode(l.controlBlock),
        re(l.script, new Uint8Array([l.version || zn]))
      ]),
      tapMerkleRoot: c
    };
  } else {
    const i = Dr(s, X)[0];
    return {
      type: "tr",
      script: st.encode({ type: "tr", pubkey: i }),
      address: ye(n).encode({ type: "tr", pubkey: i }),
      // For tests
      tweakedPubkey: i,
      // PSBT stuff
      tapInternalKey: s
    };
  }
}
function Vu(e, t, n = !1) {
  return n || Ru(t), {
    type: "tr_ms",
    script: st.encode({ type: "tr_ms", pubkeys: t, m: e })
  };
}
const Zi = Xc(dt);
function Xi(e, t) {
  if (t.length < 2 || t.length > 40)
    throw new Error("Witness: invalid length");
  if (e > 16)
    throw new Error("Witness: invalid version");
  if (e === 0 && !(t.length === 20 || t.length === 32))
    throw new Error("Witness: invalid length for version");
}
function xr(e, t, n = Re) {
  Xi(e, t);
  const r = e === 0 ? $r : ve;
  return r.encode(n.bech32, [e].concat(r.toWords(t)));
}
function ws(e, t) {
  return Zi.encode(re(Uint8Array.from(t), e));
}
function ye(e = Re) {
  return {
    encode(t) {
      const { type: n } = t;
      if (n === "wpkh")
        return xr(0, t.hash, e);
      if (n === "wsh")
        return xr(0, t.hash, e);
      if (n === "tr")
        return xr(1, t.pubkey, e);
      if (n === "pkh")
        return ws(t.hash, [e.pubKeyHash]);
      if (n === "sh")
        return ws(t.hash, [e.scriptHash]);
      throw new Error(`Unknown address type=${n}`);
    },
    decode(t) {
      if (t.length < 14 || t.length > 74)
        throw new Error("Invalid address length");
      if (e.bech32 && t.toLowerCase().startsWith(`${e.bech32}1`)) {
        let r;
        try {
          if (r = $r.decode(t), r.words[0] !== 0)
            throw new Error(`bech32: wrong version=${r.words[0]}`);
        } catch {
          if (r = ve.decode(t), r.words[0] === 0)
            throw new Error(`bech32m: wrong version=${r.words[0]}`);
        }
        if (r.prefix !== e.bech32)
          throw new Error(`wrong bech32 prefix=${r.prefix}`);
        const [o, ...s] = r.words, i = $r.fromWords(s);
        if (Xi(o, i), o === 0 && i.length === 32)
          return { type: "wsh", hash: i };
        if (o === 0 && i.length === 20)
          return { type: "wpkh", hash: i };
        if (o === 1 && i.length === 32)
          return { type: "tr", pubkey: i };
        throw new Error("Unknown witness program");
      }
      const n = Zi.decode(t);
      if (n.length !== 21)
        throw new Error("Invalid base58 address");
      if (n[0] === e.pubKeyHash)
        return { type: "pkh", hash: n.slice(1) };
      if (n[0] === e.scriptHash)
        return {
          type: "sh",
          hash: n.slice(1)
        };
      throw new Error(`Invalid address prefix=${n[0]}`);
    }
  };
}
const bn = new Uint8Array(32), Hu = {
  amount: 0xffffffffffffffffn,
  script: X
}, Du = (e) => Math.ceil(e / 4), Mu = 8, Ku = 2, fe = 0, Uo = 4294967295;
ir.decimal(Mu);
const Ze = (e, t) => e === void 0 ? t : e;
function Gn(e) {
  if (Array.isArray(e))
    return e.map((t) => Gn(t));
  if (Y(e))
    return Uint8Array.from(e);
  if (["number", "bigint", "boolean", "string", "undefined"].includes(typeof e))
    return e;
  if (e === null)
    return e;
  if (typeof e == "object")
    return Object.fromEntries(Object.entries(e).map(([t, n]) => [t, Gn(n)]));
  throw new Error(`cloneDeep: unknown type=${e} (${typeof e})`);
}
const M = {
  DEFAULT: 0,
  ALL: 1,
  NONE: 2,
  SINGLE: 3,
  ANYONECANPAY: 128
}, me = {
  DEFAULT: M.DEFAULT,
  ALL: M.ALL,
  NONE: M.NONE,
  SINGLE: M.SINGLE,
  DEFAULT_ANYONECANPAY: M.DEFAULT | M.ANYONECANPAY,
  ALL_ANYONECANPAY: M.ALL | M.ANYONECANPAY,
  NONE_ANYONECANPAY: M.NONE | M.ANYONECANPAY,
  SINGLE_ANYONECANPAY: M.SINGLE | M.ANYONECANPAY
}, Fu = Fi(me);
function Wu(e, t, n, r = X) {
  return rt(n, t) && (e = au(e, r), t = bo(e)), { privKey: e, pubKey: t };
}
function le(e) {
  if (e.script === void 0 || e.amount === void 0)
    throw new Error("Transaction/output: script and amount required");
  return { script: e.script, amount: e.amount };
}
function We(e) {
  if (e.txid === void 0 || e.index === void 0)
    throw new Error("Transaction/input: txid and index required");
  return {
    txid: e.txid,
    index: e.index,
    sequence: Ze(e.sequence, Uo),
    finalScriptSig: Ze(e.finalScriptSig, X)
  };
}
function br(e) {
  for (const t in e) {
    const n = t;
    yu.includes(n) || delete e[n];
  }
}
const Sr = ut({ txid: Z(32, !0), index: W });
function zu(e) {
  if (typeof e != "number" || typeof Fu[e] != "string")
    throw new Error(`Invalid SigHash=${e}`);
  return e;
}
function ys(e) {
  const t = e & 31;
  return {
    isAny: !!(e & M.ANYONECANPAY),
    isNone: t === M.NONE,
    isSingle: t === M.SINGLE
  };
}
function Gu(e) {
  if (e !== void 0 && {}.toString.call(e) !== "[object Object]")
    throw new Error(`Wrong object type for transaction options: ${e}`);
  const t = {
    ...e,
    // Defaults
    version: Ze(e.version, Ku),
    lockTime: Ze(e.lockTime, 0),
    PSBTVersion: Ze(e.PSBTVersion, 0)
  };
  if (typeof t.allowUnknowInput < "u" && (e.allowUnknownInputs = t.allowUnknowInput), typeof t.allowUnknowOutput < "u" && (e.allowUnknownOutputs = t.allowUnknowOutput), typeof t.lockTime != "number")
    throw new Error("Transaction lock time should be number");
  if (W.encode(t.lockTime), t.PSBTVersion !== 0 && t.PSBTVersion !== 2)
    throw new Error(`Unknown PSBT version ${t.PSBTVersion}`);
  for (const n of [
    "allowUnknownVersion",
    "allowUnknownOutputs",
    "allowUnknownInputs",
    "disableScriptCheck",
    "bip174jsCompat",
    "allowLegacyWitnessUtxo",
    "lowR"
  ]) {
    const r = t[n];
    if (r !== void 0 && typeof r != "boolean")
      throw new Error(`Transation options wrong type: ${n}=${r} (${typeof r})`);
  }
  if (t.allowUnknownVersion ? typeof t.version == "number" : ![-1, 0, 1, 2, 3].includes(t.version))
    throw new Error(`Unknown version: ${t.version}`);
  if (t.customScripts !== void 0) {
    const n = t.customScripts;
    if (!Array.isArray(n))
      throw new Error(`wrong custom scripts type (expected array): customScripts=${n} (${typeof n})`);
    for (const r of n) {
      if (typeof r.encode != "function" || typeof r.decode != "function")
        throw new Error(`wrong script=${r} (${typeof r})`);
      if (r.finalizeTaproot !== void 0 && typeof r.finalizeTaproot != "function")
        throw new Error(`wrong script=${r} (${typeof r})`);
    }
  }
  return Object.freeze(t);
}
function ms(e) {
  if (e.nonWitnessUtxo && e.index !== void 0) {
    const t = e.nonWitnessUtxo.outputs.length - 1;
    if (e.index > t)
      throw new Error(`validateInput: index(${e.index}) not in nonWitnessUtxo`);
    const n = e.nonWitnessUtxo.outputs[e.index];
    if (e.witnessUtxo && (!rt(e.witnessUtxo.script, n.script) || e.witnessUtxo.amount !== n.amount))
      throw new Error("validateInput: witnessUtxo different from nonWitnessUtxo");
    if (e.txid) {
      if (e.nonWitnessUtxo.outputs.length - 1 < e.index)
        throw new Error("nonWitnessUtxo: incorect output index");
      const o = gt.fromRaw(Be.encode(e.nonWitnessUtxo), {
        allowUnknownOutputs: !0,
        disableScriptCheck: !0,
        allowUnknownInputs: !0
      }), s = x.encode(e.txid);
      if (o.isFinal && o.id !== s)
        throw new Error(`nonWitnessUtxo: wrong txid, exp=${s} got=${o.id}`);
    }
  }
  return e;
}
function On(e) {
  if (e.nonWitnessUtxo) {
    if (e.index === void 0)
      throw new Error("Unknown input index");
    return e.nonWitnessUtxo.outputs[e.index];
  } else {
    if (e.witnessUtxo)
      return e.witnessUtxo;
    throw new Error("Cannot find previous output info");
  }
}
function Es(e, t, n, r = !1, o = !1) {
  let { nonWitnessUtxo: s, txid: i } = e;
  typeof s == "string" && (s = x.decode(s)), Y(s) && (s = Be.decode(s)), !("nonWitnessUtxo" in e) && s === void 0 && (s = t?.nonWitnessUtxo), typeof i == "string" && (i = x.decode(i)), i === void 0 && (i = t?.txid);
  let c = { ...t, ...e, nonWitnessUtxo: s, txid: i };
  !("nonWitnessUtxo" in e) && c.nonWitnessUtxo === void 0 && delete c.nonWitnessUtxo, c.sequence === void 0 && (c.sequence = Uo), c.tapMerkleRoot === null && delete c.tapMerkleRoot, c = Fr(dr, c, t, n, o), Bo.encode(c);
  let a;
  return c.nonWitnessUtxo && c.index !== void 0 ? a = c.nonWitnessUtxo.outputs[c.index] : c.witnessUtxo && (a = c.witnessUtxo), a && !r && Yi(a && a.script, c.redeemScript, c.witnessScript), c;
}
function xs(e, t = !1) {
  let n = "legacy", r = M.ALL;
  const o = On(e), s = st.decode(o.script);
  let i = s.type, c = s;
  const a = [s];
  if (s.type === "tr")
    return r = M.DEFAULT, {
      txType: "taproot",
      type: "tr",
      last: s,
      lastScript: o.script,
      defaultSighash: r,
      sighash: e.sighashType || r
    };
  {
    if ((s.type === "wpkh" || s.type === "wsh") && (n = "segwit"), s.type === "sh") {
      if (!e.redeemScript)
        throw new Error("inputType: sh without redeemScript");
      let d = st.decode(e.redeemScript);
      (d.type === "wpkh" || d.type === "wsh") && (n = "segwit"), a.push(d), c = d, i += `-${d.type}`;
    }
    if (c.type === "wsh") {
      if (!e.witnessScript)
        throw new Error("inputType: wsh without witnessScript");
      let d = st.decode(e.witnessScript);
      d.type === "wsh" && (n = "segwit"), a.push(d), c = d, i += `-${d.type}`;
    }
    const u = a[a.length - 1];
    if (u.type === "sh" || u.type === "wsh")
      throw new Error("inputType: sh/wsh cannot be terminal type");
    const f = st.encode(u), l = {
      type: i,
      txType: n,
      last: u,
      lastScript: f,
      defaultSighash: r,
      sighash: e.sighashType || r
    };
    if (n === "legacy" && !t && !e.nonWitnessUtxo)
      throw new Error("Transaction/sign: legacy input without nonWitnessUtxo, can result in attack that forces paying higher fees. Pass allowLegacyWitnessUtxo=true, if you sure");
    return l;
  }
}
class gt {
  global = {};
  inputs = [];
  // use getInput()
  outputs = [];
  // use getOutput()
  opts;
  constructor(t = {}) {
    const n = this.opts = Gu(t);
    n.lockTime !== fe && (this.global.fallbackLocktime = n.lockTime), this.global.txVersion = n.version;
  }
  // Import
  static fromRaw(t, n = {}) {
    const r = Be.decode(t), o = new gt({ ...n, version: r.version, lockTime: r.lockTime });
    for (const s of r.outputs)
      o.addOutput(s);
    if (o.outputs = r.outputs, o.inputs = r.inputs, r.witnesses)
      for (let s = 0; s < r.witnesses.length; s++)
        o.inputs[s].finalScriptWitness = r.witnesses[s];
    return o;
  }
  // PSBT
  static fromPSBT(t, n = {}) {
    let r;
    try {
      r = hs.decode(t);
    } catch (l) {
      try {
        r = ps.decode(t);
      } catch {
        throw l;
      }
    }
    const o = r.global.version || 0;
    if (o !== 0 && o !== 2)
      throw new Error(`Wrong PSBT version=${o}`);
    const s = r.global.unsignedTx, i = o === 0 ? s?.version : r.global.txVersion, c = o === 0 ? s?.lockTime : r.global.fallbackLocktime, a = new gt({ ...n, version: i, lockTime: c, PSBTVersion: o }), u = o === 0 ? s?.inputs.length : r.global.inputCount;
    a.inputs = r.inputs.slice(0, u).map((l, d) => ms({
      finalScriptSig: X,
      ...r.global.unsignedTx?.inputs[d],
      ...l
    }));
    const f = o === 0 ? s?.outputs.length : r.global.outputCount;
    return a.outputs = r.outputs.slice(0, f).map((l, d) => ({
      ...l,
      ...r.global.unsignedTx?.outputs[d]
    })), a.global = { ...r.global, txVersion: i }, c !== fe && (a.global.fallbackLocktime = c), a;
  }
  toPSBT(t = this.opts.PSBTVersion) {
    if (t !== 0 && t !== 2)
      throw new Error(`Wrong PSBT version=${t}`);
    const n = this.inputs.map((s) => ms(ds(t, dr, s)));
    for (const s of n)
      s.partialSig && !s.partialSig.length && delete s.partialSig, s.finalScriptSig && !s.finalScriptSig.length && delete s.finalScriptSig, s.finalScriptWitness && !s.finalScriptWitness.length && delete s.finalScriptWitness;
    const r = this.outputs.map((s) => ds(t, Wn, s)), o = { ...this.global };
    return t === 0 ? (o.unsignedTx = je.decode(je.encode({
      version: this.version,
      lockTime: this.lockTime,
      inputs: this.inputs.map(We).map((s) => ({
        ...s,
        finalScriptSig: X
      })),
      outputs: this.outputs.map(le)
    })), delete o.fallbackLocktime, delete o.txVersion) : (o.version = t, o.txVersion = this.version, o.inputCount = this.inputs.length, o.outputCount = this.outputs.length, o.fallbackLocktime && o.fallbackLocktime === fe && delete o.fallbackLocktime), this.opts.bip174jsCompat && (n.length || n.push({}), r.length || r.push({})), (t === 0 ? hs : ps).encode({
      global: o,
      inputs: n,
      outputs: r
    });
  }
  // BIP370 lockTime (https://github.com/bitcoin/bips/blob/master/bip-0370.mediawiki#determining-lock-time)
  get lockTime() {
    let t = fe, n = 0, r = fe, o = 0;
    for (const s of this.inputs)
      s.requiredHeightLocktime && (t = Math.max(t, s.requiredHeightLocktime), n++), s.requiredTimeLocktime && (r = Math.max(r, s.requiredTimeLocktime), o++);
    return n && n >= o ? t : r !== fe ? r : this.global.fallbackLocktime || fe;
  }
  get version() {
    if (this.global.txVersion === void 0)
      throw new Error("No global.txVersion");
    return this.global.txVersion;
  }
  inputStatus(t) {
    this.checkInputIdx(t);
    const n = this.inputs[t];
    return n.finalScriptSig && n.finalScriptSig.length || n.finalScriptWitness && n.finalScriptWitness.length ? "finalized" : n.tapKeySig || n.tapScriptSig && n.tapScriptSig.length || n.partialSig && n.partialSig.length ? "signed" : "unsigned";
  }
  // Cannot replace unpackSighash, tests rely on very generic implemenetation with signing inputs outside of range
  // We will lose some vectors -> smaller test coverage of preimages (very important!)
  inputSighash(t) {
    this.checkInputIdx(t);
    const n = this.inputs[t].sighashType, r = n === void 0 ? M.DEFAULT : n, o = r === M.DEFAULT ? M.ALL : r & 3;
    return { sigInputs: r & M.ANYONECANPAY, sigOutputs: o };
  }
  // Very nice for debug purposes, but slow. If there is too much inputs/outputs to add, will be quadratic.
  // Some cache will be nice, but there chance to have bugs with cache invalidation
  signStatus() {
    let t = !0, n = !0, r = [], o = [];
    for (let s = 0; s < this.inputs.length; s++) {
      if (this.inputStatus(s) === "unsigned")
        continue;
      const { sigInputs: c, sigOutputs: a } = this.inputSighash(s);
      if (c === M.ANYONECANPAY ? r.push(s) : t = !1, a === M.ALL)
        n = !1;
      else if (a === M.SINGLE)
        o.push(s);
      else if (a !== M.NONE) throw new Error(`Wrong signature hash output type: ${a}`);
    }
    return { addInput: t, addOutput: n, inputs: r, outputs: o };
  }
  get isFinal() {
    for (let t = 0; t < this.inputs.length; t++)
      if (this.inputStatus(t) !== "finalized")
        return !1;
    return !0;
  }
  // Info utils
  get hasWitnesses() {
    let t = !1;
    for (const n of this.inputs)
      n.finalScriptWitness && n.finalScriptWitness.length && (t = !0);
    return t;
  }
  // https://en.bitcoin.it/wiki/Weight_units
  get weight() {
    if (!this.isFinal)
      throw new Error("Transaction is not finalized");
    let t = 32;
    const n = this.outputs.map(le);
    t += 4 * Vt.encode(this.outputs.length).length;
    for (const r of n)
      t += 32 + 4 * $t.encode(r.script).length;
    this.hasWitnesses && (t += 2), t += 4 * Vt.encode(this.inputs.length).length;
    for (const r of this.inputs)
      t += 160 + 4 * $t.encode(r.finalScriptSig || X).length, this.hasWitnesses && r.finalScriptWitness && (t += ko.encode(r.finalScriptWitness).length);
    return t;
  }
  get vsize() {
    return Du(this.weight);
  }
  toBytes(t = !1, n = !1) {
    return Be.encode({
      version: this.version,
      lockTime: this.lockTime,
      inputs: this.inputs.map(We).map((r) => ({
        ...r,
        finalScriptSig: t && r.finalScriptSig || X
      })),
      outputs: this.outputs.map(le),
      witnesses: this.inputs.map((r) => r.finalScriptWitness || []),
      segwitFlag: n && this.hasWitnesses
    });
  }
  get unsignedTx() {
    return this.toBytes(!1, !1);
  }
  get hex() {
    return x.encode(this.toBytes(!0, this.hasWitnesses));
  }
  get hash() {
    return x.encode(pt(this.toBytes(!0)));
  }
  get id() {
    return x.encode(pt(this.toBytes(!0)).reverse());
  }
  // Input stuff
  checkInputIdx(t) {
    if (!Number.isSafeInteger(t) || 0 > t || t >= this.inputs.length)
      throw new Error(`Wrong input index=${t}`);
  }
  getInput(t) {
    return this.checkInputIdx(t), Gn(this.inputs[t]);
  }
  get inputsLength() {
    return this.inputs.length;
  }
  // Modification
  addInput(t, n = !1) {
    if (!n && !this.signStatus().addInput)
      throw new Error("Tx has signed inputs, cannot add new one");
    return this.inputs.push(Es(t, void 0, void 0, this.opts.disableScriptCheck)), this.inputs.length - 1;
  }
  updateInput(t, n, r = !1) {
    this.checkInputIdx(t);
    let o;
    if (!r) {
      const s = this.signStatus();
      (!s.addInput || s.inputs.includes(t)) && (o = mu);
    }
    this.inputs[t] = Es(n, this.inputs[t], o, this.opts.disableScriptCheck, this.opts.allowUnknown);
  }
  // Output stuff
  checkOutputIdx(t) {
    if (!Number.isSafeInteger(t) || 0 > t || t >= this.outputs.length)
      throw new Error(`Wrong output index=${t}`);
  }
  getOutput(t) {
    return this.checkOutputIdx(t), Gn(this.outputs[t]);
  }
  getOutputAddress(t, n = Re) {
    const r = this.getOutput(t);
    if (r.script)
      return ye(n).encode(st.decode(r.script));
  }
  get outputsLength() {
    return this.outputs.length;
  }
  normalizeOutput(t, n, r) {
    let { amount: o, script: s } = t;
    if (o === void 0 && (o = n?.amount), typeof o != "bigint")
      throw new Error(`Wrong amount type, should be of type bigint in sats, but got ${o} of type ${typeof o}`);
    typeof s == "string" && (s = x.decode(s)), s === void 0 && (s = n?.script);
    let i = { ...n, ...t, amount: o, script: s };
    if (i.amount === void 0 && delete i.amount, i = Fr(Wn, i, n, r, this.opts.allowUnknown), Oo.encode(i), i.script && !this.opts.allowUnknownOutputs && st.decode(i.script).type === "unknown")
      throw new Error("Transaction/output: unknown output script type, there is a chance that input is unspendable. Pass allowUnknownOutputs=true, if you sure");
    return this.opts.disableScriptCheck || Yi(i.script, i.redeemScript, i.witnessScript), i;
  }
  addOutput(t, n = !1) {
    if (!n && !this.signStatus().addOutput)
      throw new Error("Tx has signed outputs, cannot add new one");
    return this.outputs.push(this.normalizeOutput(t)), this.outputs.length - 1;
  }
  updateOutput(t, n, r = !1) {
    this.checkOutputIdx(t);
    let o;
    if (!r) {
      const s = this.signStatus();
      (!s.addOutput || s.outputs.includes(t)) && (o = Eu);
    }
    this.outputs[t] = this.normalizeOutput(n, this.outputs[t], o);
  }
  addOutputAddress(t, n, r = Re) {
    return this.addOutput({ script: st.encode(ye(r).decode(t)), amount: n });
  }
  // Utils
  get fee() {
    let t = 0n;
    for (const r of this.inputs) {
      const o = On(r);
      if (!o)
        throw new Error("Empty input amount");
      t += o.amount;
    }
    const n = this.outputs.map(le);
    for (const r of n)
      t -= r.amount;
    return t;
  }
  // Signing
  // Based on https://github.com/bitcoin/bitcoin/blob/5871b5b5ab57a0caf9b7514eb162c491c83281d5/test/functional/test_framework/script.py#L624
  // There is optimization opportunity to re-use hashes for multiple inputs for witness v0/v1,
  // but we are trying to be less complicated for audit purpose for now.
  preimageLegacy(t, n, r) {
    const { isAny: o, isNone: s, isSingle: i } = ys(r);
    if (t < 0 || !Number.isSafeInteger(t))
      throw new Error(`Invalid input idx=${t}`);
    if (i && t >= this.outputs.length || t >= this.inputs.length)
      return ei.encode(1n);
    n = _.encode(_.decode(n).filter((f) => f !== "CODESEPARATOR"));
    let c = this.inputs.map(We).map((f, l) => ({
      ...f,
      finalScriptSig: l === t ? n : X
    }));
    o ? c = [c[t]] : (s || i) && (c = c.map((f, l) => ({
      ...f,
      sequence: l === t ? f.sequence : 0
    })));
    let a = this.outputs.map(le);
    s ? a = [] : i && (a = a.slice(0, t).fill(Hu).concat([a[t]]));
    const u = Be.encode({
      lockTime: this.lockTime,
      version: this.version,
      segwitFlag: !1,
      inputs: c,
      outputs: a
    });
    return pt(u, ke.encode(r));
  }
  preimageWitnessV0(t, n, r, o) {
    const { isAny: s, isNone: i, isSingle: c } = ys(r);
    let a = bn, u = bn, f = bn;
    const l = this.inputs.map(We), d = this.outputs.map(le);
    s || (a = pt(...l.map(Sr.encode))), !s && !c && !i && (u = pt(...l.map((g) => W.encode(g.sequence)))), !c && !i ? f = pt(...d.map(ge.encode)) : c && t < d.length && (f = pt(ge.encode(d[t])));
    const h = l[t];
    return pt(ke.encode(this.version), a, u, Z(32, !0).encode(h.txid), W.encode(h.index), $t.encode(n), In.encode(o), W.encode(h.sequence), f, W.encode(this.lockTime), W.encode(r));
  }
  preimageWitnessV1(t, n, r, o, s = -1, i, c = 192, a) {
    if (!Array.isArray(o) || this.inputs.length !== o.length)
      throw new Error(`Invalid amounts array=${o}`);
    if (!Array.isArray(n) || this.inputs.length !== n.length)
      throw new Error(`Invalid prevOutScript array=${n}`);
    const u = [
      se.encode(0),
      se.encode(r),
      // U8 sigHash
      ke.encode(this.version),
      W.encode(this.lockTime)
    ], f = r === M.DEFAULT ? M.ALL : r & 3, l = r & M.ANYONECANPAY, d = this.inputs.map(We), h = this.outputs.map(le);
    l !== M.ANYONECANPAY && u.push(...[
      d.map(Sr.encode),
      o.map(In.encode),
      n.map($t.encode),
      d.map((p) => W.encode(p.sequence))
    ].map((p) => dt(re(...p)))), f === M.ALL && u.push(dt(re(...h.map(ge.encode))));
    const g = (a ? 1 : 0) | (i ? 2 : 0);
    if (u.push(new Uint8Array([g])), l === M.ANYONECANPAY) {
      const p = d[t];
      u.push(Sr.encode(p), In.encode(o[t]), $t.encode(n[t]), W.encode(p.sequence));
    } else
      u.push(W.encode(t));
    return g & 1 && u.push(dt($t.encode(a || X))), f === M.SINGLE && u.push(t < h.length ? dt(ge.encode(h[t])) : bn), i && u.push(qe(i, c), se.encode(0), ke.encode(s)), So("TapSighash", ...u);
  }
  // Signer can be privateKey OR instance of bip32 HD stuff
  signIdx(t, n, r, o) {
    this.checkInputIdx(n);
    const s = this.inputs[n], i = xs(s, this.opts.allowLegacyWitnessUtxo);
    if (!Y(t)) {
      if (!s.bip32Derivation || !s.bip32Derivation.length)
        throw new Error("bip32Derivation: empty");
      const f = s.bip32Derivation.filter((d) => d[1].fingerprint == t.fingerprint).map(([d, { path: h }]) => {
        let g = t;
        for (const p of h)
          g = g.deriveChild(p);
        if (!rt(g.publicKey, d))
          throw new Error("bip32Derivation: wrong pubKey");
        if (!g.privateKey)
          throw new Error("bip32Derivation: no privateKey");
        return g;
      });
      if (!f.length)
        throw new Error(`bip32Derivation: no items with fingerprint=${t.fingerprint}`);
      let l = !1;
      for (const d of f)
        this.signIdx(d.privateKey, n) && (l = !0);
      return l;
    }
    r ? r.forEach(zu) : r = [i.defaultSighash];
    const c = i.sighash;
    if (!r.includes(c))
      throw new Error(`Input with not allowed sigHash=${c}. Allowed: ${r.join(", ")}`);
    const { sigOutputs: a } = this.inputSighash(n);
    if (a === M.SINGLE && n >= this.outputs.length)
      throw new Error(`Input with sighash SINGLE, but there is no output with corresponding index=${n}`);
    const u = On(s);
    if (i.txType === "taproot") {
      const f = this.inputs.map(On), l = f.map((y) => y.script), d = f.map((y) => y.amount);
      let h = !1, g = bo(t), p = s.tapMerkleRoot || X;
      if (s.tapInternalKey) {
        const { pubKey: y, privKey: m } = Wu(t, g, s.tapInternalKey, p), [b, k] = Dr(s.tapInternalKey, p);
        if (rt(b, y)) {
          const N = this.preimageWitnessV1(n, l, c, d), A = re(cs(N, m, o), c !== M.DEFAULT ? new Uint8Array([c]) : X);
          this.updateInput(n, { tapKeySig: A }, !0), h = !0;
        }
      }
      if (s.tapLeafScript) {
        s.tapScriptSig = s.tapScriptSig || [];
        for (const [y, m] of s.tapLeafScript) {
          const b = m.subarray(0, -1), k = _.decode(b), N = m[m.length - 1], A = qe(b, N);
          if (k.findIndex((K) => Y(K) && rt(K, g)) === -1)
            continue;
          const w = this.preimageWitnessV1(n, l, c, d, void 0, b, N), ft = re(cs(w, t, o), c !== M.DEFAULT ? new Uint8Array([c]) : X);
          this.updateInput(n, { tapScriptSig: [[{ pubKey: g, leafHash: A }, ft]] }, !0), h = !0;
        }
      }
      if (!h)
        throw new Error("No taproot scripts signed");
      return !0;
    } else {
      const f = Mi(t);
      let l = !1;
      const d = Di(f);
      for (const p of _.decode(i.lastScript))
        Y(p) && (rt(p, f) || rt(p, d)) && (l = !0);
      if (!l)
        throw new Error(`Input script doesn't have pubKey: ${i.lastScript}`);
      let h;
      if (i.txType === "legacy")
        h = this.preimageLegacy(n, i.lastScript, c);
      else if (i.txType === "segwit") {
        let p = i.lastScript;
        i.last.type === "wpkh" && (p = st.encode({ type: "pkh", hash: i.last.hash })), h = this.preimageWitnessV0(n, p, c, u.amount);
      } else
        throw new Error(`Transaction/sign: unknown tx type: ${i.txType}`);
      const g = cu(h, t, this.opts.lowR);
      this.updateInput(n, {
        partialSig: [[f, re(g, new Uint8Array([c]))]]
      }, !0);
    }
    return !0;
  }
  // This is bad API. Will work if user creates and signs tx, but if
  // there is some complex workflow with exchanging PSBT and signing them,
  // then it is better to validate which output user signs. How could a better API look like?
  // Example: user adds input, sends to another party, then signs received input (mixer etc),
  // another user can add different input for same key and user will sign it.
  // Even worse: another user can add bip32 derivation, and spend money from different address.
  // Better api: signIdx
  sign(t, n, r) {
    let o = 0;
    for (let s = 0; s < this.inputs.length; s++)
      try {
        this.signIdx(t, s, n, r) && o++;
      } catch {
      }
    if (!o)
      throw new Error("No inputs signed");
    return o;
  }
  finalizeIdx(t) {
    if (this.checkInputIdx(t), this.fee < 0n)
      throw new Error("Outputs spends more than inputs amount");
    const n = this.inputs[t], r = xs(n, this.opts.allowLegacyWitnessUtxo);
    if (r.txType === "taproot") {
      if (n.tapKeySig)
        n.finalScriptWitness = [n.tapKeySig];
      else if (n.tapLeafScript && n.tapScriptSig) {
        const a = n.tapLeafScript.sort((u, f) => Pt.encode(u[0]).length - Pt.encode(f[0]).length);
        for (const [u, f] of a) {
          const l = f.slice(0, -1), d = f[f.length - 1], h = st.decode(l), g = qe(l, d), p = n.tapScriptSig.filter((m) => rt(m[0].leafHash, g));
          let y = [];
          if (h.type === "tr_ms") {
            const m = h.m, b = h.pubkeys;
            let k = 0;
            for (const N of b) {
              const A = p.findIndex((z) => rt(z[0].pubKey, N));
              if (k === m || A === -1) {
                y.push(X);
                continue;
              }
              y.push(p[A][1]), k++;
            }
            if (k !== m)
              continue;
          } else if (h.type === "tr_ns") {
            for (const m of h.pubkeys) {
              const b = p.findIndex((k) => rt(k[0].pubKey, m));
              b !== -1 && y.push(p[b][1]);
            }
            if (y.length !== h.pubkeys.length)
              continue;
          } else if (h.type === "unknown" && this.opts.allowUnknownInputs) {
            const m = _.decode(l);
            if (y = p.map(([{ pubKey: b }, k]) => {
              const N = m.findIndex((A) => Y(A) && rt(A, b));
              if (N === -1)
                throw new Error("finalize/taproot: cannot find position of pubkey in script");
              return { signature: k, pos: N };
            }).sort((b, k) => b.pos - k.pos).map((b) => b.signature), !y.length)
              continue;
          } else {
            const m = this.opts.customScripts;
            if (m)
              for (const b of m) {
                if (!b.finalizeTaproot)
                  continue;
                const k = _.decode(l), N = b.encode(k);
                if (N === void 0)
                  continue;
                const A = b.finalizeTaproot(l, N, p);
                if (A) {
                  n.finalScriptWitness = A.concat(Pt.encode(u)), n.finalScriptSig = X, br(n);
                  return;
                }
              }
            throw new Error("Finalize: Unknown tapLeafScript");
          }
          n.finalScriptWitness = y.reverse().concat([l, Pt.encode(u)]);
          break;
        }
        if (!n.finalScriptWitness)
          throw new Error("finalize/taproot: empty witness");
      } else
        throw new Error("finalize/taproot: unknown input");
      n.finalScriptSig = X, br(n);
      return;
    }
    if (!n.partialSig || !n.partialSig.length)
      throw new Error("Not enough partial sign");
    let o = X, s = [];
    if (r.last.type === "ms") {
      const a = r.last.m, u = r.last.pubkeys;
      let f = [];
      for (const l of u) {
        const d = n.partialSig.find((h) => rt(l, h[0]));
        d && f.push(d[1]);
      }
      if (f = f.slice(0, a), f.length !== a)
        throw new Error(`Multisig: wrong signatures count, m=${a} n=${u.length} signatures=${f.length}`);
      o = _.encode([0, ...f]);
    } else if (r.last.type === "pk")
      o = _.encode([n.partialSig[0][1]]);
    else if (r.last.type === "pkh")
      o = _.encode([n.partialSig[0][1], n.partialSig[0][0]]);
    else if (r.last.type === "wpkh")
      o = X, s = [n.partialSig[0][1], n.partialSig[0][0]];
    else if (r.last.type === "unknown" && !this.opts.allowUnknownInputs)
      throw new Error("Unknown inputs not allowed");
    let i, c;
    if (r.type.includes("wsh-") && (o.length && r.lastScript.length && (s = _.decode(o).map((a) => {
      if (a === 0)
        return X;
      if (Y(a))
        return a;
      throw new Error(`Wrong witness op=${a}`);
    })), s = s.concat(r.lastScript)), r.txType === "segwit" && (c = s), r.type.startsWith("sh-wsh-") ? i = _.encode([_.encode([0, dt(r.lastScript)])]) : r.type.startsWith("sh-") ? i = _.encode([..._.decode(o), r.lastScript]) : r.type.startsWith("wsh-") || r.txType !== "segwit" && (i = o), !i && !c)
      throw new Error("Unknown error finalizing input");
    i && (n.finalScriptSig = i), c && (n.finalScriptWitness = c), br(n);
  }
  finalize() {
    for (let t = 0; t < this.inputs.length; t++)
      this.finalizeIdx(t);
  }
  extract() {
    if (!this.isFinal)
      throw new Error("Transaction has unfinalized inputs");
    if (!this.outputs.length)
      throw new Error("Transaction has no outputs");
    if (this.fee < 0n)
      throw new Error("Outputs spends more than inputs amount");
    return this.toBytes(!0, !0);
  }
  combine(t) {
    for (const o of ["PSBTVersion", "version", "lockTime"])
      if (this.opts[o] !== t.opts[o])
        throw new Error(`Transaction/combine: different ${o} this=${this.opts[o]} other=${t.opts[o]}`);
    for (const o of ["inputs", "outputs"])
      if (this[o].length !== t[o].length)
        throw new Error(`Transaction/combine: different ${o} length this=${this[o].length} other=${t[o].length}`);
    const n = this.global.unsignedTx ? je.encode(this.global.unsignedTx) : X, r = t.global.unsignedTx ? je.encode(t.global.unsignedTx) : X;
    if (!rt(n, r))
      throw new Error("Transaction/combine: different unsigned tx");
    this.global = Fr(Ao, this.global, t.global, void 0, this.opts.allowUnknown);
    for (let o = 0; o < this.inputs.length; o++)
      this.updateInput(o, t.inputs[o], !0);
    for (let o = 0; o < this.outputs.length; o++)
      this.updateOutput(o, t.outputs[o], !0);
    return this;
  }
  clone() {
    return gt.fromPSBT(this.toPSBT(this.opts.PSBTVersion), this.opts);
  }
}
class Ji extends Error {
  idx;
  // Indice of participant
  constructor(t, n) {
    super(n), this.idx = t;
  }
}
const { taggedHash: Qi, pointToBytes: Sn } = Ut.utils, Qt = Ft.Point, H = Qt.Fn, Gt = Ft.lengths.publicKey, jr = new Uint8Array(Gt), bs = ae(Z(33), {
  decode: (e) => No(e) ? jr : e.toBytes(!0),
  encode: (e) => tn(e, jr) ? Qt.ZERO : Qt.fromBytes(e)
}), Ss = bt(ei, (e) => (li("n", e, 1n, H.ORDER), e)), Un = ut({ R1: bs, R2: bs }), tc = ut({ k1: Ss, k2: Ss, publicKey: Z(Gt) });
function Ts(e, ...t) {
}
function Lt(e, ...t) {
  if (!Array.isArray(e))
    throw new Error("expected array");
  e.forEach((n) => D(n, ...t));
}
function vs(e) {
  if (!Array.isArray(e))
    throw new Error("expected array");
  e.forEach((t, n) => {
    if (typeof t != "boolean")
      throw new Error("expected boolean in xOnly array, got" + t + "(" + n + ")");
  });
}
const jn = (e, ...t) => H.create(H.fromBytes(Qi(e, ...t), !0)), ze = (e, t) => hn(e.y) ? t : H.neg(t);
function we(e) {
  return Qt.BASE.multiply(e);
}
function No(e) {
  return e.equals(Qt.ZERO);
}
function Yr(e) {
  return Lt(e, Gt), e.sort(Mn);
}
function ec(e) {
  Lt(e, Gt);
  for (let t = 1; t < e.length; t++)
    if (!tn(e[t], e[0]))
      return e[t];
  return jr;
}
function nc(e) {
  return Lt(e, Gt), Qi("KeyAgg list", ...e);
}
function rc(e, t, n) {
  return D(e, Gt), D(t, Gt), tn(e, t) ? 1n : jn("KeyAgg coefficient", n, e);
}
function qr(e, t = [], n = []) {
  if (Lt(e, Gt), Lt(t, 32), t.length !== n.length)
    throw new Error("The tweaks and isXonly arrays must have the same length");
  const r = ec(e), o = nc(e);
  let s = Qt.ZERO;
  for (let a = 0; a < e.length; a++) {
    let u;
    try {
      u = Qt.fromBytes(e[a]);
    } catch {
      throw new Ji(a, "pubkey");
    }
    s = s.add(u.multiply(rc(e[a], r, o)));
  }
  let i = H.ONE, c = H.ZERO;
  for (let a = 0; a < t.length; a++) {
    const u = n[a] && !hn(s.y) ? H.neg(H.ONE) : H.ONE, f = H.fromBytes(t[a]);
    if (s = s.multiply(u).add(we(f)), No(s))
      throw new Error("The result of tweaking cannot be infinity");
    i = H.mul(u, i), c = H.add(f, H.mul(u, c));
  }
  return { aggPublicKey: s, gAcc: i, tweakAcc: c };
}
const ks = (e, t, n, r, o, s) => jn("MuSig/nonce", e, new Uint8Array([t.length]), t, new Uint8Array([n.length]), n, o, dn(s.length, 4), s, new Uint8Array([r]));
function ju(e, t, n = new Uint8Array(0), r, o = new Uint8Array(0), s = ln(32)) {
  if (D(e, Gt), Ts(t, 32), D(n), ![0, 32].includes(n.length))
    throw new Error("wrong aggPublicKey");
  Ts(), D(o), D(s, 32);
  const i = Uint8Array.of(0), c = ks(s, e, n, 0, i, o), a = ks(s, e, n, 1, i, o);
  return {
    secret: tc.encode({ k1: c, k2: a, publicKey: e }),
    public: Un.encode({ R1: we(c), R2: we(a) })
  };
}
class Yu {
  publicKeys;
  Q;
  gAcc;
  tweakAcc;
  b;
  R;
  e;
  tweaks;
  isXonly;
  L;
  secondKey;
  /**
   * Constructor for the Session class.
   * It precomputes and stores values derived from the aggregate nonce, public keys,
   * message, and optional tweaks, optimizing the signing process.
   * @param aggNonce The aggregate nonce (Uint8Array) from all participants combined, must be 66 bytes.
   * @param publicKeys An array of public keys (Uint8Array) from each participant, must be 33 bytes.
   * @param msg The message (Uint8Array) to be signed.
   * @param tweaks Optional array of tweaks (Uint8Array) to be applied to the aggregate public key, each must be 32 bytes. Defaults to [].
   * @param isXonly Optional array of booleans indicating whether each tweak is an X-only tweak. Defaults to [].
   * @throws {Error} If the input is invalid, such as wrong array sizes or lengths.
   */
  constructor(t, n, r, o = [], s = []) {
    if (Lt(n, 33), Lt(o, 32), vs(s), D(r), o.length !== s.length)
      throw new Error("The tweaks and isXonly arrays must have the same length");
    const { aggPublicKey: i, gAcc: c, tweakAcc: a } = qr(n, o, s), { R1: u, R2: f } = Un.decode(t);
    this.publicKeys = n, this.Q = i, this.gAcc = c, this.tweakAcc = a, this.b = jn("MuSig/noncecoef", t, Sn(i), r);
    const l = u.add(f.multiply(this.b));
    this.R = No(l) ? Qt.BASE : l, this.e = jn("BIP0340/challenge", Sn(this.R), Sn(i), r), this.tweaks = o, this.isXonly = s, this.L = nc(n), this.secondKey = ec(n);
  }
  /**
   * Calculates the key aggregation coefficient for a given point.
   * @private
   * @param P The point to calculate the coefficient for.
   * @returns The key aggregation coefficient as a bigint.
   * @throws {Error} If the provided public key is not included in the list of pubkeys.
   */
  getSessionKeyAggCoeff(t) {
    const { publicKeys: n } = this, r = t.toBytes(!0);
    if (!n.some((s) => tn(s, r)))
      throw new Error("The signer's pubkey must be included in the list of pubkeys");
    return rc(r, this.secondKey, this.L);
  }
  partialSigVerifyInternal(t, n, r) {
    const { Q: o, gAcc: s, b: i, R: c, e: a } = this, u = H.fromBytes(t, !0);
    if (!H.isValid(u))
      return !1;
    const { R1: f, R2: l } = Un.decode(n), d = f.add(l.multiply(i)), h = hn(c.y) ? d : d.negate(), g = Qt.fromBytes(r), p = this.getSessionKeyAggCoeff(g), y = H.mul(ze(o, 1n), s), m = we(u), b = h.add(g.multiply(H.mul(a, H.mul(p, y))));
    return m.equals(b);
  }
  /**
   * Generates a partial signature for a given message, secret nonce, secret key, and session context.
   * @param secretNonce The secret nonce for this signing session (Uint8Array). MUST be securely erased after use.
   * @param secret The secret key of the signer (Uint8Array).
   * @param sessionCtx The session context containing all necessary information for signing.
   * @param fastSign if set to true, the signature is created without checking validity.
   * @returns The partial signature (Uint8Array).
   * @throws {Error} If the input is invalid, such as wrong array sizes, invalid nonce or secret key.
   */
  sign(t, n, r = !1) {
    if (D(n, 32), typeof r != "boolean")
      throw new Error("expected boolean");
    const { Q: o, gAcc: s, b: i, R: c, e: a } = this, { k1: u, k2: f, publicKey: l } = tc.decode(t);
    if (t.fill(0, 0, 64), !H.isValid(u))
      throw new Error("wrong k1");
    if (!H.isValid(f))
      throw new Error("wrong k1");
    const d = ze(c, u), h = ze(c, f), g = H.fromBytes(n);
    if (H.is0(g))
      throw new Error("wrong d_");
    const p = we(g), y = p.toBytes(!0);
    if (!tn(y, l))
      throw new Error("Public key does not match nonceGen argument");
    const m = this.getSessionKeyAggCoeff(p), b = ze(o, 1n), k = H.mul(b, H.mul(s, g)), N = H.add(d, H.add(H.mul(i, h), H.mul(a, H.mul(m, k)))), A = H.toBytes(N);
    if (!r) {
      const z = Un.encode({
        R1: we(u),
        R2: we(f)
      });
      if (!this.partialSigVerifyInternal(A, z, y))
        throw new Error("Partial signature verification failed");
    }
    return A;
  }
  /**
   * Verifies a partial signature against the aggregate public key and other session parameters.
   * @param partialSig The partial signature to verify (Uint8Array).
   * @param pubNonces An array of public nonces from each signer (Uint8Array).
   * @param pubKeys An array of public keys from each signer (Uint8Array).
   * @param tweaks An array of tweaks applied to the aggregate public key.
   * @param isXonly An array of booleans indicating whether each tweak is an X-only tweak.
   * @param msg The message that was signed (Uint8Array).
   * @param i The index of the signer whose partial signature is being verified.
   * @returns True if the partial signature is valid, false otherwise.
   * @throws {Error} If the input is invalid, such as non array partialSig, pubNonces, pubKeys, tweaks.
   */
  partialSigVerify(t, n, r) {
    const { publicKeys: o, tweaks: s, isXonly: i } = this;
    if (D(t, 32), Lt(n, 66), Lt(o, Gt), Lt(s, 32), vs(i), ue(r), n.length !== o.length)
      throw new Error("The pubNonces and publicKeys arrays must have the same length");
    if (s.length !== i.length)
      throw new Error("The tweaks and isXonly arrays must have the same length");
    if (r >= n.length)
      throw new Error("index outside of pubKeys/pubNonces");
    return this.partialSigVerifyInternal(t, n[r], o[r]);
  }
  /**
   * Aggregates partial signatures from multiple signers into a single final signature.
   * @param partialSigs An array of partial signatures from each signer (Uint8Array).
   * @param sessionCtx The session context containing all necessary information for signing.
   * @returns The final aggregate signature (Uint8Array).
   * @throws {Error} If the input is invalid, such as wrong array sizes, invalid signature.
   */
  partialSigAgg(t) {
    Lt(t, 32);
    const { Q: n, tweakAcc: r, R: o, e: s } = this;
    let i = 0n;
    for (let a = 0; a < t.length; a++) {
      const u = H.fromBytes(t[a], !0);
      if (!H.isValid(u))
        throw new Ji(a, "psig");
      i = H.add(i, u);
    }
    const c = ze(n, 1n);
    return i = H.add(i, H.mul(s, H.mul(c, r))), Rt(Sn(o), H.toBytes(i));
  }
}
function qu(e) {
  const t = ju(e);
  return { secNonce: t.secret, pubNonce: t.public };
}
/*! noble-secp256k1 - MIT License (c) 2019 Paul Miller (paulmillr.com) */
const oc = {
  p: 0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffefffffc2fn,
  n: 0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141n,
  h: 1n,
  a: 0n,
  b: 7n,
  Gx: 0x79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798n,
  Gy: 0x483ada7726a3c4655da4fbfc0e1108a8fd17b448a68554199c47d08ffb10d4b8n
}, { p: ie, n: pn, Gx: Zu, Gy: Xu, b: sc } = oc, vt = 32, en = 64, Zr = {
  publicKey: vt + 1,
  publicKeyUncompressed: en + 1,
  seed: vt + vt / 2
}, Ju = (...e) => {
  "captureStackTrace" in Error && typeof Error.captureStackTrace == "function" && Error.captureStackTrace(...e);
}, tt = (e = "") => {
  const t = new Error(e);
  throw Ju(t, tt), t;
}, Qu = (e) => typeof e == "bigint", tf = (e) => typeof e == "string", ef = (e) => e instanceof Uint8Array || ArrayBuffer.isView(e) && e.constructor.name === "Uint8Array", Wt = (e, t, n = "") => {
  const r = ef(e), o = e?.length, s = t !== void 0;
  if (!r || s && o !== t) {
    const i = n && `"${n}" `, c = s ? ` of length ${t}` : "", a = r ? `length=${o}` : `type=${typeof e}`;
    tt(i + "expected Uint8Array" + c + ", got " + a);
  }
  return e;
}, nn = (e) => new Uint8Array(e), ic = (e, t) => e.toString(16).padStart(t, "0"), cc = (e) => Array.from(Wt(e)).map((t) => ic(t, 2)).join(""), Zt = { _0: 48, _9: 57, A: 65, F: 70, a: 97, f: 102 }, As = (e) => {
  if (e >= Zt._0 && e <= Zt._9)
    return e - Zt._0;
  if (e >= Zt.A && e <= Zt.F)
    return e - (Zt.A - 10);
  if (e >= Zt.a && e <= Zt.f)
    return e - (Zt.a - 10);
}, ac = (e) => {
  const t = "hex invalid";
  if (!tf(e))
    return tt(t);
  const n = e.length, r = n / 2;
  if (n % 2)
    return tt(t);
  const o = nn(r);
  for (let s = 0, i = 0; s < r; s++, i += 2) {
    const c = As(e.charCodeAt(i)), a = As(e.charCodeAt(i + 1));
    if (c === void 0 || a === void 0)
      return tt(t);
    o[s] = c * 16 + a;
  }
  return o;
}, uc = () => globalThis?.crypto, Is = () => uc()?.subtle ?? tt("crypto.subtle must be defined, consider polyfill"), Pe = (...e) => {
  const t = nn(e.reduce((r, o) => r + Wt(o).length, 0));
  let n = 0;
  return e.forEach((r) => {
    t.set(r, n), n += r.length;
  }), t;
}, Co = (e = vt) => uc().getRandomValues(nn(e)), Yn = BigInt, Ee = (e, t, n, r = "bad number: out of range") => Qu(e) && t <= e && e < n ? e : tt(r), B = (e, t = ie) => {
  const n = e % t;
  return n >= 0n ? n : t + n;
}, hr = (e) => B(e, pn), nf = (e, t) => {
  (e === 0n || t <= 0n) && tt("no inverse n=" + e + " mod=" + t);
  let n = B(e, t), r = t, o = 0n, s = 1n;
  for (; n !== 0n; ) {
    const i = r / n, c = r % n, a = o - s * i;
    r = n, n = c, o = s, s = a;
  }
  return r === 1n ? B(o, t) : tt("no inverse");
}, rf = (e) => {
  const t = hc[e];
  return typeof t != "function" && tt("hashes." + e + " not set"), t;
}, Tr = (e) => e instanceof mt ? e : tt("Point expected"), fc = (e) => B(B(e * e) * e + sc), Bs = (e) => Ee(e, 0n, ie), Nn = (e) => Ee(e, 1n, ie), of = (e) => Ee(e, 1n, pn), _e = (e) => (e & 1n) === 0n, lc = (e) => Uint8Array.of(e), sf = (e) => lc(_e(e) ? 2 : 3), dc = (e) => {
  const t = fc(Nn(e));
  let n = 1n;
  for (let r = t, o = (ie + 1n) / 4n; o > 0n; o >>= 1n)
    o & 1n && (n = n * r % ie), r = r * r % ie;
  return B(n * n) === t ? n : tt("sqrt invalid");
};
class mt {
  static BASE;
  static ZERO;
  X;
  Y;
  Z;
  constructor(t, n, r) {
    this.X = Bs(t), this.Y = Nn(n), this.Z = Bs(r), Object.freeze(this);
  }
  static CURVE() {
    return oc;
  }
  /** Create 3d xyz point from 2d xy. (0, 0) => (0, 1, 0), not (0, 0, 1) */
  static fromAffine(t) {
    const { x: n, y: r } = t;
    return n === 0n && r === 0n ? de : new mt(n, r, 1n);
  }
  /** Convert Uint8Array or hex string to Point. */
  static fromBytes(t) {
    Wt(t);
    const { publicKey: n, publicKeyUncompressed: r } = Zr;
    let o;
    const s = t.length, i = t[0], c = t.subarray(1), a = qn(c, 0, vt);
    if (s === n && (i === 2 || i === 3)) {
      let u = dc(a);
      const f = _e(u);
      _e(Yn(i)) !== f && (u = B(-u)), o = new mt(a, u, 1n);
    }
    return s === r && i === 4 && (o = new mt(a, qn(c, vt, en), 1n)), o ? o.assertValidity() : tt("bad point: not on curve");
  }
  static fromHex(t) {
    return mt.fromBytes(ac(t));
  }
  get x() {
    return this.toAffine().x;
  }
  get y() {
    return this.toAffine().y;
  }
  /** Equality check: compare points P&Q. */
  equals(t) {
    const { X: n, Y: r, Z: o } = this, { X: s, Y: i, Z: c } = Tr(t), a = B(n * c), u = B(s * o), f = B(r * c), l = B(i * o);
    return a === u && f === l;
  }
  is0() {
    return this.equals(de);
  }
  /** Flip point over y coordinate. */
  negate() {
    return new mt(this.X, B(-this.Y), this.Z);
  }
  /** Point doubling: P+P, complete formula. */
  double() {
    return this.add(this);
  }
  /**
   * Point addition: P+Q, complete, exception-free formula
   * (Renes-Costello-Batina, algo 1 of [2015/1060](https://eprint.iacr.org/2015/1060)).
   * Cost: `12M + 0S + 3*a + 3*b3 + 23add`.
   */
  // prettier-ignore
  add(t) {
    const { X: n, Y: r, Z: o } = this, { X: s, Y: i, Z: c } = Tr(t), a = 0n, u = sc;
    let f = 0n, l = 0n, d = 0n;
    const h = B(u * 3n);
    let g = B(n * s), p = B(r * i), y = B(o * c), m = B(n + r), b = B(s + i);
    m = B(m * b), b = B(g + p), m = B(m - b), b = B(n + o);
    let k = B(s + c);
    return b = B(b * k), k = B(g + y), b = B(b - k), k = B(r + o), f = B(i + c), k = B(k * f), f = B(p + y), k = B(k - f), d = B(a * b), f = B(h * y), d = B(f + d), f = B(p - d), d = B(p + d), l = B(f * d), p = B(g + g), p = B(p + g), y = B(a * y), b = B(h * b), p = B(p + y), y = B(g - y), y = B(a * y), b = B(b + y), g = B(p * b), l = B(l + g), g = B(k * b), f = B(m * f), f = B(f - g), g = B(m * p), d = B(k * d), d = B(d + g), new mt(f, l, d);
  }
  subtract(t) {
    return this.add(Tr(t).negate());
  }
  /**
   * Point-by-scalar multiplication. Scalar must be in range 1 <= n < CURVE.n.
   * Uses {@link wNAF} for base point.
   * Uses fake point to mitigate side-channel leakage.
   * @param n scalar by which point is multiplied
   * @param safe safe mode guards against timing attacks; unsafe mode is faster
   */
  multiply(t, n = !0) {
    if (!n && t === 0n)
      return de;
    if (of(t), t === 1n)
      return this;
    if (this.equals(xe))
      return Ef(t).p;
    let r = de, o = xe;
    for (let s = this; t > 0n; s = s.double(), t >>= 1n)
      t & 1n ? r = r.add(s) : n && (o = o.add(s));
    return r;
  }
  multiplyUnsafe(t) {
    return this.multiply(t, !1);
  }
  /** Convert point to 2d xy affine point. (X, Y, Z) ∋ (x=X/Z, y=Y/Z) */
  toAffine() {
    const { X: t, Y: n, Z: r } = this;
    if (this.equals(de))
      return { x: 0n, y: 0n };
    if (r === 1n)
      return { x: t, y: n };
    const o = nf(r, ie);
    return B(r * o) !== 1n && tt("inverse invalid"), { x: B(t * o), y: B(n * o) };
  }
  /** Checks if the point is valid and on-curve. */
  assertValidity() {
    const { x: t, y: n } = this.toAffine();
    return Nn(t), Nn(n), B(n * n) === fc(t) ? this : tt("bad point: not on curve");
  }
  /** Converts point to 33/65-byte Uint8Array. */
  toBytes(t = !0) {
    const { x: n, y: r } = this.assertValidity().toAffine(), o = jt(n);
    return t ? Pe(sf(r), o) : Pe(lc(4), o, jt(r));
  }
  toHex(t) {
    return cc(this.toBytes(t));
  }
}
const xe = new mt(Zu, Xu, 1n), de = new mt(0n, 1n, 0n);
mt.BASE = xe;
mt.ZERO = de;
const cf = (e, t, n) => xe.multiply(t, !1).add(e.multiply(n, !1)).assertValidity(), Se = (e) => Yn("0x" + (cc(e) || "0")), qn = (e, t, n) => Se(e.subarray(t, n)), af = 2n ** 256n, jt = (e) => ac(ic(Ee(e, 0n, af), en)), uf = (e) => {
  const t = Se(Wt(e, vt, "secret key"));
  return Ee(t, 1n, pn, "invalid secret key: outside of range");
}, Os = "SHA-256", hc = {
  hmacSha256Async: async (e, t) => {
    const n = Is(), r = "HMAC", o = await n.importKey("raw", e, { name: r, hash: { name: Os } }, !1, ["sign"]);
    return nn(await n.sign(r, o, t));
  },
  hmacSha256: void 0,
  sha256Async: async (e) => nn(await Is().digest(Os, e)),
  sha256: void 0
}, ff = (e = Co(Zr.seed)) => {
  Wt(e), (e.length < Zr.seed || e.length > 1024) && tt("expected 40-1024b");
  const t = B(Se(e), pn - 1n);
  return jt(t + 1n);
}, lf = (e) => (t) => {
  const n = ff(t);
  return { secretKey: n, publicKey: e(n) };
}, pc = (e) => Uint8Array.from("BIP0340/" + e, (t) => t.charCodeAt(0)), gc = "aux", wc = "nonce", yc = "challenge", Xr = (e, ...t) => {
  const n = rf("sha256"), r = n(pc(e));
  return n(Pe(r, r, ...t));
}, Jr = async (e, ...t) => {
  const n = hc.sha256Async, r = await n(pc(e));
  return await n(Pe(r, r, ...t));
}, $o = (e) => {
  const t = uf(e), n = xe.multiply(t), { x: r, y: o } = n.assertValidity().toAffine(), s = _e(o) ? t : hr(-t), i = jt(r);
  return { d: s, px: i };
}, Lo = (e) => hr(Se(e)), mc = (...e) => Lo(Xr(yc, ...e)), Ec = async (...e) => Lo(await Jr(yc, ...e)), xc = (e) => $o(e).px, df = lf(xc), bc = (e, t, n) => {
  const { px: r, d: o } = $o(t);
  return { m: Wt(e), px: r, d: o, a: Wt(n, vt) };
}, Sc = (e) => {
  const t = Lo(e);
  t === 0n && tt("sign failed: k is zero");
  const { px: n, d: r } = $o(jt(t));
  return { rx: n, k: r };
}, Tc = (e, t, n, r) => Pe(t, jt(hr(e + n * r))), vc = "invalid signature produced", hf = (e, t, n = Co(vt)) => {
  const { m: r, px: o, d: s, a: i } = bc(e, t, n), c = Xr(gc, i), a = jt(s ^ Se(c)), u = Xr(wc, a, o, r), { rx: f, k: l } = Sc(u), d = mc(f, o, r), h = Tc(l, f, d, s);
  return Ac(h, r, o) || tt(vc), h;
}, pf = async (e, t, n = Co(vt)) => {
  const { m: r, px: o, d: s, a: i } = bc(e, t, n), c = await Jr(gc, i), a = jt(s ^ Se(c)), u = await Jr(wc, a, o, r), { rx: f, k: l } = Sc(u), d = await Ec(f, o, r), h = Tc(l, f, d, s);
  return await Ic(h, r, o) || tt(vc), h;
}, gf = (e, t) => e instanceof Promise ? e.then(t) : t(e), kc = (e, t, n, r) => {
  const o = Wt(e, en, "signature"), s = Wt(t, void 0, "message"), i = Wt(n, vt, "publicKey");
  try {
    const c = Se(i), a = dc(c), u = _e(a) ? a : B(-a), f = new mt(c, u, 1n).assertValidity(), l = jt(f.toAffine().x), d = qn(o, 0, vt);
    Ee(d, 1n, ie);
    const h = qn(o, vt, en);
    Ee(h, 1n, pn);
    const g = Pe(jt(d), l, s);
    return gf(r(g), (p) => {
      const { x: y, y: m } = cf(f, h, hr(-p)).toAffine();
      return !(!_e(m) || y !== d);
    });
  } catch {
    return !1;
  }
}, Ac = (e, t, n) => kc(e, t, n, mc), Ic = async (e, t, n) => kc(e, t, n, Ec), wf = {
  keygen: df,
  getPublicKey: xc,
  sign: hf,
  verify: Ac,
  signAsync: pf,
  verifyAsync: Ic
}, Zn = 8, yf = 256, Bc = Math.ceil(yf / Zn) + 1, Qr = 2 ** (Zn - 1), mf = () => {
  const e = [];
  let t = xe, n = t;
  for (let r = 0; r < Bc; r++) {
    n = t, e.push(n);
    for (let o = 1; o < Qr; o++)
      n = n.add(t), e.push(n);
    t = n.double();
  }
  return e;
};
let Us;
const Ns = (e, t) => {
  const n = t.negate();
  return e ? n : t;
}, Ef = (e) => {
  const t = Us || (Us = mf());
  let n = de, r = xe;
  const o = 2 ** Zn, s = o, i = Yn(o - 1), c = Yn(Zn);
  for (let a = 0; a < Bc; a++) {
    let u = Number(e & i);
    e >>= c, u > Qr && (u -= s, e += 1n);
    const f = a * Qr, l = f, d = f + Math.abs(u) - 1, h = a % 2 !== 0, g = u < 0;
    u === 0 ? r = r.add(Ns(h, t[l])) : n = n.add(Ns(g, t[d]));
  }
  return e !== 0n && tt("invalid wnaf"), { p: n, f: r };
};
function Ro(e, t, n = {}) {
  e = Yr(e);
  const { aggPublicKey: r } = qr(e);
  if (!n.taprootTweak)
    return {
      preTweakedKey: r.toBytes(!0),
      finalKey: r.toBytes(!0)
    };
  const o = Ut.utils.taggedHash("TapTweak", r.toBytes(!0).subarray(1), n.taprootTweak ?? new Uint8Array(0)), { aggPublicKey: s } = qr(e, [o], [!0]);
  return {
    preTweakedKey: r.toBytes(!0),
    finalKey: s.toBytes(!0)
  };
}
class Tn extends Error {
  constructor(t) {
    super(t), this.name = "PartialSignatureError";
  }
}
class Po {
  constructor(t, n) {
    if (this.s = t, this.R = n, t.length !== 32)
      throw new Tn("Invalid s length");
    if (n.length !== 33)
      throw new Tn("Invalid R length");
  }
  /**
   * Encodes the partial signature into bytes
   * Returns a 32-byte array containing just the s value
   */
  encode() {
    return new Uint8Array(this.s);
  }
  /**
   * Decodes a partial signature from bytes
   * @param bytes - 32-byte array containing s value
   */
  static decode(t) {
    if (t.length !== 32)
      throw new Tn("Invalid partial signature length");
    if (Yt(t) >= mt.CURVE().n)
      throw new Tn("s value overflows curve order");
    const r = new Uint8Array(33);
    return new Po(t, r);
  }
}
function xf(e, t, n, r, o, s) {
  let i;
  if (s?.taprootTweak !== void 0) {
    const { preTweakedKey: u } = Ro(Yr(r));
    i = Ut.utils.taggedHash("TapTweak", u.subarray(1), s.taprootTweak);
  }
  const a = new Yu(n, Yr(r), o, i ? [i] : void 0, i ? [!0] : void 0).sign(e, t);
  return Po.decode(a);
}
var vr, Cs;
function bf() {
  if (Cs) return vr;
  Cs = 1;
  const e = 4294967295, t = 1 << 31, n = 9, r = 65535, o = 1 << 22, s = r, i = 1 << n, c = r << n;
  function a(f) {
    return f & t ? {} : f & o ? {
      seconds: (f & r) << n
    } : {
      blocks: f & r
    };
  }
  function u({ blocks: f, seconds: l }) {
    if (f !== void 0 && l !== void 0) throw new TypeError("Cannot encode blocks AND seconds");
    if (f === void 0 && l === void 0) return e;
    if (l !== void 0) {
      if (!Number.isFinite(l)) throw new TypeError("Expected Number seconds");
      if (l > c) throw new TypeError("Expected Number seconds <= " + c);
      if (l % i !== 0) throw new TypeError("Expected Number seconds as a multiple of " + i);
      return o | l >> n;
    }
    if (!Number.isFinite(f)) throw new TypeError("Expected Number blocks");
    if (f > r) throw new TypeError("Expected Number blocks <= " + s);
    return f;
  }
  return vr = { decode: a, encode: u }, vr;
}
var to = bf(), Ht;
(function(e) {
  e.VtxoTaprootTree = "taptree", e.VtxoTreeExpiry = "expiry", e.Cosigner = "cosigner", e.ConditionWitness = "condition";
})(Ht || (Ht = {}));
const Oc = 255;
function Sf(e, t, n, r) {
  e.updateInput(t, {
    unknown: [
      ...e.getInput(t)?.unknown ?? [],
      n.encode(r)
    ]
  });
}
function Uc(e, t, n) {
  const r = e.getInput(t)?.unknown ?? [], o = [];
  for (const s of r) {
    const i = n.decode(s);
    i && o.push(i);
  }
  return o;
}
const Tf = {
  key: Ht.VtxoTaprootTree,
  encode: (e) => [
    {
      type: Oc,
      key: _o[Ht.VtxoTaprootTree]
    },
    e
  ],
  decode: (e) => Cc(() => $c(e[0], Ht.VtxoTaprootTree) ? e[1] : null)
};
Ht.ConditionWitness;
const Nc = {
  key: Ht.Cosigner,
  encode: (e) => [
    {
      type: Oc,
      key: new Uint8Array([
        ..._o[Ht.Cosigner],
        e.index
      ])
    },
    e.key
  ],
  decode: (e) => Cc(() => $c(e[0], Ht.Cosigner) ? {
    index: e[0].key[e[0].key.length - 1],
    key: e[1]
  } : null)
};
Ht.VtxoTreeExpiry;
const _o = Object.fromEntries(Object.values(Ht).map((e) => [
  e,
  new TextEncoder().encode(e)
])), Cc = (e) => {
  try {
    return e();
  } catch {
    return null;
  }
};
function $c(e, t) {
  const n = x.encode(_o[t]);
  return x.encode(new Uint8Array([e.type, ...e.key])).includes(n);
}
const kr = new Error("missing vtxo graph");
class rn {
  constructor(t) {
    this.secretKey = t, this.myNonces = null, this.aggregateNonces = null, this.graph = null, this.scriptRoot = null, this.rootSharedOutputAmount = null;
  }
  static random() {
    const t = Hr();
    return new rn(t);
  }
  init(t, n, r) {
    this.graph = t, this.scriptRoot = n, this.rootSharedOutputAmount = r;
  }
  getPublicKey() {
    return Ft.getPublicKey(this.secretKey);
  }
  getNonces() {
    if (!this.graph)
      throw kr;
    this.myNonces || (this.myNonces = this.generateNonces());
    const t = /* @__PURE__ */ new Map();
    for (const [n, r] of this.myNonces)
      t.set(n, { pubNonce: r.pubNonce });
    return t;
  }
  setAggregatedNonces(t) {
    if (this.aggregateNonces)
      throw new Error("nonces already set");
    this.aggregateNonces = t;
  }
  sign() {
    if (!this.graph)
      throw kr;
    if (!this.aggregateNonces)
      throw new Error("nonces not set");
    if (!this.myNonces)
      throw new Error("nonces not generated");
    const t = /* @__PURE__ */ new Map();
    for (const n of this.graph.iterator()) {
      const r = this.signPartial(n);
      t.set(n.txid, r);
    }
    return t;
  }
  generateNonces() {
    if (!this.graph)
      throw kr;
    const t = /* @__PURE__ */ new Map(), n = Ft.getPublicKey(this.secretKey);
    for (const r of this.graph.iterator()) {
      const o = qu(n);
      t.set(r.txid, o);
    }
    return t;
  }
  signPartial(t) {
    if (!this.graph || !this.scriptRoot || !this.rootSharedOutputAmount)
      throw rn.NOT_INITIALIZED;
    if (!this.myNonces || !this.aggregateNonces)
      throw new Error("session not properly initialized");
    const n = this.myNonces.get(t.txid);
    if (!n)
      throw new Error("missing private nonce");
    const r = this.aggregateNonces.get(t.txid);
    if (!r)
      throw new Error("missing aggregate nonce");
    const o = [], s = [], i = Uc(t.root, 0, Nc).map((u) => u.key), { finalKey: c } = Ro(i, !0, {
      taprootTweak: this.scriptRoot
    });
    for (let u = 0; u < t.root.inputsLength; u++) {
      const f = vf(c, this.graph, this.rootSharedOutputAmount, t.root);
      o.push(f.amount), s.push(f.script);
    }
    const a = t.root.preimageWitnessV1(
      0,
      // always first input
      s,
      me.DEFAULT,
      o
    );
    return xf(n.secNonce, this.secretKey, r.pubNonce, i, a, {
      taprootTweak: this.scriptRoot
    });
  }
}
rn.NOT_INITIALIZED = new Error("session not initialized, call init method");
function vf(e, t, n, r) {
  const o = _.encode(["OP_1", e.slice(1)]);
  if (x.encode(pt(r.toBytes(!0)).reverse()) === t.txid)
    return {
      amount: n,
      script: o
    };
  const i = r.getInput(0);
  if (!i.txid)
    throw new Error("missing parent input txid");
  const c = x.encode(new Uint8Array(i.txid)), a = t.find(c);
  if (!a)
    throw new Error("parent  tx not found");
  if (i.index === void 0)
    throw new Error("missing input index");
  const u = a.root.getOutput(i.index);
  if (!u)
    throw new Error("parent output not found");
  if (!u.amount)
    throw new Error("parent output amount not found");
  return {
    amount: u.amount,
    script: o
  };
}
const $s = new Uint8Array(32).fill(0), Ls = Object.values(me).filter((e) => typeof e == "number");
class Xe {
  constructor(t) {
    this.key = t || Hr();
  }
  static fromPrivateKey(t) {
    return new Xe(t);
  }
  static fromHex(t) {
    return new Xe(x.decode(t));
  }
  static fromRandomBytes() {
    return new Xe(Hr());
  }
  /**
   * Export the private key as a hex string.
   *
   * @returns The private key as a hex string
   */
  toHex() {
    return x.encode(this.key);
  }
  async sign(t, n) {
    const r = t.clone();
    if (!n) {
      try {
        if (!r.sign(this.key, Ls, $s))
          throw new Error("Failed to sign transaction");
      } catch (o) {
        if (!(o instanceof Error && o.message.includes("No inputs signed"))) throw o;
      }
      return r;
    }
    for (const o of n)
      if (!r.signIdx(this.key, o, Ls, $s))
        throw new Error(`Failed to sign input #${o}`);
    return r;
  }
  compressedPublicKey() {
    return Promise.resolve(Mi(this.key, !0));
  }
  xOnlyPublicKey() {
    return Promise.resolve(bo(this.key));
  }
  signerSession() {
    return rn.random();
  }
  async signMessage(t) {
    const n = new TextEncoder().encode(t);
    return wf.sign(dt(n), this.key);
  }
}
class Ve {
  constructor(t, n, r, o = 0) {
    if (this.serverPubKey = t, this.vtxoTaprootKey = n, this.hrp = r, this.version = o, t.length !== 32)
      throw new Error("Invalid server public key length, expected 32 bytes, got " + t.length);
    if (n.length !== 32)
      throw new Error("Invalid vtxo taproot public key length, expected 32 bytes, got " + n.length);
  }
  static decode(t) {
    const n = ve.decodeUnsafe(t, 1023);
    if (!n)
      throw new Error("Invalid address");
    const r = new Uint8Array(ve.fromWords(n.words));
    if (r.length !== 65)
      throw new Error("Invalid data length, expected 65 bytes, got " + r.length);
    const o = r[0], s = r.slice(1, 33), i = r.slice(33, 65);
    return new Ve(s, i, n.prefix, o);
  }
  encode() {
    const t = new Uint8Array(65);
    t[0] = this.version, t.set(this.serverPubKey, 1), t.set(this.vtxoTaprootKey, 33);
    const n = ve.toWords(t);
    return ve.encode(this.hrp, n, 1023);
  }
  // pkScript is the script that should be used to send non-dust funds to the address
  get pkScript() {
    return _.encode(["OP_1", this.vtxoTaprootKey]);
  }
  // subdustPkScript is the script that should be used to send sub-dust funds to the address
  get subdustPkScript() {
    return _.encode(["RETURN", this.vtxoTaprootKey]);
  }
}
const Xn = vo(void 0, !0);
var it;
(function(e) {
  e.Multisig = "multisig", e.CSVMultisig = "csv-multisig", e.ConditionCSVMultisig = "condition-csv-multisig", e.ConditionMultisig = "condition-multisig", e.CLTVMultisig = "cltv-multisig";
})(it || (it = {}));
function Lc(e) {
  const t = [
    Dt,
    Bt,
    on,
    Jn,
    sn
  ];
  for (const n of t)
    try {
      return n.decode(e);
    } catch {
      continue;
    }
  throw new Error(`Failed to decode: script ${x.encode(e)} is not a valid tapscript`);
}
var Dt;
(function(e) {
  let t;
  (function(c) {
    c[c.CHECKSIG = 0] = "CHECKSIG", c[c.CHECKSIGADD = 1] = "CHECKSIGADD";
  })(t = e.MultisigType || (e.MultisigType = {}));
  function n(c) {
    if (c.pubkeys.length === 0)
      throw new Error("At least 1 pubkey is required");
    for (const u of c.pubkeys)
      if (u.length !== 32)
        throw new Error(`Invalid pubkey length: expected 32, got ${u.length}`);
    if (c.type || (c.type = t.CHECKSIG), c.type === t.CHECKSIGADD)
      return {
        type: it.Multisig,
        params: c,
        script: Vu(c.pubkeys.length, c.pubkeys).script
      };
    const a = [];
    for (let u = 0; u < c.pubkeys.length; u++)
      a.push(c.pubkeys[u]), u < c.pubkeys.length - 1 ? a.push("CHECKSIGVERIFY") : a.push("CHECKSIG");
    return {
      type: it.Multisig,
      params: c,
      script: _.encode(a)
    };
  }
  e.encode = n;
  function r(c) {
    if (c.length === 0)
      throw new Error("Failed to decode: script is empty");
    try {
      return o(c);
    } catch {
      try {
        return s(c);
      } catch (u) {
        throw new Error(`Failed to decode script: ${u instanceof Error ? u.message : String(u)}`);
      }
    }
  }
  e.decode = r;
  function o(c) {
    const a = _.decode(c), u = [];
    let f = !1;
    for (let d = 0; d < a.length; d++) {
      const h = a[d];
      if (typeof h != "string" && typeof h != "number") {
        if (h.length !== 32)
          throw new Error(`Invalid pubkey length: expected 32, got ${h.length}`);
        if (u.push(h), d + 1 >= a.length || a[d + 1] !== "CHECKSIGADD" && a[d + 1] !== "CHECKSIG")
          throw new Error("Expected CHECKSIGADD or CHECKSIG after pubkey");
        d++;
        continue;
      }
      if (d === a.length - 1) {
        if (h !== "NUMEQUAL")
          throw new Error("Expected NUMEQUAL at end of script");
        f = !0;
      }
    }
    if (!f)
      throw new Error("Missing NUMEQUAL operation");
    if (u.length === 0)
      throw new Error("Invalid script: must have at least 1 pubkey");
    const l = n({
      pubkeys: u,
      type: t.CHECKSIGADD
    });
    if (x.encode(l.script) !== x.encode(c))
      throw new Error("Invalid script format: script reconstruction mismatch");
    return {
      type: it.Multisig,
      params: { pubkeys: u, type: t.CHECKSIGADD },
      script: c
    };
  }
  function s(c) {
    const a = _.decode(c), u = [];
    for (let l = 0; l < a.length; l++) {
      const d = a[l];
      if (typeof d != "string" && typeof d != "number") {
        if (d.length !== 32)
          throw new Error(`Invalid pubkey length: expected 32, got ${d.length}`);
        if (u.push(d), l + 1 >= a.length)
          throw new Error("Unexpected end of script");
        const h = a[l + 1];
        if (h !== "CHECKSIGVERIFY" && h !== "CHECKSIG")
          throw new Error("Expected CHECKSIGVERIFY or CHECKSIG after pubkey");
        if (l === a.length - 2 && h !== "CHECKSIG")
          throw new Error("Last operation must be CHECKSIG");
        l++;
        continue;
      }
    }
    if (u.length === 0)
      throw new Error("Invalid script: must have at least 1 pubkey");
    const f = n({ pubkeys: u, type: t.CHECKSIG });
    if (x.encode(f.script) !== x.encode(c))
      throw new Error("Invalid script format: script reconstruction mismatch");
    return {
      type: it.Multisig,
      params: { pubkeys: u, type: t.CHECKSIG },
      script: c
    };
  }
  function i(c) {
    return c.type === it.Multisig;
  }
  e.is = i;
})(Dt || (Dt = {}));
var Bt;
(function(e) {
  function t(o) {
    for (const u of o.pubkeys)
      if (u.length !== 32)
        throw new Error(`Invalid pubkey length: expected 32, got ${u.length}`);
    const s = Xn.encode(BigInt(to.encode(o.timelock.type === "blocks" ? { blocks: Number(o.timelock.value) } : { seconds: Number(o.timelock.value) }))), i = [
      s.length === 1 ? s[0] : s,
      "CHECKSEQUENCEVERIFY",
      "DROP"
    ], c = Dt.encode(o), a = new Uint8Array([
      ..._.encode(i),
      ...c.script
    ]);
    return {
      type: it.CSVMultisig,
      params: o,
      script: a
    };
  }
  e.encode = t;
  function n(o) {
    if (o.length === 0)
      throw new Error("Failed to decode: script is empty");
    const s = _.decode(o);
    if (s.length < 3)
      throw new Error("Invalid script: too short (expected at least 3)");
    const i = s[0];
    if (typeof i == "string")
      throw new Error("Invalid script: expected sequence number");
    if (s[1] !== "CHECKSEQUENCEVERIFY" || s[2] !== "DROP")
      throw new Error("Invalid script: expected CHECKSEQUENCEVERIFY DROP");
    const c = new Uint8Array(_.encode(s.slice(3)));
    let a;
    try {
      a = Dt.decode(c);
    } catch (h) {
      throw new Error(`Invalid multisig script: ${h instanceof Error ? h.message : String(h)}`);
    }
    let u;
    typeof i == "number" ? u = i : u = Number(Xn.decode(i));
    const f = to.decode(u), l = f.blocks !== void 0 ? { type: "blocks", value: BigInt(f.blocks) } : { type: "seconds", value: BigInt(f.seconds) }, d = t({
      timelock: l,
      ...a.params
    });
    if (x.encode(d.script) !== x.encode(o))
      throw new Error("Invalid script format: script reconstruction mismatch");
    return {
      type: it.CSVMultisig,
      params: {
        timelock: l,
        ...a.params
      },
      script: o
    };
  }
  e.decode = n;
  function r(o) {
    return o.type === it.CSVMultisig;
  }
  e.is = r;
})(Bt || (Bt = {}));
var on;
(function(e) {
  function t(o) {
    const s = new Uint8Array([
      ...o.conditionScript,
      ..._.encode(["VERIFY"]),
      ...Bt.encode(o).script
    ]);
    return {
      type: it.ConditionCSVMultisig,
      params: o,
      script: s
    };
  }
  e.encode = t;
  function n(o) {
    if (o.length === 0)
      throw new Error("Failed to decode: script is empty");
    const s = _.decode(o);
    if (s.length < 1)
      throw new Error("Invalid script: too short (expected at least 1)");
    let i = -1;
    for (let l = s.length - 1; l >= 0; l--)
      s[l] === "VERIFY" && (i = l);
    if (i === -1)
      throw new Error("Invalid script: missing VERIFY operation");
    const c = new Uint8Array(_.encode(s.slice(0, i))), a = new Uint8Array(_.encode(s.slice(i + 1)));
    let u;
    try {
      u = Bt.decode(a);
    } catch (l) {
      throw new Error(`Invalid CSV multisig script: ${l instanceof Error ? l.message : String(l)}`);
    }
    const f = t({
      conditionScript: c,
      ...u.params
    });
    if (x.encode(f.script) !== x.encode(o))
      throw new Error("Invalid script format: script reconstruction mismatch");
    return {
      type: it.ConditionCSVMultisig,
      params: {
        conditionScript: c,
        ...u.params
      },
      script: o
    };
  }
  e.decode = n;
  function r(o) {
    return o.type === it.ConditionCSVMultisig;
  }
  e.is = r;
})(on || (on = {}));
var Jn;
(function(e) {
  function t(o) {
    const s = new Uint8Array([
      ...o.conditionScript,
      ..._.encode(["VERIFY"]),
      ...Dt.encode(o).script
    ]);
    return {
      type: it.ConditionMultisig,
      params: o,
      script: s
    };
  }
  e.encode = t;
  function n(o) {
    if (o.length === 0)
      throw new Error("Failed to decode: script is empty");
    const s = _.decode(o);
    if (s.length < 1)
      throw new Error("Invalid script: too short (expected at least 1)");
    let i = -1;
    for (let l = s.length - 1; l >= 0; l--)
      s[l] === "VERIFY" && (i = l);
    if (i === -1)
      throw new Error("Invalid script: missing VERIFY operation");
    const c = new Uint8Array(_.encode(s.slice(0, i))), a = new Uint8Array(_.encode(s.slice(i + 1)));
    let u;
    try {
      u = Dt.decode(a);
    } catch (l) {
      throw new Error(`Invalid multisig script: ${l instanceof Error ? l.message : String(l)}`);
    }
    const f = t({
      conditionScript: c,
      ...u.params
    });
    if (x.encode(f.script) !== x.encode(o))
      throw new Error("Invalid script format: script reconstruction mismatch");
    return {
      type: it.ConditionMultisig,
      params: {
        conditionScript: c,
        ...u.params
      },
      script: o
    };
  }
  e.decode = n;
  function r(o) {
    return o.type === it.ConditionMultisig;
  }
  e.is = r;
})(Jn || (Jn = {}));
var sn;
(function(e) {
  function t(o) {
    const s = Xn.encode(o.absoluteTimelock), i = [
      s.length === 1 ? s[0] : s,
      "CHECKLOCKTIMEVERIFY",
      "DROP"
    ], c = _.encode(i), a = new Uint8Array([
      ...c,
      ...Dt.encode(o).script
    ]);
    return {
      type: it.CLTVMultisig,
      params: o,
      script: a
    };
  }
  e.encode = t;
  function n(o) {
    if (o.length === 0)
      throw new Error("Failed to decode: script is empty");
    const s = _.decode(o);
    if (s.length < 3)
      throw new Error("Invalid script: too short (expected at least 3)");
    const i = s[0];
    if (typeof i == "string" || typeof i == "number")
      throw new Error("Invalid script: expected locktime number");
    if (s[1] !== "CHECKLOCKTIMEVERIFY" || s[2] !== "DROP")
      throw new Error("Invalid script: expected CHECKLOCKTIMEVERIFY DROP");
    const c = new Uint8Array(_.encode(s.slice(3)));
    let a;
    try {
      a = Dt.decode(c);
    } catch (l) {
      throw new Error(`Invalid multisig script: ${l instanceof Error ? l.message : String(l)}`);
    }
    const u = Xn.decode(i), f = t({
      absoluteTimelock: u,
      ...a.params
    });
    if (x.encode(f.script) !== x.encode(o))
      throw new Error("Invalid script format: script reconstruction mismatch");
    return {
      type: it.CLTVMultisig,
      params: {
        absoluteTimelock: u,
        ...a.params
      },
      script: o
    };
  }
  e.decode = n;
  function r(o) {
    return o.type === it.CLTVMultisig;
  }
  e.is = r;
})(sn || (sn = {}));
function Je(e) {
  return e[1].subarray(0, e[1].length - 1);
}
class Ot {
  static decode(t) {
    const n = kf(t);
    return new Ot(n);
  }
  constructor(t) {
    this.scripts = t;
    const n = qi(t.map((o) => ({ script: o, leafVersion: zn }))), r = _u(To, n, void 0, !0);
    if (!r.tapLeafScript || r.tapLeafScript.length !== t.length)
      throw new Error("invalid scripts");
    this.leaves = r.tapLeafScript, this.tweakedPublicKey = r.tweakedPubkey;
  }
  encode() {
    return Af(this.scripts);
  }
  address(t, n) {
    return new Ve(n, this.tweakedPublicKey, t);
  }
  get pkScript() {
    return _.encode(["OP_1", this.tweakedPublicKey]);
  }
  onchainAddress(t) {
    return ye(t).encode({
      type: "tr",
      pubkey: this.tweakedPublicKey
    });
  }
  findLeaf(t) {
    const n = this.leaves.find((r) => x.encode(Je(r)) === t);
    if (!n)
      throw new Error(`leaf '${t}' not found`);
    return n;
  }
  exitPaths() {
    const t = [];
    for (const n of this.leaves)
      try {
        const r = Bt.decode(Je(n));
        t.push(r);
        continue;
      } catch {
        try {
          const o = on.decode(Je(n));
          t.push(o);
        } catch {
          continue;
        }
      }
    return t;
  }
}
function kf(e) {
  let t = 0;
  const n = [], [r, o] = Rs(e, t);
  t += o;
  for (let s = 0; s < r; s++) {
    t += 1, t += 1;
    const [i, c] = Rs(e, t);
    t += c;
    const a = e.slice(t, t + i);
    n.push(a), t += i;
  }
  return n;
}
function Rs(e, t) {
  const n = e[t];
  return n < 253 ? [n, 1] : n === 253 ? [new DataView(e.buffer).getUint16(t + 1, !0), 3] : n === 254 ? [new DataView(e.buffer).getUint32(t + 1, !0), 5] : [Number(new DataView(e.buffer).getBigUint64(t + 1, !0)), 9];
}
function Af(e) {
  const t = [];
  t.push(Ps(e.length));
  for (const s of e)
    t.push(new Uint8Array([1])), t.push(new Uint8Array([192])), t.push(Ps(s.length)), t.push(s);
  const n = t.reduce((s, i) => s + i.length, 0), r = new Uint8Array(n);
  let o = 0;
  for (const s of t)
    r.set(s, o), o += s.length;
  return r;
}
function Ps(e) {
  if (e < 253)
    return new Uint8Array([e]);
  if (e <= 65535) {
    const t = new Uint8Array(3);
    return t[0] = 253, new DataView(t.buffer).setUint16(1, e, !0), t;
  } else if (e <= 4294967295) {
    const t = new Uint8Array(5);
    return t[0] = 254, new DataView(t.buffer).setUint32(1, e, !0), t;
  } else {
    const t = new Uint8Array(9);
    return t[0] = 255, new DataView(t.buffer).setBigUint64(1, BigInt(e), !0), t;
  }
}
var _s;
(function(e) {
  class t extends Ot {
    constructor(o) {
      n(o);
      const { sender: s, receiver: i, server: c, preimageHash: a, refundLocktime: u, unilateralClaimDelay: f, unilateralRefundDelay: l, unilateralRefundWithoutReceiverDelay: d } = o, h = If(a), g = Jn.encode({
        conditionScript: h,
        pubkeys: [i, c]
      }).script, p = Dt.encode({
        pubkeys: [s, i, c]
      }).script, y = sn.encode({
        absoluteTimelock: u,
        pubkeys: [s, c]
      }).script, m = on.encode({
        conditionScript: h,
        timelock: f,
        pubkeys: [i]
      }).script, b = Bt.encode({
        timelock: l,
        pubkeys: [s, i]
      }).script, k = Bt.encode({
        timelock: d,
        pubkeys: [s]
      }).script;
      super([
        g,
        p,
        y,
        m,
        b,
        k
      ]), this.options = o, this.claimScript = x.encode(g), this.refundScript = x.encode(p), this.refundWithoutReceiverScript = x.encode(y), this.unilateralClaimScript = x.encode(m), this.unilateralRefundScript = x.encode(b), this.unilateralRefundWithoutReceiverScript = x.encode(k);
    }
    claim() {
      return this.findLeaf(this.claimScript);
    }
    refund() {
      return this.findLeaf(this.refundScript);
    }
    refundWithoutReceiver() {
      return this.findLeaf(this.refundWithoutReceiverScript);
    }
    unilateralClaim() {
      return this.findLeaf(this.unilateralClaimScript);
    }
    unilateralRefund() {
      return this.findLeaf(this.unilateralRefundScript);
    }
    unilateralRefundWithoutReceiver() {
      return this.findLeaf(this.unilateralRefundWithoutReceiverScript);
    }
  }
  e.Script = t;
  function n(r) {
    const { sender: o, receiver: s, server: i, preimageHash: c, refundLocktime: a, unilateralClaimDelay: u, unilateralRefundDelay: f, unilateralRefundWithoutReceiverDelay: l } = r;
    if (!c || c.length !== 20)
      throw new Error("preimage hash must be 20 bytes");
    if (!s || s.length !== 32)
      throw new Error("Invalid public key length (receiver)");
    if (!o || o.length !== 32)
      throw new Error("Invalid public key length (sender)");
    if (!i || i.length !== 32)
      throw new Error("Invalid public key length (server)");
    if (typeof a != "bigint" || a <= 0n)
      throw new Error("refund locktime must be greater than 0");
    if (!u || typeof u.value != "bigint" || u.value <= 0n)
      throw new Error("unilateral claim delay must greater than 0");
    if (u.type === "seconds" && u.value % 512n !== 0n)
      throw new Error("seconds timelock must be multiple of 512");
    if (u.type === "seconds" && u.value < 512n)
      throw new Error("seconds timelock must be greater or equal to 512");
    if (!f || typeof f.value != "bigint" || f.value <= 0n)
      throw new Error("unilateral refund delay must greater than 0");
    if (f.type === "seconds" && f.value % 512n !== 0n)
      throw new Error("seconds timelock must be multiple of 512");
    if (f.type === "seconds" && f.value < 512n)
      throw new Error("seconds timelock must be greater or equal to 512");
    if (!l || typeof l.value != "bigint" || l.value <= 0n)
      throw new Error("unilateral refund without receiver delay must greater than 0");
    if (l.type === "seconds" && l.value % 512n !== 0n)
      throw new Error("seconds timelock must be multiple of 512");
    if (l.type === "seconds" && l.value < 512n)
      throw new Error("seconds timelock must be greater or equal to 512");
  }
})(_s || (_s = {}));
function If(e) {
  return _.encode(["HASH160", e, "EQUAL"]);
}
var Qn;
(function(e) {
  class t extends Ot {
    constructor(r) {
      const { pubKey: o, serverPubKey: s, csvTimelock: i = t.DEFAULT_TIMELOCK } = r, c = Dt.encode({
        pubkeys: [o, s]
      }).script, a = Bt.encode({
        timelock: i,
        pubkeys: [o]
      }).script;
      super([c, a]), this.options = r, this.forfeitScript = x.encode(c), this.exitScript = x.encode(a);
    }
    forfeit() {
      return this.findLeaf(this.forfeitScript);
    }
    exit() {
      return this.findLeaf(this.exitScript);
    }
  }
  t.DEFAULT_TIMELOCK = {
    value: 144n,
    type: "blocks"
  }, e.Script = t;
})(Qn || (Qn = {}));
var cn;
(function(e) {
  e.TxSent = "SENT", e.TxReceived = "RECEIVED";
})(cn || (cn = {}));
function oe(e) {
  return e.spentBy === void 0 || e.spentBy === "";
}
function Bf(e) {
  return e.virtualStatus.state === "swept" && oe(e);
}
function Rc(e, t) {
  return e.value < t;
}
function Pc(e, t, n) {
  const r = [];
  let o = [...t];
  for (const i of [...e, ...t]) {
    if (i.virtualStatus.state !== "preconfirmed" && i.virtualStatus.commitmentTxIds && i.virtualStatus.commitmentTxIds.some((h) => n.has(h)))
      continue;
    const c = Of(o, i);
    o = Vs(o, c);
    const a = vn(c);
    if (i.value <= a)
      continue;
    const u = Uf(o, i);
    o = Vs(o, u);
    const f = vn(u);
    if (i.value <= f)
      continue;
    const l = {
      commitmentTxid: i.spentBy || "",
      boardingTxid: "",
      arkTxid: ""
    };
    let d = i.virtualStatus.state !== "preconfirmed";
    i.virtualStatus.state === "preconfirmed" && (l.arkTxid = i.txid, i.spentBy && (d = !0)), r.push({
      key: l,
      amount: i.value - a - f,
      type: cn.TxReceived,
      createdAt: i.createdAt.getTime(),
      settled: d
    });
  }
  const s = /* @__PURE__ */ new Map();
  for (const i of t) {
    if (i.settledBy) {
      s.has(i.settledBy) || s.set(i.settledBy, []);
      const a = s.get(i.settledBy);
      s.set(i.settledBy, [...a, i]);
    }
    if (!i.arkTxId)
      continue;
    s.has(i.arkTxId) || s.set(i.arkTxId, []);
    const c = s.get(i.arkTxId);
    s.set(i.arkTxId, [...c, i]);
  }
  for (const [i, c] of s) {
    const a = Nf([...e, ...t], i), u = vn(a), f = vn(c);
    if (f <= u)
      continue;
    const l = Cf(a, c), d = {
      commitmentTxid: l.virtualStatus.commitmentTxIds?.[0] || "",
      boardingTxid: "",
      arkTxid: ""
    };
    l.virtualStatus.state === "preconfirmed" && (d.arkTxid = l.txid), r.push({
      key: d,
      amount: f - u,
      type: cn.TxSent,
      createdAt: l.createdAt.getTime(),
      settled: !0
    });
  }
  return r;
}
function Of(e, t) {
  return t.virtualStatus.state === "preconfirmed" ? [] : e.filter((n) => n.settledBy ? t.virtualStatus.commitmentTxIds?.includes(n.settledBy) ?? !1 : !1);
}
function Uf(e, t) {
  return e.filter((n) => n.arkTxId ? n.arkTxId === t.txid : !1);
}
function Nf(e, t) {
  return e.filter((n) => n.virtualStatus.state !== "preconfirmed" && n.virtualStatus.commitmentTxIds?.includes(t) ? !0 : n.txid === t);
}
function vn(e) {
  return e.reduce((t, n) => t + n.value, 0);
}
function Cf(e, t) {
  return e.length === 0 ? t[0] : e[0];
}
function Vs(e, t) {
  return e.filter((n) => {
    for (const r of t)
      if (n.txid === r.txid && n.vout === r.vout)
        return !1;
    return !0;
  });
}
const $f = (e) => Lf[e], Lf = {
  bitcoin: Ge(Re, "ark"),
  testnet: Ge(xn, "tark"),
  signet: Ge(xn, "tark"),
  mutinynet: Ge(xn, "tark"),
  regtest: Ge({
    ...xn,
    bech32: "bcrt",
    pubKeyHash: 111,
    scriptHash: 196
  }, "tark")
};
function Ge(e, t) {
  return {
    ...e,
    hrp: t
  };
}
const Rf = {
  bitcoin: "https://mempool.space/api",
  testnet: "https://mempool.space/testnet/api",
  signet: "https://mempool.space/signet/api",
  mutinynet: "https://mutinynet.com/api",
  regtest: "http://localhost:3000"
};
class Pf {
  constructor(t) {
    this.baseUrl = t, this.polling = !1;
  }
  async getCoins(t) {
    const n = await fetch(`${this.baseUrl}/address/${t}/utxo`);
    if (!n.ok)
      throw new Error(`Failed to fetch UTXOs: ${n.statusText}`);
    return n.json();
  }
  async getFeeRate() {
    const t = await fetch(`${this.baseUrl}/fee-estimates`);
    if (!t.ok)
      throw new Error(`Failed to fetch fee rate: ${t.statusText}`);
    return (await t.json())[1] ?? void 0;
  }
  async broadcastTransaction(...t) {
    switch (t.length) {
      case 1:
        return this.broadcastTx(t[0]);
      case 2:
        return this.broadcastPackage(t[0], t[1]);
      default:
        throw new Error("Only 1 or 1C1P package can be broadcast");
    }
  }
  async getTxOutspends(t) {
    const n = await fetch(`${this.baseUrl}/tx/${t}/outspends`);
    if (!n.ok) {
      const r = await n.text();
      throw new Error(`Failed to get transaction outspends: ${r}`);
    }
    return n.json();
  }
  async getTransactions(t) {
    const n = await fetch(`${this.baseUrl}/address/${t}/txs`);
    if (!n.ok) {
      const r = await n.text();
      throw new Error(`Failed to get transactions: ${r}`);
    }
    return n.json();
  }
  async getTxStatus(t) {
    const n = await fetch(`${this.baseUrl}/tx/${t}`);
    if (!n.ok)
      throw new Error(n.statusText);
    if (!(await n.json()).status.confirmed)
      return { confirmed: !1 };
    const o = await fetch(`${this.baseUrl}/tx/${t}/status`);
    if (!o.ok)
      throw new Error(`Failed to get transaction status: ${o.statusText}`);
    const s = await o.json();
    return s.confirmed ? {
      confirmed: s.confirmed,
      blockTime: s.block_time,
      blockHeight: s.block_height
    } : { confirmed: !1 };
  }
  async watchAddresses(t, n) {
    let r = null;
    const o = this.baseUrl.replace(/^http(s)?:/, "ws$1:") + "/v1/ws", s = async () => {
      if (this.polling)
        return;
      this.polling = !0;
      const a = 5e3, u = () => Promise.all(t.map((h) => this.getTransactions(h))).then((h) => h.flat()), f = await u(), l = (h) => `${h.txid}_${h.status.block_time}`, d = new Set(f.map(l));
      r = setInterval(async () => {
        try {
          const g = (await u()).filter((p) => !d.has(l(p)));
          g.length > 0 && (g.forEach((p) => d.add(l(p))), n(g));
        } catch (h) {
          console.error("Error in polling mechanism:", h);
        }
      }, a);
    };
    let i = null;
    try {
      i = new WebSocket(o), i.addEventListener("open", () => {
        const a = {
          "track-addresses": t
        };
        i.send(JSON.stringify(a));
      }), i.addEventListener("message", (a) => {
        try {
          const u = [], f = JSON.parse(a.data.toString());
          if (!f["multi-address-transactions"])
            return;
          const l = f["multi-address-transactions"];
          for (const d in l)
            for (const h of [
              "mempool",
              "confirmed",
              "removed"
            ])
              l[d][h] && u.push(...l[d][h].filter(Vf));
          u.length > 0 && n(u);
        } catch (u) {
          console.error("Failed to process WebSocket message:", u);
        }
      }), i.addEventListener("error", async () => {
        await s();
      });
    } catch {
      r && clearInterval(r), await s();
    }
    return () => {
      i && i.readyState === WebSocket.OPEN && i.close(), r && clearInterval(r), this.polling = !1;
    };
  }
  async getChainTip() {
    const t = await fetch(`${this.baseUrl}/blocks/tip`);
    if (!t.ok)
      throw new Error(`Failed to get chain tip: ${t.statusText}`);
    const n = await t.json();
    if (!_f(n))
      throw new Error(`Invalid chain tip: ${JSON.stringify(n)}`);
    if (n.length === 0)
      throw new Error("No chain tip found");
    const r = n[0].id;
    return {
      height: n[0].height,
      time: n[0].mediantime,
      hash: r
    };
  }
  async broadcastPackage(t, n) {
    const r = await fetch(`${this.baseUrl}/txs/package`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify([t, n])
    });
    if (!r.ok) {
      const o = await r.text();
      throw new Error(`Failed to broadcast package: ${o}`);
    }
    return r.json();
  }
  async broadcastTx(t) {
    const n = await fetch(`${this.baseUrl}/tx`, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain"
      },
      body: t
    });
    if (!n.ok) {
      const r = await n.text();
      throw new Error(`Failed to broadcast transaction: ${r}`);
    }
    return n.text();
  }
}
function _f(e) {
  return Array.isArray(e) && e.every((t) => {
    t && typeof t == "object" && typeof t.id == "string" && t.id.length > 0 && typeof t.height == "number" && t.height >= 0 && typeof t.mediantime == "number" && t.mediantime > 0;
  });
}
const Vf = (e) => typeof e.txid == "string" && Array.isArray(e.vout) && e.vout.every((t) => typeof t.scriptpubkey_address == "string" && typeof t.value == "string") && typeof e.status == "object" && typeof e.status.confirmed == "boolean" && typeof e.status.block_time == "number";
async function* eo(e) {
  const t = [], n = [];
  let r = null, o = null;
  const s = (c) => {
    r ? (r(c), r = null) : t.push(c);
  }, i = () => {
    const c = new Error("EventSource error");
    o ? (o(c), o = null) : n.push(c);
  };
  e.addEventListener("message", s), e.addEventListener("error", i);
  try {
    for (; ; ) {
      if (t.length > 0) {
        yield t.shift();
        continue;
      }
      if (n.length > 0)
        throw n.shift();
      const c = await new Promise((a, u) => {
        r = a, o = u;
      }).finally(() => {
        r = null, o = null;
      });
      c && (yield c);
    }
  } finally {
    e.removeEventListener("message", s), e.removeEventListener("error", i);
  }
}
var G;
(function(e) {
  e.BatchStarted = "batch_started", e.BatchFinalization = "batch_finalization", e.BatchFinalized = "batch_finalized", e.BatchFailed = "batch_failed", e.TreeSigningStarted = "tree_signing_started", e.TreeNoncesAggregated = "tree_nonces_aggregated", e.TreeTx = "tree_tx", e.TreeSignature = "tree_signature";
})(G || (G = {}));
class _c {
  constructor(t) {
    this.serverUrl = t;
  }
  async getInfo() {
    const t = `${this.serverUrl}/v1/info`, n = await fetch(t);
    if (!n.ok)
      throw new Error(`Failed to get server info: ${n.statusText}`);
    const r = await n.json();
    return {
      ...r,
      vtxoTreeExpiry: BigInt(r.vtxoTreeExpiry ?? 0),
      unilateralExitDelay: BigInt(r.unilateralExitDelay ?? 0),
      roundInterval: BigInt(r.roundInterval ?? 0),
      dust: BigInt(r.dust ?? 0),
      utxoMinAmount: BigInt(r.utxoMinAmount ?? 0),
      utxoMaxAmount: BigInt(r.utxoMaxAmount ?? -1),
      vtxoMinAmount: BigInt(r.vtxoMinAmount ?? 0),
      vtxoMaxAmount: BigInt(r.vtxoMaxAmount ?? -1),
      boardingExitDelay: BigInt(r.boardingExitDelay ?? 0),
      checkpointExitClosure: r.checkpointTapscript ?? "",
      marketHour: "marketHour" in r && r.marketHour != null ? {
        nextStartTime: BigInt(r.marketHour.nextStartTime ?? 0),
        nextEndTime: BigInt(r.marketHour.nextEndTime ?? 0),
        period: BigInt(r.marketHour.period ?? 0),
        roundInterval: BigInt(r.marketHour.roundInterval ?? 0)
      } : void 0
    };
  }
  async submitTx(t, n) {
    const r = `${this.serverUrl}/v1/tx/submit`, o = await fetch(r, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        signedArkTx: t,
        checkpointTxs: n
      })
    });
    if (!o.ok) {
      const i = await o.text();
      try {
        const c = JSON.parse(i);
        throw new Error(`Failed to submit virtual transaction: ${c.message || c.error || i}`);
      } catch {
        throw new Error(`Failed to submit virtual transaction: ${i}`);
      }
    }
    const s = await o.json();
    return {
      arkTxid: s.arkTxid,
      finalArkTx: s.finalArkTx,
      signedCheckpointTxs: s.signedCheckpointTxs
    };
  }
  async finalizeTx(t, n) {
    const r = `${this.serverUrl}/v1/tx/finalize`, o = await fetch(r, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        arkTxid: t,
        finalCheckpointTxs: n
      })
    });
    if (!o.ok) {
      const s = await o.text();
      throw new Error(`Failed to finalize offchain transaction: ${s}`);
    }
  }
  async registerIntent(t) {
    const n = `${this.serverUrl}/v1/batch/registerIntent`, r = await fetch(n, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        intent: {
          signature: t.signature,
          message: t.message
        }
      })
    });
    if (!r.ok) {
      const s = await r.text();
      throw new Error(`Failed to register intent: ${s}`);
    }
    return (await r.json()).intentId;
  }
  async deleteIntent(t) {
    const n = `${this.serverUrl}/v1/batch/deleteIntent`, r = await fetch(n, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        proof: {
          signature: t.signature,
          message: t.message
        }
      })
    });
    if (!r.ok) {
      const o = await r.text();
      throw new Error(`Failed to delete intent: ${o}`);
    }
  }
  async confirmRegistration(t) {
    const n = `${this.serverUrl}/v1/batch/ack`, r = await fetch(n, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        intentId: t
      })
    });
    if (!r.ok) {
      const o = await r.text();
      throw new Error(`Failed to confirm registration: ${o}`);
    }
  }
  async submitTreeNonces(t, n, r) {
    const o = `${this.serverUrl}/v1/batch/tree/submitNonces`, s = await fetch(o, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        batchId: t,
        pubkey: n,
        treeNonces: Hf(r)
      })
    });
    if (!s.ok) {
      const i = await s.text();
      throw new Error(`Failed to submit tree nonces: ${i}`);
    }
  }
  async submitTreeSignatures(t, n, r) {
    const o = `${this.serverUrl}/v1/batch/tree/submitSignatures`, s = await fetch(o, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        batchId: t,
        pubkey: n,
        treeSignatures: Df(r)
      })
    });
    if (!s.ok) {
      const i = await s.text();
      throw new Error(`Failed to submit tree signatures: ${i}`);
    }
  }
  async submitSignedForfeitTxs(t, n) {
    const r = `${this.serverUrl}/v1/batch/submitForfeitTxs`, o = await fetch(r, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        signedForfeitTxs: t,
        signedCommitmentTx: n
      })
    });
    if (!o.ok)
      throw new Error(`Failed to submit forfeit transactions: ${o.statusText}`);
  }
  async *getEventStream(t, n) {
    const r = `${this.serverUrl}/v1/batch/events`, o = n.length > 0 ? `?${n.map((s) => `topics=${encodeURIComponent(s)}`).join("&")}` : "";
    for (; !t?.aborted; )
      try {
        const s = new EventSource(r + o), i = () => {
          s.close();
        };
        t?.addEventListener("abort", i);
        try {
          for await (const c of eo(s)) {
            if (t?.aborted)
              break;
            try {
              const a = JSON.parse(c.data), u = this.parseSettlementEvent(a);
              u && (yield u);
            } catch (a) {
              throw console.error("Failed to parse event:", a), a;
            }
          }
        } finally {
          t?.removeEventListener("abort", i), s.close();
        }
      } catch (s) {
        if (s instanceof Error && s.name === "AbortError")
          break;
        if (no(s)) {
          console.debug("Timeout error ignored");
          continue;
        }
        throw console.error("Event stream error:", s), s;
      }
  }
  async *getTransactionsStream(t) {
    const n = `${this.serverUrl}/v1/txs`;
    for (; !t?.aborted; )
      try {
        const r = new EventSource(n), o = () => {
          r.close();
        };
        t?.addEventListener("abort", o);
        try {
          for await (const s of eo(r)) {
            if (t?.aborted)
              break;
            try {
              const i = JSON.parse(s.data), c = this.parseTransactionNotification(i);
              c && (yield c);
            } catch (i) {
              throw console.error("Failed to parse transaction notification:", i), i;
            }
          }
        } finally {
          t?.removeEventListener("abort", o), r.close();
        }
      } catch (r) {
        if (r instanceof Error && r.name === "AbortError")
          break;
        if (no(r)) {
          console.debug("Timeout error ignored");
          continue;
        }
        throw console.error("Transaction stream error:", r), r;
      }
  }
  parseSettlementEvent(t) {
    if (t.batchStarted)
      return {
        type: G.BatchStarted,
        id: t.batchStarted.id,
        intentIdHashes: t.batchStarted.intentIdHashes,
        batchExpiry: BigInt(t.batchStarted.batchExpiry)
      };
    if (t.batchFinalization)
      return {
        type: G.BatchFinalization,
        id: t.batchFinalization.id,
        commitmentTx: t.batchFinalization.commitmentTx
      };
    if (t.batchFinalized)
      return {
        type: G.BatchFinalized,
        id: t.batchFinalized.id,
        commitmentTxid: t.batchFinalized.commitmentTxid
      };
    if (t.batchFailed)
      return {
        type: G.BatchFailed,
        id: t.batchFailed.id,
        reason: t.batchFailed.reason
      };
    if (t.treeSigningStarted)
      return {
        type: G.TreeSigningStarted,
        id: t.treeSigningStarted.id,
        cosignersPublicKeys: t.treeSigningStarted.cosignersPubkeys,
        unsignedCommitmentTx: t.treeSigningStarted.unsignedCommitmentTx
      };
    if (t.treeNoncesAggregated)
      return {
        type: G.TreeNoncesAggregated,
        id: t.treeNoncesAggregated.id,
        treeNonces: Mf(t.treeNoncesAggregated.treeNonces)
      };
    if (t.treeTx) {
      const n = Object.fromEntries(Object.entries(t.treeTx.children).map(([r, o]) => [parseInt(r), o]));
      return {
        type: G.TreeTx,
        id: t.treeTx.id,
        topic: t.treeTx.topic,
        batchIndex: t.treeTx.batchIndex,
        chunk: {
          txid: t.treeTx.txid,
          tx: t.treeTx.tx,
          children: n
        }
      };
    }
    return t.treeSignature ? {
      type: G.TreeSignature,
      id: t.treeSignature.id,
      topic: t.treeSignature.topic,
      batchIndex: t.treeSignature.batchIndex,
      txid: t.treeSignature.txid,
      signature: t.treeSignature.signature
    } : (t.heartbeat || console.warn("Unknown event type:", t), null);
  }
  parseTransactionNotification(t) {
    return t.commitmentTx ? {
      commitmentTx: {
        txid: t.commitmentTx.txid,
        tx: t.commitmentTx.tx,
        spentVtxos: t.commitmentTx.spentVtxos.map(kn),
        spendableVtxos: t.commitmentTx.spendableVtxos.map(kn),
        checkpointTxs: t.commitmentTx.checkpointTxs
      }
    } : t.arkTx ? {
      arkTx: {
        txid: t.arkTx.txid,
        tx: t.arkTx.tx,
        spentVtxos: t.arkTx.spentVtxos.map(kn),
        spendableVtxos: t.arkTx.spendableVtxos.map(kn),
        checkpointTxs: t.arkTx.checkpointTxs
      }
    } : (t.heartbeat || console.warn("Unknown transaction notification type:", t), null);
  }
}
function Hf(e) {
  const t = {};
  for (const [n, r] of e)
    t[n] = x.encode(r.pubNonce);
  return JSON.stringify(t);
}
function Df(e) {
  const t = {};
  for (const [n, r] of e)
    t[n] = x.encode(r.encode());
  return JSON.stringify(t);
}
function Mf(e) {
  const t = JSON.parse(e);
  return new Map(Object.entries(t).map(([n, r]) => {
    if (typeof r != "string")
      throw new Error("invalid nonce");
    return [n, { pubNonce: x.decode(r) }];
  }));
}
function no(e) {
  const t = (n) => n instanceof Error ? n.name === "TypeError" && n.message === "Failed to fetch" || n.name === "HeadersTimeoutError" || n.name === "BodyTimeoutError" || n.code === "UND_ERR_HEADERS_TIMEOUT" || n.code === "UND_ERR_BODY_TIMEOUT" : !1;
  return t(e) || t(e.cause);
}
function kn(e) {
  return {
    outpoint: {
      txid: e.outpoint.txid,
      vout: e.outpoint.vout
    },
    amount: e.amount,
    script: e.script,
    createdAt: e.createdAt,
    expiresAt: e.expiresAt,
    commitmentTxids: e.commitmentTxids,
    isPreconfirmed: e.isPreconfirmed,
    isSwept: e.isSwept,
    isUnrolled: e.isUnrolled,
    isSpent: e.isSpent,
    spentBy: e.spentBy,
    settledBy: e.settledBy,
    arkTxid: e.arkTxid
  };
}
const Kf = 0n, Ff = new Uint8Array([81, 2, 78, 115]), Vo = {
  script: Ff,
  amount: Kf
};
x.encode(Vo.script);
function Wf(e, t, n) {
  const r = new gt({
    version: 3,
    lockTime: n
  });
  let o = 0n;
  for (const s of e) {
    if (!s.witnessUtxo)
      throw new Error("input needs witness utxo");
    o += s.witnessUtxo.amount, r.addInput(s);
  }
  return r.addOutput({
    script: t,
    amount: o
  }), r.addOutput(Vo), r;
}
const zf = new Error("invalid settlement transaction outputs"), Gf = new Error("empty tree"), jf = new Error("invalid number of inputs"), Ar = new Error("wrong settlement txid"), Yf = new Error("invalid amount"), qf = new Error("no leaves"), Zf = new Error("invalid taproot script"), Hs = new Error("invalid round transaction outputs"), Xf = new Error("wrong commitment txid"), Jf = new Error("missing cosigners public keys"), Ir = 0, Ds = 1;
function Qf(e, t) {
  if (t.validate(), t.root.inputsLength !== 1)
    throw jf;
  const n = t.root.getInput(0), r = gt.fromPSBT(At.decode(e));
  if (r.outputsLength <= Ds)
    throw zf;
  const o = x.encode(pt(r.toBytes(!0)).reverse());
  if (!n.txid || x.encode(n.txid) !== o || n.index !== Ds)
    throw Ar;
}
function tl(e, t, n) {
  if (t.outputsLength < Ir + 1)
    throw Hs;
  const r = t.getOutput(Ir)?.amount;
  if (!r)
    throw Hs;
  if (!e.root)
    throw Gf;
  const o = e.root.getInput(0), s = x.encode(pt(t.toBytes(!0)).reverse());
  if (!o.txid || x.encode(o.txid) !== s || o.index !== Ir)
    throw Xf;
  let i = 0n;
  for (let a = 0; a < e.root.outputsLength; a++) {
    const u = e.root.getOutput(a);
    u?.amount && (i += u.amount);
  }
  if (i !== r)
    throw Yf;
  if (e.leaves().length === 0)
    throw qf;
  e.validate();
  for (const a of e.iterator())
    for (const [u, f] of a.children) {
      const l = a.root.getOutput(u);
      if (!l?.script)
        throw new Error(`parent output ${u} not found`);
      const d = l.script.slice(2);
      if (d.length !== 32)
        throw new Error(`parent output ${u} has invalid script`);
      const h = Uc(f.root, 0, Nc);
      if (h.length === 0)
        throw Jf;
      const g = h.map((y) => y.key), { finalKey: p } = Ro(g, !0, {
        taprootTweak: n
      });
      if (!p || x.encode(p.slice(1)) !== x.encode(d))
        throw Zf;
    }
}
function el(e, t, n) {
  const r = e.map((s) => nl(s, n));
  return {
    arkTx: Vc(r.map((s) => s.input), t),
    checkpoints: r.map((s) => s.tx)
  };
}
function Vc(e, t) {
  let n = 0n;
  for (const o of e) {
    const s = Lc(Je(o.tapLeafScript));
    if (sn.is(s)) {
      if (n !== 0n && Ms(n) !== Ms(s.params.absoluteTimelock))
        throw new Error("cannot mix seconds and blocks locktime");
      s.params.absoluteTimelock > n && (n = s.params.absoluteTimelock);
    }
  }
  const r = new gt({
    version: 3,
    allowUnknown: !0,
    allowUnknownOutputs: !0,
    lockTime: Number(n)
  });
  for (const [o, s] of e.entries())
    r.addInput({
      txid: s.txid,
      index: s.vout,
      sequence: n ? Uo - 1 : void 0,
      witnessUtxo: {
        script: Ot.decode(s.tapTree).pkScript,
        amount: BigInt(s.value)
      },
      tapLeafScript: [s.tapLeafScript]
    }), Sf(r, o, Tf, s.tapTree);
  for (const o of t)
    r.addOutput(o);
  return r.addOutput(Vo), r;
}
function nl(e, t) {
  const n = Lc(e.checkpointTapLeafScript ?? Je(e.tapLeafScript)), r = new Ot([
    t.script,
    n.script
  ]), o = Vc([e], [
    {
      amount: BigInt(e.value),
      script: r.pkScript
    }
  ]), s = r.findLeaf(x.encode(n.script)), i = {
    txid: x.encode(pt(o.toBytes(!0)).reverse()),
    vout: 0,
    value: e.value,
    tapLeafScript: s,
    tapTree: r.encode()
  };
  return {
    tx: o,
    input: i
  };
}
const rl = 500000000n;
function Ms(e) {
  return e >= rl;
}
class ot {
  constructor(t, n, r = ot.DefaultHRP) {
    this.preimage = t, this.value = n, this.HRP = r, this.vout = 0;
    const o = dt(this.preimage);
    this.vtxoScript = new Ot([il(o)]);
    const s = this.vtxoScript.leaves[0];
    this.txid = x.encode(new Uint8Array(o).reverse()), this.tapTree = this.vtxoScript.encode(), this.forfeitTapLeafScript = s, this.intentTapLeafScript = s, this.value = n, this.status = { confirmed: !0 }, this.extraWitness = [this.preimage];
  }
  encode() {
    const t = new Uint8Array(ot.Length);
    return t.set(this.preimage, 0), ol(t, this.value, this.preimage.length), t;
  }
  static decode(t, n = ot.DefaultHRP) {
    if (t.length !== ot.Length)
      throw new Error(`invalid data length: expected ${ot.Length} bytes, got ${t.length}`);
    const r = t.subarray(0, ot.PreimageLength), o = sl(t, ot.PreimageLength);
    return new ot(r, o, n);
  }
  static fromString(t, n = ot.DefaultHRP) {
    if (t = t.trim(), !t.startsWith(n))
      throw new Error(`invalid human-readable part: expected ${n} prefix (note '${t}')`);
    const r = t.slice(n.length), o = Nr.decode(r);
    if (o.length === 0)
      throw new Error("failed to decode base58 string");
    return ot.decode(o, n);
  }
  toString() {
    return this.HRP + Nr.encode(this.encode());
  }
}
ot.DefaultHRP = "arknote";
ot.PreimageLength = 32;
ot.ValueLength = 4;
ot.Length = ot.PreimageLength + ot.ValueLength;
ot.FakeOutpointIndex = 0;
function ol(e, t, n) {
  new DataView(e.buffer, e.byteOffset + n, 4).setUint32(0, t, !1);
}
function sl(e, t) {
  return new DataView(e.buffer, e.byteOffset + t, 4).getUint32(0, !1);
}
function il(e) {
  return _.encode(["SHA256", e, "EQUAL"]);
}
class Ho extends Error {
  constructor(t) {
    super(t), this.name = "BIP322Error";
  }
}
const cl = new Ho("missing inputs"), tr = new Ho("missing data"), al = new Ho("missing witness utxo");
var er;
(function(e) {
  function t(r, o, s = []) {
    if (o.length == 0)
      throw cl;
    pl(o), wl(s);
    const i = yl(r, o[0].witnessUtxo.script);
    return ml(i, o, s);
  }
  e.create = t;
  function n(r, o = (s) => s.finalize()) {
    return o(r), At.encode(r.extract());
  }
  e.signature = n;
})(er || (er = {}));
const ul = new Uint8Array([ct.RETURN]), fl = new Uint8Array(32).fill(0), ll = 4294967295, dl = "BIP0322-signed-message";
function hl(e) {
  if (e.index === void 0 || e.txid === void 0)
    throw tr;
  if (e.witnessUtxo === void 0)
    throw al;
  return !0;
}
function pl(e) {
  return e.forEach(hl), !0;
}
function gl(e) {
  if (e.amount === void 0 || e.script === void 0)
    throw tr;
  return !0;
}
function wl(e) {
  return e.forEach(gl), !0;
}
function yl(e, t) {
  const n = El(e), r = new gt({
    version: 0,
    allowUnknownOutputs: !0,
    allowUnknown: !0,
    allowUnknownInputs: !0
  });
  return r.addInput({
    txid: fl,
    // zero hash
    index: ll,
    sequence: 0
  }), r.addOutput({
    amount: 0n,
    script: t
  }), r.updateInput(0, {
    finalScriptSig: _.encode(["OP_0", n])
  }), r;
}
function ml(e, t, n) {
  const r = t[0], o = new gt({
    version: 2,
    allowUnknownOutputs: n.length === 0,
    allowUnknown: !0,
    allowUnknownInputs: !0,
    lockTime: 0
  });
  o.addInput({
    ...r,
    txid: e.id,
    index: 0,
    witnessUtxo: {
      script: r.witnessUtxo.script,
      amount: 0n
    },
    sighashType: me.ALL
  });
  for (const s of t)
    o.addInput({
      ...s,
      sighashType: me.ALL
    });
  n.length === 0 && (n = [
    {
      amount: 0n,
      script: ul
    }
  ]);
  for (const s of n)
    o.addOutput({
      amount: s.amount,
      script: s.script
    });
  return o;
}
function El(e) {
  return Ut.utils.taggedHash(dl, new TextEncoder().encode(e));
}
var ro;
(function(e) {
  e[e.INDEXER_TX_TYPE_UNSPECIFIED = 0] = "INDEXER_TX_TYPE_UNSPECIFIED", e[e.INDEXER_TX_TYPE_RECEIVED = 1] = "INDEXER_TX_TYPE_RECEIVED", e[e.INDEXER_TX_TYPE_SENT = 2] = "INDEXER_TX_TYPE_SENT";
})(ro || (ro = {}));
var Oe;
(function(e) {
  e.UNSPECIFIED = "INDEXER_CHAINED_TX_TYPE_UNSPECIFIED", e.COMMITMENT = "INDEXER_CHAINED_TX_TYPE_COMMITMENT", e.ARK = "INDEXER_CHAINED_TX_TYPE_ARK", e.TREE = "INDEXER_CHAINED_TX_TYPE_TREE", e.CHECKPOINT = "INDEXER_CHAINED_TX_TYPE_CHECKPOINT";
})(Oe || (Oe = {}));
class Hc {
  constructor(t) {
    this.serverUrl = t;
  }
  async getVtxoTree(t, n) {
    let r = `${this.serverUrl}/v1/indexer/batch/${t.txid}/${t.vout}/tree`;
    const o = new URLSearchParams();
    n && (n.pageIndex !== void 0 && o.append("page.index", n.pageIndex.toString()), n.pageSize !== void 0 && o.append("page.size", n.pageSize.toString())), o.toString() && (r += "?" + o.toString());
    const s = await fetch(r);
    if (!s.ok)
      throw new Error(`Failed to fetch vtxo tree: ${s.statusText}`);
    const i = await s.json();
    if (!Nt.isVtxoTreeResponse(i))
      throw new Error("Invalid vtxo tree data received");
    return i.vtxoTree.forEach((c) => {
      c.children = Object.fromEntries(Object.entries(c.children).map(([a, u]) => [
        Number(a),
        u
      ]));
    }), i;
  }
  async getVtxoTreeLeaves(t, n) {
    let r = `${this.serverUrl}/v1/indexer/batch/${t.txid}/${t.vout}/tree/leaves`;
    const o = new URLSearchParams();
    n && (n.pageIndex !== void 0 && o.append("page.index", n.pageIndex.toString()), n.pageSize !== void 0 && o.append("page.size", n.pageSize.toString())), o.toString() && (r += "?" + o.toString());
    const s = await fetch(r);
    if (!s.ok)
      throw new Error(`Failed to fetch vtxo tree leaves: ${s.statusText}`);
    const i = await s.json();
    if (!Nt.isVtxoTreeLeavesResponse(i))
      throw new Error("Invalid vtxos tree leaves data received");
    return i;
  }
  async getBatchSweepTransactions(t) {
    const n = `${this.serverUrl}/v1/indexer/batch/${t.txid}/${t.vout}/sweepTxs`, r = await fetch(n);
    if (!r.ok)
      throw new Error(`Failed to fetch batch sweep transactions: ${r.statusText}`);
    const o = await r.json();
    if (!Nt.isBatchSweepTransactionsResponse(o))
      throw new Error("Invalid batch sweep transactions data received");
    return o;
  }
  async getCommitmentTx(t) {
    const n = `${this.serverUrl}/v1/indexer/commitmentTx/${t}`, r = await fetch(n);
    if (!r.ok)
      throw new Error(`Failed to fetch commitment tx: ${r.statusText}`);
    const o = await r.json();
    if (!Nt.isCommitmentTx(o))
      throw new Error("Invalid commitment tx data received");
    return o;
  }
  async getCommitmentTxConnectors(t, n) {
    let r = `${this.serverUrl}/v1/indexer/commitmentTx/${t}/connectors`;
    const o = new URLSearchParams();
    n && (n.pageIndex !== void 0 && o.append("page.index", n.pageIndex.toString()), n.pageSize !== void 0 && o.append("page.size", n.pageSize.toString())), o.toString() && (r += "?" + o.toString());
    const s = await fetch(r);
    if (!s.ok)
      throw new Error(`Failed to fetch commitment tx connectors: ${s.statusText}`);
    const i = await s.json();
    if (!Nt.isConnectorsResponse(i))
      throw new Error("Invalid commitment tx connectors data received");
    return i.connectors.forEach((c) => {
      c.children = Object.fromEntries(Object.entries(c.children).map(([a, u]) => [
        Number(a),
        u
      ]));
    }), i;
  }
  async getCommitmentTxForfeitTxs(t, n) {
    let r = `${this.serverUrl}/v1/indexer/commitmentTx/${t}/forfeitTxs`;
    const o = new URLSearchParams();
    n && (n.pageIndex !== void 0 && o.append("page.index", n.pageIndex.toString()), n.pageSize !== void 0 && o.append("page.size", n.pageSize.toString())), o.toString() && (r += "?" + o.toString());
    const s = await fetch(r);
    if (!s.ok)
      throw new Error(`Failed to fetch commitment tx forfeitTxs: ${s.statusText}`);
    const i = await s.json();
    if (!Nt.isForfeitTxsResponse(i))
      throw new Error("Invalid commitment tx forfeitTxs data received");
    return i;
  }
  async *getSubscription(t, n) {
    const r = `${this.serverUrl}/v1/indexer/script/subscription/${t}`;
    for (; !n?.aborted; )
      try {
        const o = new EventSource(r), s = () => {
          o.close();
        };
        n?.addEventListener("abort", s);
        try {
          for await (const i of eo(o)) {
            if (n?.aborted)
              break;
            try {
              const c = JSON.parse(i.data);
              c.event && (yield {
                txid: c.event.txid,
                scripts: c.event.scripts || [],
                newVtxos: (c.event.newVtxos || []).map(Br),
                spentVtxos: (c.event.spentVtxos || []).map(Br),
                tx: c.event.tx,
                checkpointTxs: c.event.checkpointTxs
              });
            } catch (c) {
              throw console.error("Failed to parse subscription event:", c), c;
            }
          }
        } finally {
          n?.removeEventListener("abort", s), o.close();
        }
      } catch (o) {
        if (o instanceof Error && o.name === "AbortError")
          break;
        if (no(o)) {
          console.debug("Timeout error ignored");
          continue;
        }
        throw console.error("Subscription error:", o), o;
      }
  }
  async getVirtualTxs(t, n) {
    let r = `${this.serverUrl}/v1/indexer/virtualTx/${t.join(",")}`;
    const o = new URLSearchParams();
    n && (n.pageIndex !== void 0 && o.append("page.index", n.pageIndex.toString()), n.pageSize !== void 0 && o.append("page.size", n.pageSize.toString())), o.toString() && (r += "?" + o.toString());
    const s = await fetch(r);
    if (!s.ok)
      throw new Error(`Failed to fetch virtual txs: ${s.statusText}`);
    const i = await s.json();
    if (!Nt.isVirtualTxsResponse(i))
      throw new Error("Invalid virtual txs data received");
    return i;
  }
  async getVtxoChain(t, n) {
    let r = `${this.serverUrl}/v1/indexer/vtxo/${t.txid}/${t.vout}/chain`;
    const o = new URLSearchParams();
    n && (n.pageIndex !== void 0 && o.append("page.index", n.pageIndex.toString()), n.pageSize !== void 0 && o.append("page.size", n.pageSize.toString())), o.toString() && (r += "?" + o.toString());
    const s = await fetch(r);
    if (!s.ok)
      throw new Error(`Failed to fetch vtxo chain: ${s.statusText}`);
    const i = await s.json();
    if (!Nt.isVtxoChainResponse(i))
      throw new Error("Invalid vtxo chain data received");
    return i;
  }
  async getVtxos(t) {
    if (t?.scripts && t?.outpoints)
      throw new Error("scripts and outpoints are mutually exclusive options");
    if (!t?.scripts && !t?.outpoints)
      throw new Error("Either scripts or outpoints must be provided");
    let n = `${this.serverUrl}/v1/indexer/vtxos`;
    const r = new URLSearchParams();
    t?.scripts && t.scripts.length > 0 && t.scripts.forEach((i) => {
      r.append("scripts", i);
    }), t?.outpoints && t.outpoints.length > 0 && t.outpoints.forEach((i) => {
      r.append("outpoints", `${i.txid}:${i.vout}`);
    }), t && (t.spendableOnly !== void 0 && r.append("spendableOnly", t.spendableOnly.toString()), t.spentOnly !== void 0 && r.append("spentOnly", t.spentOnly.toString()), t.recoverableOnly !== void 0 && r.append("recoverableOnly", t.recoverableOnly.toString()), t.pageIndex !== void 0 && r.append("page.index", t.pageIndex.toString()), t.pageSize !== void 0 && r.append("page.size", t.pageSize.toString())), r.toString() && (n += "?" + r.toString());
    const o = await fetch(n);
    if (!o.ok)
      throw new Error(`Failed to fetch vtxos: ${o.statusText}`);
    const s = await o.json();
    if (!Nt.isVtxosResponse(s))
      throw new Error("Invalid vtxos data received");
    return {
      vtxos: s.vtxos.map(Br),
      page: s.page
    };
  }
  async subscribeForScripts(t, n) {
    const r = `${this.serverUrl}/v1/indexer/script/subscribe`, o = await fetch(r, {
      headers: {
        "Content-Type": "application/json"
      },
      method: "POST",
      body: JSON.stringify({ scripts: t, subscriptionId: n })
    });
    if (!o.ok) {
      const i = await o.text();
      throw new Error(`Failed to subscribe to scripts: ${i}`);
    }
    const s = await o.json();
    if (!s.subscriptionId)
      throw new Error("Subscription ID not found");
    return s.subscriptionId;
  }
  async unsubscribeForScripts(t, n) {
    const r = `${this.serverUrl}/v1/indexer/script/unsubscribe`, o = await fetch(r, {
      headers: {
        "Content-Type": "application/json"
      },
      method: "POST",
      body: JSON.stringify({ subscriptionId: t, scripts: n })
    });
    if (!o.ok) {
      const s = await o.text();
      throw new Error(`Failed to unsubscribe to scripts: ${s}`);
    }
  }
}
function Br(e) {
  return {
    txid: e.outpoint.txid,
    vout: e.outpoint.vout,
    value: Number(e.amount),
    status: {
      confirmed: !e.isSwept && !e.isPreconfirmed
    },
    virtualStatus: {
      state: e.isSwept ? "swept" : e.isPreconfirmed ? "preconfirmed" : "settled",
      commitmentTxIds: e.commitmentTxids,
      batchExpiry: e.expiresAt ? Number(e.expiresAt) * 1e3 : void 0
    },
    spentBy: e.spentBy ?? "",
    settledBy: e.settledBy,
    arkTxId: e.arkTxid,
    createdAt: new Date(Number(e.createdAt) * 1e3),
    isUnrolled: e.isUnrolled
  };
}
var Nt;
(function(e) {
  function t(w) {
    return typeof w == "object" && typeof w.totalOutputAmount == "string" && typeof w.totalOutputVtxos == "number" && typeof w.expiresAt == "string" && typeof w.swept == "boolean";
  }
  function n(w) {
    return typeof w == "object" && typeof w.txid == "string" && typeof w.expiresAt == "string" && Object.values(Oe).includes(w.type) && Array.isArray(w.spends) && w.spends.every((ft) => typeof ft == "string");
  }
  function r(w) {
    return typeof w == "object" && typeof w.startedAt == "string" && typeof w.endedAt == "string" && typeof w.totalInputAmount == "string" && typeof w.totalInputVtxos == "number" && typeof w.totalOutputAmount == "string" && typeof w.totalOutputVtxos == "number" && typeof w.batches == "object" && Object.values(w.batches).every(t);
  }
  e.isCommitmentTx = r;
  function o(w) {
    return typeof w == "object" && typeof w.txid == "string" && typeof w.vout == "number";
  }
  e.isOutpoint = o;
  function s(w) {
    return Array.isArray(w) && w.every(o);
  }
  e.isOutpointArray = s;
  function i(w) {
    return typeof w == "object" && typeof w.txid == "string" && typeof w.children == "object" && Object.values(w.children).every(f) && Object.keys(w.children).every((ft) => Number.isInteger(Number(ft)));
  }
  function c(w) {
    return Array.isArray(w) && w.every(i);
  }
  e.isTxsArray = c;
  function a(w) {
    return typeof w == "object" && typeof w.amount == "string" && typeof w.createdAt == "string" && typeof w.isSettled == "boolean" && typeof w.settledBy == "string" && Object.values(ro).includes(w.type) && (!w.commitmentTxid && typeof w.virtualTxid == "string" || typeof w.commitmentTxid == "string" && !w.virtualTxid);
  }
  function u(w) {
    return Array.isArray(w) && w.every(a);
  }
  e.isTxHistoryRecordArray = u;
  function f(w) {
    return typeof w == "string" && w.length === 64;
  }
  function l(w) {
    return Array.isArray(w) && w.every(f);
  }
  e.isTxidArray = l;
  function d(w) {
    return typeof w == "object" && o(w.outpoint) && typeof w.createdAt == "string" && (w.expiresAt === null || typeof w.expiresAt == "string") && typeof w.amount == "string" && typeof w.script == "string" && typeof w.isPreconfirmed == "boolean" && typeof w.isSwept == "boolean" && typeof w.isUnrolled == "boolean" && typeof w.isSpent == "boolean" && (!w.spentBy || typeof w.spentBy == "string") && (!w.settledBy || typeof w.settledBy == "string") && (!w.arkTxid || typeof w.arkTxid == "string") && Array.isArray(w.commitmentTxids) && w.commitmentTxids.every(f);
  }
  function h(w) {
    return typeof w == "object" && typeof w.current == "number" && typeof w.next == "number" && typeof w.total == "number";
  }
  function g(w) {
    return typeof w == "object" && Array.isArray(w.vtxoTree) && w.vtxoTree.every(i) && (!w.page || h(w.page));
  }
  e.isVtxoTreeResponse = g;
  function p(w) {
    return typeof w == "object" && Array.isArray(w.leaves) && w.leaves.every(o) && (!w.page || h(w.page));
  }
  e.isVtxoTreeLeavesResponse = p;
  function y(w) {
    return typeof w == "object" && Array.isArray(w.connectors) && w.connectors.every(i) && (!w.page || h(w.page));
  }
  e.isConnectorsResponse = y;
  function m(w) {
    return typeof w == "object" && Array.isArray(w.txids) && w.txids.every(f) && (!w.page || h(w.page));
  }
  e.isForfeitTxsResponse = m;
  function b(w) {
    return typeof w == "object" && Array.isArray(w.sweptBy) && w.sweptBy.every(f);
  }
  e.isSweptCommitmentTxResponse = b;
  function k(w) {
    return typeof w == "object" && Array.isArray(w.sweptBy) && w.sweptBy.every(f);
  }
  e.isBatchSweepTransactionsResponse = k;
  function N(w) {
    return typeof w == "object" && Array.isArray(w.txs) && w.txs.every((ft) => typeof ft == "string") && (!w.page || h(w.page));
  }
  e.isVirtualTxsResponse = N;
  function A(w) {
    return typeof w == "object" && Array.isArray(w.chain) && w.chain.every(n) && (!w.page || h(w.page));
  }
  e.isVtxoChainResponse = A;
  function z(w) {
    return typeof w == "object" && Array.isArray(w.vtxos) && w.vtxos.every(d) && (!w.page || h(w.page));
  }
  e.isVtxosResponse = z;
})(Nt || (Nt = {}));
class oo {
  constructor(t, n = /* @__PURE__ */ new Map()) {
    this.root = t, this.children = n;
  }
  static create(t) {
    if (t.length === 0)
      throw new Error("empty chunks");
    const n = /* @__PURE__ */ new Map();
    for (const s of t) {
      const i = bl(s), c = x.encode(pt(i.tx.toBytes(!0)).reverse());
      n.set(c, i);
    }
    const r = [];
    for (const [s] of n) {
      let i = !1;
      for (const [c, a] of n)
        if (c !== s && (i = xl(a, s), i))
          break;
      if (!i) {
        r.push(s);
        continue;
      }
    }
    if (r.length === 0)
      throw new Error("no root chunk found");
    if (r.length > 1)
      throw new Error(`multiple root chunks found: ${r.join(", ")}`);
    const o = Dc(r[0], n);
    if (!o)
      throw new Error(`chunk not found for root txid: ${r[0]}`);
    if (o.nbOfNodes() !== t.length)
      throw new Error(`number of chunks (${t.length}) is not equal to the number of nodes in the graph (${o.nbOfNodes()})`);
    return o;
  }
  nbOfNodes() {
    let t = 1;
    for (const n of this.children.values())
      t += n.nbOfNodes();
    return t;
  }
  validate() {
    if (!this.root)
      throw new Error("unexpected nil root");
    const t = this.root.outputsLength, n = this.root.inputsLength;
    if (n !== 1)
      throw new Error(`unexpected number of inputs: ${n}, expected 1`);
    if (this.children.size > t - 1)
      throw new Error(`unexpected number of children: ${this.children.size}, expected maximum ${t - 1}`);
    for (const [r, o] of this.children) {
      if (r >= t)
        throw new Error(`output index ${r} is out of bounds (nb of outputs: ${t})`);
      o.validate();
      const s = o.root.getInput(0), i = x.encode(pt(this.root.toBytes(!0)).reverse());
      if (!s.txid || x.encode(s.txid) !== i || s.index !== r)
        throw new Error(`input of child ${r} is not the output of the parent`);
      let c = 0n;
      for (let u = 0; u < o.root.outputsLength; u++) {
        const f = o.root.getOutput(u);
        f?.amount && (c += f.amount);
      }
      const a = this.root.getOutput(r);
      if (!a?.amount)
        throw new Error(`parent output ${r} has no amount`);
      if (c !== a.amount)
        throw new Error(`sum of child's outputs is not equal to the output of the parent: ${c} != ${a.amount}`);
    }
  }
  leaves() {
    if (this.children.size === 0)
      return [this.root];
    const t = [];
    for (const n of this.children.values())
      t.push(...n.leaves());
    return t;
  }
  get txid() {
    return x.encode(pt(this.root.toBytes(!0)).reverse());
  }
  find(t) {
    if (t === this.txid)
      return this;
    for (const n of this.children.values()) {
      const r = n.find(t);
      if (r)
        return r;
    }
    return null;
  }
  update(t, n) {
    if (t === this.txid) {
      n(this.root);
      return;
    }
    for (const r of this.children.values())
      try {
        r.update(t, n);
        return;
      } catch {
        continue;
      }
    throw new Error(`tx not found: ${t}`);
  }
  *iterator() {
    for (const t of this.children.values())
      yield* t.iterator();
    yield this;
  }
}
function xl(e, t) {
  return Object.values(e.children).includes(t);
}
function Dc(e, t) {
  const n = t.get(e);
  if (!n)
    return null;
  const r = n.tx, o = /* @__PURE__ */ new Map();
  for (const [s, i] of Object.entries(n.children)) {
    const c = parseInt(s), a = Dc(i, t);
    a && o.set(c, a);
  }
  return new oo(r, o);
}
function bl(e) {
  return { tx: gt.fromPSBT(At.decode(e.tx)), children: e.children };
}
class Sl {
  constructor() {
    this.store = /* @__PURE__ */ new Map();
  }
  async getItem(t) {
    return this.store.get(t) ?? null;
  }
  async setItem(t, n) {
    this.store.set(t, n);
  }
  async removeItem(t) {
    this.store.delete(t);
  }
  async clear() {
    this.store.clear();
  }
}
const Ks = (e) => e ? x.encode(e) : void 0, nr = (e) => e ? x.decode(e) : void 0, Fs = ([e, t]) => ({
  cb: x.encode(Pt.encode(e)),
  s: x.encode(t)
}), Or = (e) => ({
  ...e,
  tapTree: Ks(e.tapTree),
  forfeitTapLeafScript: Fs(e.forfeitTapLeafScript),
  intentTapLeafScript: Fs(e.intentTapLeafScript),
  extraWitness: e.extraWitness?.map((t) => Ks(t))
}), Ws = (e) => {
  const t = Pt.decode(nr(e.cb)), n = nr(e.s);
  return [t, n];
}, Tl = (e) => ({
  ...e,
  tapTree: nr(e.tapTree),
  forfeitTapLeafScript: Ws(e.forfeitTapLeafScript),
  intentTapLeafScript: Ws(e.intentTapLeafScript),
  extraWitness: e.extraWitness?.map((t) => nr(t))
});
class Mc {
  constructor(t) {
    this.storage = t, this.cache = {
      vtxos: /* @__PURE__ */ new Map(),
      transactions: /* @__PURE__ */ new Map(),
      walletState: null,
      initialized: /* @__PURE__ */ new Set()
    };
  }
  async getVtxos(t) {
    const n = `vtxos:${t}`;
    if (this.cache.vtxos.has(t))
      return this.cache.vtxos.get(t);
    const r = await this.storage.getItem(n);
    if (!r)
      return this.cache.vtxos.set(t, []), [];
    try {
      const s = JSON.parse(r).map(Tl);
      return this.cache.vtxos.set(t, s.slice()), s.slice();
    } catch (o) {
      return console.error(`Failed to parse VTXOs for address ${t}:`, o), this.cache.vtxos.set(t, []), [];
    }
  }
  async saveVtxo(t, n) {
    const r = await this.getVtxos(t), o = r.findIndex((s) => s.txid === n.txid && s.vout === n.vout);
    o !== -1 ? r[o] = n : r.push(n), this.cache.vtxos.set(t, r.slice()), await this.storage.setItem(`vtxos:${t}`, JSON.stringify(r.map(Or)));
  }
  async saveVtxos(t, n) {
    const r = await this.getVtxos(t);
    for (const o of n) {
      const s = r.findIndex((i) => i.txid === o.txid && i.vout === o.vout);
      s !== -1 ? r[s] = o : r.push(o);
    }
    this.cache.vtxos.set(t, r.slice()), await this.storage.setItem(`vtxos:${t}`, JSON.stringify(r.map(Or)));
  }
  async removeVtxo(t, n) {
    const r = await this.getVtxos(t), [o, s] = n.split(":"), i = r.filter((c) => !(c.txid === o && c.vout === parseInt(s, 10)));
    this.cache.vtxos.set(t, i.slice()), await this.storage.setItem(`vtxos:${t}`, JSON.stringify(i.map(Or)));
  }
  async clearVtxos(t) {
    this.cache.vtxos.set(t, []), await this.storage.removeItem(`vtxos:${t}`);
  }
  async getTransactionHistory(t) {
    const n = `tx:${t}`;
    if (this.cache.transactions.has(t))
      return this.cache.transactions.get(t);
    const r = await this.storage.getItem(n);
    if (!r)
      return this.cache.transactions.set(t, []), [];
    try {
      const o = JSON.parse(r);
      return this.cache.transactions.set(t, o), o.slice();
    } catch (o) {
      return console.error(`Failed to parse transactions for address ${t}:`, o), this.cache.transactions.set(t, []), [];
    }
  }
  async saveTransaction(t, n) {
    const r = await this.getTransactionHistory(t), o = r.findIndex((s) => s.key === n.key);
    o !== -1 ? r[o] = n : r.push(n), r.sort((s, i) => i.createdAt - s.createdAt), this.cache.transactions.set(t, r), await this.storage.setItem(`tx:${t}`, JSON.stringify(r));
  }
  async saveTransactions(t, n) {
    const r = await this.getTransactionHistory(t);
    for (const o of n) {
      const s = r.findIndex((i) => i.key === o.key);
      s !== -1 ? r[s] = o : r.push(o);
    }
    this.cache.transactions.set(t, r), await this.storage.setItem(`tx:${t}`, JSON.stringify(r));
  }
  async clearTransactions(t) {
    this.cache.transactions.set(t, []), await this.storage.removeItem(`tx:${t}`);
  }
  async getWalletState() {
    if (this.cache.walletState !== null || this.cache.initialized.has("walletState"))
      return this.cache.walletState;
    const t = await this.storage.getItem("wallet:state");
    if (!t)
      return this.cache.walletState = null, this.cache.initialized.add("walletState"), null;
    try {
      const n = JSON.parse(t);
      return this.cache.walletState = n, this.cache.initialized.add("walletState"), n;
    } catch (n) {
      return console.error("Failed to parse wallet state:", n), this.cache.walletState = null, this.cache.initialized.add("walletState"), null;
    }
  }
  async saveWalletState(t) {
    this.cache.walletState = t, await this.storage.setItem("wallet:state", JSON.stringify(t));
  }
}
class vl {
  constructor(t) {
    this.cache = /* @__PURE__ */ new Map(), this.storage = t;
  }
  async getContractData(t, n) {
    const r = `contract:${t}:${n}`, o = this.cache.get(r);
    if (o !== void 0)
      return o;
    const s = await this.storage.getItem(r);
    if (!s)
      return null;
    try {
      const i = JSON.parse(s);
      return this.cache.set(r, i), i;
    } catch (i) {
      return console.error(`Failed to parse contract data for ${t}:${n}:`, i), null;
    }
  }
  async setContractData(t, n, r) {
    const o = `contract:${t}:${n}`;
    try {
      await this.storage.setItem(o, JSON.stringify(r)), this.cache.set(o, r);
    } catch (s) {
      throw console.error(`Failed to persist contract data for ${t}:${n}:`, s), s;
    }
  }
  async deleteContractData(t, n) {
    const r = `contract:${t}:${n}`;
    try {
      await this.storage.removeItem(r), this.cache.delete(r);
    } catch (o) {
      throw console.error(`Failed to remove contract data for ${t}:${n}:`, o), o;
    }
  }
  async getContractCollection(t) {
    const n = `collection:${t}`, r = this.cache.get(n);
    if (r !== void 0)
      return r;
    const o = await this.storage.getItem(n);
    if (!o)
      return this.cache.set(n, []), [];
    try {
      const s = JSON.parse(o);
      return this.cache.set(n, s), s;
    } catch (s) {
      return console.error(`Failed to parse contract collection ${t}:`, s), this.cache.set(n, []), [];
    }
  }
  async saveToContractCollection(t, n, r) {
    const o = await this.getContractCollection(t), s = n[r];
    if (s == null)
      throw new Error(`Item is missing required field '${String(r)}'`);
    const i = o.findIndex((u) => u[r] === s);
    let c;
    i !== -1 ? c = [
      ...o.slice(0, i),
      n,
      ...o.slice(i + 1)
    ] : c = [...o, n];
    const a = `collection:${t}`;
    try {
      await this.storage.setItem(a, JSON.stringify(c)), this.cache.set(a, c);
    } catch (u) {
      throw console.error(`Failed to persist contract collection ${t}:`, u), u;
    }
  }
  async removeFromContractCollection(t, n, r) {
    if (n == null)
      throw new Error(`Invalid id provided for removal: ${String(n)}`);
    const s = (await this.getContractCollection(t)).filter((c) => c[r] !== n), i = `collection:${t}`;
    try {
      await this.storage.setItem(i, JSON.stringify(s)), this.cache.set(i, s);
    } catch (c) {
      throw console.error(`Failed to persist contract collection removal for ${t}:`, c), c;
    }
  }
  async clearContractData() {
    await this.storage.clear(), this.cache.clear();
  }
}
function Qe(e, t) {
  return {
    ...t,
    forfeitTapLeafScript: e.offchainTapscript.forfeit(),
    intentTapLeafScript: e.offchainTapscript.exit(),
    tapTree: e.offchainTapscript.encode()
  };
}
class He {
  constructor(t, n, r, o, s, i, c, a, u, f, l, d, h, g) {
    this.identity = t, this.network = n, this.networkName = r, this.onchainProvider = o, this.arkProvider = s, this.indexerProvider = i, this.arkServerPublicKey = c, this.offchainTapscript = a, this.boardingTapscript = u, this.serverUnrollScript = f, this.forfeitOutputScript = l, this.dustAmount = d, this.walletRepository = h, this.contractRepository = g;
  }
  static async create(t) {
    const n = await t.identity.xOnlyPublicKey();
    if (!n)
      throw new Error("Invalid configured public key");
    const r = new _c(t.arkServerUrl), o = new Hc(t.arkServerUrl), s = await r.getInfo(), i = $f(s.network), c = new Pf(t.esploraUrl || Rf[s.network]), a = {
      value: s.unilateralExitDelay,
      type: s.unilateralExitDelay < 512n ? "blocks" : "seconds"
    }, u = {
      value: s.boardingExitDelay,
      type: s.boardingExitDelay < 512n ? "blocks" : "seconds"
    }, f = x.decode(s.signerPubkey).slice(1), l = new Qn.Script({
      pubKey: n,
      serverPubKey: f,
      csvTimelock: a
    }), d = new Qn.Script({
      pubKey: n,
      serverPubKey: f,
      csvTimelock: u
    }), h = l, g = x.decode(s.checkpointExitClosure), p = Bt.decode(g), y = ye(i).decode(s.forfeitAddress), m = st.encode(y), b = t.storage || new Sl(), k = new Mc(b), N = new vl(b);
    return new He(t.identity, i, s.network, c, r, o, f, h, d, p, m, s.dust, k, N);
  }
  get arkAddress() {
    return this.offchainTapscript.address(this.network.hrp, this.arkServerPublicKey);
  }
  async getAddress() {
    return this.arkAddress.encode();
  }
  async getBoardingAddress() {
    return this.boardingTapscript.onchainAddress(this.network);
  }
  async getBalance() {
    const [t, n] = await Promise.all([
      this.getBoardingUtxos(),
      this.getVtxos()
    ]);
    let r = 0, o = 0;
    for (const f of t)
      f.status.confirmed ? r += f.value : o += f.value;
    let s = 0, i = 0, c = 0;
    s = n.filter((f) => f.virtualStatus.state === "settled").reduce((f, l) => f + l.value, 0), i = n.filter((f) => f.virtualStatus.state === "preconfirmed").reduce((f, l) => f + l.value, 0), c = n.filter((f) => oe(f) && f.virtualStatus.state === "swept").reduce((f, l) => f + l.value, 0);
    const a = r + o, u = s + i + c;
    return {
      boarding: {
        confirmed: r,
        unconfirmed: o,
        total: a
      },
      settled: s,
      preconfirmed: i,
      available: s + i,
      recoverable: c,
      total: a + u
    };
  }
  async getVtxos(t) {
    const n = await this.getAddress(), r = await this.getVirtualCoins(t), o = this.offchainTapscript.encode(), s = this.offchainTapscript.forfeit(), i = this.offchainTapscript.exit(), c = r.map((a) => ({
      ...a,
      forfeitTapLeafScript: s,
      intentTapLeafScript: i,
      tapTree: o
    }));
    return await this.walletRepository.saveVtxos(n, c), c;
  }
  async getVirtualCoins(t = { withRecoverable: !0, withUnrolled: !1 }) {
    const n = [x.encode(this.offchainTapscript.pkScript)], o = (await this.indexerProvider.getVtxos({
      scripts: n,
      spendableOnly: !0
    })).vtxos;
    if (t.withRecoverable) {
      const s = await this.indexerProvider.getVtxos({
        scripts: n,
        recoverableOnly: !0
      });
      o.push(...s.vtxos);
    }
    if (t.withUnrolled) {
      const s = await this.indexerProvider.getVtxos({
        scripts: n,
        spentOnly: !0
      });
      o.push(...s.vtxos.filter((i) => i.isUnrolled));
    }
    return o;
  }
  async getTransactionHistory() {
    if (!this.indexerProvider)
      return [];
    const t = await this.indexerProvider.getVtxos({
      scripts: [x.encode(this.offchainTapscript.pkScript)]
    }), { boardingTxs: n, commitmentsToIgnore: r } = await this.getBoardingTxs(), o = [], s = [];
    for (const a of t.vtxos)
      oe(a) ? o.push(a) : s.push(a);
    const i = Pc(o, s, r), c = [...n, ...i];
    return c.sort(
      // place createdAt = 0 (unconfirmed txs) first, then descending
      (a, u) => a.createdAt === 0 ? -1 : u.createdAt === 0 ? 1 : u.createdAt - a.createdAt
    ), c;
  }
  async getBoardingTxs() {
    const t = await this.getBoardingAddress(), n = await this.onchainProvider.getTransactions(t), r = [], o = /* @__PURE__ */ new Set();
    for (const c of n)
      for (let a = 0; a < c.vout.length; a++) {
        const u = c.vout[a];
        if (u.scriptpubkey_address === t) {
          const l = (await this.onchainProvider.getTxOutspends(c.txid))[a];
          l?.spent && o.add(l.txid), r.push({
            txid: c.txid,
            vout: a,
            value: Number(u.value),
            status: {
              confirmed: c.status.confirmed,
              block_time: c.status.block_time
            },
            isUnrolled: !0,
            virtualStatus: {
              state: l?.spent ? "spent" : "settled",
              commitmentTxIds: l?.spent ? [l.txid] : void 0
            },
            createdAt: c.status.confirmed ? new Date(c.status.block_time * 1e3) : /* @__PURE__ */ new Date(0)
          });
        }
      }
    const s = [], i = [];
    for (const c of r) {
      const a = {
        key: {
          boardingTxid: c.txid,
          commitmentTxid: "",
          arkTxid: ""
        },
        amount: c.value,
        type: cn.TxReceived,
        settled: c.virtualStatus.state === "spent",
        createdAt: c.status.block_time ? new Date(c.status.block_time * 1e3).getTime() : 0
      };
      c.status.block_time ? i.push(a) : s.push(a);
    }
    return {
      boardingTxs: [...s, ...i],
      commitmentsToIgnore: o
    };
  }
  async getBoardingUtxos() {
    const t = await this.getBoardingAddress(), n = await this.onchainProvider.getCoins(t), r = this.boardingTapscript.encode(), o = this.boardingTapscript.forfeit(), s = this.boardingTapscript.exit();
    return n.map((i) => ({
      ...i,
      forfeitTapLeafScript: o,
      intentTapLeafScript: s,
      tapTree: r
    }));
  }
  async sendBitcoin(t) {
    if (t.amount <= 0)
      throw new Error("Amount must be positive");
    if (!Il(t.address))
      throw new Error("Invalid Ark address " + t.address);
    const n = await this.getVirtualCoins({
      withRecoverable: !1
    }), r = Bl(n, t.amount), o = this.offchainTapscript.forfeit();
    if (!o)
      throw new Error("Selected leaf not found");
    const s = Ve.decode(t.address), c = [
      {
        script: BigInt(t.amount) < this.dustAmount ? s.subdustPkScript : s.pkScript,
        amount: BigInt(t.amount)
      }
    ];
    if (r.changeAmount > 0n) {
      const g = r.changeAmount < this.dustAmount ? this.arkAddress.subdustPkScript : this.arkAddress.pkScript;
      c.push({
        script: g,
        amount: BigInt(r.changeAmount)
      });
    }
    const a = this.offchainTapscript.encode();
    let u = el(r.inputs.map((g) => ({
      ...g,
      tapLeafScript: o,
      tapTree: a
    })), c, this.serverUnrollScript);
    const f = await this.identity.sign(u.arkTx), { arkTxid: l, signedCheckpointTxs: d } = await this.arkProvider.submitTx(At.encode(f.toPSBT()), u.checkpoints.map((g) => At.encode(g.toPSBT()))), h = await Promise.all(d.map(async (g) => {
      const p = gt.fromPSBT(At.decode(g)), y = await this.identity.sign(p);
      return At.encode(y.toPSBT());
    }));
    return await this.arkProvider.finalizeTx(l, h), l;
  }
  async settle(t, n) {
    if (t?.inputs) {
      for (const d of t.inputs)
        if (typeof d == "string")
          try {
            ot.fromString(d);
          } catch {
            throw new Error(`Invalid arknote "${d}"`);
          }
    }
    if (!t) {
      let d = 0;
      const h = await this.getBoardingUtxos();
      d += h.reduce((y, m) => y + m.value, 0);
      const g = await this.getVtxos();
      d += g.reduce((y, m) => y + m.value, 0);
      const p = [...h, ...g];
      if (p.length === 0)
        throw new Error("No inputs found");
      t = {
        inputs: p,
        outputs: [
          {
            address: await this.getAddress(),
            amount: BigInt(d)
          }
        ]
      };
    }
    const r = [], o = [];
    let s = !1;
    for (const [d, h] of t.outputs.entries()) {
      let g;
      try {
        g = Ve.decode(h.address).pkScript, s = !0;
      } catch {
        const p = ye(this.network).decode(h.address);
        g = st.encode(p), r.push(d);
      }
      o.push({
        amount: h.amount,
        script: g
      });
    }
    let i;
    const c = [];
    s && (i = this.identity.signerSession(), c.push(x.encode(i.getPublicKey())));
    const [a, u] = await Promise.all([
      this.makeRegisterIntentSignature(t.inputs, o, r, c),
      this.makeDeleteIntentSignature(t.inputs)
    ]), f = await this.arkProvider.registerIntent(a), l = new AbortController();
    try {
      let d;
      const h = [
        ...c,
        ...t.inputs.map((A) => `${A.txid}:${A.vout}`)
      ], g = this.arkProvider.getEventStream(l.signal, h);
      let p, y;
      const m = [], b = [];
      let k, N;
      for await (const A of g)
        switch (n && n(A), A.type) {
          // the settlement failed
          case G.BatchFailed:
            if (A.id === p)
              throw new Error(A.reason);
            break;
          case G.BatchStarted:
            if (d !== void 0)
              continue;
            const z = await this.handleBatchStartedEvent(A, f, this.arkServerPublicKey, this.forfeitOutputScript);
            z.skip || (d = A.type, y = z.sweepTapTreeRoot, p = z.roundId, s || (d = G.TreeNoncesAggregated));
            break;
          case G.TreeTx:
            if (d !== G.BatchStarted && d !== G.TreeNoncesAggregated)
              continue;
            if (A.batchIndex === 0)
              m.push(A.chunk);
            else if (A.batchIndex === 1)
              b.push(A.chunk);
            else
              throw new Error(`Invalid batch index: ${A.batchIndex}`);
            break;
          case G.TreeSignature:
            if (d !== G.TreeNoncesAggregated || !s)
              continue;
            if (!k)
              throw new Error("Vtxo graph not set, something went wrong");
            if (A.batchIndex === 0) {
              const w = x.decode(A.signature);
              k.update(A.txid, (ft) => {
                ft.updateInput(0, {
                  tapKeySig: w
                });
              });
            }
            break;
          // the server has started the signing process of the vtxo tree transactions
          // the server expects the partial musig2 nonces for each tx
          case G.TreeSigningStarted:
            if (d !== G.BatchStarted)
              continue;
            if (s) {
              if (!i)
                throw new Error("Signing session not set");
              if (!y)
                throw new Error("Sweep tap tree root not set");
              if (m.length === 0)
                throw new Error("unsigned vtxo graph not received");
              k = oo.create(m), await this.handleSettlementSigningEvent(A, y, i, k);
            }
            d = A.type;
            break;
          // the musig2 nonces of the vtxo tree transactions are generated
          // the server expects now the partial musig2 signatures
          case G.TreeNoncesAggregated:
            if (d !== G.TreeSigningStarted)
              continue;
            if (s) {
              if (!i)
                throw new Error("Signing session not set");
              await this.handleSettlementSigningNoncesGeneratedEvent(A, i);
            }
            d = A.type;
            break;
          // the vtxo tree is signed, craft, sign and submit forfeit transactions
          // if any boarding utxos are involved, the settlement tx is also signed
          case G.BatchFinalization:
            if (d !== G.TreeNoncesAggregated)
              continue;
            if (!this.forfeitOutputScript)
              throw new Error("Forfeit output script not set");
            b.length > 0 && (N = oo.create(b), Qf(A.commitmentTx, N)), await this.handleSettlementFinalizationEvent(A, t.inputs, this.forfeitOutputScript, N), d = A.type;
            break;
          // the settlement is done, last event to be received
          case G.BatchFinalized:
            if (d !== G.BatchFinalization)
              continue;
            return l.abort(), A.commitmentTxid;
        }
    } catch (d) {
      l.abort();
      try {
        await this.arkProvider.deleteIntent(u);
      } catch {
      }
      throw d;
    }
    throw new Error("Settlement failed");
  }
  async notifyIncomingFunds(t) {
    const n = await this.getAddress(), r = await this.getBoardingAddress();
    let o, s;
    if (this.onchainProvider && r && (o = await this.onchainProvider.watchAddresses([r], (c) => {
      const a = c.map((u) => {
        const f = u.vout.findIndex((l) => l.scriptpubkey_address === r);
        return f === -1 ? (console.warn(`No vout found for address ${r} in transaction ${u.txid}`), null) : {
          txid: u.txid,
          vout: f,
          value: Number(u.vout[f].value),
          status: u.status
        };
      }).filter((u) => u !== null);
      t({
        type: "utxo",
        coins: a
      });
    })), this.indexerProvider && n) {
      const c = this.offchainTapscript, a = await this.indexerProvider.subscribeForScripts([
        x.encode(c.pkScript)
      ]), u = new AbortController(), f = this.indexerProvider.getSubscription(a, u.signal);
      s = async () => {
        u.abort(), await this.indexerProvider?.unsubscribeForScripts(a);
      }, (async () => {
        try {
          for await (const l of f)
            l.newVtxos?.length > 0 && t({
              type: "vtxo",
              newVtxos: l.newVtxos.map((d) => Qe(this, d)),
              spentVtxos: l.spentVtxos.map((d) => Qe(this, d))
            });
        } catch (l) {
          console.error("Subscription error:", l);
        }
      })();
    }
    return () => {
      o?.(), s?.();
    };
  }
  async handleBatchStartedEvent(t, n, r, o) {
    const s = new TextEncoder().encode(n), i = dt(s), c = x.encode(new Uint8Array(i));
    let a = !0;
    for (const l of t.intentIdHashes)
      if (l === c) {
        if (!this.arkProvider)
          throw new Error("Ark provider not configured");
        await this.arkProvider.confirmRegistration(n), a = !1;
      }
    if (a)
      return { skip: a };
    const u = Bt.encode({
      timelock: {
        value: t.batchExpiry,
        type: t.batchExpiry >= 512n ? "seconds" : "blocks"
      },
      pubkeys: [r]
    }).script, f = qe(u);
    return {
      roundId: t.id,
      sweepTapTreeRoot: f,
      forfeitOutputScript: o,
      skip: !1
    };
  }
  // validates the vtxo tree, creates a signing session and generates the musig2 nonces
  async handleSettlementSigningEvent(t, n, r, o) {
    const s = gt.fromPSBT(At.decode(t.unsignedCommitmentTx));
    tl(o, s, n);
    const i = s.getOutput(0);
    if (!i?.amount)
      throw new Error("Shared output not found");
    r.init(o, n, i.amount), await this.arkProvider.submitTreeNonces(t.id, x.encode(r.getPublicKey()), r.getNonces());
  }
  async handleSettlementSigningNoncesGeneratedEvent(t, n) {
    n.setAggregatedNonces(t.treeNonces);
    const r = n.sign();
    await this.arkProvider.submitTreeSignatures(t.id, x.encode(n.getPublicKey()), r);
  }
  async handleSettlementFinalizationEvent(t, n, r, o) {
    const s = [], i = await this.getVirtualCoins();
    let c = gt.fromPSBT(At.decode(t.commitmentTx)), a = !1, u = 0;
    const f = o?.leaves() || [];
    for (const l of n) {
      const d = i.find((k) => k.txid === l.txid && k.vout === l.vout);
      if (!d) {
        a = !0;
        const k = [];
        for (let N = 0; N < c.inputsLength; N++) {
          const A = c.getInput(N);
          if (!A.txid || A.index === void 0)
            throw new Error("The server returned incomplete data. No settlement input found in the PSBT");
          x.encode(A.txid) === l.txid && A.index === l.vout && (c.updateInput(N, {
            tapLeafScript: [l.forfeitTapLeafScript]
          }), k.push(N));
        }
        c = await this.identity.sign(c, k);
        continue;
      }
      if (Bf(d) || Rc(d, this.dustAmount))
        continue;
      if (f.length === 0)
        throw new Error("connectors not received");
      if (u >= f.length)
        throw new Error("not enough connectors received");
      const h = f[u], g = x.encode(pt(h.toBytes(!0)).reverse()), p = h.getOutput(0);
      if (!p)
        throw new Error("connector output not found");
      const y = p.amount, m = p.script;
      if (!y || !m)
        throw new Error("invalid connector output");
      u++;
      let b = Wf([
        {
          txid: l.txid,
          index: l.vout,
          witnessUtxo: {
            amount: BigInt(d.value),
            script: Ot.decode(l.tapTree).pkScript
          },
          sighashType: me.DEFAULT,
          tapLeafScript: [l.forfeitTapLeafScript]
        },
        {
          txid: g,
          index: 0,
          witnessUtxo: {
            amount: y,
            script: m
          }
        }
      ], r);
      b = await this.identity.sign(b, [0]), s.push(At.encode(b.toPSBT()));
    }
    (s.length > 0 || a) && await this.arkProvider.submitSignedForfeitTxs(s, a ? At.encode(c.toPSBT()) : void 0);
  }
  async makeRegisterIntentSignature(t, n, r, o) {
    const s = Math.floor(Date.now() / 1e3), { inputs: i, inputTapTrees: c, finalizer: a } = this.prepareBIP322Inputs(t), u = {
      type: "register",
      input_tap_trees: c,
      onchain_output_indexes: r,
      valid_at: s,
      expire_at: s + 120,
      // valid for 2 minutes
      cosigners_public_keys: o
    }, f = JSON.stringify(u, null, 0);
    return {
      signature: await this.makeBIP322Signature(f, i, a, n),
      message: f
    };
  }
  async makeDeleteIntentSignature(t) {
    const n = Math.floor(Date.now() / 1e3), { inputs: r, finalizer: o } = this.prepareBIP322Inputs(t), s = {
      type: "delete",
      expire_at: n + 120
      // valid for 2 minutes
    }, i = JSON.stringify(s, null, 0);
    return {
      signature: await this.makeBIP322Signature(i, r, o),
      message: i
    };
  }
  prepareBIP322Inputs(t) {
    const n = [], r = [], o = [];
    for (const s of t) {
      const i = Ot.decode(s.tapTree), c = Al(s);
      n.push({
        txid: x.decode(s.txid),
        index: s.vout,
        witnessUtxo: {
          amount: BigInt(s.value),
          script: i.pkScript
        },
        sequence: c,
        tapLeafScript: [s.intentTapLeafScript]
      }), r.push(x.encode(s.tapTree)), o.push(s.extraWitness || []);
    }
    return {
      inputs: n,
      inputTapTrees: r,
      finalizer: kl(o)
    };
  }
  async makeBIP322Signature(t, n, r, o) {
    const s = er.create(t, n, o), i = await this.identity.sign(s);
    return er.signature(i, r);
  }
}
He.MIN_FEE_RATE = 1;
function kl(e) {
  return function(t) {
    for (let n = 0; n < t.inputsLength; n++) {
      try {
        t.finalizeIdx(n);
      } catch (s) {
        if (s instanceof Error && s.message.includes("finalize/taproot: empty witness")) {
          const i = t.getInput(n).tapLeafScript;
          if (!i || i.length <= 0)
            throw s;
          const [c, a] = i[0], u = a.slice(0, -1);
          t.updateInput(n, {
            finalScriptWitness: [
              u,
              Pt.encode(c)
            ]
          });
        }
      }
      const r = t.getInput(n).finalScriptWitness;
      if (!r)
        throw new Error("input not finalized");
      const o = e[n === 0 ? 0 : n - 1];
      o && o.length > 0 && t.updateInput(n, {
        finalScriptWitness: [...o, ...r]
      });
    }
  };
}
function Al(e) {
  let t;
  try {
    const n = e.intentTapLeafScript[1], r = n.subarray(0, n.length - 1), o = Bt.decode(r).params;
    t = to.encode(o.timelock.type === "blocks" ? { blocks: Number(o.timelock.value) } : { seconds: Number(o.timelock.value) });
  } catch {
  }
  return t;
}
function Il(e) {
  try {
    return Ve.decode(e), !0;
  } catch {
    return !1;
  }
}
function Bl(e, t) {
  const n = [...e].sort((i, c) => {
    const a = i.virtualStatus.batchExpiry || Number.MAX_SAFE_INTEGER, u = c.virtualStatus.batchExpiry || Number.MAX_SAFE_INTEGER;
    return a !== u ? a - u : c.value - i.value;
  }), r = [];
  let o = 0;
  for (const i of n)
    if (r.push(i), o += i.value, o >= t)
      break;
  if (o === t)
    return { inputs: r, changeAmount: 0n };
  if (o < t)
    throw new Error("Insufficient funds");
  const s = BigInt(o - t);
  return {
    inputs: r,
    changeAmount: s
  };
}
var R;
(function(e) {
  e.walletInitialized = (v) => ({
    type: "WALLET_INITIALIZED",
    success: !0,
    id: v
  });
  function t(v, O) {
    return {
      type: "ERROR",
      success: !1,
      message: O,
      id: v
    };
  }
  e.error = t;
  function n(v, O) {
    return {
      type: "SETTLE_EVENT",
      success: !0,
      event: O,
      id: v
    };
  }
  e.settleEvent = n;
  function r(v, O) {
    return {
      type: "SETTLE_SUCCESS",
      success: !0,
      txid: O,
      id: v
    };
  }
  e.settleSuccess = r;
  function o(v) {
    return v.type === "SETTLE_SUCCESS" && v.success;
  }
  e.isSettleSuccess = o;
  function s(v) {
    return v.type === "ADDRESS" && v.success === !0;
  }
  e.isAddress = s;
  function i(v) {
    return v.type === "BOARDING_ADDRESS" && v.success === !0;
  }
  e.isBoardingAddress = i;
  function c(v, O) {
    return {
      type: "ADDRESS",
      success: !0,
      address: O,
      id: v
    };
  }
  e.address = c;
  function a(v, O) {
    return {
      type: "BOARDING_ADDRESS",
      success: !0,
      address: O,
      id: v
    };
  }
  e.boardingAddress = a;
  function u(v) {
    return v.type === "BALANCE" && v.success === !0;
  }
  e.isBalance = u;
  function f(v, O) {
    return {
      type: "BALANCE",
      success: !0,
      balance: O,
      id: v
    };
  }
  e.balance = f;
  function l(v) {
    return v.type === "VTXOS" && v.success === !0;
  }
  e.isVtxos = l;
  function d(v, O) {
    return {
      type: "VTXOS",
      success: !0,
      vtxos: O,
      id: v
    };
  }
  e.vtxos = d;
  function h(v) {
    return v.type === "VIRTUAL_COINS" && v.success === !0;
  }
  e.isVirtualCoins = h;
  function g(v, O) {
    return {
      type: "VIRTUAL_COINS",
      success: !0,
      virtualCoins: O,
      id: v
    };
  }
  e.virtualCoins = g;
  function p(v) {
    return v.type === "BOARDING_UTXOS" && v.success === !0;
  }
  e.isBoardingUtxos = p;
  function y(v, O) {
    return {
      type: "BOARDING_UTXOS",
      success: !0,
      boardingUtxos: O,
      id: v
    };
  }
  e.boardingUtxos = y;
  function m(v) {
    return v.type === "SEND_BITCOIN_SUCCESS" && v.success === !0;
  }
  e.isSendBitcoinSuccess = m;
  function b(v, O) {
    return {
      type: "SEND_BITCOIN_SUCCESS",
      success: !0,
      txid: O,
      id: v
    };
  }
  e.sendBitcoinSuccess = b;
  function k(v) {
    return v.type === "TRANSACTION_HISTORY" && v.success === !0;
  }
  e.isTransactionHistory = k;
  function N(v, O) {
    return {
      type: "TRANSACTION_HISTORY",
      success: !0,
      transactions: O,
      id: v
    };
  }
  e.transactionHistory = N;
  function A(v) {
    return v.type === "WALLET_STATUS" && v.success === !0;
  }
  e.isWalletStatus = A;
  function z(v, O, T) {
    return {
      type: "WALLET_STATUS",
      success: !0,
      status: {
        walletInitialized: O,
        xOnlyPublicKey: T
      },
      id: v
    };
  }
  e.walletStatus = z;
  function w(v) {
    return v.type === "CLEAR_RESPONSE";
  }
  e.isClearResponse = w;
  function ft(v, O) {
    return {
      type: "CLEAR_RESPONSE",
      success: O,
      id: v
    };
  }
  e.clearResponse = ft;
  function K(v) {
    return v.type === "WALLET_RELOADED";
  }
  e.isWalletReloaded = K;
  function Te(v, O) {
    return {
      type: "WALLET_RELOADED",
      success: O,
      id: v
    };
  }
  e.walletReloaded = Te;
})(R || (R = {}));
class Ol {
  constructor(t, n = 1) {
    this.db = null, this.dbName = t, this.version = n;
  }
  async getDB() {
    if (this.db)
      return this.db;
    const t = typeof window > "u" ? self : window;
    if (!(t && "indexedDB" in t))
      throw new Error("IndexedDB is not available in this environment");
    return new Promise((n, r) => {
      const o = t.indexedDB.open(this.dbName, this.version);
      o.onerror = () => r(o.error), o.onsuccess = () => {
        this.db = o.result, n(this.db);
      }, o.onupgradeneeded = () => {
        const s = o.result;
        s.objectStoreNames.contains("storage") || s.createObjectStore("storage");
      };
    });
  }
  async getItem(t) {
    try {
      const n = await this.getDB();
      return new Promise((r, o) => {
        const c = n.transaction(["storage"], "readonly").objectStore("storage").get(t);
        c.onerror = () => o(c.error), c.onsuccess = () => {
          r(c.result || null);
        };
      });
    } catch (n) {
      return console.error(`Failed to get item for key ${t}:`, n), null;
    }
  }
  async setItem(t, n) {
    try {
      const r = await this.getDB();
      return new Promise((o, s) => {
        const a = r.transaction(["storage"], "readwrite").objectStore("storage").put(n, t);
        a.onerror = () => s(a.error), a.onsuccess = () => o();
      });
    } catch (r) {
      throw console.error(`Failed to set item for key ${t}:`, r), r;
    }
  }
  async removeItem(t) {
    try {
      const n = await this.getDB();
      return new Promise((r, o) => {
        const c = n.transaction(["storage"], "readwrite").objectStore("storage").delete(t);
        c.onerror = () => o(c.error), c.onsuccess = () => r();
      });
    } catch (n) {
      console.error(`Failed to remove item for key ${t}:`, n);
    }
  }
  async clear() {
    try {
      const t = await this.getDB();
      return new Promise((n, r) => {
        const i = t.transaction(["storage"], "readwrite").objectStore("storage").clear();
        i.onerror = () => r(i.error), i.onsuccess = () => n();
      });
    } catch (t) {
      console.error("Failed to clear storage:", t);
    }
  }
}
class j {
  constructor(t, n, r, o, s, i) {
    this.hasWitness = t, this.inputCount = n, this.outputCount = r, this.inputSize = o, this.inputWitnessSize = s, this.outputSize = i;
  }
  static create() {
    return new j(!1, 0, 0, 0, 0, 0);
  }
  addP2AInput() {
    return this.inputCount++, this.inputSize += j.INPUT_SIZE, this;
  }
  addKeySpendInput(t = !0) {
    return this.inputCount++, this.inputWitnessSize += 65 + (t ? 0 : 1), this.inputSize += j.INPUT_SIZE, this.hasWitness = !0, this;
  }
  addP2PKHInput() {
    return this.inputCount++, this.inputWitnessSize++, this.inputSize += j.INPUT_SIZE + j.P2PKH_SCRIPT_SIG_SIZE, this;
  }
  addTapscriptInput(t, n, r) {
    const o = 1 + j.BASE_CONTROL_BLOCK_SIZE + 1 + n + 1 + r;
    return this.inputCount++, this.inputWitnessSize += t + o, this.inputSize += j.INPUT_SIZE, this.hasWitness = !0, this.inputCount++, this;
  }
  addP2WKHOutput() {
    return this.outputCount++, this.outputSize += j.OUTPUT_SIZE + j.P2WKH_OUTPUT_SIZE, this;
  }
  addP2TROutput() {
    return this.outputCount++, this.outputSize += j.OUTPUT_SIZE + j.P2TR_OUTPUT_SIZE, this;
  }
  vsize() {
    const t = (i) => i < 253 ? 1 : i < 65535 ? 3 : i < 4294967295 ? 5 : 9, n = t(this.inputCount), r = t(this.outputCount);
    let s = (j.BASE_TX_SIZE + n + this.inputSize + r + this.outputSize) * j.WITNESS_SCALE_FACTOR;
    return this.hasWitness && (s += j.WITNESS_HEADER_SIZE + this.inputWitnessSize), Ul(s);
  }
}
j.P2PKH_SCRIPT_SIG_SIZE = 108;
j.INPUT_SIZE = 41;
j.BASE_CONTROL_BLOCK_SIZE = 33;
j.OUTPUT_SIZE = 9;
j.P2WKH_OUTPUT_SIZE = 22;
j.BASE_TX_SIZE = 10;
j.WITNESS_HEADER_SIZE = 2;
j.WITNESS_SCALE_FACTOR = 4;
j.P2TR_OUTPUT_SIZE = 34;
const Ul = (e) => {
  const t = BigInt(Math.ceil(e / j.WITNESS_SCALE_FACTOR));
  return {
    value: t,
    fee: (n) => n * t
  };
};
var wt;
(function(e) {
  function t(p) {
    return typeof p == "object" && p !== null && "type" in p;
  }
  e.isBase = t;
  function n(p) {
    return p.type === "INIT_WALLET" && "arkServerUrl" in p && typeof p.arkServerUrl == "string" && "privateKey" in p && typeof p.privateKey == "string" && ("arkServerPublicKey" in p ? p.arkServerPublicKey === void 0 || typeof p.arkServerPublicKey == "string" : !0);
  }
  e.isInitWallet = n;
  function r(p) {
    return p.type === "SETTLE";
  }
  e.isSettle = r;
  function o(p) {
    return p.type === "GET_ADDRESS";
  }
  e.isGetAddress = o;
  function s(p) {
    return p.type === "GET_BOARDING_ADDRESS";
  }
  e.isGetBoardingAddress = s;
  function i(p) {
    return p.type === "GET_BALANCE";
  }
  e.isGetBalance = i;
  function c(p) {
    return p.type === "GET_VTXOS";
  }
  e.isGetVtxos = c;
  function a(p) {
    return p.type === "GET_VIRTUAL_COINS";
  }
  e.isGetVirtualCoins = a;
  function u(p) {
    return p.type === "GET_BOARDING_UTXOS";
  }
  e.isGetBoardingUtxos = u;
  function f(p) {
    return p.type === "SEND_BITCOIN" && "params" in p && p.params !== null && typeof p.params == "object" && "address" in p.params && typeof p.params.address == "string" && "amount" in p.params && typeof p.params.amount == "number";
  }
  e.isSendBitcoin = f;
  function l(p) {
    return p.type === "GET_TRANSACTION_HISTORY";
  }
  e.isGetTransactionHistory = l;
  function d(p) {
    return p.type === "GET_STATUS";
  }
  e.isGetStatus = d;
  function h(p) {
    return p.type === "CLEAR";
  }
  e.isClear = h;
  function g(p) {
    return p.type === "RELOAD_WALLET";
  }
  e.isReloadWallet = g;
})(wt || (wt = {}));
class Nl {
  constructor(t = () => {
  }) {
    this.messageCallback = t, this.storage = new Ol("arkade-service-worker", 1), this.walletRepository = new Mc(this.storage);
  }
  /**
   * Get spendable vtxos for the current wallet address
   */
  async getSpendableVtxos() {
    if (!this.wallet)
      return [];
    const t = await this.wallet.getAddress();
    return (await this.walletRepository.getVtxos(t)).filter(oe);
  }
  /**
   * Get swept vtxos for the current wallet address
   */
  async getSweptVtxos() {
    if (!this.wallet)
      return [];
    const t = await this.wallet.getAddress();
    return (await this.walletRepository.getVtxos(t)).filter((r) => r.virtualStatus.state === "swept");
  }
  /**
   * Get all vtxos categorized by type
   */
  async getAllVtxos() {
    if (!this.wallet)
      return { spendable: [], spent: [] };
    const t = await this.wallet.getAddress(), n = await this.walletRepository.getVtxos(t);
    return {
      spendable: n.filter(oe),
      spent: n.filter((r) => !oe(r))
    };
  }
  async start(t = !0) {
    self.addEventListener("message", async (n) => {
      await this.handleMessage(n);
    }), t && (self.addEventListener("install", () => {
      self.skipWaiting();
    }), self.addEventListener("activate", () => {
      self.clients.claim();
    }));
  }
  async clear() {
    this.incomingFundsSubscription && this.incomingFundsSubscription(), await this.storage.clear(), this.wallet = void 0, this.arkProvider = void 0, this.indexerProvider = void 0;
  }
  async reload() {
    await this.onWalletInitialized();
  }
  async onWalletInitialized() {
    if (!this.wallet || !this.arkProvider || !this.indexerProvider || !this.wallet.offchainTapscript || !this.wallet.boardingTapscript)
      return;
    const t = x.encode(this.wallet.offchainTapscript.pkScript), r = (await this.indexerProvider.getVtxos({
      scripts: [t]
    })).vtxos.map((i) => Qe(this.wallet, i)), o = await this.wallet.getAddress();
    await this.walletRepository.saveVtxos(o, r);
    const s = await this.wallet.getTransactionHistory();
    s && await this.walletRepository.saveTransactions(o, s), this.incomingFundsSubscription && this.incomingFundsSubscription(), this.incomingFundsSubscription = await this.wallet.notifyIncomingFunds(async (i) => {
      if (i.type === "vtxo") {
        const c = i.newVtxos.length > 0 ? i.newVtxos.map((u) => Qe(this.wallet, u)) : [], a = i.spentVtxos.length > 0 ? i.spentVtxos.map((u) => Qe(this.wallet, u)) : [];
        if ([...c, ...a].length === 0)
          return;
        await this.walletRepository.saveVtxos(o, [
          ...c,
          ...a
        ]), this.sendMessageToAllClients("VTXO_UPDATE", JSON.stringify({ newVtxos: c, spentVtxos: a }));
      }
      i.type === "utxo" && i.coins.length > 0 && this.sendMessageToAllClients("UTXO_UPDATE", JSON.stringify(i.coins));
    });
  }
  async handleClear(t) {
    await this.clear(), wt.isBase(t.data) && t.source?.postMessage(R.clearResponse(t.data.id, !0));
  }
  async handleInitWallet(t) {
    const n = t.data;
    if (!wt.isInitWallet(n)) {
      console.error("Invalid INIT_WALLET message format", n), t.source?.postMessage(R.error(n.id, "Invalid INIT_WALLET message format"));
      return;
    }
    if (!n.privateKey) {
      const r = "Missing privateKey";
      t.source?.postMessage(R.error(n.id, r)), console.error(r);
      return;
    }
    try {
      const { arkServerPublicKey: r, arkServerUrl: o, privateKey: s } = n, i = Xe.fromHex(s);
      this.arkProvider = new _c(o), this.indexerProvider = new Hc(o), this.wallet = await He.create({
        identity: i,
        arkServerUrl: o,
        arkServerPublicKey: r,
        storage: this.storage
        // Use unified storage for wallet too
      }), t.source?.postMessage(R.walletInitialized(n.id)), await this.onWalletInitialized();
    } catch (r) {
      console.error("Error initializing wallet:", r);
      const o = r instanceof Error ? r.message : "Unknown error occurred";
      t.source?.postMessage(R.error(n.id, o));
    }
  }
  async handleSettle(t) {
    const n = t.data;
    if (!wt.isSettle(n)) {
      console.error("Invalid SETTLE message format", n), t.source?.postMessage(R.error(n.id, "Invalid SETTLE message format"));
      return;
    }
    try {
      if (!this.wallet) {
        console.error("Wallet not initialized"), t.source?.postMessage(R.error(n.id, "Wallet not initialized"));
        return;
      }
      const r = await this.wallet.settle(n.params, (o) => {
        t.source?.postMessage(R.settleEvent(n.id, o));
      });
      t.source?.postMessage(R.settleSuccess(n.id, r));
    } catch (r) {
      console.error("Error settling:", r);
      const o = r instanceof Error ? r.message : "Unknown error occurred";
      t.source?.postMessage(R.error(n.id, o));
    }
  }
  async handleSendBitcoin(t) {
    const n = t.data;
    if (!wt.isSendBitcoin(n)) {
      console.error("Invalid SEND_BITCOIN message format", n), t.source?.postMessage(R.error(n.id, "Invalid SEND_BITCOIN message format"));
      return;
    }
    if (!this.wallet) {
      console.error("Wallet not initialized"), t.source?.postMessage(R.error(n.id, "Wallet not initialized"));
      return;
    }
    try {
      const r = await this.wallet.sendBitcoin(n.params);
      t.source?.postMessage(R.sendBitcoinSuccess(n.id, r));
    } catch (r) {
      console.error("Error sending bitcoin:", r);
      const o = r instanceof Error ? r.message : "Unknown error occurred";
      t.source?.postMessage(R.error(n.id, o));
    }
  }
  async handleGetAddress(t) {
    const n = t.data;
    if (!wt.isGetAddress(n)) {
      console.error("Invalid GET_ADDRESS message format", n), t.source?.postMessage(R.error(n.id, "Invalid GET_ADDRESS message format"));
      return;
    }
    if (!this.wallet) {
      console.error("Wallet not initialized"), t.source?.postMessage(R.error(n.id, "Wallet not initialized"));
      return;
    }
    try {
      const r = await this.wallet.getAddress();
      t.source?.postMessage(R.address(n.id, r));
    } catch (r) {
      console.error("Error getting address:", r);
      const o = r instanceof Error ? r.message : "Unknown error occurred";
      t.source?.postMessage(R.error(n.id, o));
    }
  }
  async handleGetBoardingAddress(t) {
    const n = t.data;
    if (!wt.isGetBoardingAddress(n)) {
      console.error("Invalid GET_BOARDING_ADDRESS message format", n), t.source?.postMessage(R.error(n.id, "Invalid GET_BOARDING_ADDRESS message format"));
      return;
    }
    if (!this.wallet) {
      console.error("Wallet not initialized"), t.source?.postMessage(R.error(n.id, "Wallet not initialized"));
      return;
    }
    try {
      const r = await this.wallet.getBoardingAddress();
      t.source?.postMessage(R.boardingAddress(n.id, r));
    } catch (r) {
      console.error("Error getting boarding address:", r);
      const o = r instanceof Error ? r.message : "Unknown error occurred";
      t.source?.postMessage(R.error(n.id, o));
    }
  }
  async handleGetBalance(t) {
    const n = t.data;
    if (!wt.isGetBalance(n)) {
      console.error("Invalid GET_BALANCE message format", n), t.source?.postMessage(R.error(n.id, "Invalid GET_BALANCE message format"));
      return;
    }
    if (!this.wallet) {
      console.error("Wallet not initialized"), t.source?.postMessage(R.error(n.id, "Wallet not initialized"));
      return;
    }
    try {
      const [r, o, s] = await Promise.all([
        this.wallet.getBoardingUtxos(),
        this.getSpendableVtxos(),
        this.getSweptVtxos()
      ]);
      let i = 0, c = 0;
      for (const h of r)
        h.status.confirmed ? i += h.value : c += h.value;
      let a = 0, u = 0, f = 0;
      for (const h of o)
        h.virtualStatus.state === "settled" ? a += h.value : h.virtualStatus.state === "preconfirmed" && (u += h.value);
      for (const h of s)
        oe(h) && (f += h.value);
      const l = i + c, d = a + u + f;
      t.source?.postMessage(R.balance(n.id, {
        boarding: {
          confirmed: i,
          unconfirmed: c,
          total: l
        },
        settled: a,
        preconfirmed: u,
        available: a + u,
        recoverable: f,
        total: l + d
      }));
    } catch (r) {
      console.error("Error getting balance:", r);
      const o = r instanceof Error ? r.message : "Unknown error occurred";
      t.source?.postMessage(R.error(n.id, o));
    }
  }
  async handleGetVtxos(t) {
    const n = t.data;
    if (!wt.isGetVtxos(n)) {
      console.error("Invalid GET_VTXOS message format", n), t.source?.postMessage(R.error(n.id, "Invalid GET_VTXOS message format"));
      return;
    }
    if (!this.wallet) {
      console.error("Wallet not initialized"), t.source?.postMessage(R.error(n.id, "Wallet not initialized"));
      return;
    }
    try {
      let r = await this.getSpendableVtxos();
      if (!n.filter?.withRecoverable) {
        if (!this.wallet)
          throw new Error("Wallet not initialized");
        const o = this.wallet?.dustAmount;
        r = o == null ? r : r.filter((s) => !Rc(s, o));
      }
      if (n.filter?.withRecoverable) {
        const o = await this.getSweptVtxos();
        r.push(...o.filter(oe));
      }
      t.source?.postMessage(R.vtxos(n.id, r));
    } catch (r) {
      console.error("Error getting vtxos:", r);
      const o = r instanceof Error ? r.message : "Unknown error occurred";
      t.source?.postMessage(R.error(n.id, o));
    }
  }
  async handleGetBoardingUtxos(t) {
    const n = t.data;
    if (!wt.isGetBoardingUtxos(n)) {
      console.error("Invalid GET_BOARDING_UTXOS message format", n), t.source?.postMessage(R.error(n.id, "Invalid GET_BOARDING_UTXOS message format"));
      return;
    }
    if (!this.wallet) {
      console.error("Wallet not initialized"), t.source?.postMessage(R.error(n.id, "Wallet not initialized"));
      return;
    }
    try {
      const r = await this.wallet.getBoardingUtxos();
      t.source?.postMessage(R.boardingUtxos(n.id, r));
    } catch (r) {
      console.error("Error getting boarding utxos:", r);
      const o = r instanceof Error ? r.message : "Unknown error occurred";
      t.source?.postMessage(R.error(n.id, o));
    }
  }
  async handleGetTransactionHistory(t) {
    const n = t.data;
    if (!wt.isGetTransactionHistory(n)) {
      console.error("Invalid GET_TRANSACTION_HISTORY message format", n), t.source?.postMessage(R.error(n.id, "Invalid GET_TRANSACTION_HISTORY message format"));
      return;
    }
    if (!this.wallet) {
      console.error("Wallet not initialized"), t.source?.postMessage(R.error(n.id, "Wallet not initialized"));
      return;
    }
    try {
      const { boardingTxs: r, commitmentsToIgnore: o } = await this.wallet.getBoardingTxs(), { spendable: s, spent: i } = await this.getAllVtxos(), c = Pc(s, i, o), a = [...r, ...c];
      a.sort(
        // place createdAt = 0 (unconfirmed txs) first, then descending
        (u, f) => u.createdAt === 0 ? -1 : f.createdAt === 0 ? 1 : f.createdAt - u.createdAt
      ), t.source?.postMessage(R.transactionHistory(n.id, a));
    } catch (r) {
      console.error("Error getting transaction history:", r);
      const o = r instanceof Error ? r.message : "Unknown error occurred";
      t.source?.postMessage(R.error(n.id, o));
    }
  }
  async handleGetStatus(t) {
    const n = t.data;
    if (!wt.isGetStatus(n)) {
      console.error("Invalid GET_STATUS message format", n), t.source?.postMessage(R.error(n.id, "Invalid GET_STATUS message format"));
      return;
    }
    const r = this.wallet ? await this.wallet.identity.xOnlyPublicKey() : void 0;
    t.source?.postMessage(R.walletStatus(n.id, this.wallet !== void 0, r));
  }
  async handleMessage(t) {
    this.messageCallback(t);
    const n = t.data;
    if (!wt.isBase(n)) {
      console.warn("Invalid message format", JSON.stringify(n));
      return;
    }
    switch (n.type) {
      case "INIT_WALLET": {
        await this.handleInitWallet(t);
        break;
      }
      case "SETTLE": {
        await this.handleSettle(t);
        break;
      }
      case "SEND_BITCOIN": {
        await this.handleSendBitcoin(t);
        break;
      }
      case "GET_ADDRESS": {
        await this.handleGetAddress(t);
        break;
      }
      case "GET_BOARDING_ADDRESS": {
        await this.handleGetBoardingAddress(t);
        break;
      }
      case "GET_BALANCE": {
        await this.handleGetBalance(t);
        break;
      }
      case "GET_VTXOS": {
        await this.handleGetVtxos(t);
        break;
      }
      case "GET_BOARDING_UTXOS": {
        await this.handleGetBoardingUtxos(t);
        break;
      }
      case "GET_TRANSACTION_HISTORY": {
        await this.handleGetTransactionHistory(t);
        break;
      }
      case "GET_STATUS": {
        await this.handleGetStatus(t);
        break;
      }
      case "CLEAR": {
        await this.handleClear(t);
        break;
      }
      case "RELOAD_WALLET": {
        await this.handleReloadWallet(t);
        break;
      }
      default:
        t.source?.postMessage(R.error(n.id, "Unknown message type"));
    }
  }
  async sendMessageToAllClients(t, n) {
    self.clients.matchAll({ includeUncontrolled: !0, type: "window" }).then((r) => {
      r.forEach((o) => {
        o.postMessage({
          type: t,
          message: n
        });
      });
    });
  }
  async handleReloadWallet(t) {
    const n = t.data;
    if (console.log("RELOAD_WALLET message received", n), !wt.isReloadWallet(n)) {
      console.error("Invalid RELOAD_WALLET message format", n), t.source?.postMessage(R.error(n.id, "Invalid RELOAD_WALLET message format"));
      return;
    }
    if (!this.wallet) {
      console.error("Wallet not initialized"), t.source?.postMessage(R.walletReloaded(n.id, !1));
      return;
    }
    try {
      await this.onWalletInitialized(), t.source?.postMessage(R.walletReloaded(n.id, !0));
    } catch (r) {
      console.error("Error reloading wallet:", r), t.source?.postMessage(R.walletReloaded(n.id, !1));
    }
  }
}
var zs;
(function(e) {
  let t;
  (function(o) {
    o[o.UNROLL = 0] = "UNROLL", o[o.WAIT = 1] = "WAIT", o[o.DONE = 2] = "DONE";
  })(t = e.StepType || (e.StepType = {}));
  class n {
    constructor(s, i, c, a) {
      this.toUnroll = s, this.bumper = i, this.explorer = c, this.indexer = a;
    }
    static async create(s, i, c, a) {
      const { chain: u } = await a.getVtxoChain(s);
      return new n({ ...s, chain: u }, i, c, a);
    }
    /**
     * Get the next step to be executed
     * @returns The next step to be executed + the function to execute it
     */
    async next() {
      let s;
      const i = this.toUnroll.chain;
      for (let u = i.length - 1; u >= 0; u--) {
        const f = i[u];
        if (!(f.type === Oe.COMMITMENT || f.type === Oe.UNSPECIFIED))
          try {
            if (!(await this.explorer.getTxStatus(f.txid)).confirmed)
              return {
                type: t.WAIT,
                txid: f.txid,
                do: Ll(this.explorer, f.txid)
              };
          } catch {
            s = f;
            break;
          }
      }
      if (!s)
        return {
          type: t.DONE,
          vtxoTxid: this.toUnroll.txid,
          do: () => Promise.resolve()
        };
      const c = await this.indexer.getVirtualTxs([
        s.txid
      ]);
      if (c.txs.length === 0)
        throw new Error(`Tx ${s.txid} not found`);
      const a = gt.fromPSBT(At.decode(c.txs[0]), {
        allowUnknownInputs: !0
      });
      if (s.type === Oe.TREE) {
        const u = a.getInput(0);
        if (!u)
          throw new Error("Input not found");
        const f = u.tapKeySig;
        if (!f)
          throw new Error("Tap key sig not found");
        a.updateInput(0, {
          finalScriptWitness: [f]
        });
      } else
        a.finalize();
      return {
        type: t.UNROLL,
        tx: a,
        do: $l(this.bumper, this.explorer, a)
      };
    }
    /**
     * Iterate over the steps to be executed and execute them
     * @returns An async iterator over the executed steps
     */
    async *[Symbol.asyncIterator]() {
      let s;
      do {
        s !== void 0 && await Cl(1e3);
        const i = await this.next();
        await i.do(), yield i, s = i.type;
      } while (s !== t.DONE);
    }
  }
  e.Session = n;
  async function r(o, s, i) {
    const c = await o.onchainProvider.getChainTip();
    let a = await o.getVtxos({ withUnrolled: !0 });
    if (a = a.filter((y) => s.includes(y.txid)), a.length === 0)
      throw new Error("No vtxos to complete unroll");
    const u = [];
    let f = 0n;
    const l = j.create();
    for (const y of a) {
      if (!y.isUnrolled)
        throw new Error(`Vtxo ${y.txid}:${y.vout} is not fully unrolled, use unroll first`);
      const m = await o.onchainProvider.getTxStatus(y.txid);
      if (!m.confirmed)
        throw new Error(`tx ${y.txid} is not confirmed`);
      const b = Rl({ height: m.blockHeight, time: m.blockTime }, c, y);
      if (!b)
        throw new Error(`no available exit path found for vtxo ${y.txid}:${y.vout}`);
      const k = Ot.decode(y.tapTree).findLeaf(x.encode(b.script));
      if (!k)
        throw new Error(`spending leaf not found for vtxo ${y.txid}:${y.vout}`);
      f += BigInt(y.value), u.push({
        txid: y.txid,
        index: y.vout,
        tapLeafScript: [k],
        sequence: 4294967294,
        witnessUtxo: {
          amount: BigInt(y.value),
          script: Ot.decode(y.tapTree).pkScript
        },
        sighashType: me.DEFAULT
      }), l.addTapscriptInput(64, k[1].length, Pt.encode(k[0]).length);
    }
    const d = new gt({ allowUnknownInputs: !0, version: 2 });
    for (const y of u)
      d.addInput(y);
    l.addP2TROutput();
    let h = await o.onchainProvider.getFeeRate();
    (!h || h < He.MIN_FEE_RATE) && (h = He.MIN_FEE_RATE);
    const g = l.vsize().fee(BigInt(h));
    if (g > f)
      throw new Error("fee amount is greater than the total amount");
    d.addOutputAddress(i, f - g);
    const p = await o.identity.sign(d);
    return p.finalize(), await o.onchainProvider.broadcastTransaction(p.hex), p.id;
  }
  e.completeUnroll = r;
})(zs || (zs = {}));
function Cl(e) {
  return new Promise((t) => setTimeout(t, e));
}
function $l(e, t, n) {
  return async () => {
    const [r, o] = await e.bumpP2A(n);
    await t.broadcastTransaction(r, o);
  };
}
function Ll(e, t) {
  return () => new Promise((n, r) => {
    const o = setInterval(async () => {
      try {
        (await e.getTxStatus(t)).confirmed && (clearInterval(o), n());
      } catch (s) {
        clearInterval(o), r(s);
      }
    }, 5e3);
  });
}
function Rl(e, t, n) {
  const r = Ot.decode(n.tapTree).exitPaths();
  for (const o of r)
    if (o.params.timelock.type === "blocks") {
      if (t.height >= e.height + Number(o.params.timelock.value))
        return o;
    } else if (t.time >= e.time + Number(o.params.timelock.value))
      return o;
}
const Kc = new Nl();
Kc.start().catch(console.error);
const Fc = "arkade-cache-v1";
self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(Fc)), self.skipWaiting();
});
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((t) => Promise.all(
      t.map((n) => {
        if (n !== Fc)
          return caches.delete(n);
      })
    ))
  ), self.clients.matchAll({
    includeUncontrolled: !0,
    type: "window"
  }).then((t) => {
    t.forEach((n) => {
      n.postMessage({ type: "RELOAD_PAGE" });
    });
  }), self.clients.claim();
});
self.addEventListener("message", (e) => {
  e.data && e.data.type === "RELOAD_WALLET" && e.waitUntil(Kc.reload().catch(console.error));
});
