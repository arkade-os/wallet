/*! noble-hashes - MIT License (c) 2022 Paul Miller (paulmillr.com) */
function Vl(e) {
  return e instanceof Uint8Array || ArrayBuffer.isView(e) && e.constructor.name === "Uint8Array";
}
function fr(e, t = "") {
  if (!Number.isSafeInteger(e) || e < 0) {
    const n = t && `"${t}" `;
    throw new Error(`${n}expected integer >= 0, got ${e}`);
  }
}
function rt(e, t, n = "") {
  const r = Vl(e), i = e?.length, s = t !== void 0;
  if (!r || s && i !== t) {
    const o = n && `"${n}" `, a = s ? ` of length ${t}` : "", c = r ? `length=${i}` : `type=${typeof e}`;
    throw new Error(o + "expected Uint8Array" + a + ", got " + c);
  }
  return e;
}
function mg(e) {
  if (typeof e != "function" || typeof e.create != "function")
    throw new Error("Hash must wrapped by utils.createHasher");
  fr(e.outputLen), fr(e.blockLen);
}
function Zo(e, t = !0) {
  if (e.destroyed)
    throw new Error("Hash instance has been destroyed");
  if (t && e.finished)
    throw new Error("Hash#digest() has already been called");
}
function Db(e, t) {
  rt(e, void 0, "digestInto() output");
  const n = t.outputLen;
  if (e.length < n)
    throw new Error('"digestInto() output" expected to be of length >=' + n);
}
function Ti(...e) {
  for (let t = 0; t < e.length; t++)
    e[t].fill(0);
}
function Dc(e) {
  return new DataView(e.buffer, e.byteOffset, e.byteLength);
}
function qe(e, t) {
  return e << 32 - t | e >>> t;
}
function no(e, t) {
  return e << t | e >>> 32 - t >>> 0;
}
const bg = /* @ts-ignore */ typeof Uint8Array.from([]).toHex == "function" && typeof Uint8Array.fromHex == "function", Vb = /* @__PURE__ */ Array.from({ length: 256 }, (e, t) => t.toString(16).padStart(2, "0"));
function Qa(e) {
  if (rt(e), bg)
    return e.toHex();
  let t = "";
  for (let n = 0; n < e.length; n++)
    t += Vb[e[n]];
  return t;
}
const pn = { _0: 48, _9: 57, A: 65, F: 70, a: 97, f: 102 };
function fd(e) {
  if (e >= pn._0 && e <= pn._9)
    return e - pn._0;
  if (e >= pn.A && e <= pn.F)
    return e - (pn.A - 10);
  if (e >= pn.a && e <= pn.f)
    return e - (pn.a - 10);
}
function Xo(e) {
  if (typeof e != "string")
    throw new Error("hex string expected, got " + typeof e);
  if (bg)
    return Uint8Array.fromHex(e);
  const t = e.length, n = t / 2;
  if (t % 2)
    throw new Error("hex string expected, got unpadded hex of length " + t);
  const r = new Uint8Array(n);
  for (let i = 0, s = 0; i < n; i++, s += 2) {
    const o = fd(e.charCodeAt(s)), a = fd(e.charCodeAt(s + 1));
    if (o === void 0 || a === void 0) {
      const c = e[s] + e[s + 1];
      throw new Error('hex string expected, got non-hex character "' + c + '" at index ' + s);
    }
    r[i] = o * 16 + a;
  }
  return r;
}
function Le(...e) {
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
function Eg(e, t = {}) {
  const n = (i, s) => e(s).update(i).digest(), r = e(void 0);
  return n.outputLen = r.outputLen, n.blockLen = r.blockLen, n.create = (i) => e(i), Object.assign(n, t), Object.freeze(n);
}
function zs(e = 32) {
  const t = typeof globalThis == "object" ? globalThis.crypto : null;
  if (typeof t?.getRandomValues != "function")
    throw new Error("crypto.getRandomValues must be defined");
  return t.getRandomValues(new Uint8Array(e));
}
const Mb = (e) => ({
  oid: Uint8Array.from([6, 9, 96, 134, 72, 1, 101, 3, 4, 2, e])
});
function Hb(e, t, n) {
  return e & t ^ ~e & n;
}
function Fb(e, t, n) {
  return e & t ^ e & n ^ t & n;
}
let xg = class {
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
    this.blockLen = t, this.outputLen = n, this.padOffset = r, this.isLE = i, this.buffer = new Uint8Array(t), this.view = Dc(this.buffer);
  }
  update(t) {
    Zo(this), rt(t);
    const { view: n, buffer: r, blockLen: i } = this, s = t.length;
    for (let o = 0; o < s; ) {
      const a = Math.min(i - this.pos, s - o);
      if (a === i) {
        const c = Dc(t);
        for (; i <= s - o; o += i)
          this.process(c, o);
        continue;
      }
      r.set(t.subarray(o, o + a), this.pos), this.pos += a, o += a, this.pos === i && (this.process(n, 0), this.pos = 0);
    }
    return this.length += t.length, this.roundClean(), this;
  }
  digestInto(t) {
    Zo(this), Db(t, this), this.finished = !0;
    const { buffer: n, view: r, blockLen: i, isLE: s } = this;
    let { pos: o } = this;
    n[o++] = 128, Ti(this.buffer.subarray(o)), this.padOffset > i - o && (this.process(r, 0), o = 0);
    for (let d = o; d < i; d++)
      n[d] = 0;
    r.setBigUint64(i - 8, BigInt(this.length * 8), s), this.process(r, 0);
    const a = Dc(t), c = this.outputLen;
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
const Cn = /* @__PURE__ */ Uint32Array.from([
  1779033703,
  3144134277,
  1013904242,
  2773480762,
  1359893119,
  2600822924,
  528734635,
  1541459225
]), jb = /* @__PURE__ */ Uint32Array.from([
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
]), Ln = /* @__PURE__ */ new Uint32Array(64);
let Kb = class extends xg {
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
      Ln[d] = t.getUint32(n, !1);
    for (let d = 16; d < 64; d++) {
      const h = Ln[d - 15], p = Ln[d - 2], y = qe(h, 7) ^ qe(h, 18) ^ h >>> 3, f = qe(p, 17) ^ qe(p, 19) ^ p >>> 10;
      Ln[d] = f + Ln[d - 7] + y + Ln[d - 16] | 0;
    }
    let { A: r, B: i, C: s, D: o, E: a, F: c, G: u, H: l } = this;
    for (let d = 0; d < 64; d++) {
      const h = qe(a, 6) ^ qe(a, 11) ^ qe(a, 25), p = l + h + Hb(a, c, u) + jb[d] + Ln[d] | 0, f = (qe(r, 2) ^ qe(r, 13) ^ qe(r, 22)) + Fb(r, i, s) | 0;
      l = u, u = c, c = a, a = o + p | 0, o = s, s = i, i = r, r = p + f | 0;
    }
    r = r + this.A | 0, i = i + this.B | 0, s = s + this.C | 0, o = o + this.D | 0, a = a + this.E | 0, c = c + this.F | 0, u = u + this.G | 0, l = l + this.H | 0, this.set(r, i, s, o, a, c, u, l);
  }
  roundClean() {
    Ti(Ln);
  }
  destroy() {
    this.set(0, 0, 0, 0, 0, 0, 0, 0), Ti(this.buffer);
  }
}, zb = class extends Kb {
  // We cannot use array here since array allows indexing by variable
  // which means optimizer/compiler cannot use registers.
  A = Cn[0] | 0;
  B = Cn[1] | 0;
  C = Cn[2] | 0;
  D = Cn[3] | 0;
  E = Cn[4] | 0;
  F = Cn[5] | 0;
  G = Cn[6] | 0;
  H = Cn[7] | 0;
  constructor() {
    super(32);
  }
};
const Ht = /* @__PURE__ */ Eg(
  () => new zb(),
  /* @__PURE__ */ Mb(1)
);
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const Ml = /* @__PURE__ */ BigInt(0), Bu = /* @__PURE__ */ BigInt(1);
function Qo(e, t = "") {
  if (typeof e != "boolean") {
    const n = t && `"${t}" `;
    throw new Error(n + "expected boolean, got type=" + typeof e);
  }
  return e;
}
function Tg(e) {
  if (typeof e == "bigint") {
    if (!ko(e))
      throw new Error("positive bigint expected, got " + e);
  } else
    fr(e);
  return e;
}
function ro(e) {
  const t = Tg(e).toString(16);
  return t.length & 1 ? "0" + t : t;
}
function Sg(e) {
  if (typeof e != "string")
    throw new Error("hex string expected, got " + typeof e);
  return e === "" ? Ml : BigInt("0x" + e);
}
function Bn(e) {
  return Sg(Qa(e));
}
function vg(e) {
  return Sg(Qa(Wb(rt(e)).reverse()));
}
function Ws(e, t) {
  fr(t), e = Tg(e);
  const n = Xo(e.toString(16).padStart(t * 2, "0"));
  if (n.length !== t)
    throw new Error("number too large");
  return n;
}
function $g(e, t) {
  return Ws(e, t).reverse();
}
function Ns(e, t) {
  if (e.length !== t.length)
    return !1;
  let n = 0;
  for (let r = 0; r < e.length; r++)
    n |= e[r] ^ t[r];
  return n === 0;
}
function Wb(e) {
  return Uint8Array.from(e);
}
function qb(e) {
  return Uint8Array.from(e, (t, n) => {
    const r = t.charCodeAt(0);
    if (t.length !== 1 || r > 127)
      throw new Error(`string contains non-ASCII character "${e[n]}" with code ${r} at position ${n}`);
    return r;
  });
}
const ko = (e) => typeof e == "bigint" && Ml <= e;
function Gb(e, t, n) {
  return ko(e) && ko(t) && ko(n) && t <= e && e < n;
}
function kg(e, t, n, r) {
  if (!Gb(t, n, r))
    throw new Error("expected valid " + e + ": " + n + " <= n < " + r + ", got " + t);
}
function Yb(e) {
  let t;
  for (t = 0; e > Ml; e >>= Bu, t += 1)
    ;
  return t;
}
const Hl = (e) => (Bu << BigInt(e)) - Bu;
function Zb(e, t, n) {
  if (fr(e, "hashLen"), fr(t, "qByteLen"), typeof n != "function")
    throw new Error("hmacFn must be a function");
  const r = (g) => new Uint8Array(g), i = Uint8Array.of(), s = Uint8Array.of(0), o = Uint8Array.of(1), a = 1e3;
  let c = r(e), u = r(e), l = 0;
  const d = () => {
    c.fill(1), u.fill(0), l = 0;
  }, h = (...g) => n(u, Le(c, ...g)), p = (g = i) => {
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
    return Le(...m);
  };
  return (g, m) => {
    d(), p(g);
    let S;
    for (; !(S = m(y())); )
      p();
    return d(), S;
  };
}
function Fl(e, t = {}, n = {}) {
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
function dd(e) {
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
const Xt = /* @__PURE__ */ BigInt(0), zt = /* @__PURE__ */ BigInt(1), Ur = /* @__PURE__ */ BigInt(2), Ag = /* @__PURE__ */ BigInt(3), Ig = /* @__PURE__ */ BigInt(4), Og = /* @__PURE__ */ BigInt(5), Xb = /* @__PURE__ */ BigInt(7), Bg = /* @__PURE__ */ BigInt(8), Qb = /* @__PURE__ */ BigInt(9), Ng = /* @__PURE__ */ BigInt(16);
function Oe(e, t) {
  const n = e % t;
  return n >= Xt ? n : t + n;
}
function we(e, t, n) {
  let r = e;
  for (; t-- > Xt; )
    r *= r, r %= n;
  return r;
}
function hd(e, t) {
  if (e === Xt)
    throw new Error("invert: expected non-zero number");
  if (t <= Xt)
    throw new Error("invert: expected positive modulus, got " + t);
  let n = Oe(e, t), r = t, i = Xt, s = zt;
  for (; n !== Xt; ) {
    const a = r / n, c = r % n, u = i - s * a;
    r = n, n = c, i = s, s = u;
  }
  if (r !== zt)
    throw new Error("invert: does not exist");
  return Oe(i, t);
}
function jl(e, t, n) {
  if (!e.eql(e.sqr(t), n))
    throw new Error("Cannot find square root");
}
function Rg(e, t) {
  const n = (e.ORDER + zt) / Ig, r = e.pow(t, n);
  return jl(e, r, t), r;
}
function Jb(e, t) {
  const n = (e.ORDER - Og) / Bg, r = e.mul(t, Ur), i = e.pow(r, n), s = e.mul(t, i), o = e.mul(e.mul(s, Ur), i), a = e.mul(s, e.sub(o, e.ONE));
  return jl(e, a, t), a;
}
function t0(e) {
  const t = Ja(e), n = Ug(e), r = n(t, t.neg(t.ONE)), i = n(t, r), s = n(t, t.neg(r)), o = (e + Xb) / Ng;
  return (a, c) => {
    let u = a.pow(c, o), l = a.mul(u, r);
    const d = a.mul(u, i), h = a.mul(u, s), p = a.eql(a.sqr(l), c), y = a.eql(a.sqr(d), c);
    u = a.cmov(u, l, p), l = a.cmov(h, d, y);
    const f = a.eql(a.sqr(l), c), g = a.cmov(u, l, f);
    return jl(a, g, c), g;
  };
}
function Ug(e) {
  if (e < Ag)
    throw new Error("sqrt is not defined for small field");
  let t = e - zt, n = 0;
  for (; t % Ur === Xt; )
    t /= Ur, n++;
  let r = Ur;
  const i = Ja(e);
  for (; pd(i, r) === 1; )
    if (r++ > 1e3)
      throw new Error("Cannot find square root: probably non-prime P");
  if (n === 1)
    return Rg;
  let s = i.pow(r, t);
  const o = (t + zt) / Ur;
  return function(c, u) {
    if (c.is0(u))
      return u;
    if (pd(c, u) !== 1)
      throw new Error("Cannot find square root");
    let l = n, d = c.mul(c.ONE, s), h = c.pow(u, t), p = c.pow(u, o);
    for (; !c.eql(h, c.ONE); ) {
      if (c.is0(h))
        return c.ZERO;
      let y = 1, f = c.sqr(h);
      for (; !c.eql(f, c.ONE); )
        if (y++, f = c.sqr(f), y === l)
          throw new Error("Cannot find square root");
      const g = zt << BigInt(l - y - 1), m = c.pow(d, g);
      l = y, d = c.sqr(m), h = c.mul(h, d), p = c.mul(p, m);
    }
    return p;
  };
}
function e0(e) {
  return e % Ig === Ag ? Rg : e % Bg === Og ? Jb : e % Ng === Qb ? t0(e) : Ug(e);
}
const n0 = [
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
function r0(e) {
  const t = {
    ORDER: "bigint",
    BYTES: "number",
    BITS: "number"
  }, n = n0.reduce((r, i) => (r[i] = "function", r), t);
  return Fl(e, n), e;
}
function i0(e, t, n) {
  if (n < Xt)
    throw new Error("invalid exponent, negatives unsupported");
  if (n === Xt)
    return e.ONE;
  if (n === zt)
    return t;
  let r = e.ONE, i = t;
  for (; n > Xt; )
    n & zt && (r = e.mul(r, i)), i = e.sqr(i), n >>= zt;
  return r;
}
function Pg(e, t, n = !1) {
  const r = new Array(t.length).fill(n ? e.ZERO : void 0), i = t.reduce((o, a, c) => e.is0(a) ? o : (r[c] = o, e.mul(o, a)), e.ONE), s = e.inv(i);
  return t.reduceRight((o, a, c) => e.is0(a) ? o : (r[c] = e.mul(o, r[c]), e.mul(o, a)), s), r;
}
function pd(e, t) {
  const n = (e.ORDER - zt) / Ur, r = e.pow(t, n), i = e.eql(r, e.ONE), s = e.eql(r, e.ZERO), o = e.eql(r, e.neg(e.ONE));
  if (!i && !s && !o)
    throw new Error("invalid Legendre symbol result");
  return i ? 1 : s ? 0 : -1;
}
function s0(e, t) {
  t !== void 0 && fr(t);
  const n = t !== void 0 ? t : e.toString(2).length, r = Math.ceil(n / 8);
  return { nBitLength: n, nByteLength: r };
}
let o0 = class {
  ORDER;
  BITS;
  BYTES;
  isLE;
  ZERO = Xt;
  ONE = zt;
  _lengths;
  _sqrt;
  // cached sqrt
  _mod;
  constructor(t, n = {}) {
    if (t <= Xt)
      throw new Error("invalid field: expected ORDER > 0, got " + t);
    let r;
    this.isLE = !1, n != null && typeof n == "object" && (typeof n.BITS == "number" && (r = n.BITS), typeof n.sqrt == "function" && (this.sqrt = n.sqrt), typeof n.isLE == "boolean" && (this.isLE = n.isLE), n.allowedLengths && (this._lengths = n.allowedLengths?.slice()), typeof n.modFromBytes == "boolean" && (this._mod = n.modFromBytes));
    const { nBitLength: i, nByteLength: s } = s0(t, r);
    if (s > 2048)
      throw new Error("invalid field: expected ORDER of <= 2048 bytes");
    this.ORDER = t, this.BITS = i, this.BYTES = s, this._sqrt = void 0, Object.preventExtensions(this);
  }
  create(t) {
    return Oe(t, this.ORDER);
  }
  isValid(t) {
    if (typeof t != "bigint")
      throw new Error("invalid field element: expected bigint, got " + typeof t);
    return Xt <= t && t < this.ORDER;
  }
  is0(t) {
    return t === Xt;
  }
  // is valid and invertible
  isValidNot0(t) {
    return !this.is0(t) && this.isValid(t);
  }
  isOdd(t) {
    return (t & zt) === zt;
  }
  neg(t) {
    return Oe(-t, this.ORDER);
  }
  eql(t, n) {
    return t === n;
  }
  sqr(t) {
    return Oe(t * t, this.ORDER);
  }
  add(t, n) {
    return Oe(t + n, this.ORDER);
  }
  sub(t, n) {
    return Oe(t - n, this.ORDER);
  }
  mul(t, n) {
    return Oe(t * n, this.ORDER);
  }
  pow(t, n) {
    return i0(this, t, n);
  }
  div(t, n) {
    return Oe(t * hd(n, this.ORDER), this.ORDER);
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
    return hd(t, this.ORDER);
  }
  sqrt(t) {
    return this._sqrt || (this._sqrt = e0(this.ORDER)), this._sqrt(this, t);
  }
  toBytes(t) {
    return this.isLE ? $g(t, this.BYTES) : Ws(t, this.BYTES);
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
    let c = s ? vg(t) : Bn(t);
    if (a && (c = Oe(c, o)), !n && !this.isValid(c))
      throw new Error("invalid field element: outside of range 0..ORDER");
    return c;
  }
  // TODO: we don't need it here, move out to separate fn
  invertBatch(t) {
    return Pg(this, t);
  }
  // We can't move this out because Fp6, Fp12 implement it
  // and it's unclear what to return in there.
  cmov(t, n, r) {
    return r ? n : t;
  }
};
function Ja(e, t = {}) {
  return new o0(e, t);
}
function Cg(e) {
  if (typeof e != "bigint")
    throw new Error("field order must be bigint");
  const t = e.toString(2).length;
  return Math.ceil(t / 8);
}
function Lg(e) {
  const t = Cg(e);
  return t + Math.ceil(t / 2);
}
function _g(e, t, n = !1) {
  rt(e);
  const r = e.length, i = Cg(t), s = Lg(t);
  if (r < 16 || r < s || r > 1024)
    throw new Error("expected " + s + "-1024 bytes of input, got " + r);
  const o = n ? vg(e) : Bn(e), a = Oe(o, t - zt) + zt;
  return n ? $g(a, i) : Ws(a, i);
}
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const Si = /* @__PURE__ */ BigInt(0), Pr = /* @__PURE__ */ BigInt(1);
function Jo(e, t) {
  const n = t.negate();
  return e ? n : t;
}
function gd(e, t) {
  const n = Pg(e.Fp, t.map((r) => r.Z));
  return t.map((r, i) => e.fromAffine(r.toAffine(n[i])));
}
function Dg(e, t) {
  if (!Number.isSafeInteger(e) || e <= 0 || e > t)
    throw new Error("invalid window size, expected [1.." + t + "], got W=" + e);
}
function Vc(e, t) {
  Dg(e, t);
  const n = Math.ceil(t / e) + 1, r = 2 ** (e - 1), i = 2 ** e, s = Hl(e), o = BigInt(e);
  return { windows: n, windowSize: r, mask: s, maxNumber: i, shiftBy: o };
}
function yd(e, t, n) {
  const { windowSize: r, mask: i, maxNumber: s, shiftBy: o } = n;
  let a = Number(e & i), c = e >> o;
  a > r && (a -= s, c += Pr);
  const u = t * r, l = u + Math.abs(a) - 1, d = a === 0, h = a < 0, p = t % 2 !== 0;
  return { nextN: c, offset: l, isZero: d, isNeg: h, isNegF: p, offsetF: u };
}
const Mc = /* @__PURE__ */ new WeakMap(), Vg = /* @__PURE__ */ new WeakMap();
function Hc(e) {
  return Vg.get(e) || 1;
}
function wd(e) {
  if (e !== Si)
    throw new Error("invalid wNAF");
}
let a0 = class {
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
    for (; n > Si; )
      n & Pr && (r = r.add(i)), i = i.double(), n >>= Pr;
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
    const { windows: r, windowSize: i } = Vc(n, this.bits), s = [];
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
    const o = Vc(t, this.bits);
    for (let a = 0; a < o.windows; a++) {
      const { nextN: c, offset: u, isZero: l, isNeg: d, isNegF: h, offsetF: p } = yd(r, a, o);
      r = c, l ? s = s.add(Jo(h, n[p])) : i = i.add(Jo(d, n[u]));
    }
    return wd(r), { p: i, f: s };
  }
  /**
   * Implements ec unsafe (non const-time) multiplication using precomputed tables and w-ary non-adjacent form.
   * @param acc accumulator point to add result of multiplication
   * @returns point
   */
  wNAFUnsafe(t, n, r, i = this.ZERO) {
    const s = Vc(t, this.bits);
    for (let o = 0; o < s.windows && r !== Si; o++) {
      const { nextN: a, offset: c, isZero: u, isNeg: l } = yd(r, o, s);
      if (r = a, !u) {
        const d = n[c];
        i = i.add(l ? d.negate() : d);
      }
    }
    return wd(r), i;
  }
  getPrecomputes(t, n, r) {
    let i = Mc.get(n);
    return i || (i = this.precomputeWindow(n, t), t !== 1 && (typeof r == "function" && (i = r(i)), Mc.set(n, i))), i;
  }
  cached(t, n, r) {
    const i = Hc(t);
    return this.wNAF(i, this.getPrecomputes(i, t, r), n);
  }
  unsafe(t, n, r, i) {
    const s = Hc(t);
    return s === 1 ? this._unsafeLadder(t, n, i) : this.wNAFUnsafe(s, this.getPrecomputes(s, t, r), n, i);
  }
  // We calculate precomputes for elliptic curve point multiplication
  // using windowed method. This specifies window size and
  // stores precomputed values. Usually only base point would be precomputed.
  createCache(t, n) {
    Dg(n, this.bits), Vg.set(t, n), Mc.delete(t);
  }
  hasCache(t) {
    return Hc(t) !== 1;
  }
};
function c0(e, t, n, r) {
  let i = t, s = e.ZERO, o = e.ZERO;
  for (; n > Si || r > Si; )
    n & Pr && (s = s.add(i)), r & Pr && (o = o.add(i)), i = i.double(), n >>= Pr, r >>= Pr;
  return { p1: s, p2: o };
}
function md(e, t, n) {
  if (t) {
    if (t.ORDER !== e)
      throw new Error("Field.ORDER must match order: Fp == p, Fn == n");
    return r0(t), t;
  } else
    return Ja(e, { isLE: n });
}
function u0(e, t, n = {}, r) {
  if (r === void 0 && (r = e === "edwards"), !t || typeof t != "object")
    throw new Error(`expected valid ${e} CURVE object`);
  for (const c of ["p", "n", "h"]) {
    const u = t[c];
    if (!(typeof u == "bigint" && u > Si))
      throw new Error(`CURVE.${c} must be positive bigint`);
  }
  const i = md(t.p, n.Fp, r), s = md(t.n, n.Fn, r), a = ["Gx", "Gy", "a", "b"];
  for (const c of a)
    if (!i.isValid(t[c]))
      throw new Error(`CURVE.${c} must be valid field element of CURVE.Fp`);
  return t = Object.freeze(Object.assign({}, t)), { CURVE: t, Fp: i, Fn: s };
}
function Mg(e, t) {
  return function(r) {
    const i = e(r);
    return { secretKey: i, publicKey: t(i) };
  };
}
let Hg = class {
  oHash;
  iHash;
  blockLen;
  outputLen;
  finished = !1;
  destroyed = !1;
  constructor(t, n) {
    if (mg(t), rt(n, void 0, "key"), this.iHash = t.create(), typeof this.iHash.update != "function")
      throw new Error("Expected instance of class which extends utils.Hash");
    this.blockLen = this.iHash.blockLen, this.outputLen = this.iHash.outputLen;
    const r = this.blockLen, i = new Uint8Array(r);
    i.set(n.length > r ? t.create().update(n).digest() : n);
    for (let s = 0; s < i.length; s++)
      i[s] ^= 54;
    this.iHash.update(i), this.oHash = t.create();
    for (let s = 0; s < i.length; s++)
      i[s] ^= 106;
    this.oHash.update(i), Ti(i);
  }
  update(t) {
    return Zo(this), this.iHash.update(t), this;
  }
  digestInto(t) {
    Zo(this), rt(t, this.outputLen, "output"), this.finished = !0, this.iHash.digestInto(t), this.oHash.update(t), this.oHash.digestInto(t), this.destroy();
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
const Fg = (e, t, n) => new Hg(e, t).update(n).digest();
Fg.create = (e, t) => new Hg(e, t);
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const bd = (e, t) => (e + (e >= 0 ? t : -t) / jg) / t;
function l0(e, t, n) {
  const [[r, i], [s, o]] = t, a = bd(o * e, n), c = bd(-i * e, n);
  let u = e - a * r - c * s, l = -a * i - c * o;
  const d = u < vn, h = l < vn;
  d && (u = -u), h && (l = -l);
  const p = Hl(Math.ceil(Yb(n) / 2)) + fi;
  if (u < vn || u >= p || l < vn || l >= p)
    throw new Error("splitScalar (endomorphism): failed, k=" + e);
  return { k1neg: d, k1: u, k2neg: h, k2: l };
}
function Nu(e) {
  if (!["compact", "recovered", "der"].includes(e))
    throw new Error('Signature format must be "compact", "recovered", or "der"');
  return e;
}
function Fc(e, t) {
  const n = {};
  for (let r of Object.keys(t))
    n[r] = e[r] === void 0 ? t[r] : e[r];
  return Qo(n.lowS, "lowS"), Qo(n.prehash, "prehash"), n.format !== void 0 && Nu(n.format), n;
}
let f0 = class extends Error {
  constructor(t = "") {
    super(t);
  }
};
const jn = {
  // asn.1 DER encoding utils
  Err: f0,
  // Basic building block is TLV (Tag-Length-Value)
  _tlv: {
    encode: (e, t) => {
      const { Err: n } = jn;
      if (e < 0 || e > 256)
        throw new n("tlv.encode: wrong tag");
      if (t.length & 1)
        throw new n("tlv.encode: unpadded data");
      const r = t.length / 2, i = ro(r);
      if (i.length / 2 & 128)
        throw new n("tlv.encode: long form length too big");
      const s = r > 127 ? ro(i.length / 2 | 128) : "";
      return ro(e) + s + i + t;
    },
    // v - value, l - left bytes (unparsed)
    decode(e, t) {
      const { Err: n } = jn;
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
      const { Err: t } = jn;
      if (e < vn)
        throw new t("integer: negative integers are not allowed");
      let n = ro(e);
      if (Number.parseInt(n[0], 16) & 8 && (n = "00" + n), n.length & 1)
        throw new t("unexpected DER parsing assertion: unpadded hex");
      return n;
    },
    decode(e) {
      const { Err: t } = jn;
      if (e[0] & 128)
        throw new t("invalid signature integer: negative");
      if (e[0] === 0 && !(e[1] & 128))
        throw new t("invalid signature integer: unnecessary leading zero");
      return Bn(e);
    }
  },
  toSig(e) {
    const { Err: t, _int: n, _tlv: r } = jn, i = rt(e, void 0, "signature"), { v: s, l: o } = r.decode(48, i);
    if (o.length)
      throw new t("invalid signature: left bytes after parsing");
    const { v: a, l: c } = r.decode(2, s), { v: u, l } = r.decode(2, c);
    if (l.length)
      throw new t("invalid signature: left bytes after parsing");
    return { r: n.decode(a), s: n.decode(u) };
  },
  hexFromSig(e) {
    const { _tlv: t, _int: n } = jn, r = t.encode(2, n.encode(e.r)), i = t.encode(2, n.encode(e.s)), s = r + i;
    return t.encode(48, s);
  }
}, vn = BigInt(0), fi = BigInt(1), jg = BigInt(2), io = BigInt(3), d0 = BigInt(4);
function h0(e, t = {}) {
  const n = u0("weierstrass", e, t), { Fp: r, Fn: i } = n;
  let s = n.CURVE;
  const { h: o, n: a } = s;
  Fl(t, {}, {
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
  const u = zg(r, i);
  function l() {
    if (!r.isOdd)
      throw new Error("compression is not supported: Field does not have .isOdd()");
  }
  function d(L, T, x) {
    const { x: w, y: E } = T.toAffine(), k = r.toBytes(w);
    if (Qo(x, "isCompressed"), x) {
      l();
      const I = !r.isOdd(E);
      return Le(Kg(I), k);
    } else
      return Le(Uint8Array.of(4), k, r.toBytes(E));
  }
  function h(L) {
    rt(L, void 0, "Point");
    const { publicKey: T, publicKeyUncompressed: x } = u, w = L.length, E = L[0], k = L.subarray(1);
    if (w === T && (E === 2 || E === 3)) {
      const I = r.fromBytes(k);
      if (!r.isValid(I))
        throw new Error("bad point: is not on curve, wrong x");
      const A = f(I);
      let $;
      try {
        $ = r.sqrt(A);
      } catch (K) {
        const M = K instanceof Error ? ": " + K.message : "";
        throw new Error("bad point: is not on curve, sqrt error" + M);
      }
      l();
      const B = r.isOdd($);
      return (E & 1) === 1 !== B && ($ = r.neg($)), { x: I, y: $ };
    } else if (w === x && E === 4) {
      const I = r.BYTES, A = r.fromBytes(k.subarray(0, I)), $ = r.fromBytes(k.subarray(I, I * 2));
      if (!g(A, $))
        throw new Error("bad point: is not on curve");
      return { x: A, y: $ };
    } else
      throw new Error(`bad point: got length ${w}, expected compressed=${T} or uncompressed=${x}`);
  }
  const p = t.toBytes || d, y = t.fromBytes || h;
  function f(L) {
    const T = r.sqr(L), x = r.mul(T, L);
    return r.add(r.add(x, r.mul(L, s.a)), s.b);
  }
  function g(L, T) {
    const x = r.sqr(T), w = f(L);
    return r.eql(x, w);
  }
  if (!g(s.Gx, s.Gy))
    throw new Error("bad curve params: generator point");
  const m = r.mul(r.pow(s.a, io), d0), S = r.mul(r.sqr(s.b), BigInt(27));
  if (r.is0(r.add(m, S)))
    throw new Error("bad curve params: a or b");
  function v(L, T, x = !1) {
    if (!r.isValid(T) || x && r.is0(T))
      throw new Error(`bad point coordinate ${L}`);
    return T;
  }
  function O(L) {
    if (!(L instanceof U))
      throw new Error("Weierstrass Point expected");
  }
  function R(L) {
    if (!c || !c.basises)
      throw new Error("no endo");
    return l0(L, c.basises, i.ORDER);
  }
  const j = dd((L, T) => {
    const { X: x, Y: w, Z: E } = L;
    if (r.eql(E, r.ONE))
      return { x, y: w };
    const k = L.is0();
    T == null && (T = k ? r.ONE : r.inv(E));
    const I = r.mul(x, T), A = r.mul(w, T), $ = r.mul(E, T);
    if (k)
      return { x: r.ZERO, y: r.ZERO };
    if (!r.eql($, r.ONE))
      throw new Error("invZ was invalid");
    return { x: I, y: A };
  }), b = dd((L) => {
    if (L.is0()) {
      if (t.allowInfinityPoint && !r.is0(L.Y))
        return;
      throw new Error("bad point: ZERO");
    }
    const { x: T, y: x } = L.toAffine();
    if (!r.isValid(T) || !r.isValid(x))
      throw new Error("bad point: x or y not field elements");
    if (!g(T, x))
      throw new Error("bad point: equation left != right");
    if (!L.isTorsionFree())
      throw new Error("bad point: not in prime-order subgroup");
    return !0;
  });
  function W(L, T, x, w, E) {
    return x = new U(r.mul(x.X, L), x.Y, x.Z), T = Jo(w, T), x = Jo(E, x), T.add(x);
  }
  class U {
    // base / generator point
    static BASE = new U(s.Gx, s.Gy, r.ONE);
    // zero / infinity / identity point
    static ZERO = new U(r.ZERO, r.ONE, r.ZERO);
    // 0, 1, 0
    // math field
    static Fp = r;
    // scalar field
    static Fn = i;
    X;
    Y;
    Z;
    /** Does NOT validate if the point is valid. Use `.assertValidity()`. */
    constructor(T, x, w) {
      this.X = v("x", T), this.Y = v("y", x, !0), this.Z = v("z", w), Object.freeze(this);
    }
    static CURVE() {
      return s;
    }
    /** Does NOT validate if the point is valid. Use `.assertValidity()`. */
    static fromAffine(T) {
      const { x, y: w } = T || {};
      if (!T || !r.isValid(x) || !r.isValid(w))
        throw new Error("invalid affine point");
      if (T instanceof U)
        throw new Error("projective point not allowed");
      return r.is0(x) && r.is0(w) ? U.ZERO : new U(x, w, r.ONE);
    }
    static fromBytes(T) {
      const x = U.fromAffine(y(rt(T, void 0, "point")));
      return x.assertValidity(), x;
    }
    static fromHex(T) {
      return U.fromBytes(Xo(T));
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
    precompute(T = 8, x = !0) {
      return et.createCache(this, T), x || this.multiply(io), this;
    }
    // TODO: return `this`
    /** A point on curve is valid if it conforms to equation. */
    assertValidity() {
      b(this);
    }
    hasEvenY() {
      const { y: T } = this.toAffine();
      if (!r.isOdd)
        throw new Error("Field doesn't support isOdd");
      return !r.isOdd(T);
    }
    /** Compare one point to another. */
    equals(T) {
      O(T);
      const { X: x, Y: w, Z: E } = this, { X: k, Y: I, Z: A } = T, $ = r.eql(r.mul(x, A), r.mul(k, E)), B = r.eql(r.mul(w, A), r.mul(I, E));
      return $ && B;
    }
    /** Flips point to one corresponding to (x, -y) in Affine coordinates. */
    negate() {
      return new U(this.X, r.neg(this.Y), this.Z);
    }
    // Renes-Costello-Batina exception-free doubling formula.
    // There is 30% faster Jacobian formula, but it is not complete.
    // https://eprint.iacr.org/2015/1060, algorithm 3
    // Cost: 8M + 3S + 3*a + 2*b3 + 15add.
    double() {
      const { a: T, b: x } = s, w = r.mul(x, io), { X: E, Y: k, Z: I } = this;
      let A = r.ZERO, $ = r.ZERO, B = r.ZERO, N = r.mul(E, E), K = r.mul(k, k), M = r.mul(I, I), C = r.mul(E, k);
      return C = r.add(C, C), B = r.mul(E, I), B = r.add(B, B), A = r.mul(T, B), $ = r.mul(w, M), $ = r.add(A, $), A = r.sub(K, $), $ = r.add(K, $), $ = r.mul(A, $), A = r.mul(C, A), B = r.mul(w, B), M = r.mul(T, M), C = r.sub(N, M), C = r.mul(T, C), C = r.add(C, B), B = r.add(N, N), N = r.add(B, N), N = r.add(N, M), N = r.mul(N, C), $ = r.add($, N), M = r.mul(k, I), M = r.add(M, M), N = r.mul(M, C), A = r.sub(A, N), B = r.mul(M, K), B = r.add(B, B), B = r.add(B, B), new U(A, $, B);
    }
    // Renes-Costello-Batina exception-free addition formula.
    // There is 30% faster Jacobian formula, but it is not complete.
    // https://eprint.iacr.org/2015/1060, algorithm 1
    // Cost: 12M + 0S + 3*a + 3*b3 + 23add.
    add(T) {
      O(T);
      const { X: x, Y: w, Z: E } = this, { X: k, Y: I, Z: A } = T;
      let $ = r.ZERO, B = r.ZERO, N = r.ZERO;
      const K = s.a, M = r.mul(s.b, io);
      let C = r.mul(x, k), H = r.mul(w, I), q = r.mul(E, A), ot = r.add(x, w), F = r.add(k, I);
      ot = r.mul(ot, F), F = r.add(C, H), ot = r.sub(ot, F), F = r.add(x, E);
      let Z = r.add(k, A);
      return F = r.mul(F, Z), Z = r.add(C, q), F = r.sub(F, Z), Z = r.add(w, E), $ = r.add(I, A), Z = r.mul(Z, $), $ = r.add(H, q), Z = r.sub(Z, $), N = r.mul(K, F), $ = r.mul(M, q), N = r.add($, N), $ = r.sub(H, N), N = r.add(H, N), B = r.mul($, N), H = r.add(C, C), H = r.add(H, C), q = r.mul(K, q), F = r.mul(M, F), H = r.add(H, q), q = r.sub(C, q), q = r.mul(K, q), F = r.add(F, q), C = r.mul(H, F), B = r.add(B, C), C = r.mul(Z, F), $ = r.mul(ot, $), $ = r.sub($, C), C = r.mul(ot, H), N = r.mul(Z, N), N = r.add(N, C), new U($, B, N);
    }
    subtract(T) {
      return this.add(T.negate());
    }
    is0() {
      return this.equals(U.ZERO);
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
      const { endo: x } = t;
      if (!i.isValidNot0(T))
        throw new Error("invalid scalar: out of range");
      let w, E;
      const k = (I) => et.cached(this, I, (A) => gd(U, A));
      if (x) {
        const { k1neg: I, k1: A, k2neg: $, k2: B } = R(T), { p: N, f: K } = k(A), { p: M, f: C } = k(B);
        E = K.add(C), w = W(x.beta, N, M, I, $);
      } else {
        const { p: I, f: A } = k(T);
        w = I, E = A;
      }
      return gd(U, [w, E])[0];
    }
    /**
     * Non-constant-time multiplication. Uses double-and-add algorithm.
     * It's faster, but should only be used when you don't care about
     * an exposed secret key e.g. sig verification, which works over *public* keys.
     */
    multiplyUnsafe(T) {
      const { endo: x } = t, w = this;
      if (!i.isValid(T))
        throw new Error("invalid scalar: out of range");
      if (T === vn || w.is0())
        return U.ZERO;
      if (T === fi)
        return w;
      if (et.hasCache(this))
        return this.multiply(T);
      if (x) {
        const { k1neg: E, k1: k, k2neg: I, k2: A } = R(T), { p1: $, p2: B } = c0(U, w, k, A);
        return W(x.beta, $, B, E, I);
      } else
        return et.unsafe(w, T);
    }
    /**
     * Converts Projective point to affine (x, y) coordinates.
     * @param invertedZ Z^-1 (inverted zero) - optional, precomputation is useful for invertBatch
     */
    toAffine(T) {
      return j(this, T);
    }
    /**
     * Checks whether Point is free of torsion elements (is in prime subgroup).
     * Always torsion-free for cofactor=1 curves.
     */
    isTorsionFree() {
      const { isTorsionFree: T } = t;
      return o === fi ? !0 : T ? T(U, this) : et.unsafe(this, a).is0();
    }
    clearCofactor() {
      const { clearCofactor: T } = t;
      return o === fi ? this : T ? T(U, this) : this.multiplyUnsafe(o);
    }
    isSmallOrder() {
      return this.multiplyUnsafe(o).is0();
    }
    toBytes(T = !0) {
      return Qo(T, "isCompressed"), this.assertValidity(), p(U, this, T);
    }
    toHex(T = !0) {
      return Qa(this.toBytes(T));
    }
    toString() {
      return `<Point ${this.is0() ? "ZERO" : this.toHex()}>`;
    }
  }
  const Y = i.BITS, et = new a0(U, t.endo ? Math.ceil(Y / 2) : Y);
  return U.BASE.precompute(8), U;
}
function Kg(e) {
  return Uint8Array.of(e ? 2 : 3);
}
function zg(e, t) {
  return {
    secretKey: t.BYTES,
    publicKey: 1 + e.BYTES,
    publicKeyUncompressed: 1 + 2 * e.BYTES,
    publicKeyHasPrefix: !0,
    signature: 2 * t.BYTES
  };
}
function p0(e, t = {}) {
  const { Fn: n } = e, r = t.randomBytes || zs, i = Object.assign(zg(e.Fp, n), { seed: Lg(n.ORDER) });
  function s(p) {
    try {
      const y = n.fromBytes(p);
      return n.isValidNot0(y);
    } catch {
      return !1;
    }
  }
  function o(p, y) {
    const { publicKey: f, publicKeyUncompressed: g } = i;
    try {
      const m = p.length;
      return y === !0 && m !== f || y === !1 && m !== g ? !1 : !!e.fromBytes(p);
    } catch {
      return !1;
    }
  }
  function a(p = r(i.seed)) {
    return _g(rt(p, i.seed, "seed"), n.ORDER);
  }
  function c(p, y = !0) {
    return e.BASE.multiply(n.fromBytes(p)).toBytes(y);
  }
  function u(p) {
    const { secretKey: y, publicKey: f, publicKeyUncompressed: g } = i;
    if (!Vl(p) || "_lengths" in n && n._lengths || y === f)
      return;
    const m = rt(p, void 0, "key").length;
    return m === f || m === g;
  }
  function l(p, y, f = !0) {
    if (u(p) === !0)
      throw new Error("first arg must be private key");
    if (u(y) === !1)
      throw new Error("second arg must be public key");
    const g = n.fromBytes(p);
    return e.fromBytes(y).multiply(g).toBytes(f);
  }
  const d = {
    isValidSecretKey: s,
    isValidPublicKey: o,
    randomSecretKey: a
  }, h = Mg(a, c);
  return Object.freeze({ getPublicKey: c, getSharedSecret: l, keygen: h, Point: e, utils: d, lengths: i });
}
function g0(e, t, n = {}) {
  mg(t), Fl(n, {}, {
    hmac: "function",
    lowS: "boolean",
    randomBytes: "function",
    bits2int: "function",
    bits2int_modN: "function"
  }), n = Object.assign({}, n);
  const r = n.randomBytes || zs, i = n.hmac || ((x, w) => Fg(t, x, w)), { Fp: s, Fn: o } = e, { ORDER: a, BITS: c } = o, { keygen: u, getPublicKey: l, getSharedSecret: d, utils: h, lengths: p } = p0(e, n), y = {
    prehash: !0,
    lowS: typeof n.lowS == "boolean" ? n.lowS : !0,
    format: "compact",
    extraEntropy: !1
  }, f = a * jg < s.ORDER;
  function g(x) {
    const w = a >> fi;
    return x > w;
  }
  function m(x, w) {
    if (!o.isValidNot0(w))
      throw new Error(`invalid signature ${x}: out of range 1..Point.Fn.ORDER`);
    return w;
  }
  function S() {
    if (f)
      throw new Error('"recovered" sig type is not supported for cofactor >2 curves');
  }
  function v(x, w) {
    Nu(w);
    const E = p.signature, k = w === "compact" ? E : w === "recovered" ? E + 1 : void 0;
    return rt(x, k);
  }
  class O {
    r;
    s;
    recovery;
    constructor(w, E, k) {
      if (this.r = m("r", w), this.s = m("s", E), k != null) {
        if (S(), ![0, 1, 2, 3].includes(k))
          throw new Error("invalid recovery id");
        this.recovery = k;
      }
      Object.freeze(this);
    }
    static fromBytes(w, E = y.format) {
      v(w, E);
      let k;
      if (E === "der") {
        const { r: B, s: N } = jn.toSig(rt(w));
        return new O(B, N);
      }
      E === "recovered" && (k = w[0], E = "compact", w = w.subarray(1));
      const I = p.signature / 2, A = w.subarray(0, I), $ = w.subarray(I, I * 2);
      return new O(o.fromBytes(A), o.fromBytes($), k);
    }
    static fromHex(w, E) {
      return this.fromBytes(Xo(w), E);
    }
    assertRecovery() {
      const { recovery: w } = this;
      if (w == null)
        throw new Error("invalid recovery id: must be present");
      return w;
    }
    addRecoveryBit(w) {
      return new O(this.r, this.s, w);
    }
    recoverPublicKey(w) {
      const { r: E, s: k } = this, I = this.assertRecovery(), A = I === 2 || I === 3 ? E + a : E;
      if (!s.isValid(A))
        throw new Error("invalid recovery id: sig.r+curve.n != R.x");
      const $ = s.toBytes(A), B = e.fromBytes(Le(Kg((I & 1) === 0), $)), N = o.inv(A), K = j(rt(w, void 0, "msgHash")), M = o.create(-K * N), C = o.create(k * N), H = e.BASE.multiplyUnsafe(M).add(B.multiplyUnsafe(C));
      if (H.is0())
        throw new Error("invalid recovery: point at infinify");
      return H.assertValidity(), H;
    }
    // Signatures should be low-s, to prevent malleability.
    hasHighS() {
      return g(this.s);
    }
    toBytes(w = y.format) {
      if (Nu(w), w === "der")
        return Xo(jn.hexFromSig(this));
      const { r: E, s: k } = this, I = o.toBytes(E), A = o.toBytes(k);
      return w === "recovered" ? (S(), Le(Uint8Array.of(this.assertRecovery()), I, A)) : Le(I, A);
    }
    toHex(w) {
      return Qa(this.toBytes(w));
    }
  }
  const R = n.bits2int || function(w) {
    if (w.length > 8192)
      throw new Error("input is too large");
    const E = Bn(w), k = w.length * 8 - c;
    return k > 0 ? E >> BigInt(k) : E;
  }, j = n.bits2int_modN || function(w) {
    return o.create(R(w));
  }, b = Hl(c);
  function W(x) {
    return kg("num < 2^" + c, x, vn, b), o.toBytes(x);
  }
  function U(x, w) {
    return rt(x, void 0, "message"), w ? rt(t(x), void 0, "prehashed message") : x;
  }
  function Y(x, w, E) {
    const { lowS: k, prehash: I, extraEntropy: A } = Fc(E, y);
    x = U(x, I);
    const $ = j(x), B = o.fromBytes(w);
    if (!o.isValidNot0(B))
      throw new Error("invalid private key");
    const N = [W(B), W($)];
    if (A != null && A !== !1) {
      const H = A === !0 ? r(p.secretKey) : A;
      N.push(rt(H, void 0, "extraEntropy"));
    }
    const K = Le(...N), M = $;
    function C(H) {
      const q = R(H);
      if (!o.isValidNot0(q))
        return;
      const ot = o.inv(q), F = e.BASE.multiply(q).toAffine(), Z = o.create(F.x);
      if (Z === vn)
        return;
      const Gt = o.create(ot * o.create(M + Z * B));
      if (Gt === vn)
        return;
      let Un = (F.x === Z ? 0 : 2) | Number(F.y & fi), Pn = Gt;
      return k && g(Gt) && (Pn = o.neg(Gt), Un ^= 1), new O(Z, Pn, f ? void 0 : Un);
    }
    return { seed: K, k2sig: C };
  }
  function et(x, w, E = {}) {
    const { seed: k, k2sig: I } = Y(x, w, E);
    return Zb(t.outputLen, o.BYTES, i)(k, I).toBytes(E.format);
  }
  function L(x, w, E, k = {}) {
    const { lowS: I, prehash: A, format: $ } = Fc(k, y);
    if (E = rt(E, void 0, "publicKey"), w = U(w, A), !Vl(x)) {
      const B = x instanceof O ? ", use sig.toBytes()" : "";
      throw new Error("verify expects Uint8Array signature" + B);
    }
    v(x, $);
    try {
      const B = O.fromBytes(x, $), N = e.fromBytes(E);
      if (I && B.hasHighS())
        return !1;
      const { r: K, s: M } = B, C = j(w), H = o.inv(M), q = o.create(C * H), ot = o.create(K * H), F = e.BASE.multiplyUnsafe(q).add(N.multiplyUnsafe(ot));
      return F.is0() ? !1 : o.create(F.x) === K;
    } catch {
      return !1;
    }
  }
  function T(x, w, E = {}) {
    const { prehash: k } = Fc(E, y);
    return w = U(w, k), O.fromBytes(x, "recovered").recoverPublicKey(w).toBytes();
  }
  return Object.freeze({
    keygen: u,
    getPublicKey: l,
    getSharedSecret: d,
    utils: h,
    lengths: p,
    Point: e,
    sign: et,
    verify: L,
    recoverPublicKey: T,
    Signature: O,
    hash: t
  });
}
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const tc = {
  p: BigInt("0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffefffffc2f"),
  n: BigInt("0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141"),
  h: BigInt(1),
  a: BigInt(0),
  b: BigInt(7),
  Gx: BigInt("0x79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798"),
  Gy: BigInt("0x483ada7726a3c4655da4fbfc0e1108a8fd17b448a68554199c47d08ffb10d4b8")
}, y0 = {
  beta: BigInt("0x7ae96a2b657c07106e64479eac3434e99cf0497512f58995c1396c28719501ee"),
  basises: [
    [BigInt("0x3086d221a7d46bcde86c90e49284eb15"), -BigInt("0xe4437ed6010e88286f547fa90abfe4c3")],
    [BigInt("0x114ca50f7a8e2f3f657c1108d9d44cfd8"), BigInt("0x3086d221a7d46bcde86c90e49284eb15")]
  ]
}, w0 = /* @__PURE__ */ BigInt(0), Ru = /* @__PURE__ */ BigInt(2);
function m0(e) {
  const t = tc.p, n = BigInt(3), r = BigInt(6), i = BigInt(11), s = BigInt(22), o = BigInt(23), a = BigInt(44), c = BigInt(88), u = e * e * e % t, l = u * u * e % t, d = we(l, n, t) * l % t, h = we(d, n, t) * l % t, p = we(h, Ru, t) * u % t, y = we(p, i, t) * p % t, f = we(y, s, t) * y % t, g = we(f, a, t) * f % t, m = we(g, c, t) * g % t, S = we(m, a, t) * f % t, v = we(S, n, t) * l % t, O = we(v, o, t) * y % t, R = we(O, r, t) * u % t, j = we(R, Ru, t);
  if (!ta.eql(ta.sqr(j), e))
    throw new Error("Cannot find square root");
  return j;
}
const ta = Ja(tc.p, { sqrt: m0 }), Jr = /* @__PURE__ */ h0(tc, {
  Fp: ta,
  endo: y0
}), tr = /* @__PURE__ */ g0(Jr, Ht), Ed = {};
function ea(e, ...t) {
  let n = Ed[e];
  if (n === void 0) {
    const r = Ht(qb(e));
    n = Le(r, r), Ed[e] = n;
  }
  return Ht(Le(n, ...t));
}
const Kl = (e) => e.toBytes(!0).slice(1), zl = (e) => e % Ru === w0;
function Uu(e) {
  const { Fn: t, BASE: n } = Jr, r = t.fromBytes(e), i = n.multiply(r);
  return { scalar: zl(i.y) ? r : t.neg(r), bytes: Kl(i) };
}
function Wg(e) {
  const t = ta;
  if (!t.isValidNot0(e))
    throw new Error("invalid x: Fail if x ≥ p");
  const n = t.create(e * e), r = t.create(n * e + BigInt(7));
  let i = t.sqrt(r);
  zl(i) || (i = t.neg(i));
  const s = Jr.fromAffine({ x: e, y: i });
  return s.assertValidity(), s;
}
const hs = Bn;
function qg(...e) {
  return Jr.Fn.create(hs(ea("BIP0340/challenge", ...e)));
}
function xd(e) {
  return Uu(e).bytes;
}
function b0(e, t, n = zs(32)) {
  const { Fn: r } = Jr, i = rt(e, void 0, "message"), { bytes: s, scalar: o } = Uu(t), a = rt(n, 32, "auxRand"), c = r.toBytes(o ^ hs(ea("BIP0340/aux", a))), u = ea("BIP0340/nonce", c, s, i), { bytes: l, scalar: d } = Uu(u), h = qg(l, s, i), p = new Uint8Array(64);
  if (p.set(l, 0), p.set(r.toBytes(r.create(d + h * o)), 32), !Gg(p, i, s))
    throw new Error("sign: Invalid signature produced");
  return p;
}
function Gg(e, t, n) {
  const { Fp: r, Fn: i, BASE: s } = Jr, o = rt(e, 64, "signature"), a = rt(t, void 0, "message"), c = rt(n, 32, "publicKey");
  try {
    const u = Wg(hs(c)), l = hs(o.subarray(0, 32));
    if (!r.isValidNot0(l))
      return !1;
    const d = hs(o.subarray(32, 64));
    if (!i.isValidNot0(d))
      return !1;
    const h = qg(i.toBytes(l), Kl(u), a), p = s.multiplyUnsafe(d).add(u.multiplyUnsafe(i.neg(h))), { x: y, y: f } = p.toAffine();
    return !(p.is0() || !zl(f) || y !== l);
  } catch {
    return !1;
  }
}
const Nn = /* @__PURE__ */ (() => {
  const n = (r = zs(48)) => _g(r, tc.n);
  return {
    keygen: Mg(n, xd),
    getPublicKey: xd,
    sign: b0,
    verify: Gg,
    Point: Jr,
    utils: {
      randomSecretKey: n,
      taggedHash: ea,
      lift_x: Wg,
      pointToBytes: Kl
    },
    lengths: {
      secretKey: 32,
      publicKey: 32,
      publicKeyHasPrefix: !1,
      signature: 64,
      seed: 48
    }
  };
})(), E0 = /* @__PURE__ */ Uint8Array.from([
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
]), Yg = Uint8Array.from(new Array(16).fill(0).map((e, t) => t)), x0 = Yg.map((e) => (9 * e + 5) % 16), Zg = /* @__PURE__ */ (() => {
  const n = [[Yg], [x0]];
  for (let r = 0; r < 4; r++)
    for (let i of n)
      i.push(i[r].map((s) => E0[s]));
  return n;
})(), Xg = Zg[0], Qg = Zg[1], Jg = /* @__PURE__ */ [
  [11, 14, 15, 12, 5, 8, 7, 9, 11, 13, 14, 15, 6, 7, 9, 8],
  [12, 13, 11, 15, 6, 9, 9, 7, 12, 15, 11, 13, 7, 8, 7, 7],
  [13, 15, 14, 11, 7, 7, 6, 8, 13, 14, 13, 12, 5, 5, 6, 9],
  [14, 11, 12, 14, 8, 6, 5, 5, 15, 12, 15, 14, 9, 9, 8, 6],
  [15, 12, 13, 13, 9, 5, 8, 6, 14, 11, 12, 11, 8, 6, 5, 5]
].map((e) => Uint8Array.from(e)), T0 = /* @__PURE__ */ Xg.map((e, t) => e.map((n) => Jg[t][n])), S0 = /* @__PURE__ */ Qg.map((e, t) => e.map((n) => Jg[t][n])), v0 = /* @__PURE__ */ Uint32Array.from([
  0,
  1518500249,
  1859775393,
  2400959708,
  2840853838
]), $0 = /* @__PURE__ */ Uint32Array.from([
  1352829926,
  1548603684,
  1836072691,
  2053994217,
  0
]);
function Td(e, t, n, r) {
  return e === 0 ? t ^ n ^ r : e === 1 ? t & n | ~t & r : e === 2 ? (t | ~n) ^ r : e === 3 ? t & r | n & ~r : t ^ (n | ~r);
}
const so = /* @__PURE__ */ new Uint32Array(16);
let k0 = class extends xg {
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
      so[p] = t.getUint32(n, !0);
    let r = this.h0 | 0, i = r, s = this.h1 | 0, o = s, a = this.h2 | 0, c = a, u = this.h3 | 0, l = u, d = this.h4 | 0, h = d;
    for (let p = 0; p < 5; p++) {
      const y = 4 - p, f = v0[p], g = $0[p], m = Xg[p], S = Qg[p], v = T0[p], O = S0[p];
      for (let R = 0; R < 16; R++) {
        const j = no(r + Td(p, s, a, u) + so[m[R]] + f, v[R]) + d | 0;
        r = d, d = u, u = no(a, 10) | 0, a = s, s = j;
      }
      for (let R = 0; R < 16; R++) {
        const j = no(i + Td(y, o, c, l) + so[S[R]] + g, O[R]) + h | 0;
        i = h, h = l, l = no(c, 10) | 0, c = o, o = j;
      }
    }
    this.set(this.h1 + a + l | 0, this.h2 + u + h | 0, this.h3 + d + i | 0, this.h4 + r + o | 0, this.h0 + s + c | 0);
  }
  roundClean() {
    Ti(so);
  }
  destroy() {
    this.destroyed = !0, Ti(this.buffer), this.set(0, 0, 0, 0, 0);
  }
};
const A0 = /* @__PURE__ */ Eg(() => new k0());
/*! scure-base - MIT License (c) 2022 Paul Miller (paulmillr.com) */
function vi(e) {
  return e instanceof Uint8Array || ArrayBuffer.isView(e) && e.constructor.name === "Uint8Array";
}
function ty(e) {
  if (!vi(e))
    throw new Error("Uint8Array expected");
}
function ey(e, t) {
  return Array.isArray(t) ? t.length === 0 ? !0 : e ? t.every((n) => typeof n == "string") : t.every((n) => Number.isSafeInteger(n)) : !1;
}
function Wl(e) {
  if (typeof e != "function")
    throw new Error("function expected");
  return !0;
}
function dr(e, t) {
  if (typeof t != "string")
    throw new Error(`${e}: string expected`);
  return !0;
}
function zi(e) {
  if (!Number.isSafeInteger(e))
    throw new Error(`invalid integer: ${e}`);
}
function na(e) {
  if (!Array.isArray(e))
    throw new Error("array expected");
}
function ra(e, t) {
  if (!ey(!0, t))
    throw new Error(`${e}: array of strings expected`);
}
function ql(e, t) {
  if (!ey(!1, t))
    throw new Error(`${e}: array of numbers expected`);
}
// @__NO_SIDE_EFFECTS__
function qs(...e) {
  const t = (s) => s, n = (s, o) => (a) => s(o(a)), r = e.map((s) => s.encode).reduceRight(n, t), i = e.map((s) => s.decode).reduce(n, t);
  return { encode: r, decode: i };
}
// @__NO_SIDE_EFFECTS__
function ec(e) {
  const t = typeof e == "string" ? e.split("") : e, n = t.length;
  ra("alphabet", t);
  const r = new Map(t.map((i, s) => [i, s]));
  return {
    encode: (i) => (na(i), i.map((s) => {
      if (!Number.isSafeInteger(s) || s < 0 || s >= n)
        throw new Error(`alphabet.encode: digit index outside alphabet "${s}". Allowed: ${e}`);
      return t[s];
    })),
    decode: (i) => (na(i), i.map((s) => {
      dr("alphabet.decode", s);
      const o = r.get(s);
      if (o === void 0)
        throw new Error(`Unknown letter: "${s}". Allowed: ${e}`);
      return o;
    }))
  };
}
// @__NO_SIDE_EFFECTS__
function nc(e = "") {
  return dr("join", e), {
    encode: (t) => (ra("join.decode", t), t.join(e)),
    decode: (t) => (dr("join.decode", t), t.split(e))
  };
}
// @__NO_SIDE_EFFECTS__
function I0(e, t = "=") {
  return zi(e), dr("padding", t), {
    encode(n) {
      for (ra("padding.encode", n); n.length * e % 8; )
        n.push(t);
      return n;
    },
    decode(n) {
      ra("padding.decode", n);
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
function O0(e) {
  return Wl(e), { encode: (t) => t, decode: (t) => e(t) };
}
function Sd(e, t, n) {
  if (t < 2)
    throw new Error(`convertRadix: invalid from=${t}, base cannot be less than 2`);
  if (n < 2)
    throw new Error(`convertRadix: invalid to=${n}, base cannot be less than 2`);
  if (na(e), !e.length)
    return [];
  let r = 0;
  const i = [], s = Array.from(e, (a) => {
    if (zi(a), a < 0 || a >= t)
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
const ny = (e, t) => t === 0 ? e : ny(t, e % t), ia = /* @__NO_SIDE_EFFECTS__ */ (e, t) => e + (t - ny(e, t)), Ao = /* @__PURE__ */ (() => {
  let e = [];
  for (let t = 0; t < 40; t++)
    e.push(2 ** t);
  return e;
})();
function Pu(e, t, n, r) {
  if (na(e), t <= 0 || t > 32)
    throw new Error(`convertRadix2: wrong from=${t}`);
  if (n <= 0 || n > 32)
    throw new Error(`convertRadix2: wrong to=${n}`);
  if (/* @__PURE__ */ ia(t, n) > 32)
    throw new Error(`convertRadix2: carry overflow from=${t} to=${n} carryBits=${/* @__PURE__ */ ia(t, n)}`);
  let i = 0, s = 0;
  const o = Ao[t], a = Ao[n] - 1, c = [];
  for (const u of e) {
    if (zi(u), u >= o)
      throw new Error(`convertRadix2: invalid data word=${u} from=${t}`);
    if (i = i << t | u, s + t > 32)
      throw new Error(`convertRadix2: carry overflow pos=${s} from=${t}`);
    for (s += t; s >= n; s -= n)
      c.push((i >> s - n & a) >>> 0);
    const l = Ao[s];
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
function B0(e) {
  zi(e);
  const t = 2 ** 8;
  return {
    encode: (n) => {
      if (!vi(n))
        throw new Error("radix.encode input should be Uint8Array");
      return Sd(Array.from(n), t, e);
    },
    decode: (n) => (ql("radix.decode", n), Uint8Array.from(Sd(n, e, t)))
  };
}
// @__NO_SIDE_EFFECTS__
function Gl(e, t = !1) {
  if (zi(e), e <= 0 || e > 32)
    throw new Error("radix2: bits should be in (0..32]");
  if (/* @__PURE__ */ ia(8, e) > 32 || /* @__PURE__ */ ia(e, 8) > 32)
    throw new Error("radix2: carry overflow");
  return {
    encode: (n) => {
      if (!vi(n))
        throw new Error("radix2.encode input should be Uint8Array");
      return Pu(Array.from(n), 8, e, !t);
    },
    decode: (n) => (ql("radix2.decode", n), Uint8Array.from(Pu(n, e, 8, t)))
  };
}
function vd(e) {
  return Wl(e), function(...t) {
    try {
      return e.apply(null, t);
    } catch {
    }
  };
}
function N0(e, t) {
  return zi(e), Wl(t), {
    encode(n) {
      if (!vi(n))
        throw new Error("checksum.encode: input should be Uint8Array");
      const r = t(n).slice(0, e), i = new Uint8Array(n.length + e);
      return i.set(n), i.set(r, n.length), i;
    },
    decode(n) {
      if (!vi(n))
        throw new Error("checksum.decode: input should be Uint8Array");
      const r = n.slice(0, -e), i = n.slice(-e), s = t(r).slice(0, e);
      for (let o = 0; o < e; o++)
        if (s[o] !== i[o])
          throw new Error("Invalid checksum");
      return r;
    }
  };
}
const R0 = typeof Uint8Array.from([]).toBase64 == "function" && typeof Uint8Array.fromBase64 == "function", U0 = (e, t) => {
  dr("base64", e);
  const n = /^[A-Za-z0-9=+/]+$/, r = "base64";
  if (e.length > 0 && !n.test(e))
    throw new Error("invalid base64");
  return Uint8Array.fromBase64(e, { alphabet: r, lastChunkHandling: "strict" });
}, Vt = R0 ? {
  encode(e) {
    return ty(e), e.toBase64();
  },
  decode(e) {
    return U0(e);
  }
} : /* @__PURE__ */ qs(/* @__PURE__ */ Gl(6), /* @__PURE__ */ ec("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"), /* @__PURE__ */ I0(6), /* @__PURE__ */ nc("")), P0 = /* @__NO_SIDE_EFFECTS__ */ (e) => /* @__PURE__ */ qs(/* @__PURE__ */ B0(58), /* @__PURE__ */ ec(e), /* @__PURE__ */ nc("")), Cu = /* @__PURE__ */ P0("123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"), C0 = (e) => /* @__PURE__ */ qs(N0(4, (t) => e(e(t))), Cu), Lu = /* @__PURE__ */ qs(/* @__PURE__ */ ec("qpzry9x8gf2tvdw0s3jn54khce6mua7l"), /* @__PURE__ */ nc("")), $d = [996825010, 642813549, 513874426, 1027748829, 705979059];
function Zi(e) {
  const t = e >> 25;
  let n = (e & 33554431) << 5;
  for (let r = 0; r < $d.length; r++)
    (t >> r & 1) === 1 && (n ^= $d[r]);
  return n;
}
function kd(e, t, n = 1) {
  const r = e.length;
  let i = 1;
  for (let s = 0; s < r; s++) {
    const o = e.charCodeAt(s);
    if (o < 33 || o > 126)
      throw new Error(`Invalid prefix (${e})`);
    i = Zi(i) ^ o >> 5;
  }
  i = Zi(i);
  for (let s = 0; s < r; s++)
    i = Zi(i) ^ e.charCodeAt(s) & 31;
  for (let s of t)
    i = Zi(i) ^ s;
  for (let s = 0; s < 6; s++)
    i = Zi(i);
  return i ^= n, Lu.encode(Pu([i % Ao[30]], 30, 5, !1));
}
// @__NO_SIDE_EFFECTS__
function ry(e) {
  const t = e === "bech32" ? 1 : 734539939, n = /* @__PURE__ */ Gl(5), r = n.decode, i = n.encode, s = vd(r);
  function o(d, h, p = 90) {
    dr("bech32.encode prefix", d), vi(h) && (h = Array.from(h)), ql("bech32.encode", h);
    const y = d.length;
    if (y === 0)
      throw new TypeError(`Invalid prefix length ${y}`);
    const f = y + 7 + h.length;
    if (p !== !1 && f > p)
      throw new TypeError(`Length ${f} exceeds limit ${p}`);
    const g = d.toLowerCase(), m = kd(g, h, t);
    return `${g}1${Lu.encode(h)}${m}`;
  }
  function a(d, h = 90) {
    dr("bech32.decode input", d);
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
    const S = Lu.decode(m).slice(0, -6), v = kd(g, S, t);
    if (!m.endsWith(v))
      throw new Error(`Invalid checksum in ${d}: expected "${v}"`);
    return { prefix: g, words: S };
  }
  const c = vd(a);
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
const _u = /* @__PURE__ */ ry("bech32"), ri = /* @__PURE__ */ ry("bech32m"), L0 = {
  encode: (e) => new TextDecoder().decode(e),
  decode: (e) => new TextEncoder().encode(e)
}, _0 = typeof Uint8Array.from([]).toHex == "function" && typeof Uint8Array.fromHex == "function", D0 = {
  encode(e) {
    return ty(e), e.toHex();
  },
  decode(e) {
    return dr("hex", e), Uint8Array.fromHex(e);
  }
}, P = _0 ? D0 : /* @__PURE__ */ qs(/* @__PURE__ */ Gl(4), /* @__PURE__ */ ec("0123456789abcdef"), /* @__PURE__ */ nc(""), /* @__PURE__ */ O0((e) => {
  if (typeof e != "string" || e.length % 2 !== 0)
    throw new TypeError(`hex.decode: expected string, got ${typeof e} with length ${e.length}`);
  return e.toLowerCase();
})), bt = /* @__PURE__ */ Uint8Array.of(), iy = /* @__PURE__ */ Uint8Array.of(0);
function $i(e, t) {
  if (e.length !== t.length)
    return !1;
  for (let n = 0; n < e.length; n++)
    if (e[n] !== t[n])
      return !1;
  return !0;
}
function Te(e) {
  return e instanceof Uint8Array || ArrayBuffer.isView(e) && e.constructor.name === "Uint8Array";
}
function V0(...e) {
  let t = 0;
  for (let r = 0; r < e.length; r++) {
    const i = e[r];
    if (!Te(i))
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
const sy = (e) => new DataView(e.buffer, e.byteOffset, e.byteLength);
function Gs(e) {
  return Object.prototype.toString.call(e) === "[object Object]";
}
function cn(e) {
  return Number.isSafeInteger(e);
}
const Yl = {
  equalBytes: $i,
  isBytes: Te,
  concatBytes: V0
}, oy = (e) => {
  if (e !== null && typeof e != "string" && !Ve(e) && !Te(e) && !cn(e))
    throw new Error(`lengthCoder: expected null | number | Uint8Array | CoderType, got ${e} (${typeof e})`);
  return {
    encodeStream(t, n) {
      if (e === null)
        return;
      if (Ve(e))
        return e.encodeStream(t, n);
      let r;
      if (typeof e == "number" ? r = e : typeof e == "string" && (r = In.resolve(t.stack, e)), typeof r == "bigint" && (r = Number(r)), r === void 0 || r !== n)
        throw t.err(`Wrong length: ${r} len=${e} exp=${n} (${typeof n})`);
    },
    decodeStream(t) {
      let n;
      if (Ve(e) ? n = Number(e.decodeStream(t)) : typeof e == "number" ? n = e : typeof e == "string" && (n = In.resolve(t.stack, e)), typeof n == "bigint" && (n = Number(n)), typeof n != "number")
        throw t.err(`Wrong length: ${n}`);
      return n;
    }
  };
}, Rt = {
  BITS: 32,
  FULL_MASK: -1 >>> 0,
  // 1<<32 will overflow
  len: (e) => Math.ceil(e / 32),
  create: (e) => new Uint32Array(Rt.len(e)),
  clean: (e) => e.fill(0),
  debug: (e) => Array.from(e).map((t) => (t >>> 0).toString(2).padStart(32, "0")),
  checkLen: (e, t) => {
    if (Rt.len(t) !== e.length)
      throw new Error(`wrong length=${e.length}. Expected: ${Rt.len(t)}`);
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
    Rt.checkLen(e, t);
    const { FULL_MASK: r, BITS: i } = Rt, s = i - t % i, o = s ? r >>> s << s : r, a = [];
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
  rangeDebug: (e, t, n = !1) => `[${Rt.range(Rt.indices(e, t, n)).map((r) => `(${r.pos}/${r.length})`).join(", ")}]`,
  setRange: (e, t, n, r, i = !0) => {
    Rt.chunkLen(t, n, r);
    const { FULL_MASK: s, BITS: o } = Rt, a = n % o ? Math.floor(n / o) : void 0, c = n + r, u = c % o ? Math.floor(c / o) : void 0;
    if (a !== void 0 && a === u)
      return Rt.set(e, a, s >>> o - r << o - r - n, i);
    if (a !== void 0 && !Rt.set(e, a, s >>> n % o, i))
      return !1;
    const l = a !== void 0 ? a + 1 : n / o, d = u !== void 0 ? u : c / o;
    for (let h = l; h < d; h++)
      if (!Rt.set(e, h, s, i))
        return !1;
    return !(u !== void 0 && a !== u && !Rt.set(e, u, s << o - c % o, i));
  }
}, In = {
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
    const r = new Error(`${e}(${In.path(t)}): ${typeof n == "string" ? n : n.message}`);
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
let M0 = class ay {
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
    this.data = t, this.opts = n, this.stack = r, this.parent = i, this.parentOffset = s, this.view = sy(t);
  }
  /** Internal method for pointers. */
  _enablePointers() {
    if (this.parent)
      return this.parent._enablePointers();
    this.bs || (this.bs = Rt.create(this.data.length), Rt.setRange(this.bs, this.data.length, 0, this.pos, this.opts.allowMultipleReads));
  }
  markBytesBS(t, n) {
    return this.parent ? this.parent.markBytesBS(this.parentOffset + t, n) : !n || !this.bs ? !0 : Rt.setRange(this.bs, this.data.length, t, n, !1);
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
    return In.pushObj(this.stack, t, n);
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
        throw this.err(`${this.bitPos} bits left after unpack: ${P.encode(this.data.slice(this.pos))}`);
      if (this.bs && !this.parent) {
        const t = Rt.indices(this.bs, this.data.length, !0);
        if (t.length) {
          const n = Rt.range(t).map(({ pos: r, length: i }) => `(${r}/${i})[${P.encode(this.data.subarray(r, r + i))}]`).join(", ");
          throw this.err(`unread byte ranges: ${n} (total=${this.data.length})`);
        } else
          return;
      }
      if (!this.isEnd())
        throw this.err(`${this.leftBytes} bytes ${this.bitPos} bits left after unpack: ${P.encode(this.data.slice(this.pos))}`);
    }
  }
  // User methods
  err(t) {
    return In.err("Reader", this.stack, t);
  }
  offsetReader(t) {
    if (t > this.data.length)
      throw this.err("offsetReader: Unexpected end of buffer");
    return new ay(this.absBytes(t), this.opts, this.stack, this, t);
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
    if (!Te(t))
      throw this.err(`find: needle is not bytes! ${t}`);
    if (this.bitPos)
      throw this.err("findByte: bitPos not empty");
    if (!t.length)
      throw this.err("find: needle is empty");
    for (let r = n; (r = this.data.indexOf(t[0], r)) !== -1; r++) {
      if (r === -1 || this.data.length - r < t.length)
        return;
      if ($i(t, this.data.subarray(r, r + t.length)))
        return r;
    }
  }
}, H0 = class {
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
    this.stack = t, this.view = sy(this.viewBuf);
  }
  pushObj(t, n) {
    return In.pushObj(this.stack, t, n);
  }
  writeView(t, n) {
    if (this.finished)
      throw this.err("buffer: finished");
    if (!cn(t) || t > 8)
      throw new Error(`wrong writeView length=${t}`);
    n(this.view), this.bytes(this.viewBuf.slice(0, t)), this.viewBuf.fill(0);
  }
  // User methods
  err(t) {
    if (this.finished)
      throw this.err("buffer: finished");
    return In.err("Reader", this.stack, t);
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
};
const Du = (e) => Uint8Array.from(e).reverse();
function F0(e, t, n) {
  if (n) {
    const r = 2n ** (t - 1n);
    if (e < -r || e >= r)
      throw new Error(`value out of signed bounds. Expected ${-r} <= ${e} < ${r}`);
  } else if (0n > e || e >= 2n ** t)
    throw new Error(`value out of unsigned bounds. Expected 0 <= ${e} < ${2n ** t}`);
}
function cy(e) {
  return {
    // NOTE: we cannot export validate here, since it is likely mistake.
    encodeStream: e.encodeStream,
    decodeStream: e.decodeStream,
    size: e.size,
    encode: (t) => {
      const n = new H0();
      return e.encodeStream(n, t), n.finish();
    },
    decode: (t, n = {}) => {
      const r = new M0(t, n), i = e.decodeStream(r);
      return r.finish(), i;
    }
  };
}
function ne(e, t) {
  if (!Ve(e))
    throw new Error(`validate: invalid inner value ${e}`);
  if (typeof t != "function")
    throw new Error("validate: fn should be function");
  return cy({
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
const re = (e) => {
  const t = cy(e);
  return e.validate ? ne(t, e.validate) : t;
}, rc = (e) => Gs(e) && typeof e.decode == "function" && typeof e.encode == "function";
function Ve(e) {
  return Gs(e) && rc(e) && typeof e.encodeStream == "function" && typeof e.decodeStream == "function" && (e.size === void 0 || cn(e.size));
}
function j0() {
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
      if (!Gs(e))
        throw new Error(`expected plain object, got ${e}`);
      return Object.entries(e);
    }
  };
}
const K0 = {
  encode: (e) => {
    if (typeof e != "bigint")
      throw new Error(`expected bigint, got ${typeof e}`);
    if (e > BigInt(Number.MAX_SAFE_INTEGER))
      throw new Error(`element bigger than MAX_SAFE_INTEGER=${e}`);
    return Number(e);
  },
  decode: (e) => {
    if (!cn(e))
      throw new Error("element is not a safe integer");
    return BigInt(e);
  }
};
function z0(e) {
  if (!Gs(e))
    throw new Error("plain object expected");
  return {
    encode: (t) => {
      if (!cn(t) || !(t in e))
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
function W0(e, t = !1) {
  if (!cn(e))
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
function q0(e) {
  if (!Array.isArray(e))
    throw new Error(`expected array, got ${typeof e}`);
  for (const t of e)
    if (!rc(t))
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
const uy = (e) => {
  if (!rc(e))
    throw new Error("BaseCoder expected");
  return { encode: e.decode, decode: e.encode };
}, ic = { dict: j0, numberBigint: K0, tsEnum: z0, decimal: W0, match: q0, reverse: uy }, Zl = (e, t = !1, n = !1, r = !0) => {
  if (!cn(e))
    throw new Error(`bigint/size: wrong value ${e}`);
  if (typeof t != "boolean")
    throw new Error(`bigint/le: expected boolean, got ${typeof t}`);
  if (typeof n != "boolean")
    throw new Error(`bigint/signed: expected boolean, got ${typeof n}`);
  if (typeof r != "boolean")
    throw new Error(`bigint/sized: expected boolean, got ${typeof r}`);
  const i = BigInt(e), s = 2n ** (8n * i - 1n);
  return re({
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
      const a = o.bytes(r ? e : Math.min(e, o.leftBytes)), c = t ? a : Du(a);
      let u = 0n;
      for (let l = 0; l < c.length; l++)
        u |= BigInt(c[l]) << 8n * BigInt(l);
      return n && u & s && (u = (u ^ s) - s), u;
    },
    validate: (o) => {
      if (typeof o != "bigint")
        throw new Error(`bigint: invalid value: ${o}`);
      return F0(o, 8n * i, !!n), o;
    }
  });
}, ly = /* @__PURE__ */ Zl(32, !1), Io = /* @__PURE__ */ Zl(8, !0), G0 = /* @__PURE__ */ Zl(8, !0, !0), Y0 = (e, t) => re({
  size: e,
  encodeStream: (n, r) => n.writeView(e, (i) => t.write(i, r)),
  decodeStream: (n) => n.readView(e, t.read),
  validate: (n) => {
    if (typeof n != "number")
      throw new Error(`viewCoder: expected number, got ${typeof n}`);
    return t.validate && t.validate(n), n;
  }
}), Ys = (e, t, n) => {
  const r = e * 8, i = 2 ** (r - 1), s = (c) => {
    if (!cn(c))
      throw new Error(`sintView: value is not safe integer: ${c}`);
    if (c < -i || c >= i)
      throw new Error(`sintView: value out of bounds. Expected ${-i} <= ${c} < ${i}`);
  }, o = 2 ** r, a = (c) => {
    if (!cn(c))
      throw new Error(`uintView: value is not safe integer: ${c}`);
    if (0 > c || c >= o)
      throw new Error(`uintView: value out of bounds. Expected 0 <= ${c} < ${o}`);
  };
  return Y0(e, {
    write: n.write,
    read: n.read,
    validate: t ? s : a
  });
}, ct = /* @__PURE__ */ Ys(4, !1, {
  read: (e, t) => e.getUint32(t, !0),
  write: (e, t) => e.setUint32(0, t, !0)
}), Z0 = /* @__PURE__ */ Ys(4, !1, {
  read: (e, t) => e.getUint32(t, !1),
  write: (e, t) => e.setUint32(0, t, !1)
}), ii = /* @__PURE__ */ Ys(4, !0, {
  read: (e, t) => e.getInt32(t, !0),
  write: (e, t) => e.setInt32(0, t, !0)
}), Ad = /* @__PURE__ */ Ys(2, !1, {
  read: (e, t) => e.getUint16(t, !0),
  write: (e, t) => e.setUint16(0, t, !0)
}), rr = /* @__PURE__ */ Ys(1, !1, {
  read: (e, t) => e.getUint8(t),
  write: (e, t) => e.setUint8(0, t)
}), wt = (e, t = !1) => {
  if (typeof t != "boolean")
    throw new Error(`bytes/le: expected boolean, got ${typeof t}`);
  const n = oy(e), r = Te(e);
  return re({
    size: typeof e == "number" ? e : void 0,
    encodeStream: (i, s) => {
      r || n.encodeStream(i, s.length), i.bytes(t ? Du(s) : s), r && i.bytes(e);
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
      return t ? Du(s) : s;
    },
    validate: (i) => {
      if (!Te(i))
        throw new Error(`bytes: invalid value ${i}`);
      return i;
    }
  });
};
function X0(e, t) {
  if (!Ve(t))
    throw new Error(`prefix: invalid inner value ${t}`);
  return hr(wt(e), uy(t));
}
const Xl = (e, t = !1) => ne(hr(wt(e, t), L0), (n) => {
  if (typeof n != "string")
    throw new Error(`expected string, got ${typeof n}`);
  return n;
}), Q0 = (e, t = { isLE: !1, with0x: !1 }) => {
  let n = hr(wt(e, t.isLE), P);
  const r = t.with0x;
  if (typeof r != "boolean")
    throw new Error(`hex/with0x: expected boolean, got ${typeof r}`);
  return r && (n = hr(n, {
    encode: (i) => `0x${i}`,
    decode: (i) => {
      if (!i.startsWith("0x"))
        throw new Error("hex(with0x=true).encode input should start with 0x");
      return i.slice(2);
    }
  })), n;
};
function hr(e, t) {
  if (!Ve(e))
    throw new Error(`apply: invalid inner value ${e}`);
  if (!rc(t))
    throw new Error(`apply: invalid base value ${e}`);
  return re({
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
const J0 = (e, t = !1) => {
  if (!Te(e))
    throw new Error(`flag/flagValue: expected Uint8Array, got ${typeof e}`);
  if (typeof t != "boolean")
    throw new Error(`flag/xor: expected boolean, got ${typeof t}`);
  return re({
    size: e.length,
    encodeStream: (n, r) => {
      !!r !== t && n.bytes(e);
    },
    decodeStream: (n) => {
      let r = n.leftBytes >= e.length;
      return r && (r = $i(n.bytes(e.length, !0), e), r && n.bytes(e.length)), r !== t;
    },
    validate: (n) => {
      if (n !== void 0 && typeof n != "boolean")
        throw new Error(`flag: expected boolean value or undefined, got ${typeof n}`);
      return n;
    }
  });
};
function tE(e, t, n) {
  if (!Ve(t))
    throw new Error(`flagged: invalid inner value ${t}`);
  return re({
    encodeStream: (r, i) => {
      In.resolve(r.stack, e) && t.encodeStream(r, i);
    },
    decodeStream: (r) => {
      let i = !1;
      if (i = !!In.resolve(r.stack, e), i)
        return t.decodeStream(r);
    }
  });
}
function Ql(e, t, n = !0) {
  if (!Ve(e))
    throw new Error(`magic: invalid inner value ${e}`);
  if (typeof n != "boolean")
    throw new Error(`magic: expected boolean, got ${typeof n}`);
  return re({
    size: e.size,
    encodeStream: (r, i) => e.encodeStream(r, t),
    decodeStream: (r) => {
      const i = e.decodeStream(r);
      if (n && typeof i != "object" && i !== t || Te(t) && !$i(t, i))
        throw r.err(`magic: invalid value: ${i} !== ${t}`);
    },
    validate: (r) => {
      if (r !== void 0)
        throw new Error(`magic: wrong value=${typeof r}`);
      return r;
    }
  });
}
function fy(e) {
  let t = 0;
  for (const n of e) {
    if (n.size === void 0)
      return;
    if (!cn(n.size))
      throw new Error(`sizeof: wrong element size=${t}`);
    t += n.size;
  }
  return t;
}
function _t(e) {
  if (!Gs(e))
    throw new Error(`struct: expected plain object, got ${e}`);
  for (const t in e)
    if (!Ve(e[t]))
      throw new Error(`struct: field ${t} is not CoderType`);
  return re({
    size: fy(Object.values(e)),
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
function eE(e) {
  if (!Array.isArray(e))
    throw new Error(`Packed.Tuple: got ${typeof e} instead of array`);
  for (let t = 0; t < e.length; t++)
    if (!Ve(e[t]))
      throw new Error(`tuple: field ${t} is not CoderType`);
  return re({
    size: fy(e),
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
function te(e, t) {
  if (!Ve(t))
    throw new Error(`array: invalid inner value ${t}`);
  const n = oy(typeof e == "string" ? `../${e}` : e);
  return re({
    size: typeof e == "number" && t.size ? e * t.size : void 0,
    encodeStream: (r, i) => {
      const s = r;
      s.pushObj(i, (o) => {
        Te(e) || n.encodeStream(r, i.length);
        for (let a = 0; a < i.length; a++)
          o(`${a}`, () => {
            const c = i[a], u = r.pos;
            if (t.encodeStream(r, c), Te(e)) {
              if (e.length > s.pos - u)
                return;
              const l = s.finish(!1).subarray(u, s.pos);
              if ($i(l.subarray(0, e.length), e))
                throw s.err(`array: inner element encoding same as separator. elm=${c} data=${l}`);
            }
          });
      }), Te(e) && r.bytes(e);
    },
    decodeStream: (r) => {
      const i = [];
      return r.pushObj(i, (s) => {
        if (e === null)
          for (let o = 0; !r.isEnd() && (s(`${o}`, () => i.push(t.decodeStream(r))), !(t.size && r.leftBytes < t.size)); o++)
            ;
        else if (Te(e))
          for (let o = 0; ; o++) {
            if ($i(r.bytes(e.length, !0), e)) {
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
const Wi = tr.Point, Id = Wi.Fn, dy = Wi.Fn.ORDER, Zs = (e) => e % 2n === 0n, ht = Yl.isBytes, Qn = Yl.concatBytes, St = Yl.equalBytes, hy = (e) => A0(Ht(e)), _n = (...e) => Ht(Ht(Qn(...e))), Vu = Nn.utils.randomSecretKey, Jl = Nn.getPublicKey, py = tr.getPublicKey, Od = (e) => e.r < dy / 2n;
function nE(e, t, n = !1) {
  let r = tr.Signature.fromBytes(tr.sign(e, t, { prehash: !1 }));
  if (n && !Od(r)) {
    const i = new Uint8Array(32);
    let s = 0;
    for (; !Od(r); )
      if (i.set(ct.encode(s++)), r = tr.Signature.fromBytes(tr.sign(e, t, { prehash: !1, extraEntropy: i })), s > 4294967295)
        throw new Error("lowR counter overflow: report the error");
  }
  return r.toBytes("der");
}
const Bd = Nn.sign, tf = Nn.utils.taggedHash, ue = {
  ecdsa: 0,
  schnorr: 1
};
function ki(e, t) {
  const n = e.length;
  if (t === ue.ecdsa) {
    if (n === 32)
      throw new Error("Expected non-Schnorr key");
    return Wi.fromBytes(e), e;
  } else if (t === ue.schnorr) {
    if (n !== 32)
      throw new Error("Expected 32-byte Schnorr key");
    return Nn.utils.lift_x(Bn(e)), e;
  } else
    throw new Error("Unknown key type");
}
function gy(e, t) {
  const r = Nn.utils.taggedHash("TapTweak", e, t), i = Bn(r);
  if (i >= dy)
    throw new Error("tweak higher than curve order");
  return i;
}
function rE(e, t = Uint8Array.of()) {
  const n = Nn.utils, r = Bn(e), i = Wi.BASE.multiply(r), s = Zs(i.y) ? r : Id.neg(r), o = n.pointToBytes(i), a = gy(o, t);
  return Ws(Id.add(s, a), 32);
}
function Mu(e, t) {
  const n = Nn.utils, r = gy(e, t), s = n.lift_x(Bn(e)).add(Wi.BASE.multiply(r)), o = Zs(s.y) ? 0 : 1;
  return [n.pointToBytes(s), o];
}
const ef = Ht(Wi.BASE.toBytes(!1)), Ai = {
  bech32: "bc",
  pubKeyHash: 0,
  scriptHash: 5,
  wif: 128
}, oo = {
  bech32: "tb",
  pubKeyHash: 111,
  scriptHash: 196,
  wif: 239
};
function sa(e, t) {
  if (!ht(e) || !ht(t))
    throw new Error(`cmp: wrong type a=${typeof e} b=${typeof t}`);
  const n = Math.min(e.length, t.length);
  for (let r = 0; r < n; r++)
    if (e[r] != t[r])
      return Math.sign(e[r] - t[r]);
  return Math.sign(e.length - t.length);
}
function yy(e) {
  const t = {};
  for (const n in e) {
    if (t[e[n]] !== void 0)
      throw new Error("duplicate key");
    t[e[n]] = n;
  }
  return t;
}
const Bt = {
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
}, iE = yy(Bt);
function nf(e = 6, t = !1) {
  return re({
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
function sE(e, t = 4, n = !0) {
  if (typeof e == "number")
    return e;
  if (ht(e))
    try {
      const r = nf(t, n).decode(e);
      return r > Number.MAX_SAFE_INTEGER ? void 0 : Number(r);
    } catch {
      return;
    }
}
const J = re({
  encodeStream: (e, t) => {
    for (let n of t) {
      if (typeof n == "string") {
        if (Bt[n] === void 0)
          throw new Error(`Unknown opcode=${n}`);
        e.byte(Bt[n]);
        continue;
      } else if (typeof n == "number") {
        if (n === 0) {
          e.byte(0);
          continue;
        } else if (1 <= n && n <= 16) {
          e.byte(Bt.OP_1 - 1 + n);
          continue;
        }
      }
      if (typeof n == "number" && (n = nf().encode(BigInt(n))), !ht(n))
        throw new Error(`Wrong Script OP=${n} (${typeof n})`);
      const r = n.length;
      r < Bt.PUSHDATA1 ? e.byte(r) : r <= 255 ? (e.byte(Bt.PUSHDATA1), e.byte(r)) : r <= 65535 ? (e.byte(Bt.PUSHDATA2), e.bytes(Ad.encode(r))) : (e.byte(Bt.PUSHDATA4), e.bytes(ct.encode(r))), e.bytes(n);
    }
  },
  decodeStream: (e) => {
    const t = [];
    for (; !e.isEnd(); ) {
      const n = e.byte();
      if (Bt.OP_0 < n && n <= Bt.PUSHDATA4) {
        let r;
        if (n < Bt.PUSHDATA1)
          r = n;
        else if (n === Bt.PUSHDATA1)
          r = rr.decodeStream(e);
        else if (n === Bt.PUSHDATA2)
          r = Ad.decodeStream(e);
        else if (n === Bt.PUSHDATA4)
          r = ct.decodeStream(e);
        else
          throw new Error("Should be not possible");
        t.push(e.bytes(r));
      } else if (n === 0)
        t.push(0);
      else if (Bt.OP_1 <= n && n <= Bt.OP_16)
        t.push(n - (Bt.OP_1 - 1));
      else {
        const r = iE[n];
        if (r === void 0)
          throw new Error(`Unknown opcode=${n.toString(16)}`);
        t.push(r);
      }
    }
    return t;
  }
}), Nd = {
  253: [253, 2, 253n, 65535n],
  254: [254, 4, 65536n, 4294967295n],
  255: [255, 8, 4294967296n, 18446744073709551615n]
}, sc = re({
  encodeStream: (e, t) => {
    if (typeof t == "number" && (t = BigInt(t)), 0n <= t && t <= 252n)
      return e.byte(Number(t));
    for (const [n, r, i, s] of Object.values(Nd))
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
    const [n, r, i] = Nd[t];
    let s = 0n;
    for (let o = 0; o < r; o++)
      s |= BigInt(e.byte()) << 8n * BigInt(o);
    if (s < i)
      throw e.err(`Wrong CompactSize(${8 * r})`);
    return s;
  }
}), Me = hr(sc, ic.numberBigint), Re = wt(sc), Rs = te(Me, Re), oa = (e) => te(sc, e), wy = _t({
  txid: wt(32, !0),
  // hash(prev_tx),
  index: ct,
  // output number of previous tx
  finalScriptSig: Re,
  // btc merges input and output script, executes it. If ok = tx passes
  sequence: ct
  // ?
}), Cr = _t({ amount: Io, script: Re }), oE = _t({
  version: ii,
  segwitFlag: J0(new Uint8Array([0, 1])),
  inputs: oa(wy),
  outputs: oa(Cr),
  witnesses: tE("segwitFlag", te("inputs/length", Rs)),
  // < 500000000	Block number at which this transaction is unlocked
  // >= 500000000	UNIX timestamp at which this transaction is unlocked
  // Handled as part of PSBTv2
  lockTime: ct
});
function aE(e) {
  if (e.segwitFlag && e.witnesses && !e.witnesses.length)
    throw new Error("Segwit flag with empty witnesses array");
  return e;
}
const di = ne(oE, aE), fs = _t({
  version: ii,
  inputs: oa(wy),
  outputs: oa(Cr),
  lockTime: ct
}), Hu = ne(wt(null), (e) => ki(e, ue.ecdsa)), aa = ne(wt(32), (e) => ki(e, ue.schnorr)), Rd = ne(wt(null), (e) => {
  if (e.length !== 64 && e.length !== 65)
    throw new Error("Schnorr signature should be 64 or 65 bytes long");
  return e;
}), oc = _t({
  fingerprint: Z0,
  path: te(null, ct)
}), my = _t({
  hashes: te(Me, wt(32)),
  der: oc
}), cE = wt(78), uE = _t({ pubKey: aa, leafHash: wt(32) }), lE = _t({
  version: rr,
  // With parity :(
  internalKey: wt(32),
  merklePath: te(null, wt(32))
}), nn = ne(lE, (e) => {
  if (e.merklePath.length > 128)
    throw new Error("TaprootControlBlock: merklePath should be of length 0..128 (inclusive)");
  return e;
}), fE = te(null, _t({
  depth: rr,
  version: rr,
  script: Re
})), xt = wt(null), Ud = wt(20), Xi = wt(32), rf = {
  unsignedTx: [0, !1, fs, [0], [0], !1],
  xpub: [1, cE, oc, [], [0, 2], !1],
  txVersion: [2, !1, ct, [2], [2], !1],
  fallbackLocktime: [3, !1, ct, [], [2], !1],
  inputCount: [4, !1, Me, [2], [2], !1],
  outputCount: [5, !1, Me, [2], [2], !1],
  txModifiable: [6, !1, rr, [], [2], !1],
  // TODO: bitfield
  version: [251, !1, ct, [], [0, 2], !1],
  proprietary: [252, xt, xt, [], [0, 2], !1]
}, ac = {
  nonWitnessUtxo: [0, !1, di, [], [0, 2], !1],
  witnessUtxo: [1, !1, Cr, [], [0, 2], !1],
  partialSig: [2, Hu, xt, [], [0, 2], !1],
  sighashType: [3, !1, ct, [], [0, 2], !1],
  redeemScript: [4, !1, xt, [], [0, 2], !1],
  witnessScript: [5, !1, xt, [], [0, 2], !1],
  bip32Derivation: [6, Hu, oc, [], [0, 2], !1],
  finalScriptSig: [7, !1, xt, [], [0, 2], !1],
  finalScriptWitness: [8, !1, Rs, [], [0, 2], !1],
  porCommitment: [9, !1, xt, [], [0, 2], !1],
  ripemd160: [10, Ud, xt, [], [0, 2], !1],
  sha256: [11, Xi, xt, [], [0, 2], !1],
  hash160: [12, Ud, xt, [], [0, 2], !1],
  hash256: [13, Xi, xt, [], [0, 2], !1],
  txid: [14, !1, Xi, [2], [2], !0],
  index: [15, !1, ct, [2], [2], !0],
  sequence: [16, !1, ct, [], [2], !0],
  requiredTimeLocktime: [17, !1, ct, [], [2], !1],
  requiredHeightLocktime: [18, !1, ct, [], [2], !1],
  tapKeySig: [19, !1, Rd, [], [0, 2], !1],
  tapScriptSig: [20, uE, Rd, [], [0, 2], !1],
  tapLeafScript: [21, nn, xt, [], [0, 2], !1],
  tapBip32Derivation: [22, Xi, my, [], [0, 2], !1],
  tapInternalKey: [23, !1, aa, [], [0, 2], !1],
  tapMerkleRoot: [24, !1, Xi, [], [0, 2], !1],
  proprietary: [252, xt, xt, [], [0, 2], !1]
}, dE = [
  "txid",
  "sequence",
  "index",
  "witnessUtxo",
  "nonWitnessUtxo",
  "finalScriptSig",
  "finalScriptWitness",
  "unknown"
], hE = [
  "partialSig",
  "finalScriptSig",
  "finalScriptWitness",
  "tapKeySig",
  "tapScriptSig"
], Us = {
  redeemScript: [0, !1, xt, [], [0, 2], !1],
  witnessScript: [1, !1, xt, [], [0, 2], !1],
  bip32Derivation: [2, Hu, oc, [], [0, 2], !1],
  amount: [3, !1, G0, [2], [2], !0],
  script: [4, !1, xt, [2], [2], !0],
  tapInternalKey: [5, !1, aa, [], [0, 2], !1],
  tapTree: [6, !1, fE, [], [0, 2], !1],
  tapBip32Derivation: [7, aa, my, [], [0, 2], !1],
  proprietary: [252, xt, xt, [], [0, 2], !1]
}, pE = [], Pd = te(iy, _t({
  //  <key> := <keylen> <keytype> <keydata> WHERE keylen = len(keytype)+len(keydata)
  key: X0(Me, _t({ type: Me, key: wt(null) })),
  //  <value> := <valuelen> <valuedata>
  value: wt(Me)
}));
function Fu(e) {
  const [t, n, r, i, s, o] = e;
  return { type: t, kc: n, vc: r, reqInc: i, allowInc: s, silentIgnore: o };
}
_t({ type: Me, key: wt(null) });
function sf(e) {
  const t = {};
  for (const n in e) {
    const [r, i, s] = e[n];
    t[r] = [n, i, s];
  }
  return re({
    encodeStream: (n, r) => {
      let i = [];
      for (const s in e) {
        const o = r[s];
        if (o === void 0)
          continue;
        const [a, c, u] = e[s];
        if (!c)
          i.push({ key: { type: a, key: bt }, value: u.encode(o) });
        else {
          const l = o.map(([d, h]) => [
            c.encode(d),
            u.encode(h)
          ]);
          l.sort((d, h) => sa(d[0], h[0]));
          for (const [d, h] of l)
            i.push({ key: { key: d, type: a }, value: h });
        }
      }
      if (r.unknown) {
        r.unknown.sort((s, o) => sa(s[0].key, o[0].key));
        for (const [s, o] of r.unknown)
          i.push({ key: s, value: o });
      }
      Pd.encodeStream(n, i);
    },
    decodeStream: (n) => {
      const r = Pd.decodeStream(n), i = {}, s = {};
      for (const o of r) {
        let a = "unknown", c = o.key.key, u = o.value;
        if (t[o.key.type]) {
          const [l, d, h] = t[o.key.type];
          if (a = l, !d && c.length)
            throw new Error(`PSBT: Non-empty key for ${a} (key=${P.encode(c)} value=${P.encode(u)}`);
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
const of = ne(sf(ac), (e) => {
  if (e.finalScriptWitness && !e.finalScriptWitness.length)
    throw new Error("validateInput: empty finalScriptWitness");
  if (e.partialSig && !e.partialSig.length)
    throw new Error("Empty partialSig");
  if (e.partialSig)
    for (const [t] of e.partialSig)
      ki(t, ue.ecdsa);
  if (e.bip32Derivation)
    for (const [t] of e.bip32Derivation)
      ki(t, ue.ecdsa);
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
}), af = ne(sf(Us), (e) => {
  if (e.bip32Derivation)
    for (const [t] of e.bip32Derivation)
      ki(t, ue.ecdsa);
  return e;
}), by = ne(sf(rf), (e) => {
  if ((e.version || 0) === 0) {
    if (!e.unsignedTx)
      throw new Error("PSBTv0: missing unsignedTx");
    for (const n of e.unsignedTx.inputs)
      if (n.finalScriptSig && n.finalScriptSig.length)
        throw new Error("PSBTv0: input scriptSig found in unsignedTx");
  }
  return e;
}), gE = _t({
  magic: Ql(Xl(new Uint8Array([255])), "psbt"),
  global: by,
  inputs: te("global/unsignedTx/inputs/length", of),
  outputs: te(null, af)
}), yE = _t({
  magic: Ql(Xl(new Uint8Array([255])), "psbt"),
  global: by,
  inputs: te("global/inputCount", of),
  outputs: te("global/outputCount", af)
});
_t({
  magic: Ql(Xl(new Uint8Array([255])), "psbt"),
  items: te(null, hr(te(iy, eE([Q0(Me), wt(sc)])), ic.dict()))
});
function jc(e, t, n) {
  for (const r in n) {
    if (r === "unknown" || !t[r])
      continue;
    const { allowInc: i } = Fu(t[r]);
    if (!i.includes(e))
      throw new Error(`PSBTv${e}: field ${r} is not allowed`);
  }
  for (const r in t) {
    const { reqInc: i } = Fu(t[r]);
    if (i.includes(e) && n[r] === void 0)
      throw new Error(`PSBTv${e}: missing required field ${r}`);
  }
}
function Cd(e, t, n) {
  const r = {};
  for (const i in n) {
    const s = i;
    if (s !== "unknown") {
      if (!t[s])
        continue;
      const { allowInc: o, silentIgnore: a } = Fu(t[s]);
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
function Ey(e) {
  const t = e && e.global && e.global.version || 0;
  jc(t, rf, e.global);
  for (const o of e.inputs)
    jc(t, ac, o);
  for (const o of e.outputs)
    jc(t, Us, o);
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
function ju(e, t, n, r, i) {
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
        p = p.map((g) => {
          if (g.length !== 2)
            throw new Error(`keyMap(${o}): KV pairs should be [k, v][]`);
          return [
            typeof g[0] == "string" ? u.decode(P.decode(g[0])) : g[0],
            typeof g[1] == "string" ? l.decode(P.decode(g[1])) : g[1]
          ];
        });
        const y = {}, f = (g, m, S) => {
          if (y[g] === void 0) {
            y[g] = [m, S];
            return;
          }
          const v = P.encode(l.encode(y[g][1])), O = P.encode(l.encode(S));
          if (v !== O)
            throw new Error(`keyMap(${a}): same key=${g} oldVal=${v} newVal=${O}`);
        };
        for (const [g, m] of h) {
          const S = P.encode(u.encode(g));
          f(S, g, m);
        }
        for (const [g, m] of p) {
          const S = P.encode(u.encode(g));
          if (m === void 0) {
            if (d)
              throw new Error(`Cannot remove signed field=${a}/${g}`);
            delete y[S];
          } else
            f(S, g, m);
        }
        s[a] = Object.values(y);
      }
    } else if (typeof s[o] == "string")
      s[o] = l.decode(P.decode(s[o]));
    else if (d && o in t && n && n[o] !== void 0 && !St(l.encode(t[o]), l.encode(n[o])))
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
const Ld = ne(gE, Ey), _d = ne(yE, Ey), wE = {
  encode(e) {
    if (!(e.length !== 2 || e[0] !== 1 || !ht(e[1]) || P.encode(e[1]) !== "4e73"))
      return { type: "p2a", script: J.encode(e) };
  },
  decode: (e) => {
    if (e.type === "p2a")
      return [1, P.decode("4e73")];
  }
};
function si(e, t) {
  try {
    return ki(e, t), !0;
  } catch {
    return !1;
  }
}
const mE = {
  encode(e) {
    if (!(e.length !== 2 || !ht(e[0]) || !si(e[0], ue.ecdsa) || e[1] !== "CHECKSIG"))
      return { type: "pk", pubkey: e[0] };
  },
  decode: (e) => e.type === "pk" ? [e.pubkey, "CHECKSIG"] : void 0
}, bE = {
  encode(e) {
    if (!(e.length !== 5 || e[0] !== "DUP" || e[1] !== "HASH160" || !ht(e[2])) && !(e[3] !== "EQUALVERIFY" || e[4] !== "CHECKSIG"))
      return { type: "pkh", hash: e[2] };
  },
  decode: (e) => e.type === "pkh" ? ["DUP", "HASH160", e.hash, "EQUALVERIFY", "CHECKSIG"] : void 0
}, EE = {
  encode(e) {
    if (!(e.length !== 3 || e[0] !== "HASH160" || !ht(e[1]) || e[2] !== "EQUAL"))
      return { type: "sh", hash: e[1] };
  },
  decode: (e) => e.type === "sh" ? ["HASH160", e.hash, "EQUAL"] : void 0
}, xE = {
  encode(e) {
    if (!(e.length !== 2 || e[0] !== 0 || !ht(e[1])) && e[1].length === 32)
      return { type: "wsh", hash: e[1] };
  },
  decode: (e) => e.type === "wsh" ? [0, e.hash] : void 0
}, TE = {
  encode(e) {
    if (!(e.length !== 2 || e[0] !== 0 || !ht(e[1])) && e[1].length === 20)
      return { type: "wpkh", hash: e[1] };
  },
  decode: (e) => e.type === "wpkh" ? [0, e.hash] : void 0
}, SE = {
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
        if (!ht(s))
          return;
      return { type: "ms", m: n, pubkeys: i };
    }
  },
  // checkmultisig(n, ..pubkeys, m)
  decode: (e) => e.type === "ms" ? [e.m, ...e.pubkeys, e.pubkeys.length, "CHECKMULTISIG"] : void 0
}, vE = {
  encode(e) {
    if (!(e.length !== 2 || e[0] !== 1 || !ht(e[1])))
      return { type: "tr", pubkey: e[1] };
  },
  decode: (e) => e.type === "tr" ? [1, e.pubkey] : void 0
}, $E = {
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
      if (!ht(i))
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
}, kE = {
  encode(e) {
    const t = e.length - 1;
    if (e[t] !== "NUMEQUAL" || e[1] !== "CHECKSIG")
      return;
    const n = [], r = sE(e[t - 1]);
    if (typeof r == "number") {
      for (let i = 0; i < t - 1; i++) {
        const s = e[i];
        if (i & 1) {
          if (s !== (i === 1 ? "CHECKSIG" : "CHECKSIGADD"))
            throw new Error("OutScript.encode/tr_ms: wrong element");
          continue;
        }
        if (!ht(s))
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
}, AE = {
  encode(e) {
    return { type: "unknown", script: J.encode(e) };
  },
  decode: (e) => e.type === "unknown" ? J.decode(e.script) : void 0
}, IE = [
  wE,
  mE,
  bE,
  EE,
  xE,
  TE,
  SE,
  vE,
  $E,
  kE,
  AE
], OE = hr(J, ic.match(IE)), kt = ne(OE, (e) => {
  if (e.type === "pk" && !si(e.pubkey, ue.ecdsa))
    throw new Error("OutScript/pk: wrong key");
  if ((e.type === "pkh" || e.type === "sh" || e.type === "wpkh") && (!ht(e.hash) || e.hash.length !== 20))
    throw new Error(`OutScript/${e.type}: wrong hash`);
  if (e.type === "wsh" && (!ht(e.hash) || e.hash.length !== 32))
    throw new Error("OutScript/wsh: wrong hash");
  if (e.type === "tr" && (!ht(e.pubkey) || !si(e.pubkey, ue.schnorr)))
    throw new Error("OutScript/tr: wrong taproot public key");
  if ((e.type === "ms" || e.type === "tr_ns" || e.type === "tr_ms") && !Array.isArray(e.pubkeys))
    throw new Error("OutScript/multisig: wrong pubkeys array");
  if (e.type === "ms") {
    const t = e.pubkeys.length;
    for (const n of e.pubkeys)
      if (!si(n, ue.ecdsa))
        throw new Error("OutScript/multisig: wrong pubkey");
    if (e.m <= 0 || t > 16 || e.m > t)
      throw new Error("OutScript/multisig: invalid params");
  }
  if (e.type === "tr_ns" || e.type === "tr_ms") {
    for (const t of e.pubkeys)
      if (!si(t, ue.schnorr))
        throw new Error(`OutScript/${e.type}: wrong pubkey`);
  }
  if (e.type === "tr_ms") {
    const t = e.pubkeys.length;
    if (e.m <= 0 || t > 999 || e.m > t)
      throw new Error("OutScript/tr_ms: invalid params");
  }
  return e;
});
function Dd(e, t) {
  if (!St(e.hash, Ht(t)))
    throw new Error("checkScript: wsh wrong witnessScript hash");
  const n = kt.decode(t);
  if (n.type === "tr" || n.type === "tr_ns" || n.type === "tr_ms")
    throw new Error(`checkScript: P2${n.type} cannot be wrapped in P2SH`);
  if (n.type === "wpkh" || n.type === "sh")
    throw new Error(`checkScript: P2${n.type} cannot be wrapped in P2WSH`);
}
function xy(e, t, n) {
  if (e) {
    const r = kt.decode(e);
    if (r.type === "tr_ns" || r.type === "tr_ms" || r.type === "ms" || r.type == "pk")
      throw new Error(`checkScript: non-wrapped ${r.type}`);
    if (r.type === "sh" && t) {
      if (!St(r.hash, hy(t)))
        throw new Error("checkScript: sh wrong redeemScript hash");
      const i = kt.decode(t);
      if (i.type === "tr" || i.type === "tr_ns" || i.type === "tr_ms")
        throw new Error(`checkScript: P2${i.type} cannot be wrapped in P2SH`);
      if (i.type === "sh")
        throw new Error("checkScript: P2SH cannot be wrapped in P2SH");
    }
    r.type === "wsh" && n && Dd(r, n);
  }
  if (t) {
    const r = kt.decode(t);
    r.type === "wsh" && n && Dd(r, n);
  }
}
function BE(e) {
  const t = {};
  for (const n of e) {
    const r = P.encode(n);
    if (t[r])
      throw new Error(`Multisig: non-uniq pubkey: ${e.map(P.encode)}`);
    t[r] = !0;
  }
}
function NE(e, t, n = !1, r) {
  const i = kt.decode(e);
  if (i.type === "unknown" && n)
    return;
  if (!["tr_ns", "tr_ms"].includes(i.type))
    throw new Error(`P2TR: invalid leaf script=${i.type}`);
  const s = i;
  if (!n && s.pubkeys)
    for (const o of s.pubkeys) {
      if (St(o, ef))
        throw new Error("Unspendable taproot key in leaf script");
      if (St(o, t))
        throw new Error("Using P2TR with leaf script with same key as internal key is not supported");
    }
}
function Ty(e) {
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
function Ku(e, t = []) {
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
    left: Ku(e.left, [e.right.hash, ...t]),
    right: Ku(e.right, [e.left.hash, ...t])
  };
}
function zu(e) {
  if (!e)
    throw new Error("taprootAddPath: empty tree");
  if (e.type === "leaf")
    return [e];
  if (e.type !== "branch")
    throw new Error(`taprootWalkTree: wrong type=${e}`);
  return [...zu(e.left), ...zu(e.right)];
}
function Wu(e, t, n = !1, r) {
  if (!e)
    throw new Error("taprootHashTree: empty tree");
  if (Array.isArray(e) && e.length === 1 && (e = e[0]), !Array.isArray(e)) {
    const { leafVersion: c, script: u } = e;
    if (e.tapLeafScript || e.tapMerkleRoot && !St(e.tapMerkleRoot, bt))
      throw new Error("P2TR: tapRoot leafScript cannot have tree");
    const l = typeof u == "string" ? P.decode(u) : u;
    if (!ht(l))
      throw new Error(`checkScript: wrong script type=${l}`);
    return NE(l, t, n), {
      type: "leaf",
      version: c,
      script: l,
      hash: ps(l, c)
    };
  }
  if (e.length !== 2 && (e = Ty(e)), e.length !== 2)
    throw new Error("hashTree: non binary tree!");
  const i = Wu(e[0], t, n), s = Wu(e[1], t, n);
  let [o, a] = [i.hash, s.hash];
  return sa(a, o) === -1 && ([o, a] = [a, o]), { type: "branch", left: i, right: s, hash: tf("TapBranch", o, a) };
}
const Ps = 192, ps = (e, t = Ps) => tf("TapLeaf", new Uint8Array([t]), Re.encode(e));
function RE(e, t, n = Ai, r = !1, i) {
  if (!e && !t)
    throw new Error("p2tr: should have pubKey or scriptTree (or both)");
  const s = typeof e == "string" ? P.decode(e) : e || ef;
  if (!si(s, ue.schnorr))
    throw new Error("p2tr: non-schnorr pubkey");
  if (t) {
    let o = Ku(Wu(t, s, r));
    const a = o.hash, [c, u] = Mu(s, a), l = zu(o).map((d) => ({
      ...d,
      controlBlock: nn.encode({
        version: (d.version || Ps) + u,
        internalKey: s,
        merklePath: d.path
      })
    }));
    return {
      type: "tr",
      script: kt.encode({ type: "tr", pubkey: c }),
      address: Kr(n).encode({ type: "tr", pubkey: c }),
      // For tests
      tweakedPubkey: c,
      // PSBT stuff
      tapInternalKey: s,
      leaves: l,
      tapLeafScript: l.map((d) => [
        nn.decode(d.controlBlock),
        Qn(d.script, new Uint8Array([d.version || Ps]))
      ]),
      tapMerkleRoot: a
    };
  } else {
    const o = Mu(s, bt)[0];
    return {
      type: "tr",
      script: kt.encode({ type: "tr", pubkey: o }),
      address: Kr(n).encode({ type: "tr", pubkey: o }),
      // For tests
      tweakedPubkey: o,
      // PSBT stuff
      tapInternalKey: s
    };
  }
}
function UE(e, t, n = !1) {
  return n || BE(t), {
    type: "tr_ms",
    script: kt.encode({ type: "tr_ms", pubkeys: t, m: e })
  };
}
const Sy = C0(Ht);
function vy(e, t) {
  if (t.length < 2 || t.length > 40)
    throw new Error("Witness: invalid length");
  if (e > 16)
    throw new Error("Witness: invalid version");
  if (e === 0 && !(t.length === 20 || t.length === 32))
    throw new Error("Witness: invalid length for version");
}
function Kc(e, t, n = Ai) {
  vy(e, t);
  const r = e === 0 ? _u : ri;
  return r.encode(n.bech32, [e].concat(r.toWords(t)));
}
function Vd(e, t) {
  return Sy.encode(Qn(Uint8Array.from(t), e));
}
function Kr(e = Ai) {
  return {
    encode(t) {
      const { type: n } = t;
      if (n === "wpkh")
        return Kc(0, t.hash, e);
      if (n === "wsh")
        return Kc(0, t.hash, e);
      if (n === "tr")
        return Kc(1, t.pubkey, e);
      if (n === "pkh")
        return Vd(t.hash, [e.pubKeyHash]);
      if (n === "sh")
        return Vd(t.hash, [e.scriptHash]);
      throw new Error(`Unknown address type=${n}`);
    },
    decode(t) {
      if (t.length < 14 || t.length > 74)
        throw new Error("Invalid address length");
      if (e.bech32 && t.toLowerCase().startsWith(`${e.bech32}1`)) {
        let r;
        try {
          if (r = _u.decode(t), r.words[0] !== 0)
            throw new Error(`bech32: wrong version=${r.words[0]}`);
        } catch {
          if (r = ri.decode(t), r.words[0] === 0)
            throw new Error(`bech32m: wrong version=${r.words[0]}`);
        }
        if (r.prefix !== e.bech32)
          throw new Error(`wrong bech32 prefix=${r.prefix}`);
        const [i, ...s] = r.words, o = _u.fromWords(s);
        if (vy(i, o), i === 0 && o.length === 32)
          return { type: "wsh", hash: o };
        if (i === 0 && o.length === 20)
          return { type: "wpkh", hash: o };
        if (i === 1 && o.length === 32)
          return { type: "tr", pubkey: o };
        throw new Error("Unknown witness program");
      }
      const n = Sy.decode(t);
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
const ao = new Uint8Array(32), PE = {
  amount: 0xffffffffffffffffn,
  script: bt
}, CE = (e) => Math.ceil(e / 4), LE = 8, _E = 2, $r = 0, cf = 4294967295;
ic.decimal(LE);
const gs = (e, t) => e === void 0 ? t : e;
function ca(e) {
  if (Array.isArray(e))
    return e.map((t) => ca(t));
  if (ht(e))
    return Uint8Array.from(e);
  if (["number", "bigint", "boolean", "string", "undefined"].includes(typeof e))
    return e;
  if (e === null)
    return e;
  if (typeof e == "object")
    return Object.fromEntries(Object.entries(e).map(([t, n]) => [t, ca(n)]));
  throw new Error(`cloneDeep: unknown type=${e} (${typeof e})`);
}
const it = {
  DEFAULT: 0,
  ALL: 1,
  NONE: 2,
  SINGLE: 3,
  ANYONECANPAY: 128
}, zr = {
  DEFAULT: it.DEFAULT,
  ALL: it.ALL,
  NONE: it.NONE,
  SINGLE: it.SINGLE,
  DEFAULT_ANYONECANPAY: it.DEFAULT | it.ANYONECANPAY,
  ALL_ANYONECANPAY: it.ALL | it.ANYONECANPAY,
  NONE_ANYONECANPAY: it.NONE | it.ANYONECANPAY,
  SINGLE_ANYONECANPAY: it.SINGLE | it.ANYONECANPAY
}, DE = yy(zr);
function VE(e, t, n, r = bt) {
  return St(n, t) && (e = rE(e, r), t = Jl(e)), { privKey: e, pubKey: t };
}
function kr(e) {
  if (e.script === void 0 || e.amount === void 0)
    throw new Error("Transaction/output: script and amount required");
  return { script: e.script, amount: e.amount };
}
function Qi(e) {
  if (e.txid === void 0 || e.index === void 0)
    throw new Error("Transaction/input: txid and index required");
  return {
    txid: e.txid,
    index: e.index,
    sequence: gs(e.sequence, cf),
    finalScriptSig: gs(e.finalScriptSig, bt)
  };
}
function zc(e) {
  for (const t in e) {
    const n = t;
    dE.includes(n) || delete e[n];
  }
}
const Wc = _t({ txid: wt(32, !0), index: ct });
function ME(e) {
  if (typeof e != "number" || typeof DE[e] != "string")
    throw new Error(`Invalid SigHash=${e}`);
  return e;
}
function Md(e) {
  const t = e & 31;
  return {
    isAny: !!(e & it.ANYONECANPAY),
    isNone: t === it.NONE,
    isSingle: t === it.SINGLE
  };
}
function HE(e) {
  if (e !== void 0 && {}.toString.call(e) !== "[object Object]")
    throw new Error(`Wrong object type for transaction options: ${e}`);
  const t = {
    ...e,
    // Defaults
    version: gs(e.version, _E),
    lockTime: gs(e.lockTime, 0),
    PSBTVersion: gs(e.PSBTVersion, 0)
  };
  if (typeof t.allowUnknowInput < "u" && (e.allowUnknownInputs = t.allowUnknowInput), typeof t.allowUnknowOutput < "u" && (e.allowUnknownOutputs = t.allowUnknowOutput), typeof t.lockTime != "number")
    throw new Error("Transaction lock time should be number");
  if (ct.encode(t.lockTime), t.PSBTVersion !== 0 && t.PSBTVersion !== 2)
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
function Hd(e) {
  if (e.nonWitnessUtxo && e.index !== void 0) {
    const t = e.nonWitnessUtxo.outputs.length - 1;
    if (e.index > t)
      throw new Error(`validateInput: index(${e.index}) not in nonWitnessUtxo`);
    const n = e.nonWitnessUtxo.outputs[e.index];
    if (e.witnessUtxo && (!St(e.witnessUtxo.script, n.script) || e.witnessUtxo.amount !== n.amount))
      throw new Error("validateInput: witnessUtxo different from nonWitnessUtxo");
    if (e.txid) {
      if (e.nonWitnessUtxo.outputs.length - 1 < e.index)
        throw new Error("nonWitnessUtxo: incorect output index");
      const i = Pe.fromRaw(di.encode(e.nonWitnessUtxo), {
        allowUnknownOutputs: !0,
        disableScriptCheck: !0,
        allowUnknownInputs: !0
      }), s = P.encode(e.txid);
      if (i.isFinal && i.id !== s)
        throw new Error(`nonWitnessUtxo: wrong txid, exp=${s} got=${i.id}`);
    }
  }
  return e;
}
function Oo(e) {
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
function Fd(e, t, n, r = !1, i = !1) {
  let { nonWitnessUtxo: s, txid: o } = e;
  typeof s == "string" && (s = P.decode(s)), ht(s) && (s = di.decode(s)), !("nonWitnessUtxo" in e) && s === void 0 && (s = t?.nonWitnessUtxo), typeof o == "string" && (o = P.decode(o)), o === void 0 && (o = t?.txid);
  let a = { ...t, ...e, nonWitnessUtxo: s, txid: o };
  !("nonWitnessUtxo" in e) && a.nonWitnessUtxo === void 0 && delete a.nonWitnessUtxo, a.sequence === void 0 && (a.sequence = cf), a.tapMerkleRoot === null && delete a.tapMerkleRoot, a = ju(ac, a, t, n, i), of.encode(a);
  let c;
  return a.nonWitnessUtxo && a.index !== void 0 ? c = a.nonWitnessUtxo.outputs[a.index] : a.witnessUtxo && (c = a.witnessUtxo), c && !r && xy(c && c.script, a.redeemScript, a.witnessScript), a;
}
function jd(e, t = !1) {
  let n = "legacy", r = it.ALL;
  const i = Oo(e), s = kt.decode(i.script);
  let o = s.type, a = s;
  const c = [s];
  if (s.type === "tr")
    return r = it.DEFAULT, {
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
      let h = kt.decode(e.redeemScript);
      (h.type === "wpkh" || h.type === "wsh") && (n = "segwit"), c.push(h), a = h, o += `-${h.type}`;
    }
    if (a.type === "wsh") {
      if (!e.witnessScript)
        throw new Error("inputType: wsh without witnessScript");
      let h = kt.decode(e.witnessScript);
      h.type === "wsh" && (n = "segwit"), c.push(h), a = h, o += `-${h.type}`;
    }
    const u = c[c.length - 1];
    if (u.type === "sh" || u.type === "wsh")
      throw new Error("inputType: sh/wsh cannot be terminal type");
    const l = kt.encode(u), d = {
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
let Pe = class Bo {
  global = {};
  inputs = [];
  // use getInput()
  outputs = [];
  // use getOutput()
  opts;
  constructor(t = {}) {
    const n = this.opts = HE(t);
    n.lockTime !== $r && (this.global.fallbackLocktime = n.lockTime), this.global.txVersion = n.version;
  }
  // Import
  static fromRaw(t, n = {}) {
    const r = di.decode(t), i = new Bo({ ...n, version: r.version, lockTime: r.lockTime });
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
      r = Ld.decode(t);
    } catch (d) {
      try {
        r = _d.decode(t);
      } catch {
        throw d;
      }
    }
    const i = r.global.version || 0;
    if (i !== 0 && i !== 2)
      throw new Error(`Wrong PSBT version=${i}`);
    const s = r.global.unsignedTx, o = i === 0 ? s?.version : r.global.txVersion, a = i === 0 ? s?.lockTime : r.global.fallbackLocktime, c = new Bo({ ...n, version: o, lockTime: a, PSBTVersion: i }), u = i === 0 ? s?.inputs.length : r.global.inputCount;
    c.inputs = r.inputs.slice(0, u).map((d, h) => Hd({
      finalScriptSig: bt,
      ...r.global.unsignedTx?.inputs[h],
      ...d
    }));
    const l = i === 0 ? s?.outputs.length : r.global.outputCount;
    return c.outputs = r.outputs.slice(0, l).map((d, h) => ({
      ...d,
      ...r.global.unsignedTx?.outputs[h]
    })), c.global = { ...r.global, txVersion: o }, a !== $r && (c.global.fallbackLocktime = a), c;
  }
  toPSBT(t = this.opts.PSBTVersion) {
    if (t !== 0 && t !== 2)
      throw new Error(`Wrong PSBT version=${t}`);
    const n = this.inputs.map((s) => Hd(Cd(t, ac, s)));
    for (const s of n)
      s.partialSig && !s.partialSig.length && delete s.partialSig, s.finalScriptSig && !s.finalScriptSig.length && delete s.finalScriptSig, s.finalScriptWitness && !s.finalScriptWitness.length && delete s.finalScriptWitness;
    const r = this.outputs.map((s) => Cd(t, Us, s)), i = { ...this.global };
    return t === 0 ? (i.unsignedTx = fs.decode(fs.encode({
      version: this.version,
      lockTime: this.lockTime,
      inputs: this.inputs.map(Qi).map((s) => ({
        ...s,
        finalScriptSig: bt
      })),
      outputs: this.outputs.map(kr)
    })), delete i.fallbackLocktime, delete i.txVersion) : (i.version = t, i.txVersion = this.version, i.inputCount = this.inputs.length, i.outputCount = this.outputs.length, i.fallbackLocktime && i.fallbackLocktime === $r && delete i.fallbackLocktime), this.opts.bip174jsCompat && (n.length || n.push({}), r.length || r.push({})), (t === 0 ? Ld : _d).encode({
      global: i,
      inputs: n,
      outputs: r
    });
  }
  // BIP370 lockTime (https://github.com/bitcoin/bips/blob/master/bip-0370.mediawiki#determining-lock-time)
  get lockTime() {
    let t = $r, n = 0, r = $r, i = 0;
    for (const s of this.inputs)
      s.requiredHeightLocktime && (t = Math.max(t, s.requiredHeightLocktime), n++), s.requiredTimeLocktime && (r = Math.max(r, s.requiredTimeLocktime), i++);
    return n && n >= i ? t : r !== $r ? r : this.global.fallbackLocktime || $r;
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
    const n = this.inputs[t].sighashType, r = n === void 0 ? it.DEFAULT : n, i = r === it.DEFAULT ? it.ALL : r & 3;
    return { sigInputs: r & it.ANYONECANPAY, sigOutputs: i };
  }
  // Very nice for debug purposes, but slow. If there is too much inputs/outputs to add, will be quadratic.
  // Some cache will be nice, but there chance to have bugs with cache invalidation
  signStatus() {
    let t = !0, n = !0, r = [], i = [];
    for (let s = 0; s < this.inputs.length; s++) {
      if (this.inputStatus(s) === "unsigned")
        continue;
      const { sigInputs: a, sigOutputs: c } = this.inputSighash(s);
      if (a === it.ANYONECANPAY ? r.push(s) : t = !1, c === it.ALL)
        n = !1;
      else if (c === it.SINGLE)
        i.push(s);
      else if (c !== it.NONE) throw new Error(`Wrong signature hash output type: ${c}`);
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
    const n = this.outputs.map(kr);
    t += 4 * Me.encode(this.outputs.length).length;
    for (const r of n)
      t += 32 + 4 * Re.encode(r.script).length;
    this.hasWitnesses && (t += 2), t += 4 * Me.encode(this.inputs.length).length;
    for (const r of this.inputs)
      t += 160 + 4 * Re.encode(r.finalScriptSig || bt).length, this.hasWitnesses && r.finalScriptWitness && (t += Rs.encode(r.finalScriptWitness).length);
    return t;
  }
  get vsize() {
    return CE(this.weight);
  }
  toBytes(t = !1, n = !1) {
    return di.encode({
      version: this.version,
      lockTime: this.lockTime,
      inputs: this.inputs.map(Qi).map((r) => ({
        ...r,
        finalScriptSig: t && r.finalScriptSig || bt
      })),
      outputs: this.outputs.map(kr),
      witnesses: this.inputs.map((r) => r.finalScriptWitness || []),
      segwitFlag: n && this.hasWitnesses
    });
  }
  get unsignedTx() {
    return this.toBytes(!1, !1);
  }
  get hex() {
    return P.encode(this.toBytes(!0, this.hasWitnesses));
  }
  get hash() {
    return P.encode(_n(this.toBytes(!0)));
  }
  get id() {
    return P.encode(_n(this.toBytes(!0)).reverse());
  }
  // Input stuff
  checkInputIdx(t) {
    if (!Number.isSafeInteger(t) || 0 > t || t >= this.inputs.length)
      throw new Error(`Wrong input index=${t}`);
  }
  getInput(t) {
    return this.checkInputIdx(t), ca(this.inputs[t]);
  }
  get inputsLength() {
    return this.inputs.length;
  }
  // Modification
  addInput(t, n = !1) {
    if (!n && !this.signStatus().addInput)
      throw new Error("Tx has signed inputs, cannot add new one");
    return this.inputs.push(Fd(t, void 0, void 0, this.opts.disableScriptCheck)), this.inputs.length - 1;
  }
  updateInput(t, n, r = !1) {
    this.checkInputIdx(t);
    let i;
    if (!r) {
      const s = this.signStatus();
      (!s.addInput || s.inputs.includes(t)) && (i = hE);
    }
    this.inputs[t] = Fd(n, this.inputs[t], i, this.opts.disableScriptCheck, this.opts.allowUnknown);
  }
  // Output stuff
  checkOutputIdx(t) {
    if (!Number.isSafeInteger(t) || 0 > t || t >= this.outputs.length)
      throw new Error(`Wrong output index=${t}`);
  }
  getOutput(t) {
    return this.checkOutputIdx(t), ca(this.outputs[t]);
  }
  getOutputAddress(t, n = Ai) {
    const r = this.getOutput(t);
    if (r.script)
      return Kr(n).encode(kt.decode(r.script));
  }
  get outputsLength() {
    return this.outputs.length;
  }
  normalizeOutput(t, n, r) {
    let { amount: i, script: s } = t;
    if (i === void 0 && (i = n?.amount), typeof i != "bigint")
      throw new Error(`Wrong amount type, should be of type bigint in sats, but got ${i} of type ${typeof i}`);
    typeof s == "string" && (s = P.decode(s)), s === void 0 && (s = n?.script);
    let o = { ...n, ...t, amount: i, script: s };
    if (o.amount === void 0 && delete o.amount, o = ju(Us, o, n, r, this.opts.allowUnknown), af.encode(o), o.script && !this.opts.allowUnknownOutputs && kt.decode(o.script).type === "unknown")
      throw new Error("Transaction/output: unknown output script type, there is a chance that input is unspendable. Pass allowUnknownOutputs=true, if you sure");
    return this.opts.disableScriptCheck || xy(o.script, o.redeemScript, o.witnessScript), o;
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
      (!s.addOutput || s.outputs.includes(t)) && (i = pE);
    }
    this.outputs[t] = this.normalizeOutput(n, this.outputs[t], i);
  }
  addOutputAddress(t, n, r = Ai) {
    return this.addOutput({ script: kt.encode(Kr(r).decode(t)), amount: n });
  }
  // Utils
  get fee() {
    let t = 0n;
    for (const r of this.inputs) {
      const i = Oo(r);
      if (!i)
        throw new Error("Empty input amount");
      t += i.amount;
    }
    const n = this.outputs.map(kr);
    for (const r of n)
      t -= r.amount;
    return t;
  }
  // Signing
  // Based on https://github.com/bitcoin/bitcoin/blob/5871b5b5ab57a0caf9b7514eb162c491c83281d5/test/functional/test_framework/script.py#L624
  // There is optimization opportunity to re-use hashes for multiple inputs for witness v0/v1,
  // but we are trying to be less complicated for audit purpose for now.
  preimageLegacy(t, n, r) {
    const { isAny: i, isNone: s, isSingle: o } = Md(r);
    if (t < 0 || !Number.isSafeInteger(t))
      throw new Error(`Invalid input idx=${t}`);
    if (o && t >= this.outputs.length || t >= this.inputs.length)
      return ly.encode(1n);
    n = J.encode(J.decode(n).filter((l) => l !== "CODESEPARATOR"));
    let a = this.inputs.map(Qi).map((l, d) => ({
      ...l,
      finalScriptSig: d === t ? n : bt
    }));
    i ? a = [a[t]] : (s || o) && (a = a.map((l, d) => ({
      ...l,
      sequence: d === t ? l.sequence : 0
    })));
    let c = this.outputs.map(kr);
    s ? c = [] : o && (c = c.slice(0, t).fill(PE).concat([c[t]]));
    const u = di.encode({
      lockTime: this.lockTime,
      version: this.version,
      segwitFlag: !1,
      inputs: a,
      outputs: c
    });
    return _n(u, ii.encode(r));
  }
  preimageWitnessV0(t, n, r, i) {
    const { isAny: s, isNone: o, isSingle: a } = Md(r);
    let c = ao, u = ao, l = ao;
    const d = this.inputs.map(Qi), h = this.outputs.map(kr);
    s || (c = _n(...d.map(Wc.encode))), !s && !a && !o && (u = _n(...d.map((y) => ct.encode(y.sequence)))), !a && !o ? l = _n(...h.map(Cr.encode)) : a && t < h.length && (l = _n(Cr.encode(h[t])));
    const p = d[t];
    return _n(ii.encode(this.version), c, u, wt(32, !0).encode(p.txid), ct.encode(p.index), Re.encode(n), Io.encode(i), ct.encode(p.sequence), l, ct.encode(this.lockTime), ct.encode(r));
  }
  preimageWitnessV1(t, n, r, i, s = -1, o, a = 192, c) {
    if (!Array.isArray(i) || this.inputs.length !== i.length)
      throw new Error(`Invalid amounts array=${i}`);
    if (!Array.isArray(n) || this.inputs.length !== n.length)
      throw new Error(`Invalid prevOutScript array=${n}`);
    const u = [
      rr.encode(0),
      rr.encode(r),
      // U8 sigHash
      ii.encode(this.version),
      ct.encode(this.lockTime)
    ], l = r === it.DEFAULT ? it.ALL : r & 3, d = r & it.ANYONECANPAY, h = this.inputs.map(Qi), p = this.outputs.map(kr);
    d !== it.ANYONECANPAY && u.push(...[
      h.map(Wc.encode),
      i.map(Io.encode),
      n.map(Re.encode),
      h.map((f) => ct.encode(f.sequence))
    ].map((f) => Ht(Qn(...f)))), l === it.ALL && u.push(Ht(Qn(...p.map(Cr.encode))));
    const y = (c ? 1 : 0) | (o ? 2 : 0);
    if (u.push(new Uint8Array([y])), d === it.ANYONECANPAY) {
      const f = h[t];
      u.push(Wc.encode(f), Io.encode(i[t]), Re.encode(n[t]), ct.encode(f.sequence));
    } else
      u.push(ct.encode(t));
    return y & 1 && u.push(Ht(Re.encode(c || bt))), l === it.SINGLE && u.push(t < p.length ? Ht(Cr.encode(p[t])) : ao), o && u.push(ps(o, a), rr.encode(0), ii.encode(s)), tf("TapSighash", ...u);
  }
  // Signer can be privateKey OR instance of bip32 HD stuff
  signIdx(t, n, r, i) {
    this.checkInputIdx(n);
    const s = this.inputs[n], o = jd(s, this.opts.allowLegacyWitnessUtxo);
    if (!ht(t)) {
      if (!s.bip32Derivation || !s.bip32Derivation.length)
        throw new Error("bip32Derivation: empty");
      const l = s.bip32Derivation.filter((h) => h[1].fingerprint == t.fingerprint).map(([h, { path: p }]) => {
        let y = t;
        for (const f of p)
          y = y.deriveChild(f);
        if (!St(y.publicKey, h))
          throw new Error("bip32Derivation: wrong pubKey");
        if (!y.privateKey)
          throw new Error("bip32Derivation: no privateKey");
        return y;
      });
      if (!l.length)
        throw new Error(`bip32Derivation: no items with fingerprint=${t.fingerprint}`);
      let d = !1;
      for (const h of l)
        this.signIdx(h.privateKey, n) && (d = !0);
      return d;
    }
    r ? r.forEach(ME) : r = [o.defaultSighash];
    const a = o.sighash;
    if (!r.includes(a))
      throw new Error(`Input with not allowed sigHash=${a}. Allowed: ${r.join(", ")}`);
    const { sigOutputs: c } = this.inputSighash(n);
    if (c === it.SINGLE && n >= this.outputs.length)
      throw new Error(`Input with sighash SINGLE, but there is no output with corresponding index=${n}`);
    const u = Oo(s);
    if (o.txType === "taproot") {
      const l = this.inputs.map(Oo), d = l.map((g) => g.script), h = l.map((g) => g.amount);
      let p = !1, y = Jl(t), f = s.tapMerkleRoot || bt;
      if (s.tapInternalKey) {
        const { pubKey: g, privKey: m } = VE(t, y, s.tapInternalKey, f), [S] = Mu(s.tapInternalKey, f);
        if (St(S, g)) {
          const v = this.preimageWitnessV1(n, d, a, h), O = Qn(Bd(v, m, i), a !== it.DEFAULT ? new Uint8Array([a]) : bt);
          this.updateInput(n, { tapKeySig: O }, !0), p = !0;
        }
      }
      if (s.tapLeafScript) {
        s.tapScriptSig = s.tapScriptSig || [];
        for (const [g, m] of s.tapLeafScript) {
          const S = m.subarray(0, -1), v = J.decode(S), O = m[m.length - 1], R = ps(S, O);
          if (v.findIndex((U) => ht(U) && St(U, y)) === -1)
            continue;
          const b = this.preimageWitnessV1(n, d, a, h, void 0, S, O), W = Qn(Bd(b, t, i), a !== it.DEFAULT ? new Uint8Array([a]) : bt);
          this.updateInput(n, { tapScriptSig: [[{ pubKey: y, leafHash: R }, W]] }, !0), p = !0;
        }
      }
      if (!p)
        throw new Error("No taproot scripts signed");
      return !0;
    } else {
      const l = py(t);
      let d = !1;
      const h = hy(l);
      for (const f of J.decode(o.lastScript))
        ht(f) && (St(f, l) || St(f, h)) && (d = !0);
      if (!d)
        throw new Error(`Input script doesn't have pubKey: ${o.lastScript}`);
      let p;
      if (o.txType === "legacy")
        p = this.preimageLegacy(n, o.lastScript, a);
      else if (o.txType === "segwit") {
        let f = o.lastScript;
        o.last.type === "wpkh" && (f = kt.encode({ type: "pkh", hash: o.last.hash })), p = this.preimageWitnessV0(n, f, a, u.amount);
      } else
        throw new Error(`Transaction/sign: unknown tx type: ${o.txType}`);
      const y = nE(p, t, this.opts.lowR);
      this.updateInput(n, {
        partialSig: [[l, Qn(y, new Uint8Array([a]))]]
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
    const n = this.inputs[t], r = jd(n, this.opts.allowLegacyWitnessUtxo);
    if (r.txType === "taproot") {
      if (n.tapKeySig)
        n.finalScriptWitness = [n.tapKeySig];
      else if (n.tapLeafScript && n.tapScriptSig) {
        const c = n.tapLeafScript.sort((u, l) => nn.encode(u[0]).length - nn.encode(l[0]).length);
        for (const [u, l] of c) {
          const d = l.slice(0, -1), h = l[l.length - 1], p = kt.decode(d), y = ps(d, h), f = n.tapScriptSig.filter((m) => St(m[0].leafHash, y));
          let g = [];
          if (p.type === "tr_ms") {
            const m = p.m, S = p.pubkeys;
            let v = 0;
            for (const O of S) {
              const R = f.findIndex((j) => St(j[0].pubKey, O));
              if (v === m || R === -1) {
                g.push(bt);
                continue;
              }
              g.push(f[R][1]), v++;
            }
            if (v !== m)
              continue;
          } else if (p.type === "tr_ns") {
            for (const m of p.pubkeys) {
              const S = f.findIndex((v) => St(v[0].pubKey, m));
              S !== -1 && g.push(f[S][1]);
            }
            if (g.length !== p.pubkeys.length)
              continue;
          } else if (p.type === "unknown" && this.opts.allowUnknownInputs) {
            const m = J.decode(d);
            if (g = f.map(([{ pubKey: S }, v]) => {
              const O = m.findIndex((R) => ht(R) && St(R, S));
              if (O === -1)
                throw new Error("finalize/taproot: cannot find position of pubkey in script");
              return { signature: v, pos: O };
            }).sort((S, v) => S.pos - v.pos).map((S) => S.signature), !g.length)
              continue;
          } else {
            const m = this.opts.customScripts;
            if (m)
              for (const S of m) {
                if (!S.finalizeTaproot)
                  continue;
                const v = J.decode(d), O = S.encode(v);
                if (O === void 0)
                  continue;
                const R = S.finalizeTaproot(d, O, f);
                if (R) {
                  n.finalScriptWitness = R.concat(nn.encode(u)), n.finalScriptSig = bt, zc(n);
                  return;
                }
              }
            throw new Error("Finalize: Unknown tapLeafScript");
          }
          n.finalScriptWitness = g.reverse().concat([d, nn.encode(u)]);
          break;
        }
        if (!n.finalScriptWitness)
          throw new Error("finalize/taproot: empty witness");
      } else
        throw new Error("finalize/taproot: unknown input");
      n.finalScriptSig = bt, zc(n);
      return;
    }
    if (!n.partialSig || !n.partialSig.length)
      throw new Error("Not enough partial sign");
    let i = bt, s = [];
    if (r.last.type === "ms") {
      const c = r.last.m, u = r.last.pubkeys;
      let l = [];
      for (const d of u) {
        const h = n.partialSig.find((p) => St(d, p[0]));
        h && l.push(h[1]);
      }
      if (l = l.slice(0, c), l.length !== c)
        throw new Error(`Multisig: wrong signatures count, m=${c} n=${u.length} signatures=${l.length}`);
      i = J.encode([0, ...l]);
    } else if (r.last.type === "pk")
      i = J.encode([n.partialSig[0][1]]);
    else if (r.last.type === "pkh")
      i = J.encode([n.partialSig[0][1], n.partialSig[0][0]]);
    else if (r.last.type === "wpkh")
      i = bt, s = [n.partialSig[0][1], n.partialSig[0][0]];
    else if (r.last.type === "unknown" && !this.opts.allowUnknownInputs)
      throw new Error("Unknown inputs not allowed");
    let o, a;
    if (r.type.includes("wsh-") && (i.length && r.lastScript.length && (s = J.decode(i).map((c) => {
      if (c === 0)
        return bt;
      if (ht(c))
        return c;
      throw new Error(`Wrong witness op=${c}`);
    })), s = s.concat(r.lastScript)), r.txType === "segwit" && (a = s), r.type.startsWith("sh-wsh-") ? o = J.encode([J.encode([0, Ht(r.lastScript)])]) : r.type.startsWith("sh-") ? o = J.encode([...J.decode(i), r.lastScript]) : r.type.startsWith("wsh-") || r.txType !== "segwit" && (o = i), !o && !a)
      throw new Error("Unknown error finalizing input");
    o && (n.finalScriptSig = o), a && (n.finalScriptWitness = a), zc(n);
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
    const n = this.global.unsignedTx ? fs.encode(this.global.unsignedTx) : bt, r = t.global.unsignedTx ? fs.encode(t.global.unsignedTx) : bt;
    if (!St(n, r))
      throw new Error("Transaction/combine: different unsigned tx");
    this.global = ju(rf, this.global, t.global, void 0, this.opts.allowUnknown);
    for (let i = 0; i < this.inputs.length; i++)
      this.updateInput(i, t.inputs[i], !0);
    for (let i = 0; i < this.outputs.length; i++)
      this.updateOutput(i, t.outputs[i], !0);
    return this;
  }
  clone() {
    return Bo.fromPSBT(this.toPSBT(this.opts.PSBTVersion), this.opts);
  }
}, pr = class extends Pe {
  constructor(t) {
    super(qc(t));
  }
  static fromPSBT(t, n) {
    return Pe.fromPSBT(t, qc(n));
  }
  static fromRaw(t, n) {
    return Pe.fromRaw(t, qc(n));
  }
};
pr.ARK_TX_OPTS = {
  allowUnknown: !0,
  allowUnknownOutputs: !0,
  allowUnknownInputs: !0
};
function qc(e) {
  return { ...pr.ARK_TX_OPTS, ...e };
}
let uf = class extends Error {
  idx;
  // Indice of participant
  constructor(t, n) {
    super(n), this.idx = t;
  }
};
const { taggedHash: $y, pointToBytes: co } = Nn.utils, je = tr.Point, nt = je.Fn, un = tr.lengths.publicKey, qu = new Uint8Array(un), Kd = hr(wt(33), {
  decode: (e) => Cs(e) ? qu : e.toBytes(!0),
  encode: (e) => Ns(e, qu) ? je.ZERO : je.fromBytes(e)
}), zd = ne(ly, (e) => (kg("n", e, 1n, nt.ORDER), e)), hi = _t({ R1: Kd, R2: Kd }), ky = _t({ k1: zd, k2: zd, publicKey: wt(un) });
function Wd(e, ...t) {
}
function xe(e, ...t) {
  if (!Array.isArray(e))
    throw new Error("expected array");
  e.forEach((n) => rt(n, ...t));
}
function qd(e) {
  if (!Array.isArray(e))
    throw new Error("expected array");
  e.forEach((t, n) => {
    if (typeof t != "boolean")
      throw new Error("expected boolean in xOnly array, got" + t + "(" + n + ")");
  });
}
const ua = (e, ...t) => nt.create(nt.fromBytes($y(e, ...t), !0)), Ji = (e, t) => Zs(e.y) ? t : nt.neg(t);
function Lr(e) {
  return je.BASE.multiply(e);
}
function Cs(e) {
  return e.equals(je.ZERO);
}
function Gu(e) {
  return xe(e, un), e.sort(sa);
}
function Ay(e) {
  xe(e, un);
  for (let t = 1; t < e.length; t++)
    if (!Ns(e[t], e[0]))
      return e[t];
  return qu;
}
function Iy(e) {
  return xe(e, un), $y("KeyAgg list", ...e);
}
function Oy(e, t, n) {
  return rt(e, un), rt(t, un), Ns(e, t) ? 1n : ua("KeyAgg coefficient", n, e);
}
function Yu(e, t = [], n = []) {
  if (xe(e, un), xe(t, 32), t.length !== n.length)
    throw new Error("The tweaks and isXonly arrays must have the same length");
  const r = Ay(e), i = Iy(e);
  let s = je.ZERO;
  for (let c = 0; c < e.length; c++) {
    let u;
    try {
      u = je.fromBytes(e[c]);
    } catch {
      throw new uf(c, "pubkey");
    }
    s = s.add(u.multiply(Oy(e[c], r, i)));
  }
  let o = nt.ONE, a = nt.ZERO;
  for (let c = 0; c < t.length; c++) {
    const u = n[c] && !Zs(s.y) ? nt.neg(nt.ONE) : nt.ONE, l = nt.fromBytes(t[c]);
    if (s = s.multiply(u).add(Lr(l)), Cs(s))
      throw new Error("The result of tweaking cannot be infinity");
    o = nt.mul(u, o), a = nt.add(l, nt.mul(u, a));
  }
  return { aggPublicKey: s, gAcc: o, tweakAcc: a };
}
const Gd = (e, t, n, r, i, s) => ua("MuSig/nonce", e, new Uint8Array([t.length]), t, new Uint8Array([n.length]), n, i, Ws(s.length, 4), s, new Uint8Array([r]));
function FE(e, t, n = new Uint8Array(0), r, i = new Uint8Array(0), s = zs(32)) {
  if (rt(e, un), Wd(t, 32), rt(n), ![0, 32].includes(n.length))
    throw new Error("wrong aggPublicKey");
  Wd(), rt(i), rt(s, 32);
  const o = Uint8Array.of(0), a = Gd(s, e, n, 0, o, i), c = Gd(s, e, n, 1, o, i);
  return {
    secret: ky.encode({ k1: a, k2: c, publicKey: e }),
    public: hi.encode({ R1: Lr(a), R2: Lr(c) })
  };
}
function jE(e) {
  xe(e, 66);
  let t = je.ZERO, n = je.ZERO;
  for (let r = 0; r < e.length; r++) {
    const i = e[r];
    try {
      const { R1: s, R2: o } = hi.decode(i);
      if (Cs(s) || Cs(o))
        throw new Error("infinity point");
      t = t.add(s), n = n.add(o);
    } catch {
      throw new uf(r, "pubnonce");
    }
  }
  return hi.encode({ R1: t, R2: n });
}
class KE {
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
    if (xe(n, 33), xe(i, 32), qd(s), rt(r), i.length !== s.length)
      throw new Error("The tweaks and isXonly arrays must have the same length");
    const { aggPublicKey: o, gAcc: a, tweakAcc: c } = Yu(n, i, s), { R1: u, R2: l } = hi.decode(t);
    this.publicKeys = n, this.Q = o, this.gAcc = a, this.tweakAcc = c, this.b = ua("MuSig/noncecoef", t, co(o), r);
    const d = u.add(l.multiply(this.b));
    this.R = Cs(d) ? je.BASE : d, this.e = ua("BIP0340/challenge", co(this.R), co(o), r), this.tweaks = i, this.isXonly = s, this.L = Iy(n), this.secondKey = Ay(n);
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
    if (!n.some((s) => Ns(s, r)))
      throw new Error("The signer's pubkey must be included in the list of pubkeys");
    return Oy(r, this.secondKey, this.L);
  }
  partialSigVerifyInternal(t, n, r) {
    const { Q: i, gAcc: s, b: o, R: a, e: c } = this, u = nt.fromBytes(t, !0);
    if (!nt.isValid(u))
      return !1;
    const { R1: l, R2: d } = hi.decode(n), h = l.add(d.multiply(o)), p = Zs(a.y) ? h : h.negate(), y = je.fromBytes(r), f = this.getSessionKeyAggCoeff(y), g = nt.mul(Ji(i, 1n), s), m = Lr(u), S = p.add(y.multiply(nt.mul(c, nt.mul(f, g))));
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
    if (rt(n, 32), typeof r != "boolean")
      throw new Error("expected boolean");
    const { Q: i, gAcc: s, b: o, R: a, e: c } = this, { k1: u, k2: l, publicKey: d } = ky.decode(t);
    if (t.fill(0, 0, 64), !nt.isValid(u))
      throw new Error("wrong k1");
    if (!nt.isValid(l))
      throw new Error("wrong k1");
    const h = Ji(a, u), p = Ji(a, l), y = nt.fromBytes(n);
    if (nt.is0(y))
      throw new Error("wrong d_");
    const f = Lr(y), g = f.toBytes(!0);
    if (!Ns(g, d))
      throw new Error("Public key does not match nonceGen argument");
    const m = this.getSessionKeyAggCoeff(f), S = Ji(i, 1n), v = nt.mul(S, nt.mul(s, y)), O = nt.add(h, nt.add(nt.mul(o, p), nt.mul(c, nt.mul(m, v)))), R = nt.toBytes(O);
    if (!r) {
      const j = hi.encode({
        R1: Lr(u),
        R2: Lr(l)
      });
      if (!this.partialSigVerifyInternal(R, j, g))
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
    if (rt(t, 32), xe(n, 66), xe(i, un), xe(s, 32), qd(o), fr(r), n.length !== i.length)
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
    xe(t, 32);
    const { Q: n, tweakAcc: r, R: i, e: s } = this;
    let o = 0n;
    for (let c = 0; c < t.length; c++) {
      const u = nt.fromBytes(t[c], !0);
      if (!nt.isValid(u))
        throw new uf(c, "psig");
      o = nt.add(o, u);
    }
    const a = Ji(n, 1n);
    return o = nt.add(o, nt.mul(s, nt.mul(a, r))), Le(co(i), nt.toBytes(o));
  }
}
function zE(e) {
  const t = FE(e);
  return { secNonce: t.secret, pubNonce: t.public };
}
function WE(e) {
  return jE(e);
}
/*! noble-hashes - MIT License (c) 2022 Paul Miller (paulmillr.com) */
function lf(e) {
  return e instanceof Uint8Array || ArrayBuffer.isView(e) && e.constructor.name === "Uint8Array";
}
function Wr(e, t = "") {
  if (!Number.isSafeInteger(e) || e < 0) {
    const n = t && `"${t}" `;
    throw new Error(`${n}expected integer >0, got ${e}`);
  }
}
function dt(e, t, n = "") {
  const r = lf(e), i = e?.length, s = t !== void 0;
  if (!r || s && i !== t) {
    const o = n && `"${n}" `, a = s ? ` of length ${t}` : "", c = r ? `length=${i}` : `type=${typeof e}`;
    throw new Error(o + "expected Uint8Array" + a + ", got " + c);
  }
  return e;
}
function By(e) {
  if (typeof e != "function" || typeof e.create != "function")
    throw new Error("Hash must wrapped by utils.createHasher");
  Wr(e.outputLen), Wr(e.blockLen);
}
function la(e, t = !0) {
  if (e.destroyed)
    throw new Error("Hash instance has been destroyed");
  if (t && e.finished)
    throw new Error("Hash#digest() has already been called");
}
function qE(e, t) {
  dt(e, void 0, "digestInto() output");
  const n = t.outputLen;
  if (e.length < n)
    throw new Error('"digestInto() output" expected to be of length >=' + n);
}
function fa(...e) {
  for (let t = 0; t < e.length; t++)
    e[t].fill(0);
}
function Gc(e) {
  return new DataView(e.buffer, e.byteOffset, e.byteLength);
}
function Ge(e, t) {
  return e << 32 - t | e >>> t;
}
const Ny = /* @ts-ignore */ typeof Uint8Array.from([]).toHex == "function" && typeof Uint8Array.fromHex == "function", GE = /* @__PURE__ */ Array.from({ length: 256 }, (e, t) => t.toString(16).padStart(2, "0"));
function cc(e) {
  if (dt(e), Ny)
    return e.toHex();
  let t = "";
  for (let n = 0; n < e.length; n++)
    t += GE[e[n]];
  return t;
}
const gn = { _0: 48, _9: 57, A: 65, F: 70, a: 97, f: 102 };
function Yd(e) {
  if (e >= gn._0 && e <= gn._9)
    return e - gn._0;
  if (e >= gn.A && e <= gn.F)
    return e - (gn.A - 10);
  if (e >= gn.a && e <= gn.f)
    return e - (gn.a - 10);
}
function da(e) {
  if (typeof e != "string")
    throw new Error("hex string expected, got " + typeof e);
  if (Ny)
    return Uint8Array.fromHex(e);
  const t = e.length, n = t / 2;
  if (t % 2)
    throw new Error("hex string expected, got unpadded hex of length " + t);
  const r = new Uint8Array(n);
  for (let i = 0, s = 0; i < n; i++, s += 2) {
    const o = Yd(e.charCodeAt(s)), a = Yd(e.charCodeAt(s + 1));
    if (o === void 0 || a === void 0) {
      const c = e[s] + e[s + 1];
      throw new Error('hex string expected, got non-hex character "' + c + '" at index ' + s);
    }
    r[i] = o * 16 + a;
  }
  return r;
}
function rn(...e) {
  let t = 0;
  for (let r = 0; r < e.length; r++) {
    const i = e[r];
    dt(i), t += i.length;
  }
  const n = new Uint8Array(t);
  for (let r = 0, i = 0; r < e.length; r++) {
    const s = e[r];
    n.set(s, i), i += s.length;
  }
  return n;
}
function YE(e, t = {}) {
  const n = (i, s) => e(s).update(i).digest(), r = e(void 0);
  return n.outputLen = r.outputLen, n.blockLen = r.blockLen, n.create = (i) => e(i), Object.assign(n, t), Object.freeze(n);
}
function uc(e = 32) {
  const t = typeof globalThis == "object" ? globalThis.crypto : null;
  if (typeof t?.getRandomValues != "function")
    throw new Error("crypto.getRandomValues must be defined");
  return t.getRandomValues(new Uint8Array(e));
}
const ZE = (e) => ({
  oid: Uint8Array.from([6, 9, 96, 134, 72, 1, 101, 3, 4, 2, e])
});
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const ff = /* @__PURE__ */ BigInt(0), Zu = /* @__PURE__ */ BigInt(1);
function ha(e, t = "") {
  if (typeof e != "boolean") {
    const n = t && `"${t}" `;
    throw new Error(n + "expected boolean, got type=" + typeof e);
  }
  return e;
}
function Ry(e) {
  if (typeof e == "bigint") {
    if (!No(e))
      throw new Error("positive bigint expected, got " + e);
  } else
    Wr(e);
  return e;
}
function uo(e) {
  const t = Ry(e).toString(16);
  return t.length & 1 ? "0" + t : t;
}
function Uy(e) {
  if (typeof e != "string")
    throw new Error("hex string expected, got " + typeof e);
  return e === "" ? ff : BigInt("0x" + e);
}
function qi(e) {
  return Uy(cc(e));
}
function Py(e) {
  return Uy(cc(XE(dt(e)).reverse()));
}
function df(e, t) {
  Wr(t), e = Ry(e);
  const n = da(e.toString(16).padStart(t * 2, "0"));
  if (n.length !== t)
    throw new Error("number too large");
  return n;
}
function Cy(e, t) {
  return df(e, t).reverse();
}
function XE(e) {
  return Uint8Array.from(e);
}
function QE(e) {
  return Uint8Array.from(e, (t, n) => {
    const r = t.charCodeAt(0);
    if (t.length !== 1 || r > 127)
      throw new Error(`string contains non-ASCII character "${e[n]}" with code ${r} at position ${n}`);
    return r;
  });
}
const No = (e) => typeof e == "bigint" && ff <= e;
function JE(e, t, n) {
  return No(e) && No(t) && No(n) && t <= e && e < n;
}
function tx(e, t, n, r) {
  if (!JE(t, n, r))
    throw new Error("expected valid " + e + ": " + n + " <= n < " + r + ", got " + t);
}
function ex(e) {
  let t;
  for (t = 0; e > ff; e >>= Zu, t += 1)
    ;
  return t;
}
const hf = (e) => (Zu << BigInt(e)) - Zu;
function nx(e, t, n) {
  if (Wr(e, "hashLen"), Wr(t, "qByteLen"), typeof n != "function")
    throw new Error("hmacFn must be a function");
  const r = (g) => new Uint8Array(g), i = Uint8Array.of(), s = Uint8Array.of(0), o = Uint8Array.of(1), a = 1e3;
  let c = r(e), u = r(e), l = 0;
  const d = () => {
    c.fill(1), u.fill(0), l = 0;
  }, h = (...g) => n(u, rn(c, ...g)), p = (g = i) => {
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
    return rn(...m);
  };
  return (g, m) => {
    d(), p(g);
    let S;
    for (; !(S = m(y())); )
      p();
    return d(), S;
  };
}
function pf(e, t = {}, n = {}) {
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
function Zd(e) {
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
const Ly = {
  p: 0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffefffffc2fn,
  n: 0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141n,
  h: 1n,
  a: 0n,
  b: 7n,
  Gx: 0x79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798n,
  Gy: 0x483ada7726a3c4655da4fbfc0e1108a8fd17b448a68554199c47d08ffb10d4b8n
}, { p: ir, n: gr, Gx: rx, Gy: ix, b: _y } = Ly, Lt = 32, qr = 64, pa = {
  publicKey: Lt + 1,
  publicKeyUncompressed: qr + 1,
  signature: qr,
  seed: Lt + Lt / 2
}, sx = (...e) => {
  "captureStackTrace" in Error && typeof Error.captureStackTrace == "function" && Error.captureStackTrace(...e);
}, lt = (e = "") => {
  const t = new Error(e);
  throw sx(t, lt), t;
}, ox = (e) => typeof e == "bigint", ax = (e) => typeof e == "string", cx = (e) => e instanceof Uint8Array || ArrayBuffer.isView(e) && e.constructor.name === "Uint8Array", fe = (e, t, n = "") => {
  const r = cx(e), i = e?.length, s = t !== void 0;
  if (!r || s && i !== t) {
    const o = n && `"${n}" `, a = s ? ` of length ${t}` : "", c = r ? `length=${i}` : `type=${typeof e}`;
    lt(o + "expected Uint8Array" + a + ", got " + c);
  }
  return e;
}, yr = (e) => new Uint8Array(e), Dy = (e, t) => e.toString(16).padStart(t, "0"), Vy = (e) => Array.from(fe(e)).map((t) => Dy(t, 2)).join(""), yn = { _0: 48, _9: 57, A: 65, F: 70, a: 97, f: 102 }, Xd = (e) => {
  if (e >= yn._0 && e <= yn._9)
    return e - yn._0;
  if (e >= yn.A && e <= yn.F)
    return e - (yn.A - 10);
  if (e >= yn.a && e <= yn.f)
    return e - (yn.a - 10);
}, My = (e) => {
  const t = "hex invalid";
  if (!ax(e))
    return lt(t);
  const n = e.length, r = n / 2;
  if (n % 2)
    return lt(t);
  const i = yr(r);
  for (let s = 0, o = 0; s < r; s++, o += 2) {
    const a = Xd(e.charCodeAt(o)), c = Xd(e.charCodeAt(o + 1));
    if (a === void 0 || c === void 0)
      return lt(t);
    i[s] = a * 16 + c;
  }
  return i;
}, Hy = () => globalThis?.crypto, Qd = () => Hy()?.subtle ?? lt("crypto.subtle must be defined, consider polyfill"), ln = (...e) => {
  const t = yr(e.reduce((r, i) => r + fe(i).length, 0));
  let n = 0;
  return e.forEach((r) => {
    t.set(r, n), n += r.length;
  }), t;
}, lc = (e = Lt) => Hy().getRandomValues(yr(e)), Ls = BigInt, Gr = (e, t, n, r = "bad number: out of range") => ox(e) && t <= e && e < n ? e : lt(r), z = (e, t = ir) => {
  const n = e % t;
  return n >= 0n ? n : t + n;
}, $n = (e) => z(e, gr), Fy = (e, t) => {
  (e === 0n || t <= 0n) && lt("no inverse n=" + e + " mod=" + t);
  let n = z(e, t), r = t, i = 0n, s = 1n;
  for (; n !== 0n; ) {
    const o = r / n, a = r % n, c = i - s * o;
    r = n, n = a, i = s, s = c;
  }
  return r === 1n ? z(i, t) : lt("no inverse");
}, jy = (e) => {
  const t = dc[e];
  return typeof t != "function" && lt("hashes." + e + " not set"), t;
}, Yc = (e) => e instanceof ti ? e : lt("Point expected"), Ky = (e) => z(z(e * e) * e + _y), Jd = (e) => Gr(e, 0n, ir), Ro = (e) => Gr(e, 1n, ir), Xu = (e) => Gr(e, 1n, gr), Ii = (e) => (e & 1n) === 0n, fc = (e) => Uint8Array.of(e), ux = (e) => fc(Ii(e) ? 2 : 3), zy = (e) => {
  const t = Ky(Ro(e));
  let n = 1n;
  for (let r = t, i = (ir + 1n) / 4n; i > 0n; i >>= 1n)
    i & 1n && (n = n * r % ir), r = r * r % ir;
  return z(n * n) === t ? n : lt("sqrt invalid");
};
let ti = class Or {
  static BASE;
  static ZERO;
  X;
  Y;
  Z;
  constructor(t, n, r) {
    this.X = Jd(t), this.Y = Ro(n), this.Z = Jd(r), Object.freeze(this);
  }
  static CURVE() {
    return Ly;
  }
  /** Create 3d xyz point from 2d xy. (0, 0) => (0, 1, 0), not (0, 0, 1) */
  static fromAffine(t) {
    const { x: n, y: r } = t;
    return n === 0n && r === 0n ? Br : new Or(n, r, 1n);
  }
  /** Convert Uint8Array or hex string to Point. */
  static fromBytes(t) {
    fe(t);
    const { publicKey: n, publicKeyUncompressed: r } = pa;
    let i;
    const s = t.length, o = t[0], a = t.subarray(1), c = Oi(a, 0, Lt);
    if (s === n && (o === 2 || o === 3)) {
      let u = zy(c);
      const l = Ii(u);
      Ii(Ls(o)) !== l && (u = z(-u)), i = new Or(c, u, 1n);
    }
    return s === r && o === 4 && (i = new Or(c, Oi(a, Lt, qr), 1n)), i ? i.assertValidity() : lt("bad point: not on curve");
  }
  static fromHex(t) {
    return Or.fromBytes(My(t));
  }
  get x() {
    return this.toAffine().x;
  }
  get y() {
    return this.toAffine().y;
  }
  /** Equality check: compare points P&Q. */
  equals(t) {
    const { X: n, Y: r, Z: i } = this, { X: s, Y: o, Z: a } = Yc(t), c = z(n * a), u = z(s * i), l = z(r * a), d = z(o * i);
    return c === u && l === d;
  }
  is0() {
    return this.equals(Br);
  }
  /** Flip point over y coordinate. */
  negate() {
    return new Or(this.X, z(-this.Y), this.Z);
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
    const { X: n, Y: r, Z: i } = this, { X: s, Y: o, Z: a } = Yc(t), c = 0n, u = _y;
    let l = 0n, d = 0n, h = 0n;
    const p = z(u * 3n);
    let y = z(n * s), f = z(r * o), g = z(i * a), m = z(n + r), S = z(s + o);
    m = z(m * S), S = z(y + f), m = z(m - S), S = z(n + i);
    let v = z(s + a);
    return S = z(S * v), v = z(y + g), S = z(S - v), v = z(r + i), l = z(o + a), v = z(v * l), l = z(f + g), v = z(v - l), h = z(c * S), l = z(p * g), h = z(l + h), l = z(f - h), h = z(f + h), d = z(l * h), f = z(y + y), f = z(f + y), g = z(c * g), S = z(p * S), f = z(f + g), g = z(y - g), g = z(c * g), S = z(S + g), y = z(f * S), d = z(d + y), y = z(v * S), l = z(m * l), l = z(l - y), y = z(m * f), h = z(v * h), h = z(h + y), new Or(l, d, h);
  }
  subtract(t) {
    return this.add(Yc(t).negate());
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
      return Br;
    if (Xu(t), t === 1n)
      return this;
    if (this.equals(wr))
      return Cx(t).p;
    let r = Br, i = wr;
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
    if (this.equals(Br))
      return { x: 0n, y: 0n };
    if (r === 1n)
      return { x: t, y: n };
    const i = Fy(r, ir);
    return z(r * i) !== 1n && lt("inverse invalid"), { x: z(t * i), y: z(n * i) };
  }
  /** Checks if the point is valid and on-curve. */
  assertValidity() {
    const { x: t, y: n } = this.toAffine();
    return Ro(t), Ro(n), z(n * n) === Ky(t) ? this : lt("bad point: not on curve");
  }
  /** Converts point to 33/65-byte Uint8Array. */
  toBytes(t = !0) {
    const { x: n, y: r } = this.assertValidity().toAffine(), i = ye(n);
    return t ? ln(ux(r), i) : ln(fc(4), i, ye(r));
  }
  toHex(t) {
    return Vy(this.toBytes(t));
  }
};
const wr = new ti(rx, ix, 1n), Br = new ti(0n, 1n, 0n);
ti.BASE = wr;
ti.ZERO = Br;
const lx = (e, t, n) => wr.multiply(t, !1).add(e.multiply(n, !1)).assertValidity(), Tr = (e) => Ls("0x" + (Vy(e) || "0")), Oi = (e, t, n) => Tr(e.subarray(t, n)), fx = 2n ** 256n, ye = (e) => My(Dy(Gr(e, 0n, fx), qr)), Wy = (e) => {
  const t = Tr(fe(e, Lt, "secret key"));
  return Gr(t, 1n, gr, "invalid secret key: outside of range");
}, qy = (e) => e > gr >> 1n, dx = (e) => {
  [0, 1, 2, 3].includes(e) || lt("recovery id must be valid and present");
}, hx = (e) => {
  e != null && !th.includes(e) && lt(`Signature format must be one of: ${th.join(", ")}`), e === Yy && lt('Signature format "der" is not supported: switch to noble-curves');
}, px = (e, t = Bi) => {
  hx(t);
  const n = pa.signature, r = n + 1;
  let i = `Signature format "${t}" expects Uint8Array with length `;
  t === Bi && e.length !== n && lt(i + n), t === ya && e.length !== r && lt(i + r);
};
class ga {
  r;
  s;
  recovery;
  constructor(t, n, r) {
    this.r = Xu(t), this.s = Xu(n), r != null && (this.recovery = r), Object.freeze(this);
  }
  static fromBytes(t, n = Bi) {
    px(t, n);
    let r;
    n === ya && (r = t[0], t = t.subarray(1));
    const i = Oi(t, 0, Lt), s = Oi(t, Lt, qr);
    return new ga(i, s, r);
  }
  addRecoveryBit(t) {
    return new ga(this.r, this.s, t);
  }
  hasHighS() {
    return qy(this.s);
  }
  toBytes(t = Bi) {
    const { r: n, s: r, recovery: i } = this, s = ln(ye(n), ye(r));
    return t === ya ? (dx(i), ln(Uint8Array.of(i), s)) : s;
  }
}
const Gy = (e) => {
  const t = e.length * 8 - 256;
  t > 1024 && lt("msg invalid");
  const n = Tr(e);
  return t > 0 ? n >> Ls(t) : n;
}, gx = (e) => $n(Gy(fe(e))), Bi = "compact", ya = "recovered", Yy = "der", th = [Bi, ya, Yy], eh = {
  lowS: !0,
  prehash: !0,
  format: Bi,
  extraEntropy: !1
}, nh = "SHA-256", dc = {
  hmacSha256Async: async (e, t) => {
    const n = Qd(), r = "HMAC", i = await n.importKey("raw", e, { name: r, hash: { name: nh } }, !1, ["sign"]);
    return yr(await n.sign(r, i, t));
  },
  hmacSha256: void 0,
  sha256Async: async (e) => yr(await Qd().digest(nh, e)),
  sha256: void 0
}, yx = (e, t, n) => (fe(e, void 0, "message"), t.prehash ? n ? dc.sha256Async(e) : jy("sha256")(e) : e), wx = yr(0), mx = fc(0), bx = fc(1), Ex = 1e3, xx = "drbg: tried max amount of iterations", Tx = async (e, t) => {
  let n = yr(Lt), r = yr(Lt), i = 0;
  const s = () => {
    n.fill(1), r.fill(0);
  }, o = (...l) => dc.hmacSha256Async(r, ln(n, ...l)), a = async (l = wx) => {
    r = await o(mx, l), n = await o(), l.length !== 0 && (r = await o(bx, l), n = await o());
  }, c = async () => (i++ >= Ex && lt(xx), n = await o(), n);
  s(), await a(e);
  let u;
  for (; !(u = t(await c())); )
    await a();
  return s(), u;
}, Sx = (e, t, n, r) => {
  let { lowS: i, extraEntropy: s } = n;
  const o = ye, a = gx(e), c = o(a), u = Wy(t), l = [o(u), c];
  if (s != null && s !== !1) {
    const y = s === !0 ? lc(Lt) : s;
    l.push(fe(y, void 0, "extraEntropy"));
  }
  const d = ln(...l), h = a;
  return r(d, (y) => {
    const f = Gy(y);
    if (!(1n <= f && f < gr))
      return;
    const g = Fy(f, gr), m = wr.multiply(f).toAffine(), S = $n(m.x);
    if (S === 0n)
      return;
    const v = $n(g * $n(h + S * u));
    if (v === 0n)
      return;
    let O = (m.x === S ? 0 : 2) | Number(m.y & 1n), R = v;
    return i && qy(v) && (R = $n(-v), O ^= 1), new ga(S, R, O).toBytes(n.format);
  });
}, vx = (e) => {
  const t = {};
  return Object.keys(eh).forEach((n) => {
    t[n] = e[n] ?? eh[n];
  }), t;
}, $x = async (e, t, n = {}) => (n = vx(n), e = await yx(e, n, !0), Sx(e, t, n, Tx)), kx = (e = lc(pa.seed)) => {
  fe(e), (e.length < pa.seed || e.length > 1024) && lt("expected 40-1024b");
  const t = z(Tr(e), gr - 1n);
  return ye(t + 1n);
}, Ax = (e) => (t) => {
  const n = kx(t);
  return { secretKey: n, publicKey: e(n) };
}, Zy = (e) => Uint8Array.from("BIP0340/" + e, (t) => t.charCodeAt(0)), Xy = "aux", Qy = "nonce", Jy = "challenge", Qu = (e, ...t) => {
  const n = jy("sha256"), r = n(Zy(e));
  return n(ln(r, r, ...t));
}, Ju = async (e, ...t) => {
  const n = dc.sha256Async, r = await n(Zy(e));
  return await n(ln(r, r, ...t));
}, gf = (e) => {
  const t = Wy(e), n = wr.multiply(t), { x: r, y: i } = n.assertValidity().toAffine(), s = Ii(i) ? t : $n(-t), o = ye(r);
  return { d: s, px: o };
}, yf = (e) => $n(Tr(e)), tw = (...e) => yf(Qu(Jy, ...e)), ew = async (...e) => yf(await Ju(Jy, ...e)), nw = (e) => gf(e).px, Ix = Ax(nw), rw = (e, t, n) => {
  const { px: r, d: i } = gf(t);
  return { m: fe(e), px: r, d: i, a: fe(n, Lt) };
}, iw = (e) => {
  const t = yf(e);
  t === 0n && lt("sign failed: k is zero");
  const { px: n, d: r } = gf(ye(t));
  return { rx: n, k: r };
}, sw = (e, t, n, r) => ln(t, ye($n(e + n * r))), ow = "invalid signature produced", Ox = (e, t, n = lc(Lt)) => {
  const { m: r, px: i, d: s, a: o } = rw(e, t, n), a = Qu(Xy, o), c = ye(s ^ Tr(a)), u = Qu(Qy, c, i, r), { rx: l, k: d } = iw(u), h = tw(l, i, r), p = sw(d, l, h, s);
  return cw(p, r, i) || lt(ow), p;
}, Bx = async (e, t, n = lc(Lt)) => {
  const { m: r, px: i, d: s, a: o } = rw(e, t, n), a = await Ju(Xy, o), c = ye(s ^ Tr(a)), u = await Ju(Qy, c, i, r), { rx: l, k: d } = iw(u), h = await ew(l, i, r), p = sw(d, l, h, s);
  return await uw(p, r, i) || lt(ow), p;
}, Nx = (e, t) => e instanceof Promise ? e.then(t) : t(e), aw = (e, t, n, r) => {
  const i = fe(e, qr, "signature"), s = fe(t, void 0, "message"), o = fe(n, Lt, "publicKey");
  try {
    const a = Tr(o), c = zy(a), u = Ii(c) ? c : z(-c), l = new ti(a, u, 1n).assertValidity(), d = ye(l.toAffine().x), h = Oi(i, 0, Lt);
    Gr(h, 1n, ir);
    const p = Oi(i, Lt, qr);
    Gr(p, 1n, gr);
    const y = ln(ye(h), d, s);
    return Nx(r(y), (f) => {
      const { x: g, y: m } = lx(l, p, $n(-f)).toAffine();
      return !(!Ii(m) || g !== h);
    });
  } catch {
    return !1;
  }
}, cw = (e, t, n) => aw(e, t, n, tw), uw = async (e, t, n) => aw(e, t, n, ew), Rx = {
  keygen: Ix,
  getPublicKey: nw,
  sign: Ox,
  verify: cw,
  signAsync: Bx,
  verifyAsync: uw
}, wa = 8, Ux = 256, lw = Math.ceil(Ux / wa) + 1, tl = 2 ** (wa - 1), Px = () => {
  const e = [];
  let t = wr, n = t;
  for (let r = 0; r < lw; r++) {
    n = t, e.push(n);
    for (let i = 1; i < tl; i++)
      n = n.add(t), e.push(n);
    t = n.double();
  }
  return e;
};
let rh;
const ih = (e, t) => {
  const n = t.negate();
  return e ? n : t;
}, Cx = (e) => {
  const t = rh || (rh = Px());
  let n = Br, r = wr;
  const i = 2 ** wa, s = i, o = Ls(i - 1), a = Ls(wa);
  for (let c = 0; c < lw; c++) {
    let u = Number(e & o);
    e >>= a, u > tl && (u -= s, e += 1n);
    const l = c * tl, d = l, h = l + Math.abs(u) - 1, p = c % 2 !== 0, y = u < 0;
    u === 0 ? r = r.add(ih(p, t[d])) : n = n.add(ih(y, t[h]));
  }
  return e !== 0n && lt("invalid wnaf"), { p: n, f: r };
};
function Lx(e, t, n) {
  return e & t ^ ~e & n;
}
function _x(e, t, n) {
  return e & t ^ e & n ^ t & n;
}
let Dx = class {
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
    this.blockLen = t, this.outputLen = n, this.padOffset = r, this.isLE = i, this.buffer = new Uint8Array(t), this.view = Gc(this.buffer);
  }
  update(t) {
    la(this), dt(t);
    const { view: n, buffer: r, blockLen: i } = this, s = t.length;
    for (let o = 0; o < s; ) {
      const a = Math.min(i - this.pos, s - o);
      if (a === i) {
        const c = Gc(t);
        for (; i <= s - o; o += i)
          this.process(c, o);
        continue;
      }
      r.set(t.subarray(o, o + a), this.pos), this.pos += a, o += a, this.pos === i && (this.process(n, 0), this.pos = 0);
    }
    return this.length += t.length, this.roundClean(), this;
  }
  digestInto(t) {
    la(this), qE(t, this), this.finished = !0;
    const { buffer: n, view: r, blockLen: i, isLE: s } = this;
    let { pos: o } = this;
    n[o++] = 128, fa(this.buffer.subarray(o)), this.padOffset > i - o && (this.process(r, 0), o = 0);
    for (let d = o; d < i; d++)
      n[d] = 0;
    r.setBigUint64(i - 8, BigInt(this.length * 8), s), this.process(r, 0);
    const a = Gc(t), c = this.outputLen;
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
const Dn = /* @__PURE__ */ Uint32Array.from([
  1779033703,
  3144134277,
  1013904242,
  2773480762,
  1359893119,
  2600822924,
  528734635,
  1541459225
]), Vx = /* @__PURE__ */ Uint32Array.from([
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
]), Vn = /* @__PURE__ */ new Uint32Array(64);
let Mx = class extends Dx {
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
      Vn[d] = t.getUint32(n, !1);
    for (let d = 16; d < 64; d++) {
      const h = Vn[d - 15], p = Vn[d - 2], y = Ge(h, 7) ^ Ge(h, 18) ^ h >>> 3, f = Ge(p, 17) ^ Ge(p, 19) ^ p >>> 10;
      Vn[d] = f + Vn[d - 7] + y + Vn[d - 16] | 0;
    }
    let { A: r, B: i, C: s, D: o, E: a, F: c, G: u, H: l } = this;
    for (let d = 0; d < 64; d++) {
      const h = Ge(a, 6) ^ Ge(a, 11) ^ Ge(a, 25), p = l + h + Lx(a, c, u) + Vx[d] + Vn[d] | 0, f = (Ge(r, 2) ^ Ge(r, 13) ^ Ge(r, 22)) + _x(r, i, s) | 0;
      l = u, u = c, c = a, a = o + p | 0, o = s, s = i, i = r, r = p + f | 0;
    }
    r = r + this.A | 0, i = i + this.B | 0, s = s + this.C | 0, o = o + this.D | 0, a = a + this.E | 0, c = c + this.F | 0, u = u + this.G | 0, l = l + this.H | 0, this.set(r, i, s, o, a, c, u, l);
  }
  roundClean() {
    fa(Vn);
  }
  destroy() {
    this.set(0, 0, 0, 0, 0, 0, 0, 0), fa(this.buffer);
  }
}, Hx = class extends Mx {
  // We cannot use array here since array allows indexing by variable
  // which means optimizer/compiler cannot use registers.
  A = Dn[0] | 0;
  B = Dn[1] | 0;
  C = Dn[2] | 0;
  D = Dn[3] | 0;
  E = Dn[4] | 0;
  F = Dn[5] | 0;
  G = Dn[6] | 0;
  H = Dn[7] | 0;
  constructor() {
    super(32);
  }
};
const el = /* @__PURE__ */ YE(
  () => new Hx(),
  /* @__PURE__ */ ZE(1)
);
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const Qt = /* @__PURE__ */ BigInt(0), Wt = /* @__PURE__ */ BigInt(1), _r = /* @__PURE__ */ BigInt(2), fw = /* @__PURE__ */ BigInt(3), dw = /* @__PURE__ */ BigInt(4), hw = /* @__PURE__ */ BigInt(5), Fx = /* @__PURE__ */ BigInt(7), pw = /* @__PURE__ */ BigInt(8), jx = /* @__PURE__ */ BigInt(9), gw = /* @__PURE__ */ BigInt(16);
function Be(e, t) {
  const n = e % t;
  return n >= Qt ? n : t + n;
}
function me(e, t, n) {
  let r = e;
  for (; t-- > Qt; )
    r *= r, r %= n;
  return r;
}
function sh(e, t) {
  if (e === Qt)
    throw new Error("invert: expected non-zero number");
  if (t <= Qt)
    throw new Error("invert: expected positive modulus, got " + t);
  let n = Be(e, t), r = t, i = Qt, s = Wt;
  for (; n !== Qt; ) {
    const a = r / n, c = r % n, u = i - s * a;
    r = n, n = c, i = s, s = u;
  }
  if (r !== Wt)
    throw new Error("invert: does not exist");
  return Be(i, t);
}
function wf(e, t, n) {
  if (!e.eql(e.sqr(t), n))
    throw new Error("Cannot find square root");
}
function yw(e, t) {
  const n = (e.ORDER + Wt) / dw, r = e.pow(t, n);
  return wf(e, r, t), r;
}
function Kx(e, t) {
  const n = (e.ORDER - hw) / pw, r = e.mul(t, _r), i = e.pow(r, n), s = e.mul(t, i), o = e.mul(e.mul(s, _r), i), a = e.mul(s, e.sub(o, e.ONE));
  return wf(e, a, t), a;
}
function zx(e) {
  const t = hc(e), n = ww(e), r = n(t, t.neg(t.ONE)), i = n(t, r), s = n(t, t.neg(r)), o = (e + Fx) / gw;
  return (a, c) => {
    let u = a.pow(c, o), l = a.mul(u, r);
    const d = a.mul(u, i), h = a.mul(u, s), p = a.eql(a.sqr(l), c), y = a.eql(a.sqr(d), c);
    u = a.cmov(u, l, p), l = a.cmov(h, d, y);
    const f = a.eql(a.sqr(l), c), g = a.cmov(u, l, f);
    return wf(a, g, c), g;
  };
}
function ww(e) {
  if (e < fw)
    throw new Error("sqrt is not defined for small field");
  let t = e - Wt, n = 0;
  for (; t % _r === Qt; )
    t /= _r, n++;
  let r = _r;
  const i = hc(e);
  for (; oh(i, r) === 1; )
    if (r++ > 1e3)
      throw new Error("Cannot find square root: probably non-prime P");
  if (n === 1)
    return yw;
  let s = i.pow(r, t);
  const o = (t + Wt) / _r;
  return function(c, u) {
    if (c.is0(u))
      return u;
    if (oh(c, u) !== 1)
      throw new Error("Cannot find square root");
    let l = n, d = c.mul(c.ONE, s), h = c.pow(u, t), p = c.pow(u, o);
    for (; !c.eql(h, c.ONE); ) {
      if (c.is0(h))
        return c.ZERO;
      let y = 1, f = c.sqr(h);
      for (; !c.eql(f, c.ONE); )
        if (y++, f = c.sqr(f), y === l)
          throw new Error("Cannot find square root");
      const g = Wt << BigInt(l - y - 1), m = c.pow(d, g);
      l = y, d = c.sqr(m), h = c.mul(h, d), p = c.mul(p, m);
    }
    return p;
  };
}
function Wx(e) {
  return e % dw === fw ? yw : e % pw === hw ? Kx : e % gw === jx ? zx(e) : ww(e);
}
const qx = [
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
function Gx(e) {
  const t = {
    ORDER: "bigint",
    BYTES: "number",
    BITS: "number"
  }, n = qx.reduce((r, i) => (r[i] = "function", r), t);
  return pf(e, n), e;
}
function Yx(e, t, n) {
  if (n < Qt)
    throw new Error("invalid exponent, negatives unsupported");
  if (n === Qt)
    return e.ONE;
  if (n === Wt)
    return t;
  let r = e.ONE, i = t;
  for (; n > Qt; )
    n & Wt && (r = e.mul(r, i)), i = e.sqr(i), n >>= Wt;
  return r;
}
function mw(e, t, n = !1) {
  const r = new Array(t.length).fill(n ? e.ZERO : void 0), i = t.reduce((o, a, c) => e.is0(a) ? o : (r[c] = o, e.mul(o, a)), e.ONE), s = e.inv(i);
  return t.reduceRight((o, a, c) => e.is0(a) ? o : (r[c] = e.mul(o, r[c]), e.mul(o, a)), s), r;
}
function oh(e, t) {
  const n = (e.ORDER - Wt) / _r, r = e.pow(t, n), i = e.eql(r, e.ONE), s = e.eql(r, e.ZERO), o = e.eql(r, e.neg(e.ONE));
  if (!i && !s && !o)
    throw new Error("invalid Legendre symbol result");
  return i ? 1 : s ? 0 : -1;
}
function Zx(e, t) {
  t !== void 0 && Wr(t);
  const n = t !== void 0 ? t : e.toString(2).length, r = Math.ceil(n / 8);
  return { nBitLength: n, nByteLength: r };
}
let Xx = class {
  ORDER;
  BITS;
  BYTES;
  isLE;
  ZERO = Qt;
  ONE = Wt;
  _lengths;
  _sqrt;
  // cached sqrt
  _mod;
  constructor(t, n = {}) {
    if (t <= Qt)
      throw new Error("invalid field: expected ORDER > 0, got " + t);
    let r;
    this.isLE = !1, n != null && typeof n == "object" && (typeof n.BITS == "number" && (r = n.BITS), typeof n.sqrt == "function" && (this.sqrt = n.sqrt), typeof n.isLE == "boolean" && (this.isLE = n.isLE), n.allowedLengths && (this._lengths = n.allowedLengths?.slice()), typeof n.modFromBytes == "boolean" && (this._mod = n.modFromBytes));
    const { nBitLength: i, nByteLength: s } = Zx(t, r);
    if (s > 2048)
      throw new Error("invalid field: expected ORDER of <= 2048 bytes");
    this.ORDER = t, this.BITS = i, this.BYTES = s, this._sqrt = void 0, Object.preventExtensions(this);
  }
  create(t) {
    return Be(t, this.ORDER);
  }
  isValid(t) {
    if (typeof t != "bigint")
      throw new Error("invalid field element: expected bigint, got " + typeof t);
    return Qt <= t && t < this.ORDER;
  }
  is0(t) {
    return t === Qt;
  }
  // is valid and invertible
  isValidNot0(t) {
    return !this.is0(t) && this.isValid(t);
  }
  isOdd(t) {
    return (t & Wt) === Wt;
  }
  neg(t) {
    return Be(-t, this.ORDER);
  }
  eql(t, n) {
    return t === n;
  }
  sqr(t) {
    return Be(t * t, this.ORDER);
  }
  add(t, n) {
    return Be(t + n, this.ORDER);
  }
  sub(t, n) {
    return Be(t - n, this.ORDER);
  }
  mul(t, n) {
    return Be(t * n, this.ORDER);
  }
  pow(t, n) {
    return Yx(this, t, n);
  }
  div(t, n) {
    return Be(t * sh(n, this.ORDER), this.ORDER);
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
    return sh(t, this.ORDER);
  }
  sqrt(t) {
    return this._sqrt || (this._sqrt = Wx(this.ORDER)), this._sqrt(this, t);
  }
  toBytes(t) {
    return this.isLE ? Cy(t, this.BYTES) : df(t, this.BYTES);
  }
  fromBytes(t, n = !1) {
    dt(t);
    const { _lengths: r, BYTES: i, isLE: s, ORDER: o, _mod: a } = this;
    if (r) {
      if (!r.includes(t.length) || t.length > i)
        throw new Error("Field.fromBytes: expected " + r + " bytes, got " + t.length);
      const u = new Uint8Array(i);
      u.set(t, s ? 0 : u.length - t.length), t = u;
    }
    if (t.length !== i)
      throw new Error("Field.fromBytes: expected " + i + " bytes, got " + t.length);
    let c = s ? Py(t) : qi(t);
    if (a && (c = Be(c, o)), !n && !this.isValid(c))
      throw new Error("invalid field element: outside of range 0..ORDER");
    return c;
  }
  // TODO: we don't need it here, move out to separate fn
  invertBatch(t) {
    return mw(this, t);
  }
  // We can't move this out because Fp6, Fp12 implement it
  // and it's unclear what to return in there.
  cmov(t, n, r) {
    return r ? n : t;
  }
};
function hc(e, t = {}) {
  return new Xx(e, t);
}
function bw(e) {
  if (typeof e != "bigint")
    throw new Error("field order must be bigint");
  const t = e.toString(2).length;
  return Math.ceil(t / 8);
}
function Ew(e) {
  const t = bw(e);
  return t + Math.ceil(t / 2);
}
function xw(e, t, n = !1) {
  dt(e);
  const r = e.length, i = bw(t), s = Ew(t);
  if (r < 16 || r < s || r > 1024)
    throw new Error("expected " + s + "-1024 bytes of input, got " + r);
  const o = n ? Py(e) : qi(e), a = Be(o, t - Wt) + Wt;
  return n ? Cy(a, i) : df(a, i);
}
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const Ni = /* @__PURE__ */ BigInt(0), Dr = /* @__PURE__ */ BigInt(1);
function ma(e, t) {
  const n = t.negate();
  return e ? n : t;
}
function ah(e, t) {
  const n = mw(e.Fp, t.map((r) => r.Z));
  return t.map((r, i) => e.fromAffine(r.toAffine(n[i])));
}
function Tw(e, t) {
  if (!Number.isSafeInteger(e) || e <= 0 || e > t)
    throw new Error("invalid window size, expected [1.." + t + "], got W=" + e);
}
function Zc(e, t) {
  Tw(e, t);
  const n = Math.ceil(t / e) + 1, r = 2 ** (e - 1), i = 2 ** e, s = hf(e), o = BigInt(e);
  return { windows: n, windowSize: r, mask: s, maxNumber: i, shiftBy: o };
}
function ch(e, t, n) {
  const { windowSize: r, mask: i, maxNumber: s, shiftBy: o } = n;
  let a = Number(e & i), c = e >> o;
  a > r && (a -= s, c += Dr);
  const u = t * r, l = u + Math.abs(a) - 1, d = a === 0, h = a < 0, p = t % 2 !== 0;
  return { nextN: c, offset: l, isZero: d, isNeg: h, isNegF: p, offsetF: u };
}
const Xc = /* @__PURE__ */ new WeakMap(), Sw = /* @__PURE__ */ new WeakMap();
function Qc(e) {
  return Sw.get(e) || 1;
}
function uh(e) {
  if (e !== Ni)
    throw new Error("invalid wNAF");
}
let Qx = class {
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
    for (; n > Ni; )
      n & Dr && (r = r.add(i)), i = i.double(), n >>= Dr;
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
    const { windows: r, windowSize: i } = Zc(n, this.bits), s = [];
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
    const o = Zc(t, this.bits);
    for (let a = 0; a < o.windows; a++) {
      const { nextN: c, offset: u, isZero: l, isNeg: d, isNegF: h, offsetF: p } = ch(r, a, o);
      r = c, l ? s = s.add(ma(h, n[p])) : i = i.add(ma(d, n[u]));
    }
    return uh(r), { p: i, f: s };
  }
  /**
   * Implements ec unsafe (non const-time) multiplication using precomputed tables and w-ary non-adjacent form.
   * @param acc accumulator point to add result of multiplication
   * @returns point
   */
  wNAFUnsafe(t, n, r, i = this.ZERO) {
    const s = Zc(t, this.bits);
    for (let o = 0; o < s.windows && r !== Ni; o++) {
      const { nextN: a, offset: c, isZero: u, isNeg: l } = ch(r, o, s);
      if (r = a, !u) {
        const d = n[c];
        i = i.add(l ? d.negate() : d);
      }
    }
    return uh(r), i;
  }
  getPrecomputes(t, n, r) {
    let i = Xc.get(n);
    return i || (i = this.precomputeWindow(n, t), t !== 1 && (typeof r == "function" && (i = r(i)), Xc.set(n, i))), i;
  }
  cached(t, n, r) {
    const i = Qc(t);
    return this.wNAF(i, this.getPrecomputes(i, t, r), n);
  }
  unsafe(t, n, r, i) {
    const s = Qc(t);
    return s === 1 ? this._unsafeLadder(t, n, i) : this.wNAFUnsafe(s, this.getPrecomputes(s, t, r), n, i);
  }
  // We calculate precomputes for elliptic curve point multiplication
  // using windowed method. This specifies window size and
  // stores precomputed values. Usually only base point would be precomputed.
  createCache(t, n) {
    Tw(n, this.bits), Sw.set(t, n), Xc.delete(t);
  }
  hasCache(t) {
    return Qc(t) !== 1;
  }
};
function Jx(e, t, n, r) {
  let i = t, s = e.ZERO, o = e.ZERO;
  for (; n > Ni || r > Ni; )
    n & Dr && (s = s.add(i)), r & Dr && (o = o.add(i)), i = i.double(), n >>= Dr, r >>= Dr;
  return { p1: s, p2: o };
}
function lh(e, t, n) {
  if (t) {
    if (t.ORDER !== e)
      throw new Error("Field.ORDER must match order: Fp == p, Fn == n");
    return Gx(t), t;
  } else
    return hc(e, { isLE: n });
}
function tT(e, t, n = {}, r) {
  if (r === void 0 && (r = e === "edwards"), !t || typeof t != "object")
    throw new Error(`expected valid ${e} CURVE object`);
  for (const c of ["p", "n", "h"]) {
    const u = t[c];
    if (!(typeof u == "bigint" && u > Ni))
      throw new Error(`CURVE.${c} must be positive bigint`);
  }
  const i = lh(t.p, n.Fp, r), s = lh(t.n, n.Fn, r), a = ["Gx", "Gy", "a", "b"];
  for (const c of a)
    if (!i.isValid(t[c]))
      throw new Error(`CURVE.${c} must be valid field element of CURVE.Fp`);
  return t = Object.freeze(Object.assign({}, t)), { CURVE: t, Fp: i, Fn: s };
}
function vw(e, t) {
  return function(r) {
    const i = e(r);
    return { secretKey: i, publicKey: t(i) };
  };
}
let $w = class {
  oHash;
  iHash;
  blockLen;
  outputLen;
  finished = !1;
  destroyed = !1;
  constructor(t, n) {
    if (By(t), dt(n, void 0, "key"), this.iHash = t.create(), typeof this.iHash.update != "function")
      throw new Error("Expected instance of class which extends utils.Hash");
    this.blockLen = this.iHash.blockLen, this.outputLen = this.iHash.outputLen;
    const r = this.blockLen, i = new Uint8Array(r);
    i.set(n.length > r ? t.create().update(n).digest() : n);
    for (let s = 0; s < i.length; s++)
      i[s] ^= 54;
    this.iHash.update(i), this.oHash = t.create();
    for (let s = 0; s < i.length; s++)
      i[s] ^= 106;
    this.oHash.update(i), fa(i);
  }
  update(t) {
    return la(this), this.iHash.update(t), this;
  }
  digestInto(t) {
    la(this), dt(t, this.outputLen, "output"), this.finished = !0, this.iHash.digestInto(t), this.oHash.update(t), this.oHash.digestInto(t), this.destroy();
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
const kw = (e, t, n) => new $w(e, t).update(n).digest();
kw.create = (e, t) => new $w(e, t);
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const fh = (e, t) => (e + (e >= 0 ? t : -t) / Aw) / t;
function eT(e, t, n) {
  const [[r, i], [s, o]] = t, a = fh(o * e, n), c = fh(-i * e, n);
  let u = e - a * r - c * s, l = -a * i - c * o;
  const d = u < kn, h = l < kn;
  d && (u = -u), h && (l = -l);
  const p = hf(Math.ceil(ex(n) / 2)) + pi;
  if (u < kn || u >= p || l < kn || l >= p)
    throw new Error("splitScalar (endomorphism): failed, k=" + e);
  return { k1neg: d, k1: u, k2neg: h, k2: l };
}
function nl(e) {
  if (!["compact", "recovered", "der"].includes(e))
    throw new Error('Signature format must be "compact", "recovered", or "der"');
  return e;
}
function Jc(e, t) {
  const n = {};
  for (let r of Object.keys(t))
    n[r] = e[r] === void 0 ? t[r] : e[r];
  return ha(n.lowS, "lowS"), ha(n.prehash, "prehash"), n.format !== void 0 && nl(n.format), n;
}
let nT = class extends Error {
  constructor(t = "") {
    super(t);
  }
};
const Kn = {
  // asn.1 DER encoding utils
  Err: nT,
  // Basic building block is TLV (Tag-Length-Value)
  _tlv: {
    encode: (e, t) => {
      const { Err: n } = Kn;
      if (e < 0 || e > 256)
        throw new n("tlv.encode: wrong tag");
      if (t.length & 1)
        throw new n("tlv.encode: unpadded data");
      const r = t.length / 2, i = uo(r);
      if (i.length / 2 & 128)
        throw new n("tlv.encode: long form length too big");
      const s = r > 127 ? uo(i.length / 2 | 128) : "";
      return uo(e) + s + i + t;
    },
    // v - value, l - left bytes (unparsed)
    decode(e, t) {
      const { Err: n } = Kn;
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
      const { Err: t } = Kn;
      if (e < kn)
        throw new t("integer: negative integers are not allowed");
      let n = uo(e);
      if (Number.parseInt(n[0], 16) & 8 && (n = "00" + n), n.length & 1)
        throw new t("unexpected DER parsing assertion: unpadded hex");
      return n;
    },
    decode(e) {
      const { Err: t } = Kn;
      if (e[0] & 128)
        throw new t("invalid signature integer: negative");
      if (e[0] === 0 && !(e[1] & 128))
        throw new t("invalid signature integer: unnecessary leading zero");
      return qi(e);
    }
  },
  toSig(e) {
    const { Err: t, _int: n, _tlv: r } = Kn, i = dt(e, void 0, "signature"), { v: s, l: o } = r.decode(48, i);
    if (o.length)
      throw new t("invalid signature: left bytes after parsing");
    const { v: a, l: c } = r.decode(2, s), { v: u, l } = r.decode(2, c);
    if (l.length)
      throw new t("invalid signature: left bytes after parsing");
    return { r: n.decode(a), s: n.decode(u) };
  },
  hexFromSig(e) {
    const { _tlv: t, _int: n } = Kn, r = t.encode(2, n.encode(e.r)), i = t.encode(2, n.encode(e.s)), s = r + i;
    return t.encode(48, s);
  }
}, kn = BigInt(0), pi = BigInt(1), Aw = BigInt(2), lo = BigInt(3), rT = BigInt(4);
function iT(e, t = {}) {
  const n = tT("weierstrass", e, t), { Fp: r, Fn: i } = n;
  let s = n.CURVE;
  const { h: o, n: a } = s;
  pf(t, {}, {
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
  const u = Ow(r, i);
  function l() {
    if (!r.isOdd)
      throw new Error("compression is not supported: Field does not have .isOdd()");
  }
  function d(L, T, x) {
    const { x: w, y: E } = T.toAffine(), k = r.toBytes(w);
    if (ha(x, "isCompressed"), x) {
      l();
      const I = !r.isOdd(E);
      return rn(Iw(I), k);
    } else
      return rn(Uint8Array.of(4), k, r.toBytes(E));
  }
  function h(L) {
    dt(L, void 0, "Point");
    const { publicKey: T, publicKeyUncompressed: x } = u, w = L.length, E = L[0], k = L.subarray(1);
    if (w === T && (E === 2 || E === 3)) {
      const I = r.fromBytes(k);
      if (!r.isValid(I))
        throw new Error("bad point: is not on curve, wrong x");
      const A = f(I);
      let $;
      try {
        $ = r.sqrt(A);
      } catch (K) {
        const M = K instanceof Error ? ": " + K.message : "";
        throw new Error("bad point: is not on curve, sqrt error" + M);
      }
      l();
      const B = r.isOdd($);
      return (E & 1) === 1 !== B && ($ = r.neg($)), { x: I, y: $ };
    } else if (w === x && E === 4) {
      const I = r.BYTES, A = r.fromBytes(k.subarray(0, I)), $ = r.fromBytes(k.subarray(I, I * 2));
      if (!g(A, $))
        throw new Error("bad point: is not on curve");
      return { x: A, y: $ };
    } else
      throw new Error(`bad point: got length ${w}, expected compressed=${T} or uncompressed=${x}`);
  }
  const p = t.toBytes || d, y = t.fromBytes || h;
  function f(L) {
    const T = r.sqr(L), x = r.mul(T, L);
    return r.add(r.add(x, r.mul(L, s.a)), s.b);
  }
  function g(L, T) {
    const x = r.sqr(T), w = f(L);
    return r.eql(x, w);
  }
  if (!g(s.Gx, s.Gy))
    throw new Error("bad curve params: generator point");
  const m = r.mul(r.pow(s.a, lo), rT), S = r.mul(r.sqr(s.b), BigInt(27));
  if (r.is0(r.add(m, S)))
    throw new Error("bad curve params: a or b");
  function v(L, T, x = !1) {
    if (!r.isValid(T) || x && r.is0(T))
      throw new Error(`bad point coordinate ${L}`);
    return T;
  }
  function O(L) {
    if (!(L instanceof U))
      throw new Error("Weierstrass Point expected");
  }
  function R(L) {
    if (!c || !c.basises)
      throw new Error("no endo");
    return eT(L, c.basises, i.ORDER);
  }
  const j = Zd((L, T) => {
    const { X: x, Y: w, Z: E } = L;
    if (r.eql(E, r.ONE))
      return { x, y: w };
    const k = L.is0();
    T == null && (T = k ? r.ONE : r.inv(E));
    const I = r.mul(x, T), A = r.mul(w, T), $ = r.mul(E, T);
    if (k)
      return { x: r.ZERO, y: r.ZERO };
    if (!r.eql($, r.ONE))
      throw new Error("invZ was invalid");
    return { x: I, y: A };
  }), b = Zd((L) => {
    if (L.is0()) {
      if (t.allowInfinityPoint && !r.is0(L.Y))
        return;
      throw new Error("bad point: ZERO");
    }
    const { x: T, y: x } = L.toAffine();
    if (!r.isValid(T) || !r.isValid(x))
      throw new Error("bad point: x or y not field elements");
    if (!g(T, x))
      throw new Error("bad point: equation left != right");
    if (!L.isTorsionFree())
      throw new Error("bad point: not in prime-order subgroup");
    return !0;
  });
  function W(L, T, x, w, E) {
    return x = new U(r.mul(x.X, L), x.Y, x.Z), T = ma(w, T), x = ma(E, x), T.add(x);
  }
  class U {
    // base / generator point
    static BASE = new U(s.Gx, s.Gy, r.ONE);
    // zero / infinity / identity point
    static ZERO = new U(r.ZERO, r.ONE, r.ZERO);
    // 0, 1, 0
    // math field
    static Fp = r;
    // scalar field
    static Fn = i;
    X;
    Y;
    Z;
    /** Does NOT validate if the point is valid. Use `.assertValidity()`. */
    constructor(T, x, w) {
      this.X = v("x", T), this.Y = v("y", x, !0), this.Z = v("z", w), Object.freeze(this);
    }
    static CURVE() {
      return s;
    }
    /** Does NOT validate if the point is valid. Use `.assertValidity()`. */
    static fromAffine(T) {
      const { x, y: w } = T || {};
      if (!T || !r.isValid(x) || !r.isValid(w))
        throw new Error("invalid affine point");
      if (T instanceof U)
        throw new Error("projective point not allowed");
      return r.is0(x) && r.is0(w) ? U.ZERO : new U(x, w, r.ONE);
    }
    static fromBytes(T) {
      const x = U.fromAffine(y(dt(T, void 0, "point")));
      return x.assertValidity(), x;
    }
    static fromHex(T) {
      return U.fromBytes(da(T));
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
    precompute(T = 8, x = !0) {
      return et.createCache(this, T), x || this.multiply(lo), this;
    }
    // TODO: return `this`
    /** A point on curve is valid if it conforms to equation. */
    assertValidity() {
      b(this);
    }
    hasEvenY() {
      const { y: T } = this.toAffine();
      if (!r.isOdd)
        throw new Error("Field doesn't support isOdd");
      return !r.isOdd(T);
    }
    /** Compare one point to another. */
    equals(T) {
      O(T);
      const { X: x, Y: w, Z: E } = this, { X: k, Y: I, Z: A } = T, $ = r.eql(r.mul(x, A), r.mul(k, E)), B = r.eql(r.mul(w, A), r.mul(I, E));
      return $ && B;
    }
    /** Flips point to one corresponding to (x, -y) in Affine coordinates. */
    negate() {
      return new U(this.X, r.neg(this.Y), this.Z);
    }
    // Renes-Costello-Batina exception-free doubling formula.
    // There is 30% faster Jacobian formula, but it is not complete.
    // https://eprint.iacr.org/2015/1060, algorithm 3
    // Cost: 8M + 3S + 3*a + 2*b3 + 15add.
    double() {
      const { a: T, b: x } = s, w = r.mul(x, lo), { X: E, Y: k, Z: I } = this;
      let A = r.ZERO, $ = r.ZERO, B = r.ZERO, N = r.mul(E, E), K = r.mul(k, k), M = r.mul(I, I), C = r.mul(E, k);
      return C = r.add(C, C), B = r.mul(E, I), B = r.add(B, B), A = r.mul(T, B), $ = r.mul(w, M), $ = r.add(A, $), A = r.sub(K, $), $ = r.add(K, $), $ = r.mul(A, $), A = r.mul(C, A), B = r.mul(w, B), M = r.mul(T, M), C = r.sub(N, M), C = r.mul(T, C), C = r.add(C, B), B = r.add(N, N), N = r.add(B, N), N = r.add(N, M), N = r.mul(N, C), $ = r.add($, N), M = r.mul(k, I), M = r.add(M, M), N = r.mul(M, C), A = r.sub(A, N), B = r.mul(M, K), B = r.add(B, B), B = r.add(B, B), new U(A, $, B);
    }
    // Renes-Costello-Batina exception-free addition formula.
    // There is 30% faster Jacobian formula, but it is not complete.
    // https://eprint.iacr.org/2015/1060, algorithm 1
    // Cost: 12M + 0S + 3*a + 3*b3 + 23add.
    add(T) {
      O(T);
      const { X: x, Y: w, Z: E } = this, { X: k, Y: I, Z: A } = T;
      let $ = r.ZERO, B = r.ZERO, N = r.ZERO;
      const K = s.a, M = r.mul(s.b, lo);
      let C = r.mul(x, k), H = r.mul(w, I), q = r.mul(E, A), ot = r.add(x, w), F = r.add(k, I);
      ot = r.mul(ot, F), F = r.add(C, H), ot = r.sub(ot, F), F = r.add(x, E);
      let Z = r.add(k, A);
      return F = r.mul(F, Z), Z = r.add(C, q), F = r.sub(F, Z), Z = r.add(w, E), $ = r.add(I, A), Z = r.mul(Z, $), $ = r.add(H, q), Z = r.sub(Z, $), N = r.mul(K, F), $ = r.mul(M, q), N = r.add($, N), $ = r.sub(H, N), N = r.add(H, N), B = r.mul($, N), H = r.add(C, C), H = r.add(H, C), q = r.mul(K, q), F = r.mul(M, F), H = r.add(H, q), q = r.sub(C, q), q = r.mul(K, q), F = r.add(F, q), C = r.mul(H, F), B = r.add(B, C), C = r.mul(Z, F), $ = r.mul(ot, $), $ = r.sub($, C), C = r.mul(ot, H), N = r.mul(Z, N), N = r.add(N, C), new U($, B, N);
    }
    subtract(T) {
      return this.add(T.negate());
    }
    is0() {
      return this.equals(U.ZERO);
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
      const { endo: x } = t;
      if (!i.isValidNot0(T))
        throw new Error("invalid scalar: out of range");
      let w, E;
      const k = (I) => et.cached(this, I, (A) => ah(U, A));
      if (x) {
        const { k1neg: I, k1: A, k2neg: $, k2: B } = R(T), { p: N, f: K } = k(A), { p: M, f: C } = k(B);
        E = K.add(C), w = W(x.beta, N, M, I, $);
      } else {
        const { p: I, f: A } = k(T);
        w = I, E = A;
      }
      return ah(U, [w, E])[0];
    }
    /**
     * Non-constant-time multiplication. Uses double-and-add algorithm.
     * It's faster, but should only be used when you don't care about
     * an exposed secret key e.g. sig verification, which works over *public* keys.
     */
    multiplyUnsafe(T) {
      const { endo: x } = t, w = this;
      if (!i.isValid(T))
        throw new Error("invalid scalar: out of range");
      if (T === kn || w.is0())
        return U.ZERO;
      if (T === pi)
        return w;
      if (et.hasCache(this))
        return this.multiply(T);
      if (x) {
        const { k1neg: E, k1: k, k2neg: I, k2: A } = R(T), { p1: $, p2: B } = Jx(U, w, k, A);
        return W(x.beta, $, B, E, I);
      } else
        return et.unsafe(w, T);
    }
    /**
     * Converts Projective point to affine (x, y) coordinates.
     * @param invertedZ Z^-1 (inverted zero) - optional, precomputation is useful for invertBatch
     */
    toAffine(T) {
      return j(this, T);
    }
    /**
     * Checks whether Point is free of torsion elements (is in prime subgroup).
     * Always torsion-free for cofactor=1 curves.
     */
    isTorsionFree() {
      const { isTorsionFree: T } = t;
      return o === pi ? !0 : T ? T(U, this) : et.unsafe(this, a).is0();
    }
    clearCofactor() {
      const { clearCofactor: T } = t;
      return o === pi ? this : T ? T(U, this) : this.multiplyUnsafe(o);
    }
    isSmallOrder() {
      return this.multiplyUnsafe(o).is0();
    }
    toBytes(T = !0) {
      return ha(T, "isCompressed"), this.assertValidity(), p(U, this, T);
    }
    toHex(T = !0) {
      return cc(this.toBytes(T));
    }
    toString() {
      return `<Point ${this.is0() ? "ZERO" : this.toHex()}>`;
    }
  }
  const Y = i.BITS, et = new Qx(U, t.endo ? Math.ceil(Y / 2) : Y);
  return U.BASE.precompute(8), U;
}
function Iw(e) {
  return Uint8Array.of(e ? 2 : 3);
}
function Ow(e, t) {
  return {
    secretKey: t.BYTES,
    publicKey: 1 + e.BYTES,
    publicKeyUncompressed: 1 + 2 * e.BYTES,
    publicKeyHasPrefix: !0,
    signature: 2 * t.BYTES
  };
}
function sT(e, t = {}) {
  const { Fn: n } = e, r = t.randomBytes || uc, i = Object.assign(Ow(e.Fp, n), { seed: Ew(n.ORDER) });
  function s(p) {
    try {
      const y = n.fromBytes(p);
      return n.isValidNot0(y);
    } catch {
      return !1;
    }
  }
  function o(p, y) {
    const { publicKey: f, publicKeyUncompressed: g } = i;
    try {
      const m = p.length;
      return y === !0 && m !== f || y === !1 && m !== g ? !1 : !!e.fromBytes(p);
    } catch {
      return !1;
    }
  }
  function a(p = r(i.seed)) {
    return xw(dt(p, i.seed, "seed"), n.ORDER);
  }
  function c(p, y = !0) {
    return e.BASE.multiply(n.fromBytes(p)).toBytes(y);
  }
  function u(p) {
    const { secretKey: y, publicKey: f, publicKeyUncompressed: g } = i;
    if (!lf(p) || "_lengths" in n && n._lengths || y === f)
      return;
    const m = dt(p, void 0, "key").length;
    return m === f || m === g;
  }
  function l(p, y, f = !0) {
    if (u(p) === !0)
      throw new Error("first arg must be private key");
    if (u(y) === !1)
      throw new Error("second arg must be public key");
    const g = n.fromBytes(p);
    return e.fromBytes(y).multiply(g).toBytes(f);
  }
  const d = {
    isValidSecretKey: s,
    isValidPublicKey: o,
    randomSecretKey: a
  }, h = vw(a, c);
  return Object.freeze({ getPublicKey: c, getSharedSecret: l, keygen: h, Point: e, utils: d, lengths: i });
}
function oT(e, t, n = {}) {
  By(t), pf(n, {}, {
    hmac: "function",
    lowS: "boolean",
    randomBytes: "function",
    bits2int: "function",
    bits2int_modN: "function"
  }), n = Object.assign({}, n);
  const r = n.randomBytes || uc, i = n.hmac || ((x, w) => kw(t, x, w)), { Fp: s, Fn: o } = e, { ORDER: a, BITS: c } = o, { keygen: u, getPublicKey: l, getSharedSecret: d, utils: h, lengths: p } = sT(e, n), y = {
    prehash: !0,
    lowS: typeof n.lowS == "boolean" ? n.lowS : !0,
    format: "compact",
    extraEntropy: !1
  }, f = a * Aw < s.ORDER;
  function g(x) {
    const w = a >> pi;
    return x > w;
  }
  function m(x, w) {
    if (!o.isValidNot0(w))
      throw new Error(`invalid signature ${x}: out of range 1..Point.Fn.ORDER`);
    return w;
  }
  function S() {
    if (f)
      throw new Error('"recovered" sig type is not supported for cofactor >2 curves');
  }
  function v(x, w) {
    nl(w);
    const E = p.signature, k = w === "compact" ? E : w === "recovered" ? E + 1 : void 0;
    return dt(x, k);
  }
  class O {
    r;
    s;
    recovery;
    constructor(w, E, k) {
      if (this.r = m("r", w), this.s = m("s", E), k != null) {
        if (S(), ![0, 1, 2, 3].includes(k))
          throw new Error("invalid recovery id");
        this.recovery = k;
      }
      Object.freeze(this);
    }
    static fromBytes(w, E = y.format) {
      v(w, E);
      let k;
      if (E === "der") {
        const { r: B, s: N } = Kn.toSig(dt(w));
        return new O(B, N);
      }
      E === "recovered" && (k = w[0], E = "compact", w = w.subarray(1));
      const I = p.signature / 2, A = w.subarray(0, I), $ = w.subarray(I, I * 2);
      return new O(o.fromBytes(A), o.fromBytes($), k);
    }
    static fromHex(w, E) {
      return this.fromBytes(da(w), E);
    }
    assertRecovery() {
      const { recovery: w } = this;
      if (w == null)
        throw new Error("invalid recovery id: must be present");
      return w;
    }
    addRecoveryBit(w) {
      return new O(this.r, this.s, w);
    }
    recoverPublicKey(w) {
      const { r: E, s: k } = this, I = this.assertRecovery(), A = I === 2 || I === 3 ? E + a : E;
      if (!s.isValid(A))
        throw new Error("invalid recovery id: sig.r+curve.n != R.x");
      const $ = s.toBytes(A), B = e.fromBytes(rn(Iw((I & 1) === 0), $)), N = o.inv(A), K = j(dt(w, void 0, "msgHash")), M = o.create(-K * N), C = o.create(k * N), H = e.BASE.multiplyUnsafe(M).add(B.multiplyUnsafe(C));
      if (H.is0())
        throw new Error("invalid recovery: point at infinify");
      return H.assertValidity(), H;
    }
    // Signatures should be low-s, to prevent malleability.
    hasHighS() {
      return g(this.s);
    }
    toBytes(w = y.format) {
      if (nl(w), w === "der")
        return da(Kn.hexFromSig(this));
      const { r: E, s: k } = this, I = o.toBytes(E), A = o.toBytes(k);
      return w === "recovered" ? (S(), rn(Uint8Array.of(this.assertRecovery()), I, A)) : rn(I, A);
    }
    toHex(w) {
      return cc(this.toBytes(w));
    }
  }
  const R = n.bits2int || function(w) {
    if (w.length > 8192)
      throw new Error("input is too large");
    const E = qi(w), k = w.length * 8 - c;
    return k > 0 ? E >> BigInt(k) : E;
  }, j = n.bits2int_modN || function(w) {
    return o.create(R(w));
  }, b = hf(c);
  function W(x) {
    return tx("num < 2^" + c, x, kn, b), o.toBytes(x);
  }
  function U(x, w) {
    return dt(x, void 0, "message"), w ? dt(t(x), void 0, "prehashed message") : x;
  }
  function Y(x, w, E) {
    const { lowS: k, prehash: I, extraEntropy: A } = Jc(E, y);
    x = U(x, I);
    const $ = j(x), B = o.fromBytes(w);
    if (!o.isValidNot0(B))
      throw new Error("invalid private key");
    const N = [W(B), W($)];
    if (A != null && A !== !1) {
      const H = A === !0 ? r(p.secretKey) : A;
      N.push(dt(H, void 0, "extraEntropy"));
    }
    const K = rn(...N), M = $;
    function C(H) {
      const q = R(H);
      if (!o.isValidNot0(q))
        return;
      const ot = o.inv(q), F = e.BASE.multiply(q).toAffine(), Z = o.create(F.x);
      if (Z === kn)
        return;
      const Gt = o.create(ot * o.create(M + Z * B));
      if (Gt === kn)
        return;
      let Un = (F.x === Z ? 0 : 2) | Number(F.y & pi), Pn = Gt;
      return k && g(Gt) && (Pn = o.neg(Gt), Un ^= 1), new O(Z, Pn, f ? void 0 : Un);
    }
    return { seed: K, k2sig: C };
  }
  function et(x, w, E = {}) {
    const { seed: k, k2sig: I } = Y(x, w, E);
    return nx(t.outputLen, o.BYTES, i)(k, I).toBytes(E.format);
  }
  function L(x, w, E, k = {}) {
    const { lowS: I, prehash: A, format: $ } = Jc(k, y);
    if (E = dt(E, void 0, "publicKey"), w = U(w, A), !lf(x)) {
      const B = x instanceof O ? ", use sig.toBytes()" : "";
      throw new Error("verify expects Uint8Array signature" + B);
    }
    v(x, $);
    try {
      const B = O.fromBytes(x, $), N = e.fromBytes(E);
      if (I && B.hasHighS())
        return !1;
      const { r: K, s: M } = B, C = j(w), H = o.inv(M), q = o.create(C * H), ot = o.create(K * H), F = e.BASE.multiplyUnsafe(q).add(N.multiplyUnsafe(ot));
      return F.is0() ? !1 : o.create(F.x) === K;
    } catch {
      return !1;
    }
  }
  function T(x, w, E = {}) {
    const { prehash: k } = Jc(E, y);
    return w = U(w, k), O.fromBytes(x, "recovered").recoverPublicKey(w).toBytes();
  }
  return Object.freeze({
    keygen: u,
    getPublicKey: l,
    getSharedSecret: d,
    utils: h,
    lengths: p,
    Point: e,
    sign: et,
    verify: L,
    recoverPublicKey: T,
    Signature: O,
    hash: t
  });
}
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const pc = {
  p: BigInt("0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffefffffc2f"),
  n: BigInt("0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141"),
  h: BigInt(1),
  a: BigInt(0),
  b: BigInt(7),
  Gx: BigInt("0x79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798"),
  Gy: BigInt("0x483ada7726a3c4655da4fbfc0e1108a8fd17b448a68554199c47d08ffb10d4b8")
}, aT = {
  beta: BigInt("0x7ae96a2b657c07106e64479eac3434e99cf0497512f58995c1396c28719501ee"),
  basises: [
    [BigInt("0x3086d221a7d46bcde86c90e49284eb15"), -BigInt("0xe4437ed6010e88286f547fa90abfe4c3")],
    [BigInt("0x114ca50f7a8e2f3f657c1108d9d44cfd8"), BigInt("0x3086d221a7d46bcde86c90e49284eb15")]
  ]
}, cT = /* @__PURE__ */ BigInt(0), rl = /* @__PURE__ */ BigInt(2);
function uT(e) {
  const t = pc.p, n = BigInt(3), r = BigInt(6), i = BigInt(11), s = BigInt(22), o = BigInt(23), a = BigInt(44), c = BigInt(88), u = e * e * e % t, l = u * u * e % t, d = me(l, n, t) * l % t, h = me(d, n, t) * l % t, p = me(h, rl, t) * u % t, y = me(p, i, t) * p % t, f = me(y, s, t) * y % t, g = me(f, a, t) * f % t, m = me(g, c, t) * g % t, S = me(m, a, t) * f % t, v = me(S, n, t) * l % t, O = me(v, o, t) * y % t, R = me(O, r, t) * u % t, j = me(R, rl, t);
  if (!ba.eql(ba.sqr(j), e))
    throw new Error("Cannot find square root");
  return j;
}
const ba = hc(pc.p, { sqrt: uT }), ei = /* @__PURE__ */ iT(pc, {
  Fp: ba,
  endo: aT
}), dh = /* @__PURE__ */ oT(ei, el), hh = {};
function Ea(e, ...t) {
  let n = hh[e];
  if (n === void 0) {
    const r = el(QE(e));
    n = rn(r, r), hh[e] = n;
  }
  return el(rn(n, ...t));
}
const mf = (e) => e.toBytes(!0).slice(1), bf = (e) => e % rl === cT;
function il(e) {
  const { Fn: t, BASE: n } = ei, r = t.fromBytes(e), i = n.multiply(r);
  return { scalar: bf(i.y) ? r : t.neg(r), bytes: mf(i) };
}
function Bw(e) {
  const t = ba;
  if (!t.isValidNot0(e))
    throw new Error("invalid x: Fail if x ≥ p");
  const n = t.create(e * e), r = t.create(n * e + BigInt(7));
  let i = t.sqrt(r);
  bf(i) || (i = t.neg(i));
  const s = ei.fromAffine({ x: e, y: i });
  return s.assertValidity(), s;
}
const ys = qi;
function Nw(...e) {
  return ei.Fn.create(ys(Ea("BIP0340/challenge", ...e)));
}
function ph(e) {
  return il(e).bytes;
}
function lT(e, t, n = uc(32)) {
  const { Fn: r } = ei, i = dt(e, void 0, "message"), { bytes: s, scalar: o } = il(t), a = dt(n, 32, "auxRand"), c = r.toBytes(o ^ ys(Ea("BIP0340/aux", a))), u = Ea("BIP0340/nonce", c, s, i), { bytes: l, scalar: d } = il(u), h = Nw(l, s, i), p = new Uint8Array(64);
  if (p.set(l, 0), p.set(r.toBytes(r.create(d + h * o)), 32), !Rw(p, i, s))
    throw new Error("sign: Invalid signature produced");
  return p;
}
function Rw(e, t, n) {
  const { Fp: r, Fn: i, BASE: s } = ei, o = dt(e, 64, "signature"), a = dt(t, void 0, "message"), c = dt(n, 32, "publicKey");
  try {
    const u = Bw(ys(c)), l = ys(o.subarray(0, 32));
    if (!r.isValidNot0(l))
      return !1;
    const d = ys(o.subarray(32, 64));
    if (!i.isValidNot0(d))
      return !1;
    const h = Nw(i.toBytes(l), mf(u), a), p = s.multiplyUnsafe(d).add(u.multiplyUnsafe(i.neg(h))), { x: y, y: f } = p.toAffine();
    return !(p.is0() || !bf(f) || y !== l);
  } catch {
    return !1;
  }
}
const Ef = /* @__PURE__ */ (() => {
  const n = (r = uc(48)) => xw(r, pc.n);
  return {
    keygen: vw(n, ph),
    getPublicKey: ph,
    sign: lT,
    verify: Rw,
    Point: ei,
    utils: {
      randomSecretKey: n,
      taggedHash: Ea,
      lift_x: Bw,
      pointToBytes: mf
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
function xf(e, t, n = {}) {
  e = Gu(e);
  const { aggPublicKey: r } = Yu(e);
  if (!n.taprootTweak)
    return {
      preTweakedKey: r.toBytes(!0),
      finalKey: r.toBytes(!0)
    };
  const i = Ef.utils.taggedHash("TapTweak", r.toBytes(!0).subarray(1), n.taprootTweak ?? new Uint8Array(0)), { aggPublicKey: s } = Yu(e, [i], [!0]);
  return {
    preTweakedKey: r.toBytes(!0),
    finalKey: s.toBytes(!0)
  };
}
class fo extends Error {
  constructor(t) {
    super(t), this.name = "PartialSignatureError";
  }
}
class Tf {
  constructor(t, n) {
    if (this.s = t, this.R = n, t.length !== 32)
      throw new fo("Invalid s length");
    if (n.length !== 33)
      throw new fo("Invalid R length");
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
      throw new fo("Invalid partial signature length");
    if (qi(t) >= ti.CURVE().n)
      throw new fo("s value overflows curve order");
    const r = new Uint8Array(33);
    return new Tf(t, r);
  }
}
function fT(e, t, n, r, i, s) {
  let o;
  if (s?.taprootTweak !== void 0) {
    const { preTweakedKey: u } = xf(Gu(r));
    o = Ef.utils.taggedHash("TapTweak", u.subarray(1), s.taprootTweak);
  }
  const c = new KE(n, Gu(r), i, o ? [o] : void 0, o ? [!0] : void 0).sign(e, t);
  return Tf.decode(c);
}
var tu, gh;
function dT() {
  if (gh) return tu;
  gh = 1;
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
  return tu = { decode: c, encode: u }, tu;
}
var sl = dT(), de;
(function(e) {
  e.VtxoTaprootTree = "taptree", e.VtxoTreeExpiry = "expiry", e.Cosigner = "cosigner", e.ConditionWitness = "condition";
})(de || (de = {}));
const Sf = 222;
function hT(e, t, n, r) {
  e.updateInput(t, {
    unknown: [
      ...e.getInput(t)?.unknown ?? [],
      n.encode(r)
    ]
  });
}
function ol(e, t, n) {
  const r = e.getInput(t)?.unknown ?? [], i = [];
  for (const s of r) {
    const o = n.decode(s);
    o && i.push(o);
  }
  return i;
}
const Uw = {
  key: de.VtxoTaprootTree,
  encode: (e) => [
    {
      type: Sf,
      key: gc[de.VtxoTaprootTree]
    },
    e
  ],
  decode: (e) => vf(() => $f(e[0], de.VtxoTaprootTree) ? e[1] : null)
}, pT = {
  key: de.ConditionWitness,
  encode: (e) => [
    {
      type: Sf,
      key: gc[de.ConditionWitness]
    },
    Rs.encode(e)
  ],
  decode: (e) => vf(() => $f(e[0], de.ConditionWitness) ? Rs.decode(e[1]) : null)
}, al = {
  key: de.Cosigner,
  encode: (e) => [
    {
      type: Sf,
      key: new Uint8Array([
        ...gc[de.Cosigner],
        e.index
      ])
    },
    e.key
  ],
  decode: (e) => vf(() => $f(e[0], de.Cosigner) ? {
    index: e[0].key[e[0].key.length - 1],
    key: e[1]
  } : null)
};
de.VtxoTreeExpiry;
const gc = Object.fromEntries(Object.values(de).map((e) => [
  e,
  new TextEncoder().encode(e)
])), vf = (e) => {
  try {
    return e();
  } catch {
    return null;
  }
};
function $f(e, t) {
  const n = P.encode(gc[t]);
  return P.encode(new Uint8Array([e.type, ...e.key])).includes(n);
}
const ho = new Error("missing vtxo graph");
class _s {
  constructor(t) {
    this.secretKey = t, this.myNonces = null, this.aggregateNonces = null, this.graph = null, this.scriptRoot = null, this.rootSharedOutputAmount = null;
  }
  static random() {
    const t = Vu();
    return new _s(t);
  }
  async init(t, n, r) {
    this.graph = t, this.scriptRoot = n, this.rootSharedOutputAmount = r;
  }
  async getPublicKey() {
    return dh.getPublicKey(this.secretKey);
  }
  async getNonces() {
    if (!this.graph)
      throw ho;
    this.myNonces || (this.myNonces = this.generateNonces());
    const t = /* @__PURE__ */ new Map();
    for (const [n, r] of this.myNonces)
      t.set(n, { pubNonce: r.pubNonce });
    return t;
  }
  async aggregatedNonces(t, n) {
    if (!this.graph)
      throw ho;
    if (this.aggregateNonces || (this.aggregateNonces = /* @__PURE__ */ new Map()), this.myNonces || await this.getNonces(), this.aggregateNonces.has(t))
      return {
        hasAllNonces: this.aggregateNonces.size === this.myNonces?.size
      };
    const r = this.myNonces.get(t);
    if (!r)
      throw new Error(`missing nonce for txid ${t}`);
    const i = await this.getPublicKey();
    n.set(P.encode(i.subarray(1)), r);
    const s = this.graph.find(t);
    if (!s)
      throw new Error(`missing tx for txid ${t}`);
    const o = ol(s.root, 0, al).map(
      (u) => P.encode(u.key.subarray(1))
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
      throw ho;
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
      throw ho;
    const t = /* @__PURE__ */ new Map(), n = dh.getPublicKey(this.secretKey);
    for (const r of this.graph.iterator()) {
      const i = zE(n);
      t.set(r.txid, i);
    }
    return t;
  }
  signPartial(t) {
    if (!this.graph || !this.scriptRoot || !this.rootSharedOutputAmount)
      throw _s.NOT_INITIALIZED;
    if (!this.myNonces || !this.aggregateNonces)
      throw new Error("session not properly initialized");
    const n = this.myNonces.get(t.txid);
    if (!n)
      throw new Error("missing private nonce");
    const r = this.aggregateNonces.get(t.txid);
    if (!r)
      throw new Error("missing aggregate nonce");
    const i = [], s = [], o = ol(t.root, 0, al).map((u) => u.key), { finalKey: a } = xf(o, !0, {
      taprootTweak: this.scriptRoot
    });
    for (let u = 0; u < t.root.inputsLength; u++) {
      const l = gT(a, this.graph, this.rootSharedOutputAmount, t.root);
      i.push(l.amount), s.push(l.script);
    }
    const c = t.root.preimageWitnessV1(
      0,
      // always first input
      s,
      zr.DEFAULT,
      i
    );
    return fT(n.secNonce, this.secretKey, r.pubNonce, o, c, {
      taprootTweak: this.scriptRoot
    });
  }
}
_s.NOT_INITIALIZED = new Error("session not initialized, call init method");
function gT(e, t, n, r) {
  const i = J.encode(["OP_1", e.slice(1)]);
  if (r.id === t.txid)
    return {
      amount: n,
      script: i
    };
  const s = r.getInput(0);
  if (!s.txid)
    throw new Error("missing parent input txid");
  const o = P.encode(s.txid), a = t.find(o);
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
const yh = Object.values(zr).filter((e) => typeof e == "number");
class ws {
  constructor(t) {
    this.key = t || Vu();
  }
  static fromPrivateKey(t) {
    return new ws(t);
  }
  static fromHex(t) {
    return new ws(P.decode(t));
  }
  static fromRandomBytes() {
    return new ws(Vu());
  }
  /**
   * Export the private key as a hex string.
   *
   * @returns The private key as a hex string
   */
  toHex() {
    return P.encode(this.key);
  }
  async sign(t, n) {
    const r = t.clone();
    if (!n) {
      try {
        if (!r.sign(this.key, yh))
          throw new Error("Failed to sign transaction");
      } catch (i) {
        if (!(i instanceof Error && i.message.includes("No inputs signed"))) throw i;
      }
      return r;
    }
    for (const i of n)
      if (!r.signIdx(this.key, i, yh))
        throw new Error(`Failed to sign input #${i}`);
    return r;
  }
  compressedPublicKey() {
    return Promise.resolve(py(this.key, !0));
  }
  xOnlyPublicKey() {
    return Promise.resolve(Jl(this.key));
  }
  signerSession() {
    return _s.random();
  }
  async signMessage(t, n = "schnorr") {
    return n === "ecdsa" ? $x(t, this.key, { prehash: !1 }) : Rx.signAsync(t, this.key);
  }
  async toReadonly() {
    return new yc(await this.compressedPublicKey());
  }
}
class yc {
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
    return new yc(t);
  }
  xOnlyPublicKey() {
    return Promise.resolve(this.publicKey.slice(1));
  }
  compressedPublicKey() {
    return Promise.resolve(this.publicKey);
  }
}
let ms = class Pw {
  constructor(t, n, r, i = 0) {
    if (this.serverPubKey = t, this.vtxoTaprootKey = n, this.hrp = r, this.version = i, t.length !== 32)
      throw new Error("Invalid server public key length, expected 32 bytes, got " + t.length);
    if (n.length !== 32)
      throw new Error("Invalid vtxo taproot public key length, expected 32 bytes, got " + n.length);
  }
  static decode(t) {
    const n = ri.decodeUnsafe(t, 1023);
    if (!n)
      throw new Error("Invalid address");
    const r = new Uint8Array(ri.fromWords(n.words));
    if (r.length !== 65)
      throw new Error("Invalid data length, expected 65 bytes, got " + r.length);
    const i = r[0], s = r.slice(1, 33), o = r.slice(33, 65);
    return new Pw(s, o, n.prefix, i);
  }
  encode() {
    const t = new Uint8Array(65);
    t[0] = this.version, t.set(this.serverPubKey, 1), t.set(this.vtxoTaprootKey, 33);
    const n = ri.toWords(t);
    return ri.encode(this.hrp, n, 1023);
  }
  // pkScript is the script that should be used to send non-dust funds to the address
  get pkScript() {
    return J.encode(["OP_1", this.vtxoTaprootKey]);
  }
  // subdustPkScript is the script that should be used to send sub-dust funds to the address
  get subdustPkScript() {
    return J.encode(["RETURN", this.vtxoTaprootKey]);
  }
};
const xa = nf(void 0, !0);
var At;
(function(e) {
  e.Multisig = "multisig", e.CSVMultisig = "csv-multisig", e.ConditionCSVMultisig = "condition-csv-multisig", e.ConditionMultisig = "condition-multisig", e.CLTVMultisig = "cltv-multisig";
})(At || (At = {}));
function Cw(e) {
  const t = [
    Ke,
    he,
    Ds,
    Ta,
    Ri
  ];
  for (const n of t)
    try {
      return n.decode(e);
    } catch {
      continue;
    }
  throw new Error(`Failed to decode: script ${P.encode(e)} is not a valid tapscript`);
}
var Ke;
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
        type: At.Multisig,
        params: a,
        script: UE(a.pubkeys.length, a.pubkeys).script
      };
    const c = [];
    for (let u = 0; u < a.pubkeys.length; u++)
      c.push(a.pubkeys[u]), u < a.pubkeys.length - 1 ? c.push("CHECKSIGVERIFY") : c.push("CHECKSIG");
    return {
      type: At.Multisig,
      params: a,
      script: J.encode(c)
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
    const c = J.decode(a), u = [];
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
    if (P.encode(d.script) !== P.encode(a))
      throw new Error("Invalid script format: script reconstruction mismatch");
    return {
      type: At.Multisig,
      params: { pubkeys: u, type: t.CHECKSIGADD },
      script: a
    };
  }
  function s(a) {
    const c = J.decode(a), u = [];
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
    if (P.encode(l.script) !== P.encode(a))
      throw new Error("Invalid script format: script reconstruction mismatch");
    return {
      type: At.Multisig,
      params: { pubkeys: u, type: t.CHECKSIG },
      script: a
    };
  }
  function o(a) {
    return a.type === At.Multisig;
  }
  e.is = o;
})(Ke || (Ke = {}));
var he;
(function(e) {
  function t(i) {
    for (const u of i.pubkeys)
      if (u.length !== 32)
        throw new Error(`Invalid pubkey length: expected 32, got ${u.length}`);
    const s = xa.encode(BigInt(sl.encode(i.timelock.type === "blocks" ? { blocks: Number(i.timelock.value) } : { seconds: Number(i.timelock.value) }))), o = [
      s.length === 1 ? s[0] : s,
      "CHECKSEQUENCEVERIFY",
      "DROP"
    ], a = Ke.encode(i), c = new Uint8Array([
      ...J.encode(o),
      ...a.script
    ]);
    return {
      type: At.CSVMultisig,
      params: i,
      script: c
    };
  }
  e.encode = t;
  function n(i) {
    if (i.length === 0)
      throw new Error("Failed to decode: script is empty");
    const s = J.decode(i);
    if (s.length < 3)
      throw new Error("Invalid script: too short (expected at least 3)");
    const o = s[0];
    if (typeof o == "string")
      throw new Error("Invalid script: expected sequence number");
    if (s[1] !== "CHECKSEQUENCEVERIFY" || s[2] !== "DROP")
      throw new Error("Invalid script: expected CHECKSEQUENCEVERIFY DROP");
    const a = new Uint8Array(J.encode(s.slice(3)));
    let c;
    try {
      c = Ke.decode(a);
    } catch (p) {
      throw new Error(`Invalid multisig script: ${p instanceof Error ? p.message : String(p)}`);
    }
    let u;
    typeof o == "number" ? u = o : u = Number(xa.decode(o));
    const l = sl.decode(u), d = l.blocks !== void 0 ? { type: "blocks", value: BigInt(l.blocks) } : { type: "seconds", value: BigInt(l.seconds) }, h = t({
      timelock: d,
      ...c.params
    });
    if (P.encode(h.script) !== P.encode(i))
      throw new Error("Invalid script format: script reconstruction mismatch");
    return {
      type: At.CSVMultisig,
      params: {
        timelock: d,
        ...c.params
      },
      script: i
    };
  }
  e.decode = n;
  function r(i) {
    return i.type === At.CSVMultisig;
  }
  e.is = r;
})(he || (he = {}));
var Ds;
(function(e) {
  function t(i) {
    const s = new Uint8Array([
      ...i.conditionScript,
      ...J.encode(["VERIFY"]),
      ...he.encode(i).script
    ]);
    return {
      type: At.ConditionCSVMultisig,
      params: i,
      script: s
    };
  }
  e.encode = t;
  function n(i) {
    if (i.length === 0)
      throw new Error("Failed to decode: script is empty");
    const s = J.decode(i);
    if (s.length < 1)
      throw new Error("Invalid script: too short (expected at least 1)");
    let o = -1;
    for (let d = s.length - 1; d >= 0; d--)
      s[d] === "VERIFY" && (o = d);
    if (o === -1)
      throw new Error("Invalid script: missing VERIFY operation");
    const a = new Uint8Array(J.encode(s.slice(0, o))), c = new Uint8Array(J.encode(s.slice(o + 1)));
    let u;
    try {
      u = he.decode(c);
    } catch (d) {
      throw new Error(`Invalid CSV multisig script: ${d instanceof Error ? d.message : String(d)}`);
    }
    const l = t({
      conditionScript: a,
      ...u.params
    });
    if (P.encode(l.script) !== P.encode(i))
      throw new Error("Invalid script format: script reconstruction mismatch");
    return {
      type: At.ConditionCSVMultisig,
      params: {
        conditionScript: a,
        ...u.params
      },
      script: i
    };
  }
  e.decode = n;
  function r(i) {
    return i.type === At.ConditionCSVMultisig;
  }
  e.is = r;
})(Ds || (Ds = {}));
var Ta;
(function(e) {
  function t(i) {
    const s = new Uint8Array([
      ...i.conditionScript,
      ...J.encode(["VERIFY"]),
      ...Ke.encode(i).script
    ]);
    return {
      type: At.ConditionMultisig,
      params: i,
      script: s
    };
  }
  e.encode = t;
  function n(i) {
    if (i.length === 0)
      throw new Error("Failed to decode: script is empty");
    const s = J.decode(i);
    if (s.length < 1)
      throw new Error("Invalid script: too short (expected at least 1)");
    let o = -1;
    for (let d = s.length - 1; d >= 0; d--)
      s[d] === "VERIFY" && (o = d);
    if (o === -1)
      throw new Error("Invalid script: missing VERIFY operation");
    const a = new Uint8Array(J.encode(s.slice(0, o))), c = new Uint8Array(J.encode(s.slice(o + 1)));
    let u;
    try {
      u = Ke.decode(c);
    } catch (d) {
      throw new Error(`Invalid multisig script: ${d instanceof Error ? d.message : String(d)}`);
    }
    const l = t({
      conditionScript: a,
      ...u.params
    });
    if (P.encode(l.script) !== P.encode(i))
      throw new Error("Invalid script format: script reconstruction mismatch");
    return {
      type: At.ConditionMultisig,
      params: {
        conditionScript: a,
        ...u.params
      },
      script: i
    };
  }
  e.decode = n;
  function r(i) {
    return i.type === At.ConditionMultisig;
  }
  e.is = r;
})(Ta || (Ta = {}));
var Ri;
(function(e) {
  function t(i) {
    const s = xa.encode(i.absoluteTimelock), o = [
      s.length === 1 ? s[0] : s,
      "CHECKLOCKTIMEVERIFY",
      "DROP"
    ], a = J.encode(o), c = new Uint8Array([
      ...a,
      ...Ke.encode(i).script
    ]);
    return {
      type: At.CLTVMultisig,
      params: i,
      script: c
    };
  }
  e.encode = t;
  function n(i) {
    if (i.length === 0)
      throw new Error("Failed to decode: script is empty");
    const s = J.decode(i);
    if (s.length < 3)
      throw new Error("Invalid script: too short (expected at least 3)");
    const o = s[0];
    if (typeof o == "string" || typeof o == "number")
      throw new Error("Invalid script: expected locktime number");
    if (s[1] !== "CHECKLOCKTIMEVERIFY" || s[2] !== "DROP")
      throw new Error("Invalid script: expected CHECKLOCKTIMEVERIFY DROP");
    const a = new Uint8Array(J.encode(s.slice(3)));
    let c;
    try {
      c = Ke.decode(a);
    } catch (d) {
      throw new Error(`Invalid multisig script: ${d instanceof Error ? d.message : String(d)}`);
    }
    const u = xa.decode(o), l = t({
      absoluteTimelock: u,
      ...c.params
    });
    if (P.encode(l.script) !== P.encode(i))
      throw new Error("Invalid script format: script reconstruction mismatch");
    return {
      type: At.CLTVMultisig,
      params: {
        absoluteTimelock: u,
        ...c.params
      },
      script: i
    };
  }
  e.decode = n;
  function r(i) {
    return i.type === At.CLTVMultisig;
  }
  e.is = r;
})(Ri || (Ri = {}));
const wh = Us.tapTree[2];
function bs(e) {
  return e[1].subarray(0, e[1].length - 1);
}
let fn = class Lw {
  static decode(t) {
    const r = wh.decode(t).map((i) => i.script);
    return new Lw(r);
  }
  constructor(t) {
    this.scripts = t;
    const n = t.length % 2 !== 0 ? t.slice().reverse() : t, r = Ty(n.map((s) => ({
      script: s,
      leafVersion: Ps
    }))), i = RE(ef, r, void 0, !0);
    if (!i.tapLeafScript || i.tapLeafScript.length !== t.length)
      throw new Error("invalid scripts");
    this.leaves = i.tapLeafScript, this.tweakedPublicKey = i.tweakedPubkey;
  }
  encode() {
    return wh.encode(this.scripts.map((n) => ({
      depth: 1,
      version: Ps,
      script: n
    })));
  }
  address(t, n) {
    return new ms(n, this.tweakedPublicKey, t);
  }
  get pkScript() {
    return J.encode(["OP_1", this.tweakedPublicKey]);
  }
  onchainAddress(t) {
    return Kr(t).encode({
      type: "tr",
      pubkey: this.tweakedPublicKey
    });
  }
  findLeaf(t) {
    const n = this.leaves.find((r) => P.encode(bs(r)) === t);
    if (!n)
      throw new Error(`leaf '${t}' not found`);
    return n;
  }
  exitPaths() {
    const t = [];
    for (const n of this.leaves)
      try {
        const r = he.decode(bs(n));
        t.push(r);
        continue;
      } catch {
        try {
          const i = Ds.decode(bs(n));
          t.push(i);
        } catch {
          continue;
        }
      }
    return t;
  }
};
var mh;
(function(e) {
  class t extends fn {
    constructor(i) {
      n(i);
      const { sender: s, receiver: o, server: a, preimageHash: c, refundLocktime: u, unilateralClaimDelay: l, unilateralRefundDelay: d, unilateralRefundWithoutReceiverDelay: h } = i, p = yT(c), y = Ta.encode({
        conditionScript: p,
        pubkeys: [o, a]
      }).script, f = Ke.encode({
        pubkeys: [s, o, a]
      }).script, g = Ri.encode({
        absoluteTimelock: u,
        pubkeys: [s, a]
      }).script, m = Ds.encode({
        conditionScript: p,
        timelock: l,
        pubkeys: [o]
      }).script, S = he.encode({
        timelock: d,
        pubkeys: [s, o]
      }).script, v = he.encode({
        timelock: h,
        pubkeys: [s]
      }).script;
      super([
        y,
        f,
        g,
        m,
        S,
        v
      ]), this.options = i, this.claimScript = P.encode(y), this.refundScript = P.encode(f), this.refundWithoutReceiverScript = P.encode(g), this.unilateralClaimScript = P.encode(m), this.unilateralRefundScript = P.encode(S), this.unilateralRefundWithoutReceiverScript = P.encode(v);
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
})(mh || (mh = {}));
function yT(e) {
  return J.encode(["HASH160", e, "EQUAL"]);
}
var Sa;
(function(e) {
  class t extends fn {
    constructor(r) {
      const { pubKey: i, serverPubKey: s, csvTimelock: o = t.DEFAULT_TIMELOCK } = r, a = Ke.encode({
        pubkeys: [i, s]
      }).script, c = he.encode({
        timelock: o,
        pubkeys: [i]
      }).script;
      super([a, c]), this.options = r, this.forfeitScript = P.encode(a), this.exitScript = P.encode(c);
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
})(Sa || (Sa = {}));
var Tn;
(function(e) {
  e.TxSent = "SENT", e.TxReceived = "RECEIVED";
})(Tn || (Tn = {}));
function er(e) {
  return !e.isSpent;
}
function kf(e) {
  return e.virtualStatus.state === "swept" && er(e);
}
function _w(e) {
  if (e.virtualStatus.state === "swept")
    return !0;
  const t = e.virtualStatus.batchExpiry;
  return !t || new Date(t).getFullYear() < 2025 ? !1 : t <= Date.now();
}
function Dw(e, t) {
  return e.value < t;
}
async function* cl(e) {
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
let Vw = class extends Error {
  constructor(t, n, r, i) {
    super(n), this.code = t, this.message = n, this.name = r, this.metadata = i;
  }
};
function wT(e) {
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
      return "metadata" in n && mT(n.metadata) && (a = n.metadata), new Vw(i, s, o, a);
    }
    return;
  } catch {
    return;
  }
}
function mT(e) {
  return typeof e == "object" && e !== null && !Array.isArray(e);
}
var sr;
(function(e) {
  function t(i, s, o = []) {
    if (typeof i != "string" && (i = r(i)), s.length == 0)
      throw new Error("intent proof requires at least one input");
    vT(s), kT(o);
    const a = AT(i, s[0].witnessUtxo.script);
    return IT(a, s, o);
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
})(sr || (sr = {}));
const bT = new Uint8Array([Bt.RETURN]), ET = new Uint8Array(32).fill(0), xT = 4294967295, TT = "ark-intent-proof-message";
function ST(e) {
  if (e.index === void 0)
    throw new Error("intent proof input requires index");
  if (e.txid === void 0)
    throw new Error("intent proof input requires txid");
  if (e.witnessUtxo === void 0)
    throw new Error("intent proof input requires witness utxo");
  return !0;
}
function vT(e) {
  return e.forEach(ST), !0;
}
function $T(e) {
  if (e.amount === void 0)
    throw new Error("intent proof output requires amount");
  if (e.script === void 0)
    throw new Error("intent proof output requires script");
  return !0;
}
function kT(e) {
  return e.forEach($T), !0;
}
function AT(e, t) {
  const n = OT(e), r = new pr({
    version: 0
  });
  return r.addInput({
    txid: ET,
    // zero hash
    index: xT,
    sequence: 0
  }), r.addOutput({
    amount: 0n,
    script: t
  }), r.updateInput(0, {
    finalScriptSig: J.encode(["OP_0", n])
  }), r;
}
function IT(e, t, n) {
  const r = t[0], i = t.map((o) => o.sequence || 0).reduce((o, a) => Math.max(o, a), 0), s = new pr({
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
    sighashType: zr.ALL
  });
  for (const [o, a] of t.entries())
    s.addInput({
      ...a,
      sighashType: zr.ALL
    }), a.unknown?.length && s.updateInput(o + 1, {
      unknown: a.unknown
    });
  n.length === 0 && (n = [
    {
      amount: 0n,
      script: bT
    }
  ]);
  for (const o of n)
    s.addOutput({
      amount: o.amount,
      script: o.script
    });
  return s;
}
function OT(e) {
  return Ef.utils.taggedHash(TT, new TextEncoder().encode(e));
}
var Pt;
(function(e) {
  e.BatchStarted = "batch_started", e.BatchFinalization = "batch_finalization", e.BatchFinalized = "batch_finalized", e.BatchFailed = "batch_failed", e.TreeSigningStarted = "tree_signing_started", e.TreeNonces = "tree_nonces", e.TreeTx = "tree_tx", e.TreeSignature = "tree_signature";
})(Pt || (Pt = {}));
let Mw = class {
  constructor(t) {
    this.serverUrl = t;
  }
  async getInfo() {
    const t = `${this.serverUrl}/v1/info`, n = await fetch(t);
    if (!n.ok) {
      const i = await n.text();
      Ye(i, `Failed to get server info: ${n.statusText}`);
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
      Ye(o, `Failed to submit virtual transaction: ${o}`);
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
      Ye(s, `Failed to finalize offchain transaction: ${s}`);
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
          message: sr.encodeMessage(t.message)
        }
      })
    });
    if (!r.ok) {
      const s = await r.text();
      Ye(s, `Failed to register intent: ${s}`);
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
          message: sr.encodeMessage(t.message)
        }
      })
    });
    if (!r.ok) {
      const i = await r.text();
      Ye(i, `Failed to delete intent: ${i}`);
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
      Ye(i, `Failed to confirm registration: ${i}`);
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
        treeNonces: BT(r)
      })
    });
    if (!s.ok) {
      const o = await s.text();
      Ye(o, `Failed to submit tree nonces: ${o}`);
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
        treeSignatures: NT(r)
      })
    });
    if (!s.ok) {
      const o = await s.text();
      Ye(o, `Failed to submit tree signatures: ${o}`);
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
      Ye(s, `Failed to submit forfeit transactions: ${i.statusText}`);
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
          for await (const a of cl(s)) {
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
        if (ul(s)) {
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
          for await (const s of cl(r)) {
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
        if (ul(r)) {
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
          message: sr.encodeMessage(t.message)
        }
      })
    });
    if (!r.ok) {
      const s = await r.text();
      Ye(s, `Failed to get pending transactions: ${s}`);
    }
    return (await r.json()).pendingTxs;
  }
  parseSettlementEvent(t) {
    if (t.batchStarted)
      return {
        type: Pt.BatchStarted,
        id: t.batchStarted.id,
        intentIdHashes: t.batchStarted.intentIdHashes,
        batchExpiry: BigInt(t.batchStarted.batchExpiry)
      };
    if (t.batchFinalization)
      return {
        type: Pt.BatchFinalization,
        id: t.batchFinalization.id,
        commitmentTx: t.batchFinalization.commitmentTx
      };
    if (t.batchFinalized)
      return {
        type: Pt.BatchFinalized,
        id: t.batchFinalized.id,
        commitmentTxid: t.batchFinalized.commitmentTxid
      };
    if (t.batchFailed)
      return {
        type: Pt.BatchFailed,
        id: t.batchFailed.id,
        reason: t.batchFailed.reason
      };
    if (t.treeSigningStarted)
      return {
        type: Pt.TreeSigningStarted,
        id: t.treeSigningStarted.id,
        cosignersPublicKeys: t.treeSigningStarted.cosignersPubkeys,
        unsignedCommitmentTx: t.treeSigningStarted.unsignedCommitmentTx
      };
    if (t.treeNoncesAggregated)
      return null;
    if (t.treeNonces)
      return {
        type: Pt.TreeNonces,
        id: t.treeNonces.id,
        topic: t.treeNonces.topic,
        txid: t.treeNonces.txid,
        nonces: RT(t.treeNonces.nonces)
        // pubkey -> public nonce
      };
    if (t.treeTx) {
      const n = Object.fromEntries(Object.entries(t.treeTx.children).map(([r, i]) => [parseInt(r), i]));
      return {
        type: Pt.TreeTx,
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
      type: Pt.TreeSignature,
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
        spentVtxos: t.commitmentTx.spentVtxos.map(po),
        spendableVtxos: t.commitmentTx.spendableVtxos.map(po),
        checkpointTxs: t.commitmentTx.checkpointTxs
      }
    } : t.arkTx ? {
      arkTx: {
        txid: t.arkTx.txid,
        tx: t.arkTx.tx,
        spentVtxos: t.arkTx.spentVtxos.map(po),
        spendableVtxos: t.arkTx.spendableVtxos.map(po),
        checkpointTxs: t.arkTx.checkpointTxs
      }
    } : (t.heartbeat || console.warn("Unknown transaction notification type:", t), null);
  }
};
function BT(e) {
  const t = {};
  for (const [n, r] of e)
    t[n] = P.encode(r.pubNonce);
  return t;
}
function NT(e) {
  const t = {};
  for (const [n, r] of e)
    t[n] = P.encode(r.encode());
  return t;
}
function RT(e) {
  return new Map(Object.entries(e).map(([t, n]) => {
    if (typeof n != "string")
      throw new Error("invalid nonce");
    return [t, { pubNonce: P.decode(n) }];
  }));
}
function ul(e) {
  const t = (n) => n instanceof Error ? n.name === "TypeError" && n.message === "Failed to fetch" || n.name === "HeadersTimeoutError" || n.name === "BodyTimeoutError" || n.code === "UND_ERR_HEADERS_TIMEOUT" || n.code === "UND_ERR_BODY_TIMEOUT" : !1;
  return t(e) || t(e.cause);
}
function po(e) {
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
function Ye(e, t) {
  const n = new Error(e);
  throw wT(n) ?? new Error(t);
}
let Uo = class {
  constructor(t, n = /* @__PURE__ */ new Map()) {
    this.root = t, this.children = n;
  }
  static create(t) {
    if (t.length === 0)
      throw new Error("empty chunks");
    const n = /* @__PURE__ */ new Map();
    for (const s of t) {
      const o = PT(s), a = o.tx.id;
      n.set(a, o);
    }
    const r = [];
    for (const [s] of n) {
      let o = !1;
      for (const [a, c] of n)
        if (a !== s && (o = UT(c, s), o))
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
    const i = Hw(r[0], n);
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
      if (!s.txid || P.encode(s.txid) !== o || s.index !== r)
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
function UT(e, t) {
  return Object.values(e.children).includes(t);
}
function Hw(e, t) {
  const n = t.get(e);
  if (!n)
    return null;
  const r = n.tx, i = /* @__PURE__ */ new Map();
  for (const [s, o] of Object.entries(n.children)) {
    const a = parseInt(s), c = Hw(o, t);
    c && i.set(a, c);
  }
  return new Uo(r, i);
}
function PT(e) {
  return { tx: Pe.fromPSBT(Vt.decode(e.tx)), children: e.children };
}
var ll;
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
    for await (const y of r) {
      if (o?.signal.aborted)
        throw new Error("canceled");
      switch (c && c(y).catch(() => {
      }), y.type) {
        case Pt.BatchStarted: {
          const f = y, { skip: g } = await i.onBatchStarted(f);
          g || (u = t.BatchStarted, a && (u = t.TreeNoncesAggregated));
          continue;
        }
        case Pt.BatchFinalized: {
          if (u !== t.BatchFinalization)
            continue;
          return i.onBatchFinalized && await i.onBatchFinalized(y), y.commitmentTxid;
        }
        case Pt.BatchFailed: {
          if (i.onBatchFailed) {
            await i.onBatchFailed(y);
            continue;
          }
          throw new Error(y.reason);
        }
        case Pt.TreeTx: {
          if (u !== t.BatchStarted && u !== t.TreeNoncesAggregated)
            continue;
          y.batchIndex === 0 ? l.push(y.chunk) : d.push(y.chunk), i.onTreeTxEvent && await i.onTreeTxEvent(y);
          continue;
        }
        case Pt.TreeSignature: {
          if (u !== t.TreeNoncesAggregated)
            continue;
          if (!h)
            throw new Error("vtxo tree not initialized");
          const f = P.decode(y.signature);
          h.update(y.txid, (g) => {
            g.updateInput(0, {
              tapKeySig: f
            });
          }), i.onTreeSignatureEvent && await i.onTreeSignatureEvent(y);
          continue;
        }
        case Pt.TreeSigningStarted: {
          if (u !== t.BatchStarted)
            continue;
          h = Uo.create(l);
          const { skip: f } = await i.onTreeSigningStarted(y, h);
          f || (u = t.TreeSigningStarted);
          continue;
        }
        case Pt.TreeNonces: {
          if (u !== t.TreeSigningStarted)
            continue;
          const { fullySigned: f } = await i.onTreeNonces(y);
          f && (u = t.TreeNoncesAggregated);
          continue;
        }
        case Pt.BatchFinalization: {
          if (u !== t.TreeNoncesAggregated)
            continue;
          if (!h && l.length > 0 && (h = Uo.create(l)), !h && !a)
            throw new Error("vtxo tree not initialized");
          d.length > 0 && (p = Uo.create(d)), await i.onBatchFinalization(y, h, p), u = t.BatchFinalization;
          continue;
        }
        default:
          continue;
      }
    }
    throw new Error("event stream closed");
  }
  e.join = n;
})(ll || (ll = {}));
const CT = (e) => LT[e], LT = {
  bitcoin: ts(Ai, "ark"),
  testnet: ts(oo, "tark"),
  signet: ts(oo, "tark"),
  mutinynet: ts(oo, "tark"),
  regtest: ts({
    ...oo,
    bech32: "bcrt",
    pubKeyHash: 111,
    scriptHash: 196
  }, "tark")
};
function ts(e, t) {
  return {
    ...e,
    hrp: t
  };
}
const _T = {
  bitcoin: "https://mempool.space/api",
  testnet: "https://mempool.space/testnet/api",
  signet: "https://mempool.space/signet/api",
  mutinynet: "https://mutinynet.com/api",
  regtest: "http://localhost:3000"
};
let DT = class {
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
          const p = (await c()).filter((y) => !d.has(l(y)));
          p.length > 0 && (p.forEach((y) => d.add(l(y))), n(p));
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
              d[h][p] && u.push(...d[h][p].filter(MT));
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
    if (!VT(n))
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
function VT(e) {
  return Array.isArray(e) && e.every((t) => {
    t && typeof t == "object" && typeof t.id == "string" && t.id.length > 0 && typeof t.height == "number" && t.height >= 0 && typeof t.mediantime == "number" && t.mediantime > 0;
  });
}
const MT = (e) => typeof e.txid == "string" && Array.isArray(e.vout) && e.vout.every((t) => typeof t.scriptpubkey_address == "string" && typeof t.value == "number") && typeof e.status == "object" && typeof e.status.confirmed == "boolean", HT = 0n, FT = new Uint8Array([81, 2, 78, 115]), Af = {
  script: FT,
  amount: HT
};
P.encode(Af.script);
function jT(e, t, n) {
  const r = new pr({
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
  }), r.addOutput(Af), r;
}
const KT = new Error("invalid settlement transaction outputs"), zT = new Error("empty tree"), WT = new Error("invalid number of inputs"), eu = new Error("wrong settlement txid"), qT = new Error("invalid amount"), GT = new Error("no leaves"), YT = new Error("invalid taproot script"), bh = new Error("invalid round transaction outputs"), ZT = new Error("wrong commitment txid"), XT = new Error("missing cosigners public keys"), nu = 0, Eh = 1;
function QT(e, t) {
  if (t.validate(), t.root.inputsLength !== 1)
    throw WT;
  const n = t.root.getInput(0), r = Pe.fromPSBT(Vt.decode(e));
  if (r.outputsLength <= Eh)
    throw KT;
  const i = r.id;
  if (!n.txid || P.encode(n.txid) !== i || n.index !== Eh)
    throw eu;
}
function JT(e, t, n) {
  if (t.outputsLength < nu + 1)
    throw bh;
  const r = t.getOutput(nu)?.amount;
  if (!r)
    throw bh;
  if (!e.root)
    throw zT;
  const i = e.root.getInput(0), s = t.id;
  if (!i.txid || P.encode(i.txid) !== s || i.index !== nu)
    throw ZT;
  let o = 0n;
  for (let c = 0; c < e.root.outputsLength; c++) {
    const u = e.root.getOutput(c);
    u?.amount && (o += u.amount);
  }
  if (o !== r)
    throw qT;
  if (e.leaves().length === 0)
    throw GT;
  e.validate();
  for (const c of e.iterator())
    for (const [u, l] of c.children) {
      const d = c.root.getOutput(u);
      if (!d?.script)
        throw new Error(`parent output ${u} not found`);
      const h = d.script.slice(2);
      if (h.length !== 32)
        throw new Error(`parent output ${u} has invalid script`);
      const p = ol(l.root, 0, al);
      if (p.length === 0)
        throw XT;
      const y = p.map((g) => g.key), { finalKey: f } = xf(y, !0, {
        taprootTweak: n
      });
      if (!f || P.encode(f.slice(1)) !== P.encode(h))
        throw YT;
    }
}
function tS(e, t, n) {
  let r = !1;
  for (const [o, a] of t.entries()) {
    if (!a.script)
      throw new Error(`missing output script ${o}`);
    if (J.decode(a.script)[0] === "RETURN") {
      if (r)
        throw new Error("multiple OP_RETURN outputs");
      r = !0;
    }
  }
  const i = e.map((o) => eS(o, n));
  return {
    arkTx: Fw(i.map((o) => o.input), t),
    checkpoints: i.map((o) => o.tx)
  };
}
function Fw(e, t) {
  let n = 0n;
  for (const i of e) {
    const s = Cw(bs(i.tapLeafScript));
    if (Ri.is(s)) {
      if (n !== 0n && xh(n) !== xh(s.params.absoluteTimelock))
        throw new Error("cannot mix seconds and blocks locktime");
      s.params.absoluteTimelock > n && (n = s.params.absoluteTimelock);
    }
  }
  const r = new pr({
    version: 3,
    lockTime: Number(n)
  });
  for (const [i, s] of e.entries())
    r.addInput({
      txid: s.txid,
      index: s.vout,
      sequence: n ? cf - 1 : void 0,
      witnessUtxo: {
        script: fn.decode(s.tapTree).pkScript,
        amount: BigInt(s.value)
      },
      tapLeafScript: [s.tapLeafScript]
    }), hT(r, i, Uw, s.tapTree);
  for (const i of t)
    r.addOutput(i);
  return r.addOutput(Af), r;
}
function eS(e, t) {
  const n = Cw(bs(e.tapLeafScript)), r = new fn([
    t.script,
    n.script
  ]), i = Fw([e], [
    {
      amount: BigInt(e.value),
      script: r.pkScript
    }
  ]), s = r.findLeaf(P.encode(n.script)), o = {
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
const nS = 500000000n;
function xh(e) {
  return e >= nS;
}
function rS(e, t) {
  if (!e.status.block_time)
    return !1;
  if (t.value === 0n)
    return !0;
  if (t.type === "blocks")
    return !1;
  const n = BigInt(Math.floor(Date.now() / 1e3));
  return BigInt(Math.floor(e.status.block_time)) + t.value <= n;
}
const iS = 4320 * 60 * 1e3, sS = {
  thresholdMs: iS
  // 3 days
};
let or = class $e {
  constructor(t, n, r = $e.DefaultHRP) {
    this.preimage = t, this.value = n, this.HRP = r, this.vout = 0;
    const i = Ht(this.preimage);
    this.vtxoScript = new fn([cS(i)]);
    const s = this.vtxoScript.leaves[0];
    this.txid = P.encode(new Uint8Array(i).reverse()), this.tapTree = this.vtxoScript.encode(), this.forfeitTapLeafScript = s, this.intentTapLeafScript = s, this.value = n, this.status = { confirmed: !0 }, this.extraWitness = [this.preimage];
  }
  encode() {
    const t = new Uint8Array($e.Length);
    return t.set(this.preimage, 0), oS(t, this.value, this.preimage.length), t;
  }
  static decode(t, n = $e.DefaultHRP) {
    if (t.length !== $e.Length)
      throw new Error(`invalid data length: expected ${$e.Length} bytes, got ${t.length}`);
    const r = t.subarray(0, $e.PreimageLength), i = aS(t, $e.PreimageLength);
    return new $e(r, i, n);
  }
  static fromString(t, n = $e.DefaultHRP) {
    if (t = t.trim(), !t.startsWith(n))
      throw new Error(`invalid human-readable part: expected ${n} prefix (note '${t}')`);
    const r = t.slice(n.length), i = Cu.decode(r);
    if (i.length === 0)
      throw new Error("failed to decode base58 string");
    return $e.decode(i, n);
  }
  toString() {
    return this.HRP + Cu.encode(this.encode());
  }
};
or.DefaultHRP = "arknote";
or.PreimageLength = 32;
or.ValueLength = 4;
or.Length = or.PreimageLength + or.ValueLength;
or.FakeOutpointIndex = 0;
function oS(e, t, n) {
  new DataView(e.buffer, e.byteOffset + n, 4).setUint32(0, t, !1);
}
function aS(e, t) {
  return new DataView(e.buffer, e.byteOffset + t, 4).getUint32(0, !1);
}
function cS(e) {
  return J.encode(["SHA256", e, "EQUAL"]);
}
var fl;
(function(e) {
  e[e.INDEXER_TX_TYPE_UNSPECIFIED = 0] = "INDEXER_TX_TYPE_UNSPECIFIED", e[e.INDEXER_TX_TYPE_RECEIVED = 1] = "INDEXER_TX_TYPE_RECEIVED", e[e.INDEXER_TX_TYPE_SENT = 2] = "INDEXER_TX_TYPE_SENT";
})(fl || (fl = {}));
var gi;
(function(e) {
  e.UNSPECIFIED = "INDEXER_CHAINED_TX_TYPE_UNSPECIFIED", e.COMMITMENT = "INDEXER_CHAINED_TX_TYPE_COMMITMENT", e.ARK = "INDEXER_CHAINED_TX_TYPE_ARK", e.TREE = "INDEXER_CHAINED_TX_TYPE_TREE", e.CHECKPOINT = "INDEXER_CHAINED_TX_TYPE_CHECKPOINT";
})(gi || (gi = {}));
let jw = class {
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
    if (!ke.isVtxoTreeResponse(o))
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
    if (!ke.isVtxoTreeLeavesResponse(o))
      throw new Error("Invalid vtxos tree leaves data received");
    return o;
  }
  async getBatchSweepTransactions(t) {
    const n = `${this.serverUrl}/v1/indexer/batch/${t.txid}/${t.vout}/sweepTxs`, r = await fetch(n);
    if (!r.ok)
      throw new Error(`Failed to fetch batch sweep transactions: ${r.statusText}`);
    const i = await r.json();
    if (!ke.isBatchSweepTransactionsResponse(i))
      throw new Error("Invalid batch sweep transactions data received");
    return i;
  }
  async getCommitmentTx(t) {
    const n = `${this.serverUrl}/v1/indexer/commitmentTx/${t}`, r = await fetch(n);
    if (!r.ok)
      throw new Error(`Failed to fetch commitment tx: ${r.statusText}`);
    const i = await r.json();
    if (!ke.isCommitmentTx(i))
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
    if (!ke.isConnectorsResponse(o))
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
    if (!ke.isForfeitTxsResponse(o))
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
          for await (const o of cl(i)) {
            if (n?.aborted)
              break;
            try {
              const a = JSON.parse(o.data);
              a.event && (yield {
                txid: a.event.txid,
                scripts: a.event.scripts || [],
                newVtxos: (a.event.newVtxos || []).map(go),
                spentVtxos: (a.event.spentVtxos || []).map(go),
                sweptVtxos: (a.event.sweptVtxos || []).map(go),
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
        if (ul(i)) {
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
    if (!ke.isVirtualTxsResponse(o))
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
    if (!ke.isVtxoChainResponse(o))
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
    if (!ke.isVtxosResponse(s))
      throw new Error("Invalid vtxos data received");
    return {
      vtxos: s.vtxos.map(go),
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
function go(e) {
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
var ke;
(function(e) {
  function t(b) {
    return typeof b == "object" && typeof b.totalOutputAmount == "string" && typeof b.totalOutputVtxos == "number" && typeof b.expiresAt == "string" && typeof b.swept == "boolean";
  }
  function n(b) {
    return typeof b == "object" && typeof b.txid == "string" && typeof b.expiresAt == "string" && Object.values(gi).includes(b.type) && Array.isArray(b.spends) && b.spends.every((W) => typeof W == "string");
  }
  function r(b) {
    return typeof b == "object" && typeof b.startedAt == "string" && typeof b.endedAt == "string" && typeof b.totalInputAmount == "string" && typeof b.totalInputVtxos == "number" && typeof b.totalOutputAmount == "string" && typeof b.totalOutputVtxos == "number" && typeof b.batches == "object" && Object.values(b.batches).every(t);
  }
  e.isCommitmentTx = r;
  function i(b) {
    return typeof b == "object" && typeof b.txid == "string" && typeof b.vout == "number";
  }
  e.isOutpoint = i;
  function s(b) {
    return Array.isArray(b) && b.every(i);
  }
  e.isOutpointArray = s;
  function o(b) {
    return typeof b == "object" && typeof b.txid == "string" && typeof b.children == "object" && Object.values(b.children).every(l) && Object.keys(b.children).every((W) => Number.isInteger(Number(W)));
  }
  function a(b) {
    return Array.isArray(b) && b.every(o);
  }
  e.isTxsArray = a;
  function c(b) {
    return typeof b == "object" && typeof b.amount == "string" && typeof b.createdAt == "string" && typeof b.isSettled == "boolean" && typeof b.settledBy == "string" && Object.values(fl).includes(b.type) && (!b.commitmentTxid && typeof b.virtualTxid == "string" || typeof b.commitmentTxid == "string" && !b.virtualTxid);
  }
  function u(b) {
    return Array.isArray(b) && b.every(c);
  }
  e.isTxHistoryRecordArray = u;
  function l(b) {
    return typeof b == "string" && b.length === 64;
  }
  function d(b) {
    return Array.isArray(b) && b.every(l);
  }
  e.isTxidArray = d;
  function h(b) {
    return typeof b == "object" && i(b.outpoint) && typeof b.createdAt == "string" && (b.expiresAt === null || typeof b.expiresAt == "string") && typeof b.amount == "string" && typeof b.script == "string" && typeof b.isPreconfirmed == "boolean" && typeof b.isSwept == "boolean" && typeof b.isUnrolled == "boolean" && typeof b.isSpent == "boolean" && (!b.spentBy || typeof b.spentBy == "string") && (!b.settledBy || typeof b.settledBy == "string") && (!b.arkTxid || typeof b.arkTxid == "string") && Array.isArray(b.commitmentTxids) && b.commitmentTxids.every(l);
  }
  function p(b) {
    return typeof b == "object" && typeof b.current == "number" && typeof b.next == "number" && typeof b.total == "number";
  }
  function y(b) {
    return typeof b == "object" && Array.isArray(b.vtxoTree) && b.vtxoTree.every(o) && (!b.page || p(b.page));
  }
  e.isVtxoTreeResponse = y;
  function f(b) {
    return typeof b == "object" && Array.isArray(b.leaves) && b.leaves.every(i) && (!b.page || p(b.page));
  }
  e.isVtxoTreeLeavesResponse = f;
  function g(b) {
    return typeof b == "object" && Array.isArray(b.connectors) && b.connectors.every(o) && (!b.page || p(b.page));
  }
  e.isConnectorsResponse = g;
  function m(b) {
    return typeof b == "object" && Array.isArray(b.txids) && b.txids.every(l) && (!b.page || p(b.page));
  }
  e.isForfeitTxsResponse = m;
  function S(b) {
    return typeof b == "object" && Array.isArray(b.sweptBy) && b.sweptBy.every(l);
  }
  e.isSweptCommitmentTxResponse = S;
  function v(b) {
    return typeof b == "object" && Array.isArray(b.sweptBy) && b.sweptBy.every(l);
  }
  e.isBatchSweepTransactionsResponse = v;
  function O(b) {
    return typeof b == "object" && Array.isArray(b.txs) && b.txs.every((W) => typeof W == "string") && (!b.page || p(b.page));
  }
  e.isVirtualTxsResponse = O;
  function R(b) {
    return typeof b == "object" && Array.isArray(b.chain) && b.chain.every(n) && (!b.page || p(b.page));
  }
  e.isVtxoChainResponse = R;
  function j(b) {
    return typeof b == "object" && Array.isArray(b.vtxos) && b.vtxos.every(h) && (!b.page || p(b.page));
  }
  e.isVtxosResponse = j;
})(ke || (ke = {}));
function ar(e, t) {
  return {
    ...t,
    forfeitTapLeafScript: e.offchainTapscript.forfeit(),
    intentTapLeafScript: e.offchainTapscript.forfeit(),
    tapTree: e.offchainTapscript.encode()
  };
}
function dl(e, t) {
  return {
    ...t,
    forfeitTapLeafScript: e.boardingTapscript.forfeit(),
    intentTapLeafScript: e.boardingTapscript.forfeit(),
    tapTree: e.boardingTapscript.encode()
  };
}
let gt = class extends Error {
  #t;
  constructor(t, n, r) {
    super(t, { cause: r }), this.name = "ParseError", this.#t = n, n?.input && (this.message = Ui(this.message, n));
  }
  get node() {
    return this.#t;
  }
  withAst(t) {
    return this.#t ? this : (this.#t = t, t?.input ? (this.message = Ui(this.message, t), this) : this);
  }
}, X = class extends Error {
  #t;
  constructor(t, n, r) {
    super(t, { cause: r }), this.name = "EvaluationError", this.#t = n, n?.input && (this.message = Ui(this.message, n));
  }
  get node() {
    return this.#t;
  }
  withAst(t) {
    return this.#t ? this : (this.#t = t, t?.input ? (this.message = Ui(this.message, t), this) : this);
  }
}, uS = class extends Error {
  #t;
  constructor(t, n, r) {
    super(t, { cause: r }), this.name = "TypeError", this.#t = n, n?.input && (this.message = Ui(this.message, n));
  }
  get node() {
    return this.#t;
  }
  withAst(t) {
    return this.#t ? this : (this.#t = t, t?.input ? (this.message = Ui(this.message, t), this) : this);
  }
};
function Ui(e, t) {
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
let Fr = class hl {
  #t;
  constructor(t) {
    this.#t = t;
  }
  static of(t) {
    return t === void 0 ? va : new hl(t);
  }
  static none() {
    return va;
  }
  hasValue() {
    return this.#t !== void 0;
  }
  value() {
    if (this.#t === void 0) throw new X("Optional value is not present");
    return this.#t;
  }
  or(t) {
    if (this.#t !== void 0) return this;
    if (t instanceof hl) return t;
    throw new X("Optional.or must be called with an Optional argument");
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
};
const va = Object.freeze(new Fr());
let Kw = class {
};
const zw = new Kw();
function lS(e, t) {
  e.constants.set("optional", t ? zw : void 0);
}
function fS(e) {
  const t = (d, h) => e.registerFunctionOverload(d, h), n = e.enableOptionalTypes ? zw : void 0;
  e.registerType("OptionalNamespace", Kw), e.registerConstant("optional", "OptionalNamespace", n), t("optional.hasValue(): bool", (d) => d.hasValue()), t("optional<A>.value(): A", (d) => d.value()), e.registerFunctionOverload("OptionalNamespace.none(): optional<T>", () => Fr.none()), t("OptionalNamespace.of(A): optional<A>", (d, h) => Fr.of(h));
  function r(d, h, p) {
    if (d instanceof Fr) return d;
    throw new X(`${p} must be optional`, h);
  }
  function i(d, h, p) {
    const y = d.eval(h.receiver, p);
    return y instanceof Promise ? y.then((f) => s(f, d, h, p)) : s(y, d, h, p);
  }
  function s(d, h, p, y) {
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
  e.registerFunctionOverload(
    "optional.or(ast): optional<dyn>",
    a({
      functionDesc: "optional.or(optional)",
      evaluate: i,
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
let Nr = class {
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
    if (t < 0n || t > 18446744073709551615n) throw new X("Unsigned integer overflow");
    this.#t = t;
  }
  get [Symbol.toStringTag]() {
    return `value = ${this.#t}`;
  }
  [Symbol.for("nodejs.util.inspect.custom")]() {
    return `UnsignedInteger { value: ${this.#t} }`;
  }
};
const dS = {
  h: 3600000000000n,
  m: 60000000000n,
  s: 1000000000n,
  ms: 1000000n,
  us: 1000n,
  µs: 1000n,
  ns: 1n
};
let Po = class Co {
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
    return new Co(r, i);
  }
  addDuration(t) {
    const n = this.#e + t.nanos;
    return new Co(
      this.#t + t.seconds + BigInt(Math.floor(n / 1e9)),
      n % 1e9
    );
  }
  subtractDuration(t) {
    const n = this.#e - t.nanos;
    return new Co(
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
};
function hS(e) {
  const t = (f, g) => e.registerFunctionOverload(f, g), n = (f) => f;
  t("dyn(dyn): dyn", n);
  for (const f in Es) {
    const g = Es[f];
    g instanceof oe && t(`type(${g.name}): type`, () => g);
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
        throw new X(`bool() conversion error: invalid string value "${f}"`);
    }
  });
  const r = Object.keys;
  t("size(string): int", (f) => BigInt(Th(f))), t("size(bytes): int", (f) => BigInt(f.length)), t("size(list): int", (f) => BigInt(f.length ?? f.size)), t(
    "size(map): int",
    (f) => BigInt(f instanceof Map ? f.size : r(f).length)
  ), t("string.size(): int", (f) => BigInt(Th(f))), t("bytes.size(): int", (f) => BigInt(f.length)), t("list.size(): int", (f) => BigInt(f.length ?? f.size)), t(
    "map.size(): int",
    (f) => BigInt(f instanceof Map ? f.size : r(f).length)
  ), t("bytes(string): bytes", (f) => o.fromString(f)), t("bytes(bytes): bytes", n), t("double(double): double", n), t("double(int): double", (f) => Number(f)), t("double(uint): double", (f) => Number(f)), t("double(string): double", (f) => {
    if (!f || f !== f.trim())
      throw new X("double() type error: cannot convert to double");
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
        throw new X("double() type error: cannot convert to double");
      }
    }
  }), t("int(int): int", n), t("int(double): int", (f) => {
    if (Number.isFinite(f)) return BigInt(Math.trunc(f));
    throw new X("int() type error: integer overflow");
  }), t("int(string): int", (f) => {
    if (f !== f.trim() || f.length > 20 || f.includes("0x"))
      throw new X("int() type error: cannot convert to int");
    try {
      const g = BigInt(f);
      if (g <= 9223372036854775807n && g >= -9223372036854775808n) return g;
    } catch {
    }
    throw new X("int() type error: cannot convert to int");
  }), t("uint(uint): uint", n), t("uint(double): uint", (f) => {
    if (Number.isFinite(f)) return BigInt(Math.trunc(f));
    throw new X("int() type error: integer overflow");
  }), t("uint(string): uint", (f) => {
    if (f !== f.trim() || f.length > 20 || f.includes("0x"))
      throw new X("uint() type error: cannot convert to uint");
    try {
      const g = BigInt(f);
      if (g <= 18446744073709551615n && g >= 0n) return g;
    } catch {
    }
    throw new X("uint() type error: cannot convert to uint");
  }), t("string(string): string", n), t("string(bool): string", (f) => `${f}`), t("string(int): string", (f) => `${f}`), t("string(bytes): string", (f) => o.toUtf8(f)), t("string(double): string", (f) => f === 1 / 0 ? "+Inf" : f === -1 / 0 ? "-Inf" : `${f}`), t("string.startsWith(string): bool", (f, g) => f.startsWith(g)), t("string.endsWith(string): bool", (f, g) => f.endsWith(g)), t("string.contains(string): bool", (f, g) => f.includes(g)), t("string.lowerAscii(): string", (f) => f.toLowerCase()), t("string.upperAscii(): string", (f) => f.toUpperCase()), t("string.trim(): string", (f) => f.trim()), t(
    "string.indexOf(string): int",
    (f, g) => BigInt(f.indexOf(g))
  ), t("string.indexOf(string, int): int", (f, g, m) => {
    if (g === "") return m;
    if (m = Number(m), m < 0 || m >= f.length)
      throw new X("string.indexOf(search, fromIndex): fromIndex out of range");
    return BigInt(f.indexOf(g, m));
  }), t(
    "string.lastIndexOf(string): int",
    (f, g) => BigInt(f.lastIndexOf(g))
  ), t("string.lastIndexOf(string, int): int", (f, g, m) => {
    if (g === "") return m;
    if (m = Number(m), m < 0 || m >= f.length)
      throw new X("string.lastIndexOf(search, fromIndex): fromIndex out of range");
    return BigInt(f.lastIndexOf(g, m));
  }), t("string.substring(int): string", (f, g) => {
    if (g = Number(g), g < 0 || g > f.length)
      throw new X("string.substring(start, end): start index out of range");
    return f.substring(g);
  }), t("string.substring(int, int): string", (f, g, m) => {
    if (g = Number(g), g < 0 || g > f.length)
      throw new X("string.substring(start, end): start index out of range");
    if (m = Number(m), m < g || m > f.length)
      throw new X("string.substring(start, end): end index out of range");
    return f.substring(g, m);
  }), t("string.matches(string): bool", (f, g) => {
    try {
      return new RegExp(g).test(f);
    } catch {
      throw new X(`Invalid regular expression: ${g}`);
    }
  }), t("string.split(string): list<string>", (f, g) => f.split(g)), t("string.split(string, int): list<string>", (f, g, m) => {
    if (m = Number(m), m === 0) return [];
    const S = f.split(g);
    if (m < 0 || S.length <= m) return S;
    const v = S.slice(0, m - 1);
    return v.push(S.slice(m - 1).join(g)), v;
  }), t("list<string>.join(): string", (f) => {
    for (let g = 0; g < f.length; g++)
      if (typeof f[g] != "string")
        throw new X("string.join(): list must contain only strings");
    return f.join("");
  }), t("list<string>.join(string): string", (f, g) => {
    for (let m = 0; m < f.length; m++)
      if (typeof f[m] != "string")
        throw new X("string.join(separator): list must contain only strings");
    return f.join(g);
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
    toHex: Uint8Array.prototype.toHex ? (f) => f.toHex() : (f) => Array.from(f, (g) => g.toString(16).padStart(2, "0")).join(""),
    toBase64: Uint8Array.prototype.toBase64 ? (f) => f.toBase64() : (f) => btoa(Array.from(f, (g) => String.fromCodePoint(g)).join("")),
    toUtf8: (f) => s.decode(f),
    jsonParse: (f) => JSON.parse(i.decode(f))
  };
  t("bytes.json(): map", o.jsonParse), t("bytes.hex(): string", o.toHex), t("bytes.string(): string", o.toUtf8), t("bytes.base64(): string", o.toBase64), t("bytes.at(int): int", (f, g) => {
    if (g < 0 || g >= f.length) throw new X("Bytes index out of range");
    return BigInt(f[g]);
  });
  const a = "google.protobuf.Timestamp", c = "google.protobuf.Duration", u = e.registerType(a, Date).getObjectType(a).typeType, l = e.registerType(c, Po).getObjectType(c).typeType;
  e.registerConstant("google", "map<string, map<string, type>>", {
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
      throw new X("timestamp() requires a string in ISO 8601 format");
    const g = new Date(f);
    if (g <= 253402300799999 && g >= -621355968e5) return g;
    throw new X("timestamp() requires a string in ISO 8601 format");
  }), t(`timestamp(int): ${a}`, (f) => {
    if (f = Number(f) * 1e3, f <= 253402300799999 && f >= -621355968e5) return new Date(f);
    throw new X("timestamp() requires a valid integer unix timestamp");
  }), t(`${a}.getDate(): int`, (f) => BigInt(f.getUTCDate())), t(`${a}.getDate(string): int`, (f, g) => BigInt(d(f, g).getDate())), t(`${a}.getDayOfMonth(): int`, (f) => BigInt(f.getUTCDate() - 1)), t(
    `${a}.getDayOfMonth(string): int`,
    (f, g) => BigInt(d(f, g).getDate() - 1)
  ), t(`${a}.getDayOfWeek(): int`, (f) => BigInt(f.getUTCDay())), t(`${a}.getDayOfWeek(string): int`, (f, g) => BigInt(d(f, g).getDay())), t(`${a}.getDayOfYear(): int`, h), t(`${a}.getDayOfYear(string): int`, h), t(`${a}.getFullYear(): int`, (f) => BigInt(f.getUTCFullYear())), t(`${a}.getFullYear(string): int`, (f, g) => BigInt(d(f, g).getFullYear())), t(`${a}.getHours(): int`, (f) => BigInt(f.getUTCHours())), t(`${a}.getHours(string): int`, (f, g) => BigInt(d(f, g).getHours())), t(`${a}.getMilliseconds(): int`, (f) => BigInt(f.getUTCMilliseconds())), t(`${a}.getMilliseconds(string): int`, (f) => BigInt(f.getUTCMilliseconds())), t(`${a}.getMinutes(): int`, (f) => BigInt(f.getUTCMinutes())), t(`${a}.getMinutes(string): int`, (f, g) => BigInt(d(f, g).getMinutes())), t(`${a}.getMonth(): int`, (f) => BigInt(f.getUTCMonth())), t(`${a}.getMonth(string): int`, (f, g) => BigInt(d(f, g).getMonth())), t(`${a}.getSeconds(): int`, (f) => BigInt(f.getUTCSeconds())), t(`${a}.getSeconds(string): int`, (f, g) => BigInt(d(f, g).getSeconds()));
  const p = /(\d*\.?\d*)(ns|us|µs|ms|s|m|h)/;
  function y(f) {
    if (!f) throw new X("Invalid duration string: ''");
    const g = f[0] === "-";
    (f[0] === "-" || f[0] === "+") && (f = f.slice(1));
    let m = BigInt(0);
    for (; ; ) {
      const O = p.exec(f);
      if (!O) throw new X(`Invalid duration string: ${f}`);
      if (O.index !== 0) throw new X(`Invalid duration string: ${f}`);
      f = f.slice(O[0].length);
      const R = dS[O[2]], [j = "0", b = ""] = O[1].split("."), W = BigInt(j) * R, U = b ? BigInt(b.slice(0, 13).padEnd(13, "0")) * R / 10000000000000n : 0n;
      if (m += W + U, f === "") break;
    }
    const S = m >= 1000000000n ? m / 1000000000n : 0n, v = Number(m % 1000000000n);
    return g ? new Po(-S, -v) : new Po(S, v);
  }
  t("duration(string): google.protobuf.Duration", (f) => y(f)), t("google.protobuf.Duration.getHours(): int", (f) => f.getHours()), t("google.protobuf.Duration.getMinutes(): int", (f) => f.getMinutes()), t("google.protobuf.Duration.getSeconds(): int", (f) => f.getSeconds()), t("google.protobuf.Duration.getMilliseconds(): int", (f) => f.getMilliseconds()), fS(e);
}
function Th(e) {
  let t = 0;
  for (const n of e) t++;
  return t;
}
let oe = class {
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
};
const Es = {
  string: new oe("string"),
  bool: new oe("bool"),
  int: new oe("int"),
  uint: new oe("uint"),
  double: new oe("double"),
  map: new oe("map"),
  list: new oe("list"),
  bytes: new oe("bytes"),
  null_type: new oe("null"),
  type: new oe("type")
};
let Ww = class qw {
  #t = null;
  #e = null;
  constructor(t) {
    t instanceof qw ? (this.#t = t, this.#e = /* @__PURE__ */ new Map()) : this.#e = new Map(t);
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
}, pS = class extends Ww {
  constructor(t = null, n = null) {
    super(t, n);
  }
  get(t) {
    const n = super.get(t);
    return n === void 0 ? _e : n;
  }
};
function wn(e, t = Ww, n = !0) {
  return e instanceof t ? e.fork(n) : new t(e);
}
let Sr = class {
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
    if (t = t instanceof Fr ? t.orValue() : t, t === void 0) return va;
    const s = i.debugType(t);
    try {
      return Fr.of(s.fieldLazy(t, n, r, i));
    } catch (o) {
      if (o instanceof X) return va;
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
    throw new X(
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
    throw new X(
      `Field '${n}' is not of type '${this.valueType}', got '${o}'`,
      r
    );
  }
  #a(t, n, r, i) {
    if (!(typeof n == "number" || typeof n == "bigint")) return;
    const s = t[n];
    if (s === void 0)
      throw new X(
        `No such key: index out of bounds, index ${n} ${n < 0 ? "< 0" : `>= size ${t.length}`}`,
        r
      );
    const o = i.debugType(s);
    if (this.valueType.matches(o)) return s;
    throw new X(
      `List item with index '${n}' is not of type '${this.valueType}', got '${o}'`,
      r
    );
  }
  fieldLazy() {
  }
  field(t, n, r, i) {
    const s = this.fieldLazy(t, n, r, i);
    if (s !== void 0) return s;
    throw new X(`No such key: ${n}`, r);
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
};
function gS(e, t) {
  const n = `Macro '${e}' must `;
  return function(i) {
    const s = t(i);
    if (!s || typeof s != "object") throw new Error(`${n} must return an object.`);
    if (!s?.typeCheck) throw new Error(`${n} have a .typeCheck(checker, macro, ctx) method.`);
    if (!s?.evaluate) throw new Error(`${n} have a .evaluate(evaluator, macro, ctx) method.`);
    return s;
  };
}
let yS = class {
  #t;
  constructor({ name: t, receiverType: n, argTypes: r, returnType: i, handler: s }) {
    this.name = t, this.receiverType = n || null, this.argTypes = r, this.returnType = i, this.macro = r.includes(Lo);
    const o = n ? `${n}.` : "";
    this.signature = `${o}${t}(${r.join(", ")}): ${i}`, this.handler = this.macro ? gS(this.signature, s) : s, Object.freeze(this);
  }
  hasPlaceholder() {
    return this.#t ??= this.returnType.hasPlaceholder() || this.receiverType?.hasPlaceholder() || this.argTypes.some((t) => t.hasPlaceholder()) || !1;
  }
  matchesArgs(t) {
    return t.length === this.argTypes.length && this.argTypes.every((n, r) => n.matches(t[r])) ? this : null;
  }
}, es = class {
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
};
function Gw(e) {
  return new Sr({
    kind: "list",
    name: `list<${e}>`,
    type: "list",
    valueType: e
  });
}
function En(e) {
  return new Sr({ kind: "primitive", name: e, type: e });
}
function wS(e) {
  return new Sr({ kind: "message", name: e, type: e });
}
function Yw(e) {
  const t = e ? `dyn<${e}>` : "dyn";
  return new Sr({ kind: "dyn", name: t, type: t, valueType: e });
}
function Zw(e) {
  const t = e ? `optional<${e}>` : "optional";
  return new Sr({ kind: "optional", name: t, type: "optional", valueType: e });
}
function Xw(e, t) {
  return new Sr({
    kind: "map",
    name: `map<${e}, ${t}>`,
    type: "map",
    keyType: e,
    valueType: t
  });
}
function mS(e) {
  return new Sr({ kind: "param", name: e, type: e });
}
const _e = Yw(), Lo = En("ast"), Sh = Gw(_e), vh = Xw(_e, _e), Yt = Object.freeze({
  string: En("string"),
  bool: En("bool"),
  int: En("int"),
  uint: En("uint"),
  double: En("double"),
  bytes: En("bytes"),
  dyn: _e,
  null: En("null"),
  type: En("type"),
  optional: Zw(_e),
  list: Sh,
  "list<dyn>": Sh,
  map: vh,
  "map<dyn, dyn>": vh
});
let bS = class {
  returnType = null;
  /** @type {Array<FunctionDeclaration>} */
  declarations = [];
  constructor(t) {
    this.registry = t;
  }
  add(t) {
    this.returnType = (this.returnType ? this.returnType.unify(this.registry, t.returnType) : t.returnType) || _e, this.declarations.push(t);
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
};
function $h(e) {
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
const Qw = [
  [void 0, "map"],
  [Object, "map"],
  [Map, "map"],
  [Array, "list"],
  [Uint8Array, "bytes"],
  [Nr, "uint"],
  [oe, "type"],
  [Fr, "optional"]
];
typeof Buffer < "u" && Qw.push([Buffer, "bytes"]);
let ES = class Jw {
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
    if (this.enableOptionalTypes = t.enableOptionalTypes ?? !1, this.objectTypes = wn(t.objectTypes), this.objectTypesByConstructor = wn(t.objectTypesByConstructor), this.objectTypeInstances = wn(t.objectTypeInstances), this.#i = wn(t.functionDeclarations), this.#r = wn(t.operatorDeclarations), this.#n = wn(
      t.typeDeclarations || Object.entries(Yt),
      void 0,
      !1
    ), this.constants = wn(t.constants), this.variables = t.unlistedVariablesAreDyn ? wn(t.variables, pS) : wn(t.variables), this.variables.size)
      lS(this, this.enableOptionalTypes);
    else {
      for (const n of Qw) this.registerType(n[1], n[0], !0);
      for (const n in Es) this.registerConstant(n, "type", Es[n]);
    }
  }
  #g() {
    this.#t = {}, this.#e = {};
  }
  registerVariable(t, n) {
    if (this.variables.has(t)) throw new Error(`Variable already registered: ${t}`);
    return this.variables.set(t, n instanceof Sr ? n : this.getType(n)), this;
  }
  registerConstant(t, n, r) {
    return this.registerVariable(t, n), this.constants.set(t, r), this;
  }
  #y(t, n, r) {
    let i = this.#o.get(t);
    return i = i.get(n) || i.set(n, /* @__PURE__ */ new Map()).get(n), i.get(r) || i.set(r, new bS(this)).get(r);
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
    return t === "ast" ? Lo : this.#s(t, !0);
  }
  registerType(t, n, r) {
    if (typeof t != "string" || t.length < 2)
      throw new Error(`Invalid type name: ${t}`);
    const i = {
      name: t,
      typeType: Es[t] || new oe(t),
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
    if (r = t.match(/^[A-Z]$/), r) return this.#l(mS, t, t);
    if (r = t.match(/^dyn<(.+)>$/), r) {
      const i = this.#s(r[1].trim(), n);
      return this.#l(Yw, `dyn<${i}>`, i);
    }
    if (r = t.match(/^list<(.+)>$/), r) {
      const i = this.#s(r[1].trim(), n);
      return this.#l(Gw, `list<${i}>`, i);
    }
    if (r = t.match(/^map<(.+)>$/), r) {
      const i = $h(r[1]);
      if (i.length !== 2) throw new Error(`Invalid map type: ${t}`);
      const s = this.#s(i[0].trim(), n), o = this.#s(i[1].trim(), n);
      return this.#l(Xw, `map<${s}, ${o}>`, s, o);
    }
    if (r = t.match(/^optional<(.+)>$/), r) {
      const i = this.#s(r[1].trim(), n);
      return this.#l(Zw, `optional<${i}>`, i);
    }
    if (n) {
      const i = new Error(`Unknown type: ${t}`);
      throw i.unknownType = t, i;
    }
    return this.#l(wS, t, t);
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
    return i.every((o) => o.returnType === s) ? s : (s.kind === "list" || s.kind === "map") && i.every((o) => o.returnType.kind === s.kind) ? s.kind === "list" ? Yt.list : Yt.map : Yt.dyn;
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
        const o = s ? Yt.dyn : n;
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
    return new Jw({
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
      return new yS({
        name: s,
        receiverType: i ? this.getType(i) : null,
        returnType: this.getType(a.trim()),
        argTypes: $h(o).map((c) => this.getFunctionType(c.trim())),
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
  #$(t, n) {
    return t.name !== n.name || t.argTypes.length !== n.argTypes.length || (t.receiverType || n.receiverType) && (!t.receiverType || !n.receiverType) ? !1 : !(t.receiverType !== n.receiverType && t.receiverType !== _e && n.receiverType !== _e) && (n.macro || t.macro || n.argTypes.every((i, s) => {
      const o = t.argTypes[s];
      return i === o || i === Lo || o === Lo || i === _e || o === _e;
    }));
  }
  /** @param {FunctionDeclaration} newDec */
  #k(t) {
    for (const [, n] of this.#i)
      if (this.#$(n, t))
        throw new Error(
          `Function signature '${t.signature}' overlaps with existing overload '${n.signature}'.`
        );
  }
  registerFunctionOverload(t, n) {
    const r = typeof n == "function" ? n : n?.handler, i = this.#v(t, r);
    this.#k(i), this.#i.set(i.signature, i), this.#o.get(!0).clear(), this.#o.get(!1).clear();
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
    ), a = new es({ operator: `${t}_`, leftType: s, returnType: o, handler: r });
    if (this.#h(a))
      throw new Error(`Operator overload already registered: ${t}${n}`);
    this.#r.set(a.signature, a), this.#g();
  }
  #h(t) {
    for (const [, n] of this.#r) if (t.equals(n)) return !0;
    return !1;
  }
  binaryOverload(t, n, r, i, s) {
    s ??= kh(n) ? "bool" : t;
    const o = `${t} ${n} ${r}: ${s}`, a = this.assertType(t, "left type", o), c = this.assertType(r, "right type", o), u = this.assertType(s, "return type", o);
    if (kh(n) && u.type !== "bool")
      throw new Error(`Comparison operator '${n}' must return 'bool', got '${u.type}'`);
    const l = new es({ operator: n, leftType: a, rightType: c, returnType: u, handler: i });
    if (l.hasPlaceholder() && !(c.hasPlaceholder() && a.hasPlaceholder()))
      throw new Error(
        `Operator overload with placeholders must use them in both left and right types: ${o}`
      );
    if (this.#h(l))
      throw new Error(`Operator overload already registered: ${l.signature}`);
    if (n === "==") {
      const d = [
        new es({
          operator: "!=",
          leftType: a,
          rightType: c,
          handler(h, p, y, f) {
            return !i(h, p, y, f);
          },
          returnType: u
        })
      ];
      a !== c && d.push(
        new es({
          operator: "==",
          leftType: c,
          rightType: a,
          handler(h, p, y, f) {
            return i(p, h, y, f);
          },
          returnType: u
        }),
        new es({
          operator: "!=",
          leftType: c,
          rightType: a,
          handler(h, p, y, f) {
            return !i(p, h, y, f);
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
};
function kh(e) {
  return e === "<" || e === "<=" || e === ">" || e === ">=" || e === "==" || e === "!=" || e === "in";
}
function xS(e) {
  return new ES(e);
}
let TS = class {
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
    return new SS(this);
  }
}, SS = class pl {
  parent;
  context;
  variableName;
  variableType;
  variableValue;
  constructor(t) {
    this.parent = t;
  }
  fork() {
    return new pl(this);
  }
  forkWithVariable(t, n) {
    const r = new pl(this);
    return r.variableType = t, r.variableName = n, r;
  }
  withContext(t) {
    if (typeof t != "object") throw new X("Context must be an object");
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
};
function wc(e, t) {
  if (e.op === "id") return e.args;
  throw new gt(t, e);
}
function Xs(e, t) {
  if (typeof t == "boolean") return !1;
  if (t instanceof Error)
    return e.error ??= t, /predicate must return bool|Unknown variable/.test(t.message);
  const n = e.ev.debugRuntimeType(t, e.firstMacroIter.checkedType);
  return e.error = new X(
    `${e.macro.functionDesc} predicate must return bool, got '${n}'`,
    e.firstMacroIter
  ), !0;
}
let vS = class {
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
    throw new X(
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
};
function xs(e, t) {
  return function(n, r, i) {
    const s = n.eval(r.receiver, i), o = new vS(n, r, i, e, t);
    return s instanceof Promise ? o.iterateAsync(s) : o.iterate(s);
  };
}
function $S(e, t, n) {
  if (Xs(e, n)) throw e.error;
  n === !1 && (e.return = !1);
}
function kS(e) {
  if (e.return !== void 0) return e.return;
  if (e.error) throw e.error;
  return !0;
}
function AS(e, t, n) {
  if (Xs(e, n)) throw e.error;
  n === !0 && (e.return = !0);
}
function IS(e) {
  if (e.return !== void 0) return e.return;
  if (e.error) throw e.error;
  return !1;
}
function OS(e, t, n) {
  if (Xs(e, n) || n instanceof Error) throw e.error;
  n && (e.found ? e.return = !1 : e.found = !0);
}
function BS(e) {
  return e.return !== void 0 ? e.return : e.found === !0;
}
function tm(e) {
  return e.results || [];
}
function NS(e, t, n) {
  if (n === !1) return;
  if (Xs(e, n) || n instanceof Error) throw e.error;
  const r = e.ev.eval(e.macro.second, t);
  return r instanceof Promise ? r.then((i) => (e.results ??= []).push(i)) : (e.results ??= []).push(r);
}
function RS(e, t, n) {
  if (n instanceof Error) throw e.error;
  return (e.results ??= []).push(n);
}
function US(e, t, n) {
  if (Xs(e, n) || n instanceof Error) throw e.error;
  n && (e.results ??= []).push(t.variableValue);
}
function PS(e, t, n) {
  if (t.kind === "dyn") return t;
  if (t.kind === "list") return t.valueType;
  if (t.kind === "map") return t.keyType;
  throw new e.Error(
    `Expression of type '${t}' cannot be range of a comprehension (must be list, map, or dynamic).`,
    n.receiver
  );
}
function If(e, t, n) {
  const r = PS(e, e.check(t.receiver, n), t);
  return n.forkWithVariable(r, t.predicateVar);
}
function ru({ description: e, evaluator: t }) {
  const n = `${e} invalid predicate iteration variable`;
  if (!t) throw new Error(`No evaluator provided for quantifier macro: ${e}`);
  function r(i, s, o) {
    o = If(i, s, o), s.variableType = o.variableType;
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
    predicateVar: wc(i[0], n),
    evaluate: t,
    typeCheck: r
  });
}
function Ah(e) {
  const t = e ? "map(var, filter, transform)" : "map(var, transform)", n = `${t} invalid predicate iteration variable`, r = xs(
    e ? NS : RS,
    tm
  );
  function i(s, o, a) {
    if (a = If(s, o, a), o.variableType = a.variableType, e) {
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
    predicateVar: wc(s[0], n),
    evaluate: r,
    typeCheck: i
  });
}
function CS() {
  const e = "filter(var, predicate)", t = `${e} invalid predicate iteration variable`, n = xs(US, tm);
  function r(i, s, o) {
    o = If(i, s, o), s.variableType = o.variableType;
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
    predicateVar: wc(i[0], t),
    evaluate: n,
    typeCheck: r
  });
}
function LS() {
  const e = "has() invalid argument";
  function t(r, i, s) {
    const o = i.macroHasProps;
    let a = o.length, c = r.eval(o[--a], s), u;
    for (; a--; ) {
      const l = o[a];
      if (l.op === ".?" && (u ??= !0), c = r.debugType(c).fieldLazy(c, l.args[1], l, r), c === void 0) {
        if (!(!u && a && l.op === ".")) break;
        throw new X(`No such key: ${l.args[1]}`, l);
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
function _S(e) {
  e.registerFunctionOverload("has(ast): bool", LS()), e.registerFunctionOverload(
    "list.all(ast, ast): bool",
    ru({
      description: "all(var, predicate)",
      evaluator: xs($S, kS)
    })
  ), e.registerFunctionOverload(
    "list.exists(ast, ast): bool",
    ru({
      description: "exists(var, predicate)",
      evaluator: xs(AS, IS)
    })
  ), e.registerFunctionOverload(
    "list.exists_one(ast, ast): bool",
    ru({
      description: "exists_one(var, predicate)",
      evaluator: xs(OS, BS)
    })
  ), e.registerFunctionOverload("list.map(ast, ast): list<dyn>", Ah(!1)), e.registerFunctionOverload("list.map(ast, ast, ast): list<dyn>", Ah(!0)), e.registerFunctionOverload("list.filter(ast, ast): list<dyn>", CS());
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
    var: wc(i[0], "invalid variable argument"),
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
function DS(e) {
  const t = e.unaryOverload.bind(e), n = e.binaryOverload.bind(e);
  function r(u, l) {
    if (u <= 9223372036854775807n && u >= -9223372036854775808n) return u;
    throw new X(`integer overflow: ${u}`, l);
  }
  t("!", "bool", (u) => !u), t("-", "int", (u) => -u), n("dyn<int>", "==", "double", (u, l) => u == l), n("dyn<int>", "==", "uint", (u, l) => u == l.valueOf()), n("int", "*", "int", (u, l, d) => r(u * l, d)), n("int", "+", "int", (u, l, d) => r(u + l, d)), n("int", "-", "int", (u, l, d) => r(u - l, d)), n("int", "/", "int", (u, l, d) => {
    if (l === 0n) throw new X("division by zero", d);
    return u / l;
  }), n("int", "%", "int", (u, l, d) => {
    if (l === 0n) throw new X("modulo by zero", d);
    return u % l;
  }), t("-", "double", (u) => -u), n("dyn<double>", "==", "int", (u, l) => u == l), n("dyn<double>", "==", "uint", (u, l) => u == l.valueOf()), n("double", "*", "double", (u, l) => u * l), n("double", "+", "double", (u, l) => u + l), n("double", "-", "double", (u, l) => u - l), n("double", "/", "double", (u, l) => u / l), n("string", "+", "string", (u, l) => u + l), n("list<V>", "+", "list<V>", (u, l) => [...u, ...l]), n("bytes", "+", "bytes", (u, l) => {
    const d = new Uint8Array(u.length + l.length);
    return d.set(u, 0), d.set(l, u.length), d;
  });
  const i = "google.protobuf.Duration";
  n(i, "+", i, (u, l) => u.addDuration(l)), n(i, "-", i, (u, l) => u.subtractDuration(l)), n(i, "==", i, (u, l) => u.seconds === l.seconds && u.nanos === l.nanos);
  const s = "google.protobuf.Timestamp";
  n(s, "==", s, (u, l) => u.getTime() === l.getTime()), n(s, "-", s, (u, l) => Po.fromMilliseconds(u.getTime() - l.getTime()), i), n(s, "-", i, (u, l) => l.subtractTimestamp(u)), n(s, "+", i, (u, l) => l.extendTimestamp(u)), n(i, "+", s, (u, l) => u.extendTimestamp(l));
  function o(u, l, d, h) {
    if (l instanceof Set && l.has(u)) return !0;
    for (const p of l) if (ns(u, p, h)) return !0;
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
      for (let g = 0; g < f; g++)
        if (!ns(u[g], l[g], h)) return !1;
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
  }), n("map<K, V>", "==", "map<K, V>", (u, l, d, h) => {
    if (u instanceof Map && l instanceof Map) {
      if (u.size !== l.size) return !1;
      for (const [f, g] of u)
        if (!(l.has(f) && ns(g, l.get(f), h))) return !1;
      return !0;
    }
    if (u instanceof Map || l instanceof Map) {
      const f = u instanceof Map ? l : u, g = u instanceof Map ? u : l, m = Object.keys(f);
      if (g.size !== m.length) return !1;
      for (const [S, v] of g)
        if (!(S in f && ns(v, f[S], h))) return !1;
      return !0;
    }
    const p = Object.keys(u), y = Object.keys(l);
    if (p.length !== y.length) return !1;
    for (let f = 0; f < p.length; f++) {
      const g = p[f];
      if (!(g in l && ns(u[g], l[g], h))) return !1;
    }
    return !0;
  }), n("uint", "==", "uint", (u, l) => u.valueOf() === l.valueOf()), n("dyn<uint>", "==", "double", (u, l) => u.valueOf() == l), n("dyn<uint>", "==", "int", (u, l) => u.valueOf() == l), n("uint", "+", "uint", (u, l) => new Nr(u.valueOf() + l.valueOf())), n("uint", "-", "uint", (u, l) => new Nr(u.valueOf() - l.valueOf())), n("uint", "*", "uint", (u, l) => new Nr(u.valueOf() * l.valueOf())), n("uint", "/", "uint", (u, l, d) => {
    if (l.valueOf() === 0n) throw new X("division by zero", d);
    return new Nr(u.valueOf() / l.valueOf());
  }), n("uint", "%", "uint", (u, l, d) => {
    if (l.valueOf() === 0n) throw new X("modulo by zero", d);
    return new Nr(u.valueOf() % l.valueOf());
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
function ns(e, t, n) {
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
  throw new X(`Cannot compare values of type ${typeof e}`);
}
let em = class {
  dynType = Yt.dyn;
  optionalType = Yt.optional;
  stringType = Yt.string;
  intType = Yt.int;
  doubleType = Yt.double;
  boolType = Yt.bool;
  nullType = Yt.null;
  listType = Yt.list;
  mapType = Yt.map;
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
        return t === null ? this.nullType : this.objectTypesByConstructor.get(t.constructor)?.type || Ih(this, t.constructor?.name || typeof t);
      default:
        Ih(this, typeof t);
    }
  }
};
function Ih(e, t) {
  throw new e.Error(`Unsupported type: ${t}`);
}
function _o(e, t, n, r, i) {
  return n instanceof Promise || r instanceof Promise ? Promise.all([n, r]).then((s) => i(e, t, s[0], s[1])) : i(e, t, n, r);
}
function Oh(e, t, n) {
  const r = e.check(t.args[0], n);
  return t.op === "[]" && e.check(t.args[1], n), r.kind !== "optional" ? e.checkAccessOnType(t, n, r) : e.registry.getOptionalType(e.checkAccessOnType(t, n, r.valueType, !0));
}
function Bh(e, t, n) {
  const r = e.check(t.args[0], n);
  t.op === "[?]" && e.check(t.args[1], n);
  const i = r.kind === "optional" ? r.valueType : r;
  return e.registry.getOptionalType(e.checkAccessOnType(t, n, i, !0));
}
function Nh(e, t, n, r, i) {
  const s = e.check(r, t);
  if (s === n || n.isEmpty()) return s;
  if (s.isEmpty()) return n;
  let o;
  throw i === 0 ? o = "List elements must have the same type," : i === 1 ? o = "Map key uses wrong type," : i === 2 && (o = "Map value uses wrong type,"), new e.Error(
    `${o} expected type '${e.formatType(n)}' but found '${e.formatType(s)}'`,
    r
  );
}
function Rh(e, t, n, r) {
  return n.unify(e.registry, e.check(r, t)) || e.dynType;
}
function $a(e, t, n) {
  const r = e.debugRuntimeType(t, n.checkedType);
  return new e.Error(`Logical operator requires bool operands, got '${r}'`, n);
}
function VS(e, t, n) {
  const r = e.debugRuntimeType(t, n.checkedType);
  return new e.Error(`Ternary condition must be bool, got '${r}'`, n);
}
function Uh(e, t, n, r) {
  if (n === !0) return e.eval(t.args[1], r);
  if (n === !1) return e.eval(t.args[2], r);
  throw VS(e, n, t.args[0]);
}
function Ph(e, t, n) {
  const r = e.debugRuntimeType(n, t.args[0].checkedType), i = e.registry.findUnaryOverload(t.op, r);
  if (i) return i.handler(n);
  throw new e.Error(`no such overload: ${t.op[0]}${r}`, t);
}
function Ch(e, t, n) {
  const r = e.eval(t.args[0], n);
  return r instanceof Promise ? r.then((i) => Ph(e, t, i)) : Ph(e, t, r);
}
function MS(e, t, n, r) {
  const i = e.debugOperandType(n, t.args[0].checkedType), s = e.debugOperandType(r, t.args[1].checkedType), o = e.registry.findBinaryOverload(t.op, i, s);
  if (o) return o.handler(n, r, t, e);
  throw new e.Error(`no such overload: ${i} ${t.op} ${s}`, t);
}
function HS(e, t, n) {
  return _o(e, t, e.eval(t.args[0], n), e.eval(t.args[1], n), MS);
}
function Lh(e, t, n, r) {
  if (n === !0) return !0;
  const i = e.eval(t.args[1], r);
  return i instanceof Promise ? i.then((s) => _h(e, t, n, s)) : _h(e, t, n, i);
}
function _h(e, t, n, r) {
  if (r === !0) return !0;
  if (r !== !1) throw $a(e, r, t.args[1]);
  if (n instanceof Error) throw n;
  if (n !== !1) throw $a(e, n, t.args[0]);
  return !1;
}
function Dh(e, t, n, r) {
  if (n === !1) return !1;
  const i = e.eval(t.args[1], r);
  return i instanceof Promise ? i.then((s) => Vh(e, t, n, s)) : Vh(e, t, n, i);
}
function Vh(e, t, n, r) {
  if (r === !1) return !1;
  if (r !== !0) throw $a(e, r, t.args[1]);
  if (n instanceof Error) throw n;
  if (n !== !0) throw $a(e, n, t.args[0]);
  return !0;
}
function Mh(e, t, n) {
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
function Hh(e, t, n) {
  const r = t.op, i = e.check(t.args[0], n);
  if (i.kind === "dyn") return r === "!_" ? e.boolType : i;
  const s = e.registry.findUnaryOverload(r, i);
  if (s) return s.returnType;
  throw new e.Error(`no such overload: ${r[0]}${e.formatType(i)}`, t);
}
function FS(e, t, n) {
  const r = t.op, i = e.check(t.args[0], n), s = e.check(t.args[1], n), o = e.registry.checkBinaryOverload(r, i, s);
  if (o) return o;
  throw new e.Error(
    `no such overload: ${e.formatType(i)} ${r} ${e.formatType(s)}`,
    t
  );
}
function Fh(e, t, n) {
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
function jS(e, t, n, r) {
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
function iu(e, t, n, r = n.length) {
  let i;
  const s = new Array(r);
  for (; r--; ) (s[r] = e.eval(n[r], t)) instanceof Promise && (i ??= !0);
  return i ? Promise.all(s) : s;
}
function jh(e) {
  const t = {};
  for (let n = 0; n < e.length; n++) {
    const [r, i] = e[n];
    r === "__proto__" || r === "constructor" || r === "prototype" || (t[r] = i);
  }
  return t;
}
function su(e, t, n, r) {
  return e.optionalType.field(n, r, t, e);
}
function ou(e, t, n, r) {
  return e.debugType(n).field(n, r, t, e);
}
const ka = {
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
    check: Oh,
    evaluate(e, t, n) {
      const r = e.eval(t.args[0], n);
      return r instanceof Promise ? r.then((i) => ou(e, t, i, t.args[1])) : ou(e, t, r, t.args[1]);
    }
  },
  ".?": {
    check: Bh,
    evaluate(e, t, n) {
      const r = e.eval(t.args[0], n);
      return r instanceof Promise ? r.then((i) => su(e, t, i, t.args[1])) : su(e, t, r, t.args[1]);
    }
  },
  "[]": {
    check: Oh,
    evaluate(e, t, n) {
      return _o(e, t, e.eval(t.args[0], n), e.eval(t.args[1], n), ou);
    }
  },
  "[?]": {
    check: Bh,
    evaluate(e, t, n) {
      return _o(e, t, e.eval(t.args[0], n), e.eval(t.args[1], n), su);
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
      const r = iu(e, n, t.args[1]);
      return r instanceof Promise ? r.then((i) => Fh(e, t, i)) : Fh(e, t, r);
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
      return t.macro ? t.macro.evaluate(e, t.macro, n) : _o(
        e,
        t,
        e.eval(t.args[1], n),
        iu(e, n, t.args[2]),
        jS
      );
    }
  },
  list: {
    check(e, t, n) {
      const r = t.args, i = r.length;
      if (i === 0) return e.getType("list<T>");
      let s = e.check(r[0], n);
      const o = e.opts.homogeneousAggregateLiterals ? Nh : Rh;
      for (let a = 1; a < i; a++) s = o(e, n, s, r[a], 0);
      return e.registry.getListType(s);
    },
    evaluate(e, t, n) {
      return iu(e, n, t.args);
    }
  },
  map: {
    check(e, t, n) {
      const r = t.args, i = r.length;
      if (i === 0) return e.getType("map<K, V>");
      const s = e.opts.homogeneousAggregateLiterals ? Nh : Rh;
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
      return o ? Promise.all(s).then(jh) : jh(s);
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
      return r instanceof Promise ? r.then((i) => Uh(e, t, i, n)) : Uh(e, t, r, n);
    }
  },
  "||": {
    check: Mh,
    evaluate(e, t, n) {
      const r = e.tryEval(t.args[0], n);
      return r instanceof Promise ? r.then((i) => Lh(e, t, i, n)) : Lh(e, t, r, n);
    }
  },
  "&&": {
    check: Mh,
    evaluate(e, t, n) {
      const r = e.tryEval(t.args[0], n);
      return r instanceof Promise ? r.then((i) => Dh(e, t, i, n)) : Dh(e, t, r, n);
    }
  },
  "!_": { check: Hh, evaluate: Ch },
  "-_": { check: Hh, evaluate: Ch }
}, KS = ["!=", "==", "in", "+", "-", "*", "/", "%", "<", "<=", ">", ">="];
for (const e of KS) ka[e] = { check: FS, evaluate: HS };
for (const e in ka) ka[e].name = e;
const zS = (/* @__PURE__ */ new Map()).set("A", "dyn").set("T", "dyn").set("K", "dyn").set("V", "dyn");
let Kh = class extends em {
  constructor(t, n) {
    super(t), this.isEvaluating = n, this.Error = n ? X : uS;
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
    return t.hasPlaceholder() ? t.templated(this.registry, zS).name : t.name;
  }
  formatTypeList(t) {
    return t.map((n) => this.formatType(n)).join(", ");
  }
};
const _ = {
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
let WS = class nm {
  #t;
  #e;
  constructor(t, n, r, i) {
    const s = ka[r];
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
    return [this.op, ...t.map((n) => n instanceof nm ? n.toOldStructure() : n)];
  }
};
const Do = {};
for (const e in _) Do[_[e]] = e;
const qS = /* @__PURE__ */ new Set([
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
]), rm = new Uint8Array(128);
for (const e of "0123456789abcdefABCDEF") rm[e.charCodeAt(0)] = 1;
const zh = {
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
let GS = class {
  constructor(t) {
    this.input = t, this.pos = 0, this.length = t.length;
  }
  // Read next token
  nextToken() {
    for (; ; ) {
      const { pos: t, input: n, length: r } = this;
      if (t >= r) return { type: _.EOF, value: null, pos: t };
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
          return { type: _.EQ, value: "==", pos: (this.pos += 2) - 2 };
        case "&":
          if (n[t + 1] !== "&") break;
          return { type: _.AND, value: "&&", pos: (this.pos += 2) - 2 };
        case "|":
          if (n[t + 1] !== "|") break;
          return { type: _.OR, value: "||", pos: (this.pos += 2) - 2 };
        case "+":
          return { type: _.PLUS, value: "+", pos: this.pos++ };
        case "-":
          return { type: _.MINUS, value: "-", pos: this.pos++ };
        case "*":
          return { type: _.MULTIPLY, value: "*", pos: this.pos++ };
        case "/":
          if (n[t + 1] === "/") {
            for (; this.pos < r && this.input[this.pos] !== `
`; ) this.pos++;
            continue;
          }
          return { type: _.DIVIDE, value: "/", pos: this.pos++ };
        case "%":
          return { type: _.MODULO, value: "%", pos: this.pos++ };
        case "<":
          return n[t + 1] === "=" ? { type: _.LE, value: "<=", pos: (this.pos += 2) - 2 } : { type: _.LT, value: "<", pos: this.pos++ };
        case ">":
          return n[t + 1] === "=" ? { type: _.GE, value: ">=", pos: (this.pos += 2) - 2 } : { type: _.GT, value: ">", pos: this.pos++ };
        case "!":
          return n[t + 1] === "=" ? { type: _.NE, value: "!=", pos: (this.pos += 2) - 2 } : { type: _.NOT, pos: this.pos++ };
        case "(":
          return { type: _.LPAREN, pos: this.pos++ };
        case ")":
          return { type: _.RPAREN, pos: this.pos++ };
        case "[":
          return { type: _.LBRACKET, pos: this.pos++ };
        case "]":
          return { type: _.RBRACKET, pos: this.pos++ };
        case "{":
          return { type: _.LBRACE, pos: this.pos++ };
        case "}":
          return { type: _.RBRACE, pos: this.pos++ };
        case ".":
          return { type: _.DOT, pos: this.pos++ };
        case ",":
          return { type: _.COMMA, pos: this.pos++ };
        case ":":
          return { type: _.COLON, pos: this.pos++ };
        case "?":
          return { type: _.QUESTION, pos: this.pos++ };
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
      throw new gt(`Unexpected character: ${i}`, { pos: t, input: n });
    }
  }
  // Characters: 0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_
  _isIdentifierCharCode(t) {
    return t < 48 || t > 122 ? !1 : t >= 97 || t >= 65 && t <= 90 || t <= 57 || t === 95;
  }
  _parseAsDouble(t, n) {
    const r = Number(this.input.substring(t, n));
    if (Number.isFinite(r)) return { type: _.NUMBER, value: r, pos: t };
    throw new gt(`Invalid number: ${r}`, { pos: t, input: this.input });
  }
  _parseAsBigInt(t, n, r, i) {
    const s = this.input.substring(t, n);
    if (i === "u" || i === "U") {
      this.pos++;
      try {
        return {
          type: _.NUMBER,
          value: new Nr(s),
          pos: t
        };
      } catch {
      }
    } else
      try {
        return {
          type: _.NUMBER,
          value: BigInt(s),
          pos: t
        };
      } catch {
      }
    throw new gt(r ? `Invalid hex integer: ${s}` : `Invalid integer: ${s}`, {
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
      if (r = this._readDigits(t, n, r), s === r) throw new gt("Invalid exponent", { pos: r, input: t });
    }
    return r;
  }
  readNumber() {
    const { input: t, length: n, pos: r } = this;
    let i = r;
    if (t[i] === "0" && (t[i + 1] === "x" || t[i + 1] === "X")) {
      for (i += 2; i < n && rm[t[i].charCodeAt(0)]; ) i++;
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
        return { type: _.BYTES, value: s, pos: r - 1 };
      }
      case "r":
      case "R":
        return { type: _.STRING, value: t, pos: r - 1 };
      default: {
        const i = this.processEscapes(t, !1);
        return { type: _.STRING, value: i, pos: r };
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
          throw new gt("Newlines not allowed in single-quoted strings", { pos: s, input: r });
        case "\\":
          a++;
      }
      a++;
    }
    throw new gt("Unterminated string", { pos: s, input: r });
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
    throw new gt("Unterminated triple-quoted string", { pos: s, input: r });
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
      if (zh[s])
        r += zh[s], i += 2;
      else if (s === "u") {
        if (n) throw new gt("\\u not allowed in bytes literals");
        const o = t.substring(i + 2, i += 6);
        if (!/^[0-9a-fA-F]{4}$/.test(o)) throw new gt(`Invalid Unicode escape: \\u${o}`);
        const a = Number.parseInt(o, 16);
        if (a >= 55296 && a <= 57343) throw new gt(`Invalid Unicode surrogate: \\u${o}`);
        r += String.fromCharCode(a);
      } else if (s === "U") {
        if (n) throw new gt("\\U not allowed in bytes literals");
        const o = t.substring(i + 2, i += 10);
        if (!/^[0-9a-fA-F]{8}$/.test(o)) throw new gt(`Invalid Unicode escape: \\U${o}`);
        const a = Number.parseInt(o, 16);
        if (a > 1114111) throw new gt(`Invalid Unicode escape: \\U${o}`);
        if (a >= 55296 && a <= 57343) throw new gt(`Invalid Unicode surrogate: \\U${o}`);
        r += String.fromCodePoint(a);
      } else if (s === "x" || s === "X") {
        const o = t.substring(i + 2, i += 4);
        if (!/^[0-9a-fA-F]{2}$/.test(o)) throw new gt(`Invalid hex escape: \\${s}${o}`);
        r += String.fromCharCode(Number.parseInt(o, 16));
      } else if (s >= "0" && s <= "7") {
        const o = t.substring(i + 1, i += 4);
        if (!/^[0-7]{3}$/.test(o)) throw new gt("Octal escape must be 3 digits");
        const a = Number.parseInt(o, 8);
        if (a > 255) throw new gt(`Octal escape out of range: \\${o}`);
        r += String.fromCharCode(a);
      } else
        throw new gt(`Invalid escape sequence: \\${s}`);
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
        return { type: _.BOOLEAN, value: !0, pos: t };
      case "false":
        return { type: _.BOOLEAN, value: !1, pos: t };
      case "null":
        return { type: _.NULL, value: null, pos: t };
      case "in":
        return { type: _.IN, value: "in", pos: t };
      default:
        return { type: _.IDENTIFIER, value: s, pos: t };
    }
  }
}, YS = class {
  constructor(t, n) {
    this.limits = t, this.registry = n;
  }
  #t(t, n = this.currentToken) {
    throw new gt(`Exceeded ${t} (${this.limits[t]})`, {
      pos: n.pos,
      input: this.input
    });
  }
  #e(t, n, r) {
    const i = new WS(t, this.input, n, r);
    return this.astNodesRemaining-- || this.#t("maxAstNodes", i), i;
  }
  #n() {
    const t = this.currentToken;
    return this.type = (this.currentToken = this.lexer.nextToken()).type, t;
  }
  consume(t) {
    if (this.type === t) return this.#n();
    throw new gt(
      `Expected ${Do[t]}, got ${Do[this.type]}`,
      { pos: this.currentToken.pos, input: this.input }
    );
  }
  match(t) {
    return this.type === t;
  }
  // Parse entry point
  parse(t) {
    this.input = t, this.lexer = new GS(t), this.#n(), this.maxDepthRemaining = this.limits.maxDepth, this.astNodesRemaining = this.limits.maxAstNodes;
    const n = this.parseExpression();
    if (this.match(_.EOF)) return n;
    throw new gt(`Unexpected character: '${this.input[this.lexer.pos - 1]}'`, {
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
    if (!this.match(_.QUESTION)) return ++this.maxDepthRemaining && t;
    const n = this.#n(), r = this.parseExpression();
    this.consume(_.COLON);
    const i = this.parseExpression();
    return this.maxDepthRemaining++, this.#e(n.pos, "?:", [t, r, i]);
  }
  // LogicalOr ::= LogicalAnd ('||' LogicalAnd)*
  parseLogicalOr() {
    let t = this.parseLogicalAnd();
    for (; this.match(_.OR); ) {
      const n = this.#n();
      t = this.#e(n.pos, n.value, [t, this.parseLogicalAnd()]);
    }
    return t;
  }
  // LogicalAnd ::= Equality ('&&' Equality)*
  parseLogicalAnd() {
    let t = this.parseEquality();
    for (; this.match(_.AND); ) {
      const n = this.#n();
      t = this.#e(n.pos, n.value, [t, this.parseEquality()]);
    }
    return t;
  }
  // Equality ::= Relational (('==' | '!=') Relational)*
  parseEquality() {
    let t = this.parseRelational();
    for (; this.match(_.EQ) || this.match(_.NE); ) {
      const n = this.#n();
      t = this.#e(n.pos, n.value, [t, this.parseRelational()]);
    }
    return t;
  }
  // Relational ::= Additive (('<' | '<=' | '>' | '>=' | 'in') Additive)*
  parseRelational() {
    let t = this.parseAdditive();
    for (; this.match(_.LT) || this.match(_.LE) || this.match(_.GT) || this.match(_.GE) || this.match(_.IN); ) {
      const n = this.#n();
      t = this.#e(n.pos, n.value, [t, this.parseAdditive()]);
    }
    return t;
  }
  // Additive ::= Multiplicative (('+' | '-') Multiplicative)*
  parseAdditive() {
    let t = this.parseMultiplicative();
    for (; this.match(_.PLUS) || this.match(_.MINUS); ) {
      const n = this.#n();
      t = this.#e(n.pos, n.value, [t, this.parseMultiplicative()]);
    }
    return t;
  }
  // Multiplicative ::= Unary (('*' | '/' | '%') Unary)*
  parseMultiplicative() {
    let t = this.parseUnary();
    for (; this.match(_.MULTIPLY) || this.match(_.DIVIDE) || this.match(_.MODULO); ) {
      const n = this.#n();
      t = this.#e(n.pos, n.value, [t, this.parseUnary()]);
    }
    return t;
  }
  // Unary ::= ('!' | '-')* Postfix
  parseUnary() {
    return this.type === _.NOT ? this.#e(this.#n().pos, "!_", [this.parseUnary()]) : this.type === _.MINUS ? this.#e(this.#n().pos, "-_", [this.parseUnary()]) : this.parsePostfix();
  }
  // Postfix ::= Primary (('.' IDENTIFIER ('(' ArgumentList ')')? | '[' Expression ']'))*
  parsePostfix() {
    let t = this.parsePrimary();
    const n = this.maxDepthRemaining;
    for (; ; ) {
      if (this.match(_.DOT)) {
        const r = this.#n();
        this.maxDepthRemaining-- || this.#t("maxDepth", r);
        const i = this.match(_.QUESTION) && this.registry.enableOptionalTypes && !!this.#n(), s = this.consume(_.IDENTIFIER);
        if (this.match(_.LPAREN) && this.#n()) {
          const o = this.parseArgumentList();
          this.consume(_.RPAREN), t = this.#o(
            this.#e(s.pos, "rcall", [s.value, t, o])
          );
        } else
          t = this.#e(s.pos, i ? ".?" : ".", [t, s.value]);
        continue;
      }
      if (this.match(_.LBRACKET)) {
        const r = this.#n();
        this.maxDepthRemaining-- || this.#t("maxDepth", r);
        const i = this.match(_.QUESTION) && this.registry.enableOptionalTypes && !!this.#n(), s = this.parseExpression();
        this.consume(_.RBRACKET), t = this.#e(r.pos, i ? "[?]" : "[]", [t, s]);
        continue;
      }
      break;
    }
    return this.maxDepthRemaining = n, t;
  }
  // Primary ::= NUMBER | STRING | BOOLEAN | NULL | IDENTIFIER | '(' Expression ')' | Array | Object
  parsePrimary() {
    switch (this.type) {
      case _.NUMBER:
      case _.STRING:
      case _.BYTES:
      case _.BOOLEAN:
      case _.NULL:
        return this.#a();
      case _.IDENTIFIER:
        return this.#c();
      case _.LPAREN:
        return this.#u();
      case _.LBRACKET:
        return this.parseList();
      case _.LBRACE:
        return this.parseMap();
    }
    throw new gt(`Unexpected token: ${Do[this.type]}`, {
      pos: this.currentToken.pos,
      input: this.input
    });
  }
  #a() {
    const t = this.#n();
    return this.#e(t.pos, "value", t.value);
  }
  #c() {
    const { value: t, pos: n } = this.consume(_.IDENTIFIER);
    if (qS.has(t))
      throw new gt(`Reserved identifier: ${t}`, {
        pos: n,
        input: this.input
      });
    if (!this.match(_.LPAREN)) return this.#e(n, "id", t);
    this.#n();
    const r = this.parseArgumentList();
    return this.consume(_.RPAREN), this.#i(this.#e(n, "call", [t, r]));
  }
  #u() {
    this.consume(_.LPAREN);
    const t = this.parseExpression();
    return this.consume(_.RPAREN), t;
  }
  parseList() {
    const t = this.consume(_.LBRACKET), n = [];
    let r = this.limits.maxListElements;
    if (!this.match(_.RBRACKET))
      for (n.push(this.parseExpression()), r-- || this.#t("maxListElements", n.at(-1)); this.match(_.COMMA) && (this.#n(), !this.match(_.RBRACKET)); )
        n.push(this.parseExpression()), r-- || this.#t("maxListElements", n.at(-1));
    return this.consume(_.RBRACKET), this.#e(t.pos, "list", n);
  }
  parseMap() {
    const t = this.consume(_.LBRACE), n = [];
    let r = this.limits.maxMapEntries;
    if (!this.match(_.RBRACE))
      for (n.push(this.parseProperty()), r-- || this.#t("maxMapEntries", n.at(-1)[0]); this.match(_.COMMA) && (this.#n(), !this.match(_.RBRACE)); )
        n.push(this.parseProperty()), r-- || this.#t("maxMapEntries", n.at(-1)[0]);
    return this.consume(_.RBRACE), this.#e(t.pos, "map", n);
  }
  parseProperty() {
    return [this.parseExpression(), (this.consume(_.COLON), this.parseExpression())];
  }
  parseArgumentList() {
    const t = [];
    let n = this.limits.maxCallArguments;
    if (!this.match(_.RPAREN))
      for (t.push(this.parseExpression()), n-- || this.#t("maxCallArguments", t.at(-1)); this.match(_.COMMA) && (this.#n(), !this.match(_.RPAREN)); )
        t.push(this.parseExpression()), n-- || this.#t("maxCallArguments", t.at(-1));
    return t;
  }
};
const Of = Object.freeze({
  maxAstNodes: 1e5,
  maxDepth: 250,
  maxListElements: 1e3,
  maxMapEntries: 1e3,
  maxCallArguments: 32
}), ZS = new Set(Object.keys(Of));
function XS(e, t = Of) {
  const n = e ? Object.keys(e) : void 0;
  if (!n?.length) return t;
  const r = { ...t };
  for (const i of n) {
    if (!ZS.has(i)) throw new TypeError(`Unknown limits option: ${i}`);
    const s = e[i];
    typeof s == "number" && (r[i] = s);
  }
  return Object.freeze(r);
}
const QS = Object.freeze({
  unlistedVariablesAreDyn: !1,
  homogeneousAggregateLiterals: !0,
  enableOptionalTypes: !1,
  limits: Of
});
function au(e, t, n) {
  const r = e?.[n] ?? t?.[n];
  if (typeof r != "boolean") throw new TypeError(`Invalid option: ${n}`);
  return r;
}
function JS(e, t = QS) {
  return e ? Object.freeze({
    unlistedVariablesAreDyn: au(e, t, "unlistedVariablesAreDyn"),
    homogeneousAggregateLiterals: au(e, t, "homogeneousAggregateLiterals"),
    enableOptionalTypes: au(e, t, "enableOptionalTypes"),
    limits: XS(e.limits, t.limits)
  }) : t;
}
const mc = xS({ enableOptionalTypes: !1 });
hS(mc);
DS(mc);
_S(mc);
const Wh = /* @__PURE__ */ new WeakMap();
let bc = class gl {
  #t;
  #e;
  #n;
  #r;
  #i;
  #o;
  constructor(t, n) {
    this.opts = JS(t, n?.opts), this.#t = (n instanceof gl ? Wh.get(n) : mc).clone(this.opts);
    const r = {
      objectTypes: this.#t.objectTypes,
      objectTypesByConstructor: this.#t.objectTypesByConstructor,
      registry: this.#t,
      opts: this.opts
    };
    this.#n = new Kh(r), this.#r = new Kh(r, !0), this.#e = new t1(r), this.#i = new YS(this.opts.limits, this.#t), this.#o = new TS(this.#t.variables, this.#t.constants), Wh.set(this, this.#t), Object.freeze(this);
  }
  clone(t) {
    return new gl(t, this);
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
}, t1 = class extends em {
  constructor(t) {
    super(t), this.Error = X;
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
};
new bc({
  unlistedVariablesAreDyn: !0
});
const Bf = "amount", e1 = "expiry", n1 = "birth", r1 = "weight", i1 = "inputType", s1 = "script", Pi = {
  signature: "now(): double",
  implementation: () => Math.floor(Date.now() / 1e3)
}, qh = new bc().registerVariable(Bf, "double").registerVariable(s1, "string").registerFunction(Pi.signature, Pi.implementation), o1 = new bc().registerVariable(Bf, "double").registerVariable(e1, "double").registerVariable(n1, "double").registerVariable(r1, "double").registerVariable(i1, "string").registerFunction(Pi.signature, Pi.implementation), a1 = new bc().registerVariable(Bf, "double").registerFunction(Pi.signature, Pi.implementation);
let Ae = class im {
  constructor(t) {
    this.value = t;
  }
  get satoshis() {
    return this.value ? Math.ceil(this.value) : 0;
  }
  add(t) {
    return new im(this.value + t.value);
  }
};
Ae.ZERO = new Ae(0);
let c1 = class {
  /**
   * Creates a new Estimator with the given config
   * @param config - Configuration containing CEL programs for fee calculation
   */
  constructor(t) {
    this.config = t, this.intentOffchainInput = t.offchainInput ? yo(t.offchainInput, o1) : void 0, this.intentOnchainInput = t.onchainInput ? yo(t.onchainInput, a1) : void 0, this.intentOffchainOutput = t.offchainOutput ? yo(t.offchainOutput, qh) : void 0, this.intentOnchainOutput = t.onchainOutput ? yo(t.onchainOutput, qh) : void 0;
  }
  /**
   * Evaluates the fee for a given vtxo input
   * @param input - The offchain input to evaluate
   * @returns The fee amount for this input
   */
  evalOffchainInput(t) {
    if (!this.intentOffchainInput)
      return Ae.ZERO;
    const n = u1(t);
    return new Ae(this.intentOffchainInput.program(n));
  }
  /**
   * Evaluates the fee for a given boarding input
   * @param input - The onchain input to evaluate
   * @returns The fee amount for this input
   */
  evalOnchainInput(t) {
    if (!this.intentOnchainInput)
      return Ae.ZERO;
    const n = {
      amount: Number(t.amount)
    };
    return new Ae(this.intentOnchainInput.program(n));
  }
  /**
   * Evaluates the fee for a given vtxo output
   * @param output - The output to evaluate
   * @returns The fee amount for this output
   */
  evalOffchainOutput(t) {
    if (!this.intentOffchainOutput)
      return Ae.ZERO;
    const n = Gh(t);
    return new Ae(this.intentOffchainOutput.program(n));
  }
  /**
   * Evaluates the fee for a given collaborative exit output
   * @param output - The output to evaluate
   * @returns The fee amount for this output
   */
  evalOnchainOutput(t) {
    if (!this.intentOnchainOutput)
      return Ae.ZERO;
    const n = Gh(t);
    return new Ae(this.intentOnchainOutput.program(n));
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
    let s = Ae.ZERO;
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
function u1(e) {
  const t = {
    amount: Number(e.amount),
    inputType: e.type,
    weight: e.weight
  };
  return e.expiry && (t.expiry = Math.floor(e.expiry.getTime() / 1e3)), e.birth && (t.birth = Math.floor(e.birth.getTime() / 1e3)), t;
}
function Gh(e) {
  return {
    amount: Number(e.amount),
    script: e.script
  };
}
function yo(e, t) {
  const n = t.parse(e), r = n.check();
  if (!r.valid)
    throw new Error(`type check failed: ${r.error?.message ?? "unknown error"}`);
  if (r.type !== "double")
    throw new Error(`expected return type double, got ${r.type}`);
  return { program: n, text: e };
}
const rs = {
  commitmentTxid: "",
  boardingTxid: "",
  arkTxid: ""
};
function l1(e, t, n) {
  const r = [...e].sort((c, u) => c.createdAt.getTime() - u.createdAt.getTime()), i = [];
  let s = [];
  for (const c of r)
    if (c.status.isLeaf ? !n.has(c.virtualStatus.commitmentTxIds[0]) && r.filter((u) => u.settledBy === c.virtualStatus.commitmentTxIds[0]).length === 0 && s.push({
      key: {
        ...rs,
        commitmentTxid: c.virtualStatus.commitmentTxIds[0]
      },
      tag: "batch",
      type: Tn.TxReceived,
      amount: c.value,
      settled: c.status.isLeaf || c.isSpent,
      createdAt: c.createdAt.getTime()
    }) : r.filter((u) => u.arkTxId === c.txid).length === 0 && s.push({
      key: { ...rs, arkTxid: c.txid },
      tag: "offchain",
      type: Tn.TxReceived,
      amount: c.value,
      settled: c.status.isLeaf || c.isSpent,
      createdAt: c.createdAt.getTime()
    }), c.isSpent) {
      if (c.arkTxId && !i.some((u) => u.key.arkTxid === c.arkTxId)) {
        const u = r.filter((h) => h.txid === c.arkTxId);
        let l = 0, d = 0;
        if (u.length > 0) {
          const h = u.reduce((f, g) => f + g.value, 0);
          l = r.filter((f) => f.arkTxId === c.arkTxId).reduce((f, g) => f + g.value, 0) - h, d = u[0].createdAt.getTime();
        } else
          l = c.value, d = c.createdAt.getTime() + 1;
        i.push({
          key: { ...rs, arkTxid: c.arkTxId },
          tag: "offchain",
          type: Tn.TxSent,
          amount: l,
          settled: !0,
          createdAt: d
        });
      }
      if (c.settledBy && !n.has(c.settledBy) && !i.some((u) => u.key.commitmentTxid === c.settledBy)) {
        const u = r.filter((h) => h.status.isLeaf && h.virtualStatus.commitmentTxIds?.every((p) => c.settledBy === p)), d = r.filter((h) => h.settledBy === c.settledBy).reduce((h, p) => h + p.value, 0);
        if (u.length > 0) {
          const h = u.reduce((p, y) => p + y.value, 0);
          d > h && i.push({
            key: { ...rs, commitmentTxid: c.settledBy },
            tag: "exit",
            type: Tn.TxSent,
            amount: d - h,
            settled: !0,
            createdAt: u[0].createdAt.getTime()
          });
        } else
          i.push({
            key: { ...rs, commitmentTxid: c.settledBy },
            tag: "exit",
            type: Tn.TxSent,
            amount: d,
            settled: !0,
            // TODO: fetch commitment tx with /v1/indexer/commitmentTx/<commitmentTxid> to know when the tx was made
            createdAt: c.createdAt.getTime() + 1
          });
      }
    }
  return [...t.map((c) => ({ ...c, tag: "boarding" })), ...i, ...s].sort((c, u) => u.createdAt - c.createdAt);
}
const Ec = "arkade-service-worker", zn = "vtxos", Wn = "utxos", qn = "transactions", oi = "walletState", Qe = "contracts", Je = "contractsCollections", Yh = 2;
function f1(e) {
  if (!e.objectStoreNames.contains(zn)) {
    const t = e.createObjectStore(zn, {
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
  if (!e.objectStoreNames.contains(Wn)) {
    const t = e.createObjectStore(Wn, {
      keyPath: ["address", "txid", "vout"]
    });
    t.indexNames.contains("address") || t.createIndex("address", "address", {
      unique: !1
    }), t.indexNames.contains("txid") || t.createIndex("txid", "txid", { unique: !1 }), t.indexNames.contains("value") || t.createIndex("value", "value", { unique: !1 }), t.indexNames.contains("status") || t.createIndex("status", "status", {
      unique: !1
    });
  }
  if (!e.objectStoreNames.contains(qn)) {
    const t = e.createObjectStore(qn, {
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
  return e.objectStoreNames.contains(oi) || e.createObjectStore(oi, {
    keyPath: "key"
  }), e.objectStoreNames.contains(Qe) || e.createObjectStore(Qe, {
    keyPath: "key"
  }), e.objectStoreNames.contains(Je) || e.createObjectStore(Je, {
    keyPath: "key"
  }), e;
}
function d1() {
  if (typeof globalThis < "u")
    return typeof globalThis.self == "object" && globalThis.self !== null ? { globalObject: globalThis.self } : typeof globalThis.window == "object" && globalThis.window !== null ? { globalObject: globalThis.window } : { globalObject: globalThis };
  throw new Error("Global object not found");
}
const Aa = ([e, t]) => ({
  cb: P.encode(nn.encode(e)),
  s: P.encode(t)
}), h1 = (e) => ({
  ...e,
  tapTree: P.encode(e.tapTree),
  forfeitTapLeafScript: Aa(e.forfeitTapLeafScript),
  intentTapLeafScript: Aa(e.intentTapLeafScript),
  extraWitness: e.extraWitness?.map(P.encode)
}), p1 = (e) => ({
  ...e,
  tapTree: P.encode(e.tapTree),
  forfeitTapLeafScript: Aa(e.forfeitTapLeafScript),
  intentTapLeafScript: Aa(e.intentTapLeafScript),
  extraWitness: e.extraWitness?.map(P.encode)
}), Ia = (e) => {
  const t = nn.decode(P.decode(e.cb)), n = P.decode(e.s);
  return [t, n];
}, g1 = (e) => ({
  ...e,
  createdAt: new Date(e.createdAt),
  tapTree: P.decode(e.tapTree),
  forfeitTapLeafScript: Ia(e.forfeitTapLeafScript),
  intentTapLeafScript: Ia(e.intentTapLeafScript),
  extraWitness: e.extraWitness?.map(P.decode)
}), y1 = (e) => ({
  ...e,
  tapTree: P.decode(e.tapTree),
  forfeitTapLeafScript: Ia(e.forfeitTapLeafScript),
  intentTapLeafScript: Ia(e.intentTapLeafScript),
  extraWitness: e.extraWitness?.map(P.decode)
}), Ts = /* @__PURE__ */ new Map(), yi = /* @__PURE__ */ new Map();
async function sm(e = Ec) {
  const { globalObject: t } = d1();
  if (!t.indexedDB)
    throw new Error("IndexedDB is not available in this environment");
  const n = Ts.get(e);
  if (n)
    return yi.set(e, (yi.get(e) ?? 0) + 1), n;
  const r = new Promise((i, s) => {
    const o = t.indexedDB.open(e, Yh);
    console.log("Opening DB with version:", Yh), o.onerror = () => {
      Ts.delete(e), s(o.error);
    }, o.onsuccess = () => {
      console.log("Opened DB, actual version:", o.result.version), i(o.result);
    }, o.onupgradeneeded = () => {
      const a = o.result;
      f1(a);
    }, o.onblocked = () => {
      console.warn("Database upgrade blocked - close other tabs/connections");
    };
  });
  return Ts.set(e, r), yi.set(e, 1), r;
}
async function om(e = Ec) {
  const t = Ts.get(e);
  if (!t)
    return !1;
  const n = (yi.get(e) ?? 1) - 1;
  if (n > 0)
    return yi.set(e, n), !1;
  yi.delete(e), Ts.delete(e);
  try {
    (await t).close();
  } catch {
  }
  return !0;
}
const cu = (e, t) => `contract:${e}:${t}`, uu = (e) => `collection:${e}`;
let w1 = class {
  constructor(t = Ec) {
    this.dbName = t, this.db = null;
  }
  async [Symbol.asyncDispose]() {
    this.db && (await om(this.dbName), this.db = null);
  }
  async getContractData(t, n) {
    try {
      const r = await this.getDB();
      return new Promise((i, s) => {
        const c = r.transaction([Qe], "readonly").objectStore(Qe).get(cu(t, n));
        c.onerror = () => s(c.error), c.onsuccess = () => {
          const u = c.result;
          if (!u?.value)
            return i(null);
          try {
            i(JSON.parse(u.value));
          } catch (l) {
            s(l);
          }
        };
      });
    } catch (r) {
      return console.error(`Failed to get contract data for ${t}:${n}:`, r), null;
    }
  }
  async setContractData(t, n, r) {
    try {
      const i = await this.getDB();
      return new Promise((s, o) => {
        const u = i.transaction([Qe], "readwrite").objectStore(Qe).put({
          key: cu(t, n),
          value: JSON.stringify(r)
        });
        u.onerror = () => o(u.error), u.onsuccess = () => s();
      });
    } catch (i) {
      throw console.error(`Failed to set contract data for ${t}:${n}:`, i), i;
    }
  }
  async deleteContractData(t, n) {
    try {
      const r = await this.getDB();
      return new Promise((i, s) => {
        const c = r.transaction([Qe], "readwrite").objectStore(Qe).delete(cu(t, n));
        c.onerror = () => s(c.error), c.onsuccess = () => i();
      });
    } catch (r) {
      throw console.error(`Failed to delete contract data for ${t}:${n}:`, r), r;
    }
  }
  async clearContractData() {
    try {
      const t = await this.getDB();
      return new Promise((n, r) => {
        const i = t.transaction([Qe, Je], "readwrite"), s = i.objectStore(Qe), o = i.objectStore(Je), a = s.clear(), c = o.clear();
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
  async getContractCollection(t) {
    try {
      const n = await this.getDB();
      return new Promise((r, i) => {
        const a = n.transaction([Je], "readonly").objectStore(Je).get(uu(t));
        a.onerror = () => i(a.error), a.onsuccess = () => {
          const c = a.result;
          if (!c?.value)
            return r([]);
          try {
            r(JSON.parse(c.value));
          } catch (u) {
            i(u);
          }
        };
      });
    } catch (n) {
      return console.error(`Failed to get contract collection ${t}:`, n), [];
    }
  }
  async saveToContractCollection(t, n, r) {
    const i = n[r];
    if (i == null)
      throw new Error(`Item is missing required field '${String(r)}'`);
    try {
      const s = await this.getDB();
      return new Promise((o, a) => {
        const u = s.transaction([Je], "readwrite").objectStore(Je), l = uu(t), d = u.get(l);
        d.onerror = () => a(d.error), d.onsuccess = () => {
          try {
            const h = d.result, p = h?.value ? JSON.parse(h.value) : [], y = p.findIndex((m) => m[r] === i), f = y !== -1 ? p.map((m, S) => S === y ? n : m) : [...p, n], g = u.put({
              key: l,
              value: JSON.stringify(f)
            });
            g.onerror = () => a(g.error), g.onsuccess = () => o();
          } catch (h) {
            a(h);
          }
        };
      });
    } catch (s) {
      throw console.error(`Failed to save to contract collection ${t}:`, s), s;
    }
  }
  async removeFromContractCollection(t, n, r) {
    if (n == null)
      throw new Error(`Invalid id provided for removal: ${String(n)}`);
    try {
      const i = await this.getDB();
      return new Promise((s, o) => {
        const c = i.transaction([Je], "readwrite").objectStore(Je), u = uu(t), l = c.get(u);
        l.onerror = () => o(l.error), l.onsuccess = () => {
          try {
            const d = l.result, p = (d?.value ? JSON.parse(d.value) : []).filter((f) => f[r] !== n), y = c.put({
              key: u,
              value: JSON.stringify(p)
            });
            y.onerror = () => o(y.error), y.onsuccess = () => s();
          } catch (d) {
            o(d);
          }
        };
      });
    } catch (i) {
      throw console.error(`Failed to remove from contract collection ${t}:`, i), i;
    }
  }
  async getDB() {
    return this.db ? this.db : (this.db = await sm(this.dbName), this.db);
  }
}, am = class {
  constructor(t = Ec) {
    this.dbName = t, this.db = null;
  }
  async [Symbol.asyncDispose]() {
    this.db && (await om(this.dbName), this.db = null);
  }
  async getVtxos(t) {
    try {
      const n = await this.getDB();
      return new Promise((r, i) => {
        const c = n.transaction([zn], "readonly").objectStore(zn).index("address").getAll(t);
        c.onerror = () => i(c.error), c.onsuccess = () => {
          const l = (c.result || []).map(g1);
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
        const o = r.transaction([zn], "readwrite"), a = o.objectStore(zn), c = n.map((u) => new Promise((l, d) => {
          const h = h1(u), p = {
            address: t,
            ...h
          }, y = a.put(p);
          y.onerror = () => d(y.error), y.onsuccess = () => l();
        }));
        Promise.all(c).then(() => i()).catch(s), o.onerror = () => s(o.error);
      });
    } catch (r) {
      throw console.error(`Failed to save VTXOs for address ${t}:`, r), r;
    }
  }
  async clearVtxos(t) {
    try {
      const n = await this.getDB();
      return new Promise((r, i) => {
        const c = n.transaction([zn], "readwrite").objectStore(zn).index("address").openCursor(IDBKeyRange.only(t));
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
        const c = n.transaction([Wn], "readonly").objectStore(Wn).index("address").getAll(t);
        c.onerror = () => i(c.error), c.onsuccess = () => {
          const l = (c.result || []).map(y1);
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
        const o = r.transaction([Wn], "readwrite"), a = o.objectStore(Wn), c = n.map((u) => new Promise((l, d) => {
          const h = p1(u), p = {
            address: t,
            ...h
          }, y = a.put(p);
          y.onerror = () => d(y.error), y.onsuccess = () => l();
        }));
        Promise.all(c).then(() => i()).catch(s), o.onerror = () => s(o.error);
      });
    } catch (r) {
      throw console.error(`Failed to save UTXOs for address ${t}:`, r), r;
    }
  }
  async clearUtxos(t) {
    try {
      const n = await this.getDB();
      return new Promise((r, i) => {
        const c = n.transaction([Wn], "readwrite").objectStore(Wn).index("address").openCursor(IDBKeyRange.only(t));
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
        const c = n.transaction([qn], "readonly").objectStore(qn).index("address").getAll(t);
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
        const o = r.transaction([qn], "readwrite"), a = o.objectStore(qn);
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
  async clearTransactions(t) {
    try {
      const n = await this.getDB();
      return new Promise((r, i) => {
        const c = n.transaction([qn], "readwrite").objectStore(qn).index("address").openCursor(IDBKeyRange.only(t));
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
        const o = t.transaction([oi], "readonly").objectStore(oi).get("state");
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
        const o = n.transaction([oi], "readwrite").objectStore(oi), a = {
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
    return this.db ? this.db : (this.db = await sm(this.dbName), this.db);
  }
};
function m1(e) {
  return typeof e == "object" && e !== null && "toReadonly" in e && typeof e.toReadonly == "function";
}
let Vo = class yl {
  constructor(t, n, r, i, s, o, a, c, u, l) {
    this.identity = t, this.network = n, this.onchainProvider = r, this.indexerProvider = i, this.arkServerPublicKey = s, this.offchainTapscript = o, this.boardingTapscript = a, this.dustAmount = c, this.walletRepository = u, this.contractRepository = l;
  }
  /**
   * Protected helper to set up shared wallet configuration.
   * Extracts common logic used by both ReadonlyWallet.create() and Wallet.create().
   */
  static async setupWalletConfig(t, n) {
    const r = t.arkProvider || (() => {
      if (!t.arkServerUrl)
        throw new Error("Either arkProvider or arkServerUrl must be provided");
      return new Mw(t.arkServerUrl);
    })(), i = t.arkServerUrl || r.serverUrl;
    if (!i)
      throw new Error("Could not determine arkServerUrl from provider");
    const s = t.indexerUrl || i, o = t.indexerProvider || new jw(s), a = await r.getInfo(), c = CT(a.network), u = t.esploraUrl || _T[a.network], l = t.onchainProvider || new DT(u);
    if (t.exitTimelock) {
      const { value: v, type: O } = t.exitTimelock;
      if (v < 512n && O !== "blocks" || v >= 512n && O !== "seconds")
        throw new Error("invalid exitTimelock");
    }
    const d = t.exitTimelock ?? {
      value: a.unilateralExitDelay,
      type: a.unilateralExitDelay < 512n ? "blocks" : "seconds"
    };
    if (t.boardingTimelock) {
      const { value: v, type: O } = t.boardingTimelock;
      if (v < 512n && O !== "blocks" || v >= 512n && O !== "seconds")
        throw new Error("invalid boardingTimelock");
    }
    const h = t.boardingTimelock ?? {
      value: a.boardingExitDelay,
      type: a.boardingExitDelay < 512n ? "blocks" : "seconds"
    }, p = P.decode(a.signerPubkey).slice(1), y = new Sa.Script({
      pubKey: n,
      serverPubKey: p,
      csvTimelock: d
    }), f = new Sa.Script({
      pubKey: n,
      serverPubKey: p,
      csvTimelock: h
    }), g = y, m = t.storage?.walletRepository ?? new am(), S = t.storage?.contractRepository ?? new w1();
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
      walletRepository: m,
      contractRepository: S,
      info: a
    };
  }
  static async create(t) {
    const n = await t.identity.xOnlyPublicKey();
    if (!n)
      throw new Error("Invalid configured public key");
    const r = await yl.setupWalletConfig(t, n);
    return new yl(t.identity, r.network, r.onchainProvider, r.indexerProvider, r.serverPubKey, r.offchainTapscript, r.boardingTapscript, r.dustAmount, r.walletRepository, r.contractRepository);
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
    s = n.filter((l) => l.virtualStatus.state === "settled").reduce((l, d) => l + d.value, 0), o = n.filter((l) => l.virtualStatus.state === "preconfirmed").reduce((l, d) => l + d.value, 0), a = n.filter((l) => er(l) && l.virtualStatus.state === "swept").reduce((l, d) => l + d.value, 0);
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
    const n = await this.getAddress(), i = (await this.getVirtualCoins(t)).map((s) => ar(this, s));
    return await this.walletRepository.saveVtxos(n, i), i;
  }
  async getVirtualCoins(t = { withRecoverable: !0, withUnrolled: !1 }) {
    const n = [P.encode(this.offchainTapscript.pkScript)], i = (await this.indexerProvider.getVtxos({ scripts: n })).vtxos;
    let s = i.filter(er);
    if (t.withRecoverable || (s = s.filter((o) => !kf(o) && !_w(o))), t.withUnrolled) {
      const o = i.filter((a) => !er(a));
      s.push(...o.filter((a) => a.isUnrolled));
    }
    return s;
  }
  async getTransactionHistory() {
    const t = await this.indexerProvider.getVtxos({
      scripts: [P.encode(this.offchainTapscript.pkScript)]
    }), { boardingTxs: n, commitmentsToIgnore: r } = await this.getBoardingTxs();
    return l1(t.vtxos, n, r);
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
        type: Tn.TxReceived,
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
    const t = await this.getBoardingAddress(), r = (await this.onchainProvider.getCoins(t)).map((i) => dl(this, i));
    return await this.walletRepository.saveUtxos(t, r), r;
  }
  async notifyIncomingFunds(t) {
    const n = await this.getAddress(), r = await this.getBoardingAddress();
    let i, s;
    if (this.onchainProvider && r) {
      const a = (c) => c.vout.findIndex((u) => u.scriptpubkey_address === r);
      i = await this.onchainProvider.watchAddresses([r], (c) => {
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
    if (this.indexerProvider && n) {
      const a = this.offchainTapscript, c = await this.indexerProvider.subscribeForScripts([
        P.encode(a.pkScript)
      ]), u = new AbortController(), l = this.indexerProvider.getSubscription(c, u.signal);
      s = async () => {
        u.abort(), await this.indexerProvider?.unsubscribeForScripts(c);
      }, (async () => {
        try {
          for await (const d of l)
            (d.newVtxos?.length > 0 || d.spentVtxos?.length > 0) && t({
              type: "vtxo",
              newVtxos: d.newVtxos.map((h) => ar(this, h)),
              spentVtxos: d.spentVtxos.map((h) => ar(this, h))
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
    const t = [P.encode(this.offchainTapscript.pkScript)];
    let { vtxos: n } = await this.indexerProvider.getVtxos({
      scripts: t
    });
    return n.filter((r) => r.virtualStatus.state !== "swept" && r.virtualStatus.state !== "settled" && r.arkTxId !== void 0).map((r) => r.arkTxId);
  }
}, Oa = class cm extends Vo {
  constructor(t, n, r, i, s, o, a, c, u, l, d, h, p, y, f, g) {
    super(t, n, i, o, a, c, u, p, y, f), this.networkName = r, this.arkProvider = s, this.serverUnrollScript = l, this.forfeitOutputScript = d, this.forfeitPubkey = h, this.identity = t, this.renewalConfig = {
      enabled: g?.enabled ?? !1,
      ...sS,
      ...g
    };
  }
  static async create(t) {
    const n = await t.identity.xOnlyPublicKey();
    if (!n)
      throw new Error("Invalid configured public key");
    const r = await Vo.setupWalletConfig(t, n);
    let i;
    try {
      const c = P.decode(r.info.checkpointTapscript);
      i = he.decode(c);
    } catch {
      throw new Error("Invalid checkpointTapscript from server");
    }
    const s = P.decode(r.info.forfeitPubkey).slice(1), o = Kr(r.network).decode(r.info.forfeitAddress), a = kt.encode(o);
    return new cm(t.identity, r.network, r.networkName, r.onchainProvider, r.arkProvider, r.indexerProvider, r.serverPubKey, r.offchainTapscript, r.boardingTapscript, i, a, s, r.dustAmount, r.walletRepository, r.contractRepository, t.renewalConfig);
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
    const t = m1(this.identity) ? await this.identity.toReadonly() : this.identity;
    return new Vo(t, this.network, this.onchainProvider, this.indexerProvider, this.arkServerPublicKey, this.offchainTapscript, this.boardingTapscript, this.dustAmount, this.walletRepository, this.contractRepository);
  }
  async sendBitcoin(t) {
    if (t.amount <= 0)
      throw new Error("Amount must be positive");
    if (!E1(t.address))
      throw new Error("Invalid Ark address " + t.address);
    const n = await this.getVirtualCoins({
      withRecoverable: !1
    });
    let r;
    if (t.selectedVtxos) {
      const y = t.selectedVtxos.map((g) => g.value).reduce((g, m) => g + m, 0);
      if (y < t.amount)
        throw new Error("Selected VTXOs do not cover specified amount");
      const f = y - t.amount;
      r = {
        inputs: t.selectedVtxos,
        changeAmount: BigInt(f)
      };
    } else
      r = x1(n, t.amount);
    const i = this.offchainTapscript.forfeit();
    if (!i)
      throw new Error("Selected leaf not found");
    const s = ms.decode(t.address), a = [
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
    const c = this.offchainTapscript.encode(), u = tS(r.inputs.map((y) => ({
      ...y,
      tapLeafScript: i,
      tapTree: c
    })), a, this.serverUnrollScript), l = await this.identity.sign(u.arkTx), { arkTxid: d, signedCheckpointTxs: h } = await this.arkProvider.submitTx(Vt.encode(l.toPSBT()), u.checkpoints.map((y) => Vt.encode(y.toPSBT()))), p = await Promise.all(h.map(async (y) => {
      const f = Pe.fromPSBT(Vt.decode(y)), g = await this.identity.sign(f);
      return Vt.encode(g.toPSBT());
    }));
    await this.arkProvider.finalizeTx(d, p);
    try {
      const y = [], f = /* @__PURE__ */ new Set();
      let g = Number.MAX_SAFE_INTEGER;
      for (const [v, O] of r.inputs.entries()) {
        const R = ar(this, O), j = h[v], b = Pe.fromPSBT(Vt.decode(j));
        if (y.push({
          ...R,
          virtualStatus: { ...R.virtualStatus, state: "spent" },
          spentBy: b.id,
          arkTxId: d,
          isSpent: !0
        }), R.virtualStatus.commitmentTxIds)
          for (const W of R.virtualStatus.commitmentTxIds)
            f.add(W);
        R.virtualStatus.batchExpiry && (g = Math.min(g, R.virtualStatus.batchExpiry));
      }
      const m = Date.now(), S = this.arkAddress.encode();
      if (r.changeAmount > 0n && g !== Number.MAX_SAFE_INTEGER) {
        const v = {
          txid: d,
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
            commitmentTxIds: Array.from(f),
            batchExpiry: g
          },
          status: {
            confirmed: !1
          }
        };
        await this.walletRepository.saveVtxos(S, [v]);
      }
      await this.walletRepository.saveVtxos(S, y), await this.walletRepository.saveTransactions(S, [
        {
          key: {
            boardingTxid: "",
            commitmentTxid: "",
            arkTxid: d
          },
          amount: t.amount,
          type: Tn.TxSent,
          settled: !1,
          createdAt: Date.now()
        }
      ]);
    } catch (y) {
      console.warn("error saving offchain tx to repository", y);
    } finally {
      return d;
    }
  }
  async settle(t, n) {
    if (t?.inputs) {
      for (const y of t.inputs)
        if (typeof y == "string")
          try {
            or.fromString(y);
          } catch {
            throw new Error(`Invalid arknote "${y}"`);
          }
    }
    if (!t) {
      const { fees: y } = await this.arkProvider.getInfo(), f = new c1(y.intentFee);
      let g = 0;
      const S = he.decode(P.decode(this.boardingTapscript.exitScript)).params.timelock, v = (await this.getBoardingUtxos()).filter((Y) => !rS(Y, S)), O = [];
      for (const Y of v) {
        const et = f.evalOnchainInput({
          amount: BigInt(Y.value)
        });
        et.value >= Y.value || (O.push(Y), g += Y.value - et.satoshis);
      }
      const R = await this.getVtxos({ withRecoverable: !0 }), j = [];
      for (const Y of R) {
        const et = f.evalOffchainInput({
          amount: BigInt(Y.value),
          type: Y.virtualStatus.state === "swept" ? "recoverable" : "vtxo",
          weight: 0,
          birth: Y.createdAt,
          expiry: Y.virtualStatus.batchExpiry ? new Date(Y.virtualStatus.batchExpiry * 1e3) : /* @__PURE__ */ new Date()
        });
        et.value >= Y.value || (j.push(Y), g += Y.value - et.satoshis);
      }
      const b = [...O, ...j];
      if (b.length === 0)
        throw new Error("No inputs found");
      const W = {
        address: await this.getAddress(),
        amount: BigInt(g)
      }, U = f.evalOffchainOutput({
        amount: W.amount,
        script: P.encode(ms.decode(W.address).pkScript)
      });
      if (W.amount -= BigInt(U.satoshis), W.amount <= this.dustAmount)
        throw new Error("Output amount is below dust limit");
      t = {
        inputs: b,
        outputs: [W]
      };
    }
    const r = [], i = [];
    let s = !1;
    for (const [y, f] of t.outputs.entries()) {
      let g;
      try {
        g = ms.decode(f.address).pkScript, s = !0;
      } catch {
        const m = Kr(this.network).decode(f.address);
        g = kt.encode(m), r.push(y);
      }
      i.push({
        amount: f.amount,
        script: g
      });
    }
    let o;
    const a = [];
    s && (o = this.identity.signerSession(), a.push(P.encode(await o.getPublicKey())));
    const [c, u] = await Promise.all([
      this.makeRegisterIntentSignature(t.inputs, i, r, a),
      this.makeDeleteIntentSignature(t.inputs)
    ]), l = await this.safeRegisterIntent(c), d = [
      ...a,
      ...t.inputs.map((y) => `${y.txid}:${y.vout}`)
    ], h = this.createBatchHandler(l, t.inputs, o), p = new AbortController();
    try {
      const y = this.arkProvider.getEventStream(p.signal, d);
      return await ll.join(y, h, {
        abortController: p,
        skipVtxoTreeSigning: !s,
        eventCallback: n ? (f) => Promise.resolve(n(f)) : void 0
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
    let a = Pe.fromPSBT(Vt.decode(t.commitmentTx)), c = !1, u = 0;
    const l = i?.leaves() || [];
    for (const d of n) {
      const h = o.find((v) => v.txid === d.txid && v.vout === d.vout);
      if (!h) {
        for (let v = 0; v < a.inputsLength; v++) {
          const O = a.getInput(v);
          if (!O.txid || O.index === void 0)
            throw new Error("The server returned incomplete data. No settlement input found in the PSBT");
          if (P.encode(O.txid) === d.txid && O.index === d.vout) {
            a.updateInput(v, {
              tapLeafScript: [d.forfeitTapLeafScript]
            }), a = await this.identity.sign(a, [
              v
            ]), c = !0;
            break;
          }
        }
        continue;
      }
      if (kf(h) || Dw(h, this.dustAmount))
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
      let S = jT([
        {
          txid: d.txid,
          index: d.vout,
          witnessUtxo: {
            amount: BigInt(h.value),
            script: fn.decode(d.tapTree).pkScript
          },
          sighashType: zr.DEFAULT,
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
      S = await this.identity.sign(S, [0]), s.push(Vt.encode(S.toPSBT()));
    }
    (s.length > 0 || c) && await this.arkProvider.submitSignedForfeitTxs(s, c ? Vt.encode(a.toPSBT()) : void 0);
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
        const o = new TextEncoder().encode(t), a = Ht(o), c = P.encode(a);
        let u = !0;
        for (const d of s.intentIdHashes)
          if (d === c) {
            if (!this.arkProvider)
              throw new Error("Ark provider not configured");
            await this.arkProvider.confirmRegistration(t), u = !1;
          }
        if (u)
          return { skip: u };
        const l = he.encode({
          timelock: {
            value: s.batchExpiry,
            type: s.batchExpiry >= 512n ? "seconds" : "blocks"
          },
          pubkeys: [this.forfeitPubkey]
        }).script;
        return i = ps(l), { skip: !1 };
      },
      onTreeSigningStarted: async (s, o) => {
        if (!r)
          return { skip: !0 };
        if (!i)
          throw new Error("Sweep tap tree root not set");
        const a = s.cosignersPublicKeys.map((y) => y.slice(2)), u = (await r.getPublicKey()).subarray(1);
        if (!a.includes(P.encode(u)))
          return { skip: !0 };
        const l = Pe.fromPSBT(Vt.decode(s.unsignedCommitmentTx));
        JT(o, l, i);
        const d = l.getOutput(0);
        if (!d?.amount)
          throw new Error("Shared output not found");
        await r.init(o, i, d.amount);
        const h = P.encode(await r.getPublicKey()), p = await r.getNonces();
        return await this.arkProvider.submitTreeNonces(s.id, h, p), { skip: !1 };
      },
      onTreeNonces: async (s) => {
        if (!r)
          return { fullySigned: !0 };
        const { hasAllNonces: o } = await r.aggregatedNonces(s.txid, s.nonces);
        if (!o)
          return { fullySigned: !1 };
        const a = await r.sign(), c = P.encode(await r.getPublicKey());
        return await this.arkProvider.submitTreeSignatures(s.id, c, a), { fullySigned: !0 };
      },
      onBatchFinalization: async (s, o, a) => {
        if (!this.forfeitOutputScript)
          throw new Error("Forfeit output script not set");
        a && QT(s.commitmentTx, a), await this.handleSettlementFinalizationEvent(s, n, this.forfeitOutputScript, a);
      }
    };
  }
  async safeRegisterIntent(t) {
    try {
      return await this.arkProvider.registerIntent(t);
    } catch (n) {
      if (n instanceof Vw && n.code === 0 && n.message.includes("duplicated input")) {
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
    }, a = sr.create(o, s, n), c = await this.identity.sign(a);
    return {
      proof: Vt.encode(c.toPSBT()),
      message: o
    };
  }
  async makeDeleteIntentSignature(t) {
    const n = this.prepareIntentProofInputs(t), r = {
      type: "delete",
      expire_at: 0
    }, i = sr.create(r, n, []), s = await this.identity.sign(i);
    return {
      proof: Vt.encode(s.toPSBT()),
      message: r
    };
  }
  async makeGetPendingTxIntentSignature(t) {
    const n = this.prepareIntentProofInputs(t), r = {
      type: "get-pending-tx",
      expire_at: 0
    }, i = sr.create(r, n, []), s = await this.identity.sign(i);
    return {
      proof: Vt.encode(s.toPSBT()),
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
      const s = [P.encode(this.offchainTapscript.pkScript)];
      let { vtxos: o } = await this.indexerProvider.getVtxos({
        scripts: s
      });
      if (o = o.filter((a) => a.virtualStatus.state !== "swept" && a.virtualStatus.state !== "settled"), o.length === 0)
        return { finalized: [], pending: [] };
      t = o.map((a) => ar(this, a));
    }
    const r = [], i = [];
    for (let s = 0; s < t.length; s += 20) {
      const o = t.slice(s, s + 20), a = await this.makeGetPendingTxIntentSignature(o), c = await this.arkProvider.getPendingTxs(a);
      for (const u of c) {
        i.push(u.arkTxid);
        try {
          const l = await Promise.all(u.signedCheckpointTxs.map(async (d) => {
            const h = Pe.fromPSBT(Vt.decode(d)), p = await this.identity.sign(h);
            return Vt.encode(p.toPSBT());
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
      const i = fn.decode(r.tapTree), s = b1(r.intentTapLeafScript), o = [Uw.encode(r.tapTree)];
      r.extraWitness && o.push(pT.encode(r.extraWitness)), n.push({
        txid: P.decode(r.txid),
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
Oa.MIN_FEE_RATE = 1;
function b1(e) {
  let t;
  try {
    const n = e[1], r = n.subarray(0, n.length - 1);
    try {
      const i = he.decode(r).params;
      t = sl.encode(i.timelock.type === "blocks" ? { blocks: Number(i.timelock.value) } : { seconds: Number(i.timelock.value) });
    } catch {
      const i = Ri.decode(r).params;
      t = Number(i.absoluteTimelock);
    }
  } catch {
  }
  return t;
}
function E1(e) {
  try {
    return ms.decode(e), !0;
  } catch {
    return !1;
  }
}
function x1(e, t) {
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
function Zh() {
  const e = crypto.getRandomValues(new Uint8Array(16));
  return P.encode(e);
}
var G;
(function(e) {
  e.walletInitialized = (w) => ({
    type: "WALLET_INITIALIZED",
    success: !0,
    id: w
  });
  function t(w, E) {
    return {
      type: "ERROR",
      success: !1,
      message: E,
      id: w
    };
  }
  e.error = t;
  function n(w, E) {
    return {
      type: "SETTLE_EVENT",
      success: !0,
      event: E,
      id: w
    };
  }
  e.settleEvent = n;
  function r(w, E) {
    return {
      type: "SETTLE_SUCCESS",
      success: !0,
      txid: E,
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
  function a(w, E) {
    return {
      type: "ADDRESS",
      success: !0,
      address: E,
      id: w
    };
  }
  e.address = a;
  function c(w, E) {
    return {
      type: "BOARDING_ADDRESS",
      success: !0,
      address: E,
      id: w
    };
  }
  e.boardingAddress = c;
  function u(w) {
    return w.type === "BALANCE" && w.success === !0;
  }
  e.isBalance = u;
  function l(w, E) {
    return {
      type: "BALANCE",
      success: !0,
      balance: E,
      id: w
    };
  }
  e.balance = l;
  function d(w) {
    return w.type === "VTXOS" && w.success === !0;
  }
  e.isVtxos = d;
  function h(w, E) {
    return {
      type: "VTXOS",
      success: !0,
      vtxos: E,
      id: w
    };
  }
  e.vtxos = h;
  function p(w) {
    return w.type === "VIRTUAL_COINS" && w.success === !0;
  }
  e.isVirtualCoins = p;
  function y(w, E) {
    return {
      type: "VIRTUAL_COINS",
      success: !0,
      virtualCoins: E,
      id: w
    };
  }
  e.virtualCoins = y;
  function f(w) {
    return w.type === "BOARDING_UTXOS" && w.success === !0;
  }
  e.isBoardingUtxos = f;
  function g(w, E) {
    return {
      type: "BOARDING_UTXOS",
      success: !0,
      boardingUtxos: E,
      id: w
    };
  }
  e.boardingUtxos = g;
  function m(w) {
    return w.type === "SEND_BITCOIN_SUCCESS" && w.success === !0;
  }
  e.isSendBitcoinSuccess = m;
  function S(w, E) {
    return {
      type: "SEND_BITCOIN_SUCCESS",
      success: !0,
      txid: E,
      id: w
    };
  }
  e.sendBitcoinSuccess = S;
  function v(w) {
    return w.type === "TRANSACTION_HISTORY" && w.success === !0;
  }
  e.isTransactionHistory = v;
  function O(w, E) {
    return {
      type: "TRANSACTION_HISTORY",
      success: !0,
      transactions: E,
      id: w
    };
  }
  e.transactionHistory = O;
  function R(w) {
    return w.type === "WALLET_STATUS" && w.success === !0;
  }
  e.isWalletStatus = R;
  function j(w, E, k) {
    return {
      type: "WALLET_STATUS",
      success: !0,
      status: {
        walletInitialized: E,
        xOnlyPublicKey: k
      },
      id: w
    };
  }
  e.walletStatus = j;
  function b(w) {
    return w.type === "CLEAR_RESPONSE";
  }
  e.isClearResponse = b;
  function W(w, E) {
    return {
      type: "CLEAR_RESPONSE",
      success: E,
      id: w
    };
  }
  e.clearResponse = W;
  function U(w) {
    return w.type === "WALLET_RELOADED";
  }
  e.isWalletReloaded = U;
  function Y(w, E) {
    return {
      type: "WALLET_RELOADED",
      success: E,
      id: w
    };
  }
  e.walletReloaded = Y;
  function et(w) {
    return w.type === "VTXO_UPDATE";
  }
  e.isVtxoUpdate = et;
  function L(w, E) {
    return {
      type: "VTXO_UPDATE",
      id: Zh(),
      // spontaneous update, not tied to a request
      success: !0,
      spentVtxos: E,
      newVtxos: w
    };
  }
  e.vtxoUpdate = L;
  function T(w) {
    return w.type === "UTXO_UPDATE";
  }
  e.isUtxoUpdate = T;
  function x(w) {
    return {
      type: "UTXO_UPDATE",
      id: Zh(),
      // spontaneous update, not tied to a request
      success: !0,
      coins: w
    };
  }
  e.utxoUpdate = x;
})(G || (G = {}));
let We = class jt {
  constructor(t, n, r, i, s, o) {
    this.hasWitness = t, this.inputCount = n, this.outputCount = r, this.inputSize = i, this.inputWitnessSize = s, this.outputSize = o;
  }
  static create() {
    return new jt(!1, 0, 0, 0, 0, 0);
  }
  addP2AInput() {
    return this.inputCount++, this.inputSize += jt.INPUT_SIZE, this;
  }
  addKeySpendInput(t = !0) {
    return this.inputCount++, this.inputWitnessSize += 65 + (t ? 0 : 1), this.inputSize += jt.INPUT_SIZE, this.hasWitness = !0, this;
  }
  addP2PKHInput() {
    return this.inputCount++, this.inputWitnessSize++, this.inputSize += jt.INPUT_SIZE + jt.P2PKH_SCRIPT_SIG_SIZE, this;
  }
  addTapscriptInput(t, n, r) {
    const i = 1 + jt.BASE_CONTROL_BLOCK_SIZE + 1 + n + 1 + r;
    return this.inputCount++, this.inputWitnessSize += t + i, this.inputSize += jt.INPUT_SIZE, this.hasWitness = !0, this.inputCount++, this;
  }
  addP2WKHOutput() {
    return this.outputCount++, this.outputSize += jt.OUTPUT_SIZE + jt.P2WKH_OUTPUT_SIZE, this;
  }
  addP2TROutput() {
    return this.outputCount++, this.outputSize += jt.OUTPUT_SIZE + jt.P2TR_OUTPUT_SIZE, this;
  }
  vsize() {
    const t = (o) => o < 253 ? 1 : o < 65535 ? 3 : o < 4294967295 ? 5 : 9, n = t(this.inputCount), r = t(this.outputCount);
    let s = (jt.BASE_TX_SIZE + n + this.inputSize + r + this.outputSize) * jt.WITNESS_SCALE_FACTOR;
    return this.hasWitness && (s += jt.WITNESS_HEADER_SIZE + this.inputWitnessSize), T1(s);
  }
};
We.P2PKH_SCRIPT_SIG_SIZE = 108;
We.INPUT_SIZE = 41;
We.BASE_CONTROL_BLOCK_SIZE = 33;
We.OUTPUT_SIZE = 9;
We.P2WKH_OUTPUT_SIZE = 22;
We.BASE_TX_SIZE = 10;
We.WITNESS_HEADER_SIZE = 2;
We.WITNESS_SCALE_FACTOR = 4;
We.P2TR_OUTPUT_SIZE = 34;
const T1 = (e) => {
  const t = BigInt(Math.ceil(e / We.WITNESS_SCALE_FACTOR));
  return {
    value: t,
    fee: (n) => n * t
  };
};
var Kt;
(function(e) {
  function t(f) {
    return typeof f == "object" && f !== null && "type" in f;
  }
  e.isBase = t;
  function n(f) {
    return f.type === "INIT_WALLET" && "arkServerUrl" in f && typeof f.arkServerUrl == "string" && ("arkServerPublicKey" in f ? f.arkServerPublicKey === void 0 || typeof f.arkServerPublicKey == "string" : !0);
  }
  e.isInitWallet = n;
  function r(f) {
    return f.type === "SETTLE";
  }
  e.isSettle = r;
  function i(f) {
    return f.type === "GET_ADDRESS";
  }
  e.isGetAddress = i;
  function s(f) {
    return f.type === "GET_BOARDING_ADDRESS";
  }
  e.isGetBoardingAddress = s;
  function o(f) {
    return f.type === "GET_BALANCE";
  }
  e.isGetBalance = o;
  function a(f) {
    return f.type === "GET_VTXOS";
  }
  e.isGetVtxos = a;
  function c(f) {
    return f.type === "GET_VIRTUAL_COINS";
  }
  e.isGetVirtualCoins = c;
  function u(f) {
    return f.type === "GET_BOARDING_UTXOS";
  }
  e.isGetBoardingUtxos = u;
  function l(f) {
    return f.type === "SEND_BITCOIN" && "params" in f && f.params !== null && typeof f.params == "object" && "address" in f.params && typeof f.params.address == "string" && "amount" in f.params && typeof f.params.amount == "number";
  }
  e.isSendBitcoin = l;
  function d(f) {
    return f.type === "GET_TRANSACTION_HISTORY";
  }
  e.isGetTransactionHistory = d;
  function h(f) {
    return f.type === "GET_STATUS";
  }
  e.isGetStatus = h;
  function p(f) {
    return f.type === "CLEAR";
  }
  e.isClear = p;
  function y(f) {
    return f.type === "RELOAD_WALLET";
  }
  e.isReloadWallet = y;
})(Kt || (Kt = {}));
class um {
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
}
class S1 extends um {
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
class v1 {
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
    return (await this.walletRepository.getVtxos(t)).filter(er);
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
      spendable: n.filter(er),
      spent: n.filter((r) => !er(r))
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
    this.incomingFundsSubscription && this.incomingFundsSubscription(), this.handler = void 0, this.arkProvider = void 0, this.indexerProvider = void 0;
  }
  async reload() {
    await this.onWalletInitialized();
  }
  async onWalletInitialized() {
    if (!this.handler || !this.arkProvider || !this.indexerProvider || !this.handler.offchainTapscript || !this.handler.boardingTapscript)
      return;
    const t = P.encode(this.handler.offchainTapscript.pkScript), r = (await this.indexerProvider.getVtxos({
      scripts: [t]
    })).vtxos.map((c) => ar(this.handler, c));
    try {
      const { pending: c, finalized: u } = await this.handler.handleReload(r);
      console.info(`Recovered ${u.length}/${c.length} pending transactions: ${u.join(", ")}`);
    } catch (c) {
      console.error("Error recovering pending transactions:", c);
    }
    const i = await this.handler.getAddress();
    await this.walletRepository.saveVtxos(i, r);
    const s = await this.handler.getBoardingAddress(), o = await this.handler.onchainProvider.getCoins(s);
    await this.walletRepository.saveUtxos(s, o.map((c) => dl(this.handler, c)));
    const a = await this.handler.getTransactionHistory();
    a && await this.walletRepository.saveTransactions(i, a), this.incomingFundsSubscription && this.incomingFundsSubscription(), this.incomingFundsSubscription = await this.handler.notifyIncomingFunds(async (c) => {
      if (c.type === "vtxo") {
        const u = c.newVtxos.length > 0 ? c.newVtxos.map((d) => ar(this.handler, d)) : [], l = c.spentVtxos.length > 0 ? c.spentVtxos.map((d) => ar(this.handler, d)) : [];
        if ([...u, ...l].length === 0)
          return;
        await this.walletRepository.saveVtxos(i, [
          ...u,
          ...l
        ]), await this.sendMessageToAllClients(G.vtxoUpdate(u, l));
      }
      if (c.type === "utxo") {
        const u = c.coins.map((d) => dl(this.handler, d)), l = await this.handler?.getBoardingAddress();
        await this.walletRepository.clearUtxos(l), await this.walletRepository.saveUtxos(l, u), await this.sendMessageToAllClients(G.utxoUpdate(u));
      }
    });
  }
  async handleClear(t) {
    await this.clear(), Kt.isBase(t.data) && t.source?.postMessage(G.clearResponse(t.data.id, !0));
  }
  async handleInitWallet(t) {
    if (!Kt.isInitWallet(t.data)) {
      console.error("Invalid INIT_WALLET message format", t.data), t.source?.postMessage(G.error(t.data.id, "Invalid INIT_WALLET message format"));
      return;
    }
    const n = t.data, { arkServerPublicKey: r, arkServerUrl: i } = n;
    this.arkProvider = new Mw(i), this.indexerProvider = new jw(i);
    try {
      if ("privateKey" in n.key && typeof n.key.privateKey == "string") {
        const { key: { privateKey: s } } = n, o = ws.fromHex(s), a = await Oa.create({
          identity: o,
          arkServerUrl: i,
          arkServerPublicKey: r,
          storage: {
            walletRepository: this.walletRepository,
            contractRepository: this.contractRepository
          }
        });
        this.handler = new S1(a);
      } else if ("publicKey" in n.key && typeof n.key.publicKey == "string") {
        const { key: { publicKey: s } } = n, o = yc.fromPublicKey(P.decode(s)), a = await Vo.create({
          identity: o,
          arkServerUrl: i,
          arkServerPublicKey: r,
          storage: {
            walletRepository: this.walletRepository,
            contractRepository: this.contractRepository
          }
        });
        this.handler = new um(a);
      } else {
        const s = "Missing privateKey or publicKey in key object";
        t.source?.postMessage(G.error(n.id, s)), console.error(s);
        return;
      }
    } catch (s) {
      console.error("Error initializing wallet:", s);
      const o = s instanceof Error ? s.message : "Unknown error occurred";
      t.source?.postMessage(G.error(n.id, o));
      return;
    }
    t.source?.postMessage(G.walletInitialized(n.id)), await this.onWalletInitialized();
  }
  async handleSettle(t) {
    const n = t.data;
    if (!Kt.isSettle(n)) {
      console.error("Invalid SETTLE message format", n), t.source?.postMessage(G.error(n.id, "Invalid SETTLE message format"));
      return;
    }
    try {
      if (!this.handler) {
        console.error("Wallet not initialized"), t.source?.postMessage(G.error(n.id, "Wallet not initialized"));
        return;
      }
      const r = await this.handler.handleSettle(n.params, (i) => {
        t.source?.postMessage(G.settleEvent(n.id, i));
      });
      r ? t.source?.postMessage(G.settleSuccess(n.id, r)) : t.source?.postMessage(G.error(n.id, "Operation not supported in readonly mode"));
    } catch (r) {
      console.error("Error settling:", r);
      const i = r instanceof Error ? r.message : "Unknown error occurred";
      t.source?.postMessage(G.error(n.id, i));
    }
  }
  async handleSendBitcoin(t) {
    const n = t.data;
    if (!Kt.isSendBitcoin(n)) {
      console.error("Invalid SEND_BITCOIN message format", n), t.source?.postMessage(G.error(n.id, "Invalid SEND_BITCOIN message format"));
      return;
    }
    if (!this.handler) {
      console.error("Wallet not initialized"), t.source?.postMessage(G.error(n.id, "Wallet not initialized"));
      return;
    }
    try {
      const r = await this.handler.handleSendBitcoin(n.params);
      r ? t.source?.postMessage(G.sendBitcoinSuccess(n.id, r)) : t.source?.postMessage(G.error(n.id, "Operation not supported in readonly mode"));
    } catch (r) {
      console.error("Error sending bitcoin:", r);
      const i = r instanceof Error ? r.message : "Unknown error occurred";
      t.source?.postMessage(G.error(n.id, i));
    }
  }
  async handleGetAddress(t) {
    const n = t.data;
    if (!Kt.isGetAddress(n)) {
      console.error("Invalid GET_ADDRESS message format", n), t.source?.postMessage(G.error(n.id, "Invalid GET_ADDRESS message format"));
      return;
    }
    if (!this.handler) {
      console.error("Wallet not initialized"), t.source?.postMessage(G.error(n.id, "Wallet not initialized"));
      return;
    }
    try {
      const r = await this.handler.getAddress();
      t.source?.postMessage(G.address(n.id, r));
    } catch (r) {
      console.error("Error getting address:", r);
      const i = r instanceof Error ? r.message : "Unknown error occurred";
      t.source?.postMessage(G.error(n.id, i));
    }
  }
  async handleGetBoardingAddress(t) {
    const n = t.data;
    if (!Kt.isGetBoardingAddress(n)) {
      console.error("Invalid GET_BOARDING_ADDRESS message format", n), t.source?.postMessage(G.error(n.id, "Invalid GET_BOARDING_ADDRESS message format"));
      return;
    }
    if (!this.handler) {
      console.error("Wallet not initialized"), t.source?.postMessage(G.error(n.id, "Wallet not initialized"));
      return;
    }
    try {
      const r = await this.handler.getBoardingAddress();
      t.source?.postMessage(G.boardingAddress(n.id, r));
    } catch (r) {
      console.error("Error getting boarding address:", r);
      const i = r instanceof Error ? r.message : "Unknown error occurred";
      t.source?.postMessage(G.error(n.id, i));
    }
  }
  async handleGetBalance(t) {
    const n = t.data;
    if (!Kt.isGetBalance(n)) {
      console.error("Invalid GET_BALANCE message format", n), t.source?.postMessage(G.error(n.id, "Invalid GET_BALANCE message format"));
      return;
    }
    if (!this.handler) {
      console.error("Wallet not initialized"), t.source?.postMessage(G.error(n.id, "Wallet not initialized"));
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
        er(p) && (l += p.value);
      const d = o + a, h = c + u + l;
      t.source?.postMessage(G.balance(n.id, {
        boarding: {
          confirmed: o,
          unconfirmed: a,
          total: d
        },
        settled: c,
        preconfirmed: u,
        available: c + u,
        recoverable: l,
        total: d + h
      }));
    } catch (r) {
      console.error("Error getting balance:", r);
      const i = r instanceof Error ? r.message : "Unknown error occurred";
      t.source?.postMessage(G.error(n.id, i));
    }
  }
  async handleGetVtxos(t) {
    const n = t.data;
    if (!Kt.isGetVtxos(n)) {
      console.error("Invalid GET_VTXOS message format", n), t.source?.postMessage(G.error(n.id, "Invalid GET_VTXOS message format"));
      return;
    }
    if (!this.handler) {
      console.error("Wallet not initialized"), t.source?.postMessage(G.error(n.id, "Wallet not initialized"));
      return;
    }
    try {
      const r = await this.getSpendableVtxos(), i = this.handler.dustAmount, o = n.filter?.withRecoverable ?? !1 ? r : r.filter((a) => !(i != null && Dw(a, i) || kf(a) || _w(a)));
      t.source?.postMessage(G.vtxos(n.id, o));
    } catch (r) {
      console.error("Error getting vtxos:", r);
      const i = r instanceof Error ? r.message : "Unknown error occurred";
      t.source?.postMessage(G.error(n.id, i));
    }
  }
  async handleGetBoardingUtxos(t) {
    const n = t.data;
    if (!Kt.isGetBoardingUtxos(n)) {
      console.error("Invalid GET_BOARDING_UTXOS message format", n), t.source?.postMessage(G.error(n.id, "Invalid GET_BOARDING_UTXOS message format"));
      return;
    }
    if (!this.handler) {
      console.error("Wallet not initialized"), t.source?.postMessage(G.error(n.id, "Wallet not initialized"));
      return;
    }
    try {
      const r = await this.getAllBoardingUtxos();
      t.source?.postMessage(G.boardingUtxos(n.id, r));
    } catch (r) {
      console.error("Error getting boarding utxos:", r);
      const i = r instanceof Error ? r.message : "Unknown error occurred";
      t.source?.postMessage(G.error(n.id, i));
    }
  }
  async handleGetTransactionHistory(t) {
    const n = t.data;
    if (!Kt.isGetTransactionHistory(n)) {
      console.error("Invalid GET_TRANSACTION_HISTORY message format", n), t.source?.postMessage(G.error(n.id, "Invalid GET_TRANSACTION_HISTORY message format"));
      return;
    }
    if (!this.handler) {
      console.error("Wallet not initialized"), t.source?.postMessage(G.error(n.id, "Wallet not initialized"));
      return;
    }
    try {
      const r = await this.handler.getTransactionHistory();
      t.source?.postMessage(G.transactionHistory(n.id, r));
    } catch (r) {
      console.error("Error getting transaction history:", r);
      const i = r instanceof Error ? r.message : "Unknown error occurred";
      t.source?.postMessage(G.error(n.id, i));
    }
  }
  async handleGetStatus(t) {
    const n = t.data;
    if (!Kt.isGetStatus(n)) {
      console.error("Invalid GET_STATUS message format", n), t.source?.postMessage(G.error(n.id, "Invalid GET_STATUS message format"));
      return;
    }
    const r = this.handler ? await this.handler.identity.xOnlyPublicKey() : void 0;
    t.source?.postMessage(G.walletStatus(n.id, this.handler !== void 0, r));
  }
  async handleMessage(t) {
    this.messageCallback(t);
    const n = t.data;
    if (!Kt.isBase(n)) {
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
        t.source?.postMessage(G.error(n.id, "Unknown message type"));
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
    if (!Kt.isReloadWallet(n)) {
      console.error("Invalid RELOAD_WALLET message format", n), t.source?.postMessage(G.error(n.id, "Invalid RELOAD_WALLET message format"));
      return;
    }
    if (!this.handler) {
      console.error("Wallet not initialized"), t.source?.postMessage(G.walletReloaded(n.id, !1));
      return;
    }
    try {
      await this.onWalletInitialized(), t.source?.postMessage(G.walletReloaded(n.id, !0));
    } catch (r) {
      console.error("Error reloading wallet:", r), t.source?.postMessage(G.walletReloaded(n.id, !1));
    }
  }
}
var Xh;
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
        if (!(l.type === gi.COMMITMENT || l.type === gi.UNSPECIFIED))
          try {
            if (!(await this.explorer.getTxStatus(l.txid)).confirmed)
              return {
                type: t.WAIT,
                txid: l.txid,
                do: A1(this.explorer, l.txid)
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
      const c = pr.fromPSBT(Vt.decode(a.txs[0]));
      if (s.type === gi.TREE) {
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
        do: k1(this.bumper, this.explorer, c)
      };
    }
    /**
     * Iterate over the steps to be executed and execute them
     * @returns An async iterator over the executed steps
     */
    async *[Symbol.asyncIterator]() {
      let s;
      do {
        s !== void 0 && await $1(1e3);
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
    const d = We.create();
    for (const g of c) {
      if (!g.isUnrolled)
        throw new Error(`Vtxo ${g.txid}:${g.vout} is not fully unrolled, use unroll first`);
      const m = await i.onchainProvider.getTxStatus(g.txid);
      if (!m.confirmed)
        throw new Error(`tx ${g.txid} is not confirmed`);
      const S = I1({ height: m.blockHeight, time: m.blockTime }, a, g);
      if (!S)
        throw new Error(`no available exit path found for vtxo ${g.txid}:${g.vout}`);
      const v = fn.decode(g.tapTree).findLeaf(P.encode(S.script));
      if (!v)
        throw new Error(`spending leaf not found for vtxo ${g.txid}:${g.vout}`);
      l += BigInt(g.value), u.push({
        txid: g.txid,
        index: g.vout,
        tapLeafScript: [v],
        sequence: 4294967294,
        witnessUtxo: {
          amount: BigInt(g.value),
          script: fn.decode(g.tapTree).pkScript
        },
        sighashType: zr.DEFAULT
      }), d.addTapscriptInput(64, v[1].length, nn.encode(v[0]).length);
    }
    const h = new pr({ version: 2 });
    for (const g of u)
      h.addInput(g);
    d.addP2TROutput();
    let p = await i.onchainProvider.getFeeRate();
    (!p || p < Oa.MIN_FEE_RATE) && (p = Oa.MIN_FEE_RATE);
    const y = d.vsize().fee(BigInt(p));
    if (y > l)
      throw new Error("fee amount is greater than the total amount");
    h.addOutputAddress(o, l - y);
    const f = await i.identity.sign(h);
    return f.finalize(), await i.onchainProvider.broadcastTransaction(f.hex), f.id;
  }
  e.completeUnroll = r;
})(Xh || (Xh = {}));
function $1(e) {
  return new Promise((t) => setTimeout(t, e));
}
function k1(e, t, n) {
  return async () => {
    const [r, i] = await e.bumpP2A(n);
    await t.broadcastTransaction(r, i);
  };
}
function A1(e, t) {
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
function I1(e, t, n) {
  const r = fn.decode(n.tapTree).exitPaths();
  for (const i of r)
    if (i.params.timelock.type === "blocks") {
      if (t.height >= e.height + Number(i.params.timelock.value))
        return i;
    } else if (t.time >= e.time + Number(i.params.timelock.value))
      return i;
}
/*! noble-hashes - MIT License (c) 2022 Paul Miller (paulmillr.com) */
function Nf(e) {
  return e instanceof Uint8Array || ArrayBuffer.isView(e) && e.constructor.name === "Uint8Array";
}
function Yr(e, t = "") {
  if (!Number.isSafeInteger(e) || e < 0) {
    const n = t && `"${t}" `;
    throw new Error(`${n}expected integer >0, got ${e}`);
  }
}
function at(e, t, n = "") {
  const r = Nf(e), i = e?.length, s = t !== void 0;
  if (!r || s && i !== t) {
    const o = n && `"${n}" `, a = s ? ` of length ${t}` : "", c = r ? `length=${i}` : `type=${typeof e}`;
    throw new Error(o + "expected Uint8Array" + a + ", got " + c);
  }
  return e;
}
function lm(e) {
  if (typeof e != "function" || typeof e.create != "function")
    throw new Error("Hash must wrapped by utils.createHasher");
  Yr(e.outputLen), Yr(e.blockLen);
}
function Ba(e, t = !0) {
  if (e.destroyed)
    throw new Error("Hash instance has been destroyed");
  if (t && e.finished)
    throw new Error("Hash#digest() has already been called");
}
function O1(e, t) {
  at(e, void 0, "digestInto() output");
  const n = t.outputLen;
  if (e.length < n)
    throw new Error('"digestInto() output" expected to be of length >=' + n);
}
function Ci(...e) {
  for (let t = 0; t < e.length; t++)
    e[t].fill(0);
}
function lu(e) {
  return new DataView(e.buffer, e.byteOffset, e.byteLength);
}
function Ze(e, t) {
  return e << 32 - t | e >>> t;
}
function wo(e, t) {
  return e << t | e >>> 32 - t >>> 0;
}
const fm = /* @ts-ignore */ typeof Uint8Array.from([]).toHex == "function" && typeof Uint8Array.fromHex == "function", B1 = /* @__PURE__ */ Array.from({ length: 256 }, (e, t) => t.toString(16).padStart(2, "0"));
function xc(e) {
  if (at(e), fm)
    return e.toHex();
  let t = "";
  for (let n = 0; n < e.length; n++)
    t += B1[e[n]];
  return t;
}
const mn = { _0: 48, _9: 57, A: 65, F: 70, a: 97, f: 102 };
function Qh(e) {
  if (e >= mn._0 && e <= mn._9)
    return e - mn._0;
  if (e >= mn.A && e <= mn.F)
    return e - (mn.A - 10);
  if (e >= mn.a && e <= mn.f)
    return e - (mn.a - 10);
}
function Na(e) {
  if (typeof e != "string")
    throw new Error("hex string expected, got " + typeof e);
  if (fm)
    return Uint8Array.fromHex(e);
  const t = e.length, n = t / 2;
  if (t % 2)
    throw new Error("hex string expected, got unpadded hex of length " + t);
  const r = new Uint8Array(n);
  for (let i = 0, s = 0; i < n; i++, s += 2) {
    const o = Qh(e.charCodeAt(s)), a = Qh(e.charCodeAt(s + 1));
    if (o === void 0 || a === void 0) {
      const c = e[s] + e[s + 1];
      throw new Error('hex string expected, got non-hex character "' + c + '" at index ' + s);
    }
    r[i] = o * 16 + a;
  }
  return r;
}
function sn(...e) {
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
function dm(e, t = {}) {
  const n = (i, s) => e(s).update(i).digest(), r = e(void 0);
  return n.outputLen = r.outputLen, n.blockLen = r.blockLen, n.create = (i) => e(i), Object.assign(n, t), Object.freeze(n);
}
function Tc(e = 32) {
  const t = typeof globalThis == "object" ? globalThis.crypto : null;
  if (typeof t?.getRandomValues != "function")
    throw new Error("crypto.getRandomValues must be defined");
  return t.getRandomValues(new Uint8Array(e));
}
const N1 = (e) => ({
  oid: Uint8Array.from([6, 9, 96, 134, 72, 1, 101, 3, 4, 2, e])
});
function R1(e, t, n) {
  return e & t ^ ~e & n;
}
function U1(e, t, n) {
  return e & t ^ e & n ^ t & n;
}
class hm {
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
    this.blockLen = t, this.outputLen = n, this.padOffset = r, this.isLE = i, this.buffer = new Uint8Array(t), this.view = lu(this.buffer);
  }
  update(t) {
    Ba(this), at(t);
    const { view: n, buffer: r, blockLen: i } = this, s = t.length;
    for (let o = 0; o < s; ) {
      const a = Math.min(i - this.pos, s - o);
      if (a === i) {
        const c = lu(t);
        for (; i <= s - o; o += i)
          this.process(c, o);
        continue;
      }
      r.set(t.subarray(o, o + a), this.pos), this.pos += a, o += a, this.pos === i && (this.process(n, 0), this.pos = 0);
    }
    return this.length += t.length, this.roundClean(), this;
  }
  digestInto(t) {
    Ba(this), O1(t, this), this.finished = !0;
    const { buffer: n, view: r, blockLen: i, isLE: s } = this;
    let { pos: o } = this;
    n[o++] = 128, Ci(this.buffer.subarray(o)), this.padOffset > i - o && (this.process(r, 0), o = 0);
    for (let d = o; d < i; d++)
      n[d] = 0;
    r.setBigUint64(i - 8, BigInt(this.length * 8), s), this.process(r, 0);
    const a = lu(t), c = this.outputLen;
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
const Mn = /* @__PURE__ */ Uint32Array.from([
  1779033703,
  3144134277,
  1013904242,
  2773480762,
  1359893119,
  2600822924,
  528734635,
  1541459225
]), P1 = /* @__PURE__ */ Uint32Array.from([
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
]), Hn = /* @__PURE__ */ new Uint32Array(64);
class C1 extends hm {
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
      Hn[d] = t.getUint32(n, !1);
    for (let d = 16; d < 64; d++) {
      const h = Hn[d - 15], p = Hn[d - 2], y = Ze(h, 7) ^ Ze(h, 18) ^ h >>> 3, f = Ze(p, 17) ^ Ze(p, 19) ^ p >>> 10;
      Hn[d] = f + Hn[d - 7] + y + Hn[d - 16] | 0;
    }
    let { A: r, B: i, C: s, D: o, E: a, F: c, G: u, H: l } = this;
    for (let d = 0; d < 64; d++) {
      const h = Ze(a, 6) ^ Ze(a, 11) ^ Ze(a, 25), p = l + h + R1(a, c, u) + P1[d] + Hn[d] | 0, f = (Ze(r, 2) ^ Ze(r, 13) ^ Ze(r, 22)) + U1(r, i, s) | 0;
      l = u, u = c, c = a, a = o + p | 0, o = s, s = i, i = r, r = p + f | 0;
    }
    r = r + this.A | 0, i = i + this.B | 0, s = s + this.C | 0, o = o + this.D | 0, a = a + this.E | 0, c = c + this.F | 0, u = u + this.G | 0, l = l + this.H | 0, this.set(r, i, s, o, a, c, u, l);
  }
  roundClean() {
    Ci(Hn);
  }
  destroy() {
    this.set(0, 0, 0, 0, 0, 0, 0, 0), Ci(this.buffer);
  }
}
class L1 extends C1 {
  // We cannot use array here since array allows indexing by variable
  // which means optimizer/compiler cannot use registers.
  A = Mn[0] | 0;
  B = Mn[1] | 0;
  C = Mn[2] | 0;
  D = Mn[3] | 0;
  E = Mn[4] | 0;
  F = Mn[5] | 0;
  G = Mn[6] | 0;
  H = Mn[7] | 0;
  constructor() {
    super(32);
  }
}
const Ft = /* @__PURE__ */ dm(
  () => new L1(),
  /* @__PURE__ */ N1(1)
);
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const Rf = /* @__PURE__ */ BigInt(0), wl = /* @__PURE__ */ BigInt(1);
function Ra(e, t = "") {
  if (typeof e != "boolean") {
    const n = t && `"${t}" `;
    throw new Error(n + "expected boolean, got type=" + typeof e);
  }
  return e;
}
function pm(e) {
  if (typeof e == "bigint") {
    if (!Mo(e))
      throw new Error("positive bigint expected, got " + e);
  } else
    Yr(e);
  return e;
}
function mo(e) {
  const t = pm(e).toString(16);
  return t.length & 1 ? "0" + t : t;
}
function gm(e) {
  if (typeof e != "string")
    throw new Error("hex string expected, got " + typeof e);
  return e === "" ? Rf : BigInt("0x" + e);
}
function Rn(e) {
  return gm(xc(e));
}
function ym(e) {
  return gm(xc(_1(at(e)).reverse()));
}
function Sc(e, t) {
  Yr(t), e = pm(e);
  const n = Na(e.toString(16).padStart(t * 2, "0"));
  if (n.length !== t)
    throw new Error("number too large");
  return n;
}
function wm(e, t) {
  return Sc(e, t).reverse();
}
function Uf(e, t) {
  if (e.length !== t.length)
    return !1;
  let n = 0;
  for (let r = 0; r < e.length; r++)
    n |= e[r] ^ t[r];
  return n === 0;
}
function _1(e) {
  return Uint8Array.from(e);
}
function D1(e) {
  return Uint8Array.from(e, (t, n) => {
    const r = t.charCodeAt(0);
    if (t.length !== 1 || r > 127)
      throw new Error(`string contains non-ASCII character "${e[n]}" with code ${r} at position ${n}`);
    return r;
  });
}
const Mo = (e) => typeof e == "bigint" && Rf <= e;
function V1(e, t, n) {
  return Mo(e) && Mo(t) && Mo(n) && t <= e && e < n;
}
function mm(e, t, n, r) {
  if (!V1(t, n, r))
    throw new Error("expected valid " + e + ": " + n + " <= n < " + r + ", got " + t);
}
function M1(e) {
  let t;
  for (t = 0; e > Rf; e >>= wl, t += 1)
    ;
  return t;
}
const Pf = (e) => (wl << BigInt(e)) - wl;
function H1(e, t, n) {
  if (Yr(e, "hashLen"), Yr(t, "qByteLen"), typeof n != "function")
    throw new Error("hmacFn must be a function");
  const r = (g) => new Uint8Array(g), i = Uint8Array.of(), s = Uint8Array.of(0), o = Uint8Array.of(1), a = 1e3;
  let c = r(e), u = r(e), l = 0;
  const d = () => {
    c.fill(1), u.fill(0), l = 0;
  }, h = (...g) => n(u, sn(c, ...g)), p = (g = i) => {
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
    return sn(...m);
  };
  return (g, m) => {
    d(), p(g);
    let S;
    for (; !(S = m(y())); )
      p();
    return d(), S;
  };
}
function Cf(e, t = {}, n = {}) {
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
function Jh(e) {
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
const Jt = /* @__PURE__ */ BigInt(0), qt = /* @__PURE__ */ BigInt(1), Vr = /* @__PURE__ */ BigInt(2), bm = /* @__PURE__ */ BigInt(3), Em = /* @__PURE__ */ BigInt(4), xm = /* @__PURE__ */ BigInt(5), F1 = /* @__PURE__ */ BigInt(7), Tm = /* @__PURE__ */ BigInt(8), j1 = /* @__PURE__ */ BigInt(9), Sm = /* @__PURE__ */ BigInt(16);
function Ne(e, t) {
  const n = e % t;
  return n >= Jt ? n : t + n;
}
function be(e, t, n) {
  let r = e;
  for (; t-- > Jt; )
    r *= r, r %= n;
  return r;
}
function tp(e, t) {
  if (e === Jt)
    throw new Error("invert: expected non-zero number");
  if (t <= Jt)
    throw new Error("invert: expected positive modulus, got " + t);
  let n = Ne(e, t), r = t, i = Jt, s = qt;
  for (; n !== Jt; ) {
    const a = r / n, c = r % n, u = i - s * a;
    r = n, n = c, i = s, s = u;
  }
  if (r !== qt)
    throw new Error("invert: does not exist");
  return Ne(i, t);
}
function Lf(e, t, n) {
  if (!e.eql(e.sqr(t), n))
    throw new Error("Cannot find square root");
}
function vm(e, t) {
  const n = (e.ORDER + qt) / Em, r = e.pow(t, n);
  return Lf(e, r, t), r;
}
function K1(e, t) {
  const n = (e.ORDER - xm) / Tm, r = e.mul(t, Vr), i = e.pow(r, n), s = e.mul(t, i), o = e.mul(e.mul(s, Vr), i), a = e.mul(s, e.sub(o, e.ONE));
  return Lf(e, a, t), a;
}
function z1(e) {
  const t = vc(e), n = $m(e), r = n(t, t.neg(t.ONE)), i = n(t, r), s = n(t, t.neg(r)), o = (e + F1) / Sm;
  return (a, c) => {
    let u = a.pow(c, o), l = a.mul(u, r);
    const d = a.mul(u, i), h = a.mul(u, s), p = a.eql(a.sqr(l), c), y = a.eql(a.sqr(d), c);
    u = a.cmov(u, l, p), l = a.cmov(h, d, y);
    const f = a.eql(a.sqr(l), c), g = a.cmov(u, l, f);
    return Lf(a, g, c), g;
  };
}
function $m(e) {
  if (e < bm)
    throw new Error("sqrt is not defined for small field");
  let t = e - qt, n = 0;
  for (; t % Vr === Jt; )
    t /= Vr, n++;
  let r = Vr;
  const i = vc(e);
  for (; ep(i, r) === 1; )
    if (r++ > 1e3)
      throw new Error("Cannot find square root: probably non-prime P");
  if (n === 1)
    return vm;
  let s = i.pow(r, t);
  const o = (t + qt) / Vr;
  return function(c, u) {
    if (c.is0(u))
      return u;
    if (ep(c, u) !== 1)
      throw new Error("Cannot find square root");
    let l = n, d = c.mul(c.ONE, s), h = c.pow(u, t), p = c.pow(u, o);
    for (; !c.eql(h, c.ONE); ) {
      if (c.is0(h))
        return c.ZERO;
      let y = 1, f = c.sqr(h);
      for (; !c.eql(f, c.ONE); )
        if (y++, f = c.sqr(f), y === l)
          throw new Error("Cannot find square root");
      const g = qt << BigInt(l - y - 1), m = c.pow(d, g);
      l = y, d = c.sqr(m), h = c.mul(h, d), p = c.mul(p, m);
    }
    return p;
  };
}
function W1(e) {
  return e % Em === bm ? vm : e % Tm === xm ? K1 : e % Sm === j1 ? z1(e) : $m(e);
}
const q1 = [
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
function G1(e) {
  const t = {
    ORDER: "bigint",
    BYTES: "number",
    BITS: "number"
  }, n = q1.reduce((r, i) => (r[i] = "function", r), t);
  return Cf(e, n), e;
}
function Y1(e, t, n) {
  if (n < Jt)
    throw new Error("invalid exponent, negatives unsupported");
  if (n === Jt)
    return e.ONE;
  if (n === qt)
    return t;
  let r = e.ONE, i = t;
  for (; n > Jt; )
    n & qt && (r = e.mul(r, i)), i = e.sqr(i), n >>= qt;
  return r;
}
function km(e, t, n = !1) {
  const r = new Array(t.length).fill(n ? e.ZERO : void 0), i = t.reduce((o, a, c) => e.is0(a) ? o : (r[c] = o, e.mul(o, a)), e.ONE), s = e.inv(i);
  return t.reduceRight((o, a, c) => e.is0(a) ? o : (r[c] = e.mul(o, r[c]), e.mul(o, a)), s), r;
}
function ep(e, t) {
  const n = (e.ORDER - qt) / Vr, r = e.pow(t, n), i = e.eql(r, e.ONE), s = e.eql(r, e.ZERO), o = e.eql(r, e.neg(e.ONE));
  if (!i && !s && !o)
    throw new Error("invalid Legendre symbol result");
  return i ? 1 : s ? 0 : -1;
}
function Z1(e, t) {
  t !== void 0 && Yr(t);
  const n = t !== void 0 ? t : e.toString(2).length, r = Math.ceil(n / 8);
  return { nBitLength: n, nByteLength: r };
}
class X1 {
  ORDER;
  BITS;
  BYTES;
  isLE;
  ZERO = Jt;
  ONE = qt;
  _lengths;
  _sqrt;
  // cached sqrt
  _mod;
  constructor(t, n = {}) {
    if (t <= Jt)
      throw new Error("invalid field: expected ORDER > 0, got " + t);
    let r;
    this.isLE = !1, n != null && typeof n == "object" && (typeof n.BITS == "number" && (r = n.BITS), typeof n.sqrt == "function" && (this.sqrt = n.sqrt), typeof n.isLE == "boolean" && (this.isLE = n.isLE), n.allowedLengths && (this._lengths = n.allowedLengths?.slice()), typeof n.modFromBytes == "boolean" && (this._mod = n.modFromBytes));
    const { nBitLength: i, nByteLength: s } = Z1(t, r);
    if (s > 2048)
      throw new Error("invalid field: expected ORDER of <= 2048 bytes");
    this.ORDER = t, this.BITS = i, this.BYTES = s, this._sqrt = void 0, Object.preventExtensions(this);
  }
  create(t) {
    return Ne(t, this.ORDER);
  }
  isValid(t) {
    if (typeof t != "bigint")
      throw new Error("invalid field element: expected bigint, got " + typeof t);
    return Jt <= t && t < this.ORDER;
  }
  is0(t) {
    return t === Jt;
  }
  // is valid and invertible
  isValidNot0(t) {
    return !this.is0(t) && this.isValid(t);
  }
  isOdd(t) {
    return (t & qt) === qt;
  }
  neg(t) {
    return Ne(-t, this.ORDER);
  }
  eql(t, n) {
    return t === n;
  }
  sqr(t) {
    return Ne(t * t, this.ORDER);
  }
  add(t, n) {
    return Ne(t + n, this.ORDER);
  }
  sub(t, n) {
    return Ne(t - n, this.ORDER);
  }
  mul(t, n) {
    return Ne(t * n, this.ORDER);
  }
  pow(t, n) {
    return Y1(this, t, n);
  }
  div(t, n) {
    return Ne(t * tp(n, this.ORDER), this.ORDER);
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
    return tp(t, this.ORDER);
  }
  sqrt(t) {
    return this._sqrt || (this._sqrt = W1(this.ORDER)), this._sqrt(this, t);
  }
  toBytes(t) {
    return this.isLE ? wm(t, this.BYTES) : Sc(t, this.BYTES);
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
    let c = s ? ym(t) : Rn(t);
    if (a && (c = Ne(c, o)), !n && !this.isValid(c))
      throw new Error("invalid field element: outside of range 0..ORDER");
    return c;
  }
  // TODO: we don't need it here, move out to separate fn
  invertBatch(t) {
    return km(this, t);
  }
  // We can't move this out because Fp6, Fp12 implement it
  // and it's unclear what to return in there.
  cmov(t, n, r) {
    return r ? n : t;
  }
}
function vc(e, t = {}) {
  return new X1(e, t);
}
function Am(e) {
  if (typeof e != "bigint")
    throw new Error("field order must be bigint");
  const t = e.toString(2).length;
  return Math.ceil(t / 8);
}
function Im(e) {
  const t = Am(e);
  return t + Math.ceil(t / 2);
}
function Om(e, t, n = !1) {
  at(e);
  const r = e.length, i = Am(t), s = Im(t);
  if (r < 16 || r < s || r > 1024)
    throw new Error("expected " + s + "-1024 bytes of input, got " + r);
  const o = n ? ym(e) : Rn(e), a = Ne(o, t - qt) + qt;
  return n ? wm(a, i) : Sc(a, i);
}
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const Li = /* @__PURE__ */ BigInt(0), Mr = /* @__PURE__ */ BigInt(1);
function Ua(e, t) {
  const n = t.negate();
  return e ? n : t;
}
function np(e, t) {
  const n = km(e.Fp, t.map((r) => r.Z));
  return t.map((r, i) => e.fromAffine(r.toAffine(n[i])));
}
function Bm(e, t) {
  if (!Number.isSafeInteger(e) || e <= 0 || e > t)
    throw new Error("invalid window size, expected [1.." + t + "], got W=" + e);
}
function fu(e, t) {
  Bm(e, t);
  const n = Math.ceil(t / e) + 1, r = 2 ** (e - 1), i = 2 ** e, s = Pf(e), o = BigInt(e);
  return { windows: n, windowSize: r, mask: s, maxNumber: i, shiftBy: o };
}
function rp(e, t, n) {
  const { windowSize: r, mask: i, maxNumber: s, shiftBy: o } = n;
  let a = Number(e & i), c = e >> o;
  a > r && (a -= s, c += Mr);
  const u = t * r, l = u + Math.abs(a) - 1, d = a === 0, h = a < 0, p = t % 2 !== 0;
  return { nextN: c, offset: l, isZero: d, isNeg: h, isNegF: p, offsetF: u };
}
const du = /* @__PURE__ */ new WeakMap(), Nm = /* @__PURE__ */ new WeakMap();
function hu(e) {
  return Nm.get(e) || 1;
}
function ip(e) {
  if (e !== Li)
    throw new Error("invalid wNAF");
}
class Q1 {
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
    for (; n > Li; )
      n & Mr && (r = r.add(i)), i = i.double(), n >>= Mr;
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
    const { windows: r, windowSize: i } = fu(n, this.bits), s = [];
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
    const o = fu(t, this.bits);
    for (let a = 0; a < o.windows; a++) {
      const { nextN: c, offset: u, isZero: l, isNeg: d, isNegF: h, offsetF: p } = rp(r, a, o);
      r = c, l ? s = s.add(Ua(h, n[p])) : i = i.add(Ua(d, n[u]));
    }
    return ip(r), { p: i, f: s };
  }
  /**
   * Implements ec unsafe (non const-time) multiplication using precomputed tables and w-ary non-adjacent form.
   * @param acc accumulator point to add result of multiplication
   * @returns point
   */
  wNAFUnsafe(t, n, r, i = this.ZERO) {
    const s = fu(t, this.bits);
    for (let o = 0; o < s.windows && r !== Li; o++) {
      const { nextN: a, offset: c, isZero: u, isNeg: l } = rp(r, o, s);
      if (r = a, !u) {
        const d = n[c];
        i = i.add(l ? d.negate() : d);
      }
    }
    return ip(r), i;
  }
  getPrecomputes(t, n, r) {
    let i = du.get(n);
    return i || (i = this.precomputeWindow(n, t), t !== 1 && (typeof r == "function" && (i = r(i)), du.set(n, i))), i;
  }
  cached(t, n, r) {
    const i = hu(t);
    return this.wNAF(i, this.getPrecomputes(i, t, r), n);
  }
  unsafe(t, n, r, i) {
    const s = hu(t);
    return s === 1 ? this._unsafeLadder(t, n, i) : this.wNAFUnsafe(s, this.getPrecomputes(s, t, r), n, i);
  }
  // We calculate precomputes for elliptic curve point multiplication
  // using windowed method. This specifies window size and
  // stores precomputed values. Usually only base point would be precomputed.
  createCache(t, n) {
    Bm(n, this.bits), Nm.set(t, n), du.delete(t);
  }
  hasCache(t) {
    return hu(t) !== 1;
  }
}
function J1(e, t, n, r) {
  let i = t, s = e.ZERO, o = e.ZERO;
  for (; n > Li || r > Li; )
    n & Mr && (s = s.add(i)), r & Mr && (o = o.add(i)), i = i.double(), n >>= Mr, r >>= Mr;
  return { p1: s, p2: o };
}
function sp(e, t, n) {
  if (t) {
    if (t.ORDER !== e)
      throw new Error("Field.ORDER must match order: Fp == p, Fn == n");
    return G1(t), t;
  } else
    return vc(e, { isLE: n });
}
function tv(e, t, n = {}, r) {
  if (r === void 0 && (r = e === "edwards"), !t || typeof t != "object")
    throw new Error(`expected valid ${e} CURVE object`);
  for (const c of ["p", "n", "h"]) {
    const u = t[c];
    if (!(typeof u == "bigint" && u > Li))
      throw new Error(`CURVE.${c} must be positive bigint`);
  }
  const i = sp(t.p, n.Fp, r), s = sp(t.n, n.Fn, r), a = ["Gx", "Gy", "a", "b"];
  for (const c of a)
    if (!i.isValid(t[c]))
      throw new Error(`CURVE.${c} must be valid field element of CURVE.Fp`);
  return t = Object.freeze(Object.assign({}, t)), { CURVE: t, Fp: i, Fn: s };
}
function Rm(e, t) {
  return function(r) {
    const i = e(r);
    return { secretKey: i, publicKey: t(i) };
  };
}
class Um {
  oHash;
  iHash;
  blockLen;
  outputLen;
  finished = !1;
  destroyed = !1;
  constructor(t, n) {
    if (lm(t), at(n, void 0, "key"), this.iHash = t.create(), typeof this.iHash.update != "function")
      throw new Error("Expected instance of class which extends utils.Hash");
    this.blockLen = this.iHash.blockLen, this.outputLen = this.iHash.outputLen;
    const r = this.blockLen, i = new Uint8Array(r);
    i.set(n.length > r ? t.create().update(n).digest() : n);
    for (let s = 0; s < i.length; s++)
      i[s] ^= 54;
    this.iHash.update(i), this.oHash = t.create();
    for (let s = 0; s < i.length; s++)
      i[s] ^= 106;
    this.oHash.update(i), Ci(i);
  }
  update(t) {
    return Ba(this), this.iHash.update(t), this;
  }
  digestInto(t) {
    Ba(this), at(t, this.outputLen, "output"), this.finished = !0, this.iHash.digestInto(t), this.oHash.update(t), this.oHash.digestInto(t), this.destroy();
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
const Pm = (e, t, n) => new Um(e, t).update(n).digest();
Pm.create = (e, t) => new Um(e, t);
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const op = (e, t) => (e + (e >= 0 ? t : -t) / Cm) / t;
function ev(e, t, n) {
  const [[r, i], [s, o]] = t, a = op(o * e, n), c = op(-i * e, n);
  let u = e - a * r - c * s, l = -a * i - c * o;
  const d = u < An, h = l < An;
  d && (u = -u), h && (l = -l);
  const p = Pf(Math.ceil(M1(n) / 2)) + wi;
  if (u < An || u >= p || l < An || l >= p)
    throw new Error("splitScalar (endomorphism): failed, k=" + e);
  return { k1neg: d, k1: u, k2neg: h, k2: l };
}
function ml(e) {
  if (!["compact", "recovered", "der"].includes(e))
    throw new Error('Signature format must be "compact", "recovered", or "der"');
  return e;
}
function pu(e, t) {
  const n = {};
  for (let r of Object.keys(t))
    n[r] = e[r] === void 0 ? t[r] : e[r];
  return Ra(n.lowS, "lowS"), Ra(n.prehash, "prehash"), n.format !== void 0 && ml(n.format), n;
}
class nv extends Error {
  constructor(t = "") {
    super(t);
  }
}
const Gn = {
  // asn.1 DER encoding utils
  Err: nv,
  // Basic building block is TLV (Tag-Length-Value)
  _tlv: {
    encode: (e, t) => {
      const { Err: n } = Gn;
      if (e < 0 || e > 256)
        throw new n("tlv.encode: wrong tag");
      if (t.length & 1)
        throw new n("tlv.encode: unpadded data");
      const r = t.length / 2, i = mo(r);
      if (i.length / 2 & 128)
        throw new n("tlv.encode: long form length too big");
      const s = r > 127 ? mo(i.length / 2 | 128) : "";
      return mo(e) + s + i + t;
    },
    // v - value, l - left bytes (unparsed)
    decode(e, t) {
      const { Err: n } = Gn;
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
      const { Err: t } = Gn;
      if (e < An)
        throw new t("integer: negative integers are not allowed");
      let n = mo(e);
      if (Number.parseInt(n[0], 16) & 8 && (n = "00" + n), n.length & 1)
        throw new t("unexpected DER parsing assertion: unpadded hex");
      return n;
    },
    decode(e) {
      const { Err: t } = Gn;
      if (e[0] & 128)
        throw new t("invalid signature integer: negative");
      if (e[0] === 0 && !(e[1] & 128))
        throw new t("invalid signature integer: unnecessary leading zero");
      return Rn(e);
    }
  },
  toSig(e) {
    const { Err: t, _int: n, _tlv: r } = Gn, i = at(e, void 0, "signature"), { v: s, l: o } = r.decode(48, i);
    if (o.length)
      throw new t("invalid signature: left bytes after parsing");
    const { v: a, l: c } = r.decode(2, s), { v: u, l } = r.decode(2, c);
    if (l.length)
      throw new t("invalid signature: left bytes after parsing");
    return { r: n.decode(a), s: n.decode(u) };
  },
  hexFromSig(e) {
    const { _tlv: t, _int: n } = Gn, r = t.encode(2, n.encode(e.r)), i = t.encode(2, n.encode(e.s)), s = r + i;
    return t.encode(48, s);
  }
}, An = BigInt(0), wi = BigInt(1), Cm = BigInt(2), bo = BigInt(3), rv = BigInt(4);
function iv(e, t = {}) {
  const n = tv("weierstrass", e, t), { Fp: r, Fn: i } = n;
  let s = n.CURVE;
  const { h: o, n: a } = s;
  Cf(t, {}, {
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
  const u = _m(r, i);
  function l() {
    if (!r.isOdd)
      throw new Error("compression is not supported: Field does not have .isOdd()");
  }
  function d(L, T, x) {
    const { x: w, y: E } = T.toAffine(), k = r.toBytes(w);
    if (Ra(x, "isCompressed"), x) {
      l();
      const I = !r.isOdd(E);
      return sn(Lm(I), k);
    } else
      return sn(Uint8Array.of(4), k, r.toBytes(E));
  }
  function h(L) {
    at(L, void 0, "Point");
    const { publicKey: T, publicKeyUncompressed: x } = u, w = L.length, E = L[0], k = L.subarray(1);
    if (w === T && (E === 2 || E === 3)) {
      const I = r.fromBytes(k);
      if (!r.isValid(I))
        throw new Error("bad point: is not on curve, wrong x");
      const A = f(I);
      let $;
      try {
        $ = r.sqrt(A);
      } catch (K) {
        const M = K instanceof Error ? ": " + K.message : "";
        throw new Error("bad point: is not on curve, sqrt error" + M);
      }
      l();
      const B = r.isOdd($);
      return (E & 1) === 1 !== B && ($ = r.neg($)), { x: I, y: $ };
    } else if (w === x && E === 4) {
      const I = r.BYTES, A = r.fromBytes(k.subarray(0, I)), $ = r.fromBytes(k.subarray(I, I * 2));
      if (!g(A, $))
        throw new Error("bad point: is not on curve");
      return { x: A, y: $ };
    } else
      throw new Error(`bad point: got length ${w}, expected compressed=${T} or uncompressed=${x}`);
  }
  const p = t.toBytes || d, y = t.fromBytes || h;
  function f(L) {
    const T = r.sqr(L), x = r.mul(T, L);
    return r.add(r.add(x, r.mul(L, s.a)), s.b);
  }
  function g(L, T) {
    const x = r.sqr(T), w = f(L);
    return r.eql(x, w);
  }
  if (!g(s.Gx, s.Gy))
    throw new Error("bad curve params: generator point");
  const m = r.mul(r.pow(s.a, bo), rv), S = r.mul(r.sqr(s.b), BigInt(27));
  if (r.is0(r.add(m, S)))
    throw new Error("bad curve params: a or b");
  function v(L, T, x = !1) {
    if (!r.isValid(T) || x && r.is0(T))
      throw new Error(`bad point coordinate ${L}`);
    return T;
  }
  function O(L) {
    if (!(L instanceof U))
      throw new Error("Weierstrass Point expected");
  }
  function R(L) {
    if (!c || !c.basises)
      throw new Error("no endo");
    return ev(L, c.basises, i.ORDER);
  }
  const j = Jh((L, T) => {
    const { X: x, Y: w, Z: E } = L;
    if (r.eql(E, r.ONE))
      return { x, y: w };
    const k = L.is0();
    T == null && (T = k ? r.ONE : r.inv(E));
    const I = r.mul(x, T), A = r.mul(w, T), $ = r.mul(E, T);
    if (k)
      return { x: r.ZERO, y: r.ZERO };
    if (!r.eql($, r.ONE))
      throw new Error("invZ was invalid");
    return { x: I, y: A };
  }), b = Jh((L) => {
    if (L.is0()) {
      if (t.allowInfinityPoint && !r.is0(L.Y))
        return;
      throw new Error("bad point: ZERO");
    }
    const { x: T, y: x } = L.toAffine();
    if (!r.isValid(T) || !r.isValid(x))
      throw new Error("bad point: x or y not field elements");
    if (!g(T, x))
      throw new Error("bad point: equation left != right");
    if (!L.isTorsionFree())
      throw new Error("bad point: not in prime-order subgroup");
    return !0;
  });
  function W(L, T, x, w, E) {
    return x = new U(r.mul(x.X, L), x.Y, x.Z), T = Ua(w, T), x = Ua(E, x), T.add(x);
  }
  class U {
    // base / generator point
    static BASE = new U(s.Gx, s.Gy, r.ONE);
    // zero / infinity / identity point
    static ZERO = new U(r.ZERO, r.ONE, r.ZERO);
    // 0, 1, 0
    // math field
    static Fp = r;
    // scalar field
    static Fn = i;
    X;
    Y;
    Z;
    /** Does NOT validate if the point is valid. Use `.assertValidity()`. */
    constructor(T, x, w) {
      this.X = v("x", T), this.Y = v("y", x, !0), this.Z = v("z", w), Object.freeze(this);
    }
    static CURVE() {
      return s;
    }
    /** Does NOT validate if the point is valid. Use `.assertValidity()`. */
    static fromAffine(T) {
      const { x, y: w } = T || {};
      if (!T || !r.isValid(x) || !r.isValid(w))
        throw new Error("invalid affine point");
      if (T instanceof U)
        throw new Error("projective point not allowed");
      return r.is0(x) && r.is0(w) ? U.ZERO : new U(x, w, r.ONE);
    }
    static fromBytes(T) {
      const x = U.fromAffine(y(at(T, void 0, "point")));
      return x.assertValidity(), x;
    }
    static fromHex(T) {
      return U.fromBytes(Na(T));
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
    precompute(T = 8, x = !0) {
      return et.createCache(this, T), x || this.multiply(bo), this;
    }
    // TODO: return `this`
    /** A point on curve is valid if it conforms to equation. */
    assertValidity() {
      b(this);
    }
    hasEvenY() {
      const { y: T } = this.toAffine();
      if (!r.isOdd)
        throw new Error("Field doesn't support isOdd");
      return !r.isOdd(T);
    }
    /** Compare one point to another. */
    equals(T) {
      O(T);
      const { X: x, Y: w, Z: E } = this, { X: k, Y: I, Z: A } = T, $ = r.eql(r.mul(x, A), r.mul(k, E)), B = r.eql(r.mul(w, A), r.mul(I, E));
      return $ && B;
    }
    /** Flips point to one corresponding to (x, -y) in Affine coordinates. */
    negate() {
      return new U(this.X, r.neg(this.Y), this.Z);
    }
    // Renes-Costello-Batina exception-free doubling formula.
    // There is 30% faster Jacobian formula, but it is not complete.
    // https://eprint.iacr.org/2015/1060, algorithm 3
    // Cost: 8M + 3S + 3*a + 2*b3 + 15add.
    double() {
      const { a: T, b: x } = s, w = r.mul(x, bo), { X: E, Y: k, Z: I } = this;
      let A = r.ZERO, $ = r.ZERO, B = r.ZERO, N = r.mul(E, E), K = r.mul(k, k), M = r.mul(I, I), C = r.mul(E, k);
      return C = r.add(C, C), B = r.mul(E, I), B = r.add(B, B), A = r.mul(T, B), $ = r.mul(w, M), $ = r.add(A, $), A = r.sub(K, $), $ = r.add(K, $), $ = r.mul(A, $), A = r.mul(C, A), B = r.mul(w, B), M = r.mul(T, M), C = r.sub(N, M), C = r.mul(T, C), C = r.add(C, B), B = r.add(N, N), N = r.add(B, N), N = r.add(N, M), N = r.mul(N, C), $ = r.add($, N), M = r.mul(k, I), M = r.add(M, M), N = r.mul(M, C), A = r.sub(A, N), B = r.mul(M, K), B = r.add(B, B), B = r.add(B, B), new U(A, $, B);
    }
    // Renes-Costello-Batina exception-free addition formula.
    // There is 30% faster Jacobian formula, but it is not complete.
    // https://eprint.iacr.org/2015/1060, algorithm 1
    // Cost: 12M + 0S + 3*a + 3*b3 + 23add.
    add(T) {
      O(T);
      const { X: x, Y: w, Z: E } = this, { X: k, Y: I, Z: A } = T;
      let $ = r.ZERO, B = r.ZERO, N = r.ZERO;
      const K = s.a, M = r.mul(s.b, bo);
      let C = r.mul(x, k), H = r.mul(w, I), q = r.mul(E, A), ot = r.add(x, w), F = r.add(k, I);
      ot = r.mul(ot, F), F = r.add(C, H), ot = r.sub(ot, F), F = r.add(x, E);
      let Z = r.add(k, A);
      return F = r.mul(F, Z), Z = r.add(C, q), F = r.sub(F, Z), Z = r.add(w, E), $ = r.add(I, A), Z = r.mul(Z, $), $ = r.add(H, q), Z = r.sub(Z, $), N = r.mul(K, F), $ = r.mul(M, q), N = r.add($, N), $ = r.sub(H, N), N = r.add(H, N), B = r.mul($, N), H = r.add(C, C), H = r.add(H, C), q = r.mul(K, q), F = r.mul(M, F), H = r.add(H, q), q = r.sub(C, q), q = r.mul(K, q), F = r.add(F, q), C = r.mul(H, F), B = r.add(B, C), C = r.mul(Z, F), $ = r.mul(ot, $), $ = r.sub($, C), C = r.mul(ot, H), N = r.mul(Z, N), N = r.add(N, C), new U($, B, N);
    }
    subtract(T) {
      return this.add(T.negate());
    }
    is0() {
      return this.equals(U.ZERO);
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
      const { endo: x } = t;
      if (!i.isValidNot0(T))
        throw new Error("invalid scalar: out of range");
      let w, E;
      const k = (I) => et.cached(this, I, (A) => np(U, A));
      if (x) {
        const { k1neg: I, k1: A, k2neg: $, k2: B } = R(T), { p: N, f: K } = k(A), { p: M, f: C } = k(B);
        E = K.add(C), w = W(x.beta, N, M, I, $);
      } else {
        const { p: I, f: A } = k(T);
        w = I, E = A;
      }
      return np(U, [w, E])[0];
    }
    /**
     * Non-constant-time multiplication. Uses double-and-add algorithm.
     * It's faster, but should only be used when you don't care about
     * an exposed secret key e.g. sig verification, which works over *public* keys.
     */
    multiplyUnsafe(T) {
      const { endo: x } = t, w = this;
      if (!i.isValid(T))
        throw new Error("invalid scalar: out of range");
      if (T === An || w.is0())
        return U.ZERO;
      if (T === wi)
        return w;
      if (et.hasCache(this))
        return this.multiply(T);
      if (x) {
        const { k1neg: E, k1: k, k2neg: I, k2: A } = R(T), { p1: $, p2: B } = J1(U, w, k, A);
        return W(x.beta, $, B, E, I);
      } else
        return et.unsafe(w, T);
    }
    /**
     * Converts Projective point to affine (x, y) coordinates.
     * @param invertedZ Z^-1 (inverted zero) - optional, precomputation is useful for invertBatch
     */
    toAffine(T) {
      return j(this, T);
    }
    /**
     * Checks whether Point is free of torsion elements (is in prime subgroup).
     * Always torsion-free for cofactor=1 curves.
     */
    isTorsionFree() {
      const { isTorsionFree: T } = t;
      return o === wi ? !0 : T ? T(U, this) : et.unsafe(this, a).is0();
    }
    clearCofactor() {
      const { clearCofactor: T } = t;
      return o === wi ? this : T ? T(U, this) : this.multiplyUnsafe(o);
    }
    isSmallOrder() {
      return this.multiplyUnsafe(o).is0();
    }
    toBytes(T = !0) {
      return Ra(T, "isCompressed"), this.assertValidity(), p(U, this, T);
    }
    toHex(T = !0) {
      return xc(this.toBytes(T));
    }
    toString() {
      return `<Point ${this.is0() ? "ZERO" : this.toHex()}>`;
    }
  }
  const Y = i.BITS, et = new Q1(U, t.endo ? Math.ceil(Y / 2) : Y);
  return U.BASE.precompute(8), U;
}
function Lm(e) {
  return Uint8Array.of(e ? 2 : 3);
}
function _m(e, t) {
  return {
    secretKey: t.BYTES,
    publicKey: 1 + e.BYTES,
    publicKeyUncompressed: 1 + 2 * e.BYTES,
    publicKeyHasPrefix: !0,
    signature: 2 * t.BYTES
  };
}
function sv(e, t = {}) {
  const { Fn: n } = e, r = t.randomBytes || Tc, i = Object.assign(_m(e.Fp, n), { seed: Im(n.ORDER) });
  function s(p) {
    try {
      const y = n.fromBytes(p);
      return n.isValidNot0(y);
    } catch {
      return !1;
    }
  }
  function o(p, y) {
    const { publicKey: f, publicKeyUncompressed: g } = i;
    try {
      const m = p.length;
      return y === !0 && m !== f || y === !1 && m !== g ? !1 : !!e.fromBytes(p);
    } catch {
      return !1;
    }
  }
  function a(p = r(i.seed)) {
    return Om(at(p, i.seed, "seed"), n.ORDER);
  }
  function c(p, y = !0) {
    return e.BASE.multiply(n.fromBytes(p)).toBytes(y);
  }
  function u(p) {
    const { secretKey: y, publicKey: f, publicKeyUncompressed: g } = i;
    if (!Nf(p) || "_lengths" in n && n._lengths || y === f)
      return;
    const m = at(p, void 0, "key").length;
    return m === f || m === g;
  }
  function l(p, y, f = !0) {
    if (u(p) === !0)
      throw new Error("first arg must be private key");
    if (u(y) === !1)
      throw new Error("second arg must be public key");
    const g = n.fromBytes(p);
    return e.fromBytes(y).multiply(g).toBytes(f);
  }
  const d = {
    isValidSecretKey: s,
    isValidPublicKey: o,
    randomSecretKey: a
  }, h = Rm(a, c);
  return Object.freeze({ getPublicKey: c, getSharedSecret: l, keygen: h, Point: e, utils: d, lengths: i });
}
function ov(e, t, n = {}) {
  lm(t), Cf(n, {}, {
    hmac: "function",
    lowS: "boolean",
    randomBytes: "function",
    bits2int: "function",
    bits2int_modN: "function"
  }), n = Object.assign({}, n);
  const r = n.randomBytes || Tc, i = n.hmac || ((x, w) => Pm(t, x, w)), { Fp: s, Fn: o } = e, { ORDER: a, BITS: c } = o, { keygen: u, getPublicKey: l, getSharedSecret: d, utils: h, lengths: p } = sv(e, n), y = {
    prehash: !0,
    lowS: typeof n.lowS == "boolean" ? n.lowS : !0,
    format: "compact",
    extraEntropy: !1
  }, f = a * Cm < s.ORDER;
  function g(x) {
    const w = a >> wi;
    return x > w;
  }
  function m(x, w) {
    if (!o.isValidNot0(w))
      throw new Error(`invalid signature ${x}: out of range 1..Point.Fn.ORDER`);
    return w;
  }
  function S() {
    if (f)
      throw new Error('"recovered" sig type is not supported for cofactor >2 curves');
  }
  function v(x, w) {
    ml(w);
    const E = p.signature, k = w === "compact" ? E : w === "recovered" ? E + 1 : void 0;
    return at(x, k);
  }
  class O {
    r;
    s;
    recovery;
    constructor(w, E, k) {
      if (this.r = m("r", w), this.s = m("s", E), k != null) {
        if (S(), ![0, 1, 2, 3].includes(k))
          throw new Error("invalid recovery id");
        this.recovery = k;
      }
      Object.freeze(this);
    }
    static fromBytes(w, E = y.format) {
      v(w, E);
      let k;
      if (E === "der") {
        const { r: B, s: N } = Gn.toSig(at(w));
        return new O(B, N);
      }
      E === "recovered" && (k = w[0], E = "compact", w = w.subarray(1));
      const I = p.signature / 2, A = w.subarray(0, I), $ = w.subarray(I, I * 2);
      return new O(o.fromBytes(A), o.fromBytes($), k);
    }
    static fromHex(w, E) {
      return this.fromBytes(Na(w), E);
    }
    assertRecovery() {
      const { recovery: w } = this;
      if (w == null)
        throw new Error("invalid recovery id: must be present");
      return w;
    }
    addRecoveryBit(w) {
      return new O(this.r, this.s, w);
    }
    recoverPublicKey(w) {
      const { r: E, s: k } = this, I = this.assertRecovery(), A = I === 2 || I === 3 ? E + a : E;
      if (!s.isValid(A))
        throw new Error("invalid recovery id: sig.r+curve.n != R.x");
      const $ = s.toBytes(A), B = e.fromBytes(sn(Lm((I & 1) === 0), $)), N = o.inv(A), K = j(at(w, void 0, "msgHash")), M = o.create(-K * N), C = o.create(k * N), H = e.BASE.multiplyUnsafe(M).add(B.multiplyUnsafe(C));
      if (H.is0())
        throw new Error("invalid recovery: point at infinify");
      return H.assertValidity(), H;
    }
    // Signatures should be low-s, to prevent malleability.
    hasHighS() {
      return g(this.s);
    }
    toBytes(w = y.format) {
      if (ml(w), w === "der")
        return Na(Gn.hexFromSig(this));
      const { r: E, s: k } = this, I = o.toBytes(E), A = o.toBytes(k);
      return w === "recovered" ? (S(), sn(Uint8Array.of(this.assertRecovery()), I, A)) : sn(I, A);
    }
    toHex(w) {
      return xc(this.toBytes(w));
    }
  }
  const R = n.bits2int || function(w) {
    if (w.length > 8192)
      throw new Error("input is too large");
    const E = Rn(w), k = w.length * 8 - c;
    return k > 0 ? E >> BigInt(k) : E;
  }, j = n.bits2int_modN || function(w) {
    return o.create(R(w));
  }, b = Pf(c);
  function W(x) {
    return mm("num < 2^" + c, x, An, b), o.toBytes(x);
  }
  function U(x, w) {
    return at(x, void 0, "message"), w ? at(t(x), void 0, "prehashed message") : x;
  }
  function Y(x, w, E) {
    const { lowS: k, prehash: I, extraEntropy: A } = pu(E, y);
    x = U(x, I);
    const $ = j(x), B = o.fromBytes(w);
    if (!o.isValidNot0(B))
      throw new Error("invalid private key");
    const N = [W(B), W($)];
    if (A != null && A !== !1) {
      const H = A === !0 ? r(p.secretKey) : A;
      N.push(at(H, void 0, "extraEntropy"));
    }
    const K = sn(...N), M = $;
    function C(H) {
      const q = R(H);
      if (!o.isValidNot0(q))
        return;
      const ot = o.inv(q), F = e.BASE.multiply(q).toAffine(), Z = o.create(F.x);
      if (Z === An)
        return;
      const Gt = o.create(ot * o.create(M + Z * B));
      if (Gt === An)
        return;
      let Un = (F.x === Z ? 0 : 2) | Number(F.y & wi), Pn = Gt;
      return k && g(Gt) && (Pn = o.neg(Gt), Un ^= 1), new O(Z, Pn, f ? void 0 : Un);
    }
    return { seed: K, k2sig: C };
  }
  function et(x, w, E = {}) {
    const { seed: k, k2sig: I } = Y(x, w, E);
    return H1(t.outputLen, o.BYTES, i)(k, I).toBytes(E.format);
  }
  function L(x, w, E, k = {}) {
    const { lowS: I, prehash: A, format: $ } = pu(k, y);
    if (E = at(E, void 0, "publicKey"), w = U(w, A), !Nf(x)) {
      const B = x instanceof O ? ", use sig.toBytes()" : "";
      throw new Error("verify expects Uint8Array signature" + B);
    }
    v(x, $);
    try {
      const B = O.fromBytes(x, $), N = e.fromBytes(E);
      if (I && B.hasHighS())
        return !1;
      const { r: K, s: M } = B, C = j(w), H = o.inv(M), q = o.create(C * H), ot = o.create(K * H), F = e.BASE.multiplyUnsafe(q).add(N.multiplyUnsafe(ot));
      return F.is0() ? !1 : o.create(F.x) === K;
    } catch {
      return !1;
    }
  }
  function T(x, w, E = {}) {
    const { prehash: k } = pu(E, y);
    return w = U(w, k), O.fromBytes(x, "recovered").recoverPublicKey(w).toBytes();
  }
  return Object.freeze({
    keygen: u,
    getPublicKey: l,
    getSharedSecret: d,
    utils: h,
    lengths: p,
    Point: e,
    sign: et,
    verify: L,
    recoverPublicKey: T,
    Signature: O,
    hash: t
  });
}
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const $c = {
  p: BigInt("0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffefffffc2f"),
  n: BigInt("0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141"),
  h: BigInt(1),
  a: BigInt(0),
  b: BigInt(7),
  Gx: BigInt("0x79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798"),
  Gy: BigInt("0x483ada7726a3c4655da4fbfc0e1108a8fd17b448a68554199c47d08ffb10d4b8")
}, av = {
  beta: BigInt("0x7ae96a2b657c07106e64479eac3434e99cf0497512f58995c1396c28719501ee"),
  basises: [
    [BigInt("0x3086d221a7d46bcde86c90e49284eb15"), -BigInt("0xe4437ed6010e88286f547fa90abfe4c3")],
    [BigInt("0x114ca50f7a8e2f3f657c1108d9d44cfd8"), BigInt("0x3086d221a7d46bcde86c90e49284eb15")]
  ]
}, cv = /* @__PURE__ */ BigInt(0), bl = /* @__PURE__ */ BigInt(2);
function uv(e) {
  const t = $c.p, n = BigInt(3), r = BigInt(6), i = BigInt(11), s = BigInt(22), o = BigInt(23), a = BigInt(44), c = BigInt(88), u = e * e * e % t, l = u * u * e % t, d = be(l, n, t) * l % t, h = be(d, n, t) * l % t, p = be(h, bl, t) * u % t, y = be(p, i, t) * p % t, f = be(y, s, t) * y % t, g = be(f, a, t) * f % t, m = be(g, c, t) * g % t, S = be(m, a, t) * f % t, v = be(S, n, t) * l % t, O = be(v, o, t) * y % t, R = be(O, r, t) * u % t, j = be(R, bl, t);
  if (!Pa.eql(Pa.sqr(j), e))
    throw new Error("Cannot find square root");
  return j;
}
const Pa = vc($c.p, { sqrt: uv }), ni = /* @__PURE__ */ iv($c, {
  Fp: Pa,
  endo: av
}), nr = /* @__PURE__ */ ov(ni, Ft), ap = {};
function Ca(e, ...t) {
  let n = ap[e];
  if (n === void 0) {
    const r = Ft(D1(e));
    n = sn(r, r), ap[e] = n;
  }
  return Ft(sn(n, ...t));
}
const _f = (e) => e.toBytes(!0).slice(1), Df = (e) => e % bl === cv;
function El(e) {
  const { Fn: t, BASE: n } = ni, r = t.fromBytes(e), i = n.multiply(r);
  return { scalar: Df(i.y) ? r : t.neg(r), bytes: _f(i) };
}
function Dm(e) {
  const t = Pa;
  if (!t.isValidNot0(e))
    throw new Error("invalid x: Fail if x ≥ p");
  const n = t.create(e * e), r = t.create(n * e + BigInt(7));
  let i = t.sqrt(r);
  Df(i) || (i = t.neg(i));
  const s = ni.fromAffine({ x: e, y: i });
  return s.assertValidity(), s;
}
const Ss = Rn;
function Vm(...e) {
  return ni.Fn.create(Ss(Ca("BIP0340/challenge", ...e)));
}
function cp(e) {
  return El(e).bytes;
}
function lv(e, t, n = Tc(32)) {
  const { Fn: r } = ni, i = at(e, void 0, "message"), { bytes: s, scalar: o } = El(t), a = at(n, 32, "auxRand"), c = r.toBytes(o ^ Ss(Ca("BIP0340/aux", a))), u = Ca("BIP0340/nonce", c, s, i), { bytes: l, scalar: d } = El(u), h = Vm(l, s, i), p = new Uint8Array(64);
  if (p.set(l, 0), p.set(r.toBytes(r.create(d + h * o)), 32), !Mm(p, i, s))
    throw new Error("sign: Invalid signature produced");
  return p;
}
function Mm(e, t, n) {
  const { Fp: r, Fn: i, BASE: s } = ni, o = at(e, 64, "signature"), a = at(t, void 0, "message"), c = at(n, 32, "publicKey");
  try {
    const u = Dm(Ss(c)), l = Ss(o.subarray(0, 32));
    if (!r.isValidNot0(l))
      return !1;
    const d = Ss(o.subarray(32, 64));
    if (!i.isValidNot0(d))
      return !1;
    const h = Vm(i.toBytes(l), _f(u), a), p = s.multiplyUnsafe(d).add(u.multiplyUnsafe(i.neg(h))), { x: y, y: f } = p.toAffine();
    return !(p.is0() || !Df(f) || y !== l);
  } catch {
    return !1;
  }
}
const hn = /* @__PURE__ */ (() => {
  const n = (r = Tc(48)) => Om(r, $c.n);
  return {
    keygen: Rm(n, cp),
    getPublicKey: cp,
    sign: lv,
    verify: Mm,
    Point: ni,
    utils: {
      randomSecretKey: n,
      taggedHash: Ca,
      lift_x: Dm,
      pointToBytes: _f
    },
    lengths: {
      secretKey: 32,
      publicKey: 32,
      publicKeyHasPrefix: !1,
      signature: 64,
      seed: 48
    }
  };
})(), fv = /* @__PURE__ */ Uint8Array.from([
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
]), Hm = Uint8Array.from(new Array(16).fill(0).map((e, t) => t)), dv = Hm.map((e) => (9 * e + 5) % 16), Fm = /* @__PURE__ */ (() => {
  const n = [[Hm], [dv]];
  for (let r = 0; r < 4; r++)
    for (let i of n)
      i.push(i[r].map((s) => fv[s]));
  return n;
})(), jm = Fm[0], Km = Fm[1], zm = /* @__PURE__ */ [
  [11, 14, 15, 12, 5, 8, 7, 9, 11, 13, 14, 15, 6, 7, 9, 8],
  [12, 13, 11, 15, 6, 9, 9, 7, 12, 15, 11, 13, 7, 8, 7, 7],
  [13, 15, 14, 11, 7, 7, 6, 8, 13, 14, 13, 12, 5, 5, 6, 9],
  [14, 11, 12, 14, 8, 6, 5, 5, 15, 12, 15, 14, 9, 9, 8, 6],
  [15, 12, 13, 13, 9, 5, 8, 6, 14, 11, 12, 11, 8, 6, 5, 5]
].map((e) => Uint8Array.from(e)), hv = /* @__PURE__ */ jm.map((e, t) => e.map((n) => zm[t][n])), pv = /* @__PURE__ */ Km.map((e, t) => e.map((n) => zm[t][n])), gv = /* @__PURE__ */ Uint32Array.from([
  0,
  1518500249,
  1859775393,
  2400959708,
  2840853838
]), yv = /* @__PURE__ */ Uint32Array.from([
  1352829926,
  1548603684,
  1836072691,
  2053994217,
  0
]);
function up(e, t, n, r) {
  return e === 0 ? t ^ n ^ r : e === 1 ? t & n | ~t & r : e === 2 ? (t | ~n) ^ r : e === 3 ? t & r | n & ~r : t ^ (n | ~r);
}
const Eo = /* @__PURE__ */ new Uint32Array(16);
class wv extends hm {
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
      Eo[p] = t.getUint32(n, !0);
    let r = this.h0 | 0, i = r, s = this.h1 | 0, o = s, a = this.h2 | 0, c = a, u = this.h3 | 0, l = u, d = this.h4 | 0, h = d;
    for (let p = 0; p < 5; p++) {
      const y = 4 - p, f = gv[p], g = yv[p], m = jm[p], S = Km[p], v = hv[p], O = pv[p];
      for (let R = 0; R < 16; R++) {
        const j = wo(r + up(p, s, a, u) + Eo[m[R]] + f, v[R]) + d | 0;
        r = d, d = u, u = wo(a, 10) | 0, a = s, s = j;
      }
      for (let R = 0; R < 16; R++) {
        const j = wo(i + up(y, o, c, l) + Eo[S[R]] + g, O[R]) + h | 0;
        i = h, h = l, l = wo(c, 10) | 0, c = o, o = j;
      }
    }
    this.set(this.h1 + a + l | 0, this.h2 + u + h | 0, this.h3 + d + i | 0, this.h4 + r + o | 0, this.h0 + s + c | 0);
  }
  roundClean() {
    Ci(Eo);
  }
  destroy() {
    this.destroyed = !0, Ci(this.buffer), this.set(0, 0, 0, 0, 0);
  }
}
const mv = /* @__PURE__ */ dm(() => new wv());
/*! scure-base - MIT License (c) 2022 Paul Miller (paulmillr.com) */
function _i(e) {
  return e instanceof Uint8Array || ArrayBuffer.isView(e) && e.constructor.name === "Uint8Array";
}
function Wm(e) {
  if (!_i(e))
    throw new Error("Uint8Array expected");
}
function qm(e, t) {
  return Array.isArray(t) ? t.length === 0 ? !0 : e ? t.every((n) => typeof n == "string") : t.every((n) => Number.isSafeInteger(n)) : !1;
}
function Vf(e) {
  if (typeof e != "function")
    throw new Error("function expected");
  return !0;
}
function mr(e, t) {
  if (typeof t != "string")
    throw new Error(`${e}: string expected`);
  return !0;
}
function Gi(e) {
  if (!Number.isSafeInteger(e))
    throw new Error(`invalid integer: ${e}`);
}
function La(e) {
  if (!Array.isArray(e))
    throw new Error("array expected");
}
function _a(e, t) {
  if (!qm(!0, t))
    throw new Error(`${e}: array of strings expected`);
}
function Mf(e, t) {
  if (!qm(!1, t))
    throw new Error(`${e}: array of numbers expected`);
}
// @__NO_SIDE_EFFECTS__
function Qs(...e) {
  const t = (s) => s, n = (s, o) => (a) => s(o(a)), r = e.map((s) => s.encode).reduceRight(n, t), i = e.map((s) => s.decode).reduce(n, t);
  return { encode: r, decode: i };
}
// @__NO_SIDE_EFFECTS__
function kc(e) {
  const t = typeof e == "string" ? e.split("") : e, n = t.length;
  _a("alphabet", t);
  const r = new Map(t.map((i, s) => [i, s]));
  return {
    encode: (i) => (La(i), i.map((s) => {
      if (!Number.isSafeInteger(s) || s < 0 || s >= n)
        throw new Error(`alphabet.encode: digit index outside alphabet "${s}". Allowed: ${e}`);
      return t[s];
    })),
    decode: (i) => (La(i), i.map((s) => {
      mr("alphabet.decode", s);
      const o = r.get(s);
      if (o === void 0)
        throw new Error(`Unknown letter: "${s}". Allowed: ${e}`);
      return o;
    }))
  };
}
// @__NO_SIDE_EFFECTS__
function Ac(e = "") {
  return mr("join", e), {
    encode: (t) => (_a("join.decode", t), t.join(e)),
    decode: (t) => (mr("join.decode", t), t.split(e))
  };
}
// @__NO_SIDE_EFFECTS__
function bv(e, t = "=") {
  return Gi(e), mr("padding", t), {
    encode(n) {
      for (_a("padding.encode", n); n.length * e % 8; )
        n.push(t);
      return n;
    },
    decode(n) {
      _a("padding.decode", n);
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
function Ev(e) {
  return Vf(e), { encode: (t) => t, decode: (t) => e(t) };
}
function lp(e, t, n) {
  if (t < 2)
    throw new Error(`convertRadix: invalid from=${t}, base cannot be less than 2`);
  if (n < 2)
    throw new Error(`convertRadix: invalid to=${n}, base cannot be less than 2`);
  if (La(e), !e.length)
    return [];
  let r = 0;
  const i = [], s = Array.from(e, (a) => {
    if (Gi(a), a < 0 || a >= t)
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
const Gm = (e, t) => t === 0 ? e : Gm(t, e % t), Da = /* @__NO_SIDE_EFFECTS__ */ (e, t) => e + (t - Gm(e, t)), Ho = /* @__PURE__ */ (() => {
  let e = [];
  for (let t = 0; t < 40; t++)
    e.push(2 ** t);
  return e;
})();
function xl(e, t, n, r) {
  if (La(e), t <= 0 || t > 32)
    throw new Error(`convertRadix2: wrong from=${t}`);
  if (n <= 0 || n > 32)
    throw new Error(`convertRadix2: wrong to=${n}`);
  if (/* @__PURE__ */ Da(t, n) > 32)
    throw new Error(`convertRadix2: carry overflow from=${t} to=${n} carryBits=${/* @__PURE__ */ Da(t, n)}`);
  let i = 0, s = 0;
  const o = Ho[t], a = Ho[n] - 1, c = [];
  for (const u of e) {
    if (Gi(u), u >= o)
      throw new Error(`convertRadix2: invalid data word=${u} from=${t}`);
    if (i = i << t | u, s + t > 32)
      throw new Error(`convertRadix2: carry overflow pos=${s} from=${t}`);
    for (s += t; s >= n; s -= n)
      c.push((i >> s - n & a) >>> 0);
    const l = Ho[s];
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
function xv(e) {
  Gi(e);
  const t = 2 ** 8;
  return {
    encode: (n) => {
      if (!_i(n))
        throw new Error("radix.encode input should be Uint8Array");
      return lp(Array.from(n), t, e);
    },
    decode: (n) => (Mf("radix.decode", n), Uint8Array.from(lp(n, e, t)))
  };
}
// @__NO_SIDE_EFFECTS__
function Hf(e, t = !1) {
  if (Gi(e), e <= 0 || e > 32)
    throw new Error("radix2: bits should be in (0..32]");
  if (/* @__PURE__ */ Da(8, e) > 32 || /* @__PURE__ */ Da(e, 8) > 32)
    throw new Error("radix2: carry overflow");
  return {
    encode: (n) => {
      if (!_i(n))
        throw new Error("radix2.encode input should be Uint8Array");
      return xl(Array.from(n), 8, e, !t);
    },
    decode: (n) => (Mf("radix2.decode", n), Uint8Array.from(xl(n, e, 8, t)))
  };
}
function fp(e) {
  return Vf(e), function(...t) {
    try {
      return e.apply(null, t);
    } catch {
    }
  };
}
function Tv(e, t) {
  return Gi(e), Vf(t), {
    encode(n) {
      if (!_i(n))
        throw new Error("checksum.encode: input should be Uint8Array");
      const r = t(n).slice(0, e), i = new Uint8Array(n.length + e);
      return i.set(n), i.set(r, n.length), i;
    },
    decode(n) {
      if (!_i(n))
        throw new Error("checksum.decode: input should be Uint8Array");
      const r = n.slice(0, -e), i = n.slice(-e), s = t(r).slice(0, e);
      for (let o = 0; o < e; o++)
        if (s[o] !== i[o])
          throw new Error("Invalid checksum");
      return r;
    }
  };
}
const Sv = typeof Uint8Array.from([]).toBase64 == "function" && typeof Uint8Array.fromBase64 == "function", vv = (e, t) => {
  mr("base64", e);
  const n = /^[A-Za-z0-9=+/]+$/, r = "base64";
  if (e.length > 0 && !n.test(e))
    throw new Error("invalid base64");
  return Uint8Array.fromBase64(e, { alphabet: r, lastChunkHandling: "strict" });
}, Mt = Sv ? {
  encode(e) {
    return Wm(e), e.toBase64();
  },
  decode(e) {
    return vv(e);
  }
} : /* @__PURE__ */ Qs(/* @__PURE__ */ Hf(6), /* @__PURE__ */ kc("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"), /* @__PURE__ */ bv(6), /* @__PURE__ */ Ac("")), $v = /* @__NO_SIDE_EFFECTS__ */ (e) => /* @__PURE__ */ Qs(/* @__PURE__ */ xv(58), /* @__PURE__ */ kc(e), /* @__PURE__ */ Ac("")), Tl = /* @__PURE__ */ $v("123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"), kv = (e) => /* @__PURE__ */ Qs(Tv(4, (t) => e(e(t))), Tl), Sl = /* @__PURE__ */ Qs(/* @__PURE__ */ kc("qpzry9x8gf2tvdw0s3jn54khce6mua7l"), /* @__PURE__ */ Ac("")), dp = [996825010, 642813549, 513874426, 1027748829, 705979059];
function is(e) {
  const t = e >> 25;
  let n = (e & 33554431) << 5;
  for (let r = 0; r < dp.length; r++)
    (t >> r & 1) === 1 && (n ^= dp[r]);
  return n;
}
function hp(e, t, n = 1) {
  const r = e.length;
  let i = 1;
  for (let s = 0; s < r; s++) {
    const o = e.charCodeAt(s);
    if (o < 33 || o > 126)
      throw new Error(`Invalid prefix (${e})`);
    i = is(i) ^ o >> 5;
  }
  i = is(i);
  for (let s = 0; s < r; s++)
    i = is(i) ^ e.charCodeAt(s) & 31;
  for (let s of t)
    i = is(i) ^ s;
  for (let s = 0; s < 6; s++)
    i = is(i);
  return i ^= n, Sl.encode(xl([i % Ho[30]], 30, 5, !1));
}
// @__NO_SIDE_EFFECTS__
function Ym(e) {
  const t = e === "bech32" ? 1 : 734539939, n = /* @__PURE__ */ Hf(5), r = n.decode, i = n.encode, s = fp(r);
  function o(d, h, p = 90) {
    mr("bech32.encode prefix", d), _i(h) && (h = Array.from(h)), Mf("bech32.encode", h);
    const y = d.length;
    if (y === 0)
      throw new TypeError(`Invalid prefix length ${y}`);
    const f = y + 7 + h.length;
    if (p !== !1 && f > p)
      throw new TypeError(`Length ${f} exceeds limit ${p}`);
    const g = d.toLowerCase(), m = hp(g, h, t);
    return `${g}1${Sl.encode(h)}${m}`;
  }
  function a(d, h = 90) {
    mr("bech32.decode input", d);
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
    const S = Sl.decode(m).slice(0, -6), v = hp(g, S, t);
    if (!m.endsWith(v))
      throw new Error(`Invalid checksum in ${d}: expected "${v}"`);
    return { prefix: g, words: S };
  }
  const c = fp(a);
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
const vl = /* @__PURE__ */ Ym("bech32"), ai = /* @__PURE__ */ Ym("bech32m"), Av = {
  encode: (e) => new TextDecoder().decode(e),
  decode: (e) => new TextEncoder().encode(e)
}, Iv = typeof Uint8Array.from([]).toHex == "function" && typeof Uint8Array.fromHex == "function", Ov = {
  encode(e) {
    return Wm(e), e.toHex();
  },
  decode(e) {
    return mr("hex", e), Uint8Array.fromHex(e);
  }
}, V = Iv ? Ov : /* @__PURE__ */ Qs(/* @__PURE__ */ Hf(4), /* @__PURE__ */ kc("0123456789abcdef"), /* @__PURE__ */ Ac(""), /* @__PURE__ */ Ev((e) => {
  if (typeof e != "string" || e.length % 2 !== 0)
    throw new TypeError(`hex.decode: expected string, got ${typeof e} with length ${e.length}`);
  return e.toLowerCase();
})), Et = /* @__PURE__ */ Uint8Array.of(), Zm = /* @__PURE__ */ Uint8Array.of(0);
function Di(e, t) {
  if (e.length !== t.length)
    return !1;
  for (let n = 0; n < e.length; n++)
    if (e[n] !== t[n])
      return !1;
  return !0;
}
function Se(e) {
  return e instanceof Uint8Array || ArrayBuffer.isView(e) && e.constructor.name === "Uint8Array";
}
function Bv(...e) {
  let t = 0;
  for (let r = 0; r < e.length; r++) {
    const i = e[r];
    if (!Se(i))
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
const Xm = (e) => new DataView(e.buffer, e.byteOffset, e.byteLength);
function Js(e) {
  return Object.prototype.toString.call(e) === "[object Object]";
}
function dn(e) {
  return Number.isSafeInteger(e);
}
const Ff = {
  equalBytes: Di,
  isBytes: Se,
  concatBytes: Bv
}, Qm = (e) => {
  if (e !== null && typeof e != "string" && !He(e) && !Se(e) && !dn(e))
    throw new Error(`lengthCoder: expected null | number | Uint8Array | CoderType, got ${e} (${typeof e})`);
  return {
    encodeStream(t, n) {
      if (e === null)
        return;
      if (He(e))
        return e.encodeStream(t, n);
      let r;
      if (typeof e == "number" ? r = e : typeof e == "string" && (r = On.resolve(t.stack, e)), typeof r == "bigint" && (r = Number(r)), r === void 0 || r !== n)
        throw t.err(`Wrong length: ${r} len=${e} exp=${n} (${typeof n})`);
    },
    decodeStream(t) {
      let n;
      if (He(e) ? n = Number(e.decodeStream(t)) : typeof e == "number" ? n = e : typeof e == "string" && (n = On.resolve(t.stack, e)), typeof n == "bigint" && (n = Number(n)), typeof n != "number")
        throw t.err(`Wrong length: ${n}`);
      return n;
    }
  };
}, Ut = {
  BITS: 32,
  FULL_MASK: -1 >>> 0,
  // 1<<32 will overflow
  len: (e) => Math.ceil(e / 32),
  create: (e) => new Uint32Array(Ut.len(e)),
  clean: (e) => e.fill(0),
  debug: (e) => Array.from(e).map((t) => (t >>> 0).toString(2).padStart(32, "0")),
  checkLen: (e, t) => {
    if (Ut.len(t) !== e.length)
      throw new Error(`wrong length=${e.length}. Expected: ${Ut.len(t)}`);
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
    Ut.checkLen(e, t);
    const { FULL_MASK: r, BITS: i } = Ut, s = i - t % i, o = s ? r >>> s << s : r, a = [];
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
  rangeDebug: (e, t, n = !1) => `[${Ut.range(Ut.indices(e, t, n)).map((r) => `(${r.pos}/${r.length})`).join(", ")}]`,
  setRange: (e, t, n, r, i = !0) => {
    Ut.chunkLen(t, n, r);
    const { FULL_MASK: s, BITS: o } = Ut, a = n % o ? Math.floor(n / o) : void 0, c = n + r, u = c % o ? Math.floor(c / o) : void 0;
    if (a !== void 0 && a === u)
      return Ut.set(e, a, s >>> o - r << o - r - n, i);
    if (a !== void 0 && !Ut.set(e, a, s >>> n % o, i))
      return !1;
    const l = a !== void 0 ? a + 1 : n / o, d = u !== void 0 ? u : c / o;
    for (let h = l; h < d; h++)
      if (!Ut.set(e, h, s, i))
        return !1;
    return !(u !== void 0 && a !== u && !Ut.set(e, u, s << o - c % o, i));
  }
}, On = {
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
    const r = new Error(`${e}(${On.path(t)}): ${typeof n == "string" ? n : n.message}`);
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
class jf {
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
    this.data = t, this.opts = n, this.stack = r, this.parent = i, this.parentOffset = s, this.view = Xm(t);
  }
  /** Internal method for pointers. */
  _enablePointers() {
    if (this.parent)
      return this.parent._enablePointers();
    this.bs || (this.bs = Ut.create(this.data.length), Ut.setRange(this.bs, this.data.length, 0, this.pos, this.opts.allowMultipleReads));
  }
  markBytesBS(t, n) {
    return this.parent ? this.parent.markBytesBS(this.parentOffset + t, n) : !n || !this.bs ? !0 : Ut.setRange(this.bs, this.data.length, t, n, !1);
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
    return On.pushObj(this.stack, t, n);
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
        throw this.err(`${this.bitPos} bits left after unpack: ${V.encode(this.data.slice(this.pos))}`);
      if (this.bs && !this.parent) {
        const t = Ut.indices(this.bs, this.data.length, !0);
        if (t.length) {
          const n = Ut.range(t).map(({ pos: r, length: i }) => `(${r}/${i})[${V.encode(this.data.subarray(r, r + i))}]`).join(", ");
          throw this.err(`unread byte ranges: ${n} (total=${this.data.length})`);
        } else
          return;
      }
      if (!this.isEnd())
        throw this.err(`${this.leftBytes} bytes ${this.bitPos} bits left after unpack: ${V.encode(this.data.slice(this.pos))}`);
    }
  }
  // User methods
  err(t) {
    return On.err("Reader", this.stack, t);
  }
  offsetReader(t) {
    if (t > this.data.length)
      throw this.err("offsetReader: Unexpected end of buffer");
    return new jf(this.absBytes(t), this.opts, this.stack, this, t);
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
    if (!Se(t))
      throw this.err(`find: needle is not bytes! ${t}`);
    if (this.bitPos)
      throw this.err("findByte: bitPos not empty");
    if (!t.length)
      throw this.err("find: needle is empty");
    for (let r = n; (r = this.data.indexOf(t[0], r)) !== -1; r++) {
      if (r === -1 || this.data.length - r < t.length)
        return;
      if (Di(t, this.data.subarray(r, r + t.length)))
        return r;
    }
  }
}
class Nv {
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
    this.stack = t, this.view = Xm(this.viewBuf);
  }
  pushObj(t, n) {
    return On.pushObj(this.stack, t, n);
  }
  writeView(t, n) {
    if (this.finished)
      throw this.err("buffer: finished");
    if (!dn(t) || t > 8)
      throw new Error(`wrong writeView length=${t}`);
    n(this.view), this.bytes(this.viewBuf.slice(0, t)), this.viewBuf.fill(0);
  }
  // User methods
  err(t) {
    if (this.finished)
      throw this.err("buffer: finished");
    return On.err("Reader", this.stack, t);
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
const $l = (e) => Uint8Array.from(e).reverse();
function Rv(e, t, n) {
  if (n) {
    const r = 2n ** (t - 1n);
    if (e < -r || e >= r)
      throw new Error(`value out of signed bounds. Expected ${-r} <= ${e} < ${r}`);
  } else if (0n > e || e >= 2n ** t)
    throw new Error(`value out of unsigned bounds. Expected 0 <= ${e} < ${2n ** t}`);
}
function Jm(e) {
  return {
    // NOTE: we cannot export validate here, since it is likely mistake.
    encodeStream: e.encodeStream,
    decodeStream: e.decodeStream,
    size: e.size,
    encode: (t) => {
      const n = new Nv();
      return e.encodeStream(n, t), n.finish();
    },
    decode: (t, n = {}) => {
      const r = new jf(t, n), i = e.decodeStream(r);
      return r.finish(), i;
    }
  };
}
function ie(e, t) {
  if (!He(e))
    throw new Error(`validate: invalid inner value ${e}`);
  if (typeof t != "function")
    throw new Error("validate: fn should be function");
  return Jm({
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
const se = (e) => {
  const t = Jm(e);
  return e.validate ? ie(t, e.validate) : t;
}, Ic = (e) => Js(e) && typeof e.decode == "function" && typeof e.encode == "function";
function He(e) {
  return Js(e) && Ic(e) && typeof e.encodeStream == "function" && typeof e.decodeStream == "function" && (e.size === void 0 || dn(e.size));
}
function Uv() {
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
      if (!Js(e))
        throw new Error(`expected plain object, got ${e}`);
      return Object.entries(e);
    }
  };
}
const Pv = {
  encode: (e) => {
    if (typeof e != "bigint")
      throw new Error(`expected bigint, got ${typeof e}`);
    if (e > BigInt(Number.MAX_SAFE_INTEGER))
      throw new Error(`element bigger than MAX_SAFE_INTEGER=${e}`);
    return Number(e);
  },
  decode: (e) => {
    if (!dn(e))
      throw new Error("element is not a safe integer");
    return BigInt(e);
  }
};
function Cv(e) {
  if (!Js(e))
    throw new Error("plain object expected");
  return {
    encode: (t) => {
      if (!dn(t) || !(t in e))
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
function Lv(e, t = !1) {
  if (!dn(e))
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
function _v(e) {
  if (!Array.isArray(e))
    throw new Error(`expected array, got ${typeof e}`);
  for (const t of e)
    if (!Ic(t))
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
const tb = (e) => {
  if (!Ic(e))
    throw new Error("BaseCoder expected");
  return { encode: e.decode, decode: e.encode };
}, Oc = { dict: Uv, numberBigint: Pv, tsEnum: Cv, decimal: Lv, match: _v, reverse: tb }, Kf = (e, t = !1, n = !1, r = !0) => {
  if (!dn(e))
    throw new Error(`bigint/size: wrong value ${e}`);
  if (typeof t != "boolean")
    throw new Error(`bigint/le: expected boolean, got ${typeof t}`);
  if (typeof n != "boolean")
    throw new Error(`bigint/signed: expected boolean, got ${typeof n}`);
  if (typeof r != "boolean")
    throw new Error(`bigint/sized: expected boolean, got ${typeof r}`);
  const i = BigInt(e), s = 2n ** (8n * i - 1n);
  return se({
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
      const a = o.bytes(r ? e : Math.min(e, o.leftBytes)), c = t ? a : $l(a);
      let u = 0n;
      for (let l = 0; l < c.length; l++)
        u |= BigInt(c[l]) << 8n * BigInt(l);
      return n && u & s && (u = (u ^ s) - s), u;
    },
    validate: (o) => {
      if (typeof o != "bigint")
        throw new Error(`bigint: invalid value: ${o}`);
      return Rv(o, 8n * i, !!n), o;
    }
  });
}, eb = /* @__PURE__ */ Kf(32, !1), Fo = /* @__PURE__ */ Kf(8, !0), Dv = /* @__PURE__ */ Kf(8, !0, !0), Vv = (e, t) => se({
  size: e,
  encodeStream: (n, r) => n.writeView(e, (i) => t.write(i, r)),
  decodeStream: (n) => n.readView(e, t.read),
  validate: (n) => {
    if (typeof n != "number")
      throw new Error(`viewCoder: expected number, got ${typeof n}`);
    return t.validate && t.validate(n), n;
  }
}), to = (e, t, n) => {
  const r = e * 8, i = 2 ** (r - 1), s = (c) => {
    if (!dn(c))
      throw new Error(`sintView: value is not safe integer: ${c}`);
    if (c < -i || c >= i)
      throw new Error(`sintView: value out of bounds. Expected ${-i} <= ${c} < ${i}`);
  }, o = 2 ** r, a = (c) => {
    if (!dn(c))
      throw new Error(`uintView: value is not safe integer: ${c}`);
    if (0 > c || c >= o)
      throw new Error(`uintView: value out of bounds. Expected 0 <= ${c} < ${o}`);
  };
  return Vv(e, {
    write: n.write,
    read: n.read,
    validate: t ? s : a
  });
}, ut = /* @__PURE__ */ to(4, !1, {
  read: (e, t) => e.getUint32(t, !0),
  write: (e, t) => e.setUint32(0, t, !0)
}), Mv = /* @__PURE__ */ to(4, !1, {
  read: (e, t) => e.getUint32(t, !1),
  write: (e, t) => e.setUint32(0, t, !1)
}), ci = /* @__PURE__ */ to(4, !0, {
  read: (e, t) => e.getInt32(t, !0),
  write: (e, t) => e.setInt32(0, t, !0)
}), pp = /* @__PURE__ */ to(2, !1, {
  read: (e, t) => e.getUint16(t, !0),
  write: (e, t) => e.setUint16(0, t, !0)
}), cr = /* @__PURE__ */ to(1, !1, {
  read: (e, t) => e.getUint8(t),
  write: (e, t) => e.setUint8(0, t)
}), mt = (e, t = !1) => {
  if (typeof t != "boolean")
    throw new Error(`bytes/le: expected boolean, got ${typeof t}`);
  const n = Qm(e), r = Se(e);
  return se({
    size: typeof e == "number" ? e : void 0,
    encodeStream: (i, s) => {
      r || n.encodeStream(i, s.length), i.bytes(t ? $l(s) : s), r && i.bytes(e);
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
      return t ? $l(s) : s;
    },
    validate: (i) => {
      if (!Se(i))
        throw new Error(`bytes: invalid value ${i}`);
      return i;
    }
  });
};
function Hv(e, t) {
  if (!He(t))
    throw new Error(`prefix: invalid inner value ${t}`);
  return br(mt(e), tb(t));
}
const zf = (e, t = !1) => ie(br(mt(e, t), Av), (n) => {
  if (typeof n != "string")
    throw new Error(`expected string, got ${typeof n}`);
  return n;
}), Fv = (e, t = { isLE: !1, with0x: !1 }) => {
  let n = br(mt(e, t.isLE), V);
  const r = t.with0x;
  if (typeof r != "boolean")
    throw new Error(`hex/with0x: expected boolean, got ${typeof r}`);
  return r && (n = br(n, {
    encode: (i) => `0x${i}`,
    decode: (i) => {
      if (!i.startsWith("0x"))
        throw new Error("hex(with0x=true).encode input should start with 0x");
      return i.slice(2);
    }
  })), n;
};
function br(e, t) {
  if (!He(e))
    throw new Error(`apply: invalid inner value ${e}`);
  if (!Ic(t))
    throw new Error(`apply: invalid base value ${e}`);
  return se({
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
const jv = (e, t = !1) => {
  if (!Se(e))
    throw new Error(`flag/flagValue: expected Uint8Array, got ${typeof e}`);
  if (typeof t != "boolean")
    throw new Error(`flag/xor: expected boolean, got ${typeof t}`);
  return se({
    size: e.length,
    encodeStream: (n, r) => {
      !!r !== t && n.bytes(e);
    },
    decodeStream: (n) => {
      let r = n.leftBytes >= e.length;
      return r && (r = Di(n.bytes(e.length, !0), e), r && n.bytes(e.length)), r !== t;
    },
    validate: (n) => {
      if (n !== void 0 && typeof n != "boolean")
        throw new Error(`flag: expected boolean value or undefined, got ${typeof n}`);
      return n;
    }
  });
};
function Kv(e, t, n) {
  if (!He(t))
    throw new Error(`flagged: invalid inner value ${t}`);
  return se({
    encodeStream: (r, i) => {
      On.resolve(r.stack, e) && t.encodeStream(r, i);
    },
    decodeStream: (r) => {
      let i = !1;
      if (i = !!On.resolve(r.stack, e), i)
        return t.decodeStream(r);
    }
  });
}
function Wf(e, t, n = !0) {
  if (!He(e))
    throw new Error(`magic: invalid inner value ${e}`);
  if (typeof n != "boolean")
    throw new Error(`magic: expected boolean, got ${typeof n}`);
  return se({
    size: e.size,
    encodeStream: (r, i) => e.encodeStream(r, t),
    decodeStream: (r) => {
      const i = e.decodeStream(r);
      if (n && typeof i != "object" && i !== t || Se(t) && !Di(t, i))
        throw r.err(`magic: invalid value: ${i} !== ${t}`);
    },
    validate: (r) => {
      if (r !== void 0)
        throw new Error(`magic: wrong value=${typeof r}`);
      return r;
    }
  });
}
function nb(e) {
  let t = 0;
  for (const n of e) {
    if (n.size === void 0)
      return;
    if (!dn(n.size))
      throw new Error(`sizeof: wrong element size=${t}`);
    t += n.size;
  }
  return t;
}
function Dt(e) {
  if (!Js(e))
    throw new Error(`struct: expected plain object, got ${e}`);
  for (const t in e)
    if (!He(e[t]))
      throw new Error(`struct: field ${t} is not CoderType`);
  return se({
    size: nb(Object.values(e)),
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
function zv(e) {
  if (!Array.isArray(e))
    throw new Error(`Packed.Tuple: got ${typeof e} instead of array`);
  for (let t = 0; t < e.length; t++)
    if (!He(e[t]))
      throw new Error(`tuple: field ${t} is not CoderType`);
  return se({
    size: nb(e),
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
function ee(e, t) {
  if (!He(t))
    throw new Error(`array: invalid inner value ${t}`);
  const n = Qm(typeof e == "string" ? `../${e}` : e);
  return se({
    size: typeof e == "number" && t.size ? e * t.size : void 0,
    encodeStream: (r, i) => {
      const s = r;
      s.pushObj(i, (o) => {
        Se(e) || n.encodeStream(r, i.length);
        for (let a = 0; a < i.length; a++)
          o(`${a}`, () => {
            const c = i[a], u = r.pos;
            if (t.encodeStream(r, c), Se(e)) {
              if (e.length > s.pos - u)
                return;
              const l = s.finish(!1).subarray(u, s.pos);
              if (Di(l.subarray(0, e.length), e))
                throw s.err(`array: inner element encoding same as separator. elm=${c} data=${l}`);
            }
          });
      }), Se(e) && r.bytes(e);
    },
    decodeStream: (r) => {
      const i = [];
      return r.pushObj(i, (s) => {
        if (e === null)
          for (let o = 0; !r.isEnd() && (s(`${o}`, () => i.push(t.decodeStream(r))), !(t.size && r.leftBytes < t.size)); o++)
            ;
        else if (Se(e))
          for (let o = 0; ; o++) {
            if (Di(r.bytes(e.length, !0), e)) {
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
const Yi = nr.Point, gp = Yi.Fn, rb = Yi.Fn.ORDER, qf = (e) => e % 2n === 0n, pt = Ff.isBytes, Jn = Ff.concatBytes, vt = Ff.equalBytes, ib = (e) => mv(Ft(e)), Fn = (...e) => Ft(Ft(Jn(...e))), sb = hn.getPublicKey, Wv = nr.getPublicKey, yp = (e) => e.r < rb / 2n;
function qv(e, t, n = !1) {
  let r = nr.Signature.fromBytes(nr.sign(e, t, { prehash: !1 }));
  if (n && !yp(r)) {
    const i = new Uint8Array(32);
    let s = 0;
    for (; !yp(r); )
      if (i.set(ut.encode(s++)), r = nr.Signature.fromBytes(nr.sign(e, t, { prehash: !1, extraEntropy: i })), s > 4294967295)
        throw new Error("lowR counter overflow: report the error");
  }
  return r.toBytes("der");
}
const wp = hn.sign, Gf = hn.utils.taggedHash, le = {
  ecdsa: 0,
  schnorr: 1
};
function Vi(e, t) {
  const n = e.length;
  if (t === le.ecdsa) {
    if (n === 32)
      throw new Error("Expected non-Schnorr key");
    return Yi.fromBytes(e), e;
  } else if (t === le.schnorr) {
    if (n !== 32)
      throw new Error("Expected 32-byte Schnorr key");
    return hn.utils.lift_x(Rn(e)), e;
  } else
    throw new Error("Unknown key type");
}
function ob(e, t) {
  const r = hn.utils.taggedHash("TapTweak", e, t), i = Rn(r);
  if (i >= rb)
    throw new Error("tweak higher than curve order");
  return i;
}
function Gv(e, t = Uint8Array.of()) {
  const n = hn.utils, r = Rn(e), i = Yi.BASE.multiply(r), s = qf(i.y) ? r : gp.neg(r), o = n.pointToBytes(i), a = ob(o, t);
  return Sc(gp.add(s, a), 32);
}
function kl(e, t) {
  const n = hn.utils, r = ob(e, t), s = n.lift_x(Rn(e)).add(Yi.BASE.multiply(r)), o = qf(s.y) ? 0 : 1;
  return [n.pointToBytes(s), o];
}
const Yf = Ft(Yi.BASE.toBytes(!1)), Mi = {
  bech32: "bc",
  pubKeyHash: 0,
  scriptHash: 5,
  wif: 128
}, xo = {
  bech32: "tb",
  pubKeyHash: 111,
  scriptHash: 196,
  wif: 239
};
function Va(e, t) {
  if (!pt(e) || !pt(t))
    throw new Error(`cmp: wrong type a=${typeof e} b=${typeof t}`);
  const n = Math.min(e.length, t.length);
  for (let r = 0; r < n; r++)
    if (e[r] != t[r])
      return Math.sign(e[r] - t[r]);
  return Math.sign(e.length - t.length);
}
function ab(e) {
  const t = {};
  for (const n in e) {
    if (t[e[n]] !== void 0)
      throw new Error("duplicate key");
    t[e[n]] = n;
  }
  return t;
}
const Nt = {
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
}, Yv = ab(Nt);
function Zf(e = 6, t = !1) {
  return se({
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
function Zv(e, t = 4, n = !0) {
  if (typeof e == "number")
    return e;
  if (pt(e))
    try {
      const r = Zf(t, n).decode(e);
      return r > Number.MAX_SAFE_INTEGER ? void 0 : Number(r);
    } catch {
      return;
    }
}
const tt = se({
  encodeStream: (e, t) => {
    for (let n of t) {
      if (typeof n == "string") {
        if (Nt[n] === void 0)
          throw new Error(`Unknown opcode=${n}`);
        e.byte(Nt[n]);
        continue;
      } else if (typeof n == "number") {
        if (n === 0) {
          e.byte(0);
          continue;
        } else if (1 <= n && n <= 16) {
          e.byte(Nt.OP_1 - 1 + n);
          continue;
        }
      }
      if (typeof n == "number" && (n = Zf().encode(BigInt(n))), !pt(n))
        throw new Error(`Wrong Script OP=${n} (${typeof n})`);
      const r = n.length;
      r < Nt.PUSHDATA1 ? e.byte(r) : r <= 255 ? (e.byte(Nt.PUSHDATA1), e.byte(r)) : r <= 65535 ? (e.byte(Nt.PUSHDATA2), e.bytes(pp.encode(r))) : (e.byte(Nt.PUSHDATA4), e.bytes(ut.encode(r))), e.bytes(n);
    }
  },
  decodeStream: (e) => {
    const t = [];
    for (; !e.isEnd(); ) {
      const n = e.byte();
      if (Nt.OP_0 < n && n <= Nt.PUSHDATA4) {
        let r;
        if (n < Nt.PUSHDATA1)
          r = n;
        else if (n === Nt.PUSHDATA1)
          r = cr.decodeStream(e);
        else if (n === Nt.PUSHDATA2)
          r = pp.decodeStream(e);
        else if (n === Nt.PUSHDATA4)
          r = ut.decodeStream(e);
        else
          throw new Error("Should be not possible");
        t.push(e.bytes(r));
      } else if (n === 0)
        t.push(0);
      else if (Nt.OP_1 <= n && n <= Nt.OP_16)
        t.push(n - (Nt.OP_1 - 1));
      else {
        const r = Yv[n];
        if (r === void 0)
          throw new Error(`Unknown opcode=${n.toString(16)}`);
        t.push(r);
      }
    }
    return t;
  }
}), mp = {
  253: [253, 2, 253n, 65535n],
  254: [254, 4, 65536n, 4294967295n],
  255: [255, 8, 4294967296n, 18446744073709551615n]
}, Bc = se({
  encodeStream: (e, t) => {
    if (typeof t == "number" && (t = BigInt(t)), 0n <= t && t <= 252n)
      return e.byte(Number(t));
    for (const [n, r, i, s] of Object.values(mp))
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
    const [n, r, i] = mp[t];
    let s = 0n;
    for (let o = 0; o < r; o++)
      s |= BigInt(e.byte()) << 8n * BigInt(o);
    if (s < i)
      throw e.err(`Wrong CompactSize(${8 * r})`);
    return s;
  }
}), Fe = br(Bc, Oc.numberBigint), Ue = mt(Bc), Vs = ee(Fe, Ue), Ma = (e) => ee(Bc, e), cb = Dt({
  txid: mt(32, !0),
  // hash(prev_tx),
  index: ut,
  // output number of previous tx
  finalScriptSig: Ue,
  // btc merges input and output script, executes it. If ok = tx passes
  sequence: ut
  // ?
}), Hr = Dt({ amount: Fo, script: Ue }), Xv = Dt({
  version: ci,
  segwitFlag: jv(new Uint8Array([0, 1])),
  inputs: Ma(cb),
  outputs: Ma(Hr),
  witnesses: Kv("segwitFlag", ee("inputs/length", Vs)),
  // < 500000000	Block number at which this transaction is unlocked
  // >= 500000000	UNIX timestamp at which this transaction is unlocked
  // Handled as part of PSBTv2
  lockTime: ut
});
function Qv(e) {
  if (e.segwitFlag && e.witnesses && !e.witnesses.length)
    throw new Error("Segwit flag with empty witnesses array");
  return e;
}
const mi = ie(Xv, Qv), ds = Dt({
  version: ci,
  inputs: Ma(cb),
  outputs: Ma(Hr),
  lockTime: ut
}), Al = ie(mt(null), (e) => Vi(e, le.ecdsa)), Ha = ie(mt(32), (e) => Vi(e, le.schnorr)), bp = ie(mt(null), (e) => {
  if (e.length !== 64 && e.length !== 65)
    throw new Error("Schnorr signature should be 64 or 65 bytes long");
  return e;
}), Nc = Dt({
  fingerprint: Mv,
  path: ee(null, ut)
}), ub = Dt({
  hashes: ee(Fe, mt(32)),
  der: Nc
}), Jv = mt(78), t$ = Dt({ pubKey: Ha, leafHash: mt(32) }), e$ = Dt({
  version: cr,
  // With parity :(
  internalKey: mt(32),
  merklePath: ee(null, mt(32))
}), on = ie(e$, (e) => {
  if (e.merklePath.length > 128)
    throw new Error("TaprootControlBlock: merklePath should be of length 0..128 (inclusive)");
  return e;
}), n$ = ee(null, Dt({
  depth: cr,
  version: cr,
  script: Ue
})), Tt = mt(null), Ep = mt(20), ss = mt(32), Xf = {
  unsignedTx: [0, !1, ds, [0], [0], !1],
  xpub: [1, Jv, Nc, [], [0, 2], !1],
  txVersion: [2, !1, ut, [2], [2], !1],
  fallbackLocktime: [3, !1, ut, [], [2], !1],
  inputCount: [4, !1, Fe, [2], [2], !1],
  outputCount: [5, !1, Fe, [2], [2], !1],
  txModifiable: [6, !1, cr, [], [2], !1],
  // TODO: bitfield
  version: [251, !1, ut, [], [0, 2], !1],
  proprietary: [252, Tt, Tt, [], [0, 2], !1]
}, Rc = {
  nonWitnessUtxo: [0, !1, mi, [], [0, 2], !1],
  witnessUtxo: [1, !1, Hr, [], [0, 2], !1],
  partialSig: [2, Al, Tt, [], [0, 2], !1],
  sighashType: [3, !1, ut, [], [0, 2], !1],
  redeemScript: [4, !1, Tt, [], [0, 2], !1],
  witnessScript: [5, !1, Tt, [], [0, 2], !1],
  bip32Derivation: [6, Al, Nc, [], [0, 2], !1],
  finalScriptSig: [7, !1, Tt, [], [0, 2], !1],
  finalScriptWitness: [8, !1, Vs, [], [0, 2], !1],
  porCommitment: [9, !1, Tt, [], [0, 2], !1],
  ripemd160: [10, Ep, Tt, [], [0, 2], !1],
  sha256: [11, ss, Tt, [], [0, 2], !1],
  hash160: [12, Ep, Tt, [], [0, 2], !1],
  hash256: [13, ss, Tt, [], [0, 2], !1],
  txid: [14, !1, ss, [2], [2], !0],
  index: [15, !1, ut, [2], [2], !0],
  sequence: [16, !1, ut, [], [2], !0],
  requiredTimeLocktime: [17, !1, ut, [], [2], !1],
  requiredHeightLocktime: [18, !1, ut, [], [2], !1],
  tapKeySig: [19, !1, bp, [], [0, 2], !1],
  tapScriptSig: [20, t$, bp, [], [0, 2], !1],
  tapLeafScript: [21, on, Tt, [], [0, 2], !1],
  tapBip32Derivation: [22, ss, ub, [], [0, 2], !1],
  tapInternalKey: [23, !1, Ha, [], [0, 2], !1],
  tapMerkleRoot: [24, !1, ss, [], [0, 2], !1],
  proprietary: [252, Tt, Tt, [], [0, 2], !1]
}, r$ = [
  "txid",
  "sequence",
  "index",
  "witnessUtxo",
  "nonWitnessUtxo",
  "finalScriptSig",
  "finalScriptWitness",
  "unknown"
], i$ = [
  "partialSig",
  "finalScriptSig",
  "finalScriptWitness",
  "tapKeySig",
  "tapScriptSig"
], Ms = {
  redeemScript: [0, !1, Tt, [], [0, 2], !1],
  witnessScript: [1, !1, Tt, [], [0, 2], !1],
  bip32Derivation: [2, Al, Nc, [], [0, 2], !1],
  amount: [3, !1, Dv, [2], [2], !0],
  script: [4, !1, Tt, [2], [2], !0],
  tapInternalKey: [5, !1, Ha, [], [0, 2], !1],
  tapTree: [6, !1, n$, [], [0, 2], !1],
  tapBip32Derivation: [7, Ha, ub, [], [0, 2], !1],
  proprietary: [252, Tt, Tt, [], [0, 2], !1]
}, s$ = [], xp = ee(Zm, Dt({
  //  <key> := <keylen> <keytype> <keydata> WHERE keylen = len(keytype)+len(keydata)
  key: Hv(Fe, Dt({ type: Fe, key: mt(null) })),
  //  <value> := <valuelen> <valuedata>
  value: mt(Fe)
}));
function Il(e) {
  const [t, n, r, i, s, o] = e;
  return { type: t, kc: n, vc: r, reqInc: i, allowInc: s, silentIgnore: o };
}
Dt({ type: Fe, key: mt(null) });
function Qf(e) {
  const t = {};
  for (const n in e) {
    const [r, i, s] = e[n];
    t[r] = [n, i, s];
  }
  return se({
    encodeStream: (n, r) => {
      let i = [];
      for (const s in e) {
        const o = r[s];
        if (o === void 0)
          continue;
        const [a, c, u] = e[s];
        if (!c)
          i.push({ key: { type: a, key: Et }, value: u.encode(o) });
        else {
          const l = o.map(([d, h]) => [
            c.encode(d),
            u.encode(h)
          ]);
          l.sort((d, h) => Va(d[0], h[0]));
          for (const [d, h] of l)
            i.push({ key: { key: d, type: a }, value: h });
        }
      }
      if (r.unknown) {
        r.unknown.sort((s, o) => Va(s[0].key, o[0].key));
        for (const [s, o] of r.unknown)
          i.push({ key: s, value: o });
      }
      xp.encodeStream(n, i);
    },
    decodeStream: (n) => {
      const r = xp.decodeStream(n), i = {}, s = {};
      for (const o of r) {
        let a = "unknown", c = o.key.key, u = o.value;
        if (t[o.key.type]) {
          const [l, d, h] = t[o.key.type];
          if (a = l, !d && c.length)
            throw new Error(`PSBT: Non-empty key for ${a} (key=${V.encode(c)} value=${V.encode(u)}`);
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
const Jf = ie(Qf(Rc), (e) => {
  if (e.finalScriptWitness && !e.finalScriptWitness.length)
    throw new Error("validateInput: empty finalScriptWitness");
  if (e.partialSig && !e.partialSig.length)
    throw new Error("Empty partialSig");
  if (e.partialSig)
    for (const [t] of e.partialSig)
      Vi(t, le.ecdsa);
  if (e.bip32Derivation)
    for (const [t] of e.bip32Derivation)
      Vi(t, le.ecdsa);
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
}), td = ie(Qf(Ms), (e) => {
  if (e.bip32Derivation)
    for (const [t] of e.bip32Derivation)
      Vi(t, le.ecdsa);
  return e;
}), lb = ie(Qf(Xf), (e) => {
  if ((e.version || 0) === 0) {
    if (!e.unsignedTx)
      throw new Error("PSBTv0: missing unsignedTx");
    for (const n of e.unsignedTx.inputs)
      if (n.finalScriptSig && n.finalScriptSig.length)
        throw new Error("PSBTv0: input scriptSig found in unsignedTx");
  }
  return e;
}), o$ = Dt({
  magic: Wf(zf(new Uint8Array([255])), "psbt"),
  global: lb,
  inputs: ee("global/unsignedTx/inputs/length", Jf),
  outputs: ee(null, td)
}), a$ = Dt({
  magic: Wf(zf(new Uint8Array([255])), "psbt"),
  global: lb,
  inputs: ee("global/inputCount", Jf),
  outputs: ee("global/outputCount", td)
});
Dt({
  magic: Wf(zf(new Uint8Array([255])), "psbt"),
  items: ee(null, br(ee(Zm, zv([Fv(Fe), mt(Bc)])), Oc.dict()))
});
function gu(e, t, n) {
  for (const r in n) {
    if (r === "unknown" || !t[r])
      continue;
    const { allowInc: i } = Il(t[r]);
    if (!i.includes(e))
      throw new Error(`PSBTv${e}: field ${r} is not allowed`);
  }
  for (const r in t) {
    const { reqInc: i } = Il(t[r]);
    if (i.includes(e) && n[r] === void 0)
      throw new Error(`PSBTv${e}: missing required field ${r}`);
  }
}
function Tp(e, t, n) {
  const r = {};
  for (const i in n) {
    const s = i;
    if (s !== "unknown") {
      if (!t[s])
        continue;
      const { allowInc: o, silentIgnore: a } = Il(t[s]);
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
function fb(e) {
  const t = e && e.global && e.global.version || 0;
  gu(t, Xf, e.global);
  for (const o of e.inputs)
    gu(t, Rc, o);
  for (const o of e.outputs)
    gu(t, Ms, o);
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
function Ol(e, t, n, r, i) {
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
        p = p.map((g) => {
          if (g.length !== 2)
            throw new Error(`keyMap(${o}): KV pairs should be [k, v][]`);
          return [
            typeof g[0] == "string" ? u.decode(V.decode(g[0])) : g[0],
            typeof g[1] == "string" ? l.decode(V.decode(g[1])) : g[1]
          ];
        });
        const y = {}, f = (g, m, S) => {
          if (y[g] === void 0) {
            y[g] = [m, S];
            return;
          }
          const v = V.encode(l.encode(y[g][1])), O = V.encode(l.encode(S));
          if (v !== O)
            throw new Error(`keyMap(${a}): same key=${g} oldVal=${v} newVal=${O}`);
        };
        for (const [g, m] of h) {
          const S = V.encode(u.encode(g));
          f(S, g, m);
        }
        for (const [g, m] of p) {
          const S = V.encode(u.encode(g));
          if (m === void 0) {
            if (d)
              throw new Error(`Cannot remove signed field=${a}/${g}`);
            delete y[S];
          } else
            f(S, g, m);
        }
        s[a] = Object.values(y);
      }
    } else if (typeof s[o] == "string")
      s[o] = l.decode(V.decode(s[o]));
    else if (d && o in t && n && n[o] !== void 0 && !vt(l.encode(t[o]), l.encode(n[o])))
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
const Sp = ie(o$, fb), vp = ie(a$, fb), c$ = {
  encode(e) {
    if (!(e.length !== 2 || e[0] !== 1 || !pt(e[1]) || V.encode(e[1]) !== "4e73"))
      return { type: "p2a", script: tt.encode(e) };
  },
  decode: (e) => {
    if (e.type === "p2a")
      return [1, V.decode("4e73")];
  }
};
function ui(e, t) {
  try {
    return Vi(e, t), !0;
  } catch {
    return !1;
  }
}
const u$ = {
  encode(e) {
    if (!(e.length !== 2 || !pt(e[0]) || !ui(e[0], le.ecdsa) || e[1] !== "CHECKSIG"))
      return { type: "pk", pubkey: e[0] };
  },
  decode: (e) => e.type === "pk" ? [e.pubkey, "CHECKSIG"] : void 0
}, l$ = {
  encode(e) {
    if (!(e.length !== 5 || e[0] !== "DUP" || e[1] !== "HASH160" || !pt(e[2])) && !(e[3] !== "EQUALVERIFY" || e[4] !== "CHECKSIG"))
      return { type: "pkh", hash: e[2] };
  },
  decode: (e) => e.type === "pkh" ? ["DUP", "HASH160", e.hash, "EQUALVERIFY", "CHECKSIG"] : void 0
}, f$ = {
  encode(e) {
    if (!(e.length !== 3 || e[0] !== "HASH160" || !pt(e[1]) || e[2] !== "EQUAL"))
      return { type: "sh", hash: e[1] };
  },
  decode: (e) => e.type === "sh" ? ["HASH160", e.hash, "EQUAL"] : void 0
}, d$ = {
  encode(e) {
    if (!(e.length !== 2 || e[0] !== 0 || !pt(e[1])) && e[1].length === 32)
      return { type: "wsh", hash: e[1] };
  },
  decode: (e) => e.type === "wsh" ? [0, e.hash] : void 0
}, h$ = {
  encode(e) {
    if (!(e.length !== 2 || e[0] !== 0 || !pt(e[1])) && e[1].length === 20)
      return { type: "wpkh", hash: e[1] };
  },
  decode: (e) => e.type === "wpkh" ? [0, e.hash] : void 0
}, p$ = {
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
        if (!pt(s))
          return;
      return { type: "ms", m: n, pubkeys: i };
    }
  },
  // checkmultisig(n, ..pubkeys, m)
  decode: (e) => e.type === "ms" ? [e.m, ...e.pubkeys, e.pubkeys.length, "CHECKMULTISIG"] : void 0
}, g$ = {
  encode(e) {
    if (!(e.length !== 2 || e[0] !== 1 || !pt(e[1])))
      return { type: "tr", pubkey: e[1] };
  },
  decode: (e) => e.type === "tr" ? [1, e.pubkey] : void 0
}, y$ = {
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
      if (!pt(i))
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
}, w$ = {
  encode(e) {
    const t = e.length - 1;
    if (e[t] !== "NUMEQUAL" || e[1] !== "CHECKSIG")
      return;
    const n = [], r = Zv(e[t - 1]);
    if (typeof r == "number") {
      for (let i = 0; i < t - 1; i++) {
        const s = e[i];
        if (i & 1) {
          if (s !== (i === 1 ? "CHECKSIG" : "CHECKSIGADD"))
            throw new Error("OutScript.encode/tr_ms: wrong element");
          continue;
        }
        if (!pt(s))
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
}, m$ = {
  encode(e) {
    return { type: "unknown", script: tt.encode(e) };
  },
  decode: (e) => e.type === "unknown" ? tt.decode(e.script) : void 0
}, b$ = [
  c$,
  u$,
  l$,
  f$,
  d$,
  h$,
  p$,
  g$,
  y$,
  w$,
  m$
], E$ = br(tt, Oc.match(b$)), It = ie(E$, (e) => {
  if (e.type === "pk" && !ui(e.pubkey, le.ecdsa))
    throw new Error("OutScript/pk: wrong key");
  if ((e.type === "pkh" || e.type === "sh" || e.type === "wpkh") && (!pt(e.hash) || e.hash.length !== 20))
    throw new Error(`OutScript/${e.type}: wrong hash`);
  if (e.type === "wsh" && (!pt(e.hash) || e.hash.length !== 32))
    throw new Error("OutScript/wsh: wrong hash");
  if (e.type === "tr" && (!pt(e.pubkey) || !ui(e.pubkey, le.schnorr)))
    throw new Error("OutScript/tr: wrong taproot public key");
  if ((e.type === "ms" || e.type === "tr_ns" || e.type === "tr_ms") && !Array.isArray(e.pubkeys))
    throw new Error("OutScript/multisig: wrong pubkeys array");
  if (e.type === "ms") {
    const t = e.pubkeys.length;
    for (const n of e.pubkeys)
      if (!ui(n, le.ecdsa))
        throw new Error("OutScript/multisig: wrong pubkey");
    if (e.m <= 0 || t > 16 || e.m > t)
      throw new Error("OutScript/multisig: invalid params");
  }
  if (e.type === "tr_ns" || e.type === "tr_ms") {
    for (const t of e.pubkeys)
      if (!ui(t, le.schnorr))
        throw new Error(`OutScript/${e.type}: wrong pubkey`);
  }
  if (e.type === "tr_ms") {
    const t = e.pubkeys.length;
    if (e.m <= 0 || t > 999 || e.m > t)
      throw new Error("OutScript/tr_ms: invalid params");
  }
  return e;
});
function $p(e, t) {
  if (!vt(e.hash, Ft(t)))
    throw new Error("checkScript: wsh wrong witnessScript hash");
  const n = It.decode(t);
  if (n.type === "tr" || n.type === "tr_ns" || n.type === "tr_ms")
    throw new Error(`checkScript: P2${n.type} cannot be wrapped in P2SH`);
  if (n.type === "wpkh" || n.type === "sh")
    throw new Error(`checkScript: P2${n.type} cannot be wrapped in P2WSH`);
}
function db(e, t, n) {
  if (e) {
    const r = It.decode(e);
    if (r.type === "tr_ns" || r.type === "tr_ms" || r.type === "ms" || r.type == "pk")
      throw new Error(`checkScript: non-wrapped ${r.type}`);
    if (r.type === "sh" && t) {
      if (!vt(r.hash, ib(t)))
        throw new Error("checkScript: sh wrong redeemScript hash");
      const i = It.decode(t);
      if (i.type === "tr" || i.type === "tr_ns" || i.type === "tr_ms")
        throw new Error(`checkScript: P2${i.type} cannot be wrapped in P2SH`);
      if (i.type === "sh")
        throw new Error("checkScript: P2SH cannot be wrapped in P2SH");
    }
    r.type === "wsh" && n && $p(r, n);
  }
  if (t) {
    const r = It.decode(t);
    r.type === "wsh" && n && $p(r, n);
  }
}
function x$(e) {
  const t = {};
  for (const n of e) {
    const r = V.encode(n);
    if (t[r])
      throw new Error(`Multisig: non-uniq pubkey: ${e.map(V.encode)}`);
    t[r] = !0;
  }
}
function T$(e, t, n = !1, r) {
  const i = It.decode(e);
  if (i.type === "unknown" && n)
    return;
  if (!["tr_ns", "tr_ms"].includes(i.type))
    throw new Error(`P2TR: invalid leaf script=${i.type}`);
  const s = i;
  if (!n && s.pubkeys)
    for (const o of s.pubkeys) {
      if (vt(o, Yf))
        throw new Error("Unspendable taproot key in leaf script");
      if (vt(o, t))
        throw new Error("Using P2TR with leaf script with same key as internal key is not supported");
    }
}
function hb(e) {
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
function Bl(e, t = []) {
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
    left: Bl(e.left, [e.right.hash, ...t]),
    right: Bl(e.right, [e.left.hash, ...t])
  };
}
function Nl(e) {
  if (!e)
    throw new Error("taprootAddPath: empty tree");
  if (e.type === "leaf")
    return [e];
  if (e.type !== "branch")
    throw new Error(`taprootWalkTree: wrong type=${e}`);
  return [...Nl(e.left), ...Nl(e.right)];
}
function Rl(e, t, n = !1, r) {
  if (!e)
    throw new Error("taprootHashTree: empty tree");
  if (Array.isArray(e) && e.length === 1 && (e = e[0]), !Array.isArray(e)) {
    const { leafVersion: c, script: u } = e;
    if (e.tapLeafScript || e.tapMerkleRoot && !vt(e.tapMerkleRoot, Et))
      throw new Error("P2TR: tapRoot leafScript cannot have tree");
    const l = typeof u == "string" ? V.decode(u) : u;
    if (!pt(l))
      throw new Error(`checkScript: wrong script type=${l}`);
    return T$(l, t, n), {
      type: "leaf",
      version: c,
      script: l,
      hash: vs(l, c)
    };
  }
  if (e.length !== 2 && (e = hb(e)), e.length !== 2)
    throw new Error("hashTree: non binary tree!");
  const i = Rl(e[0], t, n), s = Rl(e[1], t, n);
  let [o, a] = [i.hash, s.hash];
  return Va(a, o) === -1 && ([o, a] = [a, o]), { type: "branch", left: i, right: s, hash: Gf("TapBranch", o, a) };
}
const Hs = 192, vs = (e, t = Hs) => Gf("TapLeaf", new Uint8Array([t]), Ue.encode(e));
function S$(e, t, n = Mi, r = !1, i) {
  if (!e && !t)
    throw new Error("p2tr: should have pubKey or scriptTree (or both)");
  const s = typeof e == "string" ? V.decode(e) : e || Yf;
  if (!ui(s, le.schnorr))
    throw new Error("p2tr: non-schnorr pubkey");
  if (t) {
    let o = Bl(Rl(t, s, r));
    const a = o.hash, [c, u] = kl(s, a), l = Nl(o).map((d) => ({
      ...d,
      controlBlock: on.encode({
        version: (d.version || Hs) + u,
        internalKey: s,
        merklePath: d.path
      })
    }));
    return {
      type: "tr",
      script: It.encode({ type: "tr", pubkey: c }),
      address: Zr(n).encode({ type: "tr", pubkey: c }),
      // For tests
      tweakedPubkey: c,
      // PSBT stuff
      tapInternalKey: s,
      leaves: l,
      tapLeafScript: l.map((d) => [
        on.decode(d.controlBlock),
        Jn(d.script, new Uint8Array([d.version || Hs]))
      ]),
      tapMerkleRoot: a
    };
  } else {
    const o = kl(s, Et)[0];
    return {
      type: "tr",
      script: It.encode({ type: "tr", pubkey: o }),
      address: Zr(n).encode({ type: "tr", pubkey: o }),
      // For tests
      tweakedPubkey: o,
      // PSBT stuff
      tapInternalKey: s
    };
  }
}
function v$(e, t, n = !1) {
  return n || x$(t), {
    type: "tr_ms",
    script: It.encode({ type: "tr_ms", pubkeys: t, m: e })
  };
}
const pb = kv(Ft);
function gb(e, t) {
  if (t.length < 2 || t.length > 40)
    throw new Error("Witness: invalid length");
  if (e > 16)
    throw new Error("Witness: invalid version");
  if (e === 0 && !(t.length === 20 || t.length === 32))
    throw new Error("Witness: invalid length for version");
}
function yu(e, t, n = Mi) {
  gb(e, t);
  const r = e === 0 ? vl : ai;
  return r.encode(n.bech32, [e].concat(r.toWords(t)));
}
function kp(e, t) {
  return pb.encode(Jn(Uint8Array.from(t), e));
}
function Zr(e = Mi) {
  return {
    encode(t) {
      const { type: n } = t;
      if (n === "wpkh")
        return yu(0, t.hash, e);
      if (n === "wsh")
        return yu(0, t.hash, e);
      if (n === "tr")
        return yu(1, t.pubkey, e);
      if (n === "pkh")
        return kp(t.hash, [e.pubKeyHash]);
      if (n === "sh")
        return kp(t.hash, [e.scriptHash]);
      throw new Error(`Unknown address type=${n}`);
    },
    decode(t) {
      if (t.length < 14 || t.length > 74)
        throw new Error("Invalid address length");
      if (e.bech32 && t.toLowerCase().startsWith(`${e.bech32}1`)) {
        let r;
        try {
          if (r = vl.decode(t), r.words[0] !== 0)
            throw new Error(`bech32: wrong version=${r.words[0]}`);
        } catch {
          if (r = ai.decode(t), r.words[0] === 0)
            throw new Error(`bech32m: wrong version=${r.words[0]}`);
        }
        if (r.prefix !== e.bech32)
          throw new Error(`wrong bech32 prefix=${r.prefix}`);
        const [i, ...s] = r.words, o = vl.fromWords(s);
        if (gb(i, o), i === 0 && o.length === 32)
          return { type: "wsh", hash: o };
        if (i === 0 && o.length === 20)
          return { type: "wpkh", hash: o };
        if (i === 1 && o.length === 32)
          return { type: "tr", pubkey: o };
        throw new Error("Unknown witness program");
      }
      const n = pb.decode(t);
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
const To = new Uint8Array(32), $$ = {
  amount: 0xffffffffffffffffn,
  script: Et
}, k$ = (e) => Math.ceil(e / 4), A$ = 8, I$ = 2, Ar = 0, ed = 4294967295;
Oc.decimal(A$);
const $s = (e, t) => e === void 0 ? t : e;
function Fa(e) {
  if (Array.isArray(e))
    return e.map((t) => Fa(t));
  if (pt(e))
    return Uint8Array.from(e);
  if (["number", "bigint", "boolean", "string", "undefined"].includes(typeof e))
    return e;
  if (e === null)
    return e;
  if (typeof e == "object")
    return Object.fromEntries(Object.entries(e).map(([t, n]) => [t, Fa(n)]));
  throw new Error(`cloneDeep: unknown type=${e} (${typeof e})`);
}
const st = {
  DEFAULT: 0,
  ALL: 1,
  NONE: 2,
  SINGLE: 3,
  ANYONECANPAY: 128
}, Hi = {
  DEFAULT: st.DEFAULT,
  ALL: st.ALL,
  NONE: st.NONE,
  SINGLE: st.SINGLE,
  DEFAULT_ANYONECANPAY: st.DEFAULT | st.ANYONECANPAY,
  ALL_ANYONECANPAY: st.ALL | st.ANYONECANPAY,
  NONE_ANYONECANPAY: st.NONE | st.ANYONECANPAY,
  SINGLE_ANYONECANPAY: st.SINGLE | st.ANYONECANPAY
}, O$ = ab(Hi);
function B$(e, t, n, r = Et) {
  return vt(n, t) && (e = Gv(e, r), t = sb(e)), { privKey: e, pubKey: t };
}
function Ir(e) {
  if (e.script === void 0 || e.amount === void 0)
    throw new Error("Transaction/output: script and amount required");
  return { script: e.script, amount: e.amount };
}
function os(e) {
  if (e.txid === void 0 || e.index === void 0)
    throw new Error("Transaction/input: txid and index required");
  return {
    txid: e.txid,
    index: e.index,
    sequence: $s(e.sequence, ed),
    finalScriptSig: $s(e.finalScriptSig, Et)
  };
}
function wu(e) {
  for (const t in e) {
    const n = t;
    r$.includes(n) || delete e[n];
  }
}
const mu = Dt({ txid: mt(32, !0), index: ut });
function N$(e) {
  if (typeof e != "number" || typeof O$[e] != "string")
    throw new Error(`Invalid SigHash=${e}`);
  return e;
}
function Ap(e) {
  const t = e & 31;
  return {
    isAny: !!(e & st.ANYONECANPAY),
    isNone: t === st.NONE,
    isSingle: t === st.SINGLE
  };
}
function R$(e) {
  if (e !== void 0 && {}.toString.call(e) !== "[object Object]")
    throw new Error(`Wrong object type for transaction options: ${e}`);
  const t = {
    ...e,
    // Defaults
    version: $s(e.version, I$),
    lockTime: $s(e.lockTime, 0),
    PSBTVersion: $s(e.PSBTVersion, 0)
  };
  if (typeof t.allowUnknowInput < "u" && (e.allowUnknownInputs = t.allowUnknowInput), typeof t.allowUnknowOutput < "u" && (e.allowUnknownOutputs = t.allowUnknowOutput), typeof t.lockTime != "number")
    throw new Error("Transaction lock time should be number");
  if (ut.encode(t.lockTime), t.PSBTVersion !== 0 && t.PSBTVersion !== 2)
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
function Ip(e) {
  if (e.nonWitnessUtxo && e.index !== void 0) {
    const t = e.nonWitnessUtxo.outputs.length - 1;
    if (e.index > t)
      throw new Error(`validateInput: index(${e.index}) not in nonWitnessUtxo`);
    const n = e.nonWitnessUtxo.outputs[e.index];
    if (e.witnessUtxo && (!vt(e.witnessUtxo.script, n.script) || e.witnessUtxo.amount !== n.amount))
      throw new Error("validateInput: witnessUtxo different from nonWitnessUtxo");
    if (e.txid) {
      if (e.nonWitnessUtxo.outputs.length - 1 < e.index)
        throw new Error("nonWitnessUtxo: incorect output index");
      const i = Ce.fromRaw(mi.encode(e.nonWitnessUtxo), {
        allowUnknownOutputs: !0,
        disableScriptCheck: !0,
        allowUnknownInputs: !0
      }), s = V.encode(e.txid);
      if (i.isFinal && i.id !== s)
        throw new Error(`nonWitnessUtxo: wrong txid, exp=${s} got=${i.id}`);
    }
  }
  return e;
}
function jo(e) {
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
function Op(e, t, n, r = !1, i = !1) {
  let { nonWitnessUtxo: s, txid: o } = e;
  typeof s == "string" && (s = V.decode(s)), pt(s) && (s = mi.decode(s)), !("nonWitnessUtxo" in e) && s === void 0 && (s = t?.nonWitnessUtxo), typeof o == "string" && (o = V.decode(o)), o === void 0 && (o = t?.txid);
  let a = { ...t, ...e, nonWitnessUtxo: s, txid: o };
  !("nonWitnessUtxo" in e) && a.nonWitnessUtxo === void 0 && delete a.nonWitnessUtxo, a.sequence === void 0 && (a.sequence = ed), a.tapMerkleRoot === null && delete a.tapMerkleRoot, a = Ol(Rc, a, t, n, i), Jf.encode(a);
  let c;
  return a.nonWitnessUtxo && a.index !== void 0 ? c = a.nonWitnessUtxo.outputs[a.index] : a.witnessUtxo && (c = a.witnessUtxo), c && !r && db(c && c.script, a.redeemScript, a.witnessScript), a;
}
function Bp(e, t = !1) {
  let n = "legacy", r = st.ALL;
  const i = jo(e), s = It.decode(i.script);
  let o = s.type, a = s;
  const c = [s];
  if (s.type === "tr")
    return r = st.DEFAULT, {
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
      let h = It.decode(e.redeemScript);
      (h.type === "wpkh" || h.type === "wsh") && (n = "segwit"), c.push(h), a = h, o += `-${h.type}`;
    }
    if (a.type === "wsh") {
      if (!e.witnessScript)
        throw new Error("inputType: wsh without witnessScript");
      let h = It.decode(e.witnessScript);
      h.type === "wsh" && (n = "segwit"), c.push(h), a = h, o += `-${h.type}`;
    }
    const u = c[c.length - 1];
    if (u.type === "sh" || u.type === "wsh")
      throw new Error("inputType: sh/wsh cannot be terminal type");
    const l = It.encode(u), d = {
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
let Ce = class Ko {
  global = {};
  inputs = [];
  // use getInput()
  outputs = [];
  // use getOutput()
  opts;
  constructor(t = {}) {
    const n = this.opts = R$(t);
    n.lockTime !== Ar && (this.global.fallbackLocktime = n.lockTime), this.global.txVersion = n.version;
  }
  // Import
  static fromRaw(t, n = {}) {
    const r = mi.decode(t), i = new Ko({ ...n, version: r.version, lockTime: r.lockTime });
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
      r = Sp.decode(t);
    } catch (d) {
      try {
        r = vp.decode(t);
      } catch {
        throw d;
      }
    }
    const i = r.global.version || 0;
    if (i !== 0 && i !== 2)
      throw new Error(`Wrong PSBT version=${i}`);
    const s = r.global.unsignedTx, o = i === 0 ? s?.version : r.global.txVersion, a = i === 0 ? s?.lockTime : r.global.fallbackLocktime, c = new Ko({ ...n, version: o, lockTime: a, PSBTVersion: i }), u = i === 0 ? s?.inputs.length : r.global.inputCount;
    c.inputs = r.inputs.slice(0, u).map((d, h) => Ip({
      finalScriptSig: Et,
      ...r.global.unsignedTx?.inputs[h],
      ...d
    }));
    const l = i === 0 ? s?.outputs.length : r.global.outputCount;
    return c.outputs = r.outputs.slice(0, l).map((d, h) => ({
      ...d,
      ...r.global.unsignedTx?.outputs[h]
    })), c.global = { ...r.global, txVersion: o }, a !== Ar && (c.global.fallbackLocktime = a), c;
  }
  toPSBT(t = this.opts.PSBTVersion) {
    if (t !== 0 && t !== 2)
      throw new Error(`Wrong PSBT version=${t}`);
    const n = this.inputs.map((s) => Ip(Tp(t, Rc, s)));
    for (const s of n)
      s.partialSig && !s.partialSig.length && delete s.partialSig, s.finalScriptSig && !s.finalScriptSig.length && delete s.finalScriptSig, s.finalScriptWitness && !s.finalScriptWitness.length && delete s.finalScriptWitness;
    const r = this.outputs.map((s) => Tp(t, Ms, s)), i = { ...this.global };
    return t === 0 ? (i.unsignedTx = ds.decode(ds.encode({
      version: this.version,
      lockTime: this.lockTime,
      inputs: this.inputs.map(os).map((s) => ({
        ...s,
        finalScriptSig: Et
      })),
      outputs: this.outputs.map(Ir)
    })), delete i.fallbackLocktime, delete i.txVersion) : (i.version = t, i.txVersion = this.version, i.inputCount = this.inputs.length, i.outputCount = this.outputs.length, i.fallbackLocktime && i.fallbackLocktime === Ar && delete i.fallbackLocktime), this.opts.bip174jsCompat && (n.length || n.push({}), r.length || r.push({})), (t === 0 ? Sp : vp).encode({
      global: i,
      inputs: n,
      outputs: r
    });
  }
  // BIP370 lockTime (https://github.com/bitcoin/bips/blob/master/bip-0370.mediawiki#determining-lock-time)
  get lockTime() {
    let t = Ar, n = 0, r = Ar, i = 0;
    for (const s of this.inputs)
      s.requiredHeightLocktime && (t = Math.max(t, s.requiredHeightLocktime), n++), s.requiredTimeLocktime && (r = Math.max(r, s.requiredTimeLocktime), i++);
    return n && n >= i ? t : r !== Ar ? r : this.global.fallbackLocktime || Ar;
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
    const n = this.inputs[t].sighashType, r = n === void 0 ? st.DEFAULT : n, i = r === st.DEFAULT ? st.ALL : r & 3;
    return { sigInputs: r & st.ANYONECANPAY, sigOutputs: i };
  }
  // Very nice for debug purposes, but slow. If there is too much inputs/outputs to add, will be quadratic.
  // Some cache will be nice, but there chance to have bugs with cache invalidation
  signStatus() {
    let t = !0, n = !0, r = [], i = [];
    for (let s = 0; s < this.inputs.length; s++) {
      if (this.inputStatus(s) === "unsigned")
        continue;
      const { sigInputs: a, sigOutputs: c } = this.inputSighash(s);
      if (a === st.ANYONECANPAY ? r.push(s) : t = !1, c === st.ALL)
        n = !1;
      else if (c === st.SINGLE)
        i.push(s);
      else if (c !== st.NONE) throw new Error(`Wrong signature hash output type: ${c}`);
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
    const n = this.outputs.map(Ir);
    t += 4 * Fe.encode(this.outputs.length).length;
    for (const r of n)
      t += 32 + 4 * Ue.encode(r.script).length;
    this.hasWitnesses && (t += 2), t += 4 * Fe.encode(this.inputs.length).length;
    for (const r of this.inputs)
      t += 160 + 4 * Ue.encode(r.finalScriptSig || Et).length, this.hasWitnesses && r.finalScriptWitness && (t += Vs.encode(r.finalScriptWitness).length);
    return t;
  }
  get vsize() {
    return k$(this.weight);
  }
  toBytes(t = !1, n = !1) {
    return mi.encode({
      version: this.version,
      lockTime: this.lockTime,
      inputs: this.inputs.map(os).map((r) => ({
        ...r,
        finalScriptSig: t && r.finalScriptSig || Et
      })),
      outputs: this.outputs.map(Ir),
      witnesses: this.inputs.map((r) => r.finalScriptWitness || []),
      segwitFlag: n && this.hasWitnesses
    });
  }
  get unsignedTx() {
    return this.toBytes(!1, !1);
  }
  get hex() {
    return V.encode(this.toBytes(!0, this.hasWitnesses));
  }
  get hash() {
    return V.encode(Fn(this.toBytes(!0)));
  }
  get id() {
    return V.encode(Fn(this.toBytes(!0)).reverse());
  }
  // Input stuff
  checkInputIdx(t) {
    if (!Number.isSafeInteger(t) || 0 > t || t >= this.inputs.length)
      throw new Error(`Wrong input index=${t}`);
  }
  getInput(t) {
    return this.checkInputIdx(t), Fa(this.inputs[t]);
  }
  get inputsLength() {
    return this.inputs.length;
  }
  // Modification
  addInput(t, n = !1) {
    if (!n && !this.signStatus().addInput)
      throw new Error("Tx has signed inputs, cannot add new one");
    return this.inputs.push(Op(t, void 0, void 0, this.opts.disableScriptCheck)), this.inputs.length - 1;
  }
  updateInput(t, n, r = !1) {
    this.checkInputIdx(t);
    let i;
    if (!r) {
      const s = this.signStatus();
      (!s.addInput || s.inputs.includes(t)) && (i = i$);
    }
    this.inputs[t] = Op(n, this.inputs[t], i, this.opts.disableScriptCheck, this.opts.allowUnknown);
  }
  // Output stuff
  checkOutputIdx(t) {
    if (!Number.isSafeInteger(t) || 0 > t || t >= this.outputs.length)
      throw new Error(`Wrong output index=${t}`);
  }
  getOutput(t) {
    return this.checkOutputIdx(t), Fa(this.outputs[t]);
  }
  getOutputAddress(t, n = Mi) {
    const r = this.getOutput(t);
    if (r.script)
      return Zr(n).encode(It.decode(r.script));
  }
  get outputsLength() {
    return this.outputs.length;
  }
  normalizeOutput(t, n, r) {
    let { amount: i, script: s } = t;
    if (i === void 0 && (i = n?.amount), typeof i != "bigint")
      throw new Error(`Wrong amount type, should be of type bigint in sats, but got ${i} of type ${typeof i}`);
    typeof s == "string" && (s = V.decode(s)), s === void 0 && (s = n?.script);
    let o = { ...n, ...t, amount: i, script: s };
    if (o.amount === void 0 && delete o.amount, o = Ol(Ms, o, n, r, this.opts.allowUnknown), td.encode(o), o.script && !this.opts.allowUnknownOutputs && It.decode(o.script).type === "unknown")
      throw new Error("Transaction/output: unknown output script type, there is a chance that input is unspendable. Pass allowUnknownOutputs=true, if you sure");
    return this.opts.disableScriptCheck || db(o.script, o.redeemScript, o.witnessScript), o;
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
      (!s.addOutput || s.outputs.includes(t)) && (i = s$);
    }
    this.outputs[t] = this.normalizeOutput(n, this.outputs[t], i);
  }
  addOutputAddress(t, n, r = Mi) {
    return this.addOutput({ script: It.encode(Zr(r).decode(t)), amount: n });
  }
  // Utils
  get fee() {
    let t = 0n;
    for (const r of this.inputs) {
      const i = jo(r);
      if (!i)
        throw new Error("Empty input amount");
      t += i.amount;
    }
    const n = this.outputs.map(Ir);
    for (const r of n)
      t -= r.amount;
    return t;
  }
  // Signing
  // Based on https://github.com/bitcoin/bitcoin/blob/5871b5b5ab57a0caf9b7514eb162c491c83281d5/test/functional/test_framework/script.py#L624
  // There is optimization opportunity to re-use hashes for multiple inputs for witness v0/v1,
  // but we are trying to be less complicated for audit purpose for now.
  preimageLegacy(t, n, r) {
    const { isAny: i, isNone: s, isSingle: o } = Ap(r);
    if (t < 0 || !Number.isSafeInteger(t))
      throw new Error(`Invalid input idx=${t}`);
    if (o && t >= this.outputs.length || t >= this.inputs.length)
      return eb.encode(1n);
    n = tt.encode(tt.decode(n).filter((l) => l !== "CODESEPARATOR"));
    let a = this.inputs.map(os).map((l, d) => ({
      ...l,
      finalScriptSig: d === t ? n : Et
    }));
    i ? a = [a[t]] : (s || o) && (a = a.map((l, d) => ({
      ...l,
      sequence: d === t ? l.sequence : 0
    })));
    let c = this.outputs.map(Ir);
    s ? c = [] : o && (c = c.slice(0, t).fill($$).concat([c[t]]));
    const u = mi.encode({
      lockTime: this.lockTime,
      version: this.version,
      segwitFlag: !1,
      inputs: a,
      outputs: c
    });
    return Fn(u, ci.encode(r));
  }
  preimageWitnessV0(t, n, r, i) {
    const { isAny: s, isNone: o, isSingle: a } = Ap(r);
    let c = To, u = To, l = To;
    const d = this.inputs.map(os), h = this.outputs.map(Ir);
    s || (c = Fn(...d.map(mu.encode))), !s && !a && !o && (u = Fn(...d.map((y) => ut.encode(y.sequence)))), !a && !o ? l = Fn(...h.map(Hr.encode)) : a && t < h.length && (l = Fn(Hr.encode(h[t])));
    const p = d[t];
    return Fn(ci.encode(this.version), c, u, mt(32, !0).encode(p.txid), ut.encode(p.index), Ue.encode(n), Fo.encode(i), ut.encode(p.sequence), l, ut.encode(this.lockTime), ut.encode(r));
  }
  preimageWitnessV1(t, n, r, i, s = -1, o, a = 192, c) {
    if (!Array.isArray(i) || this.inputs.length !== i.length)
      throw new Error(`Invalid amounts array=${i}`);
    if (!Array.isArray(n) || this.inputs.length !== n.length)
      throw new Error(`Invalid prevOutScript array=${n}`);
    const u = [
      cr.encode(0),
      cr.encode(r),
      // U8 sigHash
      ci.encode(this.version),
      ut.encode(this.lockTime)
    ], l = r === st.DEFAULT ? st.ALL : r & 3, d = r & st.ANYONECANPAY, h = this.inputs.map(os), p = this.outputs.map(Ir);
    d !== st.ANYONECANPAY && u.push(...[
      h.map(mu.encode),
      i.map(Fo.encode),
      n.map(Ue.encode),
      h.map((f) => ut.encode(f.sequence))
    ].map((f) => Ft(Jn(...f)))), l === st.ALL && u.push(Ft(Jn(...p.map(Hr.encode))));
    const y = (c ? 1 : 0) | (o ? 2 : 0);
    if (u.push(new Uint8Array([y])), d === st.ANYONECANPAY) {
      const f = h[t];
      u.push(mu.encode(f), Fo.encode(i[t]), Ue.encode(n[t]), ut.encode(f.sequence));
    } else
      u.push(ut.encode(t));
    return y & 1 && u.push(Ft(Ue.encode(c || Et))), l === st.SINGLE && u.push(t < p.length ? Ft(Hr.encode(p[t])) : To), o && u.push(vs(o, a), cr.encode(0), ci.encode(s)), Gf("TapSighash", ...u);
  }
  // Signer can be privateKey OR instance of bip32 HD stuff
  signIdx(t, n, r, i) {
    this.checkInputIdx(n);
    const s = this.inputs[n], o = Bp(s, this.opts.allowLegacyWitnessUtxo);
    if (!pt(t)) {
      if (!s.bip32Derivation || !s.bip32Derivation.length)
        throw new Error("bip32Derivation: empty");
      const l = s.bip32Derivation.filter((h) => h[1].fingerprint == t.fingerprint).map(([h, { path: p }]) => {
        let y = t;
        for (const f of p)
          y = y.deriveChild(f);
        if (!vt(y.publicKey, h))
          throw new Error("bip32Derivation: wrong pubKey");
        if (!y.privateKey)
          throw new Error("bip32Derivation: no privateKey");
        return y;
      });
      if (!l.length)
        throw new Error(`bip32Derivation: no items with fingerprint=${t.fingerprint}`);
      let d = !1;
      for (const h of l)
        this.signIdx(h.privateKey, n) && (d = !0);
      return d;
    }
    r ? r.forEach(N$) : r = [o.defaultSighash];
    const a = o.sighash;
    if (!r.includes(a))
      throw new Error(`Input with not allowed sigHash=${a}. Allowed: ${r.join(", ")}`);
    const { sigOutputs: c } = this.inputSighash(n);
    if (c === st.SINGLE && n >= this.outputs.length)
      throw new Error(`Input with sighash SINGLE, but there is no output with corresponding index=${n}`);
    const u = jo(s);
    if (o.txType === "taproot") {
      const l = this.inputs.map(jo), d = l.map((g) => g.script), h = l.map((g) => g.amount);
      let p = !1, y = sb(t), f = s.tapMerkleRoot || Et;
      if (s.tapInternalKey) {
        const { pubKey: g, privKey: m } = B$(t, y, s.tapInternalKey, f), [S] = kl(s.tapInternalKey, f);
        if (vt(S, g)) {
          const v = this.preimageWitnessV1(n, d, a, h), O = Jn(wp(v, m, i), a !== st.DEFAULT ? new Uint8Array([a]) : Et);
          this.updateInput(n, { tapKeySig: O }, !0), p = !0;
        }
      }
      if (s.tapLeafScript) {
        s.tapScriptSig = s.tapScriptSig || [];
        for (const [g, m] of s.tapLeafScript) {
          const S = m.subarray(0, -1), v = tt.decode(S), O = m[m.length - 1], R = vs(S, O);
          if (v.findIndex((U) => pt(U) && vt(U, y)) === -1)
            continue;
          const b = this.preimageWitnessV1(n, d, a, h, void 0, S, O), W = Jn(wp(b, t, i), a !== st.DEFAULT ? new Uint8Array([a]) : Et);
          this.updateInput(n, { tapScriptSig: [[{ pubKey: y, leafHash: R }, W]] }, !0), p = !0;
        }
      }
      if (!p)
        throw new Error("No taproot scripts signed");
      return !0;
    } else {
      const l = Wv(t);
      let d = !1;
      const h = ib(l);
      for (const f of tt.decode(o.lastScript))
        pt(f) && (vt(f, l) || vt(f, h)) && (d = !0);
      if (!d)
        throw new Error(`Input script doesn't have pubKey: ${o.lastScript}`);
      let p;
      if (o.txType === "legacy")
        p = this.preimageLegacy(n, o.lastScript, a);
      else if (o.txType === "segwit") {
        let f = o.lastScript;
        o.last.type === "wpkh" && (f = It.encode({ type: "pkh", hash: o.last.hash })), p = this.preimageWitnessV0(n, f, a, u.amount);
      } else
        throw new Error(`Transaction/sign: unknown tx type: ${o.txType}`);
      const y = qv(p, t, this.opts.lowR);
      this.updateInput(n, {
        partialSig: [[l, Jn(y, new Uint8Array([a]))]]
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
    const n = this.inputs[t], r = Bp(n, this.opts.allowLegacyWitnessUtxo);
    if (r.txType === "taproot") {
      if (n.tapKeySig)
        n.finalScriptWitness = [n.tapKeySig];
      else if (n.tapLeafScript && n.tapScriptSig) {
        const c = n.tapLeafScript.sort((u, l) => on.encode(u[0]).length - on.encode(l[0]).length);
        for (const [u, l] of c) {
          const d = l.slice(0, -1), h = l[l.length - 1], p = It.decode(d), y = vs(d, h), f = n.tapScriptSig.filter((m) => vt(m[0].leafHash, y));
          let g = [];
          if (p.type === "tr_ms") {
            const m = p.m, S = p.pubkeys;
            let v = 0;
            for (const O of S) {
              const R = f.findIndex((j) => vt(j[0].pubKey, O));
              if (v === m || R === -1) {
                g.push(Et);
                continue;
              }
              g.push(f[R][1]), v++;
            }
            if (v !== m)
              continue;
          } else if (p.type === "tr_ns") {
            for (const m of p.pubkeys) {
              const S = f.findIndex((v) => vt(v[0].pubKey, m));
              S !== -1 && g.push(f[S][1]);
            }
            if (g.length !== p.pubkeys.length)
              continue;
          } else if (p.type === "unknown" && this.opts.allowUnknownInputs) {
            const m = tt.decode(d);
            if (g = f.map(([{ pubKey: S }, v]) => {
              const O = m.findIndex((R) => pt(R) && vt(R, S));
              if (O === -1)
                throw new Error("finalize/taproot: cannot find position of pubkey in script");
              return { signature: v, pos: O };
            }).sort((S, v) => S.pos - v.pos).map((S) => S.signature), !g.length)
              continue;
          } else {
            const m = this.opts.customScripts;
            if (m)
              for (const S of m) {
                if (!S.finalizeTaproot)
                  continue;
                const v = tt.decode(d), O = S.encode(v);
                if (O === void 0)
                  continue;
                const R = S.finalizeTaproot(d, O, f);
                if (R) {
                  n.finalScriptWitness = R.concat(on.encode(u)), n.finalScriptSig = Et, wu(n);
                  return;
                }
              }
            throw new Error("Finalize: Unknown tapLeafScript");
          }
          n.finalScriptWitness = g.reverse().concat([d, on.encode(u)]);
          break;
        }
        if (!n.finalScriptWitness)
          throw new Error("finalize/taproot: empty witness");
      } else
        throw new Error("finalize/taproot: unknown input");
      n.finalScriptSig = Et, wu(n);
      return;
    }
    if (!n.partialSig || !n.partialSig.length)
      throw new Error("Not enough partial sign");
    let i = Et, s = [];
    if (r.last.type === "ms") {
      const c = r.last.m, u = r.last.pubkeys;
      let l = [];
      for (const d of u) {
        const h = n.partialSig.find((p) => vt(d, p[0]));
        h && l.push(h[1]);
      }
      if (l = l.slice(0, c), l.length !== c)
        throw new Error(`Multisig: wrong signatures count, m=${c} n=${u.length} signatures=${l.length}`);
      i = tt.encode([0, ...l]);
    } else if (r.last.type === "pk")
      i = tt.encode([n.partialSig[0][1]]);
    else if (r.last.type === "pkh")
      i = tt.encode([n.partialSig[0][1], n.partialSig[0][0]]);
    else if (r.last.type === "wpkh")
      i = Et, s = [n.partialSig[0][1], n.partialSig[0][0]];
    else if (r.last.type === "unknown" && !this.opts.allowUnknownInputs)
      throw new Error("Unknown inputs not allowed");
    let o, a;
    if (r.type.includes("wsh-") && (i.length && r.lastScript.length && (s = tt.decode(i).map((c) => {
      if (c === 0)
        return Et;
      if (pt(c))
        return c;
      throw new Error(`Wrong witness op=${c}`);
    })), s = s.concat(r.lastScript)), r.txType === "segwit" && (a = s), r.type.startsWith("sh-wsh-") ? o = tt.encode([tt.encode([0, Ft(r.lastScript)])]) : r.type.startsWith("sh-") ? o = tt.encode([...tt.decode(i), r.lastScript]) : r.type.startsWith("wsh-") || r.txType !== "segwit" && (o = i), !o && !a)
      throw new Error("Unknown error finalizing input");
    o && (n.finalScriptSig = o), a && (n.finalScriptWitness = a), wu(n);
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
    const n = this.global.unsignedTx ? ds.encode(this.global.unsignedTx) : Et, r = t.global.unsignedTx ? ds.encode(t.global.unsignedTx) : Et;
    if (!vt(n, r))
      throw new Error("Transaction/combine: different unsigned tx");
    this.global = Ol(Xf, this.global, t.global, void 0, this.opts.allowUnknown);
    for (let i = 0; i < this.inputs.length; i++)
      this.updateInput(i, t.inputs[i], !0);
    for (let i = 0; i < this.outputs.length; i++)
      this.updateOutput(i, t.outputs[i], !0);
    return this;
  }
  clone() {
    return Ko.fromPSBT(this.toPSBT(this.opts.PSBTVersion), this.opts);
  }
};
class Er extends Ce {
  constructor(t) {
    super(bu(t));
  }
  static fromPSBT(t, n) {
    return Ce.fromPSBT(t, bu(n));
  }
  static fromRaw(t, n) {
    return Ce.fromRaw(t, bu(n));
  }
}
Er.ARK_TX_OPTS = {
  allowUnknown: !0,
  allowUnknownOutputs: !0,
  allowUnknownInputs: !0
};
function bu(e) {
  return { ...Er.ARK_TX_OPTS, ...e };
}
class U$ extends Error {
  idx;
  // Indice of participant
  constructor(t, n) {
    super(n), this.idx = t;
  }
}
const { taggedHash: yb } = hn.utils, Xr = nr.Point, Ee = Xr.Fn, xr = nr.lengths.publicKey, Ul = new Uint8Array(xr), Np = br(mt(33), {
  decode: (e) => wb(e) ? Ul : e.toBytes(!0),
  encode: (e) => Uf(e, Ul) ? Xr.ZERO : Xr.fromBytes(e)
}), Rp = ie(eb, (e) => (mm("n", e, 1n, Ee.ORDER), e));
Dt({ R1: Np, R2: Np });
Dt({ k1: Rp, k2: Rp, publicKey: mt(xr) });
function Fs(e, ...t) {
  if (!Array.isArray(e))
    throw new Error("expected array");
  e.forEach((n) => at(n, ...t));
}
const P$ = (e, ...t) => Ee.create(Ee.fromBytes(yb(e, ...t), !0));
function C$(e) {
  return Xr.BASE.multiply(e);
}
function wb(e) {
  return e.equals(Xr.ZERO);
}
function L$(e) {
  return Fs(e, xr), e.sort(Va);
}
function _$(e) {
  Fs(e, xr);
  for (let t = 1; t < e.length; t++)
    if (!Uf(e[t], e[0]))
      return e[t];
  return Ul;
}
function D$(e) {
  return Fs(e, xr), yb("KeyAgg list", ...e);
}
function V$(e, t, n) {
  return at(e, xr), at(t, xr), Uf(e, t) ? 1n : P$("KeyAgg coefficient", n, e);
}
function Up(e, t = [], n = []) {
  if (Fs(e, xr), Fs(t, 32), t.length !== n.length)
    throw new Error("The tweaks and isXonly arrays must have the same length");
  const r = _$(e), i = D$(e);
  let s = Xr.ZERO;
  for (let c = 0; c < e.length; c++) {
    let u;
    try {
      u = Xr.fromBytes(e[c]);
    } catch {
      throw new U$(c, "pubkey");
    }
    s = s.add(u.multiply(V$(e[c], r, i)));
  }
  let o = Ee.ONE, a = Ee.ZERO;
  for (let c = 0; c < t.length; c++) {
    const u = n[c] && !qf(s.y) ? Ee.neg(Ee.ONE) : Ee.ONE, l = Ee.fromBytes(t[c]);
    if (s = s.multiply(u).add(C$(l)), wb(s))
      throw new Error("The result of tweaking cannot be infinity");
    o = Ee.mul(u, o), a = Ee.add(l, Ee.mul(u, a));
  }
  return { aggPublicKey: s, gAcc: o, tweakAcc: a };
}
function M$(e, t, n = {}) {
  e = L$(e);
  const { aggPublicKey: r } = Up(e);
  if (!n.taprootTweak)
    return {
      preTweakedKey: r.toBytes(!0),
      finalKey: r.toBytes(!0)
    };
  const i = hn.utils.taggedHash("TapTweak", r.toBytes(!0).subarray(1), n.taprootTweak ?? new Uint8Array(0)), { aggPublicKey: s } = Up(e, [i], [!0]);
  return {
    preTweakedKey: r.toBytes(!0),
    finalKey: s.toBytes(!0)
  };
}
var Eu, Pp;
function H$() {
  if (Pp) return Eu;
  Pp = 1;
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
  return Eu = { decode: c, encode: u }, Eu;
}
var Pl = H$(), pe;
(function(e) {
  e.VtxoTaprootTree = "taptree", e.VtxoTreeExpiry = "expiry", e.Cosigner = "cosigner", e.ConditionWitness = "condition";
})(pe || (pe = {}));
const nd = 222;
function F$(e, t, n, r) {
  e.updateInput(t, {
    unknown: [
      ...e.getInput(t)?.unknown ?? [],
      n.encode(r)
    ]
  });
}
function j$(e, t, n) {
  const r = e.getInput(t)?.unknown ?? [], i = [];
  for (const s of r) {
    const o = n.decode(s);
    o && i.push(o);
  }
  return i;
}
const mb = {
  key: pe.VtxoTaprootTree,
  encode: (e) => [
    {
      type: nd,
      key: Uc[pe.VtxoTaprootTree]
    },
    e
  ],
  decode: (e) => rd(() => id(e[0], pe.VtxoTaprootTree) ? e[1] : null)
}, K$ = {
  key: pe.ConditionWitness,
  encode: (e) => [
    {
      type: nd,
      key: Uc[pe.ConditionWitness]
    },
    Vs.encode(e)
  ],
  decode: (e) => rd(() => id(e[0], pe.ConditionWitness) ? Vs.decode(e[1]) : null)
}, z$ = {
  key: pe.Cosigner,
  encode: (e) => [
    {
      type: nd,
      key: new Uint8Array([
        ...Uc[pe.Cosigner],
        e.index
      ])
    },
    e.key
  ],
  decode: (e) => rd(() => id(e[0], pe.Cosigner) ? {
    index: e[0].key[e[0].key.length - 1],
    key: e[1]
  } : null)
};
pe.VtxoTreeExpiry;
const Uc = Object.fromEntries(Object.values(pe).map((e) => [
  e,
  new TextEncoder().encode(e)
])), rd = (e) => {
  try {
    return e();
  } catch {
    return null;
  }
};
function id(e, t) {
  const n = V.encode(Uc[t]);
  return V.encode(new Uint8Array([e.type, ...e.key])).includes(n);
}
Object.values(Hi).filter((e) => typeof e == "number");
class jr {
  constructor(t, n, r, i = 0) {
    if (this.serverPubKey = t, this.vtxoTaprootKey = n, this.hrp = r, this.version = i, t.length !== 32)
      throw new Error("Invalid server public key length, expected 32 bytes, got " + t.length);
    if (n.length !== 32)
      throw new Error("Invalid vtxo taproot public key length, expected 32 bytes, got " + n.length);
  }
  static decode(t) {
    const n = ai.decodeUnsafe(t, 1023);
    if (!n)
      throw new Error("Invalid address");
    const r = new Uint8Array(ai.fromWords(n.words));
    if (r.length !== 65)
      throw new Error("Invalid data length, expected 65 bytes, got " + r.length);
    const i = r[0], s = r.slice(1, 33), o = r.slice(33, 65);
    return new jr(s, o, n.prefix, i);
  }
  encode() {
    const t = new Uint8Array(65);
    t[0] = this.version, t.set(this.serverPubKey, 1), t.set(this.vtxoTaprootKey, 33);
    const n = ai.toWords(t);
    return ai.encode(this.hrp, n, 1023);
  }
  // pkScript is the script that should be used to send non-dust funds to the address
  get pkScript() {
    return tt.encode(["OP_1", this.vtxoTaprootKey]);
  }
  // subdustPkScript is the script that should be used to send sub-dust funds to the address
  get subdustPkScript() {
    return tt.encode(["RETURN", this.vtxoTaprootKey]);
  }
}
const ja = Zf(void 0, !0);
var Ot;
(function(e) {
  e.Multisig = "multisig", e.CSVMultisig = "csv-multisig", e.ConditionCSVMultisig = "condition-csv-multisig", e.ConditionMultisig = "condition-multisig", e.CLTVMultisig = "cltv-multisig";
})(Ot || (Ot = {}));
function bb(e) {
  const t = [
    ze,
    ge,
    js,
    Ka,
    Fi
  ];
  for (const n of t)
    try {
      return n.decode(e);
    } catch {
      continue;
    }
  throw new Error(`Failed to decode: script ${V.encode(e)} is not a valid tapscript`);
}
var ze;
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
        type: Ot.Multisig,
        params: a,
        script: v$(a.pubkeys.length, a.pubkeys).script
      };
    const c = [];
    for (let u = 0; u < a.pubkeys.length; u++)
      c.push(a.pubkeys[u]), u < a.pubkeys.length - 1 ? c.push("CHECKSIGVERIFY") : c.push("CHECKSIG");
    return {
      type: Ot.Multisig,
      params: a,
      script: tt.encode(c)
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
    const c = tt.decode(a), u = [];
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
    if (V.encode(d.script) !== V.encode(a))
      throw new Error("Invalid script format: script reconstruction mismatch");
    return {
      type: Ot.Multisig,
      params: { pubkeys: u, type: t.CHECKSIGADD },
      script: a
    };
  }
  function s(a) {
    const c = tt.decode(a), u = [];
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
    if (V.encode(l.script) !== V.encode(a))
      throw new Error("Invalid script format: script reconstruction mismatch");
    return {
      type: Ot.Multisig,
      params: { pubkeys: u, type: t.CHECKSIG },
      script: a
    };
  }
  function o(a) {
    return a.type === Ot.Multisig;
  }
  e.is = o;
})(ze || (ze = {}));
var ge;
(function(e) {
  function t(i) {
    for (const u of i.pubkeys)
      if (u.length !== 32)
        throw new Error(`Invalid pubkey length: expected 32, got ${u.length}`);
    const s = ja.encode(BigInt(Pl.encode(i.timelock.type === "blocks" ? { blocks: Number(i.timelock.value) } : { seconds: Number(i.timelock.value) }))), o = [
      s.length === 1 ? s[0] : s,
      "CHECKSEQUENCEVERIFY",
      "DROP"
    ], a = ze.encode(i), c = new Uint8Array([
      ...tt.encode(o),
      ...a.script
    ]);
    return {
      type: Ot.CSVMultisig,
      params: i,
      script: c
    };
  }
  e.encode = t;
  function n(i) {
    if (i.length === 0)
      throw new Error("Failed to decode: script is empty");
    const s = tt.decode(i);
    if (s.length < 3)
      throw new Error("Invalid script: too short (expected at least 3)");
    const o = s[0];
    if (typeof o == "string")
      throw new Error("Invalid script: expected sequence number");
    if (s[1] !== "CHECKSEQUENCEVERIFY" || s[2] !== "DROP")
      throw new Error("Invalid script: expected CHECKSEQUENCEVERIFY DROP");
    const a = new Uint8Array(tt.encode(s.slice(3)));
    let c;
    try {
      c = ze.decode(a);
    } catch (p) {
      throw new Error(`Invalid multisig script: ${p instanceof Error ? p.message : String(p)}`);
    }
    let u;
    typeof o == "number" ? u = o : u = Number(ja.decode(o));
    const l = Pl.decode(u), d = l.blocks !== void 0 ? { type: "blocks", value: BigInt(l.blocks) } : { type: "seconds", value: BigInt(l.seconds) }, h = t({
      timelock: d,
      ...c.params
    });
    if (V.encode(h.script) !== V.encode(i))
      throw new Error("Invalid script format: script reconstruction mismatch");
    return {
      type: Ot.CSVMultisig,
      params: {
        timelock: d,
        ...c.params
      },
      script: i
    };
  }
  e.decode = n;
  function r(i) {
    return i.type === Ot.CSVMultisig;
  }
  e.is = r;
})(ge || (ge = {}));
var js;
(function(e) {
  function t(i) {
    const s = new Uint8Array([
      ...i.conditionScript,
      ...tt.encode(["VERIFY"]),
      ...ge.encode(i).script
    ]);
    return {
      type: Ot.ConditionCSVMultisig,
      params: i,
      script: s
    };
  }
  e.encode = t;
  function n(i) {
    if (i.length === 0)
      throw new Error("Failed to decode: script is empty");
    const s = tt.decode(i);
    if (s.length < 1)
      throw new Error("Invalid script: too short (expected at least 1)");
    let o = -1;
    for (let d = s.length - 1; d >= 0; d--)
      s[d] === "VERIFY" && (o = d);
    if (o === -1)
      throw new Error("Invalid script: missing VERIFY operation");
    const a = new Uint8Array(tt.encode(s.slice(0, o))), c = new Uint8Array(tt.encode(s.slice(o + 1)));
    let u;
    try {
      u = ge.decode(c);
    } catch (d) {
      throw new Error(`Invalid CSV multisig script: ${d instanceof Error ? d.message : String(d)}`);
    }
    const l = t({
      conditionScript: a,
      ...u.params
    });
    if (V.encode(l.script) !== V.encode(i))
      throw new Error("Invalid script format: script reconstruction mismatch");
    return {
      type: Ot.ConditionCSVMultisig,
      params: {
        conditionScript: a,
        ...u.params
      },
      script: i
    };
  }
  e.decode = n;
  function r(i) {
    return i.type === Ot.ConditionCSVMultisig;
  }
  e.is = r;
})(js || (js = {}));
var Ka;
(function(e) {
  function t(i) {
    const s = new Uint8Array([
      ...i.conditionScript,
      ...tt.encode(["VERIFY"]),
      ...ze.encode(i).script
    ]);
    return {
      type: Ot.ConditionMultisig,
      params: i,
      script: s
    };
  }
  e.encode = t;
  function n(i) {
    if (i.length === 0)
      throw new Error("Failed to decode: script is empty");
    const s = tt.decode(i);
    if (s.length < 1)
      throw new Error("Invalid script: too short (expected at least 1)");
    let o = -1;
    for (let d = s.length - 1; d >= 0; d--)
      s[d] === "VERIFY" && (o = d);
    if (o === -1)
      throw new Error("Invalid script: missing VERIFY operation");
    const a = new Uint8Array(tt.encode(s.slice(0, o))), c = new Uint8Array(tt.encode(s.slice(o + 1)));
    let u;
    try {
      u = ze.decode(c);
    } catch (d) {
      throw new Error(`Invalid multisig script: ${d instanceof Error ? d.message : String(d)}`);
    }
    const l = t({
      conditionScript: a,
      ...u.params
    });
    if (V.encode(l.script) !== V.encode(i))
      throw new Error("Invalid script format: script reconstruction mismatch");
    return {
      type: Ot.ConditionMultisig,
      params: {
        conditionScript: a,
        ...u.params
      },
      script: i
    };
  }
  e.decode = n;
  function r(i) {
    return i.type === Ot.ConditionMultisig;
  }
  e.is = r;
})(Ka || (Ka = {}));
var Fi;
(function(e) {
  function t(i) {
    const s = ja.encode(i.absoluteTimelock), o = [
      s.length === 1 ? s[0] : s,
      "CHECKLOCKTIMEVERIFY",
      "DROP"
    ], a = tt.encode(o), c = new Uint8Array([
      ...a,
      ...ze.encode(i).script
    ]);
    return {
      type: Ot.CLTVMultisig,
      params: i,
      script: c
    };
  }
  e.encode = t;
  function n(i) {
    if (i.length === 0)
      throw new Error("Failed to decode: script is empty");
    const s = tt.decode(i);
    if (s.length < 3)
      throw new Error("Invalid script: too short (expected at least 3)");
    const o = s[0];
    if (typeof o == "string" || typeof o == "number")
      throw new Error("Invalid script: expected locktime number");
    if (s[1] !== "CHECKLOCKTIMEVERIFY" || s[2] !== "DROP")
      throw new Error("Invalid script: expected CHECKLOCKTIMEVERIFY DROP");
    const a = new Uint8Array(tt.encode(s.slice(3)));
    let c;
    try {
      c = ze.decode(a);
    } catch (d) {
      throw new Error(`Invalid multisig script: ${d instanceof Error ? d.message : String(d)}`);
    }
    const u = ja.decode(o), l = t({
      absoluteTimelock: u,
      ...c.params
    });
    if (V.encode(l.script) !== V.encode(i))
      throw new Error("Invalid script format: script reconstruction mismatch");
    return {
      type: Ot.CLTVMultisig,
      params: {
        absoluteTimelock: u,
        ...c.params
      },
      script: i
    };
  }
  e.decode = n;
  function r(i) {
    return i.type === Ot.CLTVMultisig;
  }
  e.is = r;
})(Fi || (Fi = {}));
const Cp = Ms.tapTree[2];
function ks(e) {
  return e[1].subarray(0, e[1].length - 1);
}
class ve {
  static decode(t) {
    const r = Cp.decode(t).map((i) => i.script);
    return new ve(r);
  }
  constructor(t) {
    this.scripts = t;
    const n = t.length % 2 !== 0 ? t.slice().reverse() : t, r = hb(n.map((s) => ({
      script: s,
      leafVersion: Hs
    }))), i = S$(Yf, r, void 0, !0);
    if (!i.tapLeafScript || i.tapLeafScript.length !== t.length)
      throw new Error("invalid scripts");
    this.leaves = i.tapLeafScript, this.tweakedPublicKey = i.tweakedPubkey;
  }
  encode() {
    return Cp.encode(this.scripts.map((n) => ({
      depth: 1,
      version: Hs,
      script: n
    })));
  }
  address(t, n) {
    return new jr(n, this.tweakedPublicKey, t);
  }
  get pkScript() {
    return tt.encode(["OP_1", this.tweakedPublicKey]);
  }
  onchainAddress(t) {
    return Zr(t).encode({
      type: "tr",
      pubkey: this.tweakedPublicKey
    });
  }
  findLeaf(t) {
    const n = this.leaves.find((r) => V.encode(ks(r)) === t);
    if (!n)
      throw new Error(`leaf '${t}' not found`);
    return n;
  }
  exitPaths() {
    const t = [];
    for (const n of this.leaves)
      try {
        const r = ge.decode(ks(n));
        t.push(r);
        continue;
      } catch {
        try {
          const i = js.decode(ks(n));
          t.push(i);
        } catch {
          continue;
        }
      }
    return t;
  }
}
var Lp;
(function(e) {
  class t extends ve {
    constructor(i) {
      n(i);
      const { sender: s, receiver: o, server: a, preimageHash: c, refundLocktime: u, unilateralClaimDelay: l, unilateralRefundDelay: d, unilateralRefundWithoutReceiverDelay: h } = i, p = W$(c), y = Ka.encode({
        conditionScript: p,
        pubkeys: [o, a]
      }).script, f = ze.encode({
        pubkeys: [s, o, a]
      }).script, g = Fi.encode({
        absoluteTimelock: u,
        pubkeys: [s, a]
      }).script, m = js.encode({
        conditionScript: p,
        timelock: l,
        pubkeys: [o]
      }).script, S = ge.encode({
        timelock: d,
        pubkeys: [s, o]
      }).script, v = ge.encode({
        timelock: h,
        pubkeys: [s]
      }).script;
      super([
        y,
        f,
        g,
        m,
        S,
        v
      ]), this.options = i, this.claimScript = V.encode(y), this.refundScript = V.encode(f), this.refundWithoutReceiverScript = V.encode(g), this.unilateralClaimScript = V.encode(m), this.unilateralRefundScript = V.encode(S), this.unilateralRefundWithoutReceiverScript = V.encode(v);
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
})(Lp || (Lp = {}));
function W$(e) {
  return tt.encode(["HASH160", e, "EQUAL"]);
}
var za;
(function(e) {
  class t extends ve {
    constructor(r) {
      const { pubKey: i, serverPubKey: s, csvTimelock: o = t.DEFAULT_TIMELOCK } = r, a = ze.encode({
        pubkeys: [i, s]
      }).script, c = ge.encode({
        timelock: o,
        pubkeys: [i]
      }).script;
      super([a, c]), this.options = r, this.forfeitScript = V.encode(a), this.exitScript = V.encode(c);
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
})(za || (za = {}));
var Sn;
(function(e) {
  e.TxSent = "SENT", e.TxReceived = "RECEIVED";
})(Sn || (Sn = {}));
function zo(e) {
  return !e.isSpent;
}
function Eb(e) {
  return e.virtualStatus.state === "swept" && zo(e);
}
function q$(e) {
  if (e.virtualStatus.state === "swept")
    return !0;
  const t = e.virtualStatus.batchExpiry;
  return !t || new Date(t).getFullYear() < 2025 ? !1 : t <= Date.now();
}
function G$(e, t) {
  return e.value < t;
}
async function* Cl(e) {
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
class xb extends Error {
  constructor(t, n, r, i) {
    super(n), this.code = t, this.message = n, this.name = r, this.metadata = i;
  }
}
function Y$(e) {
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
      return "metadata" in n && Z$(n.metadata) && (a = n.metadata), new xb(i, s, o, a);
    }
    return;
  } catch {
    return;
  }
}
function Z$(e) {
  return typeof e == "object" && e !== null && !Array.isArray(e);
}
var ur;
(function(e) {
  function t(i, s, o = []) {
    if (typeof i != "string" && (i = r(i)), s.length == 0)
      throw new Error("intent proof requires at least one input");
    nk(s), ik(o);
    const a = sk(i, s[0].witnessUtxo.script);
    return ok(a, s, o);
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
})(ur || (ur = {}));
const X$ = new Uint8Array([Nt.RETURN]), Q$ = new Uint8Array(32).fill(0), J$ = 4294967295, tk = "ark-intent-proof-message";
function ek(e) {
  if (e.index === void 0)
    throw new Error("intent proof input requires index");
  if (e.txid === void 0)
    throw new Error("intent proof input requires txid");
  if (e.witnessUtxo === void 0)
    throw new Error("intent proof input requires witness utxo");
  return !0;
}
function nk(e) {
  return e.forEach(ek), !0;
}
function rk(e) {
  if (e.amount === void 0)
    throw new Error("intent proof output requires amount");
  if (e.script === void 0)
    throw new Error("intent proof output requires script");
  return !0;
}
function ik(e) {
  return e.forEach(rk), !0;
}
function sk(e, t) {
  const n = ak(e), r = new Er({
    version: 0
  });
  return r.addInput({
    txid: Q$,
    // zero hash
    index: J$,
    sequence: 0
  }), r.addOutput({
    amount: 0n,
    script: t
  }), r.updateInput(0, {
    finalScriptSig: tt.encode(["OP_0", n])
  }), r;
}
function ok(e, t, n) {
  const r = t[0], i = t.map((o) => o.sequence || 0).reduce((o, a) => Math.max(o, a), 0), s = new Er({
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
    sighashType: Hi.ALL
  });
  for (const [o, a] of t.entries())
    s.addInput({
      ...a,
      sighashType: Hi.ALL
    }), a.unknown?.length && s.updateInput(o + 1, {
      unknown: a.unknown
    });
  n.length === 0 && (n = [
    {
      amount: 0n,
      script: X$
    }
  ]);
  for (const o of n)
    s.addOutput({
      amount: o.amount,
      script: o.script
    });
  return s;
}
function ak(e) {
  return hn.utils.taggedHash(tk, new TextEncoder().encode(e));
}
var Ct;
(function(e) {
  e.BatchStarted = "batch_started", e.BatchFinalization = "batch_finalization", e.BatchFinalized = "batch_finalized", e.BatchFailed = "batch_failed", e.TreeSigningStarted = "tree_signing_started", e.TreeNonces = "tree_nonces", e.TreeTx = "tree_tx", e.TreeSignature = "tree_signature";
})(Ct || (Ct = {}));
class ck {
  constructor(t) {
    this.serverUrl = t;
  }
  async getInfo() {
    const t = `${this.serverUrl}/v1/info`, n = await fetch(t);
    if (!n.ok) {
      const i = await n.text();
      Xe(i, `Failed to get server info: ${n.statusText}`);
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
      Xe(o, `Failed to submit virtual transaction: ${o}`);
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
      Xe(s, `Failed to finalize offchain transaction: ${s}`);
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
          message: ur.encodeMessage(t.message)
        }
      })
    });
    if (!r.ok) {
      const s = await r.text();
      Xe(s, `Failed to register intent: ${s}`);
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
          message: ur.encodeMessage(t.message)
        }
      })
    });
    if (!r.ok) {
      const i = await r.text();
      Xe(i, `Failed to delete intent: ${i}`);
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
      Xe(i, `Failed to confirm registration: ${i}`);
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
        treeNonces: uk(r)
      })
    });
    if (!s.ok) {
      const o = await s.text();
      Xe(o, `Failed to submit tree nonces: ${o}`);
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
        treeSignatures: lk(r)
      })
    });
    if (!s.ok) {
      const o = await s.text();
      Xe(o, `Failed to submit tree signatures: ${o}`);
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
      Xe(s, `Failed to submit forfeit transactions: ${i.statusText}`);
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
          for await (const a of Cl(s)) {
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
        if (Ll(s)) {
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
          for await (const s of Cl(r)) {
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
        if (Ll(r)) {
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
          message: ur.encodeMessage(t.message)
        }
      })
    });
    if (!r.ok) {
      const s = await r.text();
      Xe(s, `Failed to get pending transactions: ${s}`);
    }
    return (await r.json()).pendingTxs;
  }
  parseSettlementEvent(t) {
    if (t.batchStarted)
      return {
        type: Ct.BatchStarted,
        id: t.batchStarted.id,
        intentIdHashes: t.batchStarted.intentIdHashes,
        batchExpiry: BigInt(t.batchStarted.batchExpiry)
      };
    if (t.batchFinalization)
      return {
        type: Ct.BatchFinalization,
        id: t.batchFinalization.id,
        commitmentTx: t.batchFinalization.commitmentTx
      };
    if (t.batchFinalized)
      return {
        type: Ct.BatchFinalized,
        id: t.batchFinalized.id,
        commitmentTxid: t.batchFinalized.commitmentTxid
      };
    if (t.batchFailed)
      return {
        type: Ct.BatchFailed,
        id: t.batchFailed.id,
        reason: t.batchFailed.reason
      };
    if (t.treeSigningStarted)
      return {
        type: Ct.TreeSigningStarted,
        id: t.treeSigningStarted.id,
        cosignersPublicKeys: t.treeSigningStarted.cosignersPubkeys,
        unsignedCommitmentTx: t.treeSigningStarted.unsignedCommitmentTx
      };
    if (t.treeNoncesAggregated)
      return null;
    if (t.treeNonces)
      return {
        type: Ct.TreeNonces,
        id: t.treeNonces.id,
        topic: t.treeNonces.topic,
        txid: t.treeNonces.txid,
        nonces: fk(t.treeNonces.nonces)
        // pubkey -> public nonce
      };
    if (t.treeTx) {
      const n = Object.fromEntries(Object.entries(t.treeTx.children).map(([r, i]) => [parseInt(r), i]));
      return {
        type: Ct.TreeTx,
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
      type: Ct.TreeSignature,
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
        spentVtxos: t.commitmentTx.spentVtxos.map(So),
        spendableVtxos: t.commitmentTx.spendableVtxos.map(So),
        checkpointTxs: t.commitmentTx.checkpointTxs
      }
    } : t.arkTx ? {
      arkTx: {
        txid: t.arkTx.txid,
        tx: t.arkTx.tx,
        spentVtxos: t.arkTx.spentVtxos.map(So),
        spendableVtxos: t.arkTx.spendableVtxos.map(So),
        checkpointTxs: t.arkTx.checkpointTxs
      }
    } : (t.heartbeat || console.warn("Unknown transaction notification type:", t), null);
  }
}
function uk(e) {
  const t = {};
  for (const [n, r] of e)
    t[n] = V.encode(r.pubNonce);
  return t;
}
function lk(e) {
  const t = {};
  for (const [n, r] of e)
    t[n] = V.encode(r.encode());
  return t;
}
function fk(e) {
  return new Map(Object.entries(e).map(([t, n]) => {
    if (typeof n != "string")
      throw new Error("invalid nonce");
    return [t, { pubNonce: V.decode(n) }];
  }));
}
function Ll(e) {
  const t = (n) => n instanceof Error ? n.name === "TypeError" && n.message === "Failed to fetch" || n.name === "HeadersTimeoutError" || n.name === "BodyTimeoutError" || n.code === "UND_ERR_HEADERS_TIMEOUT" || n.code === "UND_ERR_BODY_TIMEOUT" : !1;
  return t(e) || t(e.cause);
}
function So(e) {
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
function Xe(e, t) {
  const n = new Error(e);
  throw Y$(n) ?? new Error(t);
}
class Wo {
  constructor(t, n = /* @__PURE__ */ new Map()) {
    this.root = t, this.children = n;
  }
  static create(t) {
    if (t.length === 0)
      throw new Error("empty chunks");
    const n = /* @__PURE__ */ new Map();
    for (const s of t) {
      const o = hk(s), a = o.tx.id;
      n.set(a, o);
    }
    const r = [];
    for (const [s] of n) {
      let o = !1;
      for (const [a, c] of n)
        if (a !== s && (o = dk(c, s), o))
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
    const i = Tb(r[0], n);
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
      if (!s.txid || V.encode(s.txid) !== o || s.index !== r)
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
function dk(e, t) {
  return Object.values(e.children).includes(t);
}
function Tb(e, t) {
  const n = t.get(e);
  if (!n)
    return null;
  const r = n.tx, i = /* @__PURE__ */ new Map();
  for (const [s, o] of Object.entries(n.children)) {
    const a = parseInt(s), c = Tb(o, t);
    c && i.set(a, c);
  }
  return new Wo(r, i);
}
function hk(e) {
  return { tx: Ce.fromPSBT(Mt.decode(e.tx)), children: e.children };
}
var _l;
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
    for await (const y of r) {
      if (o?.signal.aborted)
        throw new Error("canceled");
      switch (c && c(y).catch(() => {
      }), y.type) {
        case Ct.BatchStarted: {
          const f = y, { skip: g } = await i.onBatchStarted(f);
          g || (u = t.BatchStarted, a && (u = t.TreeNoncesAggregated));
          continue;
        }
        case Ct.BatchFinalized: {
          if (u !== t.BatchFinalization)
            continue;
          return i.onBatchFinalized && await i.onBatchFinalized(y), y.commitmentTxid;
        }
        case Ct.BatchFailed: {
          if (i.onBatchFailed) {
            await i.onBatchFailed(y);
            continue;
          }
          throw new Error(y.reason);
        }
        case Ct.TreeTx: {
          if (u !== t.BatchStarted && u !== t.TreeNoncesAggregated)
            continue;
          y.batchIndex === 0 ? l.push(y.chunk) : d.push(y.chunk), i.onTreeTxEvent && await i.onTreeTxEvent(y);
          continue;
        }
        case Ct.TreeSignature: {
          if (u !== t.TreeNoncesAggregated)
            continue;
          if (!h)
            throw new Error("vtxo tree not initialized");
          const f = V.decode(y.signature);
          h.update(y.txid, (g) => {
            g.updateInput(0, {
              tapKeySig: f
            });
          }), i.onTreeSignatureEvent && await i.onTreeSignatureEvent(y);
          continue;
        }
        case Ct.TreeSigningStarted: {
          if (u !== t.BatchStarted)
            continue;
          h = Wo.create(l);
          const { skip: f } = await i.onTreeSigningStarted(y, h);
          f || (u = t.TreeSigningStarted);
          continue;
        }
        case Ct.TreeNonces: {
          if (u !== t.TreeSigningStarted)
            continue;
          const { fullySigned: f } = await i.onTreeNonces(y);
          f && (u = t.TreeNoncesAggregated);
          continue;
        }
        case Ct.BatchFinalization: {
          if (u !== t.TreeNoncesAggregated)
            continue;
          if (!h && l.length > 0 && (h = Wo.create(l)), !h && !a)
            throw new Error("vtxo tree not initialized");
          d.length > 0 && (p = Wo.create(d)), await i.onBatchFinalization(y, h, p), u = t.BatchFinalization;
          continue;
        }
        default:
          continue;
      }
    }
    throw new Error("event stream closed");
  }
  e.join = n;
})(_l || (_l = {}));
const pk = (e) => gk[e], gk = {
  bitcoin: as(Mi, "ark"),
  testnet: as(xo, "tark"),
  signet: as(xo, "tark"),
  mutinynet: as(xo, "tark"),
  regtest: as({
    ...xo,
    bech32: "bcrt",
    pubKeyHash: 111,
    scriptHash: 196
  }, "tark")
};
function as(e, t) {
  return {
    ...e,
    hrp: t
  };
}
const yk = {
  bitcoin: "https://mempool.space/api",
  testnet: "https://mempool.space/testnet/api",
  signet: "https://mempool.space/signet/api",
  mutinynet: "https://mutinynet.com/api",
  regtest: "http://localhost:3000"
};
class wk {
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
          const p = (await c()).filter((y) => !d.has(l(y)));
          p.length > 0 && (p.forEach((y) => d.add(l(y))), n(p));
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
              d[h][p] && u.push(...d[h][p].filter(bk));
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
    if (!mk(n))
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
function mk(e) {
  return Array.isArray(e) && e.every((t) => {
    t && typeof t == "object" && typeof t.id == "string" && t.id.length > 0 && typeof t.height == "number" && t.height >= 0 && typeof t.mediantime == "number" && t.mediantime > 0;
  });
}
const bk = (e) => typeof e.txid == "string" && Array.isArray(e.vout) && e.vout.every((t) => typeof t.scriptpubkey_address == "string" && typeof t.value == "number") && typeof e.status == "object" && typeof e.status.confirmed == "boolean", Ek = 0n, xk = new Uint8Array([81, 2, 78, 115]), sd = {
  script: xk,
  amount: Ek
};
V.encode(sd.script);
function Tk(e, t, n) {
  const r = new Er({
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
  }), r.addOutput(sd), r;
}
const Sk = new Error("invalid settlement transaction outputs"), vk = new Error("empty tree"), $k = new Error("invalid number of inputs"), xu = new Error("wrong settlement txid"), kk = new Error("invalid amount"), Ak = new Error("no leaves"), Ik = new Error("invalid taproot script"), _p = new Error("invalid round transaction outputs"), Ok = new Error("wrong commitment txid"), Bk = new Error("missing cosigners public keys"), Tu = 0, Dp = 1;
function Nk(e, t) {
  if (t.validate(), t.root.inputsLength !== 1)
    throw $k;
  const n = t.root.getInput(0), r = Ce.fromPSBT(Mt.decode(e));
  if (r.outputsLength <= Dp)
    throw Sk;
  const i = r.id;
  if (!n.txid || V.encode(n.txid) !== i || n.index !== Dp)
    throw xu;
}
function Rk(e, t, n) {
  if (t.outputsLength < Tu + 1)
    throw _p;
  const r = t.getOutput(Tu)?.amount;
  if (!r)
    throw _p;
  if (!e.root)
    throw vk;
  const i = e.root.getInput(0), s = t.id;
  if (!i.txid || V.encode(i.txid) !== s || i.index !== Tu)
    throw Ok;
  let o = 0n;
  for (let c = 0; c < e.root.outputsLength; c++) {
    const u = e.root.getOutput(c);
    u?.amount && (o += u.amount);
  }
  if (o !== r)
    throw kk;
  if (e.leaves().length === 0)
    throw Ak;
  e.validate();
  for (const c of e.iterator())
    for (const [u, l] of c.children) {
      const d = c.root.getOutput(u);
      if (!d?.script)
        throw new Error(`parent output ${u} not found`);
      const h = d.script.slice(2);
      if (h.length !== 32)
        throw new Error(`parent output ${u} has invalid script`);
      const p = j$(l.root, 0, z$);
      if (p.length === 0)
        throw Bk;
      const y = p.map((g) => g.key), { finalKey: f } = M$(y, !0, {
        taprootTweak: n
      });
      if (!f || V.encode(f.slice(1)) !== V.encode(h))
        throw Ik;
    }
}
function Uk(e, t, n) {
  let r = !1;
  for (const [o, a] of t.entries()) {
    if (!a.script)
      throw new Error(`missing output script ${o}`);
    if (tt.decode(a.script)[0] === "RETURN") {
      if (r)
        throw new Error("multiple OP_RETURN outputs");
      r = !0;
    }
  }
  const i = e.map((o) => Pk(o, n));
  return {
    arkTx: Sb(i.map((o) => o.input), t),
    checkpoints: i.map((o) => o.tx)
  };
}
function Sb(e, t) {
  let n = 0n;
  for (const i of e) {
    const s = bb(ks(i.tapLeafScript));
    if (Fi.is(s)) {
      if (n !== 0n && Vp(n) !== Vp(s.params.absoluteTimelock))
        throw new Error("cannot mix seconds and blocks locktime");
      s.params.absoluteTimelock > n && (n = s.params.absoluteTimelock);
    }
  }
  const r = new Er({
    version: 3,
    lockTime: Number(n)
  });
  for (const [i, s] of e.entries())
    r.addInput({
      txid: s.txid,
      index: s.vout,
      sequence: n ? ed - 1 : void 0,
      witnessUtxo: {
        script: ve.decode(s.tapTree).pkScript,
        amount: BigInt(s.value)
      },
      tapLeafScript: [s.tapLeafScript]
    }), F$(r, i, mb, s.tapTree);
  for (const i of t)
    r.addOutput(i);
  return r.addOutput(sd), r;
}
function Pk(e, t) {
  const n = bb(ks(e.tapLeafScript)), r = new ve([
    t.script,
    n.script
  ]), i = Sb([e], [
    {
      amount: BigInt(e.value),
      script: r.pkScript
    }
  ]), s = r.findLeaf(V.encode(n.script)), o = {
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
const Ck = 500000000n;
function Vp(e) {
  return e >= Ck;
}
function Lk(e, t) {
  if (!e.status.block_time)
    return !1;
  if (t.value === 0n)
    return !0;
  if (t.type === "blocks")
    return !1;
  const n = BigInt(Math.floor(Date.now() / 1e3));
  return BigInt(Math.floor(e.status.block_time)) + t.value <= n;
}
const _k = 4320 * 60 * 1e3, Dk = {
  thresholdMs: _k
  // 3 days
};
class $t {
  constructor(t, n, r = $t.DefaultHRP) {
    this.preimage = t, this.value = n, this.HRP = r, this.vout = 0;
    const i = Ft(this.preimage);
    this.vtxoScript = new ve([Hk(i)]);
    const s = this.vtxoScript.leaves[0];
    this.txid = V.encode(new Uint8Array(i).reverse()), this.tapTree = this.vtxoScript.encode(), this.forfeitTapLeafScript = s, this.intentTapLeafScript = s, this.value = n, this.status = { confirmed: !0 }, this.extraWitness = [this.preimage];
  }
  encode() {
    const t = new Uint8Array($t.Length);
    return t.set(this.preimage, 0), Vk(t, this.value, this.preimage.length), t;
  }
  static decode(t, n = $t.DefaultHRP) {
    if (t.length !== $t.Length)
      throw new Error(`invalid data length: expected ${$t.Length} bytes, got ${t.length}`);
    const r = t.subarray(0, $t.PreimageLength), i = Mk(t, $t.PreimageLength);
    return new $t(r, i, n);
  }
  static fromString(t, n = $t.DefaultHRP) {
    if (t = t.trim(), !t.startsWith(n))
      throw new Error(`invalid human-readable part: expected ${n} prefix (note '${t}')`);
    const r = t.slice(n.length), i = Tl.decode(r);
    if (i.length === 0)
      throw new Error("failed to decode base58 string");
    return $t.decode(i, n);
  }
  toString() {
    return this.HRP + Tl.encode(this.encode());
  }
}
$t.DefaultHRP = "arknote";
$t.PreimageLength = 32;
$t.ValueLength = 4;
$t.Length = $t.PreimageLength + $t.ValueLength;
$t.FakeOutpointIndex = 0;
function Vk(e, t, n) {
  new DataView(e.buffer, e.byteOffset + n, 4).setUint32(0, t, !1);
}
function Mk(e, t) {
  return new DataView(e.buffer, e.byteOffset + t, 4).getUint32(0, !1);
}
function Hk(e) {
  return tt.encode(["SHA256", e, "EQUAL"]);
}
var Dl;
(function(e) {
  e[e.INDEXER_TX_TYPE_UNSPECIFIED = 0] = "INDEXER_TX_TYPE_UNSPECIFIED", e[e.INDEXER_TX_TYPE_RECEIVED = 1] = "INDEXER_TX_TYPE_RECEIVED", e[e.INDEXER_TX_TYPE_SENT = 2] = "INDEXER_TX_TYPE_SENT";
})(Dl || (Dl = {}));
var bi;
(function(e) {
  e.UNSPECIFIED = "INDEXER_CHAINED_TX_TYPE_UNSPECIFIED", e.COMMITMENT = "INDEXER_CHAINED_TX_TYPE_COMMITMENT", e.ARK = "INDEXER_CHAINED_TX_TYPE_ARK", e.TREE = "INDEXER_CHAINED_TX_TYPE_TREE", e.CHECKPOINT = "INDEXER_CHAINED_TX_TYPE_CHECKPOINT";
})(bi || (bi = {}));
class Fk {
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
    if (!Ie.isVtxoTreeResponse(o))
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
    if (!Ie.isVtxoTreeLeavesResponse(o))
      throw new Error("Invalid vtxos tree leaves data received");
    return o;
  }
  async getBatchSweepTransactions(t) {
    const n = `${this.serverUrl}/v1/indexer/batch/${t.txid}/${t.vout}/sweepTxs`, r = await fetch(n);
    if (!r.ok)
      throw new Error(`Failed to fetch batch sweep transactions: ${r.statusText}`);
    const i = await r.json();
    if (!Ie.isBatchSweepTransactionsResponse(i))
      throw new Error("Invalid batch sweep transactions data received");
    return i;
  }
  async getCommitmentTx(t) {
    const n = `${this.serverUrl}/v1/indexer/commitmentTx/${t}`, r = await fetch(n);
    if (!r.ok)
      throw new Error(`Failed to fetch commitment tx: ${r.statusText}`);
    const i = await r.json();
    if (!Ie.isCommitmentTx(i))
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
    if (!Ie.isConnectorsResponse(o))
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
    if (!Ie.isForfeitTxsResponse(o))
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
          for await (const o of Cl(i)) {
            if (n?.aborted)
              break;
            try {
              const a = JSON.parse(o.data);
              a.event && (yield {
                txid: a.event.txid,
                scripts: a.event.scripts || [],
                newVtxos: (a.event.newVtxos || []).map(vo),
                spentVtxos: (a.event.spentVtxos || []).map(vo),
                sweptVtxos: (a.event.sweptVtxos || []).map(vo),
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
        if (Ll(i)) {
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
    if (!Ie.isVirtualTxsResponse(o))
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
    if (!Ie.isVtxoChainResponse(o))
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
    if (!Ie.isVtxosResponse(s))
      throw new Error("Invalid vtxos data received");
    return {
      vtxos: s.vtxos.map(vo),
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
function vo(e) {
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
var Ie;
(function(e) {
  function t(b) {
    return typeof b == "object" && typeof b.totalOutputAmount == "string" && typeof b.totalOutputVtxos == "number" && typeof b.expiresAt == "string" && typeof b.swept == "boolean";
  }
  function n(b) {
    return typeof b == "object" && typeof b.txid == "string" && typeof b.expiresAt == "string" && Object.values(bi).includes(b.type) && Array.isArray(b.spends) && b.spends.every((W) => typeof W == "string");
  }
  function r(b) {
    return typeof b == "object" && typeof b.startedAt == "string" && typeof b.endedAt == "string" && typeof b.totalInputAmount == "string" && typeof b.totalInputVtxos == "number" && typeof b.totalOutputAmount == "string" && typeof b.totalOutputVtxos == "number" && typeof b.batches == "object" && Object.values(b.batches).every(t);
  }
  e.isCommitmentTx = r;
  function i(b) {
    return typeof b == "object" && typeof b.txid == "string" && typeof b.vout == "number";
  }
  e.isOutpoint = i;
  function s(b) {
    return Array.isArray(b) && b.every(i);
  }
  e.isOutpointArray = s;
  function o(b) {
    return typeof b == "object" && typeof b.txid == "string" && typeof b.children == "object" && Object.values(b.children).every(l) && Object.keys(b.children).every((W) => Number.isInteger(Number(W)));
  }
  function a(b) {
    return Array.isArray(b) && b.every(o);
  }
  e.isTxsArray = a;
  function c(b) {
    return typeof b == "object" && typeof b.amount == "string" && typeof b.createdAt == "string" && typeof b.isSettled == "boolean" && typeof b.settledBy == "string" && Object.values(Dl).includes(b.type) && (!b.commitmentTxid && typeof b.virtualTxid == "string" || typeof b.commitmentTxid == "string" && !b.virtualTxid);
  }
  function u(b) {
    return Array.isArray(b) && b.every(c);
  }
  e.isTxHistoryRecordArray = u;
  function l(b) {
    return typeof b == "string" && b.length === 64;
  }
  function d(b) {
    return Array.isArray(b) && b.every(l);
  }
  e.isTxidArray = d;
  function h(b) {
    return typeof b == "object" && i(b.outpoint) && typeof b.createdAt == "string" && (b.expiresAt === null || typeof b.expiresAt == "string") && typeof b.amount == "string" && typeof b.script == "string" && typeof b.isPreconfirmed == "boolean" && typeof b.isSwept == "boolean" && typeof b.isUnrolled == "boolean" && typeof b.isSpent == "boolean" && (!b.spentBy || typeof b.spentBy == "string") && (!b.settledBy || typeof b.settledBy == "string") && (!b.arkTxid || typeof b.arkTxid == "string") && Array.isArray(b.commitmentTxids) && b.commitmentTxids.every(l);
  }
  function p(b) {
    return typeof b == "object" && typeof b.current == "number" && typeof b.next == "number" && typeof b.total == "number";
  }
  function y(b) {
    return typeof b == "object" && Array.isArray(b.vtxoTree) && b.vtxoTree.every(o) && (!b.page || p(b.page));
  }
  e.isVtxoTreeResponse = y;
  function f(b) {
    return typeof b == "object" && Array.isArray(b.leaves) && b.leaves.every(i) && (!b.page || p(b.page));
  }
  e.isVtxoTreeLeavesResponse = f;
  function g(b) {
    return typeof b == "object" && Array.isArray(b.connectors) && b.connectors.every(o) && (!b.page || p(b.page));
  }
  e.isConnectorsResponse = g;
  function m(b) {
    return typeof b == "object" && Array.isArray(b.txids) && b.txids.every(l) && (!b.page || p(b.page));
  }
  e.isForfeitTxsResponse = m;
  function S(b) {
    return typeof b == "object" && Array.isArray(b.sweptBy) && b.sweptBy.every(l);
  }
  e.isSweptCommitmentTxResponse = S;
  function v(b) {
    return typeof b == "object" && Array.isArray(b.sweptBy) && b.sweptBy.every(l);
  }
  e.isBatchSweepTransactionsResponse = v;
  function O(b) {
    return typeof b == "object" && Array.isArray(b.txs) && b.txs.every((W) => typeof W == "string") && (!b.page || p(b.page));
  }
  e.isVirtualTxsResponse = O;
  function R(b) {
    return typeof b == "object" && Array.isArray(b.chain) && b.chain.every(n) && (!b.page || p(b.page));
  }
  e.isVtxoChainResponse = R;
  function j(b) {
    return typeof b == "object" && Array.isArray(b.vtxos) && b.vtxos.every(h) && (!b.page || p(b.page));
  }
  e.isVtxosResponse = j;
})(Ie || (Ie = {}));
function As(e, t) {
  return {
    ...t,
    forfeitTapLeafScript: e.offchainTapscript.forfeit(),
    intentTapLeafScript: e.offchainTapscript.forfeit(),
    tapTree: e.offchainTapscript.encode()
  };
}
function jk(e, t) {
  return {
    ...t,
    forfeitTapLeafScript: e.boardingTapscript.forfeit(),
    intentTapLeafScript: e.boardingTapscript.forfeit(),
    tapTree: e.boardingTapscript.encode()
  };
}
class yt extends Error {
  #t;
  constructor(t, n, r) {
    super(t, { cause: r }), this.name = "ParseError", this.#t = n, n?.input && (this.message = ji(this.message, n));
  }
  get node() {
    return this.#t;
  }
  withAst(t) {
    return this.#t ? this : (this.#t = t, t?.input ? (this.message = ji(this.message, t), this) : this);
  }
}
class Q extends Error {
  #t;
  constructor(t, n, r) {
    super(t, { cause: r }), this.name = "EvaluationError", this.#t = n, n?.input && (this.message = ji(this.message, n));
  }
  get node() {
    return this.#t;
  }
  withAst(t) {
    return this.#t ? this : (this.#t = t, t?.input ? (this.message = ji(this.message, t), this) : this);
  }
}
let Kk = class extends Error {
  #t;
  constructor(t, n, r) {
    super(t, { cause: r }), this.name = "TypeError", this.#t = n, n?.input && (this.message = ji(this.message, n));
  }
  get node() {
    return this.#t;
  }
  withAst(t) {
    return this.#t ? this : (this.#t = t, t?.input ? (this.message = ji(this.message, t), this) : this);
  }
};
function ji(e, t) {
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
class an {
  #t;
  constructor(t) {
    this.#t = t;
  }
  static of(t) {
    return t === void 0 ? Wa : new an(t);
  }
  static none() {
    return Wa;
  }
  hasValue() {
    return this.#t !== void 0;
  }
  value() {
    if (this.#t === void 0) throw new Q("Optional value is not present");
    return this.#t;
  }
  or(t) {
    if (this.#t !== void 0) return this;
    if (t instanceof an) return t;
    throw new Q("Optional.or must be called with an Optional argument");
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
const Wa = Object.freeze(new an());
class vb {
}
const $b = new vb();
function zk(e, t) {
  e.constants.set("optional", t ? $b : void 0);
}
function Wk(e) {
  const t = (d, h) => e.registerFunctionOverload(d, h), n = e.enableOptionalTypes ? $b : void 0;
  e.registerType("OptionalNamespace", vb), e.registerConstant("optional", "OptionalNamespace", n), t("optional.hasValue(): bool", (d) => d.hasValue()), t("optional<A>.value(): A", (d) => d.value()), e.registerFunctionOverload("OptionalNamespace.none(): optional<T>", () => an.none()), t("OptionalNamespace.of(A): optional<A>", (d, h) => an.of(h));
  function r(d, h, p) {
    if (d instanceof an) return d;
    throw new Q(`${p} must be optional`, h);
  }
  function i(d, h, p) {
    const y = d.eval(h.receiver, p);
    return y instanceof Promise ? y.then((f) => s(f, d, h, p)) : s(y, d, h, p);
  }
  function s(d, h, p, y) {
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
  e.registerFunctionOverload(
    "optional.or(ast): optional<dyn>",
    a({
      functionDesc: "optional.or(optional)",
      evaluate: i,
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
class Rr {
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
    if (t < 0n || t > 18446744073709551615n) throw new Q("Unsigned integer overflow");
    this.#t = t;
  }
  get [Symbol.toStringTag]() {
    return `value = ${this.#t}`;
  }
  [Symbol.for("nodejs.util.inspect.custom")]() {
    return `UnsignedInteger { value: ${this.#t} }`;
  }
}
const qk = {
  h: 3600000000000n,
  m: 60000000000n,
  s: 1000000000n,
  ms: 1000000n,
  us: 1000n,
  µs: 1000n,
  ns: 1n
};
class lr {
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
    return new lr(r, i);
  }
  addDuration(t) {
    const n = this.#e + t.nanos;
    return new lr(
      this.#t + t.seconds + BigInt(Math.floor(n / 1e9)),
      n % 1e9
    );
  }
  subtractDuration(t) {
    const n = this.#e - t.nanos;
    return new lr(
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
function Gk(e) {
  const t = (f, g) => e.registerFunctionOverload(f, g), n = (f) => f;
  t("dyn(dyn): dyn", n);
  for (const f in Is) {
    const g = Is[f];
    g instanceof ae && t(`type(${g.name}): type`, () => g);
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
        throw new Q(`bool() conversion error: invalid string value "${f}"`);
    }
  });
  const r = Object.keys;
  t("size(string): int", (f) => BigInt(Mp(f))), t("size(bytes): int", (f) => BigInt(f.length)), t("size(list): int", (f) => BigInt(f.length ?? f.size)), t(
    "size(map): int",
    (f) => BigInt(f instanceof Map ? f.size : r(f).length)
  ), t("string.size(): int", (f) => BigInt(Mp(f))), t("bytes.size(): int", (f) => BigInt(f.length)), t("list.size(): int", (f) => BigInt(f.length ?? f.size)), t(
    "map.size(): int",
    (f) => BigInt(f instanceof Map ? f.size : r(f).length)
  ), t("bytes(string): bytes", (f) => o.fromString(f)), t("bytes(bytes): bytes", n), t("double(double): double", n), t("double(int): double", (f) => Number(f)), t("double(uint): double", (f) => Number(f)), t("double(string): double", (f) => {
    if (!f || f !== f.trim())
      throw new Q("double() type error: cannot convert to double");
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
        throw new Q("double() type error: cannot convert to double");
      }
    }
  }), t("int(int): int", n), t("int(double): int", (f) => {
    if (Number.isFinite(f)) return BigInt(Math.trunc(f));
    throw new Q("int() type error: integer overflow");
  }), t("int(string): int", (f) => {
    if (f !== f.trim() || f.length > 20 || f.includes("0x"))
      throw new Q("int() type error: cannot convert to int");
    try {
      const g = BigInt(f);
      if (g <= 9223372036854775807n && g >= -9223372036854775808n) return g;
    } catch {
    }
    throw new Q("int() type error: cannot convert to int");
  }), t("uint(uint): uint", n), t("uint(double): uint", (f) => {
    if (Number.isFinite(f)) return BigInt(Math.trunc(f));
    throw new Q("int() type error: integer overflow");
  }), t("uint(string): uint", (f) => {
    if (f !== f.trim() || f.length > 20 || f.includes("0x"))
      throw new Q("uint() type error: cannot convert to uint");
    try {
      const g = BigInt(f);
      if (g <= 18446744073709551615n && g >= 0n) return g;
    } catch {
    }
    throw new Q("uint() type error: cannot convert to uint");
  }), t("string(string): string", n), t("string(bool): string", (f) => `${f}`), t("string(int): string", (f) => `${f}`), t("string(bytes): string", (f) => o.toUtf8(f)), t("string(double): string", (f) => f === 1 / 0 ? "+Inf" : f === -1 / 0 ? "-Inf" : `${f}`), t("string.startsWith(string): bool", (f, g) => f.startsWith(g)), t("string.endsWith(string): bool", (f, g) => f.endsWith(g)), t("string.contains(string): bool", (f, g) => f.includes(g)), t("string.lowerAscii(): string", (f) => f.toLowerCase()), t("string.upperAscii(): string", (f) => f.toUpperCase()), t("string.trim(): string", (f) => f.trim()), t(
    "string.indexOf(string): int",
    (f, g) => BigInt(f.indexOf(g))
  ), t("string.indexOf(string, int): int", (f, g, m) => {
    if (g === "") return m;
    if (m = Number(m), m < 0 || m >= f.length)
      throw new Q("string.indexOf(search, fromIndex): fromIndex out of range");
    return BigInt(f.indexOf(g, m));
  }), t(
    "string.lastIndexOf(string): int",
    (f, g) => BigInt(f.lastIndexOf(g))
  ), t("string.lastIndexOf(string, int): int", (f, g, m) => {
    if (g === "") return m;
    if (m = Number(m), m < 0 || m >= f.length)
      throw new Q("string.lastIndexOf(search, fromIndex): fromIndex out of range");
    return BigInt(f.lastIndexOf(g, m));
  }), t("string.substring(int): string", (f, g) => {
    if (g = Number(g), g < 0 || g > f.length)
      throw new Q("string.substring(start, end): start index out of range");
    return f.substring(g);
  }), t("string.substring(int, int): string", (f, g, m) => {
    if (g = Number(g), g < 0 || g > f.length)
      throw new Q("string.substring(start, end): start index out of range");
    if (m = Number(m), m < g || m > f.length)
      throw new Q("string.substring(start, end): end index out of range");
    return f.substring(g, m);
  }), t("string.matches(string): bool", (f, g) => {
    try {
      return new RegExp(g).test(f);
    } catch {
      throw new Q(`Invalid regular expression: ${g}`);
    }
  }), t("string.split(string): list<string>", (f, g) => f.split(g)), t("string.split(string, int): list<string>", (f, g, m) => {
    if (m = Number(m), m === 0) return [];
    const S = f.split(g);
    if (m < 0 || S.length <= m) return S;
    const v = S.slice(0, m - 1);
    return v.push(S.slice(m - 1).join(g)), v;
  }), t("list<string>.join(): string", (f) => {
    for (let g = 0; g < f.length; g++)
      if (typeof f[g] != "string")
        throw new Q("string.join(): list must contain only strings");
    return f.join("");
  }), t("list<string>.join(string): string", (f, g) => {
    for (let m = 0; m < f.length; m++)
      if (typeof f[m] != "string")
        throw new Q("string.join(separator): list must contain only strings");
    return f.join(g);
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
    toHex: Uint8Array.prototype.toHex ? (f) => f.toHex() : (f) => Array.from(f, (g) => g.toString(16).padStart(2, "0")).join(""),
    toBase64: Uint8Array.prototype.toBase64 ? (f) => f.toBase64() : (f) => btoa(Array.from(f, (g) => String.fromCodePoint(g)).join("")),
    toUtf8: (f) => s.decode(f),
    jsonParse: (f) => JSON.parse(i.decode(f))
  };
  t("bytes.json(): map", o.jsonParse), t("bytes.hex(): string", o.toHex), t("bytes.string(): string", o.toUtf8), t("bytes.base64(): string", o.toBase64), t("bytes.at(int): int", (f, g) => {
    if (g < 0 || g >= f.length) throw new Q("Bytes index out of range");
    return BigInt(f[g]);
  });
  const a = "google.protobuf.Timestamp", c = "google.protobuf.Duration", u = e.registerType(a, Date).getObjectType(a).typeType, l = e.registerType(c, lr).getObjectType(c).typeType;
  e.registerConstant("google", "map<string, map<string, type>>", {
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
      throw new Q("timestamp() requires a string in ISO 8601 format");
    const g = new Date(f);
    if (g <= 253402300799999 && g >= -621355968e5) return g;
    throw new Q("timestamp() requires a string in ISO 8601 format");
  }), t(`timestamp(int): ${a}`, (f) => {
    if (f = Number(f) * 1e3, f <= 253402300799999 && f >= -621355968e5) return new Date(f);
    throw new Q("timestamp() requires a valid integer unix timestamp");
  }), t(`${a}.getDate(): int`, (f) => BigInt(f.getUTCDate())), t(`${a}.getDate(string): int`, (f, g) => BigInt(d(f, g).getDate())), t(`${a}.getDayOfMonth(): int`, (f) => BigInt(f.getUTCDate() - 1)), t(
    `${a}.getDayOfMonth(string): int`,
    (f, g) => BigInt(d(f, g).getDate() - 1)
  ), t(`${a}.getDayOfWeek(): int`, (f) => BigInt(f.getUTCDay())), t(`${a}.getDayOfWeek(string): int`, (f, g) => BigInt(d(f, g).getDay())), t(`${a}.getDayOfYear(): int`, h), t(`${a}.getDayOfYear(string): int`, h), t(`${a}.getFullYear(): int`, (f) => BigInt(f.getUTCFullYear())), t(`${a}.getFullYear(string): int`, (f, g) => BigInt(d(f, g).getFullYear())), t(`${a}.getHours(): int`, (f) => BigInt(f.getUTCHours())), t(`${a}.getHours(string): int`, (f, g) => BigInt(d(f, g).getHours())), t(`${a}.getMilliseconds(): int`, (f) => BigInt(f.getUTCMilliseconds())), t(`${a}.getMilliseconds(string): int`, (f) => BigInt(f.getUTCMilliseconds())), t(`${a}.getMinutes(): int`, (f) => BigInt(f.getUTCMinutes())), t(`${a}.getMinutes(string): int`, (f, g) => BigInt(d(f, g).getMinutes())), t(`${a}.getMonth(): int`, (f) => BigInt(f.getUTCMonth())), t(`${a}.getMonth(string): int`, (f, g) => BigInt(d(f, g).getMonth())), t(`${a}.getSeconds(): int`, (f) => BigInt(f.getUTCSeconds())), t(`${a}.getSeconds(string): int`, (f, g) => BigInt(d(f, g).getSeconds()));
  const p = /(\d*\.?\d*)(ns|us|µs|ms|s|m|h)/;
  function y(f) {
    if (!f) throw new Q("Invalid duration string: ''");
    const g = f[0] === "-";
    (f[0] === "-" || f[0] === "+") && (f = f.slice(1));
    let m = BigInt(0);
    for (; ; ) {
      const O = p.exec(f);
      if (!O) throw new Q(`Invalid duration string: ${f}`);
      if (O.index !== 0) throw new Q(`Invalid duration string: ${f}`);
      f = f.slice(O[0].length);
      const R = qk[O[2]], [j = "0", b = ""] = O[1].split("."), W = BigInt(j) * R, U = b ? BigInt(b.slice(0, 13).padEnd(13, "0")) * R / 10000000000000n : 0n;
      if (m += W + U, f === "") break;
    }
    const S = m >= 1000000000n ? m / 1000000000n : 0n, v = Number(m % 1000000000n);
    return g ? new lr(-S, -v) : new lr(S, v);
  }
  t("duration(string): google.protobuf.Duration", (f) => y(f)), t("google.protobuf.Duration.getHours(): int", (f) => f.getHours()), t("google.protobuf.Duration.getMinutes(): int", (f) => f.getMinutes()), t("google.protobuf.Duration.getSeconds(): int", (f) => f.getSeconds()), t("google.protobuf.Duration.getMilliseconds(): int", (f) => f.getMilliseconds()), Wk(e);
}
function Mp(e) {
  let t = 0;
  for (const n of e) t++;
  return t;
}
class ae {
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
const Is = {
  string: new ae("string"),
  bool: new ae("bool"),
  int: new ae("int"),
  uint: new ae("uint"),
  double: new ae("double"),
  map: new ae("map"),
  list: new ae("list"),
  bytes: new ae("bytes"),
  null_type: new ae("null"),
  type: new ae("type")
};
class Pc {
  #t = null;
  #e = null;
  constructor(t) {
    t instanceof Pc ? (this.#t = t, this.#e = /* @__PURE__ */ new Map()) : this.#e = new Map(t);
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
class Yk extends Pc {
  constructor(t = null, n = null) {
    super(t, n);
  }
  get(t) {
    const n = super.get(t);
    return n === void 0 ? De : n;
  }
}
function bn(e, t = Pc, n = !0) {
  return e instanceof t ? e.fork(n) : new t(e);
}
class vr {
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
    if (t = t instanceof an ? t.orValue() : t, t === void 0) return Wa;
    const s = i.debugType(t);
    try {
      return an.of(s.fieldLazy(t, n, r, i));
    } catch (o) {
      if (o instanceof Q) return Wa;
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
    throw new Q(
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
    throw new Q(
      `Field '${n}' is not of type '${this.valueType}', got '${o}'`,
      r
    );
  }
  #a(t, n, r, i) {
    if (!(typeof n == "number" || typeof n == "bigint")) return;
    const s = t[n];
    if (s === void 0)
      throw new Q(
        `No such key: index out of bounds, index ${n} ${n < 0 ? "< 0" : `>= size ${t.length}`}`,
        r
      );
    const o = i.debugType(s);
    if (this.valueType.matches(o)) return s;
    throw new Q(
      `List item with index '${n}' is not of type '${this.valueType}', got '${o}'`,
      r
    );
  }
  fieldLazy() {
  }
  field(t, n, r, i) {
    const s = this.fieldLazy(t, n, r, i);
    if (s !== void 0) return s;
    throw new Q(`No such key: ${n}`, r);
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
function Zk(e, t) {
  const n = `Macro '${e}' must `;
  return function(i) {
    const s = t(i);
    if (!s || typeof s != "object") throw new Error(`${n} must return an object.`);
    if (!s?.typeCheck) throw new Error(`${n} have a .typeCheck(checker, macro, ctx) method.`);
    if (!s?.evaluate) throw new Error(`${n} have a .evaluate(evaluator, macro, ctx) method.`);
    return s;
  };
}
class Xk {
  #t;
  constructor({ name: t, receiverType: n, argTypes: r, returnType: i, handler: s }) {
    this.name = t, this.receiverType = n || null, this.argTypes = r, this.returnType = i, this.macro = r.includes(qo);
    const o = n ? `${n}.` : "";
    this.signature = `${o}${t}(${r.join(", ")}): ${i}`, this.handler = this.macro ? Zk(this.signature, s) : s, Object.freeze(this);
  }
  hasPlaceholder() {
    return this.#t ??= this.returnType.hasPlaceholder() || this.receiverType?.hasPlaceholder() || this.argTypes.some((t) => t.hasPlaceholder()) || !1;
  }
  matchesArgs(t) {
    return t.length === this.argTypes.length && this.argTypes.every((n, r) => n.matches(t[r])) ? this : null;
  }
}
class cs {
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
function kb(e) {
  return new vr({
    kind: "list",
    name: `list<${e}>`,
    type: "list",
    valueType: e
  });
}
function xn(e) {
  return new vr({ kind: "primitive", name: e, type: e });
}
function Qk(e) {
  return new vr({ kind: "message", name: e, type: e });
}
function Ab(e) {
  const t = e ? `dyn<${e}>` : "dyn";
  return new vr({ kind: "dyn", name: t, type: t, valueType: e });
}
function Ib(e) {
  const t = e ? `optional<${e}>` : "optional";
  return new vr({ kind: "optional", name: t, type: "optional", valueType: e });
}
function Ob(e, t) {
  return new vr({
    kind: "map",
    name: `map<${e}, ${t}>`,
    type: "map",
    keyType: e,
    valueType: t
  });
}
function Jk(e) {
  return new vr({ kind: "param", name: e, type: e });
}
const De = Ab(), qo = xn("ast"), Hp = kb(De), Fp = Ob(De, De), Zt = Object.freeze({
  string: xn("string"),
  bool: xn("bool"),
  int: xn("int"),
  uint: xn("uint"),
  double: xn("double"),
  bytes: xn("bytes"),
  dyn: De,
  null: xn("null"),
  type: xn("type"),
  optional: Ib(De),
  list: Hp,
  "list<dyn>": Hp,
  map: Fp,
  "map<dyn, dyn>": Fp
});
class tA {
  returnType = null;
  /** @type {Array<FunctionDeclaration>} */
  declarations = [];
  constructor(t) {
    this.registry = t;
  }
  add(t) {
    this.returnType = (this.returnType ? this.returnType.unify(this.registry, t.returnType) : t.returnType) || De, this.declarations.push(t);
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
function jp(e) {
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
const Bb = [
  [void 0, "map"],
  [Object, "map"],
  [Map, "map"],
  [Array, "list"],
  [Uint8Array, "bytes"],
  [Rr, "uint"],
  [ae, "type"],
  [an, "optional"]
];
typeof Buffer < "u" && Bb.push([Buffer, "bytes"]);
class od {
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
    if (this.enableOptionalTypes = t.enableOptionalTypes ?? !1, this.objectTypes = bn(t.objectTypes), this.objectTypesByConstructor = bn(t.objectTypesByConstructor), this.objectTypeInstances = bn(t.objectTypeInstances), this.#i = bn(t.functionDeclarations), this.#r = bn(t.operatorDeclarations), this.#n = bn(
      t.typeDeclarations || Object.entries(Zt),
      void 0,
      !1
    ), this.constants = bn(t.constants), this.variables = t.unlistedVariablesAreDyn ? bn(t.variables, Yk) : bn(t.variables), this.variables.size)
      zk(this, this.enableOptionalTypes);
    else {
      for (const n of Bb) this.registerType(n[1], n[0], !0);
      for (const n in Is) this.registerConstant(n, "type", Is[n]);
    }
  }
  #g() {
    this.#t = {}, this.#e = {};
  }
  registerVariable(t, n) {
    if (this.variables.has(t)) throw new Error(`Variable already registered: ${t}`);
    return this.variables.set(t, n instanceof vr ? n : this.getType(n)), this;
  }
  registerConstant(t, n, r) {
    return this.registerVariable(t, n), this.constants.set(t, r), this;
  }
  #y(t, n, r) {
    let i = this.#o.get(t);
    return i = i.get(n) || i.set(n, /* @__PURE__ */ new Map()).get(n), i.get(r) || i.set(r, new tA(this)).get(r);
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
    return t === "ast" ? qo : this.#s(t, !0);
  }
  registerType(t, n, r) {
    if (typeof t != "string" || t.length < 2)
      throw new Error(`Invalid type name: ${t}`);
    const i = {
      name: t,
      typeType: Is[t] || new ae(t),
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
    if (r = t.match(/^[A-Z]$/), r) return this.#l(Jk, t, t);
    if (r = t.match(/^dyn<(.+)>$/), r) {
      const i = this.#s(r[1].trim(), n);
      return this.#l(Ab, `dyn<${i}>`, i);
    }
    if (r = t.match(/^list<(.+)>$/), r) {
      const i = this.#s(r[1].trim(), n);
      return this.#l(kb, `list<${i}>`, i);
    }
    if (r = t.match(/^map<(.+)>$/), r) {
      const i = jp(r[1]);
      if (i.length !== 2) throw new Error(`Invalid map type: ${t}`);
      const s = this.#s(i[0].trim(), n), o = this.#s(i[1].trim(), n);
      return this.#l(Ob, `map<${s}, ${o}>`, s, o);
    }
    if (r = t.match(/^optional<(.+)>$/), r) {
      const i = this.#s(r[1].trim(), n);
      return this.#l(Ib, `optional<${i}>`, i);
    }
    if (n) {
      const i = new Error(`Unknown type: ${t}`);
      throw i.unknownType = t, i;
    }
    return this.#l(Qk, t, t);
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
    return i.every((o) => o.returnType === s) ? s : (s.kind === "list" || s.kind === "map") && i.every((o) => o.returnType.kind === s.kind) ? s.kind === "list" ? Zt.list : Zt.map : Zt.dyn;
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
        const o = s ? Zt.dyn : n;
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
    return new od({
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
      return new Xk({
        name: s,
        receiverType: i ? this.getType(i) : null,
        returnType: this.getType(a.trim()),
        argTypes: jp(o).map((c) => this.getFunctionType(c.trim())),
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
  #$(t, n) {
    return t.name !== n.name || t.argTypes.length !== n.argTypes.length || (t.receiverType || n.receiverType) && (!t.receiverType || !n.receiverType) ? !1 : !(t.receiverType !== n.receiverType && t.receiverType !== De && n.receiverType !== De) && (n.macro || t.macro || n.argTypes.every((i, s) => {
      const o = t.argTypes[s];
      return i === o || i === qo || o === qo || i === De || o === De;
    }));
  }
  /** @param {FunctionDeclaration} newDec */
  #k(t) {
    for (const [, n] of this.#i)
      if (this.#$(n, t))
        throw new Error(
          `Function signature '${t.signature}' overlaps with existing overload '${n.signature}'.`
        );
  }
  registerFunctionOverload(t, n) {
    const r = typeof n == "function" ? n : n?.handler, i = this.#v(t, r);
    this.#k(i), this.#i.set(i.signature, i), this.#o.get(!0).clear(), this.#o.get(!1).clear();
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
    ), a = new cs({ operator: `${t}_`, leftType: s, returnType: o, handler: r });
    if (this.#h(a))
      throw new Error(`Operator overload already registered: ${t}${n}`);
    this.#r.set(a.signature, a), this.#g();
  }
  #h(t) {
    for (const [, n] of this.#r) if (t.equals(n)) return !0;
    return !1;
  }
  binaryOverload(t, n, r, i, s) {
    s ??= Kp(n) ? "bool" : t;
    const o = `${t} ${n} ${r}: ${s}`, a = this.assertType(t, "left type", o), c = this.assertType(r, "right type", o), u = this.assertType(s, "return type", o);
    if (Kp(n) && u.type !== "bool")
      throw new Error(`Comparison operator '${n}' must return 'bool', got '${u.type}'`);
    const l = new cs({ operator: n, leftType: a, rightType: c, returnType: u, handler: i });
    if (l.hasPlaceholder() && !(c.hasPlaceholder() && a.hasPlaceholder()))
      throw new Error(
        `Operator overload with placeholders must use them in both left and right types: ${o}`
      );
    if (this.#h(l))
      throw new Error(`Operator overload already registered: ${l.signature}`);
    if (n === "==") {
      const d = [
        new cs({
          operator: "!=",
          leftType: a,
          rightType: c,
          handler(h, p, y, f) {
            return !i(h, p, y, f);
          },
          returnType: u
        })
      ];
      a !== c && d.push(
        new cs({
          operator: "==",
          leftType: c,
          rightType: a,
          handler(h, p, y, f) {
            return i(p, h, y, f);
          },
          returnType: u
        }),
        new cs({
          operator: "!=",
          leftType: c,
          rightType: a,
          handler(h, p, y, f) {
            return !i(p, h, y, f);
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
function Kp(e) {
  return e === "<" || e === "<=" || e === ">" || e === ">=" || e === "==" || e === "!=" || e === "in";
}
function eA(e) {
  return new od(e);
}
class nA {
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
    return new qa(this);
  }
}
class qa {
  parent;
  context;
  variableName;
  variableType;
  variableValue;
  constructor(t) {
    this.parent = t;
  }
  fork() {
    return new qa(this);
  }
  forkWithVariable(t, n) {
    const r = new qa(this);
    return r.variableType = t, r.variableName = n, r;
  }
  withContext(t) {
    if (typeof t != "object") throw new Q("Context must be an object");
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
function Cc(e, t) {
  if (e.op === "id") return e.args;
  throw new yt(t, e);
}
function eo(e, t) {
  if (typeof t == "boolean") return !1;
  if (t instanceof Error)
    return e.error ??= t, /predicate must return bool|Unknown variable/.test(t.message);
  const n = e.ev.debugRuntimeType(t, e.firstMacroIter.checkedType);
  return e.error = new Q(
    `${e.macro.functionDesc} predicate must return bool, got '${n}'`,
    e.firstMacroIter
  ), !0;
}
class rA {
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
    throw new Q(
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
function Os(e, t) {
  return function(n, r, i) {
    const s = n.eval(r.receiver, i), o = new rA(n, r, i, e, t);
    return s instanceof Promise ? o.iterateAsync(s) : o.iterate(s);
  };
}
function iA(e, t, n) {
  if (eo(e, n)) throw e.error;
  n === !1 && (e.return = !1);
}
function sA(e) {
  if (e.return !== void 0) return e.return;
  if (e.error) throw e.error;
  return !0;
}
function oA(e, t, n) {
  if (eo(e, n)) throw e.error;
  n === !0 && (e.return = !0);
}
function aA(e) {
  if (e.return !== void 0) return e.return;
  if (e.error) throw e.error;
  return !1;
}
function cA(e, t, n) {
  if (eo(e, n) || n instanceof Error) throw e.error;
  n && (e.found ? e.return = !1 : e.found = !0);
}
function uA(e) {
  return e.return !== void 0 ? e.return : e.found === !0;
}
function Nb(e) {
  return e.results || [];
}
function lA(e, t, n) {
  if (n === !1) return;
  if (eo(e, n) || n instanceof Error) throw e.error;
  const r = e.ev.eval(e.macro.second, t);
  return r instanceof Promise ? r.then((i) => (e.results ??= []).push(i)) : (e.results ??= []).push(r);
}
function fA(e, t, n) {
  if (n instanceof Error) throw e.error;
  return (e.results ??= []).push(n);
}
function dA(e, t, n) {
  if (eo(e, n) || n instanceof Error) throw e.error;
  n && (e.results ??= []).push(t.variableValue);
}
function hA(e, t, n) {
  if (t.kind === "dyn") return t;
  if (t.kind === "list") return t.valueType;
  if (t.kind === "map") return t.keyType;
  throw new e.Error(
    `Expression of type '${t}' cannot be range of a comprehension (must be list, map, or dynamic).`,
    n.receiver
  );
}
function ad(e, t, n) {
  const r = hA(e, e.check(t.receiver, n), t);
  return n.forkWithVariable(r, t.predicateVar);
}
function Su({ description: e, evaluator: t }) {
  const n = `${e} invalid predicate iteration variable`;
  if (!t) throw new Error(`No evaluator provided for quantifier macro: ${e}`);
  function r(i, s, o) {
    o = ad(i, s, o), s.variableType = o.variableType;
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
    predicateVar: Cc(i[0], n),
    evaluate: t,
    typeCheck: r
  });
}
function zp(e) {
  const t = e ? "map(var, filter, transform)" : "map(var, transform)", n = `${t} invalid predicate iteration variable`, r = Os(
    e ? lA : fA,
    Nb
  );
  function i(s, o, a) {
    if (a = ad(s, o, a), o.variableType = a.variableType, e) {
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
    predicateVar: Cc(s[0], n),
    evaluate: r,
    typeCheck: i
  });
}
function pA() {
  const e = "filter(var, predicate)", t = `${e} invalid predicate iteration variable`, n = Os(dA, Nb);
  function r(i, s, o) {
    o = ad(i, s, o), s.variableType = o.variableType;
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
    predicateVar: Cc(i[0], t),
    evaluate: n,
    typeCheck: r
  });
}
function gA() {
  const e = "has() invalid argument";
  function t(r, i, s) {
    const o = i.macroHasProps;
    let a = o.length, c = r.eval(o[--a], s), u;
    for (; a--; ) {
      const l = o[a];
      if (l.op === ".?" && (u ??= !0), c = r.debugType(c).fieldLazy(c, l.args[1], l, r), c === void 0) {
        if (!(!u && a && l.op === ".")) break;
        throw new Q(`No such key: ${l.args[1]}`, l);
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
function yA(e) {
  e.registerFunctionOverload("has(ast): bool", gA()), e.registerFunctionOverload(
    "list.all(ast, ast): bool",
    Su({
      description: "all(var, predicate)",
      evaluator: Os(iA, sA)
    })
  ), e.registerFunctionOverload(
    "list.exists(ast, ast): bool",
    Su({
      description: "exists(var, predicate)",
      evaluator: Os(oA, aA)
    })
  ), e.registerFunctionOverload(
    "list.exists_one(ast, ast): bool",
    Su({
      description: "exists_one(var, predicate)",
      evaluator: Os(cA, uA)
    })
  ), e.registerFunctionOverload("list.map(ast, ast): list<dyn>", zp(!1)), e.registerFunctionOverload("list.map(ast, ast, ast): list<dyn>", zp(!0)), e.registerFunctionOverload("list.filter(ast, ast): list<dyn>", pA());
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
    var: Cc(i[0], "invalid variable argument"),
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
function wA(e) {
  const t = e.unaryOverload.bind(e), n = e.binaryOverload.bind(e);
  function r(u, l) {
    if (u <= 9223372036854775807n && u >= -9223372036854775808n) return u;
    throw new Q(`integer overflow: ${u}`, l);
  }
  t("!", "bool", (u) => !u), t("-", "int", (u) => -u), n("dyn<int>", "==", "double", (u, l) => u == l), n("dyn<int>", "==", "uint", (u, l) => u == l.valueOf()), n("int", "*", "int", (u, l, d) => r(u * l, d)), n("int", "+", "int", (u, l, d) => r(u + l, d)), n("int", "-", "int", (u, l, d) => r(u - l, d)), n("int", "/", "int", (u, l, d) => {
    if (l === 0n) throw new Q("division by zero", d);
    return u / l;
  }), n("int", "%", "int", (u, l, d) => {
    if (l === 0n) throw new Q("modulo by zero", d);
    return u % l;
  }), t("-", "double", (u) => -u), n("dyn<double>", "==", "int", (u, l) => u == l), n("dyn<double>", "==", "uint", (u, l) => u == l.valueOf()), n("double", "*", "double", (u, l) => u * l), n("double", "+", "double", (u, l) => u + l), n("double", "-", "double", (u, l) => u - l), n("double", "/", "double", (u, l) => u / l), n("string", "+", "string", (u, l) => u + l), n("list<V>", "+", "list<V>", (u, l) => [...u, ...l]), n("bytes", "+", "bytes", (u, l) => {
    const d = new Uint8Array(u.length + l.length);
    return d.set(u, 0), d.set(l, u.length), d;
  });
  const i = "google.protobuf.Duration";
  n(i, "+", i, (u, l) => u.addDuration(l)), n(i, "-", i, (u, l) => u.subtractDuration(l)), n(i, "==", i, (u, l) => u.seconds === l.seconds && u.nanos === l.nanos);
  const s = "google.protobuf.Timestamp";
  n(s, "==", s, (u, l) => u.getTime() === l.getTime()), n(s, "-", s, (u, l) => lr.fromMilliseconds(u.getTime() - l.getTime()), i), n(s, "-", i, (u, l) => l.subtractTimestamp(u)), n(s, "+", i, (u, l) => l.extendTimestamp(u)), n(i, "+", s, (u, l) => u.extendTimestamp(l));
  function o(u, l, d, h) {
    if (l instanceof Set && l.has(u)) return !0;
    for (const p of l) if (us(u, p, h)) return !0;
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
      for (let g = 0; g < f; g++)
        if (!us(u[g], l[g], h)) return !1;
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
  }), n("map<K, V>", "==", "map<K, V>", (u, l, d, h) => {
    if (u instanceof Map && l instanceof Map) {
      if (u.size !== l.size) return !1;
      for (const [f, g] of u)
        if (!(l.has(f) && us(g, l.get(f), h))) return !1;
      return !0;
    }
    if (u instanceof Map || l instanceof Map) {
      const f = u instanceof Map ? l : u, g = u instanceof Map ? u : l, m = Object.keys(f);
      if (g.size !== m.length) return !1;
      for (const [S, v] of g)
        if (!(S in f && us(v, f[S], h))) return !1;
      return !0;
    }
    const p = Object.keys(u), y = Object.keys(l);
    if (p.length !== y.length) return !1;
    for (let f = 0; f < p.length; f++) {
      const g = p[f];
      if (!(g in l && us(u[g], l[g], h))) return !1;
    }
    return !0;
  }), n("uint", "==", "uint", (u, l) => u.valueOf() === l.valueOf()), n("dyn<uint>", "==", "double", (u, l) => u.valueOf() == l), n("dyn<uint>", "==", "int", (u, l) => u.valueOf() == l), n("uint", "+", "uint", (u, l) => new Rr(u.valueOf() + l.valueOf())), n("uint", "-", "uint", (u, l) => new Rr(u.valueOf() - l.valueOf())), n("uint", "*", "uint", (u, l) => new Rr(u.valueOf() * l.valueOf())), n("uint", "/", "uint", (u, l, d) => {
    if (l.valueOf() === 0n) throw new Q("division by zero", d);
    return new Rr(u.valueOf() / l.valueOf());
  }), n("uint", "%", "uint", (u, l, d) => {
    if (l.valueOf() === 0n) throw new Q("modulo by zero", d);
    return new Rr(u.valueOf() % l.valueOf());
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
function us(e, t, n) {
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
  throw new Q(`Cannot compare values of type ${typeof e}`);
}
class Rb {
  dynType = Zt.dyn;
  optionalType = Zt.optional;
  stringType = Zt.string;
  intType = Zt.int;
  doubleType = Zt.double;
  boolType = Zt.bool;
  nullType = Zt.null;
  listType = Zt.list;
  mapType = Zt.map;
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
        return t === null ? this.nullType : this.objectTypesByConstructor.get(t.constructor)?.type || Wp(this, t.constructor?.name || typeof t);
      default:
        Wp(this, typeof t);
    }
  }
}
function Wp(e, t) {
  throw new e.Error(`Unsupported type: ${t}`);
}
function Go(e, t, n, r, i) {
  return n instanceof Promise || r instanceof Promise ? Promise.all([n, r]).then((s) => i(e, t, s[0], s[1])) : i(e, t, n, r);
}
function qp(e, t, n) {
  const r = e.check(t.args[0], n);
  return t.op === "[]" && e.check(t.args[1], n), r.kind !== "optional" ? e.checkAccessOnType(t, n, r) : e.registry.getOptionalType(e.checkAccessOnType(t, n, r.valueType, !0));
}
function Gp(e, t, n) {
  const r = e.check(t.args[0], n);
  t.op === "[?]" && e.check(t.args[1], n);
  const i = r.kind === "optional" ? r.valueType : r;
  return e.registry.getOptionalType(e.checkAccessOnType(t, n, i, !0));
}
function Yp(e, t, n, r, i) {
  const s = e.check(r, t);
  if (s === n || n.isEmpty()) return s;
  if (s.isEmpty()) return n;
  let o;
  throw i === 0 ? o = "List elements must have the same type," : i === 1 ? o = "Map key uses wrong type," : i === 2 && (o = "Map value uses wrong type,"), new e.Error(
    `${o} expected type '${e.formatType(n)}' but found '${e.formatType(s)}'`,
    r
  );
}
function Zp(e, t, n, r) {
  return n.unify(e.registry, e.check(r, t)) || e.dynType;
}
function Ga(e, t, n) {
  const r = e.debugRuntimeType(t, n.checkedType);
  return new e.Error(`Logical operator requires bool operands, got '${r}'`, n);
}
function mA(e, t, n) {
  const r = e.debugRuntimeType(t, n.checkedType);
  return new e.Error(`Ternary condition must be bool, got '${r}'`, n);
}
function Xp(e, t, n, r) {
  if (n === !0) return e.eval(t.args[1], r);
  if (n === !1) return e.eval(t.args[2], r);
  throw mA(e, n, t.args[0]);
}
function Qp(e, t, n) {
  const r = e.debugRuntimeType(n, t.args[0].checkedType), i = e.registry.findUnaryOverload(t.op, r);
  if (i) return i.handler(n);
  throw new e.Error(`no such overload: ${t.op[0]}${r}`, t);
}
function Jp(e, t, n) {
  const r = e.eval(t.args[0], n);
  return r instanceof Promise ? r.then((i) => Qp(e, t, i)) : Qp(e, t, r);
}
function bA(e, t, n, r) {
  const i = e.debugOperandType(n, t.args[0].checkedType), s = e.debugOperandType(r, t.args[1].checkedType), o = e.registry.findBinaryOverload(t.op, i, s);
  if (o) return o.handler(n, r, t, e);
  throw new e.Error(`no such overload: ${i} ${t.op} ${s}`, t);
}
function EA(e, t, n) {
  return Go(e, t, e.eval(t.args[0], n), e.eval(t.args[1], n), bA);
}
function tg(e, t, n, r) {
  if (n === !0) return !0;
  const i = e.eval(t.args[1], r);
  return i instanceof Promise ? i.then((s) => eg(e, t, n, s)) : eg(e, t, n, i);
}
function eg(e, t, n, r) {
  if (r === !0) return !0;
  if (r !== !1) throw Ga(e, r, t.args[1]);
  if (n instanceof Error) throw n;
  if (n !== !1) throw Ga(e, n, t.args[0]);
  return !1;
}
function ng(e, t, n, r) {
  if (n === !1) return !1;
  const i = e.eval(t.args[1], r);
  return i instanceof Promise ? i.then((s) => rg(e, t, n, s)) : rg(e, t, n, i);
}
function rg(e, t, n, r) {
  if (r === !1) return !1;
  if (r !== !0) throw Ga(e, r, t.args[1]);
  if (n instanceof Error) throw n;
  if (n !== !0) throw Ga(e, n, t.args[0]);
  return !0;
}
function ig(e, t, n) {
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
function sg(e, t, n) {
  const r = t.op, i = e.check(t.args[0], n);
  if (i.kind === "dyn") return r === "!_" ? e.boolType : i;
  const s = e.registry.findUnaryOverload(r, i);
  if (s) return s.returnType;
  throw new e.Error(`no such overload: ${r[0]}${e.formatType(i)}`, t);
}
function xA(e, t, n) {
  const r = t.op, i = e.check(t.args[0], n), s = e.check(t.args[1], n), o = e.registry.checkBinaryOverload(r, i, s);
  if (o) return o;
  throw new e.Error(
    `no such overload: ${e.formatType(i)} ${r} ${e.formatType(s)}`,
    t
  );
}
function og(e, t, n) {
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
function TA(e, t, n, r) {
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
function vu(e, t, n, r = n.length) {
  let i;
  const s = new Array(r);
  for (; r--; ) (s[r] = e.eval(n[r], t)) instanceof Promise && (i ??= !0);
  return i ? Promise.all(s) : s;
}
function ag(e) {
  const t = {};
  for (let n = 0; n < e.length; n++) {
    const [r, i] = e[n];
    r === "__proto__" || r === "constructor" || r === "prototype" || (t[r] = i);
  }
  return t;
}
function $u(e, t, n, r) {
  return e.optionalType.field(n, r, t, e);
}
function ku(e, t, n, r) {
  return e.debugType(n).field(n, r, t, e);
}
const Ya = {
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
    check: qp,
    evaluate(e, t, n) {
      const r = e.eval(t.args[0], n);
      return r instanceof Promise ? r.then((i) => ku(e, t, i, t.args[1])) : ku(e, t, r, t.args[1]);
    }
  },
  ".?": {
    check: Gp,
    evaluate(e, t, n) {
      const r = e.eval(t.args[0], n);
      return r instanceof Promise ? r.then((i) => $u(e, t, i, t.args[1])) : $u(e, t, r, t.args[1]);
    }
  },
  "[]": {
    check: qp,
    evaluate(e, t, n) {
      return Go(e, t, e.eval(t.args[0], n), e.eval(t.args[1], n), ku);
    }
  },
  "[?]": {
    check: Gp,
    evaluate(e, t, n) {
      return Go(e, t, e.eval(t.args[0], n), e.eval(t.args[1], n), $u);
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
      const r = vu(e, n, t.args[1]);
      return r instanceof Promise ? r.then((i) => og(e, t, i)) : og(e, t, r);
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
      return t.macro ? t.macro.evaluate(e, t.macro, n) : Go(
        e,
        t,
        e.eval(t.args[1], n),
        vu(e, n, t.args[2]),
        TA
      );
    }
  },
  list: {
    check(e, t, n) {
      const r = t.args, i = r.length;
      if (i === 0) return e.getType("list<T>");
      let s = e.check(r[0], n);
      const o = e.opts.homogeneousAggregateLiterals ? Yp : Zp;
      for (let a = 1; a < i; a++) s = o(e, n, s, r[a], 0);
      return e.registry.getListType(s);
    },
    evaluate(e, t, n) {
      return vu(e, n, t.args);
    }
  },
  map: {
    check(e, t, n) {
      const r = t.args, i = r.length;
      if (i === 0) return e.getType("map<K, V>");
      const s = e.opts.homogeneousAggregateLiterals ? Yp : Zp;
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
      return o ? Promise.all(s).then(ag) : ag(s);
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
      return r instanceof Promise ? r.then((i) => Xp(e, t, i, n)) : Xp(e, t, r, n);
    }
  },
  "||": {
    check: ig,
    evaluate(e, t, n) {
      const r = e.tryEval(t.args[0], n);
      return r instanceof Promise ? r.then((i) => tg(e, t, i, n)) : tg(e, t, r, n);
    }
  },
  "&&": {
    check: ig,
    evaluate(e, t, n) {
      const r = e.tryEval(t.args[0], n);
      return r instanceof Promise ? r.then((i) => ng(e, t, i, n)) : ng(e, t, r, n);
    }
  },
  "!_": { check: sg, evaluate: Jp },
  "-_": { check: sg, evaluate: Jp }
}, SA = ["!=", "==", "in", "+", "-", "*", "/", "%", "<", "<=", ">", ">="];
for (const e of SA) Ya[e] = { check: xA, evaluate: EA };
for (const e in Ya) Ya[e].name = e;
const vA = (/* @__PURE__ */ new Map()).set("A", "dyn").set("T", "dyn").set("K", "dyn").set("V", "dyn");
class cg extends Rb {
  constructor(t, n) {
    super(t), this.isEvaluating = n, this.Error = n ? Q : Kk;
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
    return t.hasPlaceholder() ? t.templated(this.registry, vA).name : t.name;
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
class cd {
  #t;
  #e;
  constructor(t, n, r, i) {
    const s = Ya[r];
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
    return [this.op, ...t.map((n) => n instanceof cd ? n.toOldStructure() : n)];
  }
}
const Yo = {};
for (const e in D) Yo[D[e]] = e;
const $A = /* @__PURE__ */ new Set([
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
]), Ub = new Uint8Array(128);
for (const e of "0123456789abcdefABCDEF") Ub[e.charCodeAt(0)] = 1;
const ug = {
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
class kA {
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
      throw new yt(`Unexpected character: ${i}`, { pos: t, input: n });
    }
  }
  // Characters: 0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_
  _isIdentifierCharCode(t) {
    return t < 48 || t > 122 ? !1 : t >= 97 || t >= 65 && t <= 90 || t <= 57 || t === 95;
  }
  _parseAsDouble(t, n) {
    const r = Number(this.input.substring(t, n));
    if (Number.isFinite(r)) return { type: D.NUMBER, value: r, pos: t };
    throw new yt(`Invalid number: ${r}`, { pos: t, input: this.input });
  }
  _parseAsBigInt(t, n, r, i) {
    const s = this.input.substring(t, n);
    if (i === "u" || i === "U") {
      this.pos++;
      try {
        return {
          type: D.NUMBER,
          value: new Rr(s),
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
    throw new yt(r ? `Invalid hex integer: ${s}` : `Invalid integer: ${s}`, {
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
      if (r = this._readDigits(t, n, r), s === r) throw new yt("Invalid exponent", { pos: r, input: t });
    }
    return r;
  }
  readNumber() {
    const { input: t, length: n, pos: r } = this;
    let i = r;
    if (t[i] === "0" && (t[i + 1] === "x" || t[i + 1] === "X")) {
      for (i += 2; i < n && Ub[t[i].charCodeAt(0)]; ) i++;
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
          throw new yt("Newlines not allowed in single-quoted strings", { pos: s, input: r });
        case "\\":
          a++;
      }
      a++;
    }
    throw new yt("Unterminated string", { pos: s, input: r });
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
    throw new yt("Unterminated triple-quoted string", { pos: s, input: r });
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
      if (ug[s])
        r += ug[s], i += 2;
      else if (s === "u") {
        if (n) throw new yt("\\u not allowed in bytes literals");
        const o = t.substring(i + 2, i += 6);
        if (!/^[0-9a-fA-F]{4}$/.test(o)) throw new yt(`Invalid Unicode escape: \\u${o}`);
        const a = Number.parseInt(o, 16);
        if (a >= 55296 && a <= 57343) throw new yt(`Invalid Unicode surrogate: \\u${o}`);
        r += String.fromCharCode(a);
      } else if (s === "U") {
        if (n) throw new yt("\\U not allowed in bytes literals");
        const o = t.substring(i + 2, i += 10);
        if (!/^[0-9a-fA-F]{8}$/.test(o)) throw new yt(`Invalid Unicode escape: \\U${o}`);
        const a = Number.parseInt(o, 16);
        if (a > 1114111) throw new yt(`Invalid Unicode escape: \\U${o}`);
        if (a >= 55296 && a <= 57343) throw new yt(`Invalid Unicode surrogate: \\U${o}`);
        r += String.fromCodePoint(a);
      } else if (s === "x" || s === "X") {
        const o = t.substring(i + 2, i += 4);
        if (!/^[0-9a-fA-F]{2}$/.test(o)) throw new yt(`Invalid hex escape: \\${s}${o}`);
        r += String.fromCharCode(Number.parseInt(o, 16));
      } else if (s >= "0" && s <= "7") {
        const o = t.substring(i + 1, i += 4);
        if (!/^[0-7]{3}$/.test(o)) throw new yt("Octal escape must be 3 digits");
        const a = Number.parseInt(o, 8);
        if (a > 255) throw new yt(`Octal escape out of range: \\${o}`);
        r += String.fromCharCode(a);
      } else
        throw new yt(`Invalid escape sequence: \\${s}`);
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
class AA {
  constructor(t, n) {
    this.limits = t, this.registry = n;
  }
  #t(t, n = this.currentToken) {
    throw new yt(`Exceeded ${t} (${this.limits[t]})`, {
      pos: n.pos,
      input: this.input
    });
  }
  #e(t, n, r) {
    const i = new cd(t, this.input, n, r);
    return this.astNodesRemaining-- || this.#t("maxAstNodes", i), i;
  }
  #n() {
    const t = this.currentToken;
    return this.type = (this.currentToken = this.lexer.nextToken()).type, t;
  }
  consume(t) {
    if (this.type === t) return this.#n();
    throw new yt(
      `Expected ${Yo[t]}, got ${Yo[this.type]}`,
      { pos: this.currentToken.pos, input: this.input }
    );
  }
  match(t) {
    return this.type === t;
  }
  // Parse entry point
  parse(t) {
    this.input = t, this.lexer = new kA(t), this.#n(), this.maxDepthRemaining = this.limits.maxDepth, this.astNodesRemaining = this.limits.maxAstNodes;
    const n = this.parseExpression();
    if (this.match(D.EOF)) return n;
    throw new yt(`Unexpected character: '${this.input[this.lexer.pos - 1]}'`, {
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
    throw new yt(`Unexpected token: ${Yo[this.type]}`, {
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
    if ($A.has(t))
      throw new yt(`Reserved identifier: ${t}`, {
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
const ud = Object.freeze({
  maxAstNodes: 1e5,
  maxDepth: 250,
  maxListElements: 1e3,
  maxMapEntries: 1e3,
  maxCallArguments: 32
}), IA = new Set(Object.keys(ud));
function OA(e, t = ud) {
  const n = e ? Object.keys(e) : void 0;
  if (!n?.length) return t;
  const r = { ...t };
  for (const i of n) {
    if (!IA.has(i)) throw new TypeError(`Unknown limits option: ${i}`);
    const s = e[i];
    typeof s == "number" && (r[i] = s);
  }
  return Object.freeze(r);
}
const BA = Object.freeze({
  unlistedVariablesAreDyn: !1,
  homogeneousAggregateLiterals: !0,
  enableOptionalTypes: !1,
  limits: ud
});
function Au(e, t, n) {
  const r = e?.[n] ?? t?.[n];
  if (typeof r != "boolean") throw new TypeError(`Invalid option: ${n}`);
  return r;
}
function NA(e, t = BA) {
  return e ? Object.freeze({
    unlistedVariablesAreDyn: Au(e, t, "unlistedVariablesAreDyn"),
    homogeneousAggregateLiterals: Au(e, t, "homogeneousAggregateLiterals"),
    enableOptionalTypes: Au(e, t, "enableOptionalTypes"),
    limits: OA(e.limits, t.limits)
  }) : t;
}
const Lc = eA({ enableOptionalTypes: !1 });
Gk(Lc);
wA(Lc);
yA(Lc);
const lg = /* @__PURE__ */ new WeakMap();
class Qr {
  #t;
  #e;
  #n;
  #r;
  #i;
  #o;
  constructor(t, n) {
    this.opts = NA(t, n?.opts), this.#t = (n instanceof Qr ? lg.get(n) : Lc).clone(this.opts);
    const r = {
      objectTypes: this.#t.objectTypes,
      objectTypesByConstructor: this.#t.objectTypesByConstructor,
      registry: this.#t,
      opts: this.opts
    };
    this.#n = new cg(r), this.#r = new cg(r, !0), this.#e = new RA(r), this.#i = new AA(this.opts.limits, this.#t), this.#o = new nA(this.#t.variables, this.#t.constants), lg.set(this, this.#t), Object.freeze(this);
  }
  clone(t) {
    return new Qr(t, this);
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
class RA extends Rb {
  constructor(t) {
    super(t), this.Error = Q;
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
new Qr({
  unlistedVariablesAreDyn: !0
});
const ld = "amount", UA = "expiry", PA = "birth", CA = "weight", LA = "inputType", _A = "script", Ki = {
  signature: "now(): double",
  implementation: () => Math.floor(Date.now() / 1e3)
}, fg = new Qr().registerVariable(ld, "double").registerVariable(_A, "string").registerFunction(Ki.signature, Ki.implementation), DA = new Qr().registerVariable(ld, "double").registerVariable(UA, "double").registerVariable(PA, "double").registerVariable(CA, "double").registerVariable(LA, "string").registerFunction(Ki.signature, Ki.implementation), VA = new Qr().registerVariable(ld, "double").registerFunction(Ki.signature, Ki.implementation);
class ce {
  constructor(t) {
    this.value = t;
  }
  get satoshis() {
    return this.value ? Math.ceil(this.value) : 0;
  }
  add(t) {
    return new ce(this.value + t.value);
  }
}
ce.ZERO = new ce(0);
class MA {
  /**
   * Creates a new Estimator with the given config
   * @param config - Configuration containing CEL programs for fee calculation
   */
  constructor(t) {
    this.config = t, this.intentOffchainInput = t.offchainInput ? $o(t.offchainInput, DA) : void 0, this.intentOnchainInput = t.onchainInput ? $o(t.onchainInput, VA) : void 0, this.intentOffchainOutput = t.offchainOutput ? $o(t.offchainOutput, fg) : void 0, this.intentOnchainOutput = t.onchainOutput ? $o(t.onchainOutput, fg) : void 0;
  }
  /**
   * Evaluates the fee for a given vtxo input
   * @param input - The offchain input to evaluate
   * @returns The fee amount for this input
   */
  evalOffchainInput(t) {
    if (!this.intentOffchainInput)
      return ce.ZERO;
    const n = HA(t);
    return new ce(this.intentOffchainInput.program(n));
  }
  /**
   * Evaluates the fee for a given boarding input
   * @param input - The onchain input to evaluate
   * @returns The fee amount for this input
   */
  evalOnchainInput(t) {
    if (!this.intentOnchainInput)
      return ce.ZERO;
    const n = {
      amount: Number(t.amount)
    };
    return new ce(this.intentOnchainInput.program(n));
  }
  /**
   * Evaluates the fee for a given vtxo output
   * @param output - The output to evaluate
   * @returns The fee amount for this output
   */
  evalOffchainOutput(t) {
    if (!this.intentOffchainOutput)
      return ce.ZERO;
    const n = dg(t);
    return new ce(this.intentOffchainOutput.program(n));
  }
  /**
   * Evaluates the fee for a given collaborative exit output
   * @param output - The output to evaluate
   * @returns The fee amount for this output
   */
  evalOnchainOutput(t) {
    if (!this.intentOnchainOutput)
      return ce.ZERO;
    const n = dg(t);
    return new ce(this.intentOnchainOutput.program(n));
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
    let s = ce.ZERO;
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
function HA(e) {
  const t = {
    amount: Number(e.amount),
    inputType: e.type,
    weight: e.weight
  };
  return e.expiry && (t.expiry = Math.floor(e.expiry.getTime() / 1e3)), e.birth && (t.birth = Math.floor(e.birth.getTime() / 1e3)), t;
}
function dg(e) {
  return {
    amount: Number(e.amount),
    script: e.script
  };
}
function $o(e, t) {
  const n = t.parse(e), r = n.check();
  if (!r.valid)
    throw new Error(`type check failed: ${r.error?.message ?? "unknown error"}`);
  if (r.type !== "double")
    throw new Error(`expected return type double, got ${r.type}`);
  return { program: n, text: e };
}
const ls = {
  commitmentTxid: "",
  boardingTxid: "",
  arkTxid: ""
};
function FA(e, t, n) {
  const r = [...e].sort((c, u) => c.createdAt.getTime() - u.createdAt.getTime()), i = [];
  let s = [];
  for (const c of r)
    if (c.status.isLeaf ? !n.has(c.virtualStatus.commitmentTxIds[0]) && r.filter((u) => u.settledBy === c.virtualStatus.commitmentTxIds[0]).length === 0 && s.push({
      key: {
        ...ls,
        commitmentTxid: c.virtualStatus.commitmentTxIds[0]
      },
      tag: "batch",
      type: Sn.TxReceived,
      amount: c.value,
      settled: c.status.isLeaf || c.isSpent,
      createdAt: c.createdAt.getTime()
    }) : r.filter((u) => u.arkTxId === c.txid).length === 0 && s.push({
      key: { ...ls, arkTxid: c.txid },
      tag: "offchain",
      type: Sn.TxReceived,
      amount: c.value,
      settled: c.status.isLeaf || c.isSpent,
      createdAt: c.createdAt.getTime()
    }), c.isSpent) {
      if (c.arkTxId && !i.some((u) => u.key.arkTxid === c.arkTxId)) {
        const u = r.filter((h) => h.txid === c.arkTxId);
        let l = 0, d = 0;
        if (u.length > 0) {
          const h = u.reduce((f, g) => f + g.value, 0);
          l = r.filter((f) => f.arkTxId === c.arkTxId).reduce((f, g) => f + g.value, 0) - h, d = u[0].createdAt.getTime();
        } else
          l = c.value, d = c.createdAt.getTime() + 1;
        i.push({
          key: { ...ls, arkTxid: c.arkTxId },
          tag: "offchain",
          type: Sn.TxSent,
          amount: l,
          settled: !0,
          createdAt: d
        });
      }
      if (c.settledBy && !n.has(c.settledBy) && !i.some((u) => u.key.commitmentTxid === c.settledBy)) {
        const u = r.filter((h) => h.status.isLeaf && h.virtualStatus.commitmentTxIds?.every((p) => c.settledBy === p)), d = r.filter((h) => h.settledBy === c.settledBy).reduce((h, p) => h + p.value, 0);
        if (u.length > 0) {
          const h = u.reduce((p, y) => p + y.value, 0);
          d > h && i.push({
            key: { ...ls, commitmentTxid: c.settledBy },
            tag: "exit",
            type: Sn.TxSent,
            amount: d - h,
            settled: !0,
            createdAt: u[0].createdAt.getTime()
          });
        } else
          i.push({
            key: { ...ls, commitmentTxid: c.settledBy },
            tag: "exit",
            type: Sn.TxSent,
            amount: d,
            settled: !0,
            // TODO: fetch commitment tx with /v1/indexer/commitmentTx/<commitmentTxid> to know when the tx was made
            createdAt: c.createdAt.getTime() + 1
          });
      }
    }
  return [...t.map((c) => ({ ...c, tag: "boarding" })), ...i, ...s].sort((c, u) => u.createdAt - c.createdAt);
}
const _c = "arkade-service-worker", Yn = "vtxos", Zn = "utxos", Xn = "transactions", li = "walletState", tn = "contracts", en = "contractsCollections", hg = 2;
function jA(e) {
  if (!e.objectStoreNames.contains(Yn)) {
    const t = e.createObjectStore(Yn, {
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
  if (!e.objectStoreNames.contains(Zn)) {
    const t = e.createObjectStore(Zn, {
      keyPath: ["address", "txid", "vout"]
    });
    t.indexNames.contains("address") || t.createIndex("address", "address", {
      unique: !1
    }), t.indexNames.contains("txid") || t.createIndex("txid", "txid", { unique: !1 }), t.indexNames.contains("value") || t.createIndex("value", "value", { unique: !1 }), t.indexNames.contains("status") || t.createIndex("status", "status", {
      unique: !1
    });
  }
  if (!e.objectStoreNames.contains(Xn)) {
    const t = e.createObjectStore(Xn, {
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
  return e.objectStoreNames.contains(li) || e.createObjectStore(li, {
    keyPath: "key"
  }), e.objectStoreNames.contains(tn) || e.createObjectStore(tn, {
    keyPath: "key"
  }), e.objectStoreNames.contains(en) || e.createObjectStore(en, {
    keyPath: "key"
  }), e;
}
function KA() {
  if (typeof globalThis < "u")
    return typeof globalThis.self == "object" && globalThis.self !== null ? { globalObject: globalThis.self } : typeof globalThis.window == "object" && globalThis.window !== null ? { globalObject: globalThis.window } : { globalObject: globalThis };
  throw new Error("Global object not found");
}
const Za = ([e, t]) => ({
  cb: V.encode(on.encode(e)),
  s: V.encode(t)
}), zA = (e) => ({
  ...e,
  tapTree: V.encode(e.tapTree),
  forfeitTapLeafScript: Za(e.forfeitTapLeafScript),
  intentTapLeafScript: Za(e.intentTapLeafScript),
  extraWitness: e.extraWitness?.map(V.encode)
}), WA = (e) => ({
  ...e,
  tapTree: V.encode(e.tapTree),
  forfeitTapLeafScript: Za(e.forfeitTapLeafScript),
  intentTapLeafScript: Za(e.intentTapLeafScript),
  extraWitness: e.extraWitness?.map(V.encode)
}), Xa = (e) => {
  const t = on.decode(V.decode(e.cb)), n = V.decode(e.s);
  return [t, n];
}, qA = (e) => ({
  ...e,
  createdAt: new Date(e.createdAt),
  tapTree: V.decode(e.tapTree),
  forfeitTapLeafScript: Xa(e.forfeitTapLeafScript),
  intentTapLeafScript: Xa(e.intentTapLeafScript),
  extraWitness: e.extraWitness?.map(V.decode)
}), GA = (e) => ({
  ...e,
  tapTree: V.decode(e.tapTree),
  forfeitTapLeafScript: Xa(e.forfeitTapLeafScript),
  intentTapLeafScript: Xa(e.intentTapLeafScript),
  extraWitness: e.extraWitness?.map(V.decode)
}), Bs = /* @__PURE__ */ new Map(), Ei = /* @__PURE__ */ new Map();
async function Pb(e = _c) {
  const { globalObject: t } = KA();
  if (!t.indexedDB)
    throw new Error("IndexedDB is not available in this environment");
  const n = Bs.get(e);
  if (n)
    return Ei.set(e, (Ei.get(e) ?? 0) + 1), n;
  const r = new Promise((i, s) => {
    const o = t.indexedDB.open(e, hg);
    console.log("Opening DB with version:", hg), o.onerror = () => {
      Bs.delete(e), s(o.error);
    }, o.onsuccess = () => {
      console.log("Opened DB, actual version:", o.result.version), i(o.result);
    }, o.onupgradeneeded = () => {
      const a = o.result;
      jA(a);
    }, o.onblocked = () => {
      console.warn("Database upgrade blocked - close other tabs/connections");
    };
  });
  return Bs.set(e, r), Ei.set(e, 1), r;
}
async function Cb(e = _c) {
  const t = Bs.get(e);
  if (!t)
    return !1;
  const n = (Ei.get(e) ?? 1) - 1;
  if (n > 0)
    return Ei.set(e, n), !1;
  Ei.delete(e), Bs.delete(e);
  try {
    (await t).close();
  } catch {
  }
  return !0;
}
const Iu = (e, t) => `contract:${e}:${t}`, Ou = (e) => `collection:${e}`;
class Lb {
  constructor(t = _c) {
    this.dbName = t, this.db = null;
  }
  async [Symbol.asyncDispose]() {
    this.db && (await Cb(this.dbName), this.db = null);
  }
  async getContractData(t, n) {
    try {
      const r = await this.getDB();
      return new Promise((i, s) => {
        const c = r.transaction([tn], "readonly").objectStore(tn).get(Iu(t, n));
        c.onerror = () => s(c.error), c.onsuccess = () => {
          const u = c.result;
          if (!u?.value)
            return i(null);
          try {
            i(JSON.parse(u.value));
          } catch (l) {
            s(l);
          }
        };
      });
    } catch (r) {
      return console.error(`Failed to get contract data for ${t}:${n}:`, r), null;
    }
  }
  async setContractData(t, n, r) {
    try {
      const i = await this.getDB();
      return new Promise((s, o) => {
        const u = i.transaction([tn], "readwrite").objectStore(tn).put({
          key: Iu(t, n),
          value: JSON.stringify(r)
        });
        u.onerror = () => o(u.error), u.onsuccess = () => s();
      });
    } catch (i) {
      throw console.error(`Failed to set contract data for ${t}:${n}:`, i), i;
    }
  }
  async deleteContractData(t, n) {
    try {
      const r = await this.getDB();
      return new Promise((i, s) => {
        const c = r.transaction([tn], "readwrite").objectStore(tn).delete(Iu(t, n));
        c.onerror = () => s(c.error), c.onsuccess = () => i();
      });
    } catch (r) {
      throw console.error(`Failed to delete contract data for ${t}:${n}:`, r), r;
    }
  }
  async clearContractData() {
    try {
      const t = await this.getDB();
      return new Promise((n, r) => {
        const i = t.transaction([tn, en], "readwrite"), s = i.objectStore(tn), o = i.objectStore(en), a = s.clear(), c = o.clear();
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
  async getContractCollection(t) {
    try {
      const n = await this.getDB();
      return new Promise((r, i) => {
        const a = n.transaction([en], "readonly").objectStore(en).get(Ou(t));
        a.onerror = () => i(a.error), a.onsuccess = () => {
          const c = a.result;
          if (!c?.value)
            return r([]);
          try {
            r(JSON.parse(c.value));
          } catch (u) {
            i(u);
          }
        };
      });
    } catch (n) {
      return console.error(`Failed to get contract collection ${t}:`, n), [];
    }
  }
  async saveToContractCollection(t, n, r) {
    const i = n[r];
    if (i == null)
      throw new Error(`Item is missing required field '${String(r)}'`);
    try {
      const s = await this.getDB();
      return new Promise((o, a) => {
        const u = s.transaction([en], "readwrite").objectStore(en), l = Ou(t), d = u.get(l);
        d.onerror = () => a(d.error), d.onsuccess = () => {
          try {
            const h = d.result, p = h?.value ? JSON.parse(h.value) : [], y = p.findIndex((m) => m[r] === i), f = y !== -1 ? p.map((m, S) => S === y ? n : m) : [...p, n], g = u.put({
              key: l,
              value: JSON.stringify(f)
            });
            g.onerror = () => a(g.error), g.onsuccess = () => o();
          } catch (h) {
            a(h);
          }
        };
      });
    } catch (s) {
      throw console.error(`Failed to save to contract collection ${t}:`, s), s;
    }
  }
  async removeFromContractCollection(t, n, r) {
    if (n == null)
      throw new Error(`Invalid id provided for removal: ${String(n)}`);
    try {
      const i = await this.getDB();
      return new Promise((s, o) => {
        const c = i.transaction([en], "readwrite").objectStore(en), u = Ou(t), l = c.get(u);
        l.onerror = () => o(l.error), l.onsuccess = () => {
          try {
            const d = l.result, p = (d?.value ? JSON.parse(d.value) : []).filter((f) => f[r] !== n), y = c.put({
              key: u,
              value: JSON.stringify(p)
            });
            y.onerror = () => o(y.error), y.onsuccess = () => s();
          } catch (d) {
            o(d);
          }
        };
      });
    } catch (i) {
      throw console.error(`Failed to remove from contract collection ${t}:`, i), i;
    }
  }
  async getDB() {
    return this.db ? this.db : (this.db = await Pb(this.dbName), this.db);
  }
}
class YA {
  constructor(t = _c) {
    this.dbName = t, this.db = null;
  }
  async [Symbol.asyncDispose]() {
    this.db && (await Cb(this.dbName), this.db = null);
  }
  async getVtxos(t) {
    try {
      const n = await this.getDB();
      return new Promise((r, i) => {
        const c = n.transaction([Yn], "readonly").objectStore(Yn).index("address").getAll(t);
        c.onerror = () => i(c.error), c.onsuccess = () => {
          const l = (c.result || []).map(qA);
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
        const o = r.transaction([Yn], "readwrite"), a = o.objectStore(Yn), c = n.map((u) => new Promise((l, d) => {
          const h = zA(u), p = {
            address: t,
            ...h
          }, y = a.put(p);
          y.onerror = () => d(y.error), y.onsuccess = () => l();
        }));
        Promise.all(c).then(() => i()).catch(s), o.onerror = () => s(o.error);
      });
    } catch (r) {
      throw console.error(`Failed to save VTXOs for address ${t}:`, r), r;
    }
  }
  async clearVtxos(t) {
    try {
      const n = await this.getDB();
      return new Promise((r, i) => {
        const c = n.transaction([Yn], "readwrite").objectStore(Yn).index("address").openCursor(IDBKeyRange.only(t));
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
        const c = n.transaction([Zn], "readonly").objectStore(Zn).index("address").getAll(t);
        c.onerror = () => i(c.error), c.onsuccess = () => {
          const l = (c.result || []).map(GA);
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
        const o = r.transaction([Zn], "readwrite"), a = o.objectStore(Zn), c = n.map((u) => new Promise((l, d) => {
          const h = WA(u), p = {
            address: t,
            ...h
          }, y = a.put(p);
          y.onerror = () => d(y.error), y.onsuccess = () => l();
        }));
        Promise.all(c).then(() => i()).catch(s), o.onerror = () => s(o.error);
      });
    } catch (r) {
      throw console.error(`Failed to save UTXOs for address ${t}:`, r), r;
    }
  }
  async clearUtxos(t) {
    try {
      const n = await this.getDB();
      return new Promise((r, i) => {
        const c = n.transaction([Zn], "readwrite").objectStore(Zn).index("address").openCursor(IDBKeyRange.only(t));
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
        const c = n.transaction([Xn], "readonly").objectStore(Xn).index("address").getAll(t);
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
        const o = r.transaction([Xn], "readwrite"), a = o.objectStore(Xn);
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
  async clearTransactions(t) {
    try {
      const n = await this.getDB();
      return new Promise((r, i) => {
        const c = n.transaction([Xn], "readwrite").objectStore(Xn).index("address").openCursor(IDBKeyRange.only(t));
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
        const o = t.transaction([li], "readonly").objectStore(li).get("state");
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
        const o = n.transaction([li], "readwrite").objectStore(li), a = {
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
    return this.db ? this.db : (this.db = await Pb(this.dbName), this.db);
  }
}
function ZA(e) {
  return typeof e == "object" && e !== null && "toReadonly" in e && typeof e.toReadonly == "function";
}
class xi {
  constructor(t, n, r, i, s, o, a, c, u, l) {
    this.identity = t, this.network = n, this.onchainProvider = r, this.indexerProvider = i, this.arkServerPublicKey = s, this.offchainTapscript = o, this.boardingTapscript = a, this.dustAmount = c, this.walletRepository = u, this.contractRepository = l;
  }
  /**
   * Protected helper to set up shared wallet configuration.
   * Extracts common logic used by both ReadonlyWallet.create() and Wallet.create().
   */
  static async setupWalletConfig(t, n) {
    const r = t.arkProvider || (() => {
      if (!t.arkServerUrl)
        throw new Error("Either arkProvider or arkServerUrl must be provided");
      return new ck(t.arkServerUrl);
    })(), i = t.arkServerUrl || r.serverUrl;
    if (!i)
      throw new Error("Could not determine arkServerUrl from provider");
    const s = t.indexerUrl || i, o = t.indexerProvider || new Fk(s), a = await r.getInfo(), c = pk(a.network), u = t.esploraUrl || yk[a.network], l = t.onchainProvider || new wk(u);
    if (t.exitTimelock) {
      const { value: v, type: O } = t.exitTimelock;
      if (v < 512n && O !== "blocks" || v >= 512n && O !== "seconds")
        throw new Error("invalid exitTimelock");
    }
    const d = t.exitTimelock ?? {
      value: a.unilateralExitDelay,
      type: a.unilateralExitDelay < 512n ? "blocks" : "seconds"
    };
    if (t.boardingTimelock) {
      const { value: v, type: O } = t.boardingTimelock;
      if (v < 512n && O !== "blocks" || v >= 512n && O !== "seconds")
        throw new Error("invalid boardingTimelock");
    }
    const h = t.boardingTimelock ?? {
      value: a.boardingExitDelay,
      type: a.boardingExitDelay < 512n ? "blocks" : "seconds"
    }, p = V.decode(a.signerPubkey).slice(1), y = new za.Script({
      pubKey: n,
      serverPubKey: p,
      csvTimelock: d
    }), f = new za.Script({
      pubKey: n,
      serverPubKey: p,
      csvTimelock: h
    }), g = y, m = t.storage?.walletRepository ?? new YA(), S = t.storage?.contractRepository ?? new Lb();
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
      walletRepository: m,
      contractRepository: S,
      info: a
    };
  }
  static async create(t) {
    const n = await t.identity.xOnlyPublicKey();
    if (!n)
      throw new Error("Invalid configured public key");
    const r = await xi.setupWalletConfig(t, n);
    return new xi(t.identity, r.network, r.onchainProvider, r.indexerProvider, r.serverPubKey, r.offchainTapscript, r.boardingTapscript, r.dustAmount, r.walletRepository, r.contractRepository);
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
    s = n.filter((l) => l.virtualStatus.state === "settled").reduce((l, d) => l + d.value, 0), o = n.filter((l) => l.virtualStatus.state === "preconfirmed").reduce((l, d) => l + d.value, 0), a = n.filter((l) => zo(l) && l.virtualStatus.state === "swept").reduce((l, d) => l + d.value, 0);
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
    const n = await this.getAddress(), i = (await this.getVirtualCoins(t)).map((s) => As(this, s));
    return await this.walletRepository.saveVtxos(n, i), i;
  }
  async getVirtualCoins(t = { withRecoverable: !0, withUnrolled: !1 }) {
    const n = [V.encode(this.offchainTapscript.pkScript)], i = (await this.indexerProvider.getVtxos({ scripts: n })).vtxos;
    let s = i.filter(zo);
    if (t.withRecoverable || (s = s.filter((o) => !Eb(o) && !q$(o))), t.withUnrolled) {
      const o = i.filter((a) => !zo(a));
      s.push(...o.filter((a) => a.isUnrolled));
    }
    return s;
  }
  async getTransactionHistory() {
    const t = await this.indexerProvider.getVtxos({
      scripts: [V.encode(this.offchainTapscript.pkScript)]
    }), { boardingTxs: n, commitmentsToIgnore: r } = await this.getBoardingTxs();
    return FA(t.vtxos, n, r);
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
        type: Sn.TxReceived,
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
    const t = await this.getBoardingAddress(), r = (await this.onchainProvider.getCoins(t)).map((i) => jk(this, i));
    return await this.walletRepository.saveUtxos(t, r), r;
  }
  async notifyIncomingFunds(t) {
    const n = await this.getAddress(), r = await this.getBoardingAddress();
    let i, s;
    if (this.onchainProvider && r) {
      const a = (c) => c.vout.findIndex((u) => u.scriptpubkey_address === r);
      i = await this.onchainProvider.watchAddresses([r], (c) => {
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
    if (this.indexerProvider && n) {
      const a = this.offchainTapscript, c = await this.indexerProvider.subscribeForScripts([
        V.encode(a.pkScript)
      ]), u = new AbortController(), l = this.indexerProvider.getSubscription(c, u.signal);
      s = async () => {
        u.abort(), await this.indexerProvider?.unsubscribeForScripts(c);
      }, (async () => {
        try {
          for await (const d of l)
            (d.newVtxos?.length > 0 || d.spentVtxos?.length > 0) && t({
              type: "vtxo",
              newVtxos: d.newVtxos.map((h) => As(this, h)),
              spentVtxos: d.spentVtxos.map((h) => As(this, h))
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
    const t = [V.encode(this.offchainTapscript.pkScript)];
    let { vtxos: n } = await this.indexerProvider.getVtxos({
      scripts: t
    });
    return n.filter((r) => r.virtualStatus.state !== "swept" && r.virtualStatus.state !== "settled" && r.arkTxId !== void 0).map((r) => r.arkTxId);
  }
}
class Ks extends xi {
  constructor(t, n, r, i, s, o, a, c, u, l, d, h, p, y, f, g) {
    super(t, n, i, o, a, c, u, p, y, f), this.networkName = r, this.arkProvider = s, this.serverUnrollScript = l, this.forfeitOutputScript = d, this.forfeitPubkey = h, this.identity = t, this.renewalConfig = {
      enabled: g?.enabled ?? !1,
      ...Dk,
      ...g
    };
  }
  static async create(t) {
    const n = await t.identity.xOnlyPublicKey();
    if (!n)
      throw new Error("Invalid configured public key");
    const r = await xi.setupWalletConfig(t, n);
    let i;
    try {
      const c = V.decode(r.info.checkpointTapscript);
      i = ge.decode(c);
    } catch {
      throw new Error("Invalid checkpointTapscript from server");
    }
    const s = V.decode(r.info.forfeitPubkey).slice(1), o = Zr(r.network).decode(r.info.forfeitAddress), a = It.encode(o);
    return new Ks(t.identity, r.network, r.networkName, r.onchainProvider, r.arkProvider, r.indexerProvider, r.serverPubKey, r.offchainTapscript, r.boardingTapscript, i, a, s, r.dustAmount, r.walletRepository, r.contractRepository, t.renewalConfig);
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
    const t = ZA(this.identity) ? await this.identity.toReadonly() : this.identity;
    return new xi(t, this.network, this.onchainProvider, this.indexerProvider, this.arkServerPublicKey, this.offchainTapscript, this.boardingTapscript, this.dustAmount, this.walletRepository, this.contractRepository);
  }
  async sendBitcoin(t) {
    if (t.amount <= 0)
      throw new Error("Amount must be positive");
    if (!QA(t.address))
      throw new Error("Invalid Ark address " + t.address);
    const n = await this.getVirtualCoins({
      withRecoverable: !1
    });
    let r;
    if (t.selectedVtxos) {
      const y = t.selectedVtxos.map((g) => g.value).reduce((g, m) => g + m, 0);
      if (y < t.amount)
        throw new Error("Selected VTXOs do not cover specified amount");
      const f = y - t.amount;
      r = {
        inputs: t.selectedVtxos,
        changeAmount: BigInt(f)
      };
    } else
      r = JA(n, t.amount);
    const i = this.offchainTapscript.forfeit();
    if (!i)
      throw new Error("Selected leaf not found");
    const s = jr.decode(t.address), a = [
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
    const c = this.offchainTapscript.encode(), u = Uk(r.inputs.map((y) => ({
      ...y,
      tapLeafScript: i,
      tapTree: c
    })), a, this.serverUnrollScript), l = await this.identity.sign(u.arkTx), { arkTxid: d, signedCheckpointTxs: h } = await this.arkProvider.submitTx(Mt.encode(l.toPSBT()), u.checkpoints.map((y) => Mt.encode(y.toPSBT()))), p = await Promise.all(h.map(async (y) => {
      const f = Ce.fromPSBT(Mt.decode(y)), g = await this.identity.sign(f);
      return Mt.encode(g.toPSBT());
    }));
    await this.arkProvider.finalizeTx(d, p);
    try {
      const y = [], f = /* @__PURE__ */ new Set();
      let g = Number.MAX_SAFE_INTEGER;
      for (const [v, O] of r.inputs.entries()) {
        const R = As(this, O), j = h[v], b = Ce.fromPSBT(Mt.decode(j));
        if (y.push({
          ...R,
          virtualStatus: { ...R.virtualStatus, state: "spent" },
          spentBy: b.id,
          arkTxId: d,
          isSpent: !0
        }), R.virtualStatus.commitmentTxIds)
          for (const W of R.virtualStatus.commitmentTxIds)
            f.add(W);
        R.virtualStatus.batchExpiry && (g = Math.min(g, R.virtualStatus.batchExpiry));
      }
      const m = Date.now(), S = this.arkAddress.encode();
      if (r.changeAmount > 0n && g !== Number.MAX_SAFE_INTEGER) {
        const v = {
          txid: d,
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
            commitmentTxIds: Array.from(f),
            batchExpiry: g
          },
          status: {
            confirmed: !1
          }
        };
        await this.walletRepository.saveVtxos(S, [v]);
      }
      await this.walletRepository.saveVtxos(S, y), await this.walletRepository.saveTransactions(S, [
        {
          key: {
            boardingTxid: "",
            commitmentTxid: "",
            arkTxid: d
          },
          amount: t.amount,
          type: Sn.TxSent,
          settled: !1,
          createdAt: Date.now()
        }
      ]);
    } catch (y) {
      console.warn("error saving offchain tx to repository", y);
    } finally {
      return d;
    }
  }
  async settle(t, n) {
    if (t?.inputs) {
      for (const y of t.inputs)
        if (typeof y == "string")
          try {
            $t.fromString(y);
          } catch {
            throw new Error(`Invalid arknote "${y}"`);
          }
    }
    if (!t) {
      const { fees: y } = await this.arkProvider.getInfo(), f = new MA(y.intentFee);
      let g = 0;
      const S = ge.decode(V.decode(this.boardingTapscript.exitScript)).params.timelock, v = (await this.getBoardingUtxos()).filter((Y) => !Lk(Y, S)), O = [];
      for (const Y of v) {
        const et = f.evalOnchainInput({
          amount: BigInt(Y.value)
        });
        et.value >= Y.value || (O.push(Y), g += Y.value - et.satoshis);
      }
      const R = await this.getVtxos({ withRecoverable: !0 }), j = [];
      for (const Y of R) {
        const et = f.evalOffchainInput({
          amount: BigInt(Y.value),
          type: Y.virtualStatus.state === "swept" ? "recoverable" : "vtxo",
          weight: 0,
          birth: Y.createdAt,
          expiry: Y.virtualStatus.batchExpiry ? new Date(Y.virtualStatus.batchExpiry * 1e3) : /* @__PURE__ */ new Date()
        });
        et.value >= Y.value || (j.push(Y), g += Y.value - et.satoshis);
      }
      const b = [...O, ...j];
      if (b.length === 0)
        throw new Error("No inputs found");
      const W = {
        address: await this.getAddress(),
        amount: BigInt(g)
      }, U = f.evalOffchainOutput({
        amount: W.amount,
        script: V.encode(jr.decode(W.address).pkScript)
      });
      if (W.amount -= BigInt(U.satoshis), W.amount <= this.dustAmount)
        throw new Error("Output amount is below dust limit");
      t = {
        inputs: b,
        outputs: [W]
      };
    }
    const r = [], i = [];
    let s = !1;
    for (const [y, f] of t.outputs.entries()) {
      let g;
      try {
        g = jr.decode(f.address).pkScript, s = !0;
      } catch {
        const m = Zr(this.network).decode(f.address);
        g = It.encode(m), r.push(y);
      }
      i.push({
        amount: f.amount,
        script: g
      });
    }
    let o;
    const a = [];
    s && (o = this.identity.signerSession(), a.push(V.encode(await o.getPublicKey())));
    const [c, u] = await Promise.all([
      this.makeRegisterIntentSignature(t.inputs, i, r, a),
      this.makeDeleteIntentSignature(t.inputs)
    ]), l = await this.safeRegisterIntent(c), d = [
      ...a,
      ...t.inputs.map((y) => `${y.txid}:${y.vout}`)
    ], h = this.createBatchHandler(l, t.inputs, o), p = new AbortController();
    try {
      const y = this.arkProvider.getEventStream(p.signal, d);
      return await _l.join(y, h, {
        abortController: p,
        skipVtxoTreeSigning: !s,
        eventCallback: n ? (f) => Promise.resolve(n(f)) : void 0
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
    let a = Ce.fromPSBT(Mt.decode(t.commitmentTx)), c = !1, u = 0;
    const l = i?.leaves() || [];
    for (const d of n) {
      const h = o.find((v) => v.txid === d.txid && v.vout === d.vout);
      if (!h) {
        for (let v = 0; v < a.inputsLength; v++) {
          const O = a.getInput(v);
          if (!O.txid || O.index === void 0)
            throw new Error("The server returned incomplete data. No settlement input found in the PSBT");
          if (V.encode(O.txid) === d.txid && O.index === d.vout) {
            a.updateInput(v, {
              tapLeafScript: [d.forfeitTapLeafScript]
            }), a = await this.identity.sign(a, [
              v
            ]), c = !0;
            break;
          }
        }
        continue;
      }
      if (Eb(h) || G$(h, this.dustAmount))
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
      let S = Tk([
        {
          txid: d.txid,
          index: d.vout,
          witnessUtxo: {
            amount: BigInt(h.value),
            script: ve.decode(d.tapTree).pkScript
          },
          sighashType: Hi.DEFAULT,
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
      S = await this.identity.sign(S, [0]), s.push(Mt.encode(S.toPSBT()));
    }
    (s.length > 0 || c) && await this.arkProvider.submitSignedForfeitTxs(s, c ? Mt.encode(a.toPSBT()) : void 0);
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
        const o = new TextEncoder().encode(t), a = Ft(o), c = V.encode(a);
        let u = !0;
        for (const d of s.intentIdHashes)
          if (d === c) {
            if (!this.arkProvider)
              throw new Error("Ark provider not configured");
            await this.arkProvider.confirmRegistration(t), u = !1;
          }
        if (u)
          return { skip: u };
        const l = ge.encode({
          timelock: {
            value: s.batchExpiry,
            type: s.batchExpiry >= 512n ? "seconds" : "blocks"
          },
          pubkeys: [this.forfeitPubkey]
        }).script;
        return i = vs(l), { skip: !1 };
      },
      onTreeSigningStarted: async (s, o) => {
        if (!r)
          return { skip: !0 };
        if (!i)
          throw new Error("Sweep tap tree root not set");
        const a = s.cosignersPublicKeys.map((y) => y.slice(2)), u = (await r.getPublicKey()).subarray(1);
        if (!a.includes(V.encode(u)))
          return { skip: !0 };
        const l = Ce.fromPSBT(Mt.decode(s.unsignedCommitmentTx));
        Rk(o, l, i);
        const d = l.getOutput(0);
        if (!d?.amount)
          throw new Error("Shared output not found");
        await r.init(o, i, d.amount);
        const h = V.encode(await r.getPublicKey()), p = await r.getNonces();
        return await this.arkProvider.submitTreeNonces(s.id, h, p), { skip: !1 };
      },
      onTreeNonces: async (s) => {
        if (!r)
          return { fullySigned: !0 };
        const { hasAllNonces: o } = await r.aggregatedNonces(s.txid, s.nonces);
        if (!o)
          return { fullySigned: !1 };
        const a = await r.sign(), c = V.encode(await r.getPublicKey());
        return await this.arkProvider.submitTreeSignatures(s.id, c, a), { fullySigned: !0 };
      },
      onBatchFinalization: async (s, o, a) => {
        if (!this.forfeitOutputScript)
          throw new Error("Forfeit output script not set");
        a && Nk(s.commitmentTx, a), await this.handleSettlementFinalizationEvent(s, n, this.forfeitOutputScript, a);
      }
    };
  }
  async safeRegisterIntent(t) {
    try {
      return await this.arkProvider.registerIntent(t);
    } catch (n) {
      if (n instanceof xb && n.code === 0 && n.message.includes("duplicated input")) {
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
    }, a = ur.create(o, s, n), c = await this.identity.sign(a);
    return {
      proof: Mt.encode(c.toPSBT()),
      message: o
    };
  }
  async makeDeleteIntentSignature(t) {
    const n = this.prepareIntentProofInputs(t), r = {
      type: "delete",
      expire_at: 0
    }, i = ur.create(r, n, []), s = await this.identity.sign(i);
    return {
      proof: Mt.encode(s.toPSBT()),
      message: r
    };
  }
  async makeGetPendingTxIntentSignature(t) {
    const n = this.prepareIntentProofInputs(t), r = {
      type: "get-pending-tx",
      expire_at: 0
    }, i = ur.create(r, n, []), s = await this.identity.sign(i);
    return {
      proof: Mt.encode(s.toPSBT()),
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
      const s = [V.encode(this.offchainTapscript.pkScript)];
      let { vtxos: o } = await this.indexerProvider.getVtxos({
        scripts: s
      });
      if (o = o.filter((a) => a.virtualStatus.state !== "swept" && a.virtualStatus.state !== "settled"), o.length === 0)
        return { finalized: [], pending: [] };
      t = o.map((a) => As(this, a));
    }
    const r = [], i = [];
    for (let s = 0; s < t.length; s += 20) {
      const o = t.slice(s, s + 20), a = await this.makeGetPendingTxIntentSignature(o), c = await this.arkProvider.getPendingTxs(a);
      for (const u of c) {
        i.push(u.arkTxid);
        try {
          const l = await Promise.all(u.signedCheckpointTxs.map(async (d) => {
            const h = Ce.fromPSBT(Mt.decode(d)), p = await this.identity.sign(h);
            return Mt.encode(p.toPSBT());
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
      const i = ve.decode(r.tapTree), s = XA(r.intentTapLeafScript), o = [mb.encode(r.tapTree)];
      r.extraWitness && o.push(K$.encode(r.extraWitness)), n.push({
        txid: V.decode(r.txid),
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
Ks.MIN_FEE_RATE = 1;
function XA(e) {
  let t;
  try {
    const n = e[1], r = n.subarray(0, n.length - 1);
    try {
      const i = ge.decode(r).params;
      t = Pl.encode(i.timelock.type === "blocks" ? { blocks: Number(i.timelock.value) } : { seconds: Number(i.timelock.value) });
    } catch {
      const i = Fi.decode(r).params;
      t = Number(i.absoluteTimelock);
    }
  } catch {
  }
  return t;
}
function QA(e) {
  try {
    return jr.decode(e), !0;
  } catch {
    return !1;
  }
}
function JA(e, t) {
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
function pg() {
  const e = crypto.getRandomValues(new Uint8Array(16));
  return V.encode(e);
}
var gg;
(function(e) {
  e.walletInitialized = (w) => ({
    type: "WALLET_INITIALIZED",
    success: !0,
    id: w
  });
  function t(w, E) {
    return {
      type: "ERROR",
      success: !1,
      message: E,
      id: w
    };
  }
  e.error = t;
  function n(w, E) {
    return {
      type: "SETTLE_EVENT",
      success: !0,
      event: E,
      id: w
    };
  }
  e.settleEvent = n;
  function r(w, E) {
    return {
      type: "SETTLE_SUCCESS",
      success: !0,
      txid: E,
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
  function a(w, E) {
    return {
      type: "ADDRESS",
      success: !0,
      address: E,
      id: w
    };
  }
  e.address = a;
  function c(w, E) {
    return {
      type: "BOARDING_ADDRESS",
      success: !0,
      address: E,
      id: w
    };
  }
  e.boardingAddress = c;
  function u(w) {
    return w.type === "BALANCE" && w.success === !0;
  }
  e.isBalance = u;
  function l(w, E) {
    return {
      type: "BALANCE",
      success: !0,
      balance: E,
      id: w
    };
  }
  e.balance = l;
  function d(w) {
    return w.type === "VTXOS" && w.success === !0;
  }
  e.isVtxos = d;
  function h(w, E) {
    return {
      type: "VTXOS",
      success: !0,
      vtxos: E,
      id: w
    };
  }
  e.vtxos = h;
  function p(w) {
    return w.type === "VIRTUAL_COINS" && w.success === !0;
  }
  e.isVirtualCoins = p;
  function y(w, E) {
    return {
      type: "VIRTUAL_COINS",
      success: !0,
      virtualCoins: E,
      id: w
    };
  }
  e.virtualCoins = y;
  function f(w) {
    return w.type === "BOARDING_UTXOS" && w.success === !0;
  }
  e.isBoardingUtxos = f;
  function g(w, E) {
    return {
      type: "BOARDING_UTXOS",
      success: !0,
      boardingUtxos: E,
      id: w
    };
  }
  e.boardingUtxos = g;
  function m(w) {
    return w.type === "SEND_BITCOIN_SUCCESS" && w.success === !0;
  }
  e.isSendBitcoinSuccess = m;
  function S(w, E) {
    return {
      type: "SEND_BITCOIN_SUCCESS",
      success: !0,
      txid: E,
      id: w
    };
  }
  e.sendBitcoinSuccess = S;
  function v(w) {
    return w.type === "TRANSACTION_HISTORY" && w.success === !0;
  }
  e.isTransactionHistory = v;
  function O(w, E) {
    return {
      type: "TRANSACTION_HISTORY",
      success: !0,
      transactions: E,
      id: w
    };
  }
  e.transactionHistory = O;
  function R(w) {
    return w.type === "WALLET_STATUS" && w.success === !0;
  }
  e.isWalletStatus = R;
  function j(w, E, k) {
    return {
      type: "WALLET_STATUS",
      success: !0,
      status: {
        walletInitialized: E,
        xOnlyPublicKey: k
      },
      id: w
    };
  }
  e.walletStatus = j;
  function b(w) {
    return w.type === "CLEAR_RESPONSE";
  }
  e.isClearResponse = b;
  function W(w, E) {
    return {
      type: "CLEAR_RESPONSE",
      success: E,
      id: w
    };
  }
  e.clearResponse = W;
  function U(w) {
    return w.type === "WALLET_RELOADED";
  }
  e.isWalletReloaded = U;
  function Y(w, E) {
    return {
      type: "WALLET_RELOADED",
      success: E,
      id: w
    };
  }
  e.walletReloaded = Y;
  function et(w) {
    return w.type === "VTXO_UPDATE";
  }
  e.isVtxoUpdate = et;
  function L(w, E) {
    return {
      type: "VTXO_UPDATE",
      id: pg(),
      // spontaneous update, not tied to a request
      success: !0,
      spentVtxos: E,
      newVtxos: w
    };
  }
  e.vtxoUpdate = L;
  function T(w) {
    return w.type === "UTXO_UPDATE";
  }
  e.isUtxoUpdate = T;
  function x(w) {
    return {
      type: "UTXO_UPDATE",
      id: pg(),
      // spontaneous update, not tied to a request
      success: !0,
      coins: w
    };
  }
  e.utxoUpdate = x;
})(gg || (gg = {}));
class ft {
  constructor(t, n, r, i, s, o) {
    this.hasWitness = t, this.inputCount = n, this.outputCount = r, this.inputSize = i, this.inputWitnessSize = s, this.outputSize = o;
  }
  static create() {
    return new ft(!1, 0, 0, 0, 0, 0);
  }
  addP2AInput() {
    return this.inputCount++, this.inputSize += ft.INPUT_SIZE, this;
  }
  addKeySpendInput(t = !0) {
    return this.inputCount++, this.inputWitnessSize += 65 + (t ? 0 : 1), this.inputSize += ft.INPUT_SIZE, this.hasWitness = !0, this;
  }
  addP2PKHInput() {
    return this.inputCount++, this.inputWitnessSize++, this.inputSize += ft.INPUT_SIZE + ft.P2PKH_SCRIPT_SIG_SIZE, this;
  }
  addTapscriptInput(t, n, r) {
    const i = 1 + ft.BASE_CONTROL_BLOCK_SIZE + 1 + n + 1 + r;
    return this.inputCount++, this.inputWitnessSize += t + i, this.inputSize += ft.INPUT_SIZE, this.hasWitness = !0, this.inputCount++, this;
  }
  addP2WKHOutput() {
    return this.outputCount++, this.outputSize += ft.OUTPUT_SIZE + ft.P2WKH_OUTPUT_SIZE, this;
  }
  addP2TROutput() {
    return this.outputCount++, this.outputSize += ft.OUTPUT_SIZE + ft.P2TR_OUTPUT_SIZE, this;
  }
  vsize() {
    const t = (o) => o < 253 ? 1 : o < 65535 ? 3 : o < 4294967295 ? 5 : 9, n = t(this.inputCount), r = t(this.outputCount);
    let s = (ft.BASE_TX_SIZE + n + this.inputSize + r + this.outputSize) * ft.WITNESS_SCALE_FACTOR;
    return this.hasWitness && (s += ft.WITNESS_HEADER_SIZE + this.inputWitnessSize), tI(s);
  }
}
ft.P2PKH_SCRIPT_SIG_SIZE = 108;
ft.INPUT_SIZE = 41;
ft.BASE_CONTROL_BLOCK_SIZE = 33;
ft.OUTPUT_SIZE = 9;
ft.P2WKH_OUTPUT_SIZE = 22;
ft.BASE_TX_SIZE = 10;
ft.WITNESS_HEADER_SIZE = 2;
ft.WITNESS_SCALE_FACTOR = 4;
ft.P2TR_OUTPUT_SIZE = 34;
const tI = (e) => {
  const t = BigInt(Math.ceil(e / ft.WITNESS_SCALE_FACTOR));
  return {
    value: t,
    fee: (n) => n * t
  };
};
var yg;
(function(e) {
  function t(f) {
    return typeof f == "object" && f !== null && "type" in f;
  }
  e.isBase = t;
  function n(f) {
    return f.type === "INIT_WALLET" && "arkServerUrl" in f && typeof f.arkServerUrl == "string" && ("arkServerPublicKey" in f ? f.arkServerPublicKey === void 0 || typeof f.arkServerPublicKey == "string" : !0);
  }
  e.isInitWallet = n;
  function r(f) {
    return f.type === "SETTLE";
  }
  e.isSettle = r;
  function i(f) {
    return f.type === "GET_ADDRESS";
  }
  e.isGetAddress = i;
  function s(f) {
    return f.type === "GET_BOARDING_ADDRESS";
  }
  e.isGetBoardingAddress = s;
  function o(f) {
    return f.type === "GET_BALANCE";
  }
  e.isGetBalance = o;
  function a(f) {
    return f.type === "GET_VTXOS";
  }
  e.isGetVtxos = a;
  function c(f) {
    return f.type === "GET_VIRTUAL_COINS";
  }
  e.isGetVirtualCoins = c;
  function u(f) {
    return f.type === "GET_BOARDING_UTXOS";
  }
  e.isGetBoardingUtxos = u;
  function l(f) {
    return f.type === "SEND_BITCOIN" && "params" in f && f.params !== null && typeof f.params == "object" && "address" in f.params && typeof f.params.address == "string" && "amount" in f.params && typeof f.params.amount == "number";
  }
  e.isSendBitcoin = l;
  function d(f) {
    return f.type === "GET_TRANSACTION_HISTORY";
  }
  e.isGetTransactionHistory = d;
  function h(f) {
    return f.type === "GET_STATUS";
  }
  e.isGetStatus = h;
  function p(f) {
    return f.type === "CLEAR";
  }
  e.isClear = p;
  function y(f) {
    return f.type === "RELOAD_WALLET";
  }
  e.isReloadWallet = y;
})(yg || (yg = {}));
var wg;
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
        if (!(l.type === bi.COMMITMENT || l.type === bi.UNSPECIFIED))
          try {
            if (!(await this.explorer.getTxStatus(l.txid)).confirmed)
              return {
                type: t.WAIT,
                txid: l.txid,
                do: rI(this.explorer, l.txid)
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
      const c = Er.fromPSBT(Mt.decode(a.txs[0]));
      if (s.type === bi.TREE) {
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
        do: nI(this.bumper, this.explorer, c)
      };
    }
    /**
     * Iterate over the steps to be executed and execute them
     * @returns An async iterator over the executed steps
     */
    async *[Symbol.asyncIterator]() {
      let s;
      do {
        s !== void 0 && await eI(1e3);
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
    const d = ft.create();
    for (const g of c) {
      if (!g.isUnrolled)
        throw new Error(`Vtxo ${g.txid}:${g.vout} is not fully unrolled, use unroll first`);
      const m = await i.onchainProvider.getTxStatus(g.txid);
      if (!m.confirmed)
        throw new Error(`tx ${g.txid} is not confirmed`);
      const S = iI({ height: m.blockHeight, time: m.blockTime }, a, g);
      if (!S)
        throw new Error(`no available exit path found for vtxo ${g.txid}:${g.vout}`);
      const v = ve.decode(g.tapTree).findLeaf(V.encode(S.script));
      if (!v)
        throw new Error(`spending leaf not found for vtxo ${g.txid}:${g.vout}`);
      l += BigInt(g.value), u.push({
        txid: g.txid,
        index: g.vout,
        tapLeafScript: [v],
        sequence: 4294967294,
        witnessUtxo: {
          amount: BigInt(g.value),
          script: ve.decode(g.tapTree).pkScript
        },
        sighashType: Hi.DEFAULT
      }), d.addTapscriptInput(64, v[1].length, on.encode(v[0]).length);
    }
    const h = new Er({ version: 2 });
    for (const g of u)
      h.addInput(g);
    d.addP2TROutput();
    let p = await i.onchainProvider.getFeeRate();
    (!p || p < Ks.MIN_FEE_RATE) && (p = Ks.MIN_FEE_RATE);
    const y = d.vsize().fee(BigInt(p));
    if (y > l)
      throw new Error("fee amount is greater than the total amount");
    h.addOutputAddress(o, l - y);
    const f = await i.identity.sign(h);
    return f.finalize(), await i.onchainProvider.broadcastTransaction(f.hex), f.id;
  }
  e.completeUnroll = r;
})(wg || (wg = {}));
function eI(e) {
  return new Promise((t) => setTimeout(t, e));
}
function nI(e, t, n) {
  return async () => {
    const [r, i] = await e.bumpP2A(n);
    await t.broadcastTransaction(r, i);
  };
}
function rI(e, t) {
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
function iI(e, t, n) {
  const r = ve.decode(n.tapTree).exitPaths();
  for (const i of r)
    if (i.params.timelock.type === "blocks") {
      if (t.height >= e.height + Number(i.params.timelock.value))
        return i;
    } else if (t.time >= e.time + Number(i.params.timelock.value))
      return i;
}
const sI = new v1({
  walletRepository: new am(),
  contractRepository: new Lb()
});
sI.start().catch(console.error);
const _b = "arkade-cache-v1";
self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(_b)), self.skipWaiting();
});
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((t) => Promise.all(
      t.map((n) => {
        if (n !== _b)
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
