/*! noble-hashes - MIT License (c) 2022 Paul Miller (paulmillr.com) */
function vo(e) {
  return e instanceof Uint8Array || ArrayBuffer.isView(e) && e.constructor.name === "Uint8Array";
}
function fe(e, t = "") {
  if (!Number.isSafeInteger(e) || e < 0) {
    const n = t && `"${t}" `;
    throw new Error(`${n}expected integer >0, got ${e}`);
  }
}
function V(e, t, n = "") {
  const r = vo(e), o = e?.length, s = t !== void 0;
  if (!r || s && o !== t) {
    const i = n && `"${n}" `, c = s ? ` of length ${t}` : "", a = r ? `length=${o}` : `type=${typeof e}`;
    throw new Error(i + "expected Uint8Array" + c + ", got " + a);
  }
  return e;
}
function li(e) {
  if (typeof e != "function" || typeof e.create != "function")
    throw new Error("Hash must wrapped by utils.createHasher");
  fe(e.outputLen), fe(e.blockLen);
}
function zn(e, t = !0) {
  if (e.destroyed)
    throw new Error("Hash instance has been destroyed");
  if (t && e.finished)
    throw new Error("Hash#digest() has already been called");
}
function ca(e, t) {
  V(e, void 0, "digestInto() output");
  const n = t.outputLen;
  if (e.length < n)
    throw new Error('"digestInto() output" expected to be of length >=' + n);
}
function De(...e) {
  for (let t = 0; t < e.length; t++)
    e[t].fill(0);
}
function Ur(e) {
  return new DataView(e.buffer, e.byteOffset, e.byteLength);
}
function Mt(e, t) {
  return e << 32 - t | e >>> t;
}
function Bn(e, t) {
  return e << t | e >>> 32 - t >>> 0;
}
const di = /* @ts-ignore */ typeof Uint8Array.from([]).toHex == "function" && typeof Uint8Array.fromHex == "function", aa = /* @__PURE__ */ Array.from({ length: 256 }, (e, t) => t.toString(16).padStart(2, "0"));
function yr(e) {
  if (V(e), di)
    return e.toHex();
  let t = "";
  for (let n = 0; n < e.length; n++)
    t += aa[e[n]];
  return t;
}
const Zt = { _0: 48, _9: 57, A: 65, F: 70, a: 97, f: 102 };
function cs(e) {
  if (e >= Zt._0 && e <= Zt._9)
    return e - Zt._0;
  if (e >= Zt.A && e <= Zt.F)
    return e - (Zt.A - 10);
  if (e >= Zt.a && e <= Zt.f)
    return e - (Zt.a - 10);
}
function jn(e) {
  if (typeof e != "string")
    throw new Error("hex string expected, got " + typeof e);
  if (di)
    return Uint8Array.fromHex(e);
  const t = e.length, n = t / 2;
  if (t % 2)
    throw new Error("hex string expected, got unpadded hex of length " + t);
  const r = new Uint8Array(n);
  for (let o = 0, s = 0; o < n; o++, s += 2) {
    const i = cs(e.charCodeAt(s)), c = cs(e.charCodeAt(s + 1));
    if (i === void 0 || c === void 0) {
      const a = e[s] + e[s + 1];
      throw new Error('hex string expected, got non-hex character "' + a + '" at index ' + s);
    }
    r[o] = i * 16 + c;
  }
  return r;
}
function Lt(...e) {
  let t = 0;
  for (let r = 0; r < e.length; r++) {
    const o = e[r];
    V(o), t += o.length;
  }
  const n = new Uint8Array(t);
  for (let r = 0, o = 0; r < e.length; r++) {
    const s = e[r];
    n.set(s, o), o += s.length;
  }
  return n;
}
function hi(e, t = {}) {
  const n = (o, s) => e(s).update(o).digest(), r = e(void 0);
  return n.outputLen = r.outputLen, n.blockLen = r.blockLen, n.create = (o) => e(o), Object.assign(n, t), Object.freeze(n);
}
function bn(e = 32) {
  const t = typeof globalThis == "object" ? globalThis.crypto : null;
  if (typeof t?.getRandomValues != "function")
    throw new Error("crypto.getRandomValues must be defined");
  return t.getRandomValues(new Uint8Array(e));
}
const ua = (e) => ({
  oid: Uint8Array.from([6, 9, 96, 134, 72, 1, 101, 3, 4, 2, e])
});
function fa(e, t, n) {
  return e & t ^ ~e & n;
}
function la(e, t, n) {
  return e & t ^ e & n ^ t & n;
}
class pi {
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
    this.blockLen = t, this.outputLen = n, this.padOffset = r, this.isLE = o, this.buffer = new Uint8Array(t), this.view = Ur(this.buffer);
  }
  update(t) {
    zn(this), V(t);
    const { view: n, buffer: r, blockLen: o } = this, s = t.length;
    for (let i = 0; i < s; ) {
      const c = Math.min(o - this.pos, s - i);
      if (c === o) {
        const a = Ur(t);
        for (; o <= s - i; i += o)
          this.process(a, i);
        continue;
      }
      r.set(t.subarray(i, i + c), this.pos), this.pos += c, i += c, this.pos === o && (this.process(n, 0), this.pos = 0);
    }
    return this.length += t.length, this.roundClean(), this;
  }
  digestInto(t) {
    zn(this), ca(t, this), this.finished = !0;
    const { buffer: n, view: r, blockLen: o, isLE: s } = this;
    let { pos: i } = this;
    n[i++] = 128, De(this.buffer.subarray(i)), this.padOffset > o - i && (this.process(r, 0), i = 0);
    for (let l = i; l < o; l++)
      n[l] = 0;
    r.setBigUint64(o - 8, BigInt(this.length * 8), s), this.process(r, 0);
    const c = Ur(t), a = this.outputLen;
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
const re = /* @__PURE__ */ Uint32Array.from([
  1779033703,
  3144134277,
  1013904242,
  2773480762,
  1359893119,
  2600822924,
  528734635,
  1541459225
]), da = /* @__PURE__ */ Uint32Array.from([
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
]), oe = /* @__PURE__ */ new Uint32Array(64);
class ha extends pi {
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
      oe[l] = t.getUint32(n, !1);
    for (let l = 16; l < 64; l++) {
      const d = oe[l - 15], h = oe[l - 2], w = Mt(d, 7) ^ Mt(d, 18) ^ d >>> 3, p = Mt(h, 17) ^ Mt(h, 19) ^ h >>> 10;
      oe[l] = p + oe[l - 7] + w + oe[l - 16] | 0;
    }
    let { A: r, B: o, C: s, D: i, E: c, F: a, G: u, H: f } = this;
    for (let l = 0; l < 64; l++) {
      const d = Mt(c, 6) ^ Mt(c, 11) ^ Mt(c, 25), h = f + d + fa(c, a, u) + da[l] + oe[l] | 0, p = (Mt(r, 2) ^ Mt(r, 13) ^ Mt(r, 22)) + la(r, o, s) | 0;
      f = u, u = a, a = c, c = i + h | 0, i = s, s = o, o = r, r = h + p | 0;
    }
    r = r + this.A | 0, o = o + this.B | 0, s = s + this.C | 0, i = i + this.D | 0, c = c + this.E | 0, a = a + this.F | 0, u = u + this.G | 0, f = f + this.H | 0, this.set(r, o, s, i, c, a, u, f);
  }
  roundClean() {
    De(oe);
  }
  destroy() {
    this.set(0, 0, 0, 0, 0, 0, 0, 0), De(this.buffer);
  }
}
class pa extends ha {
  // We cannot use array here since array allows indexing by variable
  // which means optimizer/compiler cannot use registers.
  A = re[0] | 0;
  B = re[1] | 0;
  C = re[2] | 0;
  D = re[3] | 0;
  E = re[4] | 0;
  F = re[5] | 0;
  G = re[6] | 0;
  H = re[7] | 0;
  constructor() {
    super(32);
  }
}
const ht = /* @__PURE__ */ hi(
  () => new pa(),
  /* @__PURE__ */ ua(1)
);
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const ko = /* @__PURE__ */ BigInt(0), Wr = /* @__PURE__ */ BigInt(1);
function qn(e, t = "") {
  if (typeof e != "boolean") {
    const n = t && `"${t}" `;
    throw new Error(n + "expected boolean, got type=" + typeof e);
  }
  return e;
}
function gi(e) {
  if (typeof e == "bigint") {
    if (!Hn(e))
      throw new Error("positive bigint expected, got " + e);
  } else
    fe(e);
  return e;
}
function On(e) {
  const t = gi(e).toString(16);
  return t.length & 1 ? "0" + t : t;
}
function wi(e) {
  if (typeof e != "string")
    throw new Error("hex string expected, got " + typeof e);
  return e === "" ? ko : BigInt("0x" + e);
}
function qt(e) {
  return wi(yr(e));
}
function yi(e) {
  return wi(yr(ga(V(e)).reverse()));
}
function Sn(e, t) {
  fe(t), e = gi(e);
  const n = jn(e.toString(16).padStart(t * 2, "0"));
  if (n.length !== t)
    throw new Error("number too large");
  return n;
}
function mi(e, t) {
  return Sn(e, t).reverse();
}
function ln(e, t) {
  if (e.length !== t.length)
    return !1;
  let n = 0;
  for (let r = 0; r < e.length; r++)
    n |= e[r] ^ t[r];
  return n === 0;
}
function ga(e) {
  return Uint8Array.from(e);
}
function wa(e) {
  return Uint8Array.from(e, (t, n) => {
    const r = t.charCodeAt(0);
    if (t.length !== 1 || r > 127)
      throw new Error(`string contains non-ASCII character "${e[n]}" with code ${r} at position ${n}`);
    return r;
  });
}
const Hn = (e) => typeof e == "bigint" && ko <= e;
function ya(e, t, n) {
  return Hn(e) && Hn(t) && Hn(n) && t <= e && e < n;
}
function xi(e, t, n, r) {
  if (!ya(t, n, r))
    throw new Error("expected valid " + e + ": " + n + " <= n < " + r + ", got " + t);
}
function ma(e) {
  let t;
  for (t = 0; e > ko; e >>= Wr, t += 1)
    ;
  return t;
}
const Ao = (e) => (Wr << BigInt(e)) - Wr;
function xa(e, t, n) {
  if (fe(e, "hashLen"), fe(t, "qByteLen"), typeof n != "function")
    throw new Error("hmacFn must be a function");
  const r = (m) => new Uint8Array(m), o = Uint8Array.of(), s = Uint8Array.of(0), i = Uint8Array.of(1), c = 1e3;
  let a = r(e), u = r(e), f = 0;
  const l = () => {
    a.fill(1), u.fill(0), f = 0;
  }, d = (...m) => n(u, Lt(a, ...m)), h = (m = o) => {
    u = d(s, m), a = d(), m.length !== 0 && (u = d(i, m), a = d());
  }, w = () => {
    if (f++ >= c)
      throw new Error("drbg: tried max amount of iterations");
    let m = 0;
    const x = [];
    for (; m < t; ) {
      a = d();
      const E = a.slice();
      x.push(E), m += a.length;
    }
    return Lt(...x);
  };
  return (m, x) => {
    l(), h(m);
    let E;
    for (; !(E = x(w())); )
      h();
    return l(), E;
  };
}
function Io(e, t = {}, n = {}) {
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
function as(e) {
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
const yt = /* @__PURE__ */ BigInt(0), gt = /* @__PURE__ */ BigInt(1), be = /* @__PURE__ */ BigInt(2), Ei = /* @__PURE__ */ BigInt(3), bi = /* @__PURE__ */ BigInt(4), Si = /* @__PURE__ */ BigInt(5), Ea = /* @__PURE__ */ BigInt(7), Ti = /* @__PURE__ */ BigInt(8), ba = /* @__PURE__ */ BigInt(9), vi = /* @__PURE__ */ BigInt(16);
function $t(e, t) {
  const n = e % t;
  return n >= yt ? n : t + n;
}
function It(e, t, n) {
  let r = e;
  for (; t-- > yt; )
    r *= r, r %= n;
  return r;
}
function us(e, t) {
  if (e === yt)
    throw new Error("invert: expected non-zero number");
  if (t <= yt)
    throw new Error("invert: expected positive modulus, got " + t);
  let n = $t(e, t), r = t, o = yt, s = gt;
  for (; n !== yt; ) {
    const c = r / n, a = r % n, u = o - s * c;
    r = n, n = a, o = s, s = u;
  }
  if (r !== gt)
    throw new Error("invert: does not exist");
  return $t(o, t);
}
function Bo(e, t, n) {
  if (!e.eql(e.sqr(t), n))
    throw new Error("Cannot find square root");
}
function ki(e, t) {
  const n = (e.ORDER + gt) / bi, r = e.pow(t, n);
  return Bo(e, r, t), r;
}
function Sa(e, t) {
  const n = (e.ORDER - Si) / Ti, r = e.mul(t, be), o = e.pow(r, n), s = e.mul(t, o), i = e.mul(e.mul(s, be), o), c = e.mul(s, e.sub(i, e.ONE));
  return Bo(e, c, t), c;
}
function Ta(e) {
  const t = mr(e), n = Ai(e), r = n(t, t.neg(t.ONE)), o = n(t, r), s = n(t, t.neg(r)), i = (e + Ea) / vi;
  return (c, a) => {
    let u = c.pow(a, i), f = c.mul(u, r);
    const l = c.mul(u, o), d = c.mul(u, s), h = c.eql(c.sqr(f), a), w = c.eql(c.sqr(l), a);
    u = c.cmov(u, f, h), f = c.cmov(d, l, w);
    const p = c.eql(c.sqr(f), a), m = c.cmov(u, f, p);
    return Bo(c, m, a), m;
  };
}
function Ai(e) {
  if (e < Ei)
    throw new Error("sqrt is not defined for small field");
  let t = e - gt, n = 0;
  for (; t % be === yt; )
    t /= be, n++;
  let r = be;
  const o = mr(e);
  for (; fs(o, r) === 1; )
    if (r++ > 1e3)
      throw new Error("Cannot find square root: probably non-prime P");
  if (n === 1)
    return ki;
  let s = o.pow(r, t);
  const i = (t + gt) / be;
  return function(a, u) {
    if (a.is0(u))
      return u;
    if (fs(a, u) !== 1)
      throw new Error("Cannot find square root");
    let f = n, l = a.mul(a.ONE, s), d = a.pow(u, t), h = a.pow(u, i);
    for (; !a.eql(d, a.ONE); ) {
      if (a.is0(d))
        return a.ZERO;
      let w = 1, p = a.sqr(d);
      for (; !a.eql(p, a.ONE); )
        if (w++, p = a.sqr(p), w === f)
          throw new Error("Cannot find square root");
      const m = gt << BigInt(f - w - 1), x = a.pow(l, m);
      f = w, l = a.sqr(x), d = a.mul(d, l), h = a.mul(h, x);
    }
    return h;
  };
}
function va(e) {
  return e % bi === Ei ? ki : e % Ti === Si ? Sa : e % vi === ba ? Ta(e) : Ai(e);
}
const ka = [
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
function Aa(e) {
  const t = {
    ORDER: "bigint",
    BYTES: "number",
    BITS: "number"
  }, n = ka.reduce((r, o) => (r[o] = "function", r), t);
  return Io(e, n), e;
}
function Ia(e, t, n) {
  if (n < yt)
    throw new Error("invalid exponent, negatives unsupported");
  if (n === yt)
    return e.ONE;
  if (n === gt)
    return t;
  let r = e.ONE, o = t;
  for (; n > yt; )
    n & gt && (r = e.mul(r, o)), o = e.sqr(o), n >>= gt;
  return r;
}
function Ii(e, t, n = !1) {
  const r = new Array(t.length).fill(n ? e.ZERO : void 0), o = t.reduce((i, c, a) => e.is0(c) ? i : (r[a] = i, e.mul(i, c)), e.ONE), s = e.inv(o);
  return t.reduceRight((i, c, a) => e.is0(c) ? i : (r[a] = e.mul(i, r[a]), e.mul(i, c)), s), r;
}
function fs(e, t) {
  const n = (e.ORDER - gt) / be, r = e.pow(t, n), o = e.eql(r, e.ONE), s = e.eql(r, e.ZERO), i = e.eql(r, e.neg(e.ONE));
  if (!o && !s && !i)
    throw new Error("invalid Legendre symbol result");
  return o ? 1 : s ? 0 : -1;
}
function Ba(e, t) {
  t !== void 0 && fe(t);
  const n = t !== void 0 ? t : e.toString(2).length, r = Math.ceil(n / 8);
  return { nBitLength: n, nByteLength: r };
}
class Oa {
  ORDER;
  BITS;
  BYTES;
  isLE;
  ZERO = yt;
  ONE = gt;
  _lengths;
  _sqrt;
  // cached sqrt
  _mod;
  constructor(t, n = {}) {
    if (t <= yt)
      throw new Error("invalid field: expected ORDER > 0, got " + t);
    let r;
    this.isLE = !1, n != null && typeof n == "object" && (typeof n.BITS == "number" && (r = n.BITS), typeof n.sqrt == "function" && (this.sqrt = n.sqrt), typeof n.isLE == "boolean" && (this.isLE = n.isLE), n.allowedLengths && (this._lengths = n.allowedLengths?.slice()), typeof n.modFromBytes == "boolean" && (this._mod = n.modFromBytes));
    const { nBitLength: o, nByteLength: s } = Ba(t, r);
    if (s > 2048)
      throw new Error("invalid field: expected ORDER of <= 2048 bytes");
    this.ORDER = t, this.BITS = o, this.BYTES = s, this._sqrt = void 0, Object.preventExtensions(this);
  }
  create(t) {
    return $t(t, this.ORDER);
  }
  isValid(t) {
    if (typeof t != "bigint")
      throw new Error("invalid field element: expected bigint, got " + typeof t);
    return yt <= t && t < this.ORDER;
  }
  is0(t) {
    return t === yt;
  }
  // is valid and invertible
  isValidNot0(t) {
    return !this.is0(t) && this.isValid(t);
  }
  isOdd(t) {
    return (t & gt) === gt;
  }
  neg(t) {
    return $t(-t, this.ORDER);
  }
  eql(t, n) {
    return t === n;
  }
  sqr(t) {
    return $t(t * t, this.ORDER);
  }
  add(t, n) {
    return $t(t + n, this.ORDER);
  }
  sub(t, n) {
    return $t(t - n, this.ORDER);
  }
  mul(t, n) {
    return $t(t * n, this.ORDER);
  }
  pow(t, n) {
    return Ia(this, t, n);
  }
  div(t, n) {
    return $t(t * us(n, this.ORDER), this.ORDER);
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
    return us(t, this.ORDER);
  }
  sqrt(t) {
    return this._sqrt || (this._sqrt = va(this.ORDER)), this._sqrt(this, t);
  }
  toBytes(t) {
    return this.isLE ? mi(t, this.BYTES) : Sn(t, this.BYTES);
  }
  fromBytes(t, n = !1) {
    V(t);
    const { _lengths: r, BYTES: o, isLE: s, ORDER: i, _mod: c } = this;
    if (r) {
      if (!r.includes(t.length) || t.length > o)
        throw new Error("Field.fromBytes: expected " + r + " bytes, got " + t.length);
      const u = new Uint8Array(o);
      u.set(t, s ? 0 : u.length - t.length), t = u;
    }
    if (t.length !== o)
      throw new Error("Field.fromBytes: expected " + o + " bytes, got " + t.length);
    let a = s ? yi(t) : qt(t);
    if (c && (a = $t(a, i)), !n && !this.isValid(a))
      throw new Error("invalid field element: outside of range 0..ORDER");
    return a;
  }
  // TODO: we don't need it here, move out to separate fn
  invertBatch(t) {
    return Ii(this, t);
  }
  // We can't move this out because Fp6, Fp12 implement it
  // and it's unclear what to return in there.
  cmov(t, n, r) {
    return r ? n : t;
  }
}
function mr(e, t = {}) {
  return new Oa(e, t);
}
function Bi(e) {
  if (typeof e != "bigint")
    throw new Error("field order must be bigint");
  const t = e.toString(2).length;
  return Math.ceil(t / 8);
}
function Oi(e) {
  const t = Bi(e);
  return t + Math.ceil(t / 2);
}
function Ui(e, t, n = !1) {
  V(e);
  const r = e.length, o = Bi(t), s = Oi(t);
  if (r < 16 || r < s || r > 1024)
    throw new Error("expected " + s + "-1024 bytes of input, got " + r);
  const i = n ? yi(e) : qt(e), c = $t(i, t - gt) + gt;
  return n ? mi(c, o) : Sn(c, o);
}
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const He = /* @__PURE__ */ BigInt(0), Se = /* @__PURE__ */ BigInt(1);
function Yn(e, t) {
  const n = t.negate();
  return e ? n : t;
}
function ls(e, t) {
  const n = Ii(e.Fp, t.map((r) => r.Z));
  return t.map((r, o) => e.fromAffine(r.toAffine(n[o])));
}
function Ni(e, t) {
  if (!Number.isSafeInteger(e) || e <= 0 || e > t)
    throw new Error("invalid window size, expected [1.." + t + "], got W=" + e);
}
function Nr(e, t) {
  Ni(e, t);
  const n = Math.ceil(t / e) + 1, r = 2 ** (e - 1), o = 2 ** e, s = Ao(e), i = BigInt(e);
  return { windows: n, windowSize: r, mask: s, maxNumber: o, shiftBy: i };
}
function ds(e, t, n) {
  const { windowSize: r, mask: o, maxNumber: s, shiftBy: i } = n;
  let c = Number(e & o), a = e >> i;
  c > r && (c -= s, a += Se);
  const u = t * r, f = u + Math.abs(c) - 1, l = c === 0, d = c < 0, h = t % 2 !== 0;
  return { nextN: a, offset: f, isZero: l, isNeg: d, isNegF: h, offsetF: u };
}
const Rr = /* @__PURE__ */ new WeakMap(), Ri = /* @__PURE__ */ new WeakMap();
function $r(e) {
  return Ri.get(e) || 1;
}
function hs(e) {
  if (e !== He)
    throw new Error("invalid wNAF");
}
let Ua = class {
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
    for (; n > He; )
      n & Se && (r = r.add(o)), o = o.double(), n >>= Se;
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
    const { windows: r, windowSize: o } = Nr(n, this.bits), s = [];
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
    const i = Nr(t, this.bits);
    for (let c = 0; c < i.windows; c++) {
      const { nextN: a, offset: u, isZero: f, isNeg: l, isNegF: d, offsetF: h } = ds(r, c, i);
      r = a, f ? s = s.add(Yn(d, n[h])) : o = o.add(Yn(l, n[u]));
    }
    return hs(r), { p: o, f: s };
  }
  /**
   * Implements ec unsafe (non const-time) multiplication using precomputed tables and w-ary non-adjacent form.
   * @param acc accumulator point to add result of multiplication
   * @returns point
   */
  wNAFUnsafe(t, n, r, o = this.ZERO) {
    const s = Nr(t, this.bits);
    for (let i = 0; i < s.windows && r !== He; i++) {
      const { nextN: c, offset: a, isZero: u, isNeg: f } = ds(r, i, s);
      if (r = c, !u) {
        const l = n[a];
        o = o.add(f ? l.negate() : l);
      }
    }
    return hs(r), o;
  }
  getPrecomputes(t, n, r) {
    let o = Rr.get(n);
    return o || (o = this.precomputeWindow(n, t), t !== 1 && (typeof r == "function" && (o = r(o)), Rr.set(n, o))), o;
  }
  cached(t, n, r) {
    const o = $r(t);
    return this.wNAF(o, this.getPrecomputes(o, t, r), n);
  }
  unsafe(t, n, r, o) {
    const s = $r(t);
    return s === 1 ? this._unsafeLadder(t, n, o) : this.wNAFUnsafe(s, this.getPrecomputes(s, t, r), n, o);
  }
  // We calculate precomputes for elliptic curve point multiplication
  // using windowed method. This specifies window size and
  // stores precomputed values. Usually only base point would be precomputed.
  createCache(t, n) {
    Ni(n, this.bits), Ri.set(t, n), Rr.delete(t);
  }
  hasCache(t) {
    return $r(t) !== 1;
  }
};
function Na(e, t, n, r) {
  let o = t, s = e.ZERO, i = e.ZERO;
  for (; n > He || r > He; )
    n & Se && (s = s.add(o)), r & Se && (i = i.add(o)), o = o.double(), n >>= Se, r >>= Se;
  return { p1: s, p2: i };
}
function ps(e, t, n) {
  if (t) {
    if (t.ORDER !== e)
      throw new Error("Field.ORDER must match order: Fp == p, Fn == n");
    return Aa(t), t;
  } else
    return mr(e, { isLE: n });
}
function Ra(e, t, n = {}, r) {
  if (r === void 0 && (r = e === "edwards"), !t || typeof t != "object")
    throw new Error(`expected valid ${e} CURVE object`);
  for (const a of ["p", "n", "h"]) {
    const u = t[a];
    if (!(typeof u == "bigint" && u > He))
      throw new Error(`CURVE.${a} must be positive bigint`);
  }
  const o = ps(t.p, n.Fp, r), s = ps(t.n, n.Fn, r), c = ["Gx", "Gy", "a", "b"];
  for (const a of c)
    if (!o.isValid(t[a]))
      throw new Error(`CURVE.${a} must be valid field element of CURVE.Fp`);
  return t = Object.freeze(Object.assign({}, t)), { CURVE: t, Fp: o, Fn: s };
}
function $i(e, t) {
  return function(r) {
    const o = e(r);
    return { secretKey: o, publicKey: t(o) };
  };
}
class Ci {
  oHash;
  iHash;
  blockLen;
  outputLen;
  finished = !1;
  destroyed = !1;
  constructor(t, n) {
    if (li(t), V(n, void 0, "key"), this.iHash = t.create(), typeof this.iHash.update != "function")
      throw new Error("Expected instance of class which extends utils.Hash");
    this.blockLen = this.iHash.blockLen, this.outputLen = this.iHash.outputLen;
    const r = this.blockLen, o = new Uint8Array(r);
    o.set(n.length > r ? t.create().update(n).digest() : n);
    for (let s = 0; s < o.length; s++)
      o[s] ^= 54;
    this.iHash.update(o), this.oHash = t.create();
    for (let s = 0; s < o.length; s++)
      o[s] ^= 106;
    this.oHash.update(o), De(o);
  }
  update(t) {
    return zn(this), this.iHash.update(t), this;
  }
  digestInto(t) {
    zn(this), V(t, this.outputLen, "output"), this.finished = !0, this.iHash.digestInto(t), this.oHash.update(t), this.oHash.digestInto(t), this.destroy();
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
const Li = (e, t, n) => new Ci(e, t).update(n).digest();
Li.create = (e, t) => new Ci(e, t);
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const gs = (e, t) => (e + (e >= 0 ? t : -t) / Pi) / t;
function $a(e, t, n) {
  const [[r, o], [s, i]] = t, c = gs(i * e, n), a = gs(-o * e, n);
  let u = e - c * r - a * s, f = -c * o - a * i;
  const l = u < Qt, d = f < Qt;
  l && (u = -u), d && (f = -f);
  const h = Ao(Math.ceil(ma(n) / 2)) + Ce;
  if (u < Qt || u >= h || f < Qt || f >= h)
    throw new Error("splitScalar (endomorphism): failed, k=" + e);
  return { k1neg: l, k1: u, k2neg: d, k2: f };
}
function Gr(e) {
  if (!["compact", "recovered", "der"].includes(e))
    throw new Error('Signature format must be "compact", "recovered", or "der"');
  return e;
}
function Cr(e, t) {
  const n = {};
  for (let r of Object.keys(t))
    n[r] = e[r] === void 0 ? t[r] : e[r];
  return qn(n.lowS, "lowS"), qn(n.prehash, "prehash"), n.format !== void 0 && Gr(n.format), n;
}
class Ca extends Error {
  constructor(t = "") {
    super(t);
  }
}
const ie = {
  // asn.1 DER encoding utils
  Err: Ca,
  // Basic building block is TLV (Tag-Length-Value)
  _tlv: {
    encode: (e, t) => {
      const { Err: n } = ie;
      if (e < 0 || e > 256)
        throw new n("tlv.encode: wrong tag");
      if (t.length & 1)
        throw new n("tlv.encode: unpadded data");
      const r = t.length / 2, o = On(r);
      if (o.length / 2 & 128)
        throw new n("tlv.encode: long form length too big");
      const s = r > 127 ? On(o.length / 2 | 128) : "";
      return On(e) + s + o + t;
    },
    // v - value, l - left bytes (unparsed)
    decode(e, t) {
      const { Err: n } = ie;
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
      const { Err: t } = ie;
      if (e < Qt)
        throw new t("integer: negative integers are not allowed");
      let n = On(e);
      if (Number.parseInt(n[0], 16) & 8 && (n = "00" + n), n.length & 1)
        throw new t("unexpected DER parsing assertion: unpadded hex");
      return n;
    },
    decode(e) {
      const { Err: t } = ie;
      if (e[0] & 128)
        throw new t("invalid signature integer: negative");
      if (e[0] === 0 && !(e[1] & 128))
        throw new t("invalid signature integer: unnecessary leading zero");
      return qt(e);
    }
  },
  toSig(e) {
    const { Err: t, _int: n, _tlv: r } = ie, o = V(e, void 0, "signature"), { v: s, l: i } = r.decode(48, o);
    if (i.length)
      throw new t("invalid signature: left bytes after parsing");
    const { v: c, l: a } = r.decode(2, s), { v: u, l: f } = r.decode(2, a);
    if (f.length)
      throw new t("invalid signature: left bytes after parsing");
    return { r: n.decode(c), s: n.decode(u) };
  },
  hexFromSig(e) {
    const { _tlv: t, _int: n } = ie, r = t.encode(2, n.encode(e.r)), o = t.encode(2, n.encode(e.s)), s = r + o;
    return t.encode(48, s);
  }
}, Qt = BigInt(0), Ce = BigInt(1), Pi = BigInt(2), Un = BigInt(3), La = BigInt(4);
function Pa(e, t = {}) {
  const n = Ra("weierstrass", e, t), { Fp: r, Fn: o } = n;
  let s = n.CURVE;
  const { h: i, n: c } = s;
  Io(t, {}, {
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
  const u = Vi(r, o);
  function f() {
    if (!r.isOdd)
      throw new Error("compression is not supported: Field does not have .isOdd()");
  }
  function l(K, k, T) {
    const { x: g, y: b } = k.toAffine(), U = r.toBytes(g);
    if (qn(T, "isCompressed"), T) {
      f();
      const $ = !r.isOdd(b);
      return Lt(_i($), U);
    } else
      return Lt(Uint8Array.of(4), U, r.toBytes(b));
  }
  function d(K) {
    V(K, void 0, "Point");
    const { publicKey: k, publicKeyUncompressed: T } = u, g = K.length, b = K[0], U = K.subarray(1);
    if (g === k && (b === 2 || b === 3)) {
      const $ = r.fromBytes(U);
      if (!r.isValid($))
        throw new Error("bad point: is not on curve, wrong x");
      const R = p($);
      let B;
      try {
        B = r.sqrt(R);
      } catch (et) {
        const Y = et instanceof Error ? ": " + et.message : "";
        throw new Error("bad point: is not on curve, sqrt error" + Y);
      }
      f();
      const C = r.isOdd(B);
      return (b & 1) === 1 !== C && (B = r.neg(B)), { x: $, y: B };
    } else if (g === T && b === 4) {
      const $ = r.BYTES, R = r.fromBytes(U.subarray(0, $)), B = r.fromBytes(U.subarray($, $ * 2));
      if (!m(R, B))
        throw new Error("bad point: is not on curve");
      return { x: R, y: B };
    } else
      throw new Error(`bad point: got length ${g}, expected compressed=${k} or uncompressed=${T}`);
  }
  const h = t.toBytes || l, w = t.fromBytes || d;
  function p(K) {
    const k = r.sqr(K), T = r.mul(k, K);
    return r.add(r.add(T, r.mul(K, s.a)), s.b);
  }
  function m(K, k) {
    const T = r.sqr(k), g = p(K);
    return r.eql(T, g);
  }
  if (!m(s.Gx, s.Gy))
    throw new Error("bad curve params: generator point");
  const x = r.mul(r.pow(s.a, Un), La), E = r.mul(r.sqr(s.b), BigInt(27));
  if (r.is0(r.add(x, E)))
    throw new Error("bad curve params: a or b");
  function v(K, k, T = !1) {
    if (!r.isValid(k) || T && r.is0(k))
      throw new Error(`bad point coordinate ${K}`);
    return k;
  }
  function O(K) {
    if (!(K instanceof H))
      throw new Error("Weierstrass Point expected");
  }
  function A(K) {
    if (!a || !a.basises)
      throw new Error("no endo");
    return $a(K, a.basises, o.ORDER);
  }
  const F = as((K, k) => {
    const { X: T, Y: g, Z: b } = K;
    if (r.eql(b, r.ONE))
      return { x: T, y: g };
    const U = K.is0();
    k == null && (k = U ? r.ONE : r.inv(b));
    const $ = r.mul(T, k), R = r.mul(g, k), B = r.mul(b, k);
    if (U)
      return { x: r.ZERO, y: r.ZERO };
    if (!r.eql(B, r.ONE))
      throw new Error("invZ was invalid");
    return { x: $, y: R };
  }), y = as((K) => {
    if (K.is0()) {
      if (t.allowInfinityPoint && !r.is0(K.Y))
        return;
      throw new Error("bad point: ZERO");
    }
    const { x: k, y: T } = K.toAffine();
    if (!r.isValid(k) || !r.isValid(T))
      throw new Error("bad point: x or y not field elements");
    if (!m(k, T))
      throw new Error("bad point: equation left != right");
    if (!K.isTorsionFree())
      throw new Error("bad point: not in prime-order subgroup");
    return !0;
  });
  function tt(K, k, T, g, b) {
    return T = new H(r.mul(T.X, K), T.Y, T.Z), k = Yn(g, k), T = Yn(b, T), k.add(T);
  }
  class H {
    // base / generator point
    static BASE = new H(s.Gx, s.Gy, r.ONE);
    // zero / infinity / identity point
    static ZERO = new H(r.ZERO, r.ONE, r.ZERO);
    // 0, 1, 0
    // math field
    static Fp = r;
    // scalar field
    static Fn = o;
    X;
    Y;
    Z;
    /** Does NOT validate if the point is valid. Use `.assertValidity()`. */
    constructor(k, T, g) {
      this.X = v("x", k), this.Y = v("y", T, !0), this.Z = v("z", g), Object.freeze(this);
    }
    static CURVE() {
      return s;
    }
    /** Does NOT validate if the point is valid. Use `.assertValidity()`. */
    static fromAffine(k) {
      const { x: T, y: g } = k || {};
      if (!k || !r.isValid(T) || !r.isValid(g))
        throw new Error("invalid affine point");
      if (k instanceof H)
        throw new Error("projective point not allowed");
      return r.is0(T) && r.is0(g) ? H.ZERO : new H(T, g, r.ONE);
    }
    static fromBytes(k) {
      const T = H.fromAffine(w(V(k, void 0, "point")));
      return T.assertValidity(), T;
    }
    static fromHex(k) {
      return H.fromBytes(jn(k));
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
    precompute(k = 8, T = !0) {
      return Yt.createCache(this, k), T || this.multiply(Un), this;
    }
    // TODO: return `this`
    /** A point on curve is valid if it conforms to equation. */
    assertValidity() {
      y(this);
    }
    hasEvenY() {
      const { y: k } = this.toAffine();
      if (!r.isOdd)
        throw new Error("Field doesn't support isOdd");
      return !r.isOdd(k);
    }
    /** Compare one point to another. */
    equals(k) {
      O(k);
      const { X: T, Y: g, Z: b } = this, { X: U, Y: $, Z: R } = k, B = r.eql(r.mul(T, R), r.mul(U, b)), C = r.eql(r.mul(g, R), r.mul($, b));
      return B && C;
    }
    /** Flips point to one corresponding to (x, -y) in Affine coordinates. */
    negate() {
      return new H(this.X, r.neg(this.Y), this.Z);
    }
    // Renes-Costello-Batina exception-free doubling formula.
    // There is 30% faster Jacobian formula, but it is not complete.
    // https://eprint.iacr.org/2015/1060, algorithm 3
    // Cost: 8M + 3S + 3*a + 2*b3 + 15add.
    double() {
      const { a: k, b: T } = s, g = r.mul(T, Un), { X: b, Y: U, Z: $ } = this;
      let R = r.ZERO, B = r.ZERO, C = r.ZERO, P = r.mul(b, b), et = r.mul(U, U), Y = r.mul($, $), M = r.mul(b, U);
      return M = r.add(M, M), C = r.mul(b, $), C = r.add(C, C), R = r.mul(k, C), B = r.mul(g, Y), B = r.add(R, B), R = r.sub(et, B), B = r.add(et, B), B = r.mul(R, B), R = r.mul(M, R), C = r.mul(g, C), Y = r.mul(k, Y), M = r.sub(P, Y), M = r.mul(k, M), M = r.add(M, C), C = r.add(P, P), P = r.add(C, P), P = r.add(P, Y), P = r.mul(P, M), B = r.add(B, P), Y = r.mul(U, $), Y = r.add(Y, Y), P = r.mul(Y, M), R = r.sub(R, P), C = r.mul(Y, et), C = r.add(C, C), C = r.add(C, C), new H(R, B, C);
    }
    // Renes-Costello-Batina exception-free addition formula.
    // There is 30% faster Jacobian formula, but it is not complete.
    // https://eprint.iacr.org/2015/1060, algorithm 1
    // Cost: 12M + 0S + 3*a + 3*b3 + 23add.
    add(k) {
      O(k);
      const { X: T, Y: g, Z: b } = this, { X: U, Y: $, Z: R } = k;
      let B = r.ZERO, C = r.ZERO, P = r.ZERO;
      const et = s.a, Y = r.mul(s.b, Un);
      let M = r.mul(T, U), Q = r.mul(g, $), lt = r.mul(b, R), Ht = r.add(T, g), J = r.add(U, $);
      Ht = r.mul(Ht, J), J = r.add(M, Q), Ht = r.sub(Ht, J), J = r.add(T, b);
      let dt = r.add(U, R);
      return J = r.mul(J, dt), dt = r.add(M, lt), J = r.sub(J, dt), dt = r.add(g, b), B = r.add($, R), dt = r.mul(dt, B), B = r.add(Q, lt), dt = r.sub(dt, B), P = r.mul(et, J), B = r.mul(Y, lt), P = r.add(B, P), B = r.sub(Q, P), P = r.add(Q, P), C = r.mul(B, P), Q = r.add(M, M), Q = r.add(Q, M), lt = r.mul(et, lt), J = r.mul(Y, J), Q = r.add(Q, lt), lt = r.sub(M, lt), lt = r.mul(et, lt), J = r.add(J, lt), M = r.mul(Q, J), C = r.add(C, M), M = r.mul(dt, J), B = r.mul(Ht, B), B = r.sub(B, M), M = r.mul(Ht, Q), P = r.mul(dt, P), P = r.add(P, M), new H(B, C, P);
    }
    subtract(k) {
      return this.add(k.negate());
    }
    is0() {
      return this.equals(H.ZERO);
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
    multiply(k) {
      const { endo: T } = t;
      if (!o.isValidNot0(k))
        throw new Error("invalid scalar: out of range");
      let g, b;
      const U = ($) => Yt.cached(this, $, (R) => ls(H, R));
      if (T) {
        const { k1neg: $, k1: R, k2neg: B, k2: C } = A(k), { p: P, f: et } = U(R), { p: Y, f: M } = U(C);
        b = et.add(M), g = tt(T.beta, P, Y, $, B);
      } else {
        const { p: $, f: R } = U(k);
        g = $, b = R;
      }
      return ls(H, [g, b])[0];
    }
    /**
     * Non-constant-time multiplication. Uses double-and-add algorithm.
     * It's faster, but should only be used when you don't care about
     * an exposed secret key e.g. sig verification, which works over *public* keys.
     */
    multiplyUnsafe(k) {
      const { endo: T } = t, g = this;
      if (!o.isValid(k))
        throw new Error("invalid scalar: out of range");
      if (k === Qt || g.is0())
        return H.ZERO;
      if (k === Ce)
        return g;
      if (Yt.hasCache(this))
        return this.multiply(k);
      if (T) {
        const { k1neg: b, k1: U, k2neg: $, k2: R } = A(k), { p1: B, p2: C } = Na(H, g, U, R);
        return tt(T.beta, B, C, b, $);
      } else
        return Yt.unsafe(g, k);
    }
    /**
     * Converts Projective point to affine (x, y) coordinates.
     * @param invertedZ Z^-1 (inverted zero) - optional, precomputation is useful for invertBatch
     */
    toAffine(k) {
      return F(this, k);
    }
    /**
     * Checks whether Point is free of torsion elements (is in prime subgroup).
     * Always torsion-free for cofactor=1 curves.
     */
    isTorsionFree() {
      const { isTorsionFree: k } = t;
      return i === Ce ? !0 : k ? k(H, this) : Yt.unsafe(this, c).is0();
    }
    clearCofactor() {
      const { clearCofactor: k } = t;
      return i === Ce ? this : k ? k(H, this) : this.multiplyUnsafe(i);
    }
    isSmallOrder() {
      return this.multiplyUnsafe(i).is0();
    }
    toBytes(k = !0) {
      return qn(k, "isCompressed"), this.assertValidity(), h(H, this, k);
    }
    toHex(k = !0) {
      return yr(this.toBytes(k));
    }
    toString() {
      return `<Point ${this.is0() ? "ZERO" : this.toHex()}>`;
    }
  }
  const Ue = o.BITS, Yt = new Ua(H, t.endo ? Math.ceil(Ue / 2) : Ue);
  return H.BASE.precompute(8), H;
}
function _i(e) {
  return Uint8Array.of(e ? 2 : 3);
}
function Vi(e, t) {
  return {
    secretKey: t.BYTES,
    publicKey: 1 + e.BYTES,
    publicKeyUncompressed: 1 + 2 * e.BYTES,
    publicKeyHasPrefix: !0,
    signature: 2 * t.BYTES
  };
}
function _a(e, t = {}) {
  const { Fn: n } = e, r = t.randomBytes || bn, o = Object.assign(Vi(e.Fp, n), { seed: Oi(n.ORDER) });
  function s(h) {
    try {
      const w = n.fromBytes(h);
      return n.isValidNot0(w);
    } catch {
      return !1;
    }
  }
  function i(h, w) {
    const { publicKey: p, publicKeyUncompressed: m } = o;
    try {
      const x = h.length;
      return w === !0 && x !== p || w === !1 && x !== m ? !1 : !!e.fromBytes(h);
    } catch {
      return !1;
    }
  }
  function c(h = r(o.seed)) {
    return Ui(V(h, o.seed, "seed"), n.ORDER);
  }
  function a(h, w = !0) {
    return e.BASE.multiply(n.fromBytes(h)).toBytes(w);
  }
  function u(h) {
    const { secretKey: w, publicKey: p, publicKeyUncompressed: m } = o;
    if (!vo(h) || "_lengths" in n && n._lengths || w === p)
      return;
    const x = V(h, void 0, "key").length;
    return x === p || x === m;
  }
  function f(h, w, p = !0) {
    if (u(h) === !0)
      throw new Error("first arg must be private key");
    if (u(w) === !1)
      throw new Error("second arg must be public key");
    const m = n.fromBytes(h);
    return e.fromBytes(w).multiply(m).toBytes(p);
  }
  const l = {
    isValidSecretKey: s,
    isValidPublicKey: i,
    randomSecretKey: c
  }, d = $i(c, a);
  return Object.freeze({ getPublicKey: a, getSharedSecret: f, keygen: d, Point: e, utils: l, lengths: o });
}
function Va(e, t, n = {}) {
  li(t), Io(n, {}, {
    hmac: "function",
    lowS: "boolean",
    randomBytes: "function",
    bits2int: "function",
    bits2int_modN: "function"
  }), n = Object.assign({}, n);
  const r = n.randomBytes || bn, o = n.hmac || ((T, g) => Li(t, T, g)), { Fp: s, Fn: i } = e, { ORDER: c, BITS: a } = i, { keygen: u, getPublicKey: f, getSharedSecret: l, utils: d, lengths: h } = _a(e, n), w = {
    prehash: !0,
    lowS: typeof n.lowS == "boolean" ? n.lowS : !0,
    format: "compact",
    extraEntropy: !1
  }, p = c * Pi < s.ORDER;
  function m(T) {
    const g = c >> Ce;
    return T > g;
  }
  function x(T, g) {
    if (!i.isValidNot0(g))
      throw new Error(`invalid signature ${T}: out of range 1..Point.Fn.ORDER`);
    return g;
  }
  function E() {
    if (p)
      throw new Error('"recovered" sig type is not supported for cofactor >2 curves');
  }
  function v(T, g) {
    Gr(g);
    const b = h.signature, U = g === "compact" ? b : g === "recovered" ? b + 1 : void 0;
    return V(T, U);
  }
  class O {
    r;
    s;
    recovery;
    constructor(g, b, U) {
      if (this.r = x("r", g), this.s = x("s", b), U != null) {
        if (E(), ![0, 1, 2, 3].includes(U))
          throw new Error("invalid recovery id");
        this.recovery = U;
      }
      Object.freeze(this);
    }
    static fromBytes(g, b = w.format) {
      v(g, b);
      let U;
      if (b === "der") {
        const { r: C, s: P } = ie.toSig(V(g));
        return new O(C, P);
      }
      b === "recovered" && (U = g[0], b = "compact", g = g.subarray(1));
      const $ = h.signature / 2, R = g.subarray(0, $), B = g.subarray($, $ * 2);
      return new O(i.fromBytes(R), i.fromBytes(B), U);
    }
    static fromHex(g, b) {
      return this.fromBytes(jn(g), b);
    }
    assertRecovery() {
      const { recovery: g } = this;
      if (g == null)
        throw new Error("invalid recovery id: must be present");
      return g;
    }
    addRecoveryBit(g) {
      return new O(this.r, this.s, g);
    }
    recoverPublicKey(g) {
      const { r: b, s: U } = this, $ = this.assertRecovery(), R = $ === 2 || $ === 3 ? b + c : b;
      if (!s.isValid(R))
        throw new Error("invalid recovery id: sig.r+curve.n != R.x");
      const B = s.toBytes(R), C = e.fromBytes(Lt(_i(($ & 1) === 0), B)), P = i.inv(R), et = F(V(g, void 0, "msgHash")), Y = i.create(-et * P), M = i.create(U * P), Q = e.BASE.multiplyUnsafe(Y).add(C.multiplyUnsafe(M));
      if (Q.is0())
        throw new Error("invalid recovery: point at infinify");
      return Q.assertValidity(), Q;
    }
    // Signatures should be low-s, to prevent malleability.
    hasHighS() {
      return m(this.s);
    }
    toBytes(g = w.format) {
      if (Gr(g), g === "der")
        return jn(ie.hexFromSig(this));
      const { r: b, s: U } = this, $ = i.toBytes(b), R = i.toBytes(U);
      return g === "recovered" ? (E(), Lt(Uint8Array.of(this.assertRecovery()), $, R)) : Lt($, R);
    }
    toHex(g) {
      return yr(this.toBytes(g));
    }
  }
  const A = n.bits2int || function(g) {
    if (g.length > 8192)
      throw new Error("input is too large");
    const b = qt(g), U = g.length * 8 - a;
    return U > 0 ? b >> BigInt(U) : b;
  }, F = n.bits2int_modN || function(g) {
    return i.create(A(g));
  }, y = Ao(a);
  function tt(T) {
    return xi("num < 2^" + a, T, Qt, y), i.toBytes(T);
  }
  function H(T, g) {
    return V(T, void 0, "message"), g ? V(t(T), void 0, "prehashed message") : T;
  }
  function Ue(T, g, b) {
    const { lowS: U, prehash: $, extraEntropy: R } = Cr(b, w);
    T = H(T, $);
    const B = F(T), C = i.fromBytes(g);
    if (!i.isValidNot0(C))
      throw new Error("invalid private key");
    const P = [tt(C), tt(B)];
    if (R != null && R !== !1) {
      const Q = R === !0 ? r(h.secretKey) : R;
      P.push(V(Q, void 0, "extraEntropy"));
    }
    const et = Lt(...P), Y = B;
    function M(Q) {
      const lt = A(Q);
      if (!i.isValidNot0(lt))
        return;
      const Ht = i.inv(lt), J = e.BASE.multiply(lt).toAffine(), dt = i.create(J.x);
      if (dt === Qt)
        return;
      const In = i.create(Ht * i.create(Y + dt * C));
      if (In === Qt)
        return;
      let ss = (J.x === dt ? 0 : 2) | Number(J.y & Ce), is = In;
      return U && m(In) && (is = i.neg(In), ss ^= 1), new O(dt, is, p ? void 0 : ss);
    }
    return { seed: et, k2sig: M };
  }
  function Yt(T, g, b = {}) {
    const { seed: U, k2sig: $ } = Ue(T, g, b);
    return xa(t.outputLen, i.BYTES, o)(U, $).toBytes(b.format);
  }
  function K(T, g, b, U = {}) {
    const { lowS: $, prehash: R, format: B } = Cr(U, w);
    if (b = V(b, void 0, "publicKey"), g = H(g, R), !vo(T)) {
      const C = T instanceof O ? ", use sig.toBytes()" : "";
      throw new Error("verify expects Uint8Array signature" + C);
    }
    v(T, B);
    try {
      const C = O.fromBytes(T, B), P = e.fromBytes(b);
      if ($ && C.hasHighS())
        return !1;
      const { r: et, s: Y } = C, M = F(g), Q = i.inv(Y), lt = i.create(M * Q), Ht = i.create(et * Q), J = e.BASE.multiplyUnsafe(lt).add(P.multiplyUnsafe(Ht));
      return J.is0() ? !1 : i.create(J.x) === et;
    } catch {
      return !1;
    }
  }
  function k(T, g, b = {}) {
    const { prehash: U } = Cr(b, w);
    return g = H(g, U), O.fromBytes(T, "recovered").recoverPublicKey(g).toBytes();
  }
  return Object.freeze({
    keygen: u,
    getPublicKey: f,
    getSharedSecret: l,
    utils: d,
    lengths: h,
    Point: e,
    sign: Yt,
    verify: K,
    recoverPublicKey: k,
    Signature: O,
    hash: t
  });
}
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const xr = {
  p: BigInt("0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffefffffc2f"),
  n: BigInt("0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141"),
  h: BigInt(1),
  a: BigInt(0),
  b: BigInt(7),
  Gx: BigInt("0x79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798"),
  Gy: BigInt("0x483ada7726a3c4655da4fbfc0e1108a8fd17b448a68554199c47d08ffb10d4b8")
}, Da = {
  beta: BigInt("0x7ae96a2b657c07106e64479eac3434e99cf0497512f58995c1396c28719501ee"),
  basises: [
    [BigInt("0x3086d221a7d46bcde86c90e49284eb15"), -BigInt("0xe4437ed6010e88286f547fa90abfe4c3")],
    [BigInt("0x114ca50f7a8e2f3f657c1108d9d44cfd8"), BigInt("0x3086d221a7d46bcde86c90e49284eb15")]
  ]
}, Ha = /* @__PURE__ */ BigInt(0), zr = /* @__PURE__ */ BigInt(2);
function Ma(e) {
  const t = xr.p, n = BigInt(3), r = BigInt(6), o = BigInt(11), s = BigInt(22), i = BigInt(23), c = BigInt(44), a = BigInt(88), u = e * e * e % t, f = u * u * e % t, l = It(f, n, t) * f % t, d = It(l, n, t) * f % t, h = It(d, zr, t) * u % t, w = It(h, o, t) * h % t, p = It(w, s, t) * w % t, m = It(p, c, t) * p % t, x = It(m, a, t) * m % t, E = It(x, c, t) * p % t, v = It(E, n, t) * f % t, O = It(v, i, t) * w % t, A = It(O, r, t) * u % t, F = It(A, zr, t);
  if (!Zn.eql(Zn.sqr(F), e))
    throw new Error("Cannot find square root");
  return F;
}
const Zn = mr(xr.p, { sqrt: Ma }), Oe = /* @__PURE__ */ Pa(xr, {
  Fp: Zn,
  endo: Da
}), Ft = /* @__PURE__ */ Va(Oe, ht), ws = {};
function Xn(e, ...t) {
  let n = ws[e];
  if (n === void 0) {
    const r = ht(wa(e));
    n = Lt(r, r), ws[e] = n;
  }
  return ht(Lt(n, ...t));
}
const Oo = (e) => e.toBytes(!0).slice(1), Uo = (e) => e % zr === Ha;
function jr(e) {
  const { Fn: t, BASE: n } = Oe, r = t.fromBytes(e), o = n.multiply(r);
  return { scalar: Uo(o.y) ? r : t.neg(r), bytes: Oo(o) };
}
function Di(e) {
  const t = Zn;
  if (!t.isValidNot0(e))
    throw new Error("invalid x: Fail if x ≥ p");
  const n = t.create(e * e), r = t.create(n * e + BigInt(7));
  let o = t.sqrt(r);
  Uo(o) || (o = t.neg(o));
  const s = Oe.fromAffine({ x: e, y: o });
  return s.assertValidity(), s;
}
const sn = qt;
function Hi(...e) {
  return Oe.Fn.create(sn(Xn("BIP0340/challenge", ...e)));
}
function ys(e) {
  return jr(e).bytes;
}
function Ka(e, t, n = bn(32)) {
  const { Fn: r } = Oe, o = V(e, void 0, "message"), { bytes: s, scalar: i } = jr(t), c = V(n, 32, "auxRand"), a = r.toBytes(i ^ sn(Xn("BIP0340/aux", c))), u = Xn("BIP0340/nonce", a, s, o), { bytes: f, scalar: l } = jr(u), d = Hi(f, s, o), h = new Uint8Array(64);
  if (h.set(f, 0), h.set(r.toBytes(r.create(l + d * i)), 32), !Mi(h, o, s))
    throw new Error("sign: Invalid signature produced");
  return h;
}
function Mi(e, t, n) {
  const { Fp: r, Fn: o, BASE: s } = Oe, i = V(e, 64, "signature"), c = V(t, void 0, "message"), a = V(n, 32, "publicKey");
  try {
    const u = Di(sn(a)), f = sn(i.subarray(0, 32));
    if (!r.isValidNot0(f))
      return !1;
    const l = sn(i.subarray(32, 64));
    if (!o.isValidNot0(l))
      return !1;
    const d = Hi(o.toBytes(f), Oo(u), c), h = s.multiplyUnsafe(l).add(u.multiplyUnsafe(o.neg(d))), { x: w, y: p } = h.toAffine();
    return !(h.is0() || !Uo(p) || w !== f);
  } catch {
    return !1;
  }
}
const Nt = /* @__PURE__ */ (() => {
  const n = (r = bn(48)) => Ui(r, xr.n);
  return {
    keygen: $i(n, ys),
    getPublicKey: ys,
    sign: Ka,
    verify: Mi,
    Point: Oe,
    utils: {
      randomSecretKey: n,
      taggedHash: Xn,
      lift_x: Di,
      pointToBytes: Oo
    },
    lengths: {
      secretKey: 32,
      publicKey: 32,
      publicKeyHasPrefix: !1,
      signature: 64,
      seed: 48
    }
  };
})(), Fa = /* @__PURE__ */ Uint8Array.from([
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
]), Ki = Uint8Array.from(new Array(16).fill(0).map((e, t) => t)), Wa = Ki.map((e) => (9 * e + 5) % 16), Fi = /* @__PURE__ */ (() => {
  const n = [[Ki], [Wa]];
  for (let r = 0; r < 4; r++)
    for (let o of n)
      o.push(o[r].map((s) => Fa[s]));
  return n;
})(), Wi = Fi[0], Gi = Fi[1], zi = /* @__PURE__ */ [
  [11, 14, 15, 12, 5, 8, 7, 9, 11, 13, 14, 15, 6, 7, 9, 8],
  [12, 13, 11, 15, 6, 9, 9, 7, 12, 15, 11, 13, 7, 8, 7, 7],
  [13, 15, 14, 11, 7, 7, 6, 8, 13, 14, 13, 12, 5, 5, 6, 9],
  [14, 11, 12, 14, 8, 6, 5, 5, 15, 12, 15, 14, 9, 9, 8, 6],
  [15, 12, 13, 13, 9, 5, 8, 6, 14, 11, 12, 11, 8, 6, 5, 5]
].map((e) => Uint8Array.from(e)), Ga = /* @__PURE__ */ Wi.map((e, t) => e.map((n) => zi[t][n])), za = /* @__PURE__ */ Gi.map((e, t) => e.map((n) => zi[t][n])), ja = /* @__PURE__ */ Uint32Array.from([
  0,
  1518500249,
  1859775393,
  2400959708,
  2840853838
]), qa = /* @__PURE__ */ Uint32Array.from([
  1352829926,
  1548603684,
  1836072691,
  2053994217,
  0
]);
function ms(e, t, n, r) {
  return e === 0 ? t ^ n ^ r : e === 1 ? t & n | ~t & r : e === 2 ? (t | ~n) ^ r : e === 3 ? t & r | n & ~r : t ^ (n | ~r);
}
const Nn = /* @__PURE__ */ new Uint32Array(16);
class Ya extends pi {
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
      Nn[h] = t.getUint32(n, !0);
    let r = this.h0 | 0, o = r, s = this.h1 | 0, i = s, c = this.h2 | 0, a = c, u = this.h3 | 0, f = u, l = this.h4 | 0, d = l;
    for (let h = 0; h < 5; h++) {
      const w = 4 - h, p = ja[h], m = qa[h], x = Wi[h], E = Gi[h], v = Ga[h], O = za[h];
      for (let A = 0; A < 16; A++) {
        const F = Bn(r + ms(h, s, c, u) + Nn[x[A]] + p, v[A]) + l | 0;
        r = l, l = u, u = Bn(c, 10) | 0, c = s, s = F;
      }
      for (let A = 0; A < 16; A++) {
        const F = Bn(o + ms(w, i, a, f) + Nn[E[A]] + m, O[A]) + d | 0;
        o = d, d = f, f = Bn(a, 10) | 0, a = i, i = F;
      }
    }
    this.set(this.h1 + c + f | 0, this.h2 + u + d | 0, this.h3 + l + o | 0, this.h4 + r + i | 0, this.h0 + s + a | 0);
  }
  roundClean() {
    De(Nn);
  }
  destroy() {
    this.destroyed = !0, De(this.buffer), this.set(0, 0, 0, 0, 0);
  }
}
const Za = /* @__PURE__ */ hi(() => new Ya());
/*! scure-base - MIT License (c) 2022 Paul Miller (paulmillr.com) */
function Me(e) {
  return e instanceof Uint8Array || ArrayBuffer.isView(e) && e.constructor.name === "Uint8Array";
}
function ji(e) {
  if (!Me(e))
    throw new Error("Uint8Array expected");
}
function qi(e, t) {
  return Array.isArray(t) ? t.length === 0 ? !0 : e ? t.every((n) => typeof n == "string") : t.every((n) => Number.isSafeInteger(n)) : !1;
}
function No(e) {
  if (typeof e != "function")
    throw new Error("function expected");
  return !0;
}
function le(e, t) {
  if (typeof t != "string")
    throw new Error(`${e}: string expected`);
  return !0;
}
function Xe(e) {
  if (!Number.isSafeInteger(e))
    throw new Error(`invalid integer: ${e}`);
}
function Qn(e) {
  if (!Array.isArray(e))
    throw new Error("array expected");
}
function Jn(e, t) {
  if (!qi(!0, t))
    throw new Error(`${e}: array of strings expected`);
}
function Ro(e, t) {
  if (!qi(!1, t))
    throw new Error(`${e}: array of numbers expected`);
}
// @__NO_SIDE_EFFECTS__
function Tn(...e) {
  const t = (s) => s, n = (s, i) => (c) => s(i(c)), r = e.map((s) => s.encode).reduceRight(n, t), o = e.map((s) => s.decode).reduce(n, t);
  return { encode: r, decode: o };
}
// @__NO_SIDE_EFFECTS__
function Er(e) {
  const t = typeof e == "string" ? e.split("") : e, n = t.length;
  Jn("alphabet", t);
  const r = new Map(t.map((o, s) => [o, s]));
  return {
    encode: (o) => (Qn(o), o.map((s) => {
      if (!Number.isSafeInteger(s) || s < 0 || s >= n)
        throw new Error(`alphabet.encode: digit index outside alphabet "${s}". Allowed: ${e}`);
      return t[s];
    })),
    decode: (o) => (Qn(o), o.map((s) => {
      le("alphabet.decode", s);
      const i = r.get(s);
      if (i === void 0)
        throw new Error(`Unknown letter: "${s}". Allowed: ${e}`);
      return i;
    }))
  };
}
// @__NO_SIDE_EFFECTS__
function br(e = "") {
  return le("join", e), {
    encode: (t) => (Jn("join.decode", t), t.join(e)),
    decode: (t) => (le("join.decode", t), t.split(e))
  };
}
// @__NO_SIDE_EFFECTS__
function Xa(e, t = "=") {
  return Xe(e), le("padding", t), {
    encode(n) {
      for (Jn("padding.encode", n); n.length * e % 8; )
        n.push(t);
      return n;
    },
    decode(n) {
      Jn("padding.decode", n);
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
function Qa(e) {
  return No(e), { encode: (t) => t, decode: (t) => e(t) };
}
function xs(e, t, n) {
  if (t < 2)
    throw new Error(`convertRadix: invalid from=${t}, base cannot be less than 2`);
  if (n < 2)
    throw new Error(`convertRadix: invalid to=${n}, base cannot be less than 2`);
  if (Qn(e), !e.length)
    return [];
  let r = 0;
  const o = [], s = Array.from(e, (c) => {
    if (Xe(c), c < 0 || c >= t)
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
      const w = Math.floor(h);
      if (s[u] = w, !Number.isSafeInteger(w) || w * n + c !== d)
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
const Yi = (e, t) => t === 0 ? e : Yi(t, e % t), tr = /* @__NO_SIDE_EFFECTS__ */ (e, t) => e + (t - Yi(e, t)), Mn = /* @__PURE__ */ (() => {
  let e = [];
  for (let t = 0; t < 40; t++)
    e.push(2 ** t);
  return e;
})();
function qr(e, t, n, r) {
  if (Qn(e), t <= 0 || t > 32)
    throw new Error(`convertRadix2: wrong from=${t}`);
  if (n <= 0 || n > 32)
    throw new Error(`convertRadix2: wrong to=${n}`);
  if (/* @__PURE__ */ tr(t, n) > 32)
    throw new Error(`convertRadix2: carry overflow from=${t} to=${n} carryBits=${/* @__PURE__ */ tr(t, n)}`);
  let o = 0, s = 0;
  const i = Mn[t], c = Mn[n] - 1, a = [];
  for (const u of e) {
    if (Xe(u), u >= i)
      throw new Error(`convertRadix2: invalid data word=${u} from=${t}`);
    if (o = o << t | u, s + t > 32)
      throw new Error(`convertRadix2: carry overflow pos=${s} from=${t}`);
    for (s += t; s >= n; s -= n)
      a.push((o >> s - n & c) >>> 0);
    const f = Mn[s];
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
function Ja(e) {
  Xe(e);
  const t = 2 ** 8;
  return {
    encode: (n) => {
      if (!Me(n))
        throw new Error("radix.encode input should be Uint8Array");
      return xs(Array.from(n), t, e);
    },
    decode: (n) => (Ro("radix.decode", n), Uint8Array.from(xs(n, e, t)))
  };
}
// @__NO_SIDE_EFFECTS__
function $o(e, t = !1) {
  if (Xe(e), e <= 0 || e > 32)
    throw new Error("radix2: bits should be in (0..32]");
  if (/* @__PURE__ */ tr(8, e) > 32 || /* @__PURE__ */ tr(e, 8) > 32)
    throw new Error("radix2: carry overflow");
  return {
    encode: (n) => {
      if (!Me(n))
        throw new Error("radix2.encode input should be Uint8Array");
      return qr(Array.from(n), 8, e, !t);
    },
    decode: (n) => (Ro("radix2.decode", n), Uint8Array.from(qr(n, e, 8, t)))
  };
}
function Es(e) {
  return No(e), function(...t) {
    try {
      return e.apply(null, t);
    } catch {
    }
  };
}
function tu(e, t) {
  return Xe(e), No(t), {
    encode(n) {
      if (!Me(n))
        throw new Error("checksum.encode: input should be Uint8Array");
      const r = t(n).slice(0, e), o = new Uint8Array(n.length + e);
      return o.set(n), o.set(r, n.length), o;
    },
    decode(n) {
      if (!Me(n))
        throw new Error("checksum.decode: input should be Uint8Array");
      const r = n.slice(0, -e), o = n.slice(-e), s = t(r).slice(0, e);
      for (let i = 0; i < e; i++)
        if (s[i] !== o[i])
          throw new Error("Invalid checksum");
      return r;
    }
  };
}
const eu = typeof Uint8Array.from([]).toBase64 == "function" && typeof Uint8Array.fromBase64 == "function", nu = (e, t) => {
  le("base64", e);
  const n = /^[A-Za-z0-9=+/]+$/, r = "base64";
  if (e.length > 0 && !n.test(e))
    throw new Error("invalid base64");
  return Uint8Array.fromBase64(e, { alphabet: r, lastChunkHandling: "strict" });
}, bt = eu ? {
  encode(e) {
    return ji(e), e.toBase64();
  },
  decode(e) {
    return nu(e);
  }
} : /* @__PURE__ */ Tn(/* @__PURE__ */ $o(6), /* @__PURE__ */ Er("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"), /* @__PURE__ */ Xa(6), /* @__PURE__ */ br("")), ru = /* @__NO_SIDE_EFFECTS__ */ (e) => /* @__PURE__ */ Tn(/* @__PURE__ */ Ja(58), /* @__PURE__ */ Er(e), /* @__PURE__ */ br("")), Yr = /* @__PURE__ */ ru("123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"), ou = (e) => /* @__PURE__ */ Tn(tu(4, (t) => e(e(t))), Yr), Zr = /* @__PURE__ */ Tn(/* @__PURE__ */ Er("qpzry9x8gf2tvdw0s3jn54khce6mua7l"), /* @__PURE__ */ br("")), bs = [996825010, 642813549, 513874426, 1027748829, 705979059];
function Je(e) {
  const t = e >> 25;
  let n = (e & 33554431) << 5;
  for (let r = 0; r < bs.length; r++)
    (t >> r & 1) === 1 && (n ^= bs[r]);
  return n;
}
function Ss(e, t, n = 1) {
  const r = e.length;
  let o = 1;
  for (let s = 0; s < r; s++) {
    const i = e.charCodeAt(s);
    if (i < 33 || i > 126)
      throw new Error(`Invalid prefix (${e})`);
    o = Je(o) ^ i >> 5;
  }
  o = Je(o);
  for (let s = 0; s < r; s++)
    o = Je(o) ^ e.charCodeAt(s) & 31;
  for (let s of t)
    o = Je(o) ^ s;
  for (let s = 0; s < 6; s++)
    o = Je(o);
  return o ^= n, Zr.encode(qr([o % Mn[30]], 30, 5, !1));
}
// @__NO_SIDE_EFFECTS__
function Zi(e) {
  const t = e === "bech32" ? 1 : 734539939, n = /* @__PURE__ */ $o(5), r = n.decode, o = n.encode, s = Es(r);
  function i(l, d, h = 90) {
    le("bech32.encode prefix", l), Me(d) && (d = Array.from(d)), Ro("bech32.encode", d);
    const w = l.length;
    if (w === 0)
      throw new TypeError(`Invalid prefix length ${w}`);
    const p = w + 7 + d.length;
    if (h !== !1 && p > h)
      throw new TypeError(`Length ${p} exceeds limit ${h}`);
    const m = l.toLowerCase(), x = Ss(m, d, t);
    return `${m}1${Zr.encode(d)}${x}`;
  }
  function c(l, d = 90) {
    le("bech32.decode input", l);
    const h = l.length;
    if (h < 8 || d !== !1 && h > d)
      throw new TypeError(`invalid string length: ${h} (${l}). Expected (8..${d})`);
    const w = l.toLowerCase();
    if (l !== w && l !== l.toUpperCase())
      throw new Error("String must be lowercase or uppercase");
    const p = w.lastIndexOf("1");
    if (p === 0 || p === -1)
      throw new Error('Letter "1" must be present between prefix and data only');
    const m = w.slice(0, p), x = w.slice(p + 1);
    if (x.length < 6)
      throw new Error("Data must be at least 6 characters long");
    const E = Zr.decode(x).slice(0, -6), v = Ss(m, E, t);
    if (!x.endsWith(v))
      throw new Error(`Invalid checksum in ${l}: expected "${v}"`);
    return { prefix: m, words: E };
  }
  const a = Es(c);
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
const Xr = /* @__PURE__ */ Zi("bech32"), Ne = /* @__PURE__ */ Zi("bech32m"), su = {
  encode: (e) => new TextDecoder().decode(e),
  decode: (e) => new TextEncoder().encode(e)
}, iu = typeof Uint8Array.from([]).toHex == "function" && typeof Uint8Array.fromHex == "function", cu = {
  encode(e) {
    return ji(e), e.toHex();
  },
  decode(e) {
    return le("hex", e), Uint8Array.fromHex(e);
  }
}, S = iu ? cu : /* @__PURE__ */ Tn(/* @__PURE__ */ $o(4), /* @__PURE__ */ Er("0123456789abcdef"), /* @__PURE__ */ br(""), /* @__PURE__ */ Qa((e) => {
  if (typeof e != "string" || e.length % 2 !== 0)
    throw new TypeError(`hex.decode: expected string, got ${typeof e} with length ${e.length}`);
  return e.toLowerCase();
})), X = /* @__PURE__ */ Uint8Array.of(), Xi = /* @__PURE__ */ Uint8Array.of(0);
function Ke(e, t) {
  if (e.length !== t.length)
    return !1;
  for (let n = 0; n < e.length; n++)
    if (e[n] !== t[n])
      return !1;
  return !0;
}
function Ot(e) {
  return e instanceof Uint8Array || ArrayBuffer.isView(e) && e.constructor.name === "Uint8Array";
}
function au(...e) {
  let t = 0;
  for (let r = 0; r < e.length; r++) {
    const o = e[r];
    if (!Ot(o))
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
const Qi = (e) => new DataView(e.buffer, e.byteOffset, e.byteLength);
function vn(e) {
  return Object.prototype.toString.call(e) === "[object Object]";
}
function Gt(e) {
  return Number.isSafeInteger(e);
}
const Co = {
  equalBytes: Ke,
  isBytes: Ot,
  concatBytes: au
}, Ji = (e) => {
  if (e !== null && typeof e != "string" && !Pt(e) && !Ot(e) && !Gt(e))
    throw new Error(`lengthCoder: expected null | number | Uint8Array | CoderType, got ${e} (${typeof e})`);
  return {
    encodeStream(t, n) {
      if (e === null)
        return;
      if (Pt(e))
        return e.encodeStream(t, n);
      let r;
      if (typeof e == "number" ? r = e : typeof e == "string" && (r = ne.resolve(t.stack, e)), typeof r == "bigint" && (r = Number(r)), r === void 0 || r !== n)
        throw t.err(`Wrong length: ${r} len=${e} exp=${n} (${typeof n})`);
    },
    decodeStream(t) {
      let n;
      if (Pt(e) ? n = Number(e.decodeStream(t)) : typeof e == "number" ? n = e : typeof e == "string" && (n = ne.resolve(t.stack, e)), typeof n == "bigint" && (n = Number(n)), typeof n != "number")
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
}, ne = {
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
    const r = new Error(`${e}(${ne.path(t)}): ${typeof n == "string" ? n : n.message}`);
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
class Lo {
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
    this.data = t, this.opts = n, this.stack = r, this.parent = o, this.parentOffset = s, this.view = Qi(t);
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
    return ne.pushObj(this.stack, t, n);
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
        throw this.err(`${this.bitPos} bits left after unpack: ${S.encode(this.data.slice(this.pos))}`);
      if (this.bs && !this.parent) {
        const t = at.indices(this.bs, this.data.length, !0);
        if (t.length) {
          const n = at.range(t).map(({ pos: r, length: o }) => `(${r}/${o})[${S.encode(this.data.subarray(r, r + o))}]`).join(", ");
          throw this.err(`unread byte ranges: ${n} (total=${this.data.length})`);
        } else
          return;
      }
      if (!this.isEnd())
        throw this.err(`${this.leftBytes} bytes ${this.bitPos} bits left after unpack: ${S.encode(this.data.slice(this.pos))}`);
    }
  }
  // User methods
  err(t) {
    return ne.err("Reader", this.stack, t);
  }
  offsetReader(t) {
    if (t > this.data.length)
      throw this.err("offsetReader: Unexpected end of buffer");
    return new Lo(this.absBytes(t), this.opts, this.stack, this, t);
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
    if (!Ot(t))
      throw this.err(`find: needle is not bytes! ${t}`);
    if (this.bitPos)
      throw this.err("findByte: bitPos not empty");
    if (!t.length)
      throw this.err("find: needle is empty");
    for (let r = n; (r = this.data.indexOf(t[0], r)) !== -1; r++) {
      if (r === -1 || this.data.length - r < t.length)
        return;
      if (Ke(t, this.data.subarray(r, r + t.length)))
        return r;
    }
  }
}
class uu {
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
    this.stack = t, this.view = Qi(this.viewBuf);
  }
  pushObj(t, n) {
    return ne.pushObj(this.stack, t, n);
  }
  writeView(t, n) {
    if (this.finished)
      throw this.err("buffer: finished");
    if (!Gt(t) || t > 8)
      throw new Error(`wrong writeView length=${t}`);
    n(this.view), this.bytes(this.viewBuf.slice(0, t)), this.viewBuf.fill(0);
  }
  // User methods
  err(t) {
    if (this.finished)
      throw this.err("buffer: finished");
    return ne.err("Reader", this.stack, t);
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
const Qr = (e) => Uint8Array.from(e).reverse();
function fu(e, t, n) {
  if (n) {
    const r = 2n ** (t - 1n);
    if (e < -r || e >= r)
      throw new Error(`value out of signed bounds. Expected ${-r} <= ${e} < ${r}`);
  } else if (0n > e || e >= 2n ** t)
    throw new Error(`value out of unsigned bounds. Expected 0 <= ${e} < ${2n ** t}`);
}
function tc(e) {
  return {
    // NOTE: we cannot export validate here, since it is likely mistake.
    encodeStream: e.encodeStream,
    decodeStream: e.decodeStream,
    size: e.size,
    encode: (t) => {
      const n = new uu();
      return e.encodeStream(n, t), n.finish();
    },
    decode: (t, n = {}) => {
      const r = new Lo(t, n), o = e.decodeStream(r);
      return r.finish(), o;
    }
  };
}
function xt(e, t) {
  if (!Pt(e))
    throw new Error(`validate: invalid inner value ${e}`);
  if (typeof t != "function")
    throw new Error("validate: fn should be function");
  return tc({
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
const Et = (e) => {
  const t = tc(e);
  return e.validate ? xt(t, e.validate) : t;
}, Sr = (e) => vn(e) && typeof e.decode == "function" && typeof e.encode == "function";
function Pt(e) {
  return vn(e) && Sr(e) && typeof e.encodeStream == "function" && typeof e.decodeStream == "function" && (e.size === void 0 || Gt(e.size));
}
function lu() {
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
      if (!vn(e))
        throw new Error(`expected plain object, got ${e}`);
      return Object.entries(e);
    }
  };
}
const du = {
  encode: (e) => {
    if (typeof e != "bigint")
      throw new Error(`expected bigint, got ${typeof e}`);
    if (e > BigInt(Number.MAX_SAFE_INTEGER))
      throw new Error(`element bigger than MAX_SAFE_INTEGER=${e}`);
    return Number(e);
  },
  decode: (e) => {
    if (!Gt(e))
      throw new Error("element is not a safe integer");
    return BigInt(e);
  }
};
function hu(e) {
  if (!vn(e))
    throw new Error("plain object expected");
  return {
    encode: (t) => {
      if (!Gt(t) || !(t in e))
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
function pu(e, t = !1) {
  if (!Gt(e))
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
function gu(e) {
  if (!Array.isArray(e))
    throw new Error(`expected array, got ${typeof e}`);
  for (const t of e)
    if (!Sr(t))
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
const ec = (e) => {
  if (!Sr(e))
    throw new Error("BaseCoder expected");
  return { encode: e.decode, decode: e.encode };
}, Tr = { dict: lu, numberBigint: du, tsEnum: hu, decimal: pu, match: gu, reverse: ec }, Po = (e, t = !1, n = !1, r = !0) => {
  if (!Gt(e))
    throw new Error(`bigint/size: wrong value ${e}`);
  if (typeof t != "boolean")
    throw new Error(`bigint/le: expected boolean, got ${typeof t}`);
  if (typeof n != "boolean")
    throw new Error(`bigint/signed: expected boolean, got ${typeof n}`);
  if (typeof r != "boolean")
    throw new Error(`bigint/sized: expected boolean, got ${typeof r}`);
  const o = BigInt(e), s = 2n ** (8n * o - 1n);
  return Et({
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
      const c = i.bytes(r ? e : Math.min(e, i.leftBytes)), a = t ? c : Qr(c);
      let u = 0n;
      for (let f = 0; f < a.length; f++)
        u |= BigInt(a[f]) << 8n * BigInt(f);
      return n && u & s && (u = (u ^ s) - s), u;
    },
    validate: (i) => {
      if (typeof i != "bigint")
        throw new Error(`bigint: invalid value: ${i}`);
      return fu(i, 8n * o, !!n), i;
    }
  });
}, nc = /* @__PURE__ */ Po(32, !1), Kn = /* @__PURE__ */ Po(8, !0), wu = /* @__PURE__ */ Po(8, !0, !0), yu = (e, t) => Et({
  size: e,
  encodeStream: (n, r) => n.writeView(e, (o) => t.write(o, r)),
  decodeStream: (n) => n.readView(e, t.read),
  validate: (n) => {
    if (typeof n != "number")
      throw new Error(`viewCoder: expected number, got ${typeof n}`);
    return t.validate && t.validate(n), n;
  }
}), kn = (e, t, n) => {
  const r = e * 8, o = 2 ** (r - 1), s = (a) => {
    if (!Gt(a))
      throw new Error(`sintView: value is not safe integer: ${a}`);
    if (a < -o || a >= o)
      throw new Error(`sintView: value out of bounds. Expected ${-o} <= ${a} < ${o}`);
  }, i = 2 ** r, c = (a) => {
    if (!Gt(a))
      throw new Error(`uintView: value is not safe integer: ${a}`);
    if (0 > a || a >= i)
      throw new Error(`uintView: value out of bounds. Expected 0 <= ${a} < ${i}`);
  };
  return yu(e, {
    write: n.write,
    read: n.read,
    validate: t ? s : c
  });
}, W = /* @__PURE__ */ kn(4, !1, {
  read: (e, t) => e.getUint32(t, !0),
  write: (e, t) => e.setUint32(0, t, !0)
}), mu = /* @__PURE__ */ kn(4, !1, {
  read: (e, t) => e.getUint32(t, !1),
  write: (e, t) => e.setUint32(0, t, !1)
}), Re = /* @__PURE__ */ kn(4, !0, {
  read: (e, t) => e.getInt32(t, !0),
  write: (e, t) => e.setInt32(0, t, !0)
}), Ts = /* @__PURE__ */ kn(2, !1, {
  read: (e, t) => e.getUint16(t, !0),
  write: (e, t) => e.setUint16(0, t, !0)
}), ae = /* @__PURE__ */ kn(1, !1, {
  read: (e, t) => e.getUint8(t),
  write: (e, t) => e.setUint8(0, t)
}), Z = (e, t = !1) => {
  if (typeof t != "boolean")
    throw new Error(`bytes/le: expected boolean, got ${typeof t}`);
  const n = Ji(e), r = Ot(e);
  return Et({
    size: typeof e == "number" ? e : void 0,
    encodeStream: (o, s) => {
      r || n.encodeStream(o, s.length), o.bytes(t ? Qr(s) : s), r && o.bytes(e);
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
      return t ? Qr(s) : s;
    },
    validate: (o) => {
      if (!Ot(o))
        throw new Error(`bytes: invalid value ${o}`);
      return o;
    }
  });
};
function xu(e, t) {
  if (!Pt(t))
    throw new Error(`prefix: invalid inner value ${t}`);
  return de(Z(e), ec(t));
}
const _o = (e, t = !1) => xt(de(Z(e, t), su), (n) => {
  if (typeof n != "string")
    throw new Error(`expected string, got ${typeof n}`);
  return n;
}), Eu = (e, t = { isLE: !1, with0x: !1 }) => {
  let n = de(Z(e, t.isLE), S);
  const r = t.with0x;
  if (typeof r != "boolean")
    throw new Error(`hex/with0x: expected boolean, got ${typeof r}`);
  return r && (n = de(n, {
    encode: (o) => `0x${o}`,
    decode: (o) => {
      if (!o.startsWith("0x"))
        throw new Error("hex(with0x=true).encode input should start with 0x");
      return o.slice(2);
    }
  })), n;
};
function de(e, t) {
  if (!Pt(e))
    throw new Error(`apply: invalid inner value ${e}`);
  if (!Sr(t))
    throw new Error(`apply: invalid base value ${e}`);
  return Et({
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
const bu = (e, t = !1) => {
  if (!Ot(e))
    throw new Error(`flag/flagValue: expected Uint8Array, got ${typeof e}`);
  if (typeof t != "boolean")
    throw new Error(`flag/xor: expected boolean, got ${typeof t}`);
  return Et({
    size: e.length,
    encodeStream: (n, r) => {
      !!r !== t && n.bytes(e);
    },
    decodeStream: (n) => {
      let r = n.leftBytes >= e.length;
      return r && (r = Ke(n.bytes(e.length, !0), e), r && n.bytes(e.length)), r !== t;
    },
    validate: (n) => {
      if (n !== void 0 && typeof n != "boolean")
        throw new Error(`flag: expected boolean value or undefined, got ${typeof n}`);
      return n;
    }
  });
};
function Su(e, t, n) {
  if (!Pt(t))
    throw new Error(`flagged: invalid inner value ${t}`);
  return Et({
    encodeStream: (r, o) => {
      ne.resolve(r.stack, e) && t.encodeStream(r, o);
    },
    decodeStream: (r) => {
      let o = !1;
      if (o = !!ne.resolve(r.stack, e), o)
        return t.decodeStream(r);
    }
  });
}
function Vo(e, t, n = !0) {
  if (!Pt(e))
    throw new Error(`magic: invalid inner value ${e}`);
  if (typeof n != "boolean")
    throw new Error(`magic: expected boolean, got ${typeof n}`);
  return Et({
    size: e.size,
    encodeStream: (r, o) => e.encodeStream(r, t),
    decodeStream: (r) => {
      const o = e.decodeStream(r);
      if (n && typeof o != "object" && o !== t || Ot(t) && !Ke(t, o))
        throw r.err(`magic: invalid value: ${o} !== ${t}`);
    },
    validate: (r) => {
      if (r !== void 0)
        throw new Error(`magic: wrong value=${typeof r}`);
      return r;
    }
  });
}
function rc(e) {
  let t = 0;
  for (const n of e) {
    if (n.size === void 0)
      return;
    if (!Gt(n.size))
      throw new Error(`sizeof: wrong element size=${t}`);
    t += n.size;
  }
  return t;
}
function ft(e) {
  if (!vn(e))
    throw new Error(`struct: expected plain object, got ${e}`);
  for (const t in e)
    if (!Pt(e[t]))
      throw new Error(`struct: field ${t} is not CoderType`);
  return Et({
    size: rc(Object.values(e)),
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
function Tu(e) {
  if (!Array.isArray(e))
    throw new Error(`Packed.Tuple: got ${typeof e} instead of array`);
  for (let t = 0; t < e.length; t++)
    if (!Pt(e[t]))
      throw new Error(`tuple: field ${t} is not CoderType`);
  return Et({
    size: rc(e),
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
function mt(e, t) {
  if (!Pt(t))
    throw new Error(`array: invalid inner value ${t}`);
  const n = Ji(typeof e == "string" ? `../${e}` : e);
  return Et({
    size: typeof e == "number" && t.size ? e * t.size : void 0,
    encodeStream: (r, o) => {
      const s = r;
      s.pushObj(o, (i) => {
        Ot(e) || n.encodeStream(r, o.length);
        for (let c = 0; c < o.length; c++)
          i(`${c}`, () => {
            const a = o[c], u = r.pos;
            if (t.encodeStream(r, a), Ot(e)) {
              if (e.length > s.pos - u)
                return;
              const f = s.finish(!1).subarray(u, s.pos);
              if (Ke(f.subarray(0, e.length), e))
                throw s.err(`array: inner element encoding same as separator. elm=${a} data=${f}`);
            }
          });
      }), Ot(e) && r.bytes(e);
    },
    decodeStream: (r) => {
      const o = [];
      return r.pushObj(o, (s) => {
        if (e === null)
          for (let i = 0; !r.isEnd() && (s(`${i}`, () => o.push(t.decodeStream(r))), !(t.size && r.leftBytes < t.size)); i++)
            ;
        else if (Ot(e))
          for (let i = 0; ; i++) {
            if (Ke(r.bytes(e.length, !0), e)) {
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
const Qe = Ft.Point, vs = Qe.Fn, oc = Qe.Fn.ORDER, An = (e) => e % 2n === 0n, q = Co.isBytes, ce = Co.concatBytes, rt = Co.equalBytes, sc = (e) => Za(ht(e)), se = (...e) => ht(ht(ce(...e))), Jr = Nt.utils.randomSecretKey, Do = Nt.getPublicKey, ic = Ft.getPublicKey, ks = (e) => e.r < oc / 2n;
function vu(e, t, n = !1) {
  let r = Ft.Signature.fromBytes(Ft.sign(e, t, { prehash: !1 }));
  if (n && !ks(r)) {
    const o = new Uint8Array(32);
    let s = 0;
    for (; !ks(r); )
      if (o.set(W.encode(s++)), r = Ft.Signature.fromBytes(Ft.sign(e, t, { prehash: !1, extraEntropy: o })), s > 4294967295)
        throw new Error("lowR counter overflow: report the error");
  }
  return r.toBytes("der");
}
const As = Nt.sign, Ho = Nt.utils.taggedHash, St = {
  ecdsa: 0,
  schnorr: 1
};
function Fe(e, t) {
  const n = e.length;
  if (t === St.ecdsa) {
    if (n === 32)
      throw new Error("Expected non-Schnorr key");
    return Qe.fromBytes(e), e;
  } else if (t === St.schnorr) {
    if (n !== 32)
      throw new Error("Expected 32-byte Schnorr key");
    return Nt.utils.lift_x(qt(e)), e;
  } else
    throw new Error("Unknown key type");
}
function cc(e, t) {
  const r = Nt.utils.taggedHash("TapTweak", e, t), o = qt(r);
  if (o >= oc)
    throw new Error("tweak higher than curve order");
  return o;
}
function ku(e, t = Uint8Array.of()) {
  const n = Nt.utils, r = qt(e), o = Qe.BASE.multiply(r), s = An(o.y) ? r : vs.neg(r), i = n.pointToBytes(o), c = cc(i, t);
  return Sn(vs.add(s, c), 32);
}
function to(e, t) {
  const n = Nt.utils, r = cc(e, t), s = n.lift_x(qt(e)).add(Qe.BASE.multiply(r)), i = An(s.y) ? 0 : 1;
  return [n.pointToBytes(s), i];
}
const Mo = ht(Qe.BASE.toBytes(!1)), We = {
  bech32: "bc",
  pubKeyHash: 0,
  scriptHash: 5,
  wif: 128
}, Rn = {
  bech32: "tb",
  pubKeyHash: 111,
  scriptHash: 196,
  wif: 239
};
function er(e, t) {
  if (!q(e) || !q(t))
    throw new Error(`cmp: wrong type a=${typeof e} b=${typeof t}`);
  const n = Math.min(e.length, t.length);
  for (let r = 0; r < n; r++)
    if (e[r] != t[r])
      return Math.sign(e[r] - t[r]);
  return Math.sign(e.length - t.length);
}
function ac(e) {
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
}, Au = ac(ct);
function Ko(e = 6, t = !1) {
  return Et({
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
function Iu(e, t = 4, n = !0) {
  if (typeof e == "number")
    return e;
  if (q(e))
    try {
      const r = Ko(t, n).decode(e);
      return r > Number.MAX_SAFE_INTEGER ? void 0 : Number(r);
    } catch {
      return;
    }
}
const L = Et({
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
      if (typeof n == "number" && (n = Ko().encode(BigInt(n))), !q(n))
        throw new Error(`Wrong Script OP=${n} (${typeof n})`);
      const r = n.length;
      r < ct.PUSHDATA1 ? e.byte(r) : r <= 255 ? (e.byte(ct.PUSHDATA1), e.byte(r)) : r <= 65535 ? (e.byte(ct.PUSHDATA2), e.bytes(Ts.encode(r))) : (e.byte(ct.PUSHDATA4), e.bytes(W.encode(r))), e.bytes(n);
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
          r = ae.decodeStream(e);
        else if (n === ct.PUSHDATA2)
          r = Ts.decodeStream(e);
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
        const r = Au[n];
        if (r === void 0)
          throw new Error(`Unknown opcode=${n.toString(16)}`);
        t.push(r);
      }
    }
    return t;
  }
}), Is = {
  253: [253, 2, 253n, 65535n],
  254: [254, 4, 65536n, 4294967295n],
  255: [255, 8, 4294967296n, 18446744073709551615n]
}, vr = Et({
  encodeStream: (e, t) => {
    if (typeof t == "number" && (t = BigInt(t)), 0n <= t && t <= 252n)
      return e.byte(Number(t));
    for (const [n, r, o, s] of Object.values(Is))
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
    const [n, r, o] = Is[t];
    let s = 0n;
    for (let i = 0; i < r; i++)
      s |= BigInt(e.byte()) << 8n * BigInt(i);
    if (s < o)
      throw e.err(`Wrong CompactSize(${8 * r})`);
    return s;
  }
}), _t = de(vr, Tr.numberBigint), Ct = Z(vr), dn = mt(_t, Ct), nr = (e) => mt(vr, e), uc = ft({
  txid: Z(32, !0),
  // hash(prev_tx),
  index: W,
  // output number of previous tx
  finalScriptSig: Ct,
  // btc merges input and output script, executes it. If ok = tx passes
  sequence: W
  // ?
}), Te = ft({ amount: Kn, script: Ct }), Bu = ft({
  version: Re,
  segwitFlag: bu(new Uint8Array([0, 1])),
  inputs: nr(uc),
  outputs: nr(Te),
  witnesses: Su("segwitFlag", mt("inputs/length", dn)),
  // < 500000000	Block number at which this transaction is unlocked
  // >= 500000000	UNIX timestamp at which this transaction is unlocked
  // Handled as part of PSBTv2
  lockTime: W
});
function Ou(e) {
  if (e.segwitFlag && e.witnesses && !e.witnesses.length)
    throw new Error("Segwit flag with empty witnesses array");
  return e;
}
const Le = xt(Bu, Ou), on = ft({
  version: Re,
  inputs: nr(uc),
  outputs: nr(Te),
  lockTime: W
}), eo = xt(Z(null), (e) => Fe(e, St.ecdsa)), rr = xt(Z(32), (e) => Fe(e, St.schnorr)), Bs = xt(Z(null), (e) => {
  if (e.length !== 64 && e.length !== 65)
    throw new Error("Schnorr signature should be 64 or 65 bytes long");
  return e;
}), kr = ft({
  fingerprint: mu,
  path: mt(null, W)
}), fc = ft({
  hashes: mt(_t, Z(32)),
  der: kr
}), Uu = Z(78), Nu = ft({ pubKey: rr, leafHash: Z(32) }), Ru = ft({
  version: ae,
  // With parity :(
  internalKey: Z(32),
  merklePath: mt(null, Z(32))
}), Wt = xt(Ru, (e) => {
  if (e.merklePath.length > 128)
    throw new Error("TaprootControlBlock: merklePath should be of length 0..128 (inclusive)");
  return e;
}), $u = mt(null, ft({
  depth: ae,
  version: ae,
  script: Ct
})), nt = Z(null), Os = Z(20), tn = Z(32), Fo = {
  unsignedTx: [0, !1, on, [0], [0], !1],
  xpub: [1, Uu, kr, [], [0, 2], !1],
  txVersion: [2, !1, W, [2], [2], !1],
  fallbackLocktime: [3, !1, W, [], [2], !1],
  inputCount: [4, !1, _t, [2], [2], !1],
  outputCount: [5, !1, _t, [2], [2], !1],
  txModifiable: [6, !1, ae, [], [2], !1],
  // TODO: bitfield
  version: [251, !1, W, [], [0, 2], !1],
  proprietary: [252, nt, nt, [], [0, 2], !1]
}, Ar = {
  nonWitnessUtxo: [0, !1, Le, [], [0, 2], !1],
  witnessUtxo: [1, !1, Te, [], [0, 2], !1],
  partialSig: [2, eo, nt, [], [0, 2], !1],
  sighashType: [3, !1, W, [], [0, 2], !1],
  redeemScript: [4, !1, nt, [], [0, 2], !1],
  witnessScript: [5, !1, nt, [], [0, 2], !1],
  bip32Derivation: [6, eo, kr, [], [0, 2], !1],
  finalScriptSig: [7, !1, nt, [], [0, 2], !1],
  finalScriptWitness: [8, !1, dn, [], [0, 2], !1],
  porCommitment: [9, !1, nt, [], [0, 2], !1],
  ripemd160: [10, Os, nt, [], [0, 2], !1],
  sha256: [11, tn, nt, [], [0, 2], !1],
  hash160: [12, Os, nt, [], [0, 2], !1],
  hash256: [13, tn, nt, [], [0, 2], !1],
  txid: [14, !1, tn, [2], [2], !0],
  index: [15, !1, W, [2], [2], !0],
  sequence: [16, !1, W, [], [2], !0],
  requiredTimeLocktime: [17, !1, W, [], [2], !1],
  requiredHeightLocktime: [18, !1, W, [], [2], !1],
  tapKeySig: [19, !1, Bs, [], [0, 2], !1],
  tapScriptSig: [20, Nu, Bs, [], [0, 2], !1],
  tapLeafScript: [21, Wt, nt, [], [0, 2], !1],
  tapBip32Derivation: [22, tn, fc, [], [0, 2], !1],
  tapInternalKey: [23, !1, rr, [], [0, 2], !1],
  tapMerkleRoot: [24, !1, tn, [], [0, 2], !1],
  proprietary: [252, nt, nt, [], [0, 2], !1]
}, Cu = [
  "txid",
  "sequence",
  "index",
  "witnessUtxo",
  "nonWitnessUtxo",
  "finalScriptSig",
  "finalScriptWitness",
  "unknown"
], Lu = [
  "partialSig",
  "finalScriptSig",
  "finalScriptWitness",
  "tapKeySig",
  "tapScriptSig"
], hn = {
  redeemScript: [0, !1, nt, [], [0, 2], !1],
  witnessScript: [1, !1, nt, [], [0, 2], !1],
  bip32Derivation: [2, eo, kr, [], [0, 2], !1],
  amount: [3, !1, wu, [2], [2], !0],
  script: [4, !1, nt, [2], [2], !0],
  tapInternalKey: [5, !1, rr, [], [0, 2], !1],
  tapTree: [6, !1, $u, [], [0, 2], !1],
  tapBip32Derivation: [7, rr, fc, [], [0, 2], !1],
  proprietary: [252, nt, nt, [], [0, 2], !1]
}, Pu = [], Us = mt(Xi, ft({
  //  <key> := <keylen> <keytype> <keydata> WHERE keylen = len(keytype)+len(keydata)
  key: xu(_t, ft({ type: _t, key: Z(null) })),
  //  <value> := <valuelen> <valuedata>
  value: Z(_t)
}));
function no(e) {
  const [t, n, r, o, s, i] = e;
  return { type: t, kc: n, vc: r, reqInc: o, allowInc: s, silentIgnore: i };
}
ft({ type: _t, key: Z(null) });
function Wo(e) {
  const t = {};
  for (const n in e) {
    const [r, o, s] = e[n];
    t[r] = [n, o, s];
  }
  return Et({
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
          f.sort((l, d) => er(l[0], d[0]));
          for (const [l, d] of f)
            o.push({ key: { key: l, type: c }, value: d });
        }
      }
      if (r.unknown) {
        r.unknown.sort((s, i) => er(s[0].key, i[0].key));
        for (const [s, i] of r.unknown)
          o.push({ key: s, value: i });
      }
      Us.encodeStream(n, o);
    },
    decodeStream: (n) => {
      const r = Us.decodeStream(n), o = {}, s = {};
      for (const i of r) {
        let c = "unknown", a = i.key.key, u = i.value;
        if (t[i.key.type]) {
          const [f, l, d] = t[i.key.type];
          if (c = f, !l && a.length)
            throw new Error(`PSBT: Non-empty key for ${c} (key=${S.encode(a)} value=${S.encode(u)}`);
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
const Go = xt(Wo(Ar), (e) => {
  if (e.finalScriptWitness && !e.finalScriptWitness.length)
    throw new Error("validateInput: empty finalScriptWitness");
  if (e.partialSig && !e.partialSig.length)
    throw new Error("Empty partialSig");
  if (e.partialSig)
    for (const [t] of e.partialSig)
      Fe(t, St.ecdsa);
  if (e.bip32Derivation)
    for (const [t] of e.bip32Derivation)
      Fe(t, St.ecdsa);
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
}), zo = xt(Wo(hn), (e) => {
  if (e.bip32Derivation)
    for (const [t] of e.bip32Derivation)
      Fe(t, St.ecdsa);
  return e;
}), lc = xt(Wo(Fo), (e) => {
  if ((e.version || 0) === 0) {
    if (!e.unsignedTx)
      throw new Error("PSBTv0: missing unsignedTx");
    for (const n of e.unsignedTx.inputs)
      if (n.finalScriptSig && n.finalScriptSig.length)
        throw new Error("PSBTv0: input scriptSig found in unsignedTx");
  }
  return e;
}), _u = ft({
  magic: Vo(_o(new Uint8Array([255])), "psbt"),
  global: lc,
  inputs: mt("global/unsignedTx/inputs/length", Go),
  outputs: mt(null, zo)
}), Vu = ft({
  magic: Vo(_o(new Uint8Array([255])), "psbt"),
  global: lc,
  inputs: mt("global/inputCount", Go),
  outputs: mt("global/outputCount", zo)
});
ft({
  magic: Vo(_o(new Uint8Array([255])), "psbt"),
  items: mt(null, de(mt(Xi, Tu([Eu(_t), Z(vr)])), Tr.dict()))
});
function Lr(e, t, n) {
  for (const r in n) {
    if (r === "unknown" || !t[r])
      continue;
    const { allowInc: o } = no(t[r]);
    if (!o.includes(e))
      throw new Error(`PSBTv${e}: field ${r} is not allowed`);
  }
  for (const r in t) {
    const { reqInc: o } = no(t[r]);
    if (o.includes(e) && n[r] === void 0)
      throw new Error(`PSBTv${e}: missing required field ${r}`);
  }
}
function Ns(e, t, n) {
  const r = {};
  for (const o in n) {
    const s = o;
    if (s !== "unknown") {
      if (!t[s])
        continue;
      const { allowInc: i, silentIgnore: c } = no(t[s]);
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
function dc(e) {
  const t = e && e.global && e.global.version || 0;
  Lr(t, Fo, e.global);
  for (const i of e.inputs)
    Lr(t, Ar, i);
  for (const i of e.outputs)
    Lr(t, hn, i);
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
function ro(e, t, n, r, o) {
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
        h = h.map((m) => {
          if (m.length !== 2)
            throw new Error(`keyMap(${i}): KV pairs should be [k, v][]`);
          return [
            typeof m[0] == "string" ? u.decode(S.decode(m[0])) : m[0],
            typeof m[1] == "string" ? f.decode(S.decode(m[1])) : m[1]
          ];
        });
        const w = {}, p = (m, x, E) => {
          if (w[m] === void 0) {
            w[m] = [x, E];
            return;
          }
          const v = S.encode(f.encode(w[m][1])), O = S.encode(f.encode(E));
          if (v !== O)
            throw new Error(`keyMap(${c}): same key=${m} oldVal=${v} newVal=${O}`);
        };
        for (const [m, x] of d) {
          const E = S.encode(u.encode(m));
          p(E, m, x);
        }
        for (const [m, x] of h) {
          const E = S.encode(u.encode(m));
          if (x === void 0) {
            if (l)
              throw new Error(`Cannot remove signed field=${c}/${m}`);
            delete w[E];
          } else
            p(E, m, x);
        }
        s[c] = Object.values(w);
      }
    } else if (typeof s[i] == "string")
      s[i] = f.decode(S.decode(s[i]));
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
const Rs = xt(_u, dc), $s = xt(Vu, dc), Du = {
  encode(e) {
    if (!(e.length !== 2 || e[0] !== 1 || !q(e[1]) || S.encode(e[1]) !== "4e73"))
      return { type: "p2a", script: L.encode(e) };
  },
  decode: (e) => {
    if (e.type === "p2a")
      return [1, S.decode("4e73")];
  }
};
function $e(e, t) {
  try {
    return Fe(e, t), !0;
  } catch {
    return !1;
  }
}
const Hu = {
  encode(e) {
    if (!(e.length !== 2 || !q(e[0]) || !$e(e[0], St.ecdsa) || e[1] !== "CHECKSIG"))
      return { type: "pk", pubkey: e[0] };
  },
  decode: (e) => e.type === "pk" ? [e.pubkey, "CHECKSIG"] : void 0
}, Mu = {
  encode(e) {
    if (!(e.length !== 5 || e[0] !== "DUP" || e[1] !== "HASH160" || !q(e[2])) && !(e[3] !== "EQUALVERIFY" || e[4] !== "CHECKSIG"))
      return { type: "pkh", hash: e[2] };
  },
  decode: (e) => e.type === "pkh" ? ["DUP", "HASH160", e.hash, "EQUALVERIFY", "CHECKSIG"] : void 0
}, Ku = {
  encode(e) {
    if (!(e.length !== 3 || e[0] !== "HASH160" || !q(e[1]) || e[2] !== "EQUAL"))
      return { type: "sh", hash: e[1] };
  },
  decode: (e) => e.type === "sh" ? ["HASH160", e.hash, "EQUAL"] : void 0
}, Fu = {
  encode(e) {
    if (!(e.length !== 2 || e[0] !== 0 || !q(e[1])) && e[1].length === 32)
      return { type: "wsh", hash: e[1] };
  },
  decode: (e) => e.type === "wsh" ? [0, e.hash] : void 0
}, Wu = {
  encode(e) {
    if (!(e.length !== 2 || e[0] !== 0 || !q(e[1])) && e[1].length === 20)
      return { type: "wpkh", hash: e[1] };
  },
  decode: (e) => e.type === "wpkh" ? [0, e.hash] : void 0
}, Gu = {
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
        if (!q(s))
          return;
      return { type: "ms", m: n, pubkeys: o };
    }
  },
  // checkmultisig(n, ..pubkeys, m)
  decode: (e) => e.type === "ms" ? [e.m, ...e.pubkeys, e.pubkeys.length, "CHECKMULTISIG"] : void 0
}, zu = {
  encode(e) {
    if (!(e.length !== 2 || e[0] !== 1 || !q(e[1])))
      return { type: "tr", pubkey: e[1] };
  },
  decode: (e) => e.type === "tr" ? [1, e.pubkey] : void 0
}, ju = {
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
      if (!q(o))
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
}, qu = {
  encode(e) {
    const t = e.length - 1;
    if (e[t] !== "NUMEQUAL" || e[1] !== "CHECKSIG")
      return;
    const n = [], r = Iu(e[t - 1]);
    if (typeof r == "number") {
      for (let o = 0; o < t - 1; o++) {
        const s = e[o];
        if (o & 1) {
          if (s !== (o === 1 ? "CHECKSIG" : "CHECKSIGADD"))
            throw new Error("OutScript.encode/tr_ms: wrong element");
          continue;
        }
        if (!q(s))
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
}, Yu = {
  encode(e) {
    return { type: "unknown", script: L.encode(e) };
  },
  decode: (e) => e.type === "unknown" ? L.decode(e.script) : void 0
}, Zu = [
  Du,
  Hu,
  Mu,
  Ku,
  Fu,
  Wu,
  Gu,
  zu,
  ju,
  qu,
  Yu
], Xu = de(L, Tr.match(Zu)), st = xt(Xu, (e) => {
  if (e.type === "pk" && !$e(e.pubkey, St.ecdsa))
    throw new Error("OutScript/pk: wrong key");
  if ((e.type === "pkh" || e.type === "sh" || e.type === "wpkh") && (!q(e.hash) || e.hash.length !== 20))
    throw new Error(`OutScript/${e.type}: wrong hash`);
  if (e.type === "wsh" && (!q(e.hash) || e.hash.length !== 32))
    throw new Error("OutScript/wsh: wrong hash");
  if (e.type === "tr" && (!q(e.pubkey) || !$e(e.pubkey, St.schnorr)))
    throw new Error("OutScript/tr: wrong taproot public key");
  if ((e.type === "ms" || e.type === "tr_ns" || e.type === "tr_ms") && !Array.isArray(e.pubkeys))
    throw new Error("OutScript/multisig: wrong pubkeys array");
  if (e.type === "ms") {
    const t = e.pubkeys.length;
    for (const n of e.pubkeys)
      if (!$e(n, St.ecdsa))
        throw new Error("OutScript/multisig: wrong pubkey");
    if (e.m <= 0 || t > 16 || e.m > t)
      throw new Error("OutScript/multisig: invalid params");
  }
  if (e.type === "tr_ns" || e.type === "tr_ms") {
    for (const t of e.pubkeys)
      if (!$e(t, St.schnorr))
        throw new Error(`OutScript/${e.type}: wrong pubkey`);
  }
  if (e.type === "tr_ms") {
    const t = e.pubkeys.length;
    if (e.m <= 0 || t > 999 || e.m > t)
      throw new Error("OutScript/tr_ms: invalid params");
  }
  return e;
});
function Cs(e, t) {
  if (!rt(e.hash, ht(t)))
    throw new Error("checkScript: wsh wrong witnessScript hash");
  const n = st.decode(t);
  if (n.type === "tr" || n.type === "tr_ns" || n.type === "tr_ms")
    throw new Error(`checkScript: P2${n.type} cannot be wrapped in P2SH`);
  if (n.type === "wpkh" || n.type === "sh")
    throw new Error(`checkScript: P2${n.type} cannot be wrapped in P2WSH`);
}
function hc(e, t, n) {
  if (e) {
    const r = st.decode(e);
    if (r.type === "tr_ns" || r.type === "tr_ms" || r.type === "ms" || r.type == "pk")
      throw new Error(`checkScript: non-wrapped ${r.type}`);
    if (r.type === "sh" && t) {
      if (!rt(r.hash, sc(t)))
        throw new Error("checkScript: sh wrong redeemScript hash");
      const o = st.decode(t);
      if (o.type === "tr" || o.type === "tr_ns" || o.type === "tr_ms")
        throw new Error(`checkScript: P2${o.type} cannot be wrapped in P2SH`);
      if (o.type === "sh")
        throw new Error("checkScript: P2SH cannot be wrapped in P2SH");
    }
    r.type === "wsh" && n && Cs(r, n);
  }
  if (t) {
    const r = st.decode(t);
    r.type === "wsh" && n && Cs(r, n);
  }
}
function Qu(e) {
  const t = {};
  for (const n of e) {
    const r = S.encode(n);
    if (t[r])
      throw new Error(`Multisig: non-uniq pubkey: ${e.map(S.encode)}`);
    t[r] = !0;
  }
}
function Ju(e, t, n = !1, r) {
  const o = st.decode(e);
  if (o.type === "unknown" && n)
    return;
  if (!["tr_ns", "tr_ms"].includes(o.type))
    throw new Error(`P2TR: invalid leaf script=${o.type}`);
  const s = o;
  if (!n && s.pubkeys)
    for (const i of s.pubkeys) {
      if (rt(i, Mo))
        throw new Error("Unspendable taproot key in leaf script");
      if (rt(i, t))
        throw new Error("Using P2TR with leaf script with same key as internal key is not supported");
    }
}
function pc(e) {
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
function oo(e, t = []) {
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
    left: oo(e.left, [e.right.hash, ...t]),
    right: oo(e.right, [e.left.hash, ...t])
  };
}
function so(e) {
  if (!e)
    throw new Error("taprootAddPath: empty tree");
  if (e.type === "leaf")
    return [e];
  if (e.type !== "branch")
    throw new Error(`taprootWalkTree: wrong type=${e}`);
  return [...so(e.left), ...so(e.right)];
}
function io(e, t, n = !1, r) {
  if (!e)
    throw new Error("taprootHashTree: empty tree");
  if (Array.isArray(e) && e.length === 1 && (e = e[0]), !Array.isArray(e)) {
    const { leafVersion: a, script: u } = e;
    if (e.tapLeafScript || e.tapMerkleRoot && !rt(e.tapMerkleRoot, X))
      throw new Error("P2TR: tapRoot leafScript cannot have tree");
    const f = typeof u == "string" ? S.decode(u) : u;
    if (!q(f))
      throw new Error(`checkScript: wrong script type=${f}`);
    return Ju(f, t, n), {
      type: "leaf",
      version: a,
      script: f,
      hash: cn(f, a)
    };
  }
  if (e.length !== 2 && (e = pc(e)), e.length !== 2)
    throw new Error("hashTree: non binary tree!");
  const o = io(e[0], t, n), s = io(e[1], t, n);
  let [i, c] = [o.hash, s.hash];
  return er(c, i) === -1 && ([i, c] = [c, i]), { type: "branch", left: o, right: s, hash: Ho("TapBranch", i, c) };
}
const pn = 192, cn = (e, t = pn) => Ho("TapLeaf", new Uint8Array([t]), Ct.encode(e));
function tf(e, t, n = We, r = !1, o) {
  if (!e && !t)
    throw new Error("p2tr: should have pubKey or scriptTree (or both)");
  const s = typeof e == "string" ? S.decode(e) : e || Mo;
  if (!$e(s, St.schnorr))
    throw new Error("p2tr: non-schnorr pubkey");
  if (t) {
    let i = oo(io(t, s, r));
    const c = i.hash, [a, u] = to(s, c), f = so(i).map((l) => ({
      ...l,
      controlBlock: Wt.encode({
        version: (l.version || pn) + u,
        internalKey: s,
        merklePath: l.path
      })
    }));
    return {
      type: "tr",
      script: st.encode({ type: "tr", pubkey: a }),
      address: ke(n).encode({ type: "tr", pubkey: a }),
      // For tests
      tweakedPubkey: a,
      // PSBT stuff
      tapInternalKey: s,
      leaves: f,
      tapLeafScript: f.map((l) => [
        Wt.decode(l.controlBlock),
        ce(l.script, new Uint8Array([l.version || pn]))
      ]),
      tapMerkleRoot: c
    };
  } else {
    const i = to(s, X)[0];
    return {
      type: "tr",
      script: st.encode({ type: "tr", pubkey: i }),
      address: ke(n).encode({ type: "tr", pubkey: i }),
      // For tests
      tweakedPubkey: i,
      // PSBT stuff
      tapInternalKey: s
    };
  }
}
function ef(e, t, n = !1) {
  return n || Qu(t), {
    type: "tr_ms",
    script: st.encode({ type: "tr_ms", pubkeys: t, m: e })
  };
}
const gc = ou(ht);
function wc(e, t) {
  if (t.length < 2 || t.length > 40)
    throw new Error("Witness: invalid length");
  if (e > 16)
    throw new Error("Witness: invalid version");
  if (e === 0 && !(t.length === 20 || t.length === 32))
    throw new Error("Witness: invalid length for version");
}
function Pr(e, t, n = We) {
  wc(e, t);
  const r = e === 0 ? Xr : Ne;
  return r.encode(n.bech32, [e].concat(r.toWords(t)));
}
function Ls(e, t) {
  return gc.encode(ce(Uint8Array.from(t), e));
}
function ke(e = We) {
  return {
    encode(t) {
      const { type: n } = t;
      if (n === "wpkh")
        return Pr(0, t.hash, e);
      if (n === "wsh")
        return Pr(0, t.hash, e);
      if (n === "tr")
        return Pr(1, t.pubkey, e);
      if (n === "pkh")
        return Ls(t.hash, [e.pubKeyHash]);
      if (n === "sh")
        return Ls(t.hash, [e.scriptHash]);
      throw new Error(`Unknown address type=${n}`);
    },
    decode(t) {
      if (t.length < 14 || t.length > 74)
        throw new Error("Invalid address length");
      if (e.bech32 && t.toLowerCase().startsWith(`${e.bech32}1`)) {
        let r;
        try {
          if (r = Xr.decode(t), r.words[0] !== 0)
            throw new Error(`bech32: wrong version=${r.words[0]}`);
        } catch {
          if (r = Ne.decode(t), r.words[0] === 0)
            throw new Error(`bech32m: wrong version=${r.words[0]}`);
        }
        if (r.prefix !== e.bech32)
          throw new Error(`wrong bech32 prefix=${r.prefix}`);
        const [o, ...s] = r.words, i = Xr.fromWords(s);
        if (wc(o, i), o === 0 && i.length === 32)
          return { type: "wsh", hash: i };
        if (o === 0 && i.length === 20)
          return { type: "wpkh", hash: i };
        if (o === 1 && i.length === 32)
          return { type: "tr", pubkey: i };
        throw new Error("Unknown witness program");
      }
      const n = gc.decode(t);
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
const $n = new Uint8Array(32), nf = {
  amount: 0xffffffffffffffffn,
  script: X
}, rf = (e) => Math.ceil(e / 4), of = 8, sf = 2, me = 0, jo = 4294967295;
Tr.decimal(of);
const an = (e, t) => e === void 0 ? t : e;
function or(e) {
  if (Array.isArray(e))
    return e.map((t) => or(t));
  if (q(e))
    return Uint8Array.from(e);
  if (["number", "bigint", "boolean", "string", "undefined"].includes(typeof e))
    return e;
  if (e === null)
    return e;
  if (typeof e == "object")
    return Object.fromEntries(Object.entries(e).map(([t, n]) => [t, or(n)]));
  throw new Error(`cloneDeep: unknown type=${e} (${typeof e})`);
}
const D = {
  DEFAULT: 0,
  ALL: 1,
  NONE: 2,
  SINGLE: 3,
  ANYONECANPAY: 128
}, Ae = {
  DEFAULT: D.DEFAULT,
  ALL: D.ALL,
  NONE: D.NONE,
  SINGLE: D.SINGLE,
  DEFAULT_ANYONECANPAY: D.DEFAULT | D.ANYONECANPAY,
  ALL_ANYONECANPAY: D.ALL | D.ANYONECANPAY,
  NONE_ANYONECANPAY: D.NONE | D.ANYONECANPAY,
  SINGLE_ANYONECANPAY: D.SINGLE | D.ANYONECANPAY
}, cf = ac(Ae);
function af(e, t, n, r = X) {
  return rt(n, t) && (e = ku(e, r), t = Do(e)), { privKey: e, pubKey: t };
}
function xe(e) {
  if (e.script === void 0 || e.amount === void 0)
    throw new Error("Transaction/output: script and amount required");
  return { script: e.script, amount: e.amount };
}
function en(e) {
  if (e.txid === void 0 || e.index === void 0)
    throw new Error("Transaction/input: txid and index required");
  return {
    txid: e.txid,
    index: e.index,
    sequence: an(e.sequence, jo),
    finalScriptSig: an(e.finalScriptSig, X)
  };
}
function _r(e) {
  for (const t in e) {
    const n = t;
    Cu.includes(n) || delete e[n];
  }
}
const Vr = ft({ txid: Z(32, !0), index: W });
function uf(e) {
  if (typeof e != "number" || typeof cf[e] != "string")
    throw new Error(`Invalid SigHash=${e}`);
  return e;
}
function Ps(e) {
  const t = e & 31;
  return {
    isAny: !!(e & D.ANYONECANPAY),
    isNone: t === D.NONE,
    isSingle: t === D.SINGLE
  };
}
function ff(e) {
  if (e !== void 0 && {}.toString.call(e) !== "[object Object]")
    throw new Error(`Wrong object type for transaction options: ${e}`);
  const t = {
    ...e,
    // Defaults
    version: an(e.version, sf),
    lockTime: an(e.lockTime, 0),
    PSBTVersion: an(e.PSBTVersion, 0)
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
function _s(e) {
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
      const o = ee.fromRaw(Le.encode(e.nonWitnessUtxo), {
        allowUnknownOutputs: !0,
        disableScriptCheck: !0,
        allowUnknownInputs: !0
      }), s = S.encode(e.txid);
      if (o.isFinal && o.id !== s)
        throw new Error(`nonWitnessUtxo: wrong txid, exp=${s} got=${o.id}`);
    }
  }
  return e;
}
function Fn(e) {
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
function Vs(e, t, n, r = !1, o = !1) {
  let { nonWitnessUtxo: s, txid: i } = e;
  typeof s == "string" && (s = S.decode(s)), q(s) && (s = Le.decode(s)), !("nonWitnessUtxo" in e) && s === void 0 && (s = t?.nonWitnessUtxo), typeof i == "string" && (i = S.decode(i)), i === void 0 && (i = t?.txid);
  let c = { ...t, ...e, nonWitnessUtxo: s, txid: i };
  !("nonWitnessUtxo" in e) && c.nonWitnessUtxo === void 0 && delete c.nonWitnessUtxo, c.sequence === void 0 && (c.sequence = jo), c.tapMerkleRoot === null && delete c.tapMerkleRoot, c = ro(Ar, c, t, n, o), Go.encode(c);
  let a;
  return c.nonWitnessUtxo && c.index !== void 0 ? a = c.nonWitnessUtxo.outputs[c.index] : c.witnessUtxo && (a = c.witnessUtxo), a && !r && hc(a && a.script, c.redeemScript, c.witnessScript), c;
}
function Ds(e, t = !1) {
  let n = "legacy", r = D.ALL;
  const o = Fn(e), s = st.decode(o.script);
  let i = s.type, c = s;
  const a = [s];
  if (s.type === "tr")
    return r = D.DEFAULT, {
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
let ee = class Wn {
  global = {};
  inputs = [];
  // use getInput()
  outputs = [];
  // use getOutput()
  opts;
  constructor(t = {}) {
    const n = this.opts = ff(t);
    n.lockTime !== me && (this.global.fallbackLocktime = n.lockTime), this.global.txVersion = n.version;
  }
  // Import
  static fromRaw(t, n = {}) {
    const r = Le.decode(t), o = new Wn({ ...n, version: r.version, lockTime: r.lockTime });
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
      r = Rs.decode(t);
    } catch (l) {
      try {
        r = $s.decode(t);
      } catch {
        throw l;
      }
    }
    const o = r.global.version || 0;
    if (o !== 0 && o !== 2)
      throw new Error(`Wrong PSBT version=${o}`);
    const s = r.global.unsignedTx, i = o === 0 ? s?.version : r.global.txVersion, c = o === 0 ? s?.lockTime : r.global.fallbackLocktime, a = new Wn({ ...n, version: i, lockTime: c, PSBTVersion: o }), u = o === 0 ? s?.inputs.length : r.global.inputCount;
    a.inputs = r.inputs.slice(0, u).map((l, d) => _s({
      finalScriptSig: X,
      ...r.global.unsignedTx?.inputs[d],
      ...l
    }));
    const f = o === 0 ? s?.outputs.length : r.global.outputCount;
    return a.outputs = r.outputs.slice(0, f).map((l, d) => ({
      ...l,
      ...r.global.unsignedTx?.outputs[d]
    })), a.global = { ...r.global, txVersion: i }, c !== me && (a.global.fallbackLocktime = c), a;
  }
  toPSBT(t = this.opts.PSBTVersion) {
    if (t !== 0 && t !== 2)
      throw new Error(`Wrong PSBT version=${t}`);
    const n = this.inputs.map((s) => _s(Ns(t, Ar, s)));
    for (const s of n)
      s.partialSig && !s.partialSig.length && delete s.partialSig, s.finalScriptSig && !s.finalScriptSig.length && delete s.finalScriptSig, s.finalScriptWitness && !s.finalScriptWitness.length && delete s.finalScriptWitness;
    const r = this.outputs.map((s) => Ns(t, hn, s)), o = { ...this.global };
    return t === 0 ? (o.unsignedTx = on.decode(on.encode({
      version: this.version,
      lockTime: this.lockTime,
      inputs: this.inputs.map(en).map((s) => ({
        ...s,
        finalScriptSig: X
      })),
      outputs: this.outputs.map(xe)
    })), delete o.fallbackLocktime, delete o.txVersion) : (o.version = t, o.txVersion = this.version, o.inputCount = this.inputs.length, o.outputCount = this.outputs.length, o.fallbackLocktime && o.fallbackLocktime === me && delete o.fallbackLocktime), this.opts.bip174jsCompat && (n.length || n.push({}), r.length || r.push({})), (t === 0 ? Rs : $s).encode({
      global: o,
      inputs: n,
      outputs: r
    });
  }
  // BIP370 lockTime (https://github.com/bitcoin/bips/blob/master/bip-0370.mediawiki#determining-lock-time)
  get lockTime() {
    let t = me, n = 0, r = me, o = 0;
    for (const s of this.inputs)
      s.requiredHeightLocktime && (t = Math.max(t, s.requiredHeightLocktime), n++), s.requiredTimeLocktime && (r = Math.max(r, s.requiredTimeLocktime), o++);
    return n && n >= o ? t : r !== me ? r : this.global.fallbackLocktime || me;
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
    const n = this.inputs[t].sighashType, r = n === void 0 ? D.DEFAULT : n, o = r === D.DEFAULT ? D.ALL : r & 3;
    return { sigInputs: r & D.ANYONECANPAY, sigOutputs: o };
  }
  // Very nice for debug purposes, but slow. If there is too much inputs/outputs to add, will be quadratic.
  // Some cache will be nice, but there chance to have bugs with cache invalidation
  signStatus() {
    let t = !0, n = !0, r = [], o = [];
    for (let s = 0; s < this.inputs.length; s++) {
      if (this.inputStatus(s) === "unsigned")
        continue;
      const { sigInputs: c, sigOutputs: a } = this.inputSighash(s);
      if (c === D.ANYONECANPAY ? r.push(s) : t = !1, a === D.ALL)
        n = !1;
      else if (a === D.SINGLE)
        o.push(s);
      else if (a !== D.NONE) throw new Error(`Wrong signature hash output type: ${a}`);
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
    const n = this.outputs.map(xe);
    t += 4 * _t.encode(this.outputs.length).length;
    for (const r of n)
      t += 32 + 4 * Ct.encode(r.script).length;
    this.hasWitnesses && (t += 2), t += 4 * _t.encode(this.inputs.length).length;
    for (const r of this.inputs)
      t += 160 + 4 * Ct.encode(r.finalScriptSig || X).length, this.hasWitnesses && r.finalScriptWitness && (t += dn.encode(r.finalScriptWitness).length);
    return t;
  }
  get vsize() {
    return rf(this.weight);
  }
  toBytes(t = !1, n = !1) {
    return Le.encode({
      version: this.version,
      lockTime: this.lockTime,
      inputs: this.inputs.map(en).map((r) => ({
        ...r,
        finalScriptSig: t && r.finalScriptSig || X
      })),
      outputs: this.outputs.map(xe),
      witnesses: this.inputs.map((r) => r.finalScriptWitness || []),
      segwitFlag: n && this.hasWitnesses
    });
  }
  get unsignedTx() {
    return this.toBytes(!1, !1);
  }
  get hex() {
    return S.encode(this.toBytes(!0, this.hasWitnesses));
  }
  get hash() {
    return S.encode(se(this.toBytes(!0)));
  }
  get id() {
    return S.encode(se(this.toBytes(!0)).reverse());
  }
  // Input stuff
  checkInputIdx(t) {
    if (!Number.isSafeInteger(t) || 0 > t || t >= this.inputs.length)
      throw new Error(`Wrong input index=${t}`);
  }
  getInput(t) {
    return this.checkInputIdx(t), or(this.inputs[t]);
  }
  get inputsLength() {
    return this.inputs.length;
  }
  // Modification
  addInput(t, n = !1) {
    if (!n && !this.signStatus().addInput)
      throw new Error("Tx has signed inputs, cannot add new one");
    return this.inputs.push(Vs(t, void 0, void 0, this.opts.disableScriptCheck)), this.inputs.length - 1;
  }
  updateInput(t, n, r = !1) {
    this.checkInputIdx(t);
    let o;
    if (!r) {
      const s = this.signStatus();
      (!s.addInput || s.inputs.includes(t)) && (o = Lu);
    }
    this.inputs[t] = Vs(n, this.inputs[t], o, this.opts.disableScriptCheck, this.opts.allowUnknown);
  }
  // Output stuff
  checkOutputIdx(t) {
    if (!Number.isSafeInteger(t) || 0 > t || t >= this.outputs.length)
      throw new Error(`Wrong output index=${t}`);
  }
  getOutput(t) {
    return this.checkOutputIdx(t), or(this.outputs[t]);
  }
  getOutputAddress(t, n = We) {
    const r = this.getOutput(t);
    if (r.script)
      return ke(n).encode(st.decode(r.script));
  }
  get outputsLength() {
    return this.outputs.length;
  }
  normalizeOutput(t, n, r) {
    let { amount: o, script: s } = t;
    if (o === void 0 && (o = n?.amount), typeof o != "bigint")
      throw new Error(`Wrong amount type, should be of type bigint in sats, but got ${o} of type ${typeof o}`);
    typeof s == "string" && (s = S.decode(s)), s === void 0 && (s = n?.script);
    let i = { ...n, ...t, amount: o, script: s };
    if (i.amount === void 0 && delete i.amount, i = ro(hn, i, n, r, this.opts.allowUnknown), zo.encode(i), i.script && !this.opts.allowUnknownOutputs && st.decode(i.script).type === "unknown")
      throw new Error("Transaction/output: unknown output script type, there is a chance that input is unspendable. Pass allowUnknownOutputs=true, if you sure");
    return this.opts.disableScriptCheck || hc(i.script, i.redeemScript, i.witnessScript), i;
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
      (!s.addOutput || s.outputs.includes(t)) && (o = Pu);
    }
    this.outputs[t] = this.normalizeOutput(n, this.outputs[t], o);
  }
  addOutputAddress(t, n, r = We) {
    return this.addOutput({ script: st.encode(ke(r).decode(t)), amount: n });
  }
  // Utils
  get fee() {
    let t = 0n;
    for (const r of this.inputs) {
      const o = Fn(r);
      if (!o)
        throw new Error("Empty input amount");
      t += o.amount;
    }
    const n = this.outputs.map(xe);
    for (const r of n)
      t -= r.amount;
    return t;
  }
  // Signing
  // Based on https://github.com/bitcoin/bitcoin/blob/5871b5b5ab57a0caf9b7514eb162c491c83281d5/test/functional/test_framework/script.py#L624
  // There is optimization opportunity to re-use hashes for multiple inputs for witness v0/v1,
  // but we are trying to be less complicated for audit purpose for now.
  preimageLegacy(t, n, r) {
    const { isAny: o, isNone: s, isSingle: i } = Ps(r);
    if (t < 0 || !Number.isSafeInteger(t))
      throw new Error(`Invalid input idx=${t}`);
    if (i && t >= this.outputs.length || t >= this.inputs.length)
      return nc.encode(1n);
    n = L.encode(L.decode(n).filter((f) => f !== "CODESEPARATOR"));
    let c = this.inputs.map(en).map((f, l) => ({
      ...f,
      finalScriptSig: l === t ? n : X
    }));
    o ? c = [c[t]] : (s || i) && (c = c.map((f, l) => ({
      ...f,
      sequence: l === t ? f.sequence : 0
    })));
    let a = this.outputs.map(xe);
    s ? a = [] : i && (a = a.slice(0, t).fill(nf).concat([a[t]]));
    const u = Le.encode({
      lockTime: this.lockTime,
      version: this.version,
      segwitFlag: !1,
      inputs: c,
      outputs: a
    });
    return se(u, Re.encode(r));
  }
  preimageWitnessV0(t, n, r, o) {
    const { isAny: s, isNone: i, isSingle: c } = Ps(r);
    let a = $n, u = $n, f = $n;
    const l = this.inputs.map(en), d = this.outputs.map(xe);
    s || (a = se(...l.map(Vr.encode))), !s && !c && !i && (u = se(...l.map((w) => W.encode(w.sequence)))), !c && !i ? f = se(...d.map(Te.encode)) : c && t < d.length && (f = se(Te.encode(d[t])));
    const h = l[t];
    return se(Re.encode(this.version), a, u, Z(32, !0).encode(h.txid), W.encode(h.index), Ct.encode(n), Kn.encode(o), W.encode(h.sequence), f, W.encode(this.lockTime), W.encode(r));
  }
  preimageWitnessV1(t, n, r, o, s = -1, i, c = 192, a) {
    if (!Array.isArray(o) || this.inputs.length !== o.length)
      throw new Error(`Invalid amounts array=${o}`);
    if (!Array.isArray(n) || this.inputs.length !== n.length)
      throw new Error(`Invalid prevOutScript array=${n}`);
    const u = [
      ae.encode(0),
      ae.encode(r),
      // U8 sigHash
      Re.encode(this.version),
      W.encode(this.lockTime)
    ], f = r === D.DEFAULT ? D.ALL : r & 3, l = r & D.ANYONECANPAY, d = this.inputs.map(en), h = this.outputs.map(xe);
    l !== D.ANYONECANPAY && u.push(...[
      d.map(Vr.encode),
      o.map(Kn.encode),
      n.map(Ct.encode),
      d.map((p) => W.encode(p.sequence))
    ].map((p) => ht(ce(...p)))), f === D.ALL && u.push(ht(ce(...h.map(Te.encode))));
    const w = (a ? 1 : 0) | (i ? 2 : 0);
    if (u.push(new Uint8Array([w])), l === D.ANYONECANPAY) {
      const p = d[t];
      u.push(Vr.encode(p), Kn.encode(o[t]), Ct.encode(n[t]), W.encode(p.sequence));
    } else
      u.push(W.encode(t));
    return w & 1 && u.push(ht(Ct.encode(a || X))), f === D.SINGLE && u.push(t < h.length ? ht(Te.encode(h[t])) : $n), i && u.push(cn(i, c), ae.encode(0), Re.encode(s)), Ho("TapSighash", ...u);
  }
  // Signer can be privateKey OR instance of bip32 HD stuff
  signIdx(t, n, r, o) {
    this.checkInputIdx(n);
    const s = this.inputs[n], i = Ds(s, this.opts.allowLegacyWitnessUtxo);
    if (!q(t)) {
      if (!s.bip32Derivation || !s.bip32Derivation.length)
        throw new Error("bip32Derivation: empty");
      const f = s.bip32Derivation.filter((d) => d[1].fingerprint == t.fingerprint).map(([d, { path: h }]) => {
        let w = t;
        for (const p of h)
          w = w.deriveChild(p);
        if (!rt(w.publicKey, d))
          throw new Error("bip32Derivation: wrong pubKey");
        if (!w.privateKey)
          throw new Error("bip32Derivation: no privateKey");
        return w;
      });
      if (!f.length)
        throw new Error(`bip32Derivation: no items with fingerprint=${t.fingerprint}`);
      let l = !1;
      for (const d of f)
        this.signIdx(d.privateKey, n) && (l = !0);
      return l;
    }
    r ? r.forEach(uf) : r = [i.defaultSighash];
    const c = i.sighash;
    if (!r.includes(c))
      throw new Error(`Input with not allowed sigHash=${c}. Allowed: ${r.join(", ")}`);
    const { sigOutputs: a } = this.inputSighash(n);
    if (a === D.SINGLE && n >= this.outputs.length)
      throw new Error(`Input with sighash SINGLE, but there is no output with corresponding index=${n}`);
    const u = Fn(s);
    if (i.txType === "taproot") {
      const f = this.inputs.map(Fn), l = f.map((m) => m.script), d = f.map((m) => m.amount);
      let h = !1, w = Do(t), p = s.tapMerkleRoot || X;
      if (s.tapInternalKey) {
        const { pubKey: m, privKey: x } = af(t, w, s.tapInternalKey, p), [E, v] = to(s.tapInternalKey, p);
        if (rt(E, m)) {
          const O = this.preimageWitnessV1(n, l, c, d), A = ce(As(O, x, o), c !== D.DEFAULT ? new Uint8Array([c]) : X);
          this.updateInput(n, { tapKeySig: A }, !0), h = !0;
        }
      }
      if (s.tapLeafScript) {
        s.tapScriptSig = s.tapScriptSig || [];
        for (const [m, x] of s.tapLeafScript) {
          const E = x.subarray(0, -1), v = L.decode(E), O = x[x.length - 1], A = cn(E, O);
          if (v.findIndex((H) => q(H) && rt(H, w)) === -1)
            continue;
          const y = this.preimageWitnessV1(n, l, c, d, void 0, E, O), tt = ce(As(y, t, o), c !== D.DEFAULT ? new Uint8Array([c]) : X);
          this.updateInput(n, { tapScriptSig: [[{ pubKey: w, leafHash: A }, tt]] }, !0), h = !0;
        }
      }
      if (!h)
        throw new Error("No taproot scripts signed");
      return !0;
    } else {
      const f = ic(t);
      let l = !1;
      const d = sc(f);
      for (const p of L.decode(i.lastScript))
        q(p) && (rt(p, f) || rt(p, d)) && (l = !0);
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
      const w = vu(h, t, this.opts.lowR);
      this.updateInput(n, {
        partialSig: [[f, ce(w, new Uint8Array([c]))]]
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
    const n = this.inputs[t], r = Ds(n, this.opts.allowLegacyWitnessUtxo);
    if (r.txType === "taproot") {
      if (n.tapKeySig)
        n.finalScriptWitness = [n.tapKeySig];
      else if (n.tapLeafScript && n.tapScriptSig) {
        const a = n.tapLeafScript.sort((u, f) => Wt.encode(u[0]).length - Wt.encode(f[0]).length);
        for (const [u, f] of a) {
          const l = f.slice(0, -1), d = f[f.length - 1], h = st.decode(l), w = cn(l, d), p = n.tapScriptSig.filter((x) => rt(x[0].leafHash, w));
          let m = [];
          if (h.type === "tr_ms") {
            const x = h.m, E = h.pubkeys;
            let v = 0;
            for (const O of E) {
              const A = p.findIndex((F) => rt(F[0].pubKey, O));
              if (v === x || A === -1) {
                m.push(X);
                continue;
              }
              m.push(p[A][1]), v++;
            }
            if (v !== x)
              continue;
          } else if (h.type === "tr_ns") {
            for (const x of h.pubkeys) {
              const E = p.findIndex((v) => rt(v[0].pubKey, x));
              E !== -1 && m.push(p[E][1]);
            }
            if (m.length !== h.pubkeys.length)
              continue;
          } else if (h.type === "unknown" && this.opts.allowUnknownInputs) {
            const x = L.decode(l);
            if (m = p.map(([{ pubKey: E }, v]) => {
              const O = x.findIndex((A) => q(A) && rt(A, E));
              if (O === -1)
                throw new Error("finalize/taproot: cannot find position of pubkey in script");
              return { signature: v, pos: O };
            }).sort((E, v) => E.pos - v.pos).map((E) => E.signature), !m.length)
              continue;
          } else {
            const x = this.opts.customScripts;
            if (x)
              for (const E of x) {
                if (!E.finalizeTaproot)
                  continue;
                const v = L.decode(l), O = E.encode(v);
                if (O === void 0)
                  continue;
                const A = E.finalizeTaproot(l, O, p);
                if (A) {
                  n.finalScriptWitness = A.concat(Wt.encode(u)), n.finalScriptSig = X, _r(n);
                  return;
                }
              }
            throw new Error("Finalize: Unknown tapLeafScript");
          }
          n.finalScriptWitness = m.reverse().concat([l, Wt.encode(u)]);
          break;
        }
        if (!n.finalScriptWitness)
          throw new Error("finalize/taproot: empty witness");
      } else
        throw new Error("finalize/taproot: unknown input");
      n.finalScriptSig = X, _r(n);
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
      o = L.encode([0, ...f]);
    } else if (r.last.type === "pk")
      o = L.encode([n.partialSig[0][1]]);
    else if (r.last.type === "pkh")
      o = L.encode([n.partialSig[0][1], n.partialSig[0][0]]);
    else if (r.last.type === "wpkh")
      o = X, s = [n.partialSig[0][1], n.partialSig[0][0]];
    else if (r.last.type === "unknown" && !this.opts.allowUnknownInputs)
      throw new Error("Unknown inputs not allowed");
    let i, c;
    if (r.type.includes("wsh-") && (o.length && r.lastScript.length && (s = L.decode(o).map((a) => {
      if (a === 0)
        return X;
      if (q(a))
        return a;
      throw new Error(`Wrong witness op=${a}`);
    })), s = s.concat(r.lastScript)), r.txType === "segwit" && (c = s), r.type.startsWith("sh-wsh-") ? i = L.encode([L.encode([0, ht(r.lastScript)])]) : r.type.startsWith("sh-") ? i = L.encode([...L.decode(o), r.lastScript]) : r.type.startsWith("wsh-") || r.txType !== "segwit" && (i = o), !i && !c)
      throw new Error("Unknown error finalizing input");
    i && (n.finalScriptSig = i), c && (n.finalScriptWitness = c), _r(n);
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
    const n = this.global.unsignedTx ? on.encode(this.global.unsignedTx) : X, r = t.global.unsignedTx ? on.encode(t.global.unsignedTx) : X;
    if (!rt(n, r))
      throw new Error("Transaction/combine: different unsigned tx");
    this.global = ro(Fo, this.global, t.global, void 0, this.opts.allowUnknown);
    for (let o = 0; o < this.inputs.length; o++)
      this.updateInput(o, t.inputs[o], !0);
    for (let o = 0; o < this.outputs.length; o++)
      this.updateOutput(o, t.outputs[o], !0);
    return this;
  }
  clone() {
    return Wn.fromPSBT(this.toPSBT(this.opts.PSBTVersion), this.opts);
  }
};
class he extends ee {
  constructor(t) {
    super(Dr(t));
  }
  static fromPSBT(t, n) {
    return ee.fromPSBT(t, Dr(n));
  }
  static fromRaw(t, n) {
    return ee.fromRaw(t, Dr(n));
  }
}
he.ARK_TX_OPTS = {
  allowUnknown: !0,
  allowUnknownOutputs: !0,
  allowUnknownInputs: !0
};
function Dr(e) {
  return { ...he.ARK_TX_OPTS, ...e };
}
class qo extends Error {
  idx;
  // Indice of participant
  constructor(t, n) {
    super(n), this.idx = t;
  }
}
const { taggedHash: yc, pointToBytes: Cn } = Nt.utils, Vt = Ft.Point, _ = Vt.Fn, zt = Ft.lengths.publicKey, co = new Uint8Array(zt), Hs = de(Z(33), {
  decode: (e) => gn(e) ? co : e.toBytes(!0),
  encode: (e) => ln(e, co) ? Vt.ZERO : Vt.fromBytes(e)
}), Ms = xt(nc, (e) => (xi("n", e, 1n, _.ORDER), e)), Pe = ft({ R1: Hs, R2: Hs }), mc = ft({ k1: Ms, k2: Ms, publicKey: Z(zt) });
function Ks(e, ...t) {
}
function Bt(e, ...t) {
  if (!Array.isArray(e))
    throw new Error("expected array");
  e.forEach((n) => V(n, ...t));
}
function Fs(e) {
  if (!Array.isArray(e))
    throw new Error("expected array");
  e.forEach((t, n) => {
    if (typeof t != "boolean")
      throw new Error("expected boolean in xOnly array, got" + t + "(" + n + ")");
  });
}
const sr = (e, ...t) => _.create(_.fromBytes(yc(e, ...t), !0)), nn = (e, t) => An(e.y) ? t : _.neg(t);
function ve(e) {
  return Vt.BASE.multiply(e);
}
function gn(e) {
  return e.equals(Vt.ZERO);
}
function ao(e) {
  return Bt(e, zt), e.sort(er);
}
function xc(e) {
  Bt(e, zt);
  for (let t = 1; t < e.length; t++)
    if (!ln(e[t], e[0]))
      return e[t];
  return co;
}
function Ec(e) {
  return Bt(e, zt), yc("KeyAgg list", ...e);
}
function bc(e, t, n) {
  return V(e, zt), V(t, zt), ln(e, t) ? 1n : sr("KeyAgg coefficient", n, e);
}
function uo(e, t = [], n = []) {
  if (Bt(e, zt), Bt(t, 32), t.length !== n.length)
    throw new Error("The tweaks and isXonly arrays must have the same length");
  const r = xc(e), o = Ec(e);
  let s = Vt.ZERO;
  for (let a = 0; a < e.length; a++) {
    let u;
    try {
      u = Vt.fromBytes(e[a]);
    } catch {
      throw new qo(a, "pubkey");
    }
    s = s.add(u.multiply(bc(e[a], r, o)));
  }
  let i = _.ONE, c = _.ZERO;
  for (let a = 0; a < t.length; a++) {
    const u = n[a] && !An(s.y) ? _.neg(_.ONE) : _.ONE, f = _.fromBytes(t[a]);
    if (s = s.multiply(u).add(ve(f)), gn(s))
      throw new Error("The result of tweaking cannot be infinity");
    i = _.mul(u, i), c = _.add(f, _.mul(u, c));
  }
  return { aggPublicKey: s, gAcc: i, tweakAcc: c };
}
const Ws = (e, t, n, r, o, s) => sr("MuSig/nonce", e, new Uint8Array([t.length]), t, new Uint8Array([n.length]), n, o, Sn(s.length, 4), s, new Uint8Array([r]));
function lf(e, t, n = new Uint8Array(0), r, o = new Uint8Array(0), s = bn(32)) {
  if (V(e, zt), Ks(t, 32), V(n), ![0, 32].includes(n.length))
    throw new Error("wrong aggPublicKey");
  Ks(), V(o), V(s, 32);
  const i = Uint8Array.of(0), c = Ws(s, e, n, 0, i, o), a = Ws(s, e, n, 1, i, o);
  return {
    secret: mc.encode({ k1: c, k2: a, publicKey: e }),
    public: Pe.encode({ R1: ve(c), R2: ve(a) })
  };
}
function df(e) {
  Bt(e, 66);
  let t = Vt.ZERO, n = Vt.ZERO;
  for (let r = 0; r < e.length; r++) {
    const o = e[r];
    try {
      const { R1: s, R2: i } = Pe.decode(o);
      if (gn(s) || gn(i))
        throw new Error("infinity point");
      t = t.add(s), n = n.add(i);
    } catch {
      throw new qo(r, "pubnonce");
    }
  }
  return Pe.encode({ R1: t, R2: n });
}
class hf {
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
    if (Bt(n, 33), Bt(o, 32), Fs(s), V(r), o.length !== s.length)
      throw new Error("The tweaks and isXonly arrays must have the same length");
    const { aggPublicKey: i, gAcc: c, tweakAcc: a } = uo(n, o, s), { R1: u, R2: f } = Pe.decode(t);
    this.publicKeys = n, this.Q = i, this.gAcc = c, this.tweakAcc = a, this.b = sr("MuSig/noncecoef", t, Cn(i), r);
    const l = u.add(f.multiply(this.b));
    this.R = gn(l) ? Vt.BASE : l, this.e = sr("BIP0340/challenge", Cn(this.R), Cn(i), r), this.tweaks = o, this.isXonly = s, this.L = Ec(n), this.secondKey = xc(n);
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
    if (!n.some((s) => ln(s, r)))
      throw new Error("The signer's pubkey must be included in the list of pubkeys");
    return bc(r, this.secondKey, this.L);
  }
  partialSigVerifyInternal(t, n, r) {
    const { Q: o, gAcc: s, b: i, R: c, e: a } = this, u = _.fromBytes(t, !0);
    if (!_.isValid(u))
      return !1;
    const { R1: f, R2: l } = Pe.decode(n), d = f.add(l.multiply(i)), h = An(c.y) ? d : d.negate(), w = Vt.fromBytes(r), p = this.getSessionKeyAggCoeff(w), m = _.mul(nn(o, 1n), s), x = ve(u), E = h.add(w.multiply(_.mul(a, _.mul(p, m))));
    return x.equals(E);
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
    if (V(n, 32), typeof r != "boolean")
      throw new Error("expected boolean");
    const { Q: o, gAcc: s, b: i, R: c, e: a } = this, { k1: u, k2: f, publicKey: l } = mc.decode(t);
    if (t.fill(0, 0, 64), !_.isValid(u))
      throw new Error("wrong k1");
    if (!_.isValid(f))
      throw new Error("wrong k1");
    const d = nn(c, u), h = nn(c, f), w = _.fromBytes(n);
    if (_.is0(w))
      throw new Error("wrong d_");
    const p = ve(w), m = p.toBytes(!0);
    if (!ln(m, l))
      throw new Error("Public key does not match nonceGen argument");
    const x = this.getSessionKeyAggCoeff(p), E = nn(o, 1n), v = _.mul(E, _.mul(s, w)), O = _.add(d, _.add(_.mul(i, h), _.mul(a, _.mul(x, v)))), A = _.toBytes(O);
    if (!r) {
      const F = Pe.encode({
        R1: ve(u),
        R2: ve(f)
      });
      if (!this.partialSigVerifyInternal(A, F, m))
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
    if (V(t, 32), Bt(n, 66), Bt(o, zt), Bt(s, 32), Fs(i), fe(r), n.length !== o.length)
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
    Bt(t, 32);
    const { Q: n, tweakAcc: r, R: o, e: s } = this;
    let i = 0n;
    for (let a = 0; a < t.length; a++) {
      const u = _.fromBytes(t[a], !0);
      if (!_.isValid(u))
        throw new qo(a, "psig");
      i = _.add(i, u);
    }
    const c = nn(n, 1n);
    return i = _.add(i, _.mul(s, _.mul(c, r))), Lt(Cn(o), _.toBytes(i));
  }
}
function pf(e) {
  const t = lf(e);
  return { secNonce: t.secret, pubNonce: t.public };
}
function gf(e) {
  return df(e);
}
/*! noble-secp256k1 - MIT License (c) 2019 Paul Miller (paulmillr.com) */
const Sc = {
  p: 0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffefffffc2fn,
  n: 0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141n,
  h: 1n,
  a: 0n,
  b: 7n,
  Gx: 0x79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798n,
  Gy: 0x483ada7726a3c4655da4fbfc0e1108a8fd17b448a68554199c47d08ffb10d4b8n
}, { p: ue, n: pe, Gx: wf, Gy: yf, b: Tc } = Sc, ut = 32, Ie = 64, ir = {
  publicKey: ut + 1,
  publicKeyUncompressed: Ie + 1,
  signature: Ie,
  seed: ut + ut / 2
}, mf = (...e) => {
  "captureStackTrace" in Error && typeof Error.captureStackTrace == "function" && Error.captureStackTrace(...e);
}, G = (e = "") => {
  const t = new Error(e);
  throw mf(t, G), t;
}, xf = (e) => typeof e == "bigint", Ef = (e) => typeof e == "string", bf = (e) => e instanceof Uint8Array || ArrayBuffer.isView(e) && e.constructor.name === "Uint8Array", Tt = (e, t, n = "") => {
  const r = bf(e), o = e?.length, s = t !== void 0;
  if (!r || s && o !== t) {
    const i = n && `"${n}" `, c = s ? ` of length ${t}` : "", a = r ? `length=${o}` : `type=${typeof e}`;
    G(i + "expected Uint8Array" + c + ", got " + a);
  }
  return e;
}, ge = (e) => new Uint8Array(e), vc = (e, t) => e.toString(16).padStart(t, "0"), kc = (e) => Array.from(Tt(e)).map((t) => vc(t, 2)).join(""), Xt = { _0: 48, _9: 57, A: 65, F: 70, a: 97, f: 102 }, Gs = (e) => {
  if (e >= Xt._0 && e <= Xt._9)
    return e - Xt._0;
  if (e >= Xt.A && e <= Xt.F)
    return e - (Xt.A - 10);
  if (e >= Xt.a && e <= Xt.f)
    return e - (Xt.a - 10);
}, Ac = (e) => {
  const t = "hex invalid";
  if (!Ef(e))
    return G(t);
  const n = e.length, r = n / 2;
  if (n % 2)
    return G(t);
  const o = ge(r);
  for (let s = 0, i = 0; s < r; s++, i += 2) {
    const c = Gs(e.charCodeAt(i)), a = Gs(e.charCodeAt(i + 1));
    if (c === void 0 || a === void 0)
      return G(t);
    o[s] = c * 16 + a;
  }
  return o;
}, Ic = () => globalThis?.crypto, zs = () => Ic()?.subtle ?? G("crypto.subtle must be defined, consider polyfill"), jt = (...e) => {
  const t = ge(e.reduce((r, o) => r + Tt(o).length, 0));
  let n = 0;
  return e.forEach((r) => {
    t.set(r, n), n += r.length;
  }), t;
}, Ir = (e = ut) => Ic().getRandomValues(ge(e)), wn = BigInt, Be = (e, t, n, r = "bad number: out of range") => xf(e) && t <= e && e < n ? e : G(r), I = (e, t = ue) => {
  const n = e % t;
  return n >= 0n ? n : t + n;
}, Jt = (e) => I(e, pe), Bc = (e, t) => {
  (e === 0n || t <= 0n) && G("no inverse n=" + e + " mod=" + t);
  let n = I(e, t), r = t, o = 0n, s = 1n;
  for (; n !== 0n; ) {
    const i = r / n, c = r % n, a = o - s * i;
    r = n, n = c, o = s, s = a;
  }
  return r === 1n ? I(o, t) : G("no inverse");
}, Yo = (e) => {
  const t = Zo[e];
  return typeof t != "function" && G("hashes." + e + " not set"), t;
}, Hr = (e) => e instanceof wt ? e : G("Point expected"), Oc = (e) => I(I(e * e) * e + Tc), js = (e) => Be(e, 0n, ue), Gn = (e) => Be(e, 1n, ue), fo = (e) => Be(e, 1n, pe), Ge = (e) => (e & 1n) === 0n, Br = (e) => Uint8Array.of(e), Sf = (e) => Br(Ge(e) ? 2 : 3), Uc = (e) => {
  const t = Oc(Gn(e));
  let n = 1n;
  for (let r = t, o = (ue + 1n) / 4n; o > 0n; o >>= 1n)
    o & 1n && (n = n * r % ue), r = r * r % ue;
  return I(n * n) === t ? n : G("sqrt invalid");
};
class wt {
  static BASE;
  static ZERO;
  X;
  Y;
  Z;
  constructor(t, n, r) {
    this.X = js(t), this.Y = Gn(n), this.Z = js(r), Object.freeze(this);
  }
  static CURVE() {
    return Sc;
  }
  /** Create 3d xyz point from 2d xy. (0, 0) => (0, 1, 0), not (0, 0, 1) */
  static fromAffine(t) {
    const { x: n, y: r } = t;
    return n === 0n && r === 0n ? Ee : new wt(n, r, 1n);
  }
  /** Convert Uint8Array or hex string to Point. */
  static fromBytes(t) {
    Tt(t);
    const { publicKey: n, publicKeyUncompressed: r } = ir;
    let o;
    const s = t.length, i = t[0], c = t.subarray(1), a = ze(c, 0, ut);
    if (s === n && (i === 2 || i === 3)) {
      let u = Uc(a);
      const f = Ge(u);
      Ge(wn(i)) !== f && (u = I(-u)), o = new wt(a, u, 1n);
    }
    return s === r && i === 4 && (o = new wt(a, ze(c, ut, Ie), 1n)), o ? o.assertValidity() : G("bad point: not on curve");
  }
  static fromHex(t) {
    return wt.fromBytes(Ac(t));
  }
  get x() {
    return this.toAffine().x;
  }
  get y() {
    return this.toAffine().y;
  }
  /** Equality check: compare points P&Q. */
  equals(t) {
    const { X: n, Y: r, Z: o } = this, { X: s, Y: i, Z: c } = Hr(t), a = I(n * c), u = I(s * o), f = I(r * c), l = I(i * o);
    return a === u && f === l;
  }
  is0() {
    return this.equals(Ee);
  }
  /** Flip point over y coordinate. */
  negate() {
    return new wt(this.X, I(-this.Y), this.Z);
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
    const { X: n, Y: r, Z: o } = this, { X: s, Y: i, Z: c } = Hr(t), a = 0n, u = Tc;
    let f = 0n, l = 0n, d = 0n;
    const h = I(u * 3n);
    let w = I(n * s), p = I(r * i), m = I(o * c), x = I(n + r), E = I(s + i);
    x = I(x * E), E = I(w + p), x = I(x - E), E = I(n + o);
    let v = I(s + c);
    return E = I(E * v), v = I(w + m), E = I(E - v), v = I(r + o), f = I(i + c), v = I(v * f), f = I(p + m), v = I(v - f), d = I(a * E), f = I(h * m), d = I(f + d), f = I(p - d), d = I(p + d), l = I(f * d), p = I(w + w), p = I(p + w), m = I(a * m), E = I(h * E), p = I(p + m), m = I(w - m), m = I(a * m), E = I(E + m), w = I(p * E), l = I(l + w), w = I(v * E), f = I(x * f), f = I(f - w), w = I(x * p), d = I(v * d), d = I(d + w), new wt(f, l, d);
  }
  subtract(t) {
    return this.add(Hr(t).negate());
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
      return Ee;
    if (fo(t), t === 1n)
      return this;
    if (this.equals(we))
      return qf(t).p;
    let r = Ee, o = we;
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
    if (this.equals(Ee))
      return { x: 0n, y: 0n };
    if (r === 1n)
      return { x: t, y: n };
    const o = Bc(r, ue);
    return I(r * o) !== 1n && G("inverse invalid"), { x: I(t * o), y: I(n * o) };
  }
  /** Checks if the point is valid and on-curve. */
  assertValidity() {
    const { x: t, y: n } = this.toAffine();
    return Gn(t), Gn(n), I(n * n) === Oc(t) ? this : G("bad point: not on curve");
  }
  /** Converts point to 33/65-byte Uint8Array. */
  toBytes(t = !0) {
    const { x: n, y: r } = this.assertValidity().toAffine(), o = At(n);
    return t ? jt(Sf(r), o) : jt(Br(4), o, At(r));
  }
  toHex(t) {
    return kc(this.toBytes(t));
  }
}
const we = new wt(wf, yf, 1n), Ee = new wt(0n, 1n, 0n);
wt.BASE = we;
wt.ZERO = Ee;
const Tf = (e, t, n) => we.multiply(t, !1).add(e.multiply(n, !1)).assertValidity(), ye = (e) => wn("0x" + (kc(e) || "0")), ze = (e, t, n) => ye(e.subarray(t, n)), vf = 2n ** 256n, At = (e) => Ac(vc(Be(e, 0n, vf), Ie)), Nc = (e) => {
  const t = ye(Tt(e, ut, "secret key"));
  return Be(t, 1n, pe, "invalid secret key: outside of range");
}, Rc = (e) => e > pe >> 1n, kf = (e) => {
  [0, 1, 2, 3].includes(e) || G("recovery id must be valid and present");
}, Af = (e) => {
  e != null && !qs.includes(e) && G(`Signature format must be one of: ${qs.join(", ")}`), e === Cc && G('Signature format "der" is not supported: switch to noble-curves');
}, If = (e, t = je) => {
  Af(t);
  const n = ir.signature, r = n + 1;
  let o = `Signature format "${t}" expects Uint8Array with length `;
  t === je && e.length !== n && G(o + n), t === ar && e.length !== r && G(o + r);
};
class cr {
  r;
  s;
  recovery;
  constructor(t, n, r) {
    this.r = fo(t), this.s = fo(n), r != null && (this.recovery = r), Object.freeze(this);
  }
  static fromBytes(t, n = je) {
    If(t, n);
    let r;
    n === ar && (r = t[0], t = t.subarray(1));
    const o = ze(t, 0, ut), s = ze(t, ut, Ie);
    return new cr(o, s, r);
  }
  addRecoveryBit(t) {
    return new cr(this.r, this.s, t);
  }
  hasHighS() {
    return Rc(this.s);
  }
  toBytes(t = je) {
    const { r: n, s: r, recovery: o } = this, s = jt(At(n), At(r));
    return t === ar ? (kf(o), jt(Uint8Array.of(o), s)) : s;
  }
}
const $c = (e) => {
  const t = e.length * 8 - 256;
  t > 1024 && G("msg invalid");
  const n = ye(e);
  return t > 0 ? n >> wn(t) : n;
}, Bf = (e) => Jt($c(Tt(e))), je = "compact", ar = "recovered", Cc = "der", qs = [je, ar, Cc], Ys = {
  lowS: !0,
  prehash: !0,
  format: je,
  extraEntropy: !1
}, Zs = "SHA-256", Zo = {
  hmacSha256Async: async (e, t) => {
    const n = zs(), r = "HMAC", o = await n.importKey("raw", e, { name: r, hash: { name: Zs } }, !1, ["sign"]);
    return ge(await n.sign(r, o, t));
  },
  hmacSha256: void 0,
  sha256Async: async (e) => ge(await zs().digest(Zs, e)),
  sha256: void 0
}, Of = (e, t, n) => (Tt(e, void 0, "message"), t.prehash ? n ? Zo.sha256Async(e) : Yo("sha256")(e) : e), Uf = ge(0), Nf = Br(0), Rf = Br(1), $f = 1e3, Cf = "drbg: tried max amount of iterations", Lf = (e, t) => {
  let n = ge(ut), r = ge(ut), o = 0;
  const s = () => {
    n.fill(1), r.fill(0);
  }, i = (...f) => Yo("hmacSha256")(r, jt(n, ...f)), c = (f = Uf) => {
    r = i(Nf, f), n = i(), f.length !== 0 && (r = i(Rf, f), n = i());
  }, a = () => (o++ >= $f && G(Cf), n = i(), n);
  s(), c(e);
  let u;
  for (; !(u = t(a())); )
    c();
  return s(), u;
}, Pf = (e, t, n, r) => {
  let { lowS: o, extraEntropy: s } = n;
  const i = At, c = Bf(e), a = i(c), u = Nc(t), f = [i(u), a];
  if (s != null && s !== !1) {
    const w = s === !0 ? Ir(ut) : s;
    f.push(Tt(w, void 0, "extraEntropy"));
  }
  const l = jt(...f), d = c;
  return r(l, (w) => {
    const p = $c(w);
    if (!(1n <= p && p < pe))
      return;
    const m = Bc(p, pe), x = we.multiply(p).toAffine(), E = Jt(x.x);
    if (E === 0n)
      return;
    const v = Jt(m * Jt(d + E * u));
    if (v === 0n)
      return;
    let O = (x.x === E ? 0 : 2) | Number(x.y & 1n), A = v;
    return o && Rc(v) && (A = Jt(-v), O ^= 1), new cr(E, A, O).toBytes(n.format);
  });
}, _f = (e) => {
  const t = {};
  return Object.keys(Ys).forEach((n) => {
    t[n] = e[n] ?? Ys[n];
  }), t;
}, Vf = (e, t, n = {}) => (n = _f(n), e = Of(e, n, !1), Pf(e, t, n, Lf)), Df = (e = Ir(ir.seed)) => {
  Tt(e), (e.length < ir.seed || e.length > 1024) && G("expected 40-1024b");
  const t = I(ye(e), pe - 1n);
  return At(t + 1n);
}, Hf = (e) => (t) => {
  const n = Df(t);
  return { secretKey: n, publicKey: e(n) };
}, Lc = (e) => Uint8Array.from("BIP0340/" + e, (t) => t.charCodeAt(0)), Pc = "aux", _c = "nonce", Vc = "challenge", lo = (e, ...t) => {
  const n = Yo("sha256"), r = n(Lc(e));
  return n(jt(r, r, ...t));
}, ho = async (e, ...t) => {
  const n = Zo.sha256Async, r = await n(Lc(e));
  return await n(jt(r, r, ...t));
}, Xo = (e) => {
  const t = Nc(e), n = we.multiply(t), { x: r, y: o } = n.assertValidity().toAffine(), s = Ge(o) ? t : Jt(-t), i = At(r);
  return { d: s, px: i };
}, Qo = (e) => Jt(ye(e)), Dc = (...e) => Qo(lo(Vc, ...e)), Hc = async (...e) => Qo(await ho(Vc, ...e)), Mc = (e) => Xo(e).px, Mf = Hf(Mc), Kc = (e, t, n) => {
  const { px: r, d: o } = Xo(t);
  return { m: Tt(e), px: r, d: o, a: Tt(n, ut) };
}, Fc = (e) => {
  const t = Qo(e);
  t === 0n && G("sign failed: k is zero");
  const { px: n, d: r } = Xo(At(t));
  return { rx: n, k: r };
}, Wc = (e, t, n, r) => jt(t, At(Jt(e + n * r))), Gc = "invalid signature produced", Kf = (e, t, n = Ir(ut)) => {
  const { m: r, px: o, d: s, a: i } = Kc(e, t, n), c = lo(Pc, i), a = At(s ^ ye(c)), u = lo(_c, a, o, r), { rx: f, k: l } = Fc(u), d = Dc(f, o, r), h = Wc(l, f, d, s);
  return jc(h, r, o) || G(Gc), h;
}, Ff = async (e, t, n = Ir(ut)) => {
  const { m: r, px: o, d: s, a: i } = Kc(e, t, n), c = await ho(Pc, i), a = At(s ^ ye(c)), u = await ho(_c, a, o, r), { rx: f, k: l } = Fc(u), d = await Hc(f, o, r), h = Wc(l, f, d, s);
  return await qc(h, r, o) || G(Gc), h;
}, Wf = (e, t) => e instanceof Promise ? e.then(t) : t(e), zc = (e, t, n, r) => {
  const o = Tt(e, Ie, "signature"), s = Tt(t, void 0, "message"), i = Tt(n, ut, "publicKey");
  try {
    const c = ye(i), a = Uc(c), u = Ge(a) ? a : I(-a), f = new wt(c, u, 1n).assertValidity(), l = At(f.toAffine().x), d = ze(o, 0, ut);
    Be(d, 1n, ue);
    const h = ze(o, ut, Ie);
    Be(h, 1n, pe);
    const w = jt(At(d), l, s);
    return Wf(r(w), (p) => {
      const { x: m, y: x } = Tf(f, h, Jt(-p)).toAffine();
      return !(!Ge(x) || m !== d);
    });
  } catch {
    return !1;
  }
}, jc = (e, t, n) => zc(e, t, n, Dc), qc = async (e, t, n) => zc(e, t, n, Hc), Gf = {
  keygen: Mf,
  getPublicKey: Mc,
  sign: Kf,
  verify: jc,
  signAsync: Ff,
  verifyAsync: qc
}, ur = 8, zf = 256, Yc = Math.ceil(zf / ur) + 1, po = 2 ** (ur - 1), jf = () => {
  const e = [];
  let t = we, n = t;
  for (let r = 0; r < Yc; r++) {
    n = t, e.push(n);
    for (let o = 1; o < po; o++)
      n = n.add(t), e.push(n);
    t = n.double();
  }
  return e;
};
let Xs;
const Qs = (e, t) => {
  const n = t.negate();
  return e ? n : t;
}, qf = (e) => {
  const t = Xs || (Xs = jf());
  let n = Ee, r = we;
  const o = 2 ** ur, s = o, i = wn(o - 1), c = wn(ur);
  for (let a = 0; a < Yc; a++) {
    let u = Number(e & i);
    e >>= c, u > po && (u -= s, e += 1n);
    const f = a * po, l = f, d = f + Math.abs(u) - 1, h = a % 2 !== 0, w = u < 0;
    u === 0 ? r = r.add(Qs(h, t[l])) : n = n.add(Qs(w, t[d]));
  }
  return e !== 0n && G("invalid wnaf"), { p: n, f: r };
};
function Jo(e, t, n = {}) {
  e = ao(e);
  const { aggPublicKey: r } = uo(e);
  if (!n.taprootTweak)
    return {
      preTweakedKey: r.toBytes(!0),
      finalKey: r.toBytes(!0)
    };
  const o = Nt.utils.taggedHash("TapTweak", r.toBytes(!0).subarray(1), n.taprootTweak ?? new Uint8Array(0)), { aggPublicKey: s } = uo(e, [o], [!0]);
  return {
    preTweakedKey: r.toBytes(!0),
    finalKey: s.toBytes(!0)
  };
}
class Ln extends Error {
  constructor(t) {
    super(t), this.name = "PartialSignatureError";
  }
}
class ts {
  constructor(t, n) {
    if (this.s = t, this.R = n, t.length !== 32)
      throw new Ln("Invalid s length");
    if (n.length !== 33)
      throw new Ln("Invalid R length");
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
      throw new Ln("Invalid partial signature length");
    if (qt(t) >= wt.CURVE().n)
      throw new Ln("s value overflows curve order");
    const r = new Uint8Array(33);
    return new ts(t, r);
  }
}
function Yf(e, t, n, r, o, s) {
  let i;
  if (s?.taprootTweak !== void 0) {
    const { preTweakedKey: u } = Jo(ao(r));
    i = Nt.utils.taggedHash("TapTweak", u.subarray(1), s.taprootTweak);
  }
  const a = new hf(n, ao(r), o, i ? [i] : void 0, i ? [!0] : void 0).sign(e, t);
  return ts.decode(a);
}
var Mr, Js;
function Zf() {
  if (Js) return Mr;
  Js = 1;
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
  return Mr = { decode: a, encode: u }, Mr;
}
var go = Zf(), vt;
(function(e) {
  e.VtxoTaprootTree = "taptree", e.VtxoTreeExpiry = "expiry", e.Cosigner = "cosigner", e.ConditionWitness = "condition";
})(vt || (vt = {}));
const es = 222;
function Xf(e, t, n, r) {
  e.updateInput(t, {
    unknown: [
      ...e.getInput(t)?.unknown ?? [],
      n.encode(r)
    ]
  });
}
function wo(e, t, n) {
  const r = e.getInput(t)?.unknown ?? [], o = [];
  for (const s of r) {
    const i = n.decode(s);
    i && o.push(i);
  }
  return o;
}
const Zc = {
  key: vt.VtxoTaprootTree,
  encode: (e) => [
    {
      type: es,
      key: Or[vt.VtxoTaprootTree]
    },
    e
  ],
  decode: (e) => ns(() => rs(e[0], vt.VtxoTaprootTree) ? e[1] : null)
}, Qf = {
  key: vt.ConditionWitness,
  encode: (e) => [
    {
      type: es,
      key: Or[vt.ConditionWitness]
    },
    dn.encode(e)
  ],
  decode: (e) => ns(() => rs(e[0], vt.ConditionWitness) ? dn.decode(e[1]) : null)
}, yo = {
  key: vt.Cosigner,
  encode: (e) => [
    {
      type: es,
      key: new Uint8Array([
        ...Or[vt.Cosigner],
        e.index
      ])
    },
    e.key
  ],
  decode: (e) => ns(() => rs(e[0], vt.Cosigner) ? {
    index: e[0].key[e[0].key.length - 1],
    key: e[1]
  } : null)
};
vt.VtxoTreeExpiry;
const Or = Object.fromEntries(Object.values(vt).map((e) => [
  e,
  new TextEncoder().encode(e)
])), ns = (e) => {
  try {
    return e();
  } catch {
    return null;
  }
};
function rs(e, t) {
  const n = S.encode(Or[t]);
  return S.encode(new Uint8Array([e.type, ...e.key])).includes(n);
}
const Pn = new Error("missing vtxo graph");
class yn {
  constructor(t) {
    this.secretKey = t, this.myNonces = null, this.aggregateNonces = null, this.graph = null, this.scriptRoot = null, this.rootSharedOutputAmount = null;
  }
  static random() {
    const t = Jr();
    return new yn(t);
  }
  async init(t, n, r) {
    this.graph = t, this.scriptRoot = n, this.rootSharedOutputAmount = r;
  }
  async getPublicKey() {
    return Ft.getPublicKey(this.secretKey);
  }
  async getNonces() {
    if (!this.graph)
      throw Pn;
    this.myNonces || (this.myNonces = this.generateNonces());
    const t = /* @__PURE__ */ new Map();
    for (const [n, r] of this.myNonces)
      t.set(n, { pubNonce: r.pubNonce });
    return t;
  }
  async aggregatedNonces(t, n) {
    if (!this.graph)
      throw Pn;
    if (this.aggregateNonces || (this.aggregateNonces = /* @__PURE__ */ new Map()), this.myNonces || await this.getNonces(), this.aggregateNonces.has(t))
      return {
        hasAllNonces: this.aggregateNonces.size === this.myNonces?.size
      };
    const r = this.myNonces.get(t);
    if (!r)
      throw new Error(`missing nonce for txid ${t}`);
    const o = await this.getPublicKey();
    n.set(S.encode(o.subarray(1)), r);
    const s = this.graph.find(t);
    if (!s)
      throw new Error(`missing tx for txid ${t}`);
    const i = wo(s.root, 0, yo).map(
      (u) => S.encode(u.key.subarray(1))
      // xonly pubkey
    ), c = [];
    for (const u of i) {
      const f = n.get(u);
      if (!f)
        throw new Error(`missing nonce for cosigner ${u}`);
      c.push(f.pubNonce);
    }
    const a = gf(c);
    return this.aggregateNonces.set(t, { pubNonce: a }), {
      hasAllNonces: this.aggregateNonces.size === this.myNonces?.size
    };
  }
  async sign() {
    if (!this.graph)
      throw Pn;
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
      throw Pn;
    const t = /* @__PURE__ */ new Map(), n = Ft.getPublicKey(this.secretKey);
    for (const r of this.graph.iterator()) {
      const o = pf(n);
      t.set(r.txid, o);
    }
    return t;
  }
  signPartial(t) {
    if (!this.graph || !this.scriptRoot || !this.rootSharedOutputAmount)
      throw yn.NOT_INITIALIZED;
    if (!this.myNonces || !this.aggregateNonces)
      throw new Error("session not properly initialized");
    const n = this.myNonces.get(t.txid);
    if (!n)
      throw new Error("missing private nonce");
    const r = this.aggregateNonces.get(t.txid);
    if (!r)
      throw new Error("missing aggregate nonce");
    const o = [], s = [], i = wo(t.root, 0, yo).map((u) => u.key), { finalKey: c } = Jo(i, !0, {
      taprootTweak: this.scriptRoot
    });
    for (let u = 0; u < t.root.inputsLength; u++) {
      const f = Jf(c, this.graph, this.rootSharedOutputAmount, t.root);
      o.push(f.amount), s.push(f.script);
    }
    const a = t.root.preimageWitnessV1(
      0,
      // always first input
      s,
      Ae.DEFAULT,
      o
    );
    return Yf(n.secNonce, this.secretKey, r.pubNonce, i, a, {
      taprootTweak: this.scriptRoot
    });
  }
}
yn.NOT_INITIALIZED = new Error("session not initialized, call init method");
function Jf(e, t, n, r) {
  const o = L.encode(["OP_1", e.slice(1)]);
  if (r.id === t.txid)
    return {
      amount: n,
      script: o
    };
  const s = r.getInput(0);
  if (!s.txid)
    throw new Error("missing parent input txid");
  const i = S.encode(s.txid), c = t.find(i);
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
const ti = Object.values(Ae).filter((e) => typeof e == "number");
class un {
  constructor(t) {
    this.key = t || Jr();
  }
  static fromPrivateKey(t) {
    return new un(t);
  }
  static fromHex(t) {
    return new un(S.decode(t));
  }
  static fromRandomBytes() {
    return new un(Jr());
  }
  /**
   * Export the private key as a hex string.
   *
   * @returns The private key as a hex string
   */
  toHex() {
    return S.encode(this.key);
  }
  async sign(t, n) {
    const r = t.clone();
    if (!n) {
      try {
        if (!r.sign(this.key, ti))
          throw new Error("Failed to sign transaction");
      } catch (o) {
        if (!(o instanceof Error && o.message.includes("No inputs signed"))) throw o;
      }
      return r;
    }
    for (const o of n)
      if (!r.signIdx(this.key, o, ti))
        throw new Error(`Failed to sign input #${o}`);
    return r;
  }
  compressedPublicKey() {
    return Promise.resolve(ic(this.key, !0));
  }
  xOnlyPublicKey() {
    return Promise.resolve(Do(this.key));
  }
  signerSession() {
    return yn.random();
  }
  async signMessage(t, n = "schnorr") {
    return n === "ecdsa" ? Vf(t, this.key, { prehash: !1 }) : Gf.sign(t, this.key);
  }
}
class qe {
  constructor(t, n, r, o = 0) {
    if (this.serverPubKey = t, this.vtxoTaprootKey = n, this.hrp = r, this.version = o, t.length !== 32)
      throw new Error("Invalid server public key length, expected 32 bytes, got " + t.length);
    if (n.length !== 32)
      throw new Error("Invalid vtxo taproot public key length, expected 32 bytes, got " + n.length);
  }
  static decode(t) {
    const n = Ne.decodeUnsafe(t, 1023);
    if (!n)
      throw new Error("Invalid address");
    const r = new Uint8Array(Ne.fromWords(n.words));
    if (r.length !== 65)
      throw new Error("Invalid data length, expected 65 bytes, got " + r.length);
    const o = r[0], s = r.slice(1, 33), i = r.slice(33, 65);
    return new qe(s, i, n.prefix, o);
  }
  encode() {
    const t = new Uint8Array(65);
    t[0] = this.version, t.set(this.serverPubKey, 1), t.set(this.vtxoTaprootKey, 33);
    const n = Ne.toWords(t);
    return Ne.encode(this.hrp, n, 1023);
  }
  // pkScript is the script that should be used to send non-dust funds to the address
  get pkScript() {
    return L.encode(["OP_1", this.vtxoTaprootKey]);
  }
  // subdustPkScript is the script that should be used to send sub-dust funds to the address
  get subdustPkScript() {
    return L.encode(["RETURN", this.vtxoTaprootKey]);
  }
}
const fr = Ko(void 0, !0);
var it;
(function(e) {
  e.Multisig = "multisig", e.CSVMultisig = "csv-multisig", e.ConditionCSVMultisig = "condition-csv-multisig", e.ConditionMultisig = "condition-multisig", e.CLTVMultisig = "cltv-multisig";
})(it || (it = {}));
function Xc(e) {
  const t = [
    Dt,
    kt,
    mn,
    lr,
    xn
  ];
  for (const n of t)
    try {
      return n.decode(e);
    } catch {
      continue;
    }
  throw new Error(`Failed to decode: script ${S.encode(e)} is not a valid tapscript`);
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
        script: ef(c.pubkeys.length, c.pubkeys).script
      };
    const a = [];
    for (let u = 0; u < c.pubkeys.length; u++)
      a.push(c.pubkeys[u]), u < c.pubkeys.length - 1 ? a.push("CHECKSIGVERIFY") : a.push("CHECKSIG");
    return {
      type: it.Multisig,
      params: c,
      script: L.encode(a)
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
    const a = L.decode(c), u = [];
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
    if (S.encode(l.script) !== S.encode(c))
      throw new Error("Invalid script format: script reconstruction mismatch");
    return {
      type: it.Multisig,
      params: { pubkeys: u, type: t.CHECKSIGADD },
      script: c
    };
  }
  function s(c) {
    const a = L.decode(c), u = [];
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
    if (S.encode(f.script) !== S.encode(c))
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
var kt;
(function(e) {
  function t(o) {
    for (const u of o.pubkeys)
      if (u.length !== 32)
        throw new Error(`Invalid pubkey length: expected 32, got ${u.length}`);
    const s = fr.encode(BigInt(go.encode(o.timelock.type === "blocks" ? { blocks: Number(o.timelock.value) } : { seconds: Number(o.timelock.value) }))), i = [
      s.length === 1 ? s[0] : s,
      "CHECKSEQUENCEVERIFY",
      "DROP"
    ], c = Dt.encode(o), a = new Uint8Array([
      ...L.encode(i),
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
    const s = L.decode(o);
    if (s.length < 3)
      throw new Error("Invalid script: too short (expected at least 3)");
    const i = s[0];
    if (typeof i == "string")
      throw new Error("Invalid script: expected sequence number");
    if (s[1] !== "CHECKSEQUENCEVERIFY" || s[2] !== "DROP")
      throw new Error("Invalid script: expected CHECKSEQUENCEVERIFY DROP");
    const c = new Uint8Array(L.encode(s.slice(3)));
    let a;
    try {
      a = Dt.decode(c);
    } catch (h) {
      throw new Error(`Invalid multisig script: ${h instanceof Error ? h.message : String(h)}`);
    }
    let u;
    typeof i == "number" ? u = i : u = Number(fr.decode(i));
    const f = go.decode(u), l = f.blocks !== void 0 ? { type: "blocks", value: BigInt(f.blocks) } : { type: "seconds", value: BigInt(f.seconds) }, d = t({
      timelock: l,
      ...a.params
    });
    if (S.encode(d.script) !== S.encode(o))
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
})(kt || (kt = {}));
var mn;
(function(e) {
  function t(o) {
    const s = new Uint8Array([
      ...o.conditionScript,
      ...L.encode(["VERIFY"]),
      ...kt.encode(o).script
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
    const s = L.decode(o);
    if (s.length < 1)
      throw new Error("Invalid script: too short (expected at least 1)");
    let i = -1;
    for (let l = s.length - 1; l >= 0; l--)
      s[l] === "VERIFY" && (i = l);
    if (i === -1)
      throw new Error("Invalid script: missing VERIFY operation");
    const c = new Uint8Array(L.encode(s.slice(0, i))), a = new Uint8Array(L.encode(s.slice(i + 1)));
    let u;
    try {
      u = kt.decode(a);
    } catch (l) {
      throw new Error(`Invalid CSV multisig script: ${l instanceof Error ? l.message : String(l)}`);
    }
    const f = t({
      conditionScript: c,
      ...u.params
    });
    if (S.encode(f.script) !== S.encode(o))
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
})(mn || (mn = {}));
var lr;
(function(e) {
  function t(o) {
    const s = new Uint8Array([
      ...o.conditionScript,
      ...L.encode(["VERIFY"]),
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
    const s = L.decode(o);
    if (s.length < 1)
      throw new Error("Invalid script: too short (expected at least 1)");
    let i = -1;
    for (let l = s.length - 1; l >= 0; l--)
      s[l] === "VERIFY" && (i = l);
    if (i === -1)
      throw new Error("Invalid script: missing VERIFY operation");
    const c = new Uint8Array(L.encode(s.slice(0, i))), a = new Uint8Array(L.encode(s.slice(i + 1)));
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
    if (S.encode(f.script) !== S.encode(o))
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
})(lr || (lr = {}));
var xn;
(function(e) {
  function t(o) {
    const s = fr.encode(o.absoluteTimelock), i = [
      s.length === 1 ? s[0] : s,
      "CHECKLOCKTIMEVERIFY",
      "DROP"
    ], c = L.encode(i), a = new Uint8Array([
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
    const s = L.decode(o);
    if (s.length < 3)
      throw new Error("Invalid script: too short (expected at least 3)");
    const i = s[0];
    if (typeof i == "string" || typeof i == "number")
      throw new Error("Invalid script: expected locktime number");
    if (s[1] !== "CHECKLOCKTIMEVERIFY" || s[2] !== "DROP")
      throw new Error("Invalid script: expected CHECKLOCKTIMEVERIFY DROP");
    const c = new Uint8Array(L.encode(s.slice(3)));
    let a;
    try {
      a = Dt.decode(c);
    } catch (l) {
      throw new Error(`Invalid multisig script: ${l instanceof Error ? l.message : String(l)}`);
    }
    const u = fr.decode(i), f = t({
      absoluteTimelock: u,
      ...a.params
    });
    if (S.encode(f.script) !== S.encode(o))
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
})(xn || (xn = {}));
const ei = hn.tapTree[2];
function fn(e) {
  return e[1].subarray(0, e[1].length - 1);
}
class Ut {
  static decode(t) {
    const r = ei.decode(t).map((o) => o.script);
    return new Ut(r);
  }
  constructor(t) {
    this.scripts = t;
    const n = t.length % 2 !== 0 ? t.slice().reverse() : t, r = pc(n.map((s) => ({
      script: s,
      leafVersion: pn
    }))), o = tf(Mo, r, void 0, !0);
    if (!o.tapLeafScript || o.tapLeafScript.length !== t.length)
      throw new Error("invalid scripts");
    this.leaves = o.tapLeafScript, this.tweakedPublicKey = o.tweakedPubkey;
  }
  encode() {
    return ei.encode(this.scripts.map((n) => ({
      depth: 1,
      version: pn,
      script: n
    })));
  }
  address(t, n) {
    return new qe(n, this.tweakedPublicKey, t);
  }
  get pkScript() {
    return L.encode(["OP_1", this.tweakedPublicKey]);
  }
  onchainAddress(t) {
    return ke(t).encode({
      type: "tr",
      pubkey: this.tweakedPublicKey
    });
  }
  findLeaf(t) {
    const n = this.leaves.find((r) => S.encode(fn(r)) === t);
    if (!n)
      throw new Error(`leaf '${t}' not found`);
    return n;
  }
  exitPaths() {
    const t = [];
    for (const n of this.leaves)
      try {
        const r = kt.decode(fn(n));
        t.push(r);
        continue;
      } catch {
        try {
          const o = mn.decode(fn(n));
          t.push(o);
        } catch {
          continue;
        }
      }
    return t;
  }
}
var ni;
(function(e) {
  class t extends Ut {
    constructor(o) {
      n(o);
      const { sender: s, receiver: i, server: c, preimageHash: a, refundLocktime: u, unilateralClaimDelay: f, unilateralRefundDelay: l, unilateralRefundWithoutReceiverDelay: d } = o, h = tl(a), w = lr.encode({
        conditionScript: h,
        pubkeys: [i, c]
      }).script, p = Dt.encode({
        pubkeys: [s, i, c]
      }).script, m = xn.encode({
        absoluteTimelock: u,
        pubkeys: [s, c]
      }).script, x = mn.encode({
        conditionScript: h,
        timelock: f,
        pubkeys: [i]
      }).script, E = kt.encode({
        timelock: l,
        pubkeys: [s, i]
      }).script, v = kt.encode({
        timelock: d,
        pubkeys: [s]
      }).script;
      super([
        w,
        p,
        m,
        x,
        E,
        v
      ]), this.options = o, this.claimScript = S.encode(w), this.refundScript = S.encode(p), this.refundWithoutReceiverScript = S.encode(m), this.unilateralClaimScript = S.encode(x), this.unilateralRefundScript = S.encode(E), this.unilateralRefundWithoutReceiverScript = S.encode(v);
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
})(ni || (ni = {}));
function tl(e) {
  return L.encode(["HASH160", e, "EQUAL"]);
}
var dr;
(function(e) {
  class t extends Ut {
    constructor(r) {
      const { pubKey: o, serverPubKey: s, csvTimelock: i = t.DEFAULT_TIMELOCK } = r, c = Dt.encode({
        pubkeys: [o, s]
      }).script, a = kt.encode({
        timelock: i,
        pubkeys: [o]
      }).script;
      super([c, a]), this.options = r, this.forfeitScript = S.encode(c), this.exitScript = S.encode(a);
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
})(dr || (dr = {}));
var En;
(function(e) {
  e.TxSent = "SENT", e.TxReceived = "RECEIVED";
})(En || (En = {}));
function te(e) {
  return !e.isSpent;
}
function mo(e) {
  return e.virtualStatus.state === "swept" && te(e);
}
function Qc(e, t) {
  return e.value < t;
}
function Jc(e, t, n) {
  const r = [];
  let o = [...t];
  for (const i of [...e, ...t]) {
    if (i.virtualStatus.state !== "preconfirmed" && i.virtualStatus.commitmentTxIds && i.virtualStatus.commitmentTxIds.some((h) => n.has(h)))
      continue;
    const c = el(o, i);
    o = ri(o, c);
    const a = _n(c);
    if (i.value <= a)
      continue;
    const u = nl(o, i);
    o = ri(o, u);
    const f = _n(u);
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
      type: En.TxReceived,
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
    const a = rl([...e, ...t], i), u = _n(a), f = _n(c);
    if (f <= u)
      continue;
    const l = ol(a, c), d = {
      commitmentTxid: l.virtualStatus.commitmentTxIds?.[0] || "",
      boardingTxid: "",
      arkTxid: ""
    };
    l.virtualStatus.state === "preconfirmed" && (d.arkTxid = l.txid), r.push({
      key: d,
      amount: f - u,
      type: En.TxSent,
      createdAt: l.createdAt.getTime(),
      settled: !0
    });
  }
  return r;
}
function el(e, t) {
  return t.virtualStatus.state === "preconfirmed" ? [] : e.filter((n) => n.settledBy ? t.virtualStatus.commitmentTxIds?.includes(n.settledBy) ?? !1 : !1);
}
function nl(e, t) {
  return e.filter((n) => n.arkTxId ? n.arkTxId === t.txid : !1);
}
function rl(e, t) {
  return e.filter((n) => n.virtualStatus.state !== "preconfirmed" && n.virtualStatus.commitmentTxIds?.includes(t) ? !0 : n.txid === t);
}
function _n(e) {
  return e.reduce((t, n) => t + n.value, 0);
}
function ol(e, t) {
  return e.length === 0 ? t[0] : e[0];
}
function ri(e, t) {
  return e.filter((n) => {
    for (const r of t)
      if (n.txid === r.txid && n.vout === r.vout)
        return !1;
    return !0;
  });
}
const sl = (e) => il[e], il = {
  bitcoin: rn(We, "ark"),
  testnet: rn(Rn, "tark"),
  signet: rn(Rn, "tark"),
  mutinynet: rn(Rn, "tark"),
  regtest: rn({
    ...Rn,
    bech32: "bcrt",
    pubKeyHash: 111,
    scriptHash: 196
  }, "tark")
};
function rn(e, t) {
  return {
    ...e,
    hrp: t
  };
}
const cl = {
  bitcoin: "https://mempool.space/api",
  testnet: "https://mempool.space/testnet/api",
  signet: "https://mempool.space/signet/api",
  mutinynet: "https://mutinynet.com/api",
  regtest: "http://localhost:3000"
};
class al {
  constructor(t, n) {
    this.baseUrl = t, this.pollingInterval = n?.pollingInterval ?? 15e3, this.forcePolling = n?.forcePolling ?? !1;
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
      const a = async () => (await Promise.all(t.map((h) => this.getTransactions(h)))).flat(), u = await a(), f = (d) => `${d.txid}_${d.status.block_time}`, l = new Set(u.map(f));
      r = setInterval(async () => {
        try {
          const h = (await a()).filter((w) => !l.has(f(w)));
          h.length > 0 && (h.forEach((w) => l.add(f(w))), n(h));
        } catch (d) {
          console.error("Error in polling mechanism:", d);
        }
      }, this.pollingInterval);
    };
    let i = null;
    const c = () => {
      i && i.close(), r && clearInterval(r);
    };
    if (this.forcePolling)
      return await s(), c;
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
              l[d][h] && u.push(...l[d][h].filter(fl));
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
    return c;
  }
  async getChainTip() {
    const t = await fetch(`${this.baseUrl}/blocks/tip`);
    if (!t.ok)
      throw new Error(`Failed to get chain tip: ${t.statusText}`);
    const n = await t.json();
    if (!ul(n))
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
function ul(e) {
  return Array.isArray(e) && e.every((t) => {
    t && typeof t == "object" && typeof t.id == "string" && t.id.length > 0 && typeof t.height == "number" && t.height >= 0 && typeof t.mediantime == "number" && t.mediantime > 0;
  });
}
const fl = (e) => typeof e.txid == "string" && Array.isArray(e.vout) && e.vout.every((t) => typeof t.scriptpubkey_address == "string" && typeof t.value == "number") && typeof e.status == "object" && typeof e.status.confirmed == "boolean";
async function* xo(e) {
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
class ll extends Error {
  constructor(t, n, r, o) {
    super(n), this.code = t, this.message = n, this.name = r, this.metadata = o;
  }
}
function dl(e) {
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
      return "metadata" in n && hl(n.metadata) && (c = n.metadata), new ll(o, s, i, c);
    }
    return;
  } catch {
    return;
  }
}
function hl(e) {
  return typeof e == "object" && e !== null && !Array.isArray(e);
}
var z;
(function(e) {
  e.BatchStarted = "batch_started", e.BatchFinalization = "batch_finalization", e.BatchFinalized = "batch_finalized", e.BatchFailed = "batch_failed", e.TreeSigningStarted = "tree_signing_started", e.TreeNonces = "tree_nonces", e.TreeTx = "tree_tx", e.TreeSignature = "tree_signature";
})(z || (z = {}));
class ta {
  constructor(t) {
    this.serverUrl = t;
  }
  async getInfo() {
    const t = `${this.serverUrl}/v1/info`, n = await fetch(t);
    if (!n.ok) {
      const o = await n.text();
      Kt(o, `Failed to get server info: ${n.statusText}`);
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
      Kt(i, `Failed to submit virtual transaction: ${i}`);
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
      Kt(s, `Failed to finalize offchain transaction: ${s}`);
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
      Kt(s, `Failed to register intent: ${s}`);
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
      Kt(o, `Failed to delete intent: ${o}`);
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
      Kt(o, `Failed to confirm registration: ${o}`);
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
        treeNonces: pl(r)
      })
    });
    if (!s.ok) {
      const i = await s.text();
      Kt(i, `Failed to submit tree nonces: ${i}`);
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
        treeSignatures: gl(r)
      })
    });
    if (!s.ok) {
      const i = await s.text();
      Kt(i, `Failed to submit tree signatures: ${i}`);
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
      Kt(s, `Failed to submit forfeit transactions: ${o.statusText}`);
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
          for await (const c of xo(s)) {
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
        if (Eo(s)) {
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
          for await (const s of xo(r)) {
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
        if (Eo(r)) {
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
      Kt(s, `Failed to get pending transactions: ${s}`);
    }
    return (await r.json()).pendingTxs;
  }
  parseSettlementEvent(t) {
    if (t.batchStarted)
      return {
        type: z.BatchStarted,
        id: t.batchStarted.id,
        intentIdHashes: t.batchStarted.intentIdHashes,
        batchExpiry: BigInt(t.batchStarted.batchExpiry)
      };
    if (t.batchFinalization)
      return {
        type: z.BatchFinalization,
        id: t.batchFinalization.id,
        commitmentTx: t.batchFinalization.commitmentTx
      };
    if (t.batchFinalized)
      return {
        type: z.BatchFinalized,
        id: t.batchFinalized.id,
        commitmentTxid: t.batchFinalized.commitmentTxid
      };
    if (t.batchFailed)
      return {
        type: z.BatchFailed,
        id: t.batchFailed.id,
        reason: t.batchFailed.reason
      };
    if (t.treeSigningStarted)
      return {
        type: z.TreeSigningStarted,
        id: t.treeSigningStarted.id,
        cosignersPublicKeys: t.treeSigningStarted.cosignersPubkeys,
        unsignedCommitmentTx: t.treeSigningStarted.unsignedCommitmentTx
      };
    if (t.treeNoncesAggregated)
      return null;
    if (t.treeNonces)
      return {
        type: z.TreeNonces,
        id: t.treeNonces.id,
        topic: t.treeNonces.topic,
        txid: t.treeNonces.txid,
        nonces: wl(t.treeNonces.nonces)
        // pubkey -> public nonce
      };
    if (t.treeTx) {
      const n = Object.fromEntries(Object.entries(t.treeTx.children).map(([r, o]) => [parseInt(r), o]));
      return {
        type: z.TreeTx,
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
      type: z.TreeSignature,
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
        spentVtxos: t.commitmentTx.spentVtxos.map(Vn),
        spendableVtxos: t.commitmentTx.spendableVtxos.map(Vn),
        checkpointTxs: t.commitmentTx.checkpointTxs
      }
    } : t.arkTx ? {
      arkTx: {
        txid: t.arkTx.txid,
        tx: t.arkTx.tx,
        spentVtxos: t.arkTx.spentVtxos.map(Vn),
        spendableVtxos: t.arkTx.spendableVtxos.map(Vn),
        checkpointTxs: t.arkTx.checkpointTxs
      }
    } : (t.heartbeat || console.warn("Unknown transaction notification type:", t), null);
  }
}
function pl(e) {
  const t = {};
  for (const [n, r] of e)
    t[n] = S.encode(r.pubNonce);
  return t;
}
function gl(e) {
  const t = {};
  for (const [n, r] of e)
    t[n] = S.encode(r.encode());
  return t;
}
function wl(e) {
  return new Map(Object.entries(e).map(([t, n]) => {
    if (typeof n != "string")
      throw new Error("invalid nonce");
    return [t, { pubNonce: S.decode(n) }];
  }));
}
function Eo(e) {
  const t = (n) => n instanceof Error ? n.name === "TypeError" && n.message === "Failed to fetch" || n.name === "HeadersTimeoutError" || n.name === "BodyTimeoutError" || n.code === "UND_ERR_HEADERS_TIMEOUT" || n.code === "UND_ERR_BODY_TIMEOUT" : !1;
  return t(e) || t(e.cause);
}
function Vn(e) {
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
function Kt(e, t) {
  const n = new Error(e);
  throw dl(n) ?? new Error(t);
}
const yl = 0n, ml = new Uint8Array([81, 2, 78, 115]), os = {
  script: ml,
  amount: yl
};
S.encode(os.script);
function xl(e, t, n) {
  const r = new he({
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
  }), r.addOutput(os), r;
}
const El = new Error("invalid settlement transaction outputs"), bl = new Error("empty tree"), Sl = new Error("invalid number of inputs"), Kr = new Error("wrong settlement txid"), Tl = new Error("invalid amount"), vl = new Error("no leaves"), kl = new Error("invalid taproot script"), oi = new Error("invalid round transaction outputs"), Al = new Error("wrong commitment txid"), Il = new Error("missing cosigners public keys"), Fr = 0, si = 1;
function Bl(e, t) {
  if (t.validate(), t.root.inputsLength !== 1)
    throw Sl;
  const n = t.root.getInput(0), r = ee.fromPSBT(bt.decode(e));
  if (r.outputsLength <= si)
    throw El;
  const o = r.id;
  if (!n.txid || S.encode(n.txid) !== o || n.index !== si)
    throw Kr;
}
function Ol(e, t, n) {
  if (t.outputsLength < Fr + 1)
    throw oi;
  const r = t.getOutput(Fr)?.amount;
  if (!r)
    throw oi;
  if (!e.root)
    throw bl;
  const o = e.root.getInput(0), s = t.id;
  if (!o.txid || S.encode(o.txid) !== s || o.index !== Fr)
    throw Al;
  let i = 0n;
  for (let a = 0; a < e.root.outputsLength; a++) {
    const u = e.root.getOutput(a);
    u?.amount && (i += u.amount);
  }
  if (i !== r)
    throw Tl;
  if (e.leaves().length === 0)
    throw vl;
  e.validate();
  for (const a of e.iterator())
    for (const [u, f] of a.children) {
      const l = a.root.getOutput(u);
      if (!l?.script)
        throw new Error(`parent output ${u} not found`);
      const d = l.script.slice(2);
      if (d.length !== 32)
        throw new Error(`parent output ${u} has invalid script`);
      const h = wo(f.root, 0, yo);
      if (h.length === 0)
        throw Il;
      const w = h.map((m) => m.key), { finalKey: p } = Jo(w, !0, {
        taprootTweak: n
      });
      if (!p || S.encode(p.slice(1)) !== S.encode(d))
        throw kl;
    }
}
function Ul(e, t, n) {
  const r = e.map((s) => Nl(s, n));
  return {
    arkTx: ea(r.map((s) => s.input), t),
    checkpoints: r.map((s) => s.tx)
  };
}
function ea(e, t) {
  let n = 0n;
  for (const o of e) {
    const s = Xc(fn(o.tapLeafScript));
    if (xn.is(s)) {
      if (n !== 0n && ii(n) !== ii(s.params.absoluteTimelock))
        throw new Error("cannot mix seconds and blocks locktime");
      s.params.absoluteTimelock > n && (n = s.params.absoluteTimelock);
    }
  }
  const r = new he({
    version: 3,
    lockTime: Number(n)
  });
  for (const [o, s] of e.entries())
    r.addInput({
      txid: s.txid,
      index: s.vout,
      sequence: n ? jo - 1 : void 0,
      witnessUtxo: {
        script: Ut.decode(s.tapTree).pkScript,
        amount: BigInt(s.value)
      },
      tapLeafScript: [s.tapLeafScript]
    }), Xf(r, o, Zc, s.tapTree);
  for (const o of t)
    r.addOutput(o);
  return r.addOutput(os), r;
}
function Nl(e, t) {
  const n = Xc(fn(e.tapLeafScript)), r = new Ut([
    t.script,
    n.script
  ]), o = ea([e], [
    {
      amount: BigInt(e.value),
      script: r.pkScript
    }
  ]), s = r.findLeaf(S.encode(n.script)), i = {
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
const Rl = 500000000n;
function ii(e) {
  return e >= Rl;
}
function $l(e, t) {
  if (!e.status.block_time)
    return !1;
  if (t.value === 0n)
    return !0;
  if (t.type === "blocks")
    return !1;
  const n = BigInt(Math.floor(Date.now() / 1e3));
  return BigInt(Math.floor(e.status.block_time)) + t.value <= n;
}
const Cl = {
  thresholdPercentage: 10
};
class ot {
  constructor(t, n, r = ot.DefaultHRP) {
    this.preimage = t, this.value = n, this.HRP = r, this.vout = 0;
    const o = ht(this.preimage);
    this.vtxoScript = new Ut([_l(o)]);
    const s = this.vtxoScript.leaves[0];
    this.txid = S.encode(new Uint8Array(o).reverse()), this.tapTree = this.vtxoScript.encode(), this.forfeitTapLeafScript = s, this.intentTapLeafScript = s, this.value = n, this.status = { confirmed: !0 }, this.extraWitness = [this.preimage];
  }
  encode() {
    const t = new Uint8Array(ot.Length);
    return t.set(this.preimage, 0), Ll(t, this.value, this.preimage.length), t;
  }
  static decode(t, n = ot.DefaultHRP) {
    if (t.length !== ot.Length)
      throw new Error(`invalid data length: expected ${ot.Length} bytes, got ${t.length}`);
    const r = t.subarray(0, ot.PreimageLength), o = Pl(t, ot.PreimageLength);
    return new ot(r, o, n);
  }
  static fromString(t, n = ot.DefaultHRP) {
    if (t = t.trim(), !t.startsWith(n))
      throw new Error(`invalid human-readable part: expected ${n} prefix (note '${t}')`);
    const r = t.slice(n.length), o = Yr.decode(r);
    if (o.length === 0)
      throw new Error("failed to decode base58 string");
    return ot.decode(o, n);
  }
  toString() {
    return this.HRP + Yr.encode(this.encode());
  }
}
ot.DefaultHRP = "arknote";
ot.PreimageLength = 32;
ot.ValueLength = 4;
ot.Length = ot.PreimageLength + ot.ValueLength;
ot.FakeOutpointIndex = 0;
function Ll(e, t, n) {
  new DataView(e.buffer, e.byteOffset + n, 4).setUint32(0, t, !1);
}
function Pl(e, t) {
  return new DataView(e.buffer, e.byteOffset + t, 4).getUint32(0, !1);
}
function _l(e) {
  return L.encode(["SHA256", e, "EQUAL"]);
}
var hr;
(function(e) {
  function t(n, r, o = []) {
    if (r.length == 0)
      throw new Error("intent proof requires at least one input");
    Fl(r), Gl(o);
    const s = zl(n, r[0].witnessUtxo.script);
    return jl(s, r, o);
  }
  e.create = t;
})(hr || (hr = {}));
const Vl = new Uint8Array([ct.RETURN]), Dl = new Uint8Array(32).fill(0), Hl = 4294967295, Ml = "ark-intent-proof-message";
function Kl(e) {
  if (e.index === void 0)
    throw new Error("intent proof input requires index");
  if (e.txid === void 0)
    throw new Error("intent proof input requires txid");
  if (e.witnessUtxo === void 0)
    throw new Error("intent proof input requires witness utxo");
  return !0;
}
function Fl(e) {
  return e.forEach(Kl), !0;
}
function Wl(e) {
  if (e.amount === void 0)
    throw new Error("intent proof output requires amount");
  if (e.script === void 0)
    throw new Error("intent proof output requires script");
  return !0;
}
function Gl(e) {
  return e.forEach(Wl), !0;
}
function zl(e, t) {
  const n = ql(e), r = new he({
    version: 0
  });
  return r.addInput({
    txid: Dl,
    // zero hash
    index: Hl,
    sequence: 0
  }), r.addOutput({
    amount: 0n,
    script: t
  }), r.updateInput(0, {
    finalScriptSig: L.encode(["OP_0", n])
  }), r;
}
function jl(e, t, n) {
  const r = t[0], o = new he({
    version: 2,
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
    sighashType: Ae.ALL
  });
  for (const [s, i] of t.entries())
    o.addInput({
      ...i,
      sighashType: Ae.ALL
    }), i.unknown?.length && o.updateInput(s + 1, {
      unknown: i.unknown
    });
  n.length === 0 && (n = [
    {
      amount: 0n,
      script: Vl
    }
  ]);
  for (const s of n)
    o.addOutput({
      amount: s.amount,
      script: s.script
    });
  return o;
}
function ql(e) {
  return Nt.utils.taggedHash(Ml, new TextEncoder().encode(e));
}
var bo;
(function(e) {
  e[e.INDEXER_TX_TYPE_UNSPECIFIED = 0] = "INDEXER_TX_TYPE_UNSPECIFIED", e[e.INDEXER_TX_TYPE_RECEIVED = 1] = "INDEXER_TX_TYPE_RECEIVED", e[e.INDEXER_TX_TYPE_SENT = 2] = "INDEXER_TX_TYPE_SENT";
})(bo || (bo = {}));
var _e;
(function(e) {
  e.UNSPECIFIED = "INDEXER_CHAINED_TX_TYPE_UNSPECIFIED", e.COMMITMENT = "INDEXER_CHAINED_TX_TYPE_COMMITMENT", e.ARK = "INDEXER_CHAINED_TX_TYPE_ARK", e.TREE = "INDEXER_CHAINED_TX_TYPE_TREE", e.CHECKPOINT = "INDEXER_CHAINED_TX_TYPE_CHECKPOINT";
})(_e || (_e = {}));
class na {
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
    if (!Rt.isVtxoTreeResponse(i))
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
    if (!Rt.isVtxoTreeLeavesResponse(i))
      throw new Error("Invalid vtxos tree leaves data received");
    return i;
  }
  async getBatchSweepTransactions(t) {
    const n = `${this.serverUrl}/v1/indexer/batch/${t.txid}/${t.vout}/sweepTxs`, r = await fetch(n);
    if (!r.ok)
      throw new Error(`Failed to fetch batch sweep transactions: ${r.statusText}`);
    const o = await r.json();
    if (!Rt.isBatchSweepTransactionsResponse(o))
      throw new Error("Invalid batch sweep transactions data received");
    return o;
  }
  async getCommitmentTx(t) {
    const n = `${this.serverUrl}/v1/indexer/commitmentTx/${t}`, r = await fetch(n);
    if (!r.ok)
      throw new Error(`Failed to fetch commitment tx: ${r.statusText}`);
    const o = await r.json();
    if (!Rt.isCommitmentTx(o))
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
    if (!Rt.isConnectorsResponse(i))
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
    if (!Rt.isForfeitTxsResponse(i))
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
          for await (const i of xo(o)) {
            if (n?.aborted)
              break;
            try {
              const c = JSON.parse(i.data);
              c.event && (yield {
                txid: c.event.txid,
                scripts: c.event.scripts || [],
                newVtxos: (c.event.newVtxos || []).map(Dn),
                spentVtxos: (c.event.spentVtxos || []).map(Dn),
                sweptVtxos: (c.event.sweptVtxos || []).map(Dn),
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
        if (Eo(o)) {
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
    if (!Rt.isVirtualTxsResponse(i))
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
    if (!Rt.isVtxoChainResponse(i))
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
    if (!Rt.isVtxosResponse(s))
      throw new Error("Invalid vtxos data received");
    return {
      vtxos: s.vtxos.map(Dn),
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
function Dn(e) {
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
var Rt;
(function(e) {
  function t(y) {
    return typeof y == "object" && typeof y.totalOutputAmount == "string" && typeof y.totalOutputVtxos == "number" && typeof y.expiresAt == "string" && typeof y.swept == "boolean";
  }
  function n(y) {
    return typeof y == "object" && typeof y.txid == "string" && typeof y.expiresAt == "string" && Object.values(_e).includes(y.type) && Array.isArray(y.spends) && y.spends.every((tt) => typeof tt == "string");
  }
  function r(y) {
    return typeof y == "object" && typeof y.startedAt == "string" && typeof y.endedAt == "string" && typeof y.totalInputAmount == "string" && typeof y.totalInputVtxos == "number" && typeof y.totalOutputAmount == "string" && typeof y.totalOutputVtxos == "number" && typeof y.batches == "object" && Object.values(y.batches).every(t);
  }
  e.isCommitmentTx = r;
  function o(y) {
    return typeof y == "object" && typeof y.txid == "string" && typeof y.vout == "number";
  }
  e.isOutpoint = o;
  function s(y) {
    return Array.isArray(y) && y.every(o);
  }
  e.isOutpointArray = s;
  function i(y) {
    return typeof y == "object" && typeof y.txid == "string" && typeof y.children == "object" && Object.values(y.children).every(f) && Object.keys(y.children).every((tt) => Number.isInteger(Number(tt)));
  }
  function c(y) {
    return Array.isArray(y) && y.every(i);
  }
  e.isTxsArray = c;
  function a(y) {
    return typeof y == "object" && typeof y.amount == "string" && typeof y.createdAt == "string" && typeof y.isSettled == "boolean" && typeof y.settledBy == "string" && Object.values(bo).includes(y.type) && (!y.commitmentTxid && typeof y.virtualTxid == "string" || typeof y.commitmentTxid == "string" && !y.virtualTxid);
  }
  function u(y) {
    return Array.isArray(y) && y.every(a);
  }
  e.isTxHistoryRecordArray = u;
  function f(y) {
    return typeof y == "string" && y.length === 64;
  }
  function l(y) {
    return Array.isArray(y) && y.every(f);
  }
  e.isTxidArray = l;
  function d(y) {
    return typeof y == "object" && o(y.outpoint) && typeof y.createdAt == "string" && (y.expiresAt === null || typeof y.expiresAt == "string") && typeof y.amount == "string" && typeof y.script == "string" && typeof y.isPreconfirmed == "boolean" && typeof y.isSwept == "boolean" && typeof y.isUnrolled == "boolean" && typeof y.isSpent == "boolean" && (!y.spentBy || typeof y.spentBy == "string") && (!y.settledBy || typeof y.settledBy == "string") && (!y.arkTxid || typeof y.arkTxid == "string") && Array.isArray(y.commitmentTxids) && y.commitmentTxids.every(f);
  }
  function h(y) {
    return typeof y == "object" && typeof y.current == "number" && typeof y.next == "number" && typeof y.total == "number";
  }
  function w(y) {
    return typeof y == "object" && Array.isArray(y.vtxoTree) && y.vtxoTree.every(i) && (!y.page || h(y.page));
  }
  e.isVtxoTreeResponse = w;
  function p(y) {
    return typeof y == "object" && Array.isArray(y.leaves) && y.leaves.every(o) && (!y.page || h(y.page));
  }
  e.isVtxoTreeLeavesResponse = p;
  function m(y) {
    return typeof y == "object" && Array.isArray(y.connectors) && y.connectors.every(i) && (!y.page || h(y.page));
  }
  e.isConnectorsResponse = m;
  function x(y) {
    return typeof y == "object" && Array.isArray(y.txids) && y.txids.every(f) && (!y.page || h(y.page));
  }
  e.isForfeitTxsResponse = x;
  function E(y) {
    return typeof y == "object" && Array.isArray(y.sweptBy) && y.sweptBy.every(f);
  }
  e.isSweptCommitmentTxResponse = E;
  function v(y) {
    return typeof y == "object" && Array.isArray(y.sweptBy) && y.sweptBy.every(f);
  }
  e.isBatchSweepTransactionsResponse = v;
  function O(y) {
    return typeof y == "object" && Array.isArray(y.txs) && y.txs.every((tt) => typeof tt == "string") && (!y.page || h(y.page));
  }
  e.isVirtualTxsResponse = O;
  function A(y) {
    return typeof y == "object" && Array.isArray(y.chain) && y.chain.every(n) && (!y.page || h(y.page));
  }
  e.isVtxoChainResponse = A;
  function F(y) {
    return typeof y == "object" && Array.isArray(y.vtxos) && y.vtxos.every(d) && (!y.page || h(y.page));
  }
  e.isVtxosResponse = F;
})(Rt || (Rt = {}));
class So {
  constructor(t, n = /* @__PURE__ */ new Map()) {
    this.root = t, this.children = n;
  }
  static create(t) {
    if (t.length === 0)
      throw new Error("empty chunks");
    const n = /* @__PURE__ */ new Map();
    for (const s of t) {
      const i = Zl(s), c = i.tx.id;
      n.set(c, i);
    }
    const r = [];
    for (const [s] of n) {
      let i = !1;
      for (const [c, a] of n)
        if (c !== s && (i = Yl(a, s), i))
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
    const o = ra(r[0], n);
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
      if (!s.txid || S.encode(s.txid) !== i || s.index !== r)
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
function Yl(e, t) {
  return Object.values(e.children).includes(t);
}
function ra(e, t) {
  const n = t.get(e);
  if (!n)
    return null;
  const r = n.tx, o = /* @__PURE__ */ new Map();
  for (const [s, i] of Object.entries(n.children)) {
    const c = parseInt(s), a = ra(i, t);
    a && o.set(c, a);
  }
  return new So(r, o);
}
function Zl(e) {
  return { tx: ee.fromPSBT(bt.decode(e.tx)), children: e.children };
}
class Xl {
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
const pr = (e) => e ? S.encode(e) : void 0, Ye = (e) => e ? S.decode(e) : void 0, gr = ([e, t]) => ({
  cb: S.encode(Wt.encode(e)),
  s: S.encode(t)
}), ci = (e) => ({
  ...e,
  tapTree: pr(e.tapTree),
  forfeitTapLeafScript: gr(e.forfeitTapLeafScript),
  intentTapLeafScript: gr(e.intentTapLeafScript),
  extraWitness: e.extraWitness?.map(pr)
}), ai = (e) => ({
  ...e,
  tapTree: pr(e.tapTree),
  forfeitTapLeafScript: gr(e.forfeitTapLeafScript),
  intentTapLeafScript: gr(e.intentTapLeafScript),
  extraWitness: e.extraWitness?.map(pr)
}), wr = (e) => {
  const t = Wt.decode(Ye(e.cb)), n = Ye(e.s);
  return [t, n];
}, Ql = (e) => ({
  ...e,
  createdAt: new Date(e.createdAt),
  tapTree: Ye(e.tapTree),
  forfeitTapLeafScript: wr(e.forfeitTapLeafScript),
  intentTapLeafScript: wr(e.intentTapLeafScript),
  extraWitness: e.extraWitness?.map(Ye)
}), Jl = (e) => ({
  ...e,
  tapTree: Ye(e.tapTree),
  forfeitTapLeafScript: wr(e.forfeitTapLeafScript),
  intentTapLeafScript: wr(e.intentTapLeafScript),
  extraWitness: e.extraWitness?.map(Ye)
});
class To {
  constructor(t) {
    this.storage = t, this.cache = {
      vtxos: /* @__PURE__ */ new Map(),
      utxos: /* @__PURE__ */ new Map(),
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
      const s = JSON.parse(r).map(Ql);
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
    this.cache.vtxos.set(t, r.slice()), await this.storage.setItem(`vtxos:${t}`, JSON.stringify(r.map(ci)));
  }
  async removeVtxo(t, n) {
    const r = await this.getVtxos(t), [o, s] = n.split(":"), i = r.filter((c) => !(c.txid === o && c.vout === parseInt(s, 10)));
    this.cache.vtxos.set(t, i.slice()), await this.storage.setItem(`vtxos:${t}`, JSON.stringify(i.map(ci)));
  }
  async clearVtxos(t) {
    this.cache.vtxos.set(t, []), await this.storage.removeItem(`vtxos:${t}`);
  }
  async getUtxos(t) {
    const n = `utxos:${t}`;
    if (this.cache.utxos.has(t))
      return this.cache.utxos.get(t);
    const r = await this.storage.getItem(n);
    if (!r)
      return this.cache.utxos.set(t, []), [];
    try {
      const s = JSON.parse(r).map(Jl);
      return this.cache.utxos.set(t, s.slice()), s.slice();
    } catch (o) {
      return console.error(`Failed to parse UTXOs for address ${t}:`, o), this.cache.utxos.set(t, []), [];
    }
  }
  async saveUtxos(t, n) {
    const r = await this.getUtxos(t);
    n.forEach((o) => {
      const s = r.findIndex((i) => i.txid === o.txid && i.vout === o.vout);
      s !== -1 ? r[s] = o : r.push(o);
    }), this.cache.utxos.set(t, r.slice()), await this.storage.setItem(`utxos:${t}`, JSON.stringify(r.map(ai)));
  }
  async removeUtxo(t, n) {
    const r = await this.getUtxos(t), [o, s] = n.split(":"), i = r.filter((c) => !(c.txid === o && c.vout === parseInt(s, 10)));
    this.cache.utxos.set(t, i.slice()), await this.storage.setItem(`utxos:${t}`, JSON.stringify(i.map(ai)));
  }
  async clearUtxos(t) {
    this.cache.utxos.set(t, []), await this.storage.removeItem(`utxos:${t}`);
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
class td {
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
function Ve(e, t) {
  return {
    ...t,
    forfeitTapLeafScript: e.offchainTapscript.forfeit(),
    intentTapLeafScript: e.offchainTapscript.exit(),
    tapTree: e.offchainTapscript.encode()
  };
}
function oa(e, t) {
  return {
    ...t,
    forfeitTapLeafScript: e.boardingTapscript.forfeit(),
    intentTapLeafScript: e.boardingTapscript.exit(),
    tapTree: e.boardingTapscript.encode()
  };
}
class Ze {
  constructor(t, n, r, o, s, i, c, a, u, f, l, d, h, w, p, m) {
    this.identity = t, this.network = n, this.networkName = r, this.onchainProvider = o, this.arkProvider = s, this.indexerProvider = i, this.arkServerPublicKey = c, this.offchainTapscript = a, this.boardingTapscript = u, this.serverUnrollScript = f, this.forfeitOutputScript = l, this.forfeitPubkey = d, this.dustAmount = h, this.walletRepository = w, this.contractRepository = p, this.renewalConfig = {
      enabled: m?.enabled ?? !1,
      ...Cl,
      ...m
    };
  }
  static async create(t) {
    const n = await t.identity.xOnlyPublicKey();
    if (!n)
      throw new Error("Invalid configured public key");
    const r = t.arkProvider || (() => {
      if (!t.arkServerUrl)
        throw new Error("Either arkProvider or arkServerUrl must be provided");
      return new ta(t.arkServerUrl);
    })(), o = t.arkServerUrl || r.serverUrl;
    if (!o)
      throw new Error("Could not determine arkServerUrl from provider");
    const s = t.indexerUrl || o, i = t.indexerProvider || new na(s), c = await r.getInfo(), a = sl(c.network), u = t.esploraUrl || cl[c.network], f = t.onchainProvider || new al(u), l = {
      value: c.unilateralExitDelay,
      type: c.unilateralExitDelay < 512n ? "blocks" : "seconds"
    }, d = {
      value: c.boardingExitDelay,
      type: c.boardingExitDelay < 512n ? "blocks" : "seconds"
    }, h = S.decode(c.signerPubkey).slice(1), w = new dr.Script({
      pubKey: n,
      serverPubKey: h,
      csvTimelock: l
    }), p = new dr.Script({
      pubKey: n,
      serverPubKey: h,
      csvTimelock: d
    }), m = w;
    let x;
    try {
      const tt = S.decode(c.checkpointTapscript);
      x = kt.decode(tt);
    } catch {
      throw new Error("Invalid checkpointTapscript from server");
    }
    const E = S.decode(c.forfeitPubkey).slice(1), v = ke(a).decode(c.forfeitAddress), O = st.encode(v), A = t.storage || new Xl(), F = new To(A), y = new td(A);
    return new Ze(t.identity, a, c.network, f, r, i, h, m, p, x, O, E, c.dust, F, y, t.renewalConfig);
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
    s = n.filter((f) => f.virtualStatus.state === "settled").reduce((f, l) => f + l.value, 0), i = n.filter((f) => f.virtualStatus.state === "preconfirmed").reduce((f, l) => f + l.value, 0), c = n.filter((f) => te(f) && f.virtualStatus.state === "swept").reduce((f, l) => f + l.value, 0);
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
    const n = await this.getAddress(), o = (await this.getVirtualCoins(t)).map((s) => Ve(this, s));
    return await this.walletRepository.saveVtxos(n, o), o;
  }
  async getVirtualCoins(t = { withRecoverable: !0, withUnrolled: !1 }) {
    const n = [S.encode(this.offchainTapscript.pkScript)], o = (await this.indexerProvider.getVtxos({ scripts: n })).vtxos;
    let s = o.filter(te);
    if (t.withRecoverable || (s = s.filter((i) => !mo(i))), t.withUnrolled) {
      const i = o.filter((c) => !te(c));
      s.push(...i.filter((c) => c.isUnrolled));
    }
    return s;
  }
  async getTransactionHistory() {
    if (!this.indexerProvider)
      return [];
    const t = await this.indexerProvider.getVtxos({
      scripts: [S.encode(this.offchainTapscript.pkScript)]
    }), { boardingTxs: n, commitmentsToIgnore: r } = await this.getBoardingTxs(), o = [], s = [];
    for (const a of t.vtxos)
      te(a) ? o.push(a) : s.push(a);
    const i = Jc(o, s, r), c = [...n, ...i];
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
        type: En.TxReceived,
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
    const t = await this.getBoardingAddress(), r = (await this.onchainProvider.getCoins(t)).map((o) => oa(this, o));
    return await this.walletRepository.saveUtxos(t, r), r;
  }
  async sendBitcoin(t) {
    if (t.amount <= 0)
      throw new Error("Amount must be positive");
    if (!nd(t.address))
      throw new Error("Invalid Ark address " + t.address);
    const n = await this.getVirtualCoins({
      withRecoverable: !1
    }), r = rd(n, t.amount), o = this.offchainTapscript.forfeit();
    if (!o)
      throw new Error("Selected leaf not found");
    const s = qe.decode(t.address), c = [
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
    let u = Ul(r.inputs.map((w) => ({
      ...w,
      tapLeafScript: o,
      tapTree: a
    })), c, this.serverUnrollScript);
    const f = await this.identity.sign(u.arkTx), { arkTxid: l, signedCheckpointTxs: d } = await this.arkProvider.submitTx(bt.encode(f.toPSBT()), u.checkpoints.map((w) => bt.encode(w.toPSBT()))), h = await Promise.all(d.map(async (w) => {
      const p = ee.fromPSBT(bt.decode(w)), m = await this.identity.sign(p);
      return bt.encode(m.toPSBT());
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
      const w = kt.decode(S.decode(this.boardingTapscript.exitScript)).params.timelock, p = (await this.getBoardingUtxos()).filter((E) => !$l(E, w));
      d += p.reduce((E, v) => E + v.value, 0);
      const m = await this.getVtxos({ withRecoverable: !0 });
      d += m.reduce((E, v) => E + v.value, 0);
      const x = [...p, ...m];
      if (x.length === 0)
        throw new Error("No inputs found");
      t = {
        inputs: x,
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
      let w;
      try {
        w = qe.decode(h.address).pkScript, s = !0;
      } catch {
        const p = ke(this.network).decode(h.address);
        w = st.encode(p), r.push(d);
      }
      o.push({
        amount: h.amount,
        script: w
      });
    }
    let i;
    const c = [];
    s && (i = this.identity.signerSession(), c.push(S.encode(await i.getPublicKey())));
    const [a, u] = await Promise.all([
      this.makeRegisterIntentSignature(t.inputs, o, r, c),
      this.makeDeleteIntentSignature(t.inputs)
    ]), f = await this.arkProvider.registerIntent(a), l = new AbortController();
    try {
      let d;
      const h = [
        ...c,
        ...t.inputs.map((A) => `${A.txid}:${A.vout}`)
      ], w = this.arkProvider.getEventStream(l.signal, h);
      let p, m;
      const x = [], E = [];
      let v, O;
      for await (const A of w)
        switch (n && n(A), A.type) {
          // the settlement failed
          case z.BatchFailed:
            throw new Error(A.reason);
          case z.BatchStarted:
            if (d !== void 0)
              continue;
            const F = await this.handleBatchStartedEvent(A, f, this.forfeitPubkey, this.forfeitOutputScript);
            F.skip || (d = A.type, m = F.sweepTapTreeRoot, p = F.roundId, s || (d = z.TreeNonces));
            break;
          case z.TreeTx:
            if (d !== z.BatchStarted && d !== z.TreeNonces)
              continue;
            if (A.batchIndex === 0)
              x.push(A.chunk);
            else if (A.batchIndex === 1)
              E.push(A.chunk);
            else
              throw new Error(`Invalid batch index: ${A.batchIndex}`);
            break;
          case z.TreeSignature:
            if (d !== z.TreeNonces || !s)
              continue;
            if (!v)
              throw new Error("Vtxo graph not set, something went wrong");
            if (A.batchIndex === 0) {
              const y = S.decode(A.signature);
              v.update(A.txid, (tt) => {
                tt.updateInput(0, {
                  tapKeySig: y
                });
              });
            }
            break;
          // the server has started the signing process of the vtxo tree transactions
          // the server expects the partial musig2 nonces for each tx
          case z.TreeSigningStarted:
            if (d !== z.BatchStarted)
              continue;
            if (s) {
              if (!i)
                throw new Error("Signing session not set");
              if (!m)
                throw new Error("Sweep tap tree root not set");
              if (x.length === 0)
                throw new Error("unsigned vtxo graph not received");
              v = So.create(x), await this.handleSettlementSigningEvent(A, m, i, v);
            }
            d = A.type;
            break;
          // the musig2 nonces of the vtxo tree transactions are generated
          // the server expects now the partial musig2 signatures
          case z.TreeNonces:
            if (d !== z.TreeSigningStarted)
              continue;
            if (s) {
              if (!i)
                throw new Error("Signing session not set");
              await this.handleSettlementTreeNoncesEvent(A, i) && (d = A.type);
              break;
            }
            d = A.type;
            break;
          // the vtxo tree is signed, craft, sign and submit forfeit transactions
          // if any boarding utxos are involved, the settlement tx is also signed
          case z.BatchFinalization:
            if (d !== z.TreeNonces)
              continue;
            if (!this.forfeitOutputScript)
              throw new Error("Forfeit output script not set");
            E.length > 0 && (O = So.create(E), Bl(A.commitmentTx, O)), await this.handleSettlementFinalizationEvent(A, t.inputs, this.forfeitOutputScript, O), d = A.type;
            break;
          // the settlement is done, last event to be received
          case z.BatchFinalized:
            if (d !== z.BatchFinalization)
              continue;
            if (A.id === p)
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
    if (this.onchainProvider && r) {
      const c = (a) => a.vout.findIndex((u) => u.scriptpubkey_address === r);
      o = await this.onchainProvider.watchAddresses([r], (a) => {
        const u = a.filter((f) => c(f) !== -1).map((f) => {
          const { txid: l, status: d } = f, h = c(f), w = Number(f.vout[h].value);
          return { txid: l, vout: h, value: w, status: d };
        });
        t({
          type: "utxo",
          coins: u
        });
      });
    }
    if (this.indexerProvider && n) {
      const c = this.offchainTapscript, a = await this.indexerProvider.subscribeForScripts([
        S.encode(c.pkScript)
      ]), u = new AbortController(), f = this.indexerProvider.getSubscription(a, u.signal);
      s = async () => {
        u.abort(), await this.indexerProvider?.unsubscribeForScripts(a);
      }, (async () => {
        try {
          for await (const l of f)
            l.newVtxos?.length > 0 && t({
              type: "vtxo",
              newVtxos: l.newVtxos.map((d) => Ve(this, d)),
              spentVtxos: l.spentVtxos.map((d) => Ve(this, d))
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
    const s = new TextEncoder().encode(n), i = ht(s), c = S.encode(i);
    let a = !0;
    for (const l of t.intentIdHashes)
      if (l === c) {
        if (!this.arkProvider)
          throw new Error("Ark provider not configured");
        await this.arkProvider.confirmRegistration(n), a = !1;
      }
    if (a)
      return { skip: a };
    const u = kt.encode({
      timelock: {
        value: t.batchExpiry,
        type: t.batchExpiry >= 512n ? "seconds" : "blocks"
      },
      pubkeys: [r]
    }).script, f = cn(u);
    return {
      roundId: t.id,
      sweepTapTreeRoot: f,
      forfeitOutputScript: o,
      skip: !1
    };
  }
  // validates the vtxo tree, creates a signing session and generates the musig2 nonces
  async handleSettlementSigningEvent(t, n, r, o) {
    const s = ee.fromPSBT(bt.decode(t.unsignedCommitmentTx));
    Ol(o, s, n);
    const i = s.getOutput(0);
    if (!i?.amount)
      throw new Error("Shared output not found");
    r.init(o, n, i.amount);
    const c = S.encode(await r.getPublicKey()), a = await r.getNonces();
    await this.arkProvider.submitTreeNonces(t.id, c, a);
  }
  async handleSettlementTreeNoncesEvent(t, n) {
    const { hasAllNonces: r } = await n.aggregatedNonces(t.txid, t.nonces);
    if (!r)
      return !1;
    const o = await n.sign(), s = S.encode(await n.getPublicKey());
    return await this.arkProvider.submitTreeSignatures(t.id, s, o), !0;
  }
  async handleSettlementFinalizationEvent(t, n, r, o) {
    const s = [], i = await this.getVirtualCoins();
    let c = ee.fromPSBT(bt.decode(t.commitmentTx)), a = !1, u = 0;
    const f = o?.leaves() || [];
    for (const l of n) {
      const d = i.find((v) => v.txid === l.txid && v.vout === l.vout);
      if (!d) {
        for (let v = 0; v < c.inputsLength; v++) {
          const O = c.getInput(v);
          if (!O.txid || O.index === void 0)
            throw new Error("The server returned incomplete data. No settlement input found in the PSBT");
          if (S.encode(O.txid) === l.txid && O.index === l.vout) {
            c.updateInput(v, {
              tapLeafScript: [l.forfeitTapLeafScript]
            }), c = await this.identity.sign(c, [
              v
            ]), a = !0;
            break;
          }
        }
        continue;
      }
      if (mo(d) || Qc(d, this.dustAmount))
        continue;
      if (f.length === 0)
        throw new Error("connectors not received");
      if (u >= f.length)
        throw new Error("not enough connectors received");
      const h = f[u], w = h.id, p = h.getOutput(0);
      if (!p)
        throw new Error("connector output not found");
      const m = p.amount, x = p.script;
      if (!m || !x)
        throw new Error("invalid connector output");
      u++;
      let E = xl([
        {
          txid: l.txid,
          index: l.vout,
          witnessUtxo: {
            amount: BigInt(d.value),
            script: Ut.decode(l.tapTree).pkScript
          },
          sighashType: Ae.DEFAULT,
          tapLeafScript: [l.forfeitTapLeafScript]
        },
        {
          txid: w,
          index: 0,
          witnessUtxo: {
            amount: m,
            script: x
          }
        }
      ], r);
      E = await this.identity.sign(E, [0]), s.push(bt.encode(E.toPSBT()));
    }
    (s.length > 0 || a) && await this.arkProvider.submitSignedForfeitTxs(s, a ? bt.encode(c.toPSBT()) : void 0);
  }
  async makeRegisterIntentSignature(t, n, r, o) {
    const s = Math.floor(Date.now() / 1e3), i = this.prepareIntentProofInputs(t), c = {
      type: "register",
      onchain_output_indexes: r,
      valid_at: s,
      expire_at: s + 120,
      // valid for 2 minutes
      cosigners_public_keys: o
    }, a = JSON.stringify(c, null, 0), u = hr.create(a, i, n), f = await this.identity.sign(u);
    return {
      proof: bt.encode(f.toPSBT()),
      message: a
    };
  }
  async makeDeleteIntentSignature(t) {
    const n = Math.floor(Date.now() / 1e3), r = this.prepareIntentProofInputs(t), o = {
      type: "delete",
      expire_at: n + 120
      // valid for 2 minutes
    }, s = JSON.stringify(o, null, 0), i = hr.create(s, r, []), c = await this.identity.sign(i);
    return {
      proof: bt.encode(c.toPSBT()),
      message: s
    };
  }
  prepareIntentProofInputs(t) {
    const n = [];
    for (const r of t) {
      const o = Ut.decode(r.tapTree), s = ed(r), i = [Zc.encode(r.tapTree)];
      r.extraWitness && i.push(Qf.encode(r.extraWitness)), n.push({
        txid: S.decode(r.txid),
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
Ze.MIN_FEE_RATE = 1;
function ed(e) {
  let t;
  try {
    const n = e.intentTapLeafScript[1], r = n.subarray(0, n.length - 1), o = kt.decode(r).params;
    t = go.encode(o.timelock.type === "blocks" ? { blocks: Number(o.timelock.value) } : { seconds: Number(o.timelock.value) });
  } catch {
  }
  return t;
}
function nd(e) {
  try {
    return qe.decode(e), !0;
  } catch {
    return !1;
  }
}
function rd(e, t) {
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
function ui() {
  const e = crypto.getRandomValues(new Uint8Array(16));
  return S.encode(e);
}
var N;
(function(e) {
  e.walletInitialized = (g) => ({
    type: "WALLET_INITIALIZED",
    success: !0,
    id: g
  });
  function t(g, b) {
    return {
      type: "ERROR",
      success: !1,
      message: b,
      id: g
    };
  }
  e.error = t;
  function n(g, b) {
    return {
      type: "SETTLE_EVENT",
      success: !0,
      event: b,
      id: g
    };
  }
  e.settleEvent = n;
  function r(g, b) {
    return {
      type: "SETTLE_SUCCESS",
      success: !0,
      txid: b,
      id: g
    };
  }
  e.settleSuccess = r;
  function o(g) {
    return g.type === "SETTLE_SUCCESS" && g.success;
  }
  e.isSettleSuccess = o;
  function s(g) {
    return g.type === "ADDRESS" && g.success === !0;
  }
  e.isAddress = s;
  function i(g) {
    return g.type === "BOARDING_ADDRESS" && g.success === !0;
  }
  e.isBoardingAddress = i;
  function c(g, b) {
    return {
      type: "ADDRESS",
      success: !0,
      address: b,
      id: g
    };
  }
  e.address = c;
  function a(g, b) {
    return {
      type: "BOARDING_ADDRESS",
      success: !0,
      address: b,
      id: g
    };
  }
  e.boardingAddress = a;
  function u(g) {
    return g.type === "BALANCE" && g.success === !0;
  }
  e.isBalance = u;
  function f(g, b) {
    return {
      type: "BALANCE",
      success: !0,
      balance: b,
      id: g
    };
  }
  e.balance = f;
  function l(g) {
    return g.type === "VTXOS" && g.success === !0;
  }
  e.isVtxos = l;
  function d(g, b) {
    return {
      type: "VTXOS",
      success: !0,
      vtxos: b,
      id: g
    };
  }
  e.vtxos = d;
  function h(g) {
    return g.type === "VIRTUAL_COINS" && g.success === !0;
  }
  e.isVirtualCoins = h;
  function w(g, b) {
    return {
      type: "VIRTUAL_COINS",
      success: !0,
      virtualCoins: b,
      id: g
    };
  }
  e.virtualCoins = w;
  function p(g) {
    return g.type === "BOARDING_UTXOS" && g.success === !0;
  }
  e.isBoardingUtxos = p;
  function m(g, b) {
    return {
      type: "BOARDING_UTXOS",
      success: !0,
      boardingUtxos: b,
      id: g
    };
  }
  e.boardingUtxos = m;
  function x(g) {
    return g.type === "SEND_BITCOIN_SUCCESS" && g.success === !0;
  }
  e.isSendBitcoinSuccess = x;
  function E(g, b) {
    return {
      type: "SEND_BITCOIN_SUCCESS",
      success: !0,
      txid: b,
      id: g
    };
  }
  e.sendBitcoinSuccess = E;
  function v(g) {
    return g.type === "TRANSACTION_HISTORY" && g.success === !0;
  }
  e.isTransactionHistory = v;
  function O(g, b) {
    return {
      type: "TRANSACTION_HISTORY",
      success: !0,
      transactions: b,
      id: g
    };
  }
  e.transactionHistory = O;
  function A(g) {
    return g.type === "WALLET_STATUS" && g.success === !0;
  }
  e.isWalletStatus = A;
  function F(g, b, U) {
    return {
      type: "WALLET_STATUS",
      success: !0,
      status: {
        walletInitialized: b,
        xOnlyPublicKey: U
      },
      id: g
    };
  }
  e.walletStatus = F;
  function y(g) {
    return g.type === "CLEAR_RESPONSE";
  }
  e.isClearResponse = y;
  function tt(g, b) {
    return {
      type: "CLEAR_RESPONSE",
      success: b,
      id: g
    };
  }
  e.clearResponse = tt;
  function H(g) {
    return g.type === "WALLET_RELOADED";
  }
  e.isWalletReloaded = H;
  function Ue(g, b) {
    return {
      type: "WALLET_RELOADED",
      success: b,
      id: g
    };
  }
  e.walletReloaded = Ue;
  function Yt(g) {
    return g.type === "VTXO_UPDATE";
  }
  e.isVtxoUpdate = Yt;
  function K(g, b) {
    return {
      type: "VTXO_UPDATE",
      id: ui(),
      // spontaneous update, not tied to a request
      success: !0,
      spentVtxos: b,
      newVtxos: g
    };
  }
  e.vtxoUpdate = K;
  function k(g) {
    return g.type === "UTXO_UPDATE";
  }
  e.isUtxoUpdate = k;
  function T(g) {
    return {
      type: "UTXO_UPDATE",
      id: ui(),
      // spontaneous update, not tied to a request
      success: !0,
      coins: g
    };
  }
  e.utxoUpdate = T;
})(N || (N = {}));
class od {
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
const sd = "arkade-service-worker";
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
    return this.hasWitness && (s += j.WITNESS_HEADER_SIZE + this.inputWitnessSize), id(s);
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
const id = (e) => {
  const t = BigInt(Math.ceil(e / j.WITNESS_SCALE_FACTOR));
  return {
    value: t,
    fee: (n) => n * t
  };
};
var pt;
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
  function w(p) {
    return p.type === "RELOAD_WALLET";
  }
  e.isReloadWallet = w;
})(pt || (pt = {}));
class cd {
  constructor(t = sd, n = 1, r = () => {
  }) {
    this.dbName = t, this.dbVersion = n, this.messageCallback = r, this.storage = new od(t, n), this.walletRepository = new To(this.storage);
  }
  /**
   * Get spendable vtxos for the current wallet address
   */
  async getSpendableVtxos() {
    if (!this.wallet)
      return [];
    const t = await this.wallet.getAddress();
    return (await this.walletRepository.getVtxos(t)).filter(te);
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
      spendable: n.filter(te),
      spent: n.filter((r) => !te(r))
    };
  }
  /**
   * Get all boarding utxos from wallet repository
   */
  async getAllBoardingUtxos() {
    if (!this.wallet)
      return [];
    const t = await this.wallet.getBoardingAddress();
    return await this.walletRepository.getUtxos(t);
  }
  async getTransactionHistory() {
    if (!this.wallet)
      return [];
    let t = [];
    try {
      const { boardingTxs: n, commitmentsToIgnore: r } = await this.wallet.getBoardingTxs(), { spendable: o, spent: s } = await this.getAllVtxos();
      console.log("getTransactionHistory - vtxosToTxs:", o);
      const i = Jc(o, s, r);
      t = [...n, ...i], t.sort(
        // place createdAt = 0 (unconfirmed txs) first, then descending
        (c, a) => c.createdAt === 0 ? -1 : a.createdAt === 0 ? 1 : a.createdAt - c.createdAt
      );
    } catch (n) {
      console.error("Error getting transaction history:", n);
    }
    return t;
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
    this.incomingFundsSubscription && this.incomingFundsSubscription(), await this.storage.clear(), this.walletRepository = new To(this.storage), this.wallet = void 0, this.arkProvider = void 0, this.indexerProvider = void 0;
  }
  async reload() {
    await this.onWalletInitialized();
  }
  async onWalletInitialized() {
    if (!this.wallet || !this.arkProvider || !this.indexerProvider || !this.wallet.offchainTapscript || !this.wallet.boardingTapscript)
      return;
    const t = S.encode(this.wallet.offchainTapscript.pkScript), r = (await this.indexerProvider.getVtxos({
      scripts: [t]
    })).vtxos.map((i) => Ve(this.wallet, i)), o = await this.wallet.getAddress();
    await this.walletRepository.saveVtxos(o, r);
    const s = await this.getTransactionHistory();
    s && await this.walletRepository.saveTransactions(o, s), this.incomingFundsSubscription && this.incomingFundsSubscription(), this.incomingFundsSubscription = await this.wallet.notifyIncomingFunds(async (i) => {
      if (i.type === "vtxo") {
        const c = i.newVtxos.length > 0 ? i.newVtxos.map((u) => Ve(this.wallet, u)) : [], a = i.spentVtxos.length > 0 ? i.spentVtxos.map((u) => Ve(this.wallet, u)) : [];
        if ([...c, ...a].length === 0)
          return;
        await this.walletRepository.saveVtxos(o, [
          ...c,
          ...a
        ]), await this.sendMessageToAllClients(N.vtxoUpdate(c, a));
      }
      if (i.type === "utxo") {
        const c = i.coins.map((u) => oa(this.wallet, u)), a = await this.wallet?.getBoardingAddress();
        await this.walletRepository.clearUtxos(a), await this.walletRepository.saveUtxos(a, c), await this.sendMessageToAllClients(N.utxoUpdate(c));
      }
    });
  }
  async handleClear(t) {
    await this.clear(), pt.isBase(t.data) && t.source?.postMessage(N.clearResponse(t.data.id, !0));
  }
  async handleInitWallet(t) {
    const n = t.data;
    if (!pt.isInitWallet(n)) {
      console.error("Invalid INIT_WALLET message format", n), t.source?.postMessage(N.error(n.id, "Invalid INIT_WALLET message format"));
      return;
    }
    if (!n.privateKey) {
      const r = "Missing privateKey";
      t.source?.postMessage(N.error(n.id, r)), console.error(r);
      return;
    }
    try {
      const { arkServerPublicKey: r, arkServerUrl: o, privateKey: s } = n, i = un.fromHex(s);
      this.arkProvider = new ta(o), this.indexerProvider = new na(o), this.wallet = await Ze.create({
        identity: i,
        arkServerUrl: o,
        arkServerPublicKey: r,
        storage: this.storage
        // Use unified storage for wallet too
      }), t.source?.postMessage(N.walletInitialized(n.id)), await this.onWalletInitialized();
    } catch (r) {
      console.error("Error initializing wallet:", r);
      const o = r instanceof Error ? r.message : "Unknown error occurred";
      t.source?.postMessage(N.error(n.id, o));
    }
  }
  async handleSettle(t) {
    const n = t.data;
    if (!pt.isSettle(n)) {
      console.error("Invalid SETTLE message format", n), t.source?.postMessage(N.error(n.id, "Invalid SETTLE message format"));
      return;
    }
    try {
      if (!this.wallet) {
        console.error("Wallet not initialized"), t.source?.postMessage(N.error(n.id, "Wallet not initialized"));
        return;
      }
      const r = await this.wallet.settle(n.params, (o) => {
        t.source?.postMessage(N.settleEvent(n.id, o));
      });
      t.source?.postMessage(N.settleSuccess(n.id, r));
    } catch (r) {
      console.error("Error settling:", r);
      const o = r instanceof Error ? r.message : "Unknown error occurred";
      t.source?.postMessage(N.error(n.id, o));
    }
  }
  async handleSendBitcoin(t) {
    const n = t.data;
    if (!pt.isSendBitcoin(n)) {
      console.error("Invalid SEND_BITCOIN message format", n), t.source?.postMessage(N.error(n.id, "Invalid SEND_BITCOIN message format"));
      return;
    }
    if (!this.wallet) {
      console.error("Wallet not initialized"), t.source?.postMessage(N.error(n.id, "Wallet not initialized"));
      return;
    }
    try {
      const r = await this.wallet.sendBitcoin(n.params);
      t.source?.postMessage(N.sendBitcoinSuccess(n.id, r));
    } catch (r) {
      console.error("Error sending bitcoin:", r);
      const o = r instanceof Error ? r.message : "Unknown error occurred";
      t.source?.postMessage(N.error(n.id, o));
    }
  }
  async handleGetAddress(t) {
    const n = t.data;
    if (!pt.isGetAddress(n)) {
      console.error("Invalid GET_ADDRESS message format", n), t.source?.postMessage(N.error(n.id, "Invalid GET_ADDRESS message format"));
      return;
    }
    if (!this.wallet) {
      console.error("Wallet not initialized"), t.source?.postMessage(N.error(n.id, "Wallet not initialized"));
      return;
    }
    try {
      const r = await this.wallet.getAddress();
      t.source?.postMessage(N.address(n.id, r));
    } catch (r) {
      console.error("Error getting address:", r);
      const o = r instanceof Error ? r.message : "Unknown error occurred";
      t.source?.postMessage(N.error(n.id, o));
    }
  }
  async handleGetBoardingAddress(t) {
    const n = t.data;
    if (!pt.isGetBoardingAddress(n)) {
      console.error("Invalid GET_BOARDING_ADDRESS message format", n), t.source?.postMessage(N.error(n.id, "Invalid GET_BOARDING_ADDRESS message format"));
      return;
    }
    if (!this.wallet) {
      console.error("Wallet not initialized"), t.source?.postMessage(N.error(n.id, "Wallet not initialized"));
      return;
    }
    try {
      const r = await this.wallet.getBoardingAddress();
      t.source?.postMessage(N.boardingAddress(n.id, r));
    } catch (r) {
      console.error("Error getting boarding address:", r);
      const o = r instanceof Error ? r.message : "Unknown error occurred";
      t.source?.postMessage(N.error(n.id, o));
    }
  }
  async handleGetBalance(t) {
    const n = t.data;
    if (!pt.isGetBalance(n)) {
      console.error("Invalid GET_BALANCE message format", n), t.source?.postMessage(N.error(n.id, "Invalid GET_BALANCE message format"));
      return;
    }
    if (!this.wallet) {
      console.error("Wallet not initialized"), t.source?.postMessage(N.error(n.id, "Wallet not initialized"));
      return;
    }
    try {
      const [r, o, s] = await Promise.all([
        this.getAllBoardingUtxos(),
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
        te(h) && (f += h.value);
      const l = i + c, d = a + u + f;
      t.source?.postMessage(N.balance(n.id, {
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
      t.source?.postMessage(N.error(n.id, o));
    }
  }
  async handleGetVtxos(t) {
    const n = t.data;
    if (!pt.isGetVtxos(n)) {
      console.error("Invalid GET_VTXOS message format", n), t.source?.postMessage(N.error(n.id, "Invalid GET_VTXOS message format"));
      return;
    }
    if (!this.wallet) {
      console.error("Wallet not initialized"), t.source?.postMessage(N.error(n.id, "Wallet not initialized"));
      return;
    }
    try {
      const r = await this.getSpendableVtxos(), o = this.wallet.dustAmount, i = n.filter?.withRecoverable ?? !1 ? r : r.filter((c) => !(o != null && Qc(c, o) || mo(c)));
      t.source?.postMessage(N.vtxos(n.id, i));
    } catch (r) {
      console.error("Error getting vtxos:", r);
      const o = r instanceof Error ? r.message : "Unknown error occurred";
      t.source?.postMessage(N.error(n.id, o));
    }
  }
  async handleGetBoardingUtxos(t) {
    const n = t.data;
    if (!pt.isGetBoardingUtxos(n)) {
      console.error("Invalid GET_BOARDING_UTXOS message format", n), t.source?.postMessage(N.error(n.id, "Invalid GET_BOARDING_UTXOS message format"));
      return;
    }
    if (!this.wallet) {
      console.error("Wallet not initialized"), t.source?.postMessage(N.error(n.id, "Wallet not initialized"));
      return;
    }
    try {
      const r = await this.getAllBoardingUtxos();
      t.source?.postMessage(N.boardingUtxos(n.id, r));
    } catch (r) {
      console.error("Error getting boarding utxos:", r);
      const o = r instanceof Error ? r.message : "Unknown error occurred";
      t.source?.postMessage(N.error(n.id, o));
    }
  }
  async handleGetTransactionHistory(t) {
    const n = t.data;
    if (!pt.isGetTransactionHistory(n)) {
      console.error("Invalid GET_TRANSACTION_HISTORY message format", n), t.source?.postMessage(N.error(n.id, "Invalid GET_TRANSACTION_HISTORY message format"));
      return;
    }
    if (!this.wallet) {
      console.error("Wallet not initialized"), t.source?.postMessage(N.error(n.id, "Wallet not initialized"));
      return;
    }
    try {
      const r = await this.getTransactionHistory();
      t.source?.postMessage(N.transactionHistory(n.id, r));
    } catch (r) {
      console.error("Error getting transaction history:", r);
      const o = r instanceof Error ? r.message : "Unknown error occurred";
      t.source?.postMessage(N.error(n.id, o));
    }
  }
  async handleGetStatus(t) {
    const n = t.data;
    if (!pt.isGetStatus(n)) {
      console.error("Invalid GET_STATUS message format", n), t.source?.postMessage(N.error(n.id, "Invalid GET_STATUS message format"));
      return;
    }
    const r = this.wallet ? await this.wallet.identity.xOnlyPublicKey() : void 0;
    t.source?.postMessage(N.walletStatus(n.id, this.wallet !== void 0, r));
  }
  async handleMessage(t) {
    this.messageCallback(t);
    const n = t.data;
    if (!pt.isBase(n)) {
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
        t.source?.postMessage(N.error(n.id, "Unknown message type"));
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
    if (!pt.isReloadWallet(n)) {
      console.error("Invalid RELOAD_WALLET message format", n), t.source?.postMessage(N.error(n.id, "Invalid RELOAD_WALLET message format"));
      return;
    }
    if (!this.wallet) {
      console.error("Wallet not initialized"), t.source?.postMessage(N.walletReloaded(n.id, !1));
      return;
    }
    try {
      await this.onWalletInitialized(), t.source?.postMessage(N.walletReloaded(n.id, !0));
    } catch (r) {
      console.error("Error reloading wallet:", r), t.source?.postMessage(N.walletReloaded(n.id, !1));
    }
  }
}
var fi;
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
        if (!(f.type === _e.COMMITMENT || f.type === _e.UNSPECIFIED))
          try {
            if (!(await this.explorer.getTxStatus(f.txid)).confirmed)
              return {
                type: t.WAIT,
                txid: f.txid,
                do: fd(this.explorer, f.txid)
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
      const a = he.fromPSBT(bt.decode(c.txs[0]));
      if (s.type === _e.TREE) {
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
        do: ud(this.bumper, this.explorer, a)
      };
    }
    /**
     * Iterate over the steps to be executed and execute them
     * @returns An async iterator over the executed steps
     */
    async *[Symbol.asyncIterator]() {
      let s;
      do {
        s !== void 0 && await ad(1e3);
        const i = await this.next();
        await i.do(), yield i, s = i.type;
      } while (s !== t.DONE);
    }
  }
  e.Session = n;
  async function r(o, s, i) {
    const c = await o.onchainProvider.getChainTip();
    let a = await o.getVtxos({ withUnrolled: !0 });
    if (a = a.filter((m) => s.includes(m.txid)), a.length === 0)
      throw new Error("No vtxos to complete unroll");
    const u = [];
    let f = 0n;
    const l = j.create();
    for (const m of a) {
      if (!m.isUnrolled)
        throw new Error(`Vtxo ${m.txid}:${m.vout} is not fully unrolled, use unroll first`);
      const x = await o.onchainProvider.getTxStatus(m.txid);
      if (!x.confirmed)
        throw new Error(`tx ${m.txid} is not confirmed`);
      const E = ld({ height: x.blockHeight, time: x.blockTime }, c, m);
      if (!E)
        throw new Error(`no available exit path found for vtxo ${m.txid}:${m.vout}`);
      const v = Ut.decode(m.tapTree).findLeaf(S.encode(E.script));
      if (!v)
        throw new Error(`spending leaf not found for vtxo ${m.txid}:${m.vout}`);
      f += BigInt(m.value), u.push({
        txid: m.txid,
        index: m.vout,
        tapLeafScript: [v],
        sequence: 4294967294,
        witnessUtxo: {
          amount: BigInt(m.value),
          script: Ut.decode(m.tapTree).pkScript
        },
        sighashType: Ae.DEFAULT
      }), l.addTapscriptInput(64, v[1].length, Wt.encode(v[0]).length);
    }
    const d = new he({ version: 2 });
    for (const m of u)
      d.addInput(m);
    l.addP2TROutput();
    let h = await o.onchainProvider.getFeeRate();
    (!h || h < Ze.MIN_FEE_RATE) && (h = Ze.MIN_FEE_RATE);
    const w = l.vsize().fee(BigInt(h));
    if (w > f)
      throw new Error("fee amount is greater than the total amount");
    d.addOutputAddress(i, f - w);
    const p = await o.identity.sign(d);
    return p.finalize(), await o.onchainProvider.broadcastTransaction(p.hex), p.id;
  }
  e.completeUnroll = r;
})(fi || (fi = {}));
function ad(e) {
  return new Promise((t) => setTimeout(t, e));
}
function ud(e, t, n) {
  return async () => {
    const [r, o] = await e.bumpP2A(n);
    await t.broadcastTransaction(r, o);
  };
}
function fd(e, t) {
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
function ld(e, t, n) {
  const r = Ut.decode(n.tapTree).exitPaths();
  for (const o of r)
    if (o.params.timelock.type === "blocks") {
      if (t.height >= e.height + Number(o.params.timelock.value))
        return o;
    } else if (t.time >= e.time + Number(o.params.timelock.value))
      return o;
}
const sa = new cd();
sa.start().catch(console.error);
const ia = "arkade-cache-v1";
self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(ia)), self.skipWaiting();
});
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((t) => Promise.all(
      t.map((n) => {
        if (n !== ia)
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
  e.data && e.data.type === "RELOAD_WALLET" && e.waitUntil(sa.reload().catch(console.error));
});
