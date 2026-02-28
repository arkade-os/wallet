/*! noble-hashes - MIT License (c) 2022 Paul Miller (paulmillr.com) */
function Eo(e) {
  return e instanceof Uint8Array || ArrayBuffer.isView(e) && e.constructor.name === "Uint8Array";
}
function ze(e, t = "") {
  if (!Number.isSafeInteger(e) || e < 0) {
    const n = t && `"${t}" `;
    throw new Error(`${n}expected integer >= 0, got ${e}`);
  }
}
function Y(e, t, n = "") {
  const r = Eo(e), i = e?.length, s = t !== void 0;
  if (!r || s && i !== t) {
    const o = n && `"${n}" `, a = s ? ` of length ${t}` : "", c = r ? `length=${i}` : `type=${typeof e}`;
    throw new Error(o + "expected Uint8Array" + a + ", got " + c);
  }
  return e;
}
function su(e) {
  if (typeof e != "function" || typeof e.create != "function")
    throw new Error("Hash must wrapped by utils.createHasher");
  ze(e.outputLen), ze(e.blockLen);
}
function ni(e, t = !0) {
  if (e.destroyed)
    throw new Error("Hash instance has been destroyed");
  if (t && e.finished)
    throw new Error("Hash#digest() has already been called");
}
function Wf(e, t) {
  Y(e, void 0, "digestInto() output");
  const n = t.outputLen;
  if (e.length < n)
    throw new Error('"digestInto() output" expected to be of length >=' + n);
}
function Bn(...e) {
  for (let t = 0; t < e.length; t++)
    e[t].fill(0);
}
function ss(e) {
  return new DataView(e.buffer, e.byteOffset, e.byteLength);
}
function ie(e, t) {
  return e << 32 - t | e >>> t;
}
function kr(e, t) {
  return e << t | e >>> 32 - t >>> 0;
}
const ou = /* @ts-ignore */ typeof Uint8Array.from([]).toHex == "function" && typeof Uint8Array.fromHex == "function", Gf = /* @__PURE__ */ Array.from({ length: 256 }, (e, t) => t.toString(16).padStart(2, "0"));
function Ci(e) {
  if (Y(e), ou)
    return e.toHex();
  let t = "";
  for (let n = 0; n < e.length; n++)
    t += Gf[e[n]];
  return t;
}
const ye = { _0: 48, _9: 57, A: 65, F: 70, a: 97, f: 102 };
function ga(e) {
  if (e >= ye._0 && e <= ye._9)
    return e - ye._0;
  if (e >= ye.A && e <= ye.F)
    return e - (ye.A - 10);
  if (e >= ye.a && e <= ye.f)
    return e - (ye.a - 10);
}
function ri(e) {
  if (typeof e != "string")
    throw new Error("hex string expected, got " + typeof e);
  if (ou)
    return Uint8Array.fromHex(e);
  const t = e.length, n = t / 2;
  if (t % 2)
    throw new Error("hex string expected, got unpadded hex of length " + t);
  const r = new Uint8Array(n);
  for (let i = 0, s = 0; i < n; i++, s += 2) {
    const o = ga(e.charCodeAt(s)), a = ga(e.charCodeAt(s + 1));
    if (o === void 0 || a === void 0) {
      const c = e[s] + e[s + 1];
      throw new Error('hex string expected, got non-hex character "' + c + '" at index ' + s);
    }
    r[i] = o * 16 + a;
  }
  return r;
}
function Jt(...e) {
  let t = 0;
  for (let r = 0; r < e.length; r++) {
    const i = e[r];
    Y(i), t += i.length;
  }
  const n = new Uint8Array(t);
  for (let r = 0, i = 0; r < e.length; r++) {
    const s = e[r];
    n.set(s, i), i += s.length;
  }
  return n;
}
function au(e, t = {}) {
  const n = (i, s) => e(s).update(i).digest(), r = e(void 0);
  return n.outputLen = r.outputLen, n.blockLen = r.blockLen, n.create = (i) => e(i), Object.assign(n, t), Object.freeze(n);
}
function br(e = 32) {
  const t = typeof globalThis == "object" ? globalThis.crypto : null;
  if (typeof t?.getRandomValues != "function")
    throw new Error("crypto.getRandomValues must be defined");
  return t.getRandomValues(new Uint8Array(e));
}
const qf = (e) => ({
  oid: Uint8Array.from([6, 9, 96, 134, 72, 1, 101, 3, 4, 2, e])
});
function Yf(e, t, n) {
  return e & t ^ ~e & n;
}
function Zf(e, t, n) {
  return e & t ^ e & n ^ t & n;
}
let cu = class {
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
  constructor(t, n, r, i) {
    this.blockLen = t, this.outputLen = n, this.padOffset = r, this.isLE = i, this.buffer = new Uint8Array(t), this.view = ss(this.buffer);
  }
  update(t) {
    ni(this), Y(t);
    const { view: n, buffer: r, blockLen: i } = this, s = t.length;
    for (let o = 0; o < s; ) {
      const a = Math.min(i - this.pos, s - o);
      if (a === i) {
        const c = ss(t);
        for (; i <= s - o; o += i)
          this.process(c, o);
        continue;
      }
      r.set(t.subarray(o, o + a), this.pos), this.pos += a, o += a, this.pos === i && (this.process(n, 0), this.pos = 0);
    }
    return this.length += t.length, this.roundClean(), this;
  }
  digestInto(t) {
    ni(this), Wf(t, this), this.finished = !0;
    const { buffer: n, view: r, blockLen: i, isLE: s } = this;
    let { pos: o } = this;
    n[o++] = 128, Bn(this.buffer.subarray(o)), this.padOffset > i - o && (this.process(r, 0), o = 0);
    for (let d = o; d < i; d++)
      n[d] = 0;
    r.setBigUint64(i - 8, BigInt(this.length * 8), s), this.process(r, 0);
    const a = ss(t), c = this.outputLen;
    if (c % 4)
      throw new Error("_sha2: outputLen must be aligned to 32bit");
    const u = c / 4, l = this.get();
    if (u > l.length)
      throw new Error("_sha2: outputLen bigger than state");
    for (let d = 0; d < u; d++)
      a.setUint32(4 * d, l[d], s);
  }
  digest() {
    const { buffer: t, outputLen: n } = this;
    this.digestInto(t);
    const r = t.slice(0, n);
    return this.destroy(), r;
  }
  _cloneInto(t) {
    t ||= new this.constructor(), t.set(...this.get());
    const { blockLen: n, buffer: r, length: i, finished: s, destroyed: o, pos: a } = this;
    return t.destroyed = o, t.finished = s, t.length = i, t.pos = a, i % n && t.buffer.set(r), t;
  }
  clone() {
    return this._cloneInto();
  }
};
const $e = /* @__PURE__ */ Uint32Array.from([
  1779033703,
  3144134277,
  1013904242,
  2773480762,
  1359893119,
  2600822924,
  528734635,
  1541459225
]), Xf = /* @__PURE__ */ Uint32Array.from([
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
]), Ne = /* @__PURE__ */ new Uint32Array(64);
let Qf = class extends cu {
  constructor(t) {
    super(64, t, 8, !1);
  }
  get() {
    const { A: t, B: n, C: r, D: i, E: s, F: o, G: a, H: c } = this;
    return [t, n, r, i, s, o, a, c];
  }
  // prettier-ignore
  set(t, n, r, i, s, o, a, c) {
    this.A = t | 0, this.B = n | 0, this.C = r | 0, this.D = i | 0, this.E = s | 0, this.F = o | 0, this.G = a | 0, this.H = c | 0;
  }
  process(t, n) {
    for (let d = 0; d < 16; d++, n += 4)
      Ne[d] = t.getUint32(n, !1);
    for (let d = 16; d < 64; d++) {
      const p = Ne[d - 15], g = Ne[d - 2], f = ie(p, 7) ^ ie(p, 18) ^ p >>> 3, h = ie(g, 17) ^ ie(g, 19) ^ g >>> 10;
      Ne[d] = h + Ne[d - 7] + f + Ne[d - 16] | 0;
    }
    let { A: r, B: i, C: s, D: o, E: a, F: c, G: u, H: l } = this;
    for (let d = 0; d < 64; d++) {
      const p = ie(a, 6) ^ ie(a, 11) ^ ie(a, 25), g = l + p + Yf(a, c, u) + Xf[d] + Ne[d] | 0, h = (ie(r, 2) ^ ie(r, 13) ^ ie(r, 22)) + Zf(r, i, s) | 0;
      l = u, u = c, c = a, a = o + g | 0, o = s, s = i, i = r, r = g + h | 0;
    }
    r = r + this.A | 0, i = i + this.B | 0, s = s + this.C | 0, o = o + this.D | 0, a = a + this.E | 0, c = c + this.F | 0, u = u + this.G | 0, l = l + this.H | 0, this.set(r, i, s, o, a, c, u, l);
  }
  roundClean() {
    Bn(Ne);
  }
  destroy() {
    this.set(0, 0, 0, 0, 0, 0, 0, 0), Bn(this.buffer);
  }
}, Jf = class extends Qf {
  // We cannot use array here since array allows indexing by variable
  // which means optimizer/compiler cannot use registers.
  A = $e[0] | 0;
  B = $e[1] | 0;
  C = $e[2] | 0;
  D = $e[3] | 0;
  E = $e[4] | 0;
  F = $e[5] | 0;
  G = $e[6] | 0;
  H = $e[7] | 0;
  constructor() {
    super(32);
  }
};
const vt = /* @__PURE__ */ au(
  () => new Jf(),
  /* @__PURE__ */ qf(1)
);
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const xo = /* @__PURE__ */ BigInt(0), Us = /* @__PURE__ */ BigInt(1);
function ii(e, t = "") {
  if (typeof e != "boolean") {
    const n = t && `"${t}" `;
    throw new Error(n + "expected boolean, got type=" + typeof e);
  }
  return e;
}
function uu(e) {
  if (typeof e == "bigint") {
    if (!zr(e))
      throw new Error("positive bigint expected, got " + e);
  } else
    ze(e);
  return e;
}
function Ar(e) {
  const t = uu(e).toString(16);
  return t.length & 1 ? "0" + t : t;
}
function lu(e) {
  if (typeof e != "string")
    throw new Error("hex string expected, got " + typeof e);
  return e === "" ? xo : BigInt("0x" + e);
}
function Oe(e) {
  return lu(Ci(e));
}
function fu(e) {
  return lu(Ci(td(Y(e)).reverse()));
}
function Er(e, t) {
  ze(t), e = uu(e);
  const n = ri(e.toString(16).padStart(t * 2, "0"));
  if (n.length !== t)
    throw new Error("number too large");
  return n;
}
function du(e, t) {
  return Er(e, t).reverse();
}
function lr(e, t) {
  if (e.length !== t.length)
    return !1;
  let n = 0;
  for (let r = 0; r < e.length; r++)
    n |= e[r] ^ t[r];
  return n === 0;
}
function td(e) {
  return Uint8Array.from(e);
}
function ed(e) {
  return Uint8Array.from(e, (t, n) => {
    const r = t.charCodeAt(0);
    if (t.length !== 1 || r > 127)
      throw new Error(`string contains non-ASCII character "${e[n]}" with code ${r} at position ${n}`);
    return r;
  });
}
const zr = (e) => typeof e == "bigint" && xo <= e;
function nd(e, t, n) {
  return zr(e) && zr(t) && zr(n) && t <= e && e < n;
}
function hu(e, t, n, r) {
  if (!nd(t, n, r))
    throw new Error("expected valid " + e + ": " + n + " <= n < " + r + ", got " + t);
}
function rd(e) {
  let t;
  for (t = 0; e > xo; e >>= Us, t += 1)
    ;
  return t;
}
const To = (e) => (Us << BigInt(e)) - Us;
function id(e, t, n) {
  if (ze(e, "hashLen"), ze(t, "qByteLen"), typeof n != "function")
    throw new Error("hmacFn must be a function");
  const r = (w) => new Uint8Array(w), i = Uint8Array.of(), s = Uint8Array.of(0), o = Uint8Array.of(1), a = 1e3;
  let c = r(e), u = r(e), l = 0;
  const d = () => {
    c.fill(1), u.fill(0), l = 0;
  }, p = (...w) => n(u, Jt(c, ...w)), g = (w = i) => {
    u = p(s, w), c = p(), w.length !== 0 && (u = p(o, w), c = p());
  }, f = () => {
    if (l++ >= a)
      throw new Error("drbg: tried max amount of iterations");
    let w = 0;
    const E = [];
    for (; w < t; ) {
      c = p();
      const S = c.slice();
      E.push(S), w += c.length;
    }
    return Jt(...E);
  };
  return (w, E) => {
    d(), g(w);
    let S;
    for (; !(S = E(f())); )
      g();
    return d(), S;
  };
}
function So(e, t = {}, n = {}) {
  if (!e || typeof e != "object")
    throw new Error("expected valid options object");
  function r(s, o, a) {
    const c = e[s];
    if (a && c === void 0)
      return;
    const u = typeof c;
    if (u !== o || c === null)
      throw new Error(`param "${s}" is invalid: expected ${o}, got ${u}`);
  }
  const i = (s, o) => Object.entries(s).forEach(([a, c]) => r(a, c, o));
  i(t, !1), i(n, !0);
}
function ya(e) {
  const t = /* @__PURE__ */ new WeakMap();
  return (n, ...r) => {
    const i = t.get(n);
    if (i !== void 0)
      return i;
    const s = e(n, ...r);
    return t.set(n, s), s;
  };
}
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const Nt = /* @__PURE__ */ BigInt(0), At = /* @__PURE__ */ BigInt(1), on = /* @__PURE__ */ BigInt(2), pu = /* @__PURE__ */ BigInt(3), gu = /* @__PURE__ */ BigInt(4), yu = /* @__PURE__ */ BigInt(5), sd = /* @__PURE__ */ BigInt(7), wu = /* @__PURE__ */ BigInt(8), od = /* @__PURE__ */ BigInt(9), mu = /* @__PURE__ */ BigInt(16);
function Yt(e, t) {
  const n = e % t;
  return n >= Nt ? n : t + n;
}
function Kt(e, t, n) {
  let r = e;
  for (; t-- > Nt; )
    r *= r, r %= n;
  return r;
}
function wa(e, t) {
  if (e === Nt)
    throw new Error("invert: expected non-zero number");
  if (t <= Nt)
    throw new Error("invert: expected positive modulus, got " + t);
  let n = Yt(e, t), r = t, i = Nt, s = At;
  for (; n !== Nt; ) {
    const a = r / n, c = r % n, u = i - s * a;
    r = n, n = c, i = s, s = u;
  }
  if (r !== At)
    throw new Error("invert: does not exist");
  return Yt(i, t);
}
function vo(e, t, n) {
  if (!e.eql(e.sqr(t), n))
    throw new Error("Cannot find square root");
}
function bu(e, t) {
  const n = (e.ORDER + At) / gu, r = e.pow(t, n);
  return vo(e, r, t), r;
}
function ad(e, t) {
  const n = (e.ORDER - yu) / wu, r = e.mul(t, on), i = e.pow(r, n), s = e.mul(t, i), o = e.mul(e.mul(s, on), i), a = e.mul(s, e.sub(o, e.ONE));
  return vo(e, a, t), a;
}
function cd(e) {
  const t = Pi(e), n = Eu(e), r = n(t, t.neg(t.ONE)), i = n(t, r), s = n(t, t.neg(r)), o = (e + sd) / mu;
  return (a, c) => {
    let u = a.pow(c, o), l = a.mul(u, r);
    const d = a.mul(u, i), p = a.mul(u, s), g = a.eql(a.sqr(l), c), f = a.eql(a.sqr(d), c);
    u = a.cmov(u, l, g), l = a.cmov(p, d, f);
    const h = a.eql(a.sqr(l), c), w = a.cmov(u, l, h);
    return vo(a, w, c), w;
  };
}
function Eu(e) {
  if (e < pu)
    throw new Error("sqrt is not defined for small field");
  let t = e - At, n = 0;
  for (; t % on === Nt; )
    t /= on, n++;
  let r = on;
  const i = Pi(e);
  for (; ma(i, r) === 1; )
    if (r++ > 1e3)
      throw new Error("Cannot find square root: probably non-prime P");
  if (n === 1)
    return bu;
  let s = i.pow(r, t);
  const o = (t + At) / on;
  return function(c, u) {
    if (c.is0(u))
      return u;
    if (ma(c, u) !== 1)
      throw new Error("Cannot find square root");
    let l = n, d = c.mul(c.ONE, s), p = c.pow(u, t), g = c.pow(u, o);
    for (; !c.eql(p, c.ONE); ) {
      if (c.is0(p))
        return c.ZERO;
      let f = 1, h = c.sqr(p);
      for (; !c.eql(h, c.ONE); )
        if (f++, h = c.sqr(h), f === l)
          throw new Error("Cannot find square root");
      const w = At << BigInt(l - f - 1), E = c.pow(d, w);
      l = f, d = c.sqr(E), p = c.mul(p, d), g = c.mul(g, E);
    }
    return g;
  };
}
function ud(e) {
  return e % gu === pu ? bu : e % wu === yu ? ad : e % mu === od ? cd(e) : Eu(e);
}
const ld = [
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
function fd(e) {
  const t = {
    ORDER: "bigint",
    BYTES: "number",
    BITS: "number"
  }, n = ld.reduce((r, i) => (r[i] = "function", r), t);
  return So(e, n), e;
}
function dd(e, t, n) {
  if (n < Nt)
    throw new Error("invalid exponent, negatives unsupported");
  if (n === Nt)
    return e.ONE;
  if (n === At)
    return t;
  let r = e.ONE, i = t;
  for (; n > Nt; )
    n & At && (r = e.mul(r, i)), i = e.sqr(i), n >>= At;
  return r;
}
function xu(e, t, n = !1) {
  const r = new Array(t.length).fill(n ? e.ZERO : void 0), i = t.reduce((o, a, c) => e.is0(a) ? o : (r[c] = o, e.mul(o, a)), e.ONE), s = e.inv(i);
  return t.reduceRight((o, a, c) => e.is0(a) ? o : (r[c] = e.mul(o, r[c]), e.mul(o, a)), s), r;
}
function ma(e, t) {
  const n = (e.ORDER - At) / on, r = e.pow(t, n), i = e.eql(r, e.ONE), s = e.eql(r, e.ZERO), o = e.eql(r, e.neg(e.ONE));
  if (!i && !s && !o)
    throw new Error("invalid Legendre symbol result");
  return i ? 1 : s ? 0 : -1;
}
function hd(e, t) {
  t !== void 0 && ze(t);
  const n = t !== void 0 ? t : e.toString(2).length, r = Math.ceil(n / 8);
  return { nBitLength: n, nByteLength: r };
}
let pd = class {
  ORDER;
  BITS;
  BYTES;
  isLE;
  ZERO = Nt;
  ONE = At;
  _lengths;
  _sqrt;
  // cached sqrt
  _mod;
  constructor(t, n = {}) {
    if (t <= Nt)
      throw new Error("invalid field: expected ORDER > 0, got " + t);
    let r;
    this.isLE = !1, n != null && typeof n == "object" && (typeof n.BITS == "number" && (r = n.BITS), typeof n.sqrt == "function" && (this.sqrt = n.sqrt), typeof n.isLE == "boolean" && (this.isLE = n.isLE), n.allowedLengths && (this._lengths = n.allowedLengths?.slice()), typeof n.modFromBytes == "boolean" && (this._mod = n.modFromBytes));
    const { nBitLength: i, nByteLength: s } = hd(t, r);
    if (s > 2048)
      throw new Error("invalid field: expected ORDER of <= 2048 bytes");
    this.ORDER = t, this.BITS = i, this.BYTES = s, this._sqrt = void 0, Object.preventExtensions(this);
  }
  create(t) {
    return Yt(t, this.ORDER);
  }
  isValid(t) {
    if (typeof t != "bigint")
      throw new Error("invalid field element: expected bigint, got " + typeof t);
    return Nt <= t && t < this.ORDER;
  }
  is0(t) {
    return t === Nt;
  }
  // is valid and invertible
  isValidNot0(t) {
    return !this.is0(t) && this.isValid(t);
  }
  isOdd(t) {
    return (t & At) === At;
  }
  neg(t) {
    return Yt(-t, this.ORDER);
  }
  eql(t, n) {
    return t === n;
  }
  sqr(t) {
    return Yt(t * t, this.ORDER);
  }
  add(t, n) {
    return Yt(t + n, this.ORDER);
  }
  sub(t, n) {
    return Yt(t - n, this.ORDER);
  }
  mul(t, n) {
    return Yt(t * n, this.ORDER);
  }
  pow(t, n) {
    return dd(this, t, n);
  }
  div(t, n) {
    return Yt(t * wa(n, this.ORDER), this.ORDER);
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
    return wa(t, this.ORDER);
  }
  sqrt(t) {
    return this._sqrt || (this._sqrt = ud(this.ORDER)), this._sqrt(this, t);
  }
  toBytes(t) {
    return this.isLE ? du(t, this.BYTES) : Er(t, this.BYTES);
  }
  fromBytes(t, n = !1) {
    Y(t);
    const { _lengths: r, BYTES: i, isLE: s, ORDER: o, _mod: a } = this;
    if (r) {
      if (!r.includes(t.length) || t.length > i)
        throw new Error("Field.fromBytes: expected " + r + " bytes, got " + t.length);
      const u = new Uint8Array(i);
      u.set(t, s ? 0 : u.length - t.length), t = u;
    }
    if (t.length !== i)
      throw new Error("Field.fromBytes: expected " + i + " bytes, got " + t.length);
    let c = s ? fu(t) : Oe(t);
    if (a && (c = Yt(c, o)), !n && !this.isValid(c))
      throw new Error("invalid field element: outside of range 0..ORDER");
    return c;
  }
  // TODO: we don't need it here, move out to separate fn
  invertBatch(t) {
    return xu(this, t);
  }
  // We can't move this out because Fp6, Fp12 implement it
  // and it's unclear what to return in there.
  cmov(t, n, r) {
    return r ? n : t;
  }
};
function Pi(e, t = {}) {
  return new pd(e, t);
}
function Tu(e) {
  if (typeof e != "bigint")
    throw new Error("field order must be bigint");
  const t = e.toString(2).length;
  return Math.ceil(t / 8);
}
function Su(e) {
  const t = Tu(e);
  return t + Math.ceil(t / 2);
}
function vu(e, t, n = !1) {
  Y(e);
  const r = e.length, i = Tu(t), s = Su(t);
  if (r < 16 || r < s || r > 1024)
    throw new Error("expected " + s + "-1024 bytes of input, got " + r);
  const o = n ? fu(e) : Oe(e), a = Yt(o, t - At) + At;
  return n ? du(a, i) : Er(a, i);
}
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const $n = /* @__PURE__ */ BigInt(0), an = /* @__PURE__ */ BigInt(1);
function si(e, t) {
  const n = t.negate();
  return e ? n : t;
}
function ba(e, t) {
  const n = xu(e.Fp, t.map((r) => r.Z));
  return t.map((r, i) => e.fromAffine(r.toAffine(n[i])));
}
function ku(e, t) {
  if (!Number.isSafeInteger(e) || e <= 0 || e > t)
    throw new Error("invalid window size, expected [1.." + t + "], got W=" + e);
}
function os(e, t) {
  ku(e, t);
  const n = Math.ceil(t / e) + 1, r = 2 ** (e - 1), i = 2 ** e, s = To(e), o = BigInt(e);
  return { windows: n, windowSize: r, mask: s, maxNumber: i, shiftBy: o };
}
function Ea(e, t, n) {
  const { windowSize: r, mask: i, maxNumber: s, shiftBy: o } = n;
  let a = Number(e & i), c = e >> o;
  a > r && (a -= s, c += an);
  const u = t * r, l = u + Math.abs(a) - 1, d = a === 0, p = a < 0, g = t % 2 !== 0;
  return { nextN: c, offset: l, isZero: d, isNeg: p, isNegF: g, offsetF: u };
}
const as = /* @__PURE__ */ new WeakMap(), Au = /* @__PURE__ */ new WeakMap();
function cs(e) {
  return Au.get(e) || 1;
}
function xa(e) {
  if (e !== $n)
    throw new Error("invalid wNAF");
}
let gd = class {
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
    let i = t;
    for (; n > $n; )
      n & an && (r = r.add(i)), i = i.double(), n >>= an;
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
    const { windows: r, windowSize: i } = os(n, this.bits), s = [];
    let o = t, a = o;
    for (let c = 0; c < r; c++) {
      a = o, s.push(a);
      for (let u = 1; u < i; u++)
        a = a.add(o), s.push(a);
      o = a.double();
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
    let i = this.ZERO, s = this.BASE;
    const o = os(t, this.bits);
    for (let a = 0; a < o.windows; a++) {
      const { nextN: c, offset: u, isZero: l, isNeg: d, isNegF: p, offsetF: g } = Ea(r, a, o);
      r = c, l ? s = s.add(si(p, n[g])) : i = i.add(si(d, n[u]));
    }
    return xa(r), { p: i, f: s };
  }
  /**
   * Implements ec unsafe (non const-time) multiplication using precomputed tables and w-ary non-adjacent form.
   * @param acc accumulator point to add result of multiplication
   * @returns point
   */
  wNAFUnsafe(t, n, r, i = this.ZERO) {
    const s = os(t, this.bits);
    for (let o = 0; o < s.windows && r !== $n; o++) {
      const { nextN: a, offset: c, isZero: u, isNeg: l } = Ea(r, o, s);
      if (r = a, !u) {
        const d = n[c];
        i = i.add(l ? d.negate() : d);
      }
    }
    return xa(r), i;
  }
  getPrecomputes(t, n, r) {
    let i = as.get(n);
    return i || (i = this.precomputeWindow(n, t), t !== 1 && (typeof r == "function" && (i = r(i)), as.set(n, i))), i;
  }
  cached(t, n, r) {
    const i = cs(t);
    return this.wNAF(i, this.getPrecomputes(i, t, r), n);
  }
  unsafe(t, n, r, i) {
    const s = cs(t);
    return s === 1 ? this._unsafeLadder(t, n, i) : this.wNAFUnsafe(s, this.getPrecomputes(s, t, r), n, i);
  }
  // We calculate precomputes for elliptic curve point multiplication
  // using windowed method. This specifies window size and
  // stores precomputed values. Usually only base point would be precomputed.
  createCache(t, n) {
    ku(n, this.bits), Au.set(t, n), as.delete(t);
  }
  hasCache(t) {
    return cs(t) !== 1;
  }
};
function yd(e, t, n, r) {
  let i = t, s = e.ZERO, o = e.ZERO;
  for (; n > $n || r > $n; )
    n & an && (s = s.add(i)), r & an && (o = o.add(i)), i = i.double(), n >>= an, r >>= an;
  return { p1: s, p2: o };
}
function Ta(e, t, n) {
  if (t) {
    if (t.ORDER !== e)
      throw new Error("Field.ORDER must match order: Fp == p, Fn == n");
    return fd(t), t;
  } else
    return Pi(e, { isLE: n });
}
function wd(e, t, n = {}, r) {
  if (r === void 0 && (r = e === "edwards"), !t || typeof t != "object")
    throw new Error(`expected valid ${e} CURVE object`);
  for (const c of ["p", "n", "h"]) {
    const u = t[c];
    if (!(typeof u == "bigint" && u > $n))
      throw new Error(`CURVE.${c} must be positive bigint`);
  }
  const i = Ta(t.p, n.Fp, r), s = Ta(t.n, n.Fn, r), a = ["Gx", "Gy", "a", "b"];
  for (const c of a)
    if (!i.isValid(t[c]))
      throw new Error(`CURVE.${c} must be valid field element of CURVE.Fp`);
  return t = Object.freeze(Object.assign({}, t)), { CURVE: t, Fp: i, Fn: s };
}
function Iu(e, t) {
  return function(r) {
    const i = e(r);
    return { secretKey: i, publicKey: t(i) };
  };
}
let Ou = class {
  oHash;
  iHash;
  blockLen;
  outputLen;
  finished = !1;
  destroyed = !1;
  constructor(t, n) {
    if (su(t), Y(n, void 0, "key"), this.iHash = t.create(), typeof this.iHash.update != "function")
      throw new Error("Expected instance of class which extends utils.Hash");
    this.blockLen = this.iHash.blockLen, this.outputLen = this.iHash.outputLen;
    const r = this.blockLen, i = new Uint8Array(r);
    i.set(n.length > r ? t.create().update(n).digest() : n);
    for (let s = 0; s < i.length; s++)
      i[s] ^= 54;
    this.iHash.update(i), this.oHash = t.create();
    for (let s = 0; s < i.length; s++)
      i[s] ^= 106;
    this.oHash.update(i), Bn(i);
  }
  update(t) {
    return ni(this), this.iHash.update(t), this;
  }
  digestInto(t) {
    ni(this), Y(t, this.outputLen, "output"), this.finished = !0, this.iHash.digestInto(t), this.oHash.update(t), this.oHash.digestInto(t), this.destroy();
  }
  digest() {
    const t = new Uint8Array(this.oHash.outputLen);
    return this.digestInto(t), t;
  }
  _cloneInto(t) {
    t ||= Object.create(Object.getPrototypeOf(this), {});
    const { oHash: n, iHash: r, finished: i, destroyed: s, blockLen: o, outputLen: a } = this;
    return t = t, t.finished = i, t.destroyed = s, t.blockLen = o, t.outputLen = a, t.oHash = n._cloneInto(t.oHash), t.iHash = r._cloneInto(t.iHash), t;
  }
  clone() {
    return this._cloneInto();
  }
  destroy() {
    this.destroyed = !0, this.oHash.destroy(), this.iHash.destroy();
  }
};
const Bu = (e, t, n) => new Ou(e, t).update(n).digest();
Bu.create = (e, t) => new Ou(e, t);
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const Sa = (e, t) => (e + (e >= 0 ? t : -t) / $u) / t;
function md(e, t, n) {
  const [[r, i], [s, o]] = t, a = Sa(o * e, n), c = Sa(-i * e, n);
  let u = e - a * r - c * s, l = -a * i - c * o;
  const d = u < xe, p = l < xe;
  d && (u = -u), p && (l = -l);
  const g = To(Math.ceil(rd(n) / 2)) + Sn;
  if (u < xe || u >= g || l < xe || l >= g)
    throw new Error("splitScalar (endomorphism): failed, k=" + e);
  return { k1neg: d, k1: u, k2neg: p, k2: l };
}
function Ls(e) {
  if (!["compact", "recovered", "der"].includes(e))
    throw new Error('Signature format must be "compact", "recovered", or "der"');
  return e;
}
function us(e, t) {
  const n = {};
  for (let r of Object.keys(t))
    n[r] = e[r] === void 0 ? t[r] : e[r];
  return ii(n.lowS, "lowS"), ii(n.prehash, "prehash"), n.format !== void 0 && Ls(n.format), n;
}
let bd = class extends Error {
  constructor(t = "") {
    super(t);
  }
};
const Pe = {
  // asn.1 DER encoding utils
  Err: bd,
  // Basic building block is TLV (Tag-Length-Value)
  _tlv: {
    encode: (e, t) => {
      const { Err: n } = Pe;
      if (e < 0 || e > 256)
        throw new n("tlv.encode: wrong tag");
      if (t.length & 1)
        throw new n("tlv.encode: unpadded data");
      const r = t.length / 2, i = Ar(r);
      if (i.length / 2 & 128)
        throw new n("tlv.encode: long form length too big");
      const s = r > 127 ? Ar(i.length / 2 | 128) : "";
      return Ar(e) + s + i + t;
    },
    // v - value, l - left bytes (unparsed)
    decode(e, t) {
      const { Err: n } = Pe;
      let r = 0;
      if (e < 0 || e > 256)
        throw new n("tlv.encode: wrong tag");
      if (t.length < 2 || t[r++] !== e)
        throw new n("tlv.decode: wrong tlv");
      const i = t[r++], s = !!(i & 128);
      let o = 0;
      if (!s)
        o = i;
      else {
        const c = i & 127;
        if (!c)
          throw new n("tlv.decode(long): indefinite length not supported");
        if (c > 4)
          throw new n("tlv.decode(long): byte length is too big");
        const u = t.subarray(r, r + c);
        if (u.length !== c)
          throw new n("tlv.decode: length bytes not complete");
        if (u[0] === 0)
          throw new n("tlv.decode(long): zero leftmost byte");
        for (const l of u)
          o = o << 8 | l;
        if (r += c, o < 128)
          throw new n("tlv.decode(long): not minimal encoding");
      }
      const a = t.subarray(r, r + o);
      if (a.length !== o)
        throw new n("tlv.decode: wrong value length");
      return { v: a, l: t.subarray(r + o) };
    }
  },
  // https://crypto.stackexchange.com/a/57734 Leftmost bit of first byte is 'negative' flag,
  // since we always use positive integers here. It must always be empty:
  // - add zero byte if exists
  // - if next byte doesn't have a flag, leading zero is not allowed (minimal encoding)
  _int: {
    encode(e) {
      const { Err: t } = Pe;
      if (e < xe)
        throw new t("integer: negative integers are not allowed");
      let n = Ar(e);
      if (Number.parseInt(n[0], 16) & 8 && (n = "00" + n), n.length & 1)
        throw new t("unexpected DER parsing assertion: unpadded hex");
      return n;
    },
    decode(e) {
      const { Err: t } = Pe;
      if (e[0] & 128)
        throw new t("invalid signature integer: negative");
      if (e[0] === 0 && !(e[1] & 128))
        throw new t("invalid signature integer: unnecessary leading zero");
      return Oe(e);
    }
  },
  toSig(e) {
    const { Err: t, _int: n, _tlv: r } = Pe, i = Y(e, void 0, "signature"), { v: s, l: o } = r.decode(48, i);
    if (o.length)
      throw new t("invalid signature: left bytes after parsing");
    const { v: a, l: c } = r.decode(2, s), { v: u, l } = r.decode(2, c);
    if (l.length)
      throw new t("invalid signature: left bytes after parsing");
    return { r: n.decode(a), s: n.decode(u) };
  },
  hexFromSig(e) {
    const { _tlv: t, _int: n } = Pe, r = t.encode(2, n.encode(e.r)), i = t.encode(2, n.encode(e.s)), s = r + i;
    return t.encode(48, s);
  }
}, xe = BigInt(0), Sn = BigInt(1), $u = BigInt(2), Ir = BigInt(3), Ed = BigInt(4);
function xd(e, t = {}) {
  const n = wd("weierstrass", e, t), { Fp: r, Fn: i } = n;
  let s = n.CURVE;
  const { h: o, n: a } = s;
  So(t, {}, {
    allowInfinityPoint: "boolean",
    clearCofactor: "function",
    isTorsionFree: "function",
    fromBytes: "function",
    toBytes: "function",
    endo: "object"
  });
  const { endo: c } = t;
  if (c && (!r.is0(s.a) || typeof c.beta != "bigint" || !Array.isArray(c.basises)))
    throw new Error('invalid endo: expected "beta": bigint and "basises": array');
  const u = Ru(r, i);
  function l() {
    if (!r.isOdd)
      throw new Error("compression is not supported: Field does not have .isOdd()");
  }
  function d(D, x, b) {
    const { x: y, y: T } = x.toAffine(), A = r.toBytes(y);
    if (ii(b, "isCompressed"), b) {
      l();
      const $ = !r.isOdd(T);
      return Jt(Nu($), A);
    } else
      return Jt(Uint8Array.of(4), A, r.toBytes(T));
  }
  function p(D) {
    Y(D, void 0, "Point");
    const { publicKey: x, publicKeyUncompressed: b } = u, y = D.length, T = D[0], A = D.subarray(1);
    if (y === x && (T === 2 || T === 3)) {
      const $ = r.fromBytes(A);
      if (!r.isValid($))
        throw new Error("bad point: is not on curve, wrong x");
      const I = h($);
      let v;
      try {
        v = r.sqrt(I);
      } catch (G) {
        const F = G instanceof Error ? ": " + G.message : "";
        throw new Error("bad point: is not on curve, sqrt error" + F);
      }
      l();
      const N = r.isOdd(v);
      return (T & 1) === 1 !== N && (v = r.neg(v)), { x: $, y: v };
    } else if (y === b && T === 4) {
      const $ = r.BYTES, I = r.fromBytes(A.subarray(0, $)), v = r.fromBytes(A.subarray($, $ * 2));
      if (!w(I, v))
        throw new Error("bad point: is not on curve");
      return { x: I, y: v };
    } else
      throw new Error(`bad point: got length ${y}, expected compressed=${x} or uncompressed=${b}`);
  }
  const g = t.toBytes || d, f = t.fromBytes || p;
  function h(D) {
    const x = r.sqr(D), b = r.mul(x, D);
    return r.add(r.add(b, r.mul(D, s.a)), s.b);
  }
  function w(D, x) {
    const b = r.sqr(x), y = h(D);
    return r.eql(b, y);
  }
  if (!w(s.Gx, s.Gy))
    throw new Error("bad curve params: generator point");
  const E = r.mul(r.pow(s.a, Ir), Ed), S = r.mul(r.sqr(s.b), BigInt(27));
  if (r.is0(r.add(E, S)))
    throw new Error("bad curve params: a or b");
  function O(D, x, b = !1) {
    if (!r.isValid(x) || b && r.is0(x))
      throw new Error(`bad point coordinate ${D}`);
    return x;
  }
  function R(D) {
    if (!(D instanceof _))
      throw new Error("Weierstrass Point expected");
  }
  function L(D) {
    if (!c || !c.basises)
      throw new Error("no endo");
    return md(D, c.basises, i.ORDER);
  }
  const P = ya((D, x) => {
    const { X: b, Y: y, Z: T } = D;
    if (r.eql(T, r.ONE))
      return { x: b, y };
    const A = D.is0();
    x == null && (x = A ? r.ONE : r.inv(T));
    const $ = r.mul(b, x), I = r.mul(y, x), v = r.mul(T, x);
    if (A)
      return { x: r.ZERO, y: r.ZERO };
    if (!r.eql(v, r.ONE))
      throw new Error("invZ was invalid");
    return { x: $, y: I };
  }), m = ya((D) => {
    if (D.is0()) {
      if (t.allowInfinityPoint && !r.is0(D.Y))
        return;
      throw new Error("bad point: ZERO");
    }
    const { x, y: b } = D.toAffine();
    if (!r.isValid(x) || !r.isValid(b))
      throw new Error("bad point: x or y not field elements");
    if (!w(x, b))
      throw new Error("bad point: equation left != right");
    if (!D.isTorsionFree())
      throw new Error("bad point: not in prime-order subgroup");
    return !0;
  });
  function Q(D, x, b, y, T) {
    return b = new _(r.mul(b.X, D), b.Y, b.Z), x = si(y, x), b = si(T, b), x.add(b);
  }
  class _ {
    // base / generator point
    static BASE = new _(s.Gx, s.Gy, r.ONE);
    // zero / infinity / identity point
    static ZERO = new _(r.ZERO, r.ONE, r.ZERO);
    // 0, 1, 0
    // math field
    static Fp = r;
    // scalar field
    static Fn = i;
    X;
    Y;
    Z;
    /** Does NOT validate if the point is valid. Use `.assertValidity()`. */
    constructor(x, b, y) {
      this.X = O("x", x), this.Y = O("y", b, !0), this.Z = O("z", y), Object.freeze(this);
    }
    static CURVE() {
      return s;
    }
    /** Does NOT validate if the point is valid. Use `.assertValidity()`. */
    static fromAffine(x) {
      const { x: b, y } = x || {};
      if (!x || !r.isValid(b) || !r.isValid(y))
        throw new Error("invalid affine point");
      if (x instanceof _)
        throw new Error("projective point not allowed");
      return r.is0(b) && r.is0(y) ? _.ZERO : new _(b, y, r.ONE);
    }
    static fromBytes(x) {
      const b = _.fromAffine(f(Y(x, void 0, "point")));
      return b.assertValidity(), b;
    }
    static fromHex(x) {
      return _.fromBytes(ri(x));
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
    precompute(x = 8, b = !0) {
      return lt.createCache(this, x), b || this.multiply(Ir), this;
    }
    // TODO: return `this`
    /** A point on curve is valid if it conforms to equation. */
    assertValidity() {
      m(this);
    }
    hasEvenY() {
      const { y: x } = this.toAffine();
      if (!r.isOdd)
        throw new Error("Field doesn't support isOdd");
      return !r.isOdd(x);
    }
    /** Compare one point to another. */
    equals(x) {
      R(x);
      const { X: b, Y: y, Z: T } = this, { X: A, Y: $, Z: I } = x, v = r.eql(r.mul(b, I), r.mul(A, T)), N = r.eql(r.mul(y, I), r.mul($, T));
      return v && N;
    }
    /** Flips point to one corresponding to (x, -y) in Affine coordinates. */
    negate() {
      return new _(this.X, r.neg(this.Y), this.Z);
    }
    // Renes-Costello-Batina exception-free doubling formula.
    // There is 30% faster Jacobian formula, but it is not complete.
    // https://eprint.iacr.org/2015/1060, algorithm 3
    // Cost: 8M + 3S + 3*a + 2*b3 + 15add.
    double() {
      const { a: x, b } = s, y = r.mul(b, Ir), { X: T, Y: A, Z: $ } = this;
      let I = r.ZERO, v = r.ZERO, N = r.ZERO, U = r.mul(T, T), G = r.mul(A, A), F = r.mul($, $), C = r.mul(T, A);
      return C = r.add(C, C), N = r.mul(T, $), N = r.add(N, N), I = r.mul(x, N), v = r.mul(y, F), v = r.add(I, v), I = r.sub(G, v), v = r.add(G, v), v = r.mul(I, v), I = r.mul(C, I), N = r.mul(y, N), F = r.mul(x, F), C = r.sub(U, F), C = r.mul(x, C), C = r.add(C, N), N = r.add(U, U), U = r.add(N, U), U = r.add(U, F), U = r.mul(U, C), v = r.add(v, U), F = r.mul(A, $), F = r.add(F, F), U = r.mul(F, C), I = r.sub(I, U), N = r.mul(F, G), N = r.add(N, N), N = r.add(N, N), new _(I, v, N);
    }
    // Renes-Costello-Batina exception-free addition formula.
    // There is 30% faster Jacobian formula, but it is not complete.
    // https://eprint.iacr.org/2015/1060, algorithm 1
    // Cost: 12M + 0S + 3*a + 3*b3 + 23add.
    add(x) {
      R(x);
      const { X: b, Y: y, Z: T } = this, { X: A, Y: $, Z: I } = x;
      let v = r.ZERO, N = r.ZERO, U = r.ZERO;
      const G = s.a, F = r.mul(s.b, Ir);
      let C = r.mul(b, A), K = r.mul(y, $), Z = r.mul(T, I), dt = r.add(b, y), z = r.add(A, $);
      dt = r.mul(dt, z), z = r.add(C, K), dt = r.sub(dt, z), z = r.add(b, T);
      let J = r.add(A, I);
      return z = r.mul(z, J), J = r.add(C, Z), z = r.sub(z, J), J = r.add(y, T), v = r.add($, I), J = r.mul(J, v), v = r.add(K, Z), J = r.sub(J, v), U = r.mul(G, z), v = r.mul(F, Z), U = r.add(v, U), v = r.sub(K, U), U = r.add(K, U), N = r.mul(v, U), K = r.add(C, C), K = r.add(K, C), Z = r.mul(G, Z), z = r.mul(F, z), K = r.add(K, Z), Z = r.sub(C, Z), Z = r.mul(G, Z), z = r.add(z, Z), C = r.mul(K, z), N = r.add(N, C), C = r.mul(J, z), v = r.mul(dt, v), v = r.sub(v, C), C = r.mul(dt, K), U = r.mul(J, U), U = r.add(U, C), new _(v, N, U);
    }
    subtract(x) {
      return this.add(x.negate());
    }
    is0() {
      return this.equals(_.ZERO);
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
    multiply(x) {
      const { endo: b } = t;
      if (!i.isValidNot0(x))
        throw new Error("invalid scalar: out of range");
      let y, T;
      const A = ($) => lt.cached(this, $, (I) => ba(_, I));
      if (b) {
        const { k1neg: $, k1: I, k2neg: v, k2: N } = L(x), { p: U, f: G } = A(I), { p: F, f: C } = A(N);
        T = G.add(C), y = Q(b.beta, U, F, $, v);
      } else {
        const { p: $, f: I } = A(x);
        y = $, T = I;
      }
      return ba(_, [y, T])[0];
    }
    /**
     * Non-constant-time multiplication. Uses double-and-add algorithm.
     * It's faster, but should only be used when you don't care about
     * an exposed secret key e.g. sig verification, which works over *public* keys.
     */
    multiplyUnsafe(x) {
      const { endo: b } = t, y = this;
      if (!i.isValid(x))
        throw new Error("invalid scalar: out of range");
      if (x === xe || y.is0())
        return _.ZERO;
      if (x === Sn)
        return y;
      if (lt.hasCache(this))
        return this.multiply(x);
      if (b) {
        const { k1neg: T, k1: A, k2neg: $, k2: I } = L(x), { p1: v, p2: N } = yd(_, y, A, I);
        return Q(b.beta, v, N, T, $);
      } else
        return lt.unsafe(y, x);
    }
    /**
     * Converts Projective point to affine (x, y) coordinates.
     * @param invertedZ Z^-1 (inverted zero) - optional, precomputation is useful for invertBatch
     */
    toAffine(x) {
      return P(this, x);
    }
    /**
     * Checks whether Point is free of torsion elements (is in prime subgroup).
     * Always torsion-free for cofactor=1 curves.
     */
    isTorsionFree() {
      const { isTorsionFree: x } = t;
      return o === Sn ? !0 : x ? x(_, this) : lt.unsafe(this, a).is0();
    }
    clearCofactor() {
      const { clearCofactor: x } = t;
      return o === Sn ? this : x ? x(_, this) : this.multiplyUnsafe(o);
    }
    isSmallOrder() {
      return this.multiplyUnsafe(o).is0();
    }
    toBytes(x = !0) {
      return ii(x, "isCompressed"), this.assertValidity(), g(_, this, x);
    }
    toHex(x = !0) {
      return Ci(this.toBytes(x));
    }
    toString() {
      return `<Point ${this.is0() ? "ZERO" : this.toHex()}>`;
    }
  }
  const et = i.BITS, lt = new gd(_, t.endo ? Math.ceil(et / 2) : et);
  return _.BASE.precompute(8), _;
}
function Nu(e) {
  return Uint8Array.of(e ? 2 : 3);
}
function Ru(e, t) {
  return {
    secretKey: t.BYTES,
    publicKey: 1 + e.BYTES,
    publicKeyUncompressed: 1 + 2 * e.BYTES,
    publicKeyHasPrefix: !0,
    signature: 2 * t.BYTES
  };
}
function Td(e, t = {}) {
  const { Fn: n } = e, r = t.randomBytes || br, i = Object.assign(Ru(e.Fp, n), { seed: Su(n.ORDER) });
  function s(g) {
    try {
      const f = n.fromBytes(g);
      return n.isValidNot0(f);
    } catch {
      return !1;
    }
  }
  function o(g, f) {
    const { publicKey: h, publicKeyUncompressed: w } = i;
    try {
      const E = g.length;
      return f === !0 && E !== h || f === !1 && E !== w ? !1 : !!e.fromBytes(g);
    } catch {
      return !1;
    }
  }
  function a(g = r(i.seed)) {
    return vu(Y(g, i.seed, "seed"), n.ORDER);
  }
  function c(g, f = !0) {
    return e.BASE.multiply(n.fromBytes(g)).toBytes(f);
  }
  function u(g) {
    const { secretKey: f, publicKey: h, publicKeyUncompressed: w } = i;
    if (!Eo(g) || "_lengths" in n && n._lengths || f === h)
      return;
    const E = Y(g, void 0, "key").length;
    return E === h || E === w;
  }
  function l(g, f, h = !0) {
    if (u(g) === !0)
      throw new Error("first arg must be private key");
    if (u(f) === !1)
      throw new Error("second arg must be public key");
    const w = n.fromBytes(g);
    return e.fromBytes(f).multiply(w).toBytes(h);
  }
  const d = {
    isValidSecretKey: s,
    isValidPublicKey: o,
    randomSecretKey: a
  }, p = Iu(a, c);
  return Object.freeze({ getPublicKey: c, getSharedSecret: l, keygen: p, Point: e, utils: d, lengths: i });
}
function Sd(e, t, n = {}) {
  su(t), So(n, {}, {
    hmac: "function",
    lowS: "boolean",
    randomBytes: "function",
    bits2int: "function",
    bits2int_modN: "function"
  }), n = Object.assign({}, n);
  const r = n.randomBytes || br, i = n.hmac || ((b, y) => Bu(t, b, y)), { Fp: s, Fn: o } = e, { ORDER: a, BITS: c } = o, { keygen: u, getPublicKey: l, getSharedSecret: d, utils: p, lengths: g } = Td(e, n), f = {
    prehash: !0,
    lowS: typeof n.lowS == "boolean" ? n.lowS : !0,
    format: "compact",
    extraEntropy: !1
  }, h = a * $u < s.ORDER;
  function w(b) {
    const y = a >> Sn;
    return b > y;
  }
  function E(b, y) {
    if (!o.isValidNot0(y))
      throw new Error(`invalid signature ${b}: out of range 1..Point.Fn.ORDER`);
    return y;
  }
  function S() {
    if (h)
      throw new Error('"recovered" sig type is not supported for cofactor >2 curves');
  }
  function O(b, y) {
    Ls(y);
    const T = g.signature, A = y === "compact" ? T : y === "recovered" ? T + 1 : void 0;
    return Y(b, A);
  }
  class R {
    r;
    s;
    recovery;
    constructor(y, T, A) {
      if (this.r = E("r", y), this.s = E("s", T), A != null) {
        if (S(), ![0, 1, 2, 3].includes(A))
          throw new Error("invalid recovery id");
        this.recovery = A;
      }
      Object.freeze(this);
    }
    static fromBytes(y, T = f.format) {
      O(y, T);
      let A;
      if (T === "der") {
        const { r: N, s: U } = Pe.toSig(Y(y));
        return new R(N, U);
      }
      T === "recovered" && (A = y[0], T = "compact", y = y.subarray(1));
      const $ = g.signature / 2, I = y.subarray(0, $), v = y.subarray($, $ * 2);
      return new R(o.fromBytes(I), o.fromBytes(v), A);
    }
    static fromHex(y, T) {
      return this.fromBytes(ri(y), T);
    }
    assertRecovery() {
      const { recovery: y } = this;
      if (y == null)
        throw new Error("invalid recovery id: must be present");
      return y;
    }
    addRecoveryBit(y) {
      return new R(this.r, this.s, y);
    }
    recoverPublicKey(y) {
      const { r: T, s: A } = this, $ = this.assertRecovery(), I = $ === 2 || $ === 3 ? T + a : T;
      if (!s.isValid(I))
        throw new Error("invalid recovery id: sig.r+curve.n != R.x");
      const v = s.toBytes(I), N = e.fromBytes(Jt(Nu(($ & 1) === 0), v)), U = o.inv(I), G = P(Y(y, void 0, "msgHash")), F = o.create(-G * U), C = o.create(A * U), K = e.BASE.multiplyUnsafe(F).add(N.multiplyUnsafe(C));
      if (K.is0())
        throw new Error("invalid recovery: point at infinify");
      return K.assertValidity(), K;
    }
    // Signatures should be low-s, to prevent malleability.
    hasHighS() {
      return w(this.s);
    }
    toBytes(y = f.format) {
      if (Ls(y), y === "der")
        return ri(Pe.hexFromSig(this));
      const { r: T, s: A } = this, $ = o.toBytes(T), I = o.toBytes(A);
      return y === "recovered" ? (S(), Jt(Uint8Array.of(this.assertRecovery()), $, I)) : Jt($, I);
    }
    toHex(y) {
      return Ci(this.toBytes(y));
    }
  }
  const L = n.bits2int || function(y) {
    if (y.length > 8192)
      throw new Error("input is too large");
    const T = Oe(y), A = y.length * 8 - c;
    return A > 0 ? T >> BigInt(A) : T;
  }, P = n.bits2int_modN || function(y) {
    return o.create(L(y));
  }, m = To(c);
  function Q(b) {
    return hu("num < 2^" + c, b, xe, m), o.toBytes(b);
  }
  function _(b, y) {
    return Y(b, void 0, "message"), y ? Y(t(b), void 0, "prehashed message") : b;
  }
  function et(b, y, T) {
    const { lowS: A, prehash: $, extraEntropy: I } = us(T, f);
    b = _(b, $);
    const v = P(b), N = o.fromBytes(y);
    if (!o.isValidNot0(N))
      throw new Error("invalid private key");
    const U = [Q(N), Q(v)];
    if (I != null && I !== !1) {
      const K = I === !0 ? r(g.secretKey) : I;
      U.push(Y(K, void 0, "extraEntropy"));
    }
    const G = Jt(...U), F = v;
    function C(K) {
      const Z = L(K);
      if (!o.isValidNot0(Z))
        return;
      const dt = o.inv(Z), z = e.BASE.multiply(Z).toAffine(), J = o.create(z.x);
      if (J === xe)
        return;
      const ge = o.create(dt * o.create(F + J * N));
      if (ge === xe)
        return;
      let qn = (z.x === J ? 0 : 2) | Number(z.y & Sn), Yn = ge;
      return A && w(ge) && (Yn = o.neg(ge), qn ^= 1), new R(J, Yn, h ? void 0 : qn);
    }
    return { seed: G, k2sig: C };
  }
  function lt(b, y, T = {}) {
    const { seed: A, k2sig: $ } = et(b, y, T);
    return id(t.outputLen, o.BYTES, i)(A, $).toBytes(T.format);
  }
  function D(b, y, T, A = {}) {
    const { lowS: $, prehash: I, format: v } = us(A, f);
    if (T = Y(T, void 0, "publicKey"), y = _(y, I), !Eo(b)) {
      const N = b instanceof R ? ", use sig.toBytes()" : "";
      throw new Error("verify expects Uint8Array signature" + N);
    }
    O(b, v);
    try {
      const N = R.fromBytes(b, v), U = e.fromBytes(T);
      if ($ && N.hasHighS())
        return !1;
      const { r: G, s: F } = N, C = P(y), K = o.inv(F), Z = o.create(C * K), dt = o.create(G * K), z = e.BASE.multiplyUnsafe(Z).add(U.multiplyUnsafe(dt));
      return z.is0() ? !1 : o.create(z.x) === G;
    } catch {
      return !1;
    }
  }
  function x(b, y, T = {}) {
    const { prehash: A } = us(T, f);
    return y = _(y, A), R.fromBytes(b, "recovered").recoverPublicKey(y).toBytes();
  }
  return Object.freeze({
    keygen: u,
    getPublicKey: l,
    getSharedSecret: d,
    utils: p,
    lengths: g,
    Point: e,
    sign: lt,
    verify: D,
    recoverPublicKey: x,
    Signature: R,
    hash: t
  });
}
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const _i = {
  p: BigInt("0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffefffffc2f"),
  n: BigInt("0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141"),
  h: BigInt(1),
  a: BigInt(0),
  b: BigInt(7),
  Gx: BigInt("0x79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798"),
  Gy: BigInt("0x483ada7726a3c4655da4fbfc0e1108a8fd17b448a68554199c47d08ffb10d4b8")
}, vd = {
  beta: BigInt("0x7ae96a2b657c07106e64479eac3434e99cf0497512f58995c1396c28719501ee"),
  basises: [
    [BigInt("0x3086d221a7d46bcde86c90e49284eb15"), -BigInt("0xe4437ed6010e88286f547fa90abfe4c3")],
    [BigInt("0x114ca50f7a8e2f3f657c1108d9d44cfd8"), BigInt("0x3086d221a7d46bcde86c90e49284eb15")]
  ]
}, kd = /* @__PURE__ */ BigInt(0), Cs = /* @__PURE__ */ BigInt(2);
function Ad(e) {
  const t = _i.p, n = BigInt(3), r = BigInt(6), i = BigInt(11), s = BigInt(22), o = BigInt(23), a = BigInt(44), c = BigInt(88), u = e * e * e % t, l = u * u * e % t, d = Kt(l, n, t) * l % t, p = Kt(d, n, t) * l % t, g = Kt(p, Cs, t) * u % t, f = Kt(g, i, t) * g % t, h = Kt(f, s, t) * f % t, w = Kt(h, a, t) * h % t, E = Kt(w, c, t) * w % t, S = Kt(E, a, t) * h % t, O = Kt(S, n, t) * l % t, R = Kt(O, o, t) * f % t, L = Kt(R, r, t) * u % t, P = Kt(L, Cs, t);
  if (!oi.eql(oi.sqr(P), e))
    throw new Error("Cannot find square root");
  return P;
}
const oi = Pi(_i.p, { sqrt: Ad }), wn = /* @__PURE__ */ xd(_i, {
  Fp: oi,
  endo: vd
}), Ve = /* @__PURE__ */ Sd(wn, vt), va = {};
function ai(e, ...t) {
  let n = va[e];
  if (n === void 0) {
    const r = vt(ed(e));
    n = Jt(r, r), va[e] = n;
  }
  return vt(Jt(n, ...t));
}
const ko = (e) => e.toBytes(!0).slice(1), Ao = (e) => e % Cs === kd;
function Ps(e) {
  const { Fn: t, BASE: n } = wn, r = t.fromBytes(e), i = n.multiply(r);
  return { scalar: Ao(i.y) ? r : t.neg(r), bytes: ko(i) };
}
function Uu(e) {
  const t = oi;
  if (!t.isValidNot0(e))
    throw new Error("invalid x: Fail if x ≥ p");
  const n = t.create(e * e), r = t.create(n * e + BigInt(7));
  let i = t.sqrt(r);
  Ao(i) || (i = t.neg(i));
  const s = wn.fromAffine({ x: e, y: i });
  return s.assertValidity(), s;
}
const sr = Oe;
function Lu(...e) {
  return wn.Fn.create(sr(ai("BIP0340/challenge", ...e)));
}
function ka(e) {
  return Ps(e).bytes;
}
function Id(e, t, n = br(32)) {
  const { Fn: r } = wn, i = Y(e, void 0, "message"), { bytes: s, scalar: o } = Ps(t), a = Y(n, 32, "auxRand"), c = r.toBytes(o ^ sr(ai("BIP0340/aux", a))), u = ai("BIP0340/nonce", c, s, i), { bytes: l, scalar: d } = Ps(u), p = Lu(l, s, i), g = new Uint8Array(64);
  if (g.set(l, 0), g.set(r.toBytes(r.create(d + p * o)), 32), !Cu(g, i, s))
    throw new Error("sign: Invalid signature produced");
  return g;
}
function Cu(e, t, n) {
  const { Fp: r, Fn: i, BASE: s } = wn, o = Y(e, 64, "signature"), a = Y(t, void 0, "message"), c = Y(n, 32, "publicKey");
  try {
    const u = Uu(sr(c)), l = sr(o.subarray(0, 32));
    if (!r.isValidNot0(l))
      return !1;
    const d = sr(o.subarray(32, 64));
    if (!i.isValidNot0(d))
      return !1;
    const p = Lu(i.toBytes(l), ko(u), a), g = s.multiplyUnsafe(d).add(u.multiplyUnsafe(i.neg(p))), { x: f, y: h } = g.toAffine();
    return !(g.is0() || !Ao(h) || f !== l);
  } catch {
    return !1;
  }
}
const Be = /* @__PURE__ */ (() => {
  const n = (r = br(48)) => vu(r, _i.n);
  return {
    keygen: Iu(n, ka),
    getPublicKey: ka,
    sign: Id,
    verify: Cu,
    Point: wn,
    utils: {
      randomSecretKey: n,
      taggedHash: ai,
      lift_x: Uu,
      pointToBytes: ko
    },
    lengths: {
      secretKey: 32,
      publicKey: 32,
      publicKeyHasPrefix: !1,
      signature: 64,
      seed: 48
    }
  };
})(), Od = /* @__PURE__ */ Uint8Array.from([
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
]), Pu = Uint8Array.from(new Array(16).fill(0).map((e, t) => t)), Bd = Pu.map((e) => (9 * e + 5) % 16), _u = /* @__PURE__ */ (() => {
  const n = [[Pu], [Bd]];
  for (let r = 0; r < 4; r++)
    for (let i of n)
      i.push(i[r].map((s) => Od[s]));
  return n;
})(), Du = _u[0], Vu = _u[1], Mu = /* @__PURE__ */ [
  [11, 14, 15, 12, 5, 8, 7, 9, 11, 13, 14, 15, 6, 7, 9, 8],
  [12, 13, 11, 15, 6, 9, 9, 7, 12, 15, 11, 13, 7, 8, 7, 7],
  [13, 15, 14, 11, 7, 7, 6, 8, 13, 14, 13, 12, 5, 5, 6, 9],
  [14, 11, 12, 14, 8, 6, 5, 5, 15, 12, 15, 14, 9, 9, 8, 6],
  [15, 12, 13, 13, 9, 5, 8, 6, 14, 11, 12, 11, 8, 6, 5, 5]
].map((e) => Uint8Array.from(e)), $d = /* @__PURE__ */ Du.map((e, t) => e.map((n) => Mu[t][n])), Nd = /* @__PURE__ */ Vu.map((e, t) => e.map((n) => Mu[t][n])), Rd = /* @__PURE__ */ Uint32Array.from([
  0,
  1518500249,
  1859775393,
  2400959708,
  2840853838
]), Ud = /* @__PURE__ */ Uint32Array.from([
  1352829926,
  1548603684,
  1836072691,
  2053994217,
  0
]);
function Aa(e, t, n, r) {
  return e === 0 ? t ^ n ^ r : e === 1 ? t & n | ~t & r : e === 2 ? (t | ~n) ^ r : e === 3 ? t & r | n & ~r : t ^ (n | ~r);
}
const Or = /* @__PURE__ */ new Uint32Array(16);
class Ld extends cu {
  h0 = 1732584193;
  h1 = -271733879;
  h2 = -1732584194;
  h3 = 271733878;
  h4 = -1009589776;
  constructor() {
    super(64, 20, 8, !0);
  }
  get() {
    const { h0: t, h1: n, h2: r, h3: i, h4: s } = this;
    return [t, n, r, i, s];
  }
  set(t, n, r, i, s) {
    this.h0 = t | 0, this.h1 = n | 0, this.h2 = r | 0, this.h3 = i | 0, this.h4 = s | 0;
  }
  process(t, n) {
    for (let g = 0; g < 16; g++, n += 4)
      Or[g] = t.getUint32(n, !0);
    let r = this.h0 | 0, i = r, s = this.h1 | 0, o = s, a = this.h2 | 0, c = a, u = this.h3 | 0, l = u, d = this.h4 | 0, p = d;
    for (let g = 0; g < 5; g++) {
      const f = 4 - g, h = Rd[g], w = Ud[g], E = Du[g], S = Vu[g], O = $d[g], R = Nd[g];
      for (let L = 0; L < 16; L++) {
        const P = kr(r + Aa(g, s, a, u) + Or[E[L]] + h, O[L]) + d | 0;
        r = d, d = u, u = kr(a, 10) | 0, a = s, s = P;
      }
      for (let L = 0; L < 16; L++) {
        const P = kr(i + Aa(f, o, c, l) + Or[S[L]] + w, R[L]) + p | 0;
        i = p, p = l, l = kr(c, 10) | 0, c = o, o = P;
      }
    }
    this.set(this.h1 + a + l | 0, this.h2 + u + p | 0, this.h3 + d + i | 0, this.h4 + r + o | 0, this.h0 + s + c | 0);
  }
  roundClean() {
    Bn(Or);
  }
  destroy() {
    this.destroyed = !0, Bn(this.buffer), this.set(0, 0, 0, 0, 0);
  }
}
const Cd = /* @__PURE__ */ au(() => new Ld());
/*! scure-base - MIT License (c) 2022 Paul Miller (paulmillr.com) */
function Nn(e) {
  return e instanceof Uint8Array || ArrayBuffer.isView(e) && e.constructor.name === "Uint8Array";
}
function Hu(e) {
  if (!Nn(e))
    throw new Error("Uint8Array expected");
}
function Fu(e, t) {
  return Array.isArray(t) ? t.length === 0 ? !0 : e ? t.every((n) => typeof n == "string") : t.every((n) => Number.isSafeInteger(n)) : !1;
}
function Io(e) {
  if (typeof e != "function")
    throw new Error("function expected");
  return !0;
}
function je(e, t) {
  if (typeof t != "string")
    throw new Error(`${e}: string expected`);
  return !0;
}
function jn(e) {
  if (!Number.isSafeInteger(e))
    throw new Error(`invalid integer: ${e}`);
}
function ci(e) {
  if (!Array.isArray(e))
    throw new Error("array expected");
}
function ui(e, t) {
  if (!Fu(!0, t))
    throw new Error(`${e}: array of strings expected`);
}
function Oo(e, t) {
  if (!Fu(!1, t))
    throw new Error(`${e}: array of numbers expected`);
}
// @__NO_SIDE_EFFECTS__
function xr(...e) {
  const t = (s) => s, n = (s, o) => (a) => s(o(a)), r = e.map((s) => s.encode).reduceRight(n, t), i = e.map((s) => s.decode).reduce(n, t);
  return { encode: r, decode: i };
}
// @__NO_SIDE_EFFECTS__
function Di(e) {
  const t = typeof e == "string" ? e.split("") : e, n = t.length;
  ui("alphabet", t);
  const r = new Map(t.map((i, s) => [i, s]));
  return {
    encode: (i) => (ci(i), i.map((s) => {
      if (!Number.isSafeInteger(s) || s < 0 || s >= n)
        throw new Error(`alphabet.encode: digit index outside alphabet "${s}". Allowed: ${e}`);
      return t[s];
    })),
    decode: (i) => (ci(i), i.map((s) => {
      je("alphabet.decode", s);
      const o = r.get(s);
      if (o === void 0)
        throw new Error(`Unknown letter: "${s}". Allowed: ${e}`);
      return o;
    }))
  };
}
// @__NO_SIDE_EFFECTS__
function Vi(e = "") {
  return je("join", e), {
    encode: (t) => (ui("join.decode", t), t.join(e)),
    decode: (t) => (je("join.decode", t), t.split(e))
  };
}
// @__NO_SIDE_EFFECTS__
function Pd(e, t = "=") {
  return jn(e), je("padding", t), {
    encode(n) {
      for (ui("padding.encode", n); n.length * e % 8; )
        n.push(t);
      return n;
    },
    decode(n) {
      ui("padding.decode", n);
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
function _d(e) {
  return Io(e), { encode: (t) => t, decode: (t) => e(t) };
}
function Ia(e, t, n) {
  if (t < 2)
    throw new Error(`convertRadix: invalid from=${t}, base cannot be less than 2`);
  if (n < 2)
    throw new Error(`convertRadix: invalid to=${n}, base cannot be less than 2`);
  if (ci(e), !e.length)
    return [];
  let r = 0;
  const i = [], s = Array.from(e, (a) => {
    if (jn(a), a < 0 || a >= t)
      throw new Error(`invalid integer: ${a}`);
    return a;
  }), o = s.length;
  for (; ; ) {
    let a = 0, c = !0;
    for (let u = r; u < o; u++) {
      const l = s[u], d = t * a, p = d + l;
      if (!Number.isSafeInteger(p) || d / t !== a || p - l !== d)
        throw new Error("convertRadix: carry overflow");
      const g = p / n;
      a = p % n;
      const f = Math.floor(g);
      if (s[u] = f, !Number.isSafeInteger(f) || f * n + a !== p)
        throw new Error("convertRadix: carry overflow");
      if (c)
        f ? c = !1 : r = u;
      else continue;
    }
    if (i.push(a), c)
      break;
  }
  for (let a = 0; a < e.length - 1 && e[a] === 0; a++)
    i.push(0);
  return i.reverse();
}
const Ku = (e, t) => t === 0 ? e : Ku(t, e % t), li = /* @__NO_SIDE_EFFECTS__ */ (e, t) => e + (t - Ku(e, t)), jr = /* @__PURE__ */ (() => {
  let e = [];
  for (let t = 0; t < 40; t++)
    e.push(2 ** t);
  return e;
})();
function _s(e, t, n, r) {
  if (ci(e), t <= 0 || t > 32)
    throw new Error(`convertRadix2: wrong from=${t}`);
  if (n <= 0 || n > 32)
    throw new Error(`convertRadix2: wrong to=${n}`);
  if (/* @__PURE__ */ li(t, n) > 32)
    throw new Error(`convertRadix2: carry overflow from=${t} to=${n} carryBits=${/* @__PURE__ */ li(t, n)}`);
  let i = 0, s = 0;
  const o = jr[t], a = jr[n] - 1, c = [];
  for (const u of e) {
    if (jn(u), u >= o)
      throw new Error(`convertRadix2: invalid data word=${u} from=${t}`);
    if (i = i << t | u, s + t > 32)
      throw new Error(`convertRadix2: carry overflow pos=${s} from=${t}`);
    for (s += t; s >= n; s -= n)
      c.push((i >> s - n & a) >>> 0);
    const l = jr[s];
    if (l === void 0)
      throw new Error("invalid carry");
    i &= l - 1;
  }
  if (i = i << n - s & a, !r && s >= t)
    throw new Error("Excess padding");
  if (!r && i > 0)
    throw new Error(`Non-zero padding: ${i}`);
  return r && s > 0 && c.push(i >>> 0), c;
}
// @__NO_SIDE_EFFECTS__
function Dd(e) {
  jn(e);
  const t = 2 ** 8;
  return {
    encode: (n) => {
      if (!Nn(n))
        throw new Error("radix.encode input should be Uint8Array");
      return Ia(Array.from(n), t, e);
    },
    decode: (n) => (Oo("radix.decode", n), Uint8Array.from(Ia(n, e, t)))
  };
}
// @__NO_SIDE_EFFECTS__
function Bo(e, t = !1) {
  if (jn(e), e <= 0 || e > 32)
    throw new Error("radix2: bits should be in (0..32]");
  if (/* @__PURE__ */ li(8, e) > 32 || /* @__PURE__ */ li(e, 8) > 32)
    throw new Error("radix2: carry overflow");
  return {
    encode: (n) => {
      if (!Nn(n))
        throw new Error("radix2.encode input should be Uint8Array");
      return _s(Array.from(n), 8, e, !t);
    },
    decode: (n) => (Oo("radix2.decode", n), Uint8Array.from(_s(n, e, 8, t)))
  };
}
function Oa(e) {
  return Io(e), function(...t) {
    try {
      return e.apply(null, t);
    } catch {
    }
  };
}
function Vd(e, t) {
  return jn(e), Io(t), {
    encode(n) {
      if (!Nn(n))
        throw new Error("checksum.encode: input should be Uint8Array");
      const r = t(n).slice(0, e), i = new Uint8Array(n.length + e);
      return i.set(n), i.set(r, n.length), i;
    },
    decode(n) {
      if (!Nn(n))
        throw new Error("checksum.decode: input should be Uint8Array");
      const r = n.slice(0, -e), i = n.slice(-e), s = t(r).slice(0, e);
      for (let o = 0; o < e; o++)
        if (s[o] !== i[o])
          throw new Error("Invalid checksum");
      return r;
    }
  };
}
const Md = typeof Uint8Array.from([]).toBase64 == "function" && typeof Uint8Array.fromBase64 == "function", Hd = (e, t) => {
  je("base64", e);
  const n = /^[A-Za-z0-9=+/]+$/, r = "base64";
  if (e.length > 0 && !n.test(e))
    throw new Error("invalid base64");
  return Uint8Array.fromBase64(e, { alphabet: r, lastChunkHandling: "strict" });
}, pt = Md ? {
  encode(e) {
    return Hu(e), e.toBase64();
  },
  decode(e) {
    return Hd(e);
  }
} : /* @__PURE__ */ xr(/* @__PURE__ */ Bo(6), /* @__PURE__ */ Di("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"), /* @__PURE__ */ Pd(6), /* @__PURE__ */ Vi("")), Fd = /* @__NO_SIDE_EFFECTS__ */ (e) => /* @__PURE__ */ xr(/* @__PURE__ */ Dd(58), /* @__PURE__ */ Di(e), /* @__PURE__ */ Vi("")), Ds = /* @__PURE__ */ Fd("123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"), Kd = (e) => /* @__PURE__ */ xr(Vd(4, (t) => e(e(t))), Ds), Vs = /* @__PURE__ */ xr(/* @__PURE__ */ Di("qpzry9x8gf2tvdw0s3jn54khce6mua7l"), /* @__PURE__ */ Vi("")), Ba = [996825010, 642813549, 513874426, 1027748829, 705979059];
function Zn(e) {
  const t = e >> 25;
  let n = (e & 33554431) << 5;
  for (let r = 0; r < Ba.length; r++)
    (t >> r & 1) === 1 && (n ^= Ba[r]);
  return n;
}
function $a(e, t, n = 1) {
  const r = e.length;
  let i = 1;
  for (let s = 0; s < r; s++) {
    const o = e.charCodeAt(s);
    if (o < 33 || o > 126)
      throw new Error(`Invalid prefix (${e})`);
    i = Zn(i) ^ o >> 5;
  }
  i = Zn(i);
  for (let s = 0; s < r; s++)
    i = Zn(i) ^ e.charCodeAt(s) & 31;
  for (let s of t)
    i = Zn(i) ^ s;
  for (let s = 0; s < 6; s++)
    i = Zn(i);
  return i ^= n, Vs.encode(_s([i % jr[30]], 30, 5, !1));
}
// @__NO_SIDE_EFFECTS__
function zu(e) {
  const t = e === "bech32" ? 1 : 734539939, n = /* @__PURE__ */ Bo(5), r = n.decode, i = n.encode, s = Oa(r);
  function o(d, p, g = 90) {
    je("bech32.encode prefix", d), Nn(p) && (p = Array.from(p)), Oo("bech32.encode", p);
    const f = d.length;
    if (f === 0)
      throw new TypeError(`Invalid prefix length ${f}`);
    const h = f + 7 + p.length;
    if (g !== !1 && h > g)
      throw new TypeError(`Length ${h} exceeds limit ${g}`);
    const w = d.toLowerCase(), E = $a(w, p, t);
    return `${w}1${Vs.encode(p)}${E}`;
  }
  function a(d, p = 90) {
    je("bech32.decode input", d);
    const g = d.length;
    if (g < 8 || p !== !1 && g > p)
      throw new TypeError(`invalid string length: ${g} (${d}). Expected (8..${p})`);
    const f = d.toLowerCase();
    if (d !== f && d !== d.toUpperCase())
      throw new Error("String must be lowercase or uppercase");
    const h = f.lastIndexOf("1");
    if (h === 0 || h === -1)
      throw new Error('Letter "1" must be present between prefix and data only');
    const w = f.slice(0, h), E = f.slice(h + 1);
    if (E.length < 6)
      throw new Error("Data must be at least 6 characters long");
    const S = Vs.decode(E).slice(0, -6), O = $a(w, S, t);
    if (!E.endsWith(O))
      throw new Error(`Invalid checksum in ${d}: expected "${O}"`);
    return { prefix: w, words: S };
  }
  const c = Oa(a);
  function u(d) {
    const { prefix: p, words: g } = a(d, !1);
    return { prefix: p, words: g, bytes: r(g) };
  }
  function l(d, p) {
    return o(d, i(p));
  }
  return {
    encode: o,
    decode: a,
    encodeFromBytes: l,
    decodeToBytes: u,
    decodeUnsafe: c,
    fromWords: r,
    fromWordsUnsafe: s,
    toWords: i
  };
}
const Ms = /* @__PURE__ */ zu("bech32"), En = /* @__PURE__ */ zu("bech32m"), zd = {
  encode: (e) => new TextDecoder().decode(e),
  decode: (e) => new TextEncoder().encode(e)
}, jd = typeof Uint8Array.from([]).toHex == "function" && typeof Uint8Array.fromHex == "function", Wd = {
  encode(e) {
    return Hu(e), e.toHex();
  },
  decode(e) {
    return je("hex", e), Uint8Array.fromHex(e);
  }
}, B = jd ? Wd : /* @__PURE__ */ xr(/* @__PURE__ */ Bo(4), /* @__PURE__ */ Di("0123456789abcdef"), /* @__PURE__ */ Vi(""), /* @__PURE__ */ _d((e) => {
  if (typeof e != "string" || e.length % 2 !== 0)
    throw new TypeError(`hex.decode: expected string, got ${typeof e} with length ${e.length}`);
  return e.toLowerCase();
})), ft = /* @__PURE__ */ Uint8Array.of(), ju = /* @__PURE__ */ Uint8Array.of(0);
function Rn(e, t) {
  if (e.length !== t.length)
    return !1;
  for (let n = 0; n < e.length; n++)
    if (e[n] !== t[n])
      return !1;
  return !0;
}
function Gt(e) {
  return e instanceof Uint8Array || ArrayBuffer.isView(e) && e.constructor.name === "Uint8Array";
}
function Gd(...e) {
  let t = 0;
  for (let r = 0; r < e.length; r++) {
    const i = e[r];
    if (!Gt(i))
      throw new Error("Uint8Array expected");
    t += i.length;
  }
  const n = new Uint8Array(t);
  for (let r = 0, i = 0; r < e.length; r++) {
    const s = e[r];
    n.set(s, i), i += s.length;
  }
  return n;
}
const Wu = (e) => new DataView(e.buffer, e.byteOffset, e.byteLength);
function Tr(e) {
  return Object.prototype.toString.call(e) === "[object Object]";
}
function de(e) {
  return Number.isSafeInteger(e);
}
const $o = {
  equalBytes: Rn,
  isBytes: Gt,
  concatBytes: Gd
}, Gu = (e) => {
  if (e !== null && typeof e != "string" && !ee(e) && !Gt(e) && !de(e))
    throw new Error(`lengthCoder: expected null | number | Uint8Array | CoderType, got ${e} (${typeof e})`);
  return {
    encodeStream(t, n) {
      if (e === null)
        return;
      if (ee(e))
        return e.encodeStream(t, n);
      let r;
      if (typeof e == "number" ? r = e : typeof e == "string" && (r = Ae.resolve(t.stack, e)), typeof r == "bigint" && (r = Number(r)), r === void 0 || r !== n)
        throw t.err(`Wrong length: ${r} len=${e} exp=${n} (${typeof n})`);
    },
    decodeStream(t) {
      let n;
      if (ee(e) ? n = Number(e.decodeStream(t)) : typeof e == "number" ? n = e : typeof e == "string" && (n = Ae.resolve(t.stack, e)), typeof n == "bigint" && (n = Number(n)), typeof n != "number")
        throw t.err(`Wrong length: ${n}`);
      return n;
    }
  };
}, xt = {
  BITS: 32,
  FULL_MASK: -1 >>> 0,
  // 1<<32 will overflow
  len: (e) => Math.ceil(e / 32),
  create: (e) => new Uint32Array(xt.len(e)),
  clean: (e) => e.fill(0),
  debug: (e) => Array.from(e).map((t) => (t >>> 0).toString(2).padStart(32, "0")),
  checkLen: (e, t) => {
    if (xt.len(t) !== e.length)
      throw new Error(`wrong length=${e.length}. Expected: ${xt.len(t)}`);
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
    xt.checkLen(e, t);
    const { FULL_MASK: r, BITS: i } = xt, s = i - t % i, o = s ? r >>> s << s : r, a = [];
    for (let c = 0; c < e.length; c++) {
      let u = e[c];
      if (n && (u = ~u), c === e.length - 1 && (u &= o), u !== 0)
        for (let l = 0; l < i; l++) {
          const d = 1 << i - l - 1;
          u & d && a.push(c * i + l);
        }
    }
    return a;
  },
  range: (e) => {
    const t = [];
    let n;
    for (const r of e)
      n === void 0 || r !== n.pos + n.length ? t.push(n = { pos: r, length: 1 }) : n.length += 1;
    return t;
  },
  rangeDebug: (e, t, n = !1) => `[${xt.range(xt.indices(e, t, n)).map((r) => `(${r.pos}/${r.length})`).join(", ")}]`,
  setRange: (e, t, n, r, i = !0) => {
    xt.chunkLen(t, n, r);
    const { FULL_MASK: s, BITS: o } = xt, a = n % o ? Math.floor(n / o) : void 0, c = n + r, u = c % o ? Math.floor(c / o) : void 0;
    if (a !== void 0 && a === u)
      return xt.set(e, a, s >>> o - r << o - r - n, i);
    if (a !== void 0 && !xt.set(e, a, s >>> n % o, i))
      return !1;
    const l = a !== void 0 ? a + 1 : n / o, d = u !== void 0 ? u : c / o;
    for (let p = l; p < d; p++)
      if (!xt.set(e, p, s, i))
        return !1;
    return !(u !== void 0 && a !== u && !xt.set(e, u, s << o - c % o, i));
  }
}, Ae = {
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
    e.push(r), n((i, s) => {
      r.field = i, s(), r.field = void 0;
    }), e.pop();
  },
  path: (e) => {
    const t = [];
    for (const n of e)
      n.field !== void 0 && t.push(n.field);
    return t.join("/");
  },
  err: (e, t, n) => {
    const r = new Error(`${e}(${Ae.path(t)}): ${typeof n == "string" ? n : n.message}`);
    return n instanceof Error && n.stack && (r.stack = n.stack), r;
  },
  resolve: (e, t) => {
    const n = t.split("/"), r = e.map((o) => o.obj);
    let i = 0;
    for (; i < n.length && n[i] === ".."; i++)
      r.pop();
    let s = r.pop();
    for (; i < n.length; i++) {
      if (!s || s[n[i]] === void 0)
        return;
      s = s[n[i]];
    }
    return s;
  }
};
class No {
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
  constructor(t, n = {}, r = [], i = void 0, s = 0) {
    this.data = t, this.opts = n, this.stack = r, this.parent = i, this.parentOffset = s, this.view = Wu(t);
  }
  /** Internal method for pointers. */
  _enablePointers() {
    if (this.parent)
      return this.parent._enablePointers();
    this.bs || (this.bs = xt.create(this.data.length), xt.setRange(this.bs, this.data.length, 0, this.pos, this.opts.allowMultipleReads));
  }
  markBytesBS(t, n) {
    return this.parent ? this.parent.markBytesBS(this.parentOffset + t, n) : !n || !this.bs ? !0 : xt.setRange(this.bs, this.data.length, t, n, !1);
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
    return Ae.pushObj(this.stack, t, n);
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
        throw this.err(`${this.bitPos} bits left after unpack: ${B.encode(this.data.slice(this.pos))}`);
      if (this.bs && !this.parent) {
        const t = xt.indices(this.bs, this.data.length, !0);
        if (t.length) {
          const n = xt.range(t).map(({ pos: r, length: i }) => `(${r}/${i})[${B.encode(this.data.subarray(r, r + i))}]`).join(", ");
          throw this.err(`unread byte ranges: ${n} (total=${this.data.length})`);
        } else
          return;
      }
      if (!this.isEnd())
        throw this.err(`${this.leftBytes} bytes ${this.bitPos} bits left after unpack: ${B.encode(this.data.slice(this.pos))}`);
    }
  }
  // User methods
  err(t) {
    return Ae.err("Reader", this.stack, t);
  }
  offsetReader(t) {
    if (t > this.data.length)
      throw this.err("offsetReader: Unexpected end of buffer");
    return new No(this.absBytes(t), this.opts, this.stack, this, t);
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
    if (!Gt(t))
      throw this.err(`find: needle is not bytes! ${t}`);
    if (this.bitPos)
      throw this.err("findByte: bitPos not empty");
    if (!t.length)
      throw this.err("find: needle is empty");
    for (let r = n; (r = this.data.indexOf(t[0], r)) !== -1; r++) {
      if (r === -1 || this.data.length - r < t.length)
        return;
      if (Rn(t, this.data.subarray(r, r + t.length)))
        return r;
    }
  }
}
class qd {
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
    this.stack = t, this.view = Wu(this.viewBuf);
  }
  pushObj(t, n) {
    return Ae.pushObj(this.stack, t, n);
  }
  writeView(t, n) {
    if (this.finished)
      throw this.err("buffer: finished");
    if (!de(t) || t > 8)
      throw new Error(`wrong writeView length=${t}`);
    n(this.view), this.bytes(this.viewBuf.slice(0, t)), this.viewBuf.fill(0);
  }
  // User methods
  err(t) {
    if (this.finished)
      throw this.err("buffer: finished");
    return Ae.err("Reader", this.stack, t);
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
    const n = this.buffers.concat(this.ptrs.map((s) => s.buffer)), r = n.map((s) => s.length).reduce((s, o) => s + o, 0), i = new Uint8Array(r);
    for (let s = 0, o = 0; s < n.length; s++) {
      const a = n[s];
      i.set(a, o), o += a.length;
    }
    for (let s = this.pos, o = 0; o < this.ptrs.length; o++) {
      const a = this.ptrs[o];
      i.set(a.ptr.encode(s), a.pos), s += a.buffer.length;
    }
    if (t) {
      this.buffers = [];
      for (const s of this.ptrs)
        s.buffer.fill(0);
      this.ptrs = [], this.finished = !0, this.bitBuf = 0;
    }
    return i;
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
const Hs = (e) => Uint8Array.from(e).reverse();
function Yd(e, t, n) {
  if (n) {
    const r = 2n ** (t - 1n);
    if (e < -r || e >= r)
      throw new Error(`value out of signed bounds. Expected ${-r} <= ${e} < ${r}`);
  } else if (0n > e || e >= 2n ** t)
    throw new Error(`value out of unsigned bounds. Expected 0 <= ${e} < ${2n ** t}`);
}
function qu(e) {
  return {
    // NOTE: we cannot export validate here, since it is likely mistake.
    encodeStream: e.encodeStream,
    decodeStream: e.decodeStream,
    size: e.size,
    encode: (t) => {
      const n = new qd();
      return e.encodeStream(n, t), n.finish();
    },
    decode: (t, n = {}) => {
      const r = new No(t, n), i = e.decodeStream(r);
      return r.finish(), i;
    }
  };
}
function Lt(e, t) {
  if (!ee(e))
    throw new Error(`validate: invalid inner value ${e}`);
  if (typeof t != "function")
    throw new Error("validate: fn should be function");
  return qu({
    size: e.size,
    encodeStream: (n, r) => {
      let i;
      try {
        i = t(r);
      } catch (s) {
        throw n.err(s);
      }
      e.encodeStream(n, i);
    },
    decodeStream: (n) => {
      const r = e.decodeStream(n);
      try {
        return t(r);
      } catch (i) {
        throw n.err(i);
      }
    }
  });
}
const Ct = (e) => {
  const t = qu(e);
  return e.validate ? Lt(t, e.validate) : t;
}, Mi = (e) => Tr(e) && typeof e.decode == "function" && typeof e.encode == "function";
function ee(e) {
  return Tr(e) && Mi(e) && typeof e.encodeStream == "function" && typeof e.decodeStream == "function" && (e.size === void 0 || de(e.size));
}
function Zd() {
  return {
    encode: (e) => {
      if (!Array.isArray(e))
        throw new Error("array expected");
      const t = {};
      for (const n of e) {
        if (!Array.isArray(n) || n.length !== 2)
          throw new Error("array of two elements expected");
        const r = n[0], i = n[1];
        if (t[r] !== void 0)
          throw new Error(`key(${r}) appears twice in struct`);
        t[r] = i;
      }
      return t;
    },
    decode: (e) => {
      if (!Tr(e))
        throw new Error(`expected plain object, got ${e}`);
      return Object.entries(e);
    }
  };
}
const Xd = {
  encode: (e) => {
    if (typeof e != "bigint")
      throw new Error(`expected bigint, got ${typeof e}`);
    if (e > BigInt(Number.MAX_SAFE_INTEGER))
      throw new Error(`element bigger than MAX_SAFE_INTEGER=${e}`);
    return Number(e);
  },
  decode: (e) => {
    if (!de(e))
      throw new Error("element is not a safe integer");
    return BigInt(e);
  }
};
function Qd(e) {
  if (!Tr(e))
    throw new Error("plain object expected");
  return {
    encode: (t) => {
      if (!de(t) || !(t in e))
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
function Jd(e, t = !1) {
  if (!de(e))
    throw new Error(`decimal/precision: wrong value ${e}`);
  if (typeof t != "boolean")
    throw new Error(`decimal/round: expected boolean, got ${typeof t}`);
  const n = 10n ** BigInt(e);
  return {
    encode: (r) => {
      if (typeof r != "bigint")
        throw new Error(`expected bigint, got ${typeof r}`);
      let i = (r < 0n ? -r : r).toString(10), s = i.length - e;
      s < 0 && (i = i.padStart(i.length - s, "0"), s = 0);
      let o = i.length - 1;
      for (; o >= s && i[o] === "0"; o--)
        ;
      let a = i.slice(0, s), c = i.slice(s, o + 1);
      return a || (a = "0"), r < 0n && (a = "-" + a), c ? `${a}.${c}` : a;
    },
    decode: (r) => {
      if (typeof r != "string")
        throw new Error(`expected string, got ${typeof r}`);
      if (r === "-0")
        throw new Error("negative zero is not allowed");
      let i = !1;
      if (r.startsWith("-") && (i = !0, r = r.slice(1)), !/^(0|[1-9]\d*)(\.\d+)?$/.test(r))
        throw new Error(`wrong string value=${r}`);
      let s = r.indexOf(".");
      s = s === -1 ? r.length : s;
      const o = r.slice(0, s), a = r.slice(s + 1).replace(/0+$/, ""), c = BigInt(o) * n;
      if (!t && a.length > e)
        throw new Error(`fractional part cannot be represented with this precision (num=${r}, prec=${e})`);
      const u = Math.min(a.length, e), l = BigInt(a.slice(0, u)) * 10n ** BigInt(e - u), d = c + l;
      return i ? -d : d;
    }
  };
}
function th(e) {
  if (!Array.isArray(e))
    throw new Error(`expected array, got ${typeof e}`);
  for (const t of e)
    if (!Mi(t))
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
const Yu = (e) => {
  if (!Mi(e))
    throw new Error("BaseCoder expected");
  return { encode: e.decode, decode: e.encode };
}, Hi = { dict: Zd, numberBigint: Xd, tsEnum: Qd, decimal: Jd, match: th, reverse: Yu }, Ro = (e, t = !1, n = !1, r = !0) => {
  if (!de(e))
    throw new Error(`bigint/size: wrong value ${e}`);
  if (typeof t != "boolean")
    throw new Error(`bigint/le: expected boolean, got ${typeof t}`);
  if (typeof n != "boolean")
    throw new Error(`bigint/signed: expected boolean, got ${typeof n}`);
  if (typeof r != "boolean")
    throw new Error(`bigint/sized: expected boolean, got ${typeof r}`);
  const i = BigInt(e), s = 2n ** (8n * i - 1n);
  return Ct({
    size: r ? e : void 0,
    encodeStream: (o, a) => {
      n && a < 0 && (a = a | s);
      const c = [];
      for (let l = 0; l < e; l++)
        c.push(Number(a & 255n)), a >>= 8n;
      let u = new Uint8Array(c).reverse();
      if (!r) {
        let l = 0;
        for (l = 0; l < u.length && u[l] === 0; l++)
          ;
        u = u.subarray(l);
      }
      o.bytes(t ? u.reverse() : u);
    },
    decodeStream: (o) => {
      const a = o.bytes(r ? e : Math.min(e, o.leftBytes)), c = t ? a : Hs(a);
      let u = 0n;
      for (let l = 0; l < c.length; l++)
        u |= BigInt(c[l]) << 8n * BigInt(l);
      return n && u & s && (u = (u ^ s) - s), u;
    },
    validate: (o) => {
      if (typeof o != "bigint")
        throw new Error(`bigint: invalid value: ${o}`);
      return Yd(o, 8n * i, !!n), o;
    }
  });
}, Zu = /* @__PURE__ */ Ro(32, !1), Wr = /* @__PURE__ */ Ro(8, !0), eh = /* @__PURE__ */ Ro(8, !0, !0), nh = (e, t) => Ct({
  size: e,
  encodeStream: (n, r) => n.writeView(e, (i) => t.write(i, r)),
  decodeStream: (n) => n.readView(e, t.read),
  validate: (n) => {
    if (typeof n != "number")
      throw new Error(`viewCoder: expected number, got ${typeof n}`);
    return t.validate && t.validate(n), n;
  }
}), Sr = (e, t, n) => {
  const r = e * 8, i = 2 ** (r - 1), s = (c) => {
    if (!de(c))
      throw new Error(`sintView: value is not safe integer: ${c}`);
    if (c < -i || c >= i)
      throw new Error(`sintView: value out of bounds. Expected ${-i} <= ${c} < ${i}`);
  }, o = 2 ** r, a = (c) => {
    if (!de(c))
      throw new Error(`uintView: value is not safe integer: ${c}`);
    if (0 > c || c >= o)
      throw new Error(`uintView: value out of bounds. Expected 0 <= ${c} < ${o}`);
  };
  return nh(e, {
    write: n.write,
    read: n.read,
    validate: t ? s : a
  });
}, nt = /* @__PURE__ */ Sr(4, !1, {
  read: (e, t) => e.getUint32(t, !0),
  write: (e, t) => e.setUint32(0, t, !0)
}), rh = /* @__PURE__ */ Sr(4, !1, {
  read: (e, t) => e.getUint32(t, !1),
  write: (e, t) => e.setUint32(0, t, !1)
}), xn = /* @__PURE__ */ Sr(4, !0, {
  read: (e, t) => e.getInt32(t, !0),
  write: (e, t) => e.setInt32(0, t, !0)
}), Na = /* @__PURE__ */ Sr(2, !1, {
  read: (e, t) => e.getUint16(t, !0),
  write: (e, t) => e.setUint16(0, t, !0)
}), Me = /* @__PURE__ */ Sr(1, !1, {
  read: (e, t) => e.getUint8(t),
  write: (e, t) => e.setUint8(0, t)
}), ut = (e, t = !1) => {
  if (typeof t != "boolean")
    throw new Error(`bytes/le: expected boolean, got ${typeof t}`);
  const n = Gu(e), r = Gt(e);
  return Ct({
    size: typeof e == "number" ? e : void 0,
    encodeStream: (i, s) => {
      r || n.encodeStream(i, s.length), i.bytes(t ? Hs(s) : s), r && i.bytes(e);
    },
    decodeStream: (i) => {
      let s;
      if (r) {
        const o = i.find(e);
        if (!o)
          throw i.err("bytes: cannot find terminator");
        s = i.bytes(o - i.pos), i.bytes(e.length);
      } else
        s = i.bytes(e === null ? i.leftBytes : n.decodeStream(i));
      return t ? Hs(s) : s;
    },
    validate: (i) => {
      if (!Gt(i))
        throw new Error(`bytes: invalid value ${i}`);
      return i;
    }
  });
};
function ih(e, t) {
  if (!ee(t))
    throw new Error(`prefix: invalid inner value ${t}`);
  return We(ut(e), Yu(t));
}
const Uo = (e, t = !1) => Lt(We(ut(e, t), zd), (n) => {
  if (typeof n != "string")
    throw new Error(`expected string, got ${typeof n}`);
  return n;
}), sh = (e, t = { isLE: !1, with0x: !1 }) => {
  let n = We(ut(e, t.isLE), B);
  const r = t.with0x;
  if (typeof r != "boolean")
    throw new Error(`hex/with0x: expected boolean, got ${typeof r}`);
  return r && (n = We(n, {
    encode: (i) => `0x${i}`,
    decode: (i) => {
      if (!i.startsWith("0x"))
        throw new Error("hex(with0x=true).encode input should start with 0x");
      return i.slice(2);
    }
  })), n;
};
function We(e, t) {
  if (!ee(e))
    throw new Error(`apply: invalid inner value ${e}`);
  if (!Mi(t))
    throw new Error(`apply: invalid base value ${e}`);
  return Ct({
    size: e.size,
    encodeStream: (n, r) => {
      let i;
      try {
        i = t.decode(r);
      } catch (s) {
        throw n.err("" + s);
      }
      return e.encodeStream(n, i);
    },
    decodeStream: (n) => {
      const r = e.decodeStream(n);
      try {
        return t.encode(r);
      } catch (i) {
        throw n.err("" + i);
      }
    }
  });
}
const oh = (e, t = !1) => {
  if (!Gt(e))
    throw new Error(`flag/flagValue: expected Uint8Array, got ${typeof e}`);
  if (typeof t != "boolean")
    throw new Error(`flag/xor: expected boolean, got ${typeof t}`);
  return Ct({
    size: e.length,
    encodeStream: (n, r) => {
      !!r !== t && n.bytes(e);
    },
    decodeStream: (n) => {
      let r = n.leftBytes >= e.length;
      return r && (r = Rn(n.bytes(e.length, !0), e), r && n.bytes(e.length)), r !== t;
    },
    validate: (n) => {
      if (n !== void 0 && typeof n != "boolean")
        throw new Error(`flag: expected boolean value or undefined, got ${typeof n}`);
      return n;
    }
  });
};
function ah(e, t, n) {
  if (!ee(t))
    throw new Error(`flagged: invalid inner value ${t}`);
  return Ct({
    encodeStream: (r, i) => {
      Ae.resolve(r.stack, e) && t.encodeStream(r, i);
    },
    decodeStream: (r) => {
      let i = !1;
      if (i = !!Ae.resolve(r.stack, e), i)
        return t.decodeStream(r);
    }
  });
}
function Lo(e, t, n = !0) {
  if (!ee(e))
    throw new Error(`magic: invalid inner value ${e}`);
  if (typeof n != "boolean")
    throw new Error(`magic: expected boolean, got ${typeof n}`);
  return Ct({
    size: e.size,
    encodeStream: (r, i) => e.encodeStream(r, t),
    decodeStream: (r) => {
      const i = e.decodeStream(r);
      if (n && typeof i != "object" && i !== t || Gt(t) && !Rn(t, i))
        throw r.err(`magic: invalid value: ${i} !== ${t}`);
    },
    validate: (r) => {
      if (r !== void 0)
        throw new Error(`magic: wrong value=${typeof r}`);
      return r;
    }
  });
}
function Xu(e) {
  let t = 0;
  for (const n of e) {
    if (n.size === void 0)
      return;
    if (!de(n.size))
      throw new Error(`sizeof: wrong element size=${t}`);
    t += n.size;
  }
  return t;
}
function St(e) {
  if (!Tr(e))
    throw new Error(`struct: expected plain object, got ${e}`);
  for (const t in e)
    if (!ee(e[t]))
      throw new Error(`struct: field ${t} is not CoderType`);
  return Ct({
    size: Xu(Object.values(e)),
    encodeStream: (t, n) => {
      t.pushObj(n, (r) => {
        for (const i in e)
          r(i, () => e[i].encodeStream(t, n[i]));
      });
    },
    decodeStream: (t) => {
      const n = {};
      return t.pushObj(n, (r) => {
        for (const i in e)
          r(i, () => n[i] = e[i].decodeStream(t));
      }), n;
    },
    validate: (t) => {
      if (typeof t != "object" || t === null)
        throw new Error(`struct: invalid value ${t}`);
      return t;
    }
  });
}
function ch(e) {
  if (!Array.isArray(e))
    throw new Error(`Packed.Tuple: got ${typeof e} instead of array`);
  for (let t = 0; t < e.length; t++)
    if (!ee(e[t]))
      throw new Error(`tuple: field ${t} is not CoderType`);
  return Ct({
    size: Xu(e),
    encodeStream: (t, n) => {
      if (!Array.isArray(n))
        throw t.err(`tuple: invalid value ${n}`);
      t.pushObj(n, (r) => {
        for (let i = 0; i < e.length; i++)
          r(`${i}`, () => e[i].encodeStream(t, n[i]));
      });
    },
    decodeStream: (t) => {
      const n = [];
      return t.pushObj(n, (r) => {
        for (let i = 0; i < e.length; i++)
          r(`${i}`, () => n.push(e[i].decodeStream(t)));
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
function Ut(e, t) {
  if (!ee(t))
    throw new Error(`array: invalid inner value ${t}`);
  const n = Gu(typeof e == "string" ? `../${e}` : e);
  return Ct({
    size: typeof e == "number" && t.size ? e * t.size : void 0,
    encodeStream: (r, i) => {
      const s = r;
      s.pushObj(i, (o) => {
        Gt(e) || n.encodeStream(r, i.length);
        for (let a = 0; a < i.length; a++)
          o(`${a}`, () => {
            const c = i[a], u = r.pos;
            if (t.encodeStream(r, c), Gt(e)) {
              if (e.length > s.pos - u)
                return;
              const l = s.finish(!1).subarray(u, s.pos);
              if (Rn(l.subarray(0, e.length), e))
                throw s.err(`array: inner element encoding same as separator. elm=${c} data=${l}`);
            }
          });
      }), Gt(e) && r.bytes(e);
    },
    decodeStream: (r) => {
      const i = [];
      return r.pushObj(i, (s) => {
        if (e === null)
          for (let o = 0; !r.isEnd() && (s(`${o}`, () => i.push(t.decodeStream(r))), !(t.size && r.leftBytes < t.size)); o++)
            ;
        else if (Gt(e))
          for (let o = 0; ; o++) {
            if (Rn(r.bytes(e.length, !0), e)) {
              r.bytes(e.length);
              break;
            }
            s(`${o}`, () => i.push(t.decodeStream(r)));
          }
        else {
          let o;
          s("arrayLen", () => o = n.decodeStream(r));
          for (let a = 0; a < o; a++)
            s(`${a}`, () => i.push(t.decodeStream(r)));
        }
      }), i;
    },
    validate: (r) => {
      if (!Array.isArray(r))
        throw new Error(`array: invalid value ${r}`);
      return r;
    }
  });
}
const Wn = Ve.Point, Ra = Wn.Fn, Qu = Wn.Fn.ORDER, vr = (e) => e % 2n === 0n, at = $o.isBytes, De = $o.concatBytes, yt = $o.equalBytes, Ju = (e) => Cd(vt(e)), Re = (...e) => vt(vt(De(...e))), Fs = Be.utils.randomSecretKey, Co = Be.getPublicKey, tl = Ve.getPublicKey, Ua = (e) => e.r < Qu / 2n;
function uh(e, t, n = !1) {
  let r = Ve.Signature.fromBytes(Ve.sign(e, t, { prehash: !1 }));
  if (n && !Ua(r)) {
    const i = new Uint8Array(32);
    let s = 0;
    for (; !Ua(r); )
      if (i.set(nt.encode(s++)), r = Ve.Signature.fromBytes(Ve.sign(e, t, { prehash: !1, extraEntropy: i })), s > 4294967295)
        throw new Error("lowR counter overflow: report the error");
  }
  return r.toBytes("der");
}
const La = Be.sign, Po = Be.utils.taggedHash, _t = {
  ecdsa: 0,
  schnorr: 1
};
function Un(e, t) {
  const n = e.length;
  if (t === _t.ecdsa) {
    if (n === 32)
      throw new Error("Expected non-Schnorr key");
    return Wn.fromBytes(e), e;
  } else if (t === _t.schnorr) {
    if (n !== 32)
      throw new Error("Expected 32-byte Schnorr key");
    return Be.utils.lift_x(Oe(e)), e;
  } else
    throw new Error("Unknown key type");
}
function el(e, t) {
  const r = Be.utils.taggedHash("TapTweak", e, t), i = Oe(r);
  if (i >= Qu)
    throw new Error("tweak higher than curve order");
  return i;
}
function lh(e, t = Uint8Array.of()) {
  const n = Be.utils, r = Oe(e), i = Wn.BASE.multiply(r), s = vr(i.y) ? r : Ra.neg(r), o = n.pointToBytes(i), a = el(o, t);
  return Er(Ra.add(s, a), 32);
}
function Ks(e, t) {
  const n = Be.utils, r = el(e, t), s = n.lift_x(Oe(e)).add(Wn.BASE.multiply(r)), o = vr(s.y) ? 0 : 1;
  return [n.pointToBytes(s), o];
}
const _o = vt(Wn.BASE.toBytes(!1)), Ln = {
  bech32: "bc",
  pubKeyHash: 0,
  scriptHash: 5,
  wif: 128
}, Br = {
  bech32: "tb",
  pubKeyHash: 111,
  scriptHash: 196,
  wif: 239
};
function fi(e, t) {
  if (!at(e) || !at(t))
    throw new Error(`cmp: wrong type a=${typeof e} b=${typeof t}`);
  const n = Math.min(e.length, t.length);
  for (let r = 0; r < n; r++)
    if (e[r] != t[r])
      return Math.sign(e[r] - t[r]);
  return Math.sign(e.length - t.length);
}
function nl(e) {
  const t = {};
  for (const n in e) {
    if (t[e[n]] !== void 0)
      throw new Error("duplicate key");
    t[e[n]] = n;
  }
  return t;
}
const Et = {
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
}, fh = nl(Et);
function Do(e = 6, t = !1) {
  return Ct({
    encodeStream: (n, r) => {
      if (r === 0n)
        return;
      const i = r < 0, s = BigInt(r), o = [];
      for (let a = i ? -s : s; a; a >>= 8n)
        o.push(Number(a & 0xffn));
      o[o.length - 1] >= 128 ? o.push(i ? 128 : 0) : i && (o[o.length - 1] |= 128), n.bytes(new Uint8Array(o));
    },
    decodeStream: (n) => {
      const r = n.leftBytes;
      if (r > e)
        throw new Error(`ScriptNum: number (${r}) bigger than limit=${e}`);
      if (r === 0)
        return 0n;
      if (t) {
        const o = n.bytes(r, !0);
        if ((o[o.length - 1] & 127) === 0 && (r <= 1 || (o[o.length - 2] & 128) === 0))
          throw new Error("Non-minimally encoded ScriptNum");
      }
      let i = 0, s = 0n;
      for (let o = 0; o < r; ++o)
        i = n.byte(), s |= BigInt(i) << 8n * BigInt(o);
      return i >= 128 && (s &= 2n ** BigInt(r * 8) - 1n >> 1n, s = -s), s;
    }
  });
}
function dh(e, t = 4, n = !0) {
  if (typeof e == "number")
    return e;
  if (at(e))
    try {
      const r = Do(t, n).decode(e);
      return r > Number.MAX_SAFE_INTEGER ? void 0 : Number(r);
    } catch {
      return;
    }
}
const W = Ct({
  encodeStream: (e, t) => {
    for (let n of t) {
      if (typeof n == "string") {
        if (Et[n] === void 0)
          throw new Error(`Unknown opcode=${n}`);
        e.byte(Et[n]);
        continue;
      } else if (typeof n == "number") {
        if (n === 0) {
          e.byte(0);
          continue;
        } else if (1 <= n && n <= 16) {
          e.byte(Et.OP_1 - 1 + n);
          continue;
        }
      }
      if (typeof n == "number" && (n = Do().encode(BigInt(n))), !at(n))
        throw new Error(`Wrong Script OP=${n} (${typeof n})`);
      const r = n.length;
      r < Et.PUSHDATA1 ? e.byte(r) : r <= 255 ? (e.byte(Et.PUSHDATA1), e.byte(r)) : r <= 65535 ? (e.byte(Et.PUSHDATA2), e.bytes(Na.encode(r))) : (e.byte(Et.PUSHDATA4), e.bytes(nt.encode(r))), e.bytes(n);
    }
  },
  decodeStream: (e) => {
    const t = [];
    for (; !e.isEnd(); ) {
      const n = e.byte();
      if (Et.OP_0 < n && n <= Et.PUSHDATA4) {
        let r;
        if (n < Et.PUSHDATA1)
          r = n;
        else if (n === Et.PUSHDATA1)
          r = Me.decodeStream(e);
        else if (n === Et.PUSHDATA2)
          r = Na.decodeStream(e);
        else if (n === Et.PUSHDATA4)
          r = nt.decodeStream(e);
        else
          throw new Error("Should be not possible");
        t.push(e.bytes(r));
      } else if (n === 0)
        t.push(0);
      else if (Et.OP_1 <= n && n <= Et.OP_16)
        t.push(n - (Et.OP_1 - 1));
      else {
        const r = fh[n];
        if (r === void 0)
          throw new Error(`Unknown opcode=${n.toString(16)}`);
        t.push(r);
      }
    }
    return t;
  }
}), Ca = {
  253: [253, 2, 253n, 65535n],
  254: [254, 4, 65536n, 4294967295n],
  255: [255, 8, 4294967296n, 18446744073709551615n]
}, Fi = Ct({
  encodeStream: (e, t) => {
    if (typeof t == "number" && (t = BigInt(t)), 0n <= t && t <= 252n)
      return e.byte(Number(t));
    for (const [n, r, i, s] of Object.values(Ca))
      if (!(i > t || t > s)) {
        e.byte(n);
        for (let o = 0; o < r; o++)
          e.byte(Number(t >> 8n * BigInt(o) & 0xffn));
        return;
      }
    throw e.err(`VarInt too big: ${t}`);
  },
  decodeStream: (e) => {
    const t = e.byte();
    if (t <= 252)
      return BigInt(t);
    const [n, r, i] = Ca[t];
    let s = 0n;
    for (let o = 0; o < r; o++)
      s |= BigInt(e.byte()) << 8n * BigInt(o);
    if (s < i)
      throw e.err(`Wrong CompactSize(${8 * r})`);
    return s;
  }
}), ne = We(Fi, Hi.numberBigint), Xt = ut(Fi), fr = Ut(ne, Xt), di = (e) => Ut(Fi, e), rl = St({
  txid: ut(32, !0),
  // hash(prev_tx),
  index: nt,
  // output number of previous tx
  finalScriptSig: Xt,
  // btc merges input and output script, executes it. If ok = tx passes
  sequence: nt
  // ?
}), cn = St({ amount: Wr, script: Xt }), hh = St({
  version: xn,
  segwitFlag: oh(new Uint8Array([0, 1])),
  inputs: di(rl),
  outputs: di(cn),
  witnesses: ah("segwitFlag", Ut("inputs/length", fr)),
  // < 500000000	Block number at which this transaction is unlocked
  // >= 500000000	UNIX timestamp at which this transaction is unlocked
  // Handled as part of PSBTv2
  lockTime: nt
});
function ph(e) {
  if (e.segwitFlag && e.witnesses && !e.witnesses.length)
    throw new Error("Segwit flag with empty witnesses array");
  return e;
}
const vn = Lt(hh, ph), ir = St({
  version: xn,
  inputs: di(rl),
  outputs: di(cn),
  lockTime: nt
}), zs = Lt(ut(null), (e) => Un(e, _t.ecdsa)), hi = Lt(ut(32), (e) => Un(e, _t.schnorr)), Pa = Lt(ut(null), (e) => {
  if (e.length !== 64 && e.length !== 65)
    throw new Error("Schnorr signature should be 64 or 65 bytes long");
  return e;
}), Ki = St({
  fingerprint: rh,
  path: Ut(null, nt)
}), il = St({
  hashes: Ut(ne, ut(32)),
  der: Ki
}), gh = ut(78), yh = St({ pubKey: hi, leafHash: ut(32) }), wh = St({
  version: Me,
  // With parity :(
  internalKey: ut(32),
  merklePath: Ut(null, ut(32))
}), ae = Lt(wh, (e) => {
  if (e.merklePath.length > 128)
    throw new Error("TaprootControlBlock: merklePath should be of length 0..128 (inclusive)");
  return e;
}), mh = Ut(null, St({
  depth: Me,
  version: Me,
  script: Xt
})), gt = ut(null), _a = ut(20), Xn = ut(32), Vo = {
  unsignedTx: [0, !1, ir, [0], [0], !1],
  xpub: [1, gh, Ki, [], [0, 2], !1],
  txVersion: [2, !1, nt, [2], [2], !1],
  fallbackLocktime: [3, !1, nt, [], [2], !1],
  inputCount: [4, !1, ne, [2], [2], !1],
  outputCount: [5, !1, ne, [2], [2], !1],
  txModifiable: [6, !1, Me, [], [2], !1],
  // TODO: bitfield
  version: [251, !1, nt, [], [0, 2], !1],
  proprietary: [252, gt, gt, [], [0, 2], !1]
}, zi = {
  nonWitnessUtxo: [0, !1, vn, [], [0, 2], !1],
  witnessUtxo: [1, !1, cn, [], [0, 2], !1],
  partialSig: [2, zs, gt, [], [0, 2], !1],
  sighashType: [3, !1, nt, [], [0, 2], !1],
  redeemScript: [4, !1, gt, [], [0, 2], !1],
  witnessScript: [5, !1, gt, [], [0, 2], !1],
  bip32Derivation: [6, zs, Ki, [], [0, 2], !1],
  finalScriptSig: [7, !1, gt, [], [0, 2], !1],
  finalScriptWitness: [8, !1, fr, [], [0, 2], !1],
  porCommitment: [9, !1, gt, [], [0, 2], !1],
  ripemd160: [10, _a, gt, [], [0, 2], !1],
  sha256: [11, Xn, gt, [], [0, 2], !1],
  hash160: [12, _a, gt, [], [0, 2], !1],
  hash256: [13, Xn, gt, [], [0, 2], !1],
  txid: [14, !1, Xn, [2], [2], !0],
  index: [15, !1, nt, [2], [2], !0],
  sequence: [16, !1, nt, [], [2], !0],
  requiredTimeLocktime: [17, !1, nt, [], [2], !1],
  requiredHeightLocktime: [18, !1, nt, [], [2], !1],
  tapKeySig: [19, !1, Pa, [], [0, 2], !1],
  tapScriptSig: [20, yh, Pa, [], [0, 2], !1],
  tapLeafScript: [21, ae, gt, [], [0, 2], !1],
  tapBip32Derivation: [22, Xn, il, [], [0, 2], !1],
  tapInternalKey: [23, !1, hi, [], [0, 2], !1],
  tapMerkleRoot: [24, !1, Xn, [], [0, 2], !1],
  proprietary: [252, gt, gt, [], [0, 2], !1]
}, bh = [
  "txid",
  "sequence",
  "index",
  "witnessUtxo",
  "nonWitnessUtxo",
  "finalScriptSig",
  "finalScriptWitness",
  "unknown"
], Eh = [
  "partialSig",
  "finalScriptSig",
  "finalScriptWitness",
  "tapKeySig",
  "tapScriptSig"
], dr = {
  redeemScript: [0, !1, gt, [], [0, 2], !1],
  witnessScript: [1, !1, gt, [], [0, 2], !1],
  bip32Derivation: [2, zs, Ki, [], [0, 2], !1],
  amount: [3, !1, eh, [2], [2], !0],
  script: [4, !1, gt, [2], [2], !0],
  tapInternalKey: [5, !1, hi, [], [0, 2], !1],
  tapTree: [6, !1, mh, [], [0, 2], !1],
  tapBip32Derivation: [7, hi, il, [], [0, 2], !1],
  proprietary: [252, gt, gt, [], [0, 2], !1]
}, xh = [], Da = Ut(ju, St({
  //  <key> := <keylen> <keytype> <keydata> WHERE keylen = len(keytype)+len(keydata)
  key: ih(ne, St({ type: ne, key: ut(null) })),
  //  <value> := <valuelen> <valuedata>
  value: ut(ne)
}));
function js(e) {
  const [t, n, r, i, s, o] = e;
  return { type: t, kc: n, vc: r, reqInc: i, allowInc: s, silentIgnore: o };
}
St({ type: ne, key: ut(null) });
function Mo(e) {
  const t = {};
  for (const n in e) {
    const [r, i, s] = e[n];
    t[r] = [n, i, s];
  }
  return Ct({
    encodeStream: (n, r) => {
      let i = [];
      for (const s in e) {
        const o = r[s];
        if (o === void 0)
          continue;
        const [a, c, u] = e[s];
        if (!c)
          i.push({ key: { type: a, key: ft }, value: u.encode(o) });
        else {
          const l = o.map(([d, p]) => [
            c.encode(d),
            u.encode(p)
          ]);
          l.sort((d, p) => fi(d[0], p[0]));
          for (const [d, p] of l)
            i.push({ key: { key: d, type: a }, value: p });
        }
      }
      if (r.unknown) {
        r.unknown.sort((s, o) => fi(s[0].key, o[0].key));
        for (const [s, o] of r.unknown)
          i.push({ key: s, value: o });
      }
      Da.encodeStream(n, i);
    },
    decodeStream: (n) => {
      const r = Da.decodeStream(n), i = {}, s = {};
      for (const o of r) {
        let a = "unknown", c = o.key.key, u = o.value;
        if (t[o.key.type]) {
          const [l, d, p] = t[o.key.type];
          if (a = l, !d && c.length)
            throw new Error(`PSBT: Non-empty key for ${a} (key=${B.encode(c)} value=${B.encode(u)}`);
          if (c = d ? d.decode(c) : void 0, u = p.decode(u), !d) {
            if (i[a])
              throw new Error(`PSBT: Same keys: ${a} (key=${c} value=${u})`);
            i[a] = u, s[a] = !0;
            continue;
          }
        } else
          c = { type: o.key.type, key: o.key.key };
        if (s[a])
          throw new Error(`PSBT: Key type with empty key and no key=${a} val=${u}`);
        i[a] || (i[a] = []), i[a].push([c, u]);
      }
      return i;
    }
  });
}
const Ho = Lt(Mo(zi), (e) => {
  if (e.finalScriptWitness && !e.finalScriptWitness.length)
    throw new Error("validateInput: empty finalScriptWitness");
  if (e.partialSig && !e.partialSig.length)
    throw new Error("Empty partialSig");
  if (e.partialSig)
    for (const [t] of e.partialSig)
      Un(t, _t.ecdsa);
  if (e.bip32Derivation)
    for (const [t] of e.bip32Derivation)
      Un(t, _t.ecdsa);
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
}), Fo = Lt(Mo(dr), (e) => {
  if (e.bip32Derivation)
    for (const [t] of e.bip32Derivation)
      Un(t, _t.ecdsa);
  return e;
}), sl = Lt(Mo(Vo), (e) => {
  if ((e.version || 0) === 0) {
    if (!e.unsignedTx)
      throw new Error("PSBTv0: missing unsignedTx");
    for (const n of e.unsignedTx.inputs)
      if (n.finalScriptSig && n.finalScriptSig.length)
        throw new Error("PSBTv0: input scriptSig found in unsignedTx");
  }
  return e;
}), Th = St({
  magic: Lo(Uo(new Uint8Array([255])), "psbt"),
  global: sl,
  inputs: Ut("global/unsignedTx/inputs/length", Ho),
  outputs: Ut(null, Fo)
}), Sh = St({
  magic: Lo(Uo(new Uint8Array([255])), "psbt"),
  global: sl,
  inputs: Ut("global/inputCount", Ho),
  outputs: Ut("global/outputCount", Fo)
});
St({
  magic: Lo(Uo(new Uint8Array([255])), "psbt"),
  items: Ut(null, We(Ut(ju, ch([sh(ne), ut(Fi)])), Hi.dict()))
});
function ls(e, t, n) {
  for (const r in n) {
    if (r === "unknown" || !t[r])
      continue;
    const { allowInc: i } = js(t[r]);
    if (!i.includes(e))
      throw new Error(`PSBTv${e}: field ${r} is not allowed`);
  }
  for (const r in t) {
    const { reqInc: i } = js(t[r]);
    if (i.includes(e) && n[r] === void 0)
      throw new Error(`PSBTv${e}: missing required field ${r}`);
  }
}
function Va(e, t, n) {
  const r = {};
  for (const i in n) {
    const s = i;
    if (s !== "unknown") {
      if (!t[s])
        continue;
      const { allowInc: o, silentIgnore: a } = js(t[s]);
      if (!o.includes(e)) {
        if (a)
          continue;
        throw new Error(`Failed to serialize in PSBTv${e}: ${s} but versions allows inclusion=${o}`);
      }
    }
    r[s] = n[s];
  }
  return r;
}
function ol(e) {
  const t = e && e.global && e.global.version || 0;
  ls(t, Vo, e.global);
  for (const o of e.inputs)
    ls(t, zi, o);
  for (const o of e.outputs)
    ls(t, dr, o);
  const n = t ? e.global.inputCount : e.global.unsignedTx.inputs.length;
  if (e.inputs.length < n)
    throw new Error("Not enough inputs");
  const r = e.inputs.slice(n);
  if (r.length > 1 || r.length && Object.keys(r[0]).length)
    throw new Error(`Unexpected inputs left in tx=${r}`);
  const i = t ? e.global.outputCount : e.global.unsignedTx.outputs.length;
  if (e.outputs.length < i)
    throw new Error("Not outputs inputs");
  const s = e.outputs.slice(i);
  if (s.length > 1 || s.length && Object.keys(s[0]).length)
    throw new Error(`Unexpected outputs left in tx=${s}`);
  return e;
}
function Ws(e, t, n, r, i) {
  const s = { ...n, ...t };
  for (const o in e) {
    const a = o, [c, u, l] = e[a], d = r && !r.includes(o);
    if (t[o] === void 0 && o in t) {
      if (d)
        throw new Error(`Cannot remove signed field=${o}`);
      delete s[o];
    } else if (u) {
      const p = n && n[o] ? n[o] : [];
      let g = t[a];
      if (g) {
        if (!Array.isArray(g))
          throw new Error(`keyMap(${o}): KV pairs should be [k, v][]`);
        g = g.map((w) => {
          if (w.length !== 2)
            throw new Error(`keyMap(${o}): KV pairs should be [k, v][]`);
          return [
            typeof w[0] == "string" ? u.decode(B.decode(w[0])) : w[0],
            typeof w[1] == "string" ? l.decode(B.decode(w[1])) : w[1]
          ];
        });
        const f = {}, h = (w, E, S) => {
          if (f[w] === void 0) {
            f[w] = [E, S];
            return;
          }
          const O = B.encode(l.encode(f[w][1])), R = B.encode(l.encode(S));
          if (O !== R)
            throw new Error(`keyMap(${a}): same key=${w} oldVal=${O} newVal=${R}`);
        };
        for (const [w, E] of p) {
          const S = B.encode(u.encode(w));
          h(S, w, E);
        }
        for (const [w, E] of g) {
          const S = B.encode(u.encode(w));
          if (E === void 0) {
            if (d)
              throw new Error(`Cannot remove signed field=${a}/${w}`);
            delete f[S];
          } else
            h(S, w, E);
        }
        s[a] = Object.values(f);
      }
    } else if (typeof s[o] == "string")
      s[o] = l.decode(B.decode(s[o]));
    else if (d && o in t && n && n[o] !== void 0 && !yt(l.encode(t[o]), l.encode(n[o])))
      throw new Error(`Cannot change signed field=${o}`);
  }
  for (const o in s)
    if (!e[o]) {
      if (i && o === "unknown")
        continue;
      delete s[o];
    }
  return s;
}
const Ma = Lt(Th, ol), Ha = Lt(Sh, ol), vh = {
  encode(e) {
    if (!(e.length !== 2 || e[0] !== 1 || !at(e[1]) || B.encode(e[1]) !== "4e73"))
      return { type: "p2a", script: W.encode(e) };
  },
  decode: (e) => {
    if (e.type === "p2a")
      return [1, B.decode("4e73")];
  }
};
function Tn(e, t) {
  try {
    return Un(e, t), !0;
  } catch {
    return !1;
  }
}
const kh = {
  encode(e) {
    if (!(e.length !== 2 || !at(e[0]) || !Tn(e[0], _t.ecdsa) || e[1] !== "CHECKSIG"))
      return { type: "pk", pubkey: e[0] };
  },
  decode: (e) => e.type === "pk" ? [e.pubkey, "CHECKSIG"] : void 0
}, Ah = {
  encode(e) {
    if (!(e.length !== 5 || e[0] !== "DUP" || e[1] !== "HASH160" || !at(e[2])) && !(e[3] !== "EQUALVERIFY" || e[4] !== "CHECKSIG"))
      return { type: "pkh", hash: e[2] };
  },
  decode: (e) => e.type === "pkh" ? ["DUP", "HASH160", e.hash, "EQUALVERIFY", "CHECKSIG"] : void 0
}, Ih = {
  encode(e) {
    if (!(e.length !== 3 || e[0] !== "HASH160" || !at(e[1]) || e[2] !== "EQUAL"))
      return { type: "sh", hash: e[1] };
  },
  decode: (e) => e.type === "sh" ? ["HASH160", e.hash, "EQUAL"] : void 0
}, Oh = {
  encode(e) {
    if (!(e.length !== 2 || e[0] !== 0 || !at(e[1])) && e[1].length === 32)
      return { type: "wsh", hash: e[1] };
  },
  decode: (e) => e.type === "wsh" ? [0, e.hash] : void 0
}, Bh = {
  encode(e) {
    if (!(e.length !== 2 || e[0] !== 0 || !at(e[1])) && e[1].length === 20)
      return { type: "wpkh", hash: e[1] };
  },
  decode: (e) => e.type === "wpkh" ? [0, e.hash] : void 0
}, $h = {
  encode(e) {
    const t = e.length - 1;
    if (e[t] !== "CHECKMULTISIG")
      return;
    const n = e[0], r = e[t - 1];
    if (typeof n != "number" || typeof r != "number")
      return;
    const i = e.slice(1, -2);
    if (r === i.length) {
      for (const s of i)
        if (!at(s))
          return;
      return { type: "ms", m: n, pubkeys: i };
    }
  },
  // checkmultisig(n, ..pubkeys, m)
  decode: (e) => e.type === "ms" ? [e.m, ...e.pubkeys, e.pubkeys.length, "CHECKMULTISIG"] : void 0
}, Nh = {
  encode(e) {
    if (!(e.length !== 2 || e[0] !== 1 || !at(e[1])))
      return { type: "tr", pubkey: e[1] };
  },
  decode: (e) => e.type === "tr" ? [1, e.pubkey] : void 0
}, Rh = {
  encode(e) {
    const t = e.length - 1;
    if (e[t] !== "CHECKSIG")
      return;
    const n = [];
    for (let r = 0; r < t; r++) {
      const i = e[r];
      if (r & 1) {
        if (i !== "CHECKSIGVERIFY" || r === t - 1)
          return;
        continue;
      }
      if (!at(i))
        return;
      n.push(i);
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
}, Uh = {
  encode(e) {
    const t = e.length - 1;
    if (e[t] !== "NUMEQUAL" || e[1] !== "CHECKSIG")
      return;
    const n = [], r = dh(e[t - 1]);
    if (typeof r == "number") {
      for (let i = 0; i < t - 1; i++) {
        const s = e[i];
        if (i & 1) {
          if (s !== (i === 1 ? "CHECKSIG" : "CHECKSIGADD"))
            throw new Error("OutScript.encode/tr_ms: wrong element");
          continue;
        }
        if (!at(s))
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
}, Lh = {
  encode(e) {
    return { type: "unknown", script: W.encode(e) };
  },
  decode: (e) => e.type === "unknown" ? W.decode(e.script) : void 0
}, Ch = [
  vh,
  kh,
  Ah,
  Ih,
  Oh,
  Bh,
  $h,
  Nh,
  Rh,
  Uh,
  Lh
], Ph = We(W, Hi.match(Ch)), ht = Lt(Ph, (e) => {
  if (e.type === "pk" && !Tn(e.pubkey, _t.ecdsa))
    throw new Error("OutScript/pk: wrong key");
  if ((e.type === "pkh" || e.type === "sh" || e.type === "wpkh") && (!at(e.hash) || e.hash.length !== 20))
    throw new Error(`OutScript/${e.type}: wrong hash`);
  if (e.type === "wsh" && (!at(e.hash) || e.hash.length !== 32))
    throw new Error("OutScript/wsh: wrong hash");
  if (e.type === "tr" && (!at(e.pubkey) || !Tn(e.pubkey, _t.schnorr)))
    throw new Error("OutScript/tr: wrong taproot public key");
  if ((e.type === "ms" || e.type === "tr_ns" || e.type === "tr_ms") && !Array.isArray(e.pubkeys))
    throw new Error("OutScript/multisig: wrong pubkeys array");
  if (e.type === "ms") {
    const t = e.pubkeys.length;
    for (const n of e.pubkeys)
      if (!Tn(n, _t.ecdsa))
        throw new Error("OutScript/multisig: wrong pubkey");
    if (e.m <= 0 || t > 16 || e.m > t)
      throw new Error("OutScript/multisig: invalid params");
  }
  if (e.type === "tr_ns" || e.type === "tr_ms") {
    for (const t of e.pubkeys)
      if (!Tn(t, _t.schnorr))
        throw new Error(`OutScript/${e.type}: wrong pubkey`);
  }
  if (e.type === "tr_ms") {
    const t = e.pubkeys.length;
    if (e.m <= 0 || t > 999 || e.m > t)
      throw new Error("OutScript/tr_ms: invalid params");
  }
  return e;
});
function Fa(e, t) {
  if (!yt(e.hash, vt(t)))
    throw new Error("checkScript: wsh wrong witnessScript hash");
  const n = ht.decode(t);
  if (n.type === "tr" || n.type === "tr_ns" || n.type === "tr_ms")
    throw new Error(`checkScript: P2${n.type} cannot be wrapped in P2SH`);
  if (n.type === "wpkh" || n.type === "sh")
    throw new Error(`checkScript: P2${n.type} cannot be wrapped in P2WSH`);
}
function al(e, t, n) {
  if (e) {
    const r = ht.decode(e);
    if (r.type === "tr_ns" || r.type === "tr_ms" || r.type === "ms" || r.type == "pk")
      throw new Error(`checkScript: non-wrapped ${r.type}`);
    if (r.type === "sh" && t) {
      if (!yt(r.hash, Ju(t)))
        throw new Error("checkScript: sh wrong redeemScript hash");
      const i = ht.decode(t);
      if (i.type === "tr" || i.type === "tr_ns" || i.type === "tr_ms")
        throw new Error(`checkScript: P2${i.type} cannot be wrapped in P2SH`);
      if (i.type === "sh")
        throw new Error("checkScript: P2SH cannot be wrapped in P2SH");
    }
    r.type === "wsh" && n && Fa(r, n);
  }
  if (t) {
    const r = ht.decode(t);
    r.type === "wsh" && n && Fa(r, n);
  }
}
function _h(e) {
  const t = {};
  for (const n of e) {
    const r = B.encode(n);
    if (t[r])
      throw new Error(`Multisig: non-uniq pubkey: ${e.map(B.encode)}`);
    t[r] = !0;
  }
}
function Dh(e, t, n = !1, r) {
  const i = ht.decode(e);
  if (i.type === "unknown" && n)
    return;
  if (!["tr_ns", "tr_ms"].includes(i.type))
    throw new Error(`P2TR: invalid leaf script=${i.type}`);
  const s = i;
  if (!n && s.pubkeys)
    for (const o of s.pubkeys) {
      if (yt(o, _o))
        throw new Error("Unspendable taproot key in leaf script");
      if (yt(o, t))
        throw new Error("Using P2TR with leaf script with same key as internal key is not supported");
    }
}
function cl(e) {
  const t = Array.from(e);
  for (; t.length >= 2; ) {
    t.sort((o, a) => (a.weight || 1) - (o.weight || 1));
    const r = t.pop(), i = t.pop(), s = (i?.weight || 1) + (r?.weight || 1);
    t.push({
      weight: s,
      // Unwrap children array
      // TODO: Very hard to remove any here
      childs: [i?.childs || i, r?.childs || r]
    });
  }
  const n = t[0];
  return n?.childs || n;
}
function Gs(e, t = []) {
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
    left: Gs(e.left, [e.right.hash, ...t]),
    right: Gs(e.right, [e.left.hash, ...t])
  };
}
function qs(e) {
  if (!e)
    throw new Error("taprootAddPath: empty tree");
  if (e.type === "leaf")
    return [e];
  if (e.type !== "branch")
    throw new Error(`taprootWalkTree: wrong type=${e}`);
  return [...qs(e.left), ...qs(e.right)];
}
function Ys(e, t, n = !1, r) {
  if (!e)
    throw new Error("taprootHashTree: empty tree");
  if (Array.isArray(e) && e.length === 1 && (e = e[0]), !Array.isArray(e)) {
    const { leafVersion: c, script: u } = e;
    if (e.tapLeafScript || e.tapMerkleRoot && !yt(e.tapMerkleRoot, ft))
      throw new Error("P2TR: tapRoot leafScript cannot have tree");
    const l = typeof u == "string" ? B.decode(u) : u;
    if (!at(l))
      throw new Error(`checkScript: wrong script type=${l}`);
    return Dh(l, t, n), {
      type: "leaf",
      version: c,
      script: l,
      hash: or(l, c)
    };
  }
  if (e.length !== 2 && (e = cl(e)), e.length !== 2)
    throw new Error("hashTree: non binary tree!");
  const i = Ys(e[0], t, n), s = Ys(e[1], t, n);
  let [o, a] = [i.hash, s.hash];
  return fi(a, o) === -1 && ([o, a] = [a, o]), { type: "branch", left: i, right: s, hash: Po("TapBranch", o, a) };
}
const hr = 192, or = (e, t = hr) => Po("TapLeaf", new Uint8Array([t]), Xt.encode(e));
function Vh(e, t, n = Ln, r = !1, i) {
  if (!e && !t)
    throw new Error("p2tr: should have pubKey or scriptTree (or both)");
  const s = typeof e == "string" ? B.decode(e) : e || _o;
  if (!Tn(s, _t.schnorr))
    throw new Error("p2tr: non-schnorr pubkey");
  if (t) {
    let o = Gs(Ys(t, s, r));
    const a = o.hash, [c, u] = Ks(s, a), l = qs(o).map((d) => ({
      ...d,
      controlBlock: ae.encode({
        version: (d.version || hr) + u,
        internalKey: s,
        merklePath: d.path
      })
    }));
    return {
      type: "tr",
      script: ht.encode({ type: "tr", pubkey: c }),
      address: Ie(n).encode({ type: "tr", pubkey: c }),
      // For tests
      tweakedPubkey: c,
      // PSBT stuff
      tapInternalKey: s,
      leaves: l,
      tapLeafScript: l.map((d) => [
        ae.decode(d.controlBlock),
        De(d.script, new Uint8Array([d.version || hr]))
      ]),
      tapMerkleRoot: a
    };
  } else {
    const o = Ks(s, ft)[0];
    return {
      type: "tr",
      script: ht.encode({ type: "tr", pubkey: o }),
      address: Ie(n).encode({ type: "tr", pubkey: o }),
      // For tests
      tweakedPubkey: o,
      // PSBT stuff
      tapInternalKey: s
    };
  }
}
function Mh(e, t, n = !1) {
  return n || _h(t), {
    type: "tr_ms",
    script: ht.encode({ type: "tr_ms", pubkeys: t, m: e })
  };
}
const ul = Kd(vt);
function ll(e, t) {
  if (t.length < 2 || t.length > 40)
    throw new Error("Witness: invalid length");
  if (e > 16)
    throw new Error("Witness: invalid version");
  if (e === 0 && !(t.length === 20 || t.length === 32))
    throw new Error("Witness: invalid length for version");
}
function fs(e, t, n = Ln) {
  ll(e, t);
  const r = e === 0 ? Ms : En;
  return r.encode(n.bech32, [e].concat(r.toWords(t)));
}
function Ka(e, t) {
  return ul.encode(De(Uint8Array.from(t), e));
}
function Ie(e = Ln) {
  return {
    encode(t) {
      const { type: n } = t;
      if (n === "wpkh")
        return fs(0, t.hash, e);
      if (n === "wsh")
        return fs(0, t.hash, e);
      if (n === "tr")
        return fs(1, t.pubkey, e);
      if (n === "pkh")
        return Ka(t.hash, [e.pubKeyHash]);
      if (n === "sh")
        return Ka(t.hash, [e.scriptHash]);
      throw new Error(`Unknown address type=${n}`);
    },
    decode(t) {
      if (t.length < 14 || t.length > 74)
        throw new Error("Invalid address length");
      if (e.bech32 && t.toLowerCase().startsWith(`${e.bech32}1`)) {
        let r;
        try {
          if (r = Ms.decode(t), r.words[0] !== 0)
            throw new Error(`bech32: wrong version=${r.words[0]}`);
        } catch {
          if (r = En.decode(t), r.words[0] === 0)
            throw new Error(`bech32m: wrong version=${r.words[0]}`);
        }
        if (r.prefix !== e.bech32)
          throw new Error(`wrong bech32 prefix=${r.prefix}`);
        const [i, ...s] = r.words, o = Ms.fromWords(s);
        if (ll(i, o), i === 0 && o.length === 32)
          return { type: "wsh", hash: o };
        if (i === 0 && o.length === 20)
          return { type: "wpkh", hash: o };
        if (i === 1 && o.length === 32)
          return { type: "tr", pubkey: o };
        throw new Error("Unknown witness program");
      }
      const n = ul.decode(t);
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
const $r = new Uint8Array(32), Hh = {
  amount: 0xffffffffffffffffn,
  script: ft
}, Fh = (e) => Math.ceil(e / 4), Kh = 8, zh = 2, en = 0, Ko = 4294967295;
Hi.decimal(Kh);
const ar = (e, t) => e === void 0 ? t : e;
function pi(e) {
  if (Array.isArray(e))
    return e.map((t) => pi(t));
  if (at(e))
    return Uint8Array.from(e);
  if (["number", "bigint", "boolean", "string", "undefined"].includes(typeof e))
    return e;
  if (e === null)
    return e;
  if (typeof e == "object")
    return Object.fromEntries(Object.entries(e).map(([t, n]) => [t, pi(n)]));
  throw new Error(`cloneDeep: unknown type=${e} (${typeof e})`);
}
const X = {
  DEFAULT: 0,
  ALL: 1,
  NONE: 2,
  SINGLE: 3,
  ANYONECANPAY: 128
}, Ge = {
  DEFAULT: X.DEFAULT,
  ALL: X.ALL,
  NONE: X.NONE,
  SINGLE: X.SINGLE,
  DEFAULT_ANYONECANPAY: X.DEFAULT | X.ANYONECANPAY,
  ALL_ANYONECANPAY: X.ALL | X.ANYONECANPAY,
  NONE_ANYONECANPAY: X.NONE | X.ANYONECANPAY,
  SINGLE_ANYONECANPAY: X.SINGLE | X.ANYONECANPAY
}, jh = nl(Ge);
function Wh(e, t, n, r = ft) {
  return yt(n, t) && (e = lh(e, r), t = Co(e)), { privKey: e, pubKey: t };
}
function nn(e) {
  if (e.script === void 0 || e.amount === void 0)
    throw new Error("Transaction/output: script and amount required");
  return { script: e.script, amount: e.amount };
}
function Qn(e) {
  if (e.txid === void 0 || e.index === void 0)
    throw new Error("Transaction/input: txid and index required");
  return {
    txid: e.txid,
    index: e.index,
    sequence: ar(e.sequence, Ko),
    finalScriptSig: ar(e.finalScriptSig, ft)
  };
}
function ds(e) {
  for (const t in e) {
    const n = t;
    bh.includes(n) || delete e[n];
  }
}
const hs = St({ txid: ut(32, !0), index: nt });
function Gh(e) {
  if (typeof e != "number" || typeof jh[e] != "string")
    throw new Error(`Invalid SigHash=${e}`);
  return e;
}
function za(e) {
  const t = e & 31;
  return {
    isAny: !!(e & X.ANYONECANPAY),
    isNone: t === X.NONE,
    isSingle: t === X.SINGLE
  };
}
function qh(e) {
  if (e !== void 0 && {}.toString.call(e) !== "[object Object]")
    throw new Error(`Wrong object type for transaction options: ${e}`);
  const t = {
    ...e,
    // Defaults
    version: ar(e.version, zh),
    lockTime: ar(e.lockTime, 0),
    PSBTVersion: ar(e.PSBTVersion, 0)
  };
  if (typeof t.allowUnknowInput < "u" && (e.allowUnknownInputs = t.allowUnknowInput), typeof t.allowUnknowOutput < "u" && (e.allowUnknownOutputs = t.allowUnknowOutput), typeof t.lockTime != "number")
    throw new Error("Transaction lock time should be number");
  if (nt.encode(t.lockTime), t.PSBTVersion !== 0 && t.PSBTVersion !== 2)
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
function ja(e) {
  if (e.nonWitnessUtxo && e.index !== void 0) {
    const t = e.nonWitnessUtxo.outputs.length - 1;
    if (e.index > t)
      throw new Error(`validateInput: index(${e.index}) not in nonWitnessUtxo`);
    const n = e.nonWitnessUtxo.outputs[e.index];
    if (e.witnessUtxo && (!yt(e.witnessUtxo.script, n.script) || e.witnessUtxo.amount !== n.amount))
      throw new Error("validateInput: witnessUtxo different from nonWitnessUtxo");
    if (e.txid) {
      if (e.nonWitnessUtxo.outputs.length - 1 < e.index)
        throw new Error("nonWitnessUtxo: incorect output index");
      const i = Qt.fromRaw(vn.encode(e.nonWitnessUtxo), {
        allowUnknownOutputs: !0,
        disableScriptCheck: !0,
        allowUnknownInputs: !0
      }), s = B.encode(e.txid);
      if (i.isFinal && i.id !== s)
        throw new Error(`nonWitnessUtxo: wrong txid, exp=${s} got=${i.id}`);
    }
  }
  return e;
}
function Gr(e) {
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
function Wa(e, t, n, r = !1, i = !1) {
  let { nonWitnessUtxo: s, txid: o } = e;
  typeof s == "string" && (s = B.decode(s)), at(s) && (s = vn.decode(s)), !("nonWitnessUtxo" in e) && s === void 0 && (s = t?.nonWitnessUtxo), typeof o == "string" && (o = B.decode(o)), o === void 0 && (o = t?.txid);
  let a = { ...t, ...e, nonWitnessUtxo: s, txid: o };
  !("nonWitnessUtxo" in e) && a.nonWitnessUtxo === void 0 && delete a.nonWitnessUtxo, a.sequence === void 0 && (a.sequence = Ko), a.tapMerkleRoot === null && delete a.tapMerkleRoot, a = Ws(zi, a, t, n, i), Ho.encode(a);
  let c;
  return a.nonWitnessUtxo && a.index !== void 0 ? c = a.nonWitnessUtxo.outputs[a.index] : a.witnessUtxo && (c = a.witnessUtxo), c && !r && al(c && c.script, a.redeemScript, a.witnessScript), a;
}
function Ga(e, t = !1) {
  let n = "legacy", r = X.ALL;
  const i = Gr(e), s = ht.decode(i.script);
  let o = s.type, a = s;
  const c = [s];
  if (s.type === "tr")
    return r = X.DEFAULT, {
      txType: "taproot",
      type: "tr",
      last: s,
      lastScript: i.script,
      defaultSighash: r,
      sighash: e.sighashType || r
    };
  {
    if ((s.type === "wpkh" || s.type === "wsh") && (n = "segwit"), s.type === "sh") {
      if (!e.redeemScript)
        throw new Error("inputType: sh without redeemScript");
      let p = ht.decode(e.redeemScript);
      (p.type === "wpkh" || p.type === "wsh") && (n = "segwit"), c.push(p), a = p, o += `-${p.type}`;
    }
    if (a.type === "wsh") {
      if (!e.witnessScript)
        throw new Error("inputType: wsh without witnessScript");
      let p = ht.decode(e.witnessScript);
      p.type === "wsh" && (n = "segwit"), c.push(p), a = p, o += `-${p.type}`;
    }
    const u = c[c.length - 1];
    if (u.type === "sh" || u.type === "wsh")
      throw new Error("inputType: sh/wsh cannot be terminal type");
    const l = ht.encode(u), d = {
      type: o,
      txType: n,
      last: u,
      lastScript: l,
      defaultSighash: r,
      sighash: e.sighashType || r
    };
    if (n === "legacy" && !t && !e.nonWitnessUtxo)
      throw new Error("Transaction/sign: legacy input without nonWitnessUtxo, can result in attack that forces paying higher fees. Pass allowLegacyWitnessUtxo=true, if you sure");
    return d;
  }
}
let Qt = class qr {
  global = {};
  inputs = [];
  // use getInput()
  outputs = [];
  // use getOutput()
  opts;
  constructor(t = {}) {
    const n = this.opts = qh(t);
    n.lockTime !== en && (this.global.fallbackLocktime = n.lockTime), this.global.txVersion = n.version;
  }
  // Import
  static fromRaw(t, n = {}) {
    const r = vn.decode(t), i = new qr({ ...n, version: r.version, lockTime: r.lockTime });
    for (const s of r.outputs)
      i.addOutput(s);
    if (i.outputs = r.outputs, i.inputs = r.inputs, r.witnesses)
      for (let s = 0; s < r.witnesses.length; s++)
        i.inputs[s].finalScriptWitness = r.witnesses[s];
    return i;
  }
  // PSBT
  static fromPSBT(t, n = {}) {
    let r;
    try {
      r = Ma.decode(t);
    } catch (d) {
      try {
        r = Ha.decode(t);
      } catch {
        throw d;
      }
    }
    const i = r.global.version || 0;
    if (i !== 0 && i !== 2)
      throw new Error(`Wrong PSBT version=${i}`);
    const s = r.global.unsignedTx, o = i === 0 ? s?.version : r.global.txVersion, a = i === 0 ? s?.lockTime : r.global.fallbackLocktime, c = new qr({ ...n, version: o, lockTime: a, PSBTVersion: i }), u = i === 0 ? s?.inputs.length : r.global.inputCount;
    c.inputs = r.inputs.slice(0, u).map((d, p) => ja({
      finalScriptSig: ft,
      ...r.global.unsignedTx?.inputs[p],
      ...d
    }));
    const l = i === 0 ? s?.outputs.length : r.global.outputCount;
    return c.outputs = r.outputs.slice(0, l).map((d, p) => ({
      ...d,
      ...r.global.unsignedTx?.outputs[p]
    })), c.global = { ...r.global, txVersion: o }, a !== en && (c.global.fallbackLocktime = a), c;
  }
  toPSBT(t = this.opts.PSBTVersion) {
    if (t !== 0 && t !== 2)
      throw new Error(`Wrong PSBT version=${t}`);
    const n = this.inputs.map((s) => ja(Va(t, zi, s)));
    for (const s of n)
      s.partialSig && !s.partialSig.length && delete s.partialSig, s.finalScriptSig && !s.finalScriptSig.length && delete s.finalScriptSig, s.finalScriptWitness && !s.finalScriptWitness.length && delete s.finalScriptWitness;
    const r = this.outputs.map((s) => Va(t, dr, s)), i = { ...this.global };
    return t === 0 ? (i.unsignedTx = ir.decode(ir.encode({
      version: this.version,
      lockTime: this.lockTime,
      inputs: this.inputs.map(Qn).map((s) => ({
        ...s,
        finalScriptSig: ft
      })),
      outputs: this.outputs.map(nn)
    })), delete i.fallbackLocktime, delete i.txVersion) : (i.version = t, i.txVersion = this.version, i.inputCount = this.inputs.length, i.outputCount = this.outputs.length, i.fallbackLocktime && i.fallbackLocktime === en && delete i.fallbackLocktime), this.opts.bip174jsCompat && (n.length || n.push({}), r.length || r.push({})), (t === 0 ? Ma : Ha).encode({
      global: i,
      inputs: n,
      outputs: r
    });
  }
  // BIP370 lockTime (https://github.com/bitcoin/bips/blob/master/bip-0370.mediawiki#determining-lock-time)
  get lockTime() {
    let t = en, n = 0, r = en, i = 0;
    for (const s of this.inputs)
      s.requiredHeightLocktime && (t = Math.max(t, s.requiredHeightLocktime), n++), s.requiredTimeLocktime && (r = Math.max(r, s.requiredTimeLocktime), i++);
    return n && n >= i ? t : r !== en ? r : this.global.fallbackLocktime || en;
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
    const n = this.inputs[t].sighashType, r = n === void 0 ? X.DEFAULT : n, i = r === X.DEFAULT ? X.ALL : r & 3;
    return { sigInputs: r & X.ANYONECANPAY, sigOutputs: i };
  }
  // Very nice for debug purposes, but slow. If there is too much inputs/outputs to add, will be quadratic.
  // Some cache will be nice, but there chance to have bugs with cache invalidation
  signStatus() {
    let t = !0, n = !0, r = [], i = [];
    for (let s = 0; s < this.inputs.length; s++) {
      if (this.inputStatus(s) === "unsigned")
        continue;
      const { sigInputs: a, sigOutputs: c } = this.inputSighash(s);
      if (a === X.ANYONECANPAY ? r.push(s) : t = !1, c === X.ALL)
        n = !1;
      else if (c === X.SINGLE)
        i.push(s);
      else if (c !== X.NONE) throw new Error(`Wrong signature hash output type: ${c}`);
    }
    return { addInput: t, addOutput: n, inputs: r, outputs: i };
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
    const n = this.outputs.map(nn);
    t += 4 * ne.encode(this.outputs.length).length;
    for (const r of n)
      t += 32 + 4 * Xt.encode(r.script).length;
    this.hasWitnesses && (t += 2), t += 4 * ne.encode(this.inputs.length).length;
    for (const r of this.inputs)
      t += 160 + 4 * Xt.encode(r.finalScriptSig || ft).length, this.hasWitnesses && r.finalScriptWitness && (t += fr.encode(r.finalScriptWitness).length);
    return t;
  }
  get vsize() {
    return Fh(this.weight);
  }
  toBytes(t = !1, n = !1) {
    return vn.encode({
      version: this.version,
      lockTime: this.lockTime,
      inputs: this.inputs.map(Qn).map((r) => ({
        ...r,
        finalScriptSig: t && r.finalScriptSig || ft
      })),
      outputs: this.outputs.map(nn),
      witnesses: this.inputs.map((r) => r.finalScriptWitness || []),
      segwitFlag: n && this.hasWitnesses
    });
  }
  get unsignedTx() {
    return this.toBytes(!1, !1);
  }
  get hex() {
    return B.encode(this.toBytes(!0, this.hasWitnesses));
  }
  get hash() {
    return B.encode(Re(this.toBytes(!0)));
  }
  get id() {
    return B.encode(Re(this.toBytes(!0)).reverse());
  }
  // Input stuff
  checkInputIdx(t) {
    if (!Number.isSafeInteger(t) || 0 > t || t >= this.inputs.length)
      throw new Error(`Wrong input index=${t}`);
  }
  getInput(t) {
    return this.checkInputIdx(t), pi(this.inputs[t]);
  }
  get inputsLength() {
    return this.inputs.length;
  }
  // Modification
  addInput(t, n = !1) {
    if (!n && !this.signStatus().addInput)
      throw new Error("Tx has signed inputs, cannot add new one");
    return this.inputs.push(Wa(t, void 0, void 0, this.opts.disableScriptCheck)), this.inputs.length - 1;
  }
  updateInput(t, n, r = !1) {
    this.checkInputIdx(t);
    let i;
    if (!r) {
      const s = this.signStatus();
      (!s.addInput || s.inputs.includes(t)) && (i = Eh);
    }
    this.inputs[t] = Wa(n, this.inputs[t], i, this.opts.disableScriptCheck, this.opts.allowUnknown);
  }
  // Output stuff
  checkOutputIdx(t) {
    if (!Number.isSafeInteger(t) || 0 > t || t >= this.outputs.length)
      throw new Error(`Wrong output index=${t}`);
  }
  getOutput(t) {
    return this.checkOutputIdx(t), pi(this.outputs[t]);
  }
  getOutputAddress(t, n = Ln) {
    const r = this.getOutput(t);
    if (r.script)
      return Ie(n).encode(ht.decode(r.script));
  }
  get outputsLength() {
    return this.outputs.length;
  }
  normalizeOutput(t, n, r) {
    let { amount: i, script: s } = t;
    if (i === void 0 && (i = n?.amount), typeof i != "bigint")
      throw new Error(`Wrong amount type, should be of type bigint in sats, but got ${i} of type ${typeof i}`);
    typeof s == "string" && (s = B.decode(s)), s === void 0 && (s = n?.script);
    let o = { ...n, ...t, amount: i, script: s };
    if (o.amount === void 0 && delete o.amount, o = Ws(dr, o, n, r, this.opts.allowUnknown), Fo.encode(o), o.script && !this.opts.allowUnknownOutputs && ht.decode(o.script).type === "unknown")
      throw new Error("Transaction/output: unknown output script type, there is a chance that input is unspendable. Pass allowUnknownOutputs=true, if you sure");
    return this.opts.disableScriptCheck || al(o.script, o.redeemScript, o.witnessScript), o;
  }
  addOutput(t, n = !1) {
    if (!n && !this.signStatus().addOutput)
      throw new Error("Tx has signed outputs, cannot add new one");
    return this.outputs.push(this.normalizeOutput(t)), this.outputs.length - 1;
  }
  updateOutput(t, n, r = !1) {
    this.checkOutputIdx(t);
    let i;
    if (!r) {
      const s = this.signStatus();
      (!s.addOutput || s.outputs.includes(t)) && (i = xh);
    }
    this.outputs[t] = this.normalizeOutput(n, this.outputs[t], i);
  }
  addOutputAddress(t, n, r = Ln) {
    return this.addOutput({ script: ht.encode(Ie(r).decode(t)), amount: n });
  }
  // Utils
  get fee() {
    let t = 0n;
    for (const r of this.inputs) {
      const i = Gr(r);
      if (!i)
        throw new Error("Empty input amount");
      t += i.amount;
    }
    const n = this.outputs.map(nn);
    for (const r of n)
      t -= r.amount;
    return t;
  }
  // Signing
  // Based on https://github.com/bitcoin/bitcoin/blob/5871b5b5ab57a0caf9b7514eb162c491c83281d5/test/functional/test_framework/script.py#L624
  // There is optimization opportunity to re-use hashes for multiple inputs for witness v0/v1,
  // but we are trying to be less complicated for audit purpose for now.
  preimageLegacy(t, n, r) {
    const { isAny: i, isNone: s, isSingle: o } = za(r);
    if (t < 0 || !Number.isSafeInteger(t))
      throw new Error(`Invalid input idx=${t}`);
    if (o && t >= this.outputs.length || t >= this.inputs.length)
      return Zu.encode(1n);
    n = W.encode(W.decode(n).filter((l) => l !== "CODESEPARATOR"));
    let a = this.inputs.map(Qn).map((l, d) => ({
      ...l,
      finalScriptSig: d === t ? n : ft
    }));
    i ? a = [a[t]] : (s || o) && (a = a.map((l, d) => ({
      ...l,
      sequence: d === t ? l.sequence : 0
    })));
    let c = this.outputs.map(nn);
    s ? c = [] : o && (c = c.slice(0, t).fill(Hh).concat([c[t]]));
    const u = vn.encode({
      lockTime: this.lockTime,
      version: this.version,
      segwitFlag: !1,
      inputs: a,
      outputs: c
    });
    return Re(u, xn.encode(r));
  }
  preimageWitnessV0(t, n, r, i) {
    const { isAny: s, isNone: o, isSingle: a } = za(r);
    let c = $r, u = $r, l = $r;
    const d = this.inputs.map(Qn), p = this.outputs.map(nn);
    s || (c = Re(...d.map(hs.encode))), !s && !a && !o && (u = Re(...d.map((f) => nt.encode(f.sequence)))), !a && !o ? l = Re(...p.map(cn.encode)) : a && t < p.length && (l = Re(cn.encode(p[t])));
    const g = d[t];
    return Re(xn.encode(this.version), c, u, ut(32, !0).encode(g.txid), nt.encode(g.index), Xt.encode(n), Wr.encode(i), nt.encode(g.sequence), l, nt.encode(this.lockTime), nt.encode(r));
  }
  preimageWitnessV1(t, n, r, i, s = -1, o, a = 192, c) {
    if (!Array.isArray(i) || this.inputs.length !== i.length)
      throw new Error(`Invalid amounts array=${i}`);
    if (!Array.isArray(n) || this.inputs.length !== n.length)
      throw new Error(`Invalid prevOutScript array=${n}`);
    const u = [
      Me.encode(0),
      Me.encode(r),
      // U8 sigHash
      xn.encode(this.version),
      nt.encode(this.lockTime)
    ], l = r === X.DEFAULT ? X.ALL : r & 3, d = r & X.ANYONECANPAY, p = this.inputs.map(Qn), g = this.outputs.map(nn);
    d !== X.ANYONECANPAY && u.push(...[
      p.map(hs.encode),
      i.map(Wr.encode),
      n.map(Xt.encode),
      p.map((h) => nt.encode(h.sequence))
    ].map((h) => vt(De(...h)))), l === X.ALL && u.push(vt(De(...g.map(cn.encode))));
    const f = (c ? 1 : 0) | (o ? 2 : 0);
    if (u.push(new Uint8Array([f])), d === X.ANYONECANPAY) {
      const h = p[t];
      u.push(hs.encode(h), Wr.encode(i[t]), Xt.encode(n[t]), nt.encode(h.sequence));
    } else
      u.push(nt.encode(t));
    return f & 1 && u.push(vt(Xt.encode(c || ft))), l === X.SINGLE && u.push(t < g.length ? vt(cn.encode(g[t])) : $r), o && u.push(or(o, a), Me.encode(0), xn.encode(s)), Po("TapSighash", ...u);
  }
  // Signer can be privateKey OR instance of bip32 HD stuff
  signIdx(t, n, r, i) {
    this.checkInputIdx(n);
    const s = this.inputs[n], o = Ga(s, this.opts.allowLegacyWitnessUtxo);
    if (!at(t)) {
      if (!s.bip32Derivation || !s.bip32Derivation.length)
        throw new Error("bip32Derivation: empty");
      const l = s.bip32Derivation.filter((p) => p[1].fingerprint == t.fingerprint).map(([p, { path: g }]) => {
        let f = t;
        for (const h of g)
          f = f.deriveChild(h);
        if (!yt(f.publicKey, p))
          throw new Error("bip32Derivation: wrong pubKey");
        if (!f.privateKey)
          throw new Error("bip32Derivation: no privateKey");
        return f;
      });
      if (!l.length)
        throw new Error(`bip32Derivation: no items with fingerprint=${t.fingerprint}`);
      let d = !1;
      for (const p of l)
        this.signIdx(p.privateKey, n) && (d = !0);
      return d;
    }
    r ? r.forEach(Gh) : r = [o.defaultSighash];
    const a = o.sighash;
    if (!r.includes(a))
      throw new Error(`Input with not allowed sigHash=${a}. Allowed: ${r.join(", ")}`);
    const { sigOutputs: c } = this.inputSighash(n);
    if (c === X.SINGLE && n >= this.outputs.length)
      throw new Error(`Input with sighash SINGLE, but there is no output with corresponding index=${n}`);
    const u = Gr(s);
    if (o.txType === "taproot") {
      const l = this.inputs.map(Gr), d = l.map((w) => w.script), p = l.map((w) => w.amount);
      let g = !1, f = Co(t), h = s.tapMerkleRoot || ft;
      if (s.tapInternalKey) {
        const { pubKey: w, privKey: E } = Wh(t, f, s.tapInternalKey, h), [S] = Ks(s.tapInternalKey, h);
        if (yt(S, w)) {
          const O = this.preimageWitnessV1(n, d, a, p), R = De(La(O, E, i), a !== X.DEFAULT ? new Uint8Array([a]) : ft);
          this.updateInput(n, { tapKeySig: R }, !0), g = !0;
        }
      }
      if (s.tapLeafScript) {
        s.tapScriptSig = s.tapScriptSig || [];
        for (const [w, E] of s.tapLeafScript) {
          const S = E.subarray(0, -1), O = W.decode(S), R = E[E.length - 1], L = or(S, R);
          if (O.findIndex((_) => at(_) && yt(_, f)) === -1)
            continue;
          const m = this.preimageWitnessV1(n, d, a, p, void 0, S, R), Q = De(La(m, t, i), a !== X.DEFAULT ? new Uint8Array([a]) : ft);
          this.updateInput(n, { tapScriptSig: [[{ pubKey: f, leafHash: L }, Q]] }, !0), g = !0;
        }
      }
      if (!g)
        throw new Error("No taproot scripts signed");
      return !0;
    } else {
      const l = tl(t);
      let d = !1;
      const p = Ju(l);
      for (const h of W.decode(o.lastScript))
        at(h) && (yt(h, l) || yt(h, p)) && (d = !0);
      if (!d)
        throw new Error(`Input script doesn't have pubKey: ${o.lastScript}`);
      let g;
      if (o.txType === "legacy")
        g = this.preimageLegacy(n, o.lastScript, a);
      else if (o.txType === "segwit") {
        let h = o.lastScript;
        o.last.type === "wpkh" && (h = ht.encode({ type: "pkh", hash: o.last.hash })), g = this.preimageWitnessV0(n, h, a, u.amount);
      } else
        throw new Error(`Transaction/sign: unknown tx type: ${o.txType}`);
      const f = uh(g, t, this.opts.lowR);
      this.updateInput(n, {
        partialSig: [[l, De(f, new Uint8Array([a]))]]
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
    let i = 0;
    for (let s = 0; s < this.inputs.length; s++)
      try {
        this.signIdx(t, s, n, r) && i++;
      } catch {
      }
    if (!i)
      throw new Error("No inputs signed");
    return i;
  }
  finalizeIdx(t) {
    if (this.checkInputIdx(t), this.fee < 0n)
      throw new Error("Outputs spends more than inputs amount");
    const n = this.inputs[t], r = Ga(n, this.opts.allowLegacyWitnessUtxo);
    if (r.txType === "taproot") {
      if (n.tapKeySig)
        n.finalScriptWitness = [n.tapKeySig];
      else if (n.tapLeafScript && n.tapScriptSig) {
        const c = n.tapLeafScript.sort((u, l) => ae.encode(u[0]).length - ae.encode(l[0]).length);
        for (const [u, l] of c) {
          const d = l.slice(0, -1), p = l[l.length - 1], g = ht.decode(d), f = or(d, p), h = n.tapScriptSig.filter((E) => yt(E[0].leafHash, f));
          let w = [];
          if (g.type === "tr_ms") {
            const E = g.m, S = g.pubkeys;
            let O = 0;
            for (const R of S) {
              const L = h.findIndex((P) => yt(P[0].pubKey, R));
              if (O === E || L === -1) {
                w.push(ft);
                continue;
              }
              w.push(h[L][1]), O++;
            }
            if (O !== E)
              continue;
          } else if (g.type === "tr_ns") {
            for (const E of g.pubkeys) {
              const S = h.findIndex((O) => yt(O[0].pubKey, E));
              S !== -1 && w.push(h[S][1]);
            }
            if (w.length !== g.pubkeys.length)
              continue;
          } else if (g.type === "unknown" && this.opts.allowUnknownInputs) {
            const E = W.decode(d);
            if (w = h.map(([{ pubKey: S }, O]) => {
              const R = E.findIndex((L) => at(L) && yt(L, S));
              if (R === -1)
                throw new Error("finalize/taproot: cannot find position of pubkey in script");
              return { signature: O, pos: R };
            }).sort((S, O) => S.pos - O.pos).map((S) => S.signature), !w.length)
              continue;
          } else {
            const E = this.opts.customScripts;
            if (E)
              for (const S of E) {
                if (!S.finalizeTaproot)
                  continue;
                const O = W.decode(d), R = S.encode(O);
                if (R === void 0)
                  continue;
                const L = S.finalizeTaproot(d, R, h);
                if (L) {
                  n.finalScriptWitness = L.concat(ae.encode(u)), n.finalScriptSig = ft, ds(n);
                  return;
                }
              }
            throw new Error("Finalize: Unknown tapLeafScript");
          }
          n.finalScriptWitness = w.reverse().concat([d, ae.encode(u)]);
          break;
        }
        if (!n.finalScriptWitness)
          throw new Error("finalize/taproot: empty witness");
      } else
        throw new Error("finalize/taproot: unknown input");
      n.finalScriptSig = ft, ds(n);
      return;
    }
    if (!n.partialSig || !n.partialSig.length)
      throw new Error("Not enough partial sign");
    let i = ft, s = [];
    if (r.last.type === "ms") {
      const c = r.last.m, u = r.last.pubkeys;
      let l = [];
      for (const d of u) {
        const p = n.partialSig.find((g) => yt(d, g[0]));
        p && l.push(p[1]);
      }
      if (l = l.slice(0, c), l.length !== c)
        throw new Error(`Multisig: wrong signatures count, m=${c} n=${u.length} signatures=${l.length}`);
      i = W.encode([0, ...l]);
    } else if (r.last.type === "pk")
      i = W.encode([n.partialSig[0][1]]);
    else if (r.last.type === "pkh")
      i = W.encode([n.partialSig[0][1], n.partialSig[0][0]]);
    else if (r.last.type === "wpkh")
      i = ft, s = [n.partialSig[0][1], n.partialSig[0][0]];
    else if (r.last.type === "unknown" && !this.opts.allowUnknownInputs)
      throw new Error("Unknown inputs not allowed");
    let o, a;
    if (r.type.includes("wsh-") && (i.length && r.lastScript.length && (s = W.decode(i).map((c) => {
      if (c === 0)
        return ft;
      if (at(c))
        return c;
      throw new Error(`Wrong witness op=${c}`);
    })), s = s.concat(r.lastScript)), r.txType === "segwit" && (a = s), r.type.startsWith("sh-wsh-") ? o = W.encode([W.encode([0, vt(r.lastScript)])]) : r.type.startsWith("sh-") ? o = W.encode([...W.decode(i), r.lastScript]) : r.type.startsWith("wsh-") || r.txType !== "segwit" && (o = i), !o && !a)
      throw new Error("Unknown error finalizing input");
    o && (n.finalScriptSig = o), a && (n.finalScriptWitness = a), ds(n);
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
    for (const i of ["PSBTVersion", "version", "lockTime"])
      if (this.opts[i] !== t.opts[i])
        throw new Error(`Transaction/combine: different ${i} this=${this.opts[i]} other=${t.opts[i]}`);
    for (const i of ["inputs", "outputs"])
      if (this[i].length !== t[i].length)
        throw new Error(`Transaction/combine: different ${i} length this=${this[i].length} other=${t[i].length}`);
    const n = this.global.unsignedTx ? ir.encode(this.global.unsignedTx) : ft, r = t.global.unsignedTx ? ir.encode(t.global.unsignedTx) : ft;
    if (!yt(n, r))
      throw new Error("Transaction/combine: different unsigned tx");
    this.global = Ws(Vo, this.global, t.global, void 0, this.opts.allowUnknown);
    for (let i = 0; i < this.inputs.length; i++)
      this.updateInput(i, t.inputs[i], !0);
    for (let i = 0; i < this.outputs.length; i++)
      this.updateOutput(i, t.outputs[i], !0);
    return this;
  }
  clone() {
    return qr.fromPSBT(this.toPSBT(this.opts.PSBTVersion), this.opts);
  }
};
class qe extends Qt {
  constructor(t) {
    super(ps(t));
  }
  static fromPSBT(t, n) {
    return Qt.fromPSBT(t, ps(n));
  }
  static fromRaw(t, n) {
    return Qt.fromRaw(t, ps(n));
  }
}
qe.ARK_TX_OPTS = {
  allowUnknown: !0,
  allowUnknownOutputs: !0,
  allowUnknownInputs: !0
};
function ps(e) {
  return { ...qe.ARK_TX_OPTS, ...e };
}
class zo extends Error {
  idx;
  // Indice of participant
  constructor(t, n) {
    super(n), this.idx = t;
  }
}
const { taggedHash: fl, pointToBytes: Nr } = Be.utils, re = Ve.Point, q = re.Fn, he = Ve.lengths.publicKey, Zs = new Uint8Array(he), qa = We(ut(33), {
  decode: (e) => pr(e) ? Zs : e.toBytes(!0),
  encode: (e) => lr(e, Zs) ? re.ZERO : re.fromBytes(e)
}), Ya = Lt(Zu, (e) => (hu("n", e, 1n, q.ORDER), e)), kn = St({ R1: qa, R2: qa }), dl = St({ k1: Ya, k2: Ya, publicKey: ut(he) });
function Za(e, ...t) {
}
function Wt(e, ...t) {
  if (!Array.isArray(e))
    throw new Error("expected array");
  e.forEach((n) => Y(n, ...t));
}
function Xa(e) {
  if (!Array.isArray(e))
    throw new Error("expected array");
  e.forEach((t, n) => {
    if (typeof t != "boolean")
      throw new Error("expected boolean in xOnly array, got" + t + "(" + n + ")");
  });
}
const gi = (e, ...t) => q.create(q.fromBytes(fl(e, ...t), !0)), Jn = (e, t) => vr(e.y) ? t : q.neg(t);
function un(e) {
  return re.BASE.multiply(e);
}
function pr(e) {
  return e.equals(re.ZERO);
}
function Xs(e) {
  return Wt(e, he), e.sort(fi);
}
function hl(e) {
  Wt(e, he);
  for (let t = 1; t < e.length; t++)
    if (!lr(e[t], e[0]))
      return e[t];
  return Zs;
}
function pl(e) {
  return Wt(e, he), fl("KeyAgg list", ...e);
}
function gl(e, t, n) {
  return Y(e, he), Y(t, he), lr(e, t) ? 1n : gi("KeyAgg coefficient", n, e);
}
function Qs(e, t = [], n = []) {
  if (Wt(e, he), Wt(t, 32), t.length !== n.length)
    throw new Error("The tweaks and isXonly arrays must have the same length");
  const r = hl(e), i = pl(e);
  let s = re.ZERO;
  for (let c = 0; c < e.length; c++) {
    let u;
    try {
      u = re.fromBytes(e[c]);
    } catch {
      throw new zo(c, "pubkey");
    }
    s = s.add(u.multiply(gl(e[c], r, i)));
  }
  let o = q.ONE, a = q.ZERO;
  for (let c = 0; c < t.length; c++) {
    const u = n[c] && !vr(s.y) ? q.neg(q.ONE) : q.ONE, l = q.fromBytes(t[c]);
    if (s = s.multiply(u).add(un(l)), pr(s))
      throw new Error("The result of tweaking cannot be infinity");
    o = q.mul(u, o), a = q.add(l, q.mul(u, a));
  }
  return { aggPublicKey: s, gAcc: o, tweakAcc: a };
}
const Qa = (e, t, n, r, i, s) => gi("MuSig/nonce", e, new Uint8Array([t.length]), t, new Uint8Array([n.length]), n, i, Er(s.length, 4), s, new Uint8Array([r]));
function Yh(e, t, n = new Uint8Array(0), r, i = new Uint8Array(0), s = br(32)) {
  if (Y(e, he), Za(t, 32), Y(n), ![0, 32].includes(n.length))
    throw new Error("wrong aggPublicKey");
  Za(), Y(i), Y(s, 32);
  const o = Uint8Array.of(0), a = Qa(s, e, n, 0, o, i), c = Qa(s, e, n, 1, o, i);
  return {
    secret: dl.encode({ k1: a, k2: c, publicKey: e }),
    public: kn.encode({ R1: un(a), R2: un(c) })
  };
}
function Zh(e) {
  Wt(e, 66);
  let t = re.ZERO, n = re.ZERO;
  for (let r = 0; r < e.length; r++) {
    const i = e[r];
    try {
      const { R1: s, R2: o } = kn.decode(i);
      if (pr(s) || pr(o))
        throw new Error("infinity point");
      t = t.add(s), n = n.add(o);
    } catch {
      throw new zo(r, "pubnonce");
    }
  }
  return kn.encode({ R1: t, R2: n });
}
class Xh {
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
  constructor(t, n, r, i = [], s = []) {
    if (Wt(n, 33), Wt(i, 32), Xa(s), Y(r), i.length !== s.length)
      throw new Error("The tweaks and isXonly arrays must have the same length");
    const { aggPublicKey: o, gAcc: a, tweakAcc: c } = Qs(n, i, s), { R1: u, R2: l } = kn.decode(t);
    this.publicKeys = n, this.Q = o, this.gAcc = a, this.tweakAcc = c, this.b = gi("MuSig/noncecoef", t, Nr(o), r);
    const d = u.add(l.multiply(this.b));
    this.R = pr(d) ? re.BASE : d, this.e = gi("BIP0340/challenge", Nr(this.R), Nr(o), r), this.tweaks = i, this.isXonly = s, this.L = pl(n), this.secondKey = hl(n);
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
    if (!n.some((s) => lr(s, r)))
      throw new Error("The signer's pubkey must be included in the list of pubkeys");
    return gl(r, this.secondKey, this.L);
  }
  partialSigVerifyInternal(t, n, r) {
    const { Q: i, gAcc: s, b: o, R: a, e: c } = this, u = q.fromBytes(t, !0);
    if (!q.isValid(u))
      return !1;
    const { R1: l, R2: d } = kn.decode(n), p = l.add(d.multiply(o)), g = vr(a.y) ? p : p.negate(), f = re.fromBytes(r), h = this.getSessionKeyAggCoeff(f), w = q.mul(Jn(i, 1n), s), E = un(u), S = g.add(f.multiply(q.mul(c, q.mul(h, w))));
    return E.equals(S);
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
    if (Y(n, 32), typeof r != "boolean")
      throw new Error("expected boolean");
    const { Q: i, gAcc: s, b: o, R: a, e: c } = this, { k1: u, k2: l, publicKey: d } = dl.decode(t);
    if (t.fill(0, 0, 64), !q.isValid(u))
      throw new Error("wrong k1");
    if (!q.isValid(l))
      throw new Error("wrong k1");
    const p = Jn(a, u), g = Jn(a, l), f = q.fromBytes(n);
    if (q.is0(f))
      throw new Error("wrong d_");
    const h = un(f), w = h.toBytes(!0);
    if (!lr(w, d))
      throw new Error("Public key does not match nonceGen argument");
    const E = this.getSessionKeyAggCoeff(h), S = Jn(i, 1n), O = q.mul(S, q.mul(s, f)), R = q.add(p, q.add(q.mul(o, g), q.mul(c, q.mul(E, O)))), L = q.toBytes(R);
    if (!r) {
      const P = kn.encode({
        R1: un(u),
        R2: un(l)
      });
      if (!this.partialSigVerifyInternal(L, P, w))
        throw new Error("Partial signature verification failed");
    }
    return L;
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
    const { publicKeys: i, tweaks: s, isXonly: o } = this;
    if (Y(t, 32), Wt(n, 66), Wt(i, he), Wt(s, 32), Xa(o), ze(r), n.length !== i.length)
      throw new Error("The pubNonces and publicKeys arrays must have the same length");
    if (s.length !== o.length)
      throw new Error("The tweaks and isXonly arrays must have the same length");
    if (r >= n.length)
      throw new Error("index outside of pubKeys/pubNonces");
    return this.partialSigVerifyInternal(t, n[r], i[r]);
  }
  /**
   * Aggregates partial signatures from multiple signers into a single final signature.
   * @param partialSigs An array of partial signatures from each signer (Uint8Array).
   * @param sessionCtx The session context containing all necessary information for signing.
   * @returns The final aggregate signature (Uint8Array).
   * @throws {Error} If the input is invalid, such as wrong array sizes, invalid signature.
   */
  partialSigAgg(t) {
    Wt(t, 32);
    const { Q: n, tweakAcc: r, R: i, e: s } = this;
    let o = 0n;
    for (let c = 0; c < t.length; c++) {
      const u = q.fromBytes(t[c], !0);
      if (!q.isValid(u))
        throw new zo(c, "psig");
      o = q.add(o, u);
    }
    const a = Jn(n, 1n);
    return o = q.add(o, q.mul(s, q.mul(a, r))), Jt(Nr(i), q.toBytes(o));
  }
}
function Qh(e) {
  const t = Yh(e);
  return { secNonce: t.secret, pubNonce: t.public };
}
function Jh(e) {
  return Zh(e);
}
/*! noble-hashes - MIT License (c) 2022 Paul Miller (paulmillr.com) */
function jo(e) {
  return e instanceof Uint8Array || ArrayBuffer.isView(e) && e.constructor.name === "Uint8Array";
}
function hn(e, t = "") {
  if (!Number.isSafeInteger(e) || e < 0) {
    const n = t && `"${t}" `;
    throw new Error(`${n}expected integer >0, got ${e}`);
  }
}
function st(e, t, n = "") {
  const r = jo(e), i = e?.length, s = t !== void 0;
  if (!r || s && i !== t) {
    const o = n && `"${n}" `, a = s ? ` of length ${t}` : "", c = r ? `length=${i}` : `type=${typeof e}`;
    throw new Error(o + "expected Uint8Array" + a + ", got " + c);
  }
  return e;
}
function yl(e) {
  if (typeof e != "function" || typeof e.create != "function")
    throw new Error("Hash must wrapped by utils.createHasher");
  hn(e.outputLen), hn(e.blockLen);
}
function yi(e, t = !0) {
  if (e.destroyed)
    throw new Error("Hash instance has been destroyed");
  if (t && e.finished)
    throw new Error("Hash#digest() has already been called");
}
function tp(e, t) {
  st(e, void 0, "digestInto() output");
  const n = t.outputLen;
  if (e.length < n)
    throw new Error('"digestInto() output" expected to be of length >=' + n);
}
function wi(...e) {
  for (let t = 0; t < e.length; t++)
    e[t].fill(0);
}
function gs(e) {
  return new DataView(e.buffer, e.byteOffset, e.byteLength);
}
function se(e, t) {
  return e << 32 - t | e >>> t;
}
const wl = /* @ts-ignore */ typeof Uint8Array.from([]).toHex == "function" && typeof Uint8Array.fromHex == "function", ep = /* @__PURE__ */ Array.from({ length: 256 }, (e, t) => t.toString(16).padStart(2, "0"));
function ji(e) {
  if (st(e), wl)
    return e.toHex();
  let t = "";
  for (let n = 0; n < e.length; n++)
    t += ep[e[n]];
  return t;
}
const we = { _0: 48, _9: 57, A: 65, F: 70, a: 97, f: 102 };
function Ja(e) {
  if (e >= we._0 && e <= we._9)
    return e - we._0;
  if (e >= we.A && e <= we.F)
    return e - (we.A - 10);
  if (e >= we.a && e <= we.f)
    return e - (we.a - 10);
}
function mi(e) {
  if (typeof e != "string")
    throw new Error("hex string expected, got " + typeof e);
  if (wl)
    return Uint8Array.fromHex(e);
  const t = e.length, n = t / 2;
  if (t % 2)
    throw new Error("hex string expected, got unpadded hex of length " + t);
  const r = new Uint8Array(n);
  for (let i = 0, s = 0; i < n; i++, s += 2) {
    const o = Ja(e.charCodeAt(s)), a = Ja(e.charCodeAt(s + 1));
    if (o === void 0 || a === void 0) {
      const c = e[s] + e[s + 1];
      throw new Error('hex string expected, got non-hex character "' + c + '" at index ' + s);
    }
    r[i] = o * 16 + a;
  }
  return r;
}
function ce(...e) {
  let t = 0;
  for (let r = 0; r < e.length; r++) {
    const i = e[r];
    st(i), t += i.length;
  }
  const n = new Uint8Array(t);
  for (let r = 0, i = 0; r < e.length; r++) {
    const s = e[r];
    n.set(s, i), i += s.length;
  }
  return n;
}
function np(e, t = {}) {
  const n = (i, s) => e(s).update(i).digest(), r = e(void 0);
  return n.outputLen = r.outputLen, n.blockLen = r.blockLen, n.create = (i) => e(i), Object.assign(n, t), Object.freeze(n);
}
function Wi(e = 32) {
  const t = typeof globalThis == "object" ? globalThis.crypto : null;
  if (typeof t?.getRandomValues != "function")
    throw new Error("crypto.getRandomValues must be defined");
  return t.getRandomValues(new Uint8Array(e));
}
const rp = (e) => ({
  oid: Uint8Array.from([6, 9, 96, 134, 72, 1, 101, 3, 4, 2, e])
});
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const Wo = /* @__PURE__ */ BigInt(0), Js = /* @__PURE__ */ BigInt(1);
function bi(e, t = "") {
  if (typeof e != "boolean") {
    const n = t && `"${t}" `;
    throw new Error(n + "expected boolean, got type=" + typeof e);
  }
  return e;
}
function ml(e) {
  if (typeof e == "bigint") {
    if (!Yr(e))
      throw new Error("positive bigint expected, got " + e);
  } else
    hn(e);
  return e;
}
function Rr(e) {
  const t = ml(e).toString(16);
  return t.length & 1 ? "0" + t : t;
}
function bl(e) {
  if (typeof e != "string")
    throw new Error("hex string expected, got " + typeof e);
  return e === "" ? Wo : BigInt("0x" + e);
}
function Gn(e) {
  return bl(ji(e));
}
function El(e) {
  return bl(ji(ip(st(e)).reverse()));
}
function Go(e, t) {
  hn(t), e = ml(e);
  const n = mi(e.toString(16).padStart(t * 2, "0"));
  if (n.length !== t)
    throw new Error("number too large");
  return n;
}
function xl(e, t) {
  return Go(e, t).reverse();
}
function ip(e) {
  return Uint8Array.from(e);
}
function sp(e) {
  return Uint8Array.from(e, (t, n) => {
    const r = t.charCodeAt(0);
    if (t.length !== 1 || r > 127)
      throw new Error(`string contains non-ASCII character "${e[n]}" with code ${r} at position ${n}`);
    return r;
  });
}
const Yr = (e) => typeof e == "bigint" && Wo <= e;
function op(e, t, n) {
  return Yr(e) && Yr(t) && Yr(n) && t <= e && e < n;
}
function ap(e, t, n, r) {
  if (!op(t, n, r))
    throw new Error("expected valid " + e + ": " + n + " <= n < " + r + ", got " + t);
}
function cp(e) {
  let t;
  for (t = 0; e > Wo; e >>= Js, t += 1)
    ;
  return t;
}
const qo = (e) => (Js << BigInt(e)) - Js;
function up(e, t, n) {
  if (hn(e, "hashLen"), hn(t, "qByteLen"), typeof n != "function")
    throw new Error("hmacFn must be a function");
  const r = (w) => new Uint8Array(w), i = Uint8Array.of(), s = Uint8Array.of(0), o = Uint8Array.of(1), a = 1e3;
  let c = r(e), u = r(e), l = 0;
  const d = () => {
    c.fill(1), u.fill(0), l = 0;
  }, p = (...w) => n(u, ce(c, ...w)), g = (w = i) => {
    u = p(s, w), c = p(), w.length !== 0 && (u = p(o, w), c = p());
  }, f = () => {
    if (l++ >= a)
      throw new Error("drbg: tried max amount of iterations");
    let w = 0;
    const E = [];
    for (; w < t; ) {
      c = p();
      const S = c.slice();
      E.push(S), w += c.length;
    }
    return ce(...E);
  };
  return (w, E) => {
    d(), g(w);
    let S;
    for (; !(S = E(f())); )
      g();
    return d(), S;
  };
}
function Yo(e, t = {}, n = {}) {
  if (!e || typeof e != "object")
    throw new Error("expected valid options object");
  function r(s, o, a) {
    const c = e[s];
    if (a && c === void 0)
      return;
    const u = typeof c;
    if (u !== o || c === null)
      throw new Error(`param "${s}" is invalid: expected ${o}, got ${u}`);
  }
  const i = (s, o) => Object.entries(s).forEach(([a, c]) => r(a, c, o));
  i(t, !1), i(n, !0);
}
function tc(e) {
  const t = /* @__PURE__ */ new WeakMap();
  return (n, ...r) => {
    const i = t.get(n);
    if (i !== void 0)
      return i;
    const s = e(n, ...r);
    return t.set(n, s), s;
  };
}
/*! noble-secp256k1 - MIT License (c) 2019 Paul Miller (paulmillr.com) */
const Tl = {
  p: 0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffefffffc2fn,
  n: 0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141n,
  h: 1n,
  a: 0n,
  b: 7n,
  Gx: 0x79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798n,
  Gy: 0x483ada7726a3c4655da4fbfc0e1108a8fd17b448a68554199c47d08ffb10d4b8n
}, { p: He, n: Ye, Gx: lp, Gy: fp, b: Sl } = Tl, Tt = 32, pn = 64, Ei = {
  publicKey: Tt + 1,
  publicKeyUncompressed: pn + 1,
  signature: pn,
  seed: Tt + Tt / 2
}, dp = (...e) => {
  "captureStackTrace" in Error && typeof Error.captureStackTrace == "function" && Error.captureStackTrace(...e);
}, rt = (e = "") => {
  const t = new Error(e);
  throw dp(t, rt), t;
}, hp = (e) => typeof e == "bigint", pp = (e) => typeof e == "string", gp = (e) => e instanceof Uint8Array || ArrayBuffer.isView(e) && e.constructor.name === "Uint8Array", Dt = (e, t, n = "") => {
  const r = gp(e), i = e?.length, s = t !== void 0;
  if (!r || s && i !== t) {
    const o = n && `"${n}" `, a = s ? ` of length ${t}` : "", c = r ? `length=${i}` : `type=${typeof e}`;
    rt(o + "expected Uint8Array" + a + ", got " + c);
  }
  return e;
}, Ze = (e) => new Uint8Array(e), vl = (e, t) => e.toString(16).padStart(t, "0"), kl = (e) => Array.from(Dt(e)).map((t) => vl(t, 2)).join(""), me = { _0: 48, _9: 57, A: 65, F: 70, a: 97, f: 102 }, ec = (e) => {
  if (e >= me._0 && e <= me._9)
    return e - me._0;
  if (e >= me.A && e <= me.F)
    return e - (me.A - 10);
  if (e >= me.a && e <= me.f)
    return e - (me.a - 10);
}, Al = (e) => {
  const t = "hex invalid";
  if (!pp(e))
    return rt(t);
  const n = e.length, r = n / 2;
  if (n % 2)
    return rt(t);
  const i = Ze(r);
  for (let s = 0, o = 0; s < r; s++, o += 2) {
    const a = ec(e.charCodeAt(o)), c = ec(e.charCodeAt(o + 1));
    if (a === void 0 || c === void 0)
      return rt(t);
    i[s] = a * 16 + c;
  }
  return i;
}, Il = () => globalThis?.crypto, nc = () => Il()?.subtle ?? rt("crypto.subtle must be defined, consider polyfill"), pe = (...e) => {
  const t = Ze(e.reduce((r, i) => r + Dt(i).length, 0));
  let n = 0;
  return e.forEach((r) => {
    t.set(r, n), n += r.length;
  }), t;
}, Gi = (e = Tt) => Il().getRandomValues(Ze(e)), gr = BigInt, gn = (e, t, n, r = "bad number: out of range") => hp(e) && t <= e && e < n ? e : rt(r), V = (e, t = He) => {
  const n = e % t;
  return n >= 0n ? n : t + n;
}, Te = (e) => V(e, Ye), Ol = (e, t) => {
  (e === 0n || t <= 0n) && rt("no inverse n=" + e + " mod=" + t);
  let n = V(e, t), r = t, i = 0n, s = 1n;
  for (; n !== 0n; ) {
    const o = r / n, a = r % n, c = i - s * o;
    r = n, n = a, i = s, s = c;
  }
  return r === 1n ? V(i, t) : rt("no inverse");
}, Bl = (e) => {
  const t = Yi[e];
  return typeof t != "function" && rt("hashes." + e + " not set"), t;
}, ys = (e) => e instanceof $t ? e : rt("Point expected"), $l = (e) => V(V(e * e) * e + Sl), rc = (e) => gn(e, 0n, He), Zr = (e) => gn(e, 1n, He), to = (e) => gn(e, 1n, Ye), Cn = (e) => (e & 1n) === 0n, qi = (e) => Uint8Array.of(e), yp = (e) => qi(Cn(e) ? 2 : 3), Nl = (e) => {
  const t = $l(Zr(e));
  let n = 1n;
  for (let r = t, i = (He + 1n) / 4n; i > 0n; i >>= 1n)
    i & 1n && (n = n * r % He), r = r * r % He;
  return V(n * n) === t ? n : rt("sqrt invalid");
};
class $t {
  static BASE;
  static ZERO;
  X;
  Y;
  Z;
  constructor(t, n, r) {
    this.X = rc(t), this.Y = Zr(n), this.Z = rc(r), Object.freeze(this);
  }
  static CURVE() {
    return Tl;
  }
  /** Create 3d xyz point from 2d xy. (0, 0) => (0, 1, 0), not (0, 0, 1) */
  static fromAffine(t) {
    const { x: n, y: r } = t;
    return n === 0n && r === 0n ? rn : new $t(n, r, 1n);
  }
  /** Convert Uint8Array or hex string to Point. */
  static fromBytes(t) {
    Dt(t);
    const { publicKey: n, publicKeyUncompressed: r } = Ei;
    let i;
    const s = t.length, o = t[0], a = t.subarray(1), c = Pn(a, 0, Tt);
    if (s === n && (o === 2 || o === 3)) {
      let u = Nl(c);
      const l = Cn(u);
      Cn(gr(o)) !== l && (u = V(-u)), i = new $t(c, u, 1n);
    }
    return s === r && o === 4 && (i = new $t(c, Pn(a, Tt, pn), 1n)), i ? i.assertValidity() : rt("bad point: not on curve");
  }
  static fromHex(t) {
    return $t.fromBytes(Al(t));
  }
  get x() {
    return this.toAffine().x;
  }
  get y() {
    return this.toAffine().y;
  }
  /** Equality check: compare points P&Q. */
  equals(t) {
    const { X: n, Y: r, Z: i } = this, { X: s, Y: o, Z: a } = ys(t), c = V(n * a), u = V(s * i), l = V(r * a), d = V(o * i);
    return c === u && l === d;
  }
  is0() {
    return this.equals(rn);
  }
  /** Flip point over y coordinate. */
  negate() {
    return new $t(this.X, V(-this.Y), this.Z);
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
    const { X: n, Y: r, Z: i } = this, { X: s, Y: o, Z: a } = ys(t), c = 0n, u = Sl;
    let l = 0n, d = 0n, p = 0n;
    const g = V(u * 3n);
    let f = V(n * s), h = V(r * o), w = V(i * a), E = V(n + r), S = V(s + o);
    E = V(E * S), S = V(f + h), E = V(E - S), S = V(n + i);
    let O = V(s + a);
    return S = V(S * O), O = V(f + w), S = V(S - O), O = V(r + i), l = V(o + a), O = V(O * l), l = V(h + w), O = V(O - l), p = V(c * S), l = V(g * w), p = V(l + p), l = V(h - p), p = V(h + p), d = V(l * p), h = V(f + f), h = V(h + f), w = V(c * w), S = V(g * S), h = V(h + w), w = V(f - w), w = V(c * w), S = V(S + w), f = V(h * S), d = V(d + f), f = V(O * S), l = V(E * l), l = V(l - f), f = V(E * h), p = V(O * p), p = V(p + f), new $t(l, d, p);
  }
  subtract(t) {
    return this.add(ys(t).negate());
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
      return rn;
    if (to(t), t === 1n)
      return this;
    if (this.equals(Xe))
      return Fp(t).p;
    let r = rn, i = Xe;
    for (let s = this; t > 0n; s = s.double(), t >>= 1n)
      t & 1n ? r = r.add(s) : n && (i = i.add(s));
    return r;
  }
  multiplyUnsafe(t) {
    return this.multiply(t, !1);
  }
  /** Convert point to 2d xy affine point. (X, Y, Z) ∋ (x=X/Z, y=Y/Z) */
  toAffine() {
    const { X: t, Y: n, Z: r } = this;
    if (this.equals(rn))
      return { x: 0n, y: 0n };
    if (r === 1n)
      return { x: t, y: n };
    const i = Ol(r, He);
    return V(r * i) !== 1n && rt("inverse invalid"), { x: V(t * i), y: V(n * i) };
  }
  /** Checks if the point is valid and on-curve. */
  assertValidity() {
    const { x: t, y: n } = this.toAffine();
    return Zr(t), Zr(n), V(n * n) === $l(t) ? this : rt("bad point: not on curve");
  }
  /** Converts point to 33/65-byte Uint8Array. */
  toBytes(t = !0) {
    const { x: n, y: r } = this.assertValidity().toAffine(), i = Ht(n);
    return t ? pe(yp(r), i) : pe(qi(4), i, Ht(r));
  }
  toHex(t) {
    return kl(this.toBytes(t));
  }
}
const Xe = new $t(lp, fp, 1n), rn = new $t(0n, 1n, 0n);
$t.BASE = Xe;
$t.ZERO = rn;
const wp = (e, t, n) => Xe.multiply(t, !1).add(e.multiply(n, !1)).assertValidity(), Qe = (e) => gr("0x" + (kl(e) || "0")), Pn = (e, t, n) => Qe(e.subarray(t, n)), mp = 2n ** 256n, Ht = (e) => Al(vl(gn(e, 0n, mp), pn)), Rl = (e) => {
  const t = Qe(Dt(e, Tt, "secret key"));
  return gn(t, 1n, Ye, "invalid secret key: outside of range");
}, Ul = (e) => e > Ye >> 1n, bp = (e) => {
  [0, 1, 2, 3].includes(e) || rt("recovery id must be valid and present");
}, Ep = (e) => {
  e != null && !ic.includes(e) && rt(`Signature format must be one of: ${ic.join(", ")}`), e === Cl && rt('Signature format "der" is not supported: switch to noble-curves');
}, xp = (e, t = _n) => {
  Ep(t);
  const n = Ei.signature, r = n + 1;
  let i = `Signature format "${t}" expects Uint8Array with length `;
  t === _n && e.length !== n && rt(i + n), t === Ti && e.length !== r && rt(i + r);
};
class xi {
  r;
  s;
  recovery;
  constructor(t, n, r) {
    this.r = to(t), this.s = to(n), r != null && (this.recovery = r), Object.freeze(this);
  }
  static fromBytes(t, n = _n) {
    xp(t, n);
    let r;
    n === Ti && (r = t[0], t = t.subarray(1));
    const i = Pn(t, 0, Tt), s = Pn(t, Tt, pn);
    return new xi(i, s, r);
  }
  addRecoveryBit(t) {
    return new xi(this.r, this.s, t);
  }
  hasHighS() {
    return Ul(this.s);
  }
  toBytes(t = _n) {
    const { r: n, s: r, recovery: i } = this, s = pe(Ht(n), Ht(r));
    return t === Ti ? (bp(i), pe(Uint8Array.of(i), s)) : s;
  }
}
const Ll = (e) => {
  const t = e.length * 8 - 256;
  t > 1024 && rt("msg invalid");
  const n = Qe(e);
  return t > 0 ? n >> gr(t) : n;
}, Tp = (e) => Te(Ll(Dt(e))), _n = "compact", Ti = "recovered", Cl = "der", ic = [_n, Ti, Cl], sc = {
  lowS: !0,
  prehash: !0,
  format: _n,
  extraEntropy: !1
}, oc = "SHA-256", Yi = {
  hmacSha256Async: async (e, t) => {
    const n = nc(), r = "HMAC", i = await n.importKey("raw", e, { name: r, hash: { name: oc } }, !1, ["sign"]);
    return Ze(await n.sign(r, i, t));
  },
  hmacSha256: void 0,
  sha256Async: async (e) => Ze(await nc().digest(oc, e)),
  sha256: void 0
}, Sp = (e, t, n) => (Dt(e, void 0, "message"), t.prehash ? n ? Yi.sha256Async(e) : Bl("sha256")(e) : e), vp = Ze(0), kp = qi(0), Ap = qi(1), Ip = 1e3, Op = "drbg: tried max amount of iterations", Bp = async (e, t) => {
  let n = Ze(Tt), r = Ze(Tt), i = 0;
  const s = () => {
    n.fill(1), r.fill(0);
  }, o = (...l) => Yi.hmacSha256Async(r, pe(n, ...l)), a = async (l = vp) => {
    r = await o(kp, l), n = await o(), l.length !== 0 && (r = await o(Ap, l), n = await o());
  }, c = async () => (i++ >= Ip && rt(Op), n = await o(), n);
  s(), await a(e);
  let u;
  for (; !(u = t(await c())); )
    await a();
  return s(), u;
}, $p = (e, t, n, r) => {
  let { lowS: i, extraEntropy: s } = n;
  const o = Ht, a = Tp(e), c = o(a), u = Rl(t), l = [o(u), c];
  if (s != null && s !== !1) {
    const f = s === !0 ? Gi(Tt) : s;
    l.push(Dt(f, void 0, "extraEntropy"));
  }
  const d = pe(...l), p = a;
  return r(d, (f) => {
    const h = Ll(f);
    if (!(1n <= h && h < Ye))
      return;
    const w = Ol(h, Ye), E = Xe.multiply(h).toAffine(), S = Te(E.x);
    if (S === 0n)
      return;
    const O = Te(w * Te(p + S * u));
    if (O === 0n)
      return;
    let R = (E.x === S ? 0 : 2) | Number(E.y & 1n), L = O;
    return i && Ul(O) && (L = Te(-O), R ^= 1), new xi(S, L, R).toBytes(n.format);
  });
}, Np = (e) => {
  const t = {};
  return Object.keys(sc).forEach((n) => {
    t[n] = e[n] ?? sc[n];
  }), t;
}, Rp = async (e, t, n = {}) => (n = Np(n), e = await Sp(e, n, !0), $p(e, t, n, Bp)), Up = (e = Gi(Ei.seed)) => {
  Dt(e), (e.length < Ei.seed || e.length > 1024) && rt("expected 40-1024b");
  const t = V(Qe(e), Ye - 1n);
  return Ht(t + 1n);
}, Lp = (e) => (t) => {
  const n = Up(t);
  return { secretKey: n, publicKey: e(n) };
}, Pl = (e) => Uint8Array.from("BIP0340/" + e, (t) => t.charCodeAt(0)), _l = "aux", Dl = "nonce", Vl = "challenge", eo = (e, ...t) => {
  const n = Bl("sha256"), r = n(Pl(e));
  return n(pe(r, r, ...t));
}, no = async (e, ...t) => {
  const n = Yi.sha256Async, r = await n(Pl(e));
  return await n(pe(r, r, ...t));
}, Zo = (e) => {
  const t = Rl(e), n = Xe.multiply(t), { x: r, y: i } = n.assertValidity().toAffine(), s = Cn(i) ? t : Te(-t), o = Ht(r);
  return { d: s, px: o };
}, Xo = (e) => Te(Qe(e)), Ml = (...e) => Xo(eo(Vl, ...e)), Hl = async (...e) => Xo(await no(Vl, ...e)), Fl = (e) => Zo(e).px, Cp = Lp(Fl), Kl = (e, t, n) => {
  const { px: r, d: i } = Zo(t);
  return { m: Dt(e), px: r, d: i, a: Dt(n, Tt) };
}, zl = (e) => {
  const t = Xo(e);
  t === 0n && rt("sign failed: k is zero");
  const { px: n, d: r } = Zo(Ht(t));
  return { rx: n, k: r };
}, jl = (e, t, n, r) => pe(t, Ht(Te(e + n * r))), Wl = "invalid signature produced", Pp = (e, t, n = Gi(Tt)) => {
  const { m: r, px: i, d: s, a: o } = Kl(e, t, n), a = eo(_l, o), c = Ht(s ^ Qe(a)), u = eo(Dl, c, i, r), { rx: l, k: d } = zl(u), p = Ml(l, i, r), g = jl(d, l, p, s);
  return ql(g, r, i) || rt(Wl), g;
}, _p = async (e, t, n = Gi(Tt)) => {
  const { m: r, px: i, d: s, a: o } = Kl(e, t, n), a = await no(_l, o), c = Ht(s ^ Qe(a)), u = await no(Dl, c, i, r), { rx: l, k: d } = zl(u), p = await Hl(l, i, r), g = jl(d, l, p, s);
  return await Yl(g, r, i) || rt(Wl), g;
}, Dp = (e, t) => e instanceof Promise ? e.then(t) : t(e), Gl = (e, t, n, r) => {
  const i = Dt(e, pn, "signature"), s = Dt(t, void 0, "message"), o = Dt(n, Tt, "publicKey");
  try {
    const a = Qe(o), c = Nl(a), u = Cn(c) ? c : V(-c), l = new $t(a, u, 1n).assertValidity(), d = Ht(l.toAffine().x), p = Pn(i, 0, Tt);
    gn(p, 1n, He);
    const g = Pn(i, Tt, pn);
    gn(g, 1n, Ye);
    const f = pe(Ht(p), d, s);
    return Dp(r(f), (h) => {
      const { x: w, y: E } = wp(l, g, Te(-h)).toAffine();
      return !(!Cn(E) || w !== p);
    });
  } catch {
    return !1;
  }
}, ql = (e, t, n) => Gl(e, t, n, Ml), Yl = async (e, t, n) => Gl(e, t, n, Hl), Vp = {
  keygen: Cp,
  getPublicKey: Fl,
  sign: Pp,
  verify: ql,
  signAsync: _p,
  verifyAsync: Yl
}, Si = 8, Mp = 256, Zl = Math.ceil(Mp / Si) + 1, ro = 2 ** (Si - 1), Hp = () => {
  const e = [];
  let t = Xe, n = t;
  for (let r = 0; r < Zl; r++) {
    n = t, e.push(n);
    for (let i = 1; i < ro; i++)
      n = n.add(t), e.push(n);
    t = n.double();
  }
  return e;
};
let ac;
const cc = (e, t) => {
  const n = t.negate();
  return e ? n : t;
}, Fp = (e) => {
  const t = ac || (ac = Hp());
  let n = rn, r = Xe;
  const i = 2 ** Si, s = i, o = gr(i - 1), a = gr(Si);
  for (let c = 0; c < Zl; c++) {
    let u = Number(e & o);
    e >>= a, u > ro && (u -= s, e += 1n);
    const l = c * ro, d = l, p = l + Math.abs(u) - 1, g = c % 2 !== 0, f = u < 0;
    u === 0 ? r = r.add(cc(g, t[d])) : n = n.add(cc(f, t[p]));
  }
  return e !== 0n && rt("invalid wnaf"), { p: n, f: r };
};
function Kp(e, t, n) {
  return e & t ^ ~e & n;
}
function zp(e, t, n) {
  return e & t ^ e & n ^ t & n;
}
class jp {
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
  constructor(t, n, r, i) {
    this.blockLen = t, this.outputLen = n, this.padOffset = r, this.isLE = i, this.buffer = new Uint8Array(t), this.view = gs(this.buffer);
  }
  update(t) {
    yi(this), st(t);
    const { view: n, buffer: r, blockLen: i } = this, s = t.length;
    for (let o = 0; o < s; ) {
      const a = Math.min(i - this.pos, s - o);
      if (a === i) {
        const c = gs(t);
        for (; i <= s - o; o += i)
          this.process(c, o);
        continue;
      }
      r.set(t.subarray(o, o + a), this.pos), this.pos += a, o += a, this.pos === i && (this.process(n, 0), this.pos = 0);
    }
    return this.length += t.length, this.roundClean(), this;
  }
  digestInto(t) {
    yi(this), tp(t, this), this.finished = !0;
    const { buffer: n, view: r, blockLen: i, isLE: s } = this;
    let { pos: o } = this;
    n[o++] = 128, wi(this.buffer.subarray(o)), this.padOffset > i - o && (this.process(r, 0), o = 0);
    for (let d = o; d < i; d++)
      n[d] = 0;
    r.setBigUint64(i - 8, BigInt(this.length * 8), s), this.process(r, 0);
    const a = gs(t), c = this.outputLen;
    if (c % 4)
      throw new Error("_sha2: outputLen must be aligned to 32bit");
    const u = c / 4, l = this.get();
    if (u > l.length)
      throw new Error("_sha2: outputLen bigger than state");
    for (let d = 0; d < u; d++)
      a.setUint32(4 * d, l[d], s);
  }
  digest() {
    const { buffer: t, outputLen: n } = this;
    this.digestInto(t);
    const r = t.slice(0, n);
    return this.destroy(), r;
  }
  _cloneInto(t) {
    t ||= new this.constructor(), t.set(...this.get());
    const { blockLen: n, buffer: r, length: i, finished: s, destroyed: o, pos: a } = this;
    return t.destroyed = o, t.finished = s, t.length = i, t.pos = a, i % n && t.buffer.set(r), t;
  }
  clone() {
    return this._cloneInto();
  }
}
const Ue = /* @__PURE__ */ Uint32Array.from([
  1779033703,
  3144134277,
  1013904242,
  2773480762,
  1359893119,
  2600822924,
  528734635,
  1541459225
]), Wp = /* @__PURE__ */ Uint32Array.from([
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
]), Le = /* @__PURE__ */ new Uint32Array(64);
class Gp extends jp {
  constructor(t) {
    super(64, t, 8, !1);
  }
  get() {
    const { A: t, B: n, C: r, D: i, E: s, F: o, G: a, H: c } = this;
    return [t, n, r, i, s, o, a, c];
  }
  // prettier-ignore
  set(t, n, r, i, s, o, a, c) {
    this.A = t | 0, this.B = n | 0, this.C = r | 0, this.D = i | 0, this.E = s | 0, this.F = o | 0, this.G = a | 0, this.H = c | 0;
  }
  process(t, n) {
    for (let d = 0; d < 16; d++, n += 4)
      Le[d] = t.getUint32(n, !1);
    for (let d = 16; d < 64; d++) {
      const p = Le[d - 15], g = Le[d - 2], f = se(p, 7) ^ se(p, 18) ^ p >>> 3, h = se(g, 17) ^ se(g, 19) ^ g >>> 10;
      Le[d] = h + Le[d - 7] + f + Le[d - 16] | 0;
    }
    let { A: r, B: i, C: s, D: o, E: a, F: c, G: u, H: l } = this;
    for (let d = 0; d < 64; d++) {
      const p = se(a, 6) ^ se(a, 11) ^ se(a, 25), g = l + p + Kp(a, c, u) + Wp[d] + Le[d] | 0, h = (se(r, 2) ^ se(r, 13) ^ se(r, 22)) + zp(r, i, s) | 0;
      l = u, u = c, c = a, a = o + g | 0, o = s, s = i, i = r, r = g + h | 0;
    }
    r = r + this.A | 0, i = i + this.B | 0, s = s + this.C | 0, o = o + this.D | 0, a = a + this.E | 0, c = c + this.F | 0, u = u + this.G | 0, l = l + this.H | 0, this.set(r, i, s, o, a, c, u, l);
  }
  roundClean() {
    wi(Le);
  }
  destroy() {
    this.set(0, 0, 0, 0, 0, 0, 0, 0), wi(this.buffer);
  }
}
class qp extends Gp {
  // We cannot use array here since array allows indexing by variable
  // which means optimizer/compiler cannot use registers.
  A = Ue[0] | 0;
  B = Ue[1] | 0;
  C = Ue[2] | 0;
  D = Ue[3] | 0;
  E = Ue[4] | 0;
  F = Ue[5] | 0;
  G = Ue[6] | 0;
  H = Ue[7] | 0;
  constructor() {
    super(32);
  }
}
const io = /* @__PURE__ */ np(
  () => new qp(),
  /* @__PURE__ */ rp(1)
);
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const Rt = /* @__PURE__ */ BigInt(0), It = /* @__PURE__ */ BigInt(1), ln = /* @__PURE__ */ BigInt(2), Xl = /* @__PURE__ */ BigInt(3), Ql = /* @__PURE__ */ BigInt(4), Jl = /* @__PURE__ */ BigInt(5), Yp = /* @__PURE__ */ BigInt(7), tf = /* @__PURE__ */ BigInt(8), Zp = /* @__PURE__ */ BigInt(9), ef = /* @__PURE__ */ BigInt(16);
function Zt(e, t) {
  const n = e % t;
  return n >= Rt ? n : t + n;
}
function zt(e, t, n) {
  let r = e;
  for (; t-- > Rt; )
    r *= r, r %= n;
  return r;
}
function uc(e, t) {
  if (e === Rt)
    throw new Error("invert: expected non-zero number");
  if (t <= Rt)
    throw new Error("invert: expected positive modulus, got " + t);
  let n = Zt(e, t), r = t, i = Rt, s = It;
  for (; n !== Rt; ) {
    const a = r / n, c = r % n, u = i - s * a;
    r = n, n = c, i = s, s = u;
  }
  if (r !== It)
    throw new Error("invert: does not exist");
  return Zt(i, t);
}
function Qo(e, t, n) {
  if (!e.eql(e.sqr(t), n))
    throw new Error("Cannot find square root");
}
function nf(e, t) {
  const n = (e.ORDER + It) / Ql, r = e.pow(t, n);
  return Qo(e, r, t), r;
}
function Xp(e, t) {
  const n = (e.ORDER - Jl) / tf, r = e.mul(t, ln), i = e.pow(r, n), s = e.mul(t, i), o = e.mul(e.mul(s, ln), i), a = e.mul(s, e.sub(o, e.ONE));
  return Qo(e, a, t), a;
}
function Qp(e) {
  const t = Zi(e), n = rf(e), r = n(t, t.neg(t.ONE)), i = n(t, r), s = n(t, t.neg(r)), o = (e + Yp) / ef;
  return (a, c) => {
    let u = a.pow(c, o), l = a.mul(u, r);
    const d = a.mul(u, i), p = a.mul(u, s), g = a.eql(a.sqr(l), c), f = a.eql(a.sqr(d), c);
    u = a.cmov(u, l, g), l = a.cmov(p, d, f);
    const h = a.eql(a.sqr(l), c), w = a.cmov(u, l, h);
    return Qo(a, w, c), w;
  };
}
function rf(e) {
  if (e < Xl)
    throw new Error("sqrt is not defined for small field");
  let t = e - It, n = 0;
  for (; t % ln === Rt; )
    t /= ln, n++;
  let r = ln;
  const i = Zi(e);
  for (; lc(i, r) === 1; )
    if (r++ > 1e3)
      throw new Error("Cannot find square root: probably non-prime P");
  if (n === 1)
    return nf;
  let s = i.pow(r, t);
  const o = (t + It) / ln;
  return function(c, u) {
    if (c.is0(u))
      return u;
    if (lc(c, u) !== 1)
      throw new Error("Cannot find square root");
    let l = n, d = c.mul(c.ONE, s), p = c.pow(u, t), g = c.pow(u, o);
    for (; !c.eql(p, c.ONE); ) {
      if (c.is0(p))
        return c.ZERO;
      let f = 1, h = c.sqr(p);
      for (; !c.eql(h, c.ONE); )
        if (f++, h = c.sqr(h), f === l)
          throw new Error("Cannot find square root");
      const w = It << BigInt(l - f - 1), E = c.pow(d, w);
      l = f, d = c.sqr(E), p = c.mul(p, d), g = c.mul(g, E);
    }
    return g;
  };
}
function Jp(e) {
  return e % Ql === Xl ? nf : e % tf === Jl ? Xp : e % ef === Zp ? Qp(e) : rf(e);
}
const tg = [
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
function eg(e) {
  const t = {
    ORDER: "bigint",
    BYTES: "number",
    BITS: "number"
  }, n = tg.reduce((r, i) => (r[i] = "function", r), t);
  return Yo(e, n), e;
}
function ng(e, t, n) {
  if (n < Rt)
    throw new Error("invalid exponent, negatives unsupported");
  if (n === Rt)
    return e.ONE;
  if (n === It)
    return t;
  let r = e.ONE, i = t;
  for (; n > Rt; )
    n & It && (r = e.mul(r, i)), i = e.sqr(i), n >>= It;
  return r;
}
function sf(e, t, n = !1) {
  const r = new Array(t.length).fill(n ? e.ZERO : void 0), i = t.reduce((o, a, c) => e.is0(a) ? o : (r[c] = o, e.mul(o, a)), e.ONE), s = e.inv(i);
  return t.reduceRight((o, a, c) => e.is0(a) ? o : (r[c] = e.mul(o, r[c]), e.mul(o, a)), s), r;
}
function lc(e, t) {
  const n = (e.ORDER - It) / ln, r = e.pow(t, n), i = e.eql(r, e.ONE), s = e.eql(r, e.ZERO), o = e.eql(r, e.neg(e.ONE));
  if (!i && !s && !o)
    throw new Error("invalid Legendre symbol result");
  return i ? 1 : s ? 0 : -1;
}
function rg(e, t) {
  t !== void 0 && hn(t);
  const n = t !== void 0 ? t : e.toString(2).length, r = Math.ceil(n / 8);
  return { nBitLength: n, nByteLength: r };
}
class ig {
  ORDER;
  BITS;
  BYTES;
  isLE;
  ZERO = Rt;
  ONE = It;
  _lengths;
  _sqrt;
  // cached sqrt
  _mod;
  constructor(t, n = {}) {
    if (t <= Rt)
      throw new Error("invalid field: expected ORDER > 0, got " + t);
    let r;
    this.isLE = !1, n != null && typeof n == "object" && (typeof n.BITS == "number" && (r = n.BITS), typeof n.sqrt == "function" && (this.sqrt = n.sqrt), typeof n.isLE == "boolean" && (this.isLE = n.isLE), n.allowedLengths && (this._lengths = n.allowedLengths?.slice()), typeof n.modFromBytes == "boolean" && (this._mod = n.modFromBytes));
    const { nBitLength: i, nByteLength: s } = rg(t, r);
    if (s > 2048)
      throw new Error("invalid field: expected ORDER of <= 2048 bytes");
    this.ORDER = t, this.BITS = i, this.BYTES = s, this._sqrt = void 0, Object.preventExtensions(this);
  }
  create(t) {
    return Zt(t, this.ORDER);
  }
  isValid(t) {
    if (typeof t != "bigint")
      throw new Error("invalid field element: expected bigint, got " + typeof t);
    return Rt <= t && t < this.ORDER;
  }
  is0(t) {
    return t === Rt;
  }
  // is valid and invertible
  isValidNot0(t) {
    return !this.is0(t) && this.isValid(t);
  }
  isOdd(t) {
    return (t & It) === It;
  }
  neg(t) {
    return Zt(-t, this.ORDER);
  }
  eql(t, n) {
    return t === n;
  }
  sqr(t) {
    return Zt(t * t, this.ORDER);
  }
  add(t, n) {
    return Zt(t + n, this.ORDER);
  }
  sub(t, n) {
    return Zt(t - n, this.ORDER);
  }
  mul(t, n) {
    return Zt(t * n, this.ORDER);
  }
  pow(t, n) {
    return ng(this, t, n);
  }
  div(t, n) {
    return Zt(t * uc(n, this.ORDER), this.ORDER);
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
    return uc(t, this.ORDER);
  }
  sqrt(t) {
    return this._sqrt || (this._sqrt = Jp(this.ORDER)), this._sqrt(this, t);
  }
  toBytes(t) {
    return this.isLE ? xl(t, this.BYTES) : Go(t, this.BYTES);
  }
  fromBytes(t, n = !1) {
    st(t);
    const { _lengths: r, BYTES: i, isLE: s, ORDER: o, _mod: a } = this;
    if (r) {
      if (!r.includes(t.length) || t.length > i)
        throw new Error("Field.fromBytes: expected " + r + " bytes, got " + t.length);
      const u = new Uint8Array(i);
      u.set(t, s ? 0 : u.length - t.length), t = u;
    }
    if (t.length !== i)
      throw new Error("Field.fromBytes: expected " + i + " bytes, got " + t.length);
    let c = s ? El(t) : Gn(t);
    if (a && (c = Zt(c, o)), !n && !this.isValid(c))
      throw new Error("invalid field element: outside of range 0..ORDER");
    return c;
  }
  // TODO: we don't need it here, move out to separate fn
  invertBatch(t) {
    return sf(this, t);
  }
  // We can't move this out because Fp6, Fp12 implement it
  // and it's unclear what to return in there.
  cmov(t, n, r) {
    return r ? n : t;
  }
}
function Zi(e, t = {}) {
  return new ig(e, t);
}
function of(e) {
  if (typeof e != "bigint")
    throw new Error("field order must be bigint");
  const t = e.toString(2).length;
  return Math.ceil(t / 8);
}
function af(e) {
  const t = of(e);
  return t + Math.ceil(t / 2);
}
function cf(e, t, n = !1) {
  st(e);
  const r = e.length, i = of(t), s = af(t);
  if (r < 16 || r < s || r > 1024)
    throw new Error("expected " + s + "-1024 bytes of input, got " + r);
  const o = n ? El(e) : Gn(e), a = Zt(o, t - It) + It;
  return n ? xl(a, i) : Go(a, i);
}
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const Dn = /* @__PURE__ */ BigInt(0), fn = /* @__PURE__ */ BigInt(1);
function vi(e, t) {
  const n = t.negate();
  return e ? n : t;
}
function fc(e, t) {
  const n = sf(e.Fp, t.map((r) => r.Z));
  return t.map((r, i) => e.fromAffine(r.toAffine(n[i])));
}
function uf(e, t) {
  if (!Number.isSafeInteger(e) || e <= 0 || e > t)
    throw new Error("invalid window size, expected [1.." + t + "], got W=" + e);
}
function ws(e, t) {
  uf(e, t);
  const n = Math.ceil(t / e) + 1, r = 2 ** (e - 1), i = 2 ** e, s = qo(e), o = BigInt(e);
  return { windows: n, windowSize: r, mask: s, maxNumber: i, shiftBy: o };
}
function dc(e, t, n) {
  const { windowSize: r, mask: i, maxNumber: s, shiftBy: o } = n;
  let a = Number(e & i), c = e >> o;
  a > r && (a -= s, c += fn);
  const u = t * r, l = u + Math.abs(a) - 1, d = a === 0, p = a < 0, g = t % 2 !== 0;
  return { nextN: c, offset: l, isZero: d, isNeg: p, isNegF: g, offsetF: u };
}
const ms = /* @__PURE__ */ new WeakMap(), lf = /* @__PURE__ */ new WeakMap();
function bs(e) {
  return lf.get(e) || 1;
}
function hc(e) {
  if (e !== Dn)
    throw new Error("invalid wNAF");
}
class sg {
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
    let i = t;
    for (; n > Dn; )
      n & fn && (r = r.add(i)), i = i.double(), n >>= fn;
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
    const { windows: r, windowSize: i } = ws(n, this.bits), s = [];
    let o = t, a = o;
    for (let c = 0; c < r; c++) {
      a = o, s.push(a);
      for (let u = 1; u < i; u++)
        a = a.add(o), s.push(a);
      o = a.double();
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
    let i = this.ZERO, s = this.BASE;
    const o = ws(t, this.bits);
    for (let a = 0; a < o.windows; a++) {
      const { nextN: c, offset: u, isZero: l, isNeg: d, isNegF: p, offsetF: g } = dc(r, a, o);
      r = c, l ? s = s.add(vi(p, n[g])) : i = i.add(vi(d, n[u]));
    }
    return hc(r), { p: i, f: s };
  }
  /**
   * Implements ec unsafe (non const-time) multiplication using precomputed tables and w-ary non-adjacent form.
   * @param acc accumulator point to add result of multiplication
   * @returns point
   */
  wNAFUnsafe(t, n, r, i = this.ZERO) {
    const s = ws(t, this.bits);
    for (let o = 0; o < s.windows && r !== Dn; o++) {
      const { nextN: a, offset: c, isZero: u, isNeg: l } = dc(r, o, s);
      if (r = a, !u) {
        const d = n[c];
        i = i.add(l ? d.negate() : d);
      }
    }
    return hc(r), i;
  }
  getPrecomputes(t, n, r) {
    let i = ms.get(n);
    return i || (i = this.precomputeWindow(n, t), t !== 1 && (typeof r == "function" && (i = r(i)), ms.set(n, i))), i;
  }
  cached(t, n, r) {
    const i = bs(t);
    return this.wNAF(i, this.getPrecomputes(i, t, r), n);
  }
  unsafe(t, n, r, i) {
    const s = bs(t);
    return s === 1 ? this._unsafeLadder(t, n, i) : this.wNAFUnsafe(s, this.getPrecomputes(s, t, r), n, i);
  }
  // We calculate precomputes for elliptic curve point multiplication
  // using windowed method. This specifies window size and
  // stores precomputed values. Usually only base point would be precomputed.
  createCache(t, n) {
    uf(n, this.bits), lf.set(t, n), ms.delete(t);
  }
  hasCache(t) {
    return bs(t) !== 1;
  }
}
function og(e, t, n, r) {
  let i = t, s = e.ZERO, o = e.ZERO;
  for (; n > Dn || r > Dn; )
    n & fn && (s = s.add(i)), r & fn && (o = o.add(i)), i = i.double(), n >>= fn, r >>= fn;
  return { p1: s, p2: o };
}
function pc(e, t, n) {
  if (t) {
    if (t.ORDER !== e)
      throw new Error("Field.ORDER must match order: Fp == p, Fn == n");
    return eg(t), t;
  } else
    return Zi(e, { isLE: n });
}
function ag(e, t, n = {}, r) {
  if (r === void 0 && (r = e === "edwards"), !t || typeof t != "object")
    throw new Error(`expected valid ${e} CURVE object`);
  for (const c of ["p", "n", "h"]) {
    const u = t[c];
    if (!(typeof u == "bigint" && u > Dn))
      throw new Error(`CURVE.${c} must be positive bigint`);
  }
  const i = pc(t.p, n.Fp, r), s = pc(t.n, n.Fn, r), a = ["Gx", "Gy", "a", "b"];
  for (const c of a)
    if (!i.isValid(t[c]))
      throw new Error(`CURVE.${c} must be valid field element of CURVE.Fp`);
  return t = Object.freeze(Object.assign({}, t)), { CURVE: t, Fp: i, Fn: s };
}
function ff(e, t) {
  return function(r) {
    const i = e(r);
    return { secretKey: i, publicKey: t(i) };
  };
}
class df {
  oHash;
  iHash;
  blockLen;
  outputLen;
  finished = !1;
  destroyed = !1;
  constructor(t, n) {
    if (yl(t), st(n, void 0, "key"), this.iHash = t.create(), typeof this.iHash.update != "function")
      throw new Error("Expected instance of class which extends utils.Hash");
    this.blockLen = this.iHash.blockLen, this.outputLen = this.iHash.outputLen;
    const r = this.blockLen, i = new Uint8Array(r);
    i.set(n.length > r ? t.create().update(n).digest() : n);
    for (let s = 0; s < i.length; s++)
      i[s] ^= 54;
    this.iHash.update(i), this.oHash = t.create();
    for (let s = 0; s < i.length; s++)
      i[s] ^= 106;
    this.oHash.update(i), wi(i);
  }
  update(t) {
    return yi(this), this.iHash.update(t), this;
  }
  digestInto(t) {
    yi(this), st(t, this.outputLen, "output"), this.finished = !0, this.iHash.digestInto(t), this.oHash.update(t), this.oHash.digestInto(t), this.destroy();
  }
  digest() {
    const t = new Uint8Array(this.oHash.outputLen);
    return this.digestInto(t), t;
  }
  _cloneInto(t) {
    t ||= Object.create(Object.getPrototypeOf(this), {});
    const { oHash: n, iHash: r, finished: i, destroyed: s, blockLen: o, outputLen: a } = this;
    return t = t, t.finished = i, t.destroyed = s, t.blockLen = o, t.outputLen = a, t.oHash = n._cloneInto(t.oHash), t.iHash = r._cloneInto(t.iHash), t;
  }
  clone() {
    return this._cloneInto();
  }
  destroy() {
    this.destroyed = !0, this.oHash.destroy(), this.iHash.destroy();
  }
}
const hf = (e, t, n) => new df(e, t).update(n).digest();
hf.create = (e, t) => new df(e, t);
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const gc = (e, t) => (e + (e >= 0 ? t : -t) / pf) / t;
function cg(e, t, n) {
  const [[r, i], [s, o]] = t, a = gc(o * e, n), c = gc(-i * e, n);
  let u = e - a * r - c * s, l = -a * i - c * o;
  const d = u < Se, p = l < Se;
  d && (u = -u), p && (l = -l);
  const g = qo(Math.ceil(cp(n) / 2)) + An;
  if (u < Se || u >= g || l < Se || l >= g)
    throw new Error("splitScalar (endomorphism): failed, k=" + e);
  return { k1neg: d, k1: u, k2neg: p, k2: l };
}
function so(e) {
  if (!["compact", "recovered", "der"].includes(e))
    throw new Error('Signature format must be "compact", "recovered", or "der"');
  return e;
}
function Es(e, t) {
  const n = {};
  for (let r of Object.keys(t))
    n[r] = e[r] === void 0 ? t[r] : e[r];
  return bi(n.lowS, "lowS"), bi(n.prehash, "prehash"), n.format !== void 0 && so(n.format), n;
}
class ug extends Error {
  constructor(t = "") {
    super(t);
  }
}
const _e = {
  // asn.1 DER encoding utils
  Err: ug,
  // Basic building block is TLV (Tag-Length-Value)
  _tlv: {
    encode: (e, t) => {
      const { Err: n } = _e;
      if (e < 0 || e > 256)
        throw new n("tlv.encode: wrong tag");
      if (t.length & 1)
        throw new n("tlv.encode: unpadded data");
      const r = t.length / 2, i = Rr(r);
      if (i.length / 2 & 128)
        throw new n("tlv.encode: long form length too big");
      const s = r > 127 ? Rr(i.length / 2 | 128) : "";
      return Rr(e) + s + i + t;
    },
    // v - value, l - left bytes (unparsed)
    decode(e, t) {
      const { Err: n } = _e;
      let r = 0;
      if (e < 0 || e > 256)
        throw new n("tlv.encode: wrong tag");
      if (t.length < 2 || t[r++] !== e)
        throw new n("tlv.decode: wrong tlv");
      const i = t[r++], s = !!(i & 128);
      let o = 0;
      if (!s)
        o = i;
      else {
        const c = i & 127;
        if (!c)
          throw new n("tlv.decode(long): indefinite length not supported");
        if (c > 4)
          throw new n("tlv.decode(long): byte length is too big");
        const u = t.subarray(r, r + c);
        if (u.length !== c)
          throw new n("tlv.decode: length bytes not complete");
        if (u[0] === 0)
          throw new n("tlv.decode(long): zero leftmost byte");
        for (const l of u)
          o = o << 8 | l;
        if (r += c, o < 128)
          throw new n("tlv.decode(long): not minimal encoding");
      }
      const a = t.subarray(r, r + o);
      if (a.length !== o)
        throw new n("tlv.decode: wrong value length");
      return { v: a, l: t.subarray(r + o) };
    }
  },
  // https://crypto.stackexchange.com/a/57734 Leftmost bit of first byte is 'negative' flag,
  // since we always use positive integers here. It must always be empty:
  // - add zero byte if exists
  // - if next byte doesn't have a flag, leading zero is not allowed (minimal encoding)
  _int: {
    encode(e) {
      const { Err: t } = _e;
      if (e < Se)
        throw new t("integer: negative integers are not allowed");
      let n = Rr(e);
      if (Number.parseInt(n[0], 16) & 8 && (n = "00" + n), n.length & 1)
        throw new t("unexpected DER parsing assertion: unpadded hex");
      return n;
    },
    decode(e) {
      const { Err: t } = _e;
      if (e[0] & 128)
        throw new t("invalid signature integer: negative");
      if (e[0] === 0 && !(e[1] & 128))
        throw new t("invalid signature integer: unnecessary leading zero");
      return Gn(e);
    }
  },
  toSig(e) {
    const { Err: t, _int: n, _tlv: r } = _e, i = st(e, void 0, "signature"), { v: s, l: o } = r.decode(48, i);
    if (o.length)
      throw new t("invalid signature: left bytes after parsing");
    const { v: a, l: c } = r.decode(2, s), { v: u, l } = r.decode(2, c);
    if (l.length)
      throw new t("invalid signature: left bytes after parsing");
    return { r: n.decode(a), s: n.decode(u) };
  },
  hexFromSig(e) {
    const { _tlv: t, _int: n } = _e, r = t.encode(2, n.encode(e.r)), i = t.encode(2, n.encode(e.s)), s = r + i;
    return t.encode(48, s);
  }
}, Se = BigInt(0), An = BigInt(1), pf = BigInt(2), Ur = BigInt(3), lg = BigInt(4);
function fg(e, t = {}) {
  const n = ag("weierstrass", e, t), { Fp: r, Fn: i } = n;
  let s = n.CURVE;
  const { h: o, n: a } = s;
  Yo(t, {}, {
    allowInfinityPoint: "boolean",
    clearCofactor: "function",
    isTorsionFree: "function",
    fromBytes: "function",
    toBytes: "function",
    endo: "object"
  });
  const { endo: c } = t;
  if (c && (!r.is0(s.a) || typeof c.beta != "bigint" || !Array.isArray(c.basises)))
    throw new Error('invalid endo: expected "beta": bigint and "basises": array');
  const u = yf(r, i);
  function l() {
    if (!r.isOdd)
      throw new Error("compression is not supported: Field does not have .isOdd()");
  }
  function d(D, x, b) {
    const { x: y, y: T } = x.toAffine(), A = r.toBytes(y);
    if (bi(b, "isCompressed"), b) {
      l();
      const $ = !r.isOdd(T);
      return ce(gf($), A);
    } else
      return ce(Uint8Array.of(4), A, r.toBytes(T));
  }
  function p(D) {
    st(D, void 0, "Point");
    const { publicKey: x, publicKeyUncompressed: b } = u, y = D.length, T = D[0], A = D.subarray(1);
    if (y === x && (T === 2 || T === 3)) {
      const $ = r.fromBytes(A);
      if (!r.isValid($))
        throw new Error("bad point: is not on curve, wrong x");
      const I = h($);
      let v;
      try {
        v = r.sqrt(I);
      } catch (G) {
        const F = G instanceof Error ? ": " + G.message : "";
        throw new Error("bad point: is not on curve, sqrt error" + F);
      }
      l();
      const N = r.isOdd(v);
      return (T & 1) === 1 !== N && (v = r.neg(v)), { x: $, y: v };
    } else if (y === b && T === 4) {
      const $ = r.BYTES, I = r.fromBytes(A.subarray(0, $)), v = r.fromBytes(A.subarray($, $ * 2));
      if (!w(I, v))
        throw new Error("bad point: is not on curve");
      return { x: I, y: v };
    } else
      throw new Error(`bad point: got length ${y}, expected compressed=${x} or uncompressed=${b}`);
  }
  const g = t.toBytes || d, f = t.fromBytes || p;
  function h(D) {
    const x = r.sqr(D), b = r.mul(x, D);
    return r.add(r.add(b, r.mul(D, s.a)), s.b);
  }
  function w(D, x) {
    const b = r.sqr(x), y = h(D);
    return r.eql(b, y);
  }
  if (!w(s.Gx, s.Gy))
    throw new Error("bad curve params: generator point");
  const E = r.mul(r.pow(s.a, Ur), lg), S = r.mul(r.sqr(s.b), BigInt(27));
  if (r.is0(r.add(E, S)))
    throw new Error("bad curve params: a or b");
  function O(D, x, b = !1) {
    if (!r.isValid(x) || b && r.is0(x))
      throw new Error(`bad point coordinate ${D}`);
    return x;
  }
  function R(D) {
    if (!(D instanceof _))
      throw new Error("Weierstrass Point expected");
  }
  function L(D) {
    if (!c || !c.basises)
      throw new Error("no endo");
    return cg(D, c.basises, i.ORDER);
  }
  const P = tc((D, x) => {
    const { X: b, Y: y, Z: T } = D;
    if (r.eql(T, r.ONE))
      return { x: b, y };
    const A = D.is0();
    x == null && (x = A ? r.ONE : r.inv(T));
    const $ = r.mul(b, x), I = r.mul(y, x), v = r.mul(T, x);
    if (A)
      return { x: r.ZERO, y: r.ZERO };
    if (!r.eql(v, r.ONE))
      throw new Error("invZ was invalid");
    return { x: $, y: I };
  }), m = tc((D) => {
    if (D.is0()) {
      if (t.allowInfinityPoint && !r.is0(D.Y))
        return;
      throw new Error("bad point: ZERO");
    }
    const { x, y: b } = D.toAffine();
    if (!r.isValid(x) || !r.isValid(b))
      throw new Error("bad point: x or y not field elements");
    if (!w(x, b))
      throw new Error("bad point: equation left != right");
    if (!D.isTorsionFree())
      throw new Error("bad point: not in prime-order subgroup");
    return !0;
  });
  function Q(D, x, b, y, T) {
    return b = new _(r.mul(b.X, D), b.Y, b.Z), x = vi(y, x), b = vi(T, b), x.add(b);
  }
  class _ {
    // base / generator point
    static BASE = new _(s.Gx, s.Gy, r.ONE);
    // zero / infinity / identity point
    static ZERO = new _(r.ZERO, r.ONE, r.ZERO);
    // 0, 1, 0
    // math field
    static Fp = r;
    // scalar field
    static Fn = i;
    X;
    Y;
    Z;
    /** Does NOT validate if the point is valid. Use `.assertValidity()`. */
    constructor(x, b, y) {
      this.X = O("x", x), this.Y = O("y", b, !0), this.Z = O("z", y), Object.freeze(this);
    }
    static CURVE() {
      return s;
    }
    /** Does NOT validate if the point is valid. Use `.assertValidity()`. */
    static fromAffine(x) {
      const { x: b, y } = x || {};
      if (!x || !r.isValid(b) || !r.isValid(y))
        throw new Error("invalid affine point");
      if (x instanceof _)
        throw new Error("projective point not allowed");
      return r.is0(b) && r.is0(y) ? _.ZERO : new _(b, y, r.ONE);
    }
    static fromBytes(x) {
      const b = _.fromAffine(f(st(x, void 0, "point")));
      return b.assertValidity(), b;
    }
    static fromHex(x) {
      return _.fromBytes(mi(x));
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
    precompute(x = 8, b = !0) {
      return lt.createCache(this, x), b || this.multiply(Ur), this;
    }
    // TODO: return `this`
    /** A point on curve is valid if it conforms to equation. */
    assertValidity() {
      m(this);
    }
    hasEvenY() {
      const { y: x } = this.toAffine();
      if (!r.isOdd)
        throw new Error("Field doesn't support isOdd");
      return !r.isOdd(x);
    }
    /** Compare one point to another. */
    equals(x) {
      R(x);
      const { X: b, Y: y, Z: T } = this, { X: A, Y: $, Z: I } = x, v = r.eql(r.mul(b, I), r.mul(A, T)), N = r.eql(r.mul(y, I), r.mul($, T));
      return v && N;
    }
    /** Flips point to one corresponding to (x, -y) in Affine coordinates. */
    negate() {
      return new _(this.X, r.neg(this.Y), this.Z);
    }
    // Renes-Costello-Batina exception-free doubling formula.
    // There is 30% faster Jacobian formula, but it is not complete.
    // https://eprint.iacr.org/2015/1060, algorithm 3
    // Cost: 8M + 3S + 3*a + 2*b3 + 15add.
    double() {
      const { a: x, b } = s, y = r.mul(b, Ur), { X: T, Y: A, Z: $ } = this;
      let I = r.ZERO, v = r.ZERO, N = r.ZERO, U = r.mul(T, T), G = r.mul(A, A), F = r.mul($, $), C = r.mul(T, A);
      return C = r.add(C, C), N = r.mul(T, $), N = r.add(N, N), I = r.mul(x, N), v = r.mul(y, F), v = r.add(I, v), I = r.sub(G, v), v = r.add(G, v), v = r.mul(I, v), I = r.mul(C, I), N = r.mul(y, N), F = r.mul(x, F), C = r.sub(U, F), C = r.mul(x, C), C = r.add(C, N), N = r.add(U, U), U = r.add(N, U), U = r.add(U, F), U = r.mul(U, C), v = r.add(v, U), F = r.mul(A, $), F = r.add(F, F), U = r.mul(F, C), I = r.sub(I, U), N = r.mul(F, G), N = r.add(N, N), N = r.add(N, N), new _(I, v, N);
    }
    // Renes-Costello-Batina exception-free addition formula.
    // There is 30% faster Jacobian formula, but it is not complete.
    // https://eprint.iacr.org/2015/1060, algorithm 1
    // Cost: 12M + 0S + 3*a + 3*b3 + 23add.
    add(x) {
      R(x);
      const { X: b, Y: y, Z: T } = this, { X: A, Y: $, Z: I } = x;
      let v = r.ZERO, N = r.ZERO, U = r.ZERO;
      const G = s.a, F = r.mul(s.b, Ur);
      let C = r.mul(b, A), K = r.mul(y, $), Z = r.mul(T, I), dt = r.add(b, y), z = r.add(A, $);
      dt = r.mul(dt, z), z = r.add(C, K), dt = r.sub(dt, z), z = r.add(b, T);
      let J = r.add(A, I);
      return z = r.mul(z, J), J = r.add(C, Z), z = r.sub(z, J), J = r.add(y, T), v = r.add($, I), J = r.mul(J, v), v = r.add(K, Z), J = r.sub(J, v), U = r.mul(G, z), v = r.mul(F, Z), U = r.add(v, U), v = r.sub(K, U), U = r.add(K, U), N = r.mul(v, U), K = r.add(C, C), K = r.add(K, C), Z = r.mul(G, Z), z = r.mul(F, z), K = r.add(K, Z), Z = r.sub(C, Z), Z = r.mul(G, Z), z = r.add(z, Z), C = r.mul(K, z), N = r.add(N, C), C = r.mul(J, z), v = r.mul(dt, v), v = r.sub(v, C), C = r.mul(dt, K), U = r.mul(J, U), U = r.add(U, C), new _(v, N, U);
    }
    subtract(x) {
      return this.add(x.negate());
    }
    is0() {
      return this.equals(_.ZERO);
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
    multiply(x) {
      const { endo: b } = t;
      if (!i.isValidNot0(x))
        throw new Error("invalid scalar: out of range");
      let y, T;
      const A = ($) => lt.cached(this, $, (I) => fc(_, I));
      if (b) {
        const { k1neg: $, k1: I, k2neg: v, k2: N } = L(x), { p: U, f: G } = A(I), { p: F, f: C } = A(N);
        T = G.add(C), y = Q(b.beta, U, F, $, v);
      } else {
        const { p: $, f: I } = A(x);
        y = $, T = I;
      }
      return fc(_, [y, T])[0];
    }
    /**
     * Non-constant-time multiplication. Uses double-and-add algorithm.
     * It's faster, but should only be used when you don't care about
     * an exposed secret key e.g. sig verification, which works over *public* keys.
     */
    multiplyUnsafe(x) {
      const { endo: b } = t, y = this;
      if (!i.isValid(x))
        throw new Error("invalid scalar: out of range");
      if (x === Se || y.is0())
        return _.ZERO;
      if (x === An)
        return y;
      if (lt.hasCache(this))
        return this.multiply(x);
      if (b) {
        const { k1neg: T, k1: A, k2neg: $, k2: I } = L(x), { p1: v, p2: N } = og(_, y, A, I);
        return Q(b.beta, v, N, T, $);
      } else
        return lt.unsafe(y, x);
    }
    /**
     * Converts Projective point to affine (x, y) coordinates.
     * @param invertedZ Z^-1 (inverted zero) - optional, precomputation is useful for invertBatch
     */
    toAffine(x) {
      return P(this, x);
    }
    /**
     * Checks whether Point is free of torsion elements (is in prime subgroup).
     * Always torsion-free for cofactor=1 curves.
     */
    isTorsionFree() {
      const { isTorsionFree: x } = t;
      return o === An ? !0 : x ? x(_, this) : lt.unsafe(this, a).is0();
    }
    clearCofactor() {
      const { clearCofactor: x } = t;
      return o === An ? this : x ? x(_, this) : this.multiplyUnsafe(o);
    }
    isSmallOrder() {
      return this.multiplyUnsafe(o).is0();
    }
    toBytes(x = !0) {
      return bi(x, "isCompressed"), this.assertValidity(), g(_, this, x);
    }
    toHex(x = !0) {
      return ji(this.toBytes(x));
    }
    toString() {
      return `<Point ${this.is0() ? "ZERO" : this.toHex()}>`;
    }
  }
  const et = i.BITS, lt = new sg(_, t.endo ? Math.ceil(et / 2) : et);
  return _.BASE.precompute(8), _;
}
function gf(e) {
  return Uint8Array.of(e ? 2 : 3);
}
function yf(e, t) {
  return {
    secretKey: t.BYTES,
    publicKey: 1 + e.BYTES,
    publicKeyUncompressed: 1 + 2 * e.BYTES,
    publicKeyHasPrefix: !0,
    signature: 2 * t.BYTES
  };
}
function dg(e, t = {}) {
  const { Fn: n } = e, r = t.randomBytes || Wi, i = Object.assign(yf(e.Fp, n), { seed: af(n.ORDER) });
  function s(g) {
    try {
      const f = n.fromBytes(g);
      return n.isValidNot0(f);
    } catch {
      return !1;
    }
  }
  function o(g, f) {
    const { publicKey: h, publicKeyUncompressed: w } = i;
    try {
      const E = g.length;
      return f === !0 && E !== h || f === !1 && E !== w ? !1 : !!e.fromBytes(g);
    } catch {
      return !1;
    }
  }
  function a(g = r(i.seed)) {
    return cf(st(g, i.seed, "seed"), n.ORDER);
  }
  function c(g, f = !0) {
    return e.BASE.multiply(n.fromBytes(g)).toBytes(f);
  }
  function u(g) {
    const { secretKey: f, publicKey: h, publicKeyUncompressed: w } = i;
    if (!jo(g) || "_lengths" in n && n._lengths || f === h)
      return;
    const E = st(g, void 0, "key").length;
    return E === h || E === w;
  }
  function l(g, f, h = !0) {
    if (u(g) === !0)
      throw new Error("first arg must be private key");
    if (u(f) === !1)
      throw new Error("second arg must be public key");
    const w = n.fromBytes(g);
    return e.fromBytes(f).multiply(w).toBytes(h);
  }
  const d = {
    isValidSecretKey: s,
    isValidPublicKey: o,
    randomSecretKey: a
  }, p = ff(a, c);
  return Object.freeze({ getPublicKey: c, getSharedSecret: l, keygen: p, Point: e, utils: d, lengths: i });
}
function hg(e, t, n = {}) {
  yl(t), Yo(n, {}, {
    hmac: "function",
    lowS: "boolean",
    randomBytes: "function",
    bits2int: "function",
    bits2int_modN: "function"
  }), n = Object.assign({}, n);
  const r = n.randomBytes || Wi, i = n.hmac || ((b, y) => hf(t, b, y)), { Fp: s, Fn: o } = e, { ORDER: a, BITS: c } = o, { keygen: u, getPublicKey: l, getSharedSecret: d, utils: p, lengths: g } = dg(e, n), f = {
    prehash: !0,
    lowS: typeof n.lowS == "boolean" ? n.lowS : !0,
    format: "compact",
    extraEntropy: !1
  }, h = a * pf < s.ORDER;
  function w(b) {
    const y = a >> An;
    return b > y;
  }
  function E(b, y) {
    if (!o.isValidNot0(y))
      throw new Error(`invalid signature ${b}: out of range 1..Point.Fn.ORDER`);
    return y;
  }
  function S() {
    if (h)
      throw new Error('"recovered" sig type is not supported for cofactor >2 curves');
  }
  function O(b, y) {
    so(y);
    const T = g.signature, A = y === "compact" ? T : y === "recovered" ? T + 1 : void 0;
    return st(b, A);
  }
  class R {
    r;
    s;
    recovery;
    constructor(y, T, A) {
      if (this.r = E("r", y), this.s = E("s", T), A != null) {
        if (S(), ![0, 1, 2, 3].includes(A))
          throw new Error("invalid recovery id");
        this.recovery = A;
      }
      Object.freeze(this);
    }
    static fromBytes(y, T = f.format) {
      O(y, T);
      let A;
      if (T === "der") {
        const { r: N, s: U } = _e.toSig(st(y));
        return new R(N, U);
      }
      T === "recovered" && (A = y[0], T = "compact", y = y.subarray(1));
      const $ = g.signature / 2, I = y.subarray(0, $), v = y.subarray($, $ * 2);
      return new R(o.fromBytes(I), o.fromBytes(v), A);
    }
    static fromHex(y, T) {
      return this.fromBytes(mi(y), T);
    }
    assertRecovery() {
      const { recovery: y } = this;
      if (y == null)
        throw new Error("invalid recovery id: must be present");
      return y;
    }
    addRecoveryBit(y) {
      return new R(this.r, this.s, y);
    }
    recoverPublicKey(y) {
      const { r: T, s: A } = this, $ = this.assertRecovery(), I = $ === 2 || $ === 3 ? T + a : T;
      if (!s.isValid(I))
        throw new Error("invalid recovery id: sig.r+curve.n != R.x");
      const v = s.toBytes(I), N = e.fromBytes(ce(gf(($ & 1) === 0), v)), U = o.inv(I), G = P(st(y, void 0, "msgHash")), F = o.create(-G * U), C = o.create(A * U), K = e.BASE.multiplyUnsafe(F).add(N.multiplyUnsafe(C));
      if (K.is0())
        throw new Error("invalid recovery: point at infinify");
      return K.assertValidity(), K;
    }
    // Signatures should be low-s, to prevent malleability.
    hasHighS() {
      return w(this.s);
    }
    toBytes(y = f.format) {
      if (so(y), y === "der")
        return mi(_e.hexFromSig(this));
      const { r: T, s: A } = this, $ = o.toBytes(T), I = o.toBytes(A);
      return y === "recovered" ? (S(), ce(Uint8Array.of(this.assertRecovery()), $, I)) : ce($, I);
    }
    toHex(y) {
      return ji(this.toBytes(y));
    }
  }
  const L = n.bits2int || function(y) {
    if (y.length > 8192)
      throw new Error("input is too large");
    const T = Gn(y), A = y.length * 8 - c;
    return A > 0 ? T >> BigInt(A) : T;
  }, P = n.bits2int_modN || function(y) {
    return o.create(L(y));
  }, m = qo(c);
  function Q(b) {
    return ap("num < 2^" + c, b, Se, m), o.toBytes(b);
  }
  function _(b, y) {
    return st(b, void 0, "message"), y ? st(t(b), void 0, "prehashed message") : b;
  }
  function et(b, y, T) {
    const { lowS: A, prehash: $, extraEntropy: I } = Es(T, f);
    b = _(b, $);
    const v = P(b), N = o.fromBytes(y);
    if (!o.isValidNot0(N))
      throw new Error("invalid private key");
    const U = [Q(N), Q(v)];
    if (I != null && I !== !1) {
      const K = I === !0 ? r(g.secretKey) : I;
      U.push(st(K, void 0, "extraEntropy"));
    }
    const G = ce(...U), F = v;
    function C(K) {
      const Z = L(K);
      if (!o.isValidNot0(Z))
        return;
      const dt = o.inv(Z), z = e.BASE.multiply(Z).toAffine(), J = o.create(z.x);
      if (J === Se)
        return;
      const ge = o.create(dt * o.create(F + J * N));
      if (ge === Se)
        return;
      let qn = (z.x === J ? 0 : 2) | Number(z.y & An), Yn = ge;
      return A && w(ge) && (Yn = o.neg(ge), qn ^= 1), new R(J, Yn, h ? void 0 : qn);
    }
    return { seed: G, k2sig: C };
  }
  function lt(b, y, T = {}) {
    const { seed: A, k2sig: $ } = et(b, y, T);
    return up(t.outputLen, o.BYTES, i)(A, $).toBytes(T.format);
  }
  function D(b, y, T, A = {}) {
    const { lowS: $, prehash: I, format: v } = Es(A, f);
    if (T = st(T, void 0, "publicKey"), y = _(y, I), !jo(b)) {
      const N = b instanceof R ? ", use sig.toBytes()" : "";
      throw new Error("verify expects Uint8Array signature" + N);
    }
    O(b, v);
    try {
      const N = R.fromBytes(b, v), U = e.fromBytes(T);
      if ($ && N.hasHighS())
        return !1;
      const { r: G, s: F } = N, C = P(y), K = o.inv(F), Z = o.create(C * K), dt = o.create(G * K), z = e.BASE.multiplyUnsafe(Z).add(U.multiplyUnsafe(dt));
      return z.is0() ? !1 : o.create(z.x) === G;
    } catch {
      return !1;
    }
  }
  function x(b, y, T = {}) {
    const { prehash: A } = Es(T, f);
    return y = _(y, A), R.fromBytes(b, "recovered").recoverPublicKey(y).toBytes();
  }
  return Object.freeze({
    keygen: u,
    getPublicKey: l,
    getSharedSecret: d,
    utils: p,
    lengths: g,
    Point: e,
    sign: lt,
    verify: D,
    recoverPublicKey: x,
    Signature: R,
    hash: t
  });
}
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const Xi = {
  p: BigInt("0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffefffffc2f"),
  n: BigInt("0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141"),
  h: BigInt(1),
  a: BigInt(0),
  b: BigInt(7),
  Gx: BigInt("0x79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798"),
  Gy: BigInt("0x483ada7726a3c4655da4fbfc0e1108a8fd17b448a68554199c47d08ffb10d4b8")
}, pg = {
  beta: BigInt("0x7ae96a2b657c07106e64479eac3434e99cf0497512f58995c1396c28719501ee"),
  basises: [
    [BigInt("0x3086d221a7d46bcde86c90e49284eb15"), -BigInt("0xe4437ed6010e88286f547fa90abfe4c3")],
    [BigInt("0x114ca50f7a8e2f3f657c1108d9d44cfd8"), BigInt("0x3086d221a7d46bcde86c90e49284eb15")]
  ]
}, gg = /* @__PURE__ */ BigInt(0), oo = /* @__PURE__ */ BigInt(2);
function yg(e) {
  const t = Xi.p, n = BigInt(3), r = BigInt(6), i = BigInt(11), s = BigInt(22), o = BigInt(23), a = BigInt(44), c = BigInt(88), u = e * e * e % t, l = u * u * e % t, d = zt(l, n, t) * l % t, p = zt(d, n, t) * l % t, g = zt(p, oo, t) * u % t, f = zt(g, i, t) * g % t, h = zt(f, s, t) * f % t, w = zt(h, a, t) * h % t, E = zt(w, c, t) * w % t, S = zt(E, a, t) * h % t, O = zt(S, n, t) * l % t, R = zt(O, o, t) * f % t, L = zt(R, r, t) * u % t, P = zt(L, oo, t);
  if (!ki.eql(ki.sqr(P), e))
    throw new Error("Cannot find square root");
  return P;
}
const ki = Zi(Xi.p, { sqrt: yg }), mn = /* @__PURE__ */ fg(Xi, {
  Fp: ki,
  endo: pg
}), yc = /* @__PURE__ */ hg(mn, io), wc = {};
function Ai(e, ...t) {
  let n = wc[e];
  if (n === void 0) {
    const r = io(sp(e));
    n = ce(r, r), wc[e] = n;
  }
  return io(ce(n, ...t));
}
const Jo = (e) => e.toBytes(!0).slice(1), ta = (e) => e % oo === gg;
function ao(e) {
  const { Fn: t, BASE: n } = mn, r = t.fromBytes(e), i = n.multiply(r);
  return { scalar: ta(i.y) ? r : t.neg(r), bytes: Jo(i) };
}
function wf(e) {
  const t = ki;
  if (!t.isValidNot0(e))
    throw new Error("invalid x: Fail if x ≥ p");
  const n = t.create(e * e), r = t.create(n * e + BigInt(7));
  let i = t.sqrt(r);
  ta(i) || (i = t.neg(i));
  const s = mn.fromAffine({ x: e, y: i });
  return s.assertValidity(), s;
}
const cr = Gn;
function mf(...e) {
  return mn.Fn.create(cr(Ai("BIP0340/challenge", ...e)));
}
function mc(e) {
  return ao(e).bytes;
}
function wg(e, t, n = Wi(32)) {
  const { Fn: r } = mn, i = st(e, void 0, "message"), { bytes: s, scalar: o } = ao(t), a = st(n, 32, "auxRand"), c = r.toBytes(o ^ cr(Ai("BIP0340/aux", a))), u = Ai("BIP0340/nonce", c, s, i), { bytes: l, scalar: d } = ao(u), p = mf(l, s, i), g = new Uint8Array(64);
  if (g.set(l, 0), g.set(r.toBytes(r.create(d + p * o)), 32), !bf(g, i, s))
    throw new Error("sign: Invalid signature produced");
  return g;
}
function bf(e, t, n) {
  const { Fp: r, Fn: i, BASE: s } = mn, o = st(e, 64, "signature"), a = st(t, void 0, "message"), c = st(n, 32, "publicKey");
  try {
    const u = wf(cr(c)), l = cr(o.subarray(0, 32));
    if (!r.isValidNot0(l))
      return !1;
    const d = cr(o.subarray(32, 64));
    if (!i.isValidNot0(d))
      return !1;
    const p = mf(i.toBytes(l), Jo(u), a), g = s.multiplyUnsafe(d).add(u.multiplyUnsafe(i.neg(p))), { x: f, y: h } = g.toAffine();
    return !(g.is0() || !ta(h) || f !== l);
  } catch {
    return !1;
  }
}
const ea = /* @__PURE__ */ (() => {
  const n = (r = Wi(48)) => cf(r, Xi.n);
  return {
    keygen: ff(n, mc),
    getPublicKey: mc,
    sign: wg,
    verify: bf,
    Point: mn,
    utils: {
      randomSecretKey: n,
      taggedHash: Ai,
      lift_x: wf,
      pointToBytes: Jo
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
function na(e, t, n = {}) {
  e = Xs(e);
  const { aggPublicKey: r } = Qs(e);
  if (!n.taprootTweak)
    return {
      preTweakedKey: r.toBytes(!0),
      finalKey: r.toBytes(!0)
    };
  const i = ea.utils.taggedHash("TapTweak", r.toBytes(!0).subarray(1), n.taprootTweak ?? new Uint8Array(0)), { aggPublicKey: s } = Qs(e, [i], [!0]);
  return {
    preTweakedKey: r.toBytes(!0),
    finalKey: s.toBytes(!0)
  };
}
class Lr extends Error {
  constructor(t) {
    super(t), this.name = "PartialSignatureError";
  }
}
class ra {
  constructor(t, n) {
    if (this.s = t, this.R = n, t.length !== 32)
      throw new Lr("Invalid s length");
    if (n.length !== 33)
      throw new Lr("Invalid R length");
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
      throw new Lr("Invalid partial signature length");
    if (Gn(t) >= $t.CURVE().n)
      throw new Lr("s value overflows curve order");
    const r = new Uint8Array(33);
    return new ra(t, r);
  }
}
function mg(e, t, n, r, i, s) {
  let o;
  if (s?.taprootTweak !== void 0) {
    const { preTweakedKey: u } = na(Xs(r));
    o = ea.utils.taggedHash("TapTweak", u.subarray(1), s.taprootTweak);
  }
  const c = new Xh(n, Xs(r), i, o ? [o] : void 0, o ? [!0] : void 0).sign(e, t);
  return ra.decode(c);
}
var xs, bc;
function bg() {
  if (bc) return xs;
  bc = 1;
  const e = 4294967295, t = 1 << 31, n = 9, r = 65535, i = 1 << 22, s = r, o = 1 << n, a = r << n;
  function c(l) {
    return l & t ? {} : l & i ? {
      seconds: (l & r) << n
    } : {
      blocks: l & r
    };
  }
  function u({ blocks: l, seconds: d }) {
    if (l !== void 0 && d !== void 0) throw new TypeError("Cannot encode blocks AND seconds");
    if (l === void 0 && d === void 0) return e;
    if (d !== void 0) {
      if (!Number.isFinite(d)) throw new TypeError("Expected Number seconds");
      if (d > a) throw new TypeError("Expected Number seconds <= " + a);
      if (d % o !== 0) throw new TypeError("Expected Number seconds as a multiple of " + o);
      return i | d >> n;
    }
    if (!Number.isFinite(l)) throw new TypeError("Expected Number blocks");
    if (l > r) throw new TypeError("Expected Number blocks <= " + s);
    return l;
  }
  return xs = { decode: c, encode: u }, xs;
}
var co = bg(), Vt;
(function(e) {
  e.VtxoTaprootTree = "taptree", e.VtxoTreeExpiry = "expiry", e.Cosigner = "cosigner", e.ConditionWitness = "condition";
})(Vt || (Vt = {}));
const ia = 222;
function Eg(e, t, n, r) {
  e.updateInput(t, {
    unknown: [
      ...e.getInput(t)?.unknown ?? [],
      n.encode(r)
    ]
  });
}
function uo(e, t, n) {
  const r = e.getInput(t)?.unknown ?? [], i = [];
  for (const s of r) {
    const o = n.decode(s);
    o && i.push(o);
  }
  return i;
}
const Ef = {
  key: Vt.VtxoTaprootTree,
  encode: (e) => [
    {
      type: ia,
      key: Qi[Vt.VtxoTaprootTree]
    },
    e
  ],
  decode: (e) => sa(() => oa(e[0], Vt.VtxoTaprootTree) ? e[1] : null)
}, xg = {
  key: Vt.ConditionWitness,
  encode: (e) => [
    {
      type: ia,
      key: Qi[Vt.ConditionWitness]
    },
    fr.encode(e)
  ],
  decode: (e) => sa(() => oa(e[0], Vt.ConditionWitness) ? fr.decode(e[1]) : null)
}, lo = {
  key: Vt.Cosigner,
  encode: (e) => [
    {
      type: ia,
      key: new Uint8Array([
        ...Qi[Vt.Cosigner],
        e.index
      ])
    },
    e.key
  ],
  decode: (e) => sa(() => oa(e[0], Vt.Cosigner) ? {
    index: e[0].key[e[0].key.length - 1],
    key: e[1]
  } : null)
};
Vt.VtxoTreeExpiry;
const Qi = Object.fromEntries(Object.values(Vt).map((e) => [
  e,
  new TextEncoder().encode(e)
])), sa = (e) => {
  try {
    return e();
  } catch {
    return null;
  }
};
function oa(e, t) {
  const n = B.encode(Qi[t]);
  return B.encode(new Uint8Array([e.type, ...e.key])).includes(n);
}
const Cr = new Error("missing vtxo graph");
class yr {
  constructor(t) {
    this.secretKey = t, this.myNonces = null, this.aggregateNonces = null, this.graph = null, this.scriptRoot = null, this.rootSharedOutputAmount = null;
  }
  static random() {
    const t = Fs();
    return new yr(t);
  }
  async init(t, n, r) {
    this.graph = t, this.scriptRoot = n, this.rootSharedOutputAmount = r;
  }
  async getPublicKey() {
    return yc.getPublicKey(this.secretKey);
  }
  async getNonces() {
    if (!this.graph)
      throw Cr;
    this.myNonces || (this.myNonces = this.generateNonces());
    const t = /* @__PURE__ */ new Map();
    for (const [n, r] of this.myNonces)
      t.set(n, { pubNonce: r.pubNonce });
    return t;
  }
  async aggregatedNonces(t, n) {
    if (!this.graph)
      throw Cr;
    if (this.aggregateNonces || (this.aggregateNonces = /* @__PURE__ */ new Map()), this.myNonces || await this.getNonces(), this.aggregateNonces.has(t))
      return {
        hasAllNonces: this.aggregateNonces.size === this.myNonces?.size
      };
    const r = this.myNonces.get(t);
    if (!r)
      throw new Error(`missing nonce for txid ${t}`);
    const i = await this.getPublicKey();
    n.set(B.encode(i.subarray(1)), r);
    const s = this.graph.find(t);
    if (!s)
      throw new Error(`missing tx for txid ${t}`);
    const o = uo(s.root, 0, lo).map(
      (u) => B.encode(u.key.subarray(1))
      // xonly pubkey
    ), a = [];
    for (const u of o) {
      const l = n.get(u);
      if (!l)
        throw new Error(`missing nonce for cosigner ${u}`);
      a.push(l.pubNonce);
    }
    const c = Jh(a);
    return this.aggregateNonces.set(t, { pubNonce: c }), {
      hasAllNonces: this.aggregateNonces.size === this.myNonces?.size
    };
  }
  async sign() {
    if (!this.graph)
      throw Cr;
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
      throw Cr;
    const t = /* @__PURE__ */ new Map(), n = yc.getPublicKey(this.secretKey);
    for (const r of this.graph.iterator()) {
      const i = Qh(n);
      t.set(r.txid, i);
    }
    return t;
  }
  signPartial(t) {
    if (!this.graph || !this.scriptRoot || !this.rootSharedOutputAmount)
      throw yr.NOT_INITIALIZED;
    if (!this.myNonces || !this.aggregateNonces)
      throw new Error("session not properly initialized");
    const n = this.myNonces.get(t.txid);
    if (!n)
      throw new Error("missing private nonce");
    const r = this.aggregateNonces.get(t.txid);
    if (!r)
      throw new Error("missing aggregate nonce");
    const i = [], s = [], o = uo(t.root, 0, lo).map((u) => u.key), { finalKey: a } = na(o, !0, {
      taprootTweak: this.scriptRoot
    });
    for (let u = 0; u < t.root.inputsLength; u++) {
      const l = Tg(a, this.graph, this.rootSharedOutputAmount, t.root);
      i.push(l.amount), s.push(l.script);
    }
    const c = t.root.preimageWitnessV1(
      0,
      // always first input
      s,
      Ge.DEFAULT,
      i
    );
    return mg(n.secNonce, this.secretKey, r.pubNonce, o, c, {
      taprootTweak: this.scriptRoot
    });
  }
}
yr.NOT_INITIALIZED = new Error("session not initialized, call init method");
function Tg(e, t, n, r) {
  const i = W.encode(["OP_1", e.slice(1)]);
  if (r.id === t.txid)
    return {
      amount: n,
      script: i
    };
  const s = r.getInput(0);
  if (!s.txid)
    throw new Error("missing parent input txid");
  const o = B.encode(s.txid), a = t.find(o);
  if (!a)
    throw new Error("parent  tx not found");
  if (s.index === void 0)
    throw new Error("missing input index");
  const c = a.root.getOutput(s.index);
  if (!c)
    throw new Error("parent output not found");
  if (!c.amount)
    throw new Error("parent output amount not found");
  return {
    amount: c.amount,
    script: i
  };
}
const Ec = Object.values(Ge).filter((e) => typeof e == "number");
class ur {
  constructor(t) {
    this.key = t || Fs();
  }
  static fromPrivateKey(t) {
    return new ur(t);
  }
  static fromHex(t) {
    return new ur(B.decode(t));
  }
  static fromRandomBytes() {
    return new ur(Fs());
  }
  /**
   * Export the private key as a hex string.
   *
   * @returns The private key as a hex string
   */
  toHex() {
    return B.encode(this.key);
  }
  async sign(t, n) {
    const r = t.clone();
    if (!n) {
      try {
        if (!r.sign(this.key, Ec))
          throw new Error("Failed to sign transaction");
      } catch (i) {
        if (!(i instanceof Error && i.message.includes("No inputs signed"))) throw i;
      }
      return r;
    }
    for (const i of n)
      if (!r.signIdx(this.key, i, Ec))
        throw new Error(`Failed to sign input #${i}`);
    return r;
  }
  compressedPublicKey() {
    return Promise.resolve(tl(this.key, !0));
  }
  xOnlyPublicKey() {
    return Promise.resolve(Co(this.key));
  }
  signerSession() {
    return yr.random();
  }
  async signMessage(t, n = "schnorr") {
    return n === "ecdsa" ? Rp(t, this.key, { prehash: !1 }) : Vp.signAsync(t, this.key);
  }
  async toReadonly() {
    return new Ji(await this.compressedPublicKey());
  }
}
class Ji {
  constructor(t) {
    if (this.publicKey = t, t.length !== 33)
      throw new Error("Invalid public key length");
  }
  /**
   * Create a ReadonlySingleKey from a compressed public key.
   *
   * @param publicKey - 33-byte compressed public key (02/03 prefix + 32-byte x coordinate)
   * @returns A new ReadonlySingleKey instance
   * @example
   * ```typescript
   * const pubkey = new Uint8Array(33); // your compressed public key
   * const readonlyKey = ReadonlySingleKey.fromPublicKey(pubkey);
   * ```
   */
  static fromPublicKey(t) {
    return new Ji(t);
  }
  xOnlyPublicKey() {
    return Promise.resolve(this.publicKey.slice(1));
  }
  compressedPublicKey() {
    return Promise.resolve(this.publicKey);
  }
}
class ke {
  constructor(t, n, r, i = 0) {
    if (this.serverPubKey = t, this.vtxoTaprootKey = n, this.hrp = r, this.version = i, t.length !== 32)
      throw new Error("Invalid server public key length, expected 32 bytes, got " + t.length);
    if (n.length !== 32)
      throw new Error("Invalid vtxo taproot public key length, expected 32 bytes, got " + n.length);
  }
  static decode(t) {
    const n = En.decodeUnsafe(t, 1023);
    if (!n)
      throw new Error("Invalid address");
    const r = new Uint8Array(En.fromWords(n.words));
    if (r.length !== 65)
      throw new Error("Invalid data length, expected 65 bytes, got " + r.length);
    const i = r[0], s = r.slice(1, 33), o = r.slice(33, 65);
    return new ke(s, o, n.prefix, i);
  }
  encode() {
    const t = new Uint8Array(65);
    t[0] = this.version, t.set(this.serverPubKey, 1), t.set(this.vtxoTaprootKey, 33);
    const n = En.toWords(t);
    return En.encode(this.hrp, n, 1023);
  }
  // pkScript is the script that should be used to send non-dust funds to the address
  get pkScript() {
    return W.encode(["OP_1", this.vtxoTaprootKey]);
  }
  // subdustPkScript is the script that should be used to send sub-dust funds to the address
  get subdustPkScript() {
    return W.encode(["RETURN", this.vtxoTaprootKey]);
  }
}
const Ii = Do(void 0, !0);
var bt;
(function(e) {
  e.Multisig = "multisig", e.CSVMultisig = "csv-multisig", e.ConditionCSVMultisig = "condition-csv-multisig", e.ConditionMultisig = "condition-multisig", e.CLTVMultisig = "cltv-multisig";
})(bt || (bt = {}));
function aa(e) {
  const t = [
    Ft,
    Mt,
    wr,
    Oi,
    Vn
  ];
  for (const n of t)
    try {
      return n.decode(e);
    } catch {
      continue;
    }
  throw new Error(`Failed to decode: script ${B.encode(e)} is not a valid tapscript`);
}
var Ft;
(function(e) {
  let t;
  (function(a) {
    a[a.CHECKSIG = 0] = "CHECKSIG", a[a.CHECKSIGADD = 1] = "CHECKSIGADD";
  })(t = e.MultisigType || (e.MultisigType = {}));
  function n(a) {
    if (a.pubkeys.length === 0)
      throw new Error("At least 1 pubkey is required");
    for (const u of a.pubkeys)
      if (u.length !== 32)
        throw new Error(`Invalid pubkey length: expected 32, got ${u.length}`);
    if (a.type || (a.type = t.CHECKSIG), a.type === t.CHECKSIGADD)
      return {
        type: bt.Multisig,
        params: a,
        script: Mh(a.pubkeys.length, a.pubkeys).script
      };
    const c = [];
    for (let u = 0; u < a.pubkeys.length; u++)
      c.push(a.pubkeys[u]), u < a.pubkeys.length - 1 ? c.push("CHECKSIGVERIFY") : c.push("CHECKSIG");
    return {
      type: bt.Multisig,
      params: a,
      script: W.encode(c)
    };
  }
  e.encode = n;
  function r(a) {
    if (a.length === 0)
      throw new Error("Failed to decode: script is empty");
    try {
      return i(a);
    } catch {
      try {
        return s(a);
      } catch (u) {
        throw new Error(`Failed to decode script: ${u instanceof Error ? u.message : String(u)}`);
      }
    }
  }
  e.decode = r;
  function i(a) {
    const c = W.decode(a), u = [];
    let l = !1;
    for (let p = 0; p < c.length; p++) {
      const g = c[p];
      if (typeof g != "string" && typeof g != "number") {
        if (g.length !== 32)
          throw new Error(`Invalid pubkey length: expected 32, got ${g.length}`);
        if (u.push(g), p + 1 >= c.length || c[p + 1] !== "CHECKSIGADD" && c[p + 1] !== "CHECKSIG")
          throw new Error("Expected CHECKSIGADD or CHECKSIG after pubkey");
        p++;
        continue;
      }
      if (p === c.length - 1) {
        if (g !== "NUMEQUAL")
          throw new Error("Expected NUMEQUAL at end of script");
        l = !0;
      }
    }
    if (!l)
      throw new Error("Missing NUMEQUAL operation");
    if (u.length === 0)
      throw new Error("Invalid script: must have at least 1 pubkey");
    const d = n({
      pubkeys: u,
      type: t.CHECKSIGADD
    });
    if (B.encode(d.script) !== B.encode(a))
      throw new Error("Invalid script format: script reconstruction mismatch");
    return {
      type: bt.Multisig,
      params: { pubkeys: u, type: t.CHECKSIGADD },
      script: a
    };
  }
  function s(a) {
    const c = W.decode(a), u = [];
    for (let d = 0; d < c.length; d++) {
      const p = c[d];
      if (typeof p != "string" && typeof p != "number") {
        if (p.length !== 32)
          throw new Error(`Invalid pubkey length: expected 32, got ${p.length}`);
        if (u.push(p), d + 1 >= c.length)
          throw new Error("Unexpected end of script");
        const g = c[d + 1];
        if (g !== "CHECKSIGVERIFY" && g !== "CHECKSIG")
          throw new Error("Expected CHECKSIGVERIFY or CHECKSIG after pubkey");
        if (d === c.length - 2 && g !== "CHECKSIG")
          throw new Error("Last operation must be CHECKSIG");
        d++;
        continue;
      }
    }
    if (u.length === 0)
      throw new Error("Invalid script: must have at least 1 pubkey");
    const l = n({ pubkeys: u, type: t.CHECKSIG });
    if (B.encode(l.script) !== B.encode(a))
      throw new Error("Invalid script format: script reconstruction mismatch");
    return {
      type: bt.Multisig,
      params: { pubkeys: u, type: t.CHECKSIG },
      script: a
    };
  }
  function o(a) {
    return a.type === bt.Multisig;
  }
  e.is = o;
})(Ft || (Ft = {}));
var Mt;
(function(e) {
  function t(i) {
    for (const u of i.pubkeys)
      if (u.length !== 32)
        throw new Error(`Invalid pubkey length: expected 32, got ${u.length}`);
    const s = Ii.encode(BigInt(co.encode(i.timelock.type === "blocks" ? { blocks: Number(i.timelock.value) } : { seconds: Number(i.timelock.value) }))), o = [
      s.length === 1 ? s[0] : s,
      "CHECKSEQUENCEVERIFY",
      "DROP"
    ], a = Ft.encode(i), c = new Uint8Array([
      ...W.encode(o),
      ...a.script
    ]);
    return {
      type: bt.CSVMultisig,
      params: i,
      script: c
    };
  }
  e.encode = t;
  function n(i) {
    if (i.length === 0)
      throw new Error("Failed to decode: script is empty");
    const s = W.decode(i);
    if (s.length < 3)
      throw new Error("Invalid script: too short (expected at least 3)");
    const o = s[0];
    if (typeof o == "string")
      throw new Error("Invalid script: expected sequence number");
    if (s[1] !== "CHECKSEQUENCEVERIFY" || s[2] !== "DROP")
      throw new Error("Invalid script: expected CHECKSEQUENCEVERIFY DROP");
    const a = new Uint8Array(W.encode(s.slice(3)));
    let c;
    try {
      c = Ft.decode(a);
    } catch (g) {
      throw new Error(`Invalid multisig script: ${g instanceof Error ? g.message : String(g)}`);
    }
    let u;
    typeof o == "number" ? u = o : u = Number(Ii.decode(o));
    const l = co.decode(u), d = l.blocks !== void 0 ? { type: "blocks", value: BigInt(l.blocks) } : { type: "seconds", value: BigInt(l.seconds) }, p = t({
      timelock: d,
      ...c.params
    });
    if (B.encode(p.script) !== B.encode(i))
      throw new Error("Invalid script format: script reconstruction mismatch");
    return {
      type: bt.CSVMultisig,
      params: {
        timelock: d,
        ...c.params
      },
      script: i
    };
  }
  e.decode = n;
  function r(i) {
    return i.type === bt.CSVMultisig;
  }
  e.is = r;
})(Mt || (Mt = {}));
var wr;
(function(e) {
  function t(i) {
    const s = new Uint8Array([
      ...i.conditionScript,
      ...W.encode(["VERIFY"]),
      ...Mt.encode(i).script
    ]);
    return {
      type: bt.ConditionCSVMultisig,
      params: i,
      script: s
    };
  }
  e.encode = t;
  function n(i) {
    if (i.length === 0)
      throw new Error("Failed to decode: script is empty");
    const s = W.decode(i);
    if (s.length < 1)
      throw new Error("Invalid script: too short (expected at least 1)");
    let o = -1;
    for (let d = s.length - 1; d >= 0; d--)
      s[d] === "VERIFY" && (o = d);
    if (o === -1)
      throw new Error("Invalid script: missing VERIFY operation");
    const a = new Uint8Array(W.encode(s.slice(0, o))), c = new Uint8Array(W.encode(s.slice(o + 1)));
    let u;
    try {
      u = Mt.decode(c);
    } catch (d) {
      throw new Error(`Invalid CSV multisig script: ${d instanceof Error ? d.message : String(d)}`);
    }
    const l = t({
      conditionScript: a,
      ...u.params
    });
    if (B.encode(l.script) !== B.encode(i))
      throw new Error("Invalid script format: script reconstruction mismatch");
    return {
      type: bt.ConditionCSVMultisig,
      params: {
        conditionScript: a,
        ...u.params
      },
      script: i
    };
  }
  e.decode = n;
  function r(i) {
    return i.type === bt.ConditionCSVMultisig;
  }
  e.is = r;
})(wr || (wr = {}));
var Oi;
(function(e) {
  function t(i) {
    const s = new Uint8Array([
      ...i.conditionScript,
      ...W.encode(["VERIFY"]),
      ...Ft.encode(i).script
    ]);
    return {
      type: bt.ConditionMultisig,
      params: i,
      script: s
    };
  }
  e.encode = t;
  function n(i) {
    if (i.length === 0)
      throw new Error("Failed to decode: script is empty");
    const s = W.decode(i);
    if (s.length < 1)
      throw new Error("Invalid script: too short (expected at least 1)");
    let o = -1;
    for (let d = s.length - 1; d >= 0; d--)
      s[d] === "VERIFY" && (o = d);
    if (o === -1)
      throw new Error("Invalid script: missing VERIFY operation");
    const a = new Uint8Array(W.encode(s.slice(0, o))), c = new Uint8Array(W.encode(s.slice(o + 1)));
    let u;
    try {
      u = Ft.decode(c);
    } catch (d) {
      throw new Error(`Invalid multisig script: ${d instanceof Error ? d.message : String(d)}`);
    }
    const l = t({
      conditionScript: a,
      ...u.params
    });
    if (B.encode(l.script) !== B.encode(i))
      throw new Error("Invalid script format: script reconstruction mismatch");
    return {
      type: bt.ConditionMultisig,
      params: {
        conditionScript: a,
        ...u.params
      },
      script: i
    };
  }
  e.decode = n;
  function r(i) {
    return i.type === bt.ConditionMultisig;
  }
  e.is = r;
})(Oi || (Oi = {}));
var Vn;
(function(e) {
  function t(i) {
    const s = Ii.encode(i.absoluteTimelock), o = [
      s.length === 1 ? s[0] : s,
      "CHECKLOCKTIMEVERIFY",
      "DROP"
    ], a = W.encode(o), c = new Uint8Array([
      ...a,
      ...Ft.encode(i).script
    ]);
    return {
      type: bt.CLTVMultisig,
      params: i,
      script: c
    };
  }
  e.encode = t;
  function n(i) {
    if (i.length === 0)
      throw new Error("Failed to decode: script is empty");
    const s = W.decode(i);
    if (s.length < 3)
      throw new Error("Invalid script: too short (expected at least 3)");
    const o = s[0];
    if (typeof o == "string" || typeof o == "number")
      throw new Error("Invalid script: expected locktime number");
    if (s[1] !== "CHECKLOCKTIMEVERIFY" || s[2] !== "DROP")
      throw new Error("Invalid script: expected CHECKLOCKTIMEVERIFY DROP");
    const a = new Uint8Array(W.encode(s.slice(3)));
    let c;
    try {
      c = Ft.decode(a);
    } catch (d) {
      throw new Error(`Invalid multisig script: ${d instanceof Error ? d.message : String(d)}`);
    }
    const u = Ii.decode(o), l = t({
      absoluteTimelock: u,
      ...c.params
    });
    if (B.encode(l.script) !== B.encode(i))
      throw new Error("Invalid script format: script reconstruction mismatch");
    return {
      type: bt.CLTVMultisig,
      params: {
        absoluteTimelock: u,
        ...c.params
      },
      script: i
    };
  }
  e.decode = n;
  function r(i) {
    return i.type === bt.CLTVMultisig;
  }
  e.is = r;
})(Vn || (Vn = {}));
const xc = dr.tapTree[2];
function In(e) {
  return e[1].subarray(0, e[1].length - 1);
}
class Ot {
  static decode(t) {
    const r = xc.decode(t).map((i) => i.script);
    return new Ot(r);
  }
  constructor(t) {
    this.scripts = t;
    const n = t.length % 2 !== 0 ? t.slice().reverse() : t, r = cl(n.map((s) => ({
      script: s,
      leafVersion: hr
    }))), i = Vh(_o, r, void 0, !0);
    if (!i.tapLeafScript || i.tapLeafScript.length !== t.length)
      throw new Error("invalid scripts");
    this.leaves = i.tapLeafScript, this.tweakedPublicKey = i.tweakedPubkey;
  }
  encode() {
    return xc.encode(this.scripts.map((n) => ({
      depth: 1,
      version: hr,
      script: n
    })));
  }
  address(t, n) {
    return new ke(n, this.tweakedPublicKey, t);
  }
  get pkScript() {
    return W.encode(["OP_1", this.tweakedPublicKey]);
  }
  onchainAddress(t) {
    return Ie(t).encode({
      type: "tr",
      pubkey: this.tweakedPublicKey
    });
  }
  findLeaf(t) {
    const n = this.leaves.find((r) => B.encode(In(r)) === t);
    if (!n)
      throw new Error(`leaf '${t}' not found`);
    return n;
  }
  exitPaths() {
    const t = [];
    for (const n of this.leaves)
      try {
        const r = Mt.decode(In(n));
        t.push(r);
        continue;
      } catch {
        try {
          const i = wr.decode(In(n));
          t.push(i);
        } catch {
          continue;
        }
      }
    return t;
  }
}
function Sg(e) {
  let t;
  try {
    const n = e[1], r = n.subarray(0, n.length - 1);
    try {
      const i = Mt.decode(r).params;
      t = co.encode(i.timelock.type === "blocks" ? { blocks: Number(i.timelock.value) } : { seconds: Number(i.timelock.value) });
    } catch {
      const i = Vn.decode(r).params;
      t = Number(i.absoluteTimelock);
    }
  } catch {
  }
  return t;
}
var Tc;
(function(e) {
  class t extends Ot {
    constructor(i) {
      n(i);
      const { sender: s, receiver: o, server: a, preimageHash: c, refundLocktime: u, unilateralClaimDelay: l, unilateralRefundDelay: d, unilateralRefundWithoutReceiverDelay: p } = i, g = vg(c), f = Oi.encode({
        conditionScript: g,
        pubkeys: [o, a]
      }).script, h = Ft.encode({
        pubkeys: [s, o, a]
      }).script, w = Vn.encode({
        absoluteTimelock: u,
        pubkeys: [s, a]
      }).script, E = wr.encode({
        conditionScript: g,
        timelock: l,
        pubkeys: [o]
      }).script, S = Mt.encode({
        timelock: d,
        pubkeys: [s, o]
      }).script, O = Mt.encode({
        timelock: p,
        pubkeys: [s]
      }).script;
      super([
        f,
        h,
        w,
        E,
        S,
        O
      ]), this.options = i, this.claimScript = B.encode(f), this.refundScript = B.encode(h), this.refundWithoutReceiverScript = B.encode(w), this.unilateralClaimScript = B.encode(E), this.unilateralRefundScript = B.encode(S), this.unilateralRefundWithoutReceiverScript = B.encode(O);
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
    const { sender: i, receiver: s, server: o, preimageHash: a, refundLocktime: c, unilateralClaimDelay: u, unilateralRefundDelay: l, unilateralRefundWithoutReceiverDelay: d } = r;
    if (!a || a.length !== 20)
      throw new Error("preimage hash must be 20 bytes");
    if (!s || s.length !== 32)
      throw new Error("Invalid public key length (receiver)");
    if (!i || i.length !== 32)
      throw new Error("Invalid public key length (sender)");
    if (!o || o.length !== 32)
      throw new Error("Invalid public key length (server)");
    if (typeof c != "bigint" || c <= 0n)
      throw new Error("refund locktime must be greater than 0");
    if (!u || typeof u.value != "bigint" || u.value <= 0n)
      throw new Error("unilateral claim delay must greater than 0");
    if (u.type === "seconds" && u.value % 512n !== 0n)
      throw new Error("seconds timelock must be multiple of 512");
    if (u.type === "seconds" && u.value < 512n)
      throw new Error("seconds timelock must be greater or equal to 512");
    if (!l || typeof l.value != "bigint" || l.value <= 0n)
      throw new Error("unilateral refund delay must greater than 0");
    if (l.type === "seconds" && l.value % 512n !== 0n)
      throw new Error("seconds timelock must be multiple of 512");
    if (l.type === "seconds" && l.value < 512n)
      throw new Error("seconds timelock must be greater or equal to 512");
    if (!d || typeof d.value != "bigint" || d.value <= 0n)
      throw new Error("unilateral refund without receiver delay must greater than 0");
    if (d.type === "seconds" && d.value % 512n !== 0n)
      throw new Error("seconds timelock must be multiple of 512");
    if (d.type === "seconds" && d.value < 512n)
      throw new Error("seconds timelock must be greater or equal to 512");
  }
})(Tc || (Tc = {}));
function vg(e) {
  return W.encode(["HASH160", e, "EQUAL"]);
}
var mr;
(function(e) {
  class t extends Ot {
    constructor(r) {
      const { pubKey: i, serverPubKey: s, csvTimelock: o = t.DEFAULT_TIMELOCK } = r, a = Ft.encode({
        pubkeys: [i, s]
      }).script, c = Mt.encode({
        timelock: o,
        pubkeys: [i]
      }).script;
      super([a, c]), this.options = r, this.forfeitScript = B.encode(a), this.exitScript = B.encode(c);
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
})(mr || (mr = {}));
var Ee;
(function(e) {
  e.TxSent = "SENT", e.TxReceived = "RECEIVED";
})(Ee || (Ee = {}));
function ve(e) {
  return !e.isSpent;
}
function Mn(e) {
  return e.virtualStatus.state === "swept" && ve(e);
}
function xf(e) {
  if (e.virtualStatus.state === "swept")
    return !0;
  const t = e.virtualStatus.batchExpiry;
  return !t || new Date(t).getFullYear() < 2025 ? !1 : t <= Date.now();
}
function Tf(e, t) {
  return e.value < t;
}
async function* fo(e) {
  const t = [], n = [];
  let r = null, i = null;
  const s = (a) => {
    r ? (r(a), r = null) : t.push(a);
  }, o = () => {
    const a = new Error("EventSource error");
    a.name = "EventSourceError", i ? (i(a), i = null) : n.push(a);
  };
  e.addEventListener("message", s), e.addEventListener("error", o);
  try {
    for (; ; ) {
      if (t.length > 0) {
        yield t.shift();
        continue;
      }
      if (n.length > 0)
        throw n.shift();
      const a = await new Promise((c, u) => {
        r = c, i = u;
      }).finally(() => {
        r = null, i = null;
      });
      a && (yield a);
    }
  } finally {
    e.removeEventListener("message", s), e.removeEventListener("error", o);
  }
}
class Sf extends Error {
  constructor(t, n, r, i) {
    super(n), this.code = t, this.message = n, this.name = r, this.metadata = i;
  }
}
function kg(e) {
  try {
    if (!(e instanceof Error))
      return;
    const t = JSON.parse(e.message);
    if (!("details" in t) || !Array.isArray(t.details))
      return;
    for (const n of t.details) {
      if (!("@type" in n) || n["@type"] !== "type.googleapis.com/ark.v1.ErrorDetails" || !("code" in n))
        continue;
      const i = n.code;
      if (!("message" in n))
        continue;
      const s = n.message;
      if (!("name" in n))
        continue;
      const o = n.name;
      let a;
      return "metadata" in n && Ag(n.metadata) && (a = n.metadata), new Sf(i, s, o, a);
    }
    return;
  } catch {
    return;
  }
}
function Ag(e) {
  return typeof e == "object" && e !== null && !Array.isArray(e);
}
var ue;
(function(e) {
  function t(i, s, o = []) {
    if (typeof i != "string" && (i = r(i)), s.length == 0)
      throw new Error("intent proof requires at least one input");
    const a = s.map(Dg);
    Rg(a), Lg(o);
    const c = Cg(i, a[0].witnessUtxo.script);
    return Pg(c, a, o);
  }
  e.create = t;
  function n(i) {
    let s = 0n;
    for (let a = 0; a < i.inputsLength; a++) {
      const c = i.getInput(a);
      if (c.witnessUtxo === void 0)
        throw new Error("intent proof input requires witness utxo");
      s += c.witnessUtxo.amount;
    }
    let o = 0n;
    for (let a = 0; a < i.outputsLength; a++) {
      const c = i.getOutput(a);
      if (c.amount === void 0)
        throw new Error("intent proof output requires amount");
      o += c.amount;
    }
    if (o > s)
      throw new Error(`intent proof output amount is greater than input amount: ${o} > ${s}`);
    return Number(s - o);
  }
  e.fee = n;
  function r(i) {
    switch (i.type) {
      case "register":
        return JSON.stringify({
          type: "register",
          onchain_output_indexes: i.onchain_output_indexes,
          valid_at: i.valid_at,
          expire_at: i.expire_at,
          cosigners_public_keys: i.cosigners_public_keys
        });
      case "delete":
        return JSON.stringify({
          type: "delete",
          expire_at: i.expire_at
        });
      case "get-pending-tx":
        return JSON.stringify({
          type: "get-pending-tx",
          expire_at: i.expire_at
        });
    }
  }
  e.encodeMessage = r;
})(ue || (ue = {}));
const Ig = new Uint8Array([Et.RETURN]), Og = new Uint8Array(32).fill(0), Bg = 4294967295, $g = "ark-intent-proof-message";
function Ng(e) {
  if (e.index === void 0)
    throw new Error("intent proof input requires index");
  if (e.txid === void 0)
    throw new Error("intent proof input requires txid");
  if (e.witnessUtxo === void 0)
    throw new Error("intent proof input requires witness utxo");
  return !0;
}
function Rg(e) {
  return e.forEach(Ng), !0;
}
function Ug(e) {
  if (e.amount === void 0)
    throw new Error("intent proof output requires amount");
  if (e.script === void 0)
    throw new Error("intent proof output requires script");
  return !0;
}
function Lg(e) {
  return e.forEach(Ug), !0;
}
function Cg(e, t) {
  const n = _g(e), r = new qe({
    version: 0
  });
  return r.addInput({
    txid: Og,
    // zero hash
    index: Bg,
    sequence: 0
  }), r.addOutput({
    amount: 0n,
    script: t
  }), r.updateInput(0, {
    finalScriptSig: W.encode(["OP_0", n])
  }), r;
}
function Pg(e, t, n) {
  const r = t[0], i = t.map((o) => o.sequence || 0).reduce((o, a) => Math.max(o, a), 0), s = new qe({
    version: 2,
    lockTime: i
  });
  s.addInput({
    ...r,
    txid: e.id,
    index: 0,
    witnessUtxo: {
      script: r.witnessUtxo.script,
      amount: 0n
    },
    sighashType: Ge.ALL
  });
  for (const [o, a] of t.entries())
    s.addInput({
      ...a,
      sighashType: Ge.ALL
    }), a.unknown?.length && s.updateInput(o + 1, {
      unknown: a.unknown
    });
  n.length === 0 && (n = [
    {
      amount: 0n,
      script: Ig
    }
  ]);
  for (const o of n)
    s.addOutput({
      amount: o.amount,
      script: o.script
    });
  return s;
}
function _g(e) {
  return ea.utils.taggedHash($g, new TextEncoder().encode(e));
}
function Dg(e) {
  if (!("tapTree" in e))
    return e;
  const t = Ot.decode(e.tapTree), n = Sg(e.intentTapLeafScript), r = [Ef.encode(e.tapTree)];
  return e.extraWitness && r.push(xg.encode(e.extraWitness)), {
    txid: B.decode(e.txid),
    index: e.vout,
    witnessUtxo: {
      amount: BigInt(e.value),
      script: t.pkScript
    },
    sequence: n,
    tapLeafScript: [e.intentTapLeafScript],
    unknown: r
  };
}
var mt;
(function(e) {
  e.BatchStarted = "batch_started", e.BatchFinalization = "batch_finalization", e.BatchFinalized = "batch_finalized", e.BatchFailed = "batch_failed", e.TreeSigningStarted = "tree_signing_started", e.TreeNonces = "tree_nonces", e.TreeTx = "tree_tx", e.TreeSignature = "tree_signature", e.StreamStarted = "stream_started";
})(mt || (mt = {}));
class vf {
  constructor(t) {
    this.serverUrl = t;
  }
  async getInfo() {
    const t = `${this.serverUrl}/v1/info`, n = await fetch(t);
    if (!n.ok) {
      const i = await n.text();
      oe(i, `Failed to get server info: ${n.statusText}`);
    }
    const r = await n.json();
    return {
      boardingExitDelay: BigInt(r.boardingExitDelay ?? 0),
      checkpointTapscript: r.checkpointTapscript ?? "",
      deprecatedSigners: r.deprecatedSigners?.map((i) => ({
        cutoffDate: BigInt(i.cutoffDate ?? 0),
        pubkey: i.pubkey ?? ""
      })) ?? [],
      digest: r.digest ?? "",
      dust: BigInt(r.dust ?? 0),
      fees: {
        intentFee: r.fees?.intentFee ?? {},
        txFeeRate: r?.fees?.txFeeRate ?? ""
      },
      forfeitAddress: r.forfeitAddress ?? "",
      forfeitPubkey: r.forfeitPubkey ?? "",
      network: r.network ?? "",
      scheduledSession: "scheduledSession" in r && r.scheduledSession != null ? {
        duration: BigInt(r.scheduledSession.duration ?? 0),
        nextStartTime: BigInt(r.scheduledSession.nextStartTime ?? 0),
        nextEndTime: BigInt(r.scheduledSession.nextEndTime ?? 0),
        period: BigInt(r.scheduledSession.period ?? 0),
        fees: r.scheduledSession.fees ?? {}
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
    const r = `${this.serverUrl}/v1/tx/submit`, i = await fetch(r, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        signedArkTx: t,
        checkpointTxs: n
      })
    });
    if (!i.ok) {
      const o = await i.text();
      oe(o, `Failed to submit virtual transaction: ${o}`);
    }
    const s = await i.json();
    return {
      arkTxid: s.arkTxid,
      finalArkTx: s.finalArkTx,
      signedCheckpointTxs: s.signedCheckpointTxs
    };
  }
  async finalizeTx(t, n) {
    const r = `${this.serverUrl}/v1/tx/finalize`, i = await fetch(r, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        arkTxid: t,
        finalCheckpointTxs: n
      })
    });
    if (!i.ok) {
      const s = await i.text();
      oe(s, `Failed to finalize offchain transaction: ${s}`);
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
          message: ue.encodeMessage(t.message)
        }
      })
    });
    if (!r.ok) {
      const s = await r.text();
      oe(s, `Failed to register intent: ${s}`);
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
        intent: {
          proof: t.proof,
          message: ue.encodeMessage(t.message)
        }
      })
    });
    if (!r.ok) {
      const i = await r.text();
      oe(i, `Failed to delete intent: ${i}`);
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
      const i = await r.text();
      oe(i, `Failed to confirm registration: ${i}`);
    }
  }
  async submitTreeNonces(t, n, r) {
    const i = `${this.serverUrl}/v1/batch/tree/submitNonces`, s = await fetch(i, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        batchId: t,
        pubkey: n,
        treeNonces: Vg(r)
      })
    });
    if (!s.ok) {
      const o = await s.text();
      oe(o, `Failed to submit tree nonces: ${o}`);
    }
  }
  async submitTreeSignatures(t, n, r) {
    const i = `${this.serverUrl}/v1/batch/tree/submitSignatures`, s = await fetch(i, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        batchId: t,
        pubkey: n,
        treeSignatures: Mg(r)
      })
    });
    if (!s.ok) {
      const o = await s.text();
      oe(o, `Failed to submit tree signatures: ${o}`);
    }
  }
  async submitSignedForfeitTxs(t, n) {
    const r = `${this.serverUrl}/v1/batch/submitForfeitTxs`, i = await fetch(r, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        signedForfeitTxs: t,
        signedCommitmentTx: n
      })
    });
    if (!i.ok) {
      const s = await i.text();
      oe(s, `Failed to submit forfeit transactions: ${i.statusText}`);
    }
  }
  async *getEventStream(t, n) {
    const r = `${this.serverUrl}/v1/batch/events`, i = n.length > 0 ? `?${n.map((s) => `topics=${encodeURIComponent(s)}`).join("&")}` : "";
    for (; !t?.aborted; )
      try {
        const s = new EventSource(r + i), o = () => {
          s.close();
        };
        t?.addEventListener("abort", o);
        try {
          for await (const a of fo(s)) {
            if (t?.aborted)
              break;
            try {
              const c = JSON.parse(a.data), u = this.parseSettlementEvent(c);
              u && (yield u);
            } catch (c) {
              throw console.error("Failed to parse event:", c), c;
            }
          }
        } finally {
          t?.removeEventListener("abort", o), s.close();
        }
      } catch (s) {
        if (s instanceof Error && s.name === "AbortError")
          break;
        if (ho(s)) {
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
        const r = new EventSource(n), i = () => {
          r.close();
        };
        t?.addEventListener("abort", i);
        try {
          for await (const s of fo(r)) {
            if (t?.aborted)
              break;
            try {
              const o = JSON.parse(s.data), a = this.parseTransactionNotification(o);
              a && (yield a);
            } catch (o) {
              throw console.error("Failed to parse transaction notification:", o), o;
            }
          }
        } finally {
          t?.removeEventListener("abort", i), r.close();
        }
      } catch (r) {
        if (r instanceof Error && r.name === "AbortError")
          break;
        if (ho(r)) {
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
      body: JSON.stringify({
        intent: {
          proof: t.proof,
          message: ue.encodeMessage(t.message)
        }
      })
    });
    if (!r.ok) {
      const s = await r.text();
      oe(s, `Failed to get pending transactions: ${s}`);
    }
    return (await r.json()).pendingTxs;
  }
  parseSettlementEvent(t) {
    if (t.batchStarted)
      return {
        type: mt.BatchStarted,
        id: t.batchStarted.id,
        intentIdHashes: t.batchStarted.intentIdHashes,
        batchExpiry: BigInt(t.batchStarted.batchExpiry)
      };
    if (t.batchFinalization)
      return {
        type: mt.BatchFinalization,
        id: t.batchFinalization.id,
        commitmentTx: t.batchFinalization.commitmentTx
      };
    if (t.batchFinalized)
      return {
        type: mt.BatchFinalized,
        id: t.batchFinalized.id,
        commitmentTxid: t.batchFinalized.commitmentTxid
      };
    if (t.batchFailed)
      return {
        type: mt.BatchFailed,
        id: t.batchFailed.id,
        reason: t.batchFailed.reason
      };
    if (t.treeSigningStarted)
      return {
        type: mt.TreeSigningStarted,
        id: t.treeSigningStarted.id,
        cosignersPublicKeys: t.treeSigningStarted.cosignersPubkeys,
        unsignedCommitmentTx: t.treeSigningStarted.unsignedCommitmentTx
      };
    if (t.treeNoncesAggregated)
      return null;
    if (t.treeNonces)
      return {
        type: mt.TreeNonces,
        id: t.treeNonces.id,
        topic: t.treeNonces.topic,
        txid: t.treeNonces.txid,
        nonces: Hg(t.treeNonces.nonces)
        // pubkey -> public nonce
      };
    if (t.treeTx) {
      const n = Object.fromEntries(Object.entries(t.treeTx.children).map(([r, i]) => [parseInt(r), i]));
      return {
        type: mt.TreeTx,
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
      type: mt.TreeSignature,
      id: t.treeSignature.id,
      topic: t.treeSignature.topic,
      batchIndex: t.treeSignature.batchIndex,
      txid: t.treeSignature.txid,
      signature: t.treeSignature.signature
    } : t.streamStarted ? {
      type: mt.StreamStarted,
      id: t.streamStarted.id
    } : (t.heartbeat || console.warn("Unknown event type:", t), null);
  }
  parseTransactionNotification(t) {
    return t.commitmentTx ? {
      commitmentTx: {
        txid: t.commitmentTx.txid,
        tx: t.commitmentTx.tx,
        spentVtxos: t.commitmentTx.spentVtxos.map(Pr),
        spendableVtxos: t.commitmentTx.spendableVtxos.map(Pr),
        checkpointTxs: t.commitmentTx.checkpointTxs
      }
    } : t.arkTx ? {
      arkTx: {
        txid: t.arkTx.txid,
        tx: t.arkTx.tx,
        spentVtxos: t.arkTx.spentVtxos.map(Pr),
        spendableVtxos: t.arkTx.spendableVtxos.map(Pr),
        checkpointTxs: t.arkTx.checkpointTxs
      }
    } : (t.heartbeat || console.warn("Unknown transaction notification type:", t), null);
  }
}
function Vg(e) {
  const t = {};
  for (const [n, r] of e)
    t[n] = B.encode(r.pubNonce);
  return t;
}
function Mg(e) {
  const t = {};
  for (const [n, r] of e)
    t[n] = B.encode(r.encode());
  return t;
}
function Hg(e) {
  return new Map(Object.entries(e).map(([t, n]) => {
    if (typeof n != "string")
      throw new Error("invalid nonce");
    return [t, { pubNonce: B.decode(n) }];
  }));
}
function ho(e) {
  const t = (n) => n instanceof Error ? n.name === "TypeError" && n.message === "Failed to fetch" || n.name === "HeadersTimeoutError" || n.name === "BodyTimeoutError" || n.code === "UND_ERR_HEADERS_TIMEOUT" || n.code === "UND_ERR_BODY_TIMEOUT" : !1;
  return t(e) || t(e.cause);
}
function Pr(e) {
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
function oe(e, t) {
  const n = new Error(e);
  throw kg(n) ?? new Error(t);
}
class Xr {
  constructor(t, n = /* @__PURE__ */ new Map()) {
    this.root = t, this.children = n;
  }
  static create(t) {
    if (t.length === 0)
      throw new Error("empty chunks");
    const n = /* @__PURE__ */ new Map();
    for (const s of t) {
      const o = Kg(s), a = o.tx.id;
      n.set(a, o);
    }
    const r = [];
    for (const [s] of n) {
      let o = !1;
      for (const [a, c] of n)
        if (a !== s && (o = Fg(c, s), o))
          break;
      if (!o) {
        r.push(s);
        continue;
      }
    }
    if (r.length === 0)
      throw new Error("no root chunk found");
    if (r.length > 1)
      throw new Error(`multiple root chunks found: ${r.join(", ")}`);
    const i = kf(r[0], n);
    if (!i)
      throw new Error(`chunk not found for root txid: ${r[0]}`);
    if (i.nbOfNodes() !== t.length)
      throw new Error(`number of chunks (${t.length}) is not equal to the number of nodes in the graph (${i.nbOfNodes()})`);
    return i;
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
    for (const [r, i] of this.children) {
      if (r >= t)
        throw new Error(`output index ${r} is out of bounds (nb of outputs: ${t})`);
      i.validate();
      const s = i.root.getInput(0), o = this.root.id;
      if (!s.txid || B.encode(s.txid) !== o || s.index !== r)
        throw new Error(`input of child ${r} is not the output of the parent`);
      let a = 0n;
      for (let u = 0; u < i.root.outputsLength; u++) {
        const l = i.root.getOutput(u);
        l?.amount && (a += l.amount);
      }
      const c = this.root.getOutput(r);
      if (!c?.amount)
        throw new Error(`parent output ${r} has no amount`);
      if (a !== c.amount)
        throw new Error(`sum of child's outputs is not equal to the output of the parent: ${a} != ${c.amount}`);
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
function Fg(e, t) {
  return Object.values(e.children).includes(t);
}
function kf(e, t) {
  const n = t.get(e);
  if (!n)
    return null;
  const r = n.tx, i = /* @__PURE__ */ new Map();
  for (const [s, o] of Object.entries(n.children)) {
    const a = parseInt(s), c = kf(o, t);
    c && i.set(a, c);
  }
  return new Xr(r, i);
}
function Kg(e) {
  return { tx: Qt.fromPSBT(pt.decode(e.tx)), children: e.children };
}
var po;
(function(e) {
  let t;
  (function(r) {
    r.Start = "start", r.BatchStarted = "batch_started", r.TreeSigningStarted = "tree_signing_started", r.TreeNoncesAggregated = "tree_nonces_aggregated", r.BatchFinalization = "batch_finalization";
  })(t || (t = {}));
  async function n(r, i, s = {}) {
    const { abortController: o, skipVtxoTreeSigning: a = !1, eventCallback: c } = s;
    let u = t.Start;
    const l = [], d = [];
    let p, g;
    for await (const f of r) {
      if (o?.signal.aborted)
        throw new Error("canceled");
      switch (c && c(f).catch(() => {
      }), f.type) {
        case mt.BatchStarted: {
          const h = f, { skip: w } = await i.onBatchStarted(h);
          w || (u = t.BatchStarted, a && (u = t.TreeNoncesAggregated));
          continue;
        }
        case mt.BatchFinalized: {
          if (u !== t.BatchFinalization)
            continue;
          return i.onBatchFinalized && await i.onBatchFinalized(f), f.commitmentTxid;
        }
        case mt.BatchFailed: {
          if (i.onBatchFailed) {
            await i.onBatchFailed(f);
            continue;
          }
          throw new Error(f.reason);
        }
        case mt.TreeTx: {
          if (u !== t.BatchStarted && u !== t.TreeNoncesAggregated)
            continue;
          f.batchIndex === 0 ? l.push(f.chunk) : d.push(f.chunk), i.onTreeTxEvent && await i.onTreeTxEvent(f);
          continue;
        }
        case mt.TreeSignature: {
          if (u !== t.TreeNoncesAggregated)
            continue;
          if (!p)
            throw new Error("vtxo tree not initialized");
          const h = B.decode(f.signature);
          p.update(f.txid, (w) => {
            w.updateInput(0, {
              tapKeySig: h
            });
          }), i.onTreeSignatureEvent && await i.onTreeSignatureEvent(f);
          continue;
        }
        case mt.TreeSigningStarted: {
          if (u !== t.BatchStarted)
            continue;
          p = Xr.create(l);
          const { skip: h } = await i.onTreeSigningStarted(f, p);
          h || (u = t.TreeSigningStarted);
          continue;
        }
        case mt.TreeNonces: {
          if (u !== t.TreeSigningStarted)
            continue;
          const { fullySigned: h } = await i.onTreeNonces(f);
          h && (u = t.TreeNoncesAggregated);
          continue;
        }
        case mt.BatchFinalization: {
          if (u !== t.TreeNoncesAggregated)
            continue;
          if (!p && l.length > 0 && (p = Xr.create(l)), !p && !a)
            throw new Error("vtxo tree not initialized");
          d.length > 0 && (g = Xr.create(d)), await i.onBatchFinalization(f, p, g), u = t.BatchFinalization;
          continue;
        }
        default:
          continue;
      }
    }
    throw new Error("event stream closed");
  }
  e.join = n;
})(po || (po = {}));
const Af = (e) => zg[e], zg = {
  bitcoin: tr(Ln, "ark"),
  testnet: tr(Br, "tark"),
  signet: tr(Br, "tark"),
  mutinynet: tr(Br, "tark"),
  regtest: tr({
    ...Br,
    bech32: "bcrt",
    pubKeyHash: 111,
    scriptHash: 196
  }, "tark")
};
function tr(e, t) {
  return {
    ...e,
    hrp: t
  };
}
const jg = {
  bitcoin: "https://mempool.space/api",
  testnet: "https://mempool.space/testnet/api",
  signet: "https://mempool.space/signet/api",
  mutinynet: "https://mutinynet.com/api",
  regtest: "http://localhost:3000"
};
class Wg {
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
    const i = await fetch(`${this.baseUrl}/tx/${t}/status`);
    if (!i.ok)
      throw new Error(`Failed to get transaction status: ${i.statusText}`);
    const s = await i.json();
    return s.confirmed ? {
      confirmed: s.confirmed,
      blockTime: s.block_time,
      blockHeight: s.block_height
    } : { confirmed: !1 };
  }
  async watchAddresses(t, n) {
    let r = null;
    const i = this.baseUrl.replace(/^http(s)?:/, "ws$1:") + "/v1/ws", s = async () => {
      const c = async () => (await Promise.all(t.map((g) => this.getTransactions(g)))).flat(), u = await c(), l = (p) => `${p.txid}_${p.status.block_time}`, d = new Set(u.map(l));
      r = setInterval(async () => {
        try {
          const g = (await c()).filter((f) => !d.has(l(f)));
          g.length > 0 && (g.forEach((f) => d.add(l(f))), n(g));
        } catch (p) {
          console.error("Error in polling mechanism:", p);
        }
      }, this.pollingInterval);
    };
    let o = null;
    const a = () => {
      o && o.close(), r && clearInterval(r);
    };
    if (this.forcePolling)
      return await s(), a;
    try {
      o = new WebSocket(i), o.addEventListener("open", () => {
        const c = {
          "track-addresses": t
        };
        o.send(JSON.stringify(c));
      }), o.addEventListener("message", (c) => {
        try {
          const u = [], l = JSON.parse(c.data.toString());
          if (!l["multi-address-transactions"])
            return;
          const d = l["multi-address-transactions"];
          for (const p in d)
            for (const g of [
              "mempool",
              "confirmed",
              "removed"
            ])
              d[p][g] && u.push(...d[p][g].filter(qg));
          u.length > 0 && n(u);
        } catch (u) {
          console.error("Failed to process WebSocket message:", u);
        }
      }), o.addEventListener("error", async () => {
        await s();
      });
    } catch {
      r && clearInterval(r), await s();
    }
    return a;
  }
  async getChainTip() {
    const t = await fetch(`${this.baseUrl}/blocks/tip`);
    if (!t.ok)
      throw new Error(`Failed to get chain tip: ${t.statusText}`);
    const n = await t.json();
    if (!Gg(n))
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
      const i = await r.text();
      throw new Error(`Failed to broadcast package: ${i}`);
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
function Gg(e) {
  return Array.isArray(e) && e.every((t) => t && typeof t == "object" && typeof t.id == "string" && t.id.length > 0 && typeof t.height == "number" && t.height >= 0 && typeof t.mediantime == "number" && t.mediantime > 0);
}
const qg = (e) => typeof e.txid == "string" && Array.isArray(e.vout) && e.vout.every((t) => typeof t.scriptpubkey_address == "string" && typeof t.value == "number") && typeof e.status == "object" && typeof e.status.confirmed == "boolean", Yg = 0n, Zg = new Uint8Array([81, 2, 78, 115]), ca = {
  script: Zg,
  amount: Yg
};
B.encode(ca.script);
function Xg(e, t, n) {
  let r = 0n;
  for (const i of e) {
    if (!i.witnessUtxo)
      throw new Error("input needs witness utxo");
    r += i.witnessUtxo.amount;
  }
  return If(e, {
    script: t,
    amount: r
  }, n);
}
function If(e, t, n) {
  const r = new qe({
    version: 3,
    lockTime: n
  });
  for (const i of e)
    r.addInput(i);
  return r.addOutput(t), r.addOutput(ca), r;
}
const Qg = new Error("invalid settlement transaction outputs"), Jg = new Error("empty tree"), ty = new Error("invalid number of inputs"), Ts = new Error("wrong settlement txid"), ey = new Error("invalid amount"), ny = new Error("no leaves"), ry = new Error("invalid taproot script"), Sc = new Error("invalid round transaction outputs"), iy = new Error("wrong commitment txid"), sy = new Error("missing cosigners public keys"), Ss = 0, vc = 1;
function oy(e, t) {
  if (t.validate(), t.root.inputsLength !== 1)
    throw ty;
  const n = t.root.getInput(0), r = Qt.fromPSBT(pt.decode(e));
  if (r.outputsLength <= vc)
    throw Qg;
  const i = r.id;
  if (!n.txid || B.encode(n.txid) !== i || n.index !== vc)
    throw Ts;
}
function ay(e, t, n) {
  if (t.outputsLength < Ss + 1)
    throw Sc;
  const r = t.getOutput(Ss)?.amount;
  if (!r)
    throw Sc;
  if (!e.root)
    throw Jg;
  const i = e.root.getInput(0), s = t.id;
  if (!i.txid || B.encode(i.txid) !== s || i.index !== Ss)
    throw iy;
  let o = 0n;
  for (let c = 0; c < e.root.outputsLength; c++) {
    const u = e.root.getOutput(c);
    u?.amount && (o += u.amount);
  }
  if (o !== r)
    throw ey;
  if (e.leaves().length === 0)
    throw ny;
  e.validate();
  for (const c of e.iterator())
    for (const [u, l] of c.children) {
      const d = c.root.getOutput(u);
      if (!d?.script)
        throw new Error(`parent output ${u} not found`);
      const p = d.script.slice(2);
      if (p.length !== 32)
        throw new Error(`parent output ${u} has invalid script`);
      const g = uo(l.root, 0, lo);
      if (g.length === 0)
        throw sy;
      const f = g.map((w) => w.key), { finalKey: h } = na(f, !0, {
        taprootTweak: n
      });
      if (!h || B.encode(h.slice(1)) !== B.encode(p))
        throw ry;
    }
}
function cy(e, t, n) {
  let r = !1;
  for (const [o, a] of t.entries()) {
    if (!a.script)
      throw new Error(`missing output script ${o}`);
    if (W.decode(a.script)[0] === "RETURN") {
      if (r)
        throw new Error("multiple OP_RETURN outputs");
      r = !0;
    }
  }
  const i = e.map((o) => uy(o, n));
  return {
    arkTx: Of(i.map((o) => o.input), t),
    checkpoints: i.map((o) => o.tx)
  };
}
function Of(e, t) {
  let n = 0n;
  for (const i of e) {
    const s = aa(In(i.tapLeafScript));
    if (Vn.is(s)) {
      if (n !== 0n && kc(n) !== kc(s.params.absoluteTimelock))
        throw new Error("cannot mix seconds and blocks locktime");
      s.params.absoluteTimelock > n && (n = s.params.absoluteTimelock);
    }
  }
  const r = new qe({
    version: 3,
    lockTime: Number(n)
  });
  for (const [i, s] of e.entries())
    r.addInput({
      txid: s.txid,
      index: s.vout,
      sequence: n ? Ko - 1 : void 0,
      witnessUtxo: {
        script: Ot.decode(s.tapTree).pkScript,
        amount: BigInt(s.value)
      },
      tapLeafScript: [s.tapLeafScript]
    }), Eg(r, i, Ef, s.tapTree);
  for (const i of t)
    r.addOutput(i);
  return r.addOutput(ca), r;
}
function uy(e, t) {
  const n = aa(In(e.tapLeafScript)), r = new Ot([
    t.script,
    n.script
  ]), i = Of([e], [
    {
      amount: BigInt(e.value),
      script: r.pkScript
    }
  ]), s = r.findLeaf(B.encode(n.script)), o = {
    txid: i.id,
    vout: 0,
    value: e.value,
    tapLeafScript: s,
    tapTree: r.encode()
  };
  return {
    tx: i,
    input: o
  };
}
const ly = 500000000n;
function kc(e) {
  return e >= ly;
}
function fy(e, t) {
  if (!e.status.block_time)
    return !1;
  if (t.value === 0n)
    return !0;
  if (t.type === "blocks")
    return !1;
  const n = BigInt(Math.floor(Date.now() / 1e3));
  return BigInt(Math.floor(e.status.block_time)) + t.value <= n;
}
const dy = 4320 * 60 * 1e3, hy = {
  thresholdMs: dy
  // 3 days
};
class wt {
  constructor(t, n, r = wt.DefaultHRP) {
    this.preimage = t, this.value = n, this.HRP = r, this.vout = 0;
    const i = vt(this.preimage);
    this.vtxoScript = new Ot([yy(i)]);
    const s = this.vtxoScript.leaves[0];
    this.txid = B.encode(new Uint8Array(i).reverse()), this.tapTree = this.vtxoScript.encode(), this.forfeitTapLeafScript = s, this.intentTapLeafScript = s, this.value = n, this.status = { confirmed: !0 }, this.extraWitness = [this.preimage];
  }
  encode() {
    const t = new Uint8Array(wt.Length);
    return t.set(this.preimage, 0), py(t, this.value, this.preimage.length), t;
  }
  static decode(t, n = wt.DefaultHRP) {
    if (t.length !== wt.Length)
      throw new Error(`invalid data length: expected ${wt.Length} bytes, got ${t.length}`);
    const r = t.subarray(0, wt.PreimageLength), i = gy(t, wt.PreimageLength);
    return new wt(r, i, n);
  }
  static fromString(t, n = wt.DefaultHRP) {
    if (t = t.trim(), !t.startsWith(n))
      throw new Error(`invalid human-readable part: expected ${n} prefix (note '${t}')`);
    const r = t.slice(n.length), i = Ds.decode(r);
    if (i.length === 0)
      throw new Error("failed to decode base58 string");
    return wt.decode(i, n);
  }
  toString() {
    return this.HRP + Ds.encode(this.encode());
  }
}
wt.DefaultHRP = "arknote";
wt.PreimageLength = 32;
wt.ValueLength = 4;
wt.Length = wt.PreimageLength + wt.ValueLength;
wt.FakeOutpointIndex = 0;
function py(e, t, n) {
  new DataView(e.buffer, e.byteOffset + n, 4).setUint32(0, t, !1);
}
function gy(e, t) {
  return new DataView(e.buffer, e.byteOffset + t, 4).getUint32(0, !1);
}
function yy(e) {
  return W.encode(["SHA256", e, "EQUAL"]);
}
var go;
(function(e) {
  e[e.INDEXER_TX_TYPE_UNSPECIFIED = 0] = "INDEXER_TX_TYPE_UNSPECIFIED", e[e.INDEXER_TX_TYPE_RECEIVED = 1] = "INDEXER_TX_TYPE_RECEIVED", e[e.INDEXER_TX_TYPE_SENT = 2] = "INDEXER_TX_TYPE_SENT";
})(go || (go = {}));
var On;
(function(e) {
  e.UNSPECIFIED = "INDEXER_CHAINED_TX_TYPE_UNSPECIFIED", e.COMMITMENT = "INDEXER_CHAINED_TX_TYPE_COMMITMENT", e.ARK = "INDEXER_CHAINED_TX_TYPE_ARK", e.TREE = "INDEXER_CHAINED_TX_TYPE_TREE", e.CHECKPOINT = "INDEXER_CHAINED_TX_TYPE_CHECKPOINT";
})(On || (On = {}));
class Bf {
  constructor(t) {
    this.serverUrl = t;
  }
  async getVtxoTree(t, n) {
    let r = `${this.serverUrl}/v1/indexer/batch/${t.txid}/${t.vout}/tree`;
    const i = new URLSearchParams();
    n && (n.pageIndex !== void 0 && i.append("page.index", n.pageIndex.toString()), n.pageSize !== void 0 && i.append("page.size", n.pageSize.toString())), i.toString() && (r += "?" + i.toString());
    const s = await fetch(r);
    if (!s.ok)
      throw new Error(`Failed to fetch vtxo tree: ${s.statusText}`);
    const o = await s.json();
    if (!qt.isVtxoTreeResponse(o))
      throw new Error("Invalid vtxo tree data received");
    return o.vtxoTree.forEach((a) => {
      a.children = Object.fromEntries(Object.entries(a.children).map(([c, u]) => [
        Number(c),
        u
      ]));
    }), o;
  }
  async getVtxoTreeLeaves(t, n) {
    let r = `${this.serverUrl}/v1/indexer/batch/${t.txid}/${t.vout}/tree/leaves`;
    const i = new URLSearchParams();
    n && (n.pageIndex !== void 0 && i.append("page.index", n.pageIndex.toString()), n.pageSize !== void 0 && i.append("page.size", n.pageSize.toString())), i.toString() && (r += "?" + i.toString());
    const s = await fetch(r);
    if (!s.ok)
      throw new Error(`Failed to fetch vtxo tree leaves: ${s.statusText}`);
    const o = await s.json();
    if (!qt.isVtxoTreeLeavesResponse(o))
      throw new Error("Invalid vtxos tree leaves data received");
    return o;
  }
  async getBatchSweepTransactions(t) {
    const n = `${this.serverUrl}/v1/indexer/batch/${t.txid}/${t.vout}/sweepTxs`, r = await fetch(n);
    if (!r.ok)
      throw new Error(`Failed to fetch batch sweep transactions: ${r.statusText}`);
    const i = await r.json();
    if (!qt.isBatchSweepTransactionsResponse(i))
      throw new Error("Invalid batch sweep transactions data received");
    return i;
  }
  async getCommitmentTx(t) {
    const n = `${this.serverUrl}/v1/indexer/commitmentTx/${t}`, r = await fetch(n);
    if (!r.ok)
      throw new Error(`Failed to fetch commitment tx: ${r.statusText}`);
    const i = await r.json();
    if (!qt.isCommitmentTx(i))
      throw new Error("Invalid commitment tx data received");
    return i;
  }
  async getCommitmentTxConnectors(t, n) {
    let r = `${this.serverUrl}/v1/indexer/commitmentTx/${t}/connectors`;
    const i = new URLSearchParams();
    n && (n.pageIndex !== void 0 && i.append("page.index", n.pageIndex.toString()), n.pageSize !== void 0 && i.append("page.size", n.pageSize.toString())), i.toString() && (r += "?" + i.toString());
    const s = await fetch(r);
    if (!s.ok)
      throw new Error(`Failed to fetch commitment tx connectors: ${s.statusText}`);
    const o = await s.json();
    if (!qt.isConnectorsResponse(o))
      throw new Error("Invalid commitment tx connectors data received");
    return o.connectors.forEach((a) => {
      a.children = Object.fromEntries(Object.entries(a.children).map(([c, u]) => [
        Number(c),
        u
      ]));
    }), o;
  }
  async getCommitmentTxForfeitTxs(t, n) {
    let r = `${this.serverUrl}/v1/indexer/commitmentTx/${t}/forfeitTxs`;
    const i = new URLSearchParams();
    n && (n.pageIndex !== void 0 && i.append("page.index", n.pageIndex.toString()), n.pageSize !== void 0 && i.append("page.size", n.pageSize.toString())), i.toString() && (r += "?" + i.toString());
    const s = await fetch(r);
    if (!s.ok)
      throw new Error(`Failed to fetch commitment tx forfeitTxs: ${s.statusText}`);
    const o = await s.json();
    if (!qt.isForfeitTxsResponse(o))
      throw new Error("Invalid commitment tx forfeitTxs data received");
    return o;
  }
  async *getSubscription(t, n) {
    const r = `${this.serverUrl}/v1/indexer/script/subscription/${t}`;
    for (; !n?.aborted; )
      try {
        const i = new EventSource(r), s = () => {
          i.close();
        };
        n?.addEventListener("abort", s);
        try {
          for await (const o of fo(i)) {
            if (n?.aborted)
              break;
            try {
              const a = JSON.parse(o.data);
              a.event && (yield {
                txid: a.event.txid,
                scripts: a.event.scripts || [],
                newVtxos: (a.event.newVtxos || []).map(_r),
                spentVtxos: (a.event.spentVtxos || []).map(_r),
                sweptVtxos: (a.event.sweptVtxos || []).map(_r),
                tx: a.event.tx,
                checkpointTxs: a.event.checkpointTxs
              });
            } catch (a) {
              throw console.error("Failed to parse subscription event:", a), a;
            }
          }
        } finally {
          n?.removeEventListener("abort", s), i.close();
        }
      } catch (i) {
        if (i instanceof Error && i.name === "AbortError")
          break;
        if (ho(i)) {
          console.debug("Timeout error ignored");
          continue;
        }
        throw console.error("Subscription error:", i), i;
      }
  }
  async getVirtualTxs(t, n) {
    let r = `${this.serverUrl}/v1/indexer/virtualTx/${t.join(",")}`;
    const i = new URLSearchParams();
    n && (n.pageIndex !== void 0 && i.append("page.index", n.pageIndex.toString()), n.pageSize !== void 0 && i.append("page.size", n.pageSize.toString())), i.toString() && (r += "?" + i.toString());
    const s = await fetch(r);
    if (!s.ok)
      throw new Error(`Failed to fetch virtual txs: ${s.statusText}`);
    const o = await s.json();
    if (!qt.isVirtualTxsResponse(o))
      throw new Error("Invalid virtual txs data received");
    return o;
  }
  async getVtxoChain(t, n) {
    let r = `${this.serverUrl}/v1/indexer/vtxo/${t.txid}/${t.vout}/chain`;
    const i = new URLSearchParams();
    n && (n.pageIndex !== void 0 && i.append("page.index", n.pageIndex.toString()), n.pageSize !== void 0 && i.append("page.size", n.pageSize.toString())), i.toString() && (r += "?" + i.toString());
    const s = await fetch(r);
    if (!s.ok)
      throw new Error(`Failed to fetch vtxo chain: ${s.statusText}`);
    const o = await s.json();
    if (!qt.isVtxoChainResponse(o))
      throw new Error("Invalid vtxo chain data received");
    return o;
  }
  async getVtxos(t) {
    if (t?.scripts && t?.outpoints)
      throw new Error("scripts and outpoints are mutually exclusive options");
    if (!t?.scripts && !t?.outpoints)
      throw new Error("Either scripts or outpoints must be provided");
    let n = `${this.serverUrl}/v1/indexer/vtxos`;
    const r = new URLSearchParams();
    t?.scripts && t.scripts.length > 0 && t.scripts.forEach((o) => {
      r.append("scripts", o);
    }), t?.outpoints && t.outpoints.length > 0 && t.outpoints.forEach((o) => {
      r.append("outpoints", `${o.txid}:${o.vout}`);
    }), t && (t.spendableOnly !== void 0 && r.append("spendableOnly", t.spendableOnly.toString()), t.spentOnly !== void 0 && r.append("spentOnly", t.spentOnly.toString()), t.recoverableOnly !== void 0 && r.append("recoverableOnly", t.recoverableOnly.toString()), t.pageIndex !== void 0 && r.append("page.index", t.pageIndex.toString()), t.pageSize !== void 0 && r.append("page.size", t.pageSize.toString())), r.toString() && (n += "?" + r.toString());
    const i = await fetch(n);
    if (!i.ok)
      throw new Error(`Failed to fetch vtxos: ${i.statusText}`);
    const s = await i.json();
    if (!qt.isVtxosResponse(s))
      throw new Error("Invalid vtxos data received");
    return {
      vtxos: s.vtxos.map(_r),
      page: s.page
    };
  }
  async subscribeForScripts(t, n) {
    const r = `${this.serverUrl}/v1/indexer/script/subscribe`, i = await fetch(r, {
      headers: {
        "Content-Type": "application/json"
      },
      method: "POST",
      body: JSON.stringify({ scripts: t, subscriptionId: n })
    });
    if (!i.ok) {
      const o = await i.text();
      throw new Error(`Failed to subscribe to scripts: ${o}`);
    }
    const s = await i.json();
    if (!s.subscriptionId)
      throw new Error("Subscription ID not found");
    return s.subscriptionId;
  }
  async unsubscribeForScripts(t, n) {
    const r = `${this.serverUrl}/v1/indexer/script/unsubscribe`, i = await fetch(r, {
      headers: {
        "Content-Type": "application/json"
      },
      method: "POST",
      body: JSON.stringify({ subscriptionId: t, scripts: n })
    });
    if (!i.ok) {
      const s = await i.text();
      console.warn(`Failed to unsubscribe to scripts: ${s}`);
    }
  }
}
function _r(e) {
  return {
    txid: e.outpoint.txid,
    vout: e.outpoint.vout,
    value: Number(e.amount),
    status: {
      confirmed: !e.isSwept && !e.isPreconfirmed,
      isLeaf: !e.isPreconfirmed
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
var qt;
(function(e) {
  function t(m) {
    return typeof m == "object" && typeof m.totalOutputAmount == "string" && typeof m.totalOutputVtxos == "number" && typeof m.expiresAt == "string" && typeof m.swept == "boolean";
  }
  function n(m) {
    return typeof m == "object" && typeof m.txid == "string" && typeof m.expiresAt == "string" && Object.values(On).includes(m.type) && Array.isArray(m.spends) && m.spends.every((Q) => typeof Q == "string");
  }
  function r(m) {
    return typeof m == "object" && typeof m.startedAt == "string" && typeof m.endedAt == "string" && typeof m.totalInputAmount == "string" && typeof m.totalInputVtxos == "number" && typeof m.totalOutputAmount == "string" && typeof m.totalOutputVtxos == "number" && typeof m.batches == "object" && Object.values(m.batches).every(t);
  }
  e.isCommitmentTx = r;
  function i(m) {
    return typeof m == "object" && typeof m.txid == "string" && typeof m.vout == "number";
  }
  e.isOutpoint = i;
  function s(m) {
    return Array.isArray(m) && m.every(i);
  }
  e.isOutpointArray = s;
  function o(m) {
    return typeof m == "object" && typeof m.txid == "string" && typeof m.children == "object" && Object.values(m.children).every(l) && Object.keys(m.children).every((Q) => Number.isInteger(Number(Q)));
  }
  function a(m) {
    return Array.isArray(m) && m.every(o);
  }
  e.isTxsArray = a;
  function c(m) {
    return typeof m == "object" && typeof m.amount == "string" && typeof m.createdAt == "string" && typeof m.isSettled == "boolean" && typeof m.settledBy == "string" && Object.values(go).includes(m.type) && (!m.commitmentTxid && typeof m.virtualTxid == "string" || typeof m.commitmentTxid == "string" && !m.virtualTxid);
  }
  function u(m) {
    return Array.isArray(m) && m.every(c);
  }
  e.isTxHistoryRecordArray = u;
  function l(m) {
    return typeof m == "string" && m.length === 64;
  }
  function d(m) {
    return Array.isArray(m) && m.every(l);
  }
  e.isTxidArray = d;
  function p(m) {
    return typeof m == "object" && i(m.outpoint) && typeof m.createdAt == "string" && (m.expiresAt === null || typeof m.expiresAt == "string") && typeof m.amount == "string" && typeof m.script == "string" && typeof m.isPreconfirmed == "boolean" && typeof m.isSwept == "boolean" && typeof m.isUnrolled == "boolean" && typeof m.isSpent == "boolean" && (!m.spentBy || typeof m.spentBy == "string") && (!m.settledBy || typeof m.settledBy == "string") && (!m.arkTxid || typeof m.arkTxid == "string") && Array.isArray(m.commitmentTxids) && m.commitmentTxids.every(l);
  }
  function g(m) {
    return typeof m == "object" && typeof m.current == "number" && typeof m.next == "number" && typeof m.total == "number";
  }
  function f(m) {
    return typeof m == "object" && Array.isArray(m.vtxoTree) && m.vtxoTree.every(o) && (!m.page || g(m.page));
  }
  e.isVtxoTreeResponse = f;
  function h(m) {
    return typeof m == "object" && Array.isArray(m.leaves) && m.leaves.every(i) && (!m.page || g(m.page));
  }
  e.isVtxoTreeLeavesResponse = h;
  function w(m) {
    return typeof m == "object" && Array.isArray(m.connectors) && m.connectors.every(o) && (!m.page || g(m.page));
  }
  e.isConnectorsResponse = w;
  function E(m) {
    return typeof m == "object" && Array.isArray(m.txids) && m.txids.every(l) && (!m.page || g(m.page));
  }
  e.isForfeitTxsResponse = E;
  function S(m) {
    return typeof m == "object" && Array.isArray(m.sweptBy) && m.sweptBy.every(l);
  }
  e.isSweptCommitmentTxResponse = S;
  function O(m) {
    return typeof m == "object" && Array.isArray(m.sweptBy) && m.sweptBy.every(l);
  }
  e.isBatchSweepTransactionsResponse = O;
  function R(m) {
    return typeof m == "object" && Array.isArray(m.txs) && m.txs.every((Q) => typeof Q == "string") && (!m.page || g(m.page));
  }
  e.isVirtualTxsResponse = R;
  function L(m) {
    return typeof m == "object" && Array.isArray(m.chain) && m.chain.every(n) && (!m.page || g(m.page));
  }
  e.isVtxoChainResponse = L;
  function P(m) {
    return typeof m == "object" && Array.isArray(m.vtxos) && m.vtxos.every(p) && (!m.page || g(m.page));
  }
  e.isVtxosResponse = P;
})(qt || (qt = {}));
class wy {
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
const Dr = (e) => `vtxos:${e}`, Vr = (e) => `utxos:${e}`, vs = (e) => `tx:${e}`, Ac = "wallet:state", Bi = (e) => e ? B.encode(e) : void 0, Hn = (e) => e ? B.decode(e) : void 0, $i = ([e, t]) => ({
  cb: B.encode(ae.encode(e)),
  s: B.encode(t)
}), Ic = (e) => ({
  ...e,
  tapTree: Bi(e.tapTree),
  forfeitTapLeafScript: $i(e.forfeitTapLeafScript),
  intentTapLeafScript: $i(e.intentTapLeafScript),
  extraWitness: e.extraWitness?.map(Bi)
}), Oc = (e) => ({
  ...e,
  tapTree: Bi(e.tapTree),
  forfeitTapLeafScript: $i(e.forfeitTapLeafScript),
  intentTapLeafScript: $i(e.intentTapLeafScript),
  extraWitness: e.extraWitness?.map(Bi)
}), Ni = (e) => {
  const t = ae.decode(Hn(e.cb)), n = Hn(e.s);
  return [t, n];
}, my = (e) => ({
  ...e,
  createdAt: new Date(e.createdAt),
  tapTree: Hn(e.tapTree),
  forfeitTapLeafScript: Ni(e.forfeitTapLeafScript),
  intentTapLeafScript: Ni(e.intentTapLeafScript),
  extraWitness: e.extraWitness?.map(Hn)
}), by = (e) => ({
  ...e,
  tapTree: Hn(e.tapTree),
  forfeitTapLeafScript: Ni(e.forfeitTapLeafScript),
  intentTapLeafScript: Ni(e.intentTapLeafScript),
  extraWitness: e.extraWitness?.map(Hn)
});
class yo {
  constructor(t) {
    this.storage = t;
  }
  async getVtxos(t) {
    const n = await this.storage.getItem(Dr(t));
    if (!n)
      return [];
    try {
      return JSON.parse(n).map(my);
    } catch (r) {
      return console.error(`Failed to parse VTXOs for address ${t}:`, r), [];
    }
  }
  async saveVtxos(t, n) {
    const r = await this.getVtxos(t);
    for (const i of n) {
      const s = r.findIndex((o) => o.txid === i.txid && o.vout === i.vout);
      s !== -1 ? r[s] = i : r.push(i);
    }
    await this.storage.setItem(Dr(t), JSON.stringify(r.map(Ic)));
  }
  async removeVtxo(t, n) {
    const r = await this.getVtxos(t), [i, s] = n.split(":"), o = r.filter((a) => !(a.txid === i && a.vout === parseInt(s, 10)));
    await this.storage.setItem(Dr(t), JSON.stringify(o.map(Ic)));
  }
  async clearVtxos(t) {
    await this.storage.removeItem(Dr(t));
  }
  async getUtxos(t) {
    const n = await this.storage.getItem(Vr(t));
    if (!n)
      return [];
    try {
      return JSON.parse(n).map(by);
    } catch (r) {
      return console.error(`Failed to parse UTXOs for address ${t}:`, r), [];
    }
  }
  async saveUtxos(t, n) {
    const r = await this.getUtxos(t);
    n.forEach((i) => {
      const s = r.findIndex((o) => o.txid === i.txid && o.vout === i.vout);
      s !== -1 ? r[s] = i : r.push(i);
    }), await this.storage.setItem(Vr(t), JSON.stringify(r.map(Oc)));
  }
  async removeUtxo(t, n) {
    const r = await this.getUtxos(t), [i, s] = n.split(":"), o = r.filter((a) => !(a.txid === i && a.vout === parseInt(s, 10)));
    await this.storage.setItem(Vr(t), JSON.stringify(o.map(Oc)));
  }
  async clearUtxos(t) {
    await this.storage.removeItem(Vr(t));
  }
  async getTransactionHistory(t) {
    const n = vs(t), r = await this.storage.getItem(n);
    if (!r)
      return [];
    try {
      return JSON.parse(r);
    } catch (i) {
      return console.error(`Failed to parse transactions for address ${t}:`, i), [];
    }
  }
  async saveTransactions(t, n) {
    const r = await this.getTransactionHistory(t);
    for (const i of n) {
      const s = r.findIndex((o) => o.key === i.key);
      s !== -1 ? r[s] = i : r.push(i);
    }
    await this.storage.setItem(vs(t), JSON.stringify(r));
  }
  async clearTransactions(t) {
    await this.storage.removeItem(vs(t));
  }
  async getWalletState() {
    const t = await this.storage.getItem(Ac);
    if (!t)
      return null;
    try {
      return JSON.parse(t);
    } catch (n) {
      return console.error("Failed to parse wallet state:", n), null;
    }
  }
  async saveWalletState(t) {
    await this.storage.setItem(Ac, JSON.stringify(t));
  }
}
const ks = (e, t) => `contract:${e}:${t}`, As = (e) => `collection:${e}`;
class Ey {
  constructor(t) {
    this.storage = t;
  }
  async getContractData(t, n) {
    const r = await this.storage.getItem(ks(t, n));
    if (!r)
      return null;
    try {
      return JSON.parse(r);
    } catch (i) {
      return console.error(`Failed to parse contract data for ${t}:${n}:`, i), null;
    }
  }
  async setContractData(t, n, r) {
    try {
      await this.storage.setItem(ks(t, n), JSON.stringify(r));
    } catch (i) {
      throw console.error(`Failed to persist contract data for ${t}:${n}:`, i), i;
    }
  }
  async deleteContractData(t, n) {
    try {
      await this.storage.removeItem(ks(t, n));
    } catch (r) {
      throw console.error(`Failed to remove contract data for ${t}:${n}:`, r), r;
    }
  }
  async getContractCollection(t) {
    const n = await this.storage.getItem(As(t));
    if (!n)
      return [];
    try {
      return JSON.parse(n);
    } catch (r) {
      return console.error(`Failed to parse contract collection ${t}:`, r), [];
    }
  }
  async saveToContractCollection(t, n, r) {
    const i = await this.getContractCollection(t), s = n[r];
    if (s == null)
      throw new Error(`Item is missing required field '${String(r)}'`);
    const o = i.findIndex((c) => c[r] === s);
    let a;
    o !== -1 ? a = [
      ...i.slice(0, o),
      n,
      ...i.slice(o + 1)
    ] : a = [...i, n];
    try {
      await this.storage.setItem(As(t), JSON.stringify(a));
    } catch (c) {
      throw console.error(`Failed to persist contract collection ${t}:`, c), c;
    }
  }
  async removeFromContractCollection(t, n, r) {
    if (n == null)
      throw new Error(`Invalid id provided for removal: ${String(n)}`);
    const s = (await this.getContractCollection(t)).filter((o) => o[r] !== n);
    try {
      await this.storage.setItem(As(t), JSON.stringify(s));
    } catch (o) {
      throw console.error(`Failed to persist contract collection removal for ${t}:`, o), o;
    }
  }
  async clearContractData() {
    await this.storage.clear();
  }
}
const xy = 546;
function Fe(e, t) {
  return {
    ...t,
    forfeitTapLeafScript: e.offchainTapscript.forfeit(),
    intentTapLeafScript: e.offchainTapscript.forfeit(),
    tapTree: e.offchainTapscript.encode()
  };
}
function wo(e, t) {
  return {
    ...t,
    forfeitTapLeafScript: e.boardingTapscript.forfeit(),
    intentTapLeafScript: e.boardingTapscript.forfeit(),
    tapTree: e.boardingTapscript.encode()
  };
}
class ot extends Error {
  #t;
  constructor(t, n, r) {
    super(t, { cause: r }), this.name = "ParseError", this.#t = n, n?.input && (this.message = Fn(this.message, n));
  }
  get node() {
    return this.#t;
  }
  withAst(t) {
    return this.#t || !t?.input ? this : (this.#t = t, this.message = Fn(this.message, t), this);
  }
}
class j extends Error {
  #t;
  constructor(t, n, r) {
    super(t, { cause: r }), this.name = "EvaluationError", this.#t = n, n?.input && (this.message = Fn(this.message, n));
  }
  get node() {
    return this.#t;
  }
  withAst(t) {
    return this.#t || !t?.input ? this : (this.#t = t, this.message = Fn(this.message, t), this);
  }
}
let Ty = class extends Error {
  #t;
  constructor(t, n, r) {
    super(t, { cause: r }), this.name = "TypeError", this.#t = n, n?.input && (this.message = Fn(this.message, n));
  }
  get node() {
    return this.#t;
  }
  withAst(t) {
    return this.#t || !t?.input ? this : (this.#t = t, this.message = Fn(this.message, t), this);
  }
};
function Fn(e, t) {
  if (t?.pos === void 0) return e;
  const n = t.pos, r = t.input;
  let i = 1, s = 0, o = 0;
  for (; s < n; )
    r[s] === `
` ? (i++, o = 0) : o++, s++;
  let a = n, c = n;
  for (; a > 0 && r[a - 1] !== `
`; ) a--;
  for (; c < r.length && r[c] !== `
`; ) c++;
  const u = r.slice(a, c), l = `> ${`${i}`.padStart(4, " ")} | ${u}
${" ".repeat(9 + o)}^`;
  return `${e}

${l}`;
}
class le {
  #t;
  constructor(t) {
    this.#t = t;
  }
  static of(t) {
    return t === void 0 ? Ri : new le(t);
  }
  static none() {
    return Ri;
  }
  hasValue() {
    return this.#t !== void 0;
  }
  value() {
    if (this.#t === void 0) throw new j("Optional value is not present");
    return this.#t;
  }
  or(t) {
    if (this.#t !== void 0) return this;
    if (t instanceof le) return t;
    throw new j("Optional.or must be called with an Optional argument");
  }
  orValue(t) {
    return this.#t === void 0 ? t : this.#t;
  }
  get [Symbol.toStringTag]() {
    return "optional";
  }
  [Symbol.for("nodejs.util.inspect.custom")]() {
    return this.#t === void 0 ? "Optional { none }" : `Optional { value: ${JSON.stringify(this.#t)} }`;
  }
}
const Ri = Object.freeze(new le());
class $f {
}
const Nf = new $f();
function Sy(e, t) {
  e.constants.set("optional", t ? Nf : void 0);
}
function vy(e) {
  const t = (d, p) => e.registerFunctionOverload(d, p), n = e.enableOptionalTypes ? Nf : void 0;
  e.registerType("OptionalNamespace", $f), e.registerConstant("optional", "OptionalNamespace", n), t("optional.hasValue(): bool", (d) => d.hasValue()), t("optional<A>.value(): A", (d) => d.value()), e.registerFunctionOverload("OptionalNamespace.none(): optional<T>", () => le.none()), t("OptionalNamespace.of(A): optional<A>", (d, p) => le.of(p));
  function r(d, p, g) {
    if (d instanceof le) return d;
    throw new j(`${g} must be optional`, p);
  }
  function i(d, p, g) {
    const f = d.eval(p.receiver, g);
    return f instanceof Promise ? f.then((h) => s(h, d, p, g)) : s(f, d, p, g);
  }
  function s(d, p, g, f) {
    const h = r(d, g.receiver, `${g.functionDesc} receiver`);
    return h.hasValue() ? g.onHasValue(h) : g.onEmpty(p, g, f);
  }
  function o(d, p, g, f) {
    const h = d.check(p, g);
    if (h.kind === "optional") return h;
    if (h.kind === "dyn") return d.getType("optional");
    throw new d.Error(`${f} must be optional, got '${h}'`, p);
  }
  function a({ functionDesc: d, evaluate: p, typeCheck: g, onHasValue: f, onEmpty: h }) {
    return ({ args: w, receiver: E }) => ({
      functionDesc: d,
      receiver: E,
      arg: w[0],
      evaluate: p,
      typeCheck: g,
      onHasValue: f,
      onEmpty: h
    });
  }
  const c = "optional.orValue() receiver", u = "optional.or(optional) receiver", l = "optional.or(optional) argument";
  e.registerFunctionOverload(
    "optional.or(ast): optional<dyn>",
    a({
      functionDesc: "optional.or(optional)",
      evaluate: i,
      typeCheck(d, p, g) {
        const f = o(d, p.receiver, g, u), h = o(d, p.arg, g, l), w = f.unify(d.registry, h);
        if (w) return w;
        throw new d.Error(
          `${p.functionDesc} argument must be compatible type, got '${f}' and '${h}'`,
          p.arg
        );
      },
      onHasValue: (d) => d,
      onEmpty(d, p, g) {
        const f = p.arg, h = d.eval(f, g);
        return h instanceof Promise ? h.then((w) => r(w, f, l)) : r(h, f, l);
      }
    })
  ), e.registerFunctionOverload(
    "optional.orValue(ast): dyn",
    a({
      functionDesc: "optional.orValue(value)",
      onHasValue: (d) => d.value(),
      onEmpty(d, p, g) {
        return d.eval(p.arg, g);
      },
      evaluate: i,
      typeCheck(d, p, g) {
        const f = o(d, p.receiver, g, c).valueType, h = d.check(p.arg, g), w = f.unify(d.registry, h);
        if (w) return w;
        throw new d.Error(
          `${p.functionDesc} argument must be compatible type, got '${f}' and '${h}'`,
          p.arg
        );
      }
    })
  );
}
const mo = Object.hasOwn, fe = Object.keys, Je = Object.freeze, ky = Object.entries, Qr = Array.isArray, Bc = Array.from, Ui = /* @__PURE__ */ new Set([
  "as",
  "break",
  "const",
  "continue",
  "else",
  "for",
  "function",
  "if",
  "import",
  "let",
  "loop",
  "package",
  "namespace",
  "return",
  "var",
  "void",
  "while",
  "__proto__",
  "prototype"
]);
class sn {
  #t;
  constructor(t) {
    this.verify(BigInt(t));
  }
  get value() {
    return this.#t;
  }
  valueOf() {
    return this.#t;
  }
  verify(t) {
    if (t < 0n || t > 18446744073709551615n) throw new j("Unsigned integer overflow");
    this.#t = t;
  }
  get [Symbol.toStringTag]() {
    return `value = ${this.#t}`;
  }
  [Symbol.for("nodejs.util.inspect.custom")]() {
    return `UnsignedInteger { value: ${this.#t} }`;
  }
}
const Ay = {
  h: 3600000000000n,
  m: 60000000000n,
  s: 1000000000n,
  ms: 1000000n,
  us: 1000n,
  µs: 1000n,
  ns: 1n
};
class Ke {
  #t;
  #e;
  constructor(t, n = 0) {
    this.#t = BigInt(t), this.#e = n;
  }
  get seconds() {
    return this.#t;
  }
  get nanos() {
    return this.#e;
  }
  valueOf() {
    return Number(this.#t) * 1e3 + this.#e / 1e6;
  }
  static fromMilliseconds(t) {
    const n = BigInt(Math.trunc(t * 1e6)), r = n / 1000000000n, i = Number(n % 1000000000n);
    return new Ke(r, i);
  }
  addDuration(t) {
    const n = this.#e + t.nanos;
    return new Ke(
      this.#t + t.seconds + BigInt(Math.floor(n / 1e9)),
      n % 1e9
    );
  }
  subtractDuration(t) {
    const n = this.#e - t.nanos;
    return new Ke(
      this.#t - t.seconds + BigInt(Math.floor(n / 1e9)),
      (n + 1e9) % 1e9
    );
  }
  extendTimestamp(t) {
    return new Date(
      t.getTime() + Number(this.#t) * 1e3 + Math.floor(this.#e / 1e6)
    );
  }
  subtractTimestamp(t) {
    return new Date(
      t.getTime() - Number(this.#t) * 1e3 - Math.floor(this.#e / 1e6)
    );
  }
  toString() {
    const t = this.#e ? (this.#e / 1e9).toLocaleString("en-US", { useGrouping: !1, maximumFractionDigits: 9 }).slice(1) : "";
    return `${this.#t}${t}s`;
  }
  getHours() {
    return this.#t / 3600n;
  }
  getMinutes() {
    return this.#t / 60n;
  }
  getSeconds() {
    return this.#t;
  }
  getMilliseconds() {
    return this.#t * 1000n + BigInt(Math.floor(this.#e / 1e6));
  }
  get [Symbol.toStringTag]() {
    return "google.protobuf.Duration";
  }
  [Symbol.for("nodejs.util.inspect.custom")]() {
    return `google.protobuf.Duration { seconds: ${this.#t}, nanos: ${this.#e} }`;
  }
}
function Iy(e) {
  const t = (f, h) => e.registerFunctionOverload(f, h), n = (f) => f;
  t("dyn(dyn): dyn", n);
  for (const f in jt) {
    const h = jt[f];
    h instanceof Bt && t(`type(${h.name}): type`, () => h);
  }
  t("bool(bool): bool", n), t("bool(string): bool", (f) => {
    switch (f) {
      case "1":
      case "t":
      case "true":
      case "TRUE":
      case "True":
        return !0;
      case "0":
      case "f":
      case "false":
      case "FALSE":
      case "False":
        return !1;
      default:
        throw new j(`bool() conversion error: invalid string value "${f}"`);
    }
  }), t("size(string): int", (f) => BigInt($c(f))), t("size(bytes): int", (f) => BigInt(f.length)), t("size(list): int", (f) => BigInt(f.length ?? f.size)), t("size(map): int", (f) => BigInt(f instanceof Map ? f.size : fe(f).length)), t("string.size(): int", (f) => BigInt($c(f))), t("bytes.size(): int", (f) => BigInt(f.length)), t("list.size(): int", (f) => BigInt(f.length ?? f.size)), t("map.size(): int", (f) => BigInt(f instanceof Map ? f.size : fe(f).length)), t("bytes(string): bytes", (f) => s.fromString(f)), t("bytes(bytes): bytes", n), t("double(double): double", n), t("double(int): double", (f) => Number(f)), t("double(uint): double", (f) => Number(f)), t("double(string): double", (f) => {
    if (!f || f !== f.trim())
      throw new j("double() type error: cannot convert to double");
    switch (f.toLowerCase()) {
      case "inf":
      case "+inf":
      case "infinity":
      case "+infinity":
        return Number.POSITIVE_INFINITY;
      case "-inf":
      case "-infinity":
        return Number.NEGATIVE_INFINITY;
      case "nan":
        return Number.NaN;
      default: {
        const w = Number(f);
        if (!Number.isNaN(w)) return w;
        throw new j("double() type error: cannot convert to double");
      }
    }
  }), t("int(int): int", n), t("int(double): int", (f) => {
    if (Number.isFinite(f)) return BigInt(Math.trunc(f));
    throw new j("int() type error: integer overflow");
  }), t("int(string): int", (f) => {
    if (f !== f.trim() || f.length > 20 || f.includes("0x"))
      throw new j("int() type error: cannot convert to int");
    try {
      const h = BigInt(f);
      if (h <= 9223372036854775807n && h >= -9223372036854775808n) return h;
    } catch {
    }
    throw new j("int() type error: cannot convert to int");
  }), t("uint(uint): uint", n), t("uint(int): uint", (f) => {
    if (f >= 0n && f <= 18446744073709551615n) return f;
    throw new j("uint() type error: cannot convert to uint");
  }), t("uint(double): uint", (f) => {
    if (f >= 0 && Number.isFinite(f)) return BigInt(Math.trunc(f));
    throw new j("uint() type error: unsigned integer overflow");
  }), t("uint(string): uint", (f) => {
    if (f !== f.trim() || f.length > 20 || f.includes("0x"))
      throw new j("uint() type error: cannot convert to uint");
    try {
      const h = BigInt(f);
      if (h <= 18446744073709551615n && h >= 0n) return h;
    } catch {
    }
    throw new j("uint() type error: cannot convert to uint");
  }), t("string(string): string", n), t("string(bool): string", (f) => `${f}`), t("string(int): string", (f) => `${f}`), t("string(bytes): string", (f) => s.toUtf8(f)), t("string(double): string", (f) => f === 1 / 0 ? "+Inf" : f === -1 / 0 ? "-Inf" : `${f}`), t("string.startsWith(string): bool", (f, h) => f.startsWith(h)), t("string.endsWith(string): bool", (f, h) => f.endsWith(h)), t("string.contains(string): bool", (f, h) => f.includes(h)), t("string.lowerAscii(): string", (f) => f.toLowerCase()), t("string.upperAscii(): string", (f) => f.toUpperCase()), t("string.trim(): string", (f) => f.trim()), t(
    "string.indexOf(string): int",
    (f, h) => BigInt(f.indexOf(h))
  ), t("string.indexOf(string, int): int", (f, h, w) => {
    if (h === "") return w;
    if (w = Number(w), w < 0 || w >= f.length)
      throw new j("string.indexOf(search, fromIndex): fromIndex out of range");
    return BigInt(f.indexOf(h, w));
  }), t(
    "string.lastIndexOf(string): int",
    (f, h) => BigInt(f.lastIndexOf(h))
  ), t("string.lastIndexOf(string, int): int", (f, h, w) => {
    if (h === "") return w;
    if (w = Number(w), w < 0 || w >= f.length)
      throw new j("string.lastIndexOf(search, fromIndex): fromIndex out of range");
    return BigInt(f.lastIndexOf(h, w));
  }), t("string.substring(int): string", (f, h) => {
    if (h = Number(h), h < 0 || h > f.length)
      throw new j("string.substring(start, end): start index out of range");
    return f.substring(h);
  }), t("string.substring(int, int): string", (f, h, w) => {
    if (h = Number(h), h < 0 || h > f.length)
      throw new j("string.substring(start, end): start index out of range");
    if (w = Number(w), w < h || w > f.length)
      throw new j("string.substring(start, end): end index out of range");
    return f.substring(h, w);
  }), t("string.matches(string): bool", (f, h) => {
    try {
      return new RegExp(h).test(f);
    } catch {
      throw new j(`Invalid regular expression: ${h}`);
    }
  }), t("string.split(string): list<string>", (f, h) => f.split(h)), t("string.split(string, int): list<string>", (f, h, w) => {
    if (w = Number(w), w === 0) return [];
    const E = f.split(h);
    if (w < 0 || E.length <= w) return E;
    const S = E.slice(0, w - 1);
    return S.push(E.slice(w - 1).join(h)), S;
  }), t("list<string>.join(): string", (f) => {
    for (let h = 0; h < f.length; h++)
      if (typeof f[h] != "string")
        throw new j("string.join(): list must contain only strings");
    return f.join("");
  }), t("list<string>.join(string): string", (f, h) => {
    for (let w = 0; w < f.length; w++)
      if (typeof f[w] != "string")
        throw new j("string.join(separator): list must contain only strings");
    return f.join(h);
  });
  const r = new TextEncoder("utf8"), i = new TextDecoder("utf8"), s = typeof Buffer < "u" ? {
    byteLength: (f) => Buffer.byteLength(f),
    fromString: (f) => Buffer.from(f, "utf8"),
    toHex: (f) => Buffer.prototype.hexSlice.call(f, 0, f.length),
    toBase64: (f) => Buffer.prototype.base64Slice.call(f, 0, f.length),
    toUtf8: (f) => Buffer.prototype.utf8Slice.call(f, 0, f.length),
    jsonParse: (f) => JSON.parse(f)
  } : {
    textEncoder: new TextEncoder("utf8"),
    byteLength: (f) => r.encode(f).length,
    fromString: (f) => r.encode(f),
    toHex: Uint8Array.prototype.toHex ? (f) => f.toHex() : (f) => Bc(f, (h) => h.toString(16).padStart(2, "0")).join(""),
    toBase64: Uint8Array.prototype.toBase64 ? (f) => f.toBase64() : (f) => btoa(Bc(f, (h) => String.fromCodePoint(h)).join("")),
    toUtf8: (f) => i.decode(f),
    jsonParse: (f) => JSON.parse(r.decode(f))
  };
  t("bytes.json(): map", s.jsonParse), t("bytes.hex(): string", s.toHex), t("bytes.string(): string", s.toUtf8), t("bytes.base64(): string", s.toBase64), t("bytes.at(int): int", (f, h) => {
    if (h < 0 || h >= f.length) throw new j("Bytes index out of range");
    return BigInt(f[h]);
  });
  const o = "google.protobuf.Timestamp", a = "google.protobuf.Duration", c = e.registerType(o, Date).getObjectType(o).typeType, u = e.registerType(a, Ke).getObjectType(a).typeType;
  e.registerConstant("google", "map<string, map<string, type>>", {
    protobuf: { Duration: u, Timestamp: c }
  });
  function l(f, h) {
    return new Date(f.toLocaleString("en-US", { timeZone: h }));
  }
  function d(f, h) {
    const w = h ? l(f, h) : new Date(f.getUTCFullYear(), f.getUTCMonth(), f.getUTCDate()), E = new Date(w.getFullYear(), 0, 0);
    return BigInt(Math.floor((w - E) / 864e5) - 1);
  }
  t(`timestamp(string): ${o}`, (f) => {
    if (f.length < 20 || f.length > 30)
      throw new j("timestamp() requires a string in ISO 8601 format");
    const h = new Date(f);
    if (h <= 253402300799999 && h >= -621355968e5) return h;
    throw new j("timestamp() requires a string in ISO 8601 format");
  }), t(`timestamp(int): ${o}`, (f) => {
    if (f = Number(f) * 1e3, f <= 253402300799999 && f >= -621355968e5) return new Date(f);
    throw new j("timestamp() requires a valid integer unix timestamp");
  }), t(`${o}.getDate(): int`, (f) => BigInt(f.getUTCDate())), t(`${o}.getDate(string): int`, (f, h) => BigInt(l(f, h).getDate())), t(`${o}.getDayOfMonth(): int`, (f) => BigInt(f.getUTCDate() - 1)), t(
    `${o}.getDayOfMonth(string): int`,
    (f, h) => BigInt(l(f, h).getDate() - 1)
  ), t(`${o}.getDayOfWeek(): int`, (f) => BigInt(f.getUTCDay())), t(`${o}.getDayOfWeek(string): int`, (f, h) => BigInt(l(f, h).getDay())), t(`${o}.getDayOfYear(): int`, d), t(`${o}.getDayOfYear(string): int`, d), t(`${o}.getFullYear(): int`, (f) => BigInt(f.getUTCFullYear())), t(`${o}.getFullYear(string): int`, (f, h) => BigInt(l(f, h).getFullYear())), t(`${o}.getHours(): int`, (f) => BigInt(f.getUTCHours())), t(`${o}.getHours(string): int`, (f, h) => BigInt(l(f, h).getHours())), t(`${o}.getMilliseconds(): int`, (f) => BigInt(f.getUTCMilliseconds())), t(`${o}.getMilliseconds(string): int`, (f) => BigInt(f.getUTCMilliseconds())), t(`${o}.getMinutes(): int`, (f) => BigInt(f.getUTCMinutes())), t(`${o}.getMinutes(string): int`, (f, h) => BigInt(l(f, h).getMinutes())), t(`${o}.getMonth(): int`, (f) => BigInt(f.getUTCMonth())), t(`${o}.getMonth(string): int`, (f, h) => BigInt(l(f, h).getMonth())), t(`${o}.getSeconds(): int`, (f) => BigInt(f.getUTCSeconds())), t(`${o}.getSeconds(string): int`, (f, h) => BigInt(l(f, h).getSeconds()));
  const p = /(\d*\.?\d*)(ns|us|µs|ms|s|m|h)/;
  function g(f) {
    if (!f) throw new j("Invalid duration string: ''");
    const h = f[0] === "-";
    (f[0] === "-" || f[0] === "+") && (f = f.slice(1));
    let w = BigInt(0);
    for (; ; ) {
      const O = p.exec(f);
      if (!O) throw new j(`Invalid duration string: ${f}`);
      if (O.index !== 0) throw new j(`Invalid duration string: ${f}`);
      f = f.slice(O[0].length);
      const R = Ay[O[2]], [L = "0", P = ""] = O[1].split("."), m = BigInt(L) * R, Q = P ? BigInt(P.slice(0, 13).padEnd(13, "0")) * R / 10000000000000n : 0n;
      if (w += m + Q, f === "") break;
    }
    const E = w >= 1000000000n ? w / 1000000000n : 0n, S = Number(w % 1000000000n);
    return h ? new Ke(-E, -S) : new Ke(E, S);
  }
  t("duration(string): google.protobuf.Duration", (f) => g(f)), t("google.protobuf.Duration.getHours(): int", (f) => f.getHours()), t("google.protobuf.Duration.getMinutes(): int", (f) => f.getMinutes()), t("google.protobuf.Duration.getSeconds(): int", (f) => f.getSeconds()), t("google.protobuf.Duration.getMilliseconds(): int", (f) => f.getMilliseconds()), vy(e);
}
function $c(e) {
  let t = 0;
  for (const n of e) t++;
  return t;
}
class Bt {
  #t;
  constructor(t) {
    this.#t = t, Je(this);
  }
  get name() {
    return this.#t;
  }
  get [Symbol.toStringTag]() {
    return `Type<${this.#t}>`;
  }
  toString() {
    return `Type<${this.#t}>`;
  }
}
const jt = {
  string: new Bt("string"),
  bool: new Bt("bool"),
  int: new Bt("int"),
  uint: new Bt("uint"),
  double: new Bt("double"),
  map: new Bt("map"),
  list: new Bt("list"),
  bytes: new Bt("bytes"),
  null_type: new Bt("null"),
  type: new Bt("type")
}, Oy = new Bt("optional");
class ts {
  #t = null;
  #e = null;
  constructor(t) {
    t instanceof ts ? (this.#t = t, this.#e = /* @__PURE__ */ new Map()) : this.#e = new Map(t);
  }
  fork(t = !0) {
    return t && (this.set = this.#n), new this.constructor(this);
  }
  #n() {
    throw new Error("Cannot modify frozen registry");
  }
  set(t, n) {
    return this.#e.set(t, n), this;
  }
  has(t) {
    return this.#e.has(t) || (this.#t ? this.#t.has(t) : !1);
  }
  get(t) {
    return this.#e.get(t) || this.#t?.get(t);
  }
  *#r() {
    this.#t && (yield* this.#t), yield* this.#e;
  }
  [Symbol.iterator]() {
    return this.#r();
  }
  get size() {
    return this.#e.size + (this.#t ? this.#t.size : 0);
  }
}
class By extends ts {
  get(t) {
    return super.get(t) ?? (Ui.has(t) ? void 0 : te);
  }
}
function Ce(e, t = ts, n = !0) {
  return e instanceof t ? e.fork(n) : new t(e);
}
class tn {
  #t = /* @__PURE__ */ new WeakMap();
  #e = null;
  #n = null;
  constructor({ kind: t, type: n, name: r, keyType: i, valueType: s, values: o }) {
    this.kind = t, this.type = n, this.name = r, i && (this.keyType = i), s && (this.valueType = s), o && (this.values = o), this.unwrappedType = t === "dyn" && s ? s.unwrappedType : this, this.wrappedType = t === "dyn" ? this : Rf(this.unwrappedType), t === "list" ? this.fieldLazy = this.#a : t === "map" ? this.fieldLazy = this.#o : t === "message" ? this.fieldLazy = this.#i : t === "optional" && (this.fieldLazy = this.#r), this.#e = this.kind === "dyn" || this.valueType?.hasDyn() || this.keyType?.hasDyn() || !1, this.#n = this.kind === "param" || this.keyType?.hasPlaceholder() || this.valueType?.hasPlaceholder() || !1, Je(this);
  }
  hasDyn() {
    return this.#e;
  }
  hasNoDynTypes() {
    return this.#e === !1;
  }
  isDynOrBool() {
    return this.type === "bool" || this.kind === "dyn";
  }
  isEmpty() {
    return this.valueType && this.valueType.kind === "param";
  }
  hasPlaceholder() {
    return this.#n;
  }
  unify(t, n) {
    const r = this;
    if (r === n || r.kind === "dyn" || n.kind === "param") return r;
    if (n.kind === "dyn" || r.kind === "param") return n;
    if (r.kind !== n.kind || !(r.hasPlaceholder() || n.hasPlaceholder() || r.hasDyn() || n.hasDyn())) return null;
    const i = r.valueType.unify(t, n.valueType);
    if (!i) return null;
    switch (r.kind) {
      case "optional":
        return t.getOptionalType(i);
      case "list":
        return t.getListType(i);
      case "map":
        const s = r.keyType.unify(t, n.keyType);
        return s ? t.getMapType(s, i) : null;
    }
  }
  templated(t, n) {
    if (!this.hasPlaceholder()) return this;
    switch (this.kind) {
      case "dyn":
        return this.valueType.templated(t, n);
      case "param":
        return n?.get(this.name) || this;
      case "map":
        return t.getMapType(this.keyType.templated(t, n), this.valueType.templated(t, n));
      case "list":
        return t.getListType(this.valueType.templated(t, n));
      case "optional":
        return t.getOptionalType(this.valueType.templated(t, n));
      default:
        return this;
    }
  }
  toString() {
    return this.name;
  }
  #r(t, n, r, i) {
    if (t = t instanceof le ? t.orValue() : t, t === void 0) return Ri;
    const s = i.debugType(t);
    try {
      return le.of(s.fieldLazy(t, n, r, i));
    } catch (o) {
      if (o instanceof j) return Ri;
      throw o;
    }
  }
  #i(t, n, r, i) {
    const s = i.objectTypesByConstructor.get(t.constructor);
    if (!s || !(t instanceof s.ctor)) return;
    if (!s.fields) return mo(t, n) ? t[n] : void 0;
    const o = s.fields[n];
    if (!o) return;
    const a = t[n], c = i.debugType(a);
    switch (o) {
      case tt.dyn:
      case c:
        return a;
      default:
        if (o.matches(c)) return a;
    }
    throw new j(`Field '${n}' is not of type '${o}', got '${c}'`, r);
  }
  #o(t, n, r, i) {
    let s;
    if (t instanceof Map ? s = t.get(n) : s = mo(t, n) ? t[n] : void 0, s === void 0) return;
    const o = this.valueType, a = i.debugType(s);
    if (o.matches(a)) return s;
    throw new j(`Field '${n}' is not of type '${o}', got '${a}'`, r);
  }
  #a(t, n, r, i) {
    if (!(typeof n == "number" || typeof n == "bigint")) return;
    const s = t[n];
    if (s === void 0)
      throw new j(
        `No such key: index out of bounds, index ${n} ${n < 0 ? "< 0" : `>= size ${t.length}`}`,
        r
      );
    const o = i.debugType(s);
    if (this.valueType.matches(o)) return s;
    throw new j(
      `List item with index '${n}' is not of type '${this.valueType}', got '${o}'`,
      r
    );
  }
  fieldLazy() {
  }
  field(t, n, r, i) {
    const s = this.fieldLazy(t, n, r, i);
    if (s !== void 0) return s;
    throw new j(`No such key: ${n}`, r);
  }
  matchesBoth(t) {
    return this.matches(t) && t.matches(this);
  }
  matches(t) {
    const n = this.unwrappedType;
    return t = t.unwrappedType, n === t || n.kind === "dyn" || t.kind === "dyn" || t.kind === "param" ? !0 : this.#t.get(t) ?? this.#t.set(t, this.#c(n, t)).get(t);
  }
  #c(t, n) {
    switch (t.kind) {
      case "dyn":
      case "param":
        return !0;
      case "list":
        return n.kind === "list" && t.valueType.matches(n.valueType);
      case "map":
        return n.kind === "map" && t.keyType.matches(n.keyType) && t.valueType.matches(n.valueType);
      case "optional":
        return n.kind === "optional" && t.valueType.matches(n.valueType);
      default:
        return t.name === n.name;
    }
  }
}
const $y = "have a .callAst property or .evaluate(checker, macro, ctx) method.", Ny = "have a .callAst property or .typeCheck(checker, macro, ctx) method.";
function Ry(e, t) {
  const n = `Macro '${e}' must`;
  return function(i) {
    const s = t(i);
    if (!s || typeof s != "object") throw new Error(`${n} return an object.`);
    if (s.callAst) return s;
    if (!s.evaluate) throw new Error(`${n} ${$y}`);
    if (!s.typeCheck) throw new Error(`${n} ${Ny}`);
    return s;
  };
}
class Uy {
  #t;
  constructor({ name: t, receiverType: n, argTypes: r, returnType: i, handler: s }) {
    this.name = t, this.receiverType = n || null, this.argTypes = r, this.returnType = i, this.macro = r.includes(Jr);
    const o = n ? `${n}.` : "";
    this.signature = `${o}${t}(${r.join(", ")}): ${i}`, this.handler = this.macro ? Ry(this.signature, s) : s, this.#t = this.returnType.hasPlaceholder() || this.receiverType?.hasPlaceholder() || this.argTypes.some((a) => a.hasPlaceholder()) || !1, Je(this);
  }
  hasPlaceholder() {
    return this.#t;
  }
  matchesArgs(t) {
    return t.length === this.argTypes.length && this.argTypes.every((n, r) => n.matches(t[r])) ? this : null;
  }
}
class er {
  #t;
  constructor({ operator: t, leftType: n, rightType: r, handler: i, returnType: s }) {
    this.operator = t, this.leftType = n, this.rightType = r || null, this.handler = i, this.returnType = s, r ? this.signature = `${n} ${t} ${r}: ${s}` : this.signature = `${t}${n}: ${s}`, this.#t = this.leftType.hasPlaceholder() || this.rightType?.hasPlaceholder() || !1, Je(this);
  }
  hasPlaceholder() {
    return this.#t;
  }
  equals(t) {
    return this.operator === t.operator && this.leftType === t.leftType && this.rightType === t.rightType;
  }
}
function ua(e) {
  return new tn({
    kind: "list",
    name: `list<${e}>`,
    type: "list",
    valueType: e
  });
}
function be(e) {
  return new tn({ kind: "primitive", name: e, type: e });
}
function Ly(e) {
  return new tn({ kind: "message", name: e, type: e });
}
function Rf(e) {
  const t = e ? `dyn<${e}>` : "dyn";
  return new tn({ kind: "dyn", name: t, type: t, valueType: e });
}
function Uf(e) {
  const t = `optional<${e}>`;
  return new tn({ kind: "optional", name: t, type: "optional", valueType: e });
}
function la(e, t) {
  return new tn({
    kind: "map",
    name: `map<${e}, ${t}>`,
    type: "map",
    keyType: e,
    valueType: t
  });
}
function Cy(e) {
  return new tn({ kind: "param", name: e, type: e });
}
const te = Rf(), Jr = be("ast"), Nc = ua(te), Rc = la(te, te), tt = {
  string: be("string"),
  bool: be("bool"),
  int: be("int"),
  uint: be("uint"),
  double: be("double"),
  bytes: be("bytes"),
  dyn: te,
  null: be("null"),
  type: be("type"),
  optional: Uf(te),
  list: Nc,
  "list<dyn>": Nc,
  map: Rc,
  "map<dyn, dyn>": Rc
};
for (const e of [tt.string, tt.double, tt.int]) {
  const t = ua(e), n = la(tt.string, e);
  tt[t.name] = t, tt[n.name] = n;
}
Object.freeze(tt);
class Py {
  returnType = null;
  /** @type {Array<FunctionDeclaration>} */
  declarations = [];
  constructor(t) {
    this.registry = t;
  }
  add(t) {
    this.returnType = (this.returnType || t.returnType).unify(this.registry, t.returnType) || te, t.macro && (this.macro = t), this.declarations.push(t);
  }
  findMatch(t, n = null) {
    for (let r = 0; r < this.declarations.length; r++) {
      const i = this.#t(this.declarations[r], t, n);
      if (i) return i;
    }
    return null;
  }
  #t(t, n, r) {
    if (t.hasPlaceholder()) return this.#e(t, n, r);
    if (!(r && t.receiverType && !r.matches(t.receiverType)))
      return t.matchesArgs(n);
  }
  #e(t, n, r) {
    const i = /* @__PURE__ */ new Map();
    if (r && t.receiverType && !this.registry.matchTypeWithPlaceholders(t.receiverType, r, i))
      return null;
    for (let s = 0; s < n.length; s++)
      if (!this.registry.matchTypeWithPlaceholders(t.argTypes[s], n[s], i))
        return null;
    return {
      handler: t.handler,
      signature: t.signature,
      returnType: t.returnType.templated(this.registry, i)
    };
  }
}
function Uc(e) {
  const t = [];
  let n = "", r = 0;
  for (const i of e) {
    if (i === "<") r++;
    else if (i === ">") r--;
    else if (i === "," && r === 0) {
      t.push(n.trim()), n = "";
      continue;
    }
    n += i;
  }
  return n && t.push(n.trim()), t;
}
const Lf = [
  [void 0, "map", jt.map, tt.map],
  [Object, "map", jt.map, tt.map],
  [Map, "map", jt.map, tt.map],
  [Array, "list", jt.list, tt.list],
  [sn, "uint", jt.uint, tt.uint],
  [Bt, "type", jt.type, tt.type],
  [le, "optional", Oy, tt.optional],
  [Uint8Array, "bytes", jt.bytes, tt.bytes],
  ...typeof Buffer < "u" ? [[Buffer, "bytes", jt.bytes, tt.bytes]] : []
].map(([e, t, n, r]) => Object.freeze({ name: t, typeType: n, type: r, ctor: e })), _y = Lf.map((e) => [e.name, e]), Dy = Lf.map((e) => [e.ctor, e]);
class fa {
  #t = {};
  #e = {};
  #n;
  #r;
  #i;
  #o = /* @__PURE__ */ new Map();
  #a = /* @__PURE__ */ new Map();
  #c = /* @__PURE__ */ new Map();
  #f = /* @__PURE__ */ new Map();
  #h = /* @__PURE__ */ new Map();
  constructor(t = {}) {
    if (this.enableOptionalTypes = t.enableOptionalTypes ?? !1, this.objectTypes = Ce(t.objectTypes || _y), this.objectTypesByConstructor = Ce(t.objectTypesByConstructor || Dy), this.#i = Ce(t.functionDeclarations), this.#r = Ce(t.operatorDeclarations), this.#n = Ce(
      t.typeDeclarations || ky(tt),
      void 0,
      !1
    ), this.constants = Ce(t.constants), this.variables = t.unlistedVariablesAreDyn ? Ce(t.variables, By) : Ce(t.variables), this.variables.size)
      Sy(this, this.enableOptionalTypes);
    else
      for (const n in jt) this.registerConstant(n, "type", jt[n]);
  }
  #p() {
    this.#t = {}, this.#e = {};
  }
  registerVariable(t, n) {
    if (Ui.has(t)) throw new Error(`Cannot register reserved variable name: ${t}`);
    if (this.variables.has(t)) throw new Error(`Variable already registered: ${t}`);
    return this.variables.set(t, n instanceof tn ? n : this.getType(n)), this;
  }
  registerConstant(t, n, r) {
    return this.registerVariable(t, n), this.constants.set(t, r), this;
  }
  #g(t, n, r) {
    let i = t ? this.#a : this.#o;
    return i = i.get(n) || i.set(n, /* @__PURE__ */ new Map()).get(n), i.get(r) || i.set(r, new Py(this)).get(r);
  }
  getFunctionCandidates(t, n, r) {
    const i = (t ? this.#a : this.#o).get(n)?.get(r);
    if (i) return i;
    for (const [, s] of this.#i)
      this.#g(!!s.receiverType, s.name, s.argTypes.length).add(s);
    return this.#g(t, n, r);
  }
  getType(t) {
    return this.#s(t, !0);
  }
  getListType(t) {
    return this.#c.get(t) || this.#c.set(t, this.#s(`list<${t}>`, !0)).get(t);
  }
  getMapType(t, n) {
    return this.#f.get(t)?.get(n) || (this.#f.get(t) || this.#f.set(t, /* @__PURE__ */ new Map()).get(t)).set(n, this.#s(`map<${t}, ${n}>`, !0)).get(n);
  }
  getOptionalType(t) {
    return this.#h.get(t) || this.#h.set(t, this.#s(`optional<${t}>`, !0)).get(t);
  }
  assertType(t, n, r) {
    try {
      return this.#s(t, !0);
    } catch (i) {
      throw i.message = `Invalid ${n} '${i.unknownType || t}' in '${r}'`, i;
    }
  }
  getFunctionType(t) {
    return t === "ast" ? Jr : this.#s(t, !0);
  }
  registerType(t, n) {
    if (typeof t == "object" && (n = t, t = n.fullName || n.name || n.ctor?.name), typeof t == "string" && t[0] === "." && (t = t.slice(1)), typeof t != "string" || t.length < 2 || Ui.has(t))
      throw new Error(`Message type name invalid: ${t}`);
    if (this.objectTypes.has(t)) throw new Error(`Message type already registered: ${t}`);
    const r = this.#s(t, !1);
    if (r.kind !== "message") throw new Error(`Message type invalid: ${t}`);
    const i = typeof n == "function" ? n : n?.ctor;
    if (typeof i != "function") throw new Error(`Message type constructor invalid: '${t}'`);
    const s = Object.freeze({
      name: t,
      typeType: new Bt(t),
      type: r,
      ctor: i,
      fields: this.#v(t, n?.fields)
    });
    return this.objectTypes.set(t, s), this.objectTypesByConstructor.set(i, s), this.registerFunctionOverload(`type(${t}): type`, () => s.typeType), this;
  }
  getObjectType(t) {
    return this.objectTypes.get(t);
  }
  /** @returns {TypeDeclaration} */
  #s(t, n = !0) {
    let r = this.#n.get(t);
    if (r) return r;
    if (r = t.match(/^[A-Z]$/), r) return this.#u(Cy, t, t);
    if (r = t.match(/^(dyn|list|map|optional)<(.+)>$/), !r) {
      if (n) {
        const o = new Error(`Unknown type: ${t}`);
        throw o.unknownType = t, o;
      }
      return this.#u(Ly, t, t);
    }
    const i = r[1], s = r[2].trim();
    switch (i) {
      case "dyn": {
        const o = this.#s(s, n).wrappedType;
        return this.#n.set(o.name, o), o;
      }
      case "list": {
        const o = this.#s(s, n);
        return this.#u(ua, `list<${o}>`, o);
      }
      case "map": {
        const o = Uc(s);
        if (o.length !== 2) throw new Error(`Invalid map type: ${t}`);
        const a = this.#s(o[0], n), c = this.#s(o[1], n);
        return this.#u(la, `map<${a}, ${c}>`, a, c);
      }
      case "optional": {
        const o = this.#s(s, n);
        return this.#u(Uf, `optional<${o}>`, o);
      }
    }
  }
  #u(t, n, ...r) {
    return this.#n.get(n) || this.#n.set(n, t(...r)).get(n);
  }
  findMacro(t, n, r) {
    return this.getFunctionCandidates(n, t, r).macro || !1;
  }
  #y(t, n, r) {
    const i = [], s = n.unwrappedType, o = r.unwrappedType;
    for (const [, a] of this.#r) {
      if (a.operator !== t) continue;
      if (a.leftType === s && a.rightType === o) return [a];
      if (a.leftType === n && a.rightType === r) return [a];
      const c = this.#E(a, n, r);
      c && i.push(c);
    }
    return i.length === 0 && (t === "==" || t === "!=") && (n.kind === "dyn" || r.kind === "dyn") ? [{ handler: t === "==" ? (c, u) => c === u : (c, u) => c !== u, returnType: this.getType("bool") }] : i;
  }
  findUnaryOverload(t, n) {
    const r = this.#t[t]?.get(n);
    if (r !== void 0) return r;
    let i = !1;
    for (const [, s] of this.#r)
      if (!(s.operator !== t || s.leftType !== n)) {
        i = s;
        break;
      }
    return (this.#t[t] ??= /* @__PURE__ */ new Map()).set(n, i).get(n);
  }
  findBinaryOverload(t, n, r) {
    return this.#t[t]?.get(n)?.get(r) ?? this.#w(
      this.#t,
      t,
      n,
      r,
      this.#m(t, n, r)
    );
  }
  checkBinaryOverload(t, n, r) {
    return this.#e[t]?.get(n)?.get(r) ?? this.#w(
      this.#e,
      t,
      n,
      r,
      this.#b(t, n, r)
    );
  }
  #m(t, n, r) {
    const i = this.#y(t, n, r);
    if (i.length === 0) return !1;
    if (i.length === 1) return i[0];
    throw new Error(`Operator overload '${i[0].signature}' overlaps with '${i[1].signature}'.`);
  }
  #b(t, n, r) {
    const i = this.#y(t, n, r);
    if (i.length === 0) return !1;
    const s = i[0].returnType;
    return i.every((o) => o.returnType === s) ? s : (s.kind === "list" || s.kind === "map") && i.every((o) => o.returnType.kind === s.kind) ? s.kind === "list" ? tt.list : tt.map : tt.dyn;
  }
  #w(t, n, r, i, s) {
    const o = t[n] ??= /* @__PURE__ */ new Map();
    return (o.get(r) || o.set(r, /* @__PURE__ */ new Map()).get(r)).set(i, s), s;
  }
  #E(t, n, r) {
    const i = t.hasPlaceholder() ? /* @__PURE__ */ new Map() : null, s = this.matchTypeWithPlaceholders(t.leftType, n, i);
    if (!s) return;
    const o = this.matchTypeWithPlaceholders(t.rightType, r, i);
    if (o)
      return (t.operator === "==" || t.operator === "!=") && !s.matchesBoth(o) ? !1 : t.hasPlaceholder() ? {
        handler: t.handler,
        leftType: s,
        rightType: o,
        returnType: t.returnType.templated(this, i)
      } : t;
  }
  matchTypeWithPlaceholders(t, n, r) {
    if (!t.hasPlaceholder()) return n.matches(t) ? n : null;
    const i = n.kind === "dyn";
    return this.#l(t, n, r, i) && (i || n.matches(t.templated(this, r))) ? n : null;
  }
  #x(t, n, r) {
    const i = r.get(t);
    return i ? i.kind === "dyn" || n.kind === "dyn" ? !0 : i.matchesBoth(n) : r.set(t, n) && !0;
  }
  #l(t, n, r, i = !1) {
    if (!t.hasPlaceholder()) return !0;
    if (!n) return !1;
    const s = i || n.kind === "dyn";
    switch (n = n.unwrappedType, t.kind) {
      case "param": {
        const o = s ? tt.dyn : n;
        return this.#x(t.name, o, r);
      }
      case "list":
        return n.name === "dyn" && (n = t), n.kind !== "list" ? !1 : this.#l(
          t.valueType,
          n.valueType,
          r,
          s
        );
      case "map":
        return n.name === "dyn" && (n = t), n.kind !== "map" ? !1 : this.#l(
          t.keyType,
          n.keyType,
          r,
          s
        ) && this.#l(
          t.valueType,
          n.valueType,
          r,
          s
        );
      case "optional":
        return n.name === "dyn" && (n = t), n.kind !== "optional" ? !1 : this.#l(
          t.valueType,
          n.valueType,
          r,
          s
        );
    }
    return !0;
  }
  #T(t) {
    return typeof t == "string" ? { type: t } : t.id ? My(t) : t;
  }
  #S(t, n, r, i = !1) {
    try {
      const s = this.#T(n[r]);
      if (typeof s?.type != "string") throw new Error("unsupported declaration");
      return this.#s(s.type, i);
    } catch (s) {
      throw s.message = `Field '${r}' in type '${t}' has unsupported declaration: ${JSON.stringify(n[r])}`, s;
    }
  }
  #v(t, n) {
    if (!n) return;
    const r = /* @__PURE__ */ Object.create(null);
    for (const i of fe(n)) r[i] = this.#S(t, n, i);
    return r;
  }
  clone(t) {
    return new fa({
      objectTypes: this.objectTypes,
      objectTypesByConstructor: this.objectTypesByConstructor,
      typeDeclarations: this.#n,
      operatorDeclarations: this.#r,
      functionDeclarations: this.#i,
      variables: this.variables,
      constants: this.constants,
      unlistedVariablesAreDyn: t.unlistedVariablesAreDyn,
      enableOptionalTypes: t.enableOptionalTypes
    });
  }
  /** @param {string} signature */
  #k(t, n) {
    const r = t.match(/^(?:([a-zA-Z0-9.<>]+)\.)?(\w+)\((.*?)\):\s*(.+)$/);
    if (!r) throw new Error(`Invalid signature: ${t}`);
    const [, i, s, o, a] = r;
    try {
      return new Uy({
        name: s,
        receiverType: i ? this.getType(i) : null,
        returnType: this.getType(a.trim()),
        argTypes: Uc(o).map((c) => this.getFunctionType(c)),
        handler: n
      });
    } catch (c) {
      throw new Error(`Invalid function declaration: ${t}: ${c.message}`);
    }
  }
  /**
   * @param {FunctionDeclaration} a
   * @param {FunctionDeclaration} b
   */
  #A(t, n) {
    return t.name !== n.name || t.argTypes.length !== n.argTypes.length || (t.receiverType || n.receiverType) && (!t.receiverType || !n.receiverType) ? !1 : !(t.receiverType !== n.receiverType && t.receiverType !== te && n.receiverType !== te) && (n.macro || t.macro || n.argTypes.every((i, s) => {
      const o = t.argTypes[s];
      return i === o || i === Jr || o === Jr || i === te || o === te;
    }));
  }
  /** @param {FunctionDeclaration} newDec */
  #I(t) {
    for (const [, n] of this.#i)
      if (this.#A(n, t))
        throw new Error(
          `Function signature '${t.signature}' overlaps with existing overload '${n.signature}'.`
        );
  }
  registerFunctionOverload(t, n) {
    const r = typeof n == "function" ? n : n?.handler, i = this.#k(t, r);
    this.#I(i), this.#i.set(i.signature, i), this.#a.clear(), this.#o.clear();
  }
  registerOperatorOverload(t, n) {
    const r = t.match(/^([-!])([\w.<>]+)(?::\s*([\w.<>]+))?$/);
    if (r) {
      const [, u, l, d] = r;
      return this.unaryOverload(u, l, n, d);
    }
    const i = t.match(
      /^([\w.<>]+) ([-+*%/]|==|!=|<|<=|>|>=|in) ([\w.<>]+)(?::\s*([\w.<>]+))?$/
    );
    if (!i) throw new Error(`Operator overload invalid: ${t}`);
    const [, s, o, a, c] = i;
    return this.binaryOverload(s, o, a, n, c);
  }
  unaryOverload(t, n, r, i) {
    const s = this.assertType(n, "type", `${t}${n}`), o = this.assertType(
      i || n,
      "return type",
      `${t}${n}: ${i || n}`
    ), a = new er({ operator: `${t}_`, leftType: s, returnType: o, handler: r });
    if (this.#d(a))
      throw new Error(`Operator overload already registered: ${t}${n}`);
    this.#r.set(a.signature, a), this.#p();
  }
  #d(t) {
    for (const [, n] of this.#r) if (t.equals(n)) return !0;
    return !1;
  }
  binaryOverload(t, n, r, i, s) {
    s ??= Lc(n) ? "bool" : t;
    const o = `${t} ${n} ${r}: ${s}`, a = this.assertType(t, "left type", o), c = this.assertType(r, "right type", o), u = this.assertType(s, "return type", o);
    if (Lc(n) && u.type !== "bool")
      throw new Error(`Comparison operator '${n}' must return 'bool', got '${u.type}'`);
    const l = new er({ operator: n, leftType: a, rightType: c, returnType: u, handler: i });
    if (l.hasPlaceholder() && !(c.hasPlaceholder() && a.hasPlaceholder()))
      throw new Error(
        `Operator overload with placeholders must use them in both left and right types: ${o}`
      );
    if (this.#d(l))
      throw new Error(`Operator overload already registered: ${l.signature}`);
    if (n === "==") {
      const d = [
        new er({
          operator: "!=",
          leftType: a,
          rightType: c,
          handler(p, g, f, h) {
            return !i(p, g, f, h);
          },
          returnType: u
        })
      ];
      a !== c && d.push(
        new er({
          operator: "==",
          leftType: c,
          rightType: a,
          handler(p, g, f, h) {
            return i(g, p, f, h);
          },
          returnType: u
        }),
        new er({
          operator: "!=",
          leftType: c,
          rightType: a,
          handler(p, g, f, h) {
            return !i(g, p, f, h);
          },
          returnType: u
        })
      );
      for (const p of d)
        if (this.#d(p))
          throw new Error(`Operator overload already registered: ${p.signature}`);
      for (const p of d) this.#r.set(p.signature, p);
    }
    this.#r.set(l.signature, l), this.#p();
  }
}
function Lc(e) {
  return e === "<" || e === "<=" || e === ">" || e === ">=" || e === "==" || e === "!=" || e === "in";
}
function Vy(e) {
  return new fa(e);
}
class Cc {
  #t;
  #e;
  #n;
  constructor(t, n) {
    if (this.#t = t.variables, this.#e = t.constants, n != null) {
      if (typeof n != "object") throw new j("Context must be an object");
      this.#n = n, n instanceof Map ? this.getValue = this.#i : this.getValue = this.#r;
    }
  }
  #r(t) {
    const n = this.#n[t];
    return n !== void 0 ? n : this.#e.get(t);
  }
  #i(t) {
    const n = this.#n.get(t);
    return n !== void 0 ? n : this.#t.get(t);
  }
  getType(t) {
    return this.#t.get(t);
  }
  getValue(t) {
    return this.#e.get(t);
  }
  forkWithVariable(t, n) {
    return new Li(this, t, n);
  }
}
class Li {
  #t;
  accuType;
  accuValue;
  iterValue;
  constructor(t, n, r) {
    this.#t = t, this.iterVar = n, this.iterType = r;
  }
  forkWithVariable(t, n) {
    return new Li(this, t, n);
  }
  reuse(t) {
    if (!this.async) return (this.#t = t) && this;
    const n = new Li(t, this.iterVar, this.iterType);
    return n.accuType = this.accuType, n;
  }
  setIterValue(t) {
    return this.iterValue = t, this;
  }
  setAccuType(t) {
    return this.accuType = t, this;
  }
  setAccuValue(t) {
    return this.accuValue = t, this;
  }
  getValue(t) {
    return this.iterVar === t ? this.iterValue : this.#t.getValue(t);
  }
  getType(t) {
    return this.iterVar === t ? this.iterType : this.#t.getType(t);
  }
}
function My(e) {
  let t;
  if (e.map) {
    const n = Is(e.keyType, e.resolvedKeyType), r = Is(e.type, e.resolvedType);
    t = `map<${n}, ${r}>`;
  } else
    t = Is(e.type, e.resolvedType);
  return { type: e.repeated ? `list<${t}>` : t };
}
function Is(e, t) {
  switch (e) {
    case "string":
      return "string";
    case "bytes":
      return "bytes";
    case "bool":
      return "bool";
    // protobufjs uses JavaScript numbers for all numeric types
    case "double":
    case "float":
    case "int32":
    case "int64":
    case "sint32":
    case "sint64":
    case "sfixed32":
    case "sfixed64":
    case "uint32":
    case "uint64":
    case "fixed32":
    case "fixed64":
      return "double";
    default:
      switch (t?.constructor.name) {
        case "Type":
          return t.fullName.slice(1);
        case "Enum":
          return "int";
      }
      return e?.includes(".") ? e : "dyn";
  }
}
class Cf {
  dynType = tt.dyn;
  optionalType = tt.optional;
  stringType = tt.string;
  intType = tt.int;
  doubleType = tt.double;
  boolType = tt.bool;
  nullType = tt.null;
  listType = tt.list;
  mapType = tt.map;
  constructor(t) {
    this.opts = t.opts, this.objectTypes = t.objectTypes, this.objectTypesByConstructor = t.objectTypesByConstructor, this.registry = t.registry;
  }
  /**
   * Get a TypeDeclaration instance for a type name
   * @param {string} typeName - The type name (e.g., 'string', 'int', 'dyn')
   * @returns {TypeDeclaration} The type declaration instance
   */
  getType(t) {
    return this.registry.getType(t);
  }
  debugType(t) {
    switch (typeof t) {
      case "string":
        return this.stringType;
      case "bigint":
        return this.intType;
      case "number":
        return this.doubleType;
      case "boolean":
        return this.boolType;
      case "object":
        if (t === null) return this.nullType;
        switch (t.constructor) {
          case void 0:
          case Object:
          case Map:
            return this.mapType;
          case Array:
          case Set:
            return this.listType;
          default:
            return this.objectTypesByConstructor.get(t.constructor)?.type || Pc(this, t.constructor?.name || typeof t);
        }
      default:
        Pc(this, typeof t);
    }
  }
}
function Pc(e, t) {
  throw new e.Error(`Unsupported type: ${t}`);
}
function ti(e, t, n, r, i) {
  return n instanceof Promise ? r instanceof Promise ? Promise.all([n, r]).then((s) => i(e, t, s[0], s[1])) : n.then((s) => i(e, t, s, r)) : r.then((s) => i(e, t, n, s));
}
function _c(e, t, n) {
  const r = e.check(t.args[0], n);
  return t.op === "[]" && e.check(t.args[1], n), r.kind !== "optional" ? e.checkAccessOnType(t, n, r) : e.registry.getOptionalType(e.checkAccessOnType(t, n, r.valueType, !0));
}
function Dc(e, t, n) {
  const r = e.check(t.args[0], n);
  t.op === "[?]" && e.check(t.args[1], n);
  const i = r.kind === "optional" ? r.valueType : r;
  return e.registry.getOptionalType(e.checkAccessOnType(t, n, i, !0));
}
function Vc(e, t, n, r, i) {
  const s = e.check(r, t);
  if (s === n || n.isEmpty()) return s;
  if (s.isEmpty()) return n;
  let o;
  throw i === 0 ? o = "List elements must have the same type," : i === 1 ? o = "Map key uses wrong type," : i === 2 && (o = "Map value uses wrong type,"), new e.Error(
    `${o} expected type '${e.formatType(n)}' but found '${e.formatType(s)}'`,
    r
  );
}
function Mc(e, t, n, r) {
  return n.unify(e.registry, e.check(r, t)) || e.dynType;
}
function Hy(e, t, n) {
  const r = e.debugRuntimeType(t, n.checkedType);
  return new e.Error(`${n.meta.label || "Ternary condition must be bool"}, got '${r}'`, n);
}
function Hc(e, t, n, r) {
  if (r === !0) return e.eval(t.args[1], n);
  if (r === !1) return e.eval(t.args[2], n);
  throw Hy(e, r, t.args[0]);
}
function Fc(e, t, n) {
  if (t.staticHandler) return t.staticHandler.handler(n, t, e);
  const r = e.debugRuntimeType(n, t.args.checkedType), i = e.registry.findUnaryOverload(t.op, r);
  if (i) return i.handler(n);
  throw new e.Error(`no such overload: ${t.op[0]}${r}`, t);
}
function Kc(e, t, n) {
  const r = e.eval(t.args, n);
  return r instanceof Promise ? r.then((i) => Fc(e, t, i)) : Fc(e, t, r);
}
function zc(e, t, n, r) {
  if (t.staticHandler) return t.staticHandler.handler(n, r, t, e);
  const i = e.debugOperandType(n, t.args[0].checkedType), s = e.debugOperandType(r, t.args[1].checkedType), o = e.registry.findBinaryOverload(t.op, i, s);
  if (o) return o.handler(n, r, t, e);
  throw new e.Error(`no such overload: ${i} ${t.op} ${s}`, t);
}
function da(e, t, n) {
  const r = e.debugRuntimeType(t, n.checkedType);
  return new e.Error(`Logical operator requires bool operands, got '${r}'`, n);
}
function Pf(e, t, n) {
  return t instanceof Error ? t : da(e, t, n);
}
function bn(e, t, n, r, i) {
  if (i === e) return e;
  if (i === !e) {
    if (r === i) return i;
    throw Pf(t, r, n.args[0]);
  }
  if (i instanceof Promise) return i.then((s) => Fy(e, t, n, r, s));
  throw da(t, i, n.args[1]);
}
function Fy(e, t, n, r, i) {
  if (i === e) return e;
  if (typeof i != "boolean") throw da(t, i, n.args[1]);
  if (typeof r != "boolean") throw Pf(t, r, n.args[0]);
  return !e;
}
function jc(e, t, n) {
  const r = e.check(t.args[0], n), i = e.check(t.args[1], n);
  if (!r.isDynOrBool())
    throw new e.Error(
      `Logical operator requires bool operands, got '${e.formatType(r)}'`,
      t
    );
  if (!i.isDynOrBool())
    throw new e.Error(
      `Logical operator requires bool operands, got '${e.formatType(i)}'`,
      t
    );
  return e.boolType;
}
function Wc(e, t, n) {
  const r = t.op, i = e.check(t.args, n);
  if (i.kind === "dyn") return r === "!_" ? e.boolType : i;
  const s = e.registry.findUnaryOverload(r, i);
  if (!s) throw new e.Error(`no such overload: ${r[0]}${e.formatType(i)}`, t);
  return (t.staticHandler = s).returnType;
}
function Ky(e, t, n) {
  const r = t.op, i = e.check(t.args[0], n), s = e.check(t.args[1], n);
  i.hasDyn() || s.hasDyn() || (t.staticHandler = e.registry.findBinaryOverload(r, i, s));
  const o = t.staticHandler?.returnType || e.registry.checkBinaryOverload(r, i, s);
  if (o) return o;
  throw new e.Error(
    `no such overload: ${e.formatType(i)} ${r} ${e.formatType(s)}`,
    t
  );
}
function zy(e, t, n) {
  const r = t.args, i = e.eval(r[0], n), s = e.eval(r[1], n);
  return i instanceof Promise || s instanceof Promise ? ti(e, t, i, s, zc) : zc(e, t, i, s);
}
function Gc(e, t, n) {
  if (t.staticHandler) return t.staticHandler.handler.apply(e, n);
  const [r, i] = t.args, s = i.length, o = t.functionCandidates ??= e.registry.getFunctionCandidates(
    !1,
    r,
    s
  ), a = t.argTypes ??= new Array(s);
  let c = s;
  for (; c--; ) a[c] = e.debugOperandType(n[c], i[c].checkedType);
  const u = o.findMatch(a);
  if (u) return u.handler.apply(e, n);
  throw new e.Error(
    `found no matching overload for '${r}(${a.map((l) => l.unwrappedType).join(", ")})'`,
    t
  );
}
function qc(e, t, n, r) {
  if (t.staticHandler) return t.staticHandler.handler.call(e, n, ...r);
  const [i, s, o] = t.args, a = t.functionCandidates ??= e.registry.getFunctionCandidates(
    !0,
    i,
    o.length
  );
  let c = r.length;
  const u = t.argTypes ??= new Array(c);
  for (; c--; ) u[c] = e.debugOperandType(r[c], o[c].checkedType);
  const l = e.debugRuntimeType(n, s.checkedType || e.dynType), d = a.findMatch(u, l);
  if (d) return d.handler.call(e, n, ...r);
  throw new e.Error(
    `found no matching overload for '${l.type}.${i}(${u.map((p) => p.unwrappedType).join(", ")})'`,
    t
  );
}
function Os(e, t, n, r = t.length) {
  if (r === 0) return [];
  let i;
  const s = new Array(r);
  for (; r--; ) (s[r] = e.eval(t[r], n)) instanceof Promise && (i ??= !0);
  return i ? Promise.all(s) : s;
}
function Yc(e) {
  const t = {};
  for (let n = 0; n < e.length; n++) {
    const [r, i] = e[n];
    r === "__proto__" || r === "constructor" || r === "prototype" || (t[r] = i);
  }
  return t;
}
function jy(e, t, n) {
  const r = e.check(t, n);
  if (r.kind === "dyn") return r;
  if (r.kind === "list") return r.valueType;
  if (r.kind === "map") return r.keyType;
  throw new e.Error(
    `Expression of type '${e.formatType(
      r
    )}' cannot be range of a comprehension (must be list, map, or dynamic).`,
    t
  );
}
function Wy(e, t, n) {
  if (n instanceof Set) return [...n];
  if (n instanceof Map) return [...n.keys()];
  if (n && typeof n == "object") return fe(n);
  throw new e.Error(
    `Expression of type '${e.debugType(
      n
    )}' cannot be range of a comprehension (must be list, map, or dynamic).`,
    t.iterable
  );
}
function Zc(e, t, n, r) {
  Qr(r) || (r = Wy(e, t, r));
  const i = e.eval(t.init, n = t.iterCtx.reuse(n)), s = t.errorsAreFatal ? _f : Vf;
  return (n === t.iterCtx ? s : s.async)(e, n, t, r, n.accuValue = i, 0);
}
function _f(e, t, n, r, i, s) {
  const o = n.condition, a = n.step, c = r.length;
  for (; s < c && !(o && !o(i)); )
    if (i = e.eval(a, t.setIterValue(r[s++])), i instanceof Promise) return Df(e, t, n, r, i, s);
  return n.result(i);
}
async function Df(e, t, n, r, i, s) {
  t === n.iterCtx && (t.async = !0);
  const o = n.condition, a = n.step, c = r.length;
  for (i = await i; s < c; ) {
    if (o && !o(i)) return n.result(i);
    i = e.eval(a, t.setIterValue(r[s++])), i instanceof Promise && (i = await i);
  }
  return n.result(i);
}
function Vf(e, t, n, r, i, s, o, a) {
  const c = n.condition, u = n.step, l = r.length;
  for (; s < l; ) {
    if (!c(i)) return n.result(i);
    if (a = e.tryEval(u, t.setIterValue(r[s++])), a instanceof Promise) return Mf(e, t, n, r, i, s, o, a);
    a instanceof Error && (o ??= a) || (i = a);
  }
  if (o && c(i)) throw o;
  return n.result(i);
}
async function Mf(e, t, n, r, i, s, o, a) {
  t === n.iterCtx && (t.async = !0);
  const c = n.condition, u = n.step, l = r.length;
  for (a = await a, a instanceof Error ? o ??= a : i = a; s < l; ) {
    if (!c(i)) return n.result(i);
    a = e.tryEval(u, t.setIterValue(r[s++])), a instanceof Promise && (a = await a), !(a instanceof Error && (o ??= a)) && (i = a);
  }
  if (o && c(i)) throw o;
  return n.result(i);
}
_f.async = Df;
Vf.async = Mf;
function Mr(e, t, n, r) {
  return e.optionalType.field(n, r, t, e);
}
function Hr(e, t, n, r) {
  return e.debugType(n).field(n, r, t, e);
}
const M = {
  value: {
    check(e, t) {
      return e.debugType(t.args);
    },
    evaluate(e, t) {
      return t.args;
    }
  },
  id: {
    check(e, t, n) {
      const r = n.getType(t.args);
      if (r !== void 0) return r;
      throw new e.Error(`Unknown variable: ${t.args}`, t);
    },
    evaluate(e, t, n) {
      const r = t.checkedType || n.getType(t.args), i = r && n.getValue(t.args);
      if (i === void 0) throw new e.Error(`Unknown variable: ${t.args}`, t);
      const s = e.debugType(i);
      switch (r) {
        case s:
        case tt.dyn:
          return i;
        default:
          if (r.matches(s)) return i;
      }
      throw new e.Error(`Variable '${t.args}' is not of type '${r}', got '${s}'`, t);
    }
  },
  ".": {
    alias: "fieldAccess",
    check: _c,
    evaluate(e, t, n) {
      const r = t.args, i = e.eval(r[0], n);
      return i instanceof Promise ? i.then((s) => Hr(e, t, s, r[1])) : Hr(e, t, i, r[1]);
    }
  },
  ".?": {
    alias: "optionalFieldAccess",
    check: Dc,
    evaluate(e, t, n) {
      const r = t.args, i = e.eval(r[0], n);
      return i instanceof Promise ? i.then((s) => Mr(e, t, s, r[1])) : Mr(e, t, i, r[1]);
    }
  },
  "[]": {
    alias: "bracketAccess",
    check: _c,
    evaluate(e, t, n) {
      const r = t.args, i = e.eval(r[0], n), s = e.eval(r[1], n);
      return i instanceof Promise || s instanceof Promise ? ti(e, t, i, s, Hr) : Hr(e, t, i, s);
    }
  },
  "[?]": {
    alias: "optionalBracketAccess",
    check: Dc,
    evaluate(e, t, n) {
      const r = t.args, i = e.eval(r[0], n), s = e.eval(r[1], n);
      return i instanceof Promise || s instanceof Promise ? ti(e, t, i, s, Mr) : Mr(e, t, i, s);
    }
  },
  call: {
    check(e, t, n) {
      const [r, i] = t.args, s = t.functionCandidates ??= e.registry.getFunctionCandidates(
        !1,
        r,
        i.length
      ), o = i.map((c) => e.check(c, n)), a = s.findMatch(o);
      if (!a)
        throw new e.Error(
          `found no matching overload for '${r}(${e.formatTypeList(o)})'`,
          t
        );
      return o.some((c) => c.hasDyn()) || (t.staticHandler = a), a.returnType;
    },
    evaluate(e, t, n) {
      const r = Os(e, t.args[1], n);
      return r instanceof Promise ? r.then((i) => Gc(e, t, i)) : Gc(e, t, r);
    }
  },
  rcall: {
    check(e, t, n) {
      const [r, i, s] = t.args, o = e.check(i, n), a = t.functionCandidates ??= e.registry.getFunctionCandidates(
        !0,
        r,
        s.length
      ), c = s.map((l) => e.check(l, n));
      if (o.kind === "dyn" && a.returnType) return a.returnType;
      const u = a.findMatch(c, o);
      if (!u)
        throw new e.Error(
          `found no matching overload for '${o.type}.${r}(${e.formatTypeList(
            c
          )})'`,
          t
        );
      return !o.hasPlaceholder() && !c.some((l) => l.hasDyn()) && (t.staticHandler = u), u.returnType;
    },
    evaluate(e, t, n) {
      const r = e.eval(t.args[1], n), i = Os(e, t.args[2], n);
      return r instanceof Promise || i instanceof Promise ? ti(e, t, r, i, qc) : qc(e, t, r, i);
    }
  },
  list: {
    check(e, t, n) {
      const r = t.args, i = r.length;
      if (i === 0) return e.getType("list<T>");
      let s = e.check(r[0], n);
      const o = e.opts.homogeneousAggregateLiterals ? Vc : Mc;
      for (let a = 1; a < i; a++) s = o(e, n, s, r[a], 0);
      return e.registry.getListType(s);
    },
    evaluate(e, t, n) {
      return Os(e, t.args, n);
    }
  },
  map: {
    check(e, t, n) {
      const r = t.args, i = r.length;
      if (i === 0) return e.getType("map<K, V>");
      const s = e.opts.homogeneousAggregateLiterals ? Vc : Mc;
      let o = e.check(r[0][0], n), a = e.check(r[0][1], n);
      for (let c = 1; c < i; c++) {
        const u = r[c];
        o = s(e, n, o, u[0], 1), a = s(e, n, a, u[1], 2);
      }
      return e.registry.getMapType(o, a);
    },
    evaluate(e, t, n) {
      const r = t.args, i = r.length, s = new Array(i);
      let o;
      for (let a = 0; a < i; a++) {
        const c = r[a], u = e.eval(c[0], n), l = e.eval(c[1], n);
        u instanceof Promise || l instanceof Promise ? (s[a] = Promise.all([u, l]), o ??= !0) : s[a] = [u, l];
      }
      return o ? Promise.all(s).then(Yc) : Yc(s);
    }
  },
  comprehension: {
    check(e, t, n) {
      const r = t.args;
      r.iterCtx = n.forkWithVariable(r.iterVarName, jy(e, r.iterable, n)).setAccuType(e.check(r.init, n));
      const i = e.check(r.step, r.iterCtx);
      return r.kind === "quantifier" ? e.boolType : i;
    },
    evaluate(e, t, n) {
      const r = t.args, i = e.eval(r.iterable, n);
      return i instanceof Promise ? i.then((s) => Zc(e, r, n, s)) : Zc(e, r, n, i);
    }
  },
  accuValue: {
    check(e, t, n) {
      return n.accuType;
    },
    evaluate(e, t, n) {
      return n.accuValue;
    }
  },
  accuInc: {
    check(e, t, n) {
      return n.accuType;
    },
    evaluate(e, t, n) {
      return n.accuValue += 1;
    }
  },
  accuPush: {
    check(e, t, n) {
      const r = n.accuType, i = e.check(t.args, n);
      return r.kind === "list" && r.valueType.kind !== "param" ? r : e.registry.getListType(i);
    },
    evaluate(e, t, n) {
      const r = n.accuValue, i = e.eval(t.args, n);
      return i instanceof Promise ? i.then((s) => r.push(s) && r) : (r.push(i), r);
    }
  },
  "?:": {
    alias: "ternary",
    check(e, t, n) {
      const [r, i, s] = t.args, o = e.check(r, n);
      if (!o.isDynOrBool())
        throw new e.Error(
          `${r.meta.label || "Ternary condition must be bool"}, got '${e.formatType(o)}'`,
          r
        );
      const a = e.check(i, n), c = e.check(s, n), u = a.unify(e.registry, c);
      if (u) return u;
      throw new e.Error(
        `Ternary branches must have the same type, got '${e.formatType(
          a
        )}' and '${e.formatType(c)}'`,
        t
      );
    },
    evaluate(e, t, n) {
      const r = e.eval(t.args[0], n);
      return r instanceof Promise ? r.then((i) => Hc(e, t, n, i)) : Hc(e, t, n, r);
    }
  },
  "||": {
    check: jc,
    evaluate(e, t, n) {
      const r = t.args, i = e.tryEval(r[0], n);
      if (i === !0) return !0;
      if (i === !1) {
        const s = e.eval(r[1], n);
        return typeof s == "boolean" ? s : bn(!0, e, t, i, s);
      }
      return i instanceof Promise ? i.then(
        (s) => s === !0 ? s : bn(!0, e, t, s, e.eval(r[1], n))
      ) : bn(!0, e, t, i, e.eval(r[1], n));
    }
  },
  "&&": {
    check: jc,
    evaluate(e, t, n) {
      const r = t.args, i = e.tryEval(r[0], n);
      if (i === !1) return !1;
      if (i === !0) {
        const s = e.eval(r[1], n);
        return typeof s == "boolean" ? s : bn(!1, e, t, i, s);
      }
      return i instanceof Promise ? i.then(
        (s) => s === !1 ? s : bn(!1, e, t, s, e.eval(r[1], n))
      ) : bn(!1, e, t, i, e.eval(r[1], n));
    }
  },
  "!_": { alias: "unaryNot", check: Wc, evaluate: Kc },
  "-_": { alias: "unaryMinus", check: Wc, evaluate: Kc }
}, Gy = ["!=", "==", "in", "+", "-", "*", "/", "%", "<", "<=", ">", ">="];
for (const e of Gy) M[e] = { check: Ky, evaluate: zy };
for (const e of fe(M)) {
  const t = M[e];
  t.name = e, t.alias && (M[t.alias] = t);
}
const k = {
  EOF: 0,
  NUMBER: 1,
  STRING: 2,
  BOOLEAN: 3,
  NULL: 4,
  IDENTIFIER: 5,
  PLUS: 6,
  MINUS: 7,
  MULTIPLY: 8,
  DIVIDE: 9,
  MODULO: 10,
  EQ: 11,
  NE: 12,
  LT: 13,
  LE: 14,
  GT: 15,
  GE: 16,
  AND: 17,
  OR: 18,
  NOT: 19,
  IN: 20,
  LPAREN: 21,
  RPAREN: 22,
  LBRACKET: 23,
  RBRACKET: 24,
  LBRACE: 25,
  RBRACE: 26,
  DOT: 27,
  COMMA: 28,
  COLON: 29,
  QUESTION: 30,
  BYTES: 31
}, Fr = {
  [k.EQ]: M["=="],
  [k.PLUS]: M["+"],
  [k.MINUS]: M["-"],
  [k.MULTIPLY]: M["*"],
  [k.DIVIDE]: M["/"],
  [k.MODULO]: M["%"],
  [k.LE]: M["<="],
  [k.LT]: M["<"],
  [k.GE]: M[">="],
  [k.GT]: M[">"],
  [k.NE]: M["!="],
  [k.IN]: M.in
}, ei = {};
for (const e in k) ei[k[e]] = e;
const Hf = new Uint8Array(128);
for (const e of "0123456789abcdefABCDEF") Hf[e.charCodeAt(0)] = 1;
const Xc = {
  "\\": "\\",
  "?": "?",
  '"': '"',
  "'": "'",
  "`": "`",
  a: "\x07",
  b: "\b",
  f: "\f",
  n: `
`,
  r: "\r",
  t: "	",
  v: "\v"
};
class es {
  #t;
  constructor(t, n, r, i) {
    this.#t = { input: t, pos: n, evaluate: r.evaluate, check: r.check }, this.op = r.name, this.args = i;
  }
  get meta() {
    return this.#t;
  }
  check(t, n, r) {
    const i = this.#t;
    return i.alternate ? t.check(i.alternate, r) : i.macro ? i.macro.typeCheck(t, i.macro, r) : i.check(t, n, r);
  }
  evaluate(t, n, r) {
    const i = this.#t;
    return i.alternate ? this.evaluate = this.#e : i.macro ? this.evaluate = this.#n : this.evaluate = i.evaluate, this.evaluate(t, n, r);
  }
  #e(t, n, r) {
    return (n = this.#t.alternate).evaluate(t, n, r);
  }
  #n(t, n, r) {
    return (n = this.#t.macro).evaluate(t, n, r);
  }
  setMeta(t, n) {
    return this.#t[t] = n, this;
  }
  get input() {
    return this.#t.input;
  }
  get pos() {
    return this.#t.pos;
  }
  toOldStructure() {
    const t = Array.isArray(this.args) ? this.args : [this.args];
    return [this.op, ...t.map((n) => n instanceof es ? n.toOldStructure() : n)];
  }
}
class qy {
  input;
  pos;
  length;
  tokenPos;
  tokenType;
  tokenValue;
  reset(t) {
    return this.pos = 0, this.input = t, this.length = t.length, t;
  }
  token(t, n, r) {
    return this.tokenPos = t, this.tokenType = n, this.tokenValue = r, this;
  }
  // Read next token
  nextToken() {
    for (; ; ) {
      const { pos: t, input: n, length: r } = this;
      if (t >= r) return this.token(t, k.EOF);
      const i = n[t];
      switch (i) {
        // Whitespaces
        case " ":
        case "	":
        case `
`:
        case "\r":
          this.pos++;
          continue;
        // Operators
        case "=":
          if (n[t + 1] !== "=") break;
          return this.token((this.pos += 2) - 2, k.EQ);
        case "&":
          if (n[t + 1] !== "&") break;
          return this.token((this.pos += 2) - 2, k.AND);
        case "|":
          if (n[t + 1] !== "|") break;
          return this.token((this.pos += 2) - 2, k.OR);
        case "+":
          return this.token(this.pos++, k.PLUS);
        case "-":
          return this.token(this.pos++, k.MINUS);
        case "*":
          return this.token(this.pos++, k.MULTIPLY);
        case "/":
          if (n[t + 1] === "/") {
            for (; this.pos < r && this.input[this.pos] !== `
`; ) this.pos++;
            continue;
          }
          return this.token(this.pos++, k.DIVIDE);
        case "%":
          return this.token(this.pos++, k.MODULO);
        case "<":
          return n[t + 1] === "=" ? this.token((this.pos += 2) - 2, k.LE) : this.token(this.pos++, k.LT);
        case ">":
          return n[t + 1] === "=" ? this.token((this.pos += 2) - 2, k.GE) : this.token(this.pos++, k.GT);
        case "!":
          return n[t + 1] === "=" ? this.token((this.pos += 2) - 2, k.NE) : this.token(this.pos++, k.NOT);
        case "(":
          return this.token(this.pos++, k.LPAREN);
        case ")":
          return this.token(this.pos++, k.RPAREN);
        case "[":
          return this.token(this.pos++, k.LBRACKET);
        case "]":
          return this.token(this.pos++, k.RBRACKET);
        case "{":
          return this.token(this.pos++, k.LBRACE);
        case "}":
          return this.token(this.pos++, k.RBRACE);
        case ".":
          return this.token(this.pos++, k.DOT);
        case ",":
          return this.token(this.pos++, k.COMMA);
        case ":":
          return this.token(this.pos++, k.COLON);
        case "?":
          return this.token(this.pos++, k.QUESTION);
        case '"':
        case "'":
          return this.readString(i);
        // Check for string prefixes (b, B, r, R followed by quote)
        case "b":
        case "B":
        case "r":
        case "R": {
          const s = n[t + 1];
          return s === '"' || s === "'" ? ++this.pos && this.readString(s, i) : this.readIdentifier();
        }
        default: {
          const s = i.charCodeAt(0);
          if (s <= 57 && s >= 48) return this.readNumber();
          if (this._isIdentifierCharCode(s)) return this.readIdentifier();
        }
      }
      throw new ot(`Unexpected character: ${i}`, { pos: t, input: n });
    }
  }
  // Characters: 0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_
  _isIdentifierCharCode(t) {
    return t < 48 || t > 122 ? !1 : t >= 97 || t >= 65 && t <= 90 || t <= 57 || t === 95;
  }
  _parseAsDouble(t, n) {
    const r = Number(this.input.substring(t, n));
    if (Number.isFinite(r)) return this.token(t, k.NUMBER, r);
    throw new ot(`Invalid number: ${r}`, { pos: t, input: this.input });
  }
  _parseAsBigInt(t, n, r, i) {
    const s = this.input.substring(t, n);
    if (i === "u" || i === "U") {
      this.pos++;
      try {
        return this.token(t, k.NUMBER, new sn(s));
      } catch {
      }
    } else
      try {
        return this.token(t, k.NUMBER, BigInt(s));
      } catch {
      }
    throw new ot(r ? `Invalid hex integer: ${s}` : `Invalid integer: ${s}`, {
      pos: t,
      input: this.input
    });
  }
  _readDigits(t, n, r, i) {
    for (; r < n && (i = t.charCodeAt(r)) && !(i > 57 || i < 48); ) r++;
    return r;
  }
  _readExponent(t, n, r) {
    let i = r < n && t[r];
    if (i === "e" || i === "E") {
      i = ++r < n && t[r], (i === "-" || i === "+") && r++;
      const s = r;
      if (r = this._readDigits(t, n, r), s === r) throw new ot("Invalid exponent", { pos: r, input: t });
    }
    return r;
  }
  readNumber() {
    const { input: t, length: n, pos: r } = this;
    let i = r;
    if (t[i] === "0" && (t[i + 1] === "x" || t[i + 1] === "X")) {
      for (i += 2; i < n && Hf[t[i].charCodeAt(0)]; ) i++;
      return this._parseAsBigInt(r, this.pos = i, !0, t[i]);
    }
    if (i = this._readDigits(t, n, i), i + 1 < n) {
      let s = !1, o = t[i] === "." ? this._readDigits(t, n, i + 1) : i + 1;
      if (o !== i + 1 && (s = !0) && (i = o), o = this._readExponent(t, n, i), o !== i && (s = !0) && (i = o), s) return this._parseAsDouble(r, this.pos = i);
    }
    return this._parseAsBigInt(r, this.pos = i, !1, t[i]);
  }
  readString(t, n) {
    const { input: r, pos: i } = this;
    return r[i + 1] === t && r[i + 2] === t ? this.readTripleQuotedString(t, n) : this.readSingleQuotedString(t, n);
  }
  _closeQuotedString(t, n, r) {
    switch (n) {
      case "b":
      case "B": {
        const i = this.processEscapes(t, !0), s = new Uint8Array(i.length);
        for (let o = 0; o < i.length; o++) s[o] = i.charCodeAt(o) & 255;
        return this.token(r - 1, k.BYTES, s);
      }
      case "r":
      case "R":
        return this.token(r - 1, k.STRING, t);
      default: {
        const i = this.processEscapes(t, !1);
        return this.token(r, k.STRING, i);
      }
    }
  }
  readSingleQuotedString(t, n) {
    const { input: r, length: i, pos: s } = this;
    let o, a = this.pos + 1;
    for (; a < i && (o = r[a]); ) {
      switch (o) {
        case t:
          const c = r.slice(s + 1, a);
          return this.pos = ++a, this._closeQuotedString(c, n, s);
        case `
`:
        case "\r":
          throw new ot("Newlines not allowed in single-quoted strings", { pos: s, input: r });
        case "\\":
          a++;
      }
      a++;
    }
    throw new ot("Unterminated string", { pos: s, input: r });
  }
  readTripleQuotedString(t, n) {
    const { input: r, length: i, pos: s } = this;
    let o, a = this.pos + 3;
    for (; a < i && (o = r[a]); ) {
      switch (o) {
        case t:
          if (r[a + 1] === t && r[a + 2] === t) {
            const c = r.slice(s + 3, a);
            return this.pos = a + 3, this._closeQuotedString(c, n, s);
          }
          break;
        case "\\":
          a++;
      }
      a++;
    }
    throw new ot("Unterminated triple-quoted string", { pos: s, input: r });
  }
  processEscapes(t, n) {
    if (!t.includes("\\")) return t;
    let r = "", i = 0;
    for (; i < t.length; ) {
      if (t[i] !== "\\" || i + 1 >= t.length) {
        r += t[i++];
        continue;
      }
      const s = t[i + 1];
      if (Xc[s])
        r += Xc[s], i += 2;
      else if (s === "u") {
        if (n) throw new ot("\\u not allowed in bytes literals");
        const o = t.substring(i + 2, i += 6);
        if (!/^[0-9a-fA-F]{4}$/.test(o)) throw new ot(`Invalid Unicode escape: \\u${o}`);
        const a = Number.parseInt(o, 16);
        if (a >= 55296 && a <= 57343) throw new ot(`Invalid Unicode surrogate: \\u${o}`);
        r += String.fromCharCode(a);
      } else if (s === "U") {
        if (n) throw new ot("\\U not allowed in bytes literals");
        const o = t.substring(i + 2, i += 10);
        if (!/^[0-9a-fA-F]{8}$/.test(o)) throw new ot(`Invalid Unicode escape: \\U${o}`);
        const a = Number.parseInt(o, 16);
        if (a > 1114111) throw new ot(`Invalid Unicode escape: \\U${o}`);
        if (a >= 55296 && a <= 57343) throw new ot(`Invalid Unicode surrogate: \\U${o}`);
        r += String.fromCodePoint(a);
      } else if (s === "x" || s === "X") {
        const o = t.substring(i + 2, i += 4);
        if (!/^[0-9a-fA-F]{2}$/.test(o)) throw new ot(`Invalid hex escape: \\${s}${o}`);
        r += String.fromCharCode(Number.parseInt(o, 16));
      } else if (s >= "0" && s <= "7") {
        const o = t.substring(i + 1, i += 4);
        if (!/^[0-7]{3}$/.test(o)) throw new ot("Octal escape must be 3 digits");
        const a = Number.parseInt(o, 8);
        if (a > 255) throw new ot(`Octal escape out of range: \\${o}`);
        r += String.fromCharCode(a);
      } else
        throw new ot(`Invalid escape sequence: \\${s}`);
    }
    return r;
  }
  readIdentifier() {
    const { pos: t, input: n, length: r } = this;
    let i = t;
    for (; i < r && this._isIdentifierCharCode(n[i].charCodeAt(0)); ) i++;
    const s = n.substring(t, this.pos = i);
    switch (s) {
      case "true":
        return this.token(t, k.BOOLEAN, !0);
      case "false":
        return this.token(t, k.BOOLEAN, !1);
      case "null":
        return this.token(t, k.NULL, null);
      case "in":
        return this.token(t, k.IN);
      default:
        return this.token(t, k.IDENTIFIER, s);
    }
  }
}
class Yy {
  lexer = null;
  input = null;
  maxDepthRemaining = null;
  astNodesRemaining = null;
  type = null;
  pos = null;
  constructor(t, n) {
    this.limits = t, this.registry = n, this.lexer = new qy();
  }
  #t(t, n = this.pos) {
    throw new ot(`Exceeded ${t} (${this.limits[t]})`, {
      pos: n,
      input: this.input
    });
  }
  #e(t, n, r) {
    const i = new es(this.input, t, n, r);
    return this.astNodesRemaining-- || this.#t("maxAstNodes", t), i;
  }
  #n(t = this.pos) {
    const n = this.lexer.nextToken();
    return this.pos = n.tokenPos, this.type = n.tokenType, t;
  }
  // The value of the current token is accessed less regularly,
  // so we use a getter to reduce assignment overhead
  get value() {
    return this.lexer.tokenValue;
  }
  consume(t) {
    if (this.type === t) return this.#n();
    throw new ot(
      `Expected ${ei[t]}, got ${ei[this.type]}`,
      { pos: this.pos, input: this.input }
    );
  }
  match(t) {
    return this.type === t;
  }
  // Parse entry point
  parse(t) {
    if (typeof t != "string") throw new ot("Expression must be a string");
    this.input = this.lexer.reset(t), this.#n(), this.maxDepthRemaining = this.limits.maxDepth, this.astNodesRemaining = this.limits.maxAstNodes;
    const n = this.parseExpression();
    if (this.match(k.EOF)) return n;
    throw new ot(`Unexpected character: '${this.input[this.lexer.pos - 1]}'`, {
      pos: this.pos,
      input: this.input
    });
  }
  #r(t, n, r) {
    const [i, s, o] = n === M.rcall ? r : [r[0], null, r[1]], a = this.registry.findMacro(i, !!s, o.length), c = this.#e(t, n, r);
    if (!a) return c;
    const u = a.handler({ ast: c, args: o, receiver: s, methodName: i, parser: this });
    return u.callAst ? c.setMeta("alternate", u.callAst) : c.setMeta("macro", u), c;
  }
  // Expression ::= LogicalOr ('?' Expression ':' Expression)?
  parseExpression() {
    this.maxDepthRemaining-- || this.#t("maxDepth");
    const t = this.parseLogicalOr();
    if (!this.match(k.QUESTION)) return ++this.maxDepthRemaining && t;
    const n = this.#n(), r = this.parseExpression();
    this.consume(k.COLON);
    const i = this.parseExpression();
    return this.maxDepthRemaining++, this.#e(n, M.ternary, [t, r, i]);
  }
  // LogicalOr ::= LogicalAnd ('||' LogicalAnd)*
  parseLogicalOr() {
    let t = this.parseLogicalAnd();
    for (; this.match(k.OR); )
      t = this.#e(this.#n(), M["||"], [t, this.parseLogicalAnd()]);
    return t;
  }
  // LogicalAnd ::= Equality ('&&' Equality)*
  parseLogicalAnd() {
    let t = this.parseEquality();
    for (; this.match(k.AND); )
      t = this.#e(this.#n(), M["&&"], [t, this.parseEquality()]);
    return t;
  }
  // Equality ::= Relational (('==' | '!=') Relational)*
  parseEquality() {
    let t = this.parseRelational();
    for (; this.match(k.EQ) || this.match(k.NE); ) {
      const n = Fr[this.type];
      t = this.#e(this.#n(), n, [t, this.parseRelational()]);
    }
    return t;
  }
  // Relational ::= Additive (('<' | '<=' | '>' | '>=' | 'in') Additive)*
  parseRelational() {
    let t = this.parseAdditive();
    for (; this.match(k.LT) || this.match(k.LE) || this.match(k.GT) || this.match(k.GE) || this.match(k.IN); ) {
      const n = Fr[this.type];
      t = this.#e(this.#n(), n, [t, this.parseAdditive()]);
    }
    return t;
  }
  // Additive ::= Multiplicative (('+' | '-') Multiplicative)*
  parseAdditive() {
    let t = this.parseMultiplicative();
    for (; this.match(k.PLUS) || this.match(k.MINUS); ) {
      const n = Fr[this.type];
      t = this.#e(this.#n(), n, [t, this.parseMultiplicative()]);
    }
    return t;
  }
  // Multiplicative ::= Unary (('*' | '/' | '%') Unary)*
  parseMultiplicative() {
    let t = this.parseUnary();
    for (; this.match(k.MULTIPLY) || this.match(k.DIVIDE) || this.match(k.MODULO); ) {
      const n = Fr[this.type];
      t = this.#e(this.#n(), n, [t, this.parseUnary()]);
    }
    return t;
  }
  // Unary ::= ('!' | '-')* Postfix
  parseUnary() {
    return this.type === k.NOT ? this.#e(this.#n(), M.unaryNot, this.parseUnary()) : this.type === k.MINUS ? this.#e(this.#n(), M.unaryMinus, this.parseUnary()) : this.parsePostfix();
  }
  // Postfix ::= Primary (('.' IDENTIFIER ('(' ArgumentList ')')? | '[' Expression ']'))*
  parsePostfix() {
    let t = this.parsePrimary();
    const n = this.maxDepthRemaining;
    for (; ; ) {
      if (this.match(k.DOT)) {
        const r = this.#n();
        this.maxDepthRemaining-- || this.#t("maxDepth", r);
        const i = this.match(k.QUESTION) && this.registry.enableOptionalTypes && this.#n() ? M.optionalFieldAccess : M.fieldAccess, s = this.value, o = this.consume(k.IDENTIFIER);
        if (i === M.fieldAccess && this.match(k.LPAREN) && this.#n()) {
          const a = this.parseArgumentList();
          this.consume(k.RPAREN), t = this.#r(o, M.rcall, [s, t, a]);
        } else
          t = this.#e(o, i, [t, s]);
        continue;
      }
      if (this.match(k.LBRACKET)) {
        const r = this.#n();
        this.maxDepthRemaining-- || this.#t("maxDepth", r);
        const i = this.match(k.QUESTION) && this.registry.enableOptionalTypes && this.#n() ? M.optionalBracketAccess : M.bracketAccess, s = this.parseExpression();
        this.consume(k.RBRACKET), t = this.#e(r, i, [t, s]);
        continue;
      }
      break;
    }
    return this.maxDepthRemaining = n, t;
  }
  // Primary ::= NUMBER | STRING | BOOLEAN | NULL | IDENTIFIER | '(' Expression ')' | Array | Object
  parsePrimary() {
    switch (this.type) {
      case k.NUMBER:
      case k.STRING:
      case k.BYTES:
      case k.BOOLEAN:
      case k.NULL:
        return this.#i();
      case k.IDENTIFIER:
        return this.#o();
      case k.LPAREN:
        return this.#a();
      case k.LBRACKET:
        return this.parseList();
      case k.LBRACE:
        return this.parseMap();
    }
    throw new ot(`Unexpected token: ${ei[this.type]}`, {
      pos: this.pos,
      input: this.input
    });
  }
  #i() {
    return this.#n(this.#e(this.pos, M.value, this.value));
  }
  #o() {
    const t = this.value, n = this.consume(k.IDENTIFIER);
    if (Ui.has(t))
      throw new ot(`Reserved identifier: ${t}`, {
        pos: n,
        input: this.input
      });
    if (!this.match(k.LPAREN)) return this.#e(n, M.id, t);
    this.#n();
    const r = this.parseArgumentList();
    return this.consume(k.RPAREN), this.#r(n, M.call, [t, r]);
  }
  #a() {
    this.consume(k.LPAREN);
    const t = this.parseExpression();
    return this.consume(k.RPAREN), t;
  }
  parseList() {
    const t = this.consume(k.LBRACKET), n = [];
    let r = this.limits.maxListElements;
    if (!this.match(k.RBRACKET))
      for (n.push(this.parseExpression()), r-- || this.#t("maxListElements", n.at(-1).pos); this.match(k.COMMA) && (this.#n(), !this.match(k.RBRACKET)); )
        n.push(this.parseExpression()), r-- || this.#t("maxListElements", n.at(-1).pos);
    return this.consume(k.RBRACKET), this.#e(t, M.list, n);
  }
  parseMap() {
    const t = this.consume(k.LBRACE), n = [];
    let r = this.limits.maxMapEntries;
    if (!this.match(k.RBRACE))
      for (n.push(this.parseProperty()), r-- || this.#t("maxMapEntries", n.at(-1)[0].pos); this.match(k.COMMA) && (this.#n(), !this.match(k.RBRACE)); )
        n.push(this.parseProperty()), r-- || this.#t("maxMapEntries", n.at(-1)[0].pos);
    return this.consume(k.RBRACE), this.#e(t, M.map, n);
  }
  parseProperty() {
    return [this.parseExpression(), (this.consume(k.COLON), this.parseExpression())];
  }
  parseArgumentList() {
    const t = [];
    let n = this.limits.maxCallArguments;
    if (!this.match(k.RPAREN))
      for (t.push(this.parseExpression()), n-- || this.#t("maxCallArguments", t.at(-1).pos); this.match(k.COMMA) && (this.#n(), !this.match(k.RPAREN)); )
        t.push(this.parseExpression()), n-- || this.#t("maxCallArguments", t.at(-1).pos);
    return t;
  }
}
const ns = (e) => e;
function rs(e, t) {
  if (e.op === "id") return e.args;
  throw new ot(t, e);
}
function ct(e, t, n) {
  return new es(e.input, e.pos, t, n);
}
function Qc(e) {
  const t = e ? "map(var, filter, transform)" : "map(var, transform)", n = `${t} invalid predicate iteration variable`, r = `${t} filter predicate must return bool`;
  return ({ args: i, receiver: s, ast: o }) => {
    const [a, c, u] = e ? i : [i[0], null, i[1]];
    let l = ct(u, M.accuPush, u);
    if (c) {
      const d = ct(c, M.accuValue);
      l = ct(c, M.ternary, [c.setMeta("label", r), l, d]);
    }
    return {
      callAst: ct(o, M.comprehension, {
        errorsAreFatal: !0,
        iterable: s,
        iterVarName: rs(a, n),
        init: ct(o, M.list, []),
        step: l,
        result: ns
      })
    };
  };
}
function Zy() {
  const e = "filter(var, predicate)", t = `${e} invalid predicate iteration variable`, n = `${e} predicate must return bool`;
  return ({ args: r, receiver: i, ast: s }) => {
    const o = rs(r[0], t), a = ct(s, M.accuValue), c = r[1].setMeta("label", n), u = ct(s, M.accuPush, ct(s, M.id, o)), l = ct(c, M.ternary, [c, u, a]);
    return {
      callAst: ct(s, M.comprehension, {
        errorsAreFatal: !0,
        iterable: i,
        iterVarName: o,
        init: ct(s, M.list, []),
        step: l,
        result: ns
      })
    };
  };
}
function Bs(e) {
  const t = `${e.name}(var, predicate) invalid predicate iteration variable`, n = `${e.name}(var, predicate) predicate must return bool`;
  return ({ args: r, receiver: i, ast: s }) => {
    const o = r[1].setMeta("label", n), a = e.transform({ args: r, ast: s, predicate: o, opts: e });
    return {
      callAst: ct(s, M.comprehension, {
        kind: "quantifier",
        errorsAreFatal: e.errorsAreFatal || !1,
        iterable: i,
        iterVarName: rs(r[0], t),
        init: a.init,
        condition: a.condition,
        step: a.step,
        result: a.result || ns
      })
    };
  };
}
function Xy() {
  const e = "has() invalid argument";
  function t(r, i, s) {
    const o = i.macroHasProps;
    let a = o.length, c = r.eval(o[--a], s), u;
    for (; a--; ) {
      const l = o[a];
      if (l.op === ".?" && (u ??= !0), c = r.debugType(c).fieldLazy(c, l.args[1], l, r), c === void 0) {
        if (!(!u && a && l.op === ".")) break;
        throw new j(`No such key: ${l.args[1]}`, l);
      }
    }
    return c !== void 0;
  }
  function n(r, i, s) {
    let o = i.args[0];
    if (o.op !== ".") throw new r.Error(e, o);
    if (!i.macroHasProps) {
      const a = [];
      for (; o.op === "." || o.op === ".?"; ) o = a.push(o) && o.args[0];
      if (o.op !== "id") throw new r.Error(e, o);
      r.check(o, s), a.push(o), i.macroHasProps = a;
    }
    return r.getType("bool");
  }
  return function({ args: r }) {
    return { args: r, evaluate: t, typeCheck: n };
  };
}
function Qy(e) {
  e.registerFunctionOverload("has(ast): bool", Xy()), e.registerFunctionOverload(
    "list.all(ast, ast): bool",
    Bs({
      name: "all",
      transform({ ast: o, predicate: a, opts: c }) {
        return {
          init: ct(o, M.value, !0),
          condition: ns,
          step: ct(a, M.ternary, [
            a,
            ct(a, M.value, !0),
            ct(a, M.value, !1)
          ])
        };
      }
    })
  ), e.registerFunctionOverload(
    "list.exists(ast, ast): bool",
    Bs({
      name: "exists",
      condition(o) {
        return !o;
      },
      transform({ ast: o, predicate: a, opts: c }) {
        return {
          init: ct(o, M.value, !1),
          condition: c.condition,
          step: ct(a, M.ternary, [
            a,
            ct(a, M.value, !0),
            ct(a, M.value, !1)
          ])
        };
      }
    })
  ), e.registerFunctionOverload(
    "list.exists_one(ast, ast): bool",
    Bs({
      name: "exists_one",
      errorsAreFatal: !0,
      result(o) {
        return o === 1;
      },
      transform({ ast: o, predicate: a, opts: c }) {
        const u = ct(o, M.accuValue);
        return {
          init: ct(o, M.value, 0),
          step: ct(a, M.ternary, [a, ct(o, M.accuInc), u]),
          result: c.result
        };
      }
    })
  ), e.registerFunctionOverload("list.map(ast, ast): list<dyn>", Qc(!1)), e.registerFunctionOverload("list.map(ast, ast, ast): list<dyn>", Qc(!0)), e.registerFunctionOverload("list.filter(ast, ast): list<dyn>", Zy());
  function t(o, a, c, u) {
    const l = o.eval(a.exp, c = a.bindCtx.reuse(c).setIterValue(u));
    return l instanceof Promise && c === a.bindCtx && (c.async = !0), l;
  }
  class n {
  }
  const r = new n();
  e.registerType("CelNamespace", n), e.registerConstant("cel", "CelNamespace", r);
  function i(o, a, c) {
    return a.bindCtx = c.forkWithVariable(a.var, o.check(a.val, c)), o.check(a.exp, a.bindCtx);
  }
  function s(o, a, c) {
    const u = o.eval(a.val, c);
    return u instanceof Promise ? u.then((l) => t(o, a, c, l)) : t(o, a, c, u);
  }
  e.registerFunctionOverload("CelNamespace.bind(ast, dyn, ast): dyn", ({ args: o }) => ({
    var: rs(o[0], "invalid variable argument"),
    val: o[1],
    exp: o[2],
    bindCtx: void 0,
    typeCheck: i,
    evaluate: s
  }));
}
function Jy(e) {
  const t = e.unaryOverload.bind(e), n = e.binaryOverload.bind(e);
  function r(u, l) {
    if (u <= 9223372036854775807n && u >= -9223372036854775808n) return u;
    throw new j(`integer overflow: ${u}`, l);
  }
  t("!", "bool", (u) => !u), t("-", "int", (u) => -u), n("dyn<int>", "==", "double", (u, l) => u == l), n("dyn<int>", "==", "uint", (u, l) => u == l.valueOf()), n("int", "*", "int", (u, l, d) => r(u * l, d)), n("int", "+", "int", (u, l, d) => r(u + l, d)), n("int", "-", "int", (u, l, d) => r(u - l, d)), n("int", "/", "int", (u, l, d) => {
    if (l === 0n) throw new j("division by zero", d);
    return u / l;
  }), n("int", "%", "int", (u, l, d) => {
    if (l === 0n) throw new j("modulo by zero", d);
    return u % l;
  }), t("-", "double", (u) => -u), n("dyn<double>", "==", "int", (u, l) => u == l), n("dyn<double>", "==", "uint", (u, l) => u == l.valueOf()), n("double", "*", "double", (u, l) => u * l), n("double", "+", "double", (u, l) => u + l), n("double", "-", "double", (u, l) => u - l), n("double", "/", "double", (u, l) => u / l), n("string", "+", "string", (u, l) => u + l), n("list<V>", "+", "list<V>", (u, l) => [...u, ...l]), n("bytes", "+", "bytes", (u, l) => {
    if (!u.length) return l;
    if (!l.length) return u;
    const d = new Uint8Array(u.length + l.length);
    return d.set(u, 0), d.set(l, u.length), d;
  });
  const i = "google.protobuf.Duration";
  n(i, "+", i, (u, l) => u.addDuration(l)), n(i, "-", i, (u, l) => u.subtractDuration(l)), n(i, "==", i, (u, l) => u.seconds === l.seconds && u.nanos === l.nanos);
  const s = "google.protobuf.Timestamp";
  n(s, "==", s, (u, l) => u.getTime() === l.getTime()), n(s, "-", s, (u, l) => Ke.fromMilliseconds(u.getTime() - l.getTime()), i), n(s, "-", i, (u, l) => l.subtractTimestamp(u)), n(s, "+", i, (u, l) => l.extendTimestamp(u)), n(i, "+", s, (u, l) => u.extendTimestamp(l));
  function o(u, l, d, p) {
    if (l instanceof Set && l.has(u)) return !0;
    for (const g of l) if (nr(u, g, d, p)) return !0;
    return !1;
  }
  function a(u, l) {
    return l instanceof Map ? l.get(u) !== void 0 : mo(l, u) ? l[u] !== void 0 : !1;
  }
  function c(u, l, d, p) {
    return o(u, l, d, p);
  }
  n("V", "in", "list<V>", c), n("K", "in", "map<K, V>", a);
  for (const u of ["type", "null", "bool", "string", "int", "double"])
    n(u, "==", u, (l, d) => l === d);
  n("bytes", "==", "bytes", (u, l) => {
    if (u === l) return !0;
    let d = u.length;
    if (d !== l.length) return !1;
    for (; d--; ) if (u[d] !== l[d]) return !1;
    return !0;
  }), n("list<V>", "==", "list<V>", (u, l, d, p) => {
    if (u === l) return !0;
    if (Qr(u) && Qr(l)) {
      const h = u.length;
      if (h !== l.length) return !1;
      for (let w = 0; w < h; w++)
        if (!nr(u[w], l[w], d, p)) return !1;
      return !0;
    }
    if (u instanceof Set && l instanceof Set) {
      if (u.size !== l.size) return !1;
      for (const h of u) if (!l.has(h)) return !1;
      return !0;
    }
    const g = u instanceof Set ? l : u, f = u instanceof Set ? u : l;
    if (!Qr(g) || g.length !== f?.size) return !1;
    for (let h = 0; h < g.length; h++) if (!f.has(g[h])) return !1;
    return !0;
  }), n("map<K, V>", "==", "map<K, V>", (u, l, d, p) => {
    if (u === l) return !0;
    if (u instanceof Map && l instanceof Map) {
      if (u.size !== l.size) return !1;
      for (const [h, w] of u)
        if (!(l.has(h) && nr(w, l.get(h), d, p))) return !1;
      return !0;
    }
    if (u instanceof Map || l instanceof Map) {
      const h = u instanceof Map ? l : u, w = u instanceof Map ? u : l, E = fe(h);
      if (w.size !== E.length) return !1;
      for (const [S, O] of w)
        if (!(S in h && nr(O, h[S], d, p))) return !1;
      return !0;
    }
    const g = fe(u), f = fe(l);
    if (g.length !== f.length) return !1;
    for (let h = 0; h < g.length; h++) {
      const w = g[h];
      if (!(w in l && nr(u[w], l[w], d, p))) return !1;
    }
    return !0;
  }), n("uint", "==", "uint", (u, l) => u.valueOf() === l.valueOf()), n("dyn<uint>", "==", "double", (u, l) => u.valueOf() == l), n("dyn<uint>", "==", "int", (u, l) => u.valueOf() == l), n("uint", "+", "uint", (u, l) => new sn(u.valueOf() + l.valueOf())), n("uint", "-", "uint", (u, l) => new sn(u.valueOf() - l.valueOf())), n("uint", "*", "uint", (u, l) => new sn(u.valueOf() * l.valueOf())), n("uint", "/", "uint", (u, l, d) => {
    if (l.valueOf() === 0n) throw new j("division by zero", d);
    return new sn(u.valueOf() / l.valueOf());
  }), n("uint", "%", "uint", (u, l, d) => {
    if (l.valueOf() === 0n) throw new j("modulo by zero", d);
    return new sn(u.valueOf() % l.valueOf());
  });
  for (const [u, l] of [
    ["bool", "bool"],
    ["int", "int"],
    ["uint", "uint"],
    ["double", "double"],
    ["string", "string"],
    ["google.protobuf.Timestamp", "google.protobuf.Timestamp"],
    ["google.protobuf.Duration", "google.protobuf.Duration"],
    ["int", "uint"],
    ["int", "double"],
    ["double", "int"],
    ["double", "uint"],
    ["uint", "int"],
    ["uint", "double"]
  ])
    n(u, "<", l, (d, p) => d < p), n(u, "<=", l, (d, p) => d <= p), n(u, ">", l, (d, p) => d > p), n(u, ">=", l, (d, p) => d >= p);
}
function nr(e, t, n, r) {
  if (e === t) return !0;
  switch (typeof e) {
    case "string":
      return !1;
    case "bigint":
      return typeof t == "number" ? e == t : !1;
    case "number":
      return typeof t == "bigint" ? e == t : !1;
    case "boolean":
      return !1;
    case "object":
      if (typeof t != "object" || e === null || t === null) return !1;
      const i = r.objectTypesByConstructor.get(e.constructor)?.type, s = r.objectTypesByConstructor.get(t.constructor)?.type;
      if (!i || i !== s) return !1;
      const o = r.registry.findBinaryOverload("==", i, s);
      return o ? o.handler(e, t, n, r) : !1;
  }
  throw new j(`Cannot compare values of type ${typeof e}`, n);
}
const tw = (/* @__PURE__ */ new Map()).set("A", "dyn").set("T", "dyn").set("K", "dyn").set("V", "dyn");
class Jc extends Cf {
  constructor(t, n) {
    super(t), this.isEvaluating = n, this.Error = n ? j : Ty;
  }
  /**
   * Check an expression and return its inferred type
   * @param {Array|any} ast - The AST node to check
   * @returns {Object} The inferred type declaration
   * @throws {TypeError} If type checking fails
   */
  check(t, n) {
    return t.checkedType ??= t.check(this, t, n);
  }
  checkAccessOnType(t, n, r, i = !1) {
    if (r.kind === "dyn") return r;
    const s = (t.op === "[]" || t.op === "[?]" ? this.check(t.args[1], n) : this.stringType).type;
    if (r.kind === "list") {
      if (s !== "int" && s !== "dyn")
        throw new this.Error(`List index must be int, got '${s}'`, t);
      return r.valueType;
    }
    if (r.kind === "map") return r.valueType;
    const o = this.objectTypes.get(r.name);
    if (o) {
      if (!(s === "string" || s === "dyn"))
        throw new this.Error(
          `Cannot index type '${r.name}' with type '${s}'`,
          t
        );
      if (o.fields) {
        const a = t.op === "." || t.op === ".?" ? t.args[1] : void 0;
        if (a) {
          const c = o.fields[a];
          if (c) return c;
          if (i) return this.dynType;
          throw new this.Error(`No such key: ${a}`, t);
        }
      }
      return this.dynType;
    }
    throw new this.Error(`Cannot index type '${this.formatType(r)}'`, t);
  }
  formatType(t) {
    return t.hasPlaceholder() ? t.templated(this.registry, tw).name : t.name;
  }
  formatTypeList(t) {
    return t.map((n) => this.formatType(n)).join(", ");
  }
}
const ha = Je({
  maxAstNodes: 1e5,
  maxDepth: 250,
  maxListElements: 1e3,
  maxMapEntries: 1e3,
  maxCallArguments: 32
}), ew = new Set(fe(ha));
function nw(e, t = ha) {
  const n = e ? fe(e) : void 0;
  if (!n?.length) return t;
  const r = { ...t };
  for (const i of n) {
    if (!ew.has(i)) throw new TypeError(`Unknown limits option: ${i}`);
    const s = e[i];
    typeof s == "number" && (r[i] = s);
  }
  return Je(r);
}
const rw = Je({
  unlistedVariablesAreDyn: !1,
  homogeneousAggregateLiterals: !0,
  enableOptionalTypes: !1,
  limits: ha
});
function $s(e, t, n) {
  const r = e?.[n] ?? t?.[n];
  if (typeof r != "boolean") throw new TypeError(`Invalid option: ${n}`);
  return r;
}
function iw(e, t = rw) {
  return e ? Je({
    unlistedVariablesAreDyn: $s(e, t, "unlistedVariablesAreDyn"),
    homogeneousAggregateLiterals: $s(e, t, "homogeneousAggregateLiterals"),
    enableOptionalTypes: $s(e, t, "enableOptionalTypes"),
    limits: nw(e.limits, t.limits)
  }) : t;
}
const is = Vy({ enableOptionalTypes: !1 });
Iy(is);
Jy(is);
Qy(is);
const tu = /* @__PURE__ */ new WeakMap();
class yn {
  #t;
  #e;
  #n;
  #r;
  #i;
  constructor(t, n) {
    this.opts = iw(t, n?.opts), this.#t = (n instanceof yn ? tu.get(n) : is).clone(this.opts);
    const r = {
      objectTypes: this.#t.objectTypes,
      objectTypesByConstructor: this.#t.objectTypesByConstructor,
      registry: this.#t,
      opts: this.opts
    };
    this.#n = new Jc(r), this.#r = new Jc(r, !0), this.#e = new sw(r), this.#i = new Yy(this.opts.limits, this.#t), tu.set(this, this.#t), Object.freeze(this);
  }
  clone(t) {
    return new yn(t, this);
  }
  registerFunction(t, n) {
    return this.#t.registerFunctionOverload(t, n), this;
  }
  registerOperator(t, n) {
    return this.#t.registerOperatorOverload(t, n), this;
  }
  registerType(t, n) {
    return this.#t.registerType(t, n), this;
  }
  registerVariable(t, n) {
    return this.#t.registerVariable(t, n), this;
  }
  registerConstant(t, n, r) {
    return this.#t.registerConstant(t, n, r), this;
  }
  hasVariable(t) {
    return this.#t.variables.has(t);
  }
  check(t) {
    try {
      return this.#o(this.#i.parse(t));
    } catch (n) {
      return { valid: !1, error: n };
    }
  }
  #o(t) {
    try {
      const n = this.#n.check(t, new Cc(this.#t));
      return { valid: !0, type: this.#a(n) };
    } catch (n) {
      return { valid: !1, error: n };
    }
  }
  #a(t) {
    return t.name === "list<dyn>" ? "list" : t.name === "map<dyn, dyn>" ? "map" : t.name;
  }
  parse(t) {
    const n = this.#i.parse(t), r = this.#c.bind(this, n);
    return r.check = this.#o.bind(this, n), r.ast = n, r;
  }
  evaluate(t, n) {
    return this.#c(this.#i.parse(t), n);
  }
  #c(t, n) {
    return n = new Cc(this.#t, n), t.checkedType || this.#r.check(t, n), this.#e.eval(t, n);
  }
}
class sw extends Cf {
  constructor(t) {
    super(t), this.Error = j;
  }
  #t(t, n) {
    const r = t instanceof Array ? t[0] : t.values().next().value;
    return r === void 0 ? n : this.registry.getListType(this.debugRuntimeType(r, n.valueType));
  }
  #e(t) {
    if (t instanceof Map) return t.entries().next().value;
    for (const n in t) return [n, t[n]];
  }
  #n(t, n) {
    const r = this.#e(t);
    return r ? this.registry.getMapType(
      this.debugRuntimeType(r[0], n.keyType),
      this.debugRuntimeType(r[1], n.valueType)
    ) : n;
  }
  debugOperandType(t, n) {
    return n?.hasNoDynTypes() ? n : this.debugRuntimeType(t, n).wrappedType;
  }
  debugRuntimeType(t, n) {
    if (n?.hasNoDynTypes()) return n;
    const r = this.debugType(t);
    switch (r.kind) {
      case "list":
        return this.#t(t, r);
      case "map":
        return this.#n(t, r);
      default:
        return r;
    }
  }
  tryEval(t, n) {
    try {
      const r = this.eval(t, n);
      return r instanceof Promise ? r.catch((i) => i) : r;
    } catch (r) {
      return r;
    }
  }
  eval(t, n) {
    return t.evaluate(this, t, n);
  }
}
new yn({
  unlistedVariablesAreDyn: !0
});
const pa = "amount", ow = "expiry", aw = "birth", cw = "weight", uw = "inputType", lw = "script", Kn = {
  signature: "now(): double",
  implementation: () => Math.floor(Date.now() / 1e3)
}, eu = new yn().registerVariable(pa, "double").registerVariable(lw, "string").registerFunction(Kn.signature, Kn.implementation), fw = new yn().registerVariable(pa, "double").registerVariable(ow, "double").registerVariable(aw, "double").registerVariable(cw, "double").registerVariable(uw, "string").registerFunction(Kn.signature, Kn.implementation), dw = new yn().registerVariable(pa, "double").registerFunction(Kn.signature, Kn.implementation);
class Pt {
  constructor(t) {
    this.value = t;
  }
  get satoshis() {
    return this.value ? Math.ceil(this.value) : 0;
  }
  add(t) {
    return new Pt(this.value + t.value);
  }
}
Pt.ZERO = new Pt(0);
class Ff {
  /**
   * Creates a new Estimator with the given config
   * @param config - Configuration containing CEL programs for fee calculation
   */
  constructor(t) {
    this.config = t, this.intentOffchainInput = t.offchainInput ? Kr(t.offchainInput, fw) : void 0, this.intentOnchainInput = t.onchainInput ? Kr(t.onchainInput, dw) : void 0, this.intentOffchainOutput = t.offchainOutput ? Kr(t.offchainOutput, eu) : void 0, this.intentOnchainOutput = t.onchainOutput ? Kr(t.onchainOutput, eu) : void 0;
  }
  /**
   * Evaluates the fee for a given vtxo input
   * @param input - The offchain input to evaluate
   * @returns The fee amount for this input
   */
  evalOffchainInput(t) {
    if (!this.intentOffchainInput)
      return Pt.ZERO;
    const n = hw(t);
    return new Pt(this.intentOffchainInput.program(n));
  }
  /**
   * Evaluates the fee for a given boarding input
   * @param input - The onchain input to evaluate
   * @returns The fee amount for this input
   */
  evalOnchainInput(t) {
    if (!this.intentOnchainInput)
      return Pt.ZERO;
    const n = {
      amount: Number(t.amount)
    };
    return new Pt(this.intentOnchainInput.program(n));
  }
  /**
   * Evaluates the fee for a given vtxo output
   * @param output - The output to evaluate
   * @returns The fee amount for this output
   */
  evalOffchainOutput(t) {
    if (!this.intentOffchainOutput)
      return Pt.ZERO;
    const n = nu(t);
    return new Pt(this.intentOffchainOutput.program(n));
  }
  /**
   * Evaluates the fee for a given collaborative exit output
   * @param output - The output to evaluate
   * @returns The fee amount for this output
   */
  evalOnchainOutput(t) {
    if (!this.intentOnchainOutput)
      return Pt.ZERO;
    const n = nu(t);
    return new Pt(this.intentOnchainOutput.program(n));
  }
  /**
   * Evaluates the fee for a given set of inputs and outputs
   * @param offchainInputs - Array of offchain inputs to evaluate
   * @param onchainInputs - Array of onchain inputs to evaluate
   * @param offchainOutputs - Array of offchain outputs to evaluate
   * @param onchainOutputs - Array of onchain outputs to evaluate
   * @returns The total fee amount
   */
  eval(t, n, r, i) {
    let s = Pt.ZERO;
    for (const o of t)
      s = s.add(this.evalOffchainInput(o));
    for (const o of n)
      s = s.add(this.evalOnchainInput(o));
    for (const o of r)
      s = s.add(this.evalOffchainOutput(o));
    for (const o of i)
      s = s.add(this.evalOnchainOutput(o));
    return s;
  }
}
function hw(e) {
  const t = {
    amount: Number(e.amount),
    inputType: e.type,
    weight: e.weight
  };
  return e.expiry && (t.expiry = Math.floor(e.expiry.getTime() / 1e3)), e.birth && (t.birth = Math.floor(e.birth.getTime() / 1e3)), t;
}
function nu(e) {
  return {
    amount: Number(e.amount),
    script: e.script
  };
}
function Kr(e, t) {
  const n = t.parse(e), r = n.check();
  if (!r.valid)
    throw new Error(`type check failed: ${r.error?.message ?? "unknown error"}`);
  if (r.type !== "double")
    throw new Error(`expected return type double, got ${r.type}`);
  return { program: n, text: e };
}
const rr = {
  commitmentTxid: "",
  boardingTxid: "",
  arkTxid: ""
};
async function pw(e, t, n, r) {
  const i = [...e].sort((u, l) => u.createdAt.getTime() - l.createdAt.getTime()), s = [];
  let o = [];
  for (const u of i)
    if (u.status.isLeaf ? !n.has(u.virtualStatus.commitmentTxIds[0]) && i.filter((l) => l.settledBy === u.virtualStatus.commitmentTxIds[0]).length === 0 && o.push({
      key: {
        ...rr,
        commitmentTxid: u.virtualStatus.commitmentTxIds[0]
      },
      tag: "batch",
      type: Ee.TxReceived,
      amount: u.value,
      settled: u.status.isLeaf || u.isSpent,
      createdAt: u.createdAt.getTime()
    }) : i.filter((l) => l.arkTxId === u.txid).length === 0 && o.push({
      key: { ...rr, arkTxid: u.txid },
      tag: "offchain",
      type: Ee.TxReceived,
      amount: u.value,
      settled: u.status.isLeaf || u.isSpent,
      createdAt: u.createdAt.getTime()
    }), u.isSpent) {
      if (u.arkTxId && !s.some((l) => l.key.arkTxid === u.arkTxId)) {
        const l = i.filter((h) => h.txid === u.arkTxId), p = i.filter((h) => h.arkTxId === u.arkTxId).reduce((h, w) => h + w.value, 0);
        let g = 0, f = 0;
        if (l.length > 0) {
          const h = l.reduce((w, E) => w + E.value, 0);
          g = p - h, f = l[0].createdAt.getTime();
        } else
          g = p, f = r ? await r(u.arkTxId) : u.createdAt.getTime() + 1;
        s.push({
          key: { ...rr, arkTxid: u.arkTxId },
          tag: "offchain",
          type: Ee.TxSent,
          amount: g,
          settled: !0,
          createdAt: f
        });
      }
      if (u.settledBy && !n.has(u.settledBy) && !s.some((l) => l.key.commitmentTxid === u.settledBy)) {
        const l = i.filter((g) => g.status.isLeaf && g.virtualStatus.commitmentTxIds?.every((f) => u.settledBy === f)), p = i.filter((g) => g.settledBy === u.settledBy).reduce((g, f) => g + f.value, 0);
        if (l.length > 0) {
          const g = l.reduce((f, h) => f + h.value, 0);
          p > g && s.push({
            key: { ...rr, commitmentTxid: u.settledBy },
            tag: "exit",
            type: Ee.TxSent,
            amount: p - g,
            settled: !0,
            createdAt: l[0].createdAt.getTime()
          });
        } else
          s.push({
            key: { ...rr, commitmentTxid: u.settledBy },
            tag: "exit",
            type: Ee.TxSent,
            amount: p,
            settled: !0,
            // TODO: fetch commitment tx with /v1/indexer/commitmentTx/<commitmentTxid> to know when the tx was made
            createdAt: u.createdAt.getTime() + 1
          });
      }
    }
  return [...t.map((u) => ({ ...u, tag: "boarding" })), ...s, ...o].sort((u, l) => l.createdAt - u.createdAt);
}
var bo;
(function(e) {
  class t extends Ot {
    constructor(r) {
      const i = new mr.Script(r), { delegatePubKey: s, pubKey: o, serverPubKey: a } = r, c = Ft.encode({
        pubkeys: [o, s, a]
      }).script;
      super([...i.scripts, c]), this.options = r, this.defaultVtxo = i, this.delegateScript = B.encode(c);
    }
    forfeit() {
      return this.findLeaf(this.defaultVtxo.forfeitScript);
    }
    exit() {
      return this.findLeaf(this.defaultVtxo.exitScript);
    }
    delegate() {
      return this.findLeaf(this.delegateScript);
    }
  }
  e.Script = t;
})(bo || (bo = {}));
class gw {
  constructor(t, n, r) {
    this.delegatorProvider = t, this.arkInfoProvider = n, this.identity = r;
  }
  async delegate(t, n, r) {
    if (t.length === 0)
      return { delegated: [], failed: [] };
    const i = ke.decode(n).pkScript;
    if (r) {
      try {
        await Ns(this.identity, this.delegatorProvider, this.arkInfoProvider, t, i, r);
      } catch (p) {
        return { delegated: [], failed: [{ outpoints: t, error: p }] };
      }
      return { delegated: t, failed: [] };
    }
    const s = /* @__PURE__ */ new Map();
    let o = [];
    for (const p of t) {
      if (Mn(p)) {
        o.push(p);
        continue;
      }
      const g = p.virtualStatus.batchExpiry;
      if (!g)
        continue;
      const f = mw(g);
      s.set(f, [
        ...s.get(f) ?? [],
        p
      ]);
    }
    if (s.size === 0) {
      try {
        await Ns(this.identity, this.delegatorProvider, this.arkInfoProvider, o, i, r);
      } catch (p) {
        return {
          delegated: [],
          failed: [{ outpoints: o, error: p }]
        };
      }
      return { delegated: o, failed: [] };
    }
    const a = Math.min(...s.keys());
    s.set(a, [
      ...s.get(a) ?? [],
      ...o
    ]);
    const c = Array.from(s.entries()), u = await Promise.allSettled(c.map(async ([, p]) => Ns(this.identity, this.delegatorProvider, this.arkInfoProvider, p, i))), l = [], d = [];
    for (const [p, g] of u.entries()) {
      const f = c[p][1];
      if (g.status === "rejected") {
        d.push({ outpoints: f, error: g.reason });
        continue;
      }
      l.push(...f);
    }
    return { delegated: l, failed: d };
  }
}
async function Ns(e, t, n, r, i, s) {
  if (r.length === 0)
    throw new Error("unable to delegate: no vtxos provided");
  if (!t)
    throw new Error("unable to delegate: delegator provider not configured");
  if (!s) {
    const P = r.filter((m) => !Mn(m) && m.virtualStatus.batchExpiry).reduce((m, Q) => Math.min(m, Q.virtualStatus.batchExpiry), Number.MAX_SAFE_INTEGER);
    if (!P || P === Number.MAX_SAFE_INTEGER)
      s = new Date(Date.now() + 60 * 1e3);
    else {
      const m = P - Date.now();
      m <= 0 ? s = new Date(Date.now() + 60 * 1e3) : s = new Date(P - m * 0.1);
    }
  }
  const { fees: o, dust: a, forfeitAddress: c, network: u } = await n.getInfo(), l = s.getTime() / 1e3, d = new Ff({
    ...o.intentFee,
    // replace now() function with the delegateAt timestamp
    offchainInput: o.intentFee.offchainInput?.replace("now()", `double(${l})`),
    offchainOutput: o.intentFee.offchainOutput?.replace("now()", `double(${l})`)
  });
  let p = 0n;
  for (const P of r) {
    const m = d.evalOffchainInput({
      amount: BigInt(P.value),
      type: "vtxo",
      weight: 0,
      birth: P.createdAt,
      expiry: P.virtualStatus.batchExpiry ? new Date(P.virtualStatus.batchExpiry) : void 0
    });
    m.value >= P.value || (p += BigInt(P.value) - BigInt(m.value));
  }
  const { delegatorAddress: g, pubkey: f, fee: h } = await t.getDelegateInfo(), w = [], E = BigInt(Number(h));
  E > 0n && w.push({
    script: ke.decode(g).pkScript,
    amount: E
  });
  const S = w.reduce((P, m) => !m.amount || !m.script ? P : P + d.evalOffchainOutput({
    amount: m.amount,
    script: B.encode(m.script)
  }).satoshis, 0);
  if (p - BigInt(S) <= a)
    throw new Error("Amount is below dust limit, cannot delegate");
  if (p -= BigInt(S), p -= E, p <= a)
    throw new Error("Amount is below dust limit, cannot delegate");
  w.push({
    script: i,
    amount: p
  });
  const O = await ww(e, r, w, [], [f], l), R = ht.encode(Ie(Af(u)).decode(c)), L = await Promise.all(r.filter((P) => !Mn(P)).map(async (P) => {
    const m = await yw(P, a, f, R, e);
    return pt.encode(m.toPSBT());
  }));
  await t.delegate(O, L);
}
async function yw(e, t, n, r, i) {
  n.length === 66 && (n = n.slice(2));
  const o = Ot.decode(e.tapTree).leaves.find((c) => {
    const u = aa(In(c));
    return !(!Ft.is(u) || !u.params.pubkeys.map(B.encode).includes(n));
  });
  if (!o)
    throw new Error(`delegate tap leaf not found for input: ${e.txid}:${e.vout}`);
  const a = If([
    {
      txid: e.txid,
      index: e.vout,
      witnessUtxo: {
        amount: BigInt(e.value),
        script: Ot.decode(e.tapTree).pkScript
      },
      sighashType: Ge.ALL_ANYONECANPAY,
      tapLeafScript: [o]
    }
  ], {
    script: r,
    amount: BigInt(e.value) + t
  });
  return i.sign(a);
}
async function ww(e, t, n, r, i, s) {
  const o = {
    type: "register",
    onchain_output_indexes: r,
    valid_at: Math.floor(s),
    expire_at: 0,
    cosigners_public_keys: i
  }, a = ue.create(o, t, n), c = await e.sign(a);
  return {
    proof: pt.encode(c.toPSBT()),
    message: o
  };
}
function mw(e) {
  const t = new Date(e);
  return t.setUTCHours(0, 0, 0, 0), t.getTime();
}
function bw(e) {
  return typeof e == "object" && e !== null && "toReadonly" in e && typeof e.toReadonly == "function";
}
class dn {
  constructor(t, n, r, i, s, o, a, c, u, l, d) {
    this.identity = t, this.network = n, this.onchainProvider = r, this.indexerProvider = i, this.arkServerPublicKey = s, this.offchainTapscript = o, this.boardingTapscript = a, this.dustAmount = c, this.walletRepository = u, this.contractRepository = l, this.delegatorProvider = d;
  }
  /**
   * Protected helper to set up shared wallet configuration.
   * Extracts common logic used by both ReadonlyWallet.create() and Wallet.create().
   */
  static async setupWalletConfig(t, n) {
    const r = t.arkProvider || (() => {
      if (!t.arkServerUrl)
        throw new Error("Either arkProvider or arkServerUrl must be provided");
      return new vf(t.arkServerUrl);
    })(), i = t.arkServerUrl || r.serverUrl;
    if (!i)
      throw new Error("Could not determine arkServerUrl from provider");
    const s = t.indexerUrl || i, o = t.indexerProvider || new Bf(s), a = await r.getInfo(), c = Af(a.network), u = t.esploraUrl || jg[a.network], l = t.onchainProvider || new Wg(u);
    if (t.exitTimelock) {
      const { value: L, type: P } = t.exitTimelock;
      if (L < 512n && P !== "blocks" || L >= 512n && P !== "seconds")
        throw new Error("invalid exitTimelock");
    }
    const d = t.exitTimelock ?? {
      value: a.unilateralExitDelay,
      type: a.unilateralExitDelay < 512n ? "blocks" : "seconds"
    };
    if (t.boardingTimelock) {
      const { value: L, type: P } = t.boardingTimelock;
      if (L < 512n && P !== "blocks" || L >= 512n && P !== "seconds")
        throw new Error("invalid boardingTimelock");
    }
    const p = t.boardingTimelock ?? {
      value: a.boardingExitDelay,
      type: a.boardingExitDelay < 512n ? "blocks" : "seconds"
    }, g = B.decode(a.signerPubkey).slice(1), f = t.delegatorProvider ? await t.delegatorProvider.getDelegateInfo().then((L) => B.decode(L.pubkey).slice(1)) : void 0, h = {
      pubKey: n,
      serverPubKey: g,
      csvTimelock: d
    }, w = f ? new bo.Script({ ...h, delegatePubKey: f }) : new mr.Script(h), E = new mr.Script({
      ...h,
      csvTimelock: p
    }), S = t.storage || new wy(), O = new yo(S), R = new Ey(S);
    return {
      arkProvider: r,
      indexerProvider: o,
      onchainProvider: l,
      network: c,
      networkName: a.network,
      serverPubKey: g,
      offchainTapscript: w,
      boardingTapscript: E,
      dustAmount: a.dust,
      walletRepository: O,
      contractRepository: R,
      info: a,
      delegatorProvider: t.delegatorProvider
    };
  }
  static async create(t) {
    const n = await t.identity.xOnlyPublicKey();
    if (!n)
      throw new Error("Invalid configured public key");
    const r = await dn.setupWalletConfig(t, n);
    return new dn(t.identity, r.network, r.onchainProvider, r.indexerProvider, r.serverPubKey, r.offchainTapscript, r.boardingTapscript, r.dustAmount, r.walletRepository, r.contractRepository, r.delegatorProvider);
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
    let r = 0, i = 0;
    for (const l of t)
      l.status.confirmed ? r += l.value : i += l.value;
    let s = 0, o = 0, a = 0;
    s = n.filter((l) => l.virtualStatus.state === "settled").reduce((l, d) => l + d.value, 0), o = n.filter((l) => l.virtualStatus.state === "preconfirmed").reduce((l, d) => l + d.value, 0), a = n.filter((l) => ve(l) && l.virtualStatus.state === "swept").reduce((l, d) => l + d.value, 0);
    const c = r + i, u = s + o + a;
    return {
      boarding: {
        confirmed: r,
        unconfirmed: i,
        total: c
      },
      settled: s,
      preconfirmed: o,
      available: s + o,
      recoverable: a,
      total: c + u
    };
  }
  async getVtxos(t) {
    const n = await this.getAddress(), i = (await this.getVirtualCoins(t)).map((s) => Fe(this, s));
    return await this.walletRepository.saveVtxos(n, i), i;
  }
  async getVirtualCoins(t = { withRecoverable: !0, withUnrolled: !1 }) {
    const n = [B.encode(this.offchainTapscript.pkScript)], i = (await this.indexerProvider.getVtxos({ scripts: n })).vtxos;
    let s = i.filter(ve);
    if (t.withRecoverable || (s = s.filter((o) => !Mn(o) && !xf(o))), t.withUnrolled) {
      const o = i.filter((a) => !ve(a));
      s.push(...o.filter((a) => a.isUnrolled));
    }
    return s;
  }
  async getTransactionHistory() {
    const t = await this.indexerProvider.getVtxos({
      scripts: [B.encode(this.offchainTapscript.pkScript)]
    }), { boardingTxs: n, commitmentsToIgnore: r } = await this.getBoardingTxs(), i = (s) => this.indexerProvider.getVtxos({ outpoints: [{ txid: s, vout: 0 }] }).then((o) => o.vtxos[0]?.createdAt.getTime() || 0);
    return pw(t.vtxos, n, r, i);
  }
  async getBoardingTxs() {
    const t = [], n = /* @__PURE__ */ new Set(), r = await this.getBoardingAddress(), i = await this.onchainProvider.getTransactions(r);
    for (const a of i)
      for (let c = 0; c < a.vout.length; c++) {
        const u = a.vout[c];
        if (u.scriptpubkey_address === r) {
          const d = (await this.onchainProvider.getTxOutspends(a.txid))[c];
          d?.spent && n.add(d.txid), t.push({
            txid: a.txid,
            vout: c,
            value: Number(u.value),
            status: {
              confirmed: a.status.confirmed,
              block_time: a.status.block_time
            },
            isUnrolled: !0,
            virtualStatus: {
              state: d?.spent ? "spent" : "settled",
              commitmentTxIds: d?.spent ? [d.txid] : void 0
            },
            createdAt: a.status.confirmed ? new Date(a.status.block_time * 1e3) : /* @__PURE__ */ new Date(0)
          });
        }
      }
    const s = [], o = [];
    for (const a of t) {
      const c = {
        key: {
          boardingTxid: a.txid,
          commitmentTxid: "",
          arkTxid: ""
        },
        amount: a.value,
        type: Ee.TxReceived,
        settled: a.virtualStatus.state === "spent",
        createdAt: a.status.block_time ? new Date(a.status.block_time * 1e3).getTime() : 0
      };
      a.status.block_time ? o.push(c) : s.push(c);
    }
    return {
      boardingTxs: [...s, ...o],
      commitmentsToIgnore: n
    };
  }
  async getBoardingUtxos() {
    const t = await this.getBoardingAddress(), r = (await this.onchainProvider.getCoins(t)).map((i) => wo(this, i));
    return await this.walletRepository.saveUtxos(t, r), r;
  }
  async notifyIncomingFunds(t) {
    const n = await this.getAddress(), r = await this.getBoardingAddress();
    let i, s;
    if (this.onchainProvider && r) {
      const a = (c) => c.vout.findIndex((u) => u.scriptpubkey_address === r);
      i = await this.onchainProvider.watchAddresses([r], (c) => {
        const u = c.filter((l) => a(l) !== -1).map((l) => {
          const { txid: d, status: p } = l, g = a(l), f = Number(l.vout[g].value);
          return { txid: d, vout: g, value: f, status: p };
        });
        t({
          type: "utxo",
          coins: u
        });
      });
    }
    if (this.indexerProvider && n) {
      const a = this.offchainTapscript, c = await this.indexerProvider.subscribeForScripts([
        B.encode(a.pkScript)
      ]), u = new AbortController(), l = this.indexerProvider.getSubscription(c, u.signal);
      s = async () => {
        u.abort(), await this.indexerProvider?.unsubscribeForScripts(c);
      }, (async () => {
        try {
          for await (const d of l)
            (d.newVtxos?.length > 0 || d.spentVtxos?.length > 0) && t({
              type: "vtxo",
              newVtxos: d.newVtxos.map((p) => Fe(this, p)),
              spentVtxos: d.spentVtxos.map((p) => Fe(this, p))
            });
        } catch (d) {
          console.error("Subscription error:", d);
        }
      })();
    }
    return () => {
      i?.(), s?.();
    };
  }
  async fetchPendingTxs() {
    const t = [B.encode(this.offchainTapscript.pkScript)];
    let { vtxos: n } = await this.indexerProvider.getVtxos({
      scripts: t
    });
    return n.filter((r) => r.virtualStatus.state !== "swept" && r.virtualStatus.state !== "settled" && r.arkTxId !== void 0).map((r) => r.arkTxId);
  }
}
class zn extends dn {
  constructor(t, n, r, i, s, o, a, c, u, l, d, p, g, f, h, w, E) {
    super(t, n, i, o, a, c, u, g, f, h, E), this.networkName = r, this.arkProvider = s, this.serverUnrollScript = l, this.forfeitOutputScript = d, this.forfeitPubkey = p, this.identity = t, this.renewalConfig = {
      enabled: w?.enabled ?? !1,
      ...hy,
      ...w
    }, this.delegatorManager = E ? new gw(E, s, t) : void 0;
  }
  static async create(t) {
    const n = await t.identity.xOnlyPublicKey();
    if (!n)
      throw new Error("Invalid configured public key");
    const r = await dn.setupWalletConfig(t, n);
    let i;
    try {
      const c = B.decode(r.info.checkpointTapscript);
      i = Mt.decode(c);
    } catch {
      throw new Error("Invalid checkpointTapscript from server");
    }
    const s = B.decode(r.info.forfeitPubkey).slice(1), o = Ie(r.network).decode(r.info.forfeitAddress), a = ht.encode(o);
    return new zn(t.identity, r.network, r.networkName, r.onchainProvider, r.arkProvider, r.indexerProvider, r.serverPubKey, r.offchainTapscript, r.boardingTapscript, i, a, s, r.dustAmount, r.walletRepository, r.contractRepository, t.renewalConfig, t.delegatorProvider);
  }
  /**
   * Convert this wallet to a readonly wallet.
   *
   * @returns A readonly wallet with the same configuration but readonly identity
   * @example
   * ```typescript
   * const wallet = await Wallet.create({ identity: SingleKey.fromHex('...'), ... });
   * const readonlyWallet = await wallet.toReadonly();
   *
   * // Can query balance and addresses
   * const balance = await readonlyWallet.getBalance();
   * const address = await readonlyWallet.getAddress();
   *
   * // But cannot send transactions (type error)
   * // readonlyWallet.sendBitcoin(...); // TypeScript error
   * ```
   */
  async toReadonly() {
    const t = bw(this.identity) ? await this.identity.toReadonly() : this.identity;
    return new dn(t, this.network, this.onchainProvider, this.indexerProvider, this.arkServerPublicKey, this.offchainTapscript, this.boardingTapscript, this.dustAmount, this.walletRepository, this.contractRepository);
  }
  async sendBitcoin(t) {
    if (t.amount <= 0)
      throw new Error("Amount must be positive");
    if (!Ew(t.address))
      throw new Error("Invalid Ark address " + t.address);
    const n = await this.getVirtualCoins({
      withRecoverable: !1
    });
    let r;
    if (t.selectedVtxos) {
      const f = t.selectedVtxos.map((w) => w.value).reduce((w, E) => w + E, 0);
      if (f < t.amount)
        throw new Error("Selected VTXOs do not cover specified amount");
      const h = f - t.amount;
      r = {
        inputs: t.selectedVtxos,
        changeAmount: BigInt(h)
      };
    } else
      r = xw(n, t.amount);
    const i = this.offchainTapscript.forfeit();
    if (!i)
      throw new Error("Selected leaf not found");
    const s = ke.decode(t.address), a = [
      {
        script: BigInt(t.amount) < this.dustAmount ? s.subdustPkScript : s.pkScript,
        amount: BigInt(t.amount)
      }
    ];
    if (r.changeAmount > 0n) {
      const f = r.changeAmount < this.dustAmount ? this.arkAddress.subdustPkScript : this.arkAddress.pkScript;
      a.push({
        script: f,
        amount: BigInt(r.changeAmount)
      });
    }
    const c = this.offchainTapscript.encode(), u = cy(r.inputs.map((f) => ({
      ...f,
      tapLeafScript: i,
      tapTree: c
    })), a, this.serverUnrollScript), l = await this.identity.sign(u.arkTx), { arkTxid: d, signedCheckpointTxs: p } = await this.arkProvider.submitTx(pt.encode(l.toPSBT()), u.checkpoints.map((f) => pt.encode(f.toPSBT()))), g = await Promise.all(p.map(async (f) => {
      const h = Qt.fromPSBT(pt.decode(f)), w = await this.identity.sign(h);
      return pt.encode(w.toPSBT());
    }));
    await this.arkProvider.finalizeTx(d, g);
    try {
      const f = [], h = /* @__PURE__ */ new Set();
      let w = Number.MAX_SAFE_INTEGER;
      for (const [O, R] of r.inputs.entries()) {
        const L = Fe(this, R), P = p[O], m = Qt.fromPSBT(pt.decode(P));
        if (f.push({
          ...L,
          virtualStatus: { ...L.virtualStatus, state: "spent" },
          spentBy: m.id,
          arkTxId: d,
          isSpent: !0
        }), L.virtualStatus.commitmentTxIds)
          for (const Q of L.virtualStatus.commitmentTxIds)
            h.add(Q);
        L.virtualStatus.batchExpiry && (w = Math.min(w, L.virtualStatus.batchExpiry));
      }
      const E = Date.now(), S = this.arkAddress.encode();
      if (r.changeAmount > 0n && w !== Number.MAX_SAFE_INTEGER) {
        const O = {
          txid: d,
          vout: a.length - 1,
          createdAt: new Date(E),
          forfeitTapLeafScript: this.offchainTapscript.forfeit(),
          intentTapLeafScript: this.offchainTapscript.forfeit(),
          isUnrolled: !1,
          isSpent: !1,
          tapTree: this.offchainTapscript.encode(),
          value: Number(r.changeAmount),
          virtualStatus: {
            state: "preconfirmed",
            commitmentTxIds: Array.from(h),
            batchExpiry: w
          },
          status: {
            confirmed: !1
          }
        };
        await this.walletRepository.saveVtxos(S, [O]);
      }
      await this.walletRepository.saveVtxos(S, f), await this.walletRepository.saveTransactions(S, [
        {
          key: {
            boardingTxid: "",
            commitmentTxid: "",
            arkTxid: d
          },
          amount: t.amount,
          type: Ee.TxSent,
          settled: !1,
          createdAt: Date.now()
        }
      ]);
    } catch (f) {
      console.warn("error saving offchain tx to repository", f);
    } finally {
      return d;
    }
  }
  async settle(t, n) {
    if (t?.inputs) {
      for (const f of t.inputs)
        if (typeof f == "string")
          try {
            wt.fromString(f);
          } catch {
            throw new Error(`Invalid arknote "${f}"`);
          }
    }
    if (!t) {
      const { fees: f } = await this.arkProvider.getInfo(), h = new Ff(f.intentFee);
      let w = 0;
      const S = Mt.decode(B.decode(this.boardingTapscript.exitScript)).params.timelock, O = (await this.getBoardingUtxos()).filter((et) => !fy(et, S)), R = [];
      for (const et of O) {
        const lt = h.evalOnchainInput({
          amount: BigInt(et.value)
        });
        lt.value >= et.value || (R.push(et), w += et.value - lt.satoshis);
      }
      const L = await this.getVtxos({ withRecoverable: !0 }), P = [];
      for (const et of L) {
        const lt = h.evalOffchainInput({
          amount: BigInt(et.value),
          type: et.virtualStatus.state === "swept" ? "recoverable" : "vtxo",
          weight: 0,
          birth: et.createdAt,
          expiry: et.virtualStatus.batchExpiry ? new Date(et.virtualStatus.batchExpiry * 1e3) : /* @__PURE__ */ new Date()
        });
        lt.value >= et.value || (P.push(et), w += et.value - lt.satoshis);
      }
      const m = [...R, ...P];
      if (m.length === 0)
        throw new Error("No inputs found");
      const Q = {
        address: await this.getAddress(),
        amount: BigInt(w)
      }, _ = h.evalOffchainOutput({
        amount: Q.amount,
        script: B.encode(ke.decode(Q.address).pkScript)
      });
      if (Q.amount -= BigInt(_.satoshis), Q.amount <= this.dustAmount)
        throw new Error("Output amount is below dust limit");
      t = {
        inputs: m,
        outputs: [Q]
      };
    }
    const r = [], i = [];
    let s = !1;
    for (const [f, h] of t.outputs.entries()) {
      let w;
      try {
        w = ke.decode(h.address).pkScript, s = !0;
      } catch {
        const E = Ie(this.network).decode(h.address);
        w = ht.encode(E), r.push(f);
      }
      i.push({
        amount: h.amount,
        script: w
      });
    }
    let o;
    const a = [];
    s && (o = this.identity.signerSession(), a.push(B.encode(await o.getPublicKey())));
    const [c, u] = await Promise.all([
      this.makeRegisterIntentSignature(t.inputs, i, r, a),
      this.makeDeleteIntentSignature(t.inputs)
    ]), l = await this.safeRegisterIntent(c), d = [
      ...a,
      ...t.inputs.map((f) => `${f.txid}:${f.vout}`)
    ], p = this.createBatchHandler(l, t.inputs, o), g = new AbortController();
    try {
      const f = this.arkProvider.getEventStream(g.signal, d);
      return await po.join(f, p, {
        abortController: g,
        skipVtxoTreeSigning: !s,
        eventCallback: n ? (h) => Promise.resolve(n(h)) : void 0
      });
    } catch (f) {
      throw await this.arkProvider.deleteIntent(u).catch(() => {
      }), f;
    } finally {
      g.abort();
    }
  }
  async handleSettlementFinalizationEvent(t, n, r, i) {
    const s = [], o = await this.getVirtualCoins();
    let a = Qt.fromPSBT(pt.decode(t.commitmentTx)), c = !1, u = 0;
    const l = i?.leaves() || [];
    for (const d of n) {
      const p = o.find((O) => O.txid === d.txid && O.vout === d.vout);
      if (!p) {
        for (let O = 0; O < a.inputsLength; O++) {
          const R = a.getInput(O);
          if (!R.txid || R.index === void 0)
            throw new Error("The server returned incomplete data. No settlement input found in the PSBT");
          if (B.encode(R.txid) === d.txid && R.index === d.vout) {
            a.updateInput(O, {
              tapLeafScript: [d.forfeitTapLeafScript]
            }), a = await this.identity.sign(a, [
              O
            ]), c = !0;
            break;
          }
        }
        continue;
      }
      if (Mn(p) || Tf(p, this.dustAmount))
        continue;
      if (l.length === 0)
        throw new Error("connectors not received");
      if (u >= l.length)
        throw new Error("not enough connectors received");
      const g = l[u], f = g.id, h = g.getOutput(0);
      if (!h)
        throw new Error("connector output not found");
      const w = h.amount, E = h.script;
      if (!w || !E)
        throw new Error("invalid connector output");
      u++;
      let S = Xg([
        {
          txid: d.txid,
          index: d.vout,
          witnessUtxo: {
            amount: BigInt(p.value),
            script: Ot.decode(d.tapTree).pkScript
          },
          sighashType: Ge.DEFAULT,
          tapLeafScript: [d.forfeitTapLeafScript]
        },
        {
          txid: f,
          index: 0,
          witnessUtxo: {
            amount: w,
            script: E
          }
        }
      ], r);
      S = await this.identity.sign(S, [0]), s.push(pt.encode(S.toPSBT()));
    }
    (s.length > 0 || c) && await this.arkProvider.submitSignedForfeitTxs(s, c ? pt.encode(a.toPSBT()) : void 0);
  }
  /**
   * @implements Batch.Handler interface.
   * @param intentId - The intent ID.
   * @param inputs - The inputs of the intent.
   * @param session - The musig2 signing session, if not provided, the signing will be skipped.
   */
  createBatchHandler(t, n, r) {
    let i;
    return {
      onBatchStarted: async (s) => {
        const o = new TextEncoder().encode(t), a = vt(o), c = B.encode(a);
        let u = !0;
        for (const d of s.intentIdHashes)
          if (d === c) {
            if (!this.arkProvider)
              throw new Error("Ark provider not configured");
            await this.arkProvider.confirmRegistration(t), u = !1;
          }
        if (u)
          return { skip: u };
        const l = Mt.encode({
          timelock: {
            value: s.batchExpiry,
            type: s.batchExpiry >= 512n ? "seconds" : "blocks"
          },
          pubkeys: [this.forfeitPubkey]
        }).script;
        return i = or(l), { skip: !1 };
      },
      onTreeSigningStarted: async (s, o) => {
        if (!r)
          return { skip: !0 };
        if (!i)
          throw new Error("Sweep tap tree root not set");
        const a = s.cosignersPublicKeys.map((f) => f.slice(2)), u = (await r.getPublicKey()).subarray(1);
        if (!a.includes(B.encode(u)))
          return { skip: !0 };
        const l = Qt.fromPSBT(pt.decode(s.unsignedCommitmentTx));
        ay(o, l, i);
        const d = l.getOutput(0);
        if (!d?.amount)
          throw new Error("Shared output not found");
        await r.init(o, i, d.amount);
        const p = B.encode(await r.getPublicKey()), g = await r.getNonces();
        return await this.arkProvider.submitTreeNonces(s.id, p, g), { skip: !1 };
      },
      onTreeNonces: async (s) => {
        if (!r)
          return { fullySigned: !0 };
        const { hasAllNonces: o } = await r.aggregatedNonces(s.txid, s.nonces);
        if (!o)
          return { fullySigned: !1 };
        const a = await r.sign(), c = B.encode(await r.getPublicKey());
        return await this.arkProvider.submitTreeSignatures(s.id, c, a), { fullySigned: !0 };
      },
      onBatchFinalization: async (s, o, a) => {
        if (!this.forfeitOutputScript)
          throw new Error("Forfeit output script not set");
        a && oy(s.commitmentTx, a), await this.handleSettlementFinalizationEvent(s, n, this.forfeitOutputScript, a);
      }
    };
  }
  async safeRegisterIntent(t) {
    try {
      return await this.arkProvider.registerIntent(t);
    } catch (n) {
      if (n instanceof Sf && n.code === 0 && n.message.includes("duplicated input")) {
        const r = await this.getVtxos({
          withRecoverable: !0
        }), i = await this.makeDeleteIntentSignature(r);
        return await this.arkProvider.deleteIntent(i), this.arkProvider.registerIntent(t);
      }
      throw n;
    }
  }
  async makeRegisterIntentSignature(t, n, r, i, s) {
    const o = {
      type: "register",
      onchain_output_indexes: r,
      valid_at: s ? Math.floor(s) : 0,
      expire_at: 0,
      cosigners_public_keys: i
    }, a = ue.create(o, t, n), c = await this.identity.sign(a);
    return {
      proof: pt.encode(c.toPSBT()),
      message: o
    };
  }
  async makeDeleteIntentSignature(t) {
    const n = {
      type: "delete",
      expire_at: 0
    }, r = ue.create(n, t, []), i = await this.identity.sign(r);
    return {
      proof: pt.encode(i.toPSBT()),
      message: n
    };
  }
  async makeGetPendingTxIntentSignature(t) {
    const n = {
      type: "get-pending-tx",
      expire_at: 0
    }, r = ue.create(n, t, []), i = await this.identity.sign(r);
    return {
      proof: pt.encode(i.toPSBT()),
      message: n
    };
  }
  /**
   * Finalizes pending transactions by retrieving them from the server and finalizing each one.
   * @param vtxos - Optional list of VTXOs to use instead of retrieving them from the server
   * @returns Array of transaction IDs that were finalized
   */
  async finalizePendingTxs(t) {
    if (!t || t.length === 0) {
      const s = [B.encode(this.offchainTapscript.pkScript)];
      let { vtxos: o } = await this.indexerProvider.getVtxos({
        scripts: s
      });
      if (o = o.filter((a) => a.virtualStatus.state !== "swept" && a.virtualStatus.state !== "settled"), o.length === 0)
        return { finalized: [], pending: [] };
      t = o.map((a) => Fe(this, a));
    }
    const r = [], i = [];
    for (let s = 0; s < t.length; s += 20) {
      const o = t.slice(s, s + 20), a = await this.makeGetPendingTxIntentSignature(o), c = await this.arkProvider.getPendingTxs(a);
      for (const u of c) {
        i.push(u.arkTxid);
        try {
          const l = await Promise.all(u.signedCheckpointTxs.map(async (d) => {
            const p = Qt.fromPSBT(pt.decode(d)), g = await this.identity.sign(p);
            return pt.encode(g.toPSBT());
          }));
          await this.arkProvider.finalizeTx(u.arkTxid, l), r.push(u.arkTxid);
        } catch (l) {
          console.error(`Failed to finalize transaction ${u.arkTxid}:`, l);
        }
      }
    }
    return { finalized: r, pending: i };
  }
}
zn.MIN_FEE_RATE = 1;
function Ew(e) {
  try {
    return ke.decode(e), !0;
  } catch {
    return !1;
  }
}
function xw(e, t) {
  const n = [...e].sort((o, a) => {
    const c = o.virtualStatus.batchExpiry || Number.MAX_SAFE_INTEGER, u = a.virtualStatus.batchExpiry || Number.MAX_SAFE_INTEGER;
    return c !== u ? c - u : a.value - o.value;
  }), r = [];
  let i = 0;
  for (const o of n)
    if (r.push(o), i += o.value, i >= t)
      break;
  if (i === t)
    return { inputs: r, changeAmount: 0n };
  if (i < t)
    throw new Error("Insufficient funds");
  const s = BigInt(i - t);
  return {
    inputs: r,
    changeAmount: s
  };
}
function ru() {
  const e = crypto.getRandomValues(new Uint8Array(16));
  return B.encode(e);
}
var H;
(function(e) {
  e.walletInitialized = (y) => ({
    type: "WALLET_INITIALIZED",
    success: !0,
    id: y
  });
  function t(y, T) {
    return {
      type: "ERROR",
      success: !1,
      message: T,
      id: y
    };
  }
  e.error = t;
  function n(y, T) {
    return {
      type: "SETTLE_EVENT",
      success: !0,
      event: T,
      id: y
    };
  }
  e.settleEvent = n;
  function r(y, T) {
    return {
      type: "SETTLE_SUCCESS",
      success: !0,
      txid: T,
      id: y
    };
  }
  e.settleSuccess = r;
  function i(y) {
    return y.type === "SETTLE_SUCCESS" && y.success;
  }
  e.isSettleSuccess = i;
  function s(y) {
    return y.type === "ADDRESS" && y.success === !0;
  }
  e.isAddress = s;
  function o(y) {
    return y.type === "BOARDING_ADDRESS" && y.success === !0;
  }
  e.isBoardingAddress = o;
  function a(y, T) {
    return {
      type: "ADDRESS",
      success: !0,
      address: T,
      id: y
    };
  }
  e.address = a;
  function c(y, T) {
    return {
      type: "BOARDING_ADDRESS",
      success: !0,
      address: T,
      id: y
    };
  }
  e.boardingAddress = c;
  function u(y) {
    return y.type === "BALANCE" && y.success === !0;
  }
  e.isBalance = u;
  function l(y, T) {
    return {
      type: "BALANCE",
      success: !0,
      balance: T,
      id: y
    };
  }
  e.balance = l;
  function d(y) {
    return y.type === "VTXOS" && y.success === !0;
  }
  e.isVtxos = d;
  function p(y, T) {
    return {
      type: "VTXOS",
      success: !0,
      vtxos: T,
      id: y
    };
  }
  e.vtxos = p;
  function g(y) {
    return y.type === "VIRTUAL_COINS" && y.success === !0;
  }
  e.isVirtualCoins = g;
  function f(y, T) {
    return {
      type: "VIRTUAL_COINS",
      success: !0,
      virtualCoins: T,
      id: y
    };
  }
  e.virtualCoins = f;
  function h(y) {
    return y.type === "BOARDING_UTXOS" && y.success === !0;
  }
  e.isBoardingUtxos = h;
  function w(y, T) {
    return {
      type: "BOARDING_UTXOS",
      success: !0,
      boardingUtxos: T,
      id: y
    };
  }
  e.boardingUtxos = w;
  function E(y) {
    return y.type === "SEND_BITCOIN_SUCCESS" && y.success === !0;
  }
  e.isSendBitcoinSuccess = E;
  function S(y, T) {
    return {
      type: "SEND_BITCOIN_SUCCESS",
      success: !0,
      txid: T,
      id: y
    };
  }
  e.sendBitcoinSuccess = S;
  function O(y) {
    return y.type === "TRANSACTION_HISTORY" && y.success === !0;
  }
  e.isTransactionHistory = O;
  function R(y, T) {
    return {
      type: "TRANSACTION_HISTORY",
      success: !0,
      transactions: T,
      id: y
    };
  }
  e.transactionHistory = R;
  function L(y) {
    return y.type === "WALLET_STATUS" && y.success === !0;
  }
  e.isWalletStatus = L;
  function P(y, T, A) {
    return {
      type: "WALLET_STATUS",
      success: !0,
      status: {
        walletInitialized: T,
        xOnlyPublicKey: A
      },
      id: y
    };
  }
  e.walletStatus = P;
  function m(y) {
    return y.type === "CLEAR_RESPONSE";
  }
  e.isClearResponse = m;
  function Q(y, T) {
    return {
      type: "CLEAR_RESPONSE",
      success: T,
      id: y
    };
  }
  e.clearResponse = Q;
  function _(y) {
    return y.type === "WALLET_RELOADED";
  }
  e.isWalletReloaded = _;
  function et(y, T) {
    return {
      type: "WALLET_RELOADED",
      success: T,
      id: y
    };
  }
  e.walletReloaded = et;
  function lt(y) {
    return y.type === "VTXO_UPDATE";
  }
  e.isVtxoUpdate = lt;
  function D(y, T) {
    return {
      type: "VTXO_UPDATE",
      id: ru(),
      // spontaneous update, not tied to a request
      success: !0,
      spentVtxos: T,
      newVtxos: y
    };
  }
  e.vtxoUpdate = D;
  function x(y) {
    return y.type === "UTXO_UPDATE";
  }
  e.isUtxoUpdate = x;
  function b(y) {
    return {
      type: "UTXO_UPDATE",
      id: ru(),
      // spontaneous update, not tied to a request
      success: !0,
      coins: y
    };
  }
  e.utxoUpdate = b;
})(H || (H = {}));
class Tw {
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
      const i = t.indexedDB.open(this.dbName, this.version);
      i.onerror = () => r(i.error), i.onsuccess = () => {
        this.db = i.result, n(this.db);
      }, i.onupgradeneeded = () => {
        const s = i.result;
        s.objectStoreNames.contains("storage") || s.createObjectStore("storage");
      };
    });
  }
  async getItem(t) {
    try {
      const n = await this.getDB();
      return new Promise((r, i) => {
        const a = n.transaction(["storage"], "readonly").objectStore("storage").get(t);
        a.onerror = () => i(a.error), a.onsuccess = () => {
          r(a.result || null);
        };
      });
    } catch (n) {
      return console.error(`Failed to get item for key ${t}:`, n), null;
    }
  }
  async setItem(t, n) {
    try {
      const r = await this.getDB();
      return new Promise((i, s) => {
        const c = r.transaction(["storage"], "readwrite").objectStore("storage").put(n, t);
        c.onerror = () => s(c.error), c.onsuccess = () => i();
      });
    } catch (r) {
      throw console.error(`Failed to set item for key ${t}:`, r), r;
    }
  }
  async removeItem(t) {
    try {
      const n = await this.getDB();
      return new Promise((r, i) => {
        const a = n.transaction(["storage"], "readwrite").objectStore("storage").delete(t);
        a.onerror = () => i(a.error), a.onsuccess = () => r();
      });
    } catch (n) {
      console.error(`Failed to remove item for key ${t}:`, n);
    }
  }
  async clear() {
    try {
      const t = await this.getDB();
      return new Promise((n, r) => {
        const o = t.transaction(["storage"], "readwrite").objectStore("storage").clear();
        o.onerror = () => r(o.error), o.onsuccess = () => n();
      });
    } catch (t) {
      console.error("Failed to clear storage:", t);
    }
  }
}
const Sw = "arkade-service-worker", Rs = (e) => e < 253 ? 1 : e <= 65535 ? 3 : e <= 4294967295 ? 5 : 9;
class it {
  constructor(t, n, r, i, s, o) {
    this.hasWitness = t, this.inputCount = n, this.outputCount = r, this.inputSize = i, this.inputWitnessSize = s, this.outputSize = o;
  }
  static create() {
    return new it(!1, 0, 0, 0, 0, 0);
  }
  addP2AInput() {
    return this.inputCount++, this.inputSize += it.INPUT_SIZE, this;
  }
  addKeySpendInput(t = !0) {
    return this.inputCount++, this.inputWitnessSize += 65 + (t ? 0 : 1), this.inputSize += it.INPUT_SIZE, this.hasWitness = !0, this;
  }
  addP2PKHInput() {
    return this.inputCount++, this.inputWitnessSize++, this.inputSize += it.INPUT_SIZE + it.P2PKH_SCRIPT_SIG_SIZE, this;
  }
  addTapscriptInput(t, n, r) {
    const i = 1 + it.BASE_CONTROL_BLOCK_SIZE + 1 + n + 1 + r;
    return this.inputCount++, this.inputWitnessSize += t + 1 + i, this.inputSize += it.INPUT_SIZE, this.hasWitness = !0, this;
  }
  addP2WPKHOutput() {
    return this.outputCount++, this.outputSize += it.OUTPUT_SIZE + it.P2WPKH_OUTPUT_SIZE, this;
  }
  addP2TROutput() {
    return this.outputCount++, this.outputSize += it.OUTPUT_SIZE + it.P2TR_OUTPUT_SIZE, this;
  }
  /**
   * Adds an output given a raw script.
   * Cost = 8 bytes (amount) + varint(scriptLen) + scriptLen
   */
  addOutputScript(t) {
    return this.outputCount++, this.outputSize += 8 + Rs(t.length) + t.length, this;
  }
  /**
   * Adds an output by decoding the address to get the exact script size.
   */
  addOutputAddress(t, n) {
    const r = Ie(n).decode(t), i = ht.encode(r);
    return this.addOutputScript(i);
  }
  vsize() {
    const t = Rs(this.inputCount), n = Rs(this.outputCount);
    let i = (it.BASE_TX_SIZE + t + this.inputSize + n + this.outputSize) * it.WITNESS_SCALE_FACTOR;
    return this.hasWitness && (i += it.WITNESS_HEADER_SIZE + this.inputWitnessSize), vw(i);
  }
}
it.P2PKH_SCRIPT_SIG_SIZE = 108;
it.INPUT_SIZE = 41;
it.BASE_CONTROL_BLOCK_SIZE = 33;
it.OUTPUT_SIZE = 9;
it.P2WPKH_OUTPUT_SIZE = 22;
it.BASE_TX_SIZE = 10;
it.WITNESS_HEADER_SIZE = 2;
it.WITNESS_SCALE_FACTOR = 4;
it.P2TR_OUTPUT_SIZE = 34;
const vw = (e) => {
  const t = BigInt(Math.ceil(e / it.WITNESS_SCALE_FACTOR));
  return {
    value: t,
    fee: (n) => n * t
  };
};
var kt;
(function(e) {
  function t(h) {
    return typeof h == "object" && h !== null && "type" in h;
  }
  e.isBase = t;
  function n(h) {
    return h.type === "INIT_WALLET" && "arkServerUrl" in h && typeof h.arkServerUrl == "string" && ("arkServerPublicKey" in h ? h.arkServerPublicKey === void 0 || typeof h.arkServerPublicKey == "string" : !0);
  }
  e.isInitWallet = n;
  function r(h) {
    return h.type === "SETTLE";
  }
  e.isSettle = r;
  function i(h) {
    return h.type === "GET_ADDRESS";
  }
  e.isGetAddress = i;
  function s(h) {
    return h.type === "GET_BOARDING_ADDRESS";
  }
  e.isGetBoardingAddress = s;
  function o(h) {
    return h.type === "GET_BALANCE";
  }
  e.isGetBalance = o;
  function a(h) {
    return h.type === "GET_VTXOS";
  }
  e.isGetVtxos = a;
  function c(h) {
    return h.type === "GET_VIRTUAL_COINS";
  }
  e.isGetVirtualCoins = c;
  function u(h) {
    return h.type === "GET_BOARDING_UTXOS";
  }
  e.isGetBoardingUtxos = u;
  function l(h) {
    return h.type === "SEND_BITCOIN" && "params" in h && h.params !== null && typeof h.params == "object" && "address" in h.params && typeof h.params.address == "string" && "amount" in h.params && typeof h.params.amount == "number";
  }
  e.isSendBitcoin = l;
  function d(h) {
    return h.type === "GET_TRANSACTION_HISTORY";
  }
  e.isGetTransactionHistory = d;
  function p(h) {
    return h.type === "GET_STATUS";
  }
  e.isGetStatus = p;
  function g(h) {
    return h.type === "CLEAR";
  }
  e.isClear = g;
  function f(h) {
    return h.type === "RELOAD_WALLET";
  }
  e.isReloadWallet = f;
})(kt || (kt = {}));
class kw {
  constructor(t) {
    this.url = t;
  }
  async delegate(t, n, r) {
    const i = `${this.url}/v1/delegate`, s = await fetch(i, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        intent: {
          message: ue.encodeMessage(t.message),
          proof: t.proof
        },
        forfeit_txs: n,
        reject_replace: r?.rejectReplace ?? !1
      })
    });
    if (!s.ok) {
      const o = await s.text();
      throw new Error(`Failed to delegate: ${o}`);
    }
  }
  async getDelegateInfo() {
    const t = `${this.url}/v1/delegator/info`, n = await fetch(t);
    if (!n.ok) {
      const i = await n.text();
      throw new Error(`Failed to get delegate info: ${i}`);
    }
    const r = await n.json();
    if (!Aw(r))
      throw new Error("Invalid delegate info");
    return r;
  }
}
function Aw(e) {
  return !!e && typeof e == "object" && "pubkey" in e && "fee" in e && "delegatorAddress" in e && typeof e.pubkey == "string" && typeof e.fee == "string" && typeof e.delegatorAddress == "string" && e.pubkey !== "" && e.fee !== "" && e.delegatorAddress !== "";
}
class Kf {
  constructor(t) {
    this.wallet = t;
  }
  get offchainTapscript() {
    return this.wallet.offchainTapscript;
  }
  get boardingTapscript() {
    return this.wallet.boardingTapscript;
  }
  get onchainProvider() {
    return this.wallet.onchainProvider;
  }
  get dustAmount() {
    return this.wallet.dustAmount;
  }
  get identity() {
    return this.wallet.identity;
  }
  notifyIncomingFunds(...t) {
    return this.wallet.notifyIncomingFunds(...t);
  }
  getAddress() {
    return this.wallet.getAddress();
  }
  getBoardingAddress() {
    return this.wallet.getBoardingAddress();
  }
  getTransactionHistory() {
    return this.wallet.getTransactionHistory();
  }
  async handleReload(t) {
    return { pending: await this.wallet.fetchPendingTxs(), finalized: [] };
  }
  async handleSettle(...t) {
  }
  async handleSendBitcoin(...t) {
  }
  async handleDelegate() {
  }
}
class Iw extends Kf {
  constructor(t) {
    super(t), this.wallet = t;
  }
  async handleReload(t) {
    return this.wallet.finalizePendingTxs(t.filter((n) => n.virtualStatus.state !== "swept" && n.virtualStatus.state !== "settled"));
  }
  async handleSettle(...t) {
    return this.wallet.settle(...t);
  }
  async handleSendBitcoin(...t) {
    return this.wallet.sendBitcoin(...t);
  }
  async handleDelegate() {
    if (!this.wallet.delegatorManager)
      return;
    const t = (await this.wallet.getVtxos({ withRecoverable: !0 })).filter(ve);
    if (t.length !== 0)
      return this.wallet.delegatorManager.delegate(t, await this.wallet.getAddress());
  }
}
class Ow {
  constructor(t = Sw, n = 1, r = () => {
  }) {
    this.dbName = t, this.dbVersion = n, this.messageCallback = r, this.storage = new Tw(t, n), this.walletRepository = new yo(this.storage);
  }
  /**
   * Get spendable vtxos for the current wallet address
   */
  async getSpendableVtxos() {
    if (!this.handler)
      return [];
    const t = await this.handler.getAddress();
    return (await this.walletRepository.getVtxos(t)).filter(ve);
  }
  /**
   * Get swept vtxos for the current wallet address
   */
  async getSweptVtxos() {
    if (!this.handler)
      return [];
    const t = await this.handler.getAddress();
    return (await this.walletRepository.getVtxos(t)).filter((r) => r.virtualStatus.state === "swept");
  }
  /**
   * Get all vtxos categorized by type
   */
  async getAllVtxos() {
    if (!this.handler)
      return { spendable: [], spent: [] };
    const t = await this.handler.getAddress(), n = await this.walletRepository.getVtxos(t);
    return {
      spendable: n.filter(ve),
      spent: n.filter((r) => !ve(r))
    };
  }
  /**
   * Get all boarding utxos from wallet repository
   */
  async getAllBoardingUtxos() {
    if (!this.handler)
      return [];
    const t = await this.handler.getBoardingAddress();
    return await this.walletRepository.getUtxos(t);
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
    this.incomingFundsSubscription && this.incomingFundsSubscription(), await this.storage.clear(), this.walletRepository = new yo(this.storage), this.handler = void 0, this.arkProvider = void 0, this.indexerProvider = void 0;
  }
  async reload() {
    await this.onWalletInitialized();
  }
  async onWalletInitialized() {
    if (!this.handler || !this.arkProvider || !this.indexerProvider || !this.handler.offchainTapscript || !this.handler.boardingTapscript)
      return;
    const t = B.encode(this.handler.offchainTapscript.pkScript), r = (await this.indexerProvider.getVtxos({
      scripts: [t]
    })).vtxos.map((c) => Fe(this.handler, c));
    try {
      const { pending: c, finalized: u } = await this.handler.handleReload(r);
      console.info(`Recovered ${u.length}/${c.length} pending transactions: ${u.join(", ")}`);
    } catch (c) {
      console.error("Error recovering pending transactions:", c);
    }
    const i = await this.handler.getAddress();
    await this.walletRepository.saveVtxos(i, r);
    const s = await this.handler.getBoardingAddress(), o = await this.handler.onchainProvider.getCoins(s);
    await this.walletRepository.saveUtxos(s, o.map((c) => wo(this.handler, c)));
    const a = await this.handler.getTransactionHistory();
    a && await this.walletRepository.saveTransactions(i, a), this.incomingFundsSubscription && this.incomingFundsSubscription(), this.incomingFundsSubscription = await this.handler.notifyIncomingFunds(async (c) => {
      if (c.type === "vtxo") {
        const u = c.newVtxos.length > 0 ? c.newVtxos.map((p) => Fe(this.handler, p)) : [], l = c.spentVtxos.length > 0 ? c.spentVtxos.map((p) => Fe(this.handler, p)) : [];
        if ([...u, ...l].length === 0)
          return;
        await this.walletRepository.saveVtxos(i, [
          ...u,
          ...l
        ]), await this.sendMessageToAllClients(H.vtxoUpdate(u, l));
        const d = await this.handler?.handleDelegate().catch((p) => {
          console.error("Error delegating vtxos:", p);
        });
        d && d.delegated.length > 0 && console.log(`Delegated ${d.delegated.length} vtxos`), d && d.failed.length > 0 && console.error(`Failed to delegate ${d.failed.length} vtxos`);
      }
      if (c.type === "utxo") {
        const u = c.coins.map((d) => wo(this.handler, d)), l = await this.handler?.getBoardingAddress();
        await this.walletRepository.clearUtxos(l), await this.walletRepository.saveUtxos(l, u), await this.sendMessageToAllClients(H.utxoUpdate(u));
      }
    }), await this.handler.handleDelegate().catch((c) => {
      console.error("Error delegating vtxos:", c);
    });
  }
  async handleClear(t) {
    await this.clear(), kt.isBase(t.data) && t.source?.postMessage(H.clearResponse(t.data.id, !0));
  }
  async handleInitWallet(t) {
    if (!kt.isInitWallet(t.data)) {
      console.error("Invalid INIT_WALLET message format", t.data), t.source?.postMessage(H.error(t.data.id, "Invalid INIT_WALLET message format"));
      return;
    }
    const n = t.data, { arkServerPublicKey: r, arkServerUrl: i, delegatorUrl: s } = n;
    this.arkProvider = new vf(i), this.indexerProvider = new Bf(i);
    let o;
    s && (o = new kw(s));
    try {
      if ("privateKey" in n.key && typeof n.key.privateKey == "string") {
        const { key: { privateKey: a } } = n, c = ur.fromHex(a), u = await zn.create({
          identity: c,
          arkServerUrl: i,
          arkServerPublicKey: r,
          storage: this.storage,
          // Use unified storage for wallet too
          delegatorProvider: o
        });
        this.handler = new Iw(u);
      } else if ("publicKey" in n.key && typeof n.key.publicKey == "string") {
        const { key: { publicKey: a } } = n, c = Ji.fromPublicKey(B.decode(a)), u = await dn.create({
          identity: c,
          arkServerUrl: i,
          arkServerPublicKey: r,
          storage: this.storage,
          // Use unified storage for wallet too
          delegatorProvider: o
        });
        this.handler = new Kf(u);
      } else {
        const a = "Missing privateKey or publicKey in key object";
        t.source?.postMessage(H.error(n.id, a)), console.error(a);
        return;
      }
    } catch (a) {
      console.error("Error initializing wallet:", a);
      const c = a instanceof Error ? a.message : "Unknown error occurred";
      t.source?.postMessage(H.error(n.id, c));
      return;
    }
    t.source?.postMessage(H.walletInitialized(n.id)), await this.onWalletInitialized();
  }
  async handleSettle(t) {
    const n = t.data;
    if (!kt.isSettle(n)) {
      console.error("Invalid SETTLE message format", n), t.source?.postMessage(H.error(n.id, "Invalid SETTLE message format"));
      return;
    }
    try {
      if (!this.handler) {
        console.error("Wallet not initialized"), t.source?.postMessage(H.error(n.id, "Wallet not initialized"));
        return;
      }
      const r = await this.handler.handleSettle(n.params, (i) => {
        t.source?.postMessage(H.settleEvent(n.id, i));
      });
      r ? t.source?.postMessage(H.settleSuccess(n.id, r)) : t.source?.postMessage(H.error(n.id, "Operation not supported in readonly mode"));
    } catch (r) {
      console.error("Error settling:", r);
      const i = r instanceof Error ? r.message : "Unknown error occurred";
      t.source?.postMessage(H.error(n.id, i));
    }
  }
  async handleSendBitcoin(t) {
    const n = t.data;
    if (!kt.isSendBitcoin(n)) {
      console.error("Invalid SEND_BITCOIN message format", n), t.source?.postMessage(H.error(n.id, "Invalid SEND_BITCOIN message format"));
      return;
    }
    if (!this.handler) {
      console.error("Wallet not initialized"), t.source?.postMessage(H.error(n.id, "Wallet not initialized"));
      return;
    }
    try {
      const r = await this.handler.handleSendBitcoin(n.params);
      r ? t.source?.postMessage(H.sendBitcoinSuccess(n.id, r)) : t.source?.postMessage(H.error(n.id, "Operation not supported in readonly mode"));
    } catch (r) {
      console.error("Error sending bitcoin:", r);
      const i = r instanceof Error ? r.message : "Unknown error occurred";
      t.source?.postMessage(H.error(n.id, i));
    }
  }
  async handleGetAddress(t) {
    const n = t.data;
    if (!kt.isGetAddress(n)) {
      console.error("Invalid GET_ADDRESS message format", n), t.source?.postMessage(H.error(n.id, "Invalid GET_ADDRESS message format"));
      return;
    }
    if (!this.handler) {
      console.error("Wallet not initialized"), t.source?.postMessage(H.error(n.id, "Wallet not initialized"));
      return;
    }
    try {
      const r = await this.handler.getAddress();
      t.source?.postMessage(H.address(n.id, r));
    } catch (r) {
      console.error("Error getting address:", r);
      const i = r instanceof Error ? r.message : "Unknown error occurred";
      t.source?.postMessage(H.error(n.id, i));
    }
  }
  async handleGetBoardingAddress(t) {
    const n = t.data;
    if (!kt.isGetBoardingAddress(n)) {
      console.error("Invalid GET_BOARDING_ADDRESS message format", n), t.source?.postMessage(H.error(n.id, "Invalid GET_BOARDING_ADDRESS message format"));
      return;
    }
    if (!this.handler) {
      console.error("Wallet not initialized"), t.source?.postMessage(H.error(n.id, "Wallet not initialized"));
      return;
    }
    try {
      const r = await this.handler.getBoardingAddress();
      t.source?.postMessage(H.boardingAddress(n.id, r));
    } catch (r) {
      console.error("Error getting boarding address:", r);
      const i = r instanceof Error ? r.message : "Unknown error occurred";
      t.source?.postMessage(H.error(n.id, i));
    }
  }
  async handleGetBalance(t) {
    const n = t.data;
    if (!kt.isGetBalance(n)) {
      console.error("Invalid GET_BALANCE message format", n), t.source?.postMessage(H.error(n.id, "Invalid GET_BALANCE message format"));
      return;
    }
    if (!this.handler) {
      console.error("Wallet not initialized"), t.source?.postMessage(H.error(n.id, "Wallet not initialized"));
      return;
    }
    try {
      const [r, i, s] = await Promise.all([
        this.getAllBoardingUtxos(),
        this.getSpendableVtxos(),
        this.getSweptVtxos()
      ]);
      let o = 0, a = 0;
      for (const g of r)
        g.status.confirmed ? o += g.value : a += g.value;
      let c = 0, u = 0, l = 0;
      for (const g of i)
        g.virtualStatus.state === "settled" ? c += g.value : g.virtualStatus.state === "preconfirmed" && (u += g.value);
      for (const g of s)
        ve(g) && (l += g.value);
      const d = o + a, p = c + u + l;
      t.source?.postMessage(H.balance(n.id, {
        boarding: {
          confirmed: o,
          unconfirmed: a,
          total: d
        },
        settled: c,
        preconfirmed: u,
        available: c + u,
        recoverable: l,
        total: d + p
      }));
    } catch (r) {
      console.error("Error getting balance:", r);
      const i = r instanceof Error ? r.message : "Unknown error occurred";
      t.source?.postMessage(H.error(n.id, i));
    }
  }
  async handleGetVtxos(t) {
    const n = t.data;
    if (!kt.isGetVtxos(n)) {
      console.error("Invalid GET_VTXOS message format", n), t.source?.postMessage(H.error(n.id, "Invalid GET_VTXOS message format"));
      return;
    }
    if (!this.handler) {
      console.error("Wallet not initialized"), t.source?.postMessage(H.error(n.id, "Wallet not initialized"));
      return;
    }
    try {
      const r = await this.getSpendableVtxos(), i = this.handler.dustAmount, o = n.filter?.withRecoverable ?? !1 ? r : r.filter((a) => !(i != null && Tf(a, i) || Mn(a) || xf(a)));
      t.source?.postMessage(H.vtxos(n.id, o));
    } catch (r) {
      console.error("Error getting vtxos:", r);
      const i = r instanceof Error ? r.message : "Unknown error occurred";
      t.source?.postMessage(H.error(n.id, i));
    }
  }
  async handleGetBoardingUtxos(t) {
    const n = t.data;
    if (!kt.isGetBoardingUtxos(n)) {
      console.error("Invalid GET_BOARDING_UTXOS message format", n), t.source?.postMessage(H.error(n.id, "Invalid GET_BOARDING_UTXOS message format"));
      return;
    }
    if (!this.handler) {
      console.error("Wallet not initialized"), t.source?.postMessage(H.error(n.id, "Wallet not initialized"));
      return;
    }
    try {
      const r = await this.getAllBoardingUtxos();
      t.source?.postMessage(H.boardingUtxos(n.id, r));
    } catch (r) {
      console.error("Error getting boarding utxos:", r);
      const i = r instanceof Error ? r.message : "Unknown error occurred";
      t.source?.postMessage(H.error(n.id, i));
    }
  }
  async handleGetTransactionHistory(t) {
    const n = t.data;
    if (!kt.isGetTransactionHistory(n)) {
      console.error("Invalid GET_TRANSACTION_HISTORY message format", n), t.source?.postMessage(H.error(n.id, "Invalid GET_TRANSACTION_HISTORY message format"));
      return;
    }
    if (!this.handler) {
      console.error("Wallet not initialized"), t.source?.postMessage(H.error(n.id, "Wallet not initialized"));
      return;
    }
    try {
      const r = await this.handler.getTransactionHistory();
      t.source?.postMessage(H.transactionHistory(n.id, r));
    } catch (r) {
      console.error("Error getting transaction history:", r);
      const i = r instanceof Error ? r.message : "Unknown error occurred";
      t.source?.postMessage(H.error(n.id, i));
    }
  }
  async handleGetStatus(t) {
    const n = t.data;
    if (!kt.isGetStatus(n)) {
      console.error("Invalid GET_STATUS message format", n), t.source?.postMessage(H.error(n.id, "Invalid GET_STATUS message format"));
      return;
    }
    const r = this.handler ? await this.handler.identity.xOnlyPublicKey() : void 0;
    t.source?.postMessage(H.walletStatus(n.id, this.handler !== void 0, r));
  }
  async handleMessage(t) {
    this.messageCallback(t);
    const n = t.data;
    if (!kt.isBase(n)) {
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
        t.source?.postMessage(H.error(n.id, "Unknown message type"));
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
    if (!kt.isReloadWallet(n)) {
      console.error("Invalid RELOAD_WALLET message format", n), t.source?.postMessage(H.error(n.id, "Invalid RELOAD_WALLET message format"));
      return;
    }
    if (!this.handler) {
      console.error("Wallet not initialized"), t.source?.postMessage(H.walletReloaded(n.id, !1));
      return;
    }
    try {
      await this.onWalletInitialized(), t.source?.postMessage(H.walletReloaded(n.id, !0));
    } catch (r) {
      console.error("Error reloading wallet:", r), t.source?.postMessage(H.walletReloaded(n.id, !1));
    }
  }
}
var iu;
(function(e) {
  let t;
  (function(i) {
    i[i.UNROLL = 0] = "UNROLL", i[i.WAIT = 1] = "WAIT", i[i.DONE = 2] = "DONE";
  })(t = e.StepType || (e.StepType = {}));
  class n {
    constructor(s, o, a, c) {
      this.toUnroll = s, this.bumper = o, this.explorer = a, this.indexer = c;
    }
    static async create(s, o, a, c) {
      const { chain: u } = await c.getVtxoChain(s);
      return new n({ ...s, chain: u }, o, a, c);
    }
    /**
     * Get the next step to be executed
     * @returns The next step to be executed + the function to execute it
     */
    async next() {
      let s;
      const o = this.toUnroll.chain;
      for (let u = o.length - 1; u >= 0; u--) {
        const l = o[u];
        if (!(l.type === On.COMMITMENT || l.type === On.UNSPECIFIED))
          try {
            if (!(await this.explorer.getTxStatus(l.txid)).confirmed)
              return {
                type: t.WAIT,
                txid: l.txid,
                do: Nw(this.explorer, l.txid)
              };
          } catch {
            s = l;
            break;
          }
      }
      if (!s)
        return {
          type: t.DONE,
          vtxoTxid: this.toUnroll.txid,
          do: () => Promise.resolve()
        };
      const a = await this.indexer.getVirtualTxs([
        s.txid
      ]);
      if (a.txs.length === 0)
        throw new Error(`Tx ${s.txid} not found`);
      const c = qe.fromPSBT(pt.decode(a.txs[0]));
      if (s.type === On.TREE) {
        const u = c.getInput(0);
        if (!u)
          throw new Error("Input not found");
        const l = u.tapKeySig;
        if (!l)
          throw new Error("Tap key sig not found");
        c.updateInput(0, {
          finalScriptWitness: [l]
        });
      } else
        c.finalize();
      return {
        type: t.UNROLL,
        tx: c,
        do: $w(this.bumper, this.explorer, c)
      };
    }
    /**
     * Iterate over the steps to be executed and execute them
     * @returns An async iterator over the executed steps
     */
    async *[Symbol.asyncIterator]() {
      let s;
      do {
        s !== void 0 && await Bw(1e3);
        const o = await this.next();
        await o.do(), yield o, s = o.type;
      } while (s !== t.DONE);
    }
  }
  e.Session = n;
  async function r(i, s, o) {
    const a = await i.onchainProvider.getChainTip();
    let c = await i.getVtxos({ withUnrolled: !0 });
    if (c = c.filter((E) => s.includes(E.txid)), c.length === 0)
      throw new Error("No vtxos to complete unroll");
    const u = [];
    let l = 0n;
    const d = it.create();
    for (const E of c) {
      if (!E.isUnrolled)
        throw new Error(`Vtxo ${E.txid}:${E.vout} is not fully unrolled, use unroll first`);
      const S = await i.onchainProvider.getTxStatus(E.txid);
      if (!S.confirmed)
        throw new Error(`tx ${E.txid} is not confirmed`);
      const O = Rw({ height: S.blockHeight, time: S.blockTime }, a, E);
      if (!O)
        throw new Error(`no available exit path found for vtxo ${E.txid}:${E.vout}`);
      const R = Ot.decode(E.tapTree).findLeaf(B.encode(O.script));
      if (!R)
        throw new Error(`spending leaf not found for vtxo ${E.txid}:${E.vout}`);
      l += BigInt(E.value), u.push({
        txid: E.txid,
        index: E.vout,
        tapLeafScript: [R],
        sequence: 4294967294,
        witnessUtxo: {
          amount: BigInt(E.value),
          script: Ot.decode(E.tapTree).pkScript
        },
        sighashType: Ge.DEFAULT
      }), d.addTapscriptInput(64, R[1].length, ae.encode(R[0]).length);
    }
    const p = new qe({ version: 2 });
    for (const E of u)
      p.addInput(E);
    d.addOutputAddress(o, i.network);
    let g = await i.onchainProvider.getFeeRate();
    (!g || g < zn.MIN_FEE_RATE) && (g = zn.MIN_FEE_RATE);
    const f = d.vsize().fee(BigInt(g));
    if (f > l)
      throw new Error("fee amount is greater than the total amount");
    const h = l - f;
    if (h < BigInt(xy))
      throw new Error("send amount is less than dust amount");
    p.addOutputAddress(o, h);
    const w = await i.identity.sign(p);
    return w.finalize(), await i.onchainProvider.broadcastTransaction(w.hex), w.id;
  }
  e.completeUnroll = r;
})(iu || (iu = {}));
function Bw(e) {
  return new Promise((t) => setTimeout(t, e));
}
function $w(e, t, n) {
  return async () => {
    const [r, i] = await e.bumpP2A(n);
    await t.broadcastTransaction(r, i);
  };
}
function Nw(e, t) {
  return () => new Promise((n, r) => {
    const i = setInterval(async () => {
      try {
        (await e.getTxStatus(t)).confirmed && (clearInterval(i), n());
      } catch (s) {
        clearInterval(i), r(s);
      }
    }, 5e3);
  });
}
function Rw(e, t, n) {
  const r = Ot.decode(n.tapTree).exitPaths();
  for (const i of r)
    if (i.params.timelock.type === "blocks") {
      if (t.height >= e.height + Number(i.params.timelock.value))
        return i;
    } else if (t.time >= e.time + Number(i.params.timelock.value))
      return i;
}
const zf = new Ow();
zf.start().catch(console.error);
const jf = "arkade-cache-v1";
self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(jf)), self.skipWaiting();
});
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((t) => Promise.all(
      t.map((n) => {
        if (n !== jf)
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
  e.data && e.data.type === "RELOAD_WALLET" && e.waitUntil(zf.reload().catch(console.error));
});
