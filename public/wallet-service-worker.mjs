/*! scure-base - MIT License (c) 2022 Paul Miller (paulmillr.com) */
function nn(e) {
  return e instanceof Uint8Array || ArrayBuffer.isView(e) && e.constructor.name === "Uint8Array";
}
function bc(e) {
  if (!nn(e))
    throw new Error("Uint8Array expected");
}
function Ec(e, t) {
  return Array.isArray(t) ? t.length === 0 ? !0 : e ? t.every((n) => typeof n == "string") : t.every((n) => Number.isSafeInteger(n)) : !1;
}
function fs(e) {
  if (typeof e != "function")
    throw new Error("function expected");
  return !0;
}
function Te(e, t) {
  if (typeof t != "string")
    throw new Error(`${e}: string expected`);
  return !0;
}
function gn(e) {
  if (!Number.isSafeInteger(e))
    throw new Error(`invalid integer: ${e}`);
}
function pr(e) {
  if (!Array.isArray(e))
    throw new Error("array expected");
}
function gr(e, t) {
  if (!Ec(!0, t))
    throw new Error(`${e}: array of strings expected`);
}
function ls(e, t) {
  if (!Ec(!1, t))
    throw new Error(`${e}: array of numbers expected`);
}
// @__NO_SIDE_EFFECTS__
function Kn(...e) {
  const t = (s) => s, n = (s, i) => (c) => s(i(c)), r = e.map((s) => s.encode).reduceRight(n, t), o = e.map((s) => s.decode).reduce(n, t);
  return { encode: r, decode: o };
}
// @__NO_SIDE_EFFECTS__
function Wr(e) {
  const t = typeof e == "string" ? e.split("") : e, n = t.length;
  gr("alphabet", t);
  const r = new Map(t.map((o, s) => [o, s]));
  return {
    encode: (o) => (pr(o), o.map((s) => {
      if (!Number.isSafeInteger(s) || s < 0 || s >= n)
        throw new Error(`alphabet.encode: digit index outside alphabet "${s}". Allowed: ${e}`);
      return t[s];
    })),
    decode: (o) => (pr(o), o.map((s) => {
      Te("alphabet.decode", s);
      const i = r.get(s);
      if (i === void 0)
        throw new Error(`Unknown letter: "${s}". Allowed: ${e}`);
      return i;
    }))
  };
}
// @__NO_SIDE_EFFECTS__
function zr(e = "") {
  return Te("join", e), {
    encode: (t) => (gr("join.decode", t), t.join(e)),
    decode: (t) => (Te("join.decode", t), t.split(e))
  };
}
// @__NO_SIDE_EFFECTS__
function Ku(e, t = "=") {
  return gn(e), Te("padding", t), {
    encode(n) {
      for (gr("padding.encode", n); n.length * e % 8; )
        n.push(t);
      return n;
    },
    decode(n) {
      gr("padding.decode", n);
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
function Fu(e) {
  return fs(e), { encode: (t) => t, decode: (t) => e(t) };
}
function ti(e, t, n) {
  if (t < 2)
    throw new Error(`convertRadix: invalid from=${t}, base cannot be less than 2`);
  if (n < 2)
    throw new Error(`convertRadix: invalid to=${n}, base cannot be less than 2`);
  if (pr(e), !e.length)
    return [];
  let r = 0;
  const o = [], s = Array.from(e, (c) => {
    if (gn(c), c < 0 || c >= t)
      throw new Error(`invalid integer: ${c}`);
    return c;
  }), i = s.length;
  for (; ; ) {
    let c = 0, a = !0;
    for (let u = r; u < i; u++) {
      const f = s[u], l = t * c, h = l + f;
      if (!Number.isSafeInteger(h) || l / t !== c || h - f !== l)
        throw new Error("convertRadix: carry overflow");
      const d = h / n;
      c = h % n;
      const w = Math.floor(d);
      if (s[u] = w, !Number.isSafeInteger(w) || w * n + c !== h)
        throw new Error("convertRadix: carry overflow");
      if (a)
        w ? a = !1 : r = u;
      else continue;
    }
    if (o.push(c), a)
      break;
  }
  for (let c = 0; c < e.length - 1 && e[c] === 0; c++)
    o.push(0);
  return o.reverse();
}
const xc = (e, t) => t === 0 ? e : xc(t, e % t), wr = /* @__NO_SIDE_EFFECTS__ */ (e, t) => e + (t - xc(e, t)), ar = /* @__PURE__ */ (() => {
  let e = [];
  for (let t = 0; t < 40; t++)
    e.push(2 ** t);
  return e;
})();
function ko(e, t, n, r) {
  if (pr(e), t <= 0 || t > 32)
    throw new Error(`convertRadix2: wrong from=${t}`);
  if (n <= 0 || n > 32)
    throw new Error(`convertRadix2: wrong to=${n}`);
  if (/* @__PURE__ */ wr(t, n) > 32)
    throw new Error(`convertRadix2: carry overflow from=${t} to=${n} carryBits=${/* @__PURE__ */ wr(t, n)}`);
  let o = 0, s = 0;
  const i = ar[t], c = ar[n] - 1, a = [];
  for (const u of e) {
    if (gn(u), u >= i)
      throw new Error(`convertRadix2: invalid data word=${u} from=${t}`);
    if (o = o << t | u, s + t > 32)
      throw new Error(`convertRadix2: carry overflow pos=${s} from=${t}`);
    for (s += t; s >= n; s -= n)
      a.push((o >> s - n & c) >>> 0);
    const f = ar[s];
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
function Wu(e) {
  gn(e);
  const t = 2 ** 8;
  return {
    encode: (n) => {
      if (!nn(n))
        throw new Error("radix.encode input should be Uint8Array");
      return ti(Array.from(n), t, e);
    },
    decode: (n) => (ls("radix.decode", n), Uint8Array.from(ti(n, e, t)))
  };
}
// @__NO_SIDE_EFFECTS__
function ds(e, t = !1) {
  if (gn(e), e <= 0 || e > 32)
    throw new Error("radix2: bits should be in (0..32]");
  if (/* @__PURE__ */ wr(8, e) > 32 || /* @__PURE__ */ wr(e, 8) > 32)
    throw new Error("radix2: carry overflow");
  return {
    encode: (n) => {
      if (!nn(n))
        throw new Error("radix2.encode input should be Uint8Array");
      return ko(Array.from(n), 8, e, !t);
    },
    decode: (n) => (ls("radix2.decode", n), Uint8Array.from(ko(n, e, 8, t)))
  };
}
function ei(e) {
  return fs(e), function(...t) {
    try {
      return e.apply(null, t);
    } catch {
    }
  };
}
function zu(e, t) {
  return gn(e), fs(t), {
    encode(n) {
      if (!nn(n))
        throw new Error("checksum.encode: input should be Uint8Array");
      const r = t(n).slice(0, e), o = new Uint8Array(n.length + e);
      return o.set(n), o.set(r, n.length), o;
    },
    decode(n) {
      if (!nn(n))
        throw new Error("checksum.decode: input should be Uint8Array");
      const r = n.slice(0, -e), o = n.slice(-e), s = t(r).slice(0, e);
      for (let i = 0; i < e; i++)
        if (s[i] !== o[i])
          throw new Error("Invalid checksum");
      return r;
    }
  };
}
const Gu = typeof Uint8Array.from([]).toBase64 == "function" && typeof Uint8Array.fromBase64 == "function", qu = (e, t) => {
  Te("base64", e);
  const n = /^[A-Za-z0-9=+/]+$/, r = "base64";
  if (e.length > 0 && !n.test(e))
    throw new Error("invalid base64");
  return Uint8Array.fromBase64(e, { alphabet: r, lastChunkHandling: "strict" });
}, It = Gu ? {
  encode(e) {
    return bc(e), e.toBase64();
  },
  decode(e) {
    return qu(e);
  }
} : /* @__PURE__ */ Kn(/* @__PURE__ */ ds(6), /* @__PURE__ */ Wr("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"), /* @__PURE__ */ Ku(6), /* @__PURE__ */ zr("")), ju = /* @__NO_SIDE_EFFECTS__ */ (e) => /* @__PURE__ */ Kn(/* @__PURE__ */ Wu(58), /* @__PURE__ */ Wr(e), /* @__PURE__ */ zr("")), Io = /* @__PURE__ */ ju("123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"), Yu = (e) => /* @__PURE__ */ Kn(zu(4, (t) => e(e(t))), Io), Bo = /* @__PURE__ */ Kn(/* @__PURE__ */ Wr("qpzry9x8gf2tvdw0s3jn54khce6mua7l"), /* @__PURE__ */ zr("")), ni = [996825010, 642813549, 513874426, 1027748829, 705979059];
function En(e) {
  const t = e >> 25;
  let n = (e & 33554431) << 5;
  for (let r = 0; r < ni.length; r++)
    (t >> r & 1) === 1 && (n ^= ni[r]);
  return n;
}
function ri(e, t, n = 1) {
  const r = e.length;
  let o = 1;
  for (let s = 0; s < r; s++) {
    const i = e.charCodeAt(s);
    if (i < 33 || i > 126)
      throw new Error(`Invalid prefix (${e})`);
    o = En(o) ^ i >> 5;
  }
  o = En(o);
  for (let s = 0; s < r; s++)
    o = En(o) ^ e.charCodeAt(s) & 31;
  for (let s of t)
    o = En(o) ^ s;
  for (let s = 0; s < 6; s++)
    o = En(o);
  return o ^= n, Bo.encode(ko([o % ar[30]], 30, 5, !1));
}
// @__NO_SIDE_EFFECTS__
function Sc(e) {
  const t = e === "bech32" ? 1 : 734539939, n = /* @__PURE__ */ ds(5), r = n.decode, o = n.encode, s = ei(r);
  function i(l, h, d = 90) {
    Te("bech32.encode prefix", l), nn(h) && (h = Array.from(h)), ls("bech32.encode", h);
    const w = l.length;
    if (w === 0)
      throw new TypeError(`Invalid prefix length ${w}`);
    const g = w + 7 + h.length;
    if (d !== !1 && g > d)
      throw new TypeError(`Length ${g} exceeds limit ${d}`);
    const y = l.toLowerCase(), S = ri(y, h, t);
    return `${y}1${Bo.encode(h)}${S}`;
  }
  function c(l, h = 90) {
    Te("bech32.decode input", l);
    const d = l.length;
    if (d < 8 || h !== !1 && d > h)
      throw new TypeError(`invalid string length: ${d} (${l}). Expected (8..${h})`);
    const w = l.toLowerCase();
    if (l !== w && l !== l.toUpperCase())
      throw new Error("String must be lowercase or uppercase");
    const g = w.lastIndexOf("1");
    if (g === 0 || g === -1)
      throw new Error('Letter "1" must be present between prefix and data only');
    const y = w.slice(0, g), S = w.slice(g + 1);
    if (S.length < 6)
      throw new Error("Data must be at least 6 characters long");
    const v = Bo.decode(S).slice(0, -6), O = ri(y, v, t);
    if (!S.endsWith(O))
      throw new Error(`Invalid checksum in ${l}: expected "${O}"`);
    return { prefix: y, words: v };
  }
  const a = ei(c);
  function u(l) {
    const { prefix: h, words: d } = c(l, !1);
    return { prefix: h, words: d, bytes: r(d) };
  }
  function f(l, h) {
    return i(l, o(h));
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
const Oo = /* @__PURE__ */ Sc("bech32"), qe = /* @__PURE__ */ Sc("bech32m"), Zu = {
  encode: (e) => new TextDecoder().decode(e),
  decode: (e) => new TextEncoder().encode(e)
}, Xu = typeof Uint8Array.from([]).toHex == "function" && typeof Uint8Array.fromHex == "function", Qu = {
  encode(e) {
    return bc(e), e.toHex();
  },
  decode(e) {
    return Te("hex", e), Uint8Array.fromHex(e);
  }
}, $ = Xu ? Qu : /* @__PURE__ */ Kn(/* @__PURE__ */ ds(4), /* @__PURE__ */ Wr("0123456789abcdef"), /* @__PURE__ */ zr(""), /* @__PURE__ */ Fu((e) => {
  if (typeof e != "string" || e.length % 2 !== 0)
    throw new TypeError(`hex.decode: expected string, got ${typeof e} with length ${e.length}`);
  return e.toLowerCase();
})), ot = /* @__PURE__ */ Uint8Array.of(), vc = /* @__PURE__ */ Uint8Array.of(0);
function rn(e, t) {
  if (e.length !== t.length)
    return !1;
  for (let n = 0; n < e.length; n++)
    if (e[n] !== t[n])
      return !1;
  return !0;
}
function _t(e) {
  return e instanceof Uint8Array || ArrayBuffer.isView(e) && e.constructor.name === "Uint8Array";
}
function Ju(...e) {
  let t = 0;
  for (let r = 0; r < e.length; r++) {
    const o = e[r];
    if (!_t(o))
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
const Tc = (e) => new DataView(e.buffer, e.byteOffset, e.byteLength);
function Fn(e) {
  return Object.prototype.toString.call(e) === "[object Object]";
}
function Jt(e) {
  return Number.isSafeInteger(e);
}
const hs = {
  equalBytes: rn,
  isBytes: _t,
  concatBytes: Ju
}, Ac = (e) => {
  if (e !== null && typeof e != "string" && !Wt(e) && !_t(e) && !Jt(e))
    throw new Error(`lengthCoder: expected null | number | Uint8Array | CoderType, got ${e} (${typeof e})`);
  return {
    encodeStream(t, n) {
      if (e === null)
        return;
      if (Wt(e))
        return e.encodeStream(t, n);
      let r;
      if (typeof e == "number" ? r = e : typeof e == "string" && (r = fe.resolve(t.stack, e)), typeof r == "bigint" && (r = Number(r)), r === void 0 || r !== n)
        throw t.err(`Wrong length: ${r} len=${e} exp=${n} (${typeof n})`);
    },
    decodeStream(t) {
      let n;
      if (Wt(e) ? n = Number(e.decodeStream(t)) : typeof e == "number" ? n = e : typeof e == "string" && (n = fe.resolve(t.stack, e)), typeof n == "bigint" && (n = Number(n)), typeof n != "number")
        throw t.err(`Wrong length: ${n}`);
      return n;
    }
  };
}, dt = {
  BITS: 32,
  FULL_MASK: -1 >>> 0,
  // 1<<32 will overflow
  len: (e) => Math.ceil(e / 32),
  create: (e) => new Uint32Array(dt.len(e)),
  clean: (e) => e.fill(0),
  debug: (e) => Array.from(e).map((t) => (t >>> 0).toString(2).padStart(32, "0")),
  checkLen: (e, t) => {
    if (dt.len(t) !== e.length)
      throw new Error(`wrong length=${e.length}. Expected: ${dt.len(t)}`);
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
    dt.checkLen(e, t);
    const { FULL_MASK: r, BITS: o } = dt, s = o - t % o, i = s ? r >>> s << s : r, c = [];
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
  rangeDebug: (e, t, n = !1) => `[${dt.range(dt.indices(e, t, n)).map((r) => `(${r.pos}/${r.length})`).join(", ")}]`,
  setRange: (e, t, n, r, o = !0) => {
    dt.chunkLen(t, n, r);
    const { FULL_MASK: s, BITS: i } = dt, c = n % i ? Math.floor(n / i) : void 0, a = n + r, u = a % i ? Math.floor(a / i) : void 0;
    if (c !== void 0 && c === u)
      return dt.set(e, c, s >>> i - r << i - r - n, o);
    if (c !== void 0 && !dt.set(e, c, s >>> n % i, o))
      return !1;
    const f = c !== void 0 ? c + 1 : n / i, l = u !== void 0 ? u : a / i;
    for (let h = f; h < l; h++)
      if (!dt.set(e, h, s, o))
        return !1;
    return !(u !== void 0 && c !== u && !dt.set(e, u, s << i - a % i, o));
  }
}, fe = {
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
    const r = new Error(`${e}(${fe.path(t)}): ${typeof n == "string" ? n : n.message}`);
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
class ps {
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
    this.data = t, this.opts = n, this.stack = r, this.parent = o, this.parentOffset = s, this.view = Tc(t);
  }
  /** Internal method for pointers. */
  _enablePointers() {
    if (this.parent)
      return this.parent._enablePointers();
    this.bs || (this.bs = dt.create(this.data.length), dt.setRange(this.bs, this.data.length, 0, this.pos, this.opts.allowMultipleReads));
  }
  markBytesBS(t, n) {
    return this.parent ? this.parent.markBytesBS(this.parentOffset + t, n) : !n || !this.bs ? !0 : dt.setRange(this.bs, this.data.length, t, n, !1);
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
    return fe.pushObj(this.stack, t, n);
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
        throw this.err(`${this.bitPos} bits left after unpack: ${$.encode(this.data.slice(this.pos))}`);
      if (this.bs && !this.parent) {
        const t = dt.indices(this.bs, this.data.length, !0);
        if (t.length) {
          const n = dt.range(t).map(({ pos: r, length: o }) => `(${r}/${o})[${$.encode(this.data.subarray(r, r + o))}]`).join(", ");
          throw this.err(`unread byte ranges: ${n} (total=${this.data.length})`);
        } else
          return;
      }
      if (!this.isEnd())
        throw this.err(`${this.leftBytes} bytes ${this.bitPos} bits left after unpack: ${$.encode(this.data.slice(this.pos))}`);
    }
  }
  // User methods
  err(t) {
    return fe.err("Reader", this.stack, t);
  }
  offsetReader(t) {
    if (t > this.data.length)
      throw this.err("offsetReader: Unexpected end of buffer");
    return new ps(this.absBytes(t), this.opts, this.stack, this, t);
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
    if (!_t(t))
      throw this.err(`find: needle is not bytes! ${t}`);
    if (this.bitPos)
      throw this.err("findByte: bitPos not empty");
    if (!t.length)
      throw this.err("find: needle is empty");
    for (let r = n; (r = this.data.indexOf(t[0], r)) !== -1; r++) {
      if (r === -1 || this.data.length - r < t.length)
        return;
      if (rn(t, this.data.subarray(r, r + t.length)))
        return r;
    }
  }
}
class tf {
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
    this.stack = t, this.view = Tc(this.viewBuf);
  }
  pushObj(t, n) {
    return fe.pushObj(this.stack, t, n);
  }
  writeView(t, n) {
    if (this.finished)
      throw this.err("buffer: finished");
    if (!Jt(t) || t > 8)
      throw new Error(`wrong writeView length=${t}`);
    n(this.view), this.bytes(this.viewBuf.slice(0, t)), this.viewBuf.fill(0);
  }
  // User methods
  err(t) {
    if (this.finished)
      throw this.err("buffer: finished");
    return fe.err("Reader", this.stack, t);
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
const $o = (e) => Uint8Array.from(e).reverse();
function ef(e, t, n) {
  if (n) {
    const r = 2n ** (t - 1n);
    if (e < -r || e >= r)
      throw new Error(`value out of signed bounds. Expected ${-r} <= ${e} < ${r}`);
  } else if (0n > e || e >= 2n ** t)
    throw new Error(`value out of unsigned bounds. Expected 0 <= ${e} < ${2n ** t}`);
}
function kc(e) {
  return {
    // NOTE: we cannot export validate here, since it is likely mistake.
    encodeStream: e.encodeStream,
    decodeStream: e.decodeStream,
    size: e.size,
    encode: (t) => {
      const n = new tf();
      return e.encodeStream(n, t), n.finish();
    },
    decode: (t, n = {}) => {
      const r = new ps(t, n), o = e.decodeStream(r);
      return r.finish(), o;
    }
  };
}
function At(e, t) {
  if (!Wt(e))
    throw new Error(`validate: invalid inner value ${e}`);
  if (typeof t != "function")
    throw new Error("validate: fn should be function");
  return kc({
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
const kt = (e) => {
  const t = kc(e);
  return e.validate ? At(t, e.validate) : t;
}, Gr = (e) => Fn(e) && typeof e.decode == "function" && typeof e.encode == "function";
function Wt(e) {
  return Fn(e) && Gr(e) && typeof e.encodeStream == "function" && typeof e.decodeStream == "function" && (e.size === void 0 || Jt(e.size));
}
function nf() {
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
      if (!Fn(e))
        throw new Error(`expected plain object, got ${e}`);
      return Object.entries(e);
    }
  };
}
const rf = {
  encode: (e) => {
    if (typeof e != "bigint")
      throw new Error(`expected bigint, got ${typeof e}`);
    if (e > BigInt(Number.MAX_SAFE_INTEGER))
      throw new Error(`element bigger than MAX_SAFE_INTEGER=${e}`);
    return Number(e);
  },
  decode: (e) => {
    if (!Jt(e))
      throw new Error("element is not a safe integer");
    return BigInt(e);
  }
};
function of(e) {
  if (!Fn(e))
    throw new Error("plain object expected");
  return {
    encode: (t) => {
      if (!Jt(t) || !(t in e))
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
function sf(e, t = !1) {
  if (!Jt(e))
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
function cf(e) {
  if (!Array.isArray(e))
    throw new Error(`expected array, got ${typeof e}`);
  for (const t of e)
    if (!Gr(t))
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
const Ic = (e) => {
  if (!Gr(e))
    throw new Error("BaseCoder expected");
  return { encode: e.decode, decode: e.encode };
}, qr = { dict: nf, numberBigint: rf, tsEnum: of, decimal: sf, match: cf, reverse: Ic }, gs = (e, t = !1, n = !1, r = !0) => {
  if (!Jt(e))
    throw new Error(`bigint/size: wrong value ${e}`);
  if (typeof t != "boolean")
    throw new Error(`bigint/le: expected boolean, got ${typeof t}`);
  if (typeof n != "boolean")
    throw new Error(`bigint/signed: expected boolean, got ${typeof n}`);
  if (typeof r != "boolean")
    throw new Error(`bigint/sized: expected boolean, got ${typeof r}`);
  const o = BigInt(e), s = 2n ** (8n * o - 1n);
  return kt({
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
      const c = i.bytes(r ? e : Math.min(e, i.leftBytes)), a = t ? c : $o(c);
      let u = 0n;
      for (let f = 0; f < a.length; f++)
        u |= BigInt(a[f]) << 8n * BigInt(f);
      return n && u & s && (u = (u ^ s) - s), u;
    },
    validate: (i) => {
      if (typeof i != "bigint")
        throw new Error(`bigint: invalid value: ${i}`);
      return ef(i, 8n * o, !!n), i;
    }
  });
}, Bc = /* @__PURE__ */ gs(32, !1), ur = /* @__PURE__ */ gs(8, !0), af = /* @__PURE__ */ gs(8, !0, !0), uf = (e, t) => kt({
  size: e,
  encodeStream: (n, r) => n.writeView(e, (o) => t.write(o, r)),
  decodeStream: (n) => n.readView(e, t.read),
  validate: (n) => {
    if (typeof n != "number")
      throw new Error(`viewCoder: expected number, got ${typeof n}`);
    return t.validate && t.validate(n), n;
  }
}), Wn = (e, t, n) => {
  const r = e * 8, o = 2 ** (r - 1), s = (a) => {
    if (!Jt(a))
      throw new Error(`sintView: value is not safe integer: ${a}`);
    if (a < -o || a >= o)
      throw new Error(`sintView: value out of bounds. Expected ${-o} <= ${a} < ${o}`);
  }, i = 2 ** r, c = (a) => {
    if (!Jt(a))
      throw new Error(`uintView: value is not safe integer: ${a}`);
    if (0 > a || a >= i)
      throw new Error(`uintView: value out of bounds. Expected 0 <= ${a} < ${i}`);
  };
  return uf(e, {
    write: n.write,
    read: n.read,
    validate: t ? s : c
  });
}, Z = /* @__PURE__ */ Wn(4, !1, {
  read: (e, t) => e.getUint32(t, !0),
  write: (e, t) => e.setUint32(0, t, !0)
}), ff = /* @__PURE__ */ Wn(4, !1, {
  read: (e, t) => e.getUint32(t, !1),
  write: (e, t) => e.setUint32(0, t, !1)
}), je = /* @__PURE__ */ Wn(4, !0, {
  read: (e, t) => e.getInt32(t, !0),
  write: (e, t) => e.setInt32(0, t, !0)
}), oi = /* @__PURE__ */ Wn(2, !1, {
  read: (e, t) => e.getUint16(t, !0),
  write: (e, t) => e.setUint16(0, t, !0)
}), Se = /* @__PURE__ */ Wn(1, !1, {
  read: (e, t) => e.getUint8(t),
  write: (e, t) => e.setUint8(0, t)
}), rt = (e, t = !1) => {
  if (typeof t != "boolean")
    throw new Error(`bytes/le: expected boolean, got ${typeof t}`);
  const n = Ac(e), r = _t(e);
  return kt({
    size: typeof e == "number" ? e : void 0,
    encodeStream: (o, s) => {
      r || n.encodeStream(o, s.length), o.bytes(t ? $o(s) : s), r && o.bytes(e);
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
      return t ? $o(s) : s;
    },
    validate: (o) => {
      if (!_t(o))
        throw new Error(`bytes: invalid value ${o}`);
      return o;
    }
  });
};
function lf(e, t) {
  if (!Wt(t))
    throw new Error(`prefix: invalid inner value ${t}`);
  return Ae(rt(e), Ic(t));
}
const ws = (e, t = !1) => At(Ae(rt(e, t), Zu), (n) => {
  if (typeof n != "string")
    throw new Error(`expected string, got ${typeof n}`);
  return n;
}), df = (e, t = { isLE: !1, with0x: !1 }) => {
  let n = Ae(rt(e, t.isLE), $);
  const r = t.with0x;
  if (typeof r != "boolean")
    throw new Error(`hex/with0x: expected boolean, got ${typeof r}`);
  return r && (n = Ae(n, {
    encode: (o) => `0x${o}`,
    decode: (o) => {
      if (!o.startsWith("0x"))
        throw new Error("hex(with0x=true).encode input should start with 0x");
      return o.slice(2);
    }
  })), n;
};
function Ae(e, t) {
  if (!Wt(e))
    throw new Error(`apply: invalid inner value ${e}`);
  if (!Gr(t))
    throw new Error(`apply: invalid base value ${e}`);
  return kt({
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
const hf = (e, t = !1) => {
  if (!_t(e))
    throw new Error(`flag/flagValue: expected Uint8Array, got ${typeof e}`);
  if (typeof t != "boolean")
    throw new Error(`flag/xor: expected boolean, got ${typeof t}`);
  return kt({
    size: e.length,
    encodeStream: (n, r) => {
      !!r !== t && n.bytes(e);
    },
    decodeStream: (n) => {
      let r = n.leftBytes >= e.length;
      return r && (r = rn(n.bytes(e.length, !0), e), r && n.bytes(e.length)), r !== t;
    },
    validate: (n) => {
      if (n !== void 0 && typeof n != "boolean")
        throw new Error(`flag: expected boolean value or undefined, got ${typeof n}`);
      return n;
    }
  });
};
function pf(e, t, n) {
  if (!Wt(t))
    throw new Error(`flagged: invalid inner value ${t}`);
  return kt({
    encodeStream: (r, o) => {
      fe.resolve(r.stack, e) && t.encodeStream(r, o);
    },
    decodeStream: (r) => {
      let o = !1;
      if (o = !!fe.resolve(r.stack, e), o)
        return t.decodeStream(r);
    }
  });
}
function ys(e, t, n = !0) {
  if (!Wt(e))
    throw new Error(`magic: invalid inner value ${e}`);
  if (typeof n != "boolean")
    throw new Error(`magic: expected boolean, got ${typeof n}`);
  return kt({
    size: e.size,
    encodeStream: (r, o) => e.encodeStream(r, t),
    decodeStream: (r) => {
      const o = e.decodeStream(r);
      if (n && typeof o != "object" && o !== t || _t(t) && !rn(t, o))
        throw r.err(`magic: invalid value: ${o} !== ${t}`);
    },
    validate: (r) => {
      if (r !== void 0)
        throw new Error(`magic: wrong value=${typeof r}`);
      return r;
    }
  });
}
function Oc(e) {
  let t = 0;
  for (const n of e) {
    if (n.size === void 0)
      return;
    if (!Jt(n.size))
      throw new Error(`sizeof: wrong element size=${t}`);
    t += n.size;
  }
  return t;
}
function pt(e) {
  if (!Fn(e))
    throw new Error(`struct: expected plain object, got ${e}`);
  for (const t in e)
    if (!Wt(e[t]))
      throw new Error(`struct: field ${t} is not CoderType`);
  return kt({
    size: Oc(Object.values(e)),
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
function gf(e) {
  if (!Array.isArray(e))
    throw new Error(`Packed.Tuple: got ${typeof e} instead of array`);
  for (let t = 0; t < e.length; t++)
    if (!Wt(e[t]))
      throw new Error(`tuple: field ${t} is not CoderType`);
  return kt({
    size: Oc(e),
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
function Tt(e, t) {
  if (!Wt(t))
    throw new Error(`array: invalid inner value ${t}`);
  const n = Ac(typeof e == "string" ? `../${e}` : e);
  return kt({
    size: typeof e == "number" && t.size ? e * t.size : void 0,
    encodeStream: (r, o) => {
      const s = r;
      s.pushObj(o, (i) => {
        _t(e) || n.encodeStream(r, o.length);
        for (let c = 0; c < o.length; c++)
          i(`${c}`, () => {
            const a = o[c], u = r.pos;
            if (t.encodeStream(r, a), _t(e)) {
              if (e.length > s.pos - u)
                return;
              const f = s.finish(!1).subarray(u, s.pos);
              if (rn(f.subarray(0, e.length), e))
                throw s.err(`array: inner element encoding same as separator. elm=${a} data=${f}`);
            }
          });
      }), _t(e) && r.bytes(e);
    },
    decodeStream: (r) => {
      const o = [];
      return r.pushObj(o, (s) => {
        if (e === null)
          for (let i = 0; !r.isEnd() && (s(`${i}`, () => o.push(t.decodeStream(r))), !(t.size && r.leftBytes < t.size)); i++)
            ;
        else if (_t(e))
          for (let i = 0; ; i++) {
            if (rn(r.bytes(e.length, !0), e)) {
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
function ms(e) {
  return e instanceof Uint8Array || ArrayBuffer.isView(e) && e.constructor.name === "Uint8Array";
}
function ke(e, t = "") {
  if (!Number.isSafeInteger(e) || e < 0) {
    const n = t && `"${t}" `;
    throw new Error(`${n}expected integer >= 0, got ${e}`);
  }
}
function G(e, t, n = "") {
  const r = ms(e), o = e?.length, s = t !== void 0;
  if (!r || s && o !== t) {
    const i = n && `"${n}" `, c = s ? ` of length ${t}` : "", a = r ? `length=${o}` : `type=${typeof e}`;
    throw new Error(i + "expected Uint8Array" + c + ", got " + a);
  }
  return e;
}
function $c(e) {
  if (typeof e != "function" || typeof e.create != "function")
    throw new Error("Hash must wrapped by utils.createHasher");
  ke(e.outputLen), ke(e.blockLen);
}
function yr(e, t = !0) {
  if (e.destroyed)
    throw new Error("Hash instance has been destroyed");
  if (t && e.finished)
    throw new Error("Hash#digest() has already been called");
}
function wf(e, t) {
  G(e, void 0, "digestInto() output");
  const n = t.outputLen;
  if (e.length < n)
    throw new Error('"digestInto() output" expected to be of length >=' + n);
}
function on(...e) {
  for (let t = 0; t < e.length; t++)
    e[t].fill(0);
}
function co(e) {
  return new DataView(e.buffer, e.byteOffset, e.byteLength);
}
function jt(e, t) {
  return e << 32 - t | e >>> t;
}
function jn(e, t) {
  return e << t | e >>> 32 - t >>> 0;
}
const Uc = /* @ts-ignore */ typeof Uint8Array.from([]).toHex == "function" && typeof Uint8Array.fromHex == "function", yf = /* @__PURE__ */ Array.from({ length: 256 }, (e, t) => t.toString(16).padStart(2, "0"));
function jr(e) {
  if (G(e), Uc)
    return e.toHex();
  let t = "";
  for (let n = 0; n < e.length; n++)
    t += yf[e[n]];
  return t;
}
const re = { _0: 48, _9: 57, A: 65, F: 70, a: 97, f: 102 };
function si(e) {
  if (e >= re._0 && e <= re._9)
    return e - re._0;
  if (e >= re.A && e <= re.F)
    return e - (re.A - 10);
  if (e >= re.a && e <= re.f)
    return e - (re.a - 10);
}
function mr(e) {
  if (typeof e != "string")
    throw new Error("hex string expected, got " + typeof e);
  if (Uc)
    return Uint8Array.fromHex(e);
  const t = e.length, n = t / 2;
  if (t % 2)
    throw new Error("hex string expected, got unpadded hex of length " + t);
  const r = new Uint8Array(n);
  for (let o = 0, s = 0; o < n; o++, s += 2) {
    const i = si(e.charCodeAt(s)), c = si(e.charCodeAt(s + 1));
    if (i === void 0 || c === void 0) {
      const a = e[s] + e[s + 1];
      throw new Error('hex string expected, got non-hex character "' + a + '" at index ' + s);
    }
    r[o] = i * 16 + c;
  }
  return r;
}
function Ft(...e) {
  let t = 0;
  for (let r = 0; r < e.length; r++) {
    const o = e[r];
    G(o), t += o.length;
  }
  const n = new Uint8Array(t);
  for (let r = 0, o = 0; r < e.length; r++) {
    const s = e[r];
    n.set(s, o), o += s.length;
  }
  return n;
}
function Rc(e, t = {}) {
  const n = (o, s) => e(s).update(o).digest(), r = e(void 0);
  return n.outputLen = r.outputLen, n.blockLen = r.blockLen, n.create = (o) => e(o), Object.assign(n, t), Object.freeze(n);
}
function zn(e = 32) {
  const t = typeof globalThis == "object" ? globalThis.crypto : null;
  if (typeof t?.getRandomValues != "function")
    throw new Error("crypto.getRandomValues must be defined");
  return t.getRandomValues(new Uint8Array(e));
}
const mf = (e) => ({
  oid: Uint8Array.from([6, 9, 96, 134, 72, 1, 101, 3, 4, 2, e])
});
function bf(e, t, n) {
  return e & t ^ ~e & n;
}
function Ef(e, t, n) {
  return e & t ^ e & n ^ t & n;
}
let Nc = class {
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
    this.blockLen = t, this.outputLen = n, this.padOffset = r, this.isLE = o, this.buffer = new Uint8Array(t), this.view = co(this.buffer);
  }
  update(t) {
    yr(this), G(t);
    const { view: n, buffer: r, blockLen: o } = this, s = t.length;
    for (let i = 0; i < s; ) {
      const c = Math.min(o - this.pos, s - i);
      if (c === o) {
        const a = co(t);
        for (; o <= s - i; i += o)
          this.process(a, i);
        continue;
      }
      r.set(t.subarray(i, i + c), this.pos), this.pos += c, i += c, this.pos === o && (this.process(n, 0), this.pos = 0);
    }
    return this.length += t.length, this.roundClean(), this;
  }
  digestInto(t) {
    yr(this), wf(t, this), this.finished = !0;
    const { buffer: n, view: r, blockLen: o, isLE: s } = this;
    let { pos: i } = this;
    n[i++] = 128, on(this.buffer.subarray(i)), this.padOffset > o - i && (this.process(r, 0), i = 0);
    for (let l = i; l < o; l++)
      n[l] = 0;
    r.setBigUint64(o - 8, BigInt(this.length * 8), s), this.process(r, 0);
    const c = co(t), a = this.outputLen;
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
};
const he = /* @__PURE__ */ Uint32Array.from([
  1779033703,
  3144134277,
  1013904242,
  2773480762,
  1359893119,
  2600822924,
  528734635,
  1541459225
]), xf = /* @__PURE__ */ Uint32Array.from([
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
]), pe = /* @__PURE__ */ new Uint32Array(64);
let Sf = class extends Nc {
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
      pe[l] = t.getUint32(n, !1);
    for (let l = 16; l < 64; l++) {
      const h = pe[l - 15], d = pe[l - 2], w = jt(h, 7) ^ jt(h, 18) ^ h >>> 3, g = jt(d, 17) ^ jt(d, 19) ^ d >>> 10;
      pe[l] = g + pe[l - 7] + w + pe[l - 16] | 0;
    }
    let { A: r, B: o, C: s, D: i, E: c, F: a, G: u, H: f } = this;
    for (let l = 0; l < 64; l++) {
      const h = jt(c, 6) ^ jt(c, 11) ^ jt(c, 25), d = f + h + bf(c, a, u) + xf[l] + pe[l] | 0, g = (jt(r, 2) ^ jt(r, 13) ^ jt(r, 22)) + Ef(r, o, s) | 0;
      f = u, u = a, a = c, c = i + d | 0, i = s, s = o, o = r, r = d + g | 0;
    }
    r = r + this.A | 0, o = o + this.B | 0, s = s + this.C | 0, i = i + this.D | 0, c = c + this.E | 0, a = a + this.F | 0, u = u + this.G | 0, f = f + this.H | 0, this.set(r, o, s, i, c, a, u, f);
  }
  roundClean() {
    on(pe);
  }
  destroy() {
    this.set(0, 0, 0, 0, 0, 0, 0, 0), on(this.buffer);
  }
}, vf = class extends Sf {
  // We cannot use array here since array allows indexing by variable
  // which means optimizer/compiler cannot use registers.
  A = he[0] | 0;
  B = he[1] | 0;
  C = he[2] | 0;
  D = he[3] | 0;
  E = he[4] | 0;
  F = he[5] | 0;
  G = he[6] | 0;
  H = he[7] | 0;
  constructor() {
    super(32);
  }
};
const wt = /* @__PURE__ */ Rc(
  () => new vf(),
  /* @__PURE__ */ mf(1)
);
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const bs = /* @__PURE__ */ BigInt(0), Uo = /* @__PURE__ */ BigInt(1);
function br(e, t = "") {
  if (typeof e != "boolean") {
    const n = t && `"${t}" `;
    throw new Error(n + "expected boolean, got type=" + typeof e);
  }
  return e;
}
function Lc(e) {
  if (typeof e == "bigint") {
    if (!fr(e))
      throw new Error("positive bigint expected, got " + e);
  } else
    ke(e);
  return e;
}
function Yn(e) {
  const t = Lc(e).toString(16);
  return t.length & 1 ? "0" + t : t;
}
function Cc(e) {
  if (typeof e != "string")
    throw new Error("hex string expected, got " + typeof e);
  return e === "" ? bs : BigInt("0x" + e);
}
function le(e) {
  return Cc(jr(e));
}
function _c(e) {
  return Cc(jr(Tf(G(e)).reverse()));
}
function Gn(e, t) {
  ke(t), e = Lc(e);
  const n = mr(e.toString(16).padStart(t * 2, "0"));
  if (n.length !== t)
    throw new Error("number too large");
  return n;
}
function Pc(e, t) {
  return Gn(e, t).reverse();
}
function Rn(e, t) {
  if (e.length !== t.length)
    return !1;
  let n = 0;
  for (let r = 0; r < e.length; r++)
    n |= e[r] ^ t[r];
  return n === 0;
}
function Tf(e) {
  return Uint8Array.from(e);
}
function Af(e) {
  return Uint8Array.from(e, (t, n) => {
    const r = t.charCodeAt(0);
    if (t.length !== 1 || r > 127)
      throw new Error(`string contains non-ASCII character "${e[n]}" with code ${r} at position ${n}`);
    return r;
  });
}
const fr = (e) => typeof e == "bigint" && bs <= e;
function kf(e, t, n) {
  return fr(e) && fr(t) && fr(n) && t <= e && e < n;
}
function Hc(e, t, n, r) {
  if (!kf(t, n, r))
    throw new Error("expected valid " + e + ": " + n + " <= n < " + r + ", got " + t);
}
function If(e) {
  let t;
  for (t = 0; e > bs; e >>= Uo, t += 1)
    ;
  return t;
}
const Es = (e) => (Uo << BigInt(e)) - Uo;
function Bf(e, t, n) {
  if (ke(e, "hashLen"), ke(t, "qByteLen"), typeof n != "function")
    throw new Error("hmacFn must be a function");
  const r = (y) => new Uint8Array(y), o = Uint8Array.of(), s = Uint8Array.of(0), i = Uint8Array.of(1), c = 1e3;
  let a = r(e), u = r(e), f = 0;
  const l = () => {
    a.fill(1), u.fill(0), f = 0;
  }, h = (...y) => n(u, Ft(a, ...y)), d = (y = o) => {
    u = h(s, y), a = h(), y.length !== 0 && (u = h(i, y), a = h());
  }, w = () => {
    if (f++ >= c)
      throw new Error("drbg: tried max amount of iterations");
    let y = 0;
    const S = [];
    for (; y < t; ) {
      a = h();
      const v = a.slice();
      S.push(v), y += a.length;
    }
    return Ft(...S);
  };
  return (y, S) => {
    l(), d(y);
    let v;
    for (; !(v = S(w())); )
      d();
    return l(), v;
  };
}
function xs(e, t = {}, n = {}) {
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
function ii(e) {
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
const St = /* @__PURE__ */ BigInt(0), bt = /* @__PURE__ */ BigInt(1), Le = /* @__PURE__ */ BigInt(2), Vc = /* @__PURE__ */ BigInt(3), Dc = /* @__PURE__ */ BigInt(4), Mc = /* @__PURE__ */ BigInt(5), Of = /* @__PURE__ */ BigInt(7), Kc = /* @__PURE__ */ BigInt(8), $f = /* @__PURE__ */ BigInt(9), Fc = /* @__PURE__ */ BigInt(16);
function Dt(e, t) {
  const n = e % t;
  return n >= St ? n : t + n;
}
function Nt(e, t, n) {
  let r = e;
  for (; t-- > St; )
    r *= r, r %= n;
  return r;
}
function ci(e, t) {
  if (e === St)
    throw new Error("invert: expected non-zero number");
  if (t <= St)
    throw new Error("invert: expected positive modulus, got " + t);
  let n = Dt(e, t), r = t, o = St, s = bt;
  for (; n !== St; ) {
    const c = r / n, a = r % n, u = o - s * c;
    r = n, n = a, o = s, s = u;
  }
  if (r !== bt)
    throw new Error("invert: does not exist");
  return Dt(o, t);
}
function Ss(e, t, n) {
  if (!e.eql(e.sqr(t), n))
    throw new Error("Cannot find square root");
}
function Wc(e, t) {
  const n = (e.ORDER + bt) / Dc, r = e.pow(t, n);
  return Ss(e, r, t), r;
}
function Uf(e, t) {
  const n = (e.ORDER - Mc) / Kc, r = e.mul(t, Le), o = e.pow(r, n), s = e.mul(t, o), i = e.mul(e.mul(s, Le), o), c = e.mul(s, e.sub(i, e.ONE));
  return Ss(e, c, t), c;
}
function Rf(e) {
  const t = Yr(e), n = zc(e), r = n(t, t.neg(t.ONE)), o = n(t, r), s = n(t, t.neg(r)), i = (e + Of) / Fc;
  return (c, a) => {
    let u = c.pow(a, i), f = c.mul(u, r);
    const l = c.mul(u, o), h = c.mul(u, s), d = c.eql(c.sqr(f), a), w = c.eql(c.sqr(l), a);
    u = c.cmov(u, f, d), f = c.cmov(h, l, w);
    const g = c.eql(c.sqr(f), a), y = c.cmov(u, f, g);
    return Ss(c, y, a), y;
  };
}
function zc(e) {
  if (e < Vc)
    throw new Error("sqrt is not defined for small field");
  let t = e - bt, n = 0;
  for (; t % Le === St; )
    t /= Le, n++;
  let r = Le;
  const o = Yr(e);
  for (; ai(o, r) === 1; )
    if (r++ > 1e3)
      throw new Error("Cannot find square root: probably non-prime P");
  if (n === 1)
    return Wc;
  let s = o.pow(r, t);
  const i = (t + bt) / Le;
  return function(a, u) {
    if (a.is0(u))
      return u;
    if (ai(a, u) !== 1)
      throw new Error("Cannot find square root");
    let f = n, l = a.mul(a.ONE, s), h = a.pow(u, t), d = a.pow(u, i);
    for (; !a.eql(h, a.ONE); ) {
      if (a.is0(h))
        return a.ZERO;
      let w = 1, g = a.sqr(h);
      for (; !a.eql(g, a.ONE); )
        if (w++, g = a.sqr(g), w === f)
          throw new Error("Cannot find square root");
      const y = bt << BigInt(f - w - 1), S = a.pow(l, y);
      f = w, l = a.sqr(S), h = a.mul(h, l), d = a.mul(d, S);
    }
    return d;
  };
}
function Nf(e) {
  return e % Dc === Vc ? Wc : e % Kc === Mc ? Uf : e % Fc === $f ? Rf(e) : zc(e);
}
const Lf = [
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
function Cf(e) {
  const t = {
    ORDER: "bigint",
    BYTES: "number",
    BITS: "number"
  }, n = Lf.reduce((r, o) => (r[o] = "function", r), t);
  return xs(e, n), e;
}
function _f(e, t, n) {
  if (n < St)
    throw new Error("invalid exponent, negatives unsupported");
  if (n === St)
    return e.ONE;
  if (n === bt)
    return t;
  let r = e.ONE, o = t;
  for (; n > St; )
    n & bt && (r = e.mul(r, o)), o = e.sqr(o), n >>= bt;
  return r;
}
function Gc(e, t, n = !1) {
  const r = new Array(t.length).fill(n ? e.ZERO : void 0), o = t.reduce((i, c, a) => e.is0(c) ? i : (r[a] = i, e.mul(i, c)), e.ONE), s = e.inv(o);
  return t.reduceRight((i, c, a) => e.is0(c) ? i : (r[a] = e.mul(i, r[a]), e.mul(i, c)), s), r;
}
function ai(e, t) {
  const n = (e.ORDER - bt) / Le, r = e.pow(t, n), o = e.eql(r, e.ONE), s = e.eql(r, e.ZERO), i = e.eql(r, e.neg(e.ONE));
  if (!o && !s && !i)
    throw new Error("invalid Legendre symbol result");
  return o ? 1 : s ? 0 : -1;
}
function Pf(e, t) {
  t !== void 0 && ke(t);
  const n = t !== void 0 ? t : e.toString(2).length, r = Math.ceil(n / 8);
  return { nBitLength: n, nByteLength: r };
}
let Hf = class {
  ORDER;
  BITS;
  BYTES;
  isLE;
  ZERO = St;
  ONE = bt;
  _lengths;
  _sqrt;
  // cached sqrt
  _mod;
  constructor(t, n = {}) {
    if (t <= St)
      throw new Error("invalid field: expected ORDER > 0, got " + t);
    let r;
    this.isLE = !1, n != null && typeof n == "object" && (typeof n.BITS == "number" && (r = n.BITS), typeof n.sqrt == "function" && (this.sqrt = n.sqrt), typeof n.isLE == "boolean" && (this.isLE = n.isLE), n.allowedLengths && (this._lengths = n.allowedLengths?.slice()), typeof n.modFromBytes == "boolean" && (this._mod = n.modFromBytes));
    const { nBitLength: o, nByteLength: s } = Pf(t, r);
    if (s > 2048)
      throw new Error("invalid field: expected ORDER of <= 2048 bytes");
    this.ORDER = t, this.BITS = o, this.BYTES = s, this._sqrt = void 0, Object.preventExtensions(this);
  }
  create(t) {
    return Dt(t, this.ORDER);
  }
  isValid(t) {
    if (typeof t != "bigint")
      throw new Error("invalid field element: expected bigint, got " + typeof t);
    return St <= t && t < this.ORDER;
  }
  is0(t) {
    return t === St;
  }
  // is valid and invertible
  isValidNot0(t) {
    return !this.is0(t) && this.isValid(t);
  }
  isOdd(t) {
    return (t & bt) === bt;
  }
  neg(t) {
    return Dt(-t, this.ORDER);
  }
  eql(t, n) {
    return t === n;
  }
  sqr(t) {
    return Dt(t * t, this.ORDER);
  }
  add(t, n) {
    return Dt(t + n, this.ORDER);
  }
  sub(t, n) {
    return Dt(t - n, this.ORDER);
  }
  mul(t, n) {
    return Dt(t * n, this.ORDER);
  }
  pow(t, n) {
    return _f(this, t, n);
  }
  div(t, n) {
    return Dt(t * ci(n, this.ORDER), this.ORDER);
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
    return ci(t, this.ORDER);
  }
  sqrt(t) {
    return this._sqrt || (this._sqrt = Nf(this.ORDER)), this._sqrt(this, t);
  }
  toBytes(t) {
    return this.isLE ? Pc(t, this.BYTES) : Gn(t, this.BYTES);
  }
  fromBytes(t, n = !1) {
    G(t);
    const { _lengths: r, BYTES: o, isLE: s, ORDER: i, _mod: c } = this;
    if (r) {
      if (!r.includes(t.length) || t.length > o)
        throw new Error("Field.fromBytes: expected " + r + " bytes, got " + t.length);
      const u = new Uint8Array(o);
      u.set(t, s ? 0 : u.length - t.length), t = u;
    }
    if (t.length !== o)
      throw new Error("Field.fromBytes: expected " + o + " bytes, got " + t.length);
    let a = s ? _c(t) : le(t);
    if (c && (a = Dt(a, i)), !n && !this.isValid(a))
      throw new Error("invalid field element: outside of range 0..ORDER");
    return a;
  }
  // TODO: we don't need it here, move out to separate fn
  invertBatch(t) {
    return Gc(this, t);
  }
  // We can't move this out because Fp6, Fp12 implement it
  // and it's unclear what to return in there.
  cmov(t, n, r) {
    return r ? n : t;
  }
};
function Yr(e, t = {}) {
  return new Hf(e, t);
}
function qc(e) {
  if (typeof e != "bigint")
    throw new Error("field order must be bigint");
  const t = e.toString(2).length;
  return Math.ceil(t / 8);
}
function jc(e) {
  const t = qc(e);
  return t + Math.ceil(t / 2);
}
function Yc(e, t, n = !1) {
  G(e);
  const r = e.length, o = qc(t), s = jc(t);
  if (r < 16 || r < s || r > 1024)
    throw new Error("expected " + s + "-1024 bytes of input, got " + r);
  const i = n ? _c(e) : le(e), c = Dt(i, t - bt) + bt;
  return n ? Pc(c, o) : Gn(c, o);
}
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const sn = /* @__PURE__ */ BigInt(0), Ce = /* @__PURE__ */ BigInt(1);
function Er(e, t) {
  const n = t.negate();
  return e ? n : t;
}
function ui(e, t) {
  const n = Gc(e.Fp, t.map((r) => r.Z));
  return t.map((r, o) => e.fromAffine(r.toAffine(n[o])));
}
function Zc(e, t) {
  if (!Number.isSafeInteger(e) || e <= 0 || e > t)
    throw new Error("invalid window size, expected [1.." + t + "], got W=" + e);
}
function ao(e, t) {
  Zc(e, t);
  const n = Math.ceil(t / e) + 1, r = 2 ** (e - 1), o = 2 ** e, s = Es(e), i = BigInt(e);
  return { windows: n, windowSize: r, mask: s, maxNumber: o, shiftBy: i };
}
function fi(e, t, n) {
  const { windowSize: r, mask: o, maxNumber: s, shiftBy: i } = n;
  let c = Number(e & o), a = e >> i;
  c > r && (c -= s, a += Ce);
  const u = t * r, f = u + Math.abs(c) - 1, l = c === 0, h = c < 0, d = t % 2 !== 0;
  return { nextN: a, offset: f, isZero: l, isNeg: h, isNegF: d, offsetF: u };
}
const uo = /* @__PURE__ */ new WeakMap(), Xc = /* @__PURE__ */ new WeakMap();
function fo(e) {
  return Xc.get(e) || 1;
}
function li(e) {
  if (e !== sn)
    throw new Error("invalid wNAF");
}
let Vf = class {
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
    for (; n > sn; )
      n & Ce && (r = r.add(o)), o = o.double(), n >>= Ce;
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
    const { windows: r, windowSize: o } = ao(n, this.bits), s = [];
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
    const i = ao(t, this.bits);
    for (let c = 0; c < i.windows; c++) {
      const { nextN: a, offset: u, isZero: f, isNeg: l, isNegF: h, offsetF: d } = fi(r, c, i);
      r = a, f ? s = s.add(Er(h, n[d])) : o = o.add(Er(l, n[u]));
    }
    return li(r), { p: o, f: s };
  }
  /**
   * Implements ec unsafe (non const-time) multiplication using precomputed tables and w-ary non-adjacent form.
   * @param acc accumulator point to add result of multiplication
   * @returns point
   */
  wNAFUnsafe(t, n, r, o = this.ZERO) {
    const s = ao(t, this.bits);
    for (let i = 0; i < s.windows && r !== sn; i++) {
      const { nextN: c, offset: a, isZero: u, isNeg: f } = fi(r, i, s);
      if (r = c, !u) {
        const l = n[a];
        o = o.add(f ? l.negate() : l);
      }
    }
    return li(r), o;
  }
  getPrecomputes(t, n, r) {
    let o = uo.get(n);
    return o || (o = this.precomputeWindow(n, t), t !== 1 && (typeof r == "function" && (o = r(o)), uo.set(n, o))), o;
  }
  cached(t, n, r) {
    const o = fo(t);
    return this.wNAF(o, this.getPrecomputes(o, t, r), n);
  }
  unsafe(t, n, r, o) {
    const s = fo(t);
    return s === 1 ? this._unsafeLadder(t, n, o) : this.wNAFUnsafe(s, this.getPrecomputes(s, t, r), n, o);
  }
  // We calculate precomputes for elliptic curve point multiplication
  // using windowed method. This specifies window size and
  // stores precomputed values. Usually only base point would be precomputed.
  createCache(t, n) {
    Zc(n, this.bits), Xc.set(t, n), uo.delete(t);
  }
  hasCache(t) {
    return fo(t) !== 1;
  }
};
function Df(e, t, n, r) {
  let o = t, s = e.ZERO, i = e.ZERO;
  for (; n > sn || r > sn; )
    n & Ce && (s = s.add(o)), r & Ce && (i = i.add(o)), o = o.double(), n >>= Ce, r >>= Ce;
  return { p1: s, p2: i };
}
function di(e, t, n) {
  if (t) {
    if (t.ORDER !== e)
      throw new Error("Field.ORDER must match order: Fp == p, Fn == n");
    return Cf(t), t;
  } else
    return Yr(e, { isLE: n });
}
function Mf(e, t, n = {}, r) {
  if (r === void 0 && (r = e === "edwards"), !t || typeof t != "object")
    throw new Error(`expected valid ${e} CURVE object`);
  for (const a of ["p", "n", "h"]) {
    const u = t[a];
    if (!(typeof u == "bigint" && u > sn))
      throw new Error(`CURVE.${a} must be positive bigint`);
  }
  const o = di(t.p, n.Fp, r), s = di(t.n, n.Fn, r), c = ["Gx", "Gy", "a", "b"];
  for (const a of c)
    if (!o.isValid(t[a]))
      throw new Error(`CURVE.${a} must be valid field element of CURVE.Fp`);
  return t = Object.freeze(Object.assign({}, t)), { CURVE: t, Fp: o, Fn: s };
}
function Qc(e, t) {
  return function(r) {
    const o = e(r);
    return { secretKey: o, publicKey: t(o) };
  };
}
let Jc = class {
  oHash;
  iHash;
  blockLen;
  outputLen;
  finished = !1;
  destroyed = !1;
  constructor(t, n) {
    if ($c(t), G(n, void 0, "key"), this.iHash = t.create(), typeof this.iHash.update != "function")
      throw new Error("Expected instance of class which extends utils.Hash");
    this.blockLen = this.iHash.blockLen, this.outputLen = this.iHash.outputLen;
    const r = this.blockLen, o = new Uint8Array(r);
    o.set(n.length > r ? t.create().update(n).digest() : n);
    for (let s = 0; s < o.length; s++)
      o[s] ^= 54;
    this.iHash.update(o), this.oHash = t.create();
    for (let s = 0; s < o.length; s++)
      o[s] ^= 106;
    this.oHash.update(o), on(o);
  }
  update(t) {
    return yr(this), this.iHash.update(t), this;
  }
  digestInto(t) {
    yr(this), G(t, this.outputLen, "output"), this.finished = !0, this.iHash.digestInto(t), this.oHash.update(t), this.oHash.digestInto(t), this.destroy();
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
};
const ta = (e, t, n) => new Jc(e, t).update(n).digest();
ta.create = (e, t) => new Jc(e, t);
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const hi = (e, t) => (e + (e >= 0 ? t : -t) / ea) / t;
function Kf(e, t, n) {
  const [[r, o], [s, i]] = t, c = hi(i * e, n), a = hi(-o * e, n);
  let u = e - c * r - a * s, f = -c * o - a * i;
  const l = u < ie, h = f < ie;
  l && (u = -u), h && (f = -f);
  const d = Es(Math.ceil(If(n) / 2)) + Ze;
  if (u < ie || u >= d || f < ie || f >= d)
    throw new Error("splitScalar (endomorphism): failed, k=" + e);
  return { k1neg: l, k1: u, k2neg: h, k2: f };
}
function Ro(e) {
  if (!["compact", "recovered", "der"].includes(e))
    throw new Error('Signature format must be "compact", "recovered", or "der"');
  return e;
}
function lo(e, t) {
  const n = {};
  for (let r of Object.keys(t))
    n[r] = e[r] === void 0 ? t[r] : e[r];
  return br(n.lowS, "lowS"), br(n.prehash, "prehash"), n.format !== void 0 && Ro(n.format), n;
}
let Ff = class extends Error {
  constructor(t = "") {
    super(t);
  }
};
const me = {
  // asn.1 DER encoding utils
  Err: Ff,
  // Basic building block is TLV (Tag-Length-Value)
  _tlv: {
    encode: (e, t) => {
      const { Err: n } = me;
      if (e < 0 || e > 256)
        throw new n("tlv.encode: wrong tag");
      if (t.length & 1)
        throw new n("tlv.encode: unpadded data");
      const r = t.length / 2, o = Yn(r);
      if (o.length / 2 & 128)
        throw new n("tlv.encode: long form length too big");
      const s = r > 127 ? Yn(o.length / 2 | 128) : "";
      return Yn(e) + s + o + t;
    },
    // v - value, l - left bytes (unparsed)
    decode(e, t) {
      const { Err: n } = me;
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
      const { Err: t } = me;
      if (e < ie)
        throw new t("integer: negative integers are not allowed");
      let n = Yn(e);
      if (Number.parseInt(n[0], 16) & 8 && (n = "00" + n), n.length & 1)
        throw new t("unexpected DER parsing assertion: unpadded hex");
      return n;
    },
    decode(e) {
      const { Err: t } = me;
      if (e[0] & 128)
        throw new t("invalid signature integer: negative");
      if (e[0] === 0 && !(e[1] & 128))
        throw new t("invalid signature integer: unnecessary leading zero");
      return le(e);
    }
  },
  toSig(e) {
    const { Err: t, _int: n, _tlv: r } = me, o = G(e, void 0, "signature"), { v: s, l: i } = r.decode(48, o);
    if (i.length)
      throw new t("invalid signature: left bytes after parsing");
    const { v: c, l: a } = r.decode(2, s), { v: u, l: f } = r.decode(2, a);
    if (f.length)
      throw new t("invalid signature: left bytes after parsing");
    return { r: n.decode(c), s: n.decode(u) };
  },
  hexFromSig(e) {
    const { _tlv: t, _int: n } = me, r = t.encode(2, n.encode(e.r)), o = t.encode(2, n.encode(e.s)), s = r + o;
    return t.encode(48, s);
  }
}, ie = BigInt(0), Ze = BigInt(1), ea = BigInt(2), Zn = BigInt(3), Wf = BigInt(4);
function zf(e, t = {}) {
  const n = Mf("weierstrass", e, t), { Fp: r, Fn: o } = n;
  let s = n.CURVE;
  const { h: i, n: c } = s;
  xs(t, {}, {
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
  const u = ra(r, o);
  function f() {
    if (!r.isOdd)
      throw new Error("compression is not supported: Field does not have .isOdd()");
  }
  function l(_, b, m) {
    const { x: p, y: E } = b.toAffine(), A = r.toBytes(p);
    if (br(m, "isCompressed"), m) {
      f();
      const I = !r.isOdd(E);
      return Ft(na(I), A);
    } else
      return Ft(Uint8Array.of(4), A, r.toBytes(E));
  }
  function h(_) {
    G(_, void 0, "Point");
    const { publicKey: b, publicKeyUncompressed: m } = u, p = _.length, E = _[0], A = _.subarray(1);
    if (p === b && (E === 2 || E === 3)) {
      const I = r.fromBytes(A);
      if (!r.isValid(I))
        throw new Error("bad point: is not on curve, wrong x");
      const k = g(I);
      let T;
      try {
        T = r.sqrt(k);
      } catch (F) {
        const H = F instanceof Error ? ": " + F.message : "";
        throw new Error("bad point: is not on curve, sqrt error" + H);
      }
      f();
      const B = r.isOdd(T);
      return (E & 1) === 1 !== B && (T = r.neg(T)), { x: I, y: T };
    } else if (p === m && E === 4) {
      const I = r.BYTES, k = r.fromBytes(A.subarray(0, I)), T = r.fromBytes(A.subarray(I, I * 2));
      if (!y(k, T))
        throw new Error("bad point: is not on curve");
      return { x: k, y: T };
    } else
      throw new Error(`bad point: got length ${p}, expected compressed=${b} or uncompressed=${m}`);
  }
  const d = t.toBytes || l, w = t.fromBytes || h;
  function g(_) {
    const b = r.sqr(_), m = r.mul(b, _);
    return r.add(r.add(m, r.mul(_, s.a)), s.b);
  }
  function y(_, b) {
    const m = r.sqr(b), p = g(_);
    return r.eql(m, p);
  }
  if (!y(s.Gx, s.Gy))
    throw new Error("bad curve params: generator point");
  const S = r.mul(r.pow(s.a, Zn), Wf), v = r.mul(r.sqr(s.b), BigInt(27));
  if (r.is0(r.add(S, v)))
    throw new Error("bad curve params: a or b");
  function O(_, b, m = !1) {
    if (!r.isValid(b) || m && r.is0(b))
      throw new Error(`bad point coordinate ${_}`);
    return b;
  }
  function N(_) {
    if (!(_ instanceof C))
      throw new Error("Weierstrass Point expected");
  }
  function U(_) {
    if (!a || !a.basises)
      throw new Error("no endo");
    return Kf(_, a.basises, o.ORDER);
  }
  const W = ii((_, b) => {
    const { X: m, Y: p, Z: E } = _;
    if (r.eql(E, r.ONE))
      return { x: m, y: p };
    const A = _.is0();
    b == null && (b = A ? r.ONE : r.inv(E));
    const I = r.mul(m, b), k = r.mul(p, b), T = r.mul(E, b);
    if (A)
      return { x: r.ZERO, y: r.ZERO };
    if (!r.eql(T, r.ONE))
      throw new Error("invZ was invalid");
    return { x: I, y: k };
  }), x = ii((_) => {
    if (_.is0()) {
      if (t.allowInfinityPoint && !r.is0(_.Y))
        return;
      throw new Error("bad point: ZERO");
    }
    const { x: b, y: m } = _.toAffine();
    if (!r.isValid(b) || !r.isValid(m))
      throw new Error("bad point: x or y not field elements");
    if (!y(b, m))
      throw new Error("bad point: equation left != right");
    if (!_.isTorsionFree())
      throw new Error("bad point: not in prime-order subgroup");
    return !0;
  });
  function Q(_, b, m, p, E) {
    return m = new C(r.mul(m.X, _), m.Y, m.Z), b = Er(p, b), m = Er(E, m), b.add(m);
  }
  class C {
    // base / generator point
    static BASE = new C(s.Gx, s.Gy, r.ONE);
    // zero / infinity / identity point
    static ZERO = new C(r.ZERO, r.ONE, r.ZERO);
    // 0, 1, 0
    // math field
    static Fp = r;
    // scalar field
    static Fn = o;
    X;
    Y;
    Z;
    /** Does NOT validate if the point is valid. Use `.assertValidity()`. */
    constructor(b, m, p) {
      this.X = O("x", b), this.Y = O("y", m, !0), this.Z = O("z", p), Object.freeze(this);
    }
    static CURVE() {
      return s;
    }
    /** Does NOT validate if the point is valid. Use `.assertValidity()`. */
    static fromAffine(b) {
      const { x: m, y: p } = b || {};
      if (!b || !r.isValid(m) || !r.isValid(p))
        throw new Error("invalid affine point");
      if (b instanceof C)
        throw new Error("projective point not allowed");
      return r.is0(m) && r.is0(p) ? C.ZERO : new C(m, p, r.ONE);
    }
    static fromBytes(b) {
      const m = C.fromAffine(w(G(b, void 0, "point")));
      return m.assertValidity(), m;
    }
    static fromHex(b) {
      return C.fromBytes(mr(b));
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
    precompute(b = 8, m = !0) {
      return gt.createCache(this, b), m || this.multiply(Zn), this;
    }
    // TODO: return `this`
    /** A point on curve is valid if it conforms to equation. */
    assertValidity() {
      x(this);
    }
    hasEvenY() {
      const { y: b } = this.toAffine();
      if (!r.isOdd)
        throw new Error("Field doesn't support isOdd");
      return !r.isOdd(b);
    }
    /** Compare one point to another. */
    equals(b) {
      N(b);
      const { X: m, Y: p, Z: E } = this, { X: A, Y: I, Z: k } = b, T = r.eql(r.mul(m, k), r.mul(A, E)), B = r.eql(r.mul(p, k), r.mul(I, E));
      return T && B;
    }
    /** Flips point to one corresponding to (x, -y) in Affine coordinates. */
    negate() {
      return new C(this.X, r.neg(this.Y), this.Z);
    }
    // Renes-Costello-Batina exception-free doubling formula.
    // There is 30% faster Jacobian formula, but it is not complete.
    // https://eprint.iacr.org/2015/1060, algorithm 3
    // Cost: 8M + 3S + 3*a + 2*b3 + 15add.
    double() {
      const { a: b, b: m } = s, p = r.mul(m, Zn), { X: E, Y: A, Z: I } = this;
      let k = r.ZERO, T = r.ZERO, B = r.ZERO, R = r.mul(E, E), F = r.mul(A, A), H = r.mul(I, I), L = r.mul(E, A);
      return L = r.add(L, L), B = r.mul(E, I), B = r.add(B, B), k = r.mul(b, B), T = r.mul(p, H), T = r.add(k, T), k = r.sub(F, T), T = r.add(F, T), T = r.mul(k, T), k = r.mul(L, k), B = r.mul(p, B), H = r.mul(b, H), L = r.sub(R, H), L = r.mul(b, L), L = r.add(L, B), B = r.add(R, R), R = r.add(B, R), R = r.add(R, H), R = r.mul(R, L), T = r.add(T, R), H = r.mul(A, I), H = r.add(H, H), R = r.mul(H, L), k = r.sub(k, R), B = r.mul(H, F), B = r.add(B, B), B = r.add(B, B), new C(k, T, B);
    }
    // Renes-Costello-Batina exception-free addition formula.
    // There is 30% faster Jacobian formula, but it is not complete.
    // https://eprint.iacr.org/2015/1060, algorithm 1
    // Cost: 12M + 0S + 3*a + 3*b3 + 23add.
    add(b) {
      N(b);
      const { X: m, Y: p, Z: E } = this, { X: A, Y: I, Z: k } = b;
      let T = r.ZERO, B = r.ZERO, R = r.ZERO;
      const F = s.a, H = r.mul(s.b, Zn);
      let L = r.mul(m, A), D = r.mul(p, I), q = r.mul(E, k), st = r.add(m, p), M = r.add(A, I);
      st = r.mul(st, M), M = r.add(L, D), st = r.sub(st, M), M = r.add(m, E);
      let Y = r.add(A, k);
      return M = r.mul(M, Y), Y = r.add(L, q), M = r.sub(M, Y), Y = r.add(p, E), T = r.add(I, k), Y = r.mul(Y, T), T = r.add(D, q), Y = r.sub(Y, T), R = r.mul(F, M), T = r.mul(H, q), R = r.add(T, R), T = r.sub(D, R), R = r.add(D, R), B = r.mul(T, R), D = r.add(L, L), D = r.add(D, L), q = r.mul(F, q), M = r.mul(H, M), D = r.add(D, q), q = r.sub(L, q), q = r.mul(F, q), M = r.add(M, q), L = r.mul(D, M), B = r.add(B, L), L = r.mul(Y, M), T = r.mul(st, T), T = r.sub(T, L), L = r.mul(st, D), R = r.mul(Y, R), R = r.add(R, L), new C(T, B, R);
    }
    subtract(b) {
      return this.add(b.negate());
    }
    is0() {
      return this.equals(C.ZERO);
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
    multiply(b) {
      const { endo: m } = t;
      if (!o.isValidNot0(b))
        throw new Error("invalid scalar: out of range");
      let p, E;
      const A = (I) => gt.cached(this, I, (k) => ui(C, k));
      if (m) {
        const { k1neg: I, k1: k, k2neg: T, k2: B } = U(b), { p: R, f: F } = A(k), { p: H, f: L } = A(B);
        E = F.add(L), p = Q(m.beta, R, H, I, T);
      } else {
        const { p: I, f: k } = A(b);
        p = I, E = k;
      }
      return ui(C, [p, E])[0];
    }
    /**
     * Non-constant-time multiplication. Uses double-and-add algorithm.
     * It's faster, but should only be used when you don't care about
     * an exposed secret key e.g. sig verification, which works over *public* keys.
     */
    multiplyUnsafe(b) {
      const { endo: m } = t, p = this;
      if (!o.isValid(b))
        throw new Error("invalid scalar: out of range");
      if (b === ie || p.is0())
        return C.ZERO;
      if (b === Ze)
        return p;
      if (gt.hasCache(this))
        return this.multiply(b);
      if (m) {
        const { k1neg: E, k1: A, k2neg: I, k2: k } = U(b), { p1: T, p2: B } = Df(C, p, A, k);
        return Q(m.beta, T, B, E, I);
      } else
        return gt.unsafe(p, b);
    }
    /**
     * Converts Projective point to affine (x, y) coordinates.
     * @param invertedZ Z^-1 (inverted zero) - optional, precomputation is useful for invertBatch
     */
    toAffine(b) {
      return W(this, b);
    }
    /**
     * Checks whether Point is free of torsion elements (is in prime subgroup).
     * Always torsion-free for cofactor=1 curves.
     */
    isTorsionFree() {
      const { isTorsionFree: b } = t;
      return i === Ze ? !0 : b ? b(C, this) : gt.unsafe(this, c).is0();
    }
    clearCofactor() {
      const { clearCofactor: b } = t;
      return i === Ze ? this : b ? b(C, this) : this.multiplyUnsafe(i);
    }
    isSmallOrder() {
      return this.multiplyUnsafe(i).is0();
    }
    toBytes(b = !0) {
      return br(b, "isCompressed"), this.assertValidity(), d(C, this, b);
    }
    toHex(b = !0) {
      return jr(this.toBytes(b));
    }
    toString() {
      return `<Point ${this.is0() ? "ZERO" : this.toHex()}>`;
    }
  }
  const Ht = o.BITS, gt = new Vf(C, t.endo ? Math.ceil(Ht / 2) : Ht);
  return C.BASE.precompute(8), C;
}
function na(e) {
  return Uint8Array.of(e ? 2 : 3);
}
function ra(e, t) {
  return {
    secretKey: t.BYTES,
    publicKey: 1 + e.BYTES,
    publicKeyUncompressed: 1 + 2 * e.BYTES,
    publicKeyHasPrefix: !0,
    signature: 2 * t.BYTES
  };
}
function Gf(e, t = {}) {
  const { Fn: n } = e, r = t.randomBytes || zn, o = Object.assign(ra(e.Fp, n), { seed: jc(n.ORDER) });
  function s(d) {
    try {
      const w = n.fromBytes(d);
      return n.isValidNot0(w);
    } catch {
      return !1;
    }
  }
  function i(d, w) {
    const { publicKey: g, publicKeyUncompressed: y } = o;
    try {
      const S = d.length;
      return w === !0 && S !== g || w === !1 && S !== y ? !1 : !!e.fromBytes(d);
    } catch {
      return !1;
    }
  }
  function c(d = r(o.seed)) {
    return Yc(G(d, o.seed, "seed"), n.ORDER);
  }
  function a(d, w = !0) {
    return e.BASE.multiply(n.fromBytes(d)).toBytes(w);
  }
  function u(d) {
    const { secretKey: w, publicKey: g, publicKeyUncompressed: y } = o;
    if (!ms(d) || "_lengths" in n && n._lengths || w === g)
      return;
    const S = G(d, void 0, "key").length;
    return S === g || S === y;
  }
  function f(d, w, g = !0) {
    if (u(d) === !0)
      throw new Error("first arg must be private key");
    if (u(w) === !1)
      throw new Error("second arg must be public key");
    const y = n.fromBytes(d);
    return e.fromBytes(w).multiply(y).toBytes(g);
  }
  const l = {
    isValidSecretKey: s,
    isValidPublicKey: i,
    randomSecretKey: c
  }, h = Qc(c, a);
  return Object.freeze({ getPublicKey: a, getSharedSecret: f, keygen: h, Point: e, utils: l, lengths: o });
}
function qf(e, t, n = {}) {
  $c(t), xs(n, {}, {
    hmac: "function",
    lowS: "boolean",
    randomBytes: "function",
    bits2int: "function",
    bits2int_modN: "function"
  }), n = Object.assign({}, n);
  const r = n.randomBytes || zn, o = n.hmac || ((m, p) => ta(t, m, p)), { Fp: s, Fn: i } = e, { ORDER: c, BITS: a } = i, { keygen: u, getPublicKey: f, getSharedSecret: l, utils: h, lengths: d } = Gf(e, n), w = {
    prehash: !0,
    lowS: typeof n.lowS == "boolean" ? n.lowS : !0,
    format: "compact",
    extraEntropy: !1
  }, g = c * ea < s.ORDER;
  function y(m) {
    const p = c >> Ze;
    return m > p;
  }
  function S(m, p) {
    if (!i.isValidNot0(p))
      throw new Error(`invalid signature ${m}: out of range 1..Point.Fn.ORDER`);
    return p;
  }
  function v() {
    if (g)
      throw new Error('"recovered" sig type is not supported for cofactor >2 curves');
  }
  function O(m, p) {
    Ro(p);
    const E = d.signature, A = p === "compact" ? E : p === "recovered" ? E + 1 : void 0;
    return G(m, A);
  }
  class N {
    r;
    s;
    recovery;
    constructor(p, E, A) {
      if (this.r = S("r", p), this.s = S("s", E), A != null) {
        if (v(), ![0, 1, 2, 3].includes(A))
          throw new Error("invalid recovery id");
        this.recovery = A;
      }
      Object.freeze(this);
    }
    static fromBytes(p, E = w.format) {
      O(p, E);
      let A;
      if (E === "der") {
        const { r: B, s: R } = me.toSig(G(p));
        return new N(B, R);
      }
      E === "recovered" && (A = p[0], E = "compact", p = p.subarray(1));
      const I = d.signature / 2, k = p.subarray(0, I), T = p.subarray(I, I * 2);
      return new N(i.fromBytes(k), i.fromBytes(T), A);
    }
    static fromHex(p, E) {
      return this.fromBytes(mr(p), E);
    }
    assertRecovery() {
      const { recovery: p } = this;
      if (p == null)
        throw new Error("invalid recovery id: must be present");
      return p;
    }
    addRecoveryBit(p) {
      return new N(this.r, this.s, p);
    }
    recoverPublicKey(p) {
      const { r: E, s: A } = this, I = this.assertRecovery(), k = I === 2 || I === 3 ? E + c : E;
      if (!s.isValid(k))
        throw new Error("invalid recovery id: sig.r+curve.n != R.x");
      const T = s.toBytes(k), B = e.fromBytes(Ft(na((I & 1) === 0), T)), R = i.inv(k), F = W(G(p, void 0, "msgHash")), H = i.create(-F * R), L = i.create(A * R), D = e.BASE.multiplyUnsafe(H).add(B.multiplyUnsafe(L));
      if (D.is0())
        throw new Error("invalid recovery: point at infinify");
      return D.assertValidity(), D;
    }
    // Signatures should be low-s, to prevent malleability.
    hasHighS() {
      return y(this.s);
    }
    toBytes(p = w.format) {
      if (Ro(p), p === "der")
        return mr(me.hexFromSig(this));
      const { r: E, s: A } = this, I = i.toBytes(E), k = i.toBytes(A);
      return p === "recovered" ? (v(), Ft(Uint8Array.of(this.assertRecovery()), I, k)) : Ft(I, k);
    }
    toHex(p) {
      return jr(this.toBytes(p));
    }
  }
  const U = n.bits2int || function(p) {
    if (p.length > 8192)
      throw new Error("input is too large");
    const E = le(p), A = p.length * 8 - a;
    return A > 0 ? E >> BigInt(A) : E;
  }, W = n.bits2int_modN || function(p) {
    return i.create(U(p));
  }, x = Es(a);
  function Q(m) {
    return Hc("num < 2^" + a, m, ie, x), i.toBytes(m);
  }
  function C(m, p) {
    return G(m, void 0, "message"), p ? G(t(m), void 0, "prehashed message") : m;
  }
  function Ht(m, p, E) {
    const { lowS: A, prehash: I, extraEntropy: k } = lo(E, w);
    m = C(m, I);
    const T = W(m), B = i.fromBytes(p);
    if (!i.isValidNot0(B))
      throw new Error("invalid private key");
    const R = [Q(B), Q(T)];
    if (k != null && k !== !1) {
      const D = k === !0 ? r(d.secretKey) : k;
      R.push(G(D, void 0, "extraEntropy"));
    }
    const F = Ft(...R), H = T;
    function L(D) {
      const q = U(D);
      if (!i.isValidNot0(q))
        return;
      const st = i.inv(q), M = e.BASE.multiply(q).toAffine(), Y = i.create(M.x);
      if (Y === ie)
        return;
      const ne = i.create(st * i.create(H + Y * B));
      if (ne === ie)
        return;
      let mn = (M.x === Y ? 0 : 2) | Number(M.y & Ze), bn = ne;
      return A && y(ne) && (bn = i.neg(ne), mn ^= 1), new N(Y, bn, g ? void 0 : mn);
    }
    return { seed: F, k2sig: L };
  }
  function gt(m, p, E = {}) {
    const { seed: A, k2sig: I } = Ht(m, p, E);
    return Bf(t.outputLen, i.BYTES, o)(A, I).toBytes(E.format);
  }
  function _(m, p, E, A = {}) {
    const { lowS: I, prehash: k, format: T } = lo(A, w);
    if (E = G(E, void 0, "publicKey"), p = C(p, k), !ms(m)) {
      const B = m instanceof N ? ", use sig.toBytes()" : "";
      throw new Error("verify expects Uint8Array signature" + B);
    }
    O(m, T);
    try {
      const B = N.fromBytes(m, T), R = e.fromBytes(E);
      if (I && B.hasHighS())
        return !1;
      const { r: F, s: H } = B, L = W(p), D = i.inv(H), q = i.create(L * D), st = i.create(F * D), M = e.BASE.multiplyUnsafe(q).add(R.multiplyUnsafe(st));
      return M.is0() ? !1 : i.create(M.x) === F;
    } catch {
      return !1;
    }
  }
  function b(m, p, E = {}) {
    const { prehash: A } = lo(E, w);
    return p = C(p, A), N.fromBytes(m, "recovered").recoverPublicKey(p).toBytes();
  }
  return Object.freeze({
    keygen: u,
    getPublicKey: f,
    getSharedSecret: l,
    utils: h,
    lengths: d,
    Point: e,
    sign: gt,
    verify: _,
    recoverPublicKey: b,
    Signature: N,
    hash: t
  });
}
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const Zr = {
  p: BigInt("0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffefffffc2f"),
  n: BigInt("0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141"),
  h: BigInt(1),
  a: BigInt(0),
  b: BigInt(7),
  Gx: BigInt("0x79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798"),
  Gy: BigInt("0x483ada7726a3c4655da4fbfc0e1108a8fd17b448a68554199c47d08ffb10d4b8")
}, jf = {
  beta: BigInt("0x7ae96a2b657c07106e64479eac3434e99cf0497512f58995c1396c28719501ee"),
  basises: [
    [BigInt("0x3086d221a7d46bcde86c90e49284eb15"), -BigInt("0xe4437ed6010e88286f547fa90abfe4c3")],
    [BigInt("0x114ca50f7a8e2f3f657c1108d9d44cfd8"), BigInt("0x3086d221a7d46bcde86c90e49284eb15")]
  ]
}, Yf = /* @__PURE__ */ BigInt(0), No = /* @__PURE__ */ BigInt(2);
function Zf(e) {
  const t = Zr.p, n = BigInt(3), r = BigInt(6), o = BigInt(11), s = BigInt(22), i = BigInt(23), c = BigInt(44), a = BigInt(88), u = e * e * e % t, f = u * u * e % t, l = Nt(f, n, t) * f % t, h = Nt(l, n, t) * f % t, d = Nt(h, No, t) * u % t, w = Nt(d, o, t) * d % t, g = Nt(w, s, t) * w % t, y = Nt(g, c, t) * g % t, S = Nt(y, a, t) * y % t, v = Nt(S, c, t) * g % t, O = Nt(v, n, t) * f % t, N = Nt(O, i, t) * w % t, U = Nt(N, r, t) * u % t, W = Nt(U, No, t);
  if (!xr.eql(xr.sqr(W), e))
    throw new Error("Cannot find square root");
  return W;
}
const xr = Yr(Zr.p, { sqrt: Zf }), ze = /* @__PURE__ */ zf(Zr, {
  Fp: xr,
  endo: jf
}), xe = /* @__PURE__ */ qf(ze, wt), pi = {};
function Sr(e, ...t) {
  let n = pi[e];
  if (n === void 0) {
    const r = wt(Af(e));
    n = Ft(r, r), pi[e] = n;
  }
  return wt(Ft(n, ...t));
}
const vs = (e) => e.toBytes(!0).slice(1), Ts = (e) => e % No === Yf;
function Lo(e) {
  const { Fn: t, BASE: n } = ze, r = t.fromBytes(e), o = n.multiply(r);
  return { scalar: Ts(o.y) ? r : t.neg(r), bytes: vs(o) };
}
function oa(e) {
  const t = xr;
  if (!t.isValidNot0(e))
    throw new Error("invalid x: Fail if x ≥ p");
  const n = t.create(e * e), r = t.create(n * e + BigInt(7));
  let o = t.sqrt(r);
  Ts(o) || (o = t.neg(o));
  const s = ze.fromAffine({ x: e, y: o });
  return s.assertValidity(), s;
}
const kn = le;
function sa(...e) {
  return ze.Fn.create(kn(Sr("BIP0340/challenge", ...e)));
}
function gi(e) {
  return Lo(e).bytes;
}
function Xf(e, t, n = zn(32)) {
  const { Fn: r } = ze, o = G(e, void 0, "message"), { bytes: s, scalar: i } = Lo(t), c = G(n, 32, "auxRand"), a = r.toBytes(i ^ kn(Sr("BIP0340/aux", c))), u = Sr("BIP0340/nonce", a, s, o), { bytes: f, scalar: l } = Lo(u), h = sa(f, s, o), d = new Uint8Array(64);
  if (d.set(f, 0), d.set(r.toBytes(r.create(l + h * i)), 32), !ia(d, o, s))
    throw new Error("sign: Invalid signature produced");
  return d;
}
function ia(e, t, n) {
  const { Fp: r, Fn: o, BASE: s } = ze, i = G(e, 64, "signature"), c = G(t, void 0, "message"), a = G(n, 32, "publicKey");
  try {
    const u = oa(kn(a)), f = kn(i.subarray(0, 32));
    if (!r.isValidNot0(f))
      return !1;
    const l = kn(i.subarray(32, 64));
    if (!o.isValidNot0(l))
      return !1;
    const h = sa(o.toBytes(f), vs(u), c), d = s.multiplyUnsafe(l).add(u.multiplyUnsafe(o.neg(h))), { x: w, y: g } = d.toAffine();
    return !(d.is0() || !Ts(g) || w !== f);
  } catch {
    return !1;
  }
}
const de = /* @__PURE__ */ (() => {
  const n = (r = zn(48)) => Yc(r, Zr.n);
  return {
    keygen: Qc(n, gi),
    getPublicKey: gi,
    sign: Xf,
    verify: ia,
    Point: ze,
    utils: {
      randomSecretKey: n,
      taggedHash: Sr,
      lift_x: oa,
      pointToBytes: vs
    },
    lengths: {
      secretKey: 32,
      publicKey: 32,
      publicKeyHasPrefix: !1,
      signature: 64,
      seed: 48
    }
  };
})(), Qf = /* @__PURE__ */ Uint8Array.from([
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
]), ca = Uint8Array.from(new Array(16).fill(0).map((e, t) => t)), Jf = ca.map((e) => (9 * e + 5) % 16), aa = /* @__PURE__ */ (() => {
  const n = [[ca], [Jf]];
  for (let r = 0; r < 4; r++)
    for (let o of n)
      o.push(o[r].map((s) => Qf[s]));
  return n;
})(), ua = aa[0], fa = aa[1], la = /* @__PURE__ */ [
  [11, 14, 15, 12, 5, 8, 7, 9, 11, 13, 14, 15, 6, 7, 9, 8],
  [12, 13, 11, 15, 6, 9, 9, 7, 12, 15, 11, 13, 7, 8, 7, 7],
  [13, 15, 14, 11, 7, 7, 6, 8, 13, 14, 13, 12, 5, 5, 6, 9],
  [14, 11, 12, 14, 8, 6, 5, 5, 15, 12, 15, 14, 9, 9, 8, 6],
  [15, 12, 13, 13, 9, 5, 8, 6, 14, 11, 12, 11, 8, 6, 5, 5]
].map((e) => Uint8Array.from(e)), tl = /* @__PURE__ */ ua.map((e, t) => e.map((n) => la[t][n])), el = /* @__PURE__ */ fa.map((e, t) => e.map((n) => la[t][n])), nl = /* @__PURE__ */ Uint32Array.from([
  0,
  1518500249,
  1859775393,
  2400959708,
  2840853838
]), rl = /* @__PURE__ */ Uint32Array.from([
  1352829926,
  1548603684,
  1836072691,
  2053994217,
  0
]);
function wi(e, t, n, r) {
  return e === 0 ? t ^ n ^ r : e === 1 ? t & n | ~t & r : e === 2 ? (t | ~n) ^ r : e === 3 ? t & r | n & ~r : t ^ (n | ~r);
}
const Xn = /* @__PURE__ */ new Uint32Array(16);
class ol extends Nc {
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
    for (let d = 0; d < 16; d++, n += 4)
      Xn[d] = t.getUint32(n, !0);
    let r = this.h0 | 0, o = r, s = this.h1 | 0, i = s, c = this.h2 | 0, a = c, u = this.h3 | 0, f = u, l = this.h4 | 0, h = l;
    for (let d = 0; d < 5; d++) {
      const w = 4 - d, g = nl[d], y = rl[d], S = ua[d], v = fa[d], O = tl[d], N = el[d];
      for (let U = 0; U < 16; U++) {
        const W = jn(r + wi(d, s, c, u) + Xn[S[U]] + g, O[U]) + l | 0;
        r = l, l = u, u = jn(c, 10) | 0, c = s, s = W;
      }
      for (let U = 0; U < 16; U++) {
        const W = jn(o + wi(w, i, a, f) + Xn[v[U]] + y, N[U]) + h | 0;
        o = h, h = f, f = jn(a, 10) | 0, a = i, i = W;
      }
    }
    this.set(this.h1 + c + f | 0, this.h2 + u + h | 0, this.h3 + l + o | 0, this.h4 + r + i | 0, this.h0 + s + a | 0);
  }
  roundClean() {
    on(Xn);
  }
  destroy() {
    this.destroyed = !0, on(this.buffer), this.set(0, 0, 0, 0, 0);
  }
}
const sl = /* @__PURE__ */ Rc(() => new ol()), wn = xe.Point, yi = wn.Fn, da = wn.Fn.ORDER, qn = (e) => e % 2n === 0n, nt = hs.isBytes, Ee = hs.concatBytes, ct = hs.equalBytes, ha = (e) => sl(wt(e)), ge = (...e) => wt(wt(Ee(...e))), Co = de.utils.randomSecretKey, As = de.getPublicKey, pa = xe.getPublicKey, mi = (e) => e.r < da / 2n;
function il(e, t, n = !1) {
  let r = xe.Signature.fromBytes(xe.sign(e, t, { prehash: !1 }));
  if (n && !mi(r)) {
    const o = new Uint8Array(32);
    let s = 0;
    for (; !mi(r); )
      if (o.set(Z.encode(s++)), r = xe.Signature.fromBytes(xe.sign(e, t, { prehash: !1, extraEntropy: o })), s > 4294967295)
        throw new Error("lowR counter overflow: report the error");
  }
  return r.toBytes("der");
}
const bi = de.sign, ks = de.utils.taggedHash, Bt = {
  ecdsa: 0,
  schnorr: 1
};
function cn(e, t) {
  const n = e.length;
  if (t === Bt.ecdsa) {
    if (n === 32)
      throw new Error("Expected non-Schnorr key");
    return wn.fromBytes(e), e;
  } else if (t === Bt.schnorr) {
    if (n !== 32)
      throw new Error("Expected 32-byte Schnorr key");
    return de.utils.lift_x(le(e)), e;
  } else
    throw new Error("Unknown key type");
}
function ga(e, t) {
  const r = de.utils.taggedHash("TapTweak", e, t), o = le(r);
  if (o >= da)
    throw new Error("tweak higher than curve order");
  return o;
}
function cl(e, t = Uint8Array.of()) {
  const n = de.utils, r = le(e), o = wn.BASE.multiply(r), s = qn(o.y) ? r : yi.neg(r), i = n.pointToBytes(o), c = ga(i, t);
  return Gn(yi.add(s, c), 32);
}
function _o(e, t) {
  const n = de.utils, r = ga(e, t), s = n.lift_x(le(e)).add(wn.BASE.multiply(r)), i = qn(s.y) ? 0 : 1;
  return [n.pointToBytes(s), i];
}
const Is = wt(wn.BASE.toBytes(!1)), an = {
  bech32: "bc",
  pubKeyHash: 0,
  scriptHash: 5,
  wif: 128
}, Qn = {
  bech32: "tb",
  pubKeyHash: 111,
  scriptHash: 196,
  wif: 239
};
function vr(e, t) {
  if (!nt(e) || !nt(t))
    throw new Error(`cmp: wrong type a=${typeof e} b=${typeof t}`);
  const n = Math.min(e.length, t.length);
  for (let r = 0; r < n; r++)
    if (e[r] != t[r])
      return Math.sign(e[r] - t[r]);
  return Math.sign(e.length - t.length);
}
function wa(e) {
  const t = {};
  for (const n in e) {
    if (t[e[n]] !== void 0)
      throw new Error("duplicate key");
    t[e[n]] = n;
  }
  return t;
}
const lt = {
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
}, al = wa(lt);
function Bs(e = 6, t = !1) {
  return kt({
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
function ul(e, t = 4, n = !0) {
  if (typeof e == "number")
    return e;
  if (nt(e))
    try {
      const r = Bs(t, n).decode(e);
      return r > Number.MAX_SAFE_INTEGER ? void 0 : Number(r);
    } catch {
      return;
    }
}
const K = kt({
  encodeStream: (e, t) => {
    for (let n of t) {
      if (typeof n == "string") {
        if (lt[n] === void 0)
          throw new Error(`Unknown opcode=${n}`);
        e.byte(lt[n]);
        continue;
      } else if (typeof n == "number") {
        if (n === 0) {
          e.byte(0);
          continue;
        } else if (1 <= n && n <= 16) {
          e.byte(lt.OP_1 - 1 + n);
          continue;
        }
      }
      if (typeof n == "number" && (n = Bs().encode(BigInt(n))), !nt(n))
        throw new Error(`Wrong Script OP=${n} (${typeof n})`);
      const r = n.length;
      r < lt.PUSHDATA1 ? e.byte(r) : r <= 255 ? (e.byte(lt.PUSHDATA1), e.byte(r)) : r <= 65535 ? (e.byte(lt.PUSHDATA2), e.bytes(oi.encode(r))) : (e.byte(lt.PUSHDATA4), e.bytes(Z.encode(r))), e.bytes(n);
    }
  },
  decodeStream: (e) => {
    const t = [];
    for (; !e.isEnd(); ) {
      const n = e.byte();
      if (lt.OP_0 < n && n <= lt.PUSHDATA4) {
        let r;
        if (n < lt.PUSHDATA1)
          r = n;
        else if (n === lt.PUSHDATA1)
          r = Se.decodeStream(e);
        else if (n === lt.PUSHDATA2)
          r = oi.decodeStream(e);
        else if (n === lt.PUSHDATA4)
          r = Z.decodeStream(e);
        else
          throw new Error("Should be not possible");
        t.push(e.bytes(r));
      } else if (n === 0)
        t.push(0);
      else if (lt.OP_1 <= n && n <= lt.OP_16)
        t.push(n - (lt.OP_1 - 1));
      else {
        const r = al[n];
        if (r === void 0)
          throw new Error(`Unknown opcode=${n.toString(16)}`);
        t.push(r);
      }
    }
    return t;
  }
}), Ei = {
  253: [253, 2, 253n, 65535n],
  254: [254, 4, 65536n, 4294967295n],
  255: [255, 8, 4294967296n, 18446744073709551615n]
}, Xr = kt({
  encodeStream: (e, t) => {
    if (typeof t == "number" && (t = BigInt(t)), 0n <= t && t <= 252n)
      return e.byte(Number(t));
    for (const [n, r, o, s] of Object.values(Ei))
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
    const [n, r, o] = Ei[t];
    let s = 0n;
    for (let i = 0; i < r; i++)
      s |= BigInt(e.byte()) << 8n * BigInt(i);
    if (s < o)
      throw e.err(`Wrong CompactSize(${8 * r})`);
    return s;
  }
}), zt = Ae(Xr, qr.numberBigint), Kt = rt(Xr), Nn = Tt(zt, Kt), Tr = (e) => Tt(Xr, e), ya = pt({
  txid: rt(32, !0),
  // hash(prev_tx),
  index: Z,
  // output number of previous tx
  finalScriptSig: Kt,
  // btc merges input and output script, executes it. If ok = tx passes
  sequence: Z
  // ?
}), _e = pt({ amount: ur, script: Kt }), fl = pt({
  version: je,
  segwitFlag: hf(new Uint8Array([0, 1])),
  inputs: Tr(ya),
  outputs: Tr(_e),
  witnesses: pf("segwitFlag", Tt("inputs/length", Nn)),
  // < 500000000	Block number at which this transaction is unlocked
  // >= 500000000	UNIX timestamp at which this transaction is unlocked
  // Handled as part of PSBTv2
  lockTime: Z
});
function ll(e) {
  if (e.segwitFlag && e.witnesses && !e.witnesses.length)
    throw new Error("Segwit flag with empty witnesses array");
  return e;
}
const Xe = At(fl, ll), An = pt({
  version: je,
  inputs: Tr(ya),
  outputs: Tr(_e),
  lockTime: Z
}), Po = At(rt(null), (e) => cn(e, Bt.ecdsa)), Ar = At(rt(32), (e) => cn(e, Bt.schnorr)), xi = At(rt(null), (e) => {
  if (e.length !== 64 && e.length !== 65)
    throw new Error("Schnorr signature should be 64 or 65 bytes long");
  return e;
}), Qr = pt({
  fingerprint: ff,
  path: Tt(null, Z)
}), ma = pt({
  hashes: Tt(zt, rt(32)),
  der: Qr
}), dl = rt(78), hl = pt({ pubKey: Ar, leafHash: rt(32) }), pl = pt({
  version: Se,
  // With parity :(
  internalKey: rt(32),
  merklePath: Tt(null, rt(32))
}), Xt = At(pl, (e) => {
  if (e.merklePath.length > 128)
    throw new Error("TaprootControlBlock: merklePath should be of length 0..128 (inclusive)");
  return e;
}), gl = Tt(null, pt({
  depth: Se,
  version: Se,
  script: Kt
})), it = rt(null), Si = rt(20), xn = rt(32), Os = {
  unsignedTx: [0, !1, An, [0], [0], !1],
  xpub: [1, dl, Qr, [], [0, 2], !1],
  txVersion: [2, !1, Z, [2], [2], !1],
  fallbackLocktime: [3, !1, Z, [], [2], !1],
  inputCount: [4, !1, zt, [2], [2], !1],
  outputCount: [5, !1, zt, [2], [2], !1],
  txModifiable: [6, !1, Se, [], [2], !1],
  // TODO: bitfield
  version: [251, !1, Z, [], [0, 2], !1],
  proprietary: [252, it, it, [], [0, 2], !1]
}, Jr = {
  nonWitnessUtxo: [0, !1, Xe, [], [0, 2], !1],
  witnessUtxo: [1, !1, _e, [], [0, 2], !1],
  partialSig: [2, Po, it, [], [0, 2], !1],
  sighashType: [3, !1, Z, [], [0, 2], !1],
  redeemScript: [4, !1, it, [], [0, 2], !1],
  witnessScript: [5, !1, it, [], [0, 2], !1],
  bip32Derivation: [6, Po, Qr, [], [0, 2], !1],
  finalScriptSig: [7, !1, it, [], [0, 2], !1],
  finalScriptWitness: [8, !1, Nn, [], [0, 2], !1],
  porCommitment: [9, !1, it, [], [0, 2], !1],
  ripemd160: [10, Si, it, [], [0, 2], !1],
  sha256: [11, xn, it, [], [0, 2], !1],
  hash160: [12, Si, it, [], [0, 2], !1],
  hash256: [13, xn, it, [], [0, 2], !1],
  txid: [14, !1, xn, [2], [2], !0],
  index: [15, !1, Z, [2], [2], !0],
  sequence: [16, !1, Z, [], [2], !0],
  requiredTimeLocktime: [17, !1, Z, [], [2], !1],
  requiredHeightLocktime: [18, !1, Z, [], [2], !1],
  tapKeySig: [19, !1, xi, [], [0, 2], !1],
  tapScriptSig: [20, hl, xi, [], [0, 2], !1],
  tapLeafScript: [21, Xt, it, [], [0, 2], !1],
  tapBip32Derivation: [22, xn, ma, [], [0, 2], !1],
  tapInternalKey: [23, !1, Ar, [], [0, 2], !1],
  tapMerkleRoot: [24, !1, xn, [], [0, 2], !1],
  proprietary: [252, it, it, [], [0, 2], !1]
}, wl = [
  "txid",
  "sequence",
  "index",
  "witnessUtxo",
  "nonWitnessUtxo",
  "finalScriptSig",
  "finalScriptWitness",
  "unknown"
], yl = [
  "partialSig",
  "finalScriptSig",
  "finalScriptWitness",
  "tapKeySig",
  "tapScriptSig"
], Ln = {
  redeemScript: [0, !1, it, [], [0, 2], !1],
  witnessScript: [1, !1, it, [], [0, 2], !1],
  bip32Derivation: [2, Po, Qr, [], [0, 2], !1],
  amount: [3, !1, af, [2], [2], !0],
  script: [4, !1, it, [2], [2], !0],
  tapInternalKey: [5, !1, Ar, [], [0, 2], !1],
  tapTree: [6, !1, gl, [], [0, 2], !1],
  tapBip32Derivation: [7, Ar, ma, [], [0, 2], !1],
  proprietary: [252, it, it, [], [0, 2], !1]
}, ml = [], vi = Tt(vc, pt({
  //  <key> := <keylen> <keytype> <keydata> WHERE keylen = len(keytype)+len(keydata)
  key: lf(zt, pt({ type: zt, key: rt(null) })),
  //  <value> := <valuelen> <valuedata>
  value: rt(zt)
}));
function Ho(e) {
  const [t, n, r, o, s, i] = e;
  return { type: t, kc: n, vc: r, reqInc: o, allowInc: s, silentIgnore: i };
}
pt({ type: zt, key: rt(null) });
function $s(e) {
  const t = {};
  for (const n in e) {
    const [r, o, s] = e[n];
    t[r] = [n, o, s];
  }
  return kt({
    encodeStream: (n, r) => {
      let o = [];
      for (const s in e) {
        const i = r[s];
        if (i === void 0)
          continue;
        const [c, a, u] = e[s];
        if (!a)
          o.push({ key: { type: c, key: ot }, value: u.encode(i) });
        else {
          const f = i.map(([l, h]) => [
            a.encode(l),
            u.encode(h)
          ]);
          f.sort((l, h) => vr(l[0], h[0]));
          for (const [l, h] of f)
            o.push({ key: { key: l, type: c }, value: h });
        }
      }
      if (r.unknown) {
        r.unknown.sort((s, i) => vr(s[0].key, i[0].key));
        for (const [s, i] of r.unknown)
          o.push({ key: s, value: i });
      }
      vi.encodeStream(n, o);
    },
    decodeStream: (n) => {
      const r = vi.decodeStream(n), o = {}, s = {};
      for (const i of r) {
        let c = "unknown", a = i.key.key, u = i.value;
        if (t[i.key.type]) {
          const [f, l, h] = t[i.key.type];
          if (c = f, !l && a.length)
            throw new Error(`PSBT: Non-empty key for ${c} (key=${$.encode(a)} value=${$.encode(u)}`);
          if (a = l ? l.decode(a) : void 0, u = h.decode(u), !l) {
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
const Us = At($s(Jr), (e) => {
  if (e.finalScriptWitness && !e.finalScriptWitness.length)
    throw new Error("validateInput: empty finalScriptWitness");
  if (e.partialSig && !e.partialSig.length)
    throw new Error("Empty partialSig");
  if (e.partialSig)
    for (const [t] of e.partialSig)
      cn(t, Bt.ecdsa);
  if (e.bip32Derivation)
    for (const [t] of e.bip32Derivation)
      cn(t, Bt.ecdsa);
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
}), Rs = At($s(Ln), (e) => {
  if (e.bip32Derivation)
    for (const [t] of e.bip32Derivation)
      cn(t, Bt.ecdsa);
  return e;
}), ba = At($s(Os), (e) => {
  if ((e.version || 0) === 0) {
    if (!e.unsignedTx)
      throw new Error("PSBTv0: missing unsignedTx");
    for (const n of e.unsignedTx.inputs)
      if (n.finalScriptSig && n.finalScriptSig.length)
        throw new Error("PSBTv0: input scriptSig found in unsignedTx");
  }
  return e;
}), bl = pt({
  magic: ys(ws(new Uint8Array([255])), "psbt"),
  global: ba,
  inputs: Tt("global/unsignedTx/inputs/length", Us),
  outputs: Tt(null, Rs)
}), El = pt({
  magic: ys(ws(new Uint8Array([255])), "psbt"),
  global: ba,
  inputs: Tt("global/inputCount", Us),
  outputs: Tt("global/outputCount", Rs)
});
pt({
  magic: ys(ws(new Uint8Array([255])), "psbt"),
  items: Tt(null, Ae(Tt(vc, gf([df(zt), rt(Xr)])), qr.dict()))
});
function ho(e, t, n) {
  for (const r in n) {
    if (r === "unknown" || !t[r])
      continue;
    const { allowInc: o } = Ho(t[r]);
    if (!o.includes(e))
      throw new Error(`PSBTv${e}: field ${r} is not allowed`);
  }
  for (const r in t) {
    const { reqInc: o } = Ho(t[r]);
    if (o.includes(e) && n[r] === void 0)
      throw new Error(`PSBTv${e}: missing required field ${r}`);
  }
}
function Ti(e, t, n) {
  const r = {};
  for (const o in n) {
    const s = o;
    if (s !== "unknown") {
      if (!t[s])
        continue;
      const { allowInc: i, silentIgnore: c } = Ho(t[s]);
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
function Ea(e) {
  const t = e && e.global && e.global.version || 0;
  ho(t, Os, e.global);
  for (const i of e.inputs)
    ho(t, Jr, i);
  for (const i of e.outputs)
    ho(t, Ln, i);
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
function Vo(e, t, n, r, o) {
  const s = { ...n, ...t };
  for (const i in e) {
    const c = i, [a, u, f] = e[c], l = r && !r.includes(i);
    if (t[i] === void 0 && i in t) {
      if (l)
        throw new Error(`Cannot remove signed field=${i}`);
      delete s[i];
    } else if (u) {
      const h = n && n[i] ? n[i] : [];
      let d = t[c];
      if (d) {
        if (!Array.isArray(d))
          throw new Error(`keyMap(${i}): KV pairs should be [k, v][]`);
        d = d.map((y) => {
          if (y.length !== 2)
            throw new Error(`keyMap(${i}): KV pairs should be [k, v][]`);
          return [
            typeof y[0] == "string" ? u.decode($.decode(y[0])) : y[0],
            typeof y[1] == "string" ? f.decode($.decode(y[1])) : y[1]
          ];
        });
        const w = {}, g = (y, S, v) => {
          if (w[y] === void 0) {
            w[y] = [S, v];
            return;
          }
          const O = $.encode(f.encode(w[y][1])), N = $.encode(f.encode(v));
          if (O !== N)
            throw new Error(`keyMap(${c}): same key=${y} oldVal=${O} newVal=${N}`);
        };
        for (const [y, S] of h) {
          const v = $.encode(u.encode(y));
          g(v, y, S);
        }
        for (const [y, S] of d) {
          const v = $.encode(u.encode(y));
          if (S === void 0) {
            if (l)
              throw new Error(`Cannot remove signed field=${c}/${y}`);
            delete w[v];
          } else
            g(v, y, S);
        }
        s[c] = Object.values(w);
      }
    } else if (typeof s[i] == "string")
      s[i] = f.decode($.decode(s[i]));
    else if (l && i in t && n && n[i] !== void 0 && !ct(f.encode(t[i]), f.encode(n[i])))
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
const Ai = At(bl, Ea), ki = At(El, Ea), xl = {
  encode(e) {
    if (!(e.length !== 2 || e[0] !== 1 || !nt(e[1]) || $.encode(e[1]) !== "4e73"))
      return { type: "p2a", script: K.encode(e) };
  },
  decode: (e) => {
    if (e.type === "p2a")
      return [1, $.decode("4e73")];
  }
};
function Ye(e, t) {
  try {
    return cn(e, t), !0;
  } catch {
    return !1;
  }
}
const Sl = {
  encode(e) {
    if (!(e.length !== 2 || !nt(e[0]) || !Ye(e[0], Bt.ecdsa) || e[1] !== "CHECKSIG"))
      return { type: "pk", pubkey: e[0] };
  },
  decode: (e) => e.type === "pk" ? [e.pubkey, "CHECKSIG"] : void 0
}, vl = {
  encode(e) {
    if (!(e.length !== 5 || e[0] !== "DUP" || e[1] !== "HASH160" || !nt(e[2])) && !(e[3] !== "EQUALVERIFY" || e[4] !== "CHECKSIG"))
      return { type: "pkh", hash: e[2] };
  },
  decode: (e) => e.type === "pkh" ? ["DUP", "HASH160", e.hash, "EQUALVERIFY", "CHECKSIG"] : void 0
}, Tl = {
  encode(e) {
    if (!(e.length !== 3 || e[0] !== "HASH160" || !nt(e[1]) || e[2] !== "EQUAL"))
      return { type: "sh", hash: e[1] };
  },
  decode: (e) => e.type === "sh" ? ["HASH160", e.hash, "EQUAL"] : void 0
}, Al = {
  encode(e) {
    if (!(e.length !== 2 || e[0] !== 0 || !nt(e[1])) && e[1].length === 32)
      return { type: "wsh", hash: e[1] };
  },
  decode: (e) => e.type === "wsh" ? [0, e.hash] : void 0
}, kl = {
  encode(e) {
    if (!(e.length !== 2 || e[0] !== 0 || !nt(e[1])) && e[1].length === 20)
      return { type: "wpkh", hash: e[1] };
  },
  decode: (e) => e.type === "wpkh" ? [0, e.hash] : void 0
}, Il = {
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
        if (!nt(s))
          return;
      return { type: "ms", m: n, pubkeys: o };
    }
  },
  // checkmultisig(n, ..pubkeys, m)
  decode: (e) => e.type === "ms" ? [e.m, ...e.pubkeys, e.pubkeys.length, "CHECKMULTISIG"] : void 0
}, Bl = {
  encode(e) {
    if (!(e.length !== 2 || e[0] !== 1 || !nt(e[1])))
      return { type: "tr", pubkey: e[1] };
  },
  decode: (e) => e.type === "tr" ? [1, e.pubkey] : void 0
}, Ol = {
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
      if (!nt(o))
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
}, $l = {
  encode(e) {
    const t = e.length - 1;
    if (e[t] !== "NUMEQUAL" || e[1] !== "CHECKSIG")
      return;
    const n = [], r = ul(e[t - 1]);
    if (typeof r == "number") {
      for (let o = 0; o < t - 1; o++) {
        const s = e[o];
        if (o & 1) {
          if (s !== (o === 1 ? "CHECKSIG" : "CHECKSIGADD"))
            throw new Error("OutScript.encode/tr_ms: wrong element");
          continue;
        }
        if (!nt(s))
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
}, Ul = {
  encode(e) {
    return { type: "unknown", script: K.encode(e) };
  },
  decode: (e) => e.type === "unknown" ? K.decode(e.script) : void 0
}, Rl = [
  xl,
  Sl,
  vl,
  Tl,
  Al,
  kl,
  Il,
  Bl,
  Ol,
  $l,
  Ul
], Nl = Ae(K, qr.match(Rl)), ut = At(Nl, (e) => {
  if (e.type === "pk" && !Ye(e.pubkey, Bt.ecdsa))
    throw new Error("OutScript/pk: wrong key");
  if ((e.type === "pkh" || e.type === "sh" || e.type === "wpkh") && (!nt(e.hash) || e.hash.length !== 20))
    throw new Error(`OutScript/${e.type}: wrong hash`);
  if (e.type === "wsh" && (!nt(e.hash) || e.hash.length !== 32))
    throw new Error("OutScript/wsh: wrong hash");
  if (e.type === "tr" && (!nt(e.pubkey) || !Ye(e.pubkey, Bt.schnorr)))
    throw new Error("OutScript/tr: wrong taproot public key");
  if ((e.type === "ms" || e.type === "tr_ns" || e.type === "tr_ms") && !Array.isArray(e.pubkeys))
    throw new Error("OutScript/multisig: wrong pubkeys array");
  if (e.type === "ms") {
    const t = e.pubkeys.length;
    for (const n of e.pubkeys)
      if (!Ye(n, Bt.ecdsa))
        throw new Error("OutScript/multisig: wrong pubkey");
    if (e.m <= 0 || t > 16 || e.m > t)
      throw new Error("OutScript/multisig: invalid params");
  }
  if (e.type === "tr_ns" || e.type === "tr_ms") {
    for (const t of e.pubkeys)
      if (!Ye(t, Bt.schnorr))
        throw new Error(`OutScript/${e.type}: wrong pubkey`);
  }
  if (e.type === "tr_ms") {
    const t = e.pubkeys.length;
    if (e.m <= 0 || t > 999 || e.m > t)
      throw new Error("OutScript/tr_ms: invalid params");
  }
  return e;
});
function Ii(e, t) {
  if (!ct(e.hash, wt(t)))
    throw new Error("checkScript: wsh wrong witnessScript hash");
  const n = ut.decode(t);
  if (n.type === "tr" || n.type === "tr_ns" || n.type === "tr_ms")
    throw new Error(`checkScript: P2${n.type} cannot be wrapped in P2SH`);
  if (n.type === "wpkh" || n.type === "sh")
    throw new Error(`checkScript: P2${n.type} cannot be wrapped in P2WSH`);
}
function xa(e, t, n) {
  if (e) {
    const r = ut.decode(e);
    if (r.type === "tr_ns" || r.type === "tr_ms" || r.type === "ms" || r.type == "pk")
      throw new Error(`checkScript: non-wrapped ${r.type}`);
    if (r.type === "sh" && t) {
      if (!ct(r.hash, ha(t)))
        throw new Error("checkScript: sh wrong redeemScript hash");
      const o = ut.decode(t);
      if (o.type === "tr" || o.type === "tr_ns" || o.type === "tr_ms")
        throw new Error(`checkScript: P2${o.type} cannot be wrapped in P2SH`);
      if (o.type === "sh")
        throw new Error("checkScript: P2SH cannot be wrapped in P2SH");
    }
    r.type === "wsh" && n && Ii(r, n);
  }
  if (t) {
    const r = ut.decode(t);
    r.type === "wsh" && n && Ii(r, n);
  }
}
function Ll(e) {
  const t = {};
  for (const n of e) {
    const r = $.encode(n);
    if (t[r])
      throw new Error(`Multisig: non-uniq pubkey: ${e.map($.encode)}`);
    t[r] = !0;
  }
}
function Cl(e, t, n = !1, r) {
  const o = ut.decode(e);
  if (o.type === "unknown" && n)
    return;
  if (!["tr_ns", "tr_ms"].includes(o.type))
    throw new Error(`P2TR: invalid leaf script=${o.type}`);
  const s = o;
  if (!n && s.pubkeys)
    for (const i of s.pubkeys) {
      if (ct(i, Is))
        throw new Error("Unspendable taproot key in leaf script");
      if (ct(i, t))
        throw new Error("Using P2TR with leaf script with same key as internal key is not supported");
    }
}
function Sa(e) {
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
function Do(e, t = []) {
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
    left: Do(e.left, [e.right.hash, ...t]),
    right: Do(e.right, [e.left.hash, ...t])
  };
}
function Mo(e) {
  if (!e)
    throw new Error("taprootAddPath: empty tree");
  if (e.type === "leaf")
    return [e];
  if (e.type !== "branch")
    throw new Error(`taprootWalkTree: wrong type=${e}`);
  return [...Mo(e.left), ...Mo(e.right)];
}
function Ko(e, t, n = !1, r) {
  if (!e)
    throw new Error("taprootHashTree: empty tree");
  if (Array.isArray(e) && e.length === 1 && (e = e[0]), !Array.isArray(e)) {
    const { leafVersion: a, script: u } = e;
    if (e.tapLeafScript || e.tapMerkleRoot && !ct(e.tapMerkleRoot, ot))
      throw new Error("P2TR: tapRoot leafScript cannot have tree");
    const f = typeof u == "string" ? $.decode(u) : u;
    if (!nt(f))
      throw new Error(`checkScript: wrong script type=${f}`);
    return Cl(f, t, n), {
      type: "leaf",
      version: a,
      script: f,
      hash: In(f, a)
    };
  }
  if (e.length !== 2 && (e = Sa(e)), e.length !== 2)
    throw new Error("hashTree: non binary tree!");
  const o = Ko(e[0], t, n), s = Ko(e[1], t, n);
  let [i, c] = [o.hash, s.hash];
  return vr(c, i) === -1 && ([i, c] = [c, i]), { type: "branch", left: o, right: s, hash: ks("TapBranch", i, c) };
}
const Cn = 192, In = (e, t = Cn) => ks("TapLeaf", new Uint8Array([t]), Kt.encode(e));
function _l(e, t, n = an, r = !1, o) {
  if (!e && !t)
    throw new Error("p2tr: should have pubKey or scriptTree (or both)");
  const s = typeof e == "string" ? $.decode(e) : e || Is;
  if (!Ye(s, Bt.schnorr))
    throw new Error("p2tr: non-schnorr pubkey");
  if (t) {
    let i = Do(Ko(t, s, r));
    const c = i.hash, [a, u] = _o(s, c), f = Mo(i).map((l) => ({
      ...l,
      controlBlock: Xt.encode({
        version: (l.version || Cn) + u,
        internalKey: s,
        merklePath: l.path
      })
    }));
    return {
      type: "tr",
      script: ut.encode({ type: "tr", pubkey: a }),
      address: De(n).encode({ type: "tr", pubkey: a }),
      // For tests
      tweakedPubkey: a,
      // PSBT stuff
      tapInternalKey: s,
      leaves: f,
      tapLeafScript: f.map((l) => [
        Xt.decode(l.controlBlock),
        Ee(l.script, new Uint8Array([l.version || Cn]))
      ]),
      tapMerkleRoot: c
    };
  } else {
    const i = _o(s, ot)[0];
    return {
      type: "tr",
      script: ut.encode({ type: "tr", pubkey: i }),
      address: De(n).encode({ type: "tr", pubkey: i }),
      // For tests
      tweakedPubkey: i,
      // PSBT stuff
      tapInternalKey: s
    };
  }
}
function Pl(e, t, n = !1) {
  return n || Ll(t), {
    type: "tr_ms",
    script: ut.encode({ type: "tr_ms", pubkeys: t, m: e })
  };
}
const va = Yu(wt);
function Ta(e, t) {
  if (t.length < 2 || t.length > 40)
    throw new Error("Witness: invalid length");
  if (e > 16)
    throw new Error("Witness: invalid version");
  if (e === 0 && !(t.length === 20 || t.length === 32))
    throw new Error("Witness: invalid length for version");
}
function po(e, t, n = an) {
  Ta(e, t);
  const r = e === 0 ? Oo : qe;
  return r.encode(n.bech32, [e].concat(r.toWords(t)));
}
function Bi(e, t) {
  return va.encode(Ee(Uint8Array.from(t), e));
}
function De(e = an) {
  return {
    encode(t) {
      const { type: n } = t;
      if (n === "wpkh")
        return po(0, t.hash, e);
      if (n === "wsh")
        return po(0, t.hash, e);
      if (n === "tr")
        return po(1, t.pubkey, e);
      if (n === "pkh")
        return Bi(t.hash, [e.pubKeyHash]);
      if (n === "sh")
        return Bi(t.hash, [e.scriptHash]);
      throw new Error(`Unknown address type=${n}`);
    },
    decode(t) {
      if (t.length < 14 || t.length > 74)
        throw new Error("Invalid address length");
      if (e.bech32 && t.toLowerCase().startsWith(`${e.bech32}1`)) {
        let r;
        try {
          if (r = Oo.decode(t), r.words[0] !== 0)
            throw new Error(`bech32: wrong version=${r.words[0]}`);
        } catch {
          if (r = qe.decode(t), r.words[0] === 0)
            throw new Error(`bech32m: wrong version=${r.words[0]}`);
        }
        if (r.prefix !== e.bech32)
          throw new Error(`wrong bech32 prefix=${r.prefix}`);
        const [o, ...s] = r.words, i = Oo.fromWords(s);
        if (Ta(o, i), o === 0 && i.length === 32)
          return { type: "wsh", hash: i };
        if (o === 0 && i.length === 20)
          return { type: "wpkh", hash: i };
        if (o === 1 && i.length === 32)
          return { type: "tr", pubkey: i };
        throw new Error("Unknown witness program");
      }
      const n = va.decode(t);
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
const Jn = new Uint8Array(32), Hl = {
  amount: 0xffffffffffffffffn,
  script: ot
}, Vl = (e) => Math.ceil(e / 4), Dl = 8, Ml = 2, Ue = 0, Ns = 4294967295;
qr.decimal(Dl);
const Bn = (e, t) => e === void 0 ? t : e;
function kr(e) {
  if (Array.isArray(e))
    return e.map((t) => kr(t));
  if (nt(e))
    return Uint8Array.from(e);
  if (["number", "bigint", "boolean", "string", "undefined"].includes(typeof e))
    return e;
  if (e === null)
    return e;
  if (typeof e == "object")
    return Object.fromEntries(Object.entries(e).map(([t, n]) => [t, kr(n)]));
  throw new Error(`cloneDeep: unknown type=${e} (${typeof e})`);
}
const j = {
  DEFAULT: 0,
  ALL: 1,
  NONE: 2,
  SINGLE: 3,
  ANYONECANPAY: 128
}, Me = {
  DEFAULT: j.DEFAULT,
  ALL: j.ALL,
  NONE: j.NONE,
  SINGLE: j.SINGLE,
  DEFAULT_ANYONECANPAY: j.DEFAULT | j.ANYONECANPAY,
  ALL_ANYONECANPAY: j.ALL | j.ANYONECANPAY,
  NONE_ANYONECANPAY: j.NONE | j.ANYONECANPAY,
  SINGLE_ANYONECANPAY: j.SINGLE | j.ANYONECANPAY
}, Kl = wa(Me);
function Fl(e, t, n, r = ot) {
  return ct(n, t) && (e = cl(e, r), t = As(e)), { privKey: e, pubKey: t };
}
function Re(e) {
  if (e.script === void 0 || e.amount === void 0)
    throw new Error("Transaction/output: script and amount required");
  return { script: e.script, amount: e.amount };
}
function Sn(e) {
  if (e.txid === void 0 || e.index === void 0)
    throw new Error("Transaction/input: txid and index required");
  return {
    txid: e.txid,
    index: e.index,
    sequence: Bn(e.sequence, Ns),
    finalScriptSig: Bn(e.finalScriptSig, ot)
  };
}
function go(e) {
  for (const t in e) {
    const n = t;
    wl.includes(n) || delete e[n];
  }
}
const wo = pt({ txid: rt(32, !0), index: Z });
function Wl(e) {
  if (typeof e != "number" || typeof Kl[e] != "string")
    throw new Error(`Invalid SigHash=${e}`);
  return e;
}
function Oi(e) {
  const t = e & 31;
  return {
    isAny: !!(e & j.ANYONECANPAY),
    isNone: t === j.NONE,
    isSingle: t === j.SINGLE
  };
}
function zl(e) {
  if (e !== void 0 && {}.toString.call(e) !== "[object Object]")
    throw new Error(`Wrong object type for transaction options: ${e}`);
  const t = {
    ...e,
    // Defaults
    version: Bn(e.version, Ml),
    lockTime: Bn(e.lockTime, 0),
    PSBTVersion: Bn(e.PSBTVersion, 0)
  };
  if (typeof t.allowUnknowInput < "u" && (e.allowUnknownInputs = t.allowUnknowInput), typeof t.allowUnknowOutput < "u" && (e.allowUnknownOutputs = t.allowUnknowOutput), typeof t.lockTime != "number")
    throw new Error("Transaction lock time should be number");
  if (Z.encode(t.lockTime), t.PSBTVersion !== 0 && t.PSBTVersion !== 2)
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
function $i(e) {
  if (e.nonWitnessUtxo && e.index !== void 0) {
    const t = e.nonWitnessUtxo.outputs.length - 1;
    if (e.index > t)
      throw new Error(`validateInput: index(${e.index}) not in nonWitnessUtxo`);
    const n = e.nonWitnessUtxo.outputs[e.index];
    if (e.witnessUtxo && (!ct(e.witnessUtxo.script, n.script) || e.witnessUtxo.amount !== n.amount))
      throw new Error("validateInput: witnessUtxo different from nonWitnessUtxo");
    if (e.txid) {
      if (e.nonWitnessUtxo.outputs.length - 1 < e.index)
        throw new Error("nonWitnessUtxo: incorect output index");
      const o = yt.fromRaw(Xe.encode(e.nonWitnessUtxo), {
        allowUnknownOutputs: !0,
        disableScriptCheck: !0,
        allowUnknownInputs: !0
      }), s = $.encode(e.txid);
      if (o.isFinal && o.id !== s)
        throw new Error(`nonWitnessUtxo: wrong txid, exp=${s} got=${o.id}`);
    }
  }
  return e;
}
function lr(e) {
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
function Ui(e, t, n, r = !1, o = !1) {
  let { nonWitnessUtxo: s, txid: i } = e;
  typeof s == "string" && (s = $.decode(s)), nt(s) && (s = Xe.decode(s)), !("nonWitnessUtxo" in e) && s === void 0 && (s = t?.nonWitnessUtxo), typeof i == "string" && (i = $.decode(i)), i === void 0 && (i = t?.txid);
  let c = { ...t, ...e, nonWitnessUtxo: s, txid: i };
  !("nonWitnessUtxo" in e) && c.nonWitnessUtxo === void 0 && delete c.nonWitnessUtxo, c.sequence === void 0 && (c.sequence = Ns), c.tapMerkleRoot === null && delete c.tapMerkleRoot, c = Vo(Jr, c, t, n, o), Us.encode(c);
  let a;
  return c.nonWitnessUtxo && c.index !== void 0 ? a = c.nonWitnessUtxo.outputs[c.index] : c.witnessUtxo && (a = c.witnessUtxo), a && !r && xa(a && a.script, c.redeemScript, c.witnessScript), c;
}
function Ri(e, t = !1) {
  let n = "legacy", r = j.ALL;
  const o = lr(e), s = ut.decode(o.script);
  let i = s.type, c = s;
  const a = [s];
  if (s.type === "tr")
    return r = j.DEFAULT, {
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
      let h = ut.decode(e.redeemScript);
      (h.type === "wpkh" || h.type === "wsh") && (n = "segwit"), a.push(h), c = h, i += `-${h.type}`;
    }
    if (c.type === "wsh") {
      if (!e.witnessScript)
        throw new Error("inputType: wsh without witnessScript");
      let h = ut.decode(e.witnessScript);
      h.type === "wsh" && (n = "segwit"), a.push(h), c = h, i += `-${h.type}`;
    }
    const u = a[a.length - 1];
    if (u.type === "sh" || u.type === "wsh")
      throw new Error("inputType: sh/wsh cannot be terminal type");
    const f = ut.encode(u), l = {
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
class yt {
  global = {};
  inputs = [];
  // use getInput()
  outputs = [];
  // use getOutput()
  opts;
  constructor(t = {}) {
    const n = this.opts = zl(t);
    n.lockTime !== Ue && (this.global.fallbackLocktime = n.lockTime), this.global.txVersion = n.version;
  }
  // Import
  static fromRaw(t, n = {}) {
    const r = Xe.decode(t), o = new yt({ ...n, version: r.version, lockTime: r.lockTime });
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
      r = Ai.decode(t);
    } catch (l) {
      try {
        r = ki.decode(t);
      } catch {
        throw l;
      }
    }
    const o = r.global.version || 0;
    if (o !== 0 && o !== 2)
      throw new Error(`Wrong PSBT version=${o}`);
    const s = r.global.unsignedTx, i = o === 0 ? s?.version : r.global.txVersion, c = o === 0 ? s?.lockTime : r.global.fallbackLocktime, a = new yt({ ...n, version: i, lockTime: c, PSBTVersion: o }), u = o === 0 ? s?.inputs.length : r.global.inputCount;
    a.inputs = r.inputs.slice(0, u).map((l, h) => $i({
      finalScriptSig: ot,
      ...r.global.unsignedTx?.inputs[h],
      ...l
    }));
    const f = o === 0 ? s?.outputs.length : r.global.outputCount;
    return a.outputs = r.outputs.slice(0, f).map((l, h) => ({
      ...l,
      ...r.global.unsignedTx?.outputs[h]
    })), a.global = { ...r.global, txVersion: i }, c !== Ue && (a.global.fallbackLocktime = c), a;
  }
  toPSBT(t = this.opts.PSBTVersion) {
    if (t !== 0 && t !== 2)
      throw new Error(`Wrong PSBT version=${t}`);
    const n = this.inputs.map((s) => $i(Ti(t, Jr, s)));
    for (const s of n)
      s.partialSig && !s.partialSig.length && delete s.partialSig, s.finalScriptSig && !s.finalScriptSig.length && delete s.finalScriptSig, s.finalScriptWitness && !s.finalScriptWitness.length && delete s.finalScriptWitness;
    const r = this.outputs.map((s) => Ti(t, Ln, s)), o = { ...this.global };
    return t === 0 ? (o.unsignedTx = An.decode(An.encode({
      version: this.version,
      lockTime: this.lockTime,
      inputs: this.inputs.map(Sn).map((s) => ({
        ...s,
        finalScriptSig: ot
      })),
      outputs: this.outputs.map(Re)
    })), delete o.fallbackLocktime, delete o.txVersion) : (o.version = t, o.txVersion = this.version, o.inputCount = this.inputs.length, o.outputCount = this.outputs.length, o.fallbackLocktime && o.fallbackLocktime === Ue && delete o.fallbackLocktime), this.opts.bip174jsCompat && (n.length || n.push({}), r.length || r.push({})), (t === 0 ? Ai : ki).encode({
      global: o,
      inputs: n,
      outputs: r
    });
  }
  // BIP370 lockTime (https://github.com/bitcoin/bips/blob/master/bip-0370.mediawiki#determining-lock-time)
  get lockTime() {
    let t = Ue, n = 0, r = Ue, o = 0;
    for (const s of this.inputs)
      s.requiredHeightLocktime && (t = Math.max(t, s.requiredHeightLocktime), n++), s.requiredTimeLocktime && (r = Math.max(r, s.requiredTimeLocktime), o++);
    return n && n >= o ? t : r !== Ue ? r : this.global.fallbackLocktime || Ue;
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
    const n = this.inputs[t].sighashType, r = n === void 0 ? j.DEFAULT : n, o = r === j.DEFAULT ? j.ALL : r & 3;
    return { sigInputs: r & j.ANYONECANPAY, sigOutputs: o };
  }
  // Very nice for debug purposes, but slow. If there is too much inputs/outputs to add, will be quadratic.
  // Some cache will be nice, but there chance to have bugs with cache invalidation
  signStatus() {
    let t = !0, n = !0, r = [], o = [];
    for (let s = 0; s < this.inputs.length; s++) {
      if (this.inputStatus(s) === "unsigned")
        continue;
      const { sigInputs: c, sigOutputs: a } = this.inputSighash(s);
      if (c === j.ANYONECANPAY ? r.push(s) : t = !1, a === j.ALL)
        n = !1;
      else if (a === j.SINGLE)
        o.push(s);
      else if (a !== j.NONE) throw new Error(`Wrong signature hash output type: ${a}`);
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
    const n = this.outputs.map(Re);
    t += 4 * zt.encode(this.outputs.length).length;
    for (const r of n)
      t += 32 + 4 * Kt.encode(r.script).length;
    this.hasWitnesses && (t += 2), t += 4 * zt.encode(this.inputs.length).length;
    for (const r of this.inputs)
      t += 160 + 4 * Kt.encode(r.finalScriptSig || ot).length, this.hasWitnesses && r.finalScriptWitness && (t += Nn.encode(r.finalScriptWitness).length);
    return t;
  }
  get vsize() {
    return Vl(this.weight);
  }
  toBytes(t = !1, n = !1) {
    return Xe.encode({
      version: this.version,
      lockTime: this.lockTime,
      inputs: this.inputs.map(Sn).map((r) => ({
        ...r,
        finalScriptSig: t && r.finalScriptSig || ot
      })),
      outputs: this.outputs.map(Re),
      witnesses: this.inputs.map((r) => r.finalScriptWitness || []),
      segwitFlag: n && this.hasWitnesses
    });
  }
  get unsignedTx() {
    return this.toBytes(!1, !1);
  }
  get hex() {
    return $.encode(this.toBytes(!0, this.hasWitnesses));
  }
  get hash() {
    return $.encode(ge(this.toBytes(!0)));
  }
  get id() {
    return $.encode(ge(this.toBytes(!0)).reverse());
  }
  // Input stuff
  checkInputIdx(t) {
    if (!Number.isSafeInteger(t) || 0 > t || t >= this.inputs.length)
      throw new Error(`Wrong input index=${t}`);
  }
  getInput(t) {
    return this.checkInputIdx(t), kr(this.inputs[t]);
  }
  get inputsLength() {
    return this.inputs.length;
  }
  // Modification
  addInput(t, n = !1) {
    if (!n && !this.signStatus().addInput)
      throw new Error("Tx has signed inputs, cannot add new one");
    return this.inputs.push(Ui(t, void 0, void 0, this.opts.disableScriptCheck)), this.inputs.length - 1;
  }
  updateInput(t, n, r = !1) {
    this.checkInputIdx(t);
    let o;
    if (!r) {
      const s = this.signStatus();
      (!s.addInput || s.inputs.includes(t)) && (o = yl);
    }
    this.inputs[t] = Ui(n, this.inputs[t], o, this.opts.disableScriptCheck, this.opts.allowUnknown);
  }
  // Output stuff
  checkOutputIdx(t) {
    if (!Number.isSafeInteger(t) || 0 > t || t >= this.outputs.length)
      throw new Error(`Wrong output index=${t}`);
  }
  getOutput(t) {
    return this.checkOutputIdx(t), kr(this.outputs[t]);
  }
  getOutputAddress(t, n = an) {
    const r = this.getOutput(t);
    if (r.script)
      return De(n).encode(ut.decode(r.script));
  }
  get outputsLength() {
    return this.outputs.length;
  }
  normalizeOutput(t, n, r) {
    let { amount: o, script: s } = t;
    if (o === void 0 && (o = n?.amount), typeof o != "bigint")
      throw new Error(`Wrong amount type, should be of type bigint in sats, but got ${o} of type ${typeof o}`);
    typeof s == "string" && (s = $.decode(s)), s === void 0 && (s = n?.script);
    let i = { ...n, ...t, amount: o, script: s };
    if (i.amount === void 0 && delete i.amount, i = Vo(Ln, i, n, r, this.opts.allowUnknown), Rs.encode(i), i.script && !this.opts.allowUnknownOutputs && ut.decode(i.script).type === "unknown")
      throw new Error("Transaction/output: unknown output script type, there is a chance that input is unspendable. Pass allowUnknownOutputs=true, if you sure");
    return this.opts.disableScriptCheck || xa(i.script, i.redeemScript, i.witnessScript), i;
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
      (!s.addOutput || s.outputs.includes(t)) && (o = ml);
    }
    this.outputs[t] = this.normalizeOutput(n, this.outputs[t], o);
  }
  addOutputAddress(t, n, r = an) {
    return this.addOutput({ script: ut.encode(De(r).decode(t)), amount: n });
  }
  // Utils
  get fee() {
    let t = 0n;
    for (const r of this.inputs) {
      const o = lr(r);
      if (!o)
        throw new Error("Empty input amount");
      t += o.amount;
    }
    const n = this.outputs.map(Re);
    for (const r of n)
      t -= r.amount;
    return t;
  }
  // Signing
  // Based on https://github.com/bitcoin/bitcoin/blob/5871b5b5ab57a0caf9b7514eb162c491c83281d5/test/functional/test_framework/script.py#L624
  // There is optimization opportunity to re-use hashes for multiple inputs for witness v0/v1,
  // but we are trying to be less complicated for audit purpose for now.
  preimageLegacy(t, n, r) {
    const { isAny: o, isNone: s, isSingle: i } = Oi(r);
    if (t < 0 || !Number.isSafeInteger(t))
      throw new Error(`Invalid input idx=${t}`);
    if (i && t >= this.outputs.length || t >= this.inputs.length)
      return Bc.encode(1n);
    n = K.encode(K.decode(n).filter((f) => f !== "CODESEPARATOR"));
    let c = this.inputs.map(Sn).map((f, l) => ({
      ...f,
      finalScriptSig: l === t ? n : ot
    }));
    o ? c = [c[t]] : (s || i) && (c = c.map((f, l) => ({
      ...f,
      sequence: l === t ? f.sequence : 0
    })));
    let a = this.outputs.map(Re);
    s ? a = [] : i && (a = a.slice(0, t).fill(Hl).concat([a[t]]));
    const u = Xe.encode({
      lockTime: this.lockTime,
      version: this.version,
      segwitFlag: !1,
      inputs: c,
      outputs: a
    });
    return ge(u, je.encode(r));
  }
  preimageWitnessV0(t, n, r, o) {
    const { isAny: s, isNone: i, isSingle: c } = Oi(r);
    let a = Jn, u = Jn, f = Jn;
    const l = this.inputs.map(Sn), h = this.outputs.map(Re);
    s || (a = ge(...l.map(wo.encode))), !s && !c && !i && (u = ge(...l.map((w) => Z.encode(w.sequence)))), !c && !i ? f = ge(...h.map(_e.encode)) : c && t < h.length && (f = ge(_e.encode(h[t])));
    const d = l[t];
    return ge(je.encode(this.version), a, u, rt(32, !0).encode(d.txid), Z.encode(d.index), Kt.encode(n), ur.encode(o), Z.encode(d.sequence), f, Z.encode(this.lockTime), Z.encode(r));
  }
  preimageWitnessV1(t, n, r, o, s = -1, i, c = 192, a) {
    if (!Array.isArray(o) || this.inputs.length !== o.length)
      throw new Error(`Invalid amounts array=${o}`);
    if (!Array.isArray(n) || this.inputs.length !== n.length)
      throw new Error(`Invalid prevOutScript array=${n}`);
    const u = [
      Se.encode(0),
      Se.encode(r),
      // U8 sigHash
      je.encode(this.version),
      Z.encode(this.lockTime)
    ], f = r === j.DEFAULT ? j.ALL : r & 3, l = r & j.ANYONECANPAY, h = this.inputs.map(Sn), d = this.outputs.map(Re);
    l !== j.ANYONECANPAY && u.push(...[
      h.map(wo.encode),
      o.map(ur.encode),
      n.map(Kt.encode),
      h.map((g) => Z.encode(g.sequence))
    ].map((g) => wt(Ee(...g)))), f === j.ALL && u.push(wt(Ee(...d.map(_e.encode))));
    const w = (a ? 1 : 0) | (i ? 2 : 0);
    if (u.push(new Uint8Array([w])), l === j.ANYONECANPAY) {
      const g = h[t];
      u.push(wo.encode(g), ur.encode(o[t]), Kt.encode(n[t]), Z.encode(g.sequence));
    } else
      u.push(Z.encode(t));
    return w & 1 && u.push(wt(Kt.encode(a || ot))), f === j.SINGLE && u.push(t < d.length ? wt(_e.encode(d[t])) : Jn), i && u.push(In(i, c), Se.encode(0), je.encode(s)), ks("TapSighash", ...u);
  }
  // Signer can be privateKey OR instance of bip32 HD stuff
  signIdx(t, n, r, o) {
    this.checkInputIdx(n);
    const s = this.inputs[n], i = Ri(s, this.opts.allowLegacyWitnessUtxo);
    if (!nt(t)) {
      if (!s.bip32Derivation || !s.bip32Derivation.length)
        throw new Error("bip32Derivation: empty");
      const f = s.bip32Derivation.filter((h) => h[1].fingerprint == t.fingerprint).map(([h, { path: d }]) => {
        let w = t;
        for (const g of d)
          w = w.deriveChild(g);
        if (!ct(w.publicKey, h))
          throw new Error("bip32Derivation: wrong pubKey");
        if (!w.privateKey)
          throw new Error("bip32Derivation: no privateKey");
        return w;
      });
      if (!f.length)
        throw new Error(`bip32Derivation: no items with fingerprint=${t.fingerprint}`);
      let l = !1;
      for (const h of f)
        this.signIdx(h.privateKey, n) && (l = !0);
      return l;
    }
    r ? r.forEach(Wl) : r = [i.defaultSighash];
    const c = i.sighash;
    if (!r.includes(c))
      throw new Error(`Input with not allowed sigHash=${c}. Allowed: ${r.join(", ")}`);
    const { sigOutputs: a } = this.inputSighash(n);
    if (a === j.SINGLE && n >= this.outputs.length)
      throw new Error(`Input with sighash SINGLE, but there is no output with corresponding index=${n}`);
    const u = lr(s);
    if (i.txType === "taproot") {
      const f = this.inputs.map(lr), l = f.map((y) => y.script), h = f.map((y) => y.amount);
      let d = !1, w = As(t), g = s.tapMerkleRoot || ot;
      if (s.tapInternalKey) {
        const { pubKey: y, privKey: S } = Fl(t, w, s.tapInternalKey, g), [v, O] = _o(s.tapInternalKey, g);
        if (ct(v, y)) {
          const N = this.preimageWitnessV1(n, l, c, h), U = Ee(bi(N, S, o), c !== j.DEFAULT ? new Uint8Array([c]) : ot);
          this.updateInput(n, { tapKeySig: U }, !0), d = !0;
        }
      }
      if (s.tapLeafScript) {
        s.tapScriptSig = s.tapScriptSig || [];
        for (const [y, S] of s.tapLeafScript) {
          const v = S.subarray(0, -1), O = K.decode(v), N = S[S.length - 1], U = In(v, N);
          if (O.findIndex((C) => nt(C) && ct(C, w)) === -1)
            continue;
          const x = this.preimageWitnessV1(n, l, c, h, void 0, v, N), Q = Ee(bi(x, t, o), c !== j.DEFAULT ? new Uint8Array([c]) : ot);
          this.updateInput(n, { tapScriptSig: [[{ pubKey: w, leafHash: U }, Q]] }, !0), d = !0;
        }
      }
      if (!d)
        throw new Error("No taproot scripts signed");
      return !0;
    } else {
      const f = pa(t);
      let l = !1;
      const h = ha(f);
      for (const g of K.decode(i.lastScript))
        nt(g) && (ct(g, f) || ct(g, h)) && (l = !0);
      if (!l)
        throw new Error(`Input script doesn't have pubKey: ${i.lastScript}`);
      let d;
      if (i.txType === "legacy")
        d = this.preimageLegacy(n, i.lastScript, c);
      else if (i.txType === "segwit") {
        let g = i.lastScript;
        i.last.type === "wpkh" && (g = ut.encode({ type: "pkh", hash: i.last.hash })), d = this.preimageWitnessV0(n, g, c, u.amount);
      } else
        throw new Error(`Transaction/sign: unknown tx type: ${i.txType}`);
      const w = il(d, t, this.opts.lowR);
      this.updateInput(n, {
        partialSig: [[f, Ee(w, new Uint8Array([c]))]]
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
    const n = this.inputs[t], r = Ri(n, this.opts.allowLegacyWitnessUtxo);
    if (r.txType === "taproot") {
      if (n.tapKeySig)
        n.finalScriptWitness = [n.tapKeySig];
      else if (n.tapLeafScript && n.tapScriptSig) {
        const a = n.tapLeafScript.sort((u, f) => Xt.encode(u[0]).length - Xt.encode(f[0]).length);
        for (const [u, f] of a) {
          const l = f.slice(0, -1), h = f[f.length - 1], d = ut.decode(l), w = In(l, h), g = n.tapScriptSig.filter((S) => ct(S[0].leafHash, w));
          let y = [];
          if (d.type === "tr_ms") {
            const S = d.m, v = d.pubkeys;
            let O = 0;
            for (const N of v) {
              const U = g.findIndex((W) => ct(W[0].pubKey, N));
              if (O === S || U === -1) {
                y.push(ot);
                continue;
              }
              y.push(g[U][1]), O++;
            }
            if (O !== S)
              continue;
          } else if (d.type === "tr_ns") {
            for (const S of d.pubkeys) {
              const v = g.findIndex((O) => ct(O[0].pubKey, S));
              v !== -1 && y.push(g[v][1]);
            }
            if (y.length !== d.pubkeys.length)
              continue;
          } else if (d.type === "unknown" && this.opts.allowUnknownInputs) {
            const S = K.decode(l);
            if (y = g.map(([{ pubKey: v }, O]) => {
              const N = S.findIndex((U) => nt(U) && ct(U, v));
              if (N === -1)
                throw new Error("finalize/taproot: cannot find position of pubkey in script");
              return { signature: O, pos: N };
            }).sort((v, O) => v.pos - O.pos).map((v) => v.signature), !y.length)
              continue;
          } else {
            const S = this.opts.customScripts;
            if (S)
              for (const v of S) {
                if (!v.finalizeTaproot)
                  continue;
                const O = K.decode(l), N = v.encode(O);
                if (N === void 0)
                  continue;
                const U = v.finalizeTaproot(l, N, g);
                if (U) {
                  n.finalScriptWitness = U.concat(Xt.encode(u)), n.finalScriptSig = ot, go(n);
                  return;
                }
              }
            throw new Error("Finalize: Unknown tapLeafScript");
          }
          n.finalScriptWitness = y.reverse().concat([l, Xt.encode(u)]);
          break;
        }
        if (!n.finalScriptWitness)
          throw new Error("finalize/taproot: empty witness");
      } else
        throw new Error("finalize/taproot: unknown input");
      n.finalScriptSig = ot, go(n);
      return;
    }
    if (!n.partialSig || !n.partialSig.length)
      throw new Error("Not enough partial sign");
    let o = ot, s = [];
    if (r.last.type === "ms") {
      const a = r.last.m, u = r.last.pubkeys;
      let f = [];
      for (const l of u) {
        const h = n.partialSig.find((d) => ct(l, d[0]));
        h && f.push(h[1]);
      }
      if (f = f.slice(0, a), f.length !== a)
        throw new Error(`Multisig: wrong signatures count, m=${a} n=${u.length} signatures=${f.length}`);
      o = K.encode([0, ...f]);
    } else if (r.last.type === "pk")
      o = K.encode([n.partialSig[0][1]]);
    else if (r.last.type === "pkh")
      o = K.encode([n.partialSig[0][1], n.partialSig[0][0]]);
    else if (r.last.type === "wpkh")
      o = ot, s = [n.partialSig[0][1], n.partialSig[0][0]];
    else if (r.last.type === "unknown" && !this.opts.allowUnknownInputs)
      throw new Error("Unknown inputs not allowed");
    let i, c;
    if (r.type.includes("wsh-") && (o.length && r.lastScript.length && (s = K.decode(o).map((a) => {
      if (a === 0)
        return ot;
      if (nt(a))
        return a;
      throw new Error(`Wrong witness op=${a}`);
    })), s = s.concat(r.lastScript)), r.txType === "segwit" && (c = s), r.type.startsWith("sh-wsh-") ? i = K.encode([K.encode([0, wt(r.lastScript)])]) : r.type.startsWith("sh-") ? i = K.encode([...K.decode(o), r.lastScript]) : r.type.startsWith("wsh-") || r.txType !== "segwit" && (i = o), !i && !c)
      throw new Error("Unknown error finalizing input");
    i && (n.finalScriptSig = i), c && (n.finalScriptWitness = c), go(n);
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
    const n = this.global.unsignedTx ? An.encode(this.global.unsignedTx) : ot, r = t.global.unsignedTx ? An.encode(t.global.unsignedTx) : ot;
    if (!ct(n, r))
      throw new Error("Transaction/combine: different unsigned tx");
    this.global = Vo(Os, this.global, t.global, void 0, this.opts.allowUnknown);
    for (let o = 0; o < this.inputs.length; o++)
      this.updateInput(o, t.inputs[o], !0);
    for (let o = 0; o < this.outputs.length; o++)
      this.updateOutput(o, t.outputs[o], !0);
    return this;
  }
  clone() {
    return yt.fromPSBT(this.toPSBT(this.opts.PSBTVersion), this.opts);
  }
}
class Ls extends Error {
  idx;
  // Indice of participant
  constructor(t, n) {
    super(n), this.idx = t;
  }
}
const { taggedHash: Aa, pointToBytes: tr } = de.utils, Gt = xe.Point, z = Gt.Fn, te = xe.lengths.publicKey, Fo = new Uint8Array(te), Ni = Ae(rt(33), {
  decode: (e) => _n(e) ? Fo : e.toBytes(!0),
  encode: (e) => Rn(e, Fo) ? Gt.ZERO : Gt.fromBytes(e)
}), Li = At(Bc, (e) => (Hc("n", e, 1n, z.ORDER), e)), Qe = pt({ R1: Ni, R2: Ni }), ka = pt({ k1: Li, k2: Li, publicKey: rt(te) });
function Ci(e, ...t) {
}
function Ct(e, ...t) {
  if (!Array.isArray(e))
    throw new Error("expected array");
  e.forEach((n) => G(n, ...t));
}
function _i(e) {
  if (!Array.isArray(e))
    throw new Error("expected array");
  e.forEach((t, n) => {
    if (typeof t != "boolean")
      throw new Error("expected boolean in xOnly array, got" + t + "(" + n + ")");
  });
}
const Ir = (e, ...t) => z.create(z.fromBytes(Aa(e, ...t), !0)), vn = (e, t) => qn(e.y) ? t : z.neg(t);
function Pe(e) {
  return Gt.BASE.multiply(e);
}
function _n(e) {
  return e.equals(Gt.ZERO);
}
function Wo(e) {
  return Ct(e, te), e.sort(vr);
}
function Ia(e) {
  Ct(e, te);
  for (let t = 1; t < e.length; t++)
    if (!Rn(e[t], e[0]))
      return e[t];
  return Fo;
}
function Ba(e) {
  return Ct(e, te), Aa("KeyAgg list", ...e);
}
function Oa(e, t, n) {
  return G(e, te), G(t, te), Rn(e, t) ? 1n : Ir("KeyAgg coefficient", n, e);
}
function zo(e, t = [], n = []) {
  if (Ct(e, te), Ct(t, 32), t.length !== n.length)
    throw new Error("The tweaks and isXonly arrays must have the same length");
  const r = Ia(e), o = Ba(e);
  let s = Gt.ZERO;
  for (let a = 0; a < e.length; a++) {
    let u;
    try {
      u = Gt.fromBytes(e[a]);
    } catch {
      throw new Ls(a, "pubkey");
    }
    s = s.add(u.multiply(Oa(e[a], r, o)));
  }
  let i = z.ONE, c = z.ZERO;
  for (let a = 0; a < t.length; a++) {
    const u = n[a] && !qn(s.y) ? z.neg(z.ONE) : z.ONE, f = z.fromBytes(t[a]);
    if (s = s.multiply(u).add(Pe(f)), _n(s))
      throw new Error("The result of tweaking cannot be infinity");
    i = z.mul(u, i), c = z.add(f, z.mul(u, c));
  }
  return { aggPublicKey: s, gAcc: i, tweakAcc: c };
}
const Pi = (e, t, n, r, o, s) => Ir("MuSig/nonce", e, new Uint8Array([t.length]), t, new Uint8Array([n.length]), n, o, Gn(s.length, 4), s, new Uint8Array([r]));
function Gl(e, t, n = new Uint8Array(0), r, o = new Uint8Array(0), s = zn(32)) {
  if (G(e, te), Ci(t, 32), G(n), ![0, 32].includes(n.length))
    throw new Error("wrong aggPublicKey");
  Ci(), G(o), G(s, 32);
  const i = Uint8Array.of(0), c = Pi(s, e, n, 0, i, o), a = Pi(s, e, n, 1, i, o);
  return {
    secret: ka.encode({ k1: c, k2: a, publicKey: e }),
    public: Qe.encode({ R1: Pe(c), R2: Pe(a) })
  };
}
function ql(e) {
  Ct(e, 66);
  let t = Gt.ZERO, n = Gt.ZERO;
  for (let r = 0; r < e.length; r++) {
    const o = e[r];
    try {
      const { R1: s, R2: i } = Qe.decode(o);
      if (_n(s) || _n(i))
        throw new Error("infinity point");
      t = t.add(s), n = n.add(i);
    } catch {
      throw new Ls(r, "pubnonce");
    }
  }
  return Qe.encode({ R1: t, R2: n });
}
class jl {
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
    if (Ct(n, 33), Ct(o, 32), _i(s), G(r), o.length !== s.length)
      throw new Error("The tweaks and isXonly arrays must have the same length");
    const { aggPublicKey: i, gAcc: c, tweakAcc: a } = zo(n, o, s), { R1: u, R2: f } = Qe.decode(t);
    this.publicKeys = n, this.Q = i, this.gAcc = c, this.tweakAcc = a, this.b = Ir("MuSig/noncecoef", t, tr(i), r);
    const l = u.add(f.multiply(this.b));
    this.R = _n(l) ? Gt.BASE : l, this.e = Ir("BIP0340/challenge", tr(this.R), tr(i), r), this.tweaks = o, this.isXonly = s, this.L = Ba(n), this.secondKey = Ia(n);
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
    if (!n.some((s) => Rn(s, r)))
      throw new Error("The signer's pubkey must be included in the list of pubkeys");
    return Oa(r, this.secondKey, this.L);
  }
  partialSigVerifyInternal(t, n, r) {
    const { Q: o, gAcc: s, b: i, R: c, e: a } = this, u = z.fromBytes(t, !0);
    if (!z.isValid(u))
      return !1;
    const { R1: f, R2: l } = Qe.decode(n), h = f.add(l.multiply(i)), d = qn(c.y) ? h : h.negate(), w = Gt.fromBytes(r), g = this.getSessionKeyAggCoeff(w), y = z.mul(vn(o, 1n), s), S = Pe(u), v = d.add(w.multiply(z.mul(a, z.mul(g, y))));
    return S.equals(v);
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
    if (G(n, 32), typeof r != "boolean")
      throw new Error("expected boolean");
    const { Q: o, gAcc: s, b: i, R: c, e: a } = this, { k1: u, k2: f, publicKey: l } = ka.decode(t);
    if (t.fill(0, 0, 64), !z.isValid(u))
      throw new Error("wrong k1");
    if (!z.isValid(f))
      throw new Error("wrong k1");
    const h = vn(c, u), d = vn(c, f), w = z.fromBytes(n);
    if (z.is0(w))
      throw new Error("wrong d_");
    const g = Pe(w), y = g.toBytes(!0);
    if (!Rn(y, l))
      throw new Error("Public key does not match nonceGen argument");
    const S = this.getSessionKeyAggCoeff(g), v = vn(o, 1n), O = z.mul(v, z.mul(s, w)), N = z.add(h, z.add(z.mul(i, d), z.mul(a, z.mul(S, O)))), U = z.toBytes(N);
    if (!r) {
      const W = Qe.encode({
        R1: Pe(u),
        R2: Pe(f)
      });
      if (!this.partialSigVerifyInternal(U, W, y))
        throw new Error("Partial signature verification failed");
    }
    return U;
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
    if (G(t, 32), Ct(n, 66), Ct(o, te), Ct(s, 32), _i(i), ke(r), n.length !== o.length)
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
    Ct(t, 32);
    const { Q: n, tweakAcc: r, R: o, e: s } = this;
    let i = 0n;
    for (let a = 0; a < t.length; a++) {
      const u = z.fromBytes(t[a], !0);
      if (!z.isValid(u))
        throw new Ls(a, "psig");
      i = z.add(i, u);
    }
    const c = vn(n, 1n);
    return i = z.add(i, z.mul(s, z.mul(c, r))), Ft(tr(o), z.toBytes(i));
  }
}
function Yl(e) {
  const t = Gl(e);
  return { secNonce: t.secret, pubNonce: t.public };
}
function Zl(e) {
  return ql(e);
}
/*! noble-hashes - MIT License (c) 2022 Paul Miller (paulmillr.com) */
function Cs(e) {
  return e instanceof Uint8Array || ArrayBuffer.isView(e) && e.constructor.name === "Uint8Array";
}
function Ke(e, t = "") {
  if (!Number.isSafeInteger(e) || e < 0) {
    const n = t && `"${t}" `;
    throw new Error(`${n}expected integer >0, got ${e}`);
  }
}
function et(e, t, n = "") {
  const r = Cs(e), o = e?.length, s = t !== void 0;
  if (!r || s && o !== t) {
    const i = n && `"${n}" `, c = s ? ` of length ${t}` : "", a = r ? `length=${o}` : `type=${typeof e}`;
    throw new Error(i + "expected Uint8Array" + c + ", got " + a);
  }
  return e;
}
function $a(e) {
  if (typeof e != "function" || typeof e.create != "function")
    throw new Error("Hash must wrapped by utils.createHasher");
  Ke(e.outputLen), Ke(e.blockLen);
}
function Br(e, t = !0) {
  if (e.destroyed)
    throw new Error("Hash instance has been destroyed");
  if (t && e.finished)
    throw new Error("Hash#digest() has already been called");
}
function Xl(e, t) {
  et(e, void 0, "digestInto() output");
  const n = t.outputLen;
  if (e.length < n)
    throw new Error('"digestInto() output" expected to be of length >=' + n);
}
function Or(...e) {
  for (let t = 0; t < e.length; t++)
    e[t].fill(0);
}
function yo(e) {
  return new DataView(e.buffer, e.byteOffset, e.byteLength);
}
function Yt(e, t) {
  return e << 32 - t | e >>> t;
}
const Ua = /* @ts-ignore */ typeof Uint8Array.from([]).toHex == "function" && typeof Uint8Array.fromHex == "function", Ql = /* @__PURE__ */ Array.from({ length: 256 }, (e, t) => t.toString(16).padStart(2, "0"));
function to(e) {
  if (et(e), Ua)
    return e.toHex();
  let t = "";
  for (let n = 0; n < e.length; n++)
    t += Ql[e[n]];
  return t;
}
const oe = { _0: 48, _9: 57, A: 65, F: 70, a: 97, f: 102 };
function Hi(e) {
  if (e >= oe._0 && e <= oe._9)
    return e - oe._0;
  if (e >= oe.A && e <= oe.F)
    return e - (oe.A - 10);
  if (e >= oe.a && e <= oe.f)
    return e - (oe.a - 10);
}
function $r(e) {
  if (typeof e != "string")
    throw new Error("hex string expected, got " + typeof e);
  if (Ua)
    return Uint8Array.fromHex(e);
  const t = e.length, n = t / 2;
  if (t % 2)
    throw new Error("hex string expected, got unpadded hex of length " + t);
  const r = new Uint8Array(n);
  for (let o = 0, s = 0; o < n; o++, s += 2) {
    const i = Hi(e.charCodeAt(s)), c = Hi(e.charCodeAt(s + 1));
    if (i === void 0 || c === void 0) {
      const a = e[s] + e[s + 1];
      throw new Error('hex string expected, got non-hex character "' + a + '" at index ' + s);
    }
    r[o] = i * 16 + c;
  }
  return r;
}
function Qt(...e) {
  let t = 0;
  for (let r = 0; r < e.length; r++) {
    const o = e[r];
    et(o), t += o.length;
  }
  const n = new Uint8Array(t);
  for (let r = 0, o = 0; r < e.length; r++) {
    const s = e[r];
    n.set(s, o), o += s.length;
  }
  return n;
}
function Jl(e, t = {}) {
  const n = (o, s) => e(s).update(o).digest(), r = e(void 0);
  return n.outputLen = r.outputLen, n.blockLen = r.blockLen, n.create = (o) => e(o), Object.assign(n, t), Object.freeze(n);
}
function eo(e = 32) {
  const t = typeof globalThis == "object" ? globalThis.crypto : null;
  if (typeof t?.getRandomValues != "function")
    throw new Error("crypto.getRandomValues must be defined");
  return t.getRandomValues(new Uint8Array(e));
}
const td = (e) => ({
  oid: Uint8Array.from([6, 9, 96, 134, 72, 1, 101, 3, 4, 2, e])
});
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const _s = /* @__PURE__ */ BigInt(0), Go = /* @__PURE__ */ BigInt(1);
function Ur(e, t = "") {
  if (typeof e != "boolean") {
    const n = t && `"${t}" `;
    throw new Error(n + "expected boolean, got type=" + typeof e);
  }
  return e;
}
function Ra(e) {
  if (typeof e == "bigint") {
    if (!dr(e))
      throw new Error("positive bigint expected, got " + e);
  } else
    Ke(e);
  return e;
}
function er(e) {
  const t = Ra(e).toString(16);
  return t.length & 1 ? "0" + t : t;
}
function Na(e) {
  if (typeof e != "string")
    throw new Error("hex string expected, got " + typeof e);
  return e === "" ? _s : BigInt("0x" + e);
}
function yn(e) {
  return Na(to(e));
}
function La(e) {
  return Na(to(ed(et(e)).reverse()));
}
function Ps(e, t) {
  Ke(t), e = Ra(e);
  const n = $r(e.toString(16).padStart(t * 2, "0"));
  if (n.length !== t)
    throw new Error("number too large");
  return n;
}
function Ca(e, t) {
  return Ps(e, t).reverse();
}
function ed(e) {
  return Uint8Array.from(e);
}
function nd(e) {
  return Uint8Array.from(e, (t, n) => {
    const r = t.charCodeAt(0);
    if (t.length !== 1 || r > 127)
      throw new Error(`string contains non-ASCII character "${e[n]}" with code ${r} at position ${n}`);
    return r;
  });
}
const dr = (e) => typeof e == "bigint" && _s <= e;
function rd(e, t, n) {
  return dr(e) && dr(t) && dr(n) && t <= e && e < n;
}
function od(e, t, n, r) {
  if (!rd(t, n, r))
    throw new Error("expected valid " + e + ": " + n + " <= n < " + r + ", got " + t);
}
function sd(e) {
  let t;
  for (t = 0; e > _s; e >>= Go, t += 1)
    ;
  return t;
}
const Hs = (e) => (Go << BigInt(e)) - Go;
function id(e, t, n) {
  if (Ke(e, "hashLen"), Ke(t, "qByteLen"), typeof n != "function")
    throw new Error("hmacFn must be a function");
  const r = (y) => new Uint8Array(y), o = Uint8Array.of(), s = Uint8Array.of(0), i = Uint8Array.of(1), c = 1e3;
  let a = r(e), u = r(e), f = 0;
  const l = () => {
    a.fill(1), u.fill(0), f = 0;
  }, h = (...y) => n(u, Qt(a, ...y)), d = (y = o) => {
    u = h(s, y), a = h(), y.length !== 0 && (u = h(i, y), a = h());
  }, w = () => {
    if (f++ >= c)
      throw new Error("drbg: tried max amount of iterations");
    let y = 0;
    const S = [];
    for (; y < t; ) {
      a = h();
      const v = a.slice();
      S.push(v), y += a.length;
    }
    return Qt(...S);
  };
  return (y, S) => {
    l(), d(y);
    let v;
    for (; !(v = S(w())); )
      d();
    return l(), v;
  };
}
function Vs(e, t = {}, n = {}) {
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
function Vi(e) {
  const t = /* @__PURE__ */ new WeakMap();
  return (n, ...r) => {
    const o = t.get(n);
    if (o !== void 0)
      return o;
    const s = e(n, ...r);
    return t.set(n, s), s;
  };
}
/*! noble-secp256k1 - MIT License (c) 2019 Paul Miller (paulmillr.com) */
const _a = {
  p: 0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffefffffc2fn,
  n: 0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141n,
  h: 1n,
  a: 0n,
  b: 7n,
  Gx: 0x79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798n,
  Gy: 0x483ada7726a3c4655da4fbfc0e1108a8fd17b448a68554199c47d08ffb10d4b8n
}, { p: ve, n: Ie, Gx: cd, Gy: ad, b: Pa } = _a, ht = 32, Fe = 64, Rr = {
  publicKey: ht + 1,
  publicKeyUncompressed: Fe + 1,
  signature: Fe,
  seed: ht + ht / 2
}, ud = (...e) => {
  "captureStackTrace" in Error && typeof Error.captureStackTrace == "function" && Error.captureStackTrace(...e);
}, X = (e = "") => {
  const t = new Error(e);
  throw ud(t, X), t;
}, fd = (e) => typeof e == "bigint", ld = (e) => typeof e == "string", dd = (e) => e instanceof Uint8Array || ArrayBuffer.isView(e) && e.constructor.name === "Uint8Array", Ot = (e, t, n = "") => {
  const r = dd(e), o = e?.length, s = t !== void 0;
  if (!r || s && o !== t) {
    const i = n && `"${n}" `, c = s ? ` of length ${t}` : "", a = r ? `length=${o}` : `type=${typeof e}`;
    X(i + "expected Uint8Array" + c + ", got " + a);
  }
  return e;
}, Be = (e) => new Uint8Array(e), Ha = (e, t) => e.toString(16).padStart(t, "0"), Va = (e) => Array.from(Ot(e)).map((t) => Ha(t, 2)).join(""), se = { _0: 48, _9: 57, A: 65, F: 70, a: 97, f: 102 }, Di = (e) => {
  if (e >= se._0 && e <= se._9)
    return e - se._0;
  if (e >= se.A && e <= se.F)
    return e - (se.A - 10);
  if (e >= se.a && e <= se.f)
    return e - (se.a - 10);
}, Da = (e) => {
  const t = "hex invalid";
  if (!ld(e))
    return X(t);
  const n = e.length, r = n / 2;
  if (n % 2)
    return X(t);
  const o = Be(r);
  for (let s = 0, i = 0; s < r; s++, i += 2) {
    const c = Di(e.charCodeAt(i)), a = Di(e.charCodeAt(i + 1));
    if (c === void 0 || a === void 0)
      return X(t);
    o[s] = c * 16 + a;
  }
  return o;
}, Ma = () => globalThis?.crypto, Mi = () => Ma()?.subtle ?? X("crypto.subtle must be defined, consider polyfill"), ee = (...e) => {
  const t = Be(e.reduce((r, o) => r + Ot(o).length, 0));
  let n = 0;
  return e.forEach((r) => {
    t.set(r, n), n += r.length;
  }), t;
}, no = (e = ht) => Ma().getRandomValues(Be(e)), Pn = BigInt, We = (e, t, n, r = "bad number: out of range") => fd(e) && t <= e && e < n ? e : X(r), P = (e, t = ve) => {
  const n = e % t;
  return n >= 0n ? n : t + n;
}, ce = (e) => P(e, Ie), Ka = (e, t) => {
  (e === 0n || t <= 0n) && X("no inverse n=" + e + " mod=" + t);
  let n = P(e, t), r = t, o = 0n, s = 1n;
  for (; n !== 0n; ) {
    const i = r / n, c = r % n, a = o - s * i;
    r = n, n = c, o = s, s = a;
  }
  return r === 1n ? P(o, t) : X("no inverse");
}, Ds = (e) => {
  const t = Ms[e];
  return typeof t != "function" && X("hashes." + e + " not set"), t;
}, mo = (e) => e instanceof xt ? e : X("Point expected"), Fa = (e) => P(P(e * e) * e + Pa), Ki = (e) => We(e, 0n, ve), hr = (e) => We(e, 1n, ve), qo = (e) => We(e, 1n, Ie), un = (e) => (e & 1n) === 0n, ro = (e) => Uint8Array.of(e), hd = (e) => ro(un(e) ? 2 : 3), Wa = (e) => {
  const t = Fa(hr(e));
  let n = 1n;
  for (let r = t, o = (ve + 1n) / 4n; o > 0n; o >>= 1n)
    o & 1n && (n = n * r % ve), r = r * r % ve;
  return P(n * n) === t ? n : X("sqrt invalid");
};
class xt {
  static BASE;
  static ZERO;
  X;
  Y;
  Z;
  constructor(t, n, r) {
    this.X = Ki(t), this.Y = hr(n), this.Z = Ki(r), Object.freeze(this);
  }
  static CURVE() {
    return _a;
  }
  /** Create 3d xyz point from 2d xy. (0, 0) => (0, 1, 0), not (0, 0, 1) */
  static fromAffine(t) {
    const { x: n, y: r } = t;
    return n === 0n && r === 0n ? Ne : new xt(n, r, 1n);
  }
  /** Convert Uint8Array or hex string to Point. */
  static fromBytes(t) {
    Ot(t);
    const { publicKey: n, publicKeyUncompressed: r } = Rr;
    let o;
    const s = t.length, i = t[0], c = t.subarray(1), a = fn(c, 0, ht);
    if (s === n && (i === 2 || i === 3)) {
      let u = Wa(a);
      const f = un(u);
      un(Pn(i)) !== f && (u = P(-u)), o = new xt(a, u, 1n);
    }
    return s === r && i === 4 && (o = new xt(a, fn(c, ht, Fe), 1n)), o ? o.assertValidity() : X("bad point: not on curve");
  }
  static fromHex(t) {
    return xt.fromBytes(Da(t));
  }
  get x() {
    return this.toAffine().x;
  }
  get y() {
    return this.toAffine().y;
  }
  /** Equality check: compare points P&Q. */
  equals(t) {
    const { X: n, Y: r, Z: o } = this, { X: s, Y: i, Z: c } = mo(t), a = P(n * c), u = P(s * o), f = P(r * c), l = P(i * o);
    return a === u && f === l;
  }
  is0() {
    return this.equals(Ne);
  }
  /** Flip point over y coordinate. */
  negate() {
    return new xt(this.X, P(-this.Y), this.Z);
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
    const { X: n, Y: r, Z: o } = this, { X: s, Y: i, Z: c } = mo(t), a = 0n, u = Pa;
    let f = 0n, l = 0n, h = 0n;
    const d = P(u * 3n);
    let w = P(n * s), g = P(r * i), y = P(o * c), S = P(n + r), v = P(s + i);
    S = P(S * v), v = P(w + g), S = P(S - v), v = P(n + o);
    let O = P(s + c);
    return v = P(v * O), O = P(w + y), v = P(v - O), O = P(r + o), f = P(i + c), O = P(O * f), f = P(g + y), O = P(O - f), h = P(a * v), f = P(d * y), h = P(f + h), f = P(g - h), h = P(g + h), l = P(f * h), g = P(w + w), g = P(g + w), y = P(a * y), v = P(d * v), g = P(g + y), y = P(w - y), y = P(a * y), v = P(v + y), w = P(g * v), l = P(l + w), w = P(O * v), f = P(S * f), f = P(f - w), w = P(S * g), h = P(O * h), h = P(h + w), new xt(f, l, h);
  }
  subtract(t) {
    return this.add(mo(t).negate());
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
      return Ne;
    if (qo(t), t === 1n)
      return this;
    if (this.equals(Oe))
      return Vd(t).p;
    let r = Ne, o = Oe;
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
    if (this.equals(Ne))
      return { x: 0n, y: 0n };
    if (r === 1n)
      return { x: t, y: n };
    const o = Ka(r, ve);
    return P(r * o) !== 1n && X("inverse invalid"), { x: P(t * o), y: P(n * o) };
  }
  /** Checks if the point is valid and on-curve. */
  assertValidity() {
    const { x: t, y: n } = this.toAffine();
    return hr(t), hr(n), P(n * n) === Fa(t) ? this : X("bad point: not on curve");
  }
  /** Converts point to 33/65-byte Uint8Array. */
  toBytes(t = !0) {
    const { x: n, y: r } = this.assertValidity().toAffine(), o = Rt(n);
    return t ? ee(hd(r), o) : ee(ro(4), o, Rt(r));
  }
  toHex(t) {
    return Va(this.toBytes(t));
  }
}
const Oe = new xt(cd, ad, 1n), Ne = new xt(0n, 1n, 0n);
xt.BASE = Oe;
xt.ZERO = Ne;
const pd = (e, t, n) => Oe.multiply(t, !1).add(e.multiply(n, !1)).assertValidity(), $e = (e) => Pn("0x" + (Va(e) || "0")), fn = (e, t, n) => $e(e.subarray(t, n)), gd = 2n ** 256n, Rt = (e) => Da(Ha(We(e, 0n, gd), Fe)), za = (e) => {
  const t = $e(Ot(e, ht, "secret key"));
  return We(t, 1n, Ie, "invalid secret key: outside of range");
}, Ga = (e) => e > Ie >> 1n, wd = (e) => {
  [0, 1, 2, 3].includes(e) || X("recovery id must be valid and present");
}, yd = (e) => {
  e != null && !Fi.includes(e) && X(`Signature format must be one of: ${Fi.join(", ")}`), e === ja && X('Signature format "der" is not supported: switch to noble-curves');
}, md = (e, t = ln) => {
  yd(t);
  const n = Rr.signature, r = n + 1;
  let o = `Signature format "${t}" expects Uint8Array with length `;
  t === ln && e.length !== n && X(o + n), t === Lr && e.length !== r && X(o + r);
};
class Nr {
  r;
  s;
  recovery;
  constructor(t, n, r) {
    this.r = qo(t), this.s = qo(n), r != null && (this.recovery = r), Object.freeze(this);
  }
  static fromBytes(t, n = ln) {
    md(t, n);
    let r;
    n === Lr && (r = t[0], t = t.subarray(1));
    const o = fn(t, 0, ht), s = fn(t, ht, Fe);
    return new Nr(o, s, r);
  }
  addRecoveryBit(t) {
    return new Nr(this.r, this.s, t);
  }
  hasHighS() {
    return Ga(this.s);
  }
  toBytes(t = ln) {
    const { r: n, s: r, recovery: o } = this, s = ee(Rt(n), Rt(r));
    return t === Lr ? (wd(o), ee(Uint8Array.of(o), s)) : s;
  }
}
const qa = (e) => {
  const t = e.length * 8 - 256;
  t > 1024 && X("msg invalid");
  const n = $e(e);
  return t > 0 ? n >> Pn(t) : n;
}, bd = (e) => ce(qa(Ot(e))), ln = "compact", Lr = "recovered", ja = "der", Fi = [ln, Lr, ja], Wi = {
  lowS: !0,
  prehash: !0,
  format: ln,
  extraEntropy: !1
}, zi = "SHA-256", Ms = {
  hmacSha256Async: async (e, t) => {
    const n = Mi(), r = "HMAC", o = await n.importKey("raw", e, { name: r, hash: { name: zi } }, !1, ["sign"]);
    return Be(await n.sign(r, o, t));
  },
  hmacSha256: void 0,
  sha256Async: async (e) => Be(await Mi().digest(zi, e)),
  sha256: void 0
}, Ed = (e, t, n) => (Ot(e, void 0, "message"), t.prehash ? n ? Ms.sha256Async(e) : Ds("sha256")(e) : e), xd = Be(0), Sd = ro(0), vd = ro(1), Td = 1e3, Ad = "drbg: tried max amount of iterations", kd = (e, t) => {
  let n = Be(ht), r = Be(ht), o = 0;
  const s = () => {
    n.fill(1), r.fill(0);
  }, i = (...f) => Ds("hmacSha256")(r, ee(n, ...f)), c = (f = xd) => {
    r = i(Sd, f), n = i(), f.length !== 0 && (r = i(vd, f), n = i());
  }, a = () => (o++ >= Td && X(Ad), n = i(), n);
  s(), c(e);
  let u;
  for (; !(u = t(a())); )
    c();
  return s(), u;
}, Id = (e, t, n, r) => {
  let { lowS: o, extraEntropy: s } = n;
  const i = Rt, c = bd(e), a = i(c), u = za(t), f = [i(u), a];
  if (s != null && s !== !1) {
    const w = s === !0 ? no(ht) : s;
    f.push(Ot(w, void 0, "extraEntropy"));
  }
  const l = ee(...f), h = c;
  return r(l, (w) => {
    const g = qa(w);
    if (!(1n <= g && g < Ie))
      return;
    const y = Ka(g, Ie), S = Oe.multiply(g).toAffine(), v = ce(S.x);
    if (v === 0n)
      return;
    const O = ce(y * ce(h + v * u));
    if (O === 0n)
      return;
    let N = (S.x === v ? 0 : 2) | Number(S.y & 1n), U = O;
    return o && Ga(O) && (U = ce(-O), N ^= 1), new Nr(v, U, N).toBytes(n.format);
  });
}, Bd = (e) => {
  const t = {};
  return Object.keys(Wi).forEach((n) => {
    t[n] = e[n] ?? Wi[n];
  }), t;
}, Od = (e, t, n = {}) => (n = Bd(n), e = Ed(e, n, !1), Id(e, t, n, kd)), $d = (e = no(Rr.seed)) => {
  Ot(e), (e.length < Rr.seed || e.length > 1024) && X("expected 40-1024b");
  const t = P($e(e), Ie - 1n);
  return Rt(t + 1n);
}, Ud = (e) => (t) => {
  const n = $d(t);
  return { secretKey: n, publicKey: e(n) };
}, Ya = (e) => Uint8Array.from("BIP0340/" + e, (t) => t.charCodeAt(0)), Za = "aux", Xa = "nonce", Qa = "challenge", jo = (e, ...t) => {
  const n = Ds("sha256"), r = n(Ya(e));
  return n(ee(r, r, ...t));
}, Yo = async (e, ...t) => {
  const n = Ms.sha256Async, r = await n(Ya(e));
  return await n(ee(r, r, ...t));
}, Ks = (e) => {
  const t = za(e), n = Oe.multiply(t), { x: r, y: o } = n.assertValidity().toAffine(), s = un(o) ? t : ce(-t), i = Rt(r);
  return { d: s, px: i };
}, Fs = (e) => ce($e(e)), Ja = (...e) => Fs(jo(Qa, ...e)), tu = async (...e) => Fs(await Yo(Qa, ...e)), eu = (e) => Ks(e).px, Rd = Ud(eu), nu = (e, t, n) => {
  const { px: r, d: o } = Ks(t);
  return { m: Ot(e), px: r, d: o, a: Ot(n, ht) };
}, ru = (e) => {
  const t = Fs(e);
  t === 0n && X("sign failed: k is zero");
  const { px: n, d: r } = Ks(Rt(t));
  return { rx: n, k: r };
}, ou = (e, t, n, r) => ee(t, Rt(ce(e + n * r))), su = "invalid signature produced", Nd = (e, t, n = no(ht)) => {
  const { m: r, px: o, d: s, a: i } = nu(e, t, n), c = jo(Za, i), a = Rt(s ^ $e(c)), u = jo(Xa, a, o, r), { rx: f, k: l } = ru(u), h = Ja(f, o, r), d = ou(l, f, h, s);
  return cu(d, r, o) || X(su), d;
}, Ld = async (e, t, n = no(ht)) => {
  const { m: r, px: o, d: s, a: i } = nu(e, t, n), c = await Yo(Za, i), a = Rt(s ^ $e(c)), u = await Yo(Xa, a, o, r), { rx: f, k: l } = ru(u), h = await tu(f, o, r), d = ou(l, f, h, s);
  return await au(d, r, o) || X(su), d;
}, Cd = (e, t) => e instanceof Promise ? e.then(t) : t(e), iu = (e, t, n, r) => {
  const o = Ot(e, Fe, "signature"), s = Ot(t, void 0, "message"), i = Ot(n, ht, "publicKey");
  try {
    const c = $e(i), a = Wa(c), u = un(a) ? a : P(-a), f = new xt(c, u, 1n).assertValidity(), l = Rt(f.toAffine().x), h = fn(o, 0, ht);
    We(h, 1n, ve);
    const d = fn(o, ht, Fe);
    We(d, 1n, Ie);
    const w = ee(Rt(h), l, s);
    return Cd(r(w), (g) => {
      const { x: y, y: S } = pd(f, d, ce(-g)).toAffine();
      return !(!un(S) || y !== h);
    });
  } catch {
    return !1;
  }
}, cu = (e, t, n) => iu(e, t, n, Ja), au = async (e, t, n) => iu(e, t, n, tu), _d = {
  keygen: Rd,
  getPublicKey: eu,
  sign: Nd,
  verify: cu,
  signAsync: Ld,
  verifyAsync: au
}, Cr = 8, Pd = 256, uu = Math.ceil(Pd / Cr) + 1, Zo = 2 ** (Cr - 1), Hd = () => {
  const e = [];
  let t = Oe, n = t;
  for (let r = 0; r < uu; r++) {
    n = t, e.push(n);
    for (let o = 1; o < Zo; o++)
      n = n.add(t), e.push(n);
    t = n.double();
  }
  return e;
};
let Gi;
const qi = (e, t) => {
  const n = t.negate();
  return e ? n : t;
}, Vd = (e) => {
  const t = Gi || (Gi = Hd());
  let n = Ne, r = Oe;
  const o = 2 ** Cr, s = o, i = Pn(o - 1), c = Pn(Cr);
  for (let a = 0; a < uu; a++) {
    let u = Number(e & i);
    e >>= c, u > Zo && (u -= s, e += 1n);
    const f = a * Zo, l = f, h = f + Math.abs(u) - 1, d = a % 2 !== 0, w = u < 0;
    u === 0 ? r = r.add(qi(d, t[l])) : n = n.add(qi(w, t[h]));
  }
  return e !== 0n && X("invalid wnaf"), { p: n, f: r };
};
function Dd(e, t, n) {
  return e & t ^ ~e & n;
}
function Md(e, t, n) {
  return e & t ^ e & n ^ t & n;
}
class Kd {
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
    this.blockLen = t, this.outputLen = n, this.padOffset = r, this.isLE = o, this.buffer = new Uint8Array(t), this.view = yo(this.buffer);
  }
  update(t) {
    Br(this), et(t);
    const { view: n, buffer: r, blockLen: o } = this, s = t.length;
    for (let i = 0; i < s; ) {
      const c = Math.min(o - this.pos, s - i);
      if (c === o) {
        const a = yo(t);
        for (; o <= s - i; i += o)
          this.process(a, i);
        continue;
      }
      r.set(t.subarray(i, i + c), this.pos), this.pos += c, i += c, this.pos === o && (this.process(n, 0), this.pos = 0);
    }
    return this.length += t.length, this.roundClean(), this;
  }
  digestInto(t) {
    Br(this), Xl(t, this), this.finished = !0;
    const { buffer: n, view: r, blockLen: o, isLE: s } = this;
    let { pos: i } = this;
    n[i++] = 128, Or(this.buffer.subarray(i)), this.padOffset > o - i && (this.process(r, 0), i = 0);
    for (let l = i; l < o; l++)
      n[l] = 0;
    r.setBigUint64(o - 8, BigInt(this.length * 8), s), this.process(r, 0);
    const c = yo(t), a = this.outputLen;
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
const we = /* @__PURE__ */ Uint32Array.from([
  1779033703,
  3144134277,
  1013904242,
  2773480762,
  1359893119,
  2600822924,
  528734635,
  1541459225
]), Fd = /* @__PURE__ */ Uint32Array.from([
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
]), ye = /* @__PURE__ */ new Uint32Array(64);
class Wd extends Kd {
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
      ye[l] = t.getUint32(n, !1);
    for (let l = 16; l < 64; l++) {
      const h = ye[l - 15], d = ye[l - 2], w = Yt(h, 7) ^ Yt(h, 18) ^ h >>> 3, g = Yt(d, 17) ^ Yt(d, 19) ^ d >>> 10;
      ye[l] = g + ye[l - 7] + w + ye[l - 16] | 0;
    }
    let { A: r, B: o, C: s, D: i, E: c, F: a, G: u, H: f } = this;
    for (let l = 0; l < 64; l++) {
      const h = Yt(c, 6) ^ Yt(c, 11) ^ Yt(c, 25), d = f + h + Dd(c, a, u) + Fd[l] + ye[l] | 0, g = (Yt(r, 2) ^ Yt(r, 13) ^ Yt(r, 22)) + Md(r, o, s) | 0;
      f = u, u = a, a = c, c = i + d | 0, i = s, s = o, o = r, r = d + g | 0;
    }
    r = r + this.A | 0, o = o + this.B | 0, s = s + this.C | 0, i = i + this.D | 0, c = c + this.E | 0, a = a + this.F | 0, u = u + this.G | 0, f = f + this.H | 0, this.set(r, o, s, i, c, a, u, f);
  }
  roundClean() {
    Or(ye);
  }
  destroy() {
    this.set(0, 0, 0, 0, 0, 0, 0, 0), Or(this.buffer);
  }
}
class zd extends Wd {
  // We cannot use array here since array allows indexing by variable
  // which means optimizer/compiler cannot use registers.
  A = we[0] | 0;
  B = we[1] | 0;
  C = we[2] | 0;
  D = we[3] | 0;
  E = we[4] | 0;
  F = we[5] | 0;
  G = we[6] | 0;
  H = we[7] | 0;
  constructor() {
    super(32);
  }
}
const Xo = /* @__PURE__ */ Jl(
  () => new zd(),
  /* @__PURE__ */ td(1)
);
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const vt = /* @__PURE__ */ BigInt(0), Et = /* @__PURE__ */ BigInt(1), He = /* @__PURE__ */ BigInt(2), fu = /* @__PURE__ */ BigInt(3), lu = /* @__PURE__ */ BigInt(4), du = /* @__PURE__ */ BigInt(5), Gd = /* @__PURE__ */ BigInt(7), hu = /* @__PURE__ */ BigInt(8), qd = /* @__PURE__ */ BigInt(9), pu = /* @__PURE__ */ BigInt(16);
function Mt(e, t) {
  const n = e % t;
  return n >= vt ? n : t + n;
}
function Lt(e, t, n) {
  let r = e;
  for (; t-- > vt; )
    r *= r, r %= n;
  return r;
}
function ji(e, t) {
  if (e === vt)
    throw new Error("invert: expected non-zero number");
  if (t <= vt)
    throw new Error("invert: expected positive modulus, got " + t);
  let n = Mt(e, t), r = t, o = vt, s = Et;
  for (; n !== vt; ) {
    const c = r / n, a = r % n, u = o - s * c;
    r = n, n = a, o = s, s = u;
  }
  if (r !== Et)
    throw new Error("invert: does not exist");
  return Mt(o, t);
}
function Ws(e, t, n) {
  if (!e.eql(e.sqr(t), n))
    throw new Error("Cannot find square root");
}
function gu(e, t) {
  const n = (e.ORDER + Et) / lu, r = e.pow(t, n);
  return Ws(e, r, t), r;
}
function jd(e, t) {
  const n = (e.ORDER - du) / hu, r = e.mul(t, He), o = e.pow(r, n), s = e.mul(t, o), i = e.mul(e.mul(s, He), o), c = e.mul(s, e.sub(i, e.ONE));
  return Ws(e, c, t), c;
}
function Yd(e) {
  const t = oo(e), n = wu(e), r = n(t, t.neg(t.ONE)), o = n(t, r), s = n(t, t.neg(r)), i = (e + Gd) / pu;
  return (c, a) => {
    let u = c.pow(a, i), f = c.mul(u, r);
    const l = c.mul(u, o), h = c.mul(u, s), d = c.eql(c.sqr(f), a), w = c.eql(c.sqr(l), a);
    u = c.cmov(u, f, d), f = c.cmov(h, l, w);
    const g = c.eql(c.sqr(f), a), y = c.cmov(u, f, g);
    return Ws(c, y, a), y;
  };
}
function wu(e) {
  if (e < fu)
    throw new Error("sqrt is not defined for small field");
  let t = e - Et, n = 0;
  for (; t % He === vt; )
    t /= He, n++;
  let r = He;
  const o = oo(e);
  for (; Yi(o, r) === 1; )
    if (r++ > 1e3)
      throw new Error("Cannot find square root: probably non-prime P");
  if (n === 1)
    return gu;
  let s = o.pow(r, t);
  const i = (t + Et) / He;
  return function(a, u) {
    if (a.is0(u))
      return u;
    if (Yi(a, u) !== 1)
      throw new Error("Cannot find square root");
    let f = n, l = a.mul(a.ONE, s), h = a.pow(u, t), d = a.pow(u, i);
    for (; !a.eql(h, a.ONE); ) {
      if (a.is0(h))
        return a.ZERO;
      let w = 1, g = a.sqr(h);
      for (; !a.eql(g, a.ONE); )
        if (w++, g = a.sqr(g), w === f)
          throw new Error("Cannot find square root");
      const y = Et << BigInt(f - w - 1), S = a.pow(l, y);
      f = w, l = a.sqr(S), h = a.mul(h, l), d = a.mul(d, S);
    }
    return d;
  };
}
function Zd(e) {
  return e % lu === fu ? gu : e % hu === du ? jd : e % pu === qd ? Yd(e) : wu(e);
}
const Xd = [
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
function Qd(e) {
  const t = {
    ORDER: "bigint",
    BYTES: "number",
    BITS: "number"
  }, n = Xd.reduce((r, o) => (r[o] = "function", r), t);
  return Vs(e, n), e;
}
function Jd(e, t, n) {
  if (n < vt)
    throw new Error("invalid exponent, negatives unsupported");
  if (n === vt)
    return e.ONE;
  if (n === Et)
    return t;
  let r = e.ONE, o = t;
  for (; n > vt; )
    n & Et && (r = e.mul(r, o)), o = e.sqr(o), n >>= Et;
  return r;
}
function yu(e, t, n = !1) {
  const r = new Array(t.length).fill(n ? e.ZERO : void 0), o = t.reduce((i, c, a) => e.is0(c) ? i : (r[a] = i, e.mul(i, c)), e.ONE), s = e.inv(o);
  return t.reduceRight((i, c, a) => e.is0(c) ? i : (r[a] = e.mul(i, r[a]), e.mul(i, c)), s), r;
}
function Yi(e, t) {
  const n = (e.ORDER - Et) / He, r = e.pow(t, n), o = e.eql(r, e.ONE), s = e.eql(r, e.ZERO), i = e.eql(r, e.neg(e.ONE));
  if (!o && !s && !i)
    throw new Error("invalid Legendre symbol result");
  return o ? 1 : s ? 0 : -1;
}
function th(e, t) {
  t !== void 0 && Ke(t);
  const n = t !== void 0 ? t : e.toString(2).length, r = Math.ceil(n / 8);
  return { nBitLength: n, nByteLength: r };
}
class eh {
  ORDER;
  BITS;
  BYTES;
  isLE;
  ZERO = vt;
  ONE = Et;
  _lengths;
  _sqrt;
  // cached sqrt
  _mod;
  constructor(t, n = {}) {
    if (t <= vt)
      throw new Error("invalid field: expected ORDER > 0, got " + t);
    let r;
    this.isLE = !1, n != null && typeof n == "object" && (typeof n.BITS == "number" && (r = n.BITS), typeof n.sqrt == "function" && (this.sqrt = n.sqrt), typeof n.isLE == "boolean" && (this.isLE = n.isLE), n.allowedLengths && (this._lengths = n.allowedLengths?.slice()), typeof n.modFromBytes == "boolean" && (this._mod = n.modFromBytes));
    const { nBitLength: o, nByteLength: s } = th(t, r);
    if (s > 2048)
      throw new Error("invalid field: expected ORDER of <= 2048 bytes");
    this.ORDER = t, this.BITS = o, this.BYTES = s, this._sqrt = void 0, Object.preventExtensions(this);
  }
  create(t) {
    return Mt(t, this.ORDER);
  }
  isValid(t) {
    if (typeof t != "bigint")
      throw new Error("invalid field element: expected bigint, got " + typeof t);
    return vt <= t && t < this.ORDER;
  }
  is0(t) {
    return t === vt;
  }
  // is valid and invertible
  isValidNot0(t) {
    return !this.is0(t) && this.isValid(t);
  }
  isOdd(t) {
    return (t & Et) === Et;
  }
  neg(t) {
    return Mt(-t, this.ORDER);
  }
  eql(t, n) {
    return t === n;
  }
  sqr(t) {
    return Mt(t * t, this.ORDER);
  }
  add(t, n) {
    return Mt(t + n, this.ORDER);
  }
  sub(t, n) {
    return Mt(t - n, this.ORDER);
  }
  mul(t, n) {
    return Mt(t * n, this.ORDER);
  }
  pow(t, n) {
    return Jd(this, t, n);
  }
  div(t, n) {
    return Mt(t * ji(n, this.ORDER), this.ORDER);
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
    return ji(t, this.ORDER);
  }
  sqrt(t) {
    return this._sqrt || (this._sqrt = Zd(this.ORDER)), this._sqrt(this, t);
  }
  toBytes(t) {
    return this.isLE ? Ca(t, this.BYTES) : Ps(t, this.BYTES);
  }
  fromBytes(t, n = !1) {
    et(t);
    const { _lengths: r, BYTES: o, isLE: s, ORDER: i, _mod: c } = this;
    if (r) {
      if (!r.includes(t.length) || t.length > o)
        throw new Error("Field.fromBytes: expected " + r + " bytes, got " + t.length);
      const u = new Uint8Array(o);
      u.set(t, s ? 0 : u.length - t.length), t = u;
    }
    if (t.length !== o)
      throw new Error("Field.fromBytes: expected " + o + " bytes, got " + t.length);
    let a = s ? La(t) : yn(t);
    if (c && (a = Mt(a, i)), !n && !this.isValid(a))
      throw new Error("invalid field element: outside of range 0..ORDER");
    return a;
  }
  // TODO: we don't need it here, move out to separate fn
  invertBatch(t) {
    return yu(this, t);
  }
  // We can't move this out because Fp6, Fp12 implement it
  // and it's unclear what to return in there.
  cmov(t, n, r) {
    return r ? n : t;
  }
}
function oo(e, t = {}) {
  return new eh(e, t);
}
function mu(e) {
  if (typeof e != "bigint")
    throw new Error("field order must be bigint");
  const t = e.toString(2).length;
  return Math.ceil(t / 8);
}
function bu(e) {
  const t = mu(e);
  return t + Math.ceil(t / 2);
}
function Eu(e, t, n = !1) {
  et(e);
  const r = e.length, o = mu(t), s = bu(t);
  if (r < 16 || r < s || r > 1024)
    throw new Error("expected " + s + "-1024 bytes of input, got " + r);
  const i = n ? La(e) : yn(e), c = Mt(i, t - Et) + Et;
  return n ? Ca(c, o) : Ps(c, o);
}
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const dn = /* @__PURE__ */ BigInt(0), Ve = /* @__PURE__ */ BigInt(1);
function _r(e, t) {
  const n = t.negate();
  return e ? n : t;
}
function Zi(e, t) {
  const n = yu(e.Fp, t.map((r) => r.Z));
  return t.map((r, o) => e.fromAffine(r.toAffine(n[o])));
}
function xu(e, t) {
  if (!Number.isSafeInteger(e) || e <= 0 || e > t)
    throw new Error("invalid window size, expected [1.." + t + "], got W=" + e);
}
function bo(e, t) {
  xu(e, t);
  const n = Math.ceil(t / e) + 1, r = 2 ** (e - 1), o = 2 ** e, s = Hs(e), i = BigInt(e);
  return { windows: n, windowSize: r, mask: s, maxNumber: o, shiftBy: i };
}
function Xi(e, t, n) {
  const { windowSize: r, mask: o, maxNumber: s, shiftBy: i } = n;
  let c = Number(e & o), a = e >> i;
  c > r && (c -= s, a += Ve);
  const u = t * r, f = u + Math.abs(c) - 1, l = c === 0, h = c < 0, d = t % 2 !== 0;
  return { nextN: a, offset: f, isZero: l, isNeg: h, isNegF: d, offsetF: u };
}
const Eo = /* @__PURE__ */ new WeakMap(), Su = /* @__PURE__ */ new WeakMap();
function xo(e) {
  return Su.get(e) || 1;
}
function Qi(e) {
  if (e !== dn)
    throw new Error("invalid wNAF");
}
class nh {
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
    for (; n > dn; )
      n & Ve && (r = r.add(o)), o = o.double(), n >>= Ve;
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
    const { windows: r, windowSize: o } = bo(n, this.bits), s = [];
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
    const i = bo(t, this.bits);
    for (let c = 0; c < i.windows; c++) {
      const { nextN: a, offset: u, isZero: f, isNeg: l, isNegF: h, offsetF: d } = Xi(r, c, i);
      r = a, f ? s = s.add(_r(h, n[d])) : o = o.add(_r(l, n[u]));
    }
    return Qi(r), { p: o, f: s };
  }
  /**
   * Implements ec unsafe (non const-time) multiplication using precomputed tables and w-ary non-adjacent form.
   * @param acc accumulator point to add result of multiplication
   * @returns point
   */
  wNAFUnsafe(t, n, r, o = this.ZERO) {
    const s = bo(t, this.bits);
    for (let i = 0; i < s.windows && r !== dn; i++) {
      const { nextN: c, offset: a, isZero: u, isNeg: f } = Xi(r, i, s);
      if (r = c, !u) {
        const l = n[a];
        o = o.add(f ? l.negate() : l);
      }
    }
    return Qi(r), o;
  }
  getPrecomputes(t, n, r) {
    let o = Eo.get(n);
    return o || (o = this.precomputeWindow(n, t), t !== 1 && (typeof r == "function" && (o = r(o)), Eo.set(n, o))), o;
  }
  cached(t, n, r) {
    const o = xo(t);
    return this.wNAF(o, this.getPrecomputes(o, t, r), n);
  }
  unsafe(t, n, r, o) {
    const s = xo(t);
    return s === 1 ? this._unsafeLadder(t, n, o) : this.wNAFUnsafe(s, this.getPrecomputes(s, t, r), n, o);
  }
  // We calculate precomputes for elliptic curve point multiplication
  // using windowed method. This specifies window size and
  // stores precomputed values. Usually only base point would be precomputed.
  createCache(t, n) {
    xu(n, this.bits), Su.set(t, n), Eo.delete(t);
  }
  hasCache(t) {
    return xo(t) !== 1;
  }
}
function rh(e, t, n, r) {
  let o = t, s = e.ZERO, i = e.ZERO;
  for (; n > dn || r > dn; )
    n & Ve && (s = s.add(o)), r & Ve && (i = i.add(o)), o = o.double(), n >>= Ve, r >>= Ve;
  return { p1: s, p2: i };
}
function Ji(e, t, n) {
  if (t) {
    if (t.ORDER !== e)
      throw new Error("Field.ORDER must match order: Fp == p, Fn == n");
    return Qd(t), t;
  } else
    return oo(e, { isLE: n });
}
function oh(e, t, n = {}, r) {
  if (r === void 0 && (r = e === "edwards"), !t || typeof t != "object")
    throw new Error(`expected valid ${e} CURVE object`);
  for (const a of ["p", "n", "h"]) {
    const u = t[a];
    if (!(typeof u == "bigint" && u > dn))
      throw new Error(`CURVE.${a} must be positive bigint`);
  }
  const o = Ji(t.p, n.Fp, r), s = Ji(t.n, n.Fn, r), c = ["Gx", "Gy", "a", "b"];
  for (const a of c)
    if (!o.isValid(t[a]))
      throw new Error(`CURVE.${a} must be valid field element of CURVE.Fp`);
  return t = Object.freeze(Object.assign({}, t)), { CURVE: t, Fp: o, Fn: s };
}
function vu(e, t) {
  return function(r) {
    const o = e(r);
    return { secretKey: o, publicKey: t(o) };
  };
}
class Tu {
  oHash;
  iHash;
  blockLen;
  outputLen;
  finished = !1;
  destroyed = !1;
  constructor(t, n) {
    if ($a(t), et(n, void 0, "key"), this.iHash = t.create(), typeof this.iHash.update != "function")
      throw new Error("Expected instance of class which extends utils.Hash");
    this.blockLen = this.iHash.blockLen, this.outputLen = this.iHash.outputLen;
    const r = this.blockLen, o = new Uint8Array(r);
    o.set(n.length > r ? t.create().update(n).digest() : n);
    for (let s = 0; s < o.length; s++)
      o[s] ^= 54;
    this.iHash.update(o), this.oHash = t.create();
    for (let s = 0; s < o.length; s++)
      o[s] ^= 106;
    this.oHash.update(o), Or(o);
  }
  update(t) {
    return Br(this), this.iHash.update(t), this;
  }
  digestInto(t) {
    Br(this), et(t, this.outputLen, "output"), this.finished = !0, this.iHash.digestInto(t), this.oHash.update(t), this.oHash.digestInto(t), this.destroy();
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
const Au = (e, t, n) => new Tu(e, t).update(n).digest();
Au.create = (e, t) => new Tu(e, t);
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const tc = (e, t) => (e + (e >= 0 ? t : -t) / ku) / t;
function sh(e, t, n) {
  const [[r, o], [s, i]] = t, c = tc(i * e, n), a = tc(-o * e, n);
  let u = e - c * r - a * s, f = -c * o - a * i;
  const l = u < ae, h = f < ae;
  l && (u = -u), h && (f = -f);
  const d = Hs(Math.ceil(sd(n) / 2)) + Je;
  if (u < ae || u >= d || f < ae || f >= d)
    throw new Error("splitScalar (endomorphism): failed, k=" + e);
  return { k1neg: l, k1: u, k2neg: h, k2: f };
}
function Qo(e) {
  if (!["compact", "recovered", "der"].includes(e))
    throw new Error('Signature format must be "compact", "recovered", or "der"');
  return e;
}
function So(e, t) {
  const n = {};
  for (let r of Object.keys(t))
    n[r] = e[r] === void 0 ? t[r] : e[r];
  return Ur(n.lowS, "lowS"), Ur(n.prehash, "prehash"), n.format !== void 0 && Qo(n.format), n;
}
class ih extends Error {
  constructor(t = "") {
    super(t);
  }
}
const be = {
  // asn.1 DER encoding utils
  Err: ih,
  // Basic building block is TLV (Tag-Length-Value)
  _tlv: {
    encode: (e, t) => {
      const { Err: n } = be;
      if (e < 0 || e > 256)
        throw new n("tlv.encode: wrong tag");
      if (t.length & 1)
        throw new n("tlv.encode: unpadded data");
      const r = t.length / 2, o = er(r);
      if (o.length / 2 & 128)
        throw new n("tlv.encode: long form length too big");
      const s = r > 127 ? er(o.length / 2 | 128) : "";
      return er(e) + s + o + t;
    },
    // v - value, l - left bytes (unparsed)
    decode(e, t) {
      const { Err: n } = be;
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
      const { Err: t } = be;
      if (e < ae)
        throw new t("integer: negative integers are not allowed");
      let n = er(e);
      if (Number.parseInt(n[0], 16) & 8 && (n = "00" + n), n.length & 1)
        throw new t("unexpected DER parsing assertion: unpadded hex");
      return n;
    },
    decode(e) {
      const { Err: t } = be;
      if (e[0] & 128)
        throw new t("invalid signature integer: negative");
      if (e[0] === 0 && !(e[1] & 128))
        throw new t("invalid signature integer: unnecessary leading zero");
      return yn(e);
    }
  },
  toSig(e) {
    const { Err: t, _int: n, _tlv: r } = be, o = et(e, void 0, "signature"), { v: s, l: i } = r.decode(48, o);
    if (i.length)
      throw new t("invalid signature: left bytes after parsing");
    const { v: c, l: a } = r.decode(2, s), { v: u, l: f } = r.decode(2, a);
    if (f.length)
      throw new t("invalid signature: left bytes after parsing");
    return { r: n.decode(c), s: n.decode(u) };
  },
  hexFromSig(e) {
    const { _tlv: t, _int: n } = be, r = t.encode(2, n.encode(e.r)), o = t.encode(2, n.encode(e.s)), s = r + o;
    return t.encode(48, s);
  }
}, ae = BigInt(0), Je = BigInt(1), ku = BigInt(2), nr = BigInt(3), ch = BigInt(4);
function ah(e, t = {}) {
  const n = oh("weierstrass", e, t), { Fp: r, Fn: o } = n;
  let s = n.CURVE;
  const { h: i, n: c } = s;
  Vs(t, {}, {
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
  const u = Bu(r, o);
  function f() {
    if (!r.isOdd)
      throw new Error("compression is not supported: Field does not have .isOdd()");
  }
  function l(_, b, m) {
    const { x: p, y: E } = b.toAffine(), A = r.toBytes(p);
    if (Ur(m, "isCompressed"), m) {
      f();
      const I = !r.isOdd(E);
      return Qt(Iu(I), A);
    } else
      return Qt(Uint8Array.of(4), A, r.toBytes(E));
  }
  function h(_) {
    et(_, void 0, "Point");
    const { publicKey: b, publicKeyUncompressed: m } = u, p = _.length, E = _[0], A = _.subarray(1);
    if (p === b && (E === 2 || E === 3)) {
      const I = r.fromBytes(A);
      if (!r.isValid(I))
        throw new Error("bad point: is not on curve, wrong x");
      const k = g(I);
      let T;
      try {
        T = r.sqrt(k);
      } catch (F) {
        const H = F instanceof Error ? ": " + F.message : "";
        throw new Error("bad point: is not on curve, sqrt error" + H);
      }
      f();
      const B = r.isOdd(T);
      return (E & 1) === 1 !== B && (T = r.neg(T)), { x: I, y: T };
    } else if (p === m && E === 4) {
      const I = r.BYTES, k = r.fromBytes(A.subarray(0, I)), T = r.fromBytes(A.subarray(I, I * 2));
      if (!y(k, T))
        throw new Error("bad point: is not on curve");
      return { x: k, y: T };
    } else
      throw new Error(`bad point: got length ${p}, expected compressed=${b} or uncompressed=${m}`);
  }
  const d = t.toBytes || l, w = t.fromBytes || h;
  function g(_) {
    const b = r.sqr(_), m = r.mul(b, _);
    return r.add(r.add(m, r.mul(_, s.a)), s.b);
  }
  function y(_, b) {
    const m = r.sqr(b), p = g(_);
    return r.eql(m, p);
  }
  if (!y(s.Gx, s.Gy))
    throw new Error("bad curve params: generator point");
  const S = r.mul(r.pow(s.a, nr), ch), v = r.mul(r.sqr(s.b), BigInt(27));
  if (r.is0(r.add(S, v)))
    throw new Error("bad curve params: a or b");
  function O(_, b, m = !1) {
    if (!r.isValid(b) || m && r.is0(b))
      throw new Error(`bad point coordinate ${_}`);
    return b;
  }
  function N(_) {
    if (!(_ instanceof C))
      throw new Error("Weierstrass Point expected");
  }
  function U(_) {
    if (!a || !a.basises)
      throw new Error("no endo");
    return sh(_, a.basises, o.ORDER);
  }
  const W = Vi((_, b) => {
    const { X: m, Y: p, Z: E } = _;
    if (r.eql(E, r.ONE))
      return { x: m, y: p };
    const A = _.is0();
    b == null && (b = A ? r.ONE : r.inv(E));
    const I = r.mul(m, b), k = r.mul(p, b), T = r.mul(E, b);
    if (A)
      return { x: r.ZERO, y: r.ZERO };
    if (!r.eql(T, r.ONE))
      throw new Error("invZ was invalid");
    return { x: I, y: k };
  }), x = Vi((_) => {
    if (_.is0()) {
      if (t.allowInfinityPoint && !r.is0(_.Y))
        return;
      throw new Error("bad point: ZERO");
    }
    const { x: b, y: m } = _.toAffine();
    if (!r.isValid(b) || !r.isValid(m))
      throw new Error("bad point: x or y not field elements");
    if (!y(b, m))
      throw new Error("bad point: equation left != right");
    if (!_.isTorsionFree())
      throw new Error("bad point: not in prime-order subgroup");
    return !0;
  });
  function Q(_, b, m, p, E) {
    return m = new C(r.mul(m.X, _), m.Y, m.Z), b = _r(p, b), m = _r(E, m), b.add(m);
  }
  class C {
    // base / generator point
    static BASE = new C(s.Gx, s.Gy, r.ONE);
    // zero / infinity / identity point
    static ZERO = new C(r.ZERO, r.ONE, r.ZERO);
    // 0, 1, 0
    // math field
    static Fp = r;
    // scalar field
    static Fn = o;
    X;
    Y;
    Z;
    /** Does NOT validate if the point is valid. Use `.assertValidity()`. */
    constructor(b, m, p) {
      this.X = O("x", b), this.Y = O("y", m, !0), this.Z = O("z", p), Object.freeze(this);
    }
    static CURVE() {
      return s;
    }
    /** Does NOT validate if the point is valid. Use `.assertValidity()`. */
    static fromAffine(b) {
      const { x: m, y: p } = b || {};
      if (!b || !r.isValid(m) || !r.isValid(p))
        throw new Error("invalid affine point");
      if (b instanceof C)
        throw new Error("projective point not allowed");
      return r.is0(m) && r.is0(p) ? C.ZERO : new C(m, p, r.ONE);
    }
    static fromBytes(b) {
      const m = C.fromAffine(w(et(b, void 0, "point")));
      return m.assertValidity(), m;
    }
    static fromHex(b) {
      return C.fromBytes($r(b));
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
    precompute(b = 8, m = !0) {
      return gt.createCache(this, b), m || this.multiply(nr), this;
    }
    // TODO: return `this`
    /** A point on curve is valid if it conforms to equation. */
    assertValidity() {
      x(this);
    }
    hasEvenY() {
      const { y: b } = this.toAffine();
      if (!r.isOdd)
        throw new Error("Field doesn't support isOdd");
      return !r.isOdd(b);
    }
    /** Compare one point to another. */
    equals(b) {
      N(b);
      const { X: m, Y: p, Z: E } = this, { X: A, Y: I, Z: k } = b, T = r.eql(r.mul(m, k), r.mul(A, E)), B = r.eql(r.mul(p, k), r.mul(I, E));
      return T && B;
    }
    /** Flips point to one corresponding to (x, -y) in Affine coordinates. */
    negate() {
      return new C(this.X, r.neg(this.Y), this.Z);
    }
    // Renes-Costello-Batina exception-free doubling formula.
    // There is 30% faster Jacobian formula, but it is not complete.
    // https://eprint.iacr.org/2015/1060, algorithm 3
    // Cost: 8M + 3S + 3*a + 2*b3 + 15add.
    double() {
      const { a: b, b: m } = s, p = r.mul(m, nr), { X: E, Y: A, Z: I } = this;
      let k = r.ZERO, T = r.ZERO, B = r.ZERO, R = r.mul(E, E), F = r.mul(A, A), H = r.mul(I, I), L = r.mul(E, A);
      return L = r.add(L, L), B = r.mul(E, I), B = r.add(B, B), k = r.mul(b, B), T = r.mul(p, H), T = r.add(k, T), k = r.sub(F, T), T = r.add(F, T), T = r.mul(k, T), k = r.mul(L, k), B = r.mul(p, B), H = r.mul(b, H), L = r.sub(R, H), L = r.mul(b, L), L = r.add(L, B), B = r.add(R, R), R = r.add(B, R), R = r.add(R, H), R = r.mul(R, L), T = r.add(T, R), H = r.mul(A, I), H = r.add(H, H), R = r.mul(H, L), k = r.sub(k, R), B = r.mul(H, F), B = r.add(B, B), B = r.add(B, B), new C(k, T, B);
    }
    // Renes-Costello-Batina exception-free addition formula.
    // There is 30% faster Jacobian formula, but it is not complete.
    // https://eprint.iacr.org/2015/1060, algorithm 1
    // Cost: 12M + 0S + 3*a + 3*b3 + 23add.
    add(b) {
      N(b);
      const { X: m, Y: p, Z: E } = this, { X: A, Y: I, Z: k } = b;
      let T = r.ZERO, B = r.ZERO, R = r.ZERO;
      const F = s.a, H = r.mul(s.b, nr);
      let L = r.mul(m, A), D = r.mul(p, I), q = r.mul(E, k), st = r.add(m, p), M = r.add(A, I);
      st = r.mul(st, M), M = r.add(L, D), st = r.sub(st, M), M = r.add(m, E);
      let Y = r.add(A, k);
      return M = r.mul(M, Y), Y = r.add(L, q), M = r.sub(M, Y), Y = r.add(p, E), T = r.add(I, k), Y = r.mul(Y, T), T = r.add(D, q), Y = r.sub(Y, T), R = r.mul(F, M), T = r.mul(H, q), R = r.add(T, R), T = r.sub(D, R), R = r.add(D, R), B = r.mul(T, R), D = r.add(L, L), D = r.add(D, L), q = r.mul(F, q), M = r.mul(H, M), D = r.add(D, q), q = r.sub(L, q), q = r.mul(F, q), M = r.add(M, q), L = r.mul(D, M), B = r.add(B, L), L = r.mul(Y, M), T = r.mul(st, T), T = r.sub(T, L), L = r.mul(st, D), R = r.mul(Y, R), R = r.add(R, L), new C(T, B, R);
    }
    subtract(b) {
      return this.add(b.negate());
    }
    is0() {
      return this.equals(C.ZERO);
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
    multiply(b) {
      const { endo: m } = t;
      if (!o.isValidNot0(b))
        throw new Error("invalid scalar: out of range");
      let p, E;
      const A = (I) => gt.cached(this, I, (k) => Zi(C, k));
      if (m) {
        const { k1neg: I, k1: k, k2neg: T, k2: B } = U(b), { p: R, f: F } = A(k), { p: H, f: L } = A(B);
        E = F.add(L), p = Q(m.beta, R, H, I, T);
      } else {
        const { p: I, f: k } = A(b);
        p = I, E = k;
      }
      return Zi(C, [p, E])[0];
    }
    /**
     * Non-constant-time multiplication. Uses double-and-add algorithm.
     * It's faster, but should only be used when you don't care about
     * an exposed secret key e.g. sig verification, which works over *public* keys.
     */
    multiplyUnsafe(b) {
      const { endo: m } = t, p = this;
      if (!o.isValid(b))
        throw new Error("invalid scalar: out of range");
      if (b === ae || p.is0())
        return C.ZERO;
      if (b === Je)
        return p;
      if (gt.hasCache(this))
        return this.multiply(b);
      if (m) {
        const { k1neg: E, k1: A, k2neg: I, k2: k } = U(b), { p1: T, p2: B } = rh(C, p, A, k);
        return Q(m.beta, T, B, E, I);
      } else
        return gt.unsafe(p, b);
    }
    /**
     * Converts Projective point to affine (x, y) coordinates.
     * @param invertedZ Z^-1 (inverted zero) - optional, precomputation is useful for invertBatch
     */
    toAffine(b) {
      return W(this, b);
    }
    /**
     * Checks whether Point is free of torsion elements (is in prime subgroup).
     * Always torsion-free for cofactor=1 curves.
     */
    isTorsionFree() {
      const { isTorsionFree: b } = t;
      return i === Je ? !0 : b ? b(C, this) : gt.unsafe(this, c).is0();
    }
    clearCofactor() {
      const { clearCofactor: b } = t;
      return i === Je ? this : b ? b(C, this) : this.multiplyUnsafe(i);
    }
    isSmallOrder() {
      return this.multiplyUnsafe(i).is0();
    }
    toBytes(b = !0) {
      return Ur(b, "isCompressed"), this.assertValidity(), d(C, this, b);
    }
    toHex(b = !0) {
      return to(this.toBytes(b));
    }
    toString() {
      return `<Point ${this.is0() ? "ZERO" : this.toHex()}>`;
    }
  }
  const Ht = o.BITS, gt = new nh(C, t.endo ? Math.ceil(Ht / 2) : Ht);
  return C.BASE.precompute(8), C;
}
function Iu(e) {
  return Uint8Array.of(e ? 2 : 3);
}
function Bu(e, t) {
  return {
    secretKey: t.BYTES,
    publicKey: 1 + e.BYTES,
    publicKeyUncompressed: 1 + 2 * e.BYTES,
    publicKeyHasPrefix: !0,
    signature: 2 * t.BYTES
  };
}
function uh(e, t = {}) {
  const { Fn: n } = e, r = t.randomBytes || eo, o = Object.assign(Bu(e.Fp, n), { seed: bu(n.ORDER) });
  function s(d) {
    try {
      const w = n.fromBytes(d);
      return n.isValidNot0(w);
    } catch {
      return !1;
    }
  }
  function i(d, w) {
    const { publicKey: g, publicKeyUncompressed: y } = o;
    try {
      const S = d.length;
      return w === !0 && S !== g || w === !1 && S !== y ? !1 : !!e.fromBytes(d);
    } catch {
      return !1;
    }
  }
  function c(d = r(o.seed)) {
    return Eu(et(d, o.seed, "seed"), n.ORDER);
  }
  function a(d, w = !0) {
    return e.BASE.multiply(n.fromBytes(d)).toBytes(w);
  }
  function u(d) {
    const { secretKey: w, publicKey: g, publicKeyUncompressed: y } = o;
    if (!Cs(d) || "_lengths" in n && n._lengths || w === g)
      return;
    const S = et(d, void 0, "key").length;
    return S === g || S === y;
  }
  function f(d, w, g = !0) {
    if (u(d) === !0)
      throw new Error("first arg must be private key");
    if (u(w) === !1)
      throw new Error("second arg must be public key");
    const y = n.fromBytes(d);
    return e.fromBytes(w).multiply(y).toBytes(g);
  }
  const l = {
    isValidSecretKey: s,
    isValidPublicKey: i,
    randomSecretKey: c
  }, h = vu(c, a);
  return Object.freeze({ getPublicKey: a, getSharedSecret: f, keygen: h, Point: e, utils: l, lengths: o });
}
function fh(e, t, n = {}) {
  $a(t), Vs(n, {}, {
    hmac: "function",
    lowS: "boolean",
    randomBytes: "function",
    bits2int: "function",
    bits2int_modN: "function"
  }), n = Object.assign({}, n);
  const r = n.randomBytes || eo, o = n.hmac || ((m, p) => Au(t, m, p)), { Fp: s, Fn: i } = e, { ORDER: c, BITS: a } = i, { keygen: u, getPublicKey: f, getSharedSecret: l, utils: h, lengths: d } = uh(e, n), w = {
    prehash: !0,
    lowS: typeof n.lowS == "boolean" ? n.lowS : !0,
    format: "compact",
    extraEntropy: !1
  }, g = c * ku < s.ORDER;
  function y(m) {
    const p = c >> Je;
    return m > p;
  }
  function S(m, p) {
    if (!i.isValidNot0(p))
      throw new Error(`invalid signature ${m}: out of range 1..Point.Fn.ORDER`);
    return p;
  }
  function v() {
    if (g)
      throw new Error('"recovered" sig type is not supported for cofactor >2 curves');
  }
  function O(m, p) {
    Qo(p);
    const E = d.signature, A = p === "compact" ? E : p === "recovered" ? E + 1 : void 0;
    return et(m, A);
  }
  class N {
    r;
    s;
    recovery;
    constructor(p, E, A) {
      if (this.r = S("r", p), this.s = S("s", E), A != null) {
        if (v(), ![0, 1, 2, 3].includes(A))
          throw new Error("invalid recovery id");
        this.recovery = A;
      }
      Object.freeze(this);
    }
    static fromBytes(p, E = w.format) {
      O(p, E);
      let A;
      if (E === "der") {
        const { r: B, s: R } = be.toSig(et(p));
        return new N(B, R);
      }
      E === "recovered" && (A = p[0], E = "compact", p = p.subarray(1));
      const I = d.signature / 2, k = p.subarray(0, I), T = p.subarray(I, I * 2);
      return new N(i.fromBytes(k), i.fromBytes(T), A);
    }
    static fromHex(p, E) {
      return this.fromBytes($r(p), E);
    }
    assertRecovery() {
      const { recovery: p } = this;
      if (p == null)
        throw new Error("invalid recovery id: must be present");
      return p;
    }
    addRecoveryBit(p) {
      return new N(this.r, this.s, p);
    }
    recoverPublicKey(p) {
      const { r: E, s: A } = this, I = this.assertRecovery(), k = I === 2 || I === 3 ? E + c : E;
      if (!s.isValid(k))
        throw new Error("invalid recovery id: sig.r+curve.n != R.x");
      const T = s.toBytes(k), B = e.fromBytes(Qt(Iu((I & 1) === 0), T)), R = i.inv(k), F = W(et(p, void 0, "msgHash")), H = i.create(-F * R), L = i.create(A * R), D = e.BASE.multiplyUnsafe(H).add(B.multiplyUnsafe(L));
      if (D.is0())
        throw new Error("invalid recovery: point at infinify");
      return D.assertValidity(), D;
    }
    // Signatures should be low-s, to prevent malleability.
    hasHighS() {
      return y(this.s);
    }
    toBytes(p = w.format) {
      if (Qo(p), p === "der")
        return $r(be.hexFromSig(this));
      const { r: E, s: A } = this, I = i.toBytes(E), k = i.toBytes(A);
      return p === "recovered" ? (v(), Qt(Uint8Array.of(this.assertRecovery()), I, k)) : Qt(I, k);
    }
    toHex(p) {
      return to(this.toBytes(p));
    }
  }
  const U = n.bits2int || function(p) {
    if (p.length > 8192)
      throw new Error("input is too large");
    const E = yn(p), A = p.length * 8 - a;
    return A > 0 ? E >> BigInt(A) : E;
  }, W = n.bits2int_modN || function(p) {
    return i.create(U(p));
  }, x = Hs(a);
  function Q(m) {
    return od("num < 2^" + a, m, ae, x), i.toBytes(m);
  }
  function C(m, p) {
    return et(m, void 0, "message"), p ? et(t(m), void 0, "prehashed message") : m;
  }
  function Ht(m, p, E) {
    const { lowS: A, prehash: I, extraEntropy: k } = So(E, w);
    m = C(m, I);
    const T = W(m), B = i.fromBytes(p);
    if (!i.isValidNot0(B))
      throw new Error("invalid private key");
    const R = [Q(B), Q(T)];
    if (k != null && k !== !1) {
      const D = k === !0 ? r(d.secretKey) : k;
      R.push(et(D, void 0, "extraEntropy"));
    }
    const F = Qt(...R), H = T;
    function L(D) {
      const q = U(D);
      if (!i.isValidNot0(q))
        return;
      const st = i.inv(q), M = e.BASE.multiply(q).toAffine(), Y = i.create(M.x);
      if (Y === ae)
        return;
      const ne = i.create(st * i.create(H + Y * B));
      if (ne === ae)
        return;
      let mn = (M.x === Y ? 0 : 2) | Number(M.y & Je), bn = ne;
      return A && y(ne) && (bn = i.neg(ne), mn ^= 1), new N(Y, bn, g ? void 0 : mn);
    }
    return { seed: F, k2sig: L };
  }
  function gt(m, p, E = {}) {
    const { seed: A, k2sig: I } = Ht(m, p, E);
    return id(t.outputLen, i.BYTES, o)(A, I).toBytes(E.format);
  }
  function _(m, p, E, A = {}) {
    const { lowS: I, prehash: k, format: T } = So(A, w);
    if (E = et(E, void 0, "publicKey"), p = C(p, k), !Cs(m)) {
      const B = m instanceof N ? ", use sig.toBytes()" : "";
      throw new Error("verify expects Uint8Array signature" + B);
    }
    O(m, T);
    try {
      const B = N.fromBytes(m, T), R = e.fromBytes(E);
      if (I && B.hasHighS())
        return !1;
      const { r: F, s: H } = B, L = W(p), D = i.inv(H), q = i.create(L * D), st = i.create(F * D), M = e.BASE.multiplyUnsafe(q).add(R.multiplyUnsafe(st));
      return M.is0() ? !1 : i.create(M.x) === F;
    } catch {
      return !1;
    }
  }
  function b(m, p, E = {}) {
    const { prehash: A } = So(E, w);
    return p = C(p, A), N.fromBytes(m, "recovered").recoverPublicKey(p).toBytes();
  }
  return Object.freeze({
    keygen: u,
    getPublicKey: f,
    getSharedSecret: l,
    utils: h,
    lengths: d,
    Point: e,
    sign: gt,
    verify: _,
    recoverPublicKey: b,
    Signature: N,
    hash: t
  });
}
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const so = {
  p: BigInt("0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffefffffc2f"),
  n: BigInt("0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141"),
  h: BigInt(1),
  a: BigInt(0),
  b: BigInt(7),
  Gx: BigInt("0x79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798"),
  Gy: BigInt("0x483ada7726a3c4655da4fbfc0e1108a8fd17b448a68554199c47d08ffb10d4b8")
}, lh = {
  beta: BigInt("0x7ae96a2b657c07106e64479eac3434e99cf0497512f58995c1396c28719501ee"),
  basises: [
    [BigInt("0x3086d221a7d46bcde86c90e49284eb15"), -BigInt("0xe4437ed6010e88286f547fa90abfe4c3")],
    [BigInt("0x114ca50f7a8e2f3f657c1108d9d44cfd8"), BigInt("0x3086d221a7d46bcde86c90e49284eb15")]
  ]
}, dh = /* @__PURE__ */ BigInt(0), Jo = /* @__PURE__ */ BigInt(2);
function hh(e) {
  const t = so.p, n = BigInt(3), r = BigInt(6), o = BigInt(11), s = BigInt(22), i = BigInt(23), c = BigInt(44), a = BigInt(88), u = e * e * e % t, f = u * u * e % t, l = Lt(f, n, t) * f % t, h = Lt(l, n, t) * f % t, d = Lt(h, Jo, t) * u % t, w = Lt(d, o, t) * d % t, g = Lt(w, s, t) * w % t, y = Lt(g, c, t) * g % t, S = Lt(y, a, t) * y % t, v = Lt(S, c, t) * g % t, O = Lt(v, n, t) * f % t, N = Lt(O, i, t) * w % t, U = Lt(N, r, t) * u % t, W = Lt(U, Jo, t);
  if (!Pr.eql(Pr.sqr(W), e))
    throw new Error("Cannot find square root");
  return W;
}
const Pr = oo(so.p, { sqrt: hh }), Ge = /* @__PURE__ */ ah(so, {
  Fp: Pr,
  endo: lh
}), ec = /* @__PURE__ */ fh(Ge, Xo), nc = {};
function Hr(e, ...t) {
  let n = nc[e];
  if (n === void 0) {
    const r = Xo(nd(e));
    n = Qt(r, r), nc[e] = n;
  }
  return Xo(Qt(n, ...t));
}
const zs = (e) => e.toBytes(!0).slice(1), Gs = (e) => e % Jo === dh;
function ts(e) {
  const { Fn: t, BASE: n } = Ge, r = t.fromBytes(e), o = n.multiply(r);
  return { scalar: Gs(o.y) ? r : t.neg(r), bytes: zs(o) };
}
function Ou(e) {
  const t = Pr;
  if (!t.isValidNot0(e))
    throw new Error("invalid x: Fail if x ≥ p");
  const n = t.create(e * e), r = t.create(n * e + BigInt(7));
  let o = t.sqrt(r);
  Gs(o) || (o = t.neg(o));
  const s = Ge.fromAffine({ x: e, y: o });
  return s.assertValidity(), s;
}
const On = yn;
function $u(...e) {
  return Ge.Fn.create(On(Hr("BIP0340/challenge", ...e)));
}
function rc(e) {
  return ts(e).bytes;
}
function ph(e, t, n = eo(32)) {
  const { Fn: r } = Ge, o = et(e, void 0, "message"), { bytes: s, scalar: i } = ts(t), c = et(n, 32, "auxRand"), a = r.toBytes(i ^ On(Hr("BIP0340/aux", c))), u = Hr("BIP0340/nonce", a, s, o), { bytes: f, scalar: l } = ts(u), h = $u(f, s, o), d = new Uint8Array(64);
  if (d.set(f, 0), d.set(r.toBytes(r.create(l + h * i)), 32), !Uu(d, o, s))
    throw new Error("sign: Invalid signature produced");
  return d;
}
function Uu(e, t, n) {
  const { Fp: r, Fn: o, BASE: s } = Ge, i = et(e, 64, "signature"), c = et(t, void 0, "message"), a = et(n, 32, "publicKey");
  try {
    const u = Ou(On(a)), f = On(i.subarray(0, 32));
    if (!r.isValidNot0(f))
      return !1;
    const l = On(i.subarray(32, 64));
    if (!o.isValidNot0(l))
      return !1;
    const h = $u(o.toBytes(f), zs(u), c), d = s.multiplyUnsafe(l).add(u.multiplyUnsafe(o.neg(h))), { x: w, y: g } = d.toAffine();
    return !(d.is0() || !Gs(g) || w !== f);
  } catch {
    return !1;
  }
}
const qs = /* @__PURE__ */ (() => {
  const n = (r = eo(48)) => Eu(r, so.n);
  return {
    keygen: vu(n, rc),
    getPublicKey: rc,
    sign: ph,
    verify: Uu,
    Point: Ge,
    utils: {
      randomSecretKey: n,
      taggedHash: Hr,
      lift_x: Ou,
      pointToBytes: zs
    },
    lengths: {
      secretKey: 32,
      publicKey: 32,
      publicKeyHasPrefix: !1,
      signature: 64,
      seed: 48
    }
  };
})();
function js(e, t, n = {}) {
  e = Wo(e);
  const { aggPublicKey: r } = zo(e);
  if (!n.taprootTweak)
    return {
      preTweakedKey: r.toBytes(!0),
      finalKey: r.toBytes(!0)
    };
  const o = qs.utils.taggedHash("TapTweak", r.toBytes(!0).subarray(1), n.taprootTweak ?? new Uint8Array(0)), { aggPublicKey: s } = zo(e, [o], [!0]);
  return {
    preTweakedKey: r.toBytes(!0),
    finalKey: s.toBytes(!0)
  };
}
class rr extends Error {
  constructor(t) {
    super(t), this.name = "PartialSignatureError";
  }
}
class Ys {
  constructor(t, n) {
    if (this.s = t, this.R = n, t.length !== 32)
      throw new rr("Invalid s length");
    if (n.length !== 33)
      throw new rr("Invalid R length");
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
      throw new rr("Invalid partial signature length");
    if (yn(t) >= xt.CURVE().n)
      throw new rr("s value overflows curve order");
    const r = new Uint8Array(33);
    return new Ys(t, r);
  }
}
function gh(e, t, n, r, o, s) {
  let i;
  if (s?.taprootTweak !== void 0) {
    const { preTweakedKey: u } = js(Wo(r));
    i = qs.utils.taggedHash("TapTweak", u.subarray(1), s.taprootTweak);
  }
  const a = new jl(n, Wo(r), o, i ? [i] : void 0, i ? [!0] : void 0).sign(e, t);
  return Ys.decode(a);
}
var vo, oc;
function wh() {
  if (oc) return vo;
  oc = 1;
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
  return vo = { decode: a, encode: u }, vo;
}
var es = wh(), $t;
(function(e) {
  e.VtxoTaprootTree = "taptree", e.VtxoTreeExpiry = "expiry", e.Cosigner = "cosigner", e.ConditionWitness = "condition";
})($t || ($t = {}));
const Zs = 222;
function yh(e, t, n, r) {
  e.updateInput(t, {
    unknown: [
      ...e.getInput(t)?.unknown ?? [],
      n.encode(r)
    ]
  });
}
function ns(e, t, n) {
  const r = e.getInput(t)?.unknown ?? [], o = [];
  for (const s of r) {
    const i = n.decode(s);
    i && o.push(i);
  }
  return o;
}
const Ru = {
  key: $t.VtxoTaprootTree,
  encode: (e) => [
    {
      type: Zs,
      key: io[$t.VtxoTaprootTree]
    },
    e
  ],
  decode: (e) => Xs(() => Qs(e[0], $t.VtxoTaprootTree) ? e[1] : null)
}, mh = {
  key: $t.ConditionWitness,
  encode: (e) => [
    {
      type: Zs,
      key: io[$t.ConditionWitness]
    },
    Nn.encode(e)
  ],
  decode: (e) => Xs(() => Qs(e[0], $t.ConditionWitness) ? Nn.decode(e[1]) : null)
}, rs = {
  key: $t.Cosigner,
  encode: (e) => [
    {
      type: Zs,
      key: new Uint8Array([
        ...io[$t.Cosigner],
        e.index
      ])
    },
    e.key
  ],
  decode: (e) => Xs(() => Qs(e[0], $t.Cosigner) ? {
    index: e[0].key[e[0].key.length - 1],
    key: e[1]
  } : null)
};
$t.VtxoTreeExpiry;
const io = Object.fromEntries(Object.values($t).map((e) => [
  e,
  new TextEncoder().encode(e)
])), Xs = (e) => {
  try {
    return e();
  } catch {
    return null;
  }
};
function Qs(e, t) {
  const n = $.encode(io[t]);
  return $.encode(new Uint8Array([e.type, ...e.key])).includes(n);
}
const or = new Error("missing vtxo graph");
class Hn {
  constructor(t) {
    this.secretKey = t, this.myNonces = null, this.aggregateNonces = null, this.graph = null, this.scriptRoot = null, this.rootSharedOutputAmount = null;
  }
  static random() {
    const t = Co();
    return new Hn(t);
  }
  async init(t, n, r) {
    this.graph = t, this.scriptRoot = n, this.rootSharedOutputAmount = r;
  }
  async getPublicKey() {
    return ec.getPublicKey(this.secretKey);
  }
  async getNonces() {
    if (!this.graph)
      throw or;
    this.myNonces || (this.myNonces = this.generateNonces());
    const t = /* @__PURE__ */ new Map();
    for (const [n, r] of this.myNonces)
      t.set(n, { pubNonce: r.pubNonce });
    return t;
  }
  async aggregatedNonces(t, n) {
    if (!this.graph)
      throw or;
    if (this.aggregateNonces || (this.aggregateNonces = /* @__PURE__ */ new Map()), this.myNonces || await this.getNonces(), this.aggregateNonces.has(t))
      return {
        hasAllNonces: this.aggregateNonces.size === this.myNonces?.size
      };
    const r = this.myNonces.get(t);
    if (!r)
      throw new Error(`missing nonce for txid ${t}`);
    const o = await this.getPublicKey();
    n.set($.encode(o.subarray(1)), r);
    const s = this.graph.find(t);
    if (!s)
      throw new Error(`missing tx for txid ${t}`);
    const i = ns(s.root, 0, rs).map(
      (u) => $.encode(u.key.subarray(1))
      // xonly pubkey
    ), c = [];
    for (const u of i) {
      const f = n.get(u);
      if (!f)
        throw new Error(`missing nonce for cosigner ${u}`);
      c.push(f.pubNonce);
    }
    const a = Zl(c);
    return this.aggregateNonces.set(t, { pubNonce: a }), {
      hasAllNonces: this.aggregateNonces.size === this.myNonces?.size
    };
  }
  async sign() {
    if (!this.graph)
      throw or;
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
      throw or;
    const t = /* @__PURE__ */ new Map(), n = ec.getPublicKey(this.secretKey);
    for (const r of this.graph.iterator()) {
      const o = Yl(n);
      t.set(r.txid, o);
    }
    return t;
  }
  signPartial(t) {
    if (!this.graph || !this.scriptRoot || !this.rootSharedOutputAmount)
      throw Hn.NOT_INITIALIZED;
    if (!this.myNonces || !this.aggregateNonces)
      throw new Error("session not properly initialized");
    const n = this.myNonces.get(t.txid);
    if (!n)
      throw new Error("missing private nonce");
    const r = this.aggregateNonces.get(t.txid);
    if (!r)
      throw new Error("missing aggregate nonce");
    const o = [], s = [], i = ns(t.root, 0, rs).map((u) => u.key), { finalKey: c } = js(i, !0, {
      taprootTweak: this.scriptRoot
    });
    for (let u = 0; u < t.root.inputsLength; u++) {
      const f = bh(c, this.graph, this.rootSharedOutputAmount, t.root);
      o.push(f.amount), s.push(f.script);
    }
    const a = t.root.preimageWitnessV1(
      0,
      // always first input
      s,
      Me.DEFAULT,
      o
    );
    return gh(n.secNonce, this.secretKey, r.pubNonce, i, a, {
      taprootTweak: this.scriptRoot
    });
  }
}
Hn.NOT_INITIALIZED = new Error("session not initialized, call init method");
function bh(e, t, n, r) {
  const o = K.encode(["OP_1", e.slice(1)]);
  if (r.id === t.txid)
    return {
      amount: n,
      script: o
    };
  const s = r.getInput(0);
  if (!s.txid)
    throw new Error("missing parent input txid");
  const i = $.encode(s.txid), c = t.find(i);
  if (!c)
    throw new Error("parent  tx not found");
  if (s.index === void 0)
    throw new Error("missing input index");
  const a = c.root.getOutput(s.index);
  if (!a)
    throw new Error("parent output not found");
  if (!a.amount)
    throw new Error("parent output amount not found");
  return {
    amount: a.amount,
    script: o
  };
}
const sc = new Uint8Array(32).fill(0), ic = Object.values(Me).filter((e) => typeof e == "number");
class $n {
  constructor(t) {
    this.key = t || Co();
  }
  static fromPrivateKey(t) {
    return new $n(t);
  }
  static fromHex(t) {
    return new $n($.decode(t));
  }
  static fromRandomBytes() {
    return new $n(Co());
  }
  /**
   * Export the private key as a hex string.
   *
   * @returns The private key as a hex string
   */
  toHex() {
    return $.encode(this.key);
  }
  async sign(t, n) {
    const r = t.clone();
    if (!n) {
      try {
        if (!r.sign(this.key, ic, sc))
          throw new Error("Failed to sign transaction");
      } catch (o) {
        if (!(o instanceof Error && o.message.includes("No inputs signed"))) throw o;
      }
      return r;
    }
    for (const o of n)
      if (!r.signIdx(this.key, o, ic, sc))
        throw new Error(`Failed to sign input #${o}`);
    return r;
  }
  compressedPublicKey() {
    return Promise.resolve(pa(this.key, !0));
  }
  xOnlyPublicKey() {
    return Promise.resolve(As(this.key));
  }
  signerSession() {
    return Hn.random();
  }
  async signMessage(t, n = "schnorr") {
    return n === "ecdsa" ? Od(t, this.key, { prehash: !1 }) : _d.sign(t, this.key);
  }
}
class hn {
  constructor(t, n, r, o = 0) {
    if (this.serverPubKey = t, this.vtxoTaprootKey = n, this.hrp = r, this.version = o, t.length !== 32)
      throw new Error("Invalid server public key length, expected 32 bytes, got " + t.length);
    if (n.length !== 32)
      throw new Error("Invalid vtxo taproot public key length, expected 32 bytes, got " + n.length);
  }
  static decode(t) {
    const n = qe.decodeUnsafe(t, 1023);
    if (!n)
      throw new Error("Invalid address");
    const r = new Uint8Array(qe.fromWords(n.words));
    if (r.length !== 65)
      throw new Error("Invalid data length, expected 65 bytes, got " + r.length);
    const o = r[0], s = r.slice(1, 33), i = r.slice(33, 65);
    return new hn(s, i, n.prefix, o);
  }
  encode() {
    const t = new Uint8Array(65);
    t[0] = this.version, t.set(this.serverPubKey, 1), t.set(this.vtxoTaprootKey, 33);
    const n = qe.toWords(t);
    return qe.encode(this.hrp, n, 1023);
  }
  // pkScript is the script that should be used to send non-dust funds to the address
  get pkScript() {
    return K.encode(["OP_1", this.vtxoTaprootKey]);
  }
  // subdustPkScript is the script that should be used to send sub-dust funds to the address
  get subdustPkScript() {
    return K.encode(["RETURN", this.vtxoTaprootKey]);
  }
}
const Vr = Bs(void 0, !0);
var ft;
(function(e) {
  e.Multisig = "multisig", e.CSVMultisig = "csv-multisig", e.ConditionCSVMultisig = "condition-csv-multisig", e.ConditionMultisig = "condition-multisig", e.CLTVMultisig = "cltv-multisig";
})(ft || (ft = {}));
function Nu(e) {
  const t = [
    qt,
    Ut,
    Vn,
    Dr,
    Dn
  ];
  for (const n of t)
    try {
      return n.decode(e);
    } catch {
      continue;
    }
  throw new Error(`Failed to decode: script ${$.encode(e)} is not a valid tapscript`);
}
var qt;
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
        type: ft.Multisig,
        params: c,
        script: Pl(c.pubkeys.length, c.pubkeys).script
      };
    const a = [];
    for (let u = 0; u < c.pubkeys.length; u++)
      a.push(c.pubkeys[u]), u < c.pubkeys.length - 1 ? a.push("CHECKSIGVERIFY") : a.push("CHECKSIG");
    return {
      type: ft.Multisig,
      params: c,
      script: K.encode(a)
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
    const a = K.decode(c), u = [];
    let f = !1;
    for (let h = 0; h < a.length; h++) {
      const d = a[h];
      if (typeof d != "string" && typeof d != "number") {
        if (d.length !== 32)
          throw new Error(`Invalid pubkey length: expected 32, got ${d.length}`);
        if (u.push(d), h + 1 >= a.length || a[h + 1] !== "CHECKSIGADD" && a[h + 1] !== "CHECKSIG")
          throw new Error("Expected CHECKSIGADD or CHECKSIG after pubkey");
        h++;
        continue;
      }
      if (h === a.length - 1) {
        if (d !== "NUMEQUAL")
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
    if ($.encode(l.script) !== $.encode(c))
      throw new Error("Invalid script format: script reconstruction mismatch");
    return {
      type: ft.Multisig,
      params: { pubkeys: u, type: t.CHECKSIGADD },
      script: c
    };
  }
  function s(c) {
    const a = K.decode(c), u = [];
    for (let l = 0; l < a.length; l++) {
      const h = a[l];
      if (typeof h != "string" && typeof h != "number") {
        if (h.length !== 32)
          throw new Error(`Invalid pubkey length: expected 32, got ${h.length}`);
        if (u.push(h), l + 1 >= a.length)
          throw new Error("Unexpected end of script");
        const d = a[l + 1];
        if (d !== "CHECKSIGVERIFY" && d !== "CHECKSIG")
          throw new Error("Expected CHECKSIGVERIFY or CHECKSIG after pubkey");
        if (l === a.length - 2 && d !== "CHECKSIG")
          throw new Error("Last operation must be CHECKSIG");
        l++;
        continue;
      }
    }
    if (u.length === 0)
      throw new Error("Invalid script: must have at least 1 pubkey");
    const f = n({ pubkeys: u, type: t.CHECKSIG });
    if ($.encode(f.script) !== $.encode(c))
      throw new Error("Invalid script format: script reconstruction mismatch");
    return {
      type: ft.Multisig,
      params: { pubkeys: u, type: t.CHECKSIG },
      script: c
    };
  }
  function i(c) {
    return c.type === ft.Multisig;
  }
  e.is = i;
})(qt || (qt = {}));
var Ut;
(function(e) {
  function t(o) {
    for (const u of o.pubkeys)
      if (u.length !== 32)
        throw new Error(`Invalid pubkey length: expected 32, got ${u.length}`);
    const s = Vr.encode(BigInt(es.encode(o.timelock.type === "blocks" ? { blocks: Number(o.timelock.value) } : { seconds: Number(o.timelock.value) }))), i = [
      s.length === 1 ? s[0] : s,
      "CHECKSEQUENCEVERIFY",
      "DROP"
    ], c = qt.encode(o), a = new Uint8Array([
      ...K.encode(i),
      ...c.script
    ]);
    return {
      type: ft.CSVMultisig,
      params: o,
      script: a
    };
  }
  e.encode = t;
  function n(o) {
    if (o.length === 0)
      throw new Error("Failed to decode: script is empty");
    const s = K.decode(o);
    if (s.length < 3)
      throw new Error("Invalid script: too short (expected at least 3)");
    const i = s[0];
    if (typeof i == "string")
      throw new Error("Invalid script: expected sequence number");
    if (s[1] !== "CHECKSEQUENCEVERIFY" || s[2] !== "DROP")
      throw new Error("Invalid script: expected CHECKSEQUENCEVERIFY DROP");
    const c = new Uint8Array(K.encode(s.slice(3)));
    let a;
    try {
      a = qt.decode(c);
    } catch (d) {
      throw new Error(`Invalid multisig script: ${d instanceof Error ? d.message : String(d)}`);
    }
    let u;
    typeof i == "number" ? u = i : u = Number(Vr.decode(i));
    const f = es.decode(u), l = f.blocks !== void 0 ? { type: "blocks", value: BigInt(f.blocks) } : { type: "seconds", value: BigInt(f.seconds) }, h = t({
      timelock: l,
      ...a.params
    });
    if ($.encode(h.script) !== $.encode(o))
      throw new Error("Invalid script format: script reconstruction mismatch");
    return {
      type: ft.CSVMultisig,
      params: {
        timelock: l,
        ...a.params
      },
      script: o
    };
  }
  e.decode = n;
  function r(o) {
    return o.type === ft.CSVMultisig;
  }
  e.is = r;
})(Ut || (Ut = {}));
var Vn;
(function(e) {
  function t(o) {
    const s = new Uint8Array([
      ...o.conditionScript,
      ...K.encode(["VERIFY"]),
      ...Ut.encode(o).script
    ]);
    return {
      type: ft.ConditionCSVMultisig,
      params: o,
      script: s
    };
  }
  e.encode = t;
  function n(o) {
    if (o.length === 0)
      throw new Error("Failed to decode: script is empty");
    const s = K.decode(o);
    if (s.length < 1)
      throw new Error("Invalid script: too short (expected at least 1)");
    let i = -1;
    for (let l = s.length - 1; l >= 0; l--)
      s[l] === "VERIFY" && (i = l);
    if (i === -1)
      throw new Error("Invalid script: missing VERIFY operation");
    const c = new Uint8Array(K.encode(s.slice(0, i))), a = new Uint8Array(K.encode(s.slice(i + 1)));
    let u;
    try {
      u = Ut.decode(a);
    } catch (l) {
      throw new Error(`Invalid CSV multisig script: ${l instanceof Error ? l.message : String(l)}`);
    }
    const f = t({
      conditionScript: c,
      ...u.params
    });
    if ($.encode(f.script) !== $.encode(o))
      throw new Error("Invalid script format: script reconstruction mismatch");
    return {
      type: ft.ConditionCSVMultisig,
      params: {
        conditionScript: c,
        ...u.params
      },
      script: o
    };
  }
  e.decode = n;
  function r(o) {
    return o.type === ft.ConditionCSVMultisig;
  }
  e.is = r;
})(Vn || (Vn = {}));
var Dr;
(function(e) {
  function t(o) {
    const s = new Uint8Array([
      ...o.conditionScript,
      ...K.encode(["VERIFY"]),
      ...qt.encode(o).script
    ]);
    return {
      type: ft.ConditionMultisig,
      params: o,
      script: s
    };
  }
  e.encode = t;
  function n(o) {
    if (o.length === 0)
      throw new Error("Failed to decode: script is empty");
    const s = K.decode(o);
    if (s.length < 1)
      throw new Error("Invalid script: too short (expected at least 1)");
    let i = -1;
    for (let l = s.length - 1; l >= 0; l--)
      s[l] === "VERIFY" && (i = l);
    if (i === -1)
      throw new Error("Invalid script: missing VERIFY operation");
    const c = new Uint8Array(K.encode(s.slice(0, i))), a = new Uint8Array(K.encode(s.slice(i + 1)));
    let u;
    try {
      u = qt.decode(a);
    } catch (l) {
      throw new Error(`Invalid multisig script: ${l instanceof Error ? l.message : String(l)}`);
    }
    const f = t({
      conditionScript: c,
      ...u.params
    });
    if ($.encode(f.script) !== $.encode(o))
      throw new Error("Invalid script format: script reconstruction mismatch");
    return {
      type: ft.ConditionMultisig,
      params: {
        conditionScript: c,
        ...u.params
      },
      script: o
    };
  }
  e.decode = n;
  function r(o) {
    return o.type === ft.ConditionMultisig;
  }
  e.is = r;
})(Dr || (Dr = {}));
var Dn;
(function(e) {
  function t(o) {
    const s = Vr.encode(o.absoluteTimelock), i = [
      s.length === 1 ? s[0] : s,
      "CHECKLOCKTIMEVERIFY",
      "DROP"
    ], c = K.encode(i), a = new Uint8Array([
      ...c,
      ...qt.encode(o).script
    ]);
    return {
      type: ft.CLTVMultisig,
      params: o,
      script: a
    };
  }
  e.encode = t;
  function n(o) {
    if (o.length === 0)
      throw new Error("Failed to decode: script is empty");
    const s = K.decode(o);
    if (s.length < 3)
      throw new Error("Invalid script: too short (expected at least 3)");
    const i = s[0];
    if (typeof i == "string" || typeof i == "number")
      throw new Error("Invalid script: expected locktime number");
    if (s[1] !== "CHECKLOCKTIMEVERIFY" || s[2] !== "DROP")
      throw new Error("Invalid script: expected CHECKLOCKTIMEVERIFY DROP");
    const c = new Uint8Array(K.encode(s.slice(3)));
    let a;
    try {
      a = qt.decode(c);
    } catch (l) {
      throw new Error(`Invalid multisig script: ${l instanceof Error ? l.message : String(l)}`);
    }
    const u = Vr.decode(i), f = t({
      absoluteTimelock: u,
      ...a.params
    });
    if ($.encode(f.script) !== $.encode(o))
      throw new Error("Invalid script format: script reconstruction mismatch");
    return {
      type: ft.CLTVMultisig,
      params: {
        absoluteTimelock: u,
        ...a.params
      },
      script: o
    };
  }
  e.decode = n;
  function r(o) {
    return o.type === ft.CLTVMultisig;
  }
  e.is = r;
})(Dn || (Dn = {}));
const cc = Ln.tapTree[2];
function Un(e) {
  return e[1].subarray(0, e[1].length - 1);
}
class Pt {
  static decode(t) {
    const r = cc.decode(t).map((o) => o.script);
    return new Pt(r);
  }
  constructor(t) {
    this.scripts = t;
    const n = Sa(t.map((o) => ({ script: o, leafVersion: Cn }))), r = _l(Is, n, void 0, !0);
    if (!r.tapLeafScript || r.tapLeafScript.length !== t.length)
      throw new Error("invalid scripts");
    this.leaves = r.tapLeafScript, this.tweakedPublicKey = r.tweakedPubkey;
  }
  encode() {
    return cc.encode(this.scripts.map((n) => ({
      depth: 1,
      version: Cn,
      script: n
    })));
  }
  address(t, n) {
    return new hn(n, this.tweakedPublicKey, t);
  }
  get pkScript() {
    return K.encode(["OP_1", this.tweakedPublicKey]);
  }
  onchainAddress(t) {
    return De(t).encode({
      type: "tr",
      pubkey: this.tweakedPublicKey
    });
  }
  findLeaf(t) {
    const n = this.leaves.find((r) => $.encode(Un(r)) === t);
    if (!n)
      throw new Error(`leaf '${t}' not found`);
    return n;
  }
  exitPaths() {
    const t = [];
    for (const n of this.leaves)
      try {
        const r = Ut.decode(Un(n));
        t.push(r);
        continue;
      } catch {
        try {
          const o = Vn.decode(Un(n));
          t.push(o);
        } catch {
          continue;
        }
      }
    return t;
  }
}
var ac;
(function(e) {
  class t extends Pt {
    constructor(o) {
      n(o);
      const { sender: s, receiver: i, server: c, preimageHash: a, refundLocktime: u, unilateralClaimDelay: f, unilateralRefundDelay: l, unilateralRefundWithoutReceiverDelay: h } = o, d = Eh(a), w = Dr.encode({
        conditionScript: d,
        pubkeys: [i, c]
      }).script, g = qt.encode({
        pubkeys: [s, i, c]
      }).script, y = Dn.encode({
        absoluteTimelock: u,
        pubkeys: [s, c]
      }).script, S = Vn.encode({
        conditionScript: d,
        timelock: f,
        pubkeys: [i]
      }).script, v = Ut.encode({
        timelock: l,
        pubkeys: [s, i]
      }).script, O = Ut.encode({
        timelock: h,
        pubkeys: [s]
      }).script;
      super([
        w,
        g,
        y,
        S,
        v,
        O
      ]), this.options = o, this.claimScript = $.encode(w), this.refundScript = $.encode(g), this.refundWithoutReceiverScript = $.encode(y), this.unilateralClaimScript = $.encode(S), this.unilateralRefundScript = $.encode(v), this.unilateralRefundWithoutReceiverScript = $.encode(O);
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
})(ac || (ac = {}));
function Eh(e) {
  return K.encode(["HASH160", e, "EQUAL"]);
}
var Mr;
(function(e) {
  class t extends Pt {
    constructor(r) {
      const { pubKey: o, serverPubKey: s, csvTimelock: i = t.DEFAULT_TIMELOCK } = r, c = qt.encode({
        pubkeys: [o, s]
      }).script, a = Ut.encode({
        timelock: i,
        pubkeys: [o]
      }).script;
      super([c, a]), this.options = r, this.forfeitScript = $.encode(c), this.exitScript = $.encode(a);
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
})(Mr || (Mr = {}));
var Mn;
(function(e) {
  e.TxSent = "SENT", e.TxReceived = "RECEIVED";
})(Mn || (Mn = {}));
function ue(e) {
  return !e.isSpent;
}
function os(e) {
  return e.virtualStatus.state === "swept" && ue(e);
}
function Lu(e, t) {
  return e.value < t;
}
function Cu(e, t, n) {
  const r = [];
  let o = [...t];
  for (const i of [...e, ...t]) {
    if (i.virtualStatus.state !== "preconfirmed" && i.virtualStatus.commitmentTxIds && i.virtualStatus.commitmentTxIds.some((d) => n.has(d)))
      continue;
    const c = xh(o, i);
    o = uc(o, c);
    const a = sr(c);
    if (i.value <= a)
      continue;
    const u = Sh(o, i);
    o = uc(o, u);
    const f = sr(u);
    if (i.value <= f)
      continue;
    const l = {
      commitmentTxid: i.spentBy || "",
      boardingTxid: "",
      arkTxid: ""
    };
    let h = i.virtualStatus.state !== "preconfirmed";
    i.virtualStatus.state === "preconfirmed" && (l.arkTxid = i.txid, i.spentBy && (h = !0)), r.push({
      key: l,
      amount: i.value - a - f,
      type: Mn.TxReceived,
      createdAt: i.createdAt.getTime(),
      settled: h
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
    const a = vh([...e, ...t], i), u = sr(a), f = sr(c);
    if (f <= u)
      continue;
    const l = Th(a, c), h = {
      commitmentTxid: l.virtualStatus.commitmentTxIds?.[0] || "",
      boardingTxid: "",
      arkTxid: ""
    };
    l.virtualStatus.state === "preconfirmed" && (h.arkTxid = l.txid), r.push({
      key: h,
      amount: f - u,
      type: Mn.TxSent,
      createdAt: l.createdAt.getTime(),
      settled: !0
    });
  }
  return r;
}
function xh(e, t) {
  return t.virtualStatus.state === "preconfirmed" ? [] : e.filter((n) => n.settledBy ? t.virtualStatus.commitmentTxIds?.includes(n.settledBy) ?? !1 : !1);
}
function Sh(e, t) {
  return e.filter((n) => n.arkTxId ? n.arkTxId === t.txid : !1);
}
function vh(e, t) {
  return e.filter((n) => n.virtualStatus.state !== "preconfirmed" && n.virtualStatus.commitmentTxIds?.includes(t) ? !0 : n.txid === t);
}
function sr(e) {
  return e.reduce((t, n) => t + n.value, 0);
}
function Th(e, t) {
  return e.length === 0 ? t[0] : e[0];
}
function uc(e, t) {
  return e.filter((n) => {
    for (const r of t)
      if (n.txid === r.txid && n.vout === r.vout)
        return !1;
    return !0;
  });
}
const Ah = (e) => kh[e], kh = {
  bitcoin: Tn(an, "ark"),
  testnet: Tn(Qn, "tark"),
  signet: Tn(Qn, "tark"),
  mutinynet: Tn(Qn, "tark"),
  regtest: Tn({
    ...Qn,
    bech32: "bcrt",
    pubKeyHash: 111,
    scriptHash: 196
  }, "tark")
};
function Tn(e, t) {
  return {
    ...e,
    hrp: t
  };
}
const Ih = {
  bitcoin: "https://mempool.space/api",
  testnet: "https://mempool.space/testnet/api",
  signet: "https://mempool.space/signet/api",
  mutinynet: "https://mutinynet.com/api",
  regtest: "http://localhost:3000"
};
class Bh {
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
      const a = 5e3, u = () => Promise.all(t.map((d) => this.getTransactions(d))).then((d) => d.flat()), f = await u(), l = (d) => `${d.txid}_${d.status.block_time}`, h = new Set(f.map(l));
      r = setInterval(async () => {
        try {
          const w = (await u()).filter((g) => !h.has(l(g)));
          w.length > 0 && (w.forEach((g) => h.add(l(g))), n(w));
        } catch (d) {
          console.error("Error in polling mechanism:", d);
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
          for (const h in l)
            for (const d of [
              "mempool",
              "confirmed",
              "removed"
            ])
              l[h][d] && u.push(...l[h][d].filter($h));
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
    if (!Oh(n))
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
function Oh(e) {
  return Array.isArray(e) && e.every((t) => {
    t && typeof t == "object" && typeof t.id == "string" && t.id.length > 0 && typeof t.height == "number" && t.height >= 0 && typeof t.mediantime == "number" && t.mediantime > 0;
  });
}
const $h = (e) => typeof e.txid == "string" && Array.isArray(e.vout) && e.vout.every((t) => typeof t.scriptpubkey_address == "string" && typeof t.value == "string") && typeof e.status == "object" && typeof e.status.confirmed == "boolean" && typeof e.status.block_time == "number";
async function* ss(e) {
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
class Uh extends Error {
  constructor(t, n, r, o) {
    super(n), this.code = t, this.message = n, this.name = r, this.metadata = o;
  }
}
function Rh(e) {
  try {
    if (!(e instanceof Error))
      return;
    const t = JSON.parse(e.message);
    if (!("details" in t) || !Array.isArray(t.details))
      return;
    for (const n of t.details) {
      if (!("@type" in n) || n["@type"] !== "type.googleapis.com/ark.v1.ErrorDetails" || !("code" in n))
        continue;
      const o = n.code;
      if (!("message" in n))
        continue;
      const s = n.message;
      if (!("name" in n))
        continue;
      const i = n.name;
      let c;
      return "metadata" in n && Nh(n.metadata) && (c = n.metadata), new Uh(o, s, i, c);
    }
    return;
  } catch {
    return;
  }
}
function Nh(e) {
  return typeof e == "object" && e !== null && !Array.isArray(e);
}
var J;
(function(e) {
  e.BatchStarted = "batch_started", e.BatchFinalization = "batch_finalization", e.BatchFinalized = "batch_finalized", e.BatchFailed = "batch_failed", e.TreeSigningStarted = "tree_signing_started", e.TreeNonces = "tree_nonces", e.TreeTx = "tree_tx", e.TreeSignature = "tree_signature";
})(J || (J = {}));
class _u {
  constructor(t) {
    this.serverUrl = t;
  }
  async getInfo() {
    const t = `${this.serverUrl}/v1/info`, n = await fetch(t);
    if (!n.ok) {
      const o = await n.text();
      Zt(o, `Failed to get server info: ${n.statusText}`);
    }
    const r = await n.json();
    return {
      boardingExitDelay: BigInt(r.boardingExitDelay ?? 0),
      checkpointTapscript: r.checkpointTapscript ?? "",
      deprecatedSigners: r.deprecatedSigners?.map((o) => ({
        cutoffDate: BigInt(o.cutoffDate ?? 0),
        pubkey: o.pubkey ?? ""
      })) ?? [],
      digest: r.digest ?? "",
      dust: BigInt(r.dust ?? 0),
      fees: r.fees,
      forfeitAddress: r.forfeitAddress ?? "",
      forfeitPubkey: r.forfeitPubkey ?? "",
      network: r.network ?? "",
      scheduledSession: "scheduledSession" in r && r.scheduledSession != null ? {
        duration: BigInt(r.scheduledSession.duration ?? 0),
        nextStartTime: BigInt(r.scheduledSession.nextStartTime ?? 0),
        nextEndTime: BigInt(r.scheduledSession.nextEndTime ?? 0),
        period: BigInt(r.scheduledSession.period ?? 0)
      } : void 0,
      serviceStatus: r.serviceStatus ?? {},
      sessionDuration: BigInt(r.sessionDuration ?? 0),
      signerPubkey: r.signerPubkey ?? "",
      unilateralExitDelay: BigInt(r.unilateralExitDelay ?? 0),
      utxoMaxAmount: BigInt(r.utxoMaxAmount ?? -1),
      utxoMinAmount: BigInt(r.utxoMinAmount ?? 0),
      version: r.version ?? "",
      vtxoMaxAmount: BigInt(r.vtxoMaxAmount ?? -1),
      vtxoMinAmount: BigInt(r.vtxoMinAmount ?? 0)
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
      Zt(i, `Failed to submit virtual transaction: ${i}`);
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
      Zt(s, `Failed to finalize offchain transaction: ${s}`);
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
          proof: t.proof,
          message: t.message
        }
      })
    });
    if (!r.ok) {
      const s = await r.text();
      Zt(s, `Failed to register intent: ${s}`);
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
          proof: t.proof,
          message: t.message
        }
      })
    });
    if (!r.ok) {
      const o = await r.text();
      Zt(o, `Failed to delete intent: ${o}`);
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
      Zt(o, `Failed to confirm registration: ${o}`);
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
        treeNonces: Lh(r)
      })
    });
    if (!s.ok) {
      const i = await s.text();
      Zt(i, `Failed to submit tree nonces: ${i}`);
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
        treeSignatures: Ch(r)
      })
    });
    if (!s.ok) {
      const i = await s.text();
      Zt(i, `Failed to submit tree signatures: ${i}`);
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
    if (!o.ok) {
      const s = await o.text();
      Zt(s, `Failed to submit forfeit transactions: ${o.statusText}`);
    }
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
          for await (const c of ss(s)) {
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
        if (is(s)) {
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
          for await (const s of ss(r)) {
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
        if (is(r)) {
          console.debug("Timeout error ignored");
          continue;
        }
        throw console.error("Transaction stream error:", r), r;
      }
  }
  async getPendingTxs(t) {
    const n = `${this.serverUrl}/v1/tx/pending`, r = await fetch(n, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ intent: t })
    });
    if (!r.ok) {
      const s = await r.text();
      Zt(s, `Failed to get pending transactions: ${s}`);
    }
    return (await r.json()).pendingTxs;
  }
  parseSettlementEvent(t) {
    if (t.batchStarted)
      return {
        type: J.BatchStarted,
        id: t.batchStarted.id,
        intentIdHashes: t.batchStarted.intentIdHashes,
        batchExpiry: BigInt(t.batchStarted.batchExpiry)
      };
    if (t.batchFinalization)
      return {
        type: J.BatchFinalization,
        id: t.batchFinalization.id,
        commitmentTx: t.batchFinalization.commitmentTx
      };
    if (t.batchFinalized)
      return {
        type: J.BatchFinalized,
        id: t.batchFinalized.id,
        commitmentTxid: t.batchFinalized.commitmentTxid
      };
    if (t.batchFailed)
      return {
        type: J.BatchFailed,
        id: t.batchFailed.id,
        reason: t.batchFailed.reason
      };
    if (t.treeSigningStarted)
      return {
        type: J.TreeSigningStarted,
        id: t.treeSigningStarted.id,
        cosignersPublicKeys: t.treeSigningStarted.cosignersPubkeys,
        unsignedCommitmentTx: t.treeSigningStarted.unsignedCommitmentTx
      };
    if (t.treeNoncesAggregated)
      return null;
    if (t.treeNonces)
      return {
        type: J.TreeNonces,
        id: t.treeNonces.id,
        topic: t.treeNonces.topic,
        txid: t.treeNonces.txid,
        nonces: _h(t.treeNonces.nonces)
        // pubkey -> public nonce
      };
    if (t.treeTx) {
      const n = Object.fromEntries(Object.entries(t.treeTx.children).map(([r, o]) => [parseInt(r), o]));
      return {
        type: J.TreeTx,
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
      type: J.TreeSignature,
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
        spentVtxos: t.commitmentTx.spentVtxos.map(ir),
        spendableVtxos: t.commitmentTx.spendableVtxos.map(ir),
        checkpointTxs: t.commitmentTx.checkpointTxs
      }
    } : t.arkTx ? {
      arkTx: {
        txid: t.arkTx.txid,
        tx: t.arkTx.tx,
        spentVtxos: t.arkTx.spentVtxos.map(ir),
        spendableVtxos: t.arkTx.spendableVtxos.map(ir),
        checkpointTxs: t.arkTx.checkpointTxs
      }
    } : (t.heartbeat || console.warn("Unknown transaction notification type:", t), null);
  }
}
function Lh(e) {
  const t = {};
  for (const [n, r] of e)
    t[n] = $.encode(r.pubNonce);
  return t;
}
function Ch(e) {
  const t = {};
  for (const [n, r] of e)
    t[n] = $.encode(r.encode());
  return t;
}
function _h(e) {
  return new Map(Object.entries(e).map(([t, n]) => {
    if (typeof n != "string")
      throw new Error("invalid nonce");
    return [t, { pubNonce: $.decode(n) }];
  }));
}
function is(e) {
  const t = (n) => n instanceof Error ? n.name === "TypeError" && n.message === "Failed to fetch" || n.name === "HeadersTimeoutError" || n.name === "BodyTimeoutError" || n.code === "UND_ERR_HEADERS_TIMEOUT" || n.code === "UND_ERR_BODY_TIMEOUT" : !1;
  return t(e) || t(e.cause);
}
function ir(e) {
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
function Zt(e, t) {
  const n = new Error(e);
  throw Rh(n) ?? new Error(t);
}
const Ph = 0n, Hh = new Uint8Array([81, 2, 78, 115]), Js = {
  script: Hh,
  amount: Ph
};
$.encode(Js.script);
function Vh(e, t, n) {
  const r = new yt({
    version: 3,
    lockTime: n,
    allowUnknownOutputs: !0,
    allowUnknown: !0,
    allowUnknownInputs: !0
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
  }), r.addOutput(Js), r;
}
const Dh = new Error("invalid settlement transaction outputs"), Mh = new Error("empty tree"), Kh = new Error("invalid number of inputs"), To = new Error("wrong settlement txid"), Fh = new Error("invalid amount"), Wh = new Error("no leaves"), zh = new Error("invalid taproot script"), fc = new Error("invalid round transaction outputs"), Gh = new Error("wrong commitment txid"), qh = new Error("missing cosigners public keys"), Ao = 0, lc = 1;
function jh(e, t) {
  if (t.validate(), t.root.inputsLength !== 1)
    throw Kh;
  const n = t.root.getInput(0), r = yt.fromPSBT(It.decode(e));
  if (r.outputsLength <= lc)
    throw Dh;
  const o = r.id;
  if (!n.txid || $.encode(n.txid) !== o || n.index !== lc)
    throw To;
}
function Yh(e, t, n) {
  if (t.outputsLength < Ao + 1)
    throw fc;
  const r = t.getOutput(Ao)?.amount;
  if (!r)
    throw fc;
  if (!e.root)
    throw Mh;
  const o = e.root.getInput(0), s = t.id;
  if (!o.txid || $.encode(o.txid) !== s || o.index !== Ao)
    throw Gh;
  let i = 0n;
  for (let a = 0; a < e.root.outputsLength; a++) {
    const u = e.root.getOutput(a);
    u?.amount && (i += u.amount);
  }
  if (i !== r)
    throw Fh;
  if (e.leaves().length === 0)
    throw Wh;
  e.validate();
  for (const a of e.iterator())
    for (const [u, f] of a.children) {
      const l = a.root.getOutput(u);
      if (!l?.script)
        throw new Error(`parent output ${u} not found`);
      const h = l.script.slice(2);
      if (h.length !== 32)
        throw new Error(`parent output ${u} has invalid script`);
      const d = ns(f.root, 0, rs);
      if (d.length === 0)
        throw qh;
      const w = d.map((y) => y.key), { finalKey: g } = js(w, !0, {
        taprootTweak: n
      });
      if (!g || $.encode(g.slice(1)) !== $.encode(h))
        throw zh;
    }
}
function Zh(e, t, n) {
  const r = e.map((s) => Xh(s, n));
  return {
    arkTx: Pu(r.map((s) => s.input), t),
    checkpoints: r.map((s) => s.tx)
  };
}
function Pu(e, t) {
  let n = 0n;
  for (const o of e) {
    const s = Nu(Un(o.tapLeafScript));
    if (Dn.is(s)) {
      if (n !== 0n && dc(n) !== dc(s.params.absoluteTimelock))
        throw new Error("cannot mix seconds and blocks locktime");
      s.params.absoluteTimelock > n && (n = s.params.absoluteTimelock);
    }
  }
  const r = new yt({
    version: 3,
    allowUnknown: !0,
    allowUnknownOutputs: !0,
    lockTime: Number(n)
  });
  for (const [o, s] of e.entries())
    r.addInput({
      txid: s.txid,
      index: s.vout,
      sequence: n ? Ns - 1 : void 0,
      witnessUtxo: {
        script: Pt.decode(s.tapTree).pkScript,
        amount: BigInt(s.value)
      },
      tapLeafScript: [s.tapLeafScript]
    }), yh(r, o, Ru, s.tapTree);
  for (const o of t)
    r.addOutput(o);
  return r.addOutput(Js), r;
}
function Xh(e, t) {
  const n = Nu(e.checkpointTapLeafScript ?? Un(e.tapLeafScript)), r = new Pt([
    t.script,
    n.script
  ]), o = Pu([e], [
    {
      amount: BigInt(e.value),
      script: r.pkScript
    }
  ]), s = r.findLeaf($.encode(n.script)), i = {
    txid: o.id,
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
const Qh = 500000000n;
function dc(e) {
  return e >= Qh;
}
function Jh(e, t) {
  if (!e.status.block_time)
    return !1;
  if (t.value === 0n)
    return !0;
  if (t.type !== "blocks")
    return !1;
  const n = BigInt(Math.floor(Date.now() / 1e3));
  return BigInt(Math.floor(e.status.block_time)) + t.value <= n;
}
const tp = {
  thresholdPercentage: 10
};
class at {
  constructor(t, n, r = at.DefaultHRP) {
    this.preimage = t, this.value = n, this.HRP = r, this.vout = 0;
    const o = wt(this.preimage);
    this.vtxoScript = new Pt([rp(o)]);
    const s = this.vtxoScript.leaves[0];
    this.txid = $.encode(new Uint8Array(o).reverse()), this.tapTree = this.vtxoScript.encode(), this.forfeitTapLeafScript = s, this.intentTapLeafScript = s, this.value = n, this.status = { confirmed: !0 }, this.extraWitness = [this.preimage];
  }
  encode() {
    const t = new Uint8Array(at.Length);
    return t.set(this.preimage, 0), ep(t, this.value, this.preimage.length), t;
  }
  static decode(t, n = at.DefaultHRP) {
    if (t.length !== at.Length)
      throw new Error(`invalid data length: expected ${at.Length} bytes, got ${t.length}`);
    const r = t.subarray(0, at.PreimageLength), o = np(t, at.PreimageLength);
    return new at(r, o, n);
  }
  static fromString(t, n = at.DefaultHRP) {
    if (t = t.trim(), !t.startsWith(n))
      throw new Error(`invalid human-readable part: expected ${n} prefix (note '${t}')`);
    const r = t.slice(n.length), o = Io.decode(r);
    if (o.length === 0)
      throw new Error("failed to decode base58 string");
    return at.decode(o, n);
  }
  toString() {
    return this.HRP + Io.encode(this.encode());
  }
}
at.DefaultHRP = "arknote";
at.PreimageLength = 32;
at.ValueLength = 4;
at.Length = at.PreimageLength + at.ValueLength;
at.FakeOutpointIndex = 0;
function ep(e, t, n) {
  new DataView(e.buffer, e.byteOffset + n, 4).setUint32(0, t, !1);
}
function np(e, t) {
  return new DataView(e.buffer, e.byteOffset + t, 4).getUint32(0, !1);
}
function rp(e) {
  return K.encode(["SHA256", e, "EQUAL"]);
}
var Kr;
(function(e) {
  function t(n, r, o = []) {
    if (r.length == 0)
      throw new Error("intent proof requires at least one input");
    up(r), lp(o);
    const s = dp(n, r[0].witnessUtxo.script);
    return hp(s, r, o);
  }
  e.create = t;
})(Kr || (Kr = {}));
const op = new Uint8Array([lt.RETURN]), sp = new Uint8Array(32).fill(0), ip = 4294967295, cp = "ark-intent-proof-message";
function ap(e) {
  if (e.index === void 0)
    throw new Error("intent proof input requires index");
  if (e.txid === void 0)
    throw new Error("intent proof input requires txid");
  if (e.witnessUtxo === void 0)
    throw new Error("intent proof input requires witness utxo");
  return !0;
}
function up(e) {
  return e.forEach(ap), !0;
}
function fp(e) {
  if (e.amount === void 0)
    throw new Error("intent proof output requires amount");
  if (e.script === void 0)
    throw new Error("intent proof output requires script");
  return !0;
}
function lp(e) {
  return e.forEach(fp), !0;
}
function dp(e, t) {
  const n = pp(e), r = new yt({
    version: 0,
    allowUnknownOutputs: !0,
    allowUnknown: !0,
    allowUnknownInputs: !0
  });
  return r.addInput({
    txid: sp,
    // zero hash
    index: ip,
    sequence: 0
  }), r.addOutput({
    amount: 0n,
    script: t
  }), r.updateInput(0, {
    finalScriptSig: K.encode(["OP_0", n])
  }), r;
}
function hp(e, t, n) {
  const r = t[0], o = new yt({
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
    sighashType: Me.ALL
  });
  for (const [s, i] of t.entries())
    o.addInput({
      ...i,
      sighashType: Me.ALL
    }), i.unknown?.length && o.updateInput(s + 1, {
      unknown: i.unknown
    });
  n.length === 0 && (n = [
    {
      amount: 0n,
      script: op
    }
  ]);
  for (const s of n)
    o.addOutput({
      amount: s.amount,
      script: s.script
    });
  return o;
}
function pp(e) {
  return qs.utils.taggedHash(cp, new TextEncoder().encode(e));
}
var cs;
(function(e) {
  e[e.INDEXER_TX_TYPE_UNSPECIFIED = 0] = "INDEXER_TX_TYPE_UNSPECIFIED", e[e.INDEXER_TX_TYPE_RECEIVED = 1] = "INDEXER_TX_TYPE_RECEIVED", e[e.INDEXER_TX_TYPE_SENT = 2] = "INDEXER_TX_TYPE_SENT";
})(cs || (cs = {}));
var tn;
(function(e) {
  e.UNSPECIFIED = "INDEXER_CHAINED_TX_TYPE_UNSPECIFIED", e.COMMITMENT = "INDEXER_CHAINED_TX_TYPE_COMMITMENT", e.ARK = "INDEXER_CHAINED_TX_TYPE_ARK", e.TREE = "INDEXER_CHAINED_TX_TYPE_TREE", e.CHECKPOINT = "INDEXER_CHAINED_TX_TYPE_CHECKPOINT";
})(tn || (tn = {}));
class Hu {
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
    if (!Vt.isVtxoTreeResponse(i))
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
    if (!Vt.isVtxoTreeLeavesResponse(i))
      throw new Error("Invalid vtxos tree leaves data received");
    return i;
  }
  async getBatchSweepTransactions(t) {
    const n = `${this.serverUrl}/v1/indexer/batch/${t.txid}/${t.vout}/sweepTxs`, r = await fetch(n);
    if (!r.ok)
      throw new Error(`Failed to fetch batch sweep transactions: ${r.statusText}`);
    const o = await r.json();
    if (!Vt.isBatchSweepTransactionsResponse(o))
      throw new Error("Invalid batch sweep transactions data received");
    return o;
  }
  async getCommitmentTx(t) {
    const n = `${this.serverUrl}/v1/indexer/commitmentTx/${t}`, r = await fetch(n);
    if (!r.ok)
      throw new Error(`Failed to fetch commitment tx: ${r.statusText}`);
    const o = await r.json();
    if (!Vt.isCommitmentTx(o))
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
    if (!Vt.isConnectorsResponse(i))
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
    if (!Vt.isForfeitTxsResponse(i))
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
          for await (const i of ss(o)) {
            if (n?.aborted)
              break;
            try {
              const c = JSON.parse(i.data);
              c.event && (yield {
                txid: c.event.txid,
                scripts: c.event.scripts || [],
                newVtxos: (c.event.newVtxos || []).map(cr),
                spentVtxos: (c.event.spentVtxos || []).map(cr),
                sweptVtxos: (c.event.sweptVtxos || []).map(cr),
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
        if (is(o)) {
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
    if (!Vt.isVirtualTxsResponse(i))
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
    if (!Vt.isVtxoChainResponse(i))
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
    if (!Vt.isVtxosResponse(s))
      throw new Error("Invalid vtxos data received");
    return {
      vtxos: s.vtxos.map(cr),
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
      console.warn(`Failed to unsubscribe to scripts: ${s}`);
    }
  }
}
function cr(e) {
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
    isUnrolled: e.isUnrolled,
    isSpent: e.isSpent
  };
}
var Vt;
(function(e) {
  function t(x) {
    return typeof x == "object" && typeof x.totalOutputAmount == "string" && typeof x.totalOutputVtxos == "number" && typeof x.expiresAt == "string" && typeof x.swept == "boolean";
  }
  function n(x) {
    return typeof x == "object" && typeof x.txid == "string" && typeof x.expiresAt == "string" && Object.values(tn).includes(x.type) && Array.isArray(x.spends) && x.spends.every((Q) => typeof Q == "string");
  }
  function r(x) {
    return typeof x == "object" && typeof x.startedAt == "string" && typeof x.endedAt == "string" && typeof x.totalInputAmount == "string" && typeof x.totalInputVtxos == "number" && typeof x.totalOutputAmount == "string" && typeof x.totalOutputVtxos == "number" && typeof x.batches == "object" && Object.values(x.batches).every(t);
  }
  e.isCommitmentTx = r;
  function o(x) {
    return typeof x == "object" && typeof x.txid == "string" && typeof x.vout == "number";
  }
  e.isOutpoint = o;
  function s(x) {
    return Array.isArray(x) && x.every(o);
  }
  e.isOutpointArray = s;
  function i(x) {
    return typeof x == "object" && typeof x.txid == "string" && typeof x.children == "object" && Object.values(x.children).every(f) && Object.keys(x.children).every((Q) => Number.isInteger(Number(Q)));
  }
  function c(x) {
    return Array.isArray(x) && x.every(i);
  }
  e.isTxsArray = c;
  function a(x) {
    return typeof x == "object" && typeof x.amount == "string" && typeof x.createdAt == "string" && typeof x.isSettled == "boolean" && typeof x.settledBy == "string" && Object.values(cs).includes(x.type) && (!x.commitmentTxid && typeof x.virtualTxid == "string" || typeof x.commitmentTxid == "string" && !x.virtualTxid);
  }
  function u(x) {
    return Array.isArray(x) && x.every(a);
  }
  e.isTxHistoryRecordArray = u;
  function f(x) {
    return typeof x == "string" && x.length === 64;
  }
  function l(x) {
    return Array.isArray(x) && x.every(f);
  }
  e.isTxidArray = l;
  function h(x) {
    return typeof x == "object" && o(x.outpoint) && typeof x.createdAt == "string" && (x.expiresAt === null || typeof x.expiresAt == "string") && typeof x.amount == "string" && typeof x.script == "string" && typeof x.isPreconfirmed == "boolean" && typeof x.isSwept == "boolean" && typeof x.isUnrolled == "boolean" && typeof x.isSpent == "boolean" && (!x.spentBy || typeof x.spentBy == "string") && (!x.settledBy || typeof x.settledBy == "string") && (!x.arkTxid || typeof x.arkTxid == "string") && Array.isArray(x.commitmentTxids) && x.commitmentTxids.every(f);
  }
  function d(x) {
    return typeof x == "object" && typeof x.current == "number" && typeof x.next == "number" && typeof x.total == "number";
  }
  function w(x) {
    return typeof x == "object" && Array.isArray(x.vtxoTree) && x.vtxoTree.every(i) && (!x.page || d(x.page));
  }
  e.isVtxoTreeResponse = w;
  function g(x) {
    return typeof x == "object" && Array.isArray(x.leaves) && x.leaves.every(o) && (!x.page || d(x.page));
  }
  e.isVtxoTreeLeavesResponse = g;
  function y(x) {
    return typeof x == "object" && Array.isArray(x.connectors) && x.connectors.every(i) && (!x.page || d(x.page));
  }
  e.isConnectorsResponse = y;
  function S(x) {
    return typeof x == "object" && Array.isArray(x.txids) && x.txids.every(f) && (!x.page || d(x.page));
  }
  e.isForfeitTxsResponse = S;
  function v(x) {
    return typeof x == "object" && Array.isArray(x.sweptBy) && x.sweptBy.every(f);
  }
  e.isSweptCommitmentTxResponse = v;
  function O(x) {
    return typeof x == "object" && Array.isArray(x.sweptBy) && x.sweptBy.every(f);
  }
  e.isBatchSweepTransactionsResponse = O;
  function N(x) {
    return typeof x == "object" && Array.isArray(x.txs) && x.txs.every((Q) => typeof Q == "string") && (!x.page || d(x.page));
  }
  e.isVirtualTxsResponse = N;
  function U(x) {
    return typeof x == "object" && Array.isArray(x.chain) && x.chain.every(n) && (!x.page || d(x.page));
  }
  e.isVtxoChainResponse = U;
  function W(x) {
    return typeof x == "object" && Array.isArray(x.vtxos) && x.vtxos.every(h) && (!x.page || d(x.page));
  }
  e.isVtxosResponse = W;
})(Vt || (Vt = {}));
class as {
  constructor(t, n = /* @__PURE__ */ new Map()) {
    this.root = t, this.children = n;
  }
  static create(t) {
    if (t.length === 0)
      throw new Error("empty chunks");
    const n = /* @__PURE__ */ new Map();
    for (const s of t) {
      const i = wp(s), c = i.tx.id;
      n.set(c, i);
    }
    const r = [];
    for (const [s] of n) {
      let i = !1;
      for (const [c, a] of n)
        if (c !== s && (i = gp(a, s), i))
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
    const o = Vu(r[0], n);
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
      const s = o.root.getInput(0), i = this.root.id;
      if (!s.txid || $.encode(s.txid) !== i || s.index !== r)
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
    return this.root.id;
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
function gp(e, t) {
  return Object.values(e.children).includes(t);
}
function Vu(e, t) {
  const n = t.get(e);
  if (!n)
    return null;
  const r = n.tx, o = /* @__PURE__ */ new Map();
  for (const [s, i] of Object.entries(n.children)) {
    const c = parseInt(s), a = Vu(i, t);
    a && o.set(c, a);
  }
  return new as(r, o);
}
function wp(e) {
  return { tx: yt.fromPSBT(It.decode(e.tx)), children: e.children };
}
class yp {
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
const hc = (e) => e ? $.encode(e) : void 0, Fr = (e) => e ? $.decode(e) : void 0, pc = ([e, t]) => ({
  cb: $.encode(Xt.encode(e)),
  s: $.encode(t)
}), gc = (e) => ({
  ...e,
  tapTree: hc(e.tapTree),
  forfeitTapLeafScript: pc(e.forfeitTapLeafScript),
  intentTapLeafScript: pc(e.intentTapLeafScript),
  extraWitness: e.extraWitness?.map((t) => hc(t))
}), wc = (e) => {
  const t = Xt.decode(Fr(e.cb)), n = Fr(e.s);
  return [t, n];
}, mp = (e) => ({
  ...e,
  tapTree: Fr(e.tapTree),
  forfeitTapLeafScript: wc(e.forfeitTapLeafScript),
  intentTapLeafScript: wc(e.intentTapLeafScript),
  extraWitness: e.extraWitness?.map((t) => Fr(t))
});
class us {
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
      const s = JSON.parse(r).map(mp);
      return this.cache.vtxos.set(t, s.slice()), s.slice();
    } catch (o) {
      return console.error(`Failed to parse VTXOs for address ${t}:`, o), this.cache.vtxos.set(t, []), [];
    }
  }
  async saveVtxos(t, n) {
    const r = await this.getVtxos(t);
    for (const o of n) {
      const s = r.findIndex((i) => i.txid === o.txid && i.vout === o.vout);
      s !== -1 ? r[s] = o : r.push(o);
    }
    this.cache.vtxos.set(t, r.slice()), await this.storage.setItem(`vtxos:${t}`, JSON.stringify(r.map(gc)));
  }
  async removeVtxo(t, n) {
    const r = await this.getVtxos(t), [o, s] = n.split(":"), i = r.filter((c) => !(c.txid === o && c.vout === parseInt(s, 10)));
    this.cache.vtxos.set(t, i.slice()), await this.storage.setItem(`vtxos:${t}`, JSON.stringify(i.map(gc)));
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
class bp {
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
function en(e, t) {
  return {
    ...t,
    forfeitTapLeafScript: e.offchainTapscript.forfeit(),
    intentTapLeafScript: e.offchainTapscript.exit(),
    tapTree: e.offchainTapscript.encode()
  };
}
class pn {
  constructor(t, n, r, o, s, i, c, a, u, f, l, h, d, w, g, y) {
    this.identity = t, this.network = n, this.networkName = r, this.onchainProvider = o, this.arkProvider = s, this.indexerProvider = i, this.arkServerPublicKey = c, this.offchainTapscript = a, this.boardingTapscript = u, this.serverUnrollScript = f, this.forfeitOutputScript = l, this.forfeitPubkey = h, this.dustAmount = d, this.walletRepository = w, this.contractRepository = g, this.renewalConfig = {
      enabled: y?.enabled ?? !1,
      ...tp,
      ...y
    };
  }
  static async create(t) {
    const n = await t.identity.xOnlyPublicKey();
    if (!n)
      throw new Error("Invalid configured public key");
    const r = t.arkProvider || (() => {
      if (!t.arkServerUrl)
        throw new Error("Either arkProvider or arkServerUrl must be provided");
      return new _u(t.arkServerUrl);
    })(), o = t.arkServerUrl || r.serverUrl;
    if (!o)
      throw new Error("Could not determine arkServerUrl from provider");
    const s = t.indexerUrl || o, i = t.indexerProvider || new Hu(s), c = await r.getInfo(), a = Ah(c.network), u = t.esploraUrl || Ih[c.network], f = t.onchainProvider || new Bh(u), l = {
      value: c.unilateralExitDelay,
      type: c.unilateralExitDelay < 512n ? "blocks" : "seconds"
    }, h = {
      value: c.boardingExitDelay,
      type: c.boardingExitDelay < 512n ? "blocks" : "seconds"
    }, d = $.decode(c.signerPubkey).slice(1), w = new Mr.Script({
      pubKey: n,
      serverPubKey: d,
      csvTimelock: l
    }), g = new Mr.Script({
      pubKey: n,
      serverPubKey: d,
      csvTimelock: h
    }), y = w;
    let S;
    try {
      const Q = $.decode(c.checkpointTapscript);
      S = Ut.decode(Q);
    } catch {
      throw new Error("Invalid checkpointTapscript from server");
    }
    const v = $.decode(c.forfeitPubkey).slice(1), O = De(a).decode(c.forfeitAddress), N = ut.encode(O), U = t.storage || new yp(), W = new us(U), x = new bp(U);
    return new pn(t.identity, a, c.network, f, r, i, d, y, g, S, N, v, c.dust, W, x, t.renewalConfig);
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
    s = n.filter((f) => f.virtualStatus.state === "settled").reduce((f, l) => f + l.value, 0), i = n.filter((f) => f.virtualStatus.state === "preconfirmed").reduce((f, l) => f + l.value, 0), c = n.filter((f) => ue(f) && f.virtualStatus.state === "swept").reduce((f, l) => f + l.value, 0);
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
    const n = await this.getAddress(), o = (await this.getVirtualCoins(t)).map((s) => en(this, s));
    return await this.walletRepository.saveVtxos(n, o), o;
  }
  async getVirtualCoins(t = { withRecoverable: !0, withUnrolled: !1 }) {
    const n = [$.encode(this.offchainTapscript.pkScript)], o = (await this.indexerProvider.getVtxos({ scripts: n })).vtxos;
    let s = o.filter(ue);
    if (t.withRecoverable || (s = s.filter((i) => !os(i))), t.withUnrolled) {
      const i = o.filter((c) => !ue(c));
      s.push(...i.filter((c) => c.isUnrolled));
    }
    return s;
  }
  async getTransactionHistory() {
    if (!this.indexerProvider)
      return [];
    const t = await this.indexerProvider.getVtxos({
      scripts: [$.encode(this.offchainTapscript.pkScript)]
    }), { boardingTxs: n, commitmentsToIgnore: r } = await this.getBoardingTxs(), o = [], s = [];
    for (const a of t.vtxos)
      ue(a) ? o.push(a) : s.push(a);
    const i = Cu(o, s, r), c = [...n, ...i];
    return c.sort(
      // place createdAt = 0 (unconfirmed txs) first, then descending
      (a, u) => a.createdAt === 0 ? -1 : u.createdAt === 0 ? 1 : u.createdAt - a.createdAt
    ), c;
  }
  async getBoardingTxs() {
    const t = [], n = /* @__PURE__ */ new Set(), r = await this.getBoardingAddress(), o = await this.onchainProvider.getTransactions(r);
    for (const c of o)
      for (let a = 0; a < c.vout.length; a++) {
        const u = c.vout[a];
        if (u.scriptpubkey_address === r) {
          const l = (await this.onchainProvider.getTxOutspends(c.txid))[a];
          l?.spent && n.add(l.txid), t.push({
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
    for (const c of t) {
      const a = {
        key: {
          boardingTxid: c.txid,
          commitmentTxid: "",
          arkTxid: ""
        },
        amount: c.value,
        type: Mn.TxReceived,
        settled: c.virtualStatus.state === "spent",
        createdAt: c.status.block_time ? new Date(c.status.block_time * 1e3).getTime() : 0
      };
      c.status.block_time ? i.push(a) : s.push(a);
    }
    return {
      boardingTxs: [...s, ...i],
      commitmentsToIgnore: n
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
    if (!xp(t.address))
      throw new Error("Invalid Ark address " + t.address);
    const n = await this.getVirtualCoins({
      withRecoverable: !1
    }), r = Sp(n, t.amount), o = this.offchainTapscript.forfeit();
    if (!o)
      throw new Error("Selected leaf not found");
    const s = hn.decode(t.address), c = [
      {
        script: BigInt(t.amount) < this.dustAmount ? s.subdustPkScript : s.pkScript,
        amount: BigInt(t.amount)
      }
    ];
    if (r.changeAmount > 0n) {
      const w = r.changeAmount < this.dustAmount ? this.arkAddress.subdustPkScript : this.arkAddress.pkScript;
      c.push({
        script: w,
        amount: BigInt(r.changeAmount)
      });
    }
    const a = this.offchainTapscript.encode();
    let u = Zh(r.inputs.map((w) => ({
      ...w,
      tapLeafScript: o,
      tapTree: a
    })), c, this.serverUnrollScript);
    const f = await this.identity.sign(u.arkTx), { arkTxid: l, signedCheckpointTxs: h } = await this.arkProvider.submitTx(It.encode(f.toPSBT()), u.checkpoints.map((w) => It.encode(w.toPSBT()))), d = await Promise.all(h.map(async (w) => {
      const g = yt.fromPSBT(It.decode(w)), y = await this.identity.sign(g);
      return It.encode(y.toPSBT());
    }));
    return await this.arkProvider.finalizeTx(l, d), l;
  }
  async settle(t, n) {
    if (t?.inputs) {
      for (const h of t.inputs)
        if (typeof h == "string")
          try {
            at.fromString(h);
          } catch {
            throw new Error(`Invalid arknote "${h}"`);
          }
    }
    if (!t) {
      let h = 0;
      const w = Ut.decode($.decode(this.boardingTapscript.exitScript)).params.timelock, g = (await this.getBoardingUtxos()).filter((v) => !Jh(v, w));
      h += g.reduce((v, O) => v + O.value, 0);
      const y = await this.getVtxos({ withRecoverable: !0 });
      h += y.reduce((v, O) => v + O.value, 0);
      const S = [...g, ...y];
      if (S.length === 0)
        throw new Error("No inputs found");
      t = {
        inputs: S,
        outputs: [
          {
            address: await this.getAddress(),
            amount: BigInt(h)
          }
        ]
      };
    }
    const r = [], o = [];
    let s = !1;
    for (const [h, d] of t.outputs.entries()) {
      let w;
      try {
        w = hn.decode(d.address).pkScript, s = !0;
      } catch {
        const g = De(this.network).decode(d.address);
        w = ut.encode(g), r.push(h);
      }
      o.push({
        amount: d.amount,
        script: w
      });
    }
    let i;
    const c = [];
    s && (i = this.identity.signerSession(), c.push($.encode(await i.getPublicKey())));
    const [a, u] = await Promise.all([
      this.makeRegisterIntentSignature(t.inputs, o, r, c),
      this.makeDeleteIntentSignature(t.inputs)
    ]), f = await this.arkProvider.registerIntent(a), l = new AbortController();
    try {
      let h;
      const d = [
        ...c,
        ...t.inputs.map((U) => `${U.txid}:${U.vout}`)
      ], w = this.arkProvider.getEventStream(l.signal, d);
      let g, y;
      const S = [], v = [];
      let O, N;
      for await (const U of w)
        switch (n && n(U), U.type) {
          // the settlement failed
          case J.BatchFailed:
            if (U.id === g)
              throw new Error(U.reason);
            break;
          case J.BatchStarted:
            if (h !== void 0)
              continue;
            const W = await this.handleBatchStartedEvent(U, f, this.forfeitPubkey, this.forfeitOutputScript);
            W.skip || (h = U.type, y = W.sweepTapTreeRoot, g = W.roundId, s || (h = J.TreeNonces));
            break;
          case J.TreeTx:
            if (h !== J.BatchStarted && h !== J.TreeNonces)
              continue;
            if (U.batchIndex === 0)
              S.push(U.chunk);
            else if (U.batchIndex === 1)
              v.push(U.chunk);
            else
              throw new Error(`Invalid batch index: ${U.batchIndex}`);
            break;
          case J.TreeSignature:
            if (h !== J.TreeNonces || !s)
              continue;
            if (!O)
              throw new Error("Vtxo graph not set, something went wrong");
            if (U.batchIndex === 0) {
              const x = $.decode(U.signature);
              O.update(U.txid, (Q) => {
                Q.updateInput(0, {
                  tapKeySig: x
                });
              });
            }
            break;
          // the server has started the signing process of the vtxo tree transactions
          // the server expects the partial musig2 nonces for each tx
          case J.TreeSigningStarted:
            if (h !== J.BatchStarted)
              continue;
            if (s) {
              if (!i)
                throw new Error("Signing session not set");
              if (!y)
                throw new Error("Sweep tap tree root not set");
              if (S.length === 0)
                throw new Error("unsigned vtxo graph not received");
              O = as.create(S), await this.handleSettlementSigningEvent(U, y, i, O);
            }
            h = U.type;
            break;
          // the musig2 nonces of the vtxo tree transactions are generated
          // the server expects now the partial musig2 signatures
          case J.TreeNonces:
            if (h !== J.TreeSigningStarted)
              continue;
            if (s) {
              if (!i)
                throw new Error("Signing session not set");
              await this.handleSettlementTreeNoncesEvent(U, i) && (h = U.type);
              break;
            }
            h = U.type;
            break;
          // the vtxo tree is signed, craft, sign and submit forfeit transactions
          // if any boarding utxos are involved, the settlement tx is also signed
          case J.BatchFinalization:
            if (h !== J.TreeNonces)
              continue;
            if (!this.forfeitOutputScript)
              throw new Error("Forfeit output script not set");
            v.length > 0 && (N = as.create(v), jh(U.commitmentTx, N)), await this.handleSettlementFinalizationEvent(U, t.inputs, this.forfeitOutputScript, N), h = U.type;
            break;
          // the settlement is done, last event to be received
          case J.BatchFinalized:
            if (h !== J.BatchFinalization)
              continue;
            return l.abort(), U.commitmentTxid;
        }
    } catch (h) {
      l.abort();
      try {
        await this.arkProvider.deleteIntent(u);
      } catch {
      }
      throw h;
    }
    throw new Error("Settlement failed");
  }
  async notifyIncomingFunds(t) {
    const n = await this.getAddress(), r = await this.getBoardingAddress();
    let o, s;
    if (this.onchainProvider && r) {
      const c = (a) => a.vout.findIndex((u) => u.scriptpubkey_address === r);
      o = await this.onchainProvider.watchAddresses([r], (a) => {
        const u = a.filter((f) => c(f) !== -1).map((f) => {
          const { txid: l, status: h } = f, d = c(f), w = Number(f.vout[d].value);
          return { txid: l, vout: d, value: w, status: h };
        });
        t({
          type: "utxo",
          coins: u
        });
      });
    }
    if (this.indexerProvider && n) {
      const c = this.offchainTapscript, a = await this.indexerProvider.subscribeForScripts([
        $.encode(c.pkScript)
      ]), u = new AbortController(), f = this.indexerProvider.getSubscription(a, u.signal);
      s = async () => {
        u.abort(), await this.indexerProvider?.unsubscribeForScripts(a);
      }, (async () => {
        try {
          for await (const l of f)
            l.newVtxos?.length > 0 && t({
              type: "vtxo",
              newVtxos: l.newVtxos.map((h) => en(this, h)),
              spentVtxos: l.spentVtxos.map((h) => en(this, h))
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
    const s = new TextEncoder().encode(n), i = wt(s), c = $.encode(i);
    let a = !0;
    for (const l of t.intentIdHashes)
      if (l === c) {
        if (!this.arkProvider)
          throw new Error("Ark provider not configured");
        await this.arkProvider.confirmRegistration(n), a = !1;
      }
    if (a)
      return { skip: a };
    const u = Ut.encode({
      timelock: {
        value: t.batchExpiry,
        type: t.batchExpiry >= 512n ? "seconds" : "blocks"
      },
      pubkeys: [r]
    }).script, f = In(u);
    return {
      roundId: t.id,
      sweepTapTreeRoot: f,
      forfeitOutputScript: o,
      skip: !1
    };
  }
  // validates the vtxo tree, creates a signing session and generates the musig2 nonces
  async handleSettlementSigningEvent(t, n, r, o) {
    const s = yt.fromPSBT(It.decode(t.unsignedCommitmentTx));
    Yh(o, s, n);
    const i = s.getOutput(0);
    if (!i?.amount)
      throw new Error("Shared output not found");
    r.init(o, n, i.amount);
    const c = $.encode(await r.getPublicKey()), a = await r.getNonces();
    await this.arkProvider.submitTreeNonces(t.id, c, a);
  }
  async handleSettlementTreeNoncesEvent(t, n) {
    const { hasAllNonces: r } = await n.aggregatedNonces(t.txid, t.nonces);
    if (!r)
      return !1;
    const o = await n.sign(), s = $.encode(await n.getPublicKey());
    return await this.arkProvider.submitTreeSignatures(t.id, s, o), !0;
  }
  async handleSettlementFinalizationEvent(t, n, r, o) {
    const s = [], i = await this.getVirtualCoins();
    let c = yt.fromPSBT(It.decode(t.commitmentTx)), a = !1, u = 0;
    const f = o?.leaves() || [];
    for (const l of n) {
      const h = i.find((O) => O.txid === l.txid && O.vout === l.vout);
      if (!h) {
        a = !0;
        const O = [];
        for (let N = 0; N < c.inputsLength; N++) {
          const U = c.getInput(N);
          if (!U.txid || U.index === void 0)
            throw new Error("The server returned incomplete data. No settlement input found in the PSBT");
          $.encode(U.txid) === l.txid && U.index === l.vout && (c.updateInput(N, {
            tapLeafScript: [l.forfeitTapLeafScript]
          }), O.push(N));
        }
        c = await this.identity.sign(c, O);
        continue;
      }
      if (os(h) || Lu(h, this.dustAmount))
        continue;
      if (f.length === 0)
        throw new Error("connectors not received");
      if (u >= f.length)
        throw new Error("not enough connectors received");
      const d = f[u], w = d.id, g = d.getOutput(0);
      if (!g)
        throw new Error("connector output not found");
      const y = g.amount, S = g.script;
      if (!y || !S)
        throw new Error("invalid connector output");
      u++;
      let v = Vh([
        {
          txid: l.txid,
          index: l.vout,
          witnessUtxo: {
            amount: BigInt(h.value),
            script: Pt.decode(l.tapTree).pkScript
          },
          sighashType: Me.DEFAULT,
          tapLeafScript: [l.forfeitTapLeafScript]
        },
        {
          txid: w,
          index: 0,
          witnessUtxo: {
            amount: y,
            script: S
          }
        }
      ], r);
      v = await this.identity.sign(v, [0]), s.push(It.encode(v.toPSBT()));
    }
    (s.length > 0 || a) && await this.arkProvider.submitSignedForfeitTxs(s, a ? It.encode(c.toPSBT()) : void 0);
  }
  async makeRegisterIntentSignature(t, n, r, o) {
    const s = Math.floor(Date.now() / 1e3), i = this.prepareIntentProofInputs(t), c = {
      type: "register",
      onchain_output_indexes: r,
      valid_at: s,
      expire_at: s + 120,
      // valid for 2 minutes
      cosigners_public_keys: o
    }, a = JSON.stringify(c, null, 0), u = Kr.create(a, i, n), f = await this.identity.sign(u);
    return {
      proof: It.encode(f.toPSBT()),
      message: a
    };
  }
  async makeDeleteIntentSignature(t) {
    const n = Math.floor(Date.now() / 1e3), r = this.prepareIntentProofInputs(t), o = {
      type: "delete",
      expire_at: n + 120
      // valid for 2 minutes
    }, s = JSON.stringify(o, null, 0), i = Kr.create(s, r, []), c = await this.identity.sign(i);
    return {
      proof: It.encode(c.toPSBT()),
      message: s
    };
  }
  prepareIntentProofInputs(t) {
    const n = [];
    for (const r of t) {
      const o = Pt.decode(r.tapTree), s = Ep(r), i = [Ru.encode(r.tapTree)];
      r.extraWitness && i.push(mh.encode(r.extraWitness)), n.push({
        txid: $.decode(r.txid),
        index: r.vout,
        witnessUtxo: {
          amount: BigInt(r.value),
          script: o.pkScript
        },
        sequence: s,
        tapLeafScript: [r.intentTapLeafScript],
        unknown: i
      });
    }
    return n;
  }
}
pn.MIN_FEE_RATE = 1;
function Ep(e) {
  let t;
  try {
    const n = e.intentTapLeafScript[1], r = n.subarray(0, n.length - 1), o = Ut.decode(r).params;
    t = es.encode(o.timelock.type === "blocks" ? { blocks: Number(o.timelock.value) } : { seconds: Number(o.timelock.value) });
  } catch {
  }
  return t;
}
function xp(e) {
  try {
    return hn.decode(e), !0;
  } catch {
    return !1;
  }
}
function Sp(e, t) {
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
function yc() {
  const e = crypto.getRandomValues(new Uint8Array(16));
  return $.encode(e);
}
var V;
(function(e) {
  e.walletInitialized = (p) => ({
    type: "WALLET_INITIALIZED",
    success: !0,
    id: p
  });
  function t(p, E) {
    return {
      type: "ERROR",
      success: !1,
      message: E,
      id: p
    };
  }
  e.error = t;
  function n(p, E) {
    return {
      type: "SETTLE_EVENT",
      success: !0,
      event: E,
      id: p
    };
  }
  e.settleEvent = n;
  function r(p, E) {
    return {
      type: "SETTLE_SUCCESS",
      success: !0,
      txid: E,
      id: p
    };
  }
  e.settleSuccess = r;
  function o(p) {
    return p.type === "SETTLE_SUCCESS" && p.success;
  }
  e.isSettleSuccess = o;
  function s(p) {
    return p.type === "ADDRESS" && p.success === !0;
  }
  e.isAddress = s;
  function i(p) {
    return p.type === "BOARDING_ADDRESS" && p.success === !0;
  }
  e.isBoardingAddress = i;
  function c(p, E) {
    return {
      type: "ADDRESS",
      success: !0,
      address: E,
      id: p
    };
  }
  e.address = c;
  function a(p, E) {
    return {
      type: "BOARDING_ADDRESS",
      success: !0,
      address: E,
      id: p
    };
  }
  e.boardingAddress = a;
  function u(p) {
    return p.type === "BALANCE" && p.success === !0;
  }
  e.isBalance = u;
  function f(p, E) {
    return {
      type: "BALANCE",
      success: !0,
      balance: E,
      id: p
    };
  }
  e.balance = f;
  function l(p) {
    return p.type === "VTXOS" && p.success === !0;
  }
  e.isVtxos = l;
  function h(p, E) {
    return {
      type: "VTXOS",
      success: !0,
      vtxos: E,
      id: p
    };
  }
  e.vtxos = h;
  function d(p) {
    return p.type === "VIRTUAL_COINS" && p.success === !0;
  }
  e.isVirtualCoins = d;
  function w(p, E) {
    return {
      type: "VIRTUAL_COINS",
      success: !0,
      virtualCoins: E,
      id: p
    };
  }
  e.virtualCoins = w;
  function g(p) {
    return p.type === "BOARDING_UTXOS" && p.success === !0;
  }
  e.isBoardingUtxos = g;
  function y(p, E) {
    return {
      type: "BOARDING_UTXOS",
      success: !0,
      boardingUtxos: E,
      id: p
    };
  }
  e.boardingUtxos = y;
  function S(p) {
    return p.type === "SEND_BITCOIN_SUCCESS" && p.success === !0;
  }
  e.isSendBitcoinSuccess = S;
  function v(p, E) {
    return {
      type: "SEND_BITCOIN_SUCCESS",
      success: !0,
      txid: E,
      id: p
    };
  }
  e.sendBitcoinSuccess = v;
  function O(p) {
    return p.type === "TRANSACTION_HISTORY" && p.success === !0;
  }
  e.isTransactionHistory = O;
  function N(p, E) {
    return {
      type: "TRANSACTION_HISTORY",
      success: !0,
      transactions: E,
      id: p
    };
  }
  e.transactionHistory = N;
  function U(p) {
    return p.type === "WALLET_STATUS" && p.success === !0;
  }
  e.isWalletStatus = U;
  function W(p, E, A) {
    return {
      type: "WALLET_STATUS",
      success: !0,
      status: {
        walletInitialized: E,
        xOnlyPublicKey: A
      },
      id: p
    };
  }
  e.walletStatus = W;
  function x(p) {
    return p.type === "CLEAR_RESPONSE";
  }
  e.isClearResponse = x;
  function Q(p, E) {
    return {
      type: "CLEAR_RESPONSE",
      success: E,
      id: p
    };
  }
  e.clearResponse = Q;
  function C(p) {
    return p.type === "WALLET_RELOADED";
  }
  e.isWalletReloaded = C;
  function Ht(p, E) {
    return {
      type: "WALLET_RELOADED",
      success: E,
      id: p
    };
  }
  e.walletReloaded = Ht;
  function gt(p) {
    return p.type === "VTXO_UPDATE";
  }
  e.isVtxoUpdate = gt;
  function _(p, E) {
    return {
      type: "VTXO_UPDATE",
      id: yc(),
      // spontaneous update, not tied to a request
      success: !0,
      spentVtxos: E,
      newVtxos: p
    };
  }
  e.vtxoUpdate = _;
  function b(p) {
    return p.type === "UTXO_UPDATE";
  }
  e.isUtxoUpdate = b;
  function m(p) {
    return {
      type: "UTXO_UPDATE",
      id: yc(),
      // spontaneous update, not tied to a request
      success: !0,
      coins: p
    };
  }
  e.utxoUpdate = m;
})(V || (V = {}));
class vp {
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
const Tp = "arkade-service-worker";
class tt {
  constructor(t, n, r, o, s, i) {
    this.hasWitness = t, this.inputCount = n, this.outputCount = r, this.inputSize = o, this.inputWitnessSize = s, this.outputSize = i;
  }
  static create() {
    return new tt(!1, 0, 0, 0, 0, 0);
  }
  addP2AInput() {
    return this.inputCount++, this.inputSize += tt.INPUT_SIZE, this;
  }
  addKeySpendInput(t = !0) {
    return this.inputCount++, this.inputWitnessSize += 65 + (t ? 0 : 1), this.inputSize += tt.INPUT_SIZE, this.hasWitness = !0, this;
  }
  addP2PKHInput() {
    return this.inputCount++, this.inputWitnessSize++, this.inputSize += tt.INPUT_SIZE + tt.P2PKH_SCRIPT_SIG_SIZE, this;
  }
  addTapscriptInput(t, n, r) {
    const o = 1 + tt.BASE_CONTROL_BLOCK_SIZE + 1 + n + 1 + r;
    return this.inputCount++, this.inputWitnessSize += t + o, this.inputSize += tt.INPUT_SIZE, this.hasWitness = !0, this.inputCount++, this;
  }
  addP2WKHOutput() {
    return this.outputCount++, this.outputSize += tt.OUTPUT_SIZE + tt.P2WKH_OUTPUT_SIZE, this;
  }
  addP2TROutput() {
    return this.outputCount++, this.outputSize += tt.OUTPUT_SIZE + tt.P2TR_OUTPUT_SIZE, this;
  }
  vsize() {
    const t = (i) => i < 253 ? 1 : i < 65535 ? 3 : i < 4294967295 ? 5 : 9, n = t(this.inputCount), r = t(this.outputCount);
    let s = (tt.BASE_TX_SIZE + n + this.inputSize + r + this.outputSize) * tt.WITNESS_SCALE_FACTOR;
    return this.hasWitness && (s += tt.WITNESS_HEADER_SIZE + this.inputWitnessSize), Ap(s);
  }
}
tt.P2PKH_SCRIPT_SIG_SIZE = 108;
tt.INPUT_SIZE = 41;
tt.BASE_CONTROL_BLOCK_SIZE = 33;
tt.OUTPUT_SIZE = 9;
tt.P2WKH_OUTPUT_SIZE = 22;
tt.BASE_TX_SIZE = 10;
tt.WITNESS_HEADER_SIZE = 2;
tt.WITNESS_SCALE_FACTOR = 4;
tt.P2TR_OUTPUT_SIZE = 34;
const Ap = (e) => {
  const t = BigInt(Math.ceil(e / tt.WITNESS_SCALE_FACTOR));
  return {
    value: t,
    fee: (n) => n * t
  };
};
var mt;
(function(e) {
  function t(g) {
    return typeof g == "object" && g !== null && "type" in g;
  }
  e.isBase = t;
  function n(g) {
    return g.type === "INIT_WALLET" && "arkServerUrl" in g && typeof g.arkServerUrl == "string" && "privateKey" in g && typeof g.privateKey == "string" && ("arkServerPublicKey" in g ? g.arkServerPublicKey === void 0 || typeof g.arkServerPublicKey == "string" : !0);
  }
  e.isInitWallet = n;
  function r(g) {
    return g.type === "SETTLE";
  }
  e.isSettle = r;
  function o(g) {
    return g.type === "GET_ADDRESS";
  }
  e.isGetAddress = o;
  function s(g) {
    return g.type === "GET_BOARDING_ADDRESS";
  }
  e.isGetBoardingAddress = s;
  function i(g) {
    return g.type === "GET_BALANCE";
  }
  e.isGetBalance = i;
  function c(g) {
    return g.type === "GET_VTXOS";
  }
  e.isGetVtxos = c;
  function a(g) {
    return g.type === "GET_VIRTUAL_COINS";
  }
  e.isGetVirtualCoins = a;
  function u(g) {
    return g.type === "GET_BOARDING_UTXOS";
  }
  e.isGetBoardingUtxos = u;
  function f(g) {
    return g.type === "SEND_BITCOIN" && "params" in g && g.params !== null && typeof g.params == "object" && "address" in g.params && typeof g.params.address == "string" && "amount" in g.params && typeof g.params.amount == "number";
  }
  e.isSendBitcoin = f;
  function l(g) {
    return g.type === "GET_TRANSACTION_HISTORY";
  }
  e.isGetTransactionHistory = l;
  function h(g) {
    return g.type === "GET_STATUS";
  }
  e.isGetStatus = h;
  function d(g) {
    return g.type === "CLEAR";
  }
  e.isClear = d;
  function w(g) {
    return g.type === "RELOAD_WALLET";
  }
  e.isReloadWallet = w;
})(mt || (mt = {}));
class kp {
  constructor(t = Tp, n = 1, r = () => {
  }) {
    this.dbName = t, this.dbVersion = n, this.messageCallback = r, this.storage = new vp(t, n), this.walletRepository = new us(this.storage);
  }
  /**
   * Get spendable vtxos for the current wallet address
   */
  async getSpendableVtxos() {
    if (!this.wallet)
      return [];
    const t = await this.wallet.getAddress();
    return (await this.walletRepository.getVtxos(t)).filter(ue);
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
      spendable: n.filter(ue),
      spent: n.filter((r) => !ue(r))
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
    this.incomingFundsSubscription && this.incomingFundsSubscription(), await this.storage.clear(), this.walletRepository = new us(this.storage), this.wallet = void 0, this.arkProvider = void 0, this.indexerProvider = void 0;
  }
  async reload() {
    await this.onWalletInitialized();
  }
  async onWalletInitialized() {
    if (!this.wallet || !this.arkProvider || !this.indexerProvider || !this.wallet.offchainTapscript || !this.wallet.boardingTapscript)
      return;
    const t = $.encode(this.wallet.offchainTapscript.pkScript), r = (await this.indexerProvider.getVtxos({
      scripts: [t]
    })).vtxos.map((i) => en(this.wallet, i)), o = await this.wallet.getAddress();
    await this.walletRepository.saveVtxos(o, r);
    const s = await this.wallet.getTransactionHistory();
    s && await this.walletRepository.saveTransactions(o, s), this.incomingFundsSubscription && this.incomingFundsSubscription(), this.incomingFundsSubscription = await this.wallet.notifyIncomingFunds(async (i) => {
      if (i.type === "vtxo") {
        const c = i.newVtxos.length > 0 ? i.newVtxos.map((u) => en(this.wallet, u)) : [], a = i.spentVtxos.length > 0 ? i.spentVtxos.map((u) => en(this.wallet, u)) : [];
        if ([...c, ...a].length === 0)
          return;
        await this.walletRepository.saveVtxos(o, [
          ...c,
          ...a
        ]), this.sendMessageToAllClients(V.vtxoUpdate(c, a));
      }
      i.type === "utxo" && this.sendMessageToAllClients(V.utxoUpdate(i.coins));
    });
  }
  async handleClear(t) {
    await this.clear(), mt.isBase(t.data) && t.source?.postMessage(V.clearResponse(t.data.id, !0));
  }
  async handleInitWallet(t) {
    const n = t.data;
    if (!mt.isInitWallet(n)) {
      console.error("Invalid INIT_WALLET message format", n), t.source?.postMessage(V.error(n.id, "Invalid INIT_WALLET message format"));
      return;
    }
    if (!n.privateKey) {
      const r = "Missing privateKey";
      t.source?.postMessage(V.error(n.id, r)), console.error(r);
      return;
    }
    try {
      const { arkServerPublicKey: r, arkServerUrl: o, privateKey: s } = n, i = $n.fromHex(s);
      this.arkProvider = new _u(o), this.indexerProvider = new Hu(o), this.wallet = await pn.create({
        identity: i,
        arkServerUrl: o,
        arkServerPublicKey: r,
        storage: this.storage
        // Use unified storage for wallet too
      }), t.source?.postMessage(V.walletInitialized(n.id)), await this.onWalletInitialized();
    } catch (r) {
      console.error("Error initializing wallet:", r);
      const o = r instanceof Error ? r.message : "Unknown error occurred";
      t.source?.postMessage(V.error(n.id, o));
    }
  }
  async handleSettle(t) {
    const n = t.data;
    if (!mt.isSettle(n)) {
      console.error("Invalid SETTLE message format", n), t.source?.postMessage(V.error(n.id, "Invalid SETTLE message format"));
      return;
    }
    try {
      if (!this.wallet) {
        console.error("Wallet not initialized"), t.source?.postMessage(V.error(n.id, "Wallet not initialized"));
        return;
      }
      const r = await this.wallet.settle(n.params, (o) => {
        t.source?.postMessage(V.settleEvent(n.id, o));
      });
      t.source?.postMessage(V.settleSuccess(n.id, r));
    } catch (r) {
      console.error("Error settling:", r);
      const o = r instanceof Error ? r.message : "Unknown error occurred";
      t.source?.postMessage(V.error(n.id, o));
    }
  }
  async handleSendBitcoin(t) {
    const n = t.data;
    if (!mt.isSendBitcoin(n)) {
      console.error("Invalid SEND_BITCOIN message format", n), t.source?.postMessage(V.error(n.id, "Invalid SEND_BITCOIN message format"));
      return;
    }
    if (!this.wallet) {
      console.error("Wallet not initialized"), t.source?.postMessage(V.error(n.id, "Wallet not initialized"));
      return;
    }
    try {
      const r = await this.wallet.sendBitcoin(n.params);
      t.source?.postMessage(V.sendBitcoinSuccess(n.id, r));
    } catch (r) {
      console.error("Error sending bitcoin:", r);
      const o = r instanceof Error ? r.message : "Unknown error occurred";
      t.source?.postMessage(V.error(n.id, o));
    }
  }
  async handleGetAddress(t) {
    const n = t.data;
    if (!mt.isGetAddress(n)) {
      console.error("Invalid GET_ADDRESS message format", n), t.source?.postMessage(V.error(n.id, "Invalid GET_ADDRESS message format"));
      return;
    }
    if (!this.wallet) {
      console.error("Wallet not initialized"), t.source?.postMessage(V.error(n.id, "Wallet not initialized"));
      return;
    }
    try {
      const r = await this.wallet.getAddress();
      t.source?.postMessage(V.address(n.id, r));
    } catch (r) {
      console.error("Error getting address:", r);
      const o = r instanceof Error ? r.message : "Unknown error occurred";
      t.source?.postMessage(V.error(n.id, o));
    }
  }
  async handleGetBoardingAddress(t) {
    const n = t.data;
    if (!mt.isGetBoardingAddress(n)) {
      console.error("Invalid GET_BOARDING_ADDRESS message format", n), t.source?.postMessage(V.error(n.id, "Invalid GET_BOARDING_ADDRESS message format"));
      return;
    }
    if (!this.wallet) {
      console.error("Wallet not initialized"), t.source?.postMessage(V.error(n.id, "Wallet not initialized"));
      return;
    }
    try {
      const r = await this.wallet.getBoardingAddress();
      t.source?.postMessage(V.boardingAddress(n.id, r));
    } catch (r) {
      console.error("Error getting boarding address:", r);
      const o = r instanceof Error ? r.message : "Unknown error occurred";
      t.source?.postMessage(V.error(n.id, o));
    }
  }
  async handleGetBalance(t) {
    const n = t.data;
    if (!mt.isGetBalance(n)) {
      console.error("Invalid GET_BALANCE message format", n), t.source?.postMessage(V.error(n.id, "Invalid GET_BALANCE message format"));
      return;
    }
    if (!this.wallet) {
      console.error("Wallet not initialized"), t.source?.postMessage(V.error(n.id, "Wallet not initialized"));
      return;
    }
    try {
      const [r, o, s] = await Promise.all([
        this.wallet.getBoardingUtxos(),
        this.getSpendableVtxos(),
        this.getSweptVtxos()
      ]);
      let i = 0, c = 0;
      for (const d of r)
        d.status.confirmed ? i += d.value : c += d.value;
      let a = 0, u = 0, f = 0;
      for (const d of o)
        d.virtualStatus.state === "settled" ? a += d.value : d.virtualStatus.state === "preconfirmed" && (u += d.value);
      for (const d of s)
        ue(d) && (f += d.value);
      const l = i + c, h = a + u + f;
      t.source?.postMessage(V.balance(n.id, {
        boarding: {
          confirmed: i,
          unconfirmed: c,
          total: l
        },
        settled: a,
        preconfirmed: u,
        available: a + u,
        recoverable: f,
        total: l + h
      }));
    } catch (r) {
      console.error("Error getting balance:", r);
      const o = r instanceof Error ? r.message : "Unknown error occurred";
      t.source?.postMessage(V.error(n.id, o));
    }
  }
  async handleGetVtxos(t) {
    const n = t.data;
    if (!mt.isGetVtxos(n)) {
      console.error("Invalid GET_VTXOS message format", n), t.source?.postMessage(V.error(n.id, "Invalid GET_VTXOS message format"));
      return;
    }
    if (!this.wallet) {
      console.error("Wallet not initialized"), t.source?.postMessage(V.error(n.id, "Wallet not initialized"));
      return;
    }
    try {
      const r = await this.getSpendableVtxos(), o = this.wallet.dustAmount, i = n.filter?.withRecoverable ?? !1 ? r : r.filter((c) => !(o != null && Lu(c, o) || os(c)));
      t.source?.postMessage(V.vtxos(n.id, i));
    } catch (r) {
      console.error("Error getting vtxos:", r);
      const o = r instanceof Error ? r.message : "Unknown error occurred";
      t.source?.postMessage(V.error(n.id, o));
    }
  }
  async handleGetBoardingUtxos(t) {
    const n = t.data;
    if (!mt.isGetBoardingUtxos(n)) {
      console.error("Invalid GET_BOARDING_UTXOS message format", n), t.source?.postMessage(V.error(n.id, "Invalid GET_BOARDING_UTXOS message format"));
      return;
    }
    if (!this.wallet) {
      console.error("Wallet not initialized"), t.source?.postMessage(V.error(n.id, "Wallet not initialized"));
      return;
    }
    try {
      const r = await this.wallet.getBoardingUtxos();
      t.source?.postMessage(V.boardingUtxos(n.id, r));
    } catch (r) {
      console.error("Error getting boarding utxos:", r);
      const o = r instanceof Error ? r.message : "Unknown error occurred";
      t.source?.postMessage(V.error(n.id, o));
    }
  }
  async handleGetTransactionHistory(t) {
    const n = t.data;
    if (!mt.isGetTransactionHistory(n)) {
      console.error("Invalid GET_TRANSACTION_HISTORY message format", n), t.source?.postMessage(V.error(n.id, "Invalid GET_TRANSACTION_HISTORY message format"));
      return;
    }
    if (!this.wallet) {
      console.error("Wallet not initialized"), t.source?.postMessage(V.error(n.id, "Wallet not initialized"));
      return;
    }
    try {
      const { boardingTxs: r, commitmentsToIgnore: o } = await this.wallet.getBoardingTxs(), { spendable: s, spent: i } = await this.getAllVtxos(), c = Cu(s, i, o), a = [...r, ...c];
      a.sort(
        // place createdAt = 0 (unconfirmed txs) first, then descending
        (u, f) => u.createdAt === 0 ? -1 : f.createdAt === 0 ? 1 : f.createdAt - u.createdAt
      ), t.source?.postMessage(V.transactionHistory(n.id, a));
    } catch (r) {
      console.error("Error getting transaction history:", r);
      const o = r instanceof Error ? r.message : "Unknown error occurred";
      t.source?.postMessage(V.error(n.id, o));
    }
  }
  async handleGetStatus(t) {
    const n = t.data;
    if (!mt.isGetStatus(n)) {
      console.error("Invalid GET_STATUS message format", n), t.source?.postMessage(V.error(n.id, "Invalid GET_STATUS message format"));
      return;
    }
    const r = this.wallet ? await this.wallet.identity.xOnlyPublicKey() : void 0;
    t.source?.postMessage(V.walletStatus(n.id, this.wallet !== void 0, r));
  }
  async handleMessage(t) {
    this.messageCallback(t);
    const n = t.data;
    if (!mt.isBase(n)) {
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
        t.source?.postMessage(V.error(n.id, "Unknown message type"));
    }
  }
  async sendMessageToAllClients(t) {
    self.clients.matchAll({ includeUncontrolled: !0, type: "window" }).then((n) => {
      n.forEach((r) => {
        r.postMessage(t);
      });
    });
  }
  async handleReloadWallet(t) {
    const n = t.data;
    if (!mt.isReloadWallet(n)) {
      console.error("Invalid RELOAD_WALLET message format", n), t.source?.postMessage(V.error(n.id, "Invalid RELOAD_WALLET message format"));
      return;
    }
    if (!this.wallet) {
      console.error("Wallet not initialized"), t.source?.postMessage(V.walletReloaded(n.id, !1));
      return;
    }
    try {
      await this.onWalletInitialized(), t.source?.postMessage(V.walletReloaded(n.id, !0));
    } catch (r) {
      console.error("Error reloading wallet:", r), t.source?.postMessage(V.walletReloaded(n.id, !1));
    }
  }
}
var mc;
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
        if (!(f.type === tn.COMMITMENT || f.type === tn.UNSPECIFIED))
          try {
            if (!(await this.explorer.getTxStatus(f.txid)).confirmed)
              return {
                type: t.WAIT,
                txid: f.txid,
                do: Op(this.explorer, f.txid)
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
      const a = yt.fromPSBT(It.decode(c.txs[0]), {
        allowUnknownInputs: !0
      });
      if (s.type === tn.TREE) {
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
        do: Bp(this.bumper, this.explorer, a)
      };
    }
    /**
     * Iterate over the steps to be executed and execute them
     * @returns An async iterator over the executed steps
     */
    async *[Symbol.asyncIterator]() {
      let s;
      do {
        s !== void 0 && await Ip(1e3);
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
    const l = tt.create();
    for (const y of a) {
      if (!y.isUnrolled)
        throw new Error(`Vtxo ${y.txid}:${y.vout} is not fully unrolled, use unroll first`);
      const S = await o.onchainProvider.getTxStatus(y.txid);
      if (!S.confirmed)
        throw new Error(`tx ${y.txid} is not confirmed`);
      const v = $p({ height: S.blockHeight, time: S.blockTime }, c, y);
      if (!v)
        throw new Error(`no available exit path found for vtxo ${y.txid}:${y.vout}`);
      const O = Pt.decode(y.tapTree).findLeaf($.encode(v.script));
      if (!O)
        throw new Error(`spending leaf not found for vtxo ${y.txid}:${y.vout}`);
      f += BigInt(y.value), u.push({
        txid: y.txid,
        index: y.vout,
        tapLeafScript: [O],
        sequence: 4294967294,
        witnessUtxo: {
          amount: BigInt(y.value),
          script: Pt.decode(y.tapTree).pkScript
        },
        sighashType: Me.DEFAULT
      }), l.addTapscriptInput(64, O[1].length, Xt.encode(O[0]).length);
    }
    const h = new yt({ allowUnknownInputs: !0, version: 2 });
    for (const y of u)
      h.addInput(y);
    l.addP2TROutput();
    let d = await o.onchainProvider.getFeeRate();
    (!d || d < pn.MIN_FEE_RATE) && (d = pn.MIN_FEE_RATE);
    const w = l.vsize().fee(BigInt(d));
    if (w > f)
      throw new Error("fee amount is greater than the total amount");
    h.addOutputAddress(i, f - w);
    const g = await o.identity.sign(h);
    return g.finalize(), await o.onchainProvider.broadcastTransaction(g.hex), g.id;
  }
  e.completeUnroll = r;
})(mc || (mc = {}));
function Ip(e) {
  return new Promise((t) => setTimeout(t, e));
}
function Bp(e, t, n) {
  return async () => {
    const [r, o] = await e.bumpP2A(n);
    await t.broadcastTransaction(r, o);
  };
}
function Op(e, t) {
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
function $p(e, t, n) {
  const r = Pt.decode(n.tapTree).exitPaths();
  for (const o of r)
    if (o.params.timelock.type === "blocks") {
      if (t.height >= e.height + Number(o.params.timelock.value))
        return o;
    } else if (t.time >= e.time + Number(o.params.timelock.value))
      return o;
}
const Du = new kp();
Du.start().catch(console.error);
const Mu = "arkade-cache-v1";
self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(Mu)), self.skipWaiting();
});
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((t) => Promise.all(
      t.map((n) => {
        if (n !== Mu)
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
  e.data && e.data.type === "RELOAD_WALLET" && e.waitUntil(Du.reload().catch(console.error));
});
