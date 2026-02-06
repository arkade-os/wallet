/*! noble-hashes - MIT License (c) 2022 Paul Miller (paulmillr.com) */
function xc(e) {
  return e instanceof Uint8Array || ArrayBuffer.isView(e) && e.constructor.name === "Uint8Array";
}
function be(e, t = "") {
  if (!Number.isSafeInteger(e) || e < 0) {
    const n = t && `"${t}" `;
    throw new Error(`${n}expected integer >= 0, got ${e}`);
  }
}
function X(e, t, n = "") {
  const r = xc(e), i = e?.length, s = t !== void 0;
  if (!r || s && i !== t) {
    const o = n && `"${n}" `, a = s ? ` of length ${t}` : "", c = r ? `length=${i}` : `type=${typeof e}`;
    throw new Error(o + "expected Uint8Array" + a + ", got " + c);
  }
  return e;
}
function Hd(e) {
  if (typeof e != "function" || typeof e.create != "function")
    throw new Error("Hash must wrapped by utils.createHasher");
  be(e.outputLen), be(e.blockLen);
}
function Is(e, t = !0) {
  if (e.destroyed)
    throw new Error("Hash instance has been destroyed");
  if (t && e.finished)
    throw new Error("Hash#digest() has already been called");
}
function kg(e, t) {
  X(e, void 0, "digestInto() output");
  const n = t.outputLen;
  if (e.length < n)
    throw new Error('"digestInto() output" expected to be of length >=' + n);
}
function Ar(...e) {
  for (let t = 0; t < e.length; t++)
    e[t].fill(0);
}
function Wo(e) {
  return new DataView(e.buffer, e.byteOffset, e.byteLength);
}
function ke(e, t) {
  return e << 32 - t | e >>> t;
}
function Wi(e, t) {
  return e << t | e >>> 32 - t >>> 0;
}
const Kd = /* @ts-ignore */ typeof Uint8Array.from([]).toHex == "function" && typeof Uint8Array.fromHex == "function", Ig = /* @__PURE__ */ Array.from({ length: 256 }, (e, t) => t.toString(16).padStart(2, "0"));
function cr(e) {
  if (X(e), Kd)
    return e.toHex();
  let t = "";
  for (let n = 0; n < e.length; n++)
    t += Ig[e[n]];
  return t;
}
const qe = { _0: 48, _9: 57, A: 65, F: 70, a: 97, f: 102 };
function Ou(e) {
  if (e >= qe._0 && e <= qe._9)
    return e - qe._0;
  if (e >= qe.A && e <= qe.F)
    return e - (qe.A - 10);
  if (e >= qe.a && e <= qe.f)
    return e - (qe.a - 10);
}
function Rr(e) {
  if (typeof e != "string")
    throw new Error("hex string expected, got " + typeof e);
  if (Kd)
    return Uint8Array.fromHex(e);
  const t = e.length, n = t / 2;
  if (t % 2)
    throw new Error("hex string expected, got unpadded hex of length " + t);
  const r = new Uint8Array(n);
  for (let i = 0, s = 0; i < n; i++, s += 2) {
    const o = Ou(e.charCodeAt(s)), a = Ou(e.charCodeAt(s + 1));
    if (o === void 0 || a === void 0) {
      const c = e[s] + e[s + 1];
      throw new Error('hex string expected, got non-hex character "' + c + '" at index ' + s);
    }
    r[i] = o * 16 + a;
  }
  return r;
}
function $t(...e) {
  let t = 0;
  for (let r = 0; r < e.length; r++) {
    const i = e[r];
    X(i), t += i.length;
  }
  const n = new Uint8Array(t);
  for (let r = 0, i = 0; r < e.length; r++) {
    const s = e[r];
    n.set(s, i), i += s.length;
  }
  return n;
}
function Wd(e, t = {}) {
  const n = (i, s) => e(s).update(i).digest(), r = e(void 0);
  return n.outputLen = r.outputLen, n.blockLen = r.blockLen, n.create = (i) => e(i), Object.assign(n, t), Object.freeze(n);
}
function Nn(e = 32) {
  const t = typeof globalThis == "object" ? globalThis.crypto : null;
  if (typeof t?.getRandomValues != "function")
    throw new Error("crypto.getRandomValues must be defined");
  return t.getRandomValues(new Uint8Array(e));
}
const Ag = (e) => ({
  oid: Uint8Array.from([6, 9, 96, 134, 72, 1, 101, 3, 4, 2, e])
});
function Rg(e, t, n) {
  return e & t ^ ~e & n;
}
function $g(e, t, n) {
  return e & t ^ e & n ^ t & n;
}
let zd = class {
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
    this.blockLen = t, this.outputLen = n, this.padOffset = r, this.isLE = i, this.buffer = new Uint8Array(t), this.view = Wo(this.buffer);
  }
  update(t) {
    Is(this), X(t);
    const { view: n, buffer: r, blockLen: i } = this, s = t.length;
    for (let o = 0; o < s; ) {
      const a = Math.min(i - this.pos, s - o);
      if (a === i) {
        const c = Wo(t);
        for (; i <= s - o; o += i)
          this.process(c, o);
        continue;
      }
      r.set(t.subarray(o, o + a), this.pos), this.pos += a, o += a, this.pos === i && (this.process(n, 0), this.pos = 0);
    }
    return this.length += t.length, this.roundClean(), this;
  }
  digestInto(t) {
    Is(this), kg(t, this), this.finished = !0;
    const { buffer: n, view: r, blockLen: i, isLE: s } = this;
    let { pos: o } = this;
    n[o++] = 128, Ar(this.buffer.subarray(o)), this.padOffset > i - o && (this.process(r, 0), o = 0);
    for (let d = o; d < i; d++)
      n[d] = 0;
    r.setBigUint64(i - 8, BigInt(this.length * 8), s), this.process(r, 0);
    const a = Wo(t), c = this.outputLen;
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
const cn = /* @__PURE__ */ Uint32Array.from([
  1779033703,
  3144134277,
  1013904242,
  2773480762,
  1359893119,
  2600822924,
  528734635,
  1541459225
]), Og = /* @__PURE__ */ Uint32Array.from([
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
]), un = /* @__PURE__ */ new Uint32Array(64);
let Cg = class extends zd {
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
      un[d] = t.getUint32(n, !1);
    for (let d = 16; d < 64; d++) {
      const h = un[d - 15], p = un[d - 2], w = ke(h, 7) ^ ke(h, 18) ^ h >>> 3, f = ke(p, 17) ^ ke(p, 19) ^ p >>> 10;
      un[d] = f + un[d - 7] + w + un[d - 16] | 0;
    }
    let { A: r, B: i, C: s, D: o, E: a, F: c, G: u, H: l } = this;
    for (let d = 0; d < 64; d++) {
      const h = ke(a, 6) ^ ke(a, 11) ^ ke(a, 25), p = l + h + Rg(a, c, u) + Og[d] + un[d] | 0, f = (ke(r, 2) ^ ke(r, 13) ^ ke(r, 22)) + $g(r, i, s) | 0;
      l = u, u = c, c = a, a = o + p | 0, o = s, s = i, i = r, r = p + f | 0;
    }
    r = r + this.A | 0, i = i + this.B | 0, s = s + this.C | 0, o = o + this.D | 0, a = a + this.E | 0, c = c + this.F | 0, u = u + this.G | 0, l = l + this.H | 0, this.set(r, i, s, o, a, c, u, l);
  }
  roundClean() {
    Ar(un);
  }
  destroy() {
    this.set(0, 0, 0, 0, 0, 0, 0, 0), Ar(this.buffer);
  }
}, Pg = class extends Cg {
  // We cannot use array here since array allows indexing by variable
  // which means optimizer/compiler cannot use registers.
  A = cn[0] | 0;
  B = cn[1] | 0;
  C = cn[2] | 0;
  D = cn[3] | 0;
  E = cn[4] | 0;
  F = cn[5] | 0;
  G = cn[6] | 0;
  H = cn[7] | 0;
  constructor() {
    super(32);
  }
};
const lt = /* @__PURE__ */ Wd(
  () => new Pg(),
  /* @__PURE__ */ Ag(1)
);
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const vc = /* @__PURE__ */ BigInt(0), Ra = /* @__PURE__ */ BigInt(1);
function As(e, t = "") {
  if (typeof e != "boolean") {
    const n = t && `"${t}" `;
    throw new Error(n + "expected boolean, got type=" + typeof e);
  }
  return e;
}
function jd(e) {
  if (typeof e == "bigint") {
    if (!ds(e))
      throw new Error("positive bigint expected, got " + e);
  } else
    be(e);
  return e;
}
function zi(e) {
  const t = jd(e).toString(16);
  return t.length & 1 ? "0" + t : t;
}
function qd(e) {
  if (typeof e != "string")
    throw new Error("hex string expected, got " + typeof e);
  return e === "" ? vc : BigInt("0x" + e);
}
function on(e) {
  return qd(cr(e));
}
function Gd(e) {
  return qd(cr(Bg(X(e)).reverse()));
}
function Di(e, t) {
  be(t), e = jd(e);
  const n = Rr(e.toString(16).padStart(t * 2, "0"));
  if (n.length !== t)
    throw new Error("number too large");
  return n;
}
function Yd(e, t) {
  return Di(e, t).reverse();
}
function Oi(e, t) {
  if (e.length !== t.length)
    return !1;
  let n = 0;
  for (let r = 0; r < e.length; r++)
    n |= e[r] ^ t[r];
  return n === 0;
}
function Bg(e) {
  return Uint8Array.from(e);
}
function Ng(e) {
  return Uint8Array.from(e, (t, n) => {
    const r = t.charCodeAt(0);
    if (t.length !== 1 || r > 127)
      throw new Error(`string contains non-ASCII character "${e[n]}" with code ${r} at position ${n}`);
    return r;
  });
}
const ds = (e) => typeof e == "bigint" && vc <= e;
function _g(e, t, n) {
  return ds(e) && ds(t) && ds(n) && t <= e && e < n;
}
function Zd(e, t, n, r) {
  if (!_g(t, n, r))
    throw new Error("expected valid " + e + ": " + n + " <= n < " + r + ", got " + t);
}
function Ug(e) {
  let t;
  for (t = 0; e > vc; e >>= Ra, t += 1)
    ;
  return t;
}
const Ec = (e) => (Ra << BigInt(e)) - Ra;
function Lg(e, t, n) {
  if (be(e, "hashLen"), be(t, "qByteLen"), typeof n != "function")
    throw new Error("hmacFn must be a function");
  const r = (y) => new Uint8Array(y), i = Uint8Array.of(), s = Uint8Array.of(0), o = Uint8Array.of(1), a = 1e3;
  let c = r(e), u = r(e), l = 0;
  const d = () => {
    c.fill(1), u.fill(0), l = 0;
  }, h = (...y) => n(u, $t(c, ...y)), p = (y = i) => {
    u = h(s, y), c = h(), y.length !== 0 && (u = h(o, y), c = h());
  }, w = () => {
    if (l++ >= a)
      throw new Error("drbg: tried max amount of iterations");
    let y = 0;
    const E = [];
    for (; y < t; ) {
      c = h();
      const I = c.slice();
      E.push(I), y += c.length;
    }
    return $t(...E);
  };
  return (y, E) => {
    d(), p(y);
    let I;
    for (; !(I = E(w())); )
      p();
    return d(), I;
  };
}
function Tc(e, t = {}, n = {}) {
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
function Cu(e) {
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
const _t = /* @__PURE__ */ BigInt(0), Ot = /* @__PURE__ */ BigInt(1), Kn = /* @__PURE__ */ BigInt(2), Xd = /* @__PURE__ */ BigInt(3), Qd = /* @__PURE__ */ BigInt(4), Jd = /* @__PURE__ */ BigInt(5), Dg = /* @__PURE__ */ BigInt(7), tf = /* @__PURE__ */ BigInt(8), Vg = /* @__PURE__ */ BigInt(9), ef = /* @__PURE__ */ BigInt(16);
function fe(e, t) {
  const n = e % t;
  return n >= _t ? n : t + n;
}
function Xt(e, t, n) {
  let r = e;
  for (; t-- > _t; )
    r *= r, r %= n;
  return r;
}
function Pu(e, t) {
  if (e === _t)
    throw new Error("invert: expected non-zero number");
  if (t <= _t)
    throw new Error("invert: expected positive modulus, got " + t);
  let n = fe(e, t), r = t, i = _t, s = Ot;
  for (; n !== _t; ) {
    const a = r / n, c = r % n, u = i - s * a;
    r = n, n = c, i = s, s = u;
  }
  if (r !== Ot)
    throw new Error("invert: does not exist");
  return fe(i, t);
}
function Sc(e, t, n) {
  if (!e.eql(e.sqr(t), n))
    throw new Error("Cannot find square root");
}
function nf(e, t) {
  const n = (e.ORDER + Ot) / Qd, r = e.pow(t, n);
  return Sc(e, r, t), r;
}
function Fg(e, t) {
  const n = (e.ORDER - Jd) / tf, r = e.mul(t, Kn), i = e.pow(r, n), s = e.mul(t, i), o = e.mul(e.mul(s, Kn), i), a = e.mul(s, e.sub(o, e.ONE));
  return Sc(e, a, t), a;
}
function Mg(e) {
  const t = yo(e), n = rf(e), r = n(t, t.neg(t.ONE)), i = n(t, r), s = n(t, t.neg(r)), o = (e + Dg) / ef;
  return (a, c) => {
    let u = a.pow(c, o), l = a.mul(u, r);
    const d = a.mul(u, i), h = a.mul(u, s), p = a.eql(a.sqr(l), c), w = a.eql(a.sqr(d), c);
    u = a.cmov(u, l, p), l = a.cmov(h, d, w);
    const f = a.eql(a.sqr(l), c), y = a.cmov(u, l, f);
    return Sc(a, y, c), y;
  };
}
function rf(e) {
  if (e < Xd)
    throw new Error("sqrt is not defined for small field");
  let t = e - Ot, n = 0;
  for (; t % Kn === _t; )
    t /= Kn, n++;
  let r = Kn;
  const i = yo(e);
  for (; Bu(i, r) === 1; )
    if (r++ > 1e3)
      throw new Error("Cannot find square root: probably non-prime P");
  if (n === 1)
    return nf;
  let s = i.pow(r, t);
  const o = (t + Ot) / Kn;
  return function(c, u) {
    if (c.is0(u))
      return u;
    if (Bu(c, u) !== 1)
      throw new Error("Cannot find square root");
    let l = n, d = c.mul(c.ONE, s), h = c.pow(u, t), p = c.pow(u, o);
    for (; !c.eql(h, c.ONE); ) {
      if (c.is0(h))
        return c.ZERO;
      let w = 1, f = c.sqr(h);
      for (; !c.eql(f, c.ONE); )
        if (w++, f = c.sqr(f), w === l)
          throw new Error("Cannot find square root");
      const y = Ot << BigInt(l - w - 1), E = c.pow(d, y);
      l = w, d = c.sqr(E), h = c.mul(h, d), p = c.mul(p, E);
    }
    return p;
  };
}
function Hg(e) {
  return e % Qd === Xd ? nf : e % tf === Jd ? Fg : e % ef === Vg ? Mg(e) : rf(e);
}
const Kg = [
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
function Wg(e) {
  const t = {
    ORDER: "bigint",
    BYTES: "number",
    BITS: "number"
  }, n = Kg.reduce((r, i) => (r[i] = "function", r), t);
  return Tc(e, n), e;
}
function zg(e, t, n) {
  if (n < _t)
    throw new Error("invalid exponent, negatives unsupported");
  if (n === _t)
    return e.ONE;
  if (n === Ot)
    return t;
  let r = e.ONE, i = t;
  for (; n > _t; )
    n & Ot && (r = e.mul(r, i)), i = e.sqr(i), n >>= Ot;
  return r;
}
function sf(e, t, n = !1) {
  const r = new Array(t.length).fill(n ? e.ZERO : void 0), i = t.reduce((o, a, c) => e.is0(a) ? o : (r[c] = o, e.mul(o, a)), e.ONE), s = e.inv(i);
  return t.reduceRight((o, a, c) => e.is0(a) ? o : (r[c] = e.mul(o, r[c]), e.mul(o, a)), s), r;
}
function Bu(e, t) {
  const n = (e.ORDER - Ot) / Kn, r = e.pow(t, n), i = e.eql(r, e.ONE), s = e.eql(r, e.ZERO), o = e.eql(r, e.neg(e.ONE));
  if (!i && !s && !o)
    throw new Error("invalid Legendre symbol result");
  return i ? 1 : s ? 0 : -1;
}
function jg(e, t) {
  t !== void 0 && be(t);
  const n = t !== void 0 ? t : e.toString(2).length, r = Math.ceil(n / 8);
  return { nBitLength: n, nByteLength: r };
}
let qg = class {
  ORDER;
  BITS;
  BYTES;
  isLE;
  ZERO = _t;
  ONE = Ot;
  _lengths;
  _sqrt;
  // cached sqrt
  _mod;
  constructor(t, n = {}) {
    if (t <= _t)
      throw new Error("invalid field: expected ORDER > 0, got " + t);
    let r;
    this.isLE = !1, n != null && typeof n == "object" && (typeof n.BITS == "number" && (r = n.BITS), typeof n.sqrt == "function" && (this.sqrt = n.sqrt), typeof n.isLE == "boolean" && (this.isLE = n.isLE), n.allowedLengths && (this._lengths = n.allowedLengths?.slice()), typeof n.modFromBytes == "boolean" && (this._mod = n.modFromBytes));
    const { nBitLength: i, nByteLength: s } = jg(t, r);
    if (s > 2048)
      throw new Error("invalid field: expected ORDER of <= 2048 bytes");
    this.ORDER = t, this.BITS = i, this.BYTES = s, this._sqrt = void 0, Object.preventExtensions(this);
  }
  create(t) {
    return fe(t, this.ORDER);
  }
  isValid(t) {
    if (typeof t != "bigint")
      throw new Error("invalid field element: expected bigint, got " + typeof t);
    return _t <= t && t < this.ORDER;
  }
  is0(t) {
    return t === _t;
  }
  // is valid and invertible
  isValidNot0(t) {
    return !this.is0(t) && this.isValid(t);
  }
  isOdd(t) {
    return (t & Ot) === Ot;
  }
  neg(t) {
    return fe(-t, this.ORDER);
  }
  eql(t, n) {
    return t === n;
  }
  sqr(t) {
    return fe(t * t, this.ORDER);
  }
  add(t, n) {
    return fe(t + n, this.ORDER);
  }
  sub(t, n) {
    return fe(t - n, this.ORDER);
  }
  mul(t, n) {
    return fe(t * n, this.ORDER);
  }
  pow(t, n) {
    return zg(this, t, n);
  }
  div(t, n) {
    return fe(t * Pu(n, this.ORDER), this.ORDER);
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
    return Pu(t, this.ORDER);
  }
  sqrt(t) {
    return this._sqrt || (this._sqrt = Hg(this.ORDER)), this._sqrt(this, t);
  }
  toBytes(t) {
    return this.isLE ? Yd(t, this.BYTES) : Di(t, this.BYTES);
  }
  fromBytes(t, n = !1) {
    X(t);
    const { _lengths: r, BYTES: i, isLE: s, ORDER: o, _mod: a } = this;
    if (r) {
      if (!r.includes(t.length) || t.length > i)
        throw new Error("Field.fromBytes: expected " + r + " bytes, got " + t.length);
      const u = new Uint8Array(i);
      u.set(t, s ? 0 : u.length - t.length), t = u;
    }
    if (t.length !== i)
      throw new Error("Field.fromBytes: expected " + i + " bytes, got " + t.length);
    let c = s ? Gd(t) : on(t);
    if (a && (c = fe(c, o)), !n && !this.isValid(c))
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
};
function yo(e, t = {}) {
  return new qg(e, t);
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
  X(e);
  const r = e.length, i = of(t), s = af(t);
  if (r < 16 || r < s || r > 1024)
    throw new Error("expected " + s + "-1024 bytes of input, got " + r);
  const o = n ? Gd(e) : on(e), a = fe(o, t - Ot) + Ot;
  return n ? Yd(a, i) : Di(a, i);
}
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const $r = /* @__PURE__ */ BigInt(0), Wn = /* @__PURE__ */ BigInt(1);
function Rs(e, t) {
  const n = t.negate();
  return e ? n : t;
}
function Nu(e, t) {
  const n = sf(e.Fp, t.map((r) => r.Z));
  return t.map((r, i) => e.fromAffine(r.toAffine(n[i])));
}
function uf(e, t) {
  if (!Number.isSafeInteger(e) || e <= 0 || e > t)
    throw new Error("invalid window size, expected [1.." + t + "], got W=" + e);
}
function zo(e, t) {
  uf(e, t);
  const n = Math.ceil(t / e) + 1, r = 2 ** (e - 1), i = 2 ** e, s = Ec(e), o = BigInt(e);
  return { windows: n, windowSize: r, mask: s, maxNumber: i, shiftBy: o };
}
function _u(e, t, n) {
  const { windowSize: r, mask: i, maxNumber: s, shiftBy: o } = n;
  let a = Number(e & i), c = e >> o;
  a > r && (a -= s, c += Wn);
  const u = t * r, l = u + Math.abs(a) - 1, d = a === 0, h = a < 0, p = t % 2 !== 0;
  return { nextN: c, offset: l, isZero: d, isNeg: h, isNegF: p, offsetF: u };
}
const jo = /* @__PURE__ */ new WeakMap(), lf = /* @__PURE__ */ new WeakMap();
function qo(e) {
  return lf.get(e) || 1;
}
function Uu(e) {
  if (e !== $r)
    throw new Error("invalid wNAF");
}
let Gg = class {
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
    for (; n > $r; )
      n & Wn && (r = r.add(i)), i = i.double(), n >>= Wn;
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
    const { windows: r, windowSize: i } = zo(n, this.bits), s = [];
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
    const o = zo(t, this.bits);
    for (let a = 0; a < o.windows; a++) {
      const { nextN: c, offset: u, isZero: l, isNeg: d, isNegF: h, offsetF: p } = _u(r, a, o);
      r = c, l ? s = s.add(Rs(h, n[p])) : i = i.add(Rs(d, n[u]));
    }
    return Uu(r), { p: i, f: s };
  }
  /**
   * Implements ec unsafe (non const-time) multiplication using precomputed tables and w-ary non-adjacent form.
   * @param acc accumulator point to add result of multiplication
   * @returns point
   */
  wNAFUnsafe(t, n, r, i = this.ZERO) {
    const s = zo(t, this.bits);
    for (let o = 0; o < s.windows && r !== $r; o++) {
      const { nextN: a, offset: c, isZero: u, isNeg: l } = _u(r, o, s);
      if (r = a, !u) {
        const d = n[c];
        i = i.add(l ? d.negate() : d);
      }
    }
    return Uu(r), i;
  }
  getPrecomputes(t, n, r) {
    let i = jo.get(n);
    return i || (i = this.precomputeWindow(n, t), t !== 1 && (typeof r == "function" && (i = r(i)), jo.set(n, i))), i;
  }
  cached(t, n, r) {
    const i = qo(t);
    return this.wNAF(i, this.getPrecomputes(i, t, r), n);
  }
  unsafe(t, n, r, i) {
    const s = qo(t);
    return s === 1 ? this._unsafeLadder(t, n, i) : this.wNAFUnsafe(s, this.getPrecomputes(s, t, r), n, i);
  }
  // We calculate precomputes for elliptic curve point multiplication
  // using windowed method. This specifies window size and
  // stores precomputed values. Usually only base point would be precomputed.
  createCache(t, n) {
    uf(n, this.bits), lf.set(t, n), jo.delete(t);
  }
  hasCache(t) {
    return qo(t) !== 1;
  }
};
function Yg(e, t, n, r) {
  let i = t, s = e.ZERO, o = e.ZERO;
  for (; n > $r || r > $r; )
    n & Wn && (s = s.add(i)), r & Wn && (o = o.add(i)), i = i.double(), n >>= Wn, r >>= Wn;
  return { p1: s, p2: o };
}
function Lu(e, t, n) {
  if (t) {
    if (t.ORDER !== e)
      throw new Error("Field.ORDER must match order: Fp == p, Fn == n");
    return Wg(t), t;
  } else
    return yo(e, { isLE: n });
}
function Zg(e, t, n = {}, r) {
  if (r === void 0 && (r = e === "edwards"), !t || typeof t != "object")
    throw new Error(`expected valid ${e} CURVE object`);
  for (const c of ["p", "n", "h"]) {
    const u = t[c];
    if (!(typeof u == "bigint" && u > $r))
      throw new Error(`CURVE.${c} must be positive bigint`);
  }
  const i = Lu(t.p, n.Fp, r), s = Lu(t.n, n.Fn, r), a = ["Gx", "Gy", "a", "b"];
  for (const c of a)
    if (!i.isValid(t[c]))
      throw new Error(`CURVE.${c} must be valid field element of CURVE.Fp`);
  return t = Object.freeze(Object.assign({}, t)), { CURVE: t, Fp: i, Fn: s };
}
function df(e, t) {
  return function(r) {
    const i = e(r);
    return { secretKey: i, publicKey: t(i) };
  };
}
let ff = class {
  oHash;
  iHash;
  blockLen;
  outputLen;
  finished = !1;
  destroyed = !1;
  constructor(t, n) {
    if (Hd(t), X(n, void 0, "key"), this.iHash = t.create(), typeof this.iHash.update != "function")
      throw new Error("Expected instance of class which extends utils.Hash");
    this.blockLen = this.iHash.blockLen, this.outputLen = this.iHash.outputLen;
    const r = this.blockLen, i = new Uint8Array(r);
    i.set(n.length > r ? t.create().update(n).digest() : n);
    for (let s = 0; s < i.length; s++)
      i[s] ^= 54;
    this.iHash.update(i), this.oHash = t.create();
    for (let s = 0; s < i.length; s++)
      i[s] ^= 106;
    this.oHash.update(i), Ar(i);
  }
  update(t) {
    return Is(this), this.iHash.update(t), this;
  }
  digestInto(t) {
    Is(this), X(t, this.outputLen, "output"), this.finished = !0, this.iHash.digestInto(t), this.oHash.update(t), this.oHash.digestInto(t), this.destroy();
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
const hf = (e, t, n) => new ff(e, t).update(n).digest();
hf.create = (e, t) => new ff(e, t);
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const Du = (e, t) => (e + (e >= 0 ? t : -t) / pf) / t;
function Xg(e, t, n) {
  const [[r, i], [s, o]] = t, a = Du(o * e, n), c = Du(-i * e, n);
  let u = e - a * r - c * s, l = -a * i - c * o;
  const d = u < tn, h = l < tn;
  d && (u = -u), h && (l = -l);
  const p = Ec(Math.ceil(Ug(n) / 2)) + yr;
  if (u < tn || u >= p || l < tn || l >= p)
    throw new Error("splitScalar (endomorphism): failed, k=" + e);
  return { k1neg: d, k1: u, k2neg: h, k2: l };
}
function $a(e) {
  if (!["compact", "recovered", "der"].includes(e))
    throw new Error('Signature format must be "compact", "recovered", or "der"');
  return e;
}
function Go(e, t) {
  const n = {};
  for (let r of Object.keys(t))
    n[r] = e[r] === void 0 ? t[r] : e[r];
  return As(n.lowS, "lowS"), As(n.prehash, "prehash"), n.format !== void 0 && $a(n.format), n;
}
let Qg = class extends Error {
  constructor(t = "") {
    super(t);
  }
};
const pn = {
  // asn.1 DER encoding utils
  Err: Qg,
  // Basic building block is TLV (Tag-Length-Value)
  _tlv: {
    encode: (e, t) => {
      const { Err: n } = pn;
      if (e < 0 || e > 256)
        throw new n("tlv.encode: wrong tag");
      if (t.length & 1)
        throw new n("tlv.encode: unpadded data");
      const r = t.length / 2, i = zi(r);
      if (i.length / 2 & 128)
        throw new n("tlv.encode: long form length too big");
      const s = r > 127 ? zi(i.length / 2 | 128) : "";
      return zi(e) + s + i + t;
    },
    // v - value, l - left bytes (unparsed)
    decode(e, t) {
      const { Err: n } = pn;
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
      const { Err: t } = pn;
      if (e < tn)
        throw new t("integer: negative integers are not allowed");
      let n = zi(e);
      if (Number.parseInt(n[0], 16) & 8 && (n = "00" + n), n.length & 1)
        throw new t("unexpected DER parsing assertion: unpadded hex");
      return n;
    },
    decode(e) {
      const { Err: t } = pn;
      if (e[0] & 128)
        throw new t("invalid signature integer: negative");
      if (e[0] === 0 && !(e[1] & 128))
        throw new t("invalid signature integer: unnecessary leading zero");
      return on(e);
    }
  },
  toSig(e) {
    const { Err: t, _int: n, _tlv: r } = pn, i = X(e, void 0, "signature"), { v: s, l: o } = r.decode(48, i);
    if (o.length)
      throw new t("invalid signature: left bytes after parsing");
    const { v: a, l: c } = r.decode(2, s), { v: u, l } = r.decode(2, c);
    if (l.length)
      throw new t("invalid signature: left bytes after parsing");
    return { r: n.decode(a), s: n.decode(u) };
  },
  hexFromSig(e) {
    const { _tlv: t, _int: n } = pn, r = t.encode(2, n.encode(e.r)), i = t.encode(2, n.encode(e.s)), s = r + i;
    return t.encode(48, s);
  }
}, tn = BigInt(0), yr = BigInt(1), pf = BigInt(2), ji = BigInt(3), Jg = BigInt(4);
function tw(e, t = {}) {
  const n = Zg("weierstrass", e, t), { Fp: r, Fn: i } = n;
  let s = n.CURVE;
  const { h: o, n: a } = s;
  Tc(t, {}, {
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
  const u = wf(r, i);
  function l() {
    if (!r.isOdd)
      throw new Error("compression is not supported: Field does not have .isOdd()");
  }
  function d(S, m, v) {
    const { x: b, y: T } = m.toAffine(), k = r.toBytes(b);
    if (As(v, "isCompressed"), v) {
      l();
      const P = !r.isOdd(T);
      return $t(gf(P), k);
    } else
      return $t(Uint8Array.of(4), k, r.toBytes(T));
  }
  function h(S) {
    X(S, void 0, "Point");
    const { publicKey: m, publicKeyUncompressed: v } = u, b = S.length, T = S[0], k = S.subarray(1);
    if (b === m && (T === 2 || T === 3)) {
      const P = r.fromBytes(k);
      if (!r.isValid(P))
        throw new Error("bad point: is not on curve, wrong x");
      const C = f(P);
      let $;
      try {
        $ = r.sqrt(C);
      } catch (z) {
        const H = z instanceof Error ? ": " + z.message : "";
        throw new Error("bad point: is not on curve, sqrt error" + H);
      }
      l();
      const R = r.isOdd($);
      return (T & 1) === 1 !== R && ($ = r.neg($)), { x: P, y: $ };
    } else if (b === v && T === 4) {
      const P = r.BYTES, C = r.fromBytes(k.subarray(0, P)), $ = r.fromBytes(k.subarray(P, P * 2));
      if (!y(C, $))
        throw new Error("bad point: is not on curve");
      return { x: C, y: $ };
    } else
      throw new Error(`bad point: got length ${b}, expected compressed=${m} or uncompressed=${v}`);
  }
  const p = t.toBytes || d, w = t.fromBytes || h;
  function f(S) {
    const m = r.sqr(S), v = r.mul(m, S);
    return r.add(r.add(v, r.mul(S, s.a)), s.b);
  }
  function y(S, m) {
    const v = r.sqr(m), b = f(S);
    return r.eql(v, b);
  }
  if (!y(s.Gx, s.Gy))
    throw new Error("bad curve params: generator point");
  const E = r.mul(r.pow(s.a, ji), Jg), I = r.mul(r.sqr(s.b), BigInt(27));
  if (r.is0(r.add(E, I)))
    throw new Error("bad curve params: a or b");
  function O(S, m, v = !1) {
    if (!r.isValid(m) || v && r.is0(m))
      throw new Error(`bad point coordinate ${S}`);
    return m;
  }
  function B(S) {
    if (!(S instanceof _))
      throw new Error("Weierstrass Point expected");
  }
  function N(S) {
    if (!c || !c.basises)
      throw new Error("no endo");
    return Xg(S, c.basises, i.ORDER);
  }
  const V = Cu((S, m) => {
    const { X: v, Y: b, Z: T } = S;
    if (r.eql(T, r.ONE))
      return { x: v, y: b };
    const k = S.is0();
    m == null && (m = k ? r.ONE : r.inv(T));
    const P = r.mul(v, m), C = r.mul(b, m), $ = r.mul(T, m);
    if (k)
      return { x: r.ZERO, y: r.ZERO };
    if (!r.eql($, r.ONE))
      throw new Error("invZ was invalid");
    return { x: P, y: C };
  }), g = Cu((S) => {
    if (S.is0()) {
      if (t.allowInfinityPoint && !r.is0(S.Y))
        return;
      throw new Error("bad point: ZERO");
    }
    const { x: m, y: v } = S.toAffine();
    if (!r.isValid(m) || !r.isValid(v))
      throw new Error("bad point: x or y not field elements");
    if (!y(m, v))
      throw new Error("bad point: equation left != right");
    if (!S.isTorsionFree())
      throw new Error("bad point: not in prime-order subgroup");
    return !0;
  });
  function M(S, m, v, b, T) {
    return v = new _(r.mul(v.X, S), v.Y, v.Z), m = Rs(b, m), v = Rs(T, v), m.add(v);
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
    constructor(m, v, b) {
      this.X = O("x", m), this.Y = O("y", v, !0), this.Z = O("z", b), Object.freeze(this);
    }
    static CURVE() {
      return s;
    }
    /** Does NOT validate if the point is valid. Use `.assertValidity()`. */
    static fromAffine(m) {
      const { x: v, y: b } = m || {};
      if (!m || !r.isValid(v) || !r.isValid(b))
        throw new Error("invalid affine point");
      if (m instanceof _)
        throw new Error("projective point not allowed");
      return r.is0(v) && r.is0(b) ? _.ZERO : new _(v, b, r.ONE);
    }
    static fromBytes(m) {
      const v = _.fromAffine(w(X(m, void 0, "point")));
      return v.assertValidity(), v;
    }
    static fromHex(m) {
      return _.fromBytes(Rr(m));
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
    precompute(m = 8, v = !0) {
      return A.createCache(this, m), v || this.multiply(ji), this;
    }
    // TODO: return `this`
    /** A point on curve is valid if it conforms to equation. */
    assertValidity() {
      g(this);
    }
    hasEvenY() {
      const { y: m } = this.toAffine();
      if (!r.isOdd)
        throw new Error("Field doesn't support isOdd");
      return !r.isOdd(m);
    }
    /** Compare one point to another. */
    equals(m) {
      B(m);
      const { X: v, Y: b, Z: T } = this, { X: k, Y: P, Z: C } = m, $ = r.eql(r.mul(v, C), r.mul(k, T)), R = r.eql(r.mul(b, C), r.mul(P, T));
      return $ && R;
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
      const { a: m, b: v } = s, b = r.mul(v, ji), { X: T, Y: k, Z: P } = this;
      let C = r.ZERO, $ = r.ZERO, R = r.ZERO, U = r.mul(T, T), z = r.mul(k, k), H = r.mul(P, P), L = r.mul(T, k);
      return L = r.add(L, L), R = r.mul(T, P), R = r.add(R, R), C = r.mul(m, R), $ = r.mul(b, H), $ = r.add(C, $), C = r.sub(z, $), $ = r.add(z, $), $ = r.mul(C, $), C = r.mul(L, C), R = r.mul(b, R), H = r.mul(m, H), L = r.sub(U, H), L = r.mul(m, L), L = r.add(L, R), R = r.add(U, U), U = r.add(R, U), U = r.add(U, H), U = r.mul(U, L), $ = r.add($, U), H = r.mul(k, P), H = r.add(H, H), U = r.mul(H, L), C = r.sub(C, U), R = r.mul(H, z), R = r.add(R, R), R = r.add(R, R), new _(C, $, R);
    }
    // Renes-Costello-Batina exception-free addition formula.
    // There is 30% faster Jacobian formula, but it is not complete.
    // https://eprint.iacr.org/2015/1060, algorithm 1
    // Cost: 12M + 0S + 3*a + 3*b3 + 23add.
    add(m) {
      B(m);
      const { X: v, Y: b, Z: T } = this, { X: k, Y: P, Z: C } = m;
      let $ = r.ZERO, R = r.ZERO, U = r.ZERO;
      const z = s.a, H = r.mul(s.b, ji);
      let L = r.mul(v, k), W = r.mul(b, P), Y = r.mul(T, C), nt = r.add(v, b), j = r.add(k, P);
      nt = r.mul(nt, j), j = r.add(L, W), nt = r.sub(nt, j), j = r.add(v, T);
      let J = r.add(k, C);
      return j = r.mul(j, J), J = r.add(L, Y), j = r.sub(j, J), J = r.add(b, T), $ = r.add(P, C), J = r.mul(J, $), $ = r.add(W, Y), J = r.sub(J, $), U = r.mul(z, j), $ = r.mul(H, Y), U = r.add($, U), $ = r.sub(W, U), U = r.add(W, U), R = r.mul($, U), W = r.add(L, L), W = r.add(W, L), Y = r.mul(z, Y), j = r.mul(H, j), W = r.add(W, Y), Y = r.sub(L, Y), Y = r.mul(z, Y), j = r.add(j, Y), L = r.mul(W, j), R = r.add(R, L), L = r.mul(J, j), $ = r.mul(nt, $), $ = r.sub($, L), L = r.mul(nt, W), U = r.mul(J, U), U = r.add(U, L), new _($, R, U);
    }
    subtract(m) {
      return this.add(m.negate());
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
    multiply(m) {
      const { endo: v } = t;
      if (!i.isValidNot0(m))
        throw new Error("invalid scalar: out of range");
      let b, T;
      const k = (P) => A.cached(this, P, (C) => Nu(_, C));
      if (v) {
        const { k1neg: P, k1: C, k2neg: $, k2: R } = N(m), { p: U, f: z } = k(C), { p: H, f: L } = k(R);
        T = z.add(L), b = M(v.beta, U, H, P, $);
      } else {
        const { p: P, f: C } = k(m);
        b = P, T = C;
      }
      return Nu(_, [b, T])[0];
    }
    /**
     * Non-constant-time multiplication. Uses double-and-add algorithm.
     * It's faster, but should only be used when you don't care about
     * an exposed secret key e.g. sig verification, which works over *public* keys.
     */
    multiplyUnsafe(m) {
      const { endo: v } = t, b = this;
      if (!i.isValid(m))
        throw new Error("invalid scalar: out of range");
      if (m === tn || b.is0())
        return _.ZERO;
      if (m === yr)
        return b;
      if (A.hasCache(this))
        return this.multiply(m);
      if (v) {
        const { k1neg: T, k1: k, k2neg: P, k2: C } = N(m), { p1: $, p2: R } = Yg(_, b, k, C);
        return M(v.beta, $, R, T, P);
      } else
        return A.unsafe(b, m);
    }
    /**
     * Converts Projective point to affine (x, y) coordinates.
     * @param invertedZ Z^-1 (inverted zero) - optional, precomputation is useful for invertBatch
     */
    toAffine(m) {
      return V(this, m);
    }
    /**
     * Checks whether Point is free of torsion elements (is in prime subgroup).
     * Always torsion-free for cofactor=1 curves.
     */
    isTorsionFree() {
      const { isTorsionFree: m } = t;
      return o === yr ? !0 : m ? m(_, this) : A.unsafe(this, a).is0();
    }
    clearCofactor() {
      const { clearCofactor: m } = t;
      return o === yr ? this : m ? m(_, this) : this.multiplyUnsafe(o);
    }
    isSmallOrder() {
      return this.multiplyUnsafe(o).is0();
    }
    toBytes(m = !0) {
      return As(m, "isCompressed"), this.assertValidity(), p(_, this, m);
    }
    toHex(m = !0) {
      return cr(this.toBytes(m));
    }
    toString() {
      return `<Point ${this.is0() ? "ZERO" : this.toHex()}>`;
    }
  }
  const F = i.BITS, A = new Gg(_, t.endo ? Math.ceil(F / 2) : F);
  return _.BASE.precompute(8), _;
}
function gf(e) {
  return Uint8Array.of(e ? 2 : 3);
}
function wf(e, t) {
  return {
    secretKey: t.BYTES,
    publicKey: 1 + e.BYTES,
    publicKeyUncompressed: 1 + 2 * e.BYTES,
    publicKeyHasPrefix: !0,
    signature: 2 * t.BYTES
  };
}
function ew(e, t = {}) {
  const { Fn: n } = e, r = t.randomBytes || Nn, i = Object.assign(wf(e.Fp, n), { seed: af(n.ORDER) });
  function s(p) {
    try {
      const w = n.fromBytes(p);
      return n.isValidNot0(w);
    } catch {
      return !1;
    }
  }
  function o(p, w) {
    const { publicKey: f, publicKeyUncompressed: y } = i;
    try {
      const E = p.length;
      return w === !0 && E !== f || w === !1 && E !== y ? !1 : !!e.fromBytes(p);
    } catch {
      return !1;
    }
  }
  function a(p = r(i.seed)) {
    return cf(X(p, i.seed, "seed"), n.ORDER);
  }
  function c(p, w = !0) {
    return e.BASE.multiply(n.fromBytes(p)).toBytes(w);
  }
  function u(p) {
    const { secretKey: w, publicKey: f, publicKeyUncompressed: y } = i;
    if (!xc(p) || "_lengths" in n && n._lengths || w === f)
      return;
    const E = X(p, void 0, "key").length;
    return E === f || E === y;
  }
  function l(p, w, f = !0) {
    if (u(p) === !0)
      throw new Error("first arg must be private key");
    if (u(w) === !1)
      throw new Error("second arg must be public key");
    const y = n.fromBytes(p);
    return e.fromBytes(w).multiply(y).toBytes(f);
  }
  const d = {
    isValidSecretKey: s,
    isValidPublicKey: o,
    randomSecretKey: a
  }, h = df(a, c);
  return Object.freeze({ getPublicKey: c, getSharedSecret: l, keygen: h, Point: e, utils: d, lengths: i });
}
function nw(e, t, n = {}) {
  Hd(t), Tc(n, {}, {
    hmac: "function",
    lowS: "boolean",
    randomBytes: "function",
    bits2int: "function",
    bits2int_modN: "function"
  }), n = Object.assign({}, n);
  const r = n.randomBytes || Nn, i = n.hmac || ((v, b) => hf(t, v, b)), { Fp: s, Fn: o } = e, { ORDER: a, BITS: c } = o, { keygen: u, getPublicKey: l, getSharedSecret: d, utils: h, lengths: p } = ew(e, n), w = {
    prehash: !0,
    lowS: typeof n.lowS == "boolean" ? n.lowS : !0,
    format: "compact",
    extraEntropy: !1
  }, f = a * pf < s.ORDER;
  function y(v) {
    const b = a >> yr;
    return v > b;
  }
  function E(v, b) {
    if (!o.isValidNot0(b))
      throw new Error(`invalid signature ${v}: out of range 1..Point.Fn.ORDER`);
    return b;
  }
  function I() {
    if (f)
      throw new Error('"recovered" sig type is not supported for cofactor >2 curves');
  }
  function O(v, b) {
    $a(b);
    const T = p.signature, k = b === "compact" ? T : b === "recovered" ? T + 1 : void 0;
    return X(v, k);
  }
  class B {
    r;
    s;
    recovery;
    constructor(b, T, k) {
      if (this.r = E("r", b), this.s = E("s", T), k != null) {
        if (I(), ![0, 1, 2, 3].includes(k))
          throw new Error("invalid recovery id");
        this.recovery = k;
      }
      Object.freeze(this);
    }
    static fromBytes(b, T = w.format) {
      O(b, T);
      let k;
      if (T === "der") {
        const { r: R, s: U } = pn.toSig(X(b));
        return new B(R, U);
      }
      T === "recovered" && (k = b[0], T = "compact", b = b.subarray(1));
      const P = p.signature / 2, C = b.subarray(0, P), $ = b.subarray(P, P * 2);
      return new B(o.fromBytes(C), o.fromBytes($), k);
    }
    static fromHex(b, T) {
      return this.fromBytes(Rr(b), T);
    }
    assertRecovery() {
      const { recovery: b } = this;
      if (b == null)
        throw new Error("invalid recovery id: must be present");
      return b;
    }
    addRecoveryBit(b) {
      return new B(this.r, this.s, b);
    }
    recoverPublicKey(b) {
      const { r: T, s: k } = this, P = this.assertRecovery(), C = P === 2 || P === 3 ? T + a : T;
      if (!s.isValid(C))
        throw new Error("invalid recovery id: sig.r+curve.n != R.x");
      const $ = s.toBytes(C), R = e.fromBytes($t(gf((P & 1) === 0), $)), U = o.inv(C), z = V(X(b, void 0, "msgHash")), H = o.create(-z * U), L = o.create(k * U), W = e.BASE.multiplyUnsafe(H).add(R.multiplyUnsafe(L));
      if (W.is0())
        throw new Error("invalid recovery: point at infinify");
      return W.assertValidity(), W;
    }
    // Signatures should be low-s, to prevent malleability.
    hasHighS() {
      return y(this.s);
    }
    toBytes(b = w.format) {
      if ($a(b), b === "der")
        return Rr(pn.hexFromSig(this));
      const { r: T, s: k } = this, P = o.toBytes(T), C = o.toBytes(k);
      return b === "recovered" ? (I(), $t(Uint8Array.of(this.assertRecovery()), P, C)) : $t(P, C);
    }
    toHex(b) {
      return cr(this.toBytes(b));
    }
  }
  const N = n.bits2int || function(b) {
    if (b.length > 8192)
      throw new Error("input is too large");
    const T = on(b), k = b.length * 8 - c;
    return k > 0 ? T >> BigInt(k) : T;
  }, V = n.bits2int_modN || function(b) {
    return o.create(N(b));
  }, g = Ec(c);
  function M(v) {
    return Zd("num < 2^" + c, v, tn, g), o.toBytes(v);
  }
  function _(v, b) {
    return X(v, void 0, "message"), b ? X(t(v), void 0, "prehashed message") : v;
  }
  function F(v, b, T) {
    const { lowS: k, prehash: P, extraEntropy: C } = Go(T, w);
    v = _(v, P);
    const $ = V(v), R = o.fromBytes(b);
    if (!o.isValidNot0(R))
      throw new Error("invalid private key");
    const U = [M(R), M($)];
    if (C != null && C !== !1) {
      const W = C === !0 ? r(p.secretKey) : C;
      U.push(X(W, void 0, "extraEntropy"));
    }
    const z = $t(...U), H = $;
    function L(W) {
      const Y = N(W);
      if (!o.isValidNot0(Y))
        return;
      const nt = o.inv(Y), j = e.BASE.multiply(Y).toAffine(), J = o.create(j.x);
      if (J === tn)
        return;
      const je = o.create(nt * o.create(H + J * R));
      if (je === tn)
        return;
      let Zr = (j.x === J ? 0 : 2) | Number(j.y & yr), Xr = je;
      return k && y(je) && (Xr = o.neg(je), Zr ^= 1), new B(J, Xr, f ? void 0 : Zr);
    }
    return { seed: z, k2sig: L };
  }
  function A(v, b, T = {}) {
    const { seed: k, k2sig: P } = F(v, b, T);
    return Lg(t.outputLen, o.BYTES, i)(k, P).toBytes(T.format);
  }
  function S(v, b, T, k = {}) {
    const { lowS: P, prehash: C, format: $ } = Go(k, w);
    if (T = X(T, void 0, "publicKey"), b = _(b, C), !xc(v)) {
      const R = v instanceof B ? ", use sig.toBytes()" : "";
      throw new Error("verify expects Uint8Array signature" + R);
    }
    O(v, $);
    try {
      const R = B.fromBytes(v, $), U = e.fromBytes(T);
      if (P && R.hasHighS())
        return !1;
      const { r: z, s: H } = R, L = V(b), W = o.inv(H), Y = o.create(L * W), nt = o.create(z * W), j = e.BASE.multiplyUnsafe(Y).add(U.multiplyUnsafe(nt));
      return j.is0() ? !1 : o.create(j.x) === z;
    } catch {
      return !1;
    }
  }
  function m(v, b, T = {}) {
    const { prehash: k } = Go(T, w);
    return b = _(b, k), B.fromBytes(v, "recovered").recoverPublicKey(b).toBytes();
  }
  return Object.freeze({
    keygen: u,
    getPublicKey: l,
    getSharedSecret: d,
    utils: h,
    lengths: p,
    Point: e,
    sign: A,
    verify: S,
    recoverPublicKey: m,
    Signature: B,
    hash: t
  });
}
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const mo = {
  p: BigInt("0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffefffffc2f"),
  n: BigInt("0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141"),
  h: BigInt(1),
  a: BigInt(0),
  b: BigInt(7),
  Gx: BigInt("0x79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798"),
  Gy: BigInt("0x483ada7726a3c4655da4fbfc0e1108a8fd17b448a68554199c47d08ffb10d4b8")
}, rw = {
  beta: BigInt("0x7ae96a2b657c07106e64479eac3434e99cf0497512f58995c1396c28719501ee"),
  basises: [
    [BigInt("0x3086d221a7d46bcde86c90e49284eb15"), -BigInt("0xe4437ed6010e88286f547fa90abfe4c3")],
    [BigInt("0x114ca50f7a8e2f3f657c1108d9d44cfd8"), BigInt("0x3086d221a7d46bcde86c90e49284eb15")]
  ]
}, iw = /* @__PURE__ */ BigInt(0), Oa = /* @__PURE__ */ BigInt(2);
function sw(e) {
  const t = mo.p, n = BigInt(3), r = BigInt(6), i = BigInt(11), s = BigInt(22), o = BigInt(23), a = BigInt(44), c = BigInt(88), u = e * e * e % t, l = u * u * e % t, d = Xt(l, n, t) * l % t, h = Xt(d, n, t) * l % t, p = Xt(h, Oa, t) * u % t, w = Xt(p, i, t) * p % t, f = Xt(w, s, t) * w % t, y = Xt(f, a, t) * f % t, E = Xt(y, c, t) * y % t, I = Xt(E, a, t) * f % t, O = Xt(I, n, t) * l % t, B = Xt(O, o, t) * w % t, N = Xt(B, r, t) * u % t, V = Xt(N, Oa, t);
  if (!$s.eql($s.sqr(V), e))
    throw new Error("Cannot find square root");
  return V;
}
const $s = yo(mo.p, { sqrt: sw }), ur = /* @__PURE__ */ tw(mo, {
  Fp: $s,
  endo: rw
}), bn = /* @__PURE__ */ nw(ur, lt), Vu = {};
function Os(e, ...t) {
  let n = Vu[e];
  if (n === void 0) {
    const r = lt(Ng(e));
    n = $t(r, r), Vu[e] = n;
  }
  return lt($t(n, ...t));
}
const kc = (e) => e.toBytes(!0).slice(1), Ic = (e) => e % Oa === iw;
function Ca(e) {
  const { Fn: t, BASE: n } = ur, r = t.fromBytes(e), i = n.multiply(r);
  return { scalar: Ic(i.y) ? r : t.neg(r), bytes: kc(i) };
}
function yf(e) {
  const t = $s;
  if (!t.isValidNot0(e))
    throw new Error("invalid x: Fail if x ≥ p");
  const n = t.create(e * e), r = t.create(n * e + BigInt(7));
  let i = t.sqrt(r);
  Ic(i) || (i = t.neg(i));
  const s = ur.fromAffine({ x: e, y: i });
  return s.assertValidity(), s;
}
const fi = on;
function mf(...e) {
  return ur.Fn.create(fi(Os("BIP0340/challenge", ...e)));
}
function Fu(e) {
  return Ca(e).bytes;
}
function ow(e, t, n = Nn(32)) {
  const { Fn: r } = ur, i = X(e, void 0, "message"), { bytes: s, scalar: o } = Ca(t), a = X(n, 32, "auxRand"), c = r.toBytes(o ^ fi(Os("BIP0340/aux", a))), u = Os("BIP0340/nonce", c, s, i), { bytes: l, scalar: d } = Ca(u), h = mf(l, s, i), p = new Uint8Array(64);
  if (p.set(l, 0), p.set(r.toBytes(r.create(d + h * o)), 32), !bf(p, i, s))
    throw new Error("sign: Invalid signature produced");
  return p;
}
function bf(e, t, n) {
  const { Fp: r, Fn: i, BASE: s } = ur, o = X(e, 64, "signature"), a = X(t, void 0, "message"), c = X(n, 32, "publicKey");
  try {
    const u = yf(fi(c)), l = fi(o.subarray(0, 32));
    if (!r.isValidNot0(l))
      return !1;
    const d = fi(o.subarray(32, 64));
    if (!i.isValidNot0(d))
      return !1;
    const h = mf(i.toBytes(l), kc(u), a), p = s.multiplyUnsafe(d).add(u.multiplyUnsafe(i.neg(h))), { x: w, y: f } = p.toAffine();
    return !(p.is0() || !Ic(f) || w !== l);
  } catch {
    return !1;
  }
}
const an = /* @__PURE__ */ (() => {
  const n = (r = Nn(48)) => cf(r, mo.n);
  return {
    keygen: df(n, Fu),
    getPublicKey: Fu,
    sign: ow,
    verify: bf,
    Point: ur,
    utils: {
      randomSecretKey: n,
      taggedHash: Os,
      lift_x: yf,
      pointToBytes: kc
    },
    lengths: {
      secretKey: 32,
      publicKey: 32,
      publicKeyHasPrefix: !1,
      signature: 64,
      seed: 48
    }
  };
})(), aw = /* @__PURE__ */ Uint8Array.from([
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
]), xf = Uint8Array.from(new Array(16).fill(0).map((e, t) => t)), cw = xf.map((e) => (9 * e + 5) % 16), vf = /* @__PURE__ */ (() => {
  const n = [[xf], [cw]];
  for (let r = 0; r < 4; r++)
    for (let i of n)
      i.push(i[r].map((s) => aw[s]));
  return n;
})(), Ef = vf[0], Tf = vf[1], Sf = /* @__PURE__ */ [
  [11, 14, 15, 12, 5, 8, 7, 9, 11, 13, 14, 15, 6, 7, 9, 8],
  [12, 13, 11, 15, 6, 9, 9, 7, 12, 15, 11, 13, 7, 8, 7, 7],
  [13, 15, 14, 11, 7, 7, 6, 8, 13, 14, 13, 12, 5, 5, 6, 9],
  [14, 11, 12, 14, 8, 6, 5, 5, 15, 12, 15, 14, 9, 9, 8, 6],
  [15, 12, 13, 13, 9, 5, 8, 6, 14, 11, 12, 11, 8, 6, 5, 5]
].map((e) => Uint8Array.from(e)), uw = /* @__PURE__ */ Ef.map((e, t) => e.map((n) => Sf[t][n])), lw = /* @__PURE__ */ Tf.map((e, t) => e.map((n) => Sf[t][n])), dw = /* @__PURE__ */ Uint32Array.from([
  0,
  1518500249,
  1859775393,
  2400959708,
  2840853838
]), fw = /* @__PURE__ */ Uint32Array.from([
  1352829926,
  1548603684,
  1836072691,
  2053994217,
  0
]);
function Mu(e, t, n, r) {
  return e === 0 ? t ^ n ^ r : e === 1 ? t & n | ~t & r : e === 2 ? (t | ~n) ^ r : e === 3 ? t & r | n & ~r : t ^ (n | ~r);
}
const qi = /* @__PURE__ */ new Uint32Array(16);
class hw extends zd {
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
      qi[p] = t.getUint32(n, !0);
    let r = this.h0 | 0, i = r, s = this.h1 | 0, o = s, a = this.h2 | 0, c = a, u = this.h3 | 0, l = u, d = this.h4 | 0, h = d;
    for (let p = 0; p < 5; p++) {
      const w = 4 - p, f = dw[p], y = fw[p], E = Ef[p], I = Tf[p], O = uw[p], B = lw[p];
      for (let N = 0; N < 16; N++) {
        const V = Wi(r + Mu(p, s, a, u) + qi[E[N]] + f, O[N]) + d | 0;
        r = d, d = u, u = Wi(a, 10) | 0, a = s, s = V;
      }
      for (let N = 0; N < 16; N++) {
        const V = Wi(i + Mu(w, o, c, l) + qi[I[N]] + y, B[N]) + h | 0;
        i = h, h = l, l = Wi(c, 10) | 0, c = o, o = V;
      }
    }
    this.set(this.h1 + a + l | 0, this.h2 + u + h | 0, this.h3 + d + i | 0, this.h4 + r + o | 0, this.h0 + s + c | 0);
  }
  roundClean() {
    Ar(qi);
  }
  destroy() {
    this.destroyed = !0, Ar(this.buffer), this.set(0, 0, 0, 0, 0);
  }
}
const kf = /* @__PURE__ */ Wd(() => new hw());
/*! scure-base - MIT License (c) 2022 Paul Miller (paulmillr.com) */
function Or(e) {
  return e instanceof Uint8Array || ArrayBuffer.isView(e) && e.constructor.name === "Uint8Array";
}
function If(e) {
  if (!Or(e))
    throw new Error("Uint8Array expected");
}
function Af(e, t) {
  return Array.isArray(t) ? t.length === 0 ? !0 : e ? t.every((n) => typeof n == "string") : t.every((n) => Number.isSafeInteger(n)) : !1;
}
function Ac(e) {
  if (typeof e != "function")
    throw new Error("function expected");
  return !0;
}
function Rn(e, t) {
  if (typeof t != "string")
    throw new Error(`${e}: string expected`);
  return !0;
}
function zr(e) {
  if (!Number.isSafeInteger(e))
    throw new Error(`invalid integer: ${e}`);
}
function Cs(e) {
  if (!Array.isArray(e))
    throw new Error("array expected");
}
function Ps(e, t) {
  if (!Af(!0, t))
    throw new Error(`${e}: array of strings expected`);
}
function Rc(e, t) {
  if (!Af(!1, t))
    throw new Error(`${e}: array of numbers expected`);
}
// @__NO_SIDE_EFFECTS__
function Vi(...e) {
  const t = (s) => s, n = (s, o) => (a) => s(o(a)), r = e.map((s) => s.encode).reduceRight(n, t), i = e.map((s) => s.decode).reduce(n, t);
  return { encode: r, decode: i };
}
// @__NO_SIDE_EFFECTS__
function bo(e) {
  const t = typeof e == "string" ? e.split("") : e, n = t.length;
  Ps("alphabet", t);
  const r = new Map(t.map((i, s) => [i, s]));
  return {
    encode: (i) => (Cs(i), i.map((s) => {
      if (!Number.isSafeInteger(s) || s < 0 || s >= n)
        throw new Error(`alphabet.encode: digit index outside alphabet "${s}". Allowed: ${e}`);
      return t[s];
    })),
    decode: (i) => (Cs(i), i.map((s) => {
      Rn("alphabet.decode", s);
      const o = r.get(s);
      if (o === void 0)
        throw new Error(`Unknown letter: "${s}". Allowed: ${e}`);
      return o;
    }))
  };
}
// @__NO_SIDE_EFFECTS__
function xo(e = "") {
  return Rn("join", e), {
    encode: (t) => (Ps("join.decode", t), t.join(e)),
    decode: (t) => (Rn("join.decode", t), t.split(e))
  };
}
// @__NO_SIDE_EFFECTS__
function pw(e, t = "=") {
  return zr(e), Rn("padding", t), {
    encode(n) {
      for (Ps("padding.encode", n); n.length * e % 8; )
        n.push(t);
      return n;
    },
    decode(n) {
      Ps("padding.decode", n);
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
function gw(e) {
  return Ac(e), { encode: (t) => t, decode: (t) => e(t) };
}
function Hu(e, t, n) {
  if (t < 2)
    throw new Error(`convertRadix: invalid from=${t}, base cannot be less than 2`);
  if (n < 2)
    throw new Error(`convertRadix: invalid to=${n}, base cannot be less than 2`);
  if (Cs(e), !e.length)
    return [];
  let r = 0;
  const i = [], s = Array.from(e, (a) => {
    if (zr(a), a < 0 || a >= t)
      throw new Error(`invalid integer: ${a}`);
    return a;
  }), o = s.length;
  for (; ; ) {
    let a = 0, c = !0;
    for (let u = r; u < o; u++) {
      const l = s[u], d = t * a, h = d + l;
      if (!Number.isSafeInteger(h) || d / t !== a || h - l !== d)
        throw new Error("convertRadix: carry overflow");
      const p = h / n;
      a = h % n;
      const w = Math.floor(p);
      if (s[u] = w, !Number.isSafeInteger(w) || w * n + a !== h)
        throw new Error("convertRadix: carry overflow");
      if (c)
        w ? c = !1 : r = u;
      else continue;
    }
    if (i.push(a), c)
      break;
  }
  for (let a = 0; a < e.length - 1 && e[a] === 0; a++)
    i.push(0);
  return i.reverse();
}
const Rf = (e, t) => t === 0 ? e : Rf(t, e % t), Bs = /* @__NO_SIDE_EFFECTS__ */ (e, t) => e + (t - Rf(e, t)), fs = /* @__PURE__ */ (() => {
  let e = [];
  for (let t = 0; t < 40; t++)
    e.push(2 ** t);
  return e;
})();
function Pa(e, t, n, r) {
  if (Cs(e), t <= 0 || t > 32)
    throw new Error(`convertRadix2: wrong from=${t}`);
  if (n <= 0 || n > 32)
    throw new Error(`convertRadix2: wrong to=${n}`);
  if (/* @__PURE__ */ Bs(t, n) > 32)
    throw new Error(`convertRadix2: carry overflow from=${t} to=${n} carryBits=${/* @__PURE__ */ Bs(t, n)}`);
  let i = 0, s = 0;
  const o = fs[t], a = fs[n] - 1, c = [];
  for (const u of e) {
    if (zr(u), u >= o)
      throw new Error(`convertRadix2: invalid data word=${u} from=${t}`);
    if (i = i << t | u, s + t > 32)
      throw new Error(`convertRadix2: carry overflow pos=${s} from=${t}`);
    for (s += t; s >= n; s -= n)
      c.push((i >> s - n & a) >>> 0);
    const l = fs[s];
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
function ww(e) {
  zr(e);
  const t = 2 ** 8;
  return {
    encode: (n) => {
      if (!Or(n))
        throw new Error("radix.encode input should be Uint8Array");
      return Hu(Array.from(n), t, e);
    },
    decode: (n) => (Rc("radix.decode", n), Uint8Array.from(Hu(n, e, t)))
  };
}
// @__NO_SIDE_EFFECTS__
function $c(e, t = !1) {
  if (zr(e), e <= 0 || e > 32)
    throw new Error("radix2: bits should be in (0..32]");
  if (/* @__PURE__ */ Bs(8, e) > 32 || /* @__PURE__ */ Bs(e, 8) > 32)
    throw new Error("radix2: carry overflow");
  return {
    encode: (n) => {
      if (!Or(n))
        throw new Error("radix2.encode input should be Uint8Array");
      return Pa(Array.from(n), 8, e, !t);
    },
    decode: (n) => (Rc("radix2.decode", n), Uint8Array.from(Pa(n, e, 8, t)))
  };
}
function Ku(e) {
  return Ac(e), function(...t) {
    try {
      return e.apply(null, t);
    } catch {
    }
  };
}
function yw(e, t) {
  return zr(e), Ac(t), {
    encode(n) {
      if (!Or(n))
        throw new Error("checksum.encode: input should be Uint8Array");
      const r = t(n).slice(0, e), i = new Uint8Array(n.length + e);
      return i.set(n), i.set(r, n.length), i;
    },
    decode(n) {
      if (!Or(n))
        throw new Error("checksum.decode: input should be Uint8Array");
      const r = n.slice(0, -e), i = n.slice(-e), s = t(r).slice(0, e);
      for (let o = 0; o < e; o++)
        if (s[o] !== i[o])
          throw new Error("Invalid checksum");
      return r;
    }
  };
}
const mw = typeof Uint8Array.from([]).toBase64 == "function" && typeof Uint8Array.fromBase64 == "function", bw = (e, t) => {
  Rn("base64", e);
  const n = /^[A-Za-z0-9=+/]+$/, r = "base64";
  if (e.length > 0 && !n.test(e))
    throw new Error("invalid base64");
  return Uint8Array.fromBase64(e, { alphabet: r, lastChunkHandling: "strict" });
}, G = mw ? {
  encode(e) {
    return If(e), e.toBase64();
  },
  decode(e) {
    return bw(e);
  }
} : /* @__PURE__ */ Vi(/* @__PURE__ */ $c(6), /* @__PURE__ */ bo("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"), /* @__PURE__ */ pw(6), /* @__PURE__ */ xo("")), xw = /* @__NO_SIDE_EFFECTS__ */ (e) => /* @__PURE__ */ Vi(/* @__PURE__ */ ww(58), /* @__PURE__ */ bo(e), /* @__PURE__ */ xo("")), Ci = /* @__PURE__ */ xw("123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"), vw = (e) => /* @__PURE__ */ Vi(yw(4, (t) => e(e(t))), Ci), Ba = /* @__PURE__ */ Vi(/* @__PURE__ */ bo("qpzry9x8gf2tvdw0s3jn54khce6mua7l"), /* @__PURE__ */ xo("")), Wu = [996825010, 642813549, 513874426, 1027748829, 705979059];
function Qr(e) {
  const t = e >> 25;
  let n = (e & 33554431) << 5;
  for (let r = 0; r < Wu.length; r++)
    (t >> r & 1) === 1 && (n ^= Wu[r]);
  return n;
}
function zu(e, t, n = 1) {
  const r = e.length;
  let i = 1;
  for (let s = 0; s < r; s++) {
    const o = e.charCodeAt(s);
    if (o < 33 || o > 126)
      throw new Error(`Invalid prefix (${e})`);
    i = Qr(i) ^ o >> 5;
  }
  i = Qr(i);
  for (let s = 0; s < r; s++)
    i = Qr(i) ^ e.charCodeAt(s) & 31;
  for (let s of t)
    i = Qr(i) ^ s;
  for (let s = 0; s < 6; s++)
    i = Qr(i);
  return i ^= n, Ba.encode(Pa([i % fs[30]], 30, 5, !1));
}
// @__NO_SIDE_EFFECTS__
function $f(e) {
  const t = e === "bech32" ? 1 : 734539939, n = /* @__PURE__ */ $c(5), r = n.decode, i = n.encode, s = Ku(r);
  function o(d, h, p = 90) {
    Rn("bech32.encode prefix", d), Or(h) && (h = Array.from(h)), Rc("bech32.encode", h);
    const w = d.length;
    if (w === 0)
      throw new TypeError(`Invalid prefix length ${w}`);
    const f = w + 7 + h.length;
    if (p !== !1 && f > p)
      throw new TypeError(`Length ${f} exceeds limit ${p}`);
    const y = d.toLowerCase(), E = zu(y, h, t);
    return `${y}1${Ba.encode(h)}${E}`;
  }
  function a(d, h = 90) {
    Rn("bech32.decode input", d);
    const p = d.length;
    if (p < 8 || h !== !1 && p > h)
      throw new TypeError(`invalid string length: ${p} (${d}). Expected (8..${h})`);
    const w = d.toLowerCase();
    if (d !== w && d !== d.toUpperCase())
      throw new Error("String must be lowercase or uppercase");
    const f = w.lastIndexOf("1");
    if (f === 0 || f === -1)
      throw new Error('Letter "1" must be present between prefix and data only');
    const y = w.slice(0, f), E = w.slice(f + 1);
    if (E.length < 6)
      throw new Error("Data must be at least 6 characters long");
    const I = Ba.decode(E).slice(0, -6), O = zu(y, I, t);
    if (!E.endsWith(O))
      throw new Error(`Invalid checksum in ${d}: expected "${O}"`);
    return { prefix: y, words: I };
  }
  const c = Ku(a);
  function u(d) {
    const { prefix: h, words: p } = a(d, !1);
    return { prefix: h, words: p, bytes: r(p) };
  }
  function l(d, h) {
    return o(d, i(h));
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
const Na = /* @__PURE__ */ $f("bech32"), De = /* @__PURE__ */ $f("bech32m"), Ew = {
  encode: (e) => new TextDecoder().decode(e),
  decode: (e) => new TextEncoder().encode(e)
}, Tw = typeof Uint8Array.from([]).toHex == "function" && typeof Uint8Array.fromHex == "function", Sw = {
  encode(e) {
    return If(e), e.toHex();
  },
  decode(e) {
    return Rn("hex", e), Uint8Array.fromHex(e);
  }
}, x = Tw ? Sw : /* @__PURE__ */ Vi(/* @__PURE__ */ $c(4), /* @__PURE__ */ bo("0123456789abcdef"), /* @__PURE__ */ xo(""), /* @__PURE__ */ gw((e) => {
  if (typeof e != "string" || e.length % 2 !== 0)
    throw new TypeError(`hex.decode: expected string, got ${typeof e} with length ${e.length}`);
  return e.toLowerCase();
})), ht = /* @__PURE__ */ Uint8Array.of(), Of = /* @__PURE__ */ Uint8Array.of(0);
function Cr(e, t) {
  if (e.length !== t.length)
    return !1;
  for (let n = 0; n < e.length; n++)
    if (e[n] !== t[n])
      return !1;
  return !0;
}
function ee(e) {
  return e instanceof Uint8Array || ArrayBuffer.isView(e) && e.constructor.name === "Uint8Array";
}
function kw(...e) {
  let t = 0;
  for (let r = 0; r < e.length; r++) {
    const i = e[r];
    if (!ee(i))
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
const Cf = (e) => new DataView(e.buffer, e.byteOffset, e.byteLength);
function Fi(e) {
  return Object.prototype.toString.call(e) === "[object Object]";
}
function He(e) {
  return Number.isSafeInteger(e);
}
const Oc = {
  equalBytes: Cr,
  isBytes: ee,
  concatBytes: kw
}, Pf = (e) => {
  if (e !== null && typeof e != "string" && !ye(e) && !ee(e) && !He(e))
    throw new Error(`lengthCoder: expected null | number | Uint8Array | CoderType, got ${e} (${typeof e})`);
  return {
    encodeStream(t, n) {
      if (e === null)
        return;
      if (ye(e))
        return e.encodeStream(t, n);
      let r;
      if (typeof e == "number" ? r = e : typeof e == "string" && (r = sn.resolve(t.stack, e)), typeof r == "bigint" && (r = Number(r)), r === void 0 || r !== n)
        throw t.err(`Wrong length: ${r} len=${e} exp=${n} (${typeof n})`);
    },
    decodeStream(t) {
      let n;
      if (ye(e) ? n = Number(e.decodeStream(t)) : typeof e == "number" ? n = e : typeof e == "string" && (n = sn.resolve(t.stack, e)), typeof n == "bigint" && (n = Number(n)), typeof n != "number")
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
    for (let h = l; h < d; h++)
      if (!xt.set(e, h, s, i))
        return !1;
    return !(u !== void 0 && a !== u && !xt.set(e, u, s << o - c % o, i));
  }
}, sn = {
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
    const r = new Error(`${e}(${sn.path(t)}): ${typeof n == "string" ? n : n.message}`);
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
class Cc {
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
    this.data = t, this.opts = n, this.stack = r, this.parent = i, this.parentOffset = s, this.view = Cf(t);
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
    return sn.pushObj(this.stack, t, n);
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
        const t = xt.indices(this.bs, this.data.length, !0);
        if (t.length) {
          const n = xt.range(t).map(({ pos: r, length: i }) => `(${r}/${i})[${x.encode(this.data.subarray(r, r + i))}]`).join(", ");
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
    return sn.err("Reader", this.stack, t);
  }
  offsetReader(t) {
    if (t > this.data.length)
      throw this.err("offsetReader: Unexpected end of buffer");
    return new Cc(this.absBytes(t), this.opts, this.stack, this, t);
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
    if (!ee(t))
      throw this.err(`find: needle is not bytes! ${t}`);
    if (this.bitPos)
      throw this.err("findByte: bitPos not empty");
    if (!t.length)
      throw this.err("find: needle is empty");
    for (let r = n; (r = this.data.indexOf(t[0], r)) !== -1; r++) {
      if (r === -1 || this.data.length - r < t.length)
        return;
      if (Cr(t, this.data.subarray(r, r + t.length)))
        return r;
    }
  }
}
class Iw {
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
    this.stack = t, this.view = Cf(this.viewBuf);
  }
  pushObj(t, n) {
    return sn.pushObj(this.stack, t, n);
  }
  writeView(t, n) {
    if (this.finished)
      throw this.err("buffer: finished");
    if (!He(t) || t > 8)
      throw new Error(`wrong writeView length=${t}`);
    n(this.view), this.bytes(this.viewBuf.slice(0, t)), this.viewBuf.fill(0);
  }
  // User methods
  err(t) {
    if (this.finished)
      throw this.err("buffer: finished");
    return sn.err("Reader", this.stack, t);
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
const _a = (e) => Uint8Array.from(e).reverse();
function Aw(e, t, n) {
  if (n) {
    const r = 2n ** (t - 1n);
    if (e < -r || e >= r)
      throw new Error(`value out of signed bounds. Expected ${-r} <= ${e} < ${r}`);
  } else if (0n > e || e >= 2n ** t)
    throw new Error(`value out of unsigned bounds. Expected 0 <= ${e} < ${2n ** t}`);
}
function Bf(e) {
  return {
    // NOTE: we cannot export validate here, since it is likely mistake.
    encodeStream: e.encodeStream,
    decodeStream: e.decodeStream,
    size: e.size,
    encode: (t) => {
      const n = new Iw();
      return e.encodeStream(n, t), n.finish();
    },
    decode: (t, n = {}) => {
      const r = new Cc(t, n), i = e.decodeStream(r);
      return r.finish(), i;
    }
  };
}
function Vt(e, t) {
  if (!ye(e))
    throw new Error(`validate: invalid inner value ${e}`);
  if (typeof t != "function")
    throw new Error("validate: fn should be function");
  return Bf({
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
const Ft = (e) => {
  const t = Bf(e);
  return e.validate ? Vt(t, e.validate) : t;
}, vo = (e) => Fi(e) && typeof e.decode == "function" && typeof e.encode == "function";
function ye(e) {
  return Fi(e) && vo(e) && typeof e.encodeStream == "function" && typeof e.decodeStream == "function" && (e.size === void 0 || He(e.size));
}
function Rw() {
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
      if (!Fi(e))
        throw new Error(`expected plain object, got ${e}`);
      return Object.entries(e);
    }
  };
}
const $w = {
  encode: (e) => {
    if (typeof e != "bigint")
      throw new Error(`expected bigint, got ${typeof e}`);
    if (e > BigInt(Number.MAX_SAFE_INTEGER))
      throw new Error(`element bigger than MAX_SAFE_INTEGER=${e}`);
    return Number(e);
  },
  decode: (e) => {
    if (!He(e))
      throw new Error("element is not a safe integer");
    return BigInt(e);
  }
};
function Ow(e) {
  if (!Fi(e))
    throw new Error("plain object expected");
  return {
    encode: (t) => {
      if (!He(t) || !(t in e))
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
function Cw(e, t = !1) {
  if (!He(e))
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
function Pw(e) {
  if (!Array.isArray(e))
    throw new Error(`expected array, got ${typeof e}`);
  for (const t of e)
    if (!vo(t))
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
const Nf = (e) => {
  if (!vo(e))
    throw new Error("BaseCoder expected");
  return { encode: e.decode, decode: e.encode };
}, Eo = { dict: Rw, numberBigint: $w, tsEnum: Ow, decimal: Cw, match: Pw, reverse: Nf }, Pc = (e, t = !1, n = !1, r = !0) => {
  if (!He(e))
    throw new Error(`bigint/size: wrong value ${e}`);
  if (typeof t != "boolean")
    throw new Error(`bigint/le: expected boolean, got ${typeof t}`);
  if (typeof n != "boolean")
    throw new Error(`bigint/signed: expected boolean, got ${typeof n}`);
  if (typeof r != "boolean")
    throw new Error(`bigint/sized: expected boolean, got ${typeof r}`);
  const i = BigInt(e), s = 2n ** (8n * i - 1n);
  return Ft({
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
      const a = o.bytes(r ? e : Math.min(e, o.leftBytes)), c = t ? a : _a(a);
      let u = 0n;
      for (let l = 0; l < c.length; l++)
        u |= BigInt(c[l]) << 8n * BigInt(l);
      return n && u & s && (u = (u ^ s) - s), u;
    },
    validate: (o) => {
      if (typeof o != "bigint")
        throw new Error(`bigint: invalid value: ${o}`);
      return Aw(o, 8n * i, !!n), o;
    }
  });
}, _f = /* @__PURE__ */ Pc(32, !1), hs = /* @__PURE__ */ Pc(8, !0), Bw = /* @__PURE__ */ Pc(8, !0, !0), Nw = (e, t) => Ft({
  size: e,
  encodeStream: (n, r) => n.writeView(e, (i) => t.write(i, r)),
  decodeStream: (n) => n.readView(e, t.read),
  validate: (n) => {
    if (typeof n != "number")
      throw new Error(`viewCoder: expected number, got ${typeof n}`);
    return t.validate && t.validate(n), n;
  }
}), Mi = (e, t, n) => {
  const r = e * 8, i = 2 ** (r - 1), s = (c) => {
    if (!He(c))
      throw new Error(`sintView: value is not safe integer: ${c}`);
    if (c < -i || c >= i)
      throw new Error(`sintView: value out of bounds. Expected ${-i} <= ${c} < ${i}`);
  }, o = 2 ** r, a = (c) => {
    if (!He(c))
      throw new Error(`uintView: value is not safe integer: ${c}`);
    if (0 > c || c >= o)
      throw new Error(`uintView: value out of bounds. Expected 0 <= ${c} < ${o}`);
  };
  return Nw(e, {
    write: n.write,
    read: n.read,
    validate: t ? s : a
  });
}, it = /* @__PURE__ */ Mi(4, !1, {
  read: (e, t) => e.getUint32(t, !0),
  write: (e, t) => e.setUint32(0, t, !0)
}), _w = /* @__PURE__ */ Mi(4, !1, {
  read: (e, t) => e.getUint32(t, !1),
  write: (e, t) => e.setUint32(0, t, !1)
}), fr = /* @__PURE__ */ Mi(4, !0, {
  read: (e, t) => e.getInt32(t, !0),
  write: (e, t) => e.setInt32(0, t, !0)
}), ju = /* @__PURE__ */ Mi(2, !1, {
  read: (e, t) => e.getUint16(t, !0),
  write: (e, t) => e.setUint16(0, t, !0)
}), vn = /* @__PURE__ */ Mi(1, !1, {
  read: (e, t) => e.getUint8(t),
  write: (e, t) => e.setUint8(0, t)
}), ft = (e, t = !1) => {
  if (typeof t != "boolean")
    throw new Error(`bytes/le: expected boolean, got ${typeof t}`);
  const n = Pf(e), r = ee(e);
  return Ft({
    size: typeof e == "number" ? e : void 0,
    encodeStream: (i, s) => {
      r || n.encodeStream(i, s.length), i.bytes(t ? _a(s) : s), r && i.bytes(e);
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
      return t ? _a(s) : s;
    },
    validate: (i) => {
      if (!ee(i))
        throw new Error(`bytes: invalid value ${i}`);
      return i;
    }
  });
};
function Uw(e, t) {
  if (!ye(t))
    throw new Error(`prefix: invalid inner value ${t}`);
  return $n(ft(e), Nf(t));
}
const Bc = (e, t = !1) => Vt($n(ft(e, t), Ew), (n) => {
  if (typeof n != "string")
    throw new Error(`expected string, got ${typeof n}`);
  return n;
}), Lw = (e, t = { isLE: !1, with0x: !1 }) => {
  let n = $n(ft(e, t.isLE), x);
  const r = t.with0x;
  if (typeof r != "boolean")
    throw new Error(`hex/with0x: expected boolean, got ${typeof r}`);
  return r && (n = $n(n, {
    encode: (i) => `0x${i}`,
    decode: (i) => {
      if (!i.startsWith("0x"))
        throw new Error("hex(with0x=true).encode input should start with 0x");
      return i.slice(2);
    }
  })), n;
};
function $n(e, t) {
  if (!ye(e))
    throw new Error(`apply: invalid inner value ${e}`);
  if (!vo(t))
    throw new Error(`apply: invalid base value ${e}`);
  return Ft({
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
const Dw = (e, t = !1) => {
  if (!ee(e))
    throw new Error(`flag/flagValue: expected Uint8Array, got ${typeof e}`);
  if (typeof t != "boolean")
    throw new Error(`flag/xor: expected boolean, got ${typeof t}`);
  return Ft({
    size: e.length,
    encodeStream: (n, r) => {
      !!r !== t && n.bytes(e);
    },
    decodeStream: (n) => {
      let r = n.leftBytes >= e.length;
      return r && (r = Cr(n.bytes(e.length, !0), e), r && n.bytes(e.length)), r !== t;
    },
    validate: (n) => {
      if (n !== void 0 && typeof n != "boolean")
        throw new Error(`flag: expected boolean value or undefined, got ${typeof n}`);
      return n;
    }
  });
};
function Vw(e, t, n) {
  if (!ye(t))
    throw new Error(`flagged: invalid inner value ${t}`);
  return Ft({
    encodeStream: (r, i) => {
      sn.resolve(r.stack, e) && t.encodeStream(r, i);
    },
    decodeStream: (r) => {
      let i = !1;
      if (i = !!sn.resolve(r.stack, e), i)
        return t.decodeStream(r);
    }
  });
}
function Nc(e, t, n = !0) {
  if (!ye(e))
    throw new Error(`magic: invalid inner value ${e}`);
  if (typeof n != "boolean")
    throw new Error(`magic: expected boolean, got ${typeof n}`);
  return Ft({
    size: e.size,
    encodeStream: (r, i) => e.encodeStream(r, t),
    decodeStream: (r) => {
      const i = e.decodeStream(r);
      if (n && typeof i != "object" && i !== t || ee(t) && !Cr(t, i))
        throw r.err(`magic: invalid value: ${i} !== ${t}`);
    },
    validate: (r) => {
      if (r !== void 0)
        throw new Error(`magic: wrong value=${typeof r}`);
      return r;
    }
  });
}
function Uf(e) {
  let t = 0;
  for (const n of e) {
    if (n.size === void 0)
      return;
    if (!He(n.size))
      throw new Error(`sizeof: wrong element size=${t}`);
    t += n.size;
  }
  return t;
}
function St(e) {
  if (!Fi(e))
    throw new Error(`struct: expected plain object, got ${e}`);
  for (const t in e)
    if (!ye(e[t]))
      throw new Error(`struct: field ${t} is not CoderType`);
  return Ft({
    size: Uf(Object.values(e)),
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
function Fw(e) {
  if (!Array.isArray(e))
    throw new Error(`Packed.Tuple: got ${typeof e} instead of array`);
  for (let t = 0; t < e.length; t++)
    if (!ye(e[t]))
      throw new Error(`tuple: field ${t} is not CoderType`);
  return Ft({
    size: Uf(e),
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
function Dt(e, t) {
  if (!ye(t))
    throw new Error(`array: invalid inner value ${t}`);
  const n = Pf(typeof e == "string" ? `../${e}` : e);
  return Ft({
    size: typeof e == "number" && t.size ? e * t.size : void 0,
    encodeStream: (r, i) => {
      const s = r;
      s.pushObj(i, (o) => {
        ee(e) || n.encodeStream(r, i.length);
        for (let a = 0; a < i.length; a++)
          o(`${a}`, () => {
            const c = i[a], u = r.pos;
            if (t.encodeStream(r, c), ee(e)) {
              if (e.length > s.pos - u)
                return;
              const l = s.finish(!1).subarray(u, s.pos);
              if (Cr(l.subarray(0, e.length), e))
                throw s.err(`array: inner element encoding same as separator. elm=${c} data=${l}`);
            }
          });
      }), ee(e) && r.bytes(e);
    },
    decodeStream: (r) => {
      const i = [];
      return r.pushObj(i, (s) => {
        if (e === null)
          for (let o = 0; !r.isEnd() && (s(`${o}`, () => i.push(t.decodeStream(r))), !(t.size && r.leftBytes < t.size)); o++)
            ;
        else if (ee(e))
          for (let o = 0; ; o++) {
            if (Cr(r.bytes(e.length, !0), e)) {
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
const jr = bn.Point, qu = jr.Fn, Lf = jr.Fn.ORDER, Hi = (e) => e % 2n === 0n, ct = Oc.isBytes, mn = Oc.concatBytes, wt = Oc.equalBytes, Df = (e) => kf(lt(e)), ln = (...e) => lt(lt(mn(...e))), Ua = an.utils.randomSecretKey, _c = an.getPublicKey, Vf = bn.getPublicKey, Gu = (e) => e.r < Lf / 2n;
function Mw(e, t, n = !1) {
  let r = bn.Signature.fromBytes(bn.sign(e, t, { prehash: !1 }));
  if (n && !Gu(r)) {
    const i = new Uint8Array(32);
    let s = 0;
    for (; !Gu(r); )
      if (i.set(it.encode(s++)), r = bn.Signature.fromBytes(bn.sign(e, t, { prehash: !1, extraEntropy: i })), s > 4294967295)
        throw new Error("lowR counter overflow: report the error");
  }
  return r.toBytes("der");
}
const Yu = an.sign, Uc = an.utils.taggedHash, Kt = {
  ecdsa: 0,
  schnorr: 1
};
function Pr(e, t) {
  const n = e.length;
  if (t === Kt.ecdsa) {
    if (n === 32)
      throw new Error("Expected non-Schnorr key");
    return jr.fromBytes(e), e;
  } else if (t === Kt.schnorr) {
    if (n !== 32)
      throw new Error("Expected 32-byte Schnorr key");
    return an.utils.lift_x(on(e)), e;
  } else
    throw new Error("Unknown key type");
}
function Ff(e, t) {
  const r = an.utils.taggedHash("TapTweak", e, t), i = on(r);
  if (i >= Lf)
    throw new Error("tweak higher than curve order");
  return i;
}
function Hw(e, t = Uint8Array.of()) {
  const n = an.utils, r = on(e), i = jr.BASE.multiply(r), s = Hi(i.y) ? r : qu.neg(r), o = n.pointToBytes(i), a = Ff(o, t);
  return Di(qu.add(s, a), 32);
}
function La(e, t) {
  const n = an.utils, r = Ff(e, t), s = n.lift_x(on(e)).add(jr.BASE.multiply(r)), o = Hi(s.y) ? 0 : 1;
  return [n.pointToBytes(s), o];
}
const To = lt(jr.BASE.toBytes(!1)), nr = {
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
function Ns(e, t) {
  if (!ct(e) || !ct(t))
    throw new Error(`cmp: wrong type a=${typeof e} b=${typeof t}`);
  const n = Math.min(e.length, t.length);
  for (let r = 0; r < n; r++)
    if (e[r] != t[r])
      return Math.sign(e[r] - t[r]);
  return Math.sign(e.length - t.length);
}
function Mf(e) {
  const t = {};
  for (const n in e) {
    if (t[e[n]] !== void 0)
      throw new Error("duplicate key");
    t[e[n]] = n;
  }
  return t;
}
const pt = {
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
}, Kw = Mf(pt);
function So(e = 6, t = !1) {
  return Ft({
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
function Ww(e, t = 4, n = !0) {
  if (typeof e == "number")
    return e;
  if (ct(e))
    try {
      const r = So(t, n).decode(e);
      return r > Number.MAX_SAFE_INTEGER ? void 0 : Number(r);
    } catch {
      return;
    }
}
const K = Ft({
  encodeStream: (e, t) => {
    for (let n of t) {
      if (typeof n == "string") {
        if (pt[n] === void 0)
          throw new Error(`Unknown opcode=${n}`);
        e.byte(pt[n]);
        continue;
      } else if (typeof n == "number") {
        if (n === 0) {
          e.byte(0);
          continue;
        } else if (1 <= n && n <= 16) {
          e.byte(pt.OP_1 - 1 + n);
          continue;
        }
      }
      if (typeof n == "number" && (n = So().encode(BigInt(n))), !ct(n))
        throw new Error(`Wrong Script OP=${n} (${typeof n})`);
      const r = n.length;
      r < pt.PUSHDATA1 ? e.byte(r) : r <= 255 ? (e.byte(pt.PUSHDATA1), e.byte(r)) : r <= 65535 ? (e.byte(pt.PUSHDATA2), e.bytes(ju.encode(r))) : (e.byte(pt.PUSHDATA4), e.bytes(it.encode(r))), e.bytes(n);
    }
  },
  decodeStream: (e) => {
    const t = [];
    for (; !e.isEnd(); ) {
      const n = e.byte();
      if (pt.OP_0 < n && n <= pt.PUSHDATA4) {
        let r;
        if (n < pt.PUSHDATA1)
          r = n;
        else if (n === pt.PUSHDATA1)
          r = vn.decodeStream(e);
        else if (n === pt.PUSHDATA2)
          r = ju.decodeStream(e);
        else if (n === pt.PUSHDATA4)
          r = it.decodeStream(e);
        else
          throw new Error("Should be not possible");
        t.push(e.bytes(r));
      } else if (n === 0)
        t.push(0);
      else if (pt.OP_1 <= n && n <= pt.OP_16)
        t.push(n - (pt.OP_1 - 1));
      else {
        const r = Kw[n];
        if (r === void 0)
          throw new Error(`Unknown opcode=${n.toString(16)}`);
        t.push(r);
      }
    }
    return t;
  }
}), Zu = {
  253: [253, 2, 253n, 65535n],
  254: [254, 4, 65536n, 4294967295n],
  255: [255, 8, 4294967296n, 18446744073709551615n]
}, ko = Ft({
  encodeStream: (e, t) => {
    if (typeof t == "number" && (t = BigInt(t)), 0n <= t && t <= 252n)
      return e.byte(Number(t));
    for (const [n, r, i, s] of Object.values(Zu))
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
    const [n, r, i] = Zu[t];
    let s = 0n;
    for (let o = 0; o < r; o++)
      s |= BigInt(e.byte()) << 8n * BigInt(o);
    if (s < i)
      throw e.err(`Wrong CompactSize(${8 * r})`);
    return s;
  }
}), me = $n(ko, Eo.numberBigint), ge = ft(ko), rr = Dt(me, ge), _s = (e) => Dt(ko, e), Hf = St({
  txid: ft(32, !0),
  // hash(prev_tx),
  index: it,
  // output number of previous tx
  finalScriptSig: ge,
  // btc merges input and output script, executes it. If ok = tx passes
  sequence: it
  // ?
}), zn = St({ amount: hs, script: ge }), zw = St({
  version: fr,
  segwitFlag: Dw(new Uint8Array([0, 1])),
  inputs: _s(Hf),
  outputs: _s(zn),
  witnesses: Vw("segwitFlag", Dt("inputs/length", rr)),
  // < 500000000	Block number at which this transaction is unlocked
  // >= 500000000	UNIX timestamp at which this transaction is unlocked
  // Handled as part of PSBTv2
  lockTime: it
});
function jw(e) {
  if (e.segwitFlag && e.witnesses && !e.witnesses.length)
    throw new Error("Segwit flag with empty witnesses array");
  return e;
}
const mr = Vt(zw, jw), ci = St({
  version: fr,
  inputs: _s(Hf),
  outputs: _s(zn),
  lockTime: it
}), Da = Vt(ft(null), (e) => Pr(e, Kt.ecdsa)), Us = Vt(ft(32), (e) => Pr(e, Kt.schnorr)), Xu = Vt(ft(null), (e) => {
  if (e.length !== 64 && e.length !== 65)
    throw new Error("Schnorr signature should be 64 or 65 bytes long");
  return e;
}), Io = St({
  fingerprint: _w,
  path: Dt(null, it)
}), Kf = St({
  hashes: Dt(me, ft(32)),
  der: Io
}), qw = ft(78), Gw = St({ pubKey: Us, leafHash: ft(32) }), Yw = St({
  version: vn,
  // With parity :(
  internalKey: ft(32),
  merklePath: Dt(null, ft(32))
}), Wt = Vt(Yw, (e) => {
  if (e.merklePath.length > 128)
    throw new Error("TaprootControlBlock: merklePath should be of length 0..128 (inclusive)");
  return e;
}), Zw = Dt(null, St({
  depth: vn,
  version: vn,
  script: ge
})), gt = ft(null), Qu = ft(20), Jr = ft(32), Lc = {
  unsignedTx: [0, !1, ci, [0], [0], !1],
  xpub: [1, qw, Io, [], [0, 2], !1],
  txVersion: [2, !1, it, [2], [2], !1],
  fallbackLocktime: [3, !1, it, [], [2], !1],
  inputCount: [4, !1, me, [2], [2], !1],
  outputCount: [5, !1, me, [2], [2], !1],
  txModifiable: [6, !1, vn, [], [2], !1],
  // TODO: bitfield
  version: [251, !1, it, [], [0, 2], !1],
  proprietary: [252, gt, gt, [], [0, 2], !1]
}, Ao = {
  nonWitnessUtxo: [0, !1, mr, [], [0, 2], !1],
  witnessUtxo: [1, !1, zn, [], [0, 2], !1],
  partialSig: [2, Da, gt, [], [0, 2], !1],
  sighashType: [3, !1, it, [], [0, 2], !1],
  redeemScript: [4, !1, gt, [], [0, 2], !1],
  witnessScript: [5, !1, gt, [], [0, 2], !1],
  bip32Derivation: [6, Da, Io, [], [0, 2], !1],
  finalScriptSig: [7, !1, gt, [], [0, 2], !1],
  finalScriptWitness: [8, !1, rr, [], [0, 2], !1],
  porCommitment: [9, !1, gt, [], [0, 2], !1],
  ripemd160: [10, Qu, gt, [], [0, 2], !1],
  sha256: [11, Jr, gt, [], [0, 2], !1],
  hash160: [12, Qu, gt, [], [0, 2], !1],
  hash256: [13, Jr, gt, [], [0, 2], !1],
  txid: [14, !1, Jr, [2], [2], !0],
  index: [15, !1, it, [2], [2], !0],
  sequence: [16, !1, it, [], [2], !0],
  requiredTimeLocktime: [17, !1, it, [], [2], !1],
  requiredHeightLocktime: [18, !1, it, [], [2], !1],
  tapKeySig: [19, !1, Xu, [], [0, 2], !1],
  tapScriptSig: [20, Gw, Xu, [], [0, 2], !1],
  tapLeafScript: [21, Wt, gt, [], [0, 2], !1],
  tapBip32Derivation: [22, Jr, Kf, [], [0, 2], !1],
  tapInternalKey: [23, !1, Us, [], [0, 2], !1],
  tapMerkleRoot: [24, !1, Jr, [], [0, 2], !1],
  proprietary: [252, gt, gt, [], [0, 2], !1]
}, Xw = [
  "txid",
  "sequence",
  "index",
  "witnessUtxo",
  "nonWitnessUtxo",
  "finalScriptSig",
  "finalScriptWitness",
  "unknown"
], Qw = [
  "partialSig",
  "finalScriptSig",
  "finalScriptWitness",
  "tapKeySig",
  "tapScriptSig"
], Br = {
  redeemScript: [0, !1, gt, [], [0, 2], !1],
  witnessScript: [1, !1, gt, [], [0, 2], !1],
  bip32Derivation: [2, Da, Io, [], [0, 2], !1],
  amount: [3, !1, Bw, [2], [2], !0],
  script: [4, !1, gt, [2], [2], !0],
  tapInternalKey: [5, !1, Us, [], [0, 2], !1],
  tapTree: [6, !1, Zw, [], [0, 2], !1],
  tapBip32Derivation: [7, Us, Kf, [], [0, 2], !1],
  proprietary: [252, gt, gt, [], [0, 2], !1]
}, Jw = [], Ju = Dt(Of, St({
  //  <key> := <keylen> <keytype> <keydata> WHERE keylen = len(keytype)+len(keydata)
  key: Uw(me, St({ type: me, key: ft(null) })),
  //  <value> := <valuelen> <valuedata>
  value: ft(me)
}));
function Va(e) {
  const [t, n, r, i, s, o] = e;
  return { type: t, kc: n, vc: r, reqInc: i, allowInc: s, silentIgnore: o };
}
St({ type: me, key: ft(null) });
function Dc(e) {
  const t = {};
  for (const n in e) {
    const [r, i, s] = e[n];
    t[r] = [n, i, s];
  }
  return Ft({
    encodeStream: (n, r) => {
      let i = [];
      for (const s in e) {
        const o = r[s];
        if (o === void 0)
          continue;
        const [a, c, u] = e[s];
        if (!c)
          i.push({ key: { type: a, key: ht }, value: u.encode(o) });
        else {
          const l = o.map(([d, h]) => [
            c.encode(d),
            u.encode(h)
          ]);
          l.sort((d, h) => Ns(d[0], h[0]));
          for (const [d, h] of l)
            i.push({ key: { key: d, type: a }, value: h });
        }
      }
      if (r.unknown) {
        r.unknown.sort((s, o) => Ns(s[0].key, o[0].key));
        for (const [s, o] of r.unknown)
          i.push({ key: s, value: o });
      }
      Ju.encodeStream(n, i);
    },
    decodeStream: (n) => {
      const r = Ju.decodeStream(n), i = {}, s = {};
      for (const o of r) {
        let a = "unknown", c = o.key.key, u = o.value;
        if (t[o.key.type]) {
          const [l, d, h] = t[o.key.type];
          if (a = l, !d && c.length)
            throw new Error(`PSBT: Non-empty key for ${a} (key=${x.encode(c)} value=${x.encode(u)}`);
          if (c = d ? d.decode(c) : void 0, u = h.decode(u), !d) {
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
const Vc = Vt(Dc(Ao), (e) => {
  if (e.finalScriptWitness && !e.finalScriptWitness.length)
    throw new Error("validateInput: empty finalScriptWitness");
  if (e.partialSig && !e.partialSig.length)
    throw new Error("Empty partialSig");
  if (e.partialSig)
    for (const [t] of e.partialSig)
      Pr(t, Kt.ecdsa);
  if (e.bip32Derivation)
    for (const [t] of e.bip32Derivation)
      Pr(t, Kt.ecdsa);
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
}), Fc = Vt(Dc(Br), (e) => {
  if (e.bip32Derivation)
    for (const [t] of e.bip32Derivation)
      Pr(t, Kt.ecdsa);
  return e;
}), Wf = Vt(Dc(Lc), (e) => {
  if ((e.version || 0) === 0) {
    if (!e.unsignedTx)
      throw new Error("PSBTv0: missing unsignedTx");
    for (const n of e.unsignedTx.inputs)
      if (n.finalScriptSig && n.finalScriptSig.length)
        throw new Error("PSBTv0: input scriptSig found in unsignedTx");
  }
  return e;
}), ty = St({
  magic: Nc(Bc(new Uint8Array([255])), "psbt"),
  global: Wf,
  inputs: Dt("global/unsignedTx/inputs/length", Vc),
  outputs: Dt(null, Fc)
}), ey = St({
  magic: Nc(Bc(new Uint8Array([255])), "psbt"),
  global: Wf,
  inputs: Dt("global/inputCount", Vc),
  outputs: Dt("global/outputCount", Fc)
});
St({
  magic: Nc(Bc(new Uint8Array([255])), "psbt"),
  items: Dt(null, $n(Dt(Of, Fw([Lw(me), ft(ko)])), Eo.dict()))
});
function Yo(e, t, n) {
  for (const r in n) {
    if (r === "unknown" || !t[r])
      continue;
    const { allowInc: i } = Va(t[r]);
    if (!i.includes(e))
      throw new Error(`PSBTv${e}: field ${r} is not allowed`);
  }
  for (const r in t) {
    const { reqInc: i } = Va(t[r]);
    if (i.includes(e) && n[r] === void 0)
      throw new Error(`PSBTv${e}: missing required field ${r}`);
  }
}
function tl(e, t, n) {
  const r = {};
  for (const i in n) {
    const s = i;
    if (s !== "unknown") {
      if (!t[s])
        continue;
      const { allowInc: o, silentIgnore: a } = Va(t[s]);
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
function zf(e) {
  const t = e && e.global && e.global.version || 0;
  Yo(t, Lc, e.global);
  for (const o of e.inputs)
    Yo(t, Ao, o);
  for (const o of e.outputs)
    Yo(t, Br, o);
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
function Fa(e, t, n, r, i) {
  const s = { ...n, ...t };
  for (const o in e) {
    const a = o, [c, u, l] = e[a], d = r && !r.includes(o);
    if (t[o] === void 0 && o in t) {
      if (d)
        throw new Error(`Cannot remove signed field=${o}`);
      delete s[o];
    } else if (u) {
      const h = n && n[o] ? n[o] : [];
      let p = t[a];
      if (p) {
        if (!Array.isArray(p))
          throw new Error(`keyMap(${o}): KV pairs should be [k, v][]`);
        p = p.map((y) => {
          if (y.length !== 2)
            throw new Error(`keyMap(${o}): KV pairs should be [k, v][]`);
          return [
            typeof y[0] == "string" ? u.decode(x.decode(y[0])) : y[0],
            typeof y[1] == "string" ? l.decode(x.decode(y[1])) : y[1]
          ];
        });
        const w = {}, f = (y, E, I) => {
          if (w[y] === void 0) {
            w[y] = [E, I];
            return;
          }
          const O = x.encode(l.encode(w[y][1])), B = x.encode(l.encode(I));
          if (O !== B)
            throw new Error(`keyMap(${a}): same key=${y} oldVal=${O} newVal=${B}`);
        };
        for (const [y, E] of h) {
          const I = x.encode(u.encode(y));
          f(I, y, E);
        }
        for (const [y, E] of p) {
          const I = x.encode(u.encode(y));
          if (E === void 0) {
            if (d)
              throw new Error(`Cannot remove signed field=${a}/${y}`);
            delete w[I];
          } else
            f(I, y, E);
        }
        s[a] = Object.values(w);
      }
    } else if (typeof s[o] == "string")
      s[o] = l.decode(x.decode(s[o]));
    else if (d && o in t && n && n[o] !== void 0 && !wt(l.encode(t[o]), l.encode(n[o])))
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
const el = Vt(ty, zf), nl = Vt(ey, zf), ny = {
  encode(e) {
    if (!(e.length !== 2 || e[0] !== 1 || !ct(e[1]) || x.encode(e[1]) !== "4e73"))
      return { type: "p2a", script: K.encode(e) };
  },
  decode: (e) => {
    if (e.type === "p2a")
      return [1, x.decode("4e73")];
  }
};
function hr(e, t) {
  try {
    return Pr(e, t), !0;
  } catch {
    return !1;
  }
}
const ry = {
  encode(e) {
    if (!(e.length !== 2 || !ct(e[0]) || !hr(e[0], Kt.ecdsa) || e[1] !== "CHECKSIG"))
      return { type: "pk", pubkey: e[0] };
  },
  decode: (e) => e.type === "pk" ? [e.pubkey, "CHECKSIG"] : void 0
}, iy = {
  encode(e) {
    if (!(e.length !== 5 || e[0] !== "DUP" || e[1] !== "HASH160" || !ct(e[2])) && !(e[3] !== "EQUALVERIFY" || e[4] !== "CHECKSIG"))
      return { type: "pkh", hash: e[2] };
  },
  decode: (e) => e.type === "pkh" ? ["DUP", "HASH160", e.hash, "EQUALVERIFY", "CHECKSIG"] : void 0
}, sy = {
  encode(e) {
    if (!(e.length !== 3 || e[0] !== "HASH160" || !ct(e[1]) || e[2] !== "EQUAL"))
      return { type: "sh", hash: e[1] };
  },
  decode: (e) => e.type === "sh" ? ["HASH160", e.hash, "EQUAL"] : void 0
}, oy = {
  encode(e) {
    if (!(e.length !== 2 || e[0] !== 0 || !ct(e[1])) && e[1].length === 32)
      return { type: "wsh", hash: e[1] };
  },
  decode: (e) => e.type === "wsh" ? [0, e.hash] : void 0
}, ay = {
  encode(e) {
    if (!(e.length !== 2 || e[0] !== 0 || !ct(e[1])) && e[1].length === 20)
      return { type: "wpkh", hash: e[1] };
  },
  decode: (e) => e.type === "wpkh" ? [0, e.hash] : void 0
}, cy = {
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
        if (!ct(s))
          return;
      return { type: "ms", m: n, pubkeys: i };
    }
  },
  // checkmultisig(n, ..pubkeys, m)
  decode: (e) => e.type === "ms" ? [e.m, ...e.pubkeys, e.pubkeys.length, "CHECKMULTISIG"] : void 0
}, uy = {
  encode(e) {
    if (!(e.length !== 2 || e[0] !== 1 || !ct(e[1])))
      return { type: "tr", pubkey: e[1] };
  },
  decode: (e) => e.type === "tr" ? [1, e.pubkey] : void 0
}, ly = {
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
      if (!ct(i))
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
}, dy = {
  encode(e) {
    const t = e.length - 1;
    if (e[t] !== "NUMEQUAL" || e[1] !== "CHECKSIG")
      return;
    const n = [], r = Ww(e[t - 1]);
    if (typeof r == "number") {
      for (let i = 0; i < t - 1; i++) {
        const s = e[i];
        if (i & 1) {
          if (s !== (i === 1 ? "CHECKSIG" : "CHECKSIGADD"))
            throw new Error("OutScript.encode/tr_ms: wrong element");
          continue;
        }
        if (!ct(s))
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
}, fy = {
  encode(e) {
    return { type: "unknown", script: K.encode(e) };
  },
  decode: (e) => e.type === "unknown" ? K.decode(e.script) : void 0
}, hy = [
  ny,
  ry,
  iy,
  sy,
  oy,
  ay,
  cy,
  uy,
  ly,
  dy,
  fy
], py = $n(K, Eo.match(hy)), dt = Vt(py, (e) => {
  if (e.type === "pk" && !hr(e.pubkey, Kt.ecdsa))
    throw new Error("OutScript/pk: wrong key");
  if ((e.type === "pkh" || e.type === "sh" || e.type === "wpkh") && (!ct(e.hash) || e.hash.length !== 20))
    throw new Error(`OutScript/${e.type}: wrong hash`);
  if (e.type === "wsh" && (!ct(e.hash) || e.hash.length !== 32))
    throw new Error("OutScript/wsh: wrong hash");
  if (e.type === "tr" && (!ct(e.pubkey) || !hr(e.pubkey, Kt.schnorr)))
    throw new Error("OutScript/tr: wrong taproot public key");
  if ((e.type === "ms" || e.type === "tr_ns" || e.type === "tr_ms") && !Array.isArray(e.pubkeys))
    throw new Error("OutScript/multisig: wrong pubkeys array");
  if (e.type === "ms") {
    const t = e.pubkeys.length;
    for (const n of e.pubkeys)
      if (!hr(n, Kt.ecdsa))
        throw new Error("OutScript/multisig: wrong pubkey");
    if (e.m <= 0 || t > 16 || e.m > t)
      throw new Error("OutScript/multisig: invalid params");
  }
  if (e.type === "tr_ns" || e.type === "tr_ms") {
    for (const t of e.pubkeys)
      if (!hr(t, Kt.schnorr))
        throw new Error(`OutScript/${e.type}: wrong pubkey`);
  }
  if (e.type === "tr_ms") {
    const t = e.pubkeys.length;
    if (e.m <= 0 || t > 999 || e.m > t)
      throw new Error("OutScript/tr_ms: invalid params");
  }
  return e;
});
function rl(e, t) {
  if (!wt(e.hash, lt(t)))
    throw new Error("checkScript: wsh wrong witnessScript hash");
  const n = dt.decode(t);
  if (n.type === "tr" || n.type === "tr_ns" || n.type === "tr_ms")
    throw new Error(`checkScript: P2${n.type} cannot be wrapped in P2SH`);
  if (n.type === "wpkh" || n.type === "sh")
    throw new Error(`checkScript: P2${n.type} cannot be wrapped in P2WSH`);
}
function jf(e, t, n) {
  if (e) {
    const r = dt.decode(e);
    if (r.type === "tr_ns" || r.type === "tr_ms" || r.type === "ms" || r.type == "pk")
      throw new Error(`checkScript: non-wrapped ${r.type}`);
    if (r.type === "sh" && t) {
      if (!wt(r.hash, Df(t)))
        throw new Error("checkScript: sh wrong redeemScript hash");
      const i = dt.decode(t);
      if (i.type === "tr" || i.type === "tr_ns" || i.type === "tr_ms")
        throw new Error(`checkScript: P2${i.type} cannot be wrapped in P2SH`);
      if (i.type === "sh")
        throw new Error("checkScript: P2SH cannot be wrapped in P2SH");
    }
    r.type === "wsh" && n && rl(r, n);
  }
  if (t) {
    const r = dt.decode(t);
    r.type === "wsh" && n && rl(r, n);
  }
}
function gy(e) {
  const t = {};
  for (const n of e) {
    const r = x.encode(n);
    if (t[r])
      throw new Error(`Multisig: non-uniq pubkey: ${e.map(x.encode)}`);
    t[r] = !0;
  }
}
function wy(e, t, n = !1, r) {
  const i = dt.decode(e);
  if (i.type === "unknown" && n)
    return;
  if (!["tr_ns", "tr_ms"].includes(i.type))
    throw new Error(`P2TR: invalid leaf script=${i.type}`);
  const s = i;
  if (!n && s.pubkeys)
    for (const o of s.pubkeys) {
      if (wt(o, To))
        throw new Error("Unspendable taproot key in leaf script");
      if (wt(o, t))
        throw new Error("Using P2TR with leaf script with same key as internal key is not supported");
    }
}
function Mc(e) {
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
function Ma(e, t = []) {
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
    left: Ma(e.left, [e.right.hash, ...t]),
    right: Ma(e.right, [e.left.hash, ...t])
  };
}
function Ha(e) {
  if (!e)
    throw new Error("taprootAddPath: empty tree");
  if (e.type === "leaf")
    return [e];
  if (e.type !== "branch")
    throw new Error(`taprootWalkTree: wrong type=${e}`);
  return [...Ha(e.left), ...Ha(e.right)];
}
function Ka(e, t, n = !1, r) {
  if (!e)
    throw new Error("taprootHashTree: empty tree");
  if (Array.isArray(e) && e.length === 1 && (e = e[0]), !Array.isArray(e)) {
    const { leafVersion: c, script: u } = e;
    if (e.tapLeafScript || e.tapMerkleRoot && !wt(e.tapMerkleRoot, ht))
      throw new Error("P2TR: tapRoot leafScript cannot have tree");
    const l = typeof u == "string" ? x.decode(u) : u;
    if (!ct(l))
      throw new Error(`checkScript: wrong script type=${l}`);
    return wy(l, t, n), {
      type: "leaf",
      version: c,
      script: l,
      hash: En(l, c)
    };
  }
  if (e.length !== 2 && (e = Mc(e)), e.length !== 2)
    throw new Error("hashTree: non binary tree!");
  const i = Ka(e[0], t, n), s = Ka(e[1], t, n);
  let [o, a] = [i.hash, s.hash];
  return Ns(a, o) === -1 && ([o, a] = [a, o]), { type: "branch", left: i, right: s, hash: Uc("TapBranch", o, a) };
}
const ir = 192, En = (e, t = ir) => Uc("TapLeaf", new Uint8Array([t]), ge.encode(e));
function qf(e, t, n = nr, r = !1, i) {
  if (!e && !t)
    throw new Error("p2tr: should have pubKey or scriptTree (or both)");
  const s = typeof e == "string" ? x.decode(e) : e || To;
  if (!hr(s, Kt.schnorr))
    throw new Error("p2tr: non-schnorr pubkey");
  if (t) {
    let o = Ma(Ka(t, s, r));
    const a = o.hash, [c, u] = La(s, a), l = Ha(o).map((d) => ({
      ...d,
      controlBlock: Wt.encode({
        version: (d.version || ir) + u,
        internalKey: s,
        merklePath: d.path
      })
    }));
    return {
      type: "tr",
      script: dt.encode({ type: "tr", pubkey: c }),
      address: Yt(n).encode({ type: "tr", pubkey: c }),
      // For tests
      tweakedPubkey: c,
      // PSBT stuff
      tapInternalKey: s,
      leaves: l,
      tapLeafScript: l.map((d) => [
        Wt.decode(d.controlBlock),
        mn(d.script, new Uint8Array([d.version || ir]))
      ]),
      tapMerkleRoot: a
    };
  } else {
    const o = La(s, ht)[0];
    return {
      type: "tr",
      script: dt.encode({ type: "tr", pubkey: o }),
      address: Yt(n).encode({ type: "tr", pubkey: o }),
      // For tests
      tweakedPubkey: o,
      // PSBT stuff
      tapInternalKey: s
    };
  }
}
function Gf(e, t, n = !1) {
  return n || gy(t), {
    type: "tr_ms",
    script: dt.encode({ type: "tr_ms", pubkeys: t, m: e })
  };
}
const Yf = vw(lt);
function Zf(e, t) {
  if (t.length < 2 || t.length > 40)
    throw new Error("Witness: invalid length");
  if (e > 16)
    throw new Error("Witness: invalid version");
  if (e === 0 && !(t.length === 20 || t.length === 32))
    throw new Error("Witness: invalid length for version");
}
function Zo(e, t, n = nr) {
  Zf(e, t);
  const r = e === 0 ? Na : De;
  return r.encode(n.bech32, [e].concat(r.toWords(t)));
}
function il(e, t) {
  return Yf.encode(mn(Uint8Array.from(t), e));
}
function Yt(e = nr) {
  return {
    encode(t) {
      const { type: n } = t;
      if (n === "wpkh")
        return Zo(0, t.hash, e);
      if (n === "wsh")
        return Zo(0, t.hash, e);
      if (n === "tr")
        return Zo(1, t.pubkey, e);
      if (n === "pkh")
        return il(t.hash, [e.pubKeyHash]);
      if (n === "sh")
        return il(t.hash, [e.scriptHash]);
      throw new Error(`Unknown address type=${n}`);
    },
    decode(t) {
      if (t.length < 14 || t.length > 74)
        throw new Error("Invalid address length");
      if (e.bech32 && t.toLowerCase().startsWith(`${e.bech32}1`)) {
        let r;
        try {
          if (r = Na.decode(t), r.words[0] !== 0)
            throw new Error(`bech32: wrong version=${r.words[0]}`);
        } catch {
          if (r = De.decode(t), r.words[0] === 0)
            throw new Error(`bech32m: wrong version=${r.words[0]}`);
        }
        if (r.prefix !== e.bech32)
          throw new Error(`wrong bech32 prefix=${r.prefix}`);
        const [i, ...s] = r.words, o = Na.fromWords(s);
        if (Zf(i, o), i === 0 && o.length === 32)
          return { type: "wsh", hash: o };
        if (i === 0 && o.length === 20)
          return { type: "wpkh", hash: o };
        if (i === 1 && o.length === 32)
          return { type: "tr", pubkey: o };
        throw new Error("Unknown witness program");
      }
      const n = Yf.decode(t);
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
const Gi = new Uint8Array(32), yy = {
  amount: 0xffffffffffffffffn,
  script: ht
}, my = (e) => Math.ceil(e / 4), by = 8, xy = 2, Ln = 0, Ro = 4294967295;
Eo.decimal(by);
const hi = (e, t) => e === void 0 ? t : e;
function Ls(e) {
  if (Array.isArray(e))
    return e.map((t) => Ls(t));
  if (ct(e))
    return Uint8Array.from(e);
  if (["number", "bigint", "boolean", "string", "undefined"].includes(typeof e))
    return e;
  if (e === null)
    return e;
  if (typeof e == "object")
    return Object.fromEntries(Object.entries(e).map(([t, n]) => [t, Ls(n)]));
  throw new Error(`cloneDeep: unknown type=${e} (${typeof e})`);
}
const et = {
  DEFAULT: 0,
  ALL: 1,
  NONE: 2,
  SINGLE: 3,
  ANYONECANPAY: 128
}, It = {
  DEFAULT: et.DEFAULT,
  ALL: et.ALL,
  NONE: et.NONE,
  SINGLE: et.SINGLE,
  DEFAULT_ANYONECANPAY: et.DEFAULT | et.ANYONECANPAY,
  ALL_ANYONECANPAY: et.ALL | et.ANYONECANPAY,
  NONE_ANYONECANPAY: et.NONE | et.ANYONECANPAY,
  SINGLE_ANYONECANPAY: et.SINGLE | et.ANYONECANPAY
}, vy = Mf(It);
function Ey(e, t, n, r = ht) {
  return wt(n, t) && (e = Hw(e, r), t = _c(e)), { privKey: e, pubKey: t };
}
function Dn(e) {
  if (e.script === void 0 || e.amount === void 0)
    throw new Error("Transaction/output: script and amount required");
  return { script: e.script, amount: e.amount };
}
function ti(e) {
  if (e.txid === void 0 || e.index === void 0)
    throw new Error("Transaction/input: txid and index required");
  return {
    txid: e.txid,
    index: e.index,
    sequence: hi(e.sequence, Ro),
    finalScriptSig: hi(e.finalScriptSig, ht)
  };
}
function Xo(e) {
  for (const t in e) {
    const n = t;
    Xw.includes(n) || delete e[n];
  }
}
const Qo = St({ txid: ft(32, !0), index: it });
function Ty(e) {
  if (typeof e != "number" || typeof vy[e] != "string")
    throw new Error(`Invalid SigHash=${e}`);
  return e;
}
function sl(e) {
  const t = e & 31;
  return {
    isAny: !!(e & et.ANYONECANPAY),
    isNone: t === et.NONE,
    isSingle: t === et.SINGLE
  };
}
function Sy(e) {
  if (e !== void 0 && {}.toString.call(e) !== "[object Object]")
    throw new Error(`Wrong object type for transaction options: ${e}`);
  const t = {
    ...e,
    // Defaults
    version: hi(e.version, xy),
    lockTime: hi(e.lockTime, 0),
    PSBTVersion: hi(e.PSBTVersion, 0)
  };
  if (typeof t.allowUnknowInput < "u" && (e.allowUnknownInputs = t.allowUnknowInput), typeof t.allowUnknowOutput < "u" && (e.allowUnknownOutputs = t.allowUnknowOutput), typeof t.lockTime != "number")
    throw new Error("Transaction lock time should be number");
  if (it.encode(t.lockTime), t.PSBTVersion !== 0 && t.PSBTVersion !== 2)
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
function ol(e) {
  if (e.nonWitnessUtxo && e.index !== void 0) {
    const t = e.nonWitnessUtxo.outputs.length - 1;
    if (e.index > t)
      throw new Error(`validateInput: index(${e.index}) not in nonWitnessUtxo`);
    const n = e.nonWitnessUtxo.outputs[e.index];
    if (e.witnessUtxo && (!wt(e.witnessUtxo.script, n.script) || e.witnessUtxo.amount !== n.amount))
      throw new Error("validateInput: witnessUtxo different from nonWitnessUtxo");
    if (e.txid) {
      if (e.nonWitnessUtxo.outputs.length - 1 < e.index)
        throw new Error("nonWitnessUtxo: incorect output index");
      const i = rt.fromRaw(mr.encode(e.nonWitnessUtxo), {
        allowUnknownOutputs: !0,
        disableScriptCheck: !0,
        allowUnknownInputs: !0
      }), s = x.encode(e.txid);
      if (i.isFinal && i.id !== s)
        throw new Error(`nonWitnessUtxo: wrong txid, exp=${s} got=${i.id}`);
    }
  }
  return e;
}
function ps(e) {
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
function al(e, t, n, r = !1, i = !1) {
  let { nonWitnessUtxo: s, txid: o } = e;
  typeof s == "string" && (s = x.decode(s)), ct(s) && (s = mr.decode(s)), !("nonWitnessUtxo" in e) && s === void 0 && (s = t?.nonWitnessUtxo), typeof o == "string" && (o = x.decode(o)), o === void 0 && (o = t?.txid);
  let a = { ...t, ...e, nonWitnessUtxo: s, txid: o };
  !("nonWitnessUtxo" in e) && a.nonWitnessUtxo === void 0 && delete a.nonWitnessUtxo, a.sequence === void 0 && (a.sequence = Ro), a.tapMerkleRoot === null && delete a.tapMerkleRoot, a = Fa(Ao, a, t, n, i), Vc.encode(a);
  let c;
  return a.nonWitnessUtxo && a.index !== void 0 ? c = a.nonWitnessUtxo.outputs[a.index] : a.witnessUtxo && (c = a.witnessUtxo), c && !r && jf(c && c.script, a.redeemScript, a.witnessScript), a;
}
function cl(e, t = !1) {
  let n = "legacy", r = et.ALL;
  const i = ps(e), s = dt.decode(i.script);
  let o = s.type, a = s;
  const c = [s];
  if (s.type === "tr")
    return r = et.DEFAULT, {
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
      let h = dt.decode(e.redeemScript);
      (h.type === "wpkh" || h.type === "wsh") && (n = "segwit"), c.push(h), a = h, o += `-${h.type}`;
    }
    if (a.type === "wsh") {
      if (!e.witnessScript)
        throw new Error("inputType: wsh without witnessScript");
      let h = dt.decode(e.witnessScript);
      h.type === "wsh" && (n = "segwit"), c.push(h), a = h, o += `-${h.type}`;
    }
    const u = c[c.length - 1];
    if (u.type === "sh" || u.type === "wsh")
      throw new Error("inputType: sh/wsh cannot be terminal type");
    const l = dt.encode(u), d = {
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
let rt = class gs {
  global = {};
  inputs = [];
  // use getInput()
  outputs = [];
  // use getOutput()
  opts;
  constructor(t = {}) {
    const n = this.opts = Sy(t);
    n.lockTime !== Ln && (this.global.fallbackLocktime = n.lockTime), this.global.txVersion = n.version;
  }
  // Import
  static fromRaw(t, n = {}) {
    const r = mr.decode(t), i = new gs({ ...n, version: r.version, lockTime: r.lockTime });
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
      r = el.decode(t);
    } catch (d) {
      try {
        r = nl.decode(t);
      } catch {
        throw d;
      }
    }
    const i = r.global.version || 0;
    if (i !== 0 && i !== 2)
      throw new Error(`Wrong PSBT version=${i}`);
    const s = r.global.unsignedTx, o = i === 0 ? s?.version : r.global.txVersion, a = i === 0 ? s?.lockTime : r.global.fallbackLocktime, c = new gs({ ...n, version: o, lockTime: a, PSBTVersion: i }), u = i === 0 ? s?.inputs.length : r.global.inputCount;
    c.inputs = r.inputs.slice(0, u).map((d, h) => ol({
      finalScriptSig: ht,
      ...r.global.unsignedTx?.inputs[h],
      ...d
    }));
    const l = i === 0 ? s?.outputs.length : r.global.outputCount;
    return c.outputs = r.outputs.slice(0, l).map((d, h) => ({
      ...d,
      ...r.global.unsignedTx?.outputs[h]
    })), c.global = { ...r.global, txVersion: o }, a !== Ln && (c.global.fallbackLocktime = a), c;
  }
  toPSBT(t = this.opts.PSBTVersion) {
    if (t !== 0 && t !== 2)
      throw new Error(`Wrong PSBT version=${t}`);
    const n = this.inputs.map((s) => ol(tl(t, Ao, s)));
    for (const s of n)
      s.partialSig && !s.partialSig.length && delete s.partialSig, s.finalScriptSig && !s.finalScriptSig.length && delete s.finalScriptSig, s.finalScriptWitness && !s.finalScriptWitness.length && delete s.finalScriptWitness;
    const r = this.outputs.map((s) => tl(t, Br, s)), i = { ...this.global };
    return t === 0 ? (i.unsignedTx = ci.decode(ci.encode({
      version: this.version,
      lockTime: this.lockTime,
      inputs: this.inputs.map(ti).map((s) => ({
        ...s,
        finalScriptSig: ht
      })),
      outputs: this.outputs.map(Dn)
    })), delete i.fallbackLocktime, delete i.txVersion) : (i.version = t, i.txVersion = this.version, i.inputCount = this.inputs.length, i.outputCount = this.outputs.length, i.fallbackLocktime && i.fallbackLocktime === Ln && delete i.fallbackLocktime), this.opts.bip174jsCompat && (n.length || n.push({}), r.length || r.push({})), (t === 0 ? el : nl).encode({
      global: i,
      inputs: n,
      outputs: r
    });
  }
  // BIP370 lockTime (https://github.com/bitcoin/bips/blob/master/bip-0370.mediawiki#determining-lock-time)
  get lockTime() {
    let t = Ln, n = 0, r = Ln, i = 0;
    for (const s of this.inputs)
      s.requiredHeightLocktime && (t = Math.max(t, s.requiredHeightLocktime), n++), s.requiredTimeLocktime && (r = Math.max(r, s.requiredTimeLocktime), i++);
    return n && n >= i ? t : r !== Ln ? r : this.global.fallbackLocktime || Ln;
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
    const n = this.inputs[t].sighashType, r = n === void 0 ? et.DEFAULT : n, i = r === et.DEFAULT ? et.ALL : r & 3;
    return { sigInputs: r & et.ANYONECANPAY, sigOutputs: i };
  }
  // Very nice for debug purposes, but slow. If there is too much inputs/outputs to add, will be quadratic.
  // Some cache will be nice, but there chance to have bugs with cache invalidation
  signStatus() {
    let t = !0, n = !0, r = [], i = [];
    for (let s = 0; s < this.inputs.length; s++) {
      if (this.inputStatus(s) === "unsigned")
        continue;
      const { sigInputs: a, sigOutputs: c } = this.inputSighash(s);
      if (a === et.ANYONECANPAY ? r.push(s) : t = !1, c === et.ALL)
        n = !1;
      else if (c === et.SINGLE)
        i.push(s);
      else if (c !== et.NONE) throw new Error(`Wrong signature hash output type: ${c}`);
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
    const n = this.outputs.map(Dn);
    t += 4 * me.encode(this.outputs.length).length;
    for (const r of n)
      t += 32 + 4 * ge.encode(r.script).length;
    this.hasWitnesses && (t += 2), t += 4 * me.encode(this.inputs.length).length;
    for (const r of this.inputs)
      t += 160 + 4 * ge.encode(r.finalScriptSig || ht).length, this.hasWitnesses && r.finalScriptWitness && (t += rr.encode(r.finalScriptWitness).length);
    return t;
  }
  get vsize() {
    return my(this.weight);
  }
  toBytes(t = !1, n = !1) {
    return mr.encode({
      version: this.version,
      lockTime: this.lockTime,
      inputs: this.inputs.map(ti).map((r) => ({
        ...r,
        finalScriptSig: t && r.finalScriptSig || ht
      })),
      outputs: this.outputs.map(Dn),
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
    return x.encode(ln(this.toBytes(!0)));
  }
  get id() {
    return x.encode(ln(this.toBytes(!0)).reverse());
  }
  // Input stuff
  checkInputIdx(t) {
    if (!Number.isSafeInteger(t) || 0 > t || t >= this.inputs.length)
      throw new Error(`Wrong input index=${t}`);
  }
  getInput(t) {
    return this.checkInputIdx(t), Ls(this.inputs[t]);
  }
  get inputsLength() {
    return this.inputs.length;
  }
  // Modification
  addInput(t, n = !1) {
    if (!n && !this.signStatus().addInput)
      throw new Error("Tx has signed inputs, cannot add new one");
    return this.inputs.push(al(t, void 0, void 0, this.opts.disableScriptCheck)), this.inputs.length - 1;
  }
  updateInput(t, n, r = !1) {
    this.checkInputIdx(t);
    let i;
    if (!r) {
      const s = this.signStatus();
      (!s.addInput || s.inputs.includes(t)) && (i = Qw);
    }
    this.inputs[t] = al(n, this.inputs[t], i, this.opts.disableScriptCheck, this.opts.allowUnknown);
  }
  // Output stuff
  checkOutputIdx(t) {
    if (!Number.isSafeInteger(t) || 0 > t || t >= this.outputs.length)
      throw new Error(`Wrong output index=${t}`);
  }
  getOutput(t) {
    return this.checkOutputIdx(t), Ls(this.outputs[t]);
  }
  getOutputAddress(t, n = nr) {
    const r = this.getOutput(t);
    if (r.script)
      return Yt(n).encode(dt.decode(r.script));
  }
  get outputsLength() {
    return this.outputs.length;
  }
  normalizeOutput(t, n, r) {
    let { amount: i, script: s } = t;
    if (i === void 0 && (i = n?.amount), typeof i != "bigint")
      throw new Error(`Wrong amount type, should be of type bigint in sats, but got ${i} of type ${typeof i}`);
    typeof s == "string" && (s = x.decode(s)), s === void 0 && (s = n?.script);
    let o = { ...n, ...t, amount: i, script: s };
    if (o.amount === void 0 && delete o.amount, o = Fa(Br, o, n, r, this.opts.allowUnknown), Fc.encode(o), o.script && !this.opts.allowUnknownOutputs && dt.decode(o.script).type === "unknown")
      throw new Error("Transaction/output: unknown output script type, there is a chance that input is unspendable. Pass allowUnknownOutputs=true, if you sure");
    return this.opts.disableScriptCheck || jf(o.script, o.redeemScript, o.witnessScript), o;
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
      (!s.addOutput || s.outputs.includes(t)) && (i = Jw);
    }
    this.outputs[t] = this.normalizeOutput(n, this.outputs[t], i);
  }
  addOutputAddress(t, n, r = nr) {
    return this.addOutput({ script: dt.encode(Yt(r).decode(t)), amount: n });
  }
  // Utils
  get fee() {
    let t = 0n;
    for (const r of this.inputs) {
      const i = ps(r);
      if (!i)
        throw new Error("Empty input amount");
      t += i.amount;
    }
    const n = this.outputs.map(Dn);
    for (const r of n)
      t -= r.amount;
    return t;
  }
  // Signing
  // Based on https://github.com/bitcoin/bitcoin/blob/5871b5b5ab57a0caf9b7514eb162c491c83281d5/test/functional/test_framework/script.py#L624
  // There is optimization opportunity to re-use hashes for multiple inputs for witness v0/v1,
  // but we are trying to be less complicated for audit purpose for now.
  preimageLegacy(t, n, r) {
    const { isAny: i, isNone: s, isSingle: o } = sl(r);
    if (t < 0 || !Number.isSafeInteger(t))
      throw new Error(`Invalid input idx=${t}`);
    if (o && t >= this.outputs.length || t >= this.inputs.length)
      return _f.encode(1n);
    n = K.encode(K.decode(n).filter((l) => l !== "CODESEPARATOR"));
    let a = this.inputs.map(ti).map((l, d) => ({
      ...l,
      finalScriptSig: d === t ? n : ht
    }));
    i ? a = [a[t]] : (s || o) && (a = a.map((l, d) => ({
      ...l,
      sequence: d === t ? l.sequence : 0
    })));
    let c = this.outputs.map(Dn);
    s ? c = [] : o && (c = c.slice(0, t).fill(yy).concat([c[t]]));
    const u = mr.encode({
      lockTime: this.lockTime,
      version: this.version,
      segwitFlag: !1,
      inputs: a,
      outputs: c
    });
    return ln(u, fr.encode(r));
  }
  preimageWitnessV0(t, n, r, i) {
    const { isAny: s, isNone: o, isSingle: a } = sl(r);
    let c = Gi, u = Gi, l = Gi;
    const d = this.inputs.map(ti), h = this.outputs.map(Dn);
    s || (c = ln(...d.map(Qo.encode))), !s && !a && !o && (u = ln(...d.map((w) => it.encode(w.sequence)))), !a && !o ? l = ln(...h.map(zn.encode)) : a && t < h.length && (l = ln(zn.encode(h[t])));
    const p = d[t];
    return ln(fr.encode(this.version), c, u, ft(32, !0).encode(p.txid), it.encode(p.index), ge.encode(n), hs.encode(i), it.encode(p.sequence), l, it.encode(this.lockTime), it.encode(r));
  }
  preimageWitnessV1(t, n, r, i, s = -1, o, a = 192, c) {
    if (!Array.isArray(i) || this.inputs.length !== i.length)
      throw new Error(`Invalid amounts array=${i}`);
    if (!Array.isArray(n) || this.inputs.length !== n.length)
      throw new Error(`Invalid prevOutScript array=${n}`);
    const u = [
      vn.encode(0),
      vn.encode(r),
      // U8 sigHash
      fr.encode(this.version),
      it.encode(this.lockTime)
    ], l = r === et.DEFAULT ? et.ALL : r & 3, d = r & et.ANYONECANPAY, h = this.inputs.map(ti), p = this.outputs.map(Dn);
    d !== et.ANYONECANPAY && u.push(...[
      h.map(Qo.encode),
      i.map(hs.encode),
      n.map(ge.encode),
      h.map((f) => it.encode(f.sequence))
    ].map((f) => lt(mn(...f)))), l === et.ALL && u.push(lt(mn(...p.map(zn.encode))));
    const w = (c ? 1 : 0) | (o ? 2 : 0);
    if (u.push(new Uint8Array([w])), d === et.ANYONECANPAY) {
      const f = h[t];
      u.push(Qo.encode(f), hs.encode(i[t]), ge.encode(n[t]), it.encode(f.sequence));
    } else
      u.push(it.encode(t));
    return w & 1 && u.push(lt(ge.encode(c || ht))), l === et.SINGLE && u.push(t < p.length ? lt(zn.encode(p[t])) : Gi), o && u.push(En(o, a), vn.encode(0), fr.encode(s)), Uc("TapSighash", ...u);
  }
  // Signer can be privateKey OR instance of bip32 HD stuff
  signIdx(t, n, r, i) {
    this.checkInputIdx(n);
    const s = this.inputs[n], o = cl(s, this.opts.allowLegacyWitnessUtxo);
    if (!ct(t)) {
      if (!s.bip32Derivation || !s.bip32Derivation.length)
        throw new Error("bip32Derivation: empty");
      const l = s.bip32Derivation.filter((h) => h[1].fingerprint == t.fingerprint).map(([h, { path: p }]) => {
        let w = t;
        for (const f of p)
          w = w.deriveChild(f);
        if (!wt(w.publicKey, h))
          throw new Error("bip32Derivation: wrong pubKey");
        if (!w.privateKey)
          throw new Error("bip32Derivation: no privateKey");
        return w;
      });
      if (!l.length)
        throw new Error(`bip32Derivation: no items with fingerprint=${t.fingerprint}`);
      let d = !1;
      for (const h of l)
        this.signIdx(h.privateKey, n) && (d = !0);
      return d;
    }
    r ? r.forEach(Ty) : r = [o.defaultSighash];
    const a = o.sighash;
    if (!r.includes(a))
      throw new Error(`Input with not allowed sigHash=${a}. Allowed: ${r.join(", ")}`);
    const { sigOutputs: c } = this.inputSighash(n);
    if (c === et.SINGLE && n >= this.outputs.length)
      throw new Error(`Input with sighash SINGLE, but there is no output with corresponding index=${n}`);
    const u = ps(s);
    if (o.txType === "taproot") {
      const l = this.inputs.map(ps), d = l.map((y) => y.script), h = l.map((y) => y.amount);
      let p = !1, w = _c(t), f = s.tapMerkleRoot || ht;
      if (s.tapInternalKey) {
        const { pubKey: y, privKey: E } = Ey(t, w, s.tapInternalKey, f), [I] = La(s.tapInternalKey, f);
        if (wt(I, y)) {
          const O = this.preimageWitnessV1(n, d, a, h), B = mn(Yu(O, E, i), a !== et.DEFAULT ? new Uint8Array([a]) : ht);
          this.updateInput(n, { tapKeySig: B }, !0), p = !0;
        }
      }
      if (s.tapLeafScript) {
        s.tapScriptSig = s.tapScriptSig || [];
        for (const [y, E] of s.tapLeafScript) {
          const I = E.subarray(0, -1), O = K.decode(I), B = E[E.length - 1], N = En(I, B);
          if (O.findIndex((_) => ct(_) && wt(_, w)) === -1)
            continue;
          const g = this.preimageWitnessV1(n, d, a, h, void 0, I, B), M = mn(Yu(g, t, i), a !== et.DEFAULT ? new Uint8Array([a]) : ht);
          this.updateInput(n, { tapScriptSig: [[{ pubKey: w, leafHash: N }, M]] }, !0), p = !0;
        }
      }
      if (!p)
        throw new Error("No taproot scripts signed");
      return !0;
    } else {
      const l = Vf(t);
      let d = !1;
      const h = Df(l);
      for (const f of K.decode(o.lastScript))
        ct(f) && (wt(f, l) || wt(f, h)) && (d = !0);
      if (!d)
        throw new Error(`Input script doesn't have pubKey: ${o.lastScript}`);
      let p;
      if (o.txType === "legacy")
        p = this.preimageLegacy(n, o.lastScript, a);
      else if (o.txType === "segwit") {
        let f = o.lastScript;
        o.last.type === "wpkh" && (f = dt.encode({ type: "pkh", hash: o.last.hash })), p = this.preimageWitnessV0(n, f, a, u.amount);
      } else
        throw new Error(`Transaction/sign: unknown tx type: ${o.txType}`);
      const w = Mw(p, t, this.opts.lowR);
      this.updateInput(n, {
        partialSig: [[l, mn(w, new Uint8Array([a]))]]
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
    const n = this.inputs[t], r = cl(n, this.opts.allowLegacyWitnessUtxo);
    if (r.txType === "taproot") {
      if (n.tapKeySig)
        n.finalScriptWitness = [n.tapKeySig];
      else if (n.tapLeafScript && n.tapScriptSig) {
        const c = n.tapLeafScript.sort((u, l) => Wt.encode(u[0]).length - Wt.encode(l[0]).length);
        for (const [u, l] of c) {
          const d = l.slice(0, -1), h = l[l.length - 1], p = dt.decode(d), w = En(d, h), f = n.tapScriptSig.filter((E) => wt(E[0].leafHash, w));
          let y = [];
          if (p.type === "tr_ms") {
            const E = p.m, I = p.pubkeys;
            let O = 0;
            for (const B of I) {
              const N = f.findIndex((V) => wt(V[0].pubKey, B));
              if (O === E || N === -1) {
                y.push(ht);
                continue;
              }
              y.push(f[N][1]), O++;
            }
            if (O !== E)
              continue;
          } else if (p.type === "tr_ns") {
            for (const E of p.pubkeys) {
              const I = f.findIndex((O) => wt(O[0].pubKey, E));
              I !== -1 && y.push(f[I][1]);
            }
            if (y.length !== p.pubkeys.length)
              continue;
          } else if (p.type === "unknown" && this.opts.allowUnknownInputs) {
            const E = K.decode(d);
            if (y = f.map(([{ pubKey: I }, O]) => {
              const B = E.findIndex((N) => ct(N) && wt(N, I));
              if (B === -1)
                throw new Error("finalize/taproot: cannot find position of pubkey in script");
              return { signature: O, pos: B };
            }).sort((I, O) => I.pos - O.pos).map((I) => I.signature), !y.length)
              continue;
          } else {
            const E = this.opts.customScripts;
            if (E)
              for (const I of E) {
                if (!I.finalizeTaproot)
                  continue;
                const O = K.decode(d), B = I.encode(O);
                if (B === void 0)
                  continue;
                const N = I.finalizeTaproot(d, B, f);
                if (N) {
                  n.finalScriptWitness = N.concat(Wt.encode(u)), n.finalScriptSig = ht, Xo(n);
                  return;
                }
              }
            throw new Error("Finalize: Unknown tapLeafScript");
          }
          n.finalScriptWitness = y.reverse().concat([d, Wt.encode(u)]);
          break;
        }
        if (!n.finalScriptWitness)
          throw new Error("finalize/taproot: empty witness");
      } else
        throw new Error("finalize/taproot: unknown input");
      n.finalScriptSig = ht, Xo(n);
      return;
    }
    if (!n.partialSig || !n.partialSig.length)
      throw new Error("Not enough partial sign");
    let i = ht, s = [];
    if (r.last.type === "ms") {
      const c = r.last.m, u = r.last.pubkeys;
      let l = [];
      for (const d of u) {
        const h = n.partialSig.find((p) => wt(d, p[0]));
        h && l.push(h[1]);
      }
      if (l = l.slice(0, c), l.length !== c)
        throw new Error(`Multisig: wrong signatures count, m=${c} n=${u.length} signatures=${l.length}`);
      i = K.encode([0, ...l]);
    } else if (r.last.type === "pk")
      i = K.encode([n.partialSig[0][1]]);
    else if (r.last.type === "pkh")
      i = K.encode([n.partialSig[0][1], n.partialSig[0][0]]);
    else if (r.last.type === "wpkh")
      i = ht, s = [n.partialSig[0][1], n.partialSig[0][0]];
    else if (r.last.type === "unknown" && !this.opts.allowUnknownInputs)
      throw new Error("Unknown inputs not allowed");
    let o, a;
    if (r.type.includes("wsh-") && (i.length && r.lastScript.length && (s = K.decode(i).map((c) => {
      if (c === 0)
        return ht;
      if (ct(c))
        return c;
      throw new Error(`Wrong witness op=${c}`);
    })), s = s.concat(r.lastScript)), r.txType === "segwit" && (a = s), r.type.startsWith("sh-wsh-") ? o = K.encode([K.encode([0, lt(r.lastScript)])]) : r.type.startsWith("sh-") ? o = K.encode([...K.decode(i), r.lastScript]) : r.type.startsWith("wsh-") || r.txType !== "segwit" && (o = i), !o && !a)
      throw new Error("Unknown error finalizing input");
    o && (n.finalScriptSig = o), a && (n.finalScriptWitness = a), Xo(n);
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
    const n = this.global.unsignedTx ? ci.encode(this.global.unsignedTx) : ht, r = t.global.unsignedTx ? ci.encode(t.global.unsignedTx) : ht;
    if (!wt(n, r))
      throw new Error("Transaction/combine: different unsigned tx");
    this.global = Fa(Lc, this.global, t.global, void 0, this.opts.allowUnknown);
    for (let i = 0; i < this.inputs.length; i++)
      this.updateInput(i, t.inputs[i], !0);
    for (let i = 0; i < this.outputs.length; i++)
      this.updateOutput(i, t.outputs[i], !0);
    return this;
  }
  clone() {
    return gs.fromPSBT(this.toPSBT(this.opts.PSBTVersion), this.opts);
  }
}, ne = class extends rt {
  constructor(t) {
    super(Jo(t));
  }
  static fromPSBT(t, n) {
    return rt.fromPSBT(t, Jo(n));
  }
  static fromRaw(t, n) {
    return rt.fromRaw(t, Jo(n));
  }
};
ne.ARK_TX_OPTS = {
  allowUnknown: !0,
  allowUnknownOutputs: !0,
  allowUnknownInputs: !0
};
function Jo(e) {
  return { ...ne.ARK_TX_OPTS, ...e };
}
class Hc extends Error {
  idx;
  // Indice of participant
  constructor(t, n) {
    super(n), this.idx = t;
  }
}
const { taggedHash: Xf, pointToBytes: Yi } = an.utils, xe = bn.Point, tt = xe.Fn, Ke = bn.lengths.publicKey, Wa = new Uint8Array(Ke), ul = $n(ft(33), {
  decode: (e) => Pi(e) ? Wa : e.toBytes(!0),
  encode: (e) => Oi(e, Wa) ? xe.ZERO : xe.fromBytes(e)
}), ll = Vt(_f, (e) => (Zd("n", e, 1n, tt.ORDER), e)), br = St({ R1: ul, R2: ul }), Qf = St({ k1: ll, k2: ll, publicKey: ft(Ke) });
function dl(e, ...t) {
}
function te(e, ...t) {
  if (!Array.isArray(e))
    throw new Error("expected array");
  e.forEach((n) => X(n, ...t));
}
function fl(e) {
  if (!Array.isArray(e))
    throw new Error("expected array");
  e.forEach((t, n) => {
    if (typeof t != "boolean")
      throw new Error("expected boolean in xOnly array, got" + t + "(" + n + ")");
  });
}
const Ds = (e, ...t) => tt.create(tt.fromBytes(Xf(e, ...t), !0)), ei = (e, t) => Hi(e.y) ? t : tt.neg(t);
function jn(e) {
  return xe.BASE.multiply(e);
}
function Pi(e) {
  return e.equals(xe.ZERO);
}
function Vs(e) {
  return te(e, Ke), e.sort(Ns);
}
function Jf(e) {
  te(e, Ke);
  for (let t = 1; t < e.length; t++)
    if (!Oi(e[t], e[0]))
      return e[t];
  return Wa;
}
function th(e) {
  return te(e, Ke), Xf("KeyAgg list", ...e);
}
function eh(e, t, n) {
  return X(e, Ke), X(t, Ke), Oi(e, t) ? 1n : Ds("KeyAgg coefficient", n, e);
}
function Bi(e, t = [], n = []) {
  if (te(e, Ke), te(t, 32), t.length !== n.length)
    throw new Error("The tweaks and isXonly arrays must have the same length");
  const r = Jf(e), i = th(e);
  let s = xe.ZERO;
  for (let c = 0; c < e.length; c++) {
    let u;
    try {
      u = xe.fromBytes(e[c]);
    } catch {
      throw new Hc(c, "pubkey");
    }
    s = s.add(u.multiply(eh(e[c], r, i)));
  }
  let o = tt.ONE, a = tt.ZERO;
  for (let c = 0; c < t.length; c++) {
    const u = n[c] && !Hi(s.y) ? tt.neg(tt.ONE) : tt.ONE, l = tt.fromBytes(t[c]);
    if (s = s.multiply(u).add(jn(l)), Pi(s))
      throw new Error("The result of tweaking cannot be infinity");
    o = tt.mul(u, o), a = tt.add(l, tt.mul(u, a));
  }
  return { aggPublicKey: s, gAcc: o, tweakAcc: a };
}
const hl = (e, t, n, r, i, s) => Ds("MuSig/nonce", e, new Uint8Array([t.length]), t, new Uint8Array([n.length]), n, i, Di(s.length, 4), s, new Uint8Array([r]));
function ky(e, t, n = new Uint8Array(0), r, i = new Uint8Array(0), s = Nn(32)) {
  if (X(e, Ke), dl(t, 32), X(n), ![0, 32].includes(n.length))
    throw new Error("wrong aggPublicKey");
  dl(), X(i), X(s, 32);
  const o = Uint8Array.of(0), a = hl(s, e, n, 0, o, i), c = hl(s, e, n, 1, o, i);
  return {
    secret: Qf.encode({ k1: a, k2: c, publicKey: e }),
    public: br.encode({ R1: jn(a), R2: jn(c) })
  };
}
function Iy(e) {
  te(e, 66);
  let t = xe.ZERO, n = xe.ZERO;
  for (let r = 0; r < e.length; r++) {
    const i = e[r];
    try {
      const { R1: s, R2: o } = br.decode(i);
      if (Pi(s) || Pi(o))
        throw new Error("infinity point");
      t = t.add(s), n = n.add(o);
    } catch {
      throw new Hc(r, "pubnonce");
    }
  }
  return br.encode({ R1: t, R2: n });
}
class Ay {
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
    if (te(n, 33), te(i, 32), fl(s), X(r), i.length !== s.length)
      throw new Error("The tweaks and isXonly arrays must have the same length");
    const { aggPublicKey: o, gAcc: a, tweakAcc: c } = Bi(n, i, s), { R1: u, R2: l } = br.decode(t);
    this.publicKeys = n, this.Q = o, this.gAcc = a, this.tweakAcc = c, this.b = Ds("MuSig/noncecoef", t, Yi(o), r);
    const d = u.add(l.multiply(this.b));
    this.R = Pi(d) ? xe.BASE : d, this.e = Ds("BIP0340/challenge", Yi(this.R), Yi(o), r), this.tweaks = i, this.isXonly = s, this.L = th(n), this.secondKey = Jf(n);
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
    if (!n.some((s) => Oi(s, r)))
      throw new Error("The signer's pubkey must be included in the list of pubkeys");
    return eh(r, this.secondKey, this.L);
  }
  partialSigVerifyInternal(t, n, r) {
    const { Q: i, gAcc: s, b: o, R: a, e: c } = this, u = tt.fromBytes(t, !0);
    if (!tt.isValid(u))
      return !1;
    const { R1: l, R2: d } = br.decode(n), h = l.add(d.multiply(o)), p = Hi(a.y) ? h : h.negate(), w = xe.fromBytes(r), f = this.getSessionKeyAggCoeff(w), y = tt.mul(ei(i, 1n), s), E = jn(u), I = p.add(w.multiply(tt.mul(c, tt.mul(f, y))));
    return E.equals(I);
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
    if (X(n, 32), typeof r != "boolean")
      throw new Error("expected boolean");
    const { Q: i, gAcc: s, b: o, R: a, e: c } = this, { k1: u, k2: l, publicKey: d } = Qf.decode(t);
    if (t.fill(0, 0, 64), !tt.isValid(u))
      throw new Error("wrong k1");
    if (!tt.isValid(l))
      throw new Error("wrong k1");
    const h = ei(a, u), p = ei(a, l), w = tt.fromBytes(n);
    if (tt.is0(w))
      throw new Error("wrong d_");
    const f = jn(w), y = f.toBytes(!0);
    if (!Oi(y, d))
      throw new Error("Public key does not match nonceGen argument");
    const E = this.getSessionKeyAggCoeff(f), I = ei(i, 1n), O = tt.mul(I, tt.mul(s, w)), B = tt.add(h, tt.add(tt.mul(o, p), tt.mul(c, tt.mul(E, O)))), N = tt.toBytes(B);
    if (!r) {
      const V = br.encode({
        R1: jn(u),
        R2: jn(l)
      });
      if (!this.partialSigVerifyInternal(N, V, y))
        throw new Error("Partial signature verification failed");
    }
    return N;
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
    if (X(t, 32), te(n, 66), te(i, Ke), te(s, 32), fl(o), be(r), n.length !== i.length)
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
    te(t, 32);
    const { Q: n, tweakAcc: r, R: i, e: s } = this;
    let o = 0n;
    for (let c = 0; c < t.length; c++) {
      const u = tt.fromBytes(t[c], !0);
      if (!tt.isValid(u))
        throw new Hc(c, "psig");
      o = tt.add(o, u);
    }
    const a = ei(n, 1n);
    return o = tt.add(o, tt.mul(s, tt.mul(a, r))), $t(Yi(i), tt.toBytes(o));
  }
}
/*! noble-hashes - MIT License (c) 2022 Paul Miller (paulmillr.com) */
function Kc(e) {
  return e instanceof Uint8Array || ArrayBuffer.isView(e) && e.constructor.name === "Uint8Array";
}
function sr(e, t = "") {
  if (!Number.isSafeInteger(e) || e < 0) {
    const n = t && `"${t}" `;
    throw new Error(`${n}expected integer >0, got ${e}`);
  }
}
function at(e, t, n = "") {
  const r = Kc(e), i = e?.length, s = t !== void 0;
  if (!r || s && i !== t) {
    const o = n && `"${n}" `, a = s ? ` of length ${t}` : "", c = r ? `length=${i}` : `type=${typeof e}`;
    throw new Error(o + "expected Uint8Array" + a + ", got " + c);
  }
  return e;
}
function nh(e) {
  if (typeof e != "function" || typeof e.create != "function")
    throw new Error("Hash must wrapped by utils.createHasher");
  sr(e.outputLen), sr(e.blockLen);
}
function Fs(e, t = !0) {
  if (e.destroyed)
    throw new Error("Hash instance has been destroyed");
  if (t && e.finished)
    throw new Error("Hash#digest() has already been called");
}
function Ry(e, t) {
  at(e, void 0, "digestInto() output");
  const n = t.outputLen;
  if (e.length < n)
    throw new Error('"digestInto() output" expected to be of length >=' + n);
}
function Ms(...e) {
  for (let t = 0; t < e.length; t++)
    e[t].fill(0);
}
function ta(e) {
  return new DataView(e.buffer, e.byteOffset, e.byteLength);
}
function Ie(e, t) {
  return e << 32 - t | e >>> t;
}
const rh = /* @ts-ignore */ typeof Uint8Array.from([]).toHex == "function" && typeof Uint8Array.fromHex == "function", $y = /* @__PURE__ */ Array.from({ length: 256 }, (e, t) => t.toString(16).padStart(2, "0"));
function $o(e) {
  if (at(e), rh)
    return e.toHex();
  let t = "";
  for (let n = 0; n < e.length; n++)
    t += $y[e[n]];
  return t;
}
const Ge = { _0: 48, _9: 57, A: 65, F: 70, a: 97, f: 102 };
function pl(e) {
  if (e >= Ge._0 && e <= Ge._9)
    return e - Ge._0;
  if (e >= Ge.A && e <= Ge.F)
    return e - (Ge.A - 10);
  if (e >= Ge.a && e <= Ge.f)
    return e - (Ge.a - 10);
}
function Hs(e) {
  if (typeof e != "string")
    throw new Error("hex string expected, got " + typeof e);
  if (rh)
    return Uint8Array.fromHex(e);
  const t = e.length, n = t / 2;
  if (t % 2)
    throw new Error("hex string expected, got unpadded hex of length " + t);
  const r = new Uint8Array(n);
  for (let i = 0, s = 0; i < n; i++, s += 2) {
    const o = pl(e.charCodeAt(s)), a = pl(e.charCodeAt(s + 1));
    if (o === void 0 || a === void 0) {
      const c = e[s] + e[s + 1];
      throw new Error('hex string expected, got non-hex character "' + c + '" at index ' + s);
    }
    r[i] = o * 16 + a;
  }
  return r;
}
function Ve(...e) {
  let t = 0;
  for (let r = 0; r < e.length; r++) {
    const i = e[r];
    at(i), t += i.length;
  }
  const n = new Uint8Array(t);
  for (let r = 0, i = 0; r < e.length; r++) {
    const s = e[r];
    n.set(s, i), i += s.length;
  }
  return n;
}
function Oy(e, t = {}) {
  const n = (i, s) => e(s).update(i).digest(), r = e(void 0);
  return n.outputLen = r.outputLen, n.blockLen = r.blockLen, n.create = (i) => e(i), Object.assign(n, t), Object.freeze(n);
}
function Oo(e = 32) {
  const t = typeof globalThis == "object" ? globalThis.crypto : null;
  if (typeof t?.getRandomValues != "function")
    throw new Error("crypto.getRandomValues must be defined");
  return t.getRandomValues(new Uint8Array(e));
}
const Cy = (e) => ({
  oid: Uint8Array.from([6, 9, 96, 134, 72, 1, 101, 3, 4, 2, e])
});
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const Wc = /* @__PURE__ */ BigInt(0), za = /* @__PURE__ */ BigInt(1);
function Ks(e, t = "") {
  if (typeof e != "boolean") {
    const n = t && `"${t}" `;
    throw new Error(n + "expected boolean, got type=" + typeof e);
  }
  return e;
}
function ih(e) {
  if (typeof e == "bigint") {
    if (!ws(e))
      throw new Error("positive bigint expected, got " + e);
  } else
    sr(e);
  return e;
}
function Zi(e) {
  const t = ih(e).toString(16);
  return t.length & 1 ? "0" + t : t;
}
function sh(e) {
  if (typeof e != "string")
    throw new Error("hex string expected, got " + typeof e);
  return e === "" ? Wc : BigInt("0x" + e);
}
function qr(e) {
  return sh($o(e));
}
function oh(e) {
  return sh($o(Py(at(e)).reverse()));
}
function zc(e, t) {
  sr(t), e = ih(e);
  const n = Hs(e.toString(16).padStart(t * 2, "0"));
  if (n.length !== t)
    throw new Error("number too large");
  return n;
}
function ah(e, t) {
  return zc(e, t).reverse();
}
function Py(e) {
  return Uint8Array.from(e);
}
function By(e) {
  return Uint8Array.from(e, (t, n) => {
    const r = t.charCodeAt(0);
    if (t.length !== 1 || r > 127)
      throw new Error(`string contains non-ASCII character "${e[n]}" with code ${r} at position ${n}`);
    return r;
  });
}
const ws = (e) => typeof e == "bigint" && Wc <= e;
function Ny(e, t, n) {
  return ws(e) && ws(t) && ws(n) && t <= e && e < n;
}
function _y(e, t, n, r) {
  if (!Ny(t, n, r))
    throw new Error("expected valid " + e + ": " + n + " <= n < " + r + ", got " + t);
}
function Uy(e) {
  let t;
  for (t = 0; e > Wc; e >>= za, t += 1)
    ;
  return t;
}
const jc = (e) => (za << BigInt(e)) - za;
function Ly(e, t, n) {
  if (sr(e, "hashLen"), sr(t, "qByteLen"), typeof n != "function")
    throw new Error("hmacFn must be a function");
  const r = (y) => new Uint8Array(y), i = Uint8Array.of(), s = Uint8Array.of(0), o = Uint8Array.of(1), a = 1e3;
  let c = r(e), u = r(e), l = 0;
  const d = () => {
    c.fill(1), u.fill(0), l = 0;
  }, h = (...y) => n(u, Ve(c, ...y)), p = (y = i) => {
    u = h(s, y), c = h(), y.length !== 0 && (u = h(o, y), c = h());
  }, w = () => {
    if (l++ >= a)
      throw new Error("drbg: tried max amount of iterations");
    let y = 0;
    const E = [];
    for (; y < t; ) {
      c = h();
      const I = c.slice();
      E.push(I), y += c.length;
    }
    return Ve(...E);
  };
  return (y, E) => {
    d(), p(y);
    let I;
    for (; !(I = E(w())); )
      p();
    return d(), I;
  };
}
function qc(e, t = {}, n = {}) {
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
function gl(e) {
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
const ch = {
  p: 0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffefffffc2fn,
  n: 0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141n,
  h: 1n,
  a: 0n,
  b: 7n,
  Gx: 0x79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798n,
  Gy: 0x483ada7726a3c4655da4fbfc0e1108a8fd17b448a68554199c47d08ffb10d4b8n
}, { p: Tn, n: On, Gx: Dy, Gy: Vy, b: uh } = ch, Tt = 32, or = 64, Ws = {
  publicKey: Tt + 1,
  publicKeyUncompressed: or + 1,
  signature: or,
  seed: Tt + Tt / 2
}, Fy = (...e) => {
  "captureStackTrace" in Error && typeof Error.captureStackTrace == "function" && Error.captureStackTrace(...e);
}, st = (e = "") => {
  const t = new Error(e);
  throw Fy(t, st), t;
}, My = (e) => typeof e == "bigint", Hy = (e) => typeof e == "string", Ky = (e) => e instanceof Uint8Array || ArrayBuffer.isView(e) && e.constructor.name === "Uint8Array", zt = (e, t, n = "") => {
  const r = Ky(e), i = e?.length, s = t !== void 0;
  if (!r || s && i !== t) {
    const o = n && `"${n}" `, a = s ? ` of length ${t}` : "", c = r ? `length=${i}` : `type=${typeof e}`;
    st(o + "expected Uint8Array" + a + ", got " + c);
  }
  return e;
}, Cn = (e) => new Uint8Array(e), lh = (e, t) => e.toString(16).padStart(t, "0"), dh = (e) => Array.from(zt(e)).map((t) => lh(t, 2)).join(""), Ye = { _0: 48, _9: 57, A: 65, F: 70, a: 97, f: 102 }, wl = (e) => {
  if (e >= Ye._0 && e <= Ye._9)
    return e - Ye._0;
  if (e >= Ye.A && e <= Ye.F)
    return e - (Ye.A - 10);
  if (e >= Ye.a && e <= Ye.f)
    return e - (Ye.a - 10);
}, fh = (e) => {
  const t = "hex invalid";
  if (!Hy(e))
    return st(t);
  const n = e.length, r = n / 2;
  if (n % 2)
    return st(t);
  const i = Cn(r);
  for (let s = 0, o = 0; s < r; s++, o += 2) {
    const a = wl(e.charCodeAt(o)), c = wl(e.charCodeAt(o + 1));
    if (a === void 0 || c === void 0)
      return st(t);
    i[s] = a * 16 + c;
  }
  return i;
}, hh = () => globalThis?.crypto, yl = () => hh()?.subtle ?? st("crypto.subtle must be defined, consider polyfill"), We = (...e) => {
  const t = Cn(e.reduce((r, i) => r + zt(i).length, 0));
  let n = 0;
  return e.forEach((r) => {
    t.set(r, n), n += r.length;
  }), t;
}, Co = (e = Tt) => hh().getRandomValues(Cn(e)), Ni = BigInt, ar = (e, t, n, r = "bad number: out of range") => My(e) && t <= e && e < n ? e : st(r), q = (e, t = Tn) => {
  const n = e % t;
  return n >= 0n ? n : t + n;
}, en = (e) => q(e, On), ph = (e, t) => {
  (e === 0n || t <= 0n) && st("no inverse n=" + e + " mod=" + t);
  let n = q(e, t), r = t, i = 0n, s = 1n;
  for (; n !== 0n; ) {
    const o = r / n, a = r % n, c = i - s * o;
    r = n, n = a, i = s, s = c;
  }
  return r === 1n ? q(i, t) : st("no inverse");
}, gh = (e) => {
  const t = Bo[e];
  return typeof t != "function" && st("hashes." + e + " not set"), t;
}, ea = (e) => e instanceof Nt ? e : st("Point expected"), wh = (e) => q(q(e * e) * e + uh), ml = (e) => ar(e, 0n, Tn), ys = (e) => ar(e, 1n, Tn), ja = (e) => ar(e, 1n, On), Nr = (e) => (e & 1n) === 0n, Po = (e) => Uint8Array.of(e), Wy = (e) => Po(Nr(e) ? 2 : 3), yh = (e) => {
  const t = wh(ys(e));
  let n = 1n;
  for (let r = t, i = (Tn + 1n) / 4n; i > 0n; i >>= 1n)
    i & 1n && (n = n * r % Tn), r = r * r % Tn;
  return q(n * n) === t ? n : st("sqrt invalid");
};
class Nt {
  static BASE;
  static ZERO;
  X;
  Y;
  Z;
  constructor(t, n, r) {
    this.X = ml(t), this.Y = ys(n), this.Z = ml(r), Object.freeze(this);
  }
  static CURVE() {
    return ch;
  }
  /** Create 3d xyz point from 2d xy. (0, 0) => (0, 1, 0), not (0, 0, 1) */
  static fromAffine(t) {
    const { x: n, y: r } = t;
    return n === 0n && r === 0n ? Mn : new Nt(n, r, 1n);
  }
  /** Convert Uint8Array or hex string to Point. */
  static fromBytes(t) {
    zt(t);
    const { publicKey: n, publicKeyUncompressed: r } = Ws;
    let i;
    const s = t.length, o = t[0], a = t.subarray(1), c = _r(a, 0, Tt);
    if (s === n && (o === 2 || o === 3)) {
      let u = yh(c);
      const l = Nr(u);
      Nr(Ni(o)) !== l && (u = q(-u)), i = new Nt(c, u, 1n);
    }
    return s === r && o === 4 && (i = new Nt(c, _r(a, Tt, or), 1n)), i ? i.assertValidity() : st("bad point: not on curve");
  }
  static fromHex(t) {
    return Nt.fromBytes(fh(t));
  }
  get x() {
    return this.toAffine().x;
  }
  get y() {
    return this.toAffine().y;
  }
  /** Equality check: compare points P&Q. */
  equals(t) {
    const { X: n, Y: r, Z: i } = this, { X: s, Y: o, Z: a } = ea(t), c = q(n * a), u = q(s * i), l = q(r * a), d = q(o * i);
    return c === u && l === d;
  }
  is0() {
    return this.equals(Mn);
  }
  /** Flip point over y coordinate. */
  negate() {
    return new Nt(this.X, q(-this.Y), this.Z);
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
    const { X: n, Y: r, Z: i } = this, { X: s, Y: o, Z: a } = ea(t), c = 0n, u = uh;
    let l = 0n, d = 0n, h = 0n;
    const p = q(u * 3n);
    let w = q(n * s), f = q(r * o), y = q(i * a), E = q(n + r), I = q(s + o);
    E = q(E * I), I = q(w + f), E = q(E - I), I = q(n + i);
    let O = q(s + a);
    return I = q(I * O), O = q(w + y), I = q(I - O), O = q(r + i), l = q(o + a), O = q(O * l), l = q(f + y), O = q(O - l), h = q(c * I), l = q(p * y), h = q(l + h), l = q(f - h), h = q(f + h), d = q(l * h), f = q(w + w), f = q(f + w), y = q(c * y), I = q(p * I), f = q(f + y), y = q(w - y), y = q(c * y), I = q(I + y), w = q(f * I), d = q(d + w), w = q(O * I), l = q(E * l), l = q(l - w), w = q(E * f), h = q(O * h), h = q(h + w), new Nt(l, d, h);
  }
  subtract(t) {
    return this.add(ea(t).negate());
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
      return Mn;
    if (ja(t), t === 1n)
      return this;
    if (this.equals(Pn))
      return wm(t).p;
    let r = Mn, i = Pn;
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
    if (this.equals(Mn))
      return { x: 0n, y: 0n };
    if (r === 1n)
      return { x: t, y: n };
    const i = ph(r, Tn);
    return q(r * i) !== 1n && st("inverse invalid"), { x: q(t * i), y: q(n * i) };
  }
  /** Checks if the point is valid and on-curve. */
  assertValidity() {
    const { x: t, y: n } = this.toAffine();
    return ys(t), ys(n), q(n * n) === wh(t) ? this : st("bad point: not on curve");
  }
  /** Converts point to 33/65-byte Uint8Array. */
  toBytes(t = !0) {
    const { x: n, y: r } = this.assertValidity().toAffine(), i = Zt(n);
    return t ? We(Wy(r), i) : We(Po(4), i, Zt(r));
  }
  toHex(t) {
    return dh(this.toBytes(t));
  }
}
const Pn = new Nt(Dy, Vy, 1n), Mn = new Nt(0n, 1n, 0n);
Nt.BASE = Pn;
Nt.ZERO = Mn;
const zy = (e, t, n) => Pn.multiply(t, !1).add(e.multiply(n, !1)).assertValidity(), _n = (e) => Ni("0x" + (dh(e) || "0")), _r = (e, t, n) => _n(e.subarray(t, n)), jy = 2n ** 256n, Zt = (e) => fh(lh(ar(e, 0n, jy), or)), mh = (e) => {
  const t = _n(zt(e, Tt, "secret key"));
  return ar(t, 1n, On, "invalid secret key: outside of range");
}, bh = (e) => e > On >> 1n, qy = (e) => {
  [0, 1, 2, 3].includes(e) || st("recovery id must be valid and present");
}, Gy = (e) => {
  e != null && !bl.includes(e) && st(`Signature format must be one of: ${bl.join(", ")}`), e === vh && st('Signature format "der" is not supported: switch to noble-curves');
}, Yy = (e, t = Ur) => {
  Gy(t);
  const n = Ws.signature, r = n + 1;
  let i = `Signature format "${t}" expects Uint8Array with length `;
  t === Ur && e.length !== n && st(i + n), t === js && e.length !== r && st(i + r);
};
class zs {
  r;
  s;
  recovery;
  constructor(t, n, r) {
    this.r = ja(t), this.s = ja(n), r != null && (this.recovery = r), Object.freeze(this);
  }
  static fromBytes(t, n = Ur) {
    Yy(t, n);
    let r;
    n === js && (r = t[0], t = t.subarray(1));
    const i = _r(t, 0, Tt), s = _r(t, Tt, or);
    return new zs(i, s, r);
  }
  addRecoveryBit(t) {
    return new zs(this.r, this.s, t);
  }
  hasHighS() {
    return bh(this.s);
  }
  toBytes(t = Ur) {
    const { r: n, s: r, recovery: i } = this, s = We(Zt(n), Zt(r));
    return t === js ? (qy(i), We(Uint8Array.of(i), s)) : s;
  }
}
const xh = (e) => {
  const t = e.length * 8 - 256;
  t > 1024 && st("msg invalid");
  const n = _n(e);
  return t > 0 ? n >> Ni(t) : n;
}, Zy = (e) => en(xh(zt(e))), Ur = "compact", js = "recovered", vh = "der", bl = [Ur, js, vh], xl = {
  lowS: !0,
  prehash: !0,
  format: Ur,
  extraEntropy: !1
}, vl = "SHA-256", Bo = {
  hmacSha256Async: async (e, t) => {
    const n = yl(), r = "HMAC", i = await n.importKey("raw", e, { name: r, hash: { name: vl } }, !1, ["sign"]);
    return Cn(await n.sign(r, i, t));
  },
  hmacSha256: void 0,
  sha256Async: async (e) => Cn(await yl().digest(vl, e)),
  sha256: void 0
}, Xy = (e, t, n) => (zt(e, void 0, "message"), t.prehash ? n ? Bo.sha256Async(e) : gh("sha256")(e) : e), Qy = Cn(0), Jy = Po(0), tm = Po(1), em = 1e3, nm = "drbg: tried max amount of iterations", rm = async (e, t) => {
  let n = Cn(Tt), r = Cn(Tt), i = 0;
  const s = () => {
    n.fill(1), r.fill(0);
  }, o = (...l) => Bo.hmacSha256Async(r, We(n, ...l)), a = async (l = Qy) => {
    r = await o(Jy, l), n = await o(), l.length !== 0 && (r = await o(tm, l), n = await o());
  }, c = async () => (i++ >= em && st(nm), n = await o(), n);
  s(), await a(e);
  let u;
  for (; !(u = t(await c())); )
    await a();
  return s(), u;
}, im = (e, t, n, r) => {
  let { lowS: i, extraEntropy: s } = n;
  const o = Zt, a = Zy(e), c = o(a), u = mh(t), l = [o(u), c];
  if (s != null && s !== !1) {
    const w = s === !0 ? Co(Tt) : s;
    l.push(zt(w, void 0, "extraEntropy"));
  }
  const d = We(...l), h = a;
  return r(d, (w) => {
    const f = xh(w);
    if (!(1n <= f && f < On))
      return;
    const y = ph(f, On), E = Pn.multiply(f).toAffine(), I = en(E.x);
    if (I === 0n)
      return;
    const O = en(y * en(h + I * u));
    if (O === 0n)
      return;
    let B = (E.x === I ? 0 : 2) | Number(E.y & 1n), N = O;
    return i && bh(O) && (N = en(-O), B ^= 1), new zs(I, N, B).toBytes(n.format);
  });
}, sm = (e) => {
  const t = {};
  return Object.keys(xl).forEach((n) => {
    t[n] = e[n] ?? xl[n];
  }), t;
}, om = async (e, t, n = {}) => (n = sm(n), e = await Xy(e, n, !0), im(e, t, n, rm)), am = (e = Co(Ws.seed)) => {
  zt(e), (e.length < Ws.seed || e.length > 1024) && st("expected 40-1024b");
  const t = q(_n(e), On - 1n);
  return Zt(t + 1n);
}, cm = (e) => (t) => {
  const n = am(t);
  return { secretKey: n, publicKey: e(n) };
}, Eh = (e) => Uint8Array.from("BIP0340/" + e, (t) => t.charCodeAt(0)), Th = "aux", Sh = "nonce", kh = "challenge", qa = (e, ...t) => {
  const n = gh("sha256"), r = n(Eh(e));
  return n(We(r, r, ...t));
}, Ga = async (e, ...t) => {
  const n = Bo.sha256Async, r = await n(Eh(e));
  return await n(We(r, r, ...t));
}, Gc = (e) => {
  const t = mh(e), n = Pn.multiply(t), { x: r, y: i } = n.assertValidity().toAffine(), s = Nr(i) ? t : en(-t), o = Zt(r);
  return { d: s, px: o };
}, Yc = (e) => en(_n(e)), Ih = (...e) => Yc(qa(kh, ...e)), Ah = async (...e) => Yc(await Ga(kh, ...e)), Rh = (e) => Gc(e).px, um = cm(Rh), $h = (e, t, n) => {
  const { px: r, d: i } = Gc(t);
  return { m: zt(e), px: r, d: i, a: zt(n, Tt) };
}, Oh = (e) => {
  const t = Yc(e);
  t === 0n && st("sign failed: k is zero");
  const { px: n, d: r } = Gc(Zt(t));
  return { rx: n, k: r };
}, Ch = (e, t, n, r) => We(t, Zt(en(e + n * r))), Ph = "invalid signature produced", lm = (e, t, n = Co(Tt)) => {
  const { m: r, px: i, d: s, a: o } = $h(e, t, n), a = qa(Th, o), c = Zt(s ^ _n(a)), u = qa(Sh, c, i, r), { rx: l, k: d } = Oh(u), h = Ih(l, i, r), p = Ch(d, l, h, s);
  return Nh(p, r, i) || st(Ph), p;
}, dm = async (e, t, n = Co(Tt)) => {
  const { m: r, px: i, d: s, a: o } = $h(e, t, n), a = await Ga(Th, o), c = Zt(s ^ _n(a)), u = await Ga(Sh, c, i, r), { rx: l, k: d } = Oh(u), h = await Ah(l, i, r), p = Ch(d, l, h, s);
  return await _h(p, r, i) || st(Ph), p;
}, fm = (e, t) => e instanceof Promise ? e.then(t) : t(e), Bh = (e, t, n, r) => {
  const i = zt(e, or, "signature"), s = zt(t, void 0, "message"), o = zt(n, Tt, "publicKey");
  try {
    const a = _n(o), c = yh(a), u = Nr(c) ? c : q(-c), l = new Nt(a, u, 1n).assertValidity(), d = Zt(l.toAffine().x), h = _r(i, 0, Tt);
    ar(h, 1n, Tn);
    const p = _r(i, Tt, or);
    ar(p, 1n, On);
    const w = We(Zt(h), d, s);
    return fm(r(w), (f) => {
      const { x: y, y: E } = zy(l, p, en(-f)).toAffine();
      return !(!Nr(E) || y !== h);
    });
  } catch {
    return !1;
  }
}, Nh = (e, t, n) => Bh(e, t, n, Ih), _h = async (e, t, n) => Bh(e, t, n, Ah), hm = {
  keygen: um,
  getPublicKey: Rh,
  sign: lm,
  verify: Nh,
  signAsync: dm,
  verifyAsync: _h
}, qs = 8, pm = 256, Uh = Math.ceil(pm / qs) + 1, Ya = 2 ** (qs - 1), gm = () => {
  const e = [];
  let t = Pn, n = t;
  for (let r = 0; r < Uh; r++) {
    n = t, e.push(n);
    for (let i = 1; i < Ya; i++)
      n = n.add(t), e.push(n);
    t = n.double();
  }
  return e;
};
let El;
const Tl = (e, t) => {
  const n = t.negate();
  return e ? n : t;
}, wm = (e) => {
  const t = El || (El = gm());
  let n = Mn, r = Pn;
  const i = 2 ** qs, s = i, o = Ni(i - 1), a = Ni(qs);
  for (let c = 0; c < Uh; c++) {
    let u = Number(e & o);
    e >>= a, u > Ya && (u -= s, e += 1n);
    const l = c * Ya, d = l, h = l + Math.abs(u) - 1, p = c % 2 !== 0, w = u < 0;
    u === 0 ? r = r.add(Tl(p, t[d])) : n = n.add(Tl(w, t[h]));
  }
  return e !== 0n && st("invalid wnaf"), { p: n, f: r };
};
function ym(e, t, n) {
  return e & t ^ ~e & n;
}
function mm(e, t, n) {
  return e & t ^ e & n ^ t & n;
}
class bm {
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
    this.blockLen = t, this.outputLen = n, this.padOffset = r, this.isLE = i, this.buffer = new Uint8Array(t), this.view = ta(this.buffer);
  }
  update(t) {
    Fs(this), at(t);
    const { view: n, buffer: r, blockLen: i } = this, s = t.length;
    for (let o = 0; o < s; ) {
      const a = Math.min(i - this.pos, s - o);
      if (a === i) {
        const c = ta(t);
        for (; i <= s - o; o += i)
          this.process(c, o);
        continue;
      }
      r.set(t.subarray(o, o + a), this.pos), this.pos += a, o += a, this.pos === i && (this.process(n, 0), this.pos = 0);
    }
    return this.length += t.length, this.roundClean(), this;
  }
  digestInto(t) {
    Fs(this), Ry(t, this), this.finished = !0;
    const { buffer: n, view: r, blockLen: i, isLE: s } = this;
    let { pos: o } = this;
    n[o++] = 128, Ms(this.buffer.subarray(o)), this.padOffset > i - o && (this.process(r, 0), o = 0);
    for (let d = o; d < i; d++)
      n[d] = 0;
    r.setBigUint64(i - 8, BigInt(this.length * 8), s), this.process(r, 0);
    const a = ta(t), c = this.outputLen;
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
const dn = /* @__PURE__ */ Uint32Array.from([
  1779033703,
  3144134277,
  1013904242,
  2773480762,
  1359893119,
  2600822924,
  528734635,
  1541459225
]), xm = /* @__PURE__ */ Uint32Array.from([
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
]), fn = /* @__PURE__ */ new Uint32Array(64);
class vm extends bm {
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
      fn[d] = t.getUint32(n, !1);
    for (let d = 16; d < 64; d++) {
      const h = fn[d - 15], p = fn[d - 2], w = Ie(h, 7) ^ Ie(h, 18) ^ h >>> 3, f = Ie(p, 17) ^ Ie(p, 19) ^ p >>> 10;
      fn[d] = f + fn[d - 7] + w + fn[d - 16] | 0;
    }
    let { A: r, B: i, C: s, D: o, E: a, F: c, G: u, H: l } = this;
    for (let d = 0; d < 64; d++) {
      const h = Ie(a, 6) ^ Ie(a, 11) ^ Ie(a, 25), p = l + h + ym(a, c, u) + xm[d] + fn[d] | 0, f = (Ie(r, 2) ^ Ie(r, 13) ^ Ie(r, 22)) + mm(r, i, s) | 0;
      l = u, u = c, c = a, a = o + p | 0, o = s, s = i, i = r, r = p + f | 0;
    }
    r = r + this.A | 0, i = i + this.B | 0, s = s + this.C | 0, o = o + this.D | 0, a = a + this.E | 0, c = c + this.F | 0, u = u + this.G | 0, l = l + this.H | 0, this.set(r, i, s, o, a, c, u, l);
  }
  roundClean() {
    Ms(fn);
  }
  destroy() {
    this.set(0, 0, 0, 0, 0, 0, 0, 0), Ms(this.buffer);
  }
}
class Em extends vm {
  // We cannot use array here since array allows indexing by variable
  // which means optimizer/compiler cannot use registers.
  A = dn[0] | 0;
  B = dn[1] | 0;
  C = dn[2] | 0;
  D = dn[3] | 0;
  E = dn[4] | 0;
  F = dn[5] | 0;
  G = dn[6] | 0;
  H = dn[7] | 0;
  constructor() {
    super(32);
  }
}
const Za = /* @__PURE__ */ Oy(
  () => new Em(),
  /* @__PURE__ */ Cy(1)
);
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const Ut = /* @__PURE__ */ BigInt(0), Ct = /* @__PURE__ */ BigInt(1), qn = /* @__PURE__ */ BigInt(2), Lh = /* @__PURE__ */ BigInt(3), Dh = /* @__PURE__ */ BigInt(4), Vh = /* @__PURE__ */ BigInt(5), Tm = /* @__PURE__ */ BigInt(7), Fh = /* @__PURE__ */ BigInt(8), Sm = /* @__PURE__ */ BigInt(9), Mh = /* @__PURE__ */ BigInt(16);
function he(e, t) {
  const n = e % t;
  return n >= Ut ? n : t + n;
}
function Qt(e, t, n) {
  let r = e;
  for (; t-- > Ut; )
    r *= r, r %= n;
  return r;
}
function Sl(e, t) {
  if (e === Ut)
    throw new Error("invert: expected non-zero number");
  if (t <= Ut)
    throw new Error("invert: expected positive modulus, got " + t);
  let n = he(e, t), r = t, i = Ut, s = Ct;
  for (; n !== Ut; ) {
    const a = r / n, c = r % n, u = i - s * a;
    r = n, n = c, i = s, s = u;
  }
  if (r !== Ct)
    throw new Error("invert: does not exist");
  return he(i, t);
}
function Zc(e, t, n) {
  if (!e.eql(e.sqr(t), n))
    throw new Error("Cannot find square root");
}
function Hh(e, t) {
  const n = (e.ORDER + Ct) / Dh, r = e.pow(t, n);
  return Zc(e, r, t), r;
}
function km(e, t) {
  const n = (e.ORDER - Vh) / Fh, r = e.mul(t, qn), i = e.pow(r, n), s = e.mul(t, i), o = e.mul(e.mul(s, qn), i), a = e.mul(s, e.sub(o, e.ONE));
  return Zc(e, a, t), a;
}
function Im(e) {
  const t = No(e), n = Kh(e), r = n(t, t.neg(t.ONE)), i = n(t, r), s = n(t, t.neg(r)), o = (e + Tm) / Mh;
  return (a, c) => {
    let u = a.pow(c, o), l = a.mul(u, r);
    const d = a.mul(u, i), h = a.mul(u, s), p = a.eql(a.sqr(l), c), w = a.eql(a.sqr(d), c);
    u = a.cmov(u, l, p), l = a.cmov(h, d, w);
    const f = a.eql(a.sqr(l), c), y = a.cmov(u, l, f);
    return Zc(a, y, c), y;
  };
}
function Kh(e) {
  if (e < Lh)
    throw new Error("sqrt is not defined for small field");
  let t = e - Ct, n = 0;
  for (; t % qn === Ut; )
    t /= qn, n++;
  let r = qn;
  const i = No(e);
  for (; kl(i, r) === 1; )
    if (r++ > 1e3)
      throw new Error("Cannot find square root: probably non-prime P");
  if (n === 1)
    return Hh;
  let s = i.pow(r, t);
  const o = (t + Ct) / qn;
  return function(c, u) {
    if (c.is0(u))
      return u;
    if (kl(c, u) !== 1)
      throw new Error("Cannot find square root");
    let l = n, d = c.mul(c.ONE, s), h = c.pow(u, t), p = c.pow(u, o);
    for (; !c.eql(h, c.ONE); ) {
      if (c.is0(h))
        return c.ZERO;
      let w = 1, f = c.sqr(h);
      for (; !c.eql(f, c.ONE); )
        if (w++, f = c.sqr(f), w === l)
          throw new Error("Cannot find square root");
      const y = Ct << BigInt(l - w - 1), E = c.pow(d, y);
      l = w, d = c.sqr(E), h = c.mul(h, d), p = c.mul(p, E);
    }
    return p;
  };
}
function Am(e) {
  return e % Dh === Lh ? Hh : e % Fh === Vh ? km : e % Mh === Sm ? Im(e) : Kh(e);
}
const Rm = [
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
function $m(e) {
  const t = {
    ORDER: "bigint",
    BYTES: "number",
    BITS: "number"
  }, n = Rm.reduce((r, i) => (r[i] = "function", r), t);
  return qc(e, n), e;
}
function Om(e, t, n) {
  if (n < Ut)
    throw new Error("invalid exponent, negatives unsupported");
  if (n === Ut)
    return e.ONE;
  if (n === Ct)
    return t;
  let r = e.ONE, i = t;
  for (; n > Ut; )
    n & Ct && (r = e.mul(r, i)), i = e.sqr(i), n >>= Ct;
  return r;
}
function Wh(e, t, n = !1) {
  const r = new Array(t.length).fill(n ? e.ZERO : void 0), i = t.reduce((o, a, c) => e.is0(a) ? o : (r[c] = o, e.mul(o, a)), e.ONE), s = e.inv(i);
  return t.reduceRight((o, a, c) => e.is0(a) ? o : (r[c] = e.mul(o, r[c]), e.mul(o, a)), s), r;
}
function kl(e, t) {
  const n = (e.ORDER - Ct) / qn, r = e.pow(t, n), i = e.eql(r, e.ONE), s = e.eql(r, e.ZERO), o = e.eql(r, e.neg(e.ONE));
  if (!i && !s && !o)
    throw new Error("invalid Legendre symbol result");
  return i ? 1 : s ? 0 : -1;
}
function Cm(e, t) {
  t !== void 0 && sr(t);
  const n = t !== void 0 ? t : e.toString(2).length, r = Math.ceil(n / 8);
  return { nBitLength: n, nByteLength: r };
}
let Pm = class {
  ORDER;
  BITS;
  BYTES;
  isLE;
  ZERO = Ut;
  ONE = Ct;
  _lengths;
  _sqrt;
  // cached sqrt
  _mod;
  constructor(t, n = {}) {
    if (t <= Ut)
      throw new Error("invalid field: expected ORDER > 0, got " + t);
    let r;
    this.isLE = !1, n != null && typeof n == "object" && (typeof n.BITS == "number" && (r = n.BITS), typeof n.sqrt == "function" && (this.sqrt = n.sqrt), typeof n.isLE == "boolean" && (this.isLE = n.isLE), n.allowedLengths && (this._lengths = n.allowedLengths?.slice()), typeof n.modFromBytes == "boolean" && (this._mod = n.modFromBytes));
    const { nBitLength: i, nByteLength: s } = Cm(t, r);
    if (s > 2048)
      throw new Error("invalid field: expected ORDER of <= 2048 bytes");
    this.ORDER = t, this.BITS = i, this.BYTES = s, this._sqrt = void 0, Object.preventExtensions(this);
  }
  create(t) {
    return he(t, this.ORDER);
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
    return (t & Ct) === Ct;
  }
  neg(t) {
    return he(-t, this.ORDER);
  }
  eql(t, n) {
    return t === n;
  }
  sqr(t) {
    return he(t * t, this.ORDER);
  }
  add(t, n) {
    return he(t + n, this.ORDER);
  }
  sub(t, n) {
    return he(t - n, this.ORDER);
  }
  mul(t, n) {
    return he(t * n, this.ORDER);
  }
  pow(t, n) {
    return Om(this, t, n);
  }
  div(t, n) {
    return he(t * Sl(n, this.ORDER), this.ORDER);
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
    return Sl(t, this.ORDER);
  }
  sqrt(t) {
    return this._sqrt || (this._sqrt = Am(this.ORDER)), this._sqrt(this, t);
  }
  toBytes(t) {
    return this.isLE ? ah(t, this.BYTES) : zc(t, this.BYTES);
  }
  fromBytes(t, n = !1) {
    at(t);
    const { _lengths: r, BYTES: i, isLE: s, ORDER: o, _mod: a } = this;
    if (r) {
      if (!r.includes(t.length) || t.length > i)
        throw new Error("Field.fromBytes: expected " + r + " bytes, got " + t.length);
      const u = new Uint8Array(i);
      u.set(t, s ? 0 : u.length - t.length), t = u;
    }
    if (t.length !== i)
      throw new Error("Field.fromBytes: expected " + i + " bytes, got " + t.length);
    let c = s ? oh(t) : qr(t);
    if (a && (c = he(c, o)), !n && !this.isValid(c))
      throw new Error("invalid field element: outside of range 0..ORDER");
    return c;
  }
  // TODO: we don't need it here, move out to separate fn
  invertBatch(t) {
    return Wh(this, t);
  }
  // We can't move this out because Fp6, Fp12 implement it
  // and it's unclear what to return in there.
  cmov(t, n, r) {
    return r ? n : t;
  }
};
function No(e, t = {}) {
  return new Pm(e, t);
}
function zh(e) {
  if (typeof e != "bigint")
    throw new Error("field order must be bigint");
  const t = e.toString(2).length;
  return Math.ceil(t / 8);
}
function jh(e) {
  const t = zh(e);
  return t + Math.ceil(t / 2);
}
function qh(e, t, n = !1) {
  at(e);
  const r = e.length, i = zh(t), s = jh(t);
  if (r < 16 || r < s || r > 1024)
    throw new Error("expected " + s + "-1024 bytes of input, got " + r);
  const o = n ? oh(e) : qr(e), a = he(o, t - Ct) + Ct;
  return n ? ah(a, i) : zc(a, i);
}
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const Lr = /* @__PURE__ */ BigInt(0), Gn = /* @__PURE__ */ BigInt(1);
function Gs(e, t) {
  const n = t.negate();
  return e ? n : t;
}
function Il(e, t) {
  const n = Wh(e.Fp, t.map((r) => r.Z));
  return t.map((r, i) => e.fromAffine(r.toAffine(n[i])));
}
function Gh(e, t) {
  if (!Number.isSafeInteger(e) || e <= 0 || e > t)
    throw new Error("invalid window size, expected [1.." + t + "], got W=" + e);
}
function na(e, t) {
  Gh(e, t);
  const n = Math.ceil(t / e) + 1, r = 2 ** (e - 1), i = 2 ** e, s = jc(e), o = BigInt(e);
  return { windows: n, windowSize: r, mask: s, maxNumber: i, shiftBy: o };
}
function Al(e, t, n) {
  const { windowSize: r, mask: i, maxNumber: s, shiftBy: o } = n;
  let a = Number(e & i), c = e >> o;
  a > r && (a -= s, c += Gn);
  const u = t * r, l = u + Math.abs(a) - 1, d = a === 0, h = a < 0, p = t % 2 !== 0;
  return { nextN: c, offset: l, isZero: d, isNeg: h, isNegF: p, offsetF: u };
}
const ra = /* @__PURE__ */ new WeakMap(), Yh = /* @__PURE__ */ new WeakMap();
function ia(e) {
  return Yh.get(e) || 1;
}
function Rl(e) {
  if (e !== Lr)
    throw new Error("invalid wNAF");
}
let Bm = class {
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
    for (; n > Lr; )
      n & Gn && (r = r.add(i)), i = i.double(), n >>= Gn;
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
    const { windows: r, windowSize: i } = na(n, this.bits), s = [];
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
    const o = na(t, this.bits);
    for (let a = 0; a < o.windows; a++) {
      const { nextN: c, offset: u, isZero: l, isNeg: d, isNegF: h, offsetF: p } = Al(r, a, o);
      r = c, l ? s = s.add(Gs(h, n[p])) : i = i.add(Gs(d, n[u]));
    }
    return Rl(r), { p: i, f: s };
  }
  /**
   * Implements ec unsafe (non const-time) multiplication using precomputed tables and w-ary non-adjacent form.
   * @param acc accumulator point to add result of multiplication
   * @returns point
   */
  wNAFUnsafe(t, n, r, i = this.ZERO) {
    const s = na(t, this.bits);
    for (let o = 0; o < s.windows && r !== Lr; o++) {
      const { nextN: a, offset: c, isZero: u, isNeg: l } = Al(r, o, s);
      if (r = a, !u) {
        const d = n[c];
        i = i.add(l ? d.negate() : d);
      }
    }
    return Rl(r), i;
  }
  getPrecomputes(t, n, r) {
    let i = ra.get(n);
    return i || (i = this.precomputeWindow(n, t), t !== 1 && (typeof r == "function" && (i = r(i)), ra.set(n, i))), i;
  }
  cached(t, n, r) {
    const i = ia(t);
    return this.wNAF(i, this.getPrecomputes(i, t, r), n);
  }
  unsafe(t, n, r, i) {
    const s = ia(t);
    return s === 1 ? this._unsafeLadder(t, n, i) : this.wNAFUnsafe(s, this.getPrecomputes(s, t, r), n, i);
  }
  // We calculate precomputes for elliptic curve point multiplication
  // using windowed method. This specifies window size and
  // stores precomputed values. Usually only base point would be precomputed.
  createCache(t, n) {
    Gh(n, this.bits), Yh.set(t, n), ra.delete(t);
  }
  hasCache(t) {
    return ia(t) !== 1;
  }
};
function Nm(e, t, n, r) {
  let i = t, s = e.ZERO, o = e.ZERO;
  for (; n > Lr || r > Lr; )
    n & Gn && (s = s.add(i)), r & Gn && (o = o.add(i)), i = i.double(), n >>= Gn, r >>= Gn;
  return { p1: s, p2: o };
}
function $l(e, t, n) {
  if (t) {
    if (t.ORDER !== e)
      throw new Error("Field.ORDER must match order: Fp == p, Fn == n");
    return $m(t), t;
  } else
    return No(e, { isLE: n });
}
function _m(e, t, n = {}, r) {
  if (r === void 0 && (r = e === "edwards"), !t || typeof t != "object")
    throw new Error(`expected valid ${e} CURVE object`);
  for (const c of ["p", "n", "h"]) {
    const u = t[c];
    if (!(typeof u == "bigint" && u > Lr))
      throw new Error(`CURVE.${c} must be positive bigint`);
  }
  const i = $l(t.p, n.Fp, r), s = $l(t.n, n.Fn, r), a = ["Gx", "Gy", "a", "b"];
  for (const c of a)
    if (!i.isValid(t[c]))
      throw new Error(`CURVE.${c} must be valid field element of CURVE.Fp`);
  return t = Object.freeze(Object.assign({}, t)), { CURVE: t, Fp: i, Fn: s };
}
function Zh(e, t) {
  return function(r) {
    const i = e(r);
    return { secretKey: i, publicKey: t(i) };
  };
}
class Xh {
  oHash;
  iHash;
  blockLen;
  outputLen;
  finished = !1;
  destroyed = !1;
  constructor(t, n) {
    if (nh(t), at(n, void 0, "key"), this.iHash = t.create(), typeof this.iHash.update != "function")
      throw new Error("Expected instance of class which extends utils.Hash");
    this.blockLen = this.iHash.blockLen, this.outputLen = this.iHash.outputLen;
    const r = this.blockLen, i = new Uint8Array(r);
    i.set(n.length > r ? t.create().update(n).digest() : n);
    for (let s = 0; s < i.length; s++)
      i[s] ^= 54;
    this.iHash.update(i), this.oHash = t.create();
    for (let s = 0; s < i.length; s++)
      i[s] ^= 106;
    this.oHash.update(i), Ms(i);
  }
  update(t) {
    return Fs(this), this.iHash.update(t), this;
  }
  digestInto(t) {
    Fs(this), at(t, this.outputLen, "output"), this.finished = !0, this.iHash.digestInto(t), this.oHash.update(t), this.oHash.digestInto(t), this.destroy();
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
const Qh = (e, t, n) => new Xh(e, t).update(n).digest();
Qh.create = (e, t) => new Xh(e, t);
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const Ol = (e, t) => (e + (e >= 0 ? t : -t) / Jh) / t;
function Um(e, t, n) {
  const [[r, i], [s, o]] = t, a = Ol(o * e, n), c = Ol(-i * e, n);
  let u = e - a * r - c * s, l = -a * i - c * o;
  const d = u < nn, h = l < nn;
  d && (u = -u), h && (l = -l);
  const p = jc(Math.ceil(Uy(n) / 2)) + xr;
  if (u < nn || u >= p || l < nn || l >= p)
    throw new Error("splitScalar (endomorphism): failed, k=" + e);
  return { k1neg: d, k1: u, k2neg: h, k2: l };
}
function Xa(e) {
  if (!["compact", "recovered", "der"].includes(e))
    throw new Error('Signature format must be "compact", "recovered", or "der"');
  return e;
}
function sa(e, t) {
  const n = {};
  for (let r of Object.keys(t))
    n[r] = e[r] === void 0 ? t[r] : e[r];
  return Ks(n.lowS, "lowS"), Ks(n.prehash, "prehash"), n.format !== void 0 && Xa(n.format), n;
}
class Lm extends Error {
  constructor(t = "") {
    super(t);
  }
}
const gn = {
  // asn.1 DER encoding utils
  Err: Lm,
  // Basic building block is TLV (Tag-Length-Value)
  _tlv: {
    encode: (e, t) => {
      const { Err: n } = gn;
      if (e < 0 || e > 256)
        throw new n("tlv.encode: wrong tag");
      if (t.length & 1)
        throw new n("tlv.encode: unpadded data");
      const r = t.length / 2, i = Zi(r);
      if (i.length / 2 & 128)
        throw new n("tlv.encode: long form length too big");
      const s = r > 127 ? Zi(i.length / 2 | 128) : "";
      return Zi(e) + s + i + t;
    },
    // v - value, l - left bytes (unparsed)
    decode(e, t) {
      const { Err: n } = gn;
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
      const { Err: t } = gn;
      if (e < nn)
        throw new t("integer: negative integers are not allowed");
      let n = Zi(e);
      if (Number.parseInt(n[0], 16) & 8 && (n = "00" + n), n.length & 1)
        throw new t("unexpected DER parsing assertion: unpadded hex");
      return n;
    },
    decode(e) {
      const { Err: t } = gn;
      if (e[0] & 128)
        throw new t("invalid signature integer: negative");
      if (e[0] === 0 && !(e[1] & 128))
        throw new t("invalid signature integer: unnecessary leading zero");
      return qr(e);
    }
  },
  toSig(e) {
    const { Err: t, _int: n, _tlv: r } = gn, i = at(e, void 0, "signature"), { v: s, l: o } = r.decode(48, i);
    if (o.length)
      throw new t("invalid signature: left bytes after parsing");
    const { v: a, l: c } = r.decode(2, s), { v: u, l } = r.decode(2, c);
    if (l.length)
      throw new t("invalid signature: left bytes after parsing");
    return { r: n.decode(a), s: n.decode(u) };
  },
  hexFromSig(e) {
    const { _tlv: t, _int: n } = gn, r = t.encode(2, n.encode(e.r)), i = t.encode(2, n.encode(e.s)), s = r + i;
    return t.encode(48, s);
  }
}, nn = BigInt(0), xr = BigInt(1), Jh = BigInt(2), Xi = BigInt(3), Dm = BigInt(4);
function Vm(e, t = {}) {
  const n = _m("weierstrass", e, t), { Fp: r, Fn: i } = n;
  let s = n.CURVE;
  const { h: o, n: a } = s;
  qc(t, {}, {
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
  const u = ep(r, i);
  function l() {
    if (!r.isOdd)
      throw new Error("compression is not supported: Field does not have .isOdd()");
  }
  function d(S, m, v) {
    const { x: b, y: T } = m.toAffine(), k = r.toBytes(b);
    if (Ks(v, "isCompressed"), v) {
      l();
      const P = !r.isOdd(T);
      return Ve(tp(P), k);
    } else
      return Ve(Uint8Array.of(4), k, r.toBytes(T));
  }
  function h(S) {
    at(S, void 0, "Point");
    const { publicKey: m, publicKeyUncompressed: v } = u, b = S.length, T = S[0], k = S.subarray(1);
    if (b === m && (T === 2 || T === 3)) {
      const P = r.fromBytes(k);
      if (!r.isValid(P))
        throw new Error("bad point: is not on curve, wrong x");
      const C = f(P);
      let $;
      try {
        $ = r.sqrt(C);
      } catch (z) {
        const H = z instanceof Error ? ": " + z.message : "";
        throw new Error("bad point: is not on curve, sqrt error" + H);
      }
      l();
      const R = r.isOdd($);
      return (T & 1) === 1 !== R && ($ = r.neg($)), { x: P, y: $ };
    } else if (b === v && T === 4) {
      const P = r.BYTES, C = r.fromBytes(k.subarray(0, P)), $ = r.fromBytes(k.subarray(P, P * 2));
      if (!y(C, $))
        throw new Error("bad point: is not on curve");
      return { x: C, y: $ };
    } else
      throw new Error(`bad point: got length ${b}, expected compressed=${m} or uncompressed=${v}`);
  }
  const p = t.toBytes || d, w = t.fromBytes || h;
  function f(S) {
    const m = r.sqr(S), v = r.mul(m, S);
    return r.add(r.add(v, r.mul(S, s.a)), s.b);
  }
  function y(S, m) {
    const v = r.sqr(m), b = f(S);
    return r.eql(v, b);
  }
  if (!y(s.Gx, s.Gy))
    throw new Error("bad curve params: generator point");
  const E = r.mul(r.pow(s.a, Xi), Dm), I = r.mul(r.sqr(s.b), BigInt(27));
  if (r.is0(r.add(E, I)))
    throw new Error("bad curve params: a or b");
  function O(S, m, v = !1) {
    if (!r.isValid(m) || v && r.is0(m))
      throw new Error(`bad point coordinate ${S}`);
    return m;
  }
  function B(S) {
    if (!(S instanceof _))
      throw new Error("Weierstrass Point expected");
  }
  function N(S) {
    if (!c || !c.basises)
      throw new Error("no endo");
    return Um(S, c.basises, i.ORDER);
  }
  const V = gl((S, m) => {
    const { X: v, Y: b, Z: T } = S;
    if (r.eql(T, r.ONE))
      return { x: v, y: b };
    const k = S.is0();
    m == null && (m = k ? r.ONE : r.inv(T));
    const P = r.mul(v, m), C = r.mul(b, m), $ = r.mul(T, m);
    if (k)
      return { x: r.ZERO, y: r.ZERO };
    if (!r.eql($, r.ONE))
      throw new Error("invZ was invalid");
    return { x: P, y: C };
  }), g = gl((S) => {
    if (S.is0()) {
      if (t.allowInfinityPoint && !r.is0(S.Y))
        return;
      throw new Error("bad point: ZERO");
    }
    const { x: m, y: v } = S.toAffine();
    if (!r.isValid(m) || !r.isValid(v))
      throw new Error("bad point: x or y not field elements");
    if (!y(m, v))
      throw new Error("bad point: equation left != right");
    if (!S.isTorsionFree())
      throw new Error("bad point: not in prime-order subgroup");
    return !0;
  });
  function M(S, m, v, b, T) {
    return v = new _(r.mul(v.X, S), v.Y, v.Z), m = Gs(b, m), v = Gs(T, v), m.add(v);
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
    constructor(m, v, b) {
      this.X = O("x", m), this.Y = O("y", v, !0), this.Z = O("z", b), Object.freeze(this);
    }
    static CURVE() {
      return s;
    }
    /** Does NOT validate if the point is valid. Use `.assertValidity()`. */
    static fromAffine(m) {
      const { x: v, y: b } = m || {};
      if (!m || !r.isValid(v) || !r.isValid(b))
        throw new Error("invalid affine point");
      if (m instanceof _)
        throw new Error("projective point not allowed");
      return r.is0(v) && r.is0(b) ? _.ZERO : new _(v, b, r.ONE);
    }
    static fromBytes(m) {
      const v = _.fromAffine(w(at(m, void 0, "point")));
      return v.assertValidity(), v;
    }
    static fromHex(m) {
      return _.fromBytes(Hs(m));
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
    precompute(m = 8, v = !0) {
      return A.createCache(this, m), v || this.multiply(Xi), this;
    }
    // TODO: return `this`
    /** A point on curve is valid if it conforms to equation. */
    assertValidity() {
      g(this);
    }
    hasEvenY() {
      const { y: m } = this.toAffine();
      if (!r.isOdd)
        throw new Error("Field doesn't support isOdd");
      return !r.isOdd(m);
    }
    /** Compare one point to another. */
    equals(m) {
      B(m);
      const { X: v, Y: b, Z: T } = this, { X: k, Y: P, Z: C } = m, $ = r.eql(r.mul(v, C), r.mul(k, T)), R = r.eql(r.mul(b, C), r.mul(P, T));
      return $ && R;
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
      const { a: m, b: v } = s, b = r.mul(v, Xi), { X: T, Y: k, Z: P } = this;
      let C = r.ZERO, $ = r.ZERO, R = r.ZERO, U = r.mul(T, T), z = r.mul(k, k), H = r.mul(P, P), L = r.mul(T, k);
      return L = r.add(L, L), R = r.mul(T, P), R = r.add(R, R), C = r.mul(m, R), $ = r.mul(b, H), $ = r.add(C, $), C = r.sub(z, $), $ = r.add(z, $), $ = r.mul(C, $), C = r.mul(L, C), R = r.mul(b, R), H = r.mul(m, H), L = r.sub(U, H), L = r.mul(m, L), L = r.add(L, R), R = r.add(U, U), U = r.add(R, U), U = r.add(U, H), U = r.mul(U, L), $ = r.add($, U), H = r.mul(k, P), H = r.add(H, H), U = r.mul(H, L), C = r.sub(C, U), R = r.mul(H, z), R = r.add(R, R), R = r.add(R, R), new _(C, $, R);
    }
    // Renes-Costello-Batina exception-free addition formula.
    // There is 30% faster Jacobian formula, but it is not complete.
    // https://eprint.iacr.org/2015/1060, algorithm 1
    // Cost: 12M + 0S + 3*a + 3*b3 + 23add.
    add(m) {
      B(m);
      const { X: v, Y: b, Z: T } = this, { X: k, Y: P, Z: C } = m;
      let $ = r.ZERO, R = r.ZERO, U = r.ZERO;
      const z = s.a, H = r.mul(s.b, Xi);
      let L = r.mul(v, k), W = r.mul(b, P), Y = r.mul(T, C), nt = r.add(v, b), j = r.add(k, P);
      nt = r.mul(nt, j), j = r.add(L, W), nt = r.sub(nt, j), j = r.add(v, T);
      let J = r.add(k, C);
      return j = r.mul(j, J), J = r.add(L, Y), j = r.sub(j, J), J = r.add(b, T), $ = r.add(P, C), J = r.mul(J, $), $ = r.add(W, Y), J = r.sub(J, $), U = r.mul(z, j), $ = r.mul(H, Y), U = r.add($, U), $ = r.sub(W, U), U = r.add(W, U), R = r.mul($, U), W = r.add(L, L), W = r.add(W, L), Y = r.mul(z, Y), j = r.mul(H, j), W = r.add(W, Y), Y = r.sub(L, Y), Y = r.mul(z, Y), j = r.add(j, Y), L = r.mul(W, j), R = r.add(R, L), L = r.mul(J, j), $ = r.mul(nt, $), $ = r.sub($, L), L = r.mul(nt, W), U = r.mul(J, U), U = r.add(U, L), new _($, R, U);
    }
    subtract(m) {
      return this.add(m.negate());
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
    multiply(m) {
      const { endo: v } = t;
      if (!i.isValidNot0(m))
        throw new Error("invalid scalar: out of range");
      let b, T;
      const k = (P) => A.cached(this, P, (C) => Il(_, C));
      if (v) {
        const { k1neg: P, k1: C, k2neg: $, k2: R } = N(m), { p: U, f: z } = k(C), { p: H, f: L } = k(R);
        T = z.add(L), b = M(v.beta, U, H, P, $);
      } else {
        const { p: P, f: C } = k(m);
        b = P, T = C;
      }
      return Il(_, [b, T])[0];
    }
    /**
     * Non-constant-time multiplication. Uses double-and-add algorithm.
     * It's faster, but should only be used when you don't care about
     * an exposed secret key e.g. sig verification, which works over *public* keys.
     */
    multiplyUnsafe(m) {
      const { endo: v } = t, b = this;
      if (!i.isValid(m))
        throw new Error("invalid scalar: out of range");
      if (m === nn || b.is0())
        return _.ZERO;
      if (m === xr)
        return b;
      if (A.hasCache(this))
        return this.multiply(m);
      if (v) {
        const { k1neg: T, k1: k, k2neg: P, k2: C } = N(m), { p1: $, p2: R } = Nm(_, b, k, C);
        return M(v.beta, $, R, T, P);
      } else
        return A.unsafe(b, m);
    }
    /**
     * Converts Projective point to affine (x, y) coordinates.
     * @param invertedZ Z^-1 (inverted zero) - optional, precomputation is useful for invertBatch
     */
    toAffine(m) {
      return V(this, m);
    }
    /**
     * Checks whether Point is free of torsion elements (is in prime subgroup).
     * Always torsion-free for cofactor=1 curves.
     */
    isTorsionFree() {
      const { isTorsionFree: m } = t;
      return o === xr ? !0 : m ? m(_, this) : A.unsafe(this, a).is0();
    }
    clearCofactor() {
      const { clearCofactor: m } = t;
      return o === xr ? this : m ? m(_, this) : this.multiplyUnsafe(o);
    }
    isSmallOrder() {
      return this.multiplyUnsafe(o).is0();
    }
    toBytes(m = !0) {
      return Ks(m, "isCompressed"), this.assertValidity(), p(_, this, m);
    }
    toHex(m = !0) {
      return $o(this.toBytes(m));
    }
    toString() {
      return `<Point ${this.is0() ? "ZERO" : this.toHex()}>`;
    }
  }
  const F = i.BITS, A = new Bm(_, t.endo ? Math.ceil(F / 2) : F);
  return _.BASE.precompute(8), _;
}
function tp(e) {
  return Uint8Array.of(e ? 2 : 3);
}
function ep(e, t) {
  return {
    secretKey: t.BYTES,
    publicKey: 1 + e.BYTES,
    publicKeyUncompressed: 1 + 2 * e.BYTES,
    publicKeyHasPrefix: !0,
    signature: 2 * t.BYTES
  };
}
function Fm(e, t = {}) {
  const { Fn: n } = e, r = t.randomBytes || Oo, i = Object.assign(ep(e.Fp, n), { seed: jh(n.ORDER) });
  function s(p) {
    try {
      const w = n.fromBytes(p);
      return n.isValidNot0(w);
    } catch {
      return !1;
    }
  }
  function o(p, w) {
    const { publicKey: f, publicKeyUncompressed: y } = i;
    try {
      const E = p.length;
      return w === !0 && E !== f || w === !1 && E !== y ? !1 : !!e.fromBytes(p);
    } catch {
      return !1;
    }
  }
  function a(p = r(i.seed)) {
    return qh(at(p, i.seed, "seed"), n.ORDER);
  }
  function c(p, w = !0) {
    return e.BASE.multiply(n.fromBytes(p)).toBytes(w);
  }
  function u(p) {
    const { secretKey: w, publicKey: f, publicKeyUncompressed: y } = i;
    if (!Kc(p) || "_lengths" in n && n._lengths || w === f)
      return;
    const E = at(p, void 0, "key").length;
    return E === f || E === y;
  }
  function l(p, w, f = !0) {
    if (u(p) === !0)
      throw new Error("first arg must be private key");
    if (u(w) === !1)
      throw new Error("second arg must be public key");
    const y = n.fromBytes(p);
    return e.fromBytes(w).multiply(y).toBytes(f);
  }
  const d = {
    isValidSecretKey: s,
    isValidPublicKey: o,
    randomSecretKey: a
  }, h = Zh(a, c);
  return Object.freeze({ getPublicKey: c, getSharedSecret: l, keygen: h, Point: e, utils: d, lengths: i });
}
function Mm(e, t, n = {}) {
  nh(t), qc(n, {}, {
    hmac: "function",
    lowS: "boolean",
    randomBytes: "function",
    bits2int: "function",
    bits2int_modN: "function"
  }), n = Object.assign({}, n);
  const r = n.randomBytes || Oo, i = n.hmac || ((v, b) => Qh(t, v, b)), { Fp: s, Fn: o } = e, { ORDER: a, BITS: c } = o, { keygen: u, getPublicKey: l, getSharedSecret: d, utils: h, lengths: p } = Fm(e, n), w = {
    prehash: !0,
    lowS: typeof n.lowS == "boolean" ? n.lowS : !0,
    format: "compact",
    extraEntropy: !1
  }, f = a * Jh < s.ORDER;
  function y(v) {
    const b = a >> xr;
    return v > b;
  }
  function E(v, b) {
    if (!o.isValidNot0(b))
      throw new Error(`invalid signature ${v}: out of range 1..Point.Fn.ORDER`);
    return b;
  }
  function I() {
    if (f)
      throw new Error('"recovered" sig type is not supported for cofactor >2 curves');
  }
  function O(v, b) {
    Xa(b);
    const T = p.signature, k = b === "compact" ? T : b === "recovered" ? T + 1 : void 0;
    return at(v, k);
  }
  class B {
    r;
    s;
    recovery;
    constructor(b, T, k) {
      if (this.r = E("r", b), this.s = E("s", T), k != null) {
        if (I(), ![0, 1, 2, 3].includes(k))
          throw new Error("invalid recovery id");
        this.recovery = k;
      }
      Object.freeze(this);
    }
    static fromBytes(b, T = w.format) {
      O(b, T);
      let k;
      if (T === "der") {
        const { r: R, s: U } = gn.toSig(at(b));
        return new B(R, U);
      }
      T === "recovered" && (k = b[0], T = "compact", b = b.subarray(1));
      const P = p.signature / 2, C = b.subarray(0, P), $ = b.subarray(P, P * 2);
      return new B(o.fromBytes(C), o.fromBytes($), k);
    }
    static fromHex(b, T) {
      return this.fromBytes(Hs(b), T);
    }
    assertRecovery() {
      const { recovery: b } = this;
      if (b == null)
        throw new Error("invalid recovery id: must be present");
      return b;
    }
    addRecoveryBit(b) {
      return new B(this.r, this.s, b);
    }
    recoverPublicKey(b) {
      const { r: T, s: k } = this, P = this.assertRecovery(), C = P === 2 || P === 3 ? T + a : T;
      if (!s.isValid(C))
        throw new Error("invalid recovery id: sig.r+curve.n != R.x");
      const $ = s.toBytes(C), R = e.fromBytes(Ve(tp((P & 1) === 0), $)), U = o.inv(C), z = V(at(b, void 0, "msgHash")), H = o.create(-z * U), L = o.create(k * U), W = e.BASE.multiplyUnsafe(H).add(R.multiplyUnsafe(L));
      if (W.is0())
        throw new Error("invalid recovery: point at infinify");
      return W.assertValidity(), W;
    }
    // Signatures should be low-s, to prevent malleability.
    hasHighS() {
      return y(this.s);
    }
    toBytes(b = w.format) {
      if (Xa(b), b === "der")
        return Hs(gn.hexFromSig(this));
      const { r: T, s: k } = this, P = o.toBytes(T), C = o.toBytes(k);
      return b === "recovered" ? (I(), Ve(Uint8Array.of(this.assertRecovery()), P, C)) : Ve(P, C);
    }
    toHex(b) {
      return $o(this.toBytes(b));
    }
  }
  const N = n.bits2int || function(b) {
    if (b.length > 8192)
      throw new Error("input is too large");
    const T = qr(b), k = b.length * 8 - c;
    return k > 0 ? T >> BigInt(k) : T;
  }, V = n.bits2int_modN || function(b) {
    return o.create(N(b));
  }, g = jc(c);
  function M(v) {
    return _y("num < 2^" + c, v, nn, g), o.toBytes(v);
  }
  function _(v, b) {
    return at(v, void 0, "message"), b ? at(t(v), void 0, "prehashed message") : v;
  }
  function F(v, b, T) {
    const { lowS: k, prehash: P, extraEntropy: C } = sa(T, w);
    v = _(v, P);
    const $ = V(v), R = o.fromBytes(b);
    if (!o.isValidNot0(R))
      throw new Error("invalid private key");
    const U = [M(R), M($)];
    if (C != null && C !== !1) {
      const W = C === !0 ? r(p.secretKey) : C;
      U.push(at(W, void 0, "extraEntropy"));
    }
    const z = Ve(...U), H = $;
    function L(W) {
      const Y = N(W);
      if (!o.isValidNot0(Y))
        return;
      const nt = o.inv(Y), j = e.BASE.multiply(Y).toAffine(), J = o.create(j.x);
      if (J === nn)
        return;
      const je = o.create(nt * o.create(H + J * R));
      if (je === nn)
        return;
      let Zr = (j.x === J ? 0 : 2) | Number(j.y & xr), Xr = je;
      return k && y(je) && (Xr = o.neg(je), Zr ^= 1), new B(J, Xr, f ? void 0 : Zr);
    }
    return { seed: z, k2sig: L };
  }
  function A(v, b, T = {}) {
    const { seed: k, k2sig: P } = F(v, b, T);
    return Ly(t.outputLen, o.BYTES, i)(k, P).toBytes(T.format);
  }
  function S(v, b, T, k = {}) {
    const { lowS: P, prehash: C, format: $ } = sa(k, w);
    if (T = at(T, void 0, "publicKey"), b = _(b, C), !Kc(v)) {
      const R = v instanceof B ? ", use sig.toBytes()" : "";
      throw new Error("verify expects Uint8Array signature" + R);
    }
    O(v, $);
    try {
      const R = B.fromBytes(v, $), U = e.fromBytes(T);
      if (P && R.hasHighS())
        return !1;
      const { r: z, s: H } = R, L = V(b), W = o.inv(H), Y = o.create(L * W), nt = o.create(z * W), j = e.BASE.multiplyUnsafe(Y).add(U.multiplyUnsafe(nt));
      return j.is0() ? !1 : o.create(j.x) === z;
    } catch {
      return !1;
    }
  }
  function m(v, b, T = {}) {
    const { prehash: k } = sa(T, w);
    return b = _(b, k), B.fromBytes(v, "recovered").recoverPublicKey(b).toBytes();
  }
  return Object.freeze({
    keygen: u,
    getPublicKey: l,
    getSharedSecret: d,
    utils: h,
    lengths: p,
    Point: e,
    sign: A,
    verify: S,
    recoverPublicKey: m,
    Signature: B,
    hash: t
  });
}
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const _o = {
  p: BigInt("0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffefffffc2f"),
  n: BigInt("0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141"),
  h: BigInt(1),
  a: BigInt(0),
  b: BigInt(7),
  Gx: BigInt("0x79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798"),
  Gy: BigInt("0x483ada7726a3c4655da4fbfc0e1108a8fd17b448a68554199c47d08ffb10d4b8")
}, Hm = {
  beta: BigInt("0x7ae96a2b657c07106e64479eac3434e99cf0497512f58995c1396c28719501ee"),
  basises: [
    [BigInt("0x3086d221a7d46bcde86c90e49284eb15"), -BigInt("0xe4437ed6010e88286f547fa90abfe4c3")],
    [BigInt("0x114ca50f7a8e2f3f657c1108d9d44cfd8"), BigInt("0x3086d221a7d46bcde86c90e49284eb15")]
  ]
}, Km = /* @__PURE__ */ BigInt(0), Qa = /* @__PURE__ */ BigInt(2);
function Wm(e) {
  const t = _o.p, n = BigInt(3), r = BigInt(6), i = BigInt(11), s = BigInt(22), o = BigInt(23), a = BigInt(44), c = BigInt(88), u = e * e * e % t, l = u * u * e % t, d = Qt(l, n, t) * l % t, h = Qt(d, n, t) * l % t, p = Qt(h, Qa, t) * u % t, w = Qt(p, i, t) * p % t, f = Qt(w, s, t) * w % t, y = Qt(f, a, t) * f % t, E = Qt(y, c, t) * y % t, I = Qt(E, a, t) * f % t, O = Qt(I, n, t) * l % t, B = Qt(O, o, t) * w % t, N = Qt(B, r, t) * u % t, V = Qt(N, Qa, t);
  if (!Ys.eql(Ys.sqr(V), e))
    throw new Error("Cannot find square root");
  return V;
}
const Ys = No(_o.p, { sqrt: Wm }), lr = /* @__PURE__ */ Vm(_o, {
  Fp: Ys,
  endo: Hm
}), Cl = /* @__PURE__ */ Mm(lr, Za), Pl = {};
function Zs(e, ...t) {
  let n = Pl[e];
  if (n === void 0) {
    const r = Za(By(e));
    n = Ve(r, r), Pl[e] = n;
  }
  return Za(Ve(n, ...t));
}
const Xc = (e) => e.toBytes(!0).slice(1), Qc = (e) => e % Qa === Km;
function Ja(e) {
  const { Fn: t, BASE: n } = lr, r = t.fromBytes(e), i = n.multiply(r);
  return { scalar: Qc(i.y) ? r : t.neg(r), bytes: Xc(i) };
}
function np(e) {
  const t = Ys;
  if (!t.isValidNot0(e))
    throw new Error("invalid x: Fail if x ≥ p");
  const n = t.create(e * e), r = t.create(n * e + BigInt(7));
  let i = t.sqrt(r);
  Qc(i) || (i = t.neg(i));
  const s = lr.fromAffine({ x: e, y: i });
  return s.assertValidity(), s;
}
const pi = qr;
function rp(...e) {
  return lr.Fn.create(pi(Zs("BIP0340/challenge", ...e)));
}
function Bl(e) {
  return Ja(e).bytes;
}
function zm(e, t, n = Oo(32)) {
  const { Fn: r } = lr, i = at(e, void 0, "message"), { bytes: s, scalar: o } = Ja(t), a = at(n, 32, "auxRand"), c = r.toBytes(o ^ pi(Zs("BIP0340/aux", a))), u = Zs("BIP0340/nonce", c, s, i), { bytes: l, scalar: d } = Ja(u), h = rp(l, s, i), p = new Uint8Array(64);
  if (p.set(l, 0), p.set(r.toBytes(r.create(d + h * o)), 32), !ip(p, i, s))
    throw new Error("sign: Invalid signature produced");
  return p;
}
function ip(e, t, n) {
  const { Fp: r, Fn: i, BASE: s } = lr, o = at(e, 64, "signature"), a = at(t, void 0, "message"), c = at(n, 32, "publicKey");
  try {
    const u = np(pi(c)), l = pi(o.subarray(0, 32));
    if (!r.isValidNot0(l))
      return !1;
    const d = pi(o.subarray(32, 64));
    if (!i.isValidNot0(d))
      return !1;
    const h = rp(i.toBytes(l), Xc(u), a), p = s.multiplyUnsafe(d).add(u.multiplyUnsafe(i.neg(h))), { x: w, y: f } = p.toAffine();
    return !(p.is0() || !Qc(f) || w !== l);
  } catch {
    return !1;
  }
}
const Gr = /* @__PURE__ */ (() => {
  const n = (r = Oo(48)) => qh(r, _o.n);
  return {
    keygen: Zh(n, Bl),
    getPublicKey: Bl,
    sign: zm,
    verify: ip,
    Point: lr,
    utils: {
      randomSecretKey: n,
      taggedHash: Zs,
      lift_x: np,
      pointToBytes: Xc
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
function jm(e, t, n = {}) {
  e = Vs(e);
  const { aggPublicKey: r } = Bi(e);
  if (!n.taprootTweak)
    return {
      preTweakedKey: r.toBytes(!0),
      finalKey: r.toBytes(!0)
    };
  const i = Gr.utils.taggedHash("TapTweak", r.toBytes(!0).subarray(1), n.taprootTweak ?? new Uint8Array(0)), { aggPublicKey: s } = Bi(e, [i], [!0]);
  return {
    preTweakedKey: r.toBytes(!0),
    finalKey: s.toBytes(!0)
  };
}
function sp(e) {
  return e && e.__esModule && Object.prototype.hasOwnProperty.call(e, "default") ? e.default : e;
}
var oa, Nl;
function qm() {
  if (Nl) return oa;
  Nl = 1;
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
  return oa = { decode: c, encode: u }, oa;
}
var ve = qm();
const Gm = /* @__PURE__ */ sp(ve);
var jt;
(function(e) {
  e.VtxoTaprootTree = "taptree", e.VtxoTreeExpiry = "expiry", e.Cosigner = "cosigner", e.ConditionWitness = "condition";
})(jt || (jt = {}));
const Jc = 222;
function op(e, t, n, r) {
  e.updateInput(t, {
    unknown: [
      ...e.getInput(t)?.unknown ?? [],
      n.encode(r)
    ]
  });
}
function Ym(e, t, n) {
  const r = e.getInput(t)?.unknown ?? [], i = [];
  for (const s of r) {
    const o = n.decode(s);
    o && i.push(o);
  }
  return i;
}
const tu = {
  key: jt.VtxoTaprootTree,
  encode: (e) => [
    {
      type: Jc,
      key: Uo[jt.VtxoTaprootTree]
    },
    e
  ],
  decode: (e) => eu(() => nu(e[0], jt.VtxoTaprootTree) ? e[1] : null)
}, ap = {
  key: jt.ConditionWitness,
  encode: (e) => [
    {
      type: Jc,
      key: Uo[jt.ConditionWitness]
    },
    rr.encode(e)
  ],
  decode: (e) => eu(() => nu(e[0], jt.ConditionWitness) ? rr.decode(e[1]) : null)
}, Zm = {
  key: jt.Cosigner,
  encode: (e) => [
    {
      type: Jc,
      key: new Uint8Array([
        ...Uo[jt.Cosigner],
        e.index
      ])
    },
    e.key
  ],
  decode: (e) => eu(() => nu(e[0], jt.Cosigner) ? {
    index: e[0].key[e[0].key.length - 1],
    key: e[1]
  } : null)
};
jt.VtxoTreeExpiry;
const Uo = Object.fromEntries(Object.values(jt).map((e) => [
  e,
  new TextEncoder().encode(e)
])), eu = (e) => {
  try {
    return e();
  } catch {
    return null;
  }
};
function nu(e, t) {
  const n = x.encode(Uo[t]);
  return x.encode(new Uint8Array([e.type, ...e.key])).includes(n);
}
Object.values(It).filter((e) => typeof e == "number");
let Sn = class cp {
  constructor(t, n, r, i = 0) {
    if (this.serverPubKey = t, this.vtxoTaprootKey = n, this.hrp = r, this.version = i, t.length !== 32)
      throw new Error("Invalid server public key length, expected 32 bytes, got " + t.length);
    if (n.length !== 32)
      throw new Error("Invalid vtxo taproot public key length, expected 32 bytes, got " + n.length);
  }
  static decode(t) {
    const n = De.decodeUnsafe(t, 1023);
    if (!n)
      throw new Error("Invalid address");
    const r = new Uint8Array(De.fromWords(n.words));
    if (r.length !== 65)
      throw new Error("Invalid data length, expected 65 bytes, got " + r.length);
    const i = r[0], s = r.slice(1, 33), o = r.slice(33, 65);
    return new cp(s, o, n.prefix, i);
  }
  encode() {
    const t = new Uint8Array(65);
    t[0] = this.version, t.set(this.serverPubKey, 1), t.set(this.vtxoTaprootKey, 33);
    const n = De.toWords(t);
    return De.encode(this.hrp, n, 1023);
  }
  // pkScript is the script that should be used to send non-dust funds to the address
  get pkScript() {
    return K.encode(["OP_1", this.vtxoTaprootKey]);
  }
  // subdustPkScript is the script that should be used to send sub-dust funds to the address
  get subdustPkScript() {
    return K.encode(["RETURN", this.vtxoTaprootKey]);
  }
};
const Xs = So(void 0, !0);
var mt;
(function(e) {
  e.Multisig = "multisig", e.CSVMultisig = "csv-multisig", e.ConditionCSVMultisig = "condition-csv-multisig", e.ConditionMultisig = "condition-multisig", e.CLTVMultisig = "cltv-multisig";
})(mt || (mt = {}));
function up(e) {
  const t = [
    Ee,
    kt,
    _i,
    Qs,
    Dr
  ];
  for (const n of t)
    try {
      return n.decode(e);
    } catch {
      continue;
    }
  throw new Error(`Failed to decode: script ${x.encode(e)} is not a valid tapscript`);
}
var Ee;
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
        type: mt.Multisig,
        params: a,
        script: Gf(a.pubkeys.length, a.pubkeys).script
      };
    const c = [];
    for (let u = 0; u < a.pubkeys.length; u++)
      c.push(a.pubkeys[u]), u < a.pubkeys.length - 1 ? c.push("CHECKSIGVERIFY") : c.push("CHECKSIG");
    return {
      type: mt.Multisig,
      params: a,
      script: K.encode(c)
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
    const d = n({
      pubkeys: u,
      type: t.CHECKSIGADD
    });
    if (x.encode(d.script) !== x.encode(a))
      throw new Error("Invalid script format: script reconstruction mismatch");
    return {
      type: mt.Multisig,
      params: { pubkeys: u, type: t.CHECKSIGADD },
      script: a
    };
  }
  function s(a) {
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
    const l = n({ pubkeys: u, type: t.CHECKSIG });
    if (x.encode(l.script) !== x.encode(a))
      throw new Error("Invalid script format: script reconstruction mismatch");
    return {
      type: mt.Multisig,
      params: { pubkeys: u, type: t.CHECKSIG },
      script: a
    };
  }
  function o(a) {
    return a.type === mt.Multisig;
  }
  e.is = o;
})(Ee || (Ee = {}));
var kt;
(function(e) {
  function t(i) {
    for (const u of i.pubkeys)
      if (u.length !== 32)
        throw new Error(`Invalid pubkey length: expected 32, got ${u.length}`);
    const s = Xs.encode(BigInt(ve.encode(i.timelock.type === "blocks" ? { blocks: Number(i.timelock.value) } : { seconds: Number(i.timelock.value) }))), o = [
      s.length === 1 ? s[0] : s,
      "CHECKSEQUENCEVERIFY",
      "DROP"
    ], a = Ee.encode(i), c = new Uint8Array([
      ...K.encode(o),
      ...a.script
    ]);
    return {
      type: mt.CSVMultisig,
      params: i,
      script: c
    };
  }
  e.encode = t;
  function n(i) {
    if (i.length === 0)
      throw new Error("Failed to decode: script is empty");
    const s = K.decode(i);
    if (s.length < 3)
      throw new Error("Invalid script: too short (expected at least 3)");
    const o = s[0];
    if (typeof o == "string")
      throw new Error("Invalid script: expected sequence number");
    if (s[1] !== "CHECKSEQUENCEVERIFY" || s[2] !== "DROP")
      throw new Error("Invalid script: expected CHECKSEQUENCEVERIFY DROP");
    const a = new Uint8Array(K.encode(s.slice(3)));
    let c;
    try {
      c = Ee.decode(a);
    } catch (p) {
      throw new Error(`Invalid multisig script: ${p instanceof Error ? p.message : String(p)}`);
    }
    let u;
    typeof o == "number" ? u = o : u = Number(Xs.decode(o));
    const l = ve.decode(u), d = l.blocks !== void 0 ? { type: "blocks", value: BigInt(l.blocks) } : { type: "seconds", value: BigInt(l.seconds) }, h = t({
      timelock: d,
      ...c.params
    });
    if (x.encode(h.script) !== x.encode(i))
      throw new Error("Invalid script format: script reconstruction mismatch");
    return {
      type: mt.CSVMultisig,
      params: {
        timelock: d,
        ...c.params
      },
      script: i
    };
  }
  e.decode = n;
  function r(i) {
    return i.type === mt.CSVMultisig;
  }
  e.is = r;
})(kt || (kt = {}));
var _i;
(function(e) {
  function t(i) {
    const s = new Uint8Array([
      ...i.conditionScript,
      ...K.encode(["VERIFY"]),
      ...kt.encode(i).script
    ]);
    return {
      type: mt.ConditionCSVMultisig,
      params: i,
      script: s
    };
  }
  e.encode = t;
  function n(i) {
    if (i.length === 0)
      throw new Error("Failed to decode: script is empty");
    const s = K.decode(i);
    if (s.length < 1)
      throw new Error("Invalid script: too short (expected at least 1)");
    let o = -1;
    for (let d = s.length - 1; d >= 0; d--)
      s[d] === "VERIFY" && (o = d);
    if (o === -1)
      throw new Error("Invalid script: missing VERIFY operation");
    const a = new Uint8Array(K.encode(s.slice(0, o))), c = new Uint8Array(K.encode(s.slice(o + 1)));
    let u;
    try {
      u = kt.decode(c);
    } catch (d) {
      throw new Error(`Invalid CSV multisig script: ${d instanceof Error ? d.message : String(d)}`);
    }
    const l = t({
      conditionScript: a,
      ...u.params
    });
    if (x.encode(l.script) !== x.encode(i))
      throw new Error("Invalid script format: script reconstruction mismatch");
    return {
      type: mt.ConditionCSVMultisig,
      params: {
        conditionScript: a,
        ...u.params
      },
      script: i
    };
  }
  e.decode = n;
  function r(i) {
    return i.type === mt.ConditionCSVMultisig;
  }
  e.is = r;
})(_i || (_i = {}));
var Qs;
(function(e) {
  function t(i) {
    const s = new Uint8Array([
      ...i.conditionScript,
      ...K.encode(["VERIFY"]),
      ...Ee.encode(i).script
    ]);
    return {
      type: mt.ConditionMultisig,
      params: i,
      script: s
    };
  }
  e.encode = t;
  function n(i) {
    if (i.length === 0)
      throw new Error("Failed to decode: script is empty");
    const s = K.decode(i);
    if (s.length < 1)
      throw new Error("Invalid script: too short (expected at least 1)");
    let o = -1;
    for (let d = s.length - 1; d >= 0; d--)
      s[d] === "VERIFY" && (o = d);
    if (o === -1)
      throw new Error("Invalid script: missing VERIFY operation");
    const a = new Uint8Array(K.encode(s.slice(0, o))), c = new Uint8Array(K.encode(s.slice(o + 1)));
    let u;
    try {
      u = Ee.decode(c);
    } catch (d) {
      throw new Error(`Invalid multisig script: ${d instanceof Error ? d.message : String(d)}`);
    }
    const l = t({
      conditionScript: a,
      ...u.params
    });
    if (x.encode(l.script) !== x.encode(i))
      throw new Error("Invalid script format: script reconstruction mismatch");
    return {
      type: mt.ConditionMultisig,
      params: {
        conditionScript: a,
        ...u.params
      },
      script: i
    };
  }
  e.decode = n;
  function r(i) {
    return i.type === mt.ConditionMultisig;
  }
  e.is = r;
})(Qs || (Qs = {}));
var Dr;
(function(e) {
  function t(i) {
    const s = Xs.encode(i.absoluteTimelock), o = [
      s.length === 1 ? s[0] : s,
      "CHECKLOCKTIMEVERIFY",
      "DROP"
    ], a = K.encode(o), c = new Uint8Array([
      ...a,
      ...Ee.encode(i).script
    ]);
    return {
      type: mt.CLTVMultisig,
      params: i,
      script: c
    };
  }
  e.encode = t;
  function n(i) {
    if (i.length === 0)
      throw new Error("Failed to decode: script is empty");
    const s = K.decode(i);
    if (s.length < 3)
      throw new Error("Invalid script: too short (expected at least 3)");
    const o = s[0];
    if (typeof o == "string" || typeof o == "number")
      throw new Error("Invalid script: expected locktime number");
    if (s[1] !== "CHECKLOCKTIMEVERIFY" || s[2] !== "DROP")
      throw new Error("Invalid script: expected CHECKLOCKTIMEVERIFY DROP");
    const a = new Uint8Array(K.encode(s.slice(3)));
    let c;
    try {
      c = Ee.decode(a);
    } catch (d) {
      throw new Error(`Invalid multisig script: ${d instanceof Error ? d.message : String(d)}`);
    }
    const u = Xs.decode(o), l = t({
      absoluteTimelock: u,
      ...c.params
    });
    if (x.encode(l.script) !== x.encode(i))
      throw new Error("Invalid script format: script reconstruction mismatch");
    return {
      type: mt.CLTVMultisig,
      params: {
        absoluteTimelock: u,
        ...c.params
      },
      script: i
    };
  }
  e.decode = n;
  function r(i) {
    return i.type === mt.CLTVMultisig;
  }
  e.is = r;
})(Dr || (Dr = {}));
const _l = Br.tapTree[2];
function gi(e) {
  return e[1].subarray(0, e[1].length - 1);
}
let re = class lp {
  static decode(t) {
    const r = _l.decode(t).map((i) => i.script);
    return new lp(r);
  }
  constructor(t) {
    this.scripts = t;
    const n = t.length % 2 !== 0 ? t.slice().reverse() : t, r = Mc(n.map((s) => ({
      script: s,
      leafVersion: ir
    }))), i = qf(To, r, void 0, !0);
    if (!i.tapLeafScript || i.tapLeafScript.length !== t.length)
      throw new Error("invalid scripts");
    this.leaves = i.tapLeafScript, this.tweakedPublicKey = i.tweakedPubkey;
  }
  encode() {
    return _l.encode(this.scripts.map((n) => ({
      depth: 1,
      version: ir,
      script: n
    })));
  }
  address(t, n) {
    return new Sn(n, this.tweakedPublicKey, t);
  }
  get pkScript() {
    return K.encode(["OP_1", this.tweakedPublicKey]);
  }
  onchainAddress(t) {
    return Yt(t).encode({
      type: "tr",
      pubkey: this.tweakedPublicKey
    });
  }
  findLeaf(t) {
    const n = this.leaves.find((r) => x.encode(gi(r)) === t);
    if (!n)
      throw new Error(`leaf '${t}' not found`);
    return n;
  }
  exitPaths() {
    const t = [];
    for (const n of this.leaves)
      try {
        const r = kt.decode(gi(n));
        t.push(r);
        continue;
      } catch {
        try {
          const i = _i.decode(gi(n));
          t.push(i);
        } catch {
          continue;
        }
      }
    return t;
  }
};
var Js;
(function(e) {
  class t extends re {
    constructor(i) {
      n(i);
      const { sender: s, receiver: o, server: a, preimageHash: c, refundLocktime: u, unilateralClaimDelay: l, unilateralRefundDelay: d, unilateralRefundWithoutReceiverDelay: h } = i, p = Xm(c), w = Qs.encode({
        conditionScript: p,
        pubkeys: [o, a]
      }).script, f = Ee.encode({
        pubkeys: [s, o, a]
      }).script, y = Dr.encode({
        absoluteTimelock: u,
        pubkeys: [s, a]
      }).script, E = _i.encode({
        conditionScript: p,
        timelock: l,
        pubkeys: [o]
      }).script, I = kt.encode({
        timelock: d,
        pubkeys: [s, o]
      }).script, O = kt.encode({
        timelock: h,
        pubkeys: [s]
      }).script;
      super([
        w,
        f,
        y,
        E,
        I,
        O
      ]), this.options = i, this.claimScript = x.encode(w), this.refundScript = x.encode(f), this.refundWithoutReceiverScript = x.encode(y), this.unilateralClaimScript = x.encode(E), this.unilateralRefundScript = x.encode(I), this.unilateralRefundWithoutReceiverScript = x.encode(O);
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
})(Js || (Js = {}));
function Xm(e) {
  return K.encode(["HASH160", e, "EQUAL"]);
}
var Qn;
(function(e) {
  class t extends re {
    constructor(r) {
      const { pubKey: i, serverPubKey: s, csvTimelock: o = t.DEFAULT_TIMELOCK } = r, a = Ee.encode({
        pubkeys: [i, s]
      }).script, c = kt.encode({
        timelock: o,
        pubkeys: [i]
      }).script;
      super([a, c]), this.options = r, this.forfeitScript = x.encode(a), this.exitScript = x.encode(c);
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
var Qe;
(function(e) {
  e.TxSent = "SENT", e.TxReceived = "RECEIVED";
})(Qe || (Qe = {}));
function ms(e) {
  return !e.isSpent;
}
function to(e) {
  return e.virtualStatus.state === "swept" && ms(e);
}
function Qm(e) {
  if (e.virtualStatus.state === "swept")
    return !0;
  const t = e.virtualStatus.batchExpiry;
  return !t || new Date(t).getFullYear() < 2025 ? !1 : t <= Date.now();
}
function Jm(e, t) {
  return e.value < t;
}
async function* tc(e) {
  const t = [], n = [];
  let r = null, i = null;
  const s = (a) => {
    r ? (r(a), r = null) : t.push(a);
  }, o = () => {
    const a = new Error("EventSource error");
    i ? (i(a), i = null) : n.push(a);
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
let dp = class extends Error {
  constructor(t, n, r, i) {
    super(n), this.code = t, this.message = n, this.name = r, this.metadata = i;
  }
};
function tb(e) {
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
      return "metadata" in n && eb(n.metadata) && (a = n.metadata), new dp(i, s, o, a);
    }
    return;
  } catch {
    return;
  }
}
function eb(e) {
  return typeof e == "object" && e !== null && !Array.isArray(e);
}
var Fe;
(function(e) {
  function t(i, s, o = []) {
    if (typeof i != "string" && (i = r(i)), s.length == 0)
      throw new Error("intent proof requires at least one input");
    ab(s), ub(o);
    const a = lb(i, s[0].witnessUtxo.script);
    return db(a, s, o);
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
})(Fe || (Fe = {}));
const nb = new Uint8Array([pt.RETURN]), rb = new Uint8Array(32).fill(0), ib = 4294967295, sb = "ark-intent-proof-message";
function ob(e) {
  if (e.index === void 0)
    throw new Error("intent proof input requires index");
  if (e.txid === void 0)
    throw new Error("intent proof input requires txid");
  if (e.witnessUtxo === void 0)
    throw new Error("intent proof input requires witness utxo");
  return !0;
}
function ab(e) {
  return e.forEach(ob), !0;
}
function cb(e) {
  if (e.amount === void 0)
    throw new Error("intent proof output requires amount");
  if (e.script === void 0)
    throw new Error("intent proof output requires script");
  return !0;
}
function ub(e) {
  return e.forEach(cb), !0;
}
function lb(e, t) {
  const n = fb(e), r = new ne({
    version: 0
  });
  return r.addInput({
    txid: rb,
    // zero hash
    index: ib,
    sequence: 0
  }), r.addOutput({
    amount: 0n,
    script: t
  }), r.updateInput(0, {
    finalScriptSig: K.encode(["OP_0", n])
  }), r;
}
function db(e, t, n) {
  const r = t[0], i = t.map((o) => o.sequence || 0).reduce((o, a) => Math.max(o, a), 0), s = new ne({
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
    sighashType: It.ALL
  });
  for (const [o, a] of t.entries())
    s.addInput({
      ...a,
      sighashType: It.ALL
    }), a.unknown?.length && s.updateInput(o + 1, {
      unknown: a.unknown
    });
  n.length === 0 && (n = [
    {
      amount: 0n,
      script: nb
    }
  ]);
  for (const o of n)
    s.addOutput({
      amount: o.amount,
      script: o.script
    });
  return s;
}
function fb(e) {
  return Gr.utils.taggedHash(sb, new TextEncoder().encode(e));
}
var vt;
(function(e) {
  e.BatchStarted = "batch_started", e.BatchFinalization = "batch_finalization", e.BatchFinalized = "batch_finalized", e.BatchFailed = "batch_failed", e.TreeSigningStarted = "tree_signing_started", e.TreeNonces = "tree_nonces", e.TreeTx = "tree_tx", e.TreeSignature = "tree_signature";
})(vt || (vt = {}));
let hb = class {
  constructor(t) {
    this.serverUrl = t;
  }
  async getInfo() {
    const t = `${this.serverUrl}/v1/info`, n = await fetch(t);
    if (!n.ok) {
      const i = await n.text();
      Ae(i, `Failed to get server info: ${n.statusText}`);
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
      Ae(o, `Failed to submit virtual transaction: ${o}`);
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
      Ae(s, `Failed to finalize offchain transaction: ${s}`);
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
          message: Fe.encodeMessage(t.message)
        }
      })
    });
    if (!r.ok) {
      const s = await r.text();
      Ae(s, `Failed to register intent: ${s}`);
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
          message: Fe.encodeMessage(t.message)
        }
      })
    });
    if (!r.ok) {
      const i = await r.text();
      Ae(i, `Failed to delete intent: ${i}`);
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
      Ae(i, `Failed to confirm registration: ${i}`);
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
        treeNonces: pb(r)
      })
    });
    if (!s.ok) {
      const o = await s.text();
      Ae(o, `Failed to submit tree nonces: ${o}`);
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
        treeSignatures: gb(r)
      })
    });
    if (!s.ok) {
      const o = await s.text();
      Ae(o, `Failed to submit tree signatures: ${o}`);
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
      Ae(s, `Failed to submit forfeit transactions: ${i.statusText}`);
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
          for await (const a of tc(s)) {
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
        if (ec(s)) {
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
          for await (const s of tc(r)) {
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
        if (ec(r)) {
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
          message: Fe.encodeMessage(t.message)
        }
      })
    });
    if (!r.ok) {
      const s = await r.text();
      Ae(s, `Failed to get pending transactions: ${s}`);
    }
    return (await r.json()).pendingTxs;
  }
  parseSettlementEvent(t) {
    if (t.batchStarted)
      return {
        type: vt.BatchStarted,
        id: t.batchStarted.id,
        intentIdHashes: t.batchStarted.intentIdHashes,
        batchExpiry: BigInt(t.batchStarted.batchExpiry)
      };
    if (t.batchFinalization)
      return {
        type: vt.BatchFinalization,
        id: t.batchFinalization.id,
        commitmentTx: t.batchFinalization.commitmentTx
      };
    if (t.batchFinalized)
      return {
        type: vt.BatchFinalized,
        id: t.batchFinalized.id,
        commitmentTxid: t.batchFinalized.commitmentTxid
      };
    if (t.batchFailed)
      return {
        type: vt.BatchFailed,
        id: t.batchFailed.id,
        reason: t.batchFailed.reason
      };
    if (t.treeSigningStarted)
      return {
        type: vt.TreeSigningStarted,
        id: t.treeSigningStarted.id,
        cosignersPublicKeys: t.treeSigningStarted.cosignersPubkeys,
        unsignedCommitmentTx: t.treeSigningStarted.unsignedCommitmentTx
      };
    if (t.treeNoncesAggregated)
      return null;
    if (t.treeNonces)
      return {
        type: vt.TreeNonces,
        id: t.treeNonces.id,
        topic: t.treeNonces.topic,
        txid: t.treeNonces.txid,
        nonces: wb(t.treeNonces.nonces)
        // pubkey -> public nonce
      };
    if (t.treeTx) {
      const n = Object.fromEntries(Object.entries(t.treeTx.children).map(([r, i]) => [parseInt(r), i]));
      return {
        type: vt.TreeTx,
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
      type: vt.TreeSignature,
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
        spentVtxos: t.commitmentTx.spentVtxos.map(Qi),
        spendableVtxos: t.commitmentTx.spendableVtxos.map(Qi),
        checkpointTxs: t.commitmentTx.checkpointTxs
      }
    } : t.arkTx ? {
      arkTx: {
        txid: t.arkTx.txid,
        tx: t.arkTx.tx,
        spentVtxos: t.arkTx.spentVtxos.map(Qi),
        spendableVtxos: t.arkTx.spendableVtxos.map(Qi),
        checkpointTxs: t.arkTx.checkpointTxs
      }
    } : (t.heartbeat || console.warn("Unknown transaction notification type:", t), null);
  }
};
function pb(e) {
  const t = {};
  for (const [n, r] of e)
    t[n] = x.encode(r.pubNonce);
  return t;
}
function gb(e) {
  const t = {};
  for (const [n, r] of e)
    t[n] = x.encode(r.encode());
  return t;
}
function wb(e) {
  return new Map(Object.entries(e).map(([t, n]) => {
    if (typeof n != "string")
      throw new Error("invalid nonce");
    return [t, { pubNonce: x.decode(n) }];
  }));
}
function ec(e) {
  const t = (n) => n instanceof Error ? n.name === "TypeError" && n.message === "Failed to fetch" || n.name === "HeadersTimeoutError" || n.name === "BodyTimeoutError" || n.code === "UND_ERR_HEADERS_TIMEOUT" || n.code === "UND_ERR_BODY_TIMEOUT" : !1;
  return t(e) || t(e.cause);
}
function Qi(e) {
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
function Ae(e, t) {
  const n = new Error(e);
  throw tb(n) ?? new Error(t);
}
let bs = class {
  constructor(t, n = /* @__PURE__ */ new Map()) {
    this.root = t, this.children = n;
  }
  static create(t) {
    if (t.length === 0)
      throw new Error("empty chunks");
    const n = /* @__PURE__ */ new Map();
    for (const s of t) {
      const o = mb(s), a = o.tx.id;
      n.set(a, o);
    }
    const r = [];
    for (const [s] of n) {
      let o = !1;
      for (const [a, c] of n)
        if (a !== s && (o = yb(c, s), o))
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
    const i = fp(r[0], n);
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
      if (!s.txid || x.encode(s.txid) !== o || s.index !== r)
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
};
function yb(e, t) {
  return Object.values(e.children).includes(t);
}
function fp(e, t) {
  const n = t.get(e);
  if (!n)
    return null;
  const r = n.tx, i = /* @__PURE__ */ new Map();
  for (const [s, o] of Object.entries(n.children)) {
    const a = parseInt(s), c = fp(o, t);
    c && i.set(a, c);
  }
  return new bs(r, i);
}
function mb(e) {
  return { tx: rt.fromPSBT(G.decode(e.tx)), children: e.children };
}
var eo;
(function(e) {
  let t;
  (function(r) {
    r.Start = "start", r.BatchStarted = "batch_started", r.TreeSigningStarted = "tree_signing_started", r.TreeNoncesAggregated = "tree_nonces_aggregated", r.BatchFinalization = "batch_finalization";
  })(t || (t = {}));
  async function n(r, i, s = {}) {
    const { abortController: o, skipVtxoTreeSigning: a = !1, eventCallback: c } = s;
    let u = t.Start;
    const l = [], d = [];
    let h, p;
    for await (const w of r) {
      if (o?.signal.aborted)
        throw new Error("canceled");
      switch (c && c(w).catch(() => {
      }), w.type) {
        case vt.BatchStarted: {
          const f = w, { skip: y } = await i.onBatchStarted(f);
          y || (u = t.BatchStarted, a && (u = t.TreeNoncesAggregated));
          continue;
        }
        case vt.BatchFinalized: {
          if (u !== t.BatchFinalization)
            continue;
          return i.onBatchFinalized && await i.onBatchFinalized(w), w.commitmentTxid;
        }
        case vt.BatchFailed: {
          if (i.onBatchFailed) {
            await i.onBatchFailed(w);
            continue;
          }
          throw new Error(w.reason);
        }
        case vt.TreeTx: {
          if (u !== t.BatchStarted && u !== t.TreeNoncesAggregated)
            continue;
          w.batchIndex === 0 ? l.push(w.chunk) : d.push(w.chunk), i.onTreeTxEvent && await i.onTreeTxEvent(w);
          continue;
        }
        case vt.TreeSignature: {
          if (u !== t.TreeNoncesAggregated)
            continue;
          if (!h)
            throw new Error("vtxo tree not initialized");
          const f = x.decode(w.signature);
          h.update(w.txid, (y) => {
            y.updateInput(0, {
              tapKeySig: f
            });
          }), i.onTreeSignatureEvent && await i.onTreeSignatureEvent(w);
          continue;
        }
        case vt.TreeSigningStarted: {
          if (u !== t.BatchStarted)
            continue;
          h = bs.create(l);
          const { skip: f } = await i.onTreeSigningStarted(w, h);
          f || (u = t.TreeSigningStarted);
          continue;
        }
        case vt.TreeNonces: {
          if (u !== t.TreeSigningStarted)
            continue;
          const { fullySigned: f } = await i.onTreeNonces(w);
          f && (u = t.TreeNoncesAggregated);
          continue;
        }
        case vt.BatchFinalization: {
          if (u !== t.TreeNoncesAggregated)
            continue;
          if (!h && l.length > 0 && (h = bs.create(l)), !h && !a)
            throw new Error("vtxo tree not initialized");
          d.length > 0 && (p = bs.create(d)), await i.onBatchFinalization(w, h, p), u = t.BatchFinalization;
          continue;
        }
        default:
          continue;
      }
    }
    throw new Error("event stream closed");
  }
  e.join = n;
})(eo || (eo = {}));
const bb = (e) => xs[e], xs = {
  bitcoin: ni(nr, "ark"),
  testnet: ni(xn, "tark"),
  signet: ni(xn, "tark"),
  mutinynet: ni(xn, "tark"),
  regtest: ni({
    ...xn,
    bech32: "bcrt",
    pubKeyHash: 111,
    scriptHash: 196
  }, "tark")
};
function ni(e, t) {
  return {
    ...e,
    hrp: t
  };
}
const xb = {
  bitcoin: "https://mempool.space/api",
  testnet: "https://mempool.space/testnet/api",
  signet: "https://mempool.space/signet/api",
  mutinynet: "https://mutinynet.com/api",
  regtest: "http://localhost:3000"
};
let vb = class {
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
      const c = async () => (await Promise.all(t.map((p) => this.getTransactions(p)))).flat(), u = await c(), l = (h) => `${h.txid}_${h.status.block_time}`, d = new Set(u.map(l));
      r = setInterval(async () => {
        try {
          const p = (await c()).filter((w) => !d.has(l(w)));
          p.length > 0 && (p.forEach((w) => d.add(l(w))), n(p));
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
          const d = l["multi-address-transactions"];
          for (const h in d)
            for (const p of [
              "mempool",
              "confirmed",
              "removed"
            ])
              d[h][p] && u.push(...d[h][p].filter(Tb));
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
    if (!Eb(n))
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
};
function Eb(e) {
  return Array.isArray(e) && e.every((t) => t && typeof t == "object" && typeof t.id == "string" && t.id.length > 0 && typeof t.height == "number" && t.height >= 0 && typeof t.mediantime == "number" && t.mediantime > 0);
}
const Tb = (e) => typeof e.txid == "string" && Array.isArray(e.vout) && e.vout.every((t) => typeof t.scriptpubkey_address == "string" && typeof t.value == "number") && typeof e.status == "object" && typeof e.status.confirmed == "boolean", Sb = 0n, kb = new Uint8Array([81, 2, 78, 115]), ru = {
  script: kb,
  amount: Sb
};
x.encode(ru.script);
function hp(e, t, n) {
  const r = new ne({
    version: 3,
    lockTime: n
  });
  let i = 0n;
  for (const s of e) {
    if (!s.witnessUtxo)
      throw new Error("input needs witness utxo");
    i += s.witnessUtxo.amount, r.addInput(s);
  }
  return r.addOutput({
    script: t,
    amount: i
  }), r.addOutput(ru), r;
}
const Ib = new Error("invalid settlement transaction outputs"), Ab = new Error("empty tree"), Rb = new Error("invalid number of inputs"), aa = new Error("wrong settlement txid"), $b = new Error("invalid amount"), Ob = new Error("no leaves"), Cb = new Error("invalid taproot script"), Ul = new Error("invalid round transaction outputs"), Pb = new Error("wrong commitment txid"), Bb = new Error("missing cosigners public keys"), ca = 0, Ll = 1;
function pp(e, t) {
  if (t.validate(), t.root.inputsLength !== 1)
    throw Rb;
  const n = t.root.getInput(0), r = rt.fromPSBT(G.decode(e));
  if (r.outputsLength <= Ll)
    throw Ib;
  const i = r.id;
  if (!n.txid || x.encode(n.txid) !== i || n.index !== Ll)
    throw aa;
}
function gp(e, t, n) {
  if (t.outputsLength < ca + 1)
    throw Ul;
  const r = t.getOutput(ca)?.amount;
  if (!r)
    throw Ul;
  if (!e.root)
    throw Ab;
  const i = e.root.getInput(0), s = t.id;
  if (!i.txid || x.encode(i.txid) !== s || i.index !== ca)
    throw Pb;
  let o = 0n;
  for (let c = 0; c < e.root.outputsLength; c++) {
    const u = e.root.getOutput(c);
    u?.amount && (o += u.amount);
  }
  if (o !== r)
    throw $b;
  if (e.leaves().length === 0)
    throw Ob;
  e.validate();
  for (const c of e.iterator())
    for (const [u, l] of c.children) {
      const d = c.root.getOutput(u);
      if (!d?.script)
        throw new Error(`parent output ${u} not found`);
      const h = d.script.slice(2);
      if (h.length !== 32)
        throw new Error(`parent output ${u} has invalid script`);
      const p = Ym(l.root, 0, Zm);
      if (p.length === 0)
        throw Bb;
      const w = p.map((y) => y.key), { finalKey: f } = jm(w, !0, {
        taprootTweak: n
      });
      if (!f || x.encode(f.slice(1)) !== x.encode(h))
        throw Cb;
    }
}
function no(e, t, n) {
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
  const i = e.map((o) => Nb(o, n));
  return {
    arkTx: wp(i.map((o) => o.input), t),
    checkpoints: i.map((o) => o.tx)
  };
}
function wp(e, t) {
  let n = 0n;
  for (const i of e) {
    const s = up(gi(i.tapLeafScript));
    if (Dr.is(s)) {
      if (n !== 0n && Dl(n) !== Dl(s.params.absoluteTimelock))
        throw new Error("cannot mix seconds and blocks locktime");
      s.params.absoluteTimelock > n && (n = s.params.absoluteTimelock);
    }
  }
  const r = new ne({
    version: 3,
    lockTime: Number(n)
  });
  for (const [i, s] of e.entries())
    r.addInput({
      txid: s.txid,
      index: s.vout,
      sequence: n ? Ro - 1 : void 0,
      witnessUtxo: {
        script: re.decode(s.tapTree).pkScript,
        amount: BigInt(s.value)
      },
      tapLeafScript: [s.tapLeafScript]
    }), op(r, i, tu, s.tapTree);
  for (const i of t)
    r.addOutput(i);
  return r.addOutput(ru), r;
}
function Nb(e, t) {
  const n = up(gi(e.tapLeafScript)), r = new re([
    t.script,
    n.script
  ]), i = wp([e], [
    {
      amount: BigInt(e.value),
      script: r.pkScript
    }
  ]), s = r.findLeaf(x.encode(n.script)), o = {
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
const _b = 500000000n;
function Dl(e) {
  return e >= _b;
}
function Ub(e, t) {
  if (!e.status.block_time)
    return !1;
  if (t.value === 0n)
    return !0;
  if (t.type === "blocks")
    return !1;
  const n = BigInt(Math.floor(Date.now() / 1e3));
  return BigInt(Math.floor(e.status.block_time)) + t.value <= n;
}
function Lb(e) {
  return `0x${e.toString(16).padStart(2, "0")}`;
}
function Db(e, t, n, r = [], i = [It.DEFAULT]) {
  const s = e.getInput(t), o = [], a = [];
  for (let d = 0; d < e.inputsLength; d++) {
    const h = e.getInput(d);
    if (!h.witnessUtxo)
      throw new Error(`Input ${d} is missing witnessUtxo`);
    o.push(h.witnessUtxo.script), a.push(h.witnessUtxo.amount);
  }
  if (!s.tapScriptSig || s.tapScriptSig.length === 0)
    throw new Error(`Input ${t} is missing tapScriptSig`);
  for (const [d, h] of s.tapScriptSig) {
    const p = d.pubKey, w = x.encode(p);
    if (r.includes(w))
      continue;
    const f = h.length === 65 ? h[64] : It.DEFAULT, y = h.subarray(0, 64);
    if (!i.includes(f)) {
      const g = Lb(f);
      throw new Error(`Unallowed sighash type ${g} for input ${t}, pubkey ${w}.`);
    }
    if (!s.tapLeafScript || s.tapLeafScript.length === 0)
      throw new Error();
    const E = d.leafHash, I = x.encode(E);
    let O, B;
    for (const [g, M] of s.tapLeafScript) {
      const _ = M.subarray(0, -1), F = M[M.length - 1], A = En(_, F);
      if (x.encode(A) === I) {
        O = _, B = F;
        break;
      }
    }
    if (!O || B === void 0)
      throw new Error(`Input ${t}: No tapLeafScript found matching leafHash ${x.encode(E)}`);
    const N = e.preimageWitnessV1(t, o, f, a, void 0, O, B);
    if (!Gr.verify(y, N, p))
      throw new Error(`Invalid signature for input ${t}, pubkey ${w}`);
  }
  const c = s.tapScriptSig.map(([d]) => x.encode(d.pubKey)), l = n.filter((d) => !r.includes(d)).filter((d) => !c.includes(d));
  if (l.length > 0)
    throw new Error(`Missing signatures from: ${l.map((d) => d.slice(0, 16)).join(", ")}...`);
}
function vr(e, t) {
  for (let n = 0; n < e.inputsLength; n++) {
    const r = t.getInput(n), i = e.getInput(n);
    if (!r.tapScriptSig)
      throw new Error("No tapScriptSig");
    t.updateInput(n, {
      tapScriptSig: r.tapScriptSig?.concat(i.tapScriptSig)
    });
  }
  return t;
}
const Vb = 4320 * 60 * 1e3, Fb = {
  thresholdMs: Vb
  // 3 days
};
let kn = class se {
  constructor(t, n, r = se.DefaultHRP) {
    this.preimage = t, this.value = n, this.HRP = r, this.vout = 0;
    const i = lt(this.preimage);
    this.vtxoScript = new re([Kb(i)]);
    const s = this.vtxoScript.leaves[0];
    this.txid = x.encode(new Uint8Array(i).reverse()), this.tapTree = this.vtxoScript.encode(), this.forfeitTapLeafScript = s, this.intentTapLeafScript = s, this.value = n, this.status = { confirmed: !0 }, this.extraWitness = [this.preimage];
  }
  encode() {
    const t = new Uint8Array(se.Length);
    return t.set(this.preimage, 0), Mb(t, this.value, this.preimage.length), t;
  }
  static decode(t, n = se.DefaultHRP) {
    if (t.length !== se.Length)
      throw new Error(`invalid data length: expected ${se.Length} bytes, got ${t.length}`);
    const r = t.subarray(0, se.PreimageLength), i = Hb(t, se.PreimageLength);
    return new se(r, i, n);
  }
  static fromString(t, n = se.DefaultHRP) {
    if (t = t.trim(), !t.startsWith(n))
      throw new Error(`invalid human-readable part: expected ${n} prefix (note '${t}')`);
    const r = t.slice(n.length), i = Ci.decode(r);
    if (i.length === 0)
      throw new Error("failed to decode base58 string");
    return se.decode(i, n);
  }
  toString() {
    return this.HRP + Ci.encode(this.encode());
  }
};
kn.DefaultHRP = "arknote";
kn.PreimageLength = 32;
kn.ValueLength = 4;
kn.Length = kn.PreimageLength + kn.ValueLength;
kn.FakeOutpointIndex = 0;
function Mb(e, t, n) {
  new DataView(e.buffer, e.byteOffset + n, 4).setUint32(0, t, !1);
}
function Hb(e, t) {
  return new DataView(e.buffer, e.byteOffset + t, 4).getUint32(0, !1);
}
function Kb(e) {
  return K.encode(["SHA256", e, "EQUAL"]);
}
var nc;
(function(e) {
  e[e.INDEXER_TX_TYPE_UNSPECIFIED = 0] = "INDEXER_TX_TYPE_UNSPECIFIED", e[e.INDEXER_TX_TYPE_RECEIVED = 1] = "INDEXER_TX_TYPE_RECEIVED", e[e.INDEXER_TX_TYPE_SENT = 2] = "INDEXER_TX_TYPE_SENT";
})(nc || (nc = {}));
var Er;
(function(e) {
  e.UNSPECIFIED = "INDEXER_CHAINED_TX_TYPE_UNSPECIFIED", e.COMMITMENT = "INDEXER_CHAINED_TX_TYPE_COMMITMENT", e.ARK = "INDEXER_CHAINED_TX_TYPE_ARK", e.TREE = "INDEXER_CHAINED_TX_TYPE_TREE", e.CHECKPOINT = "INDEXER_CHAINED_TX_TYPE_CHECKPOINT";
})(Er || (Er = {}));
let Wb = class {
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
    if (!oe.isVtxoTreeResponse(o))
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
    if (!oe.isVtxoTreeLeavesResponse(o))
      throw new Error("Invalid vtxos tree leaves data received");
    return o;
  }
  async getBatchSweepTransactions(t) {
    const n = `${this.serverUrl}/v1/indexer/batch/${t.txid}/${t.vout}/sweepTxs`, r = await fetch(n);
    if (!r.ok)
      throw new Error(`Failed to fetch batch sweep transactions: ${r.statusText}`);
    const i = await r.json();
    if (!oe.isBatchSweepTransactionsResponse(i))
      throw new Error("Invalid batch sweep transactions data received");
    return i;
  }
  async getCommitmentTx(t) {
    const n = `${this.serverUrl}/v1/indexer/commitmentTx/${t}`, r = await fetch(n);
    if (!r.ok)
      throw new Error(`Failed to fetch commitment tx: ${r.statusText}`);
    const i = await r.json();
    if (!oe.isCommitmentTx(i))
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
    if (!oe.isConnectorsResponse(o))
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
    if (!oe.isForfeitTxsResponse(o))
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
          for await (const o of tc(i)) {
            if (n?.aborted)
              break;
            try {
              const a = JSON.parse(o.data);
              a.event && (yield {
                txid: a.event.txid,
                scripts: a.event.scripts || [],
                newVtxos: (a.event.newVtxos || []).map(Ji),
                spentVtxos: (a.event.spentVtxos || []).map(Ji),
                sweptVtxos: (a.event.sweptVtxos || []).map(Ji),
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
        if (ec(i)) {
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
    if (!oe.isVirtualTxsResponse(o))
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
    if (!oe.isVtxoChainResponse(o))
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
    if (!oe.isVtxosResponse(s))
      throw new Error("Invalid vtxos data received");
    return {
      vtxos: s.vtxos.map(Ji),
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
};
function Ji(e) {
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
var oe;
(function(e) {
  function t(g) {
    return typeof g == "object" && typeof g.totalOutputAmount == "string" && typeof g.totalOutputVtxos == "number" && typeof g.expiresAt == "string" && typeof g.swept == "boolean";
  }
  function n(g) {
    return typeof g == "object" && typeof g.txid == "string" && typeof g.expiresAt == "string" && Object.values(Er).includes(g.type) && Array.isArray(g.spends) && g.spends.every((M) => typeof M == "string");
  }
  function r(g) {
    return typeof g == "object" && typeof g.startedAt == "string" && typeof g.endedAt == "string" && typeof g.totalInputAmount == "string" && typeof g.totalInputVtxos == "number" && typeof g.totalOutputAmount == "string" && typeof g.totalOutputVtxos == "number" && typeof g.batches == "object" && Object.values(g.batches).every(t);
  }
  e.isCommitmentTx = r;
  function i(g) {
    return typeof g == "object" && typeof g.txid == "string" && typeof g.vout == "number";
  }
  e.isOutpoint = i;
  function s(g) {
    return Array.isArray(g) && g.every(i);
  }
  e.isOutpointArray = s;
  function o(g) {
    return typeof g == "object" && typeof g.txid == "string" && typeof g.children == "object" && Object.values(g.children).every(l) && Object.keys(g.children).every((M) => Number.isInteger(Number(M)));
  }
  function a(g) {
    return Array.isArray(g) && g.every(o);
  }
  e.isTxsArray = a;
  function c(g) {
    return typeof g == "object" && typeof g.amount == "string" && typeof g.createdAt == "string" && typeof g.isSettled == "boolean" && typeof g.settledBy == "string" && Object.values(nc).includes(g.type) && (!g.commitmentTxid && typeof g.virtualTxid == "string" || typeof g.commitmentTxid == "string" && !g.virtualTxid);
  }
  function u(g) {
    return Array.isArray(g) && g.every(c);
  }
  e.isTxHistoryRecordArray = u;
  function l(g) {
    return typeof g == "string" && g.length === 64;
  }
  function d(g) {
    return Array.isArray(g) && g.every(l);
  }
  e.isTxidArray = d;
  function h(g) {
    return typeof g == "object" && i(g.outpoint) && typeof g.createdAt == "string" && (g.expiresAt === null || typeof g.expiresAt == "string") && typeof g.amount == "string" && typeof g.script == "string" && typeof g.isPreconfirmed == "boolean" && typeof g.isSwept == "boolean" && typeof g.isUnrolled == "boolean" && typeof g.isSpent == "boolean" && (!g.spentBy || typeof g.spentBy == "string") && (!g.settledBy || typeof g.settledBy == "string") && (!g.arkTxid || typeof g.arkTxid == "string") && Array.isArray(g.commitmentTxids) && g.commitmentTxids.every(l);
  }
  function p(g) {
    return typeof g == "object" && typeof g.current == "number" && typeof g.next == "number" && typeof g.total == "number";
  }
  function w(g) {
    return typeof g == "object" && Array.isArray(g.vtxoTree) && g.vtxoTree.every(o) && (!g.page || p(g.page));
  }
  e.isVtxoTreeResponse = w;
  function f(g) {
    return typeof g == "object" && Array.isArray(g.leaves) && g.leaves.every(i) && (!g.page || p(g.page));
  }
  e.isVtxoTreeLeavesResponse = f;
  function y(g) {
    return typeof g == "object" && Array.isArray(g.connectors) && g.connectors.every(o) && (!g.page || p(g.page));
  }
  e.isConnectorsResponse = y;
  function E(g) {
    return typeof g == "object" && Array.isArray(g.txids) && g.txids.every(l) && (!g.page || p(g.page));
  }
  e.isForfeitTxsResponse = E;
  function I(g) {
    return typeof g == "object" && Array.isArray(g.sweptBy) && g.sweptBy.every(l);
  }
  e.isSweptCommitmentTxResponse = I;
  function O(g) {
    return typeof g == "object" && Array.isArray(g.sweptBy) && g.sweptBy.every(l);
  }
  e.isBatchSweepTransactionsResponse = O;
  function B(g) {
    return typeof g == "object" && Array.isArray(g.txs) && g.txs.every((M) => typeof M == "string") && (!g.page || p(g.page));
  }
  e.isVirtualTxsResponse = B;
  function N(g) {
    return typeof g == "object" && Array.isArray(g.chain) && g.chain.every(n) && (!g.page || p(g.page));
  }
  e.isVtxoChainResponse = N;
  function V(g) {
    return typeof g == "object" && Array.isArray(g.vtxos) && g.vtxos.every(h) && (!g.page || p(g.page));
  }
  e.isVtxosResponse = V;
})(oe || (oe = {}));
const zb = 546;
function pr(e, t) {
  return {
    ...t,
    forfeitTapLeafScript: e.offchainTapscript.forfeit(),
    intentTapLeafScript: e.offchainTapscript.forfeit(),
    tapTree: e.offchainTapscript.encode()
  };
}
function jb(e, t) {
  return {
    ...t,
    forfeitTapLeafScript: e.boardingTapscript.forfeit(),
    intentTapLeafScript: e.boardingTapscript.forfeit(),
    tapTree: e.boardingTapscript.encode()
  };
}
class ut extends Error {
  #t;
  constructor(t, n, r) {
    super(t, { cause: r }), this.name = "ParseError", this.#t = n, n?.input && (this.message = Vr(this.message, n));
  }
  get node() {
    return this.#t;
  }
  withAst(t) {
    return this.#t ? this : (this.#t = t, t?.input ? (this.message = Vr(this.message, t), this) : this);
  }
}
class Z extends Error {
  #t;
  constructor(t, n, r) {
    super(t, { cause: r }), this.name = "EvaluationError", this.#t = n, n?.input && (this.message = Vr(this.message, n));
  }
  get node() {
    return this.#t;
  }
  withAst(t) {
    return this.#t ? this : (this.#t = t, t?.input ? (this.message = Vr(this.message, t), this) : this);
  }
}
let qb = class extends Error {
  #t;
  constructor(t, n, r) {
    super(t, { cause: r }), this.name = "TypeError", this.#t = n, n?.input && (this.message = Vr(this.message, n));
  }
  get node() {
    return this.#t;
  }
  withAst(t) {
    return this.#t ? this : (this.#t = t, t?.input ? (this.message = Vr(this.message, t), this) : this);
  }
};
function Vr(e, t) {
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
  const u = r.slice(a, c), l = `${i}`.padStart(4, " "), d = " ".repeat(9 + o);
  return `${e}

> ${l} | ${u}
${d}^`;
}
class Me {
  #t;
  constructor(t) {
    this.#t = t;
  }
  static of(t) {
    return t === void 0 ? ro : new Me(t);
  }
  static none() {
    return ro;
  }
  hasValue() {
    return this.#t !== void 0;
  }
  value() {
    if (this.#t === void 0) throw new Z("Optional value is not present");
    return this.#t;
  }
  or(t) {
    if (this.#t !== void 0) return this;
    if (t instanceof Me) return t;
    throw new Z("Optional.or must be called with an Optional argument");
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
const ro = Object.freeze(new Me());
class yp {
}
const mp = new yp();
function Gb(e, t) {
  e.constants.set("optional", t ? mp : void 0);
}
function Yb(e) {
  const t = (d, h) => e.registerFunctionOverload(d, h), n = e.enableOptionalTypes ? mp : void 0;
  e.registerType("OptionalNamespace", yp), e.registerConstant("optional", "OptionalNamespace", n), t("optional.hasValue(): bool", (d) => d.hasValue()), t("optional<A>.value(): A", (d) => d.value()), e.registerFunctionOverload("OptionalNamespace.none(): optional<T>", () => Me.none()), t("OptionalNamespace.of(A): optional<A>", (d, h) => Me.of(h));
  function r(d, h, p) {
    if (d instanceof Me) return d;
    throw new Z(`${p} must be optional`, h);
  }
  function i(d, h, p) {
    const w = d.eval(h.receiver, p);
    return w instanceof Promise ? w.then((f) => s(f, d, h, p)) : s(w, d, h, p);
  }
  function s(d, h, p, w) {
    const f = r(d, p.receiver, `${p.functionDesc} receiver`);
    return f.hasValue() ? p.onHasValue(f) : p.onEmpty(h, p, w);
  }
  function o(d, h, p, w) {
    const f = d.check(h, p);
    if (f.kind === "optional") return f;
    if (f.kind === "dyn") return d.getType("optional");
    throw new d.Error(`${w} must be optional, got '${f}'`, h);
  }
  function a({ functionDesc: d, evaluate: h, typeCheck: p, onHasValue: w, onEmpty: f }) {
    return ({ args: y, receiver: E }) => ({
      functionDesc: d,
      receiver: E,
      arg: y[0],
      evaluate: h,
      typeCheck: p,
      onHasValue: w,
      onEmpty: f
    });
  }
  const c = "optional.orValue() receiver", u = "optional.or(optional) receiver", l = "optional.or(optional) argument";
  e.registerFunctionOverload(
    "optional.or(ast): optional<dyn>",
    a({
      functionDesc: "optional.or(optional)",
      evaluate: i,
      typeCheck(d, h, p) {
        const w = o(d, h.receiver, p, u), f = o(d, h.arg, p, l), y = w.unify(d.registry, f);
        if (y) return y;
        throw new d.Error(
          `${h.functionDesc} argument must be compatible type, got '${w}' and '${f}'`,
          h.arg
        );
      },
      onHasValue: (d) => d,
      onEmpty(d, h, p) {
        const w = h.arg, f = d.eval(w, p);
        return f instanceof Promise ? f.then((y) => r(y, w, l)) : r(f, w, l);
      }
    })
  ), e.registerFunctionOverload(
    "optional.orValue(ast): dyn",
    a({
      functionDesc: "optional.orValue(value)",
      onHasValue: (d) => d.value(),
      onEmpty(d, h, p) {
        return d.eval(h.arg, p);
      },
      evaluate: i,
      typeCheck(d, h, p) {
        const w = o(d, h.receiver, p, c).valueType, f = d.check(h.arg, p), y = w.unify(d.registry, f);
        if (y) return y;
        throw new d.Error(
          `${h.functionDesc} argument must be compatible type, got '${w}' and '${f}'`,
          h.arg
        );
      }
    })
  );
}
class Hn {
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
    if (t < 0n || t > 18446744073709551615n) throw new Z("Unsigned integer overflow");
    this.#t = t;
  }
  get [Symbol.toStringTag]() {
    return `value = ${this.#t}`;
  }
  [Symbol.for("nodejs.util.inspect.custom")]() {
    return `UnsignedInteger { value: ${this.#t} }`;
  }
}
const Zb = {
  h: 3600000000000n,
  m: 60000000000n,
  s: 1000000000n,
  ms: 1000000n,
  us: 1000n,
  µs: 1000n,
  ns: 1n
};
class In {
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
    return new In(r, i);
  }
  addDuration(t) {
    const n = this.#e + t.nanos;
    return new In(
      this.#t + t.seconds + BigInt(Math.floor(n / 1e9)),
      n % 1e9
    );
  }
  subtractDuration(t) {
    const n = this.#e - t.nanos;
    return new In(
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
function Xb(e) {
  const t = (f, y) => e.registerFunctionOverload(f, y), n = (f) => f;
  t("dyn(dyn): dyn", n);
  for (const f in wi) {
    const y = wi[f];
    y instanceof Mt && t(`type(${y.name}): type`, () => y);
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
        throw new Z(`bool() conversion error: invalid string value "${f}"`);
    }
  });
  const r = Object.keys;
  t("size(string): int", (f) => BigInt(Vl(f))), t("size(bytes): int", (f) => BigInt(f.length)), t("size(list): int", (f) => BigInt(f.length ?? f.size)), t(
    "size(map): int",
    (f) => BigInt(f instanceof Map ? f.size : r(f).length)
  ), t("string.size(): int", (f) => BigInt(Vl(f))), t("bytes.size(): int", (f) => BigInt(f.length)), t("list.size(): int", (f) => BigInt(f.length ?? f.size)), t(
    "map.size(): int",
    (f) => BigInt(f instanceof Map ? f.size : r(f).length)
  ), t("bytes(string): bytes", (f) => o.fromString(f)), t("bytes(bytes): bytes", n), t("double(double): double", n), t("double(int): double", (f) => Number(f)), t("double(uint): double", (f) => Number(f)), t("double(string): double", (f) => {
    if (!f || f !== f.trim())
      throw new Z("double() type error: cannot convert to double");
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
        const E = Number(f);
        if (!Number.isNaN(E)) return E;
        throw new Z("double() type error: cannot convert to double");
      }
    }
  }), t("int(int): int", n), t("int(double): int", (f) => {
    if (Number.isFinite(f)) return BigInt(Math.trunc(f));
    throw new Z("int() type error: integer overflow");
  }), t("int(string): int", (f) => {
    if (f !== f.trim() || f.length > 20 || f.includes("0x"))
      throw new Z("int() type error: cannot convert to int");
    try {
      const y = BigInt(f);
      if (y <= 9223372036854775807n && y >= -9223372036854775808n) return y;
    } catch {
    }
    throw new Z("int() type error: cannot convert to int");
  }), t("uint(uint): uint", n), t("uint(double): uint", (f) => {
    if (Number.isFinite(f)) return BigInt(Math.trunc(f));
    throw new Z("int() type error: integer overflow");
  }), t("uint(string): uint", (f) => {
    if (f !== f.trim() || f.length > 20 || f.includes("0x"))
      throw new Z("uint() type error: cannot convert to uint");
    try {
      const y = BigInt(f);
      if (y <= 18446744073709551615n && y >= 0n) return y;
    } catch {
    }
    throw new Z("uint() type error: cannot convert to uint");
  }), t("string(string): string", n), t("string(bool): string", (f) => `${f}`), t("string(int): string", (f) => `${f}`), t("string(bytes): string", (f) => o.toUtf8(f)), t("string(double): string", (f) => f === 1 / 0 ? "+Inf" : f === -1 / 0 ? "-Inf" : `${f}`), t("string.startsWith(string): bool", (f, y) => f.startsWith(y)), t("string.endsWith(string): bool", (f, y) => f.endsWith(y)), t("string.contains(string): bool", (f, y) => f.includes(y)), t("string.lowerAscii(): string", (f) => f.toLowerCase()), t("string.upperAscii(): string", (f) => f.toUpperCase()), t("string.trim(): string", (f) => f.trim()), t(
    "string.indexOf(string): int",
    (f, y) => BigInt(f.indexOf(y))
  ), t("string.indexOf(string, int): int", (f, y, E) => {
    if (y === "") return E;
    if (E = Number(E), E < 0 || E >= f.length)
      throw new Z("string.indexOf(search, fromIndex): fromIndex out of range");
    return BigInt(f.indexOf(y, E));
  }), t(
    "string.lastIndexOf(string): int",
    (f, y) => BigInt(f.lastIndexOf(y))
  ), t("string.lastIndexOf(string, int): int", (f, y, E) => {
    if (y === "") return E;
    if (E = Number(E), E < 0 || E >= f.length)
      throw new Z("string.lastIndexOf(search, fromIndex): fromIndex out of range");
    return BigInt(f.lastIndexOf(y, E));
  }), t("string.substring(int): string", (f, y) => {
    if (y = Number(y), y < 0 || y > f.length)
      throw new Z("string.substring(start, end): start index out of range");
    return f.substring(y);
  }), t("string.substring(int, int): string", (f, y, E) => {
    if (y = Number(y), y < 0 || y > f.length)
      throw new Z("string.substring(start, end): start index out of range");
    if (E = Number(E), E < y || E > f.length)
      throw new Z("string.substring(start, end): end index out of range");
    return f.substring(y, E);
  }), t("string.matches(string): bool", (f, y) => {
    try {
      return new RegExp(y).test(f);
    } catch {
      throw new Z(`Invalid regular expression: ${y}`);
    }
  }), t("string.split(string): list<string>", (f, y) => f.split(y)), t("string.split(string, int): list<string>", (f, y, E) => {
    if (E = Number(E), E === 0) return [];
    const I = f.split(y);
    if (E < 0 || I.length <= E) return I;
    const O = I.slice(0, E - 1);
    return O.push(I.slice(E - 1).join(y)), O;
  }), t("list<string>.join(): string", (f) => {
    for (let y = 0; y < f.length; y++)
      if (typeof f[y] != "string")
        throw new Z("string.join(): list must contain only strings");
    return f.join("");
  }), t("list<string>.join(string): string", (f, y) => {
    for (let E = 0; E < f.length; E++)
      if (typeof f[E] != "string")
        throw new Z("string.join(separator): list must contain only strings");
    return f.join(y);
  });
  const i = new TextEncoder("utf8"), s = new TextDecoder("utf8"), o = typeof Buffer < "u" ? {
    byteLength: (f) => Buffer.byteLength(f),
    fromString: (f) => Buffer.from(f, "utf8"),
    toHex: (f) => Buffer.prototype.hexSlice.call(f, 0, f.length),
    toBase64: (f) => Buffer.prototype.base64Slice.call(f, 0, f.length),
    toUtf8: (f) => Buffer.prototype.utf8Slice.call(f, 0, f.length),
    jsonParse: (f) => JSON.parse(f)
  } : {
    textEncoder: new TextEncoder("utf8"),
    byteLength: (f) => i.encode(f).length,
    fromString: (f) => i.encode(f),
    toHex: Uint8Array.prototype.toHex ? (f) => f.toHex() : (f) => Array.from(f, (y) => y.toString(16).padStart(2, "0")).join(""),
    toBase64: Uint8Array.prototype.toBase64 ? (f) => f.toBase64() : (f) => btoa(Array.from(f, (y) => String.fromCodePoint(y)).join("")),
    toUtf8: (f) => s.decode(f),
    jsonParse: (f) => JSON.parse(i.decode(f))
  };
  t("bytes.json(): map", o.jsonParse), t("bytes.hex(): string", o.toHex), t("bytes.string(): string", o.toUtf8), t("bytes.base64(): string", o.toBase64), t("bytes.at(int): int", (f, y) => {
    if (y < 0 || y >= f.length) throw new Z("Bytes index out of range");
    return BigInt(f[y]);
  });
  const a = "google.protobuf.Timestamp", c = "google.protobuf.Duration", u = e.registerType(a, Date).getObjectType(a).typeType, l = e.registerType(c, In).getObjectType(c).typeType;
  e.registerConstant("google", "map<string, map<string, type>>", {
    protobuf: { Duration: l, Timestamp: u }
  });
  function d(f, y) {
    return new Date(f.toLocaleString("en-US", { timeZone: y }));
  }
  function h(f, y) {
    const E = y ? d(f, y) : new Date(f.getUTCFullYear(), f.getUTCMonth(), f.getUTCDate()), I = new Date(E.getFullYear(), 0, 0);
    return BigInt(Math.floor((E - I) / 864e5) - 1);
  }
  t(`timestamp(string): ${a}`, (f) => {
    if (f.length < 20 || f.length > 30)
      throw new Z("timestamp() requires a string in ISO 8601 format");
    const y = new Date(f);
    if (y <= 253402300799999 && y >= -621355968e5) return y;
    throw new Z("timestamp() requires a string in ISO 8601 format");
  }), t(`timestamp(int): ${a}`, (f) => {
    if (f = Number(f) * 1e3, f <= 253402300799999 && f >= -621355968e5) return new Date(f);
    throw new Z("timestamp() requires a valid integer unix timestamp");
  }), t(`${a}.getDate(): int`, (f) => BigInt(f.getUTCDate())), t(`${a}.getDate(string): int`, (f, y) => BigInt(d(f, y).getDate())), t(`${a}.getDayOfMonth(): int`, (f) => BigInt(f.getUTCDate() - 1)), t(
    `${a}.getDayOfMonth(string): int`,
    (f, y) => BigInt(d(f, y).getDate() - 1)
  ), t(`${a}.getDayOfWeek(): int`, (f) => BigInt(f.getUTCDay())), t(`${a}.getDayOfWeek(string): int`, (f, y) => BigInt(d(f, y).getDay())), t(`${a}.getDayOfYear(): int`, h), t(`${a}.getDayOfYear(string): int`, h), t(`${a}.getFullYear(): int`, (f) => BigInt(f.getUTCFullYear())), t(`${a}.getFullYear(string): int`, (f, y) => BigInt(d(f, y).getFullYear())), t(`${a}.getHours(): int`, (f) => BigInt(f.getUTCHours())), t(`${a}.getHours(string): int`, (f, y) => BigInt(d(f, y).getHours())), t(`${a}.getMilliseconds(): int`, (f) => BigInt(f.getUTCMilliseconds())), t(`${a}.getMilliseconds(string): int`, (f) => BigInt(f.getUTCMilliseconds())), t(`${a}.getMinutes(): int`, (f) => BigInt(f.getUTCMinutes())), t(`${a}.getMinutes(string): int`, (f, y) => BigInt(d(f, y).getMinutes())), t(`${a}.getMonth(): int`, (f) => BigInt(f.getUTCMonth())), t(`${a}.getMonth(string): int`, (f, y) => BigInt(d(f, y).getMonth())), t(`${a}.getSeconds(): int`, (f) => BigInt(f.getUTCSeconds())), t(`${a}.getSeconds(string): int`, (f, y) => BigInt(d(f, y).getSeconds()));
  const p = /(\d*\.?\d*)(ns|us|µs|ms|s|m|h)/;
  function w(f) {
    if (!f) throw new Z("Invalid duration string: ''");
    const y = f[0] === "-";
    (f[0] === "-" || f[0] === "+") && (f = f.slice(1));
    let E = BigInt(0);
    for (; ; ) {
      const B = p.exec(f);
      if (!B) throw new Z(`Invalid duration string: ${f}`);
      if (B.index !== 0) throw new Z(`Invalid duration string: ${f}`);
      f = f.slice(B[0].length);
      const N = Zb[B[2]], [V = "0", g = ""] = B[1].split("."), M = BigInt(V) * N, _ = g ? BigInt(g.slice(0, 13).padEnd(13, "0")) * N / 10000000000000n : 0n;
      if (E += M + _, f === "") break;
    }
    const I = E >= 1000000000n ? E / 1000000000n : 0n, O = Number(E % 1000000000n);
    return y ? new In(-I, -O) : new In(I, O);
  }
  t("duration(string): google.protobuf.Duration", (f) => w(f)), t("google.protobuf.Duration.getHours(): int", (f) => f.getHours()), t("google.protobuf.Duration.getMinutes(): int", (f) => f.getMinutes()), t("google.protobuf.Duration.getSeconds(): int", (f) => f.getSeconds()), t("google.protobuf.Duration.getMilliseconds(): int", (f) => f.getMilliseconds()), Yb(e);
}
function Vl(e) {
  let t = 0;
  for (const n of e) t++;
  return t;
}
class Mt {
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
const wi = {
  string: new Mt("string"),
  bool: new Mt("bool"),
  int: new Mt("int"),
  uint: new Mt("uint"),
  double: new Mt("double"),
  map: new Mt("map"),
  list: new Mt("list"),
  bytes: new Mt("bytes"),
  null_type: new Mt("null"),
  type: new Mt("type")
};
class Lo {
  #t = null;
  #e = null;
  constructor(t) {
    t instanceof Lo ? (this.#t = t, this.#e = /* @__PURE__ */ new Map()) : this.#e = new Map(t);
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
class Qb extends Lo {
  constructor(t = null, n = null) {
    super(t, n);
  }
  get(t) {
    const n = super.get(t);
    return n === void 0 ? we : n;
  }
}
function Ze(e, t = Lo, n = !0) {
  return e instanceof t ? e.fork(n) : new t(e);
}
class Un {
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
    if (t = t instanceof Me ? t.orValue() : t, t === void 0) return ro;
    const s = i.debugType(t);
    try {
      return Me.of(s.fieldLazy(t, n, r, i));
    } catch (o) {
      if (o instanceof Z) return ro;
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
    throw new Z(
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
    throw new Z(
      `Field '${n}' is not of type '${this.valueType}', got '${o}'`,
      r
    );
  }
  #a(t, n, r, i) {
    if (!(typeof n == "number" || typeof n == "bigint")) return;
    const s = t[n];
    if (s === void 0)
      throw new Z(
        `No such key: index out of bounds, index ${n} ${n < 0 ? "< 0" : `>= size ${t.length}`}`,
        r
      );
    const o = i.debugType(s);
    if (this.valueType.matches(o)) return s;
    throw new Z(
      `List item with index '${n}' is not of type '${this.valueType}', got '${o}'`,
      r
    );
  }
  fieldLazy() {
  }
  field(t, n, r, i) {
    const s = this.fieldLazy(t, n, r, i);
    if (s !== void 0) return s;
    throw new Z(`No such key: ${n}`, r);
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
function Jb(e, t) {
  const n = `Macro '${e}' must `;
  return function(i) {
    const s = t(i);
    if (!s || typeof s != "object") throw new Error(`${n} must return an object.`);
    if (!s?.typeCheck) throw new Error(`${n} have a .typeCheck(checker, macro, ctx) method.`);
    if (!s?.evaluate) throw new Error(`${n} have a .evaluate(evaluator, macro, ctx) method.`);
    return s;
  };
}
class tx {
  #t;
  constructor({ name: t, receiverType: n, argTypes: r, returnType: i, handler: s }) {
    this.name = t, this.receiverType = n || null, this.argTypes = r, this.returnType = i, this.macro = r.includes(vs);
    const o = n ? `${n}.` : "";
    this.signature = `${o}${t}(${r.join(", ")}): ${i}`, this.handler = this.macro ? Jb(this.signature, s) : s, Object.freeze(this);
  }
  hasPlaceholder() {
    return this.#t ??= this.returnType.hasPlaceholder() || this.receiverType?.hasPlaceholder() || this.argTypes.some((t) => t.hasPlaceholder()) || !1;
  }
  matchesArgs(t) {
    return t.length === this.argTypes.length && this.argTypes.every((n, r) => n.matches(t[r])) ? this : null;
  }
}
class ri {
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
function bp(e) {
  return new Un({
    kind: "list",
    name: `list<${e}>`,
    type: "list",
    valueType: e
  });
}
function Xe(e) {
  return new Un({ kind: "primitive", name: e, type: e });
}
function ex(e) {
  return new Un({ kind: "message", name: e, type: e });
}
function xp(e) {
  const t = e ? `dyn<${e}>` : "dyn";
  return new Un({ kind: "dyn", name: t, type: t, valueType: e });
}
function vp(e) {
  const t = e ? `optional<${e}>` : "optional";
  return new Un({ kind: "optional", name: t, type: "optional", valueType: e });
}
function Ep(e, t) {
  return new Un({
    kind: "map",
    name: `map<${e}, ${t}>`,
    type: "map",
    keyType: e,
    valueType: t
  });
}
function nx(e) {
  return new Un({ kind: "param", name: e, type: e });
}
const we = xp(), vs = Xe("ast"), Fl = bp(we), Ml = Ep(we, we), Bt = Object.freeze({
  string: Xe("string"),
  bool: Xe("bool"),
  int: Xe("int"),
  uint: Xe("uint"),
  double: Xe("double"),
  bytes: Xe("bytes"),
  dyn: we,
  null: Xe("null"),
  type: Xe("type"),
  optional: vp(we),
  list: Fl,
  "list<dyn>": Fl,
  map: Ml,
  "map<dyn, dyn>": Ml
});
class rx {
  returnType = null;
  /** @type {Array<FunctionDeclaration>} */
  declarations = [];
  constructor(t) {
    this.registry = t;
  }
  add(t) {
    this.returnType = (this.returnType ? this.returnType.unify(this.registry, t.returnType) : t.returnType) || we, this.declarations.push(t);
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
function Hl(e) {
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
const Tp = [
  [void 0, "map"],
  [Object, "map"],
  [Map, "map"],
  [Array, "list"],
  [Uint8Array, "bytes"],
  [Hn, "uint"],
  [Mt, "type"],
  [Me, "optional"]
];
typeof Buffer < "u" && Tp.push([Buffer, "bytes"]);
class iu {
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
    if (this.enableOptionalTypes = t.enableOptionalTypes ?? !1, this.objectTypes = Ze(t.objectTypes), this.objectTypesByConstructor = Ze(t.objectTypesByConstructor), this.objectTypeInstances = Ze(t.objectTypeInstances), this.#i = Ze(t.functionDeclarations), this.#r = Ze(t.operatorDeclarations), this.#n = Ze(
      t.typeDeclarations || Object.entries(Bt),
      void 0,
      !1
    ), this.constants = Ze(t.constants), this.variables = t.unlistedVariablesAreDyn ? Ze(t.variables, Qb) : Ze(t.variables), this.variables.size)
      Gb(this, this.enableOptionalTypes);
    else {
      for (const n of Tp) this.registerType(n[1], n[0], !0);
      for (const n in wi) this.registerConstant(n, "type", wi[n]);
    }
  }
  #g() {
    this.#t = {}, this.#e = {};
  }
  registerVariable(t, n) {
    if (this.variables.has(t)) throw new Error(`Variable already registered: ${t}`);
    return this.variables.set(t, n instanceof Un ? n : this.getType(n)), this;
  }
  registerConstant(t, n, r) {
    return this.registerVariable(t, n), this.constants.set(t, r), this;
  }
  #w(t, n, r) {
    let i = this.#o.get(t);
    return i = i.get(n) || i.set(n, /* @__PURE__ */ new Map()).get(n), i.get(r) || i.set(r, new rx(this)).get(r);
  }
  getFunctionCandidates(t, n, r) {
    const i = this.#o.get(t)?.get(n)?.get(r);
    if (i) return i;
    for (const [, s] of this.#i)
      this.#w(!!s.receiverType, s.name, s.argTypes.length).add(s);
    return this.#w(t, n, r);
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
    return t === "ast" ? vs : this.#s(t, !0);
  }
  registerType(t, n, r) {
    if (typeof t != "string" || t.length < 2)
      throw new Error(`Invalid type name: ${t}`);
    const i = {
      name: t,
      typeType: wi[t] || new Mt(t),
      type: this.#s(t, !1),
      ctor: typeof n == "function" ? n : n?.ctor,
      fields: this.#T(t, n?.fields)
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
    if (r = t.match(/^[A-Z]$/), r) return this.#l(nx, t, t);
    if (r = t.match(/^dyn<(.+)>$/), r) {
      const i = this.#s(r[1].trim(), n);
      return this.#l(xp, `dyn<${i}>`, i);
    }
    if (r = t.match(/^list<(.+)>$/), r) {
      const i = this.#s(r[1].trim(), n);
      return this.#l(bp, `list<${i}>`, i);
    }
    if (r = t.match(/^map<(.+)>$/), r) {
      const i = Hl(r[1]);
      if (i.length !== 2) throw new Error(`Invalid map type: ${t}`);
      const s = this.#s(i[0].trim(), n), o = this.#s(i[1].trim(), n);
      return this.#l(Ep, `map<${s}, ${o}>`, s, o);
    }
    if (r = t.match(/^optional<(.+)>$/), r) {
      const i = this.#s(r[1].trim(), n);
      return this.#l(vp, `optional<${i}>`, i);
    }
    if (n) {
      const i = new Error(`Unknown type: ${t}`);
      throw i.unknownType = t, i;
    }
    return this.#l(ex, t, t);
  }
  #l(t, n, ...r) {
    return this.#n.get(n) || this.#n.set(n, t(...r)).get(n);
  }
  findMacro(t, n, r) {
    return this.#t[n]?.get(t)?.get(r) ?? this.#f(
      this.#t,
      n,
      t,
      r,
      this.getFunctionCandidates(n, t, r).declarations.find(
        (i) => i.macro
      ) || !1
    );
  }
  #y(t, n, r) {
    const i = [];
    for (const [, s] of this.#r) {
      if (s.operator !== t) continue;
      if (s.leftType === n && s.rightType === r) return [s];
      const o = this.#x(s, n, r);
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
    return this.#t[t]?.get(n)?.get(r) ?? this.#f(
      this.#t,
      t,
      n,
      r,
      this.#m(t, n, r)
    );
  }
  checkBinaryOverload(t, n, r) {
    return this.#e[t]?.get(n)?.get(r) ?? this.#f(
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
    return i.every((o) => o.returnType === s) ? s : (s.kind === "list" || s.kind === "map") && i.every((o) => o.returnType.kind === s.kind) ? s.kind === "list" ? Bt.list : Bt.map : Bt.dyn;
  }
  #f(t, n, r, i, s) {
    const o = t[n] ??= /* @__PURE__ */ new Map();
    return (o.get(r) || o.set(r, /* @__PURE__ */ new Map()).get(r)).set(i, s), s;
  }
  #x(t, n, r) {
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
    return this.#d(t, n, r, i) && (i || n.matches(t.templated(this, r))) ? n : null;
  }
  #v(t, n, r) {
    const i = r.get(t);
    return i ? i.kind === "dyn" || n.kind === "dyn" ? !0 : i.matchesBoth(n) : r.set(t, n) && !0;
  }
  #d(t, n, r, i = !1) {
    if (!t.hasPlaceholder()) return !0;
    if (!n) return !1;
    const s = i || n.kind === "dyn";
    switch (n = n.unwrappedType, t.kind) {
      case "param": {
        const o = s ? Bt.dyn : n;
        return this.#v(t.name, o, r);
      }
      case "list":
        return n.name === "dyn" && (n = t), n.kind !== "list" ? !1 : this.#d(
          t.valueType,
          n.valueType,
          r,
          s
        );
      case "map":
        return n.name === "dyn" && (n = t), n.kind !== "map" ? !1 : this.#d(
          t.keyType,
          n.keyType,
          r,
          s
        ) && this.#d(
          t.valueType,
          n.valueType,
          r,
          s
        );
      case "optional":
        return n.name === "dyn" && (n = t), n.kind !== "optional" ? !1 : this.#d(
          t.valueType,
          n.valueType,
          r,
          s
        );
    }
    return !0;
  }
  #E(t, n, r, i = !1) {
    try {
      const s = typeof n[r] == "string" ? { type: n[r] } : { ...n[r] };
      if (typeof s?.type != "string") throw new Error("unsupported declaration");
      return this.#s(s.type, i);
    } catch (s) {
      throw s.message = `Field '${r}' in type '${t}' has unsupported declaration: ${JSON.stringify(n[r])}`, s;
    }
  }
  #T(t, n) {
    if (!n) return;
    const r = /* @__PURE__ */ Object.create(null);
    for (const i of Object.keys(n)) r[i] = this.#E(t, n, i);
    return r;
  }
  clone(t) {
    return new iu({
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
  #S(t, n) {
    const r = t.match(/^(?:([a-zA-Z0-9.<>]+)\.)?(\w+)\((.*?)\):\s*(.+)$/);
    if (!r) throw new Error(`Invalid signature: ${t}`);
    const [, i, s, o, a] = r;
    try {
      return new tx({
        name: s,
        receiverType: i ? this.getType(i) : null,
        returnType: this.getType(a.trim()),
        argTypes: Hl(o).map((c) => this.getFunctionType(c.trim())),
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
  #k(t, n) {
    return t.name !== n.name || t.argTypes.length !== n.argTypes.length || (t.receiverType || n.receiverType) && (!t.receiverType || !n.receiverType) ? !1 : !(t.receiverType !== n.receiverType && t.receiverType !== we && n.receiverType !== we) && (n.macro || t.macro || n.argTypes.every((i, s) => {
      const o = t.argTypes[s];
      return i === o || i === vs || o === vs || i === we || o === we;
    }));
  }
  /** @param {FunctionDeclaration} newDec */
  #I(t) {
    for (const [, n] of this.#i)
      if (this.#k(n, t))
        throw new Error(
          `Function signature '${t.signature}' overlaps with existing overload '${n.signature}'.`
        );
  }
  registerFunctionOverload(t, n) {
    const r = typeof n == "function" ? n : n?.handler, i = this.#S(t, r);
    this.#I(i), this.#i.set(i.signature, i), this.#o.get(!0).clear(), this.#o.get(!1).clear();
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
    ), a = new ri({ operator: `${t}_`, leftType: s, returnType: o, handler: r });
    if (this.#h(a))
      throw new Error(`Operator overload already registered: ${t}${n}`);
    this.#r.set(a.signature, a), this.#g();
  }
  #h(t) {
    for (const [, n] of this.#r) if (t.equals(n)) return !0;
    return !1;
  }
  binaryOverload(t, n, r, i, s) {
    s ??= Kl(n) ? "bool" : t;
    const o = `${t} ${n} ${r}: ${s}`, a = this.assertType(t, "left type", o), c = this.assertType(r, "right type", o), u = this.assertType(s, "return type", o);
    if (Kl(n) && u.type !== "bool")
      throw new Error(`Comparison operator '${n}' must return 'bool', got '${u.type}'`);
    const l = new ri({ operator: n, leftType: a, rightType: c, returnType: u, handler: i });
    if (l.hasPlaceholder() && !(c.hasPlaceholder() && a.hasPlaceholder()))
      throw new Error(
        `Operator overload with placeholders must use them in both left and right types: ${o}`
      );
    if (this.#h(l))
      throw new Error(`Operator overload already registered: ${l.signature}`);
    if (n === "==") {
      const d = [
        new ri({
          operator: "!=",
          leftType: a,
          rightType: c,
          handler(h, p, w, f) {
            return !i(h, p, w, f);
          },
          returnType: u
        })
      ];
      a !== c && d.push(
        new ri({
          operator: "==",
          leftType: c,
          rightType: a,
          handler(h, p, w, f) {
            return i(p, h, w, f);
          },
          returnType: u
        }),
        new ri({
          operator: "!=",
          leftType: c,
          rightType: a,
          handler(h, p, w, f) {
            return !i(p, h, w, f);
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
function Kl(e) {
  return e === "<" || e === "<=" || e === ">" || e === ">=" || e === "==" || e === "!=" || e === "in";
}
function ix(e) {
  return new iu(e);
}
class sx {
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
    return new io(this);
  }
}
class io {
  parent;
  context;
  variableName;
  variableType;
  variableValue;
  constructor(t) {
    this.parent = t;
  }
  fork() {
    return new io(this);
  }
  forkWithVariable(t, n) {
    const r = new io(this);
    return r.variableType = t, r.variableName = n, r;
  }
  withContext(t) {
    if (typeof t != "object") throw new Z("Context must be an object");
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
function Do(e, t) {
  if (e.op === "id") return e.args;
  throw new ut(t, e);
}
function Ki(e, t) {
  if (typeof t == "boolean") return !1;
  if (t instanceof Error)
    return e.error ??= t, /predicate must return bool|Unknown variable/.test(t.message);
  const n = e.ev.debugRuntimeType(t, e.firstMacroIter.checkedType);
  return e.error = new Z(
    `${e.macro.functionDesc} predicate must return bool, got '${n}'`,
    e.firstMacroIter
  ), !0;
}
class ox {
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
    throw new Z(
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
function yi(e, t) {
  return function(n, r, i) {
    const s = n.eval(r.receiver, i), o = new ox(n, r, i, e, t);
    return s instanceof Promise ? o.iterateAsync(s) : o.iterate(s);
  };
}
function ax(e, t, n) {
  if (Ki(e, n)) throw e.error;
  n === !1 && (e.return = !1);
}
function cx(e) {
  if (e.return !== void 0) return e.return;
  if (e.error) throw e.error;
  return !0;
}
function ux(e, t, n) {
  if (Ki(e, n)) throw e.error;
  n === !0 && (e.return = !0);
}
function lx(e) {
  if (e.return !== void 0) return e.return;
  if (e.error) throw e.error;
  return !1;
}
function dx(e, t, n) {
  if (Ki(e, n) || n instanceof Error) throw e.error;
  n && (e.found ? e.return = !1 : e.found = !0);
}
function fx(e) {
  return e.return !== void 0 ? e.return : e.found === !0;
}
function Sp(e) {
  return e.results || [];
}
function hx(e, t, n) {
  if (n === !1) return;
  if (Ki(e, n) || n instanceof Error) throw e.error;
  const r = e.ev.eval(e.macro.second, t);
  return r instanceof Promise ? r.then((i) => (e.results ??= []).push(i)) : (e.results ??= []).push(r);
}
function px(e, t, n) {
  if (n instanceof Error) throw e.error;
  return (e.results ??= []).push(n);
}
function gx(e, t, n) {
  if (Ki(e, n) || n instanceof Error) throw e.error;
  n && (e.results ??= []).push(t.variableValue);
}
function wx(e, t, n) {
  if (t.kind === "dyn") return t;
  if (t.kind === "list") return t.valueType;
  if (t.kind === "map") return t.keyType;
  throw new e.Error(
    `Expression of type '${t}' cannot be range of a comprehension (must be list, map, or dynamic).`,
    n.receiver
  );
}
function su(e, t, n) {
  const r = wx(e, e.check(t.receiver, n), t);
  return n.forkWithVariable(r, t.predicateVar);
}
function ua({ description: e, evaluator: t }) {
  const n = `${e} invalid predicate iteration variable`;
  if (!t) throw new Error(`No evaluator provided for quantifier macro: ${e}`);
  function r(i, s, o) {
    o = su(i, s, o), s.variableType = o.variableType;
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
    predicateVar: Do(i[0], n),
    evaluate: t,
    typeCheck: r
  });
}
function Wl(e) {
  const t = e ? "map(var, filter, transform)" : "map(var, transform)", n = `${t} invalid predicate iteration variable`, r = yi(
    e ? hx : px,
    Sp
  );
  function i(s, o, a) {
    if (a = su(s, o, a), o.variableType = a.variableType, e) {
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
    predicateVar: Do(s[0], n),
    evaluate: r,
    typeCheck: i
  });
}
function yx() {
  const e = "filter(var, predicate)", t = `${e} invalid predicate iteration variable`, n = yi(gx, Sp);
  function r(i, s, o) {
    o = su(i, s, o), s.variableType = o.variableType;
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
    predicateVar: Do(i[0], t),
    evaluate: n,
    typeCheck: r
  });
}
function mx() {
  const e = "has() invalid argument";
  function t(r, i, s) {
    const o = i.macroHasProps;
    let a = o.length, c = r.eval(o[--a], s), u;
    for (; a--; ) {
      const l = o[a];
      if (l.op === ".?" && (u ??= !0), c = r.debugType(c).fieldLazy(c, l.args[1], l, r), c === void 0) {
        if (!(!u && a && l.op === ".")) break;
        throw new Z(`No such key: ${l.args[1]}`, l);
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
function bx(e) {
  e.registerFunctionOverload("has(ast): bool", mx()), e.registerFunctionOverload(
    "list.all(ast, ast): bool",
    ua({
      description: "all(var, predicate)",
      evaluator: yi(ax, cx)
    })
  ), e.registerFunctionOverload(
    "list.exists(ast, ast): bool",
    ua({
      description: "exists(var, predicate)",
      evaluator: yi(ux, lx)
    })
  ), e.registerFunctionOverload(
    "list.exists_one(ast, ast): bool",
    ua({
      description: "exists_one(var, predicate)",
      evaluator: yi(dx, fx)
    })
  ), e.registerFunctionOverload("list.map(ast, ast): list<dyn>", Wl(!1)), e.registerFunctionOverload("list.map(ast, ast, ast): list<dyn>", Wl(!0)), e.registerFunctionOverload("list.filter(ast, ast): list<dyn>", yx());
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
    var: Do(i[0], "invalid variable argument"),
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
function xx(e) {
  const t = e.unaryOverload.bind(e), n = e.binaryOverload.bind(e);
  function r(u, l) {
    if (u <= 9223372036854775807n && u >= -9223372036854775808n) return u;
    throw new Z(`integer overflow: ${u}`, l);
  }
  t("!", "bool", (u) => !u), t("-", "int", (u) => -u), n("dyn<int>", "==", "double", (u, l) => u == l), n("dyn<int>", "==", "uint", (u, l) => u == l.valueOf()), n("int", "*", "int", (u, l, d) => r(u * l, d)), n("int", "+", "int", (u, l, d) => r(u + l, d)), n("int", "-", "int", (u, l, d) => r(u - l, d)), n("int", "/", "int", (u, l, d) => {
    if (l === 0n) throw new Z("division by zero", d);
    return u / l;
  }), n("int", "%", "int", (u, l, d) => {
    if (l === 0n) throw new Z("modulo by zero", d);
    return u % l;
  }), t("-", "double", (u) => -u), n("dyn<double>", "==", "int", (u, l) => u == l), n("dyn<double>", "==", "uint", (u, l) => u == l.valueOf()), n("double", "*", "double", (u, l) => u * l), n("double", "+", "double", (u, l) => u + l), n("double", "-", "double", (u, l) => u - l), n("double", "/", "double", (u, l) => u / l), n("string", "+", "string", (u, l) => u + l), n("list<V>", "+", "list<V>", (u, l) => [...u, ...l]), n("bytes", "+", "bytes", (u, l) => {
    const d = new Uint8Array(u.length + l.length);
    return d.set(u, 0), d.set(l, u.length), d;
  });
  const i = "google.protobuf.Duration";
  n(i, "+", i, (u, l) => u.addDuration(l)), n(i, "-", i, (u, l) => u.subtractDuration(l)), n(i, "==", i, (u, l) => u.seconds === l.seconds && u.nanos === l.nanos);
  const s = "google.protobuf.Timestamp";
  n(s, "==", s, (u, l) => u.getTime() === l.getTime()), n(s, "-", s, (u, l) => In.fromMilliseconds(u.getTime() - l.getTime()), i), n(s, "-", i, (u, l) => l.subtractTimestamp(u)), n(s, "+", i, (u, l) => l.extendTimestamp(u)), n(i, "+", s, (u, l) => u.extendTimestamp(l));
  function o(u, l, d, h) {
    if (l instanceof Set && l.has(u)) return !0;
    for (const p of l) if (ii(u, p, h)) return !0;
    return !1;
  }
  function a(u, l) {
    return l instanceof Map ? l.get(u) !== void 0 : Object.hasOwn(l, u) ? l[u] !== void 0 : !1;
  }
  function c(u, l, d, h) {
    return o(u, l, d, h);
  }
  n("V", "in", "list<V>", c), n("K", "in", "map<K, V>", a);
  for (const u of ["type", "null", "bool", "string", "int", "double"])
    n(u, "==", u, (l, d) => l === d);
  n("bytes", "==", "bytes", (u, l) => {
    let d = u.length;
    if (d !== l.length) return !1;
    for (; d--; ) if (u[d] !== l[d]) return !1;
    return !0;
  }), n("list<V>", "==", "list<V>", (u, l, d, h) => {
    if (Array.isArray(u) && Array.isArray(l)) {
      const f = u.length;
      if (f !== l.length) return !1;
      for (let y = 0; y < f; y++)
        if (!ii(u[y], l[y], h)) return !1;
      return !0;
    }
    if (u instanceof Set && l instanceof Set) {
      if (u.size !== l.size) return !1;
      for (const f of u) if (!l.has(f)) return !1;
      return !0;
    }
    const p = u instanceof Set ? l : u, w = u instanceof Set ? u : l;
    if (!Array.isArray(p) || p.length !== w?.size) return !1;
    for (let f = 0; f < p.length; f++) if (!w.has(p[f])) return !1;
    return !0;
  }), n("map<K, V>", "==", "map<K, V>", (u, l, d, h) => {
    if (u instanceof Map && l instanceof Map) {
      if (u.size !== l.size) return !1;
      for (const [f, y] of u)
        if (!(l.has(f) && ii(y, l.get(f), h))) return !1;
      return !0;
    }
    if (u instanceof Map || l instanceof Map) {
      const f = u instanceof Map ? l : u, y = u instanceof Map ? u : l, E = Object.keys(f);
      if (y.size !== E.length) return !1;
      for (const [I, O] of y)
        if (!(I in f && ii(O, f[I], h))) return !1;
      return !0;
    }
    const p = Object.keys(u), w = Object.keys(l);
    if (p.length !== w.length) return !1;
    for (let f = 0; f < p.length; f++) {
      const y = p[f];
      if (!(y in l && ii(u[y], l[y], h))) return !1;
    }
    return !0;
  }), n("uint", "==", "uint", (u, l) => u.valueOf() === l.valueOf()), n("dyn<uint>", "==", "double", (u, l) => u.valueOf() == l), n("dyn<uint>", "==", "int", (u, l) => u.valueOf() == l), n("uint", "+", "uint", (u, l) => new Hn(u.valueOf() + l.valueOf())), n("uint", "-", "uint", (u, l) => new Hn(u.valueOf() - l.valueOf())), n("uint", "*", "uint", (u, l) => new Hn(u.valueOf() * l.valueOf())), n("uint", "/", "uint", (u, l, d) => {
    if (l.valueOf() === 0n) throw new Z("division by zero", d);
    return new Hn(u.valueOf() / l.valueOf());
  }), n("uint", "%", "uint", (u, l, d) => {
    if (l.valueOf() === 0n) throw new Z("modulo by zero", d);
    return new Hn(u.valueOf() % l.valueOf());
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
    n(u, "<", l, (d, h) => d < h), n(u, "<=", l, (d, h) => d <= h), n(u, ">", l, (d, h) => d > h), n(u, ">=", l, (d, h) => d >= h);
}
function ii(e, t, n) {
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
  throw new Z(`Cannot compare values of type ${typeof e}`);
}
class kp {
  dynType = Bt.dyn;
  optionalType = Bt.optional;
  stringType = Bt.string;
  intType = Bt.int;
  doubleType = Bt.double;
  boolType = Bt.bool;
  nullType = Bt.null;
  listType = Bt.list;
  mapType = Bt.map;
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
        return t === null ? this.nullType : this.objectTypesByConstructor.get(t.constructor)?.type || zl(this, t.constructor?.name || typeof t);
      default:
        zl(this, typeof t);
    }
  }
}
function zl(e, t) {
  throw new e.Error(`Unsupported type: ${t}`);
}
function Es(e, t, n, r, i) {
  return n instanceof Promise || r instanceof Promise ? Promise.all([n, r]).then((s) => i(e, t, s[0], s[1])) : i(e, t, n, r);
}
function jl(e, t, n) {
  const r = e.check(t.args[0], n);
  return t.op === "[]" && e.check(t.args[1], n), r.kind !== "optional" ? e.checkAccessOnType(t, n, r) : e.registry.getOptionalType(e.checkAccessOnType(t, n, r.valueType, !0));
}
function ql(e, t, n) {
  const r = e.check(t.args[0], n);
  t.op === "[?]" && e.check(t.args[1], n);
  const i = r.kind === "optional" ? r.valueType : r;
  return e.registry.getOptionalType(e.checkAccessOnType(t, n, i, !0));
}
function Gl(e, t, n, r, i) {
  const s = e.check(r, t);
  if (s === n || n.isEmpty()) return s;
  if (s.isEmpty()) return n;
  let o;
  throw i === 0 ? o = "List elements must have the same type," : i === 1 ? o = "Map key uses wrong type," : i === 2 && (o = "Map value uses wrong type,"), new e.Error(
    `${o} expected type '${e.formatType(n)}' but found '${e.formatType(s)}'`,
    r
  );
}
function Yl(e, t, n, r) {
  return n.unify(e.registry, e.check(r, t)) || e.dynType;
}
function so(e, t, n) {
  const r = e.debugRuntimeType(t, n.checkedType);
  return new e.Error(`Logical operator requires bool operands, got '${r}'`, n);
}
function vx(e, t, n) {
  const r = e.debugRuntimeType(t, n.checkedType);
  return new e.Error(`Ternary condition must be bool, got '${r}'`, n);
}
function Zl(e, t, n, r) {
  if (n === !0) return e.eval(t.args[1], r);
  if (n === !1) return e.eval(t.args[2], r);
  throw vx(e, n, t.args[0]);
}
function Xl(e, t, n) {
  const r = e.debugRuntimeType(n, t.args[0].checkedType), i = e.registry.findUnaryOverload(t.op, r);
  if (i) return i.handler(n);
  throw new e.Error(`no such overload: ${t.op[0]}${r}`, t);
}
function Ql(e, t, n) {
  const r = e.eval(t.args[0], n);
  return r instanceof Promise ? r.then((i) => Xl(e, t, i)) : Xl(e, t, r);
}
function Ex(e, t, n, r) {
  const i = e.debugOperandType(n, t.args[0].checkedType), s = e.debugOperandType(r, t.args[1].checkedType), o = e.registry.findBinaryOverload(t.op, i, s);
  if (o) return o.handler(n, r, t, e);
  throw new e.Error(`no such overload: ${i} ${t.op} ${s}`, t);
}
function Tx(e, t, n) {
  return Es(e, t, e.eval(t.args[0], n), e.eval(t.args[1], n), Ex);
}
function Jl(e, t, n, r) {
  if (n === !0) return !0;
  const i = e.eval(t.args[1], r);
  return i instanceof Promise ? i.then((s) => td(e, t, n, s)) : td(e, t, n, i);
}
function td(e, t, n, r) {
  if (r === !0) return !0;
  if (r !== !1) throw so(e, r, t.args[1]);
  if (n instanceof Error) throw n;
  if (n !== !1) throw so(e, n, t.args[0]);
  return !1;
}
function ed(e, t, n, r) {
  if (n === !1) return !1;
  const i = e.eval(t.args[1], r);
  return i instanceof Promise ? i.then((s) => nd(e, t, n, s)) : nd(e, t, n, i);
}
function nd(e, t, n, r) {
  if (r === !1) return !1;
  if (r !== !0) throw so(e, r, t.args[1]);
  if (n instanceof Error) throw n;
  if (n !== !0) throw so(e, n, t.args[0]);
  return !0;
}
function rd(e, t, n) {
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
function id(e, t, n) {
  const r = t.op, i = e.check(t.args[0], n);
  if (i.kind === "dyn") return r === "!_" ? e.boolType : i;
  const s = e.registry.findUnaryOverload(r, i);
  if (s) return s.returnType;
  throw new e.Error(`no such overload: ${r[0]}${e.formatType(i)}`, t);
}
function Sx(e, t, n) {
  const r = t.op, i = e.check(t.args[0], n), s = e.check(t.args[1], n), o = e.registry.checkBinaryOverload(r, i, s);
  if (o) return o;
  throw new e.Error(
    `no such overload: ${e.formatType(i)} ${r} ${e.formatType(s)}`,
    t
  );
}
function sd(e, t, n) {
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
function kx(e, t, n, r) {
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
    `found no matching overload for '${l.type}.${i}(${u.map((h) => h.unwrappedType).join(", ")})'`,
    t
  );
}
function la(e, t, n, r = n.length) {
  let i;
  const s = new Array(r);
  for (; r--; ) (s[r] = e.eval(n[r], t)) instanceof Promise && (i ??= !0);
  return i ? Promise.all(s) : s;
}
function od(e) {
  const t = {};
  for (let n = 0; n < e.length; n++) {
    const [r, i] = e[n];
    r === "__proto__" || r === "constructor" || r === "prototype" || (t[r] = i);
  }
  return t;
}
function da(e, t, n, r) {
  return e.optionalType.field(n, r, t, e);
}
function fa(e, t, n, r) {
  return e.debugType(n).field(n, r, t, e);
}
const oo = {
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
    check: jl,
    evaluate(e, t, n) {
      const r = e.eval(t.args[0], n);
      return r instanceof Promise ? r.then((i) => fa(e, t, i, t.args[1])) : fa(e, t, r, t.args[1]);
    }
  },
  ".?": {
    check: ql,
    evaluate(e, t, n) {
      const r = e.eval(t.args[0], n);
      return r instanceof Promise ? r.then((i) => da(e, t, i, t.args[1])) : da(e, t, r, t.args[1]);
    }
  },
  "[]": {
    check: jl,
    evaluate(e, t, n) {
      return Es(e, t, e.eval(t.args[0], n), e.eval(t.args[1], n), fa);
    }
  },
  "[?]": {
    check: ql,
    evaluate(e, t, n) {
      return Es(e, t, e.eval(t.args[0], n), e.eval(t.args[1], n), da);
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
      const r = la(e, n, t.args[1]);
      return r instanceof Promise ? r.then((i) => sd(e, t, i)) : sd(e, t, r);
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
      return t.macro ? t.macro.evaluate(e, t.macro, n) : Es(
        e,
        t,
        e.eval(t.args[1], n),
        la(e, n, t.args[2]),
        kx
      );
    }
  },
  list: {
    check(e, t, n) {
      const r = t.args, i = r.length;
      if (i === 0) return e.getType("list<T>");
      let s = e.check(r[0], n);
      const o = e.opts.homogeneousAggregateLiterals ? Gl : Yl;
      for (let a = 1; a < i; a++) s = o(e, n, s, r[a], 0);
      return e.registry.getListType(s);
    },
    evaluate(e, t, n) {
      return la(e, n, t.args);
    }
  },
  map: {
    check(e, t, n) {
      const r = t.args, i = r.length;
      if (i === 0) return e.getType("map<K, V>");
      const s = e.opts.homogeneousAggregateLiterals ? Gl : Yl;
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
        const [c, u] = r[a], l = e.eval(c, n), d = e.eval(u, n);
        l instanceof Promise || d instanceof Promise ? (s[a] = Promise.all([l, d]), o ??= !0) : s[a] = [l, d];
      }
      return o ? Promise.all(s).then(od) : od(s);
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
      return r instanceof Promise ? r.then((i) => Zl(e, t, i, n)) : Zl(e, t, r, n);
    }
  },
  "||": {
    check: rd,
    evaluate(e, t, n) {
      const r = e.tryEval(t.args[0], n);
      return r instanceof Promise ? r.then((i) => Jl(e, t, i, n)) : Jl(e, t, r, n);
    }
  },
  "&&": {
    check: rd,
    evaluate(e, t, n) {
      const r = e.tryEval(t.args[0], n);
      return r instanceof Promise ? r.then((i) => ed(e, t, i, n)) : ed(e, t, r, n);
    }
  },
  "!_": { check: id, evaluate: Ql },
  "-_": { check: id, evaluate: Ql }
}, Ix = ["!=", "==", "in", "+", "-", "*", "/", "%", "<", "<=", ">", ">="];
for (const e of Ix) oo[e] = { check: Sx, evaluate: Tx };
for (const e in oo) oo[e].name = e;
const Ax = (/* @__PURE__ */ new Map()).set("A", "dyn").set("T", "dyn").set("K", "dyn").set("V", "dyn");
class ad extends kp {
  constructor(t, n) {
    super(t), this.isEvaluating = n, this.Error = n ? Z : qb;
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
    return t.hasPlaceholder() ? t.templated(this.registry, Ax).name : t.name;
  }
  formatTypeList(t) {
    return t.map((n) => this.formatType(n)).join(", ");
  }
}
const D = {
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
class ou {
  #t;
  #e;
  constructor(t, n, r, i) {
    const s = oo[r];
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
    return [this.op, ...t.map((n) => n instanceof ou ? n.toOldStructure() : n)];
  }
}
const Ts = {};
for (const e in D) Ts[D[e]] = e;
const Rx = /* @__PURE__ */ new Set([
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
]), Ip = new Uint8Array(128);
for (const e of "0123456789abcdefABCDEF") Ip[e.charCodeAt(0)] = 1;
const cd = {
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
class $x {
  constructor(t) {
    this.input = t, this.pos = 0, this.length = t.length;
  }
  // Read next token
  nextToken() {
    for (; ; ) {
      const { pos: t, input: n, length: r } = this;
      if (t >= r) return { type: D.EOF, value: null, pos: t };
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
          return { type: D.EQ, value: "==", pos: (this.pos += 2) - 2 };
        case "&":
          if (n[t + 1] !== "&") break;
          return { type: D.AND, value: "&&", pos: (this.pos += 2) - 2 };
        case "|":
          if (n[t + 1] !== "|") break;
          return { type: D.OR, value: "||", pos: (this.pos += 2) - 2 };
        case "+":
          return { type: D.PLUS, value: "+", pos: this.pos++ };
        case "-":
          return { type: D.MINUS, value: "-", pos: this.pos++ };
        case "*":
          return { type: D.MULTIPLY, value: "*", pos: this.pos++ };
        case "/":
          if (n[t + 1] === "/") {
            for (; this.pos < r && this.input[this.pos] !== `
`; ) this.pos++;
            continue;
          }
          return { type: D.DIVIDE, value: "/", pos: this.pos++ };
        case "%":
          return { type: D.MODULO, value: "%", pos: this.pos++ };
        case "<":
          return n[t + 1] === "=" ? { type: D.LE, value: "<=", pos: (this.pos += 2) - 2 } : { type: D.LT, value: "<", pos: this.pos++ };
        case ">":
          return n[t + 1] === "=" ? { type: D.GE, value: ">=", pos: (this.pos += 2) - 2 } : { type: D.GT, value: ">", pos: this.pos++ };
        case "!":
          return n[t + 1] === "=" ? { type: D.NE, value: "!=", pos: (this.pos += 2) - 2 } : { type: D.NOT, pos: this.pos++ };
        case "(":
          return { type: D.LPAREN, pos: this.pos++ };
        case ")":
          return { type: D.RPAREN, pos: this.pos++ };
        case "[":
          return { type: D.LBRACKET, pos: this.pos++ };
        case "]":
          return { type: D.RBRACKET, pos: this.pos++ };
        case "{":
          return { type: D.LBRACE, pos: this.pos++ };
        case "}":
          return { type: D.RBRACE, pos: this.pos++ };
        case ".":
          return { type: D.DOT, pos: this.pos++ };
        case ",":
          return { type: D.COMMA, pos: this.pos++ };
        case ":":
          return { type: D.COLON, pos: this.pos++ };
        case "?":
          return { type: D.QUESTION, pos: this.pos++ };
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
      throw new ut(`Unexpected character: ${i}`, { pos: t, input: n });
    }
  }
  // Characters: 0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_
  _isIdentifierCharCode(t) {
    return t < 48 || t > 122 ? !1 : t >= 97 || t >= 65 && t <= 90 || t <= 57 || t === 95;
  }
  _parseAsDouble(t, n) {
    const r = Number(this.input.substring(t, n));
    if (Number.isFinite(r)) return { type: D.NUMBER, value: r, pos: t };
    throw new ut(`Invalid number: ${r}`, { pos: t, input: this.input });
  }
  _parseAsBigInt(t, n, r, i) {
    const s = this.input.substring(t, n);
    if (i === "u" || i === "U") {
      this.pos++;
      try {
        return {
          type: D.NUMBER,
          value: new Hn(s),
          pos: t
        };
      } catch {
      }
    } else
      try {
        return {
          type: D.NUMBER,
          value: BigInt(s),
          pos: t
        };
      } catch {
      }
    throw new ut(r ? `Invalid hex integer: ${s}` : `Invalid integer: ${s}`, {
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
      if (r = this._readDigits(t, n, r), s === r) throw new ut("Invalid exponent", { pos: r, input: t });
    }
    return r;
  }
  readNumber() {
    const { input: t, length: n, pos: r } = this;
    let i = r;
    if (t[i] === "0" && (t[i + 1] === "x" || t[i + 1] === "X")) {
      for (i += 2; i < n && Ip[t[i].charCodeAt(0)]; ) i++;
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
        return { type: D.BYTES, value: s, pos: r - 1 };
      }
      case "r":
      case "R":
        return { type: D.STRING, value: t, pos: r - 1 };
      default: {
        const i = this.processEscapes(t, !1);
        return { type: D.STRING, value: i, pos: r };
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
          throw new ut("Newlines not allowed in single-quoted strings", { pos: s, input: r });
        case "\\":
          a++;
      }
      a++;
    }
    throw new ut("Unterminated string", { pos: s, input: r });
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
    throw new ut("Unterminated triple-quoted string", { pos: s, input: r });
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
      if (cd[s])
        r += cd[s], i += 2;
      else if (s === "u") {
        if (n) throw new ut("\\u not allowed in bytes literals");
        const o = t.substring(i + 2, i += 6);
        if (!/^[0-9a-fA-F]{4}$/.test(o)) throw new ut(`Invalid Unicode escape: \\u${o}`);
        const a = Number.parseInt(o, 16);
        if (a >= 55296 && a <= 57343) throw new ut(`Invalid Unicode surrogate: \\u${o}`);
        r += String.fromCharCode(a);
      } else if (s === "U") {
        if (n) throw new ut("\\U not allowed in bytes literals");
        const o = t.substring(i + 2, i += 10);
        if (!/^[0-9a-fA-F]{8}$/.test(o)) throw new ut(`Invalid Unicode escape: \\U${o}`);
        const a = Number.parseInt(o, 16);
        if (a > 1114111) throw new ut(`Invalid Unicode escape: \\U${o}`);
        if (a >= 55296 && a <= 57343) throw new ut(`Invalid Unicode surrogate: \\U${o}`);
        r += String.fromCodePoint(a);
      } else if (s === "x" || s === "X") {
        const o = t.substring(i + 2, i += 4);
        if (!/^[0-9a-fA-F]{2}$/.test(o)) throw new ut(`Invalid hex escape: \\${s}${o}`);
        r += String.fromCharCode(Number.parseInt(o, 16));
      } else if (s >= "0" && s <= "7") {
        const o = t.substring(i + 1, i += 4);
        if (!/^[0-7]{3}$/.test(o)) throw new ut("Octal escape must be 3 digits");
        const a = Number.parseInt(o, 8);
        if (a > 255) throw new ut(`Octal escape out of range: \\${o}`);
        r += String.fromCharCode(a);
      } else
        throw new ut(`Invalid escape sequence: \\${s}`);
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
        return { type: D.BOOLEAN, value: !0, pos: t };
      case "false":
        return { type: D.BOOLEAN, value: !1, pos: t };
      case "null":
        return { type: D.NULL, value: null, pos: t };
      case "in":
        return { type: D.IN, value: "in", pos: t };
      default:
        return { type: D.IDENTIFIER, value: s, pos: t };
    }
  }
}
class Ox {
  constructor(t, n) {
    this.limits = t, this.registry = n;
  }
  #t(t, n = this.currentToken) {
    throw new ut(`Exceeded ${t} (${this.limits[t]})`, {
      pos: n.pos,
      input: this.input
    });
  }
  #e(t, n, r) {
    const i = new ou(t, this.input, n, r);
    return this.astNodesRemaining-- || this.#t("maxAstNodes", i), i;
  }
  #n() {
    const t = this.currentToken;
    return this.type = (this.currentToken = this.lexer.nextToken()).type, t;
  }
  consume(t) {
    if (this.type === t) return this.#n();
    throw new ut(
      `Expected ${Ts[t]}, got ${Ts[this.type]}`,
      { pos: this.currentToken.pos, input: this.input }
    );
  }
  match(t) {
    return this.type === t;
  }
  // Parse entry point
  parse(t) {
    this.input = t, this.lexer = new $x(t), this.#n(), this.maxDepthRemaining = this.limits.maxDepth, this.astNodesRemaining = this.limits.maxAstNodes;
    const n = this.parseExpression();
    if (this.match(D.EOF)) return n;
    throw new ut(`Unexpected character: '${this.input[this.lexer.pos - 1]}'`, {
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
    if (!this.match(D.QUESTION)) return ++this.maxDepthRemaining && t;
    const n = this.#n(), r = this.parseExpression();
    this.consume(D.COLON);
    const i = this.parseExpression();
    return this.maxDepthRemaining++, this.#e(n.pos, "?:", [t, r, i]);
  }
  // LogicalOr ::= LogicalAnd ('||' LogicalAnd)*
  parseLogicalOr() {
    let t = this.parseLogicalAnd();
    for (; this.match(D.OR); ) {
      const n = this.#n();
      t = this.#e(n.pos, n.value, [t, this.parseLogicalAnd()]);
    }
    return t;
  }
  // LogicalAnd ::= Equality ('&&' Equality)*
  parseLogicalAnd() {
    let t = this.parseEquality();
    for (; this.match(D.AND); ) {
      const n = this.#n();
      t = this.#e(n.pos, n.value, [t, this.parseEquality()]);
    }
    return t;
  }
  // Equality ::= Relational (('==' | '!=') Relational)*
  parseEquality() {
    let t = this.parseRelational();
    for (; this.match(D.EQ) || this.match(D.NE); ) {
      const n = this.#n();
      t = this.#e(n.pos, n.value, [t, this.parseRelational()]);
    }
    return t;
  }
  // Relational ::= Additive (('<' | '<=' | '>' | '>=' | 'in') Additive)*
  parseRelational() {
    let t = this.parseAdditive();
    for (; this.match(D.LT) || this.match(D.LE) || this.match(D.GT) || this.match(D.GE) || this.match(D.IN); ) {
      const n = this.#n();
      t = this.#e(n.pos, n.value, [t, this.parseAdditive()]);
    }
    return t;
  }
  // Additive ::= Multiplicative (('+' | '-') Multiplicative)*
  parseAdditive() {
    let t = this.parseMultiplicative();
    for (; this.match(D.PLUS) || this.match(D.MINUS); ) {
      const n = this.#n();
      t = this.#e(n.pos, n.value, [t, this.parseMultiplicative()]);
    }
    return t;
  }
  // Multiplicative ::= Unary (('*' | '/' | '%') Unary)*
  parseMultiplicative() {
    let t = this.parseUnary();
    for (; this.match(D.MULTIPLY) || this.match(D.DIVIDE) || this.match(D.MODULO); ) {
      const n = this.#n();
      t = this.#e(n.pos, n.value, [t, this.parseUnary()]);
    }
    return t;
  }
  // Unary ::= ('!' | '-')* Postfix
  parseUnary() {
    return this.type === D.NOT ? this.#e(this.#n().pos, "!_", [this.parseUnary()]) : this.type === D.MINUS ? this.#e(this.#n().pos, "-_", [this.parseUnary()]) : this.parsePostfix();
  }
  // Postfix ::= Primary (('.' IDENTIFIER ('(' ArgumentList ')')? | '[' Expression ']'))*
  parsePostfix() {
    let t = this.parsePrimary();
    const n = this.maxDepthRemaining;
    for (; ; ) {
      if (this.match(D.DOT)) {
        const r = this.#n();
        this.maxDepthRemaining-- || this.#t("maxDepth", r);
        const i = this.match(D.QUESTION) && this.registry.enableOptionalTypes && !!this.#n(), s = this.consume(D.IDENTIFIER);
        if (this.match(D.LPAREN) && this.#n()) {
          const o = this.parseArgumentList();
          this.consume(D.RPAREN), t = this.#o(
            this.#e(s.pos, "rcall", [s.value, t, o])
          );
        } else
          t = this.#e(s.pos, i ? ".?" : ".", [t, s.value]);
        continue;
      }
      if (this.match(D.LBRACKET)) {
        const r = this.#n();
        this.maxDepthRemaining-- || this.#t("maxDepth", r);
        const i = this.match(D.QUESTION) && this.registry.enableOptionalTypes && !!this.#n(), s = this.parseExpression();
        this.consume(D.RBRACKET), t = this.#e(r.pos, i ? "[?]" : "[]", [t, s]);
        continue;
      }
      break;
    }
    return this.maxDepthRemaining = n, t;
  }
  // Primary ::= NUMBER | STRING | BOOLEAN | NULL | IDENTIFIER | '(' Expression ')' | Array | Object
  parsePrimary() {
    switch (this.type) {
      case D.NUMBER:
      case D.STRING:
      case D.BYTES:
      case D.BOOLEAN:
      case D.NULL:
        return this.#a();
      case D.IDENTIFIER:
        return this.#c();
      case D.LPAREN:
        return this.#u();
      case D.LBRACKET:
        return this.parseList();
      case D.LBRACE:
        return this.parseMap();
    }
    throw new ut(`Unexpected token: ${Ts[this.type]}`, {
      pos: this.currentToken.pos,
      input: this.input
    });
  }
  #a() {
    const t = this.#n();
    return this.#e(t.pos, "value", t.value);
  }
  #c() {
    const { value: t, pos: n } = this.consume(D.IDENTIFIER);
    if (Rx.has(t))
      throw new ut(`Reserved identifier: ${t}`, {
        pos: n,
        input: this.input
      });
    if (!this.match(D.LPAREN)) return this.#e(n, "id", t);
    this.#n();
    const r = this.parseArgumentList();
    return this.consume(D.RPAREN), this.#i(this.#e(n, "call", [t, r]));
  }
  #u() {
    this.consume(D.LPAREN);
    const t = this.parseExpression();
    return this.consume(D.RPAREN), t;
  }
  parseList() {
    const t = this.consume(D.LBRACKET), n = [];
    let r = this.limits.maxListElements;
    if (!this.match(D.RBRACKET))
      for (n.push(this.parseExpression()), r-- || this.#t("maxListElements", n.at(-1)); this.match(D.COMMA) && (this.#n(), !this.match(D.RBRACKET)); )
        n.push(this.parseExpression()), r-- || this.#t("maxListElements", n.at(-1));
    return this.consume(D.RBRACKET), this.#e(t.pos, "list", n);
  }
  parseMap() {
    const t = this.consume(D.LBRACE), n = [];
    let r = this.limits.maxMapEntries;
    if (!this.match(D.RBRACE))
      for (n.push(this.parseProperty()), r-- || this.#t("maxMapEntries", n.at(-1)[0]); this.match(D.COMMA) && (this.#n(), !this.match(D.RBRACE)); )
        n.push(this.parseProperty()), r-- || this.#t("maxMapEntries", n.at(-1)[0]);
    return this.consume(D.RBRACE), this.#e(t.pos, "map", n);
  }
  parseProperty() {
    return [this.parseExpression(), (this.consume(D.COLON), this.parseExpression())];
  }
  parseArgumentList() {
    const t = [];
    let n = this.limits.maxCallArguments;
    if (!this.match(D.RPAREN))
      for (t.push(this.parseExpression()), n-- || this.#t("maxCallArguments", t.at(-1)); this.match(D.COMMA) && (this.#n(), !this.match(D.RPAREN)); )
        t.push(this.parseExpression()), n-- || this.#t("maxCallArguments", t.at(-1));
    return t;
  }
}
const au = Object.freeze({
  maxAstNodes: 1e5,
  maxDepth: 250,
  maxListElements: 1e3,
  maxMapEntries: 1e3,
  maxCallArguments: 32
}), Cx = new Set(Object.keys(au));
function Px(e, t = au) {
  const n = e ? Object.keys(e) : void 0;
  if (!n?.length) return t;
  const r = { ...t };
  for (const i of n) {
    if (!Cx.has(i)) throw new TypeError(`Unknown limits option: ${i}`);
    const s = e[i];
    typeof s == "number" && (r[i] = s);
  }
  return Object.freeze(r);
}
const Bx = Object.freeze({
  unlistedVariablesAreDyn: !1,
  homogeneousAggregateLiterals: !0,
  enableOptionalTypes: !1,
  limits: au
});
function ha(e, t, n) {
  const r = e?.[n] ?? t?.[n];
  if (typeof r != "boolean") throw new TypeError(`Invalid option: ${n}`);
  return r;
}
function Nx(e, t = Bx) {
  return e ? Object.freeze({
    unlistedVariablesAreDyn: ha(e, t, "unlistedVariablesAreDyn"),
    homogeneousAggregateLiterals: ha(e, t, "homogeneousAggregateLiterals"),
    enableOptionalTypes: ha(e, t, "enableOptionalTypes"),
    limits: Px(e.limits, t.limits)
  }) : t;
}
const Vo = ix({ enableOptionalTypes: !1 });
Xb(Vo);
xx(Vo);
bx(Vo);
const ud = /* @__PURE__ */ new WeakMap();
class ze {
  #t;
  #e;
  #n;
  #r;
  #i;
  #o;
  constructor(t, n) {
    this.opts = Nx(t, n?.opts), this.#t = (n instanceof ze ? ud.get(n) : Vo).clone(this.opts);
    const r = {
      objectTypes: this.#t.objectTypes,
      objectTypesByConstructor: this.#t.objectTypesByConstructor,
      registry: this.#t,
      opts: this.opts
    };
    this.#n = new ad(r), this.#r = new ad(r, !0), this.#e = new _x(r), this.#i = new Ox(this.opts.limits, this.#t), this.#o = new sx(this.#t.variables, this.#t.constants), ud.set(this, this.#t), Object.freeze(this);
  }
  clone(t) {
    return new ze(t, this);
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
class _x extends kp {
  constructor(t) {
    super(t), this.Error = Z;
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
new ze({
  unlistedVariablesAreDyn: !0
});
const cu = "amount", Ux = "expiry", Lx = "birth", Dx = "weight", Vx = "inputType", Fx = "script", Fr = {
  signature: "now(): double",
  implementation: () => Math.floor(Date.now() / 1e3)
}, ld = new ze().registerVariable(cu, "double").registerVariable(Fx, "string").registerFunction(Fr.signature, Fr.implementation), Mx = new ze().registerVariable(cu, "double").registerVariable(Ux, "double").registerVariable(Lx, "double").registerVariable(Dx, "double").registerVariable(Vx, "string").registerFunction(Fr.signature, Fr.implementation), Hx = new ze().registerVariable(cu, "double").registerFunction(Fr.signature, Fr.implementation);
let ae = class Ap {
  constructor(t) {
    this.value = t;
  }
  get satoshis() {
    return this.value ? Math.ceil(this.value) : 0;
  }
  add(t) {
    return new Ap(this.value + t.value);
  }
};
ae.ZERO = new ae(0);
let Kx = class {
  /**
   * Creates a new Estimator with the given config
   * @param config - Configuration containing CEL programs for fee calculation
   */
  constructor(t) {
    this.config = t, this.intentOffchainInput = t.offchainInput ? ts(t.offchainInput, Mx) : void 0, this.intentOnchainInput = t.onchainInput ? ts(t.onchainInput, Hx) : void 0, this.intentOffchainOutput = t.offchainOutput ? ts(t.offchainOutput, ld) : void 0, this.intentOnchainOutput = t.onchainOutput ? ts(t.onchainOutput, ld) : void 0;
  }
  /**
   * Evaluates the fee for a given vtxo input
   * @param input - The offchain input to evaluate
   * @returns The fee amount for this input
   */
  evalOffchainInput(t) {
    if (!this.intentOffchainInput)
      return ae.ZERO;
    const n = Wx(t);
    return new ae(this.intentOffchainInput.program(n));
  }
  /**
   * Evaluates the fee for a given boarding input
   * @param input - The onchain input to evaluate
   * @returns The fee amount for this input
   */
  evalOnchainInput(t) {
    if (!this.intentOnchainInput)
      return ae.ZERO;
    const n = {
      amount: Number(t.amount)
    };
    return new ae(this.intentOnchainInput.program(n));
  }
  /**
   * Evaluates the fee for a given vtxo output
   * @param output - The output to evaluate
   * @returns The fee amount for this output
   */
  evalOffchainOutput(t) {
    if (!this.intentOffchainOutput)
      return ae.ZERO;
    const n = dd(t);
    return new ae(this.intentOffchainOutput.program(n));
  }
  /**
   * Evaluates the fee for a given collaborative exit output
   * @param output - The output to evaluate
   * @returns The fee amount for this output
   */
  evalOnchainOutput(t) {
    if (!this.intentOnchainOutput)
      return ae.ZERO;
    const n = dd(t);
    return new ae(this.intentOnchainOutput.program(n));
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
    let s = ae.ZERO;
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
};
function Wx(e) {
  const t = {
    amount: Number(e.amount),
    inputType: e.type,
    weight: e.weight
  };
  return e.expiry && (t.expiry = Math.floor(e.expiry.getTime() / 1e3)), e.birth && (t.birth = Math.floor(e.birth.getTime() / 1e3)), t;
}
function dd(e) {
  return {
    amount: Number(e.amount),
    script: e.script
  };
}
function ts(e, t) {
  const n = t.parse(e), r = n.check();
  if (!r.valid)
    throw new Error(`type check failed: ${r.error?.message ?? "unknown error"}`);
  if (r.type !== "double")
    throw new Error(`expected return type double, got ${r.type}`);
  return { program: n, text: e };
}
const si = {
  commitmentTxid: "",
  boardingTxid: "",
  arkTxid: ""
};
async function zx(e, t, n, r) {
  const i = [...e].sort((u, l) => u.createdAt.getTime() - l.createdAt.getTime()), s = [];
  let o = [];
  for (const u of i)
    if (u.status.isLeaf ? !n.has(u.virtualStatus.commitmentTxIds[0]) && i.filter((l) => l.settledBy === u.virtualStatus.commitmentTxIds[0]).length === 0 && o.push({
      key: {
        ...si,
        commitmentTxid: u.virtualStatus.commitmentTxIds[0]
      },
      tag: "batch",
      type: Qe.TxReceived,
      amount: u.value,
      settled: u.status.isLeaf || u.isSpent,
      createdAt: u.createdAt.getTime()
    }) : i.filter((l) => l.arkTxId === u.txid).length === 0 && o.push({
      key: { ...si, arkTxid: u.txid },
      tag: "offchain",
      type: Qe.TxReceived,
      amount: u.value,
      settled: u.status.isLeaf || u.isSpent,
      createdAt: u.createdAt.getTime()
    }), u.isSpent) {
      if (u.arkTxId && !s.some((l) => l.key.arkTxid === u.arkTxId)) {
        const l = i.filter((f) => f.txid === u.arkTxId), h = i.filter((f) => f.arkTxId === u.arkTxId).reduce((f, y) => f + y.value, 0);
        let p = 0, w = 0;
        if (l.length > 0) {
          const f = l.reduce((y, E) => y + E.value, 0);
          p = h - f, w = l[0].createdAt.getTime();
        } else
          p = h, w = r ? await r(u.arkTxId) : u.createdAt.getTime() + 1;
        s.push({
          key: { ...si, arkTxid: u.arkTxId },
          tag: "offchain",
          type: Qe.TxSent,
          amount: p,
          settled: !0,
          createdAt: w
        });
      }
      if (u.settledBy && !n.has(u.settledBy) && !s.some((l) => l.key.commitmentTxid === u.settledBy)) {
        const l = i.filter((p) => p.status.isLeaf && p.virtualStatus.commitmentTxIds?.every((w) => u.settledBy === w)), h = i.filter((p) => p.settledBy === u.settledBy).reduce((p, w) => p + w.value, 0);
        if (l.length > 0) {
          const p = l.reduce((w, f) => w + f.value, 0);
          h > p && s.push({
            key: { ...si, commitmentTxid: u.settledBy },
            tag: "exit",
            type: Qe.TxSent,
            amount: h - p,
            settled: !0,
            createdAt: l[0].createdAt.getTime()
          });
        } else
          s.push({
            key: { ...si, commitmentTxid: u.settledBy },
            tag: "exit",
            type: Qe.TxSent,
            amount: h,
            settled: !0,
            // TODO: fetch commitment tx with /v1/indexer/commitmentTx/<commitmentTxid> to know when the tx was made
            createdAt: u.createdAt.getTime() + 1
          });
      }
    }
  return [...t.map((u) => ({ ...u, tag: "boarding" })), ...s, ...o].sort((u, l) => l.createdAt - u.createdAt);
}
const Ce = "vtxos", Pe = "utxos", Be = "transactions", wn = "walletState", ce = "contracts", fd = "contractsCollections", Rp = 2;
function $p(e) {
  if (!e.objectStoreNames.contains(Ce)) {
    const t = e.createObjectStore(Ce, {
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
  if (!e.objectStoreNames.contains(Pe)) {
    const t = e.createObjectStore(Pe, {
      keyPath: ["address", "txid", "vout"]
    });
    t.indexNames.contains("address") || t.createIndex("address", "address", {
      unique: !1
    }), t.indexNames.contains("txid") || t.createIndex("txid", "txid", { unique: !1 }), t.indexNames.contains("value") || t.createIndex("value", "value", { unique: !1 }), t.indexNames.contains("status") || t.createIndex("status", "status", {
      unique: !1
    });
  }
  if (!e.objectStoreNames.contains(Be)) {
    const t = e.createObjectStore(Be, {
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
  if (e.objectStoreNames.contains(wn) || e.createObjectStore(wn, {
    keyPath: "key"
  }), !e.objectStoreNames.contains(ce)) {
    const t = e.createObjectStore(ce, {
      keyPath: "script"
    });
    t.indexNames.contains("type") || t.createIndex("type", "type", {
      unique: !1
    }), t.indexNames.contains("state") || t.createIndex("state", "state", {
      unique: !1
    });
  }
  e.objectStoreNames.contains(fd) || e.createObjectStore(fd, {
    keyPath: "key"
  });
}
const ao = ([e, t]) => ({
  cb: x.encode(Wt.encode(e)),
  s: x.encode(t)
}), jx = (e) => ({
  ...e,
  tapTree: x.encode(e.tapTree),
  forfeitTapLeafScript: ao(e.forfeitTapLeafScript),
  intentTapLeafScript: ao(e.intentTapLeafScript),
  extraWitness: e.extraWitness?.map(x.encode)
}), qx = (e) => ({
  ...e,
  tapTree: x.encode(e.tapTree),
  forfeitTapLeafScript: ao(e.forfeitTapLeafScript),
  intentTapLeafScript: ao(e.intentTapLeafScript),
  extraWitness: e.extraWitness?.map(x.encode)
}), co = (e) => {
  const t = Wt.decode(x.decode(e.cb)), n = x.decode(e.s);
  return [t, n];
}, Gx = (e) => ({
  ...e,
  createdAt: new Date(e.createdAt),
  tapTree: x.decode(e.tapTree),
  forfeitTapLeafScript: co(e.forfeitTapLeafScript),
  intentTapLeafScript: co(e.intentTapLeafScript),
  extraWitness: e.extraWitness?.map(x.decode)
}), Yx = (e) => ({
  ...e,
  tapTree: x.decode(e.tapTree),
  forfeitTapLeafScript: co(e.forfeitTapLeafScript),
  intentTapLeafScript: co(e.intentTapLeafScript),
  extraWitness: e.extraWitness?.map(x.decode)
}), Op = "arkade-service-worker";
function Zx() {
  if (typeof globalThis < "u")
    return typeof globalThis.self == "object" && globalThis.self !== null ? { globalObject: globalThis.self } : typeof globalThis.window == "object" && globalThis.window !== null ? { globalObject: globalThis.window } : { globalObject: globalThis };
  throw new Error("Global object not found");
}
const mi = /* @__PURE__ */ new Map(), Tr = /* @__PURE__ */ new Map();
async function uu(e, t, n) {
  const { globalObject: r } = Zx();
  if (!r.indexedDB)
    throw new Error("IndexedDB is not available in this environment");
  const i = mi.get(e);
  if (i)
    return Tr.set(e, (Tr.get(e) ?? 0) + 1), i;
  const s = new Promise((o, a) => {
    const c = r.indexedDB.open(e, t);
    c.onerror = () => {
      mi.delete(e), a(c.error);
    }, c.onsuccess = () => {
      o(c.result);
    }, c.onupgradeneeded = () => {
      const u = c.result;
      n(u);
    }, c.onblocked = () => {
      console.warn("Database upgrade blocked - close other tabs/connections");
    };
  });
  return mi.set(e, s), Tr.set(e, 1), s;
}
async function lu(e) {
  const t = mi.get(e);
  if (!t)
    return !1;
  const n = (Tr.get(e) ?? 1) - 1;
  if (n > 0)
    return Tr.set(e, n), !1;
  Tr.delete(e), mi.delete(e);
  try {
    (await t).close();
  } catch {
  }
  return !0;
}
let Xx = class {
  constructor(t = Op) {
    this.dbName = t, this.db = null;
  }
  async clear() {
    try {
      const t = await this.getDB();
      return new Promise((n, r) => {
        const i = t.transaction([ce], "readwrite"), s = i.objectStore(ce), o = i.objectStore(ce), a = s.clear(), c = o.clear();
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
      const r = (await this.getDB()).transaction([ce], "readonly").objectStore(ce);
      if (!t || Object.keys(t).length === 0)
        return new Promise((o, a) => {
          const c = r.getAll();
          c.onerror = () => a(c.error), c.onsuccess = () => o(c.result ?? []);
        });
      const i = Jx(t);
      if (i.has("script")) {
        const o = i.get("script"), a = await Promise.all(o.map((c) => new Promise((u, l) => {
          const d = r.get(c);
          d.onerror = () => l(d.error), d.onsuccess = () => u(d.result);
        })));
        return this.applyContractFilter(a, i);
      }
      if (i.has("state")) {
        const o = await this.getContractsByIndexValues(r, "state", i.get("state"));
        return this.applyContractFilter(o, i);
      }
      if (i.has("type")) {
        const o = await this.getContractsByIndexValues(r, "type", i.get("type"));
        return this.applyContractFilter(o, i);
      }
      const s = await new Promise((o, a) => {
        const c = r.getAll();
        c.onerror = () => a(c.error), c.onsuccess = () => o(c.result ?? []);
      });
      return this.applyContractFilter(s, i);
    } catch (n) {
      return console.error("Failed to get contracts:", n), [];
    }
  }
  async saveContract(t) {
    try {
      const n = await this.getDB();
      return new Promise((r, i) => {
        const a = n.transaction([ce], "readwrite").objectStore(ce).put(t);
        a.onerror = () => i(a.error), a.onsuccess = () => r();
      });
    } catch (n) {
      throw console.error("Failed to save contract:", n), n;
    }
  }
  async deleteContract(t) {
    try {
      const n = await this.getDB();
      return new Promise((r, i) => {
        const o = n.transaction([ce], "readwrite").objectStore(ce), a = o.get(t);
        a.onerror = () => i(a.error), a.onsuccess = () => {
          const c = o.delete(t);
          c.onerror = () => i(c.error), c.onsuccess = () => r();
        };
      });
    } catch (n) {
      throw console.error(`Failed to delete contract ${t}:`, n), n;
    }
  }
  getContractsByIndexValues(t, n, r) {
    if (r.length === 0)
      return Promise.resolve([]);
    const i = t.index(n), s = r.map((o) => new Promise((a, c) => {
      const u = i.getAll(o);
      u.onerror = () => c(u.error), u.onsuccess = () => a(u.result ?? []);
    }));
    return Promise.all(s).then((o) => o.flatMap((a) => a));
  }
  applyContractFilter(t, n) {
    return t.filter((r) => !(r === void 0 || n.has("script") && !n.get("script")?.includes(r.script) || n.has("state") && !n.get("state")?.includes(r.state) || n.has("type") && !n.get("type")?.includes(r.type)));
  }
  async getDB() {
    return this.db ? this.db : (this.db = await uu(this.dbName, Rp, $p), this.db);
  }
  async [Symbol.asyncDispose]() {
    this.db && (await lu(this.dbName), this.db = null);
  }
};
const Qx = ["script", "state", "type"];
function Jx(e) {
  const t = /* @__PURE__ */ new Map();
  return Qx.forEach((n) => {
    e?.[n] && (Array.isArray(e[n]) ? t.set(n, e[n]) : t.set(n, [e[n]]));
  }), t;
}
let tv = class {
  constructor(t = Op) {
    this.dbName = t, this.db = null;
  }
  async clear() {
    try {
      const t = await this.getDB();
      return new Promise((n, r) => {
        const i = t.transaction([
          Ce,
          Pe,
          Be,
          wn
        ], "readwrite"), s = i.objectStore(Ce), o = i.objectStore(Pe), a = i.objectStore(Be), c = i.objectStore(wn), u = [
          s.clear(),
          o.clear(),
          a.clear(),
          c.clear()
        ];
        let l = 0;
        const d = () => {
          l++, l === u.length && n();
        };
        u.forEach((h) => {
          h.onsuccess = d, h.onerror = () => r(h.error);
        });
      });
    } catch (t) {
      throw console.error("Failed to clear wallet data:", t), t;
    }
  }
  async [Symbol.asyncDispose]() {
    this.db && (await lu(this.dbName), this.db = null);
  }
  async getVtxos(t) {
    try {
      const n = await this.getDB();
      return new Promise((r, i) => {
        const c = n.transaction([Ce], "readonly").objectStore(Ce).index("address").getAll(t);
        c.onerror = () => i(c.error), c.onsuccess = () => {
          const l = (c.result || []).map(Gx);
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
      return new Promise((i, s) => {
        const o = r.transaction([Ce], "readwrite"), a = o.objectStore(Ce), c = n.map((u) => new Promise((l, d) => {
          const h = jx(u), p = {
            address: t,
            ...h
          }, w = a.put(p);
          w.onerror = () => d(w.error), w.onsuccess = () => l();
        }));
        Promise.all(c).then(() => i()).catch(s), o.onerror = () => s(o.error);
      });
    } catch (r) {
      throw console.error(`Failed to save VTXOs for address ${t}:`, r), r;
    }
  }
  async deleteVtxos(t) {
    try {
      const n = await this.getDB();
      return new Promise((r, i) => {
        const c = n.transaction([Ce], "readwrite").objectStore(Ce).index("address").openCursor(IDBKeyRange.only(t));
        c.onerror = () => i(c.error), c.onsuccess = () => {
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
      return new Promise((r, i) => {
        const c = n.transaction([Pe], "readonly").objectStore(Pe).index("address").getAll(t);
        c.onerror = () => i(c.error), c.onsuccess = () => {
          const l = (c.result || []).map(Yx);
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
      return new Promise((i, s) => {
        const o = r.transaction([Pe], "readwrite"), a = o.objectStore(Pe), c = n.map((u) => new Promise((l, d) => {
          const h = qx(u), p = {
            address: t,
            ...h
          }, w = a.put(p);
          w.onerror = () => d(w.error), w.onsuccess = () => l();
        }));
        Promise.all(c).then(() => i()).catch(s), o.onerror = () => s(o.error);
      });
    } catch (r) {
      throw console.error(`Failed to save UTXOs for address ${t}:`, r), r;
    }
  }
  async deleteUtxos(t) {
    try {
      const n = await this.getDB();
      return new Promise((r, i) => {
        const c = n.transaction([Pe], "readwrite").objectStore(Pe).index("address").openCursor(IDBKeyRange.only(t));
        c.onerror = () => i(c.error), c.onsuccess = () => {
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
      return new Promise((r, i) => {
        const c = n.transaction([Be], "readonly").objectStore(Be).index("address").getAll(t);
        c.onerror = () => i(c.error), c.onsuccess = () => {
          const u = c.result || [];
          r(u.sort((l, d) => l.createdAt - d.createdAt));
        };
      });
    } catch (n) {
      return console.error(`Failed to get transaction history for address ${t}:`, n), [];
    }
  }
  async saveTransactions(t, n) {
    try {
      const r = await this.getDB();
      return new Promise((i, s) => {
        const o = r.transaction([Be], "readwrite"), a = o.objectStore(Be);
        n.forEach((c) => {
          const u = {
            address: t,
            ...c,
            keyBoardingTxid: c.key.boardingTxid,
            keyCommitmentTxid: c.key.commitmentTxid,
            keyArkTxid: c.key.arkTxid
          };
          a.put(u);
        }), o.oncomplete = () => i(), o.onerror = () => s(o.error), o.onabort = () => s(new Error("Transaction aborted"));
      });
    } catch (r) {
      throw console.error(`Failed to save transactions for address ${t}:`, r), r;
    }
  }
  async deleteTransactions(t) {
    try {
      const n = await this.getDB();
      return new Promise((r, i) => {
        const c = n.transaction([Be], "readwrite").objectStore(Be).index("address").openCursor(IDBKeyRange.only(t));
        c.onerror = () => i(c.error), c.onsuccess = () => {
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
        const o = t.transaction([wn], "readonly").objectStore(wn).get("state");
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
      return new Promise((r, i) => {
        const o = n.transaction([wn], "readwrite").objectStore(wn), a = {
          key: "state",
          data: t
        }, c = o.put(a);
        c.onerror = () => i(c.error), c.onsuccess = () => r();
      });
    } catch (n) {
      throw console.error("Failed to save wallet state:", n), n;
    }
  }
  async getDB() {
    return this.db ? this.db : (this.db = await uu(this.dbName, Rp, $p), this.db);
  }
}, ev = class {
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
    const { contractScripts: n, includeSpent: r } = t, i = this.config.walletRepository, o = Array.from(this.contracts.values()).filter((c) => !(n && !n.includes(c.contract.script))).map(async (c) => {
      const u = await i.getVtxos(c.contract.address);
      if (u.length > 0) {
        const l = u.map((h) => ({
          ...h,
          contractScript: c.contract.script
        })), d = r ? l : l.filter((h) => !h.isSpent);
        return [[c.contract.script, d]];
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
      for (const i of t) {
        const s = this.contracts.get(i);
        if (!s)
          continue;
        const o = r.get(i) || [], a = new Set(o.map((l) => `${l.txid}:${l.vout}`)), c = [];
        for (const l of o) {
          const d = `${l.txid}:${l.vout}`;
          s.lastKnownVtxos.has(d) || (c.push(l), s.lastKnownVtxos.set(d, l));
        }
        const u = [];
        for (const [l, d] of s.lastKnownVtxos)
          a.has(l) || (u.push(d), s.lastKnownVtxos.delete(l));
        c.length > 0 && this.emitVtxoEvent(i, c, "vtxo_received", n), u.length > 0 && this.emitVtxoEvent(i, u, "vtxo_spent", n);
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
  processSubscriptionVtxos(t, n, r, i) {
    if (n.length === 1) {
      const s = n[0];
      if (s) {
        const o = this.contracts.get(s);
        if (o)
          for (const a of t) {
            const c = `${a.txid}:${a.vout}`;
            r === "vtxo_received" ? o.lastKnownVtxos.set(c, a) : r === "vtxo_spent" && o.lastKnownVtxos.delete(c);
          }
        this.emitVtxoEvent(s, t, r, i);
      }
      return;
    }
    for (const s of n) {
      const o = s;
      if (o) {
        const a = this.contracts.get(o);
        if (a)
          for (const c of t) {
            const u = `${c.txid}:${c.vout}`;
            r === "vtxo_received" ? a.lastKnownVtxos.set(u, c) : a.lastKnownVtxos.delete(u);
          }
        this.emitVtxoEvent(o, t, r, i);
      }
    }
  }
  /**
   * Emit a VTXO event for a contract.
   */
  emitVtxoEvent(t, n, r, i) {
    if (!this.eventCallback)
      return;
    const s = this.contracts.get(t);
    switch (this.checkExpiredContracts(), r) {
      case "vtxo_received":
        if (!s)
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
          contract: s.contract,
          timestamp: i
        });
        return;
      case "vtxo_spent":
        if (!s)
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
          contract: s.contract,
          timestamp: i
        });
        return;
      case "contract_expired":
        if (!s)
          return;
        this.eventCallback({
          type: "contract_expired",
          contractScript: t,
          contract: s.contract,
          timestamp: i
        });
        return;
      default:
        return;
    }
  }
}, nv = class {
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
};
const bi = new nv();
function xi(e) {
  return ve.encode(e.type === "blocks" ? { blocks: Number(e.value) } : { seconds: Number(e.value) });
}
function vi(e) {
  const t = ve.decode(e);
  if ("blocks" in t && t.blocks !== void 0)
    return { type: "blocks", value: BigInt(t.blocks) };
  if ("seconds" in t && t.seconds !== void 0)
    return { type: "seconds", value: BigInt(t.seconds) };
  throw new Error(`Invalid BIP68 sequence: ${e}`);
}
function pa(e, t) {
  if (t.role === "sender" || t.role === "receiver")
    return t.role;
  if (t.walletPubKey) {
    if (t.walletPubKey === e.params.sender)
      return "sender";
    if (t.walletPubKey === e.params.receiver)
      return "receiver";
  }
}
function gr(e, t) {
  if (t === void 0)
    return !0;
  if (!e.vtxo)
    return !1;
  const n = vi(t);
  if (n.type === "blocks")
    return e.blockHeight === void 0 || e.vtxo.status.block_height === void 0 ? !1 : e.blockHeight - e.vtxo.status.block_height >= Number(n.value);
  if (n.type === "seconds") {
    const r = e.vtxo.status.block_time;
    return r === void 0 ? !1 : e.currentTime / 1e3 - r >= Number(n.value);
  }
  return !1;
}
const rv = {
  type: "default",
  createScript(e) {
    const t = this.deserializeParams(e);
    return new Qn.Script(t);
  },
  serializeParams(e) {
    return {
      pubKey: x.encode(e.pubKey),
      serverPubKey: x.encode(e.serverPubKey),
      csvTimelock: xi(e.csvTimelock).toString()
    };
  },
  deserializeParams(e) {
    const t = e.csvTimelock ? vi(Number(e.csvTimelock)) : Qn.Script.DEFAULT_TIMELOCK;
    return {
      pubKey: x.decode(e.pubKey),
      serverPubKey: x.decode(e.serverPubKey),
      csvTimelock: t
    };
  },
  selectPath(e, t, n) {
    if (n.collaborative)
      return { leaf: e.forfeit() };
    const r = t.params.csvTimelock ? Number(t.params.csvTimelock) : void 0;
    return gr(n, r) ? {
      leaf: e.exit(),
      sequence: r
    } : null;
  },
  getAllSpendingPaths(e, t, n) {
    const r = [];
    n.collaborative && r.push({ leaf: e.forfeit() });
    const i = { leaf: e.exit() };
    return t.params.csvTimelock && (i.sequence = Number(t.params.csvTimelock)), r.push(i), r;
  },
  getSpendablePaths(e, t, n) {
    const r = [];
    n.collaborative && r.push({ leaf: e.forfeit() });
    const i = t.params.csvTimelock ? Number(t.params.csvTimelock) : void 0;
    if (gr(n, i)) {
      const s = { leaf: e.exit() };
      i !== void 0 && (s.sequence = i), r.push(s);
    }
    return r;
  }
}, iv = {
  type: "vhtlc",
  createScript(e) {
    const t = this.deserializeParams(e);
    return new Js.Script(t);
  },
  serializeParams(e) {
    return {
      sender: x.encode(e.sender),
      receiver: x.encode(e.receiver),
      server: x.encode(e.server),
      hash: x.encode(e.preimageHash),
      refundLocktime: e.refundLocktime.toString(),
      claimDelay: xi(e.unilateralClaimDelay).toString(),
      refundDelay: xi(e.unilateralRefundDelay).toString(),
      refundNoReceiverDelay: xi(e.unilateralRefundWithoutReceiverDelay).toString()
    };
  },
  deserializeParams(e) {
    return {
      sender: x.decode(e.sender),
      receiver: x.decode(e.receiver),
      server: x.decode(e.server),
      preimageHash: x.decode(e.hash),
      refundLocktime: BigInt(e.refundLocktime),
      unilateralClaimDelay: vi(Number(e.claimDelay)),
      unilateralRefundDelay: vi(Number(e.refundDelay)),
      unilateralRefundWithoutReceiverDelay: vi(Number(e.refundNoReceiverDelay))
    };
  },
  /**
   * Select spending path based on context.
   *
   * Role is determined from `context.role` or by matching `context.walletPubKey`
   * against sender/receiver in contract params.
   */
  selectPath(e, t, n) {
    const r = pa(t, n), i = t.params?.preimage, s = BigInt(t.params.refundLocktime), o = Math.floor(n.currentTime / 1e3);
    if (!r)
      return null;
    if (n.collaborative)
      return r === "receiver" && i ? {
        leaf: e.claim(),
        extraWitness: [x.decode(i)]
      } : r === "sender" && BigInt(o) >= s ? {
        leaf: e.refundWithoutReceiver()
      } : null;
    if (r === "receiver" && i) {
      const a = Number(t.params.claimDelay);
      return gr(n, a) ? {
        leaf: e.unilateralClaim(),
        extraWitness: [x.decode(i)],
        sequence: a
      } : null;
    }
    if (r === "sender") {
      const a = Number(t.params.refundNoReceiverDelay);
      return gr(n, a) ? {
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
    const r = pa(t, n), i = [];
    if (!r)
      return i;
    const s = t.params?.preimage;
    if (n.collaborative)
      r === "receiver" && s && i.push({
        leaf: e.claim(),
        extraWitness: [x.decode(s)]
      }), r === "sender" && i.push({
        leaf: e.refundWithoutReceiver()
      });
    else {
      if (r === "receiver" && s) {
        const o = Number(t.params.claimDelay);
        i.push({
          leaf: e.unilateralClaim(),
          extraWitness: [x.decode(s)],
          sequence: o
        });
      }
      if (r === "sender") {
        const o = Number(t.params.refundNoReceiverDelay);
        i.push({
          leaf: e.unilateralRefundWithoutReceiver(),
          sequence: o
        });
      }
    }
    return i;
  },
  getSpendablePaths(e, t, n) {
    const r = pa(t, n), i = [];
    if (!r)
      return i;
    const s = t.params?.preimage, o = BigInt(t.params.refundLocktime), a = Math.floor(n.currentTime / 1e3);
    if (n.collaborative)
      return r === "receiver" && s && i.push({
        leaf: e.claim(),
        extraWitness: [x.decode(s)]
      }), r === "sender" && BigInt(a) >= o && i.push({
        leaf: e.refundWithoutReceiver()
      }), i;
    if (r === "receiver" && s) {
      const c = Number(t.params.claimDelay);
      gr(n, c) && i.push({
        leaf: e.unilateralClaim(),
        extraWitness: [x.decode(s)],
        sequence: c
      });
    }
    if (r === "sender") {
      const c = Number(t.params.refundNoReceiverDelay);
      gr(n, c) && i.push({
        leaf: e.unilateralRefundWithoutReceiver(),
        sequence: c
      });
    }
    return i;
  }
};
bi.register(rv);
bi.register(iv);
let sv = class Cp {
  constructor(t) {
    this.initialized = !1, this.eventCallbacks = /* @__PURE__ */ new Set(), this.config = t, this.watcher = new ev({
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
    const n = new Cp(t);
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
    const n = bi.get(t.type);
    if (!n)
      throw new Error(`No handler registered for contract type '${t.type}'`);
    try {
      const s = n.createScript(t.params), o = x.encode(s.pkScript);
      if (o !== t.script)
        throw new Error(`Script mismatch: provided script does not match script derived from params. Expected ${o}, got ${t.script}`);
    } catch (s) {
      throw s instanceof Error && s.message.includes("mismatch") ? s : new Error(`Invalid params for contract type '${t.type}': ${s instanceof Error ? s.message : String(s)}`);
    }
    const [r] = await this.getContracts({ script: t.script });
    if (r) {
      if (r.type === t.type)
        return r;
      throw new Error(`Contract with script ${t.script} already exists with with type ${r.type}.`);
    }
    const i = {
      ...t,
      createdAt: Date.now(),
      state: t.state || "active"
    };
    return await this.config.contractRepository.saveContract(i), await this.getVtxosForContracts([i]), await this.watcher.addContract(i), i;
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
    return n.map((i) => ({
      contract: i,
      vtxos: r.get(i.script) ?? []
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
    const i = (await this.config.contractRepository.getContracts({
      script: t
    }))[0];
    if (!i)
      throw new Error(`Contract ${t} not found`);
    const s = {
      ...i,
      ...n
    };
    return await this.config.contractRepository.saveContract(s), await this.watcher.updateContract(s), s;
  }
  /**
   * Update a contract's params.
   * This method preserves existing params by merging the provided values.
   *
   * @param script - Contract script
   * @param updates - The new values to merge with existing params
   */
  async updateContractParams(t, n) {
    const i = (await this.config.contractRepository.getContracts({
      script: t
    }))[0];
    if (!i)
      throw new Error(`Contract ${t} not found`);
    const s = {
      ...i,
      params: { ...i.params, ...n }
    };
    return await this.config.contractRepository.saveContract(s), await this.watcher.updateContract(s), s;
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
    const { contractScript: n, collaborative: r = !0, walletPubKey: i, vtxo: s } = t, [o] = await this.getContracts({ script: n });
    if (!o)
      return [];
    const a = bi.get(o.type);
    if (!a)
      return [];
    const c = a.createScript(o.params), u = {
      collaborative: r,
      currentTime: Date.now(),
      walletPubKey: i,
      vtxo: s
    };
    return a.getSpendablePaths(c, o, u);
  }
  async getAllSpendingPaths(t) {
    const { contractScript: n, collaborative: r = !0, walletPubKey: i } = t, [s] = await this.getContracts({ script: n });
    if (!s)
      return [];
    const o = bi.get(s.type);
    if (!o)
      return [];
    const a = o.createScript(s.params), c = {
      collaborative: r,
      currentTime: Date.now(),
      walletPubKey: i
    };
    return o.getAllSpendingPaths(a, s, c);
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
    const i = await this.fetchContractVtxosBulk(t, n, r), s = /* @__PURE__ */ new Map();
    for (const [o, a] of i) {
      s.set(o, a);
      const c = t.find((u) => u.script === o);
      c && await this.config.walletRepository.saveVtxos(c.address, a);
    }
    return s;
  }
  async fetchContractVtxosBulk(t, n, r) {
    const i = /* @__PURE__ */ new Map();
    return await Promise.all(t.map(async (s) => {
      const o = await this.fetchContractVtxosPaginated(s, n, r);
      i.set(s.script, o);
    })), i;
  }
  async fetchContractVtxosPaginated(t, n, r) {
    const s = [];
    let o = 0, a = !0;
    const c = n ? {} : { spendableOnly: !0 };
    for (; a; ) {
      const { vtxos: u, page: l } = await this.config.indexerProvider.getVtxos({
        scripts: [t.script],
        ...c,
        pageIndex: o,
        pageSize: 100
      });
      for (const d of u) {
        const h = r ? r(d) : d;
        s.push({
          ...h,
          contractScript: t.script
        });
      }
      a = l ? u.length === 100 : !1, o++;
    }
    return s;
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
};
function ov(e) {
  return typeof e == "object" && e !== null && "toReadonly" in e && typeof e.toReadonly == "function";
}
let ga = class rc {
  constructor(t, n, r, i, s, o, a, c, u, l, d) {
    this.identity = t, this.network = n, this.onchainProvider = r, this.indexerProvider = i, this.arkServerPublicKey = s, this.offchainTapscript = o, this.boardingTapscript = a, this.dustAmount = c, this.walletRepository = u, this.contractRepository = l, this.watcherConfig = d;
  }
  /**
   * Protected helper to set up shared wallet configuration.
   * Extracts common logic used by both ReadonlyWallet.create() and Wallet.create().
   */
  static async setupWalletConfig(t, n) {
    const r = t.arkProvider || (() => {
      if (!t.arkServerUrl)
        throw new Error("Either arkProvider or arkServerUrl must be provided");
      return new hb(t.arkServerUrl);
    })(), i = t.arkServerUrl || r.serverUrl;
    if (!i)
      throw new Error("Could not determine arkServerUrl from provider");
    const s = t.indexerUrl || i, o = t.indexerProvider || new Wb(s), a = await r.getInfo(), c = bb(a.network), u = t.esploraUrl || xb[a.network], l = t.onchainProvider || new vb(u);
    if (t.exitTimelock) {
      const { value: O, type: B } = t.exitTimelock;
      if (O < 512n && B !== "blocks" || O >= 512n && B !== "seconds")
        throw new Error("invalid exitTimelock");
    }
    const d = t.exitTimelock ?? {
      value: a.unilateralExitDelay,
      type: a.unilateralExitDelay < 512n ? "blocks" : "seconds"
    };
    if (t.boardingTimelock) {
      const { value: O, type: B } = t.boardingTimelock;
      if (O < 512n && B !== "blocks" || O >= 512n && B !== "seconds")
        throw new Error("invalid boardingTimelock");
    }
    const h = t.boardingTimelock ?? {
      value: a.boardingExitDelay,
      type: a.boardingExitDelay < 512n ? "blocks" : "seconds"
    }, p = x.decode(a.signerPubkey).slice(1), w = new Qn.Script({
      pubKey: n,
      serverPubKey: p,
      csvTimelock: d
    }), f = new Qn.Script({
      pubKey: n,
      serverPubKey: p,
      csvTimelock: h
    }), y = w, E = t.storage?.walletRepository ?? new tv(), I = t.storage?.contractRepository ?? new Xx();
    return {
      arkProvider: r,
      indexerProvider: o,
      onchainProvider: l,
      network: c,
      networkName: a.network,
      serverPubKey: p,
      offchainTapscript: y,
      boardingTapscript: f,
      dustAmount: a.dust,
      walletRepository: E,
      contractRepository: I,
      info: a
    };
  }
  static async create(t) {
    const n = await t.identity.xOnlyPublicKey();
    if (!n)
      throw new Error("Invalid configured public key");
    const r = await rc.setupWalletConfig(t, n);
    return new rc(t.identity, r.network, r.onchainProvider, r.indexerProvider, r.serverPubKey, r.offchainTapscript, r.boardingTapscript, r.dustAmount, r.walletRepository, r.contractRepository, t.watcherConfig);
  }
  get arkAddress() {
    return this.offchainTapscript.address(this.network.hrp, this.arkServerPublicKey);
  }
  /**
   * Get the contract script for the wallet's default address.
   * This is the pkScript hex, used to identify the wallet in ContractManager.
   */
  get defaultContractScript() {
    return x.encode(this.offchainTapscript.pkScript);
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
    s = n.filter((l) => l.virtualStatus.state === "settled").reduce((l, d) => l + d.value, 0), o = n.filter((l) => l.virtualStatus.state === "preconfirmed").reduce((l, d) => l + d.value, 0), a = n.filter((l) => ms(l) && l.virtualStatus.state === "swept").reduce((l, d) => l + d.value, 0);
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
  // TODO: use contract manager (and repo) will be offline-first
  async getVtxos(t) {
    const n = await this.getAddress(), i = (await this.getVirtualCoins(t)).map((s) => pr(this, s));
    return await this.walletRepository.saveVtxos(n, i), i;
  }
  async getVirtualCoins(t = { withRecoverable: !0, withUnrolled: !1 }) {
    const n = [x.encode(this.offchainTapscript.pkScript)], i = (await this.indexerProvider.getVtxos({ scripts: n })).vtxos;
    let s = i.filter(ms);
    if (t.withRecoverable || (s = s.filter((o) => !to(o) && !Qm(o))), t.withUnrolled) {
      const o = i.filter((a) => !ms(a));
      s.push(...o.filter((a) => a.isUnrolled));
    }
    return s;
  }
  async getTransactionHistory() {
    const t = await this.indexerProvider.getVtxos({
      scripts: [x.encode(this.offchainTapscript.pkScript)]
    }), { boardingTxs: n, commitmentsToIgnore: r } = await this.getBoardingTxs(), i = (s) => this.indexerProvider.getVtxos({ outpoints: [{ txid: s, vout: 0 }] }).then((o) => o.vtxos[0]?.createdAt.getTime() || 0);
    return zx(t.vtxos, n, r, i);
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
        type: Qe.TxReceived,
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
    const t = await this.getBoardingAddress(), r = (await this.onchainProvider.getCoins(t)).map((i) => jb(this, i));
    return await this.walletRepository.saveUtxos(t, r), r;
  }
  async notifyIncomingFunds(t) {
    const n = await this.getAddress(), r = await this.getBoardingAddress();
    let i, s;
    if (this.onchainProvider && r) {
      const a = (c) => c.vout.findIndex((u) => u.scriptpubkey_address === r);
      i = await this.onchainProvider.watchAddresses([r], (c) => {
        const u = c.filter((l) => a(l) !== -1).map((l) => {
          const { txid: d, status: h } = l, p = a(l), w = Number(l.vout[p].value);
          return { txid: d, vout: p, value: w, status: h };
        });
        t({
          type: "utxo",
          coins: u
        });
      });
    }
    if (this.indexerProvider && n) {
      const a = this.offchainTapscript, c = await this.indexerProvider.subscribeForScripts([
        x.encode(a.pkScript)
      ]), u = new AbortController(), l = this.indexerProvider.getSubscription(c, u.signal);
      s = async () => {
        u.abort(), await this.indexerProvider?.unsubscribeForScripts(c);
      }, (async () => {
        try {
          for await (const d of l)
            (d.newVtxos?.length > 0 || d.spentVtxos?.length > 0) && t({
              type: "vtxo",
              newVtxos: d.newVtxos.map((h) => pr(this, h)),
              spentVtxos: d.spentVtxos.map((h) => pr(this, h))
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
    const t = [x.encode(this.offchainTapscript.pkScript)];
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
    const t = await sv.create({
      indexerProvider: this.indexerProvider,
      contractRepository: this.contractRepository,
      walletRepository: this.walletRepository,
      extendVtxo: (r) => pr(this, r),
      getDefaultAddress: () => this.getAddress(),
      watcherConfig: this.watcherConfig
    }), n = this.offchainTapscript.options.csvTimelock ?? Qn.Script.DEFAULT_TIMELOCK;
    return await t.createContract({
      type: "default",
      params: {
        pubKey: x.encode(this.offchainTapscript.options.pubKey),
        serverPubKey: x.encode(this.offchainTapscript.options.serverPubKey),
        csvTimelock: xi(n).toString()
      },
      script: this.defaultContractScript,
      address: await this.getAddress(),
      state: "active"
    }), t;
  }
}, ic = class Pp extends ga {
  constructor(t, n, r, i, s, o, a, c, u, l, d, h, p, w, f, y, E) {
    super(t, n, i, o, a, c, u, p, w, f, E), this.networkName = r, this.arkProvider = s, this.serverUnrollScript = l, this.forfeitOutputScript = d, this.forfeitPubkey = h, this.identity = t, this.renewalConfig = {
      enabled: y?.enabled ?? !1,
      ...Fb,
      ...y
    };
  }
  static async create(t) {
    const n = await t.identity.xOnlyPublicKey();
    if (!n)
      throw new Error("Invalid configured public key");
    const r = await ga.setupWalletConfig(t, n);
    let i;
    try {
      const c = x.decode(r.info.checkpointTapscript);
      i = kt.decode(c);
    } catch {
      throw new Error("Invalid checkpointTapscript from server");
    }
    const s = x.decode(r.info.forfeitPubkey).slice(1), o = Yt(r.network).decode(r.info.forfeitAddress), a = dt.encode(o);
    return new Pp(t.identity, r.network, r.networkName, r.onchainProvider, r.arkProvider, r.indexerProvider, r.serverPubKey, r.offchainTapscript, r.boardingTapscript, i, a, s, r.dustAmount, r.walletRepository, r.contractRepository, t.renewalConfig, t.watcherConfig);
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
    const t = ov(this.identity) ? await this.identity.toReadonly() : this.identity;
    return new ga(t, this.network, this.onchainProvider, this.indexerProvider, this.arkServerPublicKey, this.offchainTapscript, this.boardingTapscript, this.dustAmount, this.walletRepository, this.contractRepository, this.watcherConfig);
  }
  async sendBitcoin(t) {
    if (t.amount <= 0)
      throw new Error("Amount must be positive");
    if (!av(t.address))
      throw new Error("Invalid Ark address " + t.address);
    const n = await this.getVirtualCoins({
      withRecoverable: !1
    });
    let r;
    if (t.selectedVtxos) {
      const w = t.selectedVtxos.map((y) => y.value).reduce((y, E) => y + E, 0);
      if (w < t.amount)
        throw new Error("Selected VTXOs do not cover specified amount");
      const f = w - t.amount;
      r = {
        inputs: t.selectedVtxos,
        changeAmount: BigInt(f)
      };
    } else
      r = cv(n, t.amount);
    const i = this.offchainTapscript.forfeit();
    if (!i)
      throw new Error("Selected leaf not found");
    const s = Sn.decode(t.address), a = [
      {
        script: BigInt(t.amount) < this.dustAmount ? s.subdustPkScript : s.pkScript,
        amount: BigInt(t.amount)
      }
    ];
    if (r.changeAmount > 0n) {
      const w = r.changeAmount < this.dustAmount ? this.arkAddress.subdustPkScript : this.arkAddress.pkScript;
      a.push({
        script: w,
        amount: BigInt(r.changeAmount)
      });
    }
    const c = this.offchainTapscript.encode(), u = no(r.inputs.map((w) => ({
      ...w,
      tapLeafScript: i,
      tapTree: c
    })), a, this.serverUnrollScript), l = await this.identity.sign(u.arkTx), { arkTxid: d, signedCheckpointTxs: h } = await this.arkProvider.submitTx(G.encode(l.toPSBT()), u.checkpoints.map((w) => G.encode(w.toPSBT()))), p = await Promise.all(h.map(async (w) => {
      const f = rt.fromPSBT(G.decode(w)), y = await this.identity.sign(f);
      return G.encode(y.toPSBT());
    }));
    await this.arkProvider.finalizeTx(d, p);
    try {
      const w = [], f = /* @__PURE__ */ new Set();
      let y = Number.MAX_SAFE_INTEGER;
      for (const [O, B] of r.inputs.entries()) {
        const N = pr(this, B), V = h[O], g = rt.fromPSBT(G.decode(V));
        if (w.push({
          ...N,
          virtualStatus: { ...N.virtualStatus, state: "spent" },
          spentBy: g.id,
          arkTxId: d,
          isSpent: !0
        }), N.virtualStatus.commitmentTxIds)
          for (const M of N.virtualStatus.commitmentTxIds)
            f.add(M);
        N.virtualStatus.batchExpiry && (y = Math.min(y, N.virtualStatus.batchExpiry));
      }
      const E = Date.now(), I = this.arkAddress.encode();
      if (r.changeAmount > 0n && y !== Number.MAX_SAFE_INTEGER) {
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
            commitmentTxIds: Array.from(f),
            batchExpiry: y
          },
          status: {
            confirmed: !1
          }
        };
        await this.walletRepository.saveVtxos(I, [O]);
      }
      await this.walletRepository.saveVtxos(I, w), await this.walletRepository.saveTransactions(I, [
        {
          key: {
            boardingTxid: "",
            commitmentTxid: "",
            arkTxid: d
          },
          amount: t.amount,
          type: Qe.TxSent,
          settled: !1,
          createdAt: Date.now()
        }
      ]);
    } catch (w) {
      console.warn("error saving offchain tx to repository", w);
    } finally {
      return d;
    }
  }
  async settle(t, n) {
    if (t?.inputs) {
      for (const w of t.inputs)
        if (typeof w == "string")
          try {
            kn.fromString(w);
          } catch {
            throw new Error(`Invalid arknote "${w}"`);
          }
    }
    if (!t) {
      const { fees: w } = await this.arkProvider.getInfo(), f = new Kx(w.intentFee);
      let y = 0;
      const I = kt.decode(x.decode(this.boardingTapscript.exitScript)).params.timelock, O = (await this.getBoardingUtxos()).filter((F) => !Ub(F, I)), B = [];
      for (const F of O) {
        const A = f.evalOnchainInput({
          amount: BigInt(F.value)
        });
        A.value >= F.value || (B.push(F), y += F.value - A.satoshis);
      }
      const N = await this.getVtxos({ withRecoverable: !0 }), V = [];
      for (const F of N) {
        const A = f.evalOffchainInput({
          amount: BigInt(F.value),
          type: F.virtualStatus.state === "swept" ? "recoverable" : "vtxo",
          weight: 0,
          birth: F.createdAt,
          expiry: F.virtualStatus.batchExpiry ? new Date(F.virtualStatus.batchExpiry * 1e3) : /* @__PURE__ */ new Date()
        });
        A.value >= F.value || (V.push(F), y += F.value - A.satoshis);
      }
      const g = [...B, ...V];
      if (g.length === 0)
        throw new Error("No inputs found");
      const M = {
        address: await this.getAddress(),
        amount: BigInt(y)
      }, _ = f.evalOffchainOutput({
        amount: M.amount,
        script: x.encode(Sn.decode(M.address).pkScript)
      });
      if (M.amount -= BigInt(_.satoshis), M.amount <= this.dustAmount)
        throw new Error("Output amount is below dust limit");
      t = {
        inputs: g,
        outputs: [M]
      };
    }
    const r = [], i = [];
    let s = !1;
    for (const [w, f] of t.outputs.entries()) {
      let y;
      try {
        y = Sn.decode(f.address).pkScript, s = !0;
      } catch {
        const E = Yt(this.network).decode(f.address);
        y = dt.encode(E), r.push(w);
      }
      i.push({
        amount: f.amount,
        script: y
      });
    }
    let o;
    const a = [];
    s && (o = this.identity.signerSession(), a.push(x.encode(await o.getPublicKey())));
    const [c, u] = await Promise.all([
      this.makeRegisterIntentSignature(t.inputs, i, r, a),
      this.makeDeleteIntentSignature(t.inputs)
    ]), l = await this.safeRegisterIntent(c), d = [
      ...a,
      ...t.inputs.map((w) => `${w.txid}:${w.vout}`)
    ], h = this.createBatchHandler(l, t.inputs, o), p = new AbortController();
    try {
      const w = this.arkProvider.getEventStream(p.signal, d);
      return await eo.join(w, h, {
        abortController: p,
        skipVtxoTreeSigning: !s,
        eventCallback: n ? (f) => Promise.resolve(n(f)) : void 0
      });
    } catch (w) {
      throw await this.arkProvider.deleteIntent(u).catch(() => {
      }), w;
    } finally {
      p.abort();
    }
  }
  async handleSettlementFinalizationEvent(t, n, r, i) {
    const s = [], o = await this.getVirtualCoins();
    let a = rt.fromPSBT(G.decode(t.commitmentTx)), c = !1, u = 0;
    const l = i?.leaves() || [];
    for (const d of n) {
      const h = o.find((O) => O.txid === d.txid && O.vout === d.vout);
      if (!h) {
        for (let O = 0; O < a.inputsLength; O++) {
          const B = a.getInput(O);
          if (!B.txid || B.index === void 0)
            throw new Error("The server returned incomplete data. No settlement input found in the PSBT");
          if (x.encode(B.txid) === d.txid && B.index === d.vout) {
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
      if (to(h) || Jm(h, this.dustAmount))
        continue;
      if (l.length === 0)
        throw new Error("connectors not received");
      if (u >= l.length)
        throw new Error("not enough connectors received");
      const p = l[u], w = p.id, f = p.getOutput(0);
      if (!f)
        throw new Error("connector output not found");
      const y = f.amount, E = f.script;
      if (!y || !E)
        throw new Error("invalid connector output");
      u++;
      let I = hp([
        {
          txid: d.txid,
          index: d.vout,
          witnessUtxo: {
            amount: BigInt(h.value),
            script: re.decode(d.tapTree).pkScript
          },
          sighashType: It.DEFAULT,
          tapLeafScript: [d.forfeitTapLeafScript]
        },
        {
          txid: w,
          index: 0,
          witnessUtxo: {
            amount: y,
            script: E
          }
        }
      ], r);
      I = await this.identity.sign(I, [0]), s.push(G.encode(I.toPSBT()));
    }
    (s.length > 0 || c) && await this.arkProvider.submitSignedForfeitTxs(s, c ? G.encode(a.toPSBT()) : void 0);
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
        const o = new TextEncoder().encode(t), a = lt(o), c = x.encode(a);
        let u = !0;
        for (const d of s.intentIdHashes)
          if (d === c) {
            if (!this.arkProvider)
              throw new Error("Ark provider not configured");
            await this.arkProvider.confirmRegistration(t), u = !1;
          }
        if (u)
          return { skip: u };
        const l = kt.encode({
          timelock: {
            value: s.batchExpiry,
            type: s.batchExpiry >= 512n ? "seconds" : "blocks"
          },
          pubkeys: [this.forfeitPubkey]
        }).script;
        return i = En(l), { skip: !1 };
      },
      onTreeSigningStarted: async (s, o) => {
        if (!r)
          return { skip: !0 };
        if (!i)
          throw new Error("Sweep tap tree root not set");
        const a = s.cosignersPublicKeys.map((w) => w.slice(2)), u = (await r.getPublicKey()).subarray(1);
        if (!a.includes(x.encode(u)))
          return { skip: !0 };
        const l = rt.fromPSBT(G.decode(s.unsignedCommitmentTx));
        gp(o, l, i);
        const d = l.getOutput(0);
        if (!d?.amount)
          throw new Error("Shared output not found");
        await r.init(o, i, d.amount);
        const h = x.encode(await r.getPublicKey()), p = await r.getNonces();
        return await this.arkProvider.submitTreeNonces(s.id, h, p), { skip: !1 };
      },
      onTreeNonces: async (s) => {
        if (!r)
          return { fullySigned: !0 };
        const { hasAllNonces: o } = await r.aggregatedNonces(s.txid, s.nonces);
        if (!o)
          return { fullySigned: !1 };
        const a = await r.sign(), c = x.encode(await r.getPublicKey());
        return await this.arkProvider.submitTreeSignatures(s.id, c, a), { fullySigned: !0 };
      },
      onBatchFinalization: async (s, o, a) => {
        if (!this.forfeitOutputScript)
          throw new Error("Forfeit output script not set");
        a && pp(s.commitmentTx, a), await this.handleSettlementFinalizationEvent(s, n, this.forfeitOutputScript, a);
      }
    };
  }
  async safeRegisterIntent(t) {
    try {
      return await this.arkProvider.registerIntent(t);
    } catch (n) {
      if (n instanceof dp && n.code === 0 && n.message.includes("duplicated input")) {
        const r = await this.getVtxos({
          withRecoverable: !0
        }), i = await this.makeDeleteIntentSignature(r);
        return await this.arkProvider.deleteIntent(i), this.arkProvider.registerIntent(t);
      }
      throw n;
    }
  }
  async makeRegisterIntentSignature(t, n, r, i) {
    const s = this.prepareIntentProofInputs(t), o = {
      type: "register",
      onchain_output_indexes: r,
      valid_at: 0,
      expire_at: 0,
      cosigners_public_keys: i
    }, a = Fe.create(o, s, n), c = await this.identity.sign(a);
    return {
      proof: G.encode(c.toPSBT()),
      message: o
    };
  }
  async makeDeleteIntentSignature(t) {
    const n = this.prepareIntentProofInputs(t), r = {
      type: "delete",
      expire_at: 0
    }, i = Fe.create(r, n, []), s = await this.identity.sign(i);
    return {
      proof: G.encode(s.toPSBT()),
      message: r
    };
  }
  async makeGetPendingTxIntentSignature(t) {
    const n = this.prepareIntentProofInputs(t), r = {
      type: "get-pending-tx",
      expire_at: 0
    }, i = Fe.create(r, n, []), s = await this.identity.sign(i);
    return {
      proof: G.encode(s.toPSBT()),
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
      const s = [x.encode(this.offchainTapscript.pkScript)];
      let { vtxos: o } = await this.indexerProvider.getVtxos({
        scripts: s
      });
      if (o = o.filter((a) => a.virtualStatus.state !== "swept" && a.virtualStatus.state !== "settled"), o.length === 0)
        return { finalized: [], pending: [] };
      t = o.map((a) => pr(this, a));
    }
    const r = [], i = [];
    for (let s = 0; s < t.length; s += 20) {
      const o = t.slice(s, s + 20), a = await this.makeGetPendingTxIntentSignature(o), c = await this.arkProvider.getPendingTxs(a);
      for (const u of c) {
        i.push(u.arkTxid);
        try {
          const l = await Promise.all(u.signedCheckpointTxs.map(async (d) => {
            const h = rt.fromPSBT(G.decode(d)), p = await this.identity.sign(h);
            return G.encode(p.toPSBT());
          }));
          await this.arkProvider.finalizeTx(u.arkTxid, l), r.push(u.arkTxid);
        } catch (l) {
          console.error(`Failed to finalize transaction ${u.arkTxid}:`, l);
        }
      }
    }
    return { finalized: r, pending: i };
  }
  prepareIntentProofInputs(t) {
    const n = [];
    for (const r of t) {
      const i = re.decode(r.tapTree), s = du(r.intentTapLeafScript), o = [tu.encode(r.tapTree)];
      r.extraWitness && o.push(ap.encode(r.extraWitness)), n.push({
        txid: x.decode(r.txid),
        index: r.vout,
        witnessUtxo: {
          amount: BigInt(r.value),
          script: i.pkScript
        },
        sequence: s,
        tapLeafScript: [r.intentTapLeafScript],
        unknown: o
      });
    }
    return n;
  }
};
ic.MIN_FEE_RATE = 1;
function du(e) {
  let t;
  try {
    const n = e[1], r = n.subarray(0, n.length - 1);
    try {
      const i = kt.decode(r).params;
      t = ve.encode(i.timelock.type === "blocks" ? { blocks: Number(i.timelock.value) } : { seconds: Number(i.timelock.value) });
    } catch {
      const i = Dr.decode(r).params;
      t = Number(i.absoluteTimelock);
    }
  } catch {
  }
  return t;
}
function av(e) {
  try {
    return Sn.decode(e), !0;
  } catch {
    return !1;
  }
}
function cv(e, t) {
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
const wa = (e) => e < 253 ? 1 : e <= 65535 ? 3 : e <= 4294967295 ? 5 : 9;
let Se = class Rt {
  constructor(t, n, r, i, s, o) {
    this.hasWitness = t, this.inputCount = n, this.outputCount = r, this.inputSize = i, this.inputWitnessSize = s, this.outputSize = o;
  }
  static create() {
    return new Rt(!1, 0, 0, 0, 0, 0);
  }
  addP2AInput() {
    return this.inputCount++, this.inputSize += Rt.INPUT_SIZE, this;
  }
  addKeySpendInput(t = !0) {
    return this.inputCount++, this.inputWitnessSize += 65 + (t ? 0 : 1), this.inputSize += Rt.INPUT_SIZE, this.hasWitness = !0, this;
  }
  addP2PKHInput() {
    return this.inputCount++, this.inputWitnessSize++, this.inputSize += Rt.INPUT_SIZE + Rt.P2PKH_SCRIPT_SIG_SIZE, this;
  }
  addTapscriptInput(t, n, r) {
    const i = 1 + Rt.BASE_CONTROL_BLOCK_SIZE + 1 + n + 1 + r;
    return this.inputCount++, this.inputWitnessSize += t + 1 + i, this.inputSize += Rt.INPUT_SIZE, this.hasWitness = !0, this;
  }
  addP2WPKHOutput() {
    return this.outputCount++, this.outputSize += Rt.OUTPUT_SIZE + Rt.P2WPKH_OUTPUT_SIZE, this;
  }
  addP2TROutput() {
    return this.outputCount++, this.outputSize += Rt.OUTPUT_SIZE + Rt.P2TR_OUTPUT_SIZE, this;
  }
  /**
   * Adds an output given a raw script.
   * Cost = 8 bytes (amount) + varint(scriptLen) + scriptLen
   */
  addOutputScript(t) {
    return this.outputCount++, this.outputSize += 8 + wa(t.length) + t.length, this;
  }
  /**
   * Adds an output by decoding the address to get the exact script size.
   */
  addOutputAddress(t, n) {
    const r = Yt(n).decode(t), i = dt.encode(r);
    return this.addOutputScript(i);
  }
  vsize() {
    const t = wa(this.inputCount), n = wa(this.outputCount);
    let i = (Rt.BASE_TX_SIZE + t + this.inputSize + n + this.outputSize) * Rt.WITNESS_SCALE_FACTOR;
    return this.hasWitness && (i += Rt.WITNESS_HEADER_SIZE + this.inputWitnessSize), uv(i);
  }
};
Se.P2PKH_SCRIPT_SIG_SIZE = 108;
Se.INPUT_SIZE = 41;
Se.BASE_CONTROL_BLOCK_SIZE = 33;
Se.OUTPUT_SIZE = 9;
Se.P2WPKH_OUTPUT_SIZE = 22;
Se.BASE_TX_SIZE = 10;
Se.WITNESS_HEADER_SIZE = 2;
Se.WITNESS_SCALE_FACTOR = 4;
Se.P2TR_OUTPUT_SIZE = 34;
const uv = (e) => {
  const t = BigInt(Math.ceil(e / Se.WITNESS_SCALE_FACTOR));
  return {
    value: t,
    fee: (n) => n * t
  };
};
var hd;
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
        if (!(l.type === Er.COMMITMENT || l.type === Er.UNSPECIFIED))
          try {
            if (!(await this.explorer.getTxStatus(l.txid)).confirmed)
              return {
                type: t.WAIT,
                txid: l.txid,
                do: fv(this.explorer, l.txid)
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
      const c = ne.fromPSBT(G.decode(a.txs[0]));
      if (s.type === Er.TREE) {
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
        do: dv(this.bumper, this.explorer, c)
      };
    }
    /**
     * Iterate over the steps to be executed and execute them
     * @returns An async iterator over the executed steps
     */
    async *[Symbol.asyncIterator]() {
      let s;
      do {
        s !== void 0 && await lv(1e3);
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
    const d = Se.create();
    for (const E of c) {
      if (!E.isUnrolled)
        throw new Error(`Vtxo ${E.txid}:${E.vout} is not fully unrolled, use unroll first`);
      const I = await i.onchainProvider.getTxStatus(E.txid);
      if (!I.confirmed)
        throw new Error(`tx ${E.txid} is not confirmed`);
      const O = hv({ height: I.blockHeight, time: I.blockTime }, a, E);
      if (!O)
        throw new Error(`no available exit path found for vtxo ${E.txid}:${E.vout}`);
      const B = re.decode(E.tapTree).findLeaf(x.encode(O.script));
      if (!B)
        throw new Error(`spending leaf not found for vtxo ${E.txid}:${E.vout}`);
      l += BigInt(E.value), u.push({
        txid: E.txid,
        index: E.vout,
        tapLeafScript: [B],
        sequence: 4294967294,
        witnessUtxo: {
          amount: BigInt(E.value),
          script: re.decode(E.tapTree).pkScript
        },
        sighashType: It.DEFAULT
      }), d.addTapscriptInput(64, B[1].length, Wt.encode(B[0]).length);
    }
    const h = new ne({ version: 2 });
    for (const E of u)
      h.addInput(E);
    d.addOutputAddress(o, i.network);
    let p = await i.onchainProvider.getFeeRate();
    (!p || p < ic.MIN_FEE_RATE) && (p = ic.MIN_FEE_RATE);
    const w = d.vsize().fee(BigInt(p));
    if (w > l)
      throw new Error("fee amount is greater than the total amount");
    const f = l - w;
    if (f < BigInt(zb))
      throw new Error("send amount is less than dust amount");
    h.addOutputAddress(o, f);
    const y = await i.identity.sign(h);
    return y.finalize(), await i.onchainProvider.broadcastTransaction(y.hex), y.id;
  }
  e.completeUnroll = r;
})(hd || (hd = {}));
function lv(e) {
  return new Promise((t) => setTimeout(t, e));
}
function dv(e, t, n) {
  return async () => {
    const [r, i] = await e.bumpP2A(n);
    await t.broadcastTransaction(r, i);
  };
}
function fv(e, t) {
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
function hv(e, t, n) {
  const r = re.decode(n.tapTree).exitPaths();
  for (const i of r)
    if (i.params.timelock.type === "blocks") {
      if (t.height >= e.height + Number(i.params.timelock.value))
        return i;
    } else if (t.time >= e.time + Number(i.params.timelock.value))
      return i;
}
var ya = {}, pd;
function pv() {
  return pd || (pd = 1, (function(e) {
    /*! scure-base - MIT License (c) 2022 Paul Miller (paulmillr.com) */
    Object.defineProperty(e, "__esModule", { value: !0 }), e.bytes = e.stringToBytes = e.str = e.bytesToString = e.hex = e.utf8 = e.bech32m = e.bech32 = e.base58check = e.base58xmr = e.base58xrp = e.base58flickr = e.base58 = e.base64url = e.base64 = e.base32crockford = e.base32hex = e.base32 = e.base16 = e.utils = e.assertNumber = void 0;
    function t(A) {
      if (!Number.isSafeInteger(A))
        throw new Error(`Wrong integer: ${A}`);
    }
    e.assertNumber = t;
    function n(...A) {
      const S = (b, T) => (k) => b(T(k)), m = Array.from(A).reverse().reduce((b, T) => b ? S(b, T.encode) : T.encode, void 0), v = A.reduce((b, T) => b ? S(b, T.decode) : T.decode, void 0);
      return { encode: m, decode: v };
    }
    function r(A) {
      return {
        encode: (S) => {
          if (!Array.isArray(S) || S.length && typeof S[0] != "number")
            throw new Error("alphabet.encode input should be an array of numbers");
          return S.map((m) => {
            if (t(m), m < 0 || m >= A.length)
              throw new Error(`Digit index outside alphabet: ${m} (alphabet: ${A.length})`);
            return A[m];
          });
        },
        decode: (S) => {
          if (!Array.isArray(S) || S.length && typeof S[0] != "string")
            throw new Error("alphabet.decode input should be array of strings");
          return S.map((m) => {
            if (typeof m != "string")
              throw new Error(`alphabet.decode: not string element=${m}`);
            const v = A.indexOf(m);
            if (v === -1)
              throw new Error(`Unknown letter: "${m}". Allowed: ${A}`);
            return v;
          });
        }
      };
    }
    function i(A = "") {
      if (typeof A != "string")
        throw new Error("join separator should be string");
      return {
        encode: (S) => {
          if (!Array.isArray(S) || S.length && typeof S[0] != "string")
            throw new Error("join.encode input should be array of strings");
          for (let m of S)
            if (typeof m != "string")
              throw new Error(`join.encode: non-string input=${m}`);
          return S.join(A);
        },
        decode: (S) => {
          if (typeof S != "string")
            throw new Error("join.decode input should be string");
          return S.split(A);
        }
      };
    }
    function s(A, S = "=") {
      if (t(A), typeof S != "string")
        throw new Error("padding chr should be string");
      return {
        encode(m) {
          if (!Array.isArray(m) || m.length && typeof m[0] != "string")
            throw new Error("padding.encode input should be array of strings");
          for (let v of m)
            if (typeof v != "string")
              throw new Error(`padding.encode: non-string input=${v}`);
          for (; m.length * A % 8; )
            m.push(S);
          return m;
        },
        decode(m) {
          if (!Array.isArray(m) || m.length && typeof m[0] != "string")
            throw new Error("padding.encode input should be array of strings");
          for (let b of m)
            if (typeof b != "string")
              throw new Error(`padding.decode: non-string input=${b}`);
          let v = m.length;
          if (v * A % 8)
            throw new Error("Invalid padding: string should have whole number of bytes");
          for (; v > 0 && m[v - 1] === S; v--)
            if (!((v - 1) * A % 8))
              throw new Error("Invalid padding: string has too much padding");
          return m.slice(0, v);
        }
      };
    }
    function o(A) {
      if (typeof A != "function")
        throw new Error("normalize fn should be function");
      return { encode: (S) => S, decode: (S) => A(S) };
    }
    function a(A, S, m) {
      if (S < 2)
        throw new Error(`convertRadix: wrong from=${S}, base cannot be less than 2`);
      if (m < 2)
        throw new Error(`convertRadix: wrong to=${m}, base cannot be less than 2`);
      if (!Array.isArray(A))
        throw new Error("convertRadix: data should be array");
      if (!A.length)
        return [];
      let v = 0;
      const b = [], T = Array.from(A);
      for (T.forEach((k) => {
        if (t(k), k < 0 || k >= S)
          throw new Error(`Wrong integer: ${k}`);
      }); ; ) {
        let k = 0, P = !0;
        for (let C = v; C < T.length; C++) {
          const $ = T[C], R = S * k + $;
          if (!Number.isSafeInteger(R) || S * k / S !== k || R - $ !== S * k)
            throw new Error("convertRadix: carry overflow");
          if (k = R % m, T[C] = Math.floor(R / m), !Number.isSafeInteger(T[C]) || T[C] * m + k !== R)
            throw new Error("convertRadix: carry overflow");
          if (P)
            T[C] ? P = !1 : v = C;
          else continue;
        }
        if (b.push(k), P)
          break;
      }
      for (let k = 0; k < A.length - 1 && A[k] === 0; k++)
        b.push(0);
      return b.reverse();
    }
    const c = (A, S) => S ? c(S, A % S) : A, u = (A, S) => A + (S - c(A, S));
    function l(A, S, m, v) {
      if (!Array.isArray(A))
        throw new Error("convertRadix2: data should be array");
      if (S <= 0 || S > 32)
        throw new Error(`convertRadix2: wrong from=${S}`);
      if (m <= 0 || m > 32)
        throw new Error(`convertRadix2: wrong to=${m}`);
      if (u(S, m) > 32)
        throw new Error(`convertRadix2: carry overflow from=${S} to=${m} carryBits=${u(S, m)}`);
      let b = 0, T = 0;
      const k = 2 ** m - 1, P = [];
      for (const C of A) {
        if (t(C), C >= 2 ** S)
          throw new Error(`convertRadix2: invalid data word=${C} from=${S}`);
        if (b = b << S | C, T + S > 32)
          throw new Error(`convertRadix2: carry overflow pos=${T} from=${S}`);
        for (T += S; T >= m; T -= m)
          P.push((b >> T - m & k) >>> 0);
        b &= 2 ** T - 1;
      }
      if (b = b << m - T & k, !v && T >= S)
        throw new Error("Excess padding");
      if (!v && b)
        throw new Error(`Non-zero padding: ${b}`);
      return v && T > 0 && P.push(b >>> 0), P;
    }
    function d(A) {
      return t(A), {
        encode: (S) => {
          if (!(S instanceof Uint8Array))
            throw new Error("radix.encode input should be Uint8Array");
          return a(Array.from(S), 2 ** 8, A);
        },
        decode: (S) => {
          if (!Array.isArray(S) || S.length && typeof S[0] != "number")
            throw new Error("radix.decode input should be array of strings");
          return Uint8Array.from(a(S, A, 2 ** 8));
        }
      };
    }
    function h(A, S = !1) {
      if (t(A), A <= 0 || A > 32)
        throw new Error("radix2: bits should be in (0..32]");
      if (u(8, A) > 32 || u(A, 8) > 32)
        throw new Error("radix2: carry overflow");
      return {
        encode: (m) => {
          if (!(m instanceof Uint8Array))
            throw new Error("radix2.encode input should be Uint8Array");
          return l(Array.from(m), 8, A, !S);
        },
        decode: (m) => {
          if (!Array.isArray(m) || m.length && typeof m[0] != "number")
            throw new Error("radix2.decode input should be array of strings");
          return Uint8Array.from(l(m, A, 8, S));
        }
      };
    }
    function p(A) {
      if (typeof A != "function")
        throw new Error("unsafeWrapper fn should be function");
      return function(...S) {
        try {
          return A.apply(null, S);
        } catch {
        }
      };
    }
    function w(A, S) {
      if (t(A), typeof S != "function")
        throw new Error("checksum fn should be function");
      return {
        encode(m) {
          if (!(m instanceof Uint8Array))
            throw new Error("checksum.encode: input should be Uint8Array");
          const v = S(m).slice(0, A), b = new Uint8Array(m.length + A);
          return b.set(m), b.set(v, m.length), b;
        },
        decode(m) {
          if (!(m instanceof Uint8Array))
            throw new Error("checksum.decode: input should be Uint8Array");
          const v = m.slice(0, -A), b = S(v).slice(0, A), T = m.slice(-A);
          for (let k = 0; k < A; k++)
            if (b[k] !== T[k])
              throw new Error("Invalid checksum");
          return v;
        }
      };
    }
    e.utils = { alphabet: r, chain: n, checksum: w, radix: d, radix2: h, join: i, padding: s }, e.base16 = n(h(4), r("0123456789ABCDEF"), i("")), e.base32 = n(h(5), r("ABCDEFGHIJKLMNOPQRSTUVWXYZ234567"), s(5), i("")), e.base32hex = n(h(5), r("0123456789ABCDEFGHIJKLMNOPQRSTUV"), s(5), i("")), e.base32crockford = n(h(5), r("0123456789ABCDEFGHJKMNPQRSTVWXYZ"), i(""), o((A) => A.toUpperCase().replace(/O/g, "0").replace(/[IL]/g, "1"))), e.base64 = n(h(6), r("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"), s(6), i("")), e.base64url = n(h(6), r("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_"), s(6), i(""));
    const f = (A) => n(d(58), r(A), i(""));
    e.base58 = f("123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"), e.base58flickr = f("123456789abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ"), e.base58xrp = f("rpshnaf39wBUDNEGHJKLM4PQRST7VWXYZ2bcdeCg65jkm8oFqi1tuvAxyz");
    const y = [0, 2, 3, 5, 6, 7, 9, 10, 11];
    e.base58xmr = {
      encode(A) {
        let S = "";
        for (let m = 0; m < A.length; m += 8) {
          const v = A.subarray(m, m + 8);
          S += e.base58.encode(v).padStart(y[v.length], "1");
        }
        return S;
      },
      decode(A) {
        let S = [];
        for (let m = 0; m < A.length; m += 11) {
          const v = A.slice(m, m + 11), b = y.indexOf(v.length), T = e.base58.decode(v);
          for (let k = 0; k < T.length - b; k++)
            if (T[k] !== 0)
              throw new Error("base58xmr: wrong padding");
          S = S.concat(Array.from(T.slice(T.length - b)));
        }
        return Uint8Array.from(S);
      }
    };
    const E = (A) => n(w(4, (S) => A(A(S))), e.base58);
    e.base58check = E;
    const I = n(r("qpzry9x8gf2tvdw0s3jn54khce6mua7l"), i("")), O = [996825010, 642813549, 513874426, 1027748829, 705979059];
    function B(A) {
      const S = A >> 25;
      let m = (A & 33554431) << 5;
      for (let v = 0; v < O.length; v++)
        (S >> v & 1) === 1 && (m ^= O[v]);
      return m;
    }
    function N(A, S, m = 1) {
      const v = A.length;
      let b = 1;
      for (let T = 0; T < v; T++) {
        const k = A.charCodeAt(T);
        if (k < 33 || k > 126)
          throw new Error(`Invalid prefix (${A})`);
        b = B(b) ^ k >> 5;
      }
      b = B(b);
      for (let T = 0; T < v; T++)
        b = B(b) ^ A.charCodeAt(T) & 31;
      for (let T of S)
        b = B(b) ^ T;
      for (let T = 0; T < 6; T++)
        b = B(b);
      return b ^= m, I.encode(l([b % 2 ** 30], 30, 5, !1));
    }
    function V(A) {
      const S = A === "bech32" ? 1 : 734539939, m = h(5), v = m.decode, b = m.encode, T = p(v);
      function k(R, U, z = 90) {
        if (typeof R != "string")
          throw new Error(`bech32.encode prefix should be string, not ${typeof R}`);
        if (!Array.isArray(U) || U.length && typeof U[0] != "number")
          throw new Error(`bech32.encode words should be array of numbers, not ${typeof U}`);
        const H = R.length + 7 + U.length;
        if (z !== !1 && H > z)
          throw new TypeError(`Length ${H} exceeds limit ${z}`);
        return R = R.toLowerCase(), `${R}1${I.encode(U)}${N(R, U, S)}`;
      }
      function P(R, U = 90) {
        if (typeof R != "string")
          throw new Error(`bech32.decode input should be string, not ${typeof R}`);
        if (R.length < 8 || U !== !1 && R.length > U)
          throw new TypeError(`Wrong string length: ${R.length} (${R}). Expected (8..${U})`);
        const z = R.toLowerCase();
        if (R !== z && R !== R.toUpperCase())
          throw new Error("String must be lowercase or uppercase");
        R = z;
        const H = R.lastIndexOf("1");
        if (H === 0 || H === -1)
          throw new Error('Letter "1" must be present between prefix and data only');
        const L = R.slice(0, H), W = R.slice(H + 1);
        if (W.length < 6)
          throw new Error("Data must be at least 6 characters long");
        const Y = I.decode(W).slice(0, -6), nt = N(L, Y, S);
        if (!W.endsWith(nt))
          throw new Error(`Invalid checksum in ${R}: expected "${nt}"`);
        return { prefix: L, words: Y };
      }
      const C = p(P);
      function $(R) {
        const { prefix: U, words: z } = P(R, !1);
        return { prefix: U, words: z, bytes: v(z) };
      }
      return { encode: k, decode: P, decodeToBytes: $, decodeUnsafe: C, fromWords: v, fromWordsUnsafe: T, toWords: b };
    }
    e.bech32 = V("bech32"), e.bech32m = V("bech32m"), e.utf8 = {
      encode: (A) => new TextDecoder().decode(A),
      decode: (A) => new TextEncoder().encode(A)
    }, e.hex = n(h(4), r("0123456789abcdef"), i(""), o((A) => {
      if (typeof A != "string" || A.length % 2)
        throw new TypeError(`hex.decode: expected string, got ${typeof A} with length ${A.length}`);
      return A.toLowerCase();
    }));
    const g = {
      utf8: e.utf8,
      hex: e.hex,
      base16: e.base16,
      base32: e.base32,
      base64: e.base64,
      base64url: e.base64url,
      base58: e.base58,
      base58xmr: e.base58xmr
    }, M = `Invalid encoding type. Available types: ${Object.keys(g).join(", ")}`, _ = (A, S) => {
      if (typeof A != "string" || !g.hasOwnProperty(A))
        throw new TypeError(M);
      if (!(S instanceof Uint8Array))
        throw new TypeError("bytesToString() expects Uint8Array");
      return g[A].encode(S);
    };
    e.bytesToString = _, e.str = e.bytesToString;
    const F = (A, S) => {
      if (!g.hasOwnProperty(A))
        throw new TypeError(M);
      if (typeof S != "string")
        throw new TypeError("stringToBytes() expects string");
      return g[A].decode(S);
    };
    e.stringToBytes = F, e.bytes = e.stringToBytes;
  })(ya)), ya;
}
var ma, gd;
function gv() {
  if (gd) return ma;
  gd = 1;
  const { bech32: e, hex: t, utf8: n } = pv(), r = {
    // default network is bitcoin
    bech32: "bc",
    pubKeyHash: 0,
    scriptHash: 5,
    validWitnessVersions: [0]
  }, i = {
    bech32: "tb",
    pubKeyHash: 111,
    scriptHash: 196,
    validWitnessVersions: [0]
  }, s = {
    bech32: "tbs",
    pubKeyHash: 111,
    scriptHash: 196,
    validWitnessVersions: [0]
  }, o = {
    bech32: "bcrt",
    pubKeyHash: 111,
    scriptHash: 196,
    validWitnessVersions: [0]
  }, a = {
    bech32: "sb",
    pubKeyHash: 63,
    scriptHash: 123,
    validWitnessVersions: [0]
  }, c = [
    "option_data_loss_protect",
    "initial_routing_sync",
    "option_upfront_shutdown_script",
    "gossip_queries",
    "var_onion_optin",
    "gossip_queries_ex",
    "option_static_remotekey",
    "payment_secret",
    "basic_mpp",
    "option_support_large_channel"
  ], u = {
    m: BigInt(1e3),
    u: BigInt(1e6),
    n: BigInt(1e9),
    p: BigInt(1e12)
  }, l = BigInt("2100000000000000000"), d = BigInt(1e11), h = {
    payment_hash: 1,
    payment_secret: 16,
    description: 13,
    payee: 19,
    description_hash: 23,
    // commit to longer descriptions (used by lnurl-pay)
    expiry: 6,
    // default: 3600 (1 hour)
    min_final_cltv_expiry: 24,
    // default: 9
    fallback_address: 9,
    route_hint: 3,
    // for extra routing info (private etc.)
    feature_bits: 5,
    metadata: 27
  }, p = {};
  for (let N = 0, V = Object.keys(h); N < V.length; N++) {
    const g = V[N], M = h[V[N]].toString();
    p[M] = g;
  }
  const w = {
    1: (N) => t.encode(e.fromWordsUnsafe(N)),
    // 256 bits
    16: (N) => t.encode(e.fromWordsUnsafe(N)),
    // 256 bits
    13: (N) => n.encode(e.fromWordsUnsafe(N)),
    // string variable length
    19: (N) => t.encode(e.fromWordsUnsafe(N)),
    // 264 bits
    23: (N) => t.encode(e.fromWordsUnsafe(N)),
    // 256 bits
    27: (N) => t.encode(e.fromWordsUnsafe(N)),
    // variable
    6: y,
    // default: 3600 (1 hour)
    24: y,
    // default: 9
    3: E,
    // for extra routing info (private etc.)
    5: I
    // keep feature bits as array of 5 bit words
  };
  function f(N) {
    return (V) => ({
      tagCode: parseInt(N),
      words: e.encode("unknown", V, Number.MAX_SAFE_INTEGER)
    });
  }
  function y(N) {
    return N.reverse().reduce((V, g, M) => V + g * Math.pow(32, M), 0);
  }
  function E(N) {
    const V = [];
    let g, M, _, F, A, S = e.fromWordsUnsafe(N);
    for (; S.length > 0; )
      g = t.encode(S.slice(0, 33)), M = t.encode(S.slice(33, 41)), _ = parseInt(t.encode(S.slice(41, 45)), 16), F = parseInt(
        t.encode(S.slice(45, 49)),
        16
      ), A = parseInt(t.encode(S.slice(49, 51)), 16), S = S.slice(51), V.push({
        pubkey: g,
        short_channel_id: M,
        fee_base_msat: _,
        fee_proportional_millionths: F,
        cltv_expiry_delta: A
      });
    return V;
  }
  function I(N) {
    const V = N.slice().reverse().map((_) => [
      !!(_ & 1),
      !!(_ & 2),
      !!(_ & 4),
      !!(_ & 8),
      !!(_ & 16)
    ]).reduce((_, F) => _.concat(F), []);
    for (; V.length < c.length * 2; )
      V.push(!1);
    const g = {};
    c.forEach((_, F) => {
      let A;
      V[F * 2] ? A = "required" : V[F * 2 + 1] ? A = "supported" : A = "unsupported", g[_] = A;
    });
    const M = V.slice(c.length * 2);
    return g.extra_bits = {
      start_bit: c.length * 2,
      bits: M,
      has_required: M.reduce(
        (_, F, A) => A % 2 !== 0 ? _ || !1 : _ || F,
        !1
      )
    }, g;
  }
  function O(N, V) {
    let g, M;
    if (N.slice(-1).match(/^[munp]$/))
      g = N.slice(-1), M = N.slice(0, -1);
    else {
      if (N.slice(-1).match(/^[^munp0-9]$/))
        throw new Error("Not a valid multiplier for the amount");
      M = N;
    }
    if (!M.match(/^\d+$/))
      throw new Error("Not a valid human readable amount");
    const _ = BigInt(M), F = g ? _ * d / u[g] : _ * d;
    if (g === "p" && _ % BigInt(10) !== BigInt(0) || F > l)
      throw new Error("Amount is outside of valid range");
    return V ? F.toString() : F;
  }
  function B(N, V) {
    if (typeof N != "string")
      throw new Error("Lightning Payment Request must be string");
    if (N.slice(0, 2).toLowerCase() !== "ln")
      throw new Error("Not a proper lightning payment request");
    const g = [], M = e.decode(N, Number.MAX_SAFE_INTEGER);
    N = N.toLowerCase();
    const _ = M.prefix;
    let F = M.words, A = N.slice(_.length + 1), S = F.slice(-104);
    F = F.slice(0, -104);
    let m = _.match(/^ln(\S+?)(\d*)([a-zA-Z]?)$/);
    if (m && !m[2] && (m = _.match(/^ln(\S+)$/)), !m)
      throw new Error("Not a proper lightning payment request");
    g.push({
      name: "lightning_network",
      letters: "ln"
    });
    const v = m[1];
    let b;
    if (V) {
      if (V.bech32 === void 0 || V.pubKeyHash === void 0 || V.scriptHash === void 0 || !Array.isArray(V.validWitnessVersions))
        throw new Error("Invalid network");
      b = V;
    } else
      switch (v) {
        case r.bech32:
          b = r;
          break;
        case i.bech32:
          b = i;
          break;
        case s.bech32:
          b = s;
          break;
        case o.bech32:
          b = o;
          break;
        case a.bech32:
          b = a;
          break;
      }
    if (!b || b.bech32 !== v)
      throw new Error("Unknown coin bech32 prefix");
    g.push({
      name: "coin_network",
      letters: v,
      value: b
    });
    const T = m[2];
    let k;
    if (T) {
      const L = m[3];
      k = O(T + L, !0), g.push({
        name: "amount",
        letters: m[2] + m[3],
        value: k
      });
    } else
      k = null;
    g.push({
      name: "separator",
      letters: "1"
    });
    const P = y(F.slice(0, 7));
    F = F.slice(7), g.push({
      name: "timestamp",
      letters: A.slice(0, 7),
      value: P
    }), A = A.slice(7);
    let C, $, R, U;
    for (; F.length > 0; ) {
      const L = F[0].toString();
      C = p[L] || "unknown_tag", $ = w[L] || f(L), F = F.slice(1), R = y(F.slice(0, 2)), F = F.slice(2), U = F.slice(0, R), F = F.slice(R), g.push({
        name: C,
        tag: A[0],
        letters: A.slice(0, 3 + R),
        value: $(U)
        // see: parsers for more comments
      }), A = A.slice(3 + R);
    }
    g.push({
      name: "signature",
      letters: A.slice(0, 104),
      value: t.encode(e.fromWordsUnsafe(S))
    }), A = A.slice(104), g.push({
      name: "checksum",
      letters: A
    });
    let z = {
      paymentRequest: N,
      sections: g,
      get expiry() {
        let L = g.find((W) => W.name === "expiry");
        if (L) return H("timestamp") + L.value;
      },
      get route_hints() {
        return g.filter((L) => L.name === "route_hint").map((L) => L.value);
      }
    };
    for (let L in h)
      L !== "route_hint" && Object.defineProperty(z, L, {
        get() {
          return H(L);
        }
      });
    return z;
    function H(L) {
      let W = g.find((Y) => Y.name === L);
      return W ? W.value : void 0;
    }
  }
  return ma = {
    decode: B,
    hrpToMillisat: O
  }, ma;
}
var wv = gv();
const yv = /* @__PURE__ */ sp(wv);
var At = class extends Error {
  isClaimable;
  isRefundable;
  pendingSwap;
  constructor(e = {}) {
    super(e.message ?? "Error during swap."), this.name = "SwapError", this.isClaimable = e.isClaimable ?? !1, this.isRefundable = e.isRefundable ?? !1, this.pendingSwap = e.pendingSwap;
  }
}, mv = class extends At {
  constructor(e) {
    super({ message: "The invoice has expired.", ...e }), this.name = "InvoiceExpiredError";
  }
}, bv = class extends At {
  constructor(e) {
    super({
      message: "The provider failed to pay the invoice",
      ...e
    }), this.name = "InvoiceFailedToPayError";
  }
}, Vn = class extends Error {
  statusCode;
  errorData;
  constructor(e, t, n) {
    super(e), this.name = "NetworkError", this.statusCode = t, this.errorData = n;
  }
}, Re = class extends At {
  constructor(e = {}) {
    super({ message: "Invalid API response", ...e }), this.name = "SchemaError";
  }
}, wd = class extends At {
  constructor(e) {
    super({ message: "The swap has expired", ...e }), this.name = "SwapExpiredError";
  }
}, yd = class extends At {
  constructor(e = {}) {
    super({ message: "The transaction has failed.", ...e }), this.name = "TransactionFailedError";
  }
}, xv = class extends At {
  constructor(e = {}) {
    super({ message: "The transaction lockup has failed.", ...e }), this.name = "TransactionLockupFailedError";
  }
}, vv = class extends At {
  constructor(e = {}) {
    super({ message: "The transaction has been refunded.", ...e }), this.name = "TransactionRefundedError";
  }
}, fu = (e) => [
  "invoice.failedToPay",
  "transaction.claimed",
  "swap.expired"
].includes(e), hu = (e) => [
  "transaction.refunded",
  "transaction.failed",
  "invoice.settled",
  // normal status for completed swaps
  "swap.expired"
].includes(e), md = (e) => ["transaction.mempool", "transaction.confirmed"].includes(e), Fn = (e) => e.type === "reverse", ui = (e) => e.type === "submarine", bd = (e) => [
  "invoice.failedToPay",
  "transaction.lockupFailed",
  "swap.expired"
].includes(e), Ev = (e) => e && typeof e == "object" && typeof e.id == "string" && typeof e.hex == "string" && typeof e.timeoutBlockHeight == "number", Tv = (e) => e && typeof e == "object" && typeof e.status == "string" && (e.zeroConfRejected === void 0 || typeof e.zeroConfRejected == "boolean") && (e.transaction === void 0 || e.transaction && typeof e.transaction == "object" && typeof e.transaction.id == "string" && (e.transaction.eta === void 0 || typeof e.transaction.eta == "number") && (e.transaction.hex === void 0 || typeof e.transaction.hex == "string") && (e.transaction.preimage === void 0 || typeof e.transaction.preimage == "string")), xd = (e) => e && typeof e == "object" && e.ARK && typeof e.ARK == "object" && e.ARK.BTC && typeof e.ARK.BTC == "object" && typeof e.ARK.BTC.hash == "string" && typeof e.ARK.BTC.rate == "number" && e.ARK.BTC.limits && typeof e.ARK.BTC.limits == "object" && typeof e.ARK.BTC.limits.maximal == "number" && typeof e.ARK.BTC.limits.minimal == "number" && typeof e.ARK.BTC.limits.maximalZeroConf == "number" && e.ARK.BTC.fees && typeof e.ARK.BTC.fees == "object" && typeof e.ARK.BTC.fees.percentage == "number" && typeof e.ARK.BTC.fees.minerFees == "number", Sv = (e) => e && typeof e == "object" && e.BTC && typeof e.BTC == "object" && e.BTC.ARK && typeof e.BTC.ARK == "object" && e.BTC.ARK.hash && typeof e.BTC.ARK.hash == "string" && typeof e.BTC.ARK.rate == "number" && e.BTC.ARK.limits && typeof e.BTC.ARK.limits == "object" && typeof e.BTC.ARK.limits.maximal == "number" && typeof e.BTC.ARK.limits.minimal == "number" && e.BTC.ARK.fees && typeof e.BTC.ARK.fees == "object" && typeof e.BTC.ARK.fees.percentage == "number" && typeof e.BTC.ARK.fees.minerFees == "object" && typeof e.BTC.ARK.fees.minerFees.claim == "number" && typeof e.BTC.ARK.fees.minerFees.lockup == "number", kv = (e) => e && typeof e == "object" && typeof e.id == "string" && typeof e.address == "string" && typeof e.expectedAmount == "number" && typeof e.claimPublicKey == "string" && typeof e.acceptZeroConf == "boolean" && e.timeoutBlockHeights && typeof e.timeoutBlockHeights == "object" && typeof e.timeoutBlockHeights.unilateralClaim == "number" && typeof e.timeoutBlockHeights.unilateralRefund == "number" && typeof e.timeoutBlockHeights.unilateralRefundWithoutReceiver == "number", Iv = (e) => e && typeof e == "object" && typeof e.preimage == "string", Av = (e) => e && typeof e == "object" && typeof e.id == "string" && typeof e.invoice == "string" && typeof e.onchainAmount == "number" && typeof e.lockupAddress == "string" && typeof e.refundPublicKey == "string" && e.timeoutBlockHeights && typeof e.timeoutBlockHeights == "object" && typeof e.timeoutBlockHeights.refund == "number" && typeof e.timeoutBlockHeights.unilateralClaim == "number" && typeof e.timeoutBlockHeights.unilateralRefund == "number" && typeof e.timeoutBlockHeights.unilateralRefundWithoutReceiver == "number", Rv = (e) => e && typeof e == "object" && typeof e.transaction == "string" && typeof e.checkpoint == "string", dr = (e) => e && typeof e == "object" && typeof e.version == "number" && typeof e.output == "string", $v = (e) => e && typeof e == "object" && dr(e.claimLeaf) && dr(e.refundLeaf) && dr(e.refundWithoutBoltzLeaf) && dr(e.unilateralClaimLeaf) && dr(e.unilateralRefundLeaf) && dr(e.unilateralRefundWithoutBoltzLeaf), Bp = (e) => e && typeof e == "object" && $v(e.tree) && (e.amount === void 0 || typeof e.amount == "number") && typeof e.keyIndex == "number" && (e.transaction === void 0 || e.transaction && typeof e.transaction == "object" && typeof e.transaction.id == "string" && typeof e.transaction.vout == "number") && typeof e.lockupAddress == "string" && typeof e.serverPublicKey == "string" && typeof e.timeoutBlockHeight == "number" && (e.preimageHash === void 0 || typeof e.preimageHash == "string"), Np = (e) => e && typeof e == "object" && e.to === "BTC" && typeof e.id == "string" && e.from === "ARK" && e.type === "submarine" && typeof e.createdAt == "number" && typeof e.preimageHash == "string" && typeof e.status == "string" && Bp(e.refundDetails), _p = (e) => e && typeof e == "object" && e.to === "ARK" && typeof e.id == "string" && e.from === "BTC" && e.type === "reverse" && typeof e.createdAt == "number" && typeof e.preimageHash == "string" && typeof e.status == "string" && Bp(e.claimDetails), Ov = (e) => Array.isArray(e) && e.every(
  (t) => _p(t) || Np(t)
), Cv = {
  mutinynet: "https://api.boltz.mutinynet.arkade.sh",
  regtest: "http://localhost:9069"
}, Up = class {
  wsUrl;
  apiUrl;
  network;
  referralId;
  constructor(e) {
    this.network = e.network;
    const t = e.apiUrl || Cv[e.network];
    if (!t)
      throw new Error(
        `API URL is required for network: ${e.network}`
      );
    this.apiUrl = t, this.wsUrl = this.apiUrl.replace(/^http(s)?:\/\//, "ws$1://").replace("9069", "9004") + "/v2/ws";
  }
  getApiUrl() {
    return this.apiUrl;
  }
  getWsUrl() {
    return this.wsUrl;
  }
  getNetwork() {
    return this.network;
  }
  async getFees() {
    const [e, t] = await Promise.all([
      this.request(
        "/v2/swap/submarine",
        "GET"
      ),
      this.request("/v2/swap/reverse", "GET")
    ]);
    if (!xd(e))
      throw new Re({ message: "error fetching submarine fees" });
    if (!Sv(t))
      throw new Re({ message: "error fetching reverse fees" });
    return {
      submarine: {
        percentage: e.ARK.BTC.fees.percentage,
        minerFees: e.ARK.BTC.fees.minerFees
      },
      reverse: {
        percentage: t.BTC.ARK.fees.percentage,
        minerFees: t.BTC.ARK.fees.minerFees
      }
    };
  }
  async getLimits() {
    const e = await this.request(
      "/v2/swap/submarine",
      "GET"
    );
    if (!xd(e))
      throw new Re({ message: "error fetching limits" });
    return {
      min: e.ARK.BTC.limits.minimal,
      max: e.ARK.BTC.limits.maximal
    };
  }
  async getReverseSwapTxId(e) {
    const t = await this.request(
      `/v2/swap/reverse/${e}/transaction`,
      "GET"
    );
    if (!Ev(t))
      throw new Re({
        message: `error fetching txid for swap: ${e}`
      });
    return t;
  }
  async getSwapStatus(e) {
    const t = await this.request(
      `/v2/swap/${e}`,
      "GET"
    );
    if (!Tv(t))
      throw new Re({
        message: `error fetching status for swap: ${e}`
      });
    return t;
  }
  async getSwapPreimage(e) {
    const t = await this.request(
      `/v2/swap/submarine/${e}/preimage`,
      "GET"
    );
    if (!Iv(t))
      throw new Re({
        message: `error fetching preimage for swap: ${e}`
      });
    return t;
  }
  async createSubmarineSwap({
    invoice: e,
    refundPublicKey: t
  }) {
    if (t.length != 66)
      throw new At({
        message: "refundPublicKey must be a compressed public key"
      });
    const n = {
      from: "ARK",
      to: "BTC",
      invoice: e,
      refundPublicKey: t,
      ...this.referralId ? { referralId: this.referralId } : {}
    }, r = await this.request(
      "/v2/swap/submarine",
      "POST",
      n
    );
    if (!kv(r))
      throw new Re({ message: "Error creating submarine swap" });
    return r;
  }
  async createReverseSwap({
    invoiceAmount: e,
    claimPublicKey: t,
    preimageHash: n,
    description: r
  }) {
    if (t.length != 66)
      throw new At({
        message: "claimPublicKey must be a compressed public key"
      });
    const i = {
      from: "BTC",
      to: "ARK",
      invoiceAmount: e,
      claimPublicKey: t,
      preimageHash: n,
      ...r?.trim() ? { description: r.trim() } : {},
      ...this.referralId ? { referralId: this.referralId } : {}
    }, s = await this.request(
      "/v2/swap/reverse",
      "POST",
      i
    );
    if (!Av(s))
      throw new Re({ message: "Error creating reverse swap" });
    return s;
  }
  async refundSubmarineSwap(e, t, n) {
    const r = {
      checkpoint: G.encode(n.toPSBT()),
      transaction: G.encode(t.toPSBT())
    }, i = await this.request(
      `/v2/swap/submarine/${e}/refund/ark`,
      "POST",
      r
    );
    if (!Rv(i))
      throw new Re({
        message: "Error refunding submarine swap"
      });
    return {
      transaction: ne.fromPSBT(
        G.decode(i.transaction)
      ),
      checkpoint: ne.fromPSBT(
        G.decode(i.checkpoint)
      )
    };
  }
  async monitorSwap(e, t) {
    return new Promise((n, r) => {
      const i = new globalThis.WebSocket(this.wsUrl), s = setTimeout(() => {
        i.close(), r(new Vn("WebSocket connection timeout"));
      }, 3e4);
      i.onerror = (o) => {
        clearTimeout(s), r(
          new Vn(
            `WebSocket error: ${o.message}`
          )
        );
      }, i.onopen = () => {
        clearTimeout(s), i.send(
          JSON.stringify({
            op: "subscribe",
            channel: "swap.update",
            args: [e]
          })
        );
      }, i.onclose = () => {
        clearTimeout(s), n();
      }, i.onmessage = async (o) => {
        const a = JSON.parse(o.data);
        if (a.event !== "update" || a.args[0].id !== e) return;
        a.args[0].error && (i.close(), r(new At({ message: a.args[0].error })));
        const c = a.args[0].status;
        switch (c) {
          case "invoice.settled":
          case "transaction.claimed":
          case "transaction.refunded":
          case "invoice.expired":
          case "invoice.failedToPay":
          case "transaction.failed":
          case "transaction.lockupFailed":
          case "swap.expired":
            i.close(), t(c);
            break;
          case "invoice.paid":
          case "invoice.pending":
          case "invoice.set":
          case "swap.created":
          case "transaction.claim.pending":
          case "transaction.confirmed":
          case "transaction.mempool":
            t(c);
        }
      };
    });
  }
  async restoreSwaps(e) {
    const t = {
      publicKey: e
    }, n = await this.request(
      "/v2/swap/restore",
      "POST",
      t
    );
    if (!Ov(n))
      throw new Re({
        message: "Invalid schema in response for swap restoration"
      });
    return n;
  }
  async request(e, t, n) {
    const r = `${this.apiUrl}${e}`;
    try {
      const i = await globalThis.fetch(r, {
        method: t,
        headers: { "Content-Type": "application/json" },
        body: n ? JSON.stringify(n) : void 0
      });
      if (!i.ok) {
        const s = await i.text();
        let o;
        try {
          o = JSON.parse(s);
        } catch {
        }
        const a = `Boltz API error: ${i.status} ${s}`;
        throw new Vn(a, i.status, o);
      }
      if (i.headers.get("content-length") === "0")
        throw new Vn("Empty response from Boltz API");
      return await i.json();
    } catch (i) {
      throw i instanceof Vn ? i : new Vn(
        `Request to ${r} failed: ${i.message}`
      );
    }
  }
}, sc = (e) => {
  const t = yv.decode(e), n = Number(
    t.sections.find((r) => r.name === "amount")?.value ?? "0"
  );
  return {
    expiry: t.expiry ?? 3600,
    amountSats: Math.floor(n / 1e3),
    description: t.sections.find((r) => r.name === "description")?.value ?? "",
    paymentHash: t.sections.find((r) => r.name === "payment_hash")?.value ?? ""
  };
}, Pv = (e) => sc(e).paymentHash, Sr = (e, t, n) => {
  try {
    return Db(e, t, n), !0;
  } catch {
    return !1;
  }
};
function hn(e) {
  if (!e) return 0;
  try {
    const t = K.decode(x.decode(e)), n = t.findIndex((i) => i === "CHECKLOCKTIMEVERIFY");
    if (n > 0) {
      const i = t[n - 1];
      if (i instanceof Uint8Array) {
        const s = new Uint8Array(i).reverse();
        return parseInt(x.encode(s), 16);
      }
    }
    const r = t.findIndex((i) => i === "CHECKSEQUENCEVERIFY");
    if (r > 0) {
      const i = t[r - 1];
      if (i instanceof Uint8Array) {
        const s = new Uint8Array(i).reverse(), {
          blocks: o,
          seconds: a
        } = Gm.decode(
          parseInt(x.encode(s), 16)
        );
        return o ?? a ?? 0;
      }
    }
  } catch {
    return 0;
  }
  return 0;
}
function Bv(e, t) {
  if (!e) return 0;
  const { percentage: n, minerFees: r } = t.reverse, i = r.lockup + r.claim;
  return n >= 100 || n < 0 || i >= e ? 0 : Math.ceil((e - i) / (1 - n / 100));
}
var Q = console, oc = class li {
  constructor(t) {
    this.config = t;
  }
  static messageTag = "SwapUpdater";
  messageTag = li.messageTag;
  monitoredSwaps = /* @__PURE__ */ new Map();
  swapProvider;
  pollTimer = null;
  onNextTick = [];
  handleInit(t) {
    this.swapProvider = new Up({
      apiUrl: t.payload.apiUrl,
      network: t.payload.network
    });
  }
  prefixed(t) {
    return {
      tag: li.messageTag,
      ...t
    };
  }
  async handleMessage(t) {
    const n = t.id;
    if (this.config.debug && console.log(
      `[SwapUpdater] message received: ${JSON.stringify(t, null, 2)}`
    ), t.type === "INIT")
      return console.log(`[${this.messageTag}] INIT`, t.payload), this.handleInit(t), this.prefixed({ id: n, type: "INITIALIZED" });
    if (!this.swapProvider)
      return this.prefixed({
        id: n,
        error: new Error("Swap Provider not initialized")
      });
    switch (t.type) {
      case "GET_REVERSE_SWAP_TX_ID": {
        const r = await this.swapProvider.getReverseSwapTxId(
          t.payload.swapId
        );
        return this.prefixed({
          id: n,
          type: "REVERSE_SWAP_TX_ID",
          payload: { txid: r.id }
        });
      }
      case "GET_WS_URL": {
        const r = this.swapProvider.getWsUrl();
        return this.prefixed({
          id: n,
          type: "WS_URL",
          payload: { wsUrl: r }
        });
      }
      case "SWAP_STATUS_UPDATED": {
        const { swapId: r, status: i, error: s } = t.payload, o = this.monitoredSwaps.get(r);
        return o && (s && this.scheduleForNextTick(
          () => this.prefixed({
            type: "SWAP_FAILED",
            broadcast: !0,
            payload: { swap: o, error: s }
          })
        ), i !== o.status && await this.handleSwapStatusUpdate(o, i)), this.prefixed({ id: n, type: "ACK" });
      }
      case "GET_MONITORED_SWAPS":
        return this.prefixed({
          id: n,
          type: "MONITORED_SWAPS",
          payload: {
            swaps: Array.from(this.monitoredSwaps.values())
          }
        });
      case "GET_SWAP":
        return this.prefixed({
          id: n,
          type: "GET_SWAP",
          payload: {
            swap: this.monitoredSwaps.get(
              t.payload.swapId
            )
          }
        });
      case "MONITOR_SWAP": {
        const { swap: r } = t.payload;
        return this.monitoredSwaps.set(r.id, r), this.prefixed({ id: n, type: "ACK" });
      }
      case "STOP_MONITORING_SWAP": {
        const { swapId: r } = t.payload;
        return this.monitoredSwaps.delete(r), this.prefixed({ id: n, type: "ACK" });
      }
      default:
        throw console.warn(
          `[${li.messageTag}] Unhandled message:`,
          t
        ), new Error(`Unhandled message: ${t}`);
    }
  }
  async start(t) {
    await this.pollAllSwaps();
  }
  async stop() {
    return this.pollTimer && clearTimeout(this.pollTimer), Promise.resolve(void 0);
  }
  async tick(t) {
    await this.pollAllSwaps();
    const n = await Promise.allSettled(
      this.onNextTick.map((r) => r())
    );
    return this.onNextTick = [], n.map((r) => r.status === "fulfilled" ? r.value : (console.error(
      `[${li.messageTag}] tick failed`,
      r.reason
    ), null)).filter((r) => r !== null);
  }
  // Swap provider specific
  /**
   * Poll all monitored swaps for status updates
   * This is called per tick.
   */
  async pollAllSwaps() {
    if (!this.swapProvider || this.monitoredSwaps.size === 0) return;
    const t = Array.from(this.monitoredSwaps.values()).map(
      async (n) => {
        try {
          const r = await this.swapProvider.getSwapStatus(n.id);
          r.status !== n.status && await this.handleSwapStatusUpdate(
            n,
            r.status
          );
        } catch (r) {
          Q.error(`Failed to poll swap ${n.id}:`, r);
        }
      }
    );
    await Promise.allSettled(t);
  }
  scheduleForNextTick(t) {
    this.onNextTick.push(t);
  }
  /**
   * Handle status update for a swap
   * This is the core logic that determines what actions to take
   */
  async handleSwapStatusUpdate(t, n) {
    const r = t.status;
    r !== n && (t.status = n, Q.log(`Swap ${t.id} status: ${r} → ${n}`), this.scheduleForNextTick(
      () => this.prefixed({
        broadcast: !0,
        type: "SWAP_STATUS_UPDATED",
        payload: { swap: t, previousStatus: r }
      })
    ), this.isFinalStatus(n) && (this.monitoredSwaps.delete(t.id), Q.log(`Swap ${t.id} completed with status: ${n}`), this.scheduleForNextTick(
      () => this.prefixed({
        broadcast: !0,
        type: "SWAP_COMPLETED",
        payload: { swap: t }
      })
    )));
  }
  /**
   * Check if a status is final (no more updates expected)
   */
  isFinalStatus(t) {
    return hu(t) || fu(t);
  }
}, Nv = class {
  constructor(e, t) {
    this.serviceWorker = e, navigator.serviceWorker.addEventListener("message", (n) => {
      n.data.tag === oc.messageTag && (console.debug("[Swap Manager] broadcast received", n), this.onBroadcastMessage(n));
    }), t.events?.onSwapUpdate && this.swapUpdateListeners.add(t.events.onSwapUpdate), t.events?.onSwapCompleted && this.swapCompletedListeners.add(t.events.onSwapCompleted), t.events?.onSwapFailed && this.swapFailedListeners.add(t.events.onSwapFailed);
  }
  swapUpdateListeners = /* @__PURE__ */ new Set();
  swapCompletedListeners = /* @__PURE__ */ new Set();
  swapFailedListeners = /* @__PURE__ */ new Set();
  async init(e) {
    return this.sendMessage({
      type: "INIT",
      payload: {
        apiUrl: e.apiUrl,
        network: e.network
      }
    });
  }
  async getMonitoredSwaps() {
    const e = await this.sendMessage({ type: "GET_MONITORED_SWAPS" });
    if (e.payload.swaps) return e.payload.swaps;
    throw new Error("Failed to get monitored swaps");
  }
  async getSwap(e) {
    return (await this.sendMessage({
      type: "GET_SWAP",
      payload: { swapId: e }
    })).payload.swap;
  }
  async monitorSwap(e) {
    await this.sendMessage({
      type: "MONITOR_SWAP",
      payload: { swap: e }
    });
  }
  async stopMonitoringSwap(e) {
    await this.sendMessage({
      type: "STOP_MONITORING_SWAP",
      payload: { swapId: e }
    });
  }
  async getReverseSwapTxId(e) {
    return (await this.sendMessage({
      type: "GET_REVERSE_SWAP_TX_ID",
      id: es(),
      payload: { swapId: e }
    })).payload.txid;
  }
  async getWsUrl() {
    return (await this.sendMessage({
      type: "GET_WS_URL",
      id: es()
    })).payload.wsUrl;
  }
  async notifySwapStatusUpdate(e) {
    await this.sendMessage({
      type: "SWAP_STATUS_UPDATED",
      id: es(),
      payload: {
        swapId: e.swapId,
        error: e.error,
        status: e.status
      }
    });
  }
  // send a message and wait for a response
  async sendMessage(e) {
    const t = es();
    return new Promise((n, r) => {
      const i = (s) => {
        const o = s.data;
        if (o || console.log("Invalid response received from SW", s), o.id === "") {
          r(new Error("Invalid response id"));
          return;
        }
        o.id === t && (navigator.serviceWorker.removeEventListener(
          "message",
          i
        ), o.error ? r(o.error) : n(o));
      };
      navigator.serviceWorker.addEventListener("message", i), this.serviceWorker.postMessage({
        tag: oc.messageTag,
        id: t,
        type: "type" in e ? e.type : "NO_TYPE",
        payload: "payload" in e ? e.payload : void 0
      });
    });
  }
  async onBroadcastMessage(e) {
    const t = e.data;
    switch (t.type) {
      case "SWAP_FAILED":
        {
          const { swap: n, error: r } = t.payload;
          this.swapFailedListeners.forEach(
            (i) => i(n, new Error(r))
          );
        }
        return;
      case "SWAP_STATUS_UPDATED": {
        const { swap: n, previousStatus: r } = t.payload;
        this.swapUpdateListeners.forEach(
          (i) => i(n, r)
        );
        return;
      }
      case "SWAP_COMPLETED": {
        const { swap: n } = t.payload;
        this.swapCompletedListeners.forEach(
          (r) => r(n)
        );
      }
    }
  }
  /**
   * Add an event listener for swap updates
   * @returns Unsubscribe function
   */
  onSwapUpdate(e) {
    return this.swapUpdateListeners.add(e), () => this.swapUpdateListeners.delete(e);
  }
  /**
   * Add an event listener for swap completion
   * @returns Unsubscribe function
   */
  onSwapCompleted(e) {
    return this.swapCompletedListeners.add(e), () => this.swapCompletedListeners.delete(e);
  }
  /**
   * Add an event listener for swap failures
   * @returns Unsubscribe function
   */
  onSwapFailed(e) {
    return this.swapFailedListeners.add(e), () => this.swapFailedListeners.delete(e);
  }
  /**
   * Remove an event listener for swap updates
   */
  offSwapUpdate(e) {
    this.swapUpdateListeners.delete(e);
  }
  /**
   * Remove an event listener for swap completion
   */
  offSwapCompleted(e) {
    this.swapCompletedListeners.delete(e);
  }
  /**
   * Remove an event listener for swap failures
   */
  offSwapFailed(e) {
    this.swapFailedListeners.delete(e);
  }
};
function es() {
  const e = crypto.getRandomValues(new Uint8Array(16));
  return x.encode(e);
}
var _v = class {
  constructor(e, t = {}) {
    this.swapProvider = e, this.config = {
      enableAutoActions: t.enableAutoActions ?? !0,
      pollInterval: t.pollInterval ?? 3e4,
      reconnectDelayMs: t.reconnectDelayMs ?? 1e3,
      maxReconnectDelayMs: t.maxReconnectDelayMs ?? 6e4,
      pollRetryDelayMs: t.pollRetryDelayMs ?? 5e3,
      maxPollRetryDelayMs: t.maxPollRetryDelayMs ?? 3e5,
      events: t.events ?? {}
    }, t.events?.onSwapUpdate && this.swapUpdateListeners.add(t.events.onSwapUpdate), t.events?.onSwapCompleted && this.swapCompletedListeners.add(t.events.onSwapCompleted), t.events?.onSwapFailed && this.swapFailedListeners.add(t.events.onSwapFailed), t.events?.onActionExecuted && this.actionExecutedListeners.add(t.events.onActionExecuted), t.events?.onWebSocketConnected && this.wsConnectedListeners.add(t.events.onWebSocketConnected), t.events?.onWebSocketDisconnected && this.wsDisconnectedListeners.add(
      t.events.onWebSocketDisconnected
    ), this.currentReconnectDelay = this.config.reconnectDelayMs, this.currentPollRetryDelay = this.config.pollRetryDelayMs, t.serviceWorker && (this.svcSwapManager = new Nv(
      t.serviceWorker,
      t
    ), this.svcSwapManager.onSwapUpdate(async (n, r) => {
      const i = this.swapSubscriptions.get(n.id);
      i && i.forEach((s) => {
        try {
          s(n, r);
        } catch (o) {
          Q.error(
            `Error in swap subscription callback for ${n.id}:`,
            o
          );
        }
      }), await this.saveSwap(n), this.config.enableAutoActions && await this.executeAutonomousAction(n);
    }), this.svcSwapManager.onSwapCompleted((n) => {
      this.swapSubscriptions.delete(n.id);
    }), this.svcSwapManager.onSwapFailed((n, r) => {
      console.error("swap failed", n, r);
    }), this.svcSwapManager.init({
      network: e.getNetwork(),
      apiUrl: e.getApiUrl()
    }).then(() => {
      Q.log("SwapManager initialized");
    }).catch((n) => {
      Q.error("SwapManager initialization failed:", n);
    }));
  }
  config;
  svcSwapManager;
  // Event listeners storage (supports multiple listeners per event)
  swapUpdateListeners = /* @__PURE__ */ new Set();
  swapCompletedListeners = /* @__PURE__ */ new Set();
  swapFailedListeners = /* @__PURE__ */ new Set();
  actionExecutedListeners = /* @__PURE__ */ new Set();
  wsConnectedListeners = /* @__PURE__ */ new Set();
  wsDisconnectedListeners = /* @__PURE__ */ new Set();
  // State
  websocket = null;
  monitoredSwaps = /* @__PURE__ */ new Map();
  initialSwaps = /* @__PURE__ */ new Map();
  // All swaps passed to start(), including completed ones
  pollTimer = null;
  reconnectTimer = null;
  isRunning = !1;
  currentReconnectDelay;
  currentPollRetryDelay;
  usePollingFallback = !1;
  isReconnecting = !1;
  // Race condition prevention
  swapsInProgress = /* @__PURE__ */ new Set();
  // Per-swap subscriptions for UI hooks
  swapSubscriptions = /* @__PURE__ */ new Map();
  // Callbacks for actions (injected by ArkadeLightning)
  claimCallback = null;
  refundCallback = null;
  saveSwapCallback = null;
  /**
   * Set callbacks for claim, refund, and save operations
   * These are called by the manager when autonomous actions are needed
   */
  setCallbacks(e) {
    this.claimCallback = e.claim, this.refundCallback = e.refund, this.saveSwapCallback = e.saveSwap;
  }
  /**
   * Add an event listener for swap updates
   * @returns Unsubscribe function
   */
  onSwapUpdate(e) {
    return this.swapUpdateListeners.add(e), () => this.swapUpdateListeners.delete(e);
  }
  /**
   * Add an event listener for swap completion
   * @returns Unsubscribe function
   */
  onSwapCompleted(e) {
    return this.swapCompletedListeners.add(e), () => this.swapCompletedListeners.delete(e);
  }
  /**
   * Add an event listener for swap failures
   * @returns Unsubscribe function
   */
  onSwapFailed(e) {
    return this.swapFailedListeners.add(e), () => this.swapFailedListeners.delete(e);
  }
  /**
   * Add an event listener for executed actions (claim/refund)
   * @returns Unsubscribe function
   */
  onActionExecuted(e) {
    return this.actionExecutedListeners.add(e), () => this.actionExecutedListeners.delete(e);
  }
  /**
   * Add an event listener for WebSocket connection
   * @returns Unsubscribe function
   */
  onWebSocketConnected(e) {
    return this.wsConnectedListeners.add(e), () => this.wsConnectedListeners.delete(e);
  }
  /**
   * Add an event listener for WebSocket disconnection
   * @returns Unsubscribe function
   */
  onWebSocketDisconnected(e) {
    return this.wsDisconnectedListeners.add(e), () => this.wsDisconnectedListeners.delete(e);
  }
  /**
   * Remove an event listener for swap updates
   */
  offSwapUpdate(e) {
    this.swapUpdateListeners.delete(e);
  }
  /**
   * Remove an event listener for swap completion
   */
  offSwapCompleted(e) {
    this.swapCompletedListeners.delete(e);
  }
  /**
   * Remove an event listener for swap failures
   */
  offSwapFailed(e) {
    this.swapFailedListeners.delete(e);
  }
  /**
   * Remove an event listener for executed actions
   */
  offActionExecuted(e) {
    this.actionExecutedListeners.delete(e);
  }
  /**
   * Remove an event listener for WebSocket connection
   */
  offWebSocketConnected(e) {
    this.wsConnectedListeners.delete(e);
  }
  /**
   * Remove an event listener for WebSocket disconnection
   */
  offWebSocketDisconnected(e) {
    this.wsDisconnectedListeners.delete(e);
  }
  /**
   * Start the swap manager
   * This will:
   * 1. Load pending swaps
   * 2. Connect WebSocket (with fallback to polling)
   * 3. Poll all swaps after connection
   * 4. Resume any actionable swaps
   */
  async start(e) {
    if (this.isRunning) {
      Q.warn("SwapManager is already running");
      return;
    }
    this.isRunning = !0, this.initialSwaps.clear();
    for (const t of e)
      this.initialSwaps.set(t.id, t);
    for (const t of e)
      this.isFinalStatus(t.status) || (this.monitoredSwaps.set(t.id, t), await this.svcSwapManager?.monitorSwap(t));
    Q.log(
      `SwapManager started with ${this.monitoredSwaps.size} pending swaps`
    ), await this.connectWebSocket(), await this.resumeActionableSwaps();
  }
  /**
   * Stop the swap manager
   * Cleanup: close WebSocket, stop all timers
   */
  async stop() {
    this.isRunning && (this.isRunning = !1, this.websocket && (this.websocket.close(), this.websocket = null), this.pollTimer && (clearTimeout(this.pollTimer), this.pollTimer = null), this.reconnectTimer && (clearTimeout(this.reconnectTimer), this.reconnectTimer = null), Q.log("SwapManager stopped"));
  }
  /**
   * Add a new swap to monitoring
   */
  addSwap(e) {
    this.svcSwapManager?.monitorSwap(e).catch((t) => console.log(t)), this.monitoredSwaps.set(e.id, e), this.websocket && this.websocket.readyState === WebSocket.OPEN && this.subscribeToSwap(e.id), Q.log(`Added swap ${e.id} to monitoring`);
  }
  /**
   * Remove a swap from monitoring
   */
  removeSwap(e) {
    this.svcSwapManager?.stopMonitoringSwap(e).catch((t) => console.log(t)), this.monitoredSwaps.delete(e), this.swapSubscriptions.delete(e), Q.log(`Removed swap ${e} from monitoring`);
  }
  /**
   * Get all currently monitored swaps
   */
  async getPendingSwaps() {
    return this.svcSwapManager ? this.svcSwapManager.getMonitoredSwaps() : Array.from(this.monitoredSwaps.values());
  }
  /**
   * Subscribe to updates for a specific swap
   * Returns an unsubscribe function
   * Useful for UI components that need to track specific swap progress
   */
  subscribeToSwapUpdates(e, t) {
    this.swapSubscriptions.has(e) || this.swapSubscriptions.set(e, /* @__PURE__ */ new Set());
    const n = this.swapSubscriptions.get(e);
    return n.add(t), () => {
      n.delete(t), n.size === 0 && this.swapSubscriptions.delete(e);
    };
  }
  /**
   * Wait for a specific swap to complete
   * This blocks until the swap reaches a final status or fails
   * Useful when you want blocking behavior even with SwapManager enabled
   */
  async waitForSwapCompletion(e) {
    if (this.svcSwapManager) {
      let t = await this.svcSwapManager.getSwap(e);
      return new Promise((n, r) => {
        if (!t && (t = this.initialSwaps.get(e), !t)) {
          r(
            new Error(`Swap ${e} not found in manager`)
          );
          return;
        }
        if (this.isFinalStatus(t.status)) {
          Fn(t) ? this.svcSwapManager.getReverseSwapTxId(t.id).then((s) => n({ txid: s })).catch((s) => r(s)) : r(new Error("Submarine swap already completed"));
          return;
        }
        const i = this.subscribeToSwapUpdates(
          e,
          (s, o) => {
            this.isFinalStatus(s.status) && (i(), Fn(s) ? s.status === "invoice.settled" ? this.svcSwapManager.getReverseSwapTxId(
              s.id
            ).then((a) => n({ txid: a })).catch((a) => r(a)) : r(
              new Error(
                `Swap failed with status: ${s.status}`
              )
            ) : ui(s) && (s.status === "transaction.claimed" ? n({ txid: s.id }) : r(
              new Error(
                `Swap failed with status: ${s.status}`
              )
            )));
          }
        );
      });
    }
    return new Promise((t, n) => {
      let r = this.monitoredSwaps.get(e);
      if (!r && (r = this.initialSwaps.get(e), !r)) {
        n(new Error(`Swap ${e} not found in manager`));
        return;
      }
      if (this.isFinalStatus(r.status)) {
        Fn(r) ? this.swapProvider.getReverseSwapTxId(r.id).then((s) => t({ txid: s.id })).catch((s) => n(s)) : n(new Error("Submarine swap already completed"));
        return;
      }
      const i = this.subscribeToSwapUpdates(
        e,
        (s, o) => {
          this.isFinalStatus(s.status) && (i(), Fn(s) ? s.status === "invoice.settled" ? this.swapProvider.getReverseSwapTxId(
            s.id
          ).then(
            (a) => t({ txid: a.id })
          ).catch((a) => n(a)) : n(
            new Error(
              `Swap failed with status: ${s.status}`
            )
          ) : ui(s) && (s.status === "transaction.claimed" ? t({ txid: s.id }) : n(
            new Error(
              `Swap failed with status: ${s.status}`
            )
          )));
        }
      );
    });
  }
  /**
   * Check if a swap is currently being processed
   * Useful for preventing race conditions
   */
  isProcessing(e) {
    return this.swapsInProgress.has(e);
  }
  /**
   * Check if manager has a specific swap
   */
  async hasSwap(e) {
    return this.svcSwapManager ? !!await this.svcSwapManager.getSwap(e) : this.monitoredSwaps.has(e);
  }
  /**
   * Connect to WebSocket for real-time swap updates
   * Falls back to polling if connection fails
   */
  async connectWebSocket() {
    if (!this.isReconnecting) {
      this.isReconnecting = !0;
      try {
        const e = this.swapProvider.getWsUrl();
        this.websocket = new globalThis.WebSocket(e);
        const t = setTimeout(() => {
          Q.error("WebSocket connection timeout"), this.websocket?.close(), this.handleWebSocketFailure();
        }, 1e4);
        this.websocket.onerror = (n) => {
          clearTimeout(t), Q.error("WebSocket error:", n), this.handleWebSocketFailure();
        }, this.websocket.onopen = () => {
          clearTimeout(t), Q.log("WebSocket connected"), this.currentReconnectDelay = this.config.reconnectDelayMs, this.usePollingFallback = !1, this.isReconnecting = !1;
          for (const n of this.monitoredSwaps.keys())
            this.subscribeToSwap(n);
          this.pollAllSwaps(), this.startPolling(), this.wsConnectedListeners.forEach((n) => n());
        }, this.websocket.onclose = () => {
          clearTimeout(t), Q.log("WebSocket disconnected"), this.websocket = null, this.isRunning && this.scheduleReconnect(), this.wsDisconnectedListeners.forEach((n) => n());
        }, this.websocket.onmessage = async (n) => {
          await this.handleWebSocketMessage(n);
        };
      } catch (e) {
        Q.error("Failed to create WebSocket:", e), this.handleWebSocketFailure();
      }
    }
  }
  /**
   * Handle WebSocket connection failure
   * Falls back to polling-only mode with exponential backoff
   */
  handleWebSocketFailure() {
    this.isReconnecting = !1, this.websocket = null, this.usePollingFallback = !0, Q.warn(
      "WebSocket unavailable, using polling fallback with increasing interval"
    ), this.startPollingFallback();
    const e = new Vn("WebSocket connection failed");
    this.wsDisconnectedListeners.forEach((t) => t(e));
  }
  /**
   * Schedule WebSocket reconnection with exponential backoff
   */
  scheduleReconnect() {
    this.reconnectTimer || (Q.log(
      `Scheduling WebSocket reconnect in ${this.currentReconnectDelay}ms`
    ), this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null, this.isReconnecting = !1, this.connectWebSocket();
    }, this.currentReconnectDelay), this.currentReconnectDelay = Math.min(
      this.currentReconnectDelay * 2,
      this.config.maxReconnectDelayMs
    ));
  }
  /**
   * Subscribe to a specific swap ID on the WebSocket
   */
  subscribeToSwap(e) {
    !this.websocket || this.websocket.readyState !== WebSocket.OPEN || this.websocket.send(
      JSON.stringify({
        op: "subscribe",
        channel: "swap.update",
        args: [e]
      })
    );
  }
  /**
   * Handle incoming WebSocket message
   */
  async handleWebSocketMessage(e) {
    try {
      const t = JSON.parse(e.data);
      if (t.event !== "update") return;
      const n = t.args[0]?.id;
      if (!n) return;
      if (this.svcSwapManager) {
        await this.svcSwapManager.notifySwapStatusUpdate({
          swapId: n,
          error: t.args[0].error,
          status: t.args[0].status
        });
        return;
      }
      const r = this.monitoredSwaps.get(n);
      if (!r) return;
      if (t.args[0].error) {
        Q.error(`Swap ${n} error:`, t.args[0].error);
        const s = new Error(t.args[0].error);
        this.swapFailedListeners.forEach(
          (o) => o(r, s)
        );
        return;
      }
      const i = t.args[0].status;
      await this.handleSwapStatusUpdate(r, i);
    } catch (t) {
      Q.error("Error handling WebSocket message:", t);
    }
  }
  /**
   * Handle status update for a swap
   * This is the core logic that determines what actions to take
   */
  async handleSwapStatusUpdate(e, t) {
    const n = e.status;
    if (n === t) return;
    e.status = t, Q.log(`Swap ${e.id} status: ${n} → ${t}`), this.swapUpdateListeners.forEach(
      (i) => i(e, n)
    );
    const r = this.swapSubscriptions.get(e.id);
    r && r.forEach((i) => {
      try {
        i(e, n);
      } catch (s) {
        Q.error(
          `Error in swap subscription callback for ${e.id}:`,
          s
        );
      }
    }), await this.saveSwap(e), this.config.enableAutoActions && await this.executeAutonomousAction(e), this.isFinalStatus(t) && (this.monitoredSwaps.delete(e.id), this.swapSubscriptions.delete(e.id), this.swapCompletedListeners.forEach((i) => i(e)), Q.log(`Swap ${e.id} completed with status: ${t}`));
  }
  /**
   * Execute autonomous action based on swap status
   * Uses locking to prevent race conditions with manual operations
   */
  async executeAutonomousAction(e) {
    if (this.swapsInProgress.has(e.id)) {
      Q.log(
        `Swap ${e.id} is already being processed, skipping autonomous action`
      );
      return;
    }
    try {
      if (this.swapsInProgress.add(e.id), Fn(e)) {
        if (!e.preimage || e.preimage.length === 0) {
          Q.log(
            `Skipping claim for swap ${e.id}: missing preimage (restored swap)`
          );
          return;
        }
        md(e.status) && (Q.log(`Auto-claiming reverse swap ${e.id}`), await this.executeClaimAction(e), this.actionExecutedListeners.forEach(
          (t) => t(e, "claim")
        ));
      } else if (ui(e)) {
        if (!e.request?.invoice || e.request.invoice.length === 0) {
          Q.log(
            `Skipping refund for swap ${e.id}: missing invoice (restored swap)`
          );
          return;
        }
        bd(e.status) && (Q.log(`Auto-refunding submarine swap ${e.id}`), await this.executeRefundAction(e), this.actionExecutedListeners.forEach(
          (t) => t(e, "refund")
        ));
      }
    } catch (t) {
      Q.error(
        `Failed to execute autonomous action for swap ${e.id}:`,
        t
      ), this.swapFailedListeners.forEach(
        (n) => n(e, t)
      );
    } finally {
      this.swapsInProgress.delete(e.id);
    }
  }
  /**
   * Execute claim action for reverse swap
   */
  async executeClaimAction(e) {
    if (!this.claimCallback) {
      Q.error("Claim callback not set");
      return;
    }
    await this.claimCallback(e);
  }
  /**
   * Execute refund action for submarine swap
   */
  async executeRefundAction(e) {
    if (!this.refundCallback) {
      Q.error("Refund callback not set");
      return;
    }
    await this.refundCallback(e);
  }
  /**
   * Save swap to storage
   */
  async saveSwap(e) {
    if (!this.saveSwapCallback) {
      Q.error("Save swap callback not set");
      return;
    }
    await this.saveSwapCallback(e);
  }
  /**
   * Resume actionable swaps on startup
   * This checks all pending swaps and executes actions if needed
   */
  async resumeActionableSwaps() {
    if (!this.config.enableAutoActions)
      return;
    Q.log("Resuming actionable swaps...");
    const e = this.svcSwapManager ? await this.svcSwapManager.getMonitoredSwaps() : Array.from(this.monitoredSwaps.values());
    for (const t of e)
      try {
        Fn(t) && md(t.status) ? (Q.log(`Resuming claim for swap ${t.id}`), await this.executeAutonomousAction(t)) : ui(t) && bd(t.status) && (Q.log(`Resuming refund for swap ${t.id}`), await this.executeAutonomousAction(t));
      } catch (n) {
        Q.error(`Failed to resume swap ${t.id}:`, n);
      }
  }
  /**
   * Start regular polling
   * Polls all swaps at configured interval when WebSocket is active
   */
  startPolling() {
    this.pollTimer && clearTimeout(this.pollTimer), this.pollTimer = setTimeout(async () => {
      await this.pollAllSwaps(), this.isRunning && this.startPolling();
    }, this.config.pollInterval);
  }
  /**
   * Start polling fallback when WebSocket is unavailable
   * Uses exponential backoff for retry delay
   */
  startPollingFallback() {
    this.pollTimer && clearTimeout(this.pollTimer), this.pollTimer = setTimeout(async () => {
      await this.pollAllSwaps(), this.currentPollRetryDelay = Math.min(
        this.currentPollRetryDelay * 2,
        this.config.maxPollRetryDelayMs
      ), this.isRunning && this.usePollingFallback && this.startPollingFallback();
    }, this.currentPollRetryDelay), Q.log(`Next polling fallback in ${this.currentPollRetryDelay}ms`);
  }
  /**
   * Poll all monitored swaps for status updates
   * This is called:
   * 1. After WebSocket connects
   * 2. After WebSocket reconnects
   * 3. Periodically while WebSocket is active
   * 4. As fallback when WebSocket is unavailable
   */
  async pollAllSwaps() {
    if (this.monitoredSwaps.size === 0) return;
    Q.log(`Polling ${this.monitoredSwaps.size} swaps...`);
    const e = Array.from(this.monitoredSwaps.values()).map(
      async (t) => {
        try {
          const n = await this.swapProvider.getSwapStatus(t.id);
          n.status !== t.status && await this.handleSwapStatusUpdate(
            t,
            n.status
          );
        } catch (n) {
          Q.error(`Failed to poll swap ${t.id}:`, n);
        }
      }
    );
    await Promise.allSettled(e);
  }
  /**
   * Check if a status is final (no more updates expected)
   */
  isFinalStatus(e) {
    return hu(e) || fu(e);
  }
  /**
   * Get current manager statistics (for debugging/monitoring)
   */
  getStats() {
    return {
      isRunning: this.isRunning,
      monitoredSwaps: this.monitoredSwaps.size,
      websocketConnected: this.websocket !== null && this.websocket.readyState === WebSocket.OPEN,
      usePollingFallback: this.usePollingFallback,
      currentReconnectDelay: this.currentReconnectDelay,
      currentPollRetryDelay: this.currentPollRetryDelay
    };
  }
};
function Uv(e, t) {
  return {
    ...e,
    sign: async (n, r) => {
      const i = n.clone();
      let s = await e.sign(i, r);
      if (s = ne.fromPSBT(s.toPSBT()), t)
        for (const o of r || Array.from(
          { length: s.inputsLength },
          (a, c) => c
        ))
          op(s, o, ap, [
            t
          ]);
      return s;
    }
  };
}
function Lv(e, t, n, r, i, s, o, a = 0) {
  const c = new TextEncoder().encode(e), u = lt(c), l = x.encode(u);
  let d;
  return {
    onBatchStarted: async (h) => {
      let p = !0;
      for (const f of h.intentIdHashes)
        if (f === l) {
          if (!n)
            throw new Error("Ark provider not configured");
          await n.confirmRegistration(e), p = !1;
        }
      if (p)
        return { skip: p };
      const w = kt.encode({
        timelock: {
          value: h.batchExpiry,
          type: h.batchExpiry >= 512n ? "seconds" : "blocks"
        },
        pubkeys: [s]
      }).script;
      return d = En(w), { skip: !1 };
    },
    onTreeSigningStarted: async (h, p) => {
      if (!i)
        return { skip: !0 };
      if (!d)
        throw new Error("Sweep tap tree root not set");
      const w = h.cosignersPublicKeys.map(
        (N) => N.slice(2)
      ), y = (await i.getPublicKey()).subarray(1);
      if (!w.includes(x.encode(y)))
        return { skip: !0 };
      const E = ne.fromPSBT(
        G.decode(h.unsignedCommitmentTx)
      );
      gp(p, E, d);
      const I = E.getOutput(0);
      if (!I?.amount)
        throw new Error("Shared output not found");
      await i.init(p, d, I.amount);
      const O = x.encode(await i.getPublicKey()), B = await i.getNonces();
      return await n.submitTreeNonces(h.id, O, B), { skip: !1 };
    },
    onTreeNonces: async (h) => {
      if (!i)
        return { fullySigned: !0 };
      const { hasAllNonces: p } = await i.aggregatedNonces(
        h.txid,
        h.nonces
      );
      if (!p) return { fullySigned: !1 };
      const w = await i.sign(), f = x.encode(await i.getPublicKey());
      return await n.submitTreeSignatures(
        h.id,
        f,
        w
      ), { fullySigned: !0 };
    },
    onBatchFinalization: async (h, p, w) => {
      if (!o)
        return;
      if (!w)
        throw new Error(
          "BatchFinalizationEvent: expected connector tree to be defined"
        );
      pp(h.commitmentTx, w);
      const f = w.leaves();
      if (f.length <= a)
        throw new Error(
          `BatchFinalizationEvent: expected connector tree has ${f.length} leaves, expected at least ${a + 1}`
        );
      const y = Dv(
        t,
        o,
        f[a]
      ), E = await r.sign(y);
      await n.submitSignedForfeitTxs([
        G.encode(E.toPSBT())
      ]);
    }
  };
}
function Dv(e, t, n) {
  const r = n.id, i = n.getOutput(0);
  if (!i)
    throw new Error("connector output not found");
  const s = i.amount, o = i.script;
  if (!s || !o)
    throw new Error("invalid connector output");
  const a = du(e.tapLeafScript);
  return hp(
    [
      {
        txid: e.txid,
        index: e.vout,
        witnessUtxo: {
          amount: BigInt(e.value),
          script: re.decode(e.tapTree).pkScript
        },
        sighashType: It.DEFAULT,
        tapLeafScript: [e.tapLeafScript],
        sequence: a
      },
      {
        txid: r,
        index: 0,
        witnessUtxo: {
          amount: s,
          script: o
        }
      }
    ],
    t,
    a
  );
}
var Vv = "arkade-boltz-swap", Fv = 2, Ne = "swaps";
function Mv(e) {
  if (!e.objectStoreNames.contains(Ne)) {
    const t = e.createObjectStore(Ne, {
      keyPath: "id"
    });
    t.createIndex("status", "status", { unique: !1 }), t.createIndex("type", "type", { unique: !1 }), t.createIndex("createdAt", "createdAt", { unique: !1 });
  }
}
var Lp = class {
  constructor(e = Vv) {
    this.dbName = e;
  }
  db = null;
  async getDB() {
    return this.db ? this.db : (this.db = await uu(this.dbName, Fv, Mv), this.db);
  }
  async saveSwap(e) {
    const t = await this.getDB();
    return new Promise((n, r) => {
      const o = t.transaction(
        [Ne],
        "readwrite"
      ).objectStore(Ne).put(e);
      o.onsuccess = () => n(), o.onerror = () => r(o.error);
    });
  }
  async deleteSwap(e) {
    const t = await this.getDB();
    return new Promise((n, r) => {
      const o = t.transaction(
        [Ne],
        "readwrite"
      ).objectStore(Ne).delete(e);
      o.onsuccess = () => n(), o.onerror = () => r(o.error);
    });
  }
  async getAllSwaps(e) {
    return this.getAllSwapsFromStore(e);
  }
  async clear() {
    const e = await this.getDB();
    return new Promise((t, n) => {
      const s = e.transaction(
        [Ne],
        "readwrite"
      ).objectStore(Ne).clear();
      s.onsuccess = () => t(), s.onerror = () => n(s.error);
    });
  }
  getSwapsByIndexValues(e, t, n) {
    if (n.length === 0) return Promise.resolve([]);
    const r = e.index(t), i = n.map(
      (s) => new Promise((o, a) => {
        const c = r.getAll(s);
        c.onerror = () => a(c.error), c.onsuccess = () => o(c.result ?? []);
      })
    );
    return Promise.all(i).then(
      (s) => s.flatMap((o) => o)
    );
  }
  async getAllSwapsFromStore(e) {
    const n = (await this.getDB()).transaction([Ne], "readonly").objectStore(Ne);
    if (!e || Object.keys(e).length === 0)
      return new Promise((s, o) => {
        const a = n.getAll();
        a.onsuccess = () => s(a.result ?? []), a.onerror = () => o(a.error);
      });
    const r = Kv(e);
    if (r.has("id")) {
      const s = r.get("id"), o = await Promise.all(
        s.map(
          (a) => new Promise((c, u) => {
            const l = n.get(a);
            l.onsuccess = () => c(l.result), l.onerror = () => u(l.error);
          })
        )
      );
      return this.sortIfNeeded(
        this.applySwapsFilter(o, r),
        e
      );
    }
    if (r.has("type")) {
      const s = r.get("type"), o = await this.getSwapsByIndexValues(
        n,
        "type",
        s
      );
      return this.sortIfNeeded(
        this.applySwapsFilter(o, r),
        e
      );
    }
    if (r.has("status")) {
      const s = r.get("status"), o = await this.getSwapsByIndexValues(
        n,
        "status",
        s
      );
      return this.sortIfNeeded(
        this.applySwapsFilter(o, r),
        e
      );
    }
    if (e.orderBy === "createdAt")
      return this.getAllSwapsByCreatedAt(n, e.orderDirection);
    const i = await new Promise((s, o) => {
      const a = n.getAll();
      a.onsuccess = () => s(a.result ?? []), a.onerror = () => o(a.error);
    });
    return this.sortIfNeeded(
      this.applySwapsFilter(i, r),
      e
    );
  }
  applySwapsFilter(e, t) {
    return e.filter((n) => !(n === void 0 || t.has("id") && !t.get("id")?.includes(n.id) || t.has("status") && !t.get("status")?.includes(n.status) || t.has("type") && !t.get("type")?.includes(n.type)));
  }
  async getAllSwapsByCreatedAt(e, t) {
    const n = e.index("createdAt"), r = t === "desc" ? "prev" : "next";
    return new Promise((i, s) => {
      const o = [], a = n.openCursor(null, r);
      a.onerror = () => s(a.error), a.onsuccess = () => {
        const c = a.result;
        if (!c) {
          i(o);
          return;
        }
        o.push(c.value), c.continue();
      };
    });
  }
  sortIfNeeded(e, t) {
    if (t?.orderBy !== "createdAt") return e;
    const n = t.orderDirection === "asc" ? 1 : -1;
    return e.slice().sort((r, i) => (r.createdAt - i.createdAt) * n);
  }
  async [Symbol.asyncDispose]() {
    this.db && (await lu(this.dbName), this.db = null);
  }
}, Hv = ["id", "status", "type"];
function Kv(e) {
  const t = /* @__PURE__ */ new Map();
  return Hv.forEach((n) => {
    e?.[n] && (Array.isArray(e[n]) ? t.set(n, e[n]) : t.set(n, [e[n]]));
  }), t;
}
var Wv = class {
  wallet;
  arkProvider;
  swapProvider;
  indexerProvider;
  swapManager = null;
  swapRepository;
  constructor(e) {
    if (!e.wallet) throw new Error("Wallet is required.");
    if (!e.swapProvider) throw new Error("Swap provider is required.");
    this.wallet = e.wallet;
    const t = e.wallet.arkProvider ?? e.arkProvider;
    if (!t)
      throw new Error(
        "Ark provider is required either in wallet or config."
      );
    this.arkProvider = t;
    const n = e.wallet.indexerProvider ?? e.indexerProvider;
    if (!n)
      throw new Error(
        "Indexer provider is required either in wallet or config."
      );
    if (this.indexerProvider = n, this.swapProvider = e.swapProvider, e.swapRepository ? this.swapRepository = e.swapRepository : this.swapRepository = new Lp(), e.swapManager) {
      const r = e.swapManager === !0 ? {} : e.swapManager, i = r.autoStart ?? !0;
      this.swapManager = new _v(
        this.swapProvider,
        r
      ), this.swapManager.setCallbacks({
        claim: async (s) => {
          await this.claimVHTLC(s);
        },
        refund: async (s) => {
          await this.refundVHTLC(s);
        },
        saveSwap: async (s) => this.swapRepository.saveSwap(s)
      }), i && this.startSwapManager().catch((s) => {
        Q.error("Failed to autostart SwapManager:", s);
      });
    }
  }
  // SwapManager methods
  /**
   * Start the background swap manager
   * This will load all pending swaps and begin monitoring them
   * Automatically called when SwapManager is enabled
   */
  async startSwapManager() {
    if (!this.swapManager)
      throw new Error(
        "SwapManager is not enabled. Provide 'swapManager' config in ArkadeLightningConfig."
      );
    const e = await this.swapRepository.getAllSwaps();
    console.log("Starting SwapManager with", e.length, "swaps"), await this.swapManager.start(e);
  }
  /**
   * Stop the background swap manager
   */
  async stopSwapManager() {
    this.swapManager && await this.swapManager.stop();
  }
  /**
   * Get the SwapManager instance
   * Useful for accessing manager stats or manually controlling swaps
   */
  getSwapManager() {
    return this.swapManager;
  }
  // receive from lightning = reverse submarine swap
  //
  // 1. create invoice by creating a reverse swap
  // 2. monitor incoming payment by waiting for the hold invoice to be paid
  // 3. claim the VHTLC by creating a virtual transaction that spends the VHTLC output
  // 4. return the preimage and the swap info
  /**
   * Creates a Lightning invoice.
   * @param args - The arguments for creating a Lightning invoice.
   * @returns The response containing the created Lightning invoice.
   */
  async createLightningInvoice(e) {
    return this.createReverseSwap(e).then((t) => {
      const n = sc(t.response.invoice);
      return {
        amount: t.response.onchainAmount,
        expiry: n.expiry,
        invoice: t.response.invoice,
        paymentHash: n.paymentHash,
        pendingSwap: t,
        preimage: t.preimage
      };
    });
  }
  /**
   * Sends a Lightning payment.
   * 1. decode the invoice to get the amount and destination
   * 2. create submarine swap with the decoded invoice
   * 3. send the swap address and expected amount to the wallet to create a transaction
   * 4. wait for the swap settlement and return the preimage and txid
   * @param args - The arguments for sending a Lightning payment.
   * @returns The result of the payment.
   */
  async sendLightningPayment(e) {
    const t = await this.createSubmarineSwap(e);
    await this.swapRepository.saveSwap(t);
    const n = await this.wallet.sendBitcoin({
      address: t.response.address,
      amount: t.response.expectedAmount
    });
    try {
      const { preimage: r } = await this.waitForSwapSettlement(t);
      return {
        amount: t.response.expectedAmount,
        preimage: r,
        txid: n
      };
    } catch (r) {
      if (r.isRefundable) {
        await this.refundVHTLC(t);
        const i = await this.getSwapStatus(t.id);
        await this.swapRepository.saveSwap({
          ...t,
          status: i.status
        });
      }
      throw new yd();
    }
  }
  /**
   * Creates a submarine swap.
   * @param args - The arguments for creating a submarine swap.
   * @returns The created pending submarine swap.
   */
  async createSubmarineSwap(e) {
    const t = x.encode(
      await this.wallet.identity.compressedPublicKey()
    );
    if (!t)
      throw new At({
        message: "Failed to get refund public key from wallet"
      });
    const n = e.invoice;
    if (!n) throw new At({ message: "Invoice is required" });
    const r = {
      invoice: n,
      refundPublicKey: t
    }, i = await this.swapProvider.createSubmarineSwap(r), s = {
      id: i.id,
      type: "submarine",
      createdAt: Math.floor(Date.now() / 1e3),
      request: r,
      response: i,
      status: "invoice.set"
    };
    return await this.swapRepository.saveSwap(s), this.swapManager && this.swapManager.addSwap(s), s;
  }
  /**
   * Creates a reverse swap.
   * @param args - The arguments for creating a reverse swap.
   * @returns The created pending reverse swap.
   */
  async createReverseSwap(e) {
    if (e.amount <= 0)
      throw new At({ message: "Amount must be greater than 0" });
    const t = x.encode(
      await this.wallet.identity.compressedPublicKey()
    );
    if (!t)
      throw new At({
        message: "Failed to get claim public key from wallet"
      });
    const n = Nn(32), r = x.encode(lt(n));
    if (!r)
      throw new At({ message: "Failed to get preimage hash" });
    const i = {
      invoiceAmount: e.amount,
      claimPublicKey: t,
      preimageHash: r,
      ...e.description?.trim() ? { description: e.description.trim() } : {}
    }, s = await this.swapProvider.createReverseSwap(i), o = {
      id: s.id,
      type: "reverse",
      createdAt: Math.floor(Date.now() / 1e3),
      preimage: x.encode(n),
      request: i,
      response: s,
      status: "swap.created"
    };
    return await this.swapRepository.saveSwap(o), this.swapManager && this.swapManager.addSwap(o), o;
  }
  /**
   * Claims the VHTLC for a pending reverse swap.
   * If the VHTLC is recoverable, it joins a batch to spend the vtxo via commitment transaction.
   * @param pendingSwap - The pending reverse swap to claim the VHTLC.
   */
  async claimVHTLC(e) {
    if (!e.preimage)
      throw new Error("Preimage is required to claim VHTLC");
    const t = x.decode(e.preimage), n = await this.arkProvider.getInfo(), r = await this.wallet.getAddress(), i = this.normalizeToXOnlyPublicKey(
      await this.wallet.identity.xOnlyPublicKey(),
      "our",
      e.id
    ), s = this.normalizeToXOnlyPublicKey(
      x.decode(e.response.refundPublicKey),
      "boltz",
      e.id
    ), o = this.normalizeToXOnlyPublicKey(
      x.decode(n.signerPubkey),
      "server",
      e.id
    ), { vhtlcScript: a, vhtlcAddress: c } = this.createVHTLCScript({
      network: n.network,
      preimageHash: lt(t),
      receiverPubkey: x.encode(i),
      senderPubkey: x.encode(s),
      serverPubkey: x.encode(o),
      timeoutBlockHeights: e.response.timeoutBlockHeights
    });
    if (!a)
      throw new Error("Failed to create VHTLC script for reverse swap");
    if (c !== e.response.lockupAddress)
      throw new Error("Boltz is trying to scam us");
    const { vtxos: u } = await this.indexerProvider.getVtxos({
      scripts: [x.encode(a.pkScript)]
    });
    if (u.length === 0)
      throw new Error("No spendable virtual coins found");
    const l = u[0];
    if (l.isSpent)
      throw new Error("VHTLC is already spent");
    const d = {
      ...l,
      tapLeafScript: a.claim(),
      tapTree: a.encode()
    }, h = {
      amount: BigInt(l.value),
      script: Sn.decode(r).pkScript
    }, p = Uv(
      this.wallet.identity,
      t
    );
    var w;
    to(l) ? (await this.joinBatch(p, d, h, n), w = "transaction.claimed") : (await this.claimVHTLCwithOffchainTx(
      p,
      a,
      o,
      d,
      h,
      n
    ), w = (await this.getSwapStatus(e.id)).status), await this.swapRepository.saveSwap({
      ...e,
      status: w
    });
  }
  /**
   * Claims the VHTLC for a pending submarine swap (aka refund).
   * If the VHTLC is recoverable, it joins a batch to spend the vtxo via commitment transaction.
   * @param pendingSwap - The pending submarine swap to refund the VHTLC.
   */
  async refundVHTLC(e) {
    const t = e.request.invoice ? Pv(e.request.invoice) : e.preimageHash;
    if (!t)
      throw new Error("Preimage hash is required to refund VHTLC");
    const n = Sn.decode(
      e.response.address
    ).pkScript, { vtxos: r } = await this.indexerProvider.getVtxos({
      scripts: [x.encode(n)]
    });
    if (r.length === 0)
      throw new Error(
        `VHTLC not found for address ${e.response.address}`
      );
    const i = r[0];
    if (i.isSpent)
      throw new Error("VHTLC is already spent");
    const s = await this.arkProvider.getInfo(), o = await this.wallet.getAddress();
    if (!o) throw new Error("Failed to get ark address from wallet");
    const a = this.normalizeToXOnlyPublicKey(
      await this.wallet.identity.xOnlyPublicKey(),
      "our",
      e.id
    ), c = this.normalizeToXOnlyPublicKey(
      x.decode(s.signerPubkey),
      "server",
      e.id
    ), u = this.normalizeToXOnlyPublicKey(
      x.decode(e.response.claimPublicKey),
      "boltz",
      e.id
    ), { vhtlcScript: l } = this.createVHTLCScript({
      network: s.network,
      preimageHash: x.decode(t),
      receiverPubkey: x.encode(u),
      senderPubkey: x.encode(a),
      serverPubkey: x.encode(c),
      timeoutBlockHeights: e.response.timeoutBlockHeights
    });
    if (!l)
      throw new Error("Failed to create VHTLC script for reverse swap");
    const d = to(i), h = {
      ...i,
      tapLeafScript: d ? l.refundWithoutReceiver() : l.refund(),
      tapTree: l.encode()
    }, p = {
      amount: BigInt(i.value),
      script: Sn.decode(o).pkScript
    };
    d ? await this.joinBatch(this.wallet.identity, h, p, s) : await this.refundVHTLCwithOffchainTx(
      e,
      u,
      a,
      c,
      h,
      p,
      s
    ), await this.swapRepository.saveSwap({
      ...e,
      refundable: !0,
      refunded: !0
    });
  }
  /**
   * Joins a batch to spend the vtxo via commitment transaction
   * @param identity - The identity to use for signing the forfeit transaction.
   * @param input - The input vtxo.
   * @param output - The output script.
   * @param isRecoverable
   * @param forfeitPublicKey - The forfeit public key.
   * @returns The commitment transaction ID.
   */
  async joinBatch(e, t, n, {
    forfeitPubkey: r,
    forfeitAddress: i,
    network: s
  }, o = !0) {
    const a = e.signerSession(), c = await a.getPublicKey(), u = {
      type: "register",
      onchain_output_indexes: [],
      valid_at: 0,
      expire_at: 0,
      cosigners_public_keys: [x.encode(c)]
    }, l = {
      type: "delete",
      expire_at: 0
    }, d = {
      txid: x.decode(t.txid),
      index: t.vout,
      witnessUtxo: {
        amount: BigInt(t.value),
        script: re.decode(t.tapTree).pkScript
      },
      tapLeafScript: [t.tapLeafScript],
      unknown: [tu.encode(t.tapTree)],
      sequence: du(t.tapLeafScript)
    }, h = Fe.create(
      u,
      [d],
      [n]
    ), p = Fe.create(l, [d]), [w, f] = await Promise.all([
      e.sign(h),
      e.sign(p)
    ]), y = new AbortController(), E = await this.arkProvider.registerIntent({
      message: u,
      proof: G.encode(w.toPSBT())
    }), I = Yt(
      s in xs ? xs[s] : xs.bitcoin
    ).decode(i);
    try {
      const O = Lv(
        E,
        t,
        this.arkProvider,
        e,
        a,
        x.decode(r).slice(1),
        o ? void 0 : dt.encode(I)
      ), B = [
        x.encode(c),
        `${t.txid}:${t.vout}`
      ], N = this.arkProvider.getEventStream(
        y.signal,
        B
      ), V = await eo.join(N, O, {
        abortController: y
      });
      return Q.log(
        "Batch joined with commitment transaction:",
        V
      ), V;
    } catch (O) {
      y.abort(), Q.error("Failed to join batch:", O);
      try {
        await this.arkProvider.deleteIntent({
          message: l,
          proof: G.encode(f.toPSBT())
        });
      } catch (B) {
        Q.error("Failed to delete intent:", B);
      }
      throw O;
    }
  }
  /**
   * Waits for the swap to be confirmed and claims the VHTLC.
   * If SwapManager is enabled, this delegates to the manager for coordinated processing.
   * @param pendingSwap - The pending reverse swap.
   * @returns The transaction ID of the claimed VHTLC.
   */
  async waitAndClaim(e) {
    return this.swapManager && await this.swapManager.hasSwap(e.id) ? this.swapManager.waitForSwapCompletion(e.id) : new Promise((t, n) => {
      const r = async (i) => {
        const s = (o) => this.swapRepository.saveSwap({
          ...e,
          status: i,
          ...o
        });
        switch (i) {
          case "transaction.mempool":
          case "transaction.confirmed":
            await s(), this.claimVHTLC(e).catch(n);
            break;
          case "invoice.settled": {
            await s();
            const a = (await this.swapProvider.getReverseSwapTxId(
              e.id
            )).id;
            if (!a || a.trim() === "") {
              n(
                new At({
                  message: `Transaction ID not available for settled swap ${e.id}.`
                })
              );
              break;
            }
            t({ txid: a });
            break;
          }
          case "invoice.expired":
            await s(), n(
              new mv({
                isRefundable: !0,
                pendingSwap: e
              })
            );
            break;
          case "swap.expired":
            await s(), n(
              new wd({
                isRefundable: !0,
                pendingSwap: e
              })
            );
            break;
          case "transaction.failed":
            await s(), n(new yd());
            break;
          case "transaction.refunded":
            await s(), n(new vv());
            break;
          default:
            await s();
            break;
        }
      };
      this.swapProvider.monitorSwap(e.id, r);
    });
  }
  /**
   * Waits for the swap settlement.
   * @param pendingSwap - The pending submarine swap.
   * @returns The status of the swap settlement.
   */
  async waitForSwapSettlement(e) {
    return new Promise((t, n) => {
      let r = !1;
      const i = async (s) => {
        if (r) return;
        const o = (a) => this.swapRepository.saveSwap({
          ...e,
          status: s,
          ...a
        });
        switch (s) {
          case "swap.expired":
            r = !0, await o({ refundable: !0 }), n(
              new wd({
                isRefundable: !0,
                pendingSwap: e
              })
            );
            break;
          case "invoice.failedToPay":
            r = !0, await o({ refundable: !0 }), n(
              new bv({
                isRefundable: !0,
                pendingSwap: e
              })
            );
            break;
          case "transaction.lockupFailed":
            r = !0, await o({ refundable: !0 }), n(
              new xv({
                isRefundable: !0,
                pendingSwap: e
              })
            );
            break;
          case "transaction.claimed": {
            r = !0;
            const { preimage: a } = await this.swapProvider.getSwapPreimage(
              e.id
            );
            await o({ preimage: a }), t({ preimage: a });
            break;
          }
          default:
            await o();
            break;
        }
      };
      this.swapProvider.monitorSwap(e.id, i).catch((s) => {
        r || (r = !0, n(s));
      });
    });
  }
  /**
   * Restore swaps from Boltz API.
   *
   * Note: restored swaps may lack local-only data such as the original
   * Lightning invoice or preimage. They are intended primarily for
   * display/monitoring and are not automatically wired into the SwapManager.
   * Do not call `claimVHTLC` / `refundVHTLC` on them unless you have
   * enriched the objects with the missing fields.
   *
   * @param boltzFees - Optional fees response to use for restoration.
   * @returns An object containing arrays of restored reverse and submarine swaps.
   */
  async restoreSwaps(e) {
    const t = x.encode(
      await this.wallet.identity.compressedPublicKey()
    );
    if (!t) throw new Error("Failed to get public key from wallet");
    const n = e ?? await this.swapProvider.getFees(), r = [], i = [], s = await this.swapProvider.restoreSwaps(t);
    for (const o of s) {
      const { id: a, createdAt: c, status: u } = o;
      if (_p(o)) {
        const {
          amount: l,
          lockupAddress: d,
          preimageHash: h,
          serverPublicKey: p,
          tree: w
        } = o.claimDetails;
        r.push({
          id: a,
          createdAt: c,
          request: {
            invoiceAmount: Bv(l, n),
            claimPublicKey: t,
            preimageHash: h
          },
          response: {
            id: a,
            invoice: "",
            // TODO check if we can get the invoice from boltz
            onchainAmount: l,
            lockupAddress: d,
            refundPublicKey: p,
            timeoutBlockHeights: {
              refund: hn(
                w.refundWithoutBoltzLeaf.output
              ),
              unilateralClaim: hn(
                w.unilateralClaimLeaf.output
              ),
              unilateralRefund: hn(
                w.unilateralRefundLeaf.output
              ),
              unilateralRefundWithoutReceiver: hn(
                w.unilateralRefundWithoutBoltzLeaf.output
              )
            }
          },
          status: u,
          type: "reverse",
          preimage: ""
        });
      } else if (Np(o)) {
        const { amount: l, lockupAddress: d, serverPublicKey: h, tree: p } = o.refundDetails;
        let w = "";
        try {
          w = (await this.swapProvider.getSwapPreimage(
            o.id
          )).preimage;
        } catch (f) {
          Q.warn(
            `Failed to restore preimage for submarine swap ${a}`,
            f
          );
        }
        i.push({
          id: a,
          type: "submarine",
          createdAt: c,
          preimage: w,
          preimageHash: o.preimageHash,
          status: u,
          request: {
            invoice: "",
            // TODO check if we can get the invoice from boltz
            refundPublicKey: t
          },
          response: {
            id: a,
            address: d,
            expectedAmount: l,
            claimPublicKey: h,
            timeoutBlockHeights: {
              refund: hn(
                p.refundWithoutBoltzLeaf.output
              ),
              unilateralClaim: hn(
                p.unilateralClaimLeaf.output
              ),
              unilateralRefund: hn(
                p.unilateralRefundLeaf.output
              ),
              unilateralRefundWithoutReceiver: hn(
                p.unilateralRefundWithoutBoltzLeaf.output
              )
            }
          }
        });
      }
    }
    return { reverseSwaps: r, submarineSwaps: i };
  }
  // Swap enrichment and validation helpers
  /**
   * Enrich a restored reverse swap with its preimage.
   * This makes the swap claimable via `claimVHTLC`.
   * Validates that the preimage hash matches the swap's expected preimageHash.
   *
   * @param swap - The restored reverse swap to enrich.
   * @param preimage - The preimage (hex-encoded) for the swap.
   * @returns The enriched swap object (same reference, mutated).
   * @throws Error if the preimage does not match the swap's preimageHash.
   */
  enrichReverseSwapPreimage(e, t) {
    const n = x.encode(lt(x.decode(t)));
    if (n !== e.request.preimageHash)
      throw new Error(
        `Preimage does not match swap: expected hash ${e.request.preimageHash}, got ${n}`
      );
    return e.preimage = t, e;
  }
  /**
   * Enrich a restored submarine swap with its invoice.
   * This makes the swap refundable via `refundVHTLC`.
   * Validates that the invoice is well-formed and its payment hash can be extracted.
   * If the swap has a preimageHash (from restoration), validates that the invoice's
   * payment hash matches.
   *
   * @param swap - The restored submarine swap to enrich.
   * @param invoice - The Lightning invoice for the swap.
   * @returns The enriched swap object (same reference, mutated).
   * @throws Error if the invoice is invalid, cannot be decoded, or payment hash doesn't match.
   */
  enrichSubmarineSwapInvoice(e, t) {
    let n;
    try {
      const r = sc(t);
      if (!r.paymentHash)
        throw new Error("Invoice missing payment hash");
      n = r.paymentHash;
    } catch (r) {
      throw r instanceof Error ? new Error(`Invalid Lightning invoice: ${r.message}`) : new Error("Invalid Lightning invoice format");
    }
    if (e.preimageHash && n !== e.preimageHash)
      throw new Error(
        `Invoice payment hash does not match swap: expected ${e.preimageHash}, got ${n}`
      );
    return e.request.invoice = t, e;
  }
  async claimVHTLCwithOffchainTx(e, t, n, r, i, s) {
    const o = x.decode(s.checkpointTapscript), a = kt.decode(
      o
    ), { arkTx: c, checkpoints: u } = no(
      [r],
      [i],
      a
    ), l = await e.sign(c), { arkTxid: d, finalArkTx: h, signedCheckpointTxs: p } = await this.arkProvider.submitTx(
      G.encode(l.toPSBT()),
      u.map((f) => G.encode(f.toPSBT()))
    );
    if (!this.validFinalArkTx(
      h,
      n,
      t.leaves
    ))
      throw new Error("Invalid final Ark transaction");
    const w = await Promise.all(
      p.map(async (f) => {
        const y = rt.fromPSBT(G.decode(f), {
          allowUnknown: !0
        }), E = await e.sign(y, [0]);
        return G.encode(E.toPSBT());
      })
    );
    await this.arkProvider.finalizeTx(d, w);
  }
  async refundVHTLCwithOffchainTx(e, t, n, r, i, s, o) {
    const a = x.decode(o.checkpointTapscript), c = kt.decode(
      a
    ), { arkTx: u, checkpoints: l } = no([i], [s], c);
    if (l.length !== 1)
      throw new Error(
        `Expected one checkpoint transaction, got ${l.length}`
      );
    const d = l[0], {
      transaction: h,
      checkpoint: p
    } = await this.swapProvider.refundSubmarineSwap(
      e.id,
      u,
      d
    ), w = x.encode(t);
    if (!Sr(h, 0, [w]))
      throw new Error("Invalid Boltz signature in refund transaction");
    if (!Sr(p, 0, [
      w
    ]))
      throw new Error(
        "Invalid Boltz signature in checkpoint transaction"
      );
    const f = await this.wallet.identity.sign(u), y = await this.wallet.identity.sign(d), E = vr(
      h,
      f
    ), I = vr(
      p,
      y
    ), { arkTxid: O, finalArkTx: B, signedCheckpointTxs: N } = await this.arkProvider.submitTx(
      G.encode(E.toPSBT()),
      [G.encode(d.toPSBT())]
    ), V = rt.fromPSBT(G.decode(B)), g = 0, M = [
      x.encode(n),
      x.encode(t),
      x.encode(r)
    ];
    if (!Sr(V, g, M))
      throw new Error("Invalid refund transaction");
    if (N.length !== 1)
      throw new Error(
        `Expected one signed checkpoint transaction, got ${N.length}`
      );
    const _ = rt.fromPSBT(
      G.decode(N[0])
    ), F = vr(
      I,
      _
    );
    await this.arkProvider.finalizeTx(O, [
      G.encode(F.toPSBT())
    ]);
  }
  // validators
  /**
   * Validates the final Ark transaction.
   * checks that all inputs have a signature for the given pubkey
   * and the signature is correct for the given tapscript leaf
   * TODO: This is a simplified check, we should verify the actual signatures
   * @param finalArkTx The final Ark transaction in PSBT format.
   * @param _pubkey The public key of the user.
   * @param _tapLeaves The taproot script leaves.
   * @returns True if the final Ark transaction is valid, false otherwise.
   */
  validFinalArkTx = (e, t, n) => {
    const r = rt.fromPSBT(G.decode(e), {
      allowUnknown: !0
    });
    if (!r) return !1;
    const i = [];
    for (let s = 0; s < r.inputsLength; s++)
      i.push(r.getInput(s));
    return i.every((s) => s.witnessUtxo);
  };
  /**
   * Creates a VHTLC script for the swap.
   * works for submarine swaps and reverse swaps
   * it creates a VHTLC script that can be used to claim or refund the swap
   * it validates the receiver, sender and server public keys are x-only
   * it validates the VHTLC script matches the expected lockup address
   * @param param0 - The parameters for creating the VHTLC script.
   * @returns The created VHTLC script.
   */
  createVHTLCScript({
    network: e,
    preimageHash: t,
    receiverPubkey: n,
    senderPubkey: r,
    serverPubkey: i,
    timeoutBlockHeights: s
  }) {
    const o = this.normalizeToXOnlyPublicKey(
      x.decode(n),
      "receiver"
    ), a = this.normalizeToXOnlyPublicKey(
      x.decode(r),
      "sender"
    ), c = this.normalizeToXOnlyPublicKey(
      x.decode(i),
      "server"
    ), u = (p) => p < 512 ? "blocks" : "seconds", l = new Js.Script({
      preimageHash: kf(t),
      sender: a,
      receiver: o,
      server: c,
      refundLocktime: BigInt(s.refund),
      unilateralClaimDelay: {
        type: u(s.unilateralClaim),
        value: BigInt(s.unilateralClaim)
      },
      unilateralRefundDelay: {
        type: u(s.unilateralRefund),
        value: BigInt(s.unilateralRefund)
      },
      unilateralRefundWithoutReceiverDelay: {
        type: u(
          s.unilateralRefundWithoutReceiver
        ),
        value: BigInt(
          s.unilateralRefundWithoutReceiver
        )
      }
    });
    if (!l) throw new Error("Failed to create VHTLC script");
    const d = e === "bitcoin" ? "ark" : "tark", h = l.address(d, c).encode();
    return { vhtlcScript: l, vhtlcAddress: h };
  }
  /**
   * Retrieves fees for swaps (in sats and percentage).
   * @returns The fees for swaps.
   */
  async getFees() {
    return this.swapProvider.getFees();
  }
  /**
   * Retrieves max and min limits for swaps (in sats).
   * @returns The limits for swaps.
   */
  async getLimits() {
    return this.swapProvider.getLimits();
  }
  /**
   * Retrieves swap status by ID.
   * @param swapId - The ID of the swap.
   * @returns The status of the swap.
   */
  async getSwapStatus(e) {
    return this.swapProvider.getSwapStatus(e);
  }
  /**
   * Retrieves all pending submarine swaps from storage.
   * This method filters the pending swaps to return only those with a status of 'invoice.set'.
   * It is useful for checking the status of all pending submarine swaps in the system.
   *
   * @returns PendingSubmarineSwap[]. If no swaps are found, it returns an empty array.
   */
  async getPendingSubmarineSwaps() {
    return (await this.swapRepository.getAllSwaps({
      status: "invoice.set",
      type: "submarine"
    })).filter(ui);
  }
  /**
   * Retrieves all pending reverse swaps from storage.
   * This method filters the pending swaps to return only those with a status of 'swap.created'.
   * It is useful for checking the status of all pending reverse swaps in the system.
   *
   * @returns PendingReverseSwap[]. If no swaps are found, it returns an empty array.
   */
  async getPendingReverseSwaps() {
    return (await this.swapRepository.getAllSwaps({
      status: "swap.created",
      type: "reverse"
    })).filter(Fn);
  }
  /**
   * Retrieves swap history from storage.
   * @returns Array of all swaps sorted by creation date (newest first). If no swaps are found, it returns an empty array.
   */
  async getSwapHistory() {
    return this.swapRepository.getAllSwaps({
      orderBy: "createdAt",
      orderDirection: "desc"
    });
  }
  /**
   * Refreshes the status of all pending swaps in the storage provider.
   * This method iterates through all pending reverse and submarine swaps,
   * checks their current status using the swap provider, and updates the storage provider accordingly.
   * It skips swaps that are already in a final status to avoid unnecessary API calls.
   * If no storage provider is set, the method exits early.
   * Errors during status refresh are logged to the console but do not interrupt the process.
   * @returns void
   * Important: a submarine swap with status payment.failedToPay is considered final and won't be refreshed.
   * User should manually retry or delete it if refund fails.
   */
  async refreshSwapsStatus() {
    const e = await this.swapRepository.getAllSwaps();
    for (const t of e)
      hu(t.status) || fu(t.status) || await this.getSwapStatus(t.id).then(
        ({ status: n }) => this.swapRepository.saveSwap({ ...t, status: n })
      ).catch((n) => {
        Q.error(
          `Failed to refresh swap status for ${t.id}:`,
          n
        );
      });
  }
  /**
   * Validate we are using a x-only public key
   * @param publicKey
   * @param keyName
   * @param swapId
   * @returns Uint8Array
   */
  normalizeToXOnlyPublicKey(e, t, n) {
    if (e.length === 33)
      return e.slice(1);
    if (e.length !== 32)
      throw new Error(
        `Invalid ${t} public key length: ${e.length} ${n ? "for swap " + n : ""}`
      );
    return e;
  }
  /**
   * Dispose of resources (stops SwapManager and cleans up)
   * Can be called manually or automatically with `await using` syntax (TypeScript 5.2+)
   */
  async dispose() {
    this.swapManager && await this.stopSwapManager();
  }
  /**
   * Symbol.asyncDispose for automatic cleanup with `await using` syntax
   * Example:
   * ```typescript
   * await using arkadeLightning = new ArkadeLightning({ ... });
   * // SwapManager automatically stopped when scope exits
   * ```
   */
  async [Symbol.asyncDispose]() {
    await this.dispose();
  }
};
async function* ac(e) {
  const t = [], n = [];
  let r = null, i = null;
  const s = (a) => {
    r ? (r(a), r = null) : t.push(a);
  }, o = () => {
    const a = new Error("EventSource error");
    i ? (i(a), i = null) : n.push(a);
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
      const a = await new Promise(
        (c, u) => {
          r = c, i = u;
        }
      ).finally(() => {
        r = null, i = null;
      });
      a && (yield a);
    }
  } finally {
    e.removeEventListener("message", s), e.removeEventListener("error", o);
  }
}
var zv = class extends Error {
  constructor(t, n, r, i) {
    super(n), this.code = t, this.message = n, this.name = r, this.metadata = i;
  }
};
function jv(e) {
  try {
    if (!(e instanceof Error)) return;
    const t = JSON.parse(e.message);
    if (!("details" in t) || !Array.isArray(t.details)) return;
    for (const n of t.details) {
      if (!("@type" in n) || n["@type"] !== "type.googleapis.com/ark.v1.ErrorDetails" || !("code" in n)) continue;
      const i = n.code;
      if (!("message" in n)) continue;
      const s = n.message;
      if (!("name" in n)) continue;
      const o = n.name;
      let a;
      return "metadata" in n && qv(n.metadata) && (a = n.metadata), new zv(i, s, o, a);
    }
    return;
  } catch {
    return;
  }
}
function qv(e) {
  return typeof e == "object" && e !== null && !Array.isArray(e);
}
var pu = /* @__PURE__ */ BigInt(0), cc = /* @__PURE__ */ BigInt(1);
function vd(e, t = "") {
  if (typeof e != "boolean") {
    const n = t && `"${t}" `;
    throw new Error(n + "expected boolean, got type=" + typeof e);
  }
  return e;
}
function Gv(e) {
  if (typeof e == "bigint") {
    if (!Xv(e))
      throw new Error("positive bigint expected, got " + e);
  } else
    be(e);
  return e;
}
function Dp(e) {
  if (typeof e != "string")
    throw new Error("hex string expected, got " + typeof e);
  return e === "" ? pu : BigInt("0x" + e);
}
function gu(e) {
  return Dp(cr(e));
}
function Vp(e) {
  return Dp(cr(Yv(X(e)).reverse()));
}
function wu(e, t) {
  be(t), e = Gv(e);
  const n = Rr(e.toString(16).padStart(t * 2, "0"));
  if (n.length !== t)
    throw new Error("number too large");
  return n;
}
function Fp(e, t) {
  return wu(e, t).reverse();
}
function Yv(e) {
  return Uint8Array.from(e);
}
function Zv(e) {
  return Uint8Array.from(e, (t, n) => {
    const r = t.charCodeAt(0);
    if (t.length !== 1 || r > 127)
      throw new Error(`string contains non-ASCII character "${e[n]}" with code ${r} at position ${n}`);
    return r;
  });
}
var Xv = (e) => typeof e == "bigint" && pu <= e;
function Qv(e) {
  let t;
  for (t = 0; e > pu; e >>= cc, t += 1)
    ;
  return t;
}
var Mp = (e) => (cc << BigInt(e)) - cc;
function Hp(e, t = {}, n = {}) {
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
function Ed(e) {
  const t = /* @__PURE__ */ new WeakMap();
  return (n, ...r) => {
    const i = t.get(n);
    if (i !== void 0)
      return i;
    const s = e(n, ...r);
    return t.set(n, s), s;
  };
}
var Lt = /* @__PURE__ */ BigInt(0), Pt = /* @__PURE__ */ BigInt(1), Yn = /* @__PURE__ */ BigInt(2), Kp = /* @__PURE__ */ BigInt(3), Wp = /* @__PURE__ */ BigInt(4), zp = /* @__PURE__ */ BigInt(5), Jv = /* @__PURE__ */ BigInt(7), jp = /* @__PURE__ */ BigInt(8), tE = /* @__PURE__ */ BigInt(9), qp = /* @__PURE__ */ BigInt(16);
function pe(e, t) {
  const n = e % t;
  return n >= Lt ? n : t + n;
}
function Jt(e, t, n) {
  let r = e;
  for (; t-- > Lt; )
    r *= r, r %= n;
  return r;
}
function Td(e, t) {
  if (e === Lt)
    throw new Error("invert: expected non-zero number");
  if (t <= Lt)
    throw new Error("invert: expected positive modulus, got " + t);
  let n = pe(e, t), r = t, i = Lt, s = Pt;
  for (; n !== Lt; ) {
    const a = r / n, c = r % n, u = i - s * a;
    r = n, n = c, i = s, s = u;
  }
  if (r !== Pt)
    throw new Error("invert: does not exist");
  return pe(i, t);
}
function yu(e, t, n) {
  if (!e.eql(e.sqr(t), n))
    throw new Error("Cannot find square root");
}
function Gp(e, t) {
  const n = (e.ORDER + Pt) / Wp, r = e.pow(t, n);
  return yu(e, r, t), r;
}
function eE(e, t) {
  const n = (e.ORDER - zp) / jp, r = e.mul(t, Yn), i = e.pow(r, n), s = e.mul(t, i), o = e.mul(e.mul(s, Yn), i), a = e.mul(s, e.sub(o, e.ONE));
  return yu(e, a, t), a;
}
function nE(e) {
  const t = Fo(e), n = Yp(e), r = n(t, t.neg(t.ONE)), i = n(t, r), s = n(t, t.neg(r)), o = (e + Jv) / qp;
  return (a, c) => {
    let u = a.pow(c, o), l = a.mul(u, r);
    const d = a.mul(u, i), h = a.mul(u, s), p = a.eql(a.sqr(l), c), w = a.eql(a.sqr(d), c);
    u = a.cmov(u, l, p), l = a.cmov(h, d, w);
    const f = a.eql(a.sqr(l), c), y = a.cmov(u, l, f);
    return yu(a, y, c), y;
  };
}
function Yp(e) {
  if (e < Kp)
    throw new Error("sqrt is not defined for small field");
  let t = e - Pt, n = 0;
  for (; t % Yn === Lt; )
    t /= Yn, n++;
  let r = Yn;
  const i = Fo(e);
  for (; Sd(i, r) === 1; )
    if (r++ > 1e3)
      throw new Error("Cannot find square root: probably non-prime P");
  if (n === 1)
    return Gp;
  let s = i.pow(r, t);
  const o = (t + Pt) / Yn;
  return function(c, u) {
    if (c.is0(u))
      return u;
    if (Sd(c, u) !== 1)
      throw new Error("Cannot find square root");
    let l = n, d = c.mul(c.ONE, s), h = c.pow(u, t), p = c.pow(u, o);
    for (; !c.eql(h, c.ONE); ) {
      if (c.is0(h))
        return c.ZERO;
      let w = 1, f = c.sqr(h);
      for (; !c.eql(f, c.ONE); )
        if (w++, f = c.sqr(f), w === l)
          throw new Error("Cannot find square root");
      const y = Pt << BigInt(l - w - 1), E = c.pow(d, y);
      l = w, d = c.sqr(E), h = c.mul(h, d), p = c.mul(p, E);
    }
    return p;
  };
}
function rE(e) {
  return e % Wp === Kp ? Gp : e % jp === zp ? eE : e % qp === tE ? nE(e) : Yp(e);
}
var iE = [
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
function sE(e) {
  const t = {
    ORDER: "bigint",
    BYTES: "number",
    BITS: "number"
  }, n = iE.reduce((r, i) => (r[i] = "function", r), t);
  return Hp(e, n), e;
}
function oE(e, t, n) {
  if (n < Lt)
    throw new Error("invalid exponent, negatives unsupported");
  if (n === Lt)
    return e.ONE;
  if (n === Pt)
    return t;
  let r = e.ONE, i = t;
  for (; n > Lt; )
    n & Pt && (r = e.mul(r, i)), i = e.sqr(i), n >>= Pt;
  return r;
}
function Zp(e, t, n = !1) {
  const r = new Array(t.length).fill(n ? e.ZERO : void 0), i = t.reduce((o, a, c) => e.is0(a) ? o : (r[c] = o, e.mul(o, a)), e.ONE), s = e.inv(i);
  return t.reduceRight((o, a, c) => e.is0(a) ? o : (r[c] = e.mul(o, r[c]), e.mul(o, a)), s), r;
}
function Sd(e, t) {
  const n = (e.ORDER - Pt) / Yn, r = e.pow(t, n), i = e.eql(r, e.ONE), s = e.eql(r, e.ZERO), o = e.eql(r, e.neg(e.ONE));
  if (!i && !s && !o)
    throw new Error("invalid Legendre symbol result");
  return i ? 1 : s ? 0 : -1;
}
function aE(e, t) {
  t !== void 0 && be(t);
  const n = t !== void 0 ? t : e.toString(2).length, r = Math.ceil(n / 8);
  return { nBitLength: n, nByteLength: r };
}
var cE = class {
  ORDER;
  BITS;
  BYTES;
  isLE;
  ZERO = Lt;
  ONE = Pt;
  _lengths;
  _sqrt;
  // cached sqrt
  _mod;
  constructor(e, t = {}) {
    if (e <= Lt)
      throw new Error("invalid field: expected ORDER > 0, got " + e);
    let n;
    this.isLE = !1, t != null && typeof t == "object" && (typeof t.BITS == "number" && (n = t.BITS), typeof t.sqrt == "function" && (this.sqrt = t.sqrt), typeof t.isLE == "boolean" && (this.isLE = t.isLE), t.allowedLengths && (this._lengths = t.allowedLengths?.slice()), typeof t.modFromBytes == "boolean" && (this._mod = t.modFromBytes));
    const { nBitLength: r, nByteLength: i } = aE(e, n);
    if (i > 2048)
      throw new Error("invalid field: expected ORDER of <= 2048 bytes");
    this.ORDER = e, this.BITS = r, this.BYTES = i, this._sqrt = void 0, Object.preventExtensions(this);
  }
  create(e) {
    return pe(e, this.ORDER);
  }
  isValid(e) {
    if (typeof e != "bigint")
      throw new Error("invalid field element: expected bigint, got " + typeof e);
    return Lt <= e && e < this.ORDER;
  }
  is0(e) {
    return e === Lt;
  }
  // is valid and invertible
  isValidNot0(e) {
    return !this.is0(e) && this.isValid(e);
  }
  isOdd(e) {
    return (e & Pt) === Pt;
  }
  neg(e) {
    return pe(-e, this.ORDER);
  }
  eql(e, t) {
    return e === t;
  }
  sqr(e) {
    return pe(e * e, this.ORDER);
  }
  add(e, t) {
    return pe(e + t, this.ORDER);
  }
  sub(e, t) {
    return pe(e - t, this.ORDER);
  }
  mul(e, t) {
    return pe(e * t, this.ORDER);
  }
  pow(e, t) {
    return oE(this, e, t);
  }
  div(e, t) {
    return pe(e * Td(t, this.ORDER), this.ORDER);
  }
  // Same as above, but doesn't normalize
  sqrN(e) {
    return e * e;
  }
  addN(e, t) {
    return e + t;
  }
  subN(e, t) {
    return e - t;
  }
  mulN(e, t) {
    return e * t;
  }
  inv(e) {
    return Td(e, this.ORDER);
  }
  sqrt(e) {
    return this._sqrt || (this._sqrt = rE(this.ORDER)), this._sqrt(this, e);
  }
  toBytes(e) {
    return this.isLE ? Fp(e, this.BYTES) : wu(e, this.BYTES);
  }
  fromBytes(e, t = !1) {
    X(e);
    const { _lengths: n, BYTES: r, isLE: i, ORDER: s, _mod: o } = this;
    if (n) {
      if (!n.includes(e.length) || e.length > r)
        throw new Error("Field.fromBytes: expected " + n + " bytes, got " + e.length);
      const c = new Uint8Array(r);
      c.set(e, i ? 0 : c.length - e.length), e = c;
    }
    if (e.length !== r)
      throw new Error("Field.fromBytes: expected " + r + " bytes, got " + e.length);
    let a = i ? Vp(e) : gu(e);
    if (o && (a = pe(a, s)), !t && !this.isValid(a))
      throw new Error("invalid field element: outside of range 0..ORDER");
    return a;
  }
  // TODO: we don't need it here, move out to separate fn
  invertBatch(e) {
    return Zp(this, e);
  }
  // We can't move this out because Fp6, Fp12 implement it
  // and it's unclear what to return in there.
  cmov(e, t, n) {
    return n ? t : e;
  }
};
function Fo(e, t = {}) {
  return new cE(e, t);
}
function Xp(e) {
  if (typeof e != "bigint")
    throw new Error("field order must be bigint");
  const t = e.toString(2).length;
  return Math.ceil(t / 8);
}
function uE(e) {
  const t = Xp(e);
  return t + Math.ceil(t / 2);
}
function lE(e, t, n = !1) {
  X(e);
  const r = e.length, i = Xp(t), s = uE(t);
  if (r < 16 || r < s || r > 1024)
    throw new Error("expected " + s + "-1024 bytes of input, got " + r);
  const o = n ? Vp(e) : gu(e), a = pe(o, t - Pt) + Pt;
  return n ? Fp(a, i) : wu(a, i);
}
var Mr = /* @__PURE__ */ BigInt(0), Zn = /* @__PURE__ */ BigInt(1);
function uo(e, t) {
  const n = t.negate();
  return e ? n : t;
}
function kd(e, t) {
  const n = Zp(e.Fp, t.map((r) => r.Z));
  return t.map((r, i) => e.fromAffine(r.toAffine(n[i])));
}
function Qp(e, t) {
  if (!Number.isSafeInteger(e) || e <= 0 || e > t)
    throw new Error("invalid window size, expected [1.." + t + "], got W=" + e);
}
function ba(e, t) {
  Qp(e, t);
  const n = Math.ceil(t / e) + 1, r = 2 ** (e - 1), i = 2 ** e, s = Mp(e), o = BigInt(e);
  return { windows: n, windowSize: r, mask: s, maxNumber: i, shiftBy: o };
}
function Id(e, t, n) {
  const { windowSize: r, mask: i, maxNumber: s, shiftBy: o } = n;
  let a = Number(e & i), c = e >> o;
  a > r && (a -= s, c += Zn);
  const u = t * r, l = u + Math.abs(a) - 1, d = a === 0, h = a < 0, p = t % 2 !== 0;
  return { nextN: c, offset: l, isZero: d, isNeg: h, isNegF: p, offsetF: u };
}
var xa = /* @__PURE__ */ new WeakMap(), Jp = /* @__PURE__ */ new WeakMap();
function va(e) {
  return Jp.get(e) || 1;
}
function Ad(e) {
  if (e !== Mr)
    throw new Error("invalid wNAF");
}
var dE = class {
  BASE;
  ZERO;
  Fn;
  bits;
  // Parametrized with a given Point class (not individual point)
  constructor(e, t) {
    this.BASE = e.BASE, this.ZERO = e.ZERO, this.Fn = e.Fn, this.bits = t;
  }
  // non-const time multiplication ladder
  _unsafeLadder(e, t, n = this.ZERO) {
    let r = e;
    for (; t > Mr; )
      t & Zn && (n = n.add(r)), r = r.double(), t >>= Zn;
    return n;
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
  precomputeWindow(e, t) {
    const { windows: n, windowSize: r } = ba(t, this.bits), i = [];
    let s = e, o = s;
    for (let a = 0; a < n; a++) {
      o = s, i.push(o);
      for (let c = 1; c < r; c++)
        o = o.add(s), i.push(o);
      s = o.double();
    }
    return i;
  }
  /**
   * Implements ec multiplication using precomputed tables and w-ary non-adjacent form.
   * More compact implementation:
   * https://github.com/paulmillr/noble-secp256k1/blob/47cb1669b6e506ad66b35fe7d76132ae97465da2/index.ts#L502-L541
   * @returns real and fake (for const-time) points
   */
  wNAF(e, t, n) {
    if (!this.Fn.isValid(n))
      throw new Error("invalid scalar");
    let r = this.ZERO, i = this.BASE;
    const s = ba(e, this.bits);
    for (let o = 0; o < s.windows; o++) {
      const { nextN: a, offset: c, isZero: u, isNeg: l, isNegF: d, offsetF: h } = Id(n, o, s);
      n = a, u ? i = i.add(uo(d, t[h])) : r = r.add(uo(l, t[c]));
    }
    return Ad(n), { p: r, f: i };
  }
  /**
   * Implements ec unsafe (non const-time) multiplication using precomputed tables and w-ary non-adjacent form.
   * @param acc accumulator point to add result of multiplication
   * @returns point
   */
  wNAFUnsafe(e, t, n, r = this.ZERO) {
    const i = ba(e, this.bits);
    for (let s = 0; s < i.windows && n !== Mr; s++) {
      const { nextN: o, offset: a, isZero: c, isNeg: u } = Id(n, s, i);
      if (n = o, !c) {
        const l = t[a];
        r = r.add(u ? l.negate() : l);
      }
    }
    return Ad(n), r;
  }
  getPrecomputes(e, t, n) {
    let r = xa.get(t);
    return r || (r = this.precomputeWindow(t, e), e !== 1 && (typeof n == "function" && (r = n(r)), xa.set(t, r))), r;
  }
  cached(e, t, n) {
    const r = va(e);
    return this.wNAF(r, this.getPrecomputes(r, e, n), t);
  }
  unsafe(e, t, n, r) {
    const i = va(e);
    return i === 1 ? this._unsafeLadder(e, t, r) : this.wNAFUnsafe(i, this.getPrecomputes(i, e, n), t, r);
  }
  // We calculate precomputes for elliptic curve point multiplication
  // using windowed method. This specifies window size and
  // stores precomputed values. Usually only base point would be precomputed.
  createCache(e, t) {
    Qp(t, this.bits), Jp.set(e, t), xa.delete(e);
  }
  hasCache(e) {
    return va(e) !== 1;
  }
};
function fE(e, t, n, r) {
  let i = t, s = e.ZERO, o = e.ZERO;
  for (; n > Mr || r > Mr; )
    n & Zn && (s = s.add(i)), r & Zn && (o = o.add(i)), i = i.double(), n >>= Zn, r >>= Zn;
  return { p1: s, p2: o };
}
function Rd(e, t, n) {
  if (t) {
    if (t.ORDER !== e)
      throw new Error("Field.ORDER must match order: Fp == p, Fn == n");
    return sE(t), t;
  } else
    return Fo(e, { isLE: n });
}
function hE(e, t, n = {}, r) {
  if (r === void 0 && (r = e === "edwards"), !t || typeof t != "object")
    throw new Error(`expected valid ${e} CURVE object`);
  for (const c of ["p", "n", "h"]) {
    const u = t[c];
    if (!(typeof u == "bigint" && u > Mr))
      throw new Error(`CURVE.${c} must be positive bigint`);
  }
  const i = Rd(t.p, n.Fp, r), s = Rd(t.n, n.Fn, r), a = ["Gx", "Gy", "a", "b"];
  for (const c of a)
    if (!i.isValid(t[c]))
      throw new Error(`CURVE.${c} must be valid field element of CURVE.Fp`);
  return t = Object.freeze(Object.assign({}, t)), { CURVE: t, Fp: i, Fn: s };
}
function pE(e, t) {
  return function(r) {
    const i = e(r);
    return { secretKey: i, publicKey: t(i) };
  };
}
var $d = (e, t) => (e + (e >= 0 ? t : -t) / wE) / t;
function gE(e, t, n) {
  const [[r, i], [s, o]] = t, a = $d(o * e, n), c = $d(-i * e, n);
  let u = e - a * r - c * s, l = -a * i - c * o;
  const d = u < di, h = l < di;
  d && (u = -u), h && (l = -l);
  const p = Mp(Math.ceil(Qv(n) / 2)) + Ss;
  if (u < di || u >= p || l < di || l >= p)
    throw new Error("splitScalar (endomorphism): failed, k=" + e);
  return { k1neg: d, k1: u, k2neg: h, k2: l };
}
var di = BigInt(0), Ss = BigInt(1), wE = BigInt(2), ns = BigInt(3), yE = BigInt(4);
function mE(e, t = {}) {
  const n = hE("weierstrass", e, t), { Fp: r, Fn: i } = n;
  let s = n.CURVE;
  const { h: o, n: a } = s;
  Hp(t, {}, {
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
  const u = xE(r, i);
  function l() {
    if (!r.isOdd)
      throw new Error("compression is not supported: Field does not have .isOdd()");
  }
  function d(S, m, v) {
    const { x: b, y: T } = m.toAffine(), k = r.toBytes(b);
    if (vd(v, "isCompressed"), v) {
      l();
      const P = !r.isOdd(T);
      return $t(bE(P), k);
    } else
      return $t(Uint8Array.of(4), k, r.toBytes(T));
  }
  function h(S) {
    X(S, void 0, "Point");
    const { publicKey: m, publicKeyUncompressed: v } = u, b = S.length, T = S[0], k = S.subarray(1);
    if (b === m && (T === 2 || T === 3)) {
      const P = r.fromBytes(k);
      if (!r.isValid(P))
        throw new Error("bad point: is not on curve, wrong x");
      const C = f(P);
      let $;
      try {
        $ = r.sqrt(C);
      } catch (z) {
        const H = z instanceof Error ? ": " + z.message : "";
        throw new Error("bad point: is not on curve, sqrt error" + H);
      }
      l();
      const R = r.isOdd($);
      return (T & 1) === 1 !== R && ($ = r.neg($)), { x: P, y: $ };
    } else if (b === v && T === 4) {
      const P = r.BYTES, C = r.fromBytes(k.subarray(0, P)), $ = r.fromBytes(k.subarray(P, P * 2));
      if (!y(C, $))
        throw new Error("bad point: is not on curve");
      return { x: C, y: $ };
    } else
      throw new Error(`bad point: got length ${b}, expected compressed=${m} or uncompressed=${v}`);
  }
  const p = t.toBytes || d, w = t.fromBytes || h;
  function f(S) {
    const m = r.sqr(S), v = r.mul(m, S);
    return r.add(r.add(v, r.mul(S, s.a)), s.b);
  }
  function y(S, m) {
    const v = r.sqr(m), b = f(S);
    return r.eql(v, b);
  }
  if (!y(s.Gx, s.Gy))
    throw new Error("bad curve params: generator point");
  const E = r.mul(r.pow(s.a, ns), yE), I = r.mul(r.sqr(s.b), BigInt(27));
  if (r.is0(r.add(E, I)))
    throw new Error("bad curve params: a or b");
  function O(S, m, v = !1) {
    if (!r.isValid(m) || v && r.is0(m))
      throw new Error(`bad point coordinate ${S}`);
    return m;
  }
  function B(S) {
    if (!(S instanceof _))
      throw new Error("Weierstrass Point expected");
  }
  function N(S) {
    if (!c || !c.basises)
      throw new Error("no endo");
    return gE(S, c.basises, i.ORDER);
  }
  const V = Ed((S, m) => {
    const { X: v, Y: b, Z: T } = S;
    if (r.eql(T, r.ONE))
      return { x: v, y: b };
    const k = S.is0();
    m == null && (m = k ? r.ONE : r.inv(T));
    const P = r.mul(v, m), C = r.mul(b, m), $ = r.mul(T, m);
    if (k)
      return { x: r.ZERO, y: r.ZERO };
    if (!r.eql($, r.ONE))
      throw new Error("invZ was invalid");
    return { x: P, y: C };
  }), g = Ed((S) => {
    if (S.is0()) {
      if (t.allowInfinityPoint && !r.is0(S.Y))
        return;
      throw new Error("bad point: ZERO");
    }
    const { x: m, y: v } = S.toAffine();
    if (!r.isValid(m) || !r.isValid(v))
      throw new Error("bad point: x or y not field elements");
    if (!y(m, v))
      throw new Error("bad point: equation left != right");
    if (!S.isTorsionFree())
      throw new Error("bad point: not in prime-order subgroup");
    return !0;
  });
  function M(S, m, v, b, T) {
    return v = new _(r.mul(v.X, S), v.Y, v.Z), m = uo(b, m), v = uo(T, v), m.add(v);
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
    constructor(m, v, b) {
      this.X = O("x", m), this.Y = O("y", v, !0), this.Z = O("z", b), Object.freeze(this);
    }
    static CURVE() {
      return s;
    }
    /** Does NOT validate if the point is valid. Use `.assertValidity()`. */
    static fromAffine(m) {
      const { x: v, y: b } = m || {};
      if (!m || !r.isValid(v) || !r.isValid(b))
        throw new Error("invalid affine point");
      if (m instanceof _)
        throw new Error("projective point not allowed");
      return r.is0(v) && r.is0(b) ? _.ZERO : new _(v, b, r.ONE);
    }
    static fromBytes(m) {
      const v = _.fromAffine(w(X(m, void 0, "point")));
      return v.assertValidity(), v;
    }
    static fromHex(m) {
      return _.fromBytes(Rr(m));
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
    precompute(m = 8, v = !0) {
      return A.createCache(this, m), v || this.multiply(ns), this;
    }
    // TODO: return `this`
    /** A point on curve is valid if it conforms to equation. */
    assertValidity() {
      g(this);
    }
    hasEvenY() {
      const { y: m } = this.toAffine();
      if (!r.isOdd)
        throw new Error("Field doesn't support isOdd");
      return !r.isOdd(m);
    }
    /** Compare one point to another. */
    equals(m) {
      B(m);
      const { X: v, Y: b, Z: T } = this, { X: k, Y: P, Z: C } = m, $ = r.eql(r.mul(v, C), r.mul(k, T)), R = r.eql(r.mul(b, C), r.mul(P, T));
      return $ && R;
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
      const { a: m, b: v } = s, b = r.mul(v, ns), { X: T, Y: k, Z: P } = this;
      let C = r.ZERO, $ = r.ZERO, R = r.ZERO, U = r.mul(T, T), z = r.mul(k, k), H = r.mul(P, P), L = r.mul(T, k);
      return L = r.add(L, L), R = r.mul(T, P), R = r.add(R, R), C = r.mul(m, R), $ = r.mul(b, H), $ = r.add(C, $), C = r.sub(z, $), $ = r.add(z, $), $ = r.mul(C, $), C = r.mul(L, C), R = r.mul(b, R), H = r.mul(m, H), L = r.sub(U, H), L = r.mul(m, L), L = r.add(L, R), R = r.add(U, U), U = r.add(R, U), U = r.add(U, H), U = r.mul(U, L), $ = r.add($, U), H = r.mul(k, P), H = r.add(H, H), U = r.mul(H, L), C = r.sub(C, U), R = r.mul(H, z), R = r.add(R, R), R = r.add(R, R), new _(C, $, R);
    }
    // Renes-Costello-Batina exception-free addition formula.
    // There is 30% faster Jacobian formula, but it is not complete.
    // https://eprint.iacr.org/2015/1060, algorithm 1
    // Cost: 12M + 0S + 3*a + 3*b3 + 23add.
    add(m) {
      B(m);
      const { X: v, Y: b, Z: T } = this, { X: k, Y: P, Z: C } = m;
      let $ = r.ZERO, R = r.ZERO, U = r.ZERO;
      const z = s.a, H = r.mul(s.b, ns);
      let L = r.mul(v, k), W = r.mul(b, P), Y = r.mul(T, C), nt = r.add(v, b), j = r.add(k, P);
      nt = r.mul(nt, j), j = r.add(L, W), nt = r.sub(nt, j), j = r.add(v, T);
      let J = r.add(k, C);
      return j = r.mul(j, J), J = r.add(L, Y), j = r.sub(j, J), J = r.add(b, T), $ = r.add(P, C), J = r.mul(J, $), $ = r.add(W, Y), J = r.sub(J, $), U = r.mul(z, j), $ = r.mul(H, Y), U = r.add($, U), $ = r.sub(W, U), U = r.add(W, U), R = r.mul($, U), W = r.add(L, L), W = r.add(W, L), Y = r.mul(z, Y), j = r.mul(H, j), W = r.add(W, Y), Y = r.sub(L, Y), Y = r.mul(z, Y), j = r.add(j, Y), L = r.mul(W, j), R = r.add(R, L), L = r.mul(J, j), $ = r.mul(nt, $), $ = r.sub($, L), L = r.mul(nt, W), U = r.mul(J, U), U = r.add(U, L), new _($, R, U);
    }
    subtract(m) {
      return this.add(m.negate());
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
    multiply(m) {
      const { endo: v } = t;
      if (!i.isValidNot0(m))
        throw new Error("invalid scalar: out of range");
      let b, T;
      const k = (P) => A.cached(this, P, (C) => kd(_, C));
      if (v) {
        const { k1neg: P, k1: C, k2neg: $, k2: R } = N(m), { p: U, f: z } = k(C), { p: H, f: L } = k(R);
        T = z.add(L), b = M(v.beta, U, H, P, $);
      } else {
        const { p: P, f: C } = k(m);
        b = P, T = C;
      }
      return kd(_, [b, T])[0];
    }
    /**
     * Non-constant-time multiplication. Uses double-and-add algorithm.
     * It's faster, but should only be used when you don't care about
     * an exposed secret key e.g. sig verification, which works over *public* keys.
     */
    multiplyUnsafe(m) {
      const { endo: v } = t, b = this;
      if (!i.isValid(m))
        throw new Error("invalid scalar: out of range");
      if (m === di || b.is0())
        return _.ZERO;
      if (m === Ss)
        return b;
      if (A.hasCache(this))
        return this.multiply(m);
      if (v) {
        const { k1neg: T, k1: k, k2neg: P, k2: C } = N(m), { p1: $, p2: R } = fE(_, b, k, C);
        return M(v.beta, $, R, T, P);
      } else
        return A.unsafe(b, m);
    }
    /**
     * Converts Projective point to affine (x, y) coordinates.
     * @param invertedZ Z^-1 (inverted zero) - optional, precomputation is useful for invertBatch
     */
    toAffine(m) {
      return V(this, m);
    }
    /**
     * Checks whether Point is free of torsion elements (is in prime subgroup).
     * Always torsion-free for cofactor=1 curves.
     */
    isTorsionFree() {
      const { isTorsionFree: m } = t;
      return o === Ss ? !0 : m ? m(_, this) : A.unsafe(this, a).is0();
    }
    clearCofactor() {
      const { clearCofactor: m } = t;
      return o === Ss ? this : m ? m(_, this) : this.multiplyUnsafe(o);
    }
    isSmallOrder() {
      return this.multiplyUnsafe(o).is0();
    }
    toBytes(m = !0) {
      return vd(m, "isCompressed"), this.assertValidity(), p(_, this, m);
    }
    toHex(m = !0) {
      return cr(this.toBytes(m));
    }
    toString() {
      return `<Point ${this.is0() ? "ZERO" : this.toHex()}>`;
    }
  }
  const F = i.BITS, A = new dE(_, t.endo ? Math.ceil(F / 2) : F);
  return _.BASE.precompute(8), _;
}
function bE(e) {
  return Uint8Array.of(e ? 2 : 3);
}
function xE(e, t) {
  return {
    secretKey: t.BYTES,
    publicKey: 1 + e.BYTES,
    publicKeyUncompressed: 1 + 2 * e.BYTES,
    publicKeyHasPrefix: !0,
    signature: 2 * t.BYTES
  };
}
var Mo = {
  p: BigInt("0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffefffffc2f"),
  n: BigInt("0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141"),
  h: BigInt(1),
  a: BigInt(0),
  b: BigInt(7),
  Gx: BigInt("0x79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798"),
  Gy: BigInt("0x483ada7726a3c4655da4fbfc0e1108a8fd17b448a68554199c47d08ffb10d4b8")
}, vE = {
  beta: BigInt("0x7ae96a2b657c07106e64479eac3434e99cf0497512f58995c1396c28719501ee"),
  basises: [
    [BigInt("0x3086d221a7d46bcde86c90e49284eb15"), -BigInt("0xe4437ed6010e88286f547fa90abfe4c3")],
    [BigInt("0x114ca50f7a8e2f3f657c1108d9d44cfd8"), BigInt("0x3086d221a7d46bcde86c90e49284eb15")]
  ]
}, EE = /* @__PURE__ */ BigInt(0), uc = /* @__PURE__ */ BigInt(2);
function TE(e) {
  const t = Mo.p, n = BigInt(3), r = BigInt(6), i = BigInt(11), s = BigInt(22), o = BigInt(23), a = BigInt(44), c = BigInt(88), u = e * e * e % t, l = u * u * e % t, d = Jt(l, n, t) * l % t, h = Jt(d, n, t) * l % t, p = Jt(h, uc, t) * u % t, w = Jt(p, i, t) * p % t, f = Jt(w, s, t) * w % t, y = Jt(f, a, t) * f % t, E = Jt(y, c, t) * y % t, I = Jt(E, a, t) * f % t, O = Jt(I, n, t) * l % t, B = Jt(O, o, t) * w % t, N = Jt(B, r, t) * u % t, V = Jt(N, uc, t);
  if (!lo.eql(lo.sqr(V), e))
    throw new Error("Cannot find square root");
  return V;
}
var lo = Fo(Mo.p, { sqrt: TE }), Yr = /* @__PURE__ */ mE(Mo, {
  Fp: lo,
  endo: vE
}), Od = {};
function fo(e, ...t) {
  let n = Od[e];
  if (n === void 0) {
    const r = lt(Zv(e));
    n = $t(r, r), Od[e] = n;
  }
  return lt($t(n, ...t));
}
var mu = (e) => e.toBytes(!0).slice(1), bu = (e) => e % uc === EE;
function lc(e) {
  const { Fn: t, BASE: n } = Yr, r = t.fromBytes(e), i = n.multiply(r);
  return { scalar: bu(i.y) ? r : t.neg(r), bytes: mu(i) };
}
function tg(e) {
  const t = lo;
  if (!t.isValidNot0(e))
    throw new Error("invalid x: Fail if x ≥ p");
  const n = t.create(e * e), r = t.create(n * e + BigInt(7));
  let i = t.sqrt(r);
  bu(i) || (i = t.neg(i));
  const s = Yr.fromAffine({ x: e, y: i });
  return s.assertValidity(), s;
}
var Ei = gu;
function eg(...e) {
  return Yr.Fn.create(Ei(fo("BIP0340/challenge", ...e)));
}
function Cd(e) {
  return lc(e).bytes;
}
function SE(e, t, n = Nn(32)) {
  const { Fn: r } = Yr, i = X(e, void 0, "message"), { bytes: s, scalar: o } = lc(t), a = X(n, 32, "auxRand"), c = r.toBytes(o ^ Ei(fo("BIP0340/aux", a))), u = fo("BIP0340/nonce", c, s, i), { bytes: l, scalar: d } = lc(u), h = eg(l, s, i), p = new Uint8Array(64);
  if (p.set(l, 0), p.set(r.toBytes(r.create(d + h * o)), 32), !ng(p, i, s))
    throw new Error("sign: Invalid signature produced");
  return p;
}
function ng(e, t, n) {
  const { Fp: r, Fn: i, BASE: s } = Yr, o = X(e, 64, "signature"), a = X(t, void 0, "message"), c = X(n, 32, "publicKey");
  try {
    const u = tg(Ei(c)), l = Ei(o.subarray(0, 32));
    if (!r.isValidNot0(l))
      return !1;
    const d = Ei(o.subarray(32, 64));
    if (!i.isValidNot0(d))
      return !1;
    const h = eg(i.toBytes(l), mu(u), a), p = s.multiplyUnsafe(d).add(u.multiplyUnsafe(i.neg(h))), { x: w, y: f } = p.toAffine();
    return !(p.is0() || !bu(f) || w !== l);
  } catch {
    return !1;
  }
}
var kE = /* @__PURE__ */ (() => {
  const n = (r = Nn(48)) => lE(r, Mo.n);
  return {
    keygen: pE(n, Cd),
    getPublicKey: Cd,
    sign: SE,
    verify: ng,
    Point: Yr,
    utils: {
      randomSecretKey: n,
      taggedHash: fo,
      lift_x: tg,
      pointToBytes: mu
    },
    lengths: {
      secretKey: 32,
      publicKey: 32,
      publicKeyHasPrefix: !1,
      signature: 64,
      seed: 48
    }
  };
})(), xu = class extends rt {
  static ARK_TX_OPTS = {
    allowUnknown: !0,
    allowUnknownOutputs: !0,
    allowUnknownInputs: !0
  };
  constructor(e) {
    super(Ea(e));
  }
  static fromPSBT(e, t) {
    return rt.fromPSBT(e, Ea(t));
  }
  static fromRaw(e, t) {
    return rt.fromRaw(e, Ea(t));
  }
};
function Ea(e) {
  return { ...xu.ARK_TX_OPTS, ...e };
}
var Ti;
((e) => {
  function t(i, s, o = []) {
    if (typeof i != "string" && (i = r(i)), s.length == 0)
      throw new Error("intent proof requires at least one input");
    CE(s), BE(o);
    const a = NE(i, s[0].witnessUtxo.script);
    return _E(a, s, o);
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
      throw new Error(
        `intent proof output amount is greater than input amount: ${o} > ${s}`
      );
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
})(Ti || (Ti = {}));
var IE = new Uint8Array([pt.RETURN]), AE = new Uint8Array(32).fill(0), RE = 4294967295, $E = "ark-intent-proof-message";
function OE(e) {
  if (e.index === void 0)
    throw new Error("intent proof input requires index");
  if (e.txid === void 0)
    throw new Error("intent proof input requires txid");
  if (e.witnessUtxo === void 0)
    throw new Error("intent proof input requires witness utxo");
  return !0;
}
function CE(e) {
  return e.forEach(OE), !0;
}
function PE(e) {
  if (e.amount === void 0)
    throw new Error("intent proof output requires amount");
  if (e.script === void 0)
    throw new Error("intent proof output requires script");
  return !0;
}
function BE(e) {
  return e.forEach(PE), !0;
}
function NE(e, t) {
  const n = UE(e), r = new xu({
    version: 0
  });
  return r.addInput({
    txid: AE,
    // zero hash
    index: RE,
    sequence: 0
  }), r.addOutput({
    amount: 0n,
    script: t
  }), r.updateInput(0, {
    finalScriptSig: K.encode(["OP_0", n])
  }), r;
}
function _E(e, t, n) {
  const r = t[0], i = t.map((o) => o.sequence || 0).reduce((o, a) => Math.max(o, a), 0), s = new xu({
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
    sighashType: It.ALL
  });
  for (const [o, a] of t.entries())
    s.addInput({
      ...a,
      sighashType: It.ALL
    }), a.unknown?.length && s.updateInput(o + 1, {
      unknown: a.unknown
    });
  n.length === 0 && (n = [
    {
      amount: 0n,
      script: IE
    }
  ]);
  for (const o of n)
    s.addOutput({
      amount: o.amount,
      script: o.script
    });
  return s;
}
function UE(e) {
  return kE.utils.taggedHash(
    $E,
    new TextEncoder().encode(e)
  );
}
var LE = class {
  constructor(t) {
    this.serverUrl = t;
  }
  async getInfo() {
    const t = `${this.serverUrl}/v1/info`, n = await fetch(t);
    if (!n.ok) {
      const i = await n.text();
      $e(
        i,
        `Failed to get server info: ${n.statusText}`
      );
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
        duration: BigInt(
          r.scheduledSession.duration ?? 0
        ),
        nextStartTime: BigInt(
          r.scheduledSession.nextStartTime ?? 0
        ),
        nextEndTime: BigInt(
          r.scheduledSession.nextEndTime ?? 0
        ),
        period: BigInt(
          r.scheduledSession.period ?? 0
        ),
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
      $e(
        o,
        `Failed to submit virtual transaction: ${o}`
      );
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
      $e(
        s,
        `Failed to finalize offchain transaction: ${s}`
      );
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
          message: Ti.encodeMessage(t.message)
        }
      })
    });
    if (!r.ok) {
      const s = await r.text();
      $e(s, `Failed to register intent: ${s}`);
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
          message: Ti.encodeMessage(t.message)
        }
      })
    });
    if (!r.ok) {
      const i = await r.text();
      $e(i, `Failed to delete intent: ${i}`);
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
      $e(
        i,
        `Failed to confirm registration: ${i}`
      );
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
        treeNonces: DE(r)
      })
    });
    if (!s.ok) {
      const o = await s.text();
      $e(
        o,
        `Failed to submit tree nonces: ${o}`
      );
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
        treeSignatures: VE(r)
      })
    });
    if (!s.ok) {
      const o = await s.text();
      $e(
        o,
        `Failed to submit tree signatures: ${o}`
      );
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
      $e(
        s,
        `Failed to submit forfeit transactions: ${i.statusText}`
      );
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
          for await (const a of ac(
            s
          )) {
            if (t?.aborted) break;
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
        if (dc(s)) {
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
          for await (const s of ac(
            r
          )) {
            if (t?.aborted) break;
            try {
              const o = JSON.parse(s.data), a = this.parseTransactionNotification(o);
              a && (yield a);
            } catch (o) {
              throw console.error(
                "Failed to parse transaction notification:",
                o
              ), o;
            }
          }
        } finally {
          t?.removeEventListener("abort", i), r.close();
        }
      } catch (r) {
        if (r instanceof Error && r.name === "AbortError")
          break;
        if (dc(r)) {
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
          message: Ti.encodeMessage(t.message)
        }
      })
    });
    if (!r.ok) {
      const s = await r.text();
      $e(
        s,
        `Failed to get pending transactions: ${s}`
      );
    }
    return (await r.json()).pendingTxs;
  }
  parseSettlementEvent(t) {
    if (t.batchStarted)
      return {
        type: "batch_started",
        id: t.batchStarted.id,
        intentIdHashes: t.batchStarted.intentIdHashes,
        batchExpiry: BigInt(t.batchStarted.batchExpiry)
      };
    if (t.batchFinalization)
      return {
        type: "batch_finalization",
        id: t.batchFinalization.id,
        commitmentTx: t.batchFinalization.commitmentTx
      };
    if (t.batchFinalized)
      return {
        type: "batch_finalized",
        id: t.batchFinalized.id,
        commitmentTxid: t.batchFinalized.commitmentTxid
      };
    if (t.batchFailed)
      return {
        type: "batch_failed",
        id: t.batchFailed.id,
        reason: t.batchFailed.reason
      };
    if (t.treeSigningStarted)
      return {
        type: "tree_signing_started",
        id: t.treeSigningStarted.id,
        cosignersPublicKeys: t.treeSigningStarted.cosignersPubkeys,
        unsignedCommitmentTx: t.treeSigningStarted.unsignedCommitmentTx
      };
    if (t.treeNoncesAggregated)
      return null;
    if (t.treeNonces)
      return {
        type: "tree_nonces",
        id: t.treeNonces.id,
        topic: t.treeNonces.topic,
        txid: t.treeNonces.txid,
        nonces: FE(t.treeNonces.nonces)
        // pubkey -> public nonce
      };
    if (t.treeTx) {
      const n = Object.fromEntries(
        Object.entries(t.treeTx.children).map(
          ([r, i]) => [parseInt(r), i]
        )
      );
      return {
        type: "tree_tx",
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
      type: "tree_signature",
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
        spentVtxos: t.commitmentTx.spentVtxos.map(rs),
        spendableVtxos: t.commitmentTx.spendableVtxos.map(rs),
        checkpointTxs: t.commitmentTx.checkpointTxs
      }
    } : t.arkTx ? {
      arkTx: {
        txid: t.arkTx.txid,
        tx: t.arkTx.tx,
        spentVtxos: t.arkTx.spentVtxos.map(rs),
        spendableVtxos: t.arkTx.spendableVtxos.map(rs),
        checkpointTxs: t.arkTx.checkpointTxs
      }
    } : (t.heartbeat || console.warn("Unknown transaction notification type:", t), null);
  }
};
function DE(e) {
  const t = {};
  for (const [n, r] of e)
    t[n] = x.encode(r.pubNonce);
  return t;
}
function VE(e) {
  const t = {};
  for (const [n, r] of e)
    t[n] = x.encode(r.encode());
  return t;
}
function FE(e) {
  return new Map(
    Object.entries(e).map(([t, n]) => {
      if (typeof n != "string")
        throw new Error("invalid nonce");
      return [t, { pubNonce: x.decode(n) }];
    })
  );
}
function dc(e) {
  const t = (n) => n instanceof Error ? n.name === "TypeError" && n.message === "Failed to fetch" || n.name === "HeadersTimeoutError" || n.name === "BodyTimeoutError" || n.code === "UND_ERR_HEADERS_TIMEOUT" || n.code === "UND_ERR_BODY_TIMEOUT" : !1;
  return t(e) || t(e.cause);
}
function rs(e) {
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
function $e(e, t) {
  const n = new Error(e);
  throw jv(n) ?? new Error(t);
}
var rg = /* @__PURE__ */ ((e) => (e[e.INDEXER_TX_TYPE_UNSPECIFIED = 0] = "INDEXER_TX_TYPE_UNSPECIFIED", e[e.INDEXER_TX_TYPE_RECEIVED = 1] = "INDEXER_TX_TYPE_RECEIVED", e[e.INDEXER_TX_TYPE_SENT = 2] = "INDEXER_TX_TYPE_SENT", e))(rg || {}), ig = /* @__PURE__ */ ((e) => (e.UNSPECIFIED = "INDEXER_CHAINED_TX_TYPE_UNSPECIFIED", e.COMMITMENT = "INDEXER_CHAINED_TX_TYPE_COMMITMENT", e.ARK = "INDEXER_CHAINED_TX_TYPE_ARK", e.TREE = "INDEXER_CHAINED_TX_TYPE_TREE", e.CHECKPOINT = "INDEXER_CHAINED_TX_TYPE_CHECKPOINT", e))(ig || {}), ME = class {
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
    if (!ue.isVtxoTreeResponse(o))
      throw new Error("Invalid vtxo tree data received");
    return o.vtxoTree.forEach((a) => {
      a.children = Object.fromEntries(
        Object.entries(a.children).map(([c, u]) => [
          Number(c),
          u
        ])
      );
    }), o;
  }
  async getVtxoTreeLeaves(t, n) {
    let r = `${this.serverUrl}/v1/indexer/batch/${t.txid}/${t.vout}/tree/leaves`;
    const i = new URLSearchParams();
    n && (n.pageIndex !== void 0 && i.append("page.index", n.pageIndex.toString()), n.pageSize !== void 0 && i.append("page.size", n.pageSize.toString())), i.toString() && (r += "?" + i.toString());
    const s = await fetch(r);
    if (!s.ok)
      throw new Error(
        `Failed to fetch vtxo tree leaves: ${s.statusText}`
      );
    const o = await s.json();
    if (!ue.isVtxoTreeLeavesResponse(o))
      throw new Error("Invalid vtxos tree leaves data received");
    return o;
  }
  async getBatchSweepTransactions(t) {
    const n = `${this.serverUrl}/v1/indexer/batch/${t.txid}/${t.vout}/sweepTxs`, r = await fetch(n);
    if (!r.ok)
      throw new Error(
        `Failed to fetch batch sweep transactions: ${r.statusText}`
      );
    const i = await r.json();
    if (!ue.isBatchSweepTransactionsResponse(i))
      throw new Error("Invalid batch sweep transactions data received");
    return i;
  }
  async getCommitmentTx(t) {
    const n = `${this.serverUrl}/v1/indexer/commitmentTx/${t}`, r = await fetch(n);
    if (!r.ok)
      throw new Error(`Failed to fetch commitment tx: ${r.statusText}`);
    const i = await r.json();
    if (!ue.isCommitmentTx(i))
      throw new Error("Invalid commitment tx data received");
    return i;
  }
  async getCommitmentTxConnectors(t, n) {
    let r = `${this.serverUrl}/v1/indexer/commitmentTx/${t}/connectors`;
    const i = new URLSearchParams();
    n && (n.pageIndex !== void 0 && i.append("page.index", n.pageIndex.toString()), n.pageSize !== void 0 && i.append("page.size", n.pageSize.toString())), i.toString() && (r += "?" + i.toString());
    const s = await fetch(r);
    if (!s.ok)
      throw new Error(
        `Failed to fetch commitment tx connectors: ${s.statusText}`
      );
    const o = await s.json();
    if (!ue.isConnectorsResponse(o))
      throw new Error("Invalid commitment tx connectors data received");
    return o.connectors.forEach((a) => {
      a.children = Object.fromEntries(
        Object.entries(a.children).map(([c, u]) => [
          Number(c),
          u
        ])
      );
    }), o;
  }
  async getCommitmentTxForfeitTxs(t, n) {
    let r = `${this.serverUrl}/v1/indexer/commitmentTx/${t}/forfeitTxs`;
    const i = new URLSearchParams();
    n && (n.pageIndex !== void 0 && i.append("page.index", n.pageIndex.toString()), n.pageSize !== void 0 && i.append("page.size", n.pageSize.toString())), i.toString() && (r += "?" + i.toString());
    const s = await fetch(r);
    if (!s.ok)
      throw new Error(
        `Failed to fetch commitment tx forfeitTxs: ${s.statusText}`
      );
    const o = await s.json();
    if (!ue.isForfeitTxsResponse(o))
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
          for await (const o of ac(
            i
          )) {
            if (n?.aborted) break;
            try {
              const a = JSON.parse(o.data);
              a.event && (yield {
                txid: a.event.txid,
                scripts: a.event.scripts || [],
                newVtxos: (a.event.newVtxos || []).map(
                  is
                ),
                spentVtxos: (a.event.spentVtxos || []).map(is),
                sweptVtxos: (a.event.sweptVtxos || []).map(is),
                tx: a.event.tx,
                checkpointTxs: a.event.checkpointTxs
              });
            } catch (a) {
              throw console.error(
                "Failed to parse subscription event:",
                a
              ), a;
            }
          }
        } finally {
          n?.removeEventListener("abort", s), i.close();
        }
      } catch (i) {
        if (i instanceof Error && i.name === "AbortError")
          break;
        if (dc(i)) {
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
    if (!ue.isVirtualTxsResponse(o))
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
    if (!ue.isVtxoChainResponse(o))
      throw new Error("Invalid vtxo chain data received");
    return o;
  }
  async getVtxos(t) {
    if (t?.scripts && t?.outpoints)
      throw new Error(
        "scripts and outpoints are mutually exclusive options"
      );
    if (!t?.scripts && !t?.outpoints)
      throw new Error("Either scripts or outpoints must be provided");
    let n = `${this.serverUrl}/v1/indexer/vtxos`;
    const r = new URLSearchParams();
    t?.scripts && t.scripts.length > 0 && t.scripts.forEach((o) => {
      r.append("scripts", o);
    }), t?.outpoints && t.outpoints.length > 0 && t.outpoints.forEach((o) => {
      r.append("outpoints", `${o.txid}:${o.vout}`);
    }), t && (t.spendableOnly !== void 0 && r.append("spendableOnly", t.spendableOnly.toString()), t.spentOnly !== void 0 && r.append("spentOnly", t.spentOnly.toString()), t.recoverableOnly !== void 0 && r.append(
      "recoverableOnly",
      t.recoverableOnly.toString()
    ), t.pageIndex !== void 0 && r.append("page.index", t.pageIndex.toString()), t.pageSize !== void 0 && r.append("page.size", t.pageSize.toString())), r.toString() && (n += "?" + r.toString());
    const i = await fetch(n);
    if (!i.ok)
      throw new Error(`Failed to fetch vtxos: ${i.statusText}`);
    const s = await i.json();
    if (!ue.isVtxosResponse(s))
      throw new Error("Invalid vtxos data received");
    return {
      vtxos: s.vtxos.map(is),
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
    if (!s.subscriptionId) throw new Error("Subscription ID not found");
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
};
function is(e) {
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
var ue;
((e) => {
  function t(g) {
    return typeof g == "object" && typeof g.totalOutputAmount == "string" && typeof g.totalOutputVtxos == "number" && typeof g.expiresAt == "string" && typeof g.swept == "boolean";
  }
  function n(g) {
    return typeof g == "object" && typeof g.txid == "string" && typeof g.expiresAt == "string" && Object.values(ig).includes(g.type) && Array.isArray(g.spends) && g.spends.every((M) => typeof M == "string");
  }
  function r(g) {
    return typeof g == "object" && typeof g.startedAt == "string" && typeof g.endedAt == "string" && typeof g.totalInputAmount == "string" && typeof g.totalInputVtxos == "number" && typeof g.totalOutputAmount == "string" && typeof g.totalOutputVtxos == "number" && typeof g.batches == "object" && Object.values(g.batches).every(t);
  }
  e.isCommitmentTx = r;
  function i(g) {
    return typeof g == "object" && typeof g.txid == "string" && typeof g.vout == "number";
  }
  e.isOutpoint = i;
  function s(g) {
    return Array.isArray(g) && g.every(i);
  }
  e.isOutpointArray = s;
  function o(g) {
    return typeof g == "object" && typeof g.txid == "string" && typeof g.children == "object" && Object.values(g.children).every(l) && Object.keys(g.children).every((M) => Number.isInteger(Number(M)));
  }
  function a(g) {
    return Array.isArray(g) && g.every(o);
  }
  e.isTxsArray = a;
  function c(g) {
    return typeof g == "object" && typeof g.amount == "string" && typeof g.createdAt == "string" && typeof g.isSettled == "boolean" && typeof g.settledBy == "string" && Object.values(rg).includes(g.type) && (!g.commitmentTxid && typeof g.virtualTxid == "string" || typeof g.commitmentTxid == "string" && !g.virtualTxid);
  }
  function u(g) {
    return Array.isArray(g) && g.every(c);
  }
  e.isTxHistoryRecordArray = u;
  function l(g) {
    return typeof g == "string" && g.length === 64;
  }
  function d(g) {
    return Array.isArray(g) && g.every(l);
  }
  e.isTxidArray = d;
  function h(g) {
    return typeof g == "object" && i(g.outpoint) && typeof g.createdAt == "string" && (g.expiresAt === null || typeof g.expiresAt == "string") && typeof g.amount == "string" && typeof g.script == "string" && typeof g.isPreconfirmed == "boolean" && typeof g.isSwept == "boolean" && typeof g.isUnrolled == "boolean" && typeof g.isSpent == "boolean" && (!g.spentBy || typeof g.spentBy == "string") && (!g.settledBy || typeof g.settledBy == "string") && (!g.arkTxid || typeof g.arkTxid == "string") && Array.isArray(g.commitmentTxids) && g.commitmentTxids.every(l);
  }
  function p(g) {
    return typeof g == "object" && typeof g.current == "number" && typeof g.next == "number" && typeof g.total == "number";
  }
  function w(g) {
    return typeof g == "object" && Array.isArray(g.vtxoTree) && g.vtxoTree.every(o) && (!g.page || p(g.page));
  }
  e.isVtxoTreeResponse = w;
  function f(g) {
    return typeof g == "object" && Array.isArray(g.leaves) && g.leaves.every(i) && (!g.page || p(g.page));
  }
  e.isVtxoTreeLeavesResponse = f;
  function y(g) {
    return typeof g == "object" && Array.isArray(g.connectors) && g.connectors.every(o) && (!g.page || p(g.page));
  }
  e.isConnectorsResponse = y;
  function E(g) {
    return typeof g == "object" && Array.isArray(g.txids) && g.txids.every(l) && (!g.page || p(g.page));
  }
  e.isForfeitTxsResponse = E;
  function I(g) {
    return typeof g == "object" && Array.isArray(g.sweptBy) && g.sweptBy.every(l);
  }
  e.isSweptCommitmentTxResponse = I;
  function O(g) {
    return typeof g == "object" && Array.isArray(g.sweptBy) && g.sweptBy.every(l);
  }
  e.isBatchSweepTransactionsResponse = O;
  function B(g) {
    return typeof g == "object" && Array.isArray(g.txs) && g.txs.every((M) => typeof M == "string") && (!g.page || p(g.page));
  }
  e.isVirtualTxsResponse = B;
  function N(g) {
    return typeof g == "object" && Array.isArray(g.chain) && g.chain.every(n) && (!g.page || p(g.page));
  }
  e.isVtxoChainResponse = N;
  function V(g) {
    return typeof g == "object" && Array.isArray(g.vtxos) && g.vtxos.every(h) && (!g.page || p(g.page));
  }
  e.isVtxosResponse = V;
})(ue || (ue = {}));
var HE = class sg {
  constructor(t) {
    this.swapRepository = t;
  }
  static messageTag = "arkade-lightning-updater";
  messageTag = sg.messageTag;
  arkProvider;
  indexerProvider;
  swapProvider;
  wallet;
  handler;
  async start(t) {
    if (!t.wallet) throw new Error("Wallet is required");
    this.wallet = t.wallet;
  }
  async stop() {
  }
  async tick(t) {
    return [];
  }
  tagged(t) {
    return {
      ...t,
      tag: this.messageTag
    };
  }
  async handleMessage(t) {
    const n = t.id;
    if (t.type === "INIT_ARKADE_LIGHTNING")
      return await this.handleInit(t), this.tagged({
        id: n,
        type: "ARKADE_LIGHTNING_INITIALIZED"
      });
    if (!this.handler || !this.wallet)
      return this.tagged({
        id: n,
        error: new Error("handler not initialized")
      });
    try {
      switch (t.type) {
        case "CREATE_LIGHTNING_INVOICE": {
          const r = await this.handler.createLightningInvoice(
            t.payload
          );
          return this.tagged({
            id: n,
            type: "LIGHTNING_INVOICE_CREATED",
            payload: r
          });
        }
        case "SEND_LIGHTNING_PAYMENT": {
          const r = await this.handler.sendLightningPayment(
            t.payload
          );
          return this.tagged({
            id: n,
            type: "LIGHTNING_PAYMENT_SENT",
            payload: r
          });
        }
        case "CREATE_SUBMARINE_SWAP": {
          const r = await this.handler.createSubmarineSwap(
            t.payload
          );
          return this.tagged({
            id: n,
            type: "SUBMARINE_SWAP_CREATED",
            payload: r
          });
        }
        case "CREATE_REVERSE_SWAP": {
          const r = await this.handler.createReverseSwap(
            t.payload
          );
          return this.tagged({
            id: n,
            type: "REVERSE_SWAP_CREATED",
            payload: r
          });
        }
        case "CLAIM_VHTLC":
          return await this.handler.claimVHTLC(t.payload), this.tagged({ id: n, type: "VHTLC_CLAIMED" });
        case "REFUND_VHTLC":
          return await this.handler.refundVHTLC(t.payload), this.tagged({ id: n, type: "VHTLC_REFUNDED" });
        case "WAIT_AND_CLAIM": {
          const r = await this.handler.waitAndClaim(
            t.payload
          );
          return this.tagged({
            id: n,
            type: "WAIT_AND_CLAIMED",
            payload: r
          });
        }
        case "WAIT_FOR_SWAP_SETTLEMENT": {
          const r = await this.handler.waitForSwapSettlement(
            t.payload
          );
          return this.tagged({
            id: n,
            type: "SWAP_SETTLED",
            payload: r
          });
        }
        case "RESTORE_SWAPS": {
          const r = await this.handler.restoreSwaps(
            t.payload
          );
          return this.tagged({
            id: n,
            type: "SWAPS_RESTORED",
            payload: r
          });
        }
        case "ENRICH_REVERSE_SWAP_PREIMAGE": {
          const r = this.handler.enrichReverseSwapPreimage(
            t.payload.swap,
            t.payload.preimage
          );
          return this.tagged({
            id: n,
            type: "REVERSE_SWAP_PREIMAGE_ENRICHED",
            payload: r
          });
        }
        case "ENRICH_SUBMARINE_SWAP_INVOICE": {
          const r = this.handler.enrichSubmarineSwapInvoice(
            t.payload.swap,
            t.payload.invoice
          );
          return this.tagged({
            id: n,
            type: "SUBMARINE_SWAP_INVOICE_ENRICHED",
            payload: r
          });
        }
        case "GET_FEES": {
          const r = await this.handler.getFees();
          return this.tagged({ id: n, type: "FEES", payload: r });
        }
        case "GET_LIMITS": {
          const r = await this.handler.getLimits();
          return this.tagged({ id: n, type: "LIMITS", payload: r });
        }
        case "GET_SWAP_STATUS": {
          const r = await this.handler.getSwapStatus(
            t.payload.swapId
          );
          return this.tagged({
            id: n,
            type: "SWAP_STATUS",
            payload: r
          });
        }
        case "GET_PENDING_SUBMARINE_SWAPS": {
          const r = await this.handler.getPendingSubmarineSwaps();
          return this.tagged({
            id: n,
            type: "PENDING_SUBMARINE_SWAPS",
            payload: r
          });
        }
        case "GET_PENDING_REVERSE_SWAPS": {
          const r = await this.handler.getPendingReverseSwaps();
          return this.tagged({
            id: n,
            type: "PENDING_REVERSE_SWAPS",
            payload: r
          });
        }
        case "GET_SWAP_HISTORY": {
          const r = await this.handler.getSwapHistory();
          return this.tagged({
            id: n,
            type: "SWAP_HISTORY",
            payload: r
          });
        }
        case "REFRESH_SWAPS_STATUS":
          return await this.handler.refreshSwapsStatus(), this.tagged({ id: n, type: "SWAPS_STATUS_REFRESHED" });
        default:
          throw console.error("Unknown message type", t), new Error("Unknown message");
      }
    } catch (r) {
      return this.tagged({ id: n, error: r });
    }
  }
  async handleInit({ payload: t }) {
    if (!this.wallet)
      throw new Error("Wallet is required");
    const { arkServerUrl: n } = t;
    this.arkProvider = new LE(n), this.indexerProvider = new ME(n), this.swapProvider = new Up({
      apiUrl: t.swapProvider.baseUrl,
      network: t.network
    });
    const r = new Wv({
      wallet: this.wallet,
      arkProvider: this.arkProvider,
      swapProvider: this.swapProvider,
      indexerProvider: this.indexerProvider,
      swapRepository: this.swapRepository,
      // SwapManager handles SW by itself
      swapManager: void 0,
      feeConfig: t.feeConfig,
      timeoutConfig: t.timeoutConfig,
      retryConfig: t.retryConfig
    });
    this.handler = r;
  }
  async withInit(t) {
    if (this.wallet && this.indexerProvider && this.arkProvider && this.swapProvider)
      return t(
        this.wallet,
        this.indexerProvider,
        this.arkProvider,
        this.swapProvider
      );
    throw new Error("Updater not initialized");
  }
  async refundVHTLCwithOffchainTx(t, n, r, i, s, o, a) {
    const c = x.decode(a.checkpointTapscript), u = kt.decode(
      c
    ), { arkTx: l, checkpoints: d } = no([s], [o], u);
    if (d.length !== 1)
      throw new Error(
        `Expected one checkpoint transaction, got ${d.length}`
      );
    const h = d[0];
    return this.withInit(
      async (p, w, f, y) => {
        const {
          transaction: E,
          checkpoint: I
        } = await y.refundSubmarineSwap(
          t.id,
          l,
          h
        ), O = x.encode(n);
        if (!Sr(E, 0, [
          O
        ]))
          throw new Error(
            "Invalid Boltz signature in refund transaction"
          );
        if (!Sr(I, 0, [
          O
        ]))
          throw new Error(
            "Invalid Boltz signature in checkpoint transaction"
          );
        const B = await p.identity.sign(l), N = await p.identity.sign(h), V = vr(
          E,
          B
        ), g = vr(
          I,
          N
        ), { arkTxid: M, finalArkTx: _, signedCheckpointTxs: F } = await f.submitTx(
          G.encode(V.toPSBT()),
          [G.encode(h.toPSBT())]
        ), A = rt.fromPSBT(G.decode(_)), S = 0, m = [
          x.encode(r),
          x.encode(n),
          x.encode(i)
        ];
        if (!Sr(A, S, m))
          throw new Error("Invalid refund transaction");
        if (F.length !== 1)
          throw new Error(
            `Expected one signed checkpoint transaction, got ${F.length}`
          );
        const v = rt.fromPSBT(
          G.decode(F[0])
        ), b = vr(
          g,
          v
        );
        await f.finalizeTx(M, [
          G.encode(b.toPSBT())
        ]);
      }
    );
  }
};
/*! Bundled license information:

@noble/curves/utils.js:
@noble/curves/abstract/modular.js:
@noble/curves/abstract/curve.js:
@noble/curves/abstract/weierstrass.js:
@noble/curves/secp256k1.js:
  (*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) *)
*/
class Bn extends rt {
  constructor(t) {
    super(Ta(t));
  }
  static fromPSBT(t, n) {
    return rt.fromPSBT(t, Ta(n));
  }
  static fromRaw(t, n) {
    return rt.fromRaw(t, Ta(n));
  }
}
Bn.ARK_TX_OPTS = {
  allowUnknown: !0,
  allowUnknownOutputs: !0,
  allowUnknownInputs: !0
};
function Ta(e) {
  return { ...Bn.ARK_TX_OPTS, ...e };
}
function KE(e) {
  const t = ky(e);
  return { secNonce: t.secret, pubNonce: t.public };
}
function WE(e) {
  return Iy(e);
}
function vu(e, t, n = {}) {
  e = Vs(e);
  const { aggPublicKey: r } = Bi(e);
  if (!n.taprootTweak)
    return {
      preTweakedKey: r.toBytes(!0),
      finalKey: r.toBytes(!0)
    };
  const i = Gr.utils.taggedHash("TapTweak", r.toBytes(!0).subarray(1), n.taprootTweak ?? new Uint8Array(0)), { aggPublicKey: s } = Bi(e, [i], [!0]);
  return {
    preTweakedKey: r.toBytes(!0),
    finalKey: s.toBytes(!0)
  };
}
class ss extends Error {
  constructor(t) {
    super(t), this.name = "PartialSignatureError";
  }
}
class Eu {
  constructor(t, n) {
    if (this.s = t, this.R = n, t.length !== 32)
      throw new ss("Invalid s length");
    if (n.length !== 33)
      throw new ss("Invalid R length");
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
      throw new ss("Invalid partial signature length");
    if (qr(t) >= Nt.CURVE().n)
      throw new ss("s value overflows curve order");
    const r = new Uint8Array(33);
    return new Eu(t, r);
  }
}
function zE(e, t, n, r, i, s) {
  let o;
  if (s?.taprootTweak !== void 0) {
    const { preTweakedKey: u } = vu(Vs(r));
    o = Gr.utils.taggedHash("TapTweak", u.subarray(1), s.taprootTweak);
  }
  const c = new Ay(n, Vs(r), i, o ? [o] : void 0, o ? [!0] : void 0).sign(e, t);
  return Eu.decode(c);
}
var qt;
(function(e) {
  e.VtxoTaprootTree = "taptree", e.VtxoTreeExpiry = "expiry", e.Cosigner = "cosigner", e.ConditionWitness = "condition";
})(qt || (qt = {}));
const Tu = 222;
function jE(e, t, n, r) {
  e.updateInput(t, {
    unknown: [
      ...e.getInput(t)?.unknown ?? [],
      n.encode(r)
    ]
  });
}
function fc(e, t, n) {
  const r = e.getInput(t)?.unknown ?? [], i = [];
  for (const s of r) {
    const o = n.decode(s);
    o && i.push(o);
  }
  return i;
}
const og = {
  key: qt.VtxoTaprootTree,
  encode: (e) => [
    {
      type: Tu,
      key: Ho[qt.VtxoTaprootTree]
    },
    e
  ],
  decode: (e) => Su(() => ku(e[0], qt.VtxoTaprootTree) ? e[1] : null)
}, qE = {
  key: qt.ConditionWitness,
  encode: (e) => [
    {
      type: Tu,
      key: Ho[qt.ConditionWitness]
    },
    rr.encode(e)
  ],
  decode: (e) => Su(() => ku(e[0], qt.ConditionWitness) ? rr.decode(e[1]) : null)
}, hc = {
  key: qt.Cosigner,
  encode: (e) => [
    {
      type: Tu,
      key: new Uint8Array([
        ...Ho[qt.Cosigner],
        e.index
      ])
    },
    e.key
  ],
  decode: (e) => Su(() => ku(e[0], qt.Cosigner) ? {
    index: e[0].key[e[0].key.length - 1],
    key: e[1]
  } : null)
};
qt.VtxoTreeExpiry;
const Ho = Object.fromEntries(Object.values(qt).map((e) => [
  e,
  new TextEncoder().encode(e)
])), Su = (e) => {
  try {
    return e();
  } catch {
    return null;
  }
};
function ku(e, t) {
  const n = x.encode(Ho[t]);
  return x.encode(new Uint8Array([e.type, ...e.key])).includes(n);
}
const os = new Error("missing vtxo graph");
class Ui {
  constructor(t) {
    this.secretKey = t, this.myNonces = null, this.aggregateNonces = null, this.graph = null, this.scriptRoot = null, this.rootSharedOutputAmount = null;
  }
  static random() {
    const t = Ua();
    return new Ui(t);
  }
  async init(t, n, r) {
    this.graph = t, this.scriptRoot = n, this.rootSharedOutputAmount = r;
  }
  async getPublicKey() {
    return Cl.getPublicKey(this.secretKey);
  }
  async getNonces() {
    if (!this.graph)
      throw os;
    this.myNonces || (this.myNonces = this.generateNonces());
    const t = /* @__PURE__ */ new Map();
    for (const [n, r] of this.myNonces)
      t.set(n, { pubNonce: r.pubNonce });
    return t;
  }
  async aggregatedNonces(t, n) {
    if (!this.graph)
      throw os;
    if (this.aggregateNonces || (this.aggregateNonces = /* @__PURE__ */ new Map()), this.myNonces || await this.getNonces(), this.aggregateNonces.has(t))
      return {
        hasAllNonces: this.aggregateNonces.size === this.myNonces?.size
      };
    const r = this.myNonces.get(t);
    if (!r)
      throw new Error(`missing nonce for txid ${t}`);
    const i = await this.getPublicKey();
    n.set(x.encode(i.subarray(1)), r);
    const s = this.graph.find(t);
    if (!s)
      throw new Error(`missing tx for txid ${t}`);
    const o = fc(s.root, 0, hc).map(
      (u) => x.encode(u.key.subarray(1))
      // xonly pubkey
    ), a = [];
    for (const u of o) {
      const l = n.get(u);
      if (!l)
        throw new Error(`missing nonce for cosigner ${u}`);
      a.push(l.pubNonce);
    }
    const c = WE(a);
    return this.aggregateNonces.set(t, { pubNonce: c }), {
      hasAllNonces: this.aggregateNonces.size === this.myNonces?.size
    };
  }
  async sign() {
    if (!this.graph)
      throw os;
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
      throw os;
    const t = /* @__PURE__ */ new Map(), n = Cl.getPublicKey(this.secretKey);
    for (const r of this.graph.iterator()) {
      const i = KE(n);
      t.set(r.txid, i);
    }
    return t;
  }
  signPartial(t) {
    if (!this.graph || !this.scriptRoot || !this.rootSharedOutputAmount)
      throw Ui.NOT_INITIALIZED;
    if (!this.myNonces || !this.aggregateNonces)
      throw new Error("session not properly initialized");
    const n = this.myNonces.get(t.txid);
    if (!n)
      throw new Error("missing private nonce");
    const r = this.aggregateNonces.get(t.txid);
    if (!r)
      throw new Error("missing aggregate nonce");
    const i = [], s = [], o = fc(t.root, 0, hc).map((u) => u.key), { finalKey: a } = vu(o, !0, {
      taprootTweak: this.scriptRoot
    });
    for (let u = 0; u < t.root.inputsLength; u++) {
      const l = GE(a, this.graph, this.rootSharedOutputAmount, t.root);
      i.push(l.amount), s.push(l.script);
    }
    const c = t.root.preimageWitnessV1(
      0,
      // always first input
      s,
      It.DEFAULT,
      i
    );
    return zE(n.secNonce, this.secretKey, r.pubNonce, o, c, {
      taprootTweak: this.scriptRoot
    });
  }
}
Ui.NOT_INITIALIZED = new Error("session not initialized, call init method");
function GE(e, t, n, r) {
  const i = K.encode(["OP_1", e.slice(1)]);
  if (r.id === t.txid)
    return {
      amount: n,
      script: i
    };
  const s = r.getInput(0);
  if (!s.txid)
    throw new Error("missing parent input txid");
  const o = x.encode(s.txid), a = t.find(o);
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
const Pd = Object.values(It).filter((e) => typeof e == "number");
class Si {
  constructor(t) {
    this.key = t || Ua();
  }
  static fromPrivateKey(t) {
    return new Si(t);
  }
  static fromHex(t) {
    return new Si(x.decode(t));
  }
  static fromRandomBytes() {
    return new Si(Ua());
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
        if (!r.sign(this.key, Pd))
          throw new Error("Failed to sign transaction");
      } catch (i) {
        if (!(i instanceof Error && i.message.includes("No inputs signed"))) throw i;
      }
      return r;
    }
    for (const i of n)
      if (!r.signIdx(this.key, i, Pd))
        throw new Error(`Failed to sign input #${i}`);
    return r;
  }
  compressedPublicKey() {
    return Promise.resolve(Vf(this.key, !0));
  }
  xOnlyPublicKey() {
    return Promise.resolve(_c(this.key));
  }
  signerSession() {
    return Ui.random();
  }
  async signMessage(t, n = "schnorr") {
    return n === "ecdsa" ? om(t, this.key, { prehash: !1 }) : hm.signAsync(t, this.key);
  }
  async toReadonly() {
    return new Ko(await this.compressedPublicKey());
  }
}
class Ko {
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
    return new Ko(t);
  }
  xOnlyPublicKey() {
    return Promise.resolve(this.publicKey.slice(1));
  }
  compressedPublicKey() {
    return Promise.resolve(this.publicKey);
  }
}
class Jn {
  constructor(t, n, r, i = 0) {
    if (this.serverPubKey = t, this.vtxoTaprootKey = n, this.hrp = r, this.version = i, t.length !== 32)
      throw new Error("Invalid server public key length, expected 32 bytes, got " + t.length);
    if (n.length !== 32)
      throw new Error("Invalid vtxo taproot public key length, expected 32 bytes, got " + n.length);
  }
  static decode(t) {
    const n = De.decodeUnsafe(t, 1023);
    if (!n)
      throw new Error("Invalid address");
    const r = new Uint8Array(De.fromWords(n.words));
    if (r.length !== 65)
      throw new Error("Invalid data length, expected 65 bytes, got " + r.length);
    const i = r[0], s = r.slice(1, 33), o = r.slice(33, 65);
    return new Jn(s, o, n.prefix, i);
  }
  encode() {
    const t = new Uint8Array(65);
    t[0] = this.version, t.set(this.serverPubKey, 1), t.set(this.vtxoTaprootKey, 33);
    const n = De.toWords(t);
    return De.encode(this.hrp, n, 1023);
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
const ho = So(void 0, !0);
var bt;
(function(e) {
  e.Multisig = "multisig", e.CSVMultisig = "csv-multisig", e.ConditionCSVMultisig = "condition-csv-multisig", e.ConditionMultisig = "condition-multisig", e.CLTVMultisig = "cltv-multisig";
})(bt || (bt = {}));
function ag(e) {
  const t = [
    Te,
    Gt,
    Li,
    po,
    Hr
  ];
  for (const n of t)
    try {
      return n.decode(e);
    } catch {
      continue;
    }
  throw new Error(`Failed to decode: script ${x.encode(e)} is not a valid tapscript`);
}
var Te;
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
        script: Gf(a.pubkeys.length, a.pubkeys).script
      };
    const c = [];
    for (let u = 0; u < a.pubkeys.length; u++)
      c.push(a.pubkeys[u]), u < a.pubkeys.length - 1 ? c.push("CHECKSIGVERIFY") : c.push("CHECKSIG");
    return {
      type: bt.Multisig,
      params: a,
      script: K.encode(c)
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
    const d = n({
      pubkeys: u,
      type: t.CHECKSIGADD
    });
    if (x.encode(d.script) !== x.encode(a))
      throw new Error("Invalid script format: script reconstruction mismatch");
    return {
      type: bt.Multisig,
      params: { pubkeys: u, type: t.CHECKSIGADD },
      script: a
    };
  }
  function s(a) {
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
    const l = n({ pubkeys: u, type: t.CHECKSIG });
    if (x.encode(l.script) !== x.encode(a))
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
})(Te || (Te = {}));
var Gt;
(function(e) {
  function t(i) {
    for (const u of i.pubkeys)
      if (u.length !== 32)
        throw new Error(`Invalid pubkey length: expected 32, got ${u.length}`);
    const s = ho.encode(BigInt(ve.encode(i.timelock.type === "blocks" ? { blocks: Number(i.timelock.value) } : { seconds: Number(i.timelock.value) }))), o = [
      s.length === 1 ? s[0] : s,
      "CHECKSEQUENCEVERIFY",
      "DROP"
    ], a = Te.encode(i), c = new Uint8Array([
      ...K.encode(o),
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
    const s = K.decode(i);
    if (s.length < 3)
      throw new Error("Invalid script: too short (expected at least 3)");
    const o = s[0];
    if (typeof o == "string")
      throw new Error("Invalid script: expected sequence number");
    if (s[1] !== "CHECKSEQUENCEVERIFY" || s[2] !== "DROP")
      throw new Error("Invalid script: expected CHECKSEQUENCEVERIFY DROP");
    const a = new Uint8Array(K.encode(s.slice(3)));
    let c;
    try {
      c = Te.decode(a);
    } catch (p) {
      throw new Error(`Invalid multisig script: ${p instanceof Error ? p.message : String(p)}`);
    }
    let u;
    typeof o == "number" ? u = o : u = Number(ho.decode(o));
    const l = ve.decode(u), d = l.blocks !== void 0 ? { type: "blocks", value: BigInt(l.blocks) } : { type: "seconds", value: BigInt(l.seconds) }, h = t({
      timelock: d,
      ...c.params
    });
    if (x.encode(h.script) !== x.encode(i))
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
})(Gt || (Gt = {}));
var Li;
(function(e) {
  function t(i) {
    const s = new Uint8Array([
      ...i.conditionScript,
      ...K.encode(["VERIFY"]),
      ...Gt.encode(i).script
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
    const s = K.decode(i);
    if (s.length < 1)
      throw new Error("Invalid script: too short (expected at least 1)");
    let o = -1;
    for (let d = s.length - 1; d >= 0; d--)
      s[d] === "VERIFY" && (o = d);
    if (o === -1)
      throw new Error("Invalid script: missing VERIFY operation");
    const a = new Uint8Array(K.encode(s.slice(0, o))), c = new Uint8Array(K.encode(s.slice(o + 1)));
    let u;
    try {
      u = Gt.decode(c);
    } catch (d) {
      throw new Error(`Invalid CSV multisig script: ${d instanceof Error ? d.message : String(d)}`);
    }
    const l = t({
      conditionScript: a,
      ...u.params
    });
    if (x.encode(l.script) !== x.encode(i))
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
})(Li || (Li = {}));
var po;
(function(e) {
  function t(i) {
    const s = new Uint8Array([
      ...i.conditionScript,
      ...K.encode(["VERIFY"]),
      ...Te.encode(i).script
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
    const s = K.decode(i);
    if (s.length < 1)
      throw new Error("Invalid script: too short (expected at least 1)");
    let o = -1;
    for (let d = s.length - 1; d >= 0; d--)
      s[d] === "VERIFY" && (o = d);
    if (o === -1)
      throw new Error("Invalid script: missing VERIFY operation");
    const a = new Uint8Array(K.encode(s.slice(0, o))), c = new Uint8Array(K.encode(s.slice(o + 1)));
    let u;
    try {
      u = Te.decode(c);
    } catch (d) {
      throw new Error(`Invalid multisig script: ${d instanceof Error ? d.message : String(d)}`);
    }
    const l = t({
      conditionScript: a,
      ...u.params
    });
    if (x.encode(l.script) !== x.encode(i))
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
})(po || (po = {}));
var Hr;
(function(e) {
  function t(i) {
    const s = ho.encode(i.absoluteTimelock), o = [
      s.length === 1 ? s[0] : s,
      "CHECKLOCKTIMEVERIFY",
      "DROP"
    ], a = K.encode(o), c = new Uint8Array([
      ...a,
      ...Te.encode(i).script
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
    const s = K.decode(i);
    if (s.length < 3)
      throw new Error("Invalid script: too short (expected at least 3)");
    const o = s[0];
    if (typeof o == "string" || typeof o == "number")
      throw new Error("Invalid script: expected locktime number");
    if (s[1] !== "CHECKLOCKTIMEVERIFY" || s[2] !== "DROP")
      throw new Error("Invalid script: expected CHECKLOCKTIMEVERIFY DROP");
    const a = new Uint8Array(K.encode(s.slice(3)));
    let c;
    try {
      c = Te.decode(a);
    } catch (d) {
      throw new Error(`Invalid multisig script: ${d instanceof Error ? d.message : String(d)}`);
    }
    const u = ho.decode(o), l = t({
      absoluteTimelock: u,
      ...c.params
    });
    if (x.encode(l.script) !== x.encode(i))
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
})(Hr || (Hr = {}));
const Bd = Br.tapTree[2];
function ki(e) {
  return e[1].subarray(0, e[1].length - 1);
}
class ie {
  static decode(t) {
    const r = Bd.decode(t).map((i) => i.script);
    return new ie(r);
  }
  constructor(t) {
    this.scripts = t;
    const n = t.length % 2 !== 0 ? t.slice().reverse() : t, r = Mc(n.map((s) => ({
      script: s,
      leafVersion: ir
    }))), i = qf(To, r, void 0, !0);
    if (!i.tapLeafScript || i.tapLeafScript.length !== t.length)
      throw new Error("invalid scripts");
    this.leaves = i.tapLeafScript, this.tweakedPublicKey = i.tweakedPubkey;
  }
  encode() {
    return Bd.encode(this.scripts.map((n) => ({
      depth: 1,
      version: ir,
      script: n
    })));
  }
  address(t, n) {
    return new Jn(n, this.tweakedPublicKey, t);
  }
  get pkScript() {
    return K.encode(["OP_1", this.tweakedPublicKey]);
  }
  onchainAddress(t) {
    return Yt(t).encode({
      type: "tr",
      pubkey: this.tweakedPublicKey
    });
  }
  findLeaf(t) {
    const n = this.leaves.find((r) => x.encode(ki(r)) === t);
    if (!n)
      throw new Error(`leaf '${t}' not found`);
    return n;
  }
  exitPaths() {
    const t = [];
    for (const n of this.leaves)
      try {
        const r = Gt.decode(ki(n));
        t.push(r);
        continue;
      } catch {
        try {
          const i = Li.decode(ki(n));
          t.push(i);
        } catch {
          continue;
        }
      }
    return t;
  }
}
var pc;
(function(e) {
  class t extends ie {
    constructor(i) {
      n(i);
      const { sender: s, receiver: o, server: a, preimageHash: c, refundLocktime: u, unilateralClaimDelay: l, unilateralRefundDelay: d, unilateralRefundWithoutReceiverDelay: h } = i, p = YE(c), w = po.encode({
        conditionScript: p,
        pubkeys: [o, a]
      }).script, f = Te.encode({
        pubkeys: [s, o, a]
      }).script, y = Hr.encode({
        absoluteTimelock: u,
        pubkeys: [s, a]
      }).script, E = Li.encode({
        conditionScript: p,
        timelock: l,
        pubkeys: [o]
      }).script, I = Gt.encode({
        timelock: d,
        pubkeys: [s, o]
      }).script, O = Gt.encode({
        timelock: h,
        pubkeys: [s]
      }).script;
      super([
        w,
        f,
        y,
        E,
        I,
        O
      ]), this.options = i, this.claimScript = x.encode(w), this.refundScript = x.encode(f), this.refundWithoutReceiverScript = x.encode(y), this.unilateralClaimScript = x.encode(E), this.unilateralRefundScript = x.encode(I), this.unilateralRefundWithoutReceiverScript = x.encode(O);
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
})(pc || (pc = {}));
function YE(e) {
  return K.encode(["HASH160", e, "EQUAL"]);
}
var tr;
(function(e) {
  class t extends ie {
    constructor(r) {
      const { pubKey: i, serverPubKey: s, csvTimelock: o = t.DEFAULT_TIMELOCK } = r, a = Te.encode({
        pubkeys: [i, s]
      }).script, c = Gt.encode({
        timelock: o,
        pubkeys: [i]
      }).script;
      super([a, c]), this.options = r, this.forfeitScript = x.encode(a), this.exitScript = x.encode(c);
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
})(tr || (tr = {}));
const as = /* @__PURE__ */ new Map();
function cg() {
  if (!("serviceWorker" in navigator))
    throw new Error("Service workers are not supported in this browser");
}
function ug(e) {
  if (!as.has(e)) {
    const t = navigator.serviceWorker.register(e).then(async (n) => {
      try {
        await n.update();
      } catch (r) {
        console.warn("Service worker update failed; continuing with registration", r);
      }
      return n;
    }).catch((n) => {
      throw as.delete(e), n;
    });
    as.set(e, t);
  }
  return as.get(e);
}
async function ZE(e) {
  return cg(), ug(e);
}
async function Nd(e) {
  cg();
  const t = e ? await ug(e) : await navigator.serviceWorker.ready;
  let n = t.active || t.waiting || t.installing || navigator.serviceWorker.controller;
  if (!n && e) {
    const r = await navigator.serviceWorker.ready;
    n = r.active || r.waiting || r.installing || navigator.serviceWorker.controller;
  }
  if (!n)
    throw new Error("Service worker not ready yet");
  return n;
}
async function* gc(e) {
  const t = [], n = [];
  let r = null, i = null;
  const s = (a) => {
    r ? (r(a), r = null) : t.push(a);
  }, o = () => {
    const a = new Error("EventSource error");
    i ? (i(a), i = null) : n.push(a);
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
class lg extends Error {
  constructor(t, n, r, i) {
    super(n), this.code = t, this.message = n, this.name = r, this.metadata = i;
  }
}
function XE(e) {
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
      return "metadata" in n && QE(n.metadata) && (a = n.metadata), new lg(i, s, o, a);
    }
    return;
  } catch {
    return;
  }
}
function QE(e) {
  return typeof e == "object" && e !== null && !Array.isArray(e);
}
var An;
(function(e) {
  function t(i, s, o = []) {
    if (typeof i != "string" && (i = r(i)), s.length == 0)
      throw new Error("intent proof requires at least one input");
    iT(s), oT(o);
    const a = aT(i, s[0].witnessUtxo.script);
    return cT(a, s, o);
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
})(An || (An = {}));
const JE = new Uint8Array([pt.RETURN]), tT = new Uint8Array(32).fill(0), eT = 4294967295, nT = "ark-intent-proof-message";
function rT(e) {
  if (e.index === void 0)
    throw new Error("intent proof input requires index");
  if (e.txid === void 0)
    throw new Error("intent proof input requires txid");
  if (e.witnessUtxo === void 0)
    throw new Error("intent proof input requires witness utxo");
  return !0;
}
function iT(e) {
  return e.forEach(rT), !0;
}
function sT(e) {
  if (e.amount === void 0)
    throw new Error("intent proof output requires amount");
  if (e.script === void 0)
    throw new Error("intent proof output requires script");
  return !0;
}
function oT(e) {
  return e.forEach(sT), !0;
}
function aT(e, t) {
  const n = uT(e), r = new Bn({
    version: 0
  });
  return r.addInput({
    txid: tT,
    // zero hash
    index: eT,
    sequence: 0
  }), r.addOutput({
    amount: 0n,
    script: t
  }), r.updateInput(0, {
    finalScriptSig: K.encode(["OP_0", n])
  }), r;
}
function cT(e, t, n) {
  const r = t[0], i = t.map((o) => o.sequence || 0).reduce((o, a) => Math.max(o, a), 0), s = new Bn({
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
    sighashType: It.ALL
  });
  for (const [o, a] of t.entries())
    s.addInput({
      ...a,
      sighashType: It.ALL
    }), a.unknown?.length && s.updateInput(o + 1, {
      unknown: a.unknown
    });
  n.length === 0 && (n = [
    {
      amount: 0n,
      script: JE
    }
  ]);
  for (const o of n)
    s.addOutput({
      amount: o.amount,
      script: o.script
    });
  return s;
}
function uT(e) {
  return Gr.utils.taggedHash(nT, new TextEncoder().encode(e));
}
var Et;
(function(e) {
  e.BatchStarted = "batch_started", e.BatchFinalization = "batch_finalization", e.BatchFinalized = "batch_finalized", e.BatchFailed = "batch_failed", e.TreeSigningStarted = "tree_signing_started", e.TreeNonces = "tree_nonces", e.TreeTx = "tree_tx", e.TreeSignature = "tree_signature";
})(Et || (Et = {}));
class dg {
  constructor(t) {
    this.serverUrl = t;
  }
  async getInfo() {
    const t = `${this.serverUrl}/v1/info`, n = await fetch(t);
    if (!n.ok) {
      const i = await n.text();
      Oe(i, `Failed to get server info: ${n.statusText}`);
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
      Oe(o, `Failed to submit virtual transaction: ${o}`);
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
      Oe(s, `Failed to finalize offchain transaction: ${s}`);
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
          message: An.encodeMessage(t.message)
        }
      })
    });
    if (!r.ok) {
      const s = await r.text();
      Oe(s, `Failed to register intent: ${s}`);
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
          message: An.encodeMessage(t.message)
        }
      })
    });
    if (!r.ok) {
      const i = await r.text();
      Oe(i, `Failed to delete intent: ${i}`);
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
      Oe(i, `Failed to confirm registration: ${i}`);
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
        treeNonces: lT(r)
      })
    });
    if (!s.ok) {
      const o = await s.text();
      Oe(o, `Failed to submit tree nonces: ${o}`);
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
        treeSignatures: dT(r)
      })
    });
    if (!s.ok) {
      const o = await s.text();
      Oe(o, `Failed to submit tree signatures: ${o}`);
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
      Oe(s, `Failed to submit forfeit transactions: ${i.statusText}`);
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
          for await (const a of gc(s)) {
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
        if (wc(s)) {
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
          for await (const s of gc(r)) {
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
        if (wc(r)) {
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
          message: An.encodeMessage(t.message)
        }
      })
    });
    if (!r.ok) {
      const s = await r.text();
      Oe(s, `Failed to get pending transactions: ${s}`);
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
        nonces: fT(t.treeNonces.nonces)
        // pubkey -> public nonce
      };
    if (t.treeTx) {
      const n = Object.fromEntries(Object.entries(t.treeTx.children).map(([r, i]) => [parseInt(r), i]));
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
        spentVtxos: t.commitmentTx.spentVtxos.map(cs),
        spendableVtxos: t.commitmentTx.spendableVtxos.map(cs),
        checkpointTxs: t.commitmentTx.checkpointTxs
      }
    } : t.arkTx ? {
      arkTx: {
        txid: t.arkTx.txid,
        tx: t.arkTx.tx,
        spentVtxos: t.arkTx.spentVtxos.map(cs),
        spendableVtxos: t.arkTx.spendableVtxos.map(cs),
        checkpointTxs: t.arkTx.checkpointTxs
      }
    } : (t.heartbeat || console.warn("Unknown transaction notification type:", t), null);
  }
}
function lT(e) {
  const t = {};
  for (const [n, r] of e)
    t[n] = x.encode(r.pubNonce);
  return t;
}
function dT(e) {
  const t = {};
  for (const [n, r] of e)
    t[n] = x.encode(r.encode());
  return t;
}
function fT(e) {
  return new Map(Object.entries(e).map(([t, n]) => {
    if (typeof n != "string")
      throw new Error("invalid nonce");
    return [t, { pubNonce: x.decode(n) }];
  }));
}
function wc(e) {
  const t = (n) => n instanceof Error ? n.name === "TypeError" && n.message === "Failed to fetch" || n.name === "HeadersTimeoutError" || n.name === "BodyTimeoutError" || n.code === "UND_ERR_HEADERS_TIMEOUT" || n.code === "UND_ERR_BODY_TIMEOUT" : !1;
  return t(e) || t(e.cause);
}
function cs(e) {
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
function Oe(e, t) {
  const n = new Error(e);
  throw XE(n) ?? new Error(t);
}
const hT = (e) => pT[e], pT = {
  bitcoin: oi(nr, "ark"),
  testnet: oi(xn, "tark"),
  signet: oi(xn, "tark"),
  mutinynet: oi(xn, "tark"),
  regtest: oi({
    ...xn,
    bech32: "bcrt",
    pubKeyHash: 111,
    scriptHash: 196
  }, "tark")
};
function oi(e, t) {
  return {
    ...e,
    hrp: t
  };
}
const gT = {
  bitcoin: "https://mempool.space/api",
  testnet: "https://mempool.space/testnet/api",
  signet: "https://mempool.space/signet/api",
  mutinynet: "https://mutinynet.com/api",
  regtest: "http://localhost:3000"
};
class wT {
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
      const c = async () => (await Promise.all(t.map((p) => this.getTransactions(p)))).flat(), u = await c(), l = (h) => `${h.txid}_${h.status.block_time}`, d = new Set(u.map(l));
      r = setInterval(async () => {
        try {
          const p = (await c()).filter((w) => !d.has(l(w)));
          p.length > 0 && (p.forEach((w) => d.add(l(w))), n(p));
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
          const d = l["multi-address-transactions"];
          for (const h in d)
            for (const p of [
              "mempool",
              "confirmed",
              "removed"
            ])
              d[h][p] && u.push(...d[h][p].filter(mT));
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
    if (!yT(n))
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
function yT(e) {
  return Array.isArray(e) && e.every((t) => t && typeof t == "object" && typeof t.id == "string" && t.id.length > 0 && typeof t.height == "number" && t.height >= 0 && typeof t.mediantime == "number" && t.mediantime > 0);
}
const mT = (e) => typeof e.txid == "string" && Array.isArray(e.vout) && e.vout.every((t) => typeof t.scriptpubkey_address == "string" && typeof t.value == "number") && typeof e.status == "object" && typeof e.status.confirmed == "boolean", bT = 0n, xT = new Uint8Array([81, 2, 78, 115]), Iu = {
  script: xT,
  amount: bT
};
x.encode(Iu.script);
function vT(e, t, n) {
  const r = new Bn({
    version: 3,
    lockTime: n
  });
  let i = 0n;
  for (const s of e) {
    if (!s.witnessUtxo)
      throw new Error("input needs witness utxo");
    i += s.witnessUtxo.amount, r.addInput(s);
  }
  return r.addOutput({
    script: t,
    amount: i
  }), r.addOutput(Iu), r;
}
const ET = new Error("invalid settlement transaction outputs"), TT = new Error("empty tree"), ST = new Error("invalid number of inputs"), Sa = new Error("wrong settlement txid"), kT = new Error("invalid amount"), IT = new Error("no leaves"), AT = new Error("invalid taproot script"), _d = new Error("invalid round transaction outputs"), RT = new Error("wrong commitment txid"), $T = new Error("missing cosigners public keys"), ka = 0, Ud = 1;
function OT(e, t) {
  if (t.validate(), t.root.inputsLength !== 1)
    throw ST;
  const n = t.root.getInput(0), r = rt.fromPSBT(G.decode(e));
  if (r.outputsLength <= Ud)
    throw ET;
  const i = r.id;
  if (!n.txid || x.encode(n.txid) !== i || n.index !== Ud)
    throw Sa;
}
function CT(e, t, n) {
  if (t.outputsLength < ka + 1)
    throw _d;
  const r = t.getOutput(ka)?.amount;
  if (!r)
    throw _d;
  if (!e.root)
    throw TT;
  const i = e.root.getInput(0), s = t.id;
  if (!i.txid || x.encode(i.txid) !== s || i.index !== ka)
    throw RT;
  let o = 0n;
  for (let c = 0; c < e.root.outputsLength; c++) {
    const u = e.root.getOutput(c);
    u?.amount && (o += u.amount);
  }
  if (o !== r)
    throw kT;
  if (e.leaves().length === 0)
    throw IT;
  e.validate();
  for (const c of e.iterator())
    for (const [u, l] of c.children) {
      const d = c.root.getOutput(u);
      if (!d?.script)
        throw new Error(`parent output ${u} not found`);
      const h = d.script.slice(2);
      if (h.length !== 32)
        throw new Error(`parent output ${u} has invalid script`);
      const p = fc(l.root, 0, hc);
      if (p.length === 0)
        throw $T;
      const w = p.map((y) => y.key), { finalKey: f } = vu(w, !0, {
        taprootTweak: n
      });
      if (!f || x.encode(f.slice(1)) !== x.encode(h))
        throw AT;
    }
}
var Je;
(function(e) {
  e.TxSent = "SENT", e.TxReceived = "RECEIVED";
})(Je || (Je = {}));
function kr(e) {
  return !e.isSpent;
}
function Au(e) {
  return e.virtualStatus.state === "swept" && kr(e);
}
function fg(e) {
  if (e.virtualStatus.state === "swept")
    return !0;
  const t = e.virtualStatus.batchExpiry;
  return !t || new Date(t).getFullYear() < 2025 ? !1 : t <= Date.now();
}
function hg(e, t) {
  return e.value < t;
}
function PT(e, t, n) {
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
  const i = e.map((o) => BT(o, n));
  return {
    arkTx: pg(i.map((o) => o.input), t),
    checkpoints: i.map((o) => o.tx)
  };
}
function pg(e, t) {
  let n = 0n;
  for (const i of e) {
    const s = ag(ki(i.tapLeafScript));
    if (Hr.is(s)) {
      if (n !== 0n && Ld(n) !== Ld(s.params.absoluteTimelock))
        throw new Error("cannot mix seconds and blocks locktime");
      s.params.absoluteTimelock > n && (n = s.params.absoluteTimelock);
    }
  }
  const r = new Bn({
    version: 3,
    lockTime: Number(n)
  });
  for (const [i, s] of e.entries())
    r.addInput({
      txid: s.txid,
      index: s.vout,
      sequence: n ? Ro - 1 : void 0,
      witnessUtxo: {
        script: ie.decode(s.tapTree).pkScript,
        amount: BigInt(s.value)
      },
      tapLeafScript: [s.tapLeafScript]
    }), jE(r, i, og, s.tapTree);
  for (const i of t)
    r.addOutput(i);
  return r.addOutput(Iu), r;
}
function BT(e, t) {
  const n = ag(ki(e.tapLeafScript)), r = new ie([
    t.script,
    n.script
  ]), i = pg([e], [
    {
      amount: BigInt(e.value),
      script: r.pkScript
    }
  ]), s = r.findLeaf(x.encode(n.script)), o = {
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
const NT = 500000000n;
function Ld(e) {
  return e >= NT;
}
function _T(e, t) {
  if (!e.status.block_time)
    return !1;
  if (t.value === 0n)
    return !0;
  if (t.type === "blocks")
    return !1;
  const n = BigInt(Math.floor(Date.now() / 1e3));
  return BigInt(Math.floor(e.status.block_time)) + t.value <= n;
}
const UT = 4320 * 60 * 1e3, LT = {
  thresholdMs: UT
  // 3 days
};
class yt {
  constructor(t, n, r = yt.DefaultHRP) {
    this.preimage = t, this.value = n, this.HRP = r, this.vout = 0;
    const i = lt(this.preimage);
    this.vtxoScript = new ie([FT(i)]);
    const s = this.vtxoScript.leaves[0];
    this.txid = x.encode(new Uint8Array(i).reverse()), this.tapTree = this.vtxoScript.encode(), this.forfeitTapLeafScript = s, this.intentTapLeafScript = s, this.value = n, this.status = { confirmed: !0 }, this.extraWitness = [this.preimage];
  }
  encode() {
    const t = new Uint8Array(yt.Length);
    return t.set(this.preimage, 0), DT(t, this.value, this.preimage.length), t;
  }
  static decode(t, n = yt.DefaultHRP) {
    if (t.length !== yt.Length)
      throw new Error(`invalid data length: expected ${yt.Length} bytes, got ${t.length}`);
    const r = t.subarray(0, yt.PreimageLength), i = VT(t, yt.PreimageLength);
    return new yt(r, i, n);
  }
  static fromString(t, n = yt.DefaultHRP) {
    if (t = t.trim(), !t.startsWith(n))
      throw new Error(`invalid human-readable part: expected ${n} prefix (note '${t}')`);
    const r = t.slice(n.length), i = Ci.decode(r);
    if (i.length === 0)
      throw new Error("failed to decode base58 string");
    return yt.decode(i, n);
  }
  toString() {
    return this.HRP + Ci.encode(this.encode());
  }
}
yt.DefaultHRP = "arknote";
yt.PreimageLength = 32;
yt.ValueLength = 4;
yt.Length = yt.PreimageLength + yt.ValueLength;
yt.FakeOutpointIndex = 0;
function DT(e, t, n) {
  new DataView(e.buffer, e.byteOffset + n, 4).setUint32(0, t, !1);
}
function VT(e, t) {
  return new DataView(e.buffer, e.byteOffset + t, 4).getUint32(0, !1);
}
function FT(e) {
  return K.encode(["SHA256", e, "EQUAL"]);
}
var yc;
(function(e) {
  e[e.INDEXER_TX_TYPE_UNSPECIFIED = 0] = "INDEXER_TX_TYPE_UNSPECIFIED", e[e.INDEXER_TX_TYPE_RECEIVED = 1] = "INDEXER_TX_TYPE_RECEIVED", e[e.INDEXER_TX_TYPE_SENT = 2] = "INDEXER_TX_TYPE_SENT";
})(yc || (yc = {}));
var Ir;
(function(e) {
  e.UNSPECIFIED = "INDEXER_CHAINED_TX_TYPE_UNSPECIFIED", e.COMMITMENT = "INDEXER_CHAINED_TX_TYPE_COMMITMENT", e.ARK = "INDEXER_CHAINED_TX_TYPE_ARK", e.TREE = "INDEXER_CHAINED_TX_TYPE_TREE", e.CHECKPOINT = "INDEXER_CHAINED_TX_TYPE_CHECKPOINT";
})(Ir || (Ir = {}));
class gg {
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
    if (!le.isVtxoTreeResponse(o))
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
    if (!le.isVtxoTreeLeavesResponse(o))
      throw new Error("Invalid vtxos tree leaves data received");
    return o;
  }
  async getBatchSweepTransactions(t) {
    const n = `${this.serverUrl}/v1/indexer/batch/${t.txid}/${t.vout}/sweepTxs`, r = await fetch(n);
    if (!r.ok)
      throw new Error(`Failed to fetch batch sweep transactions: ${r.statusText}`);
    const i = await r.json();
    if (!le.isBatchSweepTransactionsResponse(i))
      throw new Error("Invalid batch sweep transactions data received");
    return i;
  }
  async getCommitmentTx(t) {
    const n = `${this.serverUrl}/v1/indexer/commitmentTx/${t}`, r = await fetch(n);
    if (!r.ok)
      throw new Error(`Failed to fetch commitment tx: ${r.statusText}`);
    const i = await r.json();
    if (!le.isCommitmentTx(i))
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
    if (!le.isConnectorsResponse(o))
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
    if (!le.isForfeitTxsResponse(o))
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
          for await (const o of gc(i)) {
            if (n?.aborted)
              break;
            try {
              const a = JSON.parse(o.data);
              a.event && (yield {
                txid: a.event.txid,
                scripts: a.event.scripts || [],
                newVtxos: (a.event.newVtxos || []).map(us),
                spentVtxos: (a.event.spentVtxos || []).map(us),
                sweptVtxos: (a.event.sweptVtxos || []).map(us),
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
        if (wc(i)) {
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
    if (!le.isVirtualTxsResponse(o))
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
    if (!le.isVtxoChainResponse(o))
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
    if (!le.isVtxosResponse(s))
      throw new Error("Invalid vtxos data received");
    return {
      vtxos: s.vtxos.map(us),
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
function us(e) {
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
var le;
(function(e) {
  function t(g) {
    return typeof g == "object" && typeof g.totalOutputAmount == "string" && typeof g.totalOutputVtxos == "number" && typeof g.expiresAt == "string" && typeof g.swept == "boolean";
  }
  function n(g) {
    return typeof g == "object" && typeof g.txid == "string" && typeof g.expiresAt == "string" && Object.values(Ir).includes(g.type) && Array.isArray(g.spends) && g.spends.every((M) => typeof M == "string");
  }
  function r(g) {
    return typeof g == "object" && typeof g.startedAt == "string" && typeof g.endedAt == "string" && typeof g.totalInputAmount == "string" && typeof g.totalInputVtxos == "number" && typeof g.totalOutputAmount == "string" && typeof g.totalOutputVtxos == "number" && typeof g.batches == "object" && Object.values(g.batches).every(t);
  }
  e.isCommitmentTx = r;
  function i(g) {
    return typeof g == "object" && typeof g.txid == "string" && typeof g.vout == "number";
  }
  e.isOutpoint = i;
  function s(g) {
    return Array.isArray(g) && g.every(i);
  }
  e.isOutpointArray = s;
  function o(g) {
    return typeof g == "object" && typeof g.txid == "string" && typeof g.children == "object" && Object.values(g.children).every(l) && Object.keys(g.children).every((M) => Number.isInteger(Number(M)));
  }
  function a(g) {
    return Array.isArray(g) && g.every(o);
  }
  e.isTxsArray = a;
  function c(g) {
    return typeof g == "object" && typeof g.amount == "string" && typeof g.createdAt == "string" && typeof g.isSettled == "boolean" && typeof g.settledBy == "string" && Object.values(yc).includes(g.type) && (!g.commitmentTxid && typeof g.virtualTxid == "string" || typeof g.commitmentTxid == "string" && !g.virtualTxid);
  }
  function u(g) {
    return Array.isArray(g) && g.every(c);
  }
  e.isTxHistoryRecordArray = u;
  function l(g) {
    return typeof g == "string" && g.length === 64;
  }
  function d(g) {
    return Array.isArray(g) && g.every(l);
  }
  e.isTxidArray = d;
  function h(g) {
    return typeof g == "object" && i(g.outpoint) && typeof g.createdAt == "string" && (g.expiresAt === null || typeof g.expiresAt == "string") && typeof g.amount == "string" && typeof g.script == "string" && typeof g.isPreconfirmed == "boolean" && typeof g.isSwept == "boolean" && typeof g.isUnrolled == "boolean" && typeof g.isSpent == "boolean" && (!g.spentBy || typeof g.spentBy == "string") && (!g.settledBy || typeof g.settledBy == "string") && (!g.arkTxid || typeof g.arkTxid == "string") && Array.isArray(g.commitmentTxids) && g.commitmentTxids.every(l);
  }
  function p(g) {
    return typeof g == "object" && typeof g.current == "number" && typeof g.next == "number" && typeof g.total == "number";
  }
  function w(g) {
    return typeof g == "object" && Array.isArray(g.vtxoTree) && g.vtxoTree.every(o) && (!g.page || p(g.page));
  }
  e.isVtxoTreeResponse = w;
  function f(g) {
    return typeof g == "object" && Array.isArray(g.leaves) && g.leaves.every(i) && (!g.page || p(g.page));
  }
  e.isVtxoTreeLeavesResponse = f;
  function y(g) {
    return typeof g == "object" && Array.isArray(g.connectors) && g.connectors.every(o) && (!g.page || p(g.page));
  }
  e.isConnectorsResponse = y;
  function E(g) {
    return typeof g == "object" && Array.isArray(g.txids) && g.txids.every(l) && (!g.page || p(g.page));
  }
  e.isForfeitTxsResponse = E;
  function I(g) {
    return typeof g == "object" && Array.isArray(g.sweptBy) && g.sweptBy.every(l);
  }
  e.isSweptCommitmentTxResponse = I;
  function O(g) {
    return typeof g == "object" && Array.isArray(g.sweptBy) && g.sweptBy.every(l);
  }
  e.isBatchSweepTransactionsResponse = O;
  function B(g) {
    return typeof g == "object" && Array.isArray(g.txs) && g.txs.every((M) => typeof M == "string") && (!g.page || p(g.page));
  }
  e.isVirtualTxsResponse = B;
  function N(g) {
    return typeof g == "object" && Array.isArray(g.chain) && g.chain.every(n) && (!g.page || p(g.page));
  }
  e.isVtxoChainResponse = N;
  function V(g) {
    return typeof g == "object" && Array.isArray(g.vtxos) && g.vtxos.every(h) && (!g.page || p(g.page));
  }
  e.isVtxosResponse = V;
})(le || (le = {}));
const MT = 546;
function rn(e, t) {
  return {
    ...t,
    forfeitTapLeafScript: e.offchainTapscript.forfeit(),
    intentTapLeafScript: e.offchainTapscript.forfeit(),
    tapTree: e.offchainTapscript.encode()
  };
}
function mc(e, t) {
  return {
    ...t,
    forfeitTapLeafScript: e.boardingTapscript.forfeit(),
    intentTapLeafScript: e.boardingTapscript.forfeit(),
    tapTree: e.boardingTapscript.encode()
  };
}
function HT() {
  const e = crypto.getRandomValues(new Uint8Array(16));
  return x.encode(e);
}
class ks {
  constructor(t, n = /* @__PURE__ */ new Map()) {
    this.root = t, this.children = n;
  }
  static create(t) {
    if (t.length === 0)
      throw new Error("empty chunks");
    const n = /* @__PURE__ */ new Map();
    for (const s of t) {
      const o = WT(s), a = o.tx.id;
      n.set(a, o);
    }
    const r = [];
    for (const [s] of n) {
      let o = !1;
      for (const [a, c] of n)
        if (a !== s && (o = KT(c, s), o))
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
    const i = wg(r[0], n);
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
      if (!s.txid || x.encode(s.txid) !== o || s.index !== r)
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
function KT(e, t) {
  return Object.values(e.children).includes(t);
}
function wg(e, t) {
  const n = t.get(e);
  if (!n)
    return null;
  const r = n.tx, i = /* @__PURE__ */ new Map();
  for (const [s, o] of Object.entries(n.children)) {
    const a = parseInt(s), c = wg(o, t);
    c && i.set(a, c);
  }
  return new ks(r, i);
}
function WT(e) {
  return { tx: rt.fromPSBT(G.decode(e.tx)), children: e.children };
}
var bc;
(function(e) {
  let t;
  (function(r) {
    r.Start = "start", r.BatchStarted = "batch_started", r.TreeSigningStarted = "tree_signing_started", r.TreeNoncesAggregated = "tree_nonces_aggregated", r.BatchFinalization = "batch_finalization";
  })(t || (t = {}));
  async function n(r, i, s = {}) {
    const { abortController: o, skipVtxoTreeSigning: a = !1, eventCallback: c } = s;
    let u = t.Start;
    const l = [], d = [];
    let h, p;
    for await (const w of r) {
      if (o?.signal.aborted)
        throw new Error("canceled");
      switch (c && c(w).catch(() => {
      }), w.type) {
        case Et.BatchStarted: {
          const f = w, { skip: y } = await i.onBatchStarted(f);
          y || (u = t.BatchStarted, a && (u = t.TreeNoncesAggregated));
          continue;
        }
        case Et.BatchFinalized: {
          if (u !== t.BatchFinalization)
            continue;
          return i.onBatchFinalized && await i.onBatchFinalized(w), w.commitmentTxid;
        }
        case Et.BatchFailed: {
          if (i.onBatchFailed) {
            await i.onBatchFailed(w);
            continue;
          }
          throw new Error(w.reason);
        }
        case Et.TreeTx: {
          if (u !== t.BatchStarted && u !== t.TreeNoncesAggregated)
            continue;
          w.batchIndex === 0 ? l.push(w.chunk) : d.push(w.chunk), i.onTreeTxEvent && await i.onTreeTxEvent(w);
          continue;
        }
        case Et.TreeSignature: {
          if (u !== t.TreeNoncesAggregated)
            continue;
          if (!h)
            throw new Error("vtxo tree not initialized");
          const f = x.decode(w.signature);
          h.update(w.txid, (y) => {
            y.updateInput(0, {
              tapKeySig: f
            });
          }), i.onTreeSignatureEvent && await i.onTreeSignatureEvent(w);
          continue;
        }
        case Et.TreeSigningStarted: {
          if (u !== t.BatchStarted)
            continue;
          h = ks.create(l);
          const { skip: f } = await i.onTreeSigningStarted(w, h);
          f || (u = t.TreeSigningStarted);
          continue;
        }
        case Et.TreeNonces: {
          if (u !== t.TreeSigningStarted)
            continue;
          const { fullySigned: f } = await i.onTreeNonces(w);
          f && (u = t.TreeNoncesAggregated);
          continue;
        }
        case Et.BatchFinalization: {
          if (u !== t.TreeNoncesAggregated)
            continue;
          if (!h && l.length > 0 && (h = ks.create(l)), !h && !a)
            throw new Error("vtxo tree not initialized");
          d.length > 0 && (p = ks.create(d)), await i.onBatchFinalization(w, h, p), u = t.BatchFinalization;
          continue;
        }
        default:
          continue;
      }
    }
    throw new Error("event stream closed");
  }
  e.join = n;
})(bc || (bc = {}));
const Ru = "amount", zT = "expiry", jT = "birth", qT = "weight", GT = "inputType", YT = "script", Kr = {
  signature: "now(): double",
  implementation: () => Math.floor(Date.now() / 1e3)
}, Dd = new ze().registerVariable(Ru, "double").registerVariable(YT, "string").registerFunction(Kr.signature, Kr.implementation), ZT = new ze().registerVariable(Ru, "double").registerVariable(zT, "double").registerVariable(jT, "double").registerVariable(qT, "double").registerVariable(GT, "string").registerFunction(Kr.signature, Kr.implementation), XT = new ze().registerVariable(Ru, "double").registerFunction(Kr.signature, Kr.implementation);
class Ht {
  constructor(t) {
    this.value = t;
  }
  get satoshis() {
    return this.value ? Math.ceil(this.value) : 0;
  }
  add(t) {
    return new Ht(this.value + t.value);
  }
}
Ht.ZERO = new Ht(0);
class QT {
  /**
   * Creates a new Estimator with the given config
   * @param config - Configuration containing CEL programs for fee calculation
   */
  constructor(t) {
    this.config = t, this.intentOffchainInput = t.offchainInput ? ls(t.offchainInput, ZT) : void 0, this.intentOnchainInput = t.onchainInput ? ls(t.onchainInput, XT) : void 0, this.intentOffchainOutput = t.offchainOutput ? ls(t.offchainOutput, Dd) : void 0, this.intentOnchainOutput = t.onchainOutput ? ls(t.onchainOutput, Dd) : void 0;
  }
  /**
   * Evaluates the fee for a given vtxo input
   * @param input - The offchain input to evaluate
   * @returns The fee amount for this input
   */
  evalOffchainInput(t) {
    if (!this.intentOffchainInput)
      return Ht.ZERO;
    const n = JT(t);
    return new Ht(this.intentOffchainInput.program(n));
  }
  /**
   * Evaluates the fee for a given boarding input
   * @param input - The onchain input to evaluate
   * @returns The fee amount for this input
   */
  evalOnchainInput(t) {
    if (!this.intentOnchainInput)
      return Ht.ZERO;
    const n = {
      amount: Number(t.amount)
    };
    return new Ht(this.intentOnchainInput.program(n));
  }
  /**
   * Evaluates the fee for a given vtxo output
   * @param output - The output to evaluate
   * @returns The fee amount for this output
   */
  evalOffchainOutput(t) {
    if (!this.intentOffchainOutput)
      return Ht.ZERO;
    const n = Vd(t);
    return new Ht(this.intentOffchainOutput.program(n));
  }
  /**
   * Evaluates the fee for a given collaborative exit output
   * @param output - The output to evaluate
   * @returns The fee amount for this output
   */
  evalOnchainOutput(t) {
    if (!this.intentOnchainOutput)
      return Ht.ZERO;
    const n = Vd(t);
    return new Ht(this.intentOnchainOutput.program(n));
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
    let s = Ht.ZERO;
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
function JT(e) {
  const t = {
    amount: Number(e.amount),
    inputType: e.type,
    weight: e.weight
  };
  return e.expiry && (t.expiry = Math.floor(e.expiry.getTime() / 1e3)), e.birth && (t.birth = Math.floor(e.birth.getTime() / 1e3)), t;
}
function Vd(e) {
  return {
    amount: Number(e.amount),
    script: e.script
  };
}
function ls(e, t) {
  const n = t.parse(e), r = n.check();
  if (!r.valid)
    throw new Error(`type check failed: ${r.error?.message ?? "unknown error"}`);
  if (r.type !== "double")
    throw new Error(`expected return type double, got ${r.type}`);
  return { program: n, text: e };
}
const ai = {
  commitmentTxid: "",
  boardingTxid: "",
  arkTxid: ""
};
async function tS(e, t, n, r) {
  const i = [...e].sort((u, l) => u.createdAt.getTime() - l.createdAt.getTime()), s = [];
  let o = [];
  for (const u of i)
    if (u.status.isLeaf ? !n.has(u.virtualStatus.commitmentTxIds[0]) && i.filter((l) => l.settledBy === u.virtualStatus.commitmentTxIds[0]).length === 0 && o.push({
      key: {
        ...ai,
        commitmentTxid: u.virtualStatus.commitmentTxIds[0]
      },
      tag: "batch",
      type: Je.TxReceived,
      amount: u.value,
      settled: u.status.isLeaf || u.isSpent,
      createdAt: u.createdAt.getTime()
    }) : i.filter((l) => l.arkTxId === u.txid).length === 0 && o.push({
      key: { ...ai, arkTxid: u.txid },
      tag: "offchain",
      type: Je.TxReceived,
      amount: u.value,
      settled: u.status.isLeaf || u.isSpent,
      createdAt: u.createdAt.getTime()
    }), u.isSpent) {
      if (u.arkTxId && !s.some((l) => l.key.arkTxid === u.arkTxId)) {
        const l = i.filter((f) => f.txid === u.arkTxId), h = i.filter((f) => f.arkTxId === u.arkTxId).reduce((f, y) => f + y.value, 0);
        let p = 0, w = 0;
        if (l.length > 0) {
          const f = l.reduce((y, E) => y + E.value, 0);
          p = h - f, w = l[0].createdAt.getTime();
        } else
          p = h, w = r ? await r(u.arkTxId) : u.createdAt.getTime() + 1;
        s.push({
          key: { ...ai, arkTxid: u.arkTxId },
          tag: "offchain",
          type: Je.TxSent,
          amount: p,
          settled: !0,
          createdAt: w
        });
      }
      if (u.settledBy && !n.has(u.settledBy) && !s.some((l) => l.key.commitmentTxid === u.settledBy)) {
        const l = i.filter((p) => p.status.isLeaf && p.virtualStatus.commitmentTxIds?.every((w) => u.settledBy === w)), h = i.filter((p) => p.settledBy === u.settledBy).reduce((p, w) => p + w.value, 0);
        if (l.length > 0) {
          const p = l.reduce((w, f) => w + f.value, 0);
          h > p && s.push({
            key: { ...ai, commitmentTxid: u.settledBy },
            tag: "exit",
            type: Je.TxSent,
            amount: h - p,
            settled: !0,
            createdAt: l[0].createdAt.getTime()
          });
        } else
          s.push({
            key: { ...ai, commitmentTxid: u.settledBy },
            tag: "exit",
            type: Je.TxSent,
            amount: h,
            settled: !0,
            // TODO: fetch commitment tx with /v1/indexer/commitmentTx/<commitmentTxid> to know when the tx was made
            createdAt: u.createdAt.getTime() + 1
          });
      }
    }
  return [...t.map((u) => ({ ...u, tag: "boarding" })), ...s, ...o].sort((u, l) => l.createdAt - u.createdAt);
}
const _e = "vtxos", Ue = "utxos", Le = "transactions", yn = "walletState", de = "contracts", Fd = "contractsCollections", yg = 2;
function mg(e) {
  if (!e.objectStoreNames.contains(_e)) {
    const t = e.createObjectStore(_e, {
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
  if (!e.objectStoreNames.contains(Ue)) {
    const t = e.createObjectStore(Ue, {
      keyPath: ["address", "txid", "vout"]
    });
    t.indexNames.contains("address") || t.createIndex("address", "address", {
      unique: !1
    }), t.indexNames.contains("txid") || t.createIndex("txid", "txid", { unique: !1 }), t.indexNames.contains("value") || t.createIndex("value", "value", { unique: !1 }), t.indexNames.contains("status") || t.createIndex("status", "status", {
      unique: !1
    });
  }
  if (!e.objectStoreNames.contains(Le)) {
    const t = e.createObjectStore(Le, {
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
  if (e.objectStoreNames.contains(yn) || e.createObjectStore(yn, {
    keyPath: "key"
  }), !e.objectStoreNames.contains(de)) {
    const t = e.createObjectStore(de, {
      keyPath: "script"
    });
    t.indexNames.contains("type") || t.createIndex("type", "type", {
      unique: !1
    }), t.indexNames.contains("state") || t.createIndex("state", "state", {
      unique: !1
    });
  }
  e.objectStoreNames.contains(Fd) || e.createObjectStore(Fd, {
    keyPath: "key"
  });
}
const go = ([e, t]) => ({
  cb: x.encode(Wt.encode(e)),
  s: x.encode(t)
}), eS = (e) => ({
  ...e,
  tapTree: x.encode(e.tapTree),
  forfeitTapLeafScript: go(e.forfeitTapLeafScript),
  intentTapLeafScript: go(e.intentTapLeafScript),
  extraWitness: e.extraWitness?.map(x.encode)
}), nS = (e) => ({
  ...e,
  tapTree: x.encode(e.tapTree),
  forfeitTapLeafScript: go(e.forfeitTapLeafScript),
  intentTapLeafScript: go(e.intentTapLeafScript),
  extraWitness: e.extraWitness?.map(x.encode)
}), wo = (e) => {
  const t = Wt.decode(x.decode(e.cb)), n = x.decode(e.s);
  return [t, n];
}, rS = (e) => ({
  ...e,
  createdAt: new Date(e.createdAt),
  tapTree: x.decode(e.tapTree),
  forfeitTapLeafScript: wo(e.forfeitTapLeafScript),
  intentTapLeafScript: wo(e.intentTapLeafScript),
  extraWitness: e.extraWitness?.map(x.decode)
}), iS = (e) => ({
  ...e,
  tapTree: x.decode(e.tapTree),
  forfeitTapLeafScript: wo(e.forfeitTapLeafScript),
  intentTapLeafScript: wo(e.intentTapLeafScript),
  extraWitness: e.extraWitness?.map(x.decode)
});
function sS() {
  if (typeof globalThis < "u")
    return typeof globalThis.self == "object" && globalThis.self !== null ? { globalObject: globalThis.self } : typeof globalThis.window == "object" && globalThis.window !== null ? { globalObject: globalThis.window } : { globalObject: globalThis };
  throw new Error("Global object not found");
}
const Ii = /* @__PURE__ */ new Map(), Xn = /* @__PURE__ */ new Map();
async function bg(e, t, n) {
  const { globalObject: r } = sS();
  if (!r.indexedDB)
    throw new Error("IndexedDB is not available in this environment");
  const i = Ii.get(e);
  if (i) {
    if (i.version !== t)
      throw new Error(`Database "${e}" already opened with version ${i.version}; requested ${t}`);
    return Xn.set(e, (Xn.get(e) ?? 0) + 1), i.promise;
  }
  const s = new Promise((o, a) => {
    const c = r.indexedDB.open(e, t);
    c.onerror = () => {
      Ii.delete(e), Xn.delete(e), a(c.error);
    }, c.onsuccess = () => {
      o(c.result);
    }, c.onupgradeneeded = () => {
      const u = c.result;
      n(u);
    }, c.onblocked = () => {
      console.warn("Database upgrade blocked - close other tabs/connections");
    };
  });
  return Ii.set(e, { version: t, promise: s }), Xn.set(e, 1), s;
}
async function xg(e) {
  const t = Ii.get(e);
  if (!t)
    return !1;
  const n = (Xn.get(e) ?? 1) - 1;
  if (n > 0)
    return Xn.set(e, n), !1;
  Xn.delete(e), Ii.delete(e);
  try {
    (await t.promise).close();
  } catch {
  }
  return !0;
}
const vg = "arkade-service-worker";
class Eg {
  constructor(t = vg) {
    this.dbName = t, this.db = null;
  }
  async clear() {
    try {
      const t = await this.getDB();
      return new Promise((n, r) => {
        const i = t.transaction([de], "readwrite"), s = i.objectStore(de), o = i.objectStore(de), a = s.clear(), c = o.clear();
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
      const r = (await this.getDB()).transaction([de], "readonly").objectStore(de);
      if (!t || Object.keys(t).length === 0)
        return new Promise((o, a) => {
          const c = r.getAll();
          c.onerror = () => a(c.error), c.onsuccess = () => o(c.result ?? []);
        });
      const i = aS(t);
      if (i.has("script")) {
        const o = i.get("script"), a = await Promise.all(o.map((c) => new Promise((u, l) => {
          const d = r.get(c);
          d.onerror = () => l(d.error), d.onsuccess = () => u(d.result);
        })));
        return this.applyContractFilter(a, i);
      }
      if (i.has("state")) {
        const o = await this.getContractsByIndexValues(r, "state", i.get("state"));
        return this.applyContractFilter(o, i);
      }
      if (i.has("type")) {
        const o = await this.getContractsByIndexValues(r, "type", i.get("type"));
        return this.applyContractFilter(o, i);
      }
      const s = await new Promise((o, a) => {
        const c = r.getAll();
        c.onerror = () => a(c.error), c.onsuccess = () => o(c.result ?? []);
      });
      return this.applyContractFilter(s, i);
    } catch (n) {
      return console.error("Failed to get contracts:", n), [];
    }
  }
  async saveContract(t) {
    try {
      const n = await this.getDB();
      return new Promise((r, i) => {
        const a = n.transaction([de], "readwrite").objectStore(de).put(t);
        a.onerror = () => i(a.error), a.onsuccess = () => r();
      });
    } catch (n) {
      throw console.error("Failed to save contract:", n), n;
    }
  }
  async deleteContract(t) {
    try {
      const n = await this.getDB();
      return new Promise((r, i) => {
        const o = n.transaction([de], "readwrite").objectStore(de), a = o.get(t);
        a.onerror = () => i(a.error), a.onsuccess = () => {
          const c = o.delete(t);
          c.onerror = () => i(c.error), c.onsuccess = () => r();
        };
      });
    } catch (n) {
      throw console.error(`Failed to delete contract ${t}:`, n), n;
    }
  }
  getContractsByIndexValues(t, n, r) {
    if (r.length === 0)
      return Promise.resolve([]);
    const i = t.index(n), s = r.map((o) => new Promise((a, c) => {
      const u = i.getAll(o);
      u.onerror = () => c(u.error), u.onsuccess = () => a(u.result ?? []);
    }));
    return Promise.all(s).then((o) => o.flatMap((a) => a));
  }
  applyContractFilter(t, n) {
    return t.filter((r) => !(r === void 0 || n.has("script") && !n.get("script")?.includes(r.script) || n.has("state") && !n.get("state")?.includes(r.state) || n.has("type") && !n.get("type")?.includes(r.type)));
  }
  async getDB() {
    return this.db ? this.db : (this.db = await bg(this.dbName, yg, mg), this.db);
  }
  async [Symbol.asyncDispose]() {
    this.db && (await xg(this.dbName), this.db = null);
  }
}
const oS = ["script", "state", "type"];
function aS(e) {
  const t = /* @__PURE__ */ new Map();
  return oS.forEach((n) => {
    e?.[n] && (Array.isArray(e[n]) ? t.set(n, e[n]) : t.set(n, [e[n]]));
  }), t;
}
class Tg {
  constructor(t = vg) {
    this.dbName = t, this.db = null;
  }
  async clear() {
    try {
      const t = await this.getDB();
      return new Promise((n, r) => {
        const i = t.transaction([
          _e,
          Ue,
          Le,
          yn
        ], "readwrite"), s = i.objectStore(_e), o = i.objectStore(Ue), a = i.objectStore(Le), c = i.objectStore(yn), u = [
          s.clear(),
          o.clear(),
          a.clear(),
          c.clear()
        ];
        let l = 0;
        const d = () => {
          l++, l === u.length && n();
        };
        u.forEach((h) => {
          h.onsuccess = d, h.onerror = () => r(h.error);
        });
      });
    } catch (t) {
      throw console.error("Failed to clear wallet data:", t), t;
    }
  }
  async [Symbol.asyncDispose]() {
    this.db && (await xg(this.dbName), this.db = null);
  }
  async getVtxos(t) {
    try {
      const n = await this.getDB();
      return new Promise((r, i) => {
        const c = n.transaction([_e], "readonly").objectStore(_e).index("address").getAll(t);
        c.onerror = () => i(c.error), c.onsuccess = () => {
          const l = (c.result || []).map(rS);
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
      return new Promise((i, s) => {
        const o = r.transaction([_e], "readwrite"), a = o.objectStore(_e), c = n.map((u) => new Promise((l, d) => {
          const h = eS(u), p = {
            address: t,
            ...h
          }, w = a.put(p);
          w.onerror = () => d(w.error), w.onsuccess = () => l();
        }));
        Promise.all(c).then(() => i()).catch(s), o.onerror = () => s(o.error);
      });
    } catch (r) {
      throw console.error(`Failed to save VTXOs for address ${t}:`, r), r;
    }
  }
  async deleteVtxos(t) {
    try {
      const n = await this.getDB();
      return new Promise((r, i) => {
        const c = n.transaction([_e], "readwrite").objectStore(_e).index("address").openCursor(IDBKeyRange.only(t));
        c.onerror = () => i(c.error), c.onsuccess = () => {
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
      return new Promise((r, i) => {
        const c = n.transaction([Ue], "readonly").objectStore(Ue).index("address").getAll(t);
        c.onerror = () => i(c.error), c.onsuccess = () => {
          const l = (c.result || []).map(iS);
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
      return new Promise((i, s) => {
        const o = r.transaction([Ue], "readwrite"), a = o.objectStore(Ue), c = n.map((u) => new Promise((l, d) => {
          const h = nS(u), p = {
            address: t,
            ...h
          }, w = a.put(p);
          w.onerror = () => d(w.error), w.onsuccess = () => l();
        }));
        Promise.all(c).then(() => i()).catch(s), o.onerror = () => s(o.error);
      });
    } catch (r) {
      throw console.error(`Failed to save UTXOs for address ${t}:`, r), r;
    }
  }
  async deleteUtxos(t) {
    try {
      const n = await this.getDB();
      return new Promise((r, i) => {
        const c = n.transaction([Ue], "readwrite").objectStore(Ue).index("address").openCursor(IDBKeyRange.only(t));
        c.onerror = () => i(c.error), c.onsuccess = () => {
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
      return new Promise((r, i) => {
        const c = n.transaction([Le], "readonly").objectStore(Le).index("address").getAll(t);
        c.onerror = () => i(c.error), c.onsuccess = () => {
          const u = c.result || [];
          r(u.sort((l, d) => l.createdAt - d.createdAt));
        };
      });
    } catch (n) {
      return console.error(`Failed to get transaction history for address ${t}:`, n), [];
    }
  }
  async saveTransactions(t, n) {
    try {
      const r = await this.getDB();
      return new Promise((i, s) => {
        const o = r.transaction([Le], "readwrite"), a = o.objectStore(Le);
        n.forEach((c) => {
          const u = {
            address: t,
            ...c,
            keyBoardingTxid: c.key.boardingTxid,
            keyCommitmentTxid: c.key.commitmentTxid,
            keyArkTxid: c.key.arkTxid
          };
          a.put(u);
        }), o.oncomplete = () => i(), o.onerror = () => s(o.error), o.onabort = () => s(new Error("Transaction aborted"));
      });
    } catch (r) {
      throw console.error(`Failed to save transactions for address ${t}:`, r), r;
    }
  }
  async deleteTransactions(t) {
    try {
      const n = await this.getDB();
      return new Promise((r, i) => {
        const c = n.transaction([Le], "readwrite").objectStore(Le).index("address").openCursor(IDBKeyRange.only(t));
        c.onerror = () => i(c.error), c.onsuccess = () => {
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
        const o = t.transaction([yn], "readonly").objectStore(yn).get("state");
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
      return new Promise((r, i) => {
        const o = n.transaction([yn], "readwrite").objectStore(yn), a = {
          key: "state",
          data: t
        }, c = o.put(a);
        c.onerror = () => i(c.error), c.onsuccess = () => r();
      });
    } catch (n) {
      throw console.error("Failed to save wallet state:", n), n;
    }
  }
  async getDB() {
    return this.db ? this.db : (this.db = await bg(this.dbName, yg, mg), this.db);
  }
}
class cS {
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
    const { contractScripts: n, includeSpent: r } = t, i = this.config.walletRepository, o = Array.from(this.contracts.values()).filter((c) => !(n && !n.includes(c.contract.script))).map(async (c) => {
      const u = await i.getVtxos(c.contract.address);
      if (u.length > 0) {
        const l = u.map((h) => ({
          ...h,
          contractScript: c.contract.script
        })), d = r ? l : l.filter((h) => !h.isSpent);
        return [[c.contract.script, d]];
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
      for (const i of t) {
        const s = this.contracts.get(i);
        if (!s)
          continue;
        const o = r.get(i) || [], a = new Set(o.map((l) => `${l.txid}:${l.vout}`)), c = [];
        for (const l of o) {
          const d = `${l.txid}:${l.vout}`;
          s.lastKnownVtxos.has(d) || (c.push(l), s.lastKnownVtxos.set(d, l));
        }
        const u = [];
        for (const [l, d] of s.lastKnownVtxos)
          a.has(l) || (u.push(d), s.lastKnownVtxos.delete(l));
        c.length > 0 && this.emitVtxoEvent(i, c, "vtxo_received", n), u.length > 0 && this.emitVtxoEvent(i, u, "vtxo_spent", n);
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
  processSubscriptionVtxos(t, n, r, i) {
    if (n.length === 1) {
      const s = n[0];
      if (s) {
        const o = this.contracts.get(s);
        if (o)
          for (const a of t) {
            const c = `${a.txid}:${a.vout}`;
            r === "vtxo_received" ? o.lastKnownVtxos.set(c, a) : r === "vtxo_spent" && o.lastKnownVtxos.delete(c);
          }
        this.emitVtxoEvent(s, t, r, i);
      }
      return;
    }
    for (const s of n) {
      const o = s;
      if (o) {
        const a = this.contracts.get(o);
        if (a)
          for (const c of t) {
            const u = `${c.txid}:${c.vout}`;
            r === "vtxo_received" ? a.lastKnownVtxos.set(u, c) : a.lastKnownVtxos.delete(u);
          }
        this.emitVtxoEvent(o, t, r, i);
      }
    }
  }
  /**
   * Emit a VTXO event for a contract.
   */
  emitVtxoEvent(t, n, r, i) {
    if (!this.eventCallback)
      return;
    const s = this.contracts.get(t);
    switch (this.checkExpiredContracts(), r) {
      case "vtxo_received":
        if (!s)
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
          contract: s.contract,
          timestamp: i
        });
        return;
      case "vtxo_spent":
        if (!s)
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
          contract: s.contract,
          timestamp: i
        });
        return;
      case "contract_expired":
        if (!s)
          return;
        this.eventCallback({
          type: "contract_expired",
          contractScript: t,
          contract: s.contract,
          timestamp: i
        });
        return;
      default:
        return;
    }
  }
}
class uS {
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
const Ai = new uS();
function Ri(e) {
  return ve.encode(e.type === "blocks" ? { blocks: Number(e.value) } : { seconds: Number(e.value) });
}
function $i(e) {
  const t = ve.decode(e);
  if ("blocks" in t && t.blocks !== void 0)
    return { type: "blocks", value: BigInt(t.blocks) };
  if ("seconds" in t && t.seconds !== void 0)
    return { type: "seconds", value: BigInt(t.seconds) };
  throw new Error(`Invalid BIP68 sequence: ${e}`);
}
function Ia(e, t) {
  if (t.role === "sender" || t.role === "receiver")
    return t.role;
  if (t.walletPubKey) {
    if (t.walletPubKey === e.params.sender)
      return "sender";
    if (t.walletPubKey === e.params.receiver)
      return "receiver";
  }
}
function wr(e, t) {
  if (t === void 0)
    return !0;
  if (!e.vtxo)
    return !1;
  const n = $i(t);
  if (n.type === "blocks")
    return e.blockHeight === void 0 || e.vtxo.status.block_height === void 0 ? !1 : e.blockHeight - e.vtxo.status.block_height >= Number(n.value);
  if (n.type === "seconds") {
    const r = e.vtxo.status.block_time;
    return r === void 0 ? !1 : e.currentTime / 1e3 - r >= Number(n.value);
  }
  return !1;
}
const lS = {
  type: "default",
  createScript(e) {
    const t = this.deserializeParams(e);
    return new tr.Script(t);
  },
  serializeParams(e) {
    return {
      pubKey: x.encode(e.pubKey),
      serverPubKey: x.encode(e.serverPubKey),
      csvTimelock: Ri(e.csvTimelock).toString()
    };
  },
  deserializeParams(e) {
    const t = e.csvTimelock ? $i(Number(e.csvTimelock)) : tr.Script.DEFAULT_TIMELOCK;
    return {
      pubKey: x.decode(e.pubKey),
      serverPubKey: x.decode(e.serverPubKey),
      csvTimelock: t
    };
  },
  selectPath(e, t, n) {
    if (n.collaborative)
      return { leaf: e.forfeit() };
    const r = t.params.csvTimelock ? Number(t.params.csvTimelock) : void 0;
    return wr(n, r) ? {
      leaf: e.exit(),
      sequence: r
    } : null;
  },
  getAllSpendingPaths(e, t, n) {
    const r = [];
    n.collaborative && r.push({ leaf: e.forfeit() });
    const i = { leaf: e.exit() };
    return t.params.csvTimelock && (i.sequence = Number(t.params.csvTimelock)), r.push(i), r;
  },
  getSpendablePaths(e, t, n) {
    const r = [];
    n.collaborative && r.push({ leaf: e.forfeit() });
    const i = t.params.csvTimelock ? Number(t.params.csvTimelock) : void 0;
    if (wr(n, i)) {
      const s = { leaf: e.exit() };
      i !== void 0 && (s.sequence = i), r.push(s);
    }
    return r;
  }
}, dS = {
  type: "vhtlc",
  createScript(e) {
    const t = this.deserializeParams(e);
    return new pc.Script(t);
  },
  serializeParams(e) {
    return {
      sender: x.encode(e.sender),
      receiver: x.encode(e.receiver),
      server: x.encode(e.server),
      hash: x.encode(e.preimageHash),
      refundLocktime: e.refundLocktime.toString(),
      claimDelay: Ri(e.unilateralClaimDelay).toString(),
      refundDelay: Ri(e.unilateralRefundDelay).toString(),
      refundNoReceiverDelay: Ri(e.unilateralRefundWithoutReceiverDelay).toString()
    };
  },
  deserializeParams(e) {
    return {
      sender: x.decode(e.sender),
      receiver: x.decode(e.receiver),
      server: x.decode(e.server),
      preimageHash: x.decode(e.hash),
      refundLocktime: BigInt(e.refundLocktime),
      unilateralClaimDelay: $i(Number(e.claimDelay)),
      unilateralRefundDelay: $i(Number(e.refundDelay)),
      unilateralRefundWithoutReceiverDelay: $i(Number(e.refundNoReceiverDelay))
    };
  },
  /**
   * Select spending path based on context.
   *
   * Role is determined from `context.role` or by matching `context.walletPubKey`
   * against sender/receiver in contract params.
   */
  selectPath(e, t, n) {
    const r = Ia(t, n), i = t.params?.preimage, s = BigInt(t.params.refundLocktime), o = Math.floor(n.currentTime / 1e3);
    if (!r)
      return null;
    if (n.collaborative)
      return r === "receiver" && i ? {
        leaf: e.claim(),
        extraWitness: [x.decode(i)]
      } : r === "sender" && BigInt(o) >= s ? {
        leaf: e.refundWithoutReceiver()
      } : null;
    if (r === "receiver" && i) {
      const a = Number(t.params.claimDelay);
      return wr(n, a) ? {
        leaf: e.unilateralClaim(),
        extraWitness: [x.decode(i)],
        sequence: a
      } : null;
    }
    if (r === "sender") {
      const a = Number(t.params.refundNoReceiverDelay);
      return wr(n, a) ? {
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
    const r = Ia(t, n), i = [];
    if (!r)
      return i;
    const s = t.params?.preimage;
    if (n.collaborative)
      r === "receiver" && s && i.push({
        leaf: e.claim(),
        extraWitness: [x.decode(s)]
      }), r === "sender" && i.push({
        leaf: e.refundWithoutReceiver()
      });
    else {
      if (r === "receiver" && s) {
        const o = Number(t.params.claimDelay);
        i.push({
          leaf: e.unilateralClaim(),
          extraWitness: [x.decode(s)],
          sequence: o
        });
      }
      if (r === "sender") {
        const o = Number(t.params.refundNoReceiverDelay);
        i.push({
          leaf: e.unilateralRefundWithoutReceiver(),
          sequence: o
        });
      }
    }
    return i;
  },
  getSpendablePaths(e, t, n) {
    const r = Ia(t, n), i = [];
    if (!r)
      return i;
    const s = t.params?.preimage, o = BigInt(t.params.refundLocktime), a = Math.floor(n.currentTime / 1e3);
    if (n.collaborative)
      return r === "receiver" && s && i.push({
        leaf: e.claim(),
        extraWitness: [x.decode(s)]
      }), r === "sender" && BigInt(a) >= o && i.push({
        leaf: e.refundWithoutReceiver()
      }), i;
    if (r === "receiver" && s) {
      const c = Number(t.params.claimDelay);
      wr(n, c) && i.push({
        leaf: e.unilateralClaim(),
        extraWitness: [x.decode(s)],
        sequence: c
      });
    }
    if (r === "sender") {
      const c = Number(t.params.refundNoReceiverDelay);
      wr(n, c) && i.push({
        leaf: e.unilateralRefundWithoutReceiver(),
        sequence: c
      });
    }
    return i;
  }
};
Ai.register(lS);
Ai.register(dS);
class $u {
  constructor(t) {
    this.initialized = !1, this.eventCallbacks = /* @__PURE__ */ new Set(), this.config = t, this.watcher = new cS({
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
    const n = new $u(t);
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
    const n = Ai.get(t.type);
    if (!n)
      throw new Error(`No handler registered for contract type '${t.type}'`);
    try {
      const s = n.createScript(t.params), o = x.encode(s.pkScript);
      if (o !== t.script)
        throw new Error(`Script mismatch: provided script does not match script derived from params. Expected ${o}, got ${t.script}`);
    } catch (s) {
      throw s instanceof Error && s.message.includes("mismatch") ? s : new Error(`Invalid params for contract type '${t.type}': ${s instanceof Error ? s.message : String(s)}`);
    }
    const [r] = await this.getContracts({ script: t.script });
    if (r) {
      if (r.type === t.type)
        return r;
      throw new Error(`Contract with script ${t.script} already exists with with type ${r.type}.`);
    }
    const i = {
      ...t,
      createdAt: Date.now(),
      state: t.state || "active"
    };
    return await this.config.contractRepository.saveContract(i), await this.getVtxosForContracts([i]), await this.watcher.addContract(i), i;
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
    return n.map((i) => ({
      contract: i,
      vtxos: r.get(i.script) ?? []
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
    const i = (await this.config.contractRepository.getContracts({
      script: t
    }))[0];
    if (!i)
      throw new Error(`Contract ${t} not found`);
    const s = {
      ...i,
      ...n
    };
    return await this.config.contractRepository.saveContract(s), await this.watcher.updateContract(s), s;
  }
  /**
   * Update a contract's params.
   * This method preserves existing params by merging the provided values.
   *
   * @param script - Contract script
   * @param updates - The new values to merge with existing params
   */
  async updateContractParams(t, n) {
    const i = (await this.config.contractRepository.getContracts({
      script: t
    }))[0];
    if (!i)
      throw new Error(`Contract ${t} not found`);
    const s = {
      ...i,
      params: { ...i.params, ...n }
    };
    return await this.config.contractRepository.saveContract(s), await this.watcher.updateContract(s), s;
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
    const { contractScript: n, collaborative: r = !0, walletPubKey: i, vtxo: s } = t, [o] = await this.getContracts({ script: n });
    if (!o)
      return [];
    const a = Ai.get(o.type);
    if (!a)
      return [];
    const c = a.createScript(o.params), u = {
      collaborative: r,
      currentTime: Date.now(),
      walletPubKey: i,
      vtxo: s
    };
    return a.getSpendablePaths(c, o, u);
  }
  async getAllSpendingPaths(t) {
    const { contractScript: n, collaborative: r = !0, walletPubKey: i } = t, [s] = await this.getContracts({ script: n });
    if (!s)
      return [];
    const o = Ai.get(s.type);
    if (!o)
      return [];
    const a = o.createScript(s.params), c = {
      collaborative: r,
      currentTime: Date.now(),
      walletPubKey: i
    };
    return o.getAllSpendingPaths(a, s, c);
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
    const i = await this.fetchContractVtxosBulk(t, n, r), s = /* @__PURE__ */ new Map();
    for (const [o, a] of i) {
      s.set(o, a);
      const c = t.find((u) => u.script === o);
      c && await this.config.walletRepository.saveVtxos(c.address, a);
    }
    return s;
  }
  async fetchContractVtxosBulk(t, n, r) {
    const i = /* @__PURE__ */ new Map();
    return await Promise.all(t.map(async (s) => {
      const o = await this.fetchContractVtxosPaginated(s, n, r);
      i.set(s.script, o);
    })), i;
  }
  async fetchContractVtxosPaginated(t, n, r) {
    const s = [];
    let o = 0, a = !0;
    const c = n ? {} : { spendableOnly: !0 };
    for (; a; ) {
      const { vtxos: u, page: l } = await this.config.indexerProvider.getVtxos({
        scripts: [t.script],
        ...c,
        pageIndex: o,
        pageSize: 100
      });
      for (const d of u) {
        const h = r ? r(d) : d;
        s.push({
          ...h,
          contractScript: t.script
        });
      }
      a = l ? u.length === 100 : !1, o++;
    }
    return s;
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
function fS(e) {
  return typeof e == "object" && e !== null && "toReadonly" in e && typeof e.toReadonly == "function";
}
class er {
  constructor(t, n, r, i, s, o, a, c, u, l, d) {
    this.identity = t, this.network = n, this.onchainProvider = r, this.indexerProvider = i, this.arkServerPublicKey = s, this.offchainTapscript = o, this.boardingTapscript = a, this.dustAmount = c, this.walletRepository = u, this.contractRepository = l, this.watcherConfig = d;
  }
  /**
   * Protected helper to set up shared wallet configuration.
   * Extracts common logic used by both ReadonlyWallet.create() and Wallet.create().
   */
  static async setupWalletConfig(t, n) {
    const r = t.arkProvider || (() => {
      if (!t.arkServerUrl)
        throw new Error("Either arkProvider or arkServerUrl must be provided");
      return new dg(t.arkServerUrl);
    })(), i = t.arkServerUrl || r.serverUrl;
    if (!i)
      throw new Error("Could not determine arkServerUrl from provider");
    const s = t.indexerUrl || i, o = t.indexerProvider || new gg(s), a = await r.getInfo(), c = hT(a.network), u = t.esploraUrl || gT[a.network], l = t.onchainProvider || new wT(u);
    if (t.exitTimelock) {
      const { value: O, type: B } = t.exitTimelock;
      if (O < 512n && B !== "blocks" || O >= 512n && B !== "seconds")
        throw new Error("invalid exitTimelock");
    }
    const d = t.exitTimelock ?? {
      value: a.unilateralExitDelay,
      type: a.unilateralExitDelay < 512n ? "blocks" : "seconds"
    };
    if (t.boardingTimelock) {
      const { value: O, type: B } = t.boardingTimelock;
      if (O < 512n && B !== "blocks" || O >= 512n && B !== "seconds")
        throw new Error("invalid boardingTimelock");
    }
    const h = t.boardingTimelock ?? {
      value: a.boardingExitDelay,
      type: a.boardingExitDelay < 512n ? "blocks" : "seconds"
    }, p = x.decode(a.signerPubkey).slice(1), w = new tr.Script({
      pubKey: n,
      serverPubKey: p,
      csvTimelock: d
    }), f = new tr.Script({
      pubKey: n,
      serverPubKey: p,
      csvTimelock: h
    }), y = w, E = t.storage?.walletRepository ?? new Tg(), I = t.storage?.contractRepository ?? new Eg();
    return {
      arkProvider: r,
      indexerProvider: o,
      onchainProvider: l,
      network: c,
      networkName: a.network,
      serverPubKey: p,
      offchainTapscript: y,
      boardingTapscript: f,
      dustAmount: a.dust,
      walletRepository: E,
      contractRepository: I,
      info: a
    };
  }
  static async create(t) {
    const n = await t.identity.xOnlyPublicKey();
    if (!n)
      throw new Error("Invalid configured public key");
    const r = await er.setupWalletConfig(t, n);
    return new er(t.identity, r.network, r.onchainProvider, r.indexerProvider, r.serverPubKey, r.offchainTapscript, r.boardingTapscript, r.dustAmount, r.walletRepository, r.contractRepository, t.watcherConfig);
  }
  get arkAddress() {
    return this.offchainTapscript.address(this.network.hrp, this.arkServerPublicKey);
  }
  /**
   * Get the contract script for the wallet's default address.
   * This is the pkScript hex, used to identify the wallet in ContractManager.
   */
  get defaultContractScript() {
    return x.encode(this.offchainTapscript.pkScript);
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
    s = n.filter((l) => l.virtualStatus.state === "settled").reduce((l, d) => l + d.value, 0), o = n.filter((l) => l.virtualStatus.state === "preconfirmed").reduce((l, d) => l + d.value, 0), a = n.filter((l) => kr(l) && l.virtualStatus.state === "swept").reduce((l, d) => l + d.value, 0);
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
  // TODO: use contract manager (and repo) will be offline-first
  async getVtxos(t) {
    const n = await this.getAddress(), i = (await this.getVirtualCoins(t)).map((s) => rn(this, s));
    return await this.walletRepository.saveVtxos(n, i), i;
  }
  async getVirtualCoins(t = { withRecoverable: !0, withUnrolled: !1 }) {
    const n = [x.encode(this.offchainTapscript.pkScript)], i = (await this.indexerProvider.getVtxos({ scripts: n })).vtxos;
    let s = i.filter(kr);
    if (t.withRecoverable || (s = s.filter((o) => !Au(o) && !fg(o))), t.withUnrolled) {
      const o = i.filter((a) => !kr(a));
      s.push(...o.filter((a) => a.isUnrolled));
    }
    return s;
  }
  async getTransactionHistory() {
    const t = await this.indexerProvider.getVtxos({
      scripts: [x.encode(this.offchainTapscript.pkScript)]
    }), { boardingTxs: n, commitmentsToIgnore: r } = await this.getBoardingTxs(), i = (s) => this.indexerProvider.getVtxos({ outpoints: [{ txid: s, vout: 0 }] }).then((o) => o.vtxos[0]?.createdAt.getTime() || 0);
    return tS(t.vtxos, n, r, i);
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
        type: Je.TxReceived,
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
    const t = await this.getBoardingAddress(), r = (await this.onchainProvider.getCoins(t)).map((i) => mc(this, i));
    return await this.walletRepository.saveUtxos(t, r), r;
  }
  async notifyIncomingFunds(t) {
    const n = await this.getAddress(), r = await this.getBoardingAddress();
    let i, s;
    if (this.onchainProvider && r) {
      const a = (c) => c.vout.findIndex((u) => u.scriptpubkey_address === r);
      i = await this.onchainProvider.watchAddresses([r], (c) => {
        const u = c.filter((l) => a(l) !== -1).map((l) => {
          const { txid: d, status: h } = l, p = a(l), w = Number(l.vout[p].value);
          return { txid: d, vout: p, value: w, status: h };
        });
        t({
          type: "utxo",
          coins: u
        });
      });
    }
    if (this.indexerProvider && n) {
      const a = this.offchainTapscript, c = await this.indexerProvider.subscribeForScripts([
        x.encode(a.pkScript)
      ]), u = new AbortController(), l = this.indexerProvider.getSubscription(c, u.signal);
      s = async () => {
        u.abort(), await this.indexerProvider?.unsubscribeForScripts(c);
      }, (async () => {
        try {
          for await (const d of l)
            (d.newVtxos?.length > 0 || d.spentVtxos?.length > 0) && t({
              type: "vtxo",
              newVtxos: d.newVtxos.map((h) => rn(this, h)),
              spentVtxos: d.spentVtxos.map((h) => rn(this, h))
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
    const t = [x.encode(this.offchainTapscript.pkScript)];
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
    const t = await $u.create({
      indexerProvider: this.indexerProvider,
      contractRepository: this.contractRepository,
      walletRepository: this.walletRepository,
      extendVtxo: (r) => rn(this, r),
      getDefaultAddress: () => this.getAddress(),
      watcherConfig: this.watcherConfig
    }), n = this.offchainTapscript.options.csvTimelock ?? tr.Script.DEFAULT_TIMELOCK;
    return await t.createContract({
      type: "default",
      params: {
        pubKey: x.encode(this.offchainTapscript.options.pubKey),
        serverPubKey: x.encode(this.offchainTapscript.options.serverPubKey),
        csvTimelock: Ri(n).toString()
      },
      script: this.defaultContractScript,
      address: await this.getAddress(),
      state: "active"
    }), t;
  }
}
class Wr extends er {
  constructor(t, n, r, i, s, o, a, c, u, l, d, h, p, w, f, y, E) {
    super(t, n, i, o, a, c, u, p, w, f, E), this.networkName = r, this.arkProvider = s, this.serverUnrollScript = l, this.forfeitOutputScript = d, this.forfeitPubkey = h, this.identity = t, this.renewalConfig = {
      enabled: y?.enabled ?? !1,
      ...LT,
      ...y
    };
  }
  static async create(t) {
    const n = await t.identity.xOnlyPublicKey();
    if (!n)
      throw new Error("Invalid configured public key");
    const r = await er.setupWalletConfig(t, n);
    let i;
    try {
      const c = x.decode(r.info.checkpointTapscript);
      i = Gt.decode(c);
    } catch {
      throw new Error("Invalid checkpointTapscript from server");
    }
    const s = x.decode(r.info.forfeitPubkey).slice(1), o = Yt(r.network).decode(r.info.forfeitAddress), a = dt.encode(o);
    return new Wr(t.identity, r.network, r.networkName, r.onchainProvider, r.arkProvider, r.indexerProvider, r.serverPubKey, r.offchainTapscript, r.boardingTapscript, i, a, s, r.dustAmount, r.walletRepository, r.contractRepository, t.renewalConfig, t.watcherConfig);
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
    const t = fS(this.identity) ? await this.identity.toReadonly() : this.identity;
    return new er(t, this.network, this.onchainProvider, this.indexerProvider, this.arkServerPublicKey, this.offchainTapscript, this.boardingTapscript, this.dustAmount, this.walletRepository, this.contractRepository, this.watcherConfig);
  }
  async sendBitcoin(t) {
    if (t.amount <= 0)
      throw new Error("Amount must be positive");
    if (!pS(t.address))
      throw new Error("Invalid Ark address " + t.address);
    const n = await this.getVirtualCoins({
      withRecoverable: !1
    });
    let r;
    if (t.selectedVtxos) {
      const w = t.selectedVtxos.map((y) => y.value).reduce((y, E) => y + E, 0);
      if (w < t.amount)
        throw new Error("Selected VTXOs do not cover specified amount");
      const f = w - t.amount;
      r = {
        inputs: t.selectedVtxos,
        changeAmount: BigInt(f)
      };
    } else
      r = gS(n, t.amount);
    const i = this.offchainTapscript.forfeit();
    if (!i)
      throw new Error("Selected leaf not found");
    const s = Jn.decode(t.address), a = [
      {
        script: BigInt(t.amount) < this.dustAmount ? s.subdustPkScript : s.pkScript,
        amount: BigInt(t.amount)
      }
    ];
    if (r.changeAmount > 0n) {
      const w = r.changeAmount < this.dustAmount ? this.arkAddress.subdustPkScript : this.arkAddress.pkScript;
      a.push({
        script: w,
        amount: BigInt(r.changeAmount)
      });
    }
    const c = this.offchainTapscript.encode(), u = PT(r.inputs.map((w) => ({
      ...w,
      tapLeafScript: i,
      tapTree: c
    })), a, this.serverUnrollScript), l = await this.identity.sign(u.arkTx), { arkTxid: d, signedCheckpointTxs: h } = await this.arkProvider.submitTx(G.encode(l.toPSBT()), u.checkpoints.map((w) => G.encode(w.toPSBT()))), p = await Promise.all(h.map(async (w) => {
      const f = rt.fromPSBT(G.decode(w)), y = await this.identity.sign(f);
      return G.encode(y.toPSBT());
    }));
    await this.arkProvider.finalizeTx(d, p);
    try {
      const w = [], f = /* @__PURE__ */ new Set();
      let y = Number.MAX_SAFE_INTEGER;
      for (const [O, B] of r.inputs.entries()) {
        const N = rn(this, B), V = h[O], g = rt.fromPSBT(G.decode(V));
        if (w.push({
          ...N,
          virtualStatus: { ...N.virtualStatus, state: "spent" },
          spentBy: g.id,
          arkTxId: d,
          isSpent: !0
        }), N.virtualStatus.commitmentTxIds)
          for (const M of N.virtualStatus.commitmentTxIds)
            f.add(M);
        N.virtualStatus.batchExpiry && (y = Math.min(y, N.virtualStatus.batchExpiry));
      }
      const E = Date.now(), I = this.arkAddress.encode();
      if (r.changeAmount > 0n && y !== Number.MAX_SAFE_INTEGER) {
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
            commitmentTxIds: Array.from(f),
            batchExpiry: y
          },
          status: {
            confirmed: !1
          }
        };
        await this.walletRepository.saveVtxos(I, [O]);
      }
      await this.walletRepository.saveVtxos(I, w), await this.walletRepository.saveTransactions(I, [
        {
          key: {
            boardingTxid: "",
            commitmentTxid: "",
            arkTxid: d
          },
          amount: t.amount,
          type: Je.TxSent,
          settled: !1,
          createdAt: Date.now()
        }
      ]);
    } catch (w) {
      console.warn("error saving offchain tx to repository", w);
    } finally {
      return d;
    }
  }
  async settle(t, n) {
    if (t?.inputs) {
      for (const w of t.inputs)
        if (typeof w == "string")
          try {
            yt.fromString(w);
          } catch {
            throw new Error(`Invalid arknote "${w}"`);
          }
    }
    if (!t) {
      const { fees: w } = await this.arkProvider.getInfo(), f = new QT(w.intentFee);
      let y = 0;
      const I = Gt.decode(x.decode(this.boardingTapscript.exitScript)).params.timelock, O = (await this.getBoardingUtxos()).filter((F) => !_T(F, I)), B = [];
      for (const F of O) {
        const A = f.evalOnchainInput({
          amount: BigInt(F.value)
        });
        A.value >= F.value || (B.push(F), y += F.value - A.satoshis);
      }
      const N = await this.getVtxos({ withRecoverable: !0 }), V = [];
      for (const F of N) {
        const A = f.evalOffchainInput({
          amount: BigInt(F.value),
          type: F.virtualStatus.state === "swept" ? "recoverable" : "vtxo",
          weight: 0,
          birth: F.createdAt,
          expiry: F.virtualStatus.batchExpiry ? new Date(F.virtualStatus.batchExpiry * 1e3) : /* @__PURE__ */ new Date()
        });
        A.value >= F.value || (V.push(F), y += F.value - A.satoshis);
      }
      const g = [...B, ...V];
      if (g.length === 0)
        throw new Error("No inputs found");
      const M = {
        address: await this.getAddress(),
        amount: BigInt(y)
      }, _ = f.evalOffchainOutput({
        amount: M.amount,
        script: x.encode(Jn.decode(M.address).pkScript)
      });
      if (M.amount -= BigInt(_.satoshis), M.amount <= this.dustAmount)
        throw new Error("Output amount is below dust limit");
      t = {
        inputs: g,
        outputs: [M]
      };
    }
    const r = [], i = [];
    let s = !1;
    for (const [w, f] of t.outputs.entries()) {
      let y;
      try {
        y = Jn.decode(f.address).pkScript, s = !0;
      } catch {
        const E = Yt(this.network).decode(f.address);
        y = dt.encode(E), r.push(w);
      }
      i.push({
        amount: f.amount,
        script: y
      });
    }
    let o;
    const a = [];
    s && (o = this.identity.signerSession(), a.push(x.encode(await o.getPublicKey())));
    const [c, u] = await Promise.all([
      this.makeRegisterIntentSignature(t.inputs, i, r, a),
      this.makeDeleteIntentSignature(t.inputs)
    ]), l = await this.safeRegisterIntent(c), d = [
      ...a,
      ...t.inputs.map((w) => `${w.txid}:${w.vout}`)
    ], h = this.createBatchHandler(l, t.inputs, o), p = new AbortController();
    try {
      const w = this.arkProvider.getEventStream(p.signal, d);
      return await bc.join(w, h, {
        abortController: p,
        skipVtxoTreeSigning: !s,
        eventCallback: n ? (f) => Promise.resolve(n(f)) : void 0
      });
    } catch (w) {
      throw await this.arkProvider.deleteIntent(u).catch(() => {
      }), w;
    } finally {
      p.abort();
    }
  }
  async handleSettlementFinalizationEvent(t, n, r, i) {
    const s = [], o = await this.getVirtualCoins();
    let a = rt.fromPSBT(G.decode(t.commitmentTx)), c = !1, u = 0;
    const l = i?.leaves() || [];
    for (const d of n) {
      const h = o.find((O) => O.txid === d.txid && O.vout === d.vout);
      if (!h) {
        for (let O = 0; O < a.inputsLength; O++) {
          const B = a.getInput(O);
          if (!B.txid || B.index === void 0)
            throw new Error("The server returned incomplete data. No settlement input found in the PSBT");
          if (x.encode(B.txid) === d.txid && B.index === d.vout) {
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
      if (Au(h) || hg(h, this.dustAmount))
        continue;
      if (l.length === 0)
        throw new Error("connectors not received");
      if (u >= l.length)
        throw new Error("not enough connectors received");
      const p = l[u], w = p.id, f = p.getOutput(0);
      if (!f)
        throw new Error("connector output not found");
      const y = f.amount, E = f.script;
      if (!y || !E)
        throw new Error("invalid connector output");
      u++;
      let I = vT([
        {
          txid: d.txid,
          index: d.vout,
          witnessUtxo: {
            amount: BigInt(h.value),
            script: ie.decode(d.tapTree).pkScript
          },
          sighashType: It.DEFAULT,
          tapLeafScript: [d.forfeitTapLeafScript]
        },
        {
          txid: w,
          index: 0,
          witnessUtxo: {
            amount: y,
            script: E
          }
        }
      ], r);
      I = await this.identity.sign(I, [0]), s.push(G.encode(I.toPSBT()));
    }
    (s.length > 0 || c) && await this.arkProvider.submitSignedForfeitTxs(s, c ? G.encode(a.toPSBT()) : void 0);
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
        const o = new TextEncoder().encode(t), a = lt(o), c = x.encode(a);
        let u = !0;
        for (const d of s.intentIdHashes)
          if (d === c) {
            if (!this.arkProvider)
              throw new Error("Ark provider not configured");
            await this.arkProvider.confirmRegistration(t), u = !1;
          }
        if (u)
          return { skip: u };
        const l = Gt.encode({
          timelock: {
            value: s.batchExpiry,
            type: s.batchExpiry >= 512n ? "seconds" : "blocks"
          },
          pubkeys: [this.forfeitPubkey]
        }).script;
        return i = En(l), { skip: !1 };
      },
      onTreeSigningStarted: async (s, o) => {
        if (!r)
          return { skip: !0 };
        if (!i)
          throw new Error("Sweep tap tree root not set");
        const a = s.cosignersPublicKeys.map((w) => w.slice(2)), u = (await r.getPublicKey()).subarray(1);
        if (!a.includes(x.encode(u)))
          return { skip: !0 };
        const l = rt.fromPSBT(G.decode(s.unsignedCommitmentTx));
        CT(o, l, i);
        const d = l.getOutput(0);
        if (!d?.amount)
          throw new Error("Shared output not found");
        await r.init(o, i, d.amount);
        const h = x.encode(await r.getPublicKey()), p = await r.getNonces();
        return await this.arkProvider.submitTreeNonces(s.id, h, p), { skip: !1 };
      },
      onTreeNonces: async (s) => {
        if (!r)
          return { fullySigned: !0 };
        const { hasAllNonces: o } = await r.aggregatedNonces(s.txid, s.nonces);
        if (!o)
          return { fullySigned: !1 };
        const a = await r.sign(), c = x.encode(await r.getPublicKey());
        return await this.arkProvider.submitTreeSignatures(s.id, c, a), { fullySigned: !0 };
      },
      onBatchFinalization: async (s, o, a) => {
        if (!this.forfeitOutputScript)
          throw new Error("Forfeit output script not set");
        a && OT(s.commitmentTx, a), await this.handleSettlementFinalizationEvent(s, n, this.forfeitOutputScript, a);
      }
    };
  }
  async safeRegisterIntent(t) {
    try {
      return await this.arkProvider.registerIntent(t);
    } catch (n) {
      if (n instanceof lg && n.code === 0 && n.message.includes("duplicated input")) {
        const r = await this.getVtxos({
          withRecoverable: !0
        }), i = await this.makeDeleteIntentSignature(r);
        return await this.arkProvider.deleteIntent(i), this.arkProvider.registerIntent(t);
      }
      throw n;
    }
  }
  async makeRegisterIntentSignature(t, n, r, i) {
    const s = this.prepareIntentProofInputs(t), o = {
      type: "register",
      onchain_output_indexes: r,
      valid_at: 0,
      expire_at: 0,
      cosigners_public_keys: i
    }, a = An.create(o, s, n), c = await this.identity.sign(a);
    return {
      proof: G.encode(c.toPSBT()),
      message: o
    };
  }
  async makeDeleteIntentSignature(t) {
    const n = this.prepareIntentProofInputs(t), r = {
      type: "delete",
      expire_at: 0
    }, i = An.create(r, n, []), s = await this.identity.sign(i);
    return {
      proof: G.encode(s.toPSBT()),
      message: r
    };
  }
  async makeGetPendingTxIntentSignature(t) {
    const n = this.prepareIntentProofInputs(t), r = {
      type: "get-pending-tx",
      expire_at: 0
    }, i = An.create(r, n, []), s = await this.identity.sign(i);
    return {
      proof: G.encode(s.toPSBT()),
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
      const s = [x.encode(this.offchainTapscript.pkScript)];
      let { vtxos: o } = await this.indexerProvider.getVtxos({
        scripts: s
      });
      if (o = o.filter((a) => a.virtualStatus.state !== "swept" && a.virtualStatus.state !== "settled"), o.length === 0)
        return { finalized: [], pending: [] };
      t = o.map((a) => rn(this, a));
    }
    const r = [], i = [];
    for (let s = 0; s < t.length; s += 20) {
      const o = t.slice(s, s + 20), a = await this.makeGetPendingTxIntentSignature(o), c = await this.arkProvider.getPendingTxs(a);
      for (const u of c) {
        i.push(u.arkTxid);
        try {
          const l = await Promise.all(u.signedCheckpointTxs.map(async (d) => {
            const h = rt.fromPSBT(G.decode(d)), p = await this.identity.sign(h);
            return G.encode(p.toPSBT());
          }));
          await this.arkProvider.finalizeTx(u.arkTxid, l), r.push(u.arkTxid);
        } catch (l) {
          console.error(`Failed to finalize transaction ${u.arkTxid}:`, l);
        }
      }
    }
    return { finalized: r, pending: i };
  }
  prepareIntentProofInputs(t) {
    const n = [];
    for (const r of t) {
      const i = ie.decode(r.tapTree), s = hS(r.intentTapLeafScript), o = [og.encode(r.tapTree)];
      r.extraWitness && o.push(qE.encode(r.extraWitness)), n.push({
        txid: x.decode(r.txid),
        index: r.vout,
        witnessUtxo: {
          amount: BigInt(r.value),
          script: i.pkScript
        },
        sequence: s,
        tapLeafScript: [r.intentTapLeafScript],
        unknown: o
      });
    }
    return n;
  }
}
Wr.MIN_FEE_RATE = 1;
function hS(e) {
  let t;
  try {
    const n = e[1], r = n.subarray(0, n.length - 1);
    try {
      const i = Gt.decode(r).params;
      t = ve.encode(i.timelock.type === "blocks" ? { blocks: Number(i.timelock.value) } : { seconds: Number(i.timelock.value) });
    } catch {
      const i = Hr.decode(r).params;
      t = Number(i.absoluteTimelock);
    }
  } catch {
  }
  return t;
}
function pS(e) {
  try {
    return Jn.decode(e), !0;
  } catch {
    return !1;
  }
}
function gS(e, t) {
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
class wS {
  constructor(t, n, { messageHandlers: r, tickIntervalMs: i = 1e4, debug: s = !1 }) {
    this.walletRepository = t, this.contractRepository = n, this.running = !1, this.tickTimeout = null, this.tickInProgress = !1, this.debug = !1, this.initialized = !1, this.handlers = new Map(r.map((o) => [o.messageTag, o])), this.tickIntervalMs = i, this.debug = s;
  }
  static async init(t, n) {
    return new Promise((r, i) => {
      const s = {
        tag: "INITIALIZE_MESSAGE_BUS",
        id: HT(),
        config: {
          wallet: n.key,
          arkServer: {
            url: n.arkServerUrl,
            publicKey: n.arkServerPublicKey
          }
        }
      }, o = (a) => {
        console.log("temporary Message Handler", a);
        const c = a.data;
        s.id === c.id && (navigator.serviceWorker.removeEventListener("message", o), c.error ? i(c.error) : r(c));
      };
      navigator.serviceWorker.addEventListener("message", o), t.postMessage(s);
    });
  }
  async start() {
    console.log("Starting service worker..."), !this.running && (this.running = !0, self.addEventListener("message", this.onMessage.bind(this)), self.addEventListener("install", () => {
      self.skipWaiting();
    }), self.addEventListener("activate", () => {
      console.log(`event: activate ${this.initialized}`), self.clients.claim(), this.initialized && this.runTick();
    }));
  }
  async stop() {
    this.running = !1, this.tickInProgress = !1, this.tickTimeout !== null && (self.clearTimeout(this.tickTimeout), this.tickTimeout = null), self.removeEventListener("message", this.onMessage.bind(this)), await Promise.all(Array.from(this.handlers.values()).map((t) => t.stop()));
  }
  scheduleNextTick() {
    this.running && this.tickTimeout === null && (this.tickInProgress || (this.tickTimeout = self.setTimeout(() => this.runTick(), this.tickIntervalMs)));
  }
  async runTick() {
    if (this.running && !this.tickInProgress) {
      this.tickInProgress = !0, this.tickTimeout !== null && (self.clearTimeout(this.tickTimeout), this.tickTimeout = null);
      try {
        const t = Date.now();
        for (const n of this.handlers.values())
          try {
            const r = await n.tick(t);
            this.debug && console.log(`[${n.messageTag}] outgoing tick response:`, r), r && r.length > 0 && (console.log(`[${n.messageTag}] tick result`, r), self.clients.matchAll({
              includeUncontrolled: !0,
              type: "window"
            }).then((i) => {
              for (const s of r)
                s.broadcast && console.log(`[${n.messageTag}] broadcasting to ${i.length} clients: ${s.id}`), i.forEach((o) => {
                  o.postMessage(s);
                });
            }));
          } catch (r) {
            console.error(`[${n.messageTag}] tick failed`, r);
          }
      } finally {
        this.tickInProgress = !1, this.scheduleNextTick();
      }
    }
  }
  async waitForInit(t) {
    if (this.initialized)
      return;
    console.log("Init command received");
    const n = await this.buildServices(t);
    for (const r of this.handlers.values())
      this.debug && console.log(`Starting updater: ${r.messageTag}`), await r.start(n, {
        walletRepository: this.walletRepository
      });
    console.log("schedule next tick!"), this.scheduleNextTick(), console.log("removing waitforinit");
  }
  async buildServices(t) {
    const n = new dg(t.arkServer.url), r = {
      walletRepository: this.walletRepository,
      contractRepository: this.contractRepository
    };
    if ("privateKey" in t.wallet) {
      const i = Si.fromHex(t.wallet.privateKey), s = await Wr.create({
        identity: i,
        arkServerUrl: t.arkServer.url,
        arkServerPublicKey: t.arkServer.publicKey,
        storage: r
      });
      return { wallet: s, arkProvider: n, readonlyWallet: s };
    } else if ("publicKey" in t.wallet) {
      const i = Ko.fromPublicKey(x.decode(t.wallet.publicKey));
      return { readonlyWallet: await er.create({
        identity: i,
        arkServerUrl: t.arkServer.url,
        arkServerPublicKey: t.arkServer.publicKey,
        storage: r
      }), arkProvider: n };
    } else
      throw new Error("Missing privateKey or publicKey in configuration object");
  }
  async onMessage(t) {
    const { id: n, tag: r, broadcast: i } = t.data;
    if (console.log(t.data), !this.initialized && "config" in t.data) {
      await this.waitForInit(t.data.config), t.source?.postMessage({ id: n, tag: r }), console.log("initialized!!!");
      return;
    }
    if (!n || !r) {
      console.error("Invalid message received, missing required fields:", t.data), t.source?.postMessage({
        id: n,
        tag: r ?? "unknown",
        error: new TypeError("Invalid message received, missing required fields")
      });
      return;
    }
    if (this.debug && console.log(`[${r}] incoming ${i ? "broadcast " : ""}message:`, t.data), i) {
      const o = Array.from(this.handlers.values());
      (await Promise.allSettled(o.map((c) => c.handleMessage(t.data)))).forEach((c, u) => {
        const l = o[u];
        if (c.status === "fulfilled") {
          const d = c.value;
          this.debug && console.log(`[${l.messageTag}] outgoing response:`, d), d && t.source?.postMessage(d);
        } else {
          console.error(`[${l.messageTag}] handleMessage failed`, c.reason);
          const d = c.reason instanceof Error ? c.reason : new Error(String(c.reason));
          t.source?.postMessage({
            id: n,
            tag: l.messageTag,
            error: d
          });
        }
      });
      return;
    }
    const s = this.handlers.get(r);
    if (!s) {
      console.warn(`[${r}] unknown message tag '${r}', ignoring message`);
      return;
    }
    try {
      const o = await s.handleMessage(t.data);
      this.debug && console.log(`[${r}] outgoing response:`, o), o && t.source?.postMessage(o);
    } catch (o) {
      console.error(`[${r}] handleMessage failed`, o);
      const a = o instanceof Error ? o : new Error(String(o));
      t.source?.postMessage({ id: n, tag: r, error: a });
    }
  }
  /**
   * Returns the registered SW for the path.
   * It uses the functions in `service-worker-manager.ts` module.
   * @param path
   * @return the Service Worker
   * @throws if not running in a browser environment
   */
  static async getServiceWorker(t) {
    return Nd(t);
  }
  /**
   * Set up and register the Service Worker, ensuring it's done once at most.
   * It uses the functions in `service-worker-manager.ts` module.
   * @param path
   * @return the Service Worker
   * @throws if not running in a browser environment
   */
  static async setup(t) {
    return await ZE(t), Nd(t);
  }
}
const yS = "WALLET_UPDATER";
class mS {
  /**
   * Instantiate a new WalletUpdater.
   * Can override the default `messageTag` allowing more than one updater to run in parallel.
   * Note that the default ServiceWorkerWallet sends messages to the default WalletUpdater tag.
   *
   * @param walletRepository
   * @param contractRepository
   * @param options
   */
  constructor(t) {
    this.onNextTick = [], this.messageTag = t?.messageTag ?? yS;
  }
  // lifecycle methods
  async start(...t) {
    const [n, r] = t;
    if (!n.wallet)
      throw new Error("Wallet is required");
    this.wallet = n.wallet, this.arkProvider = n.arkProvider, this.walletRepository = r.walletRepository;
  }
  async stop() {
  }
  async tick(t) {
    const n = await Promise.allSettled(this.onNextTick.map((r) => r()));
    return this.onNextTick = [], n.map((r) => r.status === "fulfilled" ? r.value : (console.error(`[${this.messageTag}] tick failed`, r.reason), null)).filter((r) => r !== null);
  }
  scheduleForNextTick(t) {
    this.onNextTick.push(t);
  }
  tagged(t) {
    return {
      ...t,
      tag: this.messageTag
    };
  }
  async handleMessage(t) {
    const n = t.id;
    if (t.type === "INIT_WALLET")
      return await this.handleInitWallet(t), this.tagged({
        id: n,
        type: "WALLET_INITIALIZED"
      });
    if (!this.wallet)
      return this.tagged({
        id: n,
        error: new Error("Wallet handler not initialized")
      });
    try {
      switch (t.type) {
        case "SETTLE": {
          const r = await this.handleSettle(t);
          return this.tagged({
            id: n,
            ...r
          });
        }
        case "SEND_BITCOIN": {
          const r = await this.handleSendBitcoin(t);
          return this.tagged({
            id: n,
            ...r
          });
        }
        case "GET_ADDRESS": {
          const r = await this.wallet.getAddress();
          return this.tagged({
            id: n,
            type: "ADDRESS",
            payload: { address: r }
          });
        }
        case "GET_BOARDING_ADDRESS": {
          const r = await this.wallet.getBoardingAddress();
          return this.tagged({
            id: n,
            type: "BOARDING_ADDRESS",
            payload: { address: r }
          });
        }
        case "GET_BALANCE": {
          const r = await this.handleGetBalance();
          return this.tagged({
            id: n,
            type: "BALANCE",
            payload: r
          });
        }
        case "GET_VTXOS": {
          const r = await this.handleGetVtxos(t);
          return {
            tag: this.messageTag,
            id: n,
            type: "VTXOS",
            payload: { vtxos: r }
          };
        }
        case "GET_BOARDING_UTXOS": {
          const r = await this.getAllBoardingUtxos();
          return this.tagged({
            id: n,
            type: "BOARDING_UTXOS",
            payload: { utxos: r }
          });
        }
        case "GET_TRANSACTION_HISTORY": {
          const r = await this.wallet.getTransactionHistory();
          return this.tagged({
            id: n,
            type: "TRANSACTION_HISTORY",
            payload: { transactions: r }
          });
        }
        case "GET_STATUS": {
          const r = await this.wallet.identity.xOnlyPublicKey();
          return this.tagged({
            id: n,
            type: "WALLET_STATUS",
            payload: {
              walletInitialized: !0,
              xOnlyPublicKey: r
            }
          });
        }
        case "CLEAR":
          return await this.clear(), this.tagged({
            id: n,
            type: "CLEAR_SUCCESS",
            payload: { cleared: !0 }
          });
        case "RELOAD_WALLET":
          return await this.onWalletInitialized(), this.tagged({
            id: n,
            type: "RELOAD_SUCCESS",
            payload: { reloaded: !0 }
          });
        case "SIGN_TRANSACTION": {
          const r = await this.handleSignTransaction(t);
          return this.tagged({
            id: n,
            ...r
          });
        }
        case "CREATE_CONTRACT": {
          const i = await (await this.wallet.getContractManager()).createContract(t.payload);
          return this.tagged({
            id: n,
            type: "CONTRACT_CREATED",
            payload: { contract: i }
          });
        }
        case "GET_CONTRACTS": {
          const i = await (await this.wallet.getContractManager()).getContracts(t.payload.filter);
          return this.tagged({
            id: n,
            type: "CONTRACTS",
            payload: { contracts: i }
          });
        }
        case "GET_CONTRACTS_WITH_VTXOS": {
          const i = await (await this.wallet.getContractManager()).getContractsWithVtxos(t.payload.filter);
          return this.tagged({
            id: n,
            type: "CONTRACTS_WITH_VTXOS",
            payload: { contracts: i }
          });
        }
        case "UPDATE_CONTRACT": {
          const i = await (await this.wallet.getContractManager()).updateContract(t.payload.script, t.payload.updates);
          return this.tagged({
            id: n,
            type: "CONTRACT_UPDATED",
            payload: { contract: i }
          });
        }
        case "DELETE_CONTRACT":
          return await (await this.wallet.getContractManager()).deleteContract(t.payload.script), this.tagged({
            id: n,
            type: "CONTRACT_DELETED",
            payload: { deleted: !0 }
          });
        case "GET_SPENDABLE_PATHS": {
          const i = await (await this.wallet.getContractManager()).getSpendablePaths(t.payload.options);
          return this.tagged({
            id: n,
            type: "SPENDABLE_PATHS",
            payload: { paths: i }
          });
        }
        case "IS_CONTRACT_MANAGER_WATCHING": {
          const i = await (await this.wallet.getContractManager()).isWatching();
          return this.tagged({
            id: n,
            type: "CONTRACT_WATCHING",
            payload: { isWatching: i }
          });
        }
        default:
          throw console.error("Unknown message type", t), new Error("Unknown message");
      }
    } catch (r) {
      return this.tagged({ id: n, error: r });
    }
  }
  // Wallet methods
  async handleInitWallet({ payload: t }) {
    const { arkServerUrl: n } = t;
    this.indexerProvider = new gg(n), await this.onWalletInitialized();
  }
  async handleGetBalance() {
    const [t, n, r] = await Promise.all([
      this.getAllBoardingUtxos(),
      this.getSpendableVtxos(),
      this.getSweptVtxos()
    ]);
    let i = 0, s = 0;
    for (const d of t)
      d.status.confirmed ? i += d.value : s += d.value;
    let o = 0, a = 0, c = 0;
    for (const d of n)
      d.virtualStatus.state === "settled" ? o += d.value : d.virtualStatus.state === "preconfirmed" && (a += d.value);
    for (const d of r)
      kr(d) && (c += d.value);
    const u = i + s, l = o + a + c;
    return {
      boarding: {
        confirmed: i,
        unconfirmed: s,
        total: u
      },
      settled: o,
      preconfirmed: a,
      available: o + a,
      recoverable: c,
      total: u + l
    };
  }
  async getAllBoardingUtxos() {
    return this.wallet ? this.wallet.getBoardingUtxos() : [];
  }
  /**
   * Get spendable vtxos for the current wallet address
   */
  async getSpendableVtxos() {
    return this.wallet ? (await this.wallet.getVtxos()).filter(kr) : [];
  }
  /**
   * Get swept vtxos for the current wallet address
   */
  async getSweptVtxos() {
    return this.wallet ? (await this.wallet.getVtxos()).filter((n) => n.virtualStatus.state === "swept") : [];
  }
  async onWalletInitialized() {
    if (!this.wallet || !this.arkProvider || !this.indexerProvider || !this.walletRepository)
      return;
    const t = this.wallet.defaultContractScript, r = (await this.indexerProvider.getVtxos({
      scripts: [t]
    })).vtxos.map((c) => rn(this.wallet, c));
    try {
      const { pending: c, finalized: u } = await this.wallet.finalizePendingTxs(r.filter((l) => l.virtualStatus.state !== "swept" && l.virtualStatus.state !== "settled"));
      console.info(`Recovered ${u.length}/${c.length} pending transactions: ${u.join(", ")}`);
    } catch (c) {
      console.error("Error recovering pending transactions:", c);
    }
    const i = await this.wallet.getAddress();
    await this.walletRepository.saveVtxos(i, r);
    const s = await this.wallet.getBoardingAddress(), o = await this.wallet.onchainProvider.getCoins(s);
    await this.walletRepository.saveUtxos(s, o.map((c) => mc(this.wallet, c)));
    const a = await this.wallet.getTransactionHistory();
    a && await this.walletRepository.saveTransactions(i, a), this.incomingFundsSubscription && this.incomingFundsSubscription(), this.incomingFundsSubscription = await this.wallet.notifyIncomingFunds(async (c) => {
      if (c.type === "vtxo") {
        const u = c.newVtxos.length > 0 ? c.newVtxos.map((d) => rn(this.wallet, d)) : [], l = c.spentVtxos.length > 0 ? c.spentVtxos.map((d) => rn(this.wallet, d)) : [];
        if ([...u, ...l].length === 0)
          return;
        await this.walletRepository?.saveVtxos(i, [
          ...u,
          ...l
        ]), this.scheduleForNextTick(() => this.tagged({
          type: "VTXO_UPDATE",
          broadcast: !0,
          payload: { newVtxos: u, spentVtxos: l }
        }));
      }
      if (c.type === "utxo") {
        const u = c.coins.map((d) => mc(this.wallet, d)), l = await this.wallet?.getBoardingAddress();
        await this.walletRepository?.saveUtxos(l, u), this.scheduleForNextTick(() => this.tagged({
          type: "UTXO_UPDATE",
          broadcast: !0,
          payload: { coins: u }
        }));
      }
    }), await this.ensureContractEventBroadcasting();
  }
  async handleSettle(t) {
    if (!this.wallet)
      throw new Error("Wallet handler not initialized");
    const n = await this.wallet.settle(t.payload.params, (r) => {
      this.scheduleForNextTick(() => this.tagged({
        id: t.id,
        type: "SETTLE_EVENT",
        payload: r
      }));
    });
    if (!n)
      throw new Error("Settlement failed");
    return { type: "SETTLE_SUCCESS", payload: { txid: n } };
  }
  async handleSendBitcoin(t) {
    if (!this.wallet)
      throw new Error("Wallet handler not initialized");
    const n = await this.wallet.sendBitcoin(t.payload);
    if (!n)
      throw new Error("Send bitcoin failed");
    return {
      type: "SEND_BITCOIN_SUCCESS",
      payload: { txid: n }
    };
  }
  async handleSignTransaction(t) {
    if (!this.wallet)
      throw new Error("Wallet handler not initialized");
    const { tx: n, inputIndexes: r } = t.payload, i = await this.wallet.identity.sign(n, r);
    if (!i)
      throw new Error("Sign transaction failed");
    return {
      type: "SIGN_TRANSACTION",
      payload: { tx: i }
    };
  }
  async handleGetVtxos(t) {
    if (!this.wallet)
      throw new Error("Wallet handler not initialized");
    const n = await this.getSpendableVtxos(), r = this.wallet.dustAmount;
    return t.payload.filter?.withRecoverable ?? !1 ? n : n.filter((o) => !(r != null && hg(o, r) || Au(o) || fg(o)));
  }
  async clear() {
    if (this.wallet) {
      this.incomingFundsSubscription && this.incomingFundsSubscription(), this.contractEventsSubscription && (this.contractEventsSubscription(), this.contractEventsSubscription = void 0);
      try {
        await this.walletRepository?.clear();
      } catch {
        console.warn("Failed to clear vtxos from wallet repository");
      }
      this.wallet = void 0, this.arkProvider = void 0, this.indexerProvider = void 0;
    }
  }
  async ensureContractEventBroadcasting() {
    if (this.wallet && !this.contractEventsSubscription)
      try {
        const t = await this.wallet.getContractManager();
        this.contractEventsSubscription = t.onContractEvent((n) => {
          this.scheduleForNextTick(() => this.tagged({
            type: "CONTRACT_EVENT",
            broadcast: !0,
            payload: { event: n }
          }));
        });
      } catch (t) {
        console.error("Error subscribing to contract events:", t);
      }
  }
}
const Aa = (e) => e < 253 ? 1 : e <= 65535 ? 3 : e <= 4294967295 ? 5 : 9;
class ot {
  constructor(t, n, r, i, s, o) {
    this.hasWitness = t, this.inputCount = n, this.outputCount = r, this.inputSize = i, this.inputWitnessSize = s, this.outputSize = o;
  }
  static create() {
    return new ot(!1, 0, 0, 0, 0, 0);
  }
  addP2AInput() {
    return this.inputCount++, this.inputSize += ot.INPUT_SIZE, this;
  }
  addKeySpendInput(t = !0) {
    return this.inputCount++, this.inputWitnessSize += 65 + (t ? 0 : 1), this.inputSize += ot.INPUT_SIZE, this.hasWitness = !0, this;
  }
  addP2PKHInput() {
    return this.inputCount++, this.inputWitnessSize++, this.inputSize += ot.INPUT_SIZE + ot.P2PKH_SCRIPT_SIG_SIZE, this;
  }
  addTapscriptInput(t, n, r) {
    const i = 1 + ot.BASE_CONTROL_BLOCK_SIZE + 1 + n + 1 + r;
    return this.inputCount++, this.inputWitnessSize += t + 1 + i, this.inputSize += ot.INPUT_SIZE, this.hasWitness = !0, this;
  }
  addP2WPKHOutput() {
    return this.outputCount++, this.outputSize += ot.OUTPUT_SIZE + ot.P2WPKH_OUTPUT_SIZE, this;
  }
  addP2TROutput() {
    return this.outputCount++, this.outputSize += ot.OUTPUT_SIZE + ot.P2TR_OUTPUT_SIZE, this;
  }
  /**
   * Adds an output given a raw script.
   * Cost = 8 bytes (amount) + varint(scriptLen) + scriptLen
   */
  addOutputScript(t) {
    return this.outputCount++, this.outputSize += 8 + Aa(t.length) + t.length, this;
  }
  /**
   * Adds an output by decoding the address to get the exact script size.
   */
  addOutputAddress(t, n) {
    const r = Yt(n).decode(t), i = dt.encode(r);
    return this.addOutputScript(i);
  }
  vsize() {
    const t = Aa(this.inputCount), n = Aa(this.outputCount);
    let i = (ot.BASE_TX_SIZE + t + this.inputSize + n + this.outputSize) * ot.WITNESS_SCALE_FACTOR;
    return this.hasWitness && (i += ot.WITNESS_HEADER_SIZE + this.inputWitnessSize), bS(i);
  }
}
ot.P2PKH_SCRIPT_SIG_SIZE = 108;
ot.INPUT_SIZE = 41;
ot.BASE_CONTROL_BLOCK_SIZE = 33;
ot.OUTPUT_SIZE = 9;
ot.P2WPKH_OUTPUT_SIZE = 22;
ot.BASE_TX_SIZE = 10;
ot.WITNESS_HEADER_SIZE = 2;
ot.WITNESS_SCALE_FACTOR = 4;
ot.P2TR_OUTPUT_SIZE = 34;
const bS = (e) => {
  const t = BigInt(Math.ceil(e / ot.WITNESS_SCALE_FACTOR));
  return {
    value: t,
    fee: (n) => n * t
  };
};
var Md;
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
        if (!(l.type === Ir.COMMITMENT || l.type === Ir.UNSPECIFIED))
          try {
            if (!(await this.explorer.getTxStatus(l.txid)).confirmed)
              return {
                type: t.WAIT,
                txid: l.txid,
                do: ES(this.explorer, l.txid)
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
      const c = Bn.fromPSBT(G.decode(a.txs[0]));
      if (s.type === Ir.TREE) {
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
        do: vS(this.bumper, this.explorer, c)
      };
    }
    /**
     * Iterate over the steps to be executed and execute them
     * @returns An async iterator over the executed steps
     */
    async *[Symbol.asyncIterator]() {
      let s;
      do {
        s !== void 0 && await xS(1e3);
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
    const d = ot.create();
    for (const E of c) {
      if (!E.isUnrolled)
        throw new Error(`Vtxo ${E.txid}:${E.vout} is not fully unrolled, use unroll first`);
      const I = await i.onchainProvider.getTxStatus(E.txid);
      if (!I.confirmed)
        throw new Error(`tx ${E.txid} is not confirmed`);
      const O = TS({ height: I.blockHeight, time: I.blockTime }, a, E);
      if (!O)
        throw new Error(`no available exit path found for vtxo ${E.txid}:${E.vout}`);
      const B = ie.decode(E.tapTree).findLeaf(x.encode(O.script));
      if (!B)
        throw new Error(`spending leaf not found for vtxo ${E.txid}:${E.vout}`);
      l += BigInt(E.value), u.push({
        txid: E.txid,
        index: E.vout,
        tapLeafScript: [B],
        sequence: 4294967294,
        witnessUtxo: {
          amount: BigInt(E.value),
          script: ie.decode(E.tapTree).pkScript
        },
        sighashType: It.DEFAULT
      }), d.addTapscriptInput(64, B[1].length, Wt.encode(B[0]).length);
    }
    const h = new Bn({ version: 2 });
    for (const E of u)
      h.addInput(E);
    d.addOutputAddress(o, i.network);
    let p = await i.onchainProvider.getFeeRate();
    (!p || p < Wr.MIN_FEE_RATE) && (p = Wr.MIN_FEE_RATE);
    const w = d.vsize().fee(BigInt(p));
    if (w > l)
      throw new Error("fee amount is greater than the total amount");
    const f = l - w;
    if (f < BigInt(MT))
      throw new Error("send amount is less than dust amount");
    h.addOutputAddress(o, f);
    const y = await i.identity.sign(h);
    return y.finalize(), await i.onchainProvider.broadcastTransaction(y.hex), y.id;
  }
  e.completeUnroll = r;
})(Md || (Md = {}));
function xS(e) {
  return new Promise((t) => setTimeout(t, e));
}
function vS(e, t, n) {
  return async () => {
    const [r, i] = await e.bumpP2A(n);
    await t.broadcastTransaction(r, i);
  };
}
function ES(e, t) {
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
function TS(e, t, n) {
  const r = ie.decode(n.tapTree).exitPaths();
  for (const i of r)
    if (i.params.timelock.type === "blocks") {
      if (t.height >= e.height + Number(i.params.timelock.value))
        return i;
    } else if (t.time >= e.time + Number(i.params.timelock.value))
      return i;
}
const SS = new Tg(), kS = new Eg(), IS = new Lp(), AS = new wS(SS, kS, {
  messageHandlers: [
    new mS(),
    new HE(IS),
    new oc({})
  ],
  tickIntervalMs: 5e3,
  debug: !0
});
AS.start().catch(console.error);
const Sg = "arkade-cache-v1";
self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(Sg)), self.skipWaiting();
});
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((t) => Promise.all(
      t.map((n) => {
        if (n !== Sg)
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
