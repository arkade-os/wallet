/*! noble-hashes - MIT License (c) 2022 Paul Miller (paulmillr.com) */
function Ro(n) {
  return n instanceof Uint8Array || ArrayBuffer.isView(n) && n.constructor.name === "Uint8Array";
}
function Ye(n, t = "") {
  if (!Number.isSafeInteger(n) || n < 0) {
    const e = t && `"${t}" `;
    throw new Error(`${e}expected integer >= 0, got ${n}`);
  }
}
function q(n, t, e = "") {
  const r = Ro(n), s = n?.length, i = t !== void 0;
  if (!r || i && s !== t) {
    const o = e && `"${e}" `, a = i ? ` of length ${t}` : "", c = r ? `length=${s}` : `type=${typeof n}`;
    throw new Error(o + "expected Uint8Array" + a + ", got " + c);
  }
  return n;
}
function Eu(n) {
  if (typeof n != "function" || typeof n.create != "function")
    throw new Error("Hash must wrapped by utils.createHasher");
  Ye(n.outputLen), Ye(n.blockLen);
}
function fs(n, t = !0) {
  if (n.destroyed)
    throw new Error("Hash instance has been destroyed");
  if (t && n.finished)
    throw new Error("Hash#digest() has already been called");
}
function id(n, t) {
  q(n, void 0, "digestInto() output");
  const e = t.outputLen;
  if (n.length < e)
    throw new Error('"digestInto() output" expected to be of length >=' + e);
}
function _n(...n) {
  for (let t = 0; t < n.length; t++)
    n[t].fill(0);
}
function pi(n) {
  return new DataView(n.buffer, n.byteOffset, n.byteLength);
}
function ue(n, t) {
  return n << 32 - t | n >>> t;
}
function Pr(n, t) {
  return n << t | n >>> 32 - t >>> 0;
}
const xu = /* @ts-ignore */ typeof Uint8Array.from([]).toHex == "function" && typeof Uint8Array.fromHex == "function", od = /* @__PURE__ */ Array.from({ length: 256 }, (n, t) => t.toString(16).padStart(2, "0"));
function Ws(n) {
  if (q(n), xu)
    return n.toHex();
  let t = "";
  for (let e = 0; e < n.length; e++)
    t += od[n[e]];
  return t;
}
const xe = { _0: 48, _9: 57, A: 65, F: 70, a: 97, f: 102 };
function ka(n) {
  if (n >= xe._0 && n <= xe._9)
    return n - xe._0;
  if (n >= xe.A && n <= xe.F)
    return n - (xe.A - 10);
  if (n >= xe.a && n <= xe.f)
    return n - (xe.a - 10);
}
function ds(n) {
  if (typeof n != "string")
    throw new Error("hex string expected, got " + typeof n);
  if (xu)
    return Uint8Array.fromHex(n);
  const t = n.length, e = t / 2;
  if (t % 2)
    throw new Error("hex string expected, got unpadded hex of length " + t);
  const r = new Uint8Array(e);
  for (let s = 0, i = 0; s < e; s++, i += 2) {
    const o = ka(n.charCodeAt(i)), a = ka(n.charCodeAt(i + 1));
    if (o === void 0 || a === void 0) {
      const c = n[i] + n[i + 1];
      throw new Error('hex string expected, got non-hex character "' + c + '" at index ' + i);
    }
    r[s] = o * 16 + a;
  }
  return r;
}
function re(...n) {
  let t = 0;
  for (let r = 0; r < n.length; r++) {
    const s = n[r];
    q(s), t += s.length;
  }
  const e = new Uint8Array(t);
  for (let r = 0, s = 0; r < n.length; r++) {
    const i = n[r];
    e.set(i, s), s += i.length;
  }
  return e;
}
function Tu(n, t = {}) {
  const e = (s, i) => n(i).update(s).digest(), r = n(void 0);
  return e.outputLen = r.outputLen, e.blockLen = r.blockLen, e.create = (s) => n(s), Object.assign(e, t), Object.freeze(e);
}
function Or(n = 32) {
  const t = typeof globalThis == "object" ? globalThis.crypto : null;
  if (typeof t?.getRandomValues != "function")
    throw new Error("crypto.getRandomValues must be defined");
  return t.getRandomValues(new Uint8Array(n));
}
const ad = (n) => ({
  oid: Uint8Array.from([6, 9, 96, 134, 72, 1, 101, 3, 4, 2, n])
});
function cd(n, t, e) {
  return n & t ^ ~n & e;
}
function ud(n, t, e) {
  return n & t ^ n & e ^ t & e;
}
let Su = class {
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
  constructor(t, e, r, s) {
    this.blockLen = t, this.outputLen = e, this.padOffset = r, this.isLE = s, this.buffer = new Uint8Array(t), this.view = pi(this.buffer);
  }
  update(t) {
    fs(this), q(t);
    const { view: e, buffer: r, blockLen: s } = this, i = t.length;
    for (let o = 0; o < i; ) {
      const a = Math.min(s - this.pos, i - o);
      if (a === s) {
        const c = pi(t);
        for (; s <= i - o; o += s)
          this.process(c, o);
        continue;
      }
      r.set(t.subarray(o, o + a), this.pos), this.pos += a, o += a, this.pos === s && (this.process(e, 0), this.pos = 0);
    }
    return this.length += t.length, this.roundClean(), this;
  }
  digestInto(t) {
    fs(this), id(t, this), this.finished = !0;
    const { buffer: e, view: r, blockLen: s, isLE: i } = this;
    let { pos: o } = this;
    e[o++] = 128, _n(this.buffer.subarray(o)), this.padOffset > s - o && (this.process(r, 0), o = 0);
    for (let d = o; d < s; d++)
      e[d] = 0;
    r.setBigUint64(s - 8, BigInt(this.length * 8), i), this.process(r, 0);
    const a = pi(t), c = this.outputLen;
    if (c % 4)
      throw new Error("_sha2: outputLen must be aligned to 32bit");
    const u = c / 4, l = this.get();
    if (u > l.length)
      throw new Error("_sha2: outputLen bigger than state");
    for (let d = 0; d < u; d++)
      a.setUint32(4 * d, l[d], i);
  }
  digest() {
    const { buffer: t, outputLen: e } = this;
    this.digestInto(t);
    const r = t.slice(0, e);
    return this.destroy(), r;
  }
  _cloneInto(t) {
    t ||= new this.constructor(), t.set(...this.get());
    const { blockLen: e, buffer: r, length: s, finished: i, destroyed: o, pos: a } = this;
    return t.destroyed = o, t.finished = i, t.length = s, t.pos = a, s % e && t.buffer.set(r), t;
  }
  clone() {
    return this._cloneInto();
  }
};
const Pe = /* @__PURE__ */ Uint32Array.from([
  1779033703,
  3144134277,
  1013904242,
  2773480762,
  1359893119,
  2600822924,
  528734635,
  1541459225
]), ld = /* @__PURE__ */ Uint32Array.from([
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
]), _e = /* @__PURE__ */ new Uint32Array(64);
let fd = class extends Su {
  constructor(t) {
    super(64, t, 8, !1);
  }
  get() {
    const { A: t, B: e, C: r, D: s, E: i, F: o, G: a, H: c } = this;
    return [t, e, r, s, i, o, a, c];
  }
  // prettier-ignore
  set(t, e, r, s, i, o, a, c) {
    this.A = t | 0, this.B = e | 0, this.C = r | 0, this.D = s | 0, this.E = i | 0, this.F = o | 0, this.G = a | 0, this.H = c | 0;
  }
  process(t, e) {
    for (let d = 0; d < 16; d++, e += 4)
      _e[d] = t.getUint32(e, !1);
    for (let d = 16; d < 64; d++) {
      const h = _e[d - 15], p = _e[d - 2], y = ue(h, 7) ^ ue(h, 18) ^ h >>> 3, f = ue(p, 17) ^ ue(p, 19) ^ p >>> 10;
      _e[d] = f + _e[d - 7] + y + _e[d - 16] | 0;
    }
    let { A: r, B: s, C: i, D: o, E: a, F: c, G: u, H: l } = this;
    for (let d = 0; d < 64; d++) {
      const h = ue(a, 6) ^ ue(a, 11) ^ ue(a, 25), p = l + h + cd(a, c, u) + ld[d] + _e[d] | 0, f = (ue(r, 2) ^ ue(r, 13) ^ ue(r, 22)) + ud(r, s, i) | 0;
      l = u, u = c, c = a, a = o + p | 0, o = i, i = s, s = r, r = p + f | 0;
    }
    r = r + this.A | 0, s = s + this.B | 0, i = i + this.C | 0, o = o + this.D | 0, a = a + this.E | 0, c = c + this.F | 0, u = u + this.G | 0, l = l + this.H | 0, this.set(r, s, i, o, a, c, u, l);
  }
  roundClean() {
    _n(_e);
  }
  destroy() {
    this.set(0, 0, 0, 0, 0, 0, 0, 0), _n(this.buffer);
  }
}, dd = class extends fd {
  // We cannot use array here since array allows indexing by variable
  // which means optimizer/compiler cannot use registers.
  A = Pe[0] | 0;
  B = Pe[1] | 0;
  C = Pe[2] | 0;
  D = Pe[3] | 0;
  E = Pe[4] | 0;
  F = Pe[5] | 0;
  G = Pe[6] | 0;
  H = Pe[7] | 0;
  constructor() {
    super(32);
  }
};
const Tt = /* @__PURE__ */ Tu(
  () => new dd(),
  /* @__PURE__ */ ad(1)
);
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const Co = /* @__PURE__ */ BigInt(0), Wi = /* @__PURE__ */ BigInt(1);
function hs(n, t = "") {
  if (typeof n != "boolean") {
    const e = t && `"${t}" `;
    throw new Error(e + "expected boolean, got type=" + typeof n);
  }
  return n;
}
function vu(n) {
  if (typeof n == "bigint") {
    if (!Jr(n))
      throw new Error("positive bigint expected, got " + n);
  } else
    Ye(n);
  return n;
}
function _r(n) {
  const t = vu(n).toString(16);
  return t.length & 1 ? "0" + t : t;
}
function Iu(n) {
  if (typeof n != "string")
    throw new Error("hex string expected, got " + typeof n);
  return n === "" ? Co : BigInt("0x" + n);
}
function Ne(n) {
  return Iu(Ws(n));
}
function Au(n) {
  return Iu(Ws(hd(q(n)).reverse()));
}
function $r(n, t) {
  Ye(t), n = vu(n);
  const e = ds(n.toString(16).padStart(t * 2, "0"));
  if (e.length !== t)
    throw new Error("number too large");
  return e;
}
function ku(n, t) {
  return $r(n, t).reverse();
}
function xr(n, t) {
  if (n.length !== t.length)
    return !1;
  let e = 0;
  for (let r = 0; r < n.length; r++)
    e |= n[r] ^ t[r];
  return e === 0;
}
function hd(n) {
  return Uint8Array.from(n);
}
function pd(n) {
  return Uint8Array.from(n, (t, e) => {
    const r = t.charCodeAt(0);
    if (t.length !== 1 || r > 127)
      throw new Error(`string contains non-ASCII character "${n[e]}" with code ${r} at position ${e}`);
    return r;
  });
}
const Jr = (n) => typeof n == "bigint" && Co <= n;
function gd(n, t, e) {
  return Jr(n) && Jr(t) && Jr(e) && t <= n && n < e;
}
function Bu(n, t, e, r) {
  if (!gd(t, e, r))
    throw new Error("expected valid " + n + ": " + e + " <= n < " + r + ", got " + t);
}
function yd(n) {
  let t;
  for (t = 0; n > Co; n >>= Wi, t += 1)
    ;
  return t;
}
const Lo = (n) => (Wi << BigInt(n)) - Wi;
function wd(n, t, e) {
  if (Ye(n, "hashLen"), Ye(t, "qByteLen"), typeof e != "function")
    throw new Error("hmacFn must be a function");
  const r = (g) => new Uint8Array(g), s = Uint8Array.of(), i = Uint8Array.of(0), o = Uint8Array.of(1), a = 1e3;
  let c = r(n), u = r(n), l = 0;
  const d = () => {
    c.fill(1), u.fill(0), l = 0;
  }, h = (...g) => e(u, re(c, ...g)), p = (g = s) => {
    u = h(i, g), c = h(), g.length !== 0 && (u = h(o, g), c = h());
  }, y = () => {
    if (l++ >= a)
      throw new Error("drbg: tried max amount of iterations");
    let g = 0;
    const m = [];
    for (; g < t; ) {
      c = h();
      const S = c.slice();
      m.push(S), g += c.length;
    }
    return re(...m);
  };
  return (g, m) => {
    d(), p(g);
    let S;
    for (; !(S = m(y())); )
      p();
    return d(), S;
  };
}
function Po(n, t = {}, e = {}) {
  if (!n || typeof n != "object")
    throw new Error("expected valid options object");
  function r(i, o, a) {
    const c = n[i];
    if (a && c === void 0)
      return;
    const u = typeof c;
    if (u !== o || c === null)
      throw new Error(`param "${i}" is invalid: expected ${o}, got ${u}`);
  }
  const s = (i, o) => Object.entries(i).forEach(([a, c]) => r(a, c, o));
  s(t, !1), s(e, !0);
}
function Ba(n) {
  const t = /* @__PURE__ */ new WeakMap();
  return (e, ...r) => {
    const s = t.get(e);
    if (s !== void 0)
      return s;
    const i = n(e, ...r);
    return t.set(e, i), i;
  };
}
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const $t = /* @__PURE__ */ BigInt(0), vt = /* @__PURE__ */ BigInt(1), fn = /* @__PURE__ */ BigInt(2), Ou = /* @__PURE__ */ BigInt(3), $u = /* @__PURE__ */ BigInt(4), Uu = /* @__PURE__ */ BigInt(5), md = /* @__PURE__ */ BigInt(7), Nu = /* @__PURE__ */ BigInt(8), bd = /* @__PURE__ */ BigInt(9), Ru = /* @__PURE__ */ BigInt(16);
function Qt(n, t) {
  const e = n % t;
  return e >= $t ? e : t + e;
}
function Kt(n, t, e) {
  let r = n;
  for (; t-- > $t; )
    r *= r, r %= e;
  return r;
}
function Oa(n, t) {
  if (n === $t)
    throw new Error("invert: expected non-zero number");
  if (t <= $t)
    throw new Error("invert: expected positive modulus, got " + t);
  let e = Qt(n, t), r = t, s = $t, i = vt;
  for (; e !== $t; ) {
    const a = r / e, c = r % e, u = s - i * a;
    r = e, e = c, s = i, i = u;
  }
  if (r !== vt)
    throw new Error("invert: does not exist");
  return Qt(s, t);
}
function _o(n, t, e) {
  if (!n.eql(n.sqr(t), e))
    throw new Error("Cannot find square root");
}
function Cu(n, t) {
  const e = (n.ORDER + vt) / $u, r = n.pow(t, e);
  return _o(n, r, t), r;
}
function Ed(n, t) {
  const e = (n.ORDER - Uu) / Nu, r = n.mul(t, fn), s = n.pow(r, e), i = n.mul(t, s), o = n.mul(n.mul(i, fn), s), a = n.mul(i, n.sub(o, n.ONE));
  return _o(n, a, t), a;
}
function xd(n) {
  const t = Gs(n), e = Lu(n), r = e(t, t.neg(t.ONE)), s = e(t, r), i = e(t, t.neg(r)), o = (n + md) / Ru;
  return (a, c) => {
    let u = a.pow(c, o), l = a.mul(u, r);
    const d = a.mul(u, s), h = a.mul(u, i), p = a.eql(a.sqr(l), c), y = a.eql(a.sqr(d), c);
    u = a.cmov(u, l, p), l = a.cmov(h, d, y);
    const f = a.eql(a.sqr(l), c), g = a.cmov(u, l, f);
    return _o(a, g, c), g;
  };
}
function Lu(n) {
  if (n < Ou)
    throw new Error("sqrt is not defined for small field");
  let t = n - vt, e = 0;
  for (; t % fn === $t; )
    t /= fn, e++;
  let r = fn;
  const s = Gs(n);
  for (; $a(s, r) === 1; )
    if (r++ > 1e3)
      throw new Error("Cannot find square root: probably non-prime P");
  if (e === 1)
    return Cu;
  let i = s.pow(r, t);
  const o = (t + vt) / fn;
  return function(c, u) {
    if (c.is0(u))
      return u;
    if ($a(c, u) !== 1)
      throw new Error("Cannot find square root");
    let l = e, d = c.mul(c.ONE, i), h = c.pow(u, t), p = c.pow(u, o);
    for (; !c.eql(h, c.ONE); ) {
      if (c.is0(h))
        return c.ZERO;
      let y = 1, f = c.sqr(h);
      for (; !c.eql(f, c.ONE); )
        if (y++, f = c.sqr(f), y === l)
          throw new Error("Cannot find square root");
      const g = vt << BigInt(l - y - 1), m = c.pow(d, g);
      l = y, d = c.sqr(m), h = c.mul(h, d), p = c.mul(p, m);
    }
    return p;
  };
}
function Td(n) {
  return n % $u === Ou ? Cu : n % Nu === Uu ? Ed : n % Ru === bd ? xd(n) : Lu(n);
}
const Sd = [
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
function vd(n) {
  const t = {
    ORDER: "bigint",
    BYTES: "number",
    BITS: "number"
  }, e = Sd.reduce((r, s) => (r[s] = "function", r), t);
  return Po(n, e), n;
}
function Id(n, t, e) {
  if (e < $t)
    throw new Error("invalid exponent, negatives unsupported");
  if (e === $t)
    return n.ONE;
  if (e === vt)
    return t;
  let r = n.ONE, s = t;
  for (; e > $t; )
    e & vt && (r = n.mul(r, s)), s = n.sqr(s), e >>= vt;
  return r;
}
function Pu(n, t, e = !1) {
  const r = new Array(t.length).fill(e ? n.ZERO : void 0), s = t.reduce((o, a, c) => n.is0(a) ? o : (r[c] = o, n.mul(o, a)), n.ONE), i = n.inv(s);
  return t.reduceRight((o, a, c) => n.is0(a) ? o : (r[c] = n.mul(o, r[c]), n.mul(o, a)), i), r;
}
function $a(n, t) {
  const e = (n.ORDER - vt) / fn, r = n.pow(t, e), s = n.eql(r, n.ONE), i = n.eql(r, n.ZERO), o = n.eql(r, n.neg(n.ONE));
  if (!s && !i && !o)
    throw new Error("invalid Legendre symbol result");
  return s ? 1 : i ? 0 : -1;
}
function Ad(n, t) {
  t !== void 0 && Ye(t);
  const e = t !== void 0 ? t : n.toString(2).length, r = Math.ceil(e / 8);
  return { nBitLength: e, nByteLength: r };
}
let kd = class {
  ORDER;
  BITS;
  BYTES;
  isLE;
  ZERO = $t;
  ONE = vt;
  _lengths;
  _sqrt;
  // cached sqrt
  _mod;
  constructor(t, e = {}) {
    if (t <= $t)
      throw new Error("invalid field: expected ORDER > 0, got " + t);
    let r;
    this.isLE = !1, e != null && typeof e == "object" && (typeof e.BITS == "number" && (r = e.BITS), typeof e.sqrt == "function" && (this.sqrt = e.sqrt), typeof e.isLE == "boolean" && (this.isLE = e.isLE), e.allowedLengths && (this._lengths = e.allowedLengths?.slice()), typeof e.modFromBytes == "boolean" && (this._mod = e.modFromBytes));
    const { nBitLength: s, nByteLength: i } = Ad(t, r);
    if (i > 2048)
      throw new Error("invalid field: expected ORDER of <= 2048 bytes");
    this.ORDER = t, this.BITS = s, this.BYTES = i, this._sqrt = void 0, Object.preventExtensions(this);
  }
  create(t) {
    return Qt(t, this.ORDER);
  }
  isValid(t) {
    if (typeof t != "bigint")
      throw new Error("invalid field element: expected bigint, got " + typeof t);
    return $t <= t && t < this.ORDER;
  }
  is0(t) {
    return t === $t;
  }
  // is valid and invertible
  isValidNot0(t) {
    return !this.is0(t) && this.isValid(t);
  }
  isOdd(t) {
    return (t & vt) === vt;
  }
  neg(t) {
    return Qt(-t, this.ORDER);
  }
  eql(t, e) {
    return t === e;
  }
  sqr(t) {
    return Qt(t * t, this.ORDER);
  }
  add(t, e) {
    return Qt(t + e, this.ORDER);
  }
  sub(t, e) {
    return Qt(t - e, this.ORDER);
  }
  mul(t, e) {
    return Qt(t * e, this.ORDER);
  }
  pow(t, e) {
    return Id(this, t, e);
  }
  div(t, e) {
    return Qt(t * Oa(e, this.ORDER), this.ORDER);
  }
  // Same as above, but doesn't normalize
  sqrN(t) {
    return t * t;
  }
  addN(t, e) {
    return t + e;
  }
  subN(t, e) {
    return t - e;
  }
  mulN(t, e) {
    return t * e;
  }
  inv(t) {
    return Oa(t, this.ORDER);
  }
  sqrt(t) {
    return this._sqrt || (this._sqrt = Td(this.ORDER)), this._sqrt(this, t);
  }
  toBytes(t) {
    return this.isLE ? ku(t, this.BYTES) : $r(t, this.BYTES);
  }
  fromBytes(t, e = !1) {
    q(t);
    const { _lengths: r, BYTES: s, isLE: i, ORDER: o, _mod: a } = this;
    if (r) {
      if (!r.includes(t.length) || t.length > s)
        throw new Error("Field.fromBytes: expected " + r + " bytes, got " + t.length);
      const u = new Uint8Array(s);
      u.set(t, i ? 0 : u.length - t.length), t = u;
    }
    if (t.length !== s)
      throw new Error("Field.fromBytes: expected " + s + " bytes, got " + t.length);
    let c = i ? Au(t) : Ne(t);
    if (a && (c = Qt(c, o)), !e && !this.isValid(c))
      throw new Error("invalid field element: outside of range 0..ORDER");
    return c;
  }
  // TODO: we don't need it here, move out to separate fn
  invertBatch(t) {
    return Pu(this, t);
  }
  // We can't move this out because Fp6, Fp12 implement it
  // and it's unclear what to return in there.
  cmov(t, e, r) {
    return r ? e : t;
  }
};
function Gs(n, t = {}) {
  return new kd(n, t);
}
function _u(n) {
  if (typeof n != "bigint")
    throw new Error("field order must be bigint");
  const t = n.toString(2).length;
  return Math.ceil(t / 8);
}
function Du(n) {
  const t = _u(n);
  return t + Math.ceil(t / 2);
}
function Vu(n, t, e = !1) {
  q(n);
  const r = n.length, s = _u(t), i = Du(t);
  if (r < 16 || r < i || r > 1024)
    throw new Error("expected " + i + "-1024 bytes of input, got " + r);
  const o = e ? Au(n) : Ne(n), a = Qt(o, t - vt) + vt;
  return e ? ku(a, s) : $r(a, s);
}
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const Dn = /* @__PURE__ */ BigInt(0), dn = /* @__PURE__ */ BigInt(1);
function ps(n, t) {
  const e = t.negate();
  return n ? e : t;
}
function Ua(n, t) {
  const e = Pu(n.Fp, t.map((r) => r.Z));
  return t.map((r, s) => n.fromAffine(r.toAffine(e[s])));
}
function Mu(n, t) {
  if (!Number.isSafeInteger(n) || n <= 0 || n > t)
    throw new Error("invalid window size, expected [1.." + t + "], got W=" + n);
}
function gi(n, t) {
  Mu(n, t);
  const e = Math.ceil(t / n) + 1, r = 2 ** (n - 1), s = 2 ** n, i = Lo(n), o = BigInt(n);
  return { windows: e, windowSize: r, mask: i, maxNumber: s, shiftBy: o };
}
function Na(n, t, e) {
  const { windowSize: r, mask: s, maxNumber: i, shiftBy: o } = e;
  let a = Number(n & s), c = n >> o;
  a > r && (a -= i, c += dn);
  const u = t * r, l = u + Math.abs(a) - 1, d = a === 0, h = a < 0, p = t % 2 !== 0;
  return { nextN: c, offset: l, isZero: d, isNeg: h, isNegF: p, offsetF: u };
}
const yi = /* @__PURE__ */ new WeakMap(), Hu = /* @__PURE__ */ new WeakMap();
function wi(n) {
  return Hu.get(n) || 1;
}
function Ra(n) {
  if (n !== Dn)
    throw new Error("invalid wNAF");
}
let Bd = class {
  BASE;
  ZERO;
  Fn;
  bits;
  // Parametrized with a given Point class (not individual point)
  constructor(t, e) {
    this.BASE = t.BASE, this.ZERO = t.ZERO, this.Fn = t.Fn, this.bits = e;
  }
  // non-const time multiplication ladder
  _unsafeLadder(t, e, r = this.ZERO) {
    let s = t;
    for (; e > Dn; )
      e & dn && (r = r.add(s)), s = s.double(), e >>= dn;
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
  precomputeWindow(t, e) {
    const { windows: r, windowSize: s } = gi(e, this.bits), i = [];
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
  wNAF(t, e, r) {
    if (!this.Fn.isValid(r))
      throw new Error("invalid scalar");
    let s = this.ZERO, i = this.BASE;
    const o = gi(t, this.bits);
    for (let a = 0; a < o.windows; a++) {
      const { nextN: c, offset: u, isZero: l, isNeg: d, isNegF: h, offsetF: p } = Na(r, a, o);
      r = c, l ? i = i.add(ps(h, e[p])) : s = s.add(ps(d, e[u]));
    }
    return Ra(r), { p: s, f: i };
  }
  /**
   * Implements ec unsafe (non const-time) multiplication using precomputed tables and w-ary non-adjacent form.
   * @param acc accumulator point to add result of multiplication
   * @returns point
   */
  wNAFUnsafe(t, e, r, s = this.ZERO) {
    const i = gi(t, this.bits);
    for (let o = 0; o < i.windows && r !== Dn; o++) {
      const { nextN: a, offset: c, isZero: u, isNeg: l } = Na(r, o, i);
      if (r = a, !u) {
        const d = e[c];
        s = s.add(l ? d.negate() : d);
      }
    }
    return Ra(r), s;
  }
  getPrecomputes(t, e, r) {
    let s = yi.get(e);
    return s || (s = this.precomputeWindow(e, t), t !== 1 && (typeof r == "function" && (s = r(s)), yi.set(e, s))), s;
  }
  cached(t, e, r) {
    const s = wi(t);
    return this.wNAF(s, this.getPrecomputes(s, t, r), e);
  }
  unsafe(t, e, r, s) {
    const i = wi(t);
    return i === 1 ? this._unsafeLadder(t, e, s) : this.wNAFUnsafe(i, this.getPrecomputes(i, t, r), e, s);
  }
  // We calculate precomputes for elliptic curve point multiplication
  // using windowed method. This specifies window size and
  // stores precomputed values. Usually only base point would be precomputed.
  createCache(t, e) {
    Mu(e, this.bits), Hu.set(t, e), yi.delete(t);
  }
  hasCache(t) {
    return wi(t) !== 1;
  }
};
function Od(n, t, e, r) {
  let s = t, i = n.ZERO, o = n.ZERO;
  for (; e > Dn || r > Dn; )
    e & dn && (i = i.add(s)), r & dn && (o = o.add(s)), s = s.double(), e >>= dn, r >>= dn;
  return { p1: i, p2: o };
}
function Ca(n, t, e) {
  if (t) {
    if (t.ORDER !== n)
      throw new Error("Field.ORDER must match order: Fp == p, Fn == n");
    return vd(t), t;
  } else
    return Gs(n, { isLE: e });
}
function $d(n, t, e = {}, r) {
  if (r === void 0 && (r = n === "edwards"), !t || typeof t != "object")
    throw new Error(`expected valid ${n} CURVE object`);
  for (const c of ["p", "n", "h"]) {
    const u = t[c];
    if (!(typeof u == "bigint" && u > Dn))
      throw new Error(`CURVE.${c} must be positive bigint`);
  }
  const s = Ca(t.p, e.Fp, r), i = Ca(t.n, e.Fn, r), a = ["Gx", "Gy", "a", "b"];
  for (const c of a)
    if (!s.isValid(t[c]))
      throw new Error(`CURVE.${c} must be valid field element of CURVE.Fp`);
  return t = Object.freeze(Object.assign({}, t)), { CURVE: t, Fp: s, Fn: i };
}
function Fu(n, t) {
  return function(r) {
    const s = n(r);
    return { secretKey: s, publicKey: t(s) };
  };
}
let zu = class {
  oHash;
  iHash;
  blockLen;
  outputLen;
  finished = !1;
  destroyed = !1;
  constructor(t, e) {
    if (Eu(t), q(e, void 0, "key"), this.iHash = t.create(), typeof this.iHash.update != "function")
      throw new Error("Expected instance of class which extends utils.Hash");
    this.blockLen = this.iHash.blockLen, this.outputLen = this.iHash.outputLen;
    const r = this.blockLen, s = new Uint8Array(r);
    s.set(e.length > r ? t.create().update(e).digest() : e);
    for (let i = 0; i < s.length; i++)
      s[i] ^= 54;
    this.iHash.update(s), this.oHash = t.create();
    for (let i = 0; i < s.length; i++)
      s[i] ^= 106;
    this.oHash.update(s), _n(s);
  }
  update(t) {
    return fs(this), this.iHash.update(t), this;
  }
  digestInto(t) {
    fs(this), q(t, this.outputLen, "output"), this.finished = !0, this.iHash.digestInto(t), this.oHash.update(t), this.oHash.digestInto(t), this.destroy();
  }
  digest() {
    const t = new Uint8Array(this.oHash.outputLen);
    return this.digestInto(t), t;
  }
  _cloneInto(t) {
    t ||= Object.create(Object.getPrototypeOf(this), {});
    const { oHash: e, iHash: r, finished: s, destroyed: i, blockLen: o, outputLen: a } = this;
    return t = t, t.finished = s, t.destroyed = i, t.blockLen = o, t.outputLen = a, t.oHash = e._cloneInto(t.oHash), t.iHash = r._cloneInto(t.iHash), t;
  }
  clone() {
    return this._cloneInto();
  }
  destroy() {
    this.destroyed = !0, this.oHash.destroy(), this.iHash.destroy();
  }
};
const Ku = (n, t, e) => new zu(n, t).update(e).digest();
Ku.create = (n, t) => new zu(n, t);
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const La = (n, t) => (n + (n >= 0 ? t : -t) / ju) / t;
function Ud(n, t, e) {
  const [[r, s], [i, o]] = t, a = La(o * n, e), c = La(-s * n, e);
  let u = n - a * r - c * i, l = -a * s - c * o;
  const d = u < Be, h = l < Be;
  d && (u = -u), h && (l = -l);
  const p = Lo(Math.ceil(yd(e) / 2)) + $n;
  if (u < Be || u >= p || l < Be || l >= p)
    throw new Error("splitScalar (endomorphism): failed, k=" + n);
  return { k1neg: d, k1: u, k2neg: h, k2: l };
}
function Gi(n) {
  if (!["compact", "recovered", "der"].includes(n))
    throw new Error('Signature format must be "compact", "recovered", or "der"');
  return n;
}
function mi(n, t) {
  const e = {};
  for (let r of Object.keys(t))
    e[r] = n[r] === void 0 ? t[r] : n[r];
  return hs(e.lowS, "lowS"), hs(e.prehash, "prehash"), e.format !== void 0 && Gi(e.format), e;
}
let Nd = class extends Error {
  constructor(t = "") {
    super(t);
  }
};
const He = {
  // asn.1 DER encoding utils
  Err: Nd,
  // Basic building block is TLV (Tag-Length-Value)
  _tlv: {
    encode: (n, t) => {
      const { Err: e } = He;
      if (n < 0 || n > 256)
        throw new e("tlv.encode: wrong tag");
      if (t.length & 1)
        throw new e("tlv.encode: unpadded data");
      const r = t.length / 2, s = _r(r);
      if (s.length / 2 & 128)
        throw new e("tlv.encode: long form length too big");
      const i = r > 127 ? _r(s.length / 2 | 128) : "";
      return _r(n) + i + s + t;
    },
    // v - value, l - left bytes (unparsed)
    decode(n, t) {
      const { Err: e } = He;
      let r = 0;
      if (n < 0 || n > 256)
        throw new e("tlv.encode: wrong tag");
      if (t.length < 2 || t[r++] !== n)
        throw new e("tlv.decode: wrong tlv");
      const s = t[r++], i = !!(s & 128);
      let o = 0;
      if (!i)
        o = s;
      else {
        const c = s & 127;
        if (!c)
          throw new e("tlv.decode(long): indefinite length not supported");
        if (c > 4)
          throw new e("tlv.decode(long): byte length is too big");
        const u = t.subarray(r, r + c);
        if (u.length !== c)
          throw new e("tlv.decode: length bytes not complete");
        if (u[0] === 0)
          throw new e("tlv.decode(long): zero leftmost byte");
        for (const l of u)
          o = o << 8 | l;
        if (r += c, o < 128)
          throw new e("tlv.decode(long): not minimal encoding");
      }
      const a = t.subarray(r, r + o);
      if (a.length !== o)
        throw new e("tlv.decode: wrong value length");
      return { v: a, l: t.subarray(r + o) };
    }
  },
  // https://crypto.stackexchange.com/a/57734 Leftmost bit of first byte is 'negative' flag,
  // since we always use positive integers here. It must always be empty:
  // - add zero byte if exists
  // - if next byte doesn't have a flag, leading zero is not allowed (minimal encoding)
  _int: {
    encode(n) {
      const { Err: t } = He;
      if (n < Be)
        throw new t("integer: negative integers are not allowed");
      let e = _r(n);
      if (Number.parseInt(e[0], 16) & 8 && (e = "00" + e), e.length & 1)
        throw new t("unexpected DER parsing assertion: unpadded hex");
      return e;
    },
    decode(n) {
      const { Err: t } = He;
      if (n[0] & 128)
        throw new t("invalid signature integer: negative");
      if (n[0] === 0 && !(n[1] & 128))
        throw new t("invalid signature integer: unnecessary leading zero");
      return Ne(n);
    }
  },
  toSig(n) {
    const { Err: t, _int: e, _tlv: r } = He, s = q(n, void 0, "signature"), { v: i, l: o } = r.decode(48, s);
    if (o.length)
      throw new t("invalid signature: left bytes after parsing");
    const { v: a, l: c } = r.decode(2, i), { v: u, l } = r.decode(2, c);
    if (l.length)
      throw new t("invalid signature: left bytes after parsing");
    return { r: e.decode(a), s: e.decode(u) };
  },
  hexFromSig(n) {
    const { _tlv: t, _int: e } = He, r = t.encode(2, e.encode(n.r)), s = t.encode(2, e.encode(n.s)), i = r + s;
    return t.encode(48, i);
  }
}, Be = BigInt(0), $n = BigInt(1), ju = BigInt(2), Dr = BigInt(3), Rd = BigInt(4);
function Cd(n, t = {}) {
  const e = $d("weierstrass", n, t), { Fp: r, Fn: s } = e;
  let i = e.CURVE;
  const { h: o, n: a } = i;
  Po(t, {}, {
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
  const u = Gu(r, s);
  function l() {
    if (!r.isOdd)
      throw new Error("compression is not supported: Field does not have .isOdd()");
  }
  function d(D, v, x) {
    const { x: b, y: A } = v.toAffine(), O = r.toBytes(b);
    if (hs(x, "isCompressed"), x) {
      l();
      const U = !r.isOdd(A);
      return re(Wu(U), O);
    } else
      return re(Uint8Array.of(4), O, r.toBytes(A));
  }
  function h(D) {
    q(D, void 0, "Point");
    const { publicKey: v, publicKeyUncompressed: x } = u, b = D.length, A = D[0], O = D.subarray(1);
    if (b === v && (A === 2 || A === 3)) {
      const U = r.fromBytes(O);
      if (!r.isValid(U))
        throw new Error("bad point: is not on curve, wrong x");
      const $ = f(U);
      let B;
      try {
        B = r.sqrt($);
      } catch (j) {
        const H = j instanceof Error ? ": " + j.message : "";
        throw new Error("bad point: is not on curve, sqrt error" + H);
      }
      l();
      const N = r.isOdd(B);
      return (A & 1) === 1 !== N && (B = r.neg(B)), { x: U, y: B };
    } else if (b === x && A === 4) {
      const U = r.BYTES, $ = r.fromBytes(O.subarray(0, U)), B = r.fromBytes(O.subarray(U, U * 2));
      if (!g($, B))
        throw new Error("bad point: is not on curve");
      return { x: $, y: B };
    } else
      throw new Error(`bad point: got length ${b}, expected compressed=${v} or uncompressed=${x}`);
  }
  const p = t.toBytes || d, y = t.fromBytes || h;
  function f(D) {
    const v = r.sqr(D), x = r.mul(v, D);
    return r.add(r.add(x, r.mul(D, i.a)), i.b);
  }
  function g(D, v) {
    const x = r.sqr(v), b = f(D);
    return r.eql(x, b);
  }
  if (!g(i.Gx, i.Gy))
    throw new Error("bad curve params: generator point");
  const m = r.mul(r.pow(i.a, Dr), Rd), S = r.mul(r.sqr(i.b), BigInt(27));
  if (r.is0(r.add(m, S)))
    throw new Error("bad curve params: a or b");
  function I(D, v, x = !1) {
    if (!r.isValid(v) || x && r.is0(v))
      throw new Error(`bad point coordinate ${D}`);
    return v;
  }
  function E(D) {
    if (!(D instanceof w))
      throw new Error("Weierstrass Point expected");
  }
  function C(D) {
    if (!c || !c.basises)
      throw new Error("no endo");
    return Ud(D, c.basises, s.ORDER);
  }
  const M = Ba((D, v) => {
    const { X: x, Y: b, Z: A } = D;
    if (r.eql(A, r.ONE))
      return { x, y: b };
    const O = D.is0();
    v == null && (v = O ? r.ONE : r.inv(A));
    const U = r.mul(x, v), $ = r.mul(b, v), B = r.mul(A, v);
    if (O)
      return { x: r.ZERO, y: r.ZERO };
    if (!r.eql(B, r.ONE))
      throw new Error("invZ was invalid");
    return { x: U, y: $ };
  }), X = Ba((D) => {
    if (D.is0()) {
      if (t.allowInfinityPoint && !r.is0(D.Y))
        return;
      throw new Error("bad point: ZERO");
    }
    const { x: v, y: x } = D.toAffine();
    if (!r.isValid(v) || !r.isValid(x))
      throw new Error("bad point: x or y not field elements");
    if (!g(v, x))
      throw new Error("bad point: equation left != right");
    if (!D.isTorsionFree())
      throw new Error("bad point: not in prime-order subgroup");
    return !0;
  });
  function tt(D, v, x, b, A) {
    return x = new w(r.mul(x.X, D), x.Y, x.Z), v = ps(b, v), x = ps(A, x), v.add(x);
  }
  class w {
    // base / generator point
    static BASE = new w(i.Gx, i.Gy, r.ONE);
    // zero / infinity / identity point
    static ZERO = new w(r.ZERO, r.ONE, r.ZERO);
    // 0, 1, 0
    // math field
    static Fp = r;
    // scalar field
    static Fn = s;
    X;
    Y;
    Z;
    /** Does NOT validate if the point is valid. Use `.assertValidity()`. */
    constructor(v, x, b) {
      this.X = I("x", v), this.Y = I("y", x, !0), this.Z = I("z", b), Object.freeze(this);
    }
    static CURVE() {
      return i;
    }
    /** Does NOT validate if the point is valid. Use `.assertValidity()`. */
    static fromAffine(v) {
      const { x, y: b } = v || {};
      if (!v || !r.isValid(x) || !r.isValid(b))
        throw new Error("invalid affine point");
      if (v instanceof w)
        throw new Error("projective point not allowed");
      return r.is0(x) && r.is0(b) ? w.ZERO : new w(x, b, r.ONE);
    }
    static fromBytes(v) {
      const x = w.fromAffine(y(q(v, void 0, "point")));
      return x.assertValidity(), x;
    }
    static fromHex(v) {
      return w.fromBytes(ds(v));
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
    precompute(v = 8, x = !0) {
      return Y.createCache(this, v), x || this.multiply(Dr), this;
    }
    // TODO: return `this`
    /** A point on curve is valid if it conforms to equation. */
    assertValidity() {
      X(this);
    }
    hasEvenY() {
      const { y: v } = this.toAffine();
      if (!r.isOdd)
        throw new Error("Field doesn't support isOdd");
      return !r.isOdd(v);
    }
    /** Compare one point to another. */
    equals(v) {
      E(v);
      const { X: x, Y: b, Z: A } = this, { X: O, Y: U, Z: $ } = v, B = r.eql(r.mul(x, $), r.mul(O, A)), N = r.eql(r.mul(b, $), r.mul(U, A));
      return B && N;
    }
    /** Flips point to one corresponding to (x, -y) in Affine coordinates. */
    negate() {
      return new w(this.X, r.neg(this.Y), this.Z);
    }
    // Renes-Costello-Batina exception-free doubling formula.
    // There is 30% faster Jacobian formula, but it is not complete.
    // https://eprint.iacr.org/2015/1060, algorithm 3
    // Cost: 8M + 3S + 3*a + 2*b3 + 15add.
    double() {
      const { a: v, b: x } = i, b = r.mul(x, Dr), { X: A, Y: O, Z: U } = this;
      let $ = r.ZERO, B = r.ZERO, N = r.ZERO, P = r.mul(A, A), j = r.mul(O, O), H = r.mul(U, U), T = r.mul(A, O);
      return T = r.add(T, T), N = r.mul(A, U), N = r.add(N, N), $ = r.mul(v, N), B = r.mul(b, H), B = r.add($, B), $ = r.sub(j, B), B = r.add(j, B), B = r.mul($, B), $ = r.mul(T, $), N = r.mul(b, N), H = r.mul(v, H), T = r.sub(P, H), T = r.mul(v, T), T = r.add(T, N), N = r.add(P, P), P = r.add(N, P), P = r.add(P, H), P = r.mul(P, T), B = r.add(B, P), H = r.mul(O, U), H = r.add(H, H), P = r.mul(H, T), $ = r.sub($, P), N = r.mul(H, j), N = r.add(N, N), N = r.add(N, N), new w($, B, N);
    }
    // Renes-Costello-Batina exception-free addition formula.
    // There is 30% faster Jacobian formula, but it is not complete.
    // https://eprint.iacr.org/2015/1060, algorithm 1
    // Cost: 12M + 0S + 3*a + 3*b3 + 23add.
    add(v) {
      E(v);
      const { X: x, Y: b, Z: A } = this, { X: O, Y: U, Z: $ } = v;
      let B = r.ZERO, N = r.ZERO, P = r.ZERO;
      const j = i.a, H = r.mul(i.b, Dr);
      let T = r.mul(x, O), L = r.mul(b, U), W = r.mul(A, $), ut = r.add(x, b), z = r.add(O, U);
      ut = r.mul(ut, z), z = r.add(T, L), ut = r.sub(ut, z), z = r.add(x, A);
      let Q = r.add(O, $);
      return z = r.mul(z, Q), Q = r.add(T, W), z = r.sub(z, Q), Q = r.add(b, A), B = r.add(U, $), Q = r.mul(Q, B), B = r.add(L, W), Q = r.sub(Q, B), P = r.mul(j, z), B = r.mul(H, W), P = r.add(B, P), B = r.sub(L, P), P = r.add(L, P), N = r.mul(B, P), L = r.add(T, T), L = r.add(L, T), W = r.mul(j, W), z = r.mul(H, z), L = r.add(L, W), W = r.sub(T, W), W = r.mul(j, W), z = r.add(z, W), T = r.mul(L, z), N = r.add(N, T), T = r.mul(Q, z), B = r.mul(ut, B), B = r.sub(B, T), T = r.mul(ut, L), P = r.mul(Q, P), P = r.add(P, T), new w(B, N, P);
    }
    subtract(v) {
      return this.add(v.negate());
    }
    is0() {
      return this.equals(w.ZERO);
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
    multiply(v) {
      const { endo: x } = t;
      if (!s.isValidNot0(v))
        throw new Error("invalid scalar: out of range");
      let b, A;
      const O = (U) => Y.cached(this, U, ($) => Ua(w, $));
      if (x) {
        const { k1neg: U, k1: $, k2neg: B, k2: N } = C(v), { p: P, f: j } = O($), { p: H, f: T } = O(N);
        A = j.add(T), b = tt(x.beta, P, H, U, B);
      } else {
        const { p: U, f: $ } = O(v);
        b = U, A = $;
      }
      return Ua(w, [b, A])[0];
    }
    /**
     * Non-constant-time multiplication. Uses double-and-add algorithm.
     * It's faster, but should only be used when you don't care about
     * an exposed secret key e.g. sig verification, which works over *public* keys.
     */
    multiplyUnsafe(v) {
      const { endo: x } = t, b = this;
      if (!s.isValid(v))
        throw new Error("invalid scalar: out of range");
      if (v === Be || b.is0())
        return w.ZERO;
      if (v === $n)
        return b;
      if (Y.hasCache(this))
        return this.multiply(v);
      if (x) {
        const { k1neg: A, k1: O, k2neg: U, k2: $ } = C(v), { p1: B, p2: N } = Od(w, b, O, $);
        return tt(x.beta, B, N, A, U);
      } else
        return Y.unsafe(b, v);
    }
    /**
     * Converts Projective point to affine (x, y) coordinates.
     * @param invertedZ Z^-1 (inverted zero) - optional, precomputation is useful for invertBatch
     */
    toAffine(v) {
      return M(this, v);
    }
    /**
     * Checks whether Point is free of torsion elements (is in prime subgroup).
     * Always torsion-free for cofactor=1 curves.
     */
    isTorsionFree() {
      const { isTorsionFree: v } = t;
      return o === $n ? !0 : v ? v(w, this) : Y.unsafe(this, a).is0();
    }
    clearCofactor() {
      const { clearCofactor: v } = t;
      return o === $n ? this : v ? v(w, this) : this.multiplyUnsafe(o);
    }
    isSmallOrder() {
      return this.multiplyUnsafe(o).is0();
    }
    toBytes(v = !0) {
      return hs(v, "isCompressed"), this.assertValidity(), p(w, this, v);
    }
    toHex(v = !0) {
      return Ws(this.toBytes(v));
    }
    toString() {
      return `<Point ${this.is0() ? "ZERO" : this.toHex()}>`;
    }
  }
  const J = s.BITS, Y = new Bd(w, t.endo ? Math.ceil(J / 2) : J);
  return w.BASE.precompute(8), w;
}
function Wu(n) {
  return Uint8Array.of(n ? 2 : 3);
}
function Gu(n, t) {
  return {
    secretKey: t.BYTES,
    publicKey: 1 + n.BYTES,
    publicKeyUncompressed: 1 + 2 * n.BYTES,
    publicKeyHasPrefix: !0,
    signature: 2 * t.BYTES
  };
}
function Ld(n, t = {}) {
  const { Fn: e } = n, r = t.randomBytes || Or, s = Object.assign(Gu(n.Fp, e), { seed: Du(e.ORDER) });
  function i(p) {
    try {
      const y = e.fromBytes(p);
      return e.isValidNot0(y);
    } catch {
      return !1;
    }
  }
  function o(p, y) {
    const { publicKey: f, publicKeyUncompressed: g } = s;
    try {
      const m = p.length;
      return y === !0 && m !== f || y === !1 && m !== g ? !1 : !!n.fromBytes(p);
    } catch {
      return !1;
    }
  }
  function a(p = r(s.seed)) {
    return Vu(q(p, s.seed, "seed"), e.ORDER);
  }
  function c(p, y = !0) {
    return n.BASE.multiply(e.fromBytes(p)).toBytes(y);
  }
  function u(p) {
    const { secretKey: y, publicKey: f, publicKeyUncompressed: g } = s;
    if (!Ro(p) || "_lengths" in e && e._lengths || y === f)
      return;
    const m = q(p, void 0, "key").length;
    return m === f || m === g;
  }
  function l(p, y, f = !0) {
    if (u(p) === !0)
      throw new Error("first arg must be private key");
    if (u(y) === !1)
      throw new Error("second arg must be public key");
    const g = e.fromBytes(p);
    return n.fromBytes(y).multiply(g).toBytes(f);
  }
  const d = {
    isValidSecretKey: i,
    isValidPublicKey: o,
    randomSecretKey: a
  }, h = Fu(a, c);
  return Object.freeze({ getPublicKey: c, getSharedSecret: l, keygen: h, Point: n, utils: d, lengths: s });
}
function Pd(n, t, e = {}) {
  Eu(t), Po(e, {}, {
    hmac: "function",
    lowS: "boolean",
    randomBytes: "function",
    bits2int: "function",
    bits2int_modN: "function"
  }), e = Object.assign({}, e);
  const r = e.randomBytes || Or, s = e.hmac || ((x, b) => Ku(t, x, b)), { Fp: i, Fn: o } = n, { ORDER: a, BITS: c } = o, { keygen: u, getPublicKey: l, getSharedSecret: d, utils: h, lengths: p } = Ld(n, e), y = {
    prehash: !0,
    lowS: typeof e.lowS == "boolean" ? e.lowS : !0,
    format: "compact",
    extraEntropy: !1
  }, f = a * ju < i.ORDER;
  function g(x) {
    const b = a >> $n;
    return x > b;
  }
  function m(x, b) {
    if (!o.isValidNot0(b))
      throw new Error(`invalid signature ${x}: out of range 1..Point.Fn.ORDER`);
    return b;
  }
  function S() {
    if (f)
      throw new Error('"recovered" sig type is not supported for cofactor >2 curves');
  }
  function I(x, b) {
    Gi(b);
    const A = p.signature, O = b === "compact" ? A : b === "recovered" ? A + 1 : void 0;
    return q(x, O);
  }
  class E {
    r;
    s;
    recovery;
    constructor(b, A, O) {
      if (this.r = m("r", b), this.s = m("s", A), O != null) {
        if (S(), ![0, 1, 2, 3].includes(O))
          throw new Error("invalid recovery id");
        this.recovery = O;
      }
      Object.freeze(this);
    }
    static fromBytes(b, A = y.format) {
      I(b, A);
      let O;
      if (A === "der") {
        const { r: N, s: P } = He.toSig(q(b));
        return new E(N, P);
      }
      A === "recovered" && (O = b[0], A = "compact", b = b.subarray(1));
      const U = p.signature / 2, $ = b.subarray(0, U), B = b.subarray(U, U * 2);
      return new E(o.fromBytes($), o.fromBytes(B), O);
    }
    static fromHex(b, A) {
      return this.fromBytes(ds(b), A);
    }
    assertRecovery() {
      const { recovery: b } = this;
      if (b == null)
        throw new Error("invalid recovery id: must be present");
      return b;
    }
    addRecoveryBit(b) {
      return new E(this.r, this.s, b);
    }
    recoverPublicKey(b) {
      const { r: A, s: O } = this, U = this.assertRecovery(), $ = U === 2 || U === 3 ? A + a : A;
      if (!i.isValid($))
        throw new Error("invalid recovery id: sig.r+curve.n != R.x");
      const B = i.toBytes($), N = n.fromBytes(re(Wu((U & 1) === 0), B)), P = o.inv($), j = M(q(b, void 0, "msgHash")), H = o.create(-j * P), T = o.create(O * P), L = n.BASE.multiplyUnsafe(H).add(N.multiplyUnsafe(T));
      if (L.is0())
        throw new Error("invalid recovery: point at infinify");
      return L.assertValidity(), L;
    }
    // Signatures should be low-s, to prevent malleability.
    hasHighS() {
      return g(this.s);
    }
    toBytes(b = y.format) {
      if (Gi(b), b === "der")
        return ds(He.hexFromSig(this));
      const { r: A, s: O } = this, U = o.toBytes(A), $ = o.toBytes(O);
      return b === "recovered" ? (S(), re(Uint8Array.of(this.assertRecovery()), U, $)) : re(U, $);
    }
    toHex(b) {
      return Ws(this.toBytes(b));
    }
  }
  const C = e.bits2int || function(b) {
    if (b.length > 8192)
      throw new Error("input is too large");
    const A = Ne(b), O = b.length * 8 - c;
    return O > 0 ? A >> BigInt(O) : A;
  }, M = e.bits2int_modN || function(b) {
    return o.create(C(b));
  }, X = Lo(c);
  function tt(x) {
    return Bu("num < 2^" + c, x, Be, X), o.toBytes(x);
  }
  function w(x, b) {
    return q(x, void 0, "message"), b ? q(t(x), void 0, "prehashed message") : x;
  }
  function J(x, b, A) {
    const { lowS: O, prehash: U, extraEntropy: $ } = mi(A, y);
    x = w(x, U);
    const B = M(x), N = o.fromBytes(b);
    if (!o.isValidNot0(N))
      throw new Error("invalid private key");
    const P = [tt(N), tt(B)];
    if ($ != null && $ !== !1) {
      const L = $ === !0 ? r(p.secretKey) : $;
      P.push(q(L, void 0, "extraEntropy"));
    }
    const j = re(...P), H = B;
    function T(L) {
      const W = C(L);
      if (!o.isValidNot0(W))
        return;
      const ut = o.inv(W), z = n.BASE.multiply(W).toAffine(), Q = o.create(z.x);
      if (Q === Be)
        return;
      const Ee = o.create(ut * o.create(H + Q * N));
      if (Ee === Be)
        return;
      let er = (z.x === Q ? 0 : 2) | Number(z.y & $n), nr = Ee;
      return O && g(Ee) && (nr = o.neg(Ee), er ^= 1), new E(Q, nr, f ? void 0 : er);
    }
    return { seed: j, k2sig: T };
  }
  function Y(x, b, A = {}) {
    const { seed: O, k2sig: U } = J(x, b, A);
    return wd(t.outputLen, o.BYTES, s)(O, U).toBytes(A.format);
  }
  function D(x, b, A, O = {}) {
    const { lowS: U, prehash: $, format: B } = mi(O, y);
    if (A = q(A, void 0, "publicKey"), b = w(b, $), !Ro(x)) {
      const N = x instanceof E ? ", use sig.toBytes()" : "";
      throw new Error("verify expects Uint8Array signature" + N);
    }
    I(x, B);
    try {
      const N = E.fromBytes(x, B), P = n.fromBytes(A);
      if (U && N.hasHighS())
        return !1;
      const { r: j, s: H } = N, T = M(b), L = o.inv(H), W = o.create(T * L), ut = o.create(j * L), z = n.BASE.multiplyUnsafe(W).add(P.multiplyUnsafe(ut));
      return z.is0() ? !1 : o.create(z.x) === j;
    } catch {
      return !1;
    }
  }
  function v(x, b, A = {}) {
    const { prehash: O } = mi(A, y);
    return b = w(b, O), E.fromBytes(x, "recovered").recoverPublicKey(b).toBytes();
  }
  return Object.freeze({
    keygen: u,
    getPublicKey: l,
    getSharedSecret: d,
    utils: h,
    lengths: p,
    Point: n,
    sign: Y,
    verify: D,
    recoverPublicKey: v,
    Signature: E,
    hash: t
  });
}
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const qs = {
  p: BigInt("0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffefffffc2f"),
  n: BigInt("0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141"),
  h: BigInt(1),
  a: BigInt(0),
  b: BigInt(7),
  Gx: BigInt("0x79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798"),
  Gy: BigInt("0x483ada7726a3c4655da4fbfc0e1108a8fd17b448a68554199c47d08ffb10d4b8")
}, _d = {
  beta: BigInt("0x7ae96a2b657c07106e64479eac3434e99cf0497512f58995c1396c28719501ee"),
  basises: [
    [BigInt("0x3086d221a7d46bcde86c90e49284eb15"), -BigInt("0xe4437ed6010e88286f547fa90abfe4c3")],
    [BigInt("0x114ca50f7a8e2f3f657c1108d9d44cfd8"), BigInt("0x3086d221a7d46bcde86c90e49284eb15")]
  ]
}, Dd = /* @__PURE__ */ BigInt(0), qi = /* @__PURE__ */ BigInt(2);
function Vd(n) {
  const t = qs.p, e = BigInt(3), r = BigInt(6), s = BigInt(11), i = BigInt(22), o = BigInt(23), a = BigInt(44), c = BigInt(88), u = n * n * n % t, l = u * u * n % t, d = Kt(l, e, t) * l % t, h = Kt(d, e, t) * l % t, p = Kt(h, qi, t) * u % t, y = Kt(p, s, t) * p % t, f = Kt(y, i, t) * y % t, g = Kt(f, a, t) * f % t, m = Kt(g, c, t) * g % t, S = Kt(m, a, t) * f % t, I = Kt(S, e, t) * l % t, E = Kt(I, o, t) * y % t, C = Kt(E, r, t) * u % t, M = Kt(C, qi, t);
  if (!gs.eql(gs.sqr(M), n))
    throw new Error("Cannot find square root");
  return M;
}
const gs = Gs(qs.p, { sqrt: Vd }), vn = /* @__PURE__ */ Cd(qs, {
  Fp: gs,
  endo: _d
}), ze = /* @__PURE__ */ Pd(vn, Tt), Pa = {};
function ys(n, ...t) {
  let e = Pa[n];
  if (e === void 0) {
    const r = Tt(pd(n));
    e = re(r, r), Pa[n] = e;
  }
  return Tt(re(e, ...t));
}
const Do = (n) => n.toBytes(!0).slice(1), Vo = (n) => n % qi === Dd;
function Yi(n) {
  const { Fn: t, BASE: e } = vn, r = t.fromBytes(n), s = e.multiply(r);
  return { scalar: Vo(s.y) ? r : t.neg(r), bytes: Do(s) };
}
function qu(n) {
  const t = gs;
  if (!t.isValidNot0(n))
    throw new Error("invalid x: Fail if x ≥ p");
  const e = t.create(n * n), r = t.create(e * n + BigInt(7));
  let s = t.sqrt(r);
  Vo(s) || (s = t.neg(s));
  const i = vn.fromAffine({ x: n, y: s });
  return i.assertValidity(), i;
}
const dr = Ne;
function Yu(...n) {
  return vn.Fn.create(dr(ys("BIP0340/challenge", ...n)));
}
function _a(n) {
  return Yi(n).bytes;
}
function Md(n, t, e = Or(32)) {
  const { Fn: r } = vn, s = q(n, void 0, "message"), { bytes: i, scalar: o } = Yi(t), a = q(e, 32, "auxRand"), c = r.toBytes(o ^ dr(ys("BIP0340/aux", a))), u = ys("BIP0340/nonce", c, i, s), { bytes: l, scalar: d } = Yi(u), h = Yu(l, i, s), p = new Uint8Array(64);
  if (p.set(l, 0), p.set(r.toBytes(r.create(d + h * o)), 32), !Zu(p, s, i))
    throw new Error("sign: Invalid signature produced");
  return p;
}
function Zu(n, t, e) {
  const { Fp: r, Fn: s, BASE: i } = vn, o = q(n, 64, "signature"), a = q(t, void 0, "message"), c = q(e, 32, "publicKey");
  try {
    const u = qu(dr(c)), l = dr(o.subarray(0, 32));
    if (!r.isValidNot0(l))
      return !1;
    const d = dr(o.subarray(32, 64));
    if (!s.isValidNot0(d))
      return !1;
    const h = Yu(s.toBytes(l), Do(u), a), p = i.multiplyUnsafe(d).add(u.multiplyUnsafe(s.neg(h))), { x: y, y: f } = p.toAffine();
    return !(p.is0() || !Vo(f) || y !== l);
  } catch {
    return !1;
  }
}
const Re = /* @__PURE__ */ (() => {
  const e = (r = Or(48)) => Vu(r, qs.n);
  return {
    keygen: Fu(e, _a),
    getPublicKey: _a,
    sign: Md,
    verify: Zu,
    Point: vn,
    utils: {
      randomSecretKey: e,
      taggedHash: ys,
      lift_x: qu,
      pointToBytes: Do
    },
    lengths: {
      secretKey: 32,
      publicKey: 32,
      publicKeyHasPrefix: !1,
      signature: 64,
      seed: 48
    }
  };
})(), Hd = /* @__PURE__ */ Uint8Array.from([
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
]), Xu = Uint8Array.from(new Array(16).fill(0).map((n, t) => t)), Fd = Xu.map((n) => (9 * n + 5) % 16), Qu = /* @__PURE__ */ (() => {
  const e = [[Xu], [Fd]];
  for (let r = 0; r < 4; r++)
    for (let s of e)
      s.push(s[r].map((i) => Hd[i]));
  return e;
})(), Ju = Qu[0], tl = Qu[1], el = /* @__PURE__ */ [
  [11, 14, 15, 12, 5, 8, 7, 9, 11, 13, 14, 15, 6, 7, 9, 8],
  [12, 13, 11, 15, 6, 9, 9, 7, 12, 15, 11, 13, 7, 8, 7, 7],
  [13, 15, 14, 11, 7, 7, 6, 8, 13, 14, 13, 12, 5, 5, 6, 9],
  [14, 11, 12, 14, 8, 6, 5, 5, 15, 12, 15, 14, 9, 9, 8, 6],
  [15, 12, 13, 13, 9, 5, 8, 6, 14, 11, 12, 11, 8, 6, 5, 5]
].map((n) => Uint8Array.from(n)), zd = /* @__PURE__ */ Ju.map((n, t) => n.map((e) => el[t][e])), Kd = /* @__PURE__ */ tl.map((n, t) => n.map((e) => el[t][e])), jd = /* @__PURE__ */ Uint32Array.from([
  0,
  1518500249,
  1859775393,
  2400959708,
  2840853838
]), Wd = /* @__PURE__ */ Uint32Array.from([
  1352829926,
  1548603684,
  1836072691,
  2053994217,
  0
]);
function Da(n, t, e, r) {
  return n === 0 ? t ^ e ^ r : n === 1 ? t & e | ~t & r : n === 2 ? (t | ~e) ^ r : n === 3 ? t & r | e & ~r : t ^ (e | ~r);
}
const Vr = /* @__PURE__ */ new Uint32Array(16);
class Gd extends Su {
  h0 = 1732584193;
  h1 = -271733879;
  h2 = -1732584194;
  h3 = 271733878;
  h4 = -1009589776;
  constructor() {
    super(64, 20, 8, !0);
  }
  get() {
    const { h0: t, h1: e, h2: r, h3: s, h4: i } = this;
    return [t, e, r, s, i];
  }
  set(t, e, r, s, i) {
    this.h0 = t | 0, this.h1 = e | 0, this.h2 = r | 0, this.h3 = s | 0, this.h4 = i | 0;
  }
  process(t, e) {
    for (let p = 0; p < 16; p++, e += 4)
      Vr[p] = t.getUint32(e, !0);
    let r = this.h0 | 0, s = r, i = this.h1 | 0, o = i, a = this.h2 | 0, c = a, u = this.h3 | 0, l = u, d = this.h4 | 0, h = d;
    for (let p = 0; p < 5; p++) {
      const y = 4 - p, f = jd[p], g = Wd[p], m = Ju[p], S = tl[p], I = zd[p], E = Kd[p];
      for (let C = 0; C < 16; C++) {
        const M = Pr(r + Da(p, i, a, u) + Vr[m[C]] + f, I[C]) + d | 0;
        r = d, d = u, u = Pr(a, 10) | 0, a = i, i = M;
      }
      for (let C = 0; C < 16; C++) {
        const M = Pr(s + Da(y, o, c, l) + Vr[S[C]] + g, E[C]) + h | 0;
        s = h, h = l, l = Pr(c, 10) | 0, c = o, o = M;
      }
    }
    this.set(this.h1 + a + l | 0, this.h2 + u + h | 0, this.h3 + d + s | 0, this.h4 + r + o | 0, this.h0 + i + c | 0);
  }
  roundClean() {
    _n(Vr);
  }
  destroy() {
    this.destroyed = !0, _n(this.buffer), this.set(0, 0, 0, 0, 0);
  }
}
const qd = /* @__PURE__ */ Tu(() => new Gd());
/*! scure-base - MIT License (c) 2022 Paul Miller (paulmillr.com) */
function Vn(n) {
  return n instanceof Uint8Array || ArrayBuffer.isView(n) && n.constructor.name === "Uint8Array";
}
function nl(n) {
  if (!Vn(n))
    throw new Error("Uint8Array expected");
}
function rl(n, t) {
  return Array.isArray(t) ? t.length === 0 ? !0 : n ? t.every((e) => typeof e == "string") : t.every((e) => Number.isSafeInteger(e)) : !1;
}
function Mo(n) {
  if (typeof n != "function")
    throw new Error("function expected");
  return !0;
}
function Ze(n, t) {
  if (typeof t != "string")
    throw new Error(`${n}: string expected`);
  return !0;
}
function Qn(n) {
  if (!Number.isSafeInteger(n))
    throw new Error(`invalid integer: ${n}`);
}
function ws(n) {
  if (!Array.isArray(n))
    throw new Error("array expected");
}
function ms(n, t) {
  if (!rl(!0, t))
    throw new Error(`${n}: array of strings expected`);
}
function Ho(n, t) {
  if (!rl(!1, t))
    throw new Error(`${n}: array of numbers expected`);
}
// @__NO_SIDE_EFFECTS__
function Ur(...n) {
  const t = (i) => i, e = (i, o) => (a) => i(o(a)), r = n.map((i) => i.encode).reduceRight(e, t), s = n.map((i) => i.decode).reduce(e, t);
  return { encode: r, decode: s };
}
// @__NO_SIDE_EFFECTS__
function Ys(n) {
  const t = typeof n == "string" ? n.split("") : n, e = t.length;
  ms("alphabet", t);
  const r = new Map(t.map((s, i) => [s, i]));
  return {
    encode: (s) => (ws(s), s.map((i) => {
      if (!Number.isSafeInteger(i) || i < 0 || i >= e)
        throw new Error(`alphabet.encode: digit index outside alphabet "${i}". Allowed: ${n}`);
      return t[i];
    })),
    decode: (s) => (ws(s), s.map((i) => {
      Ze("alphabet.decode", i);
      const o = r.get(i);
      if (o === void 0)
        throw new Error(`Unknown letter: "${i}". Allowed: ${n}`);
      return o;
    }))
  };
}
// @__NO_SIDE_EFFECTS__
function Zs(n = "") {
  return Ze("join", n), {
    encode: (t) => (ms("join.decode", t), t.join(n)),
    decode: (t) => (Ze("join.decode", t), t.split(n))
  };
}
// @__NO_SIDE_EFFECTS__
function Yd(n, t = "=") {
  return Qn(n), Ze("padding", t), {
    encode(e) {
      for (ms("padding.encode", e); e.length * n % 8; )
        e.push(t);
      return e;
    },
    decode(e) {
      ms("padding.decode", e);
      let r = e.length;
      if (r * n % 8)
        throw new Error("padding: invalid, string should have whole number of bytes");
      for (; r > 0 && e[r - 1] === t; r--)
        if ((r - 1) * n % 8 === 0)
          throw new Error("padding: invalid, string has too much padding");
      return e.slice(0, r);
    }
  };
}
// @__NO_SIDE_EFFECTS__
function Zd(n) {
  return Mo(n), { encode: (t) => t, decode: (t) => n(t) };
}
function Va(n, t, e) {
  if (t < 2)
    throw new Error(`convertRadix: invalid from=${t}, base cannot be less than 2`);
  if (e < 2)
    throw new Error(`convertRadix: invalid to=${e}, base cannot be less than 2`);
  if (ws(n), !n.length)
    return [];
  let r = 0;
  const s = [], i = Array.from(n, (a) => {
    if (Qn(a), a < 0 || a >= t)
      throw new Error(`invalid integer: ${a}`);
    return a;
  }), o = i.length;
  for (; ; ) {
    let a = 0, c = !0;
    for (let u = r; u < o; u++) {
      const l = i[u], d = t * a, h = d + l;
      if (!Number.isSafeInteger(h) || d / t !== a || h - l !== d)
        throw new Error("convertRadix: carry overflow");
      const p = h / e;
      a = h % e;
      const y = Math.floor(p);
      if (i[u] = y, !Number.isSafeInteger(y) || y * e + a !== h)
        throw new Error("convertRadix: carry overflow");
      if (c)
        y ? c = !1 : r = u;
      else continue;
    }
    if (s.push(a), c)
      break;
  }
  for (let a = 0; a < n.length - 1 && n[a] === 0; a++)
    s.push(0);
  return s.reverse();
}
const sl = (n, t) => t === 0 ? n : sl(t, n % t), bs = /* @__NO_SIDE_EFFECTS__ */ (n, t) => n + (t - sl(n, t)), ts = /* @__PURE__ */ (() => {
  let n = [];
  for (let t = 0; t < 40; t++)
    n.push(2 ** t);
  return n;
})();
function Zi(n, t, e, r) {
  if (ws(n), t <= 0 || t > 32)
    throw new Error(`convertRadix2: wrong from=${t}`);
  if (e <= 0 || e > 32)
    throw new Error(`convertRadix2: wrong to=${e}`);
  if (/* @__PURE__ */ bs(t, e) > 32)
    throw new Error(`convertRadix2: carry overflow from=${t} to=${e} carryBits=${/* @__PURE__ */ bs(t, e)}`);
  let s = 0, i = 0;
  const o = ts[t], a = ts[e] - 1, c = [];
  for (const u of n) {
    if (Qn(u), u >= o)
      throw new Error(`convertRadix2: invalid data word=${u} from=${t}`);
    if (s = s << t | u, i + t > 32)
      throw new Error(`convertRadix2: carry overflow pos=${i} from=${t}`);
    for (i += t; i >= e; i -= e)
      c.push((s >> i - e & a) >>> 0);
    const l = ts[i];
    if (l === void 0)
      throw new Error("invalid carry");
    s &= l - 1;
  }
  if (s = s << e - i & a, !r && i >= t)
    throw new Error("Excess padding");
  if (!r && s > 0)
    throw new Error(`Non-zero padding: ${s}`);
  return r && i > 0 && c.push(s >>> 0), c;
}
// @__NO_SIDE_EFFECTS__
function Xd(n) {
  Qn(n);
  const t = 2 ** 8;
  return {
    encode: (e) => {
      if (!Vn(e))
        throw new Error("radix.encode input should be Uint8Array");
      return Va(Array.from(e), t, n);
    },
    decode: (e) => (Ho("radix.decode", e), Uint8Array.from(Va(e, n, t)))
  };
}
// @__NO_SIDE_EFFECTS__
function Fo(n, t = !1) {
  if (Qn(n), n <= 0 || n > 32)
    throw new Error("radix2: bits should be in (0..32]");
  if (/* @__PURE__ */ bs(8, n) > 32 || /* @__PURE__ */ bs(n, 8) > 32)
    throw new Error("radix2: carry overflow");
  return {
    encode: (e) => {
      if (!Vn(e))
        throw new Error("radix2.encode input should be Uint8Array");
      return Zi(Array.from(e), 8, n, !t);
    },
    decode: (e) => (Ho("radix2.decode", e), Uint8Array.from(Zi(e, n, 8, t)))
  };
}
function Ma(n) {
  return Mo(n), function(...t) {
    try {
      return n.apply(null, t);
    } catch {
    }
  };
}
function Qd(n, t) {
  return Qn(n), Mo(t), {
    encode(e) {
      if (!Vn(e))
        throw new Error("checksum.encode: input should be Uint8Array");
      const r = t(e).slice(0, n), s = new Uint8Array(e.length + n);
      return s.set(e), s.set(r, e.length), s;
    },
    decode(e) {
      if (!Vn(e))
        throw new Error("checksum.decode: input should be Uint8Array");
      const r = e.slice(0, -n), s = e.slice(-n), i = t(r).slice(0, n);
      for (let o = 0; o < n; o++)
        if (i[o] !== s[o])
          throw new Error("Invalid checksum");
      return r;
    }
  };
}
const Jd = typeof Uint8Array.from([]).toBase64 == "function" && typeof Uint8Array.fromBase64 == "function", th = (n, t) => {
  Ze("base64", n);
  const e = /^[A-Za-z0-9=+/]+$/, r = "base64";
  if (n.length > 0 && !e.test(n))
    throw new Error("invalid base64");
  return Uint8Array.fromBase64(n, { alphabet: r, lastChunkHandling: "strict" });
}, xt = Jd ? {
  encode(n) {
    return nl(n), n.toBase64();
  },
  decode(n) {
    return th(n);
  }
} : /* @__PURE__ */ Ur(/* @__PURE__ */ Fo(6), /* @__PURE__ */ Ys("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"), /* @__PURE__ */ Yd(6), /* @__PURE__ */ Zs("")), eh = /* @__NO_SIDE_EFFECTS__ */ (n) => /* @__PURE__ */ Ur(/* @__PURE__ */ Xd(58), /* @__PURE__ */ Ys(n), /* @__PURE__ */ Zs("")), Xi = /* @__PURE__ */ eh("123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"), nh = (n) => /* @__PURE__ */ Ur(Qd(4, (t) => n(n(t))), Xi), Qi = /* @__PURE__ */ Ur(/* @__PURE__ */ Ys("qpzry9x8gf2tvdw0s3jn54khce6mua7l"), /* @__PURE__ */ Zs("")), Ha = [996825010, 642813549, 513874426, 1027748829, 705979059];
function rr(n) {
  const t = n >> 25;
  let e = (n & 33554431) << 5;
  for (let r = 0; r < Ha.length; r++)
    (t >> r & 1) === 1 && (e ^= Ha[r]);
  return e;
}
function Fa(n, t, e = 1) {
  const r = n.length;
  let s = 1;
  for (let i = 0; i < r; i++) {
    const o = n.charCodeAt(i);
    if (o < 33 || o > 126)
      throw new Error(`Invalid prefix (${n})`);
    s = rr(s) ^ o >> 5;
  }
  s = rr(s);
  for (let i = 0; i < r; i++)
    s = rr(s) ^ n.charCodeAt(i) & 31;
  for (let i of t)
    s = rr(s) ^ i;
  for (let i = 0; i < 6; i++)
    s = rr(s);
  return s ^= e, Qi.encode(Zi([s % ts[30]], 30, 5, !1));
}
// @__NO_SIDE_EFFECTS__
function il(n) {
  const t = n === "bech32" ? 1 : 734539939, e = /* @__PURE__ */ Fo(5), r = e.decode, s = e.encode, i = Ma(r);
  function o(d, h, p = 90) {
    Ze("bech32.encode prefix", d), Vn(h) && (h = Array.from(h)), Ho("bech32.encode", h);
    const y = d.length;
    if (y === 0)
      throw new TypeError(`Invalid prefix length ${y}`);
    const f = y + 7 + h.length;
    if (p !== !1 && f > p)
      throw new TypeError(`Length ${f} exceeds limit ${p}`);
    const g = d.toLowerCase(), m = Fa(g, h, t);
    return `${g}1${Qi.encode(h)}${m}`;
  }
  function a(d, h = 90) {
    Ze("bech32.decode input", d);
    const p = d.length;
    if (p < 8 || h !== !1 && p > h)
      throw new TypeError(`invalid string length: ${p} (${d}). Expected (8..${h})`);
    const y = d.toLowerCase();
    if (d !== y && d !== d.toUpperCase())
      throw new Error("String must be lowercase or uppercase");
    const f = y.lastIndexOf("1");
    if (f === 0 || f === -1)
      throw new Error('Letter "1" must be present between prefix and data only');
    const g = y.slice(0, f), m = y.slice(f + 1);
    if (m.length < 6)
      throw new Error("Data must be at least 6 characters long");
    const S = Qi.decode(m).slice(0, -6), I = Fa(g, S, t);
    if (!m.endsWith(I))
      throw new Error(`Invalid checksum in ${d}: expected "${I}"`);
    return { prefix: g, words: S };
  }
  const c = Ma(a);
  function u(d) {
    const { prefix: h, words: p } = a(d, !1);
    return { prefix: h, words: p, bytes: r(p) };
  }
  function l(d, h) {
    return o(d, s(h));
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
const Ji = /* @__PURE__ */ il("bech32"), An = /* @__PURE__ */ il("bech32m"), rh = {
  encode: (n) => new TextDecoder().decode(n),
  decode: (n) => new TextEncoder().encode(n)
}, sh = typeof Uint8Array.from([]).toHex == "function" && typeof Uint8Array.fromHex == "function", ih = {
  encode(n) {
    return nl(n), n.toHex();
  },
  decode(n) {
    return Ze("hex", n), Uint8Array.fromHex(n);
  }
}, k = sh ? ih : /* @__PURE__ */ Ur(/* @__PURE__ */ Fo(4), /* @__PURE__ */ Ys("0123456789abcdef"), /* @__PURE__ */ Zs(""), /* @__PURE__ */ Zd((n) => {
  if (typeof n != "string" || n.length % 2 !== 0)
    throw new TypeError(`hex.decode: expected string, got ${typeof n} with length ${n.length}`);
  return n.toLowerCase();
})), ct = /* @__PURE__ */ Uint8Array.of(), ol = /* @__PURE__ */ Uint8Array.of(0);
function Mn(n, t) {
  if (n.length !== t.length)
    return !1;
  for (let e = 0; e < n.length; e++)
    if (n[e] !== t[e])
      return !1;
  return !0;
}
function Yt(n) {
  return n instanceof Uint8Array || ArrayBuffer.isView(n) && n.constructor.name === "Uint8Array";
}
function oh(...n) {
  let t = 0;
  for (let r = 0; r < n.length; r++) {
    const s = n[r];
    if (!Yt(s))
      throw new Error("Uint8Array expected");
    t += s.length;
  }
  const e = new Uint8Array(t);
  for (let r = 0, s = 0; r < n.length; r++) {
    const i = n[r];
    e.set(i, s), s += i.length;
  }
  return e;
}
const al = (n) => new DataView(n.buffer, n.byteOffset, n.byteLength);
function Nr(n) {
  return Object.prototype.toString.call(n) === "[object Object]";
}
function we(n) {
  return Number.isSafeInteger(n);
}
const zo = {
  equalBytes: Mn,
  isBytes: Yt,
  concatBytes: oh
}, cl = (n) => {
  if (n !== null && typeof n != "string" && !ie(n) && !Yt(n) && !we(n))
    throw new Error(`lengthCoder: expected null | number | Uint8Array | CoderType, got ${n} (${typeof n})`);
  return {
    encodeStream(t, e) {
      if (n === null)
        return;
      if (ie(n))
        return n.encodeStream(t, e);
      let r;
      if (typeof n == "number" ? r = n : typeof n == "string" && (r = Ue.resolve(t.stack, n)), typeof r == "bigint" && (r = Number(r)), r === void 0 || r !== e)
        throw t.err(`Wrong length: ${r} len=${n} exp=${e} (${typeof e})`);
    },
    decodeStream(t) {
      let e;
      if (ie(n) ? e = Number(n.decodeStream(t)) : typeof n == "number" ? e = n : typeof n == "string" && (e = Ue.resolve(t.stack, n)), typeof e == "bigint" && (e = Number(e)), typeof e != "number")
        throw t.err(`Wrong length: ${e}`);
      return e;
    }
  };
}, wt = {
  BITS: 32,
  FULL_MASK: -1 >>> 0,
  // 1<<32 will overflow
  len: (n) => Math.ceil(n / 32),
  create: (n) => new Uint32Array(wt.len(n)),
  clean: (n) => n.fill(0),
  debug: (n) => Array.from(n).map((t) => (t >>> 0).toString(2).padStart(32, "0")),
  checkLen: (n, t) => {
    if (wt.len(t) !== n.length)
      throw new Error(`wrong length=${n.length}. Expected: ${wt.len(t)}`);
  },
  chunkLen: (n, t, e) => {
    if (t < 0)
      throw new Error(`wrong pos=${t}`);
    if (t + e > n)
      throw new Error(`wrong range=${t}/${e} of ${n}`);
  },
  set: (n, t, e, r = !0) => !r && (n[t] & e) !== 0 ? !1 : (n[t] |= e, !0),
  pos: (n, t) => ({
    chunk: Math.floor((n + t) / 32),
    mask: 1 << 32 - (n + t) % 32 - 1
  }),
  indices: (n, t, e = !1) => {
    wt.checkLen(n, t);
    const { FULL_MASK: r, BITS: s } = wt, i = s - t % s, o = i ? r >>> i << i : r, a = [];
    for (let c = 0; c < n.length; c++) {
      let u = n[c];
      if (e && (u = ~u), c === n.length - 1 && (u &= o), u !== 0)
        for (let l = 0; l < s; l++) {
          const d = 1 << s - l - 1;
          u & d && a.push(c * s + l);
        }
    }
    return a;
  },
  range: (n) => {
    const t = [];
    let e;
    for (const r of n)
      e === void 0 || r !== e.pos + e.length ? t.push(e = { pos: r, length: 1 }) : e.length += 1;
    return t;
  },
  rangeDebug: (n, t, e = !1) => `[${wt.range(wt.indices(n, t, e)).map((r) => `(${r.pos}/${r.length})`).join(", ")}]`,
  setRange: (n, t, e, r, s = !0) => {
    wt.chunkLen(t, e, r);
    const { FULL_MASK: i, BITS: o } = wt, a = e % o ? Math.floor(e / o) : void 0, c = e + r, u = c % o ? Math.floor(c / o) : void 0;
    if (a !== void 0 && a === u)
      return wt.set(n, a, i >>> o - r << o - r - e, s);
    if (a !== void 0 && !wt.set(n, a, i >>> e % o, s))
      return !1;
    const l = a !== void 0 ? a + 1 : e / o, d = u !== void 0 ? u : c / o;
    for (let h = l; h < d; h++)
      if (!wt.set(n, h, i, s))
        return !1;
    return !(u !== void 0 && a !== u && !wt.set(n, u, i << o - c % o, s));
  }
}, Ue = {
  /**
   * Internal method for handling stack of paths (debug, errors, dynamic fields via path)
   * This is looks ugly (callback), but allows us to force stack cleaning by construction (.pop always after function).
   * Also, this makes impossible:
   * - pushing field when stack is empty
   * - pushing field inside of field (real bug)
   * NOTE: we don't want to do '.pop' on error!
   */
  pushObj: (n, t, e) => {
    const r = { obj: t };
    n.push(r), e((s, i) => {
      r.field = s, i(), r.field = void 0;
    }), n.pop();
  },
  path: (n) => {
    const t = [];
    for (const e of n)
      e.field !== void 0 && t.push(e.field);
    return t.join("/");
  },
  err: (n, t, e) => {
    const r = new Error(`${n}(${Ue.path(t)}): ${typeof e == "string" ? e : e.message}`);
    return e instanceof Error && e.stack && (r.stack = e.stack), r;
  },
  resolve: (n, t) => {
    const e = t.split("/"), r = n.map((o) => o.obj);
    let s = 0;
    for (; s < e.length && e[s] === ".."; s++)
      r.pop();
    let i = r.pop();
    for (; s < e.length; s++) {
      if (!i || i[e[s]] === void 0)
        return;
      i = i[e[s]];
    }
    return i;
  }
};
class Ko {
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
  constructor(t, e = {}, r = [], s = void 0, i = 0) {
    this.data = t, this.opts = e, this.stack = r, this.parent = s, this.parentOffset = i, this.view = al(t);
  }
  /** Internal method for pointers. */
  _enablePointers() {
    if (this.parent)
      return this.parent._enablePointers();
    this.bs || (this.bs = wt.create(this.data.length), wt.setRange(this.bs, this.data.length, 0, this.pos, this.opts.allowMultipleReads));
  }
  markBytesBS(t, e) {
    return this.parent ? this.parent.markBytesBS(this.parentOffset + t, e) : !e || !this.bs ? !0 : wt.setRange(this.bs, this.data.length, t, e, !1);
  }
  markBytes(t) {
    const e = this.pos;
    this.pos += t;
    const r = this.markBytesBS(e, t);
    if (!this.opts.allowMultipleReads && !r)
      throw this.err(`multiple read pos=${this.pos} len=${t}`);
    return r;
  }
  pushObj(t, e) {
    return Ue.pushObj(this.stack, t, e);
  }
  readView(t, e) {
    if (!Number.isFinite(t))
      throw this.err(`readView: wrong length=${t}`);
    if (this.pos + t > this.data.length)
      throw this.err("readView: Unexpected end of buffer");
    const r = e(this.view, this.pos);
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
        throw this.err(`${this.bitPos} bits left after unpack: ${k.encode(this.data.slice(this.pos))}`);
      if (this.bs && !this.parent) {
        const t = wt.indices(this.bs, this.data.length, !0);
        if (t.length) {
          const e = wt.range(t).map(({ pos: r, length: s }) => `(${r}/${s})[${k.encode(this.data.subarray(r, r + s))}]`).join(", ");
          throw this.err(`unread byte ranges: ${e} (total=${this.data.length})`);
        } else
          return;
      }
      if (!this.isEnd())
        throw this.err(`${this.leftBytes} bytes ${this.bitPos} bits left after unpack: ${k.encode(this.data.slice(this.pos))}`);
    }
  }
  // User methods
  err(t) {
    return Ue.err("Reader", this.stack, t);
  }
  offsetReader(t) {
    if (t > this.data.length)
      throw this.err("offsetReader: Unexpected end of buffer");
    return new Ko(this.absBytes(t), this.opts, this.stack, this, t);
  }
  bytes(t, e = !1) {
    if (this.bitPos)
      throw this.err("readBytes: bitPos not empty");
    if (!Number.isFinite(t))
      throw this.err(`readBytes: wrong length=${t}`);
    if (this.pos + t > this.data.length)
      throw this.err("readBytes: Unexpected end of buffer");
    const r = this.data.subarray(this.pos, this.pos + t);
    return e || this.markBytes(t), r;
  }
  byte(t = !1) {
    if (this.bitPos)
      throw this.err("readByte: bitPos not empty");
    if (this.pos + 1 > this.data.length)
      throw this.err("readBytes: Unexpected end of buffer");
    const e = this.data[this.pos];
    return t || this.markBytes(1), e;
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
    let e = 0;
    for (; t; ) {
      this.bitPos || (this.bitBuf = this.byte(), this.bitPos = 8);
      const r = Math.min(t, this.bitPos);
      this.bitPos -= r, e = e << r | this.bitBuf >> this.bitPos & 2 ** r - 1, this.bitBuf &= 2 ** this.bitPos - 1, t -= r;
    }
    return e >>> 0;
  }
  find(t, e = this.pos) {
    if (!Yt(t))
      throw this.err(`find: needle is not bytes! ${t}`);
    if (this.bitPos)
      throw this.err("findByte: bitPos not empty");
    if (!t.length)
      throw this.err("find: needle is empty");
    for (let r = e; (r = this.data.indexOf(t[0], r)) !== -1; r++) {
      if (r === -1 || this.data.length - r < t.length)
        return;
      if (Mn(t, this.data.subarray(r, r + t.length)))
        return r;
    }
  }
}
class ah {
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
    this.stack = t, this.view = al(this.viewBuf);
  }
  pushObj(t, e) {
    return Ue.pushObj(this.stack, t, e);
  }
  writeView(t, e) {
    if (this.finished)
      throw this.err("buffer: finished");
    if (!we(t) || t > 8)
      throw new Error(`wrong writeView length=${t}`);
    e(this.view), this.bytes(this.viewBuf.slice(0, t)), this.viewBuf.fill(0);
  }
  // User methods
  err(t) {
    if (this.finished)
      throw this.err("buffer: finished");
    return Ue.err("Reader", this.stack, t);
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
    const e = this.buffers.concat(this.ptrs.map((i) => i.buffer)), r = e.map((i) => i.length).reduce((i, o) => i + o, 0), s = new Uint8Array(r);
    for (let i = 0, o = 0; i < e.length; i++) {
      const a = e[i];
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
  bits(t, e) {
    if (e > 32)
      throw this.err("writeBits: cannot write more than 32 bits in single call");
    if (t >= 2 ** e)
      throw this.err(`writeBits: value (${t}) >= 2**bits (${e})`);
    for (; e; ) {
      const r = Math.min(e, 8 - this.bitPos);
      this.bitBuf = this.bitBuf << r | t >> e - r, this.bitPos += r, e -= r, t &= 2 ** e - 1, this.bitPos === 8 && (this.bitPos = 0, this.buffers.push(new Uint8Array([this.bitBuf])), this.pos++);
    }
  }
}
const to = (n) => Uint8Array.from(n).reverse();
function ch(n, t, e) {
  if (e) {
    const r = 2n ** (t - 1n);
    if (n < -r || n >= r)
      throw new Error(`value out of signed bounds. Expected ${-r} <= ${n} < ${r}`);
  } else if (0n > n || n >= 2n ** t)
    throw new Error(`value out of unsigned bounds. Expected 0 <= ${n} < ${2n ** t}`);
}
function ul(n) {
  return {
    // NOTE: we cannot export validate here, since it is likely mistake.
    encodeStream: n.encodeStream,
    decodeStream: n.decodeStream,
    size: n.size,
    encode: (t) => {
      const e = new ah();
      return n.encodeStream(e, t), e.finish();
    },
    decode: (t, e = {}) => {
      const r = new Ko(t, e), s = n.decodeStream(r);
      return r.finish(), s;
    }
  };
}
function Rt(n, t) {
  if (!ie(n))
    throw new Error(`validate: invalid inner value ${n}`);
  if (typeof t != "function")
    throw new Error("validate: fn should be function");
  return ul({
    size: n.size,
    encodeStream: (e, r) => {
      let s;
      try {
        s = t(r);
      } catch (i) {
        throw e.err(i);
      }
      n.encodeStream(e, s);
    },
    decodeStream: (e) => {
      const r = n.decodeStream(e);
      try {
        return t(r);
      } catch (s) {
        throw e.err(s);
      }
    }
  });
}
const Ct = (n) => {
  const t = ul(n);
  return n.validate ? Rt(t, n.validate) : t;
}, Xs = (n) => Nr(n) && typeof n.decode == "function" && typeof n.encode == "function";
function ie(n) {
  return Nr(n) && Xs(n) && typeof n.encodeStream == "function" && typeof n.decodeStream == "function" && (n.size === void 0 || we(n.size));
}
function uh() {
  return {
    encode: (n) => {
      if (!Array.isArray(n))
        throw new Error("array expected");
      const t = {};
      for (const e of n) {
        if (!Array.isArray(e) || e.length !== 2)
          throw new Error("array of two elements expected");
        const r = e[0], s = e[1];
        if (t[r] !== void 0)
          throw new Error(`key(${r}) appears twice in struct`);
        t[r] = s;
      }
      return t;
    },
    decode: (n) => {
      if (!Nr(n))
        throw new Error(`expected plain object, got ${n}`);
      return Object.entries(n);
    }
  };
}
const lh = {
  encode: (n) => {
    if (typeof n != "bigint")
      throw new Error(`expected bigint, got ${typeof n}`);
    if (n > BigInt(Number.MAX_SAFE_INTEGER))
      throw new Error(`element bigger than MAX_SAFE_INTEGER=${n}`);
    return Number(n);
  },
  decode: (n) => {
    if (!we(n))
      throw new Error("element is not a safe integer");
    return BigInt(n);
  }
};
function fh(n) {
  if (!Nr(n))
    throw new Error("plain object expected");
  return {
    encode: (t) => {
      if (!we(t) || !(t in n))
        throw new Error(`wrong value ${t}`);
      return n[t];
    },
    decode: (t) => {
      if (typeof t != "string")
        throw new Error(`wrong value ${typeof t}`);
      return n[t];
    }
  };
}
function dh(n, t = !1) {
  if (!we(n))
    throw new Error(`decimal/precision: wrong value ${n}`);
  if (typeof t != "boolean")
    throw new Error(`decimal/round: expected boolean, got ${typeof t}`);
  const e = 10n ** BigInt(n);
  return {
    encode: (r) => {
      if (typeof r != "bigint")
        throw new Error(`expected bigint, got ${typeof r}`);
      let s = (r < 0n ? -r : r).toString(10), i = s.length - n;
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
      const o = r.slice(0, i), a = r.slice(i + 1).replace(/0+$/, ""), c = BigInt(o) * e;
      if (!t && a.length > n)
        throw new Error(`fractional part cannot be represented with this precision (num=${r}, prec=${n})`);
      const u = Math.min(a.length, n), l = BigInt(a.slice(0, u)) * 10n ** BigInt(n - u), d = c + l;
      return s ? -d : d;
    }
  };
}
function hh(n) {
  if (!Array.isArray(n))
    throw new Error(`expected array, got ${typeof n}`);
  for (const t of n)
    if (!Xs(t))
      throw new Error(`wrong base coder ${t}`);
  return {
    encode: (t) => {
      for (const e of n) {
        const r = e.encode(t);
        if (r !== void 0)
          return r;
      }
      throw new Error(`match/encode: cannot find match in ${t}`);
    },
    decode: (t) => {
      for (const e of n) {
        const r = e.decode(t);
        if (r !== void 0)
          return r;
      }
      throw new Error(`match/decode: cannot find match in ${t}`);
    }
  };
}
const ll = (n) => {
  if (!Xs(n))
    throw new Error("BaseCoder expected");
  return { encode: n.decode, decode: n.encode };
}, Qs = { dict: uh, numberBigint: lh, tsEnum: fh, decimal: dh, match: hh, reverse: ll }, jo = (n, t = !1, e = !1, r = !0) => {
  if (!we(n))
    throw new Error(`bigint/size: wrong value ${n}`);
  if (typeof t != "boolean")
    throw new Error(`bigint/le: expected boolean, got ${typeof t}`);
  if (typeof e != "boolean")
    throw new Error(`bigint/signed: expected boolean, got ${typeof e}`);
  if (typeof r != "boolean")
    throw new Error(`bigint/sized: expected boolean, got ${typeof r}`);
  const s = BigInt(n), i = 2n ** (8n * s - 1n);
  return Ct({
    size: r ? n : void 0,
    encodeStream: (o, a) => {
      e && a < 0 && (a = a | i);
      const c = [];
      for (let l = 0; l < n; l++)
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
      const a = o.bytes(r ? n : Math.min(n, o.leftBytes)), c = t ? a : to(a);
      let u = 0n;
      for (let l = 0; l < c.length; l++)
        u |= BigInt(c[l]) << 8n * BigInt(l);
      return e && u & i && (u = (u ^ i) - i), u;
    },
    validate: (o) => {
      if (typeof o != "bigint")
        throw new Error(`bigint: invalid value: ${o}`);
      return ch(o, 8n * s, !!e), o;
    }
  });
}, fl = /* @__PURE__ */ jo(32, !1), es = /* @__PURE__ */ jo(8, !0), ph = /* @__PURE__ */ jo(8, !0, !0), gh = (n, t) => Ct({
  size: n,
  encodeStream: (e, r) => e.writeView(n, (s) => t.write(s, r)),
  decodeStream: (e) => e.readView(n, t.read),
  validate: (e) => {
    if (typeof e != "number")
      throw new Error(`viewCoder: expected number, got ${typeof e}`);
    return t.validate && t.validate(e), e;
  }
}), Rr = (n, t, e) => {
  const r = n * 8, s = 2 ** (r - 1), i = (c) => {
    if (!we(c))
      throw new Error(`sintView: value is not safe integer: ${c}`);
    if (c < -s || c >= s)
      throw new Error(`sintView: value out of bounds. Expected ${-s} <= ${c} < ${s}`);
  }, o = 2 ** r, a = (c) => {
    if (!we(c))
      throw new Error(`uintView: value is not safe integer: ${c}`);
    if (0 > c || c >= o)
      throw new Error(`uintView: value out of bounds. Expected 0 <= ${c} < ${o}`);
  };
  return gh(n, {
    write: e.write,
    read: e.read,
    validate: t ? i : a
  });
}, et = /* @__PURE__ */ Rr(4, !1, {
  read: (n, t) => n.getUint32(t, !0),
  write: (n, t) => n.setUint32(0, t, !0)
}), yh = /* @__PURE__ */ Rr(4, !1, {
  read: (n, t) => n.getUint32(t, !1),
  write: (n, t) => n.setUint32(0, t, !1)
}), kn = /* @__PURE__ */ Rr(4, !0, {
  read: (n, t) => n.getInt32(t, !0),
  write: (n, t) => n.setInt32(0, t, !0)
}), za = /* @__PURE__ */ Rr(2, !1, {
  read: (n, t) => n.getUint16(t, !0),
  write: (n, t) => n.setUint16(0, t, !0)
}), Ke = /* @__PURE__ */ Rr(1, !1, {
  read: (n, t) => n.getUint8(t),
  write: (n, t) => n.setUint8(0, t)
}), at = (n, t = !1) => {
  if (typeof t != "boolean")
    throw new Error(`bytes/le: expected boolean, got ${typeof t}`);
  const e = cl(n), r = Yt(n);
  return Ct({
    size: typeof n == "number" ? n : void 0,
    encodeStream: (s, i) => {
      r || e.encodeStream(s, i.length), s.bytes(t ? to(i) : i), r && s.bytes(n);
    },
    decodeStream: (s) => {
      let i;
      if (r) {
        const o = s.find(n);
        if (!o)
          throw s.err("bytes: cannot find terminator");
        i = s.bytes(o - s.pos), s.bytes(n.length);
      } else
        i = s.bytes(n === null ? s.leftBytes : e.decodeStream(s));
      return t ? to(i) : i;
    },
    validate: (s) => {
      if (!Yt(s))
        throw new Error(`bytes: invalid value ${s}`);
      return s;
    }
  });
};
function wh(n, t) {
  if (!ie(t))
    throw new Error(`prefix: invalid inner value ${t}`);
  return Xe(at(n), ll(t));
}
const Wo = (n, t = !1) => Rt(Xe(at(n, t), rh), (e) => {
  if (typeof e != "string")
    throw new Error(`expected string, got ${typeof e}`);
  return e;
}), mh = (n, t = { isLE: !1, with0x: !1 }) => {
  let e = Xe(at(n, t.isLE), k);
  const r = t.with0x;
  if (typeof r != "boolean")
    throw new Error(`hex/with0x: expected boolean, got ${typeof r}`);
  return r && (e = Xe(e, {
    encode: (s) => `0x${s}`,
    decode: (s) => {
      if (!s.startsWith("0x"))
        throw new Error("hex(with0x=true).encode input should start with 0x");
      return s.slice(2);
    }
  })), e;
};
function Xe(n, t) {
  if (!ie(n))
    throw new Error(`apply: invalid inner value ${n}`);
  if (!Xs(t))
    throw new Error(`apply: invalid base value ${n}`);
  return Ct({
    size: n.size,
    encodeStream: (e, r) => {
      let s;
      try {
        s = t.decode(r);
      } catch (i) {
        throw e.err("" + i);
      }
      return n.encodeStream(e, s);
    },
    decodeStream: (e) => {
      const r = n.decodeStream(e);
      try {
        return t.encode(r);
      } catch (s) {
        throw e.err("" + s);
      }
    }
  });
}
const bh = (n, t = !1) => {
  if (!Yt(n))
    throw new Error(`flag/flagValue: expected Uint8Array, got ${typeof n}`);
  if (typeof t != "boolean")
    throw new Error(`flag/xor: expected boolean, got ${typeof t}`);
  return Ct({
    size: n.length,
    encodeStream: (e, r) => {
      !!r !== t && e.bytes(n);
    },
    decodeStream: (e) => {
      let r = e.leftBytes >= n.length;
      return r && (r = Mn(e.bytes(n.length, !0), n), r && e.bytes(n.length)), r !== t;
    },
    validate: (e) => {
      if (e !== void 0 && typeof e != "boolean")
        throw new Error(`flag: expected boolean value or undefined, got ${typeof e}`);
      return e;
    }
  });
};
function Eh(n, t, e) {
  if (!ie(t))
    throw new Error(`flagged: invalid inner value ${t}`);
  return Ct({
    encodeStream: (r, s) => {
      Ue.resolve(r.stack, n) && t.encodeStream(r, s);
    },
    decodeStream: (r) => {
      let s = !1;
      if (s = !!Ue.resolve(r.stack, n), s)
        return t.decodeStream(r);
    }
  });
}
function Go(n, t, e = !0) {
  if (!ie(n))
    throw new Error(`magic: invalid inner value ${n}`);
  if (typeof e != "boolean")
    throw new Error(`magic: expected boolean, got ${typeof e}`);
  return Ct({
    size: n.size,
    encodeStream: (r, s) => n.encodeStream(r, t),
    decodeStream: (r) => {
      const s = n.decodeStream(r);
      if (e && typeof s != "object" && s !== t || Yt(t) && !Mn(t, s))
        throw r.err(`magic: invalid value: ${s} !== ${t}`);
    },
    validate: (r) => {
      if (r !== void 0)
        throw new Error(`magic: wrong value=${typeof r}`);
      return r;
    }
  });
}
function dl(n) {
  let t = 0;
  for (const e of n) {
    if (e.size === void 0)
      return;
    if (!we(e.size))
      throw new Error(`sizeof: wrong element size=${t}`);
    t += e.size;
  }
  return t;
}
function Et(n) {
  if (!Nr(n))
    throw new Error(`struct: expected plain object, got ${n}`);
  for (const t in n)
    if (!ie(n[t]))
      throw new Error(`struct: field ${t} is not CoderType`);
  return Ct({
    size: dl(Object.values(n)),
    encodeStream: (t, e) => {
      t.pushObj(e, (r) => {
        for (const s in n)
          r(s, () => n[s].encodeStream(t, e[s]));
      });
    },
    decodeStream: (t) => {
      const e = {};
      return t.pushObj(e, (r) => {
        for (const s in n)
          r(s, () => e[s] = n[s].decodeStream(t));
      }), e;
    },
    validate: (t) => {
      if (typeof t != "object" || t === null)
        throw new Error(`struct: invalid value ${t}`);
      return t;
    }
  });
}
function xh(n) {
  if (!Array.isArray(n))
    throw new Error(`Packed.Tuple: got ${typeof n} instead of array`);
  for (let t = 0; t < n.length; t++)
    if (!ie(n[t]))
      throw new Error(`tuple: field ${t} is not CoderType`);
  return Ct({
    size: dl(n),
    encodeStream: (t, e) => {
      if (!Array.isArray(e))
        throw t.err(`tuple: invalid value ${e}`);
      t.pushObj(e, (r) => {
        for (let s = 0; s < n.length; s++)
          r(`${s}`, () => n[s].encodeStream(t, e[s]));
      });
    },
    decodeStream: (t) => {
      const e = [];
      return t.pushObj(e, (r) => {
        for (let s = 0; s < n.length; s++)
          r(`${s}`, () => e.push(n[s].decodeStream(t)));
      }), e;
    },
    validate: (t) => {
      if (!Array.isArray(t))
        throw new Error(`tuple: invalid value ${t}`);
      if (t.length !== n.length)
        throw new Error(`tuple: wrong length=${t.length}, expected ${n.length}`);
      return t;
    }
  });
}
function Nt(n, t) {
  if (!ie(t))
    throw new Error(`array: invalid inner value ${t}`);
  const e = cl(typeof n == "string" ? `../${n}` : n);
  return Ct({
    size: typeof n == "number" && t.size ? n * t.size : void 0,
    encodeStream: (r, s) => {
      const i = r;
      i.pushObj(s, (o) => {
        Yt(n) || e.encodeStream(r, s.length);
        for (let a = 0; a < s.length; a++)
          o(`${a}`, () => {
            const c = s[a], u = r.pos;
            if (t.encodeStream(r, c), Yt(n)) {
              if (n.length > i.pos - u)
                return;
              const l = i.finish(!1).subarray(u, i.pos);
              if (Mn(l.subarray(0, n.length), n))
                throw i.err(`array: inner element encoding same as separator. elm=${c} data=${l}`);
            }
          });
      }), Yt(n) && r.bytes(n);
    },
    decodeStream: (r) => {
      const s = [];
      return r.pushObj(s, (i) => {
        if (n === null)
          for (let o = 0; !r.isEnd() && (i(`${o}`, () => s.push(t.decodeStream(r))), !(t.size && r.leftBytes < t.size)); o++)
            ;
        else if (Yt(n))
          for (let o = 0; ; o++) {
            if (Mn(r.bytes(n.length, !0), n)) {
              r.bytes(n.length);
              break;
            }
            i(`${o}`, () => s.push(t.decodeStream(r)));
          }
        else {
          let o;
          i("arrayLen", () => o = e.decodeStream(r));
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
const Jn = ze.Point, Ka = Jn.Fn, hl = Jn.Fn.ORDER, Cr = (n) => n % 2n === 0n, it = zo.isBytes, de = zo.concatBytes, ft = zo.equalBytes, pl = (n) => qd(Tt(n)), De = (...n) => Tt(Tt(de(...n))), eo = Re.utils.randomSecretKey, qo = Re.getPublicKey, gl = ze.getPublicKey, ja = (n) => n.r < hl / 2n;
function Th(n, t, e = !1) {
  let r = ze.Signature.fromBytes(ze.sign(n, t, { prehash: !1 }));
  if (e && !ja(r)) {
    const s = new Uint8Array(32);
    let i = 0;
    for (; !ja(r); )
      if (s.set(et.encode(i++)), r = ze.Signature.fromBytes(ze.sign(n, t, { prehash: !1, extraEntropy: s })), i > 4294967295)
        throw new Error("lowR counter overflow: report the error");
  }
  return r.toBytes("der");
}
const Wa = Re.sign, Yo = Re.utils.taggedHash, Vt = {
  ecdsa: 0,
  schnorr: 1
};
function Hn(n, t) {
  const e = n.length;
  if (t === Vt.ecdsa) {
    if (e === 32)
      throw new Error("Expected non-Schnorr key");
    return Jn.fromBytes(n), n;
  } else if (t === Vt.schnorr) {
    if (e !== 32)
      throw new Error("Expected 32-byte Schnorr key");
    return Re.utils.lift_x(Ne(n)), n;
  } else
    throw new Error("Unknown key type");
}
function yl(n, t) {
  const r = Re.utils.taggedHash("TapTweak", n, t), s = Ne(r);
  if (s >= hl)
    throw new Error("tweak higher than curve order");
  return s;
}
function Sh(n, t = Uint8Array.of()) {
  const e = Re.utils, r = Ne(n), s = Jn.BASE.multiply(r), i = Cr(s.y) ? r : Ka.neg(r), o = e.pointToBytes(s), a = yl(o, t);
  return $r(Ka.add(i, a), 32);
}
function no(n, t) {
  const e = Re.utils, r = yl(n, t), i = e.lift_x(Ne(n)).add(Jn.BASE.multiply(r)), o = Cr(i.y) ? 0 : 1;
  return [e.pointToBytes(i), o];
}
const Zo = Tt(Jn.BASE.toBytes(!1)), Fn = {
  bech32: "bc",
  pubKeyHash: 0,
  scriptHash: 5,
  wif: 128
}, Mr = {
  bech32: "tb",
  pubKeyHash: 111,
  scriptHash: 196,
  wif: 239
};
function Es(n, t) {
  if (!it(n) || !it(t))
    throw new Error(`cmp: wrong type a=${typeof n} b=${typeof t}`);
  const e = Math.min(n.length, t.length);
  for (let r = 0; r < e; r++)
    if (n[r] != t[r])
      return Math.sign(n[r] - t[r]);
  return Math.sign(n.length - t.length);
}
function wl(n) {
  const t = {};
  for (const e in n) {
    if (t[n[e]] !== void 0)
      throw new Error("duplicate key");
    t[n[e]] = e;
  }
  return t;
}
const yt = {
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
}, vh = wl(yt);
function Xo(n = 6, t = !1) {
  return Ct({
    encodeStream: (e, r) => {
      if (r === 0n)
        return;
      const s = r < 0, i = BigInt(r), o = [];
      for (let a = s ? -i : i; a; a >>= 8n)
        o.push(Number(a & 0xffn));
      o[o.length - 1] >= 128 ? o.push(s ? 128 : 0) : s && (o[o.length - 1] |= 128), e.bytes(new Uint8Array(o));
    },
    decodeStream: (e) => {
      const r = e.leftBytes;
      if (r > n)
        throw new Error(`ScriptNum: number (${r}) bigger than limit=${n}`);
      if (r === 0)
        return 0n;
      if (t) {
        const o = e.bytes(r, !0);
        if ((o[o.length - 1] & 127) === 0 && (r <= 1 || (o[o.length - 2] & 128) === 0))
          throw new Error("Non-minimally encoded ScriptNum");
      }
      let s = 0, i = 0n;
      for (let o = 0; o < r; ++o)
        s = e.byte(), i |= BigInt(s) << 8n * BigInt(o);
      return s >= 128 && (i &= 2n ** BigInt(r * 8) - 1n >> 1n, i = -i), i;
    }
  });
}
function Ih(n, t = 4, e = !0) {
  if (typeof n == "number")
    return n;
  if (it(n))
    try {
      const r = Xo(t, e).decode(n);
      return r > Number.MAX_SAFE_INTEGER ? void 0 : Number(r);
    } catch {
      return;
    }
}
const K = Ct({
  encodeStream: (n, t) => {
    for (let e of t) {
      if (typeof e == "string") {
        if (yt[e] === void 0)
          throw new Error(`Unknown opcode=${e}`);
        n.byte(yt[e]);
        continue;
      } else if (typeof e == "number") {
        if (e === 0) {
          n.byte(0);
          continue;
        } else if (1 <= e && e <= 16) {
          n.byte(yt.OP_1 - 1 + e);
          continue;
        }
      }
      if (typeof e == "number" && (e = Xo().encode(BigInt(e))), !it(e))
        throw new Error(`Wrong Script OP=${e} (${typeof e})`);
      const r = e.length;
      r < yt.PUSHDATA1 ? n.byte(r) : r <= 255 ? (n.byte(yt.PUSHDATA1), n.byte(r)) : r <= 65535 ? (n.byte(yt.PUSHDATA2), n.bytes(za.encode(r))) : (n.byte(yt.PUSHDATA4), n.bytes(et.encode(r))), n.bytes(e);
    }
  },
  decodeStream: (n) => {
    const t = [];
    for (; !n.isEnd(); ) {
      const e = n.byte();
      if (yt.OP_0 < e && e <= yt.PUSHDATA4) {
        let r;
        if (e < yt.PUSHDATA1)
          r = e;
        else if (e === yt.PUSHDATA1)
          r = Ke.decodeStream(n);
        else if (e === yt.PUSHDATA2)
          r = za.decodeStream(n);
        else if (e === yt.PUSHDATA4)
          r = et.decodeStream(n);
        else
          throw new Error("Should be not possible");
        t.push(n.bytes(r));
      } else if (e === 0)
        t.push(0);
      else if (yt.OP_1 <= e && e <= yt.OP_16)
        t.push(e - (yt.OP_1 - 1));
      else {
        const r = vh[e];
        if (r === void 0)
          throw new Error(`Unknown opcode=${e.toString(16)}`);
        t.push(r);
      }
    }
    return t;
  }
}), Ga = {
  253: [253, 2, 253n, 65535n],
  254: [254, 4, 65536n, 4294967295n],
  255: [255, 8, 4294967296n, 18446744073709551615n]
}, Js = Ct({
  encodeStream: (n, t) => {
    if (typeof t == "number" && (t = BigInt(t)), 0n <= t && t <= 252n)
      return n.byte(Number(t));
    for (const [e, r, s, i] of Object.values(Ga))
      if (!(s > t || t > i)) {
        n.byte(e);
        for (let o = 0; o < r; o++)
          n.byte(Number(t >> 8n * BigInt(o) & 0xffn));
        return;
      }
    throw n.err(`VarInt too big: ${t}`);
  },
  decodeStream: (n) => {
    const t = n.byte();
    if (t <= 252)
      return BigInt(t);
    const [e, r, s] = Ga[t];
    let i = 0n;
    for (let o = 0; o < r; o++)
      i |= BigInt(n.byte()) << 8n * BigInt(o);
    if (i < s)
      throw n.err(`Wrong CompactSize(${8 * r})`);
    return i;
  }
}), oe = Xe(Js, Qs.numberBigint), te = at(Js), Tr = Nt(oe, te), xs = (n) => Nt(Js, n), ml = Et({
  txid: at(32, !0),
  // hash(prev_tx),
  index: et,
  // output number of previous tx
  finalScriptSig: te,
  // btc merges input and output script, executes it. If ok = tx passes
  sequence: et
  // ?
}), hn = Et({ amount: es, script: te }), Ah = Et({
  version: kn,
  segwitFlag: bh(new Uint8Array([0, 1])),
  inputs: xs(ml),
  outputs: xs(hn),
  witnesses: Eh("segwitFlag", Nt("inputs/length", Tr)),
  // < 500000000	Block number at which this transaction is unlocked
  // >= 500000000	UNIX timestamp at which this transaction is unlocked
  // Handled as part of PSBTv2
  lockTime: et
});
function kh(n) {
  if (n.segwitFlag && n.witnesses && !n.witnesses.length)
    throw new Error("Segwit flag with empty witnesses array");
  return n;
}
const Un = Rt(Ah, kh), fr = Et({
  version: kn,
  inputs: xs(ml),
  outputs: xs(hn),
  lockTime: et
}), ro = Rt(at(null), (n) => Hn(n, Vt.ecdsa)), Ts = Rt(at(32), (n) => Hn(n, Vt.schnorr)), qa = Rt(at(null), (n) => {
  if (n.length !== 64 && n.length !== 65)
    throw new Error("Schnorr signature should be 64 or 65 bytes long");
  return n;
}), ti = Et({
  fingerprint: yh,
  path: Nt(null, et)
}), bl = Et({
  hashes: Nt(oe, at(32)),
  der: ti
}), Bh = at(78), Oh = Et({ pubKey: Ts, leafHash: at(32) }), $h = Et({
  version: Ke,
  // With parity :(
  internalKey: at(32),
  merklePath: Nt(null, at(32))
}), pe = Rt($h, (n) => {
  if (n.merklePath.length > 128)
    throw new Error("TaprootControlBlock: merklePath should be of length 0..128 (inclusive)");
  return n;
}), Uh = Nt(null, Et({
  depth: Ke,
  version: Ke,
  script: te
})), ht = at(null), Ya = at(20), sr = at(32), Qo = {
  unsignedTx: [0, !1, fr, [0], [0], !1],
  xpub: [1, Bh, ti, [], [0, 2], !1],
  txVersion: [2, !1, et, [2], [2], !1],
  fallbackLocktime: [3, !1, et, [], [2], !1],
  inputCount: [4, !1, oe, [2], [2], !1],
  outputCount: [5, !1, oe, [2], [2], !1],
  txModifiable: [6, !1, Ke, [], [2], !1],
  // TODO: bitfield
  version: [251, !1, et, [], [0, 2], !1],
  proprietary: [252, ht, ht, [], [0, 2], !1]
}, ei = {
  nonWitnessUtxo: [0, !1, Un, [], [0, 2], !1],
  witnessUtxo: [1, !1, hn, [], [0, 2], !1],
  partialSig: [2, ro, ht, [], [0, 2], !1],
  sighashType: [3, !1, et, [], [0, 2], !1],
  redeemScript: [4, !1, ht, [], [0, 2], !1],
  witnessScript: [5, !1, ht, [], [0, 2], !1],
  bip32Derivation: [6, ro, ti, [], [0, 2], !1],
  finalScriptSig: [7, !1, ht, [], [0, 2], !1],
  finalScriptWitness: [8, !1, Tr, [], [0, 2], !1],
  porCommitment: [9, !1, ht, [], [0, 2], !1],
  ripemd160: [10, Ya, ht, [], [0, 2], !1],
  sha256: [11, sr, ht, [], [0, 2], !1],
  hash160: [12, Ya, ht, [], [0, 2], !1],
  hash256: [13, sr, ht, [], [0, 2], !1],
  txid: [14, !1, sr, [2], [2], !0],
  index: [15, !1, et, [2], [2], !0],
  sequence: [16, !1, et, [], [2], !0],
  requiredTimeLocktime: [17, !1, et, [], [2], !1],
  requiredHeightLocktime: [18, !1, et, [], [2], !1],
  tapKeySig: [19, !1, qa, [], [0, 2], !1],
  tapScriptSig: [20, Oh, qa, [], [0, 2], !1],
  tapLeafScript: [21, pe, ht, [], [0, 2], !1],
  tapBip32Derivation: [22, sr, bl, [], [0, 2], !1],
  tapInternalKey: [23, !1, Ts, [], [0, 2], !1],
  tapMerkleRoot: [24, !1, sr, [], [0, 2], !1],
  proprietary: [252, ht, ht, [], [0, 2], !1]
}, Nh = [
  "txid",
  "sequence",
  "index",
  "witnessUtxo",
  "nonWitnessUtxo",
  "finalScriptSig",
  "finalScriptWitness",
  "unknown"
], Rh = [
  "partialSig",
  "finalScriptSig",
  "finalScriptWitness",
  "tapKeySig",
  "tapScriptSig"
], Sr = {
  redeemScript: [0, !1, ht, [], [0, 2], !1],
  witnessScript: [1, !1, ht, [], [0, 2], !1],
  bip32Derivation: [2, ro, ti, [], [0, 2], !1],
  amount: [3, !1, ph, [2], [2], !0],
  script: [4, !1, ht, [2], [2], !0],
  tapInternalKey: [5, !1, Ts, [], [0, 2], !1],
  tapTree: [6, !1, Uh, [], [0, 2], !1],
  tapBip32Derivation: [7, Ts, bl, [], [0, 2], !1],
  proprietary: [252, ht, ht, [], [0, 2], !1]
}, Ch = [], Za = Nt(ol, Et({
  //  <key> := <keylen> <keytype> <keydata> WHERE keylen = len(keytype)+len(keydata)
  key: wh(oe, Et({ type: oe, key: at(null) })),
  //  <value> := <valuelen> <valuedata>
  value: at(oe)
}));
function so(n) {
  const [t, e, r, s, i, o] = n;
  return { type: t, kc: e, vc: r, reqInc: s, allowInc: i, silentIgnore: o };
}
Et({ type: oe, key: at(null) });
function Jo(n) {
  const t = {};
  for (const e in n) {
    const [r, s, i] = n[e];
    t[r] = [e, s, i];
  }
  return Ct({
    encodeStream: (e, r) => {
      let s = [];
      for (const i in n) {
        const o = r[i];
        if (o === void 0)
          continue;
        const [a, c, u] = n[i];
        if (!c)
          s.push({ key: { type: a, key: ct }, value: u.encode(o) });
        else {
          const l = o.map(([d, h]) => [
            c.encode(d),
            u.encode(h)
          ]);
          l.sort((d, h) => Es(d[0], h[0]));
          for (const [d, h] of l)
            s.push({ key: { key: d, type: a }, value: h });
        }
      }
      if (r.unknown) {
        r.unknown.sort((i, o) => Es(i[0].key, o[0].key));
        for (const [i, o] of r.unknown)
          s.push({ key: i, value: o });
      }
      Za.encodeStream(e, s);
    },
    decodeStream: (e) => {
      const r = Za.decodeStream(e), s = {}, i = {};
      for (const o of r) {
        let a = "unknown", c = o.key.key, u = o.value;
        if (t[o.key.type]) {
          const [l, d, h] = t[o.key.type];
          if (a = l, !d && c.length)
            throw new Error(`PSBT: Non-empty key for ${a} (key=${k.encode(c)} value=${k.encode(u)}`);
          if (c = d ? d.decode(c) : void 0, u = h.decode(u), !d) {
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
const ta = Rt(Jo(ei), (n) => {
  if (n.finalScriptWitness && !n.finalScriptWitness.length)
    throw new Error("validateInput: empty finalScriptWitness");
  if (n.partialSig && !n.partialSig.length)
    throw new Error("Empty partialSig");
  if (n.partialSig)
    for (const [t] of n.partialSig)
      Hn(t, Vt.ecdsa);
  if (n.bip32Derivation)
    for (const [t] of n.bip32Derivation)
      Hn(t, Vt.ecdsa);
  if (n.requiredTimeLocktime !== void 0 && n.requiredTimeLocktime < 5e8)
    throw new Error(`validateInput: wrong timeLocktime=${n.requiredTimeLocktime}`);
  if (n.requiredHeightLocktime !== void 0 && (n.requiredHeightLocktime <= 0 || n.requiredHeightLocktime >= 5e8))
    throw new Error(`validateInput: wrong heighLocktime=${n.requiredHeightLocktime}`);
  if (n.tapLeafScript)
    for (const [t, e] of n.tapLeafScript) {
      if ((t.version & 254) !== e[e.length - 1])
        throw new Error("validateInput: tapLeafScript version mimatch");
      if (e[e.length - 1] & 1)
        throw new Error("validateInput: tapLeafScript version has parity bit!");
    }
  return n;
}), ea = Rt(Jo(Sr), (n) => {
  if (n.bip32Derivation)
    for (const [t] of n.bip32Derivation)
      Hn(t, Vt.ecdsa);
  return n;
}), El = Rt(Jo(Qo), (n) => {
  if ((n.version || 0) === 0) {
    if (!n.unsignedTx)
      throw new Error("PSBTv0: missing unsignedTx");
    for (const e of n.unsignedTx.inputs)
      if (e.finalScriptSig && e.finalScriptSig.length)
        throw new Error("PSBTv0: input scriptSig found in unsignedTx");
  }
  return n;
}), Lh = Et({
  magic: Go(Wo(new Uint8Array([255])), "psbt"),
  global: El,
  inputs: Nt("global/unsignedTx/inputs/length", ta),
  outputs: Nt(null, ea)
}), Ph = Et({
  magic: Go(Wo(new Uint8Array([255])), "psbt"),
  global: El,
  inputs: Nt("global/inputCount", ta),
  outputs: Nt("global/outputCount", ea)
});
Et({
  magic: Go(Wo(new Uint8Array([255])), "psbt"),
  items: Nt(null, Xe(Nt(ol, xh([mh(oe), at(Js)])), Qs.dict()))
});
function bi(n, t, e) {
  for (const r in e) {
    if (r === "unknown" || !t[r])
      continue;
    const { allowInc: s } = so(t[r]);
    if (!s.includes(n))
      throw new Error(`PSBTv${n}: field ${r} is not allowed`);
  }
  for (const r in t) {
    const { reqInc: s } = so(t[r]);
    if (s.includes(n) && e[r] === void 0)
      throw new Error(`PSBTv${n}: missing required field ${r}`);
  }
}
function Xa(n, t, e) {
  const r = {};
  for (const s in e) {
    const i = s;
    if (i !== "unknown") {
      if (!t[i])
        continue;
      const { allowInc: o, silentIgnore: a } = so(t[i]);
      if (!o.includes(n)) {
        if (a)
          continue;
        throw new Error(`Failed to serialize in PSBTv${n}: ${i} but versions allows inclusion=${o}`);
      }
    }
    r[i] = e[i];
  }
  return r;
}
function xl(n) {
  const t = n && n.global && n.global.version || 0;
  bi(t, Qo, n.global);
  for (const o of n.inputs)
    bi(t, ei, o);
  for (const o of n.outputs)
    bi(t, Sr, o);
  const e = t ? n.global.inputCount : n.global.unsignedTx.inputs.length;
  if (n.inputs.length < e)
    throw new Error("Not enough inputs");
  const r = n.inputs.slice(e);
  if (r.length > 1 || r.length && Object.keys(r[0]).length)
    throw new Error(`Unexpected inputs left in tx=${r}`);
  const s = t ? n.global.outputCount : n.global.unsignedTx.outputs.length;
  if (n.outputs.length < s)
    throw new Error("Not outputs inputs");
  const i = n.outputs.slice(s);
  if (i.length > 1 || i.length && Object.keys(i[0]).length)
    throw new Error(`Unexpected outputs left in tx=${i}`);
  return n;
}
function io(n, t, e, r, s) {
  const i = { ...e, ...t };
  for (const o in n) {
    const a = o, [c, u, l] = n[a], d = r && !r.includes(o);
    if (t[o] === void 0 && o in t) {
      if (d)
        throw new Error(`Cannot remove signed field=${o}`);
      delete i[o];
    } else if (u) {
      const h = e && e[o] ? e[o] : [];
      let p = t[a];
      if (p) {
        if (!Array.isArray(p))
          throw new Error(`keyMap(${o}): KV pairs should be [k, v][]`);
        p = p.map((g) => {
          if (g.length !== 2)
            throw new Error(`keyMap(${o}): KV pairs should be [k, v][]`);
          return [
            typeof g[0] == "string" ? u.decode(k.decode(g[0])) : g[0],
            typeof g[1] == "string" ? l.decode(k.decode(g[1])) : g[1]
          ];
        });
        const y = {}, f = (g, m, S) => {
          if (y[g] === void 0) {
            y[g] = [m, S];
            return;
          }
          const I = k.encode(l.encode(y[g][1])), E = k.encode(l.encode(S));
          if (I !== E)
            throw new Error(`keyMap(${a}): same key=${g} oldVal=${I} newVal=${E}`);
        };
        for (const [g, m] of h) {
          const S = k.encode(u.encode(g));
          f(S, g, m);
        }
        for (const [g, m] of p) {
          const S = k.encode(u.encode(g));
          if (m === void 0) {
            if (d)
              throw new Error(`Cannot remove signed field=${a}/${g}`);
            delete y[S];
          } else
            f(S, g, m);
        }
        i[a] = Object.values(y);
      }
    } else if (typeof i[o] == "string")
      i[o] = l.decode(k.decode(i[o]));
    else if (d && o in t && e && e[o] !== void 0 && !ft(l.encode(t[o]), l.encode(e[o])))
      throw new Error(`Cannot change signed field=${o}`);
  }
  for (const o in i)
    if (!n[o]) {
      if (s && o === "unknown")
        continue;
      delete i[o];
    }
  return i;
}
const Qa = Rt(Lh, xl), Ja = Rt(Ph, xl), _h = {
  encode(n) {
    if (!(n.length !== 2 || n[0] !== 1 || !it(n[1]) || k.encode(n[1]) !== "4e73"))
      return { type: "p2a", script: K.encode(n) };
  },
  decode: (n) => {
    if (n.type === "p2a")
      return [1, k.decode("4e73")];
  }
};
function Bn(n, t) {
  try {
    return Hn(n, t), !0;
  } catch {
    return !1;
  }
}
const Dh = {
  encode(n) {
    if (!(n.length !== 2 || !it(n[0]) || !Bn(n[0], Vt.ecdsa) || n[1] !== "CHECKSIG"))
      return { type: "pk", pubkey: n[0] };
  },
  decode: (n) => n.type === "pk" ? [n.pubkey, "CHECKSIG"] : void 0
}, Vh = {
  encode(n) {
    if (!(n.length !== 5 || n[0] !== "DUP" || n[1] !== "HASH160" || !it(n[2])) && !(n[3] !== "EQUALVERIFY" || n[4] !== "CHECKSIG"))
      return { type: "pkh", hash: n[2] };
  },
  decode: (n) => n.type === "pkh" ? ["DUP", "HASH160", n.hash, "EQUALVERIFY", "CHECKSIG"] : void 0
}, Mh = {
  encode(n) {
    if (!(n.length !== 3 || n[0] !== "HASH160" || !it(n[1]) || n[2] !== "EQUAL"))
      return { type: "sh", hash: n[1] };
  },
  decode: (n) => n.type === "sh" ? ["HASH160", n.hash, "EQUAL"] : void 0
}, Hh = {
  encode(n) {
    if (!(n.length !== 2 || n[0] !== 0 || !it(n[1])) && n[1].length === 32)
      return { type: "wsh", hash: n[1] };
  },
  decode: (n) => n.type === "wsh" ? [0, n.hash] : void 0
}, Fh = {
  encode(n) {
    if (!(n.length !== 2 || n[0] !== 0 || !it(n[1])) && n[1].length === 20)
      return { type: "wpkh", hash: n[1] };
  },
  decode: (n) => n.type === "wpkh" ? [0, n.hash] : void 0
}, zh = {
  encode(n) {
    const t = n.length - 1;
    if (n[t] !== "CHECKMULTISIG")
      return;
    const e = n[0], r = n[t - 1];
    if (typeof e != "number" || typeof r != "number")
      return;
    const s = n.slice(1, -2);
    if (r === s.length) {
      for (const i of s)
        if (!it(i))
          return;
      return { type: "ms", m: e, pubkeys: s };
    }
  },
  // checkmultisig(n, ..pubkeys, m)
  decode: (n) => n.type === "ms" ? [n.m, ...n.pubkeys, n.pubkeys.length, "CHECKMULTISIG"] : void 0
}, Kh = {
  encode(n) {
    if (!(n.length !== 2 || n[0] !== 1 || !it(n[1])))
      return { type: "tr", pubkey: n[1] };
  },
  decode: (n) => n.type === "tr" ? [1, n.pubkey] : void 0
}, jh = {
  encode(n) {
    const t = n.length - 1;
    if (n[t] !== "CHECKSIG")
      return;
    const e = [];
    for (let r = 0; r < t; r++) {
      const s = n[r];
      if (r & 1) {
        if (s !== "CHECKSIGVERIFY" || r === t - 1)
          return;
        continue;
      }
      if (!it(s))
        return;
      e.push(s);
    }
    return { type: "tr_ns", pubkeys: e };
  },
  decode: (n) => {
    if (n.type !== "tr_ns")
      return;
    const t = [];
    for (let e = 0; e < n.pubkeys.length - 1; e++)
      t.push(n.pubkeys[e], "CHECKSIGVERIFY");
    return t.push(n.pubkeys[n.pubkeys.length - 1], "CHECKSIG"), t;
  }
}, Wh = {
  encode(n) {
    const t = n.length - 1;
    if (n[t] !== "NUMEQUAL" || n[1] !== "CHECKSIG")
      return;
    const e = [], r = Ih(n[t - 1]);
    if (typeof r == "number") {
      for (let s = 0; s < t - 1; s++) {
        const i = n[s];
        if (s & 1) {
          if (i !== (s === 1 ? "CHECKSIG" : "CHECKSIGADD"))
            throw new Error("OutScript.encode/tr_ms: wrong element");
          continue;
        }
        if (!it(i))
          throw new Error("OutScript.encode/tr_ms: wrong key element");
        e.push(i);
      }
      return { type: "tr_ms", pubkeys: e, m: r };
    }
  },
  decode: (n) => {
    if (n.type !== "tr_ms")
      return;
    const t = [n.pubkeys[0], "CHECKSIG"];
    for (let e = 1; e < n.pubkeys.length; e++)
      t.push(n.pubkeys[e], "CHECKSIGADD");
    return t.push(n.m, "NUMEQUAL"), t;
  }
}, Gh = {
  encode(n) {
    return { type: "unknown", script: K.encode(n) };
  },
  decode: (n) => n.type === "unknown" ? K.decode(n.script) : void 0
}, qh = [
  _h,
  Dh,
  Vh,
  Mh,
  Hh,
  Fh,
  zh,
  Kh,
  jh,
  Wh,
  Gh
], Yh = Xe(K, Qs.match(qh)), dt = Rt(Yh, (n) => {
  if (n.type === "pk" && !Bn(n.pubkey, Vt.ecdsa))
    throw new Error("OutScript/pk: wrong key");
  if ((n.type === "pkh" || n.type === "sh" || n.type === "wpkh") && (!it(n.hash) || n.hash.length !== 20))
    throw new Error(`OutScript/${n.type}: wrong hash`);
  if (n.type === "wsh" && (!it(n.hash) || n.hash.length !== 32))
    throw new Error("OutScript/wsh: wrong hash");
  if (n.type === "tr" && (!it(n.pubkey) || !Bn(n.pubkey, Vt.schnorr)))
    throw new Error("OutScript/tr: wrong taproot public key");
  if ((n.type === "ms" || n.type === "tr_ns" || n.type === "tr_ms") && !Array.isArray(n.pubkeys))
    throw new Error("OutScript/multisig: wrong pubkeys array");
  if (n.type === "ms") {
    const t = n.pubkeys.length;
    for (const e of n.pubkeys)
      if (!Bn(e, Vt.ecdsa))
        throw new Error("OutScript/multisig: wrong pubkey");
    if (n.m <= 0 || t > 16 || n.m > t)
      throw new Error("OutScript/multisig: invalid params");
  }
  if (n.type === "tr_ns" || n.type === "tr_ms") {
    for (const t of n.pubkeys)
      if (!Bn(t, Vt.schnorr))
        throw new Error(`OutScript/${n.type}: wrong pubkey`);
  }
  if (n.type === "tr_ms") {
    const t = n.pubkeys.length;
    if (n.m <= 0 || t > 999 || n.m > t)
      throw new Error("OutScript/tr_ms: invalid params");
  }
  return n;
});
function tc(n, t) {
  if (!ft(n.hash, Tt(t)))
    throw new Error("checkScript: wsh wrong witnessScript hash");
  const e = dt.decode(t);
  if (e.type === "tr" || e.type === "tr_ns" || e.type === "tr_ms")
    throw new Error(`checkScript: P2${e.type} cannot be wrapped in P2SH`);
  if (e.type === "wpkh" || e.type === "sh")
    throw new Error(`checkScript: P2${e.type} cannot be wrapped in P2WSH`);
}
function Tl(n, t, e) {
  if (n) {
    const r = dt.decode(n);
    if (r.type === "tr_ns" || r.type === "tr_ms" || r.type === "ms" || r.type == "pk")
      throw new Error(`checkScript: non-wrapped ${r.type}`);
    if (r.type === "sh" && t) {
      if (!ft(r.hash, pl(t)))
        throw new Error("checkScript: sh wrong redeemScript hash");
      const s = dt.decode(t);
      if (s.type === "tr" || s.type === "tr_ns" || s.type === "tr_ms")
        throw new Error(`checkScript: P2${s.type} cannot be wrapped in P2SH`);
      if (s.type === "sh")
        throw new Error("checkScript: P2SH cannot be wrapped in P2SH");
    }
    r.type === "wsh" && e && tc(r, e);
  }
  if (t) {
    const r = dt.decode(t);
    r.type === "wsh" && e && tc(r, e);
  }
}
function Zh(n) {
  const t = {};
  for (const e of n) {
    const r = k.encode(e);
    if (t[r])
      throw new Error(`Multisig: non-uniq pubkey: ${n.map(k.encode)}`);
    t[r] = !0;
  }
}
function Xh(n, t, e = !1, r) {
  const s = dt.decode(n);
  if (s.type === "unknown" && e)
    return;
  if (!["tr_ns", "tr_ms"].includes(s.type))
    throw new Error(`P2TR: invalid leaf script=${s.type}`);
  const i = s;
  if (!e && i.pubkeys)
    for (const o of i.pubkeys) {
      if (ft(o, Zo))
        throw new Error("Unspendable taproot key in leaf script");
      if (ft(o, t))
        throw new Error("Using P2TR with leaf script with same key as internal key is not supported");
    }
}
function Sl(n) {
  const t = Array.from(n);
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
  const e = t[0];
  return e?.childs || e;
}
function oo(n, t = []) {
  if (!n)
    throw new Error("taprootAddPath: empty tree");
  if (n.type === "leaf")
    return { ...n, path: t };
  if (n.type !== "branch")
    throw new Error(`taprootAddPath: wrong type=${n}`);
  return {
    ...n,
    path: t,
    // Left element has right hash in path and otherwise
    left: oo(n.left, [n.right.hash, ...t]),
    right: oo(n.right, [n.left.hash, ...t])
  };
}
function ao(n) {
  if (!n)
    throw new Error("taprootAddPath: empty tree");
  if (n.type === "leaf")
    return [n];
  if (n.type !== "branch")
    throw new Error(`taprootWalkTree: wrong type=${n}`);
  return [...ao(n.left), ...ao(n.right)];
}
function co(n, t, e = !1, r) {
  if (!n)
    throw new Error("taprootHashTree: empty tree");
  if (Array.isArray(n) && n.length === 1 && (n = n[0]), !Array.isArray(n)) {
    const { leafVersion: c, script: u } = n;
    if (n.tapLeafScript || n.tapMerkleRoot && !ft(n.tapMerkleRoot, ct))
      throw new Error("P2TR: tapRoot leafScript cannot have tree");
    const l = typeof u == "string" ? k.decode(u) : u;
    if (!it(l))
      throw new Error(`checkScript: wrong script type=${l}`);
    return Xh(l, t, e), {
      type: "leaf",
      version: c,
      script: l,
      hash: hr(l, c)
    };
  }
  if (n.length !== 2 && (n = Sl(n)), n.length !== 2)
    throw new Error("hashTree: non binary tree!");
  const s = co(n[0], t, e), i = co(n[1], t, e);
  let [o, a] = [s.hash, i.hash];
  return Es(a, o) === -1 && ([o, a] = [a, o]), { type: "branch", left: s, right: i, hash: Yo("TapBranch", o, a) };
}
const vr = 192, hr = (n, t = vr) => Yo("TapLeaf", new Uint8Array([t]), te.encode(n));
function Qh(n, t, e = Fn, r = !1, s) {
  if (!n && !t)
    throw new Error("p2tr: should have pubKey or scriptTree (or both)");
  const i = typeof n == "string" ? k.decode(n) : n || Zo;
  if (!Bn(i, Vt.schnorr))
    throw new Error("p2tr: non-schnorr pubkey");
  if (t) {
    let o = oo(co(t, i, r));
    const a = o.hash, [c, u] = no(i, a), l = ao(o).map((d) => ({
      ...d,
      controlBlock: pe.encode({
        version: (d.version || vr) + u,
        internalKey: i,
        merklePath: d.path
      })
    }));
    return {
      type: "tr",
      script: dt.encode({ type: "tr", pubkey: c }),
      address: Qe(e).encode({ type: "tr", pubkey: c }),
      // For tests
      tweakedPubkey: c,
      // PSBT stuff
      tapInternalKey: i,
      leaves: l,
      tapLeafScript: l.map((d) => [
        pe.decode(d.controlBlock),
        de(d.script, new Uint8Array([d.version || vr]))
      ]),
      tapMerkleRoot: a
    };
  } else {
    const o = no(i, ct)[0];
    return {
      type: "tr",
      script: dt.encode({ type: "tr", pubkey: o }),
      address: Qe(e).encode({ type: "tr", pubkey: o }),
      // For tests
      tweakedPubkey: o,
      // PSBT stuff
      tapInternalKey: i
    };
  }
}
function Jh(n, t, e = !1) {
  return e || Zh(t), {
    type: "tr_ms",
    script: dt.encode({ type: "tr_ms", pubkeys: t, m: n })
  };
}
const vl = nh(Tt);
function Il(n, t) {
  if (t.length < 2 || t.length > 40)
    throw new Error("Witness: invalid length");
  if (n > 16)
    throw new Error("Witness: invalid version");
  if (n === 0 && !(t.length === 20 || t.length === 32))
    throw new Error("Witness: invalid length for version");
}
function Ei(n, t, e = Fn) {
  Il(n, t);
  const r = n === 0 ? Ji : An;
  return r.encode(e.bech32, [n].concat(r.toWords(t)));
}
function ec(n, t) {
  return vl.encode(de(Uint8Array.from(t), n));
}
function Qe(n = Fn) {
  return {
    encode(t) {
      const { type: e } = t;
      if (e === "wpkh")
        return Ei(0, t.hash, n);
      if (e === "wsh")
        return Ei(0, t.hash, n);
      if (e === "tr")
        return Ei(1, t.pubkey, n);
      if (e === "pkh")
        return ec(t.hash, [n.pubKeyHash]);
      if (e === "sh")
        return ec(t.hash, [n.scriptHash]);
      throw new Error(`Unknown address type=${e}`);
    },
    decode(t) {
      if (t.length < 14 || t.length > 74)
        throw new Error("Invalid address length");
      if (n.bech32 && t.toLowerCase().startsWith(`${n.bech32}1`)) {
        let r;
        try {
          if (r = Ji.decode(t), r.words[0] !== 0)
            throw new Error(`bech32: wrong version=${r.words[0]}`);
        } catch {
          if (r = An.decode(t), r.words[0] === 0)
            throw new Error(`bech32m: wrong version=${r.words[0]}`);
        }
        if (r.prefix !== n.bech32)
          throw new Error(`wrong bech32 prefix=${r.prefix}`);
        const [s, ...i] = r.words, o = Ji.fromWords(i);
        if (Il(s, o), s === 0 && o.length === 32)
          return { type: "wsh", hash: o };
        if (s === 0 && o.length === 20)
          return { type: "wpkh", hash: o };
        if (s === 1 && o.length === 32)
          return { type: "tr", pubkey: o };
        throw new Error("Unknown witness program");
      }
      const e = vl.decode(t);
      if (e.length !== 21)
        throw new Error("Invalid base58 address");
      if (e[0] === n.pubKeyHash)
        return { type: "pkh", hash: e.slice(1) };
      if (e[0] === n.scriptHash)
        return {
          type: "sh",
          hash: e.slice(1)
        };
      throw new Error(`Invalid address prefix=${e[0]}`);
    }
  };
}
const Hr = new Uint8Array(32), tp = {
  amount: 0xffffffffffffffffn,
  script: ct
}, ep = (n) => Math.ceil(n / 4), np = 8, rp = 2, on = 0, na = 4294967295;
Qs.decimal(np);
const pr = (n, t) => n === void 0 ? t : n;
function Ss(n) {
  if (Array.isArray(n))
    return n.map((t) => Ss(t));
  if (it(n))
    return Uint8Array.from(n);
  if (["number", "bigint", "boolean", "string", "undefined"].includes(typeof n))
    return n;
  if (n === null)
    return n;
  if (typeof n == "object")
    return Object.fromEntries(Object.entries(n).map(([t, e]) => [t, Ss(e)]));
  throw new Error(`cloneDeep: unknown type=${n} (${typeof n})`);
}
const Z = {
  DEFAULT: 0,
  ALL: 1,
  NONE: 2,
  SINGLE: 3,
  ANYONECANPAY: 128
}, bn = {
  DEFAULT: Z.DEFAULT,
  ALL: Z.ALL,
  NONE: Z.NONE,
  SINGLE: Z.SINGLE,
  DEFAULT_ANYONECANPAY: Z.DEFAULT | Z.ANYONECANPAY,
  ALL_ANYONECANPAY: Z.ALL | Z.ANYONECANPAY,
  NONE_ANYONECANPAY: Z.NONE | Z.ANYONECANPAY,
  SINGLE_ANYONECANPAY: Z.SINGLE | Z.ANYONECANPAY
}, sp = wl(bn);
function ip(n, t, e, r = ct) {
  return ft(e, t) && (n = Sh(n, r), t = qo(n)), { privKey: n, pubKey: t };
}
function an(n) {
  if (n.script === void 0 || n.amount === void 0)
    throw new Error("Transaction/output: script and amount required");
  return { script: n.script, amount: n.amount };
}
function ir(n) {
  if (n.txid === void 0 || n.index === void 0)
    throw new Error("Transaction/input: txid and index required");
  return {
    txid: n.txid,
    index: n.index,
    sequence: pr(n.sequence, na),
    finalScriptSig: pr(n.finalScriptSig, ct)
  };
}
function xi(n) {
  for (const t in n) {
    const e = t;
    Nh.includes(e) || delete n[e];
  }
}
const Ti = Et({ txid: at(32, !0), index: et });
function op(n) {
  if (typeof n != "number" || typeof sp[n] != "string")
    throw new Error(`Invalid SigHash=${n}`);
  return n;
}
function nc(n) {
  const t = n & 31;
  return {
    isAny: !!(n & Z.ANYONECANPAY),
    isNone: t === Z.NONE,
    isSingle: t === Z.SINGLE
  };
}
function ap(n) {
  if (n !== void 0 && {}.toString.call(n) !== "[object Object]")
    throw new Error(`Wrong object type for transaction options: ${n}`);
  const t = {
    ...n,
    // Defaults
    version: pr(n.version, rp),
    lockTime: pr(n.lockTime, 0),
    PSBTVersion: pr(n.PSBTVersion, 0)
  };
  if (typeof t.allowUnknowInput < "u" && (n.allowUnknownInputs = t.allowUnknowInput), typeof t.allowUnknowOutput < "u" && (n.allowUnknownOutputs = t.allowUnknowOutput), typeof t.lockTime != "number")
    throw new Error("Transaction lock time should be number");
  if (et.encode(t.lockTime), t.PSBTVersion !== 0 && t.PSBTVersion !== 2)
    throw new Error(`Unknown PSBT version ${t.PSBTVersion}`);
  for (const e of [
    "allowUnknownVersion",
    "allowUnknownOutputs",
    "allowUnknownInputs",
    "disableScriptCheck",
    "bip174jsCompat",
    "allowLegacyWitnessUtxo",
    "lowR"
  ]) {
    const r = t[e];
    if (r !== void 0 && typeof r != "boolean")
      throw new Error(`Transation options wrong type: ${e}=${r} (${typeof r})`);
  }
  if (t.allowUnknownVersion ? typeof t.version == "number" : ![-1, 0, 1, 2, 3].includes(t.version))
    throw new Error(`Unknown version: ${t.version}`);
  if (t.customScripts !== void 0) {
    const e = t.customScripts;
    if (!Array.isArray(e))
      throw new Error(`wrong custom scripts type (expected array): customScripts=${e} (${typeof e})`);
    for (const r of e) {
      if (typeof r.encode != "function" || typeof r.decode != "function")
        throw new Error(`wrong script=${r} (${typeof r})`);
      if (r.finalizeTaproot !== void 0 && typeof r.finalizeTaproot != "function")
        throw new Error(`wrong script=${r} (${typeof r})`);
    }
  }
  return Object.freeze(t);
}
function rc(n) {
  if (n.nonWitnessUtxo && n.index !== void 0) {
    const t = n.nonWitnessUtxo.outputs.length - 1;
    if (n.index > t)
      throw new Error(`validateInput: index(${n.index}) not in nonWitnessUtxo`);
    const e = n.nonWitnessUtxo.outputs[n.index];
    if (n.witnessUtxo && (!ft(n.witnessUtxo.script, e.script) || n.witnessUtxo.amount !== e.amount))
      throw new Error("validateInput: witnessUtxo different from nonWitnessUtxo");
    if (n.txid) {
      if (n.nonWitnessUtxo.outputs.length - 1 < n.index)
        throw new Error("nonWitnessUtxo: incorect output index");
      const s = ne.fromRaw(Un.encode(n.nonWitnessUtxo), {
        allowUnknownOutputs: !0,
        disableScriptCheck: !0,
        allowUnknownInputs: !0
      }), i = k.encode(n.txid);
      if (s.isFinal && s.id !== i)
        throw new Error(`nonWitnessUtxo: wrong txid, exp=${i} got=${s.id}`);
    }
  }
  return n;
}
function ns(n) {
  if (n.nonWitnessUtxo) {
    if (n.index === void 0)
      throw new Error("Unknown input index");
    return n.nonWitnessUtxo.outputs[n.index];
  } else {
    if (n.witnessUtxo)
      return n.witnessUtxo;
    throw new Error("Cannot find previous output info");
  }
}
function sc(n, t, e, r = !1, s = !1) {
  let { nonWitnessUtxo: i, txid: o } = n;
  typeof i == "string" && (i = k.decode(i)), it(i) && (i = Un.decode(i)), !("nonWitnessUtxo" in n) && i === void 0 && (i = t?.nonWitnessUtxo), typeof o == "string" && (o = k.decode(o)), o === void 0 && (o = t?.txid);
  let a = { ...t, ...n, nonWitnessUtxo: i, txid: o };
  !("nonWitnessUtxo" in n) && a.nonWitnessUtxo === void 0 && delete a.nonWitnessUtxo, a.sequence === void 0 && (a.sequence = na), a.tapMerkleRoot === null && delete a.tapMerkleRoot, a = io(ei, a, t, e, s), ta.encode(a);
  let c;
  return a.nonWitnessUtxo && a.index !== void 0 ? c = a.nonWitnessUtxo.outputs[a.index] : a.witnessUtxo && (c = a.witnessUtxo), c && !r && Tl(c && c.script, a.redeemScript, a.witnessScript), a;
}
function ic(n, t = !1) {
  let e = "legacy", r = Z.ALL;
  const s = ns(n), i = dt.decode(s.script);
  let o = i.type, a = i;
  const c = [i];
  if (i.type === "tr")
    return r = Z.DEFAULT, {
      txType: "taproot",
      type: "tr",
      last: i,
      lastScript: s.script,
      defaultSighash: r,
      sighash: n.sighashType || r
    };
  {
    if ((i.type === "wpkh" || i.type === "wsh") && (e = "segwit"), i.type === "sh") {
      if (!n.redeemScript)
        throw new Error("inputType: sh without redeemScript");
      let h = dt.decode(n.redeemScript);
      (h.type === "wpkh" || h.type === "wsh") && (e = "segwit"), c.push(h), a = h, o += `-${h.type}`;
    }
    if (a.type === "wsh") {
      if (!n.witnessScript)
        throw new Error("inputType: wsh without witnessScript");
      let h = dt.decode(n.witnessScript);
      h.type === "wsh" && (e = "segwit"), c.push(h), a = h, o += `-${h.type}`;
    }
    const u = c[c.length - 1];
    if (u.type === "sh" || u.type === "wsh")
      throw new Error("inputType: sh/wsh cannot be terminal type");
    const l = dt.encode(u), d = {
      type: o,
      txType: e,
      last: u,
      lastScript: l,
      defaultSighash: r,
      sighash: n.sighashType || r
    };
    if (e === "legacy" && !t && !n.nonWitnessUtxo)
      throw new Error("Transaction/sign: legacy input without nonWitnessUtxo, can result in attack that forces paying higher fees. Pass allowLegacyWitnessUtxo=true, if you sure");
    return d;
  }
}
let ne = class rs {
  global = {};
  inputs = [];
  // use getInput()
  outputs = [];
  // use getOutput()
  opts;
  constructor(t = {}) {
    const e = this.opts = ap(t);
    e.lockTime !== on && (this.global.fallbackLocktime = e.lockTime), this.global.txVersion = e.version;
  }
  // Import
  static fromRaw(t, e = {}) {
    const r = Un.decode(t), s = new rs({ ...e, version: r.version, lockTime: r.lockTime });
    for (const i of r.outputs)
      s.addOutput(i);
    if (s.outputs = r.outputs, s.inputs = r.inputs, r.witnesses)
      for (let i = 0; i < r.witnesses.length; i++)
        s.inputs[i].finalScriptWitness = r.witnesses[i];
    return s;
  }
  // PSBT
  static fromPSBT(t, e = {}) {
    let r;
    try {
      r = Qa.decode(t);
    } catch (d) {
      try {
        r = Ja.decode(t);
      } catch {
        throw d;
      }
    }
    const s = r.global.version || 0;
    if (s !== 0 && s !== 2)
      throw new Error(`Wrong PSBT version=${s}`);
    const i = r.global.unsignedTx, o = s === 0 ? i?.version : r.global.txVersion, a = s === 0 ? i?.lockTime : r.global.fallbackLocktime, c = new rs({ ...e, version: o, lockTime: a, PSBTVersion: s }), u = s === 0 ? i?.inputs.length : r.global.inputCount;
    c.inputs = r.inputs.slice(0, u).map((d, h) => rc({
      finalScriptSig: ct,
      ...r.global.unsignedTx?.inputs[h],
      ...d
    }));
    const l = s === 0 ? i?.outputs.length : r.global.outputCount;
    return c.outputs = r.outputs.slice(0, l).map((d, h) => ({
      ...d,
      ...r.global.unsignedTx?.outputs[h]
    })), c.global = { ...r.global, txVersion: o }, a !== on && (c.global.fallbackLocktime = a), c;
  }
  toPSBT(t = this.opts.PSBTVersion) {
    if (t !== 0 && t !== 2)
      throw new Error(`Wrong PSBT version=${t}`);
    const e = this.inputs.map((i) => rc(Xa(t, ei, i)));
    for (const i of e)
      i.partialSig && !i.partialSig.length && delete i.partialSig, i.finalScriptSig && !i.finalScriptSig.length && delete i.finalScriptSig, i.finalScriptWitness && !i.finalScriptWitness.length && delete i.finalScriptWitness;
    const r = this.outputs.map((i) => Xa(t, Sr, i)), s = { ...this.global };
    return t === 0 ? (s.unsignedTx = fr.decode(fr.encode({
      version: this.version,
      lockTime: this.lockTime,
      inputs: this.inputs.map(ir).map((i) => ({
        ...i,
        finalScriptSig: ct
      })),
      outputs: this.outputs.map(an)
    })), delete s.fallbackLocktime, delete s.txVersion) : (s.version = t, s.txVersion = this.version, s.inputCount = this.inputs.length, s.outputCount = this.outputs.length, s.fallbackLocktime && s.fallbackLocktime === on && delete s.fallbackLocktime), this.opts.bip174jsCompat && (e.length || e.push({}), r.length || r.push({})), (t === 0 ? Qa : Ja).encode({
      global: s,
      inputs: e,
      outputs: r
    });
  }
  // BIP370 lockTime (https://github.com/bitcoin/bips/blob/master/bip-0370.mediawiki#determining-lock-time)
  get lockTime() {
    let t = on, e = 0, r = on, s = 0;
    for (const i of this.inputs)
      i.requiredHeightLocktime && (t = Math.max(t, i.requiredHeightLocktime), e++), i.requiredTimeLocktime && (r = Math.max(r, i.requiredTimeLocktime), s++);
    return e && e >= s ? t : r !== on ? r : this.global.fallbackLocktime || on;
  }
  get version() {
    if (this.global.txVersion === void 0)
      throw new Error("No global.txVersion");
    return this.global.txVersion;
  }
  inputStatus(t) {
    this.checkInputIdx(t);
    const e = this.inputs[t];
    return e.finalScriptSig && e.finalScriptSig.length || e.finalScriptWitness && e.finalScriptWitness.length ? "finalized" : e.tapKeySig || e.tapScriptSig && e.tapScriptSig.length || e.partialSig && e.partialSig.length ? "signed" : "unsigned";
  }
  // Cannot replace unpackSighash, tests rely on very generic implemenetation with signing inputs outside of range
  // We will lose some vectors -> smaller test coverage of preimages (very important!)
  inputSighash(t) {
    this.checkInputIdx(t);
    const e = this.inputs[t].sighashType, r = e === void 0 ? Z.DEFAULT : e, s = r === Z.DEFAULT ? Z.ALL : r & 3;
    return { sigInputs: r & Z.ANYONECANPAY, sigOutputs: s };
  }
  // Very nice for debug purposes, but slow. If there is too much inputs/outputs to add, will be quadratic.
  // Some cache will be nice, but there chance to have bugs with cache invalidation
  signStatus() {
    let t = !0, e = !0, r = [], s = [];
    for (let i = 0; i < this.inputs.length; i++) {
      if (this.inputStatus(i) === "unsigned")
        continue;
      const { sigInputs: a, sigOutputs: c } = this.inputSighash(i);
      if (a === Z.ANYONECANPAY ? r.push(i) : t = !1, c === Z.ALL)
        e = !1;
      else if (c === Z.SINGLE)
        s.push(i);
      else if (c !== Z.NONE) throw new Error(`Wrong signature hash output type: ${c}`);
    }
    return { addInput: t, addOutput: e, inputs: r, outputs: s };
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
    for (const e of this.inputs)
      e.finalScriptWitness && e.finalScriptWitness.length && (t = !0);
    return t;
  }
  // https://en.bitcoin.it/wiki/Weight_units
  get weight() {
    if (!this.isFinal)
      throw new Error("Transaction is not finalized");
    let t = 32;
    const e = this.outputs.map(an);
    t += 4 * oe.encode(this.outputs.length).length;
    for (const r of e)
      t += 32 + 4 * te.encode(r.script).length;
    this.hasWitnesses && (t += 2), t += 4 * oe.encode(this.inputs.length).length;
    for (const r of this.inputs)
      t += 160 + 4 * te.encode(r.finalScriptSig || ct).length, this.hasWitnesses && r.finalScriptWitness && (t += Tr.encode(r.finalScriptWitness).length);
    return t;
  }
  get vsize() {
    return ep(this.weight);
  }
  toBytes(t = !1, e = !1) {
    return Un.encode({
      version: this.version,
      lockTime: this.lockTime,
      inputs: this.inputs.map(ir).map((r) => ({
        ...r,
        finalScriptSig: t && r.finalScriptSig || ct
      })),
      outputs: this.outputs.map(an),
      witnesses: this.inputs.map((r) => r.finalScriptWitness || []),
      segwitFlag: e && this.hasWitnesses
    });
  }
  get unsignedTx() {
    return this.toBytes(!1, !1);
  }
  get hex() {
    return k.encode(this.toBytes(!0, this.hasWitnesses));
  }
  get hash() {
    return k.encode(De(this.toBytes(!0)));
  }
  get id() {
    return k.encode(De(this.toBytes(!0)).reverse());
  }
  // Input stuff
  checkInputIdx(t) {
    if (!Number.isSafeInteger(t) || 0 > t || t >= this.inputs.length)
      throw new Error(`Wrong input index=${t}`);
  }
  getInput(t) {
    return this.checkInputIdx(t), Ss(this.inputs[t]);
  }
  get inputsLength() {
    return this.inputs.length;
  }
  // Modification
  addInput(t, e = !1) {
    if (!e && !this.signStatus().addInput)
      throw new Error("Tx has signed inputs, cannot add new one");
    return this.inputs.push(sc(t, void 0, void 0, this.opts.disableScriptCheck)), this.inputs.length - 1;
  }
  updateInput(t, e, r = !1) {
    this.checkInputIdx(t);
    let s;
    if (!r) {
      const i = this.signStatus();
      (!i.addInput || i.inputs.includes(t)) && (s = Rh);
    }
    this.inputs[t] = sc(e, this.inputs[t], s, this.opts.disableScriptCheck, this.opts.allowUnknown);
  }
  // Output stuff
  checkOutputIdx(t) {
    if (!Number.isSafeInteger(t) || 0 > t || t >= this.outputs.length)
      throw new Error(`Wrong output index=${t}`);
  }
  getOutput(t) {
    return this.checkOutputIdx(t), Ss(this.outputs[t]);
  }
  getOutputAddress(t, e = Fn) {
    const r = this.getOutput(t);
    if (r.script)
      return Qe(e).encode(dt.decode(r.script));
  }
  get outputsLength() {
    return this.outputs.length;
  }
  normalizeOutput(t, e, r) {
    let { amount: s, script: i } = t;
    if (s === void 0 && (s = e?.amount), typeof s != "bigint")
      throw new Error(`Wrong amount type, should be of type bigint in sats, but got ${s} of type ${typeof s}`);
    typeof i == "string" && (i = k.decode(i)), i === void 0 && (i = e?.script);
    let o = { ...e, ...t, amount: s, script: i };
    if (o.amount === void 0 && delete o.amount, o = io(Sr, o, e, r, this.opts.allowUnknown), ea.encode(o), o.script && !this.opts.allowUnknownOutputs && dt.decode(o.script).type === "unknown")
      throw new Error("Transaction/output: unknown output script type, there is a chance that input is unspendable. Pass allowUnknownOutputs=true, if you sure");
    return this.opts.disableScriptCheck || Tl(o.script, o.redeemScript, o.witnessScript), o;
  }
  addOutput(t, e = !1) {
    if (!e && !this.signStatus().addOutput)
      throw new Error("Tx has signed outputs, cannot add new one");
    return this.outputs.push(this.normalizeOutput(t)), this.outputs.length - 1;
  }
  updateOutput(t, e, r = !1) {
    this.checkOutputIdx(t);
    let s;
    if (!r) {
      const i = this.signStatus();
      (!i.addOutput || i.outputs.includes(t)) && (s = Ch);
    }
    this.outputs[t] = this.normalizeOutput(e, this.outputs[t], s);
  }
  addOutputAddress(t, e, r = Fn) {
    return this.addOutput({ script: dt.encode(Qe(r).decode(t)), amount: e });
  }
  // Utils
  get fee() {
    let t = 0n;
    for (const r of this.inputs) {
      const s = ns(r);
      if (!s)
        throw new Error("Empty input amount");
      t += s.amount;
    }
    const e = this.outputs.map(an);
    for (const r of e)
      t -= r.amount;
    return t;
  }
  // Signing
  // Based on https://github.com/bitcoin/bitcoin/blob/5871b5b5ab57a0caf9b7514eb162c491c83281d5/test/functional/test_framework/script.py#L624
  // There is optimization opportunity to re-use hashes for multiple inputs for witness v0/v1,
  // but we are trying to be less complicated for audit purpose for now.
  preimageLegacy(t, e, r) {
    const { isAny: s, isNone: i, isSingle: o } = nc(r);
    if (t < 0 || !Number.isSafeInteger(t))
      throw new Error(`Invalid input idx=${t}`);
    if (o && t >= this.outputs.length || t >= this.inputs.length)
      return fl.encode(1n);
    e = K.encode(K.decode(e).filter((l) => l !== "CODESEPARATOR"));
    let a = this.inputs.map(ir).map((l, d) => ({
      ...l,
      finalScriptSig: d === t ? e : ct
    }));
    s ? a = [a[t]] : (i || o) && (a = a.map((l, d) => ({
      ...l,
      sequence: d === t ? l.sequence : 0
    })));
    let c = this.outputs.map(an);
    i ? c = [] : o && (c = c.slice(0, t).fill(tp).concat([c[t]]));
    const u = Un.encode({
      lockTime: this.lockTime,
      version: this.version,
      segwitFlag: !1,
      inputs: a,
      outputs: c
    });
    return De(u, kn.encode(r));
  }
  preimageWitnessV0(t, e, r, s) {
    const { isAny: i, isNone: o, isSingle: a } = nc(r);
    let c = Hr, u = Hr, l = Hr;
    const d = this.inputs.map(ir), h = this.outputs.map(an);
    i || (c = De(...d.map(Ti.encode))), !i && !a && !o && (u = De(...d.map((y) => et.encode(y.sequence)))), !a && !o ? l = De(...h.map(hn.encode)) : a && t < h.length && (l = De(hn.encode(h[t])));
    const p = d[t];
    return De(kn.encode(this.version), c, u, at(32, !0).encode(p.txid), et.encode(p.index), te.encode(e), es.encode(s), et.encode(p.sequence), l, et.encode(this.lockTime), et.encode(r));
  }
  preimageWitnessV1(t, e, r, s, i = -1, o, a = 192, c) {
    if (!Array.isArray(s) || this.inputs.length !== s.length)
      throw new Error(`Invalid amounts array=${s}`);
    if (!Array.isArray(e) || this.inputs.length !== e.length)
      throw new Error(`Invalid prevOutScript array=${e}`);
    const u = [
      Ke.encode(0),
      Ke.encode(r),
      // U8 sigHash
      kn.encode(this.version),
      et.encode(this.lockTime)
    ], l = r === Z.DEFAULT ? Z.ALL : r & 3, d = r & Z.ANYONECANPAY, h = this.inputs.map(ir), p = this.outputs.map(an);
    d !== Z.ANYONECANPAY && u.push(...[
      h.map(Ti.encode),
      s.map(es.encode),
      e.map(te.encode),
      h.map((f) => et.encode(f.sequence))
    ].map((f) => Tt(de(...f)))), l === Z.ALL && u.push(Tt(de(...p.map(hn.encode))));
    const y = (c ? 1 : 0) | (o ? 2 : 0);
    if (u.push(new Uint8Array([y])), d === Z.ANYONECANPAY) {
      const f = h[t];
      u.push(Ti.encode(f), es.encode(s[t]), te.encode(e[t]), et.encode(f.sequence));
    } else
      u.push(et.encode(t));
    return y & 1 && u.push(Tt(te.encode(c || ct))), l === Z.SINGLE && u.push(t < p.length ? Tt(hn.encode(p[t])) : Hr), o && u.push(hr(o, a), Ke.encode(0), kn.encode(i)), Yo("TapSighash", ...u);
  }
  // Signer can be privateKey OR instance of bip32 HD stuff
  signIdx(t, e, r, s) {
    this.checkInputIdx(e);
    const i = this.inputs[e], o = ic(i, this.opts.allowLegacyWitnessUtxo);
    if (!it(t)) {
      if (!i.bip32Derivation || !i.bip32Derivation.length)
        throw new Error("bip32Derivation: empty");
      const l = i.bip32Derivation.filter((h) => h[1].fingerprint == t.fingerprint).map(([h, { path: p }]) => {
        let y = t;
        for (const f of p)
          y = y.deriveChild(f);
        if (!ft(y.publicKey, h))
          throw new Error("bip32Derivation: wrong pubKey");
        if (!y.privateKey)
          throw new Error("bip32Derivation: no privateKey");
        return y;
      });
      if (!l.length)
        throw new Error(`bip32Derivation: no items with fingerprint=${t.fingerprint}`);
      let d = !1;
      for (const h of l)
        this.signIdx(h.privateKey, e) && (d = !0);
      return d;
    }
    r ? r.forEach(op) : r = [o.defaultSighash];
    const a = o.sighash;
    if (!r.includes(a))
      throw new Error(`Input with not allowed sigHash=${a}. Allowed: ${r.join(", ")}`);
    const { sigOutputs: c } = this.inputSighash(e);
    if (c === Z.SINGLE && e >= this.outputs.length)
      throw new Error(`Input with sighash SINGLE, but there is no output with corresponding index=${e}`);
    const u = ns(i);
    if (o.txType === "taproot") {
      const l = this.inputs.map(ns), d = l.map((g) => g.script), h = l.map((g) => g.amount);
      let p = !1, y = qo(t), f = i.tapMerkleRoot || ct;
      if (i.tapInternalKey) {
        const { pubKey: g, privKey: m } = ip(t, y, i.tapInternalKey, f), [S] = no(i.tapInternalKey, f);
        if (ft(S, g)) {
          const I = this.preimageWitnessV1(e, d, a, h), E = de(Wa(I, m, s), a !== Z.DEFAULT ? new Uint8Array([a]) : ct);
          this.updateInput(e, { tapKeySig: E }, !0), p = !0;
        }
      }
      if (i.tapLeafScript) {
        i.tapScriptSig = i.tapScriptSig || [];
        for (const [g, m] of i.tapLeafScript) {
          const S = m.subarray(0, -1), I = K.decode(S), E = m[m.length - 1], C = hr(S, E);
          if (I.findIndex((w) => it(w) && ft(w, y)) === -1)
            continue;
          const X = this.preimageWitnessV1(e, d, a, h, void 0, S, E), tt = de(Wa(X, t, s), a !== Z.DEFAULT ? new Uint8Array([a]) : ct);
          this.updateInput(e, { tapScriptSig: [[{ pubKey: y, leafHash: C }, tt]] }, !0), p = !0;
        }
      }
      if (!p)
        throw new Error("No taproot scripts signed");
      return !0;
    } else {
      const l = gl(t);
      let d = !1;
      const h = pl(l);
      for (const f of K.decode(o.lastScript))
        it(f) && (ft(f, l) || ft(f, h)) && (d = !0);
      if (!d)
        throw new Error(`Input script doesn't have pubKey: ${o.lastScript}`);
      let p;
      if (o.txType === "legacy")
        p = this.preimageLegacy(e, o.lastScript, a);
      else if (o.txType === "segwit") {
        let f = o.lastScript;
        o.last.type === "wpkh" && (f = dt.encode({ type: "pkh", hash: o.last.hash })), p = this.preimageWitnessV0(e, f, a, u.amount);
      } else
        throw new Error(`Transaction/sign: unknown tx type: ${o.txType}`);
      const y = Th(p, t, this.opts.lowR);
      this.updateInput(e, {
        partialSig: [[l, de(y, new Uint8Array([a]))]]
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
  sign(t, e, r) {
    let s = 0;
    for (let i = 0; i < this.inputs.length; i++)
      try {
        this.signIdx(t, i, e, r) && s++;
      } catch {
      }
    if (!s)
      throw new Error("No inputs signed");
    return s;
  }
  finalizeIdx(t) {
    if (this.checkInputIdx(t), this.fee < 0n)
      throw new Error("Outputs spends more than inputs amount");
    const e = this.inputs[t], r = ic(e, this.opts.allowLegacyWitnessUtxo);
    if (r.txType === "taproot") {
      if (e.tapKeySig)
        e.finalScriptWitness = [e.tapKeySig];
      else if (e.tapLeafScript && e.tapScriptSig) {
        const c = e.tapLeafScript.sort((u, l) => pe.encode(u[0]).length - pe.encode(l[0]).length);
        for (const [u, l] of c) {
          const d = l.slice(0, -1), h = l[l.length - 1], p = dt.decode(d), y = hr(d, h), f = e.tapScriptSig.filter((m) => ft(m[0].leafHash, y));
          let g = [];
          if (p.type === "tr_ms") {
            const m = p.m, S = p.pubkeys;
            let I = 0;
            for (const E of S) {
              const C = f.findIndex((M) => ft(M[0].pubKey, E));
              if (I === m || C === -1) {
                g.push(ct);
                continue;
              }
              g.push(f[C][1]), I++;
            }
            if (I !== m)
              continue;
          } else if (p.type === "tr_ns") {
            for (const m of p.pubkeys) {
              const S = f.findIndex((I) => ft(I[0].pubKey, m));
              S !== -1 && g.push(f[S][1]);
            }
            if (g.length !== p.pubkeys.length)
              continue;
          } else if (p.type === "unknown" && this.opts.allowUnknownInputs) {
            const m = K.decode(d);
            if (g = f.map(([{ pubKey: S }, I]) => {
              const E = m.findIndex((C) => it(C) && ft(C, S));
              if (E === -1)
                throw new Error("finalize/taproot: cannot find position of pubkey in script");
              return { signature: I, pos: E };
            }).sort((S, I) => S.pos - I.pos).map((S) => S.signature), !g.length)
              continue;
          } else {
            const m = this.opts.customScripts;
            if (m)
              for (const S of m) {
                if (!S.finalizeTaproot)
                  continue;
                const I = K.decode(d), E = S.encode(I);
                if (E === void 0)
                  continue;
                const C = S.finalizeTaproot(d, E, f);
                if (C) {
                  e.finalScriptWitness = C.concat(pe.encode(u)), e.finalScriptSig = ct, xi(e);
                  return;
                }
              }
            throw new Error("Finalize: Unknown tapLeafScript");
          }
          e.finalScriptWitness = g.reverse().concat([d, pe.encode(u)]);
          break;
        }
        if (!e.finalScriptWitness)
          throw new Error("finalize/taproot: empty witness");
      } else
        throw new Error("finalize/taproot: unknown input");
      e.finalScriptSig = ct, xi(e);
      return;
    }
    if (!e.partialSig || !e.partialSig.length)
      throw new Error("Not enough partial sign");
    let s = ct, i = [];
    if (r.last.type === "ms") {
      const c = r.last.m, u = r.last.pubkeys;
      let l = [];
      for (const d of u) {
        const h = e.partialSig.find((p) => ft(d, p[0]));
        h && l.push(h[1]);
      }
      if (l = l.slice(0, c), l.length !== c)
        throw new Error(`Multisig: wrong signatures count, m=${c} n=${u.length} signatures=${l.length}`);
      s = K.encode([0, ...l]);
    } else if (r.last.type === "pk")
      s = K.encode([e.partialSig[0][1]]);
    else if (r.last.type === "pkh")
      s = K.encode([e.partialSig[0][1], e.partialSig[0][0]]);
    else if (r.last.type === "wpkh")
      s = ct, i = [e.partialSig[0][1], e.partialSig[0][0]];
    else if (r.last.type === "unknown" && !this.opts.allowUnknownInputs)
      throw new Error("Unknown inputs not allowed");
    let o, a;
    if (r.type.includes("wsh-") && (s.length && r.lastScript.length && (i = K.decode(s).map((c) => {
      if (c === 0)
        return ct;
      if (it(c))
        return c;
      throw new Error(`Wrong witness op=${c}`);
    })), i = i.concat(r.lastScript)), r.txType === "segwit" && (a = i), r.type.startsWith("sh-wsh-") ? o = K.encode([K.encode([0, Tt(r.lastScript)])]) : r.type.startsWith("sh-") ? o = K.encode([...K.decode(s), r.lastScript]) : r.type.startsWith("wsh-") || r.txType !== "segwit" && (o = s), !o && !a)
      throw new Error("Unknown error finalizing input");
    o && (e.finalScriptSig = o), a && (e.finalScriptWitness = a), xi(e);
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
    const e = this.global.unsignedTx ? fr.encode(this.global.unsignedTx) : ct, r = t.global.unsignedTx ? fr.encode(t.global.unsignedTx) : ct;
    if (!ft(e, r))
      throw new Error("Transaction/combine: different unsigned tx");
    this.global = io(Qo, this.global, t.global, void 0, this.opts.allowUnknown);
    for (let s = 0; s < this.inputs.length; s++)
      this.updateInput(s, t.inputs[s], !0);
    for (let s = 0; s < this.outputs.length; s++)
      this.updateOutput(s, t.outputs[s], !0);
    return this;
  }
  clone() {
    return rs.fromPSBT(this.toPSBT(this.opts.PSBTVersion), this.opts);
  }
};
class Je extends ne {
  constructor(t) {
    super(Si(t));
  }
  static fromPSBT(t, e) {
    return ne.fromPSBT(t, Si(e));
  }
  static fromRaw(t, e) {
    return ne.fromRaw(t, Si(e));
  }
}
Je.ARK_TX_OPTS = {
  allowUnknown: !0,
  allowUnknownOutputs: !0,
  allowUnknownInputs: !0
};
function Si(n) {
  return { ...Je.ARK_TX_OPTS, ...n };
}
class ra extends Error {
  idx;
  // Indice of participant
  constructor(t, e) {
    super(e), this.idx = t;
  }
}
const { taggedHash: Al, pointToBytes: Fr } = Re.utils, ae = ze.Point, G = ae.Fn, me = ze.lengths.publicKey, uo = new Uint8Array(me), oc = Xe(at(33), {
  decode: (n) => Ir(n) ? uo : n.toBytes(!0),
  encode: (n) => xr(n, uo) ? ae.ZERO : ae.fromBytes(n)
}), ac = Rt(fl, (n) => (Bu("n", n, 1n, G.ORDER), n)), Nn = Et({ R1: oc, R2: oc }), kl = Et({ k1: ac, k2: ac, publicKey: at(me) });
function cc(n, ...t) {
}
function qt(n, ...t) {
  if (!Array.isArray(n))
    throw new Error("expected array");
  n.forEach((e) => q(e, ...t));
}
function uc(n) {
  if (!Array.isArray(n))
    throw new Error("expected array");
  n.forEach((t, e) => {
    if (typeof t != "boolean")
      throw new Error("expected boolean in xOnly array, got" + t + "(" + e + ")");
  });
}
const vs = (n, ...t) => G.create(G.fromBytes(Al(n, ...t), !0)), or = (n, t) => Cr(n.y) ? t : G.neg(t);
function pn(n) {
  return ae.BASE.multiply(n);
}
function Ir(n) {
  return n.equals(ae.ZERO);
}
function lo(n) {
  return qt(n, me), n.sort(Es);
}
function Bl(n) {
  qt(n, me);
  for (let t = 1; t < n.length; t++)
    if (!xr(n[t], n[0]))
      return n[t];
  return uo;
}
function Ol(n) {
  return qt(n, me), Al("KeyAgg list", ...n);
}
function $l(n, t, e) {
  return q(n, me), q(t, me), xr(n, t) ? 1n : vs("KeyAgg coefficient", e, n);
}
function fo(n, t = [], e = []) {
  if (qt(n, me), qt(t, 32), t.length !== e.length)
    throw new Error("The tweaks and isXonly arrays must have the same length");
  const r = Bl(n), s = Ol(n);
  let i = ae.ZERO;
  for (let c = 0; c < n.length; c++) {
    let u;
    try {
      u = ae.fromBytes(n[c]);
    } catch {
      throw new ra(c, "pubkey");
    }
    i = i.add(u.multiply($l(n[c], r, s)));
  }
  let o = G.ONE, a = G.ZERO;
  for (let c = 0; c < t.length; c++) {
    const u = e[c] && !Cr(i.y) ? G.neg(G.ONE) : G.ONE, l = G.fromBytes(t[c]);
    if (i = i.multiply(u).add(pn(l)), Ir(i))
      throw new Error("The result of tweaking cannot be infinity");
    o = G.mul(u, o), a = G.add(l, G.mul(u, a));
  }
  return { aggPublicKey: i, gAcc: o, tweakAcc: a };
}
const lc = (n, t, e, r, s, i) => vs("MuSig/nonce", n, new Uint8Array([t.length]), t, new Uint8Array([e.length]), e, s, $r(i.length, 4), i, new Uint8Array([r]));
function cp(n, t, e = new Uint8Array(0), r, s = new Uint8Array(0), i = Or(32)) {
  if (q(n, me), cc(t, 32), q(e), ![0, 32].includes(e.length))
    throw new Error("wrong aggPublicKey");
  cc(), q(s), q(i, 32);
  const o = Uint8Array.of(0), a = lc(i, n, e, 0, o, s), c = lc(i, n, e, 1, o, s);
  return {
    secret: kl.encode({ k1: a, k2: c, publicKey: n }),
    public: Nn.encode({ R1: pn(a), R2: pn(c) })
  };
}
function up(n) {
  qt(n, 66);
  let t = ae.ZERO, e = ae.ZERO;
  for (let r = 0; r < n.length; r++) {
    const s = n[r];
    try {
      const { R1: i, R2: o } = Nn.decode(s);
      if (Ir(i) || Ir(o))
        throw new Error("infinity point");
      t = t.add(i), e = e.add(o);
    } catch {
      throw new ra(r, "pubnonce");
    }
  }
  return Nn.encode({ R1: t, R2: e });
}
class lp {
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
  constructor(t, e, r, s = [], i = []) {
    if (qt(e, 33), qt(s, 32), uc(i), q(r), s.length !== i.length)
      throw new Error("The tweaks and isXonly arrays must have the same length");
    const { aggPublicKey: o, gAcc: a, tweakAcc: c } = fo(e, s, i), { R1: u, R2: l } = Nn.decode(t);
    this.publicKeys = e, this.Q = o, this.gAcc = a, this.tweakAcc = c, this.b = vs("MuSig/noncecoef", t, Fr(o), r);
    const d = u.add(l.multiply(this.b));
    this.R = Ir(d) ? ae.BASE : d, this.e = vs("BIP0340/challenge", Fr(this.R), Fr(o), r), this.tweaks = s, this.isXonly = i, this.L = Ol(e), this.secondKey = Bl(e);
  }
  /**
   * Calculates the key aggregation coefficient for a given point.
   * @private
   * @param P The point to calculate the coefficient for.
   * @returns The key aggregation coefficient as a bigint.
   * @throws {Error} If the provided public key is not included in the list of pubkeys.
   */
  getSessionKeyAggCoeff(t) {
    const { publicKeys: e } = this, r = t.toBytes(!0);
    if (!e.some((i) => xr(i, r)))
      throw new Error("The signer's pubkey must be included in the list of pubkeys");
    return $l(r, this.secondKey, this.L);
  }
  partialSigVerifyInternal(t, e, r) {
    const { Q: s, gAcc: i, b: o, R: a, e: c } = this, u = G.fromBytes(t, !0);
    if (!G.isValid(u))
      return !1;
    const { R1: l, R2: d } = Nn.decode(e), h = l.add(d.multiply(o)), p = Cr(a.y) ? h : h.negate(), y = ae.fromBytes(r), f = this.getSessionKeyAggCoeff(y), g = G.mul(or(s, 1n), i), m = pn(u), S = p.add(y.multiply(G.mul(c, G.mul(f, g))));
    return m.equals(S);
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
  sign(t, e, r = !1) {
    if (q(e, 32), typeof r != "boolean")
      throw new Error("expected boolean");
    const { Q: s, gAcc: i, b: o, R: a, e: c } = this, { k1: u, k2: l, publicKey: d } = kl.decode(t);
    if (t.fill(0, 0, 64), !G.isValid(u))
      throw new Error("wrong k1");
    if (!G.isValid(l))
      throw new Error("wrong k1");
    const h = or(a, u), p = or(a, l), y = G.fromBytes(e);
    if (G.is0(y))
      throw new Error("wrong d_");
    const f = pn(y), g = f.toBytes(!0);
    if (!xr(g, d))
      throw new Error("Public key does not match nonceGen argument");
    const m = this.getSessionKeyAggCoeff(f), S = or(s, 1n), I = G.mul(S, G.mul(i, y)), E = G.add(h, G.add(G.mul(o, p), G.mul(c, G.mul(m, I)))), C = G.toBytes(E);
    if (!r) {
      const M = Nn.encode({
        R1: pn(u),
        R2: pn(l)
      });
      if (!this.partialSigVerifyInternal(C, M, g))
        throw new Error("Partial signature verification failed");
    }
    return C;
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
  partialSigVerify(t, e, r) {
    const { publicKeys: s, tweaks: i, isXonly: o } = this;
    if (q(t, 32), qt(e, 66), qt(s, me), qt(i, 32), uc(o), Ye(r), e.length !== s.length)
      throw new Error("The pubNonces and publicKeys arrays must have the same length");
    if (i.length !== o.length)
      throw new Error("The tweaks and isXonly arrays must have the same length");
    if (r >= e.length)
      throw new Error("index outside of pubKeys/pubNonces");
    return this.partialSigVerifyInternal(t, e[r], s[r]);
  }
  /**
   * Aggregates partial signatures from multiple signers into a single final signature.
   * @param partialSigs An array of partial signatures from each signer (Uint8Array).
   * @param sessionCtx The session context containing all necessary information for signing.
   * @returns The final aggregate signature (Uint8Array).
   * @throws {Error} If the input is invalid, such as wrong array sizes, invalid signature.
   */
  partialSigAgg(t) {
    qt(t, 32);
    const { Q: e, tweakAcc: r, R: s, e: i } = this;
    let o = 0n;
    for (let c = 0; c < t.length; c++) {
      const u = G.fromBytes(t[c], !0);
      if (!G.isValid(u))
        throw new ra(c, "psig");
      o = G.add(o, u);
    }
    const a = or(e, 1n);
    return o = G.add(o, G.mul(i, G.mul(a, r))), re(Fr(s), G.toBytes(o));
  }
}
function fp(n) {
  const t = cp(n);
  return { secNonce: t.secret, pubNonce: t.public };
}
function dp(n) {
  return up(n);
}
/*! noble-hashes - MIT License (c) 2022 Paul Miller (paulmillr.com) */
function sa(n) {
  return n instanceof Uint8Array || ArrayBuffer.isView(n) && n.constructor.name === "Uint8Array";
}
function En(n, t = "") {
  if (!Number.isSafeInteger(n) || n < 0) {
    const e = t && `"${t}" `;
    throw new Error(`${e}expected integer >0, got ${n}`);
  }
}
function st(n, t, e = "") {
  const r = sa(n), s = n?.length, i = t !== void 0;
  if (!r || i && s !== t) {
    const o = e && `"${e}" `, a = i ? ` of length ${t}` : "", c = r ? `length=${s}` : `type=${typeof n}`;
    throw new Error(o + "expected Uint8Array" + a + ", got " + c);
  }
  return n;
}
function Ul(n) {
  if (typeof n != "function" || typeof n.create != "function")
    throw new Error("Hash must wrapped by utils.createHasher");
  En(n.outputLen), En(n.blockLen);
}
function Is(n, t = !0) {
  if (n.destroyed)
    throw new Error("Hash instance has been destroyed");
  if (t && n.finished)
    throw new Error("Hash#digest() has already been called");
}
function hp(n, t) {
  st(n, void 0, "digestInto() output");
  const e = t.outputLen;
  if (n.length < e)
    throw new Error('"digestInto() output" expected to be of length >=' + e);
}
function As(...n) {
  for (let t = 0; t < n.length; t++)
    n[t].fill(0);
}
function vi(n) {
  return new DataView(n.buffer, n.byteOffset, n.byteLength);
}
function le(n, t) {
  return n << 32 - t | n >>> t;
}
const Nl = /* @ts-ignore */ typeof Uint8Array.from([]).toHex == "function" && typeof Uint8Array.fromHex == "function", pp = /* @__PURE__ */ Array.from({ length: 256 }, (n, t) => t.toString(16).padStart(2, "0"));
function ni(n) {
  if (st(n), Nl)
    return n.toHex();
  let t = "";
  for (let e = 0; e < n.length; e++)
    t += pp[n[e]];
  return t;
}
const Te = { _0: 48, _9: 57, A: 65, F: 70, a: 97, f: 102 };
function fc(n) {
  if (n >= Te._0 && n <= Te._9)
    return n - Te._0;
  if (n >= Te.A && n <= Te.F)
    return n - (Te.A - 10);
  if (n >= Te.a && n <= Te.f)
    return n - (Te.a - 10);
}
function ks(n) {
  if (typeof n != "string")
    throw new Error("hex string expected, got " + typeof n);
  if (Nl)
    return Uint8Array.fromHex(n);
  const t = n.length, e = t / 2;
  if (t % 2)
    throw new Error("hex string expected, got unpadded hex of length " + t);
  const r = new Uint8Array(e);
  for (let s = 0, i = 0; s < e; s++, i += 2) {
    const o = fc(n.charCodeAt(i)), a = fc(n.charCodeAt(i + 1));
    if (o === void 0 || a === void 0) {
      const c = n[i] + n[i + 1];
      throw new Error('hex string expected, got non-hex character "' + c + '" at index ' + i);
    }
    r[s] = o * 16 + a;
  }
  return r;
}
function ge(...n) {
  let t = 0;
  for (let r = 0; r < n.length; r++) {
    const s = n[r];
    st(s), t += s.length;
  }
  const e = new Uint8Array(t);
  for (let r = 0, s = 0; r < n.length; r++) {
    const i = n[r];
    e.set(i, s), s += i.length;
  }
  return e;
}
function gp(n, t = {}) {
  const e = (s, i) => n(i).update(s).digest(), r = n(void 0);
  return e.outputLen = r.outputLen, e.blockLen = r.blockLen, e.create = (s) => n(s), Object.assign(e, t), Object.freeze(e);
}
function ri(n = 32) {
  const t = typeof globalThis == "object" ? globalThis.crypto : null;
  if (typeof t?.getRandomValues != "function")
    throw new Error("crypto.getRandomValues must be defined");
  return t.getRandomValues(new Uint8Array(n));
}
const yp = (n) => ({
  oid: Uint8Array.from([6, 9, 96, 134, 72, 1, 101, 3, 4, 2, n])
});
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const ia = /* @__PURE__ */ BigInt(0), ho = /* @__PURE__ */ BigInt(1);
function Bs(n, t = "") {
  if (typeof n != "boolean") {
    const e = t && `"${t}" `;
    throw new Error(e + "expected boolean, got type=" + typeof n);
  }
  return n;
}
function Rl(n) {
  if (typeof n == "bigint") {
    if (!ss(n))
      throw new Error("positive bigint expected, got " + n);
  } else
    En(n);
  return n;
}
function zr(n) {
  const t = Rl(n).toString(16);
  return t.length & 1 ? "0" + t : t;
}
function Cl(n) {
  if (typeof n != "string")
    throw new Error("hex string expected, got " + typeof n);
  return n === "" ? ia : BigInt("0x" + n);
}
function tr(n) {
  return Cl(ni(n));
}
function Ll(n) {
  return Cl(ni(wp(st(n)).reverse()));
}
function oa(n, t) {
  En(t), n = Rl(n);
  const e = ks(n.toString(16).padStart(t * 2, "0"));
  if (e.length !== t)
    throw new Error("number too large");
  return e;
}
function Pl(n, t) {
  return oa(n, t).reverse();
}
function wp(n) {
  return Uint8Array.from(n);
}
function mp(n) {
  return Uint8Array.from(n, (t, e) => {
    const r = t.charCodeAt(0);
    if (t.length !== 1 || r > 127)
      throw new Error(`string contains non-ASCII character "${n[e]}" with code ${r} at position ${e}`);
    return r;
  });
}
const ss = (n) => typeof n == "bigint" && ia <= n;
function bp(n, t, e) {
  return ss(n) && ss(t) && ss(e) && t <= n && n < e;
}
function Ep(n, t, e, r) {
  if (!bp(t, e, r))
    throw new Error("expected valid " + n + ": " + e + " <= n < " + r + ", got " + t);
}
function xp(n) {
  let t;
  for (t = 0; n > ia; n >>= ho, t += 1)
    ;
  return t;
}
const aa = (n) => (ho << BigInt(n)) - ho;
function Tp(n, t, e) {
  if (En(n, "hashLen"), En(t, "qByteLen"), typeof e != "function")
    throw new Error("hmacFn must be a function");
  const r = (g) => new Uint8Array(g), s = Uint8Array.of(), i = Uint8Array.of(0), o = Uint8Array.of(1), a = 1e3;
  let c = r(n), u = r(n), l = 0;
  const d = () => {
    c.fill(1), u.fill(0), l = 0;
  }, h = (...g) => e(u, ge(c, ...g)), p = (g = s) => {
    u = h(i, g), c = h(), g.length !== 0 && (u = h(o, g), c = h());
  }, y = () => {
    if (l++ >= a)
      throw new Error("drbg: tried max amount of iterations");
    let g = 0;
    const m = [];
    for (; g < t; ) {
      c = h();
      const S = c.slice();
      m.push(S), g += c.length;
    }
    return ge(...m);
  };
  return (g, m) => {
    d(), p(g);
    let S;
    for (; !(S = m(y())); )
      p();
    return d(), S;
  };
}
function ca(n, t = {}, e = {}) {
  if (!n || typeof n != "object")
    throw new Error("expected valid options object");
  function r(i, o, a) {
    const c = n[i];
    if (a && c === void 0)
      return;
    const u = typeof c;
    if (u !== o || c === null)
      throw new Error(`param "${i}" is invalid: expected ${o}, got ${u}`);
  }
  const s = (i, o) => Object.entries(i).forEach(([a, c]) => r(a, c, o));
  s(t, !1), s(e, !0);
}
function dc(n) {
  const t = /* @__PURE__ */ new WeakMap();
  return (e, ...r) => {
    const s = t.get(e);
    if (s !== void 0)
      return s;
    const i = n(e, ...r);
    return t.set(e, i), i;
  };
}
/*! noble-secp256k1 - MIT License (c) 2019 Paul Miller (paulmillr.com) */
const _l = {
  p: 0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffefffffc2fn,
  n: 0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141n,
  h: 1n,
  a: 0n,
  b: 7n,
  Gx: 0x79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798n,
  Gy: 0x483ada7726a3c4655da4fbfc0e1108a8fd17b448a68554199c47d08ffb10d4b8n
}, { p: je, n: tn, Gx: Sp, Gy: vp, b: Dl } = _l, bt = 32, xn = 64, Os = {
  publicKey: bt + 1,
  publicKeyUncompressed: xn + 1,
  signature: xn,
  seed: bt + bt / 2
}, Ip = (...n) => {
  "captureStackTrace" in Error && typeof Error.captureStackTrace == "function" && Error.captureStackTrace(...n);
}, nt = (n = "") => {
  const t = new Error(n);
  throw Ip(t, nt), t;
}, Ap = (n) => typeof n == "bigint", kp = (n) => typeof n == "string", Bp = (n) => n instanceof Uint8Array || ArrayBuffer.isView(n) && n.constructor.name === "Uint8Array", Mt = (n, t, e = "") => {
  const r = Bp(n), s = n?.length, i = t !== void 0;
  if (!r || i && s !== t) {
    const o = e && `"${e}" `, a = i ? ` of length ${t}` : "", c = r ? `length=${s}` : `type=${typeof n}`;
    nt(o + "expected Uint8Array" + a + ", got " + c);
  }
  return n;
}, en = (n) => new Uint8Array(n), Vl = (n, t) => n.toString(16).padStart(t, "0"), Ml = (n) => Array.from(Mt(n)).map((t) => Vl(t, 2)).join(""), Se = { _0: 48, _9: 57, A: 65, F: 70, a: 97, f: 102 }, hc = (n) => {
  if (n >= Se._0 && n <= Se._9)
    return n - Se._0;
  if (n >= Se.A && n <= Se.F)
    return n - (Se.A - 10);
  if (n >= Se.a && n <= Se.f)
    return n - (Se.a - 10);
}, Hl = (n) => {
  const t = "hex invalid";
  if (!kp(n))
    return nt(t);
  const e = n.length, r = e / 2;
  if (e % 2)
    return nt(t);
  const s = en(r);
  for (let i = 0, o = 0; i < r; i++, o += 2) {
    const a = hc(n.charCodeAt(o)), c = hc(n.charCodeAt(o + 1));
    if (a === void 0 || c === void 0)
      return nt(t);
    s[i] = a * 16 + c;
  }
  return s;
}, Fl = () => globalThis?.crypto, pc = () => Fl()?.subtle ?? nt("crypto.subtle must be defined, consider polyfill"), be = (...n) => {
  const t = en(n.reduce((r, s) => r + Mt(s).length, 0));
  let e = 0;
  return n.forEach((r) => {
    t.set(r, e), e += r.length;
  }), t;
}, si = (n = bt) => Fl().getRandomValues(en(n)), Ar = BigInt, Tn = (n, t, e, r = "bad number: out of range") => Ap(n) && t <= n && n < e ? n : nt(r), V = (n, t = je) => {
  const e = n % t;
  return e >= 0n ? e : t + e;
}, Oe = (n) => V(n, tn), zl = (n, t) => {
  (n === 0n || t <= 0n) && nt("no inverse n=" + n + " mod=" + t);
  let e = V(n, t), r = t, s = 0n, i = 1n;
  for (; e !== 0n; ) {
    const o = r / e, a = r % e, c = s - i * o;
    r = e, e = a, s = i, i = c;
  }
  return r === 1n ? V(s, t) : nt("no inverse");
}, Kl = (n) => {
  const t = oi[n];
  return typeof t != "function" && nt("hashes." + n + " not set"), t;
}, Ii = (n) => n instanceof kt ? n : nt("Point expected"), jl = (n) => V(V(n * n) * n + Dl), gc = (n) => Tn(n, 0n, je), is = (n) => Tn(n, 1n, je), po = (n) => Tn(n, 1n, tn), zn = (n) => (n & 1n) === 0n, ii = (n) => Uint8Array.of(n), Op = (n) => ii(zn(n) ? 2 : 3), Wl = (n) => {
  const t = jl(is(n));
  let e = 1n;
  for (let r = t, s = (je + 1n) / 4n; s > 0n; s >>= 1n)
    s & 1n && (e = e * r % je), r = r * r % je;
  return V(e * e) === t ? e : nt("sqrt invalid");
};
class kt {
  static BASE;
  static ZERO;
  X;
  Y;
  Z;
  constructor(t, e, r) {
    this.X = gc(t), this.Y = is(e), this.Z = gc(r), Object.freeze(this);
  }
  static CURVE() {
    return _l;
  }
  /** Create 3d xyz point from 2d xy. (0, 0) => (0, 1, 0), not (0, 0, 1) */
  static fromAffine(t) {
    const { x: e, y: r } = t;
    return e === 0n && r === 0n ? un : new kt(e, r, 1n);
  }
  /** Convert Uint8Array or hex string to Point. */
  static fromBytes(t) {
    Mt(t);
    const { publicKey: e, publicKeyUncompressed: r } = Os;
    let s;
    const i = t.length, o = t[0], a = t.subarray(1), c = Kn(a, 0, bt);
    if (i === e && (o === 2 || o === 3)) {
      let u = Wl(c);
      const l = zn(u);
      zn(Ar(o)) !== l && (u = V(-u)), s = new kt(c, u, 1n);
    }
    return i === r && o === 4 && (s = new kt(c, Kn(a, bt, xn), 1n)), s ? s.assertValidity() : nt("bad point: not on curve");
  }
  static fromHex(t) {
    return kt.fromBytes(Hl(t));
  }
  get x() {
    return this.toAffine().x;
  }
  get y() {
    return this.toAffine().y;
  }
  /** Equality check: compare points P&Q. */
  equals(t) {
    const { X: e, Y: r, Z: s } = this, { X: i, Y: o, Z: a } = Ii(t), c = V(e * a), u = V(i * s), l = V(r * a), d = V(o * s);
    return c === u && l === d;
  }
  is0() {
    return this.equals(un);
  }
  /** Flip point over y coordinate. */
  negate() {
    return new kt(this.X, V(-this.Y), this.Z);
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
    const { X: e, Y: r, Z: s } = this, { X: i, Y: o, Z: a } = Ii(t), c = 0n, u = Dl;
    let l = 0n, d = 0n, h = 0n;
    const p = V(u * 3n);
    let y = V(e * i), f = V(r * o), g = V(s * a), m = V(e + r), S = V(i + o);
    m = V(m * S), S = V(y + f), m = V(m - S), S = V(e + s);
    let I = V(i + a);
    return S = V(S * I), I = V(y + g), S = V(S - I), I = V(r + s), l = V(o + a), I = V(I * l), l = V(f + g), I = V(I - l), h = V(c * S), l = V(p * g), h = V(l + h), l = V(f - h), h = V(f + h), d = V(l * h), f = V(y + y), f = V(f + y), g = V(c * g), S = V(p * S), f = V(f + g), g = V(y - g), g = V(c * g), S = V(S + g), y = V(f * S), d = V(d + y), y = V(I * S), l = V(m * l), l = V(l - y), y = V(m * f), h = V(I * h), h = V(h + y), new kt(l, d, h);
  }
  subtract(t) {
    return this.add(Ii(t).negate());
  }
  /**
   * Point-by-scalar multiplication. Scalar must be in range 1 <= n < CURVE.n.
   * Uses {@link wNAF} for base point.
   * Uses fake point to mitigate side-channel leakage.
   * @param n scalar by which point is multiplied
   * @param safe safe mode guards against timing attacks; unsafe mode is faster
   */
  multiply(t, e = !0) {
    if (!e && t === 0n)
      return un;
    if (po(t), t === 1n)
      return this;
    if (this.equals(nn))
      return eg(t).p;
    let r = un, s = nn;
    for (let i = this; t > 0n; i = i.double(), t >>= 1n)
      t & 1n ? r = r.add(i) : e && (s = s.add(i));
    return r;
  }
  multiplyUnsafe(t) {
    return this.multiply(t, !1);
  }
  /** Convert point to 2d xy affine point. (X, Y, Z) ∋ (x=X/Z, y=Y/Z) */
  toAffine() {
    const { X: t, Y: e, Z: r } = this;
    if (this.equals(un))
      return { x: 0n, y: 0n };
    if (r === 1n)
      return { x: t, y: e };
    const s = zl(r, je);
    return V(r * s) !== 1n && nt("inverse invalid"), { x: V(t * s), y: V(e * s) };
  }
  /** Checks if the point is valid and on-curve. */
  assertValidity() {
    const { x: t, y: e } = this.toAffine();
    return is(t), is(e), V(e * e) === jl(t) ? this : nt("bad point: not on curve");
  }
  /** Converts point to 33/65-byte Uint8Array. */
  toBytes(t = !0) {
    const { x: e, y: r } = this.assertValidity().toAffine(), s = zt(e);
    return t ? be(Op(r), s) : be(ii(4), s, zt(r));
  }
  toHex(t) {
    return Ml(this.toBytes(t));
  }
}
const nn = new kt(Sp, vp, 1n), un = new kt(0n, 1n, 0n);
kt.BASE = nn;
kt.ZERO = un;
const $p = (n, t, e) => nn.multiply(t, !1).add(n.multiply(e, !1)).assertValidity(), rn = (n) => Ar("0x" + (Ml(n) || "0")), Kn = (n, t, e) => rn(n.subarray(t, e)), Up = 2n ** 256n, zt = (n) => Hl(Vl(Tn(n, 0n, Up), xn)), Gl = (n) => {
  const t = rn(Mt(n, bt, "secret key"));
  return Tn(t, 1n, tn, "invalid secret key: outside of range");
}, ql = (n) => n > tn >> 1n, Np = (n) => {
  [0, 1, 2, 3].includes(n) || nt("recovery id must be valid and present");
}, Rp = (n) => {
  n != null && !yc.includes(n) && nt(`Signature format must be one of: ${yc.join(", ")}`), n === Zl && nt('Signature format "der" is not supported: switch to noble-curves');
}, Cp = (n, t = jn) => {
  Rp(t);
  const e = Os.signature, r = e + 1;
  let s = `Signature format "${t}" expects Uint8Array with length `;
  t === jn && n.length !== e && nt(s + e), t === Us && n.length !== r && nt(s + r);
};
class $s {
  r;
  s;
  recovery;
  constructor(t, e, r) {
    this.r = po(t), this.s = po(e), r != null && (this.recovery = r), Object.freeze(this);
  }
  static fromBytes(t, e = jn) {
    Cp(t, e);
    let r;
    e === Us && (r = t[0], t = t.subarray(1));
    const s = Kn(t, 0, bt), i = Kn(t, bt, xn);
    return new $s(s, i, r);
  }
  addRecoveryBit(t) {
    return new $s(this.r, this.s, t);
  }
  hasHighS() {
    return ql(this.s);
  }
  toBytes(t = jn) {
    const { r: e, s: r, recovery: s } = this, i = be(zt(e), zt(r));
    return t === Us ? (Np(s), be(Uint8Array.of(s), i)) : i;
  }
}
const Yl = (n) => {
  const t = n.length * 8 - 256;
  t > 1024 && nt("msg invalid");
  const e = rn(n);
  return t > 0 ? e >> Ar(t) : e;
}, Lp = (n) => Oe(Yl(Mt(n))), jn = "compact", Us = "recovered", Zl = "der", yc = [jn, Us, Zl], wc = {
  lowS: !0,
  prehash: !0,
  format: jn,
  extraEntropy: !1
}, mc = "SHA-256", oi = {
  hmacSha256Async: async (n, t) => {
    const e = pc(), r = "HMAC", s = await e.importKey("raw", n, { name: r, hash: { name: mc } }, !1, ["sign"]);
    return en(await e.sign(r, s, t));
  },
  hmacSha256: void 0,
  sha256Async: async (n) => en(await pc().digest(mc, n)),
  sha256: void 0
}, Pp = (n, t, e) => (Mt(n, void 0, "message"), t.prehash ? e ? oi.sha256Async(n) : Kl("sha256")(n) : n), _p = en(0), Dp = ii(0), Vp = ii(1), Mp = 1e3, Hp = "drbg: tried max amount of iterations", Fp = async (n, t) => {
  let e = en(bt), r = en(bt), s = 0;
  const i = () => {
    e.fill(1), r.fill(0);
  }, o = (...l) => oi.hmacSha256Async(r, be(e, ...l)), a = async (l = _p) => {
    r = await o(Dp, l), e = await o(), l.length !== 0 && (r = await o(Vp, l), e = await o());
  }, c = async () => (s++ >= Mp && nt(Hp), e = await o(), e);
  i(), await a(n);
  let u;
  for (; !(u = t(await c())); )
    await a();
  return i(), u;
}, zp = (n, t, e, r) => {
  let { lowS: s, extraEntropy: i } = e;
  const o = zt, a = Lp(n), c = o(a), u = Gl(t), l = [o(u), c];
  if (i != null && i !== !1) {
    const y = i === !0 ? si(bt) : i;
    l.push(Mt(y, void 0, "extraEntropy"));
  }
  const d = be(...l), h = a;
  return r(d, (y) => {
    const f = Yl(y);
    if (!(1n <= f && f < tn))
      return;
    const g = zl(f, tn), m = nn.multiply(f).toAffine(), S = Oe(m.x);
    if (S === 0n)
      return;
    const I = Oe(g * Oe(h + S * u));
    if (I === 0n)
      return;
    let E = (m.x === S ? 0 : 2) | Number(m.y & 1n), C = I;
    return s && ql(I) && (C = Oe(-I), E ^= 1), new $s(S, C, E).toBytes(e.format);
  });
}, Kp = (n) => {
  const t = {};
  return Object.keys(wc).forEach((e) => {
    t[e] = n[e] ?? wc[e];
  }), t;
}, jp = async (n, t, e = {}) => (e = Kp(e), n = await Pp(n, e, !0), zp(n, t, e, Fp)), Wp = (n = si(Os.seed)) => {
  Mt(n), (n.length < Os.seed || n.length > 1024) && nt("expected 40-1024b");
  const t = V(rn(n), tn - 1n);
  return zt(t + 1n);
}, Gp = (n) => (t) => {
  const e = Wp(t);
  return { secretKey: e, publicKey: n(e) };
}, Xl = (n) => Uint8Array.from("BIP0340/" + n, (t) => t.charCodeAt(0)), Ql = "aux", Jl = "nonce", tf = "challenge", go = (n, ...t) => {
  const e = Kl("sha256"), r = e(Xl(n));
  return e(be(r, r, ...t));
}, yo = async (n, ...t) => {
  const e = oi.sha256Async, r = await e(Xl(n));
  return await e(be(r, r, ...t));
}, ua = (n) => {
  const t = Gl(n), e = nn.multiply(t), { x: r, y: s } = e.assertValidity().toAffine(), i = zn(s) ? t : Oe(-t), o = zt(r);
  return { d: i, px: o };
}, la = (n) => Oe(rn(n)), ef = (...n) => la(go(tf, ...n)), nf = async (...n) => la(await yo(tf, ...n)), rf = (n) => ua(n).px, qp = Gp(rf), sf = (n, t, e) => {
  const { px: r, d: s } = ua(t);
  return { m: Mt(n), px: r, d: s, a: Mt(e, bt) };
}, of = (n) => {
  const t = la(n);
  t === 0n && nt("sign failed: k is zero");
  const { px: e, d: r } = ua(zt(t));
  return { rx: e, k: r };
}, af = (n, t, e, r) => be(t, zt(Oe(n + e * r))), cf = "invalid signature produced", Yp = (n, t, e = si(bt)) => {
  const { m: r, px: s, d: i, a: o } = sf(n, t, e), a = go(Ql, o), c = zt(i ^ rn(a)), u = go(Jl, c, s, r), { rx: l, k: d } = of(u), h = ef(l, s, r), p = af(d, l, h, i);
  return lf(p, r, s) || nt(cf), p;
}, Zp = async (n, t, e = si(bt)) => {
  const { m: r, px: s, d: i, a: o } = sf(n, t, e), a = await yo(Ql, o), c = zt(i ^ rn(a)), u = await yo(Jl, c, s, r), { rx: l, k: d } = of(u), h = await nf(l, s, r), p = af(d, l, h, i);
  return await ff(p, r, s) || nt(cf), p;
}, Xp = (n, t) => n instanceof Promise ? n.then(t) : t(n), uf = (n, t, e, r) => {
  const s = Mt(n, xn, "signature"), i = Mt(t, void 0, "message"), o = Mt(e, bt, "publicKey");
  try {
    const a = rn(o), c = Wl(a), u = zn(c) ? c : V(-c), l = new kt(a, u, 1n).assertValidity(), d = zt(l.toAffine().x), h = Kn(s, 0, bt);
    Tn(h, 1n, je);
    const p = Kn(s, bt, xn);
    Tn(p, 1n, tn);
    const y = be(zt(h), d, i);
    return Xp(r(y), (f) => {
      const { x: g, y: m } = $p(l, p, Oe(-f)).toAffine();
      return !(!zn(m) || g !== h);
    });
  } catch {
    return !1;
  }
}, lf = (n, t, e) => uf(n, t, e, ef), ff = async (n, t, e) => uf(n, t, e, nf), Qp = {
  keygen: qp,
  getPublicKey: rf,
  sign: Yp,
  verify: lf,
  signAsync: Zp,
  verifyAsync: ff
}, Ns = 8, Jp = 256, df = Math.ceil(Jp / Ns) + 1, wo = 2 ** (Ns - 1), tg = () => {
  const n = [];
  let t = nn, e = t;
  for (let r = 0; r < df; r++) {
    e = t, n.push(e);
    for (let s = 1; s < wo; s++)
      e = e.add(t), n.push(e);
    t = e.double();
  }
  return n;
};
let bc;
const Ec = (n, t) => {
  const e = t.negate();
  return n ? e : t;
}, eg = (n) => {
  const t = bc || (bc = tg());
  let e = un, r = nn;
  const s = 2 ** Ns, i = s, o = Ar(s - 1), a = Ar(Ns);
  for (let c = 0; c < df; c++) {
    let u = Number(n & o);
    n >>= a, u > wo && (u -= i, n += 1n);
    const l = c * wo, d = l, h = l + Math.abs(u) - 1, p = c % 2 !== 0, y = u < 0;
    u === 0 ? r = r.add(Ec(p, t[d])) : e = e.add(Ec(y, t[h]));
  }
  return n !== 0n && nt("invalid wnaf"), { p: e, f: r };
};
function ng(n, t, e) {
  return n & t ^ ~n & e;
}
function rg(n, t, e) {
  return n & t ^ n & e ^ t & e;
}
class sg {
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
  constructor(t, e, r, s) {
    this.blockLen = t, this.outputLen = e, this.padOffset = r, this.isLE = s, this.buffer = new Uint8Array(t), this.view = vi(this.buffer);
  }
  update(t) {
    Is(this), st(t);
    const { view: e, buffer: r, blockLen: s } = this, i = t.length;
    for (let o = 0; o < i; ) {
      const a = Math.min(s - this.pos, i - o);
      if (a === s) {
        const c = vi(t);
        for (; s <= i - o; o += s)
          this.process(c, o);
        continue;
      }
      r.set(t.subarray(o, o + a), this.pos), this.pos += a, o += a, this.pos === s && (this.process(e, 0), this.pos = 0);
    }
    return this.length += t.length, this.roundClean(), this;
  }
  digestInto(t) {
    Is(this), hp(t, this), this.finished = !0;
    const { buffer: e, view: r, blockLen: s, isLE: i } = this;
    let { pos: o } = this;
    e[o++] = 128, As(this.buffer.subarray(o)), this.padOffset > s - o && (this.process(r, 0), o = 0);
    for (let d = o; d < s; d++)
      e[d] = 0;
    r.setBigUint64(s - 8, BigInt(this.length * 8), i), this.process(r, 0);
    const a = vi(t), c = this.outputLen;
    if (c % 4)
      throw new Error("_sha2: outputLen must be aligned to 32bit");
    const u = c / 4, l = this.get();
    if (u > l.length)
      throw new Error("_sha2: outputLen bigger than state");
    for (let d = 0; d < u; d++)
      a.setUint32(4 * d, l[d], i);
  }
  digest() {
    const { buffer: t, outputLen: e } = this;
    this.digestInto(t);
    const r = t.slice(0, e);
    return this.destroy(), r;
  }
  _cloneInto(t) {
    t ||= new this.constructor(), t.set(...this.get());
    const { blockLen: e, buffer: r, length: s, finished: i, destroyed: o, pos: a } = this;
    return t.destroyed = o, t.finished = i, t.length = s, t.pos = a, s % e && t.buffer.set(r), t;
  }
  clone() {
    return this._cloneInto();
  }
}
const Ve = /* @__PURE__ */ Uint32Array.from([
  1779033703,
  3144134277,
  1013904242,
  2773480762,
  1359893119,
  2600822924,
  528734635,
  1541459225
]), ig = /* @__PURE__ */ Uint32Array.from([
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
]), Me = /* @__PURE__ */ new Uint32Array(64);
class og extends sg {
  constructor(t) {
    super(64, t, 8, !1);
  }
  get() {
    const { A: t, B: e, C: r, D: s, E: i, F: o, G: a, H: c } = this;
    return [t, e, r, s, i, o, a, c];
  }
  // prettier-ignore
  set(t, e, r, s, i, o, a, c) {
    this.A = t | 0, this.B = e | 0, this.C = r | 0, this.D = s | 0, this.E = i | 0, this.F = o | 0, this.G = a | 0, this.H = c | 0;
  }
  process(t, e) {
    for (let d = 0; d < 16; d++, e += 4)
      Me[d] = t.getUint32(e, !1);
    for (let d = 16; d < 64; d++) {
      const h = Me[d - 15], p = Me[d - 2], y = le(h, 7) ^ le(h, 18) ^ h >>> 3, f = le(p, 17) ^ le(p, 19) ^ p >>> 10;
      Me[d] = f + Me[d - 7] + y + Me[d - 16] | 0;
    }
    let { A: r, B: s, C: i, D: o, E: a, F: c, G: u, H: l } = this;
    for (let d = 0; d < 64; d++) {
      const h = le(a, 6) ^ le(a, 11) ^ le(a, 25), p = l + h + ng(a, c, u) + ig[d] + Me[d] | 0, f = (le(r, 2) ^ le(r, 13) ^ le(r, 22)) + rg(r, s, i) | 0;
      l = u, u = c, c = a, a = o + p | 0, o = i, i = s, s = r, r = p + f | 0;
    }
    r = r + this.A | 0, s = s + this.B | 0, i = i + this.C | 0, o = o + this.D | 0, a = a + this.E | 0, c = c + this.F | 0, u = u + this.G | 0, l = l + this.H | 0, this.set(r, s, i, o, a, c, u, l);
  }
  roundClean() {
    As(Me);
  }
  destroy() {
    this.set(0, 0, 0, 0, 0, 0, 0, 0), As(this.buffer);
  }
}
class ag extends og {
  // We cannot use array here since array allows indexing by variable
  // which means optimizer/compiler cannot use registers.
  A = Ve[0] | 0;
  B = Ve[1] | 0;
  C = Ve[2] | 0;
  D = Ve[3] | 0;
  E = Ve[4] | 0;
  F = Ve[5] | 0;
  G = Ve[6] | 0;
  H = Ve[7] | 0;
  constructor() {
    super(32);
  }
}
const mo = /* @__PURE__ */ gp(
  () => new ag(),
  /* @__PURE__ */ yp(1)
);
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const Ut = /* @__PURE__ */ BigInt(0), It = /* @__PURE__ */ BigInt(1), gn = /* @__PURE__ */ BigInt(2), hf = /* @__PURE__ */ BigInt(3), pf = /* @__PURE__ */ BigInt(4), gf = /* @__PURE__ */ BigInt(5), cg = /* @__PURE__ */ BigInt(7), yf = /* @__PURE__ */ BigInt(8), ug = /* @__PURE__ */ BigInt(9), wf = /* @__PURE__ */ BigInt(16);
function Jt(n, t) {
  const e = n % t;
  return e >= Ut ? e : t + e;
}
function jt(n, t, e) {
  let r = n;
  for (; t-- > Ut; )
    r *= r, r %= e;
  return r;
}
function xc(n, t) {
  if (n === Ut)
    throw new Error("invert: expected non-zero number");
  if (t <= Ut)
    throw new Error("invert: expected positive modulus, got " + t);
  let e = Jt(n, t), r = t, s = Ut, i = It;
  for (; e !== Ut; ) {
    const a = r / e, c = r % e, u = s - i * a;
    r = e, e = c, s = i, i = u;
  }
  if (r !== It)
    throw new Error("invert: does not exist");
  return Jt(s, t);
}
function fa(n, t, e) {
  if (!n.eql(n.sqr(t), e))
    throw new Error("Cannot find square root");
}
function mf(n, t) {
  const e = (n.ORDER + It) / pf, r = n.pow(t, e);
  return fa(n, r, t), r;
}
function lg(n, t) {
  const e = (n.ORDER - gf) / yf, r = n.mul(t, gn), s = n.pow(r, e), i = n.mul(t, s), o = n.mul(n.mul(i, gn), s), a = n.mul(i, n.sub(o, n.ONE));
  return fa(n, a, t), a;
}
function fg(n) {
  const t = ai(n), e = bf(n), r = e(t, t.neg(t.ONE)), s = e(t, r), i = e(t, t.neg(r)), o = (n + cg) / wf;
  return (a, c) => {
    let u = a.pow(c, o), l = a.mul(u, r);
    const d = a.mul(u, s), h = a.mul(u, i), p = a.eql(a.sqr(l), c), y = a.eql(a.sqr(d), c);
    u = a.cmov(u, l, p), l = a.cmov(h, d, y);
    const f = a.eql(a.sqr(l), c), g = a.cmov(u, l, f);
    return fa(a, g, c), g;
  };
}
function bf(n) {
  if (n < hf)
    throw new Error("sqrt is not defined for small field");
  let t = n - It, e = 0;
  for (; t % gn === Ut; )
    t /= gn, e++;
  let r = gn;
  const s = ai(n);
  for (; Tc(s, r) === 1; )
    if (r++ > 1e3)
      throw new Error("Cannot find square root: probably non-prime P");
  if (e === 1)
    return mf;
  let i = s.pow(r, t);
  const o = (t + It) / gn;
  return function(c, u) {
    if (c.is0(u))
      return u;
    if (Tc(c, u) !== 1)
      throw new Error("Cannot find square root");
    let l = e, d = c.mul(c.ONE, i), h = c.pow(u, t), p = c.pow(u, o);
    for (; !c.eql(h, c.ONE); ) {
      if (c.is0(h))
        return c.ZERO;
      let y = 1, f = c.sqr(h);
      for (; !c.eql(f, c.ONE); )
        if (y++, f = c.sqr(f), y === l)
          throw new Error("Cannot find square root");
      const g = It << BigInt(l - y - 1), m = c.pow(d, g);
      l = y, d = c.sqr(m), h = c.mul(h, d), p = c.mul(p, m);
    }
    return p;
  };
}
function dg(n) {
  return n % pf === hf ? mf : n % yf === gf ? lg : n % wf === ug ? fg(n) : bf(n);
}
const hg = [
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
function pg(n) {
  const t = {
    ORDER: "bigint",
    BYTES: "number",
    BITS: "number"
  }, e = hg.reduce((r, s) => (r[s] = "function", r), t);
  return ca(n, e), n;
}
function gg(n, t, e) {
  if (e < Ut)
    throw new Error("invalid exponent, negatives unsupported");
  if (e === Ut)
    return n.ONE;
  if (e === It)
    return t;
  let r = n.ONE, s = t;
  for (; e > Ut; )
    e & It && (r = n.mul(r, s)), s = n.sqr(s), e >>= It;
  return r;
}
function Ef(n, t, e = !1) {
  const r = new Array(t.length).fill(e ? n.ZERO : void 0), s = t.reduce((o, a, c) => n.is0(a) ? o : (r[c] = o, n.mul(o, a)), n.ONE), i = n.inv(s);
  return t.reduceRight((o, a, c) => n.is0(a) ? o : (r[c] = n.mul(o, r[c]), n.mul(o, a)), i), r;
}
function Tc(n, t) {
  const e = (n.ORDER - It) / gn, r = n.pow(t, e), s = n.eql(r, n.ONE), i = n.eql(r, n.ZERO), o = n.eql(r, n.neg(n.ONE));
  if (!s && !i && !o)
    throw new Error("invalid Legendre symbol result");
  return s ? 1 : i ? 0 : -1;
}
function yg(n, t) {
  t !== void 0 && En(t);
  const e = t !== void 0 ? t : n.toString(2).length, r = Math.ceil(e / 8);
  return { nBitLength: e, nByteLength: r };
}
class wg {
  ORDER;
  BITS;
  BYTES;
  isLE;
  ZERO = Ut;
  ONE = It;
  _lengths;
  _sqrt;
  // cached sqrt
  _mod;
  constructor(t, e = {}) {
    if (t <= Ut)
      throw new Error("invalid field: expected ORDER > 0, got " + t);
    let r;
    this.isLE = !1, e != null && typeof e == "object" && (typeof e.BITS == "number" && (r = e.BITS), typeof e.sqrt == "function" && (this.sqrt = e.sqrt), typeof e.isLE == "boolean" && (this.isLE = e.isLE), e.allowedLengths && (this._lengths = e.allowedLengths?.slice()), typeof e.modFromBytes == "boolean" && (this._mod = e.modFromBytes));
    const { nBitLength: s, nByteLength: i } = yg(t, r);
    if (i > 2048)
      throw new Error("invalid field: expected ORDER of <= 2048 bytes");
    this.ORDER = t, this.BITS = s, this.BYTES = i, this._sqrt = void 0, Object.preventExtensions(this);
  }
  create(t) {
    return Jt(t, this.ORDER);
  }
  isValid(t) {
    if (typeof t != "bigint")
      throw new Error("invalid field element: expected bigint, got " + typeof t);
    return Ut <= t && t < this.ORDER;
  }
  is0(t) {
    return t === Ut;
  }
  // is valid and invertible
  isValidNot0(t) {
    return !this.is0(t) && this.isValid(t);
  }
  isOdd(t) {
    return (t & It) === It;
  }
  neg(t) {
    return Jt(-t, this.ORDER);
  }
  eql(t, e) {
    return t === e;
  }
  sqr(t) {
    return Jt(t * t, this.ORDER);
  }
  add(t, e) {
    return Jt(t + e, this.ORDER);
  }
  sub(t, e) {
    return Jt(t - e, this.ORDER);
  }
  mul(t, e) {
    return Jt(t * e, this.ORDER);
  }
  pow(t, e) {
    return gg(this, t, e);
  }
  div(t, e) {
    return Jt(t * xc(e, this.ORDER), this.ORDER);
  }
  // Same as above, but doesn't normalize
  sqrN(t) {
    return t * t;
  }
  addN(t, e) {
    return t + e;
  }
  subN(t, e) {
    return t - e;
  }
  mulN(t, e) {
    return t * e;
  }
  inv(t) {
    return xc(t, this.ORDER);
  }
  sqrt(t) {
    return this._sqrt || (this._sqrt = dg(this.ORDER)), this._sqrt(this, t);
  }
  toBytes(t) {
    return this.isLE ? Pl(t, this.BYTES) : oa(t, this.BYTES);
  }
  fromBytes(t, e = !1) {
    st(t);
    const { _lengths: r, BYTES: s, isLE: i, ORDER: o, _mod: a } = this;
    if (r) {
      if (!r.includes(t.length) || t.length > s)
        throw new Error("Field.fromBytes: expected " + r + " bytes, got " + t.length);
      const u = new Uint8Array(s);
      u.set(t, i ? 0 : u.length - t.length), t = u;
    }
    if (t.length !== s)
      throw new Error("Field.fromBytes: expected " + s + " bytes, got " + t.length);
    let c = i ? Ll(t) : tr(t);
    if (a && (c = Jt(c, o)), !e && !this.isValid(c))
      throw new Error("invalid field element: outside of range 0..ORDER");
    return c;
  }
  // TODO: we don't need it here, move out to separate fn
  invertBatch(t) {
    return Ef(this, t);
  }
  // We can't move this out because Fp6, Fp12 implement it
  // and it's unclear what to return in there.
  cmov(t, e, r) {
    return r ? e : t;
  }
}
function ai(n, t = {}) {
  return new wg(n, t);
}
function xf(n) {
  if (typeof n != "bigint")
    throw new Error("field order must be bigint");
  const t = n.toString(2).length;
  return Math.ceil(t / 8);
}
function Tf(n) {
  const t = xf(n);
  return t + Math.ceil(t / 2);
}
function Sf(n, t, e = !1) {
  st(n);
  const r = n.length, s = xf(t), i = Tf(t);
  if (r < 16 || r < i || r > 1024)
    throw new Error("expected " + i + "-1024 bytes of input, got " + r);
  const o = e ? Ll(n) : tr(n), a = Jt(o, t - It) + It;
  return e ? Pl(a, s) : oa(a, s);
}
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const Wn = /* @__PURE__ */ BigInt(0), yn = /* @__PURE__ */ BigInt(1);
function Rs(n, t) {
  const e = t.negate();
  return n ? e : t;
}
function Sc(n, t) {
  const e = Ef(n.Fp, t.map((r) => r.Z));
  return t.map((r, s) => n.fromAffine(r.toAffine(e[s])));
}
function vf(n, t) {
  if (!Number.isSafeInteger(n) || n <= 0 || n > t)
    throw new Error("invalid window size, expected [1.." + t + "], got W=" + n);
}
function Ai(n, t) {
  vf(n, t);
  const e = Math.ceil(t / n) + 1, r = 2 ** (n - 1), s = 2 ** n, i = aa(n), o = BigInt(n);
  return { windows: e, windowSize: r, mask: i, maxNumber: s, shiftBy: o };
}
function vc(n, t, e) {
  const { windowSize: r, mask: s, maxNumber: i, shiftBy: o } = e;
  let a = Number(n & s), c = n >> o;
  a > r && (a -= i, c += yn);
  const u = t * r, l = u + Math.abs(a) - 1, d = a === 0, h = a < 0, p = t % 2 !== 0;
  return { nextN: c, offset: l, isZero: d, isNeg: h, isNegF: p, offsetF: u };
}
const ki = /* @__PURE__ */ new WeakMap(), If = /* @__PURE__ */ new WeakMap();
function Bi(n) {
  return If.get(n) || 1;
}
function Ic(n) {
  if (n !== Wn)
    throw new Error("invalid wNAF");
}
class mg {
  BASE;
  ZERO;
  Fn;
  bits;
  // Parametrized with a given Point class (not individual point)
  constructor(t, e) {
    this.BASE = t.BASE, this.ZERO = t.ZERO, this.Fn = t.Fn, this.bits = e;
  }
  // non-const time multiplication ladder
  _unsafeLadder(t, e, r = this.ZERO) {
    let s = t;
    for (; e > Wn; )
      e & yn && (r = r.add(s)), s = s.double(), e >>= yn;
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
  precomputeWindow(t, e) {
    const { windows: r, windowSize: s } = Ai(e, this.bits), i = [];
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
  wNAF(t, e, r) {
    if (!this.Fn.isValid(r))
      throw new Error("invalid scalar");
    let s = this.ZERO, i = this.BASE;
    const o = Ai(t, this.bits);
    for (let a = 0; a < o.windows; a++) {
      const { nextN: c, offset: u, isZero: l, isNeg: d, isNegF: h, offsetF: p } = vc(r, a, o);
      r = c, l ? i = i.add(Rs(h, e[p])) : s = s.add(Rs(d, e[u]));
    }
    return Ic(r), { p: s, f: i };
  }
  /**
   * Implements ec unsafe (non const-time) multiplication using precomputed tables and w-ary non-adjacent form.
   * @param acc accumulator point to add result of multiplication
   * @returns point
   */
  wNAFUnsafe(t, e, r, s = this.ZERO) {
    const i = Ai(t, this.bits);
    for (let o = 0; o < i.windows && r !== Wn; o++) {
      const { nextN: a, offset: c, isZero: u, isNeg: l } = vc(r, o, i);
      if (r = a, !u) {
        const d = e[c];
        s = s.add(l ? d.negate() : d);
      }
    }
    return Ic(r), s;
  }
  getPrecomputes(t, e, r) {
    let s = ki.get(e);
    return s || (s = this.precomputeWindow(e, t), t !== 1 && (typeof r == "function" && (s = r(s)), ki.set(e, s))), s;
  }
  cached(t, e, r) {
    const s = Bi(t);
    return this.wNAF(s, this.getPrecomputes(s, t, r), e);
  }
  unsafe(t, e, r, s) {
    const i = Bi(t);
    return i === 1 ? this._unsafeLadder(t, e, s) : this.wNAFUnsafe(i, this.getPrecomputes(i, t, r), e, s);
  }
  // We calculate precomputes for elliptic curve point multiplication
  // using windowed method. This specifies window size and
  // stores precomputed values. Usually only base point would be precomputed.
  createCache(t, e) {
    vf(e, this.bits), If.set(t, e), ki.delete(t);
  }
  hasCache(t) {
    return Bi(t) !== 1;
  }
}
function bg(n, t, e, r) {
  let s = t, i = n.ZERO, o = n.ZERO;
  for (; e > Wn || r > Wn; )
    e & yn && (i = i.add(s)), r & yn && (o = o.add(s)), s = s.double(), e >>= yn, r >>= yn;
  return { p1: i, p2: o };
}
function Ac(n, t, e) {
  if (t) {
    if (t.ORDER !== n)
      throw new Error("Field.ORDER must match order: Fp == p, Fn == n");
    return pg(t), t;
  } else
    return ai(n, { isLE: e });
}
function Eg(n, t, e = {}, r) {
  if (r === void 0 && (r = n === "edwards"), !t || typeof t != "object")
    throw new Error(`expected valid ${n} CURVE object`);
  for (const c of ["p", "n", "h"]) {
    const u = t[c];
    if (!(typeof u == "bigint" && u > Wn))
      throw new Error(`CURVE.${c} must be positive bigint`);
  }
  const s = Ac(t.p, e.Fp, r), i = Ac(t.n, e.Fn, r), a = ["Gx", "Gy", "a", "b"];
  for (const c of a)
    if (!s.isValid(t[c]))
      throw new Error(`CURVE.${c} must be valid field element of CURVE.Fp`);
  return t = Object.freeze(Object.assign({}, t)), { CURVE: t, Fp: s, Fn: i };
}
function Af(n, t) {
  return function(r) {
    const s = n(r);
    return { secretKey: s, publicKey: t(s) };
  };
}
class kf {
  oHash;
  iHash;
  blockLen;
  outputLen;
  finished = !1;
  destroyed = !1;
  constructor(t, e) {
    if (Ul(t), st(e, void 0, "key"), this.iHash = t.create(), typeof this.iHash.update != "function")
      throw new Error("Expected instance of class which extends utils.Hash");
    this.blockLen = this.iHash.blockLen, this.outputLen = this.iHash.outputLen;
    const r = this.blockLen, s = new Uint8Array(r);
    s.set(e.length > r ? t.create().update(e).digest() : e);
    for (let i = 0; i < s.length; i++)
      s[i] ^= 54;
    this.iHash.update(s), this.oHash = t.create();
    for (let i = 0; i < s.length; i++)
      s[i] ^= 106;
    this.oHash.update(s), As(s);
  }
  update(t) {
    return Is(this), this.iHash.update(t), this;
  }
  digestInto(t) {
    Is(this), st(t, this.outputLen, "output"), this.finished = !0, this.iHash.digestInto(t), this.oHash.update(t), this.oHash.digestInto(t), this.destroy();
  }
  digest() {
    const t = new Uint8Array(this.oHash.outputLen);
    return this.digestInto(t), t;
  }
  _cloneInto(t) {
    t ||= Object.create(Object.getPrototypeOf(this), {});
    const { oHash: e, iHash: r, finished: s, destroyed: i, blockLen: o, outputLen: a } = this;
    return t = t, t.finished = s, t.destroyed = i, t.blockLen = o, t.outputLen = a, t.oHash = e._cloneInto(t.oHash), t.iHash = r._cloneInto(t.iHash), t;
  }
  clone() {
    return this._cloneInto();
  }
  destroy() {
    this.destroyed = !0, this.oHash.destroy(), this.iHash.destroy();
  }
}
const Bf = (n, t, e) => new kf(n, t).update(e).digest();
Bf.create = (n, t) => new kf(n, t);
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const kc = (n, t) => (n + (n >= 0 ? t : -t) / Of) / t;
function xg(n, t, e) {
  const [[r, s], [i, o]] = t, a = kc(o * n, e), c = kc(-s * n, e);
  let u = n - a * r - c * i, l = -a * s - c * o;
  const d = u < $e, h = l < $e;
  d && (u = -u), h && (l = -l);
  const p = aa(Math.ceil(xp(e) / 2)) + Rn;
  if (u < $e || u >= p || l < $e || l >= p)
    throw new Error("splitScalar (endomorphism): failed, k=" + n);
  return { k1neg: d, k1: u, k2neg: h, k2: l };
}
function bo(n) {
  if (!["compact", "recovered", "der"].includes(n))
    throw new Error('Signature format must be "compact", "recovered", or "der"');
  return n;
}
function Oi(n, t) {
  const e = {};
  for (let r of Object.keys(t))
    e[r] = n[r] === void 0 ? t[r] : n[r];
  return Bs(e.lowS, "lowS"), Bs(e.prehash, "prehash"), e.format !== void 0 && bo(e.format), e;
}
class Tg extends Error {
  constructor(t = "") {
    super(t);
  }
}
const Fe = {
  // asn.1 DER encoding utils
  Err: Tg,
  // Basic building block is TLV (Tag-Length-Value)
  _tlv: {
    encode: (n, t) => {
      const { Err: e } = Fe;
      if (n < 0 || n > 256)
        throw new e("tlv.encode: wrong tag");
      if (t.length & 1)
        throw new e("tlv.encode: unpadded data");
      const r = t.length / 2, s = zr(r);
      if (s.length / 2 & 128)
        throw new e("tlv.encode: long form length too big");
      const i = r > 127 ? zr(s.length / 2 | 128) : "";
      return zr(n) + i + s + t;
    },
    // v - value, l - left bytes (unparsed)
    decode(n, t) {
      const { Err: e } = Fe;
      let r = 0;
      if (n < 0 || n > 256)
        throw new e("tlv.encode: wrong tag");
      if (t.length < 2 || t[r++] !== n)
        throw new e("tlv.decode: wrong tlv");
      const s = t[r++], i = !!(s & 128);
      let o = 0;
      if (!i)
        o = s;
      else {
        const c = s & 127;
        if (!c)
          throw new e("tlv.decode(long): indefinite length not supported");
        if (c > 4)
          throw new e("tlv.decode(long): byte length is too big");
        const u = t.subarray(r, r + c);
        if (u.length !== c)
          throw new e("tlv.decode: length bytes not complete");
        if (u[0] === 0)
          throw new e("tlv.decode(long): zero leftmost byte");
        for (const l of u)
          o = o << 8 | l;
        if (r += c, o < 128)
          throw new e("tlv.decode(long): not minimal encoding");
      }
      const a = t.subarray(r, r + o);
      if (a.length !== o)
        throw new e("tlv.decode: wrong value length");
      return { v: a, l: t.subarray(r + o) };
    }
  },
  // https://crypto.stackexchange.com/a/57734 Leftmost bit of first byte is 'negative' flag,
  // since we always use positive integers here. It must always be empty:
  // - add zero byte if exists
  // - if next byte doesn't have a flag, leading zero is not allowed (minimal encoding)
  _int: {
    encode(n) {
      const { Err: t } = Fe;
      if (n < $e)
        throw new t("integer: negative integers are not allowed");
      let e = zr(n);
      if (Number.parseInt(e[0], 16) & 8 && (e = "00" + e), e.length & 1)
        throw new t("unexpected DER parsing assertion: unpadded hex");
      return e;
    },
    decode(n) {
      const { Err: t } = Fe;
      if (n[0] & 128)
        throw new t("invalid signature integer: negative");
      if (n[0] === 0 && !(n[1] & 128))
        throw new t("invalid signature integer: unnecessary leading zero");
      return tr(n);
    }
  },
  toSig(n) {
    const { Err: t, _int: e, _tlv: r } = Fe, s = st(n, void 0, "signature"), { v: i, l: o } = r.decode(48, s);
    if (o.length)
      throw new t("invalid signature: left bytes after parsing");
    const { v: a, l: c } = r.decode(2, i), { v: u, l } = r.decode(2, c);
    if (l.length)
      throw new t("invalid signature: left bytes after parsing");
    return { r: e.decode(a), s: e.decode(u) };
  },
  hexFromSig(n) {
    const { _tlv: t, _int: e } = Fe, r = t.encode(2, e.encode(n.r)), s = t.encode(2, e.encode(n.s)), i = r + s;
    return t.encode(48, i);
  }
}, $e = BigInt(0), Rn = BigInt(1), Of = BigInt(2), Kr = BigInt(3), Sg = BigInt(4);
function vg(n, t = {}) {
  const e = Eg("weierstrass", n, t), { Fp: r, Fn: s } = e;
  let i = e.CURVE;
  const { h: o, n: a } = i;
  ca(t, {}, {
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
  const u = Uf(r, s);
  function l() {
    if (!r.isOdd)
      throw new Error("compression is not supported: Field does not have .isOdd()");
  }
  function d(D, v, x) {
    const { x: b, y: A } = v.toAffine(), O = r.toBytes(b);
    if (Bs(x, "isCompressed"), x) {
      l();
      const U = !r.isOdd(A);
      return ge($f(U), O);
    } else
      return ge(Uint8Array.of(4), O, r.toBytes(A));
  }
  function h(D) {
    st(D, void 0, "Point");
    const { publicKey: v, publicKeyUncompressed: x } = u, b = D.length, A = D[0], O = D.subarray(1);
    if (b === v && (A === 2 || A === 3)) {
      const U = r.fromBytes(O);
      if (!r.isValid(U))
        throw new Error("bad point: is not on curve, wrong x");
      const $ = f(U);
      let B;
      try {
        B = r.sqrt($);
      } catch (j) {
        const H = j instanceof Error ? ": " + j.message : "";
        throw new Error("bad point: is not on curve, sqrt error" + H);
      }
      l();
      const N = r.isOdd(B);
      return (A & 1) === 1 !== N && (B = r.neg(B)), { x: U, y: B };
    } else if (b === x && A === 4) {
      const U = r.BYTES, $ = r.fromBytes(O.subarray(0, U)), B = r.fromBytes(O.subarray(U, U * 2));
      if (!g($, B))
        throw new Error("bad point: is not on curve");
      return { x: $, y: B };
    } else
      throw new Error(`bad point: got length ${b}, expected compressed=${v} or uncompressed=${x}`);
  }
  const p = t.toBytes || d, y = t.fromBytes || h;
  function f(D) {
    const v = r.sqr(D), x = r.mul(v, D);
    return r.add(r.add(x, r.mul(D, i.a)), i.b);
  }
  function g(D, v) {
    const x = r.sqr(v), b = f(D);
    return r.eql(x, b);
  }
  if (!g(i.Gx, i.Gy))
    throw new Error("bad curve params: generator point");
  const m = r.mul(r.pow(i.a, Kr), Sg), S = r.mul(r.sqr(i.b), BigInt(27));
  if (r.is0(r.add(m, S)))
    throw new Error("bad curve params: a or b");
  function I(D, v, x = !1) {
    if (!r.isValid(v) || x && r.is0(v))
      throw new Error(`bad point coordinate ${D}`);
    return v;
  }
  function E(D) {
    if (!(D instanceof w))
      throw new Error("Weierstrass Point expected");
  }
  function C(D) {
    if (!c || !c.basises)
      throw new Error("no endo");
    return xg(D, c.basises, s.ORDER);
  }
  const M = dc((D, v) => {
    const { X: x, Y: b, Z: A } = D;
    if (r.eql(A, r.ONE))
      return { x, y: b };
    const O = D.is0();
    v == null && (v = O ? r.ONE : r.inv(A));
    const U = r.mul(x, v), $ = r.mul(b, v), B = r.mul(A, v);
    if (O)
      return { x: r.ZERO, y: r.ZERO };
    if (!r.eql(B, r.ONE))
      throw new Error("invZ was invalid");
    return { x: U, y: $ };
  }), X = dc((D) => {
    if (D.is0()) {
      if (t.allowInfinityPoint && !r.is0(D.Y))
        return;
      throw new Error("bad point: ZERO");
    }
    const { x: v, y: x } = D.toAffine();
    if (!r.isValid(v) || !r.isValid(x))
      throw new Error("bad point: x or y not field elements");
    if (!g(v, x))
      throw new Error("bad point: equation left != right");
    if (!D.isTorsionFree())
      throw new Error("bad point: not in prime-order subgroup");
    return !0;
  });
  function tt(D, v, x, b, A) {
    return x = new w(r.mul(x.X, D), x.Y, x.Z), v = Rs(b, v), x = Rs(A, x), v.add(x);
  }
  class w {
    // base / generator point
    static BASE = new w(i.Gx, i.Gy, r.ONE);
    // zero / infinity / identity point
    static ZERO = new w(r.ZERO, r.ONE, r.ZERO);
    // 0, 1, 0
    // math field
    static Fp = r;
    // scalar field
    static Fn = s;
    X;
    Y;
    Z;
    /** Does NOT validate if the point is valid. Use `.assertValidity()`. */
    constructor(v, x, b) {
      this.X = I("x", v), this.Y = I("y", x, !0), this.Z = I("z", b), Object.freeze(this);
    }
    static CURVE() {
      return i;
    }
    /** Does NOT validate if the point is valid. Use `.assertValidity()`. */
    static fromAffine(v) {
      const { x, y: b } = v || {};
      if (!v || !r.isValid(x) || !r.isValid(b))
        throw new Error("invalid affine point");
      if (v instanceof w)
        throw new Error("projective point not allowed");
      return r.is0(x) && r.is0(b) ? w.ZERO : new w(x, b, r.ONE);
    }
    static fromBytes(v) {
      const x = w.fromAffine(y(st(v, void 0, "point")));
      return x.assertValidity(), x;
    }
    static fromHex(v) {
      return w.fromBytes(ks(v));
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
    precompute(v = 8, x = !0) {
      return Y.createCache(this, v), x || this.multiply(Kr), this;
    }
    // TODO: return `this`
    /** A point on curve is valid if it conforms to equation. */
    assertValidity() {
      X(this);
    }
    hasEvenY() {
      const { y: v } = this.toAffine();
      if (!r.isOdd)
        throw new Error("Field doesn't support isOdd");
      return !r.isOdd(v);
    }
    /** Compare one point to another. */
    equals(v) {
      E(v);
      const { X: x, Y: b, Z: A } = this, { X: O, Y: U, Z: $ } = v, B = r.eql(r.mul(x, $), r.mul(O, A)), N = r.eql(r.mul(b, $), r.mul(U, A));
      return B && N;
    }
    /** Flips point to one corresponding to (x, -y) in Affine coordinates. */
    negate() {
      return new w(this.X, r.neg(this.Y), this.Z);
    }
    // Renes-Costello-Batina exception-free doubling formula.
    // There is 30% faster Jacobian formula, but it is not complete.
    // https://eprint.iacr.org/2015/1060, algorithm 3
    // Cost: 8M + 3S + 3*a + 2*b3 + 15add.
    double() {
      const { a: v, b: x } = i, b = r.mul(x, Kr), { X: A, Y: O, Z: U } = this;
      let $ = r.ZERO, B = r.ZERO, N = r.ZERO, P = r.mul(A, A), j = r.mul(O, O), H = r.mul(U, U), T = r.mul(A, O);
      return T = r.add(T, T), N = r.mul(A, U), N = r.add(N, N), $ = r.mul(v, N), B = r.mul(b, H), B = r.add($, B), $ = r.sub(j, B), B = r.add(j, B), B = r.mul($, B), $ = r.mul(T, $), N = r.mul(b, N), H = r.mul(v, H), T = r.sub(P, H), T = r.mul(v, T), T = r.add(T, N), N = r.add(P, P), P = r.add(N, P), P = r.add(P, H), P = r.mul(P, T), B = r.add(B, P), H = r.mul(O, U), H = r.add(H, H), P = r.mul(H, T), $ = r.sub($, P), N = r.mul(H, j), N = r.add(N, N), N = r.add(N, N), new w($, B, N);
    }
    // Renes-Costello-Batina exception-free addition formula.
    // There is 30% faster Jacobian formula, but it is not complete.
    // https://eprint.iacr.org/2015/1060, algorithm 1
    // Cost: 12M + 0S + 3*a + 3*b3 + 23add.
    add(v) {
      E(v);
      const { X: x, Y: b, Z: A } = this, { X: O, Y: U, Z: $ } = v;
      let B = r.ZERO, N = r.ZERO, P = r.ZERO;
      const j = i.a, H = r.mul(i.b, Kr);
      let T = r.mul(x, O), L = r.mul(b, U), W = r.mul(A, $), ut = r.add(x, b), z = r.add(O, U);
      ut = r.mul(ut, z), z = r.add(T, L), ut = r.sub(ut, z), z = r.add(x, A);
      let Q = r.add(O, $);
      return z = r.mul(z, Q), Q = r.add(T, W), z = r.sub(z, Q), Q = r.add(b, A), B = r.add(U, $), Q = r.mul(Q, B), B = r.add(L, W), Q = r.sub(Q, B), P = r.mul(j, z), B = r.mul(H, W), P = r.add(B, P), B = r.sub(L, P), P = r.add(L, P), N = r.mul(B, P), L = r.add(T, T), L = r.add(L, T), W = r.mul(j, W), z = r.mul(H, z), L = r.add(L, W), W = r.sub(T, W), W = r.mul(j, W), z = r.add(z, W), T = r.mul(L, z), N = r.add(N, T), T = r.mul(Q, z), B = r.mul(ut, B), B = r.sub(B, T), T = r.mul(ut, L), P = r.mul(Q, P), P = r.add(P, T), new w(B, N, P);
    }
    subtract(v) {
      return this.add(v.negate());
    }
    is0() {
      return this.equals(w.ZERO);
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
    multiply(v) {
      const { endo: x } = t;
      if (!s.isValidNot0(v))
        throw new Error("invalid scalar: out of range");
      let b, A;
      const O = (U) => Y.cached(this, U, ($) => Sc(w, $));
      if (x) {
        const { k1neg: U, k1: $, k2neg: B, k2: N } = C(v), { p: P, f: j } = O($), { p: H, f: T } = O(N);
        A = j.add(T), b = tt(x.beta, P, H, U, B);
      } else {
        const { p: U, f: $ } = O(v);
        b = U, A = $;
      }
      return Sc(w, [b, A])[0];
    }
    /**
     * Non-constant-time multiplication. Uses double-and-add algorithm.
     * It's faster, but should only be used when you don't care about
     * an exposed secret key e.g. sig verification, which works over *public* keys.
     */
    multiplyUnsafe(v) {
      const { endo: x } = t, b = this;
      if (!s.isValid(v))
        throw new Error("invalid scalar: out of range");
      if (v === $e || b.is0())
        return w.ZERO;
      if (v === Rn)
        return b;
      if (Y.hasCache(this))
        return this.multiply(v);
      if (x) {
        const { k1neg: A, k1: O, k2neg: U, k2: $ } = C(v), { p1: B, p2: N } = bg(w, b, O, $);
        return tt(x.beta, B, N, A, U);
      } else
        return Y.unsafe(b, v);
    }
    /**
     * Converts Projective point to affine (x, y) coordinates.
     * @param invertedZ Z^-1 (inverted zero) - optional, precomputation is useful for invertBatch
     */
    toAffine(v) {
      return M(this, v);
    }
    /**
     * Checks whether Point is free of torsion elements (is in prime subgroup).
     * Always torsion-free for cofactor=1 curves.
     */
    isTorsionFree() {
      const { isTorsionFree: v } = t;
      return o === Rn ? !0 : v ? v(w, this) : Y.unsafe(this, a).is0();
    }
    clearCofactor() {
      const { clearCofactor: v } = t;
      return o === Rn ? this : v ? v(w, this) : this.multiplyUnsafe(o);
    }
    isSmallOrder() {
      return this.multiplyUnsafe(o).is0();
    }
    toBytes(v = !0) {
      return Bs(v, "isCompressed"), this.assertValidity(), p(w, this, v);
    }
    toHex(v = !0) {
      return ni(this.toBytes(v));
    }
    toString() {
      return `<Point ${this.is0() ? "ZERO" : this.toHex()}>`;
    }
  }
  const J = s.BITS, Y = new mg(w, t.endo ? Math.ceil(J / 2) : J);
  return w.BASE.precompute(8), w;
}
function $f(n) {
  return Uint8Array.of(n ? 2 : 3);
}
function Uf(n, t) {
  return {
    secretKey: t.BYTES,
    publicKey: 1 + n.BYTES,
    publicKeyUncompressed: 1 + 2 * n.BYTES,
    publicKeyHasPrefix: !0,
    signature: 2 * t.BYTES
  };
}
function Ig(n, t = {}) {
  const { Fn: e } = n, r = t.randomBytes || ri, s = Object.assign(Uf(n.Fp, e), { seed: Tf(e.ORDER) });
  function i(p) {
    try {
      const y = e.fromBytes(p);
      return e.isValidNot0(y);
    } catch {
      return !1;
    }
  }
  function o(p, y) {
    const { publicKey: f, publicKeyUncompressed: g } = s;
    try {
      const m = p.length;
      return y === !0 && m !== f || y === !1 && m !== g ? !1 : !!n.fromBytes(p);
    } catch {
      return !1;
    }
  }
  function a(p = r(s.seed)) {
    return Sf(st(p, s.seed, "seed"), e.ORDER);
  }
  function c(p, y = !0) {
    return n.BASE.multiply(e.fromBytes(p)).toBytes(y);
  }
  function u(p) {
    const { secretKey: y, publicKey: f, publicKeyUncompressed: g } = s;
    if (!sa(p) || "_lengths" in e && e._lengths || y === f)
      return;
    const m = st(p, void 0, "key").length;
    return m === f || m === g;
  }
  function l(p, y, f = !0) {
    if (u(p) === !0)
      throw new Error("first arg must be private key");
    if (u(y) === !1)
      throw new Error("second arg must be public key");
    const g = e.fromBytes(p);
    return n.fromBytes(y).multiply(g).toBytes(f);
  }
  const d = {
    isValidSecretKey: i,
    isValidPublicKey: o,
    randomSecretKey: a
  }, h = Af(a, c);
  return Object.freeze({ getPublicKey: c, getSharedSecret: l, keygen: h, Point: n, utils: d, lengths: s });
}
function Ag(n, t, e = {}) {
  Ul(t), ca(e, {}, {
    hmac: "function",
    lowS: "boolean",
    randomBytes: "function",
    bits2int: "function",
    bits2int_modN: "function"
  }), e = Object.assign({}, e);
  const r = e.randomBytes || ri, s = e.hmac || ((x, b) => Bf(t, x, b)), { Fp: i, Fn: o } = n, { ORDER: a, BITS: c } = o, { keygen: u, getPublicKey: l, getSharedSecret: d, utils: h, lengths: p } = Ig(n, e), y = {
    prehash: !0,
    lowS: typeof e.lowS == "boolean" ? e.lowS : !0,
    format: "compact",
    extraEntropy: !1
  }, f = a * Of < i.ORDER;
  function g(x) {
    const b = a >> Rn;
    return x > b;
  }
  function m(x, b) {
    if (!o.isValidNot0(b))
      throw new Error(`invalid signature ${x}: out of range 1..Point.Fn.ORDER`);
    return b;
  }
  function S() {
    if (f)
      throw new Error('"recovered" sig type is not supported for cofactor >2 curves');
  }
  function I(x, b) {
    bo(b);
    const A = p.signature, O = b === "compact" ? A : b === "recovered" ? A + 1 : void 0;
    return st(x, O);
  }
  class E {
    r;
    s;
    recovery;
    constructor(b, A, O) {
      if (this.r = m("r", b), this.s = m("s", A), O != null) {
        if (S(), ![0, 1, 2, 3].includes(O))
          throw new Error("invalid recovery id");
        this.recovery = O;
      }
      Object.freeze(this);
    }
    static fromBytes(b, A = y.format) {
      I(b, A);
      let O;
      if (A === "der") {
        const { r: N, s: P } = Fe.toSig(st(b));
        return new E(N, P);
      }
      A === "recovered" && (O = b[0], A = "compact", b = b.subarray(1));
      const U = p.signature / 2, $ = b.subarray(0, U), B = b.subarray(U, U * 2);
      return new E(o.fromBytes($), o.fromBytes(B), O);
    }
    static fromHex(b, A) {
      return this.fromBytes(ks(b), A);
    }
    assertRecovery() {
      const { recovery: b } = this;
      if (b == null)
        throw new Error("invalid recovery id: must be present");
      return b;
    }
    addRecoveryBit(b) {
      return new E(this.r, this.s, b);
    }
    recoverPublicKey(b) {
      const { r: A, s: O } = this, U = this.assertRecovery(), $ = U === 2 || U === 3 ? A + a : A;
      if (!i.isValid($))
        throw new Error("invalid recovery id: sig.r+curve.n != R.x");
      const B = i.toBytes($), N = n.fromBytes(ge($f((U & 1) === 0), B)), P = o.inv($), j = M(st(b, void 0, "msgHash")), H = o.create(-j * P), T = o.create(O * P), L = n.BASE.multiplyUnsafe(H).add(N.multiplyUnsafe(T));
      if (L.is0())
        throw new Error("invalid recovery: point at infinify");
      return L.assertValidity(), L;
    }
    // Signatures should be low-s, to prevent malleability.
    hasHighS() {
      return g(this.s);
    }
    toBytes(b = y.format) {
      if (bo(b), b === "der")
        return ks(Fe.hexFromSig(this));
      const { r: A, s: O } = this, U = o.toBytes(A), $ = o.toBytes(O);
      return b === "recovered" ? (S(), ge(Uint8Array.of(this.assertRecovery()), U, $)) : ge(U, $);
    }
    toHex(b) {
      return ni(this.toBytes(b));
    }
  }
  const C = e.bits2int || function(b) {
    if (b.length > 8192)
      throw new Error("input is too large");
    const A = tr(b), O = b.length * 8 - c;
    return O > 0 ? A >> BigInt(O) : A;
  }, M = e.bits2int_modN || function(b) {
    return o.create(C(b));
  }, X = aa(c);
  function tt(x) {
    return Ep("num < 2^" + c, x, $e, X), o.toBytes(x);
  }
  function w(x, b) {
    return st(x, void 0, "message"), b ? st(t(x), void 0, "prehashed message") : x;
  }
  function J(x, b, A) {
    const { lowS: O, prehash: U, extraEntropy: $ } = Oi(A, y);
    x = w(x, U);
    const B = M(x), N = o.fromBytes(b);
    if (!o.isValidNot0(N))
      throw new Error("invalid private key");
    const P = [tt(N), tt(B)];
    if ($ != null && $ !== !1) {
      const L = $ === !0 ? r(p.secretKey) : $;
      P.push(st(L, void 0, "extraEntropy"));
    }
    const j = ge(...P), H = B;
    function T(L) {
      const W = C(L);
      if (!o.isValidNot0(W))
        return;
      const ut = o.inv(W), z = n.BASE.multiply(W).toAffine(), Q = o.create(z.x);
      if (Q === $e)
        return;
      const Ee = o.create(ut * o.create(H + Q * N));
      if (Ee === $e)
        return;
      let er = (z.x === Q ? 0 : 2) | Number(z.y & Rn), nr = Ee;
      return O && g(Ee) && (nr = o.neg(Ee), er ^= 1), new E(Q, nr, f ? void 0 : er);
    }
    return { seed: j, k2sig: T };
  }
  function Y(x, b, A = {}) {
    const { seed: O, k2sig: U } = J(x, b, A);
    return Tp(t.outputLen, o.BYTES, s)(O, U).toBytes(A.format);
  }
  function D(x, b, A, O = {}) {
    const { lowS: U, prehash: $, format: B } = Oi(O, y);
    if (A = st(A, void 0, "publicKey"), b = w(b, $), !sa(x)) {
      const N = x instanceof E ? ", use sig.toBytes()" : "";
      throw new Error("verify expects Uint8Array signature" + N);
    }
    I(x, B);
    try {
      const N = E.fromBytes(x, B), P = n.fromBytes(A);
      if (U && N.hasHighS())
        return !1;
      const { r: j, s: H } = N, T = M(b), L = o.inv(H), W = o.create(T * L), ut = o.create(j * L), z = n.BASE.multiplyUnsafe(W).add(P.multiplyUnsafe(ut));
      return z.is0() ? !1 : o.create(z.x) === j;
    } catch {
      return !1;
    }
  }
  function v(x, b, A = {}) {
    const { prehash: O } = Oi(A, y);
    return b = w(b, O), E.fromBytes(x, "recovered").recoverPublicKey(b).toBytes();
  }
  return Object.freeze({
    keygen: u,
    getPublicKey: l,
    getSharedSecret: d,
    utils: h,
    lengths: p,
    Point: n,
    sign: Y,
    verify: D,
    recoverPublicKey: v,
    Signature: E,
    hash: t
  });
}
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const ci = {
  p: BigInt("0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffefffffc2f"),
  n: BigInt("0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141"),
  h: BigInt(1),
  a: BigInt(0),
  b: BigInt(7),
  Gx: BigInt("0x79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798"),
  Gy: BigInt("0x483ada7726a3c4655da4fbfc0e1108a8fd17b448a68554199c47d08ffb10d4b8")
}, kg = {
  beta: BigInt("0x7ae96a2b657c07106e64479eac3434e99cf0497512f58995c1396c28719501ee"),
  basises: [
    [BigInt("0x3086d221a7d46bcde86c90e49284eb15"), -BigInt("0xe4437ed6010e88286f547fa90abfe4c3")],
    [BigInt("0x114ca50f7a8e2f3f657c1108d9d44cfd8"), BigInt("0x3086d221a7d46bcde86c90e49284eb15")]
  ]
}, Bg = /* @__PURE__ */ BigInt(0), Eo = /* @__PURE__ */ BigInt(2);
function Og(n) {
  const t = ci.p, e = BigInt(3), r = BigInt(6), s = BigInt(11), i = BigInt(22), o = BigInt(23), a = BigInt(44), c = BigInt(88), u = n * n * n % t, l = u * u * n % t, d = jt(l, e, t) * l % t, h = jt(d, e, t) * l % t, p = jt(h, Eo, t) * u % t, y = jt(p, s, t) * p % t, f = jt(y, i, t) * y % t, g = jt(f, a, t) * f % t, m = jt(g, c, t) * g % t, S = jt(m, a, t) * f % t, I = jt(S, e, t) * l % t, E = jt(I, o, t) * y % t, C = jt(E, r, t) * u % t, M = jt(C, Eo, t);
  if (!Cs.eql(Cs.sqr(M), n))
    throw new Error("Cannot find square root");
  return M;
}
const Cs = ai(ci.p, { sqrt: Og }), In = /* @__PURE__ */ vg(ci, {
  Fp: Cs,
  endo: kg
}), Bc = /* @__PURE__ */ Ag(In, mo), Oc = {};
function Ls(n, ...t) {
  let e = Oc[n];
  if (e === void 0) {
    const r = mo(mp(n));
    e = ge(r, r), Oc[n] = e;
  }
  return mo(ge(e, ...t));
}
const da = (n) => n.toBytes(!0).slice(1), ha = (n) => n % Eo === Bg;
function xo(n) {
  const { Fn: t, BASE: e } = In, r = t.fromBytes(n), s = e.multiply(r);
  return { scalar: ha(s.y) ? r : t.neg(r), bytes: da(s) };
}
function Nf(n) {
  const t = Cs;
  if (!t.isValidNot0(n))
    throw new Error("invalid x: Fail if x ≥ p");
  const e = t.create(n * n), r = t.create(e * n + BigInt(7));
  let s = t.sqrt(r);
  ha(s) || (s = t.neg(s));
  const i = In.fromAffine({ x: n, y: s });
  return i.assertValidity(), i;
}
const gr = tr;
function Rf(...n) {
  return In.Fn.create(gr(Ls("BIP0340/challenge", ...n)));
}
function $c(n) {
  return xo(n).bytes;
}
function $g(n, t, e = ri(32)) {
  const { Fn: r } = In, s = st(n, void 0, "message"), { bytes: i, scalar: o } = xo(t), a = st(e, 32, "auxRand"), c = r.toBytes(o ^ gr(Ls("BIP0340/aux", a))), u = Ls("BIP0340/nonce", c, i, s), { bytes: l, scalar: d } = xo(u), h = Rf(l, i, s), p = new Uint8Array(64);
  if (p.set(l, 0), p.set(r.toBytes(r.create(d + h * o)), 32), !Cf(p, s, i))
    throw new Error("sign: Invalid signature produced");
  return p;
}
function Cf(n, t, e) {
  const { Fp: r, Fn: s, BASE: i } = In, o = st(n, 64, "signature"), a = st(t, void 0, "message"), c = st(e, 32, "publicKey");
  try {
    const u = Nf(gr(c)), l = gr(o.subarray(0, 32));
    if (!r.isValidNot0(l))
      return !1;
    const d = gr(o.subarray(32, 64));
    if (!s.isValidNot0(d))
      return !1;
    const h = Rf(s.toBytes(l), da(u), a), p = i.multiplyUnsafe(d).add(u.multiplyUnsafe(s.neg(h))), { x: y, y: f } = p.toAffine();
    return !(p.is0() || !ha(f) || y !== l);
  } catch {
    return !1;
  }
}
const pa = /* @__PURE__ */ (() => {
  const e = (r = ri(48)) => Sf(r, ci.n);
  return {
    keygen: Af(e, $c),
    getPublicKey: $c,
    sign: $g,
    verify: Cf,
    Point: In,
    utils: {
      randomSecretKey: e,
      taggedHash: Ls,
      lift_x: Nf,
      pointToBytes: da
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
function ga(n, t, e = {}) {
  n = lo(n);
  const { aggPublicKey: r } = fo(n);
  if (!e.taprootTweak)
    return {
      preTweakedKey: r.toBytes(!0),
      finalKey: r.toBytes(!0)
    };
  const s = pa.utils.taggedHash("TapTweak", r.toBytes(!0).subarray(1), e.taprootTweak ?? new Uint8Array(0)), { aggPublicKey: i } = fo(n, [s], [!0]);
  return {
    preTweakedKey: r.toBytes(!0),
    finalKey: i.toBytes(!0)
  };
}
class jr extends Error {
  constructor(t) {
    super(t), this.name = "PartialSignatureError";
  }
}
class ya {
  constructor(t, e) {
    if (this.s = t, this.R = e, t.length !== 32)
      throw new jr("Invalid s length");
    if (e.length !== 33)
      throw new jr("Invalid R length");
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
      throw new jr("Invalid partial signature length");
    if (tr(t) >= kt.CURVE().n)
      throw new jr("s value overflows curve order");
    const r = new Uint8Array(33);
    return new ya(t, r);
  }
}
function Ug(n, t, e, r, s, i) {
  let o;
  if (i?.taprootTweak !== void 0) {
    const { preTweakedKey: u } = ga(lo(r));
    o = pa.utils.taggedHash("TapTweak", u.subarray(1), i.taprootTweak);
  }
  const c = new lp(e, lo(r), s, o ? [o] : void 0, o ? [!0] : void 0).sign(n, t);
  return ya.decode(c);
}
var $i, Uc;
function Ng() {
  if (Uc) return $i;
  Uc = 1;
  const n = 4294967295, t = 1 << 31, e = 9, r = 65535, s = 1 << 22, i = r, o = 1 << e, a = r << e;
  function c(l) {
    return l & t ? {} : l & s ? {
      seconds: (l & r) << e
    } : {
      blocks: l & r
    };
  }
  function u({ blocks: l, seconds: d }) {
    if (l !== void 0 && d !== void 0) throw new TypeError("Cannot encode blocks AND seconds");
    if (l === void 0 && d === void 0) return n;
    if (d !== void 0) {
      if (!Number.isFinite(d)) throw new TypeError("Expected Number seconds");
      if (d > a) throw new TypeError("Expected Number seconds <= " + a);
      if (d % o !== 0) throw new TypeError("Expected Number seconds as a multiple of " + o);
      return s | d >> e;
    }
    if (!Number.isFinite(l)) throw new TypeError("Expected Number blocks");
    if (l > r) throw new TypeError("Expected Number blocks <= " + i);
    return l;
  }
  return $i = { decode: c, encode: u }, $i;
}
var To = Ng(), Ht;
(function(n) {
  n.VtxoTaprootTree = "taptree", n.VtxoTreeExpiry = "expiry", n.Cosigner = "cosigner", n.ConditionWitness = "condition";
})(Ht || (Ht = {}));
const wa = 222;
function Rg(n, t, e, r) {
  n.updateInput(t, {
    unknown: [
      ...n.getInput(t)?.unknown ?? [],
      e.encode(r)
    ]
  });
}
function So(n, t, e) {
  const r = n.getInput(t)?.unknown ?? [], s = [];
  for (const i of r) {
    const o = e.decode(i);
    o && s.push(o);
  }
  return s;
}
const Lf = {
  key: Ht.VtxoTaprootTree,
  encode: (n) => [
    {
      type: wa,
      key: ui[Ht.VtxoTaprootTree]
    },
    n
  ],
  decode: (n) => ma(() => ba(n[0], Ht.VtxoTaprootTree) ? n[1] : null)
}, Cg = {
  key: Ht.ConditionWitness,
  encode: (n) => [
    {
      type: wa,
      key: ui[Ht.ConditionWitness]
    },
    Tr.encode(n)
  ],
  decode: (n) => ma(() => ba(n[0], Ht.ConditionWitness) ? Tr.decode(n[1]) : null)
}, vo = {
  key: Ht.Cosigner,
  encode: (n) => [
    {
      type: wa,
      key: new Uint8Array([
        ...ui[Ht.Cosigner],
        n.index
      ])
    },
    n.key
  ],
  decode: (n) => ma(() => ba(n[0], Ht.Cosigner) ? {
    index: n[0].key[n[0].key.length - 1],
    key: n[1]
  } : null)
};
Ht.VtxoTreeExpiry;
const ui = Object.fromEntries(Object.values(Ht).map((n) => [
  n,
  new TextEncoder().encode(n)
])), ma = (n) => {
  try {
    return n();
  } catch {
    return null;
  }
};
function ba(n, t) {
  const e = k.encode(ui[t]);
  return k.encode(new Uint8Array([n.type, ...n.key])).includes(e);
}
const Wr = new Error("missing vtxo graph");
class kr {
  constructor(t) {
    this.secretKey = t, this.myNonces = null, this.aggregateNonces = null, this.graph = null, this.scriptRoot = null, this.rootSharedOutputAmount = null;
  }
  static random() {
    const t = eo();
    return new kr(t);
  }
  async init(t, e, r) {
    this.graph = t, this.scriptRoot = e, this.rootSharedOutputAmount = r;
  }
  async getPublicKey() {
    return Bc.getPublicKey(this.secretKey);
  }
  async getNonces() {
    if (!this.graph)
      throw Wr;
    this.myNonces || (this.myNonces = this.generateNonces());
    const t = /* @__PURE__ */ new Map();
    for (const [e, r] of this.myNonces)
      t.set(e, { pubNonce: r.pubNonce });
    return t;
  }
  async aggregatedNonces(t, e) {
    if (!this.graph)
      throw Wr;
    if (this.aggregateNonces || (this.aggregateNonces = /* @__PURE__ */ new Map()), this.myNonces || await this.getNonces(), this.aggregateNonces.has(t))
      return {
        hasAllNonces: this.aggregateNonces.size === this.myNonces?.size
      };
    const r = this.myNonces.get(t);
    if (!r)
      throw new Error(`missing nonce for txid ${t}`);
    const s = await this.getPublicKey();
    e.set(k.encode(s.subarray(1)), r);
    const i = this.graph.find(t);
    if (!i)
      throw new Error(`missing tx for txid ${t}`);
    const o = So(i.root, 0, vo).map(
      (u) => k.encode(u.key.subarray(1))
      // xonly pubkey
    ), a = [];
    for (const u of o) {
      const l = e.get(u);
      if (!l)
        throw new Error(`missing nonce for cosigner ${u}`);
      a.push(l.pubNonce);
    }
    const c = dp(a);
    return this.aggregateNonces.set(t, { pubNonce: c }), {
      hasAllNonces: this.aggregateNonces.size === this.myNonces?.size
    };
  }
  async sign() {
    if (!this.graph)
      throw Wr;
    if (!this.aggregateNonces)
      throw new Error("nonces not set");
    if (!this.myNonces)
      throw new Error("nonces not generated");
    const t = /* @__PURE__ */ new Map();
    for (const e of this.graph.iterator()) {
      const r = this.signPartial(e);
      t.set(e.txid, r);
    }
    return t;
  }
  generateNonces() {
    if (!this.graph)
      throw Wr;
    const t = /* @__PURE__ */ new Map(), e = Bc.getPublicKey(this.secretKey);
    for (const r of this.graph.iterator()) {
      const s = fp(e);
      t.set(r.txid, s);
    }
    return t;
  }
  signPartial(t) {
    if (!this.graph || !this.scriptRoot || !this.rootSharedOutputAmount)
      throw kr.NOT_INITIALIZED;
    if (!this.myNonces || !this.aggregateNonces)
      throw new Error("session not properly initialized");
    const e = this.myNonces.get(t.txid);
    if (!e)
      throw new Error("missing private nonce");
    const r = this.aggregateNonces.get(t.txid);
    if (!r)
      throw new Error("missing aggregate nonce");
    const s = [], i = [], o = So(t.root, 0, vo).map((u) => u.key), { finalKey: a } = ga(o, !0, {
      taprootTweak: this.scriptRoot
    });
    for (let u = 0; u < t.root.inputsLength; u++) {
      const l = Lg(a, this.graph, this.rootSharedOutputAmount, t.root);
      s.push(l.amount), i.push(l.script);
    }
    const c = t.root.preimageWitnessV1(
      0,
      // always first input
      i,
      bn.DEFAULT,
      s
    );
    return Ug(e.secNonce, this.secretKey, r.pubNonce, o, c, {
      taprootTweak: this.scriptRoot
    });
  }
}
kr.NOT_INITIALIZED = new Error("session not initialized, call init method");
function Lg(n, t, e, r) {
  const s = K.encode(["OP_1", n.slice(1)]);
  if (r.id === t.txid)
    return {
      amount: e,
      script: s
    };
  const i = r.getInput(0);
  if (!i.txid)
    throw new Error("missing parent input txid");
  const o = k.encode(i.txid), a = t.find(o);
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
const Nc = Object.values(bn).filter((n) => typeof n == "number");
class yr {
  constructor(t) {
    this.key = t || eo();
  }
  static fromPrivateKey(t) {
    return new yr(t);
  }
  static fromHex(t) {
    return new yr(k.decode(t));
  }
  static fromRandomBytes() {
    return new yr(eo());
  }
  /**
   * Export the private key as a hex string.
   *
   * @returns The private key as a hex string
   */
  toHex() {
    return k.encode(this.key);
  }
  async sign(t, e) {
    const r = t.clone();
    if (!e) {
      try {
        if (!r.sign(this.key, Nc))
          throw new Error("Failed to sign transaction");
      } catch (s) {
        if (!(s instanceof Error && s.message.includes("No inputs signed"))) throw s;
      }
      return r;
    }
    for (const s of e)
      if (!r.signIdx(this.key, s, Nc))
        throw new Error(`Failed to sign input #${s}`);
    return r;
  }
  compressedPublicKey() {
    return Promise.resolve(gl(this.key, !0));
  }
  xOnlyPublicKey() {
    return Promise.resolve(qo(this.key));
  }
  signerSession() {
    return kr.random();
  }
  async signMessage(t, e = "schnorr") {
    return e === "ecdsa" ? jp(t, this.key, { prehash: !1 }) : Qp.signAsync(t, this.key);
  }
  async toReadonly() {
    return new li(await this.compressedPublicKey());
  }
}
class li {
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
    return new li(t);
  }
  xOnlyPublicKey() {
    return Promise.resolve(this.publicKey.slice(1));
  }
  compressedPublicKey() {
    return Promise.resolve(this.publicKey);
  }
}
class Zt {
  constructor(t, e, r, s = 0) {
    if (this.serverPubKey = t, this.vtxoTaprootKey = e, this.hrp = r, this.version = s, t.length !== 32)
      throw new Error("Invalid server public key length, expected 32 bytes, got " + t.length);
    if (e.length !== 32)
      throw new Error("Invalid vtxo taproot public key length, expected 32 bytes, got " + e.length);
  }
  static decode(t) {
    const e = An.decodeUnsafe(t, 1023);
    if (!e)
      throw new Error("Invalid address");
    const r = new Uint8Array(An.fromWords(e.words));
    if (r.length !== 65)
      throw new Error("Invalid data length, expected 65 bytes, got " + r.length);
    const s = r[0], i = r.slice(1, 33), o = r.slice(33, 65);
    return new Zt(i, o, e.prefix, s);
  }
  encode() {
    const t = new Uint8Array(65);
    t[0] = this.version, t.set(this.serverPubKey, 1), t.set(this.vtxoTaprootKey, 33);
    const e = An.toWords(t);
    return An.encode(this.hrp, e, 1023);
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
const Ps = Xo(void 0, !0);
var gt;
(function(n) {
  n.Multisig = "multisig", n.CSVMultisig = "csv-multisig", n.ConditionCSVMultisig = "condition-csv-multisig", n.ConditionMultisig = "condition-multisig", n.CLTVMultisig = "cltv-multisig";
})(gt || (gt = {}));
function Pf(n) {
  const t = [
    ce,
    Ft,
    Br,
    _s,
    Gn
  ];
  for (const e of t)
    try {
      return e.decode(n);
    } catch {
      continue;
    }
  throw new Error(`Failed to decode: script ${k.encode(n)} is not a valid tapscript`);
}
var ce;
(function(n) {
  let t;
  (function(a) {
    a[a.CHECKSIG = 0] = "CHECKSIG", a[a.CHECKSIGADD = 1] = "CHECKSIGADD";
  })(t = n.MultisigType || (n.MultisigType = {}));
  function e(a) {
    if (a.pubkeys.length === 0)
      throw new Error("At least 1 pubkey is required");
    for (const u of a.pubkeys)
      if (u.length !== 32)
        throw new Error(`Invalid pubkey length: expected 32, got ${u.length}`);
    if (a.type || (a.type = t.CHECKSIG), a.type === t.CHECKSIGADD)
      return {
        type: gt.Multisig,
        params: a,
        script: Jh(a.pubkeys.length, a.pubkeys).script
      };
    const c = [];
    for (let u = 0; u < a.pubkeys.length; u++)
      c.push(a.pubkeys[u]), u < a.pubkeys.length - 1 ? c.push("CHECKSIGVERIFY") : c.push("CHECKSIG");
    return {
      type: gt.Multisig,
      params: a,
      script: K.encode(c)
    };
  }
  n.encode = e;
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
  n.decode = r;
  function s(a) {
    const c = K.decode(a), u = [];
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
    const d = e({
      pubkeys: u,
      type: t.CHECKSIGADD
    });
    if (k.encode(d.script) !== k.encode(a))
      throw new Error("Invalid script format: script reconstruction mismatch");
    return {
      type: gt.Multisig,
      params: { pubkeys: u, type: t.CHECKSIGADD },
      script: a
    };
  }
  function i(a) {
    const c = K.decode(a), u = [];
    for (let d = 0; d < c.length; d++) {
      const h = c[d];
      if (typeof h != "string" && typeof h != "number") {
        if (h.length !== 32)
          throw new Error(`Invalid pubkey length: expected 32, got ${h.length}`);
        if (u.push(h), d + 1 >= c.length)
          throw new Error("Unexpected end of script");
        const p = c[d + 1];
        if (p !== "CHECKSIGVERIFY" && p !== "CHECKSIG")
          throw new Error("Expected CHECKSIGVERIFY or CHECKSIG after pubkey");
        if (d === c.length - 2 && p !== "CHECKSIG")
          throw new Error("Last operation must be CHECKSIG");
        d++;
        continue;
      }
    }
    if (u.length === 0)
      throw new Error("Invalid script: must have at least 1 pubkey");
    const l = e({ pubkeys: u, type: t.CHECKSIG });
    if (k.encode(l.script) !== k.encode(a))
      throw new Error("Invalid script format: script reconstruction mismatch");
    return {
      type: gt.Multisig,
      params: { pubkeys: u, type: t.CHECKSIG },
      script: a
    };
  }
  function o(a) {
    return a.type === gt.Multisig;
  }
  n.is = o;
})(ce || (ce = {}));
var Ft;
(function(n) {
  function t(s) {
    for (const u of s.pubkeys)
      if (u.length !== 32)
        throw new Error(`Invalid pubkey length: expected 32, got ${u.length}`);
    const i = Ps.encode(BigInt(To.encode(s.timelock.type === "blocks" ? { blocks: Number(s.timelock.value) } : { seconds: Number(s.timelock.value) }))), o = [
      i.length === 1 ? i[0] : i,
      "CHECKSEQUENCEVERIFY",
      "DROP"
    ], a = ce.encode(s), c = new Uint8Array([
      ...K.encode(o),
      ...a.script
    ]);
    return {
      type: gt.CSVMultisig,
      params: s,
      script: c
    };
  }
  n.encode = t;
  function e(s) {
    if (s.length === 0)
      throw new Error("Failed to decode: script is empty");
    const i = K.decode(s);
    if (i.length < 3)
      throw new Error("Invalid script: too short (expected at least 3)");
    const o = i[0];
    if (typeof o == "string")
      throw new Error("Invalid script: expected sequence number");
    if (i[1] !== "CHECKSEQUENCEVERIFY" || i[2] !== "DROP")
      throw new Error("Invalid script: expected CHECKSEQUENCEVERIFY DROP");
    const a = new Uint8Array(K.encode(i.slice(3)));
    let c;
    try {
      c = ce.decode(a);
    } catch (p) {
      throw new Error(`Invalid multisig script: ${p instanceof Error ? p.message : String(p)}`);
    }
    let u;
    typeof o == "number" ? u = o : u = Number(Ps.decode(o));
    const l = To.decode(u), d = l.blocks !== void 0 ? { type: "blocks", value: BigInt(l.blocks) } : { type: "seconds", value: BigInt(l.seconds) }, h = t({
      timelock: d,
      ...c.params
    });
    if (k.encode(h.script) !== k.encode(s))
      throw new Error("Invalid script format: script reconstruction mismatch");
    return {
      type: gt.CSVMultisig,
      params: {
        timelock: d,
        ...c.params
      },
      script: s
    };
  }
  n.decode = e;
  function r(s) {
    return s.type === gt.CSVMultisig;
  }
  n.is = r;
})(Ft || (Ft = {}));
var Br;
(function(n) {
  function t(s) {
    const i = new Uint8Array([
      ...s.conditionScript,
      ...K.encode(["VERIFY"]),
      ...Ft.encode(s).script
    ]);
    return {
      type: gt.ConditionCSVMultisig,
      params: s,
      script: i
    };
  }
  n.encode = t;
  function e(s) {
    if (s.length === 0)
      throw new Error("Failed to decode: script is empty");
    const i = K.decode(s);
    if (i.length < 1)
      throw new Error("Invalid script: too short (expected at least 1)");
    let o = -1;
    for (let d = i.length - 1; d >= 0; d--)
      i[d] === "VERIFY" && (o = d);
    if (o === -1)
      throw new Error("Invalid script: missing VERIFY operation");
    const a = new Uint8Array(K.encode(i.slice(0, o))), c = new Uint8Array(K.encode(i.slice(o + 1)));
    let u;
    try {
      u = Ft.decode(c);
    } catch (d) {
      throw new Error(`Invalid CSV multisig script: ${d instanceof Error ? d.message : String(d)}`);
    }
    const l = t({
      conditionScript: a,
      ...u.params
    });
    if (k.encode(l.script) !== k.encode(s))
      throw new Error("Invalid script format: script reconstruction mismatch");
    return {
      type: gt.ConditionCSVMultisig,
      params: {
        conditionScript: a,
        ...u.params
      },
      script: s
    };
  }
  n.decode = e;
  function r(s) {
    return s.type === gt.ConditionCSVMultisig;
  }
  n.is = r;
})(Br || (Br = {}));
var _s;
(function(n) {
  function t(s) {
    const i = new Uint8Array([
      ...s.conditionScript,
      ...K.encode(["VERIFY"]),
      ...ce.encode(s).script
    ]);
    return {
      type: gt.ConditionMultisig,
      params: s,
      script: i
    };
  }
  n.encode = t;
  function e(s) {
    if (s.length === 0)
      throw new Error("Failed to decode: script is empty");
    const i = K.decode(s);
    if (i.length < 1)
      throw new Error("Invalid script: too short (expected at least 1)");
    let o = -1;
    for (let d = i.length - 1; d >= 0; d--)
      i[d] === "VERIFY" && (o = d);
    if (o === -1)
      throw new Error("Invalid script: missing VERIFY operation");
    const a = new Uint8Array(K.encode(i.slice(0, o))), c = new Uint8Array(K.encode(i.slice(o + 1)));
    let u;
    try {
      u = ce.decode(c);
    } catch (d) {
      throw new Error(`Invalid multisig script: ${d instanceof Error ? d.message : String(d)}`);
    }
    const l = t({
      conditionScript: a,
      ...u.params
    });
    if (k.encode(l.script) !== k.encode(s))
      throw new Error("Invalid script format: script reconstruction mismatch");
    return {
      type: gt.ConditionMultisig,
      params: {
        conditionScript: a,
        ...u.params
      },
      script: s
    };
  }
  n.decode = e;
  function r(s) {
    return s.type === gt.ConditionMultisig;
  }
  n.is = r;
})(_s || (_s = {}));
var Gn;
(function(n) {
  function t(s) {
    const i = Ps.encode(s.absoluteTimelock), o = [
      i.length === 1 ? i[0] : i,
      "CHECKLOCKTIMEVERIFY",
      "DROP"
    ], a = K.encode(o), c = new Uint8Array([
      ...a,
      ...ce.encode(s).script
    ]);
    return {
      type: gt.CLTVMultisig,
      params: s,
      script: c
    };
  }
  n.encode = t;
  function e(s) {
    if (s.length === 0)
      throw new Error("Failed to decode: script is empty");
    const i = K.decode(s);
    if (i.length < 3)
      throw new Error("Invalid script: too short (expected at least 3)");
    const o = i[0];
    if (typeof o == "string" || typeof o == "number")
      throw new Error("Invalid script: expected locktime number");
    if (i[1] !== "CHECKLOCKTIMEVERIFY" || i[2] !== "DROP")
      throw new Error("Invalid script: expected CHECKLOCKTIMEVERIFY DROP");
    const a = new Uint8Array(K.encode(i.slice(3)));
    let c;
    try {
      c = ce.decode(a);
    } catch (d) {
      throw new Error(`Invalid multisig script: ${d instanceof Error ? d.message : String(d)}`);
    }
    const u = Ps.decode(o), l = t({
      absoluteTimelock: u,
      ...c.params
    });
    if (k.encode(l.script) !== k.encode(s))
      throw new Error("Invalid script format: script reconstruction mismatch");
    return {
      type: gt.CLTVMultisig,
      params: {
        absoluteTimelock: u,
        ...c.params
      },
      script: s
    };
  }
  n.decode = e;
  function r(s) {
    return s.type === gt.CLTVMultisig;
  }
  n.is = r;
})(Gn || (Gn = {}));
const Rc = Sr.tapTree[2];
function wr(n) {
  return n[1].subarray(0, n[1].length - 1);
}
class Xt {
  static decode(t) {
    const r = Rc.decode(t).map((s) => s.script);
    return new Xt(r);
  }
  constructor(t) {
    this.scripts = t;
    const e = t.length % 2 !== 0 ? t.slice().reverse() : t, r = Sl(e.map((i) => ({
      script: i,
      leafVersion: vr
    }))), s = Qh(Zo, r, void 0, !0);
    if (!s.tapLeafScript || s.tapLeafScript.length !== t.length)
      throw new Error("invalid scripts");
    this.leaves = s.tapLeafScript, this.tweakedPublicKey = s.tweakedPubkey;
  }
  encode() {
    return Rc.encode(this.scripts.map((e) => ({
      depth: 1,
      version: vr,
      script: e
    })));
  }
  address(t, e) {
    return new Zt(e, this.tweakedPublicKey, t);
  }
  get pkScript() {
    return K.encode(["OP_1", this.tweakedPublicKey]);
  }
  onchainAddress(t) {
    return Qe(t).encode({
      type: "tr",
      pubkey: this.tweakedPublicKey
    });
  }
  findLeaf(t) {
    const e = this.leaves.find((r) => k.encode(wr(r)) === t);
    if (!e)
      throw new Error(`leaf '${t}' not found`);
    return e;
  }
  exitPaths() {
    const t = [];
    for (const e of this.leaves)
      try {
        const r = Ft.decode(wr(e));
        t.push(r);
        continue;
      } catch {
        try {
          const s = Br.decode(wr(e));
          t.push(s);
        } catch {
          continue;
        }
      }
    return t;
  }
}
var Cc;
(function(n) {
  class t extends Xt {
    constructor(s) {
      e(s);
      const { sender: i, receiver: o, server: a, preimageHash: c, refundLocktime: u, unilateralClaimDelay: l, unilateralRefundDelay: d, unilateralRefundWithoutReceiverDelay: h } = s, p = Pg(c), y = _s.encode({
        conditionScript: p,
        pubkeys: [o, a]
      }).script, f = ce.encode({
        pubkeys: [i, o, a]
      }).script, g = Gn.encode({
        absoluteTimelock: u,
        pubkeys: [i, a]
      }).script, m = Br.encode({
        conditionScript: p,
        timelock: l,
        pubkeys: [o]
      }).script, S = Ft.encode({
        timelock: d,
        pubkeys: [i, o]
      }).script, I = Ft.encode({
        timelock: h,
        pubkeys: [i]
      }).script;
      super([
        y,
        f,
        g,
        m,
        S,
        I
      ]), this.options = s, this.claimScript = k.encode(y), this.refundScript = k.encode(f), this.refundWithoutReceiverScript = k.encode(g), this.unilateralClaimScript = k.encode(m), this.unilateralRefundScript = k.encode(S), this.unilateralRefundWithoutReceiverScript = k.encode(I);
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
  n.Script = t;
  function e(r) {
    const { sender: s, receiver: i, server: o, preimageHash: a, refundLocktime: c, unilateralClaimDelay: u, unilateralRefundDelay: l, unilateralRefundWithoutReceiverDelay: d } = r;
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
    if (!d || typeof d.value != "bigint" || d.value <= 0n)
      throw new Error("unilateral refund without receiver delay must greater than 0");
    if (d.type === "seconds" && d.value % 512n !== 0n)
      throw new Error("seconds timelock must be multiple of 512");
    if (d.type === "seconds" && d.value < 512n)
      throw new Error("seconds timelock must be greater or equal to 512");
  }
})(Cc || (Cc = {}));
function Pg(n) {
  return K.encode(["HASH160", n, "EQUAL"]);
}
var Ds;
(function(n) {
  class t extends Xt {
    constructor(r) {
      const { pubKey: s, serverPubKey: i, csvTimelock: o = t.DEFAULT_TIMELOCK } = r, a = ce.encode({
        pubkeys: [s, i]
      }).script, c = Ft.encode({
        timelock: o,
        pubkeys: [s]
      }).script;
      super([a, c]), this.options = r, this.forfeitScript = k.encode(a), this.exitScript = k.encode(c);
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
  }, n.Script = t;
})(Ds || (Ds = {}));
var ke;
(function(n) {
  n.TxSent = "SENT", n.TxReceived = "RECEIVED";
})(ke || (ke = {}));
function he(n) {
  return !n.isSpent;
}
function Ea(n) {
  return n.virtualStatus.state === "swept" && he(n);
}
function _f(n) {
  if (n.virtualStatus.state === "swept")
    return !0;
  const t = n.virtualStatus.batchExpiry;
  return !t || new Date(t).getFullYear() < 2025 ? !1 : t <= Date.now();
}
function Df(n, t) {
  return n.value < t;
}
async function* Io(n) {
  const t = [], e = [];
  let r = null, s = null;
  const i = (a) => {
    r ? (r(a), r = null) : t.push(a);
  }, o = () => {
    const a = new Error("EventSource error");
    s ? (s(a), s = null) : e.push(a);
  };
  n.addEventListener("message", i), n.addEventListener("error", o);
  try {
    for (; ; ) {
      if (t.length > 0) {
        yield t.shift();
        continue;
      }
      if (e.length > 0)
        throw e.shift();
      const a = await new Promise((c, u) => {
        r = c, s = u;
      }).finally(() => {
        r = null, s = null;
      });
      a && (yield a);
    }
  } finally {
    n.removeEventListener("message", i), n.removeEventListener("error", o);
  }
}
class Vf extends Error {
  constructor(t, e, r, s) {
    super(e), this.code = t, this.message = e, this.name = r, this.metadata = s;
  }
}
function _g(n) {
  try {
    if (!(n instanceof Error))
      return;
    const t = JSON.parse(n.message);
    if (!("details" in t) || !Array.isArray(t.details))
      return;
    for (const e of t.details) {
      if (!("@type" in e) || e["@type"] !== "type.googleapis.com/ark.v1.ErrorDetails" || !("code" in e))
        continue;
      const s = e.code;
      if (!("message" in e))
        continue;
      const i = e.message;
      if (!("name" in e))
        continue;
      const o = e.name;
      let a;
      return "metadata" in e && Dg(e.metadata) && (a = e.metadata), new Vf(s, i, o, a);
    }
    return;
  } catch {
    return;
  }
}
function Dg(n) {
  return typeof n == "object" && n !== null && !Array.isArray(n);
}
var We;
(function(n) {
  function t(s, i, o = []) {
    if (typeof s != "string" && (s = r(s)), i.length == 0)
      throw new Error("intent proof requires at least one input");
    Kg(i), Wg(o);
    const a = Gg(s, i[0].witnessUtxo.script);
    return qg(a, i, o);
  }
  n.create = t;
  function e(s) {
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
  n.fee = e;
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
  n.encodeMessage = r;
})(We || (We = {}));
const Vg = new Uint8Array([yt.RETURN]), Mg = new Uint8Array(32).fill(0), Hg = 4294967295, Fg = "ark-intent-proof-message";
function zg(n) {
  if (n.index === void 0)
    throw new Error("intent proof input requires index");
  if (n.txid === void 0)
    throw new Error("intent proof input requires txid");
  if (n.witnessUtxo === void 0)
    throw new Error("intent proof input requires witness utxo");
  return !0;
}
function Kg(n) {
  return n.forEach(zg), !0;
}
function jg(n) {
  if (n.amount === void 0)
    throw new Error("intent proof output requires amount");
  if (n.script === void 0)
    throw new Error("intent proof output requires script");
  return !0;
}
function Wg(n) {
  return n.forEach(jg), !0;
}
function Gg(n, t) {
  const e = Yg(n), r = new Je({
    version: 0
  });
  return r.addInput({
    txid: Mg,
    // zero hash
    index: Hg,
    sequence: 0
  }), r.addOutput({
    amount: 0n,
    script: t
  }), r.updateInput(0, {
    finalScriptSig: K.encode(["OP_0", e])
  }), r;
}
function qg(n, t, e) {
  const r = t[0], s = t.map((o) => o.sequence || 0).reduce((o, a) => Math.max(o, a), 0), i = new Je({
    version: 2,
    lockTime: s
  });
  i.addInput({
    ...r,
    txid: n.id,
    index: 0,
    witnessUtxo: {
      script: r.witnessUtxo.script,
      amount: 0n
    },
    sighashType: bn.ALL
  });
  for (const [o, a] of t.entries())
    i.addInput({
      ...a,
      sighashType: bn.ALL
    }), a.unknown?.length && i.updateInput(o + 1, {
      unknown: a.unknown
    });
  e.length === 0 && (e = [
    {
      amount: 0n,
      script: Vg
    }
  ]);
  for (const o of e)
    i.addOutput({
      amount: o.amount,
      script: o.script
    });
  return i;
}
function Yg(n) {
  return pa.utils.taggedHash(Fg, new TextEncoder().encode(n));
}
var mt;
(function(n) {
  n.BatchStarted = "batch_started", n.BatchFinalization = "batch_finalization", n.BatchFinalized = "batch_finalized", n.BatchFailed = "batch_failed", n.TreeSigningStarted = "tree_signing_started", n.TreeNonces = "tree_nonces", n.TreeTx = "tree_tx", n.TreeSignature = "tree_signature";
})(mt || (mt = {}));
class Mf {
  constructor(t) {
    this.serverUrl = t;
  }
  async getInfo() {
    const t = `${this.serverUrl}/v1/info`, e = await fetch(t);
    if (!e.ok) {
      const s = await e.text();
      fe(s, `Failed to get server info: ${e.statusText}`);
    }
    const r = await e.json();
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
  async submitTx(t, e) {
    const r = `${this.serverUrl}/v1/tx/submit`, s = await fetch(r, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        signedArkTx: t,
        checkpointTxs: e
      })
    });
    if (!s.ok) {
      const o = await s.text();
      fe(o, `Failed to submit virtual transaction: ${o}`);
    }
    const i = await s.json();
    return {
      arkTxid: i.arkTxid,
      finalArkTx: i.finalArkTx,
      signedCheckpointTxs: i.signedCheckpointTxs
    };
  }
  async finalizeTx(t, e) {
    const r = `${this.serverUrl}/v1/tx/finalize`, s = await fetch(r, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        arkTxid: t,
        finalCheckpointTxs: e
      })
    });
    if (!s.ok) {
      const i = await s.text();
      fe(i, `Failed to finalize offchain transaction: ${i}`);
    }
  }
  async registerIntent(t) {
    const e = `${this.serverUrl}/v1/batch/registerIntent`, r = await fetch(e, {
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
      fe(i, `Failed to register intent: ${i}`);
    }
    return (await r.json()).intentId;
  }
  async deleteIntent(t) {
    const e = `${this.serverUrl}/v1/batch/deleteIntent`, r = await fetch(e, {
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
      fe(s, `Failed to delete intent: ${s}`);
    }
  }
  async confirmRegistration(t) {
    const e = `${this.serverUrl}/v1/batch/ack`, r = await fetch(e, {
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
      fe(s, `Failed to confirm registration: ${s}`);
    }
  }
  async submitTreeNonces(t, e, r) {
    const s = `${this.serverUrl}/v1/batch/tree/submitNonces`, i = await fetch(s, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        batchId: t,
        pubkey: e,
        treeNonces: Zg(r)
      })
    });
    if (!i.ok) {
      const o = await i.text();
      fe(o, `Failed to submit tree nonces: ${o}`);
    }
  }
  async submitTreeSignatures(t, e, r) {
    const s = `${this.serverUrl}/v1/batch/tree/submitSignatures`, i = await fetch(s, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        batchId: t,
        pubkey: e,
        treeSignatures: Xg(r)
      })
    });
    if (!i.ok) {
      const o = await i.text();
      fe(o, `Failed to submit tree signatures: ${o}`);
    }
  }
  async submitSignedForfeitTxs(t, e) {
    const r = `${this.serverUrl}/v1/batch/submitForfeitTxs`, s = await fetch(r, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        signedForfeitTxs: t,
        signedCommitmentTx: e
      })
    });
    if (!s.ok) {
      const i = await s.text();
      fe(i, `Failed to submit forfeit transactions: ${s.statusText}`);
    }
  }
  async *getEventStream(t, e) {
    const r = `${this.serverUrl}/v1/batch/events`, s = e.length > 0 ? `?${e.map((i) => `topics=${encodeURIComponent(i)}`).join("&")}` : "";
    for (; !t?.aborted; )
      try {
        const i = new EventSource(r + s), o = () => {
          i.close();
        };
        t?.addEventListener("abort", o);
        try {
          for await (const a of Io(i)) {
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
        if (Ao(i)) {
          console.debug("Timeout error ignored");
          continue;
        }
        throw console.error("Event stream error:", i), i;
      }
  }
  async *getTransactionsStream(t) {
    const e = `${this.serverUrl}/v1/txs`;
    for (; !t?.aborted; )
      try {
        const r = new EventSource(e), s = () => {
          r.close();
        };
        t?.addEventListener("abort", s);
        try {
          for await (const i of Io(r)) {
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
        if (Ao(r)) {
          console.debug("Timeout error ignored");
          continue;
        }
        throw console.error("Transaction stream error:", r), r;
      }
  }
  async getPendingTxs(t) {
    const e = `${this.serverUrl}/v1/tx/pending`, r = await fetch(e, {
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
      fe(i, `Failed to get pending transactions: ${i}`);
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
        nonces: Qg(t.treeNonces.nonces)
        // pubkey -> public nonce
      };
    if (t.treeTx) {
      const e = Object.fromEntries(Object.entries(t.treeTx.children).map(([r, s]) => [parseInt(r), s]));
      return {
        type: mt.TreeTx,
        id: t.treeTx.id,
        topic: t.treeTx.topic,
        batchIndex: t.treeTx.batchIndex,
        chunk: {
          txid: t.treeTx.txid,
          tx: t.treeTx.tx,
          children: e
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
    } : (t.heartbeat || t.streamStarted || console.warn("Unknown event type:", t), null);
  }
  parseTransactionNotification(t) {
    return t.commitmentTx ? {
      commitmentTx: {
        txid: t.commitmentTx.txid,
        tx: t.commitmentTx.tx,
        spentVtxos: t.commitmentTx.spentVtxos.map(Gr),
        spendableVtxos: t.commitmentTx.spendableVtxos.map(Gr),
        checkpointTxs: t.commitmentTx.checkpointTxs
      }
    } : t.arkTx ? {
      arkTx: {
        txid: t.arkTx.txid,
        tx: t.arkTx.tx,
        spentVtxos: t.arkTx.spentVtxos.map(Gr),
        spendableVtxos: t.arkTx.spendableVtxos.map(Gr),
        checkpointTxs: t.arkTx.checkpointTxs
      }
    } : (t.heartbeat || console.warn("Unknown transaction notification type:", t), null);
  }
}
function Zg(n) {
  const t = {};
  for (const [e, r] of n)
    t[e] = k.encode(r.pubNonce);
  return t;
}
function Xg(n) {
  const t = {};
  for (const [e, r] of n)
    t[e] = k.encode(r.encode());
  return t;
}
function Qg(n) {
  return new Map(Object.entries(n).map(([t, e]) => {
    if (typeof e != "string")
      throw new Error("invalid nonce");
    return [t, { pubNonce: k.decode(e) }];
  }));
}
function Ao(n) {
  const t = (e) => e instanceof Error ? e.name === "TypeError" && e.message === "Failed to fetch" || e.name === "HeadersTimeoutError" || e.name === "BodyTimeoutError" || e.code === "UND_ERR_HEADERS_TIMEOUT" || e.code === "UND_ERR_BODY_TIMEOUT" : !1;
  return t(n) || t(n.cause);
}
function Gr(n) {
  return {
    outpoint: {
      txid: n.outpoint.txid,
      vout: n.outpoint.vout
    },
    amount: n.amount,
    script: n.script,
    createdAt: n.createdAt,
    expiresAt: n.expiresAt,
    commitmentTxids: n.commitmentTxids,
    isPreconfirmed: n.isPreconfirmed,
    isSwept: n.isSwept,
    isUnrolled: n.isUnrolled,
    isSpent: n.isSpent,
    spentBy: n.spentBy,
    settledBy: n.settledBy,
    arkTxid: n.arkTxid
  };
}
function fe(n, t) {
  const e = new Error(n);
  throw _g(e) ?? new Error(t);
}
class os {
  constructor(t, e = /* @__PURE__ */ new Map()) {
    this.root = t, this.children = e;
  }
  static create(t) {
    if (t.length === 0)
      throw new Error("empty chunks");
    const e = /* @__PURE__ */ new Map();
    for (const i of t) {
      const o = ty(i), a = o.tx.id;
      e.set(a, o);
    }
    const r = [];
    for (const [i] of e) {
      let o = !1;
      for (const [a, c] of e)
        if (a !== i && (o = Jg(c, i), o))
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
    const s = Hf(r[0], e);
    if (!s)
      throw new Error(`chunk not found for root txid: ${r[0]}`);
    if (s.nbOfNodes() !== t.length)
      throw new Error(`number of chunks (${t.length}) is not equal to the number of nodes in the graph (${s.nbOfNodes()})`);
    return s;
  }
  nbOfNodes() {
    let t = 1;
    for (const e of this.children.values())
      t += e.nbOfNodes();
    return t;
  }
  validate() {
    if (!this.root)
      throw new Error("unexpected nil root");
    const t = this.root.outputsLength, e = this.root.inputsLength;
    if (e !== 1)
      throw new Error(`unexpected number of inputs: ${e}, expected 1`);
    if (this.children.size > t - 1)
      throw new Error(`unexpected number of children: ${this.children.size}, expected maximum ${t - 1}`);
    for (const [r, s] of this.children) {
      if (r >= t)
        throw new Error(`output index ${r} is out of bounds (nb of outputs: ${t})`);
      s.validate();
      const i = s.root.getInput(0), o = this.root.id;
      if (!i.txid || k.encode(i.txid) !== o || i.index !== r)
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
    for (const e of this.children.values())
      t.push(...e.leaves());
    return t;
  }
  get txid() {
    return this.root.id;
  }
  find(t) {
    if (t === this.txid)
      return this;
    for (const e of this.children.values()) {
      const r = e.find(t);
      if (r)
        return r;
    }
    return null;
  }
  update(t, e) {
    if (t === this.txid) {
      e(this.root);
      return;
    }
    for (const r of this.children.values())
      try {
        r.update(t, e);
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
function Jg(n, t) {
  return Object.values(n.children).includes(t);
}
function Hf(n, t) {
  const e = t.get(n);
  if (!e)
    return null;
  const r = e.tx, s = /* @__PURE__ */ new Map();
  for (const [i, o] of Object.entries(e.children)) {
    const a = parseInt(i), c = Hf(o, t);
    c && s.set(a, c);
  }
  return new os(r, s);
}
function ty(n) {
  return { tx: ne.fromPSBT(xt.decode(n.tx)), children: n.children };
}
var ko;
(function(n) {
  let t;
  (function(r) {
    r.Start = "start", r.BatchStarted = "batch_started", r.TreeSigningStarted = "tree_signing_started", r.TreeNoncesAggregated = "tree_nonces_aggregated", r.BatchFinalization = "batch_finalization";
  })(t || (t = {}));
  async function e(r, s, i = {}) {
    const { abortController: o, skipVtxoTreeSigning: a = !1, eventCallback: c } = i;
    let u = t.Start;
    const l = [], d = [];
    let h, p;
    for await (const y of r) {
      if (o?.signal.aborted)
        throw new Error("canceled");
      switch (c && c(y).catch(() => {
      }), y.type) {
        case mt.BatchStarted: {
          const f = y, { skip: g } = await s.onBatchStarted(f);
          g || (u = t.BatchStarted, a && (u = t.TreeNoncesAggregated));
          continue;
        }
        case mt.BatchFinalized: {
          if (u !== t.BatchFinalization)
            continue;
          return s.onBatchFinalized && await s.onBatchFinalized(y), y.commitmentTxid;
        }
        case mt.BatchFailed: {
          if (s.onBatchFailed) {
            await s.onBatchFailed(y);
            continue;
          }
          throw new Error(y.reason);
        }
        case mt.TreeTx: {
          if (u !== t.BatchStarted && u !== t.TreeNoncesAggregated)
            continue;
          y.batchIndex === 0 ? l.push(y.chunk) : d.push(y.chunk), s.onTreeTxEvent && await s.onTreeTxEvent(y);
          continue;
        }
        case mt.TreeSignature: {
          if (u !== t.TreeNoncesAggregated)
            continue;
          if (!h)
            throw new Error("vtxo tree not initialized");
          const f = k.decode(y.signature);
          h.update(y.txid, (g) => {
            g.updateInput(0, {
              tapKeySig: f
            });
          }), s.onTreeSignatureEvent && await s.onTreeSignatureEvent(y);
          continue;
        }
        case mt.TreeSigningStarted: {
          if (u !== t.BatchStarted)
            continue;
          h = os.create(l);
          const { skip: f } = await s.onTreeSigningStarted(y, h);
          f || (u = t.TreeSigningStarted);
          continue;
        }
        case mt.TreeNonces: {
          if (u !== t.TreeSigningStarted)
            continue;
          const { fullySigned: f } = await s.onTreeNonces(y);
          f && (u = t.TreeNoncesAggregated);
          continue;
        }
        case mt.BatchFinalization: {
          if (u !== t.TreeNoncesAggregated)
            continue;
          if (!h && l.length > 0 && (h = os.create(l)), !h && !a)
            throw new Error("vtxo tree not initialized");
          d.length > 0 && (p = os.create(d)), await s.onBatchFinalization(y, h, p), u = t.BatchFinalization;
          continue;
        }
        default:
          continue;
      }
    }
    throw new Error("event stream closed");
  }
  n.join = e;
})(ko || (ko = {}));
const ey = (n) => ny[n], ny = {
  bitcoin: ar(Fn, "ark"),
  testnet: ar(Mr, "tark"),
  signet: ar(Mr, "tark"),
  mutinynet: ar(Mr, "tark"),
  regtest: ar({
    ...Mr,
    bech32: "bcrt",
    pubKeyHash: 111,
    scriptHash: 196
  }, "tark")
};
function ar(n, t) {
  return {
    ...n,
    hrp: t
  };
}
const ry = {
  bitcoin: "https://mempool.space/api",
  testnet: "https://mempool.space/testnet/api",
  signet: "https://mempool.space/signet/api",
  mutinynet: "https://mutinynet.com/api",
  regtest: "http://localhost:3000"
};
class sy {
  constructor(t, e) {
    this.baseUrl = t, this.pollingInterval = e?.pollingInterval ?? 15e3, this.forcePolling = e?.forcePolling ?? !1;
  }
  async getCoins(t) {
    const e = await fetch(`${this.baseUrl}/address/${t}/utxo`);
    if (!e.ok)
      throw new Error(`Failed to fetch UTXOs: ${e.statusText}`);
    return e.json();
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
    const e = await fetch(`${this.baseUrl}/tx/${t}/outspends`);
    if (!e.ok) {
      const r = await e.text();
      throw new Error(`Failed to get transaction outspends: ${r}`);
    }
    return e.json();
  }
  async getTransactions(t) {
    const e = await fetch(`${this.baseUrl}/address/${t}/txs`);
    if (!e.ok) {
      const r = await e.text();
      throw new Error(`Failed to get transactions: ${r}`);
    }
    return e.json();
  }
  async getTxStatus(t) {
    const e = await fetch(`${this.baseUrl}/tx/${t}`);
    if (!e.ok)
      throw new Error(e.statusText);
    if (!(await e.json()).status.confirmed)
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
  async watchAddresses(t, e) {
    let r = null;
    const s = this.baseUrl.replace(/^http(s)?:/, "ws$1:") + "/v1/ws", i = async () => {
      const c = async () => (await Promise.all(t.map((p) => this.getTransactions(p)))).flat(), u = await c(), l = (h) => `${h.txid}_${h.status.block_time}`, d = new Set(u.map(l));
      r = setInterval(async () => {
        try {
          const p = (await c()).filter((y) => !d.has(l(y)));
          p.length > 0 && (p.forEach((y) => d.add(l(y))), e(p));
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
          const d = l["multi-address-transactions"];
          for (const h in d)
            for (const p of [
              "mempool",
              "confirmed",
              "removed"
            ])
              d[h][p] && u.push(...d[h][p].filter(oy));
          u.length > 0 && e(u);
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
    const e = await t.json();
    if (!iy(e))
      throw new Error(`Invalid chain tip: ${JSON.stringify(e)}`);
    if (e.length === 0)
      throw new Error("No chain tip found");
    const r = e[0].id;
    return {
      height: e[0].height,
      time: e[0].mediantime,
      hash: r
    };
  }
  async broadcastPackage(t, e) {
    const r = await fetch(`${this.baseUrl}/txs/package`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify([t, e])
    });
    if (!r.ok) {
      const s = await r.text();
      throw new Error(`Failed to broadcast package: ${s}`);
    }
    return r.json();
  }
  async broadcastTx(t) {
    const e = await fetch(`${this.baseUrl}/tx`, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain"
      },
      body: t
    });
    if (!e.ok) {
      const r = await e.text();
      throw new Error(`Failed to broadcast transaction: ${r}`);
    }
    return e.text();
  }
}
function iy(n) {
  return Array.isArray(n) && n.every((t) => t && typeof t == "object" && typeof t.id == "string" && t.id.length > 0 && typeof t.height == "number" && t.height >= 0 && typeof t.mediantime == "number" && t.mediantime > 0);
}
const oy = (n) => typeof n.txid == "string" && Array.isArray(n.vout) && n.vout.every((t) => typeof t.scriptpubkey_address == "string" && typeof t.value == "number") && typeof n.status == "object" && typeof n.status.confirmed == "boolean", ay = 0n, cy = new Uint8Array([81, 2, 78, 115]), xa = {
  script: cy,
  amount: ay
};
k.encode(xa.script);
function uy(n, t, e) {
  const r = new Je({
    version: 3,
    lockTime: e
  });
  let s = 0n;
  for (const i of n) {
    if (!i.witnessUtxo)
      throw new Error("input needs witness utxo");
    s += i.witnessUtxo.amount, r.addInput(i);
  }
  return r.addOutput({
    script: t,
    amount: s
  }), r.addOutput(xa), r;
}
const ly = new Error("invalid settlement transaction outputs"), fy = new Error("empty tree"), dy = new Error("invalid number of inputs"), Ui = new Error("wrong settlement txid"), hy = new Error("invalid amount"), py = new Error("no leaves"), gy = new Error("invalid taproot script"), Lc = new Error("invalid round transaction outputs"), yy = new Error("wrong commitment txid"), wy = new Error("missing cosigners public keys"), Ni = 0, Pc = 1;
function my(n, t) {
  if (t.validate(), t.root.inputsLength !== 1)
    throw dy;
  const e = t.root.getInput(0), r = ne.fromPSBT(xt.decode(n));
  if (r.outputsLength <= Pc)
    throw ly;
  const s = r.id;
  if (!e.txid || k.encode(e.txid) !== s || e.index !== Pc)
    throw Ui;
}
function by(n, t, e) {
  if (t.outputsLength < Ni + 1)
    throw Lc;
  const r = t.getOutput(Ni)?.amount;
  if (!r)
    throw Lc;
  if (!n.root)
    throw fy;
  const s = n.root.getInput(0), i = t.id;
  if (!s.txid || k.encode(s.txid) !== i || s.index !== Ni)
    throw yy;
  let o = 0n;
  for (let c = 0; c < n.root.outputsLength; c++) {
    const u = n.root.getOutput(c);
    u?.amount && (o += u.amount);
  }
  if (o !== r)
    throw hy;
  if (n.leaves().length === 0)
    throw py;
  n.validate();
  for (const c of n.iterator())
    for (const [u, l] of c.children) {
      const d = c.root.getOutput(u);
      if (!d?.script)
        throw new Error(`parent output ${u} not found`);
      const h = d.script.slice(2);
      if (h.length !== 32)
        throw new Error(`parent output ${u} has invalid script`);
      const p = So(l.root, 0, vo);
      if (p.length === 0)
        throw wy;
      const y = p.map((g) => g.key), { finalKey: f } = ga(y, !0, {
        taprootTweak: e
      });
      if (!f || k.encode(f.slice(1)) !== k.encode(h))
        throw gy;
    }
}
const Cn = 32, qr = 34;
var St;
(function(n) {
  n[n.Unspecified = 0] = "Unspecified", n[n.Local = 1] = "Local", n[n.Intent = 2] = "Intent";
})(St || (St = {}));
var Gt;
(function(n) {
  n[n.Unspecified = 0] = "Unspecified", n[n.ByID = 1] = "ByID", n[n.ByGroup = 2] = "ByGroup";
})(Gt || (Gt = {}));
const Ri = 1, Ci = 2, Li = 4, cn = new Uint8Array([65, 82, 75]), Bo = 0;
class Ce {
  constructor() {
    this.buffer = [];
  }
  write(t) {
    for (const e of t)
      this.buffer.push(e);
  }
  writeByte(t) {
    this.buffer.push(t & 255);
  }
  writeUint16LE(t) {
    const e = new Uint8Array(2);
    new DataView(e.buffer).setUint16(0, t, !0), this.write(e);
  }
  writeVarUint(t) {
    const e = typeof t == "number" ? BigInt(t) : t, r = [];
    let s = e;
    do {
      let i = Number(s & 0x7fn);
      s >>= 7n, s > 0n && (i |= 128), r.push(i);
    } while (s > 0n);
    this.write(new Uint8Array(r));
  }
  writeVarSlice(t) {
    this.writeVarUint(t.length), this.write(t);
  }
  toBytes() {
    return new Uint8Array(this.buffer);
  }
}
class Le {
  constructor(t) {
    this.offset = 0, this.view = new DataView(t.buffer, t.byteOffset, t.byteLength);
  }
  remaining() {
    return this.view.byteLength - this.offset;
  }
  readByte() {
    if (this.offset >= this.view.byteLength)
      throw new Error("unexpected end of buffer");
    return this.view.getUint8(this.offset++);
  }
  readSlice(t) {
    if (this.offset + t > this.view.byteLength)
      throw new Error("unexpected end of buffer");
    const e = new Uint8Array(this.view.buffer, this.view.byteOffset + this.offset, t);
    return this.offset += t, e;
  }
  readUint16LE() {
    if (this.offset + 2 > this.view.byteLength)
      throw new Error("unexpected end of buffer");
    const t = this.view.getUint16(this.offset, !0);
    return this.offset += 2, t;
  }
  readVarUint() {
    let t = 0n, e = 0n, r;
    do {
      if (this.offset >= this.view.byteLength)
        throw new Error("unexpected end of buffer");
      r = this.view.getUint8(this.offset++), t |= BigInt(r & 127) << e, e += 7n;
    } while (r & 128);
    return t;
  }
  readVarSlice() {
    const t = Number(this.readVarUint());
    return this.readSlice(t);
  }
}
function Ff(n) {
  return n.every((t) => t === 0);
}
class Bt {
  constructor(t, e) {
    this.txid = t, this.groupIndex = e;
  }
  static create(t, e) {
    if (!t)
      throw new Error("missing txid");
    let r;
    try {
      r = k.decode(t);
    } catch {
      throw new Error("invalid txid format, must be hex");
    }
    if (r.length !== Cn)
      throw new Error(`invalid txid length: got ${r.length} bytes, want ${Cn} bytes`);
    const s = new Bt(r, e);
    return s.validate(), s;
  }
  static fromString(t) {
    let e;
    try {
      e = k.decode(t);
    } catch {
      throw new Error("invalid asset id format, must be hex");
    }
    return Bt.fromBytes(e);
  }
  static fromBytes(t) {
    if (!t || t.length === 0)
      throw new Error("missing asset id");
    if (t.length !== qr)
      throw new Error(`invalid asset id length: got ${t.length} bytes, want ${qr} bytes`);
    const e = new Le(t);
    return Bt.fromReader(e);
  }
  serialize() {
    const t = new Ce();
    return this.serializeTo(t), t.toBytes();
  }
  toString() {
    return k.encode(this.serialize());
  }
  validate() {
    if (Ff(this.txid))
      throw new Error("empty txid");
    if (!Number.isInteger(this.groupIndex) || this.groupIndex < 0 || this.groupIndex > 65535)
      throw new Error(`invalid group index: ${this.groupIndex}, must be in range [0, 65535]`);
  }
  static fromReader(t) {
    if (t.remaining() < qr)
      throw new Error(`invalid asset id length: got ${t.remaining()}, want ${qr}`);
    const e = t.readSlice(Cn), r = t.readUint16LE(), s = new Bt(e, r);
    return s.validate(), s;
  }
  serializeTo(t) {
    t.write(this.txid), t.writeUint16LE(this.groupIndex);
  }
}
class Ae {
  constructor(t) {
    this.ref = t;
  }
  get type() {
    return this.ref.type;
  }
  static fromId(t) {
    return new Ae({ type: Gt.ByID, assetId: t });
  }
  static fromGroupIndex(t) {
    return new Ae({ type: Gt.ByGroup, groupIndex: t });
  }
  static fromString(t) {
    let e;
    try {
      e = k.decode(t);
    } catch {
      throw new Error("invalid asset ref format, must be hex");
    }
    return Ae.fromBytes(e);
  }
  static fromBytes(t) {
    if (!t || t.length === 0)
      throw new Error("missing asset ref");
    const e = new Le(t);
    return Ae.fromReader(e);
  }
  serialize() {
    const t = new Ce();
    return this.serializeTo(t), t.toBytes();
  }
  toString() {
    return k.encode(this.serialize());
  }
  static fromReader(t) {
    const e = t.readByte();
    let r;
    switch (e) {
      case Gt.ByID: {
        const s = Bt.fromReader(t);
        r = new Ae({ type: Gt.ByID, assetId: s });
        break;
      }
      case Gt.ByGroup: {
        if (t.remaining() < 2)
          throw new Error("invalid asset ref length");
        const s = t.readUint16LE();
        r = new Ae({ type: Gt.ByGroup, groupIndex: s });
        break;
      }
      case Gt.Unspecified:
        throw new Error("asset ref type unspecified");
      default:
        throw new Error(`asset ref type unknown ${e}`);
    }
    return r;
  }
  serializeTo(t) {
    switch (t.writeByte(this.ref.type), this.ref.type) {
      case Gt.ByID:
        this.ref.assetId.serializeTo(t);
        break;
      case Gt.ByGroup:
        t.writeUint16LE(this.ref.groupIndex);
        break;
    }
  }
}
class Ot {
  constructor(t) {
    this.input = t;
  }
  get vin() {
    return this.input.vin;
  }
  get amount() {
    return this.input.amount;
  }
  static create(t, e) {
    const r = new Ot({
      type: St.Local,
      vin: t,
      amount: typeof e == "number" ? BigInt(e) : e
    });
    return r.validate(), r;
  }
  static createIntent(t, e, r) {
    if (!t || t.length === 0)
      throw new Error("missing input intent txid");
    let s;
    try {
      s = k.decode(t);
    } catch {
      throw new Error("invalid input intent txid format, must be hex");
    }
    if (s.length !== Cn)
      throw new Error("invalid input intent txid length");
    const i = new Ot({
      type: St.Intent,
      txid: s,
      vin: e,
      amount: typeof r == "number" ? BigInt(r) : r
    });
    return i.validate(), i;
  }
  static fromString(t) {
    let e;
    try {
      e = k.decode(t);
    } catch {
      throw new Error("invalid format, must be hex");
    }
    return Ot.fromBytes(e);
  }
  static fromBytes(t) {
    const e = new Le(t);
    return Ot.fromReader(e);
  }
  serialize() {
    const t = new Ce();
    return this.serializeTo(t), t.toBytes();
  }
  toString() {
    return k.encode(this.serialize());
  }
  validate() {
    switch (this.input.type) {
      case St.Local:
        break;
      case St.Intent:
        if (Ff(this.input.txid))
          throw new Error("missing input intent txid");
        break;
    }
  }
  static fromReader(t) {
    const e = t.readByte();
    let r;
    switch (e) {
      case St.Local: {
        const s = t.readUint16LE(), i = t.readVarUint();
        r = new Ot({
          type: St.Local,
          vin: s,
          amount: i
        });
        break;
      }
      case St.Intent: {
        if (t.remaining() < Cn)
          throw new Error("invalid input intent txid length");
        const s = t.readSlice(Cn), i = t.readUint16LE(), o = t.readVarUint();
        r = new Ot({
          type: St.Intent,
          txid: new Uint8Array(s),
          vin: i,
          amount: o
        });
        break;
      }
      case St.Unspecified:
        throw new Error("asset input type unspecified");
      default:
        throw new Error(`asset input type ${e} unknown`);
    }
    return r.validate(), r;
  }
  serializeTo(t) {
    t.writeByte(this.input.type), this.input.type === St.Intent && t.write(this.input.txid), t.writeUint16LE(this.input.vin), t.writeVarUint(this.input.amount);
  }
}
class mr {
  constructor(t) {
    this.inputs = t;
  }
  static create(t) {
    const e = new mr(t);
    return e.validate(), e;
  }
  static fromString(t) {
    if (!t || t.length === 0)
      throw new Error("missing asset inputs");
    let e;
    try {
      e = k.decode(t);
    } catch {
      throw new Error("invalid asset inputs format, must be hex");
    }
    const r = new Le(e);
    return mr.fromReader(r);
  }
  serialize() {
    const t = new Ce();
    return this.serializeTo(t), t.toBytes();
  }
  toString() {
    return k.encode(this.serialize());
  }
  validate() {
    const t = /* @__PURE__ */ new Set();
    let e = St.Unspecified;
    for (const r of this.inputs) {
      if (r.validate(), e === St.Unspecified)
        e = r.input.type;
      else if (e !== r.input.type)
        throw new Error("all inputs must be of the same type");
      if (r.input.type === St.Local) {
        if (t.has(r.input.vin))
          throw new Error(`duplicated input vin ${r.input.vin}`);
        t.add(r.input.vin);
        continue;
      }
    }
  }
  static fromReader(t) {
    const e = Number(t.readVarUint()), r = [];
    for (let s = 0; s < e; s++)
      r.push(Ot.fromReader(t));
    return mr.create(r);
  }
  serializeTo(t) {
    t.writeVarUint(this.inputs.length);
    for (const e of this.inputs)
      e.serializeTo(t);
  }
}
class _t {
  constructor(t, e) {
    this.vout = t, this.amount = e;
  }
  static create(t, e) {
    const r = new _t(t, typeof e == "number" ? BigInt(e) : e);
    return r.validate(), r;
  }
  static fromString(t) {
    let e;
    try {
      e = k.decode(t);
    } catch {
      throw new Error("invalid asset output format, must be hex");
    }
    return _t.fromBytes(e);
  }
  static fromBytes(t) {
    if (!t || t.length === 0)
      throw new Error("missing asset output");
    const e = new Le(t);
    return _t.fromReader(e);
  }
  serialize() {
    const t = new Ce();
    return this.serializeTo(t), t.toBytes();
  }
  toString() {
    return k.encode(this.serialize());
  }
  validate() {
    if (!Number.isInteger(this.vout) || this.vout < 0 || this.vout > 65535)
      throw new Error("asset output vout must be an integer in range [0, 65535]");
    if (this.amount <= 0n)
      throw new Error("asset output amount must be greater than 0");
  }
  static fromReader(t) {
    if (t.remaining() < 2)
      throw new Error("invalid asset output vout length");
    const e = t.readUint16LE(), r = t.readVarUint(), s = new _t(e, r);
    return s.validate(), s;
  }
  serializeTo(t) {
    t.writeUint16LE(this.vout), t.writeVarUint(this.amount);
  }
}
class On {
  constructor(t) {
    this.outputs = t;
  }
  static create(t) {
    const e = new On(t);
    return e.validate(), e;
  }
  static fromString(t) {
    if (!t || t.length === 0)
      throw new Error("missing asset outputs");
    let e;
    try {
      e = k.decode(t);
    } catch {
      throw new Error("invalid asset outputs format, must be hex");
    }
    const r = new Le(e);
    return On.fromReader(r);
  }
  serialize() {
    const t = new Ce();
    return this.serializeTo(t), t.toBytes();
  }
  toString() {
    return k.encode(this.serialize());
  }
  validate() {
    const t = /* @__PURE__ */ new Set();
    for (const e of this.outputs) {
      if (t.has(e.vout))
        throw new Error(`duplicated output vout ${e.vout}`);
      t.add(e.vout);
    }
  }
  static fromReader(t) {
    const e = Number(t.readVarUint());
    if (e === 0)
      return new On([]);
    const r = [];
    for (let i = 0; i < e; i++)
      r.push(_t.fromReader(t));
    const s = new On(r);
    return s.validate(), s;
  }
  serializeTo(t) {
    this.validate(), t.writeVarUint(this.outputs.length);
    for (const e of this.outputs)
      e.serializeTo(t);
  }
}
class wn {
  constructor(t, e) {
    this.key = t, this.value = e;
  }
  static create(t, e) {
    const r = new wn(t, e);
    return r.validate(), r;
  }
  static fromString(t) {
    let e;
    try {
      e = k.decode(t);
    } catch {
      throw new Error("invalid metadata format, must be hex");
    }
    return wn.fromBytes(e);
  }
  static fromBytes(t) {
    if (!t || t.length === 0)
      throw new Error("missing metadata");
    const e = new Le(t);
    return wn.fromReader(e);
  }
  hash() {
    const t = new Uint8Array(this.key.length + this.value.length);
    return t.set(this.key), t.set(this.value, this.key.length), Tt(t);
  }
  serialize() {
    const t = new Ce();
    return this.serializeTo(t), t.toBytes();
  }
  toString() {
    return k.encode(this.serialize());
  }
  get keyString() {
    return new TextDecoder().decode(this.key);
  }
  get valueString() {
    return new TextDecoder().decode(this.value);
  }
  validate() {
    if (this.key.length === 0)
      throw new Error("missing metadata key");
    if (this.value.length === 0)
      throw new Error("missing metadata value");
  }
  static fromReader(t) {
    let e, r;
    try {
      e = t.readVarSlice();
    } catch {
      throw new Error("invalid metadata length");
    }
    try {
      r = t.readVarSlice();
    } catch {
      throw new Error("invalid metadata length");
    }
    const s = new wn(e, r);
    return s.validate(), s;
  }
  serializeTo(t) {
    t.writeVarSlice(this.key), t.writeVarSlice(this.value);
  }
}
class Dt {
  constructor(t, e, r, s, i) {
    this.assetId = t, this.controlAsset = e, this.inputs = r, this.outputs = s, this.metadata = i;
  }
  static create(t, e, r, s, i) {
    const o = new Dt(t, e, r, s, i);
    return o.validate(), o;
  }
  // from hex encoded
  static fromString(t) {
    let e;
    try {
      e = k.decode(t);
    } catch {
      throw new Error("invalid format, must be hex");
    }
    return Dt.fromBytes(e);
  }
  static fromBytes(t) {
    if (!t || t.length === 0)
      throw new Error("missing asset");
    const e = new Le(t);
    return Dt.fromReader(e);
  }
  // an issuance is a group with null assetId
  isIssuance() {
    return this.assetId === null;
  }
  // a reissuance is a group that is not an issuance
  // but where the sum of the outputs is greater than the sum of the inputs
  isReissuance() {
    const t = (s, { amount: i }) => s + i, e = this.outputs.reduce(t, 0n), r = this.inputs.map((s) => ({
      amount: s.input.type === St.Local ? s.input.amount : 0n
    })).reduce(t, 0n);
    return !this.isIssuance() && r < e;
  }
  serialize() {
    this.validate();
    const t = new Ce();
    return this.serializeTo(t), t.toBytes();
  }
  validate() {
    if (this.isIssuance()) {
      if (this.inputs.length !== 0)
        throw new Error("issuance must have no inputs");
    } else if (this.controlAsset !== null)
      throw new Error("only issuance can have a control asset");
  }
  toBatchLeafAssetGroup(t) {
    const e = Ot.createIntent(k.encode(t), 0, 0);
    return new Dt(this.assetId, this.controlAsset, [e], this.outputs, this.metadata);
  }
  toString() {
    return k.encode(this.serialize());
  }
  static fromReader(t) {
    const e = t.readByte();
    let r = null, s = null, i = [];
    e & Ri && (r = Bt.fromReader(t)), e & Ci && (s = Ae.fromReader(t)), e & Li && (i = xy(t));
    const o = mr.fromReader(t), a = On.fromReader(t), c = new Dt(r, s, o.inputs, a.outputs, i);
    return c.validate(), c;
  }
  serializeTo(t) {
    let e = 0;
    this.assetId !== null && (e |= Ri), this.controlAsset !== null && (e |= Ci), this.metadata.length > 0 && (e |= Li), t.writeByte(e), e & Ri && this.assetId.serializeTo(t), e & Ci && this.controlAsset.serializeTo(t), e & Li && Ey(this.metadata, t), t.writeVarUint(this.inputs.length);
    for (const r of this.inputs)
      r.serializeTo(t);
    t.writeVarUint(this.outputs.length);
    for (const r of this.outputs)
      r.serializeTo(t);
  }
}
function Ey(n, t) {
  t.writeVarUint(n.length);
  const e = [...n].sort((r, s) => {
    const i = new TextDecoder().decode(r.key);
    return new TextDecoder().decode(s.key).localeCompare(i);
  });
  for (const r of e)
    r.serializeTo(t);
}
function xy(n) {
  const t = Number(n.readVarUint()), e = [];
  for (let r = 0; r < t; r++)
    e.push(wn.fromReader(n));
  return e;
}
class ee {
  constructor(t) {
    this.groups = t;
  }
  static create(t) {
    const e = new ee(t);
    return e.validate(), e;
  }
  static fromString(t) {
    let e;
    try {
      e = k.decode(t);
    } catch {
      throw new Error("invalid output script format, must be hex");
    }
    return ee.fromScript(e);
  }
  static fromScript(t) {
    const e = _c(t), r = new Le(e);
    return ee.fromReader(r);
  }
  static fromTxOut(t) {
    return ee.fromScript(t);
  }
  static isAssetPacket(t) {
    try {
      return _c(t), !0;
    } catch {
      return !1;
    }
  }
  leafTxPacket(t) {
    const e = this.groups.map((r) => r.toBatchLeafAssetGroup(t));
    return new ee(e);
  }
  txOut() {
    return {
      script: this.serialize(),
      amount: 0n
    };
  }
  serialize() {
    const t = new Ce();
    t.writeVarUint(this.groups.length);
    for (const s of this.groups)
      s.serializeTo(t);
    const e = t.toBytes(), r = de(cn, new Uint8Array([Bo]), e);
    return Ty(r);
  }
  toString() {
    return k.encode(this.serialize());
  }
  validate() {
    if (this.groups.length === 0)
      throw new Error("missing assets");
    for (const t of this.groups)
      if (t.controlAsset !== null && t.controlAsset.ref.type === Gt.ByGroup && t.controlAsset.ref.groupIndex >= this.groups.length)
        throw new Error(`invalid control asset group index, ${t.controlAsset.ref.groupIndex} out of range [0, ${this.groups.length - 1}]`);
  }
  static fromReader(t) {
    const e = Number(t.readVarUint()), r = [];
    for (let i = 0; i < e; i++)
      r.push(Dt.fromReader(t));
    if (t.remaining() > 0)
      throw new Error(`invalid packet length, left ${t.remaining()} unknown bytes to read`);
    const s = new ee(r);
    return s.validate(), s;
  }
}
function _c(n) {
  if (!n || n.length === 0)
    throw new Error("missing output script");
  let t;
  try {
    t = K.decode(n);
  } catch {
    throw new Error("invalid OP_RETURN output script");
  }
  if (t.length === 0 || t[0] !== "RETURN")
    throw new Error("OP_RETURN not found in output script");
  const e = t.slice(1).filter((a) => a instanceof Uint8Array);
  if (e.length === 0)
    throw new Error("missing OP_RETURN data");
  const r = de(...e);
  if (r.length < cn.length + 1)
    throw new Error("invalid OP_RETURN data");
  const s = new Uint8Array(r.slice(0, cn.length));
  if (!ft(s, cn))
    throw new Error(`invalid magic prefix, got ${k.encode(s)} want ${k.encode(cn)}`);
  const i = r[cn.length];
  if (i !== Bo)
    throw new Error(`invalid asset marker, got ${i} want ${Bo}`);
  const o = new Uint8Array(r.slice(cn.length + 1));
  if (o.length === 0)
    throw new Error("missing packet data");
  return o;
}
function Ty(n) {
  return K.encode(["RETURN", n]);
}
function Dc(n, t, e) {
  const r = /* @__PURE__ */ new Map();
  for (const [c, u] of n)
    for (const l of u) {
      const d = r.get(l.assetId);
      r.set(l.assetId, [
        ...d ?? [],
        Ot.create(c, BigInt(l.amount))
      ]);
    }
  const s = /* @__PURE__ */ new Map();
  let i = 0;
  for (const c of t) {
    if (c.assets)
      for (const u of c.assets) {
        const l = s.get(u.assetId);
        s.set(u.assetId, [
          ...l ?? [],
          _t.create(i, BigInt(u.amount))
        ]);
      }
    i++;
  }
  if (e?.assets)
    for (const c of e.assets) {
      const u = s.get(c.assetId);
      s.set(c.assetId, [
        ...u ?? [],
        _t.create(i, BigInt(c.amount))
      ]);
    }
  const o = [], a = /* @__PURE__ */ new Set([
    ...r.keys(),
    ...s.keys()
  ]);
  for (const c of a) {
    const u = r.get(c), l = s.get(c), d = Bt.fromString(c), h = Dt.create(d, null, u ?? [], l ?? [], []);
    o.push(h);
  }
  return ee.create(o);
}
function Oo(n, t, e) {
  const r = n.filter((o) => o.assets?.some((a) => a.assetId === t));
  r.sort((o, a) => {
    const c = o.assets?.find((l) => l.assetId === t)?.amount ?? 0, u = a.assets?.find((l) => l.assetId === t)?.amount ?? 0;
    return c - u;
  });
  const s = [];
  let i = 0n;
  for (const o of r) {
    if (i >= e)
      break;
    s.push(o);
    const a = o.assets?.find((c) => c.assetId === t)?.amount ?? 0;
    i += BigInt(a);
  }
  if (i < e)
    throw new Error(`Insufficient asset balance: have ${i}, need ${e}`);
  return { selected: s, totalAssetAmount: i };
}
function as(n) {
  const t = /* @__PURE__ */ new Map();
  for (let e = 0; e < n.length; e++) {
    const r = n[e];
    !r.assets || r.assets.length === 0 || t.set(e, r.assets);
  }
  return t;
}
function Sy(n, t, e) {
  let r = !1;
  for (const [o, a] of t.entries()) {
    if (!a.script)
      throw new Error(`missing output script ${o}`);
    if (K.decode(a.script)[0] === "RETURN") {
      if (r)
        throw new Error("multiple OP_RETURN outputs");
      r = !0;
    }
  }
  const s = n.map((o) => vy(o, e));
  return {
    arkTx: zf(s.map((o) => o.input), t),
    checkpoints: s.map((o) => o.tx)
  };
}
function zf(n, t) {
  let e = 0n;
  for (const s of n) {
    const i = Pf(wr(s.tapLeafScript));
    if (Gn.is(i)) {
      if (e !== 0n && Vc(e) !== Vc(i.params.absoluteTimelock))
        throw new Error("cannot mix seconds and blocks locktime");
      i.params.absoluteTimelock > e && (e = i.params.absoluteTimelock);
    }
  }
  const r = new Je({
    version: 3,
    lockTime: Number(e)
  });
  for (const [s, i] of n.entries())
    r.addInput({
      txid: i.txid,
      index: i.vout,
      sequence: e ? na - 1 : void 0,
      witnessUtxo: {
        script: Xt.decode(i.tapTree).pkScript,
        amount: BigInt(i.value)
      },
      tapLeafScript: [i.tapLeafScript]
    }), Rg(r, s, Lf, i.tapTree);
  for (const s of t)
    r.addOutput(s);
  return r.addOutput(xa), r;
}
function vy(n, t) {
  const e = Pf(wr(n.tapLeafScript)), r = new Xt([
    t.script,
    e.script
  ]), s = zf([n], [
    {
      amount: BigInt(n.value),
      script: r.pkScript
    }
  ]), i = r.findLeaf(k.encode(e.script)), o = {
    txid: s.id,
    vout: 0,
    value: n.value,
    tapLeafScript: i,
    tapTree: r.encode()
  };
  return {
    tx: s,
    input: o
  };
}
const Iy = 500000000n;
function Vc(n) {
  return n >= Iy;
}
function Ay(n, t) {
  if (!n.status.block_time)
    return !1;
  if (t.value === 0n)
    return !0;
  if (t.type === "blocks")
    return !1;
  const e = BigInt(Math.floor(Date.now() / 1e3));
  return BigInt(Math.floor(n.status.block_time)) + t.value <= e;
}
const ky = 4320 * 60 * 1e3, By = {
  thresholdMs: ky
  // 3 days
};
class pt {
  constructor(t, e, r = pt.DefaultHRP) {
    this.preimage = t, this.value = e, this.HRP = r, this.vout = 0;
    const s = Tt(this.preimage);
    this.vtxoScript = new Xt([Uy(s)]);
    const i = this.vtxoScript.leaves[0];
    this.txid = k.encode(new Uint8Array(s).reverse()), this.tapTree = this.vtxoScript.encode(), this.forfeitTapLeafScript = i, this.intentTapLeafScript = i, this.value = e, this.status = { confirmed: !0 }, this.extraWitness = [this.preimage];
  }
  encode() {
    const t = new Uint8Array(pt.Length);
    return t.set(this.preimage, 0), Oy(t, this.value, this.preimage.length), t;
  }
  static decode(t, e = pt.DefaultHRP) {
    if (t.length !== pt.Length)
      throw new Error(`invalid data length: expected ${pt.Length} bytes, got ${t.length}`);
    const r = t.subarray(0, pt.PreimageLength), s = $y(t, pt.PreimageLength);
    return new pt(r, s, e);
  }
  static fromString(t, e = pt.DefaultHRP) {
    if (t = t.trim(), !t.startsWith(e))
      throw new Error(`invalid human-readable part: expected ${e} prefix (note '${t}')`);
    const r = t.slice(e.length), s = Xi.decode(r);
    if (s.length === 0)
      throw new Error("failed to decode base58 string");
    return pt.decode(s, e);
  }
  toString() {
    return this.HRP + Xi.encode(this.encode());
  }
}
pt.DefaultHRP = "arknote";
pt.PreimageLength = 32;
pt.ValueLength = 4;
pt.Length = pt.PreimageLength + pt.ValueLength;
pt.FakeOutpointIndex = 0;
function Oy(n, t, e) {
  new DataView(n.buffer, n.byteOffset + e, 4).setUint32(0, t, !1);
}
function $y(n, t) {
  return new DataView(n.buffer, n.byteOffset + t, 4).getUint32(0, !1);
}
function Uy(n) {
  return K.encode(["SHA256", n, "EQUAL"]);
}
var $o;
(function(n) {
  n[n.INDEXER_TX_TYPE_UNSPECIFIED = 0] = "INDEXER_TX_TYPE_UNSPECIFIED", n[n.INDEXER_TX_TYPE_RECEIVED = 1] = "INDEXER_TX_TYPE_RECEIVED", n[n.INDEXER_TX_TYPE_SENT = 2] = "INDEXER_TX_TYPE_SENT";
})($o || ($o = {}));
var Ln;
(function(n) {
  n.UNSPECIFIED = "INDEXER_CHAINED_TX_TYPE_UNSPECIFIED", n.COMMITMENT = "INDEXER_CHAINED_TX_TYPE_COMMITMENT", n.ARK = "INDEXER_CHAINED_TX_TYPE_ARK", n.TREE = "INDEXER_CHAINED_TX_TYPE_TREE", n.CHECKPOINT = "INDEXER_CHAINED_TX_TYPE_CHECKPOINT";
})(Ln || (Ln = {}));
class Kf {
  constructor(t) {
    this.serverUrl = t;
  }
  async getVtxoTree(t, e) {
    let r = `${this.serverUrl}/v1/indexer/batch/${t.txid}/${t.vout}/tree`;
    const s = new URLSearchParams();
    e && (e.pageIndex !== void 0 && s.append("page.index", e.pageIndex.toString()), e.pageSize !== void 0 && s.append("page.size", e.pageSize.toString())), s.toString() && (r += "?" + s.toString());
    const i = await fetch(r);
    if (!i.ok)
      throw new Error(`Failed to fetch vtxo tree: ${i.statusText}`);
    const o = await i.json();
    if (!Wt.isVtxoTreeResponse(o))
      throw new Error("Invalid vtxo tree data received");
    return o.vtxoTree.forEach((a) => {
      a.children = Object.fromEntries(Object.entries(a.children).map(([c, u]) => [
        Number(c),
        u
      ]));
    }), o;
  }
  async getVtxoTreeLeaves(t, e) {
    let r = `${this.serverUrl}/v1/indexer/batch/${t.txid}/${t.vout}/tree/leaves`;
    const s = new URLSearchParams();
    e && (e.pageIndex !== void 0 && s.append("page.index", e.pageIndex.toString()), e.pageSize !== void 0 && s.append("page.size", e.pageSize.toString())), s.toString() && (r += "?" + s.toString());
    const i = await fetch(r);
    if (!i.ok)
      throw new Error(`Failed to fetch vtxo tree leaves: ${i.statusText}`);
    const o = await i.json();
    if (!Wt.isVtxoTreeLeavesResponse(o))
      throw new Error("Invalid vtxos tree leaves data received");
    return o;
  }
  async getBatchSweepTransactions(t) {
    const e = `${this.serverUrl}/v1/indexer/batch/${t.txid}/${t.vout}/sweepTxs`, r = await fetch(e);
    if (!r.ok)
      throw new Error(`Failed to fetch batch sweep transactions: ${r.statusText}`);
    const s = await r.json();
    if (!Wt.isBatchSweepTransactionsResponse(s))
      throw new Error("Invalid batch sweep transactions data received");
    return s;
  }
  async getCommitmentTx(t) {
    const e = `${this.serverUrl}/v1/indexer/commitmentTx/${t}`, r = await fetch(e);
    if (!r.ok)
      throw new Error(`Failed to fetch commitment tx: ${r.statusText}`);
    const s = await r.json();
    if (!Wt.isCommitmentTx(s))
      throw new Error("Invalid commitment tx data received");
    return s;
  }
  async getCommitmentTxConnectors(t, e) {
    let r = `${this.serverUrl}/v1/indexer/commitmentTx/${t}/connectors`;
    const s = new URLSearchParams();
    e && (e.pageIndex !== void 0 && s.append("page.index", e.pageIndex.toString()), e.pageSize !== void 0 && s.append("page.size", e.pageSize.toString())), s.toString() && (r += "?" + s.toString());
    const i = await fetch(r);
    if (!i.ok)
      throw new Error(`Failed to fetch commitment tx connectors: ${i.statusText}`);
    const o = await i.json();
    if (!Wt.isConnectorsResponse(o))
      throw new Error("Invalid commitment tx connectors data received");
    return o.connectors.forEach((a) => {
      a.children = Object.fromEntries(Object.entries(a.children).map(([c, u]) => [
        Number(c),
        u
      ]));
    }), o;
  }
  async getCommitmentTxForfeitTxs(t, e) {
    let r = `${this.serverUrl}/v1/indexer/commitmentTx/${t}/forfeitTxs`;
    const s = new URLSearchParams();
    e && (e.pageIndex !== void 0 && s.append("page.index", e.pageIndex.toString()), e.pageSize !== void 0 && s.append("page.size", e.pageSize.toString())), s.toString() && (r += "?" + s.toString());
    const i = await fetch(r);
    if (!i.ok)
      throw new Error(`Failed to fetch commitment tx forfeitTxs: ${i.statusText}`);
    const o = await i.json();
    if (!Wt.isForfeitTxsResponse(o))
      throw new Error("Invalid commitment tx forfeitTxs data received");
    return o;
  }
  async *getSubscription(t, e) {
    const r = `${this.serverUrl}/v1/indexer/script/subscription/${t}`;
    for (; !e?.aborted; )
      try {
        const s = new EventSource(r), i = () => {
          s.close();
        };
        e?.addEventListener("abort", i);
        try {
          for await (const o of Io(s)) {
            if (e?.aborted)
              break;
            try {
              const a = JSON.parse(o.data);
              a.event && (yield {
                txid: a.event.txid,
                scripts: a.event.scripts || [],
                newVtxos: (a.event.newVtxos || []).map(Yr),
                spentVtxos: (a.event.spentVtxos || []).map(Yr),
                sweptVtxos: (a.event.sweptVtxos || []).map(Yr),
                tx: a.event.tx,
                checkpointTxs: a.event.checkpointTxs
              });
            } catch (a) {
              throw console.error("Failed to parse subscription event:", a), a;
            }
          }
        } finally {
          e?.removeEventListener("abort", i), s.close();
        }
      } catch (s) {
        if (s instanceof Error && s.name === "AbortError")
          break;
        if (Ao(s)) {
          console.debug("Timeout error ignored");
          continue;
        }
        throw console.error("Subscription error:", s), s;
      }
  }
  async getVirtualTxs(t, e) {
    let r = `${this.serverUrl}/v1/indexer/virtualTx/${t.join(",")}`;
    const s = new URLSearchParams();
    e && (e.pageIndex !== void 0 && s.append("page.index", e.pageIndex.toString()), e.pageSize !== void 0 && s.append("page.size", e.pageSize.toString())), s.toString() && (r += "?" + s.toString());
    const i = await fetch(r);
    if (!i.ok)
      throw new Error(`Failed to fetch virtual txs: ${i.statusText}`);
    const o = await i.json();
    if (!Wt.isVirtualTxsResponse(o))
      throw new Error("Invalid virtual txs data received");
    return o;
  }
  async getVtxoChain(t, e) {
    let r = `${this.serverUrl}/v1/indexer/vtxo/${t.txid}/${t.vout}/chain`;
    const s = new URLSearchParams();
    e && (e.pageIndex !== void 0 && s.append("page.index", e.pageIndex.toString()), e.pageSize !== void 0 && s.append("page.size", e.pageSize.toString())), s.toString() && (r += "?" + s.toString());
    const i = await fetch(r);
    if (!i.ok)
      throw new Error(`Failed to fetch vtxo chain: ${i.statusText}`);
    const o = await i.json();
    if (!Wt.isVtxoChainResponse(o))
      throw new Error("Invalid vtxo chain data received");
    return o;
  }
  async getVtxos(t) {
    if (t?.scripts && t?.outpoints)
      throw new Error("scripts and outpoints are mutually exclusive options");
    if (!t?.scripts && !t?.outpoints)
      throw new Error("Either scripts or outpoints must be provided");
    let e = `${this.serverUrl}/v1/indexer/vtxos`;
    const r = new URLSearchParams();
    t?.scripts && t.scripts.length > 0 && t.scripts.forEach((o) => {
      r.append("scripts", o);
    }), t?.outpoints && t.outpoints.length > 0 && t.outpoints.forEach((o) => {
      r.append("outpoints", `${o.txid}:${o.vout}`);
    }), t && (t.spendableOnly !== void 0 && r.append("spendableOnly", t.spendableOnly.toString()), t.spentOnly !== void 0 && r.append("spentOnly", t.spentOnly.toString()), t.recoverableOnly !== void 0 && r.append("recoverableOnly", t.recoverableOnly.toString()), t.pageIndex !== void 0 && r.append("page.index", t.pageIndex.toString()), t.pageSize !== void 0 && r.append("page.size", t.pageSize.toString())), r.toString() && (e += "?" + r.toString());
    const s = await fetch(e);
    if (!s.ok)
      throw new Error(`Failed to fetch vtxos: ${s.statusText}`);
    const i = await s.json();
    if (!Wt.isVtxosResponse(i))
      throw new Error("Invalid vtxos data received");
    return {
      vtxos: i.vtxos.map(Yr),
      page: i.page
    };
  }
  async getAssetDetails(t) {
    const e = `${this.serverUrl}/v1/indexer/asset/${encodeURIComponent(t)}`, r = await fetch(e);
    if (!r.ok)
      throw new Error(`Failed to fetch asset details: ${r.statusText}`);
    const s = await r.json();
    if (!Wt.isGetAssetResponse(s))
      throw new Error("Invalid get asset response");
    const i = s.metadata?.length ? Ny(s.metadata) : void 0;
    return {
      assetId: s.assetId ?? t,
      supply: Number(s.supply ?? 0),
      metadata: i,
      controlAssetId: s.controlAsset || void 0
    };
  }
  async subscribeForScripts(t, e) {
    const r = `${this.serverUrl}/v1/indexer/script/subscribe`, s = await fetch(r, {
      headers: {
        "Content-Type": "application/json"
      },
      method: "POST",
      body: JSON.stringify({ scripts: t, subscriptionId: e })
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
  async unsubscribeForScripts(t, e) {
    const r = `${this.serverUrl}/v1/indexer/script/unsubscribe`, s = await fetch(r, {
      headers: {
        "Content-Type": "application/json"
      },
      method: "POST",
      body: JSON.stringify({ subscriptionId: t, scripts: e })
    });
    if (!s.ok) {
      const i = await s.text();
      console.warn(`Failed to unsubscribe to scripts: ${i}`);
    }
  }
}
function Mc(n) {
  try {
    const t = k.decode(n);
    return new TextDecoder().decode(t);
  } catch {
    return n;
  }
}
function Ny(n) {
  const t = {};
  for (const { key: e, value: r } of n) {
    const s = Mc(e), i = Mc(r);
    if (s === "decimals") {
      const o = Number(i);
      t[s] = Number.isFinite(o) ? o : i;
    } else
      t[s] = i;
  }
  return t;
}
function Yr(n) {
  return {
    txid: n.outpoint.txid,
    vout: n.outpoint.vout,
    value: Number(n.amount),
    status: {
      confirmed: !n.isSwept && !n.isPreconfirmed,
      isLeaf: !n.isPreconfirmed
    },
    virtualStatus: {
      state: n.isSwept ? "swept" : n.isPreconfirmed ? "preconfirmed" : "settled",
      commitmentTxIds: n.commitmentTxids,
      batchExpiry: n.expiresAt ? Number(n.expiresAt) * 1e3 : void 0
    },
    spentBy: n.spentBy ?? "",
    settledBy: n.settledBy,
    arkTxId: n.arkTxid,
    createdAt: new Date(Number(n.createdAt) * 1e3),
    isUnrolled: n.isUnrolled,
    isSpent: n.isSpent,
    assets: n.assets?.map((t) => ({
      assetId: t.assetId,
      amount: Number(t.amount)
    }))
  };
}
var Wt;
(function(n) {
  function t(w) {
    return typeof w == "object" && typeof w.totalOutputAmount == "string" && typeof w.totalOutputVtxos == "number" && typeof w.expiresAt == "string" && typeof w.swept == "boolean";
  }
  function e(w) {
    return typeof w == "object" && typeof w.txid == "string" && typeof w.expiresAt == "string" && Object.values(Ln).includes(w.type) && Array.isArray(w.spends) && w.spends.every((J) => typeof J == "string");
  }
  function r(w) {
    return typeof w == "object" && typeof w.startedAt == "string" && typeof w.endedAt == "string" && typeof w.totalInputAmount == "string" && typeof w.totalInputVtxos == "number" && typeof w.totalOutputAmount == "string" && typeof w.totalOutputVtxos == "number" && typeof w.batches == "object" && Object.values(w.batches).every(t);
  }
  n.isCommitmentTx = r;
  function s(w) {
    return typeof w == "object" && typeof w.txid == "string" && typeof w.vout == "number";
  }
  n.isOutpoint = s;
  function i(w) {
    return Array.isArray(w) && w.every(s);
  }
  n.isOutpointArray = i;
  function o(w) {
    return typeof w == "object" && typeof w.txid == "string" && typeof w.children == "object" && Object.values(w.children).every(l) && Object.keys(w.children).every((J) => Number.isInteger(Number(J)));
  }
  function a(w) {
    return Array.isArray(w) && w.every(o);
  }
  n.isTxsArray = a;
  function c(w) {
    return typeof w == "object" && typeof w.amount == "string" && typeof w.createdAt == "string" && typeof w.isSettled == "boolean" && typeof w.settledBy == "string" && Object.values($o).includes(w.type) && (!w.commitmentTxid && typeof w.virtualTxid == "string" || typeof w.commitmentTxid == "string" && !w.virtualTxid);
  }
  function u(w) {
    return Array.isArray(w) && w.every(c);
  }
  n.isTxHistoryRecordArray = u;
  function l(w) {
    return typeof w == "string" && w.length === 64;
  }
  function d(w) {
    return Array.isArray(w) && w.every(l);
  }
  n.isTxidArray = d;
  function h(w) {
    return typeof w == "object" && w !== null && typeof w.assetId == "string" && typeof w.amount == "string";
  }
  function p(w) {
    return typeof w == "object" && s(w.outpoint) && typeof w.createdAt == "string" && (w.expiresAt === null || typeof w.expiresAt == "string") && typeof w.amount == "string" && typeof w.script == "string" && typeof w.isPreconfirmed == "boolean" && typeof w.isSwept == "boolean" && typeof w.isUnrolled == "boolean" && typeof w.isSpent == "boolean" && (!w.spentBy || typeof w.spentBy == "string") && (!w.settledBy || typeof w.settledBy == "string") && (!w.arkTxid || typeof w.arkTxid == "string") && Array.isArray(w.commitmentTxids) && w.commitmentTxids.every(l) && (w.assets === void 0 || Array.isArray(w.assets) && w.assets.every(h));
  }
  function y(w) {
    return typeof w == "object" && typeof w.current == "number" && typeof w.next == "number" && typeof w.total == "number";
  }
  function f(w) {
    return typeof w == "object" && Array.isArray(w.vtxoTree) && w.vtxoTree.every(o) && (!w.page || y(w.page));
  }
  n.isVtxoTreeResponse = f;
  function g(w) {
    return typeof w == "object" && Array.isArray(w.leaves) && w.leaves.every(s) && (!w.page || y(w.page));
  }
  n.isVtxoTreeLeavesResponse = g;
  function m(w) {
    return typeof w == "object" && Array.isArray(w.connectors) && w.connectors.every(o) && (!w.page || y(w.page));
  }
  n.isConnectorsResponse = m;
  function S(w) {
    return typeof w == "object" && Array.isArray(w.txids) && w.txids.every(l) && (!w.page || y(w.page));
  }
  n.isForfeitTxsResponse = S;
  function I(w) {
    return typeof w == "object" && Array.isArray(w.sweptBy) && w.sweptBy.every(l);
  }
  n.isSweptCommitmentTxResponse = I;
  function E(w) {
    return typeof w == "object" && Array.isArray(w.sweptBy) && w.sweptBy.every(l);
  }
  n.isBatchSweepTransactionsResponse = E;
  function C(w) {
    return typeof w == "object" && Array.isArray(w.txs) && w.txs.every((J) => typeof J == "string") && (!w.page || y(w.page));
  }
  n.isVirtualTxsResponse = C;
  function M(w) {
    return typeof w == "object" && Array.isArray(w.chain) && w.chain.every(e) && (!w.page || y(w.page));
  }
  n.isVtxoChainResponse = M;
  function X(w) {
    return typeof w == "object" && Array.isArray(w.vtxos) && w.vtxos.every(p) && (!w.page || y(w.page));
  }
  n.isVtxosResponse = X;
  function tt(w) {
    return typeof w == "object" && w !== null && typeof w.assetId == "string" && typeof w.supply == "string" && (w.controlAsset === void 0 || typeof w.controlAsset == "string") && (w.metadata === void 0 || Array.isArray(w.metadata) && w.metadata.every((J) => typeof J == "object" && J !== null && typeof J.key == "string" && typeof J.value == "string"));
  }
  n.isGetAssetResponse = tt;
})(Wt || (Wt = {}));
class Ry {
  constructor() {
    this.store = /* @__PURE__ */ new Map();
  }
  async getItem(t) {
    return this.store.get(t) ?? null;
  }
  async setItem(t, e) {
    this.store.set(t, e);
  }
  async removeItem(t) {
    this.store.delete(t);
  }
  async clear() {
    this.store.clear();
  }
}
const Zr = (n) => `vtxos:${n}`, Xr = (n) => `utxos:${n}`, Pi = (n) => `tx:${n}`, Hc = "wallet:state", Vs = (n) => n ? k.encode(n) : void 0, qn = (n) => n ? k.decode(n) : void 0, Ms = ([n, t]) => ({
  cb: k.encode(pe.encode(n)),
  s: k.encode(t)
}), Fc = (n) => ({
  ...n,
  tapTree: Vs(n.tapTree),
  forfeitTapLeafScript: Ms(n.forfeitTapLeafScript),
  intentTapLeafScript: Ms(n.intentTapLeafScript),
  extraWitness: n.extraWitness?.map(Vs)
}), zc = (n) => ({
  ...n,
  tapTree: Vs(n.tapTree),
  forfeitTapLeafScript: Ms(n.forfeitTapLeafScript),
  intentTapLeafScript: Ms(n.intentTapLeafScript),
  extraWitness: n.extraWitness?.map(Vs)
}), Hs = (n) => {
  const t = pe.decode(qn(n.cb)), e = qn(n.s);
  return [t, e];
}, Cy = (n) => ({
  ...n,
  createdAt: new Date(n.createdAt),
  tapTree: qn(n.tapTree),
  forfeitTapLeafScript: Hs(n.forfeitTapLeafScript),
  intentTapLeafScript: Hs(n.intentTapLeafScript),
  extraWitness: n.extraWitness?.map(qn)
}), Ly = (n) => ({
  ...n,
  tapTree: qn(n.tapTree),
  forfeitTapLeafScript: Hs(n.forfeitTapLeafScript),
  intentTapLeafScript: Hs(n.intentTapLeafScript),
  extraWitness: n.extraWitness?.map(qn)
});
class Uo {
  constructor(t) {
    this.storage = t;
  }
  async getVtxos(t) {
    const e = await this.storage.getItem(Zr(t));
    if (!e)
      return [];
    try {
      return JSON.parse(e).map(Cy);
    } catch (r) {
      return console.error(`Failed to parse VTXOs for address ${t}:`, r), [];
    }
  }
  async saveVtxos(t, e) {
    const r = await this.getVtxos(t);
    for (const s of e) {
      const i = r.findIndex((o) => o.txid === s.txid && o.vout === s.vout);
      i !== -1 ? r[i] = s : r.push(s);
    }
    await this.storage.setItem(Zr(t), JSON.stringify(r.map(Fc)));
  }
  async removeVtxo(t, e) {
    const r = await this.getVtxos(t), [s, i] = e.split(":"), o = r.filter((a) => !(a.txid === s && a.vout === parseInt(i, 10)));
    await this.storage.setItem(Zr(t), JSON.stringify(o.map(Fc)));
  }
  async clearVtxos(t) {
    await this.storage.removeItem(Zr(t));
  }
  async getUtxos(t) {
    const e = await this.storage.getItem(Xr(t));
    if (!e)
      return [];
    try {
      return JSON.parse(e).map(Ly);
    } catch (r) {
      return console.error(`Failed to parse UTXOs for address ${t}:`, r), [];
    }
  }
  async saveUtxos(t, e) {
    const r = await this.getUtxos(t);
    e.forEach((s) => {
      const i = r.findIndex((o) => o.txid === s.txid && o.vout === s.vout);
      i !== -1 ? r[i] = s : r.push(s);
    }), await this.storage.setItem(Xr(t), JSON.stringify(r.map(zc)));
  }
  async removeUtxo(t, e) {
    const r = await this.getUtxos(t), [s, i] = e.split(":"), o = r.filter((a) => !(a.txid === s && a.vout === parseInt(i, 10)));
    await this.storage.setItem(Xr(t), JSON.stringify(o.map(zc)));
  }
  async clearUtxos(t) {
    await this.storage.removeItem(Xr(t));
  }
  async getTransactionHistory(t) {
    const e = Pi(t), r = await this.storage.getItem(e);
    if (!r)
      return [];
    try {
      return JSON.parse(r);
    } catch (s) {
      return console.error(`Failed to parse transactions for address ${t}:`, s), [];
    }
  }
  async saveTransactions(t, e) {
    const r = await this.getTransactionHistory(t);
    for (const s of e) {
      const i = r.findIndex((o) => o.key === s.key);
      i !== -1 ? r[i] = s : r.push(s);
    }
    await this.storage.setItem(Pi(t), JSON.stringify(r));
  }
  async clearTransactions(t) {
    await this.storage.removeItem(Pi(t));
  }
  async getWalletState() {
    const t = await this.storage.getItem(Hc);
    if (!t)
      return null;
    try {
      return JSON.parse(t);
    } catch (e) {
      return console.error("Failed to parse wallet state:", e), null;
    }
  }
  async saveWalletState(t) {
    await this.storage.setItem(Hc, JSON.stringify(t));
  }
}
const _i = (n, t) => `contract:${n}:${t}`, Di = (n) => `collection:${n}`;
class Py {
  constructor(t) {
    this.storage = t;
  }
  async getContractData(t, e) {
    const r = await this.storage.getItem(_i(t, e));
    if (!r)
      return null;
    try {
      return JSON.parse(r);
    } catch (s) {
      return console.error(`Failed to parse contract data for ${t}:${e}:`, s), null;
    }
  }
  async setContractData(t, e, r) {
    try {
      await this.storage.setItem(_i(t, e), JSON.stringify(r));
    } catch (s) {
      throw console.error(`Failed to persist contract data for ${t}:${e}:`, s), s;
    }
  }
  async deleteContractData(t, e) {
    try {
      await this.storage.removeItem(_i(t, e));
    } catch (r) {
      throw console.error(`Failed to remove contract data for ${t}:${e}:`, r), r;
    }
  }
  async getContractCollection(t) {
    const e = await this.storage.getItem(Di(t));
    if (!e)
      return [];
    try {
      return JSON.parse(e);
    } catch (r) {
      return console.error(`Failed to parse contract collection ${t}:`, r), [];
    }
  }
  async saveToContractCollection(t, e, r) {
    const s = await this.getContractCollection(t), i = e[r];
    if (i == null)
      throw new Error(`Item is missing required field '${String(r)}'`);
    const o = s.findIndex((c) => c[r] === i);
    let a;
    o !== -1 ? a = [
      ...s.slice(0, o),
      e,
      ...s.slice(o + 1)
    ] : a = [...s, e];
    try {
      await this.storage.setItem(Di(t), JSON.stringify(a));
    } catch (c) {
      throw console.error(`Failed to persist contract collection ${t}:`, c), c;
    }
  }
  async removeFromContractCollection(t, e, r) {
    if (e == null)
      throw new Error(`Invalid id provided for removal: ${String(e)}`);
    const i = (await this.getContractCollection(t)).filter((o) => o[r] !== e);
    try {
      await this.storage.setItem(Di(t), JSON.stringify(i));
    } catch (o) {
      throw console.error(`Failed to persist contract collection removal for ${t}:`, o), o;
    }
  }
  async clearContractData() {
    await this.storage.clear();
  }
}
const _y = 546;
function Ge(n, t) {
  return {
    ...t,
    forfeitTapLeafScript: n.offchainTapscript.forfeit(),
    intentTapLeafScript: n.offchainTapscript.forfeit(),
    tapTree: n.offchainTapscript.encode()
  };
}
function No(n, t) {
  return {
    ...t,
    forfeitTapLeafScript: n.boardingTapscript.forfeit(),
    intentTapLeafScript: n.boardingTapscript.forfeit(),
    tapTree: n.boardingTapscript.encode()
  };
}
function Dy(n) {
  try {
    return Zt.decode(n), !0;
  } catch {
    return !1;
  }
}
function Vy(n, t) {
  const e = [];
  for (const r of n) {
    let s;
    try {
      s = Zt.decode(r.address);
    } catch {
      throw new Error(`Invalid Ark address: ${r.address}`);
    }
    const i = r.amount || t;
    if (i <= 0)
      throw new Error("Amount must be positive");
    e.push({
      address: r.address,
      assets: r.assets ?? [],
      amount: i,
      script: i < t ? s.subdustPkScript : s.pkScript
    });
  }
  return e;
}
class ot extends Error {
  #t;
  constructor(t, e, r) {
    super(t, { cause: r }), this.name = "ParseError", this.#t = e, e?.input && (this.message = Yn(this.message, e));
  }
  get node() {
    return this.#t;
  }
  withAst(t) {
    return this.#t ? this : (this.#t = t, t?.input ? (this.message = Yn(this.message, t), this) : this);
  }
}
class F extends Error {
  #t;
  constructor(t, e, r) {
    super(t, { cause: r }), this.name = "EvaluationError", this.#t = e, e?.input && (this.message = Yn(this.message, e));
  }
  get node() {
    return this.#t;
  }
  withAst(t) {
    return this.#t ? this : (this.#t = t, t?.input ? (this.message = Yn(this.message, t), this) : this);
  }
}
let My = class extends Error {
  #t;
  constructor(t, e, r) {
    super(t, { cause: r }), this.name = "TypeError", this.#t = e, e?.input && (this.message = Yn(this.message, e));
  }
  get node() {
    return this.#t;
  }
  withAst(t) {
    return this.#t ? this : (this.#t = t, t?.input ? (this.message = Yn(this.message, t), this) : this);
  }
};
function Yn(n, t) {
  if (t?.pos === void 0) return n;
  const e = t.pos, r = t.input;
  let s = 1, i = 0, o = 0;
  for (; i < e; )
    r[i] === `
` ? (s++, o = 0) : o++, i++;
  let a = e, c = e;
  for (; a > 0 && r[a - 1] !== `
`; ) a--;
  for (; c < r.length && r[c] !== `
`; ) c++;
  const u = r.slice(a, c), l = `${s}`.padStart(4, " "), d = " ".repeat(9 + o);
  return `${n}

> ${l} | ${u}
${d}^`;
}
class ye {
  #t;
  constructor(t) {
    this.#t = t;
  }
  static of(t) {
    return t === void 0 ? Fs : new ye(t);
  }
  static none() {
    return Fs;
  }
  hasValue() {
    return this.#t !== void 0;
  }
  value() {
    if (this.#t === void 0) throw new F("Optional value is not present");
    return this.#t;
  }
  or(t) {
    if (this.#t !== void 0) return this;
    if (t instanceof ye) return t;
    throw new F("Optional.or must be called with an Optional argument");
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
const Fs = Object.freeze(new ye());
class jf {
}
const Wf = new jf();
function Hy(n, t) {
  n.constants.set("optional", t ? Wf : void 0);
}
function Fy(n) {
  const t = (d, h) => n.registerFunctionOverload(d, h), e = n.enableOptionalTypes ? Wf : void 0;
  n.registerType("OptionalNamespace", jf), n.registerConstant("optional", "OptionalNamespace", e), t("optional.hasValue(): bool", (d) => d.hasValue()), t("optional<A>.value(): A", (d) => d.value()), n.registerFunctionOverload("OptionalNamespace.none(): optional<T>", () => ye.none()), t("OptionalNamespace.of(A): optional<A>", (d, h) => ye.of(h));
  function r(d, h, p) {
    if (d instanceof ye) return d;
    throw new F(`${p} must be optional`, h);
  }
  function s(d, h, p) {
    const y = d.eval(h.receiver, p);
    return y instanceof Promise ? y.then((f) => i(f, d, h, p)) : i(y, d, h, p);
  }
  function i(d, h, p, y) {
    const f = r(d, p.receiver, `${p.functionDesc} receiver`);
    return f.hasValue() ? p.onHasValue(f) : p.onEmpty(h, p, y);
  }
  function o(d, h, p, y) {
    const f = d.check(h, p);
    if (f.kind === "optional") return f;
    if (f.kind === "dyn") return d.getType("optional");
    throw new d.Error(`${y} must be optional, got '${f}'`, h);
  }
  function a({ functionDesc: d, evaluate: h, typeCheck: p, onHasValue: y, onEmpty: f }) {
    return ({ args: g, receiver: m }) => ({
      functionDesc: d,
      receiver: m,
      arg: g[0],
      evaluate: h,
      typeCheck: p,
      onHasValue: y,
      onEmpty: f
    });
  }
  const c = "optional.orValue() receiver", u = "optional.or(optional) receiver", l = "optional.or(optional) argument";
  n.registerFunctionOverload(
    "optional.or(ast): optional<dyn>",
    a({
      functionDesc: "optional.or(optional)",
      evaluate: s,
      typeCheck(d, h, p) {
        const y = o(d, h.receiver, p, u), f = o(d, h.arg, p, l), g = y.unify(d.registry, f);
        if (g) return g;
        throw new d.Error(
          `${h.functionDesc} argument must be compatible type, got '${y}' and '${f}'`,
          h.arg
        );
      },
      onHasValue: (d) => d,
      onEmpty(d, h, p) {
        const y = h.arg, f = d.eval(y, p);
        return f instanceof Promise ? f.then((g) => r(g, y, l)) : r(f, y, l);
      }
    })
  ), n.registerFunctionOverload(
    "optional.orValue(ast): dyn",
    a({
      functionDesc: "optional.orValue(value)",
      onHasValue: (d) => d.value(),
      onEmpty(d, h, p) {
        return d.eval(h.arg, p);
      },
      evaluate: s,
      typeCheck(d, h, p) {
        const y = o(d, h.receiver, p, c).valueType, f = d.check(h.arg, p), g = y.unify(d.registry, f);
        if (g) return g;
        throw new d.Error(
          `${h.functionDesc} argument must be compatible type, got '${y}' and '${f}'`,
          h.arg
        );
      }
    })
  );
}
class ln {
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
    if (t < 0n || t > 18446744073709551615n) throw new F("Unsigned integer overflow");
    this.#t = t;
  }
  get [Symbol.toStringTag]() {
    return `value = ${this.#t}`;
  }
  [Symbol.for("nodejs.util.inspect.custom")]() {
    return `UnsignedInteger { value: ${this.#t} }`;
  }
}
const zy = {
  h: 3600000000000n,
  m: 60000000000n,
  s: 1000000000n,
  ms: 1000000n,
  us: 1000n,
  µs: 1000n,
  ns: 1n
};
class qe {
  #t;
  #e;
  constructor(t, e = 0) {
    this.#t = BigInt(t), this.#e = e;
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
    const e = BigInt(Math.trunc(t * 1e6)), r = e / 1000000000n, s = Number(e % 1000000000n);
    return new qe(r, s);
  }
  addDuration(t) {
    const e = this.#e + t.nanos;
    return new qe(
      this.#t + t.seconds + BigInt(Math.floor(e / 1e9)),
      e % 1e9
    );
  }
  subtractDuration(t) {
    const e = this.#e - t.nanos;
    return new qe(
      this.#t - t.seconds + BigInt(Math.floor(e / 1e9)),
      (e + 1e9) % 1e9
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
function Ky(n) {
  const t = (f, g) => n.registerFunctionOverload(f, g), e = (f) => f;
  t("dyn(dyn): dyn", e);
  for (const f in br) {
    const g = br[f];
    g instanceof Lt && t(`type(${g.name}): type`, () => g);
  }
  t("bool(bool): bool", e), t("bool(string): bool", (f) => {
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
        throw new F(`bool() conversion error: invalid string value "${f}"`);
    }
  });
  const r = Object.keys;
  t("size(string): int", (f) => BigInt(Kc(f))), t("size(bytes): int", (f) => BigInt(f.length)), t("size(list): int", (f) => BigInt(f.length ?? f.size)), t(
    "size(map): int",
    (f) => BigInt(f instanceof Map ? f.size : r(f).length)
  ), t("string.size(): int", (f) => BigInt(Kc(f))), t("bytes.size(): int", (f) => BigInt(f.length)), t("list.size(): int", (f) => BigInt(f.length ?? f.size)), t(
    "map.size(): int",
    (f) => BigInt(f instanceof Map ? f.size : r(f).length)
  ), t("bytes(string): bytes", (f) => o.fromString(f)), t("bytes(bytes): bytes", e), t("double(double): double", e), t("double(int): double", (f) => Number(f)), t("double(uint): double", (f) => Number(f)), t("double(string): double", (f) => {
    if (!f || f !== f.trim())
      throw new F("double() type error: cannot convert to double");
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
        const m = Number(f);
        if (!Number.isNaN(m)) return m;
        throw new F("double() type error: cannot convert to double");
      }
    }
  }), t("int(int): int", e), t("int(double): int", (f) => {
    if (Number.isFinite(f)) return BigInt(Math.trunc(f));
    throw new F("int() type error: integer overflow");
  }), t("int(string): int", (f) => {
    if (f !== f.trim() || f.length > 20 || f.includes("0x"))
      throw new F("int() type error: cannot convert to int");
    try {
      const g = BigInt(f);
      if (g <= 9223372036854775807n && g >= -9223372036854775808n) return g;
    } catch {
    }
    throw new F("int() type error: cannot convert to int");
  }), t("uint(uint): uint", e), t("uint(double): uint", (f) => {
    if (Number.isFinite(f)) return BigInt(Math.trunc(f));
    throw new F("int() type error: integer overflow");
  }), t("uint(string): uint", (f) => {
    if (f !== f.trim() || f.length > 20 || f.includes("0x"))
      throw new F("uint() type error: cannot convert to uint");
    try {
      const g = BigInt(f);
      if (g <= 18446744073709551615n && g >= 0n) return g;
    } catch {
    }
    throw new F("uint() type error: cannot convert to uint");
  }), t("string(string): string", e), t("string(bool): string", (f) => `${f}`), t("string(int): string", (f) => `${f}`), t("string(bytes): string", (f) => o.toUtf8(f)), t("string(double): string", (f) => f === 1 / 0 ? "+Inf" : f === -1 / 0 ? "-Inf" : `${f}`), t("string.startsWith(string): bool", (f, g) => f.startsWith(g)), t("string.endsWith(string): bool", (f, g) => f.endsWith(g)), t("string.contains(string): bool", (f, g) => f.includes(g)), t("string.lowerAscii(): string", (f) => f.toLowerCase()), t("string.upperAscii(): string", (f) => f.toUpperCase()), t("string.trim(): string", (f) => f.trim()), t(
    "string.indexOf(string): int",
    (f, g) => BigInt(f.indexOf(g))
  ), t("string.indexOf(string, int): int", (f, g, m) => {
    if (g === "") return m;
    if (m = Number(m), m < 0 || m >= f.length)
      throw new F("string.indexOf(search, fromIndex): fromIndex out of range");
    return BigInt(f.indexOf(g, m));
  }), t(
    "string.lastIndexOf(string): int",
    (f, g) => BigInt(f.lastIndexOf(g))
  ), t("string.lastIndexOf(string, int): int", (f, g, m) => {
    if (g === "") return m;
    if (m = Number(m), m < 0 || m >= f.length)
      throw new F("string.lastIndexOf(search, fromIndex): fromIndex out of range");
    return BigInt(f.lastIndexOf(g, m));
  }), t("string.substring(int): string", (f, g) => {
    if (g = Number(g), g < 0 || g > f.length)
      throw new F("string.substring(start, end): start index out of range");
    return f.substring(g);
  }), t("string.substring(int, int): string", (f, g, m) => {
    if (g = Number(g), g < 0 || g > f.length)
      throw new F("string.substring(start, end): start index out of range");
    if (m = Number(m), m < g || m > f.length)
      throw new F("string.substring(start, end): end index out of range");
    return f.substring(g, m);
  }), t("string.matches(string): bool", (f, g) => {
    try {
      return new RegExp(g).test(f);
    } catch {
      throw new F(`Invalid regular expression: ${g}`);
    }
  }), t("string.split(string): list<string>", (f, g) => f.split(g)), t("string.split(string, int): list<string>", (f, g, m) => {
    if (m = Number(m), m === 0) return [];
    const S = f.split(g);
    if (m < 0 || S.length <= m) return S;
    const I = S.slice(0, m - 1);
    return I.push(S.slice(m - 1).join(g)), I;
  }), t("list<string>.join(): string", (f) => {
    for (let g = 0; g < f.length; g++)
      if (typeof f[g] != "string")
        throw new F("string.join(): list must contain only strings");
    return f.join("");
  }), t("list<string>.join(string): string", (f, g) => {
    for (let m = 0; m < f.length; m++)
      if (typeof f[m] != "string")
        throw new F("string.join(separator): list must contain only strings");
    return f.join(g);
  });
  const s = new TextEncoder("utf8"), i = new TextDecoder("utf8"), o = typeof Buffer < "u" ? {
    byteLength: (f) => Buffer.byteLength(f),
    fromString: (f) => Buffer.from(f, "utf8"),
    toHex: (f) => Buffer.prototype.hexSlice.call(f, 0, f.length),
    toBase64: (f) => Buffer.prototype.base64Slice.call(f, 0, f.length),
    toUtf8: (f) => Buffer.prototype.utf8Slice.call(f, 0, f.length),
    jsonParse: (f) => JSON.parse(f)
  } : {
    textEncoder: new TextEncoder("utf8"),
    byteLength: (f) => s.encode(f).length,
    fromString: (f) => s.encode(f),
    toHex: Uint8Array.prototype.toHex ? (f) => f.toHex() : (f) => Array.from(f, (g) => g.toString(16).padStart(2, "0")).join(""),
    toBase64: Uint8Array.prototype.toBase64 ? (f) => f.toBase64() : (f) => btoa(Array.from(f, (g) => String.fromCodePoint(g)).join("")),
    toUtf8: (f) => i.decode(f),
    jsonParse: (f) => JSON.parse(s.decode(f))
  };
  t("bytes.json(): map", o.jsonParse), t("bytes.hex(): string", o.toHex), t("bytes.string(): string", o.toUtf8), t("bytes.base64(): string", o.toBase64), t("bytes.at(int): int", (f, g) => {
    if (g < 0 || g >= f.length) throw new F("Bytes index out of range");
    return BigInt(f[g]);
  });
  const a = "google.protobuf.Timestamp", c = "google.protobuf.Duration", u = n.registerType(a, Date).getObjectType(a).typeType, l = n.registerType(c, qe).getObjectType(c).typeType;
  n.registerConstant("google", "map<string, map<string, type>>", {
    protobuf: { Duration: l, Timestamp: u }
  });
  function d(f, g) {
    return new Date(f.toLocaleString("en-US", { timeZone: g }));
  }
  function h(f, g) {
    const m = g ? d(f, g) : new Date(f.getUTCFullYear(), f.getUTCMonth(), f.getUTCDate()), S = new Date(m.getFullYear(), 0, 0);
    return BigInt(Math.floor((m - S) / 864e5) - 1);
  }
  t(`timestamp(string): ${a}`, (f) => {
    if (f.length < 20 || f.length > 30)
      throw new F("timestamp() requires a string in ISO 8601 format");
    const g = new Date(f);
    if (g <= 253402300799999 && g >= -621355968e5) return g;
    throw new F("timestamp() requires a string in ISO 8601 format");
  }), t(`timestamp(int): ${a}`, (f) => {
    if (f = Number(f) * 1e3, f <= 253402300799999 && f >= -621355968e5) return new Date(f);
    throw new F("timestamp() requires a valid integer unix timestamp");
  }), t(`${a}.getDate(): int`, (f) => BigInt(f.getUTCDate())), t(`${a}.getDate(string): int`, (f, g) => BigInt(d(f, g).getDate())), t(`${a}.getDayOfMonth(): int`, (f) => BigInt(f.getUTCDate() - 1)), t(
    `${a}.getDayOfMonth(string): int`,
    (f, g) => BigInt(d(f, g).getDate() - 1)
  ), t(`${a}.getDayOfWeek(): int`, (f) => BigInt(f.getUTCDay())), t(`${a}.getDayOfWeek(string): int`, (f, g) => BigInt(d(f, g).getDay())), t(`${a}.getDayOfYear(): int`, h), t(`${a}.getDayOfYear(string): int`, h), t(`${a}.getFullYear(): int`, (f) => BigInt(f.getUTCFullYear())), t(`${a}.getFullYear(string): int`, (f, g) => BigInt(d(f, g).getFullYear())), t(`${a}.getHours(): int`, (f) => BigInt(f.getUTCHours())), t(`${a}.getHours(string): int`, (f, g) => BigInt(d(f, g).getHours())), t(`${a}.getMilliseconds(): int`, (f) => BigInt(f.getUTCMilliseconds())), t(`${a}.getMilliseconds(string): int`, (f) => BigInt(f.getUTCMilliseconds())), t(`${a}.getMinutes(): int`, (f) => BigInt(f.getUTCMinutes())), t(`${a}.getMinutes(string): int`, (f, g) => BigInt(d(f, g).getMinutes())), t(`${a}.getMonth(): int`, (f) => BigInt(f.getUTCMonth())), t(`${a}.getMonth(string): int`, (f, g) => BigInt(d(f, g).getMonth())), t(`${a}.getSeconds(): int`, (f) => BigInt(f.getUTCSeconds())), t(`${a}.getSeconds(string): int`, (f, g) => BigInt(d(f, g).getSeconds()));
  const p = /(\d*\.?\d*)(ns|us|µs|ms|s|m|h)/;
  function y(f) {
    if (!f) throw new F("Invalid duration string: ''");
    const g = f[0] === "-";
    (f[0] === "-" || f[0] === "+") && (f = f.slice(1));
    let m = BigInt(0);
    for (; ; ) {
      const E = p.exec(f);
      if (!E) throw new F(`Invalid duration string: ${f}`);
      if (E.index !== 0) throw new F(`Invalid duration string: ${f}`);
      f = f.slice(E[0].length);
      const C = zy[E[2]], [M = "0", X = ""] = E[1].split("."), tt = BigInt(M) * C, w = X ? BigInt(X.slice(0, 13).padEnd(13, "0")) * C / 10000000000000n : 0n;
      if (m += tt + w, f === "") break;
    }
    const S = m >= 1000000000n ? m / 1000000000n : 0n, I = Number(m % 1000000000n);
    return g ? new qe(-S, -I) : new qe(S, I);
  }
  t("duration(string): google.protobuf.Duration", (f) => y(f)), t("google.protobuf.Duration.getHours(): int", (f) => f.getHours()), t("google.protobuf.Duration.getMinutes(): int", (f) => f.getMinutes()), t("google.protobuf.Duration.getSeconds(): int", (f) => f.getSeconds()), t("google.protobuf.Duration.getMilliseconds(): int", (f) => f.getMilliseconds()), Fy(n);
}
function Kc(n) {
  let t = 0;
  for (const e of n) t++;
  return t;
}
class Lt {
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
const br = {
  string: new Lt("string"),
  bool: new Lt("bool"),
  int: new Lt("int"),
  uint: new Lt("uint"),
  double: new Lt("double"),
  map: new Lt("map"),
  list: new Lt("list"),
  bytes: new Lt("bytes"),
  null_type: new Lt("null"),
  type: new Lt("type")
};
class fi {
  #t = null;
  #e = null;
  constructor(t) {
    t instanceof fi ? (this.#t = t, this.#e = /* @__PURE__ */ new Map()) : this.#e = new Map(t);
  }
  fork(t = !0) {
    return t && (this.set = this.#n), new this.constructor(this);
  }
  #n() {
    throw new Error("Cannot modify frozen registry");
  }
  set(t, e) {
    return this.#e.set(t, e), this;
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
class jy extends fi {
  constructor(t = null, e = null) {
    super(t, e);
  }
  get(t) {
    const e = super.get(t);
    return e === void 0 ? se : e;
  }
}
function ve(n, t = fi, e = !0) {
  return n instanceof t ? n.fork(e) : new t(n);
}
class sn {
  #t = /* @__PURE__ */ new WeakMap();
  #e = null;
  #n = null;
  constructor({ kind: t, type: e, name: r, keyType: s, valueType: i, values: o }) {
    this.kind = t, this.type = e, this.name = r, s && (this.keyType = s), i && (this.valueType = i), o && (this.values = o), this.unwrappedType = t === "dyn" && i ? i.unwrappedType : this, t === "list" ? this.fieldLazy = this.#a : t === "map" ? this.fieldLazy = this.#o : t === "message" ? this.fieldLazy = this.#s : t === "dyn" ? this.fieldLazy = this.#o : t === "optional" && (this.fieldLazy = this.#r), Object.freeze(this);
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
  unify(t, e) {
    const r = this;
    if (r === e || r.kind === "dyn" || e.kind === "param") return r;
    if (e.kind === "dyn" || r.kind === "param") return e;
    if (r.kind !== e.kind || !(r.hasPlaceholder() || e.hasPlaceholder() || r.hasDyn() || e.hasDyn())) return null;
    const s = r.valueType.unify(t, e.valueType);
    if (!s) return null;
    switch (r.kind) {
      case "optional":
        return t.getOptionalType(s);
      case "list":
        return t.getListType(s);
      case "map":
        const i = r.keyType.unify(t, e.keyType);
        return i ? t.getMapType(i, s) : null;
    }
  }
  templated(t, e) {
    if (!this.hasPlaceholder()) return this;
    switch (this.kind) {
      case "dyn":
        return this.valueType.templated(t, e);
      case "param":
        return e?.get(this.name) || this;
      case "map":
        return t.getMapType(this.keyType.templated(t, e), this.valueType.templated(t, e));
      case "list":
        return t.getListType(this.valueType.templated(t, e));
      case "optional":
        return t.getOptionalType(this.valueType.templated(t, e));
      default:
        return this;
    }
  }
  toString() {
    return this.name;
  }
  #r(t, e, r, s) {
    if (t = t instanceof ye ? t.orValue() : t, t === void 0) return Fs;
    const i = s.debugType(t);
    try {
      return ye.of(i.fieldLazy(t, e, r, s));
    } catch (o) {
      if (o instanceof F) return Fs;
      throw o;
    }
  }
  #s(t, e, r, s) {
    const i = s.objectTypesByConstructor.get(t.constructor);
    if (!i) return;
    if (!i.fields) return Object.hasOwn(t, e) ? t[e] : void 0;
    const o = i.fields[e];
    if (!o) return;
    const a = t[e];
    if (o.kind === "dyn") return a;
    const c = s.debugType(a);
    if (o.matches(c)) return a;
    throw new F(
      `Field '${e}' is not of type '${o}', got '${c}'`,
      r
    );
  }
  #o(t, e, r, s) {
    let i;
    if (t instanceof Map ? i = t.get(e) : i = Object.hasOwn(t, e) ? t[e] : void 0, i === void 0) return;
    if (this.valueType.kind === "dyn") return i;
    const o = s.debugType(i);
    if (this.valueType.matches(o)) return i;
    throw new F(
      `Field '${e}' is not of type '${this.valueType}', got '${o}'`,
      r
    );
  }
  #a(t, e, r, s) {
    if (!(typeof e == "number" || typeof e == "bigint")) return;
    const i = t[e];
    if (i === void 0)
      throw new F(
        `No such key: index out of bounds, index ${e} ${e < 0 ? "< 0" : `>= size ${t.length}`}`,
        r
      );
    const o = s.debugType(i);
    if (this.valueType.matches(o)) return i;
    throw new F(
      `List item with index '${e}' is not of type '${this.valueType}', got '${o}'`,
      r
    );
  }
  fieldLazy() {
  }
  field(t, e, r, s) {
    const i = this.fieldLazy(t, e, r, s);
    if (i !== void 0) return i;
    throw new F(`No such key: ${e}`, r);
  }
  matchesBoth(t) {
    return this.matches(t) && t.matches(this);
  }
  matches(t) {
    return this.#t.get(t) ?? this.#t.set(t, this.#c(t)).get(t);
  }
  #c(t) {
    const e = this.unwrappedType, r = t.unwrappedType;
    if (e === r || r.kind === "dyn" || r.kind === "param") return !0;
    switch (e.kind) {
      case "dyn":
      case "param":
        return !0;
      case "list":
        return r.kind === "list" && e.valueType.matches(r.valueType);
      case "map":
        return r.kind === "map" && e.keyType.matches(r.keyType) && e.valueType.matches(r.valueType);
      case "optional":
        return r.kind === "optional" && (!e.valueType || !r.valueType || e.valueType.matches(r.valueType));
      default:
        return e.name === r.name;
    }
  }
}
function Wy(n, t) {
  const e = `Macro '${n}' must `;
  return function(s) {
    const i = t(s);
    if (!i || typeof i != "object") throw new Error(`${e} must return an object.`);
    if (!i?.typeCheck) throw new Error(`${e} have a .typeCheck(checker, macro, ctx) method.`);
    if (!i?.evaluate) throw new Error(`${e} have a .evaluate(evaluator, macro, ctx) method.`);
    return i;
  };
}
class Gy {
  #t;
  constructor({ name: t, receiverType: e, argTypes: r, returnType: s, handler: i }) {
    this.name = t, this.receiverType = e || null, this.argTypes = r, this.returnType = s, this.macro = r.includes(cs);
    const o = e ? `${e}.` : "";
    this.signature = `${o}${t}(${r.join(", ")}): ${s}`, this.handler = this.macro ? Wy(this.signature, i) : i, Object.freeze(this);
  }
  hasPlaceholder() {
    return this.#t ??= this.returnType.hasPlaceholder() || this.receiverType?.hasPlaceholder() || this.argTypes.some((t) => t.hasPlaceholder()) || !1;
  }
  matchesArgs(t) {
    return t.length === this.argTypes.length && this.argTypes.every((e, r) => e.matches(t[r])) ? this : null;
  }
}
class cr {
  #t;
  constructor({ operator: t, leftType: e, rightType: r, handler: s, returnType: i }) {
    this.operator = t, this.leftType = e, this.rightType = r || null, this.handler = s, this.returnType = i, r ? this.signature = `${e} ${t} ${r}: ${i}` : this.signature = `${t}${e}: ${i}`, Object.freeze(this);
  }
  hasPlaceholder() {
    return this.#t ??= this.leftType.hasPlaceholder() || this.rightType?.hasPlaceholder() || !1;
  }
  equals(t) {
    return this.operator === t.operator && this.leftType === t.leftType && this.rightType === t.rightType;
  }
}
function Gf(n) {
  return new sn({
    kind: "list",
    name: `list<${n}>`,
    type: "list",
    valueType: n
  });
}
function Ie(n) {
  return new sn({ kind: "primitive", name: n, type: n });
}
function qy(n) {
  return new sn({ kind: "message", name: n, type: n });
}
function qf(n) {
  const t = n ? `dyn<${n}>` : "dyn";
  return new sn({ kind: "dyn", name: t, type: t, valueType: n });
}
function Yf(n) {
  const t = n ? `optional<${n}>` : "optional";
  return new sn({ kind: "optional", name: t, type: "optional", valueType: n });
}
function Zf(n, t) {
  return new sn({
    kind: "map",
    name: `map<${n}, ${t}>`,
    type: "map",
    keyType: n,
    valueType: t
  });
}
function Yy(n) {
  return new sn({ kind: "param", name: n, type: n });
}
const se = qf(), cs = Ie("ast"), jc = Gf(se), Wc = Zf(se, se), At = Object.freeze({
  string: Ie("string"),
  bool: Ie("bool"),
  int: Ie("int"),
  uint: Ie("uint"),
  double: Ie("double"),
  bytes: Ie("bytes"),
  dyn: se,
  null: Ie("null"),
  type: Ie("type"),
  optional: Yf(se),
  list: jc,
  "list<dyn>": jc,
  map: Wc,
  "map<dyn, dyn>": Wc
});
class Zy {
  returnType = null;
  /** @type {Array<FunctionDeclaration>} */
  declarations = [];
  constructor(t) {
    this.registry = t;
  }
  add(t) {
    this.returnType = (this.returnType ? this.returnType.unify(this.registry, t.returnType) : t.returnType) || se, this.declarations.push(t);
  }
  findMatch(t, e = null) {
    for (let r = 0; r < this.declarations.length; r++) {
      const s = this.#t(this.declarations[r], t, e);
      if (s) return s;
    }
    return null;
  }
  #t(t, e, r) {
    if (t.hasPlaceholder()) return this.#e(t, e, r);
    if (!(r && t.receiverType && !r.matches(t.receiverType)))
      return t.matchesArgs(e);
  }
  #e(t, e, r) {
    const s = /* @__PURE__ */ new Map();
    if (r && t.receiverType && !this.registry.matchTypeWithPlaceholders(t.receiverType, r, s))
      return null;
    for (let i = 0; i < e.length; i++)
      if (!this.registry.matchTypeWithPlaceholders(t.argTypes[i], e[i], s))
        return null;
    return {
      handler: t.handler,
      signature: t.signature,
      returnType: t.returnType.templated(this.registry, s)
    };
  }
}
function Gc(n) {
  const t = [];
  let e = "", r = 0;
  for (const s of n) {
    if (s === "<") r++;
    else if (s === ">") r--;
    else if (s === "," && r === 0) {
      t.push(e), e = "";
      continue;
    }
    e += s;
  }
  return e && t.push(e), t;
}
const Xf = [
  [void 0, "map"],
  [Object, "map"],
  [Map, "map"],
  [Array, "list"],
  [Uint8Array, "bytes"],
  [ln, "uint"],
  [Lt, "type"],
  [ye, "optional"]
];
typeof Buffer < "u" && Xf.push([Buffer, "bytes"]);
class Ta {
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
    if (this.enableOptionalTypes = t.enableOptionalTypes ?? !1, this.objectTypes = ve(t.objectTypes), this.objectTypesByConstructor = ve(t.objectTypesByConstructor), this.objectTypeInstances = ve(t.objectTypeInstances), this.#s = ve(t.functionDeclarations), this.#r = ve(t.operatorDeclarations), this.#n = ve(
      t.typeDeclarations || Object.entries(At),
      void 0,
      !1
    ), this.constants = ve(t.constants), this.variables = t.unlistedVariablesAreDyn ? ve(t.variables, jy) : ve(t.variables), this.variables.size)
      Hy(this, this.enableOptionalTypes);
    else {
      for (const e of Xf) this.registerType(e[1], e[0], !0);
      for (const e in br) this.registerConstant(e, "type", br[e]);
    }
  }
  #g() {
    this.#t = {}, this.#e = {};
  }
  registerVariable(t, e) {
    if (this.variables.has(t)) throw new Error(`Variable already registered: ${t}`);
    return this.variables.set(t, e instanceof sn ? e : this.getType(e)), this;
  }
  registerConstant(t, e, r) {
    return this.registerVariable(t, e), this.constants.set(t, r), this;
  }
  #y(t, e, r) {
    let s = this.#o.get(t);
    return s = s.get(e) || s.set(e, /* @__PURE__ */ new Map()).get(e), s.get(r) || s.set(r, new Zy(this)).get(r);
  }
  getFunctionCandidates(t, e, r) {
    const s = this.#o.get(t)?.get(e)?.get(r);
    if (s) return s;
    for (const [, i] of this.#s)
      this.#y(!!i.receiverType, i.name, i.argTypes.length).add(i);
    return this.#y(t, e, r);
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
  getMapType(t, e) {
    return this.#u.get(t)?.get(e) || (this.#u.get(t) || this.#u.set(t, /* @__PURE__ */ new Map()).get(t)).set(e, this.#i(`map<${t}, ${e}>`, !0)).get(e);
  }
  getOptionalType(t) {
    return this.#p.get(t) || this.#p.set(t, this.#i(`optional<${t}>`, !0)).get(t);
  }
  assertType(t, e, r) {
    try {
      return this.#i(t, !0);
    } catch (s) {
      throw s.message = `Invalid ${e} '${s.unknownType || t}' in '${r}'`, s;
    }
  }
  getFunctionType(t) {
    return t === "ast" ? cs : this.#i(t, !0);
  }
  registerType(t, e, r) {
    if (typeof t != "string" || t.length < 2)
      throw new Error(`Invalid type name: ${t}`);
    const s = {
      name: t,
      typeType: br[t] || new Lt(t),
      type: this.#i(t, !1),
      ctor: typeof e == "function" ? e : e?.ctor,
      fields: this.#S(t, e?.fields)
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
  #i(t, e = !1) {
    let r = this.#n.get(t);
    if (r) return r;
    if (r = t.match(/^[A-Z]$/), r) return this.#l(Yy, t, t);
    if (r = t.match(/^dyn<(.+)>$/), r) {
      const s = this.#i(r[1].trim(), e);
      return this.#l(qf, `dyn<${s}>`, s);
    }
    if (r = t.match(/^list<(.+)>$/), r) {
      const s = this.#i(r[1].trim(), e);
      return this.#l(Gf, `list<${s}>`, s);
    }
    if (r = t.match(/^map<(.+)>$/), r) {
      const s = Gc(r[1]);
      if (s.length !== 2) throw new Error(`Invalid map type: ${t}`);
      const i = this.#i(s[0].trim(), e), o = this.#i(s[1].trim(), e);
      return this.#l(Zf, `map<${i}, ${o}>`, i, o);
    }
    if (r = t.match(/^optional<(.+)>$/), r) {
      const s = this.#i(r[1].trim(), e);
      return this.#l(Yf, `optional<${s}>`, s);
    }
    if (e) {
      const s = new Error(`Unknown type: ${t}`);
      throw s.unknownType = t, s;
    }
    return this.#l(qy, t, t);
  }
  #l(t, e, ...r) {
    return this.#n.get(e) || this.#n.set(e, t(...r)).get(e);
  }
  findMacro(t, e, r) {
    return this.#t[e]?.get(t)?.get(r) ?? this.#d(
      this.#t,
      e,
      t,
      r,
      this.getFunctionCandidates(e, t, r).declarations.find(
        (s) => s.macro
      ) || !1
    );
  }
  #w(t, e, r) {
    const s = [];
    for (const [, i] of this.#r) {
      if (i.operator !== t) continue;
      if (i.leftType === e && i.rightType === r) return [i];
      const o = this.#E(i, e, r);
      o && s.push(o);
    }
    return s.length === 0 && (t === "==" || t === "!=") && (e.kind === "dyn" || r.kind === "dyn") ? [{ handler: t === "==" ? (o, a) => o === a : (o, a) => o !== a, returnType: this.getType("bool") }] : s;
  }
  findUnaryOverload(t, e) {
    const r = this.#t[t]?.get(e);
    if (r !== void 0) return r;
    let s = !1;
    for (const [, i] of this.#r)
      if (!(i.operator !== t || i.leftType !== e)) {
        s = i;
        break;
      }
    return (this.#t[t] ??= /* @__PURE__ */ new Map()).set(e, s).get(e);
  }
  findBinaryOverload(t, e, r) {
    return this.#t[t]?.get(e)?.get(r) ?? this.#d(
      this.#t,
      t,
      e,
      r,
      this.#m(t, e, r)
    );
  }
  checkBinaryOverload(t, e, r) {
    return this.#e[t]?.get(e)?.get(r) ?? this.#d(
      this.#e,
      t,
      e,
      r,
      this.#b(t, e, r)
    );
  }
  #m(t, e, r) {
    const s = this.#w(t, e, r);
    if (s.length === 0) return !1;
    if (s.length === 1) return s[0];
    throw new Error(`Operator overload '${s[0].signature}' overlaps with '${s[1].signature}'.`);
  }
  #b(t, e, r) {
    const s = this.#w(t, e, r);
    if (s.length === 0) return !1;
    const i = s[0].returnType;
    return s.every((o) => o.returnType === i) ? i : (i.kind === "list" || i.kind === "map") && s.every((o) => o.returnType.kind === i.kind) ? i.kind === "list" ? At.list : At.map : At.dyn;
  }
  #d(t, e, r, s, i) {
    const o = t[e] ??= /* @__PURE__ */ new Map();
    return (o.get(r) || o.set(r, /* @__PURE__ */ new Map()).get(r)).set(s, i), i;
  }
  #E(t, e, r) {
    const s = t.hasPlaceholder() ? /* @__PURE__ */ new Map() : null, i = this.matchTypeWithPlaceholders(t.leftType, e, s);
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
  matchTypeWithPlaceholders(t, e, r) {
    if (!t.hasPlaceholder()) return e.matches(t) ? e : null;
    const s = e.kind === "dyn";
    return this.#f(t, e, r, s) && (s || e.matches(t.templated(this, r))) ? e : null;
  }
  #x(t, e, r) {
    const s = r.get(t);
    return s ? s.kind === "dyn" || e.kind === "dyn" ? !0 : s.matchesBoth(e) : r.set(t, e) && !0;
  }
  #f(t, e, r, s = !1) {
    if (!t.hasPlaceholder()) return !0;
    if (!e) return !1;
    const i = s || e.kind === "dyn";
    switch (e = e.unwrappedType, t.kind) {
      case "param": {
        const o = i ? At.dyn : e;
        return this.#x(t.name, o, r);
      }
      case "list":
        return e.name === "dyn" && (e = t), e.kind !== "list" ? !1 : this.#f(
          t.valueType,
          e.valueType,
          r,
          i
        );
      case "map":
        return e.name === "dyn" && (e = t), e.kind !== "map" ? !1 : this.#f(
          t.keyType,
          e.keyType,
          r,
          i
        ) && this.#f(
          t.valueType,
          e.valueType,
          r,
          i
        );
      case "optional":
        return e.name === "dyn" && (e = t), e.kind !== "optional" ? !1 : this.#f(
          t.valueType,
          e.valueType,
          r,
          i
        );
    }
    return !0;
  }
  #T(t, e, r, s = !1) {
    try {
      const i = typeof e[r] == "string" ? { type: e[r] } : { ...e[r] };
      if (typeof i?.type != "string") throw new Error("unsupported declaration");
      return this.#i(i.type, s);
    } catch (i) {
      throw i.message = `Field '${r}' in type '${t}' has unsupported declaration: ${JSON.stringify(e[r])}`, i;
    }
  }
  #S(t, e) {
    if (!e) return;
    const r = /* @__PURE__ */ Object.create(null);
    for (const s of Object.keys(e)) r[s] = this.#T(t, e, s);
    return r;
  }
  clone(t) {
    return new Ta({
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
  #v(t, e) {
    const r = t.match(/^(?:([a-zA-Z0-9.<>]+)\.)?(\w+)\((.*?)\):\s*(.+)$/);
    if (!r) throw new Error(`Invalid signature: ${t}`);
    const [, s, i, o, a] = r;
    try {
      return new Gy({
        name: i,
        receiverType: s ? this.getType(s) : null,
        returnType: this.getType(a.trim()),
        argTypes: Gc(o).map((c) => this.getFunctionType(c.trim())),
        handler: e
      });
    } catch (c) {
      throw new Error(`Invalid function declaration: ${t}: ${c.message}`);
    }
  }
  /**
   * @param {FunctionDeclaration} a
   * @param {FunctionDeclaration} b
   */
  #I(t, e) {
    return t.name !== e.name || t.argTypes.length !== e.argTypes.length || (t.receiverType || e.receiverType) && (!t.receiverType || !e.receiverType) ? !1 : !(t.receiverType !== e.receiverType && t.receiverType !== se && e.receiverType !== se) && (e.macro || t.macro || e.argTypes.every((s, i) => {
      const o = t.argTypes[i];
      return s === o || s === cs || o === cs || s === se || o === se;
    }));
  }
  /** @param {FunctionDeclaration} newDec */
  #A(t) {
    for (const [, e] of this.#s)
      if (this.#I(e, t))
        throw new Error(
          `Function signature '${t.signature}' overlaps with existing overload '${e.signature}'.`
        );
  }
  registerFunctionOverload(t, e) {
    const r = typeof e == "function" ? e : e?.handler, s = this.#v(t, r);
    this.#A(s), this.#s.set(s.signature, s), this.#o.get(!0).clear(), this.#o.get(!1).clear();
  }
  registerOperatorOverload(t, e) {
    const r = t.match(/^([-!])([\w.<>]+)(?::\s*([\w.<>]+))?$/);
    if (r) {
      const [, u, l, d] = r;
      return this.unaryOverload(u, l, e, d);
    }
    const s = t.match(
      /^([\w.<>]+) ([-+*%/]|==|!=|<|<=|>|>=|in) ([\w.<>]+)(?::\s*([\w.<>]+))?$/
    );
    if (!s) throw new Error(`Operator overload invalid: ${t}`);
    const [, i, o, a, c] = s;
    return this.binaryOverload(i, o, a, e, c);
  }
  unaryOverload(t, e, r, s) {
    const i = this.assertType(e, "type", `${t}${e}`), o = this.assertType(
      s || e,
      "return type",
      `${t}${e}: ${s || e}`
    ), a = new cr({ operator: `${t}_`, leftType: i, returnType: o, handler: r });
    if (this.#h(a))
      throw new Error(`Operator overload already registered: ${t}${e}`);
    this.#r.set(a.signature, a), this.#g();
  }
  #h(t) {
    for (const [, e] of this.#r) if (t.equals(e)) return !0;
    return !1;
  }
  binaryOverload(t, e, r, s, i) {
    i ??= qc(e) ? "bool" : t;
    const o = `${t} ${e} ${r}: ${i}`, a = this.assertType(t, "left type", o), c = this.assertType(r, "right type", o), u = this.assertType(i, "return type", o);
    if (qc(e) && u.type !== "bool")
      throw new Error(`Comparison operator '${e}' must return 'bool', got '${u.type}'`);
    const l = new cr({ operator: e, leftType: a, rightType: c, returnType: u, handler: s });
    if (l.hasPlaceholder() && !(c.hasPlaceholder() && a.hasPlaceholder()))
      throw new Error(
        `Operator overload with placeholders must use them in both left and right types: ${o}`
      );
    if (this.#h(l))
      throw new Error(`Operator overload already registered: ${l.signature}`);
    if (e === "==") {
      const d = [
        new cr({
          operator: "!=",
          leftType: a,
          rightType: c,
          handler(h, p, y, f) {
            return !s(h, p, y, f);
          },
          returnType: u
        })
      ];
      a !== c && d.push(
        new cr({
          operator: "==",
          leftType: c,
          rightType: a,
          handler(h, p, y, f) {
            return s(p, h, y, f);
          },
          returnType: u
        }),
        new cr({
          operator: "!=",
          leftType: c,
          rightType: a,
          handler(h, p, y, f) {
            return !s(p, h, y, f);
          },
          returnType: u
        })
      );
      for (const h of d)
        if (this.#h(h))
          throw new Error(`Operator overload already registered: ${h.signature}`);
      for (const h of d) this.#r.set(h.signature, h);
    }
    this.#r.set(l.signature, l), this.#g();
  }
}
function qc(n) {
  return n === "<" || n === "<=" || n === ">" || n === ">=" || n === "==" || n === "!=" || n === "in";
}
function Xy(n) {
  return new Ta(n);
}
class Qy {
  constructor(t, e) {
    this.variables = t, this.fallbackValues = e;
  }
  getType(t) {
    return this.variables.get(t);
  }
  getValue(t) {
    return this.fallbackValues.get(t);
  }
  fork() {
    return new zs(this);
  }
}
class zs {
  parent;
  context;
  variableName;
  variableType;
  variableValue;
  constructor(t) {
    this.parent = t;
  }
  fork() {
    return new zs(this);
  }
  forkWithVariable(t, e) {
    const r = new zs(this);
    return r.variableType = t, r.variableName = e, r;
  }
  withContext(t) {
    if (typeof t != "object") throw new F("Context must be an object");
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
    const e = Object.hasOwn(this.context, t) ? this.context[t] : void 0;
    return e !== void 0 ? e : this.parent.getValue(t);
  }
  #e(t) {
    if (this.variableName === t) return this.variableValue;
    const e = this.context.get(t);
    return e !== void 0 ? e : this.parent.getValue(t);
  }
  #n(t) {
    return this.variableName === t ? this.variableValue : this.parent.getValue(t);
  }
  getType(t) {
    return this.variableName === t ? this.variableType : this.parent.getType(t);
  }
}
function di(n, t) {
  if (n.op === "id") return n.args;
  throw new ot(t, n);
}
function Lr(n, t) {
  if (typeof t == "boolean") return !1;
  if (t instanceof Error)
    return n.error ??= t, /predicate must return bool|Unknown variable/.test(t.message);
  const e = n.ev.debugRuntimeType(t, n.firstMacroIter.checkedType);
  return n.error = new F(
    `${n.macro.functionDesc} predicate must return bool, got '${e}'`,
    n.firstMacroIter
  ), !0;
}
class Jy {
  items;
  results;
  error;
  constructor(t, e, r, s, i) {
    this.ev = t, this.macro = e, this.firstMacroIter = e.first, this.ctx = r.forkWithVariable(e.variableType, e.predicateVar), this.each = s, this.finalizer = i;
  }
  toIterable(t) {
    if (Array.isArray(t)) return t;
    if (t instanceof Set) return [...t];
    if (t instanceof Map) return [...t.keys()];
    if (t && typeof t == "object") return Object.keys(t);
    throw new F(
      `Expression of type '${this.ev.debugType(t)}' cannot be range of a comprehension (must be list, map, or dynamic).`,
      this.macro.receiver
    );
  }
  iterate(t) {
    const e = this.toIterable(t);
    for (let r = 0; r < e.length && this.return === void 0; ) {
      const s = this.ctx.setVariableValue(e[r++]);
      let i = this.ev.tryEval(this.firstMacroIter, s);
      if (i instanceof Promise ? i = i.then((o) => this.each(this, s, o)) : i = this.each(this, s, i), i instanceof Promise) return i.then(() => this.iterateAsync(e, r));
    }
    return this.finalizer(this);
  }
  async iterateAsync(t, e = 0) {
    t instanceof Promise && (t = this.toIterable(await t));
    for (let r = e; r < t.length && this.return === void 0; ) {
      const s = this.ctx.setVariableValue(t[r++]);
      let i = this.ev.tryEval(this.firstMacroIter, s);
      i = this.each(this, s, i instanceof Promise ? await i : i), i instanceof Promise && await i;
    }
    return this.finalizer(this);
  }
}
function Er(n, t) {
  return function(e, r, s) {
    const i = e.eval(r.receiver, s), o = new Jy(e, r, s, n, t);
    return i instanceof Promise ? o.iterateAsync(i) : o.iterate(i);
  };
}
function tw(n, t, e) {
  if (Lr(n, e)) throw n.error;
  e === !1 && (n.return = !1);
}
function ew(n) {
  if (n.return !== void 0) return n.return;
  if (n.error) throw n.error;
  return !0;
}
function nw(n, t, e) {
  if (Lr(n, e)) throw n.error;
  e === !0 && (n.return = !0);
}
function rw(n) {
  if (n.return !== void 0) return n.return;
  if (n.error) throw n.error;
  return !1;
}
function sw(n, t, e) {
  if (Lr(n, e) || e instanceof Error) throw n.error;
  e && (n.found ? n.return = !1 : n.found = !0);
}
function iw(n) {
  return n.return !== void 0 ? n.return : n.found === !0;
}
function Qf(n) {
  return n.results || [];
}
function ow(n, t, e) {
  if (e === !1) return;
  if (Lr(n, e) || e instanceof Error) throw n.error;
  const r = n.ev.eval(n.macro.second, t);
  return r instanceof Promise ? r.then((s) => (n.results ??= []).push(s)) : (n.results ??= []).push(r);
}
function aw(n, t, e) {
  if (e instanceof Error) throw n.error;
  return (n.results ??= []).push(e);
}
function cw(n, t, e) {
  if (Lr(n, e) || e instanceof Error) throw n.error;
  e && (n.results ??= []).push(t.variableValue);
}
function uw(n, t, e) {
  if (t.kind === "dyn") return t;
  if (t.kind === "list") return t.valueType;
  if (t.kind === "map") return t.keyType;
  throw new n.Error(
    `Expression of type '${t}' cannot be range of a comprehension (must be list, map, or dynamic).`,
    e.receiver
  );
}
function Sa(n, t, e) {
  const r = uw(n, n.check(t.receiver, e), t);
  return e.forkWithVariable(r, t.predicateVar);
}
function Vi({ description: n, evaluator: t }) {
  const e = `${n} invalid predicate iteration variable`;
  if (!t) throw new Error(`No evaluator provided for quantifier macro: ${n}`);
  function r(s, i, o) {
    o = Sa(s, i, o), i.variableType = o.variableType;
    const a = s.check(i.first, o);
    if (a.isDynOrBool()) return a;
    throw new s.Error(
      `${i.functionDesc} predicate must return bool, got '${a}'`,
      i.first
    );
  }
  return ({ args: s, receiver: i }) => ({
    functionDesc: n,
    receiver: i,
    first: s[1],
    predicateVar: di(s[0], e),
    evaluate: t,
    typeCheck: r
  });
}
function Yc(n) {
  const t = n ? "map(var, filter, transform)" : "map(var, transform)", e = `${t} invalid predicate iteration variable`, r = Er(
    n ? ow : aw,
    Qf
  );
  function s(i, o, a) {
    if (a = Sa(i, o, a), o.variableType = a.variableType, n) {
      const c = i.check(o.first, a);
      if (!c.isDynOrBool())
        throw new i.Error(
          `${o.functionDesc} filter predicate must return bool, got '${c}'`,
          o.first
        );
    }
    return i.getType(`list<${i.check(n ? o.second : o.first, a)}>`);
  }
  return ({ args: i, receiver: o }) => ({
    args: i,
    functionDesc: t,
    receiver: o,
    first: i[1],
    second: n ? i[2] : null,
    predicateVar: di(i[0], e),
    evaluate: r,
    typeCheck: s
  });
}
function lw() {
  const n = "filter(var, predicate)", t = `${n} invalid predicate iteration variable`, e = Er(cw, Qf);
  function r(s, i, o) {
    o = Sa(s, i, o), i.variableType = o.variableType;
    const a = s.check(i.first, o);
    if (a.isDynOrBool()) return s.getType(`list<${i.variableType}>`);
    throw new s.Error(
      `${i.functionDesc} predicate must return bool, got '${a}'`,
      i.first
    );
  }
  return ({ args: s, receiver: i }) => ({
    args: s,
    functionDesc: n,
    receiver: i,
    first: s[1],
    predicateVar: di(s[0], t),
    evaluate: e,
    typeCheck: r
  });
}
function fw() {
  const n = "has() invalid argument";
  function t(r, s, i) {
    const o = s.macroHasProps;
    let a = o.length, c = r.eval(o[--a], i), u;
    for (; a--; ) {
      const l = o[a];
      if (l.op === ".?" && (u ??= !0), c = r.debugType(c).fieldLazy(c, l.args[1], l, r), c === void 0) {
        if (!(!u && a && l.op === ".")) break;
        throw new F(`No such key: ${l.args[1]}`, l);
      }
    }
    return c !== void 0;
  }
  function e(r, s, i) {
    let o = s.args[0];
    if (o.op !== ".") throw new r.Error(n, o);
    if (!s.macroHasProps) {
      const a = [];
      for (; (o.op === "." || o.op === ".?") && a.push(o); ) o = o.args[0];
      if (o.op !== "id") throw new r.Error(n, o);
      r.check(o, i), a.push(o), s.macroHasProps = a;
    }
    return r.getType("bool");
  }
  return function({ args: r }) {
    return { args: r, evaluate: t, typeCheck: e };
  };
}
function dw(n) {
  n.registerFunctionOverload("has(ast): bool", fw()), n.registerFunctionOverload(
    "list.all(ast, ast): bool",
    Vi({
      description: "all(var, predicate)",
      evaluator: Er(tw, ew)
    })
  ), n.registerFunctionOverload(
    "list.exists(ast, ast): bool",
    Vi({
      description: "exists(var, predicate)",
      evaluator: Er(nw, rw)
    })
  ), n.registerFunctionOverload(
    "list.exists_one(ast, ast): bool",
    Vi({
      description: "exists_one(var, predicate)",
      evaluator: Er(sw, iw)
    })
  ), n.registerFunctionOverload("list.map(ast, ast): list<dyn>", Yc(!1)), n.registerFunctionOverload("list.map(ast, ast, ast): list<dyn>", Yc(!0)), n.registerFunctionOverload("list.filter(ast, ast): list<dyn>", lw());
  function t(s, i, o, a) {
    return s.eval(
      i.exp,
      o.forkWithVariable(i.val.checkedType, i.var).setVariableValue(a)
    );
  }
  class e {
  }
  const r = new e();
  n.registerType("CelNamespace", e), n.registerConstant("cel", "CelNamespace", r), n.registerFunctionOverload("CelNamespace.bind(ast, dyn, ast): dyn", ({ args: s }) => ({
    var: di(s[0], "invalid variable argument"),
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
function hw(n) {
  const t = n.unaryOverload.bind(n), e = n.binaryOverload.bind(n);
  function r(u, l) {
    if (u <= 9223372036854775807n && u >= -9223372036854775808n) return u;
    throw new F(`integer overflow: ${u}`, l);
  }
  t("!", "bool", (u) => !u), t("-", "int", (u) => -u), e("dyn<int>", "==", "double", (u, l) => u == l), e("dyn<int>", "==", "uint", (u, l) => u == l.valueOf()), e("int", "*", "int", (u, l, d) => r(u * l, d)), e("int", "+", "int", (u, l, d) => r(u + l, d)), e("int", "-", "int", (u, l, d) => r(u - l, d)), e("int", "/", "int", (u, l, d) => {
    if (l === 0n) throw new F("division by zero", d);
    return u / l;
  }), e("int", "%", "int", (u, l, d) => {
    if (l === 0n) throw new F("modulo by zero", d);
    return u % l;
  }), t("-", "double", (u) => -u), e("dyn<double>", "==", "int", (u, l) => u == l), e("dyn<double>", "==", "uint", (u, l) => u == l.valueOf()), e("double", "*", "double", (u, l) => u * l), e("double", "+", "double", (u, l) => u + l), e("double", "-", "double", (u, l) => u - l), e("double", "/", "double", (u, l) => u / l), e("string", "+", "string", (u, l) => u + l), e("list<V>", "+", "list<V>", (u, l) => [...u, ...l]), e("bytes", "+", "bytes", (u, l) => {
    const d = new Uint8Array(u.length + l.length);
    return d.set(u, 0), d.set(l, u.length), d;
  });
  const s = "google.protobuf.Duration";
  e(s, "+", s, (u, l) => u.addDuration(l)), e(s, "-", s, (u, l) => u.subtractDuration(l)), e(s, "==", s, (u, l) => u.seconds === l.seconds && u.nanos === l.nanos);
  const i = "google.protobuf.Timestamp";
  e(i, "==", i, (u, l) => u.getTime() === l.getTime()), e(i, "-", i, (u, l) => qe.fromMilliseconds(u.getTime() - l.getTime()), s), e(i, "-", s, (u, l) => l.subtractTimestamp(u)), e(i, "+", s, (u, l) => l.extendTimestamp(u)), e(s, "+", i, (u, l) => u.extendTimestamp(l));
  function o(u, l, d, h) {
    if (l instanceof Set && l.has(u)) return !0;
    for (const p of l) if (ur(u, p, h)) return !0;
    return !1;
  }
  function a(u, l) {
    return l instanceof Map ? l.get(u) !== void 0 : Object.hasOwn(l, u) ? l[u] !== void 0 : !1;
  }
  function c(u, l, d, h) {
    return o(u, l, d, h);
  }
  e("V", "in", "list<V>", c), e("K", "in", "map<K, V>", a);
  for (const u of ["type", "null", "bool", "string", "int", "double"])
    e(u, "==", u, (l, d) => l === d);
  e("bytes", "==", "bytes", (u, l) => {
    let d = u.length;
    if (d !== l.length) return !1;
    for (; d--; ) if (u[d] !== l[d]) return !1;
    return !0;
  }), e("list<V>", "==", "list<V>", (u, l, d, h) => {
    if (Array.isArray(u) && Array.isArray(l)) {
      const f = u.length;
      if (f !== l.length) return !1;
      for (let g = 0; g < f; g++)
        if (!ur(u[g], l[g], h)) return !1;
      return !0;
    }
    if (u instanceof Set && l instanceof Set) {
      if (u.size !== l.size) return !1;
      for (const f of u) if (!l.has(f)) return !1;
      return !0;
    }
    const p = u instanceof Set ? l : u, y = u instanceof Set ? u : l;
    if (!Array.isArray(p) || p.length !== y?.size) return !1;
    for (let f = 0; f < p.length; f++) if (!y.has(p[f])) return !1;
    return !0;
  }), e("map<K, V>", "==", "map<K, V>", (u, l, d, h) => {
    if (u instanceof Map && l instanceof Map) {
      if (u.size !== l.size) return !1;
      for (const [f, g] of u)
        if (!(l.has(f) && ur(g, l.get(f), h))) return !1;
      return !0;
    }
    if (u instanceof Map || l instanceof Map) {
      const f = u instanceof Map ? l : u, g = u instanceof Map ? u : l, m = Object.keys(f);
      if (g.size !== m.length) return !1;
      for (const [S, I] of g)
        if (!(S in f && ur(I, f[S], h))) return !1;
      return !0;
    }
    const p = Object.keys(u), y = Object.keys(l);
    if (p.length !== y.length) return !1;
    for (let f = 0; f < p.length; f++) {
      const g = p[f];
      if (!(g in l && ur(u[g], l[g], h))) return !1;
    }
    return !0;
  }), e("uint", "==", "uint", (u, l) => u.valueOf() === l.valueOf()), e("dyn<uint>", "==", "double", (u, l) => u.valueOf() == l), e("dyn<uint>", "==", "int", (u, l) => u.valueOf() == l), e("uint", "+", "uint", (u, l) => new ln(u.valueOf() + l.valueOf())), e("uint", "-", "uint", (u, l) => new ln(u.valueOf() - l.valueOf())), e("uint", "*", "uint", (u, l) => new ln(u.valueOf() * l.valueOf())), e("uint", "/", "uint", (u, l, d) => {
    if (l.valueOf() === 0n) throw new F("division by zero", d);
    return new ln(u.valueOf() / l.valueOf());
  }), e("uint", "%", "uint", (u, l, d) => {
    if (l.valueOf() === 0n) throw new F("modulo by zero", d);
    return new ln(u.valueOf() % l.valueOf());
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
    e(u, "<", l, (d, h) => d < h), e(u, "<=", l, (d, h) => d <= h), e(u, ">", l, (d, h) => d > h), e(u, ">=", l, (d, h) => d >= h);
}
function ur(n, t, e) {
  if (n === t) return !0;
  switch (typeof n) {
    case "string":
      return !1;
    case "bigint":
      return typeof t == "number" ? n == t : !1;
    case "number":
      return typeof t == "bigint" ? n == t : !1;
    case "boolean":
      return !1;
    case "object":
      if (typeof t != "object" || n === null || t === null) return !1;
      const r = e.objectTypesByConstructor.get(n.constructor)?.type, s = e.objectTypesByConstructor.get(t.constructor)?.type;
      if (!r || r !== s) return !1;
      const i = e.registry.findBinaryOverload("==", r, s);
      return i ? i.handler(n, t, null, e) : !1;
  }
  throw new F(`Cannot compare values of type ${typeof n}`);
}
class Jf {
  dynType = At.dyn;
  optionalType = At.optional;
  stringType = At.string;
  intType = At.int;
  doubleType = At.double;
  boolType = At.bool;
  nullType = At.null;
  listType = At.list;
  mapType = At.map;
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
        return t === null ? this.nullType : this.objectTypesByConstructor.get(t.constructor)?.type || Zc(this, t.constructor?.name || typeof t);
      default:
        Zc(this, typeof t);
    }
  }
}
function Zc(n, t) {
  throw new n.Error(`Unsupported type: ${t}`);
}
function us(n, t, e, r, s) {
  return e instanceof Promise || r instanceof Promise ? Promise.all([e, r]).then((i) => s(n, t, i[0], i[1])) : s(n, t, e, r);
}
function Xc(n, t, e) {
  const r = n.check(t.args[0], e);
  return t.op === "[]" && n.check(t.args[1], e), r.kind !== "optional" ? n.checkAccessOnType(t, e, r) : n.registry.getOptionalType(n.checkAccessOnType(t, e, r.valueType, !0));
}
function Qc(n, t, e) {
  const r = n.check(t.args[0], e);
  t.op === "[?]" && n.check(t.args[1], e);
  const s = r.kind === "optional" ? r.valueType : r;
  return n.registry.getOptionalType(n.checkAccessOnType(t, e, s, !0));
}
function Jc(n, t, e, r, s) {
  const i = n.check(r, t);
  if (i === e || e.isEmpty()) return i;
  if (i.isEmpty()) return e;
  let o;
  throw s === 0 ? o = "List elements must have the same type," : s === 1 ? o = "Map key uses wrong type," : s === 2 && (o = "Map value uses wrong type,"), new n.Error(
    `${o} expected type '${n.formatType(e)}' but found '${n.formatType(i)}'`,
    r
  );
}
function tu(n, t, e, r) {
  return e.unify(n.registry, n.check(r, t)) || n.dynType;
}
function Ks(n, t, e) {
  const r = n.debugRuntimeType(t, e.checkedType);
  return new n.Error(`Logical operator requires bool operands, got '${r}'`, e);
}
function pw(n, t, e) {
  const r = n.debugRuntimeType(t, e.checkedType);
  return new n.Error(`Ternary condition must be bool, got '${r}'`, e);
}
function eu(n, t, e, r) {
  if (e === !0) return n.eval(t.args[1], r);
  if (e === !1) return n.eval(t.args[2], r);
  throw pw(n, e, t.args[0]);
}
function nu(n, t, e) {
  const r = n.debugRuntimeType(e, t.args[0].checkedType), s = n.registry.findUnaryOverload(t.op, r);
  if (s) return s.handler(e);
  throw new n.Error(`no such overload: ${t.op[0]}${r}`, t);
}
function ru(n, t, e) {
  const r = n.eval(t.args[0], e);
  return r instanceof Promise ? r.then((s) => nu(n, t, s)) : nu(n, t, r);
}
function gw(n, t, e, r) {
  const s = n.debugOperandType(e, t.args[0].checkedType), i = n.debugOperandType(r, t.args[1].checkedType), o = n.registry.findBinaryOverload(t.op, s, i);
  if (o) return o.handler(e, r, t, n);
  throw new n.Error(`no such overload: ${s} ${t.op} ${i}`, t);
}
function yw(n, t, e) {
  return us(n, t, n.eval(t.args[0], e), n.eval(t.args[1], e), gw);
}
function su(n, t, e, r) {
  if (e === !0) return !0;
  const s = n.eval(t.args[1], r);
  return s instanceof Promise ? s.then((i) => iu(n, t, e, i)) : iu(n, t, e, s);
}
function iu(n, t, e, r) {
  if (r === !0) return !0;
  if (r !== !1) throw Ks(n, r, t.args[1]);
  if (e instanceof Error) throw e;
  if (e !== !1) throw Ks(n, e, t.args[0]);
  return !1;
}
function ou(n, t, e, r) {
  if (e === !1) return !1;
  const s = n.eval(t.args[1], r);
  return s instanceof Promise ? s.then((i) => au(n, t, e, i)) : au(n, t, e, s);
}
function au(n, t, e, r) {
  if (r === !1) return !1;
  if (r !== !0) throw Ks(n, r, t.args[1]);
  if (e instanceof Error) throw e;
  if (e !== !0) throw Ks(n, e, t.args[0]);
  return !0;
}
function cu(n, t, e) {
  const r = n.check(t.args[0], e), s = n.check(t.args[1], e);
  if (!r.isDynOrBool())
    throw new n.Error(
      `Logical operator requires bool operands, got '${n.formatType(r)}'`,
      t
    );
  if (!s.isDynOrBool())
    throw new n.Error(
      `Logical operator requires bool operands, got '${n.formatType(s)}'`,
      t
    );
  return n.boolType;
}
function uu(n, t, e) {
  const r = t.op, s = n.check(t.args[0], e);
  if (s.kind === "dyn") return r === "!_" ? n.boolType : s;
  const i = n.registry.findUnaryOverload(r, s);
  if (i) return i.returnType;
  throw new n.Error(`no such overload: ${r[0]}${n.formatType(s)}`, t);
}
function ww(n, t, e) {
  const r = t.op, s = n.check(t.args[0], e), i = n.check(t.args[1], e), o = n.registry.checkBinaryOverload(r, s, i);
  if (o) return o;
  throw new n.Error(
    `no such overload: ${n.formatType(s)} ${r} ${n.formatType(i)}`,
    t
  );
}
function lu(n, t, e) {
  const [r, s] = t.args, i = s.length, o = t.functionCandidates ??= n.registry.getFunctionCandidates(
    !1,
    r,
    i
  ), a = t.argTypes ??= new Array(i);
  let c = i;
  for (; c--; ) a[c] = n.debugOperandType(e[c], s[c].checkedType);
  const u = o.findMatch(a, null);
  if (u) return u.handler.apply(n, e);
  throw new n.Error(
    `found no matching overload for '${r}(${a.map((l) => l.unwrappedType).join(", ")})'`,
    t
  );
}
function mw(n, t, e, r) {
  const [s, i, o] = t.args, a = t.functionCandidates ??= n.registry.getFunctionCandidates(
    !0,
    s,
    o.length
  );
  let c = r.length;
  const u = t.argTypes ??= new Array(c);
  for (; c--; ) u[c] = n.debugOperandType(r[c], o[c].checkedType);
  const l = n.debugRuntimeType(e, i.checkedType || n.dynType), d = a.findMatch(u, l);
  if (d) return d.handler.call(n, e, ...r);
  throw new n.Error(
    `found no matching overload for '${l.type}.${s}(${u.map((h) => h.unwrappedType).join(", ")})'`,
    t
  );
}
function Mi(n, t, e, r = e.length) {
  let s;
  const i = new Array(r);
  for (; r--; ) (i[r] = n.eval(e[r], t)) instanceof Promise && (s ??= !0);
  return s ? Promise.all(i) : i;
}
function fu(n) {
  const t = {};
  for (let e = 0; e < n.length; e++) {
    const [r, s] = n[e];
    r === "__proto__" || r === "constructor" || r === "prototype" || (t[r] = s);
  }
  return t;
}
function Hi(n, t, e, r) {
  return n.optionalType.field(e, r, t, n);
}
function Fi(n, t, e, r) {
  return n.debugType(e).field(e, r, t, n);
}
const js = {
  value: {
    check(n, t) {
      return n.debugType(t.args);
    },
    evaluate(n, t) {
      return t.args;
    }
  },
  id: {
    check(n, t, e) {
      const r = e.getType(t.args);
      if (r !== void 0) return r;
      throw new n.Error(`Unknown variable: ${t.args}`, t);
    },
    evaluate(n, t, e) {
      const r = t.checkedType || e.getType(t.args), s = r && e.getValue(t.args);
      if (s === void 0) throw new n.Error(`Unknown variable: ${t.args}`, t);
      if (r.kind === "dyn") return n.debugType(s) && s;
      const i = n.debugType(s);
      if (r.matches(i)) return s;
      throw new n.Error(`Variable '${t.args}' is not of type '${r}', got '${i}'`, t);
    }
  },
  ".": {
    check: Xc,
    evaluate(n, t, e) {
      const r = n.eval(t.args[0], e);
      return r instanceof Promise ? r.then((s) => Fi(n, t, s, t.args[1])) : Fi(n, t, r, t.args[1]);
    }
  },
  ".?": {
    check: Qc,
    evaluate(n, t, e) {
      const r = n.eval(t.args[0], e);
      return r instanceof Promise ? r.then((s) => Hi(n, t, s, t.args[1])) : Hi(n, t, r, t.args[1]);
    }
  },
  "[]": {
    check: Xc,
    evaluate(n, t, e) {
      return us(n, t, n.eval(t.args[0], e), n.eval(t.args[1], e), Fi);
    }
  },
  "[?]": {
    check: Qc,
    evaluate(n, t, e) {
      return us(n, t, n.eval(t.args[0], e), n.eval(t.args[1], e), Hi);
    }
  },
  call: {
    check(n, t, e) {
      if (t.macro) return t.macro.typeCheck(n, t.macro, e);
      const r = t.args[0], s = t.args[1], i = t.functionCandidates ??= n.registry.getFunctionCandidates(
        !1,
        r,
        s.length
      ), o = s.map((c) => n.check(c, e)), a = i.findMatch(o);
      if (!a)
        throw new n.Error(
          `found no matching overload for '${r}(${n.formatTypeList(o)})'`,
          t
        );
      return a.returnType;
    },
    evaluate(n, t, e) {
      if (t.macro) return t.macro.evaluate(n, t.macro, e);
      const r = Mi(n, e, t.args[1]);
      return r instanceof Promise ? r.then((s) => lu(n, t, s)) : lu(n, t, r);
    }
  },
  rcall: {
    check(n, t, e) {
      if (t.macro) return t.macro.typeCheck(n, t.macro, e);
      const r = t.args[0], s = t.args[2], i = n.check(t.args[1], e), o = t.functionCandidates ??= n.registry.getFunctionCandidates(
        !0,
        r,
        s.length
      ), a = s.map((u) => n.check(u, e));
      if (i.kind === "dyn" && o.returnType) return o.returnType;
      const c = o.findMatch(a, i);
      if (!c)
        throw new n.Error(
          `found no matching overload for '${i.type}.${r}(${n.formatTypeList(
            a
          )})'`,
          t
        );
      return c.returnType;
    },
    evaluate(n, t, e) {
      return t.macro ? t.macro.evaluate(n, t.macro, e) : us(
        n,
        t,
        n.eval(t.args[1], e),
        Mi(n, e, t.args[2]),
        mw
      );
    }
  },
  list: {
    check(n, t, e) {
      const r = t.args, s = r.length;
      if (s === 0) return n.getType("list<T>");
      let i = n.check(r[0], e);
      const o = n.opts.homogeneousAggregateLiterals ? Jc : tu;
      for (let a = 1; a < s; a++) i = o(n, e, i, r[a], 0);
      return n.registry.getListType(i);
    },
    evaluate(n, t, e) {
      return Mi(n, e, t.args);
    }
  },
  map: {
    check(n, t, e) {
      const r = t.args, s = r.length;
      if (s === 0) return n.getType("map<K, V>");
      const i = n.opts.homogeneousAggregateLiterals ? Jc : tu;
      let o = n.check(r[0][0], e), a = n.check(r[0][1], e);
      for (let c = 1; c < s; c++) {
        const [u, l] = r[c];
        o = i(n, e, o, u, 1), a = i(n, e, a, l, 2);
      }
      return n.registry.getMapType(o, a);
    },
    evaluate(n, t, e) {
      const r = t.args, s = r.length, i = new Array(s);
      let o;
      for (let a = 0; a < s; a++) {
        const [c, u] = r[a], l = n.eval(c, e), d = n.eval(u, e);
        l instanceof Promise || d instanceof Promise ? (i[a] = Promise.all([l, d]), o ??= !0) : i[a] = [l, d];
      }
      return o ? Promise.all(i).then(fu) : fu(i);
    }
  },
  "?:": {
    check(n, t, e) {
      const r = n.check(t.args[0], e);
      if (!r.isDynOrBool())
        throw new n.Error(
          `Ternary condition must be bool, got '${n.formatType(r)}'`,
          t
        );
      const s = n.check(t.args[1], e), i = n.check(t.args[2], e), o = s.unify(n.registry, i);
      if (o) return o;
      throw new n.Error(
        `Ternary branches must have the same type, got '${n.formatType(
          s
        )}' and '${n.formatType(i)}'`,
        t
      );
    },
    evaluate(n, t, e) {
      const r = n.eval(t.args[0], e);
      return r instanceof Promise ? r.then((s) => eu(n, t, s, e)) : eu(n, t, r, e);
    }
  },
  "||": {
    check: cu,
    evaluate(n, t, e) {
      const r = n.tryEval(t.args[0], e);
      return r instanceof Promise ? r.then((s) => su(n, t, s, e)) : su(n, t, r, e);
    }
  },
  "&&": {
    check: cu,
    evaluate(n, t, e) {
      const r = n.tryEval(t.args[0], e);
      return r instanceof Promise ? r.then((s) => ou(n, t, s, e)) : ou(n, t, r, e);
    }
  },
  "!_": { check: uu, evaluate: ru },
  "-_": { check: uu, evaluate: ru }
}, bw = ["!=", "==", "in", "+", "-", "*", "/", "%", "<", "<=", ">", ">="];
for (const n of bw) js[n] = { check: ww, evaluate: yw };
for (const n in js) js[n].name = n;
const Ew = (/* @__PURE__ */ new Map()).set("A", "dyn").set("T", "dyn").set("K", "dyn").set("V", "dyn");
class du extends Jf {
  constructor(t, e) {
    super(t), this.isEvaluating = e, this.Error = e ? F : My;
  }
  /**
   * Check an expression and return its inferred type
   * @param {Array|any} ast - The AST node to check
   * @returns {Object} The inferred type declaration
   * @throws {TypeError} If type checking fails
   */
  check(t, e) {
    return t.checkedType ??= t.check(this, t, e);
  }
  checkAccessOnType(t, e, r, s = !1) {
    if (r.kind === "dyn") return r;
    const i = (t.op === "[]" || t.op === "[?]" ? this.check(t.args[1], e) : this.stringType).type;
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
    return t.hasPlaceholder() ? t.templated(this.registry, Ew).name : t.name;
  }
  formatTypeList(t) {
    return t.map((e) => this.formatType(e)).join(", ");
  }
}
const R = {
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
class va {
  #t;
  #e;
  constructor(t, e, r, s) {
    const i = js[r];
    this.#t = e, this.#e = t, this.op = r, this.check = i.check, this.evaluate = i.evaluate, this.args = s;
  }
  get input() {
    return this.#t;
  }
  get pos() {
    return this.#e;
  }
  toOldStructure() {
    const t = Array.isArray(this.args) ? this.args : [this.args];
    return [this.op, ...t.map((e) => e instanceof va ? e.toOldStructure() : e)];
  }
}
const ls = {};
for (const n in R) ls[R[n]] = n;
const xw = /* @__PURE__ */ new Set([
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
]), td = new Uint8Array(128);
for (const n of "0123456789abcdefABCDEF") td[n.charCodeAt(0)] = 1;
const hu = {
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
class Tw {
  constructor(t) {
    this.input = t, this.pos = 0, this.length = t.length;
  }
  // Read next token
  nextToken() {
    for (; ; ) {
      const { pos: t, input: e, length: r } = this;
      if (t >= r) return { type: R.EOF, value: null, pos: t };
      const s = e[t];
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
          if (e[t + 1] !== "=") break;
          return { type: R.EQ, value: "==", pos: (this.pos += 2) - 2 };
        case "&":
          if (e[t + 1] !== "&") break;
          return { type: R.AND, value: "&&", pos: (this.pos += 2) - 2 };
        case "|":
          if (e[t + 1] !== "|") break;
          return { type: R.OR, value: "||", pos: (this.pos += 2) - 2 };
        case "+":
          return { type: R.PLUS, value: "+", pos: this.pos++ };
        case "-":
          return { type: R.MINUS, value: "-", pos: this.pos++ };
        case "*":
          return { type: R.MULTIPLY, value: "*", pos: this.pos++ };
        case "/":
          if (e[t + 1] === "/") {
            for (; this.pos < r && this.input[this.pos] !== `
`; ) this.pos++;
            continue;
          }
          return { type: R.DIVIDE, value: "/", pos: this.pos++ };
        case "%":
          return { type: R.MODULO, value: "%", pos: this.pos++ };
        case "<":
          return e[t + 1] === "=" ? { type: R.LE, value: "<=", pos: (this.pos += 2) - 2 } : { type: R.LT, value: "<", pos: this.pos++ };
        case ">":
          return e[t + 1] === "=" ? { type: R.GE, value: ">=", pos: (this.pos += 2) - 2 } : { type: R.GT, value: ">", pos: this.pos++ };
        case "!":
          return e[t + 1] === "=" ? { type: R.NE, value: "!=", pos: (this.pos += 2) - 2 } : { type: R.NOT, pos: this.pos++ };
        case "(":
          return { type: R.LPAREN, pos: this.pos++ };
        case ")":
          return { type: R.RPAREN, pos: this.pos++ };
        case "[":
          return { type: R.LBRACKET, pos: this.pos++ };
        case "]":
          return { type: R.RBRACKET, pos: this.pos++ };
        case "{":
          return { type: R.LBRACE, pos: this.pos++ };
        case "}":
          return { type: R.RBRACE, pos: this.pos++ };
        case ".":
          return { type: R.DOT, pos: this.pos++ };
        case ",":
          return { type: R.COMMA, pos: this.pos++ };
        case ":":
          return { type: R.COLON, pos: this.pos++ };
        case "?":
          return { type: R.QUESTION, pos: this.pos++ };
        case '"':
        case "'":
          return this.readString(s);
        // Check for string prefixes (b, B, r, R followed by quote)
        case "b":
        case "B":
        case "r":
        case "R": {
          const i = e[t + 1];
          return i === '"' || i === "'" ? ++this.pos && this.readString(i, s) : this.readIdentifier();
        }
        default: {
          const i = s.charCodeAt(0);
          if (i <= 57 && i >= 48) return this.readNumber();
          if (this._isIdentifierCharCode(i)) return this.readIdentifier();
        }
      }
      throw new ot(`Unexpected character: ${s}`, { pos: t, input: e });
    }
  }
  // Characters: 0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_
  _isIdentifierCharCode(t) {
    return t < 48 || t > 122 ? !1 : t >= 97 || t >= 65 && t <= 90 || t <= 57 || t === 95;
  }
  _parseAsDouble(t, e) {
    const r = Number(this.input.substring(t, e));
    if (Number.isFinite(r)) return { type: R.NUMBER, value: r, pos: t };
    throw new ot(`Invalid number: ${r}`, { pos: t, input: this.input });
  }
  _parseAsBigInt(t, e, r, s) {
    const i = this.input.substring(t, e);
    if (s === "u" || s === "U") {
      this.pos++;
      try {
        return {
          type: R.NUMBER,
          value: new ln(i),
          pos: t
        };
      } catch {
      }
    } else
      try {
        return {
          type: R.NUMBER,
          value: BigInt(i),
          pos: t
        };
      } catch {
      }
    throw new ot(r ? `Invalid hex integer: ${i}` : `Invalid integer: ${i}`, {
      pos: t,
      input: this.input
    });
  }
  _readDigits(t, e, r, s) {
    for (; r < e && (s = t.charCodeAt(r)) && !(s > 57 || s < 48); ) r++;
    return r;
  }
  _readExponent(t, e, r) {
    let s = r < e && t[r];
    if (s === "e" || s === "E") {
      s = ++r < e && t[r], (s === "-" || s === "+") && r++;
      const i = r;
      if (r = this._readDigits(t, e, r), i === r) throw new ot("Invalid exponent", { pos: r, input: t });
    }
    return r;
  }
  readNumber() {
    const { input: t, length: e, pos: r } = this;
    let s = r;
    if (t[s] === "0" && (t[s + 1] === "x" || t[s + 1] === "X")) {
      for (s += 2; s < e && td[t[s].charCodeAt(0)]; ) s++;
      return this._parseAsBigInt(r, this.pos = s, !0, t[s]);
    }
    if (s = this._readDigits(t, e, s), s + 1 < e) {
      let i = !1, o = t[s] === "." ? this._readDigits(t, e, s + 1) : s + 1;
      if (o !== s + 1 && (i = !0) && (s = o), o = this._readExponent(t, e, s), o !== s && (i = !0) && (s = o), i) return this._parseAsDouble(r, this.pos = s);
    }
    return this._parseAsBigInt(r, this.pos = s, !1, t[s]);
  }
  readString(t, e) {
    const { input: r, pos: s } = this;
    return r[s + 1] === t && r[s + 2] === t ? this.readTripleQuotedString(t, e) : this.readSingleQuotedString(t, e);
  }
  _closeQuotedString(t, e, r) {
    switch (e) {
      case "b":
      case "B": {
        const s = this.processEscapes(t, !0), i = new Uint8Array(s.length);
        for (let o = 0; o < s.length; o++) i[o] = s.charCodeAt(o) & 255;
        return { type: R.BYTES, value: i, pos: r - 1 };
      }
      case "r":
      case "R":
        return { type: R.STRING, value: t, pos: r - 1 };
      default: {
        const s = this.processEscapes(t, !1);
        return { type: R.STRING, value: s, pos: r };
      }
    }
  }
  readSingleQuotedString(t, e) {
    const { input: r, length: s, pos: i } = this;
    let o, a = this.pos + 1;
    for (; a < s && (o = r[a]); ) {
      switch (o) {
        case t:
          const c = r.slice(i + 1, a);
          return this.pos = ++a, this._closeQuotedString(c, e, i);
        case `
`:
        case "\r":
          throw new ot("Newlines not allowed in single-quoted strings", { pos: i, input: r });
        case "\\":
          a++;
      }
      a++;
    }
    throw new ot("Unterminated string", { pos: i, input: r });
  }
  readTripleQuotedString(t, e) {
    const { input: r, length: s, pos: i } = this;
    let o, a = this.pos + 3;
    for (; a < s && (o = r[a]); ) {
      switch (o) {
        case t:
          if (r[a + 1] === t && r[a + 2] === t) {
            const c = r.slice(i + 3, a);
            return this.pos = a + 3, this._closeQuotedString(c, e, i);
          }
          break;
        case "\\":
          a++;
      }
      a++;
    }
    throw new ot("Unterminated triple-quoted string", { pos: i, input: r });
  }
  processEscapes(t, e) {
    if (!t.includes("\\")) return t;
    let r = "", s = 0;
    for (; s < t.length; ) {
      if (t[s] !== "\\" || s + 1 >= t.length) {
        r += t[s++];
        continue;
      }
      const i = t[s + 1];
      if (hu[i])
        r += hu[i], s += 2;
      else if (i === "u") {
        if (e) throw new ot("\\u not allowed in bytes literals");
        const o = t.substring(s + 2, s += 6);
        if (!/^[0-9a-fA-F]{4}$/.test(o)) throw new ot(`Invalid Unicode escape: \\u${o}`);
        const a = Number.parseInt(o, 16);
        if (a >= 55296 && a <= 57343) throw new ot(`Invalid Unicode surrogate: \\u${o}`);
        r += String.fromCharCode(a);
      } else if (i === "U") {
        if (e) throw new ot("\\U not allowed in bytes literals");
        const o = t.substring(s + 2, s += 10);
        if (!/^[0-9a-fA-F]{8}$/.test(o)) throw new ot(`Invalid Unicode escape: \\U${o}`);
        const a = Number.parseInt(o, 16);
        if (a > 1114111) throw new ot(`Invalid Unicode escape: \\U${o}`);
        if (a >= 55296 && a <= 57343) throw new ot(`Invalid Unicode surrogate: \\U${o}`);
        r += String.fromCodePoint(a);
      } else if (i === "x" || i === "X") {
        const o = t.substring(s + 2, s += 4);
        if (!/^[0-9a-fA-F]{2}$/.test(o)) throw new ot(`Invalid hex escape: \\${i}${o}`);
        r += String.fromCharCode(Number.parseInt(o, 16));
      } else if (i >= "0" && i <= "7") {
        const o = t.substring(s + 1, s += 4);
        if (!/^[0-7]{3}$/.test(o)) throw new ot("Octal escape must be 3 digits");
        const a = Number.parseInt(o, 8);
        if (a > 255) throw new ot(`Octal escape out of range: \\${o}`);
        r += String.fromCharCode(a);
      } else
        throw new ot(`Invalid escape sequence: \\${i}`);
    }
    return r;
  }
  readIdentifier() {
    const { pos: t, input: e, length: r } = this;
    let s = t;
    for (; s < r && this._isIdentifierCharCode(e[s].charCodeAt(0)); ) s++;
    const i = e.substring(t, this.pos = s);
    switch (i) {
      case "true":
        return { type: R.BOOLEAN, value: !0, pos: t };
      case "false":
        return { type: R.BOOLEAN, value: !1, pos: t };
      case "null":
        return { type: R.NULL, value: null, pos: t };
      case "in":
        return { type: R.IN, value: "in", pos: t };
      default:
        return { type: R.IDENTIFIER, value: i, pos: t };
    }
  }
}
class Sw {
  constructor(t, e) {
    this.limits = t, this.registry = e;
  }
  #t(t, e = this.currentToken) {
    throw new ot(`Exceeded ${t} (${this.limits[t]})`, {
      pos: e.pos,
      input: this.input
    });
  }
  #e(t, e, r) {
    const s = new va(t, this.input, e, r);
    return this.astNodesRemaining-- || this.#t("maxAstNodes", s), s;
  }
  #n() {
    const t = this.currentToken;
    return this.type = (this.currentToken = this.lexer.nextToken()).type, t;
  }
  consume(t) {
    if (this.type === t) return this.#n();
    throw new ot(
      `Expected ${ls[t]}, got ${ls[this.type]}`,
      { pos: this.currentToken.pos, input: this.input }
    );
  }
  match(t) {
    return this.type === t;
  }
  // Parse entry point
  parse(t) {
    this.input = t, this.lexer = new Tw(t), this.#n(), this.maxDepthRemaining = this.limits.maxDepth, this.astNodesRemaining = this.limits.maxAstNodes;
    const e = this.parseExpression();
    if (this.match(R.EOF)) return e;
    throw new ot(`Unexpected character: '${this.input[this.lexer.pos - 1]}'`, {
      pos: this.currentToken.pos,
      input: this.input
    });
  }
  #r(t, e, r, s) {
    const i = this.registry.findMacro(s, !!r, e.length);
    return i && (t.macro = i.handler({ ast: t, args: e, receiver: r, methodName: s, parser: this })), t;
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
    if (!this.match(R.QUESTION)) return ++this.maxDepthRemaining && t;
    const e = this.#n(), r = this.parseExpression();
    this.consume(R.COLON);
    const s = this.parseExpression();
    return this.maxDepthRemaining++, this.#e(e.pos, "?:", [t, r, s]);
  }
  // LogicalOr ::= LogicalAnd ('||' LogicalAnd)*
  parseLogicalOr() {
    let t = this.parseLogicalAnd();
    for (; this.match(R.OR); ) {
      const e = this.#n();
      t = this.#e(e.pos, e.value, [t, this.parseLogicalAnd()]);
    }
    return t;
  }
  // LogicalAnd ::= Equality ('&&' Equality)*
  parseLogicalAnd() {
    let t = this.parseEquality();
    for (; this.match(R.AND); ) {
      const e = this.#n();
      t = this.#e(e.pos, e.value, [t, this.parseEquality()]);
    }
    return t;
  }
  // Equality ::= Relational (('==' | '!=') Relational)*
  parseEquality() {
    let t = this.parseRelational();
    for (; this.match(R.EQ) || this.match(R.NE); ) {
      const e = this.#n();
      t = this.#e(e.pos, e.value, [t, this.parseRelational()]);
    }
    return t;
  }
  // Relational ::= Additive (('<' | '<=' | '>' | '>=' | 'in') Additive)*
  parseRelational() {
    let t = this.parseAdditive();
    for (; this.match(R.LT) || this.match(R.LE) || this.match(R.GT) || this.match(R.GE) || this.match(R.IN); ) {
      const e = this.#n();
      t = this.#e(e.pos, e.value, [t, this.parseAdditive()]);
    }
    return t;
  }
  // Additive ::= Multiplicative (('+' | '-') Multiplicative)*
  parseAdditive() {
    let t = this.parseMultiplicative();
    for (; this.match(R.PLUS) || this.match(R.MINUS); ) {
      const e = this.#n();
      t = this.#e(e.pos, e.value, [t, this.parseMultiplicative()]);
    }
    return t;
  }
  // Multiplicative ::= Unary (('*' | '/' | '%') Unary)*
  parseMultiplicative() {
    let t = this.parseUnary();
    for (; this.match(R.MULTIPLY) || this.match(R.DIVIDE) || this.match(R.MODULO); ) {
      const e = this.#n();
      t = this.#e(e.pos, e.value, [t, this.parseUnary()]);
    }
    return t;
  }
  // Unary ::= ('!' | '-')* Postfix
  parseUnary() {
    return this.type === R.NOT ? this.#e(this.#n().pos, "!_", [this.parseUnary()]) : this.type === R.MINUS ? this.#e(this.#n().pos, "-_", [this.parseUnary()]) : this.parsePostfix();
  }
  // Postfix ::= Primary (('.' IDENTIFIER ('(' ArgumentList ')')? | '[' Expression ']'))*
  parsePostfix() {
    let t = this.parsePrimary();
    const e = this.maxDepthRemaining;
    for (; ; ) {
      if (this.match(R.DOT)) {
        const r = this.#n();
        this.maxDepthRemaining-- || this.#t("maxDepth", r);
        const s = this.match(R.QUESTION) && this.registry.enableOptionalTypes && !!this.#n(), i = this.consume(R.IDENTIFIER);
        if (this.match(R.LPAREN) && this.#n()) {
          const o = this.parseArgumentList();
          this.consume(R.RPAREN), t = this.#o(
            this.#e(i.pos, "rcall", [i.value, t, o])
          );
        } else
          t = this.#e(i.pos, s ? ".?" : ".", [t, i.value]);
        continue;
      }
      if (this.match(R.LBRACKET)) {
        const r = this.#n();
        this.maxDepthRemaining-- || this.#t("maxDepth", r);
        const s = this.match(R.QUESTION) && this.registry.enableOptionalTypes && !!this.#n(), i = this.parseExpression();
        this.consume(R.RBRACKET), t = this.#e(r.pos, s ? "[?]" : "[]", [t, i]);
        continue;
      }
      break;
    }
    return this.maxDepthRemaining = e, t;
  }
  // Primary ::= NUMBER | STRING | BOOLEAN | NULL | IDENTIFIER | '(' Expression ')' | Array | Object
  parsePrimary() {
    switch (this.type) {
      case R.NUMBER:
      case R.STRING:
      case R.BYTES:
      case R.BOOLEAN:
      case R.NULL:
        return this.#a();
      case R.IDENTIFIER:
        return this.#c();
      case R.LPAREN:
        return this.#u();
      case R.LBRACKET:
        return this.parseList();
      case R.LBRACE:
        return this.parseMap();
    }
    throw new ot(`Unexpected token: ${ls[this.type]}`, {
      pos: this.currentToken.pos,
      input: this.input
    });
  }
  #a() {
    const t = this.#n();
    return this.#e(t.pos, "value", t.value);
  }
  #c() {
    const { value: t, pos: e } = this.consume(R.IDENTIFIER);
    if (xw.has(t))
      throw new ot(`Reserved identifier: ${t}`, {
        pos: e,
        input: this.input
      });
    if (!this.match(R.LPAREN)) return this.#e(e, "id", t);
    this.#n();
    const r = this.parseArgumentList();
    return this.consume(R.RPAREN), this.#s(this.#e(e, "call", [t, r]));
  }
  #u() {
    this.consume(R.LPAREN);
    const t = this.parseExpression();
    return this.consume(R.RPAREN), t;
  }
  parseList() {
    const t = this.consume(R.LBRACKET), e = [];
    let r = this.limits.maxListElements;
    if (!this.match(R.RBRACKET))
      for (e.push(this.parseExpression()), r-- || this.#t("maxListElements", e.at(-1)); this.match(R.COMMA) && (this.#n(), !this.match(R.RBRACKET)); )
        e.push(this.parseExpression()), r-- || this.#t("maxListElements", e.at(-1));
    return this.consume(R.RBRACKET), this.#e(t.pos, "list", e);
  }
  parseMap() {
    const t = this.consume(R.LBRACE), e = [];
    let r = this.limits.maxMapEntries;
    if (!this.match(R.RBRACE))
      for (e.push(this.parseProperty()), r-- || this.#t("maxMapEntries", e.at(-1)[0]); this.match(R.COMMA) && (this.#n(), !this.match(R.RBRACE)); )
        e.push(this.parseProperty()), r-- || this.#t("maxMapEntries", e.at(-1)[0]);
    return this.consume(R.RBRACE), this.#e(t.pos, "map", e);
  }
  parseProperty() {
    return [this.parseExpression(), (this.consume(R.COLON), this.parseExpression())];
  }
  parseArgumentList() {
    const t = [];
    let e = this.limits.maxCallArguments;
    if (!this.match(R.RPAREN))
      for (t.push(this.parseExpression()), e-- || this.#t("maxCallArguments", t.at(-1)); this.match(R.COMMA) && (this.#n(), !this.match(R.RPAREN)); )
        t.push(this.parseExpression()), e-- || this.#t("maxCallArguments", t.at(-1));
    return t;
  }
}
const Ia = Object.freeze({
  maxAstNodes: 1e5,
  maxDepth: 250,
  maxListElements: 1e3,
  maxMapEntries: 1e3,
  maxCallArguments: 32
}), vw = new Set(Object.keys(Ia));
function Iw(n, t = Ia) {
  const e = n ? Object.keys(n) : void 0;
  if (!e?.length) return t;
  const r = { ...t };
  for (const s of e) {
    if (!vw.has(s)) throw new TypeError(`Unknown limits option: ${s}`);
    const i = n[s];
    typeof i == "number" && (r[s] = i);
  }
  return Object.freeze(r);
}
const Aw = Object.freeze({
  unlistedVariablesAreDyn: !1,
  homogeneousAggregateLiterals: !0,
  enableOptionalTypes: !1,
  limits: Ia
});
function zi(n, t, e) {
  const r = n?.[e] ?? t?.[e];
  if (typeof r != "boolean") throw new TypeError(`Invalid option: ${e}`);
  return r;
}
function kw(n, t = Aw) {
  return n ? Object.freeze({
    unlistedVariablesAreDyn: zi(n, t, "unlistedVariablesAreDyn"),
    homogeneousAggregateLiterals: zi(n, t, "homogeneousAggregateLiterals"),
    enableOptionalTypes: zi(n, t, "enableOptionalTypes"),
    limits: Iw(n.limits, t.limits)
  }) : t;
}
const hi = Xy({ enableOptionalTypes: !1 });
Ky(hi);
hw(hi);
dw(hi);
const pu = /* @__PURE__ */ new WeakMap();
class Sn {
  #t;
  #e;
  #n;
  #r;
  #s;
  #o;
  constructor(t, e) {
    this.opts = kw(t, e?.opts), this.#t = (e instanceof Sn ? pu.get(e) : hi).clone(this.opts);
    const r = {
      objectTypes: this.#t.objectTypes,
      objectTypesByConstructor: this.#t.objectTypesByConstructor,
      registry: this.#t,
      opts: this.opts
    };
    this.#n = new du(r), this.#r = new du(r, !0), this.#e = new Bw(r), this.#s = new Sw(this.opts.limits, this.#t), this.#o = new Qy(this.#t.variables, this.#t.constants), pu.set(this, this.#t), Object.freeze(this);
  }
  clone(t) {
    return new Sn(t, this);
  }
  registerFunction(t, e) {
    return this.#t.registerFunctionOverload(t, e), this;
  }
  registerOperator(t, e) {
    return this.#t.registerOperatorOverload(t, e), this;
  }
  registerType(t, e) {
    return this.#t.registerType(t, e), this;
  }
  registerVariable(t, e) {
    return this.#t.registerVariable(t, e), this;
  }
  registerConstant(t, e, r) {
    return this.#t.registerConstant(t, e, r), this;
  }
  hasVariable(t) {
    return this.#t.variables.has(t);
  }
  check(t) {
    try {
      return this.#a(this.#s.parse(t));
    } catch (e) {
      return { valid: !1, error: e };
    }
  }
  #a(t) {
    try {
      const e = this.#n.check(t, this.#o.fork());
      return { valid: !0, type: this.#c(e) };
    } catch (e) {
      return { valid: !1, error: e };
    }
  }
  #c(t) {
    return t.name === "list<dyn>" ? "list" : t.name === "map<dyn, dyn>" ? "map" : t.name;
  }
  parse(t) {
    const e = this.#s.parse(t), r = this.#u.bind(this, e);
    return r.check = this.#a.bind(this, e), r.ast = e, r;
  }
  evaluate(t, e) {
    return this.#u(this.#s.parse(t), e);
  }
  #u(t, e = null) {
    const r = this.#o.fork().withContext(e);
    return t.checkedType || this.#r.check(t, r), this.#e.eval(t, r);
  }
}
class Bw extends Jf {
  constructor(t) {
    super(t), this.Error = F;
  }
  #t(t, e) {
    const r = t instanceof Array ? t[0] : t.values().next().value;
    return r === void 0 ? e : this.registry.getListType(this.debugRuntimeType(r, e.valueType));
  }
  #e(t) {
    if (t instanceof Map) return t.entries().next().value;
    for (const e in t) return [e, t[e]];
  }
  #n(t, e) {
    const r = this.#e(t);
    return r ? this.registry.getMapType(
      this.debugRuntimeType(r[0], e.keyType),
      this.debugRuntimeType(r[1], e.valueType)
    ) : e;
  }
  debugOperandType(t, e) {
    return e?.hasNoDynTypes() ? e : this.registry.getDynType(this.debugRuntimeType(t, e));
  }
  debugRuntimeType(t, e) {
    if (e?.hasNoDynTypes()) return e;
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
  tryEval(t, e) {
    try {
      const r = this.eval(t, e);
      return r instanceof Promise ? r.catch((s) => s) : r;
    } catch (r) {
      return r;
    }
  }
  eval(t, e) {
    return t.evaluate(this, t, e);
  }
}
new Sn({
  unlistedVariablesAreDyn: !0
});
const Aa = "amount", Ow = "expiry", $w = "birth", Uw = "weight", Nw = "inputType", Rw = "script", Zn = {
  signature: "now(): double",
  implementation: () => Math.floor(Date.now() / 1e3)
}, gu = new Sn().registerVariable(Aa, "double").registerVariable(Rw, "string").registerFunction(Zn.signature, Zn.implementation), Cw = new Sn().registerVariable(Aa, "double").registerVariable(Ow, "double").registerVariable($w, "double").registerVariable(Uw, "double").registerVariable(Nw, "string").registerFunction(Zn.signature, Zn.implementation), Lw = new Sn().registerVariable(Aa, "double").registerFunction(Zn.signature, Zn.implementation);
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
class Pw {
  /**
   * Creates a new Estimator with the given config
   * @param config - Configuration containing CEL programs for fee calculation
   */
  constructor(t) {
    this.config = t, this.intentOffchainInput = t.offchainInput ? Qr(t.offchainInput, Cw) : void 0, this.intentOnchainInput = t.onchainInput ? Qr(t.onchainInput, Lw) : void 0, this.intentOffchainOutput = t.offchainOutput ? Qr(t.offchainOutput, gu) : void 0, this.intentOnchainOutput = t.onchainOutput ? Qr(t.onchainOutput, gu) : void 0;
  }
  /**
   * Evaluates the fee for a given vtxo input
   * @param input - The offchain input to evaluate
   * @returns The fee amount for this input
   */
  evalOffchainInput(t) {
    if (!this.intentOffchainInput)
      return Pt.ZERO;
    const e = _w(t);
    return new Pt(this.intentOffchainInput.program(e));
  }
  /**
   * Evaluates the fee for a given boarding input
   * @param input - The onchain input to evaluate
   * @returns The fee amount for this input
   */
  evalOnchainInput(t) {
    if (!this.intentOnchainInput)
      return Pt.ZERO;
    const e = {
      amount: Number(t.amount)
    };
    return new Pt(this.intentOnchainInput.program(e));
  }
  /**
   * Evaluates the fee for a given vtxo output
   * @param output - The output to evaluate
   * @returns The fee amount for this output
   */
  evalOffchainOutput(t) {
    if (!this.intentOffchainOutput)
      return Pt.ZERO;
    const e = yu(t);
    return new Pt(this.intentOffchainOutput.program(e));
  }
  /**
   * Evaluates the fee for a given collaborative exit output
   * @param output - The output to evaluate
   * @returns The fee amount for this output
   */
  evalOnchainOutput(t) {
    if (!this.intentOnchainOutput)
      return Pt.ZERO;
    const e = yu(t);
    return new Pt(this.intentOnchainOutput.program(e));
  }
  /**
   * Evaluates the fee for a given set of inputs and outputs
   * @param offchainInputs - Array of offchain inputs to evaluate
   * @param onchainInputs - Array of onchain inputs to evaluate
   * @param offchainOutputs - Array of offchain outputs to evaluate
   * @param onchainOutputs - Array of onchain outputs to evaluate
   * @returns The total fee amount
   */
  eval(t, e, r, s) {
    let i = Pt.ZERO;
    for (const o of t)
      i = i.add(this.evalOffchainInput(o));
    for (const o of e)
      i = i.add(this.evalOnchainInput(o));
    for (const o of r)
      i = i.add(this.evalOffchainOutput(o));
    for (const o of s)
      i = i.add(this.evalOnchainOutput(o));
    return i;
  }
}
function _w(n) {
  const t = {
    amount: Number(n.amount),
    inputType: n.type,
    weight: n.weight
  };
  return n.expiry && (t.expiry = Math.floor(n.expiry.getTime() / 1e3)), n.birth && (t.birth = Math.floor(n.birth.getTime() / 1e3)), t;
}
function yu(n) {
  return {
    amount: Number(n.amount),
    script: n.script
  };
}
function Qr(n, t) {
  const e = t.parse(n), r = e.check();
  if (!r.valid)
    throw new Error(`type check failed: ${r.error?.message ?? "unknown error"}`);
  if (r.type !== "double")
    throw new Error(`expected return type double, got ${r.type}`);
  return { program: e, text: n };
}
const lr = {
  commitmentTxid: "",
  boardingTxid: "",
  arkTxid: ""
};
function Ki(n) {
  const t = /* @__PURE__ */ new Map();
  for (const e of n)
    if (e.assets)
      for (const r of e.assets)
        t.set(r.assetId, (t.get(r.assetId) ?? 0) + r.amount);
  if (t.size !== 0)
    return Array.from(t, ([e, r]) => ({ assetId: e, amount: r }));
}
function wu(n, t) {
  const e = /* @__PURE__ */ new Map();
  for (const r of n)
    if (r.assets)
      for (const s of r.assets)
        e.set(s.assetId, (e.get(s.assetId) ?? 0) + s.amount);
  for (const r of t)
    if (r.assets)
      for (const s of r.assets) {
        const o = (e.get(s.assetId) ?? 0) - s.amount;
        o > 0 ? e.set(s.assetId, o) : e.delete(s.assetId);
      }
  if (e.size !== 0)
    return Array.from(e, ([r, s]) => ({ assetId: r, amount: s }));
}
async function Dw(n, t, e, r) {
  const s = [...n].sort((u, l) => u.createdAt.getTime() - l.createdAt.getTime()), i = [];
  let o = [];
  for (const u of s)
    if (u.status.isLeaf ? !e.has(u.virtualStatus.commitmentTxIds[0]) && s.filter((l) => l.settledBy === u.virtualStatus.commitmentTxIds[0]).length === 0 && o.push({
      key: {
        ...lr,
        commitmentTxid: u.virtualStatus.commitmentTxIds[0]
      },
      tag: "batch",
      type: ke.TxReceived,
      amount: u.value,
      settled: u.status.isLeaf || u.isSpent,
      createdAt: u.createdAt.getTime(),
      assets: Ki([u])
    }) : s.filter((l) => l.arkTxId === u.txid).length === 0 && o.push({
      key: { ...lr, arkTxid: u.txid },
      tag: "offchain",
      type: ke.TxReceived,
      amount: u.value,
      settled: u.status.isLeaf || u.isSpent,
      createdAt: u.createdAt.getTime(),
      assets: Ki([u])
    }), u.isSpent) {
      if (u.arkTxId && !i.some((l) => l.key.arkTxid === u.arkTxId)) {
        const l = s.filter((f) => f.txid === u.arkTxId), d = s.filter((f) => f.arkTxId === u.arkTxId), h = d.reduce((f, g) => f + g.value, 0);
        let p = 0, y = 0;
        if (l.length > 0) {
          const f = l.reduce((g, m) => g + m.value, 0);
          p = h - f, y = l[0].createdAt.getTime();
        } else
          p = h, y = r ? await r(u.arkTxId) : u.createdAt.getTime() + 1;
        i.push({
          key: { ...lr, arkTxid: u.arkTxId },
          tag: "offchain",
          type: ke.TxSent,
          amount: p,
          settled: !0,
          createdAt: y,
          assets: wu(d, l)
        });
      }
      if (u.settledBy && !e.has(u.settledBy) && !i.some((l) => l.key.commitmentTxid === u.settledBy)) {
        const l = s.filter((p) => p.status.isLeaf && p.virtualStatus.commitmentTxIds?.every((y) => u.settledBy === y)), d = s.filter((p) => p.settledBy === u.settledBy), h = d.reduce((p, y) => p + y.value, 0);
        if (l.length > 0) {
          const p = l.reduce((y, f) => y + f.value, 0);
          h > p && i.push({
            key: { ...lr, commitmentTxid: u.settledBy },
            tag: "exit",
            type: ke.TxSent,
            amount: h - p,
            settled: !0,
            createdAt: l[0].createdAt.getTime(),
            assets: wu(d, l)
          });
        } else
          i.push({
            key: { ...lr, commitmentTxid: u.settledBy },
            tag: "exit",
            type: ke.TxSent,
            amount: h,
            settled: !0,
            // TODO: fetch commitment tx with /v1/indexer/commitmentTx/<commitmentTxid> to know when the tx was made
            createdAt: u.createdAt.getTime() + 1,
            assets: Ki(d)
          });
      }
    }
  return [...t.map((u) => ({ ...u, tag: "boarding" })), ...i, ...o].sort((u, l) => l.createdAt - u.createdAt);
}
class ed {
  constructor(t) {
    this.indexer = t;
  }
  async getAssetDetails(t) {
    return this.indexer.getAssetDetails(t);
  }
}
class Vw extends ed {
  constructor(t) {
    super(t.indexerProvider), this.wallet = t;
  }
  /**
   * Issue a new asset.
   * @param params - Parameters for asset issuance
   * @param params.amount - Amount of asset units to issue
   * @param params.controlAsset - Optional control asset (for reissuable assets)
   * @param params.metadata - Optional metadata to attach to the asset
   * @returns Promise resolving to the ark transaction ID and asset ID
   *
   * @example
   * ```typescript
   * // Issue a simple non-reissuable asset
   * const result = await wallet.issueAsset({ amount: 1000 });
   * console.log('Asset ID:', result.assetId);
   *
   * // Issue a reissuable asset with a new control asset
   * const result = await wallet.issueAsset({
   *   amount: 1000,
   *   controlAsset: 1 // creates new control asset with amount 1
   * });
   * console.log('Control Asset ID:', result.controlAssetId);
   * console.log('Asset ID:', result.assetId);
   *
   * // Issue a reissuable asset with an existing control asset
   * const result = await wallet.issueAsset({
   *   amount: 1000,
   *   controlAsset: 'controlAssetId'
   * });
   * console.log('Control Asset ID:', result.controlAssetId);
   * console.log('Asset ID:', result.assetId);
   * ```
   */
  async issue(t) {
    if (t.amount <= 0)
      throw new Error(`Issue amount must be greater than 0, got ${t.amount}`);
    const e = Mw(t.metadata), r = await this.wallet.getVtxos({
      withRecoverable: !1
    }), s = t.controlAssetId ? Ae.fromId(Bt.fromString(t.controlAssetId)) : null, i = Pn(r, Number(this.wallet.dustAmount));
    let o = 0n;
    const a = /* @__PURE__ */ new Map();
    for (const f of i.inputs)
      if (o += BigInt(f.value), !!f.assets)
        for (const { assetId: g, amount: m } of f.assets) {
          const S = a.get(g) ?? 0n;
          a.set(g, S + BigInt(m));
        }
    const c = [], u = _t.create(0, BigInt(t.amount)), l = Dt.create(null, s, [], [u], e);
    if (c.push(l), a.size > 0) {
      const f = as(i.inputs);
      for (const [g, m] of a) {
        const S = [];
        for (const [I, E] of f)
          for (const C of E)
            C.assetId === g && S.push(Ot.create(I, BigInt(C.amount)));
        c.push(Dt.create(Bt.fromString(g), null, S, [_t.create(0, m)], []));
      }
    }
    const d = await this.wallet.getAddress(), p = [
      {
        script: Zt.decode(d).pkScript,
        amount: BigInt(o)
      },
      ee.create(c).txOut()
    ], { arkTxid: y } = await this.wallet.buildAndSubmitOffchainTx(i.inputs, p);
    return {
      arkTxId: y,
      assetId: Bt.create(y, 0).toString()
    };
  }
  /**
   * Reissue more units of an existing asset.
   * Requires ownership of the control asset.
   *
   * @param params - Parameters for asset reissuance
   * @param params.assetId - The asset ID to reissue (control asset ID is resolved via getAssetDetails)
   * @param params.amount - Amount of additional units to issue
   * @returns Promise resolving to the ark transaction ID
   *
   * @example
   * ```typescript
   * const txid = await wallet.assetManager.reissue({
   *   assetId: 'def456...',
   *   amount: 500
   * });
   * ```
   */
  async reissue(t) {
    if (t.amount <= 0)
      throw new Error(`Reissuance amount must be greater than 0, got ${t.amount}`);
    const { controlAssetId: e } = await this.getAssetDetails(t.assetId);
    if (!e)
      throw new Error(`Asset ${t.assetId} is not reissuable`);
    const r = await this.wallet.getVtxos({
      withRecoverable: !1
    }), s = /* @__PURE__ */ new Map(), { selected: i } = Oo(r, e, 1n);
    let o = [...i], a = 0n;
    for (const E of i)
      if (E.assets)
        for (const { assetId: C, amount: M } of E.assets) {
          if (C === t.assetId) {
            a += BigInt(M);
            continue;
          }
          const X = s.get(C) ?? 0n;
          s.set(C, X + BigInt(M));
        }
    const c = Number(this.wallet.dustAmount);
    let u = o.reduce((E, C) => E + C.value, 0);
    if (u < c) {
      const E = r.filter((M) => !o.find((X) => X.txid === M.txid && X.vout === M.vout)), C = Pn(E, c - u);
      for (const M of C.inputs)
        if (M.assets)
          for (const { assetId: X, amount: tt } of M.assets) {
            if (X === t.assetId) {
              a += BigInt(tt);
              continue;
            }
            const w = s.get(X) ?? 0n;
            s.set(X, w + BigInt(tt));
          }
      o = [...o, ...C.inputs], u += C.inputs.reduce((M, X) => M + X.value, 0);
    }
    const l = as(o), d = [];
    for (const [E, C] of l)
      for (const M of C)
        M.assetId == t.assetId && d.push(Ot.create(E, BigInt(M.amount)));
    const h = a + BigInt(t.amount), p = Bt.fromString(t.assetId), f = [Dt.create(p, null, d, [_t.create(0, h)], [])];
    for (const [E, C] of s) {
      const M = [];
      for (const [X, tt] of l)
        for (const w of tt)
          w.assetId === E && M.push(Ot.create(X, BigInt(w.amount)));
      f.push(Dt.create(Bt.fromString(E), null, M, [_t.create(0, C)], []));
    }
    const g = await this.wallet.getAddress(), S = [
      {
        script: Zt.decode(g).pkScript,
        amount: BigInt(u)
      },
      ee.create(f).txOut()
    ], { arkTxid: I } = await this.wallet.buildAndSubmitOffchainTx(o, S);
    return I;
  }
  /**
   * Burn assets.
   * @param params - Parameters for burning
   * @param params.assetId - The asset ID to burn
   * @param params.amount - Amount of units to burn
   * @returns Promise resolving to the ark transaction ID
   *
   * @example
   * ```typescript
   * const txid = await wallet.assetManager.burn({
   *   assetId: 'abc123...',
   *   amount: 100
   * });
   * ```
   */
  async burn(t) {
    if (t.amount <= 0)
      throw new Error(`Burn amount must be greater than 0, got ${t.amount}`);
    const e = await this.wallet.getVtxos({
      withRecoverable: !1
    }), r = /* @__PURE__ */ new Map(), { selected: s } = Oo(e, t.assetId, BigInt(t.amount)), i = [...s];
    let o = 0;
    for (const y of s)
      if (o += y.value, !!y.assets)
        for (const { assetId: f, amount: g } of y.assets) {
          const m = r.get(f) ?? 0n;
          r.set(f, m + BigInt(g));
        }
    r.set(t.assetId, (r.get(t.assetId) ?? 0n) - BigInt(t.amount));
    const a = Number(this.wallet.dustAmount);
    if (o < a) {
      const y = e.filter((g) => !i.find((m) => m.txid === g.txid && m.vout === g.vout)), f = Pn(y, a - o);
      for (const g of f.inputs)
        if (o += g.value, !!g.assets)
          for (const { assetId: m, amount: S } of g.assets) {
            const I = r.get(m) ?? 0n;
            r.set(m, I + BigInt(S));
          }
      i.push(...f.inputs);
    }
    const c = [], u = as(i);
    for (const [y, f] of r) {
      const g = [];
      for (const [m, S] of u)
        for (const I of S)
          I.assetId === y && g.push(Ot.create(m, BigInt(I.amount)));
      c.push(Dt.create(Bt.fromString(y), null, g, f > 0n ? [_t.create(0, f)] : [], []));
    }
    const l = await this.wallet.getAddress(), h = [
      {
        script: Zt.decode(l).pkScript,
        amount: BigInt(o)
      },
      ee.create(c).txOut()
    ], { arkTxid: p } = await this.wallet.buildAndSubmitOffchainTx(i, h);
    return p;
  }
}
function Mw(n) {
  if (!n)
    return [];
  const t = [], e = new TextEncoder();
  for (const [r, s] of Object.entries(n)) {
    let i;
    if (typeof s == "string")
      i = e.encode(s);
    else if (typeof s == "number")
      i = e.encode(String(s));
    else if (s instanceof Uint8Array)
      i = s;
    else if (s instanceof ArrayBuffer)
      i = new Uint8Array(s);
    else
      throw new Error("Invalid metadata value type");
    t.push(wn.create(e.encode(r), i));
  }
  return t;
}
function Hw(n) {
  return typeof n == "object" && n !== null && "toReadonly" in n && typeof n.toReadonly == "function";
}
class mn {
  get assetManager() {
    return this._assetManager;
  }
  constructor(t, e, r, s, i, o, a, c, u, l) {
    this.identity = t, this.network = e, this.onchainProvider = r, this.indexerProvider = s, this.arkServerPublicKey = i, this.offchainTapscript = o, this.boardingTapscript = a, this.dustAmount = c, this.walletRepository = u, this.contractRepository = l, this._assetManager = new ed(this.indexerProvider);
  }
  /**
   * Protected helper to set up shared wallet configuration.
   * Extracts common logic used by both ReadonlyWallet.create() and Wallet.create().
   */
  static async setupWalletConfig(t, e) {
    const r = t.arkProvider || (() => {
      if (!t.arkServerUrl)
        throw new Error("Either arkProvider or arkServerUrl must be provided");
      return new Mf(t.arkServerUrl);
    })(), s = t.arkServerUrl || r.serverUrl;
    if (!s)
      throw new Error("Could not determine arkServerUrl from provider");
    const i = t.indexerUrl || s, o = t.indexerProvider || new Kf(i), a = await r.getInfo(), c = ey(a.network), u = t.esploraUrl || ry[a.network], l = t.onchainProvider || new sy(u);
    if (t.exitTimelock) {
      const { value: E, type: C } = t.exitTimelock;
      if (E < 512n && C !== "blocks" || E >= 512n && C !== "seconds")
        throw new Error("invalid exitTimelock");
    }
    const d = t.exitTimelock ?? {
      value: a.unilateralExitDelay,
      type: a.unilateralExitDelay < 512n ? "blocks" : "seconds"
    };
    if (t.boardingTimelock) {
      const { value: E, type: C } = t.boardingTimelock;
      if (E < 512n && C !== "blocks" || E >= 512n && C !== "seconds")
        throw new Error("invalid boardingTimelock");
    }
    const h = t.boardingTimelock ?? {
      value: a.boardingExitDelay,
      type: a.boardingExitDelay < 512n ? "blocks" : "seconds"
    }, p = k.decode(a.signerPubkey).slice(1), y = new Ds.Script({
      pubKey: e,
      serverPubKey: p,
      csvTimelock: d
    }), f = new Ds.Script({
      pubKey: e,
      serverPubKey: p,
      csvTimelock: h
    }), g = y, m = t.storage || new Ry(), S = new Uo(m), I = new Py(m);
    return {
      arkProvider: r,
      indexerProvider: o,
      onchainProvider: l,
      network: c,
      networkName: a.network,
      serverPubKey: p,
      offchainTapscript: g,
      boardingTapscript: f,
      dustAmount: a.dust,
      walletRepository: S,
      contractRepository: I,
      info: a
    };
  }
  static async create(t) {
    const e = await t.identity.xOnlyPublicKey();
    if (!e)
      throw new Error("Invalid configured public key");
    const r = await mn.setupWalletConfig(t, e);
    return new mn(t.identity, r.network, r.onchainProvider, r.indexerProvider, r.serverPubKey, r.offchainTapscript, r.boardingTapscript, r.dustAmount, r.walletRepository, r.contractRepository);
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
    const [t, e] = await Promise.all([
      this.getBoardingUtxos(),
      this.getVtxos()
    ]);
    let r = 0, s = 0;
    for (const h of t)
      h.status.confirmed ? r += h.value : s += h.value;
    let i = 0, o = 0, a = 0;
    i = e.filter((h) => h.virtualStatus.state === "settled").reduce((h, p) => h + p.value, 0), o = e.filter((h) => h.virtualStatus.state === "preconfirmed").reduce((h, p) => h + p.value, 0), a = e.filter((h) => he(h) && h.virtualStatus.state === "swept").reduce((h, p) => h + p.value, 0);
    const c = r + s, u = i + o + a, l = /* @__PURE__ */ new Map();
    for (const h of e)
      if (he(h) && h.assets)
        for (const p of h.assets) {
          const y = l.get(p.assetId) ?? 0;
          l.set(p.assetId, y + p.amount);
        }
    const d = Array.from(l.entries()).map(([h, p]) => ({
      assetId: h,
      amount: p
    }));
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
      total: c + u,
      assets: d
    };
  }
  async getVtxos(t) {
    const e = await this.getAddress(), s = (await this.getVirtualCoins(t)).map((i) => Ge(this, i));
    return await this.walletRepository.saveVtxos(e, s), s;
  }
  async getVirtualCoins(t = { withRecoverable: !0, withUnrolled: !1 }) {
    const e = [k.encode(this.offchainTapscript.pkScript)], s = (await this.indexerProvider.getVtxos({ scripts: e })).vtxos;
    let i = s.filter(he);
    if (t.withRecoverable || (i = i.filter((o) => !Ea(o) && !_f(o))), t.withUnrolled) {
      const o = s.filter((a) => !he(a));
      i.push(...o.filter((a) => a.isUnrolled));
    }
    return i;
  }
  async getTransactionHistory() {
    const t = await this.indexerProvider.getVtxos({
      scripts: [k.encode(this.offchainTapscript.pkScript)]
    }), { boardingTxs: e, commitmentsToIgnore: r } = await this.getBoardingTxs(), s = (i) => this.indexerProvider.getVtxos({ outpoints: [{ txid: i, vout: 0 }] }).then((o) => o.vtxos[0]?.createdAt.getTime() || 0);
    return Dw(t.vtxos, e, r, s);
  }
  async getBoardingTxs() {
    const t = [], e = /* @__PURE__ */ new Set(), r = await this.getBoardingAddress(), s = await this.onchainProvider.getTransactions(r);
    for (const a of s)
      for (let c = 0; c < a.vout.length; c++) {
        const u = a.vout[c];
        if (u.scriptpubkey_address === r) {
          const d = (await this.onchainProvider.getTxOutspends(a.txid))[c];
          d?.spent && e.add(d.txid), t.push({
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
    const i = [], o = [];
    for (const a of t) {
      const c = {
        key: {
          boardingTxid: a.txid,
          commitmentTxid: "",
          arkTxid: ""
        },
        amount: a.value,
        type: ke.TxReceived,
        settled: a.virtualStatus.state === "spent",
        createdAt: a.status.block_time ? new Date(a.status.block_time * 1e3).getTime() : 0
      };
      a.status.block_time ? o.push(c) : i.push(c);
    }
    return {
      boardingTxs: [...i, ...o],
      commitmentsToIgnore: e
    };
  }
  async getBoardingUtxos() {
    const t = await this.getBoardingAddress(), r = (await this.onchainProvider.getCoins(t)).map((s) => No(this, s));
    return await this.walletRepository.saveUtxos(t, r), r;
  }
  async notifyIncomingFunds(t) {
    const e = await this.getAddress(), r = await this.getBoardingAddress();
    let s, i;
    if (this.onchainProvider && r) {
      const a = (c) => c.vout.findIndex((u) => u.scriptpubkey_address === r);
      s = await this.onchainProvider.watchAddresses([r], (c) => {
        const u = c.filter((l) => a(l) !== -1).map((l) => {
          const { txid: d, status: h } = l, p = a(l), y = Number(l.vout[p].value);
          return { txid: d, vout: p, value: y, status: h };
        });
        t({
          type: "utxo",
          coins: u
        });
      });
    }
    if (this.indexerProvider && e) {
      const a = this.offchainTapscript, c = await this.indexerProvider.subscribeForScripts([
        k.encode(a.pkScript)
      ]), u = new AbortController(), l = this.indexerProvider.getSubscription(c, u.signal);
      i = async () => {
        u.abort(), await this.indexerProvider?.unsubscribeForScripts(c);
      }, (async () => {
        try {
          for await (const d of l)
            (d.newVtxos?.length > 0 || d.spentVtxos?.length > 0) && t({
              type: "vtxo",
              newVtxos: d.newVtxos.map((h) => Ge(this, h)),
              spentVtxos: d.spentVtxos.map((h) => Ge(this, h))
            });
        } catch (d) {
          console.error("Subscription error:", d);
        }
      })();
    }
    return () => {
      s?.(), i?.();
    };
  }
  async fetchPendingTxs() {
    const t = [k.encode(this.offchainTapscript.pkScript)];
    let { vtxos: e } = await this.indexerProvider.getVtxos({
      scripts: t
    });
    return e.filter((r) => r.virtualStatus.state !== "swept" && r.virtualStatus.state !== "settled" && r.arkTxId !== void 0).map((r) => r.arkTxId);
  }
}
class Xn extends mn {
  constructor(t, e, r, s, i, o, a, c, u, l, d, h, p, y, f, g) {
    super(t, e, s, o, a, c, u, p, y, f), this.networkName = r, this.arkProvider = i, this.serverUnrollScript = l, this.forfeitOutputScript = d, this.forfeitPubkey = h, this.identity = t, this.renewalConfig = {
      enabled: g?.enabled ?? !1,
      ...By,
      ...g
    };
  }
  get assetManager() {
    return this._walletAssetManager ?? (this._walletAssetManager = new Vw(this)), this._walletAssetManager;
  }
  static async create(t) {
    const e = await t.identity.xOnlyPublicKey();
    if (!e)
      throw new Error("Invalid configured public key");
    const r = await mn.setupWalletConfig(t, e);
    let s;
    try {
      const c = k.decode(r.info.checkpointTapscript);
      s = Ft.decode(c);
    } catch {
      throw new Error("Invalid checkpointTapscript from server");
    }
    const i = k.decode(r.info.forfeitPubkey).slice(1), o = Qe(r.network).decode(r.info.forfeitAddress), a = dt.encode(o);
    return new Xn(t.identity, r.network, r.networkName, r.onchainProvider, r.arkProvider, r.indexerProvider, r.serverPubKey, r.offchainTapscript, r.boardingTapscript, s, a, i, r.dustAmount, r.walletRepository, r.contractRepository, t.renewalConfig);
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
    const t = Hw(this.identity) ? await this.identity.toReadonly() : this.identity;
    return new mn(t, this.network, this.onchainProvider, this.indexerProvider, this.arkServerPublicKey, this.offchainTapscript, this.boardingTapscript, this.dustAmount, this.walletRepository, this.contractRepository);
  }
  async sendBitcoin(t) {
    if (t.amount <= 0)
      throw new Error("Amount must be positive");
    if (!Dy(t.address))
      throw new Error("Invalid Ark address " + t.address);
    const e = await this.getVirtualCoins({
      withRecoverable: !1
    });
    let r;
    if (t.selectedVtxos) {
      const u = t.selectedVtxos.map((d) => d.value).reduce((d, h) => d + h, 0);
      if (u < t.amount)
        throw new Error("Selected VTXOs do not cover specified amount");
      const l = u - t.amount;
      r = {
        inputs: t.selectedVtxos,
        changeAmount: BigInt(l)
      };
    } else
      r = Pn(e, t.amount);
    const s = Zt.decode(t.address), o = [
      {
        script: BigInt(t.amount) < this.dustAmount ? s.subdustPkScript : s.pkScript,
        amount: BigInt(t.amount)
      }
    ];
    if (r.changeAmount > 0n) {
      const u = r.changeAmount < this.dustAmount ? this.arkAddress.subdustPkScript : this.arkAddress.pkScript;
      o.push({
        script: u,
        amount: BigInt(r.changeAmount)
      });
    }
    const { arkTxid: a, signedCheckpointTxs: c } = await this.buildAndSubmitOffchainTx(r.inputs, o);
    try {
      const u = [], l = /* @__PURE__ */ new Set();
      let d = Number.MAX_SAFE_INTEGER;
      for (const [y, f] of r.inputs.entries()) {
        const g = Ge(this, f), m = c[y], S = ne.fromPSBT(xt.decode(m));
        if (u.push({
          ...g,
          virtualStatus: { ...g.virtualStatus, state: "spent" },
          spentBy: S.id,
          arkTxId: a,
          isSpent: !0
        }), g.virtualStatus.commitmentTxIds)
          for (const I of g.virtualStatus.commitmentTxIds)
            l.add(I);
        g.virtualStatus.batchExpiry && (d = Math.min(d, g.virtualStatus.batchExpiry));
      }
      const h = Date.now(), p = this.arkAddress.encode();
      if (r.changeAmount > 0n && d !== Number.MAX_SAFE_INTEGER) {
        const y = {
          txid: a,
          vout: o.length - 1,
          createdAt: new Date(h),
          forfeitTapLeafScript: this.offchainTapscript.forfeit(),
          intentTapLeafScript: this.offchainTapscript.forfeit(),
          isUnrolled: !1,
          isSpent: !1,
          tapTree: this.offchainTapscript.encode(),
          value: Number(r.changeAmount),
          virtualStatus: {
            state: "preconfirmed",
            commitmentTxIds: Array.from(l),
            batchExpiry: d
          },
          status: {
            confirmed: !1
          }
        };
        await this.walletRepository.saveVtxos(p, [y]);
      }
      await this.walletRepository.saveVtxos(p, u), await this.walletRepository.saveTransactions(p, [
        {
          key: {
            boardingTxid: "",
            commitmentTxid: "",
            arkTxid: a
          },
          amount: t.amount,
          type: ke.TxSent,
          settled: !1,
          createdAt: Date.now()
        }
      ]);
    } catch (u) {
      console.warn("error saving offchain tx to repository", u);
    } finally {
      return a;
    }
  }
  async settle(t, e) {
    if (t?.inputs) {
      for (const f of t.inputs)
        if (typeof f == "string")
          try {
            pt.fromString(f);
          } catch {
            throw new Error(`Invalid arknote "${f}"`);
          }
    }
    if (!t) {
      const { fees: f } = await this.arkProvider.getInfo(), g = new Pw(f.intentFee);
      let m = 0;
      const I = Ft.decode(k.decode(this.boardingTapscript.exitScript)).params.timelock, E = (await this.getBoardingUtxos()).filter((Y) => !Ay(Y, I)), C = [];
      for (const Y of E) {
        const D = g.evalOnchainInput({
          amount: BigInt(Y.value)
        });
        D.value >= Y.value || (C.push(Y), m += Y.value - D.satoshis);
      }
      const M = await this.getVtxos({ withRecoverable: !0 }), X = [];
      for (const Y of M) {
        const D = g.evalOffchainInput({
          amount: BigInt(Y.value),
          type: Y.virtualStatus.state === "swept" ? "recoverable" : "vtxo",
          weight: 0,
          birth: Y.createdAt,
          expiry: Y.virtualStatus.batchExpiry ? new Date(Y.virtualStatus.batchExpiry * 1e3) : /* @__PURE__ */ new Date()
        });
        D.value >= Y.value || (X.push(Y), m += Y.value - D.satoshis);
      }
      const tt = [...C, ...X];
      if (tt.length === 0)
        throw new Error("No inputs found");
      const w = {
        address: await this.getAddress(),
        amount: BigInt(m)
      }, J = g.evalOffchainOutput({
        amount: w.amount,
        script: k.encode(Zt.decode(w.address).pkScript)
      });
      if (w.amount -= BigInt(J.satoshis), w.amount <= this.dustAmount)
        throw new Error("Output amount is below dust limit");
      t = {
        inputs: tt,
        outputs: [w]
      };
    }
    const r = [], s = [];
    let i = !1;
    for (const [f, g] of t.outputs.entries()) {
      let m;
      try {
        m = Zt.decode(g.address).pkScript, i = !0;
      } catch {
        const S = Qe(this.network).decode(g.address);
        m = dt.encode(S), r.push(f);
      }
      s.push({
        amount: g.amount,
        script: m
      });
    }
    const o = /* @__PURE__ */ new Map();
    for (let f = 0; f < t.inputs.length; f++)
      if ("assets" in t.inputs[f]) {
        const g = t.inputs[f].assets;
        g && g.length > 0 && o.set(f + 1, g);
      }
    if (o.size > 0) {
      const f = /* @__PURE__ */ new Map();
      for (const [, E] of o)
        for (const C of E) {
          const M = f.get(C.assetId) ?? 0n;
          f.set(C.assetId, M + BigInt(C.amount));
        }
      const g = [];
      for (const [E, C] of f)
        g.push({ assetId: E, amount: Number(C) });
      const m = t.outputs.findIndex((E, C) => !r.includes(C));
      if (m === -1)
        throw new Error("Cannot settle assets without an offchain output");
      const S = t.outputs.map((E, C) => ({
        address: E.address,
        amount: Number(E.amount),
        assets: C === m ? g : void 0
      })), I = Dc(o, S, void 0);
      s.push(I.txOut());
    }
    let a;
    const c = [];
    i && (a = this.identity.signerSession(), c.push(k.encode(await a.getPublicKey())));
    const [u, l] = await Promise.all([
      this.makeRegisterIntentSignature(t.inputs, s, r, c),
      this.makeDeleteIntentSignature(t.inputs)
    ]), d = await this.safeRegisterIntent(u), h = [
      ...c,
      ...t.inputs.map((f) => `${f.txid}:${f.vout}`)
    ], p = this.createBatchHandler(d, t.inputs, a), y = new AbortController();
    try {
      const f = this.arkProvider.getEventStream(y.signal, h);
      return await ko.join(f, p, {
        abortController: y,
        skipVtxoTreeSigning: !i,
        eventCallback: e ? (g) => Promise.resolve(e(g)) : void 0
      });
    } catch (f) {
      throw await this.arkProvider.deleteIntent(l).catch(() => {
      }), f;
    } finally {
      y.abort();
    }
  }
  async handleSettlementFinalizationEvent(t, e, r, s) {
    const i = [], o = await this.getVirtualCoins();
    let a = ne.fromPSBT(xt.decode(t.commitmentTx)), c = !1, u = 0;
    const l = s?.leaves() || [];
    for (const d of e) {
      const h = o.find((I) => I.txid === d.txid && I.vout === d.vout);
      if (!h) {
        for (let I = 0; I < a.inputsLength; I++) {
          const E = a.getInput(I);
          if (!E.txid || E.index === void 0)
            throw new Error("The server returned incomplete data. No settlement input found in the PSBT");
          if (k.encode(E.txid) === d.txid && E.index === d.vout) {
            a.updateInput(I, {
              tapLeafScript: [d.forfeitTapLeafScript]
            }), a = await this.identity.sign(a, [
              I
            ]), c = !0;
            break;
          }
        }
        continue;
      }
      if (Ea(h) || Df(h, this.dustAmount))
        continue;
      if (l.length === 0)
        throw new Error("connectors not received");
      if (u >= l.length)
        throw new Error("not enough connectors received");
      const p = l[u], y = p.id, f = p.getOutput(0);
      if (!f)
        throw new Error("connector output not found");
      const g = f.amount, m = f.script;
      if (!g || !m)
        throw new Error("invalid connector output");
      u++;
      let S = uy([
        {
          txid: d.txid,
          index: d.vout,
          witnessUtxo: {
            amount: BigInt(h.value),
            script: Xt.decode(d.tapTree).pkScript
          },
          sighashType: bn.DEFAULT,
          tapLeafScript: [d.forfeitTapLeafScript]
        },
        {
          txid: y,
          index: 0,
          witnessUtxo: {
            amount: g,
            script: m
          }
        }
      ], r);
      S = await this.identity.sign(S, [0]), i.push(xt.encode(S.toPSBT()));
    }
    (i.length > 0 || c) && await this.arkProvider.submitSignedForfeitTxs(i, c ? xt.encode(a.toPSBT()) : void 0);
  }
  /**
   * @implements Batch.Handler interface.
   * @param intentId - The intent ID.
   * @param inputs - The inputs of the intent.
   * @param session - The musig2 signing session, if not provided, the signing will be skipped.
   */
  createBatchHandler(t, e, r) {
    let s;
    return {
      onBatchStarted: async (i) => {
        const o = new TextEncoder().encode(t), a = Tt(o), c = k.encode(a);
        let u = !0;
        for (const d of i.intentIdHashes)
          if (d === c) {
            if (!this.arkProvider)
              throw new Error("Ark provider not configured");
            await this.arkProvider.confirmRegistration(t), u = !1;
          }
        if (u)
          return { skip: u };
        const l = Ft.encode({
          timelock: {
            value: i.batchExpiry,
            type: i.batchExpiry >= 512n ? "seconds" : "blocks"
          },
          pubkeys: [this.forfeitPubkey]
        }).script;
        return s = hr(l), { skip: !1 };
      },
      onTreeSigningStarted: async (i, o) => {
        if (!r)
          return { skip: !0 };
        if (!s)
          throw new Error("Sweep tap tree root not set");
        const a = i.cosignersPublicKeys.map((y) => y.slice(2)), u = (await r.getPublicKey()).subarray(1);
        if (!a.includes(k.encode(u)))
          return { skip: !0 };
        const l = ne.fromPSBT(xt.decode(i.unsignedCommitmentTx));
        by(o, l, s);
        const d = l.getOutput(0);
        if (!d?.amount)
          throw new Error("Shared output not found");
        await r.init(o, s, d.amount);
        const h = k.encode(await r.getPublicKey()), p = await r.getNonces();
        return await this.arkProvider.submitTreeNonces(i.id, h, p), { skip: !1 };
      },
      onTreeNonces: async (i) => {
        if (!r)
          return { fullySigned: !0 };
        const { hasAllNonces: o } = await r.aggregatedNonces(i.txid, i.nonces);
        if (!o)
          return { fullySigned: !1 };
        const a = await r.sign(), c = k.encode(await r.getPublicKey());
        return await this.arkProvider.submitTreeSignatures(i.id, c, a), { fullySigned: !0 };
      },
      onBatchFinalization: async (i, o, a) => {
        if (!this.forfeitOutputScript)
          throw new Error("Forfeit output script not set");
        a && my(i.commitmentTx, a), await this.handleSettlementFinalizationEvent(i, e, this.forfeitOutputScript, a);
      }
    };
  }
  async safeRegisterIntent(t) {
    try {
      return await this.arkProvider.registerIntent(t);
    } catch (e) {
      if (e instanceof Vf && e.code === 0 && e.message.includes("duplicated input")) {
        const r = await this.getVtxos({
          withRecoverable: !0
        }), s = await this.makeDeleteIntentSignature(r);
        return await this.arkProvider.deleteIntent(s), this.arkProvider.registerIntent(t);
      }
      throw e;
    }
  }
  async makeRegisterIntentSignature(t, e, r, s) {
    const i = this.prepareIntentProofInputs(t), o = {
      type: "register",
      onchain_output_indexes: r,
      valid_at: 0,
      expire_at: 0,
      cosigners_public_keys: s
    }, a = We.create(o, i, e), c = await this.identity.sign(a);
    return {
      proof: xt.encode(c.toPSBT()),
      message: o
    };
  }
  async makeDeleteIntentSignature(t) {
    const e = this.prepareIntentProofInputs(t), r = {
      type: "delete",
      expire_at: 0
    }, s = We.create(r, e, []), i = await this.identity.sign(s);
    return {
      proof: xt.encode(i.toPSBT()),
      message: r
    };
  }
  async makeGetPendingTxIntentSignature(t) {
    const e = this.prepareIntentProofInputs(t), r = {
      type: "get-pending-tx",
      expire_at: 0
    }, s = We.create(r, e, []), i = await this.identity.sign(s);
    return {
      proof: xt.encode(i.toPSBT()),
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
      const i = [k.encode(this.offchainTapscript.pkScript)];
      let { vtxos: o } = await this.indexerProvider.getVtxos({
        scripts: i
      });
      if (o = o.filter((a) => a.virtualStatus.state !== "swept" && a.virtualStatus.state !== "settled"), o.length === 0)
        return { finalized: [], pending: [] };
      t = o.map((a) => Ge(this, a));
    }
    const r = [], s = [];
    for (let i = 0; i < t.length; i += 20) {
      const o = t.slice(i, i + 20), a = await this.makeGetPendingTxIntentSignature(o), c = await this.arkProvider.getPendingTxs(a);
      for (const u of c) {
        s.push(u.arkTxid);
        try {
          const l = await Promise.all(u.signedCheckpointTxs.map(async (d) => {
            const h = ne.fromPSBT(xt.decode(d)), p = await this.identity.sign(h);
            return xt.encode(p.toPSBT());
          }));
          await this.arkProvider.finalizeTx(u.arkTxid, l), r.push(u.arkTxid);
        } catch (l) {
          console.error(`Failed to finalize transaction ${u.arkTxid}:`, l);
        }
      }
    }
    return { finalized: r, pending: s };
  }
  /**
   * Send BTC and/or assets to one or more recipients.
   *
   * @param recipients - Array of recipients with their addresses, BTC amounts, and assets
   * @returns Promise resolving to the ark transaction ID
   *
   * @example
   * ```typescript
   * const txid = await wallet.send({
   *     address: 'ark1...',
   *     amount: 1000, // (optional, default to dust) btc amount to send to the output
   *     assets: [{ assetId: 'abc123...', amount: 50 }] // (optional) list of assets to send
   * });
   * ```
   */
  async send(...t) {
    if (t.length === 0)
      throw new Error("At least one receiver is required");
    const e = Vy(t, Number(this.dustAmount)), r = await this.getAddress(), s = Zt.decode(r), i = await this.getVirtualCoins({
      withRecoverable: !1
    }), o = /* @__PURE__ */ new Map();
    let a = [], c = 0;
    for (const m of e)
      c += Math.max(m.amount, Number(this.dustAmount));
    for (const m of e)
      if (m.assets)
        for (const S of m.assets) {
          let I = BigInt(S.amount);
          const E = o.get(S.assetId) ?? 0n;
          if (E >= I) {
            o.set(S.assetId, E - I), o.get(S.assetId) === 0n && o.delete(S.assetId);
            continue;
          }
          E > 0n && (I -= E, o.delete(S.assetId));
          const C = i.filter((w) => !a.find((J) => J.txid === w.txid && J.vout === w.vout)), { selected: M, totalAssetAmount: X } = Oo(C, S.assetId, I);
          for (const w of M)
            if (a.push(w), c -= w.value, w.assets)
              for (const J of w.assets) {
                if (J.assetId === S.assetId)
                  continue;
                const Y = o.get(J.assetId) ?? 0n;
                o.set(J.assetId, Y + BigInt(J.amount));
              }
          const tt = X - I;
          if (tt > 0n) {
            const w = o.get(S.assetId) ?? 0n;
            o.set(S.assetId, w + tt);
          }
        }
    if (c > 0) {
      const m = i.filter((I) => !a.find((E) => E.txid === I.txid && E.vout === I.vout)), { inputs: S } = Pn(m, c);
      for (const I of S)
        if (I.assets)
          for (const E of I.assets) {
            const C = o.get(E.assetId) ?? 0n;
            o.set(E.assetId, C + BigInt(E.amount));
          }
      a = [...a, ...S];
    }
    let u = a.reduce((m, S) => m + S.value, 0);
    const l = e.map((m) => ({
      script: m.script,
      amount: BigInt(m.amount)
    })), d = l.reduce((m, S) => m + Number(S.amount), 0);
    let h = u - d;
    if (o.size > 0 && h < Number(this.dustAmount)) {
      const m = i.filter((I) => !a.find((E) => E.txid === I.txid && E.vout === I.vout)), { inputs: S } = Pn(m, Number(this.dustAmount) - h);
      for (const I of S)
        if (I.assets)
          for (const E of I.assets) {
            const C = o.get(E.assetId) ?? 0n;
            o.set(E.assetId, C + BigInt(E.amount));
          }
      a = [...a, ...S], u += S.reduce((I, E) => I + E.value, 0), h = u - d;
    }
    let p;
    if (h > 0) {
      const m = [];
      for (const [S, I] of o)
        I > 0n && m.push({ assetId: S, amount: Number(I) });
      l.push({
        script: BigInt(h) < this.dustAmount ? s.subdustPkScript : s.pkScript,
        amount: BigInt(h)
      }), p = {
        address: r,
        amount: h,
        assets: m.length > 0 ? m : void 0
      };
    }
    const y = as(a);
    if (y.size > 0 || e.some((m) => m.assets && m.assets.length > 0)) {
      const m = Dc(y, e, p);
      l.push(m.txOut());
    }
    const { arkTxid: g } = await this.buildAndSubmitOffchainTx(a, l);
    return g;
  }
  /**
   * Build an offchain transaction from the given inputs and outputs,
   * sign it, submit to the ark provider, and finalize.
   * @returns The ark transaction id and server-signed checkpoint PSBTs (for bookkeeping)
   */
  async buildAndSubmitOffchainTx(t, e) {
    const r = this.offchainTapscript.forfeit();
    if (!r)
      throw new Error("Selected leaf not found");
    const s = this.offchainTapscript.encode(), i = Sy(t.map((l) => ({
      ...l,
      tapLeafScript: r,
      tapTree: s
    })), e, this.serverUnrollScript), o = await this.identity.sign(i.arkTx), { arkTxid: a, signedCheckpointTxs: c } = await this.arkProvider.submitTx(xt.encode(o.toPSBT()), i.checkpoints.map((l) => xt.encode(l.toPSBT()))), u = await Promise.all(c.map(async (l) => {
      const d = ne.fromPSBT(xt.decode(l)), h = await this.identity.sign(d);
      return xt.encode(h.toPSBT());
    }));
    return await this.arkProvider.finalizeTx(a, u), { arkTxid: a, signedCheckpointTxs: c };
  }
  prepareIntentProofInputs(t) {
    const e = [];
    for (const r of t) {
      const s = Xt.decode(r.tapTree), i = Fw(r.intentTapLeafScript), o = [Lf.encode(r.tapTree)];
      r.extraWitness && o.push(Cg.encode(r.extraWitness)), e.push({
        txid: k.decode(r.txid),
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
    return e;
  }
}
Xn.MIN_FEE_RATE = 1;
function Fw(n) {
  let t;
  try {
    const e = n[1], r = e.subarray(0, e.length - 1);
    try {
      const s = Ft.decode(r).params;
      t = To.encode(s.timelock.type === "blocks" ? { blocks: Number(s.timelock.value) } : { seconds: Number(s.timelock.value) });
    } catch {
      const s = Gn.decode(r).params;
      t = Number(s.absoluteTimelock);
    }
  } catch {
  }
  return t;
}
function Pn(n, t) {
  const e = [...n].sort((o, a) => {
    const c = o.virtualStatus.batchExpiry || Number.MAX_SAFE_INTEGER, u = a.virtualStatus.batchExpiry || Number.MAX_SAFE_INTEGER;
    return c !== u ? c - u : a.value - o.value;
  }), r = [];
  let s = 0;
  for (const o of e)
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
function mu() {
  const n = crypto.getRandomValues(new Uint8Array(16));
  return k.encode(n);
}
var _;
(function(n) {
  n.walletInitialized = (T) => ({
    type: "WALLET_INITIALIZED",
    success: !0,
    id: T
  });
  function t(T, L) {
    return {
      type: "ERROR",
      success: !1,
      message: L,
      id: T
    };
  }
  n.error = t;
  function e(T, L) {
    return {
      type: "SETTLE_EVENT",
      success: !0,
      event: L,
      id: T
    };
  }
  n.settleEvent = e;
  function r(T, L) {
    return {
      type: "SETTLE_SUCCESS",
      success: !0,
      txid: L,
      id: T
    };
  }
  n.settleSuccess = r;
  function s(T) {
    return T.type === "SETTLE_SUCCESS" && T.success;
  }
  n.isSettleSuccess = s;
  function i(T) {
    return T.type === "ADDRESS" && T.success === !0;
  }
  n.isAddress = i;
  function o(T) {
    return T.type === "BOARDING_ADDRESS" && T.success === !0;
  }
  n.isBoardingAddress = o;
  function a(T, L) {
    return {
      type: "ADDRESS",
      success: !0,
      address: L,
      id: T
    };
  }
  n.address = a;
  function c(T, L) {
    return {
      type: "BOARDING_ADDRESS",
      success: !0,
      address: L,
      id: T
    };
  }
  n.boardingAddress = c;
  function u(T) {
    return T.type === "BALANCE" && T.success === !0;
  }
  n.isBalance = u;
  function l(T, L) {
    return {
      type: "BALANCE",
      success: !0,
      balance: L,
      id: T
    };
  }
  n.balance = l;
  function d(T) {
    return T.type === "VTXOS" && T.success === !0;
  }
  n.isVtxos = d;
  function h(T, L) {
    return {
      type: "VTXOS",
      success: !0,
      vtxos: L,
      id: T
    };
  }
  n.vtxos = h;
  function p(T) {
    return T.type === "VIRTUAL_COINS" && T.success === !0;
  }
  n.isVirtualCoins = p;
  function y(T, L) {
    return {
      type: "VIRTUAL_COINS",
      success: !0,
      virtualCoins: L,
      id: T
    };
  }
  n.virtualCoins = y;
  function f(T) {
    return T.type === "BOARDING_UTXOS" && T.success === !0;
  }
  n.isBoardingUtxos = f;
  function g(T, L) {
    return {
      type: "BOARDING_UTXOS",
      success: !0,
      boardingUtxos: L,
      id: T
    };
  }
  n.boardingUtxos = g;
  function m(T) {
    return T.type === "SEND_BITCOIN_SUCCESS" && T.success === !0;
  }
  n.isSendBitcoinSuccess = m;
  function S(T, L) {
    return {
      type: "SEND_BITCOIN_SUCCESS",
      success: !0,
      txid: L,
      id: T
    };
  }
  n.sendBitcoinSuccess = S;
  function I(T) {
    return T.type === "TRANSACTION_HISTORY" && T.success === !0;
  }
  n.isTransactionHistory = I;
  function E(T, L) {
    return {
      type: "TRANSACTION_HISTORY",
      success: !0,
      transactions: L,
      id: T
    };
  }
  n.transactionHistory = E;
  function C(T) {
    return T.type === "WALLET_STATUS" && T.success === !0;
  }
  n.isWalletStatus = C;
  function M(T, L, W) {
    return {
      type: "WALLET_STATUS",
      success: !0,
      status: {
        walletInitialized: L,
        xOnlyPublicKey: W
      },
      id: T
    };
  }
  n.walletStatus = M;
  function X(T) {
    return T.type === "CLEAR_RESPONSE";
  }
  n.isClearResponse = X;
  function tt(T, L) {
    return {
      type: "CLEAR_RESPONSE",
      success: L,
      id: T
    };
  }
  n.clearResponse = tt;
  function w(T) {
    return T.type === "WALLET_RELOADED";
  }
  n.isWalletReloaded = w;
  function J(T, L) {
    return {
      type: "WALLET_RELOADED",
      success: L,
      id: T
    };
  }
  n.walletReloaded = J;
  function Y(T) {
    return T.type === "VTXO_UPDATE";
  }
  n.isVtxoUpdate = Y;
  function D(T, L) {
    return {
      type: "VTXO_UPDATE",
      id: mu(),
      // spontaneous update, not tied to a request
      success: !0,
      spentVtxos: L,
      newVtxos: T
    };
  }
  n.vtxoUpdate = D;
  function v(T) {
    return T.type === "UTXO_UPDATE";
  }
  n.isUtxoUpdate = v;
  function x(T) {
    return {
      type: "UTXO_UPDATE",
      id: mu(),
      // spontaneous update, not tied to a request
      success: !0,
      coins: T
    };
  }
  n.utxoUpdate = x;
  function b(T) {
    return T.type === "ISSUE_SUCCESS" && T.success === !0;
  }
  n.isIssueSuccess = b;
  function A(T, L) {
    return {
      type: "ISSUE_SUCCESS",
      success: !0,
      result: L,
      id: T
    };
  }
  n.issueSuccess = A;
  function O(T) {
    return T.type === "REISSUE_SUCCESS" && T.success === !0;
  }
  n.isReissueSuccess = O;
  function U(T, L) {
    return {
      type: "REISSUE_SUCCESS",
      success: !0,
      txid: L,
      id: T
    };
  }
  n.reissueSuccess = U;
  function $(T) {
    return T.type === "BURN_SUCCESS" && T.success === !0;
  }
  n.isBurnSuccess = $;
  function B(T, L) {
    return {
      type: "BURN_SUCCESS",
      success: !0,
      txid: L,
      id: T
    };
  }
  n.burnSuccess = B;
  function N(T) {
    return T.type === "SEND_SUCCESS" && T.success === !0;
  }
  n.isSendSuccess = N;
  function P(T, L) {
    return {
      type: "SEND_SUCCESS",
      success: !0,
      txid: L,
      id: T
    };
  }
  n.sendSuccess = P;
  function j(T) {
    return T.type === "ASSET_DETAILS" && T.success === !0;
  }
  n.isAssetDetailsResponse = j;
  function H(T, L) {
    return {
      type: "ASSET_DETAILS",
      success: !0,
      assetDetails: L,
      id: T
    };
  }
  n.assetDetails = H;
})(_ || (_ = {}));
class zw {
  constructor(t, e = 1) {
    this.db = null, this.dbName = t, this.version = e;
  }
  async getDB() {
    if (this.db)
      return this.db;
    const t = typeof window > "u" ? self : window;
    if (!(t && "indexedDB" in t))
      throw new Error("IndexedDB is not available in this environment");
    return new Promise((e, r) => {
      const s = t.indexedDB.open(this.dbName, this.version);
      s.onerror = () => r(s.error), s.onsuccess = () => {
        this.db = s.result, e(this.db);
      }, s.onupgradeneeded = () => {
        const i = s.result;
        i.objectStoreNames.contains("storage") || i.createObjectStore("storage");
      };
    });
  }
  async getItem(t) {
    try {
      const e = await this.getDB();
      return new Promise((r, s) => {
        const a = e.transaction(["storage"], "readonly").objectStore("storage").get(t);
        a.onerror = () => s(a.error), a.onsuccess = () => {
          r(a.result || null);
        };
      });
    } catch (e) {
      return console.error(`Failed to get item for key ${t}:`, e), null;
    }
  }
  async setItem(t, e) {
    try {
      const r = await this.getDB();
      return new Promise((s, i) => {
        const c = r.transaction(["storage"], "readwrite").objectStore("storage").put(e, t);
        c.onerror = () => i(c.error), c.onsuccess = () => s();
      });
    } catch (r) {
      throw console.error(`Failed to set item for key ${t}:`, r), r;
    }
  }
  async removeItem(t) {
    try {
      const e = await this.getDB();
      return new Promise((r, s) => {
        const a = e.transaction(["storage"], "readwrite").objectStore("storage").delete(t);
        a.onerror = () => s(a.error), a.onsuccess = () => r();
      });
    } catch (e) {
      console.error(`Failed to remove item for key ${t}:`, e);
    }
  }
  async clear() {
    try {
      const t = await this.getDB();
      return new Promise((e, r) => {
        const o = t.transaction(["storage"], "readwrite").objectStore("storage").clear();
        o.onerror = () => r(o.error), o.onsuccess = () => e();
      });
    } catch (t) {
      console.error("Failed to clear storage:", t);
    }
  }
}
const Kw = "arkade-service-worker", ji = (n) => n < 253 ? 1 : n <= 65535 ? 3 : n <= 4294967295 ? 5 : 9;
class rt {
  constructor(t, e, r, s, i, o) {
    this.hasWitness = t, this.inputCount = e, this.outputCount = r, this.inputSize = s, this.inputWitnessSize = i, this.outputSize = o;
  }
  static create() {
    return new rt(!1, 0, 0, 0, 0, 0);
  }
  addP2AInput() {
    return this.inputCount++, this.inputSize += rt.INPUT_SIZE, this;
  }
  addKeySpendInput(t = !0) {
    return this.inputCount++, this.inputWitnessSize += 65 + (t ? 0 : 1), this.inputSize += rt.INPUT_SIZE, this.hasWitness = !0, this;
  }
  addP2PKHInput() {
    return this.inputCount++, this.inputWitnessSize++, this.inputSize += rt.INPUT_SIZE + rt.P2PKH_SCRIPT_SIG_SIZE, this;
  }
  addTapscriptInput(t, e, r) {
    const s = 1 + rt.BASE_CONTROL_BLOCK_SIZE + 1 + e + 1 + r;
    return this.inputCount++, this.inputWitnessSize += t + 1 + s, this.inputSize += rt.INPUT_SIZE, this.hasWitness = !0, this;
  }
  addP2WPKHOutput() {
    return this.outputCount++, this.outputSize += rt.OUTPUT_SIZE + rt.P2WPKH_OUTPUT_SIZE, this;
  }
  addP2TROutput() {
    return this.outputCount++, this.outputSize += rt.OUTPUT_SIZE + rt.P2TR_OUTPUT_SIZE, this;
  }
  /**
   * Adds an output given a raw script.
   * Cost = 8 bytes (amount) + varint(scriptLen) + scriptLen
   */
  addOutputScript(t) {
    return this.outputCount++, this.outputSize += 8 + ji(t.length) + t.length, this;
  }
  /**
   * Adds an output by decoding the address to get the exact script size.
   */
  addOutputAddress(t, e) {
    const r = Qe(e).decode(t), s = dt.encode(r);
    return this.addOutputScript(s);
  }
  vsize() {
    const t = ji(this.inputCount), e = ji(this.outputCount);
    let s = (rt.BASE_TX_SIZE + t + this.inputSize + e + this.outputSize) * rt.WITNESS_SCALE_FACTOR;
    return this.hasWitness && (s += rt.WITNESS_HEADER_SIZE + this.inputWitnessSize), jw(s);
  }
}
rt.P2PKH_SCRIPT_SIG_SIZE = 108;
rt.INPUT_SIZE = 41;
rt.BASE_CONTROL_BLOCK_SIZE = 33;
rt.OUTPUT_SIZE = 9;
rt.P2WPKH_OUTPUT_SIZE = 22;
rt.BASE_TX_SIZE = 10;
rt.WITNESS_HEADER_SIZE = 2;
rt.WITNESS_SCALE_FACTOR = 4;
rt.P2TR_OUTPUT_SIZE = 34;
const jw = (n) => {
  const t = BigInt(Math.ceil(n / rt.WITNESS_SCALE_FACTOR));
  return {
    value: t,
    fee: (e) => e * t
  };
};
var lt;
(function(n) {
  function t(E) {
    return typeof E == "object" && E !== null && "type" in E;
  }
  n.isBase = t;
  function e(E) {
    return E.type === "INIT_WALLET" && "arkServerUrl" in E && typeof E.arkServerUrl == "string" && ("arkServerPublicKey" in E ? E.arkServerPublicKey === void 0 || typeof E.arkServerPublicKey == "string" : !0);
  }
  n.isInitWallet = e;
  function r(E) {
    return E.type === "SETTLE";
  }
  n.isSettle = r;
  function s(E) {
    return E.type === "GET_ADDRESS";
  }
  n.isGetAddress = s;
  function i(E) {
    return E.type === "GET_BOARDING_ADDRESS";
  }
  n.isGetBoardingAddress = i;
  function o(E) {
    return E.type === "GET_BALANCE";
  }
  n.isGetBalance = o;
  function a(E) {
    return E.type === "GET_VTXOS";
  }
  n.isGetVtxos = a;
  function c(E) {
    return E.type === "GET_VIRTUAL_COINS";
  }
  n.isGetVirtualCoins = c;
  function u(E) {
    return E.type === "GET_BOARDING_UTXOS";
  }
  n.isGetBoardingUtxos = u;
  function l(E) {
    return E.type === "SEND_BITCOIN" && "params" in E && E.params !== null && typeof E.params == "object" && "address" in E.params && typeof E.params.address == "string" && "amount" in E.params && typeof E.params.amount == "number";
  }
  n.isSendBitcoin = l;
  function d(E) {
    return E.type === "GET_TRANSACTION_HISTORY";
  }
  n.isGetTransactionHistory = d;
  function h(E) {
    return E.type === "GET_STATUS";
  }
  n.isGetStatus = h;
  function p(E) {
    return E.type === "CLEAR";
  }
  n.isClear = p;
  function y(E) {
    return E.type === "RELOAD_WALLET";
  }
  n.isReloadWallet = y;
  function f(E) {
    return E.type === "ISSUE" && "params" in E;
  }
  n.isIssue = f;
  function g(E) {
    return E.type === "REISSUE" && "params" in E;
  }
  n.isReissue = g;
  function m(E) {
    return E.type === "BURN" && "params" in E;
  }
  n.isBurn = m;
  function S(E) {
    return E.type === "SEND" && "recipients" in E;
  }
  n.isSend = S;
  function I(E) {
    return E.type === "GET_ASSET_DETAILS" && "assetId" in E;
  }
  n.isGetAssetDetails = I;
})(lt || (lt = {}));
class nd {
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
  async handleGetAssetDetails(...t) {
    return this.wallet.assetManager.getAssetDetails(...t);
  }
  async handleReload(t) {
    return { pending: await this.wallet.fetchPendingTxs(), finalized: [] };
  }
  async handleSettle(...t) {
  }
  async handleSendBitcoin(...t) {
  }
  async handleIssue(...t) {
  }
  async handleReissue(...t) {
  }
  async handleBurn(...t) {
  }
  async handleSend(...t) {
  }
}
class Ww extends nd {
  constructor(t) {
    super(t), this.wallet = t;
  }
  async handleReload(t) {
    return this.wallet.finalizePendingTxs(t.filter((e) => e.virtualStatus.state !== "swept" && e.virtualStatus.state !== "settled"));
  }
  async handleSettle(...t) {
    return this.wallet.settle(...t);
  }
  async handleSendBitcoin(...t) {
    return this.wallet.sendBitcoin(...t);
  }
  async handleIssue(...t) {
    return this.wallet.assetManager.issue(...t);
  }
  async handleReissue(...t) {
    return this.wallet.assetManager.reissue(...t);
  }
  async handleBurn(...t) {
    return this.wallet.assetManager.burn(...t);
  }
  async handleSend(...t) {
    return this.wallet.send(...t);
  }
  async handleGetAssetDetails(...t) {
    return this.wallet.assetManager.getAssetDetails(...t);
  }
}
class Gw {
  constructor(t = Kw, e = 1, r = () => {
  }) {
    this.dbName = t, this.dbVersion = e, this.messageCallback = r, this.storage = new zw(t, e), this.walletRepository = new Uo(this.storage);
  }
  /**
   * Get spendable vtxos for the current wallet address
   */
  async getSpendableVtxos() {
    if (!this.handler)
      return [];
    const t = await this.handler.getAddress();
    return (await this.walletRepository.getVtxos(t)).filter(he);
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
    const t = await this.handler.getAddress(), e = await this.walletRepository.getVtxos(t);
    return {
      spendable: e.filter(he),
      spent: e.filter((r) => !he(r))
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
    self.addEventListener("message", async (e) => {
      await this.handleMessage(e);
    }), t && (self.addEventListener("install", () => {
      self.skipWaiting();
    }), self.addEventListener("activate", () => {
      self.clients.claim();
    }));
  }
  async clear() {
    this.incomingFundsSubscription && this.incomingFundsSubscription(), await this.storage.clear(), this.walletRepository = new Uo(this.storage), this.handler = void 0, this.arkProvider = void 0, this.indexerProvider = void 0;
  }
  async reload() {
    await this.onWalletInitialized();
  }
  async onWalletInitialized() {
    if (!this.handler || !this.arkProvider || !this.indexerProvider || !this.handler.offchainTapscript || !this.handler.boardingTapscript)
      return;
    const t = k.encode(this.handler.offchainTapscript.pkScript), r = (await this.indexerProvider.getVtxos({
      scripts: [t]
    })).vtxos.map((c) => Ge(this.handler, c));
    try {
      const { pending: c, finalized: u } = await this.handler.handleReload(r);
      console.info(`Recovered ${u.length}/${c.length} pending transactions: ${u.join(", ")}`);
    } catch (c) {
      console.error("Error recovering pending transactions:", c);
    }
    const s = await this.handler.getAddress();
    await this.walletRepository.saveVtxos(s, r);
    const i = await this.handler.getBoardingAddress(), o = await this.handler.onchainProvider.getCoins(i);
    await this.walletRepository.saveUtxos(i, o.map((c) => No(this.handler, c)));
    const a = await this.handler.getTransactionHistory();
    a && await this.walletRepository.saveTransactions(s, a), this.incomingFundsSubscription && this.incomingFundsSubscription(), this.incomingFundsSubscription = await this.handler.notifyIncomingFunds(async (c) => {
      if (c.type === "vtxo") {
        const u = c.newVtxos.length > 0 ? c.newVtxos.map((d) => Ge(this.handler, d)) : [], l = c.spentVtxos.length > 0 ? c.spentVtxos.map((d) => Ge(this.handler, d)) : [];
        if ([...u, ...l].length === 0)
          return;
        await this.walletRepository.saveVtxos(s, [
          ...u,
          ...l
        ]), await this.sendMessageToAllClients(_.vtxoUpdate(u, l));
      }
      if (c.type === "utxo") {
        const u = c.coins.map((d) => No(this.handler, d)), l = await this.handler?.getBoardingAddress();
        await this.walletRepository.clearUtxos(l), await this.walletRepository.saveUtxos(l, u), await this.sendMessageToAllClients(_.utxoUpdate(u));
      }
    });
  }
  async handleClear(t) {
    await this.clear(), lt.isBase(t.data) && t.source?.postMessage(_.clearResponse(t.data.id, !0));
  }
  async handleInitWallet(t) {
    if (!lt.isInitWallet(t.data)) {
      console.error("Invalid INIT_WALLET message format", t.data), t.source?.postMessage(_.error(t.data.id, "Invalid INIT_WALLET message format"));
      return;
    }
    const e = t.data, { arkServerPublicKey: r, arkServerUrl: s } = e;
    this.arkProvider = new Mf(s), this.indexerProvider = new Kf(s);
    try {
      if ("privateKey" in e.key && typeof e.key.privateKey == "string") {
        const { key: { privateKey: i } } = e, o = yr.fromHex(i), a = await Xn.create({
          identity: o,
          arkServerUrl: s,
          arkServerPublicKey: r,
          storage: this.storage
          // Use unified storage for wallet too
        });
        this.handler = new Ww(a);
      } else if ("publicKey" in e.key && typeof e.key.publicKey == "string") {
        const { key: { publicKey: i } } = e, o = li.fromPublicKey(k.decode(i)), a = await mn.create({
          identity: o,
          arkServerUrl: s,
          arkServerPublicKey: r,
          storage: this.storage
          // Use unified storage for wallet too
        });
        this.handler = new nd(a);
      } else {
        const i = "Missing privateKey or publicKey in key object";
        t.source?.postMessage(_.error(e.id, i)), console.error(i);
        return;
      }
    } catch (i) {
      console.error("Error initializing wallet:", i);
      const o = i instanceof Error ? i.message : "Unknown error occurred";
      t.source?.postMessage(_.error(e.id, o));
      return;
    }
    t.source?.postMessage(_.walletInitialized(e.id)), await this.onWalletInitialized();
  }
  async handleSettle(t) {
    const e = t.data;
    if (!lt.isSettle(e)) {
      console.error("Invalid SETTLE message format", e), t.source?.postMessage(_.error(e.id, "Invalid SETTLE message format"));
      return;
    }
    try {
      if (!this.handler) {
        console.error("Wallet not initialized"), t.source?.postMessage(_.error(e.id, "Wallet not initialized"));
        return;
      }
      const r = await this.handler.handleSettle(e.params, (s) => {
        t.source?.postMessage(_.settleEvent(e.id, s));
      });
      r ? t.source?.postMessage(_.settleSuccess(e.id, r)) : t.source?.postMessage(_.error(e.id, "Operation not supported in readonly mode"));
    } catch (r) {
      console.error("Error settling:", r);
      const s = r instanceof Error ? r.message : "Unknown error occurred";
      t.source?.postMessage(_.error(e.id, s));
    }
  }
  async handleSendBitcoin(t) {
    const e = t.data;
    if (!lt.isSendBitcoin(e)) {
      console.error("Invalid SEND_BITCOIN message format", e), t.source?.postMessage(_.error(e.id, "Invalid SEND_BITCOIN message format"));
      return;
    }
    if (!this.handler) {
      console.error("Wallet not initialized"), t.source?.postMessage(_.error(e.id, "Wallet not initialized"));
      return;
    }
    try {
      const r = await this.handler.handleSendBitcoin(e.params);
      r ? t.source?.postMessage(_.sendBitcoinSuccess(e.id, r)) : t.source?.postMessage(_.error(e.id, "Operation not supported in readonly mode"));
    } catch (r) {
      console.error("Error sending bitcoin:", r);
      const s = r instanceof Error ? r.message : "Unknown error occurred";
      t.source?.postMessage(_.error(e.id, s));
    }
  }
  async handleGetAddress(t) {
    const e = t.data;
    if (!lt.isGetAddress(e)) {
      console.error("Invalid GET_ADDRESS message format", e), t.source?.postMessage(_.error(e.id, "Invalid GET_ADDRESS message format"));
      return;
    }
    if (!this.handler) {
      console.error("Wallet not initialized"), t.source?.postMessage(_.error(e.id, "Wallet not initialized"));
      return;
    }
    try {
      const r = await this.handler.getAddress();
      t.source?.postMessage(_.address(e.id, r));
    } catch (r) {
      console.error("Error getting address:", r);
      const s = r instanceof Error ? r.message : "Unknown error occurred";
      t.source?.postMessage(_.error(e.id, s));
    }
  }
  async handleGetBoardingAddress(t) {
    const e = t.data;
    if (!lt.isGetBoardingAddress(e)) {
      console.error("Invalid GET_BOARDING_ADDRESS message format", e), t.source?.postMessage(_.error(e.id, "Invalid GET_BOARDING_ADDRESS message format"));
      return;
    }
    if (!this.handler) {
      console.error("Wallet not initialized"), t.source?.postMessage(_.error(e.id, "Wallet not initialized"));
      return;
    }
    try {
      const r = await this.handler.getBoardingAddress();
      t.source?.postMessage(_.boardingAddress(e.id, r));
    } catch (r) {
      console.error("Error getting boarding address:", r);
      const s = r instanceof Error ? r.message : "Unknown error occurred";
      t.source?.postMessage(_.error(e.id, s));
    }
  }
  async handleGetBalance(t) {
    const e = t.data;
    if (!lt.isGetBalance(e)) {
      console.error("Invalid GET_BALANCE message format", e), t.source?.postMessage(_.error(e.id, "Invalid GET_BALANCE message format"));
      return;
    }
    if (!this.handler) {
      console.error("Wallet not initialized"), t.source?.postMessage(_.error(e.id, "Wallet not initialized"));
      return;
    }
    try {
      const [r, s, i] = await Promise.all([
        this.getAllBoardingUtxos(),
        this.getSpendableVtxos(),
        this.getSweptVtxos()
      ]);
      let o = 0, a = 0;
      for (const f of r)
        f.status.confirmed ? o += f.value : a += f.value;
      let c = 0, u = 0, l = 0;
      for (const f of s)
        f.virtualStatus.state === "settled" ? c += f.value : f.virtualStatus.state === "preconfirmed" && (u += f.value);
      for (const f of i)
        he(f) && (l += f.value);
      const d = o + a, h = c + u + l, p = /* @__PURE__ */ new Map();
      for (const f of [...s, ...i])
        if (he(f) && f.assets)
          for (const g of f.assets) {
            const m = p.get(g.assetId) ?? 0;
            p.set(g.assetId, m + g.amount);
          }
      const y = Array.from(p.entries()).map(([f, g]) => ({ assetId: f, amount: g }));
      t.source?.postMessage(_.balance(e.id, {
        boarding: {
          confirmed: o,
          unconfirmed: a,
          total: d
        },
        settled: c,
        preconfirmed: u,
        available: c + u,
        recoverable: l,
        total: d + h,
        assets: y
      }));
    } catch (r) {
      console.error("Error getting balance:", r);
      const s = r instanceof Error ? r.message : "Unknown error occurred";
      t.source?.postMessage(_.error(e.id, s));
    }
  }
  async handleGetVtxos(t) {
    const e = t.data;
    if (!lt.isGetVtxos(e)) {
      console.error("Invalid GET_VTXOS message format", e), t.source?.postMessage(_.error(e.id, "Invalid GET_VTXOS message format"));
      return;
    }
    if (!this.handler) {
      console.error("Wallet not initialized"), t.source?.postMessage(_.error(e.id, "Wallet not initialized"));
      return;
    }
    try {
      const r = await this.getSpendableVtxos(), s = this.handler.dustAmount, o = e.filter?.withRecoverable ?? !1 ? r : r.filter((a) => !(s != null && Df(a, s) || Ea(a) || _f(a)));
      t.source?.postMessage(_.vtxos(e.id, o));
    } catch (r) {
      console.error("Error getting vtxos:", r);
      const s = r instanceof Error ? r.message : "Unknown error occurred";
      t.source?.postMessage(_.error(e.id, s));
    }
  }
  async handleGetBoardingUtxos(t) {
    const e = t.data;
    if (!lt.isGetBoardingUtxos(e)) {
      console.error("Invalid GET_BOARDING_UTXOS message format", e), t.source?.postMessage(_.error(e.id, "Invalid GET_BOARDING_UTXOS message format"));
      return;
    }
    if (!this.handler) {
      console.error("Wallet not initialized"), t.source?.postMessage(_.error(e.id, "Wallet not initialized"));
      return;
    }
    try {
      const r = await this.getAllBoardingUtxos();
      t.source?.postMessage(_.boardingUtxos(e.id, r));
    } catch (r) {
      console.error("Error getting boarding utxos:", r);
      const s = r instanceof Error ? r.message : "Unknown error occurred";
      t.source?.postMessage(_.error(e.id, s));
    }
  }
  async handleGetTransactionHistory(t) {
    const e = t.data;
    if (!lt.isGetTransactionHistory(e)) {
      console.error("Invalid GET_TRANSACTION_HISTORY message format", e), t.source?.postMessage(_.error(e.id, "Invalid GET_TRANSACTION_HISTORY message format"));
      return;
    }
    if (!this.handler) {
      console.error("Wallet not initialized"), t.source?.postMessage(_.error(e.id, "Wallet not initialized"));
      return;
    }
    try {
      const r = await this.handler.getTransactionHistory();
      t.source?.postMessage(_.transactionHistory(e.id, r));
    } catch (r) {
      console.error("Error getting transaction history:", r);
      const s = r instanceof Error ? r.message : "Unknown error occurred";
      t.source?.postMessage(_.error(e.id, s));
    }
  }
  async handleGetStatus(t) {
    const e = t.data;
    if (!lt.isGetStatus(e)) {
      console.error("Invalid GET_STATUS message format", e), t.source?.postMessage(_.error(e.id, "Invalid GET_STATUS message format"));
      return;
    }
    const r = this.handler ? await this.handler.identity.xOnlyPublicKey() : void 0;
    t.source?.postMessage(_.walletStatus(e.id, this.handler !== void 0, r));
  }
  async handleMessage(t) {
    this.messageCallback(t);
    const e = t.data;
    if (!lt.isBase(e)) {
      console.warn("Invalid message format", JSON.stringify(e));
      return;
    }
    switch (e.type) {
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
      case "ISSUE": {
        await this.handleIssueMessage(t);
        break;
      }
      case "REISSUE": {
        await this.handleReissueMessage(t);
        break;
      }
      case "BURN": {
        await this.handleBurnMessage(t);
        break;
      }
      case "SEND": {
        await this.handleSendMessage(t);
        break;
      }
      case "GET_ASSET_DETAILS": {
        await this.handleGetAssetDetails(t);
        break;
      }
      default:
        t.source?.postMessage(_.error(e.id, "Unknown message type"));
    }
  }
  async sendMessageToAllClients(t) {
    self.clients.matchAll({ includeUncontrolled: !0, type: "window" }).then((e) => {
      e.forEach((r) => {
        r.postMessage(t);
      });
    });
  }
  async handleReloadWallet(t) {
    const e = t.data;
    if (!lt.isReloadWallet(e)) {
      console.error("Invalid RELOAD_WALLET message format", e), t.source?.postMessage(_.error(e.id, "Invalid RELOAD_WALLET message format"));
      return;
    }
    if (!this.handler) {
      console.error("Wallet not initialized"), t.source?.postMessage(_.walletReloaded(e.id, !1));
      return;
    }
    try {
      await this.onWalletInitialized(), t.source?.postMessage(_.walletReloaded(e.id, !0));
    } catch (r) {
      console.error("Error reloading wallet:", r), t.source?.postMessage(_.walletReloaded(e.id, !1));
    }
  }
  async handleIssueMessage(t) {
    const e = t.data;
    if (!lt.isIssue(e)) {
      console.error("Invalid ISSUE message format", e), t.source?.postMessage(_.error(e.id, "Invalid ISSUE message format"));
      return;
    }
    if (!this.handler) {
      console.error("Wallet not initialized"), t.source?.postMessage(_.error(e.id, "Wallet not initialized"));
      return;
    }
    try {
      const r = await this.handler.handleIssue(e.params);
      if (r === void 0) {
        t.source?.postMessage(_.error(e.id, "Asset issuance not supported for readonly wallet"));
        return;
      }
      t.source?.postMessage(_.issueSuccess(e.id, r));
    } catch (r) {
      console.error("Error issuing asset:", r);
      const s = r instanceof Error ? r.message : "Unknown error occurred";
      t.source?.postMessage(_.error(e.id, s));
    }
  }
  async handleReissueMessage(t) {
    const e = t.data;
    if (!lt.isReissue(e)) {
      console.error("Invalid REISSUE message format", e), t.source?.postMessage(_.error(e.id, "Invalid REISSUE message format"));
      return;
    }
    if (!this.handler) {
      console.error("Wallet not initialized"), t.source?.postMessage(_.error(e.id, "Wallet not initialized"));
      return;
    }
    try {
      const r = await this.handler.handleReissue(e.params);
      if (r === void 0) {
        t.source?.postMessage(_.error(e.id, "Asset reissuance not supported for readonly wallet"));
        return;
      }
      t.source?.postMessage(_.reissueSuccess(e.id, r));
    } catch (r) {
      console.error("Error reissuing asset:", r);
      const s = r instanceof Error ? r.message : "Unknown error occurred";
      t.source?.postMessage(_.error(e.id, s));
    }
  }
  async handleBurnMessage(t) {
    const e = t.data;
    if (!lt.isBurn(e)) {
      console.error("Invalid BURN message format", e), t.source?.postMessage(_.error(e.id, "Invalid BURN message format"));
      return;
    }
    if (!this.handler) {
      console.error("Wallet not initialized"), t.source?.postMessage(_.error(e.id, "Wallet not initialized"));
      return;
    }
    try {
      const r = await this.handler.handleBurn(e.params);
      if (r === void 0) {
        t.source?.postMessage(_.error(e.id, "Asset burning not supported for readonly wallet"));
        return;
      }
      t.source?.postMessage(_.burnSuccess(e.id, r));
    } catch (r) {
      console.error("Error burning asset:", r);
      const s = r instanceof Error ? r.message : "Unknown error occurred";
      t.source?.postMessage(_.error(e.id, s));
    }
  }
  async handleSendMessage(t) {
    const e = t.data;
    if (!lt.isSend(e)) {
      console.error("Invalid SEND message format", e), t.source?.postMessage(_.error(e.id, "Invalid SEND message format"));
      return;
    }
    if (!this.handler) {
      console.error("Wallet not initialized"), t.source?.postMessage(_.error(e.id, "Wallet not initialized"));
      return;
    }
    try {
      const r = await this.handler.handleSend(...e.recipients);
      if (r === void 0) {
        t.source?.postMessage(_.error(e.id, "Asset sending not supported for readonly wallet"));
        return;
      }
      t.source?.postMessage(_.sendSuccess(e.id, r));
    } catch (r) {
      console.error("Error sending asset:", r);
      const s = r instanceof Error ? r.message : "Unknown error occurred";
      t.source?.postMessage(_.error(e.id, s));
    }
  }
  async handleGetAssetDetails(t) {
    const e = t.data;
    if (!lt.isGetAssetDetails(e)) {
      console.error("Invalid GET_ASSET_DETAILS message format", e), t.source?.postMessage(_.error(e.id, "Invalid GET_ASSET_DETAILS message format"));
      return;
    }
    if (!this.handler) {
      console.error("Wallet not initialized"), t.source?.postMessage(_.error(e.id, "Wallet not initialized"));
      return;
    }
    try {
      const r = await this.handler.handleGetAssetDetails(e.assetId);
      t.source?.postMessage(_.assetDetails(e.id, r));
    } catch (r) {
      console.error("Error getting asset details:", r);
      const s = r instanceof Error ? r.message : "Unknown error occurred";
      t.source?.postMessage(_.error(e.id, s));
    }
  }
}
var bu;
(function(n) {
  let t;
  (function(s) {
    s[s.UNROLL = 0] = "UNROLL", s[s.WAIT = 1] = "WAIT", s[s.DONE = 2] = "DONE";
  })(t = n.StepType || (n.StepType = {}));
  class e {
    constructor(i, o, a, c) {
      this.toUnroll = i, this.bumper = o, this.explorer = a, this.indexer = c;
    }
    static async create(i, o, a, c) {
      const { chain: u } = await c.getVtxoChain(i);
      return new e({ ...i, chain: u }, o, a, c);
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
        if (!(l.type === Ln.COMMITMENT || l.type === Ln.UNSPECIFIED))
          try {
            if (!(await this.explorer.getTxStatus(l.txid)).confirmed)
              return {
                type: t.WAIT,
                txid: l.txid,
                do: Zw(this.explorer, l.txid)
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
      const c = Je.fromPSBT(xt.decode(a.txs[0]));
      if (i.type === Ln.TREE) {
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
        do: Yw(this.bumper, this.explorer, c)
      };
    }
    /**
     * Iterate over the steps to be executed and execute them
     * @returns An async iterator over the executed steps
     */
    async *[Symbol.asyncIterator]() {
      let i;
      do {
        i !== void 0 && await qw(1e3);
        const o = await this.next();
        await o.do(), yield o, i = o.type;
      } while (i !== t.DONE);
    }
  }
  n.Session = e;
  async function r(s, i, o) {
    const a = await s.onchainProvider.getChainTip();
    let c = await s.getVtxos({ withUnrolled: !0 });
    if (c = c.filter((m) => i.includes(m.txid)), c.length === 0)
      throw new Error("No vtxos to complete unroll");
    const u = [];
    let l = 0n;
    const d = rt.create();
    for (const m of c) {
      if (!m.isUnrolled)
        throw new Error(`Vtxo ${m.txid}:${m.vout} is not fully unrolled, use unroll first`);
      const S = await s.onchainProvider.getTxStatus(m.txid);
      if (!S.confirmed)
        throw new Error(`tx ${m.txid} is not confirmed`);
      const I = Xw({ height: S.blockHeight, time: S.blockTime }, a, m);
      if (!I)
        throw new Error(`no available exit path found for vtxo ${m.txid}:${m.vout}`);
      const E = Xt.decode(m.tapTree).findLeaf(k.encode(I.script));
      if (!E)
        throw new Error(`spending leaf not found for vtxo ${m.txid}:${m.vout}`);
      l += BigInt(m.value), u.push({
        txid: m.txid,
        index: m.vout,
        tapLeafScript: [E],
        sequence: 4294967294,
        witnessUtxo: {
          amount: BigInt(m.value),
          script: Xt.decode(m.tapTree).pkScript
        },
        sighashType: bn.DEFAULT
      }), d.addTapscriptInput(64, E[1].length, pe.encode(E[0]).length);
    }
    const h = new Je({ version: 2 });
    for (const m of u)
      h.addInput(m);
    d.addOutputAddress(o, s.network);
    let p = await s.onchainProvider.getFeeRate();
    (!p || p < Xn.MIN_FEE_RATE) && (p = Xn.MIN_FEE_RATE);
    const y = d.vsize().fee(BigInt(p));
    if (y > l)
      throw new Error("fee amount is greater than the total amount");
    const f = l - y;
    if (f < BigInt(_y))
      throw new Error("send amount is less than dust amount");
    h.addOutputAddress(o, f);
    const g = await s.identity.sign(h);
    return g.finalize(), await s.onchainProvider.broadcastTransaction(g.hex), g.id;
  }
  n.completeUnroll = r;
})(bu || (bu = {}));
function qw(n) {
  return new Promise((t) => setTimeout(t, n));
}
function Yw(n, t, e) {
  return async () => {
    const [r, s] = await n.bumpP2A(e);
    await t.broadcastTransaction(r, s);
  };
}
function Zw(n, t) {
  return () => new Promise((e, r) => {
    const s = setInterval(async () => {
      try {
        (await n.getTxStatus(t)).confirmed && (clearInterval(s), e());
      } catch (i) {
        clearInterval(s), r(i);
      }
    }, 5e3);
  });
}
function Xw(n, t, e) {
  const r = Xt.decode(e.tapTree).exitPaths();
  for (const s of r)
    if (s.params.timelock.type === "blocks") {
      if (t.height >= n.height + Number(s.params.timelock.value))
        return s;
    } else if (t.time >= n.time + Number(s.params.timelock.value))
      return s;
}
const rd = new Gw();
rd.start().catch(console.error);
const sd = "arkade-cache-v1";
self.addEventListener("install", (n) => {
  n.waitUntil(caches.open(sd)), self.skipWaiting();
});
self.addEventListener("activate", (n) => {
  n.waitUntil(
    caches.keys().then((t) => Promise.all(
      t.map((e) => {
        if (e !== sd)
          return caches.delete(e);
      })
    ))
  ), self.clients.matchAll({
    includeUncontrolled: !0,
    type: "window"
  }).then((t) => {
    t.forEach((e) => {
      e.postMessage({ type: "RELOAD_PAGE" });
    });
  }), self.clients.claim();
});
self.addEventListener("message", (n) => {
  n.data && n.data.type === "RELOAD_WALLET" && n.waitUntil(rd.reload().catch(console.error));
});
