/*! noble-hashes - MIT License (c) 2022 Paul Miller (paulmillr.com) */
function vs(e) {
  return e instanceof Uint8Array || ArrayBuffer.isView(e) && e.constructor.name === "Uint8Array";
}
function Te(e, t = "") {
  if (!Number.isSafeInteger(e) || e < 0) {
    const n = t && `"${t}" `;
    throw new Error(`${n}expected integer >= 0, got ${e}`);
  }
}
function z(e, t, n = "") {
  const r = vs(e), o = e?.length, s = t !== void 0;
  if (!r || s && o !== t) {
    const i = n && `"${n}" `, c = s ? ` of length ${t}` : "", a = r ? `length=${o}` : `type=${typeof e}`;
    throw new Error(i + "expected Uint8Array" + c + ", got " + a);
  }
  return e;
}
function Bc(e) {
  if (typeof e != "function" || typeof e.create != "function")
    throw new Error("Hash must wrapped by utils.createHasher");
  Te(e.outputLen), Te(e.blockLen);
}
function br(e, t = !0) {
  if (e.destroyed)
    throw new Error("Hash instance has been destroyed");
  if (t && e.finished)
    throw new Error("Hash#digest() has already been called");
}
function Qu(e, t) {
  z(e, void 0, "digestInto() output");
  const n = t.outputLen;
  if (e.length < n)
    throw new Error('"digestInto() output" expected to be of length >=' + n);
}
function rn(...e) {
  for (let t = 0; t < e.length; t++)
    e[t].fill(0);
}
function wo(e) {
  return new DataView(e.buffer, e.byteOffset, e.byteLength);
}
function qt(e, t) {
  return e << 32 - t | e >>> t;
}
function Zn(e, t) {
  return e << t | e >>> 32 - t >>> 0;
}
const Oc = /* @ts-ignore */ typeof Uint8Array.from([]).toHex == "function" && typeof Uint8Array.fromHex == "function", Ju = /* @__PURE__ */ Array.from({ length: 256 }, (e, t) => t.toString(16).padStart(2, "0"));
function Xr(e) {
  if (z(e), Oc)
    return e.toHex();
  let t = "";
  for (let n = 0; n < e.length; n++)
    t += Ju[e[n]];
  return t;
}
const re = { _0: 48, _9: 57, A: 65, F: 70, a: 97, f: 102 };
function di(e) {
  if (e >= re._0 && e <= re._9)
    return e - re._0;
  if (e >= re.A && e <= re.F)
    return e - (re.A - 10);
  if (e >= re.a && e <= re.f)
    return e - (re.a - 10);
}
function Er(e) {
  if (typeof e != "string")
    throw new Error("hex string expected, got " + typeof e);
  if (Oc)
    return Uint8Array.fromHex(e);
  const t = e.length, n = t / 2;
  if (t % 2)
    throw new Error("hex string expected, got unpadded hex of length " + t);
  const r = new Uint8Array(n);
  for (let o = 0, s = 0; o < n; o++, s += 2) {
    const i = di(e.charCodeAt(s)), c = di(e.charCodeAt(s + 1));
    if (i === void 0 || c === void 0) {
      const a = e[s] + e[s + 1];
      throw new Error('hex string expected, got non-hex character "' + a + '" at index ' + s);
    }
    r[o] = i * 16 + c;
  }
  return r;
}
function Kt(...e) {
  let t = 0;
  for (let r = 0; r < e.length; r++) {
    const o = e[r];
    z(o), t += o.length;
  }
  const n = new Uint8Array(t);
  for (let r = 0, o = 0; r < e.length; r++) {
    const s = e[r];
    n.set(s, o), o += s.length;
  }
  return n;
}
function Uc(e, t = {}) {
  const n = (o, s) => e(s).update(o).digest(), r = e(void 0);
  return n.outputLen = r.outputLen, n.blockLen = r.blockLen, n.create = (o) => e(o), Object.assign(n, t), Object.freeze(n);
}
function Wn(e = 32) {
  const t = typeof globalThis == "object" ? globalThis.crypto : null;
  if (typeof t?.getRandomValues != "function")
    throw new Error("crypto.getRandomValues must be defined");
  return t.getRandomValues(new Uint8Array(e));
}
const tf = (e) => ({
  oid: Uint8Array.from([6, 9, 96, 134, 72, 1, 101, 3, 4, 2, e])
});
function ef(e, t, n) {
  return e & t ^ ~e & n;
}
function nf(e, t, n) {
  return e & t ^ e & n ^ t & n;
}
let $c = class {
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
    this.blockLen = t, this.outputLen = n, this.padOffset = r, this.isLE = o, this.buffer = new Uint8Array(t), this.view = wo(this.buffer);
  }
  update(t) {
    br(this), z(t);
    const { view: n, buffer: r, blockLen: o } = this, s = t.length;
    for (let i = 0; i < s; ) {
      const c = Math.min(o - this.pos, s - i);
      if (c === o) {
        const a = wo(t);
        for (; o <= s - i; i += o)
          this.process(a, i);
        continue;
      }
      r.set(t.subarray(i, i + c), this.pos), this.pos += c, i += c, this.pos === o && (this.process(n, 0), this.pos = 0);
    }
    return this.length += t.length, this.roundClean(), this;
  }
  digestInto(t) {
    br(this), Qu(t, this), this.finished = !0;
    const { buffer: n, view: r, blockLen: o, isLE: s } = this;
    let { pos: i } = this;
    n[i++] = 128, rn(this.buffer.subarray(i)), this.padOffset > o - i && (this.process(r, 0), i = 0);
    for (let d = i; d < o; d++)
      n[d] = 0;
    r.setBigUint64(o - 8, BigInt(this.length * 8), s), this.process(r, 0);
    const c = wo(t), a = this.outputLen;
    if (a % 4)
      throw new Error("_sha2: outputLen must be aligned to 32bit");
    const u = a / 4, f = this.get();
    if (u > f.length)
      throw new Error("_sha2: outputLen bigger than state");
    for (let d = 0; d < u; d++)
      c.setUint32(4 * d, f[d], s);
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
]), rf = /* @__PURE__ */ Uint32Array.from([
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
let of = class extends $c {
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
    for (let d = 0; d < 16; d++, n += 4)
      pe[d] = t.getUint32(n, !1);
    for (let d = 16; d < 64; d++) {
      const l = pe[d - 15], h = pe[d - 2], w = qt(l, 7) ^ qt(l, 18) ^ l >>> 3, g = qt(h, 17) ^ qt(h, 19) ^ h >>> 10;
      pe[d] = g + pe[d - 7] + w + pe[d - 16] | 0;
    }
    let { A: r, B: o, C: s, D: i, E: c, F: a, G: u, H: f } = this;
    for (let d = 0; d < 64; d++) {
      const l = qt(c, 6) ^ qt(c, 11) ^ qt(c, 25), h = f + l + ef(c, a, u) + rf[d] + pe[d] | 0, g = (qt(r, 2) ^ qt(r, 13) ^ qt(r, 22)) + nf(r, o, s) | 0;
      f = u, u = a, a = c, c = i + h | 0, i = s, s = o, o = r, r = h + g | 0;
    }
    r = r + this.A | 0, o = o + this.B | 0, s = s + this.C | 0, i = i + this.D | 0, c = c + this.E | 0, a = a + this.F | 0, u = u + this.G | 0, f = f + this.H | 0, this.set(r, o, s, i, c, a, u, f);
  }
  roundClean() {
    rn(pe);
  }
  destroy() {
    this.set(0, 0, 0, 0, 0, 0, 0, 0), rn(this.buffer);
  }
}, sf = class extends of {
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
const wt = /* @__PURE__ */ Uc(
  () => new sf(),
  /* @__PURE__ */ tf(1)
);
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const Ts = /* @__PURE__ */ BigInt(0), Ho = /* @__PURE__ */ BigInt(1);
function xr(e, t = "") {
  if (typeof e != "boolean") {
    const n = t && `"${t}" `;
    throw new Error(n + "expected boolean, got type=" + typeof e);
  }
  return e;
}
function Rc(e) {
  if (typeof e == "bigint") {
    if (!lr(e))
      throw new Error("positive bigint expected, got " + e);
  } else
    Te(e);
  return e;
}
function Xn(e) {
  const t = Rc(e).toString(16);
  return t.length & 1 ? "0" + t : t;
}
function Nc(e) {
  if (typeof e != "string")
    throw new Error("hex string expected, got " + typeof e);
  return e === "" ? Ts : BigInt("0x" + e);
}
function de(e) {
  return Nc(Xr(e));
}
function Lc(e) {
  return Nc(Xr(cf(z(e)).reverse()));
}
function Gn(e, t) {
  Te(t), e = Rc(e);
  const n = Er(e.toString(16).padStart(t * 2, "0"));
  if (n.length !== t)
    throw new Error("number too large");
  return n;
}
function Cc(e, t) {
  return Gn(e, t).reverse();
}
function Cn(e, t) {
  if (e.length !== t.length)
    return !1;
  let n = 0;
  for (let r = 0; r < e.length; r++)
    n |= e[r] ^ t[r];
  return n === 0;
}
function cf(e) {
  return Uint8Array.from(e);
}
function af(e) {
  return Uint8Array.from(e, (t, n) => {
    const r = t.charCodeAt(0);
    if (t.length !== 1 || r > 127)
      throw new Error(`string contains non-ASCII character "${e[n]}" with code ${r} at position ${n}`);
    return r;
  });
}
const lr = (e) => typeof e == "bigint" && Ts <= e;
function uf(e, t, n) {
  return lr(e) && lr(t) && lr(n) && t <= e && e < n;
}
function _c(e, t, n, r) {
  if (!uf(t, n, r))
    throw new Error("expected valid " + e + ": " + n + " <= n < " + r + ", got " + t);
}
function ff(e) {
  let t;
  for (t = 0; e > Ts; e >>= Ho, t += 1)
    ;
  return t;
}
const As = (e) => (Ho << BigInt(e)) - Ho;
function df(e, t, n) {
  if (Te(e, "hashLen"), Te(t, "qByteLen"), typeof n != "function")
    throw new Error("hmacFn must be a function");
  const r = (y) => new Uint8Array(y), o = Uint8Array.of(), s = Uint8Array.of(0), i = Uint8Array.of(1), c = 1e3;
  let a = r(e), u = r(e), f = 0;
  const d = () => {
    a.fill(1), u.fill(0), f = 0;
  }, l = (...y) => n(u, Kt(a, ...y)), h = (y = o) => {
    u = l(s, y), a = l(), y.length !== 0 && (u = l(i, y), a = l());
  }, w = () => {
    if (f++ >= c)
      throw new Error("drbg: tried max amount of iterations");
    let y = 0;
    const S = [];
    for (; y < t; ) {
      a = l();
      const v = a.slice();
      S.push(v), y += a.length;
    }
    return Kt(...S);
  };
  return (y, S) => {
    d(), h(y);
    let v;
    for (; !(v = S(w())); )
      h();
    return d(), v;
  };
}
function ks(e, t = {}, n = {}) {
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
function li(e) {
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
const St = /* @__PURE__ */ BigInt(0), mt = /* @__PURE__ */ BigInt(1), Ce = /* @__PURE__ */ BigInt(2), Pc = /* @__PURE__ */ BigInt(3), Hc = /* @__PURE__ */ BigInt(4), Vc = /* @__PURE__ */ BigInt(5), lf = /* @__PURE__ */ BigInt(7), Dc = /* @__PURE__ */ BigInt(8), hf = /* @__PURE__ */ BigInt(9), Mc = /* @__PURE__ */ BigInt(16);
function Vt(e, t) {
  const n = e % t;
  return n >= St ? n : t + n;
}
function Rt(e, t, n) {
  let r = e;
  for (; t-- > St; )
    r *= r, r %= n;
  return r;
}
function hi(e, t) {
  if (e === St)
    throw new Error("invert: expected non-zero number");
  if (t <= St)
    throw new Error("invert: expected positive modulus, got " + t);
  let n = Vt(e, t), r = t, o = St, s = mt;
  for (; n !== St; ) {
    const c = r / n, a = r % n, u = o - s * c;
    r = n, n = a, o = s, s = u;
  }
  if (r !== mt)
    throw new Error("invert: does not exist");
  return Vt(o, t);
}
function Is(e, t, n) {
  if (!e.eql(e.sqr(t), n))
    throw new Error("Cannot find square root");
}
function Kc(e, t) {
  const n = (e.ORDER + mt) / Hc, r = e.pow(t, n);
  return Is(e, r, t), r;
}
function pf(e, t) {
  const n = (e.ORDER - Vc) / Dc, r = e.mul(t, Ce), o = e.pow(r, n), s = e.mul(t, o), i = e.mul(e.mul(s, Ce), o), c = e.mul(s, e.sub(i, e.ONE));
  return Is(e, c, t), c;
}
function gf(e) {
  const t = Qr(e), n = Fc(e), r = n(t, t.neg(t.ONE)), o = n(t, r), s = n(t, t.neg(r)), i = (e + lf) / Mc;
  return (c, a) => {
    let u = c.pow(a, i), f = c.mul(u, r);
    const d = c.mul(u, o), l = c.mul(u, s), h = c.eql(c.sqr(f), a), w = c.eql(c.sqr(d), a);
    u = c.cmov(u, f, h), f = c.cmov(l, d, w);
    const g = c.eql(c.sqr(f), a), y = c.cmov(u, f, g);
    return Is(c, y, a), y;
  };
}
function Fc(e) {
  if (e < Pc)
    throw new Error("sqrt is not defined for small field");
  let t = e - mt, n = 0;
  for (; t % Ce === St; )
    t /= Ce, n++;
  let r = Ce;
  const o = Qr(e);
  for (; pi(o, r) === 1; )
    if (r++ > 1e3)
      throw new Error("Cannot find square root: probably non-prime P");
  if (n === 1)
    return Kc;
  let s = o.pow(r, t);
  const i = (t + mt) / Ce;
  return function(a, u) {
    if (a.is0(u))
      return u;
    if (pi(a, u) !== 1)
      throw new Error("Cannot find square root");
    let f = n, d = a.mul(a.ONE, s), l = a.pow(u, t), h = a.pow(u, i);
    for (; !a.eql(l, a.ONE); ) {
      if (a.is0(l))
        return a.ZERO;
      let w = 1, g = a.sqr(l);
      for (; !a.eql(g, a.ONE); )
        if (w++, g = a.sqr(g), w === f)
          throw new Error("Cannot find square root");
      const y = mt << BigInt(f - w - 1), S = a.pow(d, y);
      f = w, d = a.sqr(S), l = a.mul(l, d), h = a.mul(h, S);
    }
    return h;
  };
}
function wf(e) {
  return e % Hc === Pc ? Kc : e % Dc === Vc ? pf : e % Mc === hf ? gf(e) : Fc(e);
}
const yf = [
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
function mf(e) {
  const t = {
    ORDER: "bigint",
    BYTES: "number",
    BITS: "number"
  }, n = yf.reduce((r, o) => (r[o] = "function", r), t);
  return ks(e, n), e;
}
function bf(e, t, n) {
  if (n < St)
    throw new Error("invalid exponent, negatives unsupported");
  if (n === St)
    return e.ONE;
  if (n === mt)
    return t;
  let r = e.ONE, o = t;
  for (; n > St; )
    n & mt && (r = e.mul(r, o)), o = e.sqr(o), n >>= mt;
  return r;
}
function Wc(e, t, n = !1) {
  const r = new Array(t.length).fill(n ? e.ZERO : void 0), o = t.reduce((i, c, a) => e.is0(c) ? i : (r[a] = i, e.mul(i, c)), e.ONE), s = e.inv(o);
  return t.reduceRight((i, c, a) => e.is0(c) ? i : (r[a] = e.mul(i, r[a]), e.mul(i, c)), s), r;
}
function pi(e, t) {
  const n = (e.ORDER - mt) / Ce, r = e.pow(t, n), o = e.eql(r, e.ONE), s = e.eql(r, e.ZERO), i = e.eql(r, e.neg(e.ONE));
  if (!o && !s && !i)
    throw new Error("invalid Legendre symbol result");
  return o ? 1 : s ? 0 : -1;
}
function Ef(e, t) {
  t !== void 0 && Te(t);
  const n = t !== void 0 ? t : e.toString(2).length, r = Math.ceil(n / 8);
  return { nBitLength: n, nByteLength: r };
}
let xf = class {
  ORDER;
  BITS;
  BYTES;
  isLE;
  ZERO = St;
  ONE = mt;
  _lengths;
  _sqrt;
  // cached sqrt
  _mod;
  constructor(t, n = {}) {
    if (t <= St)
      throw new Error("invalid field: expected ORDER > 0, got " + t);
    let r;
    this.isLE = !1, n != null && typeof n == "object" && (typeof n.BITS == "number" && (r = n.BITS), typeof n.sqrt == "function" && (this.sqrt = n.sqrt), typeof n.isLE == "boolean" && (this.isLE = n.isLE), n.allowedLengths && (this._lengths = n.allowedLengths?.slice()), typeof n.modFromBytes == "boolean" && (this._mod = n.modFromBytes));
    const { nBitLength: o, nByteLength: s } = Ef(t, r);
    if (s > 2048)
      throw new Error("invalid field: expected ORDER of <= 2048 bytes");
    this.ORDER = t, this.BITS = o, this.BYTES = s, this._sqrt = void 0, Object.preventExtensions(this);
  }
  create(t) {
    return Vt(t, this.ORDER);
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
    return (t & mt) === mt;
  }
  neg(t) {
    return Vt(-t, this.ORDER);
  }
  eql(t, n) {
    return t === n;
  }
  sqr(t) {
    return Vt(t * t, this.ORDER);
  }
  add(t, n) {
    return Vt(t + n, this.ORDER);
  }
  sub(t, n) {
    return Vt(t - n, this.ORDER);
  }
  mul(t, n) {
    return Vt(t * n, this.ORDER);
  }
  pow(t, n) {
    return bf(this, t, n);
  }
  div(t, n) {
    return Vt(t * hi(n, this.ORDER), this.ORDER);
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
    return hi(t, this.ORDER);
  }
  sqrt(t) {
    return this._sqrt || (this._sqrt = wf(this.ORDER)), this._sqrt(this, t);
  }
  toBytes(t) {
    return this.isLE ? Cc(t, this.BYTES) : Gn(t, this.BYTES);
  }
  fromBytes(t, n = !1) {
    z(t);
    const { _lengths: r, BYTES: o, isLE: s, ORDER: i, _mod: c } = this;
    if (r) {
      if (!r.includes(t.length) || t.length > o)
        throw new Error("Field.fromBytes: expected " + r + " bytes, got " + t.length);
      const u = new Uint8Array(o);
      u.set(t, s ? 0 : u.length - t.length), t = u;
    }
    if (t.length !== o)
      throw new Error("Field.fromBytes: expected " + o + " bytes, got " + t.length);
    let a = s ? Lc(t) : de(t);
    if (c && (a = Vt(a, i)), !n && !this.isValid(a))
      throw new Error("invalid field element: outside of range 0..ORDER");
    return a;
  }
  // TODO: we don't need it here, move out to separate fn
  invertBatch(t) {
    return Wc(this, t);
  }
  // We can't move this out because Fp6, Fp12 implement it
  // and it's unclear what to return in there.
  cmov(t, n, r) {
    return r ? n : t;
  }
};
function Qr(e, t = {}) {
  return new xf(e, t);
}
function Gc(e) {
  if (typeof e != "bigint")
    throw new Error("field order must be bigint");
  const t = e.toString(2).length;
  return Math.ceil(t / 8);
}
function zc(e) {
  const t = Gc(e);
  return t + Math.ceil(t / 2);
}
function qc(e, t, n = !1) {
  z(e);
  const r = e.length, o = Gc(t), s = zc(t);
  if (r < 16 || r < s || r > 1024)
    throw new Error("expected " + s + "-1024 bytes of input, got " + r);
  const i = n ? Lc(e) : de(e), c = Vt(i, t - mt) + mt;
  return n ? Cc(c, o) : Gn(c, o);
}
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const on = /* @__PURE__ */ BigInt(0), _e = /* @__PURE__ */ BigInt(1);
function Sr(e, t) {
  const n = t.negate();
  return e ? n : t;
}
function gi(e, t) {
  const n = Wc(e.Fp, t.map((r) => r.Z));
  return t.map((r, o) => e.fromAffine(r.toAffine(n[o])));
}
function jc(e, t) {
  if (!Number.isSafeInteger(e) || e <= 0 || e > t)
    throw new Error("invalid window size, expected [1.." + t + "], got W=" + e);
}
function yo(e, t) {
  jc(e, t);
  const n = Math.ceil(t / e) + 1, r = 2 ** (e - 1), o = 2 ** e, s = As(e), i = BigInt(e);
  return { windows: n, windowSize: r, mask: s, maxNumber: o, shiftBy: i };
}
function wi(e, t, n) {
  const { windowSize: r, mask: o, maxNumber: s, shiftBy: i } = n;
  let c = Number(e & o), a = e >> i;
  c > r && (c -= s, a += _e);
  const u = t * r, f = u + Math.abs(c) - 1, d = c === 0, l = c < 0, h = t % 2 !== 0;
  return { nextN: a, offset: f, isZero: d, isNeg: l, isNegF: h, offsetF: u };
}
const mo = /* @__PURE__ */ new WeakMap(), Yc = /* @__PURE__ */ new WeakMap();
function bo(e) {
  return Yc.get(e) || 1;
}
function yi(e) {
  if (e !== on)
    throw new Error("invalid wNAF");
}
let Sf = class {
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
    for (; n > on; )
      n & _e && (r = r.add(o)), o = o.double(), n >>= _e;
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
    const { windows: r, windowSize: o } = yo(n, this.bits), s = [];
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
    const i = yo(t, this.bits);
    for (let c = 0; c < i.windows; c++) {
      const { nextN: a, offset: u, isZero: f, isNeg: d, isNegF: l, offsetF: h } = wi(r, c, i);
      r = a, f ? s = s.add(Sr(l, n[h])) : o = o.add(Sr(d, n[u]));
    }
    return yi(r), { p: o, f: s };
  }
  /**
   * Implements ec unsafe (non const-time) multiplication using precomputed tables and w-ary non-adjacent form.
   * @param acc accumulator point to add result of multiplication
   * @returns point
   */
  wNAFUnsafe(t, n, r, o = this.ZERO) {
    const s = yo(t, this.bits);
    for (let i = 0; i < s.windows && r !== on; i++) {
      const { nextN: c, offset: a, isZero: u, isNeg: f } = wi(r, i, s);
      if (r = c, !u) {
        const d = n[a];
        o = o.add(f ? d.negate() : d);
      }
    }
    return yi(r), o;
  }
  getPrecomputes(t, n, r) {
    let o = mo.get(n);
    return o || (o = this.precomputeWindow(n, t), t !== 1 && (typeof r == "function" && (o = r(o)), mo.set(n, o))), o;
  }
  cached(t, n, r) {
    const o = bo(t);
    return this.wNAF(o, this.getPrecomputes(o, t, r), n);
  }
  unsafe(t, n, r, o) {
    const s = bo(t);
    return s === 1 ? this._unsafeLadder(t, n, o) : this.wNAFUnsafe(s, this.getPrecomputes(s, t, r), n, o);
  }
  // We calculate precomputes for elliptic curve point multiplication
  // using windowed method. This specifies window size and
  // stores precomputed values. Usually only base point would be precomputed.
  createCache(t, n) {
    jc(n, this.bits), Yc.set(t, n), mo.delete(t);
  }
  hasCache(t) {
    return bo(t) !== 1;
  }
};
function vf(e, t, n, r) {
  let o = t, s = e.ZERO, i = e.ZERO;
  for (; n > on || r > on; )
    n & _e && (s = s.add(o)), r & _e && (i = i.add(o)), o = o.double(), n >>= _e, r >>= _e;
  return { p1: s, p2: i };
}
function mi(e, t, n) {
  if (t) {
    if (t.ORDER !== e)
      throw new Error("Field.ORDER must match order: Fp == p, Fn == n");
    return mf(t), t;
  } else
    return Qr(e, { isLE: n });
}
function Tf(e, t, n = {}, r) {
  if (r === void 0 && (r = e === "edwards"), !t || typeof t != "object")
    throw new Error(`expected valid ${e} CURVE object`);
  for (const a of ["p", "n", "h"]) {
    const u = t[a];
    if (!(typeof u == "bigint" && u > on))
      throw new Error(`CURVE.${a} must be positive bigint`);
  }
  const o = mi(t.p, n.Fp, r), s = mi(t.n, n.Fn, r), c = ["Gx", "Gy", "a", "b"];
  for (const a of c)
    if (!o.isValid(t[a]))
      throw new Error(`CURVE.${a} must be valid field element of CURVE.Fp`);
  return t = Object.freeze(Object.assign({}, t)), { CURVE: t, Fp: o, Fn: s };
}
function Zc(e, t) {
  return function(r) {
    const o = e(r);
    return { secretKey: o, publicKey: t(o) };
  };
}
let Xc = class {
  oHash;
  iHash;
  blockLen;
  outputLen;
  finished = !1;
  destroyed = !1;
  constructor(t, n) {
    if (Bc(t), z(n, void 0, "key"), this.iHash = t.create(), typeof this.iHash.update != "function")
      throw new Error("Expected instance of class which extends utils.Hash");
    this.blockLen = this.iHash.blockLen, this.outputLen = this.iHash.outputLen;
    const r = this.blockLen, o = new Uint8Array(r);
    o.set(n.length > r ? t.create().update(n).digest() : n);
    for (let s = 0; s < o.length; s++)
      o[s] ^= 54;
    this.iHash.update(o), this.oHash = t.create();
    for (let s = 0; s < o.length; s++)
      o[s] ^= 106;
    this.oHash.update(o), rn(o);
  }
  update(t) {
    return br(this), this.iHash.update(t), this;
  }
  digestInto(t) {
    br(this), z(t, this.outputLen, "output"), this.finished = !0, this.iHash.digestInto(t), this.oHash.update(t), this.oHash.digestInto(t), this.destroy();
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
const Qc = (e, t, n) => new Xc(e, t).update(n).digest();
Qc.create = (e, t) => new Xc(e, t);
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const bi = (e, t) => (e + (e >= 0 ? t : -t) / Jc) / t;
function Af(e, t, n) {
  const [[r, o], [s, i]] = t, c = bi(i * e, n), a = bi(-o * e, n);
  let u = e - c * r - a * s, f = -c * o - a * i;
  const d = u < ie, l = f < ie;
  d && (u = -u), l && (f = -f);
  const h = As(Math.ceil(ff(n) / 2)) + Qe;
  if (u < ie || u >= h || f < ie || f >= h)
    throw new Error("splitScalar (endomorphism): failed, k=" + e);
  return { k1neg: d, k1: u, k2neg: l, k2: f };
}
function Vo(e) {
  if (!["compact", "recovered", "der"].includes(e))
    throw new Error('Signature format must be "compact", "recovered", or "der"');
  return e;
}
function Eo(e, t) {
  const n = {};
  for (let r of Object.keys(t))
    n[r] = e[r] === void 0 ? t[r] : e[r];
  return xr(n.lowS, "lowS"), xr(n.prehash, "prehash"), n.format !== void 0 && Vo(n.format), n;
}
let kf = class extends Error {
  constructor(t = "") {
    super(t);
  }
};
const me = {
  // asn.1 DER encoding utils
  Err: kf,
  // Basic building block is TLV (Tag-Length-Value)
  _tlv: {
    encode: (e, t) => {
      const { Err: n } = me;
      if (e < 0 || e > 256)
        throw new n("tlv.encode: wrong tag");
      if (t.length & 1)
        throw new n("tlv.encode: unpadded data");
      const r = t.length / 2, o = Xn(r);
      if (o.length / 2 & 128)
        throw new n("tlv.encode: long form length too big");
      const s = r > 127 ? Xn(o.length / 2 | 128) : "";
      return Xn(e) + s + o + t;
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
      let n = Xn(e);
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
    const { Err: t, _int: n, _tlv: r } = me, o = z(e, void 0, "signature"), { v: s, l: i } = r.decode(48, o);
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
}, ie = BigInt(0), Qe = BigInt(1), Jc = BigInt(2), Qn = BigInt(3), If = BigInt(4);
function Bf(e, t = {}) {
  const n = Tf("weierstrass", e, t), { Fp: r, Fn: o } = n;
  let s = n.CURVE;
  const { h: i, n: c } = s;
  ks(t, {}, {
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
  const u = ea(r, o);
  function f() {
    if (!r.isOdd)
      throw new Error("compression is not supported: Field does not have .isOdd()");
  }
  function d(_, b, m) {
    const { x: p, y: E } = b.toAffine(), A = r.toBytes(p);
    if (xr(m, "isCompressed"), m) {
      f();
      const B = !r.isOdd(E);
      return Kt(ta(B), A);
    } else
      return Kt(Uint8Array.of(4), A, r.toBytes(E));
  }
  function l(_) {
    z(_, void 0, "Point");
    const { publicKey: b, publicKeyUncompressed: m } = u, p = _.length, E = _[0], A = _.subarray(1);
    if (p === b && (E === 2 || E === 3)) {
      const B = r.fromBytes(A);
      if (!r.isValid(B))
        throw new Error("bad point: is not on curve, wrong x");
      const k = g(B);
      let T;
      try {
        T = r.sqrt(k);
      } catch (W) {
        const H = W instanceof Error ? ": " + W.message : "";
        throw new Error("bad point: is not on curve, sqrt error" + H);
      }
      f();
      const O = r.isOdd(T);
      return (E & 1) === 1 !== O && (T = r.neg(T)), { x: B, y: T };
    } else if (p === m && E === 4) {
      const B = r.BYTES, k = r.fromBytes(A.subarray(0, B)), T = r.fromBytes(A.subarray(B, B * 2));
      if (!y(k, T))
        throw new Error("bad point: is not on curve");
      return { x: k, y: T };
    } else
      throw new Error(`bad point: got length ${p}, expected compressed=${b} or uncompressed=${m}`);
  }
  const h = t.toBytes || d, w = t.fromBytes || l;
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
  const S = r.mul(r.pow(s.a, Qn), If), v = r.mul(r.sqr(s.b), BigInt(27));
  if (r.is0(r.add(S, v)))
    throw new Error("bad curve params: a or b");
  function I(_, b, m = !1) {
    if (!r.isValid(b) || m && r.is0(b))
      throw new Error(`bad point coordinate ${_}`);
    return b;
  }
  function N(_) {
    if (!(_ instanceof L))
      throw new Error("Weierstrass Point expected");
  }
  function $(_) {
    if (!a || !a.basises)
      throw new Error("no endo");
    return Af(_, a.basises, o.ORDER);
  }
  const F = li((_, b) => {
    const { X: m, Y: p, Z: E } = _;
    if (r.eql(E, r.ONE))
      return { x: m, y: p };
    const A = _.is0();
    b == null && (b = A ? r.ONE : r.inv(E));
    const B = r.mul(m, b), k = r.mul(p, b), T = r.mul(E, b);
    if (A)
      return { x: r.ZERO, y: r.ZERO };
    if (!r.eql(T, r.ONE))
      throw new Error("invZ was invalid");
    return { x: B, y: k };
  }), x = li((_) => {
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
  function Y(_, b, m, p, E) {
    return m = new L(r.mul(m.X, _), m.Y, m.Z), b = Sr(p, b), m = Sr(E, m), b.add(m);
  }
  class L {
    // base / generator point
    static BASE = new L(s.Gx, s.Gy, r.ONE);
    // zero / infinity / identity point
    static ZERO = new L(r.ZERO, r.ONE, r.ZERO);
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
      this.X = I("x", b), this.Y = I("y", m, !0), this.Z = I("z", p), Object.freeze(this);
    }
    static CURVE() {
      return s;
    }
    /** Does NOT validate if the point is valid. Use `.assertValidity()`. */
    static fromAffine(b) {
      const { x: m, y: p } = b || {};
      if (!b || !r.isValid(m) || !r.isValid(p))
        throw new Error("invalid affine point");
      if (b instanceof L)
        throw new Error("projective point not allowed");
      return r.is0(m) && r.is0(p) ? L.ZERO : new L(m, p, r.ONE);
    }
    static fromBytes(b) {
      const m = L.fromAffine(w(z(b, void 0, "point")));
      return m.assertValidity(), m;
    }
    static fromHex(b) {
      return L.fromBytes(Er(b));
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
      return gt.createCache(this, b), m || this.multiply(Qn), this;
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
      const { X: m, Y: p, Z: E } = this, { X: A, Y: B, Z: k } = b, T = r.eql(r.mul(m, k), r.mul(A, E)), O = r.eql(r.mul(p, k), r.mul(B, E));
      return T && O;
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
      const { a: b, b: m } = s, p = r.mul(m, Qn), { X: E, Y: A, Z: B } = this;
      let k = r.ZERO, T = r.ZERO, O = r.ZERO, R = r.mul(E, E), W = r.mul(A, A), H = r.mul(B, B), C = r.mul(E, A);
      return C = r.add(C, C), O = r.mul(E, B), O = r.add(O, O), k = r.mul(b, O), T = r.mul(p, H), T = r.add(k, T), k = r.sub(W, T), T = r.add(W, T), T = r.mul(k, T), k = r.mul(C, k), O = r.mul(p, O), H = r.mul(b, H), C = r.sub(R, H), C = r.mul(b, C), C = r.add(C, O), O = r.add(R, R), R = r.add(O, R), R = r.add(R, H), R = r.mul(R, C), T = r.add(T, R), H = r.mul(A, B), H = r.add(H, H), R = r.mul(H, C), k = r.sub(k, R), O = r.mul(H, W), O = r.add(O, O), O = r.add(O, O), new L(k, T, O);
    }
    // Renes-Costello-Batina exception-free addition formula.
    // There is 30% faster Jacobian formula, but it is not complete.
    // https://eprint.iacr.org/2015/1060, algorithm 1
    // Cost: 12M + 0S + 3*a + 3*b3 + 23add.
    add(b) {
      N(b);
      const { X: m, Y: p, Z: E } = this, { X: A, Y: B, Z: k } = b;
      let T = r.ZERO, O = r.ZERO, R = r.ZERO;
      const W = s.a, H = r.mul(s.b, Qn);
      let C = r.mul(m, A), D = r.mul(p, B), q = r.mul(E, k), st = r.add(m, p), M = r.add(A, B);
      st = r.mul(st, M), M = r.add(C, D), st = r.sub(st, M), M = r.add(m, E);
      let Z = r.add(A, k);
      return M = r.mul(M, Z), Z = r.add(C, q), M = r.sub(M, Z), Z = r.add(p, E), T = r.add(B, k), Z = r.mul(Z, T), T = r.add(D, q), Z = r.sub(Z, T), R = r.mul(W, M), T = r.mul(H, q), R = r.add(T, R), T = r.sub(D, R), R = r.add(D, R), O = r.mul(T, R), D = r.add(C, C), D = r.add(D, C), q = r.mul(W, q), M = r.mul(H, M), D = r.add(D, q), q = r.sub(C, q), q = r.mul(W, q), M = r.add(M, q), C = r.mul(D, M), O = r.add(O, C), C = r.mul(Z, M), T = r.mul(st, T), T = r.sub(T, C), C = r.mul(st, D), R = r.mul(Z, R), R = r.add(R, C), new L(T, O, R);
    }
    subtract(b) {
      return this.add(b.negate());
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
    multiply(b) {
      const { endo: m } = t;
      if (!o.isValidNot0(b))
        throw new Error("invalid scalar: out of range");
      let p, E;
      const A = (B) => gt.cached(this, B, (k) => gi(L, k));
      if (m) {
        const { k1neg: B, k1: k, k2neg: T, k2: O } = $(b), { p: R, f: W } = A(k), { p: H, f: C } = A(O);
        E = W.add(C), p = Y(m.beta, R, H, B, T);
      } else {
        const { p: B, f: k } = A(b);
        p = B, E = k;
      }
      return gi(L, [p, E])[0];
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
        return L.ZERO;
      if (b === Qe)
        return p;
      if (gt.hasCache(this))
        return this.multiply(b);
      if (m) {
        const { k1neg: E, k1: A, k2neg: B, k2: k } = $(b), { p1: T, p2: O } = vf(L, p, A, k);
        return Y(m.beta, T, O, E, B);
      } else
        return gt.unsafe(p, b);
    }
    /**
     * Converts Projective point to affine (x, y) coordinates.
     * @param invertedZ Z^-1 (inverted zero) - optional, precomputation is useful for invertBatch
     */
    toAffine(b) {
      return F(this, b);
    }
    /**
     * Checks whether Point is free of torsion elements (is in prime subgroup).
     * Always torsion-free for cofactor=1 curves.
     */
    isTorsionFree() {
      const { isTorsionFree: b } = t;
      return i === Qe ? !0 : b ? b(L, this) : gt.unsafe(this, c).is0();
    }
    clearCofactor() {
      const { clearCofactor: b } = t;
      return i === Qe ? this : b ? b(L, this) : this.multiplyUnsafe(i);
    }
    isSmallOrder() {
      return this.multiplyUnsafe(i).is0();
    }
    toBytes(b = !0) {
      return xr(b, "isCompressed"), this.assertValidity(), h(L, this, b);
    }
    toHex(b = !0) {
      return Xr(this.toBytes(b));
    }
    toString() {
      return `<Point ${this.is0() ? "ZERO" : this.toHex()}>`;
    }
  }
  const Pt = o.BITS, gt = new Sf(L, t.endo ? Math.ceil(Pt / 2) : Pt);
  return L.BASE.precompute(8), L;
}
function ta(e) {
  return Uint8Array.of(e ? 2 : 3);
}
function ea(e, t) {
  return {
    secretKey: t.BYTES,
    publicKey: 1 + e.BYTES,
    publicKeyUncompressed: 1 + 2 * e.BYTES,
    publicKeyHasPrefix: !0,
    signature: 2 * t.BYTES
  };
}
function Of(e, t = {}) {
  const { Fn: n } = e, r = t.randomBytes || Wn, o = Object.assign(ea(e.Fp, n), { seed: zc(n.ORDER) });
  function s(h) {
    try {
      const w = n.fromBytes(h);
      return n.isValidNot0(w);
    } catch {
      return !1;
    }
  }
  function i(h, w) {
    const { publicKey: g, publicKeyUncompressed: y } = o;
    try {
      const S = h.length;
      return w === !0 && S !== g || w === !1 && S !== y ? !1 : !!e.fromBytes(h);
    } catch {
      return !1;
    }
  }
  function c(h = r(o.seed)) {
    return qc(z(h, o.seed, "seed"), n.ORDER);
  }
  function a(h, w = !0) {
    return e.BASE.multiply(n.fromBytes(h)).toBytes(w);
  }
  function u(h) {
    const { secretKey: w, publicKey: g, publicKeyUncompressed: y } = o;
    if (!vs(h) || "_lengths" in n && n._lengths || w === g)
      return;
    const S = z(h, void 0, "key").length;
    return S === g || S === y;
  }
  function f(h, w, g = !0) {
    if (u(h) === !0)
      throw new Error("first arg must be private key");
    if (u(w) === !1)
      throw new Error("second arg must be public key");
    const y = n.fromBytes(h);
    return e.fromBytes(w).multiply(y).toBytes(g);
  }
  const d = {
    isValidSecretKey: s,
    isValidPublicKey: i,
    randomSecretKey: c
  }, l = Zc(c, a);
  return Object.freeze({ getPublicKey: a, getSharedSecret: f, keygen: l, Point: e, utils: d, lengths: o });
}
function Uf(e, t, n = {}) {
  Bc(t), ks(n, {}, {
    hmac: "function",
    lowS: "boolean",
    randomBytes: "function",
    bits2int: "function",
    bits2int_modN: "function"
  }), n = Object.assign({}, n);
  const r = n.randomBytes || Wn, o = n.hmac || ((m, p) => Qc(t, m, p)), { Fp: s, Fn: i } = e, { ORDER: c, BITS: a } = i, { keygen: u, getPublicKey: f, getSharedSecret: d, utils: l, lengths: h } = Of(e, n), w = {
    prehash: !0,
    lowS: typeof n.lowS == "boolean" ? n.lowS : !0,
    format: "compact",
    extraEntropy: !1
  }, g = c * Jc < s.ORDER;
  function y(m) {
    const p = c >> Qe;
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
  function I(m, p) {
    Vo(p);
    const E = h.signature, A = p === "compact" ? E : p === "recovered" ? E + 1 : void 0;
    return z(m, A);
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
      I(p, E);
      let A;
      if (E === "der") {
        const { r: O, s: R } = me.toSig(z(p));
        return new N(O, R);
      }
      E === "recovered" && (A = p[0], E = "compact", p = p.subarray(1));
      const B = h.signature / 2, k = p.subarray(0, B), T = p.subarray(B, B * 2);
      return new N(i.fromBytes(k), i.fromBytes(T), A);
    }
    static fromHex(p, E) {
      return this.fromBytes(Er(p), E);
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
      const { r: E, s: A } = this, B = this.assertRecovery(), k = B === 2 || B === 3 ? E + c : E;
      if (!s.isValid(k))
        throw new Error("invalid recovery id: sig.r+curve.n != R.x");
      const T = s.toBytes(k), O = e.fromBytes(Kt(ta((B & 1) === 0), T)), R = i.inv(k), W = F(z(p, void 0, "msgHash")), H = i.create(-W * R), C = i.create(A * R), D = e.BASE.multiplyUnsafe(H).add(O.multiplyUnsafe(C));
      if (D.is0())
        throw new Error("invalid recovery: point at infinify");
      return D.assertValidity(), D;
    }
    // Signatures should be low-s, to prevent malleability.
    hasHighS() {
      return y(this.s);
    }
    toBytes(p = w.format) {
      if (Vo(p), p === "der")
        return Er(me.hexFromSig(this));
      const { r: E, s: A } = this, B = i.toBytes(E), k = i.toBytes(A);
      return p === "recovered" ? (v(), Kt(Uint8Array.of(this.assertRecovery()), B, k)) : Kt(B, k);
    }
    toHex(p) {
      return Xr(this.toBytes(p));
    }
  }
  const $ = n.bits2int || function(p) {
    if (p.length > 8192)
      throw new Error("input is too large");
    const E = de(p), A = p.length * 8 - a;
    return A > 0 ? E >> BigInt(A) : E;
  }, F = n.bits2int_modN || function(p) {
    return i.create($(p));
  }, x = As(a);
  function Y(m) {
    return _c("num < 2^" + a, m, ie, x), i.toBytes(m);
  }
  function L(m, p) {
    return z(m, void 0, "message"), p ? z(t(m), void 0, "prehashed message") : m;
  }
  function Pt(m, p, E) {
    const { lowS: A, prehash: B, extraEntropy: k } = Eo(E, w);
    m = L(m, B);
    const T = F(m), O = i.fromBytes(p);
    if (!i.isValidNot0(O))
      throw new Error("invalid private key");
    const R = [Y(O), Y(T)];
    if (k != null && k !== !1) {
      const D = k === !0 ? r(h.secretKey) : k;
      R.push(z(D, void 0, "extraEntropy"));
    }
    const W = Kt(...R), H = T;
    function C(D) {
      const q = $(D);
      if (!i.isValidNot0(q))
        return;
      const st = i.inv(q), M = e.BASE.multiply(q).toAffine(), Z = i.create(M.x);
      if (Z === ie)
        return;
      const ne = i.create(st * i.create(H + Z * O));
      if (ne === ie)
        return;
      let xn = (M.x === Z ? 0 : 2) | Number(M.y & Qe), Sn = ne;
      return A && y(ne) && (Sn = i.neg(ne), xn ^= 1), new N(Z, Sn, g ? void 0 : xn);
    }
    return { seed: W, k2sig: C };
  }
  function gt(m, p, E = {}) {
    const { seed: A, k2sig: B } = Pt(m, p, E);
    return df(t.outputLen, i.BYTES, o)(A, B).toBytes(E.format);
  }
  function _(m, p, E, A = {}) {
    const { lowS: B, prehash: k, format: T } = Eo(A, w);
    if (E = z(E, void 0, "publicKey"), p = L(p, k), !vs(m)) {
      const O = m instanceof N ? ", use sig.toBytes()" : "";
      throw new Error("verify expects Uint8Array signature" + O);
    }
    I(m, T);
    try {
      const O = N.fromBytes(m, T), R = e.fromBytes(E);
      if (B && O.hasHighS())
        return !1;
      const { r: W, s: H } = O, C = F(p), D = i.inv(H), q = i.create(C * D), st = i.create(W * D), M = e.BASE.multiplyUnsafe(q).add(R.multiplyUnsafe(st));
      return M.is0() ? !1 : i.create(M.x) === W;
    } catch {
      return !1;
    }
  }
  function b(m, p, E = {}) {
    const { prehash: A } = Eo(E, w);
    return p = L(p, A), N.fromBytes(m, "recovered").recoverPublicKey(p).toBytes();
  }
  return Object.freeze({
    keygen: u,
    getPublicKey: f,
    getSharedSecret: d,
    utils: l,
    lengths: h,
    Point: e,
    sign: gt,
    verify: _,
    recoverPublicKey: b,
    Signature: N,
    hash: t
  });
}
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const Jr = {
  p: BigInt("0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffefffffc2f"),
  n: BigInt("0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141"),
  h: BigInt(1),
  a: BigInt(0),
  b: BigInt(7),
  Gx: BigInt("0x79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798"),
  Gy: BigInt("0x483ada7726a3c4655da4fbfc0e1108a8fd17b448a68554199c47d08ffb10d4b8")
}, $f = {
  beta: BigInt("0x7ae96a2b657c07106e64479eac3434e99cf0497512f58995c1396c28719501ee"),
  basises: [
    [BigInt("0x3086d221a7d46bcde86c90e49284eb15"), -BigInt("0xe4437ed6010e88286f547fa90abfe4c3")],
    [BigInt("0x114ca50f7a8e2f3f657c1108d9d44cfd8"), BigInt("0x3086d221a7d46bcde86c90e49284eb15")]
  ]
}, Rf = /* @__PURE__ */ BigInt(0), Do = /* @__PURE__ */ BigInt(2);
function Nf(e) {
  const t = Jr.p, n = BigInt(3), r = BigInt(6), o = BigInt(11), s = BigInt(22), i = BigInt(23), c = BigInt(44), a = BigInt(88), u = e * e * e % t, f = u * u * e % t, d = Rt(f, n, t) * f % t, l = Rt(d, n, t) * f % t, h = Rt(l, Do, t) * u % t, w = Rt(h, o, t) * h % t, g = Rt(w, s, t) * w % t, y = Rt(g, c, t) * g % t, S = Rt(y, a, t) * y % t, v = Rt(S, c, t) * g % t, I = Rt(v, n, t) * f % t, N = Rt(I, i, t) * w % t, $ = Rt(N, r, t) * u % t, F = Rt($, Do, t);
  if (!vr.eql(vr.sqr(F), e))
    throw new Error("Cannot find square root");
  return F;
}
const vr = Qr(Jr.p, { sqrt: Nf }), qe = /* @__PURE__ */ Bf(Jr, {
  Fp: vr,
  endo: $f
}), xe = /* @__PURE__ */ Uf(qe, wt), Ei = {};
function Tr(e, ...t) {
  let n = Ei[e];
  if (n === void 0) {
    const r = wt(af(e));
    n = Kt(r, r), Ei[e] = n;
  }
  return wt(Kt(n, ...t));
}
const Bs = (e) => e.toBytes(!0).slice(1), Os = (e) => e % Do === Rf;
function Mo(e) {
  const { Fn: t, BASE: n } = qe, r = t.fromBytes(e), o = n.multiply(r);
  return { scalar: Os(o.y) ? r : t.neg(r), bytes: Bs(o) };
}
function na(e) {
  const t = vr;
  if (!t.isValidNot0(e))
    throw new Error("invalid x: Fail if x ≥ p");
  const n = t.create(e * e), r = t.create(n * e + BigInt(7));
  let o = t.sqrt(r);
  Os(o) || (o = t.neg(o));
  const s = qe.fromAffine({ x: e, y: o });
  return s.assertValidity(), s;
}
const On = de;
function ra(...e) {
  return qe.Fn.create(On(Tr("BIP0340/challenge", ...e)));
}
function xi(e) {
  return Mo(e).bytes;
}
function Lf(e, t, n = Wn(32)) {
  const { Fn: r } = qe, o = z(e, void 0, "message"), { bytes: s, scalar: i } = Mo(t), c = z(n, 32, "auxRand"), a = r.toBytes(i ^ On(Tr("BIP0340/aux", c))), u = Tr("BIP0340/nonce", a, s, o), { bytes: f, scalar: d } = Mo(u), l = ra(f, s, o), h = new Uint8Array(64);
  if (h.set(f, 0), h.set(r.toBytes(r.create(d + l * i)), 32), !oa(h, o, s))
    throw new Error("sign: Invalid signature produced");
  return h;
}
function oa(e, t, n) {
  const { Fp: r, Fn: o, BASE: s } = qe, i = z(e, 64, "signature"), c = z(t, void 0, "message"), a = z(n, 32, "publicKey");
  try {
    const u = na(On(a)), f = On(i.subarray(0, 32));
    if (!r.isValidNot0(f))
      return !1;
    const d = On(i.subarray(32, 64));
    if (!o.isValidNot0(d))
      return !1;
    const l = ra(o.toBytes(f), Bs(u), c), h = s.multiplyUnsafe(d).add(u.multiplyUnsafe(o.neg(l))), { x: w, y: g } = h.toAffine();
    return !(h.is0() || !Os(g) || w !== f);
  } catch {
    return !1;
  }
}
const le = /* @__PURE__ */ (() => {
  const n = (r = Wn(48)) => qc(r, Jr.n);
  return {
    keygen: Zc(n, xi),
    getPublicKey: xi,
    sign: Lf,
    verify: oa,
    Point: qe,
    utils: {
      randomSecretKey: n,
      taggedHash: Tr,
      lift_x: na,
      pointToBytes: Bs
    },
    lengths: {
      secretKey: 32,
      publicKey: 32,
      publicKeyHasPrefix: !1,
      signature: 64,
      seed: 48
    }
  };
})(), Cf = /* @__PURE__ */ Uint8Array.from([
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
]), sa = Uint8Array.from(new Array(16).fill(0).map((e, t) => t)), _f = sa.map((e) => (9 * e + 5) % 16), ia = /* @__PURE__ */ (() => {
  const n = [[sa], [_f]];
  for (let r = 0; r < 4; r++)
    for (let o of n)
      o.push(o[r].map((s) => Cf[s]));
  return n;
})(), ca = ia[0], aa = ia[1], ua = /* @__PURE__ */ [
  [11, 14, 15, 12, 5, 8, 7, 9, 11, 13, 14, 15, 6, 7, 9, 8],
  [12, 13, 11, 15, 6, 9, 9, 7, 12, 15, 11, 13, 7, 8, 7, 7],
  [13, 15, 14, 11, 7, 7, 6, 8, 13, 14, 13, 12, 5, 5, 6, 9],
  [14, 11, 12, 14, 8, 6, 5, 5, 15, 12, 15, 14, 9, 9, 8, 6],
  [15, 12, 13, 13, 9, 5, 8, 6, 14, 11, 12, 11, 8, 6, 5, 5]
].map((e) => Uint8Array.from(e)), Pf = /* @__PURE__ */ ca.map((e, t) => e.map((n) => ua[t][n])), Hf = /* @__PURE__ */ aa.map((e, t) => e.map((n) => ua[t][n])), Vf = /* @__PURE__ */ Uint32Array.from([
  0,
  1518500249,
  1859775393,
  2400959708,
  2840853838
]), Df = /* @__PURE__ */ Uint32Array.from([
  1352829926,
  1548603684,
  1836072691,
  2053994217,
  0
]);
function Si(e, t, n, r) {
  return e === 0 ? t ^ n ^ r : e === 1 ? t & n | ~t & r : e === 2 ? (t | ~n) ^ r : e === 3 ? t & r | n & ~r : t ^ (n | ~r);
}
const Jn = /* @__PURE__ */ new Uint32Array(16);
class Mf extends $c {
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
      Jn[h] = t.getUint32(n, !0);
    let r = this.h0 | 0, o = r, s = this.h1 | 0, i = s, c = this.h2 | 0, a = c, u = this.h3 | 0, f = u, d = this.h4 | 0, l = d;
    for (let h = 0; h < 5; h++) {
      const w = 4 - h, g = Vf[h], y = Df[h], S = ca[h], v = aa[h], I = Pf[h], N = Hf[h];
      for (let $ = 0; $ < 16; $++) {
        const F = Zn(r + Si(h, s, c, u) + Jn[S[$]] + g, I[$]) + d | 0;
        r = d, d = u, u = Zn(c, 10) | 0, c = s, s = F;
      }
      for (let $ = 0; $ < 16; $++) {
        const F = Zn(o + Si(w, i, a, f) + Jn[v[$]] + y, N[$]) + l | 0;
        o = l, l = f, f = Zn(a, 10) | 0, a = i, i = F;
      }
    }
    this.set(this.h1 + c + f | 0, this.h2 + u + l | 0, this.h3 + d + o | 0, this.h4 + r + i | 0, this.h0 + s + a | 0);
  }
  roundClean() {
    rn(Jn);
  }
  destroy() {
    this.destroyed = !0, rn(this.buffer), this.set(0, 0, 0, 0, 0);
  }
}
const Kf = /* @__PURE__ */ Uc(() => new Mf());
/*! scure-base - MIT License (c) 2022 Paul Miller (paulmillr.com) */
function sn(e) {
  return e instanceof Uint8Array || ArrayBuffer.isView(e) && e.constructor.name === "Uint8Array";
}
function fa(e) {
  if (!sn(e))
    throw new Error("Uint8Array expected");
}
function da(e, t) {
  return Array.isArray(t) ? t.length === 0 ? !0 : e ? t.every((n) => typeof n == "string") : t.every((n) => Number.isSafeInteger(n)) : !1;
}
function Us(e) {
  if (typeof e != "function")
    throw new Error("function expected");
  return !0;
}
function Ae(e, t) {
  if (typeof t != "string")
    throw new Error(`${e}: string expected`);
  return !0;
}
function mn(e) {
  if (!Number.isSafeInteger(e))
    throw new Error(`invalid integer: ${e}`);
}
function Ar(e) {
  if (!Array.isArray(e))
    throw new Error("array expected");
}
function kr(e, t) {
  if (!da(!0, t))
    throw new Error(`${e}: array of strings expected`);
}
function $s(e, t) {
  if (!da(!1, t))
    throw new Error(`${e}: array of numbers expected`);
}
// @__NO_SIDE_EFFECTS__
function zn(...e) {
  const t = (s) => s, n = (s, i) => (c) => s(i(c)), r = e.map((s) => s.encode).reduceRight(n, t), o = e.map((s) => s.decode).reduce(n, t);
  return { encode: r, decode: o };
}
// @__NO_SIDE_EFFECTS__
function to(e) {
  const t = typeof e == "string" ? e.split("") : e, n = t.length;
  kr("alphabet", t);
  const r = new Map(t.map((o, s) => [o, s]));
  return {
    encode: (o) => (Ar(o), o.map((s) => {
      if (!Number.isSafeInteger(s) || s < 0 || s >= n)
        throw new Error(`alphabet.encode: digit index outside alphabet "${s}". Allowed: ${e}`);
      return t[s];
    })),
    decode: (o) => (Ar(o), o.map((s) => {
      Ae("alphabet.decode", s);
      const i = r.get(s);
      if (i === void 0)
        throw new Error(`Unknown letter: "${s}". Allowed: ${e}`);
      return i;
    }))
  };
}
// @__NO_SIDE_EFFECTS__
function eo(e = "") {
  return Ae("join", e), {
    encode: (t) => (kr("join.decode", t), t.join(e)),
    decode: (t) => (Ae("join.decode", t), t.split(e))
  };
}
// @__NO_SIDE_EFFECTS__
function Ff(e, t = "=") {
  return mn(e), Ae("padding", t), {
    encode(n) {
      for (kr("padding.encode", n); n.length * e % 8; )
        n.push(t);
      return n;
    },
    decode(n) {
      kr("padding.decode", n);
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
function Wf(e) {
  return Us(e), { encode: (t) => t, decode: (t) => e(t) };
}
function vi(e, t, n) {
  if (t < 2)
    throw new Error(`convertRadix: invalid from=${t}, base cannot be less than 2`);
  if (n < 2)
    throw new Error(`convertRadix: invalid to=${n}, base cannot be less than 2`);
  if (Ar(e), !e.length)
    return [];
  let r = 0;
  const o = [], s = Array.from(e, (c) => {
    if (mn(c), c < 0 || c >= t)
      throw new Error(`invalid integer: ${c}`);
    return c;
  }), i = s.length;
  for (; ; ) {
    let c = 0, a = !0;
    for (let u = r; u < i; u++) {
      const f = s[u], d = t * c, l = d + f;
      if (!Number.isSafeInteger(l) || d / t !== c || l - f !== d)
        throw new Error("convertRadix: carry overflow");
      const h = l / n;
      c = l % n;
      const w = Math.floor(h);
      if (s[u] = w, !Number.isSafeInteger(w) || w * n + c !== l)
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
const la = (e, t) => t === 0 ? e : la(t, e % t), Ir = /* @__NO_SIDE_EFFECTS__ */ (e, t) => e + (t - la(e, t)), hr = /* @__PURE__ */ (() => {
  let e = [];
  for (let t = 0; t < 40; t++)
    e.push(2 ** t);
  return e;
})();
function Ko(e, t, n, r) {
  if (Ar(e), t <= 0 || t > 32)
    throw new Error(`convertRadix2: wrong from=${t}`);
  if (n <= 0 || n > 32)
    throw new Error(`convertRadix2: wrong to=${n}`);
  if (/* @__PURE__ */ Ir(t, n) > 32)
    throw new Error(`convertRadix2: carry overflow from=${t} to=${n} carryBits=${/* @__PURE__ */ Ir(t, n)}`);
  let o = 0, s = 0;
  const i = hr[t], c = hr[n] - 1, a = [];
  for (const u of e) {
    if (mn(u), u >= i)
      throw new Error(`convertRadix2: invalid data word=${u} from=${t}`);
    if (o = o << t | u, s + t > 32)
      throw new Error(`convertRadix2: carry overflow pos=${s} from=${t}`);
    for (s += t; s >= n; s -= n)
      a.push((o >> s - n & c) >>> 0);
    const f = hr[s];
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
function Gf(e) {
  mn(e);
  const t = 2 ** 8;
  return {
    encode: (n) => {
      if (!sn(n))
        throw new Error("radix.encode input should be Uint8Array");
      return vi(Array.from(n), t, e);
    },
    decode: (n) => ($s("radix.decode", n), Uint8Array.from(vi(n, e, t)))
  };
}
// @__NO_SIDE_EFFECTS__
function Rs(e, t = !1) {
  if (mn(e), e <= 0 || e > 32)
    throw new Error("radix2: bits should be in (0..32]");
  if (/* @__PURE__ */ Ir(8, e) > 32 || /* @__PURE__ */ Ir(e, 8) > 32)
    throw new Error("radix2: carry overflow");
  return {
    encode: (n) => {
      if (!sn(n))
        throw new Error("radix2.encode input should be Uint8Array");
      return Ko(Array.from(n), 8, e, !t);
    },
    decode: (n) => ($s("radix2.decode", n), Uint8Array.from(Ko(n, e, 8, t)))
  };
}
function Ti(e) {
  return Us(e), function(...t) {
    try {
      return e.apply(null, t);
    } catch {
    }
  };
}
function zf(e, t) {
  return mn(e), Us(t), {
    encode(n) {
      if (!sn(n))
        throw new Error("checksum.encode: input should be Uint8Array");
      const r = t(n).slice(0, e), o = new Uint8Array(n.length + e);
      return o.set(n), o.set(r, n.length), o;
    },
    decode(n) {
      if (!sn(n))
        throw new Error("checksum.decode: input should be Uint8Array");
      const r = n.slice(0, -e), o = n.slice(-e), s = t(r).slice(0, e);
      for (let i = 0; i < e; i++)
        if (s[i] !== o[i])
          throw new Error("Invalid checksum");
      return r;
    }
  };
}
const qf = typeof Uint8Array.from([]).toBase64 == "function" && typeof Uint8Array.fromBase64 == "function", jf = (e, t) => {
  Ae("base64", e);
  const n = /^[A-Za-z0-9=+/]+$/, r = "base64";
  if (e.length > 0 && !n.test(e))
    throw new Error("invalid base64");
  return Uint8Array.fromBase64(e, { alphabet: r, lastChunkHandling: "strict" });
}, Et = qf ? {
  encode(e) {
    return fa(e), e.toBase64();
  },
  decode(e) {
    return jf(e);
  }
} : /* @__PURE__ */ zn(/* @__PURE__ */ Rs(6), /* @__PURE__ */ to("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"), /* @__PURE__ */ Ff(6), /* @__PURE__ */ eo("")), Yf = /* @__NO_SIDE_EFFECTS__ */ (e) => /* @__PURE__ */ zn(/* @__PURE__ */ Gf(58), /* @__PURE__ */ to(e), /* @__PURE__ */ eo("")), Fo = /* @__PURE__ */ Yf("123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"), Zf = (e) => /* @__PURE__ */ zn(zf(4, (t) => e(e(t))), Fo), Wo = /* @__PURE__ */ zn(/* @__PURE__ */ to("qpzry9x8gf2tvdw0s3jn54khce6mua7l"), /* @__PURE__ */ eo("")), Ai = [996825010, 642813549, 513874426, 1027748829, 705979059];
function vn(e) {
  const t = e >> 25;
  let n = (e & 33554431) << 5;
  for (let r = 0; r < Ai.length; r++)
    (t >> r & 1) === 1 && (n ^= Ai[r]);
  return n;
}
function ki(e, t, n = 1) {
  const r = e.length;
  let o = 1;
  for (let s = 0; s < r; s++) {
    const i = e.charCodeAt(s);
    if (i < 33 || i > 126)
      throw new Error(`Invalid prefix (${e})`);
    o = vn(o) ^ i >> 5;
  }
  o = vn(o);
  for (let s = 0; s < r; s++)
    o = vn(o) ^ e.charCodeAt(s) & 31;
  for (let s of t)
    o = vn(o) ^ s;
  for (let s = 0; s < 6; s++)
    o = vn(o);
  return o ^= n, Wo.encode(Ko([o % hr[30]], 30, 5, !1));
}
// @__NO_SIDE_EFFECTS__
function ha(e) {
  const t = e === "bech32" ? 1 : 734539939, n = /* @__PURE__ */ Rs(5), r = n.decode, o = n.encode, s = Ti(r);
  function i(d, l, h = 90) {
    Ae("bech32.encode prefix", d), sn(l) && (l = Array.from(l)), $s("bech32.encode", l);
    const w = d.length;
    if (w === 0)
      throw new TypeError(`Invalid prefix length ${w}`);
    const g = w + 7 + l.length;
    if (h !== !1 && g > h)
      throw new TypeError(`Length ${g} exceeds limit ${h}`);
    const y = d.toLowerCase(), S = ki(y, l, t);
    return `${y}1${Wo.encode(l)}${S}`;
  }
  function c(d, l = 90) {
    Ae("bech32.decode input", d);
    const h = d.length;
    if (h < 8 || l !== !1 && h > l)
      throw new TypeError(`invalid string length: ${h} (${d}). Expected (8..${l})`);
    const w = d.toLowerCase();
    if (d !== w && d !== d.toUpperCase())
      throw new Error("String must be lowercase or uppercase");
    const g = w.lastIndexOf("1");
    if (g === 0 || g === -1)
      throw new Error('Letter "1" must be present between prefix and data only');
    const y = w.slice(0, g), S = w.slice(g + 1);
    if (S.length < 6)
      throw new Error("Data must be at least 6 characters long");
    const v = Wo.decode(S).slice(0, -6), I = ki(y, v, t);
    if (!S.endsWith(I))
      throw new Error(`Invalid checksum in ${d}: expected "${I}"`);
    return { prefix: y, words: v };
  }
  const a = Ti(c);
  function u(d) {
    const { prefix: l, words: h } = c(d, !1);
    return { prefix: l, words: h, bytes: r(h) };
  }
  function f(d, l) {
    return i(d, o(l));
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
const Go = /* @__PURE__ */ ha("bech32"), Ye = /* @__PURE__ */ ha("bech32m"), Xf = {
  encode: (e) => new TextDecoder().decode(e),
  decode: (e) => new TextEncoder().encode(e)
}, Qf = typeof Uint8Array.from([]).toHex == "function" && typeof Uint8Array.fromHex == "function", Jf = {
  encode(e) {
    return fa(e), e.toHex();
  },
  decode(e) {
    return Ae("hex", e), Uint8Array.fromHex(e);
  }
}, U = Qf ? Jf : /* @__PURE__ */ zn(/* @__PURE__ */ Rs(4), /* @__PURE__ */ to("0123456789abcdef"), /* @__PURE__ */ eo(""), /* @__PURE__ */ Wf((e) => {
  if (typeof e != "string" || e.length % 2 !== 0)
    throw new TypeError(`hex.decode: expected string, got ${typeof e} with length ${e.length}`);
  return e.toLowerCase();
})), ot = /* @__PURE__ */ Uint8Array.of(), pa = /* @__PURE__ */ Uint8Array.of(0);
function cn(e, t) {
  if (e.length !== t.length)
    return !1;
  for (let n = 0; n < e.length; n++)
    if (e[n] !== t[n])
      return !1;
  return !0;
}
function Ct(e) {
  return e instanceof Uint8Array || ArrayBuffer.isView(e) && e.constructor.name === "Uint8Array";
}
function td(...e) {
  let t = 0;
  for (let r = 0; r < e.length; r++) {
    const o = e[r];
    if (!Ct(o))
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
const ga = (e) => new DataView(e.buffer, e.byteOffset, e.byteLength);
function qn(e) {
  return Object.prototype.toString.call(e) === "[object Object]";
}
function Jt(e) {
  return Number.isSafeInteger(e);
}
const Ns = {
  equalBytes: cn,
  isBytes: Ct,
  concatBytes: td
}, wa = (e) => {
  if (e !== null && typeof e != "string" && !Ft(e) && !Ct(e) && !Jt(e))
    throw new Error(`lengthCoder: expected null | number | Uint8Array | CoderType, got ${e} (${typeof e})`);
  return {
    encodeStream(t, n) {
      if (e === null)
        return;
      if (Ft(e))
        return e.encodeStream(t, n);
      let r;
      if (typeof e == "number" ? r = e : typeof e == "string" && (r = fe.resolve(t.stack, e)), typeof r == "bigint" && (r = Number(r)), r === void 0 || r !== n)
        throw t.err(`Wrong length: ${r} len=${e} exp=${n} (${typeof n})`);
    },
    decodeStream(t) {
      let n;
      if (Ft(e) ? n = Number(e.decodeStream(t)) : typeof e == "number" ? n = e : typeof e == "string" && (n = fe.resolve(t.stack, e)), typeof n == "bigint" && (n = Number(n)), typeof n != "number")
        throw t.err(`Wrong length: ${n}`);
      return n;
    }
  };
}, lt = {
  BITS: 32,
  FULL_MASK: -1 >>> 0,
  // 1<<32 will overflow
  len: (e) => Math.ceil(e / 32),
  create: (e) => new Uint32Array(lt.len(e)),
  clean: (e) => e.fill(0),
  debug: (e) => Array.from(e).map((t) => (t >>> 0).toString(2).padStart(32, "0")),
  checkLen: (e, t) => {
    if (lt.len(t) !== e.length)
      throw new Error(`wrong length=${e.length}. Expected: ${lt.len(t)}`);
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
    lt.checkLen(e, t);
    const { FULL_MASK: r, BITS: o } = lt, s = o - t % o, i = s ? r >>> s << s : r, c = [];
    for (let a = 0; a < e.length; a++) {
      let u = e[a];
      if (n && (u = ~u), a === e.length - 1 && (u &= i), u !== 0)
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
  rangeDebug: (e, t, n = !1) => `[${lt.range(lt.indices(e, t, n)).map((r) => `(${r.pos}/${r.length})`).join(", ")}]`,
  setRange: (e, t, n, r, o = !0) => {
    lt.chunkLen(t, n, r);
    const { FULL_MASK: s, BITS: i } = lt, c = n % i ? Math.floor(n / i) : void 0, a = n + r, u = a % i ? Math.floor(a / i) : void 0;
    if (c !== void 0 && c === u)
      return lt.set(e, c, s >>> i - r << i - r - n, o);
    if (c !== void 0 && !lt.set(e, c, s >>> n % i, o))
      return !1;
    const f = c !== void 0 ? c + 1 : n / i, d = u !== void 0 ? u : a / i;
    for (let l = f; l < d; l++)
      if (!lt.set(e, l, s, o))
        return !1;
    return !(u !== void 0 && c !== u && !lt.set(e, u, s << i - a % i, o));
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
class Ls {
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
    this.data = t, this.opts = n, this.stack = r, this.parent = o, this.parentOffset = s, this.view = ga(t);
  }
  /** Internal method for pointers. */
  _enablePointers() {
    if (this.parent)
      return this.parent._enablePointers();
    this.bs || (this.bs = lt.create(this.data.length), lt.setRange(this.bs, this.data.length, 0, this.pos, this.opts.allowMultipleReads));
  }
  markBytesBS(t, n) {
    return this.parent ? this.parent.markBytesBS(this.parentOffset + t, n) : !n || !this.bs ? !0 : lt.setRange(this.bs, this.data.length, t, n, !1);
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
        throw this.err(`${this.bitPos} bits left after unpack: ${U.encode(this.data.slice(this.pos))}`);
      if (this.bs && !this.parent) {
        const t = lt.indices(this.bs, this.data.length, !0);
        if (t.length) {
          const n = lt.range(t).map(({ pos: r, length: o }) => `(${r}/${o})[${U.encode(this.data.subarray(r, r + o))}]`).join(", ");
          throw this.err(`unread byte ranges: ${n} (total=${this.data.length})`);
        } else
          return;
      }
      if (!this.isEnd())
        throw this.err(`${this.leftBytes} bytes ${this.bitPos} bits left after unpack: ${U.encode(this.data.slice(this.pos))}`);
    }
  }
  // User methods
  err(t) {
    return fe.err("Reader", this.stack, t);
  }
  offsetReader(t) {
    if (t > this.data.length)
      throw this.err("offsetReader: Unexpected end of buffer");
    return new Ls(this.absBytes(t), this.opts, this.stack, this, t);
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
    if (!Ct(t))
      throw this.err(`find: needle is not bytes! ${t}`);
    if (this.bitPos)
      throw this.err("findByte: bitPos not empty");
    if (!t.length)
      throw this.err("find: needle is empty");
    for (let r = n; (r = this.data.indexOf(t[0], r)) !== -1; r++) {
      if (r === -1 || this.data.length - r < t.length)
        return;
      if (cn(t, this.data.subarray(r, r + t.length)))
        return r;
    }
  }
}
class ed {
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
    this.stack = t, this.view = ga(this.viewBuf);
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
const zo = (e) => Uint8Array.from(e).reverse();
function nd(e, t, n) {
  if (n) {
    const r = 2n ** (t - 1n);
    if (e < -r || e >= r)
      throw new Error(`value out of signed bounds. Expected ${-r} <= ${e} < ${r}`);
  } else if (0n > e || e >= 2n ** t)
    throw new Error(`value out of unsigned bounds. Expected 0 <= ${e} < ${2n ** t}`);
}
function ya(e) {
  return {
    // NOTE: we cannot export validate here, since it is likely mistake.
    encodeStream: e.encodeStream,
    decodeStream: e.decodeStream,
    size: e.size,
    encode: (t) => {
      const n = new ed();
      return e.encodeStream(n, t), n.finish();
    },
    decode: (t, n = {}) => {
      const r = new Ls(t, n), o = e.decodeStream(r);
      return r.finish(), o;
    }
  };
}
function At(e, t) {
  if (!Ft(e))
    throw new Error(`validate: invalid inner value ${e}`);
  if (typeof t != "function")
    throw new Error("validate: fn should be function");
  return ya({
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
  const t = ya(e);
  return e.validate ? At(t, e.validate) : t;
}, no = (e) => qn(e) && typeof e.decode == "function" && typeof e.encode == "function";
function Ft(e) {
  return qn(e) && no(e) && typeof e.encodeStream == "function" && typeof e.decodeStream == "function" && (e.size === void 0 || Jt(e.size));
}
function rd() {
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
      if (!qn(e))
        throw new Error(`expected plain object, got ${e}`);
      return Object.entries(e);
    }
  };
}
const od = {
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
function sd(e) {
  if (!qn(e))
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
function id(e, t = !1) {
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
      const u = Math.min(c.length, e), f = BigInt(c.slice(0, u)) * 10n ** BigInt(e - u), d = a + f;
      return o ? -d : d;
    }
  };
}
function cd(e) {
  if (!Array.isArray(e))
    throw new Error(`expected array, got ${typeof e}`);
  for (const t of e)
    if (!no(t))
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
const ma = (e) => {
  if (!no(e))
    throw new Error("BaseCoder expected");
  return { encode: e.decode, decode: e.encode };
}, ro = { dict: rd, numberBigint: od, tsEnum: sd, decimal: id, match: cd, reverse: ma }, Cs = (e, t = !1, n = !1, r = !0) => {
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
      const c = i.bytes(r ? e : Math.min(e, i.leftBytes)), a = t ? c : zo(c);
      let u = 0n;
      for (let f = 0; f < a.length; f++)
        u |= BigInt(a[f]) << 8n * BigInt(f);
      return n && u & s && (u = (u ^ s) - s), u;
    },
    validate: (i) => {
      if (typeof i != "bigint")
        throw new Error(`bigint: invalid value: ${i}`);
      return nd(i, 8n * o, !!n), i;
    }
  });
}, ba = /* @__PURE__ */ Cs(32, !1), pr = /* @__PURE__ */ Cs(8, !0), ad = /* @__PURE__ */ Cs(8, !0, !0), ud = (e, t) => kt({
  size: e,
  encodeStream: (n, r) => n.writeView(e, (o) => t.write(o, r)),
  decodeStream: (n) => n.readView(e, t.read),
  validate: (n) => {
    if (typeof n != "number")
      throw new Error(`viewCoder: expected number, got ${typeof n}`);
    return t.validate && t.validate(n), n;
  }
}), jn = (e, t, n) => {
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
  return ud(e, {
    write: n.write,
    read: n.read,
    validate: t ? s : c
  });
}, X = /* @__PURE__ */ jn(4, !1, {
  read: (e, t) => e.getUint32(t, !0),
  write: (e, t) => e.setUint32(0, t, !0)
}), fd = /* @__PURE__ */ jn(4, !1, {
  read: (e, t) => e.getUint32(t, !1),
  write: (e, t) => e.setUint32(0, t, !1)
}), Ze = /* @__PURE__ */ jn(4, !0, {
  read: (e, t) => e.getInt32(t, !0),
  write: (e, t) => e.setInt32(0, t, !0)
}), Ii = /* @__PURE__ */ jn(2, !1, {
  read: (e, t) => e.getUint16(t, !0),
  write: (e, t) => e.setUint16(0, t, !0)
}), Se = /* @__PURE__ */ jn(1, !1, {
  read: (e, t) => e.getUint8(t),
  write: (e, t) => e.setUint8(0, t)
}), rt = (e, t = !1) => {
  if (typeof t != "boolean")
    throw new Error(`bytes/le: expected boolean, got ${typeof t}`);
  const n = wa(e), r = Ct(e);
  return kt({
    size: typeof e == "number" ? e : void 0,
    encodeStream: (o, s) => {
      r || n.encodeStream(o, s.length), o.bytes(t ? zo(s) : s), r && o.bytes(e);
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
      return t ? zo(s) : s;
    },
    validate: (o) => {
      if (!Ct(o))
        throw new Error(`bytes: invalid value ${o}`);
      return o;
    }
  });
};
function dd(e, t) {
  if (!Ft(t))
    throw new Error(`prefix: invalid inner value ${t}`);
  return ke(rt(e), ma(t));
}
const _s = (e, t = !1) => At(ke(rt(e, t), Xf), (n) => {
  if (typeof n != "string")
    throw new Error(`expected string, got ${typeof n}`);
  return n;
}), ld = (e, t = { isLE: !1, with0x: !1 }) => {
  let n = ke(rt(e, t.isLE), U);
  const r = t.with0x;
  if (typeof r != "boolean")
    throw new Error(`hex/with0x: expected boolean, got ${typeof r}`);
  return r && (n = ke(n, {
    encode: (o) => `0x${o}`,
    decode: (o) => {
      if (!o.startsWith("0x"))
        throw new Error("hex(with0x=true).encode input should start with 0x");
      return o.slice(2);
    }
  })), n;
};
function ke(e, t) {
  if (!Ft(e))
    throw new Error(`apply: invalid inner value ${e}`);
  if (!no(t))
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
const hd = (e, t = !1) => {
  if (!Ct(e))
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
      return r && (r = cn(n.bytes(e.length, !0), e), r && n.bytes(e.length)), r !== t;
    },
    validate: (n) => {
      if (n !== void 0 && typeof n != "boolean")
        throw new Error(`flag: expected boolean value or undefined, got ${typeof n}`);
      return n;
    }
  });
};
function pd(e, t, n) {
  if (!Ft(t))
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
function Ps(e, t, n = !0) {
  if (!Ft(e))
    throw new Error(`magic: invalid inner value ${e}`);
  if (typeof n != "boolean")
    throw new Error(`magic: expected boolean, got ${typeof n}`);
  return kt({
    size: e.size,
    encodeStream: (r, o) => e.encodeStream(r, t),
    decodeStream: (r) => {
      const o = e.decodeStream(r);
      if (n && typeof o != "object" && o !== t || Ct(t) && !cn(t, o))
        throw r.err(`magic: invalid value: ${o} !== ${t}`);
    },
    validate: (r) => {
      if (r !== void 0)
        throw new Error(`magic: wrong value=${typeof r}`);
      return r;
    }
  });
}
function Ea(e) {
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
  if (!qn(e))
    throw new Error(`struct: expected plain object, got ${e}`);
  for (const t in e)
    if (!Ft(e[t]))
      throw new Error(`struct: field ${t} is not CoderType`);
  return kt({
    size: Ea(Object.values(e)),
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
function gd(e) {
  if (!Array.isArray(e))
    throw new Error(`Packed.Tuple: got ${typeof e} instead of array`);
  for (let t = 0; t < e.length; t++)
    if (!Ft(e[t]))
      throw new Error(`tuple: field ${t} is not CoderType`);
  return kt({
    size: Ea(e),
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
  if (!Ft(t))
    throw new Error(`array: invalid inner value ${t}`);
  const n = wa(typeof e == "string" ? `../${e}` : e);
  return kt({
    size: typeof e == "number" && t.size ? e * t.size : void 0,
    encodeStream: (r, o) => {
      const s = r;
      s.pushObj(o, (i) => {
        Ct(e) || n.encodeStream(r, o.length);
        for (let c = 0; c < o.length; c++)
          i(`${c}`, () => {
            const a = o[c], u = r.pos;
            if (t.encodeStream(r, a), Ct(e)) {
              if (e.length > s.pos - u)
                return;
              const f = s.finish(!1).subarray(u, s.pos);
              if (cn(f.subarray(0, e.length), e))
                throw s.err(`array: inner element encoding same as separator. elm=${a} data=${f}`);
            }
          });
      }), Ct(e) && r.bytes(e);
    },
    decodeStream: (r) => {
      const o = [];
      return r.pushObj(o, (s) => {
        if (e === null)
          for (let i = 0; !r.isEnd() && (s(`${i}`, () => o.push(t.decodeStream(r))), !(t.size && r.leftBytes < t.size)); i++)
            ;
        else if (Ct(e))
          for (let i = 0; ; i++) {
            if (cn(r.bytes(e.length, !0), e)) {
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
const bn = xe.Point, Bi = bn.Fn, xa = bn.Fn.ORDER, Yn = (e) => e % 2n === 0n, nt = Ns.isBytes, Ee = Ns.concatBytes, ct = Ns.equalBytes, Sa = (e) => Kf(wt(e)), ge = (...e) => wt(wt(Ee(...e))), qo = le.utils.randomSecretKey, Hs = le.getPublicKey, va = xe.getPublicKey, Oi = (e) => e.r < xa / 2n;
function wd(e, t, n = !1) {
  let r = xe.Signature.fromBytes(xe.sign(e, t, { prehash: !1 }));
  if (n && !Oi(r)) {
    const o = new Uint8Array(32);
    let s = 0;
    for (; !Oi(r); )
      if (o.set(X.encode(s++)), r = xe.Signature.fromBytes(xe.sign(e, t, { prehash: !1, extraEntropy: o })), s > 4294967295)
        throw new Error("lowR counter overflow: report the error");
  }
  return r.toBytes("der");
}
const Ui = le.sign, Vs = le.utils.taggedHash, It = {
  ecdsa: 0,
  schnorr: 1
};
function an(e, t) {
  const n = e.length;
  if (t === It.ecdsa) {
    if (n === 32)
      throw new Error("Expected non-Schnorr key");
    return bn.fromBytes(e), e;
  } else if (t === It.schnorr) {
    if (n !== 32)
      throw new Error("Expected 32-byte Schnorr key");
    return le.utils.lift_x(de(e)), e;
  } else
    throw new Error("Unknown key type");
}
function Ta(e, t) {
  const r = le.utils.taggedHash("TapTweak", e, t), o = de(r);
  if (o >= xa)
    throw new Error("tweak higher than curve order");
  return o;
}
function yd(e, t = Uint8Array.of()) {
  const n = le.utils, r = de(e), o = bn.BASE.multiply(r), s = Yn(o.y) ? r : Bi.neg(r), i = n.pointToBytes(o), c = Ta(i, t);
  return Gn(Bi.add(s, c), 32);
}
function jo(e, t) {
  const n = le.utils, r = Ta(e, t), s = n.lift_x(de(e)).add(bn.BASE.multiply(r)), i = Yn(s.y) ? 0 : 1;
  return [n.pointToBytes(s), i];
}
const Ds = wt(bn.BASE.toBytes(!1)), un = {
  bech32: "bc",
  pubKeyHash: 0,
  scriptHash: 5,
  wif: 128
}, tr = {
  bech32: "tb",
  pubKeyHash: 111,
  scriptHash: 196,
  wif: 239
};
function Br(e, t) {
  if (!nt(e) || !nt(t))
    throw new Error(`cmp: wrong type a=${typeof e} b=${typeof t}`);
  const n = Math.min(e.length, t.length);
  for (let r = 0; r < n; r++)
    if (e[r] != t[r])
      return Math.sign(e[r] - t[r]);
  return Math.sign(e.length - t.length);
}
function Aa(e) {
  const t = {};
  for (const n in e) {
    if (t[e[n]] !== void 0)
      throw new Error("duplicate key");
    t[e[n]] = n;
  }
  return t;
}
const dt = {
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
}, md = Aa(dt);
function Ms(e = 6, t = !1) {
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
function bd(e, t = 4, n = !0) {
  if (typeof e == "number")
    return e;
  if (nt(e))
    try {
      const r = Ms(t, n).decode(e);
      return r > Number.MAX_SAFE_INTEGER ? void 0 : Number(r);
    } catch {
      return;
    }
}
const K = kt({
  encodeStream: (e, t) => {
    for (let n of t) {
      if (typeof n == "string") {
        if (dt[n] === void 0)
          throw new Error(`Unknown opcode=${n}`);
        e.byte(dt[n]);
        continue;
      } else if (typeof n == "number") {
        if (n === 0) {
          e.byte(0);
          continue;
        } else if (1 <= n && n <= 16) {
          e.byte(dt.OP_1 - 1 + n);
          continue;
        }
      }
      if (typeof n == "number" && (n = Ms().encode(BigInt(n))), !nt(n))
        throw new Error(`Wrong Script OP=${n} (${typeof n})`);
      const r = n.length;
      r < dt.PUSHDATA1 ? e.byte(r) : r <= 255 ? (e.byte(dt.PUSHDATA1), e.byte(r)) : r <= 65535 ? (e.byte(dt.PUSHDATA2), e.bytes(Ii.encode(r))) : (e.byte(dt.PUSHDATA4), e.bytes(X.encode(r))), e.bytes(n);
    }
  },
  decodeStream: (e) => {
    const t = [];
    for (; !e.isEnd(); ) {
      const n = e.byte();
      if (dt.OP_0 < n && n <= dt.PUSHDATA4) {
        let r;
        if (n < dt.PUSHDATA1)
          r = n;
        else if (n === dt.PUSHDATA1)
          r = Se.decodeStream(e);
        else if (n === dt.PUSHDATA2)
          r = Ii.decodeStream(e);
        else if (n === dt.PUSHDATA4)
          r = X.decodeStream(e);
        else
          throw new Error("Should be not possible");
        t.push(e.bytes(r));
      } else if (n === 0)
        t.push(0);
      else if (dt.OP_1 <= n && n <= dt.OP_16)
        t.push(n - (dt.OP_1 - 1));
      else {
        const r = md[n];
        if (r === void 0)
          throw new Error(`Unknown opcode=${n.toString(16)}`);
        t.push(r);
      }
    }
    return t;
  }
}), $i = {
  253: [253, 2, 253n, 65535n],
  254: [254, 4, 65536n, 4294967295n],
  255: [255, 8, 4294967296n, 18446744073709551615n]
}, oo = kt({
  encodeStream: (e, t) => {
    if (typeof t == "number" && (t = BigInt(t)), 0n <= t && t <= 252n)
      return e.byte(Number(t));
    for (const [n, r, o, s] of Object.values($i))
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
    const [n, r, o] = $i[t];
    let s = 0n;
    for (let i = 0; i < r; i++)
      s |= BigInt(e.byte()) << 8n * BigInt(i);
    if (s < o)
      throw e.err(`Wrong CompactSize(${8 * r})`);
    return s;
  }
}), Wt = ke(oo, ro.numberBigint), Mt = rt(oo), _n = Tt(Wt, Mt), Or = (e) => Tt(oo, e), ka = pt({
  txid: rt(32, !0),
  // hash(prev_tx),
  index: X,
  // output number of previous tx
  finalScriptSig: Mt,
  // btc merges input and output script, executes it. If ok = tx passes
  sequence: X
  // ?
}), Pe = pt({ amount: pr, script: Mt }), Ed = pt({
  version: Ze,
  segwitFlag: hd(new Uint8Array([0, 1])),
  inputs: Or(ka),
  outputs: Or(Pe),
  witnesses: pd("segwitFlag", Tt("inputs/length", _n)),
  // < 500000000	Block number at which this transaction is unlocked
  // >= 500000000	UNIX timestamp at which this transaction is unlocked
  // Handled as part of PSBTv2
  lockTime: X
});
function xd(e) {
  if (e.segwitFlag && e.witnesses && !e.witnesses.length)
    throw new Error("Segwit flag with empty witnesses array");
  return e;
}
const Je = At(Ed, xd), Bn = pt({
  version: Ze,
  inputs: Or(ka),
  outputs: Or(Pe),
  lockTime: X
}), Yo = At(rt(null), (e) => an(e, It.ecdsa)), Ur = At(rt(32), (e) => an(e, It.schnorr)), Ri = At(rt(null), (e) => {
  if (e.length !== 64 && e.length !== 65)
    throw new Error("Schnorr signature should be 64 or 65 bytes long");
  return e;
}), so = pt({
  fingerprint: fd,
  path: Tt(null, X)
}), Ia = pt({
  hashes: Tt(Wt, rt(32)),
  der: so
}), Sd = rt(78), vd = pt({ pubKey: Ur, leafHash: rt(32) }), Td = pt({
  version: Se,
  // With parity :(
  internalKey: rt(32),
  merklePath: Tt(null, rt(32))
}), Zt = At(Td, (e) => {
  if (e.merklePath.length > 128)
    throw new Error("TaprootControlBlock: merklePath should be of length 0..128 (inclusive)");
  return e;
}), Ad = Tt(null, pt({
  depth: Se,
  version: Se,
  script: Mt
})), it = rt(null), Ni = rt(20), Tn = rt(32), Ks = {
  unsignedTx: [0, !1, Bn, [0], [0], !1],
  xpub: [1, Sd, so, [], [0, 2], !1],
  txVersion: [2, !1, X, [2], [2], !1],
  fallbackLocktime: [3, !1, X, [], [2], !1],
  inputCount: [4, !1, Wt, [2], [2], !1],
  outputCount: [5, !1, Wt, [2], [2], !1],
  txModifiable: [6, !1, Se, [], [2], !1],
  // TODO: bitfield
  version: [251, !1, X, [], [0, 2], !1],
  proprietary: [252, it, it, [], [0, 2], !1]
}, io = {
  nonWitnessUtxo: [0, !1, Je, [], [0, 2], !1],
  witnessUtxo: [1, !1, Pe, [], [0, 2], !1],
  partialSig: [2, Yo, it, [], [0, 2], !1],
  sighashType: [3, !1, X, [], [0, 2], !1],
  redeemScript: [4, !1, it, [], [0, 2], !1],
  witnessScript: [5, !1, it, [], [0, 2], !1],
  bip32Derivation: [6, Yo, so, [], [0, 2], !1],
  finalScriptSig: [7, !1, it, [], [0, 2], !1],
  finalScriptWitness: [8, !1, _n, [], [0, 2], !1],
  porCommitment: [9, !1, it, [], [0, 2], !1],
  ripemd160: [10, Ni, it, [], [0, 2], !1],
  sha256: [11, Tn, it, [], [0, 2], !1],
  hash160: [12, Ni, it, [], [0, 2], !1],
  hash256: [13, Tn, it, [], [0, 2], !1],
  txid: [14, !1, Tn, [2], [2], !0],
  index: [15, !1, X, [2], [2], !0],
  sequence: [16, !1, X, [], [2], !0],
  requiredTimeLocktime: [17, !1, X, [], [2], !1],
  requiredHeightLocktime: [18, !1, X, [], [2], !1],
  tapKeySig: [19, !1, Ri, [], [0, 2], !1],
  tapScriptSig: [20, vd, Ri, [], [0, 2], !1],
  tapLeafScript: [21, Zt, it, [], [0, 2], !1],
  tapBip32Derivation: [22, Tn, Ia, [], [0, 2], !1],
  tapInternalKey: [23, !1, Ur, [], [0, 2], !1],
  tapMerkleRoot: [24, !1, Tn, [], [0, 2], !1],
  proprietary: [252, it, it, [], [0, 2], !1]
}, kd = [
  "txid",
  "sequence",
  "index",
  "witnessUtxo",
  "nonWitnessUtxo",
  "finalScriptSig",
  "finalScriptWitness",
  "unknown"
], Id = [
  "partialSig",
  "finalScriptSig",
  "finalScriptWitness",
  "tapKeySig",
  "tapScriptSig"
], Pn = {
  redeemScript: [0, !1, it, [], [0, 2], !1],
  witnessScript: [1, !1, it, [], [0, 2], !1],
  bip32Derivation: [2, Yo, so, [], [0, 2], !1],
  amount: [3, !1, ad, [2], [2], !0],
  script: [4, !1, it, [2], [2], !0],
  tapInternalKey: [5, !1, Ur, [], [0, 2], !1],
  tapTree: [6, !1, Ad, [], [0, 2], !1],
  tapBip32Derivation: [7, Ur, Ia, [], [0, 2], !1],
  proprietary: [252, it, it, [], [0, 2], !1]
}, Bd = [], Li = Tt(pa, pt({
  //  <key> := <keylen> <keytype> <keydata> WHERE keylen = len(keytype)+len(keydata)
  key: dd(Wt, pt({ type: Wt, key: rt(null) })),
  //  <value> := <valuelen> <valuedata>
  value: rt(Wt)
}));
function Zo(e) {
  const [t, n, r, o, s, i] = e;
  return { type: t, kc: n, vc: r, reqInc: o, allowInc: s, silentIgnore: i };
}
pt({ type: Wt, key: rt(null) });
function Fs(e) {
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
          const f = i.map(([d, l]) => [
            a.encode(d),
            u.encode(l)
          ]);
          f.sort((d, l) => Br(d[0], l[0]));
          for (const [d, l] of f)
            o.push({ key: { key: d, type: c }, value: l });
        }
      }
      if (r.unknown) {
        r.unknown.sort((s, i) => Br(s[0].key, i[0].key));
        for (const [s, i] of r.unknown)
          o.push({ key: s, value: i });
      }
      Li.encodeStream(n, o);
    },
    decodeStream: (n) => {
      const r = Li.decodeStream(n), o = {}, s = {};
      for (const i of r) {
        let c = "unknown", a = i.key.key, u = i.value;
        if (t[i.key.type]) {
          const [f, d, l] = t[i.key.type];
          if (c = f, !d && a.length)
            throw new Error(`PSBT: Non-empty key for ${c} (key=${U.encode(a)} value=${U.encode(u)}`);
          if (a = d ? d.decode(a) : void 0, u = l.decode(u), !d) {
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
const Ws = At(Fs(io), (e) => {
  if (e.finalScriptWitness && !e.finalScriptWitness.length)
    throw new Error("validateInput: empty finalScriptWitness");
  if (e.partialSig && !e.partialSig.length)
    throw new Error("Empty partialSig");
  if (e.partialSig)
    for (const [t] of e.partialSig)
      an(t, It.ecdsa);
  if (e.bip32Derivation)
    for (const [t] of e.bip32Derivation)
      an(t, It.ecdsa);
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
}), Gs = At(Fs(Pn), (e) => {
  if (e.bip32Derivation)
    for (const [t] of e.bip32Derivation)
      an(t, It.ecdsa);
  return e;
}), Ba = At(Fs(Ks), (e) => {
  if ((e.version || 0) === 0) {
    if (!e.unsignedTx)
      throw new Error("PSBTv0: missing unsignedTx");
    for (const n of e.unsignedTx.inputs)
      if (n.finalScriptSig && n.finalScriptSig.length)
        throw new Error("PSBTv0: input scriptSig found in unsignedTx");
  }
  return e;
}), Od = pt({
  magic: Ps(_s(new Uint8Array([255])), "psbt"),
  global: Ba,
  inputs: Tt("global/unsignedTx/inputs/length", Ws),
  outputs: Tt(null, Gs)
}), Ud = pt({
  magic: Ps(_s(new Uint8Array([255])), "psbt"),
  global: Ba,
  inputs: Tt("global/inputCount", Ws),
  outputs: Tt("global/outputCount", Gs)
});
pt({
  magic: Ps(_s(new Uint8Array([255])), "psbt"),
  items: Tt(null, ke(Tt(pa, gd([ld(Wt), rt(oo)])), ro.dict()))
});
function xo(e, t, n) {
  for (const r in n) {
    if (r === "unknown" || !t[r])
      continue;
    const { allowInc: o } = Zo(t[r]);
    if (!o.includes(e))
      throw new Error(`PSBTv${e}: field ${r} is not allowed`);
  }
  for (const r in t) {
    const { reqInc: o } = Zo(t[r]);
    if (o.includes(e) && n[r] === void 0)
      throw new Error(`PSBTv${e}: missing required field ${r}`);
  }
}
function Ci(e, t, n) {
  const r = {};
  for (const o in n) {
    const s = o;
    if (s !== "unknown") {
      if (!t[s])
        continue;
      const { allowInc: i, silentIgnore: c } = Zo(t[s]);
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
function Oa(e) {
  const t = e && e.global && e.global.version || 0;
  xo(t, Ks, e.global);
  for (const i of e.inputs)
    xo(t, io, i);
  for (const i of e.outputs)
    xo(t, Pn, i);
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
function Xo(e, t, n, r, o) {
  const s = { ...n, ...t };
  for (const i in e) {
    const c = i, [a, u, f] = e[c], d = r && !r.includes(i);
    if (t[i] === void 0 && i in t) {
      if (d)
        throw new Error(`Cannot remove signed field=${i}`);
      delete s[i];
    } else if (u) {
      const l = n && n[i] ? n[i] : [];
      let h = t[c];
      if (h) {
        if (!Array.isArray(h))
          throw new Error(`keyMap(${i}): KV pairs should be [k, v][]`);
        h = h.map((y) => {
          if (y.length !== 2)
            throw new Error(`keyMap(${i}): KV pairs should be [k, v][]`);
          return [
            typeof y[0] == "string" ? u.decode(U.decode(y[0])) : y[0],
            typeof y[1] == "string" ? f.decode(U.decode(y[1])) : y[1]
          ];
        });
        const w = {}, g = (y, S, v) => {
          if (w[y] === void 0) {
            w[y] = [S, v];
            return;
          }
          const I = U.encode(f.encode(w[y][1])), N = U.encode(f.encode(v));
          if (I !== N)
            throw new Error(`keyMap(${c}): same key=${y} oldVal=${I} newVal=${N}`);
        };
        for (const [y, S] of l) {
          const v = U.encode(u.encode(y));
          g(v, y, S);
        }
        for (const [y, S] of h) {
          const v = U.encode(u.encode(y));
          if (S === void 0) {
            if (d)
              throw new Error(`Cannot remove signed field=${c}/${y}`);
            delete w[v];
          } else
            g(v, y, S);
        }
        s[c] = Object.values(w);
      }
    } else if (typeof s[i] == "string")
      s[i] = f.decode(U.decode(s[i]));
    else if (d && i in t && n && n[i] !== void 0 && !ct(f.encode(t[i]), f.encode(n[i])))
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
const _i = At(Od, Oa), Pi = At(Ud, Oa), $d = {
  encode(e) {
    if (!(e.length !== 2 || e[0] !== 1 || !nt(e[1]) || U.encode(e[1]) !== "4e73"))
      return { type: "p2a", script: K.encode(e) };
  },
  decode: (e) => {
    if (e.type === "p2a")
      return [1, U.decode("4e73")];
  }
};
function Xe(e, t) {
  try {
    return an(e, t), !0;
  } catch {
    return !1;
  }
}
const Rd = {
  encode(e) {
    if (!(e.length !== 2 || !nt(e[0]) || !Xe(e[0], It.ecdsa) || e[1] !== "CHECKSIG"))
      return { type: "pk", pubkey: e[0] };
  },
  decode: (e) => e.type === "pk" ? [e.pubkey, "CHECKSIG"] : void 0
}, Nd = {
  encode(e) {
    if (!(e.length !== 5 || e[0] !== "DUP" || e[1] !== "HASH160" || !nt(e[2])) && !(e[3] !== "EQUALVERIFY" || e[4] !== "CHECKSIG"))
      return { type: "pkh", hash: e[2] };
  },
  decode: (e) => e.type === "pkh" ? ["DUP", "HASH160", e.hash, "EQUALVERIFY", "CHECKSIG"] : void 0
}, Ld = {
  encode(e) {
    if (!(e.length !== 3 || e[0] !== "HASH160" || !nt(e[1]) || e[2] !== "EQUAL"))
      return { type: "sh", hash: e[1] };
  },
  decode: (e) => e.type === "sh" ? ["HASH160", e.hash, "EQUAL"] : void 0
}, Cd = {
  encode(e) {
    if (!(e.length !== 2 || e[0] !== 0 || !nt(e[1])) && e[1].length === 32)
      return { type: "wsh", hash: e[1] };
  },
  decode: (e) => e.type === "wsh" ? [0, e.hash] : void 0
}, _d = {
  encode(e) {
    if (!(e.length !== 2 || e[0] !== 0 || !nt(e[1])) && e[1].length === 20)
      return { type: "wpkh", hash: e[1] };
  },
  decode: (e) => e.type === "wpkh" ? [0, e.hash] : void 0
}, Pd = {
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
}, Hd = {
  encode(e) {
    if (!(e.length !== 2 || e[0] !== 1 || !nt(e[1])))
      return { type: "tr", pubkey: e[1] };
  },
  decode: (e) => e.type === "tr" ? [1, e.pubkey] : void 0
}, Vd = {
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
}, Dd = {
  encode(e) {
    const t = e.length - 1;
    if (e[t] !== "NUMEQUAL" || e[1] !== "CHECKSIG")
      return;
    const n = [], r = bd(e[t - 1]);
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
}, Md = {
  encode(e) {
    return { type: "unknown", script: K.encode(e) };
  },
  decode: (e) => e.type === "unknown" ? K.decode(e.script) : void 0
}, Kd = [
  $d,
  Rd,
  Nd,
  Ld,
  Cd,
  _d,
  Pd,
  Hd,
  Vd,
  Dd,
  Md
], Fd = ke(K, ro.match(Kd)), ut = At(Fd, (e) => {
  if (e.type === "pk" && !Xe(e.pubkey, It.ecdsa))
    throw new Error("OutScript/pk: wrong key");
  if ((e.type === "pkh" || e.type === "sh" || e.type === "wpkh") && (!nt(e.hash) || e.hash.length !== 20))
    throw new Error(`OutScript/${e.type}: wrong hash`);
  if (e.type === "wsh" && (!nt(e.hash) || e.hash.length !== 32))
    throw new Error("OutScript/wsh: wrong hash");
  if (e.type === "tr" && (!nt(e.pubkey) || !Xe(e.pubkey, It.schnorr)))
    throw new Error("OutScript/tr: wrong taproot public key");
  if ((e.type === "ms" || e.type === "tr_ns" || e.type === "tr_ms") && !Array.isArray(e.pubkeys))
    throw new Error("OutScript/multisig: wrong pubkeys array");
  if (e.type === "ms") {
    const t = e.pubkeys.length;
    for (const n of e.pubkeys)
      if (!Xe(n, It.ecdsa))
        throw new Error("OutScript/multisig: wrong pubkey");
    if (e.m <= 0 || t > 16 || e.m > t)
      throw new Error("OutScript/multisig: invalid params");
  }
  if (e.type === "tr_ns" || e.type === "tr_ms") {
    for (const t of e.pubkeys)
      if (!Xe(t, It.schnorr))
        throw new Error(`OutScript/${e.type}: wrong pubkey`);
  }
  if (e.type === "tr_ms") {
    const t = e.pubkeys.length;
    if (e.m <= 0 || t > 999 || e.m > t)
      throw new Error("OutScript/tr_ms: invalid params");
  }
  return e;
});
function Hi(e, t) {
  if (!ct(e.hash, wt(t)))
    throw new Error("checkScript: wsh wrong witnessScript hash");
  const n = ut.decode(t);
  if (n.type === "tr" || n.type === "tr_ns" || n.type === "tr_ms")
    throw new Error(`checkScript: P2${n.type} cannot be wrapped in P2SH`);
  if (n.type === "wpkh" || n.type === "sh")
    throw new Error(`checkScript: P2${n.type} cannot be wrapped in P2WSH`);
}
function Ua(e, t, n) {
  if (e) {
    const r = ut.decode(e);
    if (r.type === "tr_ns" || r.type === "tr_ms" || r.type === "ms" || r.type == "pk")
      throw new Error(`checkScript: non-wrapped ${r.type}`);
    if (r.type === "sh" && t) {
      if (!ct(r.hash, Sa(t)))
        throw new Error("checkScript: sh wrong redeemScript hash");
      const o = ut.decode(t);
      if (o.type === "tr" || o.type === "tr_ns" || o.type === "tr_ms")
        throw new Error(`checkScript: P2${o.type} cannot be wrapped in P2SH`);
      if (o.type === "sh")
        throw new Error("checkScript: P2SH cannot be wrapped in P2SH");
    }
    r.type === "wsh" && n && Hi(r, n);
  }
  if (t) {
    const r = ut.decode(t);
    r.type === "wsh" && n && Hi(r, n);
  }
}
function Wd(e) {
  const t = {};
  for (const n of e) {
    const r = U.encode(n);
    if (t[r])
      throw new Error(`Multisig: non-uniq pubkey: ${e.map(U.encode)}`);
    t[r] = !0;
  }
}
function Gd(e, t, n = !1, r) {
  const o = ut.decode(e);
  if (o.type === "unknown" && n)
    return;
  if (!["tr_ns", "tr_ms"].includes(o.type))
    throw new Error(`P2TR: invalid leaf script=${o.type}`);
  const s = o;
  if (!n && s.pubkeys)
    for (const i of s.pubkeys) {
      if (ct(i, Ds))
        throw new Error("Unspendable taproot key in leaf script");
      if (ct(i, t))
        throw new Error("Using P2TR with leaf script with same key as internal key is not supported");
    }
}
function $a(e) {
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
function Qo(e, t = []) {
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
    left: Qo(e.left, [e.right.hash, ...t]),
    right: Qo(e.right, [e.left.hash, ...t])
  };
}
function Jo(e) {
  if (!e)
    throw new Error("taprootAddPath: empty tree");
  if (e.type === "leaf")
    return [e];
  if (e.type !== "branch")
    throw new Error(`taprootWalkTree: wrong type=${e}`);
  return [...Jo(e.left), ...Jo(e.right)];
}
function ts(e, t, n = !1, r) {
  if (!e)
    throw new Error("taprootHashTree: empty tree");
  if (Array.isArray(e) && e.length === 1 && (e = e[0]), !Array.isArray(e)) {
    const { leafVersion: a, script: u } = e;
    if (e.tapLeafScript || e.tapMerkleRoot && !ct(e.tapMerkleRoot, ot))
      throw new Error("P2TR: tapRoot leafScript cannot have tree");
    const f = typeof u == "string" ? U.decode(u) : u;
    if (!nt(f))
      throw new Error(`checkScript: wrong script type=${f}`);
    return Gd(f, t, n), {
      type: "leaf",
      version: a,
      script: f,
      hash: Un(f, a)
    };
  }
  if (e.length !== 2 && (e = $a(e)), e.length !== 2)
    throw new Error("hashTree: non binary tree!");
  const o = ts(e[0], t, n), s = ts(e[1], t, n);
  let [i, c] = [o.hash, s.hash];
  return Br(c, i) === -1 && ([i, c] = [c, i]), { type: "branch", left: o, right: s, hash: Vs("TapBranch", i, c) };
}
const Hn = 192, Un = (e, t = Hn) => Vs("TapLeaf", new Uint8Array([t]), Mt.encode(e));
function zd(e, t, n = un, r = !1, o) {
  if (!e && !t)
    throw new Error("p2tr: should have pubKey or scriptTree (or both)");
  const s = typeof e == "string" ? U.decode(e) : e || Ds;
  if (!Xe(s, It.schnorr))
    throw new Error("p2tr: non-schnorr pubkey");
  if (t) {
    let i = Qo(ts(t, s, r));
    const c = i.hash, [a, u] = jo(s, c), f = Jo(i).map((d) => ({
      ...d,
      controlBlock: Zt.encode({
        version: (d.version || Hn) + u,
        internalKey: s,
        merklePath: d.path
      })
    }));
    return {
      type: "tr",
      script: ut.encode({ type: "tr", pubkey: a }),
      address: Ke(n).encode({ type: "tr", pubkey: a }),
      // For tests
      tweakedPubkey: a,
      // PSBT stuff
      tapInternalKey: s,
      leaves: f,
      tapLeafScript: f.map((d) => [
        Zt.decode(d.controlBlock),
        Ee(d.script, new Uint8Array([d.version || Hn]))
      ]),
      tapMerkleRoot: c
    };
  } else {
    const i = jo(s, ot)[0];
    return {
      type: "tr",
      script: ut.encode({ type: "tr", pubkey: i }),
      address: Ke(n).encode({ type: "tr", pubkey: i }),
      // For tests
      tweakedPubkey: i,
      // PSBT stuff
      tapInternalKey: s
    };
  }
}
function qd(e, t, n = !1) {
  return n || Wd(t), {
    type: "tr_ms",
    script: ut.encode({ type: "tr_ms", pubkeys: t, m: e })
  };
}
const Ra = Zf(wt);
function Na(e, t) {
  if (t.length < 2 || t.length > 40)
    throw new Error("Witness: invalid length");
  if (e > 16)
    throw new Error("Witness: invalid version");
  if (e === 0 && !(t.length === 20 || t.length === 32))
    throw new Error("Witness: invalid length for version");
}
function So(e, t, n = un) {
  Na(e, t);
  const r = e === 0 ? Go : Ye;
  return r.encode(n.bech32, [e].concat(r.toWords(t)));
}
function Vi(e, t) {
  return Ra.encode(Ee(Uint8Array.from(t), e));
}
function Ke(e = un) {
  return {
    encode(t) {
      const { type: n } = t;
      if (n === "wpkh")
        return So(0, t.hash, e);
      if (n === "wsh")
        return So(0, t.hash, e);
      if (n === "tr")
        return So(1, t.pubkey, e);
      if (n === "pkh")
        return Vi(t.hash, [e.pubKeyHash]);
      if (n === "sh")
        return Vi(t.hash, [e.scriptHash]);
      throw new Error(`Unknown address type=${n}`);
    },
    decode(t) {
      if (t.length < 14 || t.length > 74)
        throw new Error("Invalid address length");
      if (e.bech32 && t.toLowerCase().startsWith(`${e.bech32}1`)) {
        let r;
        try {
          if (r = Go.decode(t), r.words[0] !== 0)
            throw new Error(`bech32: wrong version=${r.words[0]}`);
        } catch {
          if (r = Ye.decode(t), r.words[0] === 0)
            throw new Error(`bech32m: wrong version=${r.words[0]}`);
        }
        if (r.prefix !== e.bech32)
          throw new Error(`wrong bech32 prefix=${r.prefix}`);
        const [o, ...s] = r.words, i = Go.fromWords(s);
        if (Na(o, i), o === 0 && i.length === 32)
          return { type: "wsh", hash: i };
        if (o === 0 && i.length === 20)
          return { type: "wpkh", hash: i };
        if (o === 1 && i.length === 32)
          return { type: "tr", pubkey: i };
        throw new Error("Unknown witness program");
      }
      const n = Ra.decode(t);
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
const er = new Uint8Array(32), jd = {
  amount: 0xffffffffffffffffn,
  script: ot
}, Yd = (e) => Math.ceil(e / 4), Zd = 8, Xd = 2, Re = 0, zs = 4294967295;
ro.decimal(Zd);
const $n = (e, t) => e === void 0 ? t : e;
function $r(e) {
  if (Array.isArray(e))
    return e.map((t) => $r(t));
  if (nt(e))
    return Uint8Array.from(e);
  if (["number", "bigint", "boolean", "string", "undefined"].includes(typeof e))
    return e;
  if (e === null)
    return e;
  if (typeof e == "object")
    return Object.fromEntries(Object.entries(e).map(([t, n]) => [t, $r(n)]));
  throw new Error(`cloneDeep: unknown type=${e} (${typeof e})`);
}
const j = {
  DEFAULT: 0,
  ALL: 1,
  NONE: 2,
  SINGLE: 3,
  ANYONECANPAY: 128
}, Fe = {
  DEFAULT: j.DEFAULT,
  ALL: j.ALL,
  NONE: j.NONE,
  SINGLE: j.SINGLE,
  DEFAULT_ANYONECANPAY: j.DEFAULT | j.ANYONECANPAY,
  ALL_ANYONECANPAY: j.ALL | j.ANYONECANPAY,
  NONE_ANYONECANPAY: j.NONE | j.ANYONECANPAY,
  SINGLE_ANYONECANPAY: j.SINGLE | j.ANYONECANPAY
}, Qd = Aa(Fe);
function Jd(e, t, n, r = ot) {
  return ct(n, t) && (e = yd(e, r), t = Hs(e)), { privKey: e, pubKey: t };
}
function Ne(e) {
  if (e.script === void 0 || e.amount === void 0)
    throw new Error("Transaction/output: script and amount required");
  return { script: e.script, amount: e.amount };
}
function An(e) {
  if (e.txid === void 0 || e.index === void 0)
    throw new Error("Transaction/input: txid and index required");
  return {
    txid: e.txid,
    index: e.index,
    sequence: $n(e.sequence, zs),
    finalScriptSig: $n(e.finalScriptSig, ot)
  };
}
function vo(e) {
  for (const t in e) {
    const n = t;
    kd.includes(n) || delete e[n];
  }
}
const To = pt({ txid: rt(32, !0), index: X });
function tl(e) {
  if (typeof e != "number" || typeof Qd[e] != "string")
    throw new Error(`Invalid SigHash=${e}`);
  return e;
}
function Di(e) {
  const t = e & 31;
  return {
    isAny: !!(e & j.ANYONECANPAY),
    isNone: t === j.NONE,
    isSingle: t === j.SINGLE
  };
}
function el(e) {
  if (e !== void 0 && {}.toString.call(e) !== "[object Object]")
    throw new Error(`Wrong object type for transaction options: ${e}`);
  const t = {
    ...e,
    // Defaults
    version: $n(e.version, Xd),
    lockTime: $n(e.lockTime, 0),
    PSBTVersion: $n(e.PSBTVersion, 0)
  };
  if (typeof t.allowUnknowInput < "u" && (e.allowUnknownInputs = t.allowUnknowInput), typeof t.allowUnknowOutput < "u" && (e.allowUnknownOutputs = t.allowUnknowOutput), typeof t.lockTime != "number")
    throw new Error("Transaction lock time should be number");
  if (X.encode(t.lockTime), t.PSBTVersion !== 0 && t.PSBTVersion !== 2)
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
function Mi(e) {
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
      const o = Xt.fromRaw(Je.encode(e.nonWitnessUtxo), {
        allowUnknownOutputs: !0,
        disableScriptCheck: !0,
        allowUnknownInputs: !0
      }), s = U.encode(e.txid);
      if (o.isFinal && o.id !== s)
        throw new Error(`nonWitnessUtxo: wrong txid, exp=${s} got=${o.id}`);
    }
  }
  return e;
}
function gr(e) {
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
function Ki(e, t, n, r = !1, o = !1) {
  let { nonWitnessUtxo: s, txid: i } = e;
  typeof s == "string" && (s = U.decode(s)), nt(s) && (s = Je.decode(s)), !("nonWitnessUtxo" in e) && s === void 0 && (s = t?.nonWitnessUtxo), typeof i == "string" && (i = U.decode(i)), i === void 0 && (i = t?.txid);
  let c = { ...t, ...e, nonWitnessUtxo: s, txid: i };
  !("nonWitnessUtxo" in e) && c.nonWitnessUtxo === void 0 && delete c.nonWitnessUtxo, c.sequence === void 0 && (c.sequence = zs), c.tapMerkleRoot === null && delete c.tapMerkleRoot, c = Xo(io, c, t, n, o), Ws.encode(c);
  let a;
  return c.nonWitnessUtxo && c.index !== void 0 ? a = c.nonWitnessUtxo.outputs[c.index] : c.witnessUtxo && (a = c.witnessUtxo), a && !r && Ua(a && a.script, c.redeemScript, c.witnessScript), c;
}
function Fi(e, t = !1) {
  let n = "legacy", r = j.ALL;
  const o = gr(e), s = ut.decode(o.script);
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
      let l = ut.decode(e.redeemScript);
      (l.type === "wpkh" || l.type === "wsh") && (n = "segwit"), a.push(l), c = l, i += `-${l.type}`;
    }
    if (c.type === "wsh") {
      if (!e.witnessScript)
        throw new Error("inputType: wsh without witnessScript");
      let l = ut.decode(e.witnessScript);
      l.type === "wsh" && (n = "segwit"), a.push(l), c = l, i += `-${l.type}`;
    }
    const u = a[a.length - 1];
    if (u.type === "sh" || u.type === "wsh")
      throw new Error("inputType: sh/wsh cannot be terminal type");
    const f = ut.encode(u), d = {
      type: i,
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
let Xt = class wr {
  global = {};
  inputs = [];
  // use getInput()
  outputs = [];
  // use getOutput()
  opts;
  constructor(t = {}) {
    const n = this.opts = el(t);
    n.lockTime !== Re && (this.global.fallbackLocktime = n.lockTime), this.global.txVersion = n.version;
  }
  // Import
  static fromRaw(t, n = {}) {
    const r = Je.decode(t), o = new wr({ ...n, version: r.version, lockTime: r.lockTime });
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
      r = _i.decode(t);
    } catch (d) {
      try {
        r = Pi.decode(t);
      } catch {
        throw d;
      }
    }
    const o = r.global.version || 0;
    if (o !== 0 && o !== 2)
      throw new Error(`Wrong PSBT version=${o}`);
    const s = r.global.unsignedTx, i = o === 0 ? s?.version : r.global.txVersion, c = o === 0 ? s?.lockTime : r.global.fallbackLocktime, a = new wr({ ...n, version: i, lockTime: c, PSBTVersion: o }), u = o === 0 ? s?.inputs.length : r.global.inputCount;
    a.inputs = r.inputs.slice(0, u).map((d, l) => Mi({
      finalScriptSig: ot,
      ...r.global.unsignedTx?.inputs[l],
      ...d
    }));
    const f = o === 0 ? s?.outputs.length : r.global.outputCount;
    return a.outputs = r.outputs.slice(0, f).map((d, l) => ({
      ...d,
      ...r.global.unsignedTx?.outputs[l]
    })), a.global = { ...r.global, txVersion: i }, c !== Re && (a.global.fallbackLocktime = c), a;
  }
  toPSBT(t = this.opts.PSBTVersion) {
    if (t !== 0 && t !== 2)
      throw new Error(`Wrong PSBT version=${t}`);
    const n = this.inputs.map((s) => Mi(Ci(t, io, s)));
    for (const s of n)
      s.partialSig && !s.partialSig.length && delete s.partialSig, s.finalScriptSig && !s.finalScriptSig.length && delete s.finalScriptSig, s.finalScriptWitness && !s.finalScriptWitness.length && delete s.finalScriptWitness;
    const r = this.outputs.map((s) => Ci(t, Pn, s)), o = { ...this.global };
    return t === 0 ? (o.unsignedTx = Bn.decode(Bn.encode({
      version: this.version,
      lockTime: this.lockTime,
      inputs: this.inputs.map(An).map((s) => ({
        ...s,
        finalScriptSig: ot
      })),
      outputs: this.outputs.map(Ne)
    })), delete o.fallbackLocktime, delete o.txVersion) : (o.version = t, o.txVersion = this.version, o.inputCount = this.inputs.length, o.outputCount = this.outputs.length, o.fallbackLocktime && o.fallbackLocktime === Re && delete o.fallbackLocktime), this.opts.bip174jsCompat && (n.length || n.push({}), r.length || r.push({})), (t === 0 ? _i : Pi).encode({
      global: o,
      inputs: n,
      outputs: r
    });
  }
  // BIP370 lockTime (https://github.com/bitcoin/bips/blob/master/bip-0370.mediawiki#determining-lock-time)
  get lockTime() {
    let t = Re, n = 0, r = Re, o = 0;
    for (const s of this.inputs)
      s.requiredHeightLocktime && (t = Math.max(t, s.requiredHeightLocktime), n++), s.requiredTimeLocktime && (r = Math.max(r, s.requiredTimeLocktime), o++);
    return n && n >= o ? t : r !== Re ? r : this.global.fallbackLocktime || Re;
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
    const n = this.outputs.map(Ne);
    t += 4 * Wt.encode(this.outputs.length).length;
    for (const r of n)
      t += 32 + 4 * Mt.encode(r.script).length;
    this.hasWitnesses && (t += 2), t += 4 * Wt.encode(this.inputs.length).length;
    for (const r of this.inputs)
      t += 160 + 4 * Mt.encode(r.finalScriptSig || ot).length, this.hasWitnesses && r.finalScriptWitness && (t += _n.encode(r.finalScriptWitness).length);
    return t;
  }
  get vsize() {
    return Yd(this.weight);
  }
  toBytes(t = !1, n = !1) {
    return Je.encode({
      version: this.version,
      lockTime: this.lockTime,
      inputs: this.inputs.map(An).map((r) => ({
        ...r,
        finalScriptSig: t && r.finalScriptSig || ot
      })),
      outputs: this.outputs.map(Ne),
      witnesses: this.inputs.map((r) => r.finalScriptWitness || []),
      segwitFlag: n && this.hasWitnesses
    });
  }
  get unsignedTx() {
    return this.toBytes(!1, !1);
  }
  get hex() {
    return U.encode(this.toBytes(!0, this.hasWitnesses));
  }
  get hash() {
    return U.encode(ge(this.toBytes(!0)));
  }
  get id() {
    return U.encode(ge(this.toBytes(!0)).reverse());
  }
  // Input stuff
  checkInputIdx(t) {
    if (!Number.isSafeInteger(t) || 0 > t || t >= this.inputs.length)
      throw new Error(`Wrong input index=${t}`);
  }
  getInput(t) {
    return this.checkInputIdx(t), $r(this.inputs[t]);
  }
  get inputsLength() {
    return this.inputs.length;
  }
  // Modification
  addInput(t, n = !1) {
    if (!n && !this.signStatus().addInput)
      throw new Error("Tx has signed inputs, cannot add new one");
    return this.inputs.push(Ki(t, void 0, void 0, this.opts.disableScriptCheck)), this.inputs.length - 1;
  }
  updateInput(t, n, r = !1) {
    this.checkInputIdx(t);
    let o;
    if (!r) {
      const s = this.signStatus();
      (!s.addInput || s.inputs.includes(t)) && (o = Id);
    }
    this.inputs[t] = Ki(n, this.inputs[t], o, this.opts.disableScriptCheck, this.opts.allowUnknown);
  }
  // Output stuff
  checkOutputIdx(t) {
    if (!Number.isSafeInteger(t) || 0 > t || t >= this.outputs.length)
      throw new Error(`Wrong output index=${t}`);
  }
  getOutput(t) {
    return this.checkOutputIdx(t), $r(this.outputs[t]);
  }
  getOutputAddress(t, n = un) {
    const r = this.getOutput(t);
    if (r.script)
      return Ke(n).encode(ut.decode(r.script));
  }
  get outputsLength() {
    return this.outputs.length;
  }
  normalizeOutput(t, n, r) {
    let { amount: o, script: s } = t;
    if (o === void 0 && (o = n?.amount), typeof o != "bigint")
      throw new Error(`Wrong amount type, should be of type bigint in sats, but got ${o} of type ${typeof o}`);
    typeof s == "string" && (s = U.decode(s)), s === void 0 && (s = n?.script);
    let i = { ...n, ...t, amount: o, script: s };
    if (i.amount === void 0 && delete i.amount, i = Xo(Pn, i, n, r, this.opts.allowUnknown), Gs.encode(i), i.script && !this.opts.allowUnknownOutputs && ut.decode(i.script).type === "unknown")
      throw new Error("Transaction/output: unknown output script type, there is a chance that input is unspendable. Pass allowUnknownOutputs=true, if you sure");
    return this.opts.disableScriptCheck || Ua(i.script, i.redeemScript, i.witnessScript), i;
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
      (!s.addOutput || s.outputs.includes(t)) && (o = Bd);
    }
    this.outputs[t] = this.normalizeOutput(n, this.outputs[t], o);
  }
  addOutputAddress(t, n, r = un) {
    return this.addOutput({ script: ut.encode(Ke(r).decode(t)), amount: n });
  }
  // Utils
  get fee() {
    let t = 0n;
    for (const r of this.inputs) {
      const o = gr(r);
      if (!o)
        throw new Error("Empty input amount");
      t += o.amount;
    }
    const n = this.outputs.map(Ne);
    for (const r of n)
      t -= r.amount;
    return t;
  }
  // Signing
  // Based on https://github.com/bitcoin/bitcoin/blob/5871b5b5ab57a0caf9b7514eb162c491c83281d5/test/functional/test_framework/script.py#L624
  // There is optimization opportunity to re-use hashes for multiple inputs for witness v0/v1,
  // but we are trying to be less complicated for audit purpose for now.
  preimageLegacy(t, n, r) {
    const { isAny: o, isNone: s, isSingle: i } = Di(r);
    if (t < 0 || !Number.isSafeInteger(t))
      throw new Error(`Invalid input idx=${t}`);
    if (i && t >= this.outputs.length || t >= this.inputs.length)
      return ba.encode(1n);
    n = K.encode(K.decode(n).filter((f) => f !== "CODESEPARATOR"));
    let c = this.inputs.map(An).map((f, d) => ({
      ...f,
      finalScriptSig: d === t ? n : ot
    }));
    o ? c = [c[t]] : (s || i) && (c = c.map((f, d) => ({
      ...f,
      sequence: d === t ? f.sequence : 0
    })));
    let a = this.outputs.map(Ne);
    s ? a = [] : i && (a = a.slice(0, t).fill(jd).concat([a[t]]));
    const u = Je.encode({
      lockTime: this.lockTime,
      version: this.version,
      segwitFlag: !1,
      inputs: c,
      outputs: a
    });
    return ge(u, Ze.encode(r));
  }
  preimageWitnessV0(t, n, r, o) {
    const { isAny: s, isNone: i, isSingle: c } = Di(r);
    let a = er, u = er, f = er;
    const d = this.inputs.map(An), l = this.outputs.map(Ne);
    s || (a = ge(...d.map(To.encode))), !s && !c && !i && (u = ge(...d.map((w) => X.encode(w.sequence)))), !c && !i ? f = ge(...l.map(Pe.encode)) : c && t < l.length && (f = ge(Pe.encode(l[t])));
    const h = d[t];
    return ge(Ze.encode(this.version), a, u, rt(32, !0).encode(h.txid), X.encode(h.index), Mt.encode(n), pr.encode(o), X.encode(h.sequence), f, X.encode(this.lockTime), X.encode(r));
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
      Ze.encode(this.version),
      X.encode(this.lockTime)
    ], f = r === j.DEFAULT ? j.ALL : r & 3, d = r & j.ANYONECANPAY, l = this.inputs.map(An), h = this.outputs.map(Ne);
    d !== j.ANYONECANPAY && u.push(...[
      l.map(To.encode),
      o.map(pr.encode),
      n.map(Mt.encode),
      l.map((g) => X.encode(g.sequence))
    ].map((g) => wt(Ee(...g)))), f === j.ALL && u.push(wt(Ee(...h.map(Pe.encode))));
    const w = (a ? 1 : 0) | (i ? 2 : 0);
    if (u.push(new Uint8Array([w])), d === j.ANYONECANPAY) {
      const g = l[t];
      u.push(To.encode(g), pr.encode(o[t]), Mt.encode(n[t]), X.encode(g.sequence));
    } else
      u.push(X.encode(t));
    return w & 1 && u.push(wt(Mt.encode(a || ot))), f === j.SINGLE && u.push(t < h.length ? wt(Pe.encode(h[t])) : er), i && u.push(Un(i, c), Se.encode(0), Ze.encode(s)), Vs("TapSighash", ...u);
  }
  // Signer can be privateKey OR instance of bip32 HD stuff
  signIdx(t, n, r, o) {
    this.checkInputIdx(n);
    const s = this.inputs[n], i = Fi(s, this.opts.allowLegacyWitnessUtxo);
    if (!nt(t)) {
      if (!s.bip32Derivation || !s.bip32Derivation.length)
        throw new Error("bip32Derivation: empty");
      const f = s.bip32Derivation.filter((l) => l[1].fingerprint == t.fingerprint).map(([l, { path: h }]) => {
        let w = t;
        for (const g of h)
          w = w.deriveChild(g);
        if (!ct(w.publicKey, l))
          throw new Error("bip32Derivation: wrong pubKey");
        if (!w.privateKey)
          throw new Error("bip32Derivation: no privateKey");
        return w;
      });
      if (!f.length)
        throw new Error(`bip32Derivation: no items with fingerprint=${t.fingerprint}`);
      let d = !1;
      for (const l of f)
        this.signIdx(l.privateKey, n) && (d = !0);
      return d;
    }
    r ? r.forEach(tl) : r = [i.defaultSighash];
    const c = i.sighash;
    if (!r.includes(c))
      throw new Error(`Input with not allowed sigHash=${c}. Allowed: ${r.join(", ")}`);
    const { sigOutputs: a } = this.inputSighash(n);
    if (a === j.SINGLE && n >= this.outputs.length)
      throw new Error(`Input with sighash SINGLE, but there is no output with corresponding index=${n}`);
    const u = gr(s);
    if (i.txType === "taproot") {
      const f = this.inputs.map(gr), d = f.map((y) => y.script), l = f.map((y) => y.amount);
      let h = !1, w = Hs(t), g = s.tapMerkleRoot || ot;
      if (s.tapInternalKey) {
        const { pubKey: y, privKey: S } = Jd(t, w, s.tapInternalKey, g), [v] = jo(s.tapInternalKey, g);
        if (ct(v, y)) {
          const I = this.preimageWitnessV1(n, d, c, l), N = Ee(Ui(I, S, o), c !== j.DEFAULT ? new Uint8Array([c]) : ot);
          this.updateInput(n, { tapKeySig: N }, !0), h = !0;
        }
      }
      if (s.tapLeafScript) {
        s.tapScriptSig = s.tapScriptSig || [];
        for (const [y, S] of s.tapLeafScript) {
          const v = S.subarray(0, -1), I = K.decode(v), N = S[S.length - 1], $ = Un(v, N);
          if (I.findIndex((L) => nt(L) && ct(L, w)) === -1)
            continue;
          const x = this.preimageWitnessV1(n, d, c, l, void 0, v, N), Y = Ee(Ui(x, t, o), c !== j.DEFAULT ? new Uint8Array([c]) : ot);
          this.updateInput(n, { tapScriptSig: [[{ pubKey: w, leafHash: $ }, Y]] }, !0), h = !0;
        }
      }
      if (!h)
        throw new Error("No taproot scripts signed");
      return !0;
    } else {
      const f = va(t);
      let d = !1;
      const l = Sa(f);
      for (const g of K.decode(i.lastScript))
        nt(g) && (ct(g, f) || ct(g, l)) && (d = !0);
      if (!d)
        throw new Error(`Input script doesn't have pubKey: ${i.lastScript}`);
      let h;
      if (i.txType === "legacy")
        h = this.preimageLegacy(n, i.lastScript, c);
      else if (i.txType === "segwit") {
        let g = i.lastScript;
        i.last.type === "wpkh" && (g = ut.encode({ type: "pkh", hash: i.last.hash })), h = this.preimageWitnessV0(n, g, c, u.amount);
      } else
        throw new Error(`Transaction/sign: unknown tx type: ${i.txType}`);
      const w = wd(h, t, this.opts.lowR);
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
    const n = this.inputs[t], r = Fi(n, this.opts.allowLegacyWitnessUtxo);
    if (r.txType === "taproot") {
      if (n.tapKeySig)
        n.finalScriptWitness = [n.tapKeySig];
      else if (n.tapLeafScript && n.tapScriptSig) {
        const a = n.tapLeafScript.sort((u, f) => Zt.encode(u[0]).length - Zt.encode(f[0]).length);
        for (const [u, f] of a) {
          const d = f.slice(0, -1), l = f[f.length - 1], h = ut.decode(d), w = Un(d, l), g = n.tapScriptSig.filter((S) => ct(S[0].leafHash, w));
          let y = [];
          if (h.type === "tr_ms") {
            const S = h.m, v = h.pubkeys;
            let I = 0;
            for (const N of v) {
              const $ = g.findIndex((F) => ct(F[0].pubKey, N));
              if (I === S || $ === -1) {
                y.push(ot);
                continue;
              }
              y.push(g[$][1]), I++;
            }
            if (I !== S)
              continue;
          } else if (h.type === "tr_ns") {
            for (const S of h.pubkeys) {
              const v = g.findIndex((I) => ct(I[0].pubKey, S));
              v !== -1 && y.push(g[v][1]);
            }
            if (y.length !== h.pubkeys.length)
              continue;
          } else if (h.type === "unknown" && this.opts.allowUnknownInputs) {
            const S = K.decode(d);
            if (y = g.map(([{ pubKey: v }, I]) => {
              const N = S.findIndex(($) => nt($) && ct($, v));
              if (N === -1)
                throw new Error("finalize/taproot: cannot find position of pubkey in script");
              return { signature: I, pos: N };
            }).sort((v, I) => v.pos - I.pos).map((v) => v.signature), !y.length)
              continue;
          } else {
            const S = this.opts.customScripts;
            if (S)
              for (const v of S) {
                if (!v.finalizeTaproot)
                  continue;
                const I = K.decode(d), N = v.encode(I);
                if (N === void 0)
                  continue;
                const $ = v.finalizeTaproot(d, N, g);
                if ($) {
                  n.finalScriptWitness = $.concat(Zt.encode(u)), n.finalScriptSig = ot, vo(n);
                  return;
                }
              }
            throw new Error("Finalize: Unknown tapLeafScript");
          }
          n.finalScriptWitness = y.reverse().concat([d, Zt.encode(u)]);
          break;
        }
        if (!n.finalScriptWitness)
          throw new Error("finalize/taproot: empty witness");
      } else
        throw new Error("finalize/taproot: unknown input");
      n.finalScriptSig = ot, vo(n);
      return;
    }
    if (!n.partialSig || !n.partialSig.length)
      throw new Error("Not enough partial sign");
    let o = ot, s = [];
    if (r.last.type === "ms") {
      const a = r.last.m, u = r.last.pubkeys;
      let f = [];
      for (const d of u) {
        const l = n.partialSig.find((h) => ct(d, h[0]));
        l && f.push(l[1]);
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
    i && (n.finalScriptSig = i), c && (n.finalScriptWitness = c), vo(n);
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
    const n = this.global.unsignedTx ? Bn.encode(this.global.unsignedTx) : ot, r = t.global.unsignedTx ? Bn.encode(t.global.unsignedTx) : ot;
    if (!ct(n, r))
      throw new Error("Transaction/combine: different unsigned tx");
    this.global = Xo(Ks, this.global, t.global, void 0, this.opts.allowUnknown);
    for (let o = 0; o < this.inputs.length; o++)
      this.updateInput(o, t.inputs[o], !0);
    for (let o = 0; o < this.outputs.length; o++)
      this.updateOutput(o, t.outputs[o], !0);
    return this;
  }
  clone() {
    return wr.fromPSBT(this.toPSBT(this.opts.PSBTVersion), this.opts);
  }
};
class Ie extends Xt {
  constructor(t) {
    super(Ao(t));
  }
  static fromPSBT(t, n) {
    return Xt.fromPSBT(t, Ao(n));
  }
  static fromRaw(t, n) {
    return Xt.fromRaw(t, Ao(n));
  }
}
Ie.ARK_TX_OPTS = {
  allowUnknown: !0,
  allowUnknownOutputs: !0,
  allowUnknownInputs: !0
};
function Ao(e) {
  return { ...Ie.ARK_TX_OPTS, ...e };
}
class qs extends Error {
  idx;
  // Indice of participant
  constructor(t, n) {
    super(n), this.idx = t;
  }
}
const { taggedHash: La, pointToBytes: nr } = le.utils, Gt = xe.Point, G = Gt.Fn, te = xe.lengths.publicKey, es = new Uint8Array(te), Wi = ke(rt(33), {
  decode: (e) => Vn(e) ? es : e.toBytes(!0),
  encode: (e) => Cn(e, es) ? Gt.ZERO : Gt.fromBytes(e)
}), Gi = At(ba, (e) => (_c("n", e, 1n, G.ORDER), e)), tn = pt({ R1: Wi, R2: Wi }), Ca = pt({ k1: Gi, k2: Gi, publicKey: rt(te) });
function zi(e, ...t) {
}
function Lt(e, ...t) {
  if (!Array.isArray(e))
    throw new Error("expected array");
  e.forEach((n) => z(n, ...t));
}
function qi(e) {
  if (!Array.isArray(e))
    throw new Error("expected array");
  e.forEach((t, n) => {
    if (typeof t != "boolean")
      throw new Error("expected boolean in xOnly array, got" + t + "(" + n + ")");
  });
}
const Rr = (e, ...t) => G.create(G.fromBytes(La(e, ...t), !0)), kn = (e, t) => Yn(e.y) ? t : G.neg(t);
function He(e) {
  return Gt.BASE.multiply(e);
}
function Vn(e) {
  return e.equals(Gt.ZERO);
}
function ns(e) {
  return Lt(e, te), e.sort(Br);
}
function _a(e) {
  Lt(e, te);
  for (let t = 1; t < e.length; t++)
    if (!Cn(e[t], e[0]))
      return e[t];
  return es;
}
function Pa(e) {
  return Lt(e, te), La("KeyAgg list", ...e);
}
function Ha(e, t, n) {
  return z(e, te), z(t, te), Cn(e, t) ? 1n : Rr("KeyAgg coefficient", n, e);
}
function rs(e, t = [], n = []) {
  if (Lt(e, te), Lt(t, 32), t.length !== n.length)
    throw new Error("The tweaks and isXonly arrays must have the same length");
  const r = _a(e), o = Pa(e);
  let s = Gt.ZERO;
  for (let a = 0; a < e.length; a++) {
    let u;
    try {
      u = Gt.fromBytes(e[a]);
    } catch {
      throw new qs(a, "pubkey");
    }
    s = s.add(u.multiply(Ha(e[a], r, o)));
  }
  let i = G.ONE, c = G.ZERO;
  for (let a = 0; a < t.length; a++) {
    const u = n[a] && !Yn(s.y) ? G.neg(G.ONE) : G.ONE, f = G.fromBytes(t[a]);
    if (s = s.multiply(u).add(He(f)), Vn(s))
      throw new Error("The result of tweaking cannot be infinity");
    i = G.mul(u, i), c = G.add(f, G.mul(u, c));
  }
  return { aggPublicKey: s, gAcc: i, tweakAcc: c };
}
const ji = (e, t, n, r, o, s) => Rr("MuSig/nonce", e, new Uint8Array([t.length]), t, new Uint8Array([n.length]), n, o, Gn(s.length, 4), s, new Uint8Array([r]));
function nl(e, t, n = new Uint8Array(0), r, o = new Uint8Array(0), s = Wn(32)) {
  if (z(e, te), zi(t, 32), z(n), ![0, 32].includes(n.length))
    throw new Error("wrong aggPublicKey");
  zi(), z(o), z(s, 32);
  const i = Uint8Array.of(0), c = ji(s, e, n, 0, i, o), a = ji(s, e, n, 1, i, o);
  return {
    secret: Ca.encode({ k1: c, k2: a, publicKey: e }),
    public: tn.encode({ R1: He(c), R2: He(a) })
  };
}
function rl(e) {
  Lt(e, 66);
  let t = Gt.ZERO, n = Gt.ZERO;
  for (let r = 0; r < e.length; r++) {
    const o = e[r];
    try {
      const { R1: s, R2: i } = tn.decode(o);
      if (Vn(s) || Vn(i))
        throw new Error("infinity point");
      t = t.add(s), n = n.add(i);
    } catch {
      throw new qs(r, "pubnonce");
    }
  }
  return tn.encode({ R1: t, R2: n });
}
class ol {
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
    if (Lt(n, 33), Lt(o, 32), qi(s), z(r), o.length !== s.length)
      throw new Error("The tweaks and isXonly arrays must have the same length");
    const { aggPublicKey: i, gAcc: c, tweakAcc: a } = rs(n, o, s), { R1: u, R2: f } = tn.decode(t);
    this.publicKeys = n, this.Q = i, this.gAcc = c, this.tweakAcc = a, this.b = Rr("MuSig/noncecoef", t, nr(i), r);
    const d = u.add(f.multiply(this.b));
    this.R = Vn(d) ? Gt.BASE : d, this.e = Rr("BIP0340/challenge", nr(this.R), nr(i), r), this.tweaks = o, this.isXonly = s, this.L = Pa(n), this.secondKey = _a(n);
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
    if (!n.some((s) => Cn(s, r)))
      throw new Error("The signer's pubkey must be included in the list of pubkeys");
    return Ha(r, this.secondKey, this.L);
  }
  partialSigVerifyInternal(t, n, r) {
    const { Q: o, gAcc: s, b: i, R: c, e: a } = this, u = G.fromBytes(t, !0);
    if (!G.isValid(u))
      return !1;
    const { R1: f, R2: d } = tn.decode(n), l = f.add(d.multiply(i)), h = Yn(c.y) ? l : l.negate(), w = Gt.fromBytes(r), g = this.getSessionKeyAggCoeff(w), y = G.mul(kn(o, 1n), s), S = He(u), v = h.add(w.multiply(G.mul(a, G.mul(g, y))));
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
    if (z(n, 32), typeof r != "boolean")
      throw new Error("expected boolean");
    const { Q: o, gAcc: s, b: i, R: c, e: a } = this, { k1: u, k2: f, publicKey: d } = Ca.decode(t);
    if (t.fill(0, 0, 64), !G.isValid(u))
      throw new Error("wrong k1");
    if (!G.isValid(f))
      throw new Error("wrong k1");
    const l = kn(c, u), h = kn(c, f), w = G.fromBytes(n);
    if (G.is0(w))
      throw new Error("wrong d_");
    const g = He(w), y = g.toBytes(!0);
    if (!Cn(y, d))
      throw new Error("Public key does not match nonceGen argument");
    const S = this.getSessionKeyAggCoeff(g), v = kn(o, 1n), I = G.mul(v, G.mul(s, w)), N = G.add(l, G.add(G.mul(i, h), G.mul(a, G.mul(S, I)))), $ = G.toBytes(N);
    if (!r) {
      const F = tn.encode({
        R1: He(u),
        R2: He(f)
      });
      if (!this.partialSigVerifyInternal($, F, y))
        throw new Error("Partial signature verification failed");
    }
    return $;
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
    if (z(t, 32), Lt(n, 66), Lt(o, te), Lt(s, 32), qi(i), Te(r), n.length !== o.length)
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
      const u = G.fromBytes(t[a], !0);
      if (!G.isValid(u))
        throw new qs(a, "psig");
      i = G.add(i, u);
    }
    const c = kn(n, 1n);
    return i = G.add(i, G.mul(s, G.mul(c, r))), Kt(nr(o), G.toBytes(i));
  }
}
function sl(e) {
  const t = nl(e);
  return { secNonce: t.secret, pubNonce: t.public };
}
function il(e) {
  return rl(e);
}
/*! noble-hashes - MIT License (c) 2022 Paul Miller (paulmillr.com) */
function js(e) {
  return e instanceof Uint8Array || ArrayBuffer.isView(e) && e.constructor.name === "Uint8Array";
}
function We(e, t = "") {
  if (!Number.isSafeInteger(e) || e < 0) {
    const n = t && `"${t}" `;
    throw new Error(`${n}expected integer >0, got ${e}`);
  }
}
function et(e, t, n = "") {
  const r = js(e), o = e?.length, s = t !== void 0;
  if (!r || s && o !== t) {
    const i = n && `"${n}" `, c = s ? ` of length ${t}` : "", a = r ? `length=${o}` : `type=${typeof e}`;
    throw new Error(i + "expected Uint8Array" + c + ", got " + a);
  }
  return e;
}
function Va(e) {
  if (typeof e != "function" || typeof e.create != "function")
    throw new Error("Hash must wrapped by utils.createHasher");
  We(e.outputLen), We(e.blockLen);
}
function Nr(e, t = !0) {
  if (e.destroyed)
    throw new Error("Hash instance has been destroyed");
  if (t && e.finished)
    throw new Error("Hash#digest() has already been called");
}
function cl(e, t) {
  et(e, void 0, "digestInto() output");
  const n = t.outputLen;
  if (e.length < n)
    throw new Error('"digestInto() output" expected to be of length >=' + n);
}
function Lr(...e) {
  for (let t = 0; t < e.length; t++)
    e[t].fill(0);
}
function ko(e) {
  return new DataView(e.buffer, e.byteOffset, e.byteLength);
}
function jt(e, t) {
  return e << 32 - t | e >>> t;
}
const Da = /* @ts-ignore */ typeof Uint8Array.from([]).toHex == "function" && typeof Uint8Array.fromHex == "function", al = /* @__PURE__ */ Array.from({ length: 256 }, (e, t) => t.toString(16).padStart(2, "0"));
function co(e) {
  if (et(e), Da)
    return e.toHex();
  let t = "";
  for (let n = 0; n < e.length; n++)
    t += al[e[n]];
  return t;
}
const oe = { _0: 48, _9: 57, A: 65, F: 70, a: 97, f: 102 };
function Yi(e) {
  if (e >= oe._0 && e <= oe._9)
    return e - oe._0;
  if (e >= oe.A && e <= oe.F)
    return e - (oe.A - 10);
  if (e >= oe.a && e <= oe.f)
    return e - (oe.a - 10);
}
function Cr(e) {
  if (typeof e != "string")
    throw new Error("hex string expected, got " + typeof e);
  if (Da)
    return Uint8Array.fromHex(e);
  const t = e.length, n = t / 2;
  if (t % 2)
    throw new Error("hex string expected, got unpadded hex of length " + t);
  const r = new Uint8Array(n);
  for (let o = 0, s = 0; o < n; o++, s += 2) {
    const i = Yi(e.charCodeAt(s)), c = Yi(e.charCodeAt(s + 1));
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
function ul(e, t = {}) {
  const n = (o, s) => e(s).update(o).digest(), r = e(void 0);
  return n.outputLen = r.outputLen, n.blockLen = r.blockLen, n.create = (o) => e(o), Object.assign(n, t), Object.freeze(n);
}
function ao(e = 32) {
  const t = typeof globalThis == "object" ? globalThis.crypto : null;
  if (typeof t?.getRandomValues != "function")
    throw new Error("crypto.getRandomValues must be defined");
  return t.getRandomValues(new Uint8Array(e));
}
const fl = (e) => ({
  oid: Uint8Array.from([6, 9, 96, 134, 72, 1, 101, 3, 4, 2, e])
});
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const Ys = /* @__PURE__ */ BigInt(0), os = /* @__PURE__ */ BigInt(1);
function _r(e, t = "") {
  if (typeof e != "boolean") {
    const n = t && `"${t}" `;
    throw new Error(n + "expected boolean, got type=" + typeof e);
  }
  return e;
}
function Ma(e) {
  if (typeof e == "bigint") {
    if (!yr(e))
      throw new Error("positive bigint expected, got " + e);
  } else
    We(e);
  return e;
}
function rr(e) {
  const t = Ma(e).toString(16);
  return t.length & 1 ? "0" + t : t;
}
function Ka(e) {
  if (typeof e != "string")
    throw new Error("hex string expected, got " + typeof e);
  return e === "" ? Ys : BigInt("0x" + e);
}
function En(e) {
  return Ka(co(e));
}
function Fa(e) {
  return Ka(co(dl(et(e)).reverse()));
}
function Zs(e, t) {
  We(t), e = Ma(e);
  const n = Cr(e.toString(16).padStart(t * 2, "0"));
  if (n.length !== t)
    throw new Error("number too large");
  return n;
}
function Wa(e, t) {
  return Zs(e, t).reverse();
}
function dl(e) {
  return Uint8Array.from(e);
}
function ll(e) {
  return Uint8Array.from(e, (t, n) => {
    const r = t.charCodeAt(0);
    if (t.length !== 1 || r > 127)
      throw new Error(`string contains non-ASCII character "${e[n]}" with code ${r} at position ${n}`);
    return r;
  });
}
const yr = (e) => typeof e == "bigint" && Ys <= e;
function hl(e, t, n) {
  return yr(e) && yr(t) && yr(n) && t <= e && e < n;
}
function pl(e, t, n, r) {
  if (!hl(t, n, r))
    throw new Error("expected valid " + e + ": " + n + " <= n < " + r + ", got " + t);
}
function gl(e) {
  let t;
  for (t = 0; e > Ys; e >>= os, t += 1)
    ;
  return t;
}
const Xs = (e) => (os << BigInt(e)) - os;
function wl(e, t, n) {
  if (We(e, "hashLen"), We(t, "qByteLen"), typeof n != "function")
    throw new Error("hmacFn must be a function");
  const r = (y) => new Uint8Array(y), o = Uint8Array.of(), s = Uint8Array.of(0), i = Uint8Array.of(1), c = 1e3;
  let a = r(e), u = r(e), f = 0;
  const d = () => {
    a.fill(1), u.fill(0), f = 0;
  }, l = (...y) => n(u, Qt(a, ...y)), h = (y = o) => {
    u = l(s, y), a = l(), y.length !== 0 && (u = l(i, y), a = l());
  }, w = () => {
    if (f++ >= c)
      throw new Error("drbg: tried max amount of iterations");
    let y = 0;
    const S = [];
    for (; y < t; ) {
      a = l();
      const v = a.slice();
      S.push(v), y += a.length;
    }
    return Qt(...S);
  };
  return (y, S) => {
    d(), h(y);
    let v;
    for (; !(v = S(w())); )
      h();
    return d(), v;
  };
}
function Qs(e, t = {}, n = {}) {
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
function Zi(e) {
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
const Ga = {
  p: 0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffefffffc2fn,
  n: 0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141n,
  h: 1n,
  a: 0n,
  b: 7n,
  Gx: 0x79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798n,
  Gy: 0x483ada7726a3c4655da4fbfc0e1108a8fd17b448a68554199c47d08ffb10d4b8n
}, { p: ve, n: Be, Gx: yl, Gy: ml, b: za } = Ga, ht = 32, Ge = 64, Pr = {
  publicKey: ht + 1,
  publicKeyUncompressed: Ge + 1,
  signature: Ge,
  seed: ht + ht / 2
}, bl = (...e) => {
  "captureStackTrace" in Error && typeof Error.captureStackTrace == "function" && Error.captureStackTrace(...e);
}, Q = (e = "") => {
  const t = new Error(e);
  throw bl(t, Q), t;
}, El = (e) => typeof e == "bigint", xl = (e) => typeof e == "string", Sl = (e) => e instanceof Uint8Array || ArrayBuffer.isView(e) && e.constructor.name === "Uint8Array", Bt = (e, t, n = "") => {
  const r = Sl(e), o = e?.length, s = t !== void 0;
  if (!r || s && o !== t) {
    const i = n && `"${n}" `, c = s ? ` of length ${t}` : "", a = r ? `length=${o}` : `type=${typeof e}`;
    Q(i + "expected Uint8Array" + c + ", got " + a);
  }
  return e;
}, Oe = (e) => new Uint8Array(e), qa = (e, t) => e.toString(16).padStart(t, "0"), ja = (e) => Array.from(Bt(e)).map((t) => qa(t, 2)).join(""), se = { _0: 48, _9: 57, A: 65, F: 70, a: 97, f: 102 }, Xi = (e) => {
  if (e >= se._0 && e <= se._9)
    return e - se._0;
  if (e >= se.A && e <= se.F)
    return e - (se.A - 10);
  if (e >= se.a && e <= se.f)
    return e - (se.a - 10);
}, Ya = (e) => {
  const t = "hex invalid";
  if (!xl(e))
    return Q(t);
  const n = e.length, r = n / 2;
  if (n % 2)
    return Q(t);
  const o = Oe(r);
  for (let s = 0, i = 0; s < r; s++, i += 2) {
    const c = Xi(e.charCodeAt(i)), a = Xi(e.charCodeAt(i + 1));
    if (c === void 0 || a === void 0)
      return Q(t);
    o[s] = c * 16 + a;
  }
  return o;
}, Za = () => globalThis?.crypto, Qi = () => Za()?.subtle ?? Q("crypto.subtle must be defined, consider polyfill"), ee = (...e) => {
  const t = Oe(e.reduce((r, o) => r + Bt(o).length, 0));
  let n = 0;
  return e.forEach((r) => {
    t.set(r, n), n += r.length;
  }), t;
}, uo = (e = ht) => Za().getRandomValues(Oe(e)), Dn = BigInt, ze = (e, t, n, r = "bad number: out of range") => El(e) && t <= e && e < n ? e : Q(r), P = (e, t = ve) => {
  const n = e % t;
  return n >= 0n ? n : t + n;
}, ce = (e) => P(e, Be), Xa = (e, t) => {
  (e === 0n || t <= 0n) && Q("no inverse n=" + e + " mod=" + t);
  let n = P(e, t), r = t, o = 0n, s = 1n;
  for (; n !== 0n; ) {
    const i = r / n, c = r % n, a = o - s * i;
    r = n, n = c, o = s, s = a;
  }
  return r === 1n ? P(o, t) : Q("no inverse");
}, Qa = (e) => {
  const t = lo[e];
  return typeof t != "function" && Q("hashes." + e + " not set"), t;
}, Io = (e) => e instanceof xt ? e : Q("Point expected"), Ja = (e) => P(P(e * e) * e + za), Ji = (e) => ze(e, 0n, ve), mr = (e) => ze(e, 1n, ve), ss = (e) => ze(e, 1n, Be), fn = (e) => (e & 1n) === 0n, fo = (e) => Uint8Array.of(e), vl = (e) => fo(fn(e) ? 2 : 3), tu = (e) => {
  const t = Ja(mr(e));
  let n = 1n;
  for (let r = t, o = (ve + 1n) / 4n; o > 0n; o >>= 1n)
    o & 1n && (n = n * r % ve), r = r * r % ve;
  return P(n * n) === t ? n : Q("sqrt invalid");
};
class xt {
  static BASE;
  static ZERO;
  X;
  Y;
  Z;
  constructor(t, n, r) {
    this.X = Ji(t), this.Y = mr(n), this.Z = Ji(r), Object.freeze(this);
  }
  static CURVE() {
    return Ga;
  }
  /** Create 3d xyz point from 2d xy. (0, 0) => (0, 1, 0), not (0, 0, 1) */
  static fromAffine(t) {
    const { x: n, y: r } = t;
    return n === 0n && r === 0n ? Le : new xt(n, r, 1n);
  }
  /** Convert Uint8Array or hex string to Point. */
  static fromBytes(t) {
    Bt(t);
    const { publicKey: n, publicKeyUncompressed: r } = Pr;
    let o;
    const s = t.length, i = t[0], c = t.subarray(1), a = dn(c, 0, ht);
    if (s === n && (i === 2 || i === 3)) {
      let u = tu(a);
      const f = fn(u);
      fn(Dn(i)) !== f && (u = P(-u)), o = new xt(a, u, 1n);
    }
    return s === r && i === 4 && (o = new xt(a, dn(c, ht, Ge), 1n)), o ? o.assertValidity() : Q("bad point: not on curve");
  }
  static fromHex(t) {
    return xt.fromBytes(Ya(t));
  }
  get x() {
    return this.toAffine().x;
  }
  get y() {
    return this.toAffine().y;
  }
  /** Equality check: compare points P&Q. */
  equals(t) {
    const { X: n, Y: r, Z: o } = this, { X: s, Y: i, Z: c } = Io(t), a = P(n * c), u = P(s * o), f = P(r * c), d = P(i * o);
    return a === u && f === d;
  }
  is0() {
    return this.equals(Le);
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
    const { X: n, Y: r, Z: o } = this, { X: s, Y: i, Z: c } = Io(t), a = 0n, u = za;
    let f = 0n, d = 0n, l = 0n;
    const h = P(u * 3n);
    let w = P(n * s), g = P(r * i), y = P(o * c), S = P(n + r), v = P(s + i);
    S = P(S * v), v = P(w + g), S = P(S - v), v = P(n + o);
    let I = P(s + c);
    return v = P(v * I), I = P(w + y), v = P(v - I), I = P(r + o), f = P(i + c), I = P(I * f), f = P(g + y), I = P(I - f), l = P(a * v), f = P(h * y), l = P(f + l), f = P(g - l), l = P(g + l), d = P(f * l), g = P(w + w), g = P(g + w), y = P(a * y), v = P(h * v), g = P(g + y), y = P(w - y), y = P(a * y), v = P(v + y), w = P(g * v), d = P(d + w), w = P(I * v), f = P(S * f), f = P(f - w), w = P(S * g), l = P(I * l), l = P(l + w), new xt(f, d, l);
  }
  subtract(t) {
    return this.add(Io(t).negate());
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
      return Le;
    if (ss(t), t === 1n)
      return this;
    if (this.equals(Ue))
      return Yl(t).p;
    let r = Le, o = Ue;
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
    if (this.equals(Le))
      return { x: 0n, y: 0n };
    if (r === 1n)
      return { x: t, y: n };
    const o = Xa(r, ve);
    return P(r * o) !== 1n && Q("inverse invalid"), { x: P(t * o), y: P(n * o) };
  }
  /** Checks if the point is valid and on-curve. */
  assertValidity() {
    const { x: t, y: n } = this.toAffine();
    return mr(t), mr(n), P(n * n) === Ja(t) ? this : Q("bad point: not on curve");
  }
  /** Converts point to 33/65-byte Uint8Array. */
  toBytes(t = !0) {
    const { x: n, y: r } = this.assertValidity().toAffine(), o = $t(n);
    return t ? ee(vl(r), o) : ee(fo(4), o, $t(r));
  }
  toHex(t) {
    return ja(this.toBytes(t));
  }
}
const Ue = new xt(yl, ml, 1n), Le = new xt(0n, 1n, 0n);
xt.BASE = Ue;
xt.ZERO = Le;
const Tl = (e, t, n) => Ue.multiply(t, !1).add(e.multiply(n, !1)).assertValidity(), $e = (e) => Dn("0x" + (ja(e) || "0")), dn = (e, t, n) => $e(e.subarray(t, n)), Al = 2n ** 256n, $t = (e) => Ya(qa(ze(e, 0n, Al), Ge)), eu = (e) => {
  const t = $e(Bt(e, ht, "secret key"));
  return ze(t, 1n, Be, "invalid secret key: outside of range");
}, nu = (e) => e > Be >> 1n, kl = (e) => {
  [0, 1, 2, 3].includes(e) || Q("recovery id must be valid and present");
}, Il = (e) => {
  e != null && !tc.includes(e) && Q(`Signature format must be one of: ${tc.join(", ")}`), e === ou && Q('Signature format "der" is not supported: switch to noble-curves');
}, Bl = (e, t = ln) => {
  Il(t);
  const n = Pr.signature, r = n + 1;
  let o = `Signature format "${t}" expects Uint8Array with length `;
  t === ln && e.length !== n && Q(o + n), t === Vr && e.length !== r && Q(o + r);
};
class Hr {
  r;
  s;
  recovery;
  constructor(t, n, r) {
    this.r = ss(t), this.s = ss(n), r != null && (this.recovery = r), Object.freeze(this);
  }
  static fromBytes(t, n = ln) {
    Bl(t, n);
    let r;
    n === Vr && (r = t[0], t = t.subarray(1));
    const o = dn(t, 0, ht), s = dn(t, ht, Ge);
    return new Hr(o, s, r);
  }
  addRecoveryBit(t) {
    return new Hr(this.r, this.s, t);
  }
  hasHighS() {
    return nu(this.s);
  }
  toBytes(t = ln) {
    const { r: n, s: r, recovery: o } = this, s = ee($t(n), $t(r));
    return t === Vr ? (kl(o), ee(Uint8Array.of(o), s)) : s;
  }
}
const ru = (e) => {
  const t = e.length * 8 - 256;
  t > 1024 && Q("msg invalid");
  const n = $e(e);
  return t > 0 ? n >> Dn(t) : n;
}, Ol = (e) => ce(ru(Bt(e))), ln = "compact", Vr = "recovered", ou = "der", tc = [ln, Vr, ou], ec = {
  lowS: !0,
  prehash: !0,
  format: ln,
  extraEntropy: !1
}, nc = "SHA-256", lo = {
  hmacSha256Async: async (e, t) => {
    const n = Qi(), r = "HMAC", o = await n.importKey("raw", e, { name: r, hash: { name: nc } }, !1, ["sign"]);
    return Oe(await n.sign(r, o, t));
  },
  hmacSha256: void 0,
  sha256Async: async (e) => Oe(await Qi().digest(nc, e)),
  sha256: void 0
}, Ul = (e, t, n) => (Bt(e, void 0, "message"), t.prehash ? n ? lo.sha256Async(e) : Qa("sha256")(e) : e), $l = Oe(0), Rl = fo(0), Nl = fo(1), Ll = 1e3, Cl = "drbg: tried max amount of iterations", _l = async (e, t) => {
  let n = Oe(ht), r = Oe(ht), o = 0;
  const s = () => {
    n.fill(1), r.fill(0);
  }, i = (...f) => lo.hmacSha256Async(r, ee(n, ...f)), c = async (f = $l) => {
    r = await i(Rl, f), n = await i(), f.length !== 0 && (r = await i(Nl, f), n = await i());
  }, a = async () => (o++ >= Ll && Q(Cl), n = await i(), n);
  s(), await c(e);
  let u;
  for (; !(u = t(await a())); )
    await c();
  return s(), u;
}, Pl = (e, t, n, r) => {
  let { lowS: o, extraEntropy: s } = n;
  const i = $t, c = Ol(e), a = i(c), u = eu(t), f = [i(u), a];
  if (s != null && s !== !1) {
    const w = s === !0 ? uo(ht) : s;
    f.push(Bt(w, void 0, "extraEntropy"));
  }
  const d = ee(...f), l = c;
  return r(d, (w) => {
    const g = ru(w);
    if (!(1n <= g && g < Be))
      return;
    const y = Xa(g, Be), S = Ue.multiply(g).toAffine(), v = ce(S.x);
    if (v === 0n)
      return;
    const I = ce(y * ce(l + v * u));
    if (I === 0n)
      return;
    let N = (S.x === v ? 0 : 2) | Number(S.y & 1n), $ = I;
    return o && nu(I) && ($ = ce(-I), N ^= 1), new Hr(v, $, N).toBytes(n.format);
  });
}, Hl = (e) => {
  const t = {};
  return Object.keys(ec).forEach((n) => {
    t[n] = e[n] ?? ec[n];
  }), t;
}, Vl = async (e, t, n = {}) => (n = Hl(n), e = await Ul(e, n, !0), Pl(e, t, n, _l)), Dl = (e = uo(Pr.seed)) => {
  Bt(e), (e.length < Pr.seed || e.length > 1024) && Q("expected 40-1024b");
  const t = P($e(e), Be - 1n);
  return $t(t + 1n);
}, Ml = (e) => (t) => {
  const n = Dl(t);
  return { secretKey: n, publicKey: e(n) };
}, su = (e) => Uint8Array.from("BIP0340/" + e, (t) => t.charCodeAt(0)), iu = "aux", cu = "nonce", au = "challenge", is = (e, ...t) => {
  const n = Qa("sha256"), r = n(su(e));
  return n(ee(r, r, ...t));
}, cs = async (e, ...t) => {
  const n = lo.sha256Async, r = await n(su(e));
  return await n(ee(r, r, ...t));
}, Js = (e) => {
  const t = eu(e), n = Ue.multiply(t), { x: r, y: o } = n.assertValidity().toAffine(), s = fn(o) ? t : ce(-t), i = $t(r);
  return { d: s, px: i };
}, ti = (e) => ce($e(e)), uu = (...e) => ti(is(au, ...e)), fu = async (...e) => ti(await cs(au, ...e)), du = (e) => Js(e).px, Kl = Ml(du), lu = (e, t, n) => {
  const { px: r, d: o } = Js(t);
  return { m: Bt(e), px: r, d: o, a: Bt(n, ht) };
}, hu = (e) => {
  const t = ti(e);
  t === 0n && Q("sign failed: k is zero");
  const { px: n, d: r } = Js($t(t));
  return { rx: n, k: r };
}, pu = (e, t, n, r) => ee(t, $t(ce(e + n * r))), gu = "invalid signature produced", Fl = (e, t, n = uo(ht)) => {
  const { m: r, px: o, d: s, a: i } = lu(e, t, n), c = is(iu, i), a = $t(s ^ $e(c)), u = is(cu, a, o, r), { rx: f, k: d } = hu(u), l = uu(f, o, r), h = pu(d, f, l, s);
  return yu(h, r, o) || Q(gu), h;
}, Wl = async (e, t, n = uo(ht)) => {
  const { m: r, px: o, d: s, a: i } = lu(e, t, n), c = await cs(iu, i), a = $t(s ^ $e(c)), u = await cs(cu, a, o, r), { rx: f, k: d } = hu(u), l = await fu(f, o, r), h = pu(d, f, l, s);
  return await mu(h, r, o) || Q(gu), h;
}, Gl = (e, t) => e instanceof Promise ? e.then(t) : t(e), wu = (e, t, n, r) => {
  const o = Bt(e, Ge, "signature"), s = Bt(t, void 0, "message"), i = Bt(n, ht, "publicKey");
  try {
    const c = $e(i), a = tu(c), u = fn(a) ? a : P(-a), f = new xt(c, u, 1n).assertValidity(), d = $t(f.toAffine().x), l = dn(o, 0, ht);
    ze(l, 1n, ve);
    const h = dn(o, ht, Ge);
    ze(h, 1n, Be);
    const w = ee($t(l), d, s);
    return Gl(r(w), (g) => {
      const { x: y, y: S } = Tl(f, h, ce(-g)).toAffine();
      return !(!fn(S) || y !== l);
    });
  } catch {
    return !1;
  }
}, yu = (e, t, n) => wu(e, t, n, uu), mu = async (e, t, n) => wu(e, t, n, fu), zl = {
  keygen: Kl,
  getPublicKey: du,
  sign: Fl,
  verify: yu,
  signAsync: Wl,
  verifyAsync: mu
}, Dr = 8, ql = 256, bu = Math.ceil(ql / Dr) + 1, as = 2 ** (Dr - 1), jl = () => {
  const e = [];
  let t = Ue, n = t;
  for (let r = 0; r < bu; r++) {
    n = t, e.push(n);
    for (let o = 1; o < as; o++)
      n = n.add(t), e.push(n);
    t = n.double();
  }
  return e;
};
let rc;
const oc = (e, t) => {
  const n = t.negate();
  return e ? n : t;
}, Yl = (e) => {
  const t = rc || (rc = jl());
  let n = Le, r = Ue;
  const o = 2 ** Dr, s = o, i = Dn(o - 1), c = Dn(Dr);
  for (let a = 0; a < bu; a++) {
    let u = Number(e & i);
    e >>= c, u > as && (u -= s, e += 1n);
    const f = a * as, d = f, l = f + Math.abs(u) - 1, h = a % 2 !== 0, w = u < 0;
    u === 0 ? r = r.add(oc(h, t[d])) : n = n.add(oc(w, t[l]));
  }
  return e !== 0n && Q("invalid wnaf"), { p: n, f: r };
};
function Zl(e, t, n) {
  return e & t ^ ~e & n;
}
function Xl(e, t, n) {
  return e & t ^ e & n ^ t & n;
}
class Ql {
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
    this.blockLen = t, this.outputLen = n, this.padOffset = r, this.isLE = o, this.buffer = new Uint8Array(t), this.view = ko(this.buffer);
  }
  update(t) {
    Nr(this), et(t);
    const { view: n, buffer: r, blockLen: o } = this, s = t.length;
    for (let i = 0; i < s; ) {
      const c = Math.min(o - this.pos, s - i);
      if (c === o) {
        const a = ko(t);
        for (; o <= s - i; i += o)
          this.process(a, i);
        continue;
      }
      r.set(t.subarray(i, i + c), this.pos), this.pos += c, i += c, this.pos === o && (this.process(n, 0), this.pos = 0);
    }
    return this.length += t.length, this.roundClean(), this;
  }
  digestInto(t) {
    Nr(this), cl(t, this), this.finished = !0;
    const { buffer: n, view: r, blockLen: o, isLE: s } = this;
    let { pos: i } = this;
    n[i++] = 128, Lr(this.buffer.subarray(i)), this.padOffset > o - i && (this.process(r, 0), i = 0);
    for (let d = i; d < o; d++)
      n[d] = 0;
    r.setBigUint64(o - 8, BigInt(this.length * 8), s), this.process(r, 0);
    const c = ko(t), a = this.outputLen;
    if (a % 4)
      throw new Error("_sha2: outputLen must be aligned to 32bit");
    const u = a / 4, f = this.get();
    if (u > f.length)
      throw new Error("_sha2: outputLen bigger than state");
    for (let d = 0; d < u; d++)
      c.setUint32(4 * d, f[d], s);
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
]), Jl = /* @__PURE__ */ Uint32Array.from([
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
class th extends Ql {
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
    for (let d = 0; d < 16; d++, n += 4)
      ye[d] = t.getUint32(n, !1);
    for (let d = 16; d < 64; d++) {
      const l = ye[d - 15], h = ye[d - 2], w = jt(l, 7) ^ jt(l, 18) ^ l >>> 3, g = jt(h, 17) ^ jt(h, 19) ^ h >>> 10;
      ye[d] = g + ye[d - 7] + w + ye[d - 16] | 0;
    }
    let { A: r, B: o, C: s, D: i, E: c, F: a, G: u, H: f } = this;
    for (let d = 0; d < 64; d++) {
      const l = jt(c, 6) ^ jt(c, 11) ^ jt(c, 25), h = f + l + Zl(c, a, u) + Jl[d] + ye[d] | 0, g = (jt(r, 2) ^ jt(r, 13) ^ jt(r, 22)) + Xl(r, o, s) | 0;
      f = u, u = a, a = c, c = i + h | 0, i = s, s = o, o = r, r = h + g | 0;
    }
    r = r + this.A | 0, o = o + this.B | 0, s = s + this.C | 0, i = i + this.D | 0, c = c + this.E | 0, a = a + this.F | 0, u = u + this.G | 0, f = f + this.H | 0, this.set(r, o, s, i, c, a, u, f);
  }
  roundClean() {
    Lr(ye);
  }
  destroy() {
    this.set(0, 0, 0, 0, 0, 0, 0, 0), Lr(this.buffer);
  }
}
class eh extends th {
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
const us = /* @__PURE__ */ ul(
  () => new eh(),
  /* @__PURE__ */ fl(1)
);
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const vt = /* @__PURE__ */ BigInt(0), bt = /* @__PURE__ */ BigInt(1), Ve = /* @__PURE__ */ BigInt(2), Eu = /* @__PURE__ */ BigInt(3), xu = /* @__PURE__ */ BigInt(4), Su = /* @__PURE__ */ BigInt(5), nh = /* @__PURE__ */ BigInt(7), vu = /* @__PURE__ */ BigInt(8), rh = /* @__PURE__ */ BigInt(9), Tu = /* @__PURE__ */ BigInt(16);
function Dt(e, t) {
  const n = e % t;
  return n >= vt ? n : t + n;
}
function Nt(e, t, n) {
  let r = e;
  for (; t-- > vt; )
    r *= r, r %= n;
  return r;
}
function sc(e, t) {
  if (e === vt)
    throw new Error("invert: expected non-zero number");
  if (t <= vt)
    throw new Error("invert: expected positive modulus, got " + t);
  let n = Dt(e, t), r = t, o = vt, s = bt;
  for (; n !== vt; ) {
    const c = r / n, a = r % n, u = o - s * c;
    r = n, n = a, o = s, s = u;
  }
  if (r !== bt)
    throw new Error("invert: does not exist");
  return Dt(o, t);
}
function ei(e, t, n) {
  if (!e.eql(e.sqr(t), n))
    throw new Error("Cannot find square root");
}
function Au(e, t) {
  const n = (e.ORDER + bt) / xu, r = e.pow(t, n);
  return ei(e, r, t), r;
}
function oh(e, t) {
  const n = (e.ORDER - Su) / vu, r = e.mul(t, Ve), o = e.pow(r, n), s = e.mul(t, o), i = e.mul(e.mul(s, Ve), o), c = e.mul(s, e.sub(i, e.ONE));
  return ei(e, c, t), c;
}
function sh(e) {
  const t = ho(e), n = ku(e), r = n(t, t.neg(t.ONE)), o = n(t, r), s = n(t, t.neg(r)), i = (e + nh) / Tu;
  return (c, a) => {
    let u = c.pow(a, i), f = c.mul(u, r);
    const d = c.mul(u, o), l = c.mul(u, s), h = c.eql(c.sqr(f), a), w = c.eql(c.sqr(d), a);
    u = c.cmov(u, f, h), f = c.cmov(l, d, w);
    const g = c.eql(c.sqr(f), a), y = c.cmov(u, f, g);
    return ei(c, y, a), y;
  };
}
function ku(e) {
  if (e < Eu)
    throw new Error("sqrt is not defined for small field");
  let t = e - bt, n = 0;
  for (; t % Ve === vt; )
    t /= Ve, n++;
  let r = Ve;
  const o = ho(e);
  for (; ic(o, r) === 1; )
    if (r++ > 1e3)
      throw new Error("Cannot find square root: probably non-prime P");
  if (n === 1)
    return Au;
  let s = o.pow(r, t);
  const i = (t + bt) / Ve;
  return function(a, u) {
    if (a.is0(u))
      return u;
    if (ic(a, u) !== 1)
      throw new Error("Cannot find square root");
    let f = n, d = a.mul(a.ONE, s), l = a.pow(u, t), h = a.pow(u, i);
    for (; !a.eql(l, a.ONE); ) {
      if (a.is0(l))
        return a.ZERO;
      let w = 1, g = a.sqr(l);
      for (; !a.eql(g, a.ONE); )
        if (w++, g = a.sqr(g), w === f)
          throw new Error("Cannot find square root");
      const y = bt << BigInt(f - w - 1), S = a.pow(d, y);
      f = w, d = a.sqr(S), l = a.mul(l, d), h = a.mul(h, S);
    }
    return h;
  };
}
function ih(e) {
  return e % xu === Eu ? Au : e % vu === Su ? oh : e % Tu === rh ? sh(e) : ku(e);
}
const ch = [
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
function ah(e) {
  const t = {
    ORDER: "bigint",
    BYTES: "number",
    BITS: "number"
  }, n = ch.reduce((r, o) => (r[o] = "function", r), t);
  return Qs(e, n), e;
}
function uh(e, t, n) {
  if (n < vt)
    throw new Error("invalid exponent, negatives unsupported");
  if (n === vt)
    return e.ONE;
  if (n === bt)
    return t;
  let r = e.ONE, o = t;
  for (; n > vt; )
    n & bt && (r = e.mul(r, o)), o = e.sqr(o), n >>= bt;
  return r;
}
function Iu(e, t, n = !1) {
  const r = new Array(t.length).fill(n ? e.ZERO : void 0), o = t.reduce((i, c, a) => e.is0(c) ? i : (r[a] = i, e.mul(i, c)), e.ONE), s = e.inv(o);
  return t.reduceRight((i, c, a) => e.is0(c) ? i : (r[a] = e.mul(i, r[a]), e.mul(i, c)), s), r;
}
function ic(e, t) {
  const n = (e.ORDER - bt) / Ve, r = e.pow(t, n), o = e.eql(r, e.ONE), s = e.eql(r, e.ZERO), i = e.eql(r, e.neg(e.ONE));
  if (!o && !s && !i)
    throw new Error("invalid Legendre symbol result");
  return o ? 1 : s ? 0 : -1;
}
function fh(e, t) {
  t !== void 0 && We(t);
  const n = t !== void 0 ? t : e.toString(2).length, r = Math.ceil(n / 8);
  return { nBitLength: n, nByteLength: r };
}
class dh {
  ORDER;
  BITS;
  BYTES;
  isLE;
  ZERO = vt;
  ONE = bt;
  _lengths;
  _sqrt;
  // cached sqrt
  _mod;
  constructor(t, n = {}) {
    if (t <= vt)
      throw new Error("invalid field: expected ORDER > 0, got " + t);
    let r;
    this.isLE = !1, n != null && typeof n == "object" && (typeof n.BITS == "number" && (r = n.BITS), typeof n.sqrt == "function" && (this.sqrt = n.sqrt), typeof n.isLE == "boolean" && (this.isLE = n.isLE), n.allowedLengths && (this._lengths = n.allowedLengths?.slice()), typeof n.modFromBytes == "boolean" && (this._mod = n.modFromBytes));
    const { nBitLength: o, nByteLength: s } = fh(t, r);
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
    return uh(this, t, n);
  }
  div(t, n) {
    return Dt(t * sc(n, this.ORDER), this.ORDER);
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
    return sc(t, this.ORDER);
  }
  sqrt(t) {
    return this._sqrt || (this._sqrt = ih(this.ORDER)), this._sqrt(this, t);
  }
  toBytes(t) {
    return this.isLE ? Wa(t, this.BYTES) : Zs(t, this.BYTES);
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
    let a = s ? Fa(t) : En(t);
    if (c && (a = Dt(a, i)), !n && !this.isValid(a))
      throw new Error("invalid field element: outside of range 0..ORDER");
    return a;
  }
  // TODO: we don't need it here, move out to separate fn
  invertBatch(t) {
    return Iu(this, t);
  }
  // We can't move this out because Fp6, Fp12 implement it
  // and it's unclear what to return in there.
  cmov(t, n, r) {
    return r ? n : t;
  }
}
function ho(e, t = {}) {
  return new dh(e, t);
}
function Bu(e) {
  if (typeof e != "bigint")
    throw new Error("field order must be bigint");
  const t = e.toString(2).length;
  return Math.ceil(t / 8);
}
function Ou(e) {
  const t = Bu(e);
  return t + Math.ceil(t / 2);
}
function Uu(e, t, n = !1) {
  et(e);
  const r = e.length, o = Bu(t), s = Ou(t);
  if (r < 16 || r < s || r > 1024)
    throw new Error("expected " + s + "-1024 bytes of input, got " + r);
  const i = n ? Fa(e) : En(e), c = Dt(i, t - bt) + bt;
  return n ? Wa(c, o) : Zs(c, o);
}
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const hn = /* @__PURE__ */ BigInt(0), De = /* @__PURE__ */ BigInt(1);
function Mr(e, t) {
  const n = t.negate();
  return e ? n : t;
}
function cc(e, t) {
  const n = Iu(e.Fp, t.map((r) => r.Z));
  return t.map((r, o) => e.fromAffine(r.toAffine(n[o])));
}
function $u(e, t) {
  if (!Number.isSafeInteger(e) || e <= 0 || e > t)
    throw new Error("invalid window size, expected [1.." + t + "], got W=" + e);
}
function Bo(e, t) {
  $u(e, t);
  const n = Math.ceil(t / e) + 1, r = 2 ** (e - 1), o = 2 ** e, s = Xs(e), i = BigInt(e);
  return { windows: n, windowSize: r, mask: s, maxNumber: o, shiftBy: i };
}
function ac(e, t, n) {
  const { windowSize: r, mask: o, maxNumber: s, shiftBy: i } = n;
  let c = Number(e & o), a = e >> i;
  c > r && (c -= s, a += De);
  const u = t * r, f = u + Math.abs(c) - 1, d = c === 0, l = c < 0, h = t % 2 !== 0;
  return { nextN: a, offset: f, isZero: d, isNeg: l, isNegF: h, offsetF: u };
}
const Oo = /* @__PURE__ */ new WeakMap(), Ru = /* @__PURE__ */ new WeakMap();
function Uo(e) {
  return Ru.get(e) || 1;
}
function uc(e) {
  if (e !== hn)
    throw new Error("invalid wNAF");
}
class lh {
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
    for (; n > hn; )
      n & De && (r = r.add(o)), o = o.double(), n >>= De;
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
    const { windows: r, windowSize: o } = Bo(n, this.bits), s = [];
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
    const i = Bo(t, this.bits);
    for (let c = 0; c < i.windows; c++) {
      const { nextN: a, offset: u, isZero: f, isNeg: d, isNegF: l, offsetF: h } = ac(r, c, i);
      r = a, f ? s = s.add(Mr(l, n[h])) : o = o.add(Mr(d, n[u]));
    }
    return uc(r), { p: o, f: s };
  }
  /**
   * Implements ec unsafe (non const-time) multiplication using precomputed tables and w-ary non-adjacent form.
   * @param acc accumulator point to add result of multiplication
   * @returns point
   */
  wNAFUnsafe(t, n, r, o = this.ZERO) {
    const s = Bo(t, this.bits);
    for (let i = 0; i < s.windows && r !== hn; i++) {
      const { nextN: c, offset: a, isZero: u, isNeg: f } = ac(r, i, s);
      if (r = c, !u) {
        const d = n[a];
        o = o.add(f ? d.negate() : d);
      }
    }
    return uc(r), o;
  }
  getPrecomputes(t, n, r) {
    let o = Oo.get(n);
    return o || (o = this.precomputeWindow(n, t), t !== 1 && (typeof r == "function" && (o = r(o)), Oo.set(n, o))), o;
  }
  cached(t, n, r) {
    const o = Uo(t);
    return this.wNAF(o, this.getPrecomputes(o, t, r), n);
  }
  unsafe(t, n, r, o) {
    const s = Uo(t);
    return s === 1 ? this._unsafeLadder(t, n, o) : this.wNAFUnsafe(s, this.getPrecomputes(s, t, r), n, o);
  }
  // We calculate precomputes for elliptic curve point multiplication
  // using windowed method. This specifies window size and
  // stores precomputed values. Usually only base point would be precomputed.
  createCache(t, n) {
    $u(n, this.bits), Ru.set(t, n), Oo.delete(t);
  }
  hasCache(t) {
    return Uo(t) !== 1;
  }
}
function hh(e, t, n, r) {
  let o = t, s = e.ZERO, i = e.ZERO;
  for (; n > hn || r > hn; )
    n & De && (s = s.add(o)), r & De && (i = i.add(o)), o = o.double(), n >>= De, r >>= De;
  return { p1: s, p2: i };
}
function fc(e, t, n) {
  if (t) {
    if (t.ORDER !== e)
      throw new Error("Field.ORDER must match order: Fp == p, Fn == n");
    return ah(t), t;
  } else
    return ho(e, { isLE: n });
}
function ph(e, t, n = {}, r) {
  if (r === void 0 && (r = e === "edwards"), !t || typeof t != "object")
    throw new Error(`expected valid ${e} CURVE object`);
  for (const a of ["p", "n", "h"]) {
    const u = t[a];
    if (!(typeof u == "bigint" && u > hn))
      throw new Error(`CURVE.${a} must be positive bigint`);
  }
  const o = fc(t.p, n.Fp, r), s = fc(t.n, n.Fn, r), c = ["Gx", "Gy", "a", "b"];
  for (const a of c)
    if (!o.isValid(t[a]))
      throw new Error(`CURVE.${a} must be valid field element of CURVE.Fp`);
  return t = Object.freeze(Object.assign({}, t)), { CURVE: t, Fp: o, Fn: s };
}
function Nu(e, t) {
  return function(r) {
    const o = e(r);
    return { secretKey: o, publicKey: t(o) };
  };
}
class Lu {
  oHash;
  iHash;
  blockLen;
  outputLen;
  finished = !1;
  destroyed = !1;
  constructor(t, n) {
    if (Va(t), et(n, void 0, "key"), this.iHash = t.create(), typeof this.iHash.update != "function")
      throw new Error("Expected instance of class which extends utils.Hash");
    this.blockLen = this.iHash.blockLen, this.outputLen = this.iHash.outputLen;
    const r = this.blockLen, o = new Uint8Array(r);
    o.set(n.length > r ? t.create().update(n).digest() : n);
    for (let s = 0; s < o.length; s++)
      o[s] ^= 54;
    this.iHash.update(o), this.oHash = t.create();
    for (let s = 0; s < o.length; s++)
      o[s] ^= 106;
    this.oHash.update(o), Lr(o);
  }
  update(t) {
    return Nr(this), this.iHash.update(t), this;
  }
  digestInto(t) {
    Nr(this), et(t, this.outputLen, "output"), this.finished = !0, this.iHash.digestInto(t), this.oHash.update(t), this.oHash.digestInto(t), this.destroy();
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
const Cu = (e, t, n) => new Lu(e, t).update(n).digest();
Cu.create = (e, t) => new Lu(e, t);
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const dc = (e, t) => (e + (e >= 0 ? t : -t) / _u) / t;
function gh(e, t, n) {
  const [[r, o], [s, i]] = t, c = dc(i * e, n), a = dc(-o * e, n);
  let u = e - c * r - a * s, f = -c * o - a * i;
  const d = u < ae, l = f < ae;
  d && (u = -u), l && (f = -f);
  const h = Xs(Math.ceil(gl(n) / 2)) + en;
  if (u < ae || u >= h || f < ae || f >= h)
    throw new Error("splitScalar (endomorphism): failed, k=" + e);
  return { k1neg: d, k1: u, k2neg: l, k2: f };
}
function fs(e) {
  if (!["compact", "recovered", "der"].includes(e))
    throw new Error('Signature format must be "compact", "recovered", or "der"');
  return e;
}
function $o(e, t) {
  const n = {};
  for (let r of Object.keys(t))
    n[r] = e[r] === void 0 ? t[r] : e[r];
  return _r(n.lowS, "lowS"), _r(n.prehash, "prehash"), n.format !== void 0 && fs(n.format), n;
}
class wh extends Error {
  constructor(t = "") {
    super(t);
  }
}
const be = {
  // asn.1 DER encoding utils
  Err: wh,
  // Basic building block is TLV (Tag-Length-Value)
  _tlv: {
    encode: (e, t) => {
      const { Err: n } = be;
      if (e < 0 || e > 256)
        throw new n("tlv.encode: wrong tag");
      if (t.length & 1)
        throw new n("tlv.encode: unpadded data");
      const r = t.length / 2, o = rr(r);
      if (o.length / 2 & 128)
        throw new n("tlv.encode: long form length too big");
      const s = r > 127 ? rr(o.length / 2 | 128) : "";
      return rr(e) + s + o + t;
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
      let n = rr(e);
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
      return En(e);
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
}, ae = BigInt(0), en = BigInt(1), _u = BigInt(2), or = BigInt(3), yh = BigInt(4);
function mh(e, t = {}) {
  const n = ph("weierstrass", e, t), { Fp: r, Fn: o } = n;
  let s = n.CURVE;
  const { h: i, n: c } = s;
  Qs(t, {}, {
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
  const u = Hu(r, o);
  function f() {
    if (!r.isOdd)
      throw new Error("compression is not supported: Field does not have .isOdd()");
  }
  function d(_, b, m) {
    const { x: p, y: E } = b.toAffine(), A = r.toBytes(p);
    if (_r(m, "isCompressed"), m) {
      f();
      const B = !r.isOdd(E);
      return Qt(Pu(B), A);
    } else
      return Qt(Uint8Array.of(4), A, r.toBytes(E));
  }
  function l(_) {
    et(_, void 0, "Point");
    const { publicKey: b, publicKeyUncompressed: m } = u, p = _.length, E = _[0], A = _.subarray(1);
    if (p === b && (E === 2 || E === 3)) {
      const B = r.fromBytes(A);
      if (!r.isValid(B))
        throw new Error("bad point: is not on curve, wrong x");
      const k = g(B);
      let T;
      try {
        T = r.sqrt(k);
      } catch (W) {
        const H = W instanceof Error ? ": " + W.message : "";
        throw new Error("bad point: is not on curve, sqrt error" + H);
      }
      f();
      const O = r.isOdd(T);
      return (E & 1) === 1 !== O && (T = r.neg(T)), { x: B, y: T };
    } else if (p === m && E === 4) {
      const B = r.BYTES, k = r.fromBytes(A.subarray(0, B)), T = r.fromBytes(A.subarray(B, B * 2));
      if (!y(k, T))
        throw new Error("bad point: is not on curve");
      return { x: k, y: T };
    } else
      throw new Error(`bad point: got length ${p}, expected compressed=${b} or uncompressed=${m}`);
  }
  const h = t.toBytes || d, w = t.fromBytes || l;
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
  const S = r.mul(r.pow(s.a, or), yh), v = r.mul(r.sqr(s.b), BigInt(27));
  if (r.is0(r.add(S, v)))
    throw new Error("bad curve params: a or b");
  function I(_, b, m = !1) {
    if (!r.isValid(b) || m && r.is0(b))
      throw new Error(`bad point coordinate ${_}`);
    return b;
  }
  function N(_) {
    if (!(_ instanceof L))
      throw new Error("Weierstrass Point expected");
  }
  function $(_) {
    if (!a || !a.basises)
      throw new Error("no endo");
    return gh(_, a.basises, o.ORDER);
  }
  const F = Zi((_, b) => {
    const { X: m, Y: p, Z: E } = _;
    if (r.eql(E, r.ONE))
      return { x: m, y: p };
    const A = _.is0();
    b == null && (b = A ? r.ONE : r.inv(E));
    const B = r.mul(m, b), k = r.mul(p, b), T = r.mul(E, b);
    if (A)
      return { x: r.ZERO, y: r.ZERO };
    if (!r.eql(T, r.ONE))
      throw new Error("invZ was invalid");
    return { x: B, y: k };
  }), x = Zi((_) => {
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
  function Y(_, b, m, p, E) {
    return m = new L(r.mul(m.X, _), m.Y, m.Z), b = Mr(p, b), m = Mr(E, m), b.add(m);
  }
  class L {
    // base / generator point
    static BASE = new L(s.Gx, s.Gy, r.ONE);
    // zero / infinity / identity point
    static ZERO = new L(r.ZERO, r.ONE, r.ZERO);
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
      this.X = I("x", b), this.Y = I("y", m, !0), this.Z = I("z", p), Object.freeze(this);
    }
    static CURVE() {
      return s;
    }
    /** Does NOT validate if the point is valid. Use `.assertValidity()`. */
    static fromAffine(b) {
      const { x: m, y: p } = b || {};
      if (!b || !r.isValid(m) || !r.isValid(p))
        throw new Error("invalid affine point");
      if (b instanceof L)
        throw new Error("projective point not allowed");
      return r.is0(m) && r.is0(p) ? L.ZERO : new L(m, p, r.ONE);
    }
    static fromBytes(b) {
      const m = L.fromAffine(w(et(b, void 0, "point")));
      return m.assertValidity(), m;
    }
    static fromHex(b) {
      return L.fromBytes(Cr(b));
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
      return gt.createCache(this, b), m || this.multiply(or), this;
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
      const { X: m, Y: p, Z: E } = this, { X: A, Y: B, Z: k } = b, T = r.eql(r.mul(m, k), r.mul(A, E)), O = r.eql(r.mul(p, k), r.mul(B, E));
      return T && O;
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
      const { a: b, b: m } = s, p = r.mul(m, or), { X: E, Y: A, Z: B } = this;
      let k = r.ZERO, T = r.ZERO, O = r.ZERO, R = r.mul(E, E), W = r.mul(A, A), H = r.mul(B, B), C = r.mul(E, A);
      return C = r.add(C, C), O = r.mul(E, B), O = r.add(O, O), k = r.mul(b, O), T = r.mul(p, H), T = r.add(k, T), k = r.sub(W, T), T = r.add(W, T), T = r.mul(k, T), k = r.mul(C, k), O = r.mul(p, O), H = r.mul(b, H), C = r.sub(R, H), C = r.mul(b, C), C = r.add(C, O), O = r.add(R, R), R = r.add(O, R), R = r.add(R, H), R = r.mul(R, C), T = r.add(T, R), H = r.mul(A, B), H = r.add(H, H), R = r.mul(H, C), k = r.sub(k, R), O = r.mul(H, W), O = r.add(O, O), O = r.add(O, O), new L(k, T, O);
    }
    // Renes-Costello-Batina exception-free addition formula.
    // There is 30% faster Jacobian formula, but it is not complete.
    // https://eprint.iacr.org/2015/1060, algorithm 1
    // Cost: 12M + 0S + 3*a + 3*b3 + 23add.
    add(b) {
      N(b);
      const { X: m, Y: p, Z: E } = this, { X: A, Y: B, Z: k } = b;
      let T = r.ZERO, O = r.ZERO, R = r.ZERO;
      const W = s.a, H = r.mul(s.b, or);
      let C = r.mul(m, A), D = r.mul(p, B), q = r.mul(E, k), st = r.add(m, p), M = r.add(A, B);
      st = r.mul(st, M), M = r.add(C, D), st = r.sub(st, M), M = r.add(m, E);
      let Z = r.add(A, k);
      return M = r.mul(M, Z), Z = r.add(C, q), M = r.sub(M, Z), Z = r.add(p, E), T = r.add(B, k), Z = r.mul(Z, T), T = r.add(D, q), Z = r.sub(Z, T), R = r.mul(W, M), T = r.mul(H, q), R = r.add(T, R), T = r.sub(D, R), R = r.add(D, R), O = r.mul(T, R), D = r.add(C, C), D = r.add(D, C), q = r.mul(W, q), M = r.mul(H, M), D = r.add(D, q), q = r.sub(C, q), q = r.mul(W, q), M = r.add(M, q), C = r.mul(D, M), O = r.add(O, C), C = r.mul(Z, M), T = r.mul(st, T), T = r.sub(T, C), C = r.mul(st, D), R = r.mul(Z, R), R = r.add(R, C), new L(T, O, R);
    }
    subtract(b) {
      return this.add(b.negate());
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
    multiply(b) {
      const { endo: m } = t;
      if (!o.isValidNot0(b))
        throw new Error("invalid scalar: out of range");
      let p, E;
      const A = (B) => gt.cached(this, B, (k) => cc(L, k));
      if (m) {
        const { k1neg: B, k1: k, k2neg: T, k2: O } = $(b), { p: R, f: W } = A(k), { p: H, f: C } = A(O);
        E = W.add(C), p = Y(m.beta, R, H, B, T);
      } else {
        const { p: B, f: k } = A(b);
        p = B, E = k;
      }
      return cc(L, [p, E])[0];
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
        return L.ZERO;
      if (b === en)
        return p;
      if (gt.hasCache(this))
        return this.multiply(b);
      if (m) {
        const { k1neg: E, k1: A, k2neg: B, k2: k } = $(b), { p1: T, p2: O } = hh(L, p, A, k);
        return Y(m.beta, T, O, E, B);
      } else
        return gt.unsafe(p, b);
    }
    /**
     * Converts Projective point to affine (x, y) coordinates.
     * @param invertedZ Z^-1 (inverted zero) - optional, precomputation is useful for invertBatch
     */
    toAffine(b) {
      return F(this, b);
    }
    /**
     * Checks whether Point is free of torsion elements (is in prime subgroup).
     * Always torsion-free for cofactor=1 curves.
     */
    isTorsionFree() {
      const { isTorsionFree: b } = t;
      return i === en ? !0 : b ? b(L, this) : gt.unsafe(this, c).is0();
    }
    clearCofactor() {
      const { clearCofactor: b } = t;
      return i === en ? this : b ? b(L, this) : this.multiplyUnsafe(i);
    }
    isSmallOrder() {
      return this.multiplyUnsafe(i).is0();
    }
    toBytes(b = !0) {
      return _r(b, "isCompressed"), this.assertValidity(), h(L, this, b);
    }
    toHex(b = !0) {
      return co(this.toBytes(b));
    }
    toString() {
      return `<Point ${this.is0() ? "ZERO" : this.toHex()}>`;
    }
  }
  const Pt = o.BITS, gt = new lh(L, t.endo ? Math.ceil(Pt / 2) : Pt);
  return L.BASE.precompute(8), L;
}
function Pu(e) {
  return Uint8Array.of(e ? 2 : 3);
}
function Hu(e, t) {
  return {
    secretKey: t.BYTES,
    publicKey: 1 + e.BYTES,
    publicKeyUncompressed: 1 + 2 * e.BYTES,
    publicKeyHasPrefix: !0,
    signature: 2 * t.BYTES
  };
}
function bh(e, t = {}) {
  const { Fn: n } = e, r = t.randomBytes || ao, o = Object.assign(Hu(e.Fp, n), { seed: Ou(n.ORDER) });
  function s(h) {
    try {
      const w = n.fromBytes(h);
      return n.isValidNot0(w);
    } catch {
      return !1;
    }
  }
  function i(h, w) {
    const { publicKey: g, publicKeyUncompressed: y } = o;
    try {
      const S = h.length;
      return w === !0 && S !== g || w === !1 && S !== y ? !1 : !!e.fromBytes(h);
    } catch {
      return !1;
    }
  }
  function c(h = r(o.seed)) {
    return Uu(et(h, o.seed, "seed"), n.ORDER);
  }
  function a(h, w = !0) {
    return e.BASE.multiply(n.fromBytes(h)).toBytes(w);
  }
  function u(h) {
    const { secretKey: w, publicKey: g, publicKeyUncompressed: y } = o;
    if (!js(h) || "_lengths" in n && n._lengths || w === g)
      return;
    const S = et(h, void 0, "key").length;
    return S === g || S === y;
  }
  function f(h, w, g = !0) {
    if (u(h) === !0)
      throw new Error("first arg must be private key");
    if (u(w) === !1)
      throw new Error("second arg must be public key");
    const y = n.fromBytes(h);
    return e.fromBytes(w).multiply(y).toBytes(g);
  }
  const d = {
    isValidSecretKey: s,
    isValidPublicKey: i,
    randomSecretKey: c
  }, l = Nu(c, a);
  return Object.freeze({ getPublicKey: a, getSharedSecret: f, keygen: l, Point: e, utils: d, lengths: o });
}
function Eh(e, t, n = {}) {
  Va(t), Qs(n, {}, {
    hmac: "function",
    lowS: "boolean",
    randomBytes: "function",
    bits2int: "function",
    bits2int_modN: "function"
  }), n = Object.assign({}, n);
  const r = n.randomBytes || ao, o = n.hmac || ((m, p) => Cu(t, m, p)), { Fp: s, Fn: i } = e, { ORDER: c, BITS: a } = i, { keygen: u, getPublicKey: f, getSharedSecret: d, utils: l, lengths: h } = bh(e, n), w = {
    prehash: !0,
    lowS: typeof n.lowS == "boolean" ? n.lowS : !0,
    format: "compact",
    extraEntropy: !1
  }, g = c * _u < s.ORDER;
  function y(m) {
    const p = c >> en;
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
  function I(m, p) {
    fs(p);
    const E = h.signature, A = p === "compact" ? E : p === "recovered" ? E + 1 : void 0;
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
      I(p, E);
      let A;
      if (E === "der") {
        const { r: O, s: R } = be.toSig(et(p));
        return new N(O, R);
      }
      E === "recovered" && (A = p[0], E = "compact", p = p.subarray(1));
      const B = h.signature / 2, k = p.subarray(0, B), T = p.subarray(B, B * 2);
      return new N(i.fromBytes(k), i.fromBytes(T), A);
    }
    static fromHex(p, E) {
      return this.fromBytes(Cr(p), E);
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
      const { r: E, s: A } = this, B = this.assertRecovery(), k = B === 2 || B === 3 ? E + c : E;
      if (!s.isValid(k))
        throw new Error("invalid recovery id: sig.r+curve.n != R.x");
      const T = s.toBytes(k), O = e.fromBytes(Qt(Pu((B & 1) === 0), T)), R = i.inv(k), W = F(et(p, void 0, "msgHash")), H = i.create(-W * R), C = i.create(A * R), D = e.BASE.multiplyUnsafe(H).add(O.multiplyUnsafe(C));
      if (D.is0())
        throw new Error("invalid recovery: point at infinify");
      return D.assertValidity(), D;
    }
    // Signatures should be low-s, to prevent malleability.
    hasHighS() {
      return y(this.s);
    }
    toBytes(p = w.format) {
      if (fs(p), p === "der")
        return Cr(be.hexFromSig(this));
      const { r: E, s: A } = this, B = i.toBytes(E), k = i.toBytes(A);
      return p === "recovered" ? (v(), Qt(Uint8Array.of(this.assertRecovery()), B, k)) : Qt(B, k);
    }
    toHex(p) {
      return co(this.toBytes(p));
    }
  }
  const $ = n.bits2int || function(p) {
    if (p.length > 8192)
      throw new Error("input is too large");
    const E = En(p), A = p.length * 8 - a;
    return A > 0 ? E >> BigInt(A) : E;
  }, F = n.bits2int_modN || function(p) {
    return i.create($(p));
  }, x = Xs(a);
  function Y(m) {
    return pl("num < 2^" + a, m, ae, x), i.toBytes(m);
  }
  function L(m, p) {
    return et(m, void 0, "message"), p ? et(t(m), void 0, "prehashed message") : m;
  }
  function Pt(m, p, E) {
    const { lowS: A, prehash: B, extraEntropy: k } = $o(E, w);
    m = L(m, B);
    const T = F(m), O = i.fromBytes(p);
    if (!i.isValidNot0(O))
      throw new Error("invalid private key");
    const R = [Y(O), Y(T)];
    if (k != null && k !== !1) {
      const D = k === !0 ? r(h.secretKey) : k;
      R.push(et(D, void 0, "extraEntropy"));
    }
    const W = Qt(...R), H = T;
    function C(D) {
      const q = $(D);
      if (!i.isValidNot0(q))
        return;
      const st = i.inv(q), M = e.BASE.multiply(q).toAffine(), Z = i.create(M.x);
      if (Z === ae)
        return;
      const ne = i.create(st * i.create(H + Z * O));
      if (ne === ae)
        return;
      let xn = (M.x === Z ? 0 : 2) | Number(M.y & en), Sn = ne;
      return A && y(ne) && (Sn = i.neg(ne), xn ^= 1), new N(Z, Sn, g ? void 0 : xn);
    }
    return { seed: W, k2sig: C };
  }
  function gt(m, p, E = {}) {
    const { seed: A, k2sig: B } = Pt(m, p, E);
    return wl(t.outputLen, i.BYTES, o)(A, B).toBytes(E.format);
  }
  function _(m, p, E, A = {}) {
    const { lowS: B, prehash: k, format: T } = $o(A, w);
    if (E = et(E, void 0, "publicKey"), p = L(p, k), !js(m)) {
      const O = m instanceof N ? ", use sig.toBytes()" : "";
      throw new Error("verify expects Uint8Array signature" + O);
    }
    I(m, T);
    try {
      const O = N.fromBytes(m, T), R = e.fromBytes(E);
      if (B && O.hasHighS())
        return !1;
      const { r: W, s: H } = O, C = F(p), D = i.inv(H), q = i.create(C * D), st = i.create(W * D), M = e.BASE.multiplyUnsafe(q).add(R.multiplyUnsafe(st));
      return M.is0() ? !1 : i.create(M.x) === W;
    } catch {
      return !1;
    }
  }
  function b(m, p, E = {}) {
    const { prehash: A } = $o(E, w);
    return p = L(p, A), N.fromBytes(m, "recovered").recoverPublicKey(p).toBytes();
  }
  return Object.freeze({
    keygen: u,
    getPublicKey: f,
    getSharedSecret: d,
    utils: l,
    lengths: h,
    Point: e,
    sign: gt,
    verify: _,
    recoverPublicKey: b,
    Signature: N,
    hash: t
  });
}
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const po = {
  p: BigInt("0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffefffffc2f"),
  n: BigInt("0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141"),
  h: BigInt(1),
  a: BigInt(0),
  b: BigInt(7),
  Gx: BigInt("0x79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798"),
  Gy: BigInt("0x483ada7726a3c4655da4fbfc0e1108a8fd17b448a68554199c47d08ffb10d4b8")
}, xh = {
  beta: BigInt("0x7ae96a2b657c07106e64479eac3434e99cf0497512f58995c1396c28719501ee"),
  basises: [
    [BigInt("0x3086d221a7d46bcde86c90e49284eb15"), -BigInt("0xe4437ed6010e88286f547fa90abfe4c3")],
    [BigInt("0x114ca50f7a8e2f3f657c1108d9d44cfd8"), BigInt("0x3086d221a7d46bcde86c90e49284eb15")]
  ]
}, Sh = /* @__PURE__ */ BigInt(0), ds = /* @__PURE__ */ BigInt(2);
function vh(e) {
  const t = po.p, n = BigInt(3), r = BigInt(6), o = BigInt(11), s = BigInt(22), i = BigInt(23), c = BigInt(44), a = BigInt(88), u = e * e * e % t, f = u * u * e % t, d = Nt(f, n, t) * f % t, l = Nt(d, n, t) * f % t, h = Nt(l, ds, t) * u % t, w = Nt(h, o, t) * h % t, g = Nt(w, s, t) * w % t, y = Nt(g, c, t) * g % t, S = Nt(y, a, t) * y % t, v = Nt(S, c, t) * g % t, I = Nt(v, n, t) * f % t, N = Nt(I, i, t) * w % t, $ = Nt(N, r, t) * u % t, F = Nt($, ds, t);
  if (!Kr.eql(Kr.sqr(F), e))
    throw new Error("Cannot find square root");
  return F;
}
const Kr = ho(po.p, { sqrt: vh }), je = /* @__PURE__ */ mh(po, {
  Fp: Kr,
  endo: xh
}), lc = /* @__PURE__ */ Eh(je, us), hc = {};
function Fr(e, ...t) {
  let n = hc[e];
  if (n === void 0) {
    const r = us(ll(e));
    n = Qt(r, r), hc[e] = n;
  }
  return us(Qt(n, ...t));
}
const ni = (e) => e.toBytes(!0).slice(1), ri = (e) => e % ds === Sh;
function ls(e) {
  const { Fn: t, BASE: n } = je, r = t.fromBytes(e), o = n.multiply(r);
  return { scalar: ri(o.y) ? r : t.neg(r), bytes: ni(o) };
}
function Vu(e) {
  const t = Kr;
  if (!t.isValidNot0(e))
    throw new Error("invalid x: Fail if x ≥ p");
  const n = t.create(e * e), r = t.create(n * e + BigInt(7));
  let o = t.sqrt(r);
  ri(o) || (o = t.neg(o));
  const s = je.fromAffine({ x: e, y: o });
  return s.assertValidity(), s;
}
const Rn = En;
function Du(...e) {
  return je.Fn.create(Rn(Fr("BIP0340/challenge", ...e)));
}
function pc(e) {
  return ls(e).bytes;
}
function Th(e, t, n = ao(32)) {
  const { Fn: r } = je, o = et(e, void 0, "message"), { bytes: s, scalar: i } = ls(t), c = et(n, 32, "auxRand"), a = r.toBytes(i ^ Rn(Fr("BIP0340/aux", c))), u = Fr("BIP0340/nonce", a, s, o), { bytes: f, scalar: d } = ls(u), l = Du(f, s, o), h = new Uint8Array(64);
  if (h.set(f, 0), h.set(r.toBytes(r.create(d + l * i)), 32), !Mu(h, o, s))
    throw new Error("sign: Invalid signature produced");
  return h;
}
function Mu(e, t, n) {
  const { Fp: r, Fn: o, BASE: s } = je, i = et(e, 64, "signature"), c = et(t, void 0, "message"), a = et(n, 32, "publicKey");
  try {
    const u = Vu(Rn(a)), f = Rn(i.subarray(0, 32));
    if (!r.isValidNot0(f))
      return !1;
    const d = Rn(i.subarray(32, 64));
    if (!o.isValidNot0(d))
      return !1;
    const l = Du(o.toBytes(f), ni(u), c), h = s.multiplyUnsafe(d).add(u.multiplyUnsafe(o.neg(l))), { x: w, y: g } = h.toAffine();
    return !(h.is0() || !ri(g) || w !== f);
  } catch {
    return !1;
  }
}
const oi = /* @__PURE__ */ (() => {
  const n = (r = ao(48)) => Uu(r, po.n);
  return {
    keygen: Nu(n, pc),
    getPublicKey: pc,
    sign: Th,
    verify: Mu,
    Point: je,
    utils: {
      randomSecretKey: n,
      taggedHash: Fr,
      lift_x: Vu,
      pointToBytes: ni
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
function si(e, t, n = {}) {
  e = ns(e);
  const { aggPublicKey: r } = rs(e);
  if (!n.taprootTweak)
    return {
      preTweakedKey: r.toBytes(!0),
      finalKey: r.toBytes(!0)
    };
  const o = oi.utils.taggedHash("TapTweak", r.toBytes(!0).subarray(1), n.taprootTweak ?? new Uint8Array(0)), { aggPublicKey: s } = rs(e, [o], [!0]);
  return {
    preTweakedKey: r.toBytes(!0),
    finalKey: s.toBytes(!0)
  };
}
class sr extends Error {
  constructor(t) {
    super(t), this.name = "PartialSignatureError";
  }
}
class ii {
  constructor(t, n) {
    if (this.s = t, this.R = n, t.length !== 32)
      throw new sr("Invalid s length");
    if (n.length !== 33)
      throw new sr("Invalid R length");
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
      throw new sr("Invalid partial signature length");
    if (En(t) >= xt.CURVE().n)
      throw new sr("s value overflows curve order");
    const r = new Uint8Array(33);
    return new ii(t, r);
  }
}
function Ah(e, t, n, r, o, s) {
  let i;
  if (s?.taprootTweak !== void 0) {
    const { preTweakedKey: u } = si(ns(r));
    i = oi.utils.taggedHash("TapTweak", u.subarray(1), s.taprootTweak);
  }
  const a = new ol(n, ns(r), o, i ? [i] : void 0, i ? [!0] : void 0).sign(e, t);
  return ii.decode(a);
}
var Ro, gc;
function kh() {
  if (gc) return Ro;
  gc = 1;
  const e = 4294967295, t = 1 << 31, n = 9, r = 65535, o = 1 << 22, s = r, i = 1 << n, c = r << n;
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
      if (d % i !== 0) throw new TypeError("Expected Number seconds as a multiple of " + i);
      return o | d >> n;
    }
    if (!Number.isFinite(f)) throw new TypeError("Expected Number blocks");
    if (f > r) throw new TypeError("Expected Number blocks <= " + s);
    return f;
  }
  return Ro = { decode: a, encode: u }, Ro;
}
var hs = kh(), Ot;
(function(e) {
  e.VtxoTaprootTree = "taptree", e.VtxoTreeExpiry = "expiry", e.Cosigner = "cosigner", e.ConditionWitness = "condition";
})(Ot || (Ot = {}));
const ci = 222;
function Ih(e, t, n, r) {
  e.updateInput(t, {
    unknown: [
      ...e.getInput(t)?.unknown ?? [],
      n.encode(r)
    ]
  });
}
function ps(e, t, n) {
  const r = e.getInput(t)?.unknown ?? [], o = [];
  for (const s of r) {
    const i = n.decode(s);
    i && o.push(i);
  }
  return o;
}
const Ku = {
  key: Ot.VtxoTaprootTree,
  encode: (e) => [
    {
      type: ci,
      key: go[Ot.VtxoTaprootTree]
    },
    e
  ],
  decode: (e) => ai(() => ui(e[0], Ot.VtxoTaprootTree) ? e[1] : null)
}, Bh = {
  key: Ot.ConditionWitness,
  encode: (e) => [
    {
      type: ci,
      key: go[Ot.ConditionWitness]
    },
    _n.encode(e)
  ],
  decode: (e) => ai(() => ui(e[0], Ot.ConditionWitness) ? _n.decode(e[1]) : null)
}, gs = {
  key: Ot.Cosigner,
  encode: (e) => [
    {
      type: ci,
      key: new Uint8Array([
        ...go[Ot.Cosigner],
        e.index
      ])
    },
    e.key
  ],
  decode: (e) => ai(() => ui(e[0], Ot.Cosigner) ? {
    index: e[0].key[e[0].key.length - 1],
    key: e[1]
  } : null)
};
Ot.VtxoTreeExpiry;
const go = Object.fromEntries(Object.values(Ot).map((e) => [
  e,
  new TextEncoder().encode(e)
])), ai = (e) => {
  try {
    return e();
  } catch {
    return null;
  }
};
function ui(e, t) {
  const n = U.encode(go[t]);
  return U.encode(new Uint8Array([e.type, ...e.key])).includes(n);
}
const ir = new Error("missing vtxo graph");
class Mn {
  constructor(t) {
    this.secretKey = t, this.myNonces = null, this.aggregateNonces = null, this.graph = null, this.scriptRoot = null, this.rootSharedOutputAmount = null;
  }
  static random() {
    const t = qo();
    return new Mn(t);
  }
  async init(t, n, r) {
    this.graph = t, this.scriptRoot = n, this.rootSharedOutputAmount = r;
  }
  async getPublicKey() {
    return lc.getPublicKey(this.secretKey);
  }
  async getNonces() {
    if (!this.graph)
      throw ir;
    this.myNonces || (this.myNonces = this.generateNonces());
    const t = /* @__PURE__ */ new Map();
    for (const [n, r] of this.myNonces)
      t.set(n, { pubNonce: r.pubNonce });
    return t;
  }
  async aggregatedNonces(t, n) {
    if (!this.graph)
      throw ir;
    if (this.aggregateNonces || (this.aggregateNonces = /* @__PURE__ */ new Map()), this.myNonces || await this.getNonces(), this.aggregateNonces.has(t))
      return {
        hasAllNonces: this.aggregateNonces.size === this.myNonces?.size
      };
    const r = this.myNonces.get(t);
    if (!r)
      throw new Error(`missing nonce for txid ${t}`);
    const o = await this.getPublicKey();
    n.set(U.encode(o.subarray(1)), r);
    const s = this.graph.find(t);
    if (!s)
      throw new Error(`missing tx for txid ${t}`);
    const i = ps(s.root, 0, gs).map(
      (u) => U.encode(u.key.subarray(1))
      // xonly pubkey
    ), c = [];
    for (const u of i) {
      const f = n.get(u);
      if (!f)
        throw new Error(`missing nonce for cosigner ${u}`);
      c.push(f.pubNonce);
    }
    const a = il(c);
    return this.aggregateNonces.set(t, { pubNonce: a }), {
      hasAllNonces: this.aggregateNonces.size === this.myNonces?.size
    };
  }
  async sign() {
    if (!this.graph)
      throw ir;
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
      throw ir;
    const t = /* @__PURE__ */ new Map(), n = lc.getPublicKey(this.secretKey);
    for (const r of this.graph.iterator()) {
      const o = sl(n);
      t.set(r.txid, o);
    }
    return t;
  }
  signPartial(t) {
    if (!this.graph || !this.scriptRoot || !this.rootSharedOutputAmount)
      throw Mn.NOT_INITIALIZED;
    if (!this.myNonces || !this.aggregateNonces)
      throw new Error("session not properly initialized");
    const n = this.myNonces.get(t.txid);
    if (!n)
      throw new Error("missing private nonce");
    const r = this.aggregateNonces.get(t.txid);
    if (!r)
      throw new Error("missing aggregate nonce");
    const o = [], s = [], i = ps(t.root, 0, gs).map((u) => u.key), { finalKey: c } = si(i, !0, {
      taprootTweak: this.scriptRoot
    });
    for (let u = 0; u < t.root.inputsLength; u++) {
      const f = Oh(c, this.graph, this.rootSharedOutputAmount, t.root);
      o.push(f.amount), s.push(f.script);
    }
    const a = t.root.preimageWitnessV1(
      0,
      // always first input
      s,
      Fe.DEFAULT,
      o
    );
    return Ah(n.secNonce, this.secretKey, r.pubNonce, i, a, {
      taprootTweak: this.scriptRoot
    });
  }
}
Mn.NOT_INITIALIZED = new Error("session not initialized, call init method");
function Oh(e, t, n, r) {
  const o = K.encode(["OP_1", e.slice(1)]);
  if (r.id === t.txid)
    return {
      amount: n,
      script: o
    };
  const s = r.getInput(0);
  if (!s.txid)
    throw new Error("missing parent input txid");
  const i = U.encode(s.txid), c = t.find(i);
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
const wc = Object.values(Fe).filter((e) => typeof e == "number");
class Nn {
  constructor(t) {
    this.key = t || qo();
  }
  static fromPrivateKey(t) {
    return new Nn(t);
  }
  static fromHex(t) {
    return new Nn(U.decode(t));
  }
  static fromRandomBytes() {
    return new Nn(qo());
  }
  /**
   * Export the private key as a hex string.
   *
   * @returns The private key as a hex string
   */
  toHex() {
    return U.encode(this.key);
  }
  async sign(t, n) {
    const r = t.clone();
    if (!n) {
      try {
        if (!r.sign(this.key, wc))
          throw new Error("Failed to sign transaction");
      } catch (o) {
        if (!(o instanceof Error && o.message.includes("No inputs signed"))) throw o;
      }
      return r;
    }
    for (const o of n)
      if (!r.signIdx(this.key, o, wc))
        throw new Error(`Failed to sign input #${o}`);
    return r;
  }
  compressedPublicKey() {
    return Promise.resolve(va(this.key, !0));
  }
  xOnlyPublicKey() {
    return Promise.resolve(Hs(this.key));
  }
  signerSession() {
    return Mn.random();
  }
  async signMessage(t, n = "schnorr") {
    return n === "ecdsa" ? Vl(t, this.key, { prehash: !1 }) : zl.signAsync(t, this.key);
  }
}
class pn {
  constructor(t, n, r, o = 0) {
    if (this.serverPubKey = t, this.vtxoTaprootKey = n, this.hrp = r, this.version = o, t.length !== 32)
      throw new Error("Invalid server public key length, expected 32 bytes, got " + t.length);
    if (n.length !== 32)
      throw new Error("Invalid vtxo taproot public key length, expected 32 bytes, got " + n.length);
  }
  static decode(t) {
    const n = Ye.decodeUnsafe(t, 1023);
    if (!n)
      throw new Error("Invalid address");
    const r = new Uint8Array(Ye.fromWords(n.words));
    if (r.length !== 65)
      throw new Error("Invalid data length, expected 65 bytes, got " + r.length);
    const o = r[0], s = r.slice(1, 33), i = r.slice(33, 65);
    return new pn(s, i, n.prefix, o);
  }
  encode() {
    const t = new Uint8Array(65);
    t[0] = this.version, t.set(this.serverPubKey, 1), t.set(this.vtxoTaprootKey, 33);
    const n = Ye.toWords(t);
    return Ye.encode(this.hrp, n, 1023);
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
const Wr = Ms(void 0, !0);
var ft;
(function(e) {
  e.Multisig = "multisig", e.CSVMultisig = "csv-multisig", e.ConditionCSVMultisig = "condition-csv-multisig", e.ConditionMultisig = "condition-multisig", e.CLTVMultisig = "cltv-multisig";
})(ft || (ft = {}));
function Fu(e) {
  const t = [
    zt,
    Ut,
    Kn,
    Gr,
    Fn
  ];
  for (const n of t)
    try {
      return n.decode(e);
    } catch {
      continue;
    }
  throw new Error(`Failed to decode: script ${U.encode(e)} is not a valid tapscript`);
}
var zt;
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
        script: qd(c.pubkeys.length, c.pubkeys).script
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
    for (let l = 0; l < a.length; l++) {
      const h = a[l];
      if (typeof h != "string" && typeof h != "number") {
        if (h.length !== 32)
          throw new Error(`Invalid pubkey length: expected 32, got ${h.length}`);
        if (u.push(h), l + 1 >= a.length || a[l + 1] !== "CHECKSIGADD" && a[l + 1] !== "CHECKSIG")
          throw new Error("Expected CHECKSIGADD or CHECKSIG after pubkey");
        l++;
        continue;
      }
      if (l === a.length - 1) {
        if (h !== "NUMEQUAL")
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
    if (U.encode(d.script) !== U.encode(c))
      throw new Error("Invalid script format: script reconstruction mismatch");
    return {
      type: ft.Multisig,
      params: { pubkeys: u, type: t.CHECKSIGADD },
      script: c
    };
  }
  function s(c) {
    const a = K.decode(c), u = [];
    for (let d = 0; d < a.length; d++) {
      const l = a[d];
      if (typeof l != "string" && typeof l != "number") {
        if (l.length !== 32)
          throw new Error(`Invalid pubkey length: expected 32, got ${l.length}`);
        if (u.push(l), d + 1 >= a.length)
          throw new Error("Unexpected end of script");
        const h = a[d + 1];
        if (h !== "CHECKSIGVERIFY" && h !== "CHECKSIG")
          throw new Error("Expected CHECKSIGVERIFY or CHECKSIG after pubkey");
        if (d === a.length - 2 && h !== "CHECKSIG")
          throw new Error("Last operation must be CHECKSIG");
        d++;
        continue;
      }
    }
    if (u.length === 0)
      throw new Error("Invalid script: must have at least 1 pubkey");
    const f = n({ pubkeys: u, type: t.CHECKSIG });
    if (U.encode(f.script) !== U.encode(c))
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
})(zt || (zt = {}));
var Ut;
(function(e) {
  function t(o) {
    for (const u of o.pubkeys)
      if (u.length !== 32)
        throw new Error(`Invalid pubkey length: expected 32, got ${u.length}`);
    const s = Wr.encode(BigInt(hs.encode(o.timelock.type === "blocks" ? { blocks: Number(o.timelock.value) } : { seconds: Number(o.timelock.value) }))), i = [
      s.length === 1 ? s[0] : s,
      "CHECKSEQUENCEVERIFY",
      "DROP"
    ], c = zt.encode(o), a = new Uint8Array([
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
      a = zt.decode(c);
    } catch (h) {
      throw new Error(`Invalid multisig script: ${h instanceof Error ? h.message : String(h)}`);
    }
    let u;
    typeof i == "number" ? u = i : u = Number(Wr.decode(i));
    const f = hs.decode(u), d = f.blocks !== void 0 ? { type: "blocks", value: BigInt(f.blocks) } : { type: "seconds", value: BigInt(f.seconds) }, l = t({
      timelock: d,
      ...a.params
    });
    if (U.encode(l.script) !== U.encode(o))
      throw new Error("Invalid script format: script reconstruction mismatch");
    return {
      type: ft.CSVMultisig,
      params: {
        timelock: d,
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
var Kn;
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
    for (let d = s.length - 1; d >= 0; d--)
      s[d] === "VERIFY" && (i = d);
    if (i === -1)
      throw new Error("Invalid script: missing VERIFY operation");
    const c = new Uint8Array(K.encode(s.slice(0, i))), a = new Uint8Array(K.encode(s.slice(i + 1)));
    let u;
    try {
      u = Ut.decode(a);
    } catch (d) {
      throw new Error(`Invalid CSV multisig script: ${d instanceof Error ? d.message : String(d)}`);
    }
    const f = t({
      conditionScript: c,
      ...u.params
    });
    if (U.encode(f.script) !== U.encode(o))
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
})(Kn || (Kn = {}));
var Gr;
(function(e) {
  function t(o) {
    const s = new Uint8Array([
      ...o.conditionScript,
      ...K.encode(["VERIFY"]),
      ...zt.encode(o).script
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
    for (let d = s.length - 1; d >= 0; d--)
      s[d] === "VERIFY" && (i = d);
    if (i === -1)
      throw new Error("Invalid script: missing VERIFY operation");
    const c = new Uint8Array(K.encode(s.slice(0, i))), a = new Uint8Array(K.encode(s.slice(i + 1)));
    let u;
    try {
      u = zt.decode(a);
    } catch (d) {
      throw new Error(`Invalid multisig script: ${d instanceof Error ? d.message : String(d)}`);
    }
    const f = t({
      conditionScript: c,
      ...u.params
    });
    if (U.encode(f.script) !== U.encode(o))
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
})(Gr || (Gr = {}));
var Fn;
(function(e) {
  function t(o) {
    const s = Wr.encode(o.absoluteTimelock), i = [
      s.length === 1 ? s[0] : s,
      "CHECKLOCKTIMEVERIFY",
      "DROP"
    ], c = K.encode(i), a = new Uint8Array([
      ...c,
      ...zt.encode(o).script
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
      a = zt.decode(c);
    } catch (d) {
      throw new Error(`Invalid multisig script: ${d instanceof Error ? d.message : String(d)}`);
    }
    const u = Wr.decode(i), f = t({
      absoluteTimelock: u,
      ...a.params
    });
    if (U.encode(f.script) !== U.encode(o))
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
})(Fn || (Fn = {}));
const yc = Pn.tapTree[2];
function Ln(e) {
  return e[1].subarray(0, e[1].length - 1);
}
class _t {
  static decode(t) {
    const r = yc.decode(t).map((o) => o.script);
    return new _t(r);
  }
  constructor(t) {
    this.scripts = t;
    const n = t.length % 2 !== 0 ? t.slice().reverse() : t, r = $a(n.map((s) => ({
      script: s,
      leafVersion: Hn
    }))), o = zd(Ds, r, void 0, !0);
    if (!o.tapLeafScript || o.tapLeafScript.length !== t.length)
      throw new Error("invalid scripts");
    this.leaves = o.tapLeafScript, this.tweakedPublicKey = o.tweakedPubkey;
  }
  encode() {
    return yc.encode(this.scripts.map((n) => ({
      depth: 1,
      version: Hn,
      script: n
    })));
  }
  address(t, n) {
    return new pn(n, this.tweakedPublicKey, t);
  }
  get pkScript() {
    return K.encode(["OP_1", this.tweakedPublicKey]);
  }
  onchainAddress(t) {
    return Ke(t).encode({
      type: "tr",
      pubkey: this.tweakedPublicKey
    });
  }
  findLeaf(t) {
    const n = this.leaves.find((r) => U.encode(Ln(r)) === t);
    if (!n)
      throw new Error(`leaf '${t}' not found`);
    return n;
  }
  exitPaths() {
    const t = [];
    for (const n of this.leaves)
      try {
        const r = Ut.decode(Ln(n));
        t.push(r);
        continue;
      } catch {
        try {
          const o = Kn.decode(Ln(n));
          t.push(o);
        } catch {
          continue;
        }
      }
    return t;
  }
}
var mc;
(function(e) {
  class t extends _t {
    constructor(o) {
      n(o);
      const { sender: s, receiver: i, server: c, preimageHash: a, refundLocktime: u, unilateralClaimDelay: f, unilateralRefundDelay: d, unilateralRefundWithoutReceiverDelay: l } = o, h = Uh(a), w = Gr.encode({
        conditionScript: h,
        pubkeys: [i, c]
      }).script, g = zt.encode({
        pubkeys: [s, i, c]
      }).script, y = Fn.encode({
        absoluteTimelock: u,
        pubkeys: [s, c]
      }).script, S = Kn.encode({
        conditionScript: h,
        timelock: f,
        pubkeys: [i]
      }).script, v = Ut.encode({
        timelock: d,
        pubkeys: [s, i]
      }).script, I = Ut.encode({
        timelock: l,
        pubkeys: [s]
      }).script;
      super([
        w,
        g,
        y,
        S,
        v,
        I
      ]), this.options = o, this.claimScript = U.encode(w), this.refundScript = U.encode(g), this.refundWithoutReceiverScript = U.encode(y), this.unilateralClaimScript = U.encode(S), this.unilateralRefundScript = U.encode(v), this.unilateralRefundWithoutReceiverScript = U.encode(I);
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
    const { sender: o, receiver: s, server: i, preimageHash: c, refundLocktime: a, unilateralClaimDelay: u, unilateralRefundDelay: f, unilateralRefundWithoutReceiverDelay: d } = r;
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
    if (!d || typeof d.value != "bigint" || d.value <= 0n)
      throw new Error("unilateral refund without receiver delay must greater than 0");
    if (d.type === "seconds" && d.value % 512n !== 0n)
      throw new Error("seconds timelock must be multiple of 512");
    if (d.type === "seconds" && d.value < 512n)
      throw new Error("seconds timelock must be greater or equal to 512");
  }
})(mc || (mc = {}));
function Uh(e) {
  return K.encode(["HASH160", e, "EQUAL"]);
}
var zr;
(function(e) {
  class t extends _t {
    constructor(r) {
      const { pubKey: o, serverPubKey: s, csvTimelock: i = t.DEFAULT_TIMELOCK } = r, c = zt.encode({
        pubkeys: [o, s]
      }).script, a = Ut.encode({
        timelock: i,
        pubkeys: [o]
      }).script;
      super([c, a]), this.options = r, this.forfeitScript = U.encode(c), this.exitScript = U.encode(a);
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
})(zr || (zr = {}));
var gn;
(function(e) {
  e.TxSent = "SENT", e.TxReceived = "RECEIVED";
})(gn || (gn = {}));
function ue(e) {
  return !e.isSpent;
}
function ws(e) {
  return e.virtualStatus.state === "swept" && ue(e);
}
function Wu(e, t) {
  return e.value < t;
}
function Gu(e, t, n) {
  const r = [], o = new Set(t.filter((c) => c.arkTxId).map((c) => c.arkTxId));
  let s = [...t];
  for (const c of [...e, ...t]) {
    if (c.virtualStatus.state !== "preconfirmed" && c.virtualStatus.commitmentTxIds && c.virtualStatus.commitmentTxIds.some((w) => n.has(w)) || c.arkTxId || o.has(c.txid))
      continue;
    const a = $h(s, c);
    s = bc(s, a);
    const u = cr(a);
    if (c.value <= u)
      continue;
    const f = Rh(s, c);
    s = bc(s, f);
    const d = cr(f);
    if (c.value <= d)
      continue;
    const l = {
      commitmentTxid: c.spentBy || "",
      boardingTxid: "",
      arkTxid: ""
    };
    let h = c.virtualStatus.state !== "preconfirmed";
    c.virtualStatus.state === "preconfirmed" && (l.arkTxid = c.txid, c.spentBy && (h = !0)), r.push({
      key: l,
      amount: c.value - u - d,
      type: gn.TxReceived,
      createdAt: c.createdAt.getTime(),
      settled: h
    });
  }
  const i = /* @__PURE__ */ new Map();
  for (const c of t) {
    const a = c.arkTxId || c.settledBy;
    if (!a)
      continue;
    i.has(a) || i.set(a, []);
    const u = i.get(a);
    i.set(a, [...u, c]);
  }
  for (const [c, a] of i) {
    const u = Nh([...e, ...t], c), f = cr(u), d = cr(a);
    if (d <= f)
      continue;
    const l = Lh(u, a), h = {
      commitmentTxid: l.virtualStatus.commitmentTxIds?.[0] || "",
      boardingTxid: "",
      arkTxid: ""
    };
    a.some((g) => g.arkTxId === c) ? h.arkTxid = c : l.virtualStatus.state === "preconfirmed" && (h.arkTxid = l.txid), r.push({
      key: h,
      amount: d - f,
      type: gn.TxSent,
      createdAt: l.createdAt.getTime(),
      settled: !0
    });
  }
  return r;
}
function $h(e, t) {
  return t.virtualStatus.state === "preconfirmed" ? [] : e.filter((n) => n.settledBy ? t.virtualStatus.commitmentTxIds?.includes(n.settledBy) ?? !1 : !1);
}
function Rh(e, t) {
  return e.filter((n) => n.arkTxId ? n.arkTxId === t.txid : !1);
}
function Nh(e, t) {
  return e.filter((n) => n.virtualStatus.state !== "preconfirmed" && n.virtualStatus.commitmentTxIds?.includes(t) ? !0 : n.txid === t);
}
function cr(e) {
  return e.reduce((t, n) => t + n.value, 0);
}
function Lh(e, t) {
  return e.length === 0 ? t[0] : e[0];
}
function bc(e, t) {
  return e.filter((n) => {
    for (const r of t)
      if (n.txid === r.txid && n.vout === r.vout)
        return !1;
    return !0;
  });
}
const Ch = (e) => _h[e], _h = {
  bitcoin: In(un, "ark"),
  testnet: In(tr, "tark"),
  signet: In(tr, "tark"),
  mutinynet: In(tr, "tark"),
  regtest: In({
    ...tr,
    bech32: "bcrt",
    pubKeyHash: 111,
    scriptHash: 196
  }, "tark")
};
function In(e, t) {
  return {
    ...e,
    hrp: t
  };
}
const Ph = {
  bitcoin: "https://mempool.space/api",
  testnet: "https://mempool.space/testnet/api",
  signet: "https://mempool.space/signet/api",
  mutinynet: "https://mutinynet.com/api",
  regtest: "http://localhost:3000"
};
class Hh {
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
      const a = async () => (await Promise.all(t.map((h) => this.getTransactions(h)))).flat(), u = await a(), f = (l) => `${l.txid}_${l.status.block_time}`, d = new Set(u.map(f));
      r = setInterval(async () => {
        try {
          const h = (await a()).filter((w) => !d.has(f(w)));
          h.length > 0 && (h.forEach((w) => d.add(f(w))), n(h));
        } catch (l) {
          console.error("Error in polling mechanism:", l);
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
          const d = f["multi-address-transactions"];
          for (const l in d)
            for (const h of [
              "mempool",
              "confirmed",
              "removed"
            ])
              d[l][h] && u.push(...d[l][h].filter(Dh));
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
    if (!Vh(n))
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
function Vh(e) {
  return Array.isArray(e) && e.every((t) => {
    t && typeof t == "object" && typeof t.id == "string" && t.id.length > 0 && typeof t.height == "number" && t.height >= 0 && typeof t.mediantime == "number" && t.mediantime > 0;
  });
}
const Dh = (e) => typeof e.txid == "string" && Array.isArray(e.vout) && e.vout.every((t) => typeof t.scriptpubkey_address == "string" && typeof t.value == "number") && typeof e.status == "object" && typeof e.status.confirmed == "boolean";
async function* ys(e) {
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
class Mh extends Error {
  constructor(t, n, r, o) {
    super(n), this.code = t, this.message = n, this.name = r, this.metadata = o;
  }
}
function Kh(e) {
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
      return "metadata" in n && Fh(n.metadata) && (c = n.metadata), new Mh(o, s, i, c);
    }
    return;
  } catch {
    return;
  }
}
function Fh(e) {
  return typeof e == "object" && e !== null && !Array.isArray(e);
}
var J;
(function(e) {
  e.BatchStarted = "batch_started", e.BatchFinalization = "batch_finalization", e.BatchFinalized = "batch_finalized", e.BatchFailed = "batch_failed", e.TreeSigningStarted = "tree_signing_started", e.TreeNonces = "tree_nonces", e.TreeTx = "tree_tx", e.TreeSignature = "tree_signature";
})(J || (J = {}));
class zu {
  constructor(t) {
    this.serverUrl = t;
  }
  async getInfo() {
    const t = `${this.serverUrl}/v1/info`, n = await fetch(t);
    if (!n.ok) {
      const o = await n.text();
      Yt(o, `Failed to get server info: ${n.statusText}`);
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
          onchainInput: BigInt(r.fees?.intentFee?.onchainInput ?? 0),
          onchainOutput: BigInt(r.fees?.intentFee?.onchainOutput ?? 0)
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
      const i = await o.text();
      Yt(i, `Failed to submit virtual transaction: ${i}`);
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
      Yt(s, `Failed to finalize offchain transaction: ${s}`);
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
      Yt(s, `Failed to register intent: ${s}`);
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
          message: t.message
        }
      })
    });
    if (!r.ok) {
      const o = await r.text();
      Yt(o, `Failed to delete intent: ${o}`);
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
      Yt(o, `Failed to confirm registration: ${o}`);
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
        treeNonces: Wh(r)
      })
    });
    if (!s.ok) {
      const i = await s.text();
      Yt(i, `Failed to submit tree nonces: ${i}`);
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
        treeSignatures: Gh(r)
      })
    });
    if (!s.ok) {
      const i = await s.text();
      Yt(i, `Failed to submit tree signatures: ${i}`);
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
      Yt(s, `Failed to submit forfeit transactions: ${o.statusText}`);
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
          for await (const c of ys(s)) {
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
        if (ms(s)) {
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
          for await (const s of ys(r)) {
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
        if (ms(r)) {
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
      Yt(s, `Failed to get pending transactions: ${s}`);
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
        nonces: zh(t.treeNonces.nonces)
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
        spentVtxos: t.commitmentTx.spentVtxos.map(ar),
        spendableVtxos: t.commitmentTx.spendableVtxos.map(ar),
        checkpointTxs: t.commitmentTx.checkpointTxs
      }
    } : t.arkTx ? {
      arkTx: {
        txid: t.arkTx.txid,
        tx: t.arkTx.tx,
        spentVtxos: t.arkTx.spentVtxos.map(ar),
        spendableVtxos: t.arkTx.spendableVtxos.map(ar),
        checkpointTxs: t.arkTx.checkpointTxs
      }
    } : (t.heartbeat || console.warn("Unknown transaction notification type:", t), null);
  }
}
function Wh(e) {
  const t = {};
  for (const [n, r] of e)
    t[n] = U.encode(r.pubNonce);
  return t;
}
function Gh(e) {
  const t = {};
  for (const [n, r] of e)
    t[n] = U.encode(r.encode());
  return t;
}
function zh(e) {
  return new Map(Object.entries(e).map(([t, n]) => {
    if (typeof n != "string")
      throw new Error("invalid nonce");
    return [t, { pubNonce: U.decode(n) }];
  }));
}
function ms(e) {
  const t = (n) => n instanceof Error ? n.name === "TypeError" && n.message === "Failed to fetch" || n.name === "HeadersTimeoutError" || n.name === "BodyTimeoutError" || n.code === "UND_ERR_HEADERS_TIMEOUT" || n.code === "UND_ERR_BODY_TIMEOUT" : !1;
  return t(e) || t(e.cause);
}
function ar(e) {
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
function Yt(e, t) {
  const n = new Error(e);
  throw Kh(n) ?? new Error(t);
}
const qh = 0n, jh = new Uint8Array([81, 2, 78, 115]), fi = {
  script: jh,
  amount: qh
};
U.encode(fi.script);
function Yh(e, t, n) {
  const r = new Ie({
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
  }), r.addOutput(fi), r;
}
const Zh = new Error("invalid settlement transaction outputs"), Xh = new Error("empty tree"), Qh = new Error("invalid number of inputs"), No = new Error("wrong settlement txid"), Jh = new Error("invalid amount"), tp = new Error("no leaves"), ep = new Error("invalid taproot script"), Ec = new Error("invalid round transaction outputs"), np = new Error("wrong commitment txid"), rp = new Error("missing cosigners public keys"), Lo = 0, xc = 1;
function op(e, t) {
  if (t.validate(), t.root.inputsLength !== 1)
    throw Qh;
  const n = t.root.getInput(0), r = Xt.fromPSBT(Et.decode(e));
  if (r.outputsLength <= xc)
    throw Zh;
  const o = r.id;
  if (!n.txid || U.encode(n.txid) !== o || n.index !== xc)
    throw No;
}
function sp(e, t, n) {
  if (t.outputsLength < Lo + 1)
    throw Ec;
  const r = t.getOutput(Lo)?.amount;
  if (!r)
    throw Ec;
  if (!e.root)
    throw Xh;
  const o = e.root.getInput(0), s = t.id;
  if (!o.txid || U.encode(o.txid) !== s || o.index !== Lo)
    throw np;
  let i = 0n;
  for (let a = 0; a < e.root.outputsLength; a++) {
    const u = e.root.getOutput(a);
    u?.amount && (i += u.amount);
  }
  if (i !== r)
    throw Jh;
  if (e.leaves().length === 0)
    throw tp;
  e.validate();
  for (const a of e.iterator())
    for (const [u, f] of a.children) {
      const d = a.root.getOutput(u);
      if (!d?.script)
        throw new Error(`parent output ${u} not found`);
      const l = d.script.slice(2);
      if (l.length !== 32)
        throw new Error(`parent output ${u} has invalid script`);
      const h = ps(f.root, 0, gs);
      if (h.length === 0)
        throw rp;
      const w = h.map((y) => y.key), { finalKey: g } = si(w, !0, {
        taprootTweak: n
      });
      if (!g || U.encode(g.slice(1)) !== U.encode(l))
        throw ep;
    }
}
function ip(e, t, n) {
  let r = !1;
  for (const [i, c] of t.entries()) {
    if (!c.script)
      throw new Error(`missing output script ${i}`);
    if (K.decode(c.script)[0] === "RETURN") {
      if (r)
        throw new Error("multiple OP_RETURN outputs");
      r = !0;
    }
  }
  const o = e.map((i) => cp(i, n));
  return {
    arkTx: qu(o.map((i) => i.input), t),
    checkpoints: o.map((i) => i.tx)
  };
}
function qu(e, t) {
  let n = 0n;
  for (const o of e) {
    const s = Fu(Ln(o.tapLeafScript));
    if (Fn.is(s)) {
      if (n !== 0n && Sc(n) !== Sc(s.params.absoluteTimelock))
        throw new Error("cannot mix seconds and blocks locktime");
      s.params.absoluteTimelock > n && (n = s.params.absoluteTimelock);
    }
  }
  const r = new Ie({
    version: 3,
    lockTime: Number(n)
  });
  for (const [o, s] of e.entries())
    r.addInput({
      txid: s.txid,
      index: s.vout,
      sequence: n ? zs - 1 : void 0,
      witnessUtxo: {
        script: _t.decode(s.tapTree).pkScript,
        amount: BigInt(s.value)
      },
      tapLeafScript: [s.tapLeafScript]
    }), Ih(r, o, Ku, s.tapTree);
  for (const o of t)
    r.addOutput(o);
  return r.addOutput(fi), r;
}
function cp(e, t) {
  const n = Fu(Ln(e.tapLeafScript)), r = new _t([
    t.script,
    n.script
  ]), o = qu([e], [
    {
      amount: BigInt(e.value),
      script: r.pkScript
    }
  ]), s = r.findLeaf(U.encode(n.script)), i = {
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
const ap = 500000000n;
function Sc(e) {
  return e >= ap;
}
function up(e, t) {
  if (!e.status.block_time)
    return !1;
  if (t.value === 0n)
    return !0;
  if (t.type === "blocks")
    return !1;
  const n = BigInt(Math.floor(Date.now() / 1e3));
  return BigInt(Math.floor(e.status.block_time)) + t.value <= n;
}
const fp = 4320 * 60 * 1e3, dp = {
  thresholdMs: fp
  // 3 days
};
class at {
  constructor(t, n, r = at.DefaultHRP) {
    this.preimage = t, this.value = n, this.HRP = r, this.vout = 0;
    const o = wt(this.preimage);
    this.vtxoScript = new _t([pp(o)]);
    const s = this.vtxoScript.leaves[0];
    this.txid = U.encode(new Uint8Array(o).reverse()), this.tapTree = this.vtxoScript.encode(), this.forfeitTapLeafScript = s, this.intentTapLeafScript = s, this.value = n, this.status = { confirmed: !0 }, this.extraWitness = [this.preimage];
  }
  encode() {
    const t = new Uint8Array(at.Length);
    return t.set(this.preimage, 0), lp(t, this.value, this.preimage.length), t;
  }
  static decode(t, n = at.DefaultHRP) {
    if (t.length !== at.Length)
      throw new Error(`invalid data length: expected ${at.Length} bytes, got ${t.length}`);
    const r = t.subarray(0, at.PreimageLength), o = hp(t, at.PreimageLength);
    return new at(r, o, n);
  }
  static fromString(t, n = at.DefaultHRP) {
    if (t = t.trim(), !t.startsWith(n))
      throw new Error(`invalid human-readable part: expected ${n} prefix (note '${t}')`);
    const r = t.slice(n.length), o = Fo.decode(r);
    if (o.length === 0)
      throw new Error("failed to decode base58 string");
    return at.decode(o, n);
  }
  toString() {
    return this.HRP + Fo.encode(this.encode());
  }
}
at.DefaultHRP = "arknote";
at.PreimageLength = 32;
at.ValueLength = 4;
at.Length = at.PreimageLength + at.ValueLength;
at.FakeOutpointIndex = 0;
function lp(e, t, n) {
  new DataView(e.buffer, e.byteOffset + n, 4).setUint32(0, t, !1);
}
function hp(e, t) {
  return new DataView(e.buffer, e.byteOffset + t, 4).getUint32(0, !1);
}
function pp(e) {
  return K.encode(["SHA256", e, "EQUAL"]);
}
var qr;
(function(e) {
  function t(n, r, o = []) {
    if (r.length == 0)
      throw new Error("intent proof requires at least one input");
    Ep(r), Sp(o);
    const s = vp(n, r[0].witnessUtxo.script);
    return Tp(s, r, o);
  }
  e.create = t;
})(qr || (qr = {}));
const gp = new Uint8Array([dt.RETURN]), wp = new Uint8Array(32).fill(0), yp = 4294967295, mp = "ark-intent-proof-message";
function bp(e) {
  if (e.index === void 0)
    throw new Error("intent proof input requires index");
  if (e.txid === void 0)
    throw new Error("intent proof input requires txid");
  if (e.witnessUtxo === void 0)
    throw new Error("intent proof input requires witness utxo");
  return !0;
}
function Ep(e) {
  return e.forEach(bp), !0;
}
function xp(e) {
  if (e.amount === void 0)
    throw new Error("intent proof output requires amount");
  if (e.script === void 0)
    throw new Error("intent proof output requires script");
  return !0;
}
function Sp(e) {
  return e.forEach(xp), !0;
}
function vp(e, t) {
  const n = Ap(e), r = new Ie({
    version: 0
  });
  return r.addInput({
    txid: wp,
    // zero hash
    index: yp,
    sequence: 0
  }), r.addOutput({
    amount: 0n,
    script: t
  }), r.updateInput(0, {
    finalScriptSig: K.encode(["OP_0", n])
  }), r;
}
function Tp(e, t, n) {
  const r = t[0], o = new Ie({
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
    sighashType: Fe.ALL
  });
  for (const [s, i] of t.entries())
    o.addInput({
      ...i,
      sighashType: Fe.ALL
    }), i.unknown?.length && o.updateInput(s + 1, {
      unknown: i.unknown
    });
  n.length === 0 && (n = [
    {
      amount: 0n,
      script: gp
    }
  ]);
  for (const s of n)
    o.addOutput({
      amount: s.amount,
      script: s.script
    });
  return o;
}
function Ap(e) {
  return oi.utils.taggedHash(mp, new TextEncoder().encode(e));
}
var bs;
(function(e) {
  e[e.INDEXER_TX_TYPE_UNSPECIFIED = 0] = "INDEXER_TX_TYPE_UNSPECIFIED", e[e.INDEXER_TX_TYPE_RECEIVED = 1] = "INDEXER_TX_TYPE_RECEIVED", e[e.INDEXER_TX_TYPE_SENT = 2] = "INDEXER_TX_TYPE_SENT";
})(bs || (bs = {}));
var nn;
(function(e) {
  e.UNSPECIFIED = "INDEXER_CHAINED_TX_TYPE_UNSPECIFIED", e.COMMITMENT = "INDEXER_CHAINED_TX_TYPE_COMMITMENT", e.ARK = "INDEXER_CHAINED_TX_TYPE_ARK", e.TREE = "INDEXER_CHAINED_TX_TYPE_TREE", e.CHECKPOINT = "INDEXER_CHAINED_TX_TYPE_CHECKPOINT";
})(nn || (nn = {}));
class ju {
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
    if (!Ht.isVtxoTreeResponse(i))
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
    if (!Ht.isVtxoTreeLeavesResponse(i))
      throw new Error("Invalid vtxos tree leaves data received");
    return i;
  }
  async getBatchSweepTransactions(t) {
    const n = `${this.serverUrl}/v1/indexer/batch/${t.txid}/${t.vout}/sweepTxs`, r = await fetch(n);
    if (!r.ok)
      throw new Error(`Failed to fetch batch sweep transactions: ${r.statusText}`);
    const o = await r.json();
    if (!Ht.isBatchSweepTransactionsResponse(o))
      throw new Error("Invalid batch sweep transactions data received");
    return o;
  }
  async getCommitmentTx(t) {
    const n = `${this.serverUrl}/v1/indexer/commitmentTx/${t}`, r = await fetch(n);
    if (!r.ok)
      throw new Error(`Failed to fetch commitment tx: ${r.statusText}`);
    const o = await r.json();
    if (!Ht.isCommitmentTx(o))
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
    if (!Ht.isConnectorsResponse(i))
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
    if (!Ht.isForfeitTxsResponse(i))
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
          for await (const i of ys(o)) {
            if (n?.aborted)
              break;
            try {
              const c = JSON.parse(i.data);
              c.event && (yield {
                txid: c.event.txid,
                scripts: c.event.scripts || [],
                newVtxos: (c.event.newVtxos || []).map(ur),
                spentVtxos: (c.event.spentVtxos || []).map(ur),
                sweptVtxos: (c.event.sweptVtxos || []).map(ur),
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
        if (ms(o)) {
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
    if (!Ht.isVirtualTxsResponse(i))
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
    if (!Ht.isVtxoChainResponse(i))
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
    if (!Ht.isVtxosResponse(s))
      throw new Error("Invalid vtxos data received");
    return {
      vtxos: s.vtxos.map(ur),
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
function ur(e) {
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
var Ht;
(function(e) {
  function t(x) {
    return typeof x == "object" && typeof x.totalOutputAmount == "string" && typeof x.totalOutputVtxos == "number" && typeof x.expiresAt == "string" && typeof x.swept == "boolean";
  }
  function n(x) {
    return typeof x == "object" && typeof x.txid == "string" && typeof x.expiresAt == "string" && Object.values(nn).includes(x.type) && Array.isArray(x.spends) && x.spends.every((Y) => typeof Y == "string");
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
    return typeof x == "object" && typeof x.txid == "string" && typeof x.children == "object" && Object.values(x.children).every(f) && Object.keys(x.children).every((Y) => Number.isInteger(Number(Y)));
  }
  function c(x) {
    return Array.isArray(x) && x.every(i);
  }
  e.isTxsArray = c;
  function a(x) {
    return typeof x == "object" && typeof x.amount == "string" && typeof x.createdAt == "string" && typeof x.isSettled == "boolean" && typeof x.settledBy == "string" && Object.values(bs).includes(x.type) && (!x.commitmentTxid && typeof x.virtualTxid == "string" || typeof x.commitmentTxid == "string" && !x.virtualTxid);
  }
  function u(x) {
    return Array.isArray(x) && x.every(a);
  }
  e.isTxHistoryRecordArray = u;
  function f(x) {
    return typeof x == "string" && x.length === 64;
  }
  function d(x) {
    return Array.isArray(x) && x.every(f);
  }
  e.isTxidArray = d;
  function l(x) {
    return typeof x == "object" && o(x.outpoint) && typeof x.createdAt == "string" && (x.expiresAt === null || typeof x.expiresAt == "string") && typeof x.amount == "string" && typeof x.script == "string" && typeof x.isPreconfirmed == "boolean" && typeof x.isSwept == "boolean" && typeof x.isUnrolled == "boolean" && typeof x.isSpent == "boolean" && (!x.spentBy || typeof x.spentBy == "string") && (!x.settledBy || typeof x.settledBy == "string") && (!x.arkTxid || typeof x.arkTxid == "string") && Array.isArray(x.commitmentTxids) && x.commitmentTxids.every(f);
  }
  function h(x) {
    return typeof x == "object" && typeof x.current == "number" && typeof x.next == "number" && typeof x.total == "number";
  }
  function w(x) {
    return typeof x == "object" && Array.isArray(x.vtxoTree) && x.vtxoTree.every(i) && (!x.page || h(x.page));
  }
  e.isVtxoTreeResponse = w;
  function g(x) {
    return typeof x == "object" && Array.isArray(x.leaves) && x.leaves.every(o) && (!x.page || h(x.page));
  }
  e.isVtxoTreeLeavesResponse = g;
  function y(x) {
    return typeof x == "object" && Array.isArray(x.connectors) && x.connectors.every(i) && (!x.page || h(x.page));
  }
  e.isConnectorsResponse = y;
  function S(x) {
    return typeof x == "object" && Array.isArray(x.txids) && x.txids.every(f) && (!x.page || h(x.page));
  }
  e.isForfeitTxsResponse = S;
  function v(x) {
    return typeof x == "object" && Array.isArray(x.sweptBy) && x.sweptBy.every(f);
  }
  e.isSweptCommitmentTxResponse = v;
  function I(x) {
    return typeof x == "object" && Array.isArray(x.sweptBy) && x.sweptBy.every(f);
  }
  e.isBatchSweepTransactionsResponse = I;
  function N(x) {
    return typeof x == "object" && Array.isArray(x.txs) && x.txs.every((Y) => typeof Y == "string") && (!x.page || h(x.page));
  }
  e.isVirtualTxsResponse = N;
  function $(x) {
    return typeof x == "object" && Array.isArray(x.chain) && x.chain.every(n) && (!x.page || h(x.page));
  }
  e.isVtxoChainResponse = $;
  function F(x) {
    return typeof x == "object" && Array.isArray(x.vtxos) && x.vtxos.every(l) && (!x.page || h(x.page));
  }
  e.isVtxosResponse = F;
})(Ht || (Ht = {}));
class Es {
  constructor(t, n = /* @__PURE__ */ new Map()) {
    this.root = t, this.children = n;
  }
  static create(t) {
    if (t.length === 0)
      throw new Error("empty chunks");
    const n = /* @__PURE__ */ new Map();
    for (const s of t) {
      const i = Ip(s), c = i.tx.id;
      n.set(c, i);
    }
    const r = [];
    for (const [s] of n) {
      let i = !1;
      for (const [c, a] of n)
        if (c !== s && (i = kp(a, s), i))
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
    const o = Yu(r[0], n);
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
      if (!s.txid || U.encode(s.txid) !== i || s.index !== r)
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
function kp(e, t) {
  return Object.values(e.children).includes(t);
}
function Yu(e, t) {
  const n = t.get(e);
  if (!n)
    return null;
  const r = n.tx, o = /* @__PURE__ */ new Map();
  for (const [s, i] of Object.entries(n.children)) {
    const c = parseInt(s), a = Yu(i, t);
    a && o.set(c, a);
  }
  return new Es(r, o);
}
function Ip(e) {
  return { tx: Xt.fromPSBT(Et.decode(e.tx)), children: e.children };
}
class Bp {
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
const fr = (e) => `vtxos:${e}`, dr = (e) => `utxos:${e}`, Co = (e) => `tx:${e}`, vc = "wallet:state", jr = (e) => e ? U.encode(e) : void 0, wn = (e) => e ? U.decode(e) : void 0, Yr = ([e, t]) => ({
  cb: U.encode(Zt.encode(e)),
  s: U.encode(t)
}), Tc = (e) => ({
  ...e,
  tapTree: jr(e.tapTree),
  forfeitTapLeafScript: Yr(e.forfeitTapLeafScript),
  intentTapLeafScript: Yr(e.intentTapLeafScript),
  extraWitness: e.extraWitness?.map(jr)
}), Ac = (e) => ({
  ...e,
  tapTree: jr(e.tapTree),
  forfeitTapLeafScript: Yr(e.forfeitTapLeafScript),
  intentTapLeafScript: Yr(e.intentTapLeafScript),
  extraWitness: e.extraWitness?.map(jr)
}), Zr = (e) => {
  const t = Zt.decode(wn(e.cb)), n = wn(e.s);
  return [t, n];
}, Op = (e) => ({
  ...e,
  createdAt: new Date(e.createdAt),
  tapTree: wn(e.tapTree),
  forfeitTapLeafScript: Zr(e.forfeitTapLeafScript),
  intentTapLeafScript: Zr(e.intentTapLeafScript),
  extraWitness: e.extraWitness?.map(wn)
}), Up = (e) => ({
  ...e,
  tapTree: wn(e.tapTree),
  forfeitTapLeafScript: Zr(e.forfeitTapLeafScript),
  intentTapLeafScript: Zr(e.intentTapLeafScript),
  extraWitness: e.extraWitness?.map(wn)
});
class xs {
  constructor(t) {
    this.storage = t;
  }
  async getVtxos(t) {
    const n = await this.storage.getItem(fr(t));
    if (!n)
      return [];
    try {
      return JSON.parse(n).map(Op);
    } catch (r) {
      return console.error(`Failed to parse VTXOs for address ${t}:`, r), [];
    }
  }
  async saveVtxos(t, n) {
    const r = await this.getVtxos(t);
    for (const o of n) {
      const s = r.findIndex((i) => i.txid === o.txid && i.vout === o.vout);
      s !== -1 ? r[s] = o : r.push(o);
    }
    await this.storage.setItem(fr(t), JSON.stringify(r.map(Tc)));
  }
  async removeVtxo(t, n) {
    const r = await this.getVtxos(t), [o, s] = n.split(":"), i = r.filter((c) => !(c.txid === o && c.vout === parseInt(s, 10)));
    await this.storage.setItem(fr(t), JSON.stringify(i.map(Tc)));
  }
  async clearVtxos(t) {
    await this.storage.removeItem(fr(t));
  }
  async getUtxos(t) {
    const n = await this.storage.getItem(dr(t));
    if (!n)
      return [];
    try {
      return JSON.parse(n).map(Up);
    } catch (r) {
      return console.error(`Failed to parse UTXOs for address ${t}:`, r), [];
    }
  }
  async saveUtxos(t, n) {
    const r = await this.getUtxos(t);
    n.forEach((o) => {
      const s = r.findIndex((i) => i.txid === o.txid && i.vout === o.vout);
      s !== -1 ? r[s] = o : r.push(o);
    }), await this.storage.setItem(dr(t), JSON.stringify(r.map(Ac)));
  }
  async removeUtxo(t, n) {
    const r = await this.getUtxos(t), [o, s] = n.split(":"), i = r.filter((c) => !(c.txid === o && c.vout === parseInt(s, 10)));
    await this.storage.setItem(dr(t), JSON.stringify(i.map(Ac)));
  }
  async clearUtxos(t) {
    await this.storage.removeItem(dr(t));
  }
  async getTransactionHistory(t) {
    const n = Co(t), r = await this.storage.getItem(n);
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
      const s = r.findIndex((i) => i.key === o.key);
      s !== -1 ? r[s] = o : r.push(o);
    }
    await this.storage.setItem(Co(t), JSON.stringify(r));
  }
  async clearTransactions(t) {
    await this.storage.removeItem(Co(t));
  }
  async getWalletState() {
    const t = await this.storage.getItem(vc);
    if (!t)
      return null;
    try {
      return JSON.parse(t);
    } catch (n) {
      return console.error("Failed to parse wallet state:", n), null;
    }
  }
  async saveWalletState(t) {
    await this.storage.setItem(vc, JSON.stringify(t));
  }
}
const _o = (e, t) => `contract:${e}:${t}`, Po = (e) => `collection:${e}`;
class $p {
  constructor(t) {
    this.storage = t;
  }
  async getContractData(t, n) {
    const r = await this.storage.getItem(_o(t, n));
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
      await this.storage.setItem(_o(t, n), JSON.stringify(r));
    } catch (o) {
      throw console.error(`Failed to persist contract data for ${t}:${n}:`, o), o;
    }
  }
  async deleteContractData(t, n) {
    try {
      await this.storage.removeItem(_o(t, n));
    } catch (r) {
      throw console.error(`Failed to remove contract data for ${t}:${n}:`, r), r;
    }
  }
  async getContractCollection(t) {
    const n = await this.storage.getItem(Po(t));
    if (!n)
      return [];
    try {
      return JSON.parse(n);
    } catch (r) {
      return console.error(`Failed to parse contract collection ${t}:`, r), [];
    }
  }
  async saveToContractCollection(t, n, r) {
    const o = await this.getContractCollection(t), s = n[r];
    if (s == null)
      throw new Error(`Item is missing required field '${String(r)}'`);
    const i = o.findIndex((a) => a[r] === s);
    let c;
    i !== -1 ? c = [
      ...o.slice(0, i),
      n,
      ...o.slice(i + 1)
    ] : c = [...o, n];
    try {
      await this.storage.setItem(Po(t), JSON.stringify(c));
    } catch (a) {
      throw console.error(`Failed to persist contract collection ${t}:`, a), a;
    }
  }
  async removeFromContractCollection(t, n, r) {
    if (n == null)
      throw new Error(`Invalid id provided for removal: ${String(n)}`);
    const s = (await this.getContractCollection(t)).filter((i) => i[r] !== n);
    try {
      await this.storage.setItem(Po(t), JSON.stringify(s));
    } catch (i) {
      throw console.error(`Failed to persist contract collection removal for ${t}:`, i), i;
    }
  }
  async clearContractData() {
    await this.storage.clear();
  }
}
function Me(e, t) {
  return {
    ...t,
    forfeitTapLeafScript: e.offchainTapscript.forfeit(),
    intentTapLeafScript: e.offchainTapscript.exit(),
    tapTree: e.offchainTapscript.encode()
  };
}
function Ss(e, t) {
  return {
    ...t,
    forfeitTapLeafScript: e.boardingTapscript.forfeit(),
    intentTapLeafScript: e.boardingTapscript.exit(),
    tapTree: e.boardingTapscript.encode()
  };
}
class yn {
  constructor(t, n, r, o, s, i, c, a, u, f, d, l, h, w, g, y) {
    this.identity = t, this.network = n, this.networkName = r, this.onchainProvider = o, this.arkProvider = s, this.indexerProvider = i, this.arkServerPublicKey = c, this.offchainTapscript = a, this.boardingTapscript = u, this.serverUnrollScript = f, this.forfeitOutputScript = d, this.forfeitPubkey = l, this.dustAmount = h, this.walletRepository = w, this.contractRepository = g, this.renewalConfig = {
      enabled: y?.enabled ?? !1,
      ...dp,
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
      return new zu(t.arkServerUrl);
    })(), o = t.arkServerUrl || r.serverUrl;
    if (!o)
      throw new Error("Could not determine arkServerUrl from provider");
    const s = t.indexerUrl || o, i = t.indexerProvider || new ju(s), c = await r.getInfo(), a = Ch(c.network), u = t.esploraUrl || Ph[c.network], f = t.onchainProvider || new Hh(u);
    if (t.exitTimelock) {
      const { value: Y, type: L } = t.exitTimelock;
      if (Y < 512n && L !== "blocks" || Y >= 512n && L !== "seconds")
        throw new Error("invalid exitTimelock");
    }
    const d = t.exitTimelock ?? {
      value: c.unilateralExitDelay,
      type: c.unilateralExitDelay < 512n ? "blocks" : "seconds"
    };
    if (t.boardingTimelock) {
      const { value: Y, type: L } = t.boardingTimelock;
      if (Y < 512n && L !== "blocks" || Y >= 512n && L !== "seconds")
        throw new Error("invalid boardingTimelock");
    }
    const l = t.boardingTimelock ?? {
      value: c.boardingExitDelay,
      type: c.boardingExitDelay < 512n ? "blocks" : "seconds"
    }, h = U.decode(c.signerPubkey).slice(1), w = new zr.Script({
      pubKey: n,
      serverPubKey: h,
      csvTimelock: d
    }), g = new zr.Script({
      pubKey: n,
      serverPubKey: h,
      csvTimelock: l
    }), y = w;
    let S;
    try {
      const Y = U.decode(c.checkpointTapscript);
      S = Ut.decode(Y);
    } catch {
      throw new Error("Invalid checkpointTapscript from server");
    }
    const v = U.decode(c.forfeitPubkey).slice(1), I = Ke(a).decode(c.forfeitAddress), N = ut.encode(I), $ = t.storage || new Bp(), F = new xs($), x = new $p($);
    return new yn(t.identity, a, c.network, f, r, i, h, y, g, S, N, v, c.dust, F, x, t.renewalConfig);
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
    s = n.filter((f) => f.virtualStatus.state === "settled").reduce((f, d) => f + d.value, 0), i = n.filter((f) => f.virtualStatus.state === "preconfirmed").reduce((f, d) => f + d.value, 0), c = n.filter((f) => ue(f) && f.virtualStatus.state === "swept").reduce((f, d) => f + d.value, 0);
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
    const n = await this.getAddress(), o = (await this.getVirtualCoins(t)).map((s) => Me(this, s));
    return await this.walletRepository.saveVtxos(n, o), o;
  }
  async getVirtualCoins(t = { withRecoverable: !0, withUnrolled: !1 }) {
    const n = [U.encode(this.offchainTapscript.pkScript)], o = (await this.indexerProvider.getVtxos({ scripts: n })).vtxos;
    let s = o.filter(ue);
    if (t.withRecoverable || (s = s.filter((i) => !ws(i))), t.withUnrolled) {
      const i = o.filter((c) => !ue(c));
      s.push(...i.filter((c) => c.isUnrolled));
    }
    return s;
  }
  async getTransactionHistory() {
    if (!this.indexerProvider)
      return [];
    const t = await this.indexerProvider.getVtxos({
      scripts: [U.encode(this.offchainTapscript.pkScript)]
    }), { boardingTxs: n, commitmentsToIgnore: r } = await this.getBoardingTxs(), o = [], s = [];
    for (const a of t.vtxos)
      ue(a) ? o.push(a) : s.push(a);
    const i = Gu(o, s, r), c = [...n, ...i];
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
    const s = [], i = [];
    for (const c of t) {
      const a = {
        key: {
          boardingTxid: c.txid,
          commitmentTxid: "",
          arkTxid: ""
        },
        amount: c.value,
        type: gn.TxReceived,
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
    const t = await this.getBoardingAddress(), r = (await this.onchainProvider.getCoins(t)).map((o) => Ss(this, o));
    return await this.walletRepository.saveUtxos(t, r), r;
  }
  async sendBitcoin(t) {
    if (t.amount <= 0)
      throw new Error("Amount must be positive");
    if (!Np(t.address))
      throw new Error("Invalid Ark address " + t.address);
    const n = await this.getVirtualCoins({
      withRecoverable: !1
    }), r = Lp(n, t.amount), o = this.offchainTapscript.forfeit();
    if (!o)
      throw new Error("Selected leaf not found");
    const s = pn.decode(t.address), c = [
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
    const a = this.offchainTapscript.encode(), u = ip(r.inputs.map((w) => ({
      ...w,
      tapLeafScript: o,
      tapTree: a
    })), c, this.serverUnrollScript), f = await this.identity.sign(u.arkTx), { arkTxid: d, signedCheckpointTxs: l } = await this.arkProvider.submitTx(Et.encode(f.toPSBT()), u.checkpoints.map((w) => Et.encode(w.toPSBT()))), h = await Promise.all(l.map(async (w) => {
      const g = Xt.fromPSBT(Et.decode(w)), y = await this.identity.sign(g);
      return Et.encode(y.toPSBT());
    }));
    await this.arkProvider.finalizeTx(d, h);
    try {
      const w = [], g = /* @__PURE__ */ new Set();
      let y = Number.MAX_SAFE_INTEGER;
      for (const [I, N] of r.inputs.entries()) {
        const $ = Me(this, N), F = l[I], x = Xt.fromPSBT(Et.decode(F));
        if (w.push({
          ...$,
          virtualStatus: { ...$.virtualStatus, state: "spent" },
          spentBy: x.id,
          arkTxId: d,
          isSpent: !0
        }), $.virtualStatus.commitmentTxIds)
          for (const Y of $.virtualStatus.commitmentTxIds)
            g.add(Y);
        $.virtualStatus.batchExpiry && (y = Math.min(y, $.virtualStatus.batchExpiry));
      }
      const S = Date.now(), v = this.arkAddress.encode();
      if (r.changeAmount > 0n && y !== Number.MAX_SAFE_INTEGER) {
        const I = {
          txid: d,
          vout: c.length - 1,
          createdAt: new Date(S),
          forfeitTapLeafScript: this.offchainTapscript.forfeit(),
          intentTapLeafScript: this.offchainTapscript.exit(),
          isUnrolled: !1,
          isSpent: !1,
          tapTree: this.offchainTapscript.encode(),
          value: Number(r.changeAmount),
          virtualStatus: {
            state: "preconfirmed",
            commitmentTxIds: Array.from(g),
            batchExpiry: y
          },
          status: {
            confirmed: !1
          }
        };
        await this.walletRepository.saveVtxos(v, [I]);
      }
      await this.walletRepository.saveVtxos(v, w), await this.walletRepository.saveTransactions(v, [
        {
          key: {
            boardingTxid: "",
            commitmentTxid: "",
            arkTxid: d
          },
          amount: t.amount,
          type: gn.TxSent,
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
      for (const l of t.inputs)
        if (typeof l == "string")
          try {
            at.fromString(l);
          } catch {
            throw new Error(`Invalid arknote "${l}"`);
          }
    }
    if (!t) {
      let l = 0;
      const w = Ut.decode(U.decode(this.boardingTapscript.exitScript)).params.timelock, g = (await this.getBoardingUtxos()).filter((v) => !up(v, w));
      l += g.reduce((v, I) => v + I.value, 0);
      const y = await this.getVtxos({ withRecoverable: !0 });
      l += y.reduce((v, I) => v + I.value, 0);
      const S = [...g, ...y];
      if (S.length === 0)
        throw new Error("No inputs found");
      t = {
        inputs: S,
        outputs: [
          {
            address: await this.getAddress(),
            amount: BigInt(l)
          }
        ]
      };
    }
    const r = [], o = [];
    let s = !1;
    for (const [l, h] of t.outputs.entries()) {
      let w;
      try {
        w = pn.decode(h.address).pkScript, s = !0;
      } catch {
        const g = Ke(this.network).decode(h.address);
        w = ut.encode(g), r.push(l);
      }
      o.push({
        amount: h.amount,
        script: w
      });
    }
    let i;
    const c = [];
    s && (i = this.identity.signerSession(), c.push(U.encode(await i.getPublicKey())));
    const [a, u] = await Promise.all([
      this.makeRegisterIntentSignature(t.inputs, o, r, c),
      this.makeDeleteIntentSignature(t.inputs)
    ]), f = await this.arkProvider.registerIntent(a), d = new AbortController();
    try {
      let l;
      const h = [
        ...c,
        ...t.inputs.map(($) => `${$.txid}:${$.vout}`)
      ], w = this.arkProvider.getEventStream(d.signal, h);
      let g, y;
      const S = [], v = [];
      let I, N;
      for await (const $ of w)
        switch (n && n($), $.type) {
          // the settlement failed
          case J.BatchFailed:
            throw new Error($.reason);
          case J.BatchStarted:
            if (l !== void 0)
              continue;
            const F = await this.handleBatchStartedEvent($, f, this.forfeitPubkey, this.forfeitOutputScript);
            F.skip || (l = $.type, y = F.sweepTapTreeRoot, g = F.roundId, s || (l = J.TreeNonces));
            break;
          case J.TreeTx:
            if (l !== J.BatchStarted && l !== J.TreeNonces)
              continue;
            if ($.batchIndex === 0)
              S.push($.chunk);
            else if ($.batchIndex === 1)
              v.push($.chunk);
            else
              throw new Error(`Invalid batch index: ${$.batchIndex}`);
            break;
          case J.TreeSignature:
            if (l !== J.TreeNonces || !s)
              continue;
            if (!I)
              throw new Error("Vtxo graph not set, something went wrong");
            if ($.batchIndex === 0) {
              const x = U.decode($.signature);
              I.update($.txid, (Y) => {
                Y.updateInput(0, {
                  tapKeySig: x
                });
              });
            }
            break;
          // the server has started the signing process of the vtxo tree transactions
          // the server expects the partial musig2 nonces for each tx
          case J.TreeSigningStarted:
            if (l !== J.BatchStarted)
              continue;
            if (s) {
              if (!i)
                throw new Error("Signing session not set");
              if (!y)
                throw new Error("Sweep tap tree root not set");
              if (S.length === 0)
                throw new Error("unsigned vtxo graph not received");
              I = Es.create(S), await this.handleSettlementSigningEvent($, y, i, I);
            }
            l = $.type;
            break;
          // the musig2 nonces of the vtxo tree transactions are generated
          // the server expects now the partial musig2 signatures
          case J.TreeNonces:
            if (l !== J.TreeSigningStarted)
              continue;
            if (s) {
              if (!i)
                throw new Error("Signing session not set");
              await this.handleSettlementTreeNoncesEvent($, i) && (l = $.type);
              break;
            }
            l = $.type;
            break;
          // the vtxo tree is signed, craft, sign and submit forfeit transactions
          // if any boarding utxos are involved, the settlement tx is also signed
          case J.BatchFinalization:
            if (l !== J.TreeNonces)
              continue;
            if (!this.forfeitOutputScript)
              throw new Error("Forfeit output script not set");
            v.length > 0 && (N = Es.create(v), op($.commitmentTx, N)), await this.handleSettlementFinalizationEvent($, t.inputs, this.forfeitOutputScript, N), l = $.type;
            break;
          // the settlement is done, last event to be received
          case J.BatchFinalized:
            if (l !== J.BatchFinalization)
              continue;
            if ($.id === g)
              return d.abort(), $.commitmentTxid;
        }
    } catch (l) {
      d.abort();
      try {
        await this.arkProvider.deleteIntent(u);
      } catch {
      }
      throw l;
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
          const { txid: d, status: l } = f, h = c(f), w = Number(f.vout[h].value);
          return { txid: d, vout: h, value: w, status: l };
        });
        t({
          type: "utxo",
          coins: u
        });
      });
    }
    if (this.indexerProvider && n) {
      const c = this.offchainTapscript, a = await this.indexerProvider.subscribeForScripts([
        U.encode(c.pkScript)
      ]), u = new AbortController(), f = this.indexerProvider.getSubscription(a, u.signal);
      s = async () => {
        u.abort(), await this.indexerProvider?.unsubscribeForScripts(a);
      }, (async () => {
        try {
          for await (const d of f)
            (d.newVtxos?.length > 0 || d.spentVtxos?.length > 0) && t({
              type: "vtxo",
              newVtxos: d.newVtxos.map((l) => Me(this, l)),
              spentVtxos: d.spentVtxos.map((l) => Me(this, l))
            });
        } catch (d) {
          console.error("Subscription error:", d);
        }
      })();
    }
    return () => {
      o?.(), s?.();
    };
  }
  async handleBatchStartedEvent(t, n, r, o) {
    const s = new TextEncoder().encode(n), i = wt(s), c = U.encode(i);
    let a = !0;
    for (const d of t.intentIdHashes)
      if (d === c) {
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
    }).script, f = Un(u);
    return {
      roundId: t.id,
      sweepTapTreeRoot: f,
      forfeitOutputScript: o,
      skip: !1
    };
  }
  // validates the vtxo tree, creates a signing session and generates the musig2 nonces
  async handleSettlementSigningEvent(t, n, r, o) {
    const s = Xt.fromPSBT(Et.decode(t.unsignedCommitmentTx));
    sp(o, s, n);
    const i = s.getOutput(0);
    if (!i?.amount)
      throw new Error("Shared output not found");
    r.init(o, n, i.amount);
    const c = U.encode(await r.getPublicKey()), a = await r.getNonces();
    await this.arkProvider.submitTreeNonces(t.id, c, a);
  }
  async handleSettlementTreeNoncesEvent(t, n) {
    const { hasAllNonces: r } = await n.aggregatedNonces(t.txid, t.nonces);
    if (!r)
      return !1;
    const o = await n.sign(), s = U.encode(await n.getPublicKey());
    return await this.arkProvider.submitTreeSignatures(t.id, s, o), !0;
  }
  async handleSettlementFinalizationEvent(t, n, r, o) {
    const s = [], i = await this.getVirtualCoins();
    let c = Xt.fromPSBT(Et.decode(t.commitmentTx)), a = !1, u = 0;
    const f = o?.leaves() || [];
    for (const d of n) {
      const l = i.find((I) => I.txid === d.txid && I.vout === d.vout);
      if (!l) {
        for (let I = 0; I < c.inputsLength; I++) {
          const N = c.getInput(I);
          if (!N.txid || N.index === void 0)
            throw new Error("The server returned incomplete data. No settlement input found in the PSBT");
          if (U.encode(N.txid) === d.txid && N.index === d.vout) {
            c.updateInput(I, {
              tapLeafScript: [d.forfeitTapLeafScript]
            }), c = await this.identity.sign(c, [
              I
            ]), a = !0;
            break;
          }
        }
        continue;
      }
      if (ws(l) || Wu(l, this.dustAmount))
        continue;
      if (f.length === 0)
        throw new Error("connectors not received");
      if (u >= f.length)
        throw new Error("not enough connectors received");
      const h = f[u], w = h.id, g = h.getOutput(0);
      if (!g)
        throw new Error("connector output not found");
      const y = g.amount, S = g.script;
      if (!y || !S)
        throw new Error("invalid connector output");
      u++;
      let v = Yh([
        {
          txid: d.txid,
          index: d.vout,
          witnessUtxo: {
            amount: BigInt(l.value),
            script: _t.decode(d.tapTree).pkScript
          },
          sighashType: Fe.DEFAULT,
          tapLeafScript: [d.forfeitTapLeafScript]
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
      v = await this.identity.sign(v, [0]), s.push(Et.encode(v.toPSBT()));
    }
    (s.length > 0 || a) && await this.arkProvider.submitSignedForfeitTxs(s, a ? Et.encode(c.toPSBT()) : void 0);
  }
  async makeRegisterIntentSignature(t, n, r, o) {
    const s = this.prepareIntentProofInputs(t), c = JSON.stringify({
      type: "register",
      onchain_output_indexes: r,
      valid_at: 0,
      expire_at: 0,
      cosigners_public_keys: o
    }, null, 0), a = qr.create(c, s, n), u = await this.identity.sign(a);
    return {
      proof: Et.encode(u.toPSBT()),
      message: c
    };
  }
  async makeDeleteIntentSignature(t) {
    const n = this.prepareIntentProofInputs(t), o = JSON.stringify({
      type: "delete",
      expire_at: 0
    }, null, 0), s = qr.create(o, n, []), i = await this.identity.sign(s);
    return {
      proof: Et.encode(i.toPSBT()),
      message: o
    };
  }
  prepareIntentProofInputs(t) {
    const n = [];
    for (const r of t) {
      const o = _t.decode(r.tapTree), s = Rp(r), i = [Ku.encode(r.tapTree)];
      r.extraWitness && i.push(Bh.encode(r.extraWitness)), n.push({
        txid: U.decode(r.txid),
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
yn.MIN_FEE_RATE = 1;
function Rp(e) {
  let t;
  try {
    const n = e.intentTapLeafScript[1], r = n.subarray(0, n.length - 1), o = Ut.decode(r).params;
    t = hs.encode(o.timelock.type === "blocks" ? { blocks: Number(o.timelock.value) } : { seconds: Number(o.timelock.value) });
  } catch {
  }
  return t;
}
function Np(e) {
  try {
    return pn.decode(e), !0;
  } catch {
    return !1;
  }
}
function Lp(e, t) {
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
function kc() {
  const e = crypto.getRandomValues(new Uint8Array(16));
  return U.encode(e);
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
  function d(p) {
    return p.type === "VTXOS" && p.success === !0;
  }
  e.isVtxos = d;
  function l(p, E) {
    return {
      type: "VTXOS",
      success: !0,
      vtxos: E,
      id: p
    };
  }
  e.vtxos = l;
  function h(p) {
    return p.type === "VIRTUAL_COINS" && p.success === !0;
  }
  e.isVirtualCoins = h;
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
  function I(p) {
    return p.type === "TRANSACTION_HISTORY" && p.success === !0;
  }
  e.isTransactionHistory = I;
  function N(p, E) {
    return {
      type: "TRANSACTION_HISTORY",
      success: !0,
      transactions: E,
      id: p
    };
  }
  e.transactionHistory = N;
  function $(p) {
    return p.type === "WALLET_STATUS" && p.success === !0;
  }
  e.isWalletStatus = $;
  function F(p, E, A) {
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
  e.walletStatus = F;
  function x(p) {
    return p.type === "CLEAR_RESPONSE";
  }
  e.isClearResponse = x;
  function Y(p, E) {
    return {
      type: "CLEAR_RESPONSE",
      success: E,
      id: p
    };
  }
  e.clearResponse = Y;
  function L(p) {
    return p.type === "WALLET_RELOADED";
  }
  e.isWalletReloaded = L;
  function Pt(p, E) {
    return {
      type: "WALLET_RELOADED",
      success: E,
      id: p
    };
  }
  e.walletReloaded = Pt;
  function gt(p) {
    return p.type === "VTXO_UPDATE";
  }
  e.isVtxoUpdate = gt;
  function _(p, E) {
    return {
      type: "VTXO_UPDATE",
      id: kc(),
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
      id: kc(),
      // spontaneous update, not tied to a request
      success: !0,
      coins: p
    };
  }
  e.utxoUpdate = m;
})(V || (V = {}));
class Cp {
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
const _p = "arkade-service-worker";
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
    return this.hasWitness && (s += tt.WITNESS_HEADER_SIZE + this.inputWitnessSize), Pp(s);
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
const Pp = (e) => {
  const t = BigInt(Math.ceil(e / tt.WITNESS_SCALE_FACTOR));
  return {
    value: t,
    fee: (n) => n * t
  };
};
var yt;
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
  function d(g) {
    return g.type === "GET_TRANSACTION_HISTORY";
  }
  e.isGetTransactionHistory = d;
  function l(g) {
    return g.type === "GET_STATUS";
  }
  e.isGetStatus = l;
  function h(g) {
    return g.type === "CLEAR";
  }
  e.isClear = h;
  function w(g) {
    return g.type === "RELOAD_WALLET";
  }
  e.isReloadWallet = w;
})(yt || (yt = {}));
class Hp {
  constructor(t = _p, n = 1, r = () => {
  }) {
    this.dbName = t, this.dbVersion = n, this.messageCallback = r, this.storage = new Cp(t, n), this.walletRepository = new xs(this.storage);
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
      const { boardingTxs: n, commitmentsToIgnore: r } = await this.wallet.getBoardingTxs(), { spendable: o, spent: s } = await this.getAllVtxos(), i = Gu(o, s, r);
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
    this.incomingFundsSubscription && this.incomingFundsSubscription(), await this.storage.clear(), this.walletRepository = new xs(this.storage), this.wallet = void 0, this.arkProvider = void 0, this.indexerProvider = void 0;
  }
  async reload() {
    await this.onWalletInitialized();
  }
  async onWalletInitialized() {
    if (!this.wallet || !this.arkProvider || !this.indexerProvider || !this.wallet.offchainTapscript || !this.wallet.boardingTapscript)
      return;
    const t = U.encode(this.wallet.offchainTapscript.pkScript), r = (await this.indexerProvider.getVtxos({
      scripts: [t]
    })).vtxos.map((a) => Me(this.wallet, a)), o = await this.wallet.getAddress();
    await this.walletRepository.saveVtxos(o, r);
    const s = await this.wallet.getBoardingAddress(), i = await this.wallet.onchainProvider.getCoins(s);
    await this.walletRepository.saveUtxos(s, i.map((a) => Ss(this.wallet, a)));
    const c = await this.getTransactionHistory();
    c && await this.walletRepository.saveTransactions(o, c), this.incomingFundsSubscription && this.incomingFundsSubscription(), this.incomingFundsSubscription = await this.wallet.notifyIncomingFunds(async (a) => {
      if (a.type === "vtxo") {
        const u = a.newVtxos.length > 0 ? a.newVtxos.map((d) => Me(this.wallet, d)) : [], f = a.spentVtxos.length > 0 ? a.spentVtxos.map((d) => Me(this.wallet, d)) : [];
        if ([...u, ...f].length === 0)
          return;
        await this.walletRepository.saveVtxos(o, [
          ...u,
          ...f
        ]), await this.sendMessageToAllClients(V.vtxoUpdate(u, f));
      }
      if (a.type === "utxo") {
        const u = a.coins.map((d) => Ss(this.wallet, d)), f = await this.wallet?.getBoardingAddress();
        await this.walletRepository.clearUtxos(f), await this.walletRepository.saveUtxos(f, u), await this.sendMessageToAllClients(V.utxoUpdate(u));
      }
    });
  }
  async handleClear(t) {
    await this.clear(), yt.isBase(t.data) && t.source?.postMessage(V.clearResponse(t.data.id, !0));
  }
  async handleInitWallet(t) {
    const n = t.data;
    if (!yt.isInitWallet(n)) {
      console.error("Invalid INIT_WALLET message format", n), t.source?.postMessage(V.error(n.id, "Invalid INIT_WALLET message format"));
      return;
    }
    if (!n.privateKey) {
      const r = "Missing privateKey";
      t.source?.postMessage(V.error(n.id, r)), console.error(r);
      return;
    }
    try {
      const { arkServerPublicKey: r, arkServerUrl: o, privateKey: s } = n, i = Nn.fromHex(s);
      this.arkProvider = new zu(o), this.indexerProvider = new ju(o), this.wallet = await yn.create({
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
    if (!yt.isSettle(n)) {
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
    if (!yt.isSendBitcoin(n)) {
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
    if (!yt.isGetAddress(n)) {
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
    if (!yt.isGetBoardingAddress(n)) {
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
    if (!yt.isGetBalance(n)) {
      console.error("Invalid GET_BALANCE message format", n), t.source?.postMessage(V.error(n.id, "Invalid GET_BALANCE message format"));
      return;
    }
    if (!this.wallet) {
      console.error("Wallet not initialized"), t.source?.postMessage(V.error(n.id, "Wallet not initialized"));
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
        ue(h) && (f += h.value);
      const d = i + c, l = a + u + f;
      t.source?.postMessage(V.balance(n.id, {
        boarding: {
          confirmed: i,
          unconfirmed: c,
          total: d
        },
        settled: a,
        preconfirmed: u,
        available: a + u,
        recoverable: f,
        total: d + l
      }));
    } catch (r) {
      console.error("Error getting balance:", r);
      const o = r instanceof Error ? r.message : "Unknown error occurred";
      t.source?.postMessage(V.error(n.id, o));
    }
  }
  async handleGetVtxos(t) {
    const n = t.data;
    if (!yt.isGetVtxos(n)) {
      console.error("Invalid GET_VTXOS message format", n), t.source?.postMessage(V.error(n.id, "Invalid GET_VTXOS message format"));
      return;
    }
    if (!this.wallet) {
      console.error("Wallet not initialized"), t.source?.postMessage(V.error(n.id, "Wallet not initialized"));
      return;
    }
    try {
      const r = await this.getSpendableVtxos(), o = this.wallet.dustAmount, i = n.filter?.withRecoverable ?? !1 ? r : r.filter((c) => !(o != null && Wu(c, o) || ws(c)));
      t.source?.postMessage(V.vtxos(n.id, i));
    } catch (r) {
      console.error("Error getting vtxos:", r);
      const o = r instanceof Error ? r.message : "Unknown error occurred";
      t.source?.postMessage(V.error(n.id, o));
    }
  }
  async handleGetBoardingUtxos(t) {
    const n = t.data;
    if (!yt.isGetBoardingUtxos(n)) {
      console.error("Invalid GET_BOARDING_UTXOS message format", n), t.source?.postMessage(V.error(n.id, "Invalid GET_BOARDING_UTXOS message format"));
      return;
    }
    if (!this.wallet) {
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
    if (!yt.isGetTransactionHistory(n)) {
      console.error("Invalid GET_TRANSACTION_HISTORY message format", n), t.source?.postMessage(V.error(n.id, "Invalid GET_TRANSACTION_HISTORY message format"));
      return;
    }
    if (!this.wallet) {
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
    if (!yt.isGetStatus(n)) {
      console.error("Invalid GET_STATUS message format", n), t.source?.postMessage(V.error(n.id, "Invalid GET_STATUS message format"));
      return;
    }
    const r = this.wallet ? await this.wallet.identity.xOnlyPublicKey() : void 0;
    t.source?.postMessage(V.walletStatus(n.id, this.wallet !== void 0, r));
  }
  async handleMessage(t) {
    this.messageCallback(t);
    const n = t.data;
    if (!yt.isBase(n)) {
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
    if (!yt.isReloadWallet(n)) {
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
var Ic;
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
        if (!(f.type === nn.COMMITMENT || f.type === nn.UNSPECIFIED))
          try {
            if (!(await this.explorer.getTxStatus(f.txid)).confirmed)
              return {
                type: t.WAIT,
                txid: f.txid,
                do: Mp(this.explorer, f.txid)
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
      const a = Ie.fromPSBT(Et.decode(c.txs[0]));
      if (s.type === nn.TREE) {
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
        do: Dp(this.bumper, this.explorer, a)
      };
    }
    /**
     * Iterate over the steps to be executed and execute them
     * @returns An async iterator over the executed steps
     */
    async *[Symbol.asyncIterator]() {
      let s;
      do {
        s !== void 0 && await Vp(1e3);
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
    const d = tt.create();
    for (const y of a) {
      if (!y.isUnrolled)
        throw new Error(`Vtxo ${y.txid}:${y.vout} is not fully unrolled, use unroll first`);
      const S = await o.onchainProvider.getTxStatus(y.txid);
      if (!S.confirmed)
        throw new Error(`tx ${y.txid} is not confirmed`);
      const v = Kp({ height: S.blockHeight, time: S.blockTime }, c, y);
      if (!v)
        throw new Error(`no available exit path found for vtxo ${y.txid}:${y.vout}`);
      const I = _t.decode(y.tapTree).findLeaf(U.encode(v.script));
      if (!I)
        throw new Error(`spending leaf not found for vtxo ${y.txid}:${y.vout}`);
      f += BigInt(y.value), u.push({
        txid: y.txid,
        index: y.vout,
        tapLeafScript: [I],
        sequence: 4294967294,
        witnessUtxo: {
          amount: BigInt(y.value),
          script: _t.decode(y.tapTree).pkScript
        },
        sighashType: Fe.DEFAULT
      }), d.addTapscriptInput(64, I[1].length, Zt.encode(I[0]).length);
    }
    const l = new Ie({ version: 2 });
    for (const y of u)
      l.addInput(y);
    d.addP2TROutput();
    let h = await o.onchainProvider.getFeeRate();
    (!h || h < yn.MIN_FEE_RATE) && (h = yn.MIN_FEE_RATE);
    const w = d.vsize().fee(BigInt(h));
    if (w > f)
      throw new Error("fee amount is greater than the total amount");
    l.addOutputAddress(i, f - w);
    const g = await o.identity.sign(l);
    return g.finalize(), await o.onchainProvider.broadcastTransaction(g.hex), g.id;
  }
  e.completeUnroll = r;
})(Ic || (Ic = {}));
function Vp(e) {
  return new Promise((t) => setTimeout(t, e));
}
function Dp(e, t, n) {
  return async () => {
    const [r, o] = await e.bumpP2A(n);
    await t.broadcastTransaction(r, o);
  };
}
function Mp(e, t) {
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
function Kp(e, t, n) {
  const r = _t.decode(n.tapTree).exitPaths();
  for (const o of r)
    if (o.params.timelock.type === "blocks") {
      if (t.height >= e.height + Number(o.params.timelock.value))
        return o;
    } else if (t.time >= e.time + Number(o.params.timelock.value))
      return o;
}
const Zu = new Hp();
Zu.start().catch(console.error);
const Xu = "arkade-cache-v1";
self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(Xu)), self.skipWaiting();
});
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((t) => Promise.all(
      t.map((n) => {
        if (n !== Xu)
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
  e.data && e.data.type === "RELOAD_WALLET" && e.waitUntil(Zu.reload().catch(console.error));
});
