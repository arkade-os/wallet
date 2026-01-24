/*! noble-hashes - MIT License (c) 2022 Paul Miller (paulmillr.com) */
function lo(e) {
  return e instanceof Uint8Array || ArrayBuffer.isView(e) && e.constructor.name === "Uint8Array";
}
function Ve(e, t = "") {
  if (!Number.isSafeInteger(e) || e < 0) {
    const n = t && `"${t}" `;
    throw new Error(`${n}expected integer >= 0, got ${e}`);
  }
}
function q(e, t, n = "") {
  const r = lo(e), i = e?.length, s = t !== void 0;
  if (!r || s && i !== t) {
    const o = n && `"${n}" `, a = s ? ` of length ${t}` : "", c = r ? `length=${i}` : `type=${typeof e}`;
    throw new Error(o + "expected Uint8Array" + a + ", got " + c);
  }
  return e;
}
function qc(e) {
  if (typeof e != "function" || typeof e.create != "function")
    throw new Error("Hash must wrapped by utils.createHasher");
  Ve(e.outputLen), Ve(e.blockLen);
}
function qr(e, t = !0) {
  if (e.destroyed)
    throw new Error("Hash instance has been destroyed");
  if (t && e.finished)
    throw new Error("Hash#digest() has already been called");
}
function Uf(e, t) {
  q(e, void 0, "digestInto() output");
  const n = t.outputLen;
  if (e.length < n)
    throw new Error('"digestInto() output" expected to be of length >=' + n);
}
function Sn(...e) {
  for (let t = 0; t < e.length; t++)
    e[t].fill(0);
}
function Xi(e) {
  return new DataView(e.buffer, e.byteOffset, e.byteLength);
}
function ee(e, t) {
  return e << 32 - t | e >>> t;
}
function xr(e, t) {
  return e << t | e >>> 32 - t >>> 0;
}
const Yc = /* @ts-ignore */ typeof Uint8Array.from([]).toHex == "function" && typeof Uint8Array.fromHex == "function", Lf = /* @__PURE__ */ Array.from({ length: 256 }, (e, t) => t.toString(16).padStart(2, "0"));
function Oi(e) {
  if (q(e), Yc)
    return e.toHex();
  let t = "";
  for (let n = 0; n < e.length; n++)
    t += Lf[e[n]];
  return t;
}
const de = { _0: 48, _9: 57, A: 65, F: 70, a: 97, f: 102 };
function sa(e) {
  if (e >= de._0 && e <= de._9)
    return e - de._0;
  if (e >= de.A && e <= de.F)
    return e - (de.A - 10);
  if (e >= de.a && e <= de.f)
    return e - (de.a - 10);
}
function Yr(e) {
  if (typeof e != "string")
    throw new Error("hex string expected, got " + typeof e);
  if (Yc)
    return Uint8Array.fromHex(e);
  const t = e.length, n = t / 2;
  if (t % 2)
    throw new Error("hex string expected, got unpadded hex of length " + t);
  const r = new Uint8Array(n);
  for (let i = 0, s = 0; i < n; i++, s += 2) {
    const o = sa(e.charCodeAt(s)), a = sa(e.charCodeAt(s + 1));
    if (o === void 0 || a === void 0) {
      const c = e[s] + e[s + 1];
      throw new Error('hex string expected, got non-hex character "' + c + '" at index ' + s);
    }
    r[i] = o * 16 + a;
  }
  return r;
}
function Zt(...e) {
  let t = 0;
  for (let r = 0; r < e.length; r++) {
    const i = e[r];
    q(i), t += i.length;
  }
  const n = new Uint8Array(t);
  for (let r = 0, i = 0; r < e.length; r++) {
    const s = e[r];
    n.set(s, i), i += s.length;
  }
  return n;
}
function Zc(e, t = {}) {
  const n = (i, s) => e(s).update(i).digest(), r = e(void 0);
  return n.outputLen = r.outputLen, n.blockLen = r.blockLen, n.create = (i) => e(i), Object.assign(n, t), Object.freeze(n);
}
function pr(e = 32) {
  const t = typeof globalThis == "object" ? globalThis.crypto : null;
  if (typeof t?.getRandomValues != "function")
    throw new Error("crypto.getRandomValues must be defined");
  return t.getRandomValues(new Uint8Array(e));
}
const Cf = (e) => ({
  oid: Uint8Array.from([6, 9, 96, 134, 72, 1, 101, 3, 4, 2, e])
});
function Pf(e, t, n) {
  return e & t ^ ~e & n;
}
function _f(e, t, n) {
  return e & t ^ e & n ^ t & n;
}
let Xc = class {
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
    this.blockLen = t, this.outputLen = n, this.padOffset = r, this.isLE = i, this.buffer = new Uint8Array(t), this.view = Xi(this.buffer);
  }
  update(t) {
    qr(this), q(t);
    const { view: n, buffer: r, blockLen: i } = this, s = t.length;
    for (let o = 0; o < s; ) {
      const a = Math.min(i - this.pos, s - o);
      if (a === i) {
        const c = Xi(t);
        for (; i <= s - o; o += i)
          this.process(c, o);
        continue;
      }
      r.set(t.subarray(o, o + a), this.pos), this.pos += a, o += a, this.pos === i && (this.process(n, 0), this.pos = 0);
    }
    return this.length += t.length, this.roundClean(), this;
  }
  digestInto(t) {
    qr(this), Uf(t, this), this.finished = !0;
    const { buffer: n, view: r, blockLen: i, isLE: s } = this;
    let { pos: o } = this;
    n[o++] = 128, Sn(this.buffer.subarray(o)), this.padOffset > i - o && (this.process(r, 0), o = 0);
    for (let f = o; f < i; f++)
      n[f] = 0;
    r.setBigUint64(i - 8, BigInt(this.length * 8), s), this.process(r, 0);
    const a = Xi(t), c = this.outputLen;
    if (c % 4)
      throw new Error("_sha2: outputLen must be aligned to 32bit");
    const u = c / 4, l = this.get();
    if (u > l.length)
      throw new Error("_sha2: outputLen bigger than state");
    for (let f = 0; f < u; f++)
      a.setUint32(4 * f, l[f], s);
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
const Ie = /* @__PURE__ */ Uint32Array.from([
  1779033703,
  3144134277,
  1013904242,
  2773480762,
  1359893119,
  2600822924,
  528734635,
  1541459225
]), Df = /* @__PURE__ */ Uint32Array.from([
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
]), ke = /* @__PURE__ */ new Uint32Array(64);
let Vf = class extends Xc {
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
    for (let f = 0; f < 16; f++, n += 4)
      ke[f] = t.getUint32(n, !1);
    for (let f = 16; f < 64; f++) {
      const h = ke[f - 15], p = ke[f - 2], y = ee(h, 7) ^ ee(h, 18) ^ h >>> 3, d = ee(p, 17) ^ ee(p, 19) ^ p >>> 10;
      ke[f] = d + ke[f - 7] + y + ke[f - 16] | 0;
    }
    let { A: r, B: i, C: s, D: o, E: a, F: c, G: u, H: l } = this;
    for (let f = 0; f < 64; f++) {
      const h = ee(a, 6) ^ ee(a, 11) ^ ee(a, 25), p = l + h + Pf(a, c, u) + Df[f] + ke[f] | 0, d = (ee(r, 2) ^ ee(r, 13) ^ ee(r, 22)) + _f(r, i, s) | 0;
      l = u, u = c, c = a, a = o + p | 0, o = s, s = i, i = r, r = p + d | 0;
    }
    r = r + this.A | 0, i = i + this.B | 0, s = s + this.C | 0, o = o + this.D | 0, a = a + this.E | 0, c = c + this.F | 0, u = u + this.G | 0, l = l + this.H | 0, this.set(r, i, s, o, a, c, u, l);
  }
  roundClean() {
    Sn(ke);
  }
  destroy() {
    this.set(0, 0, 0, 0, 0, 0, 0, 0), Sn(this.buffer);
  }
}, Mf = class extends Vf {
  // We cannot use array here since array allows indexing by variable
  // which means optimizer/compiler cannot use registers.
  A = Ie[0] | 0;
  B = Ie[1] | 0;
  C = Ie[2] | 0;
  D = Ie[3] | 0;
  E = Ie[4] | 0;
  F = Ie[5] | 0;
  G = Ie[6] | 0;
  H = Ie[7] | 0;
  constructor() {
    super(32);
  }
};
const xt = /* @__PURE__ */ Zc(
  () => new Mf(),
  /* @__PURE__ */ Cf(1)
);
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const fo = /* @__PURE__ */ BigInt(0), As = /* @__PURE__ */ BigInt(1);
function Zr(e, t = "") {
  if (typeof e != "boolean") {
    const n = t && `"${t}" `;
    throw new Error(n + "expected boolean, got type=" + typeof e);
  }
  return e;
}
function Qc(e) {
  if (typeof e == "bigint") {
    if (!_r(e))
      throw new Error("positive bigint expected, got " + e);
  } else
    Ve(e);
  return e;
}
function Tr(e) {
  const t = Qc(e).toString(16);
  return t.length & 1 ? "0" + t : t;
}
function Jc(e) {
  if (typeof e != "string")
    throw new Error("hex string expected, got " + typeof e);
  return e === "" ? fo : BigInt("0x" + e);
}
function ve(e) {
  return Jc(Oi(e));
}
function tu(e) {
  return Jc(Oi(Hf(q(e)).reverse()));
}
function gr(e, t) {
  Ve(t), e = Qc(e);
  const n = Yr(e.toString(16).padStart(t * 2, "0"));
  if (n.length !== t)
    throw new Error("number too large");
  return n;
}
function eu(e, t) {
  return gr(e, t).reverse();
}
function sr(e, t) {
  if (e.length !== t.length)
    return !1;
  let n = 0;
  for (let r = 0; r < e.length; r++)
    n |= e[r] ^ t[r];
  return n === 0;
}
function Hf(e) {
  return Uint8Array.from(e);
}
function Ff(e) {
  return Uint8Array.from(e, (t, n) => {
    const r = t.charCodeAt(0);
    if (t.length !== 1 || r > 127)
      throw new Error(`string contains non-ASCII character "${e[n]}" with code ${r} at position ${n}`);
    return r;
  });
}
const _r = (e) => typeof e == "bigint" && fo <= e;
function Kf(e, t, n) {
  return _r(e) && _r(t) && _r(n) && t <= e && e < n;
}
function nu(e, t, n, r) {
  if (!Kf(t, n, r))
    throw new Error("expected valid " + e + ": " + n + " <= n < " + r + ", got " + t);
}
function zf(e) {
  let t;
  for (t = 0; e > fo; e >>= As, t += 1)
    ;
  return t;
}
const ho = (e) => (As << BigInt(e)) - As;
function jf(e, t, n) {
  if (Ve(e, "hashLen"), Ve(t, "qByteLen"), typeof n != "function")
    throw new Error("hmacFn must be a function");
  const r = (g) => new Uint8Array(g), i = Uint8Array.of(), s = Uint8Array.of(0), o = Uint8Array.of(1), a = 1e3;
  let c = r(e), u = r(e), l = 0;
  const f = () => {
    c.fill(1), u.fill(0), l = 0;
  }, h = (...g) => n(u, Zt(c, ...g)), p = (g = i) => {
    u = h(s, g), c = h(), g.length !== 0 && (u = h(o, g), c = h());
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
    return Zt(...m);
  };
  return (g, m) => {
    f(), p(g);
    let S;
    for (; !(S = m(y())); )
      p();
    return f(), S;
  };
}
function po(e, t = {}, n = {}) {
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
function oa(e) {
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
const Ot = /* @__PURE__ */ BigInt(0), St = /* @__PURE__ */ BigInt(1), tn = /* @__PURE__ */ BigInt(2), ru = /* @__PURE__ */ BigInt(3), iu = /* @__PURE__ */ BigInt(4), su = /* @__PURE__ */ BigInt(5), Wf = /* @__PURE__ */ BigInt(7), ou = /* @__PURE__ */ BigInt(8), Gf = /* @__PURE__ */ BigInt(9), au = /* @__PURE__ */ BigInt(16);
function Wt(e, t) {
  const n = e % t;
  return n >= Ot ? n : t + n;
}
function Ht(e, t, n) {
  let r = e;
  for (; t-- > Ot; )
    r *= r, r %= n;
  return r;
}
function aa(e, t) {
  if (e === Ot)
    throw new Error("invert: expected non-zero number");
  if (t <= Ot)
    throw new Error("invert: expected positive modulus, got " + t);
  let n = Wt(e, t), r = t, i = Ot, s = St;
  for (; n !== Ot; ) {
    const a = r / n, c = r % n, u = i - s * a;
    r = n, n = c, i = s, s = u;
  }
  if (r !== St)
    throw new Error("invert: does not exist");
  return Wt(i, t);
}
function go(e, t, n) {
  if (!e.eql(e.sqr(t), n))
    throw new Error("Cannot find square root");
}
function cu(e, t) {
  const n = (e.ORDER + St) / iu, r = e.pow(t, n);
  return go(e, r, t), r;
}
function qf(e, t) {
  const n = (e.ORDER - su) / ou, r = e.mul(t, tn), i = e.pow(r, n), s = e.mul(t, i), o = e.mul(e.mul(s, tn), i), a = e.mul(s, e.sub(o, e.ONE));
  return go(e, a, t), a;
}
function Yf(e) {
  const t = Bi(e), n = uu(e), r = n(t, t.neg(t.ONE)), i = n(t, r), s = n(t, t.neg(r)), o = (e + Wf) / au;
  return (a, c) => {
    let u = a.pow(c, o), l = a.mul(u, r);
    const f = a.mul(u, i), h = a.mul(u, s), p = a.eql(a.sqr(l), c), y = a.eql(a.sqr(f), c);
    u = a.cmov(u, l, p), l = a.cmov(h, f, y);
    const d = a.eql(a.sqr(l), c), g = a.cmov(u, l, d);
    return go(a, g, c), g;
  };
}
function uu(e) {
  if (e < ru)
    throw new Error("sqrt is not defined for small field");
  let t = e - St, n = 0;
  for (; t % tn === Ot; )
    t /= tn, n++;
  let r = tn;
  const i = Bi(e);
  for (; ca(i, r) === 1; )
    if (r++ > 1e3)
      throw new Error("Cannot find square root: probably non-prime P");
  if (n === 1)
    return cu;
  let s = i.pow(r, t);
  const o = (t + St) / tn;
  return function(c, u) {
    if (c.is0(u))
      return u;
    if (ca(c, u) !== 1)
      throw new Error("Cannot find square root");
    let l = n, f = c.mul(c.ONE, s), h = c.pow(u, t), p = c.pow(u, o);
    for (; !c.eql(h, c.ONE); ) {
      if (c.is0(h))
        return c.ZERO;
      let y = 1, d = c.sqr(h);
      for (; !c.eql(d, c.ONE); )
        if (y++, d = c.sqr(d), y === l)
          throw new Error("Cannot find square root");
      const g = St << BigInt(l - y - 1), m = c.pow(f, g);
      l = y, f = c.sqr(m), h = c.mul(h, f), p = c.mul(p, m);
    }
    return p;
  };
}
function Zf(e) {
  return e % iu === ru ? cu : e % ou === su ? qf : e % au === Gf ? Yf(e) : uu(e);
}
const Xf = [
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
function Qf(e) {
  const t = {
    ORDER: "bigint",
    BYTES: "number",
    BITS: "number"
  }, n = Xf.reduce((r, i) => (r[i] = "function", r), t);
  return po(e, n), e;
}
function Jf(e, t, n) {
  if (n < Ot)
    throw new Error("invalid exponent, negatives unsupported");
  if (n === Ot)
    return e.ONE;
  if (n === St)
    return t;
  let r = e.ONE, i = t;
  for (; n > Ot; )
    n & St && (r = e.mul(r, i)), i = e.sqr(i), n >>= St;
  return r;
}
function lu(e, t, n = !1) {
  const r = new Array(t.length).fill(n ? e.ZERO : void 0), i = t.reduce((o, a, c) => e.is0(a) ? o : (r[c] = o, e.mul(o, a)), e.ONE), s = e.inv(i);
  return t.reduceRight((o, a, c) => e.is0(a) ? o : (r[c] = e.mul(o, r[c]), e.mul(o, a)), s), r;
}
function ca(e, t) {
  const n = (e.ORDER - St) / tn, r = e.pow(t, n), i = e.eql(r, e.ONE), s = e.eql(r, e.ZERO), o = e.eql(r, e.neg(e.ONE));
  if (!i && !s && !o)
    throw new Error("invalid Legendre symbol result");
  return i ? 1 : s ? 0 : -1;
}
function td(e, t) {
  t !== void 0 && Ve(t);
  const n = t !== void 0 ? t : e.toString(2).length, r = Math.ceil(n / 8);
  return { nBitLength: n, nByteLength: r };
}
let ed = class {
  ORDER;
  BITS;
  BYTES;
  isLE;
  ZERO = Ot;
  ONE = St;
  _lengths;
  _sqrt;
  // cached sqrt
  _mod;
  constructor(t, n = {}) {
    if (t <= Ot)
      throw new Error("invalid field: expected ORDER > 0, got " + t);
    let r;
    this.isLE = !1, n != null && typeof n == "object" && (typeof n.BITS == "number" && (r = n.BITS), typeof n.sqrt == "function" && (this.sqrt = n.sqrt), typeof n.isLE == "boolean" && (this.isLE = n.isLE), n.allowedLengths && (this._lengths = n.allowedLengths?.slice()), typeof n.modFromBytes == "boolean" && (this._mod = n.modFromBytes));
    const { nBitLength: i, nByteLength: s } = td(t, r);
    if (s > 2048)
      throw new Error("invalid field: expected ORDER of <= 2048 bytes");
    this.ORDER = t, this.BITS = i, this.BYTES = s, this._sqrt = void 0, Object.preventExtensions(this);
  }
  create(t) {
    return Wt(t, this.ORDER);
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
    return (t & St) === St;
  }
  neg(t) {
    return Wt(-t, this.ORDER);
  }
  eql(t, n) {
    return t === n;
  }
  sqr(t) {
    return Wt(t * t, this.ORDER);
  }
  add(t, n) {
    return Wt(t + n, this.ORDER);
  }
  sub(t, n) {
    return Wt(t - n, this.ORDER);
  }
  mul(t, n) {
    return Wt(t * n, this.ORDER);
  }
  pow(t, n) {
    return Jf(this, t, n);
  }
  div(t, n) {
    return Wt(t * aa(n, this.ORDER), this.ORDER);
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
    return aa(t, this.ORDER);
  }
  sqrt(t) {
    return this._sqrt || (this._sqrt = Zf(this.ORDER)), this._sqrt(this, t);
  }
  toBytes(t) {
    return this.isLE ? eu(t, this.BYTES) : gr(t, this.BYTES);
  }
  fromBytes(t, n = !1) {
    q(t);
    const { _lengths: r, BYTES: i, isLE: s, ORDER: o, _mod: a } = this;
    if (r) {
      if (!r.includes(t.length) || t.length > i)
        throw new Error("Field.fromBytes: expected " + r + " bytes, got " + t.length);
      const u = new Uint8Array(i);
      u.set(t, s ? 0 : u.length - t.length), t = u;
    }
    if (t.length !== i)
      throw new Error("Field.fromBytes: expected " + i + " bytes, got " + t.length);
    let c = s ? tu(t) : ve(t);
    if (a && (c = Wt(c, o)), !n && !this.isValid(c))
      throw new Error("invalid field element: outside of range 0..ORDER");
    return c;
  }
  // TODO: we don't need it here, move out to separate fn
  invertBatch(t) {
    return lu(this, t);
  }
  // We can't move this out because Fp6, Fp12 implement it
  // and it's unclear what to return in there.
  cmov(t, n, r) {
    return r ? n : t;
  }
};
function Bi(e, t = {}) {
  return new ed(e, t);
}
function fu(e) {
  if (typeof e != "bigint")
    throw new Error("field order must be bigint");
  const t = e.toString(2).length;
  return Math.ceil(t / 8);
}
function du(e) {
  const t = fu(e);
  return t + Math.ceil(t / 2);
}
function hu(e, t, n = !1) {
  q(e);
  const r = e.length, i = fu(t), s = du(t);
  if (r < 16 || r < s || r > 1024)
    throw new Error("expected " + s + "-1024 bytes of input, got " + r);
  const o = n ? tu(e) : ve(e), a = Wt(o, t - St) + St;
  return n ? eu(a, i) : gr(a, i);
}
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const vn = /* @__PURE__ */ BigInt(0), en = /* @__PURE__ */ BigInt(1);
function Xr(e, t) {
  const n = t.negate();
  return e ? n : t;
}
function ua(e, t) {
  const n = lu(e.Fp, t.map((r) => r.Z));
  return t.map((r, i) => e.fromAffine(r.toAffine(n[i])));
}
function pu(e, t) {
  if (!Number.isSafeInteger(e) || e <= 0 || e > t)
    throw new Error("invalid window size, expected [1.." + t + "], got W=" + e);
}
function Qi(e, t) {
  pu(e, t);
  const n = Math.ceil(t / e) + 1, r = 2 ** (e - 1), i = 2 ** e, s = ho(e), o = BigInt(e);
  return { windows: n, windowSize: r, mask: s, maxNumber: i, shiftBy: o };
}
function la(e, t, n) {
  const { windowSize: r, mask: i, maxNumber: s, shiftBy: o } = n;
  let a = Number(e & i), c = e >> o;
  a > r && (a -= s, c += en);
  const u = t * r, l = u + Math.abs(a) - 1, f = a === 0, h = a < 0, p = t % 2 !== 0;
  return { nextN: c, offset: l, isZero: f, isNeg: h, isNegF: p, offsetF: u };
}
const Ji = /* @__PURE__ */ new WeakMap(), gu = /* @__PURE__ */ new WeakMap();
function ts(e) {
  return gu.get(e) || 1;
}
function fa(e) {
  if (e !== vn)
    throw new Error("invalid wNAF");
}
let nd = class {
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
    for (; n > vn; )
      n & en && (r = r.add(i)), i = i.double(), n >>= en;
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
    const { windows: r, windowSize: i } = Qi(n, this.bits), s = [];
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
    const o = Qi(t, this.bits);
    for (let a = 0; a < o.windows; a++) {
      const { nextN: c, offset: u, isZero: l, isNeg: f, isNegF: h, offsetF: p } = la(r, a, o);
      r = c, l ? s = s.add(Xr(h, n[p])) : i = i.add(Xr(f, n[u]));
    }
    return fa(r), { p: i, f: s };
  }
  /**
   * Implements ec unsafe (non const-time) multiplication using precomputed tables and w-ary non-adjacent form.
   * @param acc accumulator point to add result of multiplication
   * @returns point
   */
  wNAFUnsafe(t, n, r, i = this.ZERO) {
    const s = Qi(t, this.bits);
    for (let o = 0; o < s.windows && r !== vn; o++) {
      const { nextN: a, offset: c, isZero: u, isNeg: l } = la(r, o, s);
      if (r = a, !u) {
        const f = n[c];
        i = i.add(l ? f.negate() : f);
      }
    }
    return fa(r), i;
  }
  getPrecomputes(t, n, r) {
    let i = Ji.get(n);
    return i || (i = this.precomputeWindow(n, t), t !== 1 && (typeof r == "function" && (i = r(i)), Ji.set(n, i))), i;
  }
  cached(t, n, r) {
    const i = ts(t);
    return this.wNAF(i, this.getPrecomputes(i, t, r), n);
  }
  unsafe(t, n, r, i) {
    const s = ts(t);
    return s === 1 ? this._unsafeLadder(t, n, i) : this.wNAFUnsafe(s, this.getPrecomputes(s, t, r), n, i);
  }
  // We calculate precomputes for elliptic curve point multiplication
  // using windowed method. This specifies window size and
  // stores precomputed values. Usually only base point would be precomputed.
  createCache(t, n) {
    pu(n, this.bits), gu.set(t, n), Ji.delete(t);
  }
  hasCache(t) {
    return ts(t) !== 1;
  }
};
function rd(e, t, n, r) {
  let i = t, s = e.ZERO, o = e.ZERO;
  for (; n > vn || r > vn; )
    n & en && (s = s.add(i)), r & en && (o = o.add(i)), i = i.double(), n >>= en, r >>= en;
  return { p1: s, p2: o };
}
function da(e, t, n) {
  if (t) {
    if (t.ORDER !== e)
      throw new Error("Field.ORDER must match order: Fp == p, Fn == n");
    return Qf(t), t;
  } else
    return Bi(e, { isLE: n });
}
function id(e, t, n = {}, r) {
  if (r === void 0 && (r = e === "edwards"), !t || typeof t != "object")
    throw new Error(`expected valid ${e} CURVE object`);
  for (const c of ["p", "n", "h"]) {
    const u = t[c];
    if (!(typeof u == "bigint" && u > vn))
      throw new Error(`CURVE.${c} must be positive bigint`);
  }
  const i = da(t.p, n.Fp, r), s = da(t.n, n.Fn, r), a = ["Gx", "Gy", "a", "b"];
  for (const c of a)
    if (!i.isValid(t[c]))
      throw new Error(`CURVE.${c} must be valid field element of CURVE.Fp`);
  return t = Object.freeze(Object.assign({}, t)), { CURVE: t, Fp: i, Fn: s };
}
function yu(e, t) {
  return function(r) {
    const i = e(r);
    return { secretKey: i, publicKey: t(i) };
  };
}
let wu = class {
  oHash;
  iHash;
  blockLen;
  outputLen;
  finished = !1;
  destroyed = !1;
  constructor(t, n) {
    if (qc(t), q(n, void 0, "key"), this.iHash = t.create(), typeof this.iHash.update != "function")
      throw new Error("Expected instance of class which extends utils.Hash");
    this.blockLen = this.iHash.blockLen, this.outputLen = this.iHash.outputLen;
    const r = this.blockLen, i = new Uint8Array(r);
    i.set(n.length > r ? t.create().update(n).digest() : n);
    for (let s = 0; s < i.length; s++)
      i[s] ^= 54;
    this.iHash.update(i), this.oHash = t.create();
    for (let s = 0; s < i.length; s++)
      i[s] ^= 106;
    this.oHash.update(i), Sn(i);
  }
  update(t) {
    return qr(this), this.iHash.update(t), this;
  }
  digestInto(t) {
    qr(this), q(t, this.outputLen, "output"), this.finished = !0, this.iHash.digestInto(t), this.oHash.update(t), this.oHash.digestInto(t), this.destroy();
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
const mu = (e, t, n) => new wu(e, t).update(n).digest();
mu.create = (e, t) => new wu(e, t);
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const ha = (e, t) => (e + (e >= 0 ? t : -t) / bu) / t;
function sd(e, t, n) {
  const [[r, i], [s, o]] = t, a = ha(o * e, n), c = ha(-i * e, n);
  let u = e - a * r - c * s, l = -a * i - c * o;
  const f = u < me, h = l < me;
  f && (u = -u), h && (l = -l);
  const p = ho(Math.ceil(zf(n) / 2)) + wn;
  if (u < me || u >= p || l < me || l >= p)
    throw new Error("splitScalar (endomorphism): failed, k=" + e);
  return { k1neg: f, k1: u, k2neg: h, k2: l };
}
function Is(e) {
  if (!["compact", "recovered", "der"].includes(e))
    throw new Error('Signature format must be "compact", "recovered", or "der"');
  return e;
}
function es(e, t) {
  const n = {};
  for (let r of Object.keys(t))
    n[r] = e[r] === void 0 ? t[r] : e[r];
  return Zr(n.lowS, "lowS"), Zr(n.prehash, "prehash"), n.format !== void 0 && Is(n.format), n;
}
let od = class extends Error {
  constructor(t = "") {
    super(t);
  }
};
const Ne = {
  // asn.1 DER encoding utils
  Err: od,
  // Basic building block is TLV (Tag-Length-Value)
  _tlv: {
    encode: (e, t) => {
      const { Err: n } = Ne;
      if (e < 0 || e > 256)
        throw new n("tlv.encode: wrong tag");
      if (t.length & 1)
        throw new n("tlv.encode: unpadded data");
      const r = t.length / 2, i = Tr(r);
      if (i.length / 2 & 128)
        throw new n("tlv.encode: long form length too big");
      const s = r > 127 ? Tr(i.length / 2 | 128) : "";
      return Tr(e) + s + i + t;
    },
    // v - value, l - left bytes (unparsed)
    decode(e, t) {
      const { Err: n } = Ne;
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
      const { Err: t } = Ne;
      if (e < me)
        throw new t("integer: negative integers are not allowed");
      let n = Tr(e);
      if (Number.parseInt(n[0], 16) & 8 && (n = "00" + n), n.length & 1)
        throw new t("unexpected DER parsing assertion: unpadded hex");
      return n;
    },
    decode(e) {
      const { Err: t } = Ne;
      if (e[0] & 128)
        throw new t("invalid signature integer: negative");
      if (e[0] === 0 && !(e[1] & 128))
        throw new t("invalid signature integer: unnecessary leading zero");
      return ve(e);
    }
  },
  toSig(e) {
    const { Err: t, _int: n, _tlv: r } = Ne, i = q(e, void 0, "signature"), { v: s, l: o } = r.decode(48, i);
    if (o.length)
      throw new t("invalid signature: left bytes after parsing");
    const { v: a, l: c } = r.decode(2, s), { v: u, l } = r.decode(2, c);
    if (l.length)
      throw new t("invalid signature: left bytes after parsing");
    return { r: n.decode(a), s: n.decode(u) };
  },
  hexFromSig(e) {
    const { _tlv: t, _int: n } = Ne, r = t.encode(2, n.encode(e.r)), i = t.encode(2, n.encode(e.s)), s = r + i;
    return t.encode(48, s);
  }
}, me = BigInt(0), wn = BigInt(1), bu = BigInt(2), Sr = BigInt(3), ad = BigInt(4);
function cd(e, t = {}) {
  const n = id("weierstrass", e, t), { Fp: r, Fn: i } = n;
  let s = n.CURVE;
  const { h: o, n: a } = s;
  po(t, {}, {
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
  const u = xu(r, i);
  function l() {
    if (!r.isOdd)
      throw new Error("compression is not supported: Field does not have .isOdd()");
  }
  function f(_, E, b) {
    const { x: w, y: T } = E.toAffine(), A = r.toBytes(w);
    if (Zr(b, "isCompressed"), b) {
      l();
      const B = !r.isOdd(T);
      return Zt(Eu(B), A);
    } else
      return Zt(Uint8Array.of(4), A, r.toBytes(T));
  }
  function h(_) {
    q(_, void 0, "Point");
    const { publicKey: E, publicKeyUncompressed: b } = u, w = _.length, T = _[0], A = _.subarray(1);
    if (w === E && (T === 2 || T === 3)) {
      const B = r.fromBytes(A);
      if (!r.isValid(B))
        throw new Error("bad point: is not on curve, wrong x");
      const k = d(B);
      let v;
      try {
        v = r.sqrt(k);
      } catch (W) {
        const H = W instanceof Error ? ": " + W.message : "";
        throw new Error("bad point: is not on curve, sqrt error" + H);
      }
      l();
      const N = r.isOdd(v);
      return (T & 1) === 1 !== N && (v = r.neg(v)), { x: B, y: v };
    } else if (w === b && T === 4) {
      const B = r.BYTES, k = r.fromBytes(A.subarray(0, B)), v = r.fromBytes(A.subarray(B, B * 2));
      if (!g(k, v))
        throw new Error("bad point: is not on curve");
      return { x: k, y: v };
    } else
      throw new Error(`bad point: got length ${w}, expected compressed=${E} or uncompressed=${b}`);
  }
  const p = t.toBytes || f, y = t.fromBytes || h;
  function d(_) {
    const E = r.sqr(_), b = r.mul(E, _);
    return r.add(r.add(b, r.mul(_, s.a)), s.b);
  }
  function g(_, E) {
    const b = r.sqr(E), w = d(_);
    return r.eql(b, w);
  }
  if (!g(s.Gx, s.Gy))
    throw new Error("bad curve params: generator point");
  const m = r.mul(r.pow(s.a, Sr), ad), S = r.mul(r.sqr(s.b), BigInt(27));
  if (r.is0(r.add(m, S)))
    throw new Error("bad curve params: a or b");
  function I(_, E, b = !1) {
    if (!r.isValid(E) || b && r.is0(E))
      throw new Error(`bad point coordinate ${_}`);
    return E;
  }
  function L(_) {
    if (!(_ instanceof C))
      throw new Error("Weierstrass Point expected");
  }
  function R(_) {
    if (!c || !c.basises)
      throw new Error("no endo");
    return sd(_, c.basises, i.ORDER);
  }
  const V = oa((_, E) => {
    const { X: b, Y: w, Z: T } = _;
    if (r.eql(T, r.ONE))
      return { x: b, y: w };
    const A = _.is0();
    E == null && (E = A ? r.ONE : r.inv(T));
    const B = r.mul(b, E), k = r.mul(w, E), v = r.mul(T, E);
    if (A)
      return { x: r.ZERO, y: r.ZERO };
    if (!r.eql(v, r.ONE))
      throw new Error("invZ was invalid");
    return { x: B, y: k };
  }), x = oa((_) => {
    if (_.is0()) {
      if (t.allowInfinityPoint && !r.is0(_.Y))
        return;
      throw new Error("bad point: ZERO");
    }
    const { x: E, y: b } = _.toAffine();
    if (!r.isValid(E) || !r.isValid(b))
      throw new Error("bad point: x or y not field elements");
    if (!g(E, b))
      throw new Error("bad point: equation left != right");
    if (!_.isTorsionFree())
      throw new Error("bad point: not in prime-order subgroup");
    return !0;
  });
  function Q(_, E, b, w, T) {
    return b = new C(r.mul(b.X, _), b.Y, b.Z), E = Xr(w, E), b = Xr(T, b), E.add(b);
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
    static Fn = i;
    X;
    Y;
    Z;
    /** Does NOT validate if the point is valid. Use `.assertValidity()`. */
    constructor(E, b, w) {
      this.X = I("x", E), this.Y = I("y", b, !0), this.Z = I("z", w), Object.freeze(this);
    }
    static CURVE() {
      return s;
    }
    /** Does NOT validate if the point is valid. Use `.assertValidity()`. */
    static fromAffine(E) {
      const { x: b, y: w } = E || {};
      if (!E || !r.isValid(b) || !r.isValid(w))
        throw new Error("invalid affine point");
      if (E instanceof C)
        throw new Error("projective point not allowed");
      return r.is0(b) && r.is0(w) ? C.ZERO : new C(b, w, r.ONE);
    }
    static fromBytes(E) {
      const b = C.fromAffine(y(q(E, void 0, "point")));
      return b.assertValidity(), b;
    }
    static fromHex(E) {
      return C.fromBytes(Yr(E));
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
    precompute(E = 8, b = !0) {
      return at.createCache(this, E), b || this.multiply(Sr), this;
    }
    // TODO: return `this`
    /** A point on curve is valid if it conforms to equation. */
    assertValidity() {
      x(this);
    }
    hasEvenY() {
      const { y: E } = this.toAffine();
      if (!r.isOdd)
        throw new Error("Field doesn't support isOdd");
      return !r.isOdd(E);
    }
    /** Compare one point to another. */
    equals(E) {
      L(E);
      const { X: b, Y: w, Z: T } = this, { X: A, Y: B, Z: k } = E, v = r.eql(r.mul(b, k), r.mul(A, T)), N = r.eql(r.mul(w, k), r.mul(B, T));
      return v && N;
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
      const { a: E, b } = s, w = r.mul(b, Sr), { X: T, Y: A, Z: B } = this;
      let k = r.ZERO, v = r.ZERO, N = r.ZERO, U = r.mul(T, T), W = r.mul(A, A), H = r.mul(B, B), P = r.mul(T, A);
      return P = r.add(P, P), N = r.mul(T, B), N = r.add(N, N), k = r.mul(E, N), v = r.mul(w, H), v = r.add(k, v), k = r.sub(W, v), v = r.add(W, v), v = r.mul(k, v), k = r.mul(P, k), N = r.mul(w, N), H = r.mul(E, H), P = r.sub(U, H), P = r.mul(E, P), P = r.add(P, N), N = r.add(U, U), U = r.add(N, U), U = r.add(U, H), U = r.mul(U, P), v = r.add(v, U), H = r.mul(A, B), H = r.add(H, H), U = r.mul(H, P), k = r.sub(k, U), N = r.mul(H, W), N = r.add(N, N), N = r.add(N, N), new C(k, v, N);
    }
    // Renes-Costello-Batina exception-free addition formula.
    // There is 30% faster Jacobian formula, but it is not complete.
    // https://eprint.iacr.org/2015/1060, algorithm 1
    // Cost: 12M + 0S + 3*a + 3*b3 + 23add.
    add(E) {
      L(E);
      const { X: b, Y: w, Z: T } = this, { X: A, Y: B, Z: k } = E;
      let v = r.ZERO, N = r.ZERO, U = r.ZERO;
      const W = s.a, H = r.mul(s.b, Sr);
      let P = r.mul(b, A), K = r.mul(w, B), Y = r.mul(T, k), ut = r.add(b, w), z = r.add(A, B);
      ut = r.mul(ut, z), z = r.add(P, K), ut = r.sub(ut, z), z = r.add(b, T);
      let X = r.add(A, k);
      return z = r.mul(z, X), X = r.add(P, Y), z = r.sub(z, X), X = r.add(w, T), v = r.add(B, k), X = r.mul(X, v), v = r.add(K, Y), X = r.sub(X, v), U = r.mul(W, z), v = r.mul(H, Y), U = r.add(v, U), v = r.sub(K, U), U = r.add(K, U), N = r.mul(v, U), K = r.add(P, P), K = r.add(K, P), Y = r.mul(W, Y), z = r.mul(H, z), K = r.add(K, Y), Y = r.sub(P, Y), Y = r.mul(W, Y), z = r.add(z, Y), P = r.mul(K, z), N = r.add(N, P), P = r.mul(X, z), v = r.mul(ut, v), v = r.sub(v, P), P = r.mul(ut, K), U = r.mul(X, U), U = r.add(U, P), new C(v, N, U);
    }
    subtract(E) {
      return this.add(E.negate());
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
    multiply(E) {
      const { endo: b } = t;
      if (!i.isValidNot0(E))
        throw new Error("invalid scalar: out of range");
      let w, T;
      const A = (B) => at.cached(this, B, (k) => ua(C, k));
      if (b) {
        const { k1neg: B, k1: k, k2neg: v, k2: N } = R(E), { p: U, f: W } = A(k), { p: H, f: P } = A(N);
        T = W.add(P), w = Q(b.beta, U, H, B, v);
      } else {
        const { p: B, f: k } = A(E);
        w = B, T = k;
      }
      return ua(C, [w, T])[0];
    }
    /**
     * Non-constant-time multiplication. Uses double-and-add algorithm.
     * It's faster, but should only be used when you don't care about
     * an exposed secret key e.g. sig verification, which works over *public* keys.
     */
    multiplyUnsafe(E) {
      const { endo: b } = t, w = this;
      if (!i.isValid(E))
        throw new Error("invalid scalar: out of range");
      if (E === me || w.is0())
        return C.ZERO;
      if (E === wn)
        return w;
      if (at.hasCache(this))
        return this.multiply(E);
      if (b) {
        const { k1neg: T, k1: A, k2neg: B, k2: k } = R(E), { p1: v, p2: N } = rd(C, w, A, k);
        return Q(b.beta, v, N, T, B);
      } else
        return at.unsafe(w, E);
    }
    /**
     * Converts Projective point to affine (x, y) coordinates.
     * @param invertedZ Z^-1 (inverted zero) - optional, precomputation is useful for invertBatch
     */
    toAffine(E) {
      return V(this, E);
    }
    /**
     * Checks whether Point is free of torsion elements (is in prime subgroup).
     * Always torsion-free for cofactor=1 curves.
     */
    isTorsionFree() {
      const { isTorsionFree: E } = t;
      return o === wn ? !0 : E ? E(C, this) : at.unsafe(this, a).is0();
    }
    clearCofactor() {
      const { clearCofactor: E } = t;
      return o === wn ? this : E ? E(C, this) : this.multiplyUnsafe(o);
    }
    isSmallOrder() {
      return this.multiplyUnsafe(o).is0();
    }
    toBytes(E = !0) {
      return Zr(E, "isCompressed"), this.assertValidity(), p(C, this, E);
    }
    toHex(E = !0) {
      return Oi(this.toBytes(E));
    }
    toString() {
      return `<Point ${this.is0() ? "ZERO" : this.toHex()}>`;
    }
  }
  const J = i.BITS, at = new nd(C, t.endo ? Math.ceil(J / 2) : J);
  return C.BASE.precompute(8), C;
}
function Eu(e) {
  return Uint8Array.of(e ? 2 : 3);
}
function xu(e, t) {
  return {
    secretKey: t.BYTES,
    publicKey: 1 + e.BYTES,
    publicKeyUncompressed: 1 + 2 * e.BYTES,
    publicKeyHasPrefix: !0,
    signature: 2 * t.BYTES
  };
}
function ud(e, t = {}) {
  const { Fn: n } = e, r = t.randomBytes || pr, i = Object.assign(xu(e.Fp, n), { seed: du(n.ORDER) });
  function s(p) {
    try {
      const y = n.fromBytes(p);
      return n.isValidNot0(y);
    } catch {
      return !1;
    }
  }
  function o(p, y) {
    const { publicKey: d, publicKeyUncompressed: g } = i;
    try {
      const m = p.length;
      return y === !0 && m !== d || y === !1 && m !== g ? !1 : !!e.fromBytes(p);
    } catch {
      return !1;
    }
  }
  function a(p = r(i.seed)) {
    return hu(q(p, i.seed, "seed"), n.ORDER);
  }
  function c(p, y = !0) {
    return e.BASE.multiply(n.fromBytes(p)).toBytes(y);
  }
  function u(p) {
    const { secretKey: y, publicKey: d, publicKeyUncompressed: g } = i;
    if (!lo(p) || "_lengths" in n && n._lengths || y === d)
      return;
    const m = q(p, void 0, "key").length;
    return m === d || m === g;
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
    isValidSecretKey: s,
    isValidPublicKey: o,
    randomSecretKey: a
  }, h = yu(a, c);
  return Object.freeze({ getPublicKey: c, getSharedSecret: l, keygen: h, Point: e, utils: f, lengths: i });
}
function ld(e, t, n = {}) {
  qc(t), po(n, {}, {
    hmac: "function",
    lowS: "boolean",
    randomBytes: "function",
    bits2int: "function",
    bits2int_modN: "function"
  }), n = Object.assign({}, n);
  const r = n.randomBytes || pr, i = n.hmac || ((b, w) => mu(t, b, w)), { Fp: s, Fn: o } = e, { ORDER: a, BITS: c } = o, { keygen: u, getPublicKey: l, getSharedSecret: f, utils: h, lengths: p } = ud(e, n), y = {
    prehash: !0,
    lowS: typeof n.lowS == "boolean" ? n.lowS : !0,
    format: "compact",
    extraEntropy: !1
  }, d = a * bu < s.ORDER;
  function g(b) {
    const w = a >> wn;
    return b > w;
  }
  function m(b, w) {
    if (!o.isValidNot0(w))
      throw new Error(`invalid signature ${b}: out of range 1..Point.Fn.ORDER`);
    return w;
  }
  function S() {
    if (d)
      throw new Error('"recovered" sig type is not supported for cofactor >2 curves');
  }
  function I(b, w) {
    Is(w);
    const T = p.signature, A = w === "compact" ? T : w === "recovered" ? T + 1 : void 0;
    return q(b, A);
  }
  class L {
    r;
    s;
    recovery;
    constructor(w, T, A) {
      if (this.r = m("r", w), this.s = m("s", T), A != null) {
        if (S(), ![0, 1, 2, 3].includes(A))
          throw new Error("invalid recovery id");
        this.recovery = A;
      }
      Object.freeze(this);
    }
    static fromBytes(w, T = y.format) {
      I(w, T);
      let A;
      if (T === "der") {
        const { r: N, s: U } = Ne.toSig(q(w));
        return new L(N, U);
      }
      T === "recovered" && (A = w[0], T = "compact", w = w.subarray(1));
      const B = p.signature / 2, k = w.subarray(0, B), v = w.subarray(B, B * 2);
      return new L(o.fromBytes(k), o.fromBytes(v), A);
    }
    static fromHex(w, T) {
      return this.fromBytes(Yr(w), T);
    }
    assertRecovery() {
      const { recovery: w } = this;
      if (w == null)
        throw new Error("invalid recovery id: must be present");
      return w;
    }
    addRecoveryBit(w) {
      return new L(this.r, this.s, w);
    }
    recoverPublicKey(w) {
      const { r: T, s: A } = this, B = this.assertRecovery(), k = B === 2 || B === 3 ? T + a : T;
      if (!s.isValid(k))
        throw new Error("invalid recovery id: sig.r+curve.n != R.x");
      const v = s.toBytes(k), N = e.fromBytes(Zt(Eu((B & 1) === 0), v)), U = o.inv(k), W = V(q(w, void 0, "msgHash")), H = o.create(-W * U), P = o.create(A * U), K = e.BASE.multiplyUnsafe(H).add(N.multiplyUnsafe(P));
      if (K.is0())
        throw new Error("invalid recovery: point at infinify");
      return K.assertValidity(), K;
    }
    // Signatures should be low-s, to prevent malleability.
    hasHighS() {
      return g(this.s);
    }
    toBytes(w = y.format) {
      if (Is(w), w === "der")
        return Yr(Ne.hexFromSig(this));
      const { r: T, s: A } = this, B = o.toBytes(T), k = o.toBytes(A);
      return w === "recovered" ? (S(), Zt(Uint8Array.of(this.assertRecovery()), B, k)) : Zt(B, k);
    }
    toHex(w) {
      return Oi(this.toBytes(w));
    }
  }
  const R = n.bits2int || function(w) {
    if (w.length > 8192)
      throw new Error("input is too large");
    const T = ve(w), A = w.length * 8 - c;
    return A > 0 ? T >> BigInt(A) : T;
  }, V = n.bits2int_modN || function(w) {
    return o.create(R(w));
  }, x = ho(c);
  function Q(b) {
    return nu("num < 2^" + c, b, me, x), o.toBytes(b);
  }
  function C(b, w) {
    return q(b, void 0, "message"), w ? q(t(b), void 0, "prehashed message") : b;
  }
  function J(b, w, T) {
    const { lowS: A, prehash: B, extraEntropy: k } = es(T, y);
    b = C(b, B);
    const v = V(b), N = o.fromBytes(w);
    if (!o.isValidNot0(N))
      throw new Error("invalid private key");
    const U = [Q(N), Q(v)];
    if (k != null && k !== !1) {
      const K = k === !0 ? r(p.secretKey) : k;
      U.push(q(K, void 0, "extraEntropy"));
    }
    const W = Zt(...U), H = v;
    function P(K) {
      const Y = R(K);
      if (!o.isValidNot0(Y))
        return;
      const ut = o.inv(Y), z = e.BASE.multiply(Y).toAffine(), X = o.create(z.x);
      if (X === me)
        return;
      const fe = o.create(ut * o.create(H + X * N));
      if (fe === me)
        return;
      let Hn = (z.x === X ? 0 : 2) | Number(z.y & wn), Fn = fe;
      return A && g(fe) && (Fn = o.neg(fe), Hn ^= 1), new L(X, Fn, d ? void 0 : Hn);
    }
    return { seed: W, k2sig: P };
  }
  function at(b, w, T = {}) {
    const { seed: A, k2sig: B } = J(b, w, T);
    return jf(t.outputLen, o.BYTES, i)(A, B).toBytes(T.format);
  }
  function _(b, w, T, A = {}) {
    const { lowS: B, prehash: k, format: v } = es(A, y);
    if (T = q(T, void 0, "publicKey"), w = C(w, k), !lo(b)) {
      const N = b instanceof L ? ", use sig.toBytes()" : "";
      throw new Error("verify expects Uint8Array signature" + N);
    }
    I(b, v);
    try {
      const N = L.fromBytes(b, v), U = e.fromBytes(T);
      if (B && N.hasHighS())
        return !1;
      const { r: W, s: H } = N, P = V(w), K = o.inv(H), Y = o.create(P * K), ut = o.create(W * K), z = e.BASE.multiplyUnsafe(Y).add(U.multiplyUnsafe(ut));
      return z.is0() ? !1 : o.create(z.x) === W;
    } catch {
      return !1;
    }
  }
  function E(b, w, T = {}) {
    const { prehash: A } = es(T, y);
    return w = C(w, A), L.fromBytes(b, "recovered").recoverPublicKey(w).toBytes();
  }
  return Object.freeze({
    keygen: u,
    getPublicKey: l,
    getSharedSecret: f,
    utils: h,
    lengths: p,
    Point: e,
    sign: at,
    verify: _,
    recoverPublicKey: E,
    Signature: L,
    hash: t
  });
}
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const $i = {
  p: BigInt("0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffefffffc2f"),
  n: BigInt("0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141"),
  h: BigInt(1),
  a: BigInt(0),
  b: BigInt(7),
  Gx: BigInt("0x79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798"),
  Gy: BigInt("0x483ada7726a3c4655da4fbfc0e1108a8fd17b448a68554199c47d08ffb10d4b8")
}, fd = {
  beta: BigInt("0x7ae96a2b657c07106e64479eac3434e99cf0497512f58995c1396c28719501ee"),
  basises: [
    [BigInt("0x3086d221a7d46bcde86c90e49284eb15"), -BigInt("0xe4437ed6010e88286f547fa90abfe4c3")],
    [BigInt("0x114ca50f7a8e2f3f657c1108d9d44cfd8"), BigInt("0x3086d221a7d46bcde86c90e49284eb15")]
  ]
}, dd = /* @__PURE__ */ BigInt(0), ks = /* @__PURE__ */ BigInt(2);
function hd(e) {
  const t = $i.p, n = BigInt(3), r = BigInt(6), i = BigInt(11), s = BigInt(22), o = BigInt(23), a = BigInt(44), c = BigInt(88), u = e * e * e % t, l = u * u * e % t, f = Ht(l, n, t) * l % t, h = Ht(f, n, t) * l % t, p = Ht(h, ks, t) * u % t, y = Ht(p, i, t) * p % t, d = Ht(y, s, t) * y % t, g = Ht(d, a, t) * d % t, m = Ht(g, c, t) * g % t, S = Ht(m, a, t) * d % t, I = Ht(S, n, t) * l % t, L = Ht(I, o, t) * y % t, R = Ht(L, r, t) * u % t, V = Ht(R, ks, t);
  if (!Qr.eql(Qr.sqr(V), e))
    throw new Error("Cannot find square root");
  return V;
}
const Qr = Bi($i.p, { sqrt: hd }), dn = /* @__PURE__ */ cd($i, {
  Fp: Qr,
  endo: fd
}), Le = /* @__PURE__ */ ld(dn, xt), pa = {};
function Jr(e, ...t) {
  let n = pa[e];
  if (n === void 0) {
    const r = xt(Ff(e));
    n = Zt(r, r), pa[e] = n;
  }
  return xt(Zt(n, ...t));
}
const yo = (e) => e.toBytes(!0).slice(1), wo = (e) => e % ks === dd;
function Os(e) {
  const { Fn: t, BASE: n } = dn, r = t.fromBytes(e), i = n.multiply(r);
  return { scalar: wo(i.y) ? r : t.neg(r), bytes: yo(i) };
}
function Tu(e) {
  const t = Qr;
  if (!t.isValidNot0(e))
    throw new Error("invalid x: Fail if x ≥ p");
  const n = t.create(e * e), r = t.create(n * e + BigInt(7));
  let i = t.sqrt(r);
  wo(i) || (i = t.neg(i));
  const s = dn.fromAffine({ x: e, y: i });
  return s.assertValidity(), s;
}
const Qn = ve;
function Su(...e) {
  return dn.Fn.create(Qn(Jr("BIP0340/challenge", ...e)));
}
function ga(e) {
  return Os(e).bytes;
}
function pd(e, t, n = pr(32)) {
  const { Fn: r } = dn, i = q(e, void 0, "message"), { bytes: s, scalar: o } = Os(t), a = q(n, 32, "auxRand"), c = r.toBytes(o ^ Qn(Jr("BIP0340/aux", a))), u = Jr("BIP0340/nonce", c, s, i), { bytes: l, scalar: f } = Os(u), h = Su(l, s, i), p = new Uint8Array(64);
  if (p.set(l, 0), p.set(r.toBytes(r.create(f + h * o)), 32), !vu(p, i, s))
    throw new Error("sign: Invalid signature produced");
  return p;
}
function vu(e, t, n) {
  const { Fp: r, Fn: i, BASE: s } = dn, o = q(e, 64, "signature"), a = q(t, void 0, "message"), c = q(n, 32, "publicKey");
  try {
    const u = Tu(Qn(c)), l = Qn(o.subarray(0, 32));
    if (!r.isValidNot0(l))
      return !1;
    const f = Qn(o.subarray(32, 64));
    if (!i.isValidNot0(f))
      return !1;
    const h = Su(i.toBytes(l), yo(u), a), p = s.multiplyUnsafe(f).add(u.multiplyUnsafe(i.neg(h))), { x: y, y: d } = p.toAffine();
    return !(p.is0() || !wo(d) || y !== l);
  } catch {
    return !1;
  }
}
const Ae = /* @__PURE__ */ (() => {
  const n = (r = pr(48)) => hu(r, $i.n);
  return {
    keygen: yu(n, ga),
    getPublicKey: ga,
    sign: pd,
    verify: vu,
    Point: dn,
    utils: {
      randomSecretKey: n,
      taggedHash: Jr,
      lift_x: Tu,
      pointToBytes: yo
    },
    lengths: {
      secretKey: 32,
      publicKey: 32,
      publicKeyHasPrefix: !1,
      signature: 64,
      seed: 48
    }
  };
})(), gd = /* @__PURE__ */ Uint8Array.from([
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
]), Au = Uint8Array.from(new Array(16).fill(0).map((e, t) => t)), yd = Au.map((e) => (9 * e + 5) % 16), Iu = /* @__PURE__ */ (() => {
  const n = [[Au], [yd]];
  for (let r = 0; r < 4; r++)
    for (let i of n)
      i.push(i[r].map((s) => gd[s]));
  return n;
})(), ku = Iu[0], Ou = Iu[1], Bu = /* @__PURE__ */ [
  [11, 14, 15, 12, 5, 8, 7, 9, 11, 13, 14, 15, 6, 7, 9, 8],
  [12, 13, 11, 15, 6, 9, 9, 7, 12, 15, 11, 13, 7, 8, 7, 7],
  [13, 15, 14, 11, 7, 7, 6, 8, 13, 14, 13, 12, 5, 5, 6, 9],
  [14, 11, 12, 14, 8, 6, 5, 5, 15, 12, 15, 14, 9, 9, 8, 6],
  [15, 12, 13, 13, 9, 5, 8, 6, 14, 11, 12, 11, 8, 6, 5, 5]
].map((e) => Uint8Array.from(e)), wd = /* @__PURE__ */ ku.map((e, t) => e.map((n) => Bu[t][n])), md = /* @__PURE__ */ Ou.map((e, t) => e.map((n) => Bu[t][n])), bd = /* @__PURE__ */ Uint32Array.from([
  0,
  1518500249,
  1859775393,
  2400959708,
  2840853838
]), Ed = /* @__PURE__ */ Uint32Array.from([
  1352829926,
  1548603684,
  1836072691,
  2053994217,
  0
]);
function ya(e, t, n, r) {
  return e === 0 ? t ^ n ^ r : e === 1 ? t & n | ~t & r : e === 2 ? (t | ~n) ^ r : e === 3 ? t & r | n & ~r : t ^ (n | ~r);
}
const vr = /* @__PURE__ */ new Uint32Array(16);
class xd extends Xc {
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
    for (let p = 0; p < 16; p++, n += 4)
      vr[p] = t.getUint32(n, !0);
    let r = this.h0 | 0, i = r, s = this.h1 | 0, o = s, a = this.h2 | 0, c = a, u = this.h3 | 0, l = u, f = this.h4 | 0, h = f;
    for (let p = 0; p < 5; p++) {
      const y = 4 - p, d = bd[p], g = Ed[p], m = ku[p], S = Ou[p], I = wd[p], L = md[p];
      for (let R = 0; R < 16; R++) {
        const V = xr(r + ya(p, s, a, u) + vr[m[R]] + d, I[R]) + f | 0;
        r = f, f = u, u = xr(a, 10) | 0, a = s, s = V;
      }
      for (let R = 0; R < 16; R++) {
        const V = xr(i + ya(y, o, c, l) + vr[S[R]] + g, L[R]) + h | 0;
        i = h, h = l, l = xr(c, 10) | 0, c = o, o = V;
      }
    }
    this.set(this.h1 + a + l | 0, this.h2 + u + h | 0, this.h3 + f + i | 0, this.h4 + r + o | 0, this.h0 + s + c | 0);
  }
  roundClean() {
    Sn(vr);
  }
  destroy() {
    this.destroyed = !0, Sn(this.buffer), this.set(0, 0, 0, 0, 0);
  }
}
const Td = /* @__PURE__ */ Zc(() => new xd());
/*! scure-base - MIT License (c) 2022 Paul Miller (paulmillr.com) */
function An(e) {
  return e instanceof Uint8Array || ArrayBuffer.isView(e) && e.constructor.name === "Uint8Array";
}
function $u(e) {
  if (!An(e))
    throw new Error("Uint8Array expected");
}
function Nu(e, t) {
  return Array.isArray(t) ? t.length === 0 ? !0 : e ? t.every((n) => typeof n == "string") : t.every((n) => Number.isSafeInteger(n)) : !1;
}
function mo(e) {
  if (typeof e != "function")
    throw new Error("function expected");
  return !0;
}
function Me(e, t) {
  if (typeof t != "string")
    throw new Error(`${e}: string expected`);
  return !0;
}
function Dn(e) {
  if (!Number.isSafeInteger(e))
    throw new Error(`invalid integer: ${e}`);
}
function ti(e) {
  if (!Array.isArray(e))
    throw new Error("array expected");
}
function ei(e, t) {
  if (!Nu(!0, t))
    throw new Error(`${e}: array of strings expected`);
}
function bo(e, t) {
  if (!Nu(!1, t))
    throw new Error(`${e}: array of numbers expected`);
}
// @__NO_SIDE_EFFECTS__
function yr(...e) {
  const t = (s) => s, n = (s, o) => (a) => s(o(a)), r = e.map((s) => s.encode).reduceRight(n, t), i = e.map((s) => s.decode).reduce(n, t);
  return { encode: r, decode: i };
}
// @__NO_SIDE_EFFECTS__
function Ni(e) {
  const t = typeof e == "string" ? e.split("") : e, n = t.length;
  ei("alphabet", t);
  const r = new Map(t.map((i, s) => [i, s]));
  return {
    encode: (i) => (ti(i), i.map((s) => {
      if (!Number.isSafeInteger(s) || s < 0 || s >= n)
        throw new Error(`alphabet.encode: digit index outside alphabet "${s}". Allowed: ${e}`);
      return t[s];
    })),
    decode: (i) => (ti(i), i.map((s) => {
      Me("alphabet.decode", s);
      const o = r.get(s);
      if (o === void 0)
        throw new Error(`Unknown letter: "${s}". Allowed: ${e}`);
      return o;
    }))
  };
}
// @__NO_SIDE_EFFECTS__
function Ri(e = "") {
  return Me("join", e), {
    encode: (t) => (ei("join.decode", t), t.join(e)),
    decode: (t) => (Me("join.decode", t), t.split(e))
  };
}
// @__NO_SIDE_EFFECTS__
function Sd(e, t = "=") {
  return Dn(e), Me("padding", t), {
    encode(n) {
      for (ei("padding.encode", n); n.length * e % 8; )
        n.push(t);
      return n;
    },
    decode(n) {
      ei("padding.decode", n);
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
function vd(e) {
  return mo(e), { encode: (t) => t, decode: (t) => e(t) };
}
function wa(e, t, n) {
  if (t < 2)
    throw new Error(`convertRadix: invalid from=${t}, base cannot be less than 2`);
  if (n < 2)
    throw new Error(`convertRadix: invalid to=${n}, base cannot be less than 2`);
  if (ti(e), !e.length)
    return [];
  let r = 0;
  const i = [], s = Array.from(e, (a) => {
    if (Dn(a), a < 0 || a >= t)
      throw new Error(`invalid integer: ${a}`);
    return a;
  }), o = s.length;
  for (; ; ) {
    let a = 0, c = !0;
    for (let u = r; u < o; u++) {
      const l = s[u], f = t * a, h = f + l;
      if (!Number.isSafeInteger(h) || f / t !== a || h - l !== f)
        throw new Error("convertRadix: carry overflow");
      const p = h / n;
      a = h % n;
      const y = Math.floor(p);
      if (s[u] = y, !Number.isSafeInteger(y) || y * n + a !== h)
        throw new Error("convertRadix: carry overflow");
      if (c)
        y ? c = !1 : r = u;
      else continue;
    }
    if (i.push(a), c)
      break;
  }
  for (let a = 0; a < e.length - 1 && e[a] === 0; a++)
    i.push(0);
  return i.reverse();
}
const Ru = (e, t) => t === 0 ? e : Ru(t, e % t), ni = /* @__NO_SIDE_EFFECTS__ */ (e, t) => e + (t - Ru(e, t)), Dr = /* @__PURE__ */ (() => {
  let e = [];
  for (let t = 0; t < 40; t++)
    e.push(2 ** t);
  return e;
})();
function Bs(e, t, n, r) {
  if (ti(e), t <= 0 || t > 32)
    throw new Error(`convertRadix2: wrong from=${t}`);
  if (n <= 0 || n > 32)
    throw new Error(`convertRadix2: wrong to=${n}`);
  if (/* @__PURE__ */ ni(t, n) > 32)
    throw new Error(`convertRadix2: carry overflow from=${t} to=${n} carryBits=${/* @__PURE__ */ ni(t, n)}`);
  let i = 0, s = 0;
  const o = Dr[t], a = Dr[n] - 1, c = [];
  for (const u of e) {
    if (Dn(u), u >= o)
      throw new Error(`convertRadix2: invalid data word=${u} from=${t}`);
    if (i = i << t | u, s + t > 32)
      throw new Error(`convertRadix2: carry overflow pos=${s} from=${t}`);
    for (s += t; s >= n; s -= n)
      c.push((i >> s - n & a) >>> 0);
    const l = Dr[s];
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
function Ad(e) {
  Dn(e);
  const t = 2 ** 8;
  return {
    encode: (n) => {
      if (!An(n))
        throw new Error("radix.encode input should be Uint8Array");
      return wa(Array.from(n), t, e);
    },
    decode: (n) => (bo("radix.decode", n), Uint8Array.from(wa(n, e, t)))
  };
}
// @__NO_SIDE_EFFECTS__
function Eo(e, t = !1) {
  if (Dn(e), e <= 0 || e > 32)
    throw new Error("radix2: bits should be in (0..32]");
  if (/* @__PURE__ */ ni(8, e) > 32 || /* @__PURE__ */ ni(e, 8) > 32)
    throw new Error("radix2: carry overflow");
  return {
    encode: (n) => {
      if (!An(n))
        throw new Error("radix2.encode input should be Uint8Array");
      return Bs(Array.from(n), 8, e, !t);
    },
    decode: (n) => (bo("radix2.decode", n), Uint8Array.from(Bs(n, e, 8, t)))
  };
}
function ma(e) {
  return mo(e), function(...t) {
    try {
      return e.apply(null, t);
    } catch {
    }
  };
}
function Id(e, t) {
  return Dn(e), mo(t), {
    encode(n) {
      if (!An(n))
        throw new Error("checksum.encode: input should be Uint8Array");
      const r = t(n).slice(0, e), i = new Uint8Array(n.length + e);
      return i.set(n), i.set(r, n.length), i;
    },
    decode(n) {
      if (!An(n))
        throw new Error("checksum.decode: input should be Uint8Array");
      const r = n.slice(0, -e), i = n.slice(-e), s = t(r).slice(0, e);
      for (let o = 0; o < e; o++)
        if (s[o] !== i[o])
          throw new Error("Invalid checksum");
      return r;
    }
  };
}
const kd = typeof Uint8Array.from([]).toBase64 == "function" && typeof Uint8Array.fromBase64 == "function", Od = (e, t) => {
  Me("base64", e);
  const n = /^[A-Za-z0-9=+/]+$/, r = "base64";
  if (e.length > 0 && !n.test(e))
    throw new Error("invalid base64");
  return Uint8Array.fromBase64(e, { alphabet: r, lastChunkHandling: "strict" });
}, ft = kd ? {
  encode(e) {
    return $u(e), e.toBase64();
  },
  decode(e) {
    return Od(e);
  }
} : /* @__PURE__ */ yr(/* @__PURE__ */ Eo(6), /* @__PURE__ */ Ni("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"), /* @__PURE__ */ Sd(6), /* @__PURE__ */ Ri("")), Bd = /* @__NO_SIDE_EFFECTS__ */ (e) => /* @__PURE__ */ yr(/* @__PURE__ */ Ad(58), /* @__PURE__ */ Ni(e), /* @__PURE__ */ Ri("")), $s = /* @__PURE__ */ Bd("123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"), $d = (e) => /* @__PURE__ */ yr(Id(4, (t) => e(e(t))), $s), Ns = /* @__PURE__ */ yr(/* @__PURE__ */ Ni("qpzry9x8gf2tvdw0s3jn54khce6mua7l"), /* @__PURE__ */ Ri("")), ba = [996825010, 642813549, 513874426, 1027748829, 705979059];
function Kn(e) {
  const t = e >> 25;
  let n = (e & 33554431) << 5;
  for (let r = 0; r < ba.length; r++)
    (t >> r & 1) === 1 && (n ^= ba[r]);
  return n;
}
function Ea(e, t, n = 1) {
  const r = e.length;
  let i = 1;
  for (let s = 0; s < r; s++) {
    const o = e.charCodeAt(s);
    if (o < 33 || o > 126)
      throw new Error(`Invalid prefix (${e})`);
    i = Kn(i) ^ o >> 5;
  }
  i = Kn(i);
  for (let s = 0; s < r; s++)
    i = Kn(i) ^ e.charCodeAt(s) & 31;
  for (let s of t)
    i = Kn(i) ^ s;
  for (let s = 0; s < 6; s++)
    i = Kn(i);
  return i ^= n, Ns.encode(Bs([i % Dr[30]], 30, 5, !1));
}
// @__NO_SIDE_EFFECTS__
function Uu(e) {
  const t = e === "bech32" ? 1 : 734539939, n = /* @__PURE__ */ Eo(5), r = n.decode, i = n.encode, s = ma(r);
  function o(f, h, p = 90) {
    Me("bech32.encode prefix", f), An(h) && (h = Array.from(h)), bo("bech32.encode", h);
    const y = f.length;
    if (y === 0)
      throw new TypeError(`Invalid prefix length ${y}`);
    const d = y + 7 + h.length;
    if (p !== !1 && d > p)
      throw new TypeError(`Length ${d} exceeds limit ${p}`);
    const g = f.toLowerCase(), m = Ea(g, h, t);
    return `${g}1${Ns.encode(h)}${m}`;
  }
  function a(f, h = 90) {
    Me("bech32.decode input", f);
    const p = f.length;
    if (p < 8 || h !== !1 && p > h)
      throw new TypeError(`invalid string length: ${p} (${f}). Expected (8..${h})`);
    const y = f.toLowerCase();
    if (f !== y && f !== f.toUpperCase())
      throw new Error("String must be lowercase or uppercase");
    const d = y.lastIndexOf("1");
    if (d === 0 || d === -1)
      throw new Error('Letter "1" must be present between prefix and data only');
    const g = y.slice(0, d), m = y.slice(d + 1);
    if (m.length < 6)
      throw new Error("Data must be at least 6 characters long");
    const S = Ns.decode(m).slice(0, -6), I = Ea(g, S, t);
    if (!m.endsWith(I))
      throw new Error(`Invalid checksum in ${f}: expected "${I}"`);
    return { prefix: g, words: S };
  }
  const c = ma(a);
  function u(f) {
    const { prefix: h, words: p } = a(f, !1);
    return { prefix: h, words: p, bytes: r(p) };
  }
  function l(f, h) {
    return o(f, i(h));
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
const Rs = /* @__PURE__ */ Uu("bech32"), pn = /* @__PURE__ */ Uu("bech32m"), Nd = {
  encode: (e) => new TextDecoder().decode(e),
  decode: (e) => new TextEncoder().encode(e)
}, Rd = typeof Uint8Array.from([]).toHex == "function" && typeof Uint8Array.fromHex == "function", Ud = {
  encode(e) {
    return $u(e), e.toHex();
  },
  decode(e) {
    return Me("hex", e), Uint8Array.fromHex(e);
  }
}, O = Rd ? Ud : /* @__PURE__ */ yr(/* @__PURE__ */ Eo(4), /* @__PURE__ */ Ni("0123456789abcdef"), /* @__PURE__ */ Ri(""), /* @__PURE__ */ vd((e) => {
  if (typeof e != "string" || e.length % 2 !== 0)
    throw new TypeError(`hex.decode: expected string, got ${typeof e} with length ${e.length}`);
  return e.toLowerCase();
})), ct = /* @__PURE__ */ Uint8Array.of(), Lu = /* @__PURE__ */ Uint8Array.of(0);
function In(e, t) {
  if (e.length !== t.length)
    return !1;
  for (let n = 0; n < e.length; n++)
    if (e[n] !== t[n])
      return !1;
  return !0;
}
function zt(e) {
  return e instanceof Uint8Array || ArrayBuffer.isView(e) && e.constructor.name === "Uint8Array";
}
function Ld(...e) {
  let t = 0;
  for (let r = 0; r < e.length; r++) {
    const i = e[r];
    if (!zt(i))
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
const Cu = (e) => new DataView(e.buffer, e.byteOffset, e.byteLength);
function wr(e) {
  return Object.prototype.toString.call(e) === "[object Object]";
}
function ce(e) {
  return Number.isSafeInteger(e);
}
const xo = {
  equalBytes: In,
  isBytes: zt,
  concatBytes: Ld
}, Pu = (e) => {
  if (e !== null && typeof e != "string" && !Qt(e) && !zt(e) && !ce(e))
    throw new Error(`lengthCoder: expected null | number | Uint8Array | CoderType, got ${e} (${typeof e})`);
  return {
    encodeStream(t, n) {
      if (e === null)
        return;
      if (Qt(e))
        return e.encodeStream(t, n);
      let r;
      if (typeof e == "number" ? r = e : typeof e == "string" && (r = Se.resolve(t.stack, e)), typeof r == "bigint" && (r = Number(r)), r === void 0 || r !== n)
        throw t.err(`Wrong length: ${r} len=${e} exp=${n} (${typeof n})`);
    },
    decodeStream(t) {
      let n;
      if (Qt(e) ? n = Number(e.decodeStream(t)) : typeof e == "number" ? n = e : typeof e == "string" && (n = Se.resolve(t.stack, e)), typeof n == "bigint" && (n = Number(n)), typeof n != "number")
        throw t.err(`Wrong length: ${n}`);
      return n;
    }
  };
}, mt = {
  BITS: 32,
  FULL_MASK: -1 >>> 0,
  // 1<<32 will overflow
  len: (e) => Math.ceil(e / 32),
  create: (e) => new Uint32Array(mt.len(e)),
  clean: (e) => e.fill(0),
  debug: (e) => Array.from(e).map((t) => (t >>> 0).toString(2).padStart(32, "0")),
  checkLen: (e, t) => {
    if (mt.len(t) !== e.length)
      throw new Error(`wrong length=${e.length}. Expected: ${mt.len(t)}`);
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
    mt.checkLen(e, t);
    const { FULL_MASK: r, BITS: i } = mt, s = i - t % i, o = s ? r >>> s << s : r, a = [];
    for (let c = 0; c < e.length; c++) {
      let u = e[c];
      if (n && (u = ~u), c === e.length - 1 && (u &= o), u !== 0)
        for (let l = 0; l < i; l++) {
          const f = 1 << i - l - 1;
          u & f && a.push(c * i + l);
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
  rangeDebug: (e, t, n = !1) => `[${mt.range(mt.indices(e, t, n)).map((r) => `(${r.pos}/${r.length})`).join(", ")}]`,
  setRange: (e, t, n, r, i = !0) => {
    mt.chunkLen(t, n, r);
    const { FULL_MASK: s, BITS: o } = mt, a = n % o ? Math.floor(n / o) : void 0, c = n + r, u = c % o ? Math.floor(c / o) : void 0;
    if (a !== void 0 && a === u)
      return mt.set(e, a, s >>> o - r << o - r - n, i);
    if (a !== void 0 && !mt.set(e, a, s >>> n % o, i))
      return !1;
    const l = a !== void 0 ? a + 1 : n / o, f = u !== void 0 ? u : c / o;
    for (let h = l; h < f; h++)
      if (!mt.set(e, h, s, i))
        return !1;
    return !(u !== void 0 && a !== u && !mt.set(e, u, s << o - c % o, i));
  }
}, Se = {
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
    const r = new Error(`${e}(${Se.path(t)}): ${typeof n == "string" ? n : n.message}`);
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
class To {
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
    this.data = t, this.opts = n, this.stack = r, this.parent = i, this.parentOffset = s, this.view = Cu(t);
  }
  /** Internal method for pointers. */
  _enablePointers() {
    if (this.parent)
      return this.parent._enablePointers();
    this.bs || (this.bs = mt.create(this.data.length), mt.setRange(this.bs, this.data.length, 0, this.pos, this.opts.allowMultipleReads));
  }
  markBytesBS(t, n) {
    return this.parent ? this.parent.markBytesBS(this.parentOffset + t, n) : !n || !this.bs ? !0 : mt.setRange(this.bs, this.data.length, t, n, !1);
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
    return Se.pushObj(this.stack, t, n);
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
        throw this.err(`${this.bitPos} bits left after unpack: ${O.encode(this.data.slice(this.pos))}`);
      if (this.bs && !this.parent) {
        const t = mt.indices(this.bs, this.data.length, !0);
        if (t.length) {
          const n = mt.range(t).map(({ pos: r, length: i }) => `(${r}/${i})[${O.encode(this.data.subarray(r, r + i))}]`).join(", ");
          throw this.err(`unread byte ranges: ${n} (total=${this.data.length})`);
        } else
          return;
      }
      if (!this.isEnd())
        throw this.err(`${this.leftBytes} bytes ${this.bitPos} bits left after unpack: ${O.encode(this.data.slice(this.pos))}`);
    }
  }
  // User methods
  err(t) {
    return Se.err("Reader", this.stack, t);
  }
  offsetReader(t) {
    if (t > this.data.length)
      throw this.err("offsetReader: Unexpected end of buffer");
    return new To(this.absBytes(t), this.opts, this.stack, this, t);
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
    if (!zt(t))
      throw this.err(`find: needle is not bytes! ${t}`);
    if (this.bitPos)
      throw this.err("findByte: bitPos not empty");
    if (!t.length)
      throw this.err("find: needle is empty");
    for (let r = n; (r = this.data.indexOf(t[0], r)) !== -1; r++) {
      if (r === -1 || this.data.length - r < t.length)
        return;
      if (In(t, this.data.subarray(r, r + t.length)))
        return r;
    }
  }
}
class Cd {
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
    this.stack = t, this.view = Cu(this.viewBuf);
  }
  pushObj(t, n) {
    return Se.pushObj(this.stack, t, n);
  }
  writeView(t, n) {
    if (this.finished)
      throw this.err("buffer: finished");
    if (!ce(t) || t > 8)
      throw new Error(`wrong writeView length=${t}`);
    n(this.view), this.bytes(this.viewBuf.slice(0, t)), this.viewBuf.fill(0);
  }
  // User methods
  err(t) {
    if (this.finished)
      throw this.err("buffer: finished");
    return Se.err("Reader", this.stack, t);
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
const Us = (e) => Uint8Array.from(e).reverse();
function Pd(e, t, n) {
  if (n) {
    const r = 2n ** (t - 1n);
    if (e < -r || e >= r)
      throw new Error(`value out of signed bounds. Expected ${-r} <= ${e} < ${r}`);
  } else if (0n > e || e >= 2n ** t)
    throw new Error(`value out of unsigned bounds. Expected 0 <= ${e} < ${2n ** t}`);
}
function _u(e) {
  return {
    // NOTE: we cannot export validate here, since it is likely mistake.
    encodeStream: e.encodeStream,
    decodeStream: e.decodeStream,
    size: e.size,
    encode: (t) => {
      const n = new Cd();
      return e.encodeStream(n, t), n.finish();
    },
    decode: (t, n = {}) => {
      const r = new To(t, n), i = e.decodeStream(r);
      return r.finish(), i;
    }
  };
}
function Nt(e, t) {
  if (!Qt(e))
    throw new Error(`validate: invalid inner value ${e}`);
  if (typeof t != "function")
    throw new Error("validate: fn should be function");
  return _u({
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
const Rt = (e) => {
  const t = _u(e);
  return e.validate ? Nt(t, e.validate) : t;
}, Ui = (e) => wr(e) && typeof e.decode == "function" && typeof e.encode == "function";
function Qt(e) {
  return wr(e) && Ui(e) && typeof e.encodeStream == "function" && typeof e.decodeStream == "function" && (e.size === void 0 || ce(e.size));
}
function _d() {
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
      if (!wr(e))
        throw new Error(`expected plain object, got ${e}`);
      return Object.entries(e);
    }
  };
}
const Dd = {
  encode: (e) => {
    if (typeof e != "bigint")
      throw new Error(`expected bigint, got ${typeof e}`);
    if (e > BigInt(Number.MAX_SAFE_INTEGER))
      throw new Error(`element bigger than MAX_SAFE_INTEGER=${e}`);
    return Number(e);
  },
  decode: (e) => {
    if (!ce(e))
      throw new Error("element is not a safe integer");
    return BigInt(e);
  }
};
function Vd(e) {
  if (!wr(e))
    throw new Error("plain object expected");
  return {
    encode: (t) => {
      if (!ce(t) || !(t in e))
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
function Md(e, t = !1) {
  if (!ce(e))
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
      const u = Math.min(a.length, e), l = BigInt(a.slice(0, u)) * 10n ** BigInt(e - u), f = c + l;
      return i ? -f : f;
    }
  };
}
function Hd(e) {
  if (!Array.isArray(e))
    throw new Error(`expected array, got ${typeof e}`);
  for (const t of e)
    if (!Ui(t))
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
const Du = (e) => {
  if (!Ui(e))
    throw new Error("BaseCoder expected");
  return { encode: e.decode, decode: e.encode };
}, Li = { dict: _d, numberBigint: Dd, tsEnum: Vd, decimal: Md, match: Hd, reverse: Du }, So = (e, t = !1, n = !1, r = !0) => {
  if (!ce(e))
    throw new Error(`bigint/size: wrong value ${e}`);
  if (typeof t != "boolean")
    throw new Error(`bigint/le: expected boolean, got ${typeof t}`);
  if (typeof n != "boolean")
    throw new Error(`bigint/signed: expected boolean, got ${typeof n}`);
  if (typeof r != "boolean")
    throw new Error(`bigint/sized: expected boolean, got ${typeof r}`);
  const i = BigInt(e), s = 2n ** (8n * i - 1n);
  return Rt({
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
      const a = o.bytes(r ? e : Math.min(e, o.leftBytes)), c = t ? a : Us(a);
      let u = 0n;
      for (let l = 0; l < c.length; l++)
        u |= BigInt(c[l]) << 8n * BigInt(l);
      return n && u & s && (u = (u ^ s) - s), u;
    },
    validate: (o) => {
      if (typeof o != "bigint")
        throw new Error(`bigint: invalid value: ${o}`);
      return Pd(o, 8n * i, !!n), o;
    }
  });
}, Vu = /* @__PURE__ */ So(32, !1), Vr = /* @__PURE__ */ So(8, !0), Fd = /* @__PURE__ */ So(8, !0, !0), Kd = (e, t) => Rt({
  size: e,
  encodeStream: (n, r) => n.writeView(e, (i) => t.write(i, r)),
  decodeStream: (n) => n.readView(e, t.read),
  validate: (n) => {
    if (typeof n != "number")
      throw new Error(`viewCoder: expected number, got ${typeof n}`);
    return t.validate && t.validate(n), n;
  }
}), mr = (e, t, n) => {
  const r = e * 8, i = 2 ** (r - 1), s = (c) => {
    if (!ce(c))
      throw new Error(`sintView: value is not safe integer: ${c}`);
    if (c < -i || c >= i)
      throw new Error(`sintView: value out of bounds. Expected ${-i} <= ${c} < ${i}`);
  }, o = 2 ** r, a = (c) => {
    if (!ce(c))
      throw new Error(`uintView: value is not safe integer: ${c}`);
    if (0 > c || c >= o)
      throw new Error(`uintView: value out of bounds. Expected 0 <= ${c} < ${o}`);
  };
  return Kd(e, {
    write: n.write,
    read: n.read,
    validate: t ? s : a
  });
}, tt = /* @__PURE__ */ mr(4, !1, {
  read: (e, t) => e.getUint32(t, !0),
  write: (e, t) => e.setUint32(0, t, !0)
}), zd = /* @__PURE__ */ mr(4, !1, {
  read: (e, t) => e.getUint32(t, !1),
  write: (e, t) => e.setUint32(0, t, !1)
}), gn = /* @__PURE__ */ mr(4, !0, {
  read: (e, t) => e.getInt32(t, !0),
  write: (e, t) => e.setInt32(0, t, !0)
}), xa = /* @__PURE__ */ mr(2, !1, {
  read: (e, t) => e.getUint16(t, !0),
  write: (e, t) => e.setUint16(0, t, !0)
}), Ce = /* @__PURE__ */ mr(1, !1, {
  read: (e, t) => e.getUint8(t),
  write: (e, t) => e.setUint8(0, t)
}), ot = (e, t = !1) => {
  if (typeof t != "boolean")
    throw new Error(`bytes/le: expected boolean, got ${typeof t}`);
  const n = Pu(e), r = zt(e);
  return Rt({
    size: typeof e == "number" ? e : void 0,
    encodeStream: (i, s) => {
      r || n.encodeStream(i, s.length), i.bytes(t ? Us(s) : s), r && i.bytes(e);
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
      return t ? Us(s) : s;
    },
    validate: (i) => {
      if (!zt(i))
        throw new Error(`bytes: invalid value ${i}`);
      return i;
    }
  });
};
function jd(e, t) {
  if (!Qt(t))
    throw new Error(`prefix: invalid inner value ${t}`);
  return He(ot(e), Du(t));
}
const vo = (e, t = !1) => Nt(He(ot(e, t), Nd), (n) => {
  if (typeof n != "string")
    throw new Error(`expected string, got ${typeof n}`);
  return n;
}), Wd = (e, t = { isLE: !1, with0x: !1 }) => {
  let n = He(ot(e, t.isLE), O);
  const r = t.with0x;
  if (typeof r != "boolean")
    throw new Error(`hex/with0x: expected boolean, got ${typeof r}`);
  return r && (n = He(n, {
    encode: (i) => `0x${i}`,
    decode: (i) => {
      if (!i.startsWith("0x"))
        throw new Error("hex(with0x=true).encode input should start with 0x");
      return i.slice(2);
    }
  })), n;
};
function He(e, t) {
  if (!Qt(e))
    throw new Error(`apply: invalid inner value ${e}`);
  if (!Ui(t))
    throw new Error(`apply: invalid base value ${e}`);
  return Rt({
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
const Gd = (e, t = !1) => {
  if (!zt(e))
    throw new Error(`flag/flagValue: expected Uint8Array, got ${typeof e}`);
  if (typeof t != "boolean")
    throw new Error(`flag/xor: expected boolean, got ${typeof t}`);
  return Rt({
    size: e.length,
    encodeStream: (n, r) => {
      !!r !== t && n.bytes(e);
    },
    decodeStream: (n) => {
      let r = n.leftBytes >= e.length;
      return r && (r = In(n.bytes(e.length, !0), e), r && n.bytes(e.length)), r !== t;
    },
    validate: (n) => {
      if (n !== void 0 && typeof n != "boolean")
        throw new Error(`flag: expected boolean value or undefined, got ${typeof n}`);
      return n;
    }
  });
};
function qd(e, t, n) {
  if (!Qt(t))
    throw new Error(`flagged: invalid inner value ${t}`);
  return Rt({
    encodeStream: (r, i) => {
      Se.resolve(r.stack, e) && t.encodeStream(r, i);
    },
    decodeStream: (r) => {
      let i = !1;
      if (i = !!Se.resolve(r.stack, e), i)
        return t.decodeStream(r);
    }
  });
}
function Ao(e, t, n = !0) {
  if (!Qt(e))
    throw new Error(`magic: invalid inner value ${e}`);
  if (typeof n != "boolean")
    throw new Error(`magic: expected boolean, got ${typeof n}`);
  return Rt({
    size: e.size,
    encodeStream: (r, i) => e.encodeStream(r, t),
    decodeStream: (r) => {
      const i = e.decodeStream(r);
      if (n && typeof i != "object" && i !== t || zt(t) && !In(t, i))
        throw r.err(`magic: invalid value: ${i} !== ${t}`);
    },
    validate: (r) => {
      if (r !== void 0)
        throw new Error(`magic: wrong value=${typeof r}`);
      return r;
    }
  });
}
function Mu(e) {
  let t = 0;
  for (const n of e) {
    if (n.size === void 0)
      return;
    if (!ce(n.size))
      throw new Error(`sizeof: wrong element size=${t}`);
    t += n.size;
  }
  return t;
}
function Et(e) {
  if (!wr(e))
    throw new Error(`struct: expected plain object, got ${e}`);
  for (const t in e)
    if (!Qt(e[t]))
      throw new Error(`struct: field ${t} is not CoderType`);
  return Rt({
    size: Mu(Object.values(e)),
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
function Yd(e) {
  if (!Array.isArray(e))
    throw new Error(`Packed.Tuple: got ${typeof e} instead of array`);
  for (let t = 0; t < e.length; t++)
    if (!Qt(e[t]))
      throw new Error(`tuple: field ${t} is not CoderType`);
  return Rt({
    size: Mu(e),
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
function $t(e, t) {
  if (!Qt(t))
    throw new Error(`array: invalid inner value ${t}`);
  const n = Pu(typeof e == "string" ? `../${e}` : e);
  return Rt({
    size: typeof e == "number" && t.size ? e * t.size : void 0,
    encodeStream: (r, i) => {
      const s = r;
      s.pushObj(i, (o) => {
        zt(e) || n.encodeStream(r, i.length);
        for (let a = 0; a < i.length; a++)
          o(`${a}`, () => {
            const c = i[a], u = r.pos;
            if (t.encodeStream(r, c), zt(e)) {
              if (e.length > s.pos - u)
                return;
              const l = s.finish(!1).subarray(u, s.pos);
              if (In(l.subarray(0, e.length), e))
                throw s.err(`array: inner element encoding same as separator. elm=${c} data=${l}`);
            }
          });
      }), zt(e) && r.bytes(e);
    },
    decodeStream: (r) => {
      const i = [];
      return r.pushObj(i, (s) => {
        if (e === null)
          for (let o = 0; !r.isEnd() && (s(`${o}`, () => i.push(t.decodeStream(r))), !(t.size && r.leftBytes < t.size)); o++)
            ;
        else if (zt(e))
          for (let o = 0; ; o++) {
            if (In(r.bytes(e.length, !0), e)) {
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
const Vn = Le.Point, Ta = Vn.Fn, Hu = Vn.Fn.ORDER, br = (e) => e % 2n === 0n, it = xo.isBytes, Ue = xo.concatBytes, ht = xo.equalBytes, Fu = (e) => Td(xt(e)), Oe = (...e) => xt(xt(Ue(...e))), Ls = Ae.utils.randomSecretKey, Io = Ae.getPublicKey, Ku = Le.getPublicKey, Sa = (e) => e.r < Hu / 2n;
function Zd(e, t, n = !1) {
  let r = Le.Signature.fromBytes(Le.sign(e, t, { prehash: !1 }));
  if (n && !Sa(r)) {
    const i = new Uint8Array(32);
    let s = 0;
    for (; !Sa(r); )
      if (i.set(tt.encode(s++)), r = Le.Signature.fromBytes(Le.sign(e, t, { prehash: !1, extraEntropy: i })), s > 4294967295)
        throw new Error("lowR counter overflow: report the error");
  }
  return r.toBytes("der");
}
const va = Ae.sign, ko = Ae.utils.taggedHash, Ct = {
  ecdsa: 0,
  schnorr: 1
};
function kn(e, t) {
  const n = e.length;
  if (t === Ct.ecdsa) {
    if (n === 32)
      throw new Error("Expected non-Schnorr key");
    return Vn.fromBytes(e), e;
  } else if (t === Ct.schnorr) {
    if (n !== 32)
      throw new Error("Expected 32-byte Schnorr key");
    return Ae.utils.lift_x(ve(e)), e;
  } else
    throw new Error("Unknown key type");
}
function zu(e, t) {
  const r = Ae.utils.taggedHash("TapTweak", e, t), i = ve(r);
  if (i >= Hu)
    throw new Error("tweak higher than curve order");
  return i;
}
function Xd(e, t = Uint8Array.of()) {
  const n = Ae.utils, r = ve(e), i = Vn.BASE.multiply(r), s = br(i.y) ? r : Ta.neg(r), o = n.pointToBytes(i), a = zu(o, t);
  return gr(Ta.add(s, a), 32);
}
function Cs(e, t) {
  const n = Ae.utils, r = zu(e, t), s = n.lift_x(ve(e)).add(Vn.BASE.multiply(r)), o = br(s.y) ? 0 : 1;
  return [n.pointToBytes(s), o];
}
const Oo = xt(Vn.BASE.toBytes(!1)), On = {
  bech32: "bc",
  pubKeyHash: 0,
  scriptHash: 5,
  wif: 128
}, Ar = {
  bech32: "tb",
  pubKeyHash: 111,
  scriptHash: 196,
  wif: 239
};
function ri(e, t) {
  if (!it(e) || !it(t))
    throw new Error(`cmp: wrong type a=${typeof e} b=${typeof t}`);
  const n = Math.min(e.length, t.length);
  for (let r = 0; r < n; r++)
    if (e[r] != t[r])
      return Math.sign(e[r] - t[r]);
  return Math.sign(e.length - t.length);
}
function ju(e) {
  const t = {};
  for (const n in e) {
    if (t[e[n]] !== void 0)
      throw new Error("duplicate key");
    t[e[n]] = n;
  }
  return t;
}
const wt = {
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
}, Qd = ju(wt);
function Bo(e = 6, t = !1) {
  return Rt({
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
function Jd(e, t = 4, n = !0) {
  if (typeof e == "number")
    return e;
  if (it(e))
    try {
      const r = Bo(t, n).decode(e);
      return r > Number.MAX_SAFE_INTEGER ? void 0 : Number(r);
    } catch {
      return;
    }
}
const j = Rt({
  encodeStream: (e, t) => {
    for (let n of t) {
      if (typeof n == "string") {
        if (wt[n] === void 0)
          throw new Error(`Unknown opcode=${n}`);
        e.byte(wt[n]);
        continue;
      } else if (typeof n == "number") {
        if (n === 0) {
          e.byte(0);
          continue;
        } else if (1 <= n && n <= 16) {
          e.byte(wt.OP_1 - 1 + n);
          continue;
        }
      }
      if (typeof n == "number" && (n = Bo().encode(BigInt(n))), !it(n))
        throw new Error(`Wrong Script OP=${n} (${typeof n})`);
      const r = n.length;
      r < wt.PUSHDATA1 ? e.byte(r) : r <= 255 ? (e.byte(wt.PUSHDATA1), e.byte(r)) : r <= 65535 ? (e.byte(wt.PUSHDATA2), e.bytes(xa.encode(r))) : (e.byte(wt.PUSHDATA4), e.bytes(tt.encode(r))), e.bytes(n);
    }
  },
  decodeStream: (e) => {
    const t = [];
    for (; !e.isEnd(); ) {
      const n = e.byte();
      if (wt.OP_0 < n && n <= wt.PUSHDATA4) {
        let r;
        if (n < wt.PUSHDATA1)
          r = n;
        else if (n === wt.PUSHDATA1)
          r = Ce.decodeStream(e);
        else if (n === wt.PUSHDATA2)
          r = xa.decodeStream(e);
        else if (n === wt.PUSHDATA4)
          r = tt.decodeStream(e);
        else
          throw new Error("Should be not possible");
        t.push(e.bytes(r));
      } else if (n === 0)
        t.push(0);
      else if (wt.OP_1 <= n && n <= wt.OP_16)
        t.push(n - (wt.OP_1 - 1));
      else {
        const r = Qd[n];
        if (r === void 0)
          throw new Error(`Unknown opcode=${n.toString(16)}`);
        t.push(r);
      }
    }
    return t;
  }
}), Aa = {
  253: [253, 2, 253n, 65535n],
  254: [254, 4, 65536n, 4294967295n],
  255: [255, 8, 4294967296n, 18446744073709551615n]
}, Ci = Rt({
  encodeStream: (e, t) => {
    if (typeof t == "number" && (t = BigInt(t)), 0n <= t && t <= 252n)
      return e.byte(Number(t));
    for (const [n, r, i, s] of Object.values(Aa))
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
    const [n, r, i] = Aa[t];
    let s = 0n;
    for (let o = 0; o < r; o++)
      s |= BigInt(e.byte()) << 8n * BigInt(o);
    if (s < i)
      throw e.err(`Wrong CompactSize(${8 * r})`);
    return s;
  }
}), Jt = He(Ci, Li.numberBigint), qt = ot(Ci), or = $t(Jt, qt), ii = (e) => $t(Ci, e), Wu = Et({
  txid: ot(32, !0),
  // hash(prev_tx),
  index: tt,
  // output number of previous tx
  finalScriptSig: qt,
  // btc merges input and output script, executes it. If ok = tx passes
  sequence: tt
  // ?
}), nn = Et({ amount: Vr, script: qt }), th = Et({
  version: gn,
  segwitFlag: Gd(new Uint8Array([0, 1])),
  inputs: ii(Wu),
  outputs: ii(nn),
  witnesses: qd("segwitFlag", $t("inputs/length", or)),
  // < 500000000	Block number at which this transaction is unlocked
  // >= 500000000	UNIX timestamp at which this transaction is unlocked
  // Handled as part of PSBTv2
  lockTime: tt
});
function eh(e) {
  if (e.segwitFlag && e.witnesses && !e.witnesses.length)
    throw new Error("Segwit flag with empty witnesses array");
  return e;
}
const mn = Nt(th, eh), Xn = Et({
  version: gn,
  inputs: ii(Wu),
  outputs: ii(nn),
  lockTime: tt
}), Ps = Nt(ot(null), (e) => kn(e, Ct.ecdsa)), si = Nt(ot(32), (e) => kn(e, Ct.schnorr)), Ia = Nt(ot(null), (e) => {
  if (e.length !== 64 && e.length !== 65)
    throw new Error("Schnorr signature should be 64 or 65 bytes long");
  return e;
}), Pi = Et({
  fingerprint: zd,
  path: $t(null, tt)
}), Gu = Et({
  hashes: $t(Jt, ot(32)),
  der: Pi
}), nh = ot(78), rh = Et({ pubKey: si, leafHash: ot(32) }), ih = Et({
  version: Ce,
  // With parity :(
  internalKey: ot(32),
  merklePath: $t(null, ot(32))
}), ie = Nt(ih, (e) => {
  if (e.merklePath.length > 128)
    throw new Error("TaprootControlBlock: merklePath should be of length 0..128 (inclusive)");
  return e;
}), sh = $t(null, Et({
  depth: Ce,
  version: Ce,
  script: qt
})), dt = ot(null), ka = ot(20), zn = ot(32), $o = {
  unsignedTx: [0, !1, Xn, [0], [0], !1],
  xpub: [1, nh, Pi, [], [0, 2], !1],
  txVersion: [2, !1, tt, [2], [2], !1],
  fallbackLocktime: [3, !1, tt, [], [2], !1],
  inputCount: [4, !1, Jt, [2], [2], !1],
  outputCount: [5, !1, Jt, [2], [2], !1],
  txModifiable: [6, !1, Ce, [], [2], !1],
  // TODO: bitfield
  version: [251, !1, tt, [], [0, 2], !1],
  proprietary: [252, dt, dt, [], [0, 2], !1]
}, _i = {
  nonWitnessUtxo: [0, !1, mn, [], [0, 2], !1],
  witnessUtxo: [1, !1, nn, [], [0, 2], !1],
  partialSig: [2, Ps, dt, [], [0, 2], !1],
  sighashType: [3, !1, tt, [], [0, 2], !1],
  redeemScript: [4, !1, dt, [], [0, 2], !1],
  witnessScript: [5, !1, dt, [], [0, 2], !1],
  bip32Derivation: [6, Ps, Pi, [], [0, 2], !1],
  finalScriptSig: [7, !1, dt, [], [0, 2], !1],
  finalScriptWitness: [8, !1, or, [], [0, 2], !1],
  porCommitment: [9, !1, dt, [], [0, 2], !1],
  ripemd160: [10, ka, dt, [], [0, 2], !1],
  sha256: [11, zn, dt, [], [0, 2], !1],
  hash160: [12, ka, dt, [], [0, 2], !1],
  hash256: [13, zn, dt, [], [0, 2], !1],
  txid: [14, !1, zn, [2], [2], !0],
  index: [15, !1, tt, [2], [2], !0],
  sequence: [16, !1, tt, [], [2], !0],
  requiredTimeLocktime: [17, !1, tt, [], [2], !1],
  requiredHeightLocktime: [18, !1, tt, [], [2], !1],
  tapKeySig: [19, !1, Ia, [], [0, 2], !1],
  tapScriptSig: [20, rh, Ia, [], [0, 2], !1],
  tapLeafScript: [21, ie, dt, [], [0, 2], !1],
  tapBip32Derivation: [22, zn, Gu, [], [0, 2], !1],
  tapInternalKey: [23, !1, si, [], [0, 2], !1],
  tapMerkleRoot: [24, !1, zn, [], [0, 2], !1],
  proprietary: [252, dt, dt, [], [0, 2], !1]
}, oh = [
  "txid",
  "sequence",
  "index",
  "witnessUtxo",
  "nonWitnessUtxo",
  "finalScriptSig",
  "finalScriptWitness",
  "unknown"
], ah = [
  "partialSig",
  "finalScriptSig",
  "finalScriptWitness",
  "tapKeySig",
  "tapScriptSig"
], ar = {
  redeemScript: [0, !1, dt, [], [0, 2], !1],
  witnessScript: [1, !1, dt, [], [0, 2], !1],
  bip32Derivation: [2, Ps, Pi, [], [0, 2], !1],
  amount: [3, !1, Fd, [2], [2], !0],
  script: [4, !1, dt, [2], [2], !0],
  tapInternalKey: [5, !1, si, [], [0, 2], !1],
  tapTree: [6, !1, sh, [], [0, 2], !1],
  tapBip32Derivation: [7, si, Gu, [], [0, 2], !1],
  proprietary: [252, dt, dt, [], [0, 2], !1]
}, ch = [], Oa = $t(Lu, Et({
  //  <key> := <keylen> <keytype> <keydata> WHERE keylen = len(keytype)+len(keydata)
  key: jd(Jt, Et({ type: Jt, key: ot(null) })),
  //  <value> := <valuelen> <valuedata>
  value: ot(Jt)
}));
function _s(e) {
  const [t, n, r, i, s, o] = e;
  return { type: t, kc: n, vc: r, reqInc: i, allowInc: s, silentIgnore: o };
}
Et({ type: Jt, key: ot(null) });
function No(e) {
  const t = {};
  for (const n in e) {
    const [r, i, s] = e[n];
    t[r] = [n, i, s];
  }
  return Rt({
    encodeStream: (n, r) => {
      let i = [];
      for (const s in e) {
        const o = r[s];
        if (o === void 0)
          continue;
        const [a, c, u] = e[s];
        if (!c)
          i.push({ key: { type: a, key: ct }, value: u.encode(o) });
        else {
          const l = o.map(([f, h]) => [
            c.encode(f),
            u.encode(h)
          ]);
          l.sort((f, h) => ri(f[0], h[0]));
          for (const [f, h] of l)
            i.push({ key: { key: f, type: a }, value: h });
        }
      }
      if (r.unknown) {
        r.unknown.sort((s, o) => ri(s[0].key, o[0].key));
        for (const [s, o] of r.unknown)
          i.push({ key: s, value: o });
      }
      Oa.encodeStream(n, i);
    },
    decodeStream: (n) => {
      const r = Oa.decodeStream(n), i = {}, s = {};
      for (const o of r) {
        let a = "unknown", c = o.key.key, u = o.value;
        if (t[o.key.type]) {
          const [l, f, h] = t[o.key.type];
          if (a = l, !f && c.length)
            throw new Error(`PSBT: Non-empty key for ${a} (key=${O.encode(c)} value=${O.encode(u)}`);
          if (c = f ? f.decode(c) : void 0, u = h.decode(u), !f) {
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
const Ro = Nt(No(_i), (e) => {
  if (e.finalScriptWitness && !e.finalScriptWitness.length)
    throw new Error("validateInput: empty finalScriptWitness");
  if (e.partialSig && !e.partialSig.length)
    throw new Error("Empty partialSig");
  if (e.partialSig)
    for (const [t] of e.partialSig)
      kn(t, Ct.ecdsa);
  if (e.bip32Derivation)
    for (const [t] of e.bip32Derivation)
      kn(t, Ct.ecdsa);
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
}), Uo = Nt(No(ar), (e) => {
  if (e.bip32Derivation)
    for (const [t] of e.bip32Derivation)
      kn(t, Ct.ecdsa);
  return e;
}), qu = Nt(No($o), (e) => {
  if ((e.version || 0) === 0) {
    if (!e.unsignedTx)
      throw new Error("PSBTv0: missing unsignedTx");
    for (const n of e.unsignedTx.inputs)
      if (n.finalScriptSig && n.finalScriptSig.length)
        throw new Error("PSBTv0: input scriptSig found in unsignedTx");
  }
  return e;
}), uh = Et({
  magic: Ao(vo(new Uint8Array([255])), "psbt"),
  global: qu,
  inputs: $t("global/unsignedTx/inputs/length", Ro),
  outputs: $t(null, Uo)
}), lh = Et({
  magic: Ao(vo(new Uint8Array([255])), "psbt"),
  global: qu,
  inputs: $t("global/inputCount", Ro),
  outputs: $t("global/outputCount", Uo)
});
Et({
  magic: Ao(vo(new Uint8Array([255])), "psbt"),
  items: $t(null, He($t(Lu, Yd([Wd(Jt), ot(Ci)])), Li.dict()))
});
function ns(e, t, n) {
  for (const r in n) {
    if (r === "unknown" || !t[r])
      continue;
    const { allowInc: i } = _s(t[r]);
    if (!i.includes(e))
      throw new Error(`PSBTv${e}: field ${r} is not allowed`);
  }
  for (const r in t) {
    const { reqInc: i } = _s(t[r]);
    if (i.includes(e) && n[r] === void 0)
      throw new Error(`PSBTv${e}: missing required field ${r}`);
  }
}
function Ba(e, t, n) {
  const r = {};
  for (const i in n) {
    const s = i;
    if (s !== "unknown") {
      if (!t[s])
        continue;
      const { allowInc: o, silentIgnore: a } = _s(t[s]);
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
function Yu(e) {
  const t = e && e.global && e.global.version || 0;
  ns(t, $o, e.global);
  for (const o of e.inputs)
    ns(t, _i, o);
  for (const o of e.outputs)
    ns(t, ar, o);
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
function Ds(e, t, n, r, i) {
  const s = { ...n, ...t };
  for (const o in e) {
    const a = o, [c, u, l] = e[a], f = r && !r.includes(o);
    if (t[o] === void 0 && o in t) {
      if (f)
        throw new Error(`Cannot remove signed field=${o}`);
      delete s[o];
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
            typeof g[0] == "string" ? u.decode(O.decode(g[0])) : g[0],
            typeof g[1] == "string" ? l.decode(O.decode(g[1])) : g[1]
          ];
        });
        const y = {}, d = (g, m, S) => {
          if (y[g] === void 0) {
            y[g] = [m, S];
            return;
          }
          const I = O.encode(l.encode(y[g][1])), L = O.encode(l.encode(S));
          if (I !== L)
            throw new Error(`keyMap(${a}): same key=${g} oldVal=${I} newVal=${L}`);
        };
        for (const [g, m] of h) {
          const S = O.encode(u.encode(g));
          d(S, g, m);
        }
        for (const [g, m] of p) {
          const S = O.encode(u.encode(g));
          if (m === void 0) {
            if (f)
              throw new Error(`Cannot remove signed field=${a}/${g}`);
            delete y[S];
          } else
            d(S, g, m);
        }
        s[a] = Object.values(y);
      }
    } else if (typeof s[o] == "string")
      s[o] = l.decode(O.decode(s[o]));
    else if (f && o in t && n && n[o] !== void 0 && !ht(l.encode(t[o]), l.encode(n[o])))
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
const $a = Nt(uh, Yu), Na = Nt(lh, Yu), fh = {
  encode(e) {
    if (!(e.length !== 2 || e[0] !== 1 || !it(e[1]) || O.encode(e[1]) !== "4e73"))
      return { type: "p2a", script: j.encode(e) };
  },
  decode: (e) => {
    if (e.type === "p2a")
      return [1, O.decode("4e73")];
  }
};
function yn(e, t) {
  try {
    return kn(e, t), !0;
  } catch {
    return !1;
  }
}
const dh = {
  encode(e) {
    if (!(e.length !== 2 || !it(e[0]) || !yn(e[0], Ct.ecdsa) || e[1] !== "CHECKSIG"))
      return { type: "pk", pubkey: e[0] };
  },
  decode: (e) => e.type === "pk" ? [e.pubkey, "CHECKSIG"] : void 0
}, hh = {
  encode(e) {
    if (!(e.length !== 5 || e[0] !== "DUP" || e[1] !== "HASH160" || !it(e[2])) && !(e[3] !== "EQUALVERIFY" || e[4] !== "CHECKSIG"))
      return { type: "pkh", hash: e[2] };
  },
  decode: (e) => e.type === "pkh" ? ["DUP", "HASH160", e.hash, "EQUALVERIFY", "CHECKSIG"] : void 0
}, ph = {
  encode(e) {
    if (!(e.length !== 3 || e[0] !== "HASH160" || !it(e[1]) || e[2] !== "EQUAL"))
      return { type: "sh", hash: e[1] };
  },
  decode: (e) => e.type === "sh" ? ["HASH160", e.hash, "EQUAL"] : void 0
}, gh = {
  encode(e) {
    if (!(e.length !== 2 || e[0] !== 0 || !it(e[1])) && e[1].length === 32)
      return { type: "wsh", hash: e[1] };
  },
  decode: (e) => e.type === "wsh" ? [0, e.hash] : void 0
}, yh = {
  encode(e) {
    if (!(e.length !== 2 || e[0] !== 0 || !it(e[1])) && e[1].length === 20)
      return { type: "wpkh", hash: e[1] };
  },
  decode: (e) => e.type === "wpkh" ? [0, e.hash] : void 0
}, wh = {
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
        if (!it(s))
          return;
      return { type: "ms", m: n, pubkeys: i };
    }
  },
  // checkmultisig(n, ..pubkeys, m)
  decode: (e) => e.type === "ms" ? [e.m, ...e.pubkeys, e.pubkeys.length, "CHECKMULTISIG"] : void 0
}, mh = {
  encode(e) {
    if (!(e.length !== 2 || e[0] !== 1 || !it(e[1])))
      return { type: "tr", pubkey: e[1] };
  },
  decode: (e) => e.type === "tr" ? [1, e.pubkey] : void 0
}, bh = {
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
      if (!it(i))
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
}, Eh = {
  encode(e) {
    const t = e.length - 1;
    if (e[t] !== "NUMEQUAL" || e[1] !== "CHECKSIG")
      return;
    const n = [], r = Jd(e[t - 1]);
    if (typeof r == "number") {
      for (let i = 0; i < t - 1; i++) {
        const s = e[i];
        if (i & 1) {
          if (s !== (i === 1 ? "CHECKSIG" : "CHECKSIGADD"))
            throw new Error("OutScript.encode/tr_ms: wrong element");
          continue;
        }
        if (!it(s))
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
}, xh = {
  encode(e) {
    return { type: "unknown", script: j.encode(e) };
  },
  decode: (e) => e.type === "unknown" ? j.decode(e.script) : void 0
}, Th = [
  fh,
  dh,
  hh,
  ph,
  gh,
  yh,
  wh,
  mh,
  bh,
  Eh,
  xh
], Sh = He(j, Li.match(Th)), lt = Nt(Sh, (e) => {
  if (e.type === "pk" && !yn(e.pubkey, Ct.ecdsa))
    throw new Error("OutScript/pk: wrong key");
  if ((e.type === "pkh" || e.type === "sh" || e.type === "wpkh") && (!it(e.hash) || e.hash.length !== 20))
    throw new Error(`OutScript/${e.type}: wrong hash`);
  if (e.type === "wsh" && (!it(e.hash) || e.hash.length !== 32))
    throw new Error("OutScript/wsh: wrong hash");
  if (e.type === "tr" && (!it(e.pubkey) || !yn(e.pubkey, Ct.schnorr)))
    throw new Error("OutScript/tr: wrong taproot public key");
  if ((e.type === "ms" || e.type === "tr_ns" || e.type === "tr_ms") && !Array.isArray(e.pubkeys))
    throw new Error("OutScript/multisig: wrong pubkeys array");
  if (e.type === "ms") {
    const t = e.pubkeys.length;
    for (const n of e.pubkeys)
      if (!yn(n, Ct.ecdsa))
        throw new Error("OutScript/multisig: wrong pubkey");
    if (e.m <= 0 || t > 16 || e.m > t)
      throw new Error("OutScript/multisig: invalid params");
  }
  if (e.type === "tr_ns" || e.type === "tr_ms") {
    for (const t of e.pubkeys)
      if (!yn(t, Ct.schnorr))
        throw new Error(`OutScript/${e.type}: wrong pubkey`);
  }
  if (e.type === "tr_ms") {
    const t = e.pubkeys.length;
    if (e.m <= 0 || t > 999 || e.m > t)
      throw new Error("OutScript/tr_ms: invalid params");
  }
  return e;
});
function Ra(e, t) {
  if (!ht(e.hash, xt(t)))
    throw new Error("checkScript: wsh wrong witnessScript hash");
  const n = lt.decode(t);
  if (n.type === "tr" || n.type === "tr_ns" || n.type === "tr_ms")
    throw new Error(`checkScript: P2${n.type} cannot be wrapped in P2SH`);
  if (n.type === "wpkh" || n.type === "sh")
    throw new Error(`checkScript: P2${n.type} cannot be wrapped in P2WSH`);
}
function Zu(e, t, n) {
  if (e) {
    const r = lt.decode(e);
    if (r.type === "tr_ns" || r.type === "tr_ms" || r.type === "ms" || r.type == "pk")
      throw new Error(`checkScript: non-wrapped ${r.type}`);
    if (r.type === "sh" && t) {
      if (!ht(r.hash, Fu(t)))
        throw new Error("checkScript: sh wrong redeemScript hash");
      const i = lt.decode(t);
      if (i.type === "tr" || i.type === "tr_ns" || i.type === "tr_ms")
        throw new Error(`checkScript: P2${i.type} cannot be wrapped in P2SH`);
      if (i.type === "sh")
        throw new Error("checkScript: P2SH cannot be wrapped in P2SH");
    }
    r.type === "wsh" && n && Ra(r, n);
  }
  if (t) {
    const r = lt.decode(t);
    r.type === "wsh" && n && Ra(r, n);
  }
}
function vh(e) {
  const t = {};
  for (const n of e) {
    const r = O.encode(n);
    if (t[r])
      throw new Error(`Multisig: non-uniq pubkey: ${e.map(O.encode)}`);
    t[r] = !0;
  }
}
function Ah(e, t, n = !1, r) {
  const i = lt.decode(e);
  if (i.type === "unknown" && n)
    return;
  if (!["tr_ns", "tr_ms"].includes(i.type))
    throw new Error(`P2TR: invalid leaf script=${i.type}`);
  const s = i;
  if (!n && s.pubkeys)
    for (const o of s.pubkeys) {
      if (ht(o, Oo))
        throw new Error("Unspendable taproot key in leaf script");
      if (ht(o, t))
        throw new Error("Using P2TR with leaf script with same key as internal key is not supported");
    }
}
function Xu(e) {
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
function Vs(e, t = []) {
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
    left: Vs(e.left, [e.right.hash, ...t]),
    right: Vs(e.right, [e.left.hash, ...t])
  };
}
function Ms(e) {
  if (!e)
    throw new Error("taprootAddPath: empty tree");
  if (e.type === "leaf")
    return [e];
  if (e.type !== "branch")
    throw new Error(`taprootWalkTree: wrong type=${e}`);
  return [...Ms(e.left), ...Ms(e.right)];
}
function Hs(e, t, n = !1, r) {
  if (!e)
    throw new Error("taprootHashTree: empty tree");
  if (Array.isArray(e) && e.length === 1 && (e = e[0]), !Array.isArray(e)) {
    const { leafVersion: c, script: u } = e;
    if (e.tapLeafScript || e.tapMerkleRoot && !ht(e.tapMerkleRoot, ct))
      throw new Error("P2TR: tapRoot leafScript cannot have tree");
    const l = typeof u == "string" ? O.decode(u) : u;
    if (!it(l))
      throw new Error(`checkScript: wrong script type=${l}`);
    return Ah(l, t, n), {
      type: "leaf",
      version: c,
      script: l,
      hash: Jn(l, c)
    };
  }
  if (e.length !== 2 && (e = Xu(e)), e.length !== 2)
    throw new Error("hashTree: non binary tree!");
  const i = Hs(e[0], t, n), s = Hs(e[1], t, n);
  let [o, a] = [i.hash, s.hash];
  return ri(a, o) === -1 && ([o, a] = [a, o]), { type: "branch", left: i, right: s, hash: ko("TapBranch", o, a) };
}
const cr = 192, Jn = (e, t = cr) => ko("TapLeaf", new Uint8Array([t]), qt.encode(e));
function Ih(e, t, n = On, r = !1, i) {
  if (!e && !t)
    throw new Error("p2tr: should have pubKey or scriptTree (or both)");
  const s = typeof e == "string" ? O.decode(e) : e || Oo;
  if (!yn(s, Ct.schnorr))
    throw new Error("p2tr: non-schnorr pubkey");
  if (t) {
    let o = Vs(Hs(t, s, r));
    const a = o.hash, [c, u] = Cs(s, a), l = Ms(o).map((f) => ({
      ...f,
      controlBlock: ie.encode({
        version: (f.version || cr) + u,
        internalKey: s,
        merklePath: f.path
      })
    }));
    return {
      type: "tr",
      script: lt.encode({ type: "tr", pubkey: c }),
      address: Fe(n).encode({ type: "tr", pubkey: c }),
      // For tests
      tweakedPubkey: c,
      // PSBT stuff
      tapInternalKey: s,
      leaves: l,
      tapLeafScript: l.map((f) => [
        ie.decode(f.controlBlock),
        Ue(f.script, new Uint8Array([f.version || cr]))
      ]),
      tapMerkleRoot: a
    };
  } else {
    const o = Cs(s, ct)[0];
    return {
      type: "tr",
      script: lt.encode({ type: "tr", pubkey: o }),
      address: Fe(n).encode({ type: "tr", pubkey: o }),
      // For tests
      tweakedPubkey: o,
      // PSBT stuff
      tapInternalKey: s
    };
  }
}
function kh(e, t, n = !1) {
  return n || vh(t), {
    type: "tr_ms",
    script: lt.encode({ type: "tr_ms", pubkeys: t, m: e })
  };
}
const Qu = $d(xt);
function Ju(e, t) {
  if (t.length < 2 || t.length > 40)
    throw new Error("Witness: invalid length");
  if (e > 16)
    throw new Error("Witness: invalid version");
  if (e === 0 && !(t.length === 20 || t.length === 32))
    throw new Error("Witness: invalid length for version");
}
function rs(e, t, n = On) {
  Ju(e, t);
  const r = e === 0 ? Rs : pn;
  return r.encode(n.bech32, [e].concat(r.toWords(t)));
}
function Ua(e, t) {
  return Qu.encode(Ue(Uint8Array.from(t), e));
}
function Fe(e = On) {
  return {
    encode(t) {
      const { type: n } = t;
      if (n === "wpkh")
        return rs(0, t.hash, e);
      if (n === "wsh")
        return rs(0, t.hash, e);
      if (n === "tr")
        return rs(1, t.pubkey, e);
      if (n === "pkh")
        return Ua(t.hash, [e.pubKeyHash]);
      if (n === "sh")
        return Ua(t.hash, [e.scriptHash]);
      throw new Error(`Unknown address type=${n}`);
    },
    decode(t) {
      if (t.length < 14 || t.length > 74)
        throw new Error("Invalid address length");
      if (e.bech32 && t.toLowerCase().startsWith(`${e.bech32}1`)) {
        let r;
        try {
          if (r = Rs.decode(t), r.words[0] !== 0)
            throw new Error(`bech32: wrong version=${r.words[0]}`);
        } catch {
          if (r = pn.decode(t), r.words[0] === 0)
            throw new Error(`bech32m: wrong version=${r.words[0]}`);
        }
        if (r.prefix !== e.bech32)
          throw new Error(`wrong bech32 prefix=${r.prefix}`);
        const [i, ...s] = r.words, o = Rs.fromWords(s);
        if (Ju(i, o), i === 0 && o.length === 32)
          return { type: "wsh", hash: o };
        if (i === 0 && o.length === 20)
          return { type: "wpkh", hash: o };
        if (i === 1 && o.length === 32)
          return { type: "tr", pubkey: o };
        throw new Error("Unknown witness program");
      }
      const n = Qu.decode(t);
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
const Ir = new Uint8Array(32), Oh = {
  amount: 0xffffffffffffffffn,
  script: ct
}, Bh = (e) => Math.ceil(e / 4), $h = 8, Nh = 2, Ze = 0, Lo = 4294967295;
Li.decimal($h);
const tr = (e, t) => e === void 0 ? t : e;
function oi(e) {
  if (Array.isArray(e))
    return e.map((t) => oi(t));
  if (it(e))
    return Uint8Array.from(e);
  if (["number", "bigint", "boolean", "string", "undefined"].includes(typeof e))
    return e;
  if (e === null)
    return e;
  if (typeof e == "object")
    return Object.fromEntries(Object.entries(e).map(([t, n]) => [t, oi(n)]));
  throw new Error(`cloneDeep: unknown type=${e} (${typeof e})`);
}
const Z = {
  DEFAULT: 0,
  ALL: 1,
  NONE: 2,
  SINGLE: 3,
  ANYONECANPAY: 128
}, Ke = {
  DEFAULT: Z.DEFAULT,
  ALL: Z.ALL,
  NONE: Z.NONE,
  SINGLE: Z.SINGLE,
  DEFAULT_ANYONECANPAY: Z.DEFAULT | Z.ANYONECANPAY,
  ALL_ANYONECANPAY: Z.ALL | Z.ANYONECANPAY,
  NONE_ANYONECANPAY: Z.NONE | Z.ANYONECANPAY,
  SINGLE_ANYONECANPAY: Z.SINGLE | Z.ANYONECANPAY
}, Rh = ju(Ke);
function Uh(e, t, n, r = ct) {
  return ht(n, t) && (e = Xd(e, r), t = Io(e)), { privKey: e, pubKey: t };
}
function Xe(e) {
  if (e.script === void 0 || e.amount === void 0)
    throw new Error("Transaction/output: script and amount required");
  return { script: e.script, amount: e.amount };
}
function jn(e) {
  if (e.txid === void 0 || e.index === void 0)
    throw new Error("Transaction/input: txid and index required");
  return {
    txid: e.txid,
    index: e.index,
    sequence: tr(e.sequence, Lo),
    finalScriptSig: tr(e.finalScriptSig, ct)
  };
}
function is(e) {
  for (const t in e) {
    const n = t;
    oh.includes(n) || delete e[n];
  }
}
const ss = Et({ txid: ot(32, !0), index: tt });
function Lh(e) {
  if (typeof e != "number" || typeof Rh[e] != "string")
    throw new Error(`Invalid SigHash=${e}`);
  return e;
}
function La(e) {
  const t = e & 31;
  return {
    isAny: !!(e & Z.ANYONECANPAY),
    isNone: t === Z.NONE,
    isSingle: t === Z.SINGLE
  };
}
function Ch(e) {
  if (e !== void 0 && {}.toString.call(e) !== "[object Object]")
    throw new Error(`Wrong object type for transaction options: ${e}`);
  const t = {
    ...e,
    // Defaults
    version: tr(e.version, Nh),
    lockTime: tr(e.lockTime, 0),
    PSBTVersion: tr(e.PSBTVersion, 0)
  };
  if (typeof t.allowUnknowInput < "u" && (e.allowUnknownInputs = t.allowUnknowInput), typeof t.allowUnknowOutput < "u" && (e.allowUnknownOutputs = t.allowUnknowOutput), typeof t.lockTime != "number")
    throw new Error("Transaction lock time should be number");
  if (tt.encode(t.lockTime), t.PSBTVersion !== 0 && t.PSBTVersion !== 2)
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
function Ca(e) {
  if (e.nonWitnessUtxo && e.index !== void 0) {
    const t = e.nonWitnessUtxo.outputs.length - 1;
    if (e.index > t)
      throw new Error(`validateInput: index(${e.index}) not in nonWitnessUtxo`);
    const n = e.nonWitnessUtxo.outputs[e.index];
    if (e.witnessUtxo && (!ht(e.witnessUtxo.script, n.script) || e.witnessUtxo.amount !== n.amount))
      throw new Error("validateInput: witnessUtxo different from nonWitnessUtxo");
    if (e.txid) {
      if (e.nonWitnessUtxo.outputs.length - 1 < e.index)
        throw new Error("nonWitnessUtxo: incorect output index");
      const i = Yt.fromRaw(mn.encode(e.nonWitnessUtxo), {
        allowUnknownOutputs: !0,
        disableScriptCheck: !0,
        allowUnknownInputs: !0
      }), s = O.encode(e.txid);
      if (i.isFinal && i.id !== s)
        throw new Error(`nonWitnessUtxo: wrong txid, exp=${s} got=${i.id}`);
    }
  }
  return e;
}
function Mr(e) {
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
function Pa(e, t, n, r = !1, i = !1) {
  let { nonWitnessUtxo: s, txid: o } = e;
  typeof s == "string" && (s = O.decode(s)), it(s) && (s = mn.decode(s)), !("nonWitnessUtxo" in e) && s === void 0 && (s = t?.nonWitnessUtxo), typeof o == "string" && (o = O.decode(o)), o === void 0 && (o = t?.txid);
  let a = { ...t, ...e, nonWitnessUtxo: s, txid: o };
  !("nonWitnessUtxo" in e) && a.nonWitnessUtxo === void 0 && delete a.nonWitnessUtxo, a.sequence === void 0 && (a.sequence = Lo), a.tapMerkleRoot === null && delete a.tapMerkleRoot, a = Ds(_i, a, t, n, i), Ro.encode(a);
  let c;
  return a.nonWitnessUtxo && a.index !== void 0 ? c = a.nonWitnessUtxo.outputs[a.index] : a.witnessUtxo && (c = a.witnessUtxo), c && !r && Zu(c && c.script, a.redeemScript, a.witnessScript), a;
}
function _a(e, t = !1) {
  let n = "legacy", r = Z.ALL;
  const i = Mr(e), s = lt.decode(i.script);
  let o = s.type, a = s;
  const c = [s];
  if (s.type === "tr")
    return r = Z.DEFAULT, {
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
      let h = lt.decode(e.redeemScript);
      (h.type === "wpkh" || h.type === "wsh") && (n = "segwit"), c.push(h), a = h, o += `-${h.type}`;
    }
    if (a.type === "wsh") {
      if (!e.witnessScript)
        throw new Error("inputType: wsh without witnessScript");
      let h = lt.decode(e.witnessScript);
      h.type === "wsh" && (n = "segwit"), c.push(h), a = h, o += `-${h.type}`;
    }
    const u = c[c.length - 1];
    if (u.type === "sh" || u.type === "wsh")
      throw new Error("inputType: sh/wsh cannot be terminal type");
    const l = lt.encode(u), f = {
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
let Yt = class Hr {
  global = {};
  inputs = [];
  // use getInput()
  outputs = [];
  // use getOutput()
  opts;
  constructor(t = {}) {
    const n = this.opts = Ch(t);
    n.lockTime !== Ze && (this.global.fallbackLocktime = n.lockTime), this.global.txVersion = n.version;
  }
  // Import
  static fromRaw(t, n = {}) {
    const r = mn.decode(t), i = new Hr({ ...n, version: r.version, lockTime: r.lockTime });
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
      r = $a.decode(t);
    } catch (f) {
      try {
        r = Na.decode(t);
      } catch {
        throw f;
      }
    }
    const i = r.global.version || 0;
    if (i !== 0 && i !== 2)
      throw new Error(`Wrong PSBT version=${i}`);
    const s = r.global.unsignedTx, o = i === 0 ? s?.version : r.global.txVersion, a = i === 0 ? s?.lockTime : r.global.fallbackLocktime, c = new Hr({ ...n, version: o, lockTime: a, PSBTVersion: i }), u = i === 0 ? s?.inputs.length : r.global.inputCount;
    c.inputs = r.inputs.slice(0, u).map((f, h) => Ca({
      finalScriptSig: ct,
      ...r.global.unsignedTx?.inputs[h],
      ...f
    }));
    const l = i === 0 ? s?.outputs.length : r.global.outputCount;
    return c.outputs = r.outputs.slice(0, l).map((f, h) => ({
      ...f,
      ...r.global.unsignedTx?.outputs[h]
    })), c.global = { ...r.global, txVersion: o }, a !== Ze && (c.global.fallbackLocktime = a), c;
  }
  toPSBT(t = this.opts.PSBTVersion) {
    if (t !== 0 && t !== 2)
      throw new Error(`Wrong PSBT version=${t}`);
    const n = this.inputs.map((s) => Ca(Ba(t, _i, s)));
    for (const s of n)
      s.partialSig && !s.partialSig.length && delete s.partialSig, s.finalScriptSig && !s.finalScriptSig.length && delete s.finalScriptSig, s.finalScriptWitness && !s.finalScriptWitness.length && delete s.finalScriptWitness;
    const r = this.outputs.map((s) => Ba(t, ar, s)), i = { ...this.global };
    return t === 0 ? (i.unsignedTx = Xn.decode(Xn.encode({
      version: this.version,
      lockTime: this.lockTime,
      inputs: this.inputs.map(jn).map((s) => ({
        ...s,
        finalScriptSig: ct
      })),
      outputs: this.outputs.map(Xe)
    })), delete i.fallbackLocktime, delete i.txVersion) : (i.version = t, i.txVersion = this.version, i.inputCount = this.inputs.length, i.outputCount = this.outputs.length, i.fallbackLocktime && i.fallbackLocktime === Ze && delete i.fallbackLocktime), this.opts.bip174jsCompat && (n.length || n.push({}), r.length || r.push({})), (t === 0 ? $a : Na).encode({
      global: i,
      inputs: n,
      outputs: r
    });
  }
  // BIP370 lockTime (https://github.com/bitcoin/bips/blob/master/bip-0370.mediawiki#determining-lock-time)
  get lockTime() {
    let t = Ze, n = 0, r = Ze, i = 0;
    for (const s of this.inputs)
      s.requiredHeightLocktime && (t = Math.max(t, s.requiredHeightLocktime), n++), s.requiredTimeLocktime && (r = Math.max(r, s.requiredTimeLocktime), i++);
    return n && n >= i ? t : r !== Ze ? r : this.global.fallbackLocktime || Ze;
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
    const n = this.inputs[t].sighashType, r = n === void 0 ? Z.DEFAULT : n, i = r === Z.DEFAULT ? Z.ALL : r & 3;
    return { sigInputs: r & Z.ANYONECANPAY, sigOutputs: i };
  }
  // Very nice for debug purposes, but slow. If there is too much inputs/outputs to add, will be quadratic.
  // Some cache will be nice, but there chance to have bugs with cache invalidation
  signStatus() {
    let t = !0, n = !0, r = [], i = [];
    for (let s = 0; s < this.inputs.length; s++) {
      if (this.inputStatus(s) === "unsigned")
        continue;
      const { sigInputs: a, sigOutputs: c } = this.inputSighash(s);
      if (a === Z.ANYONECANPAY ? r.push(s) : t = !1, c === Z.ALL)
        n = !1;
      else if (c === Z.SINGLE)
        i.push(s);
      else if (c !== Z.NONE) throw new Error(`Wrong signature hash output type: ${c}`);
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
    const n = this.outputs.map(Xe);
    t += 4 * Jt.encode(this.outputs.length).length;
    for (const r of n)
      t += 32 + 4 * qt.encode(r.script).length;
    this.hasWitnesses && (t += 2), t += 4 * Jt.encode(this.inputs.length).length;
    for (const r of this.inputs)
      t += 160 + 4 * qt.encode(r.finalScriptSig || ct).length, this.hasWitnesses && r.finalScriptWitness && (t += or.encode(r.finalScriptWitness).length);
    return t;
  }
  get vsize() {
    return Bh(this.weight);
  }
  toBytes(t = !1, n = !1) {
    return mn.encode({
      version: this.version,
      lockTime: this.lockTime,
      inputs: this.inputs.map(jn).map((r) => ({
        ...r,
        finalScriptSig: t && r.finalScriptSig || ct
      })),
      outputs: this.outputs.map(Xe),
      witnesses: this.inputs.map((r) => r.finalScriptWitness || []),
      segwitFlag: n && this.hasWitnesses
    });
  }
  get unsignedTx() {
    return this.toBytes(!1, !1);
  }
  get hex() {
    return O.encode(this.toBytes(!0, this.hasWitnesses));
  }
  get hash() {
    return O.encode(Oe(this.toBytes(!0)));
  }
  get id() {
    return O.encode(Oe(this.toBytes(!0)).reverse());
  }
  // Input stuff
  checkInputIdx(t) {
    if (!Number.isSafeInteger(t) || 0 > t || t >= this.inputs.length)
      throw new Error(`Wrong input index=${t}`);
  }
  getInput(t) {
    return this.checkInputIdx(t), oi(this.inputs[t]);
  }
  get inputsLength() {
    return this.inputs.length;
  }
  // Modification
  addInput(t, n = !1) {
    if (!n && !this.signStatus().addInput)
      throw new Error("Tx has signed inputs, cannot add new one");
    return this.inputs.push(Pa(t, void 0, void 0, this.opts.disableScriptCheck)), this.inputs.length - 1;
  }
  updateInput(t, n, r = !1) {
    this.checkInputIdx(t);
    let i;
    if (!r) {
      const s = this.signStatus();
      (!s.addInput || s.inputs.includes(t)) && (i = ah);
    }
    this.inputs[t] = Pa(n, this.inputs[t], i, this.opts.disableScriptCheck, this.opts.allowUnknown);
  }
  // Output stuff
  checkOutputIdx(t) {
    if (!Number.isSafeInteger(t) || 0 > t || t >= this.outputs.length)
      throw new Error(`Wrong output index=${t}`);
  }
  getOutput(t) {
    return this.checkOutputIdx(t), oi(this.outputs[t]);
  }
  getOutputAddress(t, n = On) {
    const r = this.getOutput(t);
    if (r.script)
      return Fe(n).encode(lt.decode(r.script));
  }
  get outputsLength() {
    return this.outputs.length;
  }
  normalizeOutput(t, n, r) {
    let { amount: i, script: s } = t;
    if (i === void 0 && (i = n?.amount), typeof i != "bigint")
      throw new Error(`Wrong amount type, should be of type bigint in sats, but got ${i} of type ${typeof i}`);
    typeof s == "string" && (s = O.decode(s)), s === void 0 && (s = n?.script);
    let o = { ...n, ...t, amount: i, script: s };
    if (o.amount === void 0 && delete o.amount, o = Ds(ar, o, n, r, this.opts.allowUnknown), Uo.encode(o), o.script && !this.opts.allowUnknownOutputs && lt.decode(o.script).type === "unknown")
      throw new Error("Transaction/output: unknown output script type, there is a chance that input is unspendable. Pass allowUnknownOutputs=true, if you sure");
    return this.opts.disableScriptCheck || Zu(o.script, o.redeemScript, o.witnessScript), o;
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
      (!s.addOutput || s.outputs.includes(t)) && (i = ch);
    }
    this.outputs[t] = this.normalizeOutput(n, this.outputs[t], i);
  }
  addOutputAddress(t, n, r = On) {
    return this.addOutput({ script: lt.encode(Fe(r).decode(t)), amount: n });
  }
  // Utils
  get fee() {
    let t = 0n;
    for (const r of this.inputs) {
      const i = Mr(r);
      if (!i)
        throw new Error("Empty input amount");
      t += i.amount;
    }
    const n = this.outputs.map(Xe);
    for (const r of n)
      t -= r.amount;
    return t;
  }
  // Signing
  // Based on https://github.com/bitcoin/bitcoin/blob/5871b5b5ab57a0caf9b7514eb162c491c83281d5/test/functional/test_framework/script.py#L624
  // There is optimization opportunity to re-use hashes for multiple inputs for witness v0/v1,
  // but we are trying to be less complicated for audit purpose for now.
  preimageLegacy(t, n, r) {
    const { isAny: i, isNone: s, isSingle: o } = La(r);
    if (t < 0 || !Number.isSafeInteger(t))
      throw new Error(`Invalid input idx=${t}`);
    if (o && t >= this.outputs.length || t >= this.inputs.length)
      return Vu.encode(1n);
    n = j.encode(j.decode(n).filter((l) => l !== "CODESEPARATOR"));
    let a = this.inputs.map(jn).map((l, f) => ({
      ...l,
      finalScriptSig: f === t ? n : ct
    }));
    i ? a = [a[t]] : (s || o) && (a = a.map((l, f) => ({
      ...l,
      sequence: f === t ? l.sequence : 0
    })));
    let c = this.outputs.map(Xe);
    s ? c = [] : o && (c = c.slice(0, t).fill(Oh).concat([c[t]]));
    const u = mn.encode({
      lockTime: this.lockTime,
      version: this.version,
      segwitFlag: !1,
      inputs: a,
      outputs: c
    });
    return Oe(u, gn.encode(r));
  }
  preimageWitnessV0(t, n, r, i) {
    const { isAny: s, isNone: o, isSingle: a } = La(r);
    let c = Ir, u = Ir, l = Ir;
    const f = this.inputs.map(jn), h = this.outputs.map(Xe);
    s || (c = Oe(...f.map(ss.encode))), !s && !a && !o && (u = Oe(...f.map((y) => tt.encode(y.sequence)))), !a && !o ? l = Oe(...h.map(nn.encode)) : a && t < h.length && (l = Oe(nn.encode(h[t])));
    const p = f[t];
    return Oe(gn.encode(this.version), c, u, ot(32, !0).encode(p.txid), tt.encode(p.index), qt.encode(n), Vr.encode(i), tt.encode(p.sequence), l, tt.encode(this.lockTime), tt.encode(r));
  }
  preimageWitnessV1(t, n, r, i, s = -1, o, a = 192, c) {
    if (!Array.isArray(i) || this.inputs.length !== i.length)
      throw new Error(`Invalid amounts array=${i}`);
    if (!Array.isArray(n) || this.inputs.length !== n.length)
      throw new Error(`Invalid prevOutScript array=${n}`);
    const u = [
      Ce.encode(0),
      Ce.encode(r),
      // U8 sigHash
      gn.encode(this.version),
      tt.encode(this.lockTime)
    ], l = r === Z.DEFAULT ? Z.ALL : r & 3, f = r & Z.ANYONECANPAY, h = this.inputs.map(jn), p = this.outputs.map(Xe);
    f !== Z.ANYONECANPAY && u.push(...[
      h.map(ss.encode),
      i.map(Vr.encode),
      n.map(qt.encode),
      h.map((d) => tt.encode(d.sequence))
    ].map((d) => xt(Ue(...d)))), l === Z.ALL && u.push(xt(Ue(...p.map(nn.encode))));
    const y = (c ? 1 : 0) | (o ? 2 : 0);
    if (u.push(new Uint8Array([y])), f === Z.ANYONECANPAY) {
      const d = h[t];
      u.push(ss.encode(d), Vr.encode(i[t]), qt.encode(n[t]), tt.encode(d.sequence));
    } else
      u.push(tt.encode(t));
    return y & 1 && u.push(xt(qt.encode(c || ct))), l === Z.SINGLE && u.push(t < p.length ? xt(nn.encode(p[t])) : Ir), o && u.push(Jn(o, a), Ce.encode(0), gn.encode(s)), ko("TapSighash", ...u);
  }
  // Signer can be privateKey OR instance of bip32 HD stuff
  signIdx(t, n, r, i) {
    this.checkInputIdx(n);
    const s = this.inputs[n], o = _a(s, this.opts.allowLegacyWitnessUtxo);
    if (!it(t)) {
      if (!s.bip32Derivation || !s.bip32Derivation.length)
        throw new Error("bip32Derivation: empty");
      const l = s.bip32Derivation.filter((h) => h[1].fingerprint == t.fingerprint).map(([h, { path: p }]) => {
        let y = t;
        for (const d of p)
          y = y.deriveChild(d);
        if (!ht(y.publicKey, h))
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
    r ? r.forEach(Lh) : r = [o.defaultSighash];
    const a = o.sighash;
    if (!r.includes(a))
      throw new Error(`Input with not allowed sigHash=${a}. Allowed: ${r.join(", ")}`);
    const { sigOutputs: c } = this.inputSighash(n);
    if (c === Z.SINGLE && n >= this.outputs.length)
      throw new Error(`Input with sighash SINGLE, but there is no output with corresponding index=${n}`);
    const u = Mr(s);
    if (o.txType === "taproot") {
      const l = this.inputs.map(Mr), f = l.map((g) => g.script), h = l.map((g) => g.amount);
      let p = !1, y = Io(t), d = s.tapMerkleRoot || ct;
      if (s.tapInternalKey) {
        const { pubKey: g, privKey: m } = Uh(t, y, s.tapInternalKey, d), [S] = Cs(s.tapInternalKey, d);
        if (ht(S, g)) {
          const I = this.preimageWitnessV1(n, f, a, h), L = Ue(va(I, m, i), a !== Z.DEFAULT ? new Uint8Array([a]) : ct);
          this.updateInput(n, { tapKeySig: L }, !0), p = !0;
        }
      }
      if (s.tapLeafScript) {
        s.tapScriptSig = s.tapScriptSig || [];
        for (const [g, m] of s.tapLeafScript) {
          const S = m.subarray(0, -1), I = j.decode(S), L = m[m.length - 1], R = Jn(S, L);
          if (I.findIndex((C) => it(C) && ht(C, y)) === -1)
            continue;
          const x = this.preimageWitnessV1(n, f, a, h, void 0, S, L), Q = Ue(va(x, t, i), a !== Z.DEFAULT ? new Uint8Array([a]) : ct);
          this.updateInput(n, { tapScriptSig: [[{ pubKey: y, leafHash: R }, Q]] }, !0), p = !0;
        }
      }
      if (!p)
        throw new Error("No taproot scripts signed");
      return !0;
    } else {
      const l = Ku(t);
      let f = !1;
      const h = Fu(l);
      for (const d of j.decode(o.lastScript))
        it(d) && (ht(d, l) || ht(d, h)) && (f = !0);
      if (!f)
        throw new Error(`Input script doesn't have pubKey: ${o.lastScript}`);
      let p;
      if (o.txType === "legacy")
        p = this.preimageLegacy(n, o.lastScript, a);
      else if (o.txType === "segwit") {
        let d = o.lastScript;
        o.last.type === "wpkh" && (d = lt.encode({ type: "pkh", hash: o.last.hash })), p = this.preimageWitnessV0(n, d, a, u.amount);
      } else
        throw new Error(`Transaction/sign: unknown tx type: ${o.txType}`);
      const y = Zd(p, t, this.opts.lowR);
      this.updateInput(n, {
        partialSig: [[l, Ue(y, new Uint8Array([a]))]]
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
    const n = this.inputs[t], r = _a(n, this.opts.allowLegacyWitnessUtxo);
    if (r.txType === "taproot") {
      if (n.tapKeySig)
        n.finalScriptWitness = [n.tapKeySig];
      else if (n.tapLeafScript && n.tapScriptSig) {
        const c = n.tapLeafScript.sort((u, l) => ie.encode(u[0]).length - ie.encode(l[0]).length);
        for (const [u, l] of c) {
          const f = l.slice(0, -1), h = l[l.length - 1], p = lt.decode(f), y = Jn(f, h), d = n.tapScriptSig.filter((m) => ht(m[0].leafHash, y));
          let g = [];
          if (p.type === "tr_ms") {
            const m = p.m, S = p.pubkeys;
            let I = 0;
            for (const L of S) {
              const R = d.findIndex((V) => ht(V[0].pubKey, L));
              if (I === m || R === -1) {
                g.push(ct);
                continue;
              }
              g.push(d[R][1]), I++;
            }
            if (I !== m)
              continue;
          } else if (p.type === "tr_ns") {
            for (const m of p.pubkeys) {
              const S = d.findIndex((I) => ht(I[0].pubKey, m));
              S !== -1 && g.push(d[S][1]);
            }
            if (g.length !== p.pubkeys.length)
              continue;
          } else if (p.type === "unknown" && this.opts.allowUnknownInputs) {
            const m = j.decode(f);
            if (g = d.map(([{ pubKey: S }, I]) => {
              const L = m.findIndex((R) => it(R) && ht(R, S));
              if (L === -1)
                throw new Error("finalize/taproot: cannot find position of pubkey in script");
              return { signature: I, pos: L };
            }).sort((S, I) => S.pos - I.pos).map((S) => S.signature), !g.length)
              continue;
          } else {
            const m = this.opts.customScripts;
            if (m)
              for (const S of m) {
                if (!S.finalizeTaproot)
                  continue;
                const I = j.decode(f), L = S.encode(I);
                if (L === void 0)
                  continue;
                const R = S.finalizeTaproot(f, L, d);
                if (R) {
                  n.finalScriptWitness = R.concat(ie.encode(u)), n.finalScriptSig = ct, is(n);
                  return;
                }
              }
            throw new Error("Finalize: Unknown tapLeafScript");
          }
          n.finalScriptWitness = g.reverse().concat([f, ie.encode(u)]);
          break;
        }
        if (!n.finalScriptWitness)
          throw new Error("finalize/taproot: empty witness");
      } else
        throw new Error("finalize/taproot: unknown input");
      n.finalScriptSig = ct, is(n);
      return;
    }
    if (!n.partialSig || !n.partialSig.length)
      throw new Error("Not enough partial sign");
    let i = ct, s = [];
    if (r.last.type === "ms") {
      const c = r.last.m, u = r.last.pubkeys;
      let l = [];
      for (const f of u) {
        const h = n.partialSig.find((p) => ht(f, p[0]));
        h && l.push(h[1]);
      }
      if (l = l.slice(0, c), l.length !== c)
        throw new Error(`Multisig: wrong signatures count, m=${c} n=${u.length} signatures=${l.length}`);
      i = j.encode([0, ...l]);
    } else if (r.last.type === "pk")
      i = j.encode([n.partialSig[0][1]]);
    else if (r.last.type === "pkh")
      i = j.encode([n.partialSig[0][1], n.partialSig[0][0]]);
    else if (r.last.type === "wpkh")
      i = ct, s = [n.partialSig[0][1], n.partialSig[0][0]];
    else if (r.last.type === "unknown" && !this.opts.allowUnknownInputs)
      throw new Error("Unknown inputs not allowed");
    let o, a;
    if (r.type.includes("wsh-") && (i.length && r.lastScript.length && (s = j.decode(i).map((c) => {
      if (c === 0)
        return ct;
      if (it(c))
        return c;
      throw new Error(`Wrong witness op=${c}`);
    })), s = s.concat(r.lastScript)), r.txType === "segwit" && (a = s), r.type.startsWith("sh-wsh-") ? o = j.encode([j.encode([0, xt(r.lastScript)])]) : r.type.startsWith("sh-") ? o = j.encode([...j.decode(i), r.lastScript]) : r.type.startsWith("wsh-") || r.txType !== "segwit" && (o = i), !o && !a)
      throw new Error("Unknown error finalizing input");
    o && (n.finalScriptSig = o), a && (n.finalScriptWitness = a), is(n);
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
    const n = this.global.unsignedTx ? Xn.encode(this.global.unsignedTx) : ct, r = t.global.unsignedTx ? Xn.encode(t.global.unsignedTx) : ct;
    if (!ht(n, r))
      throw new Error("Transaction/combine: different unsigned tx");
    this.global = Ds($o, this.global, t.global, void 0, this.opts.allowUnknown);
    for (let i = 0; i < this.inputs.length; i++)
      this.updateInput(i, t.inputs[i], !0);
    for (let i = 0; i < this.outputs.length; i++)
      this.updateOutput(i, t.outputs[i], !0);
    return this;
  }
  clone() {
    return Hr.fromPSBT(this.toPSBT(this.opts.PSBTVersion), this.opts);
  }
};
class ze extends Yt {
  constructor(t) {
    super(os(t));
  }
  static fromPSBT(t, n) {
    return Yt.fromPSBT(t, os(n));
  }
  static fromRaw(t, n) {
    return Yt.fromRaw(t, os(n));
  }
}
ze.ARK_TX_OPTS = {
  allowUnknown: !0,
  allowUnknownOutputs: !0,
  allowUnknownInputs: !0
};
function os(e) {
  return { ...ze.ARK_TX_OPTS, ...e };
}
class Co extends Error {
  idx;
  // Indice of participant
  constructor(t, n) {
    super(n), this.idx = t;
  }
}
const { taggedHash: tl, pointToBytes: kr } = Ae.utils, te = Le.Point, G = te.Fn, ue = Le.lengths.publicKey, Fs = new Uint8Array(ue), Da = He(ot(33), {
  decode: (e) => ur(e) ? Fs : e.toBytes(!0),
  encode: (e) => sr(e, Fs) ? te.ZERO : te.fromBytes(e)
}), Va = Nt(Vu, (e) => (nu("n", e, 1n, G.ORDER), e)), bn = Et({ R1: Da, R2: Da }), el = Et({ k1: Va, k2: Va, publicKey: ot(ue) });
function Ma(e, ...t) {
}
function Kt(e, ...t) {
  if (!Array.isArray(e))
    throw new Error("expected array");
  e.forEach((n) => q(n, ...t));
}
function Ha(e) {
  if (!Array.isArray(e))
    throw new Error("expected array");
  e.forEach((t, n) => {
    if (typeof t != "boolean")
      throw new Error("expected boolean in xOnly array, got" + t + "(" + n + ")");
  });
}
const ai = (e, ...t) => G.create(G.fromBytes(tl(e, ...t), !0)), Wn = (e, t) => br(e.y) ? t : G.neg(t);
function rn(e) {
  return te.BASE.multiply(e);
}
function ur(e) {
  return e.equals(te.ZERO);
}
function Ks(e) {
  return Kt(e, ue), e.sort(ri);
}
function nl(e) {
  Kt(e, ue);
  for (let t = 1; t < e.length; t++)
    if (!sr(e[t], e[0]))
      return e[t];
  return Fs;
}
function rl(e) {
  return Kt(e, ue), tl("KeyAgg list", ...e);
}
function il(e, t, n) {
  return q(e, ue), q(t, ue), sr(e, t) ? 1n : ai("KeyAgg coefficient", n, e);
}
function zs(e, t = [], n = []) {
  if (Kt(e, ue), Kt(t, 32), t.length !== n.length)
    throw new Error("The tweaks and isXonly arrays must have the same length");
  const r = nl(e), i = rl(e);
  let s = te.ZERO;
  for (let c = 0; c < e.length; c++) {
    let u;
    try {
      u = te.fromBytes(e[c]);
    } catch {
      throw new Co(c, "pubkey");
    }
    s = s.add(u.multiply(il(e[c], r, i)));
  }
  let o = G.ONE, a = G.ZERO;
  for (let c = 0; c < t.length; c++) {
    const u = n[c] && !br(s.y) ? G.neg(G.ONE) : G.ONE, l = G.fromBytes(t[c]);
    if (s = s.multiply(u).add(rn(l)), ur(s))
      throw new Error("The result of tweaking cannot be infinity");
    o = G.mul(u, o), a = G.add(l, G.mul(u, a));
  }
  return { aggPublicKey: s, gAcc: o, tweakAcc: a };
}
const Fa = (e, t, n, r, i, s) => ai("MuSig/nonce", e, new Uint8Array([t.length]), t, new Uint8Array([n.length]), n, i, gr(s.length, 4), s, new Uint8Array([r]));
function Ph(e, t, n = new Uint8Array(0), r, i = new Uint8Array(0), s = pr(32)) {
  if (q(e, ue), Ma(t, 32), q(n), ![0, 32].includes(n.length))
    throw new Error("wrong aggPublicKey");
  Ma(), q(i), q(s, 32);
  const o = Uint8Array.of(0), a = Fa(s, e, n, 0, o, i), c = Fa(s, e, n, 1, o, i);
  return {
    secret: el.encode({ k1: a, k2: c, publicKey: e }),
    public: bn.encode({ R1: rn(a), R2: rn(c) })
  };
}
function _h(e) {
  Kt(e, 66);
  let t = te.ZERO, n = te.ZERO;
  for (let r = 0; r < e.length; r++) {
    const i = e[r];
    try {
      const { R1: s, R2: o } = bn.decode(i);
      if (ur(s) || ur(o))
        throw new Error("infinity point");
      t = t.add(s), n = n.add(o);
    } catch {
      throw new Co(r, "pubnonce");
    }
  }
  return bn.encode({ R1: t, R2: n });
}
class Dh {
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
    if (Kt(n, 33), Kt(i, 32), Ha(s), q(r), i.length !== s.length)
      throw new Error("The tweaks and isXonly arrays must have the same length");
    const { aggPublicKey: o, gAcc: a, tweakAcc: c } = zs(n, i, s), { R1: u, R2: l } = bn.decode(t);
    this.publicKeys = n, this.Q = o, this.gAcc = a, this.tweakAcc = c, this.b = ai("MuSig/noncecoef", t, kr(o), r);
    const f = u.add(l.multiply(this.b));
    this.R = ur(f) ? te.BASE : f, this.e = ai("BIP0340/challenge", kr(this.R), kr(o), r), this.tweaks = i, this.isXonly = s, this.L = rl(n), this.secondKey = nl(n);
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
    if (!n.some((s) => sr(s, r)))
      throw new Error("The signer's pubkey must be included in the list of pubkeys");
    return il(r, this.secondKey, this.L);
  }
  partialSigVerifyInternal(t, n, r) {
    const { Q: i, gAcc: s, b: o, R: a, e: c } = this, u = G.fromBytes(t, !0);
    if (!G.isValid(u))
      return !1;
    const { R1: l, R2: f } = bn.decode(n), h = l.add(f.multiply(o)), p = br(a.y) ? h : h.negate(), y = te.fromBytes(r), d = this.getSessionKeyAggCoeff(y), g = G.mul(Wn(i, 1n), s), m = rn(u), S = p.add(y.multiply(G.mul(c, G.mul(d, g))));
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
  sign(t, n, r = !1) {
    if (q(n, 32), typeof r != "boolean")
      throw new Error("expected boolean");
    const { Q: i, gAcc: s, b: o, R: a, e: c } = this, { k1: u, k2: l, publicKey: f } = el.decode(t);
    if (t.fill(0, 0, 64), !G.isValid(u))
      throw new Error("wrong k1");
    if (!G.isValid(l))
      throw new Error("wrong k1");
    const h = Wn(a, u), p = Wn(a, l), y = G.fromBytes(n);
    if (G.is0(y))
      throw new Error("wrong d_");
    const d = rn(y), g = d.toBytes(!0);
    if (!sr(g, f))
      throw new Error("Public key does not match nonceGen argument");
    const m = this.getSessionKeyAggCoeff(d), S = Wn(i, 1n), I = G.mul(S, G.mul(s, y)), L = G.add(h, G.add(G.mul(o, p), G.mul(c, G.mul(m, I)))), R = G.toBytes(L);
    if (!r) {
      const V = bn.encode({
        R1: rn(u),
        R2: rn(l)
      });
      if (!this.partialSigVerifyInternal(R, V, g))
        throw new Error("Partial signature verification failed");
    }
    return R;
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
    if (q(t, 32), Kt(n, 66), Kt(i, ue), Kt(s, 32), Ha(o), Ve(r), n.length !== i.length)
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
    Kt(t, 32);
    const { Q: n, tweakAcc: r, R: i, e: s } = this;
    let o = 0n;
    for (let c = 0; c < t.length; c++) {
      const u = G.fromBytes(t[c], !0);
      if (!G.isValid(u))
        throw new Co(c, "psig");
      o = G.add(o, u);
    }
    const a = Wn(n, 1n);
    return o = G.add(o, G.mul(s, G.mul(a, r))), Zt(kr(i), G.toBytes(o));
  }
}
function Vh(e) {
  const t = Ph(e);
  return { secNonce: t.secret, pubNonce: t.public };
}
function Mh(e) {
  return _h(e);
}
/*! noble-hashes - MIT License (c) 2022 Paul Miller (paulmillr.com) */
function Po(e) {
  return e instanceof Uint8Array || ArrayBuffer.isView(e) && e.constructor.name === "Uint8Array";
}
function cn(e, t = "") {
  if (!Number.isSafeInteger(e) || e < 0) {
    const n = t && `"${t}" `;
    throw new Error(`${n}expected integer >0, got ${e}`);
  }
}
function rt(e, t, n = "") {
  const r = Po(e), i = e?.length, s = t !== void 0;
  if (!r || s && i !== t) {
    const o = n && `"${n}" `, a = s ? ` of length ${t}` : "", c = r ? `length=${i}` : `type=${typeof e}`;
    throw new Error(o + "expected Uint8Array" + a + ", got " + c);
  }
  return e;
}
function sl(e) {
  if (typeof e != "function" || typeof e.create != "function")
    throw new Error("Hash must wrapped by utils.createHasher");
  cn(e.outputLen), cn(e.blockLen);
}
function ci(e, t = !0) {
  if (e.destroyed)
    throw new Error("Hash instance has been destroyed");
  if (t && e.finished)
    throw new Error("Hash#digest() has already been called");
}
function Hh(e, t) {
  rt(e, void 0, "digestInto() output");
  const n = t.outputLen;
  if (e.length < n)
    throw new Error('"digestInto() output" expected to be of length >=' + n);
}
function ui(...e) {
  for (let t = 0; t < e.length; t++)
    e[t].fill(0);
}
function as(e) {
  return new DataView(e.buffer, e.byteOffset, e.byteLength);
}
function ne(e, t) {
  return e << 32 - t | e >>> t;
}
const ol = /* @ts-ignore */ typeof Uint8Array.from([]).toHex == "function" && typeof Uint8Array.fromHex == "function", Fh = /* @__PURE__ */ Array.from({ length: 256 }, (e, t) => t.toString(16).padStart(2, "0"));
function Di(e) {
  if (rt(e), ol)
    return e.toHex();
  let t = "";
  for (let n = 0; n < e.length; n++)
    t += Fh[e[n]];
  return t;
}
const he = { _0: 48, _9: 57, A: 65, F: 70, a: 97, f: 102 };
function Ka(e) {
  if (e >= he._0 && e <= he._9)
    return e - he._0;
  if (e >= he.A && e <= he.F)
    return e - (he.A - 10);
  if (e >= he.a && e <= he.f)
    return e - (he.a - 10);
}
function li(e) {
  if (typeof e != "string")
    throw new Error("hex string expected, got " + typeof e);
  if (ol)
    return Uint8Array.fromHex(e);
  const t = e.length, n = t / 2;
  if (t % 2)
    throw new Error("hex string expected, got unpadded hex of length " + t);
  const r = new Uint8Array(n);
  for (let i = 0, s = 0; i < n; i++, s += 2) {
    const o = Ka(e.charCodeAt(s)), a = Ka(e.charCodeAt(s + 1));
    if (o === void 0 || a === void 0) {
      const c = e[s] + e[s + 1];
      throw new Error('hex string expected, got non-hex character "' + c + '" at index ' + s);
    }
    r[i] = o * 16 + a;
  }
  return r;
}
function se(...e) {
  let t = 0;
  for (let r = 0; r < e.length; r++) {
    const i = e[r];
    rt(i), t += i.length;
  }
  const n = new Uint8Array(t);
  for (let r = 0, i = 0; r < e.length; r++) {
    const s = e[r];
    n.set(s, i), i += s.length;
  }
  return n;
}
function Kh(e, t = {}) {
  const n = (i, s) => e(s).update(i).digest(), r = e(void 0);
  return n.outputLen = r.outputLen, n.blockLen = r.blockLen, n.create = (i) => e(i), Object.assign(n, t), Object.freeze(n);
}
function Vi(e = 32) {
  const t = typeof globalThis == "object" ? globalThis.crypto : null;
  if (typeof t?.getRandomValues != "function")
    throw new Error("crypto.getRandomValues must be defined");
  return t.getRandomValues(new Uint8Array(e));
}
const zh = (e) => ({
  oid: Uint8Array.from([6, 9, 96, 134, 72, 1, 101, 3, 4, 2, e])
});
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const _o = /* @__PURE__ */ BigInt(0), js = /* @__PURE__ */ BigInt(1);
function fi(e, t = "") {
  if (typeof e != "boolean") {
    const n = t && `"${t}" `;
    throw new Error(n + "expected boolean, got type=" + typeof e);
  }
  return e;
}
function al(e) {
  if (typeof e == "bigint") {
    if (!Fr(e))
      throw new Error("positive bigint expected, got " + e);
  } else
    cn(e);
  return e;
}
function Or(e) {
  const t = al(e).toString(16);
  return t.length & 1 ? "0" + t : t;
}
function cl(e) {
  if (typeof e != "string")
    throw new Error("hex string expected, got " + typeof e);
  return e === "" ? _o : BigInt("0x" + e);
}
function Mn(e) {
  return cl(Di(e));
}
function ul(e) {
  return cl(Di(jh(rt(e)).reverse()));
}
function Do(e, t) {
  cn(t), e = al(e);
  const n = li(e.toString(16).padStart(t * 2, "0"));
  if (n.length !== t)
    throw new Error("number too large");
  return n;
}
function ll(e, t) {
  return Do(e, t).reverse();
}
function jh(e) {
  return Uint8Array.from(e);
}
function Wh(e) {
  return Uint8Array.from(e, (t, n) => {
    const r = t.charCodeAt(0);
    if (t.length !== 1 || r > 127)
      throw new Error(`string contains non-ASCII character "${e[n]}" with code ${r} at position ${n}`);
    return r;
  });
}
const Fr = (e) => typeof e == "bigint" && _o <= e;
function Gh(e, t, n) {
  return Fr(e) && Fr(t) && Fr(n) && t <= e && e < n;
}
function qh(e, t, n, r) {
  if (!Gh(t, n, r))
    throw new Error("expected valid " + e + ": " + n + " <= n < " + r + ", got " + t);
}
function Yh(e) {
  let t;
  for (t = 0; e > _o; e >>= js, t += 1)
    ;
  return t;
}
const Vo = (e) => (js << BigInt(e)) - js;
function Zh(e, t, n) {
  if (cn(e, "hashLen"), cn(t, "qByteLen"), typeof n != "function")
    throw new Error("hmacFn must be a function");
  const r = (g) => new Uint8Array(g), i = Uint8Array.of(), s = Uint8Array.of(0), o = Uint8Array.of(1), a = 1e3;
  let c = r(e), u = r(e), l = 0;
  const f = () => {
    c.fill(1), u.fill(0), l = 0;
  }, h = (...g) => n(u, se(c, ...g)), p = (g = i) => {
    u = h(s, g), c = h(), g.length !== 0 && (u = h(o, g), c = h());
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
    return se(...m);
  };
  return (g, m) => {
    f(), p(g);
    let S;
    for (; !(S = m(y())); )
      p();
    return f(), S;
  };
}
function Mo(e, t = {}, n = {}) {
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
function za(e) {
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
const fl = {
  p: 0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffefffffc2fn,
  n: 0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141n,
  h: 1n,
  a: 0n,
  b: 7n,
  Gx: 0x79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798n,
  Gy: 0x483ada7726a3c4655da4fbfc0e1108a8fd17b448a68554199c47d08ffb10d4b8n
}, { p: Pe, n: je, Gx: Xh, Gy: Qh, b: dl } = fl, bt = 32, un = 64, di = {
  publicKey: bt + 1,
  publicKeyUncompressed: un + 1,
  signature: un,
  seed: bt + bt / 2
}, Jh = (...e) => {
  "captureStackTrace" in Error && typeof Error.captureStackTrace == "function" && Error.captureStackTrace(...e);
}, et = (e = "") => {
  const t = new Error(e);
  throw Jh(t, et), t;
}, tp = (e) => typeof e == "bigint", ep = (e) => typeof e == "string", np = (e) => e instanceof Uint8Array || ArrayBuffer.isView(e) && e.constructor.name === "Uint8Array", Pt = (e, t, n = "") => {
  const r = np(e), i = e?.length, s = t !== void 0;
  if (!r || s && i !== t) {
    const o = n && `"${n}" `, a = s ? ` of length ${t}` : "", c = r ? `length=${i}` : `type=${typeof e}`;
    et(o + "expected Uint8Array" + a + ", got " + c);
  }
  return e;
}, We = (e) => new Uint8Array(e), hl = (e, t) => e.toString(16).padStart(t, "0"), pl = (e) => Array.from(Pt(e)).map((t) => hl(t, 2)).join(""), pe = { _0: 48, _9: 57, A: 65, F: 70, a: 97, f: 102 }, ja = (e) => {
  if (e >= pe._0 && e <= pe._9)
    return e - pe._0;
  if (e >= pe.A && e <= pe.F)
    return e - (pe.A - 10);
  if (e >= pe.a && e <= pe.f)
    return e - (pe.a - 10);
}, gl = (e) => {
  const t = "hex invalid";
  if (!ep(e))
    return et(t);
  const n = e.length, r = n / 2;
  if (n % 2)
    return et(t);
  const i = We(r);
  for (let s = 0, o = 0; s < r; s++, o += 2) {
    const a = ja(e.charCodeAt(o)), c = ja(e.charCodeAt(o + 1));
    if (a === void 0 || c === void 0)
      return et(t);
    i[s] = a * 16 + c;
  }
  return i;
}, yl = () => globalThis?.crypto, Wa = () => yl()?.subtle ?? et("crypto.subtle must be defined, consider polyfill"), le = (...e) => {
  const t = We(e.reduce((r, i) => r + Pt(i).length, 0));
  let n = 0;
  return e.forEach((r) => {
    t.set(r, n), n += r.length;
  }), t;
}, Mi = (e = bt) => yl().getRandomValues(We(e)), lr = BigInt, ln = (e, t, n, r = "bad number: out of range") => tp(e) && t <= e && e < n ? e : et(r), D = (e, t = Pe) => {
  const n = e % t;
  return n >= 0n ? n : t + n;
}, be = (e) => D(e, je), wl = (e, t) => {
  (e === 0n || t <= 0n) && et("no inverse n=" + e + " mod=" + t);
  let n = D(e, t), r = t, i = 0n, s = 1n;
  for (; n !== 0n; ) {
    const o = r / n, a = r % n, c = i - s * o;
    r = n, n = a, i = s, s = c;
  }
  return r === 1n ? D(i, t) : et("no inverse");
}, ml = (e) => {
  const t = Fi[e];
  return typeof t != "function" && et("hashes." + e + " not set"), t;
}, cs = (e) => e instanceof kt ? e : et("Point expected"), bl = (e) => D(D(e * e) * e + dl), Ga = (e) => ln(e, 0n, Pe), Kr = (e) => ln(e, 1n, Pe), Ws = (e) => ln(e, 1n, je), Bn = (e) => (e & 1n) === 0n, Hi = (e) => Uint8Array.of(e), rp = (e) => Hi(Bn(e) ? 2 : 3), El = (e) => {
  const t = bl(Kr(e));
  let n = 1n;
  for (let r = t, i = (Pe + 1n) / 4n; i > 0n; i >>= 1n)
    i & 1n && (n = n * r % Pe), r = r * r % Pe;
  return D(n * n) === t ? n : et("sqrt invalid");
};
class kt {
  static BASE;
  static ZERO;
  X;
  Y;
  Z;
  constructor(t, n, r) {
    this.X = Ga(t), this.Y = Kr(n), this.Z = Ga(r), Object.freeze(this);
  }
  static CURVE() {
    return fl;
  }
  /** Create 3d xyz point from 2d xy. (0, 0) => (0, 1, 0), not (0, 0, 1) */
  static fromAffine(t) {
    const { x: n, y: r } = t;
    return n === 0n && r === 0n ? Qe : new kt(n, r, 1n);
  }
  /** Convert Uint8Array or hex string to Point. */
  static fromBytes(t) {
    Pt(t);
    const { publicKey: n, publicKeyUncompressed: r } = di;
    let i;
    const s = t.length, o = t[0], a = t.subarray(1), c = $n(a, 0, bt);
    if (s === n && (o === 2 || o === 3)) {
      let u = El(c);
      const l = Bn(u);
      Bn(lr(o)) !== l && (u = D(-u)), i = new kt(c, u, 1n);
    }
    return s === r && o === 4 && (i = new kt(c, $n(a, bt, un), 1n)), i ? i.assertValidity() : et("bad point: not on curve");
  }
  static fromHex(t) {
    return kt.fromBytes(gl(t));
  }
  get x() {
    return this.toAffine().x;
  }
  get y() {
    return this.toAffine().y;
  }
  /** Equality check: compare points P&Q. */
  equals(t) {
    const { X: n, Y: r, Z: i } = this, { X: s, Y: o, Z: a } = cs(t), c = D(n * a), u = D(s * i), l = D(r * a), f = D(o * i);
    return c === u && l === f;
  }
  is0() {
    return this.equals(Qe);
  }
  /** Flip point over y coordinate. */
  negate() {
    return new kt(this.X, D(-this.Y), this.Z);
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
    const { X: n, Y: r, Z: i } = this, { X: s, Y: o, Z: a } = cs(t), c = 0n, u = dl;
    let l = 0n, f = 0n, h = 0n;
    const p = D(u * 3n);
    let y = D(n * s), d = D(r * o), g = D(i * a), m = D(n + r), S = D(s + o);
    m = D(m * S), S = D(y + d), m = D(m - S), S = D(n + i);
    let I = D(s + a);
    return S = D(S * I), I = D(y + g), S = D(S - I), I = D(r + i), l = D(o + a), I = D(I * l), l = D(d + g), I = D(I - l), h = D(c * S), l = D(p * g), h = D(l + h), l = D(d - h), h = D(d + h), f = D(l * h), d = D(y + y), d = D(d + y), g = D(c * g), S = D(p * S), d = D(d + g), g = D(y - g), g = D(c * g), S = D(S + g), y = D(d * S), f = D(f + y), y = D(I * S), l = D(m * l), l = D(l - y), y = D(m * d), h = D(I * h), h = D(h + y), new kt(l, f, h);
  }
  subtract(t) {
    return this.add(cs(t).negate());
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
      return Qe;
    if (Ws(t), t === 1n)
      return this;
    if (this.equals(Ge))
      return Bp(t).p;
    let r = Qe, i = Ge;
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
    if (this.equals(Qe))
      return { x: 0n, y: 0n };
    if (r === 1n)
      return { x: t, y: n };
    const i = wl(r, Pe);
    return D(r * i) !== 1n && et("inverse invalid"), { x: D(t * i), y: D(n * i) };
  }
  /** Checks if the point is valid and on-curve. */
  assertValidity() {
    const { x: t, y: n } = this.toAffine();
    return Kr(t), Kr(n), D(n * n) === bl(t) ? this : et("bad point: not on curve");
  }
  /** Converts point to 33/65-byte Uint8Array. */
  toBytes(t = !0) {
    const { x: n, y: r } = this.assertValidity().toAffine(), i = Vt(n);
    return t ? le(rp(r), i) : le(Hi(4), i, Vt(r));
  }
  toHex(t) {
    return pl(this.toBytes(t));
  }
}
const Ge = new kt(Xh, Qh, 1n), Qe = new kt(0n, 1n, 0n);
kt.BASE = Ge;
kt.ZERO = Qe;
const ip = (e, t, n) => Ge.multiply(t, !1).add(e.multiply(n, !1)).assertValidity(), qe = (e) => lr("0x" + (pl(e) || "0")), $n = (e, t, n) => qe(e.subarray(t, n)), sp = 2n ** 256n, Vt = (e) => gl(hl(ln(e, 0n, sp), un)), xl = (e) => {
  const t = qe(Pt(e, bt, "secret key"));
  return ln(t, 1n, je, "invalid secret key: outside of range");
}, Tl = (e) => e > je >> 1n, op = (e) => {
  [0, 1, 2, 3].includes(e) || et("recovery id must be valid and present");
}, ap = (e) => {
  e != null && !qa.includes(e) && et(`Signature format must be one of: ${qa.join(", ")}`), e === vl && et('Signature format "der" is not supported: switch to noble-curves');
}, cp = (e, t = Nn) => {
  ap(t);
  const n = di.signature, r = n + 1;
  let i = `Signature format "${t}" expects Uint8Array with length `;
  t === Nn && e.length !== n && et(i + n), t === pi && e.length !== r && et(i + r);
};
class hi {
  r;
  s;
  recovery;
  constructor(t, n, r) {
    this.r = Ws(t), this.s = Ws(n), r != null && (this.recovery = r), Object.freeze(this);
  }
  static fromBytes(t, n = Nn) {
    cp(t, n);
    let r;
    n === pi && (r = t[0], t = t.subarray(1));
    const i = $n(t, 0, bt), s = $n(t, bt, un);
    return new hi(i, s, r);
  }
  addRecoveryBit(t) {
    return new hi(this.r, this.s, t);
  }
  hasHighS() {
    return Tl(this.s);
  }
  toBytes(t = Nn) {
    const { r: n, s: r, recovery: i } = this, s = le(Vt(n), Vt(r));
    return t === pi ? (op(i), le(Uint8Array.of(i), s)) : s;
  }
}
const Sl = (e) => {
  const t = e.length * 8 - 256;
  t > 1024 && et("msg invalid");
  const n = qe(e);
  return t > 0 ? n >> lr(t) : n;
}, up = (e) => be(Sl(Pt(e))), Nn = "compact", pi = "recovered", vl = "der", qa = [Nn, pi, vl], Ya = {
  lowS: !0,
  prehash: !0,
  format: Nn,
  extraEntropy: !1
}, Za = "SHA-256", Fi = {
  hmacSha256Async: async (e, t) => {
    const n = Wa(), r = "HMAC", i = await n.importKey("raw", e, { name: r, hash: { name: Za } }, !1, ["sign"]);
    return We(await n.sign(r, i, t));
  },
  hmacSha256: void 0,
  sha256Async: async (e) => We(await Wa().digest(Za, e)),
  sha256: void 0
}, lp = (e, t, n) => (Pt(e, void 0, "message"), t.prehash ? n ? Fi.sha256Async(e) : ml("sha256")(e) : e), fp = We(0), dp = Hi(0), hp = Hi(1), pp = 1e3, gp = "drbg: tried max amount of iterations", yp = async (e, t) => {
  let n = We(bt), r = We(bt), i = 0;
  const s = () => {
    n.fill(1), r.fill(0);
  }, o = (...l) => Fi.hmacSha256Async(r, le(n, ...l)), a = async (l = fp) => {
    r = await o(dp, l), n = await o(), l.length !== 0 && (r = await o(hp, l), n = await o());
  }, c = async () => (i++ >= pp && et(gp), n = await o(), n);
  s(), await a(e);
  let u;
  for (; !(u = t(await c())); )
    await a();
  return s(), u;
}, wp = (e, t, n, r) => {
  let { lowS: i, extraEntropy: s } = n;
  const o = Vt, a = up(e), c = o(a), u = xl(t), l = [o(u), c];
  if (s != null && s !== !1) {
    const y = s === !0 ? Mi(bt) : s;
    l.push(Pt(y, void 0, "extraEntropy"));
  }
  const f = le(...l), h = a;
  return r(f, (y) => {
    const d = Sl(y);
    if (!(1n <= d && d < je))
      return;
    const g = wl(d, je), m = Ge.multiply(d).toAffine(), S = be(m.x);
    if (S === 0n)
      return;
    const I = be(g * be(h + S * u));
    if (I === 0n)
      return;
    let L = (m.x === S ? 0 : 2) | Number(m.y & 1n), R = I;
    return i && Tl(I) && (R = be(-I), L ^= 1), new hi(S, R, L).toBytes(n.format);
  });
}, mp = (e) => {
  const t = {};
  return Object.keys(Ya).forEach((n) => {
    t[n] = e[n] ?? Ya[n];
  }), t;
}, bp = async (e, t, n = {}) => (n = mp(n), e = await lp(e, n, !0), wp(e, t, n, yp)), Ep = (e = Mi(di.seed)) => {
  Pt(e), (e.length < di.seed || e.length > 1024) && et("expected 40-1024b");
  const t = D(qe(e), je - 1n);
  return Vt(t + 1n);
}, xp = (e) => (t) => {
  const n = Ep(t);
  return { secretKey: n, publicKey: e(n) };
}, Al = (e) => Uint8Array.from("BIP0340/" + e, (t) => t.charCodeAt(0)), Il = "aux", kl = "nonce", Ol = "challenge", Gs = (e, ...t) => {
  const n = ml("sha256"), r = n(Al(e));
  return n(le(r, r, ...t));
}, qs = async (e, ...t) => {
  const n = Fi.sha256Async, r = await n(Al(e));
  return await n(le(r, r, ...t));
}, Ho = (e) => {
  const t = xl(e), n = Ge.multiply(t), { x: r, y: i } = n.assertValidity().toAffine(), s = Bn(i) ? t : be(-t), o = Vt(r);
  return { d: s, px: o };
}, Fo = (e) => be(qe(e)), Bl = (...e) => Fo(Gs(Ol, ...e)), $l = async (...e) => Fo(await qs(Ol, ...e)), Nl = (e) => Ho(e).px, Tp = xp(Nl), Rl = (e, t, n) => {
  const { px: r, d: i } = Ho(t);
  return { m: Pt(e), px: r, d: i, a: Pt(n, bt) };
}, Ul = (e) => {
  const t = Fo(e);
  t === 0n && et("sign failed: k is zero");
  const { px: n, d: r } = Ho(Vt(t));
  return { rx: n, k: r };
}, Ll = (e, t, n, r) => le(t, Vt(be(e + n * r))), Cl = "invalid signature produced", Sp = (e, t, n = Mi(bt)) => {
  const { m: r, px: i, d: s, a: o } = Rl(e, t, n), a = Gs(Il, o), c = Vt(s ^ qe(a)), u = Gs(kl, c, i, r), { rx: l, k: f } = Ul(u), h = Bl(l, i, r), p = Ll(f, l, h, s);
  return _l(p, r, i) || et(Cl), p;
}, vp = async (e, t, n = Mi(bt)) => {
  const { m: r, px: i, d: s, a: o } = Rl(e, t, n), a = await qs(Il, o), c = Vt(s ^ qe(a)), u = await qs(kl, c, i, r), { rx: l, k: f } = Ul(u), h = await $l(l, i, r), p = Ll(f, l, h, s);
  return await Dl(p, r, i) || et(Cl), p;
}, Ap = (e, t) => e instanceof Promise ? e.then(t) : t(e), Pl = (e, t, n, r) => {
  const i = Pt(e, un, "signature"), s = Pt(t, void 0, "message"), o = Pt(n, bt, "publicKey");
  try {
    const a = qe(o), c = El(a), u = Bn(c) ? c : D(-c), l = new kt(a, u, 1n).assertValidity(), f = Vt(l.toAffine().x), h = $n(i, 0, bt);
    ln(h, 1n, Pe);
    const p = $n(i, bt, un);
    ln(p, 1n, je);
    const y = le(Vt(h), f, s);
    return Ap(r(y), (d) => {
      const { x: g, y: m } = ip(l, p, be(-d)).toAffine();
      return !(!Bn(m) || g !== h);
    });
  } catch {
    return !1;
  }
}, _l = (e, t, n) => Pl(e, t, n, Bl), Dl = async (e, t, n) => Pl(e, t, n, $l), Ip = {
  keygen: Tp,
  getPublicKey: Nl,
  sign: Sp,
  verify: _l,
  signAsync: vp,
  verifyAsync: Dl
}, gi = 8, kp = 256, Vl = Math.ceil(kp / gi) + 1, Ys = 2 ** (gi - 1), Op = () => {
  const e = [];
  let t = Ge, n = t;
  for (let r = 0; r < Vl; r++) {
    n = t, e.push(n);
    for (let i = 1; i < Ys; i++)
      n = n.add(t), e.push(n);
    t = n.double();
  }
  return e;
};
let Xa;
const Qa = (e, t) => {
  const n = t.negate();
  return e ? n : t;
}, Bp = (e) => {
  const t = Xa || (Xa = Op());
  let n = Qe, r = Ge;
  const i = 2 ** gi, s = i, o = lr(i - 1), a = lr(gi);
  for (let c = 0; c < Vl; c++) {
    let u = Number(e & o);
    e >>= a, u > Ys && (u -= s, e += 1n);
    const l = c * Ys, f = l, h = l + Math.abs(u) - 1, p = c % 2 !== 0, y = u < 0;
    u === 0 ? r = r.add(Qa(p, t[f])) : n = n.add(Qa(y, t[h]));
  }
  return e !== 0n && et("invalid wnaf"), { p: n, f: r };
};
function $p(e, t, n) {
  return e & t ^ ~e & n;
}
function Np(e, t, n) {
  return e & t ^ e & n ^ t & n;
}
class Rp {
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
    this.blockLen = t, this.outputLen = n, this.padOffset = r, this.isLE = i, this.buffer = new Uint8Array(t), this.view = as(this.buffer);
  }
  update(t) {
    ci(this), rt(t);
    const { view: n, buffer: r, blockLen: i } = this, s = t.length;
    for (let o = 0; o < s; ) {
      const a = Math.min(i - this.pos, s - o);
      if (a === i) {
        const c = as(t);
        for (; i <= s - o; o += i)
          this.process(c, o);
        continue;
      }
      r.set(t.subarray(o, o + a), this.pos), this.pos += a, o += a, this.pos === i && (this.process(n, 0), this.pos = 0);
    }
    return this.length += t.length, this.roundClean(), this;
  }
  digestInto(t) {
    ci(this), Hh(t, this), this.finished = !0;
    const { buffer: n, view: r, blockLen: i, isLE: s } = this;
    let { pos: o } = this;
    n[o++] = 128, ui(this.buffer.subarray(o)), this.padOffset > i - o && (this.process(r, 0), o = 0);
    for (let f = o; f < i; f++)
      n[f] = 0;
    r.setBigUint64(i - 8, BigInt(this.length * 8), s), this.process(r, 0);
    const a = as(t), c = this.outputLen;
    if (c % 4)
      throw new Error("_sha2: outputLen must be aligned to 32bit");
    const u = c / 4, l = this.get();
    if (u > l.length)
      throw new Error("_sha2: outputLen bigger than state");
    for (let f = 0; f < u; f++)
      a.setUint32(4 * f, l[f], s);
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
const Be = /* @__PURE__ */ Uint32Array.from([
  1779033703,
  3144134277,
  1013904242,
  2773480762,
  1359893119,
  2600822924,
  528734635,
  1541459225
]), Up = /* @__PURE__ */ Uint32Array.from([
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
]), $e = /* @__PURE__ */ new Uint32Array(64);
class Lp extends Rp {
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
    for (let f = 0; f < 16; f++, n += 4)
      $e[f] = t.getUint32(n, !1);
    for (let f = 16; f < 64; f++) {
      const h = $e[f - 15], p = $e[f - 2], y = ne(h, 7) ^ ne(h, 18) ^ h >>> 3, d = ne(p, 17) ^ ne(p, 19) ^ p >>> 10;
      $e[f] = d + $e[f - 7] + y + $e[f - 16] | 0;
    }
    let { A: r, B: i, C: s, D: o, E: a, F: c, G: u, H: l } = this;
    for (let f = 0; f < 64; f++) {
      const h = ne(a, 6) ^ ne(a, 11) ^ ne(a, 25), p = l + h + $p(a, c, u) + Up[f] + $e[f] | 0, d = (ne(r, 2) ^ ne(r, 13) ^ ne(r, 22)) + Np(r, i, s) | 0;
      l = u, u = c, c = a, a = o + p | 0, o = s, s = i, i = r, r = p + d | 0;
    }
    r = r + this.A | 0, i = i + this.B | 0, s = s + this.C | 0, o = o + this.D | 0, a = a + this.E | 0, c = c + this.F | 0, u = u + this.G | 0, l = l + this.H | 0, this.set(r, i, s, o, a, c, u, l);
  }
  roundClean() {
    ui($e);
  }
  destroy() {
    this.set(0, 0, 0, 0, 0, 0, 0, 0), ui(this.buffer);
  }
}
class Cp extends Lp {
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
}
const Zs = /* @__PURE__ */ Kh(
  () => new Cp(),
  /* @__PURE__ */ zh(1)
);
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const Bt = /* @__PURE__ */ BigInt(0), vt = /* @__PURE__ */ BigInt(1), sn = /* @__PURE__ */ BigInt(2), Ml = /* @__PURE__ */ BigInt(3), Hl = /* @__PURE__ */ BigInt(4), Fl = /* @__PURE__ */ BigInt(5), Pp = /* @__PURE__ */ BigInt(7), Kl = /* @__PURE__ */ BigInt(8), _p = /* @__PURE__ */ BigInt(9), zl = /* @__PURE__ */ BigInt(16);
function Gt(e, t) {
  const n = e % t;
  return n >= Bt ? n : t + n;
}
function Ft(e, t, n) {
  let r = e;
  for (; t-- > Bt; )
    r *= r, r %= n;
  return r;
}
function Ja(e, t) {
  if (e === Bt)
    throw new Error("invert: expected non-zero number");
  if (t <= Bt)
    throw new Error("invert: expected positive modulus, got " + t);
  let n = Gt(e, t), r = t, i = Bt, s = vt;
  for (; n !== Bt; ) {
    const a = r / n, c = r % n, u = i - s * a;
    r = n, n = c, i = s, s = u;
  }
  if (r !== vt)
    throw new Error("invert: does not exist");
  return Gt(i, t);
}
function Ko(e, t, n) {
  if (!e.eql(e.sqr(t), n))
    throw new Error("Cannot find square root");
}
function jl(e, t) {
  const n = (e.ORDER + vt) / Hl, r = e.pow(t, n);
  return Ko(e, r, t), r;
}
function Dp(e, t) {
  const n = (e.ORDER - Fl) / Kl, r = e.mul(t, sn), i = e.pow(r, n), s = e.mul(t, i), o = e.mul(e.mul(s, sn), i), a = e.mul(s, e.sub(o, e.ONE));
  return Ko(e, a, t), a;
}
function Vp(e) {
  const t = Ki(e), n = Wl(e), r = n(t, t.neg(t.ONE)), i = n(t, r), s = n(t, t.neg(r)), o = (e + Pp) / zl;
  return (a, c) => {
    let u = a.pow(c, o), l = a.mul(u, r);
    const f = a.mul(u, i), h = a.mul(u, s), p = a.eql(a.sqr(l), c), y = a.eql(a.sqr(f), c);
    u = a.cmov(u, l, p), l = a.cmov(h, f, y);
    const d = a.eql(a.sqr(l), c), g = a.cmov(u, l, d);
    return Ko(a, g, c), g;
  };
}
function Wl(e) {
  if (e < Ml)
    throw new Error("sqrt is not defined for small field");
  let t = e - vt, n = 0;
  for (; t % sn === Bt; )
    t /= sn, n++;
  let r = sn;
  const i = Ki(e);
  for (; tc(i, r) === 1; )
    if (r++ > 1e3)
      throw new Error("Cannot find square root: probably non-prime P");
  if (n === 1)
    return jl;
  let s = i.pow(r, t);
  const o = (t + vt) / sn;
  return function(c, u) {
    if (c.is0(u))
      return u;
    if (tc(c, u) !== 1)
      throw new Error("Cannot find square root");
    let l = n, f = c.mul(c.ONE, s), h = c.pow(u, t), p = c.pow(u, o);
    for (; !c.eql(h, c.ONE); ) {
      if (c.is0(h))
        return c.ZERO;
      let y = 1, d = c.sqr(h);
      for (; !c.eql(d, c.ONE); )
        if (y++, d = c.sqr(d), y === l)
          throw new Error("Cannot find square root");
      const g = vt << BigInt(l - y - 1), m = c.pow(f, g);
      l = y, f = c.sqr(m), h = c.mul(h, f), p = c.mul(p, m);
    }
    return p;
  };
}
function Mp(e) {
  return e % Hl === Ml ? jl : e % Kl === Fl ? Dp : e % zl === _p ? Vp(e) : Wl(e);
}
const Hp = [
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
function Fp(e) {
  const t = {
    ORDER: "bigint",
    BYTES: "number",
    BITS: "number"
  }, n = Hp.reduce((r, i) => (r[i] = "function", r), t);
  return Mo(e, n), e;
}
function Kp(e, t, n) {
  if (n < Bt)
    throw new Error("invalid exponent, negatives unsupported");
  if (n === Bt)
    return e.ONE;
  if (n === vt)
    return t;
  let r = e.ONE, i = t;
  for (; n > Bt; )
    n & vt && (r = e.mul(r, i)), i = e.sqr(i), n >>= vt;
  return r;
}
function Gl(e, t, n = !1) {
  const r = new Array(t.length).fill(n ? e.ZERO : void 0), i = t.reduce((o, a, c) => e.is0(a) ? o : (r[c] = o, e.mul(o, a)), e.ONE), s = e.inv(i);
  return t.reduceRight((o, a, c) => e.is0(a) ? o : (r[c] = e.mul(o, r[c]), e.mul(o, a)), s), r;
}
function tc(e, t) {
  const n = (e.ORDER - vt) / sn, r = e.pow(t, n), i = e.eql(r, e.ONE), s = e.eql(r, e.ZERO), o = e.eql(r, e.neg(e.ONE));
  if (!i && !s && !o)
    throw new Error("invalid Legendre symbol result");
  return i ? 1 : s ? 0 : -1;
}
function zp(e, t) {
  t !== void 0 && cn(t);
  const n = t !== void 0 ? t : e.toString(2).length, r = Math.ceil(n / 8);
  return { nBitLength: n, nByteLength: r };
}
class jp {
  ORDER;
  BITS;
  BYTES;
  isLE;
  ZERO = Bt;
  ONE = vt;
  _lengths;
  _sqrt;
  // cached sqrt
  _mod;
  constructor(t, n = {}) {
    if (t <= Bt)
      throw new Error("invalid field: expected ORDER > 0, got " + t);
    let r;
    this.isLE = !1, n != null && typeof n == "object" && (typeof n.BITS == "number" && (r = n.BITS), typeof n.sqrt == "function" && (this.sqrt = n.sqrt), typeof n.isLE == "boolean" && (this.isLE = n.isLE), n.allowedLengths && (this._lengths = n.allowedLengths?.slice()), typeof n.modFromBytes == "boolean" && (this._mod = n.modFromBytes));
    const { nBitLength: i, nByteLength: s } = zp(t, r);
    if (s > 2048)
      throw new Error("invalid field: expected ORDER of <= 2048 bytes");
    this.ORDER = t, this.BITS = i, this.BYTES = s, this._sqrt = void 0, Object.preventExtensions(this);
  }
  create(t) {
    return Gt(t, this.ORDER);
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
    return (t & vt) === vt;
  }
  neg(t) {
    return Gt(-t, this.ORDER);
  }
  eql(t, n) {
    return t === n;
  }
  sqr(t) {
    return Gt(t * t, this.ORDER);
  }
  add(t, n) {
    return Gt(t + n, this.ORDER);
  }
  sub(t, n) {
    return Gt(t - n, this.ORDER);
  }
  mul(t, n) {
    return Gt(t * n, this.ORDER);
  }
  pow(t, n) {
    return Kp(this, t, n);
  }
  div(t, n) {
    return Gt(t * Ja(n, this.ORDER), this.ORDER);
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
    return Ja(t, this.ORDER);
  }
  sqrt(t) {
    return this._sqrt || (this._sqrt = Mp(this.ORDER)), this._sqrt(this, t);
  }
  toBytes(t) {
    return this.isLE ? ll(t, this.BYTES) : Do(t, this.BYTES);
  }
  fromBytes(t, n = !1) {
    rt(t);
    const { _lengths: r, BYTES: i, isLE: s, ORDER: o, _mod: a } = this;
    if (r) {
      if (!r.includes(t.length) || t.length > i)
        throw new Error("Field.fromBytes: expected " + r + " bytes, got " + t.length);
      const u = new Uint8Array(i);
      u.set(t, s ? 0 : u.length - t.length), t = u;
    }
    if (t.length !== i)
      throw new Error("Field.fromBytes: expected " + i + " bytes, got " + t.length);
    let c = s ? ul(t) : Mn(t);
    if (a && (c = Gt(c, o)), !n && !this.isValid(c))
      throw new Error("invalid field element: outside of range 0..ORDER");
    return c;
  }
  // TODO: we don't need it here, move out to separate fn
  invertBatch(t) {
    return Gl(this, t);
  }
  // We can't move this out because Fp6, Fp12 implement it
  // and it's unclear what to return in there.
  cmov(t, n, r) {
    return r ? n : t;
  }
}
function Ki(e, t = {}) {
  return new jp(e, t);
}
function ql(e) {
  if (typeof e != "bigint")
    throw new Error("field order must be bigint");
  const t = e.toString(2).length;
  return Math.ceil(t / 8);
}
function Yl(e) {
  const t = ql(e);
  return t + Math.ceil(t / 2);
}
function Zl(e, t, n = !1) {
  rt(e);
  const r = e.length, i = ql(t), s = Yl(t);
  if (r < 16 || r < s || r > 1024)
    throw new Error("expected " + s + "-1024 bytes of input, got " + r);
  const o = n ? ul(e) : Mn(e), a = Gt(o, t - vt) + vt;
  return n ? ll(a, i) : Do(a, i);
}
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const Rn = /* @__PURE__ */ BigInt(0), on = /* @__PURE__ */ BigInt(1);
function yi(e, t) {
  const n = t.negate();
  return e ? n : t;
}
function ec(e, t) {
  const n = Gl(e.Fp, t.map((r) => r.Z));
  return t.map((r, i) => e.fromAffine(r.toAffine(n[i])));
}
function Xl(e, t) {
  if (!Number.isSafeInteger(e) || e <= 0 || e > t)
    throw new Error("invalid window size, expected [1.." + t + "], got W=" + e);
}
function us(e, t) {
  Xl(e, t);
  const n = Math.ceil(t / e) + 1, r = 2 ** (e - 1), i = 2 ** e, s = Vo(e), o = BigInt(e);
  return { windows: n, windowSize: r, mask: s, maxNumber: i, shiftBy: o };
}
function nc(e, t, n) {
  const { windowSize: r, mask: i, maxNumber: s, shiftBy: o } = n;
  let a = Number(e & i), c = e >> o;
  a > r && (a -= s, c += on);
  const u = t * r, l = u + Math.abs(a) - 1, f = a === 0, h = a < 0, p = t % 2 !== 0;
  return { nextN: c, offset: l, isZero: f, isNeg: h, isNegF: p, offsetF: u };
}
const ls = /* @__PURE__ */ new WeakMap(), Ql = /* @__PURE__ */ new WeakMap();
function fs(e) {
  return Ql.get(e) || 1;
}
function rc(e) {
  if (e !== Rn)
    throw new Error("invalid wNAF");
}
class Wp {
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
    for (; n > Rn; )
      n & on && (r = r.add(i)), i = i.double(), n >>= on;
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
    const { windows: r, windowSize: i } = us(n, this.bits), s = [];
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
    const o = us(t, this.bits);
    for (let a = 0; a < o.windows; a++) {
      const { nextN: c, offset: u, isZero: l, isNeg: f, isNegF: h, offsetF: p } = nc(r, a, o);
      r = c, l ? s = s.add(yi(h, n[p])) : i = i.add(yi(f, n[u]));
    }
    return rc(r), { p: i, f: s };
  }
  /**
   * Implements ec unsafe (non const-time) multiplication using precomputed tables and w-ary non-adjacent form.
   * @param acc accumulator point to add result of multiplication
   * @returns point
   */
  wNAFUnsafe(t, n, r, i = this.ZERO) {
    const s = us(t, this.bits);
    for (let o = 0; o < s.windows && r !== Rn; o++) {
      const { nextN: a, offset: c, isZero: u, isNeg: l } = nc(r, o, s);
      if (r = a, !u) {
        const f = n[c];
        i = i.add(l ? f.negate() : f);
      }
    }
    return rc(r), i;
  }
  getPrecomputes(t, n, r) {
    let i = ls.get(n);
    return i || (i = this.precomputeWindow(n, t), t !== 1 && (typeof r == "function" && (i = r(i)), ls.set(n, i))), i;
  }
  cached(t, n, r) {
    const i = fs(t);
    return this.wNAF(i, this.getPrecomputes(i, t, r), n);
  }
  unsafe(t, n, r, i) {
    const s = fs(t);
    return s === 1 ? this._unsafeLadder(t, n, i) : this.wNAFUnsafe(s, this.getPrecomputes(s, t, r), n, i);
  }
  // We calculate precomputes for elliptic curve point multiplication
  // using windowed method. This specifies window size and
  // stores precomputed values. Usually only base point would be precomputed.
  createCache(t, n) {
    Xl(n, this.bits), Ql.set(t, n), ls.delete(t);
  }
  hasCache(t) {
    return fs(t) !== 1;
  }
}
function Gp(e, t, n, r) {
  let i = t, s = e.ZERO, o = e.ZERO;
  for (; n > Rn || r > Rn; )
    n & on && (s = s.add(i)), r & on && (o = o.add(i)), i = i.double(), n >>= on, r >>= on;
  return { p1: s, p2: o };
}
function ic(e, t, n) {
  if (t) {
    if (t.ORDER !== e)
      throw new Error("Field.ORDER must match order: Fp == p, Fn == n");
    return Fp(t), t;
  } else
    return Ki(e, { isLE: n });
}
function qp(e, t, n = {}, r) {
  if (r === void 0 && (r = e === "edwards"), !t || typeof t != "object")
    throw new Error(`expected valid ${e} CURVE object`);
  for (const c of ["p", "n", "h"]) {
    const u = t[c];
    if (!(typeof u == "bigint" && u > Rn))
      throw new Error(`CURVE.${c} must be positive bigint`);
  }
  const i = ic(t.p, n.Fp, r), s = ic(t.n, n.Fn, r), a = ["Gx", "Gy", "a", "b"];
  for (const c of a)
    if (!i.isValid(t[c]))
      throw new Error(`CURVE.${c} must be valid field element of CURVE.Fp`);
  return t = Object.freeze(Object.assign({}, t)), { CURVE: t, Fp: i, Fn: s };
}
function Jl(e, t) {
  return function(r) {
    const i = e(r);
    return { secretKey: i, publicKey: t(i) };
  };
}
class tf {
  oHash;
  iHash;
  blockLen;
  outputLen;
  finished = !1;
  destroyed = !1;
  constructor(t, n) {
    if (sl(t), rt(n, void 0, "key"), this.iHash = t.create(), typeof this.iHash.update != "function")
      throw new Error("Expected instance of class which extends utils.Hash");
    this.blockLen = this.iHash.blockLen, this.outputLen = this.iHash.outputLen;
    const r = this.blockLen, i = new Uint8Array(r);
    i.set(n.length > r ? t.create().update(n).digest() : n);
    for (let s = 0; s < i.length; s++)
      i[s] ^= 54;
    this.iHash.update(i), this.oHash = t.create();
    for (let s = 0; s < i.length; s++)
      i[s] ^= 106;
    this.oHash.update(i), ui(i);
  }
  update(t) {
    return ci(this), this.iHash.update(t), this;
  }
  digestInto(t) {
    ci(this), rt(t, this.outputLen, "output"), this.finished = !0, this.iHash.digestInto(t), this.oHash.update(t), this.oHash.digestInto(t), this.destroy();
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
const ef = (e, t, n) => new tf(e, t).update(n).digest();
ef.create = (e, t) => new tf(e, t);
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const sc = (e, t) => (e + (e >= 0 ? t : -t) / nf) / t;
function Yp(e, t, n) {
  const [[r, i], [s, o]] = t, a = sc(o * e, n), c = sc(-i * e, n);
  let u = e - a * r - c * s, l = -a * i - c * o;
  const f = u < Ee, h = l < Ee;
  f && (u = -u), h && (l = -l);
  const p = Vo(Math.ceil(Yh(n) / 2)) + En;
  if (u < Ee || u >= p || l < Ee || l >= p)
    throw new Error("splitScalar (endomorphism): failed, k=" + e);
  return { k1neg: f, k1: u, k2neg: h, k2: l };
}
function Xs(e) {
  if (!["compact", "recovered", "der"].includes(e))
    throw new Error('Signature format must be "compact", "recovered", or "der"');
  return e;
}
function ds(e, t) {
  const n = {};
  for (let r of Object.keys(t))
    n[r] = e[r] === void 0 ? t[r] : e[r];
  return fi(n.lowS, "lowS"), fi(n.prehash, "prehash"), n.format !== void 0 && Xs(n.format), n;
}
class Zp extends Error {
  constructor(t = "") {
    super(t);
  }
}
const Re = {
  // asn.1 DER encoding utils
  Err: Zp,
  // Basic building block is TLV (Tag-Length-Value)
  _tlv: {
    encode: (e, t) => {
      const { Err: n } = Re;
      if (e < 0 || e > 256)
        throw new n("tlv.encode: wrong tag");
      if (t.length & 1)
        throw new n("tlv.encode: unpadded data");
      const r = t.length / 2, i = Or(r);
      if (i.length / 2 & 128)
        throw new n("tlv.encode: long form length too big");
      const s = r > 127 ? Or(i.length / 2 | 128) : "";
      return Or(e) + s + i + t;
    },
    // v - value, l - left bytes (unparsed)
    decode(e, t) {
      const { Err: n } = Re;
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
      const { Err: t } = Re;
      if (e < Ee)
        throw new t("integer: negative integers are not allowed");
      let n = Or(e);
      if (Number.parseInt(n[0], 16) & 8 && (n = "00" + n), n.length & 1)
        throw new t("unexpected DER parsing assertion: unpadded hex");
      return n;
    },
    decode(e) {
      const { Err: t } = Re;
      if (e[0] & 128)
        throw new t("invalid signature integer: negative");
      if (e[0] === 0 && !(e[1] & 128))
        throw new t("invalid signature integer: unnecessary leading zero");
      return Mn(e);
    }
  },
  toSig(e) {
    const { Err: t, _int: n, _tlv: r } = Re, i = rt(e, void 0, "signature"), { v: s, l: o } = r.decode(48, i);
    if (o.length)
      throw new t("invalid signature: left bytes after parsing");
    const { v: a, l: c } = r.decode(2, s), { v: u, l } = r.decode(2, c);
    if (l.length)
      throw new t("invalid signature: left bytes after parsing");
    return { r: n.decode(a), s: n.decode(u) };
  },
  hexFromSig(e) {
    const { _tlv: t, _int: n } = Re, r = t.encode(2, n.encode(e.r)), i = t.encode(2, n.encode(e.s)), s = r + i;
    return t.encode(48, s);
  }
}, Ee = BigInt(0), En = BigInt(1), nf = BigInt(2), Br = BigInt(3), Xp = BigInt(4);
function Qp(e, t = {}) {
  const n = qp("weierstrass", e, t), { Fp: r, Fn: i } = n;
  let s = n.CURVE;
  const { h: o, n: a } = s;
  Mo(t, {}, {
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
  const u = sf(r, i);
  function l() {
    if (!r.isOdd)
      throw new Error("compression is not supported: Field does not have .isOdd()");
  }
  function f(_, E, b) {
    const { x: w, y: T } = E.toAffine(), A = r.toBytes(w);
    if (fi(b, "isCompressed"), b) {
      l();
      const B = !r.isOdd(T);
      return se(rf(B), A);
    } else
      return se(Uint8Array.of(4), A, r.toBytes(T));
  }
  function h(_) {
    rt(_, void 0, "Point");
    const { publicKey: E, publicKeyUncompressed: b } = u, w = _.length, T = _[0], A = _.subarray(1);
    if (w === E && (T === 2 || T === 3)) {
      const B = r.fromBytes(A);
      if (!r.isValid(B))
        throw new Error("bad point: is not on curve, wrong x");
      const k = d(B);
      let v;
      try {
        v = r.sqrt(k);
      } catch (W) {
        const H = W instanceof Error ? ": " + W.message : "";
        throw new Error("bad point: is not on curve, sqrt error" + H);
      }
      l();
      const N = r.isOdd(v);
      return (T & 1) === 1 !== N && (v = r.neg(v)), { x: B, y: v };
    } else if (w === b && T === 4) {
      const B = r.BYTES, k = r.fromBytes(A.subarray(0, B)), v = r.fromBytes(A.subarray(B, B * 2));
      if (!g(k, v))
        throw new Error("bad point: is not on curve");
      return { x: k, y: v };
    } else
      throw new Error(`bad point: got length ${w}, expected compressed=${E} or uncompressed=${b}`);
  }
  const p = t.toBytes || f, y = t.fromBytes || h;
  function d(_) {
    const E = r.sqr(_), b = r.mul(E, _);
    return r.add(r.add(b, r.mul(_, s.a)), s.b);
  }
  function g(_, E) {
    const b = r.sqr(E), w = d(_);
    return r.eql(b, w);
  }
  if (!g(s.Gx, s.Gy))
    throw new Error("bad curve params: generator point");
  const m = r.mul(r.pow(s.a, Br), Xp), S = r.mul(r.sqr(s.b), BigInt(27));
  if (r.is0(r.add(m, S)))
    throw new Error("bad curve params: a or b");
  function I(_, E, b = !1) {
    if (!r.isValid(E) || b && r.is0(E))
      throw new Error(`bad point coordinate ${_}`);
    return E;
  }
  function L(_) {
    if (!(_ instanceof C))
      throw new Error("Weierstrass Point expected");
  }
  function R(_) {
    if (!c || !c.basises)
      throw new Error("no endo");
    return Yp(_, c.basises, i.ORDER);
  }
  const V = za((_, E) => {
    const { X: b, Y: w, Z: T } = _;
    if (r.eql(T, r.ONE))
      return { x: b, y: w };
    const A = _.is0();
    E == null && (E = A ? r.ONE : r.inv(T));
    const B = r.mul(b, E), k = r.mul(w, E), v = r.mul(T, E);
    if (A)
      return { x: r.ZERO, y: r.ZERO };
    if (!r.eql(v, r.ONE))
      throw new Error("invZ was invalid");
    return { x: B, y: k };
  }), x = za((_) => {
    if (_.is0()) {
      if (t.allowInfinityPoint && !r.is0(_.Y))
        return;
      throw new Error("bad point: ZERO");
    }
    const { x: E, y: b } = _.toAffine();
    if (!r.isValid(E) || !r.isValid(b))
      throw new Error("bad point: x or y not field elements");
    if (!g(E, b))
      throw new Error("bad point: equation left != right");
    if (!_.isTorsionFree())
      throw new Error("bad point: not in prime-order subgroup");
    return !0;
  });
  function Q(_, E, b, w, T) {
    return b = new C(r.mul(b.X, _), b.Y, b.Z), E = yi(w, E), b = yi(T, b), E.add(b);
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
    static Fn = i;
    X;
    Y;
    Z;
    /** Does NOT validate if the point is valid. Use `.assertValidity()`. */
    constructor(E, b, w) {
      this.X = I("x", E), this.Y = I("y", b, !0), this.Z = I("z", w), Object.freeze(this);
    }
    static CURVE() {
      return s;
    }
    /** Does NOT validate if the point is valid. Use `.assertValidity()`. */
    static fromAffine(E) {
      const { x: b, y: w } = E || {};
      if (!E || !r.isValid(b) || !r.isValid(w))
        throw new Error("invalid affine point");
      if (E instanceof C)
        throw new Error("projective point not allowed");
      return r.is0(b) && r.is0(w) ? C.ZERO : new C(b, w, r.ONE);
    }
    static fromBytes(E) {
      const b = C.fromAffine(y(rt(E, void 0, "point")));
      return b.assertValidity(), b;
    }
    static fromHex(E) {
      return C.fromBytes(li(E));
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
    precompute(E = 8, b = !0) {
      return at.createCache(this, E), b || this.multiply(Br), this;
    }
    // TODO: return `this`
    /** A point on curve is valid if it conforms to equation. */
    assertValidity() {
      x(this);
    }
    hasEvenY() {
      const { y: E } = this.toAffine();
      if (!r.isOdd)
        throw new Error("Field doesn't support isOdd");
      return !r.isOdd(E);
    }
    /** Compare one point to another. */
    equals(E) {
      L(E);
      const { X: b, Y: w, Z: T } = this, { X: A, Y: B, Z: k } = E, v = r.eql(r.mul(b, k), r.mul(A, T)), N = r.eql(r.mul(w, k), r.mul(B, T));
      return v && N;
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
      const { a: E, b } = s, w = r.mul(b, Br), { X: T, Y: A, Z: B } = this;
      let k = r.ZERO, v = r.ZERO, N = r.ZERO, U = r.mul(T, T), W = r.mul(A, A), H = r.mul(B, B), P = r.mul(T, A);
      return P = r.add(P, P), N = r.mul(T, B), N = r.add(N, N), k = r.mul(E, N), v = r.mul(w, H), v = r.add(k, v), k = r.sub(W, v), v = r.add(W, v), v = r.mul(k, v), k = r.mul(P, k), N = r.mul(w, N), H = r.mul(E, H), P = r.sub(U, H), P = r.mul(E, P), P = r.add(P, N), N = r.add(U, U), U = r.add(N, U), U = r.add(U, H), U = r.mul(U, P), v = r.add(v, U), H = r.mul(A, B), H = r.add(H, H), U = r.mul(H, P), k = r.sub(k, U), N = r.mul(H, W), N = r.add(N, N), N = r.add(N, N), new C(k, v, N);
    }
    // Renes-Costello-Batina exception-free addition formula.
    // There is 30% faster Jacobian formula, but it is not complete.
    // https://eprint.iacr.org/2015/1060, algorithm 1
    // Cost: 12M + 0S + 3*a + 3*b3 + 23add.
    add(E) {
      L(E);
      const { X: b, Y: w, Z: T } = this, { X: A, Y: B, Z: k } = E;
      let v = r.ZERO, N = r.ZERO, U = r.ZERO;
      const W = s.a, H = r.mul(s.b, Br);
      let P = r.mul(b, A), K = r.mul(w, B), Y = r.mul(T, k), ut = r.add(b, w), z = r.add(A, B);
      ut = r.mul(ut, z), z = r.add(P, K), ut = r.sub(ut, z), z = r.add(b, T);
      let X = r.add(A, k);
      return z = r.mul(z, X), X = r.add(P, Y), z = r.sub(z, X), X = r.add(w, T), v = r.add(B, k), X = r.mul(X, v), v = r.add(K, Y), X = r.sub(X, v), U = r.mul(W, z), v = r.mul(H, Y), U = r.add(v, U), v = r.sub(K, U), U = r.add(K, U), N = r.mul(v, U), K = r.add(P, P), K = r.add(K, P), Y = r.mul(W, Y), z = r.mul(H, z), K = r.add(K, Y), Y = r.sub(P, Y), Y = r.mul(W, Y), z = r.add(z, Y), P = r.mul(K, z), N = r.add(N, P), P = r.mul(X, z), v = r.mul(ut, v), v = r.sub(v, P), P = r.mul(ut, K), U = r.mul(X, U), U = r.add(U, P), new C(v, N, U);
    }
    subtract(E) {
      return this.add(E.negate());
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
    multiply(E) {
      const { endo: b } = t;
      if (!i.isValidNot0(E))
        throw new Error("invalid scalar: out of range");
      let w, T;
      const A = (B) => at.cached(this, B, (k) => ec(C, k));
      if (b) {
        const { k1neg: B, k1: k, k2neg: v, k2: N } = R(E), { p: U, f: W } = A(k), { p: H, f: P } = A(N);
        T = W.add(P), w = Q(b.beta, U, H, B, v);
      } else {
        const { p: B, f: k } = A(E);
        w = B, T = k;
      }
      return ec(C, [w, T])[0];
    }
    /**
     * Non-constant-time multiplication. Uses double-and-add algorithm.
     * It's faster, but should only be used when you don't care about
     * an exposed secret key e.g. sig verification, which works over *public* keys.
     */
    multiplyUnsafe(E) {
      const { endo: b } = t, w = this;
      if (!i.isValid(E))
        throw new Error("invalid scalar: out of range");
      if (E === Ee || w.is0())
        return C.ZERO;
      if (E === En)
        return w;
      if (at.hasCache(this))
        return this.multiply(E);
      if (b) {
        const { k1neg: T, k1: A, k2neg: B, k2: k } = R(E), { p1: v, p2: N } = Gp(C, w, A, k);
        return Q(b.beta, v, N, T, B);
      } else
        return at.unsafe(w, E);
    }
    /**
     * Converts Projective point to affine (x, y) coordinates.
     * @param invertedZ Z^-1 (inverted zero) - optional, precomputation is useful for invertBatch
     */
    toAffine(E) {
      return V(this, E);
    }
    /**
     * Checks whether Point is free of torsion elements (is in prime subgroup).
     * Always torsion-free for cofactor=1 curves.
     */
    isTorsionFree() {
      const { isTorsionFree: E } = t;
      return o === En ? !0 : E ? E(C, this) : at.unsafe(this, a).is0();
    }
    clearCofactor() {
      const { clearCofactor: E } = t;
      return o === En ? this : E ? E(C, this) : this.multiplyUnsafe(o);
    }
    isSmallOrder() {
      return this.multiplyUnsafe(o).is0();
    }
    toBytes(E = !0) {
      return fi(E, "isCompressed"), this.assertValidity(), p(C, this, E);
    }
    toHex(E = !0) {
      return Di(this.toBytes(E));
    }
    toString() {
      return `<Point ${this.is0() ? "ZERO" : this.toHex()}>`;
    }
  }
  const J = i.BITS, at = new Wp(C, t.endo ? Math.ceil(J / 2) : J);
  return C.BASE.precompute(8), C;
}
function rf(e) {
  return Uint8Array.of(e ? 2 : 3);
}
function sf(e, t) {
  return {
    secretKey: t.BYTES,
    publicKey: 1 + e.BYTES,
    publicKeyUncompressed: 1 + 2 * e.BYTES,
    publicKeyHasPrefix: !0,
    signature: 2 * t.BYTES
  };
}
function Jp(e, t = {}) {
  const { Fn: n } = e, r = t.randomBytes || Vi, i = Object.assign(sf(e.Fp, n), { seed: Yl(n.ORDER) });
  function s(p) {
    try {
      const y = n.fromBytes(p);
      return n.isValidNot0(y);
    } catch {
      return !1;
    }
  }
  function o(p, y) {
    const { publicKey: d, publicKeyUncompressed: g } = i;
    try {
      const m = p.length;
      return y === !0 && m !== d || y === !1 && m !== g ? !1 : !!e.fromBytes(p);
    } catch {
      return !1;
    }
  }
  function a(p = r(i.seed)) {
    return Zl(rt(p, i.seed, "seed"), n.ORDER);
  }
  function c(p, y = !0) {
    return e.BASE.multiply(n.fromBytes(p)).toBytes(y);
  }
  function u(p) {
    const { secretKey: y, publicKey: d, publicKeyUncompressed: g } = i;
    if (!Po(p) || "_lengths" in n && n._lengths || y === d)
      return;
    const m = rt(p, void 0, "key").length;
    return m === d || m === g;
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
    isValidSecretKey: s,
    isValidPublicKey: o,
    randomSecretKey: a
  }, h = Jl(a, c);
  return Object.freeze({ getPublicKey: c, getSharedSecret: l, keygen: h, Point: e, utils: f, lengths: i });
}
function tg(e, t, n = {}) {
  sl(t), Mo(n, {}, {
    hmac: "function",
    lowS: "boolean",
    randomBytes: "function",
    bits2int: "function",
    bits2int_modN: "function"
  }), n = Object.assign({}, n);
  const r = n.randomBytes || Vi, i = n.hmac || ((b, w) => ef(t, b, w)), { Fp: s, Fn: o } = e, { ORDER: a, BITS: c } = o, { keygen: u, getPublicKey: l, getSharedSecret: f, utils: h, lengths: p } = Jp(e, n), y = {
    prehash: !0,
    lowS: typeof n.lowS == "boolean" ? n.lowS : !0,
    format: "compact",
    extraEntropy: !1
  }, d = a * nf < s.ORDER;
  function g(b) {
    const w = a >> En;
    return b > w;
  }
  function m(b, w) {
    if (!o.isValidNot0(w))
      throw new Error(`invalid signature ${b}: out of range 1..Point.Fn.ORDER`);
    return w;
  }
  function S() {
    if (d)
      throw new Error('"recovered" sig type is not supported for cofactor >2 curves');
  }
  function I(b, w) {
    Xs(w);
    const T = p.signature, A = w === "compact" ? T : w === "recovered" ? T + 1 : void 0;
    return rt(b, A);
  }
  class L {
    r;
    s;
    recovery;
    constructor(w, T, A) {
      if (this.r = m("r", w), this.s = m("s", T), A != null) {
        if (S(), ![0, 1, 2, 3].includes(A))
          throw new Error("invalid recovery id");
        this.recovery = A;
      }
      Object.freeze(this);
    }
    static fromBytes(w, T = y.format) {
      I(w, T);
      let A;
      if (T === "der") {
        const { r: N, s: U } = Re.toSig(rt(w));
        return new L(N, U);
      }
      T === "recovered" && (A = w[0], T = "compact", w = w.subarray(1));
      const B = p.signature / 2, k = w.subarray(0, B), v = w.subarray(B, B * 2);
      return new L(o.fromBytes(k), o.fromBytes(v), A);
    }
    static fromHex(w, T) {
      return this.fromBytes(li(w), T);
    }
    assertRecovery() {
      const { recovery: w } = this;
      if (w == null)
        throw new Error("invalid recovery id: must be present");
      return w;
    }
    addRecoveryBit(w) {
      return new L(this.r, this.s, w);
    }
    recoverPublicKey(w) {
      const { r: T, s: A } = this, B = this.assertRecovery(), k = B === 2 || B === 3 ? T + a : T;
      if (!s.isValid(k))
        throw new Error("invalid recovery id: sig.r+curve.n != R.x");
      const v = s.toBytes(k), N = e.fromBytes(se(rf((B & 1) === 0), v)), U = o.inv(k), W = V(rt(w, void 0, "msgHash")), H = o.create(-W * U), P = o.create(A * U), K = e.BASE.multiplyUnsafe(H).add(N.multiplyUnsafe(P));
      if (K.is0())
        throw new Error("invalid recovery: point at infinify");
      return K.assertValidity(), K;
    }
    // Signatures should be low-s, to prevent malleability.
    hasHighS() {
      return g(this.s);
    }
    toBytes(w = y.format) {
      if (Xs(w), w === "der")
        return li(Re.hexFromSig(this));
      const { r: T, s: A } = this, B = o.toBytes(T), k = o.toBytes(A);
      return w === "recovered" ? (S(), se(Uint8Array.of(this.assertRecovery()), B, k)) : se(B, k);
    }
    toHex(w) {
      return Di(this.toBytes(w));
    }
  }
  const R = n.bits2int || function(w) {
    if (w.length > 8192)
      throw new Error("input is too large");
    const T = Mn(w), A = w.length * 8 - c;
    return A > 0 ? T >> BigInt(A) : T;
  }, V = n.bits2int_modN || function(w) {
    return o.create(R(w));
  }, x = Vo(c);
  function Q(b) {
    return qh("num < 2^" + c, b, Ee, x), o.toBytes(b);
  }
  function C(b, w) {
    return rt(b, void 0, "message"), w ? rt(t(b), void 0, "prehashed message") : b;
  }
  function J(b, w, T) {
    const { lowS: A, prehash: B, extraEntropy: k } = ds(T, y);
    b = C(b, B);
    const v = V(b), N = o.fromBytes(w);
    if (!o.isValidNot0(N))
      throw new Error("invalid private key");
    const U = [Q(N), Q(v)];
    if (k != null && k !== !1) {
      const K = k === !0 ? r(p.secretKey) : k;
      U.push(rt(K, void 0, "extraEntropy"));
    }
    const W = se(...U), H = v;
    function P(K) {
      const Y = R(K);
      if (!o.isValidNot0(Y))
        return;
      const ut = o.inv(Y), z = e.BASE.multiply(Y).toAffine(), X = o.create(z.x);
      if (X === Ee)
        return;
      const fe = o.create(ut * o.create(H + X * N));
      if (fe === Ee)
        return;
      let Hn = (z.x === X ? 0 : 2) | Number(z.y & En), Fn = fe;
      return A && g(fe) && (Fn = o.neg(fe), Hn ^= 1), new L(X, Fn, d ? void 0 : Hn);
    }
    return { seed: W, k2sig: P };
  }
  function at(b, w, T = {}) {
    const { seed: A, k2sig: B } = J(b, w, T);
    return Zh(t.outputLen, o.BYTES, i)(A, B).toBytes(T.format);
  }
  function _(b, w, T, A = {}) {
    const { lowS: B, prehash: k, format: v } = ds(A, y);
    if (T = rt(T, void 0, "publicKey"), w = C(w, k), !Po(b)) {
      const N = b instanceof L ? ", use sig.toBytes()" : "";
      throw new Error("verify expects Uint8Array signature" + N);
    }
    I(b, v);
    try {
      const N = L.fromBytes(b, v), U = e.fromBytes(T);
      if (B && N.hasHighS())
        return !1;
      const { r: W, s: H } = N, P = V(w), K = o.inv(H), Y = o.create(P * K), ut = o.create(W * K), z = e.BASE.multiplyUnsafe(Y).add(U.multiplyUnsafe(ut));
      return z.is0() ? !1 : o.create(z.x) === W;
    } catch {
      return !1;
    }
  }
  function E(b, w, T = {}) {
    const { prehash: A } = ds(T, y);
    return w = C(w, A), L.fromBytes(b, "recovered").recoverPublicKey(w).toBytes();
  }
  return Object.freeze({
    keygen: u,
    getPublicKey: l,
    getSharedSecret: f,
    utils: h,
    lengths: p,
    Point: e,
    sign: at,
    verify: _,
    recoverPublicKey: E,
    Signature: L,
    hash: t
  });
}
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const zi = {
  p: BigInt("0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffefffffc2f"),
  n: BigInt("0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141"),
  h: BigInt(1),
  a: BigInt(0),
  b: BigInt(7),
  Gx: BigInt("0x79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798"),
  Gy: BigInt("0x483ada7726a3c4655da4fbfc0e1108a8fd17b448a68554199c47d08ffb10d4b8")
}, eg = {
  beta: BigInt("0x7ae96a2b657c07106e64479eac3434e99cf0497512f58995c1396c28719501ee"),
  basises: [
    [BigInt("0x3086d221a7d46bcde86c90e49284eb15"), -BigInt("0xe4437ed6010e88286f547fa90abfe4c3")],
    [BigInt("0x114ca50f7a8e2f3f657c1108d9d44cfd8"), BigInt("0x3086d221a7d46bcde86c90e49284eb15")]
  ]
}, ng = /* @__PURE__ */ BigInt(0), Qs = /* @__PURE__ */ BigInt(2);
function rg(e) {
  const t = zi.p, n = BigInt(3), r = BigInt(6), i = BigInt(11), s = BigInt(22), o = BigInt(23), a = BigInt(44), c = BigInt(88), u = e * e * e % t, l = u * u * e % t, f = Ft(l, n, t) * l % t, h = Ft(f, n, t) * l % t, p = Ft(h, Qs, t) * u % t, y = Ft(p, i, t) * p % t, d = Ft(y, s, t) * y % t, g = Ft(d, a, t) * d % t, m = Ft(g, c, t) * g % t, S = Ft(m, a, t) * d % t, I = Ft(S, n, t) * l % t, L = Ft(I, o, t) * y % t, R = Ft(L, r, t) * u % t, V = Ft(R, Qs, t);
  if (!wi.eql(wi.sqr(V), e))
    throw new Error("Cannot find square root");
  return V;
}
const wi = Ki(zi.p, { sqrt: rg }), hn = /* @__PURE__ */ Qp(zi, {
  Fp: wi,
  endo: eg
}), oc = /* @__PURE__ */ tg(hn, Zs), ac = {};
function mi(e, ...t) {
  let n = ac[e];
  if (n === void 0) {
    const r = Zs(Wh(e));
    n = se(r, r), ac[e] = n;
  }
  return Zs(se(n, ...t));
}
const zo = (e) => e.toBytes(!0).slice(1), jo = (e) => e % Qs === ng;
function Js(e) {
  const { Fn: t, BASE: n } = hn, r = t.fromBytes(e), i = n.multiply(r);
  return { scalar: jo(i.y) ? r : t.neg(r), bytes: zo(i) };
}
function of(e) {
  const t = wi;
  if (!t.isValidNot0(e))
    throw new Error("invalid x: Fail if x ≥ p");
  const n = t.create(e * e), r = t.create(n * e + BigInt(7));
  let i = t.sqrt(r);
  jo(i) || (i = t.neg(i));
  const s = hn.fromAffine({ x: e, y: i });
  return s.assertValidity(), s;
}
const er = Mn;
function af(...e) {
  return hn.Fn.create(er(mi("BIP0340/challenge", ...e)));
}
function cc(e) {
  return Js(e).bytes;
}
function ig(e, t, n = Vi(32)) {
  const { Fn: r } = hn, i = rt(e, void 0, "message"), { bytes: s, scalar: o } = Js(t), a = rt(n, 32, "auxRand"), c = r.toBytes(o ^ er(mi("BIP0340/aux", a))), u = mi("BIP0340/nonce", c, s, i), { bytes: l, scalar: f } = Js(u), h = af(l, s, i), p = new Uint8Array(64);
  if (p.set(l, 0), p.set(r.toBytes(r.create(f + h * o)), 32), !cf(p, i, s))
    throw new Error("sign: Invalid signature produced");
  return p;
}
function cf(e, t, n) {
  const { Fp: r, Fn: i, BASE: s } = hn, o = rt(e, 64, "signature"), a = rt(t, void 0, "message"), c = rt(n, 32, "publicKey");
  try {
    const u = of(er(c)), l = er(o.subarray(0, 32));
    if (!r.isValidNot0(l))
      return !1;
    const f = er(o.subarray(32, 64));
    if (!i.isValidNot0(f))
      return !1;
    const h = af(i.toBytes(l), zo(u), a), p = s.multiplyUnsafe(f).add(u.multiplyUnsafe(i.neg(h))), { x: y, y: d } = p.toAffine();
    return !(p.is0() || !jo(d) || y !== l);
  } catch {
    return !1;
  }
}
const Wo = /* @__PURE__ */ (() => {
  const n = (r = Vi(48)) => Zl(r, zi.n);
  return {
    keygen: Jl(n, cc),
    getPublicKey: cc,
    sign: ig,
    verify: cf,
    Point: hn,
    utils: {
      randomSecretKey: n,
      taggedHash: mi,
      lift_x: of,
      pointToBytes: zo
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
function Go(e, t, n = {}) {
  e = Ks(e);
  const { aggPublicKey: r } = zs(e);
  if (!n.taprootTweak)
    return {
      preTweakedKey: r.toBytes(!0),
      finalKey: r.toBytes(!0)
    };
  const i = Wo.utils.taggedHash("TapTweak", r.toBytes(!0).subarray(1), n.taprootTweak ?? new Uint8Array(0)), { aggPublicKey: s } = zs(e, [i], [!0]);
  return {
    preTweakedKey: r.toBytes(!0),
    finalKey: s.toBytes(!0)
  };
}
class $r extends Error {
  constructor(t) {
    super(t), this.name = "PartialSignatureError";
  }
}
class qo {
  constructor(t, n) {
    if (this.s = t, this.R = n, t.length !== 32)
      throw new $r("Invalid s length");
    if (n.length !== 33)
      throw new $r("Invalid R length");
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
      throw new $r("Invalid partial signature length");
    if (Mn(t) >= kt.CURVE().n)
      throw new $r("s value overflows curve order");
    const r = new Uint8Array(33);
    return new qo(t, r);
  }
}
function sg(e, t, n, r, i, s) {
  let o;
  if (s?.taprootTweak !== void 0) {
    const { preTweakedKey: u } = Go(Ks(r));
    o = Wo.utils.taggedHash("TapTweak", u.subarray(1), s.taprootTweak);
  }
  const c = new Dh(n, Ks(r), i, o ? [o] : void 0, o ? [!0] : void 0).sign(e, t);
  return qo.decode(c);
}
var hs, uc;
function og() {
  if (uc) return hs;
  uc = 1;
  const e = 4294967295, t = 1 << 31, n = 9, r = 65535, i = 1 << 22, s = r, o = 1 << n, a = r << n;
  function c(l) {
    return l & t ? {} : l & i ? {
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
      return i | f >> n;
    }
    if (!Number.isFinite(l)) throw new TypeError("Expected Number blocks");
    if (l > r) throw new TypeError("Expected Number blocks <= " + s);
    return l;
  }
  return hs = { decode: c, encode: u }, hs;
}
var to = og(), _t;
(function(e) {
  e.VtxoTaprootTree = "taptree", e.VtxoTreeExpiry = "expiry", e.Cosigner = "cosigner", e.ConditionWitness = "condition";
})(_t || (_t = {}));
const Yo = 222;
function ag(e, t, n, r) {
  e.updateInput(t, {
    unknown: [
      ...e.getInput(t)?.unknown ?? [],
      n.encode(r)
    ]
  });
}
function eo(e, t, n) {
  const r = e.getInput(t)?.unknown ?? [], i = [];
  for (const s of r) {
    const o = n.decode(s);
    o && i.push(o);
  }
  return i;
}
const uf = {
  key: _t.VtxoTaprootTree,
  encode: (e) => [
    {
      type: Yo,
      key: ji[_t.VtxoTaprootTree]
    },
    e
  ],
  decode: (e) => Zo(() => Xo(e[0], _t.VtxoTaprootTree) ? e[1] : null)
}, cg = {
  key: _t.ConditionWitness,
  encode: (e) => [
    {
      type: Yo,
      key: ji[_t.ConditionWitness]
    },
    or.encode(e)
  ],
  decode: (e) => Zo(() => Xo(e[0], _t.ConditionWitness) ? or.decode(e[1]) : null)
}, no = {
  key: _t.Cosigner,
  encode: (e) => [
    {
      type: Yo,
      key: new Uint8Array([
        ...ji[_t.Cosigner],
        e.index
      ])
    },
    e.key
  ],
  decode: (e) => Zo(() => Xo(e[0], _t.Cosigner) ? {
    index: e[0].key[e[0].key.length - 1],
    key: e[1]
  } : null)
};
_t.VtxoTreeExpiry;
const ji = Object.fromEntries(Object.values(_t).map((e) => [
  e,
  new TextEncoder().encode(e)
])), Zo = (e) => {
  try {
    return e();
  } catch {
    return null;
  }
};
function Xo(e, t) {
  const n = O.encode(ji[t]);
  return O.encode(new Uint8Array([e.type, ...e.key])).includes(n);
}
const Nr = new Error("missing vtxo graph");
class fr {
  constructor(t) {
    this.secretKey = t, this.myNonces = null, this.aggregateNonces = null, this.graph = null, this.scriptRoot = null, this.rootSharedOutputAmount = null;
  }
  static random() {
    const t = Ls();
    return new fr(t);
  }
  async init(t, n, r) {
    this.graph = t, this.scriptRoot = n, this.rootSharedOutputAmount = r;
  }
  async getPublicKey() {
    return oc.getPublicKey(this.secretKey);
  }
  async getNonces() {
    if (!this.graph)
      throw Nr;
    this.myNonces || (this.myNonces = this.generateNonces());
    const t = /* @__PURE__ */ new Map();
    for (const [n, r] of this.myNonces)
      t.set(n, { pubNonce: r.pubNonce });
    return t;
  }
  async aggregatedNonces(t, n) {
    if (!this.graph)
      throw Nr;
    if (this.aggregateNonces || (this.aggregateNonces = /* @__PURE__ */ new Map()), this.myNonces || await this.getNonces(), this.aggregateNonces.has(t))
      return {
        hasAllNonces: this.aggregateNonces.size === this.myNonces?.size
      };
    const r = this.myNonces.get(t);
    if (!r)
      throw new Error(`missing nonce for txid ${t}`);
    const i = await this.getPublicKey();
    n.set(O.encode(i.subarray(1)), r);
    const s = this.graph.find(t);
    if (!s)
      throw new Error(`missing tx for txid ${t}`);
    const o = eo(s.root, 0, no).map(
      (u) => O.encode(u.key.subarray(1))
      // xonly pubkey
    ), a = [];
    for (const u of o) {
      const l = n.get(u);
      if (!l)
        throw new Error(`missing nonce for cosigner ${u}`);
      a.push(l.pubNonce);
    }
    const c = Mh(a);
    return this.aggregateNonces.set(t, { pubNonce: c }), {
      hasAllNonces: this.aggregateNonces.size === this.myNonces?.size
    };
  }
  async sign() {
    if (!this.graph)
      throw Nr;
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
      throw Nr;
    const t = /* @__PURE__ */ new Map(), n = oc.getPublicKey(this.secretKey);
    for (const r of this.graph.iterator()) {
      const i = Vh(n);
      t.set(r.txid, i);
    }
    return t;
  }
  signPartial(t) {
    if (!this.graph || !this.scriptRoot || !this.rootSharedOutputAmount)
      throw fr.NOT_INITIALIZED;
    if (!this.myNonces || !this.aggregateNonces)
      throw new Error("session not properly initialized");
    const n = this.myNonces.get(t.txid);
    if (!n)
      throw new Error("missing private nonce");
    const r = this.aggregateNonces.get(t.txid);
    if (!r)
      throw new Error("missing aggregate nonce");
    const i = [], s = [], o = eo(t.root, 0, no).map((u) => u.key), { finalKey: a } = Go(o, !0, {
      taprootTweak: this.scriptRoot
    });
    for (let u = 0; u < t.root.inputsLength; u++) {
      const l = ug(a, this.graph, this.rootSharedOutputAmount, t.root);
      i.push(l.amount), s.push(l.script);
    }
    const c = t.root.preimageWitnessV1(
      0,
      // always first input
      s,
      Ke.DEFAULT,
      i
    );
    return sg(n.secNonce, this.secretKey, r.pubNonce, o, c, {
      taprootTweak: this.scriptRoot
    });
  }
}
fr.NOT_INITIALIZED = new Error("session not initialized, call init method");
function ug(e, t, n, r) {
  const i = j.encode(["OP_1", e.slice(1)]);
  if (r.id === t.txid)
    return {
      amount: n,
      script: i
    };
  const s = r.getInput(0);
  if (!s.txid)
    throw new Error("missing parent input txid");
  const o = O.encode(s.txid), a = t.find(o);
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
const lc = Object.values(Ke).filter((e) => typeof e == "number");
class nr {
  constructor(t) {
    this.key = t || Ls();
  }
  static fromPrivateKey(t) {
    return new nr(t);
  }
  static fromHex(t) {
    return new nr(O.decode(t));
  }
  static fromRandomBytes() {
    return new nr(Ls());
  }
  /**
   * Export the private key as a hex string.
   *
   * @returns The private key as a hex string
   */
  toHex() {
    return O.encode(this.key);
  }
  async sign(t, n) {
    const r = t.clone();
    if (!n) {
      try {
        if (!r.sign(this.key, lc))
          throw new Error("Failed to sign transaction");
      } catch (i) {
        if (!(i instanceof Error && i.message.includes("No inputs signed"))) throw i;
      }
      return r;
    }
    for (const i of n)
      if (!r.signIdx(this.key, i, lc))
        throw new Error(`Failed to sign input #${i}`);
    return r;
  }
  compressedPublicKey() {
    return Promise.resolve(Ku(this.key, !0));
  }
  xOnlyPublicKey() {
    return Promise.resolve(Io(this.key));
  }
  signerSession() {
    return fr.random();
  }
  async signMessage(t, n = "schnorr") {
    return n === "ecdsa" ? bp(t, this.key, { prehash: !1 }) : Ip.signAsync(t, this.key);
  }
  async toReadonly() {
    return new Wi(await this.compressedPublicKey());
  }
}
class Wi {
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
    return new Wi(t);
  }
  xOnlyPublicKey() {
    return Promise.resolve(this.publicKey.slice(1));
  }
  compressedPublicKey() {
    return Promise.resolve(this.publicKey);
  }
}
class Te {
  constructor(t, n, r, i = 0) {
    if (this.serverPubKey = t, this.vtxoTaprootKey = n, this.hrp = r, this.version = i, t.length !== 32)
      throw new Error("Invalid server public key length, expected 32 bytes, got " + t.length);
    if (n.length !== 32)
      throw new Error("Invalid vtxo taproot public key length, expected 32 bytes, got " + n.length);
  }
  static decode(t) {
    const n = pn.decodeUnsafe(t, 1023);
    if (!n)
      throw new Error("Invalid address");
    const r = new Uint8Array(pn.fromWords(n.words));
    if (r.length !== 65)
      throw new Error("Invalid data length, expected 65 bytes, got " + r.length);
    const i = r[0], s = r.slice(1, 33), o = r.slice(33, 65);
    return new Te(s, o, n.prefix, i);
  }
  encode() {
    const t = new Uint8Array(65);
    t[0] = this.version, t.set(this.serverPubKey, 1), t.set(this.vtxoTaprootKey, 33);
    const n = pn.toWords(t);
    return pn.encode(this.hrp, n, 1023);
  }
  // pkScript is the script that should be used to send non-dust funds to the address
  get pkScript() {
    return j.encode(["OP_1", this.vtxoTaprootKey]);
  }
  // subdustPkScript is the script that should be used to send sub-dust funds to the address
  get subdustPkScript() {
    return j.encode(["RETURN", this.vtxoTaprootKey]);
  }
}
const bi = Bo(void 0, !0);
var yt;
(function(e) {
  e.Multisig = "multisig", e.CSVMultisig = "csv-multisig", e.ConditionCSVMultisig = "condition-csv-multisig", e.ConditionMultisig = "condition-multisig", e.CLTVMultisig = "cltv-multisig";
})(yt || (yt = {}));
function Qo(e) {
  const t = [
    Mt,
    Dt,
    dr,
    Ei,
    Un
  ];
  for (const n of t)
    try {
      return n.decode(e);
    } catch {
      continue;
    }
  throw new Error(`Failed to decode: script ${O.encode(e)} is not a valid tapscript`);
}
var Mt;
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
        type: yt.Multisig,
        params: a,
        script: kh(a.pubkeys.length, a.pubkeys).script
      };
    const c = [];
    for (let u = 0; u < a.pubkeys.length; u++)
      c.push(a.pubkeys[u]), u < a.pubkeys.length - 1 ? c.push("CHECKSIGVERIFY") : c.push("CHECKSIG");
    return {
      type: yt.Multisig,
      params: a,
      script: j.encode(c)
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
    const c = j.decode(a), u = [];
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
    if (O.encode(f.script) !== O.encode(a))
      throw new Error("Invalid script format: script reconstruction mismatch");
    return {
      type: yt.Multisig,
      params: { pubkeys: u, type: t.CHECKSIGADD },
      script: a
    };
  }
  function s(a) {
    const c = j.decode(a), u = [];
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
    if (O.encode(l.script) !== O.encode(a))
      throw new Error("Invalid script format: script reconstruction mismatch");
    return {
      type: yt.Multisig,
      params: { pubkeys: u, type: t.CHECKSIG },
      script: a
    };
  }
  function o(a) {
    return a.type === yt.Multisig;
  }
  e.is = o;
})(Mt || (Mt = {}));
var Dt;
(function(e) {
  function t(i) {
    for (const u of i.pubkeys)
      if (u.length !== 32)
        throw new Error(`Invalid pubkey length: expected 32, got ${u.length}`);
    const s = bi.encode(BigInt(to.encode(i.timelock.type === "blocks" ? { blocks: Number(i.timelock.value) } : { seconds: Number(i.timelock.value) }))), o = [
      s.length === 1 ? s[0] : s,
      "CHECKSEQUENCEVERIFY",
      "DROP"
    ], a = Mt.encode(i), c = new Uint8Array([
      ...j.encode(o),
      ...a.script
    ]);
    return {
      type: yt.CSVMultisig,
      params: i,
      script: c
    };
  }
  e.encode = t;
  function n(i) {
    if (i.length === 0)
      throw new Error("Failed to decode: script is empty");
    const s = j.decode(i);
    if (s.length < 3)
      throw new Error("Invalid script: too short (expected at least 3)");
    const o = s[0];
    if (typeof o == "string")
      throw new Error("Invalid script: expected sequence number");
    if (s[1] !== "CHECKSEQUENCEVERIFY" || s[2] !== "DROP")
      throw new Error("Invalid script: expected CHECKSEQUENCEVERIFY DROP");
    const a = new Uint8Array(j.encode(s.slice(3)));
    let c;
    try {
      c = Mt.decode(a);
    } catch (p) {
      throw new Error(`Invalid multisig script: ${p instanceof Error ? p.message : String(p)}`);
    }
    let u;
    typeof o == "number" ? u = o : u = Number(bi.decode(o));
    const l = to.decode(u), f = l.blocks !== void 0 ? { type: "blocks", value: BigInt(l.blocks) } : { type: "seconds", value: BigInt(l.seconds) }, h = t({
      timelock: f,
      ...c.params
    });
    if (O.encode(h.script) !== O.encode(i))
      throw new Error("Invalid script format: script reconstruction mismatch");
    return {
      type: yt.CSVMultisig,
      params: {
        timelock: f,
        ...c.params
      },
      script: i
    };
  }
  e.decode = n;
  function r(i) {
    return i.type === yt.CSVMultisig;
  }
  e.is = r;
})(Dt || (Dt = {}));
var dr;
(function(e) {
  function t(i) {
    const s = new Uint8Array([
      ...i.conditionScript,
      ...j.encode(["VERIFY"]),
      ...Dt.encode(i).script
    ]);
    return {
      type: yt.ConditionCSVMultisig,
      params: i,
      script: s
    };
  }
  e.encode = t;
  function n(i) {
    if (i.length === 0)
      throw new Error("Failed to decode: script is empty");
    const s = j.decode(i);
    if (s.length < 1)
      throw new Error("Invalid script: too short (expected at least 1)");
    let o = -1;
    for (let f = s.length - 1; f >= 0; f--)
      s[f] === "VERIFY" && (o = f);
    if (o === -1)
      throw new Error("Invalid script: missing VERIFY operation");
    const a = new Uint8Array(j.encode(s.slice(0, o))), c = new Uint8Array(j.encode(s.slice(o + 1)));
    let u;
    try {
      u = Dt.decode(c);
    } catch (f) {
      throw new Error(`Invalid CSV multisig script: ${f instanceof Error ? f.message : String(f)}`);
    }
    const l = t({
      conditionScript: a,
      ...u.params
    });
    if (O.encode(l.script) !== O.encode(i))
      throw new Error("Invalid script format: script reconstruction mismatch");
    return {
      type: yt.ConditionCSVMultisig,
      params: {
        conditionScript: a,
        ...u.params
      },
      script: i
    };
  }
  e.decode = n;
  function r(i) {
    return i.type === yt.ConditionCSVMultisig;
  }
  e.is = r;
})(dr || (dr = {}));
var Ei;
(function(e) {
  function t(i) {
    const s = new Uint8Array([
      ...i.conditionScript,
      ...j.encode(["VERIFY"]),
      ...Mt.encode(i).script
    ]);
    return {
      type: yt.ConditionMultisig,
      params: i,
      script: s
    };
  }
  e.encode = t;
  function n(i) {
    if (i.length === 0)
      throw new Error("Failed to decode: script is empty");
    const s = j.decode(i);
    if (s.length < 1)
      throw new Error("Invalid script: too short (expected at least 1)");
    let o = -1;
    for (let f = s.length - 1; f >= 0; f--)
      s[f] === "VERIFY" && (o = f);
    if (o === -1)
      throw new Error("Invalid script: missing VERIFY operation");
    const a = new Uint8Array(j.encode(s.slice(0, o))), c = new Uint8Array(j.encode(s.slice(o + 1)));
    let u;
    try {
      u = Mt.decode(c);
    } catch (f) {
      throw new Error(`Invalid multisig script: ${f instanceof Error ? f.message : String(f)}`);
    }
    const l = t({
      conditionScript: a,
      ...u.params
    });
    if (O.encode(l.script) !== O.encode(i))
      throw new Error("Invalid script format: script reconstruction mismatch");
    return {
      type: yt.ConditionMultisig,
      params: {
        conditionScript: a,
        ...u.params
      },
      script: i
    };
  }
  e.decode = n;
  function r(i) {
    return i.type === yt.ConditionMultisig;
  }
  e.is = r;
})(Ei || (Ei = {}));
var Un;
(function(e) {
  function t(i) {
    const s = bi.encode(i.absoluteTimelock), o = [
      s.length === 1 ? s[0] : s,
      "CHECKLOCKTIMEVERIFY",
      "DROP"
    ], a = j.encode(o), c = new Uint8Array([
      ...a,
      ...Mt.encode(i).script
    ]);
    return {
      type: yt.CLTVMultisig,
      params: i,
      script: c
    };
  }
  e.encode = t;
  function n(i) {
    if (i.length === 0)
      throw new Error("Failed to decode: script is empty");
    const s = j.decode(i);
    if (s.length < 3)
      throw new Error("Invalid script: too short (expected at least 3)");
    const o = s[0];
    if (typeof o == "string" || typeof o == "number")
      throw new Error("Invalid script: expected locktime number");
    if (s[1] !== "CHECKLOCKTIMEVERIFY" || s[2] !== "DROP")
      throw new Error("Invalid script: expected CHECKLOCKTIMEVERIFY DROP");
    const a = new Uint8Array(j.encode(s.slice(3)));
    let c;
    try {
      c = Mt.decode(a);
    } catch (f) {
      throw new Error(`Invalid multisig script: ${f instanceof Error ? f.message : String(f)}`);
    }
    const u = bi.decode(o), l = t({
      absoluteTimelock: u,
      ...c.params
    });
    if (O.encode(l.script) !== O.encode(i))
      throw new Error("Invalid script format: script reconstruction mismatch");
    return {
      type: yt.CLTVMultisig,
      params: {
        absoluteTimelock: u,
        ...c.params
      },
      script: i
    };
  }
  e.decode = n;
  function r(i) {
    return i.type === yt.CLTVMultisig;
  }
  e.is = r;
})(Un || (Un = {}));
const fc = ar.tapTree[2];
function xn(e) {
  return e[1].subarray(0, e[1].length - 1);
}
class At {
  static decode(t) {
    const r = fc.decode(t).map((i) => i.script);
    return new At(r);
  }
  constructor(t) {
    this.scripts = t;
    const n = t.length % 2 !== 0 ? t.slice().reverse() : t, r = Xu(n.map((s) => ({
      script: s,
      leafVersion: cr
    }))), i = Ih(Oo, r, void 0, !0);
    if (!i.tapLeafScript || i.tapLeafScript.length !== t.length)
      throw new Error("invalid scripts");
    this.leaves = i.tapLeafScript, this.tweakedPublicKey = i.tweakedPubkey;
  }
  encode() {
    return fc.encode(this.scripts.map((n) => ({
      depth: 1,
      version: cr,
      script: n
    })));
  }
  address(t, n) {
    return new Te(n, this.tweakedPublicKey, t);
  }
  get pkScript() {
    return j.encode(["OP_1", this.tweakedPublicKey]);
  }
  onchainAddress(t) {
    return Fe(t).encode({
      type: "tr",
      pubkey: this.tweakedPublicKey
    });
  }
  findLeaf(t) {
    const n = this.leaves.find((r) => O.encode(xn(r)) === t);
    if (!n)
      throw new Error(`leaf '${t}' not found`);
    return n;
  }
  exitPaths() {
    const t = [];
    for (const n of this.leaves)
      try {
        const r = Dt.decode(xn(n));
        t.push(r);
        continue;
      } catch {
        try {
          const i = dr.decode(xn(n));
          t.push(i);
        } catch {
          continue;
        }
      }
    return t;
  }
}
function lg(e) {
  let t;
  try {
    const n = e[1], r = n.subarray(0, n.length - 1);
    try {
      const i = Dt.decode(r).params;
      t = to.encode(i.timelock.type === "blocks" ? { blocks: Number(i.timelock.value) } : { seconds: Number(i.timelock.value) });
    } catch {
      const i = Un.decode(r).params;
      t = Number(i.absoluteTimelock);
    }
  } catch {
  }
  return t;
}
var dc;
(function(e) {
  class t extends At {
    constructor(i) {
      n(i);
      const { sender: s, receiver: o, server: a, preimageHash: c, refundLocktime: u, unilateralClaimDelay: l, unilateralRefundDelay: f, unilateralRefundWithoutReceiverDelay: h } = i, p = fg(c), y = Ei.encode({
        conditionScript: p,
        pubkeys: [o, a]
      }).script, d = Mt.encode({
        pubkeys: [s, o, a]
      }).script, g = Un.encode({
        absoluteTimelock: u,
        pubkeys: [s, a]
      }).script, m = dr.encode({
        conditionScript: p,
        timelock: l,
        pubkeys: [o]
      }).script, S = Dt.encode({
        timelock: f,
        pubkeys: [s, o]
      }).script, I = Dt.encode({
        timelock: h,
        pubkeys: [s]
      }).script;
      super([
        y,
        d,
        g,
        m,
        S,
        I
      ]), this.options = i, this.claimScript = O.encode(y), this.refundScript = O.encode(d), this.refundWithoutReceiverScript = O.encode(g), this.unilateralClaimScript = O.encode(m), this.unilateralRefundScript = O.encode(S), this.unilateralRefundWithoutReceiverScript = O.encode(I);
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
    const { sender: i, receiver: s, server: o, preimageHash: a, refundLocktime: c, unilateralClaimDelay: u, unilateralRefundDelay: l, unilateralRefundWithoutReceiverDelay: f } = r;
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
    if (!f || typeof f.value != "bigint" || f.value <= 0n)
      throw new Error("unilateral refund without receiver delay must greater than 0");
    if (f.type === "seconds" && f.value % 512n !== 0n)
      throw new Error("seconds timelock must be multiple of 512");
    if (f.type === "seconds" && f.value < 512n)
      throw new Error("seconds timelock must be greater or equal to 512");
  }
})(dc || (dc = {}));
function fg(e) {
  return j.encode(["HASH160", e, "EQUAL"]);
}
var hr;
(function(e) {
  class t extends At {
    constructor(r) {
      const { pubKey: i, serverPubKey: s, csvTimelock: o = t.DEFAULT_TIMELOCK } = r, a = Mt.encode({
        pubkeys: [i, s]
      }).script, c = Dt.encode({
        timelock: o,
        pubkeys: [i]
      }).script;
      super([a, c]), this.options = r, this.forfeitScript = O.encode(a), this.exitScript = O.encode(c);
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
})(hr || (hr = {}));
var we;
(function(e) {
  e.TxSent = "SENT", e.TxReceived = "RECEIVED";
})(we || (we = {}));
function xe(e) {
  return !e.isSpent;
}
function Gi(e) {
  return e.virtualStatus.state === "swept" && xe(e);
}
function lf(e) {
  if (e.virtualStatus.state === "swept")
    return !0;
  const t = e.virtualStatus.batchExpiry;
  return !t || new Date(t).getFullYear() < 2025 ? !1 : t <= Date.now();
}
function ff(e, t) {
  return e.value < t;
}
async function* ro(e) {
  const t = [], n = [];
  let r = null, i = null;
  const s = (a) => {
    r ? (r(a), r = null) : t.push(a);
  }, o = (a) => {
    const c = new Error(JSON.stringify(a));
    c.name = "EventSourceError", i ? (i(c), i = null) : n.push(c);
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
class df extends Error {
  constructor(t, n, r, i) {
    super(n), this.code = t, this.message = n, this.name = r, this.metadata = i;
  }
}
function dg(e) {
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
      return "metadata" in n && hg(n.metadata) && (a = n.metadata), new df(i, s, o, a);
    }
    return;
  } catch {
    return;
  }
}
function hg(e) {
  return typeof e == "object" && e !== null && !Array.isArray(e);
}
var oe;
(function(e) {
  function t(i, s, o = []) {
    if (typeof i != "string" && (i = r(i)), s.length == 0)
      throw new Error("intent proof requires at least one input");
    const a = s.map(Ag);
    bg(a), xg(o);
    const c = Tg(i, a[0].witnessUtxo.script);
    return Sg(c, a, o);
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
})(oe || (oe = {}));
const pg = new Uint8Array([wt.RETURN]), gg = new Uint8Array(32).fill(0), yg = 4294967295, wg = "ark-intent-proof-message";
function mg(e) {
  if (e.index === void 0)
    throw new Error("intent proof input requires index");
  if (e.txid === void 0)
    throw new Error("intent proof input requires txid");
  if (e.witnessUtxo === void 0)
    throw new Error("intent proof input requires witness utxo");
  return !0;
}
function bg(e) {
  return e.forEach(mg), !0;
}
function Eg(e) {
  if (e.amount === void 0)
    throw new Error("intent proof output requires amount");
  if (e.script === void 0)
    throw new Error("intent proof output requires script");
  return !0;
}
function xg(e) {
  return e.forEach(Eg), !0;
}
function Tg(e, t) {
  const n = vg(e), r = new ze({
    version: 0
  });
  return r.addInput({
    txid: gg,
    // zero hash
    index: yg,
    sequence: 0
  }), r.addOutput({
    amount: 0n,
    script: t
  }), r.updateInput(0, {
    finalScriptSig: j.encode(["OP_0", n])
  }), r;
}
function Sg(e, t, n) {
  const r = t[0], i = t.map((o) => o.sequence || 0).reduce((o, a) => Math.max(o, a), 0), s = new ze({
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
    sighashType: Ke.ALL
  });
  for (const [o, a] of t.entries())
    s.addInput({
      ...a,
      sighashType: Ke.ALL
    }), a.unknown?.length && s.updateInput(o + 1, {
      unknown: a.unknown
    });
  n.length === 0 && (n = [
    {
      amount: 0n,
      script: pg
    }
  ]);
  for (const o of n)
    s.addOutput({
      amount: o.amount,
      script: o.script
    });
  return s;
}
function vg(e) {
  return Wo.utils.taggedHash(wg, new TextEncoder().encode(e));
}
function Ag(e) {
  if (!("tapTree" in e))
    return e;
  const t = At.decode(e.tapTree), n = lg(e.intentTapLeafScript), r = [uf.encode(e.tapTree)];
  return e.extraWitness && r.push(cg.encode(e.extraWitness)), {
    txid: O.decode(e.txid),
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
var gt;
(function(e) {
  e.BatchStarted = "batch_started", e.BatchFinalization = "batch_finalization", e.BatchFinalized = "batch_finalized", e.BatchFailed = "batch_failed", e.TreeSigningStarted = "tree_signing_started", e.TreeNonces = "tree_nonces", e.TreeTx = "tree_tx", e.TreeSignature = "tree_signature", e.StreamStarted = "stream_started";
})(gt || (gt = {}));
class hf {
  constructor(t) {
    this.serverUrl = t;
  }
  async getInfo() {
    const t = `${this.serverUrl}/v1/info`, n = await fetch(t);
    if (!n.ok) {
      const i = await n.text();
      re(i, `Failed to get server info: ${n.statusText}`);
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
      re(o, `Failed to submit virtual transaction: ${o}`);
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
      re(s, `Failed to finalize offchain transaction: ${s}`);
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
          message: oe.encodeMessage(t.message)
        }
      })
    });
    if (!r.ok) {
      const s = await r.text();
      re(s, `Failed to register intent: ${s}`);
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
          message: oe.encodeMessage(t.message)
        }
      })
    });
    if (!r.ok) {
      const i = await r.text();
      re(i, `Failed to delete intent: ${i}`);
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
      re(i, `Failed to confirm registration: ${i}`);
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
        treeNonces: Ig(r)
      })
    });
    if (!s.ok) {
      const o = await s.text();
      re(o, `Failed to submit tree nonces: ${o}`);
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
        treeSignatures: kg(r)
      })
    });
    if (!s.ok) {
      const o = await s.text();
      re(o, `Failed to submit tree signatures: ${o}`);
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
      re(s, `Failed to submit forfeit transactions: ${i.statusText}`);
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
          for await (const a of ro(s)) {
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
        if (io(s)) {
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
          for await (const s of ro(r)) {
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
        if (io(r)) {
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
          message: oe.encodeMessage(t.message)
        }
      })
    });
    if (!r.ok) {
      const s = await r.text();
      re(s, `Failed to get pending transactions: ${s}`);
    }
    return (await r.json()).pendingTxs;
  }
  parseSettlementEvent(t) {
    if (t.batchStarted)
      return {
        type: gt.BatchStarted,
        id: t.batchStarted.id,
        intentIdHashes: t.batchStarted.intentIdHashes,
        batchExpiry: BigInt(t.batchStarted.batchExpiry)
      };
    if (t.batchFinalization)
      return {
        type: gt.BatchFinalization,
        id: t.batchFinalization.id,
        commitmentTx: t.batchFinalization.commitmentTx
      };
    if (t.batchFinalized)
      return {
        type: gt.BatchFinalized,
        id: t.batchFinalized.id,
        commitmentTxid: t.batchFinalized.commitmentTxid
      };
    if (t.batchFailed)
      return {
        type: gt.BatchFailed,
        id: t.batchFailed.id,
        reason: t.batchFailed.reason
      };
    if (t.treeSigningStarted)
      return {
        type: gt.TreeSigningStarted,
        id: t.treeSigningStarted.id,
        cosignersPublicKeys: t.treeSigningStarted.cosignersPubkeys,
        unsignedCommitmentTx: t.treeSigningStarted.unsignedCommitmentTx
      };
    if (t.treeNoncesAggregated)
      return null;
    if (t.treeNonces)
      return {
        type: gt.TreeNonces,
        id: t.treeNonces.id,
        topic: t.treeNonces.topic,
        txid: t.treeNonces.txid,
        nonces: Og(t.treeNonces.nonces)
        // pubkey -> public nonce
      };
    if (t.treeTx) {
      const n = Object.fromEntries(Object.entries(t.treeTx.children).map(([r, i]) => [parseInt(r), i]));
      return {
        type: gt.TreeTx,
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
      type: gt.TreeSignature,
      id: t.treeSignature.id,
      topic: t.treeSignature.topic,
      batchIndex: t.treeSignature.batchIndex,
      txid: t.treeSignature.txid,
      signature: t.treeSignature.signature
    } : t.streamStarted ? {
      type: gt.StreamStarted,
      id: t.streamStarted.id
    } : (t.heartbeat || console.warn("Unknown event type:", t), null);
  }
  parseTransactionNotification(t) {
    return t.commitmentTx ? {
      commitmentTx: {
        txid: t.commitmentTx.txid,
        tx: t.commitmentTx.tx,
        spentVtxos: t.commitmentTx.spentVtxos.map(Rr),
        spendableVtxos: t.commitmentTx.spendableVtxos.map(Rr),
        checkpointTxs: t.commitmentTx.checkpointTxs
      }
    } : t.arkTx ? {
      arkTx: {
        txid: t.arkTx.txid,
        tx: t.arkTx.tx,
        spentVtxos: t.arkTx.spentVtxos.map(Rr),
        spendableVtxos: t.arkTx.spendableVtxos.map(Rr),
        checkpointTxs: t.arkTx.checkpointTxs
      }
    } : (t.heartbeat || console.warn("Unknown transaction notification type:", t), null);
  }
}
function Ig(e) {
  const t = {};
  for (const [n, r] of e)
    t[n] = O.encode(r.pubNonce);
  return t;
}
function kg(e) {
  const t = {};
  for (const [n, r] of e)
    t[n] = O.encode(r.encode());
  return t;
}
function Og(e) {
  return new Map(Object.entries(e).map(([t, n]) => {
    if (typeof n != "string")
      throw new Error("invalid nonce");
    return [t, { pubNonce: O.decode(n) }];
  }));
}
function io(e) {
  const t = (n) => n instanceof Error ? n.name === "TypeError" && n.message === "Failed to fetch" || n.name === "HeadersTimeoutError" || n.name === "BodyTimeoutError" || n.code === "UND_ERR_HEADERS_TIMEOUT" || n.code === "UND_ERR_BODY_TIMEOUT" : !1;
  return t(e) || t(e.cause);
}
function Rr(e) {
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
function re(e, t) {
  const n = new Error(e);
  throw dg(n) ?? new Error(t);
}
class zr {
  constructor(t, n = /* @__PURE__ */ new Map()) {
    this.root = t, this.children = n;
  }
  static create(t) {
    if (t.length === 0)
      throw new Error("empty chunks");
    const n = /* @__PURE__ */ new Map();
    for (const s of t) {
      const o = $g(s), a = o.tx.id;
      n.set(a, o);
    }
    const r = [];
    for (const [s] of n) {
      let o = !1;
      for (const [a, c] of n)
        if (a !== s && (o = Bg(c, s), o))
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
    const i = pf(r[0], n);
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
      if (!s.txid || O.encode(s.txid) !== o || s.index !== r)
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
function Bg(e, t) {
  return Object.values(e.children).includes(t);
}
function pf(e, t) {
  const n = t.get(e);
  if (!n)
    return null;
  const r = n.tx, i = /* @__PURE__ */ new Map();
  for (const [s, o] of Object.entries(n.children)) {
    const a = parseInt(s), c = pf(o, t);
    c && i.set(a, c);
  }
  return new zr(r, i);
}
function $g(e) {
  return { tx: Yt.fromPSBT(ft.decode(e.tx)), children: e.children };
}
var so;
(function(e) {
  let t;
  (function(r) {
    r.Start = "start", r.BatchStarted = "batch_started", r.TreeSigningStarted = "tree_signing_started", r.TreeNoncesAggregated = "tree_nonces_aggregated", r.BatchFinalization = "batch_finalization";
  })(t || (t = {}));
  async function n(r, i, s = {}) {
    const { abortController: o, skipVtxoTreeSigning: a = !1, eventCallback: c } = s;
    let u = t.Start;
    const l = [], f = [];
    let h, p;
    for await (const y of r) {
      if (o?.signal.aborted)
        throw new Error("canceled");
      switch (c && c(y).catch(() => {
      }), y.type) {
        case gt.BatchStarted: {
          const d = y, { skip: g } = await i.onBatchStarted(d);
          g || (u = t.BatchStarted, a && (u = t.TreeNoncesAggregated));
          continue;
        }
        case gt.BatchFinalized: {
          if (u !== t.BatchFinalization)
            continue;
          return i.onBatchFinalized && await i.onBatchFinalized(y), y.commitmentTxid;
        }
        case gt.BatchFailed: {
          if (i.onBatchFailed) {
            await i.onBatchFailed(y);
            continue;
          }
          throw new Error(y.reason);
        }
        case gt.TreeTx: {
          if (u !== t.BatchStarted && u !== t.TreeNoncesAggregated)
            continue;
          y.batchIndex === 0 ? l.push(y.chunk) : f.push(y.chunk), i.onTreeTxEvent && await i.onTreeTxEvent(y);
          continue;
        }
        case gt.TreeSignature: {
          if (u !== t.TreeNoncesAggregated)
            continue;
          if (!h)
            throw new Error("vtxo tree not initialized");
          const d = O.decode(y.signature);
          h.update(y.txid, (g) => {
            g.updateInput(0, {
              tapKeySig: d
            });
          }), i.onTreeSignatureEvent && await i.onTreeSignatureEvent(y);
          continue;
        }
        case gt.TreeSigningStarted: {
          if (u !== t.BatchStarted)
            continue;
          h = zr.create(l);
          const { skip: d } = await i.onTreeSigningStarted(y, h);
          d || (u = t.TreeSigningStarted);
          continue;
        }
        case gt.TreeNonces: {
          if (u !== t.TreeSigningStarted)
            continue;
          const { fullySigned: d } = await i.onTreeNonces(y);
          d && (u = t.TreeNoncesAggregated);
          continue;
        }
        case gt.BatchFinalization: {
          if (u !== t.TreeNoncesAggregated)
            continue;
          if (!h && l.length > 0 && (h = zr.create(l)), !h && !a)
            throw new Error("vtxo tree not initialized");
          f.length > 0 && (p = zr.create(f)), await i.onBatchFinalization(y, h, p), u = t.BatchFinalization;
          continue;
        }
        default:
          continue;
      }
    }
    throw new Error("event stream closed");
  }
  e.join = n;
})(so || (so = {}));
const gf = (e) => Ng[e], Ng = {
  bitcoin: Gn(On, "ark"),
  testnet: Gn(Ar, "tark"),
  signet: Gn(Ar, "tark"),
  mutinynet: Gn(Ar, "tark"),
  regtest: Gn({
    ...Ar,
    bech32: "bcrt",
    pubKeyHash: 111,
    scriptHash: 196
  }, "tark")
};
function Gn(e, t) {
  return {
    ...e,
    hrp: t
  };
}
const Rg = {
  bitcoin: "https://mempool.space/api",
  testnet: "https://mempool.space/testnet/api",
  signet: "https://mempool.space/signet/api",
  mutinynet: "https://mutinynet.com/api",
  regtest: "http://localhost:3000"
};
class Ug {
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
          const f = l["multi-address-transactions"];
          for (const h in f)
            for (const p of [
              "mempool",
              "confirmed",
              "removed"
            ])
              f[h][p] && u.push(...f[h][p].filter(Cg));
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
    if (!Lg(n))
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
function Lg(e) {
  return Array.isArray(e) && e.every((t) => {
    t && typeof t == "object" && typeof t.id == "string" && t.id.length > 0 && typeof t.height == "number" && t.height >= 0 && typeof t.mediantime == "number" && t.mediantime > 0;
  });
}
const Cg = (e) => typeof e.txid == "string" && Array.isArray(e.vout) && e.vout.every((t) => typeof t.scriptpubkey_address == "string" && typeof t.value == "number") && typeof e.status == "object" && typeof e.status.confirmed == "boolean", Pg = 0n, _g = new Uint8Array([81, 2, 78, 115]), Jo = {
  script: _g,
  amount: Pg
};
O.encode(Jo.script);
function Dg(e, t, n) {
  let r = 0n;
  for (const i of e) {
    if (!i.witnessUtxo)
      throw new Error("input needs witness utxo");
    r += i.witnessUtxo.amount;
  }
  return yf(e, {
    script: t,
    amount: r
  }, n);
}
function yf(e, t, n) {
  const r = new ze({
    version: 3,
    lockTime: n
  });
  for (const i of e)
    r.addInput(i);
  return r.addOutput(t), r.addOutput(Jo), r;
}
const Vg = new Error("invalid settlement transaction outputs"), Mg = new Error("empty tree"), Hg = new Error("invalid number of inputs"), ps = new Error("wrong settlement txid"), Fg = new Error("invalid amount"), Kg = new Error("no leaves"), zg = new Error("invalid taproot script"), hc = new Error("invalid round transaction outputs"), jg = new Error("wrong commitment txid"), Wg = new Error("missing cosigners public keys"), gs = 0, pc = 1;
function Gg(e, t) {
  if (t.validate(), t.root.inputsLength !== 1)
    throw Hg;
  const n = t.root.getInput(0), r = Yt.fromPSBT(ft.decode(e));
  if (r.outputsLength <= pc)
    throw Vg;
  const i = r.id;
  if (!n.txid || O.encode(n.txid) !== i || n.index !== pc)
    throw ps;
}
function qg(e, t, n) {
  if (t.outputsLength < gs + 1)
    throw hc;
  const r = t.getOutput(gs)?.amount;
  if (!r)
    throw hc;
  if (!e.root)
    throw Mg;
  const i = e.root.getInput(0), s = t.id;
  if (!i.txid || O.encode(i.txid) !== s || i.index !== gs)
    throw jg;
  let o = 0n;
  for (let c = 0; c < e.root.outputsLength; c++) {
    const u = e.root.getOutput(c);
    u?.amount && (o += u.amount);
  }
  if (o !== r)
    throw Fg;
  if (e.leaves().length === 0)
    throw Kg;
  e.validate();
  for (const c of e.iterator())
    for (const [u, l] of c.children) {
      const f = c.root.getOutput(u);
      if (!f?.script)
        throw new Error(`parent output ${u} not found`);
      const h = f.script.slice(2);
      if (h.length !== 32)
        throw new Error(`parent output ${u} has invalid script`);
      const p = eo(l.root, 0, no);
      if (p.length === 0)
        throw Wg;
      const y = p.map((g) => g.key), { finalKey: d } = Go(y, !0, {
        taprootTweak: n
      });
      if (!d || O.encode(d.slice(1)) !== O.encode(h))
        throw zg;
    }
}
function Yg(e, t, n) {
  let r = !1;
  for (const [o, a] of t.entries()) {
    if (!a.script)
      throw new Error(`missing output script ${o}`);
    if (j.decode(a.script)[0] === "RETURN") {
      if (r)
        throw new Error("multiple OP_RETURN outputs");
      r = !0;
    }
  }
  const i = e.map((o) => Zg(o, n));
  return {
    arkTx: wf(i.map((o) => o.input), t),
    checkpoints: i.map((o) => o.tx)
  };
}
function wf(e, t) {
  let n = 0n;
  for (const i of e) {
    const s = Qo(xn(i.tapLeafScript));
    if (Un.is(s)) {
      if (n !== 0n && gc(n) !== gc(s.params.absoluteTimelock))
        throw new Error("cannot mix seconds and blocks locktime");
      s.params.absoluteTimelock > n && (n = s.params.absoluteTimelock);
    }
  }
  const r = new ze({
    version: 3,
    lockTime: Number(n)
  });
  for (const [i, s] of e.entries())
    r.addInput({
      txid: s.txid,
      index: s.vout,
      sequence: n ? Lo - 1 : void 0,
      witnessUtxo: {
        script: At.decode(s.tapTree).pkScript,
        amount: BigInt(s.value)
      },
      tapLeafScript: [s.tapLeafScript]
    }), ag(r, i, uf, s.tapTree);
  for (const i of t)
    r.addOutput(i);
  return r.addOutput(Jo), r;
}
function Zg(e, t) {
  const n = Qo(xn(e.tapLeafScript)), r = new At([
    t.script,
    n.script
  ]), i = wf([e], [
    {
      amount: BigInt(e.value),
      script: r.pkScript
    }
  ]), s = r.findLeaf(O.encode(n.script)), o = {
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
const Xg = 500000000n;
function gc(e) {
  return e >= Xg;
}
function Qg(e, t) {
  if (!e.status.block_time)
    return !1;
  if (t.value === 0n)
    return !0;
  if (t.type === "blocks")
    return !1;
  const n = BigInt(Math.floor(Date.now() / 1e3));
  return BigInt(Math.floor(e.status.block_time)) + t.value <= n;
}
const Jg = 4320 * 60 * 1e3, ty = {
  thresholdMs: Jg
  // 3 days
};
class pt {
  constructor(t, n, r = pt.DefaultHRP) {
    this.preimage = t, this.value = n, this.HRP = r, this.vout = 0;
    const i = xt(this.preimage);
    this.vtxoScript = new At([ry(i)]);
    const s = this.vtxoScript.leaves[0];
    this.txid = O.encode(new Uint8Array(i).reverse()), this.tapTree = this.vtxoScript.encode(), this.forfeitTapLeafScript = s, this.intentTapLeafScript = s, this.value = n, this.status = { confirmed: !0 }, this.extraWitness = [this.preimage];
  }
  encode() {
    const t = new Uint8Array(pt.Length);
    return t.set(this.preimage, 0), ey(t, this.value, this.preimage.length), t;
  }
  static decode(t, n = pt.DefaultHRP) {
    if (t.length !== pt.Length)
      throw new Error(`invalid data length: expected ${pt.Length} bytes, got ${t.length}`);
    const r = t.subarray(0, pt.PreimageLength), i = ny(t, pt.PreimageLength);
    return new pt(r, i, n);
  }
  static fromString(t, n = pt.DefaultHRP) {
    if (t = t.trim(), !t.startsWith(n))
      throw new Error(`invalid human-readable part: expected ${n} prefix (note '${t}')`);
    const r = t.slice(n.length), i = $s.decode(r);
    if (i.length === 0)
      throw new Error("failed to decode base58 string");
    return pt.decode(i, n);
  }
  toString() {
    return this.HRP + $s.encode(this.encode());
  }
}
pt.DefaultHRP = "arknote";
pt.PreimageLength = 32;
pt.ValueLength = 4;
pt.Length = pt.PreimageLength + pt.ValueLength;
pt.FakeOutpointIndex = 0;
function ey(e, t, n) {
  new DataView(e.buffer, e.byteOffset + n, 4).setUint32(0, t, !1);
}
function ny(e, t) {
  return new DataView(e.buffer, e.byteOffset + t, 4).getUint32(0, !1);
}
function ry(e) {
  return j.encode(["SHA256", e, "EQUAL"]);
}
var oo;
(function(e) {
  e[e.INDEXER_TX_TYPE_UNSPECIFIED = 0] = "INDEXER_TX_TYPE_UNSPECIFIED", e[e.INDEXER_TX_TYPE_RECEIVED = 1] = "INDEXER_TX_TYPE_RECEIVED", e[e.INDEXER_TX_TYPE_SENT = 2] = "INDEXER_TX_TYPE_SENT";
})(oo || (oo = {}));
var Tn;
(function(e) {
  e.UNSPECIFIED = "INDEXER_CHAINED_TX_TYPE_UNSPECIFIED", e.COMMITMENT = "INDEXER_CHAINED_TX_TYPE_COMMITMENT", e.ARK = "INDEXER_CHAINED_TX_TYPE_ARK", e.TREE = "INDEXER_CHAINED_TX_TYPE_TREE", e.CHECKPOINT = "INDEXER_CHAINED_TX_TYPE_CHECKPOINT";
})(Tn || (Tn = {}));
class mf {
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
    if (!jt.isVtxoTreeResponse(o))
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
    if (!jt.isVtxoTreeLeavesResponse(o))
      throw new Error("Invalid vtxos tree leaves data received");
    return o;
  }
  async getBatchSweepTransactions(t) {
    const n = `${this.serverUrl}/v1/indexer/batch/${t.txid}/${t.vout}/sweepTxs`, r = await fetch(n);
    if (!r.ok)
      throw new Error(`Failed to fetch batch sweep transactions: ${r.statusText}`);
    const i = await r.json();
    if (!jt.isBatchSweepTransactionsResponse(i))
      throw new Error("Invalid batch sweep transactions data received");
    return i;
  }
  async getCommitmentTx(t) {
    const n = `${this.serverUrl}/v1/indexer/commitmentTx/${t}`, r = await fetch(n);
    if (!r.ok)
      throw new Error(`Failed to fetch commitment tx: ${r.statusText}`);
    const i = await r.json();
    if (!jt.isCommitmentTx(i))
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
    if (!jt.isConnectorsResponse(o))
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
    if (!jt.isForfeitTxsResponse(o))
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
          for await (const o of ro(i)) {
            if (n?.aborted)
              break;
            try {
              const a = JSON.parse(o.data);
              a.event && (yield {
                txid: a.event.txid,
                scripts: a.event.scripts || [],
                newVtxos: (a.event.newVtxos || []).map(Ur),
                spentVtxos: (a.event.spentVtxos || []).map(Ur),
                sweptVtxos: (a.event.sweptVtxos || []).map(Ur),
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
        if (io(i)) {
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
    if (!jt.isVirtualTxsResponse(o))
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
    if (!jt.isVtxoChainResponse(o))
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
    if (!jt.isVtxosResponse(s))
      throw new Error("Invalid vtxos data received");
    return {
      vtxos: s.vtxos.map(Ur),
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
function Ur(e) {
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
var jt;
(function(e) {
  function t(x) {
    return typeof x == "object" && typeof x.totalOutputAmount == "string" && typeof x.totalOutputVtxos == "number" && typeof x.expiresAt == "string" && typeof x.swept == "boolean";
  }
  function n(x) {
    return typeof x == "object" && typeof x.txid == "string" && typeof x.expiresAt == "string" && Object.values(Tn).includes(x.type) && Array.isArray(x.spends) && x.spends.every((Q) => typeof Q == "string");
  }
  function r(x) {
    return typeof x == "object" && typeof x.startedAt == "string" && typeof x.endedAt == "string" && typeof x.totalInputAmount == "string" && typeof x.totalInputVtxos == "number" && typeof x.totalOutputAmount == "string" && typeof x.totalOutputVtxos == "number" && typeof x.batches == "object" && Object.values(x.batches).every(t);
  }
  e.isCommitmentTx = r;
  function i(x) {
    return typeof x == "object" && typeof x.txid == "string" && typeof x.vout == "number";
  }
  e.isOutpoint = i;
  function s(x) {
    return Array.isArray(x) && x.every(i);
  }
  e.isOutpointArray = s;
  function o(x) {
    return typeof x == "object" && typeof x.txid == "string" && typeof x.children == "object" && Object.values(x.children).every(l) && Object.keys(x.children).every((Q) => Number.isInteger(Number(Q)));
  }
  function a(x) {
    return Array.isArray(x) && x.every(o);
  }
  e.isTxsArray = a;
  function c(x) {
    return typeof x == "object" && typeof x.amount == "string" && typeof x.createdAt == "string" && typeof x.isSettled == "boolean" && typeof x.settledBy == "string" && Object.values(oo).includes(x.type) && (!x.commitmentTxid && typeof x.virtualTxid == "string" || typeof x.commitmentTxid == "string" && !x.virtualTxid);
  }
  function u(x) {
    return Array.isArray(x) && x.every(c);
  }
  e.isTxHistoryRecordArray = u;
  function l(x) {
    return typeof x == "string" && x.length === 64;
  }
  function f(x) {
    return Array.isArray(x) && x.every(l);
  }
  e.isTxidArray = f;
  function h(x) {
    return typeof x == "object" && i(x.outpoint) && typeof x.createdAt == "string" && (x.expiresAt === null || typeof x.expiresAt == "string") && typeof x.amount == "string" && typeof x.script == "string" && typeof x.isPreconfirmed == "boolean" && typeof x.isSwept == "boolean" && typeof x.isUnrolled == "boolean" && typeof x.isSpent == "boolean" && (!x.spentBy || typeof x.spentBy == "string") && (!x.settledBy || typeof x.settledBy == "string") && (!x.arkTxid || typeof x.arkTxid == "string") && Array.isArray(x.commitmentTxids) && x.commitmentTxids.every(l);
  }
  function p(x) {
    return typeof x == "object" && typeof x.current == "number" && typeof x.next == "number" && typeof x.total == "number";
  }
  function y(x) {
    return typeof x == "object" && Array.isArray(x.vtxoTree) && x.vtxoTree.every(o) && (!x.page || p(x.page));
  }
  e.isVtxoTreeResponse = y;
  function d(x) {
    return typeof x == "object" && Array.isArray(x.leaves) && x.leaves.every(i) && (!x.page || p(x.page));
  }
  e.isVtxoTreeLeavesResponse = d;
  function g(x) {
    return typeof x == "object" && Array.isArray(x.connectors) && x.connectors.every(o) && (!x.page || p(x.page));
  }
  e.isConnectorsResponse = g;
  function m(x) {
    return typeof x == "object" && Array.isArray(x.txids) && x.txids.every(l) && (!x.page || p(x.page));
  }
  e.isForfeitTxsResponse = m;
  function S(x) {
    return typeof x == "object" && Array.isArray(x.sweptBy) && x.sweptBy.every(l);
  }
  e.isSweptCommitmentTxResponse = S;
  function I(x) {
    return typeof x == "object" && Array.isArray(x.sweptBy) && x.sweptBy.every(l);
  }
  e.isBatchSweepTransactionsResponse = I;
  function L(x) {
    return typeof x == "object" && Array.isArray(x.txs) && x.txs.every((Q) => typeof Q == "string") && (!x.page || p(x.page));
  }
  e.isVirtualTxsResponse = L;
  function R(x) {
    return typeof x == "object" && Array.isArray(x.chain) && x.chain.every(n) && (!x.page || p(x.page));
  }
  e.isVtxoChainResponse = R;
  function V(x) {
    return typeof x == "object" && Array.isArray(x.vtxos) && x.vtxos.every(h) && (!x.page || p(x.page));
  }
  e.isVtxosResponse = V;
})(jt || (jt = {}));
class iy {
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
const Lr = (e) => `vtxos:${e}`, Cr = (e) => `utxos:${e}`, ys = (e) => `tx:${e}`, yc = "wallet:state", xi = (e) => e ? O.encode(e) : void 0, Ln = (e) => e ? O.decode(e) : void 0, Ti = ([e, t]) => ({
  cb: O.encode(ie.encode(e)),
  s: O.encode(t)
}), wc = (e) => ({
  ...e,
  tapTree: xi(e.tapTree),
  forfeitTapLeafScript: Ti(e.forfeitTapLeafScript),
  intentTapLeafScript: Ti(e.intentTapLeafScript),
  extraWitness: e.extraWitness?.map(xi)
}), mc = (e) => ({
  ...e,
  tapTree: xi(e.tapTree),
  forfeitTapLeafScript: Ti(e.forfeitTapLeafScript),
  intentTapLeafScript: Ti(e.intentTapLeafScript),
  extraWitness: e.extraWitness?.map(xi)
}), Si = (e) => {
  const t = ie.decode(Ln(e.cb)), n = Ln(e.s);
  return [t, n];
}, sy = (e) => ({
  ...e,
  createdAt: new Date(e.createdAt),
  tapTree: Ln(e.tapTree),
  forfeitTapLeafScript: Si(e.forfeitTapLeafScript),
  intentTapLeafScript: Si(e.intentTapLeafScript),
  extraWitness: e.extraWitness?.map(Ln)
}), oy = (e) => ({
  ...e,
  tapTree: Ln(e.tapTree),
  forfeitTapLeafScript: Si(e.forfeitTapLeafScript),
  intentTapLeafScript: Si(e.intentTapLeafScript),
  extraWitness: e.extraWitness?.map(Ln)
});
class ao {
  constructor(t) {
    this.storage = t;
  }
  async getVtxos(t) {
    const n = await this.storage.getItem(Lr(t));
    if (!n)
      return [];
    try {
      return JSON.parse(n).map(sy);
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
    await this.storage.setItem(Lr(t), JSON.stringify(r.map(wc)));
  }
  async removeVtxo(t, n) {
    const r = await this.getVtxos(t), [i, s] = n.split(":"), o = r.filter((a) => !(a.txid === i && a.vout === parseInt(s, 10)));
    await this.storage.setItem(Lr(t), JSON.stringify(o.map(wc)));
  }
  async clearVtxos(t) {
    await this.storage.removeItem(Lr(t));
  }
  async getUtxos(t) {
    const n = await this.storage.getItem(Cr(t));
    if (!n)
      return [];
    try {
      return JSON.parse(n).map(oy);
    } catch (r) {
      return console.error(`Failed to parse UTXOs for address ${t}:`, r), [];
    }
  }
  async saveUtxos(t, n) {
    const r = await this.getUtxos(t);
    n.forEach((i) => {
      const s = r.findIndex((o) => o.txid === i.txid && o.vout === i.vout);
      s !== -1 ? r[s] = i : r.push(i);
    }), await this.storage.setItem(Cr(t), JSON.stringify(r.map(mc)));
  }
  async removeUtxo(t, n) {
    const r = await this.getUtxos(t), [i, s] = n.split(":"), o = r.filter((a) => !(a.txid === i && a.vout === parseInt(s, 10)));
    await this.storage.setItem(Cr(t), JSON.stringify(o.map(mc)));
  }
  async clearUtxos(t) {
    await this.storage.removeItem(Cr(t));
  }
  async getTransactionHistory(t) {
    const n = ys(t), r = await this.storage.getItem(n);
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
    await this.storage.setItem(ys(t), JSON.stringify(r));
  }
  async clearTransactions(t) {
    await this.storage.removeItem(ys(t));
  }
  async getWalletState() {
    const t = await this.storage.getItem(yc);
    if (!t)
      return null;
    try {
      return JSON.parse(t);
    } catch (n) {
      return console.error("Failed to parse wallet state:", n), null;
    }
  }
  async saveWalletState(t) {
    await this.storage.setItem(yc, JSON.stringify(t));
  }
}
const ws = (e, t) => `contract:${e}:${t}`, ms = (e) => `collection:${e}`;
class ay {
  constructor(t) {
    this.storage = t;
  }
  async getContractData(t, n) {
    const r = await this.storage.getItem(ws(t, n));
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
      await this.storage.setItem(ws(t, n), JSON.stringify(r));
    } catch (i) {
      throw console.error(`Failed to persist contract data for ${t}:${n}:`, i), i;
    }
  }
  async deleteContractData(t, n) {
    try {
      await this.storage.removeItem(ws(t, n));
    } catch (r) {
      throw console.error(`Failed to remove contract data for ${t}:${n}:`, r), r;
    }
  }
  async getContractCollection(t) {
    const n = await this.storage.getItem(ms(t));
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
      await this.storage.setItem(ms(t), JSON.stringify(a));
    } catch (c) {
      throw console.error(`Failed to persist contract collection ${t}:`, c), c;
    }
  }
  async removeFromContractCollection(t, n, r) {
    if (n == null)
      throw new Error(`Invalid id provided for removal: ${String(n)}`);
    const s = (await this.getContractCollection(t)).filter((o) => o[r] !== n);
    try {
      await this.storage.setItem(ms(t), JSON.stringify(s));
    } catch (o) {
      throw console.error(`Failed to persist contract collection removal for ${t}:`, o), o;
    }
  }
  async clearContractData() {
    await this.storage.clear();
  }
}
function _e(e, t) {
  return {
    ...t,
    forfeitTapLeafScript: e.offchainTapscript.forfeit(),
    intentTapLeafScript: e.offchainTapscript.forfeit(),
    tapTree: e.offchainTapscript.encode()
  };
}
function co(e, t) {
  return {
    ...t,
    forfeitTapLeafScript: e.boardingTapscript.forfeit(),
    intentTapLeafScript: e.boardingTapscript.forfeit(),
    tapTree: e.boardingTapscript.encode()
  };
}
class st extends Error {
  #t;
  constructor(t, n, r) {
    super(t, { cause: r }), this.name = "ParseError", this.#t = n, n?.input && (this.message = Cn(this.message, n));
  }
  get node() {
    return this.#t;
  }
  withAst(t) {
    return this.#t ? this : (this.#t = t, t?.input ? (this.message = Cn(this.message, t), this) : this);
  }
}
class F extends Error {
  #t;
  constructor(t, n, r) {
    super(t, { cause: r }), this.name = "EvaluationError", this.#t = n, n?.input && (this.message = Cn(this.message, n));
  }
  get node() {
    return this.#t;
  }
  withAst(t) {
    return this.#t ? this : (this.#t = t, t?.input ? (this.message = Cn(this.message, t), this) : this);
  }
}
let cy = class extends Error {
  #t;
  constructor(t, n, r) {
    super(t, { cause: r }), this.name = "TypeError", this.#t = n, n?.input && (this.message = Cn(this.message, n));
  }
  get node() {
    return this.#t;
  }
  withAst(t) {
    return this.#t ? this : (this.#t = t, t?.input ? (this.message = Cn(this.message, t), this) : this);
  }
};
function Cn(e, t) {
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
  const u = r.slice(a, c), l = `${i}`.padStart(4, " "), f = " ".repeat(9 + o);
  return `${e}

> ${l} | ${u}
${f}^`;
}
class ae {
  #t;
  constructor(t) {
    this.#t = t;
  }
  static of(t) {
    return t === void 0 ? vi : new ae(t);
  }
  static none() {
    return vi;
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
    if (t instanceof ae) return t;
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
const vi = Object.freeze(new ae());
class bf {
}
const Ef = new bf();
function uy(e, t) {
  e.constants.set("optional", t ? Ef : void 0);
}
function ly(e) {
  const t = (f, h) => e.registerFunctionOverload(f, h), n = e.enableOptionalTypes ? Ef : void 0;
  e.registerType("OptionalNamespace", bf), e.registerConstant("optional", "OptionalNamespace", n), t("optional.hasValue(): bool", (f) => f.hasValue()), t("optional<A>.value(): A", (f) => f.value()), e.registerFunctionOverload("OptionalNamespace.none(): optional<T>", () => ae.none()), t("OptionalNamespace.of(A): optional<A>", (f, h) => ae.of(h));
  function r(f, h, p) {
    if (f instanceof ae) return f;
    throw new F(`${p} must be optional`, h);
  }
  function i(f, h, p) {
    const y = f.eval(h.receiver, p);
    return y instanceof Promise ? y.then((d) => s(d, f, h, p)) : s(y, f, h, p);
  }
  function s(f, h, p, y) {
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
    return ({ args: g, receiver: m }) => ({
      functionDesc: f,
      receiver: m,
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
      evaluate: i,
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
      evaluate: i,
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
class Je {
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
const fy = {
  h: 3600000000000n,
  m: 60000000000n,
  s: 1000000000n,
  ms: 1000000n,
  us: 1000n,
  µs: 1000n,
  ns: 1n
};
class De {
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
    return new De(r, i);
  }
  addDuration(t) {
    const n = this.#e + t.nanos;
    return new De(
      this.#t + t.seconds + BigInt(Math.floor(n / 1e9)),
      n % 1e9
    );
  }
  subtractDuration(t) {
    const n = this.#e - t.nanos;
    return new De(
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
function dy(e) {
  const t = (d, g) => e.registerFunctionOverload(d, g), n = (d) => d;
  t("dyn(dyn): dyn", n);
  for (const d in rr) {
    const g = rr[d];
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
        throw new F(`bool() conversion error: invalid string value "${d}"`);
    }
  });
  const r = Object.keys;
  t("size(string): int", (d) => BigInt(bc(d))), t("size(bytes): int", (d) => BigInt(d.length)), t("size(list): int", (d) => BigInt(d.length ?? d.size)), t(
    "size(map): int",
    (d) => BigInt(d instanceof Map ? d.size : r(d).length)
  ), t("string.size(): int", (d) => BigInt(bc(d))), t("bytes.size(): int", (d) => BigInt(d.length)), t("list.size(): int", (d) => BigInt(d.length ?? d.size)), t(
    "map.size(): int",
    (d) => BigInt(d instanceof Map ? d.size : r(d).length)
  ), t("bytes(string): bytes", (d) => o.fromString(d)), t("bytes(bytes): bytes", n), t("double(double): double", n), t("double(int): double", (d) => Number(d)), t("double(uint): double", (d) => Number(d)), t("double(string): double", (d) => {
    if (!d || d !== d.trim())
      throw new F("double() type error: cannot convert to double");
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
        const m = Number(d);
        if (!Number.isNaN(m)) return m;
        throw new F("double() type error: cannot convert to double");
      }
    }
  }), t("int(int): int", n), t("int(double): int", (d) => {
    if (Number.isFinite(d)) return BigInt(Math.trunc(d));
    throw new F("int() type error: integer overflow");
  }), t("int(string): int", (d) => {
    if (d !== d.trim() || d.length > 20 || d.includes("0x"))
      throw new F("int() type error: cannot convert to int");
    try {
      const g = BigInt(d);
      if (g <= 9223372036854775807n && g >= -9223372036854775808n) return g;
    } catch {
    }
    throw new F("int() type error: cannot convert to int");
  }), t("uint(uint): uint", n), t("uint(double): uint", (d) => {
    if (Number.isFinite(d)) return BigInt(Math.trunc(d));
    throw new F("int() type error: integer overflow");
  }), t("uint(string): uint", (d) => {
    if (d !== d.trim() || d.length > 20 || d.includes("0x"))
      throw new F("uint() type error: cannot convert to uint");
    try {
      const g = BigInt(d);
      if (g <= 18446744073709551615n && g >= 0n) return g;
    } catch {
    }
    throw new F("uint() type error: cannot convert to uint");
  }), t("string(string): string", n), t("string(bool): string", (d) => `${d}`), t("string(int): string", (d) => `${d}`), t("string(bytes): string", (d) => o.toUtf8(d)), t("string(double): string", (d) => d === 1 / 0 ? "+Inf" : d === -1 / 0 ? "-Inf" : `${d}`), t("string.startsWith(string): bool", (d, g) => d.startsWith(g)), t("string.endsWith(string): bool", (d, g) => d.endsWith(g)), t("string.contains(string): bool", (d, g) => d.includes(g)), t("string.lowerAscii(): string", (d) => d.toLowerCase()), t("string.upperAscii(): string", (d) => d.toUpperCase()), t("string.trim(): string", (d) => d.trim()), t(
    "string.indexOf(string): int",
    (d, g) => BigInt(d.indexOf(g))
  ), t("string.indexOf(string, int): int", (d, g, m) => {
    if (g === "") return m;
    if (m = Number(m), m < 0 || m >= d.length)
      throw new F("string.indexOf(search, fromIndex): fromIndex out of range");
    return BigInt(d.indexOf(g, m));
  }), t(
    "string.lastIndexOf(string): int",
    (d, g) => BigInt(d.lastIndexOf(g))
  ), t("string.lastIndexOf(string, int): int", (d, g, m) => {
    if (g === "") return m;
    if (m = Number(m), m < 0 || m >= d.length)
      throw new F("string.lastIndexOf(search, fromIndex): fromIndex out of range");
    return BigInt(d.lastIndexOf(g, m));
  }), t("string.substring(int): string", (d, g) => {
    if (g = Number(g), g < 0 || g > d.length)
      throw new F("string.substring(start, end): start index out of range");
    return d.substring(g);
  }), t("string.substring(int, int): string", (d, g, m) => {
    if (g = Number(g), g < 0 || g > d.length)
      throw new F("string.substring(start, end): start index out of range");
    if (m = Number(m), m < g || m > d.length)
      throw new F("string.substring(start, end): end index out of range");
    return d.substring(g, m);
  }), t("string.matches(string): bool", (d, g) => {
    try {
      return new RegExp(g).test(d);
    } catch {
      throw new F(`Invalid regular expression: ${g}`);
    }
  }), t("string.split(string): list<string>", (d, g) => d.split(g)), t("string.split(string, int): list<string>", (d, g, m) => {
    if (m = Number(m), m === 0) return [];
    const S = d.split(g);
    if (m < 0 || S.length <= m) return S;
    const I = S.slice(0, m - 1);
    return I.push(S.slice(m - 1).join(g)), I;
  }), t("list<string>.join(): string", (d) => {
    for (let g = 0; g < d.length; g++)
      if (typeof d[g] != "string")
        throw new F("string.join(): list must contain only strings");
    return d.join("");
  }), t("list<string>.join(string): string", (d, g) => {
    for (let m = 0; m < d.length; m++)
      if (typeof d[m] != "string")
        throw new F("string.join(separator): list must contain only strings");
    return d.join(g);
  });
  const i = new TextEncoder("utf8"), s = new TextDecoder("utf8"), o = typeof Buffer < "u" ? {
    byteLength: (d) => Buffer.byteLength(d),
    fromString: (d) => Buffer.from(d, "utf8"),
    toHex: (d) => Buffer.prototype.hexSlice.call(d, 0, d.length),
    toBase64: (d) => Buffer.prototype.base64Slice.call(d, 0, d.length),
    toUtf8: (d) => Buffer.prototype.utf8Slice.call(d, 0, d.length),
    jsonParse: (d) => JSON.parse(d)
  } : {
    textEncoder: new TextEncoder("utf8"),
    byteLength: (d) => i.encode(d).length,
    fromString: (d) => i.encode(d),
    toHex: Uint8Array.prototype.toHex ? (d) => d.toHex() : (d) => Array.from(d, (g) => g.toString(16).padStart(2, "0")).join(""),
    toBase64: Uint8Array.prototype.toBase64 ? (d) => d.toBase64() : (d) => btoa(Array.from(d, (g) => String.fromCodePoint(g)).join("")),
    toUtf8: (d) => s.decode(d),
    jsonParse: (d) => JSON.parse(i.decode(d))
  };
  t("bytes.json(): map", o.jsonParse), t("bytes.hex(): string", o.toHex), t("bytes.string(): string", o.toUtf8), t("bytes.base64(): string", o.toBase64), t("bytes.at(int): int", (d, g) => {
    if (g < 0 || g >= d.length) throw new F("Bytes index out of range");
    return BigInt(d[g]);
  });
  const a = "google.protobuf.Timestamp", c = "google.protobuf.Duration", u = e.registerType(a, Date).getObjectType(a).typeType, l = e.registerType(c, De).getObjectType(c).typeType;
  e.registerConstant("google", "map<string, map<string, type>>", {
    protobuf: { Duration: l, Timestamp: u }
  });
  function f(d, g) {
    return new Date(d.toLocaleString("en-US", { timeZone: g }));
  }
  function h(d, g) {
    const m = g ? f(d, g) : new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()), S = new Date(m.getFullYear(), 0, 0);
    return BigInt(Math.floor((m - S) / 864e5) - 1);
  }
  t(`timestamp(string): ${a}`, (d) => {
    if (d.length < 20 || d.length > 30)
      throw new F("timestamp() requires a string in ISO 8601 format");
    const g = new Date(d);
    if (g <= 253402300799999 && g >= -621355968e5) return g;
    throw new F("timestamp() requires a string in ISO 8601 format");
  }), t(`timestamp(int): ${a}`, (d) => {
    if (d = Number(d) * 1e3, d <= 253402300799999 && d >= -621355968e5) return new Date(d);
    throw new F("timestamp() requires a valid integer unix timestamp");
  }), t(`${a}.getDate(): int`, (d) => BigInt(d.getUTCDate())), t(`${a}.getDate(string): int`, (d, g) => BigInt(f(d, g).getDate())), t(`${a}.getDayOfMonth(): int`, (d) => BigInt(d.getUTCDate() - 1)), t(
    `${a}.getDayOfMonth(string): int`,
    (d, g) => BigInt(f(d, g).getDate() - 1)
  ), t(`${a}.getDayOfWeek(): int`, (d) => BigInt(d.getUTCDay())), t(`${a}.getDayOfWeek(string): int`, (d, g) => BigInt(f(d, g).getDay())), t(`${a}.getDayOfYear(): int`, h), t(`${a}.getDayOfYear(string): int`, h), t(`${a}.getFullYear(): int`, (d) => BigInt(d.getUTCFullYear())), t(`${a}.getFullYear(string): int`, (d, g) => BigInt(f(d, g).getFullYear())), t(`${a}.getHours(): int`, (d) => BigInt(d.getUTCHours())), t(`${a}.getHours(string): int`, (d, g) => BigInt(f(d, g).getHours())), t(`${a}.getMilliseconds(): int`, (d) => BigInt(d.getUTCMilliseconds())), t(`${a}.getMilliseconds(string): int`, (d) => BigInt(d.getUTCMilliseconds())), t(`${a}.getMinutes(): int`, (d) => BigInt(d.getUTCMinutes())), t(`${a}.getMinutes(string): int`, (d, g) => BigInt(f(d, g).getMinutes())), t(`${a}.getMonth(): int`, (d) => BigInt(d.getUTCMonth())), t(`${a}.getMonth(string): int`, (d, g) => BigInt(f(d, g).getMonth())), t(`${a}.getSeconds(): int`, (d) => BigInt(d.getUTCSeconds())), t(`${a}.getSeconds(string): int`, (d, g) => BigInt(f(d, g).getSeconds()));
  const p = /(\d*\.?\d*)(ns|us|µs|ms|s|m|h)/;
  function y(d) {
    if (!d) throw new F("Invalid duration string: ''");
    const g = d[0] === "-";
    (d[0] === "-" || d[0] === "+") && (d = d.slice(1));
    let m = BigInt(0);
    for (; ; ) {
      const L = p.exec(d);
      if (!L) throw new F(`Invalid duration string: ${d}`);
      if (L.index !== 0) throw new F(`Invalid duration string: ${d}`);
      d = d.slice(L[0].length);
      const R = fy[L[2]], [V = "0", x = ""] = L[1].split("."), Q = BigInt(V) * R, C = x ? BigInt(x.slice(0, 13).padEnd(13, "0")) * R / 10000000000000n : 0n;
      if (m += Q + C, d === "") break;
    }
    const S = m >= 1000000000n ? m / 1000000000n : 0n, I = Number(m % 1000000000n);
    return g ? new De(-S, -I) : new De(S, I);
  }
  t("duration(string): google.protobuf.Duration", (d) => y(d)), t("google.protobuf.Duration.getHours(): int", (d) => d.getHours()), t("google.protobuf.Duration.getMinutes(): int", (d) => d.getMinutes()), t("google.protobuf.Duration.getSeconds(): int", (d) => d.getSeconds()), t("google.protobuf.Duration.getMilliseconds(): int", (d) => d.getMilliseconds()), ly(e);
}
function bc(e) {
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
const rr = {
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
class qi {
  #t = null;
  #e = null;
  constructor(t) {
    t instanceof qi ? (this.#t = t, this.#e = /* @__PURE__ */ new Map()) : this.#e = new Map(t);
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
class hy extends qi {
  constructor(t = null, n = null) {
    super(t, n);
  }
  get(t) {
    const n = super.get(t);
    return n === void 0 ? Xt : n;
  }
}
function ge(e, t = qi, n = !0) {
  return e instanceof t ? e.fork(n) : new t(e);
}
class Ye {
  #t = /* @__PURE__ */ new WeakMap();
  #e = null;
  #n = null;
  constructor({ kind: t, type: n, name: r, keyType: i, valueType: s, values: o }) {
    this.kind = t, this.type = n, this.name = r, i && (this.keyType = i), s && (this.valueType = s), o && (this.values = o), this.unwrappedType = t === "dyn" && s ? s.unwrappedType : this, t === "list" ? this.fieldLazy = this.#a : t === "map" ? this.fieldLazy = this.#o : t === "message" ? this.fieldLazy = this.#i : t === "dyn" ? this.fieldLazy = this.#o : t === "optional" && (this.fieldLazy = this.#r), Object.freeze(this);
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
    if (t = t instanceof ae ? t.orValue() : t, t === void 0) return vi;
    const s = i.debugType(t);
    try {
      return ae.of(s.fieldLazy(t, n, r, i));
    } catch (o) {
      if (o instanceof F) return vi;
      throw o;
    }
  }
  #i(t, n, r, i) {
    const s = i.objectTypesByConstructor.get(t.constructor);
    if (!s) return;
    if (!s.fields) return Object.hasOwn(t, n) ? t[n] : void 0;
    const o = s.fields[n];
    if (!o) return;
    const a = t[n];
    if (o.kind === "dyn") return a;
    const c = i.debugType(a);
    if (o.matches(c)) return a;
    throw new F(
      `Field '${n}' is not of type '${o}', got '${c}'`,
      r
    );
  }
  #o(t, n, r, i) {
    let s;
    if (t instanceof Map ? s = t.get(n) : s = Object.hasOwn(t, n) ? t[n] : void 0, s === void 0) return;
    if (this.valueType.kind === "dyn") return s;
    const o = i.debugType(s);
    if (this.valueType.matches(o)) return s;
    throw new F(
      `Field '${n}' is not of type '${this.valueType}', got '${o}'`,
      r
    );
  }
  #a(t, n, r, i) {
    if (!(typeof n == "number" || typeof n == "bigint")) return;
    const s = t[n];
    if (s === void 0)
      throw new F(
        `No such key: index out of bounds, index ${n} ${n < 0 ? "< 0" : `>= size ${t.length}`}`,
        r
      );
    const o = i.debugType(s);
    if (this.valueType.matches(o)) return s;
    throw new F(
      `List item with index '${n}' is not of type '${this.valueType}', got '${o}'`,
      r
    );
  }
  fieldLazy() {
  }
  field(t, n, r, i) {
    const s = this.fieldLazy(t, n, r, i);
    if (s !== void 0) return s;
    throw new F(`No such key: ${n}`, r);
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
function py(e, t) {
  const n = `Macro '${e}' must `;
  return function(i) {
    const s = t(i);
    if (!s || typeof s != "object") throw new Error(`${n} must return an object.`);
    if (!s?.typeCheck) throw new Error(`${n} have a .typeCheck(checker, macro, ctx) method.`);
    if (!s?.evaluate) throw new Error(`${n} have a .evaluate(evaluator, macro, ctx) method.`);
    return s;
  };
}
class gy {
  #t;
  constructor({ name: t, receiverType: n, argTypes: r, returnType: i, handler: s }) {
    this.name = t, this.receiverType = n || null, this.argTypes = r, this.returnType = i, this.macro = r.includes(jr);
    const o = n ? `${n}.` : "";
    this.signature = `${o}${t}(${r.join(", ")}): ${i}`, this.handler = this.macro ? py(this.signature, s) : s, Object.freeze(this);
  }
  hasPlaceholder() {
    return this.#t ??= this.returnType.hasPlaceholder() || this.receiverType?.hasPlaceholder() || this.argTypes.some((t) => t.hasPlaceholder()) || !1;
  }
  matchesArgs(t) {
    return t.length === this.argTypes.length && this.argTypes.every((n, r) => n.matches(t[r])) ? this : null;
  }
}
class qn {
  #t;
  constructor({ operator: t, leftType: n, rightType: r, handler: i, returnType: s }) {
    this.operator = t, this.leftType = n, this.rightType = r || null, this.handler = i, this.returnType = s, r ? this.signature = `${n} ${t} ${r}: ${s}` : this.signature = `${t}${n}: ${s}`, Object.freeze(this);
  }
  hasPlaceholder() {
    return this.#t ??= this.leftType.hasPlaceholder() || this.rightType?.hasPlaceholder() || !1;
  }
  equals(t) {
    return this.operator === t.operator && this.leftType === t.leftType && this.rightType === t.rightType;
  }
}
function xf(e) {
  return new Ye({
    kind: "list",
    name: `list<${e}>`,
    type: "list",
    valueType: e
  });
}
function ye(e) {
  return new Ye({ kind: "primitive", name: e, type: e });
}
function yy(e) {
  return new Ye({ kind: "message", name: e, type: e });
}
function Tf(e) {
  const t = e ? `dyn<${e}>` : "dyn";
  return new Ye({ kind: "dyn", name: t, type: t, valueType: e });
}
function Sf(e) {
  const t = e ? `optional<${e}>` : "optional";
  return new Ye({ kind: "optional", name: t, type: "optional", valueType: e });
}
function vf(e, t) {
  return new Ye({
    kind: "map",
    name: `map<${e}, ${t}>`,
    type: "map",
    keyType: e,
    valueType: t
  });
}
function wy(e) {
  return new Ye({ kind: "param", name: e, type: e });
}
const Xt = Tf(), jr = ye("ast"), Ec = xf(Xt), xc = vf(Xt, Xt), It = Object.freeze({
  string: ye("string"),
  bool: ye("bool"),
  int: ye("int"),
  uint: ye("uint"),
  double: ye("double"),
  bytes: ye("bytes"),
  dyn: Xt,
  null: ye("null"),
  type: ye("type"),
  optional: Sf(Xt),
  list: Ec,
  "list<dyn>": Ec,
  map: xc,
  "map<dyn, dyn>": xc
});
class my {
  returnType = null;
  /** @type {Array<FunctionDeclaration>} */
  declarations = [];
  constructor(t) {
    this.registry = t;
  }
  add(t) {
    this.returnType = (this.returnType ? this.returnType.unify(this.registry, t.returnType) : t.returnType) || Xt, this.declarations.push(t);
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
function Tc(e) {
  const t = [];
  let n = "", r = 0;
  for (const i of e) {
    if (i === "<") r++;
    else if (i === ">") r--;
    else if (i === "," && r === 0) {
      t.push(n), n = "";
      continue;
    }
    n += i;
  }
  return n && t.push(n), t;
}
const Af = [
  [void 0, "map"],
  [Object, "map"],
  [Map, "map"],
  [Array, "list"],
  [Uint8Array, "bytes"],
  [Je, "uint"],
  [Ut, "type"],
  [ae, "optional"]
];
typeof Buffer < "u" && Af.push([Buffer, "bytes"]);
class ta {
  #t = {};
  #e = {};
  #n;
  #r;
  #i;
  #o = /* @__PURE__ */ new Map([
    [!0, /* @__PURE__ */ new Map()],
    [!1, /* @__PURE__ */ new Map()]
  ]);
  #a = /* @__PURE__ */ new Map();
  #c = /* @__PURE__ */ new Map();
  #u = /* @__PURE__ */ new Map();
  #p = /* @__PURE__ */ new Map();
  constructor(t = {}) {
    if (this.enableOptionalTypes = t.enableOptionalTypes ?? !1, this.objectTypes = ge(t.objectTypes), this.objectTypesByConstructor = ge(t.objectTypesByConstructor), this.objectTypeInstances = ge(t.objectTypeInstances), this.#i = ge(t.functionDeclarations), this.#r = ge(t.operatorDeclarations), this.#n = ge(
      t.typeDeclarations || Object.entries(It),
      void 0,
      !1
    ), this.constants = ge(t.constants), this.variables = t.unlistedVariablesAreDyn ? ge(t.variables, hy) : ge(t.variables), this.variables.size)
      uy(this, this.enableOptionalTypes);
    else {
      for (const n of Af) this.registerType(n[1], n[0], !0);
      for (const n in rr) this.registerConstant(n, "type", rr[n]);
    }
  }
  #g() {
    this.#t = {}, this.#e = {};
  }
  registerVariable(t, n) {
    if (this.variables.has(t)) throw new Error(`Variable already registered: ${t}`);
    return this.variables.set(t, n instanceof Ye ? n : this.getType(n)), this;
  }
  registerConstant(t, n, r) {
    return this.registerVariable(t, n), this.constants.set(t, r), this;
  }
  #y(t, n, r) {
    let i = this.#o.get(t);
    return i = i.get(n) || i.set(n, /* @__PURE__ */ new Map()).get(n), i.get(r) || i.set(r, new my(this)).get(r);
  }
  getFunctionCandidates(t, n, r) {
    const i = this.#o.get(t)?.get(n)?.get(r);
    if (i) return i;
    for (const [, s] of this.#i)
      this.#y(!!s.receiverType, s.name, s.argTypes.length).add(s);
    return this.#y(t, n, r);
  }
  getType(t) {
    return this.#s(t, !0);
  }
  getDynType(t) {
    return this.#a.get(t) || this.#a.set(t, this.#s(`dyn<${t.unwrappedType}>`, !0)).get(t);
  }
  getListType(t) {
    return this.#c.get(t) || this.#c.set(t, this.#s(`list<${t}>`, !0)).get(t);
  }
  getMapType(t, n) {
    return this.#u.get(t)?.get(n) || (this.#u.get(t) || this.#u.set(t, /* @__PURE__ */ new Map()).get(t)).set(n, this.#s(`map<${t}, ${n}>`, !0)).get(n);
  }
  getOptionalType(t) {
    return this.#p.get(t) || this.#p.set(t, this.#s(`optional<${t}>`, !0)).get(t);
  }
  assertType(t, n, r) {
    try {
      return this.#s(t, !0);
    } catch (i) {
      throw i.message = `Invalid ${n} '${i.unknownType || t}' in '${r}'`, i;
    }
  }
  getFunctionType(t) {
    return t === "ast" ? jr : this.#s(t, !0);
  }
  registerType(t, n, r) {
    if (typeof t != "string" || t.length < 2)
      throw new Error(`Invalid type name: ${t}`);
    const i = {
      name: t,
      typeType: rr[t] || new Ut(t),
      type: this.#s(t, !1),
      ctor: typeof n == "function" ? n : n?.ctor,
      fields: this.#S(t, n?.fields)
    };
    if (!r) {
      if (this.objectTypes.has(t)) throw new Error(`Type already registered: ${t}`);
      if (typeof i.ctor != "function")
        throw new Error(`Constructor function missing for type '${t}'`);
    }
    return this.objectTypes.set(t, i), this.objectTypesByConstructor.set(i.ctor, i), r ? this : (this.objectTypeInstances.set(t, i.typeType), this.registerFunctionOverload(`type(${t}): type`, () => i.typeType), this);
  }
  getObjectType(t) {
    return this.objectTypes.get(t);
  }
  /** @returns {TypeDeclaration} */
  #s(t, n = !1) {
    let r = this.#n.get(t);
    if (r) return r;
    if (r = t.match(/^[A-Z]$/), r) return this.#l(wy, t, t);
    if (r = t.match(/^dyn<(.+)>$/), r) {
      const i = this.#s(r[1].trim(), n);
      return this.#l(Tf, `dyn<${i}>`, i);
    }
    if (r = t.match(/^list<(.+)>$/), r) {
      const i = this.#s(r[1].trim(), n);
      return this.#l(xf, `list<${i}>`, i);
    }
    if (r = t.match(/^map<(.+)>$/), r) {
      const i = Tc(r[1]);
      if (i.length !== 2) throw new Error(`Invalid map type: ${t}`);
      const s = this.#s(i[0].trim(), n), o = this.#s(i[1].trim(), n);
      return this.#l(vf, `map<${s}, ${o}>`, s, o);
    }
    if (r = t.match(/^optional<(.+)>$/), r) {
      const i = this.#s(r[1].trim(), n);
      return this.#l(Sf, `optional<${i}>`, i);
    }
    if (n) {
      const i = new Error(`Unknown type: ${t}`);
      throw i.unknownType = t, i;
    }
    return this.#l(yy, t, t);
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
        (i) => i.macro
      ) || !1
    );
  }
  #w(t, n, r) {
    const i = [];
    for (const [, s] of this.#r) {
      if (s.operator !== t) continue;
      if (s.leftType === n && s.rightType === r) return [s];
      const o = this.#E(s, n, r);
      o && i.push(o);
    }
    return i.length === 0 && (t === "==" || t === "!=") && (n.kind === "dyn" || r.kind === "dyn") ? [{ handler: t === "==" ? (o, a) => o === a : (o, a) => o !== a, returnType: this.getType("bool") }] : i;
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
    const i = this.#w(t, n, r);
    if (i.length === 0) return !1;
    if (i.length === 1) return i[0];
    throw new Error(`Operator overload '${i[0].signature}' overlaps with '${i[1].signature}'.`);
  }
  #b(t, n, r) {
    const i = this.#w(t, n, r);
    if (i.length === 0) return !1;
    const s = i[0].returnType;
    return i.every((o) => o.returnType === s) ? s : (s.kind === "list" || s.kind === "map") && i.every((o) => o.returnType.kind === s.kind) ? s.kind === "list" ? It.list : It.map : It.dyn;
  }
  #d(t, n, r, i, s) {
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
    return this.#f(t, n, r, i) && (i || n.matches(t.templated(this, r))) ? n : null;
  }
  #x(t, n, r) {
    const i = r.get(t);
    return i ? i.kind === "dyn" || n.kind === "dyn" ? !0 : i.matchesBoth(n) : r.set(t, n) && !0;
  }
  #f(t, n, r, i = !1) {
    if (!t.hasPlaceholder()) return !0;
    if (!n) return !1;
    const s = i || n.kind === "dyn";
    switch (n = n.unwrappedType, t.kind) {
      case "param": {
        const o = s ? It.dyn : n;
        return this.#x(t.name, o, r);
      }
      case "list":
        return n.name === "dyn" && (n = t), n.kind !== "list" ? !1 : this.#f(
          t.valueType,
          n.valueType,
          r,
          s
        );
      case "map":
        return n.name === "dyn" && (n = t), n.kind !== "map" ? !1 : this.#f(
          t.keyType,
          n.keyType,
          r,
          s
        ) && this.#f(
          t.valueType,
          n.valueType,
          r,
          s
        );
      case "optional":
        return n.name === "dyn" && (n = t), n.kind !== "optional" ? !1 : this.#f(
          t.valueType,
          n.valueType,
          r,
          s
        );
    }
    return !0;
  }
  #T(t, n, r, i = !1) {
    try {
      const s = typeof n[r] == "string" ? { type: n[r] } : { ...n[r] };
      if (typeof s?.type != "string") throw new Error("unsupported declaration");
      return this.#s(s.type, i);
    } catch (s) {
      throw s.message = `Field '${r}' in type '${t}' has unsupported declaration: ${JSON.stringify(n[r])}`, s;
    }
  }
  #S(t, n) {
    if (!n) return;
    const r = /* @__PURE__ */ Object.create(null);
    for (const i of Object.keys(n)) r[i] = this.#T(t, n, i);
    return r;
  }
  clone(t) {
    return new ta({
      objectTypes: this.objectTypes,
      objectTypesByConstructor: this.objectTypesByConstructor,
      objectTypeInstances: this.objectTypeInstances,
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
  #v(t, n) {
    const r = t.match(/^(?:([a-zA-Z0-9.<>]+)\.)?(\w+)\((.*?)\):\s*(.+)$/);
    if (!r) throw new Error(`Invalid signature: ${t}`);
    const [, i, s, o, a] = r;
    try {
      return new gy({
        name: s,
        receiverType: i ? this.getType(i) : null,
        returnType: this.getType(a.trim()),
        argTypes: Tc(o).map((c) => this.getFunctionType(c.trim())),
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
    return t.name !== n.name || t.argTypes.length !== n.argTypes.length || (t.receiverType || n.receiverType) && (!t.receiverType || !n.receiverType) ? !1 : !(t.receiverType !== n.receiverType && t.receiverType !== Xt && n.receiverType !== Xt) && (n.macro || t.macro || n.argTypes.every((i, s) => {
      const o = t.argTypes[s];
      return i === o || i === jr || o === jr || i === Xt || o === Xt;
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
    const r = typeof n == "function" ? n : n?.handler, i = this.#v(t, r);
    this.#I(i), this.#i.set(i.signature, i), this.#o.get(!0).clear(), this.#o.get(!1).clear();
  }
  registerOperatorOverload(t, n) {
    const r = t.match(/^([-!])([\w.<>]+)(?::\s*([\w.<>]+))?$/);
    if (r) {
      const [, u, l, f] = r;
      return this.unaryOverload(u, l, n, f);
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
    ), a = new qn({ operator: `${t}_`, leftType: s, returnType: o, handler: r });
    if (this.#h(a))
      throw new Error(`Operator overload already registered: ${t}${n}`);
    this.#r.set(a.signature, a), this.#g();
  }
  #h(t) {
    for (const [, n] of this.#r) if (t.equals(n)) return !0;
    return !1;
  }
  binaryOverload(t, n, r, i, s) {
    s ??= Sc(n) ? "bool" : t;
    const o = `${t} ${n} ${r}: ${s}`, a = this.assertType(t, "left type", o), c = this.assertType(r, "right type", o), u = this.assertType(s, "return type", o);
    if (Sc(n) && u.type !== "bool")
      throw new Error(`Comparison operator '${n}' must return 'bool', got '${u.type}'`);
    const l = new qn({ operator: n, leftType: a, rightType: c, returnType: u, handler: i });
    if (l.hasPlaceholder() && !(c.hasPlaceholder() && a.hasPlaceholder()))
      throw new Error(
        `Operator overload with placeholders must use them in both left and right types: ${o}`
      );
    if (this.#h(l))
      throw new Error(`Operator overload already registered: ${l.signature}`);
    if (n === "==") {
      const f = [
        new qn({
          operator: "!=",
          leftType: a,
          rightType: c,
          handler(h, p, y, d) {
            return !i(h, p, y, d);
          },
          returnType: u
        })
      ];
      a !== c && f.push(
        new qn({
          operator: "==",
          leftType: c,
          rightType: a,
          handler(h, p, y, d) {
            return i(p, h, y, d);
          },
          returnType: u
        }),
        new qn({
          operator: "!=",
          leftType: c,
          rightType: a,
          handler(h, p, y, d) {
            return !i(p, h, y, d);
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
function Sc(e) {
  return e === "<" || e === "<=" || e === ">" || e === ">=" || e === "==" || e === "!=" || e === "in";
}
function by(e) {
  return new ta(e);
}
class Ey {
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
    return new Ai(this);
  }
}
class Ai {
  parent;
  context;
  variableName;
  variableType;
  variableValue;
  constructor(t) {
    this.parent = t;
  }
  fork() {
    return new Ai(this);
  }
  forkWithVariable(t, n) {
    const r = new Ai(this);
    return r.variableType = t, r.variableName = n, r;
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
function Yi(e, t) {
  if (e.op === "id") return e.args;
  throw new st(t, e);
}
function Er(e, t) {
  if (typeof t == "boolean") return !1;
  if (t instanceof Error)
    return e.error ??= t, /predicate must return bool|Unknown variable/.test(t.message);
  const n = e.ev.debugRuntimeType(t, e.firstMacroIter.checkedType);
  return e.error = new F(
    `${e.macro.functionDesc} predicate must return bool, got '${n}'`,
    e.firstMacroIter
  ), !0;
}
class xy {
  items;
  results;
  error;
  constructor(t, n, r, i, s) {
    this.ev = t, this.macro = n, this.firstMacroIter = n.first, this.ctx = r.forkWithVariable(n.variableType, n.predicateVar), this.each = i, this.finalizer = s;
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
    const n = this.toIterable(t);
    for (let r = 0; r < n.length && this.return === void 0; ) {
      const i = this.ctx.setVariableValue(n[r++]);
      let s = this.ev.tryEval(this.firstMacroIter, i);
      if (s instanceof Promise ? s = s.then((o) => this.each(this, i, o)) : s = this.each(this, i, s), s instanceof Promise) return s.then(() => this.iterateAsync(n, r));
    }
    return this.finalizer(this);
  }
  async iterateAsync(t, n = 0) {
    t instanceof Promise && (t = this.toIterable(await t));
    for (let r = n; r < t.length && this.return === void 0; ) {
      const i = this.ctx.setVariableValue(t[r++]);
      let s = this.ev.tryEval(this.firstMacroIter, i);
      s = this.each(this, i, s instanceof Promise ? await s : s), s instanceof Promise && await s;
    }
    return this.finalizer(this);
  }
}
function ir(e, t) {
  return function(n, r, i) {
    const s = n.eval(r.receiver, i), o = new xy(n, r, i, e, t);
    return s instanceof Promise ? o.iterateAsync(s) : o.iterate(s);
  };
}
function Ty(e, t, n) {
  if (Er(e, n)) throw e.error;
  n === !1 && (e.return = !1);
}
function Sy(e) {
  if (e.return !== void 0) return e.return;
  if (e.error) throw e.error;
  return !0;
}
function vy(e, t, n) {
  if (Er(e, n)) throw e.error;
  n === !0 && (e.return = !0);
}
function Ay(e) {
  if (e.return !== void 0) return e.return;
  if (e.error) throw e.error;
  return !1;
}
function Iy(e, t, n) {
  if (Er(e, n) || n instanceof Error) throw e.error;
  n && (e.found ? e.return = !1 : e.found = !0);
}
function ky(e) {
  return e.return !== void 0 ? e.return : e.found === !0;
}
function If(e) {
  return e.results || [];
}
function Oy(e, t, n) {
  if (n === !1) return;
  if (Er(e, n) || n instanceof Error) throw e.error;
  const r = e.ev.eval(e.macro.second, t);
  return r instanceof Promise ? r.then((i) => (e.results ??= []).push(i)) : (e.results ??= []).push(r);
}
function By(e, t, n) {
  if (n instanceof Error) throw e.error;
  return (e.results ??= []).push(n);
}
function $y(e, t, n) {
  if (Er(e, n) || n instanceof Error) throw e.error;
  n && (e.results ??= []).push(t.variableValue);
}
function Ny(e, t, n) {
  if (t.kind === "dyn") return t;
  if (t.kind === "list") return t.valueType;
  if (t.kind === "map") return t.keyType;
  throw new e.Error(
    `Expression of type '${t}' cannot be range of a comprehension (must be list, map, or dynamic).`,
    n.receiver
  );
}
function ea(e, t, n) {
  const r = Ny(e, e.check(t.receiver, n), t);
  return n.forkWithVariable(r, t.predicateVar);
}
function bs({ description: e, evaluator: t }) {
  const n = `${e} invalid predicate iteration variable`;
  if (!t) throw new Error(`No evaluator provided for quantifier macro: ${e}`);
  function r(i, s, o) {
    o = ea(i, s, o), s.variableType = o.variableType;
    const a = i.check(s.first, o);
    if (a.isDynOrBool()) return a;
    throw new i.Error(
      `${s.functionDesc} predicate must return bool, got '${a}'`,
      s.first
    );
  }
  return ({ args: i, receiver: s }) => ({
    functionDesc: e,
    receiver: s,
    first: i[1],
    predicateVar: Yi(i[0], n),
    evaluate: t,
    typeCheck: r
  });
}
function vc(e) {
  const t = e ? "map(var, filter, transform)" : "map(var, transform)", n = `${t} invalid predicate iteration variable`, r = ir(
    e ? Oy : By,
    If
  );
  function i(s, o, a) {
    if (a = ea(s, o, a), o.variableType = a.variableType, e) {
      const c = s.check(o.first, a);
      if (!c.isDynOrBool())
        throw new s.Error(
          `${o.functionDesc} filter predicate must return bool, got '${c}'`,
          o.first
        );
    }
    return s.getType(`list<${s.check(e ? o.second : o.first, a)}>`);
  }
  return ({ args: s, receiver: o }) => ({
    args: s,
    functionDesc: t,
    receiver: o,
    first: s[1],
    second: e ? s[2] : null,
    predicateVar: Yi(s[0], n),
    evaluate: r,
    typeCheck: i
  });
}
function Ry() {
  const e = "filter(var, predicate)", t = `${e} invalid predicate iteration variable`, n = ir($y, If);
  function r(i, s, o) {
    o = ea(i, s, o), s.variableType = o.variableType;
    const a = i.check(s.first, o);
    if (a.isDynOrBool()) return i.getType(`list<${s.variableType}>`);
    throw new i.Error(
      `${s.functionDesc} predicate must return bool, got '${a}'`,
      s.first
    );
  }
  return ({ args: i, receiver: s }) => ({
    args: i,
    functionDesc: e,
    receiver: s,
    first: i[1],
    predicateVar: Yi(i[0], t),
    evaluate: n,
    typeCheck: r
  });
}
function Uy() {
  const e = "has() invalid argument";
  function t(r, i, s) {
    const o = i.macroHasProps;
    let a = o.length, c = r.eval(o[--a], s), u;
    for (; a--; ) {
      const l = o[a];
      if (l.op === ".?" && (u ??= !0), c = r.debugType(c).fieldLazy(c, l.args[1], l, r), c === void 0) {
        if (!(!u && a && l.op === ".")) break;
        throw new F(`No such key: ${l.args[1]}`, l);
      }
    }
    return c !== void 0;
  }
  function n(r, i, s) {
    let o = i.args[0];
    if (o.op !== ".") throw new r.Error(e, o);
    if (!i.macroHasProps) {
      const a = [];
      for (; (o.op === "." || o.op === ".?") && a.push(o); ) o = o.args[0];
      if (o.op !== "id") throw new r.Error(e, o);
      r.check(o, s), a.push(o), i.macroHasProps = a;
    }
    return r.getType("bool");
  }
  return function({ args: r }) {
    return { args: r, evaluate: t, typeCheck: n };
  };
}
function Ly(e) {
  e.registerFunctionOverload("has(ast): bool", Uy()), e.registerFunctionOverload(
    "list.all(ast, ast): bool",
    bs({
      description: "all(var, predicate)",
      evaluator: ir(Ty, Sy)
    })
  ), e.registerFunctionOverload(
    "list.exists(ast, ast): bool",
    bs({
      description: "exists(var, predicate)",
      evaluator: ir(vy, Ay)
    })
  ), e.registerFunctionOverload(
    "list.exists_one(ast, ast): bool",
    bs({
      description: "exists_one(var, predicate)",
      evaluator: ir(Iy, ky)
    })
  ), e.registerFunctionOverload("list.map(ast, ast): list<dyn>", vc(!1)), e.registerFunctionOverload("list.map(ast, ast, ast): list<dyn>", vc(!0)), e.registerFunctionOverload("list.filter(ast, ast): list<dyn>", Ry());
  function t(i, s, o, a) {
    return i.eval(
      s.exp,
      o.forkWithVariable(s.val.checkedType, s.var).setVariableValue(a)
    );
  }
  class n {
  }
  const r = new n();
  e.registerType("CelNamespace", n), e.registerConstant("cel", "CelNamespace", r), e.registerFunctionOverload("CelNamespace.bind(ast, dyn, ast): dyn", ({ args: i }) => ({
    var: Yi(i[0], "invalid variable argument"),
    val: i[1],
    exp: i[2],
    typeCheck(s, o, a) {
      const c = a.forkWithVariable(s.check(o.val, a), o.var);
      return s.check(o.exp, c);
    },
    evaluate(s, o, a) {
      const c = s.eval(o.val, a);
      return c instanceof Promise ? c.then((u) => t(s, o, a, u)) : t(s, o, a, c);
    }
  }));
}
function Cy(e) {
  const t = e.unaryOverload.bind(e), n = e.binaryOverload.bind(e);
  function r(u, l) {
    if (u <= 9223372036854775807n && u >= -9223372036854775808n) return u;
    throw new F(`integer overflow: ${u}`, l);
  }
  t("!", "bool", (u) => !u), t("-", "int", (u) => -u), n("dyn<int>", "==", "double", (u, l) => u == l), n("dyn<int>", "==", "uint", (u, l) => u == l.valueOf()), n("int", "*", "int", (u, l, f) => r(u * l, f)), n("int", "+", "int", (u, l, f) => r(u + l, f)), n("int", "-", "int", (u, l, f) => r(u - l, f)), n("int", "/", "int", (u, l, f) => {
    if (l === 0n) throw new F("division by zero", f);
    return u / l;
  }), n("int", "%", "int", (u, l, f) => {
    if (l === 0n) throw new F("modulo by zero", f);
    return u % l;
  }), t("-", "double", (u) => -u), n("dyn<double>", "==", "int", (u, l) => u == l), n("dyn<double>", "==", "uint", (u, l) => u == l.valueOf()), n("double", "*", "double", (u, l) => u * l), n("double", "+", "double", (u, l) => u + l), n("double", "-", "double", (u, l) => u - l), n("double", "/", "double", (u, l) => u / l), n("string", "+", "string", (u, l) => u + l), n("list<V>", "+", "list<V>", (u, l) => [...u, ...l]), n("bytes", "+", "bytes", (u, l) => {
    const f = new Uint8Array(u.length + l.length);
    return f.set(u, 0), f.set(l, u.length), f;
  });
  const i = "google.protobuf.Duration";
  n(i, "+", i, (u, l) => u.addDuration(l)), n(i, "-", i, (u, l) => u.subtractDuration(l)), n(i, "==", i, (u, l) => u.seconds === l.seconds && u.nanos === l.nanos);
  const s = "google.protobuf.Timestamp";
  n(s, "==", s, (u, l) => u.getTime() === l.getTime()), n(s, "-", s, (u, l) => De.fromMilliseconds(u.getTime() - l.getTime()), i), n(s, "-", i, (u, l) => l.subtractTimestamp(u)), n(s, "+", i, (u, l) => l.extendTimestamp(u)), n(i, "+", s, (u, l) => u.extendTimestamp(l));
  function o(u, l, f, h) {
    if (l instanceof Set && l.has(u)) return !0;
    for (const p of l) if (Yn(u, p, h)) return !0;
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
        if (!Yn(u[g], l[g], h)) return !1;
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
        if (!(l.has(d) && Yn(g, l.get(d), h))) return !1;
      return !0;
    }
    if (u instanceof Map || l instanceof Map) {
      const d = u instanceof Map ? l : u, g = u instanceof Map ? u : l, m = Object.keys(d);
      if (g.size !== m.length) return !1;
      for (const [S, I] of g)
        if (!(S in d && Yn(I, d[S], h))) return !1;
      return !0;
    }
    const p = Object.keys(u), y = Object.keys(l);
    if (p.length !== y.length) return !1;
    for (let d = 0; d < p.length; d++) {
      const g = p[d];
      if (!(g in l && Yn(u[g], l[g], h))) return !1;
    }
    return !0;
  }), n("uint", "==", "uint", (u, l) => u.valueOf() === l.valueOf()), n("dyn<uint>", "==", "double", (u, l) => u.valueOf() == l), n("dyn<uint>", "==", "int", (u, l) => u.valueOf() == l), n("uint", "+", "uint", (u, l) => new Je(u.valueOf() + l.valueOf())), n("uint", "-", "uint", (u, l) => new Je(u.valueOf() - l.valueOf())), n("uint", "*", "uint", (u, l) => new Je(u.valueOf() * l.valueOf())), n("uint", "/", "uint", (u, l, f) => {
    if (l.valueOf() === 0n) throw new F("division by zero", f);
    return new Je(u.valueOf() / l.valueOf());
  }), n("uint", "%", "uint", (u, l, f) => {
    if (l.valueOf() === 0n) throw new F("modulo by zero", f);
    return new Je(u.valueOf() % l.valueOf());
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
function Yn(e, t, n) {
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
      const r = n.objectTypesByConstructor.get(e.constructor)?.type, i = n.objectTypesByConstructor.get(t.constructor)?.type;
      if (!r || r !== i) return !1;
      const s = n.registry.findBinaryOverload("==", r, i);
      return s ? s.handler(e, t, null, n) : !1;
  }
  throw new F(`Cannot compare values of type ${typeof e}`);
}
class kf {
  dynType = It.dyn;
  optionalType = It.optional;
  stringType = It.string;
  intType = It.int;
  doubleType = It.double;
  boolType = It.bool;
  nullType = It.null;
  listType = It.list;
  mapType = It.map;
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
        return t === null ? this.nullType : this.objectTypesByConstructor.get(t.constructor)?.type || Ac(this, t.constructor?.name || typeof t);
      default:
        Ac(this, typeof t);
    }
  }
}
function Ac(e, t) {
  throw new e.Error(`Unsupported type: ${t}`);
}
function Wr(e, t, n, r, i) {
  return n instanceof Promise || r instanceof Promise ? Promise.all([n, r]).then((s) => i(e, t, s[0], s[1])) : i(e, t, n, r);
}
function Ic(e, t, n) {
  const r = e.check(t.args[0], n);
  return t.op === "[]" && e.check(t.args[1], n), r.kind !== "optional" ? e.checkAccessOnType(t, n, r) : e.registry.getOptionalType(e.checkAccessOnType(t, n, r.valueType, !0));
}
function kc(e, t, n) {
  const r = e.check(t.args[0], n);
  t.op === "[?]" && e.check(t.args[1], n);
  const i = r.kind === "optional" ? r.valueType : r;
  return e.registry.getOptionalType(e.checkAccessOnType(t, n, i, !0));
}
function Oc(e, t, n, r, i) {
  const s = e.check(r, t);
  if (s === n || n.isEmpty()) return s;
  if (s.isEmpty()) return n;
  let o;
  throw i === 0 ? o = "List elements must have the same type," : i === 1 ? o = "Map key uses wrong type," : i === 2 && (o = "Map value uses wrong type,"), new e.Error(
    `${o} expected type '${e.formatType(n)}' but found '${e.formatType(s)}'`,
    r
  );
}
function Bc(e, t, n, r) {
  return n.unify(e.registry, e.check(r, t)) || e.dynType;
}
function Ii(e, t, n) {
  const r = e.debugRuntimeType(t, n.checkedType);
  return new e.Error(`Logical operator requires bool operands, got '${r}'`, n);
}
function Py(e, t, n) {
  const r = e.debugRuntimeType(t, n.checkedType);
  return new e.Error(`Ternary condition must be bool, got '${r}'`, n);
}
function $c(e, t, n, r) {
  if (n === !0) return e.eval(t.args[1], r);
  if (n === !1) return e.eval(t.args[2], r);
  throw Py(e, n, t.args[0]);
}
function Nc(e, t, n) {
  const r = e.debugRuntimeType(n, t.args[0].checkedType), i = e.registry.findUnaryOverload(t.op, r);
  if (i) return i.handler(n);
  throw new e.Error(`no such overload: ${t.op[0]}${r}`, t);
}
function Rc(e, t, n) {
  const r = e.eval(t.args[0], n);
  return r instanceof Promise ? r.then((i) => Nc(e, t, i)) : Nc(e, t, r);
}
function _y(e, t, n, r) {
  const i = e.debugOperandType(n, t.args[0].checkedType), s = e.debugOperandType(r, t.args[1].checkedType), o = e.registry.findBinaryOverload(t.op, i, s);
  if (o) return o.handler(n, r, t, e);
  throw new e.Error(`no such overload: ${i} ${t.op} ${s}`, t);
}
function Dy(e, t, n) {
  return Wr(e, t, e.eval(t.args[0], n), e.eval(t.args[1], n), _y);
}
function Uc(e, t, n, r) {
  if (n === !0) return !0;
  const i = e.eval(t.args[1], r);
  return i instanceof Promise ? i.then((s) => Lc(e, t, n, s)) : Lc(e, t, n, i);
}
function Lc(e, t, n, r) {
  if (r === !0) return !0;
  if (r !== !1) throw Ii(e, r, t.args[1]);
  if (n instanceof Error) throw n;
  if (n !== !1) throw Ii(e, n, t.args[0]);
  return !1;
}
function Cc(e, t, n, r) {
  if (n === !1) return !1;
  const i = e.eval(t.args[1], r);
  return i instanceof Promise ? i.then((s) => Pc(e, t, n, s)) : Pc(e, t, n, i);
}
function Pc(e, t, n, r) {
  if (r === !1) return !1;
  if (r !== !0) throw Ii(e, r, t.args[1]);
  if (n instanceof Error) throw n;
  if (n !== !0) throw Ii(e, n, t.args[0]);
  return !0;
}
function _c(e, t, n) {
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
function Dc(e, t, n) {
  const r = t.op, i = e.check(t.args[0], n);
  if (i.kind === "dyn") return r === "!_" ? e.boolType : i;
  const s = e.registry.findUnaryOverload(r, i);
  if (s) return s.returnType;
  throw new e.Error(`no such overload: ${r[0]}${e.formatType(i)}`, t);
}
function Vy(e, t, n) {
  const r = t.op, i = e.check(t.args[0], n), s = e.check(t.args[1], n), o = e.registry.checkBinaryOverload(r, i, s);
  if (o) return o;
  throw new e.Error(
    `no such overload: ${e.formatType(i)} ${r} ${e.formatType(s)}`,
    t
  );
}
function Vc(e, t, n) {
  const [r, i] = t.args, s = i.length, o = t.functionCandidates ??= e.registry.getFunctionCandidates(
    !1,
    r,
    s
  ), a = t.argTypes ??= new Array(s);
  let c = s;
  for (; c--; ) a[c] = e.debugOperandType(n[c], i[c].checkedType);
  const u = o.findMatch(a, null);
  if (u) return u.handler.apply(e, n);
  throw new e.Error(
    `found no matching overload for '${r}(${a.map((l) => l.unwrappedType).join(", ")})'`,
    t
  );
}
function My(e, t, n, r) {
  const [i, s, o] = t.args, a = t.functionCandidates ??= e.registry.getFunctionCandidates(
    !0,
    i,
    o.length
  );
  let c = r.length;
  const u = t.argTypes ??= new Array(c);
  for (; c--; ) u[c] = e.debugOperandType(r[c], o[c].checkedType);
  const l = e.debugRuntimeType(n, s.checkedType || e.dynType), f = a.findMatch(u, l);
  if (f) return f.handler.call(e, n, ...r);
  throw new e.Error(
    `found no matching overload for '${l.type}.${i}(${u.map((h) => h.unwrappedType).join(", ")})'`,
    t
  );
}
function Es(e, t, n, r = n.length) {
  let i;
  const s = new Array(r);
  for (; r--; ) (s[r] = e.eval(n[r], t)) instanceof Promise && (i ??= !0);
  return i ? Promise.all(s) : s;
}
function Mc(e) {
  const t = {};
  for (let n = 0; n < e.length; n++) {
    const [r, i] = e[n];
    r === "__proto__" || r === "constructor" || r === "prototype" || (t[r] = i);
  }
  return t;
}
function xs(e, t, n, r) {
  return e.optionalType.field(n, r, t, e);
}
function Ts(e, t, n, r) {
  return e.debugType(n).field(n, r, t, e);
}
const ki = {
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
      if (r.kind === "dyn") return e.debugType(i) && i;
      const s = e.debugType(i);
      if (r.matches(s)) return i;
      throw new e.Error(`Variable '${t.args}' is not of type '${r}', got '${s}'`, t);
    }
  },
  ".": {
    check: Ic,
    evaluate(e, t, n) {
      const r = e.eval(t.args[0], n);
      return r instanceof Promise ? r.then((i) => Ts(e, t, i, t.args[1])) : Ts(e, t, r, t.args[1]);
    }
  },
  ".?": {
    check: kc,
    evaluate(e, t, n) {
      const r = e.eval(t.args[0], n);
      return r instanceof Promise ? r.then((i) => xs(e, t, i, t.args[1])) : xs(e, t, r, t.args[1]);
    }
  },
  "[]": {
    check: Ic,
    evaluate(e, t, n) {
      return Wr(e, t, e.eval(t.args[0], n), e.eval(t.args[1], n), Ts);
    }
  },
  "[?]": {
    check: kc,
    evaluate(e, t, n) {
      return Wr(e, t, e.eval(t.args[0], n), e.eval(t.args[1], n), xs);
    }
  },
  call: {
    check(e, t, n) {
      if (t.macro) return t.macro.typeCheck(e, t.macro, n);
      const r = t.args[0], i = t.args[1], s = t.functionCandidates ??= e.registry.getFunctionCandidates(
        !1,
        r,
        i.length
      ), o = i.map((c) => e.check(c, n)), a = s.findMatch(o);
      if (!a)
        throw new e.Error(
          `found no matching overload for '${r}(${e.formatTypeList(o)})'`,
          t
        );
      return a.returnType;
    },
    evaluate(e, t, n) {
      if (t.macro) return t.macro.evaluate(e, t.macro, n);
      const r = Es(e, n, t.args[1]);
      return r instanceof Promise ? r.then((i) => Vc(e, t, i)) : Vc(e, t, r);
    }
  },
  rcall: {
    check(e, t, n) {
      if (t.macro) return t.macro.typeCheck(e, t.macro, n);
      const r = t.args[0], i = t.args[2], s = e.check(t.args[1], n), o = t.functionCandidates ??= e.registry.getFunctionCandidates(
        !0,
        r,
        i.length
      ), a = i.map((u) => e.check(u, n));
      if (s.kind === "dyn" && o.returnType) return o.returnType;
      const c = o.findMatch(a, s);
      if (!c)
        throw new e.Error(
          `found no matching overload for '${s.type}.${r}(${e.formatTypeList(
            a
          )})'`,
          t
        );
      return c.returnType;
    },
    evaluate(e, t, n) {
      return t.macro ? t.macro.evaluate(e, t.macro, n) : Wr(
        e,
        t,
        e.eval(t.args[1], n),
        Es(e, n, t.args[2]),
        My
      );
    }
  },
  list: {
    check(e, t, n) {
      const r = t.args, i = r.length;
      if (i === 0) return e.getType("list<T>");
      let s = e.check(r[0], n);
      const o = e.opts.homogeneousAggregateLiterals ? Oc : Bc;
      for (let a = 1; a < i; a++) s = o(e, n, s, r[a], 0);
      return e.registry.getListType(s);
    },
    evaluate(e, t, n) {
      return Es(e, n, t.args);
    }
  },
  map: {
    check(e, t, n) {
      const r = t.args, i = r.length;
      if (i === 0) return e.getType("map<K, V>");
      const s = e.opts.homogeneousAggregateLiterals ? Oc : Bc;
      let o = e.check(r[0][0], n), a = e.check(r[0][1], n);
      for (let c = 1; c < i; c++) {
        const [u, l] = r[c];
        o = s(e, n, o, u, 1), a = s(e, n, a, l, 2);
      }
      return e.registry.getMapType(o, a);
    },
    evaluate(e, t, n) {
      const r = t.args, i = r.length, s = new Array(i);
      let o;
      for (let a = 0; a < i; a++) {
        const [c, u] = r[a], l = e.eval(c, n), f = e.eval(u, n);
        l instanceof Promise || f instanceof Promise ? (s[a] = Promise.all([l, f]), o ??= !0) : s[a] = [l, f];
      }
      return o ? Promise.all(s).then(Mc) : Mc(s);
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
      const i = e.check(t.args[1], n), s = e.check(t.args[2], n), o = i.unify(e.registry, s);
      if (o) return o;
      throw new e.Error(
        `Ternary branches must have the same type, got '${e.formatType(
          i
        )}' and '${e.formatType(s)}'`,
        t
      );
    },
    evaluate(e, t, n) {
      const r = e.eval(t.args[0], n);
      return r instanceof Promise ? r.then((i) => $c(e, t, i, n)) : $c(e, t, r, n);
    }
  },
  "||": {
    check: _c,
    evaluate(e, t, n) {
      const r = e.tryEval(t.args[0], n);
      return r instanceof Promise ? r.then((i) => Uc(e, t, i, n)) : Uc(e, t, r, n);
    }
  },
  "&&": {
    check: _c,
    evaluate(e, t, n) {
      const r = e.tryEval(t.args[0], n);
      return r instanceof Promise ? r.then((i) => Cc(e, t, i, n)) : Cc(e, t, r, n);
    }
  },
  "!_": { check: Dc, evaluate: Rc },
  "-_": { check: Dc, evaluate: Rc }
}, Hy = ["!=", "==", "in", "+", "-", "*", "/", "%", "<", "<=", ">", ">="];
for (const e of Hy) ki[e] = { check: Vy, evaluate: Dy };
for (const e in ki) ki[e].name = e;
const Fy = (/* @__PURE__ */ new Map()).set("A", "dyn").set("T", "dyn").set("K", "dyn").set("V", "dyn");
class Hc extends kf {
  constructor(t, n) {
    super(t), this.isEvaluating = n, this.Error = n ? F : cy;
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
    return t.hasPlaceholder() ? t.templated(this.registry, Fy).name : t.name;
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
class na {
  #t;
  #e;
  constructor(t, n, r, i) {
    const s = ki[r];
    this.#t = n, this.#e = t, this.op = r, this.check = s.check, this.evaluate = s.evaluate, this.args = i;
  }
  get input() {
    return this.#t;
  }
  get pos() {
    return this.#e;
  }
  toOldStructure() {
    const t = Array.isArray(this.args) ? this.args : [this.args];
    return [this.op, ...t.map((n) => n instanceof na ? n.toOldStructure() : n)];
  }
}
const Gr = {};
for (const e in $) Gr[$[e]] = e;
const Ky = /* @__PURE__ */ new Set([
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
]), Of = new Uint8Array(128);
for (const e of "0123456789abcdefABCDEF") Of[e.charCodeAt(0)] = 1;
const Fc = {
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
class zy {
  constructor(t) {
    this.input = t, this.pos = 0, this.length = t.length;
  }
  // Read next token
  nextToken() {
    for (; ; ) {
      const { pos: t, input: n, length: r } = this;
      if (t >= r) return { type: $.EOF, value: null, pos: t };
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
      throw new st(`Unexpected character: ${i}`, { pos: t, input: n });
    }
  }
  // Characters: 0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_
  _isIdentifierCharCode(t) {
    return t < 48 || t > 122 ? !1 : t >= 97 || t >= 65 && t <= 90 || t <= 57 || t === 95;
  }
  _parseAsDouble(t, n) {
    const r = Number(this.input.substring(t, n));
    if (Number.isFinite(r)) return { type: $.NUMBER, value: r, pos: t };
    throw new st(`Invalid number: ${r}`, { pos: t, input: this.input });
  }
  _parseAsBigInt(t, n, r, i) {
    const s = this.input.substring(t, n);
    if (i === "u" || i === "U") {
      this.pos++;
      try {
        return {
          type: $.NUMBER,
          value: new Je(s),
          pos: t
        };
      } catch {
      }
    } else
      try {
        return {
          type: $.NUMBER,
          value: BigInt(s),
          pos: t
        };
      } catch {
      }
    throw new st(r ? `Invalid hex integer: ${s}` : `Invalid integer: ${s}`, {
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
      if (r = this._readDigits(t, n, r), s === r) throw new st("Invalid exponent", { pos: r, input: t });
    }
    return r;
  }
  readNumber() {
    const { input: t, length: n, pos: r } = this;
    let i = r;
    if (t[i] === "0" && (t[i + 1] === "x" || t[i + 1] === "X")) {
      for (i += 2; i < n && Of[t[i].charCodeAt(0)]; ) i++;
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
        return { type: $.BYTES, value: s, pos: r - 1 };
      }
      case "r":
      case "R":
        return { type: $.STRING, value: t, pos: r - 1 };
      default: {
        const i = this.processEscapes(t, !1);
        return { type: $.STRING, value: i, pos: r };
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
          throw new st("Newlines not allowed in single-quoted strings", { pos: s, input: r });
        case "\\":
          a++;
      }
      a++;
    }
    throw new st("Unterminated string", { pos: s, input: r });
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
    throw new st("Unterminated triple-quoted string", { pos: s, input: r });
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
      if (Fc[s])
        r += Fc[s], i += 2;
      else if (s === "u") {
        if (n) throw new st("\\u not allowed in bytes literals");
        const o = t.substring(i + 2, i += 6);
        if (!/^[0-9a-fA-F]{4}$/.test(o)) throw new st(`Invalid Unicode escape: \\u${o}`);
        const a = Number.parseInt(o, 16);
        if (a >= 55296 && a <= 57343) throw new st(`Invalid Unicode surrogate: \\u${o}`);
        r += String.fromCharCode(a);
      } else if (s === "U") {
        if (n) throw new st("\\U not allowed in bytes literals");
        const o = t.substring(i + 2, i += 10);
        if (!/^[0-9a-fA-F]{8}$/.test(o)) throw new st(`Invalid Unicode escape: \\U${o}`);
        const a = Number.parseInt(o, 16);
        if (a > 1114111) throw new st(`Invalid Unicode escape: \\U${o}`);
        if (a >= 55296 && a <= 57343) throw new st(`Invalid Unicode surrogate: \\U${o}`);
        r += String.fromCodePoint(a);
      } else if (s === "x" || s === "X") {
        const o = t.substring(i + 2, i += 4);
        if (!/^[0-9a-fA-F]{2}$/.test(o)) throw new st(`Invalid hex escape: \\${s}${o}`);
        r += String.fromCharCode(Number.parseInt(o, 16));
      } else if (s >= "0" && s <= "7") {
        const o = t.substring(i + 1, i += 4);
        if (!/^[0-7]{3}$/.test(o)) throw new st("Octal escape must be 3 digits");
        const a = Number.parseInt(o, 8);
        if (a > 255) throw new st(`Octal escape out of range: \\${o}`);
        r += String.fromCharCode(a);
      } else
        throw new st(`Invalid escape sequence: \\${s}`);
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
        return { type: $.BOOLEAN, value: !0, pos: t };
      case "false":
        return { type: $.BOOLEAN, value: !1, pos: t };
      case "null":
        return { type: $.NULL, value: null, pos: t };
      case "in":
        return { type: $.IN, value: "in", pos: t };
      default:
        return { type: $.IDENTIFIER, value: s, pos: t };
    }
  }
}
class jy {
  constructor(t, n) {
    this.limits = t, this.registry = n;
  }
  #t(t, n = this.currentToken) {
    throw new st(`Exceeded ${t} (${this.limits[t]})`, {
      pos: n.pos,
      input: this.input
    });
  }
  #e(t, n, r) {
    const i = new na(t, this.input, n, r);
    return this.astNodesRemaining-- || this.#t("maxAstNodes", i), i;
  }
  #n() {
    const t = this.currentToken;
    return this.type = (this.currentToken = this.lexer.nextToken()).type, t;
  }
  consume(t) {
    if (this.type === t) return this.#n();
    throw new st(
      `Expected ${Gr[t]}, got ${Gr[this.type]}`,
      { pos: this.currentToken.pos, input: this.input }
    );
  }
  match(t) {
    return this.type === t;
  }
  // Parse entry point
  parse(t) {
    this.input = t, this.lexer = new zy(t), this.#n(), this.maxDepthRemaining = this.limits.maxDepth, this.astNodesRemaining = this.limits.maxAstNodes;
    const n = this.parseExpression();
    if (this.match($.EOF)) return n;
    throw new st(`Unexpected character: '${this.input[this.lexer.pos - 1]}'`, {
      pos: this.currentToken.pos,
      input: this.input
    });
  }
  #r(t, n, r, i) {
    const s = this.registry.findMacro(i, !!r, n.length);
    return s && (t.macro = s.handler({ ast: t, args: n, receiver: r, methodName: i, parser: this })), t;
  }
  #i(t) {
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
    const i = this.parseExpression();
    return this.maxDepthRemaining++, this.#e(n.pos, "?:", [t, r, i]);
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
        const i = this.match($.QUESTION) && this.registry.enableOptionalTypes && !!this.#n(), s = this.consume($.IDENTIFIER);
        if (this.match($.LPAREN) && this.#n()) {
          const o = this.parseArgumentList();
          this.consume($.RPAREN), t = this.#o(
            this.#e(s.pos, "rcall", [s.value, t, o])
          );
        } else
          t = this.#e(s.pos, i ? ".?" : ".", [t, s.value]);
        continue;
      }
      if (this.match($.LBRACKET)) {
        const r = this.#n();
        this.maxDepthRemaining-- || this.#t("maxDepth", r);
        const i = this.match($.QUESTION) && this.registry.enableOptionalTypes && !!this.#n(), s = this.parseExpression();
        this.consume($.RBRACKET), t = this.#e(r.pos, i ? "[?]" : "[]", [t, s]);
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
    throw new st(`Unexpected token: ${Gr[this.type]}`, {
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
    if (Ky.has(t))
      throw new st(`Reserved identifier: ${t}`, {
        pos: n,
        input: this.input
      });
    if (!this.match($.LPAREN)) return this.#e(n, "id", t);
    this.#n();
    const r = this.parseArgumentList();
    return this.consume($.RPAREN), this.#i(this.#e(n, "call", [t, r]));
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
const ra = Object.freeze({
  maxAstNodes: 1e5,
  maxDepth: 250,
  maxListElements: 1e3,
  maxMapEntries: 1e3,
  maxCallArguments: 32
}), Wy = new Set(Object.keys(ra));
function Gy(e, t = ra) {
  const n = e ? Object.keys(e) : void 0;
  if (!n?.length) return t;
  const r = { ...t };
  for (const i of n) {
    if (!Wy.has(i)) throw new TypeError(`Unknown limits option: ${i}`);
    const s = e[i];
    typeof s == "number" && (r[i] = s);
  }
  return Object.freeze(r);
}
const qy = Object.freeze({
  unlistedVariablesAreDyn: !1,
  homogeneousAggregateLiterals: !0,
  enableOptionalTypes: !1,
  limits: ra
});
function Ss(e, t, n) {
  const r = e?.[n] ?? t?.[n];
  if (typeof r != "boolean") throw new TypeError(`Invalid option: ${n}`);
  return r;
}
function Yy(e, t = qy) {
  return e ? Object.freeze({
    unlistedVariablesAreDyn: Ss(e, t, "unlistedVariablesAreDyn"),
    homogeneousAggregateLiterals: Ss(e, t, "homogeneousAggregateLiterals"),
    enableOptionalTypes: Ss(e, t, "enableOptionalTypes"),
    limits: Gy(e.limits, t.limits)
  }) : t;
}
const Zi = by({ enableOptionalTypes: !1 });
dy(Zi);
Cy(Zi);
Ly(Zi);
const Kc = /* @__PURE__ */ new WeakMap();
class fn {
  #t;
  #e;
  #n;
  #r;
  #i;
  #o;
  constructor(t, n) {
    this.opts = Yy(t, n?.opts), this.#t = (n instanceof fn ? Kc.get(n) : Zi).clone(this.opts);
    const r = {
      objectTypes: this.#t.objectTypes,
      objectTypesByConstructor: this.#t.objectTypesByConstructor,
      registry: this.#t,
      opts: this.opts
    };
    this.#n = new Hc(r), this.#r = new Hc(r, !0), this.#e = new Zy(r), this.#i = new jy(this.opts.limits, this.#t), this.#o = new Ey(this.#t.variables, this.#t.constants), Kc.set(this, this.#t), Object.freeze(this);
  }
  clone(t) {
    return new fn(t, this);
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
      return this.#a(this.#i.parse(t));
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
    const n = this.#i.parse(t), r = this.#u.bind(this, n);
    return r.check = this.#a.bind(this, n), r.ast = n, r;
  }
  evaluate(t, n) {
    return this.#u(this.#i.parse(t), n);
  }
  #u(t, n = null) {
    const r = this.#o.fork().withContext(n);
    return t.checkedType || this.#r.check(t, r), this.#e.eval(t, r);
  }
}
class Zy extends kf {
  constructor(t) {
    super(t), this.Error = F;
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
      return r instanceof Promise ? r.catch((i) => i) : r;
    } catch (r) {
      return r;
    }
  }
  eval(t, n) {
    return t.evaluate(this, t, n);
  }
}
new fn({
  unlistedVariablesAreDyn: !0
});
const ia = "amount", Xy = "expiry", Qy = "birth", Jy = "weight", tw = "inputType", ew = "script", Pn = {
  signature: "now(): double",
  implementation: () => Math.floor(Date.now() / 1e3)
}, zc = new fn().registerVariable(ia, "double").registerVariable(ew, "string").registerFunction(Pn.signature, Pn.implementation), nw = new fn().registerVariable(ia, "double").registerVariable(Xy, "double").registerVariable(Qy, "double").registerVariable(Jy, "double").registerVariable(tw, "string").registerFunction(Pn.signature, Pn.implementation), rw = new fn().registerVariable(ia, "double").registerFunction(Pn.signature, Pn.implementation);
class Lt {
  constructor(t) {
    this.value = t;
  }
  get satoshis() {
    return this.value ? Math.ceil(this.value) : 0;
  }
  add(t) {
    return new Lt(this.value + t.value);
  }
}
Lt.ZERO = new Lt(0);
class Bf {
  /**
   * Creates a new Estimator with the given config
   * @param config - Configuration containing CEL programs for fee calculation
   */
  constructor(t) {
    this.config = t, this.intentOffchainInput = t.offchainInput ? Pr(t.offchainInput, nw) : void 0, this.intentOnchainInput = t.onchainInput ? Pr(t.onchainInput, rw) : void 0, this.intentOffchainOutput = t.offchainOutput ? Pr(t.offchainOutput, zc) : void 0, this.intentOnchainOutput = t.onchainOutput ? Pr(t.onchainOutput, zc) : void 0;
  }
  /**
   * Evaluates the fee for a given vtxo input
   * @param input - The offchain input to evaluate
   * @returns The fee amount for this input
   */
  evalOffchainInput(t) {
    if (!this.intentOffchainInput)
      return Lt.ZERO;
    const n = iw(t);
    return new Lt(this.intentOffchainInput.program(n));
  }
  /**
   * Evaluates the fee for a given boarding input
   * @param input - The onchain input to evaluate
   * @returns The fee amount for this input
   */
  evalOnchainInput(t) {
    if (!this.intentOnchainInput)
      return Lt.ZERO;
    const n = {
      amount: Number(t.amount)
    };
    return new Lt(this.intentOnchainInput.program(n));
  }
  /**
   * Evaluates the fee for a given vtxo output
   * @param output - The output to evaluate
   * @returns The fee amount for this output
   */
  evalOffchainOutput(t) {
    if (!this.intentOffchainOutput)
      return Lt.ZERO;
    const n = jc(t);
    return new Lt(this.intentOffchainOutput.program(n));
  }
  /**
   * Evaluates the fee for a given collaborative exit output
   * @param output - The output to evaluate
   * @returns The fee amount for this output
   */
  evalOnchainOutput(t) {
    if (!this.intentOnchainOutput)
      return Lt.ZERO;
    const n = jc(t);
    return new Lt(this.intentOnchainOutput.program(n));
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
    let s = Lt.ZERO;
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
function iw(e) {
  const t = {
    amount: Number(e.amount),
    inputType: e.type,
    weight: e.weight
  };
  return e.expiry && (t.expiry = Math.floor(e.expiry.getTime() / 1e3)), e.birth && (t.birth = Math.floor(e.birth.getTime() / 1e3)), t;
}
function jc(e) {
  return {
    amount: Number(e.amount),
    script: e.script
  };
}
function Pr(e, t) {
  const n = t.parse(e), r = n.check();
  if (!r.valid)
    throw new Error(`type check failed: ${r.error?.message ?? "unknown error"}`);
  if (r.type !== "double")
    throw new Error(`expected return type double, got ${r.type}`);
  return { program: n, text: e };
}
const Zn = {
  commitmentTxid: "",
  boardingTxid: "",
  arkTxid: ""
};
function sw(e, t, n) {
  const r = [...e].sort((c, u) => c.createdAt.getTime() - u.createdAt.getTime()), i = [];
  let s = [];
  for (const c of r)
    if (c.status.isLeaf ? !n.has(c.virtualStatus.commitmentTxIds[0]) && r.filter((u) => u.settledBy === c.virtualStatus.commitmentTxIds[0]).length === 0 && s.push({
      key: {
        ...Zn,
        commitmentTxid: c.virtualStatus.commitmentTxIds[0]
      },
      tag: "batch",
      type: we.TxReceived,
      amount: c.value,
      settled: c.status.isLeaf || c.isSpent,
      createdAt: c.createdAt.getTime()
    }) : r.filter((u) => u.arkTxId === c.txid).length === 0 && s.push({
      key: { ...Zn, arkTxid: c.txid },
      tag: "offchain",
      type: we.TxReceived,
      amount: c.value,
      settled: c.status.isLeaf || c.isSpent,
      createdAt: c.createdAt.getTime()
    }), c.isSpent) {
      if (c.arkTxId && !i.some((u) => u.key.arkTxid === c.arkTxId)) {
        const u = r.filter((h) => h.txid === c.arkTxId);
        let l = 0, f = 0;
        if (u.length > 0) {
          const h = u.reduce((d, g) => d + g.value, 0);
          l = r.filter((d) => d.arkTxId === c.arkTxId).reduce((d, g) => d + g.value, 0) - h, f = u[0].createdAt.getTime();
        } else
          l = c.value, f = c.createdAt.getTime() + 1;
        i.push({
          key: { ...Zn, arkTxid: c.arkTxId },
          tag: "offchain",
          type: we.TxSent,
          amount: l,
          settled: !0,
          createdAt: f
        });
      }
      if (c.settledBy && !n.has(c.settledBy) && !i.some((u) => u.key.commitmentTxid === c.settledBy)) {
        const u = r.filter((h) => h.status.isLeaf && h.virtualStatus.commitmentTxIds?.every((p) => c.settledBy === p)), f = r.filter((h) => h.settledBy === c.settledBy).reduce((h, p) => h + p.value, 0);
        if (u.length > 0) {
          const h = u.reduce((p, y) => p + y.value, 0);
          f > h && i.push({
            key: { ...Zn, commitmentTxid: c.settledBy },
            tag: "exit",
            type: we.TxSent,
            amount: f - h,
            settled: !0,
            createdAt: u[0].createdAt.getTime()
          });
        } else
          i.push({
            key: { ...Zn, commitmentTxid: c.settledBy },
            tag: "exit",
            type: we.TxSent,
            amount: f,
            settled: !0,
            // TODO: fetch commitment tx with /v1/indexer/commitmentTx/<commitmentTxid> to know when the tx was made
            createdAt: c.createdAt.getTime() + 1
          });
      }
    }
  return [...t.map((c) => ({ ...c, tag: "boarding" })), ...i, ...s].sort((c, u) => u.createdAt - c.createdAt);
}
var uo;
(function(e) {
  class t extends At {
    constructor(r) {
      const i = new hr.Script(r), { delegatePubKey: s, pubKey: o, serverPubKey: a } = r, c = Mt.encode({
        pubkeys: [o, s, a]
      }).script;
      super([...i.scripts, c]), this.options = r, this.defaultVtxo = i, this.delegateScript = O.encode(c);
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
})(uo || (uo = {}));
class ow {
  constructor(t, n, r) {
    this.delegatorProvider = t, this.arkInfoProvider = n, this.identity = r;
  }
  async delegate(t, n, r) {
    if (t.length === 0)
      return;
    const i = Te.decode(n).pkScript;
    if (r)
      return vs(this.identity, this.delegatorProvider, this.arkInfoProvider, t, i, r);
    const s = /* @__PURE__ */ new Map();
    let o = [];
    for (const l of t) {
      if (Gi(l)) {
        o.push(l);
        continue;
      }
      const f = l.virtualStatus.batchExpiry;
      if (!f)
        continue;
      const h = uw(f);
      s.set(h, [
        ...s.get(h) ?? [],
        l
      ]);
    }
    if (s.size === 0)
      return vs(this.identity, this.delegatorProvider, this.arkInfoProvider, o, i, r);
    const a = Array.from(s.entries());
    let c = a[0][0];
    for (const [l] of a)
      c = Math.min(c, l);
    s.set(c, [
      ...s.get(c) ?? [],
      ...o
    ]);
    const u = await Promise.allSettled(Array.from(s.entries()).map(async ([, l]) => vs(this.identity, this.delegatorProvider, this.arkInfoProvider, l, i)));
    for (const l of u)
      l.status === "rejected" && console.error("delegate error", l.reason);
  }
}
async function vs(e, t, n, r, i, s) {
  if (r.length === 0)
    throw new Error("unable to delegate: no vtxos provided");
  if (!t)
    throw new Error("unable to delegate: delegator provider not configured");
  if (!s) {
    const R = r.filter((V) => V.virtualStatus.batchExpiry).reduce((V, x) => Math.min(V, x.virtualStatus.batchExpiry), Number.MAX_SAFE_INTEGER);
    R === Number.MAX_SAFE_INTEGER ? s = new Date(Date.now() + 720 * 60 * 1e3) : s = new Date((R - 720 * 60) * 1e3);
  }
  const { fees: o, dust: a, forfeitAddress: c, network: u } = await n.getInfo(), l = s.getTime() / 1e3, f = new Bf({
    ...o.intentFee,
    // replace now() function with the delegateAt timestamp
    offchainInput: o.intentFee.offchainInput?.replace("now()", `double(${l})`),
    offchainOutput: o.intentFee.offchainOutput?.replace("now()", `double(${l})`)
  });
  let h = 0n;
  for (const R of r) {
    const V = f.evalOffchainInput({
      amount: BigInt(R.value),
      type: "vtxo",
      weight: 0,
      birth: R.createdAt,
      expiry: R.virtualStatus.batchExpiry ? new Date(R.virtualStatus.batchExpiry * 1e3) : void 0
    });
    V.value >= R.value || (h += BigInt(R.value) - BigInt(V.value));
  }
  const { delegatorAddress: p, pubkey: y, fee: d } = await t.getDelegateInfo(), g = [];
  d !== "0" && g.push({
    script: Te.decode(p).pkScript,
    amount: BigInt(Number(d)) * BigInt(r.length)
  });
  const m = g.reduce((R, V) => !V.amount || !V.script ? R : R + f.evalOffchainOutput({
    amount: V.amount,
    script: O.encode(V.script)
  }).satoshis, 0);
  if (h - BigInt(m) <= a)
    throw new Error("Amount is below dust limit, cannot delegate");
  h -= BigInt(m), g.push({
    script: i,
    amount: h
  });
  const S = await cw(e, r, g, [], [y], l), I = lt.encode(Fe(gf(u)).decode(c)), L = await Promise.all(r.map(async (R) => {
    const V = await aw(R, a, y, I, e);
    return ft.encode(V.toPSBT());
  }));
  await t.delegate(S, L);
}
async function aw(e, t, n, r, i) {
  n.length === 66 && (n = n.slice(2));
  const o = At.decode(e.tapTree).leaves.find((c) => {
    const u = Qo(xn(c));
    return !(!Mt.is(u) || !u.params.pubkeys.map(O.encode).includes(n));
  });
  if (!o)
    throw new Error(`delegate tap leaf not found for input: ${e.txid}:${e.vout}`);
  const a = yf([
    {
      txid: e.txid,
      index: e.vout,
      witnessUtxo: {
        amount: BigInt(e.value),
        script: At.decode(e.tapTree).pkScript
      },
      sighashType: Ke.ALL_ANYONECANPAY,
      tapLeafScript: [o]
    }
  ], {
    script: r,
    amount: BigInt(e.value) + t
  });
  return i.sign(a);
}
async function cw(e, t, n, r, i, s) {
  const o = {
    type: "register",
    onchain_output_indexes: r,
    valid_at: Math.floor(s),
    expire_at: 0,
    cosigners_public_keys: i
  }, a = oe.create(o, t, n), c = await e.sign(a);
  return {
    proof: ft.encode(c.toPSBT()),
    message: o
  };
}
function uw(e) {
  const t = new Date(e * 1e3);
  return t.setUTCHours(0, 0, 0, 0), t.getTime();
}
function lw(e) {
  return typeof e == "object" && e !== null && "toReadonly" in e && typeof e.toReadonly == "function";
}
class an {
  constructor(t, n, r, i, s, o, a, c, u, l, f) {
    this.identity = t, this.network = n, this.onchainProvider = r, this.indexerProvider = i, this.arkServerPublicKey = s, this.offchainTapscript = o, this.boardingTapscript = a, this.dustAmount = c, this.walletRepository = u, this.contractRepository = l, this.delegatorProvider = f;
  }
  /**
   * Protected helper to set up shared wallet configuration.
   * Extracts common logic used by both ReadonlyWallet.create() and Wallet.create().
   */
  static async setupWalletConfig(t, n) {
    const r = t.arkProvider || (() => {
      if (!t.arkServerUrl)
        throw new Error("Either arkProvider or arkServerUrl must be provided");
      return new hf(t.arkServerUrl);
    })(), i = t.arkServerUrl || r.serverUrl;
    if (!i)
      throw new Error("Could not determine arkServerUrl from provider");
    const s = t.indexerUrl || i, o = t.indexerProvider || new mf(s), a = await r.getInfo(), c = gf(a.network), u = t.esploraUrl || Rg[a.network], l = t.onchainProvider || new Ug(u);
    if (t.exitTimelock) {
      const { value: R, type: V } = t.exitTimelock;
      if (R < 512n && V !== "blocks" || R >= 512n && V !== "seconds")
        throw new Error("invalid exitTimelock");
    }
    const f = t.exitTimelock ?? {
      value: a.unilateralExitDelay,
      type: a.unilateralExitDelay < 512n ? "blocks" : "seconds"
    };
    if (t.boardingTimelock) {
      const { value: R, type: V } = t.boardingTimelock;
      if (R < 512n && V !== "blocks" || R >= 512n && V !== "seconds")
        throw new Error("invalid boardingTimelock");
    }
    const h = t.boardingTimelock ?? {
      value: a.boardingExitDelay,
      type: a.boardingExitDelay < 512n ? "blocks" : "seconds"
    }, p = O.decode(a.signerPubkey).slice(1), y = t.delegatorProvider ? await t.delegatorProvider.getDelegateInfo().then((R) => O.decode(R.pubkey).slice(1)) : void 0, d = {
      pubKey: n,
      serverPubKey: p,
      csvTimelock: f
    }, g = y ? new uo.Script({ ...d, delegatePubKey: y }) : new hr.Script(d), m = new hr.Script({
      ...d,
      csvTimelock: h
    }), S = t.storage || new iy(), I = new ao(S), L = new ay(S);
    return {
      arkProvider: r,
      indexerProvider: o,
      onchainProvider: l,
      network: c,
      networkName: a.network,
      serverPubKey: p,
      offchainTapscript: g,
      boardingTapscript: m,
      dustAmount: a.dust,
      walletRepository: I,
      contractRepository: L,
      info: a,
      delegatorProvider: t.delegatorProvider
    };
  }
  static async create(t) {
    const n = await t.identity.xOnlyPublicKey();
    if (!n)
      throw new Error("Invalid configured public key");
    const r = await an.setupWalletConfig(t, n);
    return new an(t.identity, r.network, r.onchainProvider, r.indexerProvider, r.serverPubKey, r.offchainTapscript, r.boardingTapscript, r.dustAmount, r.walletRepository, r.contractRepository, r.delegatorProvider);
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
    s = n.filter((l) => l.virtualStatus.state === "settled").reduce((l, f) => l + f.value, 0), o = n.filter((l) => l.virtualStatus.state === "preconfirmed").reduce((l, f) => l + f.value, 0), a = n.filter((l) => xe(l) && l.virtualStatus.state === "swept").reduce((l, f) => l + f.value, 0);
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
    const n = await this.getAddress(), i = (await this.getVirtualCoins(t)).map((s) => _e(this, s));
    return await this.walletRepository.saveVtxos(n, i), i;
  }
  async getVirtualCoins(t = { withRecoverable: !0, withUnrolled: !1 }) {
    const n = [O.encode(this.offchainTapscript.pkScript)], i = (await this.indexerProvider.getVtxos({ scripts: n })).vtxos;
    let s = i.filter(xe);
    if (t.withRecoverable || (s = s.filter((o) => !Gi(o) && !lf(o))), t.withUnrolled) {
      const o = i.filter((a) => !xe(a));
      s.push(...o.filter((a) => a.isUnrolled));
    }
    return s;
  }
  async getTransactionHistory() {
    const t = await this.indexerProvider.getVtxos({
      scripts: [O.encode(this.offchainTapscript.pkScript)]
    }), { boardingTxs: n, commitmentsToIgnore: r } = await this.getBoardingTxs();
    return sw(t.vtxos, n, r);
  }
  async getBoardingTxs() {
    const t = [], n = /* @__PURE__ */ new Set(), r = await this.getBoardingAddress(), i = await this.onchainProvider.getTransactions(r);
    for (const a of i)
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
    const s = [], o = [];
    for (const a of t) {
      const c = {
        key: {
          boardingTxid: a.txid,
          commitmentTxid: "",
          arkTxid: ""
        },
        amount: a.value,
        type: we.TxReceived,
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
    const t = await this.getBoardingAddress(), r = (await this.onchainProvider.getCoins(t)).map((i) => co(this, i));
    return await this.walletRepository.saveUtxos(t, r), r;
  }
  async notifyIncomingFunds(t) {
    const n = await this.getAddress(), r = await this.getBoardingAddress();
    let i, s;
    if (this.onchainProvider && r) {
      const a = (c) => c.vout.findIndex((u) => u.scriptpubkey_address === r);
      i = await this.onchainProvider.watchAddresses([r], (c) => {
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
        O.encode(a.pkScript)
      ]), u = new AbortController(), l = this.indexerProvider.getSubscription(c, u.signal);
      s = async () => {
        u.abort(), await this.indexerProvider?.unsubscribeForScripts(c);
      }, (async () => {
        try {
          for await (const f of l)
            (f.newVtxos?.length > 0 || f.spentVtxos?.length > 0) && t({
              type: "vtxo",
              newVtxos: f.newVtxos.map((h) => _e(this, h)),
              spentVtxos: f.spentVtxos.map((h) => _e(this, h))
            });
        } catch (f) {
          console.error("Subscription error:", f);
        }
      })();
    }
    return () => {
      i?.(), s?.();
    };
  }
  async fetchPendingTxs() {
    const t = [O.encode(this.offchainTapscript.pkScript)];
    let { vtxos: n } = await this.indexerProvider.getVtxos({
      scripts: t
    });
    return n.filter((r) => r.virtualStatus.state !== "swept" && r.virtualStatus.state !== "settled" && r.arkTxId !== void 0).map((r) => r.arkTxId);
  }
}
class _n extends an {
  constructor(t, n, r, i, s, o, a, c, u, l, f, h, p, y, d, g, m) {
    super(t, n, i, o, a, c, u, p, y, d, m), this.networkName = r, this.arkProvider = s, this.serverUnrollScript = l, this.forfeitOutputScript = f, this.forfeitPubkey = h, this.identity = t, this.renewalConfig = {
      enabled: g?.enabled ?? !1,
      ...ty,
      ...g
    }, this.delegatorManager = m ? new ow(m, s, t) : void 0;
  }
  static async create(t) {
    const n = await t.identity.xOnlyPublicKey();
    if (!n)
      throw new Error("Invalid configured public key");
    const r = await an.setupWalletConfig(t, n);
    let i;
    try {
      const c = O.decode(r.info.checkpointTapscript);
      i = Dt.decode(c);
    } catch {
      throw new Error("Invalid checkpointTapscript from server");
    }
    const s = O.decode(r.info.forfeitPubkey).slice(1), o = Fe(r.network).decode(r.info.forfeitAddress), a = lt.encode(o);
    return new _n(t.identity, r.network, r.networkName, r.onchainProvider, r.arkProvider, r.indexerProvider, r.serverPubKey, r.offchainTapscript, r.boardingTapscript, i, a, s, r.dustAmount, r.walletRepository, r.contractRepository, t.renewalConfig, t.delegatorProvider);
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
    const t = lw(this.identity) ? await this.identity.toReadonly() : this.identity;
    return new an(t, this.network, this.onchainProvider, this.indexerProvider, this.arkServerPublicKey, this.offchainTapscript, this.boardingTapscript, this.dustAmount, this.walletRepository, this.contractRepository);
  }
  async sendBitcoin(t) {
    if (t.amount <= 0)
      throw new Error("Amount must be positive");
    if (!fw(t.address))
      throw new Error("Invalid Ark address " + t.address);
    const n = await this.getVirtualCoins({
      withRecoverable: !1
    });
    let r;
    if (t.selectedVtxos) {
      const y = t.selectedVtxos.map((g) => g.value).reduce((g, m) => g + m, 0);
      if (y < t.amount)
        throw new Error("Selected VTXOs do not cover specified amount");
      const d = y - t.amount;
      r = {
        inputs: t.selectedVtxos,
        changeAmount: BigInt(d)
      };
    } else
      r = dw(n, t.amount);
    const i = this.offchainTapscript.forfeit();
    if (!i)
      throw new Error("Selected leaf not found");
    const s = Te.decode(t.address), a = [
      {
        script: BigInt(t.amount) < this.dustAmount ? s.subdustPkScript : s.pkScript,
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
    const c = this.offchainTapscript.encode(), u = Yg(r.inputs.map((y) => ({
      ...y,
      tapLeafScript: i,
      tapTree: c
    })), a, this.serverUnrollScript), l = await this.identity.sign(u.arkTx), { arkTxid: f, signedCheckpointTxs: h } = await this.arkProvider.submitTx(ft.encode(l.toPSBT()), u.checkpoints.map((y) => ft.encode(y.toPSBT()))), p = await Promise.all(h.map(async (y) => {
      const d = Yt.fromPSBT(ft.decode(y)), g = await this.identity.sign(d);
      return ft.encode(g.toPSBT());
    }));
    await this.arkProvider.finalizeTx(f, p);
    try {
      const y = [], d = /* @__PURE__ */ new Set();
      let g = Number.MAX_SAFE_INTEGER;
      for (const [I, L] of r.inputs.entries()) {
        const R = _e(this, L), V = h[I], x = Yt.fromPSBT(ft.decode(V));
        if (y.push({
          ...R,
          virtualStatus: { ...R.virtualStatus, state: "spent" },
          spentBy: x.id,
          arkTxId: f,
          isSpent: !0
        }), R.virtualStatus.commitmentTxIds)
          for (const Q of R.virtualStatus.commitmentTxIds)
            d.add(Q);
        R.virtualStatus.batchExpiry && (g = Math.min(g, R.virtualStatus.batchExpiry));
      }
      const m = Date.now(), S = this.arkAddress.encode();
      if (r.changeAmount > 0n && g !== Number.MAX_SAFE_INTEGER) {
        const I = {
          txid: f,
          vout: a.length - 1,
          createdAt: new Date(m),
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
        await this.walletRepository.saveVtxos(S, [I]);
      }
      await this.walletRepository.saveVtxos(S, y), await this.walletRepository.saveTransactions(S, [
        {
          key: {
            boardingTxid: "",
            commitmentTxid: "",
            arkTxid: f
          },
          amount: t.amount,
          type: we.TxSent,
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
            pt.fromString(y);
          } catch {
            throw new Error(`Invalid arknote "${y}"`);
          }
    }
    if (!t) {
      const { fees: y } = await this.arkProvider.getInfo(), d = new Bf(y.intentFee);
      let g = 0;
      const S = Dt.decode(O.decode(this.boardingTapscript.exitScript)).params.timelock, I = (await this.getBoardingUtxos()).filter((J) => !Qg(J, S)), L = [];
      for (const J of I) {
        const at = d.evalOnchainInput({
          amount: BigInt(J.value)
        });
        at.value >= J.value || (L.push(J), g += J.value - at.satoshis);
      }
      const R = await this.getVtxos({ withRecoverable: !0 }), V = [];
      for (const J of R) {
        const at = d.evalOffchainInput({
          amount: BigInt(J.value),
          type: J.virtualStatus.state === "swept" ? "recoverable" : "vtxo",
          weight: 0,
          birth: J.createdAt,
          expiry: J.virtualStatus.batchExpiry ? new Date(J.virtualStatus.batchExpiry * 1e3) : /* @__PURE__ */ new Date()
        });
        at.value >= J.value || (V.push(J), g += J.value - at.satoshis);
      }
      const x = [...L, ...V];
      if (x.length === 0)
        throw new Error("No inputs found");
      const Q = {
        address: await this.getAddress(),
        amount: BigInt(g)
      }, C = d.evalOffchainOutput({
        amount: Q.amount,
        script: O.encode(Te.decode(Q.address).pkScript)
      });
      if (Q.amount -= BigInt(C.satoshis), Q.amount <= this.dustAmount)
        throw new Error("Output amount is below dust limit");
      t = {
        inputs: x,
        outputs: [Q]
      };
    }
    const r = [], i = [];
    let s = !1;
    for (const [y, d] of t.outputs.entries()) {
      let g;
      try {
        g = Te.decode(d.address).pkScript, s = !0;
      } catch {
        const m = Fe(this.network).decode(d.address);
        g = lt.encode(m), r.push(y);
      }
      i.push({
        amount: d.amount,
        script: g
      });
    }
    let o;
    const a = [];
    s && (o = this.identity.signerSession(), a.push(O.encode(await o.getPublicKey())));
    const [c, u] = await Promise.all([
      this.makeRegisterIntentSignature(t.inputs, i, r, a),
      this.makeDeleteIntentSignature(t.inputs)
    ]), l = await this.safeRegisterIntent(c), f = [
      ...a,
      ...t.inputs.map((y) => `${y.txid}:${y.vout}`)
    ], h = this.createBatchHandler(l, t.inputs, o), p = new AbortController();
    try {
      const y = this.arkProvider.getEventStream(p.signal, f);
      return await so.join(y, h, {
        abortController: p,
        skipVtxoTreeSigning: !s,
        eventCallback: n ? (d) => Promise.resolve(n(d)) : void 0
      });
    } catch (y) {
      throw await this.arkProvider.deleteIntent(u).catch(() => {
      }), y;
    } finally {
      p.abort();
    }
  }
  async handleSettlementFinalizationEvent(t, n, r, i) {
    const s = [], o = await this.getVirtualCoins();
    let a = Yt.fromPSBT(ft.decode(t.commitmentTx)), c = !1, u = 0;
    const l = i?.leaves() || [];
    for (const f of n) {
      const h = o.find((I) => I.txid === f.txid && I.vout === f.vout);
      if (!h) {
        for (let I = 0; I < a.inputsLength; I++) {
          const L = a.getInput(I);
          if (!L.txid || L.index === void 0)
            throw new Error("The server returned incomplete data. No settlement input found in the PSBT");
          if (O.encode(L.txid) === f.txid && L.index === f.vout) {
            a.updateInput(I, {
              tapLeafScript: [f.forfeitTapLeafScript]
            }), a = await this.identity.sign(a, [
              I
            ]), c = !0;
            break;
          }
        }
        continue;
      }
      if (Gi(h) || ff(h, this.dustAmount))
        continue;
      if (l.length === 0)
        throw new Error("connectors not received");
      if (u >= l.length)
        throw new Error("not enough connectors received");
      const p = l[u], y = p.id, d = p.getOutput(0);
      if (!d)
        throw new Error("connector output not found");
      const g = d.amount, m = d.script;
      if (!g || !m)
        throw new Error("invalid connector output");
      u++;
      let S = Dg([
        {
          txid: f.txid,
          index: f.vout,
          witnessUtxo: {
            amount: BigInt(h.value),
            script: At.decode(f.tapTree).pkScript
          },
          sighashType: Ke.DEFAULT,
          tapLeafScript: [f.forfeitTapLeafScript]
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
      S = await this.identity.sign(S, [0]), s.push(ft.encode(S.toPSBT()));
    }
    (s.length > 0 || c) && await this.arkProvider.submitSignedForfeitTxs(s, c ? ft.encode(a.toPSBT()) : void 0);
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
        const o = new TextEncoder().encode(t), a = xt(o), c = O.encode(a);
        let u = !0;
        for (const f of s.intentIdHashes)
          if (f === c) {
            if (!this.arkProvider)
              throw new Error("Ark provider not configured");
            await this.arkProvider.confirmRegistration(t), u = !1;
          }
        if (u)
          return { skip: u };
        const l = Dt.encode({
          timelock: {
            value: s.batchExpiry,
            type: s.batchExpiry >= 512n ? "seconds" : "blocks"
          },
          pubkeys: [this.forfeitPubkey]
        }).script;
        return i = Jn(l), { skip: !1 };
      },
      onTreeSigningStarted: async (s, o) => {
        if (!r)
          return { skip: !0 };
        if (!i)
          throw new Error("Sweep tap tree root not set");
        const a = s.cosignersPublicKeys.map((y) => y.slice(2)), u = (await r.getPublicKey()).subarray(1);
        if (!a.includes(O.encode(u)))
          return { skip: !0 };
        const l = Yt.fromPSBT(ft.decode(s.unsignedCommitmentTx));
        qg(o, l, i);
        const f = l.getOutput(0);
        if (!f?.amount)
          throw new Error("Shared output not found");
        await r.init(o, i, f.amount);
        const h = O.encode(await r.getPublicKey()), p = await r.getNonces();
        return await this.arkProvider.submitTreeNonces(s.id, h, p), { skip: !1 };
      },
      onTreeNonces: async (s) => {
        if (!r)
          return { fullySigned: !0 };
        const { hasAllNonces: o } = await r.aggregatedNonces(s.txid, s.nonces);
        if (!o)
          return { fullySigned: !1 };
        const a = await r.sign(), c = O.encode(await r.getPublicKey());
        return await this.arkProvider.submitTreeSignatures(s.id, c, a), { fullySigned: !0 };
      },
      onBatchFinalization: async (s, o, a) => {
        if (!this.forfeitOutputScript)
          throw new Error("Forfeit output script not set");
        a && Gg(s.commitmentTx, a), await this.handleSettlementFinalizationEvent(s, n, this.forfeitOutputScript, a);
      }
    };
  }
  async safeRegisterIntent(t) {
    try {
      return await this.arkProvider.registerIntent(t);
    } catch (n) {
      if (n instanceof df && n.code === 0 && n.message.includes("duplicated input")) {
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
    }, a = oe.create(o, t, n), c = await this.identity.sign(a);
    return {
      proof: ft.encode(c.toPSBT()),
      message: o
    };
  }
  async makeDeleteIntentSignature(t) {
    const n = {
      type: "delete",
      expire_at: 0
    }, r = oe.create(n, t, []), i = await this.identity.sign(r);
    return {
      proof: ft.encode(i.toPSBT()),
      message: n
    };
  }
  async makeGetPendingTxIntentSignature(t) {
    const n = {
      type: "get-pending-tx",
      expire_at: 0
    }, r = oe.create(n, t, []), i = await this.identity.sign(r);
    return {
      proof: ft.encode(i.toPSBT()),
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
      const s = [O.encode(this.offchainTapscript.pkScript)];
      let { vtxos: o } = await this.indexerProvider.getVtxos({
        scripts: s
      });
      if (o = o.filter((a) => a.virtualStatus.state !== "swept" && a.virtualStatus.state !== "settled"), o.length === 0)
        return { finalized: [], pending: [] };
      t = o.map((a) => _e(this, a));
    }
    const r = [], i = [];
    for (let s = 0; s < t.length; s += 20) {
      const o = t.slice(s, s + 20), a = await this.makeGetPendingTxIntentSignature(o), c = await this.arkProvider.getPendingTxs(a);
      for (const u of c) {
        i.push(u.arkTxid);
        try {
          const l = await Promise.all(u.signedCheckpointTxs.map(async (f) => {
            const h = Yt.fromPSBT(ft.decode(f)), p = await this.identity.sign(h);
            return ft.encode(p.toPSBT());
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
_n.MIN_FEE_RATE = 1;
function fw(e) {
  try {
    return Te.decode(e), !0;
  } catch {
    return !1;
  }
}
function dw(e, t) {
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
function Wc() {
  const e = crypto.getRandomValues(new Uint8Array(16));
  return O.encode(e);
}
var M;
(function(e) {
  e.walletInitialized = (w) => ({
    type: "WALLET_INITIALIZED",
    success: !0,
    id: w
  });
  function t(w, T) {
    return {
      type: "ERROR",
      success: !1,
      message: T,
      id: w
    };
  }
  e.error = t;
  function n(w, T) {
    return {
      type: "SETTLE_EVENT",
      success: !0,
      event: T,
      id: w
    };
  }
  e.settleEvent = n;
  function r(w, T) {
    return {
      type: "SETTLE_SUCCESS",
      success: !0,
      txid: T,
      id: w
    };
  }
  e.settleSuccess = r;
  function i(w) {
    return w.type === "SETTLE_SUCCESS" && w.success;
  }
  e.isSettleSuccess = i;
  function s(w) {
    return w.type === "ADDRESS" && w.success === !0;
  }
  e.isAddress = s;
  function o(w) {
    return w.type === "BOARDING_ADDRESS" && w.success === !0;
  }
  e.isBoardingAddress = o;
  function a(w, T) {
    return {
      type: "ADDRESS",
      success: !0,
      address: T,
      id: w
    };
  }
  e.address = a;
  function c(w, T) {
    return {
      type: "BOARDING_ADDRESS",
      success: !0,
      address: T,
      id: w
    };
  }
  e.boardingAddress = c;
  function u(w) {
    return w.type === "BALANCE" && w.success === !0;
  }
  e.isBalance = u;
  function l(w, T) {
    return {
      type: "BALANCE",
      success: !0,
      balance: T,
      id: w
    };
  }
  e.balance = l;
  function f(w) {
    return w.type === "VTXOS" && w.success === !0;
  }
  e.isVtxos = f;
  function h(w, T) {
    return {
      type: "VTXOS",
      success: !0,
      vtxos: T,
      id: w
    };
  }
  e.vtxos = h;
  function p(w) {
    return w.type === "VIRTUAL_COINS" && w.success === !0;
  }
  e.isVirtualCoins = p;
  function y(w, T) {
    return {
      type: "VIRTUAL_COINS",
      success: !0,
      virtualCoins: T,
      id: w
    };
  }
  e.virtualCoins = y;
  function d(w) {
    return w.type === "BOARDING_UTXOS" && w.success === !0;
  }
  e.isBoardingUtxos = d;
  function g(w, T) {
    return {
      type: "BOARDING_UTXOS",
      success: !0,
      boardingUtxos: T,
      id: w
    };
  }
  e.boardingUtxos = g;
  function m(w) {
    return w.type === "SEND_BITCOIN_SUCCESS" && w.success === !0;
  }
  e.isSendBitcoinSuccess = m;
  function S(w, T) {
    return {
      type: "SEND_BITCOIN_SUCCESS",
      success: !0,
      txid: T,
      id: w
    };
  }
  e.sendBitcoinSuccess = S;
  function I(w) {
    return w.type === "TRANSACTION_HISTORY" && w.success === !0;
  }
  e.isTransactionHistory = I;
  function L(w, T) {
    return {
      type: "TRANSACTION_HISTORY",
      success: !0,
      transactions: T,
      id: w
    };
  }
  e.transactionHistory = L;
  function R(w) {
    return w.type === "WALLET_STATUS" && w.success === !0;
  }
  e.isWalletStatus = R;
  function V(w, T, A) {
    return {
      type: "WALLET_STATUS",
      success: !0,
      status: {
        walletInitialized: T,
        xOnlyPublicKey: A
      },
      id: w
    };
  }
  e.walletStatus = V;
  function x(w) {
    return w.type === "CLEAR_RESPONSE";
  }
  e.isClearResponse = x;
  function Q(w, T) {
    return {
      type: "CLEAR_RESPONSE",
      success: T,
      id: w
    };
  }
  e.clearResponse = Q;
  function C(w) {
    return w.type === "WALLET_RELOADED";
  }
  e.isWalletReloaded = C;
  function J(w, T) {
    return {
      type: "WALLET_RELOADED",
      success: T,
      id: w
    };
  }
  e.walletReloaded = J;
  function at(w) {
    return w.type === "VTXO_UPDATE";
  }
  e.isVtxoUpdate = at;
  function _(w, T) {
    return {
      type: "VTXO_UPDATE",
      id: Wc(),
      // spontaneous update, not tied to a request
      success: !0,
      spentVtxos: T,
      newVtxos: w
    };
  }
  e.vtxoUpdate = _;
  function E(w) {
    return w.type === "UTXO_UPDATE";
  }
  e.isUtxoUpdate = E;
  function b(w) {
    return {
      type: "UTXO_UPDATE",
      id: Wc(),
      // spontaneous update, not tied to a request
      success: !0,
      coins: w
    };
  }
  e.utxoUpdate = b;
})(M || (M = {}));
class hw {
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
const pw = "arkade-service-worker";
class nt {
  constructor(t, n, r, i, s, o) {
    this.hasWitness = t, this.inputCount = n, this.outputCount = r, this.inputSize = i, this.inputWitnessSize = s, this.outputSize = o;
  }
  static create() {
    return new nt(!1, 0, 0, 0, 0, 0);
  }
  addP2AInput() {
    return this.inputCount++, this.inputSize += nt.INPUT_SIZE, this;
  }
  addKeySpendInput(t = !0) {
    return this.inputCount++, this.inputWitnessSize += 65 + (t ? 0 : 1), this.inputSize += nt.INPUT_SIZE, this.hasWitness = !0, this;
  }
  addP2PKHInput() {
    return this.inputCount++, this.inputWitnessSize++, this.inputSize += nt.INPUT_SIZE + nt.P2PKH_SCRIPT_SIG_SIZE, this;
  }
  addTapscriptInput(t, n, r) {
    const i = 1 + nt.BASE_CONTROL_BLOCK_SIZE + 1 + n + 1 + r;
    return this.inputCount++, this.inputWitnessSize += t + i, this.inputSize += nt.INPUT_SIZE, this.hasWitness = !0, this.inputCount++, this;
  }
  addP2WKHOutput() {
    return this.outputCount++, this.outputSize += nt.OUTPUT_SIZE + nt.P2WKH_OUTPUT_SIZE, this;
  }
  addP2TROutput() {
    return this.outputCount++, this.outputSize += nt.OUTPUT_SIZE + nt.P2TR_OUTPUT_SIZE, this;
  }
  vsize() {
    const t = (o) => o < 253 ? 1 : o < 65535 ? 3 : o < 4294967295 ? 5 : 9, n = t(this.inputCount), r = t(this.outputCount);
    let s = (nt.BASE_TX_SIZE + n + this.inputSize + r + this.outputSize) * nt.WITNESS_SCALE_FACTOR;
    return this.hasWitness && (s += nt.WITNESS_HEADER_SIZE + this.inputWitnessSize), gw(s);
  }
}
nt.P2PKH_SCRIPT_SIG_SIZE = 108;
nt.INPUT_SIZE = 41;
nt.BASE_CONTROL_BLOCK_SIZE = 33;
nt.OUTPUT_SIZE = 9;
nt.P2WKH_OUTPUT_SIZE = 22;
nt.BASE_TX_SIZE = 10;
nt.WITNESS_HEADER_SIZE = 2;
nt.WITNESS_SCALE_FACTOR = 4;
nt.P2TR_OUTPUT_SIZE = 34;
const gw = (e) => {
  const t = BigInt(Math.ceil(e / nt.WITNESS_SCALE_FACTOR));
  return {
    value: t,
    fee: (n) => n * t
  };
};
var Tt;
(function(e) {
  function t(d) {
    return typeof d == "object" && d !== null && "type" in d;
  }
  e.isBase = t;
  function n(d) {
    return d.type === "INIT_WALLET" && "arkServerUrl" in d && typeof d.arkServerUrl == "string" && ("arkServerPublicKey" in d ? d.arkServerPublicKey === void 0 || typeof d.arkServerPublicKey == "string" : !0);
  }
  e.isInitWallet = n;
  function r(d) {
    return d.type === "SETTLE";
  }
  e.isSettle = r;
  function i(d) {
    return d.type === "GET_ADDRESS";
  }
  e.isGetAddress = i;
  function s(d) {
    return d.type === "GET_BOARDING_ADDRESS";
  }
  e.isGetBoardingAddress = s;
  function o(d) {
    return d.type === "GET_BALANCE";
  }
  e.isGetBalance = o;
  function a(d) {
    return d.type === "GET_VTXOS";
  }
  e.isGetVtxos = a;
  function c(d) {
    return d.type === "GET_VIRTUAL_COINS";
  }
  e.isGetVirtualCoins = c;
  function u(d) {
    return d.type === "GET_BOARDING_UTXOS";
  }
  e.isGetBoardingUtxos = u;
  function l(d) {
    return d.type === "SEND_BITCOIN" && "params" in d && d.params !== null && typeof d.params == "object" && "address" in d.params && typeof d.params.address == "string" && "amount" in d.params && typeof d.params.amount == "number";
  }
  e.isSendBitcoin = l;
  function f(d) {
    return d.type === "GET_TRANSACTION_HISTORY";
  }
  e.isGetTransactionHistory = f;
  function h(d) {
    return d.type === "GET_STATUS";
  }
  e.isGetStatus = h;
  function p(d) {
    return d.type === "CLEAR";
  }
  e.isClear = p;
  function y(d) {
    return d.type === "RELOAD_WALLET";
  }
  e.isReloadWallet = y;
})(Tt || (Tt = {}));
class yw {
  constructor(t) {
    this.url = t;
  }
  async delegate(t, n) {
    const r = `${this.url}/api/v1/delegate`, i = await fetch(r, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        intent: {
          proof: t.proof,
          message: oe.encodeMessage(t.message)
        },
        forfeits: n
      })
    });
    if (!i.ok) {
      const s = await i.text();
      throw new Error(`Failed to delegate: ${s}`);
    }
  }
  async getDelegateInfo() {
    const t = `${this.url}/api/v1/delegate/info`, n = await fetch(t);
    if (!n.ok) {
      const i = await n.text();
      throw new Error(`Failed to get delegate info: ${i}`);
    }
    const r = await n.json();
    if (!ww(r))
      throw new Error("Invalid delegate info");
    return r;
  }
}
function ww(e) {
  return e && typeof e == "object" && "pubkey" in e && "fee" in e && "delegatorAddress" in e && typeof e.pubkey == "string" && typeof e.fee == "string" && typeof e.delegatorAddress == "string" && e.pubkey !== "" && e.fee !== "" && e.delegatorAddress !== "";
}
class $f {
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
class mw extends $f {
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
    const t = (await this.wallet.getVtxos({ withRecoverable: !0 })).filter(xe);
    if (t.length !== 0)
      return this.wallet.delegatorManager.delegate(t, await this.wallet.getAddress());
  }
}
class bw {
  constructor(t = pw, n = 1, r = () => {
  }) {
    this.dbName = t, this.dbVersion = n, this.messageCallback = r, this.storage = new hw(t, n), this.walletRepository = new ao(this.storage);
  }
  /**
   * Get spendable vtxos for the current wallet address
   */
  async getSpendableVtxos() {
    if (!this.handler)
      return [];
    const t = await this.handler.getAddress();
    return (await this.walletRepository.getVtxos(t)).filter(xe);
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
      spendable: n.filter(xe),
      spent: n.filter((r) => !xe(r))
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
    this.incomingFundsSubscription && this.incomingFundsSubscription(), await this.storage.clear(), this.walletRepository = new ao(this.storage), this.handler = void 0, this.arkProvider = void 0, this.indexerProvider = void 0;
  }
  async reload() {
    await this.onWalletInitialized();
  }
  async onWalletInitialized() {
    if (!this.handler || !this.arkProvider || !this.indexerProvider || !this.handler.offchainTapscript || !this.handler.boardingTapscript)
      return;
    const t = O.encode(this.handler.offchainTapscript.pkScript), r = (await this.indexerProvider.getVtxos({
      scripts: [t]
    })).vtxos.map((c) => _e(this.handler, c));
    try {
      const { pending: c, finalized: u } = await this.handler.handleReload(r);
      console.info(`Recovered ${u.length}/${c.length} pending transactions: ${u.join(", ")}`);
    } catch (c) {
      console.error("Error recovering pending transactions:", c);
    }
    const i = await this.handler.getAddress();
    await this.walletRepository.saveVtxos(i, r);
    const s = await this.handler.getBoardingAddress(), o = await this.handler.onchainProvider.getCoins(s);
    await this.walletRepository.saveUtxos(s, o.map((c) => co(this.handler, c)));
    const a = await this.handler.getTransactionHistory();
    a && await this.walletRepository.saveTransactions(i, a), this.incomingFundsSubscription && this.incomingFundsSubscription(), this.incomingFundsSubscription = await this.handler.notifyIncomingFunds(async (c) => {
      if (c.type === "vtxo") {
        const u = c.newVtxos.length > 0 ? c.newVtxos.map((f) => _e(this.handler, f)) : [], l = c.spentVtxos.length > 0 ? c.spentVtxos.map((f) => _e(this.handler, f)) : [];
        if ([...u, ...l].length === 0)
          return;
        await this.walletRepository.saveVtxos(i, [
          ...u,
          ...l
        ]), await this.sendMessageToAllClients(M.vtxoUpdate(u, l)), await this.handler?.handleDelegate().catch((f) => {
          console.error("Error delegating vtxos:", f);
        });
      }
      if (c.type === "utxo") {
        const u = c.coins.map((f) => co(this.handler, f)), l = await this.handler?.getBoardingAddress();
        await this.walletRepository.clearUtxos(l), await this.walletRepository.saveUtxos(l, u), await this.sendMessageToAllClients(M.utxoUpdate(u));
      }
    });
  }
  async handleClear(t) {
    await this.clear(), Tt.isBase(t.data) && t.source?.postMessage(M.clearResponse(t.data.id, !0));
  }
  async handleInitWallet(t) {
    if (!Tt.isInitWallet(t.data)) {
      console.error("Invalid INIT_WALLET message format", t.data), t.source?.postMessage(M.error(t.data.id, "Invalid INIT_WALLET message format"));
      return;
    }
    const n = t.data, { arkServerPublicKey: r, arkServerUrl: i, delegatorUrl: s } = n;
    this.arkProvider = new hf(i), this.indexerProvider = new mf(i);
    let o;
    s && (o = new yw(s));
    try {
      if ("privateKey" in n.key && typeof n.key.privateKey == "string") {
        const { key: { privateKey: a } } = n, c = nr.fromHex(a), u = await _n.create({
          identity: c,
          arkServerUrl: i,
          arkServerPublicKey: r,
          storage: this.storage,
          // Use unified storage for wallet too
          delegatorProvider: o
        });
        this.handler = new mw(u);
      } else if ("publicKey" in n.key && typeof n.key.publicKey == "string") {
        const { key: { publicKey: a } } = n, c = Wi.fromPublicKey(O.decode(a)), u = await an.create({
          identity: c,
          arkServerUrl: i,
          arkServerPublicKey: r,
          storage: this.storage,
          // Use unified storage for wallet too
          delegatorProvider: o
        });
        this.handler = new $f(u);
      } else {
        const a = "Missing privateKey or publicKey in key object";
        t.source?.postMessage(M.error(n.id, a)), console.error(a);
        return;
      }
    } catch (a) {
      console.error("Error initializing wallet:", a);
      const c = a instanceof Error ? a.message : "Unknown error occurred";
      t.source?.postMessage(M.error(n.id, c));
      return;
    }
    t.source?.postMessage(M.walletInitialized(n.id)), await this.onWalletInitialized();
  }
  async handleSettle(t) {
    const n = t.data;
    if (!Tt.isSettle(n)) {
      console.error("Invalid SETTLE message format", n), t.source?.postMessage(M.error(n.id, "Invalid SETTLE message format"));
      return;
    }
    try {
      if (!this.handler) {
        console.error("Wallet not initialized"), t.source?.postMessage(M.error(n.id, "Wallet not initialized"));
        return;
      }
      const r = await this.handler.handleSettle(n.params, (i) => {
        t.source?.postMessage(M.settleEvent(n.id, i));
      });
      r ? t.source?.postMessage(M.settleSuccess(n.id, r)) : t.source?.postMessage(M.error(n.id, "Operation not supported in readonly mode"));
    } catch (r) {
      console.error("Error settling:", r);
      const i = r instanceof Error ? r.message : "Unknown error occurred";
      t.source?.postMessage(M.error(n.id, i));
    }
  }
  async handleSendBitcoin(t) {
    const n = t.data;
    if (!Tt.isSendBitcoin(n)) {
      console.error("Invalid SEND_BITCOIN message format", n), t.source?.postMessage(M.error(n.id, "Invalid SEND_BITCOIN message format"));
      return;
    }
    if (!this.handler) {
      console.error("Wallet not initialized"), t.source?.postMessage(M.error(n.id, "Wallet not initialized"));
      return;
    }
    try {
      const r = await this.handler.handleSendBitcoin(n.params);
      r ? t.source?.postMessage(M.sendBitcoinSuccess(n.id, r)) : t.source?.postMessage(M.error(n.id, "Operation not supported in readonly mode"));
    } catch (r) {
      console.error("Error sending bitcoin:", r);
      const i = r instanceof Error ? r.message : "Unknown error occurred";
      t.source?.postMessage(M.error(n.id, i));
    }
  }
  async handleGetAddress(t) {
    const n = t.data;
    if (!Tt.isGetAddress(n)) {
      console.error("Invalid GET_ADDRESS message format", n), t.source?.postMessage(M.error(n.id, "Invalid GET_ADDRESS message format"));
      return;
    }
    if (!this.handler) {
      console.error("Wallet not initialized"), t.source?.postMessage(M.error(n.id, "Wallet not initialized"));
      return;
    }
    try {
      const r = await this.handler.getAddress();
      t.source?.postMessage(M.address(n.id, r));
    } catch (r) {
      console.error("Error getting address:", r);
      const i = r instanceof Error ? r.message : "Unknown error occurred";
      t.source?.postMessage(M.error(n.id, i));
    }
  }
  async handleGetBoardingAddress(t) {
    const n = t.data;
    if (!Tt.isGetBoardingAddress(n)) {
      console.error("Invalid GET_BOARDING_ADDRESS message format", n), t.source?.postMessage(M.error(n.id, "Invalid GET_BOARDING_ADDRESS message format"));
      return;
    }
    if (!this.handler) {
      console.error("Wallet not initialized"), t.source?.postMessage(M.error(n.id, "Wallet not initialized"));
      return;
    }
    try {
      const r = await this.handler.getBoardingAddress();
      t.source?.postMessage(M.boardingAddress(n.id, r));
    } catch (r) {
      console.error("Error getting boarding address:", r);
      const i = r instanceof Error ? r.message : "Unknown error occurred";
      t.source?.postMessage(M.error(n.id, i));
    }
  }
  async handleGetBalance(t) {
    const n = t.data;
    if (!Tt.isGetBalance(n)) {
      console.error("Invalid GET_BALANCE message format", n), t.source?.postMessage(M.error(n.id, "Invalid GET_BALANCE message format"));
      return;
    }
    if (!this.handler) {
      console.error("Wallet not initialized"), t.source?.postMessage(M.error(n.id, "Wallet not initialized"));
      return;
    }
    try {
      const [r, i, s] = await Promise.all([
        this.getAllBoardingUtxos(),
        this.getSpendableVtxos(),
        this.getSweptVtxos()
      ]);
      let o = 0, a = 0;
      for (const p of r)
        p.status.confirmed ? o += p.value : a += p.value;
      let c = 0, u = 0, l = 0;
      for (const p of i)
        p.virtualStatus.state === "settled" ? c += p.value : p.virtualStatus.state === "preconfirmed" && (u += p.value);
      for (const p of s)
        xe(p) && (l += p.value);
      const f = o + a, h = c + u + l;
      t.source?.postMessage(M.balance(n.id, {
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
      const i = r instanceof Error ? r.message : "Unknown error occurred";
      t.source?.postMessage(M.error(n.id, i));
    }
  }
  async handleGetVtxos(t) {
    const n = t.data;
    if (!Tt.isGetVtxos(n)) {
      console.error("Invalid GET_VTXOS message format", n), t.source?.postMessage(M.error(n.id, "Invalid GET_VTXOS message format"));
      return;
    }
    if (!this.handler) {
      console.error("Wallet not initialized"), t.source?.postMessage(M.error(n.id, "Wallet not initialized"));
      return;
    }
    try {
      const r = await this.getSpendableVtxos(), i = this.handler.dustAmount, o = n.filter?.withRecoverable ?? !1 ? r : r.filter((a) => !(i != null && ff(a, i) || Gi(a) || lf(a)));
      t.source?.postMessage(M.vtxos(n.id, o));
    } catch (r) {
      console.error("Error getting vtxos:", r);
      const i = r instanceof Error ? r.message : "Unknown error occurred";
      t.source?.postMessage(M.error(n.id, i));
    }
  }
  async handleGetBoardingUtxos(t) {
    const n = t.data;
    if (!Tt.isGetBoardingUtxos(n)) {
      console.error("Invalid GET_BOARDING_UTXOS message format", n), t.source?.postMessage(M.error(n.id, "Invalid GET_BOARDING_UTXOS message format"));
      return;
    }
    if (!this.handler) {
      console.error("Wallet not initialized"), t.source?.postMessage(M.error(n.id, "Wallet not initialized"));
      return;
    }
    try {
      const r = await this.getAllBoardingUtxos();
      t.source?.postMessage(M.boardingUtxos(n.id, r));
    } catch (r) {
      console.error("Error getting boarding utxos:", r);
      const i = r instanceof Error ? r.message : "Unknown error occurred";
      t.source?.postMessage(M.error(n.id, i));
    }
  }
  async handleGetTransactionHistory(t) {
    const n = t.data;
    if (!Tt.isGetTransactionHistory(n)) {
      console.error("Invalid GET_TRANSACTION_HISTORY message format", n), t.source?.postMessage(M.error(n.id, "Invalid GET_TRANSACTION_HISTORY message format"));
      return;
    }
    if (!this.handler) {
      console.error("Wallet not initialized"), t.source?.postMessage(M.error(n.id, "Wallet not initialized"));
      return;
    }
    try {
      const r = await this.handler.getTransactionHistory();
      t.source?.postMessage(M.transactionHistory(n.id, r));
    } catch (r) {
      console.error("Error getting transaction history:", r);
      const i = r instanceof Error ? r.message : "Unknown error occurred";
      t.source?.postMessage(M.error(n.id, i));
    }
  }
  async handleGetStatus(t) {
    const n = t.data;
    if (!Tt.isGetStatus(n)) {
      console.error("Invalid GET_STATUS message format", n), t.source?.postMessage(M.error(n.id, "Invalid GET_STATUS message format"));
      return;
    }
    const r = this.handler ? await this.handler.identity.xOnlyPublicKey() : void 0;
    t.source?.postMessage(M.walletStatus(n.id, this.handler !== void 0, r));
  }
  async handleMessage(t) {
    this.messageCallback(t);
    const n = t.data;
    if (!Tt.isBase(n)) {
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
        t.source?.postMessage(M.error(n.id, "Unknown message type"));
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
    if (!Tt.isReloadWallet(n)) {
      console.error("Invalid RELOAD_WALLET message format", n), t.source?.postMessage(M.error(n.id, "Invalid RELOAD_WALLET message format"));
      return;
    }
    if (!this.handler) {
      console.error("Wallet not initialized"), t.source?.postMessage(M.walletReloaded(n.id, !1));
      return;
    }
    try {
      await this.onWalletInitialized(), t.source?.postMessage(M.walletReloaded(n.id, !0));
    } catch (r) {
      console.error("Error reloading wallet:", r), t.source?.postMessage(M.walletReloaded(n.id, !1));
    }
  }
}
var Gc;
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
        if (!(l.type === Tn.COMMITMENT || l.type === Tn.UNSPECIFIED))
          try {
            if (!(await this.explorer.getTxStatus(l.txid)).confirmed)
              return {
                type: t.WAIT,
                txid: l.txid,
                do: Tw(this.explorer, l.txid)
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
      const c = ze.fromPSBT(ft.decode(a.txs[0]));
      if (s.type === Tn.TREE) {
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
        do: xw(this.bumper, this.explorer, c)
      };
    }
    /**
     * Iterate over the steps to be executed and execute them
     * @returns An async iterator over the executed steps
     */
    async *[Symbol.asyncIterator]() {
      let s;
      do {
        s !== void 0 && await Ew(1e3);
        const o = await this.next();
        await o.do(), yield o, s = o.type;
      } while (s !== t.DONE);
    }
  }
  e.Session = n;
  async function r(i, s, o) {
    const a = await i.onchainProvider.getChainTip();
    let c = await i.getVtxos({ withUnrolled: !0 });
    if (c = c.filter((g) => s.includes(g.txid)), c.length === 0)
      throw new Error("No vtxos to complete unroll");
    const u = [];
    let l = 0n;
    const f = nt.create();
    for (const g of c) {
      if (!g.isUnrolled)
        throw new Error(`Vtxo ${g.txid}:${g.vout} is not fully unrolled, use unroll first`);
      const m = await i.onchainProvider.getTxStatus(g.txid);
      if (!m.confirmed)
        throw new Error(`tx ${g.txid} is not confirmed`);
      const S = Sw({ height: m.blockHeight, time: m.blockTime }, a, g);
      if (!S)
        throw new Error(`no available exit path found for vtxo ${g.txid}:${g.vout}`);
      const I = At.decode(g.tapTree).findLeaf(O.encode(S.script));
      if (!I)
        throw new Error(`spending leaf not found for vtxo ${g.txid}:${g.vout}`);
      l += BigInt(g.value), u.push({
        txid: g.txid,
        index: g.vout,
        tapLeafScript: [I],
        sequence: 4294967294,
        witnessUtxo: {
          amount: BigInt(g.value),
          script: At.decode(g.tapTree).pkScript
        },
        sighashType: Ke.DEFAULT
      }), f.addTapscriptInput(64, I[1].length, ie.encode(I[0]).length);
    }
    const h = new ze({ version: 2 });
    for (const g of u)
      h.addInput(g);
    f.addP2TROutput();
    let p = await i.onchainProvider.getFeeRate();
    (!p || p < _n.MIN_FEE_RATE) && (p = _n.MIN_FEE_RATE);
    const y = f.vsize().fee(BigInt(p));
    if (y > l)
      throw new Error("fee amount is greater than the total amount");
    h.addOutputAddress(o, l - y);
    const d = await i.identity.sign(h);
    return d.finalize(), await i.onchainProvider.broadcastTransaction(d.hex), d.id;
  }
  e.completeUnroll = r;
})(Gc || (Gc = {}));
function Ew(e) {
  return new Promise((t) => setTimeout(t, e));
}
function xw(e, t, n) {
  return async () => {
    const [r, i] = await e.bumpP2A(n);
    await t.broadcastTransaction(r, i);
  };
}
function Tw(e, t) {
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
function Sw(e, t, n) {
  const r = At.decode(n.tapTree).exitPaths();
  for (const i of r)
    if (i.params.timelock.type === "blocks") {
      if (t.height >= e.height + Number(i.params.timelock.value))
        return i;
    } else if (t.time >= e.time + Number(i.params.timelock.value))
      return i;
}
const Nf = new bw();
Nf.start().catch(console.error);
const Rf = "arkade-cache-v1";
self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(Rf)), self.skipWaiting();
});
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((t) => Promise.all(
      t.map((n) => {
        if (n !== Rf)
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
  e.data && e.data.type === "RELOAD_WALLET" && e.waitUntil(Nf.reload().catch(console.error));
});
