/*! noble-hashes - MIT License (c) 2022 Paul Miller (paulmillr.com) */
function wo(e) {
  return e instanceof Uint8Array || ArrayBuffer.isView(e) && e.constructor.name === "Uint8Array";
}
function ze(e, t = "") {
  if (!Number.isSafeInteger(e) || e < 0) {
    const n = t && `"${t}" `;
    throw new Error(`${n}expected integer >= 0, got ${e}`);
  }
}
function Q(e, t, n = "") {
  const r = wo(e), s = e?.length, i = t !== void 0;
  if (!r || i && s !== t) {
    const o = n && `"${n}" `, a = i ? ` of length ${t}` : "", c = r ? `length=${s}` : `type=${typeof e}`;
    throw new Error(o + "expected Uint8Array" + a + ", got " + c);
  }
  return e;
}
function Xc(e) {
  if (typeof e != "function" || typeof e.create != "function")
    throw new Error("Hash must wrapped by utils.createHasher");
  ze(e.outputLen), ze(e.blockLen);
}
function is(e, t = !0) {
  if (e.destroyed)
    throw new Error("Hash instance has been destroyed");
  if (t && e.finished)
    throw new Error("Hash#digest() has already been called");
}
function fd(e, t) {
  Q(e, void 0, "digestInto() output");
  const n = t.outputLen;
  if (e.length < n)
    throw new Error('"digestInto() output" expected to be of length >=' + n);
}
function Un(...e) {
  for (let t = 0; t < e.length; t++)
    e[t].fill(0);
}
function oi(e) {
  return new DataView(e.buffer, e.byteOffset, e.byteLength);
}
function ie(e, t) {
  return e << 32 - t | e >>> t;
}
function Ur(e, t) {
  return e << t | e >>> 32 - t >>> 0;
}
const Qc = /* @ts-ignore */ typeof Uint8Array.from([]).toHex == "function" && typeof Uint8Array.fromHex == "function", dd = /* @__PURE__ */ Array.from({ length: 256 }, (e, t) => t.toString(16).padStart(2, "0"));
function Ds(e) {
  if (Q(e), Qc)
    return e.toHex();
  let t = "";
  for (let n = 0; n < e.length; n++)
    t += dd[e[n]];
  return t;
}
const we = { _0: 48, _9: 57, A: 65, F: 70, a: 97, f: 102 };
function da(e) {
  if (e >= we._0 && e <= we._9)
    return e - we._0;
  if (e >= we.A && e <= we.F)
    return e - (we.A - 10);
  if (e >= we.a && e <= we.f)
    return e - (we.a - 10);
}
function os(e) {
  if (typeof e != "string")
    throw new Error("hex string expected, got " + typeof e);
  if (Qc)
    return Uint8Array.fromHex(e);
  const t = e.length, n = t / 2;
  if (t % 2)
    throw new Error("hex string expected, got unpadded hex of length " + t);
  const r = new Uint8Array(n);
  for (let s = 0, i = 0; s < n; s++, i += 2) {
    const o = da(e.charCodeAt(i)), a = da(e.charCodeAt(i + 1));
    if (o === void 0 || a === void 0) {
      const c = e[i] + e[i + 1];
      throw new Error('hex string expected, got non-hex character "' + c + '" at index ' + i);
    }
    r[s] = o * 16 + a;
  }
  return r;
}
function Jt(...e) {
  let t = 0;
  for (let r = 0; r < e.length; r++) {
    const s = e[r];
    Q(s), t += s.length;
  }
  const n = new Uint8Array(t);
  for (let r = 0, s = 0; r < e.length; r++) {
    const i = e[r];
    n.set(i, s), s += i.length;
  }
  return n;
}
function Jc(e, t = {}) {
  const n = (s, i) => e(i).update(s).digest(), r = e(void 0);
  return n.outputLen = r.outputLen, n.blockLen = r.blockLen, n.create = (s) => e(s), Object.assign(n, t), Object.freeze(n);
}
function kr(e = 32) {
  const t = typeof globalThis == "object" ? globalThis.crypto : null;
  if (typeof t?.getRandomValues != "function")
    throw new Error("crypto.getRandomValues must be defined");
  return t.getRandomValues(new Uint8Array(e));
}
const hd = (e) => ({
  oid: Uint8Array.from([6, 9, 96, 134, 72, 1, 101, 3, 4, 2, e])
});
function pd(e, t, n) {
  return e & t ^ ~e & n;
}
function gd(e, t, n) {
  return e & t ^ e & n ^ t & n;
}
let tu = class {
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
  constructor(t, n, r, s) {
    this.blockLen = t, this.outputLen = n, this.padOffset = r, this.isLE = s, this.buffer = new Uint8Array(t), this.view = oi(this.buffer);
  }
  update(t) {
    is(this), Q(t);
    const { view: n, buffer: r, blockLen: s } = this, i = t.length;
    for (let o = 0; o < i; ) {
      const a = Math.min(s - this.pos, i - o);
      if (a === s) {
        const c = oi(t);
        for (; s <= i - o; o += s)
          this.process(c, o);
        continue;
      }
      r.set(t.subarray(o, o + a), this.pos), this.pos += a, o += a, this.pos === s && (this.process(n, 0), this.pos = 0);
    }
    return this.length += t.length, this.roundClean(), this;
  }
  digestInto(t) {
    is(this), fd(t, this), this.finished = !0;
    const { buffer: n, view: r, blockLen: s, isLE: i } = this;
    let { pos: o } = this;
    n[o++] = 128, Un(this.buffer.subarray(o)), this.padOffset > s - o && (this.process(r, 0), o = 0);
    for (let f = o; f < s; f++)
      n[f] = 0;
    r.setBigUint64(s - 8, BigInt(this.length * 8), i), this.process(r, 0);
    const a = oi(t), c = this.outputLen;
    if (c % 4)
      throw new Error("_sha2: outputLen must be aligned to 32bit");
    const u = c / 4, l = this.get();
    if (u > l.length)
      throw new Error("_sha2: outputLen bigger than state");
    for (let f = 0; f < u; f++)
      a.setUint32(4 * f, l[f], i);
  }
  digest() {
    const { buffer: t, outputLen: n } = this;
    this.digestInto(t);
    const r = t.slice(0, n);
    return this.destroy(), r;
  }
  _cloneInto(t) {
    t ||= new this.constructor(), t.set(...this.get());
    const { blockLen: n, buffer: r, length: s, finished: i, destroyed: o, pos: a } = this;
    return t.destroyed = o, t.finished = i, t.length = s, t.pos = a, s % n && t.buffer.set(r), t;
  }
  clone() {
    return this._cloneInto();
  }
};
const Be = /* @__PURE__ */ Uint32Array.from([
  1779033703,
  3144134277,
  1013904242,
  2773480762,
  1359893119,
  2600822924,
  528734635,
  1541459225
]), yd = /* @__PURE__ */ Uint32Array.from([
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
let wd = class extends tu {
  constructor(t) {
    super(64, t, 8, !1);
  }
  get() {
    const { A: t, B: n, C: r, D: s, E: i, F: o, G: a, H: c } = this;
    return [t, n, r, s, i, o, a, c];
  }
  // prettier-ignore
  set(t, n, r, s, i, o, a, c) {
    this.A = t | 0, this.B = n | 0, this.C = r | 0, this.D = s | 0, this.E = i | 0, this.F = o | 0, this.G = a | 0, this.H = c | 0;
  }
  process(t, n) {
    for (let f = 0; f < 16; f++, n += 4)
      Ne[f] = t.getUint32(n, !1);
    for (let f = 16; f < 64; f++) {
      const h = Ne[f - 15], p = Ne[f - 2], y = ie(h, 7) ^ ie(h, 18) ^ h >>> 3, d = ie(p, 17) ^ ie(p, 19) ^ p >>> 10;
      Ne[f] = d + Ne[f - 7] + y + Ne[f - 16] | 0;
    }
    let { A: r, B: s, C: i, D: o, E: a, F: c, G: u, H: l } = this;
    for (let f = 0; f < 64; f++) {
      const h = ie(a, 6) ^ ie(a, 11) ^ ie(a, 25), p = l + h + pd(a, c, u) + yd[f] + Ne[f] | 0, d = (ie(r, 2) ^ ie(r, 13) ^ ie(r, 22)) + gd(r, s, i) | 0;
      l = u, u = c, c = a, a = o + p | 0, o = i, i = s, s = r, r = p + d | 0;
    }
    r = r + this.A | 0, s = s + this.B | 0, i = i + this.C | 0, o = o + this.D | 0, a = a + this.E | 0, c = c + this.F | 0, u = u + this.G | 0, l = l + this.H | 0, this.set(r, s, i, o, a, c, u, l);
  }
  roundClean() {
    Un(Ne);
  }
  destroy() {
    this.set(0, 0, 0, 0, 0, 0, 0, 0), Un(this.buffer);
  }
}, md = class extends wd {
  // We cannot use array here since array allows indexing by variable
  // which means optimizer/compiler cannot use registers.
  A = Be[0] | 0;
  B = Be[1] | 0;
  C = Be[2] | 0;
  D = Be[3] | 0;
  E = Be[4] | 0;
  F = Be[5] | 0;
  G = Be[6] | 0;
  H = Be[7] | 0;
  constructor() {
    super(32);
  }
};
const vt = /* @__PURE__ */ Jc(
  () => new md(),
  /* @__PURE__ */ hd(1)
);
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const mo = /* @__PURE__ */ BigInt(0), $i = /* @__PURE__ */ BigInt(1);
function as(e, t = "") {
  if (typeof e != "boolean") {
    const n = t && `"${t}" `;
    throw new Error(n + "expected boolean, got type=" + typeof e);
  }
  return e;
}
function eu(e) {
  if (typeof e == "bigint") {
    if (!qr(e))
      throw new Error("positive bigint expected, got " + e);
  } else
    ze(e);
  return e;
}
function Pr(e) {
  const t = eu(e).toString(16);
  return t.length & 1 ? "0" + t : t;
}
function nu(e) {
  if (typeof e != "string")
    throw new Error("hex string expected, got " + typeof e);
  return e === "" ? mo : BigInt("0x" + e);
}
function Ce(e) {
  return nu(Ds(e));
}
function ru(e) {
  return nu(Ds(bd(Q(e)).reverse()));
}
function Cr(e, t) {
  ze(t), e = eu(e);
  const n = os(e.toString(16).padStart(t * 2, "0"));
  if (n.length !== t)
    throw new Error("number too large");
  return n;
}
function su(e, t) {
  return Cr(e, t).reverse();
}
function mr(e, t) {
  if (e.length !== t.length)
    return !1;
  let n = 0;
  for (let r = 0; r < e.length; r++)
    n |= e[r] ^ t[r];
  return n === 0;
}
function bd(e) {
  return Uint8Array.from(e);
}
function Ed(e) {
  return Uint8Array.from(e, (t, n) => {
    const r = t.charCodeAt(0);
    if (t.length !== 1 || r > 127)
      throw new Error(`string contains non-ASCII character "${e[n]}" with code ${r} at position ${n}`);
    return r;
  });
}
const qr = (e) => typeof e == "bigint" && mo <= e;
function xd(e, t, n) {
  return qr(e) && qr(t) && qr(n) && t <= e && e < n;
}
function iu(e, t, n, r) {
  if (!xd(t, n, r))
    throw new Error("expected valid " + e + ": " + n + " <= n < " + r + ", got " + t);
}
function Td(e) {
  let t;
  for (t = 0; e > mo; e >>= $i, t += 1)
    ;
  return t;
}
const bo = (e) => ($i << BigInt(e)) - $i;
function Sd(e, t, n) {
  if (ze(e, "hashLen"), ze(t, "qByteLen"), typeof n != "function")
    throw new Error("hmacFn must be a function");
  const r = (g) => new Uint8Array(g), s = Uint8Array.of(), i = Uint8Array.of(0), o = Uint8Array.of(1), a = 1e3;
  let c = r(e), u = r(e), l = 0;
  const f = () => {
    c.fill(1), u.fill(0), l = 0;
  }, h = (...g) => n(u, Jt(c, ...g)), p = (g = s) => {
    u = h(i, g), c = h(), g.length !== 0 && (u = h(o, g), c = h());
  }, y = () => {
    if (l++ >= a)
      throw new Error("drbg: tried max amount of iterations");
    let g = 0;
    const w = [];
    for (; g < t; ) {
      c = h();
      const A = c.slice();
      w.push(A), g += c.length;
    }
    return Jt(...w);
  };
  return (g, w) => {
    f(), p(g);
    let A;
    for (; !(A = w(y())); )
      p();
    return f(), A;
  };
}
function Eo(e, t = {}, n = {}) {
  if (!e || typeof e != "object")
    throw new Error("expected valid options object");
  function r(i, o, a) {
    const c = e[i];
    if (a && c === void 0)
      return;
    const u = typeof c;
    if (u !== o || c === null)
      throw new Error(`param "${i}" is invalid: expected ${o}, got ${u}`);
  }
  const s = (i, o) => Object.entries(i).forEach(([a, c]) => r(a, c, o));
  s(t, !1), s(n, !0);
}
function ha(e) {
  const t = /* @__PURE__ */ new WeakMap();
  return (n, ...r) => {
    const s = t.get(n);
    if (s !== void 0)
      return s;
    const i = e(n, ...r);
    return t.set(n, i), i;
  };
}
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const Ot = /* @__PURE__ */ BigInt(0), At = /* @__PURE__ */ BigInt(1), cn = /* @__PURE__ */ BigInt(2), ou = /* @__PURE__ */ BigInt(3), au = /* @__PURE__ */ BigInt(4), cu = /* @__PURE__ */ BigInt(5), vd = /* @__PURE__ */ BigInt(7), uu = /* @__PURE__ */ BigInt(8), Ad = /* @__PURE__ */ BigInt(9), lu = /* @__PURE__ */ BigInt(16);
function Yt(e, t) {
  const n = e % t;
  return n >= Ot ? n : t + n;
}
function Ht(e, t, n) {
  let r = e;
  for (; t-- > Ot; )
    r *= r, r %= n;
  return r;
}
function pa(e, t) {
  if (e === Ot)
    throw new Error("invert: expected non-zero number");
  if (t <= Ot)
    throw new Error("invert: expected positive modulus, got " + t);
  let n = Yt(e, t), r = t, s = Ot, i = At;
  for (; n !== Ot; ) {
    const a = r / n, c = r % n, u = s - i * a;
    r = n, n = c, s = i, i = u;
  }
  if (r !== At)
    throw new Error("invert: does not exist");
  return Yt(s, t);
}
function xo(e, t, n) {
  if (!e.eql(e.sqr(t), n))
    throw new Error("Cannot find square root");
}
function fu(e, t) {
  const n = (e.ORDER + At) / au, r = e.pow(t, n);
  return xo(e, r, t), r;
}
function Id(e, t) {
  const n = (e.ORDER - cu) / uu, r = e.mul(t, cn), s = e.pow(r, n), i = e.mul(t, s), o = e.mul(e.mul(i, cn), s), a = e.mul(i, e.sub(o, e.ONE));
  return xo(e, a, t), a;
}
function kd(e) {
  const t = Vs(e), n = du(e), r = n(t, t.neg(t.ONE)), s = n(t, r), i = n(t, t.neg(r)), o = (e + vd) / lu;
  return (a, c) => {
    let u = a.pow(c, o), l = a.mul(u, r);
    const f = a.mul(u, s), h = a.mul(u, i), p = a.eql(a.sqr(l), c), y = a.eql(a.sqr(f), c);
    u = a.cmov(u, l, p), l = a.cmov(h, f, y);
    const d = a.eql(a.sqr(l), c), g = a.cmov(u, l, d);
    return xo(a, g, c), g;
  };
}
function du(e) {
  if (e < ou)
    throw new Error("sqrt is not defined for small field");
  let t = e - At, n = 0;
  for (; t % cn === Ot; )
    t /= cn, n++;
  let r = cn;
  const s = Vs(e);
  for (; ga(s, r) === 1; )
    if (r++ > 1e3)
      throw new Error("Cannot find square root: probably non-prime P");
  if (n === 1)
    return fu;
  let i = s.pow(r, t);
  const o = (t + At) / cn;
  return function(c, u) {
    if (c.is0(u))
      return u;
    if (ga(c, u) !== 1)
      throw new Error("Cannot find square root");
    let l = n, f = c.mul(c.ONE, i), h = c.pow(u, t), p = c.pow(u, o);
    for (; !c.eql(h, c.ONE); ) {
      if (c.is0(h))
        return c.ZERO;
      let y = 1, d = c.sqr(h);
      for (; !c.eql(d, c.ONE); )
        if (y++, d = c.sqr(d), y === l)
          throw new Error("Cannot find square root");
      const g = At << BigInt(l - y - 1), w = c.pow(f, g);
      l = y, f = c.sqr(w), h = c.mul(h, f), p = c.mul(p, w);
    }
    return p;
  };
}
function Cd(e) {
  return e % au === ou ? fu : e % uu === cu ? Id : e % lu === Ad ? kd(e) : du(e);
}
const Od = [
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
function Bd(e) {
  const t = {
    ORDER: "bigint",
    BYTES: "number",
    BITS: "number"
  }, n = Od.reduce((r, s) => (r[s] = "function", r), t);
  return Eo(e, n), e;
}
function Nd(e, t, n) {
  if (n < Ot)
    throw new Error("invalid exponent, negatives unsupported");
  if (n === Ot)
    return e.ONE;
  if (n === At)
    return t;
  let r = e.ONE, s = t;
  for (; n > Ot; )
    n & At && (r = e.mul(r, s)), s = e.sqr(s), n >>= At;
  return r;
}
function hu(e, t, n = !1) {
  const r = new Array(t.length).fill(n ? e.ZERO : void 0), s = t.reduce((o, a, c) => e.is0(a) ? o : (r[c] = o, e.mul(o, a)), e.ONE), i = e.inv(s);
  return t.reduceRight((o, a, c) => e.is0(a) ? o : (r[c] = e.mul(o, r[c]), e.mul(o, a)), i), r;
}
function ga(e, t) {
  const n = (e.ORDER - At) / cn, r = e.pow(t, n), s = e.eql(r, e.ONE), i = e.eql(r, e.ZERO), o = e.eql(r, e.neg(e.ONE));
  if (!s && !i && !o)
    throw new Error("invalid Legendre symbol result");
  return s ? 1 : i ? 0 : -1;
}
function Rd(e, t) {
  t !== void 0 && ze(t);
  const n = t !== void 0 ? t : e.toString(2).length, r = Math.ceil(n / 8);
  return { nBitLength: n, nByteLength: r };
}
let $d = class {
  ORDER;
  BITS;
  BYTES;
  isLE;
  ZERO = Ot;
  ONE = At;
  _lengths;
  _sqrt;
  // cached sqrt
  _mod;
  constructor(t, n = {}) {
    if (t <= Ot)
      throw new Error("invalid field: expected ORDER > 0, got " + t);
    let r;
    this.isLE = !1, n != null && typeof n == "object" && (typeof n.BITS == "number" && (r = n.BITS), typeof n.sqrt == "function" && (this.sqrt = n.sqrt), typeof n.isLE == "boolean" && (this.isLE = n.isLE), n.allowedLengths && (this._lengths = n.allowedLengths?.slice()), typeof n.modFromBytes == "boolean" && (this._mod = n.modFromBytes));
    const { nBitLength: s, nByteLength: i } = Rd(t, r);
    if (i > 2048)
      throw new Error("invalid field: expected ORDER of <= 2048 bytes");
    this.ORDER = t, this.BITS = s, this.BYTES = i, this._sqrt = void 0, Object.preventExtensions(this);
  }
  create(t) {
    return Yt(t, this.ORDER);
  }
  isValid(t) {
    if (typeof t != "bigint")
      throw new Error("invalid field element: expected bigint, got " + typeof t);
    return Ot <= t && t < this.ORDER;
  }
  is0(t) {
    return t === Ot;
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
    return Nd(this, t, n);
  }
  div(t, n) {
    return Yt(t * pa(n, this.ORDER), this.ORDER);
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
    return pa(t, this.ORDER);
  }
  sqrt(t) {
    return this._sqrt || (this._sqrt = Cd(this.ORDER)), this._sqrt(this, t);
  }
  toBytes(t) {
    return this.isLE ? su(t, this.BYTES) : Cr(t, this.BYTES);
  }
  fromBytes(t, n = !1) {
    Q(t);
    const { _lengths: r, BYTES: s, isLE: i, ORDER: o, _mod: a } = this;
    if (r) {
      if (!r.includes(t.length) || t.length > s)
        throw new Error("Field.fromBytes: expected " + r + " bytes, got " + t.length);
      const u = new Uint8Array(s);
      u.set(t, i ? 0 : u.length - t.length), t = u;
    }
    if (t.length !== s)
      throw new Error("Field.fromBytes: expected " + s + " bytes, got " + t.length);
    let c = i ? ru(t) : Ce(t);
    if (a && (c = Yt(c, o)), !n && !this.isValid(c))
      throw new Error("invalid field element: outside of range 0..ORDER");
    return c;
  }
  // TODO: we don't need it here, move out to separate fn
  invertBatch(t) {
    return hu(this, t);
  }
  // We can't move this out because Fp6, Fp12 implement it
  // and it's unclear what to return in there.
  cmov(t, n, r) {
    return r ? n : t;
  }
};
function Vs(e, t = {}) {
  return new $d(e, t);
}
function pu(e) {
  if (typeof e != "bigint")
    throw new Error("field order must be bigint");
  const t = e.toString(2).length;
  return Math.ceil(t / 8);
}
function gu(e) {
  const t = pu(e);
  return t + Math.ceil(t / 2);
}
function yu(e, t, n = !1) {
  Q(e);
  const r = e.length, s = pu(t), i = gu(t);
  if (r < 16 || r < i || r > 1024)
    throw new Error("expected " + i + "-1024 bytes of input, got " + r);
  const o = n ? ru(e) : Ce(e), a = Yt(o, t - At) + At;
  return n ? su(a, s) : Cr(a, s);
}
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const Pn = /* @__PURE__ */ BigInt(0), un = /* @__PURE__ */ BigInt(1);
function cs(e, t) {
  const n = t.negate();
  return e ? n : t;
}
function ya(e, t) {
  const n = hu(e.Fp, t.map((r) => r.Z));
  return t.map((r, s) => e.fromAffine(r.toAffine(n[s])));
}
function wu(e, t) {
  if (!Number.isSafeInteger(e) || e <= 0 || e > t)
    throw new Error("invalid window size, expected [1.." + t + "], got W=" + e);
}
function ai(e, t) {
  wu(e, t);
  const n = Math.ceil(t / e) + 1, r = 2 ** (e - 1), s = 2 ** e, i = bo(e), o = BigInt(e);
  return { windows: n, windowSize: r, mask: i, maxNumber: s, shiftBy: o };
}
function wa(e, t, n) {
  const { windowSize: r, mask: s, maxNumber: i, shiftBy: o } = n;
  let a = Number(e & s), c = e >> o;
  a > r && (a -= i, c += un);
  const u = t * r, l = u + Math.abs(a) - 1, f = a === 0, h = a < 0, p = t % 2 !== 0;
  return { nextN: c, offset: l, isZero: f, isNeg: h, isNegF: p, offsetF: u };
}
const ci = /* @__PURE__ */ new WeakMap(), mu = /* @__PURE__ */ new WeakMap();
function ui(e) {
  return mu.get(e) || 1;
}
function ma(e) {
  if (e !== Pn)
    throw new Error("invalid wNAF");
}
let Ud = class {
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
    let s = t;
    for (; n > Pn; )
      n & un && (r = r.add(s)), s = s.double(), n >>= un;
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
    const { windows: r, windowSize: s } = ai(n, this.bits), i = [];
    let o = t, a = o;
    for (let c = 0; c < r; c++) {
      a = o, i.push(a);
      for (let u = 1; u < s; u++)
        a = a.add(o), i.push(a);
      o = a.double();
    }
    return i;
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
    let s = this.ZERO, i = this.BASE;
    const o = ai(t, this.bits);
    for (let a = 0; a < o.windows; a++) {
      const { nextN: c, offset: u, isZero: l, isNeg: f, isNegF: h, offsetF: p } = wa(r, a, o);
      r = c, l ? i = i.add(cs(h, n[p])) : s = s.add(cs(f, n[u]));
    }
    return ma(r), { p: s, f: i };
  }
  /**
   * Implements ec unsafe (non const-time) multiplication using precomputed tables and w-ary non-adjacent form.
   * @param acc accumulator point to add result of multiplication
   * @returns point
   */
  wNAFUnsafe(t, n, r, s = this.ZERO) {
    const i = ai(t, this.bits);
    for (let o = 0; o < i.windows && r !== Pn; o++) {
      const { nextN: a, offset: c, isZero: u, isNeg: l } = wa(r, o, i);
      if (r = a, !u) {
        const f = n[c];
        s = s.add(l ? f.negate() : f);
      }
    }
    return ma(r), s;
  }
  getPrecomputes(t, n, r) {
    let s = ci.get(n);
    return s || (s = this.precomputeWindow(n, t), t !== 1 && (typeof r == "function" && (s = r(s)), ci.set(n, s))), s;
  }
  cached(t, n, r) {
    const s = ui(t);
    return this.wNAF(s, this.getPrecomputes(s, t, r), n);
  }
  unsafe(t, n, r, s) {
    const i = ui(t);
    return i === 1 ? this._unsafeLadder(t, n, s) : this.wNAFUnsafe(i, this.getPrecomputes(i, t, r), n, s);
  }
  // We calculate precomputes for elliptic curve point multiplication
  // using windowed method. This specifies window size and
  // stores precomputed values. Usually only base point would be precomputed.
  createCache(t, n) {
    wu(n, this.bits), mu.set(t, n), ci.delete(t);
  }
  hasCache(t) {
    return ui(t) !== 1;
  }
};
function Pd(e, t, n, r) {
  let s = t, i = e.ZERO, o = e.ZERO;
  for (; n > Pn || r > Pn; )
    n & un && (i = i.add(s)), r & un && (o = o.add(s)), s = s.double(), n >>= un, r >>= un;
  return { p1: i, p2: o };
}
function ba(e, t, n) {
  if (t) {
    if (t.ORDER !== e)
      throw new Error("Field.ORDER must match order: Fp == p, Fn == n");
    return Bd(t), t;
  } else
    return Vs(e, { isLE: n });
}
function _d(e, t, n = {}, r) {
  if (r === void 0 && (r = e === "edwards"), !t || typeof t != "object")
    throw new Error(`expected valid ${e} CURVE object`);
  for (const c of ["p", "n", "h"]) {
    const u = t[c];
    if (!(typeof u == "bigint" && u > Pn))
      throw new Error(`CURVE.${c} must be positive bigint`);
  }
  const s = ba(t.p, n.Fp, r), i = ba(t.n, n.Fn, r), a = ["Gx", "Gy", "a", "b"];
  for (const c of a)
    if (!s.isValid(t[c]))
      throw new Error(`CURVE.${c} must be valid field element of CURVE.Fp`);
  return t = Object.freeze(Object.assign({}, t)), { CURVE: t, Fp: s, Fn: i };
}
function bu(e, t) {
  return function(r) {
    const s = e(r);
    return { secretKey: s, publicKey: t(s) };
  };
}
let Eu = class {
  oHash;
  iHash;
  blockLen;
  outputLen;
  finished = !1;
  destroyed = !1;
  constructor(t, n) {
    if (Xc(t), Q(n, void 0, "key"), this.iHash = t.create(), typeof this.iHash.update != "function")
      throw new Error("Expected instance of class which extends utils.Hash");
    this.blockLen = this.iHash.blockLen, this.outputLen = this.iHash.outputLen;
    const r = this.blockLen, s = new Uint8Array(r);
    s.set(n.length > r ? t.create().update(n).digest() : n);
    for (let i = 0; i < s.length; i++)
      s[i] ^= 54;
    this.iHash.update(s), this.oHash = t.create();
    for (let i = 0; i < s.length; i++)
      s[i] ^= 106;
    this.oHash.update(s), Un(s);
  }
  update(t) {
    return is(this), this.iHash.update(t), this;
  }
  digestInto(t) {
    is(this), Q(t, this.outputLen, "output"), this.finished = !0, this.iHash.digestInto(t), this.oHash.update(t), this.oHash.digestInto(t), this.destroy();
  }
  digest() {
    const t = new Uint8Array(this.oHash.outputLen);
    return this.digestInto(t), t;
  }
  _cloneInto(t) {
    t ||= Object.create(Object.getPrototypeOf(this), {});
    const { oHash: n, iHash: r, finished: s, destroyed: i, blockLen: o, outputLen: a } = this;
    return t = t, t.finished = s, t.destroyed = i, t.blockLen = o, t.outputLen = a, t.oHash = n._cloneInto(t.oHash), t.iHash = r._cloneInto(t.iHash), t;
  }
  clone() {
    return this._cloneInto();
  }
  destroy() {
    this.destroyed = !0, this.oHash.destroy(), this.iHash.destroy();
  }
};
const xu = (e, t, n) => new Eu(e, t).update(n).digest();
xu.create = (e, t) => new Eu(e, t);
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const Ea = (e, t) => (e + (e >= 0 ? t : -t) / Tu) / t;
function Ld(e, t, n) {
  const [[r, s], [i, o]] = t, a = Ea(o * e, n), c = Ea(-s * e, n);
  let u = e - a * r - c * i, l = -a * s - c * o;
  const f = u < Se, h = l < Se;
  f && (u = -u), h && (l = -l);
  const p = bo(Math.ceil(Td(n) / 2)) + On;
  if (u < Se || u >= p || l < Se || l >= p)
    throw new Error("splitScalar (endomorphism): failed, k=" + e);
  return { k1neg: f, k1: u, k2neg: h, k2: l };
}
function Ui(e) {
  if (!["compact", "recovered", "der"].includes(e))
    throw new Error('Signature format must be "compact", "recovered", or "der"');
  return e;
}
function li(e, t) {
  const n = {};
  for (let r of Object.keys(t))
    n[r] = e[r] === void 0 ? t[r] : e[r];
  return as(n.lowS, "lowS"), as(n.prehash, "prehash"), n.format !== void 0 && Ui(n.format), n;
}
let Dd = class extends Error {
  constructor(t = "") {
    super(t);
  }
};
const Pe = {
  // asn.1 DER encoding utils
  Err: Dd,
  // Basic building block is TLV (Tag-Length-Value)
  _tlv: {
    encode: (e, t) => {
      const { Err: n } = Pe;
      if (e < 0 || e > 256)
        throw new n("tlv.encode: wrong tag");
      if (t.length & 1)
        throw new n("tlv.encode: unpadded data");
      const r = t.length / 2, s = Pr(r);
      if (s.length / 2 & 128)
        throw new n("tlv.encode: long form length too big");
      const i = r > 127 ? Pr(s.length / 2 | 128) : "";
      return Pr(e) + i + s + t;
    },
    // v - value, l - left bytes (unparsed)
    decode(e, t) {
      const { Err: n } = Pe;
      let r = 0;
      if (e < 0 || e > 256)
        throw new n("tlv.encode: wrong tag");
      if (t.length < 2 || t[r++] !== e)
        throw new n("tlv.decode: wrong tlv");
      const s = t[r++], i = !!(s & 128);
      let o = 0;
      if (!i)
        o = s;
      else {
        const c = s & 127;
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
      if (e < Se)
        throw new t("integer: negative integers are not allowed");
      let n = Pr(e);
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
      return Ce(e);
    }
  },
  toSig(e) {
    const { Err: t, _int: n, _tlv: r } = Pe, s = Q(e, void 0, "signature"), { v: i, l: o } = r.decode(48, s);
    if (o.length)
      throw new t("invalid signature: left bytes after parsing");
    const { v: a, l: c } = r.decode(2, i), { v: u, l } = r.decode(2, c);
    if (l.length)
      throw new t("invalid signature: left bytes after parsing");
    return { r: n.decode(a), s: n.decode(u) };
  },
  hexFromSig(e) {
    const { _tlv: t, _int: n } = Pe, r = t.encode(2, n.encode(e.r)), s = t.encode(2, n.encode(e.s)), i = r + s;
    return t.encode(48, i);
  }
}, Se = BigInt(0), On = BigInt(1), Tu = BigInt(2), _r = BigInt(3), Vd = BigInt(4);
function Md(e, t = {}) {
  const n = _d("weierstrass", e, t), { Fp: r, Fn: s } = n;
  let i = n.CURVE;
  const { h: o, n: a } = i;
  Eo(t, {}, {
    allowInfinityPoint: "boolean",
    clearCofactor: "function",
    isTorsionFree: "function",
    fromBytes: "function",
    toBytes: "function",
    endo: "object"
  });
  const { endo: c } = t;
  if (c && (!r.is0(i.a) || typeof c.beta != "bigint" || !Array.isArray(c.basises)))
    throw new Error('invalid endo: expected "beta": bigint and "basises": array');
  const u = vu(r, s);
  function l() {
    if (!r.isOdd)
      throw new Error("compression is not supported: Field does not have .isOdd()");
  }
  function f(M, x, E) {
    const { x: m, y: S } = x.toAffine(), C = r.toBytes(m);
    if (as(E, "isCompressed"), E) {
      l();
      const N = !r.isOdd(S);
      return Jt(Su(N), C);
    } else
      return Jt(Uint8Array.of(4), C, r.toBytes(S));
  }
  function h(M) {
    Q(M, void 0, "Point");
    const { publicKey: x, publicKeyUncompressed: E } = u, m = M.length, S = M[0], C = M.subarray(1);
    if (m === x && (S === 2 || S === 3)) {
      const N = r.fromBytes(C);
      if (!r.isValid(N))
        throw new Error("bad point: is not on curve, wrong x");
      const B = d(N);
      let k;
      try {
        k = r.sqrt(B);
      } catch (q) {
        const W = q instanceof Error ? ": " + q.message : "";
        throw new Error("bad point: is not on curve, sqrt error" + W);
      }
      l();
      const R = r.isOdd(k);
      return (S & 1) === 1 !== R && (k = r.neg(k)), { x: N, y: k };
    } else if (m === E && S === 4) {
      const N = r.BYTES, B = r.fromBytes(C.subarray(0, N)), k = r.fromBytes(C.subarray(N, N * 2));
      if (!g(B, k))
        throw new Error("bad point: is not on curve");
      return { x: B, y: k };
    } else
      throw new Error(`bad point: got length ${m}, expected compressed=${x} or uncompressed=${E}`);
  }
  const p = t.toBytes || f, y = t.fromBytes || h;
  function d(M) {
    const x = r.sqr(M), E = r.mul(x, M);
    return r.add(r.add(E, r.mul(M, i.a)), i.b);
  }
  function g(M, x) {
    const E = r.sqr(x), m = d(M);
    return r.eql(E, m);
  }
  if (!g(i.Gx, i.Gy))
    throw new Error("bad curve params: generator point");
  const w = r.mul(r.pow(i.a, _r), Vd), A = r.mul(r.sqr(i.b), BigInt(27));
  if (r.is0(r.add(w, A)))
    throw new Error("bad curve params: a or b");
  function O(M, x, E = !1) {
    if (!r.isValid(x) || E && r.is0(x))
      throw new Error(`bad point coordinate ${M}`);
    return x;
  }
  function P(M) {
    if (!(M instanceof L))
      throw new Error("Weierstrass Point expected");
  }
  function V(M) {
    if (!c || !c.basises)
      throw new Error("no endo");
    return Ld(M, c.basises, s.ORDER);
  }
  const Y = ha((M, x) => {
    const { X: E, Y: m, Z: S } = M;
    if (r.eql(S, r.ONE))
      return { x: E, y: m };
    const C = M.is0();
    x == null && (x = C ? r.ONE : r.inv(S));
    const N = r.mul(E, x), B = r.mul(m, x), k = r.mul(S, x);
    if (C)
      return { x: r.ZERO, y: r.ZERO };
    if (!r.eql(k, r.ONE))
      throw new Error("invZ was invalid");
    return { x: N, y: B };
  }), T = ha((M) => {
    if (M.is0()) {
      if (t.allowInfinityPoint && !r.is0(M.Y))
        return;
      throw new Error("bad point: ZERO");
    }
    const { x, y: E } = M.toAffine();
    if (!r.isValid(x) || !r.isValid(E))
      throw new Error("bad point: x or y not field elements");
    if (!g(x, E))
      throw new Error("bad point: equation left != right");
    if (!M.isTorsionFree())
      throw new Error("bad point: not in prime-order subgroup");
    return !0;
  });
  function et(M, x, E, m, S) {
    return E = new L(r.mul(E.X, M), E.Y, E.Z), x = cs(m, x), E = cs(S, E), x.add(E);
  }
  class L {
    // base / generator point
    static BASE = new L(i.Gx, i.Gy, r.ONE);
    // zero / infinity / identity point
    static ZERO = new L(r.ZERO, r.ONE, r.ZERO);
    // 0, 1, 0
    // math field
    static Fp = r;
    // scalar field
    static Fn = s;
    X;
    Y;
    Z;
    /** Does NOT validate if the point is valid. Use `.assertValidity()`. */
    constructor(x, E, m) {
      this.X = O("x", x), this.Y = O("y", E, !0), this.Z = O("z", m), Object.freeze(this);
    }
    static CURVE() {
      return i;
    }
    /** Does NOT validate if the point is valid. Use `.assertValidity()`. */
    static fromAffine(x) {
      const { x: E, y: m } = x || {};
      if (!x || !r.isValid(E) || !r.isValid(m))
        throw new Error("invalid affine point");
      if (x instanceof L)
        throw new Error("projective point not allowed");
      return r.is0(E) && r.is0(m) ? L.ZERO : new L(E, m, r.ONE);
    }
    static fromBytes(x) {
      const E = L.fromAffine(y(Q(x, void 0, "point")));
      return E.assertValidity(), E;
    }
    static fromHex(x) {
      return L.fromBytes(os(x));
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
    precompute(x = 8, E = !0) {
      return lt.createCache(this, x), E || this.multiply(_r), this;
    }
    // TODO: return `this`
    /** A point on curve is valid if it conforms to equation. */
    assertValidity() {
      T(this);
    }
    hasEvenY() {
      const { y: x } = this.toAffine();
      if (!r.isOdd)
        throw new Error("Field doesn't support isOdd");
      return !r.isOdd(x);
    }
    /** Compare one point to another. */
    equals(x) {
      P(x);
      const { X: E, Y: m, Z: S } = this, { X: C, Y: N, Z: B } = x, k = r.eql(r.mul(E, B), r.mul(C, S)), R = r.eql(r.mul(m, B), r.mul(N, S));
      return k && R;
    }
    /** Flips point to one corresponding to (x, -y) in Affine coordinates. */
    negate() {
      return new L(this.X, r.neg(this.Y), this.Z);
    }
    // Renes-Costello-Batina exception-free doubling formula.
    // There is 30% faster Jacobian formula, but it is not complete.
    // https://eprint.iacr.org/2015/1060, algorithm 3
    // Cost: 8M + 3S + 3*a + 2*b3 + 15add.
    double() {
      const { a: x, b: E } = i, m = r.mul(E, _r), { X: S, Y: C, Z: N } = this;
      let B = r.ZERO, k = r.ZERO, R = r.ZERO, _ = r.mul(S, S), q = r.mul(C, C), W = r.mul(N, N), D = r.mul(S, C);
      return D = r.add(D, D), R = r.mul(S, N), R = r.add(R, R), B = r.mul(x, R), k = r.mul(m, W), k = r.add(B, k), B = r.sub(q, k), k = r.add(q, k), k = r.mul(B, k), B = r.mul(D, B), R = r.mul(m, R), W = r.mul(x, W), D = r.sub(_, W), D = r.mul(x, D), D = r.add(D, R), R = r.add(_, _), _ = r.add(R, _), _ = r.add(_, W), _ = r.mul(_, D), k = r.add(k, _), W = r.mul(C, N), W = r.add(W, W), _ = r.mul(W, D), B = r.sub(B, _), R = r.mul(W, q), R = r.add(R, R), R = r.add(R, R), new L(B, k, R);
    }
    // Renes-Costello-Batina exception-free addition formula.
    // There is 30% faster Jacobian formula, but it is not complete.
    // https://eprint.iacr.org/2015/1060, algorithm 1
    // Cost: 12M + 0S + 3*a + 3*b3 + 23add.
    add(x) {
      P(x);
      const { X: E, Y: m, Z: S } = this, { X: C, Y: N, Z: B } = x;
      let k = r.ZERO, R = r.ZERO, _ = r.ZERO;
      const q = i.a, W = r.mul(i.b, _r);
      let D = r.mul(E, C), K = r.mul(m, N), Z = r.mul(S, B), ft = r.add(E, m), z = r.add(C, N);
      ft = r.mul(ft, z), z = r.add(D, K), ft = r.sub(ft, z), z = r.add(E, S);
      let J = r.add(C, B);
      return z = r.mul(z, J), J = r.add(D, Z), z = r.sub(z, J), J = r.add(m, S), k = r.add(N, B), J = r.mul(J, k), k = r.add(K, Z), J = r.sub(J, k), _ = r.mul(q, z), k = r.mul(W, Z), _ = r.add(k, _), k = r.sub(K, _), _ = r.add(K, _), R = r.mul(k, _), K = r.add(D, D), K = r.add(K, D), Z = r.mul(q, Z), z = r.mul(W, z), K = r.add(K, Z), Z = r.sub(D, Z), Z = r.mul(q, Z), z = r.add(z, Z), D = r.mul(K, z), R = r.add(R, D), D = r.mul(J, z), k = r.mul(ft, k), k = r.sub(k, D), D = r.mul(ft, K), _ = r.mul(J, _), _ = r.add(_, D), new L(k, R, _);
    }
    subtract(x) {
      return this.add(x.negate());
    }
    is0() {
      return this.equals(L.ZERO);
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
      const { endo: E } = t;
      if (!s.isValidNot0(x))
        throw new Error("invalid scalar: out of range");
      let m, S;
      const C = (N) => lt.cached(this, N, (B) => ya(L, B));
      if (E) {
        const { k1neg: N, k1: B, k2neg: k, k2: R } = V(x), { p: _, f: q } = C(B), { p: W, f: D } = C(R);
        S = q.add(D), m = et(E.beta, _, W, N, k);
      } else {
        const { p: N, f: B } = C(x);
        m = N, S = B;
      }
      return ya(L, [m, S])[0];
    }
    /**
     * Non-constant-time multiplication. Uses double-and-add algorithm.
     * It's faster, but should only be used when you don't care about
     * an exposed secret key e.g. sig verification, which works over *public* keys.
     */
    multiplyUnsafe(x) {
      const { endo: E } = t, m = this;
      if (!s.isValid(x))
        throw new Error("invalid scalar: out of range");
      if (x === Se || m.is0())
        return L.ZERO;
      if (x === On)
        return m;
      if (lt.hasCache(this))
        return this.multiply(x);
      if (E) {
        const { k1neg: S, k1: C, k2neg: N, k2: B } = V(x), { p1: k, p2: R } = Pd(L, m, C, B);
        return et(E.beta, k, R, S, N);
      } else
        return lt.unsafe(m, x);
    }
    /**
     * Converts Projective point to affine (x, y) coordinates.
     * @param invertedZ Z^-1 (inverted zero) - optional, precomputation is useful for invertBatch
     */
    toAffine(x) {
      return Y(this, x);
    }
    /**
     * Checks whether Point is free of torsion elements (is in prime subgroup).
     * Always torsion-free for cofactor=1 curves.
     */
    isTorsionFree() {
      const { isTorsionFree: x } = t;
      return o === On ? !0 : x ? x(L, this) : lt.unsafe(this, a).is0();
    }
    clearCofactor() {
      const { clearCofactor: x } = t;
      return o === On ? this : x ? x(L, this) : this.multiplyUnsafe(o);
    }
    isSmallOrder() {
      return this.multiplyUnsafe(o).is0();
    }
    toBytes(x = !0) {
      return as(x, "isCompressed"), this.assertValidity(), p(L, this, x);
    }
    toHex(x = !0) {
      return Ds(this.toBytes(x));
    }
    toString() {
      return `<Point ${this.is0() ? "ZERO" : this.toHex()}>`;
    }
  }
  const I = s.BITS, lt = new Ud(L, t.endo ? Math.ceil(I / 2) : I);
  return L.BASE.precompute(8), L;
}
function Su(e) {
  return Uint8Array.of(e ? 2 : 3);
}
function vu(e, t) {
  return {
    secretKey: t.BYTES,
    publicKey: 1 + e.BYTES,
    publicKeyUncompressed: 1 + 2 * e.BYTES,
    publicKeyHasPrefix: !0,
    signature: 2 * t.BYTES
  };
}
function Hd(e, t = {}) {
  const { Fn: n } = e, r = t.randomBytes || kr, s = Object.assign(vu(e.Fp, n), { seed: gu(n.ORDER) });
  function i(p) {
    try {
      const y = n.fromBytes(p);
      return n.isValidNot0(y);
    } catch {
      return !1;
    }
  }
  function o(p, y) {
    const { publicKey: d, publicKeyUncompressed: g } = s;
    try {
      const w = p.length;
      return y === !0 && w !== d || y === !1 && w !== g ? !1 : !!e.fromBytes(p);
    } catch {
      return !1;
    }
  }
  function a(p = r(s.seed)) {
    return yu(Q(p, s.seed, "seed"), n.ORDER);
  }
  function c(p, y = !0) {
    return e.BASE.multiply(n.fromBytes(p)).toBytes(y);
  }
  function u(p) {
    const { secretKey: y, publicKey: d, publicKeyUncompressed: g } = s;
    if (!wo(p) || "_lengths" in n && n._lengths || y === d)
      return;
    const w = Q(p, void 0, "key").length;
    return w === d || w === g;
  }
  function l(p, y, d = !0) {
    if (u(p) === !0)
      throw new Error("first arg must be private key");
    if (u(y) === !1)
      throw new Error("second arg must be public key");
    const g = n.fromBytes(p);
    return e.fromBytes(y).multiply(g).toBytes(d);
  }
  const f = {
    isValidSecretKey: i,
    isValidPublicKey: o,
    randomSecretKey: a
  }, h = bu(a, c);
  return Object.freeze({ getPublicKey: c, getSharedSecret: l, keygen: h, Point: e, utils: f, lengths: s });
}
function Fd(e, t, n = {}) {
  Xc(t), Eo(n, {}, {
    hmac: "function",
    lowS: "boolean",
    randomBytes: "function",
    bits2int: "function",
    bits2int_modN: "function"
  }), n = Object.assign({}, n);
  const r = n.randomBytes || kr, s = n.hmac || ((E, m) => xu(t, E, m)), { Fp: i, Fn: o } = e, { ORDER: a, BITS: c } = o, { keygen: u, getPublicKey: l, getSharedSecret: f, utils: h, lengths: p } = Hd(e, n), y = {
    prehash: !0,
    lowS: typeof n.lowS == "boolean" ? n.lowS : !0,
    format: "compact",
    extraEntropy: !1
  }, d = a * Tu < i.ORDER;
  function g(E) {
    const m = a >> On;
    return E > m;
  }
  function w(E, m) {
    if (!o.isValidNot0(m))
      throw new Error(`invalid signature ${E}: out of range 1..Point.Fn.ORDER`);
    return m;
  }
  function A() {
    if (d)
      throw new Error('"recovered" sig type is not supported for cofactor >2 curves');
  }
  function O(E, m) {
    Ui(m);
    const S = p.signature, C = m === "compact" ? S : m === "recovered" ? S + 1 : void 0;
    return Q(E, C);
  }
  class P {
    r;
    s;
    recovery;
    constructor(m, S, C) {
      if (this.r = w("r", m), this.s = w("s", S), C != null) {
        if (A(), ![0, 1, 2, 3].includes(C))
          throw new Error("invalid recovery id");
        this.recovery = C;
      }
      Object.freeze(this);
    }
    static fromBytes(m, S = y.format) {
      O(m, S);
      let C;
      if (S === "der") {
        const { r: R, s: _ } = Pe.toSig(Q(m));
        return new P(R, _);
      }
      S === "recovered" && (C = m[0], S = "compact", m = m.subarray(1));
      const N = p.signature / 2, B = m.subarray(0, N), k = m.subarray(N, N * 2);
      return new P(o.fromBytes(B), o.fromBytes(k), C);
    }
    static fromHex(m, S) {
      return this.fromBytes(os(m), S);
    }
    assertRecovery() {
      const { recovery: m } = this;
      if (m == null)
        throw new Error("invalid recovery id: must be present");
      return m;
    }
    addRecoveryBit(m) {
      return new P(this.r, this.s, m);
    }
    recoverPublicKey(m) {
      const { r: S, s: C } = this, N = this.assertRecovery(), B = N === 2 || N === 3 ? S + a : S;
      if (!i.isValid(B))
        throw new Error("invalid recovery id: sig.r+curve.n != R.x");
      const k = i.toBytes(B), R = e.fromBytes(Jt(Su((N & 1) === 0), k)), _ = o.inv(B), q = Y(Q(m, void 0, "msgHash")), W = o.create(-q * _), D = o.create(C * _), K = e.BASE.multiplyUnsafe(W).add(R.multiplyUnsafe(D));
      if (K.is0())
        throw new Error("invalid recovery: point at infinify");
      return K.assertValidity(), K;
    }
    // Signatures should be low-s, to prevent malleability.
    hasHighS() {
      return g(this.s);
    }
    toBytes(m = y.format) {
      if (Ui(m), m === "der")
        return os(Pe.hexFromSig(this));
      const { r: S, s: C } = this, N = o.toBytes(S), B = o.toBytes(C);
      return m === "recovered" ? (A(), Jt(Uint8Array.of(this.assertRecovery()), N, B)) : Jt(N, B);
    }
    toHex(m) {
      return Ds(this.toBytes(m));
    }
  }
  const V = n.bits2int || function(m) {
    if (m.length > 8192)
      throw new Error("input is too large");
    const S = Ce(m), C = m.length * 8 - c;
    return C > 0 ? S >> BigInt(C) : S;
  }, Y = n.bits2int_modN || function(m) {
    return o.create(V(m));
  }, T = bo(c);
  function et(E) {
    return iu("num < 2^" + c, E, Se, T), o.toBytes(E);
  }
  function L(E, m) {
    return Q(E, void 0, "message"), m ? Q(t(E), void 0, "prehashed message") : E;
  }
  function I(E, m, S) {
    const { lowS: C, prehash: N, extraEntropy: B } = li(S, y);
    E = L(E, N);
    const k = Y(E), R = o.fromBytes(m);
    if (!o.isValidNot0(R))
      throw new Error("invalid private key");
    const _ = [et(R), et(k)];
    if (B != null && B !== !1) {
      const K = B === !0 ? r(p.secretKey) : B;
      _.push(Q(K, void 0, "extraEntropy"));
    }
    const q = Jt(..._), W = k;
    function D(K) {
      const Z = V(K);
      if (!o.isValidNot0(Z))
        return;
      const ft = o.inv(Z), z = e.BASE.multiply(Z).toAffine(), J = o.create(z.x);
      if (J === Se)
        return;
      const jt = o.create(ft * o.create(W + J * R));
      if (jt === Se)
        return;
      let en = (z.x === J ? 0 : 2) | Number(z.y & On), nn = jt;
      return C && g(jt) && (nn = o.neg(jt), en ^= 1), new P(J, nn, d ? void 0 : en);
    }
    return { seed: q, k2sig: D };
  }
  function lt(E, m, S = {}) {
    const { seed: C, k2sig: N } = I(E, m, S);
    return Sd(t.outputLen, o.BYTES, s)(C, N).toBytes(S.format);
  }
  function M(E, m, S, C = {}) {
    const { lowS: N, prehash: B, format: k } = li(C, y);
    if (S = Q(S, void 0, "publicKey"), m = L(m, B), !wo(E)) {
      const R = E instanceof P ? ", use sig.toBytes()" : "";
      throw new Error("verify expects Uint8Array signature" + R);
    }
    O(E, k);
    try {
      const R = P.fromBytes(E, k), _ = e.fromBytes(S);
      if (N && R.hasHighS())
        return !1;
      const { r: q, s: W } = R, D = Y(m), K = o.inv(W), Z = o.create(D * K), ft = o.create(q * K), z = e.BASE.multiplyUnsafe(Z).add(_.multiplyUnsafe(ft));
      return z.is0() ? !1 : o.create(z.x) === q;
    } catch {
      return !1;
    }
  }
  function x(E, m, S = {}) {
    const { prehash: C } = li(S, y);
    return m = L(m, C), P.fromBytes(E, "recovered").recoverPublicKey(m).toBytes();
  }
  return Object.freeze({
    keygen: u,
    getPublicKey: l,
    getSharedSecret: f,
    utils: h,
    lengths: p,
    Point: e,
    sign: lt,
    verify: M,
    recoverPublicKey: x,
    Signature: P,
    hash: t
  });
}
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const Ms = {
  p: BigInt("0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffefffffc2f"),
  n: BigInt("0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141"),
  h: BigInt(1),
  a: BigInt(0),
  b: BigInt(7),
  Gx: BigInt("0x79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798"),
  Gy: BigInt("0x483ada7726a3c4655da4fbfc0e1108a8fd17b448a68554199c47d08ffb10d4b8")
}, Wd = {
  beta: BigInt("0x7ae96a2b657c07106e64479eac3434e99cf0497512f58995c1396c28719501ee"),
  basises: [
    [BigInt("0x3086d221a7d46bcde86c90e49284eb15"), -BigInt("0xe4437ed6010e88286f547fa90abfe4c3")],
    [BigInt("0x114ca50f7a8e2f3f657c1108d9d44cfd8"), BigInt("0x3086d221a7d46bcde86c90e49284eb15")]
  ]
}, Kd = /* @__PURE__ */ BigInt(0), Pi = /* @__PURE__ */ BigInt(2);
function zd(e) {
  const t = Ms.p, n = BigInt(3), r = BigInt(6), s = BigInt(11), i = BigInt(22), o = BigInt(23), a = BigInt(44), c = BigInt(88), u = e * e * e % t, l = u * u * e % t, f = Ht(l, n, t) * l % t, h = Ht(f, n, t) * l % t, p = Ht(h, Pi, t) * u % t, y = Ht(p, s, t) * p % t, d = Ht(y, i, t) * y % t, g = Ht(d, a, t) * d % t, w = Ht(g, c, t) * g % t, A = Ht(w, a, t) * d % t, O = Ht(A, n, t) * l % t, P = Ht(O, o, t) * y % t, V = Ht(P, r, t) * u % t, Y = Ht(V, Pi, t);
  if (!us.eql(us.sqr(Y), e))
    throw new Error("Cannot find square root");
  return Y;
}
const us = Vs(Ms.p, { sqrt: zd }), Sn = /* @__PURE__ */ Md(Ms, {
  Fp: us,
  endo: Wd
}), Ve = /* @__PURE__ */ Fd(Sn, vt), xa = {};
function ls(e, ...t) {
  let n = xa[e];
  if (n === void 0) {
    const r = vt(Ed(e));
    n = Jt(r, r), xa[e] = n;
  }
  return vt(Jt(n, ...t));
}
const To = (e) => e.toBytes(!0).slice(1), So = (e) => e % Pi === Kd;
function _i(e) {
  const { Fn: t, BASE: n } = Sn, r = t.fromBytes(e), s = n.multiply(r);
  return { scalar: So(s.y) ? r : t.neg(r), bytes: To(s) };
}
function Au(e) {
  const t = us;
  if (!t.isValidNot0(e))
    throw new Error("invalid x: Fail if x ≥ p");
  const n = t.create(e * e), r = t.create(n * e + BigInt(7));
  let s = t.sqrt(r);
  So(s) || (s = t.neg(s));
  const i = Sn.fromAffine({ x: e, y: s });
  return i.assertValidity(), i;
}
const or = Ce;
function Iu(...e) {
  return Sn.Fn.create(or(ls("BIP0340/challenge", ...e)));
}
function Ta(e) {
  return _i(e).bytes;
}
function jd(e, t, n = kr(32)) {
  const { Fn: r } = Sn, s = Q(e, void 0, "message"), { bytes: i, scalar: o } = _i(t), a = Q(n, 32, "auxRand"), c = r.toBytes(o ^ or(ls("BIP0340/aux", a))), u = ls("BIP0340/nonce", c, i, s), { bytes: l, scalar: f } = _i(u), h = Iu(l, i, s), p = new Uint8Array(64);
  if (p.set(l, 0), p.set(r.toBytes(r.create(f + h * o)), 32), !ku(p, s, i))
    throw new Error("sign: Invalid signature produced");
  return p;
}
function ku(e, t, n) {
  const { Fp: r, Fn: s, BASE: i } = Sn, o = Q(e, 64, "signature"), a = Q(t, void 0, "message"), c = Q(n, 32, "publicKey");
  try {
    const u = Au(or(c)), l = or(o.subarray(0, 32));
    if (!r.isValidNot0(l))
      return !1;
    const f = or(o.subarray(32, 64));
    if (!s.isValidNot0(f))
      return !1;
    const h = Iu(s.toBytes(l), To(u), a), p = i.multiplyUnsafe(f).add(u.multiplyUnsafe(s.neg(h))), { x: y, y: d } = p.toAffine();
    return !(p.is0() || !So(d) || y !== l);
  } catch {
    return !1;
  }
}
const Oe = /* @__PURE__ */ (() => {
  const n = (r = kr(48)) => yu(r, Ms.n);
  return {
    keygen: bu(n, Ta),
    getPublicKey: Ta,
    sign: jd,
    verify: ku,
    Point: Sn,
    utils: {
      randomSecretKey: n,
      taggedHash: ls,
      lift_x: Au,
      pointToBytes: To
    },
    lengths: {
      secretKey: 32,
      publicKey: 32,
      publicKeyHasPrefix: !1,
      signature: 64,
      seed: 48
    }
  };
})(), Gd = /* @__PURE__ */ Uint8Array.from([
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
]), Cu = Uint8Array.from(new Array(16).fill(0).map((e, t) => t)), qd = Cu.map((e) => (9 * e + 5) % 16), Ou = /* @__PURE__ */ (() => {
  const n = [[Cu], [qd]];
  for (let r = 0; r < 4; r++)
    for (let s of n)
      s.push(s[r].map((i) => Gd[i]));
  return n;
})(), Bu = Ou[0], Nu = Ou[1], Ru = /* @__PURE__ */ [
  [11, 14, 15, 12, 5, 8, 7, 9, 11, 13, 14, 15, 6, 7, 9, 8],
  [12, 13, 11, 15, 6, 9, 9, 7, 12, 15, 11, 13, 7, 8, 7, 7],
  [13, 15, 14, 11, 7, 7, 6, 8, 13, 14, 13, 12, 5, 5, 6, 9],
  [14, 11, 12, 14, 8, 6, 5, 5, 15, 12, 15, 14, 9, 9, 8, 6],
  [15, 12, 13, 13, 9, 5, 8, 6, 14, 11, 12, 11, 8, 6, 5, 5]
].map((e) => Uint8Array.from(e)), Yd = /* @__PURE__ */ Bu.map((e, t) => e.map((n) => Ru[t][n])), Zd = /* @__PURE__ */ Nu.map((e, t) => e.map((n) => Ru[t][n])), Xd = /* @__PURE__ */ Uint32Array.from([
  0,
  1518500249,
  1859775393,
  2400959708,
  2840853838
]), Qd = /* @__PURE__ */ Uint32Array.from([
  1352829926,
  1548603684,
  1836072691,
  2053994217,
  0
]);
function Sa(e, t, n, r) {
  return e === 0 ? t ^ n ^ r : e === 1 ? t & n | ~t & r : e === 2 ? (t | ~n) ^ r : e === 3 ? t & r | n & ~r : t ^ (n | ~r);
}
const Lr = /* @__PURE__ */ new Uint32Array(16);
class Jd extends tu {
  h0 = 1732584193;
  h1 = -271733879;
  h2 = -1732584194;
  h3 = 271733878;
  h4 = -1009589776;
  constructor() {
    super(64, 20, 8, !0);
  }
  get() {
    const { h0: t, h1: n, h2: r, h3: s, h4: i } = this;
    return [t, n, r, s, i];
  }
  set(t, n, r, s, i) {
    this.h0 = t | 0, this.h1 = n | 0, this.h2 = r | 0, this.h3 = s | 0, this.h4 = i | 0;
  }
  process(t, n) {
    for (let p = 0; p < 16; p++, n += 4)
      Lr[p] = t.getUint32(n, !0);
    let r = this.h0 | 0, s = r, i = this.h1 | 0, o = i, a = this.h2 | 0, c = a, u = this.h3 | 0, l = u, f = this.h4 | 0, h = f;
    for (let p = 0; p < 5; p++) {
      const y = 4 - p, d = Xd[p], g = Qd[p], w = Bu[p], A = Nu[p], O = Yd[p], P = Zd[p];
      for (let V = 0; V < 16; V++) {
        const Y = Ur(r + Sa(p, i, a, u) + Lr[w[V]] + d, O[V]) + f | 0;
        r = f, f = u, u = Ur(a, 10) | 0, a = i, i = Y;
      }
      for (let V = 0; V < 16; V++) {
        const Y = Ur(s + Sa(y, o, c, l) + Lr[A[V]] + g, P[V]) + h | 0;
        s = h, h = l, l = Ur(c, 10) | 0, c = o, o = Y;
      }
    }
    this.set(this.h1 + a + l | 0, this.h2 + u + h | 0, this.h3 + f + s | 0, this.h4 + r + o | 0, this.h0 + i + c | 0);
  }
  roundClean() {
    Un(Lr);
  }
  destroy() {
    this.destroyed = !0, Un(this.buffer), this.set(0, 0, 0, 0, 0);
  }
}
const th = /* @__PURE__ */ Jc(() => new Jd());
/*! scure-base - MIT License (c) 2022 Paul Miller (paulmillr.com) */
function _n(e) {
  return e instanceof Uint8Array || ArrayBuffer.isView(e) && e.constructor.name === "Uint8Array";
}
function $u(e) {
  if (!_n(e))
    throw new Error("Uint8Array expected");
}
function Uu(e, t) {
  return Array.isArray(t) ? t.length === 0 ? !0 : e ? t.every((n) => typeof n == "string") : t.every((n) => Number.isSafeInteger(n)) : !1;
}
function vo(e) {
  if (typeof e != "function")
    throw new Error("function expected");
  return !0;
}
function je(e, t) {
  if (typeof t != "string")
    throw new Error(`${e}: string expected`);
  return !0;
}
function qn(e) {
  if (!Number.isSafeInteger(e))
    throw new Error(`invalid integer: ${e}`);
}
function fs(e) {
  if (!Array.isArray(e))
    throw new Error("array expected");
}
function ds(e, t) {
  if (!Uu(!0, t))
    throw new Error(`${e}: array of strings expected`);
}
function Ao(e, t) {
  if (!Uu(!1, t))
    throw new Error(`${e}: array of numbers expected`);
}
// @__NO_SIDE_EFFECTS__
function Or(...e) {
  const t = (i) => i, n = (i, o) => (a) => i(o(a)), r = e.map((i) => i.encode).reduceRight(n, t), s = e.map((i) => i.decode).reduce(n, t);
  return { encode: r, decode: s };
}
// @__NO_SIDE_EFFECTS__
function Hs(e) {
  const t = typeof e == "string" ? e.split("") : e, n = t.length;
  ds("alphabet", t);
  const r = new Map(t.map((s, i) => [s, i]));
  return {
    encode: (s) => (fs(s), s.map((i) => {
      if (!Number.isSafeInteger(i) || i < 0 || i >= n)
        throw new Error(`alphabet.encode: digit index outside alphabet "${i}". Allowed: ${e}`);
      return t[i];
    })),
    decode: (s) => (fs(s), s.map((i) => {
      je("alphabet.decode", i);
      const o = r.get(i);
      if (o === void 0)
        throw new Error(`Unknown letter: "${i}". Allowed: ${e}`);
      return o;
    }))
  };
}
// @__NO_SIDE_EFFECTS__
function Fs(e = "") {
  return je("join", e), {
    encode: (t) => (ds("join.decode", t), t.join(e)),
    decode: (t) => (je("join.decode", t), t.split(e))
  };
}
// @__NO_SIDE_EFFECTS__
function eh(e, t = "=") {
  return qn(e), je("padding", t), {
    encode(n) {
      for (ds("padding.encode", n); n.length * e % 8; )
        n.push(t);
      return n;
    },
    decode(n) {
      ds("padding.decode", n);
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
function nh(e) {
  return vo(e), { encode: (t) => t, decode: (t) => e(t) };
}
function va(e, t, n) {
  if (t < 2)
    throw new Error(`convertRadix: invalid from=${t}, base cannot be less than 2`);
  if (n < 2)
    throw new Error(`convertRadix: invalid to=${n}, base cannot be less than 2`);
  if (fs(e), !e.length)
    return [];
  let r = 0;
  const s = [], i = Array.from(e, (a) => {
    if (qn(a), a < 0 || a >= t)
      throw new Error(`invalid integer: ${a}`);
    return a;
  }), o = i.length;
  for (; ; ) {
    let a = 0, c = !0;
    for (let u = r; u < o; u++) {
      const l = i[u], f = t * a, h = f + l;
      if (!Number.isSafeInteger(h) || f / t !== a || h - l !== f)
        throw new Error("convertRadix: carry overflow");
      const p = h / n;
      a = h % n;
      const y = Math.floor(p);
      if (i[u] = y, !Number.isSafeInteger(y) || y * n + a !== h)
        throw new Error("convertRadix: carry overflow");
      if (c)
        y ? c = !1 : r = u;
      else continue;
    }
    if (s.push(a), c)
      break;
  }
  for (let a = 0; a < e.length - 1 && e[a] === 0; a++)
    s.push(0);
  return s.reverse();
}
const Pu = (e, t) => t === 0 ? e : Pu(t, e % t), hs = /* @__NO_SIDE_EFFECTS__ */ (e, t) => e + (t - Pu(e, t)), Yr = /* @__PURE__ */ (() => {
  let e = [];
  for (let t = 0; t < 40; t++)
    e.push(2 ** t);
  return e;
})();
function Li(e, t, n, r) {
  if (fs(e), t <= 0 || t > 32)
    throw new Error(`convertRadix2: wrong from=${t}`);
  if (n <= 0 || n > 32)
    throw new Error(`convertRadix2: wrong to=${n}`);
  if (/* @__PURE__ */ hs(t, n) > 32)
    throw new Error(`convertRadix2: carry overflow from=${t} to=${n} carryBits=${/* @__PURE__ */ hs(t, n)}`);
  let s = 0, i = 0;
  const o = Yr[t], a = Yr[n] - 1, c = [];
  for (const u of e) {
    if (qn(u), u >= o)
      throw new Error(`convertRadix2: invalid data word=${u} from=${t}`);
    if (s = s << t | u, i + t > 32)
      throw new Error(`convertRadix2: carry overflow pos=${i} from=${t}`);
    for (i += t; i >= n; i -= n)
      c.push((s >> i - n & a) >>> 0);
    const l = Yr[i];
    if (l === void 0)
      throw new Error("invalid carry");
    s &= l - 1;
  }
  if (s = s << n - i & a, !r && i >= t)
    throw new Error("Excess padding");
  if (!r && s > 0)
    throw new Error(`Non-zero padding: ${s}`);
  return r && i > 0 && c.push(s >>> 0), c;
}
// @__NO_SIDE_EFFECTS__
function rh(e) {
  qn(e);
  const t = 2 ** 8;
  return {
    encode: (n) => {
      if (!_n(n))
        throw new Error("radix.encode input should be Uint8Array");
      return va(Array.from(n), t, e);
    },
    decode: (n) => (Ao("radix.decode", n), Uint8Array.from(va(n, e, t)))
  };
}
// @__NO_SIDE_EFFECTS__
function Io(e, t = !1) {
  if (qn(e), e <= 0 || e > 32)
    throw new Error("radix2: bits should be in (0..32]");
  if (/* @__PURE__ */ hs(8, e) > 32 || /* @__PURE__ */ hs(e, 8) > 32)
    throw new Error("radix2: carry overflow");
  return {
    encode: (n) => {
      if (!_n(n))
        throw new Error("radix2.encode input should be Uint8Array");
      return Li(Array.from(n), 8, e, !t);
    },
    decode: (n) => (Ao("radix2.decode", n), Uint8Array.from(Li(n, e, 8, t)))
  };
}
function Aa(e) {
  return vo(e), function(...t) {
    try {
      return e.apply(null, t);
    } catch {
    }
  };
}
function sh(e, t) {
  return qn(e), vo(t), {
    encode(n) {
      if (!_n(n))
        throw new Error("checksum.encode: input should be Uint8Array");
      const r = t(n).slice(0, e), s = new Uint8Array(n.length + e);
      return s.set(n), s.set(r, n.length), s;
    },
    decode(n) {
      if (!_n(n))
        throw new Error("checksum.decode: input should be Uint8Array");
      const r = n.slice(0, -e), s = n.slice(-e), i = t(r).slice(0, e);
      for (let o = 0; o < e; o++)
        if (i[o] !== s[o])
          throw new Error("Invalid checksum");
      return r;
    }
  };
}
const ih = typeof Uint8Array.from([]).toBase64 == "function" && typeof Uint8Array.fromBase64 == "function", oh = (e, t) => {
  je("base64", e);
  const n = /^[A-Za-z0-9=+/]+$/, r = "base64";
  if (e.length > 0 && !n.test(e))
    throw new Error("invalid base64");
  return Uint8Array.fromBase64(e, { alphabet: r, lastChunkHandling: "strict" });
}, St = ih ? {
  encode(e) {
    return $u(e), e.toBase64();
  },
  decode(e) {
    return oh(e);
  }
} : /* @__PURE__ */ Or(/* @__PURE__ */ Io(6), /* @__PURE__ */ Hs("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"), /* @__PURE__ */ eh(6), /* @__PURE__ */ Fs("")), ah = /* @__NO_SIDE_EFFECTS__ */ (e) => /* @__PURE__ */ Or(/* @__PURE__ */ rh(58), /* @__PURE__ */ Hs(e), /* @__PURE__ */ Fs("")), Di = /* @__PURE__ */ ah("123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"), ch = (e) => /* @__PURE__ */ Or(sh(4, (t) => e(e(t))), Di), Vi = /* @__PURE__ */ Or(/* @__PURE__ */ Hs("qpzry9x8gf2tvdw0s3jn54khce6mua7l"), /* @__PURE__ */ Fs("")), Ia = [996825010, 642813549, 513874426, 1027748829, 705979059];
function Xn(e) {
  const t = e >> 25;
  let n = (e & 33554431) << 5;
  for (let r = 0; r < Ia.length; r++)
    (t >> r & 1) === 1 && (n ^= Ia[r]);
  return n;
}
function ka(e, t, n = 1) {
  const r = e.length;
  let s = 1;
  for (let i = 0; i < r; i++) {
    const o = e.charCodeAt(i);
    if (o < 33 || o > 126)
      throw new Error(`Invalid prefix (${e})`);
    s = Xn(s) ^ o >> 5;
  }
  s = Xn(s);
  for (let i = 0; i < r; i++)
    s = Xn(s) ^ e.charCodeAt(i) & 31;
  for (let i of t)
    s = Xn(s) ^ i;
  for (let i = 0; i < 6; i++)
    s = Xn(s);
  return s ^= n, Vi.encode(Li([s % Yr[30]], 30, 5, !1));
}
// @__NO_SIDE_EFFECTS__
function _u(e) {
  const t = e === "bech32" ? 1 : 734539939, n = /* @__PURE__ */ Io(5), r = n.decode, s = n.encode, i = Aa(r);
  function o(f, h, p = 90) {
    je("bech32.encode prefix", f), _n(h) && (h = Array.from(h)), Ao("bech32.encode", h);
    const y = f.length;
    if (y === 0)
      throw new TypeError(`Invalid prefix length ${y}`);
    const d = y + 7 + h.length;
    if (p !== !1 && d > p)
      throw new TypeError(`Length ${d} exceeds limit ${p}`);
    const g = f.toLowerCase(), w = ka(g, h, t);
    return `${g}1${Vi.encode(h)}${w}`;
  }
  function a(f, h = 90) {
    je("bech32.decode input", f);
    const p = f.length;
    if (p < 8 || h !== !1 && p > h)
      throw new TypeError(`invalid string length: ${p} (${f}). Expected (8..${h})`);
    const y = f.toLowerCase();
    if (f !== y && f !== f.toUpperCase())
      throw new Error("String must be lowercase or uppercase");
    const d = y.lastIndexOf("1");
    if (d === 0 || d === -1)
      throw new Error('Letter "1" must be present between prefix and data only');
    const g = y.slice(0, d), w = y.slice(d + 1);
    if (w.length < 6)
      throw new Error("Data must be at least 6 characters long");
    const A = Vi.decode(w).slice(0, -6), O = ka(g, A, t);
    if (!w.endsWith(O))
      throw new Error(`Invalid checksum in ${f}: expected "${O}"`);
    return { prefix: g, words: A };
  }
  const c = Aa(a);
  function u(f) {
    const { prefix: h, words: p } = a(f, !1);
    return { prefix: h, words: p, bytes: r(p) };
  }
  function l(f, h) {
    return o(f, s(h));
  }
  return {
    encode: o,
    decode: a,
    encodeFromBytes: l,
    decodeToBytes: u,
    decodeUnsafe: c,
    fromWords: r,
    fromWordsUnsafe: i,
    toWords: s
  };
}
const Mi = /* @__PURE__ */ _u("bech32"), An = /* @__PURE__ */ _u("bech32m"), uh = {
  encode: (e) => new TextDecoder().decode(e),
  decode: (e) => new TextEncoder().encode(e)
}, lh = typeof Uint8Array.from([]).toHex == "function" && typeof Uint8Array.fromHex == "function", fh = {
  encode(e) {
    return $u(e), e.toHex();
  },
  decode(e) {
    return je("hex", e), Uint8Array.fromHex(e);
  }
}, v = lh ? fh : /* @__PURE__ */ Or(/* @__PURE__ */ Io(4), /* @__PURE__ */ Hs("0123456789abcdef"), /* @__PURE__ */ Fs(""), /* @__PURE__ */ nh((e) => {
  if (typeof e != "string" || e.length % 2 !== 0)
    throw new TypeError(`hex.decode: expected string, got ${typeof e} with length ${e.length}`);
  return e.toLowerCase();
})), dt = /* @__PURE__ */ Uint8Array.of(), Lu = /* @__PURE__ */ Uint8Array.of(0);
function Ln(e, t) {
  if (e.length !== t.length)
    return !1;
  for (let n = 0; n < e.length; n++)
    if (e[n] !== t[n])
      return !1;
  return !0;
}
function Kt(e) {
  return e instanceof Uint8Array || ArrayBuffer.isView(e) && e.constructor.name === "Uint8Array";
}
function dh(...e) {
  let t = 0;
  for (let r = 0; r < e.length; r++) {
    const s = e[r];
    if (!Kt(s))
      throw new Error("Uint8Array expected");
    t += s.length;
  }
  const n = new Uint8Array(t);
  for (let r = 0, s = 0; r < e.length; r++) {
    const i = e[r];
    n.set(i, s), s += i.length;
  }
  return n;
}
const Du = (e) => new DataView(e.buffer, e.byteOffset, e.byteLength);
function Br(e) {
  return Object.prototype.toString.call(e) === "[object Object]";
}
function pe(e) {
  return Number.isSafeInteger(e);
}
const ko = {
  equalBytes: Ln,
  isBytes: Kt,
  concatBytes: dh
}, Vu = (e) => {
  if (e !== null && typeof e != "string" && !ee(e) && !Kt(e) && !pe(e))
    throw new Error(`lengthCoder: expected null | number | Uint8Array | CoderType, got ${e} (${typeof e})`);
  return {
    encodeStream(t, n) {
      if (e === null)
        return;
      if (ee(e))
        return e.encodeStream(t, n);
      let r;
      if (typeof e == "number" ? r = e : typeof e == "string" && (r = ke.resolve(t.stack, e)), typeof r == "bigint" && (r = Number(r)), r === void 0 || r !== n)
        throw t.err(`Wrong length: ${r} len=${e} exp=${n} (${typeof n})`);
    },
    decodeStream(t) {
      let n;
      if (ee(e) ? n = Number(e.decodeStream(t)) : typeof e == "number" ? n = e : typeof e == "string" && (n = ke.resolve(t.stack, e)), typeof n == "bigint" && (n = Number(n)), typeof n != "number")
        throw t.err(`Wrong length: ${n}`);
      return n;
    }
  };
}, bt = {
  BITS: 32,
  FULL_MASK: -1 >>> 0,
  // 1<<32 will overflow
  len: (e) => Math.ceil(e / 32),
  create: (e) => new Uint32Array(bt.len(e)),
  clean: (e) => e.fill(0),
  debug: (e) => Array.from(e).map((t) => (t >>> 0).toString(2).padStart(32, "0")),
  checkLen: (e, t) => {
    if (bt.len(t) !== e.length)
      throw new Error(`wrong length=${e.length}. Expected: ${bt.len(t)}`);
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
    bt.checkLen(e, t);
    const { FULL_MASK: r, BITS: s } = bt, i = s - t % s, o = i ? r >>> i << i : r, a = [];
    for (let c = 0; c < e.length; c++) {
      let u = e[c];
      if (n && (u = ~u), c === e.length - 1 && (u &= o), u !== 0)
        for (let l = 0; l < s; l++) {
          const f = 1 << s - l - 1;
          u & f && a.push(c * s + l);
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
  rangeDebug: (e, t, n = !1) => `[${bt.range(bt.indices(e, t, n)).map((r) => `(${r.pos}/${r.length})`).join(", ")}]`,
  setRange: (e, t, n, r, s = !0) => {
    bt.chunkLen(t, n, r);
    const { FULL_MASK: i, BITS: o } = bt, a = n % o ? Math.floor(n / o) : void 0, c = n + r, u = c % o ? Math.floor(c / o) : void 0;
    if (a !== void 0 && a === u)
      return bt.set(e, a, i >>> o - r << o - r - n, s);
    if (a !== void 0 && !bt.set(e, a, i >>> n % o, s))
      return !1;
    const l = a !== void 0 ? a + 1 : n / o, f = u !== void 0 ? u : c / o;
    for (let h = l; h < f; h++)
      if (!bt.set(e, h, i, s))
        return !1;
    return !(u !== void 0 && a !== u && !bt.set(e, u, i << o - c % o, s));
  }
}, ke = {
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
    e.push(r), n((s, i) => {
      r.field = s, i(), r.field = void 0;
    }), e.pop();
  },
  path: (e) => {
    const t = [];
    for (const n of e)
      n.field !== void 0 && t.push(n.field);
    return t.join("/");
  },
  err: (e, t, n) => {
    const r = new Error(`${e}(${ke.path(t)}): ${typeof n == "string" ? n : n.message}`);
    return n instanceof Error && n.stack && (r.stack = n.stack), r;
  },
  resolve: (e, t) => {
    const n = t.split("/"), r = e.map((o) => o.obj);
    let s = 0;
    for (; s < n.length && n[s] === ".."; s++)
      r.pop();
    let i = r.pop();
    for (; s < n.length; s++) {
      if (!i || i[n[s]] === void 0)
        return;
      i = i[n[s]];
    }
    return i;
  }
};
class Co {
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
  constructor(t, n = {}, r = [], s = void 0, i = 0) {
    this.data = t, this.opts = n, this.stack = r, this.parent = s, this.parentOffset = i, this.view = Du(t);
  }
  /** Internal method for pointers. */
  _enablePointers() {
    if (this.parent)
      return this.parent._enablePointers();
    this.bs || (this.bs = bt.create(this.data.length), bt.setRange(this.bs, this.data.length, 0, this.pos, this.opts.allowMultipleReads));
  }
  markBytesBS(t, n) {
    return this.parent ? this.parent.markBytesBS(this.parentOffset + t, n) : !n || !this.bs ? !0 : bt.setRange(this.bs, this.data.length, t, n, !1);
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
    return ke.pushObj(this.stack, t, n);
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
        throw this.err(`${this.bitPos} bits left after unpack: ${v.encode(this.data.slice(this.pos))}`);
      if (this.bs && !this.parent) {
        const t = bt.indices(this.bs, this.data.length, !0);
        if (t.length) {
          const n = bt.range(t).map(({ pos: r, length: s }) => `(${r}/${s})[${v.encode(this.data.subarray(r, r + s))}]`).join(", ");
          throw this.err(`unread byte ranges: ${n} (total=${this.data.length})`);
        } else
          return;
      }
      if (!this.isEnd())
        throw this.err(`${this.leftBytes} bytes ${this.bitPos} bits left after unpack: ${v.encode(this.data.slice(this.pos))}`);
    }
  }
  // User methods
  err(t) {
    return ke.err("Reader", this.stack, t);
  }
  offsetReader(t) {
    if (t > this.data.length)
      throw this.err("offsetReader: Unexpected end of buffer");
    return new Co(this.absBytes(t), this.opts, this.stack, this, t);
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
    if (!Kt(t))
      throw this.err(`find: needle is not bytes! ${t}`);
    if (this.bitPos)
      throw this.err("findByte: bitPos not empty");
    if (!t.length)
      throw this.err("find: needle is empty");
    for (let r = n; (r = this.data.indexOf(t[0], r)) !== -1; r++) {
      if (r === -1 || this.data.length - r < t.length)
        return;
      if (Ln(t, this.data.subarray(r, r + t.length)))
        return r;
    }
  }
}
class hh {
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
    this.stack = t, this.view = Du(this.viewBuf);
  }
  pushObj(t, n) {
    return ke.pushObj(this.stack, t, n);
  }
  writeView(t, n) {
    if (this.finished)
      throw this.err("buffer: finished");
    if (!pe(t) || t > 8)
      throw new Error(`wrong writeView length=${t}`);
    n(this.view), this.bytes(this.viewBuf.slice(0, t)), this.viewBuf.fill(0);
  }
  // User methods
  err(t) {
    if (this.finished)
      throw this.err("buffer: finished");
    return ke.err("Reader", this.stack, t);
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
    const n = this.buffers.concat(this.ptrs.map((i) => i.buffer)), r = n.map((i) => i.length).reduce((i, o) => i + o, 0), s = new Uint8Array(r);
    for (let i = 0, o = 0; i < n.length; i++) {
      const a = n[i];
      s.set(a, o), o += a.length;
    }
    for (let i = this.pos, o = 0; o < this.ptrs.length; o++) {
      const a = this.ptrs[o];
      s.set(a.ptr.encode(i), a.pos), i += a.buffer.length;
    }
    if (t) {
      this.buffers = [];
      for (const i of this.ptrs)
        i.buffer.fill(0);
      this.ptrs = [], this.finished = !0, this.bitBuf = 0;
    }
    return s;
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
const Hi = (e) => Uint8Array.from(e).reverse();
function ph(e, t, n) {
  if (n) {
    const r = 2n ** (t - 1n);
    if (e < -r || e >= r)
      throw new Error(`value out of signed bounds. Expected ${-r} <= ${e} < ${r}`);
  } else if (0n > e || e >= 2n ** t)
    throw new Error(`value out of unsigned bounds. Expected 0 <= ${e} < ${2n ** t}`);
}
function Mu(e) {
  return {
    // NOTE: we cannot export validate here, since it is likely mistake.
    encodeStream: e.encodeStream,
    decodeStream: e.decodeStream,
    size: e.size,
    encode: (t) => {
      const n = new hh();
      return e.encodeStream(n, t), n.finish();
    },
    decode: (t, n = {}) => {
      const r = new Co(t, n), s = e.decodeStream(r);
      return r.finish(), s;
    }
  };
}
function Rt(e, t) {
  if (!ee(e))
    throw new Error(`validate: invalid inner value ${e}`);
  if (typeof t != "function")
    throw new Error("validate: fn should be function");
  return Mu({
    size: e.size,
    encodeStream: (n, r) => {
      let s;
      try {
        s = t(r);
      } catch (i) {
        throw n.err(i);
      }
      e.encodeStream(n, s);
    },
    decodeStream: (n) => {
      const r = e.decodeStream(n);
      try {
        return t(r);
      } catch (s) {
        throw n.err(s);
      }
    }
  });
}
const $t = (e) => {
  const t = Mu(e);
  return e.validate ? Rt(t, e.validate) : t;
}, Ws = (e) => Br(e) && typeof e.decode == "function" && typeof e.encode == "function";
function ee(e) {
  return Br(e) && Ws(e) && typeof e.encodeStream == "function" && typeof e.decodeStream == "function" && (e.size === void 0 || pe(e.size));
}
function gh() {
  return {
    encode: (e) => {
      if (!Array.isArray(e))
        throw new Error("array expected");
      const t = {};
      for (const n of e) {
        if (!Array.isArray(n) || n.length !== 2)
          throw new Error("array of two elements expected");
        const r = n[0], s = n[1];
        if (t[r] !== void 0)
          throw new Error(`key(${r}) appears twice in struct`);
        t[r] = s;
      }
      return t;
    },
    decode: (e) => {
      if (!Br(e))
        throw new Error(`expected plain object, got ${e}`);
      return Object.entries(e);
    }
  };
}
const yh = {
  encode: (e) => {
    if (typeof e != "bigint")
      throw new Error(`expected bigint, got ${typeof e}`);
    if (e > BigInt(Number.MAX_SAFE_INTEGER))
      throw new Error(`element bigger than MAX_SAFE_INTEGER=${e}`);
    return Number(e);
  },
  decode: (e) => {
    if (!pe(e))
      throw new Error("element is not a safe integer");
    return BigInt(e);
  }
};
function wh(e) {
  if (!Br(e))
    throw new Error("plain object expected");
  return {
    encode: (t) => {
      if (!pe(t) || !(t in e))
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
function mh(e, t = !1) {
  if (!pe(e))
    throw new Error(`decimal/precision: wrong value ${e}`);
  if (typeof t != "boolean")
    throw new Error(`decimal/round: expected boolean, got ${typeof t}`);
  const n = 10n ** BigInt(e);
  return {
    encode: (r) => {
      if (typeof r != "bigint")
        throw new Error(`expected bigint, got ${typeof r}`);
      let s = (r < 0n ? -r : r).toString(10), i = s.length - e;
      i < 0 && (s = s.padStart(s.length - i, "0"), i = 0);
      let o = s.length - 1;
      for (; o >= i && s[o] === "0"; o--)
        ;
      let a = s.slice(0, i), c = s.slice(i, o + 1);
      return a || (a = "0"), r < 0n && (a = "-" + a), c ? `${a}.${c}` : a;
    },
    decode: (r) => {
      if (typeof r != "string")
        throw new Error(`expected string, got ${typeof r}`);
      if (r === "-0")
        throw new Error("negative zero is not allowed");
      let s = !1;
      if (r.startsWith("-") && (s = !0, r = r.slice(1)), !/^(0|[1-9]\d*)(\.\d+)?$/.test(r))
        throw new Error(`wrong string value=${r}`);
      let i = r.indexOf(".");
      i = i === -1 ? r.length : i;
      const o = r.slice(0, i), a = r.slice(i + 1).replace(/0+$/, ""), c = BigInt(o) * n;
      if (!t && a.length > e)
        throw new Error(`fractional part cannot be represented with this precision (num=${r}, prec=${e})`);
      const u = Math.min(a.length, e), l = BigInt(a.slice(0, u)) * 10n ** BigInt(e - u), f = c + l;
      return s ? -f : f;
    }
  };
}
function bh(e) {
  if (!Array.isArray(e))
    throw new Error(`expected array, got ${typeof e}`);
  for (const t of e)
    if (!Ws(t))
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
const Hu = (e) => {
  if (!Ws(e))
    throw new Error("BaseCoder expected");
  return { encode: e.decode, decode: e.encode };
}, Ks = { dict: gh, numberBigint: yh, tsEnum: wh, decimal: mh, match: bh, reverse: Hu }, Oo = (e, t = !1, n = !1, r = !0) => {
  if (!pe(e))
    throw new Error(`bigint/size: wrong value ${e}`);
  if (typeof t != "boolean")
    throw new Error(`bigint/le: expected boolean, got ${typeof t}`);
  if (typeof n != "boolean")
    throw new Error(`bigint/signed: expected boolean, got ${typeof n}`);
  if (typeof r != "boolean")
    throw new Error(`bigint/sized: expected boolean, got ${typeof r}`);
  const s = BigInt(e), i = 2n ** (8n * s - 1n);
  return $t({
    size: r ? e : void 0,
    encodeStream: (o, a) => {
      n && a < 0 && (a = a | i);
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
      const a = o.bytes(r ? e : Math.min(e, o.leftBytes)), c = t ? a : Hi(a);
      let u = 0n;
      for (let l = 0; l < c.length; l++)
        u |= BigInt(c[l]) << 8n * BigInt(l);
      return n && u & i && (u = (u ^ i) - i), u;
    },
    validate: (o) => {
      if (typeof o != "bigint")
        throw new Error(`bigint: invalid value: ${o}`);
      return ph(o, 8n * s, !!n), o;
    }
  });
}, Fu = /* @__PURE__ */ Oo(32, !1), Zr = /* @__PURE__ */ Oo(8, !0), Eh = /* @__PURE__ */ Oo(8, !0, !0), xh = (e, t) => $t({
  size: e,
  encodeStream: (n, r) => n.writeView(e, (s) => t.write(s, r)),
  decodeStream: (n) => n.readView(e, t.read),
  validate: (n) => {
    if (typeof n != "number")
      throw new Error(`viewCoder: expected number, got ${typeof n}`);
    return t.validate && t.validate(n), n;
  }
}), Nr = (e, t, n) => {
  const r = e * 8, s = 2 ** (r - 1), i = (c) => {
    if (!pe(c))
      throw new Error(`sintView: value is not safe integer: ${c}`);
    if (c < -s || c >= s)
      throw new Error(`sintView: value out of bounds. Expected ${-s} <= ${c} < ${s}`);
  }, o = 2 ** r, a = (c) => {
    if (!pe(c))
      throw new Error(`uintView: value is not safe integer: ${c}`);
    if (0 > c || c >= o)
      throw new Error(`uintView: value out of bounds. Expected 0 <= ${c} < ${o}`);
  };
  return xh(e, {
    write: n.write,
    read: n.read,
    validate: t ? i : a
  });
}, nt = /* @__PURE__ */ Nr(4, !1, {
  read: (e, t) => e.getUint32(t, !0),
  write: (e, t) => e.setUint32(0, t, !0)
}), Th = /* @__PURE__ */ Nr(4, !1, {
  read: (e, t) => e.getUint32(t, !1),
  write: (e, t) => e.setUint32(0, t, !1)
}), In = /* @__PURE__ */ Nr(4, !0, {
  read: (e, t) => e.getInt32(t, !0),
  write: (e, t) => e.setInt32(0, t, !0)
}), Ca = /* @__PURE__ */ Nr(2, !1, {
  read: (e, t) => e.getUint16(t, !0),
  write: (e, t) => e.setUint16(0, t, !0)
}), He = /* @__PURE__ */ Nr(1, !1, {
  read: (e, t) => e.getUint8(t),
  write: (e, t) => e.setUint8(0, t)
}), ut = (e, t = !1) => {
  if (typeof t != "boolean")
    throw new Error(`bytes/le: expected boolean, got ${typeof t}`);
  const n = Vu(e), r = Kt(e);
  return $t({
    size: typeof e == "number" ? e : void 0,
    encodeStream: (s, i) => {
      r || n.encodeStream(s, i.length), s.bytes(t ? Hi(i) : i), r && s.bytes(e);
    },
    decodeStream: (s) => {
      let i;
      if (r) {
        const o = s.find(e);
        if (!o)
          throw s.err("bytes: cannot find terminator");
        i = s.bytes(o - s.pos), s.bytes(e.length);
      } else
        i = s.bytes(e === null ? s.leftBytes : n.decodeStream(s));
      return t ? Hi(i) : i;
    },
    validate: (s) => {
      if (!Kt(s))
        throw new Error(`bytes: invalid value ${s}`);
      return s;
    }
  });
};
function Sh(e, t) {
  if (!ee(t))
    throw new Error(`prefix: invalid inner value ${t}`);
  return Ge(ut(e), Hu(t));
}
const Bo = (e, t = !1) => Rt(Ge(ut(e, t), uh), (n) => {
  if (typeof n != "string")
    throw new Error(`expected string, got ${typeof n}`);
  return n;
}), vh = (e, t = { isLE: !1, with0x: !1 }) => {
  let n = Ge(ut(e, t.isLE), v);
  const r = t.with0x;
  if (typeof r != "boolean")
    throw new Error(`hex/with0x: expected boolean, got ${typeof r}`);
  return r && (n = Ge(n, {
    encode: (s) => `0x${s}`,
    decode: (s) => {
      if (!s.startsWith("0x"))
        throw new Error("hex(with0x=true).encode input should start with 0x");
      return s.slice(2);
    }
  })), n;
};
function Ge(e, t) {
  if (!ee(e))
    throw new Error(`apply: invalid inner value ${e}`);
  if (!Ws(t))
    throw new Error(`apply: invalid base value ${e}`);
  return $t({
    size: e.size,
    encodeStream: (n, r) => {
      let s;
      try {
        s = t.decode(r);
      } catch (i) {
        throw n.err("" + i);
      }
      return e.encodeStream(n, s);
    },
    decodeStream: (n) => {
      const r = e.decodeStream(n);
      try {
        return t.encode(r);
      } catch (s) {
        throw n.err("" + s);
      }
    }
  });
}
const Ah = (e, t = !1) => {
  if (!Kt(e))
    throw new Error(`flag/flagValue: expected Uint8Array, got ${typeof e}`);
  if (typeof t != "boolean")
    throw new Error(`flag/xor: expected boolean, got ${typeof t}`);
  return $t({
    size: e.length,
    encodeStream: (n, r) => {
      !!r !== t && n.bytes(e);
    },
    decodeStream: (n) => {
      let r = n.leftBytes >= e.length;
      return r && (r = Ln(n.bytes(e.length, !0), e), r && n.bytes(e.length)), r !== t;
    },
    validate: (n) => {
      if (n !== void 0 && typeof n != "boolean")
        throw new Error(`flag: expected boolean value or undefined, got ${typeof n}`);
      return n;
    }
  });
};
function Ih(e, t, n) {
  if (!ee(t))
    throw new Error(`flagged: invalid inner value ${t}`);
  return $t({
    encodeStream: (r, s) => {
      ke.resolve(r.stack, e) && t.encodeStream(r, s);
    },
    decodeStream: (r) => {
      let s = !1;
      if (s = !!ke.resolve(r.stack, e), s)
        return t.decodeStream(r);
    }
  });
}
function No(e, t, n = !0) {
  if (!ee(e))
    throw new Error(`magic: invalid inner value ${e}`);
  if (typeof n != "boolean")
    throw new Error(`magic: expected boolean, got ${typeof n}`);
  return $t({
    size: e.size,
    encodeStream: (r, s) => e.encodeStream(r, t),
    decodeStream: (r) => {
      const s = e.decodeStream(r);
      if (n && typeof s != "object" && s !== t || Kt(t) && !Ln(t, s))
        throw r.err(`magic: invalid value: ${s} !== ${t}`);
    },
    validate: (r) => {
      if (r !== void 0)
        throw new Error(`magic: wrong value=${typeof r}`);
      return r;
    }
  });
}
function Wu(e) {
  let t = 0;
  for (const n of e) {
    if (n.size === void 0)
      return;
    if (!pe(n.size))
      throw new Error(`sizeof: wrong element size=${t}`);
    t += n.size;
  }
  return t;
}
function Tt(e) {
  if (!Br(e))
    throw new Error(`struct: expected plain object, got ${e}`);
  for (const t in e)
    if (!ee(e[t]))
      throw new Error(`struct: field ${t} is not CoderType`);
  return $t({
    size: Wu(Object.values(e)),
    encodeStream: (t, n) => {
      t.pushObj(n, (r) => {
        for (const s in e)
          r(s, () => e[s].encodeStream(t, n[s]));
      });
    },
    decodeStream: (t) => {
      const n = {};
      return t.pushObj(n, (r) => {
        for (const s in e)
          r(s, () => n[s] = e[s].decodeStream(t));
      }), n;
    },
    validate: (t) => {
      if (typeof t != "object" || t === null)
        throw new Error(`struct: invalid value ${t}`);
      return t;
    }
  });
}
function kh(e) {
  if (!Array.isArray(e))
    throw new Error(`Packed.Tuple: got ${typeof e} instead of array`);
  for (let t = 0; t < e.length; t++)
    if (!ee(e[t]))
      throw new Error(`tuple: field ${t} is not CoderType`);
  return $t({
    size: Wu(e),
    encodeStream: (t, n) => {
      if (!Array.isArray(n))
        throw t.err(`tuple: invalid value ${n}`);
      t.pushObj(n, (r) => {
        for (let s = 0; s < e.length; s++)
          r(`${s}`, () => e[s].encodeStream(t, n[s]));
      });
    },
    decodeStream: (t) => {
      const n = [];
      return t.pushObj(n, (r) => {
        for (let s = 0; s < e.length; s++)
          r(`${s}`, () => n.push(e[s].decodeStream(t)));
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
function Nt(e, t) {
  if (!ee(t))
    throw new Error(`array: invalid inner value ${t}`);
  const n = Vu(typeof e == "string" ? `../${e}` : e);
  return $t({
    size: typeof e == "number" && t.size ? e * t.size : void 0,
    encodeStream: (r, s) => {
      const i = r;
      i.pushObj(s, (o) => {
        Kt(e) || n.encodeStream(r, s.length);
        for (let a = 0; a < s.length; a++)
          o(`${a}`, () => {
            const c = s[a], u = r.pos;
            if (t.encodeStream(r, c), Kt(e)) {
              if (e.length > i.pos - u)
                return;
              const l = i.finish(!1).subarray(u, i.pos);
              if (Ln(l.subarray(0, e.length), e))
                throw i.err(`array: inner element encoding same as separator. elm=${c} data=${l}`);
            }
          });
      }), Kt(e) && r.bytes(e);
    },
    decodeStream: (r) => {
      const s = [];
      return r.pushObj(s, (i) => {
        if (e === null)
          for (let o = 0; !r.isEnd() && (i(`${o}`, () => s.push(t.decodeStream(r))), !(t.size && r.leftBytes < t.size)); o++)
            ;
        else if (Kt(e))
          for (let o = 0; ; o++) {
            if (Ln(r.bytes(e.length, !0), e)) {
              r.bytes(e.length);
              break;
            }
            i(`${o}`, () => s.push(t.decodeStream(r)));
          }
        else {
          let o;
          i("arrayLen", () => o = n.decodeStream(r));
          for (let a = 0; a < o; a++)
            i(`${a}`, () => s.push(t.decodeStream(r)));
        }
      }), s;
    },
    validate: (r) => {
      if (!Array.isArray(r))
        throw new Error(`array: invalid value ${r}`);
      return r;
    }
  });
}
const Yn = Ve.Point, Oa = Yn.Fn, Ku = Yn.Fn.ORDER, Rr = (e) => e % 2n === 0n, at = ko.isBytes, De = ko.concatBytes, gt = ko.equalBytes, zu = (e) => th(vt(e)), Re = (...e) => vt(vt(De(...e))), Fi = Oe.utils.randomSecretKey, Ro = Oe.getPublicKey, ju = Ve.getPublicKey, Ba = (e) => e.r < Ku / 2n;
function Ch(e, t, n = !1) {
  let r = Ve.Signature.fromBytes(Ve.sign(e, t, { prehash: !1 }));
  if (n && !Ba(r)) {
    const s = new Uint8Array(32);
    let i = 0;
    for (; !Ba(r); )
      if (s.set(nt.encode(i++)), r = Ve.Signature.fromBytes(Ve.sign(e, t, { prehash: !1, extraEntropy: s })), i > 4294967295)
        throw new Error("lowR counter overflow: report the error");
  }
  return r.toBytes("der");
}
const Na = Oe.sign, $o = Oe.utils.taggedHash, _t = {
  ecdsa: 0,
  schnorr: 1
};
function Dn(e, t) {
  const n = e.length;
  if (t === _t.ecdsa) {
    if (n === 32)
      throw new Error("Expected non-Schnorr key");
    return Yn.fromBytes(e), e;
  } else if (t === _t.schnorr) {
    if (n !== 32)
      throw new Error("Expected 32-byte Schnorr key");
    return Oe.utils.lift_x(Ce(e)), e;
  } else
    throw new Error("Unknown key type");
}
function Gu(e, t) {
  const r = Oe.utils.taggedHash("TapTweak", e, t), s = Ce(r);
  if (s >= Ku)
    throw new Error("tweak higher than curve order");
  return s;
}
function Oh(e, t = Uint8Array.of()) {
  const n = Oe.utils, r = Ce(e), s = Yn.BASE.multiply(r), i = Rr(s.y) ? r : Oa.neg(r), o = n.pointToBytes(s), a = Gu(o, t);
  return Cr(Oa.add(i, a), 32);
}
function Wi(e, t) {
  const n = Oe.utils, r = Gu(e, t), i = n.lift_x(Ce(e)).add(Yn.BASE.multiply(r)), o = Rr(i.y) ? 0 : 1;
  return [n.pointToBytes(i), o];
}
const Uo = vt(Yn.BASE.toBytes(!1)), Vn = {
  bech32: "bc",
  pubKeyHash: 0,
  scriptHash: 5,
  wif: 128
}, Dr = {
  bech32: "tb",
  pubKeyHash: 111,
  scriptHash: 196,
  wif: 239
};
function ps(e, t) {
  if (!at(e) || !at(t))
    throw new Error(`cmp: wrong type a=${typeof e} b=${typeof t}`);
  const n = Math.min(e.length, t.length);
  for (let r = 0; r < n; r++)
    if (e[r] != t[r])
      return Math.sign(e[r] - t[r]);
  return Math.sign(e.length - t.length);
}
function qu(e) {
  const t = {};
  for (const n in e) {
    if (t[e[n]] !== void 0)
      throw new Error("duplicate key");
    t[e[n]] = n;
  }
  return t;
}
const mt = {
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
}, Bh = qu(mt);
function Po(e = 6, t = !1) {
  return $t({
    encodeStream: (n, r) => {
      if (r === 0n)
        return;
      const s = r < 0, i = BigInt(r), o = [];
      for (let a = s ? -i : i; a; a >>= 8n)
        o.push(Number(a & 0xffn));
      o[o.length - 1] >= 128 ? o.push(s ? 128 : 0) : s && (o[o.length - 1] |= 128), n.bytes(new Uint8Array(o));
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
      let s = 0, i = 0n;
      for (let o = 0; o < r; ++o)
        s = n.byte(), i |= BigInt(s) << 8n * BigInt(o);
      return s >= 128 && (i &= 2n ** BigInt(r * 8) - 1n >> 1n, i = -i), i;
    }
  });
}
function Nh(e, t = 4, n = !0) {
  if (typeof e == "number")
    return e;
  if (at(e))
    try {
      const r = Po(t, n).decode(e);
      return r > Number.MAX_SAFE_INTEGER ? void 0 : Number(r);
    } catch {
      return;
    }
}
const G = $t({
  encodeStream: (e, t) => {
    for (let n of t) {
      if (typeof n == "string") {
        if (mt[n] === void 0)
          throw new Error(`Unknown opcode=${n}`);
        e.byte(mt[n]);
        continue;
      } else if (typeof n == "number") {
        if (n === 0) {
          e.byte(0);
          continue;
        } else if (1 <= n && n <= 16) {
          e.byte(mt.OP_1 - 1 + n);
          continue;
        }
      }
      if (typeof n == "number" && (n = Po().encode(BigInt(n))), !at(n))
        throw new Error(`Wrong Script OP=${n} (${typeof n})`);
      const r = n.length;
      r < mt.PUSHDATA1 ? e.byte(r) : r <= 255 ? (e.byte(mt.PUSHDATA1), e.byte(r)) : r <= 65535 ? (e.byte(mt.PUSHDATA2), e.bytes(Ca.encode(r))) : (e.byte(mt.PUSHDATA4), e.bytes(nt.encode(r))), e.bytes(n);
    }
  },
  decodeStream: (e) => {
    const t = [];
    for (; !e.isEnd(); ) {
      const n = e.byte();
      if (mt.OP_0 < n && n <= mt.PUSHDATA4) {
        let r;
        if (n < mt.PUSHDATA1)
          r = n;
        else if (n === mt.PUSHDATA1)
          r = He.decodeStream(e);
        else if (n === mt.PUSHDATA2)
          r = Ca.decodeStream(e);
        else if (n === mt.PUSHDATA4)
          r = nt.decodeStream(e);
        else
          throw new Error("Should be not possible");
        t.push(e.bytes(r));
      } else if (n === 0)
        t.push(0);
      else if (mt.OP_1 <= n && n <= mt.OP_16)
        t.push(n - (mt.OP_1 - 1));
      else {
        const r = Bh[n];
        if (r === void 0)
          throw new Error(`Unknown opcode=${n.toString(16)}`);
        t.push(r);
      }
    }
    return t;
  }
}), Ra = {
  253: [253, 2, 253n, 65535n],
  254: [254, 4, 65536n, 4294967295n],
  255: [255, 8, 4294967296n, 18446744073709551615n]
}, zs = $t({
  encodeStream: (e, t) => {
    if (typeof t == "number" && (t = BigInt(t)), 0n <= t && t <= 252n)
      return e.byte(Number(t));
    for (const [n, r, s, i] of Object.values(Ra))
      if (!(s > t || t > i)) {
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
    const [n, r, s] = Ra[t];
    let i = 0n;
    for (let o = 0; o < r; o++)
      i |= BigInt(e.byte()) << 8n * BigInt(o);
    if (i < s)
      throw e.err(`Wrong CompactSize(${8 * r})`);
    return i;
  }
}), ne = Ge(zs, Ks.numberBigint), Xt = ut(zs), br = Nt(ne, Xt), gs = (e) => Nt(zs, e), Yu = Tt({
  txid: ut(32, !0),
  // hash(prev_tx),
  index: nt,
  // output number of previous tx
  finalScriptSig: Xt,
  // btc merges input and output script, executes it. If ok = tx passes
  sequence: nt
  // ?
}), ln = Tt({ amount: Zr, script: Xt }), Rh = Tt({
  version: In,
  segwitFlag: Ah(new Uint8Array([0, 1])),
  inputs: gs(Yu),
  outputs: gs(ln),
  witnesses: Ih("segwitFlag", Nt("inputs/length", br)),
  // < 500000000	Block number at which this transaction is unlocked
  // >= 500000000	UNIX timestamp at which this transaction is unlocked
  // Handled as part of PSBTv2
  lockTime: nt
});
function $h(e) {
  if (e.segwitFlag && e.witnesses && !e.witnesses.length)
    throw new Error("Segwit flag with empty witnesses array");
  return e;
}
const Bn = Rt(Rh, $h), ir = Tt({
  version: In,
  inputs: gs(Yu),
  outputs: gs(ln),
  lockTime: nt
}), Ki = Rt(ut(null), (e) => Dn(e, _t.ecdsa)), ys = Rt(ut(32), (e) => Dn(e, _t.schnorr)), $a = Rt(ut(null), (e) => {
  if (e.length !== 64 && e.length !== 65)
    throw new Error("Schnorr signature should be 64 or 65 bytes long");
  return e;
}), js = Tt({
  fingerprint: Th,
  path: Nt(null, nt)
}), Zu = Tt({
  hashes: Nt(ne, ut(32)),
  der: js
}), Uh = ut(78), Ph = Tt({ pubKey: ys, leafHash: ut(32) }), _h = Tt({
  version: He,
  // With parity :(
  internalKey: ut(32),
  merklePath: Nt(null, ut(32))
}), fe = Rt(_h, (e) => {
  if (e.merklePath.length > 128)
    throw new Error("TaprootControlBlock: merklePath should be of length 0..128 (inclusive)");
  return e;
}), Lh = Nt(null, Tt({
  depth: He,
  version: He,
  script: Xt
})), pt = ut(null), Ua = ut(20), Qn = ut(32), _o = {
  unsignedTx: [0, !1, ir, [0], [0], !1],
  xpub: [1, Uh, js, [], [0, 2], !1],
  txVersion: [2, !1, nt, [2], [2], !1],
  fallbackLocktime: [3, !1, nt, [], [2], !1],
  inputCount: [4, !1, ne, [2], [2], !1],
  outputCount: [5, !1, ne, [2], [2], !1],
  txModifiable: [6, !1, He, [], [2], !1],
  // TODO: bitfield
  version: [251, !1, nt, [], [0, 2], !1],
  proprietary: [252, pt, pt, [], [0, 2], !1]
}, Gs = {
  nonWitnessUtxo: [0, !1, Bn, [], [0, 2], !1],
  witnessUtxo: [1, !1, ln, [], [0, 2], !1],
  partialSig: [2, Ki, pt, [], [0, 2], !1],
  sighashType: [3, !1, nt, [], [0, 2], !1],
  redeemScript: [4, !1, pt, [], [0, 2], !1],
  witnessScript: [5, !1, pt, [], [0, 2], !1],
  bip32Derivation: [6, Ki, js, [], [0, 2], !1],
  finalScriptSig: [7, !1, pt, [], [0, 2], !1],
  finalScriptWitness: [8, !1, br, [], [0, 2], !1],
  porCommitment: [9, !1, pt, [], [0, 2], !1],
  ripemd160: [10, Ua, pt, [], [0, 2], !1],
  sha256: [11, Qn, pt, [], [0, 2], !1],
  hash160: [12, Ua, pt, [], [0, 2], !1],
  hash256: [13, Qn, pt, [], [0, 2], !1],
  txid: [14, !1, Qn, [2], [2], !0],
  index: [15, !1, nt, [2], [2], !0],
  sequence: [16, !1, nt, [], [2], !0],
  requiredTimeLocktime: [17, !1, nt, [], [2], !1],
  requiredHeightLocktime: [18, !1, nt, [], [2], !1],
  tapKeySig: [19, !1, $a, [], [0, 2], !1],
  tapScriptSig: [20, Ph, $a, [], [0, 2], !1],
  tapLeafScript: [21, fe, pt, [], [0, 2], !1],
  tapBip32Derivation: [22, Qn, Zu, [], [0, 2], !1],
  tapInternalKey: [23, !1, ys, [], [0, 2], !1],
  tapMerkleRoot: [24, !1, Qn, [], [0, 2], !1],
  proprietary: [252, pt, pt, [], [0, 2], !1]
}, Dh = [
  "txid",
  "sequence",
  "index",
  "witnessUtxo",
  "nonWitnessUtxo",
  "finalScriptSig",
  "finalScriptWitness",
  "unknown"
], Vh = [
  "partialSig",
  "finalScriptSig",
  "finalScriptWitness",
  "tapKeySig",
  "tapScriptSig"
], Er = {
  redeemScript: [0, !1, pt, [], [0, 2], !1],
  witnessScript: [1, !1, pt, [], [0, 2], !1],
  bip32Derivation: [2, Ki, js, [], [0, 2], !1],
  amount: [3, !1, Eh, [2], [2], !0],
  script: [4, !1, pt, [2], [2], !0],
  tapInternalKey: [5, !1, ys, [], [0, 2], !1],
  tapTree: [6, !1, Lh, [], [0, 2], !1],
  tapBip32Derivation: [7, ys, Zu, [], [0, 2], !1],
  proprietary: [252, pt, pt, [], [0, 2], !1]
}, Mh = [], Pa = Nt(Lu, Tt({
  //  <key> := <keylen> <keytype> <keydata> WHERE keylen = len(keytype)+len(keydata)
  key: Sh(ne, Tt({ type: ne, key: ut(null) })),
  //  <value> := <valuelen> <valuedata>
  value: ut(ne)
}));
function zi(e) {
  const [t, n, r, s, i, o] = e;
  return { type: t, kc: n, vc: r, reqInc: s, allowInc: i, silentIgnore: o };
}
Tt({ type: ne, key: ut(null) });
function Lo(e) {
  const t = {};
  for (const n in e) {
    const [r, s, i] = e[n];
    t[r] = [n, s, i];
  }
  return $t({
    encodeStream: (n, r) => {
      let s = [];
      for (const i in e) {
        const o = r[i];
        if (o === void 0)
          continue;
        const [a, c, u] = e[i];
        if (!c)
          s.push({ key: { type: a, key: dt }, value: u.encode(o) });
        else {
          const l = o.map(([f, h]) => [
            c.encode(f),
            u.encode(h)
          ]);
          l.sort((f, h) => ps(f[0], h[0]));
          for (const [f, h] of l)
            s.push({ key: { key: f, type: a }, value: h });
        }
      }
      if (r.unknown) {
        r.unknown.sort((i, o) => ps(i[0].key, o[0].key));
        for (const [i, o] of r.unknown)
          s.push({ key: i, value: o });
      }
      Pa.encodeStream(n, s);
    },
    decodeStream: (n) => {
      const r = Pa.decodeStream(n), s = {}, i = {};
      for (const o of r) {
        let a = "unknown", c = o.key.key, u = o.value;
        if (t[o.key.type]) {
          const [l, f, h] = t[o.key.type];
          if (a = l, !f && c.length)
            throw new Error(`PSBT: Non-empty key for ${a} (key=${v.encode(c)} value=${v.encode(u)}`);
          if (c = f ? f.decode(c) : void 0, u = h.decode(u), !f) {
            if (s[a])
              throw new Error(`PSBT: Same keys: ${a} (key=${c} value=${u})`);
            s[a] = u, i[a] = !0;
            continue;
          }
        } else
          c = { type: o.key.type, key: o.key.key };
        if (i[a])
          throw new Error(`PSBT: Key type with empty key and no key=${a} val=${u}`);
        s[a] || (s[a] = []), s[a].push([c, u]);
      }
      return s;
    }
  });
}
const Do = Rt(Lo(Gs), (e) => {
  if (e.finalScriptWitness && !e.finalScriptWitness.length)
    throw new Error("validateInput: empty finalScriptWitness");
  if (e.partialSig && !e.partialSig.length)
    throw new Error("Empty partialSig");
  if (e.partialSig)
    for (const [t] of e.partialSig)
      Dn(t, _t.ecdsa);
  if (e.bip32Derivation)
    for (const [t] of e.bip32Derivation)
      Dn(t, _t.ecdsa);
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
}), Vo = Rt(Lo(Er), (e) => {
  if (e.bip32Derivation)
    for (const [t] of e.bip32Derivation)
      Dn(t, _t.ecdsa);
  return e;
}), Xu = Rt(Lo(_o), (e) => {
  if ((e.version || 0) === 0) {
    if (!e.unsignedTx)
      throw new Error("PSBTv0: missing unsignedTx");
    for (const n of e.unsignedTx.inputs)
      if (n.finalScriptSig && n.finalScriptSig.length)
        throw new Error("PSBTv0: input scriptSig found in unsignedTx");
  }
  return e;
}), Hh = Tt({
  magic: No(Bo(new Uint8Array([255])), "psbt"),
  global: Xu,
  inputs: Nt("global/unsignedTx/inputs/length", Do),
  outputs: Nt(null, Vo)
}), Fh = Tt({
  magic: No(Bo(new Uint8Array([255])), "psbt"),
  global: Xu,
  inputs: Nt("global/inputCount", Do),
  outputs: Nt("global/outputCount", Vo)
});
Tt({
  magic: No(Bo(new Uint8Array([255])), "psbt"),
  items: Nt(null, Ge(Nt(Lu, kh([vh(ne), ut(zs)])), Ks.dict()))
});
function fi(e, t, n) {
  for (const r in n) {
    if (r === "unknown" || !t[r])
      continue;
    const { allowInc: s } = zi(t[r]);
    if (!s.includes(e))
      throw new Error(`PSBTv${e}: field ${r} is not allowed`);
  }
  for (const r in t) {
    const { reqInc: s } = zi(t[r]);
    if (s.includes(e) && n[r] === void 0)
      throw new Error(`PSBTv${e}: missing required field ${r}`);
  }
}
function _a(e, t, n) {
  const r = {};
  for (const s in n) {
    const i = s;
    if (i !== "unknown") {
      if (!t[i])
        continue;
      const { allowInc: o, silentIgnore: a } = zi(t[i]);
      if (!o.includes(e)) {
        if (a)
          continue;
        throw new Error(`Failed to serialize in PSBTv${e}: ${i} but versions allows inclusion=${o}`);
      }
    }
    r[i] = n[i];
  }
  return r;
}
function Qu(e) {
  const t = e && e.global && e.global.version || 0;
  fi(t, _o, e.global);
  for (const o of e.inputs)
    fi(t, Gs, o);
  for (const o of e.outputs)
    fi(t, Er, o);
  const n = t ? e.global.inputCount : e.global.unsignedTx.inputs.length;
  if (e.inputs.length < n)
    throw new Error("Not enough inputs");
  const r = e.inputs.slice(n);
  if (r.length > 1 || r.length && Object.keys(r[0]).length)
    throw new Error(`Unexpected inputs left in tx=${r}`);
  const s = t ? e.global.outputCount : e.global.unsignedTx.outputs.length;
  if (e.outputs.length < s)
    throw new Error("Not outputs inputs");
  const i = e.outputs.slice(s);
  if (i.length > 1 || i.length && Object.keys(i[0]).length)
    throw new Error(`Unexpected outputs left in tx=${i}`);
  return e;
}
function ji(e, t, n, r, s) {
  const i = { ...n, ...t };
  for (const o in e) {
    const a = o, [c, u, l] = e[a], f = r && !r.includes(o);
    if (t[o] === void 0 && o in t) {
      if (f)
        throw new Error(`Cannot remove signed field=${o}`);
      delete i[o];
    } else if (u) {
      const h = n && n[o] ? n[o] : [];
      let p = t[a];
      if (p) {
        if (!Array.isArray(p))
          throw new Error(`keyMap(${o}): KV pairs should be [k, v][]`);
        p = p.map((g) => {
          if (g.length !== 2)
            throw new Error(`keyMap(${o}): KV pairs should be [k, v][]`);
          return [
            typeof g[0] == "string" ? u.decode(v.decode(g[0])) : g[0],
            typeof g[1] == "string" ? l.decode(v.decode(g[1])) : g[1]
          ];
        });
        const y = {}, d = (g, w, A) => {
          if (y[g] === void 0) {
            y[g] = [w, A];
            return;
          }
          const O = v.encode(l.encode(y[g][1])), P = v.encode(l.encode(A));
          if (O !== P)
            throw new Error(`keyMap(${a}): same key=${g} oldVal=${O} newVal=${P}`);
        };
        for (const [g, w] of h) {
          const A = v.encode(u.encode(g));
          d(A, g, w);
        }
        for (const [g, w] of p) {
          const A = v.encode(u.encode(g));
          if (w === void 0) {
            if (f)
              throw new Error(`Cannot remove signed field=${a}/${g}`);
            delete y[A];
          } else
            d(A, g, w);
        }
        i[a] = Object.values(y);
      }
    } else if (typeof i[o] == "string")
      i[o] = l.decode(v.decode(i[o]));
    else if (f && o in t && n && n[o] !== void 0 && !gt(l.encode(t[o]), l.encode(n[o])))
      throw new Error(`Cannot change signed field=${o}`);
  }
  for (const o in i)
    if (!e[o]) {
      if (s && o === "unknown")
        continue;
      delete i[o];
    }
  return i;
}
const La = Rt(Hh, Qu), Da = Rt(Fh, Qu), Wh = {
  encode(e) {
    if (!(e.length !== 2 || e[0] !== 1 || !at(e[1]) || v.encode(e[1]) !== "4e73"))
      return { type: "p2a", script: G.encode(e) };
  },
  decode: (e) => {
    if (e.type === "p2a")
      return [1, v.decode("4e73")];
  }
};
function kn(e, t) {
  try {
    return Dn(e, t), !0;
  } catch {
    return !1;
  }
}
const Kh = {
  encode(e) {
    if (!(e.length !== 2 || !at(e[0]) || !kn(e[0], _t.ecdsa) || e[1] !== "CHECKSIG"))
      return { type: "pk", pubkey: e[0] };
  },
  decode: (e) => e.type === "pk" ? [e.pubkey, "CHECKSIG"] : void 0
}, zh = {
  encode(e) {
    if (!(e.length !== 5 || e[0] !== "DUP" || e[1] !== "HASH160" || !at(e[2])) && !(e[3] !== "EQUALVERIFY" || e[4] !== "CHECKSIG"))
      return { type: "pkh", hash: e[2] };
  },
  decode: (e) => e.type === "pkh" ? ["DUP", "HASH160", e.hash, "EQUALVERIFY", "CHECKSIG"] : void 0
}, jh = {
  encode(e) {
    if (!(e.length !== 3 || e[0] !== "HASH160" || !at(e[1]) || e[2] !== "EQUAL"))
      return { type: "sh", hash: e[1] };
  },
  decode: (e) => e.type === "sh" ? ["HASH160", e.hash, "EQUAL"] : void 0
}, Gh = {
  encode(e) {
    if (!(e.length !== 2 || e[0] !== 0 || !at(e[1])) && e[1].length === 32)
      return { type: "wsh", hash: e[1] };
  },
  decode: (e) => e.type === "wsh" ? [0, e.hash] : void 0
}, qh = {
  encode(e) {
    if (!(e.length !== 2 || e[0] !== 0 || !at(e[1])) && e[1].length === 20)
      return { type: "wpkh", hash: e[1] };
  },
  decode: (e) => e.type === "wpkh" ? [0, e.hash] : void 0
}, Yh = {
  encode(e) {
    const t = e.length - 1;
    if (e[t] !== "CHECKMULTISIG")
      return;
    const n = e[0], r = e[t - 1];
    if (typeof n != "number" || typeof r != "number")
      return;
    const s = e.slice(1, -2);
    if (r === s.length) {
      for (const i of s)
        if (!at(i))
          return;
      return { type: "ms", m: n, pubkeys: s };
    }
  },
  // checkmultisig(n, ..pubkeys, m)
  decode: (e) => e.type === "ms" ? [e.m, ...e.pubkeys, e.pubkeys.length, "CHECKMULTISIG"] : void 0
}, Zh = {
  encode(e) {
    if (!(e.length !== 2 || e[0] !== 1 || !at(e[1])))
      return { type: "tr", pubkey: e[1] };
  },
  decode: (e) => e.type === "tr" ? [1, e.pubkey] : void 0
}, Xh = {
  encode(e) {
    const t = e.length - 1;
    if (e[t] !== "CHECKSIG")
      return;
    const n = [];
    for (let r = 0; r < t; r++) {
      const s = e[r];
      if (r & 1) {
        if (s !== "CHECKSIGVERIFY" || r === t - 1)
          return;
        continue;
      }
      if (!at(s))
        return;
      n.push(s);
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
}, Qh = {
  encode(e) {
    const t = e.length - 1;
    if (e[t] !== "NUMEQUAL" || e[1] !== "CHECKSIG")
      return;
    const n = [], r = Nh(e[t - 1]);
    if (typeof r == "number") {
      for (let s = 0; s < t - 1; s++) {
        const i = e[s];
        if (s & 1) {
          if (i !== (s === 1 ? "CHECKSIG" : "CHECKSIGADD"))
            throw new Error("OutScript.encode/tr_ms: wrong element");
          continue;
        }
        if (!at(i))
          throw new Error("OutScript.encode/tr_ms: wrong key element");
        n.push(i);
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
}, Jh = {
  encode(e) {
    return { type: "unknown", script: G.encode(e) };
  },
  decode: (e) => e.type === "unknown" ? G.decode(e.script) : void 0
}, tp = [
  Wh,
  Kh,
  zh,
  jh,
  Gh,
  qh,
  Yh,
  Zh,
  Xh,
  Qh,
  Jh
], ep = Ge(G, Ks.match(tp)), ht = Rt(ep, (e) => {
  if (e.type === "pk" && !kn(e.pubkey, _t.ecdsa))
    throw new Error("OutScript/pk: wrong key");
  if ((e.type === "pkh" || e.type === "sh" || e.type === "wpkh") && (!at(e.hash) || e.hash.length !== 20))
    throw new Error(`OutScript/${e.type}: wrong hash`);
  if (e.type === "wsh" && (!at(e.hash) || e.hash.length !== 32))
    throw new Error("OutScript/wsh: wrong hash");
  if (e.type === "tr" && (!at(e.pubkey) || !kn(e.pubkey, _t.schnorr)))
    throw new Error("OutScript/tr: wrong taproot public key");
  if ((e.type === "ms" || e.type === "tr_ns" || e.type === "tr_ms") && !Array.isArray(e.pubkeys))
    throw new Error("OutScript/multisig: wrong pubkeys array");
  if (e.type === "ms") {
    const t = e.pubkeys.length;
    for (const n of e.pubkeys)
      if (!kn(n, _t.ecdsa))
        throw new Error("OutScript/multisig: wrong pubkey");
    if (e.m <= 0 || t > 16 || e.m > t)
      throw new Error("OutScript/multisig: invalid params");
  }
  if (e.type === "tr_ns" || e.type === "tr_ms") {
    for (const t of e.pubkeys)
      if (!kn(t, _t.schnorr))
        throw new Error(`OutScript/${e.type}: wrong pubkey`);
  }
  if (e.type === "tr_ms") {
    const t = e.pubkeys.length;
    if (e.m <= 0 || t > 999 || e.m > t)
      throw new Error("OutScript/tr_ms: invalid params");
  }
  return e;
});
function Va(e, t) {
  if (!gt(e.hash, vt(t)))
    throw new Error("checkScript: wsh wrong witnessScript hash");
  const n = ht.decode(t);
  if (n.type === "tr" || n.type === "tr_ns" || n.type === "tr_ms")
    throw new Error(`checkScript: P2${n.type} cannot be wrapped in P2SH`);
  if (n.type === "wpkh" || n.type === "sh")
    throw new Error(`checkScript: P2${n.type} cannot be wrapped in P2WSH`);
}
function Ju(e, t, n) {
  if (e) {
    const r = ht.decode(e);
    if (r.type === "tr_ns" || r.type === "tr_ms" || r.type === "ms" || r.type == "pk")
      throw new Error(`checkScript: non-wrapped ${r.type}`);
    if (r.type === "sh" && t) {
      if (!gt(r.hash, zu(t)))
        throw new Error("checkScript: sh wrong redeemScript hash");
      const s = ht.decode(t);
      if (s.type === "tr" || s.type === "tr_ns" || s.type === "tr_ms")
        throw new Error(`checkScript: P2${s.type} cannot be wrapped in P2SH`);
      if (s.type === "sh")
        throw new Error("checkScript: P2SH cannot be wrapped in P2SH");
    }
    r.type === "wsh" && n && Va(r, n);
  }
  if (t) {
    const r = ht.decode(t);
    r.type === "wsh" && n && Va(r, n);
  }
}
function np(e) {
  const t = {};
  for (const n of e) {
    const r = v.encode(n);
    if (t[r])
      throw new Error(`Multisig: non-uniq pubkey: ${e.map(v.encode)}`);
    t[r] = !0;
  }
}
function rp(e, t, n = !1, r) {
  const s = ht.decode(e);
  if (s.type === "unknown" && n)
    return;
  if (!["tr_ns", "tr_ms"].includes(s.type))
    throw new Error(`P2TR: invalid leaf script=${s.type}`);
  const i = s;
  if (!n && i.pubkeys)
    for (const o of i.pubkeys) {
      if (gt(o, Uo))
        throw new Error("Unspendable taproot key in leaf script");
      if (gt(o, t))
        throw new Error("Using P2TR with leaf script with same key as internal key is not supported");
    }
}
function tl(e) {
  const t = Array.from(e);
  for (; t.length >= 2; ) {
    t.sort((o, a) => (a.weight || 1) - (o.weight || 1));
    const r = t.pop(), s = t.pop(), i = (s?.weight || 1) + (r?.weight || 1);
    t.push({
      weight: i,
      // Unwrap children array
      // TODO: Very hard to remove any here
      childs: [s?.childs || s, r?.childs || r]
    });
  }
  const n = t[0];
  return n?.childs || n;
}
function Gi(e, t = []) {
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
    left: Gi(e.left, [e.right.hash, ...t]),
    right: Gi(e.right, [e.left.hash, ...t])
  };
}
function qi(e) {
  if (!e)
    throw new Error("taprootAddPath: empty tree");
  if (e.type === "leaf")
    return [e];
  if (e.type !== "branch")
    throw new Error(`taprootWalkTree: wrong type=${e}`);
  return [...qi(e.left), ...qi(e.right)];
}
function Yi(e, t, n = !1, r) {
  if (!e)
    throw new Error("taprootHashTree: empty tree");
  if (Array.isArray(e) && e.length === 1 && (e = e[0]), !Array.isArray(e)) {
    const { leafVersion: c, script: u } = e;
    if (e.tapLeafScript || e.tapMerkleRoot && !gt(e.tapMerkleRoot, dt))
      throw new Error("P2TR: tapRoot leafScript cannot have tree");
    const l = typeof u == "string" ? v.decode(u) : u;
    if (!at(l))
      throw new Error(`checkScript: wrong script type=${l}`);
    return rp(l, t, n), {
      type: "leaf",
      version: c,
      script: l,
      hash: ar(l, c)
    };
  }
  if (e.length !== 2 && (e = tl(e)), e.length !== 2)
    throw new Error("hashTree: non binary tree!");
  const s = Yi(e[0], t, n), i = Yi(e[1], t, n);
  let [o, a] = [s.hash, i.hash];
  return ps(a, o) === -1 && ([o, a] = [a, o]), { type: "branch", left: s, right: i, hash: $o("TapBranch", o, a) };
}
const xr = 192, ar = (e, t = xr) => $o("TapLeaf", new Uint8Array([t]), Xt.encode(e));
function sp(e, t, n = Vn, r = !1, s) {
  if (!e && !t)
    throw new Error("p2tr: should have pubKey or scriptTree (or both)");
  const i = typeof e == "string" ? v.decode(e) : e || Uo;
  if (!kn(i, _t.schnorr))
    throw new Error("p2tr: non-schnorr pubkey");
  if (t) {
    let o = Gi(Yi(t, i, r));
    const a = o.hash, [c, u] = Wi(i, a), l = qi(o).map((f) => ({
      ...f,
      controlBlock: fe.encode({
        version: (f.version || xr) + u,
        internalKey: i,
        merklePath: f.path
      })
    }));
    return {
      type: "tr",
      script: ht.encode({ type: "tr", pubkey: c }),
      address: qe(n).encode({ type: "tr", pubkey: c }),
      // For tests
      tweakedPubkey: c,
      // PSBT stuff
      tapInternalKey: i,
      leaves: l,
      tapLeafScript: l.map((f) => [
        fe.decode(f.controlBlock),
        De(f.script, new Uint8Array([f.version || xr]))
      ]),
      tapMerkleRoot: a
    };
  } else {
    const o = Wi(i, dt)[0];
    return {
      type: "tr",
      script: ht.encode({ type: "tr", pubkey: o }),
      address: qe(n).encode({ type: "tr", pubkey: o }),
      // For tests
      tweakedPubkey: o,
      // PSBT stuff
      tapInternalKey: i
    };
  }
}
function ip(e, t, n = !1) {
  return n || np(t), {
    type: "tr_ms",
    script: ht.encode({ type: "tr_ms", pubkeys: t, m: e })
  };
}
const el = ch(vt);
function nl(e, t) {
  if (t.length < 2 || t.length > 40)
    throw new Error("Witness: invalid length");
  if (e > 16)
    throw new Error("Witness: invalid version");
  if (e === 0 && !(t.length === 20 || t.length === 32))
    throw new Error("Witness: invalid length for version");
}
function di(e, t, n = Vn) {
  nl(e, t);
  const r = e === 0 ? Mi : An;
  return r.encode(n.bech32, [e].concat(r.toWords(t)));
}
function Ma(e, t) {
  return el.encode(De(Uint8Array.from(t), e));
}
function qe(e = Vn) {
  return {
    encode(t) {
      const { type: n } = t;
      if (n === "wpkh")
        return di(0, t.hash, e);
      if (n === "wsh")
        return di(0, t.hash, e);
      if (n === "tr")
        return di(1, t.pubkey, e);
      if (n === "pkh")
        return Ma(t.hash, [e.pubKeyHash]);
      if (n === "sh")
        return Ma(t.hash, [e.scriptHash]);
      throw new Error(`Unknown address type=${n}`);
    },
    decode(t) {
      if (t.length < 14 || t.length > 74)
        throw new Error("Invalid address length");
      if (e.bech32 && t.toLowerCase().startsWith(`${e.bech32}1`)) {
        let r;
        try {
          if (r = Mi.decode(t), r.words[0] !== 0)
            throw new Error(`bech32: wrong version=${r.words[0]}`);
        } catch {
          if (r = An.decode(t), r.words[0] === 0)
            throw new Error(`bech32m: wrong version=${r.words[0]}`);
        }
        if (r.prefix !== e.bech32)
          throw new Error(`wrong bech32 prefix=${r.prefix}`);
        const [s, ...i] = r.words, o = Mi.fromWords(i);
        if (nl(s, o), s === 0 && o.length === 32)
          return { type: "wsh", hash: o };
        if (s === 0 && o.length === 20)
          return { type: "wpkh", hash: o };
        if (s === 1 && o.length === 32)
          return { type: "tr", pubkey: o };
        throw new Error("Unknown witness program");
      }
      const n = el.decode(t);
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
const Vr = new Uint8Array(32), op = {
  amount: 0xffffffffffffffffn,
  script: dt
}, ap = (e) => Math.ceil(e / 4), cp = 8, up = 2, rn = 0, Mo = 4294967295;
Ks.decimal(cp);
const cr = (e, t) => e === void 0 ? t : e;
function ws(e) {
  if (Array.isArray(e))
    return e.map((t) => ws(t));
  if (at(e))
    return Uint8Array.from(e);
  if (["number", "bigint", "boolean", "string", "undefined"].includes(typeof e))
    return e;
  if (e === null)
    return e;
  if (typeof e == "object")
    return Object.fromEntries(Object.entries(e).map(([t, n]) => [t, ws(n)]));
  throw new Error(`cloneDeep: unknown type=${e} (${typeof e})`);
}
const tt = {
  DEFAULT: 0,
  ALL: 1,
  NONE: 2,
  SINGLE: 3,
  ANYONECANPAY: 128
}, mn = {
  DEFAULT: tt.DEFAULT,
  ALL: tt.ALL,
  NONE: tt.NONE,
  SINGLE: tt.SINGLE,
  DEFAULT_ANYONECANPAY: tt.DEFAULT | tt.ANYONECANPAY,
  ALL_ANYONECANPAY: tt.ALL | tt.ANYONECANPAY,
  NONE_ANYONECANPAY: tt.NONE | tt.ANYONECANPAY,
  SINGLE_ANYONECANPAY: tt.SINGLE | tt.ANYONECANPAY
}, lp = qu(mn);
function fp(e, t, n, r = dt) {
  return gt(n, t) && (e = Oh(e, r), t = Ro(e)), { privKey: e, pubKey: t };
}
function sn(e) {
  if (e.script === void 0 || e.amount === void 0)
    throw new Error("Transaction/output: script and amount required");
  return { script: e.script, amount: e.amount };
}
function Jn(e) {
  if (e.txid === void 0 || e.index === void 0)
    throw new Error("Transaction/input: txid and index required");
  return {
    txid: e.txid,
    index: e.index,
    sequence: cr(e.sequence, Mo),
    finalScriptSig: cr(e.finalScriptSig, dt)
  };
}
function hi(e) {
  for (const t in e) {
    const n = t;
    Dh.includes(n) || delete e[n];
  }
}
const pi = Tt({ txid: ut(32, !0), index: nt });
function dp(e) {
  if (typeof e != "number" || typeof lp[e] != "string")
    throw new Error(`Invalid SigHash=${e}`);
  return e;
}
function Ha(e) {
  const t = e & 31;
  return {
    isAny: !!(e & tt.ANYONECANPAY),
    isNone: t === tt.NONE,
    isSingle: t === tt.SINGLE
  };
}
function hp(e) {
  if (e !== void 0 && {}.toString.call(e) !== "[object Object]")
    throw new Error(`Wrong object type for transaction options: ${e}`);
  const t = {
    ...e,
    // Defaults
    version: cr(e.version, up),
    lockTime: cr(e.lockTime, 0),
    PSBTVersion: cr(e.PSBTVersion, 0)
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
function Fa(e) {
  if (e.nonWitnessUtxo && e.index !== void 0) {
    const t = e.nonWitnessUtxo.outputs.length - 1;
    if (e.index > t)
      throw new Error(`validateInput: index(${e.index}) not in nonWitnessUtxo`);
    const n = e.nonWitnessUtxo.outputs[e.index];
    if (e.witnessUtxo && (!gt(e.witnessUtxo.script, n.script) || e.witnessUtxo.amount !== n.amount))
      throw new Error("validateInput: witnessUtxo different from nonWitnessUtxo");
    if (e.txid) {
      if (e.nonWitnessUtxo.outputs.length - 1 < e.index)
        throw new Error("nonWitnessUtxo: incorect output index");
      const s = Qt.fromRaw(Bn.encode(e.nonWitnessUtxo), {
        allowUnknownOutputs: !0,
        disableScriptCheck: !0,
        allowUnknownInputs: !0
      }), i = v.encode(e.txid);
      if (s.isFinal && s.id !== i)
        throw new Error(`nonWitnessUtxo: wrong txid, exp=${i} got=${s.id}`);
    }
  }
  return e;
}
function Xr(e) {
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
function Wa(e, t, n, r = !1, s = !1) {
  let { nonWitnessUtxo: i, txid: o } = e;
  typeof i == "string" && (i = v.decode(i)), at(i) && (i = Bn.decode(i)), !("nonWitnessUtxo" in e) && i === void 0 && (i = t?.nonWitnessUtxo), typeof o == "string" && (o = v.decode(o)), o === void 0 && (o = t?.txid);
  let a = { ...t, ...e, nonWitnessUtxo: i, txid: o };
  !("nonWitnessUtxo" in e) && a.nonWitnessUtxo === void 0 && delete a.nonWitnessUtxo, a.sequence === void 0 && (a.sequence = Mo), a.tapMerkleRoot === null && delete a.tapMerkleRoot, a = ji(Gs, a, t, n, s), Do.encode(a);
  let c;
  return a.nonWitnessUtxo && a.index !== void 0 ? c = a.nonWitnessUtxo.outputs[a.index] : a.witnessUtxo && (c = a.witnessUtxo), c && !r && Ju(c && c.script, a.redeemScript, a.witnessScript), a;
}
function Ka(e, t = !1) {
  let n = "legacy", r = tt.ALL;
  const s = Xr(e), i = ht.decode(s.script);
  let o = i.type, a = i;
  const c = [i];
  if (i.type === "tr")
    return r = tt.DEFAULT, {
      txType: "taproot",
      type: "tr",
      last: i,
      lastScript: s.script,
      defaultSighash: r,
      sighash: e.sighashType || r
    };
  {
    if ((i.type === "wpkh" || i.type === "wsh") && (n = "segwit"), i.type === "sh") {
      if (!e.redeemScript)
        throw new Error("inputType: sh without redeemScript");
      let h = ht.decode(e.redeemScript);
      (h.type === "wpkh" || h.type === "wsh") && (n = "segwit"), c.push(h), a = h, o += `-${h.type}`;
    }
    if (a.type === "wsh") {
      if (!e.witnessScript)
        throw new Error("inputType: wsh without witnessScript");
      let h = ht.decode(e.witnessScript);
      h.type === "wsh" && (n = "segwit"), c.push(h), a = h, o += `-${h.type}`;
    }
    const u = c[c.length - 1];
    if (u.type === "sh" || u.type === "wsh")
      throw new Error("inputType: sh/wsh cannot be terminal type");
    const l = ht.encode(u), f = {
      type: o,
      txType: n,
      last: u,
      lastScript: l,
      defaultSighash: r,
      sighash: e.sighashType || r
    };
    if (n === "legacy" && !t && !e.nonWitnessUtxo)
      throw new Error("Transaction/sign: legacy input without nonWitnessUtxo, can result in attack that forces paying higher fees. Pass allowLegacyWitnessUtxo=true, if you sure");
    return f;
  }
}
let Qt = class Qr {
  global = {};
  inputs = [];
  // use getInput()
  outputs = [];
  // use getOutput()
  opts;
  constructor(t = {}) {
    const n = this.opts = hp(t);
    n.lockTime !== rn && (this.global.fallbackLocktime = n.lockTime), this.global.txVersion = n.version;
  }
  // Import
  static fromRaw(t, n = {}) {
    const r = Bn.decode(t), s = new Qr({ ...n, version: r.version, lockTime: r.lockTime });
    for (const i of r.outputs)
      s.addOutput(i);
    if (s.outputs = r.outputs, s.inputs = r.inputs, r.witnesses)
      for (let i = 0; i < r.witnesses.length; i++)
        s.inputs[i].finalScriptWitness = r.witnesses[i];
    return s;
  }
  // PSBT
  static fromPSBT(t, n = {}) {
    let r;
    try {
      r = La.decode(t);
    } catch (f) {
      try {
        r = Da.decode(t);
      } catch {
        throw f;
      }
    }
    const s = r.global.version || 0;
    if (s !== 0 && s !== 2)
      throw new Error(`Wrong PSBT version=${s}`);
    const i = r.global.unsignedTx, o = s === 0 ? i?.version : r.global.txVersion, a = s === 0 ? i?.lockTime : r.global.fallbackLocktime, c = new Qr({ ...n, version: o, lockTime: a, PSBTVersion: s }), u = s === 0 ? i?.inputs.length : r.global.inputCount;
    c.inputs = r.inputs.slice(0, u).map((f, h) => Fa({
      finalScriptSig: dt,
      ...r.global.unsignedTx?.inputs[h],
      ...f
    }));
    const l = s === 0 ? i?.outputs.length : r.global.outputCount;
    return c.outputs = r.outputs.slice(0, l).map((f, h) => ({
      ...f,
      ...r.global.unsignedTx?.outputs[h]
    })), c.global = { ...r.global, txVersion: o }, a !== rn && (c.global.fallbackLocktime = a), c;
  }
  toPSBT(t = this.opts.PSBTVersion) {
    if (t !== 0 && t !== 2)
      throw new Error(`Wrong PSBT version=${t}`);
    const n = this.inputs.map((i) => Fa(_a(t, Gs, i)));
    for (const i of n)
      i.partialSig && !i.partialSig.length && delete i.partialSig, i.finalScriptSig && !i.finalScriptSig.length && delete i.finalScriptSig, i.finalScriptWitness && !i.finalScriptWitness.length && delete i.finalScriptWitness;
    const r = this.outputs.map((i) => _a(t, Er, i)), s = { ...this.global };
    return t === 0 ? (s.unsignedTx = ir.decode(ir.encode({
      version: this.version,
      lockTime: this.lockTime,
      inputs: this.inputs.map(Jn).map((i) => ({
        ...i,
        finalScriptSig: dt
      })),
      outputs: this.outputs.map(sn)
    })), delete s.fallbackLocktime, delete s.txVersion) : (s.version = t, s.txVersion = this.version, s.inputCount = this.inputs.length, s.outputCount = this.outputs.length, s.fallbackLocktime && s.fallbackLocktime === rn && delete s.fallbackLocktime), this.opts.bip174jsCompat && (n.length || n.push({}), r.length || r.push({})), (t === 0 ? La : Da).encode({
      global: s,
      inputs: n,
      outputs: r
    });
  }
  // BIP370 lockTime (https://github.com/bitcoin/bips/blob/master/bip-0370.mediawiki#determining-lock-time)
  get lockTime() {
    let t = rn, n = 0, r = rn, s = 0;
    for (const i of this.inputs)
      i.requiredHeightLocktime && (t = Math.max(t, i.requiredHeightLocktime), n++), i.requiredTimeLocktime && (r = Math.max(r, i.requiredTimeLocktime), s++);
    return n && n >= s ? t : r !== rn ? r : this.global.fallbackLocktime || rn;
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
    const n = this.inputs[t].sighashType, r = n === void 0 ? tt.DEFAULT : n, s = r === tt.DEFAULT ? tt.ALL : r & 3;
    return { sigInputs: r & tt.ANYONECANPAY, sigOutputs: s };
  }
  // Very nice for debug purposes, but slow. If there is too much inputs/outputs to add, will be quadratic.
  // Some cache will be nice, but there chance to have bugs with cache invalidation
  signStatus() {
    let t = !0, n = !0, r = [], s = [];
    for (let i = 0; i < this.inputs.length; i++) {
      if (this.inputStatus(i) === "unsigned")
        continue;
      const { sigInputs: a, sigOutputs: c } = this.inputSighash(i);
      if (a === tt.ANYONECANPAY ? r.push(i) : t = !1, c === tt.ALL)
        n = !1;
      else if (c === tt.SINGLE)
        s.push(i);
      else if (c !== tt.NONE) throw new Error(`Wrong signature hash output type: ${c}`);
    }
    return { addInput: t, addOutput: n, inputs: r, outputs: s };
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
    const n = this.outputs.map(sn);
    t += 4 * ne.encode(this.outputs.length).length;
    for (const r of n)
      t += 32 + 4 * Xt.encode(r.script).length;
    this.hasWitnesses && (t += 2), t += 4 * ne.encode(this.inputs.length).length;
    for (const r of this.inputs)
      t += 160 + 4 * Xt.encode(r.finalScriptSig || dt).length, this.hasWitnesses && r.finalScriptWitness && (t += br.encode(r.finalScriptWitness).length);
    return t;
  }
  get vsize() {
    return ap(this.weight);
  }
  toBytes(t = !1, n = !1) {
    return Bn.encode({
      version: this.version,
      lockTime: this.lockTime,
      inputs: this.inputs.map(Jn).map((r) => ({
        ...r,
        finalScriptSig: t && r.finalScriptSig || dt
      })),
      outputs: this.outputs.map(sn),
      witnesses: this.inputs.map((r) => r.finalScriptWitness || []),
      segwitFlag: n && this.hasWitnesses
    });
  }
  get unsignedTx() {
    return this.toBytes(!1, !1);
  }
  get hex() {
    return v.encode(this.toBytes(!0, this.hasWitnesses));
  }
  get hash() {
    return v.encode(Re(this.toBytes(!0)));
  }
  get id() {
    return v.encode(Re(this.toBytes(!0)).reverse());
  }
  // Input stuff
  checkInputIdx(t) {
    if (!Number.isSafeInteger(t) || 0 > t || t >= this.inputs.length)
      throw new Error(`Wrong input index=${t}`);
  }
  getInput(t) {
    return this.checkInputIdx(t), ws(this.inputs[t]);
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
    let s;
    if (!r) {
      const i = this.signStatus();
      (!i.addInput || i.inputs.includes(t)) && (s = Vh);
    }
    this.inputs[t] = Wa(n, this.inputs[t], s, this.opts.disableScriptCheck, this.opts.allowUnknown);
  }
  // Output stuff
  checkOutputIdx(t) {
    if (!Number.isSafeInteger(t) || 0 > t || t >= this.outputs.length)
      throw new Error(`Wrong output index=${t}`);
  }
  getOutput(t) {
    return this.checkOutputIdx(t), ws(this.outputs[t]);
  }
  getOutputAddress(t, n = Vn) {
    const r = this.getOutput(t);
    if (r.script)
      return qe(n).encode(ht.decode(r.script));
  }
  get outputsLength() {
    return this.outputs.length;
  }
  normalizeOutput(t, n, r) {
    let { amount: s, script: i } = t;
    if (s === void 0 && (s = n?.amount), typeof s != "bigint")
      throw new Error(`Wrong amount type, should be of type bigint in sats, but got ${s} of type ${typeof s}`);
    typeof i == "string" && (i = v.decode(i)), i === void 0 && (i = n?.script);
    let o = { ...n, ...t, amount: s, script: i };
    if (o.amount === void 0 && delete o.amount, o = ji(Er, o, n, r, this.opts.allowUnknown), Vo.encode(o), o.script && !this.opts.allowUnknownOutputs && ht.decode(o.script).type === "unknown")
      throw new Error("Transaction/output: unknown output script type, there is a chance that input is unspendable. Pass allowUnknownOutputs=true, if you sure");
    return this.opts.disableScriptCheck || Ju(o.script, o.redeemScript, o.witnessScript), o;
  }
  addOutput(t, n = !1) {
    if (!n && !this.signStatus().addOutput)
      throw new Error("Tx has signed outputs, cannot add new one");
    return this.outputs.push(this.normalizeOutput(t)), this.outputs.length - 1;
  }
  updateOutput(t, n, r = !1) {
    this.checkOutputIdx(t);
    let s;
    if (!r) {
      const i = this.signStatus();
      (!i.addOutput || i.outputs.includes(t)) && (s = Mh);
    }
    this.outputs[t] = this.normalizeOutput(n, this.outputs[t], s);
  }
  addOutputAddress(t, n, r = Vn) {
    return this.addOutput({ script: ht.encode(qe(r).decode(t)), amount: n });
  }
  // Utils
  get fee() {
    let t = 0n;
    for (const r of this.inputs) {
      const s = Xr(r);
      if (!s)
        throw new Error("Empty input amount");
      t += s.amount;
    }
    const n = this.outputs.map(sn);
    for (const r of n)
      t -= r.amount;
    return t;
  }
  // Signing
  // Based on https://github.com/bitcoin/bitcoin/blob/5871b5b5ab57a0caf9b7514eb162c491c83281d5/test/functional/test_framework/script.py#L624
  // There is optimization opportunity to re-use hashes for multiple inputs for witness v0/v1,
  // but we are trying to be less complicated for audit purpose for now.
  preimageLegacy(t, n, r) {
    const { isAny: s, isNone: i, isSingle: o } = Ha(r);
    if (t < 0 || !Number.isSafeInteger(t))
      throw new Error(`Invalid input idx=${t}`);
    if (o && t >= this.outputs.length || t >= this.inputs.length)
      return Fu.encode(1n);
    n = G.encode(G.decode(n).filter((l) => l !== "CODESEPARATOR"));
    let a = this.inputs.map(Jn).map((l, f) => ({
      ...l,
      finalScriptSig: f === t ? n : dt
    }));
    s ? a = [a[t]] : (i || o) && (a = a.map((l, f) => ({
      ...l,
      sequence: f === t ? l.sequence : 0
    })));
    let c = this.outputs.map(sn);
    i ? c = [] : o && (c = c.slice(0, t).fill(op).concat([c[t]]));
    const u = Bn.encode({
      lockTime: this.lockTime,
      version: this.version,
      segwitFlag: !1,
      inputs: a,
      outputs: c
    });
    return Re(u, In.encode(r));
  }
  preimageWitnessV0(t, n, r, s) {
    const { isAny: i, isNone: o, isSingle: a } = Ha(r);
    let c = Vr, u = Vr, l = Vr;
    const f = this.inputs.map(Jn), h = this.outputs.map(sn);
    i || (c = Re(...f.map(pi.encode))), !i && !a && !o && (u = Re(...f.map((y) => nt.encode(y.sequence)))), !a && !o ? l = Re(...h.map(ln.encode)) : a && t < h.length && (l = Re(ln.encode(h[t])));
    const p = f[t];
    return Re(In.encode(this.version), c, u, ut(32, !0).encode(p.txid), nt.encode(p.index), Xt.encode(n), Zr.encode(s), nt.encode(p.sequence), l, nt.encode(this.lockTime), nt.encode(r));
  }
  preimageWitnessV1(t, n, r, s, i = -1, o, a = 192, c) {
    if (!Array.isArray(s) || this.inputs.length !== s.length)
      throw new Error(`Invalid amounts array=${s}`);
    if (!Array.isArray(n) || this.inputs.length !== n.length)
      throw new Error(`Invalid prevOutScript array=${n}`);
    const u = [
      He.encode(0),
      He.encode(r),
      // U8 sigHash
      In.encode(this.version),
      nt.encode(this.lockTime)
    ], l = r === tt.DEFAULT ? tt.ALL : r & 3, f = r & tt.ANYONECANPAY, h = this.inputs.map(Jn), p = this.outputs.map(sn);
    f !== tt.ANYONECANPAY && u.push(...[
      h.map(pi.encode),
      s.map(Zr.encode),
      n.map(Xt.encode),
      h.map((d) => nt.encode(d.sequence))
    ].map((d) => vt(De(...d)))), l === tt.ALL && u.push(vt(De(...p.map(ln.encode))));
    const y = (c ? 1 : 0) | (o ? 2 : 0);
    if (u.push(new Uint8Array([y])), f === tt.ANYONECANPAY) {
      const d = h[t];
      u.push(pi.encode(d), Zr.encode(s[t]), Xt.encode(n[t]), nt.encode(d.sequence));
    } else
      u.push(nt.encode(t));
    return y & 1 && u.push(vt(Xt.encode(c || dt))), l === tt.SINGLE && u.push(t < p.length ? vt(ln.encode(p[t])) : Vr), o && u.push(ar(o, a), He.encode(0), In.encode(i)), $o("TapSighash", ...u);
  }
  // Signer can be privateKey OR instance of bip32 HD stuff
  signIdx(t, n, r, s) {
    this.checkInputIdx(n);
    const i = this.inputs[n], o = Ka(i, this.opts.allowLegacyWitnessUtxo);
    if (!at(t)) {
      if (!i.bip32Derivation || !i.bip32Derivation.length)
        throw new Error("bip32Derivation: empty");
      const l = i.bip32Derivation.filter((h) => h[1].fingerprint == t.fingerprint).map(([h, { path: p }]) => {
        let y = t;
        for (const d of p)
          y = y.deriveChild(d);
        if (!gt(y.publicKey, h))
          throw new Error("bip32Derivation: wrong pubKey");
        if (!y.privateKey)
          throw new Error("bip32Derivation: no privateKey");
        return y;
      });
      if (!l.length)
        throw new Error(`bip32Derivation: no items with fingerprint=${t.fingerprint}`);
      let f = !1;
      for (const h of l)
        this.signIdx(h.privateKey, n) && (f = !0);
      return f;
    }
    r ? r.forEach(dp) : r = [o.defaultSighash];
    const a = o.sighash;
    if (!r.includes(a))
      throw new Error(`Input with not allowed sigHash=${a}. Allowed: ${r.join(", ")}`);
    const { sigOutputs: c } = this.inputSighash(n);
    if (c === tt.SINGLE && n >= this.outputs.length)
      throw new Error(`Input with sighash SINGLE, but there is no output with corresponding index=${n}`);
    const u = Xr(i);
    if (o.txType === "taproot") {
      const l = this.inputs.map(Xr), f = l.map((g) => g.script), h = l.map((g) => g.amount);
      let p = !1, y = Ro(t), d = i.tapMerkleRoot || dt;
      if (i.tapInternalKey) {
        const { pubKey: g, privKey: w } = fp(t, y, i.tapInternalKey, d), [A] = Wi(i.tapInternalKey, d);
        if (gt(A, g)) {
          const O = this.preimageWitnessV1(n, f, a, h), P = De(Na(O, w, s), a !== tt.DEFAULT ? new Uint8Array([a]) : dt);
          this.updateInput(n, { tapKeySig: P }, !0), p = !0;
        }
      }
      if (i.tapLeafScript) {
        i.tapScriptSig = i.tapScriptSig || [];
        for (const [g, w] of i.tapLeafScript) {
          const A = w.subarray(0, -1), O = G.decode(A), P = w[w.length - 1], V = ar(A, P);
          if (O.findIndex((L) => at(L) && gt(L, y)) === -1)
            continue;
          const T = this.preimageWitnessV1(n, f, a, h, void 0, A, P), et = De(Na(T, t, s), a !== tt.DEFAULT ? new Uint8Array([a]) : dt);
          this.updateInput(n, { tapScriptSig: [[{ pubKey: y, leafHash: V }, et]] }, !0), p = !0;
        }
      }
      if (!p)
        throw new Error("No taproot scripts signed");
      return !0;
    } else {
      const l = ju(t);
      let f = !1;
      const h = zu(l);
      for (const d of G.decode(o.lastScript))
        at(d) && (gt(d, l) || gt(d, h)) && (f = !0);
      if (!f)
        throw new Error(`Input script doesn't have pubKey: ${o.lastScript}`);
      let p;
      if (o.txType === "legacy")
        p = this.preimageLegacy(n, o.lastScript, a);
      else if (o.txType === "segwit") {
        let d = o.lastScript;
        o.last.type === "wpkh" && (d = ht.encode({ type: "pkh", hash: o.last.hash })), p = this.preimageWitnessV0(n, d, a, u.amount);
      } else
        throw new Error(`Transaction/sign: unknown tx type: ${o.txType}`);
      const y = Ch(p, t, this.opts.lowR);
      this.updateInput(n, {
        partialSig: [[l, De(y, new Uint8Array([a]))]]
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
    let s = 0;
    for (let i = 0; i < this.inputs.length; i++)
      try {
        this.signIdx(t, i, n, r) && s++;
      } catch {
      }
    if (!s)
      throw new Error("No inputs signed");
    return s;
  }
  finalizeIdx(t) {
    if (this.checkInputIdx(t), this.fee < 0n)
      throw new Error("Outputs spends more than inputs amount");
    const n = this.inputs[t], r = Ka(n, this.opts.allowLegacyWitnessUtxo);
    if (r.txType === "taproot") {
      if (n.tapKeySig)
        n.finalScriptWitness = [n.tapKeySig];
      else if (n.tapLeafScript && n.tapScriptSig) {
        const c = n.tapLeafScript.sort((u, l) => fe.encode(u[0]).length - fe.encode(l[0]).length);
        for (const [u, l] of c) {
          const f = l.slice(0, -1), h = l[l.length - 1], p = ht.decode(f), y = ar(f, h), d = n.tapScriptSig.filter((w) => gt(w[0].leafHash, y));
          let g = [];
          if (p.type === "tr_ms") {
            const w = p.m, A = p.pubkeys;
            let O = 0;
            for (const P of A) {
              const V = d.findIndex((Y) => gt(Y[0].pubKey, P));
              if (O === w || V === -1) {
                g.push(dt);
                continue;
              }
              g.push(d[V][1]), O++;
            }
            if (O !== w)
              continue;
          } else if (p.type === "tr_ns") {
            for (const w of p.pubkeys) {
              const A = d.findIndex((O) => gt(O[0].pubKey, w));
              A !== -1 && g.push(d[A][1]);
            }
            if (g.length !== p.pubkeys.length)
              continue;
          } else if (p.type === "unknown" && this.opts.allowUnknownInputs) {
            const w = G.decode(f);
            if (g = d.map(([{ pubKey: A }, O]) => {
              const P = w.findIndex((V) => at(V) && gt(V, A));
              if (P === -1)
                throw new Error("finalize/taproot: cannot find position of pubkey in script");
              return { signature: O, pos: P };
            }).sort((A, O) => A.pos - O.pos).map((A) => A.signature), !g.length)
              continue;
          } else {
            const w = this.opts.customScripts;
            if (w)
              for (const A of w) {
                if (!A.finalizeTaproot)
                  continue;
                const O = G.decode(f), P = A.encode(O);
                if (P === void 0)
                  continue;
                const V = A.finalizeTaproot(f, P, d);
                if (V) {
                  n.finalScriptWitness = V.concat(fe.encode(u)), n.finalScriptSig = dt, hi(n);
                  return;
                }
              }
            throw new Error("Finalize: Unknown tapLeafScript");
          }
          n.finalScriptWitness = g.reverse().concat([f, fe.encode(u)]);
          break;
        }
        if (!n.finalScriptWitness)
          throw new Error("finalize/taproot: empty witness");
      } else
        throw new Error("finalize/taproot: unknown input");
      n.finalScriptSig = dt, hi(n);
      return;
    }
    if (!n.partialSig || !n.partialSig.length)
      throw new Error("Not enough partial sign");
    let s = dt, i = [];
    if (r.last.type === "ms") {
      const c = r.last.m, u = r.last.pubkeys;
      let l = [];
      for (const f of u) {
        const h = n.partialSig.find((p) => gt(f, p[0]));
        h && l.push(h[1]);
      }
      if (l = l.slice(0, c), l.length !== c)
        throw new Error(`Multisig: wrong signatures count, m=${c} n=${u.length} signatures=${l.length}`);
      s = G.encode([0, ...l]);
    } else if (r.last.type === "pk")
      s = G.encode([n.partialSig[0][1]]);
    else if (r.last.type === "pkh")
      s = G.encode([n.partialSig[0][1], n.partialSig[0][0]]);
    else if (r.last.type === "wpkh")
      s = dt, i = [n.partialSig[0][1], n.partialSig[0][0]];
    else if (r.last.type === "unknown" && !this.opts.allowUnknownInputs)
      throw new Error("Unknown inputs not allowed");
    let o, a;
    if (r.type.includes("wsh-") && (s.length && r.lastScript.length && (i = G.decode(s).map((c) => {
      if (c === 0)
        return dt;
      if (at(c))
        return c;
      throw new Error(`Wrong witness op=${c}`);
    })), i = i.concat(r.lastScript)), r.txType === "segwit" && (a = i), r.type.startsWith("sh-wsh-") ? o = G.encode([G.encode([0, vt(r.lastScript)])]) : r.type.startsWith("sh-") ? o = G.encode([...G.decode(s), r.lastScript]) : r.type.startsWith("wsh-") || r.txType !== "segwit" && (o = s), !o && !a)
      throw new Error("Unknown error finalizing input");
    o && (n.finalScriptSig = o), a && (n.finalScriptWitness = a), hi(n);
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
    for (const s of ["PSBTVersion", "version", "lockTime"])
      if (this.opts[s] !== t.opts[s])
        throw new Error(`Transaction/combine: different ${s} this=${this.opts[s]} other=${t.opts[s]}`);
    for (const s of ["inputs", "outputs"])
      if (this[s].length !== t[s].length)
        throw new Error(`Transaction/combine: different ${s} length this=${this[s].length} other=${t[s].length}`);
    const n = this.global.unsignedTx ? ir.encode(this.global.unsignedTx) : dt, r = t.global.unsignedTx ? ir.encode(t.global.unsignedTx) : dt;
    if (!gt(n, r))
      throw new Error("Transaction/combine: different unsigned tx");
    this.global = ji(_o, this.global, t.global, void 0, this.opts.allowUnknown);
    for (let s = 0; s < this.inputs.length; s++)
      this.updateInput(s, t.inputs[s], !0);
    for (let s = 0; s < this.outputs.length; s++)
      this.updateOutput(s, t.outputs[s], !0);
    return this;
  }
  clone() {
    return Qr.fromPSBT(this.toPSBT(this.opts.PSBTVersion), this.opts);
  }
};
class Ye extends Qt {
  constructor(t) {
    super(gi(t));
  }
  static fromPSBT(t, n) {
    return Qt.fromPSBT(t, gi(n));
  }
  static fromRaw(t, n) {
    return Qt.fromRaw(t, gi(n));
  }
}
Ye.ARK_TX_OPTS = {
  allowUnknown: !0,
  allowUnknownOutputs: !0,
  allowUnknownInputs: !0
};
function gi(e) {
  return { ...Ye.ARK_TX_OPTS, ...e };
}
class Ho extends Error {
  idx;
  // Indice of participant
  constructor(t, n) {
    super(n), this.idx = t;
  }
}
const { taggedHash: rl, pointToBytes: Mr } = Oe.utils, re = Ve.Point, X = re.Fn, ge = Ve.lengths.publicKey, Zi = new Uint8Array(ge), za = Ge(ut(33), {
  decode: (e) => Tr(e) ? Zi : e.toBytes(!0),
  encode: (e) => mr(e, Zi) ? re.ZERO : re.fromBytes(e)
}), ja = Rt(Fu, (e) => (iu("n", e, 1n, X.ORDER), e)), Nn = Tt({ R1: za, R2: za }), sl = Tt({ k1: ja, k2: ja, publicKey: ut(ge) });
function Ga(e, ...t) {
}
function Wt(e, ...t) {
  if (!Array.isArray(e))
    throw new Error("expected array");
  e.forEach((n) => Q(n, ...t));
}
function qa(e) {
  if (!Array.isArray(e))
    throw new Error("expected array");
  e.forEach((t, n) => {
    if (typeof t != "boolean")
      throw new Error("expected boolean in xOnly array, got" + t + "(" + n + ")");
  });
}
const ms = (e, ...t) => X.create(X.fromBytes(rl(e, ...t), !0)), tr = (e, t) => Rr(e.y) ? t : X.neg(t);
function fn(e) {
  return re.BASE.multiply(e);
}
function Tr(e) {
  return e.equals(re.ZERO);
}
function Xi(e) {
  return Wt(e, ge), e.sort(ps);
}
function il(e) {
  Wt(e, ge);
  for (let t = 1; t < e.length; t++)
    if (!mr(e[t], e[0]))
      return e[t];
  return Zi;
}
function ol(e) {
  return Wt(e, ge), rl("KeyAgg list", ...e);
}
function al(e, t, n) {
  return Q(e, ge), Q(t, ge), mr(e, t) ? 1n : ms("KeyAgg coefficient", n, e);
}
function Qi(e, t = [], n = []) {
  if (Wt(e, ge), Wt(t, 32), t.length !== n.length)
    throw new Error("The tweaks and isXonly arrays must have the same length");
  const r = il(e), s = ol(e);
  let i = re.ZERO;
  for (let c = 0; c < e.length; c++) {
    let u;
    try {
      u = re.fromBytes(e[c]);
    } catch {
      throw new Ho(c, "pubkey");
    }
    i = i.add(u.multiply(al(e[c], r, s)));
  }
  let o = X.ONE, a = X.ZERO;
  for (let c = 0; c < t.length; c++) {
    const u = n[c] && !Rr(i.y) ? X.neg(X.ONE) : X.ONE, l = X.fromBytes(t[c]);
    if (i = i.multiply(u).add(fn(l)), Tr(i))
      throw new Error("The result of tweaking cannot be infinity");
    o = X.mul(u, o), a = X.add(l, X.mul(u, a));
  }
  return { aggPublicKey: i, gAcc: o, tweakAcc: a };
}
const Ya = (e, t, n, r, s, i) => ms("MuSig/nonce", e, new Uint8Array([t.length]), t, new Uint8Array([n.length]), n, s, Cr(i.length, 4), i, new Uint8Array([r]));
function pp(e, t, n = new Uint8Array(0), r, s = new Uint8Array(0), i = kr(32)) {
  if (Q(e, ge), Ga(t, 32), Q(n), ![0, 32].includes(n.length))
    throw new Error("wrong aggPublicKey");
  Ga(), Q(s), Q(i, 32);
  const o = Uint8Array.of(0), a = Ya(i, e, n, 0, o, s), c = Ya(i, e, n, 1, o, s);
  return {
    secret: sl.encode({ k1: a, k2: c, publicKey: e }),
    public: Nn.encode({ R1: fn(a), R2: fn(c) })
  };
}
function gp(e) {
  Wt(e, 66);
  let t = re.ZERO, n = re.ZERO;
  for (let r = 0; r < e.length; r++) {
    const s = e[r];
    try {
      const { R1: i, R2: o } = Nn.decode(s);
      if (Tr(i) || Tr(o))
        throw new Error("infinity point");
      t = t.add(i), n = n.add(o);
    } catch {
      throw new Ho(r, "pubnonce");
    }
  }
  return Nn.encode({ R1: t, R2: n });
}
class yp {
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
  constructor(t, n, r, s = [], i = []) {
    if (Wt(n, 33), Wt(s, 32), qa(i), Q(r), s.length !== i.length)
      throw new Error("The tweaks and isXonly arrays must have the same length");
    const { aggPublicKey: o, gAcc: a, tweakAcc: c } = Qi(n, s, i), { R1: u, R2: l } = Nn.decode(t);
    this.publicKeys = n, this.Q = o, this.gAcc = a, this.tweakAcc = c, this.b = ms("MuSig/noncecoef", t, Mr(o), r);
    const f = u.add(l.multiply(this.b));
    this.R = Tr(f) ? re.BASE : f, this.e = ms("BIP0340/challenge", Mr(this.R), Mr(o), r), this.tweaks = s, this.isXonly = i, this.L = ol(n), this.secondKey = il(n);
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
    if (!n.some((i) => mr(i, r)))
      throw new Error("The signer's pubkey must be included in the list of pubkeys");
    return al(r, this.secondKey, this.L);
  }
  partialSigVerifyInternal(t, n, r) {
    const { Q: s, gAcc: i, b: o, R: a, e: c } = this, u = X.fromBytes(t, !0);
    if (!X.isValid(u))
      return !1;
    const { R1: l, R2: f } = Nn.decode(n), h = l.add(f.multiply(o)), p = Rr(a.y) ? h : h.negate(), y = re.fromBytes(r), d = this.getSessionKeyAggCoeff(y), g = X.mul(tr(s, 1n), i), w = fn(u), A = p.add(y.multiply(X.mul(c, X.mul(d, g))));
    return w.equals(A);
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
    if (Q(n, 32), typeof r != "boolean")
      throw new Error("expected boolean");
    const { Q: s, gAcc: i, b: o, R: a, e: c } = this, { k1: u, k2: l, publicKey: f } = sl.decode(t);
    if (t.fill(0, 0, 64), !X.isValid(u))
      throw new Error("wrong k1");
    if (!X.isValid(l))
      throw new Error("wrong k1");
    const h = tr(a, u), p = tr(a, l), y = X.fromBytes(n);
    if (X.is0(y))
      throw new Error("wrong d_");
    const d = fn(y), g = d.toBytes(!0);
    if (!mr(g, f))
      throw new Error("Public key does not match nonceGen argument");
    const w = this.getSessionKeyAggCoeff(d), A = tr(s, 1n), O = X.mul(A, X.mul(i, y)), P = X.add(h, X.add(X.mul(o, p), X.mul(c, X.mul(w, O)))), V = X.toBytes(P);
    if (!r) {
      const Y = Nn.encode({
        R1: fn(u),
        R2: fn(l)
      });
      if (!this.partialSigVerifyInternal(V, Y, g))
        throw new Error("Partial signature verification failed");
    }
    return V;
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
    const { publicKeys: s, tweaks: i, isXonly: o } = this;
    if (Q(t, 32), Wt(n, 66), Wt(s, ge), Wt(i, 32), qa(o), ze(r), n.length !== s.length)
      throw new Error("The pubNonces and publicKeys arrays must have the same length");
    if (i.length !== o.length)
      throw new Error("The tweaks and isXonly arrays must have the same length");
    if (r >= n.length)
      throw new Error("index outside of pubKeys/pubNonces");
    return this.partialSigVerifyInternal(t, n[r], s[r]);
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
    const { Q: n, tweakAcc: r, R: s, e: i } = this;
    let o = 0n;
    for (let c = 0; c < t.length; c++) {
      const u = X.fromBytes(t[c], !0);
      if (!X.isValid(u))
        throw new Ho(c, "psig");
      o = X.add(o, u);
    }
    const a = tr(n, 1n);
    return o = X.add(o, X.mul(i, X.mul(a, r))), Jt(Mr(s), X.toBytes(o));
  }
}
function wp(e) {
  const t = pp(e);
  return { secNonce: t.secret, pubNonce: t.public };
}
function mp(e) {
  return gp(e);
}
/*! noble-hashes - MIT License (c) 2022 Paul Miller (paulmillr.com) */
function Fo(e) {
  return e instanceof Uint8Array || ArrayBuffer.isView(e) && e.constructor.name === "Uint8Array";
}
function bn(e, t = "") {
  if (!Number.isSafeInteger(e) || e < 0) {
    const n = t && `"${t}" `;
    throw new Error(`${n}expected integer >0, got ${e}`);
  }
}
function it(e, t, n = "") {
  const r = Fo(e), s = e?.length, i = t !== void 0;
  if (!r || i && s !== t) {
    const o = n && `"${n}" `, a = i ? ` of length ${t}` : "", c = r ? `length=${s}` : `type=${typeof e}`;
    throw new Error(o + "expected Uint8Array" + a + ", got " + c);
  }
  return e;
}
function cl(e) {
  if (typeof e != "function" || typeof e.create != "function")
    throw new Error("Hash must wrapped by utils.createHasher");
  bn(e.outputLen), bn(e.blockLen);
}
function bs(e, t = !0) {
  if (e.destroyed)
    throw new Error("Hash instance has been destroyed");
  if (t && e.finished)
    throw new Error("Hash#digest() has already been called");
}
function bp(e, t) {
  it(e, void 0, "digestInto() output");
  const n = t.outputLen;
  if (e.length < n)
    throw new Error('"digestInto() output" expected to be of length >=' + n);
}
function Es(...e) {
  for (let t = 0; t < e.length; t++)
    e[t].fill(0);
}
function yi(e) {
  return new DataView(e.buffer, e.byteOffset, e.byteLength);
}
function oe(e, t) {
  return e << 32 - t | e >>> t;
}
const ul = /* @ts-ignore */ typeof Uint8Array.from([]).toHex == "function" && typeof Uint8Array.fromHex == "function", Ep = /* @__PURE__ */ Array.from({ length: 256 }, (e, t) => t.toString(16).padStart(2, "0"));
function qs(e) {
  if (it(e), ul)
    return e.toHex();
  let t = "";
  for (let n = 0; n < e.length; n++)
    t += Ep[e[n]];
  return t;
}
const me = { _0: 48, _9: 57, A: 65, F: 70, a: 97, f: 102 };
function Za(e) {
  if (e >= me._0 && e <= me._9)
    return e - me._0;
  if (e >= me.A && e <= me.F)
    return e - (me.A - 10);
  if (e >= me.a && e <= me.f)
    return e - (me.a - 10);
}
function xs(e) {
  if (typeof e != "string")
    throw new Error("hex string expected, got " + typeof e);
  if (ul)
    return Uint8Array.fromHex(e);
  const t = e.length, n = t / 2;
  if (t % 2)
    throw new Error("hex string expected, got unpadded hex of length " + t);
  const r = new Uint8Array(n);
  for (let s = 0, i = 0; s < n; s++, i += 2) {
    const o = Za(e.charCodeAt(i)), a = Za(e.charCodeAt(i + 1));
    if (o === void 0 || a === void 0) {
      const c = e[i] + e[i + 1];
      throw new Error('hex string expected, got non-hex character "' + c + '" at index ' + i);
    }
    r[s] = o * 16 + a;
  }
  return r;
}
function de(...e) {
  let t = 0;
  for (let r = 0; r < e.length; r++) {
    const s = e[r];
    it(s), t += s.length;
  }
  const n = new Uint8Array(t);
  for (let r = 0, s = 0; r < e.length; r++) {
    const i = e[r];
    n.set(i, s), s += i.length;
  }
  return n;
}
function xp(e, t = {}) {
  const n = (s, i) => e(i).update(s).digest(), r = e(void 0);
  return n.outputLen = r.outputLen, n.blockLen = r.blockLen, n.create = (s) => e(s), Object.assign(n, t), Object.freeze(n);
}
function Ys(e = 32) {
  const t = typeof globalThis == "object" ? globalThis.crypto : null;
  if (typeof t?.getRandomValues != "function")
    throw new Error("crypto.getRandomValues must be defined");
  return t.getRandomValues(new Uint8Array(e));
}
const Tp = (e) => ({
  oid: Uint8Array.from([6, 9, 96, 134, 72, 1, 101, 3, 4, 2, e])
});
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const Wo = /* @__PURE__ */ BigInt(0), Ji = /* @__PURE__ */ BigInt(1);
function Ts(e, t = "") {
  if (typeof e != "boolean") {
    const n = t && `"${t}" `;
    throw new Error(n + "expected boolean, got type=" + typeof e);
  }
  return e;
}
function ll(e) {
  if (typeof e == "bigint") {
    if (!Jr(e))
      throw new Error("positive bigint expected, got " + e);
  } else
    bn(e);
  return e;
}
function Hr(e) {
  const t = ll(e).toString(16);
  return t.length & 1 ? "0" + t : t;
}
function fl(e) {
  if (typeof e != "string")
    throw new Error("hex string expected, got " + typeof e);
  return e === "" ? Wo : BigInt("0x" + e);
}
function Zn(e) {
  return fl(qs(e));
}
function dl(e) {
  return fl(qs(Sp(it(e)).reverse()));
}
function Ko(e, t) {
  bn(t), e = ll(e);
  const n = xs(e.toString(16).padStart(t * 2, "0"));
  if (n.length !== t)
    throw new Error("number too large");
  return n;
}
function hl(e, t) {
  return Ko(e, t).reverse();
}
function Sp(e) {
  return Uint8Array.from(e);
}
function vp(e) {
  return Uint8Array.from(e, (t, n) => {
    const r = t.charCodeAt(0);
    if (t.length !== 1 || r > 127)
      throw new Error(`string contains non-ASCII character "${e[n]}" with code ${r} at position ${n}`);
    return r;
  });
}
const Jr = (e) => typeof e == "bigint" && Wo <= e;
function Ap(e, t, n) {
  return Jr(e) && Jr(t) && Jr(n) && t <= e && e < n;
}
function Ip(e, t, n, r) {
  if (!Ap(t, n, r))
    throw new Error("expected valid " + e + ": " + n + " <= n < " + r + ", got " + t);
}
function kp(e) {
  let t;
  for (t = 0; e > Wo; e >>= Ji, t += 1)
    ;
  return t;
}
const zo = (e) => (Ji << BigInt(e)) - Ji;
function Cp(e, t, n) {
  if (bn(e, "hashLen"), bn(t, "qByteLen"), typeof n != "function")
    throw new Error("hmacFn must be a function");
  const r = (g) => new Uint8Array(g), s = Uint8Array.of(), i = Uint8Array.of(0), o = Uint8Array.of(1), a = 1e3;
  let c = r(e), u = r(e), l = 0;
  const f = () => {
    c.fill(1), u.fill(0), l = 0;
  }, h = (...g) => n(u, de(c, ...g)), p = (g = s) => {
    u = h(i, g), c = h(), g.length !== 0 && (u = h(o, g), c = h());
  }, y = () => {
    if (l++ >= a)
      throw new Error("drbg: tried max amount of iterations");
    let g = 0;
    const w = [];
    for (; g < t; ) {
      c = h();
      const A = c.slice();
      w.push(A), g += c.length;
    }
    return de(...w);
  };
  return (g, w) => {
    f(), p(g);
    let A;
    for (; !(A = w(y())); )
      p();
    return f(), A;
  };
}
function jo(e, t = {}, n = {}) {
  if (!e || typeof e != "object")
    throw new Error("expected valid options object");
  function r(i, o, a) {
    const c = e[i];
    if (a && c === void 0)
      return;
    const u = typeof c;
    if (u !== o || c === null)
      throw new Error(`param "${i}" is invalid: expected ${o}, got ${u}`);
  }
  const s = (i, o) => Object.entries(i).forEach(([a, c]) => r(a, c, o));
  s(t, !1), s(n, !0);
}
function Xa(e) {
  const t = /* @__PURE__ */ new WeakMap();
  return (n, ...r) => {
    const s = t.get(n);
    if (s !== void 0)
      return s;
    const i = e(n, ...r);
    return t.set(n, i), i;
  };
}
/*! noble-secp256k1 - MIT License (c) 2019 Paul Miller (paulmillr.com) */
const pl = {
  p: 0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffefffffc2fn,
  n: 0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141n,
  h: 1n,
  a: 0n,
  b: 7n,
  Gx: 0x79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798n,
  Gy: 0x483ada7726a3c4655da4fbfc0e1108a8fd17b448a68554199c47d08ffb10d4b8n
}, { p: Fe, n: Ze, Gx: Op, Gy: Bp, b: gl } = pl, xt = 32, En = 64, Ss = {
  publicKey: xt + 1,
  publicKeyUncompressed: En + 1,
  signature: En,
  seed: xt + xt / 2
}, Np = (...e) => {
  "captureStackTrace" in Error && typeof Error.captureStackTrace == "function" && Error.captureStackTrace(...e);
}, rt = (e = "") => {
  const t = new Error(e);
  throw Np(t, rt), t;
}, Rp = (e) => typeof e == "bigint", $p = (e) => typeof e == "string", Up = (e) => e instanceof Uint8Array || ArrayBuffer.isView(e) && e.constructor.name === "Uint8Array", Lt = (e, t, n = "") => {
  const r = Up(e), s = e?.length, i = t !== void 0;
  if (!r || i && s !== t) {
    const o = n && `"${n}" `, a = i ? ` of length ${t}` : "", c = r ? `length=${s}` : `type=${typeof e}`;
    rt(o + "expected Uint8Array" + a + ", got " + c);
  }
  return e;
}, Xe = (e) => new Uint8Array(e), yl = (e, t) => e.toString(16).padStart(t, "0"), wl = (e) => Array.from(Lt(e)).map((t) => yl(t, 2)).join(""), be = { _0: 48, _9: 57, A: 65, F: 70, a: 97, f: 102 }, Qa = (e) => {
  if (e >= be._0 && e <= be._9)
    return e - be._0;
  if (e >= be.A && e <= be.F)
    return e - (be.A - 10);
  if (e >= be.a && e <= be.f)
    return e - (be.a - 10);
}, ml = (e) => {
  const t = "hex invalid";
  if (!$p(e))
    return rt(t);
  const n = e.length, r = n / 2;
  if (n % 2)
    return rt(t);
  const s = Xe(r);
  for (let i = 0, o = 0; i < r; i++, o += 2) {
    const a = Qa(e.charCodeAt(o)), c = Qa(e.charCodeAt(o + 1));
    if (a === void 0 || c === void 0)
      return rt(t);
    s[i] = a * 16 + c;
  }
  return s;
}, bl = () => globalThis?.crypto, Ja = () => bl()?.subtle ?? rt("crypto.subtle must be defined, consider polyfill"), ye = (...e) => {
  const t = Xe(e.reduce((r, s) => r + Lt(s).length, 0));
  let n = 0;
  return e.forEach((r) => {
    t.set(r, n), n += r.length;
  }), t;
}, Zs = (e = xt) => bl().getRandomValues(Xe(e)), Sr = BigInt, xn = (e, t, n, r = "bad number: out of range") => Rp(e) && t <= e && e < n ? e : rt(r), F = (e, t = Fe) => {
  const n = e % t;
  return n >= 0n ? n : t + n;
}, ve = (e) => F(e, Ze), El = (e, t) => {
  (e === 0n || t <= 0n) && rt("no inverse n=" + e + " mod=" + t);
  let n = F(e, t), r = t, s = 0n, i = 1n;
  for (; n !== 0n; ) {
    const o = r / n, a = r % n, c = s - i * o;
    r = n, n = a, s = i, i = c;
  }
  return r === 1n ? F(s, t) : rt("no inverse");
}, xl = (e) => {
  const t = Qs[e];
  return typeof t != "function" && rt("hashes." + e + " not set"), t;
}, wi = (e) => e instanceof Ct ? e : rt("Point expected"), Tl = (e) => F(F(e * e) * e + gl), tc = (e) => xn(e, 0n, Fe), ts = (e) => xn(e, 1n, Fe), to = (e) => xn(e, 1n, Ze), Mn = (e) => (e & 1n) === 0n, Xs = (e) => Uint8Array.of(e), Pp = (e) => Xs(Mn(e) ? 2 : 3), Sl = (e) => {
  const t = Tl(ts(e));
  let n = 1n;
  for (let r = t, s = (Fe + 1n) / 4n; s > 0n; s >>= 1n)
    s & 1n && (n = n * r % Fe), r = r * r % Fe;
  return F(n * n) === t ? n : rt("sqrt invalid");
};
class Ct {
  static BASE;
  static ZERO;
  X;
  Y;
  Z;
  constructor(t, n, r) {
    this.X = tc(t), this.Y = ts(n), this.Z = tc(r), Object.freeze(this);
  }
  static CURVE() {
    return pl;
  }
  /** Create 3d xyz point from 2d xy. (0, 0) => (0, 1, 0), not (0, 0, 1) */
  static fromAffine(t) {
    const { x: n, y: r } = t;
    return n === 0n && r === 0n ? on : new Ct(n, r, 1n);
  }
  /** Convert Uint8Array or hex string to Point. */
  static fromBytes(t) {
    Lt(t);
    const { publicKey: n, publicKeyUncompressed: r } = Ss;
    let s;
    const i = t.length, o = t[0], a = t.subarray(1), c = Hn(a, 0, xt);
    if (i === n && (o === 2 || o === 3)) {
      let u = Sl(c);
      const l = Mn(u);
      Mn(Sr(o)) !== l && (u = F(-u)), s = new Ct(c, u, 1n);
    }
    return i === r && o === 4 && (s = new Ct(c, Hn(a, xt, En), 1n)), s ? s.assertValidity() : rt("bad point: not on curve");
  }
  static fromHex(t) {
    return Ct.fromBytes(ml(t));
  }
  get x() {
    return this.toAffine().x;
  }
  get y() {
    return this.toAffine().y;
  }
  /** Equality check: compare points P&Q. */
  equals(t) {
    const { X: n, Y: r, Z: s } = this, { X: i, Y: o, Z: a } = wi(t), c = F(n * a), u = F(i * s), l = F(r * a), f = F(o * s);
    return c === u && l === f;
  }
  is0() {
    return this.equals(on);
  }
  /** Flip point over y coordinate. */
  negate() {
    return new Ct(this.X, F(-this.Y), this.Z);
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
    const { X: n, Y: r, Z: s } = this, { X: i, Y: o, Z: a } = wi(t), c = 0n, u = gl;
    let l = 0n, f = 0n, h = 0n;
    const p = F(u * 3n);
    let y = F(n * i), d = F(r * o), g = F(s * a), w = F(n + r), A = F(i + o);
    w = F(w * A), A = F(y + d), w = F(w - A), A = F(n + s);
    let O = F(i + a);
    return A = F(A * O), O = F(y + g), A = F(A - O), O = F(r + s), l = F(o + a), O = F(O * l), l = F(d + g), O = F(O - l), h = F(c * A), l = F(p * g), h = F(l + h), l = F(d - h), h = F(d + h), f = F(l * h), d = F(y + y), d = F(d + y), g = F(c * g), A = F(p * A), d = F(d + g), g = F(y - g), g = F(c * g), A = F(A + g), y = F(d * A), f = F(f + y), y = F(O * A), l = F(w * l), l = F(l - y), y = F(w * d), h = F(O * h), h = F(h + y), new Ct(l, f, h);
  }
  subtract(t) {
    return this.add(wi(t).negate());
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
      return on;
    if (to(t), t === 1n)
      return this;
    if (this.equals(Qe))
      return ag(t).p;
    let r = on, s = Qe;
    for (let i = this; t > 0n; i = i.double(), t >>= 1n)
      t & 1n ? r = r.add(i) : n && (s = s.add(i));
    return r;
  }
  multiplyUnsafe(t) {
    return this.multiply(t, !1);
  }
  /** Convert point to 2d xy affine point. (X, Y, Z) ∋ (x=X/Z, y=Y/Z) */
  toAffine() {
    const { X: t, Y: n, Z: r } = this;
    if (this.equals(on))
      return { x: 0n, y: 0n };
    if (r === 1n)
      return { x: t, y: n };
    const s = El(r, Fe);
    return F(r * s) !== 1n && rt("inverse invalid"), { x: F(t * s), y: F(n * s) };
  }
  /** Checks if the point is valid and on-curve. */
  assertValidity() {
    const { x: t, y: n } = this.toAffine();
    return ts(t), ts(n), F(n * n) === Tl(t) ? this : rt("bad point: not on curve");
  }
  /** Converts point to 33/65-byte Uint8Array. */
  toBytes(t = !0) {
    const { x: n, y: r } = this.assertValidity().toAffine(), s = Mt(n);
    return t ? ye(Pp(r), s) : ye(Xs(4), s, Mt(r));
  }
  toHex(t) {
    return wl(this.toBytes(t));
  }
}
const Qe = new Ct(Op, Bp, 1n), on = new Ct(0n, 1n, 0n);
Ct.BASE = Qe;
Ct.ZERO = on;
const _p = (e, t, n) => Qe.multiply(t, !1).add(e.multiply(n, !1)).assertValidity(), Je = (e) => Sr("0x" + (wl(e) || "0")), Hn = (e, t, n) => Je(e.subarray(t, n)), Lp = 2n ** 256n, Mt = (e) => ml(yl(xn(e, 0n, Lp), En)), vl = (e) => {
  const t = Je(Lt(e, xt, "secret key"));
  return xn(t, 1n, Ze, "invalid secret key: outside of range");
}, Al = (e) => e > Ze >> 1n, Dp = (e) => {
  [0, 1, 2, 3].includes(e) || rt("recovery id must be valid and present");
}, Vp = (e) => {
  e != null && !ec.includes(e) && rt(`Signature format must be one of: ${ec.join(", ")}`), e === kl && rt('Signature format "der" is not supported: switch to noble-curves');
}, Mp = (e, t = Fn) => {
  Vp(t);
  const n = Ss.signature, r = n + 1;
  let s = `Signature format "${t}" expects Uint8Array with length `;
  t === Fn && e.length !== n && rt(s + n), t === As && e.length !== r && rt(s + r);
};
class vs {
  r;
  s;
  recovery;
  constructor(t, n, r) {
    this.r = to(t), this.s = to(n), r != null && (this.recovery = r), Object.freeze(this);
  }
  static fromBytes(t, n = Fn) {
    Mp(t, n);
    let r;
    n === As && (r = t[0], t = t.subarray(1));
    const s = Hn(t, 0, xt), i = Hn(t, xt, En);
    return new vs(s, i, r);
  }
  addRecoveryBit(t) {
    return new vs(this.r, this.s, t);
  }
  hasHighS() {
    return Al(this.s);
  }
  toBytes(t = Fn) {
    const { r: n, s: r, recovery: s } = this, i = ye(Mt(n), Mt(r));
    return t === As ? (Dp(s), ye(Uint8Array.of(s), i)) : i;
  }
}
const Il = (e) => {
  const t = e.length * 8 - 256;
  t > 1024 && rt("msg invalid");
  const n = Je(e);
  return t > 0 ? n >> Sr(t) : n;
}, Hp = (e) => ve(Il(Lt(e))), Fn = "compact", As = "recovered", kl = "der", ec = [Fn, As, kl], nc = {
  lowS: !0,
  prehash: !0,
  format: Fn,
  extraEntropy: !1
}, rc = "SHA-256", Qs = {
  hmacSha256Async: async (e, t) => {
    const n = Ja(), r = "HMAC", s = await n.importKey("raw", e, { name: r, hash: { name: rc } }, !1, ["sign"]);
    return Xe(await n.sign(r, s, t));
  },
  hmacSha256: void 0,
  sha256Async: async (e) => Xe(await Ja().digest(rc, e)),
  sha256: void 0
}, Fp = (e, t, n) => (Lt(e, void 0, "message"), t.prehash ? n ? Qs.sha256Async(e) : xl("sha256")(e) : e), Wp = Xe(0), Kp = Xs(0), zp = Xs(1), jp = 1e3, Gp = "drbg: tried max amount of iterations", qp = async (e, t) => {
  let n = Xe(xt), r = Xe(xt), s = 0;
  const i = () => {
    n.fill(1), r.fill(0);
  }, o = (...l) => Qs.hmacSha256Async(r, ye(n, ...l)), a = async (l = Wp) => {
    r = await o(Kp, l), n = await o(), l.length !== 0 && (r = await o(zp, l), n = await o());
  }, c = async () => (s++ >= jp && rt(Gp), n = await o(), n);
  i(), await a(e);
  let u;
  for (; !(u = t(await c())); )
    await a();
  return i(), u;
}, Yp = (e, t, n, r) => {
  let { lowS: s, extraEntropy: i } = n;
  const o = Mt, a = Hp(e), c = o(a), u = vl(t), l = [o(u), c];
  if (i != null && i !== !1) {
    const y = i === !0 ? Zs(xt) : i;
    l.push(Lt(y, void 0, "extraEntropy"));
  }
  const f = ye(...l), h = a;
  return r(f, (y) => {
    const d = Il(y);
    if (!(1n <= d && d < Ze))
      return;
    const g = El(d, Ze), w = Qe.multiply(d).toAffine(), A = ve(w.x);
    if (A === 0n)
      return;
    const O = ve(g * ve(h + A * u));
    if (O === 0n)
      return;
    let P = (w.x === A ? 0 : 2) | Number(w.y & 1n), V = O;
    return s && Al(O) && (V = ve(-O), P ^= 1), new vs(A, V, P).toBytes(n.format);
  });
}, Zp = (e) => {
  const t = {};
  return Object.keys(nc).forEach((n) => {
    t[n] = e[n] ?? nc[n];
  }), t;
}, Xp = async (e, t, n = {}) => (n = Zp(n), e = await Fp(e, n, !0), Yp(e, t, n, qp)), Qp = (e = Zs(Ss.seed)) => {
  Lt(e), (e.length < Ss.seed || e.length > 1024) && rt("expected 40-1024b");
  const t = F(Je(e), Ze - 1n);
  return Mt(t + 1n);
}, Jp = (e) => (t) => {
  const n = Qp(t);
  return { secretKey: n, publicKey: e(n) };
}, Cl = (e) => Uint8Array.from("BIP0340/" + e, (t) => t.charCodeAt(0)), Ol = "aux", Bl = "nonce", Nl = "challenge", eo = (e, ...t) => {
  const n = xl("sha256"), r = n(Cl(e));
  return n(ye(r, r, ...t));
}, no = async (e, ...t) => {
  const n = Qs.sha256Async, r = await n(Cl(e));
  return await n(ye(r, r, ...t));
}, Go = (e) => {
  const t = vl(e), n = Qe.multiply(t), { x: r, y: s } = n.assertValidity().toAffine(), i = Mn(s) ? t : ve(-t), o = Mt(r);
  return { d: i, px: o };
}, qo = (e) => ve(Je(e)), Rl = (...e) => qo(eo(Nl, ...e)), $l = async (...e) => qo(await no(Nl, ...e)), Ul = (e) => Go(e).px, tg = Jp(Ul), Pl = (e, t, n) => {
  const { px: r, d: s } = Go(t);
  return { m: Lt(e), px: r, d: s, a: Lt(n, xt) };
}, _l = (e) => {
  const t = qo(e);
  t === 0n && rt("sign failed: k is zero");
  const { px: n, d: r } = Go(Mt(t));
  return { rx: n, k: r };
}, Ll = (e, t, n, r) => ye(t, Mt(ve(e + n * r))), Dl = "invalid signature produced", eg = (e, t, n = Zs(xt)) => {
  const { m: r, px: s, d: i, a: o } = Pl(e, t, n), a = eo(Ol, o), c = Mt(i ^ Je(a)), u = eo(Bl, c, s, r), { rx: l, k: f } = _l(u), h = Rl(l, s, r), p = Ll(f, l, h, i);
  return Ml(p, r, s) || rt(Dl), p;
}, ng = async (e, t, n = Zs(xt)) => {
  const { m: r, px: s, d: i, a: o } = Pl(e, t, n), a = await no(Ol, o), c = Mt(i ^ Je(a)), u = await no(Bl, c, s, r), { rx: l, k: f } = _l(u), h = await $l(l, s, r), p = Ll(f, l, h, i);
  return await Hl(p, r, s) || rt(Dl), p;
}, rg = (e, t) => e instanceof Promise ? e.then(t) : t(e), Vl = (e, t, n, r) => {
  const s = Lt(e, En, "signature"), i = Lt(t, void 0, "message"), o = Lt(n, xt, "publicKey");
  try {
    const a = Je(o), c = Sl(a), u = Mn(c) ? c : F(-c), l = new Ct(a, u, 1n).assertValidity(), f = Mt(l.toAffine().x), h = Hn(s, 0, xt);
    xn(h, 1n, Fe);
    const p = Hn(s, xt, En);
    xn(p, 1n, Ze);
    const y = ye(Mt(h), f, i);
    return rg(r(y), (d) => {
      const { x: g, y: w } = _p(l, p, ve(-d)).toAffine();
      return !(!Mn(w) || g !== h);
    });
  } catch {
    return !1;
  }
}, Ml = (e, t, n) => Vl(e, t, n, Rl), Hl = async (e, t, n) => Vl(e, t, n, $l), sg = {
  keygen: tg,
  getPublicKey: Ul,
  sign: eg,
  verify: Ml,
  signAsync: ng,
  verifyAsync: Hl
}, Is = 8, ig = 256, Fl = Math.ceil(ig / Is) + 1, ro = 2 ** (Is - 1), og = () => {
  const e = [];
  let t = Qe, n = t;
  for (let r = 0; r < Fl; r++) {
    n = t, e.push(n);
    for (let s = 1; s < ro; s++)
      n = n.add(t), e.push(n);
    t = n.double();
  }
  return e;
};
let sc;
const ic = (e, t) => {
  const n = t.negate();
  return e ? n : t;
}, ag = (e) => {
  const t = sc || (sc = og());
  let n = on, r = Qe;
  const s = 2 ** Is, i = s, o = Sr(s - 1), a = Sr(Is);
  for (let c = 0; c < Fl; c++) {
    let u = Number(e & o);
    e >>= a, u > ro && (u -= i, e += 1n);
    const l = c * ro, f = l, h = l + Math.abs(u) - 1, p = c % 2 !== 0, y = u < 0;
    u === 0 ? r = r.add(ic(p, t[f])) : n = n.add(ic(y, t[h]));
  }
  return e !== 0n && rt("invalid wnaf"), { p: n, f: r };
};
function cg(e, t, n) {
  return e & t ^ ~e & n;
}
function ug(e, t, n) {
  return e & t ^ e & n ^ t & n;
}
class lg {
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
  constructor(t, n, r, s) {
    this.blockLen = t, this.outputLen = n, this.padOffset = r, this.isLE = s, this.buffer = new Uint8Array(t), this.view = yi(this.buffer);
  }
  update(t) {
    bs(this), it(t);
    const { view: n, buffer: r, blockLen: s } = this, i = t.length;
    for (let o = 0; o < i; ) {
      const a = Math.min(s - this.pos, i - o);
      if (a === s) {
        const c = yi(t);
        for (; s <= i - o; o += s)
          this.process(c, o);
        continue;
      }
      r.set(t.subarray(o, o + a), this.pos), this.pos += a, o += a, this.pos === s && (this.process(n, 0), this.pos = 0);
    }
    return this.length += t.length, this.roundClean(), this;
  }
  digestInto(t) {
    bs(this), bp(t, this), this.finished = !0;
    const { buffer: n, view: r, blockLen: s, isLE: i } = this;
    let { pos: o } = this;
    n[o++] = 128, Es(this.buffer.subarray(o)), this.padOffset > s - o && (this.process(r, 0), o = 0);
    for (let f = o; f < s; f++)
      n[f] = 0;
    r.setBigUint64(s - 8, BigInt(this.length * 8), i), this.process(r, 0);
    const a = yi(t), c = this.outputLen;
    if (c % 4)
      throw new Error("_sha2: outputLen must be aligned to 32bit");
    const u = c / 4, l = this.get();
    if (u > l.length)
      throw new Error("_sha2: outputLen bigger than state");
    for (let f = 0; f < u; f++)
      a.setUint32(4 * f, l[f], i);
  }
  digest() {
    const { buffer: t, outputLen: n } = this;
    this.digestInto(t);
    const r = t.slice(0, n);
    return this.destroy(), r;
  }
  _cloneInto(t) {
    t ||= new this.constructor(), t.set(...this.get());
    const { blockLen: n, buffer: r, length: s, finished: i, destroyed: o, pos: a } = this;
    return t.destroyed = o, t.finished = i, t.length = s, t.pos = a, s % n && t.buffer.set(r), t;
  }
  clone() {
    return this._cloneInto();
  }
}
const $e = /* @__PURE__ */ Uint32Array.from([
  1779033703,
  3144134277,
  1013904242,
  2773480762,
  1359893119,
  2600822924,
  528734635,
  1541459225
]), fg = /* @__PURE__ */ Uint32Array.from([
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
]), Ue = /* @__PURE__ */ new Uint32Array(64);
class dg extends lg {
  constructor(t) {
    super(64, t, 8, !1);
  }
  get() {
    const { A: t, B: n, C: r, D: s, E: i, F: o, G: a, H: c } = this;
    return [t, n, r, s, i, o, a, c];
  }
  // prettier-ignore
  set(t, n, r, s, i, o, a, c) {
    this.A = t | 0, this.B = n | 0, this.C = r | 0, this.D = s | 0, this.E = i | 0, this.F = o | 0, this.G = a | 0, this.H = c | 0;
  }
  process(t, n) {
    for (let f = 0; f < 16; f++, n += 4)
      Ue[f] = t.getUint32(n, !1);
    for (let f = 16; f < 64; f++) {
      const h = Ue[f - 15], p = Ue[f - 2], y = oe(h, 7) ^ oe(h, 18) ^ h >>> 3, d = oe(p, 17) ^ oe(p, 19) ^ p >>> 10;
      Ue[f] = d + Ue[f - 7] + y + Ue[f - 16] | 0;
    }
    let { A: r, B: s, C: i, D: o, E: a, F: c, G: u, H: l } = this;
    for (let f = 0; f < 64; f++) {
      const h = oe(a, 6) ^ oe(a, 11) ^ oe(a, 25), p = l + h + cg(a, c, u) + fg[f] + Ue[f] | 0, d = (oe(r, 2) ^ oe(r, 13) ^ oe(r, 22)) + ug(r, s, i) | 0;
      l = u, u = c, c = a, a = o + p | 0, o = i, i = s, s = r, r = p + d | 0;
    }
    r = r + this.A | 0, s = s + this.B | 0, i = i + this.C | 0, o = o + this.D | 0, a = a + this.E | 0, c = c + this.F | 0, u = u + this.G | 0, l = l + this.H | 0, this.set(r, s, i, o, a, c, u, l);
  }
  roundClean() {
    Es(Ue);
  }
  destroy() {
    this.set(0, 0, 0, 0, 0, 0, 0, 0), Es(this.buffer);
  }
}
class hg extends dg {
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
}
const so = /* @__PURE__ */ xp(
  () => new hg(),
  /* @__PURE__ */ Tp(1)
);
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const Bt = /* @__PURE__ */ BigInt(0), It = /* @__PURE__ */ BigInt(1), dn = /* @__PURE__ */ BigInt(2), Wl = /* @__PURE__ */ BigInt(3), Kl = /* @__PURE__ */ BigInt(4), zl = /* @__PURE__ */ BigInt(5), pg = /* @__PURE__ */ BigInt(7), jl = /* @__PURE__ */ BigInt(8), gg = /* @__PURE__ */ BigInt(9), Gl = /* @__PURE__ */ BigInt(16);
function Zt(e, t) {
  const n = e % t;
  return n >= Bt ? n : t + n;
}
function Ft(e, t, n) {
  let r = e;
  for (; t-- > Bt; )
    r *= r, r %= n;
  return r;
}
function oc(e, t) {
  if (e === Bt)
    throw new Error("invert: expected non-zero number");
  if (t <= Bt)
    throw new Error("invert: expected positive modulus, got " + t);
  let n = Zt(e, t), r = t, s = Bt, i = It;
  for (; n !== Bt; ) {
    const a = r / n, c = r % n, u = s - i * a;
    r = n, n = c, s = i, i = u;
  }
  if (r !== It)
    throw new Error("invert: does not exist");
  return Zt(s, t);
}
function Yo(e, t, n) {
  if (!e.eql(e.sqr(t), n))
    throw new Error("Cannot find square root");
}
function ql(e, t) {
  const n = (e.ORDER + It) / Kl, r = e.pow(t, n);
  return Yo(e, r, t), r;
}
function yg(e, t) {
  const n = (e.ORDER - zl) / jl, r = e.mul(t, dn), s = e.pow(r, n), i = e.mul(t, s), o = e.mul(e.mul(i, dn), s), a = e.mul(i, e.sub(o, e.ONE));
  return Yo(e, a, t), a;
}
function wg(e) {
  const t = Js(e), n = Yl(e), r = n(t, t.neg(t.ONE)), s = n(t, r), i = n(t, t.neg(r)), o = (e + pg) / Gl;
  return (a, c) => {
    let u = a.pow(c, o), l = a.mul(u, r);
    const f = a.mul(u, s), h = a.mul(u, i), p = a.eql(a.sqr(l), c), y = a.eql(a.sqr(f), c);
    u = a.cmov(u, l, p), l = a.cmov(h, f, y);
    const d = a.eql(a.sqr(l), c), g = a.cmov(u, l, d);
    return Yo(a, g, c), g;
  };
}
function Yl(e) {
  if (e < Wl)
    throw new Error("sqrt is not defined for small field");
  let t = e - It, n = 0;
  for (; t % dn === Bt; )
    t /= dn, n++;
  let r = dn;
  const s = Js(e);
  for (; ac(s, r) === 1; )
    if (r++ > 1e3)
      throw new Error("Cannot find square root: probably non-prime P");
  if (n === 1)
    return ql;
  let i = s.pow(r, t);
  const o = (t + It) / dn;
  return function(c, u) {
    if (c.is0(u))
      return u;
    if (ac(c, u) !== 1)
      throw new Error("Cannot find square root");
    let l = n, f = c.mul(c.ONE, i), h = c.pow(u, t), p = c.pow(u, o);
    for (; !c.eql(h, c.ONE); ) {
      if (c.is0(h))
        return c.ZERO;
      let y = 1, d = c.sqr(h);
      for (; !c.eql(d, c.ONE); )
        if (y++, d = c.sqr(d), y === l)
          throw new Error("Cannot find square root");
      const g = It << BigInt(l - y - 1), w = c.pow(f, g);
      l = y, f = c.sqr(w), h = c.mul(h, f), p = c.mul(p, w);
    }
    return p;
  };
}
function mg(e) {
  return e % Kl === Wl ? ql : e % jl === zl ? yg : e % Gl === gg ? wg(e) : Yl(e);
}
const bg = [
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
function Eg(e) {
  const t = {
    ORDER: "bigint",
    BYTES: "number",
    BITS: "number"
  }, n = bg.reduce((r, s) => (r[s] = "function", r), t);
  return jo(e, n), e;
}
function xg(e, t, n) {
  if (n < Bt)
    throw new Error("invalid exponent, negatives unsupported");
  if (n === Bt)
    return e.ONE;
  if (n === It)
    return t;
  let r = e.ONE, s = t;
  for (; n > Bt; )
    n & It && (r = e.mul(r, s)), s = e.sqr(s), n >>= It;
  return r;
}
function Zl(e, t, n = !1) {
  const r = new Array(t.length).fill(n ? e.ZERO : void 0), s = t.reduce((o, a, c) => e.is0(a) ? o : (r[c] = o, e.mul(o, a)), e.ONE), i = e.inv(s);
  return t.reduceRight((o, a, c) => e.is0(a) ? o : (r[c] = e.mul(o, r[c]), e.mul(o, a)), i), r;
}
function ac(e, t) {
  const n = (e.ORDER - It) / dn, r = e.pow(t, n), s = e.eql(r, e.ONE), i = e.eql(r, e.ZERO), o = e.eql(r, e.neg(e.ONE));
  if (!s && !i && !o)
    throw new Error("invalid Legendre symbol result");
  return s ? 1 : i ? 0 : -1;
}
function Tg(e, t) {
  t !== void 0 && bn(t);
  const n = t !== void 0 ? t : e.toString(2).length, r = Math.ceil(n / 8);
  return { nBitLength: n, nByteLength: r };
}
class Sg {
  ORDER;
  BITS;
  BYTES;
  isLE;
  ZERO = Bt;
  ONE = It;
  _lengths;
  _sqrt;
  // cached sqrt
  _mod;
  constructor(t, n = {}) {
    if (t <= Bt)
      throw new Error("invalid field: expected ORDER > 0, got " + t);
    let r;
    this.isLE = !1, n != null && typeof n == "object" && (typeof n.BITS == "number" && (r = n.BITS), typeof n.sqrt == "function" && (this.sqrt = n.sqrt), typeof n.isLE == "boolean" && (this.isLE = n.isLE), n.allowedLengths && (this._lengths = n.allowedLengths?.slice()), typeof n.modFromBytes == "boolean" && (this._mod = n.modFromBytes));
    const { nBitLength: s, nByteLength: i } = Tg(t, r);
    if (i > 2048)
      throw new Error("invalid field: expected ORDER of <= 2048 bytes");
    this.ORDER = t, this.BITS = s, this.BYTES = i, this._sqrt = void 0, Object.preventExtensions(this);
  }
  create(t) {
    return Zt(t, this.ORDER);
  }
  isValid(t) {
    if (typeof t != "bigint")
      throw new Error("invalid field element: expected bigint, got " + typeof t);
    return Bt <= t && t < this.ORDER;
  }
  is0(t) {
    return t === Bt;
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
    return xg(this, t, n);
  }
  div(t, n) {
    return Zt(t * oc(n, this.ORDER), this.ORDER);
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
    return oc(t, this.ORDER);
  }
  sqrt(t) {
    return this._sqrt || (this._sqrt = mg(this.ORDER)), this._sqrt(this, t);
  }
  toBytes(t) {
    return this.isLE ? hl(t, this.BYTES) : Ko(t, this.BYTES);
  }
  fromBytes(t, n = !1) {
    it(t);
    const { _lengths: r, BYTES: s, isLE: i, ORDER: o, _mod: a } = this;
    if (r) {
      if (!r.includes(t.length) || t.length > s)
        throw new Error("Field.fromBytes: expected " + r + " bytes, got " + t.length);
      const u = new Uint8Array(s);
      u.set(t, i ? 0 : u.length - t.length), t = u;
    }
    if (t.length !== s)
      throw new Error("Field.fromBytes: expected " + s + " bytes, got " + t.length);
    let c = i ? dl(t) : Zn(t);
    if (a && (c = Zt(c, o)), !n && !this.isValid(c))
      throw new Error("invalid field element: outside of range 0..ORDER");
    return c;
  }
  // TODO: we don't need it here, move out to separate fn
  invertBatch(t) {
    return Zl(this, t);
  }
  // We can't move this out because Fp6, Fp12 implement it
  // and it's unclear what to return in there.
  cmov(t, n, r) {
    return r ? n : t;
  }
}
function Js(e, t = {}) {
  return new Sg(e, t);
}
function Xl(e) {
  if (typeof e != "bigint")
    throw new Error("field order must be bigint");
  const t = e.toString(2).length;
  return Math.ceil(t / 8);
}
function Ql(e) {
  const t = Xl(e);
  return t + Math.ceil(t / 2);
}
function Jl(e, t, n = !1) {
  it(e);
  const r = e.length, s = Xl(t), i = Ql(t);
  if (r < 16 || r < i || r > 1024)
    throw new Error("expected " + i + "-1024 bytes of input, got " + r);
  const o = n ? dl(e) : Zn(e), a = Zt(o, t - It) + It;
  return n ? hl(a, s) : Ko(a, s);
}
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const Wn = /* @__PURE__ */ BigInt(0), hn = /* @__PURE__ */ BigInt(1);
function ks(e, t) {
  const n = t.negate();
  return e ? n : t;
}
function cc(e, t) {
  const n = Zl(e.Fp, t.map((r) => r.Z));
  return t.map((r, s) => e.fromAffine(r.toAffine(n[s])));
}
function tf(e, t) {
  if (!Number.isSafeInteger(e) || e <= 0 || e > t)
    throw new Error("invalid window size, expected [1.." + t + "], got W=" + e);
}
function mi(e, t) {
  tf(e, t);
  const n = Math.ceil(t / e) + 1, r = 2 ** (e - 1), s = 2 ** e, i = zo(e), o = BigInt(e);
  return { windows: n, windowSize: r, mask: i, maxNumber: s, shiftBy: o };
}
function uc(e, t, n) {
  const { windowSize: r, mask: s, maxNumber: i, shiftBy: o } = n;
  let a = Number(e & s), c = e >> o;
  a > r && (a -= i, c += hn);
  const u = t * r, l = u + Math.abs(a) - 1, f = a === 0, h = a < 0, p = t % 2 !== 0;
  return { nextN: c, offset: l, isZero: f, isNeg: h, isNegF: p, offsetF: u };
}
const bi = /* @__PURE__ */ new WeakMap(), ef = /* @__PURE__ */ new WeakMap();
function Ei(e) {
  return ef.get(e) || 1;
}
function lc(e) {
  if (e !== Wn)
    throw new Error("invalid wNAF");
}
class vg {
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
    let s = t;
    for (; n > Wn; )
      n & hn && (r = r.add(s)), s = s.double(), n >>= hn;
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
    const { windows: r, windowSize: s } = mi(n, this.bits), i = [];
    let o = t, a = o;
    for (let c = 0; c < r; c++) {
      a = o, i.push(a);
      for (let u = 1; u < s; u++)
        a = a.add(o), i.push(a);
      o = a.double();
    }
    return i;
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
    let s = this.ZERO, i = this.BASE;
    const o = mi(t, this.bits);
    for (let a = 0; a < o.windows; a++) {
      const { nextN: c, offset: u, isZero: l, isNeg: f, isNegF: h, offsetF: p } = uc(r, a, o);
      r = c, l ? i = i.add(ks(h, n[p])) : s = s.add(ks(f, n[u]));
    }
    return lc(r), { p: s, f: i };
  }
  /**
   * Implements ec unsafe (non const-time) multiplication using precomputed tables and w-ary non-adjacent form.
   * @param acc accumulator point to add result of multiplication
   * @returns point
   */
  wNAFUnsafe(t, n, r, s = this.ZERO) {
    const i = mi(t, this.bits);
    for (let o = 0; o < i.windows && r !== Wn; o++) {
      const { nextN: a, offset: c, isZero: u, isNeg: l } = uc(r, o, i);
      if (r = a, !u) {
        const f = n[c];
        s = s.add(l ? f.negate() : f);
      }
    }
    return lc(r), s;
  }
  getPrecomputes(t, n, r) {
    let s = bi.get(n);
    return s || (s = this.precomputeWindow(n, t), t !== 1 && (typeof r == "function" && (s = r(s)), bi.set(n, s))), s;
  }
  cached(t, n, r) {
    const s = Ei(t);
    return this.wNAF(s, this.getPrecomputes(s, t, r), n);
  }
  unsafe(t, n, r, s) {
    const i = Ei(t);
    return i === 1 ? this._unsafeLadder(t, n, s) : this.wNAFUnsafe(i, this.getPrecomputes(i, t, r), n, s);
  }
  // We calculate precomputes for elliptic curve point multiplication
  // using windowed method. This specifies window size and
  // stores precomputed values. Usually only base point would be precomputed.
  createCache(t, n) {
    tf(n, this.bits), ef.set(t, n), bi.delete(t);
  }
  hasCache(t) {
    return Ei(t) !== 1;
  }
}
function Ag(e, t, n, r) {
  let s = t, i = e.ZERO, o = e.ZERO;
  for (; n > Wn || r > Wn; )
    n & hn && (i = i.add(s)), r & hn && (o = o.add(s)), s = s.double(), n >>= hn, r >>= hn;
  return { p1: i, p2: o };
}
function fc(e, t, n) {
  if (t) {
    if (t.ORDER !== e)
      throw new Error("Field.ORDER must match order: Fp == p, Fn == n");
    return Eg(t), t;
  } else
    return Js(e, { isLE: n });
}
function Ig(e, t, n = {}, r) {
  if (r === void 0 && (r = e === "edwards"), !t || typeof t != "object")
    throw new Error(`expected valid ${e} CURVE object`);
  for (const c of ["p", "n", "h"]) {
    const u = t[c];
    if (!(typeof u == "bigint" && u > Wn))
      throw new Error(`CURVE.${c} must be positive bigint`);
  }
  const s = fc(t.p, n.Fp, r), i = fc(t.n, n.Fn, r), a = ["Gx", "Gy", "a", "b"];
  for (const c of a)
    if (!s.isValid(t[c]))
      throw new Error(`CURVE.${c} must be valid field element of CURVE.Fp`);
  return t = Object.freeze(Object.assign({}, t)), { CURVE: t, Fp: s, Fn: i };
}
function nf(e, t) {
  return function(r) {
    const s = e(r);
    return { secretKey: s, publicKey: t(s) };
  };
}
class rf {
  oHash;
  iHash;
  blockLen;
  outputLen;
  finished = !1;
  destroyed = !1;
  constructor(t, n) {
    if (cl(t), it(n, void 0, "key"), this.iHash = t.create(), typeof this.iHash.update != "function")
      throw new Error("Expected instance of class which extends utils.Hash");
    this.blockLen = this.iHash.blockLen, this.outputLen = this.iHash.outputLen;
    const r = this.blockLen, s = new Uint8Array(r);
    s.set(n.length > r ? t.create().update(n).digest() : n);
    for (let i = 0; i < s.length; i++)
      s[i] ^= 54;
    this.iHash.update(s), this.oHash = t.create();
    for (let i = 0; i < s.length; i++)
      s[i] ^= 106;
    this.oHash.update(s), Es(s);
  }
  update(t) {
    return bs(this), this.iHash.update(t), this;
  }
  digestInto(t) {
    bs(this), it(t, this.outputLen, "output"), this.finished = !0, this.iHash.digestInto(t), this.oHash.update(t), this.oHash.digestInto(t), this.destroy();
  }
  digest() {
    const t = new Uint8Array(this.oHash.outputLen);
    return this.digestInto(t), t;
  }
  _cloneInto(t) {
    t ||= Object.create(Object.getPrototypeOf(this), {});
    const { oHash: n, iHash: r, finished: s, destroyed: i, blockLen: o, outputLen: a } = this;
    return t = t, t.finished = s, t.destroyed = i, t.blockLen = o, t.outputLen = a, t.oHash = n._cloneInto(t.oHash), t.iHash = r._cloneInto(t.iHash), t;
  }
  clone() {
    return this._cloneInto();
  }
  destroy() {
    this.destroyed = !0, this.oHash.destroy(), this.iHash.destroy();
  }
}
const sf = (e, t, n) => new rf(e, t).update(n).digest();
sf.create = (e, t) => new rf(e, t);
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const dc = (e, t) => (e + (e >= 0 ? t : -t) / of) / t;
function kg(e, t, n) {
  const [[r, s], [i, o]] = t, a = dc(o * e, n), c = dc(-s * e, n);
  let u = e - a * r - c * i, l = -a * s - c * o;
  const f = u < Ae, h = l < Ae;
  f && (u = -u), h && (l = -l);
  const p = zo(Math.ceil(kp(n) / 2)) + Rn;
  if (u < Ae || u >= p || l < Ae || l >= p)
    throw new Error("splitScalar (endomorphism): failed, k=" + e);
  return { k1neg: f, k1: u, k2neg: h, k2: l };
}
function io(e) {
  if (!["compact", "recovered", "der"].includes(e))
    throw new Error('Signature format must be "compact", "recovered", or "der"');
  return e;
}
function xi(e, t) {
  const n = {};
  for (let r of Object.keys(t))
    n[r] = e[r] === void 0 ? t[r] : e[r];
  return Ts(n.lowS, "lowS"), Ts(n.prehash, "prehash"), n.format !== void 0 && io(n.format), n;
}
class Cg extends Error {
  constructor(t = "") {
    super(t);
  }
}
const _e = {
  // asn.1 DER encoding utils
  Err: Cg,
  // Basic building block is TLV (Tag-Length-Value)
  _tlv: {
    encode: (e, t) => {
      const { Err: n } = _e;
      if (e < 0 || e > 256)
        throw new n("tlv.encode: wrong tag");
      if (t.length & 1)
        throw new n("tlv.encode: unpadded data");
      const r = t.length / 2, s = Hr(r);
      if (s.length / 2 & 128)
        throw new n("tlv.encode: long form length too big");
      const i = r > 127 ? Hr(s.length / 2 | 128) : "";
      return Hr(e) + i + s + t;
    },
    // v - value, l - left bytes (unparsed)
    decode(e, t) {
      const { Err: n } = _e;
      let r = 0;
      if (e < 0 || e > 256)
        throw new n("tlv.encode: wrong tag");
      if (t.length < 2 || t[r++] !== e)
        throw new n("tlv.decode: wrong tlv");
      const s = t[r++], i = !!(s & 128);
      let o = 0;
      if (!i)
        o = s;
      else {
        const c = s & 127;
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
      if (e < Ae)
        throw new t("integer: negative integers are not allowed");
      let n = Hr(e);
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
      return Zn(e);
    }
  },
  toSig(e) {
    const { Err: t, _int: n, _tlv: r } = _e, s = it(e, void 0, "signature"), { v: i, l: o } = r.decode(48, s);
    if (o.length)
      throw new t("invalid signature: left bytes after parsing");
    const { v: a, l: c } = r.decode(2, i), { v: u, l } = r.decode(2, c);
    if (l.length)
      throw new t("invalid signature: left bytes after parsing");
    return { r: n.decode(a), s: n.decode(u) };
  },
  hexFromSig(e) {
    const { _tlv: t, _int: n } = _e, r = t.encode(2, n.encode(e.r)), s = t.encode(2, n.encode(e.s)), i = r + s;
    return t.encode(48, i);
  }
}, Ae = BigInt(0), Rn = BigInt(1), of = BigInt(2), Fr = BigInt(3), Og = BigInt(4);
function Bg(e, t = {}) {
  const n = Ig("weierstrass", e, t), { Fp: r, Fn: s } = n;
  let i = n.CURVE;
  const { h: o, n: a } = i;
  jo(t, {}, {
    allowInfinityPoint: "boolean",
    clearCofactor: "function",
    isTorsionFree: "function",
    fromBytes: "function",
    toBytes: "function",
    endo: "object"
  });
  const { endo: c } = t;
  if (c && (!r.is0(i.a) || typeof c.beta != "bigint" || !Array.isArray(c.basises)))
    throw new Error('invalid endo: expected "beta": bigint and "basises": array');
  const u = cf(r, s);
  function l() {
    if (!r.isOdd)
      throw new Error("compression is not supported: Field does not have .isOdd()");
  }
  function f(M, x, E) {
    const { x: m, y: S } = x.toAffine(), C = r.toBytes(m);
    if (Ts(E, "isCompressed"), E) {
      l();
      const N = !r.isOdd(S);
      return de(af(N), C);
    } else
      return de(Uint8Array.of(4), C, r.toBytes(S));
  }
  function h(M) {
    it(M, void 0, "Point");
    const { publicKey: x, publicKeyUncompressed: E } = u, m = M.length, S = M[0], C = M.subarray(1);
    if (m === x && (S === 2 || S === 3)) {
      const N = r.fromBytes(C);
      if (!r.isValid(N))
        throw new Error("bad point: is not on curve, wrong x");
      const B = d(N);
      let k;
      try {
        k = r.sqrt(B);
      } catch (q) {
        const W = q instanceof Error ? ": " + q.message : "";
        throw new Error("bad point: is not on curve, sqrt error" + W);
      }
      l();
      const R = r.isOdd(k);
      return (S & 1) === 1 !== R && (k = r.neg(k)), { x: N, y: k };
    } else if (m === E && S === 4) {
      const N = r.BYTES, B = r.fromBytes(C.subarray(0, N)), k = r.fromBytes(C.subarray(N, N * 2));
      if (!g(B, k))
        throw new Error("bad point: is not on curve");
      return { x: B, y: k };
    } else
      throw new Error(`bad point: got length ${m}, expected compressed=${x} or uncompressed=${E}`);
  }
  const p = t.toBytes || f, y = t.fromBytes || h;
  function d(M) {
    const x = r.sqr(M), E = r.mul(x, M);
    return r.add(r.add(E, r.mul(M, i.a)), i.b);
  }
  function g(M, x) {
    const E = r.sqr(x), m = d(M);
    return r.eql(E, m);
  }
  if (!g(i.Gx, i.Gy))
    throw new Error("bad curve params: generator point");
  const w = r.mul(r.pow(i.a, Fr), Og), A = r.mul(r.sqr(i.b), BigInt(27));
  if (r.is0(r.add(w, A)))
    throw new Error("bad curve params: a or b");
  function O(M, x, E = !1) {
    if (!r.isValid(x) || E && r.is0(x))
      throw new Error(`bad point coordinate ${M}`);
    return x;
  }
  function P(M) {
    if (!(M instanceof L))
      throw new Error("Weierstrass Point expected");
  }
  function V(M) {
    if (!c || !c.basises)
      throw new Error("no endo");
    return kg(M, c.basises, s.ORDER);
  }
  const Y = Xa((M, x) => {
    const { X: E, Y: m, Z: S } = M;
    if (r.eql(S, r.ONE))
      return { x: E, y: m };
    const C = M.is0();
    x == null && (x = C ? r.ONE : r.inv(S));
    const N = r.mul(E, x), B = r.mul(m, x), k = r.mul(S, x);
    if (C)
      return { x: r.ZERO, y: r.ZERO };
    if (!r.eql(k, r.ONE))
      throw new Error("invZ was invalid");
    return { x: N, y: B };
  }), T = Xa((M) => {
    if (M.is0()) {
      if (t.allowInfinityPoint && !r.is0(M.Y))
        return;
      throw new Error("bad point: ZERO");
    }
    const { x, y: E } = M.toAffine();
    if (!r.isValid(x) || !r.isValid(E))
      throw new Error("bad point: x or y not field elements");
    if (!g(x, E))
      throw new Error("bad point: equation left != right");
    if (!M.isTorsionFree())
      throw new Error("bad point: not in prime-order subgroup");
    return !0;
  });
  function et(M, x, E, m, S) {
    return E = new L(r.mul(E.X, M), E.Y, E.Z), x = ks(m, x), E = ks(S, E), x.add(E);
  }
  class L {
    // base / generator point
    static BASE = new L(i.Gx, i.Gy, r.ONE);
    // zero / infinity / identity point
    static ZERO = new L(r.ZERO, r.ONE, r.ZERO);
    // 0, 1, 0
    // math field
    static Fp = r;
    // scalar field
    static Fn = s;
    X;
    Y;
    Z;
    /** Does NOT validate if the point is valid. Use `.assertValidity()`. */
    constructor(x, E, m) {
      this.X = O("x", x), this.Y = O("y", E, !0), this.Z = O("z", m), Object.freeze(this);
    }
    static CURVE() {
      return i;
    }
    /** Does NOT validate if the point is valid. Use `.assertValidity()`. */
    static fromAffine(x) {
      const { x: E, y: m } = x || {};
      if (!x || !r.isValid(E) || !r.isValid(m))
        throw new Error("invalid affine point");
      if (x instanceof L)
        throw new Error("projective point not allowed");
      return r.is0(E) && r.is0(m) ? L.ZERO : new L(E, m, r.ONE);
    }
    static fromBytes(x) {
      const E = L.fromAffine(y(it(x, void 0, "point")));
      return E.assertValidity(), E;
    }
    static fromHex(x) {
      return L.fromBytes(xs(x));
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
    precompute(x = 8, E = !0) {
      return lt.createCache(this, x), E || this.multiply(Fr), this;
    }
    // TODO: return `this`
    /** A point on curve is valid if it conforms to equation. */
    assertValidity() {
      T(this);
    }
    hasEvenY() {
      const { y: x } = this.toAffine();
      if (!r.isOdd)
        throw new Error("Field doesn't support isOdd");
      return !r.isOdd(x);
    }
    /** Compare one point to another. */
    equals(x) {
      P(x);
      const { X: E, Y: m, Z: S } = this, { X: C, Y: N, Z: B } = x, k = r.eql(r.mul(E, B), r.mul(C, S)), R = r.eql(r.mul(m, B), r.mul(N, S));
      return k && R;
    }
    /** Flips point to one corresponding to (x, -y) in Affine coordinates. */
    negate() {
      return new L(this.X, r.neg(this.Y), this.Z);
    }
    // Renes-Costello-Batina exception-free doubling formula.
    // There is 30% faster Jacobian formula, but it is not complete.
    // https://eprint.iacr.org/2015/1060, algorithm 3
    // Cost: 8M + 3S + 3*a + 2*b3 + 15add.
    double() {
      const { a: x, b: E } = i, m = r.mul(E, Fr), { X: S, Y: C, Z: N } = this;
      let B = r.ZERO, k = r.ZERO, R = r.ZERO, _ = r.mul(S, S), q = r.mul(C, C), W = r.mul(N, N), D = r.mul(S, C);
      return D = r.add(D, D), R = r.mul(S, N), R = r.add(R, R), B = r.mul(x, R), k = r.mul(m, W), k = r.add(B, k), B = r.sub(q, k), k = r.add(q, k), k = r.mul(B, k), B = r.mul(D, B), R = r.mul(m, R), W = r.mul(x, W), D = r.sub(_, W), D = r.mul(x, D), D = r.add(D, R), R = r.add(_, _), _ = r.add(R, _), _ = r.add(_, W), _ = r.mul(_, D), k = r.add(k, _), W = r.mul(C, N), W = r.add(W, W), _ = r.mul(W, D), B = r.sub(B, _), R = r.mul(W, q), R = r.add(R, R), R = r.add(R, R), new L(B, k, R);
    }
    // Renes-Costello-Batina exception-free addition formula.
    // There is 30% faster Jacobian formula, but it is not complete.
    // https://eprint.iacr.org/2015/1060, algorithm 1
    // Cost: 12M + 0S + 3*a + 3*b3 + 23add.
    add(x) {
      P(x);
      const { X: E, Y: m, Z: S } = this, { X: C, Y: N, Z: B } = x;
      let k = r.ZERO, R = r.ZERO, _ = r.ZERO;
      const q = i.a, W = r.mul(i.b, Fr);
      let D = r.mul(E, C), K = r.mul(m, N), Z = r.mul(S, B), ft = r.add(E, m), z = r.add(C, N);
      ft = r.mul(ft, z), z = r.add(D, K), ft = r.sub(ft, z), z = r.add(E, S);
      let J = r.add(C, B);
      return z = r.mul(z, J), J = r.add(D, Z), z = r.sub(z, J), J = r.add(m, S), k = r.add(N, B), J = r.mul(J, k), k = r.add(K, Z), J = r.sub(J, k), _ = r.mul(q, z), k = r.mul(W, Z), _ = r.add(k, _), k = r.sub(K, _), _ = r.add(K, _), R = r.mul(k, _), K = r.add(D, D), K = r.add(K, D), Z = r.mul(q, Z), z = r.mul(W, z), K = r.add(K, Z), Z = r.sub(D, Z), Z = r.mul(q, Z), z = r.add(z, Z), D = r.mul(K, z), R = r.add(R, D), D = r.mul(J, z), k = r.mul(ft, k), k = r.sub(k, D), D = r.mul(ft, K), _ = r.mul(J, _), _ = r.add(_, D), new L(k, R, _);
    }
    subtract(x) {
      return this.add(x.negate());
    }
    is0() {
      return this.equals(L.ZERO);
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
      const { endo: E } = t;
      if (!s.isValidNot0(x))
        throw new Error("invalid scalar: out of range");
      let m, S;
      const C = (N) => lt.cached(this, N, (B) => cc(L, B));
      if (E) {
        const { k1neg: N, k1: B, k2neg: k, k2: R } = V(x), { p: _, f: q } = C(B), { p: W, f: D } = C(R);
        S = q.add(D), m = et(E.beta, _, W, N, k);
      } else {
        const { p: N, f: B } = C(x);
        m = N, S = B;
      }
      return cc(L, [m, S])[0];
    }
    /**
     * Non-constant-time multiplication. Uses double-and-add algorithm.
     * It's faster, but should only be used when you don't care about
     * an exposed secret key e.g. sig verification, which works over *public* keys.
     */
    multiplyUnsafe(x) {
      const { endo: E } = t, m = this;
      if (!s.isValid(x))
        throw new Error("invalid scalar: out of range");
      if (x === Ae || m.is0())
        return L.ZERO;
      if (x === Rn)
        return m;
      if (lt.hasCache(this))
        return this.multiply(x);
      if (E) {
        const { k1neg: S, k1: C, k2neg: N, k2: B } = V(x), { p1: k, p2: R } = Ag(L, m, C, B);
        return et(E.beta, k, R, S, N);
      } else
        return lt.unsafe(m, x);
    }
    /**
     * Converts Projective point to affine (x, y) coordinates.
     * @param invertedZ Z^-1 (inverted zero) - optional, precomputation is useful for invertBatch
     */
    toAffine(x) {
      return Y(this, x);
    }
    /**
     * Checks whether Point is free of torsion elements (is in prime subgroup).
     * Always torsion-free for cofactor=1 curves.
     */
    isTorsionFree() {
      const { isTorsionFree: x } = t;
      return o === Rn ? !0 : x ? x(L, this) : lt.unsafe(this, a).is0();
    }
    clearCofactor() {
      const { clearCofactor: x } = t;
      return o === Rn ? this : x ? x(L, this) : this.multiplyUnsafe(o);
    }
    isSmallOrder() {
      return this.multiplyUnsafe(o).is0();
    }
    toBytes(x = !0) {
      return Ts(x, "isCompressed"), this.assertValidity(), p(L, this, x);
    }
    toHex(x = !0) {
      return qs(this.toBytes(x));
    }
    toString() {
      return `<Point ${this.is0() ? "ZERO" : this.toHex()}>`;
    }
  }
  const I = s.BITS, lt = new vg(L, t.endo ? Math.ceil(I / 2) : I);
  return L.BASE.precompute(8), L;
}
function af(e) {
  return Uint8Array.of(e ? 2 : 3);
}
function cf(e, t) {
  return {
    secretKey: t.BYTES,
    publicKey: 1 + e.BYTES,
    publicKeyUncompressed: 1 + 2 * e.BYTES,
    publicKeyHasPrefix: !0,
    signature: 2 * t.BYTES
  };
}
function Ng(e, t = {}) {
  const { Fn: n } = e, r = t.randomBytes || Ys, s = Object.assign(cf(e.Fp, n), { seed: Ql(n.ORDER) });
  function i(p) {
    try {
      const y = n.fromBytes(p);
      return n.isValidNot0(y);
    } catch {
      return !1;
    }
  }
  function o(p, y) {
    const { publicKey: d, publicKeyUncompressed: g } = s;
    try {
      const w = p.length;
      return y === !0 && w !== d || y === !1 && w !== g ? !1 : !!e.fromBytes(p);
    } catch {
      return !1;
    }
  }
  function a(p = r(s.seed)) {
    return Jl(it(p, s.seed, "seed"), n.ORDER);
  }
  function c(p, y = !0) {
    return e.BASE.multiply(n.fromBytes(p)).toBytes(y);
  }
  function u(p) {
    const { secretKey: y, publicKey: d, publicKeyUncompressed: g } = s;
    if (!Fo(p) || "_lengths" in n && n._lengths || y === d)
      return;
    const w = it(p, void 0, "key").length;
    return w === d || w === g;
  }
  function l(p, y, d = !0) {
    if (u(p) === !0)
      throw new Error("first arg must be private key");
    if (u(y) === !1)
      throw new Error("second arg must be public key");
    const g = n.fromBytes(p);
    return e.fromBytes(y).multiply(g).toBytes(d);
  }
  const f = {
    isValidSecretKey: i,
    isValidPublicKey: o,
    randomSecretKey: a
  }, h = nf(a, c);
  return Object.freeze({ getPublicKey: c, getSharedSecret: l, keygen: h, Point: e, utils: f, lengths: s });
}
function Rg(e, t, n = {}) {
  cl(t), jo(n, {}, {
    hmac: "function",
    lowS: "boolean",
    randomBytes: "function",
    bits2int: "function",
    bits2int_modN: "function"
  }), n = Object.assign({}, n);
  const r = n.randomBytes || Ys, s = n.hmac || ((E, m) => sf(t, E, m)), { Fp: i, Fn: o } = e, { ORDER: a, BITS: c } = o, { keygen: u, getPublicKey: l, getSharedSecret: f, utils: h, lengths: p } = Ng(e, n), y = {
    prehash: !0,
    lowS: typeof n.lowS == "boolean" ? n.lowS : !0,
    format: "compact",
    extraEntropy: !1
  }, d = a * of < i.ORDER;
  function g(E) {
    const m = a >> Rn;
    return E > m;
  }
  function w(E, m) {
    if (!o.isValidNot0(m))
      throw new Error(`invalid signature ${E}: out of range 1..Point.Fn.ORDER`);
    return m;
  }
  function A() {
    if (d)
      throw new Error('"recovered" sig type is not supported for cofactor >2 curves');
  }
  function O(E, m) {
    io(m);
    const S = p.signature, C = m === "compact" ? S : m === "recovered" ? S + 1 : void 0;
    return it(E, C);
  }
  class P {
    r;
    s;
    recovery;
    constructor(m, S, C) {
      if (this.r = w("r", m), this.s = w("s", S), C != null) {
        if (A(), ![0, 1, 2, 3].includes(C))
          throw new Error("invalid recovery id");
        this.recovery = C;
      }
      Object.freeze(this);
    }
    static fromBytes(m, S = y.format) {
      O(m, S);
      let C;
      if (S === "der") {
        const { r: R, s: _ } = _e.toSig(it(m));
        return new P(R, _);
      }
      S === "recovered" && (C = m[0], S = "compact", m = m.subarray(1));
      const N = p.signature / 2, B = m.subarray(0, N), k = m.subarray(N, N * 2);
      return new P(o.fromBytes(B), o.fromBytes(k), C);
    }
    static fromHex(m, S) {
      return this.fromBytes(xs(m), S);
    }
    assertRecovery() {
      const { recovery: m } = this;
      if (m == null)
        throw new Error("invalid recovery id: must be present");
      return m;
    }
    addRecoveryBit(m) {
      return new P(this.r, this.s, m);
    }
    recoverPublicKey(m) {
      const { r: S, s: C } = this, N = this.assertRecovery(), B = N === 2 || N === 3 ? S + a : S;
      if (!i.isValid(B))
        throw new Error("invalid recovery id: sig.r+curve.n != R.x");
      const k = i.toBytes(B), R = e.fromBytes(de(af((N & 1) === 0), k)), _ = o.inv(B), q = Y(it(m, void 0, "msgHash")), W = o.create(-q * _), D = o.create(C * _), K = e.BASE.multiplyUnsafe(W).add(R.multiplyUnsafe(D));
      if (K.is0())
        throw new Error("invalid recovery: point at infinify");
      return K.assertValidity(), K;
    }
    // Signatures should be low-s, to prevent malleability.
    hasHighS() {
      return g(this.s);
    }
    toBytes(m = y.format) {
      if (io(m), m === "der")
        return xs(_e.hexFromSig(this));
      const { r: S, s: C } = this, N = o.toBytes(S), B = o.toBytes(C);
      return m === "recovered" ? (A(), de(Uint8Array.of(this.assertRecovery()), N, B)) : de(N, B);
    }
    toHex(m) {
      return qs(this.toBytes(m));
    }
  }
  const V = n.bits2int || function(m) {
    if (m.length > 8192)
      throw new Error("input is too large");
    const S = Zn(m), C = m.length * 8 - c;
    return C > 0 ? S >> BigInt(C) : S;
  }, Y = n.bits2int_modN || function(m) {
    return o.create(V(m));
  }, T = zo(c);
  function et(E) {
    return Ip("num < 2^" + c, E, Ae, T), o.toBytes(E);
  }
  function L(E, m) {
    return it(E, void 0, "message"), m ? it(t(E), void 0, "prehashed message") : E;
  }
  function I(E, m, S) {
    const { lowS: C, prehash: N, extraEntropy: B } = xi(S, y);
    E = L(E, N);
    const k = Y(E), R = o.fromBytes(m);
    if (!o.isValidNot0(R))
      throw new Error("invalid private key");
    const _ = [et(R), et(k)];
    if (B != null && B !== !1) {
      const K = B === !0 ? r(p.secretKey) : B;
      _.push(it(K, void 0, "extraEntropy"));
    }
    const q = de(..._), W = k;
    function D(K) {
      const Z = V(K);
      if (!o.isValidNot0(Z))
        return;
      const ft = o.inv(Z), z = e.BASE.multiply(Z).toAffine(), J = o.create(z.x);
      if (J === Ae)
        return;
      const jt = o.create(ft * o.create(W + J * R));
      if (jt === Ae)
        return;
      let en = (z.x === J ? 0 : 2) | Number(z.y & Rn), nn = jt;
      return C && g(jt) && (nn = o.neg(jt), en ^= 1), new P(J, nn, d ? void 0 : en);
    }
    return { seed: q, k2sig: D };
  }
  function lt(E, m, S = {}) {
    const { seed: C, k2sig: N } = I(E, m, S);
    return Cp(t.outputLen, o.BYTES, s)(C, N).toBytes(S.format);
  }
  function M(E, m, S, C = {}) {
    const { lowS: N, prehash: B, format: k } = xi(C, y);
    if (S = it(S, void 0, "publicKey"), m = L(m, B), !Fo(E)) {
      const R = E instanceof P ? ", use sig.toBytes()" : "";
      throw new Error("verify expects Uint8Array signature" + R);
    }
    O(E, k);
    try {
      const R = P.fromBytes(E, k), _ = e.fromBytes(S);
      if (N && R.hasHighS())
        return !1;
      const { r: q, s: W } = R, D = Y(m), K = o.inv(W), Z = o.create(D * K), ft = o.create(q * K), z = e.BASE.multiplyUnsafe(Z).add(_.multiplyUnsafe(ft));
      return z.is0() ? !1 : o.create(z.x) === q;
    } catch {
      return !1;
    }
  }
  function x(E, m, S = {}) {
    const { prehash: C } = xi(S, y);
    return m = L(m, C), P.fromBytes(E, "recovered").recoverPublicKey(m).toBytes();
  }
  return Object.freeze({
    keygen: u,
    getPublicKey: l,
    getSharedSecret: f,
    utils: h,
    lengths: p,
    Point: e,
    sign: lt,
    verify: M,
    recoverPublicKey: x,
    Signature: P,
    hash: t
  });
}
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const ti = {
  p: BigInt("0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffefffffc2f"),
  n: BigInt("0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141"),
  h: BigInt(1),
  a: BigInt(0),
  b: BigInt(7),
  Gx: BigInt("0x79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798"),
  Gy: BigInt("0x483ada7726a3c4655da4fbfc0e1108a8fd17b448a68554199c47d08ffb10d4b8")
}, $g = {
  beta: BigInt("0x7ae96a2b657c07106e64479eac3434e99cf0497512f58995c1396c28719501ee"),
  basises: [
    [BigInt("0x3086d221a7d46bcde86c90e49284eb15"), -BigInt("0xe4437ed6010e88286f547fa90abfe4c3")],
    [BigInt("0x114ca50f7a8e2f3f657c1108d9d44cfd8"), BigInt("0x3086d221a7d46bcde86c90e49284eb15")]
  ]
}, Ug = /* @__PURE__ */ BigInt(0), oo = /* @__PURE__ */ BigInt(2);
function Pg(e) {
  const t = ti.p, n = BigInt(3), r = BigInt(6), s = BigInt(11), i = BigInt(22), o = BigInt(23), a = BigInt(44), c = BigInt(88), u = e * e * e % t, l = u * u * e % t, f = Ft(l, n, t) * l % t, h = Ft(f, n, t) * l % t, p = Ft(h, oo, t) * u % t, y = Ft(p, s, t) * p % t, d = Ft(y, i, t) * y % t, g = Ft(d, a, t) * d % t, w = Ft(g, c, t) * g % t, A = Ft(w, a, t) * d % t, O = Ft(A, n, t) * l % t, P = Ft(O, o, t) * y % t, V = Ft(P, r, t) * u % t, Y = Ft(V, oo, t);
  if (!Cs.eql(Cs.sqr(Y), e))
    throw new Error("Cannot find square root");
  return Y;
}
const Cs = Js(ti.p, { sqrt: Pg }), vn = /* @__PURE__ */ Bg(ti, {
  Fp: Cs,
  endo: $g
}), hc = /* @__PURE__ */ Rg(vn, so), pc = {};
function Os(e, ...t) {
  let n = pc[e];
  if (n === void 0) {
    const r = so(vp(e));
    n = de(r, r), pc[e] = n;
  }
  return so(de(n, ...t));
}
const Zo = (e) => e.toBytes(!0).slice(1), Xo = (e) => e % oo === Ug;
function ao(e) {
  const { Fn: t, BASE: n } = vn, r = t.fromBytes(e), s = n.multiply(r);
  return { scalar: Xo(s.y) ? r : t.neg(r), bytes: Zo(s) };
}
function uf(e) {
  const t = Cs;
  if (!t.isValidNot0(e))
    throw new Error("invalid x: Fail if x ≥ p");
  const n = t.create(e * e), r = t.create(n * e + BigInt(7));
  let s = t.sqrt(r);
  Xo(s) || (s = t.neg(s));
  const i = vn.fromAffine({ x: e, y: s });
  return i.assertValidity(), i;
}
const ur = Zn;
function lf(...e) {
  return vn.Fn.create(ur(Os("BIP0340/challenge", ...e)));
}
function gc(e) {
  return ao(e).bytes;
}
function _g(e, t, n = Ys(32)) {
  const { Fn: r } = vn, s = it(e, void 0, "message"), { bytes: i, scalar: o } = ao(t), a = it(n, 32, "auxRand"), c = r.toBytes(o ^ ur(Os("BIP0340/aux", a))), u = Os("BIP0340/nonce", c, i, s), { bytes: l, scalar: f } = ao(u), h = lf(l, i, s), p = new Uint8Array(64);
  if (p.set(l, 0), p.set(r.toBytes(r.create(f + h * o)), 32), !ff(p, s, i))
    throw new Error("sign: Invalid signature produced");
  return p;
}
function ff(e, t, n) {
  const { Fp: r, Fn: s, BASE: i } = vn, o = it(e, 64, "signature"), a = it(t, void 0, "message"), c = it(n, 32, "publicKey");
  try {
    const u = uf(ur(c)), l = ur(o.subarray(0, 32));
    if (!r.isValidNot0(l))
      return !1;
    const f = ur(o.subarray(32, 64));
    if (!s.isValidNot0(f))
      return !1;
    const h = lf(s.toBytes(l), Zo(u), a), p = i.multiplyUnsafe(f).add(u.multiplyUnsafe(s.neg(h))), { x: y, y: d } = p.toAffine();
    return !(p.is0() || !Xo(d) || y !== l);
  } catch {
    return !1;
  }
}
const Qo = /* @__PURE__ */ (() => {
  const n = (r = Ys(48)) => Jl(r, ti.n);
  return {
    keygen: nf(n, gc),
    getPublicKey: gc,
    sign: _g,
    verify: ff,
    Point: vn,
    utils: {
      randomSecretKey: n,
      taggedHash: Os,
      lift_x: uf,
      pointToBytes: Zo
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
function Jo(e, t, n = {}) {
  e = Xi(e);
  const { aggPublicKey: r } = Qi(e);
  if (!n.taprootTweak)
    return {
      preTweakedKey: r.toBytes(!0),
      finalKey: r.toBytes(!0)
    };
  const s = Qo.utils.taggedHash("TapTweak", r.toBytes(!0).subarray(1), n.taprootTweak ?? new Uint8Array(0)), { aggPublicKey: i } = Qi(e, [s], [!0]);
  return {
    preTweakedKey: r.toBytes(!0),
    finalKey: i.toBytes(!0)
  };
}
class Wr extends Error {
  constructor(t) {
    super(t), this.name = "PartialSignatureError";
  }
}
class ta {
  constructor(t, n) {
    if (this.s = t, this.R = n, t.length !== 32)
      throw new Wr("Invalid s length");
    if (n.length !== 33)
      throw new Wr("Invalid R length");
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
      throw new Wr("Invalid partial signature length");
    if (Zn(t) >= Ct.CURVE().n)
      throw new Wr("s value overflows curve order");
    const r = new Uint8Array(33);
    return new ta(t, r);
  }
}
function Lg(e, t, n, r, s, i) {
  let o;
  if (i?.taprootTweak !== void 0) {
    const { preTweakedKey: u } = Jo(Xi(r));
    o = Qo.utils.taggedHash("TapTweak", u.subarray(1), i.taprootTweak);
  }
  const c = new yp(n, Xi(r), s, o ? [o] : void 0, o ? [!0] : void 0).sign(e, t);
  return ta.decode(c);
}
var Ti, yc;
function Dg() {
  if (yc) return Ti;
  yc = 1;
  const e = 4294967295, t = 1 << 31, n = 9, r = 65535, s = 1 << 22, i = r, o = 1 << n, a = r << n;
  function c(l) {
    return l & t ? {} : l & s ? {
      seconds: (l & r) << n
    } : {
      blocks: l & r
    };
  }
  function u({ blocks: l, seconds: f }) {
    if (l !== void 0 && f !== void 0) throw new TypeError("Cannot encode blocks AND seconds");
    if (l === void 0 && f === void 0) return e;
    if (f !== void 0) {
      if (!Number.isFinite(f)) throw new TypeError("Expected Number seconds");
      if (f > a) throw new TypeError("Expected Number seconds <= " + a);
      if (f % o !== 0) throw new TypeError("Expected Number seconds as a multiple of " + o);
      return s | f >> n;
    }
    if (!Number.isFinite(l)) throw new TypeError("Expected Number blocks");
    if (l > r) throw new TypeError("Expected Number blocks <= " + i);
    return l;
  }
  return Ti = { decode: c, encode: u }, Ti;
}
var vr = Dg(), Dt;
(function(e) {
  e.VtxoTaprootTree = "taptree", e.VtxoTreeExpiry = "expiry", e.Cosigner = "cosigner", e.ConditionWitness = "condition";
})(Dt || (Dt = {}));
const ea = 222;
function Vg(e, t, n, r) {
  e.updateInput(t, {
    unknown: [
      ...e.getInput(t)?.unknown ?? [],
      n.encode(r)
    ]
  });
}
function co(e, t, n) {
  const r = e.getInput(t)?.unknown ?? [], s = [];
  for (const i of r) {
    const o = n.decode(i);
    o && s.push(o);
  }
  return s;
}
const df = {
  key: Dt.VtxoTaprootTree,
  encode: (e) => [
    {
      type: ea,
      key: ei[Dt.VtxoTaprootTree]
    },
    e
  ],
  decode: (e) => na(() => ra(e[0], Dt.VtxoTaprootTree) ? e[1] : null)
}, Mg = {
  key: Dt.ConditionWitness,
  encode: (e) => [
    {
      type: ea,
      key: ei[Dt.ConditionWitness]
    },
    br.encode(e)
  ],
  decode: (e) => na(() => ra(e[0], Dt.ConditionWitness) ? br.decode(e[1]) : null)
}, uo = {
  key: Dt.Cosigner,
  encode: (e) => [
    {
      type: ea,
      key: new Uint8Array([
        ...ei[Dt.Cosigner],
        e.index
      ])
    },
    e.key
  ],
  decode: (e) => na(() => ra(e[0], Dt.Cosigner) ? {
    index: e[0].key[e[0].key.length - 1],
    key: e[1]
  } : null)
};
Dt.VtxoTreeExpiry;
const ei = Object.fromEntries(Object.values(Dt).map((e) => [
  e,
  new TextEncoder().encode(e)
])), na = (e) => {
  try {
    return e();
  } catch {
    return null;
  }
};
function ra(e, t) {
  const n = v.encode(ei[t]);
  return v.encode(new Uint8Array([e.type, ...e.key])).includes(n);
}
const Kr = new Error("missing vtxo graph");
class Ar {
  constructor(t) {
    this.secretKey = t, this.myNonces = null, this.aggregateNonces = null, this.graph = null, this.scriptRoot = null, this.rootSharedOutputAmount = null;
  }
  static random() {
    const t = Fi();
    return new Ar(t);
  }
  async init(t, n, r) {
    this.graph = t, this.scriptRoot = n, this.rootSharedOutputAmount = r;
  }
  async getPublicKey() {
    return hc.getPublicKey(this.secretKey);
  }
  async getNonces() {
    if (!this.graph)
      throw Kr;
    this.myNonces || (this.myNonces = this.generateNonces());
    const t = /* @__PURE__ */ new Map();
    for (const [n, r] of this.myNonces)
      t.set(n, { pubNonce: r.pubNonce });
    return t;
  }
  async aggregatedNonces(t, n) {
    if (!this.graph)
      throw Kr;
    if (this.aggregateNonces || (this.aggregateNonces = /* @__PURE__ */ new Map()), this.myNonces || await this.getNonces(), this.aggregateNonces.has(t))
      return {
        hasAllNonces: this.aggregateNonces.size === this.myNonces?.size
      };
    const r = this.myNonces.get(t);
    if (!r)
      throw new Error(`missing nonce for txid ${t}`);
    const s = await this.getPublicKey();
    n.set(v.encode(s.subarray(1)), r);
    const i = this.graph.find(t);
    if (!i)
      throw new Error(`missing tx for txid ${t}`);
    const o = co(i.root, 0, uo).map(
      (u) => v.encode(u.key.subarray(1))
      // xonly pubkey
    ), a = [];
    for (const u of o) {
      const l = n.get(u);
      if (!l)
        throw new Error(`missing nonce for cosigner ${u}`);
      a.push(l.pubNonce);
    }
    const c = mp(a);
    return this.aggregateNonces.set(t, { pubNonce: c }), {
      hasAllNonces: this.aggregateNonces.size === this.myNonces?.size
    };
  }
  async sign() {
    if (!this.graph)
      throw Kr;
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
      throw Kr;
    const t = /* @__PURE__ */ new Map(), n = hc.getPublicKey(this.secretKey);
    for (const r of this.graph.iterator()) {
      const s = wp(n);
      t.set(r.txid, s);
    }
    return t;
  }
  signPartial(t) {
    if (!this.graph || !this.scriptRoot || !this.rootSharedOutputAmount)
      throw Ar.NOT_INITIALIZED;
    if (!this.myNonces || !this.aggregateNonces)
      throw new Error("session not properly initialized");
    const n = this.myNonces.get(t.txid);
    if (!n)
      throw new Error("missing private nonce");
    const r = this.aggregateNonces.get(t.txid);
    if (!r)
      throw new Error("missing aggregate nonce");
    const s = [], i = [], o = co(t.root, 0, uo).map((u) => u.key), { finalKey: a } = Jo(o, !0, {
      taprootTweak: this.scriptRoot
    });
    for (let u = 0; u < t.root.inputsLength; u++) {
      const l = Hg(a, this.graph, this.rootSharedOutputAmount, t.root);
      s.push(l.amount), i.push(l.script);
    }
    const c = t.root.preimageWitnessV1(
      0,
      // always first input
      i,
      mn.DEFAULT,
      s
    );
    return Lg(n.secNonce, this.secretKey, r.pubNonce, o, c, {
      taprootTweak: this.scriptRoot
    });
  }
}
Ar.NOT_INITIALIZED = new Error("session not initialized, call init method");
function Hg(e, t, n, r) {
  const s = G.encode(["OP_1", e.slice(1)]);
  if (r.id === t.txid)
    return {
      amount: n,
      script: s
    };
  const i = r.getInput(0);
  if (!i.txid)
    throw new Error("missing parent input txid");
  const o = v.encode(i.txid), a = t.find(o);
  if (!a)
    throw new Error("parent  tx not found");
  if (i.index === void 0)
    throw new Error("missing input index");
  const c = a.root.getOutput(i.index);
  if (!c)
    throw new Error("parent output not found");
  if (!c.amount)
    throw new Error("parent output amount not found");
  return {
    amount: c.amount,
    script: s
  };
}
const wc = Object.values(mn).filter((e) => typeof e == "number");
class lr {
  constructor(t) {
    this.key = t || Fi();
  }
  static fromPrivateKey(t) {
    return new lr(t);
  }
  static fromHex(t) {
    return new lr(v.decode(t));
  }
  static fromRandomBytes() {
    return new lr(Fi());
  }
  /**
   * Export the private key as a hex string.
   *
   * @returns The private key as a hex string
   */
  toHex() {
    return v.encode(this.key);
  }
  async sign(t, n) {
    const r = t.clone();
    if (!n) {
      try {
        if (!r.sign(this.key, wc))
          throw new Error("Failed to sign transaction");
      } catch (s) {
        if (!(s instanceof Error && s.message.includes("No inputs signed"))) throw s;
      }
      return r;
    }
    for (const s of n)
      if (!r.signIdx(this.key, s, wc))
        throw new Error(`Failed to sign input #${s}`);
    return r;
  }
  compressedPublicKey() {
    return Promise.resolve(ju(this.key, !0));
  }
  xOnlyPublicKey() {
    return Promise.resolve(Ro(this.key));
  }
  signerSession() {
    return Ar.random();
  }
  async signMessage(t, n = "schnorr") {
    return n === "ecdsa" ? Xp(t, this.key, { prehash: !1 }) : sg.signAsync(t, this.key);
  }
  async toReadonly() {
    return new ni(await this.compressedPublicKey());
  }
}
class ni {
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
    return new ni(t);
  }
  xOnlyPublicKey() {
    return Promise.resolve(this.publicKey.slice(1));
  }
  compressedPublicKey() {
    return Promise.resolve(this.publicKey);
  }
}
class gn {
  constructor(t, n, r, s = 0) {
    if (this.serverPubKey = t, this.vtxoTaprootKey = n, this.hrp = r, this.version = s, t.length !== 32)
      throw new Error("Invalid server public key length, expected 32 bytes, got " + t.length);
    if (n.length !== 32)
      throw new Error("Invalid vtxo taproot public key length, expected 32 bytes, got " + n.length);
  }
  static decode(t) {
    const n = An.decodeUnsafe(t, 1023);
    if (!n)
      throw new Error("Invalid address");
    const r = new Uint8Array(An.fromWords(n.words));
    if (r.length !== 65)
      throw new Error("Invalid data length, expected 65 bytes, got " + r.length);
    const s = r[0], i = r.slice(1, 33), o = r.slice(33, 65);
    return new gn(i, o, n.prefix, s);
  }
  encode() {
    const t = new Uint8Array(65);
    t[0] = this.version, t.set(this.serverPubKey, 1), t.set(this.vtxoTaprootKey, 33);
    const n = An.toWords(t);
    return An.encode(this.hrp, n, 1023);
  }
  // pkScript is the script that should be used to send non-dust funds to the address
  get pkScript() {
    return G.encode(["OP_1", this.vtxoTaprootKey]);
  }
  // subdustPkScript is the script that should be used to send sub-dust funds to the address
  get subdustPkScript() {
    return G.encode(["RETURN", this.vtxoTaprootKey]);
  }
}
const Bs = Po(void 0, !0);
var wt;
(function(e) {
  e.Multisig = "multisig", e.CSVMultisig = "csv-multisig", e.ConditionCSVMultisig = "condition-csv-multisig", e.ConditionMultisig = "condition-multisig", e.CLTVMultisig = "cltv-multisig";
})(wt || (wt = {}));
function hf(e) {
  const t = [
    se,
    Vt,
    Ir,
    Ns,
    Kn
  ];
  for (const n of t)
    try {
      return n.decode(e);
    } catch {
      continue;
    }
  throw new Error(`Failed to decode: script ${v.encode(e)} is not a valid tapscript`);
}
var se;
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
        type: wt.Multisig,
        params: a,
        script: ip(a.pubkeys.length, a.pubkeys).script
      };
    const c = [];
    for (let u = 0; u < a.pubkeys.length; u++)
      c.push(a.pubkeys[u]), u < a.pubkeys.length - 1 ? c.push("CHECKSIGVERIFY") : c.push("CHECKSIG");
    return {
      type: wt.Multisig,
      params: a,
      script: G.encode(c)
    };
  }
  e.encode = n;
  function r(a) {
    if (a.length === 0)
      throw new Error("Failed to decode: script is empty");
    try {
      return s(a);
    } catch {
      try {
        return i(a);
      } catch (u) {
        throw new Error(`Failed to decode script: ${u instanceof Error ? u.message : String(u)}`);
      }
    }
  }
  e.decode = r;
  function s(a) {
    const c = G.decode(a), u = [];
    let l = !1;
    for (let h = 0; h < c.length; h++) {
      const p = c[h];
      if (typeof p != "string" && typeof p != "number") {
        if (p.length !== 32)
          throw new Error(`Invalid pubkey length: expected 32, got ${p.length}`);
        if (u.push(p), h + 1 >= c.length || c[h + 1] !== "CHECKSIGADD" && c[h + 1] !== "CHECKSIG")
          throw new Error("Expected CHECKSIGADD or CHECKSIG after pubkey");
        h++;
        continue;
      }
      if (h === c.length - 1) {
        if (p !== "NUMEQUAL")
          throw new Error("Expected NUMEQUAL at end of script");
        l = !0;
      }
    }
    if (!l)
      throw new Error("Missing NUMEQUAL operation");
    if (u.length === 0)
      throw new Error("Invalid script: must have at least 1 pubkey");
    const f = n({
      pubkeys: u,
      type: t.CHECKSIGADD
    });
    if (v.encode(f.script) !== v.encode(a))
      throw new Error("Invalid script format: script reconstruction mismatch");
    return {
      type: wt.Multisig,
      params: { pubkeys: u, type: t.CHECKSIGADD },
      script: a
    };
  }
  function i(a) {
    const c = G.decode(a), u = [];
    for (let f = 0; f < c.length; f++) {
      const h = c[f];
      if (typeof h != "string" && typeof h != "number") {
        if (h.length !== 32)
          throw new Error(`Invalid pubkey length: expected 32, got ${h.length}`);
        if (u.push(h), f + 1 >= c.length)
          throw new Error("Unexpected end of script");
        const p = c[f + 1];
        if (p !== "CHECKSIGVERIFY" && p !== "CHECKSIG")
          throw new Error("Expected CHECKSIGVERIFY or CHECKSIG after pubkey");
        if (f === c.length - 2 && p !== "CHECKSIG")
          throw new Error("Last operation must be CHECKSIG");
        f++;
        continue;
      }
    }
    if (u.length === 0)
      throw new Error("Invalid script: must have at least 1 pubkey");
    const l = n({ pubkeys: u, type: t.CHECKSIG });
    if (v.encode(l.script) !== v.encode(a))
      throw new Error("Invalid script format: script reconstruction mismatch");
    return {
      type: wt.Multisig,
      params: { pubkeys: u, type: t.CHECKSIG },
      script: a
    };
  }
  function o(a) {
    return a.type === wt.Multisig;
  }
  e.is = o;
})(se || (se = {}));
var Vt;
(function(e) {
  function t(s) {
    for (const u of s.pubkeys)
      if (u.length !== 32)
        throw new Error(`Invalid pubkey length: expected 32, got ${u.length}`);
    const i = Bs.encode(BigInt(vr.encode(s.timelock.type === "blocks" ? { blocks: Number(s.timelock.value) } : { seconds: Number(s.timelock.value) }))), o = [
      i.length === 1 ? i[0] : i,
      "CHECKSEQUENCEVERIFY",
      "DROP"
    ], a = se.encode(s), c = new Uint8Array([
      ...G.encode(o),
      ...a.script
    ]);
    return {
      type: wt.CSVMultisig,
      params: s,
      script: c
    };
  }
  e.encode = t;
  function n(s) {
    if (s.length === 0)
      throw new Error("Failed to decode: script is empty");
    const i = G.decode(s);
    if (i.length < 3)
      throw new Error("Invalid script: too short (expected at least 3)");
    const o = i[0];
    if (typeof o == "string")
      throw new Error("Invalid script: expected sequence number");
    if (i[1] !== "CHECKSEQUENCEVERIFY" || i[2] !== "DROP")
      throw new Error("Invalid script: expected CHECKSEQUENCEVERIFY DROP");
    const a = new Uint8Array(G.encode(i.slice(3)));
    let c;
    try {
      c = se.decode(a);
    } catch (p) {
      throw new Error(`Invalid multisig script: ${p instanceof Error ? p.message : String(p)}`);
    }
    let u;
    typeof o == "number" ? u = o : u = Number(Bs.decode(o));
    const l = vr.decode(u), f = l.blocks !== void 0 ? { type: "blocks", value: BigInt(l.blocks) } : { type: "seconds", value: BigInt(l.seconds) }, h = t({
      timelock: f,
      ...c.params
    });
    if (v.encode(h.script) !== v.encode(s))
      throw new Error("Invalid script format: script reconstruction mismatch");
    return {
      type: wt.CSVMultisig,
      params: {
        timelock: f,
        ...c.params
      },
      script: s
    };
  }
  e.decode = n;
  function r(s) {
    return s.type === wt.CSVMultisig;
  }
  e.is = r;
})(Vt || (Vt = {}));
var Ir;
(function(e) {
  function t(s) {
    const i = new Uint8Array([
      ...s.conditionScript,
      ...G.encode(["VERIFY"]),
      ...Vt.encode(s).script
    ]);
    return {
      type: wt.ConditionCSVMultisig,
      params: s,
      script: i
    };
  }
  e.encode = t;
  function n(s) {
    if (s.length === 0)
      throw new Error("Failed to decode: script is empty");
    const i = G.decode(s);
    if (i.length < 1)
      throw new Error("Invalid script: too short (expected at least 1)");
    let o = -1;
    for (let f = i.length - 1; f >= 0; f--)
      i[f] === "VERIFY" && (o = f);
    if (o === -1)
      throw new Error("Invalid script: missing VERIFY operation");
    const a = new Uint8Array(G.encode(i.slice(0, o))), c = new Uint8Array(G.encode(i.slice(o + 1)));
    let u;
    try {
      u = Vt.decode(c);
    } catch (f) {
      throw new Error(`Invalid CSV multisig script: ${f instanceof Error ? f.message : String(f)}`);
    }
    const l = t({
      conditionScript: a,
      ...u.params
    });
    if (v.encode(l.script) !== v.encode(s))
      throw new Error("Invalid script format: script reconstruction mismatch");
    return {
      type: wt.ConditionCSVMultisig,
      params: {
        conditionScript: a,
        ...u.params
      },
      script: s
    };
  }
  e.decode = n;
  function r(s) {
    return s.type === wt.ConditionCSVMultisig;
  }
  e.is = r;
})(Ir || (Ir = {}));
var Ns;
(function(e) {
  function t(s) {
    const i = new Uint8Array([
      ...s.conditionScript,
      ...G.encode(["VERIFY"]),
      ...se.encode(s).script
    ]);
    return {
      type: wt.ConditionMultisig,
      params: s,
      script: i
    };
  }
  e.encode = t;
  function n(s) {
    if (s.length === 0)
      throw new Error("Failed to decode: script is empty");
    const i = G.decode(s);
    if (i.length < 1)
      throw new Error("Invalid script: too short (expected at least 1)");
    let o = -1;
    for (let f = i.length - 1; f >= 0; f--)
      i[f] === "VERIFY" && (o = f);
    if (o === -1)
      throw new Error("Invalid script: missing VERIFY operation");
    const a = new Uint8Array(G.encode(i.slice(0, o))), c = new Uint8Array(G.encode(i.slice(o + 1)));
    let u;
    try {
      u = se.decode(c);
    } catch (f) {
      throw new Error(`Invalid multisig script: ${f instanceof Error ? f.message : String(f)}`);
    }
    const l = t({
      conditionScript: a,
      ...u.params
    });
    if (v.encode(l.script) !== v.encode(s))
      throw new Error("Invalid script format: script reconstruction mismatch");
    return {
      type: wt.ConditionMultisig,
      params: {
        conditionScript: a,
        ...u.params
      },
      script: s
    };
  }
  e.decode = n;
  function r(s) {
    return s.type === wt.ConditionMultisig;
  }
  e.is = r;
})(Ns || (Ns = {}));
var Kn;
(function(e) {
  function t(s) {
    const i = Bs.encode(s.absoluteTimelock), o = [
      i.length === 1 ? i[0] : i,
      "CHECKLOCKTIMEVERIFY",
      "DROP"
    ], a = G.encode(o), c = new Uint8Array([
      ...a,
      ...se.encode(s).script
    ]);
    return {
      type: wt.CLTVMultisig,
      params: s,
      script: c
    };
  }
  e.encode = t;
  function n(s) {
    if (s.length === 0)
      throw new Error("Failed to decode: script is empty");
    const i = G.decode(s);
    if (i.length < 3)
      throw new Error("Invalid script: too short (expected at least 3)");
    const o = i[0];
    if (typeof o == "string" || typeof o == "number")
      throw new Error("Invalid script: expected locktime number");
    if (i[1] !== "CHECKLOCKTIMEVERIFY" || i[2] !== "DROP")
      throw new Error("Invalid script: expected CHECKLOCKTIMEVERIFY DROP");
    const a = new Uint8Array(G.encode(i.slice(3)));
    let c;
    try {
      c = se.decode(a);
    } catch (f) {
      throw new Error(`Invalid multisig script: ${f instanceof Error ? f.message : String(f)}`);
    }
    const u = Bs.decode(o), l = t({
      absoluteTimelock: u,
      ...c.params
    });
    if (v.encode(l.script) !== v.encode(s))
      throw new Error("Invalid script format: script reconstruction mismatch");
    return {
      type: wt.CLTVMultisig,
      params: {
        absoluteTimelock: u,
        ...c.params
      },
      script: s
    };
  }
  e.decode = n;
  function r(s) {
    return s.type === wt.CLTVMultisig;
  }
  e.is = r;
})(Kn || (Kn = {}));
const mc = Er.tapTree[2];
function fr(e) {
  return e[1].subarray(0, e[1].length - 1);
}
class zt {
  static decode(t) {
    const r = mc.decode(t).map((s) => s.script);
    return new zt(r);
  }
  constructor(t) {
    this.scripts = t;
    const n = t.length % 2 !== 0 ? t.slice().reverse() : t, r = tl(n.map((i) => ({
      script: i,
      leafVersion: xr
    }))), s = sp(Uo, r, void 0, !0);
    if (!s.tapLeafScript || s.tapLeafScript.length !== t.length)
      throw new Error("invalid scripts");
    this.leaves = s.tapLeafScript, this.tweakedPublicKey = s.tweakedPubkey;
  }
  encode() {
    return mc.encode(this.scripts.map((n) => ({
      depth: 1,
      version: xr,
      script: n
    })));
  }
  address(t, n) {
    return new gn(n, this.tweakedPublicKey, t);
  }
  get pkScript() {
    return G.encode(["OP_1", this.tweakedPublicKey]);
  }
  onchainAddress(t) {
    return qe(t).encode({
      type: "tr",
      pubkey: this.tweakedPublicKey
    });
  }
  findLeaf(t) {
    const n = this.leaves.find((r) => v.encode(fr(r)) === t);
    if (!n)
      throw new Error(`leaf '${t}' not found`);
    return n;
  }
  exitPaths() {
    const t = [];
    for (const n of this.leaves)
      try {
        const r = Vt.decode(fr(n));
        t.push(r);
        continue;
      } catch {
        try {
          const s = Ir.decode(fr(n));
          t.push(s);
        } catch {
          continue;
        }
      }
    return t;
  }
}
var lo;
(function(e) {
  class t extends zt {
    constructor(s) {
      n(s);
      const { sender: i, receiver: o, server: a, preimageHash: c, refundLocktime: u, unilateralClaimDelay: l, unilateralRefundDelay: f, unilateralRefundWithoutReceiverDelay: h } = s, p = Fg(c), y = Ns.encode({
        conditionScript: p,
        pubkeys: [o, a]
      }).script, d = se.encode({
        pubkeys: [i, o, a]
      }).script, g = Kn.encode({
        absoluteTimelock: u,
        pubkeys: [i, a]
      }).script, w = Ir.encode({
        conditionScript: p,
        timelock: l,
        pubkeys: [o]
      }).script, A = Vt.encode({
        timelock: f,
        pubkeys: [i, o]
      }).script, O = Vt.encode({
        timelock: h,
        pubkeys: [i]
      }).script;
      super([
        y,
        d,
        g,
        w,
        A,
        O
      ]), this.options = s, this.claimScript = v.encode(y), this.refundScript = v.encode(d), this.refundWithoutReceiverScript = v.encode(g), this.unilateralClaimScript = v.encode(w), this.unilateralRefundScript = v.encode(A), this.unilateralRefundWithoutReceiverScript = v.encode(O);
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
    const { sender: s, receiver: i, server: o, preimageHash: a, refundLocktime: c, unilateralClaimDelay: u, unilateralRefundDelay: l, unilateralRefundWithoutReceiverDelay: f } = r;
    if (!a || a.length !== 20)
      throw new Error("preimage hash must be 20 bytes");
    if (!i || i.length !== 32)
      throw new Error("Invalid public key length (receiver)");
    if (!s || s.length !== 32)
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
    if (!f || typeof f.value != "bigint" || f.value <= 0n)
      throw new Error("unilateral refund without receiver delay must greater than 0");
    if (f.type === "seconds" && f.value % 512n !== 0n)
      throw new Error("seconds timelock must be multiple of 512");
    if (f.type === "seconds" && f.value < 512n)
      throw new Error("seconds timelock must be greater or equal to 512");
  }
})(lo || (lo = {}));
function Fg(e) {
  return G.encode(["HASH160", e, "EQUAL"]);
}
var yn;
(function(e) {
  class t extends zt {
    constructor(r) {
      const { pubKey: s, serverPubKey: i, csvTimelock: o = t.DEFAULT_TIMELOCK } = r, a = se.encode({
        pubkeys: [s, i]
      }).script, c = Vt.encode({
        timelock: o,
        pubkeys: [s]
      }).script;
      super([a, c]), this.options = r, this.forfeitScript = v.encode(a), this.exitScript = v.encode(c);
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
})(yn || (yn = {}));
var Te;
(function(e) {
  e.TxSent = "SENT", e.TxReceived = "RECEIVED";
})(Te || (Te = {}));
function Me(e) {
  return !e.isSpent;
}
function sa(e) {
  return e.virtualStatus.state === "swept" && Me(e);
}
function pf(e) {
  if (e.virtualStatus.state === "swept")
    return !0;
  const t = e.virtualStatus.batchExpiry;
  return !t || new Date(t).getFullYear() < 2025 ? !1 : t <= Date.now();
}
function gf(e, t) {
  return e.value < t;
}
async function* fo(e) {
  const t = [], n = [];
  let r = null, s = null;
  const i = (a) => {
    r ? (r(a), r = null) : t.push(a);
  }, o = () => {
    const a = new Error("EventSource error");
    s ? (s(a), s = null) : n.push(a);
  };
  e.addEventListener("message", i), e.addEventListener("error", o);
  try {
    for (; ; ) {
      if (t.length > 0) {
        yield t.shift();
        continue;
      }
      if (n.length > 0)
        throw n.shift();
      const a = await new Promise((c, u) => {
        r = c, s = u;
      }).finally(() => {
        r = null, s = null;
      });
      a && (yield a);
    }
  } finally {
    e.removeEventListener("message", i), e.removeEventListener("error", o);
  }
}
class yf extends Error {
  constructor(t, n, r, s) {
    super(n), this.code = t, this.message = n, this.name = r, this.metadata = s;
  }
}
function Wg(e) {
  try {
    if (!(e instanceof Error))
      return;
    const t = JSON.parse(e.message);
    if (!("details" in t) || !Array.isArray(t.details))
      return;
    for (const n of t.details) {
      if (!("@type" in n) || n["@type"] !== "type.googleapis.com/ark.v1.ErrorDetails" || !("code" in n))
        continue;
      const s = n.code;
      if (!("message" in n))
        continue;
      const i = n.message;
      if (!("name" in n))
        continue;
      const o = n.name;
      let a;
      return "metadata" in n && Kg(n.metadata) && (a = n.metadata), new yf(s, i, o, a);
    }
    return;
  } catch {
    return;
  }
}
function Kg(e) {
  return typeof e == "object" && e !== null && !Array.isArray(e);
}
var We;
(function(e) {
  function t(s, i, o = []) {
    if (typeof s != "string" && (s = r(s)), i.length == 0)
      throw new Error("intent proof requires at least one input");
    Zg(i), Qg(o);
    const a = Jg(s, i[0].witnessUtxo.script);
    return ty(a, i, o);
  }
  e.create = t;
  function n(s) {
    let i = 0n;
    for (let a = 0; a < s.inputsLength; a++) {
      const c = s.getInput(a);
      if (c.witnessUtxo === void 0)
        throw new Error("intent proof input requires witness utxo");
      i += c.witnessUtxo.amount;
    }
    let o = 0n;
    for (let a = 0; a < s.outputsLength; a++) {
      const c = s.getOutput(a);
      if (c.amount === void 0)
        throw new Error("intent proof output requires amount");
      o += c.amount;
    }
    if (o > i)
      throw new Error(`intent proof output amount is greater than input amount: ${o} > ${i}`);
    return Number(i - o);
  }
  e.fee = n;
  function r(s) {
    switch (s.type) {
      case "register":
        return JSON.stringify({
          type: "register",
          onchain_output_indexes: s.onchain_output_indexes,
          valid_at: s.valid_at,
          expire_at: s.expire_at,
          cosigners_public_keys: s.cosigners_public_keys
        });
      case "delete":
        return JSON.stringify({
          type: "delete",
          expire_at: s.expire_at
        });
      case "get-pending-tx":
        return JSON.stringify({
          type: "get-pending-tx",
          expire_at: s.expire_at
        });
    }
  }
  e.encodeMessage = r;
})(We || (We = {}));
const zg = new Uint8Array([mt.RETURN]), jg = new Uint8Array(32).fill(0), Gg = 4294967295, qg = "ark-intent-proof-message";
function Yg(e) {
  if (e.index === void 0)
    throw new Error("intent proof input requires index");
  if (e.txid === void 0)
    throw new Error("intent proof input requires txid");
  if (e.witnessUtxo === void 0)
    throw new Error("intent proof input requires witness utxo");
  return !0;
}
function Zg(e) {
  return e.forEach(Yg), !0;
}
function Xg(e) {
  if (e.amount === void 0)
    throw new Error("intent proof output requires amount");
  if (e.script === void 0)
    throw new Error("intent proof output requires script");
  return !0;
}
function Qg(e) {
  return e.forEach(Xg), !0;
}
function Jg(e, t) {
  const n = ey(e), r = new Ye({
    version: 0
  });
  return r.addInput({
    txid: jg,
    // zero hash
    index: Gg,
    sequence: 0
  }), r.addOutput({
    amount: 0n,
    script: t
  }), r.updateInput(0, {
    finalScriptSig: G.encode(["OP_0", n])
  }), r;
}
function ty(e, t, n) {
  const r = t[0], s = t.map((o) => o.sequence || 0).reduce((o, a) => Math.max(o, a), 0), i = new Ye({
    version: 2,
    lockTime: s
  });
  i.addInput({
    ...r,
    txid: e.id,
    index: 0,
    witnessUtxo: {
      script: r.witnessUtxo.script,
      amount: 0n
    },
    sighashType: mn.ALL
  });
  for (const [o, a] of t.entries())
    i.addInput({
      ...a,
      sighashType: mn.ALL
    }), a.unknown?.length && i.updateInput(o + 1, {
      unknown: a.unknown
    });
  n.length === 0 && (n = [
    {
      amount: 0n,
      script: zg
    }
  ]);
  for (const o of n)
    i.addOutput({
      amount: o.amount,
      script: o.script
    });
  return i;
}
function ey(e) {
  return Qo.utils.taggedHash(qg, new TextEncoder().encode(e));
}
var Et;
(function(e) {
  e.BatchStarted = "batch_started", e.BatchFinalization = "batch_finalization", e.BatchFinalized = "batch_finalized", e.BatchFailed = "batch_failed", e.TreeSigningStarted = "tree_signing_started", e.TreeNonces = "tree_nonces", e.TreeTx = "tree_tx", e.TreeSignature = "tree_signature";
})(Et || (Et = {}));
class wf {
  constructor(t) {
    this.serverUrl = t;
  }
  async getInfo() {
    const t = `${this.serverUrl}/v1/info`, n = await fetch(t);
    if (!n.ok) {
      const s = await n.text();
      ae(s, `Failed to get server info: ${n.statusText}`);
    }
    const r = await n.json();
    return {
      boardingExitDelay: BigInt(r.boardingExitDelay ?? 0),
      checkpointTapscript: r.checkpointTapscript ?? "",
      deprecatedSigners: r.deprecatedSigners?.map((s) => ({
        cutoffDate: BigInt(s.cutoffDate ?? 0),
        pubkey: s.pubkey ?? ""
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
    const r = `${this.serverUrl}/v1/tx/submit`, s = await fetch(r, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        signedArkTx: t,
        checkpointTxs: n
      })
    });
    if (!s.ok) {
      const o = await s.text();
      ae(o, `Failed to submit virtual transaction: ${o}`);
    }
    const i = await s.json();
    return {
      arkTxid: i.arkTxid,
      finalArkTx: i.finalArkTx,
      signedCheckpointTxs: i.signedCheckpointTxs
    };
  }
  async finalizeTx(t, n) {
    const r = `${this.serverUrl}/v1/tx/finalize`, s = await fetch(r, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        arkTxid: t,
        finalCheckpointTxs: n
      })
    });
    if (!s.ok) {
      const i = await s.text();
      ae(i, `Failed to finalize offchain transaction: ${i}`);
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
          message: We.encodeMessage(t.message)
        }
      })
    });
    if (!r.ok) {
      const i = await r.text();
      ae(i, `Failed to register intent: ${i}`);
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
          message: We.encodeMessage(t.message)
        }
      })
    });
    if (!r.ok) {
      const s = await r.text();
      ae(s, `Failed to delete intent: ${s}`);
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
      const s = await r.text();
      ae(s, `Failed to confirm registration: ${s}`);
    }
  }
  async submitTreeNonces(t, n, r) {
    const s = `${this.serverUrl}/v1/batch/tree/submitNonces`, i = await fetch(s, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        batchId: t,
        pubkey: n,
        treeNonces: ny(r)
      })
    });
    if (!i.ok) {
      const o = await i.text();
      ae(o, `Failed to submit tree nonces: ${o}`);
    }
  }
  async submitTreeSignatures(t, n, r) {
    const s = `${this.serverUrl}/v1/batch/tree/submitSignatures`, i = await fetch(s, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        batchId: t,
        pubkey: n,
        treeSignatures: ry(r)
      })
    });
    if (!i.ok) {
      const o = await i.text();
      ae(o, `Failed to submit tree signatures: ${o}`);
    }
  }
  async submitSignedForfeitTxs(t, n) {
    const r = `${this.serverUrl}/v1/batch/submitForfeitTxs`, s = await fetch(r, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        signedForfeitTxs: t,
        signedCommitmentTx: n
      })
    });
    if (!s.ok) {
      const i = await s.text();
      ae(i, `Failed to submit forfeit transactions: ${s.statusText}`);
    }
  }
  async *getEventStream(t, n) {
    const r = `${this.serverUrl}/v1/batch/events`, s = n.length > 0 ? `?${n.map((i) => `topics=${encodeURIComponent(i)}`).join("&")}` : "";
    for (; !t?.aborted; )
      try {
        const i = new EventSource(r + s), o = () => {
          i.close();
        };
        t?.addEventListener("abort", o);
        try {
          for await (const a of fo(i)) {
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
          t?.removeEventListener("abort", o), i.close();
        }
      } catch (i) {
        if (i instanceof Error && i.name === "AbortError")
          break;
        if (ho(i)) {
          console.debug("Timeout error ignored");
          continue;
        }
        throw console.error("Event stream error:", i), i;
      }
  }
  async *getTransactionsStream(t) {
    const n = `${this.serverUrl}/v1/txs`;
    for (; !t?.aborted; )
      try {
        const r = new EventSource(n), s = () => {
          r.close();
        };
        t?.addEventListener("abort", s);
        try {
          for await (const i of fo(r)) {
            if (t?.aborted)
              break;
            try {
              const o = JSON.parse(i.data), a = this.parseTransactionNotification(o);
              a && (yield a);
            } catch (o) {
              throw console.error("Failed to parse transaction notification:", o), o;
            }
          }
        } finally {
          t?.removeEventListener("abort", s), r.close();
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
          message: We.encodeMessage(t.message)
        }
      })
    });
    if (!r.ok) {
      const i = await r.text();
      ae(i, `Failed to get pending transactions: ${i}`);
    }
    return (await r.json()).pendingTxs;
  }
  parseSettlementEvent(t) {
    if (t.batchStarted)
      return {
        type: Et.BatchStarted,
        id: t.batchStarted.id,
        intentIdHashes: t.batchStarted.intentIdHashes,
        batchExpiry: BigInt(t.batchStarted.batchExpiry)
      };
    if (t.batchFinalization)
      return {
        type: Et.BatchFinalization,
        id: t.batchFinalization.id,
        commitmentTx: t.batchFinalization.commitmentTx
      };
    if (t.batchFinalized)
      return {
        type: Et.BatchFinalized,
        id: t.batchFinalized.id,
        commitmentTxid: t.batchFinalized.commitmentTxid
      };
    if (t.batchFailed)
      return {
        type: Et.BatchFailed,
        id: t.batchFailed.id,
        reason: t.batchFailed.reason
      };
    if (t.treeSigningStarted)
      return {
        type: Et.TreeSigningStarted,
        id: t.treeSigningStarted.id,
        cosignersPublicKeys: t.treeSigningStarted.cosignersPubkeys,
        unsignedCommitmentTx: t.treeSigningStarted.unsignedCommitmentTx
      };
    if (t.treeNoncesAggregated)
      return null;
    if (t.treeNonces)
      return {
        type: Et.TreeNonces,
        id: t.treeNonces.id,
        topic: t.treeNonces.topic,
        txid: t.treeNonces.txid,
        nonces: sy(t.treeNonces.nonces)
        // pubkey -> public nonce
      };
    if (t.treeTx) {
      const n = Object.fromEntries(Object.entries(t.treeTx.children).map(([r, s]) => [parseInt(r), s]));
      return {
        type: Et.TreeTx,
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
      type: Et.TreeSignature,
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
        spentVtxos: t.commitmentTx.spentVtxos.map(zr),
        spendableVtxos: t.commitmentTx.spendableVtxos.map(zr),
        checkpointTxs: t.commitmentTx.checkpointTxs
      }
    } : t.arkTx ? {
      arkTx: {
        txid: t.arkTx.txid,
        tx: t.arkTx.tx,
        spentVtxos: t.arkTx.spentVtxos.map(zr),
        spendableVtxos: t.arkTx.spendableVtxos.map(zr),
        checkpointTxs: t.arkTx.checkpointTxs
      }
    } : (t.heartbeat || console.warn("Unknown transaction notification type:", t), null);
  }
}
function ny(e) {
  const t = {};
  for (const [n, r] of e)
    t[n] = v.encode(r.pubNonce);
  return t;
}
function ry(e) {
  const t = {};
  for (const [n, r] of e)
    t[n] = v.encode(r.encode());
  return t;
}
function sy(e) {
  return new Map(Object.entries(e).map(([t, n]) => {
    if (typeof n != "string")
      throw new Error("invalid nonce");
    return [t, { pubNonce: v.decode(n) }];
  }));
}
function ho(e) {
  const t = (n) => n instanceof Error ? n.name === "TypeError" && n.message === "Failed to fetch" || n.name === "HeadersTimeoutError" || n.name === "BodyTimeoutError" || n.code === "UND_ERR_HEADERS_TIMEOUT" || n.code === "UND_ERR_BODY_TIMEOUT" : !1;
  return t(e) || t(e.cause);
}
function zr(e) {
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
function ae(e, t) {
  const n = new Error(e);
  throw Wg(n) ?? new Error(t);
}
class es {
  constructor(t, n = /* @__PURE__ */ new Map()) {
    this.root = t, this.children = n;
  }
  static create(t) {
    if (t.length === 0)
      throw new Error("empty chunks");
    const n = /* @__PURE__ */ new Map();
    for (const i of t) {
      const o = oy(i), a = o.tx.id;
      n.set(a, o);
    }
    const r = [];
    for (const [i] of n) {
      let o = !1;
      for (const [a, c] of n)
        if (a !== i && (o = iy(c, i), o))
          break;
      if (!o) {
        r.push(i);
        continue;
      }
    }
    if (r.length === 0)
      throw new Error("no root chunk found");
    if (r.length > 1)
      throw new Error(`multiple root chunks found: ${r.join(", ")}`);
    const s = mf(r[0], n);
    if (!s)
      throw new Error(`chunk not found for root txid: ${r[0]}`);
    if (s.nbOfNodes() !== t.length)
      throw new Error(`number of chunks (${t.length}) is not equal to the number of nodes in the graph (${s.nbOfNodes()})`);
    return s;
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
    for (const [r, s] of this.children) {
      if (r >= t)
        throw new Error(`output index ${r} is out of bounds (nb of outputs: ${t})`);
      s.validate();
      const i = s.root.getInput(0), o = this.root.id;
      if (!i.txid || v.encode(i.txid) !== o || i.index !== r)
        throw new Error(`input of child ${r} is not the output of the parent`);
      let a = 0n;
      for (let u = 0; u < s.root.outputsLength; u++) {
        const l = s.root.getOutput(u);
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
function iy(e, t) {
  return Object.values(e.children).includes(t);
}
function mf(e, t) {
  const n = t.get(e);
  if (!n)
    return null;
  const r = n.tx, s = /* @__PURE__ */ new Map();
  for (const [i, o] of Object.entries(n.children)) {
    const a = parseInt(i), c = mf(o, t);
    c && s.set(a, c);
  }
  return new es(r, s);
}
function oy(e) {
  return { tx: Qt.fromPSBT(St.decode(e.tx)), children: e.children };
}
var po;
(function(e) {
  let t;
  (function(r) {
    r.Start = "start", r.BatchStarted = "batch_started", r.TreeSigningStarted = "tree_signing_started", r.TreeNoncesAggregated = "tree_nonces_aggregated", r.BatchFinalization = "batch_finalization";
  })(t || (t = {}));
  async function n(r, s, i = {}) {
    const { abortController: o, skipVtxoTreeSigning: a = !1, eventCallback: c } = i;
    let u = t.Start;
    const l = [], f = [];
    let h, p;
    for await (const y of r) {
      if (o?.signal.aborted)
        throw new Error("canceled");
      switch (c && c(y).catch(() => {
      }), y.type) {
        case Et.BatchStarted: {
          const d = y, { skip: g } = await s.onBatchStarted(d);
          g || (u = t.BatchStarted, a && (u = t.TreeNoncesAggregated));
          continue;
        }
        case Et.BatchFinalized: {
          if (u !== t.BatchFinalization)
            continue;
          return s.onBatchFinalized && await s.onBatchFinalized(y), y.commitmentTxid;
        }
        case Et.BatchFailed: {
          if (s.onBatchFailed) {
            await s.onBatchFailed(y);
            continue;
          }
          throw new Error(y.reason);
        }
        case Et.TreeTx: {
          if (u !== t.BatchStarted && u !== t.TreeNoncesAggregated)
            continue;
          y.batchIndex === 0 ? l.push(y.chunk) : f.push(y.chunk), s.onTreeTxEvent && await s.onTreeTxEvent(y);
          continue;
        }
        case Et.TreeSignature: {
          if (u !== t.TreeNoncesAggregated)
            continue;
          if (!h)
            throw new Error("vtxo tree not initialized");
          const d = v.decode(y.signature);
          h.update(y.txid, (g) => {
            g.updateInput(0, {
              tapKeySig: d
            });
          }), s.onTreeSignatureEvent && await s.onTreeSignatureEvent(y);
          continue;
        }
        case Et.TreeSigningStarted: {
          if (u !== t.BatchStarted)
            continue;
          h = es.create(l);
          const { skip: d } = await s.onTreeSigningStarted(y, h);
          d || (u = t.TreeSigningStarted);
          continue;
        }
        case Et.TreeNonces: {
          if (u !== t.TreeSigningStarted)
            continue;
          const { fullySigned: d } = await s.onTreeNonces(y);
          d && (u = t.TreeNoncesAggregated);
          continue;
        }
        case Et.BatchFinalization: {
          if (u !== t.TreeNoncesAggregated)
            continue;
          if (!h && l.length > 0 && (h = es.create(l)), !h && !a)
            throw new Error("vtxo tree not initialized");
          f.length > 0 && (p = es.create(f)), await s.onBatchFinalization(y, h, p), u = t.BatchFinalization;
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
const ay = (e) => cy[e], cy = {
  bitcoin: er(Vn, "ark"),
  testnet: er(Dr, "tark"),
  signet: er(Dr, "tark"),
  mutinynet: er(Dr, "tark"),
  regtest: er({
    ...Dr,
    bech32: "bcrt",
    pubKeyHash: 111,
    scriptHash: 196
  }, "tark")
};
function er(e, t) {
  return {
    ...e,
    hrp: t
  };
}
const uy = {
  bitcoin: "https://mempool.space/api",
  testnet: "https://mempool.space/testnet/api",
  signet: "https://mempool.space/signet/api",
  mutinynet: "https://mutinynet.com/api",
  regtest: "http://localhost:3000"
};
class ly {
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
    const s = await fetch(`${this.baseUrl}/tx/${t}/status`);
    if (!s.ok)
      throw new Error(`Failed to get transaction status: ${s.statusText}`);
    const i = await s.json();
    return i.confirmed ? {
      confirmed: i.confirmed,
      blockTime: i.block_time,
      blockHeight: i.block_height
    } : { confirmed: !1 };
  }
  async watchAddresses(t, n) {
    let r = null;
    const s = this.baseUrl.replace(/^http(s)?:/, "ws$1:") + "/v1/ws", i = async () => {
      const c = async () => (await Promise.all(t.map((p) => this.getTransactions(p)))).flat(), u = await c(), l = (h) => `${h.txid}_${h.status.block_time}`, f = new Set(u.map(l));
      r = setInterval(async () => {
        try {
          const p = (await c()).filter((y) => !f.has(l(y)));
          p.length > 0 && (p.forEach((y) => f.add(l(y))), n(p));
        } catch (h) {
          console.error("Error in polling mechanism:", h);
        }
      }, this.pollingInterval);
    };
    let o = null;
    const a = () => {
      o && o.close(), r && clearInterval(r);
    };
    if (this.forcePolling)
      return await i(), a;
    try {
      o = new WebSocket(s), o.addEventListener("open", () => {
        const c = {
          "track-addresses": t
        };
        o.send(JSON.stringify(c));
      }), o.addEventListener("message", (c) => {
        try {
          const u = [], l = JSON.parse(c.data.toString());
          if (!l["multi-address-transactions"])
            return;
          const f = l["multi-address-transactions"];
          for (const h in f)
            for (const p of [
              "mempool",
              "confirmed",
              "removed"
            ])
              f[h][p] && u.push(...f[h][p].filter(dy));
          u.length > 0 && n(u);
        } catch (u) {
          console.error("Failed to process WebSocket message:", u);
        }
      }), o.addEventListener("error", async () => {
        await i();
      });
    } catch {
      r && clearInterval(r), await i();
    }
    return a;
  }
  async getChainTip() {
    const t = await fetch(`${this.baseUrl}/blocks/tip`);
    if (!t.ok)
      throw new Error(`Failed to get chain tip: ${t.statusText}`);
    const n = await t.json();
    if (!fy(n))
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
      const s = await r.text();
      throw new Error(`Failed to broadcast package: ${s}`);
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
function fy(e) {
  return Array.isArray(e) && e.every((t) => t && typeof t == "object" && typeof t.id == "string" && t.id.length > 0 && typeof t.height == "number" && t.height >= 0 && typeof t.mediantime == "number" && t.mediantime > 0);
}
const dy = (e) => typeof e.txid == "string" && Array.isArray(e.vout) && e.vout.every((t) => typeof t.scriptpubkey_address == "string" && typeof t.value == "number") && typeof e.status == "object" && typeof e.status.confirmed == "boolean", hy = 0n, py = new Uint8Array([81, 2, 78, 115]), ia = {
  script: py,
  amount: hy
};
v.encode(ia.script);
function gy(e, t, n) {
  const r = new Ye({
    version: 3,
    lockTime: n
  });
  let s = 0n;
  for (const i of e) {
    if (!i.witnessUtxo)
      throw new Error("input needs witness utxo");
    s += i.witnessUtxo.amount, r.addInput(i);
  }
  return r.addOutput({
    script: t,
    amount: s
  }), r.addOutput(ia), r;
}
const yy = new Error("invalid settlement transaction outputs"), wy = new Error("empty tree"), my = new Error("invalid number of inputs"), Si = new Error("wrong settlement txid"), by = new Error("invalid amount"), Ey = new Error("no leaves"), xy = new Error("invalid taproot script"), bc = new Error("invalid round transaction outputs"), Ty = new Error("wrong commitment txid"), Sy = new Error("missing cosigners public keys"), vi = 0, Ec = 1;
function vy(e, t) {
  if (t.validate(), t.root.inputsLength !== 1)
    throw my;
  const n = t.root.getInput(0), r = Qt.fromPSBT(St.decode(e));
  if (r.outputsLength <= Ec)
    throw yy;
  const s = r.id;
  if (!n.txid || v.encode(n.txid) !== s || n.index !== Ec)
    throw Si;
}
function Ay(e, t, n) {
  if (t.outputsLength < vi + 1)
    throw bc;
  const r = t.getOutput(vi)?.amount;
  if (!r)
    throw bc;
  if (!e.root)
    throw wy;
  const s = e.root.getInput(0), i = t.id;
  if (!s.txid || v.encode(s.txid) !== i || s.index !== vi)
    throw Ty;
  let o = 0n;
  for (let c = 0; c < e.root.outputsLength; c++) {
    const u = e.root.getOutput(c);
    u?.amount && (o += u.amount);
  }
  if (o !== r)
    throw by;
  if (e.leaves().length === 0)
    throw Ey;
  e.validate();
  for (const c of e.iterator())
    for (const [u, l] of c.children) {
      const f = c.root.getOutput(u);
      if (!f?.script)
        throw new Error(`parent output ${u} not found`);
      const h = f.script.slice(2);
      if (h.length !== 32)
        throw new Error(`parent output ${u} has invalid script`);
      const p = co(l.root, 0, uo);
      if (p.length === 0)
        throw Sy;
      const y = p.map((g) => g.key), { finalKey: d } = Jo(y, !0, {
        taprootTweak: n
      });
      if (!d || v.encode(d.slice(1)) !== v.encode(h))
        throw xy;
    }
}
function Iy(e, t, n) {
  let r = !1;
  for (const [o, a] of t.entries()) {
    if (!a.script)
      throw new Error(`missing output script ${o}`);
    if (G.decode(a.script)[0] === "RETURN") {
      if (r)
        throw new Error("multiple OP_RETURN outputs");
      r = !0;
    }
  }
  const s = e.map((o) => ky(o, n));
  return {
    arkTx: bf(s.map((o) => o.input), t),
    checkpoints: s.map((o) => o.tx)
  };
}
function bf(e, t) {
  let n = 0n;
  for (const s of e) {
    const i = hf(fr(s.tapLeafScript));
    if (Kn.is(i)) {
      if (n !== 0n && xc(n) !== xc(i.params.absoluteTimelock))
        throw new Error("cannot mix seconds and blocks locktime");
      i.params.absoluteTimelock > n && (n = i.params.absoluteTimelock);
    }
  }
  const r = new Ye({
    version: 3,
    lockTime: Number(n)
  });
  for (const [s, i] of e.entries())
    r.addInput({
      txid: i.txid,
      index: i.vout,
      sequence: n ? Mo - 1 : void 0,
      witnessUtxo: {
        script: zt.decode(i.tapTree).pkScript,
        amount: BigInt(i.value)
      },
      tapLeafScript: [i.tapLeafScript]
    }), Vg(r, s, df, i.tapTree);
  for (const s of t)
    r.addOutput(s);
  return r.addOutput(ia), r;
}
function ky(e, t) {
  const n = hf(fr(e.tapLeafScript)), r = new zt([
    t.script,
    n.script
  ]), s = bf([e], [
    {
      amount: BigInt(e.value),
      script: r.pkScript
    }
  ]), i = r.findLeaf(v.encode(n.script)), o = {
    txid: s.id,
    vout: 0,
    value: e.value,
    tapLeafScript: i,
    tapTree: r.encode()
  };
  return {
    tx: s,
    input: o
  };
}
const Cy = 500000000n;
function xc(e) {
  return e >= Cy;
}
function Oy(e, t) {
  if (!e.status.block_time)
    return !1;
  if (t.value === 0n)
    return !0;
  if (t.type === "blocks")
    return !1;
  const n = BigInt(Math.floor(Date.now() / 1e3));
  return BigInt(Math.floor(e.status.block_time)) + t.value <= n;
}
const By = 4320 * 60 * 1e3, Ny = {
  thresholdMs: By
  // 3 days
};
class yt {
  constructor(t, n, r = yt.DefaultHRP) {
    this.preimage = t, this.value = n, this.HRP = r, this.vout = 0;
    const s = vt(this.preimage);
    this.vtxoScript = new zt([Uy(s)]);
    const i = this.vtxoScript.leaves[0];
    this.txid = v.encode(new Uint8Array(s).reverse()), this.tapTree = this.vtxoScript.encode(), this.forfeitTapLeafScript = i, this.intentTapLeafScript = i, this.value = n, this.status = { confirmed: !0 }, this.extraWitness = [this.preimage];
  }
  encode() {
    const t = new Uint8Array(yt.Length);
    return t.set(this.preimage, 0), Ry(t, this.value, this.preimage.length), t;
  }
  static decode(t, n = yt.DefaultHRP) {
    if (t.length !== yt.Length)
      throw new Error(`invalid data length: expected ${yt.Length} bytes, got ${t.length}`);
    const r = t.subarray(0, yt.PreimageLength), s = $y(t, yt.PreimageLength);
    return new yt(r, s, n);
  }
  static fromString(t, n = yt.DefaultHRP) {
    if (t = t.trim(), !t.startsWith(n))
      throw new Error(`invalid human-readable part: expected ${n} prefix (note '${t}')`);
    const r = t.slice(n.length), s = Di.decode(r);
    if (s.length === 0)
      throw new Error("failed to decode base58 string");
    return yt.decode(s, n);
  }
  toString() {
    return this.HRP + Di.encode(this.encode());
  }
}
yt.DefaultHRP = "arknote";
yt.PreimageLength = 32;
yt.ValueLength = 4;
yt.Length = yt.PreimageLength + yt.ValueLength;
yt.FakeOutpointIndex = 0;
function Ry(e, t, n) {
  new DataView(e.buffer, e.byteOffset + n, 4).setUint32(0, t, !1);
}
function $y(e, t) {
  return new DataView(e.buffer, e.byteOffset + t, 4).getUint32(0, !1);
}
function Uy(e) {
  return G.encode(["SHA256", e, "EQUAL"]);
}
var go;
(function(e) {
  e[e.INDEXER_TX_TYPE_UNSPECIFIED = 0] = "INDEXER_TX_TYPE_UNSPECIFIED", e[e.INDEXER_TX_TYPE_RECEIVED = 1] = "INDEXER_TX_TYPE_RECEIVED", e[e.INDEXER_TX_TYPE_SENT = 2] = "INDEXER_TX_TYPE_SENT";
})(go || (go = {}));
var $n;
(function(e) {
  e.UNSPECIFIED = "INDEXER_CHAINED_TX_TYPE_UNSPECIFIED", e.COMMITMENT = "INDEXER_CHAINED_TX_TYPE_COMMITMENT", e.ARK = "INDEXER_CHAINED_TX_TYPE_ARK", e.TREE = "INDEXER_CHAINED_TX_TYPE_TREE", e.CHECKPOINT = "INDEXER_CHAINED_TX_TYPE_CHECKPOINT";
})($n || ($n = {}));
class Ef {
  constructor(t) {
    this.serverUrl = t;
  }
  async getVtxoTree(t, n) {
    let r = `${this.serverUrl}/v1/indexer/batch/${t.txid}/${t.vout}/tree`;
    const s = new URLSearchParams();
    n && (n.pageIndex !== void 0 && s.append("page.index", n.pageIndex.toString()), n.pageSize !== void 0 && s.append("page.size", n.pageSize.toString())), s.toString() && (r += "?" + s.toString());
    const i = await fetch(r);
    if (!i.ok)
      throw new Error(`Failed to fetch vtxo tree: ${i.statusText}`);
    const o = await i.json();
    if (!Gt.isVtxoTreeResponse(o))
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
    const s = new URLSearchParams();
    n && (n.pageIndex !== void 0 && s.append("page.index", n.pageIndex.toString()), n.pageSize !== void 0 && s.append("page.size", n.pageSize.toString())), s.toString() && (r += "?" + s.toString());
    const i = await fetch(r);
    if (!i.ok)
      throw new Error(`Failed to fetch vtxo tree leaves: ${i.statusText}`);
    const o = await i.json();
    if (!Gt.isVtxoTreeLeavesResponse(o))
      throw new Error("Invalid vtxos tree leaves data received");
    return o;
  }
  async getBatchSweepTransactions(t) {
    const n = `${this.serverUrl}/v1/indexer/batch/${t.txid}/${t.vout}/sweepTxs`, r = await fetch(n);
    if (!r.ok)
      throw new Error(`Failed to fetch batch sweep transactions: ${r.statusText}`);
    const s = await r.json();
    if (!Gt.isBatchSweepTransactionsResponse(s))
      throw new Error("Invalid batch sweep transactions data received");
    return s;
  }
  async getCommitmentTx(t) {
    const n = `${this.serverUrl}/v1/indexer/commitmentTx/${t}`, r = await fetch(n);
    if (!r.ok)
      throw new Error(`Failed to fetch commitment tx: ${r.statusText}`);
    const s = await r.json();
    if (!Gt.isCommitmentTx(s))
      throw new Error("Invalid commitment tx data received");
    return s;
  }
  async getCommitmentTxConnectors(t, n) {
    let r = `${this.serverUrl}/v1/indexer/commitmentTx/${t}/connectors`;
    const s = new URLSearchParams();
    n && (n.pageIndex !== void 0 && s.append("page.index", n.pageIndex.toString()), n.pageSize !== void 0 && s.append("page.size", n.pageSize.toString())), s.toString() && (r += "?" + s.toString());
    const i = await fetch(r);
    if (!i.ok)
      throw new Error(`Failed to fetch commitment tx connectors: ${i.statusText}`);
    const o = await i.json();
    if (!Gt.isConnectorsResponse(o))
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
    const s = new URLSearchParams();
    n && (n.pageIndex !== void 0 && s.append("page.index", n.pageIndex.toString()), n.pageSize !== void 0 && s.append("page.size", n.pageSize.toString())), s.toString() && (r += "?" + s.toString());
    const i = await fetch(r);
    if (!i.ok)
      throw new Error(`Failed to fetch commitment tx forfeitTxs: ${i.statusText}`);
    const o = await i.json();
    if (!Gt.isForfeitTxsResponse(o))
      throw new Error("Invalid commitment tx forfeitTxs data received");
    return o;
  }
  async *getSubscription(t, n) {
    const r = `${this.serverUrl}/v1/indexer/script/subscription/${t}`;
    for (; !n?.aborted; )
      try {
        const s = new EventSource(r), i = () => {
          s.close();
        };
        n?.addEventListener("abort", i);
        try {
          for await (const o of fo(s)) {
            if (n?.aborted)
              break;
            try {
              const a = JSON.parse(o.data);
              a.event && (yield {
                txid: a.event.txid,
                scripts: a.event.scripts || [],
                newVtxos: (a.event.newVtxos || []).map(jr),
                spentVtxos: (a.event.spentVtxos || []).map(jr),
                sweptVtxos: (a.event.sweptVtxos || []).map(jr),
                tx: a.event.tx,
                checkpointTxs: a.event.checkpointTxs
              });
            } catch (a) {
              throw console.error("Failed to parse subscription event:", a), a;
            }
          }
        } finally {
          n?.removeEventListener("abort", i), s.close();
        }
      } catch (s) {
        if (s instanceof Error && s.name === "AbortError")
          break;
        if (ho(s)) {
          console.debug("Timeout error ignored");
          continue;
        }
        throw console.error("Subscription error:", s), s;
      }
  }
  async getVirtualTxs(t, n) {
    let r = `${this.serverUrl}/v1/indexer/virtualTx/${t.join(",")}`;
    const s = new URLSearchParams();
    n && (n.pageIndex !== void 0 && s.append("page.index", n.pageIndex.toString()), n.pageSize !== void 0 && s.append("page.size", n.pageSize.toString())), s.toString() && (r += "?" + s.toString());
    const i = await fetch(r);
    if (!i.ok)
      throw new Error(`Failed to fetch virtual txs: ${i.statusText}`);
    const o = await i.json();
    if (!Gt.isVirtualTxsResponse(o))
      throw new Error("Invalid virtual txs data received");
    return o;
  }
  async getVtxoChain(t, n) {
    let r = `${this.serverUrl}/v1/indexer/vtxo/${t.txid}/${t.vout}/chain`;
    const s = new URLSearchParams();
    n && (n.pageIndex !== void 0 && s.append("page.index", n.pageIndex.toString()), n.pageSize !== void 0 && s.append("page.size", n.pageSize.toString())), s.toString() && (r += "?" + s.toString());
    const i = await fetch(r);
    if (!i.ok)
      throw new Error(`Failed to fetch vtxo chain: ${i.statusText}`);
    const o = await i.json();
    if (!Gt.isVtxoChainResponse(o))
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
    const s = await fetch(n);
    if (!s.ok)
      throw new Error(`Failed to fetch vtxos: ${s.statusText}`);
    const i = await s.json();
    if (!Gt.isVtxosResponse(i))
      throw new Error("Invalid vtxos data received");
    return {
      vtxos: i.vtxos.map(jr),
      page: i.page
    };
  }
  async subscribeForScripts(t, n) {
    const r = `${this.serverUrl}/v1/indexer/script/subscribe`, s = await fetch(r, {
      headers: {
        "Content-Type": "application/json"
      },
      method: "POST",
      body: JSON.stringify({ scripts: t, subscriptionId: n })
    });
    if (!s.ok) {
      const o = await s.text();
      throw new Error(`Failed to subscribe to scripts: ${o}`);
    }
    const i = await s.json();
    if (!i.subscriptionId)
      throw new Error("Subscription ID not found");
    return i.subscriptionId;
  }
  async unsubscribeForScripts(t, n) {
    const r = `${this.serverUrl}/v1/indexer/script/unsubscribe`, s = await fetch(r, {
      headers: {
        "Content-Type": "application/json"
      },
      method: "POST",
      body: JSON.stringify({ subscriptionId: t, scripts: n })
    });
    if (!s.ok) {
      const i = await s.text();
      console.warn(`Failed to unsubscribe to scripts: ${i}`);
    }
  }
}
function jr(e) {
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
var Gt;
(function(e) {
  function t(T) {
    return typeof T == "object" && typeof T.totalOutputAmount == "string" && typeof T.totalOutputVtxos == "number" && typeof T.expiresAt == "string" && typeof T.swept == "boolean";
  }
  function n(T) {
    return typeof T == "object" && typeof T.txid == "string" && typeof T.expiresAt == "string" && Object.values($n).includes(T.type) && Array.isArray(T.spends) && T.spends.every((et) => typeof et == "string");
  }
  function r(T) {
    return typeof T == "object" && typeof T.startedAt == "string" && typeof T.endedAt == "string" && typeof T.totalInputAmount == "string" && typeof T.totalInputVtxos == "number" && typeof T.totalOutputAmount == "string" && typeof T.totalOutputVtxos == "number" && typeof T.batches == "object" && Object.values(T.batches).every(t);
  }
  e.isCommitmentTx = r;
  function s(T) {
    return typeof T == "object" && typeof T.txid == "string" && typeof T.vout == "number";
  }
  e.isOutpoint = s;
  function i(T) {
    return Array.isArray(T) && T.every(s);
  }
  e.isOutpointArray = i;
  function o(T) {
    return typeof T == "object" && typeof T.txid == "string" && typeof T.children == "object" && Object.values(T.children).every(l) && Object.keys(T.children).every((et) => Number.isInteger(Number(et)));
  }
  function a(T) {
    return Array.isArray(T) && T.every(o);
  }
  e.isTxsArray = a;
  function c(T) {
    return typeof T == "object" && typeof T.amount == "string" && typeof T.createdAt == "string" && typeof T.isSettled == "boolean" && typeof T.settledBy == "string" && Object.values(go).includes(T.type) && (!T.commitmentTxid && typeof T.virtualTxid == "string" || typeof T.commitmentTxid == "string" && !T.virtualTxid);
  }
  function u(T) {
    return Array.isArray(T) && T.every(c);
  }
  e.isTxHistoryRecordArray = u;
  function l(T) {
    return typeof T == "string" && T.length === 64;
  }
  function f(T) {
    return Array.isArray(T) && T.every(l);
  }
  e.isTxidArray = f;
  function h(T) {
    return typeof T == "object" && s(T.outpoint) && typeof T.createdAt == "string" && (T.expiresAt === null || typeof T.expiresAt == "string") && typeof T.amount == "string" && typeof T.script == "string" && typeof T.isPreconfirmed == "boolean" && typeof T.isSwept == "boolean" && typeof T.isUnrolled == "boolean" && typeof T.isSpent == "boolean" && (!T.spentBy || typeof T.spentBy == "string") && (!T.settledBy || typeof T.settledBy == "string") && (!T.arkTxid || typeof T.arkTxid == "string") && Array.isArray(T.commitmentTxids) && T.commitmentTxids.every(l);
  }
  function p(T) {
    return typeof T == "object" && typeof T.current == "number" && typeof T.next == "number" && typeof T.total == "number";
  }
  function y(T) {
    return typeof T == "object" && Array.isArray(T.vtxoTree) && T.vtxoTree.every(o) && (!T.page || p(T.page));
  }
  e.isVtxoTreeResponse = y;
  function d(T) {
    return typeof T == "object" && Array.isArray(T.leaves) && T.leaves.every(s) && (!T.page || p(T.page));
  }
  e.isVtxoTreeLeavesResponse = d;
  function g(T) {
    return typeof T == "object" && Array.isArray(T.connectors) && T.connectors.every(o) && (!T.page || p(T.page));
  }
  e.isConnectorsResponse = g;
  function w(T) {
    return typeof T == "object" && Array.isArray(T.txids) && T.txids.every(l) && (!T.page || p(T.page));
  }
  e.isForfeitTxsResponse = w;
  function A(T) {
    return typeof T == "object" && Array.isArray(T.sweptBy) && T.sweptBy.every(l);
  }
  e.isSweptCommitmentTxResponse = A;
  function O(T) {
    return typeof T == "object" && Array.isArray(T.sweptBy) && T.sweptBy.every(l);
  }
  e.isBatchSweepTransactionsResponse = O;
  function P(T) {
    return typeof T == "object" && Array.isArray(T.txs) && T.txs.every((et) => typeof et == "string") && (!T.page || p(T.page));
  }
  e.isVirtualTxsResponse = P;
  function V(T) {
    return typeof T == "object" && Array.isArray(T.chain) && T.chain.every(n) && (!T.page || p(T.page));
  }
  e.isVtxoChainResponse = V;
  function Y(T) {
    return typeof T == "object" && Array.isArray(T.vtxos) && T.vtxos.every(h) && (!T.page || p(T.page));
  }
  e.isVtxosResponse = Y;
})(Gt || (Gt = {}));
const Py = 546;
function Ie(e, t) {
  return {
    ...t,
    forfeitTapLeafScript: e.offchainTapscript.forfeit(),
    intentTapLeafScript: e.offchainTapscript.forfeit(),
    tapTree: e.offchainTapscript.encode()
  };
}
function yo(e, t) {
  return {
    ...t,
    forfeitTapLeafScript: e.boardingTapscript.forfeit(),
    intentTapLeafScript: e.boardingTapscript.forfeit(),
    tapTree: e.boardingTapscript.encode()
  };
}
class ct extends Error {
  #t;
  constructor(t, n, r) {
    super(t, { cause: r }), this.name = "ParseError", this.#t = n, n?.input && (this.message = zn(this.message, n));
  }
  get node() {
    return this.#t;
  }
  withAst(t) {
    return this.#t ? this : (this.#t = t, t?.input ? (this.message = zn(this.message, t), this) : this);
  }
}
class j extends Error {
  #t;
  constructor(t, n, r) {
    super(t, { cause: r }), this.name = "EvaluationError", this.#t = n, n?.input && (this.message = zn(this.message, n));
  }
  get node() {
    return this.#t;
  }
  withAst(t) {
    return this.#t ? this : (this.#t = t, t?.input ? (this.message = zn(this.message, t), this) : this);
  }
}
let _y = class extends Error {
  #t;
  constructor(t, n, r) {
    super(t, { cause: r }), this.name = "TypeError", this.#t = n, n?.input && (this.message = zn(this.message, n));
  }
  get node() {
    return this.#t;
  }
  withAst(t) {
    return this.#t ? this : (this.#t = t, t?.input ? (this.message = zn(this.message, t), this) : this);
  }
};
function zn(e, t) {
  if (t?.pos === void 0) return e;
  const n = t.pos, r = t.input;
  let s = 1, i = 0, o = 0;
  for (; i < n; )
    r[i] === `
` ? (s++, o = 0) : o++, i++;
  let a = n, c = n;
  for (; a > 0 && r[a - 1] !== `
`; ) a--;
  for (; c < r.length && r[c] !== `
`; ) c++;
  const u = r.slice(a, c), l = `${s}`.padStart(4, " "), f = " ".repeat(9 + o);
  return `${e}

> ${l} | ${u}
${f}^`;
}
class he {
  #t;
  constructor(t) {
    this.#t = t;
  }
  static of(t) {
    return t === void 0 ? Rs : new he(t);
  }
  static none() {
    return Rs;
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
    if (t instanceof he) return t;
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
const Rs = Object.freeze(new he());
class xf {
}
const Tf = new xf();
function Ly(e, t) {
  e.constants.set("optional", t ? Tf : void 0);
}
function Dy(e) {
  const t = (f, h) => e.registerFunctionOverload(f, h), n = e.enableOptionalTypes ? Tf : void 0;
  e.registerType("OptionalNamespace", xf), e.registerConstant("optional", "OptionalNamespace", n), t("optional.hasValue(): bool", (f) => f.hasValue()), t("optional<A>.value(): A", (f) => f.value()), e.registerFunctionOverload("OptionalNamespace.none(): optional<T>", () => he.none()), t("OptionalNamespace.of(A): optional<A>", (f, h) => he.of(h));
  function r(f, h, p) {
    if (f instanceof he) return f;
    throw new j(`${p} must be optional`, h);
  }
  function s(f, h, p) {
    const y = f.eval(h.receiver, p);
    return y instanceof Promise ? y.then((d) => i(d, f, h, p)) : i(y, f, h, p);
  }
  function i(f, h, p, y) {
    const d = r(f, p.receiver, `${p.functionDesc} receiver`);
    return d.hasValue() ? p.onHasValue(d) : p.onEmpty(h, p, y);
  }
  function o(f, h, p, y) {
    const d = f.check(h, p);
    if (d.kind === "optional") return d;
    if (d.kind === "dyn") return f.getType("optional");
    throw new f.Error(`${y} must be optional, got '${d}'`, h);
  }
  function a({ functionDesc: f, evaluate: h, typeCheck: p, onHasValue: y, onEmpty: d }) {
    return ({ args: g, receiver: w }) => ({
      functionDesc: f,
      receiver: w,
      arg: g[0],
      evaluate: h,
      typeCheck: p,
      onHasValue: y,
      onEmpty: d
    });
  }
  const c = "optional.orValue() receiver", u = "optional.or(optional) receiver", l = "optional.or(optional) argument";
  e.registerFunctionOverload(
    "optional.or(ast): optional<dyn>",
    a({
      functionDesc: "optional.or(optional)",
      evaluate: s,
      typeCheck(f, h, p) {
        const y = o(f, h.receiver, p, u), d = o(f, h.arg, p, l), g = y.unify(f.registry, d);
        if (g) return g;
        throw new f.Error(
          `${h.functionDesc} argument must be compatible type, got '${y}' and '${d}'`,
          h.arg
        );
      },
      onHasValue: (f) => f,
      onEmpty(f, h, p) {
        const y = h.arg, d = f.eval(y, p);
        return d instanceof Promise ? d.then((g) => r(g, y, l)) : r(d, y, l);
      }
    })
  ), e.registerFunctionOverload(
    "optional.orValue(ast): dyn",
    a({
      functionDesc: "optional.orValue(value)",
      onHasValue: (f) => f.value(),
      onEmpty(f, h, p) {
        return f.eval(h.arg, p);
      },
      evaluate: s,
      typeCheck(f, h, p) {
        const y = o(f, h.receiver, p, c).valueType, d = f.check(h.arg, p), g = y.unify(f.registry, d);
        if (g) return g;
        throw new f.Error(
          `${h.functionDesc} argument must be compatible type, got '${y}' and '${d}'`,
          h.arg
        );
      }
    })
  );
}
class an {
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
const Vy = {
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
    const n = BigInt(Math.trunc(t * 1e6)), r = n / 1000000000n, s = Number(n % 1000000000n);
    return new Ke(r, s);
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
function My(e) {
  const t = (d, g) => e.registerFunctionOverload(d, g), n = (d) => d;
  t("dyn(dyn): dyn", n);
  for (const d in dr) {
    const g = dr[d];
    g instanceof Ut && t(`type(${g.name}): type`, () => g);
  }
  t("bool(bool): bool", n), t("bool(string): bool", (d) => {
    switch (d) {
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
        throw new j(`bool() conversion error: invalid string value "${d}"`);
    }
  });
  const r = Object.keys;
  t("size(string): int", (d) => BigInt(Tc(d))), t("size(bytes): int", (d) => BigInt(d.length)), t("size(list): int", (d) => BigInt(d.length ?? d.size)), t(
    "size(map): int",
    (d) => BigInt(d instanceof Map ? d.size : r(d).length)
  ), t("string.size(): int", (d) => BigInt(Tc(d))), t("bytes.size(): int", (d) => BigInt(d.length)), t("list.size(): int", (d) => BigInt(d.length ?? d.size)), t(
    "map.size(): int",
    (d) => BigInt(d instanceof Map ? d.size : r(d).length)
  ), t("bytes(string): bytes", (d) => o.fromString(d)), t("bytes(bytes): bytes", n), t("double(double): double", n), t("double(int): double", (d) => Number(d)), t("double(uint): double", (d) => Number(d)), t("double(string): double", (d) => {
    if (!d || d !== d.trim())
      throw new j("double() type error: cannot convert to double");
    switch (d.toLowerCase()) {
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
        const w = Number(d);
        if (!Number.isNaN(w)) return w;
        throw new j("double() type error: cannot convert to double");
      }
    }
  }), t("int(int): int", n), t("int(double): int", (d) => {
    if (Number.isFinite(d)) return BigInt(Math.trunc(d));
    throw new j("int() type error: integer overflow");
  }), t("int(string): int", (d) => {
    if (d !== d.trim() || d.length > 20 || d.includes("0x"))
      throw new j("int() type error: cannot convert to int");
    try {
      const g = BigInt(d);
      if (g <= 9223372036854775807n && g >= -9223372036854775808n) return g;
    } catch {
    }
    throw new j("int() type error: cannot convert to int");
  }), t("uint(uint): uint", n), t("uint(double): uint", (d) => {
    if (Number.isFinite(d)) return BigInt(Math.trunc(d));
    throw new j("int() type error: integer overflow");
  }), t("uint(string): uint", (d) => {
    if (d !== d.trim() || d.length > 20 || d.includes("0x"))
      throw new j("uint() type error: cannot convert to uint");
    try {
      const g = BigInt(d);
      if (g <= 18446744073709551615n && g >= 0n) return g;
    } catch {
    }
    throw new j("uint() type error: cannot convert to uint");
  }), t("string(string): string", n), t("string(bool): string", (d) => `${d}`), t("string(int): string", (d) => `${d}`), t("string(bytes): string", (d) => o.toUtf8(d)), t("string(double): string", (d) => d === 1 / 0 ? "+Inf" : d === -1 / 0 ? "-Inf" : `${d}`), t("string.startsWith(string): bool", (d, g) => d.startsWith(g)), t("string.endsWith(string): bool", (d, g) => d.endsWith(g)), t("string.contains(string): bool", (d, g) => d.includes(g)), t("string.lowerAscii(): string", (d) => d.toLowerCase()), t("string.upperAscii(): string", (d) => d.toUpperCase()), t("string.trim(): string", (d) => d.trim()), t(
    "string.indexOf(string): int",
    (d, g) => BigInt(d.indexOf(g))
  ), t("string.indexOf(string, int): int", (d, g, w) => {
    if (g === "") return w;
    if (w = Number(w), w < 0 || w >= d.length)
      throw new j("string.indexOf(search, fromIndex): fromIndex out of range");
    return BigInt(d.indexOf(g, w));
  }), t(
    "string.lastIndexOf(string): int",
    (d, g) => BigInt(d.lastIndexOf(g))
  ), t("string.lastIndexOf(string, int): int", (d, g, w) => {
    if (g === "") return w;
    if (w = Number(w), w < 0 || w >= d.length)
      throw new j("string.lastIndexOf(search, fromIndex): fromIndex out of range");
    return BigInt(d.lastIndexOf(g, w));
  }), t("string.substring(int): string", (d, g) => {
    if (g = Number(g), g < 0 || g > d.length)
      throw new j("string.substring(start, end): start index out of range");
    return d.substring(g);
  }), t("string.substring(int, int): string", (d, g, w) => {
    if (g = Number(g), g < 0 || g > d.length)
      throw new j("string.substring(start, end): start index out of range");
    if (w = Number(w), w < g || w > d.length)
      throw new j("string.substring(start, end): end index out of range");
    return d.substring(g, w);
  }), t("string.matches(string): bool", (d, g) => {
    try {
      return new RegExp(g).test(d);
    } catch {
      throw new j(`Invalid regular expression: ${g}`);
    }
  }), t("string.split(string): list<string>", (d, g) => d.split(g)), t("string.split(string, int): list<string>", (d, g, w) => {
    if (w = Number(w), w === 0) return [];
    const A = d.split(g);
    if (w < 0 || A.length <= w) return A;
    const O = A.slice(0, w - 1);
    return O.push(A.slice(w - 1).join(g)), O;
  }), t("list<string>.join(): string", (d) => {
    for (let g = 0; g < d.length; g++)
      if (typeof d[g] != "string")
        throw new j("string.join(): list must contain only strings");
    return d.join("");
  }), t("list<string>.join(string): string", (d, g) => {
    for (let w = 0; w < d.length; w++)
      if (typeof d[w] != "string")
        throw new j("string.join(separator): list must contain only strings");
    return d.join(g);
  });
  const s = new TextEncoder("utf8"), i = new TextDecoder("utf8"), o = typeof Buffer < "u" ? {
    byteLength: (d) => Buffer.byteLength(d),
    fromString: (d) => Buffer.from(d, "utf8"),
    toHex: (d) => Buffer.prototype.hexSlice.call(d, 0, d.length),
    toBase64: (d) => Buffer.prototype.base64Slice.call(d, 0, d.length),
    toUtf8: (d) => Buffer.prototype.utf8Slice.call(d, 0, d.length),
    jsonParse: (d) => JSON.parse(d)
  } : {
    textEncoder: new TextEncoder("utf8"),
    byteLength: (d) => s.encode(d).length,
    fromString: (d) => s.encode(d),
    toHex: Uint8Array.prototype.toHex ? (d) => d.toHex() : (d) => Array.from(d, (g) => g.toString(16).padStart(2, "0")).join(""),
    toBase64: Uint8Array.prototype.toBase64 ? (d) => d.toBase64() : (d) => btoa(Array.from(d, (g) => String.fromCodePoint(g)).join("")),
    toUtf8: (d) => i.decode(d),
    jsonParse: (d) => JSON.parse(s.decode(d))
  };
  t("bytes.json(): map", o.jsonParse), t("bytes.hex(): string", o.toHex), t("bytes.string(): string", o.toUtf8), t("bytes.base64(): string", o.toBase64), t("bytes.at(int): int", (d, g) => {
    if (g < 0 || g >= d.length) throw new j("Bytes index out of range");
    return BigInt(d[g]);
  });
  const a = "google.protobuf.Timestamp", c = "google.protobuf.Duration", u = e.registerType(a, Date).getObjectType(a).typeType, l = e.registerType(c, Ke).getObjectType(c).typeType;
  e.registerConstant("google", "map<string, map<string, type>>", {
    protobuf: { Duration: l, Timestamp: u }
  });
  function f(d, g) {
    return new Date(d.toLocaleString("en-US", { timeZone: g }));
  }
  function h(d, g) {
    const w = g ? f(d, g) : new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()), A = new Date(w.getFullYear(), 0, 0);
    return BigInt(Math.floor((w - A) / 864e5) - 1);
  }
  t(`timestamp(string): ${a}`, (d) => {
    if (d.length < 20 || d.length > 30)
      throw new j("timestamp() requires a string in ISO 8601 format");
    const g = new Date(d);
    if (g <= 253402300799999 && g >= -621355968e5) return g;
    throw new j("timestamp() requires a string in ISO 8601 format");
  }), t(`timestamp(int): ${a}`, (d) => {
    if (d = Number(d) * 1e3, d <= 253402300799999 && d >= -621355968e5) return new Date(d);
    throw new j("timestamp() requires a valid integer unix timestamp");
  }), t(`${a}.getDate(): int`, (d) => BigInt(d.getUTCDate())), t(`${a}.getDate(string): int`, (d, g) => BigInt(f(d, g).getDate())), t(`${a}.getDayOfMonth(): int`, (d) => BigInt(d.getUTCDate() - 1)), t(
    `${a}.getDayOfMonth(string): int`,
    (d, g) => BigInt(f(d, g).getDate() - 1)
  ), t(`${a}.getDayOfWeek(): int`, (d) => BigInt(d.getUTCDay())), t(`${a}.getDayOfWeek(string): int`, (d, g) => BigInt(f(d, g).getDay())), t(`${a}.getDayOfYear(): int`, h), t(`${a}.getDayOfYear(string): int`, h), t(`${a}.getFullYear(): int`, (d) => BigInt(d.getUTCFullYear())), t(`${a}.getFullYear(string): int`, (d, g) => BigInt(f(d, g).getFullYear())), t(`${a}.getHours(): int`, (d) => BigInt(d.getUTCHours())), t(`${a}.getHours(string): int`, (d, g) => BigInt(f(d, g).getHours())), t(`${a}.getMilliseconds(): int`, (d) => BigInt(d.getUTCMilliseconds())), t(`${a}.getMilliseconds(string): int`, (d) => BigInt(d.getUTCMilliseconds())), t(`${a}.getMinutes(): int`, (d) => BigInt(d.getUTCMinutes())), t(`${a}.getMinutes(string): int`, (d, g) => BigInt(f(d, g).getMinutes())), t(`${a}.getMonth(): int`, (d) => BigInt(d.getUTCMonth())), t(`${a}.getMonth(string): int`, (d, g) => BigInt(f(d, g).getMonth())), t(`${a}.getSeconds(): int`, (d) => BigInt(d.getUTCSeconds())), t(`${a}.getSeconds(string): int`, (d, g) => BigInt(f(d, g).getSeconds()));
  const p = /(\d*\.?\d*)(ns|us|µs|ms|s|m|h)/;
  function y(d) {
    if (!d) throw new j("Invalid duration string: ''");
    const g = d[0] === "-";
    (d[0] === "-" || d[0] === "+") && (d = d.slice(1));
    let w = BigInt(0);
    for (; ; ) {
      const P = p.exec(d);
      if (!P) throw new j(`Invalid duration string: ${d}`);
      if (P.index !== 0) throw new j(`Invalid duration string: ${d}`);
      d = d.slice(P[0].length);
      const V = Vy[P[2]], [Y = "0", T = ""] = P[1].split("."), et = BigInt(Y) * V, L = T ? BigInt(T.slice(0, 13).padEnd(13, "0")) * V / 10000000000000n : 0n;
      if (w += et + L, d === "") break;
    }
    const A = w >= 1000000000n ? w / 1000000000n : 0n, O = Number(w % 1000000000n);
    return g ? new Ke(-A, -O) : new Ke(A, O);
  }
  t("duration(string): google.protobuf.Duration", (d) => y(d)), t("google.protobuf.Duration.getHours(): int", (d) => d.getHours()), t("google.protobuf.Duration.getMinutes(): int", (d) => d.getMinutes()), t("google.protobuf.Duration.getSeconds(): int", (d) => d.getSeconds()), t("google.protobuf.Duration.getMilliseconds(): int", (d) => d.getMilliseconds()), Dy(e);
}
function Tc(e) {
  let t = 0;
  for (const n of e) t++;
  return t;
}
class Ut {
  #t;
  constructor(t) {
    this.#t = t, Object.freeze(this);
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
const dr = {
  string: new Ut("string"),
  bool: new Ut("bool"),
  int: new Ut("int"),
  uint: new Ut("uint"),
  double: new Ut("double"),
  map: new Ut("map"),
  list: new Ut("list"),
  bytes: new Ut("bytes"),
  null_type: new Ut("null"),
  type: new Ut("type")
};
class ri {
  #t = null;
  #e = null;
  constructor(t) {
    t instanceof ri ? (this.#t = t, this.#e = /* @__PURE__ */ new Map()) : this.#e = new Map(t);
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
class Hy extends ri {
  constructor(t = null, n = null) {
    super(t, n);
  }
  get(t) {
    const n = super.get(t);
    return n === void 0 ? te : n;
  }
}
function Ee(e, t = ri, n = !0) {
  return e instanceof t ? e.fork(n) : new t(e);
}
class tn {
  #t = /* @__PURE__ */ new WeakMap();
  #e = null;
  #n = null;
  constructor({ kind: t, type: n, name: r, keyType: s, valueType: i, values: o }) {
    this.kind = t, this.type = n, this.name = r, s && (this.keyType = s), i && (this.valueType = i), o && (this.values = o), this.unwrappedType = t === "dyn" && i ? i.unwrappedType : this, t === "list" ? this.fieldLazy = this.#a : t === "map" ? this.fieldLazy = this.#o : t === "message" ? this.fieldLazy = this.#s : t === "dyn" ? this.fieldLazy = this.#o : t === "optional" && (this.fieldLazy = this.#r), Object.freeze(this);
  }
  hasDyn() {
    return this.#e ??= this.kind === "dyn" || this.valueType?.hasDyn() || this.keyType?.hasDyn() || !1;
  }
  hasNoDynTypes() {
    return this.hasDyn() === !1;
  }
  isDynOrBool() {
    return this.type === "bool" || this.kind === "dyn";
  }
  isEmpty() {
    return this.valueType && this.valueType.kind === "param";
  }
  hasPlaceholder() {
    return this.#n ??= this.kind === "param" || this.keyType?.hasPlaceholder() || this.valueType?.hasPlaceholder() || !1;
  }
  unify(t, n) {
    const r = this;
    if (r === n || r.kind === "dyn" || n.kind === "param") return r;
    if (n.kind === "dyn" || r.kind === "param") return n;
    if (r.kind !== n.kind || !(r.hasPlaceholder() || n.hasPlaceholder() || r.hasDyn() || n.hasDyn())) return null;
    const s = r.valueType.unify(t, n.valueType);
    if (!s) return null;
    switch (r.kind) {
      case "optional":
        return t.getOptionalType(s);
      case "list":
        return t.getListType(s);
      case "map":
        const i = r.keyType.unify(t, n.keyType);
        return i ? t.getMapType(i, s) : null;
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
  #r(t, n, r, s) {
    if (t = t instanceof he ? t.orValue() : t, t === void 0) return Rs;
    const i = s.debugType(t);
    try {
      return he.of(i.fieldLazy(t, n, r, s));
    } catch (o) {
      if (o instanceof j) return Rs;
      throw o;
    }
  }
  #s(t, n, r, s) {
    const i = s.objectTypesByConstructor.get(t.constructor);
    if (!i) return;
    if (!i.fields) return Object.hasOwn(t, n) ? t[n] : void 0;
    const o = i.fields[n];
    if (!o) return;
    const a = t[n];
    if (o.kind === "dyn") return a;
    const c = s.debugType(a);
    if (o.matches(c)) return a;
    throw new j(
      `Field '${n}' is not of type '${o}', got '${c}'`,
      r
    );
  }
  #o(t, n, r, s) {
    let i;
    if (t instanceof Map ? i = t.get(n) : i = Object.hasOwn(t, n) ? t[n] : void 0, i === void 0) return;
    if (this.valueType.kind === "dyn") return i;
    const o = s.debugType(i);
    if (this.valueType.matches(o)) return i;
    throw new j(
      `Field '${n}' is not of type '${this.valueType}', got '${o}'`,
      r
    );
  }
  #a(t, n, r, s) {
    if (!(typeof n == "number" || typeof n == "bigint")) return;
    const i = t[n];
    if (i === void 0)
      throw new j(
        `No such key: index out of bounds, index ${n} ${n < 0 ? "< 0" : `>= size ${t.length}`}`,
        r
      );
    const o = s.debugType(i);
    if (this.valueType.matches(o)) return i;
    throw new j(
      `List item with index '${n}' is not of type '${this.valueType}', got '${o}'`,
      r
    );
  }
  fieldLazy() {
  }
  field(t, n, r, s) {
    const i = this.fieldLazy(t, n, r, s);
    if (i !== void 0) return i;
    throw new j(`No such key: ${n}`, r);
  }
  matchesBoth(t) {
    return this.matches(t) && t.matches(this);
  }
  matches(t) {
    return this.#t.get(t) ?? this.#t.set(t, this.#c(t)).get(t);
  }
  #c(t) {
    const n = this.unwrappedType, r = t.unwrappedType;
    if (n === r || r.kind === "dyn" || r.kind === "param") return !0;
    switch (n.kind) {
      case "dyn":
      case "param":
        return !0;
      case "list":
        return r.kind === "list" && n.valueType.matches(r.valueType);
      case "map":
        return r.kind === "map" && n.keyType.matches(r.keyType) && n.valueType.matches(r.valueType);
      case "optional":
        return r.kind === "optional" && (!n.valueType || !r.valueType || n.valueType.matches(r.valueType));
      default:
        return n.name === r.name;
    }
  }
}
function Fy(e, t) {
  const n = `Macro '${e}' must `;
  return function(s) {
    const i = t(s);
    if (!i || typeof i != "object") throw new Error(`${n} must return an object.`);
    if (!i?.typeCheck) throw new Error(`${n} have a .typeCheck(checker, macro, ctx) method.`);
    if (!i?.evaluate) throw new Error(`${n} have a .evaluate(evaluator, macro, ctx) method.`);
    return i;
  };
}
class Wy {
  #t;
  constructor({ name: t, receiverType: n, argTypes: r, returnType: s, handler: i }) {
    this.name = t, this.receiverType = n || null, this.argTypes = r, this.returnType = s, this.macro = r.includes(ns);
    const o = n ? `${n}.` : "";
    this.signature = `${o}${t}(${r.join(", ")}): ${s}`, this.handler = this.macro ? Fy(this.signature, i) : i, Object.freeze(this);
  }
  hasPlaceholder() {
    return this.#t ??= this.returnType.hasPlaceholder() || this.receiverType?.hasPlaceholder() || this.argTypes.some((t) => t.hasPlaceholder()) || !1;
  }
  matchesArgs(t) {
    return t.length === this.argTypes.length && this.argTypes.every((n, r) => n.matches(t[r])) ? this : null;
  }
}
class nr {
  #t;
  constructor({ operator: t, leftType: n, rightType: r, handler: s, returnType: i }) {
    this.operator = t, this.leftType = n, this.rightType = r || null, this.handler = s, this.returnType = i, r ? this.signature = `${n} ${t} ${r}: ${i}` : this.signature = `${t}${n}: ${i}`, Object.freeze(this);
  }
  hasPlaceholder() {
    return this.#t ??= this.leftType.hasPlaceholder() || this.rightType?.hasPlaceholder() || !1;
  }
  equals(t) {
    return this.operator === t.operator && this.leftType === t.leftType && this.rightType === t.rightType;
  }
}
function Sf(e) {
  return new tn({
    kind: "list",
    name: `list<${e}>`,
    type: "list",
    valueType: e
  });
}
function xe(e) {
  return new tn({ kind: "primitive", name: e, type: e });
}
function Ky(e) {
  return new tn({ kind: "message", name: e, type: e });
}
function vf(e) {
  const t = e ? `dyn<${e}>` : "dyn";
  return new tn({ kind: "dyn", name: t, type: t, valueType: e });
}
function Af(e) {
  const t = e ? `optional<${e}>` : "optional";
  return new tn({ kind: "optional", name: t, type: "optional", valueType: e });
}
function If(e, t) {
  return new tn({
    kind: "map",
    name: `map<${e}, ${t}>`,
    type: "map",
    keyType: e,
    valueType: t
  });
}
function zy(e) {
  return new tn({ kind: "param", name: e, type: e });
}
const te = vf(), ns = xe("ast"), Sc = Sf(te), vc = If(te, te), kt = Object.freeze({
  string: xe("string"),
  bool: xe("bool"),
  int: xe("int"),
  uint: xe("uint"),
  double: xe("double"),
  bytes: xe("bytes"),
  dyn: te,
  null: xe("null"),
  type: xe("type"),
  optional: Af(te),
  list: Sc,
  "list<dyn>": Sc,
  map: vc,
  "map<dyn, dyn>": vc
});
class jy {
  returnType = null;
  /** @type {Array<FunctionDeclaration>} */
  declarations = [];
  constructor(t) {
    this.registry = t;
  }
  add(t) {
    this.returnType = (this.returnType ? this.returnType.unify(this.registry, t.returnType) : t.returnType) || te, this.declarations.push(t);
  }
  findMatch(t, n = null) {
    for (let r = 0; r < this.declarations.length; r++) {
      const s = this.#t(this.declarations[r], t, n);
      if (s) return s;
    }
    return null;
  }
  #t(t, n, r) {
    if (t.hasPlaceholder()) return this.#e(t, n, r);
    if (!(r && t.receiverType && !r.matches(t.receiverType)))
      return t.matchesArgs(n);
  }
  #e(t, n, r) {
    const s = /* @__PURE__ */ new Map();
    if (r && t.receiverType && !this.registry.matchTypeWithPlaceholders(t.receiverType, r, s))
      return null;
    for (let i = 0; i < n.length; i++)
      if (!this.registry.matchTypeWithPlaceholders(t.argTypes[i], n[i], s))
        return null;
    return {
      handler: t.handler,
      signature: t.signature,
      returnType: t.returnType.templated(this.registry, s)
    };
  }
}
function Ac(e) {
  const t = [];
  let n = "", r = 0;
  for (const s of e) {
    if (s === "<") r++;
    else if (s === ">") r--;
    else if (s === "," && r === 0) {
      t.push(n), n = "";
      continue;
    }
    n += s;
  }
  return n && t.push(n), t;
}
const kf = [
  [void 0, "map"],
  [Object, "map"],
  [Map, "map"],
  [Array, "list"],
  [Uint8Array, "bytes"],
  [an, "uint"],
  [Ut, "type"],
  [he, "optional"]
];
typeof Buffer < "u" && kf.push([Buffer, "bytes"]);
class oa {
  #t = {};
  #e = {};
  #n;
  #r;
  #s;
  #o = /* @__PURE__ */ new Map([
    [!0, /* @__PURE__ */ new Map()],
    [!1, /* @__PURE__ */ new Map()]
  ]);
  #a = /* @__PURE__ */ new Map();
  #c = /* @__PURE__ */ new Map();
  #u = /* @__PURE__ */ new Map();
  #p = /* @__PURE__ */ new Map();
  constructor(t = {}) {
    if (this.enableOptionalTypes = t.enableOptionalTypes ?? !1, this.objectTypes = Ee(t.objectTypes), this.objectTypesByConstructor = Ee(t.objectTypesByConstructor), this.objectTypeInstances = Ee(t.objectTypeInstances), this.#s = Ee(t.functionDeclarations), this.#r = Ee(t.operatorDeclarations), this.#n = Ee(
      t.typeDeclarations || Object.entries(kt),
      void 0,
      !1
    ), this.constants = Ee(t.constants), this.variables = t.unlistedVariablesAreDyn ? Ee(t.variables, Hy) : Ee(t.variables), this.variables.size)
      Ly(this, this.enableOptionalTypes);
    else {
      for (const n of kf) this.registerType(n[1], n[0], !0);
      for (const n in dr) this.registerConstant(n, "type", dr[n]);
    }
  }
  #g() {
    this.#t = {}, this.#e = {};
  }
  registerVariable(t, n) {
    if (this.variables.has(t)) throw new Error(`Variable already registered: ${t}`);
    return this.variables.set(t, n instanceof tn ? n : this.getType(n)), this;
  }
  registerConstant(t, n, r) {
    return this.registerVariable(t, n), this.constants.set(t, r), this;
  }
  #y(t, n, r) {
    let s = this.#o.get(t);
    return s = s.get(n) || s.set(n, /* @__PURE__ */ new Map()).get(n), s.get(r) || s.set(r, new jy(this)).get(r);
  }
  getFunctionCandidates(t, n, r) {
    const s = this.#o.get(t)?.get(n)?.get(r);
    if (s) return s;
    for (const [, i] of this.#s)
      this.#y(!!i.receiverType, i.name, i.argTypes.length).add(i);
    return this.#y(t, n, r);
  }
  getType(t) {
    return this.#i(t, !0);
  }
  getDynType(t) {
    return this.#a.get(t) || this.#a.set(t, this.#i(`dyn<${t.unwrappedType}>`, !0)).get(t);
  }
  getListType(t) {
    return this.#c.get(t) || this.#c.set(t, this.#i(`list<${t}>`, !0)).get(t);
  }
  getMapType(t, n) {
    return this.#u.get(t)?.get(n) || (this.#u.get(t) || this.#u.set(t, /* @__PURE__ */ new Map()).get(t)).set(n, this.#i(`map<${t}, ${n}>`, !0)).get(n);
  }
  getOptionalType(t) {
    return this.#p.get(t) || this.#p.set(t, this.#i(`optional<${t}>`, !0)).get(t);
  }
  assertType(t, n, r) {
    try {
      return this.#i(t, !0);
    } catch (s) {
      throw s.message = `Invalid ${n} '${s.unknownType || t}' in '${r}'`, s;
    }
  }
  getFunctionType(t) {
    return t === "ast" ? ns : this.#i(t, !0);
  }
  registerType(t, n, r) {
    if (typeof t != "string" || t.length < 2)
      throw new Error(`Invalid type name: ${t}`);
    const s = {
      name: t,
      typeType: dr[t] || new Ut(t),
      type: this.#i(t, !1),
      ctor: typeof n == "function" ? n : n?.ctor,
      fields: this.#S(t, n?.fields)
    };
    if (!r) {
      if (this.objectTypes.has(t)) throw new Error(`Type already registered: ${t}`);
      if (typeof s.ctor != "function")
        throw new Error(`Constructor function missing for type '${t}'`);
    }
    return this.objectTypes.set(t, s), this.objectTypesByConstructor.set(s.ctor, s), r ? this : (this.objectTypeInstances.set(t, s.typeType), this.registerFunctionOverload(`type(${t}): type`, () => s.typeType), this);
  }
  getObjectType(t) {
    return this.objectTypes.get(t);
  }
  /** @returns {TypeDeclaration} */
  #i(t, n = !1) {
    let r = this.#n.get(t);
    if (r) return r;
    if (r = t.match(/^[A-Z]$/), r) return this.#l(zy, t, t);
    if (r = t.match(/^dyn<(.+)>$/), r) {
      const s = this.#i(r[1].trim(), n);
      return this.#l(vf, `dyn<${s}>`, s);
    }
    if (r = t.match(/^list<(.+)>$/), r) {
      const s = this.#i(r[1].trim(), n);
      return this.#l(Sf, `list<${s}>`, s);
    }
    if (r = t.match(/^map<(.+)>$/), r) {
      const s = Ac(r[1]);
      if (s.length !== 2) throw new Error(`Invalid map type: ${t}`);
      const i = this.#i(s[0].trim(), n), o = this.#i(s[1].trim(), n);
      return this.#l(If, `map<${i}, ${o}>`, i, o);
    }
    if (r = t.match(/^optional<(.+)>$/), r) {
      const s = this.#i(r[1].trim(), n);
      return this.#l(Af, `optional<${s}>`, s);
    }
    if (n) {
      const s = new Error(`Unknown type: ${t}`);
      throw s.unknownType = t, s;
    }
    return this.#l(Ky, t, t);
  }
  #l(t, n, ...r) {
    return this.#n.get(n) || this.#n.set(n, t(...r)).get(n);
  }
  findMacro(t, n, r) {
    return this.#t[n]?.get(t)?.get(r) ?? this.#d(
      this.#t,
      n,
      t,
      r,
      this.getFunctionCandidates(n, t, r).declarations.find(
        (s) => s.macro
      ) || !1
    );
  }
  #w(t, n, r) {
    const s = [];
    for (const [, i] of this.#r) {
      if (i.operator !== t) continue;
      if (i.leftType === n && i.rightType === r) return [i];
      const o = this.#E(i, n, r);
      o && s.push(o);
    }
    return s.length === 0 && (t === "==" || t === "!=") && (n.kind === "dyn" || r.kind === "dyn") ? [{ handler: t === "==" ? (o, a) => o === a : (o, a) => o !== a, returnType: this.getType("bool") }] : s;
  }
  findUnaryOverload(t, n) {
    const r = this.#t[t]?.get(n);
    if (r !== void 0) return r;
    let s = !1;
    for (const [, i] of this.#r)
      if (!(i.operator !== t || i.leftType !== n)) {
        s = i;
        break;
      }
    return (this.#t[t] ??= /* @__PURE__ */ new Map()).set(n, s).get(n);
  }
  findBinaryOverload(t, n, r) {
    return this.#t[t]?.get(n)?.get(r) ?? this.#d(
      this.#t,
      t,
      n,
      r,
      this.#m(t, n, r)
    );
  }
  checkBinaryOverload(t, n, r) {
    return this.#e[t]?.get(n)?.get(r) ?? this.#d(
      this.#e,
      t,
      n,
      r,
      this.#b(t, n, r)
    );
  }
  #m(t, n, r) {
    const s = this.#w(t, n, r);
    if (s.length === 0) return !1;
    if (s.length === 1) return s[0];
    throw new Error(`Operator overload '${s[0].signature}' overlaps with '${s[1].signature}'.`);
  }
  #b(t, n, r) {
    const s = this.#w(t, n, r);
    if (s.length === 0) return !1;
    const i = s[0].returnType;
    return s.every((o) => o.returnType === i) ? i : (i.kind === "list" || i.kind === "map") && s.every((o) => o.returnType.kind === i.kind) ? i.kind === "list" ? kt.list : kt.map : kt.dyn;
  }
  #d(t, n, r, s, i) {
    const o = t[n] ??= /* @__PURE__ */ new Map();
    return (o.get(r) || o.set(r, /* @__PURE__ */ new Map()).get(r)).set(s, i), i;
  }
  #E(t, n, r) {
    const s = t.hasPlaceholder() ? /* @__PURE__ */ new Map() : null, i = this.matchTypeWithPlaceholders(t.leftType, n, s);
    if (!i) return;
    const o = this.matchTypeWithPlaceholders(t.rightType, r, s);
    if (o)
      return (t.operator === "==" || t.operator === "!=") && !i.matchesBoth(o) ? !1 : t.hasPlaceholder() ? {
        handler: t.handler,
        leftType: i,
        rightType: o,
        returnType: t.returnType.templated(this, s)
      } : t;
  }
  matchTypeWithPlaceholders(t, n, r) {
    if (!t.hasPlaceholder()) return n.matches(t) ? n : null;
    const s = n.kind === "dyn";
    return this.#f(t, n, r, s) && (s || n.matches(t.templated(this, r))) ? n : null;
  }
  #x(t, n, r) {
    const s = r.get(t);
    return s ? s.kind === "dyn" || n.kind === "dyn" ? !0 : s.matchesBoth(n) : r.set(t, n) && !0;
  }
  #f(t, n, r, s = !1) {
    if (!t.hasPlaceholder()) return !0;
    if (!n) return !1;
    const i = s || n.kind === "dyn";
    switch (n = n.unwrappedType, t.kind) {
      case "param": {
        const o = i ? kt.dyn : n;
        return this.#x(t.name, o, r);
      }
      case "list":
        return n.name === "dyn" && (n = t), n.kind !== "list" ? !1 : this.#f(
          t.valueType,
          n.valueType,
          r,
          i
        );
      case "map":
        return n.name === "dyn" && (n = t), n.kind !== "map" ? !1 : this.#f(
          t.keyType,
          n.keyType,
          r,
          i
        ) && this.#f(
          t.valueType,
          n.valueType,
          r,
          i
        );
      case "optional":
        return n.name === "dyn" && (n = t), n.kind !== "optional" ? !1 : this.#f(
          t.valueType,
          n.valueType,
          r,
          i
        );
    }
    return !0;
  }
  #T(t, n, r, s = !1) {
    try {
      const i = typeof n[r] == "string" ? { type: n[r] } : { ...n[r] };
      if (typeof i?.type != "string") throw new Error("unsupported declaration");
      return this.#i(i.type, s);
    } catch (i) {
      throw i.message = `Field '${r}' in type '${t}' has unsupported declaration: ${JSON.stringify(n[r])}`, i;
    }
  }
  #S(t, n) {
    if (!n) return;
    const r = /* @__PURE__ */ Object.create(null);
    for (const s of Object.keys(n)) r[s] = this.#T(t, n, s);
    return r;
  }
  clone(t) {
    return new oa({
      objectTypes: this.objectTypes,
      objectTypesByConstructor: this.objectTypesByConstructor,
      objectTypeInstances: this.objectTypeInstances,
      typeDeclarations: this.#n,
      operatorDeclarations: this.#r,
      functionDeclarations: this.#s,
      variables: this.variables,
      constants: this.constants,
      unlistedVariablesAreDyn: t.unlistedVariablesAreDyn,
      enableOptionalTypes: t.enableOptionalTypes
    });
  }
  /** @param {string} signature */
  #v(t, n) {
    const r = t.match(/^(?:([a-zA-Z0-9.<>]+)\.)?(\w+)\((.*?)\):\s*(.+)$/);
    if (!r) throw new Error(`Invalid signature: ${t}`);
    const [, s, i, o, a] = r;
    try {
      return new Wy({
        name: i,
        receiverType: s ? this.getType(s) : null,
        returnType: this.getType(a.trim()),
        argTypes: Ac(o).map((c) => this.getFunctionType(c.trim())),
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
    return t.name !== n.name || t.argTypes.length !== n.argTypes.length || (t.receiverType || n.receiverType) && (!t.receiverType || !n.receiverType) ? !1 : !(t.receiverType !== n.receiverType && t.receiverType !== te && n.receiverType !== te) && (n.macro || t.macro || n.argTypes.every((s, i) => {
      const o = t.argTypes[i];
      return s === o || s === ns || o === ns || s === te || o === te;
    }));
  }
  /** @param {FunctionDeclaration} newDec */
  #I(t) {
    for (const [, n] of this.#s)
      if (this.#A(n, t))
        throw new Error(
          `Function signature '${t.signature}' overlaps with existing overload '${n.signature}'.`
        );
  }
  registerFunctionOverload(t, n) {
    const r = typeof n == "function" ? n : n?.handler, s = this.#v(t, r);
    this.#I(s), this.#s.set(s.signature, s), this.#o.get(!0).clear(), this.#o.get(!1).clear();
  }
  registerOperatorOverload(t, n) {
    const r = t.match(/^([-!])([\w.<>]+)(?::\s*([\w.<>]+))?$/);
    if (r) {
      const [, u, l, f] = r;
      return this.unaryOverload(u, l, n, f);
    }
    const s = t.match(
      /^([\w.<>]+) ([-+*%/]|==|!=|<|<=|>|>=|in) ([\w.<>]+)(?::\s*([\w.<>]+))?$/
    );
    if (!s) throw new Error(`Operator overload invalid: ${t}`);
    const [, i, o, a, c] = s;
    return this.binaryOverload(i, o, a, n, c);
  }
  unaryOverload(t, n, r, s) {
    const i = this.assertType(n, "type", `${t}${n}`), o = this.assertType(
      s || n,
      "return type",
      `${t}${n}: ${s || n}`
    ), a = new nr({ operator: `${t}_`, leftType: i, returnType: o, handler: r });
    if (this.#h(a))
      throw new Error(`Operator overload already registered: ${t}${n}`);
    this.#r.set(a.signature, a), this.#g();
  }
  #h(t) {
    for (const [, n] of this.#r) if (t.equals(n)) return !0;
    return !1;
  }
  binaryOverload(t, n, r, s, i) {
    i ??= Ic(n) ? "bool" : t;
    const o = `${t} ${n} ${r}: ${i}`, a = this.assertType(t, "left type", o), c = this.assertType(r, "right type", o), u = this.assertType(i, "return type", o);
    if (Ic(n) && u.type !== "bool")
      throw new Error(`Comparison operator '${n}' must return 'bool', got '${u.type}'`);
    const l = new nr({ operator: n, leftType: a, rightType: c, returnType: u, handler: s });
    if (l.hasPlaceholder() && !(c.hasPlaceholder() && a.hasPlaceholder()))
      throw new Error(
        `Operator overload with placeholders must use them in both left and right types: ${o}`
      );
    if (this.#h(l))
      throw new Error(`Operator overload already registered: ${l.signature}`);
    if (n === "==") {
      const f = [
        new nr({
          operator: "!=",
          leftType: a,
          rightType: c,
          handler(h, p, y, d) {
            return !s(h, p, y, d);
          },
          returnType: u
        })
      ];
      a !== c && f.push(
        new nr({
          operator: "==",
          leftType: c,
          rightType: a,
          handler(h, p, y, d) {
            return s(p, h, y, d);
          },
          returnType: u
        }),
        new nr({
          operator: "!=",
          leftType: c,
          rightType: a,
          handler(h, p, y, d) {
            return !s(p, h, y, d);
          },
          returnType: u
        })
      );
      for (const h of f)
        if (this.#h(h))
          throw new Error(`Operator overload already registered: ${h.signature}`);
      for (const h of f) this.#r.set(h.signature, h);
    }
    this.#r.set(l.signature, l), this.#g();
  }
}
function Ic(e) {
  return e === "<" || e === "<=" || e === ">" || e === ">=" || e === "==" || e === "!=" || e === "in";
}
function Gy(e) {
  return new oa(e);
}
class qy {
  constructor(t, n) {
    this.variables = t, this.fallbackValues = n;
  }
  getType(t) {
    return this.variables.get(t);
  }
  getValue(t) {
    return this.fallbackValues.get(t);
  }
  fork() {
    return new $s(this);
  }
}
class $s {
  parent;
  context;
  variableName;
  variableType;
  variableValue;
  constructor(t) {
    this.parent = t;
  }
  fork() {
    return new $s(this);
  }
  forkWithVariable(t, n) {
    const r = new $s(this);
    return r.variableType = t, r.variableName = n, r;
  }
  withContext(t) {
    if (typeof t != "object") throw new j("Context must be an object");
    return this.context = t, t ? t instanceof Map ? this.getValue = this.#e : this.getValue = this.#t : this.getValue = this.#n, this;
  }
  setVariableValue(t) {
    return this.variableValue = t, this;
  }
  getValue(t) {
    return this.#n(t);
  }
  #t(t) {
    if (this.variableName === t) return this.variableValue;
    const n = Object.hasOwn(this.context, t) ? this.context[t] : void 0;
    return n !== void 0 ? n : this.parent.getValue(t);
  }
  #e(t) {
    if (this.variableName === t) return this.variableValue;
    const n = this.context.get(t);
    return n !== void 0 ? n : this.parent.getValue(t);
  }
  #n(t) {
    return this.variableName === t ? this.variableValue : this.parent.getValue(t);
  }
  getType(t) {
    return this.variableName === t ? this.variableType : this.parent.getType(t);
  }
}
function si(e, t) {
  if (e.op === "id") return e.args;
  throw new ct(t, e);
}
function $r(e, t) {
  if (typeof t == "boolean") return !1;
  if (t instanceof Error)
    return e.error ??= t, /predicate must return bool|Unknown variable/.test(t.message);
  const n = e.ev.debugRuntimeType(t, e.firstMacroIter.checkedType);
  return e.error = new j(
    `${e.macro.functionDesc} predicate must return bool, got '${n}'`,
    e.firstMacroIter
  ), !0;
}
class Yy {
  items;
  results;
  error;
  constructor(t, n, r, s, i) {
    this.ev = t, this.macro = n, this.firstMacroIter = n.first, this.ctx = r.forkWithVariable(n.variableType, n.predicateVar), this.each = s, this.finalizer = i;
  }
  toIterable(t) {
    if (Array.isArray(t)) return t;
    if (t instanceof Set) return [...t];
    if (t instanceof Map) return [...t.keys()];
    if (t && typeof t == "object") return Object.keys(t);
    throw new j(
      `Expression of type '${this.ev.debugType(t)}' cannot be range of a comprehension (must be list, map, or dynamic).`,
      this.macro.receiver
    );
  }
  iterate(t) {
    const n = this.toIterable(t);
    for (let r = 0; r < n.length && this.return === void 0; ) {
      const s = this.ctx.setVariableValue(n[r++]);
      let i = this.ev.tryEval(this.firstMacroIter, s);
      if (i instanceof Promise ? i = i.then((o) => this.each(this, s, o)) : i = this.each(this, s, i), i instanceof Promise) return i.then(() => this.iterateAsync(n, r));
    }
    return this.finalizer(this);
  }
  async iterateAsync(t, n = 0) {
    t instanceof Promise && (t = this.toIterable(await t));
    for (let r = n; r < t.length && this.return === void 0; ) {
      const s = this.ctx.setVariableValue(t[r++]);
      let i = this.ev.tryEval(this.firstMacroIter, s);
      i = this.each(this, s, i instanceof Promise ? await i : i), i instanceof Promise && await i;
    }
    return this.finalizer(this);
  }
}
function hr(e, t) {
  return function(n, r, s) {
    const i = n.eval(r.receiver, s), o = new Yy(n, r, s, e, t);
    return i instanceof Promise ? o.iterateAsync(i) : o.iterate(i);
  };
}
function Zy(e, t, n) {
  if ($r(e, n)) throw e.error;
  n === !1 && (e.return = !1);
}
function Xy(e) {
  if (e.return !== void 0) return e.return;
  if (e.error) throw e.error;
  return !0;
}
function Qy(e, t, n) {
  if ($r(e, n)) throw e.error;
  n === !0 && (e.return = !0);
}
function Jy(e) {
  if (e.return !== void 0) return e.return;
  if (e.error) throw e.error;
  return !1;
}
function tw(e, t, n) {
  if ($r(e, n) || n instanceof Error) throw e.error;
  n && (e.found ? e.return = !1 : e.found = !0);
}
function ew(e) {
  return e.return !== void 0 ? e.return : e.found === !0;
}
function Cf(e) {
  return e.results || [];
}
function nw(e, t, n) {
  if (n === !1) return;
  if ($r(e, n) || n instanceof Error) throw e.error;
  const r = e.ev.eval(e.macro.second, t);
  return r instanceof Promise ? r.then((s) => (e.results ??= []).push(s)) : (e.results ??= []).push(r);
}
function rw(e, t, n) {
  if (n instanceof Error) throw e.error;
  return (e.results ??= []).push(n);
}
function sw(e, t, n) {
  if ($r(e, n) || n instanceof Error) throw e.error;
  n && (e.results ??= []).push(t.variableValue);
}
function iw(e, t, n) {
  if (t.kind === "dyn") return t;
  if (t.kind === "list") return t.valueType;
  if (t.kind === "map") return t.keyType;
  throw new e.Error(
    `Expression of type '${t}' cannot be range of a comprehension (must be list, map, or dynamic).`,
    n.receiver
  );
}
function aa(e, t, n) {
  const r = iw(e, e.check(t.receiver, n), t);
  return n.forkWithVariable(r, t.predicateVar);
}
function Ai({ description: e, evaluator: t }) {
  const n = `${e} invalid predicate iteration variable`;
  if (!t) throw new Error(`No evaluator provided for quantifier macro: ${e}`);
  function r(s, i, o) {
    o = aa(s, i, o), i.variableType = o.variableType;
    const a = s.check(i.first, o);
    if (a.isDynOrBool()) return a;
    throw new s.Error(
      `${i.functionDesc} predicate must return bool, got '${a}'`,
      i.first
    );
  }
  return ({ args: s, receiver: i }) => ({
    functionDesc: e,
    receiver: i,
    first: s[1],
    predicateVar: si(s[0], n),
    evaluate: t,
    typeCheck: r
  });
}
function kc(e) {
  const t = e ? "map(var, filter, transform)" : "map(var, transform)", n = `${t} invalid predicate iteration variable`, r = hr(
    e ? nw : rw,
    Cf
  );
  function s(i, o, a) {
    if (a = aa(i, o, a), o.variableType = a.variableType, e) {
      const c = i.check(o.first, a);
      if (!c.isDynOrBool())
        throw new i.Error(
          `${o.functionDesc} filter predicate must return bool, got '${c}'`,
          o.first
        );
    }
    return i.getType(`list<${i.check(e ? o.second : o.first, a)}>`);
  }
  return ({ args: i, receiver: o }) => ({
    args: i,
    functionDesc: t,
    receiver: o,
    first: i[1],
    second: e ? i[2] : null,
    predicateVar: si(i[0], n),
    evaluate: r,
    typeCheck: s
  });
}
function ow() {
  const e = "filter(var, predicate)", t = `${e} invalid predicate iteration variable`, n = hr(sw, Cf);
  function r(s, i, o) {
    o = aa(s, i, o), i.variableType = o.variableType;
    const a = s.check(i.first, o);
    if (a.isDynOrBool()) return s.getType(`list<${i.variableType}>`);
    throw new s.Error(
      `${i.functionDesc} predicate must return bool, got '${a}'`,
      i.first
    );
  }
  return ({ args: s, receiver: i }) => ({
    args: s,
    functionDesc: e,
    receiver: i,
    first: s[1],
    predicateVar: si(s[0], t),
    evaluate: n,
    typeCheck: r
  });
}
function aw() {
  const e = "has() invalid argument";
  function t(r, s, i) {
    const o = s.macroHasProps;
    let a = o.length, c = r.eval(o[--a], i), u;
    for (; a--; ) {
      const l = o[a];
      if (l.op === ".?" && (u ??= !0), c = r.debugType(c).fieldLazy(c, l.args[1], l, r), c === void 0) {
        if (!(!u && a && l.op === ".")) break;
        throw new j(`No such key: ${l.args[1]}`, l);
      }
    }
    return c !== void 0;
  }
  function n(r, s, i) {
    let o = s.args[0];
    if (o.op !== ".") throw new r.Error(e, o);
    if (!s.macroHasProps) {
      const a = [];
      for (; (o.op === "." || o.op === ".?") && a.push(o); ) o = o.args[0];
      if (o.op !== "id") throw new r.Error(e, o);
      r.check(o, i), a.push(o), s.macroHasProps = a;
    }
    return r.getType("bool");
  }
  return function({ args: r }) {
    return { args: r, evaluate: t, typeCheck: n };
  };
}
function cw(e) {
  e.registerFunctionOverload("has(ast): bool", aw()), e.registerFunctionOverload(
    "list.all(ast, ast): bool",
    Ai({
      description: "all(var, predicate)",
      evaluator: hr(Zy, Xy)
    })
  ), e.registerFunctionOverload(
    "list.exists(ast, ast): bool",
    Ai({
      description: "exists(var, predicate)",
      evaluator: hr(Qy, Jy)
    })
  ), e.registerFunctionOverload(
    "list.exists_one(ast, ast): bool",
    Ai({
      description: "exists_one(var, predicate)",
      evaluator: hr(tw, ew)
    })
  ), e.registerFunctionOverload("list.map(ast, ast): list<dyn>", kc(!1)), e.registerFunctionOverload("list.map(ast, ast, ast): list<dyn>", kc(!0)), e.registerFunctionOverload("list.filter(ast, ast): list<dyn>", ow());
  function t(s, i, o, a) {
    return s.eval(
      i.exp,
      o.forkWithVariable(i.val.checkedType, i.var).setVariableValue(a)
    );
  }
  class n {
  }
  const r = new n();
  e.registerType("CelNamespace", n), e.registerConstant("cel", "CelNamespace", r), e.registerFunctionOverload("CelNamespace.bind(ast, dyn, ast): dyn", ({ args: s }) => ({
    var: si(s[0], "invalid variable argument"),
    val: s[1],
    exp: s[2],
    typeCheck(i, o, a) {
      const c = a.forkWithVariable(i.check(o.val, a), o.var);
      return i.check(o.exp, c);
    },
    evaluate(i, o, a) {
      const c = i.eval(o.val, a);
      return c instanceof Promise ? c.then((u) => t(i, o, a, u)) : t(i, o, a, c);
    }
  }));
}
function uw(e) {
  const t = e.unaryOverload.bind(e), n = e.binaryOverload.bind(e);
  function r(u, l) {
    if (u <= 9223372036854775807n && u >= -9223372036854775808n) return u;
    throw new j(`integer overflow: ${u}`, l);
  }
  t("!", "bool", (u) => !u), t("-", "int", (u) => -u), n("dyn<int>", "==", "double", (u, l) => u == l), n("dyn<int>", "==", "uint", (u, l) => u == l.valueOf()), n("int", "*", "int", (u, l, f) => r(u * l, f)), n("int", "+", "int", (u, l, f) => r(u + l, f)), n("int", "-", "int", (u, l, f) => r(u - l, f)), n("int", "/", "int", (u, l, f) => {
    if (l === 0n) throw new j("division by zero", f);
    return u / l;
  }), n("int", "%", "int", (u, l, f) => {
    if (l === 0n) throw new j("modulo by zero", f);
    return u % l;
  }), t("-", "double", (u) => -u), n("dyn<double>", "==", "int", (u, l) => u == l), n("dyn<double>", "==", "uint", (u, l) => u == l.valueOf()), n("double", "*", "double", (u, l) => u * l), n("double", "+", "double", (u, l) => u + l), n("double", "-", "double", (u, l) => u - l), n("double", "/", "double", (u, l) => u / l), n("string", "+", "string", (u, l) => u + l), n("list<V>", "+", "list<V>", (u, l) => [...u, ...l]), n("bytes", "+", "bytes", (u, l) => {
    const f = new Uint8Array(u.length + l.length);
    return f.set(u, 0), f.set(l, u.length), f;
  });
  const s = "google.protobuf.Duration";
  n(s, "+", s, (u, l) => u.addDuration(l)), n(s, "-", s, (u, l) => u.subtractDuration(l)), n(s, "==", s, (u, l) => u.seconds === l.seconds && u.nanos === l.nanos);
  const i = "google.protobuf.Timestamp";
  n(i, "==", i, (u, l) => u.getTime() === l.getTime()), n(i, "-", i, (u, l) => Ke.fromMilliseconds(u.getTime() - l.getTime()), s), n(i, "-", s, (u, l) => l.subtractTimestamp(u)), n(i, "+", s, (u, l) => l.extendTimestamp(u)), n(s, "+", i, (u, l) => u.extendTimestamp(l));
  function o(u, l, f, h) {
    if (l instanceof Set && l.has(u)) return !0;
    for (const p of l) if (rr(u, p, h)) return !0;
    return !1;
  }
  function a(u, l) {
    return l instanceof Map ? l.get(u) !== void 0 : Object.hasOwn(l, u) ? l[u] !== void 0 : !1;
  }
  function c(u, l, f, h) {
    return o(u, l, f, h);
  }
  n("V", "in", "list<V>", c), n("K", "in", "map<K, V>", a);
  for (const u of ["type", "null", "bool", "string", "int", "double"])
    n(u, "==", u, (l, f) => l === f);
  n("bytes", "==", "bytes", (u, l) => {
    let f = u.length;
    if (f !== l.length) return !1;
    for (; f--; ) if (u[f] !== l[f]) return !1;
    return !0;
  }), n("list<V>", "==", "list<V>", (u, l, f, h) => {
    if (Array.isArray(u) && Array.isArray(l)) {
      const d = u.length;
      if (d !== l.length) return !1;
      for (let g = 0; g < d; g++)
        if (!rr(u[g], l[g], h)) return !1;
      return !0;
    }
    if (u instanceof Set && l instanceof Set) {
      if (u.size !== l.size) return !1;
      for (const d of u) if (!l.has(d)) return !1;
      return !0;
    }
    const p = u instanceof Set ? l : u, y = u instanceof Set ? u : l;
    if (!Array.isArray(p) || p.length !== y?.size) return !1;
    for (let d = 0; d < p.length; d++) if (!y.has(p[d])) return !1;
    return !0;
  }), n("map<K, V>", "==", "map<K, V>", (u, l, f, h) => {
    if (u instanceof Map && l instanceof Map) {
      if (u.size !== l.size) return !1;
      for (const [d, g] of u)
        if (!(l.has(d) && rr(g, l.get(d), h))) return !1;
      return !0;
    }
    if (u instanceof Map || l instanceof Map) {
      const d = u instanceof Map ? l : u, g = u instanceof Map ? u : l, w = Object.keys(d);
      if (g.size !== w.length) return !1;
      for (const [A, O] of g)
        if (!(A in d && rr(O, d[A], h))) return !1;
      return !0;
    }
    const p = Object.keys(u), y = Object.keys(l);
    if (p.length !== y.length) return !1;
    for (let d = 0; d < p.length; d++) {
      const g = p[d];
      if (!(g in l && rr(u[g], l[g], h))) return !1;
    }
    return !0;
  }), n("uint", "==", "uint", (u, l) => u.valueOf() === l.valueOf()), n("dyn<uint>", "==", "double", (u, l) => u.valueOf() == l), n("dyn<uint>", "==", "int", (u, l) => u.valueOf() == l), n("uint", "+", "uint", (u, l) => new an(u.valueOf() + l.valueOf())), n("uint", "-", "uint", (u, l) => new an(u.valueOf() - l.valueOf())), n("uint", "*", "uint", (u, l) => new an(u.valueOf() * l.valueOf())), n("uint", "/", "uint", (u, l, f) => {
    if (l.valueOf() === 0n) throw new j("division by zero", f);
    return new an(u.valueOf() / l.valueOf());
  }), n("uint", "%", "uint", (u, l, f) => {
    if (l.valueOf() === 0n) throw new j("modulo by zero", f);
    return new an(u.valueOf() % l.valueOf());
  });
  for (const [u, l] of [
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
    n(u, "<", l, (f, h) => f < h), n(u, "<=", l, (f, h) => f <= h), n(u, ">", l, (f, h) => f > h), n(u, ">=", l, (f, h) => f >= h);
}
function rr(e, t, n) {
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
      const r = n.objectTypesByConstructor.get(e.constructor)?.type, s = n.objectTypesByConstructor.get(t.constructor)?.type;
      if (!r || r !== s) return !1;
      const i = n.registry.findBinaryOverload("==", r, s);
      return i ? i.handler(e, t, null, n) : !1;
  }
  throw new j(`Cannot compare values of type ${typeof e}`);
}
class Of {
  dynType = kt.dyn;
  optionalType = kt.optional;
  stringType = kt.string;
  intType = kt.int;
  doubleType = kt.double;
  boolType = kt.bool;
  nullType = kt.null;
  listType = kt.list;
  mapType = kt.map;
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
        return t === null ? this.nullType : this.objectTypesByConstructor.get(t.constructor)?.type || Cc(this, t.constructor?.name || typeof t);
      default:
        Cc(this, typeof t);
    }
  }
}
function Cc(e, t) {
  throw new e.Error(`Unsupported type: ${t}`);
}
function rs(e, t, n, r, s) {
  return n instanceof Promise || r instanceof Promise ? Promise.all([n, r]).then((i) => s(e, t, i[0], i[1])) : s(e, t, n, r);
}
function Oc(e, t, n) {
  const r = e.check(t.args[0], n);
  return t.op === "[]" && e.check(t.args[1], n), r.kind !== "optional" ? e.checkAccessOnType(t, n, r) : e.registry.getOptionalType(e.checkAccessOnType(t, n, r.valueType, !0));
}
function Bc(e, t, n) {
  const r = e.check(t.args[0], n);
  t.op === "[?]" && e.check(t.args[1], n);
  const s = r.kind === "optional" ? r.valueType : r;
  return e.registry.getOptionalType(e.checkAccessOnType(t, n, s, !0));
}
function Nc(e, t, n, r, s) {
  const i = e.check(r, t);
  if (i === n || n.isEmpty()) return i;
  if (i.isEmpty()) return n;
  let o;
  throw s === 0 ? o = "List elements must have the same type," : s === 1 ? o = "Map key uses wrong type," : s === 2 && (o = "Map value uses wrong type,"), new e.Error(
    `${o} expected type '${e.formatType(n)}' but found '${e.formatType(i)}'`,
    r
  );
}
function Rc(e, t, n, r) {
  return n.unify(e.registry, e.check(r, t)) || e.dynType;
}
function Us(e, t, n) {
  const r = e.debugRuntimeType(t, n.checkedType);
  return new e.Error(`Logical operator requires bool operands, got '${r}'`, n);
}
function lw(e, t, n) {
  const r = e.debugRuntimeType(t, n.checkedType);
  return new e.Error(`Ternary condition must be bool, got '${r}'`, n);
}
function $c(e, t, n, r) {
  if (n === !0) return e.eval(t.args[1], r);
  if (n === !1) return e.eval(t.args[2], r);
  throw lw(e, n, t.args[0]);
}
function Uc(e, t, n) {
  const r = e.debugRuntimeType(n, t.args[0].checkedType), s = e.registry.findUnaryOverload(t.op, r);
  if (s) return s.handler(n);
  throw new e.Error(`no such overload: ${t.op[0]}${r}`, t);
}
function Pc(e, t, n) {
  const r = e.eval(t.args[0], n);
  return r instanceof Promise ? r.then((s) => Uc(e, t, s)) : Uc(e, t, r);
}
function fw(e, t, n, r) {
  const s = e.debugOperandType(n, t.args[0].checkedType), i = e.debugOperandType(r, t.args[1].checkedType), o = e.registry.findBinaryOverload(t.op, s, i);
  if (o) return o.handler(n, r, t, e);
  throw new e.Error(`no such overload: ${s} ${t.op} ${i}`, t);
}
function dw(e, t, n) {
  return rs(e, t, e.eval(t.args[0], n), e.eval(t.args[1], n), fw);
}
function _c(e, t, n, r) {
  if (n === !0) return !0;
  const s = e.eval(t.args[1], r);
  return s instanceof Promise ? s.then((i) => Lc(e, t, n, i)) : Lc(e, t, n, s);
}
function Lc(e, t, n, r) {
  if (r === !0) return !0;
  if (r !== !1) throw Us(e, r, t.args[1]);
  if (n instanceof Error) throw n;
  if (n !== !1) throw Us(e, n, t.args[0]);
  return !1;
}
function Dc(e, t, n, r) {
  if (n === !1) return !1;
  const s = e.eval(t.args[1], r);
  return s instanceof Promise ? s.then((i) => Vc(e, t, n, i)) : Vc(e, t, n, s);
}
function Vc(e, t, n, r) {
  if (r === !1) return !1;
  if (r !== !0) throw Us(e, r, t.args[1]);
  if (n instanceof Error) throw n;
  if (n !== !0) throw Us(e, n, t.args[0]);
  return !0;
}
function Mc(e, t, n) {
  const r = e.check(t.args[0], n), s = e.check(t.args[1], n);
  if (!r.isDynOrBool())
    throw new e.Error(
      `Logical operator requires bool operands, got '${e.formatType(r)}'`,
      t
    );
  if (!s.isDynOrBool())
    throw new e.Error(
      `Logical operator requires bool operands, got '${e.formatType(s)}'`,
      t
    );
  return e.boolType;
}
function Hc(e, t, n) {
  const r = t.op, s = e.check(t.args[0], n);
  if (s.kind === "dyn") return r === "!_" ? e.boolType : s;
  const i = e.registry.findUnaryOverload(r, s);
  if (i) return i.returnType;
  throw new e.Error(`no such overload: ${r[0]}${e.formatType(s)}`, t);
}
function hw(e, t, n) {
  const r = t.op, s = e.check(t.args[0], n), i = e.check(t.args[1], n), o = e.registry.checkBinaryOverload(r, s, i);
  if (o) return o;
  throw new e.Error(
    `no such overload: ${e.formatType(s)} ${r} ${e.formatType(i)}`,
    t
  );
}
function Fc(e, t, n) {
  const [r, s] = t.args, i = s.length, o = t.functionCandidates ??= e.registry.getFunctionCandidates(
    !1,
    r,
    i
  ), a = t.argTypes ??= new Array(i);
  let c = i;
  for (; c--; ) a[c] = e.debugOperandType(n[c], s[c].checkedType);
  const u = o.findMatch(a, null);
  if (u) return u.handler.apply(e, n);
  throw new e.Error(
    `found no matching overload for '${r}(${a.map((l) => l.unwrappedType).join(", ")})'`,
    t
  );
}
function pw(e, t, n, r) {
  const [s, i, o] = t.args, a = t.functionCandidates ??= e.registry.getFunctionCandidates(
    !0,
    s,
    o.length
  );
  let c = r.length;
  const u = t.argTypes ??= new Array(c);
  for (; c--; ) u[c] = e.debugOperandType(r[c], o[c].checkedType);
  const l = e.debugRuntimeType(n, i.checkedType || e.dynType), f = a.findMatch(u, l);
  if (f) return f.handler.call(e, n, ...r);
  throw new e.Error(
    `found no matching overload for '${l.type}.${s}(${u.map((h) => h.unwrappedType).join(", ")})'`,
    t
  );
}
function Ii(e, t, n, r = n.length) {
  let s;
  const i = new Array(r);
  for (; r--; ) (i[r] = e.eval(n[r], t)) instanceof Promise && (s ??= !0);
  return s ? Promise.all(i) : i;
}
function Wc(e) {
  const t = {};
  for (let n = 0; n < e.length; n++) {
    const [r, s] = e[n];
    r === "__proto__" || r === "constructor" || r === "prototype" || (t[r] = s);
  }
  return t;
}
function ki(e, t, n, r) {
  return e.optionalType.field(n, r, t, e);
}
function Ci(e, t, n, r) {
  return e.debugType(n).field(n, r, t, e);
}
const Ps = {
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
      const r = t.checkedType || n.getType(t.args), s = r && n.getValue(t.args);
      if (s === void 0) throw new e.Error(`Unknown variable: ${t.args}`, t);
      if (r.kind === "dyn") return e.debugType(s) && s;
      const i = e.debugType(s);
      if (r.matches(i)) return s;
      throw new e.Error(`Variable '${t.args}' is not of type '${r}', got '${i}'`, t);
    }
  },
  ".": {
    check: Oc,
    evaluate(e, t, n) {
      const r = e.eval(t.args[0], n);
      return r instanceof Promise ? r.then((s) => Ci(e, t, s, t.args[1])) : Ci(e, t, r, t.args[1]);
    }
  },
  ".?": {
    check: Bc,
    evaluate(e, t, n) {
      const r = e.eval(t.args[0], n);
      return r instanceof Promise ? r.then((s) => ki(e, t, s, t.args[1])) : ki(e, t, r, t.args[1]);
    }
  },
  "[]": {
    check: Oc,
    evaluate(e, t, n) {
      return rs(e, t, e.eval(t.args[0], n), e.eval(t.args[1], n), Ci);
    }
  },
  "[?]": {
    check: Bc,
    evaluate(e, t, n) {
      return rs(e, t, e.eval(t.args[0], n), e.eval(t.args[1], n), ki);
    }
  },
  call: {
    check(e, t, n) {
      if (t.macro) return t.macro.typeCheck(e, t.macro, n);
      const r = t.args[0], s = t.args[1], i = t.functionCandidates ??= e.registry.getFunctionCandidates(
        !1,
        r,
        s.length
      ), o = s.map((c) => e.check(c, n)), a = i.findMatch(o);
      if (!a)
        throw new e.Error(
          `found no matching overload for '${r}(${e.formatTypeList(o)})'`,
          t
        );
      return a.returnType;
    },
    evaluate(e, t, n) {
      if (t.macro) return t.macro.evaluate(e, t.macro, n);
      const r = Ii(e, n, t.args[1]);
      return r instanceof Promise ? r.then((s) => Fc(e, t, s)) : Fc(e, t, r);
    }
  },
  rcall: {
    check(e, t, n) {
      if (t.macro) return t.macro.typeCheck(e, t.macro, n);
      const r = t.args[0], s = t.args[2], i = e.check(t.args[1], n), o = t.functionCandidates ??= e.registry.getFunctionCandidates(
        !0,
        r,
        s.length
      ), a = s.map((u) => e.check(u, n));
      if (i.kind === "dyn" && o.returnType) return o.returnType;
      const c = o.findMatch(a, i);
      if (!c)
        throw new e.Error(
          `found no matching overload for '${i.type}.${r}(${e.formatTypeList(
            a
          )})'`,
          t
        );
      return c.returnType;
    },
    evaluate(e, t, n) {
      return t.macro ? t.macro.evaluate(e, t.macro, n) : rs(
        e,
        t,
        e.eval(t.args[1], n),
        Ii(e, n, t.args[2]),
        pw
      );
    }
  },
  list: {
    check(e, t, n) {
      const r = t.args, s = r.length;
      if (s === 0) return e.getType("list<T>");
      let i = e.check(r[0], n);
      const o = e.opts.homogeneousAggregateLiterals ? Nc : Rc;
      for (let a = 1; a < s; a++) i = o(e, n, i, r[a], 0);
      return e.registry.getListType(i);
    },
    evaluate(e, t, n) {
      return Ii(e, n, t.args);
    }
  },
  map: {
    check(e, t, n) {
      const r = t.args, s = r.length;
      if (s === 0) return e.getType("map<K, V>");
      const i = e.opts.homogeneousAggregateLiterals ? Nc : Rc;
      let o = e.check(r[0][0], n), a = e.check(r[0][1], n);
      for (let c = 1; c < s; c++) {
        const [u, l] = r[c];
        o = i(e, n, o, u, 1), a = i(e, n, a, l, 2);
      }
      return e.registry.getMapType(o, a);
    },
    evaluate(e, t, n) {
      const r = t.args, s = r.length, i = new Array(s);
      let o;
      for (let a = 0; a < s; a++) {
        const [c, u] = r[a], l = e.eval(c, n), f = e.eval(u, n);
        l instanceof Promise || f instanceof Promise ? (i[a] = Promise.all([l, f]), o ??= !0) : i[a] = [l, f];
      }
      return o ? Promise.all(i).then(Wc) : Wc(i);
    }
  },
  "?:": {
    check(e, t, n) {
      const r = e.check(t.args[0], n);
      if (!r.isDynOrBool())
        throw new e.Error(
          `Ternary condition must be bool, got '${e.formatType(r)}'`,
          t
        );
      const s = e.check(t.args[1], n), i = e.check(t.args[2], n), o = s.unify(e.registry, i);
      if (o) return o;
      throw new e.Error(
        `Ternary branches must have the same type, got '${e.formatType(
          s
        )}' and '${e.formatType(i)}'`,
        t
      );
    },
    evaluate(e, t, n) {
      const r = e.eval(t.args[0], n);
      return r instanceof Promise ? r.then((s) => $c(e, t, s, n)) : $c(e, t, r, n);
    }
  },
  "||": {
    check: Mc,
    evaluate(e, t, n) {
      const r = e.tryEval(t.args[0], n);
      return r instanceof Promise ? r.then((s) => _c(e, t, s, n)) : _c(e, t, r, n);
    }
  },
  "&&": {
    check: Mc,
    evaluate(e, t, n) {
      const r = e.tryEval(t.args[0], n);
      return r instanceof Promise ? r.then((s) => Dc(e, t, s, n)) : Dc(e, t, r, n);
    }
  },
  "!_": { check: Hc, evaluate: Pc },
  "-_": { check: Hc, evaluate: Pc }
}, gw = ["!=", "==", "in", "+", "-", "*", "/", "%", "<", "<=", ">", ">="];
for (const e of gw) Ps[e] = { check: hw, evaluate: dw };
for (const e in Ps) Ps[e].name = e;
const yw = (/* @__PURE__ */ new Map()).set("A", "dyn").set("T", "dyn").set("K", "dyn").set("V", "dyn");
class Kc extends Of {
  constructor(t, n) {
    super(t), this.isEvaluating = n, this.Error = n ? j : _y;
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
  checkAccessOnType(t, n, r, s = !1) {
    if (r.kind === "dyn") return r;
    const i = (t.op === "[]" || t.op === "[?]" ? this.check(t.args[1], n) : this.stringType).type;
    if (r.kind === "list") {
      if (i !== "int" && i !== "dyn")
        throw new this.Error(`List index must be int, got '${i}'`, t);
      return r.valueType;
    }
    if (r.kind === "map") return r.valueType;
    const o = this.objectTypes.get(r.name);
    if (o) {
      if (!(i === "string" || i === "dyn"))
        throw new this.Error(
          `Cannot index type '${r.name}' with type '${i}'`,
          t
        );
      if (o.fields) {
        const a = t.op === "." || t.op === ".?" ? t.args[1] : void 0;
        if (a) {
          const c = o.fields[a];
          if (c) return c;
          if (s) return this.dynType;
          throw new this.Error(`No such key: ${a}`, t);
        }
      }
      return this.dynType;
    }
    throw new this.Error(`Cannot index type '${this.formatType(r)}'`, t);
  }
  formatType(t) {
    return t.hasPlaceholder() ? t.templated(this.registry, yw).name : t.name;
  }
  formatTypeList(t) {
    return t.map((n) => this.formatType(n)).join(", ");
  }
}
const $ = {
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
};
class ca {
  #t;
  #e;
  constructor(t, n, r, s) {
    const i = Ps[r];
    this.#t = n, this.#e = t, this.op = r, this.check = i.check, this.evaluate = i.evaluate, this.args = s;
  }
  get input() {
    return this.#t;
  }
  get pos() {
    return this.#e;
  }
  toOldStructure() {
    const t = Array.isArray(this.args) ? this.args : [this.args];
    return [this.op, ...t.map((n) => n instanceof ca ? n.toOldStructure() : n)];
  }
}
const ss = {};
for (const e in $) ss[$[e]] = e;
const ww = /* @__PURE__ */ new Set([
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
  "while"
]), Bf = new Uint8Array(128);
for (const e of "0123456789abcdefABCDEF") Bf[e.charCodeAt(0)] = 1;
const zc = {
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
class mw {
  constructor(t) {
    this.input = t, this.pos = 0, this.length = t.length;
  }
  // Read next token
  nextToken() {
    for (; ; ) {
      const { pos: t, input: n, length: r } = this;
      if (t >= r) return { type: $.EOF, value: null, pos: t };
      const s = n[t];
      switch (s) {
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
          return { type: $.EQ, value: "==", pos: (this.pos += 2) - 2 };
        case "&":
          if (n[t + 1] !== "&") break;
          return { type: $.AND, value: "&&", pos: (this.pos += 2) - 2 };
        case "|":
          if (n[t + 1] !== "|") break;
          return { type: $.OR, value: "||", pos: (this.pos += 2) - 2 };
        case "+":
          return { type: $.PLUS, value: "+", pos: this.pos++ };
        case "-":
          return { type: $.MINUS, value: "-", pos: this.pos++ };
        case "*":
          return { type: $.MULTIPLY, value: "*", pos: this.pos++ };
        case "/":
          if (n[t + 1] === "/") {
            for (; this.pos < r && this.input[this.pos] !== `
`; ) this.pos++;
            continue;
          }
          return { type: $.DIVIDE, value: "/", pos: this.pos++ };
        case "%":
          return { type: $.MODULO, value: "%", pos: this.pos++ };
        case "<":
          return n[t + 1] === "=" ? { type: $.LE, value: "<=", pos: (this.pos += 2) - 2 } : { type: $.LT, value: "<", pos: this.pos++ };
        case ">":
          return n[t + 1] === "=" ? { type: $.GE, value: ">=", pos: (this.pos += 2) - 2 } : { type: $.GT, value: ">", pos: this.pos++ };
        case "!":
          return n[t + 1] === "=" ? { type: $.NE, value: "!=", pos: (this.pos += 2) - 2 } : { type: $.NOT, pos: this.pos++ };
        case "(":
          return { type: $.LPAREN, pos: this.pos++ };
        case ")":
          return { type: $.RPAREN, pos: this.pos++ };
        case "[":
          return { type: $.LBRACKET, pos: this.pos++ };
        case "]":
          return { type: $.RBRACKET, pos: this.pos++ };
        case "{":
          return { type: $.LBRACE, pos: this.pos++ };
        case "}":
          return { type: $.RBRACE, pos: this.pos++ };
        case ".":
          return { type: $.DOT, pos: this.pos++ };
        case ",":
          return { type: $.COMMA, pos: this.pos++ };
        case ":":
          return { type: $.COLON, pos: this.pos++ };
        case "?":
          return { type: $.QUESTION, pos: this.pos++ };
        case '"':
        case "'":
          return this.readString(s);
        // Check for string prefixes (b, B, r, R followed by quote)
        case "b":
        case "B":
        case "r":
        case "R": {
          const i = n[t + 1];
          return i === '"' || i === "'" ? ++this.pos && this.readString(i, s) : this.readIdentifier();
        }
        default: {
          const i = s.charCodeAt(0);
          if (i <= 57 && i >= 48) return this.readNumber();
          if (this._isIdentifierCharCode(i)) return this.readIdentifier();
        }
      }
      throw new ct(`Unexpected character: ${s}`, { pos: t, input: n });
    }
  }
  // Characters: 0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_
  _isIdentifierCharCode(t) {
    return t < 48 || t > 122 ? !1 : t >= 97 || t >= 65 && t <= 90 || t <= 57 || t === 95;
  }
  _parseAsDouble(t, n) {
    const r = Number(this.input.substring(t, n));
    if (Number.isFinite(r)) return { type: $.NUMBER, value: r, pos: t };
    throw new ct(`Invalid number: ${r}`, { pos: t, input: this.input });
  }
  _parseAsBigInt(t, n, r, s) {
    const i = this.input.substring(t, n);
    if (s === "u" || s === "U") {
      this.pos++;
      try {
        return {
          type: $.NUMBER,
          value: new an(i),
          pos: t
        };
      } catch {
      }
    } else
      try {
        return {
          type: $.NUMBER,
          value: BigInt(i),
          pos: t
        };
      } catch {
      }
    throw new ct(r ? `Invalid hex integer: ${i}` : `Invalid integer: ${i}`, {
      pos: t,
      input: this.input
    });
  }
  _readDigits(t, n, r, s) {
    for (; r < n && (s = t.charCodeAt(r)) && !(s > 57 || s < 48); ) r++;
    return r;
  }
  _readExponent(t, n, r) {
    let s = r < n && t[r];
    if (s === "e" || s === "E") {
      s = ++r < n && t[r], (s === "-" || s === "+") && r++;
      const i = r;
      if (r = this._readDigits(t, n, r), i === r) throw new ct("Invalid exponent", { pos: r, input: t });
    }
    return r;
  }
  readNumber() {
    const { input: t, length: n, pos: r } = this;
    let s = r;
    if (t[s] === "0" && (t[s + 1] === "x" || t[s + 1] === "X")) {
      for (s += 2; s < n && Bf[t[s].charCodeAt(0)]; ) s++;
      return this._parseAsBigInt(r, this.pos = s, !0, t[s]);
    }
    if (s = this._readDigits(t, n, s), s + 1 < n) {
      let i = !1, o = t[s] === "." ? this._readDigits(t, n, s + 1) : s + 1;
      if (o !== s + 1 && (i = !0) && (s = o), o = this._readExponent(t, n, s), o !== s && (i = !0) && (s = o), i) return this._parseAsDouble(r, this.pos = s);
    }
    return this._parseAsBigInt(r, this.pos = s, !1, t[s]);
  }
  readString(t, n) {
    const { input: r, pos: s } = this;
    return r[s + 1] === t && r[s + 2] === t ? this.readTripleQuotedString(t, n) : this.readSingleQuotedString(t, n);
  }
  _closeQuotedString(t, n, r) {
    switch (n) {
      case "b":
      case "B": {
        const s = this.processEscapes(t, !0), i = new Uint8Array(s.length);
        for (let o = 0; o < s.length; o++) i[o] = s.charCodeAt(o) & 255;
        return { type: $.BYTES, value: i, pos: r - 1 };
      }
      case "r":
      case "R":
        return { type: $.STRING, value: t, pos: r - 1 };
      default: {
        const s = this.processEscapes(t, !1);
        return { type: $.STRING, value: s, pos: r };
      }
    }
  }
  readSingleQuotedString(t, n) {
    const { input: r, length: s, pos: i } = this;
    let o, a = this.pos + 1;
    for (; a < s && (o = r[a]); ) {
      switch (o) {
        case t:
          const c = r.slice(i + 1, a);
          return this.pos = ++a, this._closeQuotedString(c, n, i);
        case `
`:
        case "\r":
          throw new ct("Newlines not allowed in single-quoted strings", { pos: i, input: r });
        case "\\":
          a++;
      }
      a++;
    }
    throw new ct("Unterminated string", { pos: i, input: r });
  }
  readTripleQuotedString(t, n) {
    const { input: r, length: s, pos: i } = this;
    let o, a = this.pos + 3;
    for (; a < s && (o = r[a]); ) {
      switch (o) {
        case t:
          if (r[a + 1] === t && r[a + 2] === t) {
            const c = r.slice(i + 3, a);
            return this.pos = a + 3, this._closeQuotedString(c, n, i);
          }
          break;
        case "\\":
          a++;
      }
      a++;
    }
    throw new ct("Unterminated triple-quoted string", { pos: i, input: r });
  }
  processEscapes(t, n) {
    if (!t.includes("\\")) return t;
    let r = "", s = 0;
    for (; s < t.length; ) {
      if (t[s] !== "\\" || s + 1 >= t.length) {
        r += t[s++];
        continue;
      }
      const i = t[s + 1];
      if (zc[i])
        r += zc[i], s += 2;
      else if (i === "u") {
        if (n) throw new ct("\\u not allowed in bytes literals");
        const o = t.substring(s + 2, s += 6);
        if (!/^[0-9a-fA-F]{4}$/.test(o)) throw new ct(`Invalid Unicode escape: \\u${o}`);
        const a = Number.parseInt(o, 16);
        if (a >= 55296 && a <= 57343) throw new ct(`Invalid Unicode surrogate: \\u${o}`);
        r += String.fromCharCode(a);
      } else if (i === "U") {
        if (n) throw new ct("\\U not allowed in bytes literals");
        const o = t.substring(s + 2, s += 10);
        if (!/^[0-9a-fA-F]{8}$/.test(o)) throw new ct(`Invalid Unicode escape: \\U${o}`);
        const a = Number.parseInt(o, 16);
        if (a > 1114111) throw new ct(`Invalid Unicode escape: \\U${o}`);
        if (a >= 55296 && a <= 57343) throw new ct(`Invalid Unicode surrogate: \\U${o}`);
        r += String.fromCodePoint(a);
      } else if (i === "x" || i === "X") {
        const o = t.substring(s + 2, s += 4);
        if (!/^[0-9a-fA-F]{2}$/.test(o)) throw new ct(`Invalid hex escape: \\${i}${o}`);
        r += String.fromCharCode(Number.parseInt(o, 16));
      } else if (i >= "0" && i <= "7") {
        const o = t.substring(s + 1, s += 4);
        if (!/^[0-7]{3}$/.test(o)) throw new ct("Octal escape must be 3 digits");
        const a = Number.parseInt(o, 8);
        if (a > 255) throw new ct(`Octal escape out of range: \\${o}`);
        r += String.fromCharCode(a);
      } else
        throw new ct(`Invalid escape sequence: \\${i}`);
    }
    return r;
  }
  readIdentifier() {
    const { pos: t, input: n, length: r } = this;
    let s = t;
    for (; s < r && this._isIdentifierCharCode(n[s].charCodeAt(0)); ) s++;
    const i = n.substring(t, this.pos = s);
    switch (i) {
      case "true":
        return { type: $.BOOLEAN, value: !0, pos: t };
      case "false":
        return { type: $.BOOLEAN, value: !1, pos: t };
      case "null":
        return { type: $.NULL, value: null, pos: t };
      case "in":
        return { type: $.IN, value: "in", pos: t };
      default:
        return { type: $.IDENTIFIER, value: i, pos: t };
    }
  }
}
class bw {
  constructor(t, n) {
    this.limits = t, this.registry = n;
  }
  #t(t, n = this.currentToken) {
    throw new ct(`Exceeded ${t} (${this.limits[t]})`, {
      pos: n.pos,
      input: this.input
    });
  }
  #e(t, n, r) {
    const s = new ca(t, this.input, n, r);
    return this.astNodesRemaining-- || this.#t("maxAstNodes", s), s;
  }
  #n() {
    const t = this.currentToken;
    return this.type = (this.currentToken = this.lexer.nextToken()).type, t;
  }
  consume(t) {
    if (this.type === t) return this.#n();
    throw new ct(
      `Expected ${ss[t]}, got ${ss[this.type]}`,
      { pos: this.currentToken.pos, input: this.input }
    );
  }
  match(t) {
    return this.type === t;
  }
  // Parse entry point
  parse(t) {
    this.input = t, this.lexer = new mw(t), this.#n(), this.maxDepthRemaining = this.limits.maxDepth, this.astNodesRemaining = this.limits.maxAstNodes;
    const n = this.parseExpression();
    if (this.match($.EOF)) return n;
    throw new ct(`Unexpected character: '${this.input[this.lexer.pos - 1]}'`, {
      pos: this.currentToken.pos,
      input: this.input
    });
  }
  #r(t, n, r, s) {
    const i = this.registry.findMacro(s, !!r, n.length);
    return i && (t.macro = i.handler({ ast: t, args: n, receiver: r, methodName: s, parser: this })), t;
  }
  #s(t) {
    return this.#r(t, t.args[1], null, t.args[0]);
  }
  #o(t) {
    return this.#r(t, t.args[2], t.args[1], t.args[0]);
  }
  // Expression ::= LogicalOr ('?' Expression ':' Expression)?
  parseExpression() {
    this.maxDepthRemaining-- || this.#t("maxDepth");
    const t = this.parseLogicalOr();
    if (!this.match($.QUESTION)) return ++this.maxDepthRemaining && t;
    const n = this.#n(), r = this.parseExpression();
    this.consume($.COLON);
    const s = this.parseExpression();
    return this.maxDepthRemaining++, this.#e(n.pos, "?:", [t, r, s]);
  }
  // LogicalOr ::= LogicalAnd ('||' LogicalAnd)*
  parseLogicalOr() {
    let t = this.parseLogicalAnd();
    for (; this.match($.OR); ) {
      const n = this.#n();
      t = this.#e(n.pos, n.value, [t, this.parseLogicalAnd()]);
    }
    return t;
  }
  // LogicalAnd ::= Equality ('&&' Equality)*
  parseLogicalAnd() {
    let t = this.parseEquality();
    for (; this.match($.AND); ) {
      const n = this.#n();
      t = this.#e(n.pos, n.value, [t, this.parseEquality()]);
    }
    return t;
  }
  // Equality ::= Relational (('==' | '!=') Relational)*
  parseEquality() {
    let t = this.parseRelational();
    for (; this.match($.EQ) || this.match($.NE); ) {
      const n = this.#n();
      t = this.#e(n.pos, n.value, [t, this.parseRelational()]);
    }
    return t;
  }
  // Relational ::= Additive (('<' | '<=' | '>' | '>=' | 'in') Additive)*
  parseRelational() {
    let t = this.parseAdditive();
    for (; this.match($.LT) || this.match($.LE) || this.match($.GT) || this.match($.GE) || this.match($.IN); ) {
      const n = this.#n();
      t = this.#e(n.pos, n.value, [t, this.parseAdditive()]);
    }
    return t;
  }
  // Additive ::= Multiplicative (('+' | '-') Multiplicative)*
  parseAdditive() {
    let t = this.parseMultiplicative();
    for (; this.match($.PLUS) || this.match($.MINUS); ) {
      const n = this.#n();
      t = this.#e(n.pos, n.value, [t, this.parseMultiplicative()]);
    }
    return t;
  }
  // Multiplicative ::= Unary (('*' | '/' | '%') Unary)*
  parseMultiplicative() {
    let t = this.parseUnary();
    for (; this.match($.MULTIPLY) || this.match($.DIVIDE) || this.match($.MODULO); ) {
      const n = this.#n();
      t = this.#e(n.pos, n.value, [t, this.parseUnary()]);
    }
    return t;
  }
  // Unary ::= ('!' | '-')* Postfix
  parseUnary() {
    return this.type === $.NOT ? this.#e(this.#n().pos, "!_", [this.parseUnary()]) : this.type === $.MINUS ? this.#e(this.#n().pos, "-_", [this.parseUnary()]) : this.parsePostfix();
  }
  // Postfix ::= Primary (('.' IDENTIFIER ('(' ArgumentList ')')? | '[' Expression ']'))*
  parsePostfix() {
    let t = this.parsePrimary();
    const n = this.maxDepthRemaining;
    for (; ; ) {
      if (this.match($.DOT)) {
        const r = this.#n();
        this.maxDepthRemaining-- || this.#t("maxDepth", r);
        const s = this.match($.QUESTION) && this.registry.enableOptionalTypes && !!this.#n(), i = this.consume($.IDENTIFIER);
        if (this.match($.LPAREN) && this.#n()) {
          const o = this.parseArgumentList();
          this.consume($.RPAREN), t = this.#o(
            this.#e(i.pos, "rcall", [i.value, t, o])
          );
        } else
          t = this.#e(i.pos, s ? ".?" : ".", [t, i.value]);
        continue;
      }
      if (this.match($.LBRACKET)) {
        const r = this.#n();
        this.maxDepthRemaining-- || this.#t("maxDepth", r);
        const s = this.match($.QUESTION) && this.registry.enableOptionalTypes && !!this.#n(), i = this.parseExpression();
        this.consume($.RBRACKET), t = this.#e(r.pos, s ? "[?]" : "[]", [t, i]);
        continue;
      }
      break;
    }
    return this.maxDepthRemaining = n, t;
  }
  // Primary ::= NUMBER | STRING | BOOLEAN | NULL | IDENTIFIER | '(' Expression ')' | Array | Object
  parsePrimary() {
    switch (this.type) {
      case $.NUMBER:
      case $.STRING:
      case $.BYTES:
      case $.BOOLEAN:
      case $.NULL:
        return this.#a();
      case $.IDENTIFIER:
        return this.#c();
      case $.LPAREN:
        return this.#u();
      case $.LBRACKET:
        return this.parseList();
      case $.LBRACE:
        return this.parseMap();
    }
    throw new ct(`Unexpected token: ${ss[this.type]}`, {
      pos: this.currentToken.pos,
      input: this.input
    });
  }
  #a() {
    const t = this.#n();
    return this.#e(t.pos, "value", t.value);
  }
  #c() {
    const { value: t, pos: n } = this.consume($.IDENTIFIER);
    if (ww.has(t))
      throw new ct(`Reserved identifier: ${t}`, {
        pos: n,
        input: this.input
      });
    if (!this.match($.LPAREN)) return this.#e(n, "id", t);
    this.#n();
    const r = this.parseArgumentList();
    return this.consume($.RPAREN), this.#s(this.#e(n, "call", [t, r]));
  }
  #u() {
    this.consume($.LPAREN);
    const t = this.parseExpression();
    return this.consume($.RPAREN), t;
  }
  parseList() {
    const t = this.consume($.LBRACKET), n = [];
    let r = this.limits.maxListElements;
    if (!this.match($.RBRACKET))
      for (n.push(this.parseExpression()), r-- || this.#t("maxListElements", n.at(-1)); this.match($.COMMA) && (this.#n(), !this.match($.RBRACKET)); )
        n.push(this.parseExpression()), r-- || this.#t("maxListElements", n.at(-1));
    return this.consume($.RBRACKET), this.#e(t.pos, "list", n);
  }
  parseMap() {
    const t = this.consume($.LBRACE), n = [];
    let r = this.limits.maxMapEntries;
    if (!this.match($.RBRACE))
      for (n.push(this.parseProperty()), r-- || this.#t("maxMapEntries", n.at(-1)[0]); this.match($.COMMA) && (this.#n(), !this.match($.RBRACE)); )
        n.push(this.parseProperty()), r-- || this.#t("maxMapEntries", n.at(-1)[0]);
    return this.consume($.RBRACE), this.#e(t.pos, "map", n);
  }
  parseProperty() {
    return [this.parseExpression(), (this.consume($.COLON), this.parseExpression())];
  }
  parseArgumentList() {
    const t = [];
    let n = this.limits.maxCallArguments;
    if (!this.match($.RPAREN))
      for (t.push(this.parseExpression()), n-- || this.#t("maxCallArguments", t.at(-1)); this.match($.COMMA) && (this.#n(), !this.match($.RPAREN)); )
        t.push(this.parseExpression()), n-- || this.#t("maxCallArguments", t.at(-1));
    return t;
  }
}
const ua = Object.freeze({
  maxAstNodes: 1e5,
  maxDepth: 250,
  maxListElements: 1e3,
  maxMapEntries: 1e3,
  maxCallArguments: 32
}), Ew = new Set(Object.keys(ua));
function xw(e, t = ua) {
  const n = e ? Object.keys(e) : void 0;
  if (!n?.length) return t;
  const r = { ...t };
  for (const s of n) {
    if (!Ew.has(s)) throw new TypeError(`Unknown limits option: ${s}`);
    const i = e[s];
    typeof i == "number" && (r[s] = i);
  }
  return Object.freeze(r);
}
const Tw = Object.freeze({
  unlistedVariablesAreDyn: !1,
  homogeneousAggregateLiterals: !0,
  enableOptionalTypes: !1,
  limits: ua
});
function Oi(e, t, n) {
  const r = e?.[n] ?? t?.[n];
  if (typeof r != "boolean") throw new TypeError(`Invalid option: ${n}`);
  return r;
}
function Sw(e, t = Tw) {
  return e ? Object.freeze({
    unlistedVariablesAreDyn: Oi(e, t, "unlistedVariablesAreDyn"),
    homogeneousAggregateLiterals: Oi(e, t, "homogeneousAggregateLiterals"),
    enableOptionalTypes: Oi(e, t, "enableOptionalTypes"),
    limits: xw(e.limits, t.limits)
  }) : t;
}
const ii = Gy({ enableOptionalTypes: !1 });
My(ii);
uw(ii);
cw(ii);
const jc = /* @__PURE__ */ new WeakMap();
class Tn {
  #t;
  #e;
  #n;
  #r;
  #s;
  #o;
  constructor(t, n) {
    this.opts = Sw(t, n?.opts), this.#t = (n instanceof Tn ? jc.get(n) : ii).clone(this.opts);
    const r = {
      objectTypes: this.#t.objectTypes,
      objectTypesByConstructor: this.#t.objectTypesByConstructor,
      registry: this.#t,
      opts: this.opts
    };
    this.#n = new Kc(r), this.#r = new Kc(r, !0), this.#e = new vw(r), this.#s = new bw(this.opts.limits, this.#t), this.#o = new qy(this.#t.variables, this.#t.constants), jc.set(this, this.#t), Object.freeze(this);
  }
  clone(t) {
    return new Tn(t, this);
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
      return this.#a(this.#s.parse(t));
    } catch (n) {
      return { valid: !1, error: n };
    }
  }
  #a(t) {
    try {
      const n = this.#n.check(t, this.#o.fork());
      return { valid: !0, type: this.#c(n) };
    } catch (n) {
      return { valid: !1, error: n };
    }
  }
  #c(t) {
    return t.name === "list<dyn>" ? "list" : t.name === "map<dyn, dyn>" ? "map" : t.name;
  }
  parse(t) {
    const n = this.#s.parse(t), r = this.#u.bind(this, n);
    return r.check = this.#a.bind(this, n), r.ast = n, r;
  }
  evaluate(t, n) {
    return this.#u(this.#s.parse(t), n);
  }
  #u(t, n = null) {
    const r = this.#o.fork().withContext(n);
    return t.checkedType || this.#r.check(t, r), this.#e.eval(t, r);
  }
}
class vw extends Of {
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
    return n?.hasNoDynTypes() ? n : this.registry.getDynType(this.debugRuntimeType(t, n));
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
      return r instanceof Promise ? r.catch((s) => s) : r;
    } catch (r) {
      return r;
    }
  }
  eval(t, n) {
    return t.evaluate(this, t, n);
  }
}
new Tn({
  unlistedVariablesAreDyn: !0
});
const la = "amount", Aw = "expiry", Iw = "birth", kw = "weight", Cw = "inputType", Ow = "script", jn = {
  signature: "now(): double",
  implementation: () => Math.floor(Date.now() / 1e3)
}, Gc = new Tn().registerVariable(la, "double").registerVariable(Ow, "string").registerFunction(jn.signature, jn.implementation), Bw = new Tn().registerVariable(la, "double").registerVariable(Aw, "double").registerVariable(Iw, "double").registerVariable(kw, "double").registerVariable(Cw, "string").registerFunction(jn.signature, jn.implementation), Nw = new Tn().registerVariable(la, "double").registerFunction(jn.signature, jn.implementation);
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
class Rw {
  /**
   * Creates a new Estimator with the given config
   * @param config - Configuration containing CEL programs for fee calculation
   */
  constructor(t) {
    this.config = t, this.intentOffchainInput = t.offchainInput ? Gr(t.offchainInput, Bw) : void 0, this.intentOnchainInput = t.onchainInput ? Gr(t.onchainInput, Nw) : void 0, this.intentOffchainOutput = t.offchainOutput ? Gr(t.offchainOutput, Gc) : void 0, this.intentOnchainOutput = t.onchainOutput ? Gr(t.onchainOutput, Gc) : void 0;
  }
  /**
   * Evaluates the fee for a given vtxo input
   * @param input - The offchain input to evaluate
   * @returns The fee amount for this input
   */
  evalOffchainInput(t) {
    if (!this.intentOffchainInput)
      return Pt.ZERO;
    const n = $w(t);
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
    const n = qc(t);
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
    const n = qc(t);
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
  eval(t, n, r, s) {
    let i = Pt.ZERO;
    for (const o of t)
      i = i.add(this.evalOffchainInput(o));
    for (const o of n)
      i = i.add(this.evalOnchainInput(o));
    for (const o of r)
      i = i.add(this.evalOffchainOutput(o));
    for (const o of s)
      i = i.add(this.evalOnchainOutput(o));
    return i;
  }
}
function $w(e) {
  const t = {
    amount: Number(e.amount),
    inputType: e.type,
    weight: e.weight
  };
  return e.expiry && (t.expiry = Math.floor(e.expiry.getTime() / 1e3)), e.birth && (t.birth = Math.floor(e.birth.getTime() / 1e3)), t;
}
function qc(e) {
  return {
    amount: Number(e.amount),
    script: e.script
  };
}
function Gr(e, t) {
  const n = t.parse(e), r = n.check();
  if (!r.valid)
    throw new Error(`type check failed: ${r.error?.message ?? "unknown error"}`);
  if (r.type !== "double")
    throw new Error(`expected return type double, got ${r.type}`);
  return { program: n, text: e };
}
const sr = {
  commitmentTxid: "",
  boardingTxid: "",
  arkTxid: ""
};
async function Uw(e, t, n, r) {
  const s = [...e].sort((u, l) => u.createdAt.getTime() - l.createdAt.getTime()), i = [];
  let o = [];
  for (const u of s)
    if (u.status.isLeaf ? !n.has(u.virtualStatus.commitmentTxIds[0]) && s.filter((l) => l.settledBy === u.virtualStatus.commitmentTxIds[0]).length === 0 && o.push({
      key: {
        ...sr,
        commitmentTxid: u.virtualStatus.commitmentTxIds[0]
      },
      tag: "batch",
      type: Te.TxReceived,
      amount: u.value,
      settled: u.status.isLeaf || u.isSpent,
      createdAt: u.createdAt.getTime()
    }) : s.filter((l) => l.arkTxId === u.txid).length === 0 && o.push({
      key: { ...sr, arkTxid: u.txid },
      tag: "offchain",
      type: Te.TxReceived,
      amount: u.value,
      settled: u.status.isLeaf || u.isSpent,
      createdAt: u.createdAt.getTime()
    }), u.isSpent) {
      if (u.arkTxId && !i.some((l) => l.key.arkTxid === u.arkTxId)) {
        const l = s.filter((d) => d.txid === u.arkTxId), h = s.filter((d) => d.arkTxId === u.arkTxId).reduce((d, g) => d + g.value, 0);
        let p = 0, y = 0;
        if (l.length > 0) {
          const d = l.reduce((g, w) => g + w.value, 0);
          p = h - d, y = l[0].createdAt.getTime();
        } else
          p = h, y = r ? await r(u.arkTxId) : u.createdAt.getTime() + 1;
        i.push({
          key: { ...sr, arkTxid: u.arkTxId },
          tag: "offchain",
          type: Te.TxSent,
          amount: p,
          settled: !0,
          createdAt: y
        });
      }
      if (u.settledBy && !n.has(u.settledBy) && !i.some((l) => l.key.commitmentTxid === u.settledBy)) {
        const l = s.filter((p) => p.status.isLeaf && p.virtualStatus.commitmentTxIds?.every((y) => u.settledBy === y)), h = s.filter((p) => p.settledBy === u.settledBy).reduce((p, y) => p + y.value, 0);
        if (l.length > 0) {
          const p = l.reduce((y, d) => y + d.value, 0);
          h > p && i.push({
            key: { ...sr, commitmentTxid: u.settledBy },
            tag: "exit",
            type: Te.TxSent,
            amount: h - p,
            settled: !0,
            createdAt: l[0].createdAt.getTime()
          });
        } else
          i.push({
            key: { ...sr, commitmentTxid: u.settledBy },
            tag: "exit",
            type: Te.TxSent,
            amount: h,
            settled: !0,
            // TODO: fetch commitment tx with /v1/indexer/commitmentTx/<commitmentTxid> to know when the tx was made
            createdAt: u.createdAt.getTime() + 1
          });
      }
    }
  return [...t.map((u) => ({ ...u, tag: "boarding" })), ...i, ...o].sort((u, l) => l.createdAt - u.createdAt);
}
const ce = "vtxos", ue = "utxos", le = "transactions", Le = "walletState", qt = "contracts", Yc = "contractsCollections", Nf = 2;
function Rf(e) {
  if (!e.objectStoreNames.contains(ce)) {
    const t = e.createObjectStore(ce, {
      keyPath: ["address", "txid", "vout"]
    });
    t.indexNames.contains("address") || t.createIndex("address", "address", {
      unique: !1
    }), t.indexNames.contains("txid") || t.createIndex("txid", "txid", { unique: !1 }), t.indexNames.contains("value") || t.createIndex("value", "value", { unique: !1 }), t.indexNames.contains("status") || t.createIndex("status", "status", {
      unique: !1
    }), t.indexNames.contains("virtualStatus") || t.createIndex("virtualStatus", "virtualStatus", {
      unique: !1
    }), t.indexNames.contains("createdAt") || t.createIndex("createdAt", "createdAt", {
      unique: !1
    }), t.indexNames.contains("isSpent") || t.createIndex("isSpent", "isSpent", {
      unique: !1
    }), t.indexNames.contains("isUnrolled") || t.createIndex("isUnrolled", "isUnrolled", {
      unique: !1
    }), t.indexNames.contains("spentBy") || t.createIndex("spentBy", "spentBy", {
      unique: !1
    }), t.indexNames.contains("settledBy") || t.createIndex("settledBy", "settledBy", {
      unique: !1
    }), t.indexNames.contains("arkTxId") || t.createIndex("arkTxId", "arkTxId", {
      unique: !1
    });
  }
  if (!e.objectStoreNames.contains(ue)) {
    const t = e.createObjectStore(ue, {
      keyPath: ["address", "txid", "vout"]
    });
    t.indexNames.contains("address") || t.createIndex("address", "address", {
      unique: !1
    }), t.indexNames.contains("txid") || t.createIndex("txid", "txid", { unique: !1 }), t.indexNames.contains("value") || t.createIndex("value", "value", { unique: !1 }), t.indexNames.contains("status") || t.createIndex("status", "status", {
      unique: !1
    });
  }
  if (!e.objectStoreNames.contains(le)) {
    const t = e.createObjectStore(le, {
      keyPath: [
        "address",
        "keyBoardingTxid",
        "keyCommitmentTxid",
        "keyArkTxid"
      ]
    });
    t.indexNames.contains("address") || t.createIndex("address", "address", {
      unique: !1
    }), t.indexNames.contains("type") || t.createIndex("type", "type", {
      unique: !1
    }), t.indexNames.contains("amount") || t.createIndex("amount", "amount", {
      unique: !1
    }), t.indexNames.contains("settled") || t.createIndex("settled", "settled", {
      unique: !1
    }), t.indexNames.contains("createdAt") || t.createIndex("createdAt", "createdAt", {
      unique: !1
    }), t.indexNames.contains("arkTxid") || t.createIndex("arkTxid", "key.arkTxid", {
      unique: !1
    });
  }
  if (e.objectStoreNames.contains(Le) || e.createObjectStore(Le, {
    keyPath: "key"
  }), !e.objectStoreNames.contains(qt)) {
    const t = e.createObjectStore(qt, {
      keyPath: "script"
    });
    t.indexNames.contains("type") || t.createIndex("type", "type", {
      unique: !1
    }), t.indexNames.contains("state") || t.createIndex("state", "state", {
      unique: !1
    });
  }
  e.objectStoreNames.contains(Yc) || e.createObjectStore(Yc, {
    keyPath: "key"
  });
}
const _s = ([e, t]) => ({
  cb: v.encode(fe.encode(e)),
  s: v.encode(t)
}), Pw = (e) => ({
  ...e,
  tapTree: v.encode(e.tapTree),
  forfeitTapLeafScript: _s(e.forfeitTapLeafScript),
  intentTapLeafScript: _s(e.intentTapLeafScript),
  extraWitness: e.extraWitness?.map(v.encode)
}), _w = (e) => ({
  ...e,
  tapTree: v.encode(e.tapTree),
  forfeitTapLeafScript: _s(e.forfeitTapLeafScript),
  intentTapLeafScript: _s(e.intentTapLeafScript),
  extraWitness: e.extraWitness?.map(v.encode)
}), Ls = (e) => {
  const t = fe.decode(v.decode(e.cb)), n = v.decode(e.s);
  return [t, n];
}, Lw = (e) => ({
  ...e,
  createdAt: new Date(e.createdAt),
  tapTree: v.decode(e.tapTree),
  forfeitTapLeafScript: Ls(e.forfeitTapLeafScript),
  intentTapLeafScript: Ls(e.intentTapLeafScript),
  extraWitness: e.extraWitness?.map(v.decode)
}), Dw = (e) => ({
  ...e,
  tapTree: v.decode(e.tapTree),
  forfeitTapLeafScript: Ls(e.forfeitTapLeafScript),
  intentTapLeafScript: Ls(e.intentTapLeafScript),
  extraWitness: e.extraWitness?.map(v.decode)
});
function Vw() {
  if (typeof globalThis < "u")
    return typeof globalThis.self == "object" && globalThis.self !== null ? { globalObject: globalThis.self } : typeof globalThis.window == "object" && globalThis.window !== null ? { globalObject: globalThis.window } : { globalObject: globalThis };
  throw new Error("Global object not found");
}
const pr = /* @__PURE__ */ new Map(), pn = /* @__PURE__ */ new Map();
async function $f(e, t, n) {
  const { globalObject: r } = Vw();
  if (!r.indexedDB)
    throw new Error("IndexedDB is not available in this environment");
  const s = pr.get(e);
  if (s) {
    if (s.version !== t)
      throw new Error(`Database "${e}" already opened with version ${s.version}; requested ${t}`);
    return pn.set(e, (pn.get(e) ?? 0) + 1), s.promise;
  }
  const i = new Promise((o, a) => {
    const c = r.indexedDB.open(e, t);
    c.onerror = () => {
      pr.delete(e), pn.delete(e), a(c.error);
    }, c.onsuccess = () => {
      o(c.result);
    }, c.onupgradeneeded = () => {
      const u = c.result;
      n(u);
    }, c.onblocked = () => {
      console.warn("Database upgrade blocked - close other tabs/connections");
    };
  });
  return pr.set(e, { version: t, promise: i }), pn.set(e, 1), i;
}
async function Uf(e) {
  const t = pr.get(e);
  if (!t)
    return !1;
  const n = (pn.get(e) ?? 1) - 1;
  if (n > 0)
    return pn.set(e, n), !1;
  pn.delete(e), pr.delete(e);
  try {
    (await t.promise).close();
  } catch {
  }
  return !0;
}
const Pf = "arkade-service-worker";
class Mw {
  constructor(t = Pf) {
    this.dbName = t, this.db = null;
  }
  async clear() {
    try {
      const t = await this.getDB();
      return new Promise((n, r) => {
        const s = t.transaction([qt], "readwrite"), i = s.objectStore(qt), o = s.objectStore(qt), a = i.clear(), c = o.clear();
        let u = 0;
        const l = () => {
          u++, u === 2 && n();
        };
        a.onsuccess = l, c.onsuccess = l, a.onerror = () => r(a.error), c.onerror = () => r(c.error);
      });
    } catch (t) {
      throw console.error("Failed to clear contract data:", t), t;
    }
  }
  async getContracts(t) {
    try {
      const r = (await this.getDB()).transaction([qt], "readonly").objectStore(qt);
      if (!t || Object.keys(t).length === 0)
        return new Promise((o, a) => {
          const c = r.getAll();
          c.onerror = () => a(c.error), c.onsuccess = () => o(c.result ?? []);
        });
      const s = Fw(t);
      if (s.has("script")) {
        const o = s.get("script"), a = await Promise.all(o.map((c) => new Promise((u, l) => {
          const f = r.get(c);
          f.onerror = () => l(f.error), f.onsuccess = () => u(f.result);
        })));
        return this.applyContractFilter(a, s);
      }
      if (s.has("state")) {
        const o = await this.getContractsByIndexValues(r, "state", s.get("state"));
        return this.applyContractFilter(o, s);
      }
      if (s.has("type")) {
        const o = await this.getContractsByIndexValues(r, "type", s.get("type"));
        return this.applyContractFilter(o, s);
      }
      const i = await new Promise((o, a) => {
        const c = r.getAll();
        c.onerror = () => a(c.error), c.onsuccess = () => o(c.result ?? []);
      });
      return this.applyContractFilter(i, s);
    } catch (n) {
      return console.error("Failed to get contracts:", n), [];
    }
  }
  async saveContract(t) {
    try {
      const n = await this.getDB();
      return new Promise((r, s) => {
        const a = n.transaction([qt], "readwrite").objectStore(qt).put(t);
        a.onerror = () => s(a.error), a.onsuccess = () => r();
      });
    } catch (n) {
      throw console.error("Failed to save contract:", n), n;
    }
  }
  async deleteContract(t) {
    try {
      const n = await this.getDB();
      return new Promise((r, s) => {
        const o = n.transaction([qt], "readwrite").objectStore(qt), a = o.get(t);
        a.onerror = () => s(a.error), a.onsuccess = () => {
          const c = o.delete(t);
          c.onerror = () => s(c.error), c.onsuccess = () => r();
        };
      });
    } catch (n) {
      throw console.error(`Failed to delete contract ${t}:`, n), n;
    }
  }
  getContractsByIndexValues(t, n, r) {
    if (r.length === 0)
      return Promise.resolve([]);
    const s = t.index(n), i = r.map((o) => new Promise((a, c) => {
      const u = s.getAll(o);
      u.onerror = () => c(u.error), u.onsuccess = () => a(u.result ?? []);
    }));
    return Promise.all(i).then((o) => o.flatMap((a) => a));
  }
  applyContractFilter(t, n) {
    return t.filter((r) => !(r === void 0 || n.has("script") && !n.get("script")?.includes(r.script) || n.has("state") && !n.get("state")?.includes(r.state) || n.has("type") && !n.get("type")?.includes(r.type)));
  }
  async getDB() {
    return this.db ? this.db : (this.db = await $f(this.dbName, Nf, Rf), this.db);
  }
  async [Symbol.asyncDispose]() {
    this.db && (await Uf(this.dbName), this.db = null);
  }
}
const Hw = ["script", "state", "type"];
function Fw(e) {
  const t = /* @__PURE__ */ new Map();
  return Hw.forEach((n) => {
    e?.[n] && (Array.isArray(e[n]) ? t.set(n, e[n]) : t.set(n, [e[n]]));
  }), t;
}
class Ww {
  constructor(t = Pf) {
    this.dbName = t, this.db = null;
  }
  async clear() {
    try {
      const t = await this.getDB();
      return new Promise((n, r) => {
        const s = t.transaction([
          ce,
          ue,
          le,
          Le
        ], "readwrite"), i = s.objectStore(ce), o = s.objectStore(ue), a = s.objectStore(le), c = s.objectStore(Le), u = [
          i.clear(),
          o.clear(),
          a.clear(),
          c.clear()
        ];
        let l = 0;
        const f = () => {
          l++, l === u.length && n();
        };
        u.forEach((h) => {
          h.onsuccess = f, h.onerror = () => r(h.error);
        });
      });
    } catch (t) {
      throw console.error("Failed to clear wallet data:", t), t;
    }
  }
  async [Symbol.asyncDispose]() {
    this.db && (await Uf(this.dbName), this.db = null);
  }
  async getVtxos(t) {
    try {
      const n = await this.getDB();
      return new Promise((r, s) => {
        const c = n.transaction([ce], "readonly").objectStore(ce).index("address").getAll(t);
        c.onerror = () => s(c.error), c.onsuccess = () => {
          const l = (c.result || []).map(Lw);
          r(l);
        };
      });
    } catch (n) {
      return console.error(`Failed to get VTXOs for address ${t}:`, n), [];
    }
  }
  async saveVtxos(t, n) {
    try {
      const r = await this.getDB();
      return new Promise((s, i) => {
        const o = r.transaction([ce], "readwrite"), a = o.objectStore(ce), c = n.map((u) => new Promise((l, f) => {
          const h = Pw(u), p = {
            address: t,
            ...h
          }, y = a.put(p);
          y.onerror = () => f(y.error), y.onsuccess = () => l();
        }));
        Promise.all(c).then(() => s()).catch(i), o.onerror = () => i(o.error);
      });
    } catch (r) {
      throw console.error(`Failed to save VTXOs for address ${t}:`, r), r;
    }
  }
  async deleteVtxos(t) {
    try {
      const n = await this.getDB();
      return new Promise((r, s) => {
        const c = n.transaction([ce], "readwrite").objectStore(ce).index("address").openCursor(IDBKeyRange.only(t));
        c.onerror = () => s(c.error), c.onsuccess = () => {
          const u = c.result;
          u ? (u.delete(), u.continue()) : r();
        };
      });
    } catch (n) {
      throw console.error(`Failed to clear VTXOs for address ${t}:`, n), n;
    }
  }
  async getUtxos(t) {
    try {
      const n = await this.getDB();
      return new Promise((r, s) => {
        const c = n.transaction([ue], "readonly").objectStore(ue).index("address").getAll(t);
        c.onerror = () => s(c.error), c.onsuccess = () => {
          const l = (c.result || []).map(Dw);
          r(l);
        };
      });
    } catch (n) {
      return console.error(`Failed to get UTXOs for address ${t}:`, n), [];
    }
  }
  async saveUtxos(t, n) {
    try {
      const r = await this.getDB();
      return new Promise((s, i) => {
        const o = r.transaction([ue], "readwrite"), a = o.objectStore(ue), c = n.map((u) => new Promise((l, f) => {
          const h = _w(u), p = {
            address: t,
            ...h
          }, y = a.put(p);
          y.onerror = () => f(y.error), y.onsuccess = () => l();
        }));
        Promise.all(c).then(() => s()).catch(i), o.onerror = () => i(o.error);
      });
    } catch (r) {
      throw console.error(`Failed to save UTXOs for address ${t}:`, r), r;
    }
  }
  async deleteUtxos(t) {
    try {
      const n = await this.getDB();
      return new Promise((r, s) => {
        const c = n.transaction([ue], "readwrite").objectStore(ue).index("address").openCursor(IDBKeyRange.only(t));
        c.onerror = () => s(c.error), c.onsuccess = () => {
          const u = c.result;
          u ? (u.delete(), u.continue()) : r();
        };
      });
    } catch (n) {
      throw console.error(`Failed to clear UTXOs for address ${t}:`, n), n;
    }
  }
  async getTransactionHistory(t) {
    try {
      const n = await this.getDB();
      return new Promise((r, s) => {
        const c = n.transaction([le], "readonly").objectStore(le).index("address").getAll(t);
        c.onerror = () => s(c.error), c.onsuccess = () => {
          const u = c.result || [];
          r(u.sort((l, f) => l.createdAt - f.createdAt));
        };
      });
    } catch (n) {
      return console.error(`Failed to get transaction history for address ${t}:`, n), [];
    }
  }
  async saveTransactions(t, n) {
    try {
      const r = await this.getDB();
      return new Promise((s, i) => {
        const o = r.transaction([le], "readwrite"), a = o.objectStore(le);
        n.forEach((c) => {
          const u = {
            address: t,
            ...c,
            keyBoardingTxid: c.key.boardingTxid,
            keyCommitmentTxid: c.key.commitmentTxid,
            keyArkTxid: c.key.arkTxid
          };
          a.put(u);
        }), o.oncomplete = () => s(), o.onerror = () => i(o.error), o.onabort = () => i(new Error("Transaction aborted"));
      });
    } catch (r) {
      throw console.error(`Failed to save transactions for address ${t}:`, r), r;
    }
  }
  async deleteTransactions(t) {
    try {
      const n = await this.getDB();
      return new Promise((r, s) => {
        const c = n.transaction([le], "readwrite").objectStore(le).index("address").openCursor(IDBKeyRange.only(t));
        c.onerror = () => s(c.error), c.onsuccess = () => {
          const u = c.result;
          u ? (u.delete(), u.continue()) : r();
        };
      });
    } catch (n) {
      throw console.error(`Failed to clear transactions for address ${t}:`, n), n;
    }
  }
  async getWalletState() {
    try {
      const t = await this.getDB();
      return new Promise((n, r) => {
        const o = t.transaction([Le], "readonly").objectStore(Le).get("state");
        o.onerror = () => r(o.error), o.onsuccess = () => {
          const a = o.result;
          a && a.data ? n(a.data) : n(null);
        };
      });
    } catch (t) {
      return console.error("Failed to get wallet state:", t), null;
    }
  }
  async saveWalletState(t) {
    try {
      const n = await this.getDB();
      return new Promise((r, s) => {
        const o = n.transaction([Le], "readwrite").objectStore(Le), a = {
          key: "state",
          data: t
        }, c = o.put(a);
        c.onerror = () => s(c.error), c.onsuccess = () => r();
      });
    } catch (n) {
      throw console.error("Failed to save wallet state:", n), n;
    }
  }
  async getDB() {
    return this.db ? this.db : (this.db = await $f(this.dbName, Nf, Rf), this.db);
  }
}
class Kw {
  constructor(t) {
    this.contracts = /* @__PURE__ */ new Map(), this.isWatching = !1, this.connectionState = "disconnected", this.reconnectAttempts = 0, this.config = {
      failsafePollIntervalMs: 6e4,
      // 1 minute
      reconnectDelayMs: 1e3,
      // 1 second
      maxReconnectDelayMs: 3e4,
      // 30 seconds
      maxReconnectAttempts: 0,
      // unlimited
      ...t
    };
  }
  /**
   * Add a contract to be watched.
   *
   * Active contracts are immediately subscribed. All contracts are polled
   * to discover any existing VTXOs (which may cause them to be watched
   * even if inactive).
   */
  async addContract(t) {
    const n = {
      contract: t,
      lastKnownVtxos: /* @__PURE__ */ new Map()
    };
    this.contracts.set(t.script, n), this.isWatching && (await this.pollContracts([t.script]), await this.tryUpdateSubscription());
  }
  /**
   * Update an existing contract.
   */
  async updateContract(t) {
    const n = this.contracts.get(t.script);
    if (!n)
      throw new Error(`Contract ${t.script} not found`);
    n.contract = t, this.isWatching && await this.tryUpdateSubscription();
  }
  /**
   * Remove a contract from watching.
   */
  async removeContract(t) {
    this.contracts.get(t) && (this.contracts.delete(t), this.isWatching && await this.tryUpdateSubscription());
  }
  /**
   * Get all in-memory contracts.
   */
  getAllContracts() {
    return Array.from(this.contracts.values()).map((t) => t.contract);
  }
  /**
   * Get all active in-memory contracts.
   */
  getActiveContracts() {
    return this.getAllContracts().filter((t) => t.state === "active");
  }
  /**
   * Get scripts that should be watched.
   *
   * Returns scripts for:
   * - All active contracts
   * - All contracts with known VTXOs (regardless of state)
   *
   * This ensures we continue monitoring contracts even after they're
   * deactivated, as long as they have unspent VTXOs.
   */
  getScriptsToWatch() {
    const t = /* @__PURE__ */ new Set();
    for (const [, n] of this.contracts) {
      if (n.contract.state === "active") {
        t.add(n.contract.script);
        continue;
      }
      n.lastKnownVtxos.size > 0 && t.add(n.contract.script);
    }
    return Array.from(t);
  }
  /**
   * Get VTXOs for contracts, grouped by contract script.
   * Uses Repository.
   */
  async getContractVtxos(t) {
    const { contractScripts: n, includeSpent: r } = t, s = this.config.walletRepository, o = Array.from(this.contracts.values()).filter((c) => !(n && !n.includes(c.contract.script))).map(async (c) => {
      const u = await s.getVtxos(c.contract.address);
      if (u.length > 0) {
        const l = u.map((h) => ({
          ...h,
          contractScript: c.contract.script
        })), f = r ? l : l.filter((h) => !h.isSpent);
        return [[c.contract.script, f]];
      }
      return [];
    }), a = await Promise.all(o);
    return new Map(a.flat(1));
  }
  /**
   * Start watching for VTXO events across all active contracts.
   */
  async startWatching(t) {
    if (this.isWatching)
      throw new Error("Already watching");
    return this.eventCallback = t, this.isWatching = !0, this.abortController = new AbortController(), this.reconnectAttempts = 0, await this.connect(), this.startFailsafePolling(), () => this.stopWatching();
  }
  /**
   * Stop watching for events.
   */
  async stopWatching() {
    if (this.isWatching = !1, this.connectionState = "disconnected", this.abortController?.abort(), this.reconnectTimeoutId && (clearTimeout(this.reconnectTimeoutId), this.reconnectTimeoutId = void 0), this.failsafePollIntervalId && (clearInterval(this.failsafePollIntervalId), this.failsafePollIntervalId = void 0), this.subscriptionId) {
      try {
        await this.config.indexerProvider.unsubscribeForScripts(this.subscriptionId);
      } catch {
      }
      this.subscriptionId = void 0;
    }
    this.eventCallback = void 0;
  }
  /**
   * Check if currently watching.
   */
  isCurrentlyWatching() {
    return this.isWatching;
  }
  /**
   * Get current connection state.
   */
  getConnectionState() {
    return this.connectionState;
  }
  /**
   * Force a poll of all active contracts.
   * Useful for manual refresh or after app resume.
   */
  async forcePoll() {
    this.isWatching && await this.pollAllContracts();
  }
  /**
   * Check for expired contracts, update their state, and emit events.
   */
  checkExpiredContracts() {
    const t = Date.now();
    for (const n of this.contracts.values()) {
      const r = n.contract;
      r.state === "active" && r.expiresAt && r.expiresAt <= t && (r.state = "inactive", this.eventCallback?.({
        type: "contract_expired",
        contractScript: r.script,
        contract: r,
        timestamp: t
      }));
    }
  }
  /**
   * Connect to the subscription.
   */
  async connect() {
    if (this.isWatching) {
      this.connectionState = "connecting";
      try {
        await this.updateSubscription(), await this.pollAllContracts(), this.connectionState = "connected", this.reconnectAttempts = 0, await this.listenLoop();
      } catch (t) {
        console.error("ContractWatcher connection failed:", t), this.connectionState = "disconnected", this.eventCallback?.({
          type: "connection_reset",
          timestamp: Date.now()
        }), this.scheduleReconnect();
      }
    }
  }
  /**
   * Schedule a reconnection attempt.
   */
  scheduleReconnect() {
    if (!this.isWatching)
      return;
    if (this.config.maxReconnectAttempts > 0 && this.reconnectAttempts >= this.config.maxReconnectAttempts) {
      console.error(`ContractWatcher: Max reconnection attempts (${this.config.maxReconnectAttempts}) reached`);
      return;
    }
    this.connectionState = "reconnecting", this.reconnectAttempts++;
    const t = Math.min(this.config.reconnectDelayMs * Math.pow(2, this.reconnectAttempts - 1), this.config.maxReconnectDelayMs);
    this.reconnectTimeoutId = setTimeout(() => {
      this.reconnectTimeoutId = void 0, this.connect();
    }, t);
  }
  /**
   * Start the failsafe polling interval.
   */
  startFailsafePolling() {
    this.failsafePollIntervalId && clearInterval(this.failsafePollIntervalId), this.failsafePollIntervalId = setInterval(() => {
      this.isWatching && this.pollAllContracts().catch((t) => {
        console.error("ContractWatcher failsafe poll failed:", t);
      });
    }, this.config.failsafePollIntervalMs);
  }
  /**
   * Poll all active contracts for current state.
   */
  async pollAllContracts() {
    const t = this.getActiveContracts().map((n) => n.script);
    t.length !== 0 && await this.pollContracts(t);
  }
  /**
   * Poll specific contracts and emit events for changes.
   */
  async pollContracts(t) {
    if (!this.eventCallback)
      return;
    const n = Date.now();
    try {
      const r = await this.getContractVtxos({
        contractScripts: t,
        includeSpent: !1
        // only spendable ones!
      });
      for (const s of t) {
        const i = this.contracts.get(s);
        if (!i)
          continue;
        const o = r.get(s) || [], a = new Set(o.map((l) => `${l.txid}:${l.vout}`)), c = [];
        for (const l of o) {
          const f = `${l.txid}:${l.vout}`;
          i.lastKnownVtxos.has(f) || (c.push(l), i.lastKnownVtxos.set(f, l));
        }
        const u = [];
        for (const [l, f] of i.lastKnownVtxos)
          a.has(l) || (u.push(f), i.lastKnownVtxos.delete(l));
        c.length > 0 && this.emitVtxoEvent(s, c, "vtxo_received", n), u.length > 0 && this.emitVtxoEvent(s, u, "vtxo_spent", n);
      }
    } catch (r) {
      console.error("ContractWatcher poll failed:", r);
    }
  }
  async tryUpdateSubscription() {
    try {
      await this.updateSubscription();
    } catch {
    }
  }
  /**
   * Update the subscription with scripts that should be watched.
   *
   * Watches both active contracts and contracts with VTXOs.
   */
  async updateSubscription() {
    const t = this.getScriptsToWatch();
    if (t.length === 0) {
      if (this.subscriptionId) {
        try {
          await this.config.indexerProvider.unsubscribeForScripts(this.subscriptionId);
        } catch {
        }
        this.subscriptionId = void 0;
      }
      return;
    }
    this.subscriptionId = await this.config.indexerProvider.subscribeForScripts(t, this.subscriptionId);
  }
  /**
   * Main listening loop for subscription events.
   */
  async listenLoop() {
    if (!this.subscriptionId || !this.abortController || !this.isWatching) {
      this.isWatching && (this.connectionState = "disconnected", this.scheduleReconnect());
      return;
    }
    const t = this.config.indexerProvider.getSubscription(this.subscriptionId, this.abortController.signal);
    for await (const n of t) {
      if (!this.isWatching)
        break;
      this.handleSubscriptionUpdate(n);
    }
    this.isWatching && (this.connectionState = "disconnected", this.scheduleReconnect());
  }
  /**
   * Handle a subscription update.
   */
  handleSubscriptionUpdate(t) {
    if (!this.eventCallback)
      return;
    const n = Date.now(), r = t.scripts || [];
    t.newVtxos?.length && this.processSubscriptionVtxos(t.newVtxos, r, "vtxo_received", n), t.spentVtxos?.length && this.processSubscriptionVtxos(t.spentVtxos, r, "vtxo_spent", n);
  }
  /**
   * Process VTXOs from subscription and route to correct contracts.
   * Uses the scripts from the subscription response to determine contract ownership.
   */
  processSubscriptionVtxos(t, n, r, s) {
    if (n.length === 1) {
      const i = n[0];
      if (i) {
        const o = this.contracts.get(i);
        if (o)
          for (const a of t) {
            const c = `${a.txid}:${a.vout}`;
            r === "vtxo_received" ? o.lastKnownVtxos.set(c, a) : r === "vtxo_spent" && o.lastKnownVtxos.delete(c);
          }
        this.emitVtxoEvent(i, t, r, s);
      }
      return;
    }
    for (const i of n) {
      const o = i;
      if (o) {
        const a = this.contracts.get(o);
        if (a)
          for (const c of t) {
            const u = `${c.txid}:${c.vout}`;
            r === "vtxo_received" ? a.lastKnownVtxos.set(u, c) : a.lastKnownVtxos.delete(u);
          }
        this.emitVtxoEvent(o, t, r, s);
      }
    }
  }
  /**
   * Emit a VTXO event for a contract.
   */
  emitVtxoEvent(t, n, r, s) {
    if (!this.eventCallback)
      return;
    const i = this.contracts.get(t);
    switch (this.checkExpiredContracts(), r) {
      case "vtxo_received":
        if (!i)
          return;
        this.eventCallback({
          type: "vtxo_received",
          vtxos: n.map((o) => ({
            ...o,
            contractScript: t,
            // These fields may not be available from basic VirtualCoin
            forfeitTapLeafScript: void 0,
            intentTapLeafScript: void 0,
            tapTree: void 0
          })),
          contractScript: t,
          contract: i.contract,
          timestamp: s
        });
        return;
      case "vtxo_spent":
        if (!i)
          return;
        this.eventCallback({
          type: "vtxo_spent",
          vtxos: n.map((o) => ({
            ...o,
            contractScript: t,
            // These fields may not be available from basic VirtualCoin
            forfeitTapLeafScript: void 0,
            intentTapLeafScript: void 0,
            tapTree: void 0
          })),
          contractScript: t,
          contract: i.contract,
          timestamp: s
        });
        return;
      case "contract_expired":
        if (!i)
          return;
        this.eventCallback({
          type: "contract_expired",
          contractScript: t,
          contract: i.contract,
          timestamp: s
        });
        return;
      default:
        return;
    }
  }
}
class zw {
  constructor() {
    this.handlers = /* @__PURE__ */ new Map();
  }
  /**
   * Register a contract handler.
   *
   * @param handler - The handler to register
   * @throws If a handler for this type is already registered
   */
  register(t) {
    if (this.handlers.has(t.type))
      throw new Error(`Contract handler for type '${t.type}' is already registered`);
    this.handlers.set(t.type, t);
  }
  /**
   * Get a handler by type.
   *
   * @param type - The contract type
   * @returns The handler, or undefined if not found
   */
  get(t) {
    return this.handlers.get(t);
  }
  /**
   * Get a handler by type, throwing if not found.
   *
   * @param type - The contract type
   * @returns The handler
   * @throws If no handler is registered for this type
   */
  getOrThrow(t) {
    const n = this.get(t);
    if (!n)
      throw new Error(`No contract handler registered for type '${t}'`);
    return n;
  }
  /**
   * Check if a handler is registered.
   *
   * @param type - The contract type
   */
  has(t) {
    return this.handlers.has(t);
  }
  /**
   * Get all registered types.
   */
  getRegisteredTypes() {
    return Array.from(this.handlers.keys());
  }
  /**
   * Unregister a handler (mainly for testing).
   */
  unregister(t) {
    return this.handlers.delete(t);
  }
  /**
   * Clear all handlers (mainly for testing).
   */
  clear() {
    this.handlers.clear();
  }
}
const gr = new zw();
function yr(e) {
  return vr.encode(e.type === "blocks" ? { blocks: Number(e.value) } : { seconds: Number(e.value) });
}
function wr(e) {
  const t = vr.decode(e);
  if ("blocks" in t && t.blocks !== void 0)
    return { type: "blocks", value: BigInt(t.blocks) };
  if ("seconds" in t && t.seconds !== void 0)
    return { type: "seconds", value: BigInt(t.seconds) };
  throw new Error(`Invalid BIP68 sequence: ${e}`);
}
function Bi(e, t) {
  if (t.role === "sender" || t.role === "receiver")
    return t.role;
  if (t.walletPubKey) {
    if (t.walletPubKey === e.params.sender)
      return "sender";
    if (t.walletPubKey === e.params.receiver)
      return "receiver";
  }
}
function Cn(e, t) {
  if (t === void 0)
    return !0;
  if (!e.vtxo)
    return !1;
  const n = wr(t);
  if (n.type === "blocks")
    return e.blockHeight === void 0 || e.vtxo.status.block_height === void 0 ? !1 : e.blockHeight - e.vtxo.status.block_height >= Number(n.value);
  if (n.type === "seconds") {
    const r = e.vtxo.status.block_time;
    return r === void 0 ? !1 : e.currentTime / 1e3 - r >= Number(n.value);
  }
  return !1;
}
const jw = {
  type: "default",
  createScript(e) {
    const t = this.deserializeParams(e);
    return new yn.Script(t);
  },
  serializeParams(e) {
    return {
      pubKey: v.encode(e.pubKey),
      serverPubKey: v.encode(e.serverPubKey),
      csvTimelock: yr(e.csvTimelock).toString()
    };
  },
  deserializeParams(e) {
    const t = e.csvTimelock ? wr(Number(e.csvTimelock)) : yn.Script.DEFAULT_TIMELOCK;
    return {
      pubKey: v.decode(e.pubKey),
      serverPubKey: v.decode(e.serverPubKey),
      csvTimelock: t
    };
  },
  selectPath(e, t, n) {
    if (n.collaborative)
      return { leaf: e.forfeit() };
    const r = t.params.csvTimelock ? Number(t.params.csvTimelock) : void 0;
    return Cn(n, r) ? {
      leaf: e.exit(),
      sequence: r
    } : null;
  },
  getAllSpendingPaths(e, t, n) {
    const r = [];
    n.collaborative && r.push({ leaf: e.forfeit() });
    const s = { leaf: e.exit() };
    return t.params.csvTimelock && (s.sequence = Number(t.params.csvTimelock)), r.push(s), r;
  },
  getSpendablePaths(e, t, n) {
    const r = [];
    n.collaborative && r.push({ leaf: e.forfeit() });
    const s = t.params.csvTimelock ? Number(t.params.csvTimelock) : void 0;
    if (Cn(n, s)) {
      const i = { leaf: e.exit() };
      s !== void 0 && (i.sequence = s), r.push(i);
    }
    return r;
  }
}, Gw = {
  type: "vhtlc",
  createScript(e) {
    const t = this.deserializeParams(e);
    return new lo.Script(t);
  },
  serializeParams(e) {
    return {
      sender: v.encode(e.sender),
      receiver: v.encode(e.receiver),
      server: v.encode(e.server),
      hash: v.encode(e.preimageHash),
      refundLocktime: e.refundLocktime.toString(),
      claimDelay: yr(e.unilateralClaimDelay).toString(),
      refundDelay: yr(e.unilateralRefundDelay).toString(),
      refundNoReceiverDelay: yr(e.unilateralRefundWithoutReceiverDelay).toString()
    };
  },
  deserializeParams(e) {
    return {
      sender: v.decode(e.sender),
      receiver: v.decode(e.receiver),
      server: v.decode(e.server),
      preimageHash: v.decode(e.hash),
      refundLocktime: BigInt(e.refundLocktime),
      unilateralClaimDelay: wr(Number(e.claimDelay)),
      unilateralRefundDelay: wr(Number(e.refundDelay)),
      unilateralRefundWithoutReceiverDelay: wr(Number(e.refundNoReceiverDelay))
    };
  },
  /**
   * Select spending path based on context.
   *
   * Role is determined from `context.role` or by matching `context.walletPubKey`
   * against sender/receiver in contract params.
   */
  selectPath(e, t, n) {
    const r = Bi(t, n), s = t.params?.preimage, i = BigInt(t.params.refundLocktime), o = Math.floor(n.currentTime / 1e3);
    if (!r)
      return null;
    if (n.collaborative)
      return r === "receiver" && s ? {
        leaf: e.claim(),
        extraWitness: [v.decode(s)]
      } : r === "sender" && BigInt(o) >= i ? {
        leaf: e.refundWithoutReceiver()
      } : null;
    if (r === "receiver" && s) {
      const a = Number(t.params.claimDelay);
      return Cn(n, a) ? {
        leaf: e.unilateralClaim(),
        extraWitness: [v.decode(s)],
        sequence: a
      } : null;
    }
    if (r === "sender") {
      const a = Number(t.params.refundNoReceiverDelay);
      return Cn(n, a) ? {
        leaf: e.unilateralRefundWithoutReceiver(),
        sequence: a
      } : null;
    }
    return null;
  },
  /**
   * Get all possible spending paths (no timelock checks).
   *
   * Role is determined from `context.role` or by matching `context.walletPubKey`
   * against sender/receiver in contract params.
   */
  getAllSpendingPaths(e, t, n) {
    const r = Bi(t, n), s = [];
    if (!r)
      return s;
    const i = t.params?.preimage;
    if (n.collaborative)
      r === "receiver" && i && s.push({
        leaf: e.claim(),
        extraWitness: [v.decode(i)]
      }), r === "sender" && s.push({
        leaf: e.refundWithoutReceiver()
      });
    else {
      if (r === "receiver" && i) {
        const o = Number(t.params.claimDelay);
        s.push({
          leaf: e.unilateralClaim(),
          extraWitness: [v.decode(i)],
          sequence: o
        });
      }
      if (r === "sender") {
        const o = Number(t.params.refundNoReceiverDelay);
        s.push({
          leaf: e.unilateralRefundWithoutReceiver(),
          sequence: o
        });
      }
    }
    return s;
  },
  getSpendablePaths(e, t, n) {
    const r = Bi(t, n), s = [];
    if (!r)
      return s;
    const i = t.params?.preimage, o = BigInt(t.params.refundLocktime), a = Math.floor(n.currentTime / 1e3);
    if (n.collaborative)
      return r === "receiver" && i && s.push({
        leaf: e.claim(),
        extraWitness: [v.decode(i)]
      }), r === "sender" && BigInt(a) >= o && s.push({
        leaf: e.refundWithoutReceiver()
      }), s;
    if (r === "receiver" && i) {
      const c = Number(t.params.claimDelay);
      Cn(n, c) && s.push({
        leaf: e.unilateralClaim(),
        extraWitness: [v.decode(i)],
        sequence: c
      });
    }
    if (r === "sender") {
      const c = Number(t.params.refundNoReceiverDelay);
      Cn(n, c) && s.push({
        leaf: e.unilateralRefundWithoutReceiver(),
        sequence: c
      });
    }
    return s;
  }
};
gr.register(jw);
gr.register(Gw);
class fa {
  constructor(t) {
    this.initialized = !1, this.eventCallbacks = /* @__PURE__ */ new Set(), this.config = t, this.watcher = new Kw({
      indexerProvider: t.indexerProvider,
      walletRepository: t.walletRepository,
      ...t.watcherConfig
    });
  }
  /**
   * Static factory method for creating a new ContractManager.
   * Initialize the manager by loading persisted contracts and starting to watch.
   *
   * After initialization, the manager automatically watches all active contracts
   * and contracts with VTXOs. Use `onContractEvent()` to register event callbacks.
   *
   * @param config ContractManagerConfig
   */
  static async create(t) {
    const n = new fa(t);
    return await n.initialize(), n;
  }
  async initialize() {
    if (this.initialized)
      return;
    const t = await this.config.contractRepository.getContracts();
    await this.getVtxosForContracts(t);
    const n = Date.now();
    for (const r of t)
      r.state === "active" && r.expiresAt && r.expiresAt <= n && (r.state = "inactive", await this.config.contractRepository.saveContract(r)), await this.watcher.addContract(r);
    this.initialized = !0, this.stopWatcherFn = await this.watcher.startWatching((r) => {
      this.handleContractEvent(r);
    });
  }
  /**
   * Create and register a new contract.
   *
   * @param params - Contract parameters
   * @returns The created contract
   */
  async createContract(t) {
    const n = gr.get(t.type);
    if (!n)
      throw new Error(`No handler registered for contract type '${t.type}'`);
    try {
      const i = n.createScript(t.params), o = v.encode(i.pkScript);
      if (o !== t.script)
        throw new Error(`Script mismatch: provided script does not match script derived from params. Expected ${o}, got ${t.script}`);
    } catch (i) {
      throw i instanceof Error && i.message.includes("mismatch") ? i : new Error(`Invalid params for contract type '${t.type}': ${i instanceof Error ? i.message : String(i)}`);
    }
    const [r] = await this.getContracts({ script: t.script });
    if (r) {
      if (r.type === t.type)
        return r;
      throw new Error(`Contract with script ${t.script} already exists with with type ${r.type}.`);
    }
    const s = {
      ...t,
      createdAt: Date.now(),
      state: t.state || "active"
    };
    return await this.config.contractRepository.saveContract(s), await this.getVtxosForContracts([s]), await this.watcher.addContract(s), s;
  }
  /**
   * Get contracts with optional filters.
   *
   * @param filter - Optional filter criteria
   * @returns Filtered contracts TODO: filter spent/unspent
   *
   * @example
   * ```typescript
   * // Get all VHTLC contracts
   * const vhtlcs = await manager.getContracts({ type: 'vhtlc' });
   *
   * // Get all active contracts
   * const active = await manager.getContracts({ state: 'active' });
   * ```
   */
  async getContracts(t) {
    const n = this.buildContractsDbFilter(t ?? {});
    return await this.config.contractRepository.getContracts(n);
  }
  async getContractsWithVtxos(t) {
    const n = await this.getContracts(t), r = await this.getVtxosForContracts(n);
    return n.map((s) => ({
      contract: s,
      vtxos: r.get(s.script) ?? []
    }));
  }
  buildContractsDbFilter(t) {
    return {
      script: t.script,
      state: t.state,
      type: t.type
    };
  }
  /**
   * Update a contract.
   * Nested fields like `params` and `metadata` are replaced with the provided values.
   * If you need to preserve existing fields, merge them manually.
   *
   * @param script - Contract script
   * @param updates - Fields to update
   */
  async updateContract(t, n) {
    const s = (await this.config.contractRepository.getContracts({
      script: t
    }))[0];
    if (!s)
      throw new Error(`Contract ${t} not found`);
    const i = {
      ...s,
      ...n
    };
    return await this.config.contractRepository.saveContract(i), await this.watcher.updateContract(i), i;
  }
  /**
   * Update a contract's params.
   * This method preserves existing params by merging the provided values.
   *
   * @param script - Contract script
   * @param updates - The new values to merge with existing params
   */
  async updateContractParams(t, n) {
    const s = (await this.config.contractRepository.getContracts({
      script: t
    }))[0];
    if (!s)
      throw new Error(`Contract ${t} not found`);
    const i = {
      ...s,
      params: { ...s.params, ...n }
    };
    return await this.config.contractRepository.saveContract(i), await this.watcher.updateContract(i), i;
  }
  /**
   * Set a contract's state.
   */
  async setContractState(t, n) {
    await this.updateContract(t, { state: n });
  }
  /**
   * Delete a contract.
   *
   * @param script - Contract script
   */
  async deleteContract(t) {
    await this.config.contractRepository.deleteContract(t), await this.watcher.removeContract(t);
  }
  /**
   * Get currently spendable paths for a contract.
   *
   * @param contractScript - The contract script
   * @param options - Options for getting spendable paths
   */
  async getSpendablePaths(t) {
    const { contractScript: n, collaborative: r = !0, walletPubKey: s, vtxo: i } = t, [o] = await this.getContracts({ script: n });
    if (!o)
      return [];
    const a = gr.get(o.type);
    if (!a)
      return [];
    const c = a.createScript(o.params), u = {
      collaborative: r,
      currentTime: Date.now(),
      walletPubKey: s,
      vtxo: i
    };
    return a.getSpendablePaths(c, o, u);
  }
  async getAllSpendingPaths(t) {
    const { contractScript: n, collaborative: r = !0, walletPubKey: s } = t, [i] = await this.getContracts({ script: n });
    if (!i)
      return [];
    const o = gr.get(i.type);
    if (!o)
      return [];
    const a = o.createScript(i.params), c = {
      collaborative: r,
      currentTime: Date.now(),
      walletPubKey: s
    };
    return o.getAllSpendingPaths(a, i, c);
  }
  /**
   * Register a callback for contract events.
   *
   * The manager automatically watches after `initialize()`. This method
   * allows registering callbacks to receive events.
   *
   * @param callback - Event callback
   * @returns Unsubscribe function to remove this callback
   *
   * @example
   * ```typescript
   * const unsubscribe = manager.onContractEvent((event) => {
   *   console.log(`${event.type} on ${event.contractScript}`);
   * });
   *
   * // Later: stop receiving events
   * unsubscribe();
   * ```
   */
  onContractEvent(t) {
    return this.eventCallbacks.add(t), () => {
      this.eventCallbacks.delete(t);
    };
  }
  /**
   * Check if currently watching.
   */
  async isWatching() {
    return this.watcher.isCurrentlyWatching();
  }
  /**
   * Emit an event to all registered callbacks.
   */
  emitEvent(t) {
    for (const n of this.eventCallbacks)
      try {
        n(t);
      } catch (r) {
        console.error("Error in contract event callback:", r);
      }
  }
  /**
   * Handle events from the watcher.
   */
  async handleContractEvent(t) {
    switch (t.type) {
      // Every time there is a VTXO event for a contract, refresh all its VTXOs
      case "vtxo_received":
      case "vtxo_spent":
        await this.fetchContractVxosFromIndexer([t.contract], !0);
        break;
      case "connection_reset":
        const n = this.watcher.getActiveContracts();
        await this.fetchContractVxosFromIndexer(n, !1);
        break;
      case "contract_expired":
        await this.config.contractRepository.saveContract(t.contract);
    }
    this.emitEvent(t);
  }
  async getVtxosForContracts(t) {
    return t.length === 0 ? /* @__PURE__ */ new Map() : await this.fetchContractVxosFromIndexer(t, !1, this.config.extendVtxo);
  }
  async fetchContractVxosFromIndexer(t, n, r) {
    const s = await this.fetchContractVtxosBulk(t, n, r), i = /* @__PURE__ */ new Map();
    for (const [o, a] of s) {
      i.set(o, a);
      const c = t.find((u) => u.script === o);
      c && await this.config.walletRepository.saveVtxos(c.address, a);
    }
    return i;
  }
  async fetchContractVtxosBulk(t, n, r) {
    const s = /* @__PURE__ */ new Map();
    return await Promise.all(t.map(async (i) => {
      const o = await this.fetchContractVtxosPaginated(i, n, r);
      s.set(i.script, o);
    })), s;
  }
  async fetchContractVtxosPaginated(t, n, r) {
    const i = [];
    let o = 0, a = !0;
    const c = n ? {} : { spendableOnly: !0 };
    for (; a; ) {
      const { vtxos: u, page: l } = await this.config.indexerProvider.getVtxos({
        scripts: [t.script],
        ...c,
        pageIndex: o,
        pageSize: 100
      });
      for (const f of u) {
        const h = r ? r(f) : f;
        i.push({
          ...h,
          contractScript: t.script
        });
      }
      a = l ? u.length === 100 : !1, o++;
    }
    return i;
  }
  /**
   * Dispose of the ContractManager and release all resources.
   *
   * Stops the watcher, clears callbacks, and marks
   * the manager as uninitialized.
   *
   * Implements the disposable pattern for cleanup.
   */
  dispose() {
    this.stopWatcherFn?.(), this.stopWatcherFn = void 0, this.eventCallbacks.clear(), this.initialized = !1;
  }
  /**
   * Symbol.dispose implementation for using with `using` keyword.
   * @example
   * ```typescript
   * {
   *   using manager = await wallet.getContractManager();
   *   // ... use manager
   * } // automatically disposed
   * ```
   */
  [Symbol.dispose]() {
    this.stopWatcherFn?.(), this.stopWatcherFn = void 0, this.eventCallbacks.clear(), this.initialized = !1;
  }
}
function qw(e) {
  return typeof e == "object" && e !== null && "toReadonly" in e && typeof e.toReadonly == "function";
}
class wn {
  constructor(t, n, r, s, i, o, a, c, u, l, f) {
    this.identity = t, this.network = n, this.onchainProvider = r, this.indexerProvider = s, this.arkServerPublicKey = i, this.offchainTapscript = o, this.boardingTapscript = a, this.dustAmount = c, this.walletRepository = u, this.contractRepository = l, this.watcherConfig = f;
  }
  /**
   * Protected helper to set up shared wallet configuration.
   * Extracts common logic used by both ReadonlyWallet.create() and Wallet.create().
   */
  static async setupWalletConfig(t, n) {
    const r = t.arkProvider || (() => {
      if (!t.arkServerUrl)
        throw new Error("Either arkProvider or arkServerUrl must be provided");
      return new wf(t.arkServerUrl);
    })(), s = t.arkServerUrl || r.serverUrl;
    if (!s)
      throw new Error("Could not determine arkServerUrl from provider");
    const i = t.indexerUrl || s, o = t.indexerProvider || new Ef(i), a = await r.getInfo(), c = ay(a.network), u = t.esploraUrl || uy[a.network], l = t.onchainProvider || new ly(u);
    if (t.exitTimelock) {
      const { value: O, type: P } = t.exitTimelock;
      if (O < 512n && P !== "blocks" || O >= 512n && P !== "seconds")
        throw new Error("invalid exitTimelock");
    }
    const f = t.exitTimelock ?? {
      value: a.unilateralExitDelay,
      type: a.unilateralExitDelay < 512n ? "blocks" : "seconds"
    };
    if (t.boardingTimelock) {
      const { value: O, type: P } = t.boardingTimelock;
      if (O < 512n && P !== "blocks" || O >= 512n && P !== "seconds")
        throw new Error("invalid boardingTimelock");
    }
    const h = t.boardingTimelock ?? {
      value: a.boardingExitDelay,
      type: a.boardingExitDelay < 512n ? "blocks" : "seconds"
    }, p = v.decode(a.signerPubkey).slice(1), y = new yn.Script({
      pubKey: n,
      serverPubKey: p,
      csvTimelock: f
    }), d = new yn.Script({
      pubKey: n,
      serverPubKey: p,
      csvTimelock: h
    }), g = y, w = t.storage?.walletRepository ?? new Ww(), A = t.storage?.contractRepository ?? new Mw();
    return {
      arkProvider: r,
      indexerProvider: o,
      onchainProvider: l,
      network: c,
      networkName: a.network,
      serverPubKey: p,
      offchainTapscript: g,
      boardingTapscript: d,
      dustAmount: a.dust,
      walletRepository: w,
      contractRepository: A,
      info: a
    };
  }
  static async create(t) {
    const n = await t.identity.xOnlyPublicKey();
    if (!n)
      throw new Error("Invalid configured public key");
    const r = await wn.setupWalletConfig(t, n);
    return new wn(t.identity, r.network, r.onchainProvider, r.indexerProvider, r.serverPubKey, r.offchainTapscript, r.boardingTapscript, r.dustAmount, r.walletRepository, r.contractRepository, t.watcherConfig);
  }
  get arkAddress() {
    return this.offchainTapscript.address(this.network.hrp, this.arkServerPublicKey);
  }
  /**
   * Get the contract script for the wallet's default address.
   * This is the pkScript hex, used to identify the wallet in ContractManager.
   */
  get defaultContractScript() {
    return v.encode(this.offchainTapscript.pkScript);
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
    let r = 0, s = 0;
    for (const l of t)
      l.status.confirmed ? r += l.value : s += l.value;
    let i = 0, o = 0, a = 0;
    i = n.filter((l) => l.virtualStatus.state === "settled").reduce((l, f) => l + f.value, 0), o = n.filter((l) => l.virtualStatus.state === "preconfirmed").reduce((l, f) => l + f.value, 0), a = n.filter((l) => Me(l) && l.virtualStatus.state === "swept").reduce((l, f) => l + f.value, 0);
    const c = r + s, u = i + o + a;
    return {
      boarding: {
        confirmed: r,
        unconfirmed: s,
        total: c
      },
      settled: i,
      preconfirmed: o,
      available: i + o,
      recoverable: a,
      total: c + u
    };
  }
  // TODO: use contract manager (and repo) will be offline-first
  async getVtxos(t) {
    const n = await this.getAddress(), s = (await this.getVirtualCoins(t)).map((i) => Ie(this, i));
    return await this.walletRepository.saveVtxos(n, s), s;
  }
  async getVirtualCoins(t = { withRecoverable: !0, withUnrolled: !1 }) {
    const n = [v.encode(this.offchainTapscript.pkScript)], s = (await this.indexerProvider.getVtxos({ scripts: n })).vtxos;
    let i = s.filter(Me);
    if (t.withRecoverable || (i = i.filter((o) => !sa(o) && !pf(o))), t.withUnrolled) {
      const o = s.filter((a) => !Me(a));
      i.push(...o.filter((a) => a.isUnrolled));
    }
    return i;
  }
  async getTransactionHistory() {
    const t = await this.indexerProvider.getVtxos({
      scripts: [v.encode(this.offchainTapscript.pkScript)]
    }), { boardingTxs: n, commitmentsToIgnore: r } = await this.getBoardingTxs(), s = (i) => this.indexerProvider.getVtxos({ outpoints: [{ txid: i, vout: 0 }] }).then((o) => o.vtxos[0]?.createdAt.getTime() || 0);
    return Uw(t.vtxos, n, r, s);
  }
  async getBoardingTxs() {
    const t = [], n = /* @__PURE__ */ new Set(), r = await this.getBoardingAddress(), s = await this.onchainProvider.getTransactions(r);
    for (const a of s)
      for (let c = 0; c < a.vout.length; c++) {
        const u = a.vout[c];
        if (u.scriptpubkey_address === r) {
          const f = (await this.onchainProvider.getTxOutspends(a.txid))[c];
          f?.spent && n.add(f.txid), t.push({
            txid: a.txid,
            vout: c,
            value: Number(u.value),
            status: {
              confirmed: a.status.confirmed,
              block_time: a.status.block_time
            },
            isUnrolled: !0,
            virtualStatus: {
              state: f?.spent ? "spent" : "settled",
              commitmentTxIds: f?.spent ? [f.txid] : void 0
            },
            createdAt: a.status.confirmed ? new Date(a.status.block_time * 1e3) : /* @__PURE__ */ new Date(0)
          });
        }
      }
    const i = [], o = [];
    for (const a of t) {
      const c = {
        key: {
          boardingTxid: a.txid,
          commitmentTxid: "",
          arkTxid: ""
        },
        amount: a.value,
        type: Te.TxReceived,
        settled: a.virtualStatus.state === "spent",
        createdAt: a.status.block_time ? new Date(a.status.block_time * 1e3).getTime() : 0
      };
      a.status.block_time ? o.push(c) : i.push(c);
    }
    return {
      boardingTxs: [...i, ...o],
      commitmentsToIgnore: n
    };
  }
  async getBoardingUtxos() {
    const t = await this.getBoardingAddress(), r = (await this.onchainProvider.getCoins(t)).map((s) => yo(this, s));
    return await this.walletRepository.saveUtxos(t, r), r;
  }
  async notifyIncomingFunds(t) {
    const n = await this.getAddress(), r = await this.getBoardingAddress();
    let s, i;
    if (this.onchainProvider && r) {
      const a = (c) => c.vout.findIndex((u) => u.scriptpubkey_address === r);
      s = await this.onchainProvider.watchAddresses([r], (c) => {
        const u = c.filter((l) => a(l) !== -1).map((l) => {
          const { txid: f, status: h } = l, p = a(l), y = Number(l.vout[p].value);
          return { txid: f, vout: p, value: y, status: h };
        });
        t({
          type: "utxo",
          coins: u
        });
      });
    }
    if (this.indexerProvider && n) {
      const a = this.offchainTapscript, c = await this.indexerProvider.subscribeForScripts([
        v.encode(a.pkScript)
      ]), u = new AbortController(), l = this.indexerProvider.getSubscription(c, u.signal);
      i = async () => {
        u.abort(), await this.indexerProvider?.unsubscribeForScripts(c);
      }, (async () => {
        try {
          for await (const f of l)
            (f.newVtxos?.length > 0 || f.spentVtxos?.length > 0) && t({
              type: "vtxo",
              newVtxos: f.newVtxos.map((h) => Ie(this, h)),
              spentVtxos: f.spentVtxos.map((h) => Ie(this, h))
            });
        } catch (f) {
          console.error("Subscription error:", f);
        }
      })();
    }
    return () => {
      s?.(), i?.();
    };
  }
  async fetchPendingTxs() {
    const t = [v.encode(this.offchainTapscript.pkScript)];
    let { vtxos: n } = await this.indexerProvider.getVtxos({
      scripts: t
    });
    return n.filter((r) => r.virtualStatus.state !== "swept" && r.virtualStatus.state !== "settled" && r.arkTxId !== void 0).map((r) => r.arkTxId);
  }
  // ========================================================================
  // Contract Management
  // ========================================================================
  /**
   * Get the ContractManager for managing contracts including the wallet's default address.
   *
   * The ContractManager handles:
   * - The wallet's default receiving address (as a "default" contract)
   * - External contracts (Boltz swaps, HTLCs, etc.)
   * - Multi-contract watching with resilient connections
   *
   * @example
   * ```typescript
   * const manager = await wallet.getContractManager();
   *
   * // Create a contract for a Boltz swap
   * const contract = await manager.createContract({
   *   label: "Boltz Swap",
   *   type: "vhtlc",
   *   params: { ... },
   *   script: swapScript,
   *   address: swapAddress,
   * });
   *
   * // Start watching for events (includes wallet's default address)
   * const stop = await manager.onContractEvent((event) => {
   *   console.log(`${event.type} on ${event.contractScript}`);
   * });
   * ```
   */
  async getContractManager() {
    if (this._contractManager)
      return this._contractManager;
    if (this._contractManagerInitializing)
      return this._contractManagerInitializing;
    this._contractManagerInitializing = this.initializeContractManager();
    try {
      const t = await this._contractManagerInitializing;
      return this._contractManager = t, t;
    } catch (t) {
      throw this._contractManagerInitializing = void 0, t;
    } finally {
      this._contractManagerInitializing = void 0;
    }
  }
  async initializeContractManager() {
    const t = await fa.create({
      indexerProvider: this.indexerProvider,
      contractRepository: this.contractRepository,
      walletRepository: this.walletRepository,
      extendVtxo: (r) => Ie(this, r),
      getDefaultAddress: () => this.getAddress(),
      watcherConfig: this.watcherConfig
    }), n = this.offchainTapscript.options.csvTimelock ?? yn.Script.DEFAULT_TIMELOCK;
    return await t.createContract({
      type: "default",
      params: {
        pubKey: v.encode(this.offchainTapscript.options.pubKey),
        serverPubKey: v.encode(this.offchainTapscript.options.serverPubKey),
        csvTimelock: yr(n).toString()
      },
      script: this.defaultContractScript,
      address: await this.getAddress(),
      state: "active"
    }), t;
  }
}
class Gn extends wn {
  constructor(t, n, r, s, i, o, a, c, u, l, f, h, p, y, d, g, w) {
    super(t, n, s, o, a, c, u, p, y, d, w), this.networkName = r, this.arkProvider = i, this.serverUnrollScript = l, this.forfeitOutputScript = f, this.forfeitPubkey = h, this.identity = t, this.renewalConfig = {
      enabled: g?.enabled ?? !1,
      ...Ny,
      ...g
    };
  }
  static async create(t) {
    const n = await t.identity.xOnlyPublicKey();
    if (!n)
      throw new Error("Invalid configured public key");
    const r = await wn.setupWalletConfig(t, n);
    let s;
    try {
      const c = v.decode(r.info.checkpointTapscript);
      s = Vt.decode(c);
    } catch {
      throw new Error("Invalid checkpointTapscript from server");
    }
    const i = v.decode(r.info.forfeitPubkey).slice(1), o = qe(r.network).decode(r.info.forfeitAddress), a = ht.encode(o);
    return new Gn(t.identity, r.network, r.networkName, r.onchainProvider, r.arkProvider, r.indexerProvider, r.serverPubKey, r.offchainTapscript, r.boardingTapscript, s, a, i, r.dustAmount, r.walletRepository, r.contractRepository, t.renewalConfig, t.watcherConfig);
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
    const t = qw(this.identity) ? await this.identity.toReadonly() : this.identity;
    return new wn(t, this.network, this.onchainProvider, this.indexerProvider, this.arkServerPublicKey, this.offchainTapscript, this.boardingTapscript, this.dustAmount, this.walletRepository, this.contractRepository, this.watcherConfig);
  }
  async sendBitcoin(t) {
    if (t.amount <= 0)
      throw new Error("Amount must be positive");
    if (!Zw(t.address))
      throw new Error("Invalid Ark address " + t.address);
    const n = await this.getVirtualCoins({
      withRecoverable: !1
    });
    let r;
    if (t.selectedVtxos) {
      const y = t.selectedVtxos.map((g) => g.value).reduce((g, w) => g + w, 0);
      if (y < t.amount)
        throw new Error("Selected VTXOs do not cover specified amount");
      const d = y - t.amount;
      r = {
        inputs: t.selectedVtxos,
        changeAmount: BigInt(d)
      };
    } else
      r = Xw(n, t.amount);
    const s = this.offchainTapscript.forfeit();
    if (!s)
      throw new Error("Selected leaf not found");
    const i = gn.decode(t.address), a = [
      {
        script: BigInt(t.amount) < this.dustAmount ? i.subdustPkScript : i.pkScript,
        amount: BigInt(t.amount)
      }
    ];
    if (r.changeAmount > 0n) {
      const y = r.changeAmount < this.dustAmount ? this.arkAddress.subdustPkScript : this.arkAddress.pkScript;
      a.push({
        script: y,
        amount: BigInt(r.changeAmount)
      });
    }
    const c = this.offchainTapscript.encode(), u = Iy(r.inputs.map((y) => ({
      ...y,
      tapLeafScript: s,
      tapTree: c
    })), a, this.serverUnrollScript), l = await this.identity.sign(u.arkTx), { arkTxid: f, signedCheckpointTxs: h } = await this.arkProvider.submitTx(St.encode(l.toPSBT()), u.checkpoints.map((y) => St.encode(y.toPSBT()))), p = await Promise.all(h.map(async (y) => {
      const d = Qt.fromPSBT(St.decode(y)), g = await this.identity.sign(d);
      return St.encode(g.toPSBT());
    }));
    await this.arkProvider.finalizeTx(f, p);
    try {
      const y = [], d = /* @__PURE__ */ new Set();
      let g = Number.MAX_SAFE_INTEGER;
      for (const [O, P] of r.inputs.entries()) {
        const V = Ie(this, P), Y = h[O], T = Qt.fromPSBT(St.decode(Y));
        if (y.push({
          ...V,
          virtualStatus: { ...V.virtualStatus, state: "spent" },
          spentBy: T.id,
          arkTxId: f,
          isSpent: !0
        }), V.virtualStatus.commitmentTxIds)
          for (const et of V.virtualStatus.commitmentTxIds)
            d.add(et);
        V.virtualStatus.batchExpiry && (g = Math.min(g, V.virtualStatus.batchExpiry));
      }
      const w = Date.now(), A = this.arkAddress.encode();
      if (r.changeAmount > 0n && g !== Number.MAX_SAFE_INTEGER) {
        const O = {
          txid: f,
          vout: a.length - 1,
          createdAt: new Date(w),
          forfeitTapLeafScript: this.offchainTapscript.forfeit(),
          intentTapLeafScript: this.offchainTapscript.forfeit(),
          isUnrolled: !1,
          isSpent: !1,
          tapTree: this.offchainTapscript.encode(),
          value: Number(r.changeAmount),
          virtualStatus: {
            state: "preconfirmed",
            commitmentTxIds: Array.from(d),
            batchExpiry: g
          },
          status: {
            confirmed: !1
          }
        };
        await this.walletRepository.saveVtxos(A, [O]);
      }
      await this.walletRepository.saveVtxos(A, y), await this.walletRepository.saveTransactions(A, [
        {
          key: {
            boardingTxid: "",
            commitmentTxid: "",
            arkTxid: f
          },
          amount: t.amount,
          type: Te.TxSent,
          settled: !1,
          createdAt: Date.now()
        }
      ]);
    } catch (y) {
      console.warn("error saving offchain tx to repository", y);
    } finally {
      return f;
    }
  }
  async settle(t, n) {
    if (t?.inputs) {
      for (const y of t.inputs)
        if (typeof y == "string")
          try {
            yt.fromString(y);
          } catch {
            throw new Error(`Invalid arknote "${y}"`);
          }
    }
    if (!t) {
      const { fees: y } = await this.arkProvider.getInfo(), d = new Rw(y.intentFee);
      let g = 0;
      const A = Vt.decode(v.decode(this.boardingTapscript.exitScript)).params.timelock, O = (await this.getBoardingUtxos()).filter((I) => !Oy(I, A)), P = [];
      for (const I of O) {
        const lt = d.evalOnchainInput({
          amount: BigInt(I.value)
        });
        lt.value >= I.value || (P.push(I), g += I.value - lt.satoshis);
      }
      const V = await this.getVtxos({ withRecoverable: !0 }), Y = [];
      for (const I of V) {
        const lt = d.evalOffchainInput({
          amount: BigInt(I.value),
          type: I.virtualStatus.state === "swept" ? "recoverable" : "vtxo",
          weight: 0,
          birth: I.createdAt,
          expiry: I.virtualStatus.batchExpiry ? new Date(I.virtualStatus.batchExpiry * 1e3) : /* @__PURE__ */ new Date()
        });
        lt.value >= I.value || (Y.push(I), g += I.value - lt.satoshis);
      }
      const T = [...P, ...Y];
      if (T.length === 0)
        throw new Error("No inputs found");
      const et = {
        address: await this.getAddress(),
        amount: BigInt(g)
      }, L = d.evalOffchainOutput({
        amount: et.amount,
        script: v.encode(gn.decode(et.address).pkScript)
      });
      if (et.amount -= BigInt(L.satoshis), et.amount <= this.dustAmount)
        throw new Error("Output amount is below dust limit");
      t = {
        inputs: T,
        outputs: [et]
      };
    }
    const r = [], s = [];
    let i = !1;
    for (const [y, d] of t.outputs.entries()) {
      let g;
      try {
        g = gn.decode(d.address).pkScript, i = !0;
      } catch {
        const w = qe(this.network).decode(d.address);
        g = ht.encode(w), r.push(y);
      }
      s.push({
        amount: d.amount,
        script: g
      });
    }
    let o;
    const a = [];
    i && (o = this.identity.signerSession(), a.push(v.encode(await o.getPublicKey())));
    const [c, u] = await Promise.all([
      this.makeRegisterIntentSignature(t.inputs, s, r, a),
      this.makeDeleteIntentSignature(t.inputs)
    ]), l = await this.safeRegisterIntent(c), f = [
      ...a,
      ...t.inputs.map((y) => `${y.txid}:${y.vout}`)
    ], h = this.createBatchHandler(l, t.inputs, o), p = new AbortController();
    try {
      const y = this.arkProvider.getEventStream(p.signal, f);
      return await po.join(y, h, {
        abortController: p,
        skipVtxoTreeSigning: !i,
        eventCallback: n ? (d) => Promise.resolve(n(d)) : void 0
      });
    } catch (y) {
      throw await this.arkProvider.deleteIntent(u).catch(() => {
      }), y;
    } finally {
      p.abort();
    }
  }
  async handleSettlementFinalizationEvent(t, n, r, s) {
    const i = [], o = await this.getVirtualCoins();
    let a = Qt.fromPSBT(St.decode(t.commitmentTx)), c = !1, u = 0;
    const l = s?.leaves() || [];
    for (const f of n) {
      const h = o.find((O) => O.txid === f.txid && O.vout === f.vout);
      if (!h) {
        for (let O = 0; O < a.inputsLength; O++) {
          const P = a.getInput(O);
          if (!P.txid || P.index === void 0)
            throw new Error("The server returned incomplete data. No settlement input found in the PSBT");
          if (v.encode(P.txid) === f.txid && P.index === f.vout) {
            a.updateInput(O, {
              tapLeafScript: [f.forfeitTapLeafScript]
            }), a = await this.identity.sign(a, [
              O
            ]), c = !0;
            break;
          }
        }
        continue;
      }
      if (sa(h) || gf(h, this.dustAmount))
        continue;
      if (l.length === 0)
        throw new Error("connectors not received");
      if (u >= l.length)
        throw new Error("not enough connectors received");
      const p = l[u], y = p.id, d = p.getOutput(0);
      if (!d)
        throw new Error("connector output not found");
      const g = d.amount, w = d.script;
      if (!g || !w)
        throw new Error("invalid connector output");
      u++;
      let A = gy([
        {
          txid: f.txid,
          index: f.vout,
          witnessUtxo: {
            amount: BigInt(h.value),
            script: zt.decode(f.tapTree).pkScript
          },
          sighashType: mn.DEFAULT,
          tapLeafScript: [f.forfeitTapLeafScript]
        },
        {
          txid: y,
          index: 0,
          witnessUtxo: {
            amount: g,
            script: w
          }
        }
      ], r);
      A = await this.identity.sign(A, [0]), i.push(St.encode(A.toPSBT()));
    }
    (i.length > 0 || c) && await this.arkProvider.submitSignedForfeitTxs(i, c ? St.encode(a.toPSBT()) : void 0);
  }
  /**
   * @implements Batch.Handler interface.
   * @param intentId - The intent ID.
   * @param inputs - The inputs of the intent.
   * @param session - The musig2 signing session, if not provided, the signing will be skipped.
   */
  createBatchHandler(t, n, r) {
    let s;
    return {
      onBatchStarted: async (i) => {
        const o = new TextEncoder().encode(t), a = vt(o), c = v.encode(a);
        let u = !0;
        for (const f of i.intentIdHashes)
          if (f === c) {
            if (!this.arkProvider)
              throw new Error("Ark provider not configured");
            await this.arkProvider.confirmRegistration(t), u = !1;
          }
        if (u)
          return { skip: u };
        const l = Vt.encode({
          timelock: {
            value: i.batchExpiry,
            type: i.batchExpiry >= 512n ? "seconds" : "blocks"
          },
          pubkeys: [this.forfeitPubkey]
        }).script;
        return s = ar(l), { skip: !1 };
      },
      onTreeSigningStarted: async (i, o) => {
        if (!r)
          return { skip: !0 };
        if (!s)
          throw new Error("Sweep tap tree root not set");
        const a = i.cosignersPublicKeys.map((y) => y.slice(2)), u = (await r.getPublicKey()).subarray(1);
        if (!a.includes(v.encode(u)))
          return { skip: !0 };
        const l = Qt.fromPSBT(St.decode(i.unsignedCommitmentTx));
        Ay(o, l, s);
        const f = l.getOutput(0);
        if (!f?.amount)
          throw new Error("Shared output not found");
        await r.init(o, s, f.amount);
        const h = v.encode(await r.getPublicKey()), p = await r.getNonces();
        return await this.arkProvider.submitTreeNonces(i.id, h, p), { skip: !1 };
      },
      onTreeNonces: async (i) => {
        if (!r)
          return { fullySigned: !0 };
        const { hasAllNonces: o } = await r.aggregatedNonces(i.txid, i.nonces);
        if (!o)
          return { fullySigned: !1 };
        const a = await r.sign(), c = v.encode(await r.getPublicKey());
        return await this.arkProvider.submitTreeSignatures(i.id, c, a), { fullySigned: !0 };
      },
      onBatchFinalization: async (i, o, a) => {
        if (!this.forfeitOutputScript)
          throw new Error("Forfeit output script not set");
        a && vy(i.commitmentTx, a), await this.handleSettlementFinalizationEvent(i, n, this.forfeitOutputScript, a);
      }
    };
  }
  async safeRegisterIntent(t) {
    try {
      return await this.arkProvider.registerIntent(t);
    } catch (n) {
      if (n instanceof yf && n.code === 0 && n.message.includes("duplicated input")) {
        const r = await this.getVtxos({
          withRecoverable: !0
        }), s = await this.makeDeleteIntentSignature(r);
        return await this.arkProvider.deleteIntent(s), this.arkProvider.registerIntent(t);
      }
      throw n;
    }
  }
  async makeRegisterIntentSignature(t, n, r, s) {
    const i = this.prepareIntentProofInputs(t), o = {
      type: "register",
      onchain_output_indexes: r,
      valid_at: 0,
      expire_at: 0,
      cosigners_public_keys: s
    }, a = We.create(o, i, n), c = await this.identity.sign(a);
    return {
      proof: St.encode(c.toPSBT()),
      message: o
    };
  }
  async makeDeleteIntentSignature(t) {
    const n = this.prepareIntentProofInputs(t), r = {
      type: "delete",
      expire_at: 0
    }, s = We.create(r, n, []), i = await this.identity.sign(s);
    return {
      proof: St.encode(i.toPSBT()),
      message: r
    };
  }
  async makeGetPendingTxIntentSignature(t) {
    const n = this.prepareIntentProofInputs(t), r = {
      type: "get-pending-tx",
      expire_at: 0
    }, s = We.create(r, n, []), i = await this.identity.sign(s);
    return {
      proof: St.encode(i.toPSBT()),
      message: r
    };
  }
  /**
   * Finalizes pending transactions by retrieving them from the server and finalizing each one.
   * @param vtxos - Optional list of VTXOs to use instead of retrieving them from the server
   * @returns Array of transaction IDs that were finalized
   */
  async finalizePendingTxs(t) {
    if (!t || t.length === 0) {
      const i = [v.encode(this.offchainTapscript.pkScript)];
      let { vtxos: o } = await this.indexerProvider.getVtxos({
        scripts: i
      });
      if (o = o.filter((a) => a.virtualStatus.state !== "swept" && a.virtualStatus.state !== "settled"), o.length === 0)
        return { finalized: [], pending: [] };
      t = o.map((a) => Ie(this, a));
    }
    const r = [], s = [];
    for (let i = 0; i < t.length; i += 20) {
      const o = t.slice(i, i + 20), a = await this.makeGetPendingTxIntentSignature(o), c = await this.arkProvider.getPendingTxs(a);
      for (const u of c) {
        s.push(u.arkTxid);
        try {
          const l = await Promise.all(u.signedCheckpointTxs.map(async (f) => {
            const h = Qt.fromPSBT(St.decode(f)), p = await this.identity.sign(h);
            return St.encode(p.toPSBT());
          }));
          await this.arkProvider.finalizeTx(u.arkTxid, l), r.push(u.arkTxid);
        } catch (l) {
          console.error(`Failed to finalize transaction ${u.arkTxid}:`, l);
        }
      }
    }
    return { finalized: r, pending: s };
  }
  prepareIntentProofInputs(t) {
    const n = [];
    for (const r of t) {
      const s = zt.decode(r.tapTree), i = Yw(r.intentTapLeafScript), o = [df.encode(r.tapTree)];
      r.extraWitness && o.push(Mg.encode(r.extraWitness)), n.push({
        txid: v.decode(r.txid),
        index: r.vout,
        witnessUtxo: {
          amount: BigInt(r.value),
          script: s.pkScript
        },
        sequence: i,
        tapLeafScript: [r.intentTapLeafScript],
        unknown: o
      });
    }
    return n;
  }
}
Gn.MIN_FEE_RATE = 1;
function Yw(e) {
  let t;
  try {
    const n = e[1], r = n.subarray(0, n.length - 1);
    try {
      const s = Vt.decode(r).params;
      t = vr.encode(s.timelock.type === "blocks" ? { blocks: Number(s.timelock.value) } : { seconds: Number(s.timelock.value) });
    } catch {
      const s = Kn.decode(r).params;
      t = Number(s.absoluteTimelock);
    }
  } catch {
  }
  return t;
}
function Zw(e) {
  try {
    return gn.decode(e), !0;
  } catch {
    return !1;
  }
}
function Xw(e, t) {
  const n = [...e].sort((o, a) => {
    const c = o.virtualStatus.batchExpiry || Number.MAX_SAFE_INTEGER, u = a.virtualStatus.batchExpiry || Number.MAX_SAFE_INTEGER;
    return c !== u ? c - u : a.value - o.value;
  }), r = [];
  let s = 0;
  for (const o of n)
    if (r.push(o), s += o.value, s >= t)
      break;
  if (s === t)
    return { inputs: r, changeAmount: 0n };
  if (s < t)
    throw new Error("Insufficient funds");
  const i = BigInt(s - t);
  return {
    inputs: r,
    changeAmount: i
  };
}
function Ni() {
  const e = crypto.getRandomValues(new Uint8Array(16));
  return v.encode(e);
}
var U;
(function(e) {
  e.walletInitialized = (b) => ({
    type: "WALLET_INITIALIZED",
    success: !0,
    id: b
  });
  function t(b, H) {
    return {
      type: "ERROR",
      success: !1,
      message: H,
      id: b
    };
  }
  e.error = t;
  function n(b, H) {
    return {
      type: "SETTLE_EVENT",
      success: !0,
      event: H,
      id: b
    };
  }
  e.settleEvent = n;
  function r(b, H) {
    return {
      type: "SETTLE_SUCCESS",
      success: !0,
      txid: H,
      id: b
    };
  }
  e.settleSuccess = r;
  function s(b) {
    return b.type === "SETTLE_SUCCESS" && b.success;
  }
  e.isSettleSuccess = s;
  function i(b) {
    return b.type === "ADDRESS" && b.success === !0;
  }
  e.isAddress = i;
  function o(b) {
    return b.type === "BOARDING_ADDRESS" && b.success === !0;
  }
  e.isBoardingAddress = o;
  function a(b, H) {
    return {
      type: "ADDRESS",
      success: !0,
      address: H,
      id: b
    };
  }
  e.address = a;
  function c(b, H) {
    return {
      type: "BOARDING_ADDRESS",
      success: !0,
      address: H,
      id: b
    };
  }
  e.boardingAddress = c;
  function u(b) {
    return b.type === "BALANCE" && b.success === !0;
  }
  e.isBalance = u;
  function l(b, H) {
    return {
      type: "BALANCE",
      success: !0,
      balance: H,
      id: b
    };
  }
  e.balance = l;
  function f(b) {
    return b.type === "VTXOS" && b.success === !0;
  }
  e.isVtxos = f;
  function h(b, H) {
    return {
      type: "VTXOS",
      success: !0,
      vtxos: H,
      id: b
    };
  }
  e.vtxos = h;
  function p(b) {
    return b.type === "VIRTUAL_COINS" && b.success === !0;
  }
  e.isVirtualCoins = p;
  function y(b, H) {
    return {
      type: "VIRTUAL_COINS",
      success: !0,
      virtualCoins: H,
      id: b
    };
  }
  e.virtualCoins = y;
  function d(b) {
    return b.type === "BOARDING_UTXOS" && b.success === !0;
  }
  e.isBoardingUtxos = d;
  function g(b, H) {
    return {
      type: "BOARDING_UTXOS",
      success: !0,
      boardingUtxos: H,
      id: b
    };
  }
  e.boardingUtxos = g;
  function w(b) {
    return b.type === "SEND_BITCOIN_SUCCESS" && b.success === !0;
  }
  e.isSendBitcoinSuccess = w;
  function A(b, H) {
    return {
      type: "SEND_BITCOIN_SUCCESS",
      success: !0,
      txid: H,
      id: b
    };
  }
  e.sendBitcoinSuccess = A;
  function O(b) {
    return b.type === "TRANSACTION_HISTORY" && b.success === !0;
  }
  e.isTransactionHistory = O;
  function P(b, H) {
    return {
      type: "TRANSACTION_HISTORY",
      success: !0,
      transactions: H,
      id: b
    };
  }
  e.transactionHistory = P;
  function V(b) {
    return b.type === "WALLET_STATUS" && b.success === !0;
  }
  e.isWalletStatus = V;
  function Y(b, H, ld) {
    return {
      type: "WALLET_STATUS",
      success: !0,
      status: {
        walletInitialized: H,
        xOnlyPublicKey: ld
      },
      id: b
    };
  }
  e.walletStatus = Y;
  function T(b) {
    return b.type === "CLEAR_RESPONSE";
  }
  e.isClearResponse = T;
  function et(b, H) {
    return {
      type: "CLEAR_RESPONSE",
      success: H,
      id: b
    };
  }
  e.clearResponse = et;
  function L(b) {
    return b.type === "WALLET_RELOADED";
  }
  e.isWalletReloaded = L;
  function I(b, H) {
    return {
      type: "WALLET_RELOADED",
      success: H,
      id: b
    };
  }
  e.walletReloaded = I;
  function lt(b) {
    return b.type === "VTXO_UPDATE";
  }
  e.isVtxoUpdate = lt;
  function M(b, H) {
    return {
      type: "VTXO_UPDATE",
      id: Ni(),
      // spontaneous update, not tied to a request
      success: !0,
      spentVtxos: H,
      newVtxos: b
    };
  }
  e.vtxoUpdate = M;
  function x(b) {
    return b.type === "UTXO_UPDATE";
  }
  e.isUtxoUpdate = x;
  function E(b) {
    return {
      type: "UTXO_UPDATE",
      id: Ni(),
      // spontaneous update, not tied to a request
      success: !0,
      coins: b
    };
  }
  e.utxoUpdate = E;
  function m(b) {
    return b.type === "CONTRACTS" && b.success === !0;
  }
  e.isContracts = m;
  function S(b, H) {
    return {
      type: "CONTRACTS",
      success: !0,
      contracts: H,
      id: b
    };
  }
  e.contracts = S;
  function C(b) {
    return b.type === "CONTRACTS_WITH_VTXOS" && b.success === !0;
  }
  e.isContractsWithVtxos = C;
  function N(b, H) {
    return {
      type: "CONTRACTS_WITH_VTXOS",
      success: !0,
      contracts: H,
      id: b
    };
  }
  e.contractsWithVtxos = N;
  function B(b) {
    return b.type === "CONTRACT" && b.success === !0;
  }
  e.isContract = B;
  function k(b, H) {
    return {
      type: "CONTRACT",
      success: !0,
      contract: H,
      id: b
    };
  }
  e.contract = k;
  function R(b) {
    return b.type === "CONTRACT_CREATED" && b.success === !0;
  }
  e.isContractCreated = R;
  function _(b, H) {
    return {
      type: "CONTRACT_CREATED",
      success: !0,
      contract: H,
      id: b
    };
  }
  e.contractCreated = _;
  function q(b) {
    return b.type === "CONTRACT_STATE_UPDATED" && b.success === !0;
  }
  e.isContractStateUpdated = q;
  function W(b) {
    return {
      type: "CONTRACT_STATE_UPDATED",
      success: !0,
      id: b
    };
  }
  e.contractStateUpdated = W;
  function D(b) {
    return b.type === "CONTRACT_UPDATED" && b.success === !0;
  }
  e.isContractUpdated = D;
  function K(b, H) {
    return {
      type: "CONTRACT_UPDATED",
      success: !0,
      contract: H,
      id: b
    };
  }
  e.contractUpdated = K;
  function Z(b) {
    return b.type === "CONTRACT_DATA_UPDATED" && b.success === !0;
  }
  e.isContractDataUpdated = Z;
  function ft(b) {
    return {
      type: "CONTRACT_DATA_UPDATED",
      success: !0,
      id: b
    };
  }
  e.contractDataUpdated = ft;
  function z(b) {
    return b.type === "CONTRACT_DELETED" && b.success === !0;
  }
  e.isContractDeleted = z;
  function J(b) {
    return {
      type: "CONTRACT_DELETED",
      success: !0,
      id: b
    };
  }
  e.contractDeleted = J;
  function jt(b) {
    return b.type === "CONTRACT_VTXOS" && b.success === !0;
  }
  e.isContractVtxos = jt;
  function en(b, H) {
    return {
      type: "CONTRACT_VTXOS",
      success: !0,
      vtxos: H,
      id: b
    };
  }
  e.contractVtxos = en;
  function nn(b) {
    return b.type === "CONTRACT_VTXOS_FOR_CONTRACT" && b.success === !0;
  }
  e.isContractVtxosForContract = nn;
  function Vf(b, H) {
    return {
      type: "CONTRACT_VTXOS_FOR_CONTRACT",
      success: !0,
      vtxos: H,
      id: b
    };
  }
  e.contractVtxosForContract = Vf;
  function Mf(b) {
    return b.type === "CONTRACT_BALANCE" && b.success === !0;
  }
  e.isContractBalance = Mf;
  function Hf(b, H) {
    return {
      type: "CONTRACT_BALANCE",
      success: !0,
      balance: H,
      id: b
    };
  }
  e.contractBalance = Hf;
  function Ff(b) {
    return b.type === "CONTRACT_BALANCES" && b.success === !0;
  }
  e.isContractBalances = Ff;
  function Wf(b, H) {
    return {
      type: "CONTRACT_BALANCES",
      success: !0,
      balances: H,
      id: b
    };
  }
  e.contractBalances = Wf;
  function Kf(b) {
    return b.type === "TOTAL_CONTRACT_BALANCE" && b.success === !0;
  }
  e.isTotalContractBalance = Kf;
  function zf(b, H) {
    return {
      type: "TOTAL_CONTRACT_BALANCE",
      success: !0,
      balance: H,
      id: b
    };
  }
  e.totalContractBalance = zf;
  function jf(b) {
    return b.type === "SPENDABLE_PATHS" && b.success === !0;
  }
  e.isSpendablePaths = jf;
  function Gf(b, H) {
    return {
      type: "SPENDABLE_PATHS",
      success: !0,
      paths: H,
      id: b
    };
  }
  e.spendablePaths = Gf;
  function qf(b) {
    return b.type === "ALL_SPENDING_PATHS" && b.success === !0;
  }
  e.isAllSpendingPaths = qf;
  function Yf(b, H) {
    return {
      type: "ALL_SPENDING_PATHS",
      success: !0,
      paths: H,
      id: b
    };
  }
  e.allSpendingPaths = Yf;
  function Zf(b) {
    return b.type === "CAN_SPEND" && b.success === !0;
  }
  e.isCanSpend = Zf;
  function Xf(b, H) {
    return {
      type: "CAN_SPEND",
      success: !0,
      canSpend: H,
      id: b
    };
  }
  e.canSpend = Xf;
  function Qf(b) {
    return b.type === "SPENDING_PATH" && b.success === !0;
  }
  e.isSpendingPath = Qf;
  function Jf(b, H) {
    return {
      type: "SPENDING_PATH",
      success: !0,
      path: H,
      id: b
    };
  }
  e.spendingPath = Jf;
  function td(b) {
    return b.type === "CONTRACT_WATCHING" && b.success === !0;
  }
  e.isContractWatching = td;
  function ed(b, H) {
    return {
      type: "CONTRACT_WATCHING",
      success: !0,
      isWatching: H,
      id: b
    };
  }
  e.contractWatching = ed;
  function nd(b) {
    return b.type === "CONTRACT_EVENTS_SUBSCRIBED" && b.success === !0;
  }
  e.isContractEventsSubscribed = nd;
  function rd(b) {
    return {
      type: "CONTRACT_EVENTS_SUBSCRIBED",
      success: !0,
      id: b
    };
  }
  e.contractEventsSubscribed = rd;
  function sd(b) {
    return b.type === "CONTRACT_EVENTS_UNSUBSCRIBED" && b.success === !0;
  }
  e.isContractEventsUnsubscribed = sd;
  function id(b) {
    return {
      type: "CONTRACT_EVENTS_UNSUBSCRIBED",
      success: !0,
      id: b
    };
  }
  e.contractEventsUnsubscribed = id;
  function od(b) {
    return b.type === "CONTRACT_MANAGER_DISPOSED" && b.success === !0;
  }
  e.isContractManagerDisposed = od;
  function ad(b) {
    return {
      type: "CONTRACT_MANAGER_DISPOSED",
      success: !0,
      id: b
    };
  }
  e.contractManagerDisposed = ad;
  function cd(b) {
    return b.type === "CONTRACT_EVENT" && b.success === !0;
  }
  e.isContractEvent = cd;
  function ud(b) {
    return {
      type: "CONTRACT_EVENT",
      id: Ni(),
      // spontaneous event, not tied to a request
      success: !0,
      event: b
    };
  }
  e.contractEvent = ud;
})(U || (U = {}));
const Ri = (e) => e < 253 ? 1 : e <= 65535 ? 3 : e <= 4294967295 ? 5 : 9;
class st {
  constructor(t, n, r, s, i, o) {
    this.hasWitness = t, this.inputCount = n, this.outputCount = r, this.inputSize = s, this.inputWitnessSize = i, this.outputSize = o;
  }
  static create() {
    return new st(!1, 0, 0, 0, 0, 0);
  }
  addP2AInput() {
    return this.inputCount++, this.inputSize += st.INPUT_SIZE, this;
  }
  addKeySpendInput(t = !0) {
    return this.inputCount++, this.inputWitnessSize += 65 + (t ? 0 : 1), this.inputSize += st.INPUT_SIZE, this.hasWitness = !0, this;
  }
  addP2PKHInput() {
    return this.inputCount++, this.inputWitnessSize++, this.inputSize += st.INPUT_SIZE + st.P2PKH_SCRIPT_SIG_SIZE, this;
  }
  addTapscriptInput(t, n, r) {
    const s = 1 + st.BASE_CONTROL_BLOCK_SIZE + 1 + n + 1 + r;
    return this.inputCount++, this.inputWitnessSize += t + 1 + s, this.inputSize += st.INPUT_SIZE, this.hasWitness = !0, this;
  }
  addP2WPKHOutput() {
    return this.outputCount++, this.outputSize += st.OUTPUT_SIZE + st.P2WPKH_OUTPUT_SIZE, this;
  }
  addP2TROutput() {
    return this.outputCount++, this.outputSize += st.OUTPUT_SIZE + st.P2TR_OUTPUT_SIZE, this;
  }
  /**
   * Adds an output given a raw script.
   * Cost = 8 bytes (amount) + varint(scriptLen) + scriptLen
   */
  addOutputScript(t) {
    return this.outputCount++, this.outputSize += 8 + Ri(t.length) + t.length, this;
  }
  /**
   * Adds an output by decoding the address to get the exact script size.
   */
  addOutputAddress(t, n) {
    const r = qe(n).decode(t), s = ht.encode(r);
    return this.addOutputScript(s);
  }
  vsize() {
    const t = Ri(this.inputCount), n = Ri(this.outputCount);
    let s = (st.BASE_TX_SIZE + t + this.inputSize + n + this.outputSize) * st.WITNESS_SCALE_FACTOR;
    return this.hasWitness && (s += st.WITNESS_HEADER_SIZE + this.inputWitnessSize), Qw(s);
  }
}
st.P2PKH_SCRIPT_SIG_SIZE = 108;
st.INPUT_SIZE = 41;
st.BASE_CONTROL_BLOCK_SIZE = 33;
st.OUTPUT_SIZE = 9;
st.P2WPKH_OUTPUT_SIZE = 22;
st.BASE_TX_SIZE = 10;
st.WITNESS_HEADER_SIZE = 2;
st.WITNESS_SCALE_FACTOR = 4;
st.P2TR_OUTPUT_SIZE = 34;
const Qw = (e) => {
  const t = BigInt(Math.ceil(e / st.WITNESS_SCALE_FACTOR));
  return {
    value: t,
    fee: (n) => n * t
  };
};
var ot;
(function(e) {
  function t(I) {
    return typeof I == "object" && I !== null && "type" in I;
  }
  e.isBase = t;
  function n(I) {
    return I.type === "INIT_WALLET" && "arkServerUrl" in I && typeof I.arkServerUrl == "string" && ("arkServerPublicKey" in I ? I.arkServerPublicKey === void 0 || typeof I.arkServerPublicKey == "string" : !0);
  }
  e.isInitWallet = n;
  function r(I) {
    return I.type === "SETTLE";
  }
  e.isSettle = r;
  function s(I) {
    return I.type === "GET_ADDRESS";
  }
  e.isGetAddress = s;
  function i(I) {
    return I.type === "GET_BOARDING_ADDRESS";
  }
  e.isGetBoardingAddress = i;
  function o(I) {
    return I.type === "GET_BALANCE";
  }
  e.isGetBalance = o;
  function a(I) {
    return I.type === "GET_VTXOS";
  }
  e.isGetVtxos = a;
  function c(I) {
    return I.type === "GET_VIRTUAL_COINS";
  }
  e.isGetVirtualCoins = c;
  function u(I) {
    return I.type === "GET_BOARDING_UTXOS";
  }
  e.isGetBoardingUtxos = u;
  function l(I) {
    return I.type === "SEND_BITCOIN" && "params" in I && I.params !== null && typeof I.params == "object" && "address" in I.params && typeof I.params.address == "string" && "amount" in I.params && typeof I.params.amount == "number";
  }
  e.isSendBitcoin = l;
  function f(I) {
    return I.type === "GET_TRANSACTION_HISTORY";
  }
  e.isGetTransactionHistory = f;
  function h(I) {
    return I.type === "GET_STATUS";
  }
  e.isGetStatus = h;
  function p(I) {
    return I.type === "CLEAR";
  }
  e.isClear = p;
  function y(I) {
    return I.type === "RELOAD_WALLET";
  }
  e.isReloadWallet = y;
  function d(I) {
    return I.type === "GET_CONTRACTS";
  }
  e.isGetContracts = d;
  function g(I) {
    return I.type === "GET_CONTRACTS_WITH_VTXOS";
  }
  e.isGetContractsVtxos = g;
  function w(I) {
    return I.type === "CREATE_CONTRACT" && "params" in I && typeof I.params == "object" && I.params !== null && "type" in I.params && "params" in I.params && "script" in I.params && "address" in I.params;
  }
  e.isCreateContract = w;
  function A(I) {
    return I.type === "UPDATE_CONTRACT" && "contractScript" in I && typeof I.contractScript == "string" && "updates" in I && typeof I.updates == "object";
  }
  e.isUpdateContract = A;
  function O(I) {
    return I.type === "UPDATE_CONTRACT_STATE" && "contractScript" in I && typeof I.contractScript == "string" && "state" in I && (I.state === "active" || I.state === "inactive");
  }
  e.isUpdateContractState = O;
  function P(I) {
    return I.type === "DELETE_CONTRACT" && "contractScript" in I && typeof I.contractScript == "string";
  }
  e.isDeleteContract = P;
  function V(I) {
    return I.type === "GET_SPENDABLE_PATHS";
  }
  e.isGetSpendablePaths = V;
  function Y(I) {
    return I.type === "GET_ALL_SPENDING_PATHS";
  }
  e.isGetAllSpendingPaths = Y;
  function T(I) {
    return I.type === "IS_CONTRACT_MANAGER_WATCHING";
  }
  e.isIsContractWatching = T;
  function et(I) {
    return I.type === "SUBSCRIBE_CONTRACT_EVENTS";
  }
  e.isSubscribeContractEvents = et;
  function L(I) {
    return I.type === "UNSUBSCRIBE_CONTRACT_EVENTS";
  }
  e.isUnsubscribeContractEvents = L;
})(ot || (ot = {}));
class _f {
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
  getContractManager() {
    return this.wallet.getContractManager();
  }
  async handleReload(t) {
    return { pending: await this.wallet.fetchPendingTxs(), finalized: [] };
  }
  async handleSettle(...t) {
  }
  async handleSendBitcoin(...t) {
  }
}
class Jw extends _f {
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
}
class tm {
  constructor(t, n = () => {
  }) {
    this.messageCallback = n, this.walletRepository = t.walletRepository, this.contractRepository = t.contractRepository;
  }
  /**
   * Get spendable vtxos for the current wallet address
   */
  async getSpendableVtxos() {
    if (!this.handler)
      return [];
    const t = await this.handler.getAddress();
    return (await this.walletRepository.getVtxos(t)).filter(Me);
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
      spendable: n.filter(Me),
      spent: n.filter((r) => !Me(r))
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
    this.incomingFundsSubscription && this.incomingFundsSubscription(), this.contractEventsSubscription && (this.contractEventsSubscription(), this.contractEventsSubscription = void 0), this.handler = void 0, this.arkProvider = void 0, this.indexerProvider = void 0;
  }
  async reload() {
    await this.onWalletInitialized();
  }
  async onWalletInitialized() {
    if (!this.handler || !this.arkProvider || !this.indexerProvider || !this.handler.offchainTapscript || !this.handler.boardingTapscript)
      return;
    const t = v.encode(this.handler.offchainTapscript.pkScript), r = (await this.indexerProvider.getVtxos({
      scripts: [t]
    })).vtxos.map((c) => Ie(this.handler, c));
    try {
      const { pending: c, finalized: u } = await this.handler.handleReload(r);
      console.info(`Recovered ${u.length}/${c.length} pending transactions: ${u.join(", ")}`);
    } catch (c) {
      console.error("Error recovering pending transactions:", c);
    }
    const s = await this.handler.getAddress();
    await this.walletRepository.saveVtxos(s, r);
    const i = await this.handler.getBoardingAddress(), o = await this.handler.onchainProvider.getCoins(i);
    await this.walletRepository.saveUtxos(i, o.map((c) => yo(this.handler, c)));
    const a = await this.handler.getTransactionHistory();
    a && await this.walletRepository.saveTransactions(s, a), this.incomingFundsSubscription && this.incomingFundsSubscription(), this.incomingFundsSubscription = await this.handler.notifyIncomingFunds(async (c) => {
      if (c.type === "vtxo") {
        const u = c.newVtxos.length > 0 ? c.newVtxos.map((f) => Ie(this.handler, f)) : [], l = c.spentVtxos.length > 0 ? c.spentVtxos.map((f) => Ie(this.handler, f)) : [];
        if ([...u, ...l].length === 0)
          return;
        await this.walletRepository.saveVtxos(s, [
          ...u,
          ...l
        ]), await this.sendMessageToAllClients(U.vtxoUpdate(u, l));
      }
      if (c.type === "utxo") {
        const u = c.coins.map((f) => yo(this.handler, f)), l = await this.handler?.getBoardingAddress();
        await this.walletRepository.deleteUtxos(l), await this.walletRepository.saveUtxos(l, u), await this.sendMessageToAllClients(U.utxoUpdate(u));
      }
    });
  }
  async handleClear(t) {
    await this.clear(), ot.isBase(t.data) && t.source?.postMessage(U.clearResponse(t.data.id, !0));
  }
  async handleInitWallet(t) {
    if (!ot.isInitWallet(t.data)) {
      console.error("Invalid INIT_WALLET message format", t.data), t.source?.postMessage(U.error(t.data.id, "Invalid INIT_WALLET message format"));
      return;
    }
    const n = t.data, { arkServerPublicKey: r, arkServerUrl: s } = n;
    this.arkProvider = new wf(s), this.indexerProvider = new Ef(s);
    try {
      if ("privateKey" in n.key && typeof n.key.privateKey == "string") {
        const { key: { privateKey: i } } = n, o = lr.fromHex(i), a = await Gn.create({
          identity: o,
          arkServerUrl: s,
          arkServerPublicKey: r,
          storage: {
            walletRepository: this.walletRepository,
            contractRepository: this.contractRepository
          }
        });
        this.handler = new Jw(a);
      } else if ("publicKey" in n.key && typeof n.key.publicKey == "string") {
        const { key: { publicKey: i } } = n, o = ni.fromPublicKey(v.decode(i)), a = await wn.create({
          identity: o,
          arkServerUrl: s,
          arkServerPublicKey: r,
          storage: {
            walletRepository: this.walletRepository,
            contractRepository: this.contractRepository
          }
        });
        this.handler = new _f(a);
      } else {
        const i = "Missing privateKey or publicKey in key object";
        t.source?.postMessage(U.error(n.id, i)), console.error(i);
        return;
      }
    } catch (i) {
      console.error("Error initializing wallet:", i);
      const o = i instanceof Error ? i.message : "Unknown error occurred";
      t.source?.postMessage(U.error(n.id, o));
      return;
    }
    t.source?.postMessage(U.walletInitialized(n.id)), await this.onWalletInitialized();
  }
  async handleSettle(t) {
    const n = t.data;
    if (!ot.isSettle(n)) {
      console.error("Invalid SETTLE message format", n), t.source?.postMessage(U.error(n.id, "Invalid SETTLE message format"));
      return;
    }
    try {
      if (!this.handler) {
        console.error("Wallet not initialized"), t.source?.postMessage(U.error(n.id, "Wallet not initialized"));
        return;
      }
      const r = await this.handler.handleSettle(n.params, (s) => {
        t.source?.postMessage(U.settleEvent(n.id, s));
      });
      r ? t.source?.postMessage(U.settleSuccess(n.id, r)) : t.source?.postMessage(U.error(n.id, "Operation not supported in readonly mode"));
    } catch (r) {
      console.error("Error settling:", r);
      const s = r instanceof Error ? r.message : "Unknown error occurred";
      t.source?.postMessage(U.error(n.id, s));
    }
  }
  async handleSendBitcoin(t) {
    const n = t.data;
    if (!ot.isSendBitcoin(n)) {
      console.error("Invalid SEND_BITCOIN message format", n), t.source?.postMessage(U.error(n.id, "Invalid SEND_BITCOIN message format"));
      return;
    }
    if (!this.handler) {
      console.error("Wallet not initialized"), t.source?.postMessage(U.error(n.id, "Wallet not initialized"));
      return;
    }
    try {
      const r = await this.handler.handleSendBitcoin(n.params);
      r ? t.source?.postMessage(U.sendBitcoinSuccess(n.id, r)) : t.source?.postMessage(U.error(n.id, "Operation not supported in readonly mode"));
    } catch (r) {
      console.error("Error sending bitcoin:", r);
      const s = r instanceof Error ? r.message : "Unknown error occurred";
      t.source?.postMessage(U.error(n.id, s));
    }
  }
  async handleGetAddress(t) {
    const n = t.data;
    if (!ot.isGetAddress(n)) {
      console.error("Invalid GET_ADDRESS message format", n), t.source?.postMessage(U.error(n.id, "Invalid GET_ADDRESS message format"));
      return;
    }
    if (!this.handler) {
      console.error("Wallet not initialized"), t.source?.postMessage(U.error(n.id, "Wallet not initialized"));
      return;
    }
    try {
      const r = await this.handler.getAddress();
      t.source?.postMessage(U.address(n.id, r));
    } catch (r) {
      console.error("Error getting address:", r);
      const s = r instanceof Error ? r.message : "Unknown error occurred";
      t.source?.postMessage(U.error(n.id, s));
    }
  }
  async handleGetBoardingAddress(t) {
    const n = t.data;
    if (!ot.isGetBoardingAddress(n)) {
      console.error("Invalid GET_BOARDING_ADDRESS message format", n), t.source?.postMessage(U.error(n.id, "Invalid GET_BOARDING_ADDRESS message format"));
      return;
    }
    if (!this.handler) {
      console.error("Wallet not initialized"), t.source?.postMessage(U.error(n.id, "Wallet not initialized"));
      return;
    }
    try {
      const r = await this.handler.getBoardingAddress();
      t.source?.postMessage(U.boardingAddress(n.id, r));
    } catch (r) {
      console.error("Error getting boarding address:", r);
      const s = r instanceof Error ? r.message : "Unknown error occurred";
      t.source?.postMessage(U.error(n.id, s));
    }
  }
  async handleGetBalance(t) {
    const n = t.data;
    if (!ot.isGetBalance(n)) {
      console.error("Invalid GET_BALANCE message format", n), t.source?.postMessage(U.error(n.id, "Invalid GET_BALANCE message format"));
      return;
    }
    if (!this.handler) {
      console.error("Wallet not initialized"), t.source?.postMessage(U.error(n.id, "Wallet not initialized"));
      return;
    }
    try {
      const [r, s, i] = await Promise.all([
        this.getAllBoardingUtxos(),
        this.getSpendableVtxos(),
        this.getSweptVtxos()
      ]);
      let o = 0, a = 0;
      for (const p of r)
        p.status.confirmed ? o += p.value : a += p.value;
      let c = 0, u = 0, l = 0;
      for (const p of s)
        p.virtualStatus.state === "settled" ? c += p.value : p.virtualStatus.state === "preconfirmed" && (u += p.value);
      for (const p of i)
        Me(p) && (l += p.value);
      const f = o + a, h = c + u + l;
      t.source?.postMessage(U.balance(n.id, {
        boarding: {
          confirmed: o,
          unconfirmed: a,
          total: f
        },
        settled: c,
        preconfirmed: u,
        available: c + u,
        recoverable: l,
        total: f + h
      }));
    } catch (r) {
      console.error("Error getting balance:", r);
      const s = r instanceof Error ? r.message : "Unknown error occurred";
      t.source?.postMessage(U.error(n.id, s));
    }
  }
  async handleGetVtxos(t) {
    const n = t.data;
    if (!ot.isGetVtxos(n)) {
      console.error("Invalid GET_VTXOS message format", n), t.source?.postMessage(U.error(n.id, "Invalid GET_VTXOS message format"));
      return;
    }
    if (!this.handler) {
      console.error("Wallet not initialized"), t.source?.postMessage(U.error(n.id, "Wallet not initialized"));
      return;
    }
    try {
      const r = await this.getSpendableVtxos(), s = this.handler.dustAmount, o = n.filter?.withRecoverable ?? !1 ? r : r.filter((a) => !(s != null && gf(a, s) || sa(a) || pf(a)));
      t.source?.postMessage(U.vtxos(n.id, o));
    } catch (r) {
      console.error("Error getting vtxos:", r);
      const s = r instanceof Error ? r.message : "Unknown error occurred";
      t.source?.postMessage(U.error(n.id, s));
    }
  }
  async handleGetBoardingUtxos(t) {
    const n = t.data;
    if (!ot.isGetBoardingUtxos(n)) {
      console.error("Invalid GET_BOARDING_UTXOS message format", n), t.source?.postMessage(U.error(n.id, "Invalid GET_BOARDING_UTXOS message format"));
      return;
    }
    if (!this.handler) {
      console.error("Wallet not initialized"), t.source?.postMessage(U.error(n.id, "Wallet not initialized"));
      return;
    }
    try {
      const r = await this.getAllBoardingUtxos();
      t.source?.postMessage(U.boardingUtxos(n.id, r));
    } catch (r) {
      console.error("Error getting boarding utxos:", r);
      const s = r instanceof Error ? r.message : "Unknown error occurred";
      t.source?.postMessage(U.error(n.id, s));
    }
  }
  async handleGetTransactionHistory(t) {
    const n = t.data;
    if (!ot.isGetTransactionHistory(n)) {
      console.error("Invalid GET_TRANSACTION_HISTORY message format", n), t.source?.postMessage(U.error(n.id, "Invalid GET_TRANSACTION_HISTORY message format"));
      return;
    }
    if (!this.handler) {
      console.error("Wallet not initialized"), t.source?.postMessage(U.error(n.id, "Wallet not initialized"));
      return;
    }
    try {
      const r = await this.handler.getTransactionHistory();
      t.source?.postMessage(U.transactionHistory(n.id, r));
    } catch (r) {
      console.error("Error getting transaction history:", r);
      const s = r instanceof Error ? r.message : "Unknown error occurred";
      t.source?.postMessage(U.error(n.id, s));
    }
  }
  async handleGetStatus(t) {
    const n = t.data;
    if (!ot.isGetStatus(n)) {
      console.error("Invalid GET_STATUS message format", n), t.source?.postMessage(U.error(n.id, "Invalid GET_STATUS message format"));
      return;
    }
    const r = this.handler ? await this.handler.identity.xOnlyPublicKey() : void 0;
    t.source?.postMessage(U.walletStatus(n.id, this.handler !== void 0, r));
  }
  async handleMessage(t) {
    this.messageCallback(t);
    const n = t.data;
    if (!ot.isBase(n)) {
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
      // Contract Manager events
      case "CREATE_CONTRACT": {
        await this.handleCreateContract(t);
        break;
      }
      case "GET_CONTRACTS": {
        await this.handleGetContracts(t);
        break;
      }
      case "GET_CONTRACTS_WITH_VTXOS": {
        await this.handleGetContractsWithVtxos(t);
        break;
      }
      case "UPDATE_CONTRACT": {
        await this.handleUpdateContract(t);
        break;
      }
      case "DELETE_CONTRACT": {
        await this.handleDeleteContract(t);
        break;
      }
      case "GET_SPENDABLE_PATHS": {
        await this.handleGetSpendablePaths(t);
        break;
      }
      case "GET_ALL_SPENDING_PATHS": {
        await this.handleGetAllSpendingPaths(t);
        break;
      }
      case "IS_CONTRACT_MANAGER_WATCHING": {
        await this.handleIsContractManagerWatching(t);
        break;
      }
      case "SUBSCRIBE_CONTRACT_EVENTS": {
        await this.handleSubscribeContractEvents(t);
        break;
      }
      case "UNSUBSCRIBE_CONTRACT_EVENTS": {
        await this.handleUnsubscribeContractEvents(t);
        break;
      }
      default:
        t.source?.postMessage(U.error(n.id, "Unknown message type"));
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
    if (!ot.isReloadWallet(n)) {
      console.error("Invalid RELOAD_WALLET message format", n), t.source?.postMessage(U.error(n.id, "Invalid RELOAD_WALLET message format"));
      return;
    }
    if (!this.handler) {
      console.error("Wallet not initialized"), t.source?.postMessage(U.walletReloaded(n.id, !1));
      return;
    }
    try {
      await this.onWalletInitialized(), t.source?.postMessage(U.walletReloaded(n.id, !0));
    } catch (r) {
      console.error("Error reloading wallet:", r), t.source?.postMessage(U.walletReloaded(n.id, !1));
    }
  }
  // =====================================================================
  // Contract Manager handlers
  // =====================================================================
  async handleCreateContract(t) {
    const n = t.data;
    if (!ot.isCreateContract(n)) {
      console.error("Invalid CREATE_CONTRACT message format", n), t.source?.postMessage(U.error(n.id, "Invalid CREATE_CONTRACT message format"));
      return;
    }
    if (!this.handler) {
      console.error("Wallet not initialized"), t.source?.postMessage(U.error(n.id, "Wallet not initialized"));
      return;
    }
    try {
      const s = await (await this.handler.getContractManager()).createContract(n.params);
      t.source?.postMessage(U.contractCreated(n.id, s));
    } catch (r) {
      console.error("Error creating contract:", r);
      const s = r instanceof Error ? r.message : "Unknown error occurred";
      t.source?.postMessage(U.error(n.id, s));
    }
  }
  async handleGetContracts(t) {
    const n = t.data;
    if (!ot.isGetContracts(n)) {
      console.error("Invalid GET_CONTRACTS message format", n), t.source?.postMessage(U.error(n.id, "Invalid GET_CONTRACTS message format"));
      return;
    }
    if (!this.handler) {
      console.error("Wallet not initialized"), t.source?.postMessage(U.error(n.id, "Wallet not initialized"));
      return;
    }
    try {
      const s = await (await this.handler.getContractManager()).getContracts(n.filter);
      t.source?.postMessage(U.contracts(n.id, s));
    } catch (r) {
      console.error("Error getting contracts:", r);
      const s = r instanceof Error ? r.message : "Unknown error occurred";
      t.source?.postMessage(U.error(n.id, s));
    }
  }
  async handleGetContractsWithVtxos(t) {
    const n = t.data;
    if (!ot.isGetContractsVtxos(n)) {
      console.error("Invalid GET_CONTRACTS_WITH_VTXOS message format", n), t.source?.postMessage(U.error(n.id, "Invalid GET_CONTRACTS_WITH_VTXOS message format"));
      return;
    }
    if (!this.handler) {
      console.error("Wallet not initialized"), t.source?.postMessage(U.error(n.id, "Wallet not initialized"));
      return;
    }
    try {
      const s = await (await this.handler.getContractManager()).getContractsWithVtxos(n.filter);
      t.source?.postMessage(U.contractsWithVtxos(n.id, s));
    } catch (r) {
      console.error("Error getting contracts with vtxos:", r);
      const s = r instanceof Error ? r.message : "Unknown error occurred";
      t.source?.postMessage(U.error(n.id, s));
    }
  }
  async handleUpdateContract(t) {
    const n = t.data;
    if (!ot.isUpdateContract(n)) {
      console.error("Invalid UPDATE_CONTRACT message format", n), t.source?.postMessage(U.error(n.id, "Invalid UPDATE_CONTRACT message format"));
      return;
    }
    if (!this.handler) {
      console.error("Wallet not initialized"), t.source?.postMessage(U.error(n.id, "Wallet not initialized"));
      return;
    }
    try {
      const s = await (await this.handler.getContractManager()).updateContract(n.contractScript, n.updates);
      t.source?.postMessage(U.contractUpdated(n.id, s));
    } catch (r) {
      console.error("Error updating contract:", r);
      const s = r instanceof Error ? r.message : "Unknown error occurred";
      t.source?.postMessage(U.error(n.id, s));
    }
  }
  async handleDeleteContract(t) {
    const n = t.data;
    if (!ot.isDeleteContract(n)) {
      console.error("Invalid DELETE_CONTRACT message format", n), t.source?.postMessage(U.error(n.id, "Invalid DELETE_CONTRACT message format"));
      return;
    }
    if (!this.handler) {
      console.error("Wallet not initialized"), t.source?.postMessage(U.error(n.id, "Wallet not initialized"));
      return;
    }
    try {
      await (await this.handler.getContractManager()).deleteContract(n.contractScript), t.source?.postMessage(U.contractDeleted(n.id));
    } catch (r) {
      console.error("Error deleting contract:", r);
      const s = r instanceof Error ? r.message : "Unknown error occurred";
      t.source?.postMessage(U.error(n.id, s));
    }
  }
  async handleGetSpendablePaths(t) {
    const n = t.data;
    if (!ot.isGetSpendablePaths(n)) {
      console.error("Invalid GET_SPENDABLE_PATHS message format", n), t.source?.postMessage(U.error(n.id, "Invalid GET_SPENDABLE_PATHS message format"));
      return;
    }
    if (!this.handler) {
      console.error("Wallet not initialized"), t.source?.postMessage(U.error(n.id, "Wallet not initialized"));
      return;
    }
    try {
      const s = await (await this.handler.getContractManager()).getSpendablePaths(n.options);
      t.source?.postMessage(U.spendablePaths(n.id, s));
    } catch (r) {
      console.error("Error getting spendable paths:", r);
      const s = r instanceof Error ? r.message : "Unknown error occurred";
      t.source?.postMessage(U.error(n.id, s));
    }
  }
  async handleGetAllSpendingPaths(t) {
    const n = t.data;
    if (!ot.isGetAllSpendingPaths(n)) {
      console.error("Invalid GET_ALL_SPENDING_PATHS message format", n), t.source?.postMessage(U.error(n.id, "Invalid GET_ALL_SPENDING_PATHS message format"));
      return;
    }
    if (!this.handler) {
      console.error("Wallet not initialized"), t.source?.postMessage(U.error(n.id, "Wallet not initialized"));
      return;
    }
    try {
      const s = await (await this.handler.getContractManager()).getAllSpendingPaths(n.options);
      t.source?.postMessage(U.allSpendingPaths(n.id, s));
    } catch (r) {
      console.error("Error getting all spending paths:", r);
      const s = r instanceof Error ? r.message : "Unknown error occurred";
      t.source?.postMessage(U.error(n.id, s));
    }
  }
  async handleIsContractManagerWatching(t) {
    const n = t.data;
    if (!ot.isIsContractWatching(n)) {
      console.error("Invalid IS_CONTRACT_MANAGER_WATCHING message format", n), t.source?.postMessage(U.error(n.id, "Invalid IS_CONTRACT_MANAGER_WATCHING message format"));
      return;
    }
    if (!this.handler) {
      console.error("Wallet not initialized"), t.source?.postMessage(U.error(n.id, "Wallet not initialized"));
      return;
    }
    try {
      const s = await (await this.handler.getContractManager()).isWatching();
      t.source?.postMessage(U.contractWatching(n.id, s));
    } catch (r) {
      console.error("Error checking contract manager state:", r);
      const s = r instanceof Error ? r.message : "Unknown error occurred";
      t.source?.postMessage(U.error(n.id, s));
    }
  }
  async handleSubscribeContractEvents(t) {
    const n = t.data;
    if (!ot.isSubscribeContractEvents(n)) {
      console.error("Invalid SUBSCRIBE_CONTRACT_EVENTS message format", n), t.source?.postMessage(U.error(n.id, "Invalid SUBSCRIBE_CONTRACT_EVENTS message format"));
      return;
    }
    if (!this.handler) {
      console.error("Wallet not initialized"), t.source?.postMessage(U.error(n.id, "Wallet not initialized"));
      return;
    }
    try {
      const r = await this.handler.getContractManager();
      this.contractEventsSubscription && this.contractEventsSubscription(), this.contractEventsSubscription = r.onContractEvent((s) => {
        this.sendMessageToAllClients(U.contractEvent(s));
      }), t.source?.postMessage(U.contractEventsSubscribed(n.id));
    } catch (r) {
      console.error("Error subscribing to contract events:", r);
      const s = r instanceof Error ? r.message : "Unknown error occurred";
      t.source?.postMessage(U.error(n.id, s));
    }
  }
  async handleUnsubscribeContractEvents(t) {
    const n = t.data;
    if (!ot.isUnsubscribeContractEvents(n)) {
      console.error("Invalid UNSUBSCRIBE_CONTRACT_EVENTS message format", n), t.source?.postMessage(U.error(n.id, "Invalid UNSUBSCRIBE_CONTRACT_EVENTS message format"));
      return;
    }
    if (!this.handler) {
      console.error("Wallet not initialized"), t.source?.postMessage(U.error(n.id, "Wallet not initialized"));
      return;
    }
    try {
      this.contractEventsSubscription && (this.contractEventsSubscription(), this.contractEventsSubscription = void 0), t.source?.postMessage(U.contractEventsUnsubscribed(n.id));
    } catch (r) {
      console.error("Error unsubscribing from contract events:", r);
      const s = r instanceof Error ? r.message : "Unknown error occurred";
      t.source?.postMessage(U.error(n.id, s));
    }
  }
}
var Zc;
(function(e) {
  let t;
  (function(s) {
    s[s.UNROLL = 0] = "UNROLL", s[s.WAIT = 1] = "WAIT", s[s.DONE = 2] = "DONE";
  })(t = e.StepType || (e.StepType = {}));
  class n {
    constructor(i, o, a, c) {
      this.toUnroll = i, this.bumper = o, this.explorer = a, this.indexer = c;
    }
    static async create(i, o, a, c) {
      const { chain: u } = await c.getVtxoChain(i);
      return new n({ ...i, chain: u }, o, a, c);
    }
    /**
     * Get the next step to be executed
     * @returns The next step to be executed + the function to execute it
     */
    async next() {
      let i;
      const o = this.toUnroll.chain;
      for (let u = o.length - 1; u >= 0; u--) {
        const l = o[u];
        if (!(l.type === $n.COMMITMENT || l.type === $n.UNSPECIFIED))
          try {
            if (!(await this.explorer.getTxStatus(l.txid)).confirmed)
              return {
                type: t.WAIT,
                txid: l.txid,
                do: rm(this.explorer, l.txid)
              };
          } catch {
            i = l;
            break;
          }
      }
      if (!i)
        return {
          type: t.DONE,
          vtxoTxid: this.toUnroll.txid,
          do: () => Promise.resolve()
        };
      const a = await this.indexer.getVirtualTxs([
        i.txid
      ]);
      if (a.txs.length === 0)
        throw new Error(`Tx ${i.txid} not found`);
      const c = Ye.fromPSBT(St.decode(a.txs[0]));
      if (i.type === $n.TREE) {
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
        do: nm(this.bumper, this.explorer, c)
      };
    }
    /**
     * Iterate over the steps to be executed and execute them
     * @returns An async iterator over the executed steps
     */
    async *[Symbol.asyncIterator]() {
      let i;
      do {
        i !== void 0 && await em(1e3);
        const o = await this.next();
        await o.do(), yield o, i = o.type;
      } while (i !== t.DONE);
    }
  }
  e.Session = n;
  async function r(s, i, o) {
    const a = await s.onchainProvider.getChainTip();
    let c = await s.getVtxos({ withUnrolled: !0 });
    if (c = c.filter((w) => i.includes(w.txid)), c.length === 0)
      throw new Error("No vtxos to complete unroll");
    const u = [];
    let l = 0n;
    const f = st.create();
    for (const w of c) {
      if (!w.isUnrolled)
        throw new Error(`Vtxo ${w.txid}:${w.vout} is not fully unrolled, use unroll first`);
      const A = await s.onchainProvider.getTxStatus(w.txid);
      if (!A.confirmed)
        throw new Error(`tx ${w.txid} is not confirmed`);
      const O = sm({ height: A.blockHeight, time: A.blockTime }, a, w);
      if (!O)
        throw new Error(`no available exit path found for vtxo ${w.txid}:${w.vout}`);
      const P = zt.decode(w.tapTree).findLeaf(v.encode(O.script));
      if (!P)
        throw new Error(`spending leaf not found for vtxo ${w.txid}:${w.vout}`);
      l += BigInt(w.value), u.push({
        txid: w.txid,
        index: w.vout,
        tapLeafScript: [P],
        sequence: 4294967294,
        witnessUtxo: {
          amount: BigInt(w.value),
          script: zt.decode(w.tapTree).pkScript
        },
        sighashType: mn.DEFAULT
      }), f.addTapscriptInput(64, P[1].length, fe.encode(P[0]).length);
    }
    const h = new Ye({ version: 2 });
    for (const w of u)
      h.addInput(w);
    f.addOutputAddress(o, s.network);
    let p = await s.onchainProvider.getFeeRate();
    (!p || p < Gn.MIN_FEE_RATE) && (p = Gn.MIN_FEE_RATE);
    const y = f.vsize().fee(BigInt(p));
    if (y > l)
      throw new Error("fee amount is greater than the total amount");
    const d = l - y;
    if (d < BigInt(Py))
      throw new Error("send amount is less than dust amount");
    h.addOutputAddress(o, d);
    const g = await s.identity.sign(h);
    return g.finalize(), await s.onchainProvider.broadcastTransaction(g.hex), g.id;
  }
  e.completeUnroll = r;
})(Zc || (Zc = {}));
function em(e) {
  return new Promise((t) => setTimeout(t, e));
}
function nm(e, t, n) {
  return async () => {
    const [r, s] = await e.bumpP2A(n);
    await t.broadcastTransaction(r, s);
  };
}
function rm(e, t) {
  return () => new Promise((n, r) => {
    const s = setInterval(async () => {
      try {
        (await e.getTxStatus(t)).confirmed && (clearInterval(s), n());
      } catch (i) {
        clearInterval(s), r(i);
      }
    }, 5e3);
  });
}
function sm(e, t, n) {
  const r = zt.decode(n.tapTree).exitPaths();
  for (const s of r)
    if (s.params.timelock.type === "blocks") {
      if (t.height >= e.height + Number(s.params.timelock.value))
        return s;
    } else if (t.time >= e.time + Number(s.params.timelock.value))
      return s;
}
const Lf = new tm();
Lf.start().catch(console.error);
const Df = "arkade-cache-v1";
self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(Df)), self.skipWaiting();
});
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((t) => Promise.all(
      t.map((n) => {
        if (n !== Df)
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
  e.data && e.data.type === "RELOAD_WALLET" && e.waitUntil(Lf.reload().catch(console.error));
});
