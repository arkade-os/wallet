/*! noble-hashes - MIT License (c) 2022 Paul Miller (paulmillr.com) */
function Ai(e) {
  return e instanceof Uint8Array || ArrayBuffer.isView(e) && e.constructor.name === "Uint8Array";
}
function ke(e, t = "") {
  if (!Number.isSafeInteger(e) || e < 0) {
    const n = t && `"${t}" `;
    throw new Error(`${n}expected integer >= 0, got ${e}`);
  }
}
function W(e, t, n = "") {
  const r = Ai(e), o = e?.length, i = t !== void 0;
  if (!r || i && o !== t) {
    const s = n && `"${n}" `, c = i ? ` of length ${t}` : "", a = r ? `length=${o}` : `type=${typeof e}`;
    throw new Error(s + "expected Uint8Array" + c + ", got " + a);
  }
  return e;
}
function Uc(e) {
  if (typeof e != "function" || typeof e.create != "function")
    throw new Error("Hash must wrapped by utils.createHasher");
  ke(e.outputLen), ke(e.blockLen);
}
function Sr(e, t = !0) {
  if (e.destroyed)
    throw new Error("Hash instance has been destroyed");
  if (t && e.finished)
    throw new Error("Hash#digest() has already been called");
}
function of(e, t) {
  W(e, void 0, "digestInto() output");
  const n = t.outputLen;
  if (e.length < n)
    throw new Error('"digestInto() output" expected to be of length >=' + n);
}
function sn(...e) {
  for (let t = 0; t < e.length; t++)
    e[t].fill(0);
}
function bo(e) {
  return new DataView(e.buffer, e.byteOffset, e.byteLength);
}
function jt(e, t) {
  return e << 32 - t | e >>> t;
}
function Qn(e, t) {
  return e << t | e >>> 32 - t >>> 0;
}
const $c = /* @ts-ignore */ typeof Uint8Array.from([]).toHex == "function" && typeof Uint8Array.fromHex == "function", sf = /* @__PURE__ */ Array.from({ length: 256 }, (e, t) => t.toString(16).padStart(2, "0"));
function Jr(e) {
  if (W(e), $c)
    return e.toHex();
  let t = "";
  for (let n = 0; n < e.length; n++)
    t += sf[e[n]];
  return t;
}
const re = { _0: 48, _9: 57, A: 65, F: 70, a: 97, f: 102 };
function ps(e) {
  if (e >= re._0 && e <= re._9)
    return e - re._0;
  if (e >= re.A && e <= re.F)
    return e - (re.A - 10);
  if (e >= re.a && e <= re.f)
    return e - (re.a - 10);
}
function Tr(e) {
  if (typeof e != "string")
    throw new Error("hex string expected, got " + typeof e);
  if ($c)
    return Uint8Array.fromHex(e);
  const t = e.length, n = t / 2;
  if (t % 2)
    throw new Error("hex string expected, got unpadded hex of length " + t);
  const r = new Uint8Array(n);
  for (let o = 0, i = 0; o < n; o++, i += 2) {
    const s = ps(e.charCodeAt(i)), c = ps(e.charCodeAt(i + 1));
    if (s === void 0 || c === void 0) {
      const a = e[i] + e[i + 1];
      throw new Error('hex string expected, got non-hex character "' + a + '" at index ' + i);
    }
    r[o] = s * 16 + c;
  }
  return r;
}
function Ft(...e) {
  let t = 0;
  for (let r = 0; r < e.length; r++) {
    const o = e[r];
    W(o), t += o.length;
  }
  const n = new Uint8Array(t);
  for (let r = 0, o = 0; r < e.length; r++) {
    const i = e[r];
    n.set(i, o), o += i.length;
  }
  return n;
}
function Nc(e, t = {}) {
  const n = (o, i) => e(i).update(o).digest(), r = e(void 0);
  return n.outputLen = r.outputLen, n.blockLen = r.blockLen, n.create = (o) => e(o), Object.assign(n, t), Object.freeze(n);
}
function Gn(e = 32) {
  const t = typeof globalThis == "object" ? globalThis.crypto : null;
  if (typeof t?.getRandomValues != "function")
    throw new Error("crypto.getRandomValues must be defined");
  return t.getRandomValues(new Uint8Array(e));
}
const cf = (e) => ({
  oid: Uint8Array.from([6, 9, 96, 134, 72, 1, 101, 3, 4, 2, e])
});
function af(e, t, n) {
  return e & t ^ ~e & n;
}
function uf(e, t, n) {
  return e & t ^ e & n ^ t & n;
}
let Lc = class {
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
    this.blockLen = t, this.outputLen = n, this.padOffset = r, this.isLE = o, this.buffer = new Uint8Array(t), this.view = bo(this.buffer);
  }
  update(t) {
    Sr(this), W(t);
    const { view: n, buffer: r, blockLen: o } = this, i = t.length;
    for (let s = 0; s < i; ) {
      const c = Math.min(o - this.pos, i - s);
      if (c === o) {
        const a = bo(t);
        for (; o <= i - s; s += o)
          this.process(a, s);
        continue;
      }
      r.set(t.subarray(s, s + c), this.pos), this.pos += c, s += c, this.pos === o && (this.process(n, 0), this.pos = 0);
    }
    return this.length += t.length, this.roundClean(), this;
  }
  digestInto(t) {
    Sr(this), of(t, this), this.finished = !0;
    const { buffer: n, view: r, blockLen: o, isLE: i } = this;
    let { pos: s } = this;
    n[s++] = 128, sn(this.buffer.subarray(s)), this.padOffset > o - s && (this.process(r, 0), s = 0);
    for (let d = s; d < o; d++)
      n[d] = 0;
    r.setBigUint64(o - 8, BigInt(this.length * 8), i), this.process(r, 0);
    const c = bo(t), a = this.outputLen;
    if (a % 4)
      throw new Error("_sha2: outputLen must be aligned to 32bit");
    const u = a / 4, f = this.get();
    if (u > f.length)
      throw new Error("_sha2: outputLen bigger than state");
    for (let d = 0; d < u; d++)
      c.setUint32(4 * d, f[d], i);
  }
  digest() {
    const { buffer: t, outputLen: n } = this;
    this.digestInto(t);
    const r = t.slice(0, n);
    return this.destroy(), r;
  }
  _cloneInto(t) {
    t ||= new this.constructor(), t.set(...this.get());
    const { blockLen: n, buffer: r, length: o, finished: i, destroyed: s, pos: c } = this;
    return t.destroyed = s, t.finished = i, t.length = o, t.pos = c, o % n && t.buffer.set(r), t;
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
]), ff = /* @__PURE__ */ Uint32Array.from([
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
let df = class extends Lc {
  constructor(t) {
    super(64, t, 8, !1);
  }
  get() {
    const { A: t, B: n, C: r, D: o, E: i, F: s, G: c, H: a } = this;
    return [t, n, r, o, i, s, c, a];
  }
  // prettier-ignore
  set(t, n, r, o, i, s, c, a) {
    this.A = t | 0, this.B = n | 0, this.C = r | 0, this.D = o | 0, this.E = i | 0, this.F = s | 0, this.G = c | 0, this.H = a | 0;
  }
  process(t, n) {
    for (let d = 0; d < 16; d++, n += 4)
      pe[d] = t.getUint32(n, !1);
    for (let d = 16; d < 64; d++) {
      const h = pe[d - 15], l = pe[d - 2], g = jt(h, 7) ^ jt(h, 18) ^ h >>> 3, w = jt(l, 17) ^ jt(l, 19) ^ l >>> 10;
      pe[d] = w + pe[d - 7] + g + pe[d - 16] | 0;
    }
    let { A: r, B: o, C: i, D: s, E: c, F: a, G: u, H: f } = this;
    for (let d = 0; d < 64; d++) {
      const h = jt(c, 6) ^ jt(c, 11) ^ jt(c, 25), l = f + h + af(c, a, u) + ff[d] + pe[d] | 0, w = (jt(r, 2) ^ jt(r, 13) ^ jt(r, 22)) + uf(r, o, i) | 0;
      f = u, u = a, a = c, c = s + l | 0, s = i, i = o, o = r, r = l + w | 0;
    }
    r = r + this.A | 0, o = o + this.B | 0, i = i + this.C | 0, s = s + this.D | 0, c = c + this.E | 0, a = a + this.F | 0, u = u + this.G | 0, f = f + this.H | 0, this.set(r, o, i, s, c, a, u, f);
  }
  roundClean() {
    sn(pe);
  }
  destroy() {
    this.set(0, 0, 0, 0, 0, 0, 0, 0), sn(this.buffer);
  }
}, lf = class extends df {
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
const yt = /* @__PURE__ */ Nc(
  () => new lf(),
  /* @__PURE__ */ cf(1)
);
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const ki = /* @__PURE__ */ BigInt(0), Ko = /* @__PURE__ */ BigInt(1);
function vr(e, t = "") {
  if (typeof e != "boolean") {
    const n = t && `"${t}" `;
    throw new Error(n + "expected boolean, got type=" + typeof e);
  }
  return e;
}
function _c(e) {
  if (typeof e == "bigint") {
    if (!pr(e))
      throw new Error("positive bigint expected, got " + e);
  } else
    ke(e);
  return e;
}
function Jn(e) {
  const t = _c(e).toString(16);
  return t.length & 1 ? "0" + t : t;
}
function Cc(e) {
  if (typeof e != "string")
    throw new Error("hex string expected, got " + typeof e);
  return e === "" ? ki : BigInt("0x" + e);
}
function de(e) {
  return Cc(Jr(e));
}
function Pc(e) {
  return Cc(Jr(hf(W(e)).reverse()));
}
function qn(e, t) {
  ke(t), e = _c(e);
  const n = Tr(e.toString(16).padStart(t * 2, "0"));
  if (n.length !== t)
    throw new Error("number too large");
  return n;
}
function Vc(e, t) {
  return qn(e, t).reverse();
}
function Vn(e, t) {
  if (e.length !== t.length)
    return !1;
  let n = 0;
  for (let r = 0; r < e.length; r++)
    n |= e[r] ^ t[r];
  return n === 0;
}
function hf(e) {
  return Uint8Array.from(e);
}
function pf(e) {
  return Uint8Array.from(e, (t, n) => {
    const r = t.charCodeAt(0);
    if (t.length !== 1 || r > 127)
      throw new Error(`string contains non-ASCII character "${e[n]}" with code ${r} at position ${n}`);
    return r;
  });
}
const pr = (e) => typeof e == "bigint" && ki <= e;
function gf(e, t, n) {
  return pr(e) && pr(t) && pr(n) && t <= e && e < n;
}
function Hc(e, t, n, r) {
  if (!gf(t, n, r))
    throw new Error("expected valid " + e + ": " + n + " <= n < " + r + ", got " + t);
}
function wf(e) {
  let t;
  for (t = 0; e > ki; e >>= Ko, t += 1)
    ;
  return t;
}
const Ii = (e) => (Ko << BigInt(e)) - Ko;
function yf(e, t, n) {
  if (ke(e, "hashLen"), ke(t, "qByteLen"), typeof n != "function")
    throw new Error("hmacFn must be a function");
  const r = (y) => new Uint8Array(y), o = Uint8Array.of(), i = Uint8Array.of(0), s = Uint8Array.of(1), c = 1e3;
  let a = r(e), u = r(e), f = 0;
  const d = () => {
    a.fill(1), u.fill(0), f = 0;
  }, h = (...y) => n(u, Ft(a, ...y)), l = (y = o) => {
    u = h(i, y), a = h(), y.length !== 0 && (u = h(s, y), a = h());
  }, g = () => {
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
    d(), l(y);
    let v;
    for (; !(v = S(g())); )
      l();
    return d(), v;
  };
}
function Bi(e, t = {}, n = {}) {
  if (!e || typeof e != "object")
    throw new Error("expected valid options object");
  function r(i, s, c) {
    const a = e[i];
    if (c && a === void 0)
      return;
    const u = typeof a;
    if (u !== s || a === null)
      throw new Error(`param "${i}" is invalid: expected ${s}, got ${u}`);
  }
  const o = (i, s) => Object.entries(i).forEach(([c, a]) => r(c, a, s));
  o(t, !1), o(n, !0);
}
function gs(e) {
  const t = /* @__PURE__ */ new WeakMap();
  return (n, ...r) => {
    const o = t.get(n);
    if (o !== void 0)
      return o;
    const i = e(n, ...r);
    return t.set(n, i), i;
  };
}
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const St = /* @__PURE__ */ BigInt(0), bt = /* @__PURE__ */ BigInt(1), Pe = /* @__PURE__ */ BigInt(2), Dc = /* @__PURE__ */ BigInt(3), Kc = /* @__PURE__ */ BigInt(4), Mc = /* @__PURE__ */ BigInt(5), mf = /* @__PURE__ */ BigInt(7), Fc = /* @__PURE__ */ BigInt(8), bf = /* @__PURE__ */ BigInt(9), zc = /* @__PURE__ */ BigInt(16);
function Ht(e, t) {
  const n = e % t;
  return n >= St ? n : t + n;
}
function $t(e, t, n) {
  let r = e;
  for (; t-- > St; )
    r *= r, r %= n;
  return r;
}
function ws(e, t) {
  if (e === St)
    throw new Error("invert: expected non-zero number");
  if (t <= St)
    throw new Error("invert: expected positive modulus, got " + t);
  let n = Ht(e, t), r = t, o = St, i = bt;
  for (; n !== St; ) {
    const c = r / n, a = r % n, u = o - i * c;
    r = n, n = a, o = i, i = u;
  }
  if (r !== bt)
    throw new Error("invert: does not exist");
  return Ht(o, t);
}
function Oi(e, t, n) {
  if (!e.eql(e.sqr(t), n))
    throw new Error("Cannot find square root");
}
function Wc(e, t) {
  const n = (e.ORDER + bt) / Kc, r = e.pow(t, n);
  return Oi(e, r, t), r;
}
function xf(e, t) {
  const n = (e.ORDER - Mc) / Fc, r = e.mul(t, Pe), o = e.pow(r, n), i = e.mul(t, o), s = e.mul(e.mul(i, Pe), o), c = e.mul(i, e.sub(s, e.ONE));
  return Oi(e, c, t), c;
}
function Ef(e) {
  const t = to(e), n = Gc(e), r = n(t, t.neg(t.ONE)), o = n(t, r), i = n(t, t.neg(r)), s = (e + mf) / zc;
  return (c, a) => {
    let u = c.pow(a, s), f = c.mul(u, r);
    const d = c.mul(u, o), h = c.mul(u, i), l = c.eql(c.sqr(f), a), g = c.eql(c.sqr(d), a);
    u = c.cmov(u, f, l), f = c.cmov(h, d, g);
    const w = c.eql(c.sqr(f), a), y = c.cmov(u, f, w);
    return Oi(c, y, a), y;
  };
}
function Gc(e) {
  if (e < Dc)
    throw new Error("sqrt is not defined for small field");
  let t = e - bt, n = 0;
  for (; t % Pe === St; )
    t /= Pe, n++;
  let r = Pe;
  const o = to(e);
  for (; ys(o, r) === 1; )
    if (r++ > 1e3)
      throw new Error("Cannot find square root: probably non-prime P");
  if (n === 1)
    return Wc;
  let i = o.pow(r, t);
  const s = (t + bt) / Pe;
  return function(a, u) {
    if (a.is0(u))
      return u;
    if (ys(a, u) !== 1)
      throw new Error("Cannot find square root");
    let f = n, d = a.mul(a.ONE, i), h = a.pow(u, t), l = a.pow(u, s);
    for (; !a.eql(h, a.ONE); ) {
      if (a.is0(h))
        return a.ZERO;
      let g = 1, w = a.sqr(h);
      for (; !a.eql(w, a.ONE); )
        if (g++, w = a.sqr(w), g === f)
          throw new Error("Cannot find square root");
      const y = bt << BigInt(f - g - 1), S = a.pow(d, y);
      f = g, d = a.sqr(S), h = a.mul(h, d), l = a.mul(l, S);
    }
    return l;
  };
}
function Sf(e) {
  return e % Kc === Dc ? Wc : e % Fc === Mc ? xf : e % zc === bf ? Ef(e) : Gc(e);
}
const Tf = [
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
function vf(e) {
  const t = {
    ORDER: "bigint",
    BYTES: "number",
    BITS: "number"
  }, n = Tf.reduce((r, o) => (r[o] = "function", r), t);
  return Bi(e, n), e;
}
function Af(e, t, n) {
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
function qc(e, t, n = !1) {
  const r = new Array(t.length).fill(n ? e.ZERO : void 0), o = t.reduce((s, c, a) => e.is0(c) ? s : (r[a] = s, e.mul(s, c)), e.ONE), i = e.inv(o);
  return t.reduceRight((s, c, a) => e.is0(c) ? s : (r[a] = e.mul(s, r[a]), e.mul(s, c)), i), r;
}
function ys(e, t) {
  const n = (e.ORDER - bt) / Pe, r = e.pow(t, n), o = e.eql(r, e.ONE), i = e.eql(r, e.ZERO), s = e.eql(r, e.neg(e.ONE));
  if (!o && !i && !s)
    throw new Error("invalid Legendre symbol result");
  return o ? 1 : i ? 0 : -1;
}
function kf(e, t) {
  t !== void 0 && ke(t);
  const n = t !== void 0 ? t : e.toString(2).length, r = Math.ceil(n / 8);
  return { nBitLength: n, nByteLength: r };
}
let If = class {
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
    const { nBitLength: o, nByteLength: i } = kf(t, r);
    if (i > 2048)
      throw new Error("invalid field: expected ORDER of <= 2048 bytes");
    this.ORDER = t, this.BITS = o, this.BYTES = i, this._sqrt = void 0, Object.preventExtensions(this);
  }
  create(t) {
    return Ht(t, this.ORDER);
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
    return Ht(-t, this.ORDER);
  }
  eql(t, n) {
    return t === n;
  }
  sqr(t) {
    return Ht(t * t, this.ORDER);
  }
  add(t, n) {
    return Ht(t + n, this.ORDER);
  }
  sub(t, n) {
    return Ht(t - n, this.ORDER);
  }
  mul(t, n) {
    return Ht(t * n, this.ORDER);
  }
  pow(t, n) {
    return Af(this, t, n);
  }
  div(t, n) {
    return Ht(t * ws(n, this.ORDER), this.ORDER);
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
    return ws(t, this.ORDER);
  }
  sqrt(t) {
    return this._sqrt || (this._sqrt = Sf(this.ORDER)), this._sqrt(this, t);
  }
  toBytes(t) {
    return this.isLE ? Vc(t, this.BYTES) : qn(t, this.BYTES);
  }
  fromBytes(t, n = !1) {
    W(t);
    const { _lengths: r, BYTES: o, isLE: i, ORDER: s, _mod: c } = this;
    if (r) {
      if (!r.includes(t.length) || t.length > o)
        throw new Error("Field.fromBytes: expected " + r + " bytes, got " + t.length);
      const u = new Uint8Array(o);
      u.set(t, i ? 0 : u.length - t.length), t = u;
    }
    if (t.length !== o)
      throw new Error("Field.fromBytes: expected " + o + " bytes, got " + t.length);
    let a = i ? Pc(t) : de(t);
    if (c && (a = Ht(a, s)), !n && !this.isValid(a))
      throw new Error("invalid field element: outside of range 0..ORDER");
    return a;
  }
  // TODO: we don't need it here, move out to separate fn
  invertBatch(t) {
    return qc(this, t);
  }
  // We can't move this out because Fp6, Fp12 implement it
  // and it's unclear what to return in there.
  cmov(t, n, r) {
    return r ? n : t;
  }
};
function to(e, t = {}) {
  return new If(e, t);
}
function jc(e) {
  if (typeof e != "bigint")
    throw new Error("field order must be bigint");
  const t = e.toString(2).length;
  return Math.ceil(t / 8);
}
function Yc(e) {
  const t = jc(e);
  return t + Math.ceil(t / 2);
}
function Zc(e, t, n = !1) {
  W(e);
  const r = e.length, o = jc(t), i = Yc(t);
  if (r < 16 || r < i || r > 1024)
    throw new Error("expected " + i + "-1024 bytes of input, got " + r);
  const s = n ? Pc(e) : de(e), c = Ht(s, t - bt) + bt;
  return n ? Vc(c, o) : qn(c, o);
}
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const cn = /* @__PURE__ */ BigInt(0), Ve = /* @__PURE__ */ BigInt(1);
function Ar(e, t) {
  const n = t.negate();
  return e ? n : t;
}
function ms(e, t) {
  const n = qc(e.Fp, t.map((r) => r.Z));
  return t.map((r, o) => e.fromAffine(r.toAffine(n[o])));
}
function Xc(e, t) {
  if (!Number.isSafeInteger(e) || e <= 0 || e > t)
    throw new Error("invalid window size, expected [1.." + t + "], got W=" + e);
}
function xo(e, t) {
  Xc(e, t);
  const n = Math.ceil(t / e) + 1, r = 2 ** (e - 1), o = 2 ** e, i = Ii(e), s = BigInt(e);
  return { windows: n, windowSize: r, mask: i, maxNumber: o, shiftBy: s };
}
function bs(e, t, n) {
  const { windowSize: r, mask: o, maxNumber: i, shiftBy: s } = n;
  let c = Number(e & o), a = e >> s;
  c > r && (c -= i, a += Ve);
  const u = t * r, f = u + Math.abs(c) - 1, d = c === 0, h = c < 0, l = t % 2 !== 0;
  return { nextN: a, offset: f, isZero: d, isNeg: h, isNegF: l, offsetF: u };
}
const Eo = /* @__PURE__ */ new WeakMap(), Qc = /* @__PURE__ */ new WeakMap();
function So(e) {
  return Qc.get(e) || 1;
}
function xs(e) {
  if (e !== cn)
    throw new Error("invalid wNAF");
}
let Bf = class {
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
    for (; n > cn; )
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
    const { windows: r, windowSize: o } = xo(n, this.bits), i = [];
    let s = t, c = s;
    for (let a = 0; a < r; a++) {
      c = s, i.push(c);
      for (let u = 1; u < o; u++)
        c = c.add(s), i.push(c);
      s = c.double();
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
    let o = this.ZERO, i = this.BASE;
    const s = xo(t, this.bits);
    for (let c = 0; c < s.windows; c++) {
      const { nextN: a, offset: u, isZero: f, isNeg: d, isNegF: h, offsetF: l } = bs(r, c, s);
      r = a, f ? i = i.add(Ar(h, n[l])) : o = o.add(Ar(d, n[u]));
    }
    return xs(r), { p: o, f: i };
  }
  /**
   * Implements ec unsafe (non const-time) multiplication using precomputed tables and w-ary non-adjacent form.
   * @param acc accumulator point to add result of multiplication
   * @returns point
   */
  wNAFUnsafe(t, n, r, o = this.ZERO) {
    const i = xo(t, this.bits);
    for (let s = 0; s < i.windows && r !== cn; s++) {
      const { nextN: c, offset: a, isZero: u, isNeg: f } = bs(r, s, i);
      if (r = c, !u) {
        const d = n[a];
        o = o.add(f ? d.negate() : d);
      }
    }
    return xs(r), o;
  }
  getPrecomputes(t, n, r) {
    let o = Eo.get(n);
    return o || (o = this.precomputeWindow(n, t), t !== 1 && (typeof r == "function" && (o = r(o)), Eo.set(n, o))), o;
  }
  cached(t, n, r) {
    const o = So(t);
    return this.wNAF(o, this.getPrecomputes(o, t, r), n);
  }
  unsafe(t, n, r, o) {
    const i = So(t);
    return i === 1 ? this._unsafeLadder(t, n, o) : this.wNAFUnsafe(i, this.getPrecomputes(i, t, r), n, o);
  }
  // We calculate precomputes for elliptic curve point multiplication
  // using windowed method. This specifies window size and
  // stores precomputed values. Usually only base point would be precomputed.
  createCache(t, n) {
    Xc(n, this.bits), Qc.set(t, n), Eo.delete(t);
  }
  hasCache(t) {
    return So(t) !== 1;
  }
};
function Of(e, t, n, r) {
  let o = t, i = e.ZERO, s = e.ZERO;
  for (; n > cn || r > cn; )
    n & Ve && (i = i.add(o)), r & Ve && (s = s.add(o)), o = o.double(), n >>= Ve, r >>= Ve;
  return { p1: i, p2: s };
}
function Es(e, t, n) {
  if (t) {
    if (t.ORDER !== e)
      throw new Error("Field.ORDER must match order: Fp == p, Fn == n");
    return vf(t), t;
  } else
    return to(e, { isLE: n });
}
function Rf(e, t, n = {}, r) {
  if (r === void 0 && (r = e === "edwards"), !t || typeof t != "object")
    throw new Error(`expected valid ${e} CURVE object`);
  for (const a of ["p", "n", "h"]) {
    const u = t[a];
    if (!(typeof u == "bigint" && u > cn))
      throw new Error(`CURVE.${a} must be positive bigint`);
  }
  const o = Es(t.p, n.Fp, r), i = Es(t.n, n.Fn, r), c = ["Gx", "Gy", "a", "b"];
  for (const a of c)
    if (!o.isValid(t[a]))
      throw new Error(`CURVE.${a} must be valid field element of CURVE.Fp`);
  return t = Object.freeze(Object.assign({}, t)), { CURVE: t, Fp: o, Fn: i };
}
function Jc(e, t) {
  return function(r) {
    const o = e(r);
    return { secretKey: o, publicKey: t(o) };
  };
}
let ta = class {
  oHash;
  iHash;
  blockLen;
  outputLen;
  finished = !1;
  destroyed = !1;
  constructor(t, n) {
    if (Uc(t), W(n, void 0, "key"), this.iHash = t.create(), typeof this.iHash.update != "function")
      throw new Error("Expected instance of class which extends utils.Hash");
    this.blockLen = this.iHash.blockLen, this.outputLen = this.iHash.outputLen;
    const r = this.blockLen, o = new Uint8Array(r);
    o.set(n.length > r ? t.create().update(n).digest() : n);
    for (let i = 0; i < o.length; i++)
      o[i] ^= 54;
    this.iHash.update(o), this.oHash = t.create();
    for (let i = 0; i < o.length; i++)
      o[i] ^= 106;
    this.oHash.update(o), sn(o);
  }
  update(t) {
    return Sr(this), this.iHash.update(t), this;
  }
  digestInto(t) {
    Sr(this), W(t, this.outputLen, "output"), this.finished = !0, this.iHash.digestInto(t), this.oHash.update(t), this.oHash.digestInto(t), this.destroy();
  }
  digest() {
    const t = new Uint8Array(this.oHash.outputLen);
    return this.digestInto(t), t;
  }
  _cloneInto(t) {
    t ||= Object.create(Object.getPrototypeOf(this), {});
    const { oHash: n, iHash: r, finished: o, destroyed: i, blockLen: s, outputLen: c } = this;
    return t = t, t.finished = o, t.destroyed = i, t.blockLen = s, t.outputLen = c, t.oHash = n._cloneInto(t.oHash), t.iHash = r._cloneInto(t.iHash), t;
  }
  clone() {
    return this._cloneInto();
  }
  destroy() {
    this.destroyed = !0, this.oHash.destroy(), this.iHash.destroy();
  }
};
const ea = (e, t, n) => new ta(e, t).update(n).digest();
ea.create = (e, t) => new ta(e, t);
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const Ss = (e, t) => (e + (e >= 0 ? t : -t) / na) / t;
function Uf(e, t, n) {
  const [[r, o], [i, s]] = t, c = Ss(s * e, n), a = Ss(-o * e, n);
  let u = e - c * r - a * i, f = -c * o - a * s;
  const d = u < se, h = f < se;
  d && (u = -u), h && (f = -f);
  const l = Ii(Math.ceil(wf(n) / 2)) + tn;
  if (u < se || u >= l || f < se || f >= l)
    throw new Error("splitScalar (endomorphism): failed, k=" + e);
  return { k1neg: d, k1: u, k2neg: h, k2: f };
}
function Mo(e) {
  if (!["compact", "recovered", "der"].includes(e))
    throw new Error('Signature format must be "compact", "recovered", or "der"');
  return e;
}
function To(e, t) {
  const n = {};
  for (let r of Object.keys(t))
    n[r] = e[r] === void 0 ? t[r] : e[r];
  return vr(n.lowS, "lowS"), vr(n.prehash, "prehash"), n.format !== void 0 && Mo(n.format), n;
}
let $f = class extends Error {
  constructor(t = "") {
    super(t);
  }
};
const me = {
  // asn.1 DER encoding utils
  Err: $f,
  // Basic building block is TLV (Tag-Length-Value)
  _tlv: {
    encode: (e, t) => {
      const { Err: n } = me;
      if (e < 0 || e > 256)
        throw new n("tlv.encode: wrong tag");
      if (t.length & 1)
        throw new n("tlv.encode: unpadded data");
      const r = t.length / 2, o = Jn(r);
      if (o.length / 2 & 128)
        throw new n("tlv.encode: long form length too big");
      const i = r > 127 ? Jn(o.length / 2 | 128) : "";
      return Jn(e) + i + o + t;
    },
    // v - value, l - left bytes (unparsed)
    decode(e, t) {
      const { Err: n } = me;
      let r = 0;
      if (e < 0 || e > 256)
        throw new n("tlv.encode: wrong tag");
      if (t.length < 2 || t[r++] !== e)
        throw new n("tlv.decode: wrong tlv");
      const o = t[r++], i = !!(o & 128);
      let s = 0;
      if (!i)
        s = o;
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
          s = s << 8 | f;
        if (r += a, s < 128)
          throw new n("tlv.decode(long): not minimal encoding");
      }
      const c = t.subarray(r, r + s);
      if (c.length !== s)
        throw new n("tlv.decode: wrong value length");
      return { v: c, l: t.subarray(r + s) };
    }
  },
  // https://crypto.stackexchange.com/a/57734 Leftmost bit of first byte is 'negative' flag,
  // since we always use positive integers here. It must always be empty:
  // - add zero byte if exists
  // - if next byte doesn't have a flag, leading zero is not allowed (minimal encoding)
  _int: {
    encode(e) {
      const { Err: t } = me;
      if (e < se)
        throw new t("integer: negative integers are not allowed");
      let n = Jn(e);
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
      return de(e);
    }
  },
  toSig(e) {
    const { Err: t, _int: n, _tlv: r } = me, o = W(e, void 0, "signature"), { v: i, l: s } = r.decode(48, o);
    if (s.length)
      throw new t("invalid signature: left bytes after parsing");
    const { v: c, l: a } = r.decode(2, i), { v: u, l: f } = r.decode(2, a);
    if (f.length)
      throw new t("invalid signature: left bytes after parsing");
    return { r: n.decode(c), s: n.decode(u) };
  },
  hexFromSig(e) {
    const { _tlv: t, _int: n } = me, r = t.encode(2, n.encode(e.r)), o = t.encode(2, n.encode(e.s)), i = r + o;
    return t.encode(48, i);
  }
}, se = BigInt(0), tn = BigInt(1), na = BigInt(2), tr = BigInt(3), Nf = BigInt(4);
function Lf(e, t = {}) {
  const n = Rf("weierstrass", e, t), { Fp: r, Fn: o } = n;
  let i = n.CURVE;
  const { h: s, n: c } = i;
  Bi(t, {}, {
    allowInfinityPoint: "boolean",
    clearCofactor: "function",
    isTorsionFree: "function",
    fromBytes: "function",
    toBytes: "function",
    endo: "object"
  });
  const { endo: a } = t;
  if (a && (!r.is0(i.a) || typeof a.beta != "bigint" || !Array.isArray(a.basises)))
    throw new Error('invalid endo: expected "beta": bigint and "basises": array');
  const u = oa(r, o);
  function f() {
    if (!r.isOdd)
      throw new Error("compression is not supported: Field does not have .isOdd()");
  }
  function d(C, b, m) {
    const { x: p, y: x } = b.toAffine(), A = r.toBytes(p);
    if (vr(m, "isCompressed"), m) {
      f();
      const I = !r.isOdd(x);
      return Ft(ra(I), A);
    } else
      return Ft(Uint8Array.of(4), A, r.toBytes(x));
  }
  function h(C) {
    W(C, void 0, "Point");
    const { publicKey: b, publicKeyUncompressed: m } = u, p = C.length, x = C[0], A = C.subarray(1);
    if (p === b && (x === 2 || x === 3)) {
      const I = r.fromBytes(A);
      if (!r.isValid(I))
        throw new Error("bad point: is not on curve, wrong x");
      const k = w(I);
      let T;
      try {
        T = r.sqrt(k);
      } catch (F) {
        const H = F instanceof Error ? ": " + F.message : "";
        throw new Error("bad point: is not on curve, sqrt error" + H);
      }
      f();
      const B = r.isOdd(T);
      return (x & 1) === 1 !== B && (T = r.neg(T)), { x: I, y: T };
    } else if (p === m && x === 4) {
      const I = r.BYTES, k = r.fromBytes(A.subarray(0, I)), T = r.fromBytes(A.subarray(I, I * 2));
      if (!y(k, T))
        throw new Error("bad point: is not on curve");
      return { x: k, y: T };
    } else
      throw new Error(`bad point: got length ${p}, expected compressed=${b} or uncompressed=${m}`);
  }
  const l = t.toBytes || d, g = t.fromBytes || h;
  function w(C) {
    const b = r.sqr(C), m = r.mul(b, C);
    return r.add(r.add(m, r.mul(C, i.a)), i.b);
  }
  function y(C, b) {
    const m = r.sqr(b), p = w(C);
    return r.eql(m, p);
  }
  if (!y(i.Gx, i.Gy))
    throw new Error("bad curve params: generator point");
  const S = r.mul(r.pow(i.a, tr), Nf), v = r.mul(r.sqr(i.b), BigInt(27));
  if (r.is0(r.add(S, v)))
    throw new Error("bad curve params: a or b");
  function R(C, b, m = !1) {
    if (!r.isValid(b) || m && r.is0(b))
      throw new Error(`bad point coordinate ${C}`);
    return b;
  }
  function $(C) {
    if (!(C instanceof _))
      throw new Error("Weierstrass Point expected");
  }
  function L(C) {
    if (!a || !a.basises)
      throw new Error("no endo");
    return Uf(C, a.basises, o.ORDER);
  }
  const j = gs((C, b) => {
    const { X: m, Y: p, Z: x } = C;
    if (r.eql(x, r.ONE))
      return { x: m, y: p };
    const A = C.is0();
    b == null && (b = A ? r.ONE : r.inv(x));
    const I = r.mul(m, b), k = r.mul(p, b), T = r.mul(x, b);
    if (A)
      return { x: r.ZERO, y: r.ZERO };
    if (!r.eql(T, r.ONE))
      throw new Error("invZ was invalid");
    return { x: I, y: k };
  }), E = gs((C) => {
    if (C.is0()) {
      if (t.allowInfinityPoint && !r.is0(C.Y))
        return;
      throw new Error("bad point: ZERO");
    }
    const { x: b, y: m } = C.toAffine();
    if (!r.isValid(b) || !r.isValid(m))
      throw new Error("bad point: x or y not field elements");
    if (!y(b, m))
      throw new Error("bad point: equation left != right");
    if (!C.isTorsionFree())
      throw new Error("bad point: not in prime-order subgroup");
    return !0;
  });
  function nt(C, b, m, p, x) {
    return m = new _(r.mul(m.X, C), m.Y, m.Z), b = Ar(p, b), m = Ar(x, m), b.add(m);
  }
  class _ {
    // base / generator point
    static BASE = new _(i.Gx, i.Gy, r.ONE);
    // zero / infinity / identity point
    static ZERO = new _(r.ZERO, r.ONE, r.ZERO);
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
      this.X = R("x", b), this.Y = R("y", m, !0), this.Z = R("z", p), Object.freeze(this);
    }
    static CURVE() {
      return i;
    }
    /** Does NOT validate if the point is valid. Use `.assertValidity()`. */
    static fromAffine(b) {
      const { x: m, y: p } = b || {};
      if (!b || !r.isValid(m) || !r.isValid(p))
        throw new Error("invalid affine point");
      if (b instanceof _)
        throw new Error("projective point not allowed");
      return r.is0(m) && r.is0(p) ? _.ZERO : new _(m, p, r.ONE);
    }
    static fromBytes(b) {
      const m = _.fromAffine(g(W(b, void 0, "point")));
      return m.assertValidity(), m;
    }
    static fromHex(b) {
      return _.fromBytes(Tr(b));
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
      return gt.createCache(this, b), m || this.multiply(tr), this;
    }
    // TODO: return `this`
    /** A point on curve is valid if it conforms to equation. */
    assertValidity() {
      E(this);
    }
    hasEvenY() {
      const { y: b } = this.toAffine();
      if (!r.isOdd)
        throw new Error("Field doesn't support isOdd");
      return !r.isOdd(b);
    }
    /** Compare one point to another. */
    equals(b) {
      $(b);
      const { X: m, Y: p, Z: x } = this, { X: A, Y: I, Z: k } = b, T = r.eql(r.mul(m, k), r.mul(A, x)), B = r.eql(r.mul(p, k), r.mul(I, x));
      return T && B;
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
      const { a: b, b: m } = i, p = r.mul(m, tr), { X: x, Y: A, Z: I } = this;
      let k = r.ZERO, T = r.ZERO, B = r.ZERO, U = r.mul(x, x), F = r.mul(A, A), H = r.mul(I, I), N = r.mul(x, A);
      return N = r.add(N, N), B = r.mul(x, I), B = r.add(B, B), k = r.mul(b, B), T = r.mul(p, H), T = r.add(k, T), k = r.sub(F, T), T = r.add(F, T), T = r.mul(k, T), k = r.mul(N, k), B = r.mul(p, B), H = r.mul(b, H), N = r.sub(U, H), N = r.mul(b, N), N = r.add(N, B), B = r.add(U, U), U = r.add(B, U), U = r.add(U, H), U = r.mul(U, N), T = r.add(T, U), H = r.mul(A, I), H = r.add(H, H), U = r.mul(H, N), k = r.sub(k, U), B = r.mul(H, F), B = r.add(B, B), B = r.add(B, B), new _(k, T, B);
    }
    // Renes-Costello-Batina exception-free addition formula.
    // There is 30% faster Jacobian formula, but it is not complete.
    // https://eprint.iacr.org/2015/1060, algorithm 1
    // Cost: 12M + 0S + 3*a + 3*b3 + 23add.
    add(b) {
      $(b);
      const { X: m, Y: p, Z: x } = this, { X: A, Y: I, Z: k } = b;
      let T = r.ZERO, B = r.ZERO, U = r.ZERO;
      const F = i.a, H = r.mul(i.b, tr);
      let N = r.mul(m, A), D = r.mul(p, I), G = r.mul(x, k), ot = r.add(m, p), K = r.add(A, I);
      ot = r.mul(ot, K), K = r.add(N, D), ot = r.sub(ot, K), K = r.add(m, x);
      let Y = r.add(A, k);
      return K = r.mul(K, Y), Y = r.add(N, G), K = r.sub(K, Y), Y = r.add(p, x), T = r.add(I, k), Y = r.mul(Y, T), T = r.add(D, G), Y = r.sub(Y, T), U = r.mul(F, K), T = r.mul(H, G), U = r.add(T, U), T = r.sub(D, U), U = r.add(D, U), B = r.mul(T, U), D = r.add(N, N), D = r.add(D, N), G = r.mul(F, G), K = r.mul(H, K), D = r.add(D, G), G = r.sub(N, G), G = r.mul(F, G), K = r.add(K, G), N = r.mul(D, K), B = r.add(B, N), N = r.mul(Y, K), T = r.mul(ot, T), T = r.sub(T, N), N = r.mul(ot, D), U = r.mul(Y, U), U = r.add(U, N), new _(T, B, U);
    }
    subtract(b) {
      return this.add(b.negate());
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
    multiply(b) {
      const { endo: m } = t;
      if (!o.isValidNot0(b))
        throw new Error("invalid scalar: out of range");
      let p, x;
      const A = (I) => gt.cached(this, I, (k) => ms(_, k));
      if (m) {
        const { k1neg: I, k1: k, k2neg: T, k2: B } = L(b), { p: U, f: F } = A(k), { p: H, f: N } = A(B);
        x = F.add(N), p = nt(m.beta, U, H, I, T);
      } else {
        const { p: I, f: k } = A(b);
        p = I, x = k;
      }
      return ms(_, [p, x])[0];
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
      if (b === se || p.is0())
        return _.ZERO;
      if (b === tn)
        return p;
      if (gt.hasCache(this))
        return this.multiply(b);
      if (m) {
        const { k1neg: x, k1: A, k2neg: I, k2: k } = L(b), { p1: T, p2: B } = Of(_, p, A, k);
        return nt(m.beta, T, B, x, I);
      } else
        return gt.unsafe(p, b);
    }
    /**
     * Converts Projective point to affine (x, y) coordinates.
     * @param invertedZ Z^-1 (inverted zero) - optional, precomputation is useful for invertBatch
     */
    toAffine(b) {
      return j(this, b);
    }
    /**
     * Checks whether Point is free of torsion elements (is in prime subgroup).
     * Always torsion-free for cofactor=1 curves.
     */
    isTorsionFree() {
      const { isTorsionFree: b } = t;
      return s === tn ? !0 : b ? b(_, this) : gt.unsafe(this, c).is0();
    }
    clearCofactor() {
      const { clearCofactor: b } = t;
      return s === tn ? this : b ? b(_, this) : this.multiplyUnsafe(s);
    }
    isSmallOrder() {
      return this.multiplyUnsafe(s).is0();
    }
    toBytes(b = !0) {
      return vr(b, "isCompressed"), this.assertValidity(), l(_, this, b);
    }
    toHex(b = !0) {
      return Jr(this.toBytes(b));
    }
    toString() {
      return `<Point ${this.is0() ? "ZERO" : this.toHex()}>`;
    }
  }
  const Pt = o.BITS, gt = new Bf(_, t.endo ? Math.ceil(Pt / 2) : Pt);
  return _.BASE.precompute(8), _;
}
function ra(e) {
  return Uint8Array.of(e ? 2 : 3);
}
function oa(e, t) {
  return {
    secretKey: t.BYTES,
    publicKey: 1 + e.BYTES,
    publicKeyUncompressed: 1 + 2 * e.BYTES,
    publicKeyHasPrefix: !0,
    signature: 2 * t.BYTES
  };
}
function _f(e, t = {}) {
  const { Fn: n } = e, r = t.randomBytes || Gn, o = Object.assign(oa(e.Fp, n), { seed: Yc(n.ORDER) });
  function i(l) {
    try {
      const g = n.fromBytes(l);
      return n.isValidNot0(g);
    } catch {
      return !1;
    }
  }
  function s(l, g) {
    const { publicKey: w, publicKeyUncompressed: y } = o;
    try {
      const S = l.length;
      return g === !0 && S !== w || g === !1 && S !== y ? !1 : !!e.fromBytes(l);
    } catch {
      return !1;
    }
  }
  function c(l = r(o.seed)) {
    return Zc(W(l, o.seed, "seed"), n.ORDER);
  }
  function a(l, g = !0) {
    return e.BASE.multiply(n.fromBytes(l)).toBytes(g);
  }
  function u(l) {
    const { secretKey: g, publicKey: w, publicKeyUncompressed: y } = o;
    if (!Ai(l) || "_lengths" in n && n._lengths || g === w)
      return;
    const S = W(l, void 0, "key").length;
    return S === w || S === y;
  }
  function f(l, g, w = !0) {
    if (u(l) === !0)
      throw new Error("first arg must be private key");
    if (u(g) === !1)
      throw new Error("second arg must be public key");
    const y = n.fromBytes(l);
    return e.fromBytes(g).multiply(y).toBytes(w);
  }
  const d = {
    isValidSecretKey: i,
    isValidPublicKey: s,
    randomSecretKey: c
  }, h = Jc(c, a);
  return Object.freeze({ getPublicKey: a, getSharedSecret: f, keygen: h, Point: e, utils: d, lengths: o });
}
function Cf(e, t, n = {}) {
  Uc(t), Bi(n, {}, {
    hmac: "function",
    lowS: "boolean",
    randomBytes: "function",
    bits2int: "function",
    bits2int_modN: "function"
  }), n = Object.assign({}, n);
  const r = n.randomBytes || Gn, o = n.hmac || ((m, p) => ea(t, m, p)), { Fp: i, Fn: s } = e, { ORDER: c, BITS: a } = s, { keygen: u, getPublicKey: f, getSharedSecret: d, utils: h, lengths: l } = _f(e, n), g = {
    prehash: !0,
    lowS: typeof n.lowS == "boolean" ? n.lowS : !0,
    format: "compact",
    extraEntropy: !1
  }, w = c * na < i.ORDER;
  function y(m) {
    const p = c >> tn;
    return m > p;
  }
  function S(m, p) {
    if (!s.isValidNot0(p))
      throw new Error(`invalid signature ${m}: out of range 1..Point.Fn.ORDER`);
    return p;
  }
  function v() {
    if (w)
      throw new Error('"recovered" sig type is not supported for cofactor >2 curves');
  }
  function R(m, p) {
    Mo(p);
    const x = l.signature, A = p === "compact" ? x : p === "recovered" ? x + 1 : void 0;
    return W(m, A);
  }
  class $ {
    r;
    s;
    recovery;
    constructor(p, x, A) {
      if (this.r = S("r", p), this.s = S("s", x), A != null) {
        if (v(), ![0, 1, 2, 3].includes(A))
          throw new Error("invalid recovery id");
        this.recovery = A;
      }
      Object.freeze(this);
    }
    static fromBytes(p, x = g.format) {
      R(p, x);
      let A;
      if (x === "der") {
        const { r: B, s: U } = me.toSig(W(p));
        return new $(B, U);
      }
      x === "recovered" && (A = p[0], x = "compact", p = p.subarray(1));
      const I = l.signature / 2, k = p.subarray(0, I), T = p.subarray(I, I * 2);
      return new $(s.fromBytes(k), s.fromBytes(T), A);
    }
    static fromHex(p, x) {
      return this.fromBytes(Tr(p), x);
    }
    assertRecovery() {
      const { recovery: p } = this;
      if (p == null)
        throw new Error("invalid recovery id: must be present");
      return p;
    }
    addRecoveryBit(p) {
      return new $(this.r, this.s, p);
    }
    recoverPublicKey(p) {
      const { r: x, s: A } = this, I = this.assertRecovery(), k = I === 2 || I === 3 ? x + c : x;
      if (!i.isValid(k))
        throw new Error("invalid recovery id: sig.r+curve.n != R.x");
      const T = i.toBytes(k), B = e.fromBytes(Ft(ra((I & 1) === 0), T)), U = s.inv(k), F = j(W(p, void 0, "msgHash")), H = s.create(-F * U), N = s.create(A * U), D = e.BASE.multiplyUnsafe(H).add(B.multiplyUnsafe(N));
      if (D.is0())
        throw new Error("invalid recovery: point at infinify");
      return D.assertValidity(), D;
    }
    // Signatures should be low-s, to prevent malleability.
    hasHighS() {
      return y(this.s);
    }
    toBytes(p = g.format) {
      if (Mo(p), p === "der")
        return Tr(me.hexFromSig(this));
      const { r: x, s: A } = this, I = s.toBytes(x), k = s.toBytes(A);
      return p === "recovered" ? (v(), Ft(Uint8Array.of(this.assertRecovery()), I, k)) : Ft(I, k);
    }
    toHex(p) {
      return Jr(this.toBytes(p));
    }
  }
  const L = n.bits2int || function(p) {
    if (p.length > 8192)
      throw new Error("input is too large");
    const x = de(p), A = p.length * 8 - a;
    return A > 0 ? x >> BigInt(A) : x;
  }, j = n.bits2int_modN || function(p) {
    return s.create(L(p));
  }, E = Ii(a);
  function nt(m) {
    return Hc("num < 2^" + a, m, se, E), s.toBytes(m);
  }
  function _(m, p) {
    return W(m, void 0, "message"), p ? W(t(m), void 0, "prehashed message") : m;
  }
  function Pt(m, p, x) {
    const { lowS: A, prehash: I, extraEntropy: k } = To(x, g);
    m = _(m, I);
    const T = j(m), B = s.fromBytes(p);
    if (!s.isValidNot0(B))
      throw new Error("invalid private key");
    const U = [nt(B), nt(T)];
    if (k != null && k !== !1) {
      const D = k === !0 ? r(l.secretKey) : k;
      U.push(W(D, void 0, "extraEntropy"));
    }
    const F = Ft(...U), H = T;
    function N(D) {
      const G = L(D);
      if (!s.isValidNot0(G))
        return;
      const ot = s.inv(G), K = e.BASE.multiply(G).toAffine(), Y = s.create(K.x);
      if (Y === se)
        return;
      const ne = s.create(ot * s.create(H + Y * B));
      if (ne === se)
        return;
      let vn = (K.x === Y ? 0 : 2) | Number(K.y & tn), An = ne;
      return A && y(ne) && (An = s.neg(ne), vn ^= 1), new $(Y, An, w ? void 0 : vn);
    }
    return { seed: F, k2sig: N };
  }
  function gt(m, p, x = {}) {
    const { seed: A, k2sig: I } = Pt(m, p, x);
    return yf(t.outputLen, s.BYTES, o)(A, I).toBytes(x.format);
  }
  function C(m, p, x, A = {}) {
    const { lowS: I, prehash: k, format: T } = To(A, g);
    if (x = W(x, void 0, "publicKey"), p = _(p, k), !Ai(m)) {
      const B = m instanceof $ ? ", use sig.toBytes()" : "";
      throw new Error("verify expects Uint8Array signature" + B);
    }
    R(m, T);
    try {
      const B = $.fromBytes(m, T), U = e.fromBytes(x);
      if (I && B.hasHighS())
        return !1;
      const { r: F, s: H } = B, N = j(p), D = s.inv(H), G = s.create(N * D), ot = s.create(F * D), K = e.BASE.multiplyUnsafe(G).add(U.multiplyUnsafe(ot));
      return K.is0() ? !1 : s.create(K.x) === F;
    } catch {
      return !1;
    }
  }
  function b(m, p, x = {}) {
    const { prehash: A } = To(x, g);
    return p = _(p, A), $.fromBytes(m, "recovered").recoverPublicKey(p).toBytes();
  }
  return Object.freeze({
    keygen: u,
    getPublicKey: f,
    getSharedSecret: d,
    utils: h,
    lengths: l,
    Point: e,
    sign: gt,
    verify: C,
    recoverPublicKey: b,
    Signature: $,
    hash: t
  });
}
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const eo = {
  p: BigInt("0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffefffffc2f"),
  n: BigInt("0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141"),
  h: BigInt(1),
  a: BigInt(0),
  b: BigInt(7),
  Gx: BigInt("0x79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798"),
  Gy: BigInt("0x483ada7726a3c4655da4fbfc0e1108a8fd17b448a68554199c47d08ffb10d4b8")
}, Pf = {
  beta: BigInt("0x7ae96a2b657c07106e64479eac3434e99cf0497512f58995c1396c28719501ee"),
  basises: [
    [BigInt("0x3086d221a7d46bcde86c90e49284eb15"), -BigInt("0xe4437ed6010e88286f547fa90abfe4c3")],
    [BigInt("0x114ca50f7a8e2f3f657c1108d9d44cfd8"), BigInt("0x3086d221a7d46bcde86c90e49284eb15")]
  ]
}, Vf = /* @__PURE__ */ BigInt(0), Fo = /* @__PURE__ */ BigInt(2);
function Hf(e) {
  const t = eo.p, n = BigInt(3), r = BigInt(6), o = BigInt(11), i = BigInt(22), s = BigInt(23), c = BigInt(44), a = BigInt(88), u = e * e * e % t, f = u * u * e % t, d = $t(f, n, t) * f % t, h = $t(d, n, t) * f % t, l = $t(h, Fo, t) * u % t, g = $t(l, o, t) * l % t, w = $t(g, i, t) * g % t, y = $t(w, c, t) * w % t, S = $t(y, a, t) * y % t, v = $t(S, c, t) * w % t, R = $t(v, n, t) * f % t, $ = $t(R, s, t) * g % t, L = $t($, r, t) * u % t, j = $t(L, Fo, t);
  if (!kr.eql(kr.sqr(j), e))
    throw new Error("Cannot find square root");
  return j;
}
const kr = to(eo.p, { sqrt: Hf }), Ye = /* @__PURE__ */ Lf(eo, {
  Fp: kr,
  endo: Pf
}), Ee = /* @__PURE__ */ Cf(Ye, yt), Ts = {};
function Ir(e, ...t) {
  let n = Ts[e];
  if (n === void 0) {
    const r = yt(pf(e));
    n = Ft(r, r), Ts[e] = n;
  }
  return yt(Ft(n, ...t));
}
const Ri = (e) => e.toBytes(!0).slice(1), Ui = (e) => e % Fo === Vf;
function zo(e) {
  const { Fn: t, BASE: n } = Ye, r = t.fromBytes(e), o = n.multiply(r);
  return { scalar: Ui(o.y) ? r : t.neg(r), bytes: Ri(o) };
}
function ia(e) {
  const t = kr;
  if (!t.isValidNot0(e))
    throw new Error("invalid x: Fail if x ≥ p");
  const n = t.create(e * e), r = t.create(n * e + BigInt(7));
  let o = t.sqrt(r);
  Ui(o) || (o = t.neg(o));
  const i = Ye.fromAffine({ x: e, y: o });
  return i.assertValidity(), i;
}
const $n = de;
function sa(...e) {
  return Ye.Fn.create($n(Ir("BIP0340/challenge", ...e)));
}
function vs(e) {
  return zo(e).bytes;
}
function Df(e, t, n = Gn(32)) {
  const { Fn: r } = Ye, o = W(e, void 0, "message"), { bytes: i, scalar: s } = zo(t), c = W(n, 32, "auxRand"), a = r.toBytes(s ^ $n(Ir("BIP0340/aux", c))), u = Ir("BIP0340/nonce", a, i, o), { bytes: f, scalar: d } = zo(u), h = sa(f, i, o), l = new Uint8Array(64);
  if (l.set(f, 0), l.set(r.toBytes(r.create(d + h * s)), 32), !ca(l, o, i))
    throw new Error("sign: Invalid signature produced");
  return l;
}
function ca(e, t, n) {
  const { Fp: r, Fn: o, BASE: i } = Ye, s = W(e, 64, "signature"), c = W(t, void 0, "message"), a = W(n, 32, "publicKey");
  try {
    const u = ia($n(a)), f = $n(s.subarray(0, 32));
    if (!r.isValidNot0(f))
      return !1;
    const d = $n(s.subarray(32, 64));
    if (!o.isValidNot0(d))
      return !1;
    const h = sa(o.toBytes(f), Ri(u), c), l = i.multiplyUnsafe(d).add(u.multiplyUnsafe(o.neg(h))), { x: g, y: w } = l.toAffine();
    return !(l.is0() || !Ui(w) || g !== f);
  } catch {
    return !1;
  }
}
const le = /* @__PURE__ */ (() => {
  const n = (r = Gn(48)) => Zc(r, eo.n);
  return {
    keygen: Jc(n, vs),
    getPublicKey: vs,
    sign: Df,
    verify: ca,
    Point: Ye,
    utils: {
      randomSecretKey: n,
      taggedHash: Ir,
      lift_x: ia,
      pointToBytes: Ri
    },
    lengths: {
      secretKey: 32,
      publicKey: 32,
      publicKeyHasPrefix: !1,
      signature: 64,
      seed: 48
    }
  };
})(), Kf = /* @__PURE__ */ Uint8Array.from([
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
]), aa = Uint8Array.from(new Array(16).fill(0).map((e, t) => t)), Mf = aa.map((e) => (9 * e + 5) % 16), ua = /* @__PURE__ */ (() => {
  const n = [[aa], [Mf]];
  for (let r = 0; r < 4; r++)
    for (let o of n)
      o.push(o[r].map((i) => Kf[i]));
  return n;
})(), fa = ua[0], da = ua[1], la = /* @__PURE__ */ [
  [11, 14, 15, 12, 5, 8, 7, 9, 11, 13, 14, 15, 6, 7, 9, 8],
  [12, 13, 11, 15, 6, 9, 9, 7, 12, 15, 11, 13, 7, 8, 7, 7],
  [13, 15, 14, 11, 7, 7, 6, 8, 13, 14, 13, 12, 5, 5, 6, 9],
  [14, 11, 12, 14, 8, 6, 5, 5, 15, 12, 15, 14, 9, 9, 8, 6],
  [15, 12, 13, 13, 9, 5, 8, 6, 14, 11, 12, 11, 8, 6, 5, 5]
].map((e) => Uint8Array.from(e)), Ff = /* @__PURE__ */ fa.map((e, t) => e.map((n) => la[t][n])), zf = /* @__PURE__ */ da.map((e, t) => e.map((n) => la[t][n])), Wf = /* @__PURE__ */ Uint32Array.from([
  0,
  1518500249,
  1859775393,
  2400959708,
  2840853838
]), Gf = /* @__PURE__ */ Uint32Array.from([
  1352829926,
  1548603684,
  1836072691,
  2053994217,
  0
]);
function As(e, t, n, r) {
  return e === 0 ? t ^ n ^ r : e === 1 ? t & n | ~t & r : e === 2 ? (t | ~n) ^ r : e === 3 ? t & r | n & ~r : t ^ (n | ~r);
}
const er = /* @__PURE__ */ new Uint32Array(16);
class qf extends Lc {
  h0 = 1732584193;
  h1 = -271733879;
  h2 = -1732584194;
  h3 = 271733878;
  h4 = -1009589776;
  constructor() {
    super(64, 20, 8, !0);
  }
  get() {
    const { h0: t, h1: n, h2: r, h3: o, h4: i } = this;
    return [t, n, r, o, i];
  }
  set(t, n, r, o, i) {
    this.h0 = t | 0, this.h1 = n | 0, this.h2 = r | 0, this.h3 = o | 0, this.h4 = i | 0;
  }
  process(t, n) {
    for (let l = 0; l < 16; l++, n += 4)
      er[l] = t.getUint32(n, !0);
    let r = this.h0 | 0, o = r, i = this.h1 | 0, s = i, c = this.h2 | 0, a = c, u = this.h3 | 0, f = u, d = this.h4 | 0, h = d;
    for (let l = 0; l < 5; l++) {
      const g = 4 - l, w = Wf[l], y = Gf[l], S = fa[l], v = da[l], R = Ff[l], $ = zf[l];
      for (let L = 0; L < 16; L++) {
        const j = Qn(r + As(l, i, c, u) + er[S[L]] + w, R[L]) + d | 0;
        r = d, d = u, u = Qn(c, 10) | 0, c = i, i = j;
      }
      for (let L = 0; L < 16; L++) {
        const j = Qn(o + As(g, s, a, f) + er[v[L]] + y, $[L]) + h | 0;
        o = h, h = f, f = Qn(a, 10) | 0, a = s, s = j;
      }
    }
    this.set(this.h1 + c + f | 0, this.h2 + u + h | 0, this.h3 + d + o | 0, this.h4 + r + s | 0, this.h0 + i + a | 0);
  }
  roundClean() {
    sn(er);
  }
  destroy() {
    this.destroyed = !0, sn(this.buffer), this.set(0, 0, 0, 0, 0);
  }
}
const jf = /* @__PURE__ */ Nc(() => new qf());
/*! scure-base - MIT License (c) 2022 Paul Miller (paulmillr.com) */
function an(e) {
  return e instanceof Uint8Array || ArrayBuffer.isView(e) && e.constructor.name === "Uint8Array";
}
function ha(e) {
  if (!an(e))
    throw new Error("Uint8Array expected");
}
function pa(e, t) {
  return Array.isArray(t) ? t.length === 0 ? !0 : e ? t.every((n) => typeof n == "string") : t.every((n) => Number.isSafeInteger(n)) : !1;
}
function $i(e) {
  if (typeof e != "function")
    throw new Error("function expected");
  return !0;
}
function Ie(e, t) {
  if (typeof t != "string")
    throw new Error(`${e}: string expected`);
  return !0;
}
function En(e) {
  if (!Number.isSafeInteger(e))
    throw new Error(`invalid integer: ${e}`);
}
function Br(e) {
  if (!Array.isArray(e))
    throw new Error("array expected");
}
function Or(e, t) {
  if (!pa(!0, t))
    throw new Error(`${e}: array of strings expected`);
}
function Ni(e, t) {
  if (!pa(!1, t))
    throw new Error(`${e}: array of numbers expected`);
}
// @__NO_SIDE_EFFECTS__
function jn(...e) {
  const t = (i) => i, n = (i, s) => (c) => i(s(c)), r = e.map((i) => i.encode).reduceRight(n, t), o = e.map((i) => i.decode).reduce(n, t);
  return { encode: r, decode: o };
}
// @__NO_SIDE_EFFECTS__
function no(e) {
  const t = typeof e == "string" ? e.split("") : e, n = t.length;
  Or("alphabet", t);
  const r = new Map(t.map((o, i) => [o, i]));
  return {
    encode: (o) => (Br(o), o.map((i) => {
      if (!Number.isSafeInteger(i) || i < 0 || i >= n)
        throw new Error(`alphabet.encode: digit index outside alphabet "${i}". Allowed: ${e}`);
      return t[i];
    })),
    decode: (o) => (Br(o), o.map((i) => {
      Ie("alphabet.decode", i);
      const s = r.get(i);
      if (s === void 0)
        throw new Error(`Unknown letter: "${i}". Allowed: ${e}`);
      return s;
    }))
  };
}
// @__NO_SIDE_EFFECTS__
function ro(e = "") {
  return Ie("join", e), {
    encode: (t) => (Or("join.decode", t), t.join(e)),
    decode: (t) => (Ie("join.decode", t), t.split(e))
  };
}
// @__NO_SIDE_EFFECTS__
function Yf(e, t = "=") {
  return En(e), Ie("padding", t), {
    encode(n) {
      for (Or("padding.encode", n); n.length * e % 8; )
        n.push(t);
      return n;
    },
    decode(n) {
      Or("padding.decode", n);
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
function Zf(e) {
  return $i(e), { encode: (t) => t, decode: (t) => e(t) };
}
function ks(e, t, n) {
  if (t < 2)
    throw new Error(`convertRadix: invalid from=${t}, base cannot be less than 2`);
  if (n < 2)
    throw new Error(`convertRadix: invalid to=${n}, base cannot be less than 2`);
  if (Br(e), !e.length)
    return [];
  let r = 0;
  const o = [], i = Array.from(e, (c) => {
    if (En(c), c < 0 || c >= t)
      throw new Error(`invalid integer: ${c}`);
    return c;
  }), s = i.length;
  for (; ; ) {
    let c = 0, a = !0;
    for (let u = r; u < s; u++) {
      const f = i[u], d = t * c, h = d + f;
      if (!Number.isSafeInteger(h) || d / t !== c || h - f !== d)
        throw new Error("convertRadix: carry overflow");
      const l = h / n;
      c = h % n;
      const g = Math.floor(l);
      if (i[u] = g, !Number.isSafeInteger(g) || g * n + c !== h)
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
const ga = (e, t) => t === 0 ? e : ga(t, e % t), Rr = /* @__NO_SIDE_EFFECTS__ */ (e, t) => e + (t - ga(e, t)), gr = /* @__PURE__ */ (() => {
  let e = [];
  for (let t = 0; t < 40; t++)
    e.push(2 ** t);
  return e;
})();
function Wo(e, t, n, r) {
  if (Br(e), t <= 0 || t > 32)
    throw new Error(`convertRadix2: wrong from=${t}`);
  if (n <= 0 || n > 32)
    throw new Error(`convertRadix2: wrong to=${n}`);
  if (/* @__PURE__ */ Rr(t, n) > 32)
    throw new Error(`convertRadix2: carry overflow from=${t} to=${n} carryBits=${/* @__PURE__ */ Rr(t, n)}`);
  let o = 0, i = 0;
  const s = gr[t], c = gr[n] - 1, a = [];
  for (const u of e) {
    if (En(u), u >= s)
      throw new Error(`convertRadix2: invalid data word=${u} from=${t}`);
    if (o = o << t | u, i + t > 32)
      throw new Error(`convertRadix2: carry overflow pos=${i} from=${t}`);
    for (i += t; i >= n; i -= n)
      a.push((o >> i - n & c) >>> 0);
    const f = gr[i];
    if (f === void 0)
      throw new Error("invalid carry");
    o &= f - 1;
  }
  if (o = o << n - i & c, !r && i >= t)
    throw new Error("Excess padding");
  if (!r && o > 0)
    throw new Error(`Non-zero padding: ${o}`);
  return r && i > 0 && a.push(o >>> 0), a;
}
// @__NO_SIDE_EFFECTS__
function Xf(e) {
  En(e);
  const t = 2 ** 8;
  return {
    encode: (n) => {
      if (!an(n))
        throw new Error("radix.encode input should be Uint8Array");
      return ks(Array.from(n), t, e);
    },
    decode: (n) => (Ni("radix.decode", n), Uint8Array.from(ks(n, e, t)))
  };
}
// @__NO_SIDE_EFFECTS__
function Li(e, t = !1) {
  if (En(e), e <= 0 || e > 32)
    throw new Error("radix2: bits should be in (0..32]");
  if (/* @__PURE__ */ Rr(8, e) > 32 || /* @__PURE__ */ Rr(e, 8) > 32)
    throw new Error("radix2: carry overflow");
  return {
    encode: (n) => {
      if (!an(n))
        throw new Error("radix2.encode input should be Uint8Array");
      return Wo(Array.from(n), 8, e, !t);
    },
    decode: (n) => (Ni("radix2.decode", n), Uint8Array.from(Wo(n, e, 8, t)))
  };
}
function Is(e) {
  return $i(e), function(...t) {
    try {
      return e.apply(null, t);
    } catch {
    }
  };
}
function Qf(e, t) {
  return En(e), $i(t), {
    encode(n) {
      if (!an(n))
        throw new Error("checksum.encode: input should be Uint8Array");
      const r = t(n).slice(0, e), o = new Uint8Array(n.length + e);
      return o.set(n), o.set(r, n.length), o;
    },
    decode(n) {
      if (!an(n))
        throw new Error("checksum.decode: input should be Uint8Array");
      const r = n.slice(0, -e), o = n.slice(-e), i = t(r).slice(0, e);
      for (let s = 0; s < e; s++)
        if (i[s] !== o[s])
          throw new Error("Invalid checksum");
      return r;
    }
  };
}
const Jf = typeof Uint8Array.from([]).toBase64 == "function" && typeof Uint8Array.fromBase64 == "function", td = (e, t) => {
  Ie("base64", e);
  const n = /^[A-Za-z0-9=+/]+$/, r = "base64";
  if (e.length > 0 && !n.test(e))
    throw new Error("invalid base64");
  return Uint8Array.fromBase64(e, { alphabet: r, lastChunkHandling: "strict" });
}, wt = Jf ? {
  encode(e) {
    return ha(e), e.toBase64();
  },
  decode(e) {
    return td(e);
  }
} : /* @__PURE__ */ jn(/* @__PURE__ */ Li(6), /* @__PURE__ */ no("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"), /* @__PURE__ */ Yf(6), /* @__PURE__ */ ro("")), ed = /* @__NO_SIDE_EFFECTS__ */ (e) => /* @__PURE__ */ jn(/* @__PURE__ */ Xf(58), /* @__PURE__ */ no(e), /* @__PURE__ */ ro("")), Go = /* @__PURE__ */ ed("123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"), nd = (e) => /* @__PURE__ */ jn(Qf(4, (t) => e(e(t))), Go), qo = /* @__PURE__ */ jn(/* @__PURE__ */ no("qpzry9x8gf2tvdw0s3jn54khce6mua7l"), /* @__PURE__ */ ro("")), Bs = [996825010, 642813549, 513874426, 1027748829, 705979059];
function kn(e) {
  const t = e >> 25;
  let n = (e & 33554431) << 5;
  for (let r = 0; r < Bs.length; r++)
    (t >> r & 1) === 1 && (n ^= Bs[r]);
  return n;
}
function Os(e, t, n = 1) {
  const r = e.length;
  let o = 1;
  for (let i = 0; i < r; i++) {
    const s = e.charCodeAt(i);
    if (s < 33 || s > 126)
      throw new Error(`Invalid prefix (${e})`);
    o = kn(o) ^ s >> 5;
  }
  o = kn(o);
  for (let i = 0; i < r; i++)
    o = kn(o) ^ e.charCodeAt(i) & 31;
  for (let i of t)
    o = kn(o) ^ i;
  for (let i = 0; i < 6; i++)
    o = kn(o);
  return o ^= n, qo.encode(Wo([o % gr[30]], 30, 5, !1));
}
// @__NO_SIDE_EFFECTS__
function wa(e) {
  const t = e === "bech32" ? 1 : 734539939, n = /* @__PURE__ */ Li(5), r = n.decode, o = n.encode, i = Is(r);
  function s(d, h, l = 90) {
    Ie("bech32.encode prefix", d), an(h) && (h = Array.from(h)), Ni("bech32.encode", h);
    const g = d.length;
    if (g === 0)
      throw new TypeError(`Invalid prefix length ${g}`);
    const w = g + 7 + h.length;
    if (l !== !1 && w > l)
      throw new TypeError(`Length ${w} exceeds limit ${l}`);
    const y = d.toLowerCase(), S = Os(y, h, t);
    return `${y}1${qo.encode(h)}${S}`;
  }
  function c(d, h = 90) {
    Ie("bech32.decode input", d);
    const l = d.length;
    if (l < 8 || h !== !1 && l > h)
      throw new TypeError(`invalid string length: ${l} (${d}). Expected (8..${h})`);
    const g = d.toLowerCase();
    if (d !== g && d !== d.toUpperCase())
      throw new Error("String must be lowercase or uppercase");
    const w = g.lastIndexOf("1");
    if (w === 0 || w === -1)
      throw new Error('Letter "1" must be present between prefix and data only');
    const y = g.slice(0, w), S = g.slice(w + 1);
    if (S.length < 6)
      throw new Error("Data must be at least 6 characters long");
    const v = qo.decode(S).slice(0, -6), R = Os(y, v, t);
    if (!S.endsWith(R))
      throw new Error(`Invalid checksum in ${d}: expected "${R}"`);
    return { prefix: y, words: v };
  }
  const a = Is(c);
  function u(d) {
    const { prefix: h, words: l } = c(d, !1);
    return { prefix: h, words: l, bytes: r(l) };
  }
  function f(d, h) {
    return s(d, o(h));
  }
  return {
    encode: s,
    decode: c,
    encodeFromBytes: f,
    decodeToBytes: u,
    decodeUnsafe: a,
    fromWords: r,
    fromWordsUnsafe: i,
    toWords: o
  };
}
const jo = /* @__PURE__ */ wa("bech32"), Xe = /* @__PURE__ */ wa("bech32m"), rd = {
  encode: (e) => new TextDecoder().decode(e),
  decode: (e) => new TextEncoder().encode(e)
}, od = typeof Uint8Array.from([]).toHex == "function" && typeof Uint8Array.fromHex == "function", id = {
  encode(e) {
    return ha(e), e.toHex();
  },
  decode(e) {
    return Ie("hex", e), Uint8Array.fromHex(e);
  }
}, O = od ? id : /* @__PURE__ */ jn(/* @__PURE__ */ Li(4), /* @__PURE__ */ no("0123456789abcdef"), /* @__PURE__ */ ro(""), /* @__PURE__ */ Zf((e) => {
  if (typeof e != "string" || e.length % 2 !== 0)
    throw new TypeError(`hex.decode: expected string, got ${typeof e} with length ${e.length}`);
  return e.toLowerCase();
})), rt = /* @__PURE__ */ Uint8Array.of(), ya = /* @__PURE__ */ Uint8Array.of(0);
function un(e, t) {
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
function sd(...e) {
  let t = 0;
  for (let r = 0; r < e.length; r++) {
    const o = e[r];
    if (!_t(o))
      throw new Error("Uint8Array expected");
    t += o.length;
  }
  const n = new Uint8Array(t);
  for (let r = 0, o = 0; r < e.length; r++) {
    const i = e[r];
    n.set(i, o), o += i.length;
  }
  return n;
}
const ma = (e) => new DataView(e.buffer, e.byteOffset, e.byteLength);
function Yn(e) {
  return Object.prototype.toString.call(e) === "[object Object]";
}
function Jt(e) {
  return Number.isSafeInteger(e);
}
const _i = {
  equalBytes: un,
  isBytes: _t,
  concatBytes: sd
}, ba = (e) => {
  if (e !== null && typeof e != "string" && !zt(e) && !_t(e) && !Jt(e))
    throw new Error(`lengthCoder: expected null | number | Uint8Array | CoderType, got ${e} (${typeof e})`);
  return {
    encodeStream(t, n) {
      if (e === null)
        return;
      if (zt(e))
        return e.encodeStream(t, n);
      let r;
      if (typeof e == "number" ? r = e : typeof e == "string" && (r = fe.resolve(t.stack, e)), typeof r == "bigint" && (r = Number(r)), r === void 0 || r !== n)
        throw t.err(`Wrong length: ${r} len=${e} exp=${n} (${typeof n})`);
    },
    decodeStream(t) {
      let n;
      if (zt(e) ? n = Number(e.decodeStream(t)) : typeof e == "number" ? n = e : typeof e == "string" && (n = fe.resolve(t.stack, e)), typeof n == "bigint" && (n = Number(n)), typeof n != "number")
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
    const { FULL_MASK: r, BITS: o } = dt, i = o - t % o, s = i ? r >>> i << i : r, c = [];
    for (let a = 0; a < e.length; a++) {
      let u = e[a];
      if (n && (u = ~u), a === e.length - 1 && (u &= s), u !== 0)
        for (let f = 0; f < o; f++) {
          const d = 1 << o - f - 1;
          u & d && c.push(a * o + f);
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
    const { FULL_MASK: i, BITS: s } = dt, c = n % s ? Math.floor(n / s) : void 0, a = n + r, u = a % s ? Math.floor(a / s) : void 0;
    if (c !== void 0 && c === u)
      return dt.set(e, c, i >>> s - r << s - r - n, o);
    if (c !== void 0 && !dt.set(e, c, i >>> n % s, o))
      return !1;
    const f = c !== void 0 ? c + 1 : n / s, d = u !== void 0 ? u : a / s;
    for (let h = f; h < d; h++)
      if (!dt.set(e, h, i, o))
        return !1;
    return !(u !== void 0 && c !== u && !dt.set(e, u, i << s - a % s, o));
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
    e.push(r), n((o, i) => {
      r.field = o, i(), r.field = void 0;
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
    const n = t.split("/"), r = e.map((s) => s.obj);
    let o = 0;
    for (; o < n.length && n[o] === ".."; o++)
      r.pop();
    let i = r.pop();
    for (; o < n.length; o++) {
      if (!i || i[n[o]] === void 0)
        return;
      i = i[n[o]];
    }
    return i;
  }
};
class Ci {
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
  constructor(t, n = {}, r = [], o = void 0, i = 0) {
    this.data = t, this.opts = n, this.stack = r, this.parent = o, this.parentOffset = i, this.view = ma(t);
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
        throw this.err(`${this.bitPos} bits left after unpack: ${O.encode(this.data.slice(this.pos))}`);
      if (this.bs && !this.parent) {
        const t = dt.indices(this.bs, this.data.length, !0);
        if (t.length) {
          const n = dt.range(t).map(({ pos: r, length: o }) => `(${r}/${o})[${O.encode(this.data.subarray(r, r + o))}]`).join(", ");
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
    return fe.err("Reader", this.stack, t);
  }
  offsetReader(t) {
    if (t > this.data.length)
      throw this.err("offsetReader: Unexpected end of buffer");
    return new Ci(this.absBytes(t), this.opts, this.stack, this, t);
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
      if (un(t, this.data.subarray(r, r + t.length)))
        return r;
    }
  }
}
class cd {
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
    this.stack = t, this.view = ma(this.viewBuf);
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
    const n = this.buffers.concat(this.ptrs.map((i) => i.buffer)), r = n.map((i) => i.length).reduce((i, s) => i + s, 0), o = new Uint8Array(r);
    for (let i = 0, s = 0; i < n.length; i++) {
      const c = n[i];
      o.set(c, s), s += c.length;
    }
    for (let i = this.pos, s = 0; s < this.ptrs.length; s++) {
      const c = this.ptrs[s];
      o.set(c.ptr.encode(i), c.pos), i += c.buffer.length;
    }
    if (t) {
      this.buffers = [];
      for (const i of this.ptrs)
        i.buffer.fill(0);
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
const Yo = (e) => Uint8Array.from(e).reverse();
function ad(e, t, n) {
  if (n) {
    const r = 2n ** (t - 1n);
    if (e < -r || e >= r)
      throw new Error(`value out of signed bounds. Expected ${-r} <= ${e} < ${r}`);
  } else if (0n > e || e >= 2n ** t)
    throw new Error(`value out of unsigned bounds. Expected 0 <= ${e} < ${2n ** t}`);
}
function xa(e) {
  return {
    // NOTE: we cannot export validate here, since it is likely mistake.
    encodeStream: e.encodeStream,
    decodeStream: e.decodeStream,
    size: e.size,
    encode: (t) => {
      const n = new cd();
      return e.encodeStream(n, t), n.finish();
    },
    decode: (t, n = {}) => {
      const r = new Ci(t, n), o = e.decodeStream(r);
      return r.finish(), o;
    }
  };
}
function At(e, t) {
  if (!zt(e))
    throw new Error(`validate: invalid inner value ${e}`);
  if (typeof t != "function")
    throw new Error("validate: fn should be function");
  return xa({
    size: e.size,
    encodeStream: (n, r) => {
      let o;
      try {
        o = t(r);
      } catch (i) {
        throw n.err(i);
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
  const t = xa(e);
  return e.validate ? At(t, e.validate) : t;
}, oo = (e) => Yn(e) && typeof e.decode == "function" && typeof e.encode == "function";
function zt(e) {
  return Yn(e) && oo(e) && typeof e.encodeStream == "function" && typeof e.decodeStream == "function" && (e.size === void 0 || Jt(e.size));
}
function ud() {
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
      if (!Yn(e))
        throw new Error(`expected plain object, got ${e}`);
      return Object.entries(e);
    }
  };
}
const fd = {
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
function dd(e) {
  if (!Yn(e))
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
function ld(e, t = !1) {
  if (!Jt(e))
    throw new Error(`decimal/precision: wrong value ${e}`);
  if (typeof t != "boolean")
    throw new Error(`decimal/round: expected boolean, got ${typeof t}`);
  const n = 10n ** BigInt(e);
  return {
    encode: (r) => {
      if (typeof r != "bigint")
        throw new Error(`expected bigint, got ${typeof r}`);
      let o = (r < 0n ? -r : r).toString(10), i = o.length - e;
      i < 0 && (o = o.padStart(o.length - i, "0"), i = 0);
      let s = o.length - 1;
      for (; s >= i && o[s] === "0"; s--)
        ;
      let c = o.slice(0, i), a = o.slice(i, s + 1);
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
      let i = r.indexOf(".");
      i = i === -1 ? r.length : i;
      const s = r.slice(0, i), c = r.slice(i + 1).replace(/0+$/, ""), a = BigInt(s) * n;
      if (!t && c.length > e)
        throw new Error(`fractional part cannot be represented with this precision (num=${r}, prec=${e})`);
      const u = Math.min(c.length, e), f = BigInt(c.slice(0, u)) * 10n ** BigInt(e - u), d = a + f;
      return o ? -d : d;
    }
  };
}
function hd(e) {
  if (!Array.isArray(e))
    throw new Error(`expected array, got ${typeof e}`);
  for (const t of e)
    if (!oo(t))
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
const Ea = (e) => {
  if (!oo(e))
    throw new Error("BaseCoder expected");
  return { encode: e.decode, decode: e.encode };
}, io = { dict: ud, numberBigint: fd, tsEnum: dd, decimal: ld, match: hd, reverse: Ea }, Pi = (e, t = !1, n = !1, r = !0) => {
  if (!Jt(e))
    throw new Error(`bigint/size: wrong value ${e}`);
  if (typeof t != "boolean")
    throw new Error(`bigint/le: expected boolean, got ${typeof t}`);
  if (typeof n != "boolean")
    throw new Error(`bigint/signed: expected boolean, got ${typeof n}`);
  if (typeof r != "boolean")
    throw new Error(`bigint/sized: expected boolean, got ${typeof r}`);
  const o = BigInt(e), i = 2n ** (8n * o - 1n);
  return kt({
    size: r ? e : void 0,
    encodeStream: (s, c) => {
      n && c < 0 && (c = c | i);
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
      s.bytes(t ? u.reverse() : u);
    },
    decodeStream: (s) => {
      const c = s.bytes(r ? e : Math.min(e, s.leftBytes)), a = t ? c : Yo(c);
      let u = 0n;
      for (let f = 0; f < a.length; f++)
        u |= BigInt(a[f]) << 8n * BigInt(f);
      return n && u & i && (u = (u ^ i) - i), u;
    },
    validate: (s) => {
      if (typeof s != "bigint")
        throw new Error(`bigint: invalid value: ${s}`);
      return ad(s, 8n * o, !!n), s;
    }
  });
}, Sa = /* @__PURE__ */ Pi(32, !1), wr = /* @__PURE__ */ Pi(8, !0), pd = /* @__PURE__ */ Pi(8, !0, !0), gd = (e, t) => kt({
  size: e,
  encodeStream: (n, r) => n.writeView(e, (o) => t.write(o, r)),
  decodeStream: (n) => n.readView(e, t.read),
  validate: (n) => {
    if (typeof n != "number")
      throw new Error(`viewCoder: expected number, got ${typeof n}`);
    return t.validate && t.validate(n), n;
  }
}), Zn = (e, t, n) => {
  const r = e * 8, o = 2 ** (r - 1), i = (a) => {
    if (!Jt(a))
      throw new Error(`sintView: value is not safe integer: ${a}`);
    if (a < -o || a >= o)
      throw new Error(`sintView: value out of bounds. Expected ${-o} <= ${a} < ${o}`);
  }, s = 2 ** r, c = (a) => {
    if (!Jt(a))
      throw new Error(`uintView: value is not safe integer: ${a}`);
    if (0 > a || a >= s)
      throw new Error(`uintView: value out of bounds. Expected 0 <= ${a} < ${s}`);
  };
  return gd(e, {
    write: n.write,
    read: n.read,
    validate: t ? i : c
  });
}, Z = /* @__PURE__ */ Zn(4, !1, {
  read: (e, t) => e.getUint32(t, !0),
  write: (e, t) => e.setUint32(0, t, !0)
}), wd = /* @__PURE__ */ Zn(4, !1, {
  read: (e, t) => e.getUint32(t, !1),
  write: (e, t) => e.setUint32(0, t, !1)
}), Qe = /* @__PURE__ */ Zn(4, !0, {
  read: (e, t) => e.getInt32(t, !0),
  write: (e, t) => e.setInt32(0, t, !0)
}), Rs = /* @__PURE__ */ Zn(2, !1, {
  read: (e, t) => e.getUint16(t, !0),
  write: (e, t) => e.setUint16(0, t, !0)
}), Se = /* @__PURE__ */ Zn(1, !1, {
  read: (e, t) => e.getUint8(t),
  write: (e, t) => e.setUint8(0, t)
}), et = (e, t = !1) => {
  if (typeof t != "boolean")
    throw new Error(`bytes/le: expected boolean, got ${typeof t}`);
  const n = ba(e), r = _t(e);
  return kt({
    size: typeof e == "number" ? e : void 0,
    encodeStream: (o, i) => {
      r || n.encodeStream(o, i.length), o.bytes(t ? Yo(i) : i), r && o.bytes(e);
    },
    decodeStream: (o) => {
      let i;
      if (r) {
        const s = o.find(e);
        if (!s)
          throw o.err("bytes: cannot find terminator");
        i = o.bytes(s - o.pos), o.bytes(e.length);
      } else
        i = o.bytes(e === null ? o.leftBytes : n.decodeStream(o));
      return t ? Yo(i) : i;
    },
    validate: (o) => {
      if (!_t(o))
        throw new Error(`bytes: invalid value ${o}`);
      return o;
    }
  });
};
function yd(e, t) {
  if (!zt(t))
    throw new Error(`prefix: invalid inner value ${t}`);
  return Be(et(e), Ea(t));
}
const Vi = (e, t = !1) => At(Be(et(e, t), rd), (n) => {
  if (typeof n != "string")
    throw new Error(`expected string, got ${typeof n}`);
  return n;
}), md = (e, t = { isLE: !1, with0x: !1 }) => {
  let n = Be(et(e, t.isLE), O);
  const r = t.with0x;
  if (typeof r != "boolean")
    throw new Error(`hex/with0x: expected boolean, got ${typeof r}`);
  return r && (n = Be(n, {
    encode: (o) => `0x${o}`,
    decode: (o) => {
      if (!o.startsWith("0x"))
        throw new Error("hex(with0x=true).encode input should start with 0x");
      return o.slice(2);
    }
  })), n;
};
function Be(e, t) {
  if (!zt(e))
    throw new Error(`apply: invalid inner value ${e}`);
  if (!oo(t))
    throw new Error(`apply: invalid base value ${e}`);
  return kt({
    size: e.size,
    encodeStream: (n, r) => {
      let o;
      try {
        o = t.decode(r);
      } catch (i) {
        throw n.err("" + i);
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
const bd = (e, t = !1) => {
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
      return r && (r = un(n.bytes(e.length, !0), e), r && n.bytes(e.length)), r !== t;
    },
    validate: (n) => {
      if (n !== void 0 && typeof n != "boolean")
        throw new Error(`flag: expected boolean value or undefined, got ${typeof n}`);
      return n;
    }
  });
};
function xd(e, t, n) {
  if (!zt(t))
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
function Hi(e, t, n = !0) {
  if (!zt(e))
    throw new Error(`magic: invalid inner value ${e}`);
  if (typeof n != "boolean")
    throw new Error(`magic: expected boolean, got ${typeof n}`);
  return kt({
    size: e.size,
    encodeStream: (r, o) => e.encodeStream(r, t),
    decodeStream: (r) => {
      const o = e.decodeStream(r);
      if (n && typeof o != "object" && o !== t || _t(t) && !un(t, o))
        throw r.err(`magic: invalid value: ${o} !== ${t}`);
    },
    validate: (r) => {
      if (r !== void 0)
        throw new Error(`magic: wrong value=${typeof r}`);
      return r;
    }
  });
}
function Ta(e) {
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
  if (!Yn(e))
    throw new Error(`struct: expected plain object, got ${e}`);
  for (const t in e)
    if (!zt(e[t]))
      throw new Error(`struct: field ${t} is not CoderType`);
  return kt({
    size: Ta(Object.values(e)),
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
function Ed(e) {
  if (!Array.isArray(e))
    throw new Error(`Packed.Tuple: got ${typeof e} instead of array`);
  for (let t = 0; t < e.length; t++)
    if (!zt(e[t]))
      throw new Error(`tuple: field ${t} is not CoderType`);
  return kt({
    size: Ta(e),
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
function vt(e, t) {
  if (!zt(t))
    throw new Error(`array: invalid inner value ${t}`);
  const n = ba(typeof e == "string" ? `../${e}` : e);
  return kt({
    size: typeof e == "number" && t.size ? e * t.size : void 0,
    encodeStream: (r, o) => {
      const i = r;
      i.pushObj(o, (s) => {
        _t(e) || n.encodeStream(r, o.length);
        for (let c = 0; c < o.length; c++)
          s(`${c}`, () => {
            const a = o[c], u = r.pos;
            if (t.encodeStream(r, a), _t(e)) {
              if (e.length > i.pos - u)
                return;
              const f = i.finish(!1).subarray(u, i.pos);
              if (un(f.subarray(0, e.length), e))
                throw i.err(`array: inner element encoding same as separator. elm=${a} data=${f}`);
            }
          });
      }), _t(e) && r.bytes(e);
    },
    decodeStream: (r) => {
      const o = [];
      return r.pushObj(o, (i) => {
        if (e === null)
          for (let s = 0; !r.isEnd() && (i(`${s}`, () => o.push(t.decodeStream(r))), !(t.size && r.leftBytes < t.size)); s++)
            ;
        else if (_t(e))
          for (let s = 0; ; s++) {
            if (un(r.bytes(e.length, !0), e)) {
              r.bytes(e.length);
              break;
            }
            i(`${s}`, () => o.push(t.decodeStream(r)));
          }
        else {
          let s;
          i("arrayLen", () => s = n.decodeStream(r));
          for (let c = 0; c < s; c++)
            i(`${c}`, () => o.push(t.decodeStream(r)));
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
const Sn = Ee.Point, Us = Sn.Fn, va = Sn.Fn.ORDER, Xn = (e) => e % 2n === 0n, tt = _i.isBytes, xe = _i.concatBytes, st = _i.equalBytes, Aa = (e) => jf(yt(e)), ge = (...e) => yt(yt(xe(...e))), Zo = le.utils.randomSecretKey, Di = le.getPublicKey, ka = Ee.getPublicKey, $s = (e) => e.r < va / 2n;
function Sd(e, t, n = !1) {
  let r = Ee.Signature.fromBytes(Ee.sign(e, t, { prehash: !1 }));
  if (n && !$s(r)) {
    const o = new Uint8Array(32);
    let i = 0;
    for (; !$s(r); )
      if (o.set(Z.encode(i++)), r = Ee.Signature.fromBytes(Ee.sign(e, t, { prehash: !1, extraEntropy: o })), i > 4294967295)
        throw new Error("lowR counter overflow: report the error");
  }
  return r.toBytes("der");
}
const Ns = le.sign, Ki = le.utils.taggedHash, It = {
  ecdsa: 0,
  schnorr: 1
};
function fn(e, t) {
  const n = e.length;
  if (t === It.ecdsa) {
    if (n === 32)
      throw new Error("Expected non-Schnorr key");
    return Sn.fromBytes(e), e;
  } else if (t === It.schnorr) {
    if (n !== 32)
      throw new Error("Expected 32-byte Schnorr key");
    return le.utils.lift_x(de(e)), e;
  } else
    throw new Error("Unknown key type");
}
function Ia(e, t) {
  const r = le.utils.taggedHash("TapTweak", e, t), o = de(r);
  if (o >= va)
    throw new Error("tweak higher than curve order");
  return o;
}
function Td(e, t = Uint8Array.of()) {
  const n = le.utils, r = de(e), o = Sn.BASE.multiply(r), i = Xn(o.y) ? r : Us.neg(r), s = n.pointToBytes(o), c = Ia(s, t);
  return qn(Us.add(i, c), 32);
}
function Xo(e, t) {
  const n = le.utils, r = Ia(e, t), i = n.lift_x(de(e)).add(Sn.BASE.multiply(r)), s = Xn(i.y) ? 0 : 1;
  return [n.pointToBytes(i), s];
}
const Mi = yt(Sn.BASE.toBytes(!1)), dn = {
  bech32: "bc",
  pubKeyHash: 0,
  scriptHash: 5,
  wif: 128
}, nr = {
  bech32: "tb",
  pubKeyHash: 111,
  scriptHash: 196,
  wif: 239
};
function Ur(e, t) {
  if (!tt(e) || !tt(t))
    throw new Error(`cmp: wrong type a=${typeof e} b=${typeof t}`);
  const n = Math.min(e.length, t.length);
  for (let r = 0; r < n; r++)
    if (e[r] != t[r])
      return Math.sign(e[r] - t[r]);
  return Math.sign(e.length - t.length);
}
function Ba(e) {
  const t = {};
  for (const n in e) {
    if (t[e[n]] !== void 0)
      throw new Error("duplicate key");
    t[e[n]] = n;
  }
  return t;
}
const ft = {
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
}, vd = Ba(ft);
function Fi(e = 6, t = !1) {
  return kt({
    encodeStream: (n, r) => {
      if (r === 0n)
        return;
      const o = r < 0, i = BigInt(r), s = [];
      for (let c = o ? -i : i; c; c >>= 8n)
        s.push(Number(c & 0xffn));
      s[s.length - 1] >= 128 ? s.push(o ? 128 : 0) : o && (s[s.length - 1] |= 128), n.bytes(new Uint8Array(s));
    },
    decodeStream: (n) => {
      const r = n.leftBytes;
      if (r > e)
        throw new Error(`ScriptNum: number (${r}) bigger than limit=${e}`);
      if (r === 0)
        return 0n;
      if (t) {
        const s = n.bytes(r, !0);
        if ((s[s.length - 1] & 127) === 0 && (r <= 1 || (s[s.length - 2] & 128) === 0))
          throw new Error("Non-minimally encoded ScriptNum");
      }
      let o = 0, i = 0n;
      for (let s = 0; s < r; ++s)
        o = n.byte(), i |= BigInt(o) << 8n * BigInt(s);
      return o >= 128 && (i &= 2n ** BigInt(r * 8) - 1n >> 1n, i = -i), i;
    }
  });
}
function Ad(e, t = 4, n = !0) {
  if (typeof e == "number")
    return e;
  if (tt(e))
    try {
      const r = Fi(t, n).decode(e);
      return r > Number.MAX_SAFE_INTEGER ? void 0 : Number(r);
    } catch {
      return;
    }
}
const M = kt({
  encodeStream: (e, t) => {
    for (let n of t) {
      if (typeof n == "string") {
        if (ft[n] === void 0)
          throw new Error(`Unknown opcode=${n}`);
        e.byte(ft[n]);
        continue;
      } else if (typeof n == "number") {
        if (n === 0) {
          e.byte(0);
          continue;
        } else if (1 <= n && n <= 16) {
          e.byte(ft.OP_1 - 1 + n);
          continue;
        }
      }
      if (typeof n == "number" && (n = Fi().encode(BigInt(n))), !tt(n))
        throw new Error(`Wrong Script OP=${n} (${typeof n})`);
      const r = n.length;
      r < ft.PUSHDATA1 ? e.byte(r) : r <= 255 ? (e.byte(ft.PUSHDATA1), e.byte(r)) : r <= 65535 ? (e.byte(ft.PUSHDATA2), e.bytes(Rs.encode(r))) : (e.byte(ft.PUSHDATA4), e.bytes(Z.encode(r))), e.bytes(n);
    }
  },
  decodeStream: (e) => {
    const t = [];
    for (; !e.isEnd(); ) {
      const n = e.byte();
      if (ft.OP_0 < n && n <= ft.PUSHDATA4) {
        let r;
        if (n < ft.PUSHDATA1)
          r = n;
        else if (n === ft.PUSHDATA1)
          r = Se.decodeStream(e);
        else if (n === ft.PUSHDATA2)
          r = Rs.decodeStream(e);
        else if (n === ft.PUSHDATA4)
          r = Z.decodeStream(e);
        else
          throw new Error("Should be not possible");
        t.push(e.bytes(r));
      } else if (n === 0)
        t.push(0);
      else if (ft.OP_1 <= n && n <= ft.OP_16)
        t.push(n - (ft.OP_1 - 1));
      else {
        const r = vd[n];
        if (r === void 0)
          throw new Error(`Unknown opcode=${n.toString(16)}`);
        t.push(r);
      }
    }
    return t;
  }
}), Ls = {
  253: [253, 2, 253n, 65535n],
  254: [254, 4, 65536n, 4294967295n],
  255: [255, 8, 4294967296n, 18446744073709551615n]
}, so = kt({
  encodeStream: (e, t) => {
    if (typeof t == "number" && (t = BigInt(t)), 0n <= t && t <= 252n)
      return e.byte(Number(t));
    for (const [n, r, o, i] of Object.values(Ls))
      if (!(o > t || t > i)) {
        e.byte(n);
        for (let s = 0; s < r; s++)
          e.byte(Number(t >> 8n * BigInt(s) & 0xffn));
        return;
      }
    throw e.err(`VarInt too big: ${t}`);
  },
  decodeStream: (e) => {
    const t = e.byte();
    if (t <= 252)
      return BigInt(t);
    const [n, r, o] = Ls[t];
    let i = 0n;
    for (let s = 0; s < r; s++)
      i |= BigInt(e.byte()) << 8n * BigInt(s);
    if (i < o)
      throw e.err(`Wrong CompactSize(${8 * r})`);
    return i;
  }
}), Wt = Be(so, io.numberBigint), Kt = et(so), Hn = vt(Wt, Kt), $r = (e) => vt(so, e), Oa = pt({
  txid: et(32, !0),
  // hash(prev_tx),
  index: Z,
  // output number of previous tx
  finalScriptSig: Kt,
  // btc merges input and output script, executes it. If ok = tx passes
  sequence: Z
  // ?
}), He = pt({ amount: wr, script: Kt }), kd = pt({
  version: Qe,
  segwitFlag: bd(new Uint8Array([0, 1])),
  inputs: $r(Oa),
  outputs: $r(He),
  witnesses: xd("segwitFlag", vt("inputs/length", Hn)),
  // < 500000000	Block number at which this transaction is unlocked
  // >= 500000000	UNIX timestamp at which this transaction is unlocked
  // Handled as part of PSBTv2
  lockTime: Z
});
function Id(e) {
  if (e.segwitFlag && e.witnesses && !e.witnesses.length)
    throw new Error("Segwit flag with empty witnesses array");
  return e;
}
const en = At(kd, Id), Un = pt({
  version: Qe,
  inputs: $r(Oa),
  outputs: $r(He),
  lockTime: Z
}), Qo = At(et(null), (e) => fn(e, It.ecdsa)), Nr = At(et(32), (e) => fn(e, It.schnorr)), _s = At(et(null), (e) => {
  if (e.length !== 64 && e.length !== 65)
    throw new Error("Schnorr signature should be 64 or 65 bytes long");
  return e;
}), co = pt({
  fingerprint: wd,
  path: vt(null, Z)
}), Ra = pt({
  hashes: vt(Wt, et(32)),
  der: co
}), Bd = et(78), Od = pt({ pubKey: Nr, leafHash: et(32) }), Rd = pt({
  version: Se,
  // With parity :(
  internalKey: et(32),
  merklePath: vt(null, et(32))
}), Xt = At(Rd, (e) => {
  if (e.merklePath.length > 128)
    throw new Error("TaprootControlBlock: merklePath should be of length 0..128 (inclusive)");
  return e;
}), Ud = vt(null, pt({
  depth: Se,
  version: Se,
  script: Kt
})), it = et(null), Cs = et(20), In = et(32), zi = {
  unsignedTx: [0, !1, Un, [0], [0], !1],
  xpub: [1, Bd, co, [], [0, 2], !1],
  txVersion: [2, !1, Z, [2], [2], !1],
  fallbackLocktime: [3, !1, Z, [], [2], !1],
  inputCount: [4, !1, Wt, [2], [2], !1],
  outputCount: [5, !1, Wt, [2], [2], !1],
  txModifiable: [6, !1, Se, [], [2], !1],
  // TODO: bitfield
  version: [251, !1, Z, [], [0, 2], !1],
  proprietary: [252, it, it, [], [0, 2], !1]
}, ao = {
  nonWitnessUtxo: [0, !1, en, [], [0, 2], !1],
  witnessUtxo: [1, !1, He, [], [0, 2], !1],
  partialSig: [2, Qo, it, [], [0, 2], !1],
  sighashType: [3, !1, Z, [], [0, 2], !1],
  redeemScript: [4, !1, it, [], [0, 2], !1],
  witnessScript: [5, !1, it, [], [0, 2], !1],
  bip32Derivation: [6, Qo, co, [], [0, 2], !1],
  finalScriptSig: [7, !1, it, [], [0, 2], !1],
  finalScriptWitness: [8, !1, Hn, [], [0, 2], !1],
  porCommitment: [9, !1, it, [], [0, 2], !1],
  ripemd160: [10, Cs, it, [], [0, 2], !1],
  sha256: [11, In, it, [], [0, 2], !1],
  hash160: [12, Cs, it, [], [0, 2], !1],
  hash256: [13, In, it, [], [0, 2], !1],
  txid: [14, !1, In, [2], [2], !0],
  index: [15, !1, Z, [2], [2], !0],
  sequence: [16, !1, Z, [], [2], !0],
  requiredTimeLocktime: [17, !1, Z, [], [2], !1],
  requiredHeightLocktime: [18, !1, Z, [], [2], !1],
  tapKeySig: [19, !1, _s, [], [0, 2], !1],
  tapScriptSig: [20, Od, _s, [], [0, 2], !1],
  tapLeafScript: [21, Xt, it, [], [0, 2], !1],
  tapBip32Derivation: [22, In, Ra, [], [0, 2], !1],
  tapInternalKey: [23, !1, Nr, [], [0, 2], !1],
  tapMerkleRoot: [24, !1, In, [], [0, 2], !1],
  proprietary: [252, it, it, [], [0, 2], !1]
}, $d = [
  "txid",
  "sequence",
  "index",
  "witnessUtxo",
  "nonWitnessUtxo",
  "finalScriptSig",
  "finalScriptWitness",
  "unknown"
], Nd = [
  "partialSig",
  "finalScriptSig",
  "finalScriptWitness",
  "tapKeySig",
  "tapScriptSig"
], Dn = {
  redeemScript: [0, !1, it, [], [0, 2], !1],
  witnessScript: [1, !1, it, [], [0, 2], !1],
  bip32Derivation: [2, Qo, co, [], [0, 2], !1],
  amount: [3, !1, pd, [2], [2], !0],
  script: [4, !1, it, [2], [2], !0],
  tapInternalKey: [5, !1, Nr, [], [0, 2], !1],
  tapTree: [6, !1, Ud, [], [0, 2], !1],
  tapBip32Derivation: [7, Nr, Ra, [], [0, 2], !1],
  proprietary: [252, it, it, [], [0, 2], !1]
}, Ld = [], Ps = vt(ya, pt({
  //  <key> := <keylen> <keytype> <keydata> WHERE keylen = len(keytype)+len(keydata)
  key: yd(Wt, pt({ type: Wt, key: et(null) })),
  //  <value> := <valuelen> <valuedata>
  value: et(Wt)
}));
function Jo(e) {
  const [t, n, r, o, i, s] = e;
  return { type: t, kc: n, vc: r, reqInc: o, allowInc: i, silentIgnore: s };
}
pt({ type: Wt, key: et(null) });
function Wi(e) {
  const t = {};
  for (const n in e) {
    const [r, o, i] = e[n];
    t[r] = [n, o, i];
  }
  return kt({
    encodeStream: (n, r) => {
      let o = [];
      for (const i in e) {
        const s = r[i];
        if (s === void 0)
          continue;
        const [c, a, u] = e[i];
        if (!a)
          o.push({ key: { type: c, key: rt }, value: u.encode(s) });
        else {
          const f = s.map(([d, h]) => [
            a.encode(d),
            u.encode(h)
          ]);
          f.sort((d, h) => Ur(d[0], h[0]));
          for (const [d, h] of f)
            o.push({ key: { key: d, type: c }, value: h });
        }
      }
      if (r.unknown) {
        r.unknown.sort((i, s) => Ur(i[0].key, s[0].key));
        for (const [i, s] of r.unknown)
          o.push({ key: i, value: s });
      }
      Ps.encodeStream(n, o);
    },
    decodeStream: (n) => {
      const r = Ps.decodeStream(n), o = {}, i = {};
      for (const s of r) {
        let c = "unknown", a = s.key.key, u = s.value;
        if (t[s.key.type]) {
          const [f, d, h] = t[s.key.type];
          if (c = f, !d && a.length)
            throw new Error(`PSBT: Non-empty key for ${c} (key=${O.encode(a)} value=${O.encode(u)}`);
          if (a = d ? d.decode(a) : void 0, u = h.decode(u), !d) {
            if (o[c])
              throw new Error(`PSBT: Same keys: ${c} (key=${a} value=${u})`);
            o[c] = u, i[c] = !0;
            continue;
          }
        } else
          a = { type: s.key.type, key: s.key.key };
        if (i[c])
          throw new Error(`PSBT: Key type with empty key and no key=${c} val=${u}`);
        o[c] || (o[c] = []), o[c].push([a, u]);
      }
      return o;
    }
  });
}
const Gi = At(Wi(ao), (e) => {
  if (e.finalScriptWitness && !e.finalScriptWitness.length)
    throw new Error("validateInput: empty finalScriptWitness");
  if (e.partialSig && !e.partialSig.length)
    throw new Error("Empty partialSig");
  if (e.partialSig)
    for (const [t] of e.partialSig)
      fn(t, It.ecdsa);
  if (e.bip32Derivation)
    for (const [t] of e.bip32Derivation)
      fn(t, It.ecdsa);
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
}), qi = At(Wi(Dn), (e) => {
  if (e.bip32Derivation)
    for (const [t] of e.bip32Derivation)
      fn(t, It.ecdsa);
  return e;
}), Ua = At(Wi(zi), (e) => {
  if ((e.version || 0) === 0) {
    if (!e.unsignedTx)
      throw new Error("PSBTv0: missing unsignedTx");
    for (const n of e.unsignedTx.inputs)
      if (n.finalScriptSig && n.finalScriptSig.length)
        throw new Error("PSBTv0: input scriptSig found in unsignedTx");
  }
  return e;
}), _d = pt({
  magic: Hi(Vi(new Uint8Array([255])), "psbt"),
  global: Ua,
  inputs: vt("global/unsignedTx/inputs/length", Gi),
  outputs: vt(null, qi)
}), Cd = pt({
  magic: Hi(Vi(new Uint8Array([255])), "psbt"),
  global: Ua,
  inputs: vt("global/inputCount", Gi),
  outputs: vt("global/outputCount", qi)
});
pt({
  magic: Hi(Vi(new Uint8Array([255])), "psbt"),
  items: vt(null, Be(vt(ya, Ed([md(Wt), et(so)])), io.dict()))
});
function vo(e, t, n) {
  for (const r in n) {
    if (r === "unknown" || !t[r])
      continue;
    const { allowInc: o } = Jo(t[r]);
    if (!o.includes(e))
      throw new Error(`PSBTv${e}: field ${r} is not allowed`);
  }
  for (const r in t) {
    const { reqInc: o } = Jo(t[r]);
    if (o.includes(e) && n[r] === void 0)
      throw new Error(`PSBTv${e}: missing required field ${r}`);
  }
}
function Vs(e, t, n) {
  const r = {};
  for (const o in n) {
    const i = o;
    if (i !== "unknown") {
      if (!t[i])
        continue;
      const { allowInc: s, silentIgnore: c } = Jo(t[i]);
      if (!s.includes(e)) {
        if (c)
          continue;
        throw new Error(`Failed to serialize in PSBTv${e}: ${i} but versions allows inclusion=${s}`);
      }
    }
    r[i] = n[i];
  }
  return r;
}
function $a(e) {
  const t = e && e.global && e.global.version || 0;
  vo(t, zi, e.global);
  for (const s of e.inputs)
    vo(t, ao, s);
  for (const s of e.outputs)
    vo(t, Dn, s);
  const n = t ? e.global.inputCount : e.global.unsignedTx.inputs.length;
  if (e.inputs.length < n)
    throw new Error("Not enough inputs");
  const r = e.inputs.slice(n);
  if (r.length > 1 || r.length && Object.keys(r[0]).length)
    throw new Error(`Unexpected inputs left in tx=${r}`);
  const o = t ? e.global.outputCount : e.global.unsignedTx.outputs.length;
  if (e.outputs.length < o)
    throw new Error("Not outputs inputs");
  const i = e.outputs.slice(o);
  if (i.length > 1 || i.length && Object.keys(i[0]).length)
    throw new Error(`Unexpected outputs left in tx=${i}`);
  return e;
}
function ti(e, t, n, r, o) {
  const i = { ...n, ...t };
  for (const s in e) {
    const c = s, [a, u, f] = e[c], d = r && !r.includes(s);
    if (t[s] === void 0 && s in t) {
      if (d)
        throw new Error(`Cannot remove signed field=${s}`);
      delete i[s];
    } else if (u) {
      const h = n && n[s] ? n[s] : [];
      let l = t[c];
      if (l) {
        if (!Array.isArray(l))
          throw new Error(`keyMap(${s}): KV pairs should be [k, v][]`);
        l = l.map((y) => {
          if (y.length !== 2)
            throw new Error(`keyMap(${s}): KV pairs should be [k, v][]`);
          return [
            typeof y[0] == "string" ? u.decode(O.decode(y[0])) : y[0],
            typeof y[1] == "string" ? f.decode(O.decode(y[1])) : y[1]
          ];
        });
        const g = {}, w = (y, S, v) => {
          if (g[y] === void 0) {
            g[y] = [S, v];
            return;
          }
          const R = O.encode(f.encode(g[y][1])), $ = O.encode(f.encode(v));
          if (R !== $)
            throw new Error(`keyMap(${c}): same key=${y} oldVal=${R} newVal=${$}`);
        };
        for (const [y, S] of h) {
          const v = O.encode(u.encode(y));
          w(v, y, S);
        }
        for (const [y, S] of l) {
          const v = O.encode(u.encode(y));
          if (S === void 0) {
            if (d)
              throw new Error(`Cannot remove signed field=${c}/${y}`);
            delete g[v];
          } else
            w(v, y, S);
        }
        i[c] = Object.values(g);
      }
    } else if (typeof i[s] == "string")
      i[s] = f.decode(O.decode(i[s]));
    else if (d && s in t && n && n[s] !== void 0 && !st(f.encode(t[s]), f.encode(n[s])))
      throw new Error(`Cannot change signed field=${s}`);
  }
  for (const s in i)
    if (!e[s]) {
      if (o && s === "unknown")
        continue;
      delete i[s];
    }
  return i;
}
const Hs = At(_d, $a), Ds = At(Cd, $a), Pd = {
  encode(e) {
    if (!(e.length !== 2 || e[0] !== 1 || !tt(e[1]) || O.encode(e[1]) !== "4e73"))
      return { type: "p2a", script: M.encode(e) };
  },
  decode: (e) => {
    if (e.type === "p2a")
      return [1, O.decode("4e73")];
  }
};
function Je(e, t) {
  try {
    return fn(e, t), !0;
  } catch {
    return !1;
  }
}
const Vd = {
  encode(e) {
    if (!(e.length !== 2 || !tt(e[0]) || !Je(e[0], It.ecdsa) || e[1] !== "CHECKSIG"))
      return { type: "pk", pubkey: e[0] };
  },
  decode: (e) => e.type === "pk" ? [e.pubkey, "CHECKSIG"] : void 0
}, Hd = {
  encode(e) {
    if (!(e.length !== 5 || e[0] !== "DUP" || e[1] !== "HASH160" || !tt(e[2])) && !(e[3] !== "EQUALVERIFY" || e[4] !== "CHECKSIG"))
      return { type: "pkh", hash: e[2] };
  },
  decode: (e) => e.type === "pkh" ? ["DUP", "HASH160", e.hash, "EQUALVERIFY", "CHECKSIG"] : void 0
}, Dd = {
  encode(e) {
    if (!(e.length !== 3 || e[0] !== "HASH160" || !tt(e[1]) || e[2] !== "EQUAL"))
      return { type: "sh", hash: e[1] };
  },
  decode: (e) => e.type === "sh" ? ["HASH160", e.hash, "EQUAL"] : void 0
}, Kd = {
  encode(e) {
    if (!(e.length !== 2 || e[0] !== 0 || !tt(e[1])) && e[1].length === 32)
      return { type: "wsh", hash: e[1] };
  },
  decode: (e) => e.type === "wsh" ? [0, e.hash] : void 0
}, Md = {
  encode(e) {
    if (!(e.length !== 2 || e[0] !== 0 || !tt(e[1])) && e[1].length === 20)
      return { type: "wpkh", hash: e[1] };
  },
  decode: (e) => e.type === "wpkh" ? [0, e.hash] : void 0
}, Fd = {
  encode(e) {
    const t = e.length - 1;
    if (e[t] !== "CHECKMULTISIG")
      return;
    const n = e[0], r = e[t - 1];
    if (typeof n != "number" || typeof r != "number")
      return;
    const o = e.slice(1, -2);
    if (r === o.length) {
      for (const i of o)
        if (!tt(i))
          return;
      return { type: "ms", m: n, pubkeys: o };
    }
  },
  // checkmultisig(n, ..pubkeys, m)
  decode: (e) => e.type === "ms" ? [e.m, ...e.pubkeys, e.pubkeys.length, "CHECKMULTISIG"] : void 0
}, zd = {
  encode(e) {
    if (!(e.length !== 2 || e[0] !== 1 || !tt(e[1])))
      return { type: "tr", pubkey: e[1] };
  },
  decode: (e) => e.type === "tr" ? [1, e.pubkey] : void 0
}, Wd = {
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
      if (!tt(o))
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
}, Gd = {
  encode(e) {
    const t = e.length - 1;
    if (e[t] !== "NUMEQUAL" || e[1] !== "CHECKSIG")
      return;
    const n = [], r = Ad(e[t - 1]);
    if (typeof r == "number") {
      for (let o = 0; o < t - 1; o++) {
        const i = e[o];
        if (o & 1) {
          if (i !== (o === 1 ? "CHECKSIG" : "CHECKSIGADD"))
            throw new Error("OutScript.encode/tr_ms: wrong element");
          continue;
        }
        if (!tt(i))
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
}, qd = {
  encode(e) {
    return { type: "unknown", script: M.encode(e) };
  },
  decode: (e) => e.type === "unknown" ? M.decode(e.script) : void 0
}, jd = [
  Pd,
  Vd,
  Hd,
  Dd,
  Kd,
  Md,
  Fd,
  zd,
  Wd,
  Gd,
  qd
], Yd = Be(M, io.match(jd)), at = At(Yd, (e) => {
  if (e.type === "pk" && !Je(e.pubkey, It.ecdsa))
    throw new Error("OutScript/pk: wrong key");
  if ((e.type === "pkh" || e.type === "sh" || e.type === "wpkh") && (!tt(e.hash) || e.hash.length !== 20))
    throw new Error(`OutScript/${e.type}: wrong hash`);
  if (e.type === "wsh" && (!tt(e.hash) || e.hash.length !== 32))
    throw new Error("OutScript/wsh: wrong hash");
  if (e.type === "tr" && (!tt(e.pubkey) || !Je(e.pubkey, It.schnorr)))
    throw new Error("OutScript/tr: wrong taproot public key");
  if ((e.type === "ms" || e.type === "tr_ns" || e.type === "tr_ms") && !Array.isArray(e.pubkeys))
    throw new Error("OutScript/multisig: wrong pubkeys array");
  if (e.type === "ms") {
    const t = e.pubkeys.length;
    for (const n of e.pubkeys)
      if (!Je(n, It.ecdsa))
        throw new Error("OutScript/multisig: wrong pubkey");
    if (e.m <= 0 || t > 16 || e.m > t)
      throw new Error("OutScript/multisig: invalid params");
  }
  if (e.type === "tr_ns" || e.type === "tr_ms") {
    for (const t of e.pubkeys)
      if (!Je(t, It.schnorr))
        throw new Error(`OutScript/${e.type}: wrong pubkey`);
  }
  if (e.type === "tr_ms") {
    const t = e.pubkeys.length;
    if (e.m <= 0 || t > 999 || e.m > t)
      throw new Error("OutScript/tr_ms: invalid params");
  }
  return e;
});
function Ks(e, t) {
  if (!st(e.hash, yt(t)))
    throw new Error("checkScript: wsh wrong witnessScript hash");
  const n = at.decode(t);
  if (n.type === "tr" || n.type === "tr_ns" || n.type === "tr_ms")
    throw new Error(`checkScript: P2${n.type} cannot be wrapped in P2SH`);
  if (n.type === "wpkh" || n.type === "sh")
    throw new Error(`checkScript: P2${n.type} cannot be wrapped in P2WSH`);
}
function Na(e, t, n) {
  if (e) {
    const r = at.decode(e);
    if (r.type === "tr_ns" || r.type === "tr_ms" || r.type === "ms" || r.type == "pk")
      throw new Error(`checkScript: non-wrapped ${r.type}`);
    if (r.type === "sh" && t) {
      if (!st(r.hash, Aa(t)))
        throw new Error("checkScript: sh wrong redeemScript hash");
      const o = at.decode(t);
      if (o.type === "tr" || o.type === "tr_ns" || o.type === "tr_ms")
        throw new Error(`checkScript: P2${o.type} cannot be wrapped in P2SH`);
      if (o.type === "sh")
        throw new Error("checkScript: P2SH cannot be wrapped in P2SH");
    }
    r.type === "wsh" && n && Ks(r, n);
  }
  if (t) {
    const r = at.decode(t);
    r.type === "wsh" && n && Ks(r, n);
  }
}
function Zd(e) {
  const t = {};
  for (const n of e) {
    const r = O.encode(n);
    if (t[r])
      throw new Error(`Multisig: non-uniq pubkey: ${e.map(O.encode)}`);
    t[r] = !0;
  }
}
function Xd(e, t, n = !1, r) {
  const o = at.decode(e);
  if (o.type === "unknown" && n)
    return;
  if (!["tr_ns", "tr_ms"].includes(o.type))
    throw new Error(`P2TR: invalid leaf script=${o.type}`);
  const i = o;
  if (!n && i.pubkeys)
    for (const s of i.pubkeys) {
      if (st(s, Mi))
        throw new Error("Unspendable taproot key in leaf script");
      if (st(s, t))
        throw new Error("Using P2TR with leaf script with same key as internal key is not supported");
    }
}
function La(e) {
  const t = Array.from(e);
  for (; t.length >= 2; ) {
    t.sort((s, c) => (c.weight || 1) - (s.weight || 1));
    const r = t.pop(), o = t.pop(), i = (o?.weight || 1) + (r?.weight || 1);
    t.push({
      weight: i,
      // Unwrap children array
      // TODO: Very hard to remove any here
      childs: [o?.childs || o, r?.childs || r]
    });
  }
  const n = t[0];
  return n?.childs || n;
}
function ei(e, t = []) {
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
    left: ei(e.left, [e.right.hash, ...t]),
    right: ei(e.right, [e.left.hash, ...t])
  };
}
function ni(e) {
  if (!e)
    throw new Error("taprootAddPath: empty tree");
  if (e.type === "leaf")
    return [e];
  if (e.type !== "branch")
    throw new Error(`taprootWalkTree: wrong type=${e}`);
  return [...ni(e.left), ...ni(e.right)];
}
function ri(e, t, n = !1, r) {
  if (!e)
    throw new Error("taprootHashTree: empty tree");
  if (Array.isArray(e) && e.length === 1 && (e = e[0]), !Array.isArray(e)) {
    const { leafVersion: a, script: u } = e;
    if (e.tapLeafScript || e.tapMerkleRoot && !st(e.tapMerkleRoot, rt))
      throw new Error("P2TR: tapRoot leafScript cannot have tree");
    const f = typeof u == "string" ? O.decode(u) : u;
    if (!tt(f))
      throw new Error(`checkScript: wrong script type=${f}`);
    return Xd(f, t, n), {
      type: "leaf",
      version: a,
      script: f,
      hash: Nn(f, a)
    };
  }
  if (e.length !== 2 && (e = La(e)), e.length !== 2)
    throw new Error("hashTree: non binary tree!");
  const o = ri(e[0], t, n), i = ri(e[1], t, n);
  let [s, c] = [o.hash, i.hash];
  return Ur(c, s) === -1 && ([s, c] = [c, s]), { type: "branch", left: o, right: i, hash: Ki("TapBranch", s, c) };
}
const Kn = 192, Nn = (e, t = Kn) => Ki("TapLeaf", new Uint8Array([t]), Kt.encode(e));
function Qd(e, t, n = dn, r = !1, o) {
  if (!e && !t)
    throw new Error("p2tr: should have pubKey or scriptTree (or both)");
  const i = typeof e == "string" ? O.decode(e) : e || Mi;
  if (!Je(i, It.schnorr))
    throw new Error("p2tr: non-schnorr pubkey");
  if (t) {
    let s = ei(ri(t, i, r));
    const c = s.hash, [a, u] = Xo(i, c), f = ni(s).map((d) => ({
      ...d,
      controlBlock: Xt.encode({
        version: (d.version || Kn) + u,
        internalKey: i,
        merklePath: d.path
      })
    }));
    return {
      type: "tr",
      script: at.encode({ type: "tr", pubkey: a }),
      address: ze(n).encode({ type: "tr", pubkey: a }),
      // For tests
      tweakedPubkey: a,
      // PSBT stuff
      tapInternalKey: i,
      leaves: f,
      tapLeafScript: f.map((d) => [
        Xt.decode(d.controlBlock),
        xe(d.script, new Uint8Array([d.version || Kn]))
      ]),
      tapMerkleRoot: c
    };
  } else {
    const s = Xo(i, rt)[0];
    return {
      type: "tr",
      script: at.encode({ type: "tr", pubkey: s }),
      address: ze(n).encode({ type: "tr", pubkey: s }),
      // For tests
      tweakedPubkey: s,
      // PSBT stuff
      tapInternalKey: i
    };
  }
}
function Jd(e, t, n = !1) {
  return n || Zd(t), {
    type: "tr_ms",
    script: at.encode({ type: "tr_ms", pubkeys: t, m: e })
  };
}
const _a = nd(yt);
function Ca(e, t) {
  if (t.length < 2 || t.length > 40)
    throw new Error("Witness: invalid length");
  if (e > 16)
    throw new Error("Witness: invalid version");
  if (e === 0 && !(t.length === 20 || t.length === 32))
    throw new Error("Witness: invalid length for version");
}
function Ao(e, t, n = dn) {
  Ca(e, t);
  const r = e === 0 ? jo : Xe;
  return r.encode(n.bech32, [e].concat(r.toWords(t)));
}
function Ms(e, t) {
  return _a.encode(xe(Uint8Array.from(t), e));
}
function ze(e = dn) {
  return {
    encode(t) {
      const { type: n } = t;
      if (n === "wpkh")
        return Ao(0, t.hash, e);
      if (n === "wsh")
        return Ao(0, t.hash, e);
      if (n === "tr")
        return Ao(1, t.pubkey, e);
      if (n === "pkh")
        return Ms(t.hash, [e.pubKeyHash]);
      if (n === "sh")
        return Ms(t.hash, [e.scriptHash]);
      throw new Error(`Unknown address type=${n}`);
    },
    decode(t) {
      if (t.length < 14 || t.length > 74)
        throw new Error("Invalid address length");
      if (e.bech32 && t.toLowerCase().startsWith(`${e.bech32}1`)) {
        let r;
        try {
          if (r = jo.decode(t), r.words[0] !== 0)
            throw new Error(`bech32: wrong version=${r.words[0]}`);
        } catch {
          if (r = Xe.decode(t), r.words[0] === 0)
            throw new Error(`bech32m: wrong version=${r.words[0]}`);
        }
        if (r.prefix !== e.bech32)
          throw new Error(`wrong bech32 prefix=${r.prefix}`);
        const [o, ...i] = r.words, s = jo.fromWords(i);
        if (Ca(o, s), o === 0 && s.length === 32)
          return { type: "wsh", hash: s };
        if (o === 0 && s.length === 20)
          return { type: "wpkh", hash: s };
        if (o === 1 && s.length === 32)
          return { type: "tr", pubkey: s };
        throw new Error("Unknown witness program");
      }
      const n = _a.decode(t);
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
const rr = new Uint8Array(32), tl = {
  amount: 0xffffffffffffffffn,
  script: rt
}, el = (e) => Math.ceil(e / 4), nl = 8, rl = 2, Le = 0, ji = 4294967295;
io.decimal(nl);
const Ln = (e, t) => e === void 0 ? t : e;
function Lr(e) {
  if (Array.isArray(e))
    return e.map((t) => Lr(t));
  if (tt(e))
    return Uint8Array.from(e);
  if (["number", "bigint", "boolean", "string", "undefined"].includes(typeof e))
    return e;
  if (e === null)
    return e;
  if (typeof e == "object")
    return Object.fromEntries(Object.entries(e).map(([t, n]) => [t, Lr(n)]));
  throw new Error(`cloneDeep: unknown type=${e} (${typeof e})`);
}
const q = {
  DEFAULT: 0,
  ALL: 1,
  NONE: 2,
  SINGLE: 3,
  ANYONECANPAY: 128
}, We = {
  DEFAULT: q.DEFAULT,
  ALL: q.ALL,
  NONE: q.NONE,
  SINGLE: q.SINGLE,
  DEFAULT_ANYONECANPAY: q.DEFAULT | q.ANYONECANPAY,
  ALL_ANYONECANPAY: q.ALL | q.ANYONECANPAY,
  NONE_ANYONECANPAY: q.NONE | q.ANYONECANPAY,
  SINGLE_ANYONECANPAY: q.SINGLE | q.ANYONECANPAY
}, ol = Ba(We);
function il(e, t, n, r = rt) {
  return st(n, t) && (e = Td(e, r), t = Di(e)), { privKey: e, pubKey: t };
}
function _e(e) {
  if (e.script === void 0 || e.amount === void 0)
    throw new Error("Transaction/output: script and amount required");
  return { script: e.script, amount: e.amount };
}
function Bn(e) {
  if (e.txid === void 0 || e.index === void 0)
    throw new Error("Transaction/input: txid and index required");
  return {
    txid: e.txid,
    index: e.index,
    sequence: Ln(e.sequence, ji),
    finalScriptSig: Ln(e.finalScriptSig, rt)
  };
}
function ko(e) {
  for (const t in e) {
    const n = t;
    $d.includes(n) || delete e[n];
  }
}
const Io = pt({ txid: et(32, !0), index: Z });
function sl(e) {
  if (typeof e != "number" || typeof ol[e] != "string")
    throw new Error(`Invalid SigHash=${e}`);
  return e;
}
function Fs(e) {
  const t = e & 31;
  return {
    isAny: !!(e & q.ANYONECANPAY),
    isNone: t === q.NONE,
    isSingle: t === q.SINGLE
  };
}
function cl(e) {
  if (e !== void 0 && {}.toString.call(e) !== "[object Object]")
    throw new Error(`Wrong object type for transaction options: ${e}`);
  const t = {
    ...e,
    // Defaults
    version: Ln(e.version, rl),
    lockTime: Ln(e.lockTime, 0),
    PSBTVersion: Ln(e.PSBTVersion, 0)
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
function zs(e) {
  if (e.nonWitnessUtxo && e.index !== void 0) {
    const t = e.nonWitnessUtxo.outputs.length - 1;
    if (e.index > t)
      throw new Error(`validateInput: index(${e.index}) not in nonWitnessUtxo`);
    const n = e.nonWitnessUtxo.outputs[e.index];
    if (e.witnessUtxo && (!st(e.witnessUtxo.script, n.script) || e.witnessUtxo.amount !== n.amount))
      throw new Error("validateInput: witnessUtxo different from nonWitnessUtxo");
    if (e.txid) {
      if (e.nonWitnessUtxo.outputs.length - 1 < e.index)
        throw new Error("nonWitnessUtxo: incorect output index");
      const o = Mt.fromRaw(en.encode(e.nonWitnessUtxo), {
        allowUnknownOutputs: !0,
        disableScriptCheck: !0,
        allowUnknownInputs: !0
      }), i = O.encode(e.txid);
      if (o.isFinal && o.id !== i)
        throw new Error(`nonWitnessUtxo: wrong txid, exp=${i} got=${o.id}`);
    }
  }
  return e;
}
function yr(e) {
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
function Ws(e, t, n, r = !1, o = !1) {
  let { nonWitnessUtxo: i, txid: s } = e;
  typeof i == "string" && (i = O.decode(i)), tt(i) && (i = en.decode(i)), !("nonWitnessUtxo" in e) && i === void 0 && (i = t?.nonWitnessUtxo), typeof s == "string" && (s = O.decode(s)), s === void 0 && (s = t?.txid);
  let c = { ...t, ...e, nonWitnessUtxo: i, txid: s };
  !("nonWitnessUtxo" in e) && c.nonWitnessUtxo === void 0 && delete c.nonWitnessUtxo, c.sequence === void 0 && (c.sequence = ji), c.tapMerkleRoot === null && delete c.tapMerkleRoot, c = ti(ao, c, t, n, o), Gi.encode(c);
  let a;
  return c.nonWitnessUtxo && c.index !== void 0 ? a = c.nonWitnessUtxo.outputs[c.index] : c.witnessUtxo && (a = c.witnessUtxo), a && !r && Na(a && a.script, c.redeemScript, c.witnessScript), c;
}
function Gs(e, t = !1) {
  let n = "legacy", r = q.ALL;
  const o = yr(e), i = at.decode(o.script);
  let s = i.type, c = i;
  const a = [i];
  if (i.type === "tr")
    return r = q.DEFAULT, {
      txType: "taproot",
      type: "tr",
      last: i,
      lastScript: o.script,
      defaultSighash: r,
      sighash: e.sighashType || r
    };
  {
    if ((i.type === "wpkh" || i.type === "wsh") && (n = "segwit"), i.type === "sh") {
      if (!e.redeemScript)
        throw new Error("inputType: sh without redeemScript");
      let h = at.decode(e.redeemScript);
      (h.type === "wpkh" || h.type === "wsh") && (n = "segwit"), a.push(h), c = h, s += `-${h.type}`;
    }
    if (c.type === "wsh") {
      if (!e.witnessScript)
        throw new Error("inputType: wsh without witnessScript");
      let h = at.decode(e.witnessScript);
      h.type === "wsh" && (n = "segwit"), a.push(h), c = h, s += `-${h.type}`;
    }
    const u = a[a.length - 1];
    if (u.type === "sh" || u.type === "wsh")
      throw new Error("inputType: sh/wsh cannot be terminal type");
    const f = at.encode(u), d = {
      type: s,
      txType: n,
      last: u,
      lastScript: f,
      defaultSighash: r,
      sighash: e.sighashType || r
    };
    if (n === "legacy" && !t && !e.nonWitnessUtxo)
      throw new Error("Transaction/sign: legacy input without nonWitnessUtxo, can result in attack that forces paying higher fees. Pass allowLegacyWitnessUtxo=true, if you sure");
    return d;
  }
}
let Mt = class mr {
  global = {};
  inputs = [];
  // use getInput()
  outputs = [];
  // use getOutput()
  opts;
  constructor(t = {}) {
    const n = this.opts = cl(t);
    n.lockTime !== Le && (this.global.fallbackLocktime = n.lockTime), this.global.txVersion = n.version;
  }
  // Import
  static fromRaw(t, n = {}) {
    const r = en.decode(t), o = new mr({ ...n, version: r.version, lockTime: r.lockTime });
    for (const i of r.outputs)
      o.addOutput(i);
    if (o.outputs = r.outputs, o.inputs = r.inputs, r.witnesses)
      for (let i = 0; i < r.witnesses.length; i++)
        o.inputs[i].finalScriptWitness = r.witnesses[i];
    return o;
  }
  // PSBT
  static fromPSBT(t, n = {}) {
    let r;
    try {
      r = Hs.decode(t);
    } catch (d) {
      try {
        r = Ds.decode(t);
      } catch {
        throw d;
      }
    }
    const o = r.global.version || 0;
    if (o !== 0 && o !== 2)
      throw new Error(`Wrong PSBT version=${o}`);
    const i = r.global.unsignedTx, s = o === 0 ? i?.version : r.global.txVersion, c = o === 0 ? i?.lockTime : r.global.fallbackLocktime, a = new mr({ ...n, version: s, lockTime: c, PSBTVersion: o }), u = o === 0 ? i?.inputs.length : r.global.inputCount;
    a.inputs = r.inputs.slice(0, u).map((d, h) => zs({
      finalScriptSig: rt,
      ...r.global.unsignedTx?.inputs[h],
      ...d
    }));
    const f = o === 0 ? i?.outputs.length : r.global.outputCount;
    return a.outputs = r.outputs.slice(0, f).map((d, h) => ({
      ...d,
      ...r.global.unsignedTx?.outputs[h]
    })), a.global = { ...r.global, txVersion: s }, c !== Le && (a.global.fallbackLocktime = c), a;
  }
  toPSBT(t = this.opts.PSBTVersion) {
    if (t !== 0 && t !== 2)
      throw new Error(`Wrong PSBT version=${t}`);
    const n = this.inputs.map((i) => zs(Vs(t, ao, i)));
    for (const i of n)
      i.partialSig && !i.partialSig.length && delete i.partialSig, i.finalScriptSig && !i.finalScriptSig.length && delete i.finalScriptSig, i.finalScriptWitness && !i.finalScriptWitness.length && delete i.finalScriptWitness;
    const r = this.outputs.map((i) => Vs(t, Dn, i)), o = { ...this.global };
    return t === 0 ? (o.unsignedTx = Un.decode(Un.encode({
      version: this.version,
      lockTime: this.lockTime,
      inputs: this.inputs.map(Bn).map((i) => ({
        ...i,
        finalScriptSig: rt
      })),
      outputs: this.outputs.map(_e)
    })), delete o.fallbackLocktime, delete o.txVersion) : (o.version = t, o.txVersion = this.version, o.inputCount = this.inputs.length, o.outputCount = this.outputs.length, o.fallbackLocktime && o.fallbackLocktime === Le && delete o.fallbackLocktime), this.opts.bip174jsCompat && (n.length || n.push({}), r.length || r.push({})), (t === 0 ? Hs : Ds).encode({
      global: o,
      inputs: n,
      outputs: r
    });
  }
  // BIP370 lockTime (https://github.com/bitcoin/bips/blob/master/bip-0370.mediawiki#determining-lock-time)
  get lockTime() {
    let t = Le, n = 0, r = Le, o = 0;
    for (const i of this.inputs)
      i.requiredHeightLocktime && (t = Math.max(t, i.requiredHeightLocktime), n++), i.requiredTimeLocktime && (r = Math.max(r, i.requiredTimeLocktime), o++);
    return n && n >= o ? t : r !== Le ? r : this.global.fallbackLocktime || Le;
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
    const n = this.inputs[t].sighashType, r = n === void 0 ? q.DEFAULT : n, o = r === q.DEFAULT ? q.ALL : r & 3;
    return { sigInputs: r & q.ANYONECANPAY, sigOutputs: o };
  }
  // Very nice for debug purposes, but slow. If there is too much inputs/outputs to add, will be quadratic.
  // Some cache will be nice, but there chance to have bugs with cache invalidation
  signStatus() {
    let t = !0, n = !0, r = [], o = [];
    for (let i = 0; i < this.inputs.length; i++) {
      if (this.inputStatus(i) === "unsigned")
        continue;
      const { sigInputs: c, sigOutputs: a } = this.inputSighash(i);
      if (c === q.ANYONECANPAY ? r.push(i) : t = !1, a === q.ALL)
        n = !1;
      else if (a === q.SINGLE)
        o.push(i);
      else if (a !== q.NONE) throw new Error(`Wrong signature hash output type: ${a}`);
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
    const n = this.outputs.map(_e);
    t += 4 * Wt.encode(this.outputs.length).length;
    for (const r of n)
      t += 32 + 4 * Kt.encode(r.script).length;
    this.hasWitnesses && (t += 2), t += 4 * Wt.encode(this.inputs.length).length;
    for (const r of this.inputs)
      t += 160 + 4 * Kt.encode(r.finalScriptSig || rt).length, this.hasWitnesses && r.finalScriptWitness && (t += Hn.encode(r.finalScriptWitness).length);
    return t;
  }
  get vsize() {
    return el(this.weight);
  }
  toBytes(t = !1, n = !1) {
    return en.encode({
      version: this.version,
      lockTime: this.lockTime,
      inputs: this.inputs.map(Bn).map((r) => ({
        ...r,
        finalScriptSig: t && r.finalScriptSig || rt
      })),
      outputs: this.outputs.map(_e),
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
    return O.encode(ge(this.toBytes(!0)));
  }
  get id() {
    return O.encode(ge(this.toBytes(!0)).reverse());
  }
  // Input stuff
  checkInputIdx(t) {
    if (!Number.isSafeInteger(t) || 0 > t || t >= this.inputs.length)
      throw new Error(`Wrong input index=${t}`);
  }
  getInput(t) {
    return this.checkInputIdx(t), Lr(this.inputs[t]);
  }
  get inputsLength() {
    return this.inputs.length;
  }
  // Modification
  addInput(t, n = !1) {
    if (!n && !this.signStatus().addInput)
      throw new Error("Tx has signed inputs, cannot add new one");
    return this.inputs.push(Ws(t, void 0, void 0, this.opts.disableScriptCheck)), this.inputs.length - 1;
  }
  updateInput(t, n, r = !1) {
    this.checkInputIdx(t);
    let o;
    if (!r) {
      const i = this.signStatus();
      (!i.addInput || i.inputs.includes(t)) && (o = Nd);
    }
    this.inputs[t] = Ws(n, this.inputs[t], o, this.opts.disableScriptCheck, this.opts.allowUnknown);
  }
  // Output stuff
  checkOutputIdx(t) {
    if (!Number.isSafeInteger(t) || 0 > t || t >= this.outputs.length)
      throw new Error(`Wrong output index=${t}`);
  }
  getOutput(t) {
    return this.checkOutputIdx(t), Lr(this.outputs[t]);
  }
  getOutputAddress(t, n = dn) {
    const r = this.getOutput(t);
    if (r.script)
      return ze(n).encode(at.decode(r.script));
  }
  get outputsLength() {
    return this.outputs.length;
  }
  normalizeOutput(t, n, r) {
    let { amount: o, script: i } = t;
    if (o === void 0 && (o = n?.amount), typeof o != "bigint")
      throw new Error(`Wrong amount type, should be of type bigint in sats, but got ${o} of type ${typeof o}`);
    typeof i == "string" && (i = O.decode(i)), i === void 0 && (i = n?.script);
    let s = { ...n, ...t, amount: o, script: i };
    if (s.amount === void 0 && delete s.amount, s = ti(Dn, s, n, r, this.opts.allowUnknown), qi.encode(s), s.script && !this.opts.allowUnknownOutputs && at.decode(s.script).type === "unknown")
      throw new Error("Transaction/output: unknown output script type, there is a chance that input is unspendable. Pass allowUnknownOutputs=true, if you sure");
    return this.opts.disableScriptCheck || Na(s.script, s.redeemScript, s.witnessScript), s;
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
      const i = this.signStatus();
      (!i.addOutput || i.outputs.includes(t)) && (o = Ld);
    }
    this.outputs[t] = this.normalizeOutput(n, this.outputs[t], o);
  }
  addOutputAddress(t, n, r = dn) {
    return this.addOutput({ script: at.encode(ze(r).decode(t)), amount: n });
  }
  // Utils
  get fee() {
    let t = 0n;
    for (const r of this.inputs) {
      const o = yr(r);
      if (!o)
        throw new Error("Empty input amount");
      t += o.amount;
    }
    const n = this.outputs.map(_e);
    for (const r of n)
      t -= r.amount;
    return t;
  }
  // Signing
  // Based on https://github.com/bitcoin/bitcoin/blob/5871b5b5ab57a0caf9b7514eb162c491c83281d5/test/functional/test_framework/script.py#L624
  // There is optimization opportunity to re-use hashes for multiple inputs for witness v0/v1,
  // but we are trying to be less complicated for audit purpose for now.
  preimageLegacy(t, n, r) {
    const { isAny: o, isNone: i, isSingle: s } = Fs(r);
    if (t < 0 || !Number.isSafeInteger(t))
      throw new Error(`Invalid input idx=${t}`);
    if (s && t >= this.outputs.length || t >= this.inputs.length)
      return Sa.encode(1n);
    n = M.encode(M.decode(n).filter((f) => f !== "CODESEPARATOR"));
    let c = this.inputs.map(Bn).map((f, d) => ({
      ...f,
      finalScriptSig: d === t ? n : rt
    }));
    o ? c = [c[t]] : (i || s) && (c = c.map((f, d) => ({
      ...f,
      sequence: d === t ? f.sequence : 0
    })));
    let a = this.outputs.map(_e);
    i ? a = [] : s && (a = a.slice(0, t).fill(tl).concat([a[t]]));
    const u = en.encode({
      lockTime: this.lockTime,
      version: this.version,
      segwitFlag: !1,
      inputs: c,
      outputs: a
    });
    return ge(u, Qe.encode(r));
  }
  preimageWitnessV0(t, n, r, o) {
    const { isAny: i, isNone: s, isSingle: c } = Fs(r);
    let a = rr, u = rr, f = rr;
    const d = this.inputs.map(Bn), h = this.outputs.map(_e);
    i || (a = ge(...d.map(Io.encode))), !i && !c && !s && (u = ge(...d.map((g) => Z.encode(g.sequence)))), !c && !s ? f = ge(...h.map(He.encode)) : c && t < h.length && (f = ge(He.encode(h[t])));
    const l = d[t];
    return ge(Qe.encode(this.version), a, u, et(32, !0).encode(l.txid), Z.encode(l.index), Kt.encode(n), wr.encode(o), Z.encode(l.sequence), f, Z.encode(this.lockTime), Z.encode(r));
  }
  preimageWitnessV1(t, n, r, o, i = -1, s, c = 192, a) {
    if (!Array.isArray(o) || this.inputs.length !== o.length)
      throw new Error(`Invalid amounts array=${o}`);
    if (!Array.isArray(n) || this.inputs.length !== n.length)
      throw new Error(`Invalid prevOutScript array=${n}`);
    const u = [
      Se.encode(0),
      Se.encode(r),
      // U8 sigHash
      Qe.encode(this.version),
      Z.encode(this.lockTime)
    ], f = r === q.DEFAULT ? q.ALL : r & 3, d = r & q.ANYONECANPAY, h = this.inputs.map(Bn), l = this.outputs.map(_e);
    d !== q.ANYONECANPAY && u.push(...[
      h.map(Io.encode),
      o.map(wr.encode),
      n.map(Kt.encode),
      h.map((w) => Z.encode(w.sequence))
    ].map((w) => yt(xe(...w)))), f === q.ALL && u.push(yt(xe(...l.map(He.encode))));
    const g = (a ? 1 : 0) | (s ? 2 : 0);
    if (u.push(new Uint8Array([g])), d === q.ANYONECANPAY) {
      const w = h[t];
      u.push(Io.encode(w), wr.encode(o[t]), Kt.encode(n[t]), Z.encode(w.sequence));
    } else
      u.push(Z.encode(t));
    return g & 1 && u.push(yt(Kt.encode(a || rt))), f === q.SINGLE && u.push(t < l.length ? yt(He.encode(l[t])) : rr), s && u.push(Nn(s, c), Se.encode(0), Qe.encode(i)), Ki("TapSighash", ...u);
  }
  // Signer can be privateKey OR instance of bip32 HD stuff
  signIdx(t, n, r, o) {
    this.checkInputIdx(n);
    const i = this.inputs[n], s = Gs(i, this.opts.allowLegacyWitnessUtxo);
    if (!tt(t)) {
      if (!i.bip32Derivation || !i.bip32Derivation.length)
        throw new Error("bip32Derivation: empty");
      const f = i.bip32Derivation.filter((h) => h[1].fingerprint == t.fingerprint).map(([h, { path: l }]) => {
        let g = t;
        for (const w of l)
          g = g.deriveChild(w);
        if (!st(g.publicKey, h))
          throw new Error("bip32Derivation: wrong pubKey");
        if (!g.privateKey)
          throw new Error("bip32Derivation: no privateKey");
        return g;
      });
      if (!f.length)
        throw new Error(`bip32Derivation: no items with fingerprint=${t.fingerprint}`);
      let d = !1;
      for (const h of f)
        this.signIdx(h.privateKey, n) && (d = !0);
      return d;
    }
    r ? r.forEach(sl) : r = [s.defaultSighash];
    const c = s.sighash;
    if (!r.includes(c))
      throw new Error(`Input with not allowed sigHash=${c}. Allowed: ${r.join(", ")}`);
    const { sigOutputs: a } = this.inputSighash(n);
    if (a === q.SINGLE && n >= this.outputs.length)
      throw new Error(`Input with sighash SINGLE, but there is no output with corresponding index=${n}`);
    const u = yr(i);
    if (s.txType === "taproot") {
      const f = this.inputs.map(yr), d = f.map((y) => y.script), h = f.map((y) => y.amount);
      let l = !1, g = Di(t), w = i.tapMerkleRoot || rt;
      if (i.tapInternalKey) {
        const { pubKey: y, privKey: S } = il(t, g, i.tapInternalKey, w), [v] = Xo(i.tapInternalKey, w);
        if (st(v, y)) {
          const R = this.preimageWitnessV1(n, d, c, h), $ = xe(Ns(R, S, o), c !== q.DEFAULT ? new Uint8Array([c]) : rt);
          this.updateInput(n, { tapKeySig: $ }, !0), l = !0;
        }
      }
      if (i.tapLeafScript) {
        i.tapScriptSig = i.tapScriptSig || [];
        for (const [y, S] of i.tapLeafScript) {
          const v = S.subarray(0, -1), R = M.decode(v), $ = S[S.length - 1], L = Nn(v, $);
          if (R.findIndex((_) => tt(_) && st(_, g)) === -1)
            continue;
          const E = this.preimageWitnessV1(n, d, c, h, void 0, v, $), nt = xe(Ns(E, t, o), c !== q.DEFAULT ? new Uint8Array([c]) : rt);
          this.updateInput(n, { tapScriptSig: [[{ pubKey: g, leafHash: L }, nt]] }, !0), l = !0;
        }
      }
      if (!l)
        throw new Error("No taproot scripts signed");
      return !0;
    } else {
      const f = ka(t);
      let d = !1;
      const h = Aa(f);
      for (const w of M.decode(s.lastScript))
        tt(w) && (st(w, f) || st(w, h)) && (d = !0);
      if (!d)
        throw new Error(`Input script doesn't have pubKey: ${s.lastScript}`);
      let l;
      if (s.txType === "legacy")
        l = this.preimageLegacy(n, s.lastScript, c);
      else if (s.txType === "segwit") {
        let w = s.lastScript;
        s.last.type === "wpkh" && (w = at.encode({ type: "pkh", hash: s.last.hash })), l = this.preimageWitnessV0(n, w, c, u.amount);
      } else
        throw new Error(`Transaction/sign: unknown tx type: ${s.txType}`);
      const g = Sd(l, t, this.opts.lowR);
      this.updateInput(n, {
        partialSig: [[f, xe(g, new Uint8Array([c]))]]
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
    for (let i = 0; i < this.inputs.length; i++)
      try {
        this.signIdx(t, i, n, r) && o++;
      } catch {
      }
    if (!o)
      throw new Error("No inputs signed");
    return o;
  }
  finalizeIdx(t) {
    if (this.checkInputIdx(t), this.fee < 0n)
      throw new Error("Outputs spends more than inputs amount");
    const n = this.inputs[t], r = Gs(n, this.opts.allowLegacyWitnessUtxo);
    if (r.txType === "taproot") {
      if (n.tapKeySig)
        n.finalScriptWitness = [n.tapKeySig];
      else if (n.tapLeafScript && n.tapScriptSig) {
        const a = n.tapLeafScript.sort((u, f) => Xt.encode(u[0]).length - Xt.encode(f[0]).length);
        for (const [u, f] of a) {
          const d = f.slice(0, -1), h = f[f.length - 1], l = at.decode(d), g = Nn(d, h), w = n.tapScriptSig.filter((S) => st(S[0].leafHash, g));
          let y = [];
          if (l.type === "tr_ms") {
            const S = l.m, v = l.pubkeys;
            let R = 0;
            for (const $ of v) {
              const L = w.findIndex((j) => st(j[0].pubKey, $));
              if (R === S || L === -1) {
                y.push(rt);
                continue;
              }
              y.push(w[L][1]), R++;
            }
            if (R !== S)
              continue;
          } else if (l.type === "tr_ns") {
            for (const S of l.pubkeys) {
              const v = w.findIndex((R) => st(R[0].pubKey, S));
              v !== -1 && y.push(w[v][1]);
            }
            if (y.length !== l.pubkeys.length)
              continue;
          } else if (l.type === "unknown" && this.opts.allowUnknownInputs) {
            const S = M.decode(d);
            if (y = w.map(([{ pubKey: v }, R]) => {
              const $ = S.findIndex((L) => tt(L) && st(L, v));
              if ($ === -1)
                throw new Error("finalize/taproot: cannot find position of pubkey in script");
              return { signature: R, pos: $ };
            }).sort((v, R) => v.pos - R.pos).map((v) => v.signature), !y.length)
              continue;
          } else {
            const S = this.opts.customScripts;
            if (S)
              for (const v of S) {
                if (!v.finalizeTaproot)
                  continue;
                const R = M.decode(d), $ = v.encode(R);
                if ($ === void 0)
                  continue;
                const L = v.finalizeTaproot(d, $, w);
                if (L) {
                  n.finalScriptWitness = L.concat(Xt.encode(u)), n.finalScriptSig = rt, ko(n);
                  return;
                }
              }
            throw new Error("Finalize: Unknown tapLeafScript");
          }
          n.finalScriptWitness = y.reverse().concat([d, Xt.encode(u)]);
          break;
        }
        if (!n.finalScriptWitness)
          throw new Error("finalize/taproot: empty witness");
      } else
        throw new Error("finalize/taproot: unknown input");
      n.finalScriptSig = rt, ko(n);
      return;
    }
    if (!n.partialSig || !n.partialSig.length)
      throw new Error("Not enough partial sign");
    let o = rt, i = [];
    if (r.last.type === "ms") {
      const a = r.last.m, u = r.last.pubkeys;
      let f = [];
      for (const d of u) {
        const h = n.partialSig.find((l) => st(d, l[0]));
        h && f.push(h[1]);
      }
      if (f = f.slice(0, a), f.length !== a)
        throw new Error(`Multisig: wrong signatures count, m=${a} n=${u.length} signatures=${f.length}`);
      o = M.encode([0, ...f]);
    } else if (r.last.type === "pk")
      o = M.encode([n.partialSig[0][1]]);
    else if (r.last.type === "pkh")
      o = M.encode([n.partialSig[0][1], n.partialSig[0][0]]);
    else if (r.last.type === "wpkh")
      o = rt, i = [n.partialSig[0][1], n.partialSig[0][0]];
    else if (r.last.type === "unknown" && !this.opts.allowUnknownInputs)
      throw new Error("Unknown inputs not allowed");
    let s, c;
    if (r.type.includes("wsh-") && (o.length && r.lastScript.length && (i = M.decode(o).map((a) => {
      if (a === 0)
        return rt;
      if (tt(a))
        return a;
      throw new Error(`Wrong witness op=${a}`);
    })), i = i.concat(r.lastScript)), r.txType === "segwit" && (c = i), r.type.startsWith("sh-wsh-") ? s = M.encode([M.encode([0, yt(r.lastScript)])]) : r.type.startsWith("sh-") ? s = M.encode([...M.decode(o), r.lastScript]) : r.type.startsWith("wsh-") || r.txType !== "segwit" && (s = o), !s && !c)
      throw new Error("Unknown error finalizing input");
    s && (n.finalScriptSig = s), c && (n.finalScriptWitness = c), ko(n);
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
    const n = this.global.unsignedTx ? Un.encode(this.global.unsignedTx) : rt, r = t.global.unsignedTx ? Un.encode(t.global.unsignedTx) : rt;
    if (!st(n, r))
      throw new Error("Transaction/combine: different unsigned tx");
    this.global = ti(zi, this.global, t.global, void 0, this.opts.allowUnknown);
    for (let o = 0; o < this.inputs.length; o++)
      this.updateInput(o, t.inputs[o], !0);
    for (let o = 0; o < this.outputs.length; o++)
      this.updateOutput(o, t.outputs[o], !0);
    return this;
  }
  clone() {
    return mr.fromPSBT(this.toPSBT(this.opts.PSBTVersion), this.opts);
  }
};
class Oe extends Mt {
  constructor(t) {
    super(Bo(t));
  }
  static fromPSBT(t, n) {
    return Mt.fromPSBT(t, Bo(n));
  }
  static fromRaw(t, n) {
    return Mt.fromRaw(t, Bo(n));
  }
}
Oe.ARK_TX_OPTS = {
  allowUnknown: !0,
  allowUnknownOutputs: !0,
  allowUnknownInputs: !0
};
function Bo(e) {
  return { ...Oe.ARK_TX_OPTS, ...e };
}
class Yi extends Error {
  idx;
  // Indice of participant
  constructor(t, n) {
    super(n), this.idx = t;
  }
}
const { taggedHash: Pa, pointToBytes: or } = le.utils, Gt = Ee.Point, z = Gt.Fn, te = Ee.lengths.publicKey, oi = new Uint8Array(te), qs = Be(et(33), {
  decode: (e) => Mn(e) ? oi : e.toBytes(!0),
  encode: (e) => Vn(e, oi) ? Gt.ZERO : Gt.fromBytes(e)
}), js = At(Sa, (e) => (Hc("n", e, 1n, z.ORDER), e)), nn = pt({ R1: qs, R2: qs }), Va = pt({ k1: js, k2: js, publicKey: et(te) });
function Ys(e, ...t) {
}
function Lt(e, ...t) {
  if (!Array.isArray(e))
    throw new Error("expected array");
  e.forEach((n) => W(n, ...t));
}
function Zs(e) {
  if (!Array.isArray(e))
    throw new Error("expected array");
  e.forEach((t, n) => {
    if (typeof t != "boolean")
      throw new Error("expected boolean in xOnly array, got" + t + "(" + n + ")");
  });
}
const _r = (e, ...t) => z.create(z.fromBytes(Pa(e, ...t), !0)), On = (e, t) => Xn(e.y) ? t : z.neg(t);
function De(e) {
  return Gt.BASE.multiply(e);
}
function Mn(e) {
  return e.equals(Gt.ZERO);
}
function ii(e) {
  return Lt(e, te), e.sort(Ur);
}
function Ha(e) {
  Lt(e, te);
  for (let t = 1; t < e.length; t++)
    if (!Vn(e[t], e[0]))
      return e[t];
  return oi;
}
function Da(e) {
  return Lt(e, te), Pa("KeyAgg list", ...e);
}
function Ka(e, t, n) {
  return W(e, te), W(t, te), Vn(e, t) ? 1n : _r("KeyAgg coefficient", n, e);
}
function si(e, t = [], n = []) {
  if (Lt(e, te), Lt(t, 32), t.length !== n.length)
    throw new Error("The tweaks and isXonly arrays must have the same length");
  const r = Ha(e), o = Da(e);
  let i = Gt.ZERO;
  for (let a = 0; a < e.length; a++) {
    let u;
    try {
      u = Gt.fromBytes(e[a]);
    } catch {
      throw new Yi(a, "pubkey");
    }
    i = i.add(u.multiply(Ka(e[a], r, o)));
  }
  let s = z.ONE, c = z.ZERO;
  for (let a = 0; a < t.length; a++) {
    const u = n[a] && !Xn(i.y) ? z.neg(z.ONE) : z.ONE, f = z.fromBytes(t[a]);
    if (i = i.multiply(u).add(De(f)), Mn(i))
      throw new Error("The result of tweaking cannot be infinity");
    s = z.mul(u, s), c = z.add(f, z.mul(u, c));
  }
  return { aggPublicKey: i, gAcc: s, tweakAcc: c };
}
const Xs = (e, t, n, r, o, i) => _r("MuSig/nonce", e, new Uint8Array([t.length]), t, new Uint8Array([n.length]), n, o, qn(i.length, 4), i, new Uint8Array([r]));
function al(e, t, n = new Uint8Array(0), r, o = new Uint8Array(0), i = Gn(32)) {
  if (W(e, te), Ys(t, 32), W(n), ![0, 32].includes(n.length))
    throw new Error("wrong aggPublicKey");
  Ys(), W(o), W(i, 32);
  const s = Uint8Array.of(0), c = Xs(i, e, n, 0, s, o), a = Xs(i, e, n, 1, s, o);
  return {
    secret: Va.encode({ k1: c, k2: a, publicKey: e }),
    public: nn.encode({ R1: De(c), R2: De(a) })
  };
}
function ul(e) {
  Lt(e, 66);
  let t = Gt.ZERO, n = Gt.ZERO;
  for (let r = 0; r < e.length; r++) {
    const o = e[r];
    try {
      const { R1: i, R2: s } = nn.decode(o);
      if (Mn(i) || Mn(s))
        throw new Error("infinity point");
      t = t.add(i), n = n.add(s);
    } catch {
      throw new Yi(r, "pubnonce");
    }
  }
  return nn.encode({ R1: t, R2: n });
}
class fl {
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
  constructor(t, n, r, o = [], i = []) {
    if (Lt(n, 33), Lt(o, 32), Zs(i), W(r), o.length !== i.length)
      throw new Error("The tweaks and isXonly arrays must have the same length");
    const { aggPublicKey: s, gAcc: c, tweakAcc: a } = si(n, o, i), { R1: u, R2: f } = nn.decode(t);
    this.publicKeys = n, this.Q = s, this.gAcc = c, this.tweakAcc = a, this.b = _r("MuSig/noncecoef", t, or(s), r);
    const d = u.add(f.multiply(this.b));
    this.R = Mn(d) ? Gt.BASE : d, this.e = _r("BIP0340/challenge", or(this.R), or(s), r), this.tweaks = o, this.isXonly = i, this.L = Da(n), this.secondKey = Ha(n);
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
    if (!n.some((i) => Vn(i, r)))
      throw new Error("The signer's pubkey must be included in the list of pubkeys");
    return Ka(r, this.secondKey, this.L);
  }
  partialSigVerifyInternal(t, n, r) {
    const { Q: o, gAcc: i, b: s, R: c, e: a } = this, u = z.fromBytes(t, !0);
    if (!z.isValid(u))
      return !1;
    const { R1: f, R2: d } = nn.decode(n), h = f.add(d.multiply(s)), l = Xn(c.y) ? h : h.negate(), g = Gt.fromBytes(r), w = this.getSessionKeyAggCoeff(g), y = z.mul(On(o, 1n), i), S = De(u), v = l.add(g.multiply(z.mul(a, z.mul(w, y))));
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
    if (W(n, 32), typeof r != "boolean")
      throw new Error("expected boolean");
    const { Q: o, gAcc: i, b: s, R: c, e: a } = this, { k1: u, k2: f, publicKey: d } = Va.decode(t);
    if (t.fill(0, 0, 64), !z.isValid(u))
      throw new Error("wrong k1");
    if (!z.isValid(f))
      throw new Error("wrong k1");
    const h = On(c, u), l = On(c, f), g = z.fromBytes(n);
    if (z.is0(g))
      throw new Error("wrong d_");
    const w = De(g), y = w.toBytes(!0);
    if (!Vn(y, d))
      throw new Error("Public key does not match nonceGen argument");
    const S = this.getSessionKeyAggCoeff(w), v = On(o, 1n), R = z.mul(v, z.mul(i, g)), $ = z.add(h, z.add(z.mul(s, l), z.mul(a, z.mul(S, R)))), L = z.toBytes($);
    if (!r) {
      const j = nn.encode({
        R1: De(u),
        R2: De(f)
      });
      if (!this.partialSigVerifyInternal(L, j, y))
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
    const { publicKeys: o, tweaks: i, isXonly: s } = this;
    if (W(t, 32), Lt(n, 66), Lt(o, te), Lt(i, 32), Zs(s), ke(r), n.length !== o.length)
      throw new Error("The pubNonces and publicKeys arrays must have the same length");
    if (i.length !== s.length)
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
    const { Q: n, tweakAcc: r, R: o, e: i } = this;
    let s = 0n;
    for (let a = 0; a < t.length; a++) {
      const u = z.fromBytes(t[a], !0);
      if (!z.isValid(u))
        throw new Yi(a, "psig");
      s = z.add(s, u);
    }
    const c = On(n, 1n);
    return s = z.add(s, z.mul(i, z.mul(c, r))), Ft(or(o), z.toBytes(s));
  }
}
function dl(e) {
  const t = al(e);
  return { secNonce: t.secret, pubNonce: t.public };
}
function ll(e) {
  return ul(e);
}
/*! noble-hashes - MIT License (c) 2022 Paul Miller (paulmillr.com) */
function Zi(e) {
  return e instanceof Uint8Array || ArrayBuffer.isView(e) && e.constructor.name === "Uint8Array";
}
function Ge(e, t = "") {
  if (!Number.isSafeInteger(e) || e < 0) {
    const n = t && `"${t}" `;
    throw new Error(`${n}expected integer >0, got ${e}`);
  }
}
function J(e, t, n = "") {
  const r = Zi(e), o = e?.length, i = t !== void 0;
  if (!r || i && o !== t) {
    const s = n && `"${n}" `, c = i ? ` of length ${t}` : "", a = r ? `length=${o}` : `type=${typeof e}`;
    throw new Error(s + "expected Uint8Array" + c + ", got " + a);
  }
  return e;
}
function Ma(e) {
  if (typeof e != "function" || typeof e.create != "function")
    throw new Error("Hash must wrapped by utils.createHasher");
  Ge(e.outputLen), Ge(e.blockLen);
}
function Cr(e, t = !0) {
  if (e.destroyed)
    throw new Error("Hash instance has been destroyed");
  if (t && e.finished)
    throw new Error("Hash#digest() has already been called");
}
function hl(e, t) {
  J(e, void 0, "digestInto() output");
  const n = t.outputLen;
  if (e.length < n)
    throw new Error('"digestInto() output" expected to be of length >=' + n);
}
function Pr(...e) {
  for (let t = 0; t < e.length; t++)
    e[t].fill(0);
}
function Oo(e) {
  return new DataView(e.buffer, e.byteOffset, e.byteLength);
}
function Yt(e, t) {
  return e << 32 - t | e >>> t;
}
const Fa = /* @ts-ignore */ typeof Uint8Array.from([]).toHex == "function" && typeof Uint8Array.fromHex == "function", pl = /* @__PURE__ */ Array.from({ length: 256 }, (e, t) => t.toString(16).padStart(2, "0"));
function uo(e) {
  if (J(e), Fa)
    return e.toHex();
  let t = "";
  for (let n = 0; n < e.length; n++)
    t += pl[e[n]];
  return t;
}
const oe = { _0: 48, _9: 57, A: 65, F: 70, a: 97, f: 102 };
function Qs(e) {
  if (e >= oe._0 && e <= oe._9)
    return e - oe._0;
  if (e >= oe.A && e <= oe.F)
    return e - (oe.A - 10);
  if (e >= oe.a && e <= oe.f)
    return e - (oe.a - 10);
}
function Vr(e) {
  if (typeof e != "string")
    throw new Error("hex string expected, got " + typeof e);
  if (Fa)
    return Uint8Array.fromHex(e);
  const t = e.length, n = t / 2;
  if (t % 2)
    throw new Error("hex string expected, got unpadded hex of length " + t);
  const r = new Uint8Array(n);
  for (let o = 0, i = 0; o < n; o++, i += 2) {
    const s = Qs(e.charCodeAt(i)), c = Qs(e.charCodeAt(i + 1));
    if (s === void 0 || c === void 0) {
      const a = e[i] + e[i + 1];
      throw new Error('hex string expected, got non-hex character "' + a + '" at index ' + i);
    }
    r[o] = s * 16 + c;
  }
  return r;
}
function Qt(...e) {
  let t = 0;
  for (let r = 0; r < e.length; r++) {
    const o = e[r];
    J(o), t += o.length;
  }
  const n = new Uint8Array(t);
  for (let r = 0, o = 0; r < e.length; r++) {
    const i = e[r];
    n.set(i, o), o += i.length;
  }
  return n;
}
function gl(e, t = {}) {
  const n = (o, i) => e(i).update(o).digest(), r = e(void 0);
  return n.outputLen = r.outputLen, n.blockLen = r.blockLen, n.create = (o) => e(o), Object.assign(n, t), Object.freeze(n);
}
function fo(e = 32) {
  const t = typeof globalThis == "object" ? globalThis.crypto : null;
  if (typeof t?.getRandomValues != "function")
    throw new Error("crypto.getRandomValues must be defined");
  return t.getRandomValues(new Uint8Array(e));
}
const wl = (e) => ({
  oid: Uint8Array.from([6, 9, 96, 134, 72, 1, 101, 3, 4, 2, e])
});
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const Xi = /* @__PURE__ */ BigInt(0), ci = /* @__PURE__ */ BigInt(1);
function Hr(e, t = "") {
  if (typeof e != "boolean") {
    const n = t && `"${t}" `;
    throw new Error(n + "expected boolean, got type=" + typeof e);
  }
  return e;
}
function za(e) {
  if (typeof e == "bigint") {
    if (!br(e))
      throw new Error("positive bigint expected, got " + e);
  } else
    Ge(e);
  return e;
}
function ir(e) {
  const t = za(e).toString(16);
  return t.length & 1 ? "0" + t : t;
}
function Wa(e) {
  if (typeof e != "string")
    throw new Error("hex string expected, got " + typeof e);
  return e === "" ? Xi : BigInt("0x" + e);
}
function Tn(e) {
  return Wa(uo(e));
}
function Ga(e) {
  return Wa(uo(yl(J(e)).reverse()));
}
function Qi(e, t) {
  Ge(t), e = za(e);
  const n = Vr(e.toString(16).padStart(t * 2, "0"));
  if (n.length !== t)
    throw new Error("number too large");
  return n;
}
function qa(e, t) {
  return Qi(e, t).reverse();
}
function yl(e) {
  return Uint8Array.from(e);
}
function ml(e) {
  return Uint8Array.from(e, (t, n) => {
    const r = t.charCodeAt(0);
    if (t.length !== 1 || r > 127)
      throw new Error(`string contains non-ASCII character "${e[n]}" with code ${r} at position ${n}`);
    return r;
  });
}
const br = (e) => typeof e == "bigint" && Xi <= e;
function bl(e, t, n) {
  return br(e) && br(t) && br(n) && t <= e && e < n;
}
function xl(e, t, n, r) {
  if (!bl(t, n, r))
    throw new Error("expected valid " + e + ": " + n + " <= n < " + r + ", got " + t);
}
function El(e) {
  let t;
  for (t = 0; e > Xi; e >>= ci, t += 1)
    ;
  return t;
}
const Ji = (e) => (ci << BigInt(e)) - ci;
function Sl(e, t, n) {
  if (Ge(e, "hashLen"), Ge(t, "qByteLen"), typeof n != "function")
    throw new Error("hmacFn must be a function");
  const r = (y) => new Uint8Array(y), o = Uint8Array.of(), i = Uint8Array.of(0), s = Uint8Array.of(1), c = 1e3;
  let a = r(e), u = r(e), f = 0;
  const d = () => {
    a.fill(1), u.fill(0), f = 0;
  }, h = (...y) => n(u, Qt(a, ...y)), l = (y = o) => {
    u = h(i, y), a = h(), y.length !== 0 && (u = h(s, y), a = h());
  }, g = () => {
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
    d(), l(y);
    let v;
    for (; !(v = S(g())); )
      l();
    return d(), v;
  };
}
function ts(e, t = {}, n = {}) {
  if (!e || typeof e != "object")
    throw new Error("expected valid options object");
  function r(i, s, c) {
    const a = e[i];
    if (c && a === void 0)
      return;
    const u = typeof a;
    if (u !== s || a === null)
      throw new Error(`param "${i}" is invalid: expected ${s}, got ${u}`);
  }
  const o = (i, s) => Object.entries(i).forEach(([c, a]) => r(c, a, s));
  o(t, !1), o(n, !0);
}
function Js(e) {
  const t = /* @__PURE__ */ new WeakMap();
  return (n, ...r) => {
    const o = t.get(n);
    if (o !== void 0)
      return o;
    const i = e(n, ...r);
    return t.set(n, i), i;
  };
}
/*! noble-secp256k1 - MIT License (c) 2019 Paul Miller (paulmillr.com) */
const ja = {
  p: 0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffefffffc2fn,
  n: 0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141n,
  h: 1n,
  a: 0n,
  b: 7n,
  Gx: 0x79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798n,
  Gy: 0x483ada7726a3c4655da4fbfc0e1108a8fd17b448a68554199c47d08ffb10d4b8n
}, { p: Te, n: Re, Gx: Tl, Gy: vl, b: Ya } = ja, ht = 32, qe = 64, Dr = {
  publicKey: ht + 1,
  publicKeyUncompressed: qe + 1,
  signature: qe,
  seed: ht + ht / 2
}, Al = (...e) => {
  "captureStackTrace" in Error && typeof Error.captureStackTrace == "function" && Error.captureStackTrace(...e);
}, X = (e = "") => {
  const t = new Error(e);
  throw Al(t, X), t;
}, kl = (e) => typeof e == "bigint", Il = (e) => typeof e == "string", Bl = (e) => e instanceof Uint8Array || ArrayBuffer.isView(e) && e.constructor.name === "Uint8Array", Bt = (e, t, n = "") => {
  const r = Bl(e), o = e?.length, i = t !== void 0;
  if (!r || i && o !== t) {
    const s = n && `"${n}" `, c = i ? ` of length ${t}` : "", a = r ? `length=${o}` : `type=${typeof e}`;
    X(s + "expected Uint8Array" + c + ", got " + a);
  }
  return e;
}, Ue = (e) => new Uint8Array(e), Za = (e, t) => e.toString(16).padStart(t, "0"), Xa = (e) => Array.from(Bt(e)).map((t) => Za(t, 2)).join(""), ie = { _0: 48, _9: 57, A: 65, F: 70, a: 97, f: 102 }, tc = (e) => {
  if (e >= ie._0 && e <= ie._9)
    return e - ie._0;
  if (e >= ie.A && e <= ie.F)
    return e - (ie.A - 10);
  if (e >= ie.a && e <= ie.f)
    return e - (ie.a - 10);
}, Qa = (e) => {
  const t = "hex invalid";
  if (!Il(e))
    return X(t);
  const n = e.length, r = n / 2;
  if (n % 2)
    return X(t);
  const o = Ue(r);
  for (let i = 0, s = 0; i < r; i++, s += 2) {
    const c = tc(e.charCodeAt(s)), a = tc(e.charCodeAt(s + 1));
    if (c === void 0 || a === void 0)
      return X(t);
    o[i] = c * 16 + a;
  }
  return o;
}, Ja = () => globalThis?.crypto, ec = () => Ja()?.subtle ?? X("crypto.subtle must be defined, consider polyfill"), ee = (...e) => {
  const t = Ue(e.reduce((r, o) => r + Bt(o).length, 0));
  let n = 0;
  return e.forEach((r) => {
    t.set(r, n), n += r.length;
  }), t;
}, lo = (e = ht) => Ja().getRandomValues(Ue(e)), Fn = BigInt, je = (e, t, n, r = "bad number: out of range") => kl(e) && t <= e && e < n ? e : X(r), P = (e, t = Te) => {
  const n = e % t;
  return n >= 0n ? n : t + n;
}, ce = (e) => P(e, Re), tu = (e, t) => {
  (e === 0n || t <= 0n) && X("no inverse n=" + e + " mod=" + t);
  let n = P(e, t), r = t, o = 0n, i = 1n;
  for (; n !== 0n; ) {
    const s = r / n, c = r % n, a = o - i * s;
    r = n, n = c, o = i, i = a;
  }
  return r === 1n ? P(o, t) : X("no inverse");
}, eu = (e) => {
  const t = po[e];
  return typeof t != "function" && X("hashes." + e + " not set"), t;
}, Ro = (e) => e instanceof Et ? e : X("Point expected"), nu = (e) => P(P(e * e) * e + Ya), nc = (e) => je(e, 0n, Te), xr = (e) => je(e, 1n, Te), ai = (e) => je(e, 1n, Re), ln = (e) => (e & 1n) === 0n, ho = (e) => Uint8Array.of(e), Ol = (e) => ho(ln(e) ? 2 : 3), ru = (e) => {
  const t = nu(xr(e));
  let n = 1n;
  for (let r = t, o = (Te + 1n) / 4n; o > 0n; o >>= 1n)
    o & 1n && (n = n * r % Te), r = r * r % Te;
  return P(n * n) === t ? n : X("sqrt invalid");
};
class Et {
  static BASE;
  static ZERO;
  X;
  Y;
  Z;
  constructor(t, n, r) {
    this.X = nc(t), this.Y = xr(n), this.Z = nc(r), Object.freeze(this);
  }
  static CURVE() {
    return ja;
  }
  /** Create 3d xyz point from 2d xy. (0, 0) => (0, 1, 0), not (0, 0, 1) */
  static fromAffine(t) {
    const { x: n, y: r } = t;
    return n === 0n && r === 0n ? Ce : new Et(n, r, 1n);
  }
  /** Convert Uint8Array or hex string to Point. */
  static fromBytes(t) {
    Bt(t);
    const { publicKey: n, publicKeyUncompressed: r } = Dr;
    let o;
    const i = t.length, s = t[0], c = t.subarray(1), a = hn(c, 0, ht);
    if (i === n && (s === 2 || s === 3)) {
      let u = ru(a);
      const f = ln(u);
      ln(Fn(s)) !== f && (u = P(-u)), o = new Et(a, u, 1n);
    }
    return i === r && s === 4 && (o = new Et(a, hn(c, ht, qe), 1n)), o ? o.assertValidity() : X("bad point: not on curve");
  }
  static fromHex(t) {
    return Et.fromBytes(Qa(t));
  }
  get x() {
    return this.toAffine().x;
  }
  get y() {
    return this.toAffine().y;
  }
  /** Equality check: compare points P&Q. */
  equals(t) {
    const { X: n, Y: r, Z: o } = this, { X: i, Y: s, Z: c } = Ro(t), a = P(n * c), u = P(i * o), f = P(r * c), d = P(s * o);
    return a === u && f === d;
  }
  is0() {
    return this.equals(Ce);
  }
  /** Flip point over y coordinate. */
  negate() {
    return new Et(this.X, P(-this.Y), this.Z);
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
    const { X: n, Y: r, Z: o } = this, { X: i, Y: s, Z: c } = Ro(t), a = 0n, u = Ya;
    let f = 0n, d = 0n, h = 0n;
    const l = P(u * 3n);
    let g = P(n * i), w = P(r * s), y = P(o * c), S = P(n + r), v = P(i + s);
    S = P(S * v), v = P(g + w), S = P(S - v), v = P(n + o);
    let R = P(i + c);
    return v = P(v * R), R = P(g + y), v = P(v - R), R = P(r + o), f = P(s + c), R = P(R * f), f = P(w + y), R = P(R - f), h = P(a * v), f = P(l * y), h = P(f + h), f = P(w - h), h = P(w + h), d = P(f * h), w = P(g + g), w = P(w + g), y = P(a * y), v = P(l * v), w = P(w + y), y = P(g - y), y = P(a * y), v = P(v + y), g = P(w * v), d = P(d + g), g = P(R * v), f = P(S * f), f = P(f - g), g = P(S * w), h = P(R * h), h = P(h + g), new Et(f, d, h);
  }
  subtract(t) {
    return this.add(Ro(t).negate());
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
      return Ce;
    if (ai(t), t === 1n)
      return this;
    if (this.equals($e))
      return eh(t).p;
    let r = Ce, o = $e;
    for (let i = this; t > 0n; i = i.double(), t >>= 1n)
      t & 1n ? r = r.add(i) : n && (o = o.add(i));
    return r;
  }
  multiplyUnsafe(t) {
    return this.multiply(t, !1);
  }
  /** Convert point to 2d xy affine point. (X, Y, Z) ∋ (x=X/Z, y=Y/Z) */
  toAffine() {
    const { X: t, Y: n, Z: r } = this;
    if (this.equals(Ce))
      return { x: 0n, y: 0n };
    if (r === 1n)
      return { x: t, y: n };
    const o = tu(r, Te);
    return P(r * o) !== 1n && X("inverse invalid"), { x: P(t * o), y: P(n * o) };
  }
  /** Checks if the point is valid and on-curve. */
  assertValidity() {
    const { x: t, y: n } = this.toAffine();
    return xr(t), xr(n), P(n * n) === nu(t) ? this : X("bad point: not on curve");
  }
  /** Converts point to 33/65-byte Uint8Array. */
  toBytes(t = !0) {
    const { x: n, y: r } = this.assertValidity().toAffine(), o = Ut(n);
    return t ? ee(Ol(r), o) : ee(ho(4), o, Ut(r));
  }
  toHex(t) {
    return Xa(this.toBytes(t));
  }
}
const $e = new Et(Tl, vl, 1n), Ce = new Et(0n, 1n, 0n);
Et.BASE = $e;
Et.ZERO = Ce;
const Rl = (e, t, n) => $e.multiply(t, !1).add(e.multiply(n, !1)).assertValidity(), Ne = (e) => Fn("0x" + (Xa(e) || "0")), hn = (e, t, n) => Ne(e.subarray(t, n)), Ul = 2n ** 256n, Ut = (e) => Qa(Za(je(e, 0n, Ul), qe)), ou = (e) => {
  const t = Ne(Bt(e, ht, "secret key"));
  return je(t, 1n, Re, "invalid secret key: outside of range");
}, iu = (e) => e > Re >> 1n, $l = (e) => {
  [0, 1, 2, 3].includes(e) || X("recovery id must be valid and present");
}, Nl = (e) => {
  e != null && !rc.includes(e) && X(`Signature format must be one of: ${rc.join(", ")}`), e === cu && X('Signature format "der" is not supported: switch to noble-curves');
}, Ll = (e, t = pn) => {
  Nl(t);
  const n = Dr.signature, r = n + 1;
  let o = `Signature format "${t}" expects Uint8Array with length `;
  t === pn && e.length !== n && X(o + n), t === Mr && e.length !== r && X(o + r);
};
class Kr {
  r;
  s;
  recovery;
  constructor(t, n, r) {
    this.r = ai(t), this.s = ai(n), r != null && (this.recovery = r), Object.freeze(this);
  }
  static fromBytes(t, n = pn) {
    Ll(t, n);
    let r;
    n === Mr && (r = t[0], t = t.subarray(1));
    const o = hn(t, 0, ht), i = hn(t, ht, qe);
    return new Kr(o, i, r);
  }
  addRecoveryBit(t) {
    return new Kr(this.r, this.s, t);
  }
  hasHighS() {
    return iu(this.s);
  }
  toBytes(t = pn) {
    const { r: n, s: r, recovery: o } = this, i = ee(Ut(n), Ut(r));
    return t === Mr ? ($l(o), ee(Uint8Array.of(o), i)) : i;
  }
}
const su = (e) => {
  const t = e.length * 8 - 256;
  t > 1024 && X("msg invalid");
  const n = Ne(e);
  return t > 0 ? n >> Fn(t) : n;
}, _l = (e) => ce(su(Bt(e))), pn = "compact", Mr = "recovered", cu = "der", rc = [pn, Mr, cu], oc = {
  lowS: !0,
  prehash: !0,
  format: pn,
  extraEntropy: !1
}, ic = "SHA-256", po = {
  hmacSha256Async: async (e, t) => {
    const n = ec(), r = "HMAC", o = await n.importKey("raw", e, { name: r, hash: { name: ic } }, !1, ["sign"]);
    return Ue(await n.sign(r, o, t));
  },
  hmacSha256: void 0,
  sha256Async: async (e) => Ue(await ec().digest(ic, e)),
  sha256: void 0
}, Cl = (e, t, n) => (Bt(e, void 0, "message"), t.prehash ? n ? po.sha256Async(e) : eu("sha256")(e) : e), Pl = Ue(0), Vl = ho(0), Hl = ho(1), Dl = 1e3, Kl = "drbg: tried max amount of iterations", Ml = async (e, t) => {
  let n = Ue(ht), r = Ue(ht), o = 0;
  const i = () => {
    n.fill(1), r.fill(0);
  }, s = (...f) => po.hmacSha256Async(r, ee(n, ...f)), c = async (f = Pl) => {
    r = await s(Vl, f), n = await s(), f.length !== 0 && (r = await s(Hl, f), n = await s());
  }, a = async () => (o++ >= Dl && X(Kl), n = await s(), n);
  i(), await c(e);
  let u;
  for (; !(u = t(await a())); )
    await c();
  return i(), u;
}, Fl = (e, t, n, r) => {
  let { lowS: o, extraEntropy: i } = n;
  const s = Ut, c = _l(e), a = s(c), u = ou(t), f = [s(u), a];
  if (i != null && i !== !1) {
    const g = i === !0 ? lo(ht) : i;
    f.push(Bt(g, void 0, "extraEntropy"));
  }
  const d = ee(...f), h = c;
  return r(d, (g) => {
    const w = su(g);
    if (!(1n <= w && w < Re))
      return;
    const y = tu(w, Re), S = $e.multiply(w).toAffine(), v = ce(S.x);
    if (v === 0n)
      return;
    const R = ce(y * ce(h + v * u));
    if (R === 0n)
      return;
    let $ = (S.x === v ? 0 : 2) | Number(S.y & 1n), L = R;
    return o && iu(R) && (L = ce(-R), $ ^= 1), new Kr(v, L, $).toBytes(n.format);
  });
}, zl = (e) => {
  const t = {};
  return Object.keys(oc).forEach((n) => {
    t[n] = e[n] ?? oc[n];
  }), t;
}, Wl = async (e, t, n = {}) => (n = zl(n), e = await Cl(e, n, !0), Fl(e, t, n, Ml)), Gl = (e = lo(Dr.seed)) => {
  Bt(e), (e.length < Dr.seed || e.length > 1024) && X("expected 40-1024b");
  const t = P(Ne(e), Re - 1n);
  return Ut(t + 1n);
}, ql = (e) => (t) => {
  const n = Gl(t);
  return { secretKey: n, publicKey: e(n) };
}, au = (e) => Uint8Array.from("BIP0340/" + e, (t) => t.charCodeAt(0)), uu = "aux", fu = "nonce", du = "challenge", ui = (e, ...t) => {
  const n = eu("sha256"), r = n(au(e));
  return n(ee(r, r, ...t));
}, fi = async (e, ...t) => {
  const n = po.sha256Async, r = await n(au(e));
  return await n(ee(r, r, ...t));
}, es = (e) => {
  const t = ou(e), n = $e.multiply(t), { x: r, y: o } = n.assertValidity().toAffine(), i = ln(o) ? t : ce(-t), s = Ut(r);
  return { d: i, px: s };
}, ns = (e) => ce(Ne(e)), lu = (...e) => ns(ui(du, ...e)), hu = async (...e) => ns(await fi(du, ...e)), pu = (e) => es(e).px, jl = ql(pu), gu = (e, t, n) => {
  const { px: r, d: o } = es(t);
  return { m: Bt(e), px: r, d: o, a: Bt(n, ht) };
}, wu = (e) => {
  const t = ns(e);
  t === 0n && X("sign failed: k is zero");
  const { px: n, d: r } = es(Ut(t));
  return { rx: n, k: r };
}, yu = (e, t, n, r) => ee(t, Ut(ce(e + n * r))), mu = "invalid signature produced", Yl = (e, t, n = lo(ht)) => {
  const { m: r, px: o, d: i, a: s } = gu(e, t, n), c = ui(uu, s), a = Ut(i ^ Ne(c)), u = ui(fu, a, o, r), { rx: f, k: d } = wu(u), h = lu(f, o, r), l = yu(d, f, h, i);
  return xu(l, r, o) || X(mu), l;
}, Zl = async (e, t, n = lo(ht)) => {
  const { m: r, px: o, d: i, a: s } = gu(e, t, n), c = await fi(uu, s), a = Ut(i ^ Ne(c)), u = await fi(fu, a, o, r), { rx: f, k: d } = wu(u), h = await hu(f, o, r), l = yu(d, f, h, i);
  return await Eu(l, r, o) || X(mu), l;
}, Xl = (e, t) => e instanceof Promise ? e.then(t) : t(e), bu = (e, t, n, r) => {
  const o = Bt(e, qe, "signature"), i = Bt(t, void 0, "message"), s = Bt(n, ht, "publicKey");
  try {
    const c = Ne(s), a = ru(c), u = ln(a) ? a : P(-a), f = new Et(c, u, 1n).assertValidity(), d = Ut(f.toAffine().x), h = hn(o, 0, ht);
    je(h, 1n, Te);
    const l = hn(o, ht, qe);
    je(l, 1n, Re);
    const g = ee(Ut(h), d, i);
    return Xl(r(g), (w) => {
      const { x: y, y: S } = Rl(f, l, ce(-w)).toAffine();
      return !(!ln(S) || y !== h);
    });
  } catch {
    return !1;
  }
}, xu = (e, t, n) => bu(e, t, n, lu), Eu = async (e, t, n) => bu(e, t, n, hu), Ql = {
  keygen: jl,
  getPublicKey: pu,
  sign: Yl,
  verify: xu,
  signAsync: Zl,
  verifyAsync: Eu
}, Fr = 8, Jl = 256, Su = Math.ceil(Jl / Fr) + 1, di = 2 ** (Fr - 1), th = () => {
  const e = [];
  let t = $e, n = t;
  for (let r = 0; r < Su; r++) {
    n = t, e.push(n);
    for (let o = 1; o < di; o++)
      n = n.add(t), e.push(n);
    t = n.double();
  }
  return e;
};
let sc;
const cc = (e, t) => {
  const n = t.negate();
  return e ? n : t;
}, eh = (e) => {
  const t = sc || (sc = th());
  let n = Ce, r = $e;
  const o = 2 ** Fr, i = o, s = Fn(o - 1), c = Fn(Fr);
  for (let a = 0; a < Su; a++) {
    let u = Number(e & s);
    e >>= c, u > di && (u -= i, e += 1n);
    const f = a * di, d = f, h = f + Math.abs(u) - 1, l = a % 2 !== 0, g = u < 0;
    u === 0 ? r = r.add(cc(l, t[d])) : n = n.add(cc(g, t[h]));
  }
  return e !== 0n && X("invalid wnaf"), { p: n, f: r };
};
function nh(e, t, n) {
  return e & t ^ ~e & n;
}
function rh(e, t, n) {
  return e & t ^ e & n ^ t & n;
}
class oh {
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
    this.blockLen = t, this.outputLen = n, this.padOffset = r, this.isLE = o, this.buffer = new Uint8Array(t), this.view = Oo(this.buffer);
  }
  update(t) {
    Cr(this), J(t);
    const { view: n, buffer: r, blockLen: o } = this, i = t.length;
    for (let s = 0; s < i; ) {
      const c = Math.min(o - this.pos, i - s);
      if (c === o) {
        const a = Oo(t);
        for (; o <= i - s; s += o)
          this.process(a, s);
        continue;
      }
      r.set(t.subarray(s, s + c), this.pos), this.pos += c, s += c, this.pos === o && (this.process(n, 0), this.pos = 0);
    }
    return this.length += t.length, this.roundClean(), this;
  }
  digestInto(t) {
    Cr(this), hl(t, this), this.finished = !0;
    const { buffer: n, view: r, blockLen: o, isLE: i } = this;
    let { pos: s } = this;
    n[s++] = 128, Pr(this.buffer.subarray(s)), this.padOffset > o - s && (this.process(r, 0), s = 0);
    for (let d = s; d < o; d++)
      n[d] = 0;
    r.setBigUint64(o - 8, BigInt(this.length * 8), i), this.process(r, 0);
    const c = Oo(t), a = this.outputLen;
    if (a % 4)
      throw new Error("_sha2: outputLen must be aligned to 32bit");
    const u = a / 4, f = this.get();
    if (u > f.length)
      throw new Error("_sha2: outputLen bigger than state");
    for (let d = 0; d < u; d++)
      c.setUint32(4 * d, f[d], i);
  }
  digest() {
    const { buffer: t, outputLen: n } = this;
    this.digestInto(t);
    const r = t.slice(0, n);
    return this.destroy(), r;
  }
  _cloneInto(t) {
    t ||= new this.constructor(), t.set(...this.get());
    const { blockLen: n, buffer: r, length: o, finished: i, destroyed: s, pos: c } = this;
    return t.destroyed = s, t.finished = i, t.length = o, t.pos = c, o % n && t.buffer.set(r), t;
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
]), ih = /* @__PURE__ */ Uint32Array.from([
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
class sh extends oh {
  constructor(t) {
    super(64, t, 8, !1);
  }
  get() {
    const { A: t, B: n, C: r, D: o, E: i, F: s, G: c, H: a } = this;
    return [t, n, r, o, i, s, c, a];
  }
  // prettier-ignore
  set(t, n, r, o, i, s, c, a) {
    this.A = t | 0, this.B = n | 0, this.C = r | 0, this.D = o | 0, this.E = i | 0, this.F = s | 0, this.G = c | 0, this.H = a | 0;
  }
  process(t, n) {
    for (let d = 0; d < 16; d++, n += 4)
      ye[d] = t.getUint32(n, !1);
    for (let d = 16; d < 64; d++) {
      const h = ye[d - 15], l = ye[d - 2], g = Yt(h, 7) ^ Yt(h, 18) ^ h >>> 3, w = Yt(l, 17) ^ Yt(l, 19) ^ l >>> 10;
      ye[d] = w + ye[d - 7] + g + ye[d - 16] | 0;
    }
    let { A: r, B: o, C: i, D: s, E: c, F: a, G: u, H: f } = this;
    for (let d = 0; d < 64; d++) {
      const h = Yt(c, 6) ^ Yt(c, 11) ^ Yt(c, 25), l = f + h + nh(c, a, u) + ih[d] + ye[d] | 0, w = (Yt(r, 2) ^ Yt(r, 13) ^ Yt(r, 22)) + rh(r, o, i) | 0;
      f = u, u = a, a = c, c = s + l | 0, s = i, i = o, o = r, r = l + w | 0;
    }
    r = r + this.A | 0, o = o + this.B | 0, i = i + this.C | 0, s = s + this.D | 0, c = c + this.E | 0, a = a + this.F | 0, u = u + this.G | 0, f = f + this.H | 0, this.set(r, o, i, s, c, a, u, f);
  }
  roundClean() {
    Pr(ye);
  }
  destroy() {
    this.set(0, 0, 0, 0, 0, 0, 0, 0), Pr(this.buffer);
  }
}
class ch extends sh {
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
const li = /* @__PURE__ */ gl(
  () => new ch(),
  /* @__PURE__ */ wl(1)
);
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const Tt = /* @__PURE__ */ BigInt(0), xt = /* @__PURE__ */ BigInt(1), Ke = /* @__PURE__ */ BigInt(2), Tu = /* @__PURE__ */ BigInt(3), vu = /* @__PURE__ */ BigInt(4), Au = /* @__PURE__ */ BigInt(5), ah = /* @__PURE__ */ BigInt(7), ku = /* @__PURE__ */ BigInt(8), uh = /* @__PURE__ */ BigInt(9), Iu = /* @__PURE__ */ BigInt(16);
function Dt(e, t) {
  const n = e % t;
  return n >= Tt ? n : t + n;
}
function Nt(e, t, n) {
  let r = e;
  for (; t-- > Tt; )
    r *= r, r %= n;
  return r;
}
function ac(e, t) {
  if (e === Tt)
    throw new Error("invert: expected non-zero number");
  if (t <= Tt)
    throw new Error("invert: expected positive modulus, got " + t);
  let n = Dt(e, t), r = t, o = Tt, i = xt;
  for (; n !== Tt; ) {
    const c = r / n, a = r % n, u = o - i * c;
    r = n, n = a, o = i, i = u;
  }
  if (r !== xt)
    throw new Error("invert: does not exist");
  return Dt(o, t);
}
function rs(e, t, n) {
  if (!e.eql(e.sqr(t), n))
    throw new Error("Cannot find square root");
}
function Bu(e, t) {
  const n = (e.ORDER + xt) / vu, r = e.pow(t, n);
  return rs(e, r, t), r;
}
function fh(e, t) {
  const n = (e.ORDER - Au) / ku, r = e.mul(t, Ke), o = e.pow(r, n), i = e.mul(t, o), s = e.mul(e.mul(i, Ke), o), c = e.mul(i, e.sub(s, e.ONE));
  return rs(e, c, t), c;
}
function dh(e) {
  const t = go(e), n = Ou(e), r = n(t, t.neg(t.ONE)), o = n(t, r), i = n(t, t.neg(r)), s = (e + ah) / Iu;
  return (c, a) => {
    let u = c.pow(a, s), f = c.mul(u, r);
    const d = c.mul(u, o), h = c.mul(u, i), l = c.eql(c.sqr(f), a), g = c.eql(c.sqr(d), a);
    u = c.cmov(u, f, l), f = c.cmov(h, d, g);
    const w = c.eql(c.sqr(f), a), y = c.cmov(u, f, w);
    return rs(c, y, a), y;
  };
}
function Ou(e) {
  if (e < Tu)
    throw new Error("sqrt is not defined for small field");
  let t = e - xt, n = 0;
  for (; t % Ke === Tt; )
    t /= Ke, n++;
  let r = Ke;
  const o = go(e);
  for (; uc(o, r) === 1; )
    if (r++ > 1e3)
      throw new Error("Cannot find square root: probably non-prime P");
  if (n === 1)
    return Bu;
  let i = o.pow(r, t);
  const s = (t + xt) / Ke;
  return function(a, u) {
    if (a.is0(u))
      return u;
    if (uc(a, u) !== 1)
      throw new Error("Cannot find square root");
    let f = n, d = a.mul(a.ONE, i), h = a.pow(u, t), l = a.pow(u, s);
    for (; !a.eql(h, a.ONE); ) {
      if (a.is0(h))
        return a.ZERO;
      let g = 1, w = a.sqr(h);
      for (; !a.eql(w, a.ONE); )
        if (g++, w = a.sqr(w), g === f)
          throw new Error("Cannot find square root");
      const y = xt << BigInt(f - g - 1), S = a.pow(d, y);
      f = g, d = a.sqr(S), h = a.mul(h, d), l = a.mul(l, S);
    }
    return l;
  };
}
function lh(e) {
  return e % vu === Tu ? Bu : e % ku === Au ? fh : e % Iu === uh ? dh(e) : Ou(e);
}
const hh = [
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
function ph(e) {
  const t = {
    ORDER: "bigint",
    BYTES: "number",
    BITS: "number"
  }, n = hh.reduce((r, o) => (r[o] = "function", r), t);
  return ts(e, n), e;
}
function gh(e, t, n) {
  if (n < Tt)
    throw new Error("invalid exponent, negatives unsupported");
  if (n === Tt)
    return e.ONE;
  if (n === xt)
    return t;
  let r = e.ONE, o = t;
  for (; n > Tt; )
    n & xt && (r = e.mul(r, o)), o = e.sqr(o), n >>= xt;
  return r;
}
function Ru(e, t, n = !1) {
  const r = new Array(t.length).fill(n ? e.ZERO : void 0), o = t.reduce((s, c, a) => e.is0(c) ? s : (r[a] = s, e.mul(s, c)), e.ONE), i = e.inv(o);
  return t.reduceRight((s, c, a) => e.is0(c) ? s : (r[a] = e.mul(s, r[a]), e.mul(s, c)), i), r;
}
function uc(e, t) {
  const n = (e.ORDER - xt) / Ke, r = e.pow(t, n), o = e.eql(r, e.ONE), i = e.eql(r, e.ZERO), s = e.eql(r, e.neg(e.ONE));
  if (!o && !i && !s)
    throw new Error("invalid Legendre symbol result");
  return o ? 1 : i ? 0 : -1;
}
function wh(e, t) {
  t !== void 0 && Ge(t);
  const n = t !== void 0 ? t : e.toString(2).length, r = Math.ceil(n / 8);
  return { nBitLength: n, nByteLength: r };
}
class yh {
  ORDER;
  BITS;
  BYTES;
  isLE;
  ZERO = Tt;
  ONE = xt;
  _lengths;
  _sqrt;
  // cached sqrt
  _mod;
  constructor(t, n = {}) {
    if (t <= Tt)
      throw new Error("invalid field: expected ORDER > 0, got " + t);
    let r;
    this.isLE = !1, n != null && typeof n == "object" && (typeof n.BITS == "number" && (r = n.BITS), typeof n.sqrt == "function" && (this.sqrt = n.sqrt), typeof n.isLE == "boolean" && (this.isLE = n.isLE), n.allowedLengths && (this._lengths = n.allowedLengths?.slice()), typeof n.modFromBytes == "boolean" && (this._mod = n.modFromBytes));
    const { nBitLength: o, nByteLength: i } = wh(t, r);
    if (i > 2048)
      throw new Error("invalid field: expected ORDER of <= 2048 bytes");
    this.ORDER = t, this.BITS = o, this.BYTES = i, this._sqrt = void 0, Object.preventExtensions(this);
  }
  create(t) {
    return Dt(t, this.ORDER);
  }
  isValid(t) {
    if (typeof t != "bigint")
      throw new Error("invalid field element: expected bigint, got " + typeof t);
    return Tt <= t && t < this.ORDER;
  }
  is0(t) {
    return t === Tt;
  }
  // is valid and invertible
  isValidNot0(t) {
    return !this.is0(t) && this.isValid(t);
  }
  isOdd(t) {
    return (t & xt) === xt;
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
    return gh(this, t, n);
  }
  div(t, n) {
    return Dt(t * ac(n, this.ORDER), this.ORDER);
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
    return ac(t, this.ORDER);
  }
  sqrt(t) {
    return this._sqrt || (this._sqrt = lh(this.ORDER)), this._sqrt(this, t);
  }
  toBytes(t) {
    return this.isLE ? qa(t, this.BYTES) : Qi(t, this.BYTES);
  }
  fromBytes(t, n = !1) {
    J(t);
    const { _lengths: r, BYTES: o, isLE: i, ORDER: s, _mod: c } = this;
    if (r) {
      if (!r.includes(t.length) || t.length > o)
        throw new Error("Field.fromBytes: expected " + r + " bytes, got " + t.length);
      const u = new Uint8Array(o);
      u.set(t, i ? 0 : u.length - t.length), t = u;
    }
    if (t.length !== o)
      throw new Error("Field.fromBytes: expected " + o + " bytes, got " + t.length);
    let a = i ? Ga(t) : Tn(t);
    if (c && (a = Dt(a, s)), !n && !this.isValid(a))
      throw new Error("invalid field element: outside of range 0..ORDER");
    return a;
  }
  // TODO: we don't need it here, move out to separate fn
  invertBatch(t) {
    return Ru(this, t);
  }
  // We can't move this out because Fp6, Fp12 implement it
  // and it's unclear what to return in there.
  cmov(t, n, r) {
    return r ? n : t;
  }
}
function go(e, t = {}) {
  return new yh(e, t);
}
function Uu(e) {
  if (typeof e != "bigint")
    throw new Error("field order must be bigint");
  const t = e.toString(2).length;
  return Math.ceil(t / 8);
}
function $u(e) {
  const t = Uu(e);
  return t + Math.ceil(t / 2);
}
function Nu(e, t, n = !1) {
  J(e);
  const r = e.length, o = Uu(t), i = $u(t);
  if (r < 16 || r < i || r > 1024)
    throw new Error("expected " + i + "-1024 bytes of input, got " + r);
  const s = n ? Ga(e) : Tn(e), c = Dt(s, t - xt) + xt;
  return n ? qa(c, o) : Qi(c, o);
}
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const gn = /* @__PURE__ */ BigInt(0), Me = /* @__PURE__ */ BigInt(1);
function zr(e, t) {
  const n = t.negate();
  return e ? n : t;
}
function fc(e, t) {
  const n = Ru(e.Fp, t.map((r) => r.Z));
  return t.map((r, o) => e.fromAffine(r.toAffine(n[o])));
}
function Lu(e, t) {
  if (!Number.isSafeInteger(e) || e <= 0 || e > t)
    throw new Error("invalid window size, expected [1.." + t + "], got W=" + e);
}
function Uo(e, t) {
  Lu(e, t);
  const n = Math.ceil(t / e) + 1, r = 2 ** (e - 1), o = 2 ** e, i = Ji(e), s = BigInt(e);
  return { windows: n, windowSize: r, mask: i, maxNumber: o, shiftBy: s };
}
function dc(e, t, n) {
  const { windowSize: r, mask: o, maxNumber: i, shiftBy: s } = n;
  let c = Number(e & o), a = e >> s;
  c > r && (c -= i, a += Me);
  const u = t * r, f = u + Math.abs(c) - 1, d = c === 0, h = c < 0, l = t % 2 !== 0;
  return { nextN: a, offset: f, isZero: d, isNeg: h, isNegF: l, offsetF: u };
}
const $o = /* @__PURE__ */ new WeakMap(), _u = /* @__PURE__ */ new WeakMap();
function No(e) {
  return _u.get(e) || 1;
}
function lc(e) {
  if (e !== gn)
    throw new Error("invalid wNAF");
}
class mh {
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
    for (; n > gn; )
      n & Me && (r = r.add(o)), o = o.double(), n >>= Me;
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
    const { windows: r, windowSize: o } = Uo(n, this.bits), i = [];
    let s = t, c = s;
    for (let a = 0; a < r; a++) {
      c = s, i.push(c);
      for (let u = 1; u < o; u++)
        c = c.add(s), i.push(c);
      s = c.double();
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
    let o = this.ZERO, i = this.BASE;
    const s = Uo(t, this.bits);
    for (let c = 0; c < s.windows; c++) {
      const { nextN: a, offset: u, isZero: f, isNeg: d, isNegF: h, offsetF: l } = dc(r, c, s);
      r = a, f ? i = i.add(zr(h, n[l])) : o = o.add(zr(d, n[u]));
    }
    return lc(r), { p: o, f: i };
  }
  /**
   * Implements ec unsafe (non const-time) multiplication using precomputed tables and w-ary non-adjacent form.
   * @param acc accumulator point to add result of multiplication
   * @returns point
   */
  wNAFUnsafe(t, n, r, o = this.ZERO) {
    const i = Uo(t, this.bits);
    for (let s = 0; s < i.windows && r !== gn; s++) {
      const { nextN: c, offset: a, isZero: u, isNeg: f } = dc(r, s, i);
      if (r = c, !u) {
        const d = n[a];
        o = o.add(f ? d.negate() : d);
      }
    }
    return lc(r), o;
  }
  getPrecomputes(t, n, r) {
    let o = $o.get(n);
    return o || (o = this.precomputeWindow(n, t), t !== 1 && (typeof r == "function" && (o = r(o)), $o.set(n, o))), o;
  }
  cached(t, n, r) {
    const o = No(t);
    return this.wNAF(o, this.getPrecomputes(o, t, r), n);
  }
  unsafe(t, n, r, o) {
    const i = No(t);
    return i === 1 ? this._unsafeLadder(t, n, o) : this.wNAFUnsafe(i, this.getPrecomputes(i, t, r), n, o);
  }
  // We calculate precomputes for elliptic curve point multiplication
  // using windowed method. This specifies window size and
  // stores precomputed values. Usually only base point would be precomputed.
  createCache(t, n) {
    Lu(n, this.bits), _u.set(t, n), $o.delete(t);
  }
  hasCache(t) {
    return No(t) !== 1;
  }
}
function bh(e, t, n, r) {
  let o = t, i = e.ZERO, s = e.ZERO;
  for (; n > gn || r > gn; )
    n & Me && (i = i.add(o)), r & Me && (s = s.add(o)), o = o.double(), n >>= Me, r >>= Me;
  return { p1: i, p2: s };
}
function hc(e, t, n) {
  if (t) {
    if (t.ORDER !== e)
      throw new Error("Field.ORDER must match order: Fp == p, Fn == n");
    return ph(t), t;
  } else
    return go(e, { isLE: n });
}
function xh(e, t, n = {}, r) {
  if (r === void 0 && (r = e === "edwards"), !t || typeof t != "object")
    throw new Error(`expected valid ${e} CURVE object`);
  for (const a of ["p", "n", "h"]) {
    const u = t[a];
    if (!(typeof u == "bigint" && u > gn))
      throw new Error(`CURVE.${a} must be positive bigint`);
  }
  const o = hc(t.p, n.Fp, r), i = hc(t.n, n.Fn, r), c = ["Gx", "Gy", "a", "b"];
  for (const a of c)
    if (!o.isValid(t[a]))
      throw new Error(`CURVE.${a} must be valid field element of CURVE.Fp`);
  return t = Object.freeze(Object.assign({}, t)), { CURVE: t, Fp: o, Fn: i };
}
function Cu(e, t) {
  return function(r) {
    const o = e(r);
    return { secretKey: o, publicKey: t(o) };
  };
}
class Pu {
  oHash;
  iHash;
  blockLen;
  outputLen;
  finished = !1;
  destroyed = !1;
  constructor(t, n) {
    if (Ma(t), J(n, void 0, "key"), this.iHash = t.create(), typeof this.iHash.update != "function")
      throw new Error("Expected instance of class which extends utils.Hash");
    this.blockLen = this.iHash.blockLen, this.outputLen = this.iHash.outputLen;
    const r = this.blockLen, o = new Uint8Array(r);
    o.set(n.length > r ? t.create().update(n).digest() : n);
    for (let i = 0; i < o.length; i++)
      o[i] ^= 54;
    this.iHash.update(o), this.oHash = t.create();
    for (let i = 0; i < o.length; i++)
      o[i] ^= 106;
    this.oHash.update(o), Pr(o);
  }
  update(t) {
    return Cr(this), this.iHash.update(t), this;
  }
  digestInto(t) {
    Cr(this), J(t, this.outputLen, "output"), this.finished = !0, this.iHash.digestInto(t), this.oHash.update(t), this.oHash.digestInto(t), this.destroy();
  }
  digest() {
    const t = new Uint8Array(this.oHash.outputLen);
    return this.digestInto(t), t;
  }
  _cloneInto(t) {
    t ||= Object.create(Object.getPrototypeOf(this), {});
    const { oHash: n, iHash: r, finished: o, destroyed: i, blockLen: s, outputLen: c } = this;
    return t = t, t.finished = o, t.destroyed = i, t.blockLen = s, t.outputLen = c, t.oHash = n._cloneInto(t.oHash), t.iHash = r._cloneInto(t.iHash), t;
  }
  clone() {
    return this._cloneInto();
  }
  destroy() {
    this.destroyed = !0, this.oHash.destroy(), this.iHash.destroy();
  }
}
const Vu = (e, t, n) => new Pu(e, t).update(n).digest();
Vu.create = (e, t) => new Pu(e, t);
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const pc = (e, t) => (e + (e >= 0 ? t : -t) / Hu) / t;
function Eh(e, t, n) {
  const [[r, o], [i, s]] = t, c = pc(s * e, n), a = pc(-o * e, n);
  let u = e - c * r - a * i, f = -c * o - a * s;
  const d = u < ae, h = f < ae;
  d && (u = -u), h && (f = -f);
  const l = Ji(Math.ceil(El(n) / 2)) + rn;
  if (u < ae || u >= l || f < ae || f >= l)
    throw new Error("splitScalar (endomorphism): failed, k=" + e);
  return { k1neg: d, k1: u, k2neg: h, k2: f };
}
function hi(e) {
  if (!["compact", "recovered", "der"].includes(e))
    throw new Error('Signature format must be "compact", "recovered", or "der"');
  return e;
}
function Lo(e, t) {
  const n = {};
  for (let r of Object.keys(t))
    n[r] = e[r] === void 0 ? t[r] : e[r];
  return Hr(n.lowS, "lowS"), Hr(n.prehash, "prehash"), n.format !== void 0 && hi(n.format), n;
}
class Sh extends Error {
  constructor(t = "") {
    super(t);
  }
}
const be = {
  // asn.1 DER encoding utils
  Err: Sh,
  // Basic building block is TLV (Tag-Length-Value)
  _tlv: {
    encode: (e, t) => {
      const { Err: n } = be;
      if (e < 0 || e > 256)
        throw new n("tlv.encode: wrong tag");
      if (t.length & 1)
        throw new n("tlv.encode: unpadded data");
      const r = t.length / 2, o = ir(r);
      if (o.length / 2 & 128)
        throw new n("tlv.encode: long form length too big");
      const i = r > 127 ? ir(o.length / 2 | 128) : "";
      return ir(e) + i + o + t;
    },
    // v - value, l - left bytes (unparsed)
    decode(e, t) {
      const { Err: n } = be;
      let r = 0;
      if (e < 0 || e > 256)
        throw new n("tlv.encode: wrong tag");
      if (t.length < 2 || t[r++] !== e)
        throw new n("tlv.decode: wrong tlv");
      const o = t[r++], i = !!(o & 128);
      let s = 0;
      if (!i)
        s = o;
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
          s = s << 8 | f;
        if (r += a, s < 128)
          throw new n("tlv.decode(long): not minimal encoding");
      }
      const c = t.subarray(r, r + s);
      if (c.length !== s)
        throw new n("tlv.decode: wrong value length");
      return { v: c, l: t.subarray(r + s) };
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
      let n = ir(e);
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
      return Tn(e);
    }
  },
  toSig(e) {
    const { Err: t, _int: n, _tlv: r } = be, o = J(e, void 0, "signature"), { v: i, l: s } = r.decode(48, o);
    if (s.length)
      throw new t("invalid signature: left bytes after parsing");
    const { v: c, l: a } = r.decode(2, i), { v: u, l: f } = r.decode(2, a);
    if (f.length)
      throw new t("invalid signature: left bytes after parsing");
    return { r: n.decode(c), s: n.decode(u) };
  },
  hexFromSig(e) {
    const { _tlv: t, _int: n } = be, r = t.encode(2, n.encode(e.r)), o = t.encode(2, n.encode(e.s)), i = r + o;
    return t.encode(48, i);
  }
}, ae = BigInt(0), rn = BigInt(1), Hu = BigInt(2), sr = BigInt(3), Th = BigInt(4);
function vh(e, t = {}) {
  const n = xh("weierstrass", e, t), { Fp: r, Fn: o } = n;
  let i = n.CURVE;
  const { h: s, n: c } = i;
  ts(t, {}, {
    allowInfinityPoint: "boolean",
    clearCofactor: "function",
    isTorsionFree: "function",
    fromBytes: "function",
    toBytes: "function",
    endo: "object"
  });
  const { endo: a } = t;
  if (a && (!r.is0(i.a) || typeof a.beta != "bigint" || !Array.isArray(a.basises)))
    throw new Error('invalid endo: expected "beta": bigint and "basises": array');
  const u = Ku(r, o);
  function f() {
    if (!r.isOdd)
      throw new Error("compression is not supported: Field does not have .isOdd()");
  }
  function d(C, b, m) {
    const { x: p, y: x } = b.toAffine(), A = r.toBytes(p);
    if (Hr(m, "isCompressed"), m) {
      f();
      const I = !r.isOdd(x);
      return Qt(Du(I), A);
    } else
      return Qt(Uint8Array.of(4), A, r.toBytes(x));
  }
  function h(C) {
    J(C, void 0, "Point");
    const { publicKey: b, publicKeyUncompressed: m } = u, p = C.length, x = C[0], A = C.subarray(1);
    if (p === b && (x === 2 || x === 3)) {
      const I = r.fromBytes(A);
      if (!r.isValid(I))
        throw new Error("bad point: is not on curve, wrong x");
      const k = w(I);
      let T;
      try {
        T = r.sqrt(k);
      } catch (F) {
        const H = F instanceof Error ? ": " + F.message : "";
        throw new Error("bad point: is not on curve, sqrt error" + H);
      }
      f();
      const B = r.isOdd(T);
      return (x & 1) === 1 !== B && (T = r.neg(T)), { x: I, y: T };
    } else if (p === m && x === 4) {
      const I = r.BYTES, k = r.fromBytes(A.subarray(0, I)), T = r.fromBytes(A.subarray(I, I * 2));
      if (!y(k, T))
        throw new Error("bad point: is not on curve");
      return { x: k, y: T };
    } else
      throw new Error(`bad point: got length ${p}, expected compressed=${b} or uncompressed=${m}`);
  }
  const l = t.toBytes || d, g = t.fromBytes || h;
  function w(C) {
    const b = r.sqr(C), m = r.mul(b, C);
    return r.add(r.add(m, r.mul(C, i.a)), i.b);
  }
  function y(C, b) {
    const m = r.sqr(b), p = w(C);
    return r.eql(m, p);
  }
  if (!y(i.Gx, i.Gy))
    throw new Error("bad curve params: generator point");
  const S = r.mul(r.pow(i.a, sr), Th), v = r.mul(r.sqr(i.b), BigInt(27));
  if (r.is0(r.add(S, v)))
    throw new Error("bad curve params: a or b");
  function R(C, b, m = !1) {
    if (!r.isValid(b) || m && r.is0(b))
      throw new Error(`bad point coordinate ${C}`);
    return b;
  }
  function $(C) {
    if (!(C instanceof _))
      throw new Error("Weierstrass Point expected");
  }
  function L(C) {
    if (!a || !a.basises)
      throw new Error("no endo");
    return Eh(C, a.basises, o.ORDER);
  }
  const j = Js((C, b) => {
    const { X: m, Y: p, Z: x } = C;
    if (r.eql(x, r.ONE))
      return { x: m, y: p };
    const A = C.is0();
    b == null && (b = A ? r.ONE : r.inv(x));
    const I = r.mul(m, b), k = r.mul(p, b), T = r.mul(x, b);
    if (A)
      return { x: r.ZERO, y: r.ZERO };
    if (!r.eql(T, r.ONE))
      throw new Error("invZ was invalid");
    return { x: I, y: k };
  }), E = Js((C) => {
    if (C.is0()) {
      if (t.allowInfinityPoint && !r.is0(C.Y))
        return;
      throw new Error("bad point: ZERO");
    }
    const { x: b, y: m } = C.toAffine();
    if (!r.isValid(b) || !r.isValid(m))
      throw new Error("bad point: x or y not field elements");
    if (!y(b, m))
      throw new Error("bad point: equation left != right");
    if (!C.isTorsionFree())
      throw new Error("bad point: not in prime-order subgroup");
    return !0;
  });
  function nt(C, b, m, p, x) {
    return m = new _(r.mul(m.X, C), m.Y, m.Z), b = zr(p, b), m = zr(x, m), b.add(m);
  }
  class _ {
    // base / generator point
    static BASE = new _(i.Gx, i.Gy, r.ONE);
    // zero / infinity / identity point
    static ZERO = new _(r.ZERO, r.ONE, r.ZERO);
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
      this.X = R("x", b), this.Y = R("y", m, !0), this.Z = R("z", p), Object.freeze(this);
    }
    static CURVE() {
      return i;
    }
    /** Does NOT validate if the point is valid. Use `.assertValidity()`. */
    static fromAffine(b) {
      const { x: m, y: p } = b || {};
      if (!b || !r.isValid(m) || !r.isValid(p))
        throw new Error("invalid affine point");
      if (b instanceof _)
        throw new Error("projective point not allowed");
      return r.is0(m) && r.is0(p) ? _.ZERO : new _(m, p, r.ONE);
    }
    static fromBytes(b) {
      const m = _.fromAffine(g(J(b, void 0, "point")));
      return m.assertValidity(), m;
    }
    static fromHex(b) {
      return _.fromBytes(Vr(b));
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
      return gt.createCache(this, b), m || this.multiply(sr), this;
    }
    // TODO: return `this`
    /** A point on curve is valid if it conforms to equation. */
    assertValidity() {
      E(this);
    }
    hasEvenY() {
      const { y: b } = this.toAffine();
      if (!r.isOdd)
        throw new Error("Field doesn't support isOdd");
      return !r.isOdd(b);
    }
    /** Compare one point to another. */
    equals(b) {
      $(b);
      const { X: m, Y: p, Z: x } = this, { X: A, Y: I, Z: k } = b, T = r.eql(r.mul(m, k), r.mul(A, x)), B = r.eql(r.mul(p, k), r.mul(I, x));
      return T && B;
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
      const { a: b, b: m } = i, p = r.mul(m, sr), { X: x, Y: A, Z: I } = this;
      let k = r.ZERO, T = r.ZERO, B = r.ZERO, U = r.mul(x, x), F = r.mul(A, A), H = r.mul(I, I), N = r.mul(x, A);
      return N = r.add(N, N), B = r.mul(x, I), B = r.add(B, B), k = r.mul(b, B), T = r.mul(p, H), T = r.add(k, T), k = r.sub(F, T), T = r.add(F, T), T = r.mul(k, T), k = r.mul(N, k), B = r.mul(p, B), H = r.mul(b, H), N = r.sub(U, H), N = r.mul(b, N), N = r.add(N, B), B = r.add(U, U), U = r.add(B, U), U = r.add(U, H), U = r.mul(U, N), T = r.add(T, U), H = r.mul(A, I), H = r.add(H, H), U = r.mul(H, N), k = r.sub(k, U), B = r.mul(H, F), B = r.add(B, B), B = r.add(B, B), new _(k, T, B);
    }
    // Renes-Costello-Batina exception-free addition formula.
    // There is 30% faster Jacobian formula, but it is not complete.
    // https://eprint.iacr.org/2015/1060, algorithm 1
    // Cost: 12M + 0S + 3*a + 3*b3 + 23add.
    add(b) {
      $(b);
      const { X: m, Y: p, Z: x } = this, { X: A, Y: I, Z: k } = b;
      let T = r.ZERO, B = r.ZERO, U = r.ZERO;
      const F = i.a, H = r.mul(i.b, sr);
      let N = r.mul(m, A), D = r.mul(p, I), G = r.mul(x, k), ot = r.add(m, p), K = r.add(A, I);
      ot = r.mul(ot, K), K = r.add(N, D), ot = r.sub(ot, K), K = r.add(m, x);
      let Y = r.add(A, k);
      return K = r.mul(K, Y), Y = r.add(N, G), K = r.sub(K, Y), Y = r.add(p, x), T = r.add(I, k), Y = r.mul(Y, T), T = r.add(D, G), Y = r.sub(Y, T), U = r.mul(F, K), T = r.mul(H, G), U = r.add(T, U), T = r.sub(D, U), U = r.add(D, U), B = r.mul(T, U), D = r.add(N, N), D = r.add(D, N), G = r.mul(F, G), K = r.mul(H, K), D = r.add(D, G), G = r.sub(N, G), G = r.mul(F, G), K = r.add(K, G), N = r.mul(D, K), B = r.add(B, N), N = r.mul(Y, K), T = r.mul(ot, T), T = r.sub(T, N), N = r.mul(ot, D), U = r.mul(Y, U), U = r.add(U, N), new _(T, B, U);
    }
    subtract(b) {
      return this.add(b.negate());
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
    multiply(b) {
      const { endo: m } = t;
      if (!o.isValidNot0(b))
        throw new Error("invalid scalar: out of range");
      let p, x;
      const A = (I) => gt.cached(this, I, (k) => fc(_, k));
      if (m) {
        const { k1neg: I, k1: k, k2neg: T, k2: B } = L(b), { p: U, f: F } = A(k), { p: H, f: N } = A(B);
        x = F.add(N), p = nt(m.beta, U, H, I, T);
      } else {
        const { p: I, f: k } = A(b);
        p = I, x = k;
      }
      return fc(_, [p, x])[0];
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
        return _.ZERO;
      if (b === rn)
        return p;
      if (gt.hasCache(this))
        return this.multiply(b);
      if (m) {
        const { k1neg: x, k1: A, k2neg: I, k2: k } = L(b), { p1: T, p2: B } = bh(_, p, A, k);
        return nt(m.beta, T, B, x, I);
      } else
        return gt.unsafe(p, b);
    }
    /**
     * Converts Projective point to affine (x, y) coordinates.
     * @param invertedZ Z^-1 (inverted zero) - optional, precomputation is useful for invertBatch
     */
    toAffine(b) {
      return j(this, b);
    }
    /**
     * Checks whether Point is free of torsion elements (is in prime subgroup).
     * Always torsion-free for cofactor=1 curves.
     */
    isTorsionFree() {
      const { isTorsionFree: b } = t;
      return s === rn ? !0 : b ? b(_, this) : gt.unsafe(this, c).is0();
    }
    clearCofactor() {
      const { clearCofactor: b } = t;
      return s === rn ? this : b ? b(_, this) : this.multiplyUnsafe(s);
    }
    isSmallOrder() {
      return this.multiplyUnsafe(s).is0();
    }
    toBytes(b = !0) {
      return Hr(b, "isCompressed"), this.assertValidity(), l(_, this, b);
    }
    toHex(b = !0) {
      return uo(this.toBytes(b));
    }
    toString() {
      return `<Point ${this.is0() ? "ZERO" : this.toHex()}>`;
    }
  }
  const Pt = o.BITS, gt = new mh(_, t.endo ? Math.ceil(Pt / 2) : Pt);
  return _.BASE.precompute(8), _;
}
function Du(e) {
  return Uint8Array.of(e ? 2 : 3);
}
function Ku(e, t) {
  return {
    secretKey: t.BYTES,
    publicKey: 1 + e.BYTES,
    publicKeyUncompressed: 1 + 2 * e.BYTES,
    publicKeyHasPrefix: !0,
    signature: 2 * t.BYTES
  };
}
function Ah(e, t = {}) {
  const { Fn: n } = e, r = t.randomBytes || fo, o = Object.assign(Ku(e.Fp, n), { seed: $u(n.ORDER) });
  function i(l) {
    try {
      const g = n.fromBytes(l);
      return n.isValidNot0(g);
    } catch {
      return !1;
    }
  }
  function s(l, g) {
    const { publicKey: w, publicKeyUncompressed: y } = o;
    try {
      const S = l.length;
      return g === !0 && S !== w || g === !1 && S !== y ? !1 : !!e.fromBytes(l);
    } catch {
      return !1;
    }
  }
  function c(l = r(o.seed)) {
    return Nu(J(l, o.seed, "seed"), n.ORDER);
  }
  function a(l, g = !0) {
    return e.BASE.multiply(n.fromBytes(l)).toBytes(g);
  }
  function u(l) {
    const { secretKey: g, publicKey: w, publicKeyUncompressed: y } = o;
    if (!Zi(l) || "_lengths" in n && n._lengths || g === w)
      return;
    const S = J(l, void 0, "key").length;
    return S === w || S === y;
  }
  function f(l, g, w = !0) {
    if (u(l) === !0)
      throw new Error("first arg must be private key");
    if (u(g) === !1)
      throw new Error("second arg must be public key");
    const y = n.fromBytes(l);
    return e.fromBytes(g).multiply(y).toBytes(w);
  }
  const d = {
    isValidSecretKey: i,
    isValidPublicKey: s,
    randomSecretKey: c
  }, h = Cu(c, a);
  return Object.freeze({ getPublicKey: a, getSharedSecret: f, keygen: h, Point: e, utils: d, lengths: o });
}
function kh(e, t, n = {}) {
  Ma(t), ts(n, {}, {
    hmac: "function",
    lowS: "boolean",
    randomBytes: "function",
    bits2int: "function",
    bits2int_modN: "function"
  }), n = Object.assign({}, n);
  const r = n.randomBytes || fo, o = n.hmac || ((m, p) => Vu(t, m, p)), { Fp: i, Fn: s } = e, { ORDER: c, BITS: a } = s, { keygen: u, getPublicKey: f, getSharedSecret: d, utils: h, lengths: l } = Ah(e, n), g = {
    prehash: !0,
    lowS: typeof n.lowS == "boolean" ? n.lowS : !0,
    format: "compact",
    extraEntropy: !1
  }, w = c * Hu < i.ORDER;
  function y(m) {
    const p = c >> rn;
    return m > p;
  }
  function S(m, p) {
    if (!s.isValidNot0(p))
      throw new Error(`invalid signature ${m}: out of range 1..Point.Fn.ORDER`);
    return p;
  }
  function v() {
    if (w)
      throw new Error('"recovered" sig type is not supported for cofactor >2 curves');
  }
  function R(m, p) {
    hi(p);
    const x = l.signature, A = p === "compact" ? x : p === "recovered" ? x + 1 : void 0;
    return J(m, A);
  }
  class $ {
    r;
    s;
    recovery;
    constructor(p, x, A) {
      if (this.r = S("r", p), this.s = S("s", x), A != null) {
        if (v(), ![0, 1, 2, 3].includes(A))
          throw new Error("invalid recovery id");
        this.recovery = A;
      }
      Object.freeze(this);
    }
    static fromBytes(p, x = g.format) {
      R(p, x);
      let A;
      if (x === "der") {
        const { r: B, s: U } = be.toSig(J(p));
        return new $(B, U);
      }
      x === "recovered" && (A = p[0], x = "compact", p = p.subarray(1));
      const I = l.signature / 2, k = p.subarray(0, I), T = p.subarray(I, I * 2);
      return new $(s.fromBytes(k), s.fromBytes(T), A);
    }
    static fromHex(p, x) {
      return this.fromBytes(Vr(p), x);
    }
    assertRecovery() {
      const { recovery: p } = this;
      if (p == null)
        throw new Error("invalid recovery id: must be present");
      return p;
    }
    addRecoveryBit(p) {
      return new $(this.r, this.s, p);
    }
    recoverPublicKey(p) {
      const { r: x, s: A } = this, I = this.assertRecovery(), k = I === 2 || I === 3 ? x + c : x;
      if (!i.isValid(k))
        throw new Error("invalid recovery id: sig.r+curve.n != R.x");
      const T = i.toBytes(k), B = e.fromBytes(Qt(Du((I & 1) === 0), T)), U = s.inv(k), F = j(J(p, void 0, "msgHash")), H = s.create(-F * U), N = s.create(A * U), D = e.BASE.multiplyUnsafe(H).add(B.multiplyUnsafe(N));
      if (D.is0())
        throw new Error("invalid recovery: point at infinify");
      return D.assertValidity(), D;
    }
    // Signatures should be low-s, to prevent malleability.
    hasHighS() {
      return y(this.s);
    }
    toBytes(p = g.format) {
      if (hi(p), p === "der")
        return Vr(be.hexFromSig(this));
      const { r: x, s: A } = this, I = s.toBytes(x), k = s.toBytes(A);
      return p === "recovered" ? (v(), Qt(Uint8Array.of(this.assertRecovery()), I, k)) : Qt(I, k);
    }
    toHex(p) {
      return uo(this.toBytes(p));
    }
  }
  const L = n.bits2int || function(p) {
    if (p.length > 8192)
      throw new Error("input is too large");
    const x = Tn(p), A = p.length * 8 - a;
    return A > 0 ? x >> BigInt(A) : x;
  }, j = n.bits2int_modN || function(p) {
    return s.create(L(p));
  }, E = Ji(a);
  function nt(m) {
    return xl("num < 2^" + a, m, ae, E), s.toBytes(m);
  }
  function _(m, p) {
    return J(m, void 0, "message"), p ? J(t(m), void 0, "prehashed message") : m;
  }
  function Pt(m, p, x) {
    const { lowS: A, prehash: I, extraEntropy: k } = Lo(x, g);
    m = _(m, I);
    const T = j(m), B = s.fromBytes(p);
    if (!s.isValidNot0(B))
      throw new Error("invalid private key");
    const U = [nt(B), nt(T)];
    if (k != null && k !== !1) {
      const D = k === !0 ? r(l.secretKey) : k;
      U.push(J(D, void 0, "extraEntropy"));
    }
    const F = Qt(...U), H = T;
    function N(D) {
      const G = L(D);
      if (!s.isValidNot0(G))
        return;
      const ot = s.inv(G), K = e.BASE.multiply(G).toAffine(), Y = s.create(K.x);
      if (Y === ae)
        return;
      const ne = s.create(ot * s.create(H + Y * B));
      if (ne === ae)
        return;
      let vn = (K.x === Y ? 0 : 2) | Number(K.y & rn), An = ne;
      return A && y(ne) && (An = s.neg(ne), vn ^= 1), new $(Y, An, w ? void 0 : vn);
    }
    return { seed: F, k2sig: N };
  }
  function gt(m, p, x = {}) {
    const { seed: A, k2sig: I } = Pt(m, p, x);
    return Sl(t.outputLen, s.BYTES, o)(A, I).toBytes(x.format);
  }
  function C(m, p, x, A = {}) {
    const { lowS: I, prehash: k, format: T } = Lo(A, g);
    if (x = J(x, void 0, "publicKey"), p = _(p, k), !Zi(m)) {
      const B = m instanceof $ ? ", use sig.toBytes()" : "";
      throw new Error("verify expects Uint8Array signature" + B);
    }
    R(m, T);
    try {
      const B = $.fromBytes(m, T), U = e.fromBytes(x);
      if (I && B.hasHighS())
        return !1;
      const { r: F, s: H } = B, N = j(p), D = s.inv(H), G = s.create(N * D), ot = s.create(F * D), K = e.BASE.multiplyUnsafe(G).add(U.multiplyUnsafe(ot));
      return K.is0() ? !1 : s.create(K.x) === F;
    } catch {
      return !1;
    }
  }
  function b(m, p, x = {}) {
    const { prehash: A } = Lo(x, g);
    return p = _(p, A), $.fromBytes(m, "recovered").recoverPublicKey(p).toBytes();
  }
  return Object.freeze({
    keygen: u,
    getPublicKey: f,
    getSharedSecret: d,
    utils: h,
    lengths: l,
    Point: e,
    sign: gt,
    verify: C,
    recoverPublicKey: b,
    Signature: $,
    hash: t
  });
}
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const wo = {
  p: BigInt("0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffefffffc2f"),
  n: BigInt("0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141"),
  h: BigInt(1),
  a: BigInt(0),
  b: BigInt(7),
  Gx: BigInt("0x79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798"),
  Gy: BigInt("0x483ada7726a3c4655da4fbfc0e1108a8fd17b448a68554199c47d08ffb10d4b8")
}, Ih = {
  beta: BigInt("0x7ae96a2b657c07106e64479eac3434e99cf0497512f58995c1396c28719501ee"),
  basises: [
    [BigInt("0x3086d221a7d46bcde86c90e49284eb15"), -BigInt("0xe4437ed6010e88286f547fa90abfe4c3")],
    [BigInt("0x114ca50f7a8e2f3f657c1108d9d44cfd8"), BigInt("0x3086d221a7d46bcde86c90e49284eb15")]
  ]
}, Bh = /* @__PURE__ */ BigInt(0), pi = /* @__PURE__ */ BigInt(2);
function Oh(e) {
  const t = wo.p, n = BigInt(3), r = BigInt(6), o = BigInt(11), i = BigInt(22), s = BigInt(23), c = BigInt(44), a = BigInt(88), u = e * e * e % t, f = u * u * e % t, d = Nt(f, n, t) * f % t, h = Nt(d, n, t) * f % t, l = Nt(h, pi, t) * u % t, g = Nt(l, o, t) * l % t, w = Nt(g, i, t) * g % t, y = Nt(w, c, t) * w % t, S = Nt(y, a, t) * y % t, v = Nt(S, c, t) * w % t, R = Nt(v, n, t) * f % t, $ = Nt(R, s, t) * g % t, L = Nt($, r, t) * u % t, j = Nt(L, pi, t);
  if (!Wr.eql(Wr.sqr(j), e))
    throw new Error("Cannot find square root");
  return j;
}
const Wr = go(wo.p, { sqrt: Oh }), Ze = /* @__PURE__ */ vh(wo, {
  Fp: Wr,
  endo: Ih
}), gc = /* @__PURE__ */ kh(Ze, li), wc = {};
function Gr(e, ...t) {
  let n = wc[e];
  if (n === void 0) {
    const r = li(ml(e));
    n = Qt(r, r), wc[e] = n;
  }
  return li(Qt(n, ...t));
}
const os = (e) => e.toBytes(!0).slice(1), is = (e) => e % pi === Bh;
function gi(e) {
  const { Fn: t, BASE: n } = Ze, r = t.fromBytes(e), o = n.multiply(r);
  return { scalar: is(o.y) ? r : t.neg(r), bytes: os(o) };
}
function Mu(e) {
  const t = Wr;
  if (!t.isValidNot0(e))
    throw new Error("invalid x: Fail if x ≥ p");
  const n = t.create(e * e), r = t.create(n * e + BigInt(7));
  let o = t.sqrt(r);
  is(o) || (o = t.neg(o));
  const i = Ze.fromAffine({ x: e, y: o });
  return i.assertValidity(), i;
}
const _n = Tn;
function Fu(...e) {
  return Ze.Fn.create(_n(Gr("BIP0340/challenge", ...e)));
}
function yc(e) {
  return gi(e).bytes;
}
function Rh(e, t, n = fo(32)) {
  const { Fn: r } = Ze, o = J(e, void 0, "message"), { bytes: i, scalar: s } = gi(t), c = J(n, 32, "auxRand"), a = r.toBytes(s ^ _n(Gr("BIP0340/aux", c))), u = Gr("BIP0340/nonce", a, i, o), { bytes: f, scalar: d } = gi(u), h = Fu(f, i, o), l = new Uint8Array(64);
  if (l.set(f, 0), l.set(r.toBytes(r.create(d + h * s)), 32), !zu(l, o, i))
    throw new Error("sign: Invalid signature produced");
  return l;
}
function zu(e, t, n) {
  const { Fp: r, Fn: o, BASE: i } = Ze, s = J(e, 64, "signature"), c = J(t, void 0, "message"), a = J(n, 32, "publicKey");
  try {
    const u = Mu(_n(a)), f = _n(s.subarray(0, 32));
    if (!r.isValidNot0(f))
      return !1;
    const d = _n(s.subarray(32, 64));
    if (!o.isValidNot0(d))
      return !1;
    const h = Fu(o.toBytes(f), os(u), c), l = i.multiplyUnsafe(d).add(u.multiplyUnsafe(o.neg(h))), { x: g, y: w } = l.toAffine();
    return !(l.is0() || !is(w) || g !== f);
  } catch {
    return !1;
  }
}
const ss = /* @__PURE__ */ (() => {
  const n = (r = fo(48)) => Nu(r, wo.n);
  return {
    keygen: Cu(n, yc),
    getPublicKey: yc,
    sign: Rh,
    verify: zu,
    Point: Ze,
    utils: {
      randomSecretKey: n,
      taggedHash: Gr,
      lift_x: Mu,
      pointToBytes: os
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
function cs(e, t, n = {}) {
  e = ii(e);
  const { aggPublicKey: r } = si(e);
  if (!n.taprootTweak)
    return {
      preTweakedKey: r.toBytes(!0),
      finalKey: r.toBytes(!0)
    };
  const o = ss.utils.taggedHash("TapTweak", r.toBytes(!0).subarray(1), n.taprootTweak ?? new Uint8Array(0)), { aggPublicKey: i } = si(e, [o], [!0]);
  return {
    preTweakedKey: r.toBytes(!0),
    finalKey: i.toBytes(!0)
  };
}
class cr extends Error {
  constructor(t) {
    super(t), this.name = "PartialSignatureError";
  }
}
class as {
  constructor(t, n) {
    if (this.s = t, this.R = n, t.length !== 32)
      throw new cr("Invalid s length");
    if (n.length !== 33)
      throw new cr("Invalid R length");
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
      throw new cr("Invalid partial signature length");
    if (Tn(t) >= Et.CURVE().n)
      throw new cr("s value overflows curve order");
    const r = new Uint8Array(33);
    return new as(t, r);
  }
}
function Uh(e, t, n, r, o, i) {
  let s;
  if (i?.taprootTweak !== void 0) {
    const { preTweakedKey: u } = cs(ii(r));
    s = ss.utils.taggedHash("TapTweak", u.subarray(1), i.taprootTweak);
  }
  const a = new fl(n, ii(r), o, s ? [s] : void 0, s ? [!0] : void 0).sign(e, t);
  return as.decode(a);
}
var _o, mc;
function $h() {
  if (mc) return _o;
  mc = 1;
  const e = 4294967295, t = 1 << 31, n = 9, r = 65535, o = 1 << 22, i = r, s = 1 << n, c = r << n;
  function a(f) {
    return f & t ? {} : f & o ? {
      seconds: (f & r) << n
    } : {
      blocks: f & r
    };
  }
  function u({ blocks: f, seconds: d }) {
    if (f !== void 0 && d !== void 0) throw new TypeError("Cannot encode blocks AND seconds");
    if (f === void 0 && d === void 0) return e;
    if (d !== void 0) {
      if (!Number.isFinite(d)) throw new TypeError("Expected Number seconds");
      if (d > c) throw new TypeError("Expected Number seconds <= " + c);
      if (d % s !== 0) throw new TypeError("Expected Number seconds as a multiple of " + s);
      return o | d >> n;
    }
    if (!Number.isFinite(f)) throw new TypeError("Expected Number blocks");
    if (f > r) throw new TypeError("Expected Number blocks <= " + i);
    return f;
  }
  return _o = { decode: a, encode: u }, _o;
}
var wi = $h(), Ot;
(function(e) {
  e.VtxoTaprootTree = "taptree", e.VtxoTreeExpiry = "expiry", e.Cosigner = "cosigner", e.ConditionWitness = "condition";
})(Ot || (Ot = {}));
const us = 222;
function Nh(e, t, n, r) {
  e.updateInput(t, {
    unknown: [
      ...e.getInput(t)?.unknown ?? [],
      n.encode(r)
    ]
  });
}
function yi(e, t, n) {
  const r = e.getInput(t)?.unknown ?? [], o = [];
  for (const i of r) {
    const s = n.decode(i);
    s && o.push(s);
  }
  return o;
}
const Wu = {
  key: Ot.VtxoTaprootTree,
  encode: (e) => [
    {
      type: us,
      key: yo[Ot.VtxoTaprootTree]
    },
    e
  ],
  decode: (e) => fs(() => ds(e[0], Ot.VtxoTaprootTree) ? e[1] : null)
}, Lh = {
  key: Ot.ConditionWitness,
  encode: (e) => [
    {
      type: us,
      key: yo[Ot.ConditionWitness]
    },
    Hn.encode(e)
  ],
  decode: (e) => fs(() => ds(e[0], Ot.ConditionWitness) ? Hn.decode(e[1]) : null)
}, mi = {
  key: Ot.Cosigner,
  encode: (e) => [
    {
      type: us,
      key: new Uint8Array([
        ...yo[Ot.Cosigner],
        e.index
      ])
    },
    e.key
  ],
  decode: (e) => fs(() => ds(e[0], Ot.Cosigner) ? {
    index: e[0].key[e[0].key.length - 1],
    key: e[1]
  } : null)
};
Ot.VtxoTreeExpiry;
const yo = Object.fromEntries(Object.values(Ot).map((e) => [
  e,
  new TextEncoder().encode(e)
])), fs = (e) => {
  try {
    return e();
  } catch {
    return null;
  }
};
function ds(e, t) {
  const n = O.encode(yo[t]);
  return O.encode(new Uint8Array([e.type, ...e.key])).includes(n);
}
const ar = new Error("missing vtxo graph");
class zn {
  constructor(t) {
    this.secretKey = t, this.myNonces = null, this.aggregateNonces = null, this.graph = null, this.scriptRoot = null, this.rootSharedOutputAmount = null;
  }
  static random() {
    const t = Zo();
    return new zn(t);
  }
  async init(t, n, r) {
    this.graph = t, this.scriptRoot = n, this.rootSharedOutputAmount = r;
  }
  async getPublicKey() {
    return gc.getPublicKey(this.secretKey);
  }
  async getNonces() {
    if (!this.graph)
      throw ar;
    this.myNonces || (this.myNonces = this.generateNonces());
    const t = /* @__PURE__ */ new Map();
    for (const [n, r] of this.myNonces)
      t.set(n, { pubNonce: r.pubNonce });
    return t;
  }
  async aggregatedNonces(t, n) {
    if (!this.graph)
      throw ar;
    if (this.aggregateNonces || (this.aggregateNonces = /* @__PURE__ */ new Map()), this.myNonces || await this.getNonces(), this.aggregateNonces.has(t))
      return {
        hasAllNonces: this.aggregateNonces.size === this.myNonces?.size
      };
    const r = this.myNonces.get(t);
    if (!r)
      throw new Error(`missing nonce for txid ${t}`);
    const o = await this.getPublicKey();
    n.set(O.encode(o.subarray(1)), r);
    const i = this.graph.find(t);
    if (!i)
      throw new Error(`missing tx for txid ${t}`);
    const s = yi(i.root, 0, mi).map(
      (u) => O.encode(u.key.subarray(1))
      // xonly pubkey
    ), c = [];
    for (const u of s) {
      const f = n.get(u);
      if (!f)
        throw new Error(`missing nonce for cosigner ${u}`);
      c.push(f.pubNonce);
    }
    const a = ll(c);
    return this.aggregateNonces.set(t, { pubNonce: a }), {
      hasAllNonces: this.aggregateNonces.size === this.myNonces?.size
    };
  }
  async sign() {
    if (!this.graph)
      throw ar;
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
      throw ar;
    const t = /* @__PURE__ */ new Map(), n = gc.getPublicKey(this.secretKey);
    for (const r of this.graph.iterator()) {
      const o = dl(n);
      t.set(r.txid, o);
    }
    return t;
  }
  signPartial(t) {
    if (!this.graph || !this.scriptRoot || !this.rootSharedOutputAmount)
      throw zn.NOT_INITIALIZED;
    if (!this.myNonces || !this.aggregateNonces)
      throw new Error("session not properly initialized");
    const n = this.myNonces.get(t.txid);
    if (!n)
      throw new Error("missing private nonce");
    const r = this.aggregateNonces.get(t.txid);
    if (!r)
      throw new Error("missing aggregate nonce");
    const o = [], i = [], s = yi(t.root, 0, mi).map((u) => u.key), { finalKey: c } = cs(s, !0, {
      taprootTweak: this.scriptRoot
    });
    for (let u = 0; u < t.root.inputsLength; u++) {
      const f = _h(c, this.graph, this.rootSharedOutputAmount, t.root);
      o.push(f.amount), i.push(f.script);
    }
    const a = t.root.preimageWitnessV1(
      0,
      // always first input
      i,
      We.DEFAULT,
      o
    );
    return Uh(n.secNonce, this.secretKey, r.pubNonce, s, a, {
      taprootTweak: this.scriptRoot
    });
  }
}
zn.NOT_INITIALIZED = new Error("session not initialized, call init method");
function _h(e, t, n, r) {
  const o = M.encode(["OP_1", e.slice(1)]);
  if (r.id === t.txid)
    return {
      amount: n,
      script: o
    };
  const i = r.getInput(0);
  if (!i.txid)
    throw new Error("missing parent input txid");
  const s = O.encode(i.txid), c = t.find(s);
  if (!c)
    throw new Error("parent  tx not found");
  if (i.index === void 0)
    throw new Error("missing input index");
  const a = c.root.getOutput(i.index);
  if (!a)
    throw new Error("parent output not found");
  if (!a.amount)
    throw new Error("parent output amount not found");
  return {
    amount: a.amount,
    script: o
  };
}
const bc = Object.values(We).filter((e) => typeof e == "number");
class Cn {
  constructor(t) {
    this.key = t || Zo();
  }
  static fromPrivateKey(t) {
    return new Cn(t);
  }
  static fromHex(t) {
    return new Cn(O.decode(t));
  }
  static fromRandomBytes() {
    return new Cn(Zo());
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
        if (!r.sign(this.key, bc))
          throw new Error("Failed to sign transaction");
      } catch (o) {
        if (!(o instanceof Error && o.message.includes("No inputs signed"))) throw o;
      }
      return r;
    }
    for (const o of n)
      if (!r.signIdx(this.key, o, bc))
        throw new Error(`Failed to sign input #${o}`);
    return r;
  }
  compressedPublicKey() {
    return Promise.resolve(ka(this.key, !0));
  }
  xOnlyPublicKey() {
    return Promise.resolve(Di(this.key));
  }
  signerSession() {
    return zn.random();
  }
  async signMessage(t, n = "schnorr") {
    return n === "ecdsa" ? Wl(t, this.key, { prehash: !1 }) : Ql.signAsync(t, this.key);
  }
  async toReadonly() {
    return new mo(await this.compressedPublicKey());
  }
}
class mo {
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
    return new mo(t);
  }
  xOnlyPublicKey() {
    return Promise.resolve(this.publicKey.slice(1));
  }
  compressedPublicKey() {
    return Promise.resolve(this.publicKey);
  }
}
class wn {
  constructor(t, n, r, o = 0) {
    if (this.serverPubKey = t, this.vtxoTaprootKey = n, this.hrp = r, this.version = o, t.length !== 32)
      throw new Error("Invalid server public key length, expected 32 bytes, got " + t.length);
    if (n.length !== 32)
      throw new Error("Invalid vtxo taproot public key length, expected 32 bytes, got " + n.length);
  }
  static decode(t) {
    const n = Xe.decodeUnsafe(t, 1023);
    if (!n)
      throw new Error("Invalid address");
    const r = new Uint8Array(Xe.fromWords(n.words));
    if (r.length !== 65)
      throw new Error("Invalid data length, expected 65 bytes, got " + r.length);
    const o = r[0], i = r.slice(1, 33), s = r.slice(33, 65);
    return new wn(i, s, n.prefix, o);
  }
  encode() {
    const t = new Uint8Array(65);
    t[0] = this.version, t.set(this.serverPubKey, 1), t.set(this.vtxoTaprootKey, 33);
    const n = Xe.toWords(t);
    return Xe.encode(this.hrp, n, 1023);
  }
  // pkScript is the script that should be used to send non-dust funds to the address
  get pkScript() {
    return M.encode(["OP_1", this.vtxoTaprootKey]);
  }
  // subdustPkScript is the script that should be used to send sub-dust funds to the address
  get subdustPkScript() {
    return M.encode(["RETURN", this.vtxoTaprootKey]);
  }
}
const qr = Fi(void 0, !0);
var ut;
(function(e) {
  e.Multisig = "multisig", e.CSVMultisig = "csv-multisig", e.ConditionCSVMultisig = "condition-csv-multisig", e.ConditionMultisig = "condition-multisig", e.CLTVMultisig = "cltv-multisig";
})(ut || (ut = {}));
function Gu(e) {
  const t = [
    qt,
    Rt,
    Wn,
    jr,
    yn
  ];
  for (const n of t)
    try {
      return n.decode(e);
    } catch {
      continue;
    }
  throw new Error(`Failed to decode: script ${O.encode(e)} is not a valid tapscript`);
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
        type: ut.Multisig,
        params: c,
        script: Jd(c.pubkeys.length, c.pubkeys).script
      };
    const a = [];
    for (let u = 0; u < c.pubkeys.length; u++)
      a.push(c.pubkeys[u]), u < c.pubkeys.length - 1 ? a.push("CHECKSIGVERIFY") : a.push("CHECKSIG");
    return {
      type: ut.Multisig,
      params: c,
      script: M.encode(a)
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
        return i(c);
      } catch (u) {
        throw new Error(`Failed to decode script: ${u instanceof Error ? u.message : String(u)}`);
      }
    }
  }
  e.decode = r;
  function o(c) {
    const a = M.decode(c), u = [];
    let f = !1;
    for (let h = 0; h < a.length; h++) {
      const l = a[h];
      if (typeof l != "string" && typeof l != "number") {
        if (l.length !== 32)
          throw new Error(`Invalid pubkey length: expected 32, got ${l.length}`);
        if (u.push(l), h + 1 >= a.length || a[h + 1] !== "CHECKSIGADD" && a[h + 1] !== "CHECKSIG")
          throw new Error("Expected CHECKSIGADD or CHECKSIG after pubkey");
        h++;
        continue;
      }
      if (h === a.length - 1) {
        if (l !== "NUMEQUAL")
          throw new Error("Expected NUMEQUAL at end of script");
        f = !0;
      }
    }
    if (!f)
      throw new Error("Missing NUMEQUAL operation");
    if (u.length === 0)
      throw new Error("Invalid script: must have at least 1 pubkey");
    const d = n({
      pubkeys: u,
      type: t.CHECKSIGADD
    });
    if (O.encode(d.script) !== O.encode(c))
      throw new Error("Invalid script format: script reconstruction mismatch");
    return {
      type: ut.Multisig,
      params: { pubkeys: u, type: t.CHECKSIGADD },
      script: c
    };
  }
  function i(c) {
    const a = M.decode(c), u = [];
    for (let d = 0; d < a.length; d++) {
      const h = a[d];
      if (typeof h != "string" && typeof h != "number") {
        if (h.length !== 32)
          throw new Error(`Invalid pubkey length: expected 32, got ${h.length}`);
        if (u.push(h), d + 1 >= a.length)
          throw new Error("Unexpected end of script");
        const l = a[d + 1];
        if (l !== "CHECKSIGVERIFY" && l !== "CHECKSIG")
          throw new Error("Expected CHECKSIGVERIFY or CHECKSIG after pubkey");
        if (d === a.length - 2 && l !== "CHECKSIG")
          throw new Error("Last operation must be CHECKSIG");
        d++;
        continue;
      }
    }
    if (u.length === 0)
      throw new Error("Invalid script: must have at least 1 pubkey");
    const f = n({ pubkeys: u, type: t.CHECKSIG });
    if (O.encode(f.script) !== O.encode(c))
      throw new Error("Invalid script format: script reconstruction mismatch");
    return {
      type: ut.Multisig,
      params: { pubkeys: u, type: t.CHECKSIG },
      script: c
    };
  }
  function s(c) {
    return c.type === ut.Multisig;
  }
  e.is = s;
})(qt || (qt = {}));
var Rt;
(function(e) {
  function t(o) {
    for (const u of o.pubkeys)
      if (u.length !== 32)
        throw new Error(`Invalid pubkey length: expected 32, got ${u.length}`);
    const i = qr.encode(BigInt(wi.encode(o.timelock.type === "blocks" ? { blocks: Number(o.timelock.value) } : { seconds: Number(o.timelock.value) }))), s = [
      i.length === 1 ? i[0] : i,
      "CHECKSEQUENCEVERIFY",
      "DROP"
    ], c = qt.encode(o), a = new Uint8Array([
      ...M.encode(s),
      ...c.script
    ]);
    return {
      type: ut.CSVMultisig,
      params: o,
      script: a
    };
  }
  e.encode = t;
  function n(o) {
    if (o.length === 0)
      throw new Error("Failed to decode: script is empty");
    const i = M.decode(o);
    if (i.length < 3)
      throw new Error("Invalid script: too short (expected at least 3)");
    const s = i[0];
    if (typeof s == "string")
      throw new Error("Invalid script: expected sequence number");
    if (i[1] !== "CHECKSEQUENCEVERIFY" || i[2] !== "DROP")
      throw new Error("Invalid script: expected CHECKSEQUENCEVERIFY DROP");
    const c = new Uint8Array(M.encode(i.slice(3)));
    let a;
    try {
      a = qt.decode(c);
    } catch (l) {
      throw new Error(`Invalid multisig script: ${l instanceof Error ? l.message : String(l)}`);
    }
    let u;
    typeof s == "number" ? u = s : u = Number(qr.decode(s));
    const f = wi.decode(u), d = f.blocks !== void 0 ? { type: "blocks", value: BigInt(f.blocks) } : { type: "seconds", value: BigInt(f.seconds) }, h = t({
      timelock: d,
      ...a.params
    });
    if (O.encode(h.script) !== O.encode(o))
      throw new Error("Invalid script format: script reconstruction mismatch");
    return {
      type: ut.CSVMultisig,
      params: {
        timelock: d,
        ...a.params
      },
      script: o
    };
  }
  e.decode = n;
  function r(o) {
    return o.type === ut.CSVMultisig;
  }
  e.is = r;
})(Rt || (Rt = {}));
var Wn;
(function(e) {
  function t(o) {
    const i = new Uint8Array([
      ...o.conditionScript,
      ...M.encode(["VERIFY"]),
      ...Rt.encode(o).script
    ]);
    return {
      type: ut.ConditionCSVMultisig,
      params: o,
      script: i
    };
  }
  e.encode = t;
  function n(o) {
    if (o.length === 0)
      throw new Error("Failed to decode: script is empty");
    const i = M.decode(o);
    if (i.length < 1)
      throw new Error("Invalid script: too short (expected at least 1)");
    let s = -1;
    for (let d = i.length - 1; d >= 0; d--)
      i[d] === "VERIFY" && (s = d);
    if (s === -1)
      throw new Error("Invalid script: missing VERIFY operation");
    const c = new Uint8Array(M.encode(i.slice(0, s))), a = new Uint8Array(M.encode(i.slice(s + 1)));
    let u;
    try {
      u = Rt.decode(a);
    } catch (d) {
      throw new Error(`Invalid CSV multisig script: ${d instanceof Error ? d.message : String(d)}`);
    }
    const f = t({
      conditionScript: c,
      ...u.params
    });
    if (O.encode(f.script) !== O.encode(o))
      throw new Error("Invalid script format: script reconstruction mismatch");
    return {
      type: ut.ConditionCSVMultisig,
      params: {
        conditionScript: c,
        ...u.params
      },
      script: o
    };
  }
  e.decode = n;
  function r(o) {
    return o.type === ut.ConditionCSVMultisig;
  }
  e.is = r;
})(Wn || (Wn = {}));
var jr;
(function(e) {
  function t(o) {
    const i = new Uint8Array([
      ...o.conditionScript,
      ...M.encode(["VERIFY"]),
      ...qt.encode(o).script
    ]);
    return {
      type: ut.ConditionMultisig,
      params: o,
      script: i
    };
  }
  e.encode = t;
  function n(o) {
    if (o.length === 0)
      throw new Error("Failed to decode: script is empty");
    const i = M.decode(o);
    if (i.length < 1)
      throw new Error("Invalid script: too short (expected at least 1)");
    let s = -1;
    for (let d = i.length - 1; d >= 0; d--)
      i[d] === "VERIFY" && (s = d);
    if (s === -1)
      throw new Error("Invalid script: missing VERIFY operation");
    const c = new Uint8Array(M.encode(i.slice(0, s))), a = new Uint8Array(M.encode(i.slice(s + 1)));
    let u;
    try {
      u = qt.decode(a);
    } catch (d) {
      throw new Error(`Invalid multisig script: ${d instanceof Error ? d.message : String(d)}`);
    }
    const f = t({
      conditionScript: c,
      ...u.params
    });
    if (O.encode(f.script) !== O.encode(o))
      throw new Error("Invalid script format: script reconstruction mismatch");
    return {
      type: ut.ConditionMultisig,
      params: {
        conditionScript: c,
        ...u.params
      },
      script: o
    };
  }
  e.decode = n;
  function r(o) {
    return o.type === ut.ConditionMultisig;
  }
  e.is = r;
})(jr || (jr = {}));
var yn;
(function(e) {
  function t(o) {
    const i = qr.encode(o.absoluteTimelock), s = [
      i.length === 1 ? i[0] : i,
      "CHECKLOCKTIMEVERIFY",
      "DROP"
    ], c = M.encode(s), a = new Uint8Array([
      ...c,
      ...qt.encode(o).script
    ]);
    return {
      type: ut.CLTVMultisig,
      params: o,
      script: a
    };
  }
  e.encode = t;
  function n(o) {
    if (o.length === 0)
      throw new Error("Failed to decode: script is empty");
    const i = M.decode(o);
    if (i.length < 3)
      throw new Error("Invalid script: too short (expected at least 3)");
    const s = i[0];
    if (typeof s == "string" || typeof s == "number")
      throw new Error("Invalid script: expected locktime number");
    if (i[1] !== "CHECKLOCKTIMEVERIFY" || i[2] !== "DROP")
      throw new Error("Invalid script: expected CHECKLOCKTIMEVERIFY DROP");
    const c = new Uint8Array(M.encode(i.slice(3)));
    let a;
    try {
      a = qt.decode(c);
    } catch (d) {
      throw new Error(`Invalid multisig script: ${d instanceof Error ? d.message : String(d)}`);
    }
    const u = qr.decode(s), f = t({
      absoluteTimelock: u,
      ...a.params
    });
    if (O.encode(f.script) !== O.encode(o))
      throw new Error("Invalid script format: script reconstruction mismatch");
    return {
      type: ut.CLTVMultisig,
      params: {
        absoluteTimelock: u,
        ...a.params
      },
      script: o
    };
  }
  e.decode = n;
  function r(o) {
    return o.type === ut.CLTVMultisig;
  }
  e.is = r;
})(yn || (yn = {}));
const xc = Dn.tapTree[2];
function Pn(e) {
  return e[1].subarray(0, e[1].length - 1);
}
class Ct {
  static decode(t) {
    const r = xc.decode(t).map((o) => o.script);
    return new Ct(r);
  }
  constructor(t) {
    this.scripts = t;
    const n = t.length % 2 !== 0 ? t.slice().reverse() : t, r = La(n.map((i) => ({
      script: i,
      leafVersion: Kn
    }))), o = Qd(Mi, r, void 0, !0);
    if (!o.tapLeafScript || o.tapLeafScript.length !== t.length)
      throw new Error("invalid scripts");
    this.leaves = o.tapLeafScript, this.tweakedPublicKey = o.tweakedPubkey;
  }
  encode() {
    return xc.encode(this.scripts.map((n) => ({
      depth: 1,
      version: Kn,
      script: n
    })));
  }
  address(t, n) {
    return new wn(n, this.tweakedPublicKey, t);
  }
  get pkScript() {
    return M.encode(["OP_1", this.tweakedPublicKey]);
  }
  onchainAddress(t) {
    return ze(t).encode({
      type: "tr",
      pubkey: this.tweakedPublicKey
    });
  }
  findLeaf(t) {
    const n = this.leaves.find((r) => O.encode(Pn(r)) === t);
    if (!n)
      throw new Error(`leaf '${t}' not found`);
    return n;
  }
  exitPaths() {
    const t = [];
    for (const n of this.leaves)
      try {
        const r = Rt.decode(Pn(n));
        t.push(r);
        continue;
      } catch {
        try {
          const o = Wn.decode(Pn(n));
          t.push(o);
        } catch {
          continue;
        }
      }
    return t;
  }
}
var Ec;
(function(e) {
  class t extends Ct {
    constructor(o) {
      n(o);
      const { sender: i, receiver: s, server: c, preimageHash: a, refundLocktime: u, unilateralClaimDelay: f, unilateralRefundDelay: d, unilateralRefundWithoutReceiverDelay: h } = o, l = Ch(a), g = jr.encode({
        conditionScript: l,
        pubkeys: [s, c]
      }).script, w = qt.encode({
        pubkeys: [i, s, c]
      }).script, y = yn.encode({
        absoluteTimelock: u,
        pubkeys: [i, c]
      }).script, S = Wn.encode({
        conditionScript: l,
        timelock: f,
        pubkeys: [s]
      }).script, v = Rt.encode({
        timelock: d,
        pubkeys: [i, s]
      }).script, R = Rt.encode({
        timelock: h,
        pubkeys: [i]
      }).script;
      super([
        g,
        w,
        y,
        S,
        v,
        R
      ]), this.options = o, this.claimScript = O.encode(g), this.refundScript = O.encode(w), this.refundWithoutReceiverScript = O.encode(y), this.unilateralClaimScript = O.encode(S), this.unilateralRefundScript = O.encode(v), this.unilateralRefundWithoutReceiverScript = O.encode(R);
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
    const { sender: o, receiver: i, server: s, preimageHash: c, refundLocktime: a, unilateralClaimDelay: u, unilateralRefundDelay: f, unilateralRefundWithoutReceiverDelay: d } = r;
    if (!c || c.length !== 20)
      throw new Error("preimage hash must be 20 bytes");
    if (!i || i.length !== 32)
      throw new Error("Invalid public key length (receiver)");
    if (!o || o.length !== 32)
      throw new Error("Invalid public key length (sender)");
    if (!s || s.length !== 32)
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
    if (!d || typeof d.value != "bigint" || d.value <= 0n)
      throw new Error("unilateral refund without receiver delay must greater than 0");
    if (d.type === "seconds" && d.value % 512n !== 0n)
      throw new Error("seconds timelock must be multiple of 512");
    if (d.type === "seconds" && d.value < 512n)
      throw new Error("seconds timelock must be greater or equal to 512");
  }
})(Ec || (Ec = {}));
function Ch(e) {
  return M.encode(["HASH160", e, "EQUAL"]);
}
var Yr;
(function(e) {
  class t extends Ct {
    constructor(r) {
      const { pubKey: o, serverPubKey: i, csvTimelock: s = t.DEFAULT_TIMELOCK } = r, c = qt.encode({
        pubkeys: [o, i]
      }).script, a = Rt.encode({
        timelock: s,
        pubkeys: [o]
      }).script;
      super([c, a]), this.options = r, this.forfeitScript = O.encode(c), this.exitScript = O.encode(a);
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
})(Yr || (Yr = {}));
var mn;
(function(e) {
  e.TxSent = "SENT", e.TxReceived = "RECEIVED";
})(mn || (mn = {}));
function ue(e) {
  return !e.isSpent;
}
function ls(e) {
  return e.virtualStatus.state === "swept" && ue(e);
}
function qu(e) {
  if (e.virtualStatus.state === "swept")
    return !0;
  const t = e.virtualStatus.batchExpiry;
  return !t || new Date(t).getFullYear() < 2025 ? !1 : t <= Date.now();
}
function ju(e, t) {
  return e.value < t;
}
async function* bi(e) {
  const t = [], n = [];
  let r = null, o = null;
  const i = (c) => {
    r ? (r(c), r = null) : t.push(c);
  }, s = () => {
    const c = new Error("EventSource error");
    o ? (o(c), o = null) : n.push(c);
  };
  e.addEventListener("message", i), e.addEventListener("error", s);
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
    e.removeEventListener("message", i), e.removeEventListener("error", s);
  }
}
class Yu extends Error {
  constructor(t, n, r, o) {
    super(n), this.code = t, this.message = n, this.name = r, this.metadata = o;
  }
}
function Ph(e) {
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
      const i = n.message;
      if (!("name" in n))
        continue;
      const s = n.name;
      let c;
      return "metadata" in n && Vh(n.metadata) && (c = n.metadata), new Yu(o, i, s, c);
    }
    return;
  } catch {
    return;
  }
}
function Vh(e) {
  return typeof e == "object" && e !== null && !Array.isArray(e);
}
var ve;
(function(e) {
  function t(r, o, i = []) {
    if (typeof r != "string" && (r = n(r)), o.length == 0)
      throw new Error("intent proof requires at least one input");
    zh(o), Gh(i);
    const s = qh(r, o[0].witnessUtxo.script);
    return jh(s, o, i);
  }
  e.create = t;
  function n(r) {
    switch (r.type) {
      case "register":
        return JSON.stringify({
          type: "register",
          onchain_output_indexes: r.onchain_output_indexes,
          valid_at: r.valid_at,
          expire_at: r.expire_at,
          cosigners_public_keys: r.cosigners_public_keys
        });
      case "delete":
        return JSON.stringify({
          type: "delete",
          expire_at: r.expire_at
        });
      case "get-pending-tx":
        return JSON.stringify({
          type: "get-pending-tx",
          expire_at: r.expire_at
        });
    }
  }
  e.encodeMessage = n;
})(ve || (ve = {}));
const Hh = new Uint8Array([ft.RETURN]), Dh = new Uint8Array(32).fill(0), Kh = 4294967295, Mh = "ark-intent-proof-message";
function Fh(e) {
  if (e.index === void 0)
    throw new Error("intent proof input requires index");
  if (e.txid === void 0)
    throw new Error("intent proof input requires txid");
  if (e.witnessUtxo === void 0)
    throw new Error("intent proof input requires witness utxo");
  return !0;
}
function zh(e) {
  return e.forEach(Fh), !0;
}
function Wh(e) {
  if (e.amount === void 0)
    throw new Error("intent proof output requires amount");
  if (e.script === void 0)
    throw new Error("intent proof output requires script");
  return !0;
}
function Gh(e) {
  return e.forEach(Wh), !0;
}
function qh(e, t) {
  const n = Yh(e), r = new Oe({
    version: 0
  });
  return r.addInput({
    txid: Dh,
    // zero hash
    index: Kh,
    sequence: 0
  }), r.addOutput({
    amount: 0n,
    script: t
  }), r.updateInput(0, {
    finalScriptSig: M.encode(["OP_0", n])
  }), r;
}
function jh(e, t, n) {
  const r = t[0], o = t.map((s) => s.sequence || 0).reduce((s, c) => Math.max(s, c), 0), i = new Oe({
    version: 2,
    lockTime: o
  });
  i.addInput({
    ...r,
    txid: e.id,
    index: 0,
    witnessUtxo: {
      script: r.witnessUtxo.script,
      amount: 0n
    },
    sighashType: We.ALL
  });
  for (const [s, c] of t.entries())
    i.addInput({
      ...c,
      sighashType: We.ALL
    }), c.unknown?.length && i.updateInput(s + 1, {
      unknown: c.unknown
    });
  n.length === 0 && (n = [
    {
      amount: 0n,
      script: Hh
    }
  ]);
  for (const s of n)
    i.addOutput({
      amount: s.amount,
      script: s.script
    });
  return i;
}
function Yh(e) {
  return ss.utils.taggedHash(Mh, new TextEncoder().encode(e));
}
var lt;
(function(e) {
  e.BatchStarted = "batch_started", e.BatchFinalization = "batch_finalization", e.BatchFinalized = "batch_finalized", e.BatchFailed = "batch_failed", e.TreeSigningStarted = "tree_signing_started", e.TreeNonces = "tree_nonces", e.TreeTx = "tree_tx", e.TreeSignature = "tree_signature";
})(lt || (lt = {}));
class Zu {
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
      fees: {
        intentFee: {
          ...r.fees?.intentFee,
          onchainInput: BigInt(
            // split(".")[0] to remove the decimal part
            (r.fees?.intentFee?.onchainInput ?? "0").split(".")[0] ?? 0
          ),
          onchainOutput: BigInt(
            // split(".")[0] to remove the decimal part
            (r.fees?.intentFee?.onchainOutput ?? "0").split(".")[0] ?? 0
          )
        },
        txFeeRate: r?.fees?.txFeeRate ?? ""
      },
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
      const s = await o.text();
      Zt(s, `Failed to submit virtual transaction: ${s}`);
    }
    const i = await o.json();
    return {
      arkTxid: i.arkTxid,
      finalArkTx: i.finalArkTx,
      signedCheckpointTxs: i.signedCheckpointTxs
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
      const i = await o.text();
      Zt(i, `Failed to finalize offchain transaction: ${i}`);
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
          message: ve.encodeMessage(t.message)
        }
      })
    });
    if (!r.ok) {
      const i = await r.text();
      Zt(i, `Failed to register intent: ${i}`);
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
          message: ve.encodeMessage(t.message)
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
    const o = `${this.serverUrl}/v1/batch/tree/submitNonces`, i = await fetch(o, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        batchId: t,
        pubkey: n,
        treeNonces: Zh(r)
      })
    });
    if (!i.ok) {
      const s = await i.text();
      Zt(s, `Failed to submit tree nonces: ${s}`);
    }
  }
  async submitTreeSignatures(t, n, r) {
    const o = `${this.serverUrl}/v1/batch/tree/submitSignatures`, i = await fetch(o, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        batchId: t,
        pubkey: n,
        treeSignatures: Xh(r)
      })
    });
    if (!i.ok) {
      const s = await i.text();
      Zt(s, `Failed to submit tree signatures: ${s}`);
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
      const i = await o.text();
      Zt(i, `Failed to submit forfeit transactions: ${o.statusText}`);
    }
  }
  async *getEventStream(t, n) {
    const r = `${this.serverUrl}/v1/batch/events`, o = n.length > 0 ? `?${n.map((i) => `topics=${encodeURIComponent(i)}`).join("&")}` : "";
    for (; !t?.aborted; )
      try {
        const i = new EventSource(r + o), s = () => {
          i.close();
        };
        t?.addEventListener("abort", s);
        try {
          for await (const c of bi(i)) {
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
          t?.removeEventListener("abort", s), i.close();
        }
      } catch (i) {
        if (i instanceof Error && i.name === "AbortError")
          break;
        if (xi(i)) {
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
        const r = new EventSource(n), o = () => {
          r.close();
        };
        t?.addEventListener("abort", o);
        try {
          for await (const i of bi(r)) {
            if (t?.aborted)
              break;
            try {
              const s = JSON.parse(i.data), c = this.parseTransactionNotification(s);
              c && (yield c);
            } catch (s) {
              throw console.error("Failed to parse transaction notification:", s), s;
            }
          }
        } finally {
          t?.removeEventListener("abort", o), r.close();
        }
      } catch (r) {
        if (r instanceof Error && r.name === "AbortError")
          break;
        if (xi(r)) {
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
          message: ve.encodeMessage(t.message)
        }
      })
    });
    if (!r.ok) {
      const i = await r.text();
      Zt(i, `Failed to get pending transactions: ${i}`);
    }
    return (await r.json()).pendingTxs;
  }
  parseSettlementEvent(t) {
    if (t.batchStarted)
      return {
        type: lt.BatchStarted,
        id: t.batchStarted.id,
        intentIdHashes: t.batchStarted.intentIdHashes,
        batchExpiry: BigInt(t.batchStarted.batchExpiry)
      };
    if (t.batchFinalization)
      return {
        type: lt.BatchFinalization,
        id: t.batchFinalization.id,
        commitmentTx: t.batchFinalization.commitmentTx
      };
    if (t.batchFinalized)
      return {
        type: lt.BatchFinalized,
        id: t.batchFinalized.id,
        commitmentTxid: t.batchFinalized.commitmentTxid
      };
    if (t.batchFailed)
      return {
        type: lt.BatchFailed,
        id: t.batchFailed.id,
        reason: t.batchFailed.reason
      };
    if (t.treeSigningStarted)
      return {
        type: lt.TreeSigningStarted,
        id: t.treeSigningStarted.id,
        cosignersPublicKeys: t.treeSigningStarted.cosignersPubkeys,
        unsignedCommitmentTx: t.treeSigningStarted.unsignedCommitmentTx
      };
    if (t.treeNoncesAggregated)
      return null;
    if (t.treeNonces)
      return {
        type: lt.TreeNonces,
        id: t.treeNonces.id,
        topic: t.treeNonces.topic,
        txid: t.treeNonces.txid,
        nonces: Qh(t.treeNonces.nonces)
        // pubkey -> public nonce
      };
    if (t.treeTx) {
      const n = Object.fromEntries(Object.entries(t.treeTx.children).map(([r, o]) => [parseInt(r), o]));
      return {
        type: lt.TreeTx,
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
      type: lt.TreeSignature,
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
        spentVtxos: t.commitmentTx.spentVtxos.map(ur),
        spendableVtxos: t.commitmentTx.spendableVtxos.map(ur),
        checkpointTxs: t.commitmentTx.checkpointTxs
      }
    } : t.arkTx ? {
      arkTx: {
        txid: t.arkTx.txid,
        tx: t.arkTx.tx,
        spentVtxos: t.arkTx.spentVtxos.map(ur),
        spendableVtxos: t.arkTx.spendableVtxos.map(ur),
        checkpointTxs: t.arkTx.checkpointTxs
      }
    } : (t.heartbeat || console.warn("Unknown transaction notification type:", t), null);
  }
}
function Zh(e) {
  const t = {};
  for (const [n, r] of e)
    t[n] = O.encode(r.pubNonce);
  return t;
}
function Xh(e) {
  const t = {};
  for (const [n, r] of e)
    t[n] = O.encode(r.encode());
  return t;
}
function Qh(e) {
  return new Map(Object.entries(e).map(([t, n]) => {
    if (typeof n != "string")
      throw new Error("invalid nonce");
    return [t, { pubNonce: O.decode(n) }];
  }));
}
function xi(e) {
  const t = (n) => n instanceof Error ? n.name === "TypeError" && n.message === "Failed to fetch" || n.name === "HeadersTimeoutError" || n.name === "BodyTimeoutError" || n.code === "UND_ERR_HEADERS_TIMEOUT" || n.code === "UND_ERR_BODY_TIMEOUT" : !1;
  return t(e) || t(e.cause);
}
function ur(e) {
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
  throw Ph(n) ?? new Error(t);
}
class Er {
  constructor(t, n = /* @__PURE__ */ new Map()) {
    this.root = t, this.children = n;
  }
  static create(t) {
    if (t.length === 0)
      throw new Error("empty chunks");
    const n = /* @__PURE__ */ new Map();
    for (const i of t) {
      const s = tp(i), c = s.tx.id;
      n.set(c, s);
    }
    const r = [];
    for (const [i] of n) {
      let s = !1;
      for (const [c, a] of n)
        if (c !== i && (s = Jh(a, i), s))
          break;
      if (!s) {
        r.push(i);
        continue;
      }
    }
    if (r.length === 0)
      throw new Error("no root chunk found");
    if (r.length > 1)
      throw new Error(`multiple root chunks found: ${r.join(", ")}`);
    const o = Xu(r[0], n);
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
      const i = o.root.getInput(0), s = this.root.id;
      if (!i.txid || O.encode(i.txid) !== s || i.index !== r)
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
function Jh(e, t) {
  return Object.values(e.children).includes(t);
}
function Xu(e, t) {
  const n = t.get(e);
  if (!n)
    return null;
  const r = n.tx, o = /* @__PURE__ */ new Map();
  for (const [i, s] of Object.entries(n.children)) {
    const c = parseInt(i), a = Xu(s, t);
    a && o.set(c, a);
  }
  return new Er(r, o);
}
function tp(e) {
  return { tx: Mt.fromPSBT(wt.decode(e.tx)), children: e.children };
}
var Ei;
(function(e) {
  let t;
  (function(r) {
    r.Start = "start", r.BatchStarted = "batch_started", r.TreeSigningStarted = "tree_signing_started", r.TreeNoncesAggregated = "tree_nonces_aggregated", r.BatchFinalization = "batch_finalization";
  })(t || (t = {}));
  async function n(r, o, i = {}) {
    const { abortController: s, skipVtxoTreeSigning: c = !1, eventCallback: a } = i;
    let u = t.Start;
    const f = [], d = [];
    let h, l;
    for await (const g of r) {
      if (s?.signal.aborted)
        throw new Error("canceled");
      switch (a && a(g).catch(() => {
      }), g.type) {
        case lt.BatchStarted: {
          const w = g, { skip: y } = await o.onBatchStarted(w);
          y || (u = t.BatchStarted, c && (u = t.TreeNoncesAggregated));
          continue;
        }
        case lt.BatchFinalized: {
          if (u !== t.BatchFinalization)
            continue;
          return o.onBatchFinalized && await o.onBatchFinalized(g), g.commitmentTxid;
        }
        case lt.BatchFailed: {
          if (o.onBatchFailed) {
            await o.onBatchFailed(g);
            continue;
          }
          throw new Error(g.reason);
        }
        case lt.TreeTx: {
          if (u !== t.BatchStarted && u !== t.TreeNoncesAggregated)
            continue;
          g.batchIndex === 0 ? f.push(g.chunk) : d.push(g.chunk), o.onTreeTxEvent && await o.onTreeTxEvent(g);
          continue;
        }
        case lt.TreeSignature: {
          if (u !== t.TreeNoncesAggregated)
            continue;
          if (!h)
            throw new Error("vtxo tree not initialized");
          const w = O.decode(g.signature);
          h.update(g.txid, (y) => {
            y.updateInput(0, {
              tapKeySig: w
            });
          }), o.onTreeSignatureEvent && await o.onTreeSignatureEvent(g);
          continue;
        }
        case lt.TreeSigningStarted: {
          if (u !== t.BatchStarted)
            continue;
          h = Er.create(f);
          const { skip: w } = await o.onTreeSigningStarted(g, h);
          w || (u = t.TreeSigningStarted);
          continue;
        }
        case lt.TreeNonces: {
          if (u !== t.TreeSigningStarted)
            continue;
          const { fullySigned: w } = await o.onTreeNonces(g);
          w && (u = t.TreeNoncesAggregated);
          continue;
        }
        case lt.BatchFinalization: {
          if (u !== t.TreeNoncesAggregated)
            continue;
          if (!h && f.length > 0 && (h = Er.create(f)), !h && !c)
            throw new Error("vtxo tree not initialized");
          d.length > 0 && (l = Er.create(d)), await o.onBatchFinalization(g, h, l), u = t.BatchFinalization;
          continue;
        }
        default:
          continue;
      }
    }
    throw new Error("event stream closed");
  }
  e.join = n;
})(Ei || (Ei = {}));
function Qu(e, t, n) {
  const r = [];
  let o = [...t];
  for (const s of [...e, ...t]) {
    if (s.virtualStatus.state !== "preconfirmed" && s.virtualStatus.commitmentTxIds && s.virtualStatus.commitmentTxIds.some((l) => n.has(l)))
      continue;
    const c = ep(o, s);
    o = Sc(o, c);
    const a = fr(c);
    if (s.value <= a)
      continue;
    const u = np(o, s);
    o = Sc(o, u);
    const f = fr(u);
    if (s.value <= f)
      continue;
    const d = {
      commitmentTxid: "",
      boardingTxid: "",
      arkTxid: ""
    };
    let h = s.virtualStatus.state !== "preconfirmed";
    s.virtualStatus.state === "preconfirmed" ? (d.arkTxid = s.txid, s.spentBy && (h = !0)) : d.commitmentTxid = s.virtualStatus.commitmentTxIds?.[0] || "", r.push({
      key: d,
      amount: s.value - a - f,
      type: mn.TxReceived,
      createdAt: s.createdAt.getTime(),
      settled: h
    });
  }
  const i = /* @__PURE__ */ new Map();
  for (const s of t) {
    if (s.settledBy) {
      i.has(s.settledBy) || i.set(s.settledBy, []);
      const a = i.get(s.settledBy);
      i.set(s.settledBy, [...a, s]);
    }
    if (!s.arkTxId)
      continue;
    i.has(s.arkTxId) || i.set(s.arkTxId, []);
    const c = i.get(s.arkTxId);
    i.set(s.arkTxId, [...c, s]);
  }
  for (const [s, c] of i) {
    const a = rp([...e, ...t], s), u = fr(a), f = fr(c);
    if (f <= u)
      continue;
    const d = op(a, c), h = {
      commitmentTxid: "",
      boardingTxid: "",
      arkTxid: ""
    };
    d.virtualStatus.state === "preconfirmed" ? h.arkTxid = u === 0 ? d.arkTxId : d.txid : h.commitmentTxid = d.virtualStatus.commitmentTxIds?.[0] || "", r.push({
      key: h,
      amount: f - u,
      type: mn.TxSent,
      createdAt: d.createdAt.getTime(),
      settled: !0
    });
  }
  return r;
}
function ep(e, t) {
  return t.virtualStatus.state === "preconfirmed" ? [] : e.filter((n) => n.settledBy ? t.virtualStatus.commitmentTxIds?.includes(n.settledBy) ?? !1 : !1);
}
function np(e, t) {
  return e.filter((n) => n.arkTxId ? n.arkTxId === t.txid : !1);
}
function rp(e, t) {
  return e.filter((n) => n.virtualStatus.state !== "preconfirmed" && n.virtualStatus.commitmentTxIds?.includes(t) ? !0 : n.txid === t);
}
function fr(e) {
  return e.reduce((t, n) => t + n.value, 0);
}
function op(e, t) {
  return e.length === 0 ? t[0] : e[0];
}
function Sc(e, t) {
  return e.filter((n) => {
    for (const r of t)
      if (n.txid === r.txid && n.vout === r.vout)
        return !1;
    return !0;
  });
}
const ip = (e) => sp[e], sp = {
  bitcoin: Rn(dn, "ark"),
  testnet: Rn(nr, "tark"),
  signet: Rn(nr, "tark"),
  mutinynet: Rn(nr, "tark"),
  regtest: Rn({
    ...nr,
    bech32: "bcrt",
    pubKeyHash: 111,
    scriptHash: 196
  }, "tark")
};
function Rn(e, t) {
  return {
    ...e,
    hrp: t
  };
}
const cp = {
  bitcoin: "https://mempool.space/api",
  testnet: "https://mempool.space/testnet/api",
  signet: "https://mempool.space/signet/api",
  mutinynet: "https://mutinynet.com/api",
  regtest: "http://localhost:3000"
};
class ap {
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
    const i = await o.json();
    return i.confirmed ? {
      confirmed: i.confirmed,
      blockTime: i.block_time,
      blockHeight: i.block_height
    } : { confirmed: !1 };
  }
  async watchAddresses(t, n) {
    let r = null;
    const o = this.baseUrl.replace(/^http(s)?:/, "ws$1:") + "/v1/ws", i = async () => {
      const a = async () => (await Promise.all(t.map((l) => this.getTransactions(l)))).flat(), u = await a(), f = (h) => `${h.txid}_${h.status.block_time}`, d = new Set(u.map(f));
      r = setInterval(async () => {
        try {
          const l = (await a()).filter((g) => !d.has(f(g)));
          l.length > 0 && (l.forEach((g) => d.add(f(g))), n(l));
        } catch (h) {
          console.error("Error in polling mechanism:", h);
        }
      }, this.pollingInterval);
    };
    let s = null;
    const c = () => {
      s && s.close(), r && clearInterval(r);
    };
    if (this.forcePolling)
      return await i(), c;
    try {
      s = new WebSocket(o), s.addEventListener("open", () => {
        const a = {
          "track-addresses": t
        };
        s.send(JSON.stringify(a));
      }), s.addEventListener("message", (a) => {
        try {
          const u = [], f = JSON.parse(a.data.toString());
          if (!f["multi-address-transactions"])
            return;
          const d = f["multi-address-transactions"];
          for (const h in d)
            for (const l of [
              "mempool",
              "confirmed",
              "removed"
            ])
              d[h][l] && u.push(...d[h][l].filter(fp));
          u.length > 0 && n(u);
        } catch (u) {
          console.error("Failed to process WebSocket message:", u);
        }
      }), s.addEventListener("error", async () => {
        await i();
      });
    } catch {
      r && clearInterval(r), await i();
    }
    return c;
  }
  async getChainTip() {
    const t = await fetch(`${this.baseUrl}/blocks/tip`);
    if (!t.ok)
      throw new Error(`Failed to get chain tip: ${t.statusText}`);
    const n = await t.json();
    if (!up(n))
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
function up(e) {
  return Array.isArray(e) && e.every((t) => {
    t && typeof t == "object" && typeof t.id == "string" && t.id.length > 0 && typeof t.height == "number" && t.height >= 0 && typeof t.mediantime == "number" && t.mediantime > 0;
  });
}
const fp = (e) => typeof e.txid == "string" && Array.isArray(e.vout) && e.vout.every((t) => typeof t.scriptpubkey_address == "string" && typeof t.value == "number") && typeof e.status == "object" && typeof e.status.confirmed == "boolean", dp = 0n, lp = new Uint8Array([81, 2, 78, 115]), hs = {
  script: lp,
  amount: dp
};
O.encode(hs.script);
function hp(e, t, n) {
  const r = new Oe({
    version: 3,
    lockTime: n
  });
  let o = 0n;
  for (const i of e) {
    if (!i.witnessUtxo)
      throw new Error("input needs witness utxo");
    o += i.witnessUtxo.amount, r.addInput(i);
  }
  return r.addOutput({
    script: t,
    amount: o
  }), r.addOutput(hs), r;
}
const pp = new Error("invalid settlement transaction outputs"), gp = new Error("empty tree"), wp = new Error("invalid number of inputs"), Co = new Error("wrong settlement txid"), yp = new Error("invalid amount"), mp = new Error("no leaves"), bp = new Error("invalid taproot script"), Tc = new Error("invalid round transaction outputs"), xp = new Error("wrong commitment txid"), Ep = new Error("missing cosigners public keys"), Po = 0, vc = 1;
function Sp(e, t) {
  if (t.validate(), t.root.inputsLength !== 1)
    throw wp;
  const n = t.root.getInput(0), r = Mt.fromPSBT(wt.decode(e));
  if (r.outputsLength <= vc)
    throw pp;
  const o = r.id;
  if (!n.txid || O.encode(n.txid) !== o || n.index !== vc)
    throw Co;
}
function Tp(e, t, n) {
  if (t.outputsLength < Po + 1)
    throw Tc;
  const r = t.getOutput(Po)?.amount;
  if (!r)
    throw Tc;
  if (!e.root)
    throw gp;
  const o = e.root.getInput(0), i = t.id;
  if (!o.txid || O.encode(o.txid) !== i || o.index !== Po)
    throw xp;
  let s = 0n;
  for (let a = 0; a < e.root.outputsLength; a++) {
    const u = e.root.getOutput(a);
    u?.amount && (s += u.amount);
  }
  if (s !== r)
    throw yp;
  if (e.leaves().length === 0)
    throw mp;
  e.validate();
  for (const a of e.iterator())
    for (const [u, f] of a.children) {
      const d = a.root.getOutput(u);
      if (!d?.script)
        throw new Error(`parent output ${u} not found`);
      const h = d.script.slice(2);
      if (h.length !== 32)
        throw new Error(`parent output ${u} has invalid script`);
      const l = yi(f.root, 0, mi);
      if (l.length === 0)
        throw Ep;
      const g = l.map((y) => y.key), { finalKey: w } = cs(g, !0, {
        taprootTweak: n
      });
      if (!w || O.encode(w.slice(1)) !== O.encode(h))
        throw bp;
    }
}
function vp(e, t, n) {
  let r = !1;
  for (const [s, c] of t.entries()) {
    if (!c.script)
      throw new Error(`missing output script ${s}`);
    if (M.decode(c.script)[0] === "RETURN") {
      if (r)
        throw new Error("multiple OP_RETURN outputs");
      r = !0;
    }
  }
  const o = e.map((s) => Ap(s, n));
  return {
    arkTx: Ju(o.map((s) => s.input), t),
    checkpoints: o.map((s) => s.tx)
  };
}
function Ju(e, t) {
  let n = 0n;
  for (const o of e) {
    const i = Gu(Pn(o.tapLeafScript));
    if (yn.is(i)) {
      if (n !== 0n && Ac(n) !== Ac(i.params.absoluteTimelock))
        throw new Error("cannot mix seconds and blocks locktime");
      i.params.absoluteTimelock > n && (n = i.params.absoluteTimelock);
    }
  }
  const r = new Oe({
    version: 3,
    lockTime: Number(n)
  });
  for (const [o, i] of e.entries())
    r.addInput({
      txid: i.txid,
      index: i.vout,
      sequence: n ? ji - 1 : void 0,
      witnessUtxo: {
        script: Ct.decode(i.tapTree).pkScript,
        amount: BigInt(i.value)
      },
      tapLeafScript: [i.tapLeafScript]
    }), Nh(r, o, Wu, i.tapTree);
  for (const o of t)
    r.addOutput(o);
  return r.addOutput(hs), r;
}
function Ap(e, t) {
  const n = Gu(Pn(e.tapLeafScript)), r = new Ct([
    t.script,
    n.script
  ]), o = Ju([e], [
    {
      amount: BigInt(e.value),
      script: r.pkScript
    }
  ]), i = r.findLeaf(O.encode(n.script)), s = {
    txid: o.id,
    vout: 0,
    value: e.value,
    tapLeafScript: i,
    tapTree: r.encode()
  };
  return {
    tx: o,
    input: s
  };
}
const kp = 500000000n;
function Ac(e) {
  return e >= kp;
}
function Ip(e, t) {
  if (!e.status.block_time)
    return !1;
  if (t.value === 0n)
    return !0;
  if (t.type === "blocks")
    return !1;
  const n = BigInt(Math.floor(Date.now() / 1e3));
  return BigInt(Math.floor(e.status.block_time)) + t.value <= n;
}
const Bp = 4320 * 60 * 1e3, Op = {
  thresholdMs: Bp
  // 3 days
};
class ct {
  constructor(t, n, r = ct.DefaultHRP) {
    this.preimage = t, this.value = n, this.HRP = r, this.vout = 0;
    const o = yt(this.preimage);
    this.vtxoScript = new Ct([$p(o)]);
    const i = this.vtxoScript.leaves[0];
    this.txid = O.encode(new Uint8Array(o).reverse()), this.tapTree = this.vtxoScript.encode(), this.forfeitTapLeafScript = i, this.intentTapLeafScript = i, this.value = n, this.status = { confirmed: !0 }, this.extraWitness = [this.preimage];
  }
  encode() {
    const t = new Uint8Array(ct.Length);
    return t.set(this.preimage, 0), Rp(t, this.value, this.preimage.length), t;
  }
  static decode(t, n = ct.DefaultHRP) {
    if (t.length !== ct.Length)
      throw new Error(`invalid data length: expected ${ct.Length} bytes, got ${t.length}`);
    const r = t.subarray(0, ct.PreimageLength), o = Up(t, ct.PreimageLength);
    return new ct(r, o, n);
  }
  static fromString(t, n = ct.DefaultHRP) {
    if (t = t.trim(), !t.startsWith(n))
      throw new Error(`invalid human-readable part: expected ${n} prefix (note '${t}')`);
    const r = t.slice(n.length), o = Go.decode(r);
    if (o.length === 0)
      throw new Error("failed to decode base58 string");
    return ct.decode(o, n);
  }
  toString() {
    return this.HRP + Go.encode(this.encode());
  }
}
ct.DefaultHRP = "arknote";
ct.PreimageLength = 32;
ct.ValueLength = 4;
ct.Length = ct.PreimageLength + ct.ValueLength;
ct.FakeOutpointIndex = 0;
function Rp(e, t, n) {
  new DataView(e.buffer, e.byteOffset + n, 4).setUint32(0, t, !1);
}
function Up(e, t) {
  return new DataView(e.buffer, e.byteOffset + t, 4).getUint32(0, !1);
}
function $p(e) {
  return M.encode(["SHA256", e, "EQUAL"]);
}
var Si;
(function(e) {
  e[e.INDEXER_TX_TYPE_UNSPECIFIED = 0] = "INDEXER_TX_TYPE_UNSPECIFIED", e[e.INDEXER_TX_TYPE_RECEIVED = 1] = "INDEXER_TX_TYPE_RECEIVED", e[e.INDEXER_TX_TYPE_SENT = 2] = "INDEXER_TX_TYPE_SENT";
})(Si || (Si = {}));
var on;
(function(e) {
  e.UNSPECIFIED = "INDEXER_CHAINED_TX_TYPE_UNSPECIFIED", e.COMMITMENT = "INDEXER_CHAINED_TX_TYPE_COMMITMENT", e.ARK = "INDEXER_CHAINED_TX_TYPE_ARK", e.TREE = "INDEXER_CHAINED_TX_TYPE_TREE", e.CHECKPOINT = "INDEXER_CHAINED_TX_TYPE_CHECKPOINT";
})(on || (on = {}));
class tf {
  constructor(t) {
    this.serverUrl = t;
  }
  async getVtxoTree(t, n) {
    let r = `${this.serverUrl}/v1/indexer/batch/${t.txid}/${t.vout}/tree`;
    const o = new URLSearchParams();
    n && (n.pageIndex !== void 0 && o.append("page.index", n.pageIndex.toString()), n.pageSize !== void 0 && o.append("page.size", n.pageSize.toString())), o.toString() && (r += "?" + o.toString());
    const i = await fetch(r);
    if (!i.ok)
      throw new Error(`Failed to fetch vtxo tree: ${i.statusText}`);
    const s = await i.json();
    if (!Vt.isVtxoTreeResponse(s))
      throw new Error("Invalid vtxo tree data received");
    return s.vtxoTree.forEach((c) => {
      c.children = Object.fromEntries(Object.entries(c.children).map(([a, u]) => [
        Number(a),
        u
      ]));
    }), s;
  }
  async getVtxoTreeLeaves(t, n) {
    let r = `${this.serverUrl}/v1/indexer/batch/${t.txid}/${t.vout}/tree/leaves`;
    const o = new URLSearchParams();
    n && (n.pageIndex !== void 0 && o.append("page.index", n.pageIndex.toString()), n.pageSize !== void 0 && o.append("page.size", n.pageSize.toString())), o.toString() && (r += "?" + o.toString());
    const i = await fetch(r);
    if (!i.ok)
      throw new Error(`Failed to fetch vtxo tree leaves: ${i.statusText}`);
    const s = await i.json();
    if (!Vt.isVtxoTreeLeavesResponse(s))
      throw new Error("Invalid vtxos tree leaves data received");
    return s;
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
    const i = await fetch(r);
    if (!i.ok)
      throw new Error(`Failed to fetch commitment tx connectors: ${i.statusText}`);
    const s = await i.json();
    if (!Vt.isConnectorsResponse(s))
      throw new Error("Invalid commitment tx connectors data received");
    return s.connectors.forEach((c) => {
      c.children = Object.fromEntries(Object.entries(c.children).map(([a, u]) => [
        Number(a),
        u
      ]));
    }), s;
  }
  async getCommitmentTxForfeitTxs(t, n) {
    let r = `${this.serverUrl}/v1/indexer/commitmentTx/${t}/forfeitTxs`;
    const o = new URLSearchParams();
    n && (n.pageIndex !== void 0 && o.append("page.index", n.pageIndex.toString()), n.pageSize !== void 0 && o.append("page.size", n.pageSize.toString())), o.toString() && (r += "?" + o.toString());
    const i = await fetch(r);
    if (!i.ok)
      throw new Error(`Failed to fetch commitment tx forfeitTxs: ${i.statusText}`);
    const s = await i.json();
    if (!Vt.isForfeitTxsResponse(s))
      throw new Error("Invalid commitment tx forfeitTxs data received");
    return s;
  }
  async *getSubscription(t, n) {
    const r = `${this.serverUrl}/v1/indexer/script/subscription/${t}`;
    for (; !n?.aborted; )
      try {
        const o = new EventSource(r), i = () => {
          o.close();
        };
        n?.addEventListener("abort", i);
        try {
          for await (const s of bi(o)) {
            if (n?.aborted)
              break;
            try {
              const c = JSON.parse(s.data);
              c.event && (yield {
                txid: c.event.txid,
                scripts: c.event.scripts || [],
                newVtxos: (c.event.newVtxos || []).map(dr),
                spentVtxos: (c.event.spentVtxos || []).map(dr),
                sweptVtxos: (c.event.sweptVtxos || []).map(dr),
                tx: c.event.tx,
                checkpointTxs: c.event.checkpointTxs
              });
            } catch (c) {
              throw console.error("Failed to parse subscription event:", c), c;
            }
          }
        } finally {
          n?.removeEventListener("abort", i), o.close();
        }
      } catch (o) {
        if (o instanceof Error && o.name === "AbortError")
          break;
        if (xi(o)) {
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
    const i = await fetch(r);
    if (!i.ok)
      throw new Error(`Failed to fetch virtual txs: ${i.statusText}`);
    const s = await i.json();
    if (!Vt.isVirtualTxsResponse(s))
      throw new Error("Invalid virtual txs data received");
    return s;
  }
  async getVtxoChain(t, n) {
    let r = `${this.serverUrl}/v1/indexer/vtxo/${t.txid}/${t.vout}/chain`;
    const o = new URLSearchParams();
    n && (n.pageIndex !== void 0 && o.append("page.index", n.pageIndex.toString()), n.pageSize !== void 0 && o.append("page.size", n.pageSize.toString())), o.toString() && (r += "?" + o.toString());
    const i = await fetch(r);
    if (!i.ok)
      throw new Error(`Failed to fetch vtxo chain: ${i.statusText}`);
    const s = await i.json();
    if (!Vt.isVtxoChainResponse(s))
      throw new Error("Invalid vtxo chain data received");
    return s;
  }
  async getVtxos(t) {
    if (t?.scripts && t?.outpoints)
      throw new Error("scripts and outpoints are mutually exclusive options");
    if (!t?.scripts && !t?.outpoints)
      throw new Error("Either scripts or outpoints must be provided");
    let n = `${this.serverUrl}/v1/indexer/vtxos`;
    const r = new URLSearchParams();
    t?.scripts && t.scripts.length > 0 && t.scripts.forEach((s) => {
      r.append("scripts", s);
    }), t?.outpoints && t.outpoints.length > 0 && t.outpoints.forEach((s) => {
      r.append("outpoints", `${s.txid}:${s.vout}`);
    }), t && (t.spendableOnly !== void 0 && r.append("spendableOnly", t.spendableOnly.toString()), t.spentOnly !== void 0 && r.append("spentOnly", t.spentOnly.toString()), t.recoverableOnly !== void 0 && r.append("recoverableOnly", t.recoverableOnly.toString()), t.pageIndex !== void 0 && r.append("page.index", t.pageIndex.toString()), t.pageSize !== void 0 && r.append("page.size", t.pageSize.toString())), r.toString() && (n += "?" + r.toString());
    const o = await fetch(n);
    if (!o.ok)
      throw new Error(`Failed to fetch vtxos: ${o.statusText}`);
    const i = await o.json();
    if (!Vt.isVtxosResponse(i))
      throw new Error("Invalid vtxos data received");
    return {
      vtxos: i.vtxos.map(dr),
      page: i.page
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
      const s = await o.text();
      throw new Error(`Failed to subscribe to scripts: ${s}`);
    }
    const i = await o.json();
    if (!i.subscriptionId)
      throw new Error("Subscription ID not found");
    return i.subscriptionId;
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
      const i = await o.text();
      console.warn(`Failed to unsubscribe to scripts: ${i}`);
    }
  }
}
function dr(e) {
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
  function t(E) {
    return typeof E == "object" && typeof E.totalOutputAmount == "string" && typeof E.totalOutputVtxos == "number" && typeof E.expiresAt == "string" && typeof E.swept == "boolean";
  }
  function n(E) {
    return typeof E == "object" && typeof E.txid == "string" && typeof E.expiresAt == "string" && Object.values(on).includes(E.type) && Array.isArray(E.spends) && E.spends.every((nt) => typeof nt == "string");
  }
  function r(E) {
    return typeof E == "object" && typeof E.startedAt == "string" && typeof E.endedAt == "string" && typeof E.totalInputAmount == "string" && typeof E.totalInputVtxos == "number" && typeof E.totalOutputAmount == "string" && typeof E.totalOutputVtxos == "number" && typeof E.batches == "object" && Object.values(E.batches).every(t);
  }
  e.isCommitmentTx = r;
  function o(E) {
    return typeof E == "object" && typeof E.txid == "string" && typeof E.vout == "number";
  }
  e.isOutpoint = o;
  function i(E) {
    return Array.isArray(E) && E.every(o);
  }
  e.isOutpointArray = i;
  function s(E) {
    return typeof E == "object" && typeof E.txid == "string" && typeof E.children == "object" && Object.values(E.children).every(f) && Object.keys(E.children).every((nt) => Number.isInteger(Number(nt)));
  }
  function c(E) {
    return Array.isArray(E) && E.every(s);
  }
  e.isTxsArray = c;
  function a(E) {
    return typeof E == "object" && typeof E.amount == "string" && typeof E.createdAt == "string" && typeof E.isSettled == "boolean" && typeof E.settledBy == "string" && Object.values(Si).includes(E.type) && (!E.commitmentTxid && typeof E.virtualTxid == "string" || typeof E.commitmentTxid == "string" && !E.virtualTxid);
  }
  function u(E) {
    return Array.isArray(E) && E.every(a);
  }
  e.isTxHistoryRecordArray = u;
  function f(E) {
    return typeof E == "string" && E.length === 64;
  }
  function d(E) {
    return Array.isArray(E) && E.every(f);
  }
  e.isTxidArray = d;
  function h(E) {
    return typeof E == "object" && o(E.outpoint) && typeof E.createdAt == "string" && (E.expiresAt === null || typeof E.expiresAt == "string") && typeof E.amount == "string" && typeof E.script == "string" && typeof E.isPreconfirmed == "boolean" && typeof E.isSwept == "boolean" && typeof E.isUnrolled == "boolean" && typeof E.isSpent == "boolean" && (!E.spentBy || typeof E.spentBy == "string") && (!E.settledBy || typeof E.settledBy == "string") && (!E.arkTxid || typeof E.arkTxid == "string") && Array.isArray(E.commitmentTxids) && E.commitmentTxids.every(f);
  }
  function l(E) {
    return typeof E == "object" && typeof E.current == "number" && typeof E.next == "number" && typeof E.total == "number";
  }
  function g(E) {
    return typeof E == "object" && Array.isArray(E.vtxoTree) && E.vtxoTree.every(s) && (!E.page || l(E.page));
  }
  e.isVtxoTreeResponse = g;
  function w(E) {
    return typeof E == "object" && Array.isArray(E.leaves) && E.leaves.every(o) && (!E.page || l(E.page));
  }
  e.isVtxoTreeLeavesResponse = w;
  function y(E) {
    return typeof E == "object" && Array.isArray(E.connectors) && E.connectors.every(s) && (!E.page || l(E.page));
  }
  e.isConnectorsResponse = y;
  function S(E) {
    return typeof E == "object" && Array.isArray(E.txids) && E.txids.every(f) && (!E.page || l(E.page));
  }
  e.isForfeitTxsResponse = S;
  function v(E) {
    return typeof E == "object" && Array.isArray(E.sweptBy) && E.sweptBy.every(f);
  }
  e.isSweptCommitmentTxResponse = v;
  function R(E) {
    return typeof E == "object" && Array.isArray(E.sweptBy) && E.sweptBy.every(f);
  }
  e.isBatchSweepTransactionsResponse = R;
  function $(E) {
    return typeof E == "object" && Array.isArray(E.txs) && E.txs.every((nt) => typeof nt == "string") && (!E.page || l(E.page));
  }
  e.isVirtualTxsResponse = $;
  function L(E) {
    return typeof E == "object" && Array.isArray(E.chain) && E.chain.every(n) && (!E.page || l(E.page));
  }
  e.isVtxoChainResponse = L;
  function j(E) {
    return typeof E == "object" && Array.isArray(E.vtxos) && E.vtxos.every(h) && (!E.page || l(E.page));
  }
  e.isVtxosResponse = j;
})(Vt || (Vt = {}));
class Np {
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
const lr = (e) => `vtxos:${e}`, hr = (e) => `utxos:${e}`, Vo = (e) => `tx:${e}`, kc = "wallet:state", Zr = (e) => e ? O.encode(e) : void 0, bn = (e) => e ? O.decode(e) : void 0, Xr = ([e, t]) => ({
  cb: O.encode(Xt.encode(e)),
  s: O.encode(t)
}), Ic = (e) => ({
  ...e,
  tapTree: Zr(e.tapTree),
  forfeitTapLeafScript: Xr(e.forfeitTapLeafScript),
  intentTapLeafScript: Xr(e.intentTapLeafScript),
  extraWitness: e.extraWitness?.map(Zr)
}), Bc = (e) => ({
  ...e,
  tapTree: Zr(e.tapTree),
  forfeitTapLeafScript: Xr(e.forfeitTapLeafScript),
  intentTapLeafScript: Xr(e.intentTapLeafScript),
  extraWitness: e.extraWitness?.map(Zr)
}), Qr = (e) => {
  const t = Xt.decode(bn(e.cb)), n = bn(e.s);
  return [t, n];
}, Lp = (e) => ({
  ...e,
  createdAt: new Date(e.createdAt),
  tapTree: bn(e.tapTree),
  forfeitTapLeafScript: Qr(e.forfeitTapLeafScript),
  intentTapLeafScript: Qr(e.intentTapLeafScript),
  extraWitness: e.extraWitness?.map(bn)
}), _p = (e) => ({
  ...e,
  tapTree: bn(e.tapTree),
  forfeitTapLeafScript: Qr(e.forfeitTapLeafScript),
  intentTapLeafScript: Qr(e.intentTapLeafScript),
  extraWitness: e.extraWitness?.map(bn)
});
class Ti {
  constructor(t) {
    this.storage = t;
  }
  async getVtxos(t) {
    const n = await this.storage.getItem(lr(t));
    if (!n)
      return [];
    try {
      return JSON.parse(n).map(Lp);
    } catch (r) {
      return console.error(`Failed to parse VTXOs for address ${t}:`, r), [];
    }
  }
  async saveVtxos(t, n) {
    const r = await this.getVtxos(t);
    for (const o of n) {
      const i = r.findIndex((s) => s.txid === o.txid && s.vout === o.vout);
      i !== -1 ? r[i] = o : r.push(o);
    }
    await this.storage.setItem(lr(t), JSON.stringify(r.map(Ic)));
  }
  async removeVtxo(t, n) {
    const r = await this.getVtxos(t), [o, i] = n.split(":"), s = r.filter((c) => !(c.txid === o && c.vout === parseInt(i, 10)));
    await this.storage.setItem(lr(t), JSON.stringify(s.map(Ic)));
  }
  async clearVtxos(t) {
    await this.storage.removeItem(lr(t));
  }
  async getUtxos(t) {
    const n = await this.storage.getItem(hr(t));
    if (!n)
      return [];
    try {
      return JSON.parse(n).map(_p);
    } catch (r) {
      return console.error(`Failed to parse UTXOs for address ${t}:`, r), [];
    }
  }
  async saveUtxos(t, n) {
    const r = await this.getUtxos(t);
    n.forEach((o) => {
      const i = r.findIndex((s) => s.txid === o.txid && s.vout === o.vout);
      i !== -1 ? r[i] = o : r.push(o);
    }), await this.storage.setItem(hr(t), JSON.stringify(r.map(Bc)));
  }
  async removeUtxo(t, n) {
    const r = await this.getUtxos(t), [o, i] = n.split(":"), s = r.filter((c) => !(c.txid === o && c.vout === parseInt(i, 10)));
    await this.storage.setItem(hr(t), JSON.stringify(s.map(Bc)));
  }
  async clearUtxos(t) {
    await this.storage.removeItem(hr(t));
  }
  async getTransactionHistory(t) {
    const n = Vo(t), r = await this.storage.getItem(n);
    if (!r)
      return [];
    try {
      return JSON.parse(r);
    } catch (o) {
      return console.error(`Failed to parse transactions for address ${t}:`, o), [];
    }
  }
  async saveTransactions(t, n) {
    const r = await this.getTransactionHistory(t);
    for (const o of n) {
      const i = r.findIndex((s) => s.key === o.key);
      i !== -1 ? r[i] = o : r.push(o);
    }
    await this.storage.setItem(Vo(t), JSON.stringify(r));
  }
  async clearTransactions(t) {
    await this.storage.removeItem(Vo(t));
  }
  async getWalletState() {
    const t = await this.storage.getItem(kc);
    if (!t)
      return null;
    try {
      return JSON.parse(t);
    } catch (n) {
      return console.error("Failed to parse wallet state:", n), null;
    }
  }
  async saveWalletState(t) {
    await this.storage.setItem(kc, JSON.stringify(t));
  }
}
const Ho = (e, t) => `contract:${e}:${t}`, Do = (e) => `collection:${e}`;
class Cp {
  constructor(t) {
    this.storage = t;
  }
  async getContractData(t, n) {
    const r = await this.storage.getItem(Ho(t, n));
    if (!r)
      return null;
    try {
      return JSON.parse(r);
    } catch (o) {
      return console.error(`Failed to parse contract data for ${t}:${n}:`, o), null;
    }
  }
  async setContractData(t, n, r) {
    try {
      await this.storage.setItem(Ho(t, n), JSON.stringify(r));
    } catch (o) {
      throw console.error(`Failed to persist contract data for ${t}:${n}:`, o), o;
    }
  }
  async deleteContractData(t, n) {
    try {
      await this.storage.removeItem(Ho(t, n));
    } catch (r) {
      throw console.error(`Failed to remove contract data for ${t}:${n}:`, r), r;
    }
  }
  async getContractCollection(t) {
    const n = await this.storage.getItem(Do(t));
    if (!n)
      return [];
    try {
      return JSON.parse(n);
    } catch (r) {
      return console.error(`Failed to parse contract collection ${t}:`, r), [];
    }
  }
  async saveToContractCollection(t, n, r) {
    const o = await this.getContractCollection(t), i = n[r];
    if (i == null)
      throw new Error(`Item is missing required field '${String(r)}'`);
    const s = o.findIndex((a) => a[r] === i);
    let c;
    s !== -1 ? c = [
      ...o.slice(0, s),
      n,
      ...o.slice(s + 1)
    ] : c = [...o, n];
    try {
      await this.storage.setItem(Do(t), JSON.stringify(c));
    } catch (a) {
      throw console.error(`Failed to persist contract collection ${t}:`, a), a;
    }
  }
  async removeFromContractCollection(t, n, r) {
    if (n == null)
      throw new Error(`Invalid id provided for removal: ${String(n)}`);
    const i = (await this.getContractCollection(t)).filter((s) => s[r] !== n);
    try {
      await this.storage.setItem(Do(t), JSON.stringify(i));
    } catch (s) {
      throw console.error(`Failed to persist contract collection removal for ${t}:`, s), s;
    }
  }
  async clearContractData() {
    await this.storage.clear();
  }
}
function Ae(e, t) {
  return {
    ...t,
    forfeitTapLeafScript: e.offchainTapscript.forfeit(),
    intentTapLeafScript: e.offchainTapscript.forfeit(),
    tapTree: e.offchainTapscript.encode()
  };
}
function vi(e, t) {
  return {
    ...t,
    forfeitTapLeafScript: e.boardingTapscript.forfeit(),
    intentTapLeafScript: e.boardingTapscript.forfeit(),
    tapTree: e.boardingTapscript.encode()
  };
}
function Pp(e) {
  return typeof e == "object" && e !== null && "toReadonly" in e && typeof e.toReadonly == "function";
}
class Fe {
  constructor(t, n, r, o, i, s, c, a, u, f) {
    this.identity = t, this.network = n, this.onchainProvider = r, this.indexerProvider = o, this.arkServerPublicKey = i, this.offchainTapscript = s, this.boardingTapscript = c, this.dustAmount = a, this.walletRepository = u, this.contractRepository = f;
  }
  /**
   * Protected helper to set up shared wallet configuration.
   * Extracts common logic used by both ReadonlyWallet.create() and Wallet.create().
   */
  static async setupWalletConfig(t, n) {
    const r = t.arkProvider || (() => {
      if (!t.arkServerUrl)
        throw new Error("Either arkProvider or arkServerUrl must be provided");
      return new Zu(t.arkServerUrl);
    })(), o = t.arkServerUrl || r.serverUrl;
    if (!o)
      throw new Error("Could not determine arkServerUrl from provider");
    const i = t.indexerUrl || o, s = t.indexerProvider || new tf(i), c = await r.getInfo(), a = ip(c.network), u = t.esploraUrl || cp[c.network], f = t.onchainProvider || new ap(u);
    if (t.exitTimelock) {
      const { value: $, type: L } = t.exitTimelock;
      if ($ < 512n && L !== "blocks" || $ >= 512n && L !== "seconds")
        throw new Error("invalid exitTimelock");
    }
    const d = t.exitTimelock ?? {
      value: c.unilateralExitDelay,
      type: c.unilateralExitDelay < 512n ? "blocks" : "seconds"
    };
    if (t.boardingTimelock) {
      const { value: $, type: L } = t.boardingTimelock;
      if ($ < 512n && L !== "blocks" || $ >= 512n && L !== "seconds")
        throw new Error("invalid boardingTimelock");
    }
    const h = t.boardingTimelock ?? {
      value: c.boardingExitDelay,
      type: c.boardingExitDelay < 512n ? "blocks" : "seconds"
    }, l = O.decode(c.signerPubkey).slice(1), g = new Yr.Script({
      pubKey: n,
      serverPubKey: l,
      csvTimelock: d
    }), w = new Yr.Script({
      pubKey: n,
      serverPubKey: l,
      csvTimelock: h
    }), y = g, S = t.storage || new Np(), v = new Ti(S), R = new Cp(S);
    return {
      arkProvider: r,
      indexerProvider: s,
      onchainProvider: f,
      network: a,
      networkName: c.network,
      serverPubKey: l,
      offchainTapscript: y,
      boardingTapscript: w,
      dustAmount: c.dust,
      walletRepository: v,
      contractRepository: R,
      info: c
    };
  }
  static async create(t) {
    const n = await t.identity.xOnlyPublicKey();
    if (!n)
      throw new Error("Invalid configured public key");
    const r = await Fe.setupWalletConfig(t, n);
    return new Fe(t.identity, r.network, r.onchainProvider, r.indexerProvider, r.serverPubKey, r.offchainTapscript, r.boardingTapscript, r.dustAmount, r.walletRepository, r.contractRepository);
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
    let i = 0, s = 0, c = 0;
    i = n.filter((f) => f.virtualStatus.state === "settled").reduce((f, d) => f + d.value, 0), s = n.filter((f) => f.virtualStatus.state === "preconfirmed").reduce((f, d) => f + d.value, 0), c = n.filter((f) => ue(f) && f.virtualStatus.state === "swept").reduce((f, d) => f + d.value, 0);
    const a = r + o, u = i + s + c;
    return {
      boarding: {
        confirmed: r,
        unconfirmed: o,
        total: a
      },
      settled: i,
      preconfirmed: s,
      available: i + s,
      recoverable: c,
      total: a + u
    };
  }
  async getVtxos(t) {
    const n = await this.getAddress(), o = (await this.getVirtualCoins(t)).map((i) => Ae(this, i));
    return await this.walletRepository.saveVtxos(n, o), o;
  }
  async getVirtualCoins(t = { withRecoverable: !0, withUnrolled: !1 }) {
    const n = [O.encode(this.offchainTapscript.pkScript)], o = (await this.indexerProvider.getVtxos({ scripts: n })).vtxos;
    let i = o.filter(ue);
    if (t.withRecoverable || (i = i.filter((s) => !ls(s) && !qu(s))), t.withUnrolled) {
      const s = o.filter((c) => !ue(c));
      i.push(...s.filter((c) => c.isUnrolled));
    }
    return i;
  }
  async getTransactionHistory() {
    const t = await this.indexerProvider.getVtxos({
      scripts: [O.encode(this.offchainTapscript.pkScript)]
    }), { boardingTxs: n, commitmentsToIgnore: r } = await this.getBoardingTxs(), o = [], i = [];
    for (const a of t.vtxos)
      ue(a) ? o.push(a) : i.push(a);
    const s = Qu(o, i, r), c = [...n, ...s];
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
          const d = (await this.onchainProvider.getTxOutspends(c.txid))[a];
          d?.spent && n.add(d.txid), t.push({
            txid: c.txid,
            vout: a,
            value: Number(u.value),
            status: {
              confirmed: c.status.confirmed,
              block_time: c.status.block_time
            },
            isUnrolled: !0,
            virtualStatus: {
              state: d?.spent ? "spent" : "settled",
              commitmentTxIds: d?.spent ? [d.txid] : void 0
            },
            createdAt: c.status.confirmed ? new Date(c.status.block_time * 1e3) : /* @__PURE__ */ new Date(0)
          });
        }
      }
    const i = [], s = [];
    for (const c of t) {
      const a = {
        key: {
          boardingTxid: c.txid,
          commitmentTxid: "",
          arkTxid: ""
        },
        amount: c.value,
        type: mn.TxReceived,
        settled: c.virtualStatus.state === "spent",
        createdAt: c.status.block_time ? new Date(c.status.block_time * 1e3).getTime() : 0
      };
      c.status.block_time ? s.push(a) : i.push(a);
    }
    return {
      boardingTxs: [...i, ...s],
      commitmentsToIgnore: n
    };
  }
  async getBoardingUtxos() {
    const t = await this.getBoardingAddress(), r = (await this.onchainProvider.getCoins(t)).map((o) => vi(this, o));
    return await this.walletRepository.saveUtxos(t, r), r;
  }
  async notifyIncomingFunds(t) {
    const n = await this.getAddress(), r = await this.getBoardingAddress();
    let o, i;
    if (this.onchainProvider && r) {
      const c = (a) => a.vout.findIndex((u) => u.scriptpubkey_address === r);
      o = await this.onchainProvider.watchAddresses([r], (a) => {
        const u = a.filter((f) => c(f) !== -1).map((f) => {
          const { txid: d, status: h } = f, l = c(f), g = Number(f.vout[l].value);
          return { txid: d, vout: l, value: g, status: h };
        });
        t({
          type: "utxo",
          coins: u
        });
      });
    }
    if (this.indexerProvider && n) {
      const c = this.offchainTapscript, a = await this.indexerProvider.subscribeForScripts([
        O.encode(c.pkScript)
      ]), u = new AbortController(), f = this.indexerProvider.getSubscription(a, u.signal);
      i = async () => {
        u.abort(), await this.indexerProvider?.unsubscribeForScripts(a);
      }, (async () => {
        try {
          for await (const d of f)
            (d.newVtxos?.length > 0 || d.spentVtxos?.length > 0) && t({
              type: "vtxo",
              newVtxos: d.newVtxos.map((h) => Ae(this, h)),
              spentVtxos: d.spentVtxos.map((h) => Ae(this, h))
            });
        } catch (d) {
          console.error("Subscription error:", d);
        }
      })();
    }
    return () => {
      o?.(), i?.();
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
class xn extends Fe {
  constructor(t, n, r, o, i, s, c, a, u, f, d, h, l, g, w, y) {
    super(t, n, o, s, c, a, u, l, g, w), this.networkName = r, this.arkProvider = i, this.serverUnrollScript = f, this.forfeitOutputScript = d, this.forfeitPubkey = h, this.identity = t, this.renewalConfig = {
      enabled: y?.enabled ?? !1,
      ...Op,
      ...y
    };
  }
  static async create(t) {
    const n = await t.identity.xOnlyPublicKey();
    if (!n)
      throw new Error("Invalid configured public key");
    const r = await Fe.setupWalletConfig(t, n);
    let o;
    try {
      const a = O.decode(r.info.checkpointTapscript);
      o = Rt.decode(a);
    } catch {
      throw new Error("Invalid checkpointTapscript from server");
    }
    const i = O.decode(r.info.forfeitPubkey).slice(1), s = ze(r.network).decode(r.info.forfeitAddress), c = at.encode(s);
    return new xn(t.identity, r.network, r.networkName, r.onchainProvider, r.arkProvider, r.indexerProvider, r.serverPubKey, r.offchainTapscript, r.boardingTapscript, o, c, i, r.dustAmount, r.walletRepository, r.contractRepository, t.renewalConfig);
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
    const t = Pp(this.identity) ? await this.identity.toReadonly() : this.identity;
    return new Fe(t, this.network, this.onchainProvider, this.indexerProvider, this.arkServerPublicKey, this.offchainTapscript, this.boardingTapscript, this.dustAmount, this.walletRepository, this.contractRepository);
  }
  async sendBitcoin(t) {
    if (t.amount <= 0)
      throw new Error("Amount must be positive");
    if (!Hp(t.address))
      throw new Error("Invalid Ark address " + t.address);
    const n = await this.getVirtualCoins({
      withRecoverable: !1
    });
    let r;
    if (t.selectedVtxos) {
      const g = t.selectedVtxos.map((y) => y.value).reduce((y, S) => y + S, 0);
      if (g < t.amount)
        throw new Error("Selected VTXOs do not cover specified amount");
      const w = g - t.amount;
      r = {
        inputs: t.selectedVtxos,
        changeAmount: BigInt(w)
      };
    } else
      r = Dp(n, t.amount);
    const o = this.offchainTapscript.forfeit();
    if (!o)
      throw new Error("Selected leaf not found");
    const i = wn.decode(t.address), c = [
      {
        script: BigInt(t.amount) < this.dustAmount ? i.subdustPkScript : i.pkScript,
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
    const a = this.offchainTapscript.encode(), u = vp(r.inputs.map((g) => ({
      ...g,
      tapLeafScript: o,
      tapTree: a
    })), c, this.serverUnrollScript), f = await this.identity.sign(u.arkTx), { arkTxid: d, signedCheckpointTxs: h } = await this.arkProvider.submitTx(wt.encode(f.toPSBT()), u.checkpoints.map((g) => wt.encode(g.toPSBT()))), l = await Promise.all(h.map(async (g) => {
      const w = Mt.fromPSBT(wt.decode(g)), y = await this.identity.sign(w);
      return wt.encode(y.toPSBT());
    }));
    await this.arkProvider.finalizeTx(d, l);
    try {
      const g = [], w = /* @__PURE__ */ new Set();
      let y = Number.MAX_SAFE_INTEGER;
      for (const [R, $] of r.inputs.entries()) {
        const L = Ae(this, $), j = h[R], E = Mt.fromPSBT(wt.decode(j));
        if (g.push({
          ...L,
          virtualStatus: { ...L.virtualStatus, state: "spent" },
          spentBy: E.id,
          arkTxId: d,
          isSpent: !0
        }), L.virtualStatus.commitmentTxIds)
          for (const nt of L.virtualStatus.commitmentTxIds)
            w.add(nt);
        L.virtualStatus.batchExpiry && (y = Math.min(y, L.virtualStatus.batchExpiry));
      }
      const S = Date.now(), v = this.arkAddress.encode();
      if (r.changeAmount > 0n && y !== Number.MAX_SAFE_INTEGER) {
        const R = {
          txid: d,
          vout: c.length - 1,
          createdAt: new Date(S),
          forfeitTapLeafScript: this.offchainTapscript.forfeit(),
          intentTapLeafScript: this.offchainTapscript.forfeit(),
          isUnrolled: !1,
          isSpent: !1,
          tapTree: this.offchainTapscript.encode(),
          value: Number(r.changeAmount),
          virtualStatus: {
            state: "preconfirmed",
            commitmentTxIds: Array.from(w),
            batchExpiry: y
          },
          status: {
            confirmed: !1
          }
        };
        await this.walletRepository.saveVtxos(v, [R]);
      }
      await this.walletRepository.saveVtxos(v, g), await this.walletRepository.saveTransactions(v, [
        {
          key: {
            boardingTxid: "",
            commitmentTxid: "",
            arkTxid: d
          },
          amount: t.amount,
          type: mn.TxSent,
          settled: !1,
          createdAt: Date.now()
        }
      ]);
    } catch (g) {
      console.warn("error saving offchain tx to repository", g);
    } finally {
      return d;
    }
  }
  async settle(t, n) {
    if (t?.inputs) {
      for (const g of t.inputs)
        if (typeof g == "string")
          try {
            ct.fromString(g);
          } catch {
            throw new Error(`Invalid arknote "${g}"`);
          }
    }
    if (!t) {
      let g = 0;
      const y = Rt.decode(O.decode(this.boardingTapscript.exitScript)).params.timelock, S = (await this.getBoardingUtxos()).filter(($) => !Ip($, y));
      g += S.reduce(($, L) => $ + L.value, 0);
      const v = await this.getVtxos({ withRecoverable: !0 });
      g += v.reduce(($, L) => $ + L.value, 0);
      const R = [...S, ...v];
      if (R.length === 0)
        throw new Error("No inputs found");
      t = {
        inputs: R,
        outputs: [
          {
            address: await this.getAddress(),
            amount: BigInt(g)
          }
        ]
      };
    }
    const r = [], o = [];
    let i = !1;
    for (const [g, w] of t.outputs.entries()) {
      let y;
      try {
        y = wn.decode(w.address).pkScript, i = !0;
      } catch {
        const S = ze(this.network).decode(w.address);
        y = at.encode(S), r.push(g);
      }
      o.push({
        amount: w.amount,
        script: y
      });
    }
    let s;
    const c = [];
    i && (s = this.identity.signerSession(), c.push(O.encode(await s.getPublicKey())));
    const [a, u] = await Promise.all([
      this.makeRegisterIntentSignature(t.inputs, o, r, c),
      this.makeDeleteIntentSignature(t.inputs)
    ]), f = await this.safeRegisterIntent(a), d = [
      ...c,
      ...t.inputs.map((g) => `${g.txid}:${g.vout}`)
    ], h = this.createBatchHandler(f, t.inputs, s), l = new AbortController();
    try {
      const g = this.arkProvider.getEventStream(l.signal, d);
      return await Ei.join(g, h, {
        abortController: l,
        skipVtxoTreeSigning: !i,
        eventCallback: n ? (w) => Promise.resolve(n(w)) : void 0
      });
    } catch (g) {
      throw await this.arkProvider.deleteIntent(u).catch(() => {
      }), g;
    } finally {
      l.abort();
    }
  }
  async handleSettlementFinalizationEvent(t, n, r, o) {
    const i = [], s = await this.getVirtualCoins();
    let c = Mt.fromPSBT(wt.decode(t.commitmentTx)), a = !1, u = 0;
    const f = o?.leaves() || [];
    for (const d of n) {
      const h = s.find((R) => R.txid === d.txid && R.vout === d.vout);
      if (!h) {
        for (let R = 0; R < c.inputsLength; R++) {
          const $ = c.getInput(R);
          if (!$.txid || $.index === void 0)
            throw new Error("The server returned incomplete data. No settlement input found in the PSBT");
          if (O.encode($.txid) === d.txid && $.index === d.vout) {
            c.updateInput(R, {
              tapLeafScript: [d.forfeitTapLeafScript]
            }), c = await this.identity.sign(c, [
              R
            ]), a = !0;
            break;
          }
        }
        continue;
      }
      if (ls(h) || ju(h, this.dustAmount))
        continue;
      if (f.length === 0)
        throw new Error("connectors not received");
      if (u >= f.length)
        throw new Error("not enough connectors received");
      const l = f[u], g = l.id, w = l.getOutput(0);
      if (!w)
        throw new Error("connector output not found");
      const y = w.amount, S = w.script;
      if (!y || !S)
        throw new Error("invalid connector output");
      u++;
      let v = hp([
        {
          txid: d.txid,
          index: d.vout,
          witnessUtxo: {
            amount: BigInt(h.value),
            script: Ct.decode(d.tapTree).pkScript
          },
          sighashType: We.DEFAULT,
          tapLeafScript: [d.forfeitTapLeafScript]
        },
        {
          txid: g,
          index: 0,
          witnessUtxo: {
            amount: y,
            script: S
          }
        }
      ], r);
      v = await this.identity.sign(v, [0]), i.push(wt.encode(v.toPSBT()));
    }
    (i.length > 0 || a) && await this.arkProvider.submitSignedForfeitTxs(i, a ? wt.encode(c.toPSBT()) : void 0);
  }
  /**
   * @implements Batch.Handler interface.
   * @param intentId - The intent ID.
   * @param inputs - The inputs of the intent.
   * @param session - The musig2 signing session, if not provided, the signing will be skipped.
   */
  createBatchHandler(t, n, r) {
    let o;
    return {
      onBatchStarted: async (i) => {
        const s = new TextEncoder().encode(t), c = yt(s), a = O.encode(c);
        let u = !0;
        for (const d of i.intentIdHashes)
          if (d === a) {
            if (!this.arkProvider)
              throw new Error("Ark provider not configured");
            await this.arkProvider.confirmRegistration(t), u = !1;
          }
        if (u)
          return { skip: u };
        const f = Rt.encode({
          timelock: {
            value: i.batchExpiry,
            type: i.batchExpiry >= 512n ? "seconds" : "blocks"
          },
          pubkeys: [this.forfeitPubkey]
        }).script;
        return o = Nn(f), { skip: !1 };
      },
      onTreeSigningStarted: async (i, s) => {
        if (!r)
          return { skip: !0 };
        if (!o)
          throw new Error("Sweep tap tree root not set");
        const c = i.cosignersPublicKeys.map((g) => g.slice(2)), u = (await r.getPublicKey()).subarray(1);
        if (!c.includes(O.encode(u)))
          return { skip: !0 };
        const f = Mt.fromPSBT(wt.decode(i.unsignedCommitmentTx));
        Tp(s, f, o);
        const d = f.getOutput(0);
        if (!d?.amount)
          throw new Error("Shared output not found");
        await r.init(s, o, d.amount);
        const h = O.encode(await r.getPublicKey()), l = await r.getNonces();
        return await this.arkProvider.submitTreeNonces(i.id, h, l), { skip: !1 };
      },
      onTreeNonces: async (i) => {
        if (!r)
          return { fullySigned: !0 };
        const { hasAllNonces: s } = await r.aggregatedNonces(i.txid, i.nonces);
        if (!s)
          return { fullySigned: !1 };
        const c = await r.sign(), a = O.encode(await r.getPublicKey());
        return await this.arkProvider.submitTreeSignatures(i.id, a, c), { fullySigned: !0 };
      },
      onBatchFinalization: async (i, s, c) => {
        if (!this.forfeitOutputScript)
          throw new Error("Forfeit output script not set");
        c && Sp(i.commitmentTx, c), await this.handleSettlementFinalizationEvent(i, n, this.forfeitOutputScript, c);
      }
    };
  }
  async safeRegisterIntent(t) {
    try {
      return await this.arkProvider.registerIntent(t);
    } catch (n) {
      if (n instanceof Yu && n.code === 0 && n.message.includes("duplicated input")) {
        const r = await this.getVtxos({
          withRecoverable: !0
        }), o = await this.makeDeleteIntentSignature(r);
        return await this.arkProvider.deleteIntent(o), this.arkProvider.registerIntent(t);
      }
      throw n;
    }
  }
  async makeRegisterIntentSignature(t, n, r, o) {
    const i = this.prepareIntentProofInputs(t), s = {
      type: "register",
      onchain_output_indexes: r,
      valid_at: 0,
      expire_at: 0,
      cosigners_public_keys: o
    }, c = ve.create(s, i, n), a = await this.identity.sign(c);
    return {
      proof: wt.encode(a.toPSBT()),
      message: s
    };
  }
  async makeDeleteIntentSignature(t) {
    const n = this.prepareIntentProofInputs(t), r = {
      type: "delete",
      expire_at: 0
    }, o = ve.create(r, n, []), i = await this.identity.sign(o);
    return {
      proof: wt.encode(i.toPSBT()),
      message: r
    };
  }
  async makeGetPendingTxIntentSignature(t) {
    const n = this.prepareIntentProofInputs(t), r = {
      type: "get-pending-tx",
      expire_at: 0
    }, o = ve.create(r, n, []), i = await this.identity.sign(o);
    return {
      proof: wt.encode(i.toPSBT()),
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
      const i = [O.encode(this.offchainTapscript.pkScript)];
      let { vtxos: s } = await this.indexerProvider.getVtxos({
        scripts: i
      });
      if (s = s.filter((c) => c.virtualStatus.state !== "swept" && c.virtualStatus.state !== "settled"), s.length === 0)
        return { finalized: [], pending: [] };
      t = s.map((c) => Ae(this, c));
    }
    const r = [], o = [];
    for (let i = 0; i < t.length; i += 20) {
      const s = t.slice(i, i + 20), c = await this.makeGetPendingTxIntentSignature(s), a = await this.arkProvider.getPendingTxs(c);
      for (const u of a) {
        o.push(u.arkTxid);
        try {
          const f = await Promise.all(u.signedCheckpointTxs.map(async (d) => {
            const h = Mt.fromPSBT(wt.decode(d)), l = await this.identity.sign(h);
            return wt.encode(l.toPSBT());
          }));
          await this.arkProvider.finalizeTx(u.arkTxid, f), r.push(u.arkTxid);
        } catch (f) {
          console.error(`Failed to finalize transaction ${u.arkTxid}:`, f);
        }
      }
    }
    return { finalized: r, pending: o };
  }
  prepareIntentProofInputs(t) {
    const n = [];
    for (const r of t) {
      const o = Ct.decode(r.tapTree), i = Vp(r.intentTapLeafScript), s = [Wu.encode(r.tapTree)];
      r.extraWitness && s.push(Lh.encode(r.extraWitness)), n.push({
        txid: O.decode(r.txid),
        index: r.vout,
        witnessUtxo: {
          amount: BigInt(r.value),
          script: o.pkScript
        },
        sequence: i,
        tapLeafScript: [r.intentTapLeafScript],
        unknown: s
      });
    }
    return n;
  }
}
xn.MIN_FEE_RATE = 1;
function Vp(e) {
  let t;
  try {
    const n = e[1], r = n.subarray(0, n.length - 1);
    try {
      const o = Rt.decode(r).params;
      t = wi.encode(o.timelock.type === "blocks" ? { blocks: Number(o.timelock.value) } : { seconds: Number(o.timelock.value) });
    } catch {
      const o = yn.decode(r).params;
      t = Number(o.absoluteTimelock);
    }
  } catch {
  }
  return t;
}
function Hp(e) {
  try {
    return wn.decode(e), !0;
  } catch {
    return !1;
  }
}
function Dp(e, t) {
  const n = [...e].sort((s, c) => {
    const a = s.virtualStatus.batchExpiry || Number.MAX_SAFE_INTEGER, u = c.virtualStatus.batchExpiry || Number.MAX_SAFE_INTEGER;
    return a !== u ? a - u : c.value - s.value;
  }), r = [];
  let o = 0;
  for (const s of n)
    if (r.push(s), o += s.value, o >= t)
      break;
  if (o === t)
    return { inputs: r, changeAmount: 0n };
  if (o < t)
    throw new Error("Insufficient funds");
  const i = BigInt(o - t);
  return {
    inputs: r,
    changeAmount: i
  };
}
function Oc() {
  const e = crypto.getRandomValues(new Uint8Array(16));
  return O.encode(e);
}
var V;
(function(e) {
  e.walletInitialized = (p) => ({
    type: "WALLET_INITIALIZED",
    success: !0,
    id: p
  });
  function t(p, x) {
    return {
      type: "ERROR",
      success: !1,
      message: x,
      id: p
    };
  }
  e.error = t;
  function n(p, x) {
    return {
      type: "SETTLE_EVENT",
      success: !0,
      event: x,
      id: p
    };
  }
  e.settleEvent = n;
  function r(p, x) {
    return {
      type: "SETTLE_SUCCESS",
      success: !0,
      txid: x,
      id: p
    };
  }
  e.settleSuccess = r;
  function o(p) {
    return p.type === "SETTLE_SUCCESS" && p.success;
  }
  e.isSettleSuccess = o;
  function i(p) {
    return p.type === "ADDRESS" && p.success === !0;
  }
  e.isAddress = i;
  function s(p) {
    return p.type === "BOARDING_ADDRESS" && p.success === !0;
  }
  e.isBoardingAddress = s;
  function c(p, x) {
    return {
      type: "ADDRESS",
      success: !0,
      address: x,
      id: p
    };
  }
  e.address = c;
  function a(p, x) {
    return {
      type: "BOARDING_ADDRESS",
      success: !0,
      address: x,
      id: p
    };
  }
  e.boardingAddress = a;
  function u(p) {
    return p.type === "BALANCE" && p.success === !0;
  }
  e.isBalance = u;
  function f(p, x) {
    return {
      type: "BALANCE",
      success: !0,
      balance: x,
      id: p
    };
  }
  e.balance = f;
  function d(p) {
    return p.type === "VTXOS" && p.success === !0;
  }
  e.isVtxos = d;
  function h(p, x) {
    return {
      type: "VTXOS",
      success: !0,
      vtxos: x,
      id: p
    };
  }
  e.vtxos = h;
  function l(p) {
    return p.type === "VIRTUAL_COINS" && p.success === !0;
  }
  e.isVirtualCoins = l;
  function g(p, x) {
    return {
      type: "VIRTUAL_COINS",
      success: !0,
      virtualCoins: x,
      id: p
    };
  }
  e.virtualCoins = g;
  function w(p) {
    return p.type === "BOARDING_UTXOS" && p.success === !0;
  }
  e.isBoardingUtxos = w;
  function y(p, x) {
    return {
      type: "BOARDING_UTXOS",
      success: !0,
      boardingUtxos: x,
      id: p
    };
  }
  e.boardingUtxos = y;
  function S(p) {
    return p.type === "SEND_BITCOIN_SUCCESS" && p.success === !0;
  }
  e.isSendBitcoinSuccess = S;
  function v(p, x) {
    return {
      type: "SEND_BITCOIN_SUCCESS",
      success: !0,
      txid: x,
      id: p
    };
  }
  e.sendBitcoinSuccess = v;
  function R(p) {
    return p.type === "TRANSACTION_HISTORY" && p.success === !0;
  }
  e.isTransactionHistory = R;
  function $(p, x) {
    return {
      type: "TRANSACTION_HISTORY",
      success: !0,
      transactions: x,
      id: p
    };
  }
  e.transactionHistory = $;
  function L(p) {
    return p.type === "WALLET_STATUS" && p.success === !0;
  }
  e.isWalletStatus = L;
  function j(p, x, A) {
    return {
      type: "WALLET_STATUS",
      success: !0,
      status: {
        walletInitialized: x,
        xOnlyPublicKey: A
      },
      id: p
    };
  }
  e.walletStatus = j;
  function E(p) {
    return p.type === "CLEAR_RESPONSE";
  }
  e.isClearResponse = E;
  function nt(p, x) {
    return {
      type: "CLEAR_RESPONSE",
      success: x,
      id: p
    };
  }
  e.clearResponse = nt;
  function _(p) {
    return p.type === "WALLET_RELOADED";
  }
  e.isWalletReloaded = _;
  function Pt(p, x) {
    return {
      type: "WALLET_RELOADED",
      success: x,
      id: p
    };
  }
  e.walletReloaded = Pt;
  function gt(p) {
    return p.type === "VTXO_UPDATE";
  }
  e.isVtxoUpdate = gt;
  function C(p, x) {
    return {
      type: "VTXO_UPDATE",
      id: Oc(),
      // spontaneous update, not tied to a request
      success: !0,
      spentVtxos: x,
      newVtxos: p
    };
  }
  e.vtxoUpdate = C;
  function b(p) {
    return p.type === "UTXO_UPDATE";
  }
  e.isUtxoUpdate = b;
  function m(p) {
    return {
      type: "UTXO_UPDATE",
      id: Oc(),
      // spontaneous update, not tied to a request
      success: !0,
      coins: p
    };
  }
  e.utxoUpdate = m;
})(V || (V = {}));
class Kp {
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
        const i = o.result;
        i.objectStoreNames.contains("storage") || i.createObjectStore("storage");
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
      return new Promise((o, i) => {
        const a = r.transaction(["storage"], "readwrite").objectStore("storage").put(n, t);
        a.onerror = () => i(a.error), a.onsuccess = () => o();
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
        const s = t.transaction(["storage"], "readwrite").objectStore("storage").clear();
        s.onerror = () => r(s.error), s.onsuccess = () => n();
      });
    } catch (t) {
      console.error("Failed to clear storage:", t);
    }
  }
}
const Mp = "arkade-service-worker";
class Q {
  constructor(t, n, r, o, i, s) {
    this.hasWitness = t, this.inputCount = n, this.outputCount = r, this.inputSize = o, this.inputWitnessSize = i, this.outputSize = s;
  }
  static create() {
    return new Q(!1, 0, 0, 0, 0, 0);
  }
  addP2AInput() {
    return this.inputCount++, this.inputSize += Q.INPUT_SIZE, this;
  }
  addKeySpendInput(t = !0) {
    return this.inputCount++, this.inputWitnessSize += 65 + (t ? 0 : 1), this.inputSize += Q.INPUT_SIZE, this.hasWitness = !0, this;
  }
  addP2PKHInput() {
    return this.inputCount++, this.inputWitnessSize++, this.inputSize += Q.INPUT_SIZE + Q.P2PKH_SCRIPT_SIG_SIZE, this;
  }
  addTapscriptInput(t, n, r) {
    const o = 1 + Q.BASE_CONTROL_BLOCK_SIZE + 1 + n + 1 + r;
    return this.inputCount++, this.inputWitnessSize += t + o, this.inputSize += Q.INPUT_SIZE, this.hasWitness = !0, this.inputCount++, this;
  }
  addP2WKHOutput() {
    return this.outputCount++, this.outputSize += Q.OUTPUT_SIZE + Q.P2WKH_OUTPUT_SIZE, this;
  }
  addP2TROutput() {
    return this.outputCount++, this.outputSize += Q.OUTPUT_SIZE + Q.P2TR_OUTPUT_SIZE, this;
  }
  vsize() {
    const t = (s) => s < 253 ? 1 : s < 65535 ? 3 : s < 4294967295 ? 5 : 9, n = t(this.inputCount), r = t(this.outputCount);
    let i = (Q.BASE_TX_SIZE + n + this.inputSize + r + this.outputSize) * Q.WITNESS_SCALE_FACTOR;
    return this.hasWitness && (i += Q.WITNESS_HEADER_SIZE + this.inputWitnessSize), Fp(i);
  }
}
Q.P2PKH_SCRIPT_SIG_SIZE = 108;
Q.INPUT_SIZE = 41;
Q.BASE_CONTROL_BLOCK_SIZE = 33;
Q.OUTPUT_SIZE = 9;
Q.P2WKH_OUTPUT_SIZE = 22;
Q.BASE_TX_SIZE = 10;
Q.WITNESS_HEADER_SIZE = 2;
Q.WITNESS_SCALE_FACTOR = 4;
Q.P2TR_OUTPUT_SIZE = 34;
const Fp = (e) => {
  const t = BigInt(Math.ceil(e / Q.WITNESS_SCALE_FACTOR));
  return {
    value: t,
    fee: (n) => n * t
  };
};
var mt;
(function(e) {
  function t(w) {
    return typeof w == "object" && w !== null && "type" in w;
  }
  e.isBase = t;
  function n(w) {
    return w.type === "INIT_WALLET" && "arkServerUrl" in w && typeof w.arkServerUrl == "string" && ("arkServerPublicKey" in w ? w.arkServerPublicKey === void 0 || typeof w.arkServerPublicKey == "string" : !0);
  }
  e.isInitWallet = n;
  function r(w) {
    return w.type === "SETTLE";
  }
  e.isSettle = r;
  function o(w) {
    return w.type === "GET_ADDRESS";
  }
  e.isGetAddress = o;
  function i(w) {
    return w.type === "GET_BOARDING_ADDRESS";
  }
  e.isGetBoardingAddress = i;
  function s(w) {
    return w.type === "GET_BALANCE";
  }
  e.isGetBalance = s;
  function c(w) {
    return w.type === "GET_VTXOS";
  }
  e.isGetVtxos = c;
  function a(w) {
    return w.type === "GET_VIRTUAL_COINS";
  }
  e.isGetVirtualCoins = a;
  function u(w) {
    return w.type === "GET_BOARDING_UTXOS";
  }
  e.isGetBoardingUtxos = u;
  function f(w) {
    return w.type === "SEND_BITCOIN" && "params" in w && w.params !== null && typeof w.params == "object" && "address" in w.params && typeof w.params.address == "string" && "amount" in w.params && typeof w.params.amount == "number";
  }
  e.isSendBitcoin = f;
  function d(w) {
    return w.type === "GET_TRANSACTION_HISTORY";
  }
  e.isGetTransactionHistory = d;
  function h(w) {
    return w.type === "GET_STATUS";
  }
  e.isGetStatus = h;
  function l(w) {
    return w.type === "CLEAR";
  }
  e.isClear = l;
  function g(w) {
    return w.type === "RELOAD_WALLET";
  }
  e.isReloadWallet = g;
})(mt || (mt = {}));
class ef {
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
  getBoardingTxs() {
    return this.wallet.getBoardingTxs();
  }
  async handleReload(t) {
    return { pending: await this.wallet.fetchPendingTxs(), finalized: [] };
  }
  async handleSettle(...t) {
  }
  async handleSendBitcoin(...t) {
  }
}
class zp extends ef {
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
class Wp {
  constructor(t = Mp, n = 1, r = () => {
  }) {
    this.dbName = t, this.dbVersion = n, this.messageCallback = r, this.storage = new Kp(t, n), this.walletRepository = new Ti(this.storage);
  }
  /**
   * Get spendable vtxos for the current wallet address
   */
  async getSpendableVtxos() {
    if (!this.handler)
      return [];
    const t = await this.handler.getAddress();
    return (await this.walletRepository.getVtxos(t)).filter(ue);
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
      spendable: n.filter(ue),
      spent: n.filter((r) => !ue(r))
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
  async getTransactionHistory() {
    if (!this.handler)
      return [];
    let t = [];
    try {
      const { boardingTxs: n, commitmentsToIgnore: r } = await this.handler.getBoardingTxs(), { spendable: o, spent: i } = await this.getAllVtxos(), s = Qu(o, i, r);
      t = [...n, ...s], t.sort(
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
    this.incomingFundsSubscription && this.incomingFundsSubscription(), await this.storage.clear(), this.walletRepository = new Ti(this.storage), this.handler = void 0, this.arkProvider = void 0, this.indexerProvider = void 0;
  }
  async reload() {
    await this.onWalletInitialized();
  }
  async onWalletInitialized() {
    if (!this.handler || !this.arkProvider || !this.indexerProvider || !this.handler.offchainTapscript || !this.handler.boardingTapscript)
      return;
    const t = O.encode(this.handler.offchainTapscript.pkScript), r = (await this.indexerProvider.getVtxos({
      scripts: [t]
    })).vtxos.map((a) => Ae(this.handler, a));
    try {
      const { pending: a, finalized: u } = await this.handler.handleReload(r);
      console.info(`Recovered ${u.length}/${a.length} pending transactions: ${u.join(", ")}`);
    } catch (a) {
      console.error("Error recovering pending transactions:", a);
    }
    const o = await this.handler.getAddress();
    await this.walletRepository.saveVtxos(o, r);
    const i = await this.handler.getBoardingAddress(), s = await this.handler.onchainProvider.getCoins(i);
    await this.walletRepository.saveUtxos(i, s.map((a) => vi(this.handler, a)));
    const c = await this.getTransactionHistory();
    c && await this.walletRepository.saveTransactions(o, c), this.incomingFundsSubscription && this.incomingFundsSubscription(), this.incomingFundsSubscription = await this.handler.notifyIncomingFunds(async (a) => {
      if (a.type === "vtxo") {
        const u = a.newVtxos.length > 0 ? a.newVtxos.map((d) => Ae(this.handler, d)) : [], f = a.spentVtxos.length > 0 ? a.spentVtxos.map((d) => Ae(this.handler, d)) : [];
        if ([...u, ...f].length === 0)
          return;
        await this.walletRepository.saveVtxos(o, [
          ...u,
          ...f
        ]), await this.sendMessageToAllClients(V.vtxoUpdate(u, f));
      }
      if (a.type === "utxo") {
        const u = a.coins.map((d) => vi(this.handler, d)), f = await this.handler?.getBoardingAddress();
        await this.walletRepository.clearUtxos(f), await this.walletRepository.saveUtxos(f, u), await this.sendMessageToAllClients(V.utxoUpdate(u));
      }
    });
  }
  async handleClear(t) {
    await this.clear(), mt.isBase(t.data) && t.source?.postMessage(V.clearResponse(t.data.id, !0));
  }
  async handleInitWallet(t) {
    if (!mt.isInitWallet(t.data)) {
      console.error("Invalid INIT_WALLET message format", t.data), t.source?.postMessage(V.error(t.data.id, "Invalid INIT_WALLET message format"));
      return;
    }
    const n = t.data, { arkServerPublicKey: r, arkServerUrl: o } = n;
    this.arkProvider = new Zu(o), this.indexerProvider = new tf(o);
    try {
      if ("privateKey" in n.key && typeof n.key.privateKey == "string") {
        const { key: { privateKey: i } } = n, s = Cn.fromHex(i), c = await xn.create({
          identity: s,
          arkServerUrl: o,
          arkServerPublicKey: r,
          storage: this.storage
          // Use unified storage for wallet too
        });
        this.handler = new zp(c);
      } else if ("publicKey" in n.key && typeof n.key.publicKey == "string") {
        const { key: { publicKey: i } } = n, s = mo.fromPublicKey(O.decode(i)), c = await Fe.create({
          identity: s,
          arkServerUrl: o,
          arkServerPublicKey: r,
          storage: this.storage
          // Use unified storage for wallet too
        });
        this.handler = new ef(c);
      } else {
        const i = "Missing privateKey or publicKey in key object";
        t.source?.postMessage(V.error(n.id, i)), console.error(i);
        return;
      }
    } catch (i) {
      console.error("Error initializing wallet:", i);
      const s = i instanceof Error ? i.message : "Unknown error occurred";
      t.source?.postMessage(V.error(n.id, s));
      return;
    }
    t.source?.postMessage(V.walletInitialized(n.id)), await this.onWalletInitialized();
  }
  async handleSettle(t) {
    const n = t.data;
    if (!mt.isSettle(n)) {
      console.error("Invalid SETTLE message format", n), t.source?.postMessage(V.error(n.id, "Invalid SETTLE message format"));
      return;
    }
    try {
      if (!this.handler) {
        console.error("Wallet not initialized"), t.source?.postMessage(V.error(n.id, "Wallet not initialized"));
        return;
      }
      const r = await this.handler.handleSettle(n.params, (o) => {
        t.source?.postMessage(V.settleEvent(n.id, o));
      });
      r ? t.source?.postMessage(V.settleSuccess(n.id, r)) : t.source?.postMessage(V.error(n.id, "Operation not supported in readonly mode"));
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
    if (!this.handler) {
      console.error("Wallet not initialized"), t.source?.postMessage(V.error(n.id, "Wallet not initialized"));
      return;
    }
    try {
      const r = await this.handler.handleSendBitcoin(n.params);
      r ? t.source?.postMessage(V.sendBitcoinSuccess(n.id, r)) : t.source?.postMessage(V.error(n.id, "Operation not supported in readonly mode"));
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
    if (!this.handler) {
      console.error("Wallet not initialized"), t.source?.postMessage(V.error(n.id, "Wallet not initialized"));
      return;
    }
    try {
      const r = await this.handler.getAddress();
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
    if (!this.handler) {
      console.error("Wallet not initialized"), t.source?.postMessage(V.error(n.id, "Wallet not initialized"));
      return;
    }
    try {
      const r = await this.handler.getBoardingAddress();
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
    if (!this.handler) {
      console.error("Wallet not initialized"), t.source?.postMessage(V.error(n.id, "Wallet not initialized"));
      return;
    }
    try {
      const [r, o, i] = await Promise.all([
        this.getAllBoardingUtxos(),
        this.getSpendableVtxos(),
        this.getSweptVtxos()
      ]);
      let s = 0, c = 0;
      for (const l of r)
        l.status.confirmed ? s += l.value : c += l.value;
      let a = 0, u = 0, f = 0;
      for (const l of o)
        l.virtualStatus.state === "settled" ? a += l.value : l.virtualStatus.state === "preconfirmed" && (u += l.value);
      for (const l of i)
        ue(l) && (f += l.value);
      const d = s + c, h = a + u + f;
      t.source?.postMessage(V.balance(n.id, {
        boarding: {
          confirmed: s,
          unconfirmed: c,
          total: d
        },
        settled: a,
        preconfirmed: u,
        available: a + u,
        recoverable: f,
        total: d + h
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
    if (!this.handler) {
      console.error("Wallet not initialized"), t.source?.postMessage(V.error(n.id, "Wallet not initialized"));
      return;
    }
    try {
      const r = await this.getSpendableVtxos(), o = this.handler.dustAmount, s = n.filter?.withRecoverable ?? !1 ? r : r.filter((c) => !(o != null && ju(c, o) || ls(c) || qu(c)));
      t.source?.postMessage(V.vtxos(n.id, s));
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
    if (!this.handler) {
      console.error("Wallet not initialized"), t.source?.postMessage(V.error(n.id, "Wallet not initialized"));
      return;
    }
    try {
      const r = await this.getAllBoardingUtxos();
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
    if (!this.handler) {
      console.error("Wallet not initialized"), t.source?.postMessage(V.error(n.id, "Wallet not initialized"));
      return;
    }
    try {
      const r = await this.getTransactionHistory();
      t.source?.postMessage(V.transactionHistory(n.id, r));
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
    const r = this.handler ? await this.handler.identity.xOnlyPublicKey() : void 0;
    t.source?.postMessage(V.walletStatus(n.id, this.handler !== void 0, r));
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
    if (!this.handler) {
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
var Rc;
(function(e) {
  let t;
  (function(o) {
    o[o.UNROLL = 0] = "UNROLL", o[o.WAIT = 1] = "WAIT", o[o.DONE = 2] = "DONE";
  })(t = e.StepType || (e.StepType = {}));
  class n {
    constructor(i, s, c, a) {
      this.toUnroll = i, this.bumper = s, this.explorer = c, this.indexer = a;
    }
    static async create(i, s, c, a) {
      const { chain: u } = await a.getVtxoChain(i);
      return new n({ ...i, chain: u }, s, c, a);
    }
    /**
     * Get the next step to be executed
     * @returns The next step to be executed + the function to execute it
     */
    async next() {
      let i;
      const s = this.toUnroll.chain;
      for (let u = s.length - 1; u >= 0; u--) {
        const f = s[u];
        if (!(f.type === on.COMMITMENT || f.type === on.UNSPECIFIED))
          try {
            if (!(await this.explorer.getTxStatus(f.txid)).confirmed)
              return {
                type: t.WAIT,
                txid: f.txid,
                do: jp(this.explorer, f.txid)
              };
          } catch {
            i = f;
            break;
          }
      }
      if (!i)
        return {
          type: t.DONE,
          vtxoTxid: this.toUnroll.txid,
          do: () => Promise.resolve()
        };
      const c = await this.indexer.getVirtualTxs([
        i.txid
      ]);
      if (c.txs.length === 0)
        throw new Error(`Tx ${i.txid} not found`);
      const a = Oe.fromPSBT(wt.decode(c.txs[0]));
      if (i.type === on.TREE) {
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
        do: qp(this.bumper, this.explorer, a)
      };
    }
    /**
     * Iterate over the steps to be executed and execute them
     * @returns An async iterator over the executed steps
     */
    async *[Symbol.asyncIterator]() {
      let i;
      do {
        i !== void 0 && await Gp(1e3);
        const s = await this.next();
        await s.do(), yield s, i = s.type;
      } while (i !== t.DONE);
    }
  }
  e.Session = n;
  async function r(o, i, s) {
    const c = await o.onchainProvider.getChainTip();
    let a = await o.getVtxos({ withUnrolled: !0 });
    if (a = a.filter((y) => i.includes(y.txid)), a.length === 0)
      throw new Error("No vtxos to complete unroll");
    const u = [];
    let f = 0n;
    const d = Q.create();
    for (const y of a) {
      if (!y.isUnrolled)
        throw new Error(`Vtxo ${y.txid}:${y.vout} is not fully unrolled, use unroll first`);
      const S = await o.onchainProvider.getTxStatus(y.txid);
      if (!S.confirmed)
        throw new Error(`tx ${y.txid} is not confirmed`);
      const v = Yp({ height: S.blockHeight, time: S.blockTime }, c, y);
      if (!v)
        throw new Error(`no available exit path found for vtxo ${y.txid}:${y.vout}`);
      const R = Ct.decode(y.tapTree).findLeaf(O.encode(v.script));
      if (!R)
        throw new Error(`spending leaf not found for vtxo ${y.txid}:${y.vout}`);
      f += BigInt(y.value), u.push({
        txid: y.txid,
        index: y.vout,
        tapLeafScript: [R],
        sequence: 4294967294,
        witnessUtxo: {
          amount: BigInt(y.value),
          script: Ct.decode(y.tapTree).pkScript
        },
        sighashType: We.DEFAULT
      }), d.addTapscriptInput(64, R[1].length, Xt.encode(R[0]).length);
    }
    const h = new Oe({ version: 2 });
    for (const y of u)
      h.addInput(y);
    d.addP2TROutput();
    let l = await o.onchainProvider.getFeeRate();
    (!l || l < xn.MIN_FEE_RATE) && (l = xn.MIN_FEE_RATE);
    const g = d.vsize().fee(BigInt(l));
    if (g > f)
      throw new Error("fee amount is greater than the total amount");
    h.addOutputAddress(s, f - g);
    const w = await o.identity.sign(h);
    return w.finalize(), await o.onchainProvider.broadcastTransaction(w.hex), w.id;
  }
  e.completeUnroll = r;
})(Rc || (Rc = {}));
function Gp(e) {
  return new Promise((t) => setTimeout(t, e));
}
function qp(e, t, n) {
  return async () => {
    const [r, o] = await e.bumpP2A(n);
    await t.broadcastTransaction(r, o);
  };
}
function jp(e, t) {
  return () => new Promise((n, r) => {
    const o = setInterval(async () => {
      try {
        (await e.getTxStatus(t)).confirmed && (clearInterval(o), n());
      } catch (i) {
        clearInterval(o), r(i);
      }
    }, 5e3);
  });
}
function Yp(e, t, n) {
  const r = Ct.decode(n.tapTree).exitPaths();
  for (const o of r)
    if (o.params.timelock.type === "blocks") {
      if (t.height >= e.height + Number(o.params.timelock.value))
        return o;
    } else if (t.time >= e.time + Number(o.params.timelock.value))
      return o;
}
const nf = new Wp();
nf.start().catch(console.error);
const rf = "arkade-cache-v1";
self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(rf)), self.skipWaiting();
});
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((t) => Promise.all(
      t.map((n) => {
        if (n !== rf)
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
  e.data && e.data.type === "RELOAD_WALLET" && e.waitUntil(nf.reload().catch(console.error));
});
