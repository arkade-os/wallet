/*! noble-hashes - MIT License (c) 2022 Paul Miller (paulmillr.com) */
function Ro(e) {
  return e instanceof Uint8Array || ArrayBuffer.isView(e) && e.constructor.name === "Uint8Array";
}
function de(e, t = "") {
  if (!Number.isSafeInteger(e) || e < 0) {
    const n = t && `"${t}" `;
    throw new Error(`${n}expected integer >0, got ${e}`);
  }
}
function _(e, t, n = "") {
  const r = Ro(e), o = e?.length, i = t !== void 0;
  if (!r || i && o !== t) {
    const s = n && `"${n}" `, c = i ? ` of length ${t}` : "", a = r ? `length=${o}` : `type=${typeof e}`;
    throw new Error(s + "expected Uint8Array" + c + ", got " + a);
  }
  return e;
}
function Es(e) {
  if (typeof e != "function" || typeof e.create != "function")
    throw new Error("Hash must wrapped by utils.createHasher");
  de(e.outputLen), de(e.blockLen);
}
function Xn(e, t = !0) {
  if (e.destroyed)
    throw new Error("Hash instance has been destroyed");
  if (t && e.finished)
    throw new Error("Hash#digest() has already been called");
}
function xa(e, t) {
  _(e, void 0, "digestInto() output");
  const n = t.outputLen;
  if (e.length < n)
    throw new Error('"digestInto() output" expected to be of length >=' + n);
}
function He(...e) {
  for (let t = 0; t < e.length; t++)
    e[t].fill(0);
}
function Lr(e) {
  return new DataView(e.buffer, e.byteOffset, e.byteLength);
}
function Ft(e, t) {
  return e << 32 - t | e >>> t;
}
function Un(e, t) {
  return e << t | e >>> 32 - t >>> 0;
}
const Ss = /* @ts-ignore */ typeof Uint8Array.from([]).toHex == "function" && typeof Uint8Array.fromHex == "function", ba = /* @__PURE__ */ Array.from({ length: 256 }, (e, t) => t.toString(16).padStart(2, "0"));
function Er(e) {
  if (_(e), Ss)
    return e.toHex();
  let t = "";
  for (let n = 0; n < e.length; n++)
    t += ba[e[n]];
  return t;
}
const Zt = { _0: 48, _9: 57, A: 65, F: 70, a: 97, f: 102 };
function gi(e) {
  if (e >= Zt._0 && e <= Zt._9)
    return e - Zt._0;
  if (e >= Zt.A && e <= Zt.F)
    return e - (Zt.A - 10);
  if (e >= Zt.a && e <= Zt.f)
    return e - (Zt.a - 10);
}
function Qn(e) {
  if (typeof e != "string")
    throw new Error("hex string expected, got " + typeof e);
  if (Ss)
    return Uint8Array.fromHex(e);
  const t = e.length, n = t / 2;
  if (t % 2)
    throw new Error("hex string expected, got unpadded hex of length " + t);
  const r = new Uint8Array(n);
  for (let o = 0, i = 0; o < n; o++, i += 2) {
    const s = gi(e.charCodeAt(i)), c = gi(e.charCodeAt(i + 1));
    if (s === void 0 || c === void 0) {
      const a = e[i] + e[i + 1];
      throw new Error('hex string expected, got non-hex character "' + a + '" at index ' + i);
    }
    r[o] = s * 16 + c;
  }
  return r;
}
function $t(...e) {
  let t = 0;
  for (let r = 0; r < e.length; r++) {
    const o = e[r];
    _(o), t += o.length;
  }
  const n = new Uint8Array(t);
  for (let r = 0, o = 0; r < e.length; r++) {
    const i = e[r];
    n.set(i, o), o += i.length;
  }
  return n;
}
function Ts(e, t = {}) {
  const n = (o, i) => e(i).update(o).digest(), r = e(void 0);
  return n.outputLen = r.outputLen, n.blockLen = r.blockLen, n.create = (o) => e(o), Object.assign(n, t), Object.freeze(n);
}
function Tn(e = 32) {
  const t = typeof globalThis == "object" ? globalThis.crypto : null;
  if (typeof t?.getRandomValues != "function")
    throw new Error("crypto.getRandomValues must be defined");
  return t.getRandomValues(new Uint8Array(e));
}
const Ea = (e) => ({
  oid: Uint8Array.from([6, 9, 96, 134, 72, 1, 101, 3, 4, 2, e])
});
function Sa(e, t, n) {
  return e & t ^ ~e & n;
}
function Ta(e, t, n) {
  return e & t ^ e & n ^ t & n;
}
class vs {
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
    this.blockLen = t, this.outputLen = n, this.padOffset = r, this.isLE = o, this.buffer = new Uint8Array(t), this.view = Lr(this.buffer);
  }
  update(t) {
    Xn(this), _(t);
    const { view: n, buffer: r, blockLen: o } = this, i = t.length;
    for (let s = 0; s < i; ) {
      const c = Math.min(o - this.pos, i - s);
      if (c === o) {
        const a = Lr(t);
        for (; o <= i - s; s += o)
          this.process(a, s);
        continue;
      }
      r.set(t.subarray(s, s + c), this.pos), this.pos += c, s += c, this.pos === o && (this.process(n, 0), this.pos = 0);
    }
    return this.length += t.length, this.roundClean(), this;
  }
  digestInto(t) {
    Xn(this), xa(t, this), this.finished = !0;
    const { buffer: n, view: r, blockLen: o, isLE: i } = this;
    let { pos: s } = this;
    n[s++] = 128, He(this.buffer.subarray(s)), this.padOffset > o - s && (this.process(r, 0), s = 0);
    for (let d = s; d < o; d++)
      n[d] = 0;
    r.setBigUint64(o - 8, BigInt(this.length * 8), i), this.process(r, 0);
    const c = Lr(t), a = this.outputLen;
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
const ne = /* @__PURE__ */ Uint32Array.from([
  1779033703,
  3144134277,
  1013904242,
  2773480762,
  1359893119,
  2600822924,
  528734635,
  1541459225
]), va = /* @__PURE__ */ Uint32Array.from([
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
]), re = /* @__PURE__ */ new Uint32Array(64);
class ka extends vs {
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
      re[d] = t.getUint32(n, !1);
    for (let d = 16; d < 64; d++) {
      const l = re[d - 15], h = re[d - 2], p = Ft(l, 7) ^ Ft(l, 18) ^ l >>> 3, g = Ft(h, 17) ^ Ft(h, 19) ^ h >>> 10;
      re[d] = g + re[d - 7] + p + re[d - 16] | 0;
    }
    let { A: r, B: o, C: i, D: s, E: c, F: a, G: u, H: f } = this;
    for (let d = 0; d < 64; d++) {
      const l = Ft(c, 6) ^ Ft(c, 11) ^ Ft(c, 25), h = f + l + Sa(c, a, u) + va[d] + re[d] | 0, g = (Ft(r, 2) ^ Ft(r, 13) ^ Ft(r, 22)) + Ta(r, o, i) | 0;
      f = u, u = a, a = c, c = s + h | 0, s = i, i = o, o = r, r = h + g | 0;
    }
    r = r + this.A | 0, o = o + this.B | 0, i = i + this.C | 0, s = s + this.D | 0, c = c + this.E | 0, a = a + this.F | 0, u = u + this.G | 0, f = f + this.H | 0, this.set(r, o, i, s, c, a, u, f);
  }
  roundClean() {
    He(re);
  }
  destroy() {
    this.set(0, 0, 0, 0, 0, 0, 0, 0), He(this.buffer);
  }
}
class Aa extends ka {
  // We cannot use array here since array allows indexing by variable
  // which means optimizer/compiler cannot use registers.
  A = ne[0] | 0;
  B = ne[1] | 0;
  C = ne[2] | 0;
  D = ne[3] | 0;
  E = ne[4] | 0;
  F = ne[5] | 0;
  G = ne[6] | 0;
  H = ne[7] | 0;
  constructor() {
    super(32);
  }
}
const pt = /* @__PURE__ */ Ts(
  () => new Aa(),
  /* @__PURE__ */ Ea(1)
);
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const Co = /* @__PURE__ */ BigInt(0), Jr = /* @__PURE__ */ BigInt(1);
function Jn(e, t = "") {
  if (typeof e != "boolean") {
    const n = t && `"${t}" `;
    throw new Error(n + "expected boolean, got type=" + typeof e);
  }
  return e;
}
function ks(e) {
  if (typeof e == "bigint") {
    if (!Wn(e))
      throw new Error("positive bigint expected, got " + e);
  } else
    de(e);
  return e;
}
function Nn(e) {
  const t = ks(e).toString(16);
  return t.length & 1 ? "0" + t : t;
}
function As(e) {
  if (typeof e != "string")
    throw new Error("hex string expected, got " + typeof e);
  return e === "" ? Co : BigInt("0x" + e);
}
function qt(e) {
  return As(Er(e));
}
function Is(e) {
  return As(Er(Ia(_(e)).reverse()));
}
function vn(e, t) {
  de(t), e = ks(e);
  const n = Qn(e.toString(16).padStart(t * 2, "0"));
  if (n.length !== t)
    throw new Error("number too large");
  return n;
}
function Bs(e, t) {
  return vn(e, t).reverse();
}
function pn(e, t) {
  if (e.length !== t.length)
    return !1;
  let n = 0;
  for (let r = 0; r < e.length; r++)
    n |= e[r] ^ t[r];
  return n === 0;
}
function Ia(e) {
  return Uint8Array.from(e);
}
function Ba(e) {
  return Uint8Array.from(e, (t, n) => {
    const r = t.charCodeAt(0);
    if (t.length !== 1 || r > 127)
      throw new Error(`string contains non-ASCII character "${e[n]}" with code ${r} at position ${n}`);
    return r;
  });
}
const Wn = (e) => typeof e == "bigint" && Co <= e;
function Oa(e, t, n) {
  return Wn(e) && Wn(t) && Wn(n) && t <= e && e < n;
}
function Os(e, t, n, r) {
  if (!Oa(t, n, r))
    throw new Error("expected valid " + e + ": " + n + " <= n < " + r + ", got " + t);
}
function Ua(e) {
  let t;
  for (t = 0; e > Co; e >>= Jr, t += 1)
    ;
  return t;
}
const $o = (e) => (Jr << BigInt(e)) - Jr;
function Na(e, t, n) {
  if (de(e, "hashLen"), de(t, "qByteLen"), typeof n != "function")
    throw new Error("hmacFn must be a function");
  const r = (y) => new Uint8Array(y), o = Uint8Array.of(), i = Uint8Array.of(0), s = Uint8Array.of(1), c = 1e3;
  let a = r(e), u = r(e), f = 0;
  const d = () => {
    a.fill(1), u.fill(0), f = 0;
  }, l = (...y) => n(u, $t(a, ...y)), h = (y = o) => {
    u = l(i, y), a = l(), y.length !== 0 && (u = l(s, y), a = l());
  }, p = () => {
    if (f++ >= c)
      throw new Error("drbg: tried max amount of iterations");
    let y = 0;
    const x = [];
    for (; y < t; ) {
      a = l();
      const b = a.slice();
      x.push(b), y += a.length;
    }
    return $t(...x);
  };
  return (y, x) => {
    d(), h(y);
    let b;
    for (; !(b = x(p())); )
      h();
    return d(), b;
  };
}
function Lo(e, t = {}, n = {}) {
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
function wi(e) {
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
const yt = /* @__PURE__ */ BigInt(0), gt = /* @__PURE__ */ BigInt(1), Se = /* @__PURE__ */ BigInt(2), Us = /* @__PURE__ */ BigInt(3), Ns = /* @__PURE__ */ BigInt(4), Ps = /* @__PURE__ */ BigInt(5), Pa = /* @__PURE__ */ BigInt(7), Rs = /* @__PURE__ */ BigInt(8), Ra = /* @__PURE__ */ BigInt(9), Cs = /* @__PURE__ */ BigInt(16);
function Pt(e, t) {
  const n = e % t;
  return n >= yt ? n : t + n;
}
function At(e, t, n) {
  let r = e;
  for (; t-- > yt; )
    r *= r, r %= n;
  return r;
}
function yi(e, t) {
  if (e === yt)
    throw new Error("invert: expected non-zero number");
  if (t <= yt)
    throw new Error("invert: expected positive modulus, got " + t);
  let n = Pt(e, t), r = t, o = yt, i = gt;
  for (; n !== yt; ) {
    const c = r / n, a = r % n, u = o - i * c;
    r = n, n = a, o = i, i = u;
  }
  if (r !== gt)
    throw new Error("invert: does not exist");
  return Pt(o, t);
}
function _o(e, t, n) {
  if (!e.eql(e.sqr(t), n))
    throw new Error("Cannot find square root");
}
function $s(e, t) {
  const n = (e.ORDER + gt) / Ns, r = e.pow(t, n);
  return _o(e, r, t), r;
}
function Ca(e, t) {
  const n = (e.ORDER - Ps) / Rs, r = e.mul(t, Se), o = e.pow(r, n), i = e.mul(t, o), s = e.mul(e.mul(i, Se), o), c = e.mul(i, e.sub(s, e.ONE));
  return _o(e, c, t), c;
}
function $a(e) {
  const t = Sr(e), n = Ls(e), r = n(t, t.neg(t.ONE)), o = n(t, r), i = n(t, t.neg(r)), s = (e + Pa) / Cs;
  return (c, a) => {
    let u = c.pow(a, s), f = c.mul(u, r);
    const d = c.mul(u, o), l = c.mul(u, i), h = c.eql(c.sqr(f), a), p = c.eql(c.sqr(d), a);
    u = c.cmov(u, f, h), f = c.cmov(l, d, p);
    const g = c.eql(c.sqr(f), a), y = c.cmov(u, f, g);
    return _o(c, y, a), y;
  };
}
function Ls(e) {
  if (e < Us)
    throw new Error("sqrt is not defined for small field");
  let t = e - gt, n = 0;
  for (; t % Se === yt; )
    t /= Se, n++;
  let r = Se;
  const o = Sr(e);
  for (; mi(o, r) === 1; )
    if (r++ > 1e3)
      throw new Error("Cannot find square root: probably non-prime P");
  if (n === 1)
    return $s;
  let i = o.pow(r, t);
  const s = (t + gt) / Se;
  return function(a, u) {
    if (a.is0(u))
      return u;
    if (mi(a, u) !== 1)
      throw new Error("Cannot find square root");
    let f = n, d = a.mul(a.ONE, i), l = a.pow(u, t), h = a.pow(u, s);
    for (; !a.eql(l, a.ONE); ) {
      if (a.is0(l))
        return a.ZERO;
      let p = 1, g = a.sqr(l);
      for (; !a.eql(g, a.ONE); )
        if (p++, g = a.sqr(g), p === f)
          throw new Error("Cannot find square root");
      const y = gt << BigInt(f - p - 1), x = a.pow(d, y);
      f = p, d = a.sqr(x), l = a.mul(l, d), h = a.mul(h, x);
    }
    return h;
  };
}
function La(e) {
  return e % Ns === Us ? $s : e % Rs === Ps ? Ca : e % Cs === Ra ? $a(e) : Ls(e);
}
const _a = [
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
function Va(e) {
  const t = {
    ORDER: "bigint",
    BYTES: "number",
    BITS: "number"
  }, n = _a.reduce((r, o) => (r[o] = "function", r), t);
  return Lo(e, n), e;
}
function Da(e, t, n) {
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
function _s(e, t, n = !1) {
  const r = new Array(t.length).fill(n ? e.ZERO : void 0), o = t.reduce((s, c, a) => e.is0(c) ? s : (r[a] = s, e.mul(s, c)), e.ONE), i = e.inv(o);
  return t.reduceRight((s, c, a) => e.is0(c) ? s : (r[a] = e.mul(s, r[a]), e.mul(s, c)), i), r;
}
function mi(e, t) {
  const n = (e.ORDER - gt) / Se, r = e.pow(t, n), o = e.eql(r, e.ONE), i = e.eql(r, e.ZERO), s = e.eql(r, e.neg(e.ONE));
  if (!o && !i && !s)
    throw new Error("invalid Legendre symbol result");
  return o ? 1 : i ? 0 : -1;
}
function Ha(e, t) {
  t !== void 0 && de(t);
  const n = t !== void 0 ? t : e.toString(2).length, r = Math.ceil(n / 8);
  return { nBitLength: n, nByteLength: r };
}
class Fa {
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
    const { nBitLength: o, nByteLength: i } = Ha(t, r);
    if (i > 2048)
      throw new Error("invalid field: expected ORDER of <= 2048 bytes");
    this.ORDER = t, this.BITS = o, this.BYTES = i, this._sqrt = void 0, Object.preventExtensions(this);
  }
  create(t) {
    return Pt(t, this.ORDER);
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
    return Pt(-t, this.ORDER);
  }
  eql(t, n) {
    return t === n;
  }
  sqr(t) {
    return Pt(t * t, this.ORDER);
  }
  add(t, n) {
    return Pt(t + n, this.ORDER);
  }
  sub(t, n) {
    return Pt(t - n, this.ORDER);
  }
  mul(t, n) {
    return Pt(t * n, this.ORDER);
  }
  pow(t, n) {
    return Da(this, t, n);
  }
  div(t, n) {
    return Pt(t * yi(n, this.ORDER), this.ORDER);
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
    return yi(t, this.ORDER);
  }
  sqrt(t) {
    return this._sqrt || (this._sqrt = La(this.ORDER)), this._sqrt(this, t);
  }
  toBytes(t) {
    return this.isLE ? Bs(t, this.BYTES) : vn(t, this.BYTES);
  }
  fromBytes(t, n = !1) {
    _(t);
    const { _lengths: r, BYTES: o, isLE: i, ORDER: s, _mod: c } = this;
    if (r) {
      if (!r.includes(t.length) || t.length > o)
        throw new Error("Field.fromBytes: expected " + r + " bytes, got " + t.length);
      const u = new Uint8Array(o);
      u.set(t, i ? 0 : u.length - t.length), t = u;
    }
    if (t.length !== o)
      throw new Error("Field.fromBytes: expected " + o + " bytes, got " + t.length);
    let a = i ? Is(t) : qt(t);
    if (c && (a = Pt(a, s)), !n && !this.isValid(a))
      throw new Error("invalid field element: outside of range 0..ORDER");
    return a;
  }
  // TODO: we don't need it here, move out to separate fn
  invertBatch(t) {
    return _s(this, t);
  }
  // We can't move this out because Fp6, Fp12 implement it
  // and it's unclear what to return in there.
  cmov(t, n, r) {
    return r ? n : t;
  }
}
function Sr(e, t = {}) {
  return new Fa(e, t);
}
function Vs(e) {
  if (typeof e != "bigint")
    throw new Error("field order must be bigint");
  const t = e.toString(2).length;
  return Math.ceil(t / 8);
}
function Ds(e) {
  const t = Vs(e);
  return t + Math.ceil(t / 2);
}
function Hs(e, t, n = !1) {
  _(e);
  const r = e.length, o = Vs(t), i = Ds(t);
  if (r < 16 || r < i || r > 1024)
    throw new Error("expected " + i + "-1024 bytes of input, got " + r);
  const s = n ? Is(e) : qt(e), c = Pt(s, t - gt) + gt;
  return n ? Bs(c, o) : vn(c, o);
}
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const Fe = /* @__PURE__ */ BigInt(0), Te = /* @__PURE__ */ BigInt(1);
function tr(e, t) {
  const n = t.negate();
  return e ? n : t;
}
function xi(e, t) {
  const n = _s(e.Fp, t.map((r) => r.Z));
  return t.map((r, o) => e.fromAffine(r.toAffine(n[o])));
}
function Fs(e, t) {
  if (!Number.isSafeInteger(e) || e <= 0 || e > t)
    throw new Error("invalid window size, expected [1.." + t + "], got W=" + e);
}
function _r(e, t) {
  Fs(e, t);
  const n = Math.ceil(t / e) + 1, r = 2 ** (e - 1), o = 2 ** e, i = $o(e), s = BigInt(e);
  return { windows: n, windowSize: r, mask: i, maxNumber: o, shiftBy: s };
}
function bi(e, t, n) {
  const { windowSize: r, mask: o, maxNumber: i, shiftBy: s } = n;
  let c = Number(e & o), a = e >> s;
  c > r && (c -= i, a += Te);
  const u = t * r, f = u + Math.abs(c) - 1, d = c === 0, l = c < 0, h = t % 2 !== 0;
  return { nextN: a, offset: f, isZero: d, isNeg: l, isNegF: h, offsetF: u };
}
const Vr = /* @__PURE__ */ new WeakMap(), Ks = /* @__PURE__ */ new WeakMap();
function Dr(e) {
  return Ks.get(e) || 1;
}
function Ei(e) {
  if (e !== Fe)
    throw new Error("invalid wNAF");
}
let Ka = class {
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
    for (; n > Fe; )
      n & Te && (r = r.add(o)), o = o.double(), n >>= Te;
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
    const { windows: r, windowSize: o } = _r(n, this.bits), i = [];
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
    const s = _r(t, this.bits);
    for (let c = 0; c < s.windows; c++) {
      const { nextN: a, offset: u, isZero: f, isNeg: d, isNegF: l, offsetF: h } = bi(r, c, s);
      r = a, f ? i = i.add(tr(l, n[h])) : o = o.add(tr(d, n[u]));
    }
    return Ei(r), { p: o, f: i };
  }
  /**
   * Implements ec unsafe (non const-time) multiplication using precomputed tables and w-ary non-adjacent form.
   * @param acc accumulator point to add result of multiplication
   * @returns point
   */
  wNAFUnsafe(t, n, r, o = this.ZERO) {
    const i = _r(t, this.bits);
    for (let s = 0; s < i.windows && r !== Fe; s++) {
      const { nextN: c, offset: a, isZero: u, isNeg: f } = bi(r, s, i);
      if (r = c, !u) {
        const d = n[a];
        o = o.add(f ? d.negate() : d);
      }
    }
    return Ei(r), o;
  }
  getPrecomputes(t, n, r) {
    let o = Vr.get(n);
    return o || (o = this.precomputeWindow(n, t), t !== 1 && (typeof r == "function" && (o = r(o)), Vr.set(n, o))), o;
  }
  cached(t, n, r) {
    const o = Dr(t);
    return this.wNAF(o, this.getPrecomputes(o, t, r), n);
  }
  unsafe(t, n, r, o) {
    const i = Dr(t);
    return i === 1 ? this._unsafeLadder(t, n, o) : this.wNAFUnsafe(i, this.getPrecomputes(i, t, r), n, o);
  }
  // We calculate precomputes for elliptic curve point multiplication
  // using windowed method. This specifies window size and
  // stores precomputed values. Usually only base point would be precomputed.
  createCache(t, n) {
    Fs(n, this.bits), Ks.set(t, n), Vr.delete(t);
  }
  hasCache(t) {
    return Dr(t) !== 1;
  }
};
function Ma(e, t, n, r) {
  let o = t, i = e.ZERO, s = e.ZERO;
  for (; n > Fe || r > Fe; )
    n & Te && (i = i.add(o)), r & Te && (s = s.add(o)), o = o.double(), n >>= Te, r >>= Te;
  return { p1: i, p2: s };
}
function Si(e, t, n) {
  if (t) {
    if (t.ORDER !== e)
      throw new Error("Field.ORDER must match order: Fp == p, Fn == n");
    return Va(t), t;
  } else
    return Sr(e, { isLE: n });
}
function Wa(e, t, n = {}, r) {
  if (r === void 0 && (r = e === "edwards"), !t || typeof t != "object")
    throw new Error(`expected valid ${e} CURVE object`);
  for (const a of ["p", "n", "h"]) {
    const u = t[a];
    if (!(typeof u == "bigint" && u > Fe))
      throw new Error(`CURVE.${a} must be positive bigint`);
  }
  const o = Si(t.p, n.Fp, r), i = Si(t.n, n.Fn, r), c = ["Gx", "Gy", "a", "b"];
  for (const a of c)
    if (!o.isValid(t[a]))
      throw new Error(`CURVE.${a} must be valid field element of CURVE.Fp`);
  return t = Object.freeze(Object.assign({}, t)), { CURVE: t, Fp: o, Fn: i };
}
function Ms(e, t) {
  return function(r) {
    const o = e(r);
    return { secretKey: o, publicKey: t(o) };
  };
}
class Ws {
  oHash;
  iHash;
  blockLen;
  outputLen;
  finished = !1;
  destroyed = !1;
  constructor(t, n) {
    if (Es(t), _(n, void 0, "key"), this.iHash = t.create(), typeof this.iHash.update != "function")
      throw new Error("Expected instance of class which extends utils.Hash");
    this.blockLen = this.iHash.blockLen, this.outputLen = this.iHash.outputLen;
    const r = this.blockLen, o = new Uint8Array(r);
    o.set(n.length > r ? t.create().update(n).digest() : n);
    for (let i = 0; i < o.length; i++)
      o[i] ^= 54;
    this.iHash.update(o), this.oHash = t.create();
    for (let i = 0; i < o.length; i++)
      o[i] ^= 106;
    this.oHash.update(o), He(o);
  }
  update(t) {
    return Xn(this), this.iHash.update(t), this;
  }
  digestInto(t) {
    Xn(this), _(t, this.outputLen, "output"), this.finished = !0, this.iHash.digestInto(t), this.oHash.update(t), this.oHash.digestInto(t), this.destroy();
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
const zs = (e, t, n) => new Ws(e, t).update(n).digest();
zs.create = (e, t) => new Ws(e, t);
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const Ti = (e, t) => (e + (e >= 0 ? t : -t) / js) / t;
function za(e, t, n) {
  const [[r, o], [i, s]] = t, c = Ti(s * e, n), a = Ti(-o * e, n);
  let u = e - c * r - a * i, f = -c * o - a * s;
  const d = u < Qt, l = f < Qt;
  d && (u = -u), l && (f = -f);
  const h = $o(Math.ceil(Ua(n) / 2)) + Le;
  if (u < Qt || u >= h || f < Qt || f >= h)
    throw new Error("splitScalar (endomorphism): failed, k=" + e);
  return { k1neg: d, k1: u, k2neg: l, k2: f };
}
function to(e) {
  if (!["compact", "recovered", "der"].includes(e))
    throw new Error('Signature format must be "compact", "recovered", or "der"');
  return e;
}
function Hr(e, t) {
  const n = {};
  for (let r of Object.keys(t))
    n[r] = e[r] === void 0 ? t[r] : e[r];
  return Jn(n.lowS, "lowS"), Jn(n.prehash, "prehash"), n.format !== void 0 && to(n.format), n;
}
class ja extends Error {
  constructor(t = "") {
    super(t);
  }
}
const ie = {
  // asn.1 DER encoding utils
  Err: ja,
  // Basic building block is TLV (Tag-Length-Value)
  _tlv: {
    encode: (e, t) => {
      const { Err: n } = ie;
      if (e < 0 || e > 256)
        throw new n("tlv.encode: wrong tag");
      if (t.length & 1)
        throw new n("tlv.encode: unpadded data");
      const r = t.length / 2, o = Nn(r);
      if (o.length / 2 & 128)
        throw new n("tlv.encode: long form length too big");
      const i = r > 127 ? Nn(o.length / 2 | 128) : "";
      return Nn(e) + i + o + t;
    },
    // v - value, l - left bytes (unparsed)
    decode(e, t) {
      const { Err: n } = ie;
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
      const { Err: t } = ie;
      if (e < Qt)
        throw new t("integer: negative integers are not allowed");
      let n = Nn(e);
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
    const { Err: t, _int: n, _tlv: r } = ie, o = _(e, void 0, "signature"), { v: i, l: s } = r.decode(48, o);
    if (s.length)
      throw new t("invalid signature: left bytes after parsing");
    const { v: c, l: a } = r.decode(2, i), { v: u, l: f } = r.decode(2, a);
    if (f.length)
      throw new t("invalid signature: left bytes after parsing");
    return { r: n.decode(c), s: n.decode(u) };
  },
  hexFromSig(e) {
    const { _tlv: t, _int: n } = ie, r = t.encode(2, n.encode(e.r)), o = t.encode(2, n.encode(e.s)), i = r + o;
    return t.encode(48, i);
  }
}, Qt = BigInt(0), Le = BigInt(1), js = BigInt(2), Pn = BigInt(3), Ga = BigInt(4);
function qa(e, t = {}) {
  const n = Wa("weierstrass", e, t), { Fp: r, Fn: o } = n;
  let i = n.CURVE;
  const { h: s, n: c } = i;
  Lo(t, {}, {
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
  const u = qs(r, o);
  function f() {
    if (!r.isOdd)
      throw new Error("compression is not supported: Field does not have .isOdd()");
  }
  function d(F, k, T) {
    const { x: w, y: E } = k.toAffine(), U = r.toBytes(w);
    if (Jn(T, "isCompressed"), T) {
      f();
      const P = !r.isOdd(E);
      return $t(Gs(P), U);
    } else
      return $t(Uint8Array.of(4), U, r.toBytes(E));
  }
  function l(F) {
    _(F, void 0, "Point");
    const { publicKey: k, publicKeyUncompressed: T } = u, w = F.length, E = F[0], U = F.subarray(1);
    if (w === k && (E === 2 || E === 3)) {
      const P = r.fromBytes(U);
      if (!r.isValid(P))
        throw new Error("bad point: is not on curve, wrong x");
      const N = g(P);
      let O;
      try {
        O = r.sqrt(N);
      } catch (J) {
        const G = J instanceof Error ? ": " + J.message : "";
        throw new Error("bad point: is not on curve, sqrt error" + G);
      }
      f();
      const R = r.isOdd(O);
      return (E & 1) === 1 !== R && (O = r.neg(O)), { x: P, y: O };
    } else if (w === T && E === 4) {
      const P = r.BYTES, N = r.fromBytes(U.subarray(0, P)), O = r.fromBytes(U.subarray(P, P * 2));
      if (!y(N, O))
        throw new Error("bad point: is not on curve");
      return { x: N, y: O };
    } else
      throw new Error(`bad point: got length ${w}, expected compressed=${k} or uncompressed=${T}`);
  }
  const h = t.toBytes || d, p = t.fromBytes || l;
  function g(F) {
    const k = r.sqr(F), T = r.mul(k, F);
    return r.add(r.add(T, r.mul(F, i.a)), i.b);
  }
  function y(F, k) {
    const T = r.sqr(k), w = g(F);
    return r.eql(T, w);
  }
  if (!y(i.Gx, i.Gy))
    throw new Error("bad curve params: generator point");
  const x = r.mul(r.pow(i.a, Pn), Ga), b = r.mul(r.sqr(i.b), BigInt(27));
  if (r.is0(r.add(x, b)))
    throw new Error("bad curve params: a or b");
  function v(F, k, T = !1) {
    if (!r.isValid(k) || T && r.is0(k))
      throw new Error(`bad point coordinate ${F}`);
    return k;
  }
  function A(F) {
    if (!(F instanceof D))
      throw new Error("Weierstrass Point expected");
  }
  function B(F) {
    if (!a || !a.basises)
      throw new Error("no endo");
    return za(F, a.basises, o.ORDER);
  }
  const j = wi((F, k) => {
    const { X: T, Y: w, Z: E } = F;
    if (r.eql(E, r.ONE))
      return { x: T, y: w };
    const U = F.is0();
    k == null && (k = U ? r.ONE : r.inv(E));
    const P = r.mul(T, k), N = r.mul(w, k), O = r.mul(E, k);
    if (U)
      return { x: r.ZERO, y: r.ZERO };
    if (!r.eql(O, r.ONE))
      throw new Error("invZ was invalid");
    return { x: P, y: N };
  }), m = wi((F) => {
    if (F.is0()) {
      if (t.allowInfinityPoint && !r.is0(F.Y))
        return;
      throw new Error("bad point: ZERO");
    }
    const { x: k, y: T } = F.toAffine();
    if (!r.isValid(k) || !r.isValid(T))
      throw new Error("bad point: x or y not field elements");
    if (!y(k, T))
      throw new Error("bad point: equation left != right");
    if (!F.isTorsionFree())
      throw new Error("bad point: not in prime-order subgroup");
    return !0;
  });
  function ft(F, k, T, w, E) {
    return T = new D(r.mul(T.X, F), T.Y, T.Z), k = tr(w, k), T = tr(E, T), k.add(T);
  }
  class D {
    // base / generator point
    static BASE = new D(i.Gx, i.Gy, r.ONE);
    // zero / infinity / identity point
    static ZERO = new D(r.ZERO, r.ONE, r.ZERO);
    // 0, 1, 0
    // math field
    static Fp = r;
    // scalar field
    static Fn = o;
    X;
    Y;
    Z;
    /** Does NOT validate if the point is valid. Use `.assertValidity()`. */
    constructor(k, T, w) {
      this.X = v("x", k), this.Y = v("y", T, !0), this.Z = v("z", w), Object.freeze(this);
    }
    static CURVE() {
      return i;
    }
    /** Does NOT validate if the point is valid. Use `.assertValidity()`. */
    static fromAffine(k) {
      const { x: T, y: w } = k || {};
      if (!k || !r.isValid(T) || !r.isValid(w))
        throw new Error("invalid affine point");
      if (k instanceof D)
        throw new Error("projective point not allowed");
      return r.is0(T) && r.is0(w) ? D.ZERO : new D(T, w, r.ONE);
    }
    static fromBytes(k) {
      const T = D.fromAffine(p(_(k, void 0, "point")));
      return T.assertValidity(), T;
    }
    static fromHex(k) {
      return D.fromBytes(Qn(k));
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
      return Yt.createCache(this, k), T || this.multiply(Pn), this;
    }
    // TODO: return `this`
    /** A point on curve is valid if it conforms to equation. */
    assertValidity() {
      m(this);
    }
    hasEvenY() {
      const { y: k } = this.toAffine();
      if (!r.isOdd)
        throw new Error("Field doesn't support isOdd");
      return !r.isOdd(k);
    }
    /** Compare one point to another. */
    equals(k) {
      A(k);
      const { X: T, Y: w, Z: E } = this, { X: U, Y: P, Z: N } = k, O = r.eql(r.mul(T, N), r.mul(U, E)), R = r.eql(r.mul(w, N), r.mul(P, E));
      return O && R;
    }
    /** Flips point to one corresponding to (x, -y) in Affine coordinates. */
    negate() {
      return new D(this.X, r.neg(this.Y), this.Z);
    }
    // Renes-Costello-Batina exception-free doubling formula.
    // There is 30% faster Jacobian formula, but it is not complete.
    // https://eprint.iacr.org/2015/1060, algorithm 3
    // Cost: 8M + 3S + 3*a + 2*b3 + 15add.
    double() {
      const { a: k, b: T } = i, w = r.mul(T, Pn), { X: E, Y: U, Z: P } = this;
      let N = r.ZERO, O = r.ZERO, R = r.ZERO, $ = r.mul(E, E), J = r.mul(U, U), G = r.mul(P, P), H = r.mul(E, U);
      return H = r.add(H, H), R = r.mul(E, P), R = r.add(R, R), N = r.mul(k, R), O = r.mul(w, G), O = r.add(N, O), N = r.sub(J, O), O = r.add(J, O), O = r.mul(N, O), N = r.mul(H, N), R = r.mul(w, R), G = r.mul(k, G), H = r.sub($, G), H = r.mul(k, H), H = r.add(H, R), R = r.add($, $), $ = r.add(R, $), $ = r.add($, G), $ = r.mul($, H), O = r.add(O, $), G = r.mul(U, P), G = r.add(G, G), $ = r.mul(G, H), N = r.sub(N, $), R = r.mul(G, J), R = r.add(R, R), R = r.add(R, R), new D(N, O, R);
    }
    // Renes-Costello-Batina exception-free addition formula.
    // There is 30% faster Jacobian formula, but it is not complete.
    // https://eprint.iacr.org/2015/1060, algorithm 1
    // Cost: 12M + 0S + 3*a + 3*b3 + 23add.
    add(k) {
      A(k);
      const { X: T, Y: w, Z: E } = this, { X: U, Y: P, Z: N } = k;
      let O = r.ZERO, R = r.ZERO, $ = r.ZERO;
      const J = i.a, G = r.mul(i.b, Pn);
      let H = r.mul(T, U), Z = r.mul(w, P), dt = r.mul(E, N), Ht = r.add(T, w), X = r.add(U, P);
      Ht = r.mul(Ht, X), X = r.add(H, Z), Ht = r.sub(Ht, X), X = r.add(T, E);
      let ht = r.add(U, N);
      return X = r.mul(X, ht), ht = r.add(H, dt), X = r.sub(X, ht), ht = r.add(w, E), O = r.add(P, N), ht = r.mul(ht, O), O = r.add(Z, dt), ht = r.sub(ht, O), $ = r.mul(J, X), O = r.mul(G, dt), $ = r.add(O, $), O = r.sub(Z, $), $ = r.add(Z, $), R = r.mul(O, $), Z = r.add(H, H), Z = r.add(Z, H), dt = r.mul(J, dt), X = r.mul(G, X), Z = r.add(Z, dt), dt = r.sub(H, dt), dt = r.mul(J, dt), X = r.add(X, dt), H = r.mul(Z, X), R = r.add(R, H), H = r.mul(ht, X), O = r.mul(Ht, O), O = r.sub(O, H), H = r.mul(Ht, Z), $ = r.mul(ht, $), $ = r.add($, H), new D(O, R, $);
    }
    subtract(k) {
      return this.add(k.negate());
    }
    is0() {
      return this.equals(D.ZERO);
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
      let w, E;
      const U = (P) => Yt.cached(this, P, (N) => xi(D, N));
      if (T) {
        const { k1neg: P, k1: N, k2neg: O, k2: R } = B(k), { p: $, f: J } = U(N), { p: G, f: H } = U(R);
        E = J.add(H), w = ft(T.beta, $, G, P, O);
      } else {
        const { p: P, f: N } = U(k);
        w = P, E = N;
      }
      return xi(D, [w, E])[0];
    }
    /**
     * Non-constant-time multiplication. Uses double-and-add algorithm.
     * It's faster, but should only be used when you don't care about
     * an exposed secret key e.g. sig verification, which works over *public* keys.
     */
    multiplyUnsafe(k) {
      const { endo: T } = t, w = this;
      if (!o.isValid(k))
        throw new Error("invalid scalar: out of range");
      if (k === Qt || w.is0())
        return D.ZERO;
      if (k === Le)
        return w;
      if (Yt.hasCache(this))
        return this.multiply(k);
      if (T) {
        const { k1neg: E, k1: U, k2neg: P, k2: N } = B(k), { p1: O, p2: R } = Ma(D, w, U, N);
        return ft(T.beta, O, R, E, P);
      } else
        return Yt.unsafe(w, k);
    }
    /**
     * Converts Projective point to affine (x, y) coordinates.
     * @param invertedZ Z^-1 (inverted zero) - optional, precomputation is useful for invertBatch
     */
    toAffine(k) {
      return j(this, k);
    }
    /**
     * Checks whether Point is free of torsion elements (is in prime subgroup).
     * Always torsion-free for cofactor=1 curves.
     */
    isTorsionFree() {
      const { isTorsionFree: k } = t;
      return s === Le ? !0 : k ? k(D, this) : Yt.unsafe(this, c).is0();
    }
    clearCofactor() {
      const { clearCofactor: k } = t;
      return s === Le ? this : k ? k(D, this) : this.multiplyUnsafe(s);
    }
    isSmallOrder() {
      return this.multiplyUnsafe(s).is0();
    }
    toBytes(k = !0) {
      return Jn(k, "isCompressed"), this.assertValidity(), h(D, this, k);
    }
    toHex(k = !0) {
      return Er(this.toBytes(k));
    }
    toString() {
      return `<Point ${this.is0() ? "ZERO" : this.toHex()}>`;
    }
  }
  const Pe = o.BITS, Yt = new Ka(D, t.endo ? Math.ceil(Pe / 2) : Pe);
  return D.BASE.precompute(8), D;
}
function Gs(e) {
  return Uint8Array.of(e ? 2 : 3);
}
function qs(e, t) {
  return {
    secretKey: t.BYTES,
    publicKey: 1 + e.BYTES,
    publicKeyUncompressed: 1 + 2 * e.BYTES,
    publicKeyHasPrefix: !0,
    signature: 2 * t.BYTES
  };
}
function Ya(e, t = {}) {
  const { Fn: n } = e, r = t.randomBytes || Tn, o = Object.assign(qs(e.Fp, n), { seed: Ds(n.ORDER) });
  function i(h) {
    try {
      const p = n.fromBytes(h);
      return n.isValidNot0(p);
    } catch {
      return !1;
    }
  }
  function s(h, p) {
    const { publicKey: g, publicKeyUncompressed: y } = o;
    try {
      const x = h.length;
      return p === !0 && x !== g || p === !1 && x !== y ? !1 : !!e.fromBytes(h);
    } catch {
      return !1;
    }
  }
  function c(h = r(o.seed)) {
    return Hs(_(h, o.seed, "seed"), n.ORDER);
  }
  function a(h, p = !0) {
    return e.BASE.multiply(n.fromBytes(h)).toBytes(p);
  }
  function u(h) {
    const { secretKey: p, publicKey: g, publicKeyUncompressed: y } = o;
    if (!Ro(h) || "_lengths" in n && n._lengths || p === g)
      return;
    const x = _(h, void 0, "key").length;
    return x === g || x === y;
  }
  function f(h, p, g = !0) {
    if (u(h) === !0)
      throw new Error("first arg must be private key");
    if (u(p) === !1)
      throw new Error("second arg must be public key");
    const y = n.fromBytes(h);
    return e.fromBytes(p).multiply(y).toBytes(g);
  }
  const d = {
    isValidSecretKey: i,
    isValidPublicKey: s,
    randomSecretKey: c
  }, l = Ms(c, a);
  return Object.freeze({ getPublicKey: a, getSharedSecret: f, keygen: l, Point: e, utils: d, lengths: o });
}
function Za(e, t, n = {}) {
  Es(t), Lo(n, {}, {
    hmac: "function",
    lowS: "boolean",
    randomBytes: "function",
    bits2int: "function",
    bits2int_modN: "function"
  }), n = Object.assign({}, n);
  const r = n.randomBytes || Tn, o = n.hmac || ((T, w) => zs(t, T, w)), { Fp: i, Fn: s } = e, { ORDER: c, BITS: a } = s, { keygen: u, getPublicKey: f, getSharedSecret: d, utils: l, lengths: h } = Ya(e, n), p = {
    prehash: !0,
    lowS: typeof n.lowS == "boolean" ? n.lowS : !0,
    format: "compact",
    extraEntropy: !1
  }, g = c * js < i.ORDER;
  function y(T) {
    const w = c >> Le;
    return T > w;
  }
  function x(T, w) {
    if (!s.isValidNot0(w))
      throw new Error(`invalid signature ${T}: out of range 1..Point.Fn.ORDER`);
    return w;
  }
  function b() {
    if (g)
      throw new Error('"recovered" sig type is not supported for cofactor >2 curves');
  }
  function v(T, w) {
    to(w);
    const E = h.signature, U = w === "compact" ? E : w === "recovered" ? E + 1 : void 0;
    return _(T, U);
  }
  class A {
    r;
    s;
    recovery;
    constructor(w, E, U) {
      if (this.r = x("r", w), this.s = x("s", E), U != null) {
        if (b(), ![0, 1, 2, 3].includes(U))
          throw new Error("invalid recovery id");
        this.recovery = U;
      }
      Object.freeze(this);
    }
    static fromBytes(w, E = p.format) {
      v(w, E);
      let U;
      if (E === "der") {
        const { r: R, s: $ } = ie.toSig(_(w));
        return new A(R, $);
      }
      E === "recovered" && (U = w[0], E = "compact", w = w.subarray(1));
      const P = h.signature / 2, N = w.subarray(0, P), O = w.subarray(P, P * 2);
      return new A(s.fromBytes(N), s.fromBytes(O), U);
    }
    static fromHex(w, E) {
      return this.fromBytes(Qn(w), E);
    }
    assertRecovery() {
      const { recovery: w } = this;
      if (w == null)
        throw new Error("invalid recovery id: must be present");
      return w;
    }
    addRecoveryBit(w) {
      return new A(this.r, this.s, w);
    }
    recoverPublicKey(w) {
      const { r: E, s: U } = this, P = this.assertRecovery(), N = P === 2 || P === 3 ? E + c : E;
      if (!i.isValid(N))
        throw new Error("invalid recovery id: sig.r+curve.n != R.x");
      const O = i.toBytes(N), R = e.fromBytes($t(Gs((P & 1) === 0), O)), $ = s.inv(N), J = j(_(w, void 0, "msgHash")), G = s.create(-J * $), H = s.create(U * $), Z = e.BASE.multiplyUnsafe(G).add(R.multiplyUnsafe(H));
      if (Z.is0())
        throw new Error("invalid recovery: point at infinify");
      return Z.assertValidity(), Z;
    }
    // Signatures should be low-s, to prevent malleability.
    hasHighS() {
      return y(this.s);
    }
    toBytes(w = p.format) {
      if (to(w), w === "der")
        return Qn(ie.hexFromSig(this));
      const { r: E, s: U } = this, P = s.toBytes(E), N = s.toBytes(U);
      return w === "recovered" ? (b(), $t(Uint8Array.of(this.assertRecovery()), P, N)) : $t(P, N);
    }
    toHex(w) {
      return Er(this.toBytes(w));
    }
  }
  const B = n.bits2int || function(w) {
    if (w.length > 8192)
      throw new Error("input is too large");
    const E = qt(w), U = w.length * 8 - a;
    return U > 0 ? E >> BigInt(U) : E;
  }, j = n.bits2int_modN || function(w) {
    return s.create(B(w));
  }, m = $o(a);
  function ft(T) {
    return Os("num < 2^" + a, T, Qt, m), s.toBytes(T);
  }
  function D(T, w) {
    return _(T, void 0, "message"), w ? _(t(T), void 0, "prehashed message") : T;
  }
  function Pe(T, w, E) {
    const { lowS: U, prehash: P, extraEntropy: N } = Hr(E, p);
    T = D(T, P);
    const O = j(T), R = s.fromBytes(w);
    if (!s.isValidNot0(R))
      throw new Error("invalid private key");
    const $ = [ft(R), ft(O)];
    if (N != null && N !== !1) {
      const Z = N === !0 ? r(h.secretKey) : N;
      $.push(_(Z, void 0, "extraEntropy"));
    }
    const J = $t(...$), G = O;
    function H(Z) {
      const dt = B(Z);
      if (!s.isValidNot0(dt))
        return;
      const Ht = s.inv(dt), X = e.BASE.multiply(dt).toAffine(), ht = s.create(X.x);
      if (ht === Qt)
        return;
      const On = s.create(Ht * s.create(G + ht * R));
      if (On === Qt)
        return;
      let hi = (X.x === ht ? 0 : 2) | Number(X.y & Le), pi = On;
      return U && y(On) && (pi = s.neg(On), hi ^= 1), new A(ht, pi, g ? void 0 : hi);
    }
    return { seed: J, k2sig: H };
  }
  function Yt(T, w, E = {}) {
    const { seed: U, k2sig: P } = Pe(T, w, E);
    return Na(t.outputLen, s.BYTES, o)(U, P).toBytes(E.format);
  }
  function F(T, w, E, U = {}) {
    const { lowS: P, prehash: N, format: O } = Hr(U, p);
    if (E = _(E, void 0, "publicKey"), w = D(w, N), !Ro(T)) {
      const R = T instanceof A ? ", use sig.toBytes()" : "";
      throw new Error("verify expects Uint8Array signature" + R);
    }
    v(T, O);
    try {
      const R = A.fromBytes(T, O), $ = e.fromBytes(E);
      if (P && R.hasHighS())
        return !1;
      const { r: J, s: G } = R, H = j(w), Z = s.inv(G), dt = s.create(H * Z), Ht = s.create(J * Z), X = e.BASE.multiplyUnsafe(dt).add($.multiplyUnsafe(Ht));
      return X.is0() ? !1 : s.create(X.x) === J;
    } catch {
      return !1;
    }
  }
  function k(T, w, E = {}) {
    const { prehash: U } = Hr(E, p);
    return w = D(w, U), A.fromBytes(T, "recovered").recoverPublicKey(w).toBytes();
  }
  return Object.freeze({
    keygen: u,
    getPublicKey: f,
    getSharedSecret: d,
    utils: l,
    lengths: h,
    Point: e,
    sign: Yt,
    verify: F,
    recoverPublicKey: k,
    Signature: A,
    hash: t
  });
}
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const Tr = {
  p: BigInt("0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffefffffc2f"),
  n: BigInt("0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141"),
  h: BigInt(1),
  a: BigInt(0),
  b: BigInt(7),
  Gx: BigInt("0x79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798"),
  Gy: BigInt("0x483ada7726a3c4655da4fbfc0e1108a8fd17b448a68554199c47d08ffb10d4b8")
}, Xa = {
  beta: BigInt("0x7ae96a2b657c07106e64479eac3434e99cf0497512f58995c1396c28719501ee"),
  basises: [
    [BigInt("0x3086d221a7d46bcde86c90e49284eb15"), -BigInt("0xe4437ed6010e88286f547fa90abfe4c3")],
    [BigInt("0x114ca50f7a8e2f3f657c1108d9d44cfd8"), BigInt("0x3086d221a7d46bcde86c90e49284eb15")]
  ]
}, Qa = /* @__PURE__ */ BigInt(0), eo = /* @__PURE__ */ BigInt(2);
function Ja(e) {
  const t = Tr.p, n = BigInt(3), r = BigInt(6), o = BigInt(11), i = BigInt(22), s = BigInt(23), c = BigInt(44), a = BigInt(88), u = e * e * e % t, f = u * u * e % t, d = At(f, n, t) * f % t, l = At(d, n, t) * f % t, h = At(l, eo, t) * u % t, p = At(h, o, t) * h % t, g = At(p, i, t) * p % t, y = At(g, c, t) * g % t, x = At(y, a, t) * y % t, b = At(x, c, t) * g % t, v = At(b, n, t) * f % t, A = At(v, s, t) * p % t, B = At(A, r, t) * u % t, j = At(B, eo, t);
  if (!er.eql(er.sqr(j), e))
    throw new Error("Cannot find square root");
  return j;
}
const er = Sr(Tr.p, { sqrt: Ja }), Ne = /* @__PURE__ */ qa(Tr, {
  Fp: er,
  endo: Xa
}), Mt = /* @__PURE__ */ Za(Ne, pt), vi = {};
function nr(e, ...t) {
  let n = vi[e];
  if (n === void 0) {
    const r = pt(Ba(e));
    n = $t(r, r), vi[e] = n;
  }
  return pt($t(n, ...t));
}
const Vo = (e) => e.toBytes(!0).slice(1), Do = (e) => e % eo === Qa;
function no(e) {
  const { Fn: t, BASE: n } = Ne, r = t.fromBytes(e), o = n.multiply(r);
  return { scalar: Do(o.y) ? r : t.neg(r), bytes: Vo(o) };
}
function Ys(e) {
  const t = er;
  if (!t.isValidNot0(e))
    throw new Error("invalid x: Fail if x ≥ p");
  const n = t.create(e * e), r = t.create(n * e + BigInt(7));
  let o = t.sqrt(r);
  Do(o) || (o = t.neg(o));
  const i = Ne.fromAffine({ x: e, y: o });
  return i.assertValidity(), i;
}
const un = qt;
function Zs(...e) {
  return Ne.Fn.create(un(nr("BIP0340/challenge", ...e)));
}
function ki(e) {
  return no(e).bytes;
}
function tu(e, t, n = Tn(32)) {
  const { Fn: r } = Ne, o = _(e, void 0, "message"), { bytes: i, scalar: s } = no(t), c = _(n, 32, "auxRand"), a = r.toBytes(s ^ un(nr("BIP0340/aux", c))), u = nr("BIP0340/nonce", a, i, o), { bytes: f, scalar: d } = no(u), l = Zs(f, i, o), h = new Uint8Array(64);
  if (h.set(f, 0), h.set(r.toBytes(r.create(d + l * s)), 32), !Xs(h, o, i))
    throw new Error("sign: Invalid signature produced");
  return h;
}
function Xs(e, t, n) {
  const { Fp: r, Fn: o, BASE: i } = Ne, s = _(e, 64, "signature"), c = _(t, void 0, "message"), a = _(n, 32, "publicKey");
  try {
    const u = Ys(un(a)), f = un(s.subarray(0, 32));
    if (!r.isValidNot0(f))
      return !1;
    const d = un(s.subarray(32, 64));
    if (!o.isValidNot0(d))
      return !1;
    const l = Zs(o.toBytes(f), Vo(u), c), h = i.multiplyUnsafe(d).add(u.multiplyUnsafe(o.neg(l))), { x: p, y: g } = h.toAffine();
    return !(h.is0() || !Do(g) || p !== f);
  } catch {
    return !1;
  }
}
const Ut = /* @__PURE__ */ (() => {
  const n = (r = Tn(48)) => Hs(r, Tr.n);
  return {
    keygen: Ms(n, ki),
    getPublicKey: ki,
    sign: tu,
    verify: Xs,
    Point: Ne,
    utils: {
      randomSecretKey: n,
      taggedHash: nr,
      lift_x: Ys,
      pointToBytes: Vo
    },
    lengths: {
      secretKey: 32,
      publicKey: 32,
      publicKeyHasPrefix: !1,
      signature: 64,
      seed: 48
    }
  };
})(), eu = /* @__PURE__ */ Uint8Array.from([
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
]), Qs = Uint8Array.from(new Array(16).fill(0).map((e, t) => t)), nu = Qs.map((e) => (9 * e + 5) % 16), Js = /* @__PURE__ */ (() => {
  const n = [[Qs], [nu]];
  for (let r = 0; r < 4; r++)
    for (let o of n)
      o.push(o[r].map((i) => eu[i]));
  return n;
})(), tc = Js[0], ec = Js[1], nc = /* @__PURE__ */ [
  [11, 14, 15, 12, 5, 8, 7, 9, 11, 13, 14, 15, 6, 7, 9, 8],
  [12, 13, 11, 15, 6, 9, 9, 7, 12, 15, 11, 13, 7, 8, 7, 7],
  [13, 15, 14, 11, 7, 7, 6, 8, 13, 14, 13, 12, 5, 5, 6, 9],
  [14, 11, 12, 14, 8, 6, 5, 5, 15, 12, 15, 14, 9, 9, 8, 6],
  [15, 12, 13, 13, 9, 5, 8, 6, 14, 11, 12, 11, 8, 6, 5, 5]
].map((e) => Uint8Array.from(e)), ru = /* @__PURE__ */ tc.map((e, t) => e.map((n) => nc[t][n])), ou = /* @__PURE__ */ ec.map((e, t) => e.map((n) => nc[t][n])), iu = /* @__PURE__ */ Uint32Array.from([
  0,
  1518500249,
  1859775393,
  2400959708,
  2840853838
]), su = /* @__PURE__ */ Uint32Array.from([
  1352829926,
  1548603684,
  1836072691,
  2053994217,
  0
]);
function Ai(e, t, n, r) {
  return e === 0 ? t ^ n ^ r : e === 1 ? t & n | ~t & r : e === 2 ? (t | ~n) ^ r : e === 3 ? t & r | n & ~r : t ^ (n | ~r);
}
const Rn = /* @__PURE__ */ new Uint32Array(16);
class cu extends vs {
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
    for (let h = 0; h < 16; h++, n += 4)
      Rn[h] = t.getUint32(n, !0);
    let r = this.h0 | 0, o = r, i = this.h1 | 0, s = i, c = this.h2 | 0, a = c, u = this.h3 | 0, f = u, d = this.h4 | 0, l = d;
    for (let h = 0; h < 5; h++) {
      const p = 4 - h, g = iu[h], y = su[h], x = tc[h], b = ec[h], v = ru[h], A = ou[h];
      for (let B = 0; B < 16; B++) {
        const j = Un(r + Ai(h, i, c, u) + Rn[x[B]] + g, v[B]) + d | 0;
        r = d, d = u, u = Un(c, 10) | 0, c = i, i = j;
      }
      for (let B = 0; B < 16; B++) {
        const j = Un(o + Ai(p, s, a, f) + Rn[b[B]] + y, A[B]) + l | 0;
        o = l, l = f, f = Un(a, 10) | 0, a = s, s = j;
      }
    }
    this.set(this.h1 + c + f | 0, this.h2 + u + l | 0, this.h3 + d + o | 0, this.h4 + r + s | 0, this.h0 + i + a | 0);
  }
  roundClean() {
    He(Rn);
  }
  destroy() {
    this.destroyed = !0, He(this.buffer), this.set(0, 0, 0, 0, 0);
  }
}
const au = /* @__PURE__ */ Ts(() => new cu());
/*! scure-base - MIT License (c) 2022 Paul Miller (paulmillr.com) */
function Ke(e) {
  return e instanceof Uint8Array || ArrayBuffer.isView(e) && e.constructor.name === "Uint8Array";
}
function rc(e) {
  if (!Ke(e))
    throw new Error("Uint8Array expected");
}
function oc(e, t) {
  return Array.isArray(t) ? t.length === 0 ? !0 : e ? t.every((n) => typeof n == "string") : t.every((n) => Number.isSafeInteger(n)) : !1;
}
function Ho(e) {
  if (typeof e != "function")
    throw new Error("function expected");
  return !0;
}
function le(e, t) {
  if (typeof t != "string")
    throw new Error(`${e}: string expected`);
  return !0;
}
function tn(e) {
  if (!Number.isSafeInteger(e))
    throw new Error(`invalid integer: ${e}`);
}
function rr(e) {
  if (!Array.isArray(e))
    throw new Error("array expected");
}
function or(e, t) {
  if (!oc(!0, t))
    throw new Error(`${e}: array of strings expected`);
}
function Fo(e, t) {
  if (!oc(!1, t))
    throw new Error(`${e}: array of numbers expected`);
}
// @__NO_SIDE_EFFECTS__
function kn(...e) {
  const t = (i) => i, n = (i, s) => (c) => i(s(c)), r = e.map((i) => i.encode).reduceRight(n, t), o = e.map((i) => i.decode).reduce(n, t);
  return { encode: r, decode: o };
}
// @__NO_SIDE_EFFECTS__
function vr(e) {
  const t = typeof e == "string" ? e.split("") : e, n = t.length;
  or("alphabet", t);
  const r = new Map(t.map((o, i) => [o, i]));
  return {
    encode: (o) => (rr(o), o.map((i) => {
      if (!Number.isSafeInteger(i) || i < 0 || i >= n)
        throw new Error(`alphabet.encode: digit index outside alphabet "${i}". Allowed: ${e}`);
      return t[i];
    })),
    decode: (o) => (rr(o), o.map((i) => {
      le("alphabet.decode", i);
      const s = r.get(i);
      if (s === void 0)
        throw new Error(`Unknown letter: "${i}". Allowed: ${e}`);
      return s;
    }))
  };
}
// @__NO_SIDE_EFFECTS__
function kr(e = "") {
  return le("join", e), {
    encode: (t) => (or("join.decode", t), t.join(e)),
    decode: (t) => (le("join.decode", t), t.split(e))
  };
}
// @__NO_SIDE_EFFECTS__
function uu(e, t = "=") {
  return tn(e), le("padding", t), {
    encode(n) {
      for (or("padding.encode", n); n.length * e % 8; )
        n.push(t);
      return n;
    },
    decode(n) {
      or("padding.decode", n);
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
function fu(e) {
  return Ho(e), { encode: (t) => t, decode: (t) => e(t) };
}
function Ii(e, t, n) {
  if (t < 2)
    throw new Error(`convertRadix: invalid from=${t}, base cannot be less than 2`);
  if (n < 2)
    throw new Error(`convertRadix: invalid to=${n}, base cannot be less than 2`);
  if (rr(e), !e.length)
    return [];
  let r = 0;
  const o = [], i = Array.from(e, (c) => {
    if (tn(c), c < 0 || c >= t)
      throw new Error(`invalid integer: ${c}`);
    return c;
  }), s = i.length;
  for (; ; ) {
    let c = 0, a = !0;
    for (let u = r; u < s; u++) {
      const f = i[u], d = t * c, l = d + f;
      if (!Number.isSafeInteger(l) || d / t !== c || l - f !== d)
        throw new Error("convertRadix: carry overflow");
      const h = l / n;
      c = l % n;
      const p = Math.floor(h);
      if (i[u] = p, !Number.isSafeInteger(p) || p * n + c !== l)
        throw new Error("convertRadix: carry overflow");
      if (a)
        p ? a = !1 : r = u;
      else continue;
    }
    if (o.push(c), a)
      break;
  }
  for (let c = 0; c < e.length - 1 && e[c] === 0; c++)
    o.push(0);
  return o.reverse();
}
const ic = (e, t) => t === 0 ? e : ic(t, e % t), ir = /* @__NO_SIDE_EFFECTS__ */ (e, t) => e + (t - ic(e, t)), zn = /* @__PURE__ */ (() => {
  let e = [];
  for (let t = 0; t < 40; t++)
    e.push(2 ** t);
  return e;
})();
function ro(e, t, n, r) {
  if (rr(e), t <= 0 || t > 32)
    throw new Error(`convertRadix2: wrong from=${t}`);
  if (n <= 0 || n > 32)
    throw new Error(`convertRadix2: wrong to=${n}`);
  if (/* @__PURE__ */ ir(t, n) > 32)
    throw new Error(`convertRadix2: carry overflow from=${t} to=${n} carryBits=${/* @__PURE__ */ ir(t, n)}`);
  let o = 0, i = 0;
  const s = zn[t], c = zn[n] - 1, a = [];
  for (const u of e) {
    if (tn(u), u >= s)
      throw new Error(`convertRadix2: invalid data word=${u} from=${t}`);
    if (o = o << t | u, i + t > 32)
      throw new Error(`convertRadix2: carry overflow pos=${i} from=${t}`);
    for (i += t; i >= n; i -= n)
      a.push((o >> i - n & c) >>> 0);
    const f = zn[i];
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
function du(e) {
  tn(e);
  const t = 2 ** 8;
  return {
    encode: (n) => {
      if (!Ke(n))
        throw new Error("radix.encode input should be Uint8Array");
      return Ii(Array.from(n), t, e);
    },
    decode: (n) => (Fo("radix.decode", n), Uint8Array.from(Ii(n, e, t)))
  };
}
// @__NO_SIDE_EFFECTS__
function Ko(e, t = !1) {
  if (tn(e), e <= 0 || e > 32)
    throw new Error("radix2: bits should be in (0..32]");
  if (/* @__PURE__ */ ir(8, e) > 32 || /* @__PURE__ */ ir(e, 8) > 32)
    throw new Error("radix2: carry overflow");
  return {
    encode: (n) => {
      if (!Ke(n))
        throw new Error("radix2.encode input should be Uint8Array");
      return ro(Array.from(n), 8, e, !t);
    },
    decode: (n) => (Fo("radix2.decode", n), Uint8Array.from(ro(n, e, 8, t)))
  };
}
function Bi(e) {
  return Ho(e), function(...t) {
    try {
      return e.apply(null, t);
    } catch {
    }
  };
}
function lu(e, t) {
  return tn(e), Ho(t), {
    encode(n) {
      if (!Ke(n))
        throw new Error("checksum.encode: input should be Uint8Array");
      const r = t(n).slice(0, e), o = new Uint8Array(n.length + e);
      return o.set(n), o.set(r, n.length), o;
    },
    decode(n) {
      if (!Ke(n))
        throw new Error("checksum.decode: input should be Uint8Array");
      const r = n.slice(0, -e), o = n.slice(-e), i = t(r).slice(0, e);
      for (let s = 0; s < e; s++)
        if (i[s] !== o[s])
          throw new Error("Invalid checksum");
      return r;
    }
  };
}
const hu = typeof Uint8Array.from([]).toBase64 == "function" && typeof Uint8Array.fromBase64 == "function", pu = (e, t) => {
  le("base64", e);
  const n = /^[A-Za-z0-9=+/]+$/, r = "base64";
  if (e.length > 0 && !n.test(e))
    throw new Error("invalid base64");
  return Uint8Array.fromBase64(e, { alphabet: r, lastChunkHandling: "strict" });
}, lt = hu ? {
  encode(e) {
    return rc(e), e.toBase64();
  },
  decode(e) {
    return pu(e);
  }
} : /* @__PURE__ */ kn(/* @__PURE__ */ Ko(6), /* @__PURE__ */ vr("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"), /* @__PURE__ */ uu(6), /* @__PURE__ */ kr("")), gu = /* @__NO_SIDE_EFFECTS__ */ (e) => /* @__PURE__ */ kn(/* @__PURE__ */ du(58), /* @__PURE__ */ vr(e), /* @__PURE__ */ kr("")), oo = /* @__PURE__ */ gu("123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"), wu = (e) => /* @__PURE__ */ kn(lu(4, (t) => e(e(t))), oo), io = /* @__PURE__ */ kn(/* @__PURE__ */ vr("qpzry9x8gf2tvdw0s3jn54khce6mua7l"), /* @__PURE__ */ kr("")), Oi = [996825010, 642813549, 513874426, 1027748829, 705979059];
function nn(e) {
  const t = e >> 25;
  let n = (e & 33554431) << 5;
  for (let r = 0; r < Oi.length; r++)
    (t >> r & 1) === 1 && (n ^= Oi[r]);
  return n;
}
function Ui(e, t, n = 1) {
  const r = e.length;
  let o = 1;
  for (let i = 0; i < r; i++) {
    const s = e.charCodeAt(i);
    if (s < 33 || s > 126)
      throw new Error(`Invalid prefix (${e})`);
    o = nn(o) ^ s >> 5;
  }
  o = nn(o);
  for (let i = 0; i < r; i++)
    o = nn(o) ^ e.charCodeAt(i) & 31;
  for (let i of t)
    o = nn(o) ^ i;
  for (let i = 0; i < 6; i++)
    o = nn(o);
  return o ^= n, io.encode(ro([o % zn[30]], 30, 5, !1));
}
// @__NO_SIDE_EFFECTS__
function sc(e) {
  const t = e === "bech32" ? 1 : 734539939, n = /* @__PURE__ */ Ko(5), r = n.decode, o = n.encode, i = Bi(r);
  function s(d, l, h = 90) {
    le("bech32.encode prefix", d), Ke(l) && (l = Array.from(l)), Fo("bech32.encode", l);
    const p = d.length;
    if (p === 0)
      throw new TypeError(`Invalid prefix length ${p}`);
    const g = p + 7 + l.length;
    if (h !== !1 && g > h)
      throw new TypeError(`Length ${g} exceeds limit ${h}`);
    const y = d.toLowerCase(), x = Ui(y, l, t);
    return `${y}1${io.encode(l)}${x}`;
  }
  function c(d, l = 90) {
    le("bech32.decode input", d);
    const h = d.length;
    if (h < 8 || l !== !1 && h > l)
      throw new TypeError(`invalid string length: ${h} (${d}). Expected (8..${l})`);
    const p = d.toLowerCase();
    if (d !== p && d !== d.toUpperCase())
      throw new Error("String must be lowercase or uppercase");
    const g = p.lastIndexOf("1");
    if (g === 0 || g === -1)
      throw new Error('Letter "1" must be present between prefix and data only');
    const y = p.slice(0, g), x = p.slice(g + 1);
    if (x.length < 6)
      throw new Error("Data must be at least 6 characters long");
    const b = io.decode(x).slice(0, -6), v = Ui(y, b, t);
    if (!x.endsWith(v))
      throw new Error(`Invalid checksum in ${d}: expected "${v}"`);
    return { prefix: y, words: b };
  }
  const a = Bi(c);
  function u(d) {
    const { prefix: l, words: h } = c(d, !1);
    return { prefix: l, words: h, bytes: r(h) };
  }
  function f(d, l) {
    return s(d, o(l));
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
const so = /* @__PURE__ */ sc("bech32"), Re = /* @__PURE__ */ sc("bech32m"), yu = {
  encode: (e) => new TextDecoder().decode(e),
  decode: (e) => new TextEncoder().encode(e)
}, mu = typeof Uint8Array.from([]).toHex == "function" && typeof Uint8Array.fromHex == "function", xu = {
  encode(e) {
    return rc(e), e.toHex();
  },
  decode(e) {
    return le("hex", e), Uint8Array.fromHex(e);
  }
}, S = mu ? xu : /* @__PURE__ */ kn(/* @__PURE__ */ Ko(4), /* @__PURE__ */ vr("0123456789abcdef"), /* @__PURE__ */ kr(""), /* @__PURE__ */ fu((e) => {
  if (typeof e != "string" || e.length % 2 !== 0)
    throw new TypeError(`hex.decode: expected string, got ${typeof e} with length ${e.length}`);
  return e.toLowerCase();
})), Y = /* @__PURE__ */ Uint8Array.of(), cc = /* @__PURE__ */ Uint8Array.of(0);
function Me(e, t) {
  if (e.length !== t.length)
    return !1;
  for (let n = 0; n < e.length; n++)
    if (e[n] !== t[n])
      return !1;
  return !0;
}
function Bt(e) {
  return e instanceof Uint8Array || ArrayBuffer.isView(e) && e.constructor.name === "Uint8Array";
}
function bu(...e) {
  let t = 0;
  for (let r = 0; r < e.length; r++) {
    const o = e[r];
    if (!Bt(o))
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
const ac = (e) => new DataView(e.buffer, e.byteOffset, e.byteLength);
function An(e) {
  return Object.prototype.toString.call(e) === "[object Object]";
}
function zt(e) {
  return Number.isSafeInteger(e);
}
const Mo = {
  equalBytes: Me,
  isBytes: Bt,
  concatBytes: bu
}, uc = (e) => {
  if (e !== null && typeof e != "string" && !Lt(e) && !Bt(e) && !zt(e))
    throw new Error(`lengthCoder: expected null | number | Uint8Array | CoderType, got ${e} (${typeof e})`);
  return {
    encodeStream(t, n) {
      if (e === null)
        return;
      if (Lt(e))
        return e.encodeStream(t, n);
      let r;
      if (typeof e == "number" ? r = e : typeof e == "string" && (r = ee.resolve(t.stack, e)), typeof r == "bigint" && (r = Number(r)), r === void 0 || r !== n)
        throw t.err(`Wrong length: ${r} len=${e} exp=${n} (${typeof n})`);
    },
    decodeStream(t) {
      let n;
      if (Lt(e) ? n = Number(e.decodeStream(t)) : typeof e == "number" ? n = e : typeof e == "string" && (n = ee.resolve(t.stack, e)), typeof n == "bigint" && (n = Number(n)), typeof n != "number")
        throw t.err(`Wrong length: ${n}`);
      return n;
    }
  };
}, st = {
  BITS: 32,
  FULL_MASK: -1 >>> 0,
  // 1<<32 will overflow
  len: (e) => Math.ceil(e / 32),
  create: (e) => new Uint32Array(st.len(e)),
  clean: (e) => e.fill(0),
  debug: (e) => Array.from(e).map((t) => (t >>> 0).toString(2).padStart(32, "0")),
  checkLen: (e, t) => {
    if (st.len(t) !== e.length)
      throw new Error(`wrong length=${e.length}. Expected: ${st.len(t)}`);
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
    st.checkLen(e, t);
    const { FULL_MASK: r, BITS: o } = st, i = o - t % o, s = i ? r >>> i << i : r, c = [];
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
  rangeDebug: (e, t, n = !1) => `[${st.range(st.indices(e, t, n)).map((r) => `(${r.pos}/${r.length})`).join(", ")}]`,
  setRange: (e, t, n, r, o = !0) => {
    st.chunkLen(t, n, r);
    const { FULL_MASK: i, BITS: s } = st, c = n % s ? Math.floor(n / s) : void 0, a = n + r, u = a % s ? Math.floor(a / s) : void 0;
    if (c !== void 0 && c === u)
      return st.set(e, c, i >>> s - r << s - r - n, o);
    if (c !== void 0 && !st.set(e, c, i >>> n % s, o))
      return !1;
    const f = c !== void 0 ? c + 1 : n / s, d = u !== void 0 ? u : a / s;
    for (let l = f; l < d; l++)
      if (!st.set(e, l, i, o))
        return !1;
    return !(u !== void 0 && c !== u && !st.set(e, u, i << s - a % s, o));
  }
}, ee = {
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
    const r = new Error(`${e}(${ee.path(t)}): ${typeof n == "string" ? n : n.message}`);
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
class Wo {
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
    this.data = t, this.opts = n, this.stack = r, this.parent = o, this.parentOffset = i, this.view = ac(t);
  }
  /** Internal method for pointers. */
  _enablePointers() {
    if (this.parent)
      return this.parent._enablePointers();
    this.bs || (this.bs = st.create(this.data.length), st.setRange(this.bs, this.data.length, 0, this.pos, this.opts.allowMultipleReads));
  }
  markBytesBS(t, n) {
    return this.parent ? this.parent.markBytesBS(this.parentOffset + t, n) : !n || !this.bs ? !0 : st.setRange(this.bs, this.data.length, t, n, !1);
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
    return ee.pushObj(this.stack, t, n);
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
        const t = st.indices(this.bs, this.data.length, !0);
        if (t.length) {
          const n = st.range(t).map(({ pos: r, length: o }) => `(${r}/${o})[${S.encode(this.data.subarray(r, r + o))}]`).join(", ");
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
    return ee.err("Reader", this.stack, t);
  }
  offsetReader(t) {
    if (t > this.data.length)
      throw this.err("offsetReader: Unexpected end of buffer");
    return new Wo(this.absBytes(t), this.opts, this.stack, this, t);
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
    if (!Bt(t))
      throw this.err(`find: needle is not bytes! ${t}`);
    if (this.bitPos)
      throw this.err("findByte: bitPos not empty");
    if (!t.length)
      throw this.err("find: needle is empty");
    for (let r = n; (r = this.data.indexOf(t[0], r)) !== -1; r++) {
      if (r === -1 || this.data.length - r < t.length)
        return;
      if (Me(t, this.data.subarray(r, r + t.length)))
        return r;
    }
  }
}
class Eu {
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
    this.stack = t, this.view = ac(this.viewBuf);
  }
  pushObj(t, n) {
    return ee.pushObj(this.stack, t, n);
  }
  writeView(t, n) {
    if (this.finished)
      throw this.err("buffer: finished");
    if (!zt(t) || t > 8)
      throw new Error(`wrong writeView length=${t}`);
    n(this.view), this.bytes(this.viewBuf.slice(0, t)), this.viewBuf.fill(0);
  }
  // User methods
  err(t) {
    if (this.finished)
      throw this.err("buffer: finished");
    return ee.err("Reader", this.stack, t);
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
const co = (e) => Uint8Array.from(e).reverse();
function Su(e, t, n) {
  if (n) {
    const r = 2n ** (t - 1n);
    if (e < -r || e >= r)
      throw new Error(`value out of signed bounds. Expected ${-r} <= ${e} < ${r}`);
  } else if (0n > e || e >= 2n ** t)
    throw new Error(`value out of unsigned bounds. Expected 0 <= ${e} < ${2n ** t}`);
}
function fc(e) {
  return {
    // NOTE: we cannot export validate here, since it is likely mistake.
    encodeStream: e.encodeStream,
    decodeStream: e.decodeStream,
    size: e.size,
    encode: (t) => {
      const n = new Eu();
      return e.encodeStream(n, t), n.finish();
    },
    decode: (t, n = {}) => {
      const r = new Wo(t, n), o = e.decodeStream(r);
      return r.finish(), o;
    }
  };
}
function xt(e, t) {
  if (!Lt(e))
    throw new Error(`validate: invalid inner value ${e}`);
  if (typeof t != "function")
    throw new Error("validate: fn should be function");
  return fc({
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
const bt = (e) => {
  const t = fc(e);
  return e.validate ? xt(t, e.validate) : t;
}, Ar = (e) => An(e) && typeof e.decode == "function" && typeof e.encode == "function";
function Lt(e) {
  return An(e) && Ar(e) && typeof e.encodeStream == "function" && typeof e.decodeStream == "function" && (e.size === void 0 || zt(e.size));
}
function Tu() {
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
      if (!An(e))
        throw new Error(`expected plain object, got ${e}`);
      return Object.entries(e);
    }
  };
}
const vu = {
  encode: (e) => {
    if (typeof e != "bigint")
      throw new Error(`expected bigint, got ${typeof e}`);
    if (e > BigInt(Number.MAX_SAFE_INTEGER))
      throw new Error(`element bigger than MAX_SAFE_INTEGER=${e}`);
    return Number(e);
  },
  decode: (e) => {
    if (!zt(e))
      throw new Error("element is not a safe integer");
    return BigInt(e);
  }
};
function ku(e) {
  if (!An(e))
    throw new Error("plain object expected");
  return {
    encode: (t) => {
      if (!zt(t) || !(t in e))
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
function Au(e, t = !1) {
  if (!zt(e))
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
function Iu(e) {
  if (!Array.isArray(e))
    throw new Error(`expected array, got ${typeof e}`);
  for (const t of e)
    if (!Ar(t))
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
const dc = (e) => {
  if (!Ar(e))
    throw new Error("BaseCoder expected");
  return { encode: e.decode, decode: e.encode };
}, Ir = { dict: Tu, numberBigint: vu, tsEnum: ku, decimal: Au, match: Iu, reverse: dc }, zo = (e, t = !1, n = !1, r = !0) => {
  if (!zt(e))
    throw new Error(`bigint/size: wrong value ${e}`);
  if (typeof t != "boolean")
    throw new Error(`bigint/le: expected boolean, got ${typeof t}`);
  if (typeof n != "boolean")
    throw new Error(`bigint/signed: expected boolean, got ${typeof n}`);
  if (typeof r != "boolean")
    throw new Error(`bigint/sized: expected boolean, got ${typeof r}`);
  const o = BigInt(e), i = 2n ** (8n * o - 1n);
  return bt({
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
      const c = s.bytes(r ? e : Math.min(e, s.leftBytes)), a = t ? c : co(c);
      let u = 0n;
      for (let f = 0; f < a.length; f++)
        u |= BigInt(a[f]) << 8n * BigInt(f);
      return n && u & i && (u = (u ^ i) - i), u;
    },
    validate: (s) => {
      if (typeof s != "bigint")
        throw new Error(`bigint: invalid value: ${s}`);
      return Su(s, 8n * o, !!n), s;
    }
  });
}, lc = /* @__PURE__ */ zo(32, !1), jn = /* @__PURE__ */ zo(8, !0), Bu = /* @__PURE__ */ zo(8, !0, !0), Ou = (e, t) => bt({
  size: e,
  encodeStream: (n, r) => n.writeView(e, (o) => t.write(o, r)),
  decodeStream: (n) => n.readView(e, t.read),
  validate: (n) => {
    if (typeof n != "number")
      throw new Error(`viewCoder: expected number, got ${typeof n}`);
    return t.validate && t.validate(n), n;
  }
}), In = (e, t, n) => {
  const r = e * 8, o = 2 ** (r - 1), i = (a) => {
    if (!zt(a))
      throw new Error(`sintView: value is not safe integer: ${a}`);
    if (a < -o || a >= o)
      throw new Error(`sintView: value out of bounds. Expected ${-o} <= ${a} < ${o}`);
  }, s = 2 ** r, c = (a) => {
    if (!zt(a))
      throw new Error(`uintView: value is not safe integer: ${a}`);
    if (0 > a || a >= s)
      throw new Error(`uintView: value out of bounds. Expected 0 <= ${a} < ${s}`);
  };
  return Ou(e, {
    write: n.write,
    read: n.read,
    validate: t ? i : c
  });
}, K = /* @__PURE__ */ In(4, !1, {
  read: (e, t) => e.getUint32(t, !0),
  write: (e, t) => e.setUint32(0, t, !0)
}), Uu = /* @__PURE__ */ In(4, !1, {
  read: (e, t) => e.getUint32(t, !1),
  write: (e, t) => e.setUint32(0, t, !1)
}), Ce = /* @__PURE__ */ In(4, !0, {
  read: (e, t) => e.getInt32(t, !0),
  write: (e, t) => e.setInt32(0, t, !0)
}), Ni = /* @__PURE__ */ In(2, !1, {
  read: (e, t) => e.getUint16(t, !0),
  write: (e, t) => e.setUint16(0, t, !0)
}), ce = /* @__PURE__ */ In(1, !1, {
  read: (e, t) => e.getUint8(t),
  write: (e, t) => e.setUint8(0, t)
}), q = (e, t = !1) => {
  if (typeof t != "boolean")
    throw new Error(`bytes/le: expected boolean, got ${typeof t}`);
  const n = uc(e), r = Bt(e);
  return bt({
    size: typeof e == "number" ? e : void 0,
    encodeStream: (o, i) => {
      r || n.encodeStream(o, i.length), o.bytes(t ? co(i) : i), r && o.bytes(e);
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
      return t ? co(i) : i;
    },
    validate: (o) => {
      if (!Bt(o))
        throw new Error(`bytes: invalid value ${o}`);
      return o;
    }
  });
};
function Nu(e, t) {
  if (!Lt(t))
    throw new Error(`prefix: invalid inner value ${t}`);
  return he(q(e), dc(t));
}
const jo = (e, t = !1) => xt(he(q(e, t), yu), (n) => {
  if (typeof n != "string")
    throw new Error(`expected string, got ${typeof n}`);
  return n;
}), Pu = (e, t = { isLE: !1, with0x: !1 }) => {
  let n = he(q(e, t.isLE), S);
  const r = t.with0x;
  if (typeof r != "boolean")
    throw new Error(`hex/with0x: expected boolean, got ${typeof r}`);
  return r && (n = he(n, {
    encode: (o) => `0x${o}`,
    decode: (o) => {
      if (!o.startsWith("0x"))
        throw new Error("hex(with0x=true).encode input should start with 0x");
      return o.slice(2);
    }
  })), n;
};
function he(e, t) {
  if (!Lt(e))
    throw new Error(`apply: invalid inner value ${e}`);
  if (!Ar(t))
    throw new Error(`apply: invalid base value ${e}`);
  return bt({
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
const Ru = (e, t = !1) => {
  if (!Bt(e))
    throw new Error(`flag/flagValue: expected Uint8Array, got ${typeof e}`);
  if (typeof t != "boolean")
    throw new Error(`flag/xor: expected boolean, got ${typeof t}`);
  return bt({
    size: e.length,
    encodeStream: (n, r) => {
      !!r !== t && n.bytes(e);
    },
    decodeStream: (n) => {
      let r = n.leftBytes >= e.length;
      return r && (r = Me(n.bytes(e.length, !0), e), r && n.bytes(e.length)), r !== t;
    },
    validate: (n) => {
      if (n !== void 0 && typeof n != "boolean")
        throw new Error(`flag: expected boolean value or undefined, got ${typeof n}`);
      return n;
    }
  });
};
function Cu(e, t, n) {
  if (!Lt(t))
    throw new Error(`flagged: invalid inner value ${t}`);
  return bt({
    encodeStream: (r, o) => {
      ee.resolve(r.stack, e) && t.encodeStream(r, o);
    },
    decodeStream: (r) => {
      let o = !1;
      if (o = !!ee.resolve(r.stack, e), o)
        return t.decodeStream(r);
    }
  });
}
function Go(e, t, n = !0) {
  if (!Lt(e))
    throw new Error(`magic: invalid inner value ${e}`);
  if (typeof n != "boolean")
    throw new Error(`magic: expected boolean, got ${typeof n}`);
  return bt({
    size: e.size,
    encodeStream: (r, o) => e.encodeStream(r, t),
    decodeStream: (r) => {
      const o = e.decodeStream(r);
      if (n && typeof o != "object" && o !== t || Bt(t) && !Me(t, o))
        throw r.err(`magic: invalid value: ${o} !== ${t}`);
    },
    validate: (r) => {
      if (r !== void 0)
        throw new Error(`magic: wrong value=${typeof r}`);
      return r;
    }
  });
}
function hc(e) {
  let t = 0;
  for (const n of e) {
    if (n.size === void 0)
      return;
    if (!zt(n.size))
      throw new Error(`sizeof: wrong element size=${t}`);
    t += n.size;
  }
  return t;
}
function ut(e) {
  if (!An(e))
    throw new Error(`struct: expected plain object, got ${e}`);
  for (const t in e)
    if (!Lt(e[t]))
      throw new Error(`struct: field ${t} is not CoderType`);
  return bt({
    size: hc(Object.values(e)),
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
function $u(e) {
  if (!Array.isArray(e))
    throw new Error(`Packed.Tuple: got ${typeof e} instead of array`);
  for (let t = 0; t < e.length; t++)
    if (!Lt(e[t]))
      throw new Error(`tuple: field ${t} is not CoderType`);
  return bt({
    size: hc(e),
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
  if (!Lt(t))
    throw new Error(`array: invalid inner value ${t}`);
  const n = uc(typeof e == "string" ? `../${e}` : e);
  return bt({
    size: typeof e == "number" && t.size ? e * t.size : void 0,
    encodeStream: (r, o) => {
      const i = r;
      i.pushObj(o, (s) => {
        Bt(e) || n.encodeStream(r, o.length);
        for (let c = 0; c < o.length; c++)
          s(`${c}`, () => {
            const a = o[c], u = r.pos;
            if (t.encodeStream(r, a), Bt(e)) {
              if (e.length > i.pos - u)
                return;
              const f = i.finish(!1).subarray(u, i.pos);
              if (Me(f.subarray(0, e.length), e))
                throw i.err(`array: inner element encoding same as separator. elm=${a} data=${f}`);
            }
          });
      }), Bt(e) && r.bytes(e);
    },
    decodeStream: (r) => {
      const o = [];
      return r.pushObj(o, (i) => {
        if (e === null)
          for (let s = 0; !r.isEnd() && (i(`${s}`, () => o.push(t.decodeStream(r))), !(t.size && r.leftBytes < t.size)); s++)
            ;
        else if (Bt(e))
          for (let s = 0; ; s++) {
            if (Me(r.bytes(e.length, !0), e)) {
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
const en = Mt.Point, Pi = en.Fn, pc = en.Fn.ORDER, Bn = (e) => e % 2n === 0n, z = Mo.isBytes, se = Mo.concatBytes, et = Mo.equalBytes, gc = (e) => au(pt(e)), oe = (...e) => pt(pt(se(...e))), ao = Ut.utils.randomSecretKey, qo = Ut.getPublicKey, wc = Mt.getPublicKey, Ri = (e) => e.r < pc / 2n;
function Lu(e, t, n = !1) {
  let r = Mt.Signature.fromBytes(Mt.sign(e, t, { prehash: !1 }));
  if (n && !Ri(r)) {
    const o = new Uint8Array(32);
    let i = 0;
    for (; !Ri(r); )
      if (o.set(K.encode(i++)), r = Mt.Signature.fromBytes(Mt.sign(e, t, { prehash: !1, extraEntropy: o })), i > 4294967295)
        throw new Error("lowR counter overflow: report the error");
  }
  return r.toBytes("der");
}
const Ci = Ut.sign, Yo = Ut.utils.taggedHash, Et = {
  ecdsa: 0,
  schnorr: 1
};
function We(e, t) {
  const n = e.length;
  if (t === Et.ecdsa) {
    if (n === 32)
      throw new Error("Expected non-Schnorr key");
    return en.fromBytes(e), e;
  } else if (t === Et.schnorr) {
    if (n !== 32)
      throw new Error("Expected 32-byte Schnorr key");
    return Ut.utils.lift_x(qt(e)), e;
  } else
    throw new Error("Unknown key type");
}
function yc(e, t) {
  const r = Ut.utils.taggedHash("TapTweak", e, t), o = qt(r);
  if (o >= pc)
    throw new Error("tweak higher than curve order");
  return o;
}
function _u(e, t = Uint8Array.of()) {
  const n = Ut.utils, r = qt(e), o = en.BASE.multiply(r), i = Bn(o.y) ? r : Pi.neg(r), s = n.pointToBytes(o), c = yc(s, t);
  return vn(Pi.add(i, c), 32);
}
function uo(e, t) {
  const n = Ut.utils, r = yc(e, t), i = n.lift_x(qt(e)).add(en.BASE.multiply(r)), s = Bn(i.y) ? 0 : 1;
  return [n.pointToBytes(i), s];
}
const Zo = pt(en.BASE.toBytes(!1)), ze = {
  bech32: "bc",
  pubKeyHash: 0,
  scriptHash: 5,
  wif: 128
}, Cn = {
  bech32: "tb",
  pubKeyHash: 111,
  scriptHash: 196,
  wif: 239
};
function sr(e, t) {
  if (!z(e) || !z(t))
    throw new Error(`cmp: wrong type a=${typeof e} b=${typeof t}`);
  const n = Math.min(e.length, t.length);
  for (let r = 0; r < n; r++)
    if (e[r] != t[r])
      return Math.sign(e[r] - t[r]);
  return Math.sign(e.length - t.length);
}
function mc(e) {
  const t = {};
  for (const n in e) {
    if (t[e[n]] !== void 0)
      throw new Error("duplicate key");
    t[e[n]] = n;
  }
  return t;
}
const it = {
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
}, Vu = mc(it);
function Xo(e = 6, t = !1) {
  return bt({
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
function Du(e, t = 4, n = !0) {
  if (typeof e == "number")
    return e;
  if (z(e))
    try {
      const r = Xo(t, n).decode(e);
      return r > Number.MAX_SAFE_INTEGER ? void 0 : Number(r);
    } catch {
      return;
    }
}
const C = bt({
  encodeStream: (e, t) => {
    for (let n of t) {
      if (typeof n == "string") {
        if (it[n] === void 0)
          throw new Error(`Unknown opcode=${n}`);
        e.byte(it[n]);
        continue;
      } else if (typeof n == "number") {
        if (n === 0) {
          e.byte(0);
          continue;
        } else if (1 <= n && n <= 16) {
          e.byte(it.OP_1 - 1 + n);
          continue;
        }
      }
      if (typeof n == "number" && (n = Xo().encode(BigInt(n))), !z(n))
        throw new Error(`Wrong Script OP=${n} (${typeof n})`);
      const r = n.length;
      r < it.PUSHDATA1 ? e.byte(r) : r <= 255 ? (e.byte(it.PUSHDATA1), e.byte(r)) : r <= 65535 ? (e.byte(it.PUSHDATA2), e.bytes(Ni.encode(r))) : (e.byte(it.PUSHDATA4), e.bytes(K.encode(r))), e.bytes(n);
    }
  },
  decodeStream: (e) => {
    const t = [];
    for (; !e.isEnd(); ) {
      const n = e.byte();
      if (it.OP_0 < n && n <= it.PUSHDATA4) {
        let r;
        if (n < it.PUSHDATA1)
          r = n;
        else if (n === it.PUSHDATA1)
          r = ce.decodeStream(e);
        else if (n === it.PUSHDATA2)
          r = Ni.decodeStream(e);
        else if (n === it.PUSHDATA4)
          r = K.decodeStream(e);
        else
          throw new Error("Should be not possible");
        t.push(e.bytes(r));
      } else if (n === 0)
        t.push(0);
      else if (it.OP_1 <= n && n <= it.OP_16)
        t.push(n - (it.OP_1 - 1));
      else {
        const r = Vu[n];
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
}, Br = bt({
  encodeStream: (e, t) => {
    if (typeof t == "number" && (t = BigInt(t)), 0n <= t && t <= 252n)
      return e.byte(Number(t));
    for (const [n, r, o, i] of Object.values($i))
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
    const [n, r, o] = $i[t];
    let i = 0n;
    for (let s = 0; s < r; s++)
      i |= BigInt(e.byte()) << 8n * BigInt(s);
    if (i < o)
      throw e.err(`Wrong CompactSize(${8 * r})`);
    return i;
  }
}), _t = he(Br, Ir.numberBigint), Rt = q(Br), gn = mt(_t, Rt), cr = (e) => mt(Br, e), xc = ut({
  txid: q(32, !0),
  // hash(prev_tx),
  index: K,
  // output number of previous tx
  finalScriptSig: Rt,
  // btc merges input and output script, executes it. If ok = tx passes
  sequence: K
  // ?
}), ve = ut({ amount: jn, script: Rt }), Hu = ut({
  version: Ce,
  segwitFlag: Ru(new Uint8Array([0, 1])),
  inputs: cr(xc),
  outputs: cr(ve),
  witnesses: Cu("segwitFlag", mt("inputs/length", gn)),
  // < 500000000	Block number at which this transaction is unlocked
  // >= 500000000	UNIX timestamp at which this transaction is unlocked
  // Handled as part of PSBTv2
  lockTime: K
});
function Fu(e) {
  if (e.segwitFlag && e.witnesses && !e.witnesses.length)
    throw new Error("Segwit flag with empty witnesses array");
  return e;
}
const _e = xt(Hu, Fu), an = ut({
  version: Ce,
  inputs: cr(xc),
  outputs: cr(ve),
  lockTime: K
}), fo = xt(q(null), (e) => We(e, Et.ecdsa)), ar = xt(q(32), (e) => We(e, Et.schnorr)), Li = xt(q(null), (e) => {
  if (e.length !== 64 && e.length !== 65)
    throw new Error("Schnorr signature should be 64 or 65 bytes long");
  return e;
}), Or = ut({
  fingerprint: Uu,
  path: mt(null, K)
}), bc = ut({
  hashes: mt(_t, q(32)),
  der: Or
}), Ku = q(78), Mu = ut({ pubKey: ar, leafHash: q(32) }), Wu = ut({
  version: ce,
  // With parity :(
  internalKey: q(32),
  merklePath: mt(null, q(32))
}), Wt = xt(Wu, (e) => {
  if (e.merklePath.length > 128)
    throw new Error("TaprootControlBlock: merklePath should be of length 0..128 (inclusive)");
  return e;
}), zu = mt(null, ut({
  depth: ce,
  version: ce,
  script: Rt
})), tt = q(null), _i = q(20), rn = q(32), Qo = {
  unsignedTx: [0, !1, an, [0], [0], !1],
  xpub: [1, Ku, Or, [], [0, 2], !1],
  txVersion: [2, !1, K, [2], [2], !1],
  fallbackLocktime: [3, !1, K, [], [2], !1],
  inputCount: [4, !1, _t, [2], [2], !1],
  outputCount: [5, !1, _t, [2], [2], !1],
  txModifiable: [6, !1, ce, [], [2], !1],
  // TODO: bitfield
  version: [251, !1, K, [], [0, 2], !1],
  proprietary: [252, tt, tt, [], [0, 2], !1]
}, Ur = {
  nonWitnessUtxo: [0, !1, _e, [], [0, 2], !1],
  witnessUtxo: [1, !1, ve, [], [0, 2], !1],
  partialSig: [2, fo, tt, [], [0, 2], !1],
  sighashType: [3, !1, K, [], [0, 2], !1],
  redeemScript: [4, !1, tt, [], [0, 2], !1],
  witnessScript: [5, !1, tt, [], [0, 2], !1],
  bip32Derivation: [6, fo, Or, [], [0, 2], !1],
  finalScriptSig: [7, !1, tt, [], [0, 2], !1],
  finalScriptWitness: [8, !1, gn, [], [0, 2], !1],
  porCommitment: [9, !1, tt, [], [0, 2], !1],
  ripemd160: [10, _i, tt, [], [0, 2], !1],
  sha256: [11, rn, tt, [], [0, 2], !1],
  hash160: [12, _i, tt, [], [0, 2], !1],
  hash256: [13, rn, tt, [], [0, 2], !1],
  txid: [14, !1, rn, [2], [2], !0],
  index: [15, !1, K, [2], [2], !0],
  sequence: [16, !1, K, [], [2], !0],
  requiredTimeLocktime: [17, !1, K, [], [2], !1],
  requiredHeightLocktime: [18, !1, K, [], [2], !1],
  tapKeySig: [19, !1, Li, [], [0, 2], !1],
  tapScriptSig: [20, Mu, Li, [], [0, 2], !1],
  tapLeafScript: [21, Wt, tt, [], [0, 2], !1],
  tapBip32Derivation: [22, rn, bc, [], [0, 2], !1],
  tapInternalKey: [23, !1, ar, [], [0, 2], !1],
  tapMerkleRoot: [24, !1, rn, [], [0, 2], !1],
  proprietary: [252, tt, tt, [], [0, 2], !1]
}, ju = [
  "txid",
  "sequence",
  "index",
  "witnessUtxo",
  "nonWitnessUtxo",
  "finalScriptSig",
  "finalScriptWitness",
  "unknown"
], Gu = [
  "partialSig",
  "finalScriptSig",
  "finalScriptWitness",
  "tapKeySig",
  "tapScriptSig"
], wn = {
  redeemScript: [0, !1, tt, [], [0, 2], !1],
  witnessScript: [1, !1, tt, [], [0, 2], !1],
  bip32Derivation: [2, fo, Or, [], [0, 2], !1],
  amount: [3, !1, Bu, [2], [2], !0],
  script: [4, !1, tt, [2], [2], !0],
  tapInternalKey: [5, !1, ar, [], [0, 2], !1],
  tapTree: [6, !1, zu, [], [0, 2], !1],
  tapBip32Derivation: [7, ar, bc, [], [0, 2], !1],
  proprietary: [252, tt, tt, [], [0, 2], !1]
}, qu = [], Vi = mt(cc, ut({
  //  <key> := <keylen> <keytype> <keydata> WHERE keylen = len(keytype)+len(keydata)
  key: Nu(_t, ut({ type: _t, key: q(null) })),
  //  <value> := <valuelen> <valuedata>
  value: q(_t)
}));
function lo(e) {
  const [t, n, r, o, i, s] = e;
  return { type: t, kc: n, vc: r, reqInc: o, allowInc: i, silentIgnore: s };
}
ut({ type: _t, key: q(null) });
function Jo(e) {
  const t = {};
  for (const n in e) {
    const [r, o, i] = e[n];
    t[r] = [n, o, i];
  }
  return bt({
    encodeStream: (n, r) => {
      let o = [];
      for (const i in e) {
        const s = r[i];
        if (s === void 0)
          continue;
        const [c, a, u] = e[i];
        if (!a)
          o.push({ key: { type: c, key: Y }, value: u.encode(s) });
        else {
          const f = s.map(([d, l]) => [
            a.encode(d),
            u.encode(l)
          ]);
          f.sort((d, l) => sr(d[0], l[0]));
          for (const [d, l] of f)
            o.push({ key: { key: d, type: c }, value: l });
        }
      }
      if (r.unknown) {
        r.unknown.sort((i, s) => sr(i[0].key, s[0].key));
        for (const [i, s] of r.unknown)
          o.push({ key: i, value: s });
      }
      Vi.encodeStream(n, o);
    },
    decodeStream: (n) => {
      const r = Vi.decodeStream(n), o = {}, i = {};
      for (const s of r) {
        let c = "unknown", a = s.key.key, u = s.value;
        if (t[s.key.type]) {
          const [f, d, l] = t[s.key.type];
          if (c = f, !d && a.length)
            throw new Error(`PSBT: Non-empty key for ${c} (key=${S.encode(a)} value=${S.encode(u)}`);
          if (a = d ? d.decode(a) : void 0, u = l.decode(u), !d) {
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
const ti = xt(Jo(Ur), (e) => {
  if (e.finalScriptWitness && !e.finalScriptWitness.length)
    throw new Error("validateInput: empty finalScriptWitness");
  if (e.partialSig && !e.partialSig.length)
    throw new Error("Empty partialSig");
  if (e.partialSig)
    for (const [t] of e.partialSig)
      We(t, Et.ecdsa);
  if (e.bip32Derivation)
    for (const [t] of e.bip32Derivation)
      We(t, Et.ecdsa);
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
}), ei = xt(Jo(wn), (e) => {
  if (e.bip32Derivation)
    for (const [t] of e.bip32Derivation)
      We(t, Et.ecdsa);
  return e;
}), Ec = xt(Jo(Qo), (e) => {
  if ((e.version || 0) === 0) {
    if (!e.unsignedTx)
      throw new Error("PSBTv0: missing unsignedTx");
    for (const n of e.unsignedTx.inputs)
      if (n.finalScriptSig && n.finalScriptSig.length)
        throw new Error("PSBTv0: input scriptSig found in unsignedTx");
  }
  return e;
}), Yu = ut({
  magic: Go(jo(new Uint8Array([255])), "psbt"),
  global: Ec,
  inputs: mt("global/unsignedTx/inputs/length", ti),
  outputs: mt(null, ei)
}), Zu = ut({
  magic: Go(jo(new Uint8Array([255])), "psbt"),
  global: Ec,
  inputs: mt("global/inputCount", ti),
  outputs: mt("global/outputCount", ei)
});
ut({
  magic: Go(jo(new Uint8Array([255])), "psbt"),
  items: mt(null, he(mt(cc, $u([Pu(_t), q(Br)])), Ir.dict()))
});
function Fr(e, t, n) {
  for (const r in n) {
    if (r === "unknown" || !t[r])
      continue;
    const { allowInc: o } = lo(t[r]);
    if (!o.includes(e))
      throw new Error(`PSBTv${e}: field ${r} is not allowed`);
  }
  for (const r in t) {
    const { reqInc: o } = lo(t[r]);
    if (o.includes(e) && n[r] === void 0)
      throw new Error(`PSBTv${e}: missing required field ${r}`);
  }
}
function Di(e, t, n) {
  const r = {};
  for (const o in n) {
    const i = o;
    if (i !== "unknown") {
      if (!t[i])
        continue;
      const { allowInc: s, silentIgnore: c } = lo(t[i]);
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
function Sc(e) {
  const t = e && e.global && e.global.version || 0;
  Fr(t, Qo, e.global);
  for (const s of e.inputs)
    Fr(t, Ur, s);
  for (const s of e.outputs)
    Fr(t, wn, s);
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
function ho(e, t, n, r, o) {
  const i = { ...n, ...t };
  for (const s in e) {
    const c = s, [a, u, f] = e[c], d = r && !r.includes(s);
    if (t[s] === void 0 && s in t) {
      if (d)
        throw new Error(`Cannot remove signed field=${s}`);
      delete i[s];
    } else if (u) {
      const l = n && n[s] ? n[s] : [];
      let h = t[c];
      if (h) {
        if (!Array.isArray(h))
          throw new Error(`keyMap(${s}): KV pairs should be [k, v][]`);
        h = h.map((y) => {
          if (y.length !== 2)
            throw new Error(`keyMap(${s}): KV pairs should be [k, v][]`);
          return [
            typeof y[0] == "string" ? u.decode(S.decode(y[0])) : y[0],
            typeof y[1] == "string" ? f.decode(S.decode(y[1])) : y[1]
          ];
        });
        const p = {}, g = (y, x, b) => {
          if (p[y] === void 0) {
            p[y] = [x, b];
            return;
          }
          const v = S.encode(f.encode(p[y][1])), A = S.encode(f.encode(b));
          if (v !== A)
            throw new Error(`keyMap(${c}): same key=${y} oldVal=${v} newVal=${A}`);
        };
        for (const [y, x] of l) {
          const b = S.encode(u.encode(y));
          g(b, y, x);
        }
        for (const [y, x] of h) {
          const b = S.encode(u.encode(y));
          if (x === void 0) {
            if (d)
              throw new Error(`Cannot remove signed field=${c}/${y}`);
            delete p[b];
          } else
            g(b, y, x);
        }
        i[c] = Object.values(p);
      }
    } else if (typeof i[s] == "string")
      i[s] = f.decode(S.decode(i[s]));
    else if (d && s in t && n && n[s] !== void 0 && !et(f.encode(t[s]), f.encode(n[s])))
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
const Hi = xt(Yu, Sc), Fi = xt(Zu, Sc), Xu = {
  encode(e) {
    if (!(e.length !== 2 || e[0] !== 1 || !z(e[1]) || S.encode(e[1]) !== "4e73"))
      return { type: "p2a", script: C.encode(e) };
  },
  decode: (e) => {
    if (e.type === "p2a")
      return [1, S.decode("4e73")];
  }
};
function $e(e, t) {
  try {
    return We(e, t), !0;
  } catch {
    return !1;
  }
}
const Qu = {
  encode(e) {
    if (!(e.length !== 2 || !z(e[0]) || !$e(e[0], Et.ecdsa) || e[1] !== "CHECKSIG"))
      return { type: "pk", pubkey: e[0] };
  },
  decode: (e) => e.type === "pk" ? [e.pubkey, "CHECKSIG"] : void 0
}, Ju = {
  encode(e) {
    if (!(e.length !== 5 || e[0] !== "DUP" || e[1] !== "HASH160" || !z(e[2])) && !(e[3] !== "EQUALVERIFY" || e[4] !== "CHECKSIG"))
      return { type: "pkh", hash: e[2] };
  },
  decode: (e) => e.type === "pkh" ? ["DUP", "HASH160", e.hash, "EQUALVERIFY", "CHECKSIG"] : void 0
}, tf = {
  encode(e) {
    if (!(e.length !== 3 || e[0] !== "HASH160" || !z(e[1]) || e[2] !== "EQUAL"))
      return { type: "sh", hash: e[1] };
  },
  decode: (e) => e.type === "sh" ? ["HASH160", e.hash, "EQUAL"] : void 0
}, ef = {
  encode(e) {
    if (!(e.length !== 2 || e[0] !== 0 || !z(e[1])) && e[1].length === 32)
      return { type: "wsh", hash: e[1] };
  },
  decode: (e) => e.type === "wsh" ? [0, e.hash] : void 0
}, nf = {
  encode(e) {
    if (!(e.length !== 2 || e[0] !== 0 || !z(e[1])) && e[1].length === 20)
      return { type: "wpkh", hash: e[1] };
  },
  decode: (e) => e.type === "wpkh" ? [0, e.hash] : void 0
}, rf = {
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
        if (!z(i))
          return;
      return { type: "ms", m: n, pubkeys: o };
    }
  },
  // checkmultisig(n, ..pubkeys, m)
  decode: (e) => e.type === "ms" ? [e.m, ...e.pubkeys, e.pubkeys.length, "CHECKMULTISIG"] : void 0
}, of = {
  encode(e) {
    if (!(e.length !== 2 || e[0] !== 1 || !z(e[1])))
      return { type: "tr", pubkey: e[1] };
  },
  decode: (e) => e.type === "tr" ? [1, e.pubkey] : void 0
}, sf = {
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
      if (!z(o))
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
}, cf = {
  encode(e) {
    const t = e.length - 1;
    if (e[t] !== "NUMEQUAL" || e[1] !== "CHECKSIG")
      return;
    const n = [], r = Du(e[t - 1]);
    if (typeof r == "number") {
      for (let o = 0; o < t - 1; o++) {
        const i = e[o];
        if (o & 1) {
          if (i !== (o === 1 ? "CHECKSIG" : "CHECKSIGADD"))
            throw new Error("OutScript.encode/tr_ms: wrong element");
          continue;
        }
        if (!z(i))
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
}, af = {
  encode(e) {
    return { type: "unknown", script: C.encode(e) };
  },
  decode: (e) => e.type === "unknown" ? C.decode(e.script) : void 0
}, uf = [
  Xu,
  Qu,
  Ju,
  tf,
  ef,
  nf,
  rf,
  of,
  sf,
  cf,
  af
], ff = he(C, Ir.match(uf)), rt = xt(ff, (e) => {
  if (e.type === "pk" && !$e(e.pubkey, Et.ecdsa))
    throw new Error("OutScript/pk: wrong key");
  if ((e.type === "pkh" || e.type === "sh" || e.type === "wpkh") && (!z(e.hash) || e.hash.length !== 20))
    throw new Error(`OutScript/${e.type}: wrong hash`);
  if (e.type === "wsh" && (!z(e.hash) || e.hash.length !== 32))
    throw new Error("OutScript/wsh: wrong hash");
  if (e.type === "tr" && (!z(e.pubkey) || !$e(e.pubkey, Et.schnorr)))
    throw new Error("OutScript/tr: wrong taproot public key");
  if ((e.type === "ms" || e.type === "tr_ns" || e.type === "tr_ms") && !Array.isArray(e.pubkeys))
    throw new Error("OutScript/multisig: wrong pubkeys array");
  if (e.type === "ms") {
    const t = e.pubkeys.length;
    for (const n of e.pubkeys)
      if (!$e(n, Et.ecdsa))
        throw new Error("OutScript/multisig: wrong pubkey");
    if (e.m <= 0 || t > 16 || e.m > t)
      throw new Error("OutScript/multisig: invalid params");
  }
  if (e.type === "tr_ns" || e.type === "tr_ms") {
    for (const t of e.pubkeys)
      if (!$e(t, Et.schnorr))
        throw new Error(`OutScript/${e.type}: wrong pubkey`);
  }
  if (e.type === "tr_ms") {
    const t = e.pubkeys.length;
    if (e.m <= 0 || t > 999 || e.m > t)
      throw new Error("OutScript/tr_ms: invalid params");
  }
  return e;
});
function Ki(e, t) {
  if (!et(e.hash, pt(t)))
    throw new Error("checkScript: wsh wrong witnessScript hash");
  const n = rt.decode(t);
  if (n.type === "tr" || n.type === "tr_ns" || n.type === "tr_ms")
    throw new Error(`checkScript: P2${n.type} cannot be wrapped in P2SH`);
  if (n.type === "wpkh" || n.type === "sh")
    throw new Error(`checkScript: P2${n.type} cannot be wrapped in P2WSH`);
}
function Tc(e, t, n) {
  if (e) {
    const r = rt.decode(e);
    if (r.type === "tr_ns" || r.type === "tr_ms" || r.type === "ms" || r.type == "pk")
      throw new Error(`checkScript: non-wrapped ${r.type}`);
    if (r.type === "sh" && t) {
      if (!et(r.hash, gc(t)))
        throw new Error("checkScript: sh wrong redeemScript hash");
      const o = rt.decode(t);
      if (o.type === "tr" || o.type === "tr_ns" || o.type === "tr_ms")
        throw new Error(`checkScript: P2${o.type} cannot be wrapped in P2SH`);
      if (o.type === "sh")
        throw new Error("checkScript: P2SH cannot be wrapped in P2SH");
    }
    r.type === "wsh" && n && Ki(r, n);
  }
  if (t) {
    const r = rt.decode(t);
    r.type === "wsh" && n && Ki(r, n);
  }
}
function df(e) {
  const t = {};
  for (const n of e) {
    const r = S.encode(n);
    if (t[r])
      throw new Error(`Multisig: non-uniq pubkey: ${e.map(S.encode)}`);
    t[r] = !0;
  }
}
function lf(e, t, n = !1, r) {
  const o = rt.decode(e);
  if (o.type === "unknown" && n)
    return;
  if (!["tr_ns", "tr_ms"].includes(o.type))
    throw new Error(`P2TR: invalid leaf script=${o.type}`);
  const i = o;
  if (!n && i.pubkeys)
    for (const s of i.pubkeys) {
      if (et(s, Zo))
        throw new Error("Unspendable taproot key in leaf script");
      if (et(s, t))
        throw new Error("Using P2TR with leaf script with same key as internal key is not supported");
    }
}
function vc(e) {
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
function po(e, t = []) {
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
    left: po(e.left, [e.right.hash, ...t]),
    right: po(e.right, [e.left.hash, ...t])
  };
}
function go(e) {
  if (!e)
    throw new Error("taprootAddPath: empty tree");
  if (e.type === "leaf")
    return [e];
  if (e.type !== "branch")
    throw new Error(`taprootWalkTree: wrong type=${e}`);
  return [...go(e.left), ...go(e.right)];
}
function wo(e, t, n = !1, r) {
  if (!e)
    throw new Error("taprootHashTree: empty tree");
  if (Array.isArray(e) && e.length === 1 && (e = e[0]), !Array.isArray(e)) {
    const { leafVersion: a, script: u } = e;
    if (e.tapLeafScript || e.tapMerkleRoot && !et(e.tapMerkleRoot, Y))
      throw new Error("P2TR: tapRoot leafScript cannot have tree");
    const f = typeof u == "string" ? S.decode(u) : u;
    if (!z(f))
      throw new Error(`checkScript: wrong script type=${f}`);
    return lf(f, t, n), {
      type: "leaf",
      version: a,
      script: f,
      hash: fn(f, a)
    };
  }
  if (e.length !== 2 && (e = vc(e)), e.length !== 2)
    throw new Error("hashTree: non binary tree!");
  const o = wo(e[0], t, n), i = wo(e[1], t, n);
  let [s, c] = [o.hash, i.hash];
  return sr(c, s) === -1 && ([s, c] = [c, s]), { type: "branch", left: o, right: i, hash: Yo("TapBranch", s, c) };
}
const yn = 192, fn = (e, t = yn) => Yo("TapLeaf", new Uint8Array([t]), Rt.encode(e));
function hf(e, t, n = ze, r = !1, o) {
  if (!e && !t)
    throw new Error("p2tr: should have pubKey or scriptTree (or both)");
  const i = typeof e == "string" ? S.decode(e) : e || Zo;
  if (!$e(i, Et.schnorr))
    throw new Error("p2tr: non-schnorr pubkey");
  if (t) {
    let s = po(wo(t, i, r));
    const c = s.hash, [a, u] = uo(i, c), f = go(s).map((d) => ({
      ...d,
      controlBlock: Wt.encode({
        version: (d.version || yn) + u,
        internalKey: i,
        merklePath: d.path
      })
    }));
    return {
      type: "tr",
      script: rt.encode({ type: "tr", pubkey: a }),
      address: Ie(n).encode({ type: "tr", pubkey: a }),
      // For tests
      tweakedPubkey: a,
      // PSBT stuff
      tapInternalKey: i,
      leaves: f,
      tapLeafScript: f.map((d) => [
        Wt.decode(d.controlBlock),
        se(d.script, new Uint8Array([d.version || yn]))
      ]),
      tapMerkleRoot: c
    };
  } else {
    const s = uo(i, Y)[0];
    return {
      type: "tr",
      script: rt.encode({ type: "tr", pubkey: s }),
      address: Ie(n).encode({ type: "tr", pubkey: s }),
      // For tests
      tweakedPubkey: s,
      // PSBT stuff
      tapInternalKey: i
    };
  }
}
function pf(e, t, n = !1) {
  return n || df(t), {
    type: "tr_ms",
    script: rt.encode({ type: "tr_ms", pubkeys: t, m: e })
  };
}
const kc = wu(pt);
function Ac(e, t) {
  if (t.length < 2 || t.length > 40)
    throw new Error("Witness: invalid length");
  if (e > 16)
    throw new Error("Witness: invalid version");
  if (e === 0 && !(t.length === 20 || t.length === 32))
    throw new Error("Witness: invalid length for version");
}
function Kr(e, t, n = ze) {
  Ac(e, t);
  const r = e === 0 ? so : Re;
  return r.encode(n.bech32, [e].concat(r.toWords(t)));
}
function Mi(e, t) {
  return kc.encode(se(Uint8Array.from(t), e));
}
function Ie(e = ze) {
  return {
    encode(t) {
      const { type: n } = t;
      if (n === "wpkh")
        return Kr(0, t.hash, e);
      if (n === "wsh")
        return Kr(0, t.hash, e);
      if (n === "tr")
        return Kr(1, t.pubkey, e);
      if (n === "pkh")
        return Mi(t.hash, [e.pubKeyHash]);
      if (n === "sh")
        return Mi(t.hash, [e.scriptHash]);
      throw new Error(`Unknown address type=${n}`);
    },
    decode(t) {
      if (t.length < 14 || t.length > 74)
        throw new Error("Invalid address length");
      if (e.bech32 && t.toLowerCase().startsWith(`${e.bech32}1`)) {
        let r;
        try {
          if (r = so.decode(t), r.words[0] !== 0)
            throw new Error(`bech32: wrong version=${r.words[0]}`);
        } catch {
          if (r = Re.decode(t), r.words[0] === 0)
            throw new Error(`bech32m: wrong version=${r.words[0]}`);
        }
        if (r.prefix !== e.bech32)
          throw new Error(`wrong bech32 prefix=${r.prefix}`);
        const [o, ...i] = r.words, s = so.fromWords(i);
        if (Ac(o, s), o === 0 && s.length === 32)
          return { type: "wsh", hash: s };
        if (o === 0 && s.length === 20)
          return { type: "wpkh", hash: s };
        if (o === 1 && s.length === 32)
          return { type: "tr", pubkey: s };
        throw new Error("Unknown witness program");
      }
      const n = kc.decode(t);
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
const $n = new Uint8Array(32), gf = {
  amount: 0xffffffffffffffffn,
  script: Y
}, wf = (e) => Math.ceil(e / 4), yf = 8, mf = 2, xe = 0, ni = 4294967295;
Ir.decimal(yf);
const dn = (e, t) => e === void 0 ? t : e;
function ur(e) {
  if (Array.isArray(e))
    return e.map((t) => ur(t));
  if (z(e))
    return Uint8Array.from(e);
  if (["number", "bigint", "boolean", "string", "undefined"].includes(typeof e))
    return e;
  if (e === null)
    return e;
  if (typeof e == "object")
    return Object.fromEntries(Object.entries(e).map(([t, n]) => [t, ur(n)]));
  throw new Error(`cloneDeep: unknown type=${e} (${typeof e})`);
}
const V = {
  DEFAULT: 0,
  ALL: 1,
  NONE: 2,
  SINGLE: 3,
  ANYONECANPAY: 128
}, Be = {
  DEFAULT: V.DEFAULT,
  ALL: V.ALL,
  NONE: V.NONE,
  SINGLE: V.SINGLE,
  DEFAULT_ANYONECANPAY: V.DEFAULT | V.ANYONECANPAY,
  ALL_ANYONECANPAY: V.ALL | V.ANYONECANPAY,
  NONE_ANYONECANPAY: V.NONE | V.ANYONECANPAY,
  SINGLE_ANYONECANPAY: V.SINGLE | V.ANYONECANPAY
}, xf = mc(Be);
function bf(e, t, n, r = Y) {
  return et(n, t) && (e = _u(e, r), t = qo(e)), { privKey: e, pubKey: t };
}
function be(e) {
  if (e.script === void 0 || e.amount === void 0)
    throw new Error("Transaction/output: script and amount required");
  return { script: e.script, amount: e.amount };
}
function on(e) {
  if (e.txid === void 0 || e.index === void 0)
    throw new Error("Transaction/input: txid and index required");
  return {
    txid: e.txid,
    index: e.index,
    sequence: dn(e.sequence, ni),
    finalScriptSig: dn(e.finalScriptSig, Y)
  };
}
function Mr(e) {
  for (const t in e) {
    const n = t;
    ju.includes(n) || delete e[n];
  }
}
const Wr = ut({ txid: q(32, !0), index: K });
function Ef(e) {
  if (typeof e != "number" || typeof xf[e] != "string")
    throw new Error(`Invalid SigHash=${e}`);
  return e;
}
function Wi(e) {
  const t = e & 31;
  return {
    isAny: !!(e & V.ANYONECANPAY),
    isNone: t === V.NONE,
    isSingle: t === V.SINGLE
  };
}
function Sf(e) {
  if (e !== void 0 && {}.toString.call(e) !== "[object Object]")
    throw new Error(`Wrong object type for transaction options: ${e}`);
  const t = {
    ...e,
    // Defaults
    version: dn(e.version, mf),
    lockTime: dn(e.lockTime, 0),
    PSBTVersion: dn(e.PSBTVersion, 0)
  };
  if (typeof t.allowUnknowInput < "u" && (e.allowUnknownInputs = t.allowUnknowInput), typeof t.allowUnknowOutput < "u" && (e.allowUnknownOutputs = t.allowUnknowOutput), typeof t.lockTime != "number")
    throw new Error("Transaction lock time should be number");
  if (K.encode(t.lockTime), t.PSBTVersion !== 0 && t.PSBTVersion !== 2)
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
function zi(e) {
  if (e.nonWitnessUtxo && e.index !== void 0) {
    const t = e.nonWitnessUtxo.outputs.length - 1;
    if (e.index > t)
      throw new Error(`validateInput: index(${e.index}) not in nonWitnessUtxo`);
    const n = e.nonWitnessUtxo.outputs[e.index];
    if (e.witnessUtxo && (!et(e.witnessUtxo.script, n.script) || e.witnessUtxo.amount !== n.amount))
      throw new Error("validateInput: witnessUtxo different from nonWitnessUtxo");
    if (e.txid) {
      if (e.nonWitnessUtxo.outputs.length - 1 < e.index)
        throw new Error("nonWitnessUtxo: incorect output index");
      const o = Ct.fromRaw(_e.encode(e.nonWitnessUtxo), {
        allowUnknownOutputs: !0,
        disableScriptCheck: !0,
        allowUnknownInputs: !0
      }), i = S.encode(e.txid);
      if (o.isFinal && o.id !== i)
        throw new Error(`nonWitnessUtxo: wrong txid, exp=${i} got=${o.id}`);
    }
  }
  return e;
}
function Gn(e) {
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
function ji(e, t, n, r = !1, o = !1) {
  let { nonWitnessUtxo: i, txid: s } = e;
  typeof i == "string" && (i = S.decode(i)), z(i) && (i = _e.decode(i)), !("nonWitnessUtxo" in e) && i === void 0 && (i = t?.nonWitnessUtxo), typeof s == "string" && (s = S.decode(s)), s === void 0 && (s = t?.txid);
  let c = { ...t, ...e, nonWitnessUtxo: i, txid: s };
  !("nonWitnessUtxo" in e) && c.nonWitnessUtxo === void 0 && delete c.nonWitnessUtxo, c.sequence === void 0 && (c.sequence = ni), c.tapMerkleRoot === null && delete c.tapMerkleRoot, c = ho(Ur, c, t, n, o), ti.encode(c);
  let a;
  return c.nonWitnessUtxo && c.index !== void 0 ? a = c.nonWitnessUtxo.outputs[c.index] : c.witnessUtxo && (a = c.witnessUtxo), a && !r && Tc(a && a.script, c.redeemScript, c.witnessScript), c;
}
function Gi(e, t = !1) {
  let n = "legacy", r = V.ALL;
  const o = Gn(e), i = rt.decode(o.script);
  let s = i.type, c = i;
  const a = [i];
  if (i.type === "tr")
    return r = V.DEFAULT, {
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
      let l = rt.decode(e.redeemScript);
      (l.type === "wpkh" || l.type === "wsh") && (n = "segwit"), a.push(l), c = l, s += `-${l.type}`;
    }
    if (c.type === "wsh") {
      if (!e.witnessScript)
        throw new Error("inputType: wsh without witnessScript");
      let l = rt.decode(e.witnessScript);
      l.type === "wsh" && (n = "segwit"), a.push(l), c = l, s += `-${l.type}`;
    }
    const u = a[a.length - 1];
    if (u.type === "sh" || u.type === "wsh")
      throw new Error("inputType: sh/wsh cannot be terminal type");
    const f = rt.encode(u), d = {
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
let Ct = class qn {
  global = {};
  inputs = [];
  // use getInput()
  outputs = [];
  // use getOutput()
  opts;
  constructor(t = {}) {
    const n = this.opts = Sf(t);
    n.lockTime !== xe && (this.global.fallbackLocktime = n.lockTime), this.global.txVersion = n.version;
  }
  // Import
  static fromRaw(t, n = {}) {
    const r = _e.decode(t), o = new qn({ ...n, version: r.version, lockTime: r.lockTime });
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
      r = Hi.decode(t);
    } catch (d) {
      try {
        r = Fi.decode(t);
      } catch {
        throw d;
      }
    }
    const o = r.global.version || 0;
    if (o !== 0 && o !== 2)
      throw new Error(`Wrong PSBT version=${o}`);
    const i = r.global.unsignedTx, s = o === 0 ? i?.version : r.global.txVersion, c = o === 0 ? i?.lockTime : r.global.fallbackLocktime, a = new qn({ ...n, version: s, lockTime: c, PSBTVersion: o }), u = o === 0 ? i?.inputs.length : r.global.inputCount;
    a.inputs = r.inputs.slice(0, u).map((d, l) => zi({
      finalScriptSig: Y,
      ...r.global.unsignedTx?.inputs[l],
      ...d
    }));
    const f = o === 0 ? i?.outputs.length : r.global.outputCount;
    return a.outputs = r.outputs.slice(0, f).map((d, l) => ({
      ...d,
      ...r.global.unsignedTx?.outputs[l]
    })), a.global = { ...r.global, txVersion: s }, c !== xe && (a.global.fallbackLocktime = c), a;
  }
  toPSBT(t = this.opts.PSBTVersion) {
    if (t !== 0 && t !== 2)
      throw new Error(`Wrong PSBT version=${t}`);
    const n = this.inputs.map((i) => zi(Di(t, Ur, i)));
    for (const i of n)
      i.partialSig && !i.partialSig.length && delete i.partialSig, i.finalScriptSig && !i.finalScriptSig.length && delete i.finalScriptSig, i.finalScriptWitness && !i.finalScriptWitness.length && delete i.finalScriptWitness;
    const r = this.outputs.map((i) => Di(t, wn, i)), o = { ...this.global };
    return t === 0 ? (o.unsignedTx = an.decode(an.encode({
      version: this.version,
      lockTime: this.lockTime,
      inputs: this.inputs.map(on).map((i) => ({
        ...i,
        finalScriptSig: Y
      })),
      outputs: this.outputs.map(be)
    })), delete o.fallbackLocktime, delete o.txVersion) : (o.version = t, o.txVersion = this.version, o.inputCount = this.inputs.length, o.outputCount = this.outputs.length, o.fallbackLocktime && o.fallbackLocktime === xe && delete o.fallbackLocktime), this.opts.bip174jsCompat && (n.length || n.push({}), r.length || r.push({})), (t === 0 ? Hi : Fi).encode({
      global: o,
      inputs: n,
      outputs: r
    });
  }
  // BIP370 lockTime (https://github.com/bitcoin/bips/blob/master/bip-0370.mediawiki#determining-lock-time)
  get lockTime() {
    let t = xe, n = 0, r = xe, o = 0;
    for (const i of this.inputs)
      i.requiredHeightLocktime && (t = Math.max(t, i.requiredHeightLocktime), n++), i.requiredTimeLocktime && (r = Math.max(r, i.requiredTimeLocktime), o++);
    return n && n >= o ? t : r !== xe ? r : this.global.fallbackLocktime || xe;
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
    const n = this.inputs[t].sighashType, r = n === void 0 ? V.DEFAULT : n, o = r === V.DEFAULT ? V.ALL : r & 3;
    return { sigInputs: r & V.ANYONECANPAY, sigOutputs: o };
  }
  // Very nice for debug purposes, but slow. If there is too much inputs/outputs to add, will be quadratic.
  // Some cache will be nice, but there chance to have bugs with cache invalidation
  signStatus() {
    let t = !0, n = !0, r = [], o = [];
    for (let i = 0; i < this.inputs.length; i++) {
      if (this.inputStatus(i) === "unsigned")
        continue;
      const { sigInputs: c, sigOutputs: a } = this.inputSighash(i);
      if (c === V.ANYONECANPAY ? r.push(i) : t = !1, a === V.ALL)
        n = !1;
      else if (a === V.SINGLE)
        o.push(i);
      else if (a !== V.NONE) throw new Error(`Wrong signature hash output type: ${a}`);
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
    const n = this.outputs.map(be);
    t += 4 * _t.encode(this.outputs.length).length;
    for (const r of n)
      t += 32 + 4 * Rt.encode(r.script).length;
    this.hasWitnesses && (t += 2), t += 4 * _t.encode(this.inputs.length).length;
    for (const r of this.inputs)
      t += 160 + 4 * Rt.encode(r.finalScriptSig || Y).length, this.hasWitnesses && r.finalScriptWitness && (t += gn.encode(r.finalScriptWitness).length);
    return t;
  }
  get vsize() {
    return wf(this.weight);
  }
  toBytes(t = !1, n = !1) {
    return _e.encode({
      version: this.version,
      lockTime: this.lockTime,
      inputs: this.inputs.map(on).map((r) => ({
        ...r,
        finalScriptSig: t && r.finalScriptSig || Y
      })),
      outputs: this.outputs.map(be),
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
    return S.encode(oe(this.toBytes(!0)));
  }
  get id() {
    return S.encode(oe(this.toBytes(!0)).reverse());
  }
  // Input stuff
  checkInputIdx(t) {
    if (!Number.isSafeInteger(t) || 0 > t || t >= this.inputs.length)
      throw new Error(`Wrong input index=${t}`);
  }
  getInput(t) {
    return this.checkInputIdx(t), ur(this.inputs[t]);
  }
  get inputsLength() {
    return this.inputs.length;
  }
  // Modification
  addInput(t, n = !1) {
    if (!n && !this.signStatus().addInput)
      throw new Error("Tx has signed inputs, cannot add new one");
    return this.inputs.push(ji(t, void 0, void 0, this.opts.disableScriptCheck)), this.inputs.length - 1;
  }
  updateInput(t, n, r = !1) {
    this.checkInputIdx(t);
    let o;
    if (!r) {
      const i = this.signStatus();
      (!i.addInput || i.inputs.includes(t)) && (o = Gu);
    }
    this.inputs[t] = ji(n, this.inputs[t], o, this.opts.disableScriptCheck, this.opts.allowUnknown);
  }
  // Output stuff
  checkOutputIdx(t) {
    if (!Number.isSafeInteger(t) || 0 > t || t >= this.outputs.length)
      throw new Error(`Wrong output index=${t}`);
  }
  getOutput(t) {
    return this.checkOutputIdx(t), ur(this.outputs[t]);
  }
  getOutputAddress(t, n = ze) {
    const r = this.getOutput(t);
    if (r.script)
      return Ie(n).encode(rt.decode(r.script));
  }
  get outputsLength() {
    return this.outputs.length;
  }
  normalizeOutput(t, n, r) {
    let { amount: o, script: i } = t;
    if (o === void 0 && (o = n?.amount), typeof o != "bigint")
      throw new Error(`Wrong amount type, should be of type bigint in sats, but got ${o} of type ${typeof o}`);
    typeof i == "string" && (i = S.decode(i)), i === void 0 && (i = n?.script);
    let s = { ...n, ...t, amount: o, script: i };
    if (s.amount === void 0 && delete s.amount, s = ho(wn, s, n, r, this.opts.allowUnknown), ei.encode(s), s.script && !this.opts.allowUnknownOutputs && rt.decode(s.script).type === "unknown")
      throw new Error("Transaction/output: unknown output script type, there is a chance that input is unspendable. Pass allowUnknownOutputs=true, if you sure");
    return this.opts.disableScriptCheck || Tc(s.script, s.redeemScript, s.witnessScript), s;
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
      (!i.addOutput || i.outputs.includes(t)) && (o = qu);
    }
    this.outputs[t] = this.normalizeOutput(n, this.outputs[t], o);
  }
  addOutputAddress(t, n, r = ze) {
    return this.addOutput({ script: rt.encode(Ie(r).decode(t)), amount: n });
  }
  // Utils
  get fee() {
    let t = 0n;
    for (const r of this.inputs) {
      const o = Gn(r);
      if (!o)
        throw new Error("Empty input amount");
      t += o.amount;
    }
    const n = this.outputs.map(be);
    for (const r of n)
      t -= r.amount;
    return t;
  }
  // Signing
  // Based on https://github.com/bitcoin/bitcoin/blob/5871b5b5ab57a0caf9b7514eb162c491c83281d5/test/functional/test_framework/script.py#L624
  // There is optimization opportunity to re-use hashes for multiple inputs for witness v0/v1,
  // but we are trying to be less complicated for audit purpose for now.
  preimageLegacy(t, n, r) {
    const { isAny: o, isNone: i, isSingle: s } = Wi(r);
    if (t < 0 || !Number.isSafeInteger(t))
      throw new Error(`Invalid input idx=${t}`);
    if (s && t >= this.outputs.length || t >= this.inputs.length)
      return lc.encode(1n);
    n = C.encode(C.decode(n).filter((f) => f !== "CODESEPARATOR"));
    let c = this.inputs.map(on).map((f, d) => ({
      ...f,
      finalScriptSig: d === t ? n : Y
    }));
    o ? c = [c[t]] : (i || s) && (c = c.map((f, d) => ({
      ...f,
      sequence: d === t ? f.sequence : 0
    })));
    let a = this.outputs.map(be);
    i ? a = [] : s && (a = a.slice(0, t).fill(gf).concat([a[t]]));
    const u = _e.encode({
      lockTime: this.lockTime,
      version: this.version,
      segwitFlag: !1,
      inputs: c,
      outputs: a
    });
    return oe(u, Ce.encode(r));
  }
  preimageWitnessV0(t, n, r, o) {
    const { isAny: i, isNone: s, isSingle: c } = Wi(r);
    let a = $n, u = $n, f = $n;
    const d = this.inputs.map(on), l = this.outputs.map(be);
    i || (a = oe(...d.map(Wr.encode))), !i && !c && !s && (u = oe(...d.map((p) => K.encode(p.sequence)))), !c && !s ? f = oe(...l.map(ve.encode)) : c && t < l.length && (f = oe(ve.encode(l[t])));
    const h = d[t];
    return oe(Ce.encode(this.version), a, u, q(32, !0).encode(h.txid), K.encode(h.index), Rt.encode(n), jn.encode(o), K.encode(h.sequence), f, K.encode(this.lockTime), K.encode(r));
  }
  preimageWitnessV1(t, n, r, o, i = -1, s, c = 192, a) {
    if (!Array.isArray(o) || this.inputs.length !== o.length)
      throw new Error(`Invalid amounts array=${o}`);
    if (!Array.isArray(n) || this.inputs.length !== n.length)
      throw new Error(`Invalid prevOutScript array=${n}`);
    const u = [
      ce.encode(0),
      ce.encode(r),
      // U8 sigHash
      Ce.encode(this.version),
      K.encode(this.lockTime)
    ], f = r === V.DEFAULT ? V.ALL : r & 3, d = r & V.ANYONECANPAY, l = this.inputs.map(on), h = this.outputs.map(be);
    d !== V.ANYONECANPAY && u.push(...[
      l.map(Wr.encode),
      o.map(jn.encode),
      n.map(Rt.encode),
      l.map((g) => K.encode(g.sequence))
    ].map((g) => pt(se(...g)))), f === V.ALL && u.push(pt(se(...h.map(ve.encode))));
    const p = (a ? 1 : 0) | (s ? 2 : 0);
    if (u.push(new Uint8Array([p])), d === V.ANYONECANPAY) {
      const g = l[t];
      u.push(Wr.encode(g), jn.encode(o[t]), Rt.encode(n[t]), K.encode(g.sequence));
    } else
      u.push(K.encode(t));
    return p & 1 && u.push(pt(Rt.encode(a || Y))), f === V.SINGLE && u.push(t < h.length ? pt(ve.encode(h[t])) : $n), s && u.push(fn(s, c), ce.encode(0), Ce.encode(i)), Yo("TapSighash", ...u);
  }
  // Signer can be privateKey OR instance of bip32 HD stuff
  signIdx(t, n, r, o) {
    this.checkInputIdx(n);
    const i = this.inputs[n], s = Gi(i, this.opts.allowLegacyWitnessUtxo);
    if (!z(t)) {
      if (!i.bip32Derivation || !i.bip32Derivation.length)
        throw new Error("bip32Derivation: empty");
      const f = i.bip32Derivation.filter((l) => l[1].fingerprint == t.fingerprint).map(([l, { path: h }]) => {
        let p = t;
        for (const g of h)
          p = p.deriveChild(g);
        if (!et(p.publicKey, l))
          throw new Error("bip32Derivation: wrong pubKey");
        if (!p.privateKey)
          throw new Error("bip32Derivation: no privateKey");
        return p;
      });
      if (!f.length)
        throw new Error(`bip32Derivation: no items with fingerprint=${t.fingerprint}`);
      let d = !1;
      for (const l of f)
        this.signIdx(l.privateKey, n) && (d = !0);
      return d;
    }
    r ? r.forEach(Ef) : r = [s.defaultSighash];
    const c = s.sighash;
    if (!r.includes(c))
      throw new Error(`Input with not allowed sigHash=${c}. Allowed: ${r.join(", ")}`);
    const { sigOutputs: a } = this.inputSighash(n);
    if (a === V.SINGLE && n >= this.outputs.length)
      throw new Error(`Input with sighash SINGLE, but there is no output with corresponding index=${n}`);
    const u = Gn(i);
    if (s.txType === "taproot") {
      const f = this.inputs.map(Gn), d = f.map((y) => y.script), l = f.map((y) => y.amount);
      let h = !1, p = qo(t), g = i.tapMerkleRoot || Y;
      if (i.tapInternalKey) {
        const { pubKey: y, privKey: x } = bf(t, p, i.tapInternalKey, g), [b] = uo(i.tapInternalKey, g);
        if (et(b, y)) {
          const v = this.preimageWitnessV1(n, d, c, l), A = se(Ci(v, x, o), c !== V.DEFAULT ? new Uint8Array([c]) : Y);
          this.updateInput(n, { tapKeySig: A }, !0), h = !0;
        }
      }
      if (i.tapLeafScript) {
        i.tapScriptSig = i.tapScriptSig || [];
        for (const [y, x] of i.tapLeafScript) {
          const b = x.subarray(0, -1), v = C.decode(b), A = x[x.length - 1], B = fn(b, A);
          if (v.findIndex((D) => z(D) && et(D, p)) === -1)
            continue;
          const m = this.preimageWitnessV1(n, d, c, l, void 0, b, A), ft = se(Ci(m, t, o), c !== V.DEFAULT ? new Uint8Array([c]) : Y);
          this.updateInput(n, { tapScriptSig: [[{ pubKey: p, leafHash: B }, ft]] }, !0), h = !0;
        }
      }
      if (!h)
        throw new Error("No taproot scripts signed");
      return !0;
    } else {
      const f = wc(t);
      let d = !1;
      const l = gc(f);
      for (const g of C.decode(s.lastScript))
        z(g) && (et(g, f) || et(g, l)) && (d = !0);
      if (!d)
        throw new Error(`Input script doesn't have pubKey: ${s.lastScript}`);
      let h;
      if (s.txType === "legacy")
        h = this.preimageLegacy(n, s.lastScript, c);
      else if (s.txType === "segwit") {
        let g = s.lastScript;
        s.last.type === "wpkh" && (g = rt.encode({ type: "pkh", hash: s.last.hash })), h = this.preimageWitnessV0(n, g, c, u.amount);
      } else
        throw new Error(`Transaction/sign: unknown tx type: ${s.txType}`);
      const p = Lu(h, t, this.opts.lowR);
      this.updateInput(n, {
        partialSig: [[f, se(p, new Uint8Array([c]))]]
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
    const n = this.inputs[t], r = Gi(n, this.opts.allowLegacyWitnessUtxo);
    if (r.txType === "taproot") {
      if (n.tapKeySig)
        n.finalScriptWitness = [n.tapKeySig];
      else if (n.tapLeafScript && n.tapScriptSig) {
        const a = n.tapLeafScript.sort((u, f) => Wt.encode(u[0]).length - Wt.encode(f[0]).length);
        for (const [u, f] of a) {
          const d = f.slice(0, -1), l = f[f.length - 1], h = rt.decode(d), p = fn(d, l), g = n.tapScriptSig.filter((x) => et(x[0].leafHash, p));
          let y = [];
          if (h.type === "tr_ms") {
            const x = h.m, b = h.pubkeys;
            let v = 0;
            for (const A of b) {
              const B = g.findIndex((j) => et(j[0].pubKey, A));
              if (v === x || B === -1) {
                y.push(Y);
                continue;
              }
              y.push(g[B][1]), v++;
            }
            if (v !== x)
              continue;
          } else if (h.type === "tr_ns") {
            for (const x of h.pubkeys) {
              const b = g.findIndex((v) => et(v[0].pubKey, x));
              b !== -1 && y.push(g[b][1]);
            }
            if (y.length !== h.pubkeys.length)
              continue;
          } else if (h.type === "unknown" && this.opts.allowUnknownInputs) {
            const x = C.decode(d);
            if (y = g.map(([{ pubKey: b }, v]) => {
              const A = x.findIndex((B) => z(B) && et(B, b));
              if (A === -1)
                throw new Error("finalize/taproot: cannot find position of pubkey in script");
              return { signature: v, pos: A };
            }).sort((b, v) => b.pos - v.pos).map((b) => b.signature), !y.length)
              continue;
          } else {
            const x = this.opts.customScripts;
            if (x)
              for (const b of x) {
                if (!b.finalizeTaproot)
                  continue;
                const v = C.decode(d), A = b.encode(v);
                if (A === void 0)
                  continue;
                const B = b.finalizeTaproot(d, A, g);
                if (B) {
                  n.finalScriptWitness = B.concat(Wt.encode(u)), n.finalScriptSig = Y, Mr(n);
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
      n.finalScriptSig = Y, Mr(n);
      return;
    }
    if (!n.partialSig || !n.partialSig.length)
      throw new Error("Not enough partial sign");
    let o = Y, i = [];
    if (r.last.type === "ms") {
      const a = r.last.m, u = r.last.pubkeys;
      let f = [];
      for (const d of u) {
        const l = n.partialSig.find((h) => et(d, h[0]));
        l && f.push(l[1]);
      }
      if (f = f.slice(0, a), f.length !== a)
        throw new Error(`Multisig: wrong signatures count, m=${a} n=${u.length} signatures=${f.length}`);
      o = C.encode([0, ...f]);
    } else if (r.last.type === "pk")
      o = C.encode([n.partialSig[0][1]]);
    else if (r.last.type === "pkh")
      o = C.encode([n.partialSig[0][1], n.partialSig[0][0]]);
    else if (r.last.type === "wpkh")
      o = Y, i = [n.partialSig[0][1], n.partialSig[0][0]];
    else if (r.last.type === "unknown" && !this.opts.allowUnknownInputs)
      throw new Error("Unknown inputs not allowed");
    let s, c;
    if (r.type.includes("wsh-") && (o.length && r.lastScript.length && (i = C.decode(o).map((a) => {
      if (a === 0)
        return Y;
      if (z(a))
        return a;
      throw new Error(`Wrong witness op=${a}`);
    })), i = i.concat(r.lastScript)), r.txType === "segwit" && (c = i), r.type.startsWith("sh-wsh-") ? s = C.encode([C.encode([0, pt(r.lastScript)])]) : r.type.startsWith("sh-") ? s = C.encode([...C.decode(o), r.lastScript]) : r.type.startsWith("wsh-") || r.txType !== "segwit" && (s = o), !s && !c)
      throw new Error("Unknown error finalizing input");
    s && (n.finalScriptSig = s), c && (n.finalScriptWitness = c), Mr(n);
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
    const n = this.global.unsignedTx ? an.encode(this.global.unsignedTx) : Y, r = t.global.unsignedTx ? an.encode(t.global.unsignedTx) : Y;
    if (!et(n, r))
      throw new Error("Transaction/combine: different unsigned tx");
    this.global = ho(Qo, this.global, t.global, void 0, this.opts.allowUnknown);
    for (let o = 0; o < this.inputs.length; o++)
      this.updateInput(o, t.inputs[o], !0);
    for (let o = 0; o < this.outputs.length; o++)
      this.updateOutput(o, t.outputs[o], !0);
    return this;
  }
  clone() {
    return qn.fromPSBT(this.toPSBT(this.opts.PSBTVersion), this.opts);
  }
};
class pe extends Ct {
  constructor(t) {
    super(zr(t));
  }
  static fromPSBT(t, n) {
    return Ct.fromPSBT(t, zr(n));
  }
  static fromRaw(t, n) {
    return Ct.fromRaw(t, zr(n));
  }
}
pe.ARK_TX_OPTS = {
  allowUnknown: !0,
  allowUnknownOutputs: !0,
  allowUnknownInputs: !0
};
function zr(e) {
  return { ...pe.ARK_TX_OPTS, ...e };
}
class ri extends Error {
  idx;
  // Indice of participant
  constructor(t, n) {
    super(n), this.idx = t;
  }
}
const { taggedHash: Ic, pointToBytes: Ln } = Ut.utils, Vt = Mt.Point, L = Vt.Fn, jt = Mt.lengths.publicKey, yo = new Uint8Array(jt), qi = he(q(33), {
  decode: (e) => mn(e) ? yo : e.toBytes(!0),
  encode: (e) => pn(e, yo) ? Vt.ZERO : Vt.fromBytes(e)
}), Yi = xt(lc, (e) => (Os("n", e, 1n, L.ORDER), e)), Ve = ut({ R1: qi, R2: qi }), Bc = ut({ k1: Yi, k2: Yi, publicKey: q(jt) });
function Zi(e, ...t) {
}
function It(e, ...t) {
  if (!Array.isArray(e))
    throw new Error("expected array");
  e.forEach((n) => _(n, ...t));
}
function Xi(e) {
  if (!Array.isArray(e))
    throw new Error("expected array");
  e.forEach((t, n) => {
    if (typeof t != "boolean")
      throw new Error("expected boolean in xOnly array, got" + t + "(" + n + ")");
  });
}
const fr = (e, ...t) => L.create(L.fromBytes(Ic(e, ...t), !0)), sn = (e, t) => Bn(e.y) ? t : L.neg(t);
function ke(e) {
  return Vt.BASE.multiply(e);
}
function mn(e) {
  return e.equals(Vt.ZERO);
}
function mo(e) {
  return It(e, jt), e.sort(sr);
}
function Oc(e) {
  It(e, jt);
  for (let t = 1; t < e.length; t++)
    if (!pn(e[t], e[0]))
      return e[t];
  return yo;
}
function Uc(e) {
  return It(e, jt), Ic("KeyAgg list", ...e);
}
function Nc(e, t, n) {
  return _(e, jt), _(t, jt), pn(e, t) ? 1n : fr("KeyAgg coefficient", n, e);
}
function xo(e, t = [], n = []) {
  if (It(e, jt), It(t, 32), t.length !== n.length)
    throw new Error("The tweaks and isXonly arrays must have the same length");
  const r = Oc(e), o = Uc(e);
  let i = Vt.ZERO;
  for (let a = 0; a < e.length; a++) {
    let u;
    try {
      u = Vt.fromBytes(e[a]);
    } catch {
      throw new ri(a, "pubkey");
    }
    i = i.add(u.multiply(Nc(e[a], r, o)));
  }
  let s = L.ONE, c = L.ZERO;
  for (let a = 0; a < t.length; a++) {
    const u = n[a] && !Bn(i.y) ? L.neg(L.ONE) : L.ONE, f = L.fromBytes(t[a]);
    if (i = i.multiply(u).add(ke(f)), mn(i))
      throw new Error("The result of tweaking cannot be infinity");
    s = L.mul(u, s), c = L.add(f, L.mul(u, c));
  }
  return { aggPublicKey: i, gAcc: s, tweakAcc: c };
}
const Qi = (e, t, n, r, o, i) => fr("MuSig/nonce", e, new Uint8Array([t.length]), t, new Uint8Array([n.length]), n, o, vn(i.length, 4), i, new Uint8Array([r]));
function Tf(e, t, n = new Uint8Array(0), r, o = new Uint8Array(0), i = Tn(32)) {
  if (_(e, jt), Zi(t, 32), _(n), ![0, 32].includes(n.length))
    throw new Error("wrong aggPublicKey");
  Zi(), _(o), _(i, 32);
  const s = Uint8Array.of(0), c = Qi(i, e, n, 0, s, o), a = Qi(i, e, n, 1, s, o);
  return {
    secret: Bc.encode({ k1: c, k2: a, publicKey: e }),
    public: Ve.encode({ R1: ke(c), R2: ke(a) })
  };
}
function vf(e) {
  It(e, 66);
  let t = Vt.ZERO, n = Vt.ZERO;
  for (let r = 0; r < e.length; r++) {
    const o = e[r];
    try {
      const { R1: i, R2: s } = Ve.decode(o);
      if (mn(i) || mn(s))
        throw new Error("infinity point");
      t = t.add(i), n = n.add(s);
    } catch {
      throw new ri(r, "pubnonce");
    }
  }
  return Ve.encode({ R1: t, R2: n });
}
class kf {
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
    if (It(n, 33), It(o, 32), Xi(i), _(r), o.length !== i.length)
      throw new Error("The tweaks and isXonly arrays must have the same length");
    const { aggPublicKey: s, gAcc: c, tweakAcc: a } = xo(n, o, i), { R1: u, R2: f } = Ve.decode(t);
    this.publicKeys = n, this.Q = s, this.gAcc = c, this.tweakAcc = a, this.b = fr("MuSig/noncecoef", t, Ln(s), r);
    const d = u.add(f.multiply(this.b));
    this.R = mn(d) ? Vt.BASE : d, this.e = fr("BIP0340/challenge", Ln(this.R), Ln(s), r), this.tweaks = o, this.isXonly = i, this.L = Uc(n), this.secondKey = Oc(n);
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
    if (!n.some((i) => pn(i, r)))
      throw new Error("The signer's pubkey must be included in the list of pubkeys");
    return Nc(r, this.secondKey, this.L);
  }
  partialSigVerifyInternal(t, n, r) {
    const { Q: o, gAcc: i, b: s, R: c, e: a } = this, u = L.fromBytes(t, !0);
    if (!L.isValid(u))
      return !1;
    const { R1: f, R2: d } = Ve.decode(n), l = f.add(d.multiply(s)), h = Bn(c.y) ? l : l.negate(), p = Vt.fromBytes(r), g = this.getSessionKeyAggCoeff(p), y = L.mul(sn(o, 1n), i), x = ke(u), b = h.add(p.multiply(L.mul(a, L.mul(g, y))));
    return x.equals(b);
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
    if (_(n, 32), typeof r != "boolean")
      throw new Error("expected boolean");
    const { Q: o, gAcc: i, b: s, R: c, e: a } = this, { k1: u, k2: f, publicKey: d } = Bc.decode(t);
    if (t.fill(0, 0, 64), !L.isValid(u))
      throw new Error("wrong k1");
    if (!L.isValid(f))
      throw new Error("wrong k1");
    const l = sn(c, u), h = sn(c, f), p = L.fromBytes(n);
    if (L.is0(p))
      throw new Error("wrong d_");
    const g = ke(p), y = g.toBytes(!0);
    if (!pn(y, d))
      throw new Error("Public key does not match nonceGen argument");
    const x = this.getSessionKeyAggCoeff(g), b = sn(o, 1n), v = L.mul(b, L.mul(i, p)), A = L.add(l, L.add(L.mul(s, h), L.mul(a, L.mul(x, v)))), B = L.toBytes(A);
    if (!r) {
      const j = Ve.encode({
        R1: ke(u),
        R2: ke(f)
      });
      if (!this.partialSigVerifyInternal(B, j, y))
        throw new Error("Partial signature verification failed");
    }
    return B;
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
    if (_(t, 32), It(n, 66), It(o, jt), It(i, 32), Xi(s), de(r), n.length !== o.length)
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
    It(t, 32);
    const { Q: n, tweakAcc: r, R: o, e: i } = this;
    let s = 0n;
    for (let a = 0; a < t.length; a++) {
      const u = L.fromBytes(t[a], !0);
      if (!L.isValid(u))
        throw new ri(a, "psig");
      s = L.add(s, u);
    }
    const c = sn(n, 1n);
    return s = L.add(s, L.mul(i, L.mul(c, r))), $t(Ln(o), L.toBytes(s));
  }
}
function Af(e) {
  const t = Tf(e);
  return { secNonce: t.secret, pubNonce: t.public };
}
function If(e) {
  return vf(e);
}
/*! noble-secp256k1 - MIT License (c) 2019 Paul Miller (paulmillr.com) */
const Pc = {
  p: 0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffefffffc2fn,
  n: 0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141n,
  h: 1n,
  a: 0n,
  b: 7n,
  Gx: 0x79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798n,
  Gy: 0x483ada7726a3c4655da4fbfc0e1108a8fd17b448a68554199c47d08ffb10d4b8n
}, { p: ae, n: ge, Gx: Bf, Gy: Of, b: Rc } = Pc, at = 32, Oe = 64, dr = {
  publicKey: at + 1,
  publicKeyUncompressed: Oe + 1,
  signature: Oe,
  seed: at + at / 2
}, Uf = (...e) => {
  "captureStackTrace" in Error && typeof Error.captureStackTrace == "function" && Error.captureStackTrace(...e);
}, M = (e = "") => {
  const t = new Error(e);
  throw Uf(t, M), t;
}, Nf = (e) => typeof e == "bigint", Pf = (e) => typeof e == "string", Rf = (e) => e instanceof Uint8Array || ArrayBuffer.isView(e) && e.constructor.name === "Uint8Array", St = (e, t, n = "") => {
  const r = Rf(e), o = e?.length, i = t !== void 0;
  if (!r || i && o !== t) {
    const s = n && `"${n}" `, c = i ? ` of length ${t}` : "", a = r ? `length=${o}` : `type=${typeof e}`;
    M(s + "expected Uint8Array" + c + ", got " + a);
  }
  return e;
}, we = (e) => new Uint8Array(e), Cc = (e, t) => e.toString(16).padStart(t, "0"), $c = (e) => Array.from(St(e)).map((t) => Cc(t, 2)).join(""), Xt = { _0: 48, _9: 57, A: 65, F: 70, a: 97, f: 102 }, Ji = (e) => {
  if (e >= Xt._0 && e <= Xt._9)
    return e - Xt._0;
  if (e >= Xt.A && e <= Xt.F)
    return e - (Xt.A - 10);
  if (e >= Xt.a && e <= Xt.f)
    return e - (Xt.a - 10);
}, Lc = (e) => {
  const t = "hex invalid";
  if (!Pf(e))
    return M(t);
  const n = e.length, r = n / 2;
  if (n % 2)
    return M(t);
  const o = we(r);
  for (let i = 0, s = 0; i < r; i++, s += 2) {
    const c = Ji(e.charCodeAt(s)), a = Ji(e.charCodeAt(s + 1));
    if (c === void 0 || a === void 0)
      return M(t);
    o[i] = c * 16 + a;
  }
  return o;
}, _c = () => globalThis?.crypto, ts = () => _c()?.subtle ?? M("crypto.subtle must be defined, consider polyfill"), Gt = (...e) => {
  const t = we(e.reduce((r, o) => r + St(o).length, 0));
  let n = 0;
  return e.forEach((r) => {
    t.set(r, n), n += r.length;
  }), t;
}, Nr = (e = at) => _c().getRandomValues(we(e)), xn = BigInt, Ue = (e, t, n, r = "bad number: out of range") => Nf(e) && t <= e && e < n ? e : M(r), I = (e, t = ae) => {
  const n = e % t;
  return n >= 0n ? n : t + n;
}, Jt = (e) => I(e, ge), Vc = (e, t) => {
  (e === 0n || t <= 0n) && M("no inverse n=" + e + " mod=" + t);
  let n = I(e, t), r = t, o = 0n, i = 1n;
  for (; n !== 0n; ) {
    const s = r / n, c = r % n, a = o - i * s;
    r = n, n = c, o = i, i = a;
  }
  return r === 1n ? I(o, t) : M("no inverse");
}, Dc = (e) => {
  const t = Rr[e];
  return typeof t != "function" && M("hashes." + e + " not set"), t;
}, jr = (e) => e instanceof wt ? e : M("Point expected"), Hc = (e) => I(I(e * e) * e + Rc), es = (e) => Ue(e, 0n, ae), Yn = (e) => Ue(e, 1n, ae), bo = (e) => Ue(e, 1n, ge), je = (e) => (e & 1n) === 0n, Pr = (e) => Uint8Array.of(e), Cf = (e) => Pr(je(e) ? 2 : 3), Fc = (e) => {
  const t = Hc(Yn(e));
  let n = 1n;
  for (let r = t, o = (ae + 1n) / 4n; o > 0n; o >>= 1n)
    o & 1n && (n = n * r % ae), r = r * r % ae;
  return I(n * n) === t ? n : M("sqrt invalid");
};
class wt {
  static BASE;
  static ZERO;
  X;
  Y;
  Z;
  constructor(t, n, r) {
    this.X = es(t), this.Y = Yn(n), this.Z = es(r), Object.freeze(this);
  }
  static CURVE() {
    return Pc;
  }
  /** Create 3d xyz point from 2d xy. (0, 0) => (0, 1, 0), not (0, 0, 1) */
  static fromAffine(t) {
    const { x: n, y: r } = t;
    return n === 0n && r === 0n ? Ee : new wt(n, r, 1n);
  }
  /** Convert Uint8Array or hex string to Point. */
  static fromBytes(t) {
    St(t);
    const { publicKey: n, publicKeyUncompressed: r } = dr;
    let o;
    const i = t.length, s = t[0], c = t.subarray(1), a = Ge(c, 0, at);
    if (i === n && (s === 2 || s === 3)) {
      let u = Fc(a);
      const f = je(u);
      je(xn(s)) !== f && (u = I(-u)), o = new wt(a, u, 1n);
    }
    return i === r && s === 4 && (o = new wt(a, Ge(c, at, Oe), 1n)), o ? o.assertValidity() : M("bad point: not on curve");
  }
  static fromHex(t) {
    return wt.fromBytes(Lc(t));
  }
  get x() {
    return this.toAffine().x;
  }
  get y() {
    return this.toAffine().y;
  }
  /** Equality check: compare points P&Q. */
  equals(t) {
    const { X: n, Y: r, Z: o } = this, { X: i, Y: s, Z: c } = jr(t), a = I(n * c), u = I(i * o), f = I(r * c), d = I(s * o);
    return a === u && f === d;
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
    const { X: n, Y: r, Z: o } = this, { X: i, Y: s, Z: c } = jr(t), a = 0n, u = Rc;
    let f = 0n, d = 0n, l = 0n;
    const h = I(u * 3n);
    let p = I(n * i), g = I(r * s), y = I(o * c), x = I(n + r), b = I(i + s);
    x = I(x * b), b = I(p + g), x = I(x - b), b = I(n + o);
    let v = I(i + c);
    return b = I(b * v), v = I(p + y), b = I(b - v), v = I(r + o), f = I(s + c), v = I(v * f), f = I(g + y), v = I(v - f), l = I(a * b), f = I(h * y), l = I(f + l), f = I(g - l), l = I(g + l), d = I(f * l), g = I(p + p), g = I(g + p), y = I(a * y), b = I(h * b), g = I(g + y), y = I(p - y), y = I(a * y), b = I(b + y), p = I(g * b), d = I(d + p), p = I(v * b), f = I(x * f), f = I(f - p), p = I(x * g), l = I(v * l), l = I(l + p), new wt(f, d, l);
  }
  subtract(t) {
    return this.add(jr(t).negate());
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
    if (bo(t), t === 1n)
      return this;
    if (this.equals(ye))
      return sd(t).p;
    let r = Ee, o = ye;
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
    if (this.equals(Ee))
      return { x: 0n, y: 0n };
    if (r === 1n)
      return { x: t, y: n };
    const o = Vc(r, ae);
    return I(r * o) !== 1n && M("inverse invalid"), { x: I(t * o), y: I(n * o) };
  }
  /** Checks if the point is valid and on-curve. */
  assertValidity() {
    const { x: t, y: n } = this.toAffine();
    return Yn(t), Yn(n), I(n * n) === Hc(t) ? this : M("bad point: not on curve");
  }
  /** Converts point to 33/65-byte Uint8Array. */
  toBytes(t = !0) {
    const { x: n, y: r } = this.assertValidity().toAffine(), o = kt(n);
    return t ? Gt(Cf(r), o) : Gt(Pr(4), o, kt(r));
  }
  toHex(t) {
    return $c(this.toBytes(t));
  }
}
const ye = new wt(Bf, Of, 1n), Ee = new wt(0n, 1n, 0n);
wt.BASE = ye;
wt.ZERO = Ee;
const $f = (e, t, n) => ye.multiply(t, !1).add(e.multiply(n, !1)).assertValidity(), me = (e) => xn("0x" + ($c(e) || "0")), Ge = (e, t, n) => me(e.subarray(t, n)), Lf = 2n ** 256n, kt = (e) => Lc(Cc(Ue(e, 0n, Lf), Oe)), Kc = (e) => {
  const t = me(St(e, at, "secret key"));
  return Ue(t, 1n, ge, "invalid secret key: outside of range");
}, Mc = (e) => e > ge >> 1n, _f = (e) => {
  [0, 1, 2, 3].includes(e) || M("recovery id must be valid and present");
}, Vf = (e) => {
  e != null && !ns.includes(e) && M(`Signature format must be one of: ${ns.join(", ")}`), e === zc && M('Signature format "der" is not supported: switch to noble-curves');
}, Df = (e, t = qe) => {
  Vf(t);
  const n = dr.signature, r = n + 1;
  let o = `Signature format "${t}" expects Uint8Array with length `;
  t === qe && e.length !== n && M(o + n), t === hr && e.length !== r && M(o + r);
};
class lr {
  r;
  s;
  recovery;
  constructor(t, n, r) {
    this.r = bo(t), this.s = bo(n), r != null && (this.recovery = r), Object.freeze(this);
  }
  static fromBytes(t, n = qe) {
    Df(t, n);
    let r;
    n === hr && (r = t[0], t = t.subarray(1));
    const o = Ge(t, 0, at), i = Ge(t, at, Oe);
    return new lr(o, i, r);
  }
  addRecoveryBit(t) {
    return new lr(this.r, this.s, t);
  }
  hasHighS() {
    return Mc(this.s);
  }
  toBytes(t = qe) {
    const { r: n, s: r, recovery: o } = this, i = Gt(kt(n), kt(r));
    return t === hr ? (_f(o), Gt(Uint8Array.of(o), i)) : i;
  }
}
const Wc = (e) => {
  const t = e.length * 8 - 256;
  t > 1024 && M("msg invalid");
  const n = me(e);
  return t > 0 ? n >> xn(t) : n;
}, Hf = (e) => Jt(Wc(St(e))), qe = "compact", hr = "recovered", zc = "der", ns = [qe, hr, zc], rs = {
  lowS: !0,
  prehash: !0,
  format: qe,
  extraEntropy: !1
}, os = "SHA-256", Rr = {
  hmacSha256Async: async (e, t) => {
    const n = ts(), r = "HMAC", o = await n.importKey("raw", e, { name: r, hash: { name: os } }, !1, ["sign"]);
    return we(await n.sign(r, o, t));
  },
  hmacSha256: void 0,
  sha256Async: async (e) => we(await ts().digest(os, e)),
  sha256: void 0
}, Ff = (e, t, n) => (St(e, void 0, "message"), t.prehash ? n ? Rr.sha256Async(e) : Dc("sha256")(e) : e), Kf = we(0), Mf = Pr(0), Wf = Pr(1), zf = 1e3, jf = "drbg: tried max amount of iterations", Gf = async (e, t) => {
  let n = we(at), r = we(at), o = 0;
  const i = () => {
    n.fill(1), r.fill(0);
  }, s = (...f) => Rr.hmacSha256Async(r, Gt(n, ...f)), c = async (f = Kf) => {
    r = await s(Mf, f), n = await s(), f.length !== 0 && (r = await s(Wf, f), n = await s());
  }, a = async () => (o++ >= zf && M(jf), n = await s(), n);
  i(), await c(e);
  let u;
  for (; !(u = t(await a())); )
    await c();
  return i(), u;
}, qf = (e, t, n, r) => {
  let { lowS: o, extraEntropy: i } = n;
  const s = kt, c = Hf(e), a = s(c), u = Kc(t), f = [s(u), a];
  if (i != null && i !== !1) {
    const p = i === !0 ? Nr(at) : i;
    f.push(St(p, void 0, "extraEntropy"));
  }
  const d = Gt(...f), l = c;
  return r(d, (p) => {
    const g = Wc(p);
    if (!(1n <= g && g < ge))
      return;
    const y = Vc(g, ge), x = ye.multiply(g).toAffine(), b = Jt(x.x);
    if (b === 0n)
      return;
    const v = Jt(y * Jt(l + b * u));
    if (v === 0n)
      return;
    let A = (x.x === b ? 0 : 2) | Number(x.y & 1n), B = v;
    return o && Mc(v) && (B = Jt(-v), A ^= 1), new lr(b, B, A).toBytes(n.format);
  });
}, Yf = (e) => {
  const t = {};
  return Object.keys(rs).forEach((n) => {
    t[n] = e[n] ?? rs[n];
  }), t;
}, Zf = async (e, t, n = {}) => (n = Yf(n), e = await Ff(e, n, !0), qf(e, t, n, Gf)), Xf = (e = Nr(dr.seed)) => {
  St(e), (e.length < dr.seed || e.length > 1024) && M("expected 40-1024b");
  const t = I(me(e), ge - 1n);
  return kt(t + 1n);
}, Qf = (e) => (t) => {
  const n = Xf(t);
  return { secretKey: n, publicKey: e(n) };
}, jc = (e) => Uint8Array.from("BIP0340/" + e, (t) => t.charCodeAt(0)), Gc = "aux", qc = "nonce", Yc = "challenge", Eo = (e, ...t) => {
  const n = Dc("sha256"), r = n(jc(e));
  return n(Gt(r, r, ...t));
}, So = async (e, ...t) => {
  const n = Rr.sha256Async, r = await n(jc(e));
  return await n(Gt(r, r, ...t));
}, oi = (e) => {
  const t = Kc(e), n = ye.multiply(t), { x: r, y: o } = n.assertValidity().toAffine(), i = je(o) ? t : Jt(-t), s = kt(r);
  return { d: i, px: s };
}, ii = (e) => Jt(me(e)), Zc = (...e) => ii(Eo(Yc, ...e)), Xc = async (...e) => ii(await So(Yc, ...e)), Qc = (e) => oi(e).px, Jf = Qf(Qc), Jc = (e, t, n) => {
  const { px: r, d: o } = oi(t);
  return { m: St(e), px: r, d: o, a: St(n, at) };
}, ta = (e) => {
  const t = ii(e);
  t === 0n && M("sign failed: k is zero");
  const { px: n, d: r } = oi(kt(t));
  return { rx: n, k: r };
}, ea = (e, t, n, r) => Gt(t, kt(Jt(e + n * r))), na = "invalid signature produced", td = (e, t, n = Nr(at)) => {
  const { m: r, px: o, d: i, a: s } = Jc(e, t, n), c = Eo(Gc, s), a = kt(i ^ me(c)), u = Eo(qc, a, o, r), { rx: f, k: d } = ta(u), l = Zc(f, o, r), h = ea(d, f, l, i);
  return oa(h, r, o) || M(na), h;
}, ed = async (e, t, n = Nr(at)) => {
  const { m: r, px: o, d: i, a: s } = Jc(e, t, n), c = await So(Gc, s), a = kt(i ^ me(c)), u = await So(qc, a, o, r), { rx: f, k: d } = ta(u), l = await Xc(f, o, r), h = ea(d, f, l, i);
  return await ia(h, r, o) || M(na), h;
}, nd = (e, t) => e instanceof Promise ? e.then(t) : t(e), ra = (e, t, n, r) => {
  const o = St(e, Oe, "signature"), i = St(t, void 0, "message"), s = St(n, at, "publicKey");
  try {
    const c = me(s), a = Fc(c), u = je(a) ? a : I(-a), f = new wt(c, u, 1n).assertValidity(), d = kt(f.toAffine().x), l = Ge(o, 0, at);
    Ue(l, 1n, ae);
    const h = Ge(o, at, Oe);
    Ue(h, 1n, ge);
    const p = Gt(kt(l), d, i);
    return nd(r(p), (g) => {
      const { x: y, y: x } = $f(f, h, Jt(-g)).toAffine();
      return !(!je(x) || y !== l);
    });
  } catch {
    return !1;
  }
}, oa = (e, t, n) => ra(e, t, n, Zc), ia = async (e, t, n) => ra(e, t, n, Xc), rd = {
  keygen: Jf,
  getPublicKey: Qc,
  sign: td,
  verify: oa,
  signAsync: ed,
  verifyAsync: ia
}, pr = 8, od = 256, sa = Math.ceil(od / pr) + 1, To = 2 ** (pr - 1), id = () => {
  const e = [];
  let t = ye, n = t;
  for (let r = 0; r < sa; r++) {
    n = t, e.push(n);
    for (let o = 1; o < To; o++)
      n = n.add(t), e.push(n);
    t = n.double();
  }
  return e;
};
let is;
const ss = (e, t) => {
  const n = t.negate();
  return e ? n : t;
}, sd = (e) => {
  const t = is || (is = id());
  let n = Ee, r = ye;
  const o = 2 ** pr, i = o, s = xn(o - 1), c = xn(pr);
  for (let a = 0; a < sa; a++) {
    let u = Number(e & s);
    e >>= c, u > To && (u -= i, e += 1n);
    const f = a * To, d = f, l = f + Math.abs(u) - 1, h = a % 2 !== 0, p = u < 0;
    u === 0 ? r = r.add(ss(h, t[d])) : n = n.add(ss(p, t[l]));
  }
  return e !== 0n && M("invalid wnaf"), { p: n, f: r };
};
function si(e, t, n = {}) {
  e = mo(e);
  const { aggPublicKey: r } = xo(e);
  if (!n.taprootTweak)
    return {
      preTweakedKey: r.toBytes(!0),
      finalKey: r.toBytes(!0)
    };
  const o = Ut.utils.taggedHash("TapTweak", r.toBytes(!0).subarray(1), n.taprootTweak ?? new Uint8Array(0)), { aggPublicKey: i } = xo(e, [o], [!0]);
  return {
    preTweakedKey: r.toBytes(!0),
    finalKey: i.toBytes(!0)
  };
}
class _n extends Error {
  constructor(t) {
    super(t), this.name = "PartialSignatureError";
  }
}
class ci {
  constructor(t, n) {
    if (this.s = t, this.R = n, t.length !== 32)
      throw new _n("Invalid s length");
    if (n.length !== 33)
      throw new _n("Invalid R length");
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
      throw new _n("Invalid partial signature length");
    if (qt(t) >= wt.CURVE().n)
      throw new _n("s value overflows curve order");
    const r = new Uint8Array(33);
    return new ci(t, r);
  }
}
function cd(e, t, n, r, o, i) {
  let s;
  if (i?.taprootTweak !== void 0) {
    const { preTweakedKey: u } = si(mo(r));
    s = Ut.utils.taggedHash("TapTweak", u.subarray(1), i.taprootTweak);
  }
  const a = new kf(n, mo(r), o, s ? [s] : void 0, s ? [!0] : void 0).sign(e, t);
  return ci.decode(a);
}
var Gr, cs;
function ad() {
  if (cs) return Gr;
  cs = 1;
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
  return Gr = { decode: a, encode: u }, Gr;
}
var vo = ad(), Tt;
(function(e) {
  e.VtxoTaprootTree = "taptree", e.VtxoTreeExpiry = "expiry", e.Cosigner = "cosigner", e.ConditionWitness = "condition";
})(Tt || (Tt = {}));
const ai = 222;
function ud(e, t, n, r) {
  e.updateInput(t, {
    unknown: [
      ...e.getInput(t)?.unknown ?? [],
      n.encode(r)
    ]
  });
}
function ko(e, t, n) {
  const r = e.getInput(t)?.unknown ?? [], o = [];
  for (const i of r) {
    const s = n.decode(i);
    s && o.push(s);
  }
  return o;
}
const ca = {
  key: Tt.VtxoTaprootTree,
  encode: (e) => [
    {
      type: ai,
      key: Cr[Tt.VtxoTaprootTree]
    },
    e
  ],
  decode: (e) => ui(() => fi(e[0], Tt.VtxoTaprootTree) ? e[1] : null)
}, fd = {
  key: Tt.ConditionWitness,
  encode: (e) => [
    {
      type: ai,
      key: Cr[Tt.ConditionWitness]
    },
    gn.encode(e)
  ],
  decode: (e) => ui(() => fi(e[0], Tt.ConditionWitness) ? gn.decode(e[1]) : null)
}, Ao = {
  key: Tt.Cosigner,
  encode: (e) => [
    {
      type: ai,
      key: new Uint8Array([
        ...Cr[Tt.Cosigner],
        e.index
      ])
    },
    e.key
  ],
  decode: (e) => ui(() => fi(e[0], Tt.Cosigner) ? {
    index: e[0].key[e[0].key.length - 1],
    key: e[1]
  } : null)
};
Tt.VtxoTreeExpiry;
const Cr = Object.fromEntries(Object.values(Tt).map((e) => [
  e,
  new TextEncoder().encode(e)
])), ui = (e) => {
  try {
    return e();
  } catch {
    return null;
  }
};
function fi(e, t) {
  const n = S.encode(Cr[t]);
  return S.encode(new Uint8Array([e.type, ...e.key])).includes(n);
}
const Vn = new Error("missing vtxo graph");
class bn {
  constructor(t) {
    this.secretKey = t, this.myNonces = null, this.aggregateNonces = null, this.graph = null, this.scriptRoot = null, this.rootSharedOutputAmount = null;
  }
  static random() {
    const t = ao();
    return new bn(t);
  }
  async init(t, n, r) {
    this.graph = t, this.scriptRoot = n, this.rootSharedOutputAmount = r;
  }
  async getPublicKey() {
    return Mt.getPublicKey(this.secretKey);
  }
  async getNonces() {
    if (!this.graph)
      throw Vn;
    this.myNonces || (this.myNonces = this.generateNonces());
    const t = /* @__PURE__ */ new Map();
    for (const [n, r] of this.myNonces)
      t.set(n, { pubNonce: r.pubNonce });
    return t;
  }
  async aggregatedNonces(t, n) {
    if (!this.graph)
      throw Vn;
    if (this.aggregateNonces || (this.aggregateNonces = /* @__PURE__ */ new Map()), this.myNonces || await this.getNonces(), this.aggregateNonces.has(t))
      return {
        hasAllNonces: this.aggregateNonces.size === this.myNonces?.size
      };
    const r = this.myNonces.get(t);
    if (!r)
      throw new Error(`missing nonce for txid ${t}`);
    const o = await this.getPublicKey();
    n.set(S.encode(o.subarray(1)), r);
    const i = this.graph.find(t);
    if (!i)
      throw new Error(`missing tx for txid ${t}`);
    const s = ko(i.root, 0, Ao).map(
      (u) => S.encode(u.key.subarray(1))
      // xonly pubkey
    ), c = [];
    for (const u of s) {
      const f = n.get(u);
      if (!f)
        throw new Error(`missing nonce for cosigner ${u}`);
      c.push(f.pubNonce);
    }
    const a = If(c);
    return this.aggregateNonces.set(t, { pubNonce: a }), {
      hasAllNonces: this.aggregateNonces.size === this.myNonces?.size
    };
  }
  async sign() {
    if (!this.graph)
      throw Vn;
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
      throw Vn;
    const t = /* @__PURE__ */ new Map(), n = Mt.getPublicKey(this.secretKey);
    for (const r of this.graph.iterator()) {
      const o = Af(n);
      t.set(r.txid, o);
    }
    return t;
  }
  signPartial(t) {
    if (!this.graph || !this.scriptRoot || !this.rootSharedOutputAmount)
      throw bn.NOT_INITIALIZED;
    if (!this.myNonces || !this.aggregateNonces)
      throw new Error("session not properly initialized");
    const n = this.myNonces.get(t.txid);
    if (!n)
      throw new Error("missing private nonce");
    const r = this.aggregateNonces.get(t.txid);
    if (!r)
      throw new Error("missing aggregate nonce");
    const o = [], i = [], s = ko(t.root, 0, Ao).map((u) => u.key), { finalKey: c } = si(s, !0, {
      taprootTweak: this.scriptRoot
    });
    for (let u = 0; u < t.root.inputsLength; u++) {
      const f = dd(c, this.graph, this.rootSharedOutputAmount, t.root);
      o.push(f.amount), i.push(f.script);
    }
    const a = t.root.preimageWitnessV1(
      0,
      // always first input
      i,
      Be.DEFAULT,
      o
    );
    return cd(n.secNonce, this.secretKey, r.pubNonce, s, a, {
      taprootTweak: this.scriptRoot
    });
  }
}
bn.NOT_INITIALIZED = new Error("session not initialized, call init method");
function dd(e, t, n, r) {
  const o = C.encode(["OP_1", e.slice(1)]);
  if (r.id === t.txid)
    return {
      amount: n,
      script: o
    };
  const i = r.getInput(0);
  if (!i.txid)
    throw new Error("missing parent input txid");
  const s = S.encode(i.txid), c = t.find(s);
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
const as = Object.values(Be).filter((e) => typeof e == "number");
class ln {
  constructor(t) {
    this.key = t || ao();
  }
  static fromPrivateKey(t) {
    return new ln(t);
  }
  static fromHex(t) {
    return new ln(S.decode(t));
  }
  static fromRandomBytes() {
    return new ln(ao());
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
        if (!r.sign(this.key, as))
          throw new Error("Failed to sign transaction");
      } catch (o) {
        if (!(o instanceof Error && o.message.includes("No inputs signed"))) throw o;
      }
      return r;
    }
    for (const o of n)
      if (!r.signIdx(this.key, o, as))
        throw new Error(`Failed to sign input #${o}`);
    return r;
  }
  compressedPublicKey() {
    return Promise.resolve(wc(this.key, !0));
  }
  xOnlyPublicKey() {
    return Promise.resolve(qo(this.key));
  }
  signerSession() {
    return bn.random();
  }
  async signMessage(t, n = "schnorr") {
    return n === "ecdsa" ? Zf(t, this.key, { prehash: !1 }) : rd.signAsync(t, this.key);
  }
  async toReadonly() {
    return new $r(await this.compressedPublicKey());
  }
}
class $r {
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
    return new $r(t);
  }
  xOnlyPublicKey() {
    return Promise.resolve(this.publicKey.slice(1));
  }
  compressedPublicKey() {
    return Promise.resolve(this.publicKey);
  }
}
class Ye {
  constructor(t, n, r, o = 0) {
    if (this.serverPubKey = t, this.vtxoTaprootKey = n, this.hrp = r, this.version = o, t.length !== 32)
      throw new Error("Invalid server public key length, expected 32 bytes, got " + t.length);
    if (n.length !== 32)
      throw new Error("Invalid vtxo taproot public key length, expected 32 bytes, got " + n.length);
  }
  static decode(t) {
    const n = Re.decodeUnsafe(t, 1023);
    if (!n)
      throw new Error("Invalid address");
    const r = new Uint8Array(Re.fromWords(n.words));
    if (r.length !== 65)
      throw new Error("Invalid data length, expected 65 bytes, got " + r.length);
    const o = r[0], i = r.slice(1, 33), s = r.slice(33, 65);
    return new Ye(i, s, n.prefix, o);
  }
  encode() {
    const t = new Uint8Array(65);
    t[0] = this.version, t.set(this.serverPubKey, 1), t.set(this.vtxoTaprootKey, 33);
    const n = Re.toWords(t);
    return Re.encode(this.hrp, n, 1023);
  }
  // pkScript is the script that should be used to send non-dust funds to the address
  get pkScript() {
    return C.encode(["OP_1", this.vtxoTaprootKey]);
  }
  // subdustPkScript is the script that should be used to send sub-dust funds to the address
  get subdustPkScript() {
    return C.encode(["RETURN", this.vtxoTaprootKey]);
  }
}
const gr = Xo(void 0, !0);
var ot;
(function(e) {
  e.Multisig = "multisig", e.CSVMultisig = "csv-multisig", e.ConditionCSVMultisig = "condition-csv-multisig", e.ConditionMultisig = "condition-multisig", e.CLTVMultisig = "cltv-multisig";
})(ot || (ot = {}));
function aa(e) {
  const t = [
    Dt,
    vt,
    En,
    wr,
    Ze
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
        type: ot.Multisig,
        params: c,
        script: pf(c.pubkeys.length, c.pubkeys).script
      };
    const a = [];
    for (let u = 0; u < c.pubkeys.length; u++)
      a.push(c.pubkeys[u]), u < c.pubkeys.length - 1 ? a.push("CHECKSIGVERIFY") : a.push("CHECKSIG");
    return {
      type: ot.Multisig,
      params: c,
      script: C.encode(a)
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
    const a = C.decode(c), u = [];
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
    if (S.encode(d.script) !== S.encode(c))
      throw new Error("Invalid script format: script reconstruction mismatch");
    return {
      type: ot.Multisig,
      params: { pubkeys: u, type: t.CHECKSIGADD },
      script: c
    };
  }
  function i(c) {
    const a = C.decode(c), u = [];
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
    if (S.encode(f.script) !== S.encode(c))
      throw new Error("Invalid script format: script reconstruction mismatch");
    return {
      type: ot.Multisig,
      params: { pubkeys: u, type: t.CHECKSIG },
      script: c
    };
  }
  function s(c) {
    return c.type === ot.Multisig;
  }
  e.is = s;
})(Dt || (Dt = {}));
var vt;
(function(e) {
  function t(o) {
    for (const u of o.pubkeys)
      if (u.length !== 32)
        throw new Error(`Invalid pubkey length: expected 32, got ${u.length}`);
    const i = gr.encode(BigInt(vo.encode(o.timelock.type === "blocks" ? { blocks: Number(o.timelock.value) } : { seconds: Number(o.timelock.value) }))), s = [
      i.length === 1 ? i[0] : i,
      "CHECKSEQUENCEVERIFY",
      "DROP"
    ], c = Dt.encode(o), a = new Uint8Array([
      ...C.encode(s),
      ...c.script
    ]);
    return {
      type: ot.CSVMultisig,
      params: o,
      script: a
    };
  }
  e.encode = t;
  function n(o) {
    if (o.length === 0)
      throw new Error("Failed to decode: script is empty");
    const i = C.decode(o);
    if (i.length < 3)
      throw new Error("Invalid script: too short (expected at least 3)");
    const s = i[0];
    if (typeof s == "string")
      throw new Error("Invalid script: expected sequence number");
    if (i[1] !== "CHECKSEQUENCEVERIFY" || i[2] !== "DROP")
      throw new Error("Invalid script: expected CHECKSEQUENCEVERIFY DROP");
    const c = new Uint8Array(C.encode(i.slice(3)));
    let a;
    try {
      a = Dt.decode(c);
    } catch (h) {
      throw new Error(`Invalid multisig script: ${h instanceof Error ? h.message : String(h)}`);
    }
    let u;
    typeof s == "number" ? u = s : u = Number(gr.decode(s));
    const f = vo.decode(u), d = f.blocks !== void 0 ? { type: "blocks", value: BigInt(f.blocks) } : { type: "seconds", value: BigInt(f.seconds) }, l = t({
      timelock: d,
      ...a.params
    });
    if (S.encode(l.script) !== S.encode(o))
      throw new Error("Invalid script format: script reconstruction mismatch");
    return {
      type: ot.CSVMultisig,
      params: {
        timelock: d,
        ...a.params
      },
      script: o
    };
  }
  e.decode = n;
  function r(o) {
    return o.type === ot.CSVMultisig;
  }
  e.is = r;
})(vt || (vt = {}));
var En;
(function(e) {
  function t(o) {
    const i = new Uint8Array([
      ...o.conditionScript,
      ...C.encode(["VERIFY"]),
      ...vt.encode(o).script
    ]);
    return {
      type: ot.ConditionCSVMultisig,
      params: o,
      script: i
    };
  }
  e.encode = t;
  function n(o) {
    if (o.length === 0)
      throw new Error("Failed to decode: script is empty");
    const i = C.decode(o);
    if (i.length < 1)
      throw new Error("Invalid script: too short (expected at least 1)");
    let s = -1;
    for (let d = i.length - 1; d >= 0; d--)
      i[d] === "VERIFY" && (s = d);
    if (s === -1)
      throw new Error("Invalid script: missing VERIFY operation");
    const c = new Uint8Array(C.encode(i.slice(0, s))), a = new Uint8Array(C.encode(i.slice(s + 1)));
    let u;
    try {
      u = vt.decode(a);
    } catch (d) {
      throw new Error(`Invalid CSV multisig script: ${d instanceof Error ? d.message : String(d)}`);
    }
    const f = t({
      conditionScript: c,
      ...u.params
    });
    if (S.encode(f.script) !== S.encode(o))
      throw new Error("Invalid script format: script reconstruction mismatch");
    return {
      type: ot.ConditionCSVMultisig,
      params: {
        conditionScript: c,
        ...u.params
      },
      script: o
    };
  }
  e.decode = n;
  function r(o) {
    return o.type === ot.ConditionCSVMultisig;
  }
  e.is = r;
})(En || (En = {}));
var wr;
(function(e) {
  function t(o) {
    const i = new Uint8Array([
      ...o.conditionScript,
      ...C.encode(["VERIFY"]),
      ...Dt.encode(o).script
    ]);
    return {
      type: ot.ConditionMultisig,
      params: o,
      script: i
    };
  }
  e.encode = t;
  function n(o) {
    if (o.length === 0)
      throw new Error("Failed to decode: script is empty");
    const i = C.decode(o);
    if (i.length < 1)
      throw new Error("Invalid script: too short (expected at least 1)");
    let s = -1;
    for (let d = i.length - 1; d >= 0; d--)
      i[d] === "VERIFY" && (s = d);
    if (s === -1)
      throw new Error("Invalid script: missing VERIFY operation");
    const c = new Uint8Array(C.encode(i.slice(0, s))), a = new Uint8Array(C.encode(i.slice(s + 1)));
    let u;
    try {
      u = Dt.decode(a);
    } catch (d) {
      throw new Error(`Invalid multisig script: ${d instanceof Error ? d.message : String(d)}`);
    }
    const f = t({
      conditionScript: c,
      ...u.params
    });
    if (S.encode(f.script) !== S.encode(o))
      throw new Error("Invalid script format: script reconstruction mismatch");
    return {
      type: ot.ConditionMultisig,
      params: {
        conditionScript: c,
        ...u.params
      },
      script: o
    };
  }
  e.decode = n;
  function r(o) {
    return o.type === ot.ConditionMultisig;
  }
  e.is = r;
})(wr || (wr = {}));
var Ze;
(function(e) {
  function t(o) {
    const i = gr.encode(o.absoluteTimelock), s = [
      i.length === 1 ? i[0] : i,
      "CHECKLOCKTIMEVERIFY",
      "DROP"
    ], c = C.encode(s), a = new Uint8Array([
      ...c,
      ...Dt.encode(o).script
    ]);
    return {
      type: ot.CLTVMultisig,
      params: o,
      script: a
    };
  }
  e.encode = t;
  function n(o) {
    if (o.length === 0)
      throw new Error("Failed to decode: script is empty");
    const i = C.decode(o);
    if (i.length < 3)
      throw new Error("Invalid script: too short (expected at least 3)");
    const s = i[0];
    if (typeof s == "string" || typeof s == "number")
      throw new Error("Invalid script: expected locktime number");
    if (i[1] !== "CHECKLOCKTIMEVERIFY" || i[2] !== "DROP")
      throw new Error("Invalid script: expected CHECKLOCKTIMEVERIFY DROP");
    const c = new Uint8Array(C.encode(i.slice(3)));
    let a;
    try {
      a = Dt.decode(c);
    } catch (d) {
      throw new Error(`Invalid multisig script: ${d instanceof Error ? d.message : String(d)}`);
    }
    const u = gr.decode(s), f = t({
      absoluteTimelock: u,
      ...a.params
    });
    if (S.encode(f.script) !== S.encode(o))
      throw new Error("Invalid script format: script reconstruction mismatch");
    return {
      type: ot.CLTVMultisig,
      params: {
        absoluteTimelock: u,
        ...a.params
      },
      script: o
    };
  }
  e.decode = n;
  function r(o) {
    return o.type === ot.CLTVMultisig;
  }
  e.is = r;
})(Ze || (Ze = {}));
const us = wn.tapTree[2];
function hn(e) {
  return e[1].subarray(0, e[1].length - 1);
}
class Ot {
  static decode(t) {
    const r = us.decode(t).map((o) => o.script);
    return new Ot(r);
  }
  constructor(t) {
    this.scripts = t;
    const n = t.length % 2 !== 0 ? t.slice().reverse() : t, r = vc(n.map((i) => ({
      script: i,
      leafVersion: yn
    }))), o = hf(Zo, r, void 0, !0);
    if (!o.tapLeafScript || o.tapLeafScript.length !== t.length)
      throw new Error("invalid scripts");
    this.leaves = o.tapLeafScript, this.tweakedPublicKey = o.tweakedPubkey;
  }
  encode() {
    return us.encode(this.scripts.map((n) => ({
      depth: 1,
      version: yn,
      script: n
    })));
  }
  address(t, n) {
    return new Ye(n, this.tweakedPublicKey, t);
  }
  get pkScript() {
    return C.encode(["OP_1", this.tweakedPublicKey]);
  }
  onchainAddress(t) {
    return Ie(t).encode({
      type: "tr",
      pubkey: this.tweakedPublicKey
    });
  }
  findLeaf(t) {
    const n = this.leaves.find((r) => S.encode(hn(r)) === t);
    if (!n)
      throw new Error(`leaf '${t}' not found`);
    return n;
  }
  exitPaths() {
    const t = [];
    for (const n of this.leaves)
      try {
        const r = vt.decode(hn(n));
        t.push(r);
        continue;
      } catch {
        try {
          const o = En.decode(hn(n));
          t.push(o);
        } catch {
          continue;
        }
      }
    return t;
  }
}
var fs;
(function(e) {
  class t extends Ot {
    constructor(o) {
      n(o);
      const { sender: i, receiver: s, server: c, preimageHash: a, refundLocktime: u, unilateralClaimDelay: f, unilateralRefundDelay: d, unilateralRefundWithoutReceiverDelay: l } = o, h = ld(a), p = wr.encode({
        conditionScript: h,
        pubkeys: [s, c]
      }).script, g = Dt.encode({
        pubkeys: [i, s, c]
      }).script, y = Ze.encode({
        absoluteTimelock: u,
        pubkeys: [i, c]
      }).script, x = En.encode({
        conditionScript: h,
        timelock: f,
        pubkeys: [s]
      }).script, b = vt.encode({
        timelock: d,
        pubkeys: [i, s]
      }).script, v = vt.encode({
        timelock: l,
        pubkeys: [i]
      }).script;
      super([
        p,
        g,
        y,
        x,
        b,
        v
      ]), this.options = o, this.claimScript = S.encode(p), this.refundScript = S.encode(g), this.refundWithoutReceiverScript = S.encode(y), this.unilateralClaimScript = S.encode(x), this.unilateralRefundScript = S.encode(b), this.unilateralRefundWithoutReceiverScript = S.encode(v);
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
})(fs || (fs = {}));
function ld(e) {
  return C.encode(["HASH160", e, "EQUAL"]);
}
var yr;
(function(e) {
  class t extends Ot {
    constructor(r) {
      const { pubKey: o, serverPubKey: i, csvTimelock: s = t.DEFAULT_TIMELOCK } = r, c = Dt.encode({
        pubkeys: [o, i]
      }).script, a = vt.encode({
        timelock: s,
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
})(yr || (yr = {}));
var Xe;
(function(e) {
  e.TxSent = "SENT", e.TxReceived = "RECEIVED";
})(Xe || (Xe = {}));
function te(e) {
  return !e.isSpent;
}
function di(e) {
  return e.virtualStatus.state === "swept" && te(e);
}
function ua(e) {
  if (e.virtualStatus.state === "swept")
    return !0;
  const t = e.virtualStatus.batchExpiry;
  return !t || new Date(t).getFullYear() < 2025 ? !1 : t <= Date.now();
}
function fa(e, t) {
  return e.value < t;
}
async function* Io(e) {
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
class da extends Error {
  constructor(t, n, r, o) {
    super(n), this.code = t, this.message = n, this.name = r, this.metadata = o;
  }
}
function hd(e) {
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
      return "metadata" in n && pd(n.metadata) && (c = n.metadata), new da(o, i, s, c);
    }
    return;
  } catch {
    return;
  }
}
function pd(e) {
  return typeof e == "object" && e !== null && !Array.isArray(e);
}
var ue;
(function(e) {
  function t(r, o, i = []) {
    if (typeof r != "string" && (r = n(r)), o.length == 0)
      throw new Error("intent proof requires at least one input");
    bd(o), Sd(i);
    const s = Td(r, o[0].witnessUtxo.script);
    return vd(s, o, i);
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
})(ue || (ue = {}));
const gd = new Uint8Array([it.RETURN]), wd = new Uint8Array(32).fill(0), yd = 4294967295, md = "ark-intent-proof-message";
function xd(e) {
  if (e.index === void 0)
    throw new Error("intent proof input requires index");
  if (e.txid === void 0)
    throw new Error("intent proof input requires txid");
  if (e.witnessUtxo === void 0)
    throw new Error("intent proof input requires witness utxo");
  return !0;
}
function bd(e) {
  return e.forEach(xd), !0;
}
function Ed(e) {
  if (e.amount === void 0)
    throw new Error("intent proof output requires amount");
  if (e.script === void 0)
    throw new Error("intent proof output requires script");
  return !0;
}
function Sd(e) {
  return e.forEach(Ed), !0;
}
function Td(e, t) {
  const n = kd(e), r = new pe({
    version: 0
  });
  return r.addInput({
    txid: wd,
    // zero hash
    index: yd,
    sequence: 0
  }), r.addOutput({
    amount: 0n,
    script: t
  }), r.updateInput(0, {
    finalScriptSig: C.encode(["OP_0", n])
  }), r;
}
function vd(e, t, n) {
  const r = t[0], o = t.map((s) => s.sequence || 0).reduce((s, c) => Math.max(s, c), 0), i = new pe({
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
    sighashType: Be.ALL
  });
  for (const [s, c] of t.entries())
    i.addInput({
      ...c,
      sighashType: Be.ALL
    }), c.unknown?.length && i.updateInput(s + 1, {
      unknown: c.unknown
    });
  n.length === 0 && (n = [
    {
      amount: 0n,
      script: gd
    }
  ]);
  for (const s of n)
    i.addOutput({
      amount: s.amount,
      script: s.script
    });
  return i;
}
function kd(e) {
  return Ut.utils.taggedHash(md, new TextEncoder().encode(e));
}
var ct;
(function(e) {
  e.BatchStarted = "batch_started", e.BatchFinalization = "batch_finalization", e.BatchFinalized = "batch_finalized", e.BatchFailed = "batch_failed", e.TreeSigningStarted = "tree_signing_started", e.TreeNonces = "tree_nonces", e.TreeTx = "tree_tx", e.TreeSignature = "tree_signature";
})(ct || (ct = {}));
class la {
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
      const s = await o.text();
      Kt(s, `Failed to submit virtual transaction: ${s}`);
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
      Kt(i, `Failed to finalize offchain transaction: ${i}`);
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
      const i = await r.text();
      Kt(i, `Failed to register intent: ${i}`);
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
    const o = `${this.serverUrl}/v1/batch/tree/submitNonces`, i = await fetch(o, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        batchId: t,
        pubkey: n,
        treeNonces: Ad(r)
      })
    });
    if (!i.ok) {
      const s = await i.text();
      Kt(s, `Failed to submit tree nonces: ${s}`);
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
        treeSignatures: Id(r)
      })
    });
    if (!i.ok) {
      const s = await i.text();
      Kt(s, `Failed to submit tree signatures: ${s}`);
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
      Kt(i, `Failed to submit forfeit transactions: ${o.statusText}`);
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
          for await (const c of Io(i)) {
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
        if (Bo(i)) {
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
          for await (const i of Io(r)) {
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
        if (Bo(r)) {
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
      const i = await r.text();
      Kt(i, `Failed to get pending transactions: ${i}`);
    }
    return (await r.json()).pendingTxs;
  }
  parseSettlementEvent(t) {
    if (t.batchStarted)
      return {
        type: ct.BatchStarted,
        id: t.batchStarted.id,
        intentIdHashes: t.batchStarted.intentIdHashes,
        batchExpiry: BigInt(t.batchStarted.batchExpiry)
      };
    if (t.batchFinalization)
      return {
        type: ct.BatchFinalization,
        id: t.batchFinalization.id,
        commitmentTx: t.batchFinalization.commitmentTx
      };
    if (t.batchFinalized)
      return {
        type: ct.BatchFinalized,
        id: t.batchFinalized.id,
        commitmentTxid: t.batchFinalized.commitmentTxid
      };
    if (t.batchFailed)
      return {
        type: ct.BatchFailed,
        id: t.batchFailed.id,
        reason: t.batchFailed.reason
      };
    if (t.treeSigningStarted)
      return {
        type: ct.TreeSigningStarted,
        id: t.treeSigningStarted.id,
        cosignersPublicKeys: t.treeSigningStarted.cosignersPubkeys,
        unsignedCommitmentTx: t.treeSigningStarted.unsignedCommitmentTx
      };
    if (t.treeNoncesAggregated)
      return null;
    if (t.treeNonces)
      return {
        type: ct.TreeNonces,
        id: t.treeNonces.id,
        topic: t.treeNonces.topic,
        txid: t.treeNonces.txid,
        nonces: Bd(t.treeNonces.nonces)
        // pubkey -> public nonce
      };
    if (t.treeTx) {
      const n = Object.fromEntries(Object.entries(t.treeTx.children).map(([r, o]) => [parseInt(r), o]));
      return {
        type: ct.TreeTx,
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
      type: ct.TreeSignature,
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
        spentVtxos: t.commitmentTx.spentVtxos.map(Dn),
        spendableVtxos: t.commitmentTx.spendableVtxos.map(Dn),
        checkpointTxs: t.commitmentTx.checkpointTxs
      }
    } : t.arkTx ? {
      arkTx: {
        txid: t.arkTx.txid,
        tx: t.arkTx.tx,
        spentVtxos: t.arkTx.spentVtxos.map(Dn),
        spendableVtxos: t.arkTx.spendableVtxos.map(Dn),
        checkpointTxs: t.arkTx.checkpointTxs
      }
    } : (t.heartbeat || console.warn("Unknown transaction notification type:", t), null);
  }
}
function Ad(e) {
  const t = {};
  for (const [n, r] of e)
    t[n] = S.encode(r.pubNonce);
  return t;
}
function Id(e) {
  const t = {};
  for (const [n, r] of e)
    t[n] = S.encode(r.encode());
  return t;
}
function Bd(e) {
  return new Map(Object.entries(e).map(([t, n]) => {
    if (typeof n != "string")
      throw new Error("invalid nonce");
    return [t, { pubNonce: S.decode(n) }];
  }));
}
function Bo(e) {
  const t = (n) => n instanceof Error ? n.name === "TypeError" && n.message === "Failed to fetch" || n.name === "HeadersTimeoutError" || n.name === "BodyTimeoutError" || n.code === "UND_ERR_HEADERS_TIMEOUT" || n.code === "UND_ERR_BODY_TIMEOUT" : !1;
  return t(e) || t(e.cause);
}
function Dn(e) {
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
  throw hd(n) ?? new Error(t);
}
class Zn {
  constructor(t, n = /* @__PURE__ */ new Map()) {
    this.root = t, this.children = n;
  }
  static create(t) {
    if (t.length === 0)
      throw new Error("empty chunks");
    const n = /* @__PURE__ */ new Map();
    for (const i of t) {
      const s = Ud(i), c = s.tx.id;
      n.set(c, s);
    }
    const r = [];
    for (const [i] of n) {
      let s = !1;
      for (const [c, a] of n)
        if (c !== i && (s = Od(a, i), s))
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
    const o = ha(r[0], n);
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
      if (!i.txid || S.encode(i.txid) !== s || i.index !== r)
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
function Od(e, t) {
  return Object.values(e.children).includes(t);
}
function ha(e, t) {
  const n = t.get(e);
  if (!n)
    return null;
  const r = n.tx, o = /* @__PURE__ */ new Map();
  for (const [i, s] of Object.entries(n.children)) {
    const c = parseInt(i), a = ha(s, t);
    a && o.set(c, a);
  }
  return new Zn(r, o);
}
function Ud(e) {
  return { tx: Ct.fromPSBT(lt.decode(e.tx)), children: e.children };
}
var Oo;
(function(e) {
  let t;
  (function(r) {
    r.Start = "start", r.BatchStarted = "batch_started", r.TreeSigningStarted = "tree_signing_started", r.TreeNoncesAggregated = "tree_nonces_aggregated", r.BatchFinalization = "batch_finalization";
  })(t || (t = {}));
  async function n(r, o, i = {}) {
    const { abortController: s, skipVtxoTreeSigning: c = !1, eventCallback: a } = i;
    let u = t.Start;
    const f = [], d = [];
    let l, h;
    for await (const p of r) {
      if (s?.signal.aborted)
        throw new Error("canceled");
      switch (a && a(p).catch(() => {
      }), p.type) {
        case ct.BatchStarted: {
          const g = p, { skip: y } = await o.onBatchStarted(g);
          y || (u = t.BatchStarted, c && (u = t.TreeNoncesAggregated));
          continue;
        }
        case ct.BatchFinalized: {
          if (u !== t.BatchFinalization)
            continue;
          return o.onBatchFinalized && await o.onBatchFinalized(p), p.commitmentTxid;
        }
        case ct.BatchFailed: {
          if (o.onBatchFailed) {
            await o.onBatchFailed(p);
            continue;
          }
          throw new Error(p.reason);
        }
        case ct.TreeTx: {
          if (u !== t.BatchStarted && u !== t.TreeNoncesAggregated)
            continue;
          p.batchIndex === 0 ? f.push(p.chunk) : d.push(p.chunk), o.onTreeTxEvent && await o.onTreeTxEvent(p);
          continue;
        }
        case ct.TreeSignature: {
          if (u !== t.TreeNoncesAggregated)
            continue;
          if (!l)
            throw new Error("vtxo tree not initialized");
          const g = S.decode(p.signature);
          l.update(p.txid, (y) => {
            y.updateInput(0, {
              tapKeySig: g
            });
          }), o.onTreeSignatureEvent && await o.onTreeSignatureEvent(p);
          continue;
        }
        case ct.TreeSigningStarted: {
          if (u !== t.BatchStarted)
            continue;
          l = Zn.create(f);
          const { skip: g } = await o.onTreeSigningStarted(p, l);
          g || (u = t.TreeSigningStarted);
          continue;
        }
        case ct.TreeNonces: {
          if (u !== t.TreeSigningStarted)
            continue;
          const { fullySigned: g } = await o.onTreeNonces(p);
          g && (u = t.TreeNoncesAggregated);
          continue;
        }
        case ct.BatchFinalization: {
          if (u !== t.TreeNoncesAggregated)
            continue;
          if (!l && f.length > 0 && (l = Zn.create(f)), !l && !c)
            throw new Error("vtxo tree not initialized");
          d.length > 0 && (h = Zn.create(d)), await o.onBatchFinalization(p, l, h), u = t.BatchFinalization;
          continue;
        }
        default:
          continue;
      }
    }
    throw new Error("event stream closed");
  }
  e.join = n;
})(Oo || (Oo = {}));
function pa(e, t, n) {
  const r = [];
  let o = [...t];
  for (const s of [...e, ...t]) {
    if (s.virtualStatus.state !== "preconfirmed" && s.virtualStatus.commitmentTxIds && s.virtualStatus.commitmentTxIds.some((h) => n.has(h)))
      continue;
    const c = Nd(o, s);
    o = ds(o, c);
    const a = Hn(c);
    if (s.value <= a)
      continue;
    const u = Pd(o, s);
    o = ds(o, u);
    const f = Hn(u);
    if (s.value <= f)
      continue;
    const d = {
      commitmentTxid: "",
      boardingTxid: "",
      arkTxid: ""
    };
    let l = s.virtualStatus.state !== "preconfirmed";
    s.virtualStatus.state === "preconfirmed" ? (d.arkTxid = s.txid, s.spentBy && (l = !0)) : d.commitmentTxid = s.virtualStatus.commitmentTxIds?.[0] || "", r.push({
      key: d,
      amount: s.value - a - f,
      type: Xe.TxReceived,
      createdAt: s.createdAt.getTime(),
      settled: l
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
    const a = Rd([...e, ...t], s), u = Hn(a), f = Hn(c);
    if (f <= u)
      continue;
    const d = Cd(a, c), l = {
      commitmentTxid: "",
      boardingTxid: "",
      arkTxid: ""
    };
    d.virtualStatus.state === "preconfirmed" ? l.arkTxid = u === 0 ? d.arkTxId : d.txid : l.commitmentTxid = d.virtualStatus.commitmentTxIds?.[0] || "", r.push({
      key: l,
      amount: f - u,
      type: Xe.TxSent,
      createdAt: d.createdAt.getTime(),
      settled: !0
    });
  }
  return r;
}
function Nd(e, t) {
  return t.virtualStatus.state === "preconfirmed" ? [] : e.filter((n) => n.settledBy ? t.virtualStatus.commitmentTxIds?.includes(n.settledBy) ?? !1 : !1);
}
function Pd(e, t) {
  return e.filter((n) => n.arkTxId ? n.arkTxId === t.txid : !1);
}
function Rd(e, t) {
  return e.filter((n) => n.virtualStatus.state !== "preconfirmed" && n.virtualStatus.commitmentTxIds?.includes(t) ? !0 : n.txid === t);
}
function Hn(e) {
  return e.reduce((t, n) => t + n.value, 0);
}
function Cd(e, t) {
  return e.length === 0 ? t[0] : e[0];
}
function ds(e, t) {
  return e.filter((n) => {
    for (const r of t)
      if (n.txid === r.txid && n.vout === r.vout)
        return !1;
    return !0;
  });
}
const $d = (e) => Ld[e], Ld = {
  bitcoin: cn(ze, "ark"),
  testnet: cn(Cn, "tark"),
  signet: cn(Cn, "tark"),
  mutinynet: cn(Cn, "tark"),
  regtest: cn({
    ...Cn,
    bech32: "bcrt",
    pubKeyHash: 111,
    scriptHash: 196
  }, "tark")
};
function cn(e, t) {
  return {
    ...e,
    hrp: t
  };
}
const _d = {
  bitcoin: "https://mempool.space/api",
  testnet: "https://mempool.space/testnet/api",
  signet: "https://mempool.space/signet/api",
  mutinynet: "https://mutinynet.com/api",
  regtest: "http://localhost:3000"
};
class Vd {
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
      const a = async () => (await Promise.all(t.map((h) => this.getTransactions(h)))).flat(), u = await a(), f = (l) => `${l.txid}_${l.status.block_time}`, d = new Set(u.map(f));
      r = setInterval(async () => {
        try {
          const h = (await a()).filter((p) => !d.has(f(p)));
          h.length > 0 && (h.forEach((p) => d.add(f(p))), n(h));
        } catch (l) {
          console.error("Error in polling mechanism:", l);
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
          for (const l in d)
            for (const h of [
              "mempool",
              "confirmed",
              "removed"
            ])
              d[l][h] && u.push(...d[l][h].filter(Hd));
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
    if (!Dd(n))
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
function Dd(e) {
  return Array.isArray(e) && e.every((t) => {
    t && typeof t == "object" && typeof t.id == "string" && t.id.length > 0 && typeof t.height == "number" && t.height >= 0 && typeof t.mediantime == "number" && t.mediantime > 0;
  });
}
const Hd = (e) => typeof e.txid == "string" && Array.isArray(e.vout) && e.vout.every((t) => typeof t.scriptpubkey_address == "string" && typeof t.value == "number") && typeof e.status == "object" && typeof e.status.confirmed == "boolean", Fd = 0n, Kd = new Uint8Array([81, 2, 78, 115]), li = {
  script: Kd,
  amount: Fd
};
S.encode(li.script);
function Md(e, t, n) {
  const r = new pe({
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
  }), r.addOutput(li), r;
}
const Wd = new Error("invalid settlement transaction outputs"), zd = new Error("empty tree"), jd = new Error("invalid number of inputs"), qr = new Error("wrong settlement txid"), Gd = new Error("invalid amount"), qd = new Error("no leaves"), Yd = new Error("invalid taproot script"), ls = new Error("invalid round transaction outputs"), Zd = new Error("wrong commitment txid"), Xd = new Error("missing cosigners public keys"), Yr = 0, hs = 1;
function Qd(e, t) {
  if (t.validate(), t.root.inputsLength !== 1)
    throw jd;
  const n = t.root.getInput(0), r = Ct.fromPSBT(lt.decode(e));
  if (r.outputsLength <= hs)
    throw Wd;
  const o = r.id;
  if (!n.txid || S.encode(n.txid) !== o || n.index !== hs)
    throw qr;
}
function Jd(e, t, n) {
  if (t.outputsLength < Yr + 1)
    throw ls;
  const r = t.getOutput(Yr)?.amount;
  if (!r)
    throw ls;
  if (!e.root)
    throw zd;
  const o = e.root.getInput(0), i = t.id;
  if (!o.txid || S.encode(o.txid) !== i || o.index !== Yr)
    throw Zd;
  let s = 0n;
  for (let a = 0; a < e.root.outputsLength; a++) {
    const u = e.root.getOutput(a);
    u?.amount && (s += u.amount);
  }
  if (s !== r)
    throw Gd;
  if (e.leaves().length === 0)
    throw qd;
  e.validate();
  for (const a of e.iterator())
    for (const [u, f] of a.children) {
      const d = a.root.getOutput(u);
      if (!d?.script)
        throw new Error(`parent output ${u} not found`);
      const l = d.script.slice(2);
      if (l.length !== 32)
        throw new Error(`parent output ${u} has invalid script`);
      const h = ko(f.root, 0, Ao);
      if (h.length === 0)
        throw Xd;
      const p = h.map((y) => y.key), { finalKey: g } = si(p, !0, {
        taprootTweak: n
      });
      if (!g || S.encode(g.slice(1)) !== S.encode(l))
        throw Yd;
    }
}
function tl(e, t, n) {
  let r = !1;
  for (const [s, c] of t.entries()) {
    if (!c.script)
      throw new Error(`missing output script ${s}`);
    if (C.decode(c.script)[0] === "RETURN") {
      if (r)
        throw new Error("multiple OP_RETURN outputs");
      r = !0;
    }
  }
  const o = e.map((s) => el(s, n));
  return {
    arkTx: ga(o.map((s) => s.input), t),
    checkpoints: o.map((s) => s.tx)
  };
}
function ga(e, t) {
  let n = 0n;
  for (const o of e) {
    const i = aa(hn(o.tapLeafScript));
    if (Ze.is(i)) {
      if (n !== 0n && ps(n) !== ps(i.params.absoluteTimelock))
        throw new Error("cannot mix seconds and blocks locktime");
      i.params.absoluteTimelock > n && (n = i.params.absoluteTimelock);
    }
  }
  const r = new pe({
    version: 3,
    lockTime: Number(n)
  });
  for (const [o, i] of e.entries())
    r.addInput({
      txid: i.txid,
      index: i.vout,
      sequence: n ? ni - 1 : void 0,
      witnessUtxo: {
        script: Ot.decode(i.tapTree).pkScript,
        amount: BigInt(i.value)
      },
      tapLeafScript: [i.tapLeafScript]
    }), ud(r, o, ca, i.tapTree);
  for (const o of t)
    r.addOutput(o);
  return r.addOutput(li), r;
}
function el(e, t) {
  const n = aa(hn(e.tapLeafScript)), r = new Ot([
    t.script,
    n.script
  ]), o = ga([e], [
    {
      amount: BigInt(e.value),
      script: r.pkScript
    }
  ]), i = r.findLeaf(S.encode(n.script)), s = {
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
const nl = 500000000n;
function ps(e) {
  return e >= nl;
}
function rl(e, t) {
  if (!e.status.block_time)
    return !1;
  if (t.value === 0n)
    return !0;
  if (t.type === "blocks")
    return !1;
  const n = BigInt(Math.floor(Date.now() / 1e3));
  return BigInt(Math.floor(e.status.block_time)) + t.value <= n;
}
const ol = 4320 * 60 * 1e3, il = {
  thresholdMs: ol
  // 3 days
};
class nt {
  constructor(t, n, r = nt.DefaultHRP) {
    this.preimage = t, this.value = n, this.HRP = r, this.vout = 0;
    const o = pt(this.preimage);
    this.vtxoScript = new Ot([al(o)]);
    const i = this.vtxoScript.leaves[0];
    this.txid = S.encode(new Uint8Array(o).reverse()), this.tapTree = this.vtxoScript.encode(), this.forfeitTapLeafScript = i, this.intentTapLeafScript = i, this.value = n, this.status = { confirmed: !0 }, this.extraWitness = [this.preimage];
  }
  encode() {
    const t = new Uint8Array(nt.Length);
    return t.set(this.preimage, 0), sl(t, this.value, this.preimage.length), t;
  }
  static decode(t, n = nt.DefaultHRP) {
    if (t.length !== nt.Length)
      throw new Error(`invalid data length: expected ${nt.Length} bytes, got ${t.length}`);
    const r = t.subarray(0, nt.PreimageLength), o = cl(t, nt.PreimageLength);
    return new nt(r, o, n);
  }
  static fromString(t, n = nt.DefaultHRP) {
    if (t = t.trim(), !t.startsWith(n))
      throw new Error(`invalid human-readable part: expected ${n} prefix (note '${t}')`);
    const r = t.slice(n.length), o = oo.decode(r);
    if (o.length === 0)
      throw new Error("failed to decode base58 string");
    return nt.decode(o, n);
  }
  toString() {
    return this.HRP + oo.encode(this.encode());
  }
}
nt.DefaultHRP = "arknote";
nt.PreimageLength = 32;
nt.ValueLength = 4;
nt.Length = nt.PreimageLength + nt.ValueLength;
nt.FakeOutpointIndex = 0;
function sl(e, t, n) {
  new DataView(e.buffer, e.byteOffset + n, 4).setUint32(0, t, !1);
}
function cl(e, t) {
  return new DataView(e.buffer, e.byteOffset + t, 4).getUint32(0, !1);
}
function al(e) {
  return C.encode(["SHA256", e, "EQUAL"]);
}
var Uo;
(function(e) {
  e[e.INDEXER_TX_TYPE_UNSPECIFIED = 0] = "INDEXER_TX_TYPE_UNSPECIFIED", e[e.INDEXER_TX_TYPE_RECEIVED = 1] = "INDEXER_TX_TYPE_RECEIVED", e[e.INDEXER_TX_TYPE_SENT = 2] = "INDEXER_TX_TYPE_SENT";
})(Uo || (Uo = {}));
var De;
(function(e) {
  e.UNSPECIFIED = "INDEXER_CHAINED_TX_TYPE_UNSPECIFIED", e.COMMITMENT = "INDEXER_CHAINED_TX_TYPE_COMMITMENT", e.ARK = "INDEXER_CHAINED_TX_TYPE_ARK", e.TREE = "INDEXER_CHAINED_TX_TYPE_TREE", e.CHECKPOINT = "INDEXER_CHAINED_TX_TYPE_CHECKPOINT";
})(De || (De = {}));
class wa {
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
    if (!Nt.isVtxoTreeResponse(s))
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
    if (!Nt.isVtxoTreeLeavesResponse(s))
      throw new Error("Invalid vtxos tree leaves data received");
    return s;
  }
  async getBatchSweepTransactions(t) {
    const n = `${this.serverUrl}/v1/indexer/batch/${t.txid}/${t.vout}/sweepTxs`, r = await fetch(n);
    if (!r.ok)
      throw new Error(`Failed to fetch batch sweep transactions: ${r.statusText}`);
    const o = await r.json();
    if (!Nt.isBatchSweepTransactionsResponse(o))
      throw new Error("Invalid batch sweep transactions data received");
    return o;
  }
  async getCommitmentTx(t) {
    const n = `${this.serverUrl}/v1/indexer/commitmentTx/${t}`, r = await fetch(n);
    if (!r.ok)
      throw new Error(`Failed to fetch commitment tx: ${r.statusText}`);
    const o = await r.json();
    if (!Nt.isCommitmentTx(o))
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
    if (!Nt.isConnectorsResponse(s))
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
    if (!Nt.isForfeitTxsResponse(s))
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
          for await (const s of Io(o)) {
            if (n?.aborted)
              break;
            try {
              const c = JSON.parse(s.data);
              c.event && (yield {
                txid: c.event.txid,
                scripts: c.event.scripts || [],
                newVtxos: (c.event.newVtxos || []).map(Fn),
                spentVtxos: (c.event.spentVtxos || []).map(Fn),
                sweptVtxos: (c.event.sweptVtxos || []).map(Fn),
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
        if (Bo(o)) {
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
    if (!Nt.isVirtualTxsResponse(s))
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
    if (!Nt.isVtxoChainResponse(s))
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
    if (!Nt.isVtxosResponse(i))
      throw new Error("Invalid vtxos data received");
    return {
      vtxos: i.vtxos.map(Fn),
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
function Fn(e) {
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
var Nt;
(function(e) {
  function t(m) {
    return typeof m == "object" && typeof m.totalOutputAmount == "string" && typeof m.totalOutputVtxos == "number" && typeof m.expiresAt == "string" && typeof m.swept == "boolean";
  }
  function n(m) {
    return typeof m == "object" && typeof m.txid == "string" && typeof m.expiresAt == "string" && Object.values(De).includes(m.type) && Array.isArray(m.spends) && m.spends.every((ft) => typeof ft == "string");
  }
  function r(m) {
    return typeof m == "object" && typeof m.startedAt == "string" && typeof m.endedAt == "string" && typeof m.totalInputAmount == "string" && typeof m.totalInputVtxos == "number" && typeof m.totalOutputAmount == "string" && typeof m.totalOutputVtxos == "number" && typeof m.batches == "object" && Object.values(m.batches).every(t);
  }
  e.isCommitmentTx = r;
  function o(m) {
    return typeof m == "object" && typeof m.txid == "string" && typeof m.vout == "number";
  }
  e.isOutpoint = o;
  function i(m) {
    return Array.isArray(m) && m.every(o);
  }
  e.isOutpointArray = i;
  function s(m) {
    return typeof m == "object" && typeof m.txid == "string" && typeof m.children == "object" && Object.values(m.children).every(f) && Object.keys(m.children).every((ft) => Number.isInteger(Number(ft)));
  }
  function c(m) {
    return Array.isArray(m) && m.every(s);
  }
  e.isTxsArray = c;
  function a(m) {
    return typeof m == "object" && typeof m.amount == "string" && typeof m.createdAt == "string" && typeof m.isSettled == "boolean" && typeof m.settledBy == "string" && Object.values(Uo).includes(m.type) && (!m.commitmentTxid && typeof m.virtualTxid == "string" || typeof m.commitmentTxid == "string" && !m.virtualTxid);
  }
  function u(m) {
    return Array.isArray(m) && m.every(a);
  }
  e.isTxHistoryRecordArray = u;
  function f(m) {
    return typeof m == "string" && m.length === 64;
  }
  function d(m) {
    return Array.isArray(m) && m.every(f);
  }
  e.isTxidArray = d;
  function l(m) {
    return typeof m == "object" && o(m.outpoint) && typeof m.createdAt == "string" && (m.expiresAt === null || typeof m.expiresAt == "string") && typeof m.amount == "string" && typeof m.script == "string" && typeof m.isPreconfirmed == "boolean" && typeof m.isSwept == "boolean" && typeof m.isUnrolled == "boolean" && typeof m.isSpent == "boolean" && (!m.spentBy || typeof m.spentBy == "string") && (!m.settledBy || typeof m.settledBy == "string") && (!m.arkTxid || typeof m.arkTxid == "string") && Array.isArray(m.commitmentTxids) && m.commitmentTxids.every(f);
  }
  function h(m) {
    return typeof m == "object" && typeof m.current == "number" && typeof m.next == "number" && typeof m.total == "number";
  }
  function p(m) {
    return typeof m == "object" && Array.isArray(m.vtxoTree) && m.vtxoTree.every(s) && (!m.page || h(m.page));
  }
  e.isVtxoTreeResponse = p;
  function g(m) {
    return typeof m == "object" && Array.isArray(m.leaves) && m.leaves.every(o) && (!m.page || h(m.page));
  }
  e.isVtxoTreeLeavesResponse = g;
  function y(m) {
    return typeof m == "object" && Array.isArray(m.connectors) && m.connectors.every(s) && (!m.page || h(m.page));
  }
  e.isConnectorsResponse = y;
  function x(m) {
    return typeof m == "object" && Array.isArray(m.txids) && m.txids.every(f) && (!m.page || h(m.page));
  }
  e.isForfeitTxsResponse = x;
  function b(m) {
    return typeof m == "object" && Array.isArray(m.sweptBy) && m.sweptBy.every(f);
  }
  e.isSweptCommitmentTxResponse = b;
  function v(m) {
    return typeof m == "object" && Array.isArray(m.sweptBy) && m.sweptBy.every(f);
  }
  e.isBatchSweepTransactionsResponse = v;
  function A(m) {
    return typeof m == "object" && Array.isArray(m.txs) && m.txs.every((ft) => typeof ft == "string") && (!m.page || h(m.page));
  }
  e.isVirtualTxsResponse = A;
  function B(m) {
    return typeof m == "object" && Array.isArray(m.chain) && m.chain.every(n) && (!m.page || h(m.page));
  }
  e.isVtxoChainResponse = B;
  function j(m) {
    return typeof m == "object" && Array.isArray(m.vtxos) && m.vtxos.every(l) && (!m.page || h(m.page));
  }
  e.isVtxosResponse = j;
})(Nt || (Nt = {}));
class ul {
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
const Kn = (e) => `vtxos:${e}`, Mn = (e) => `utxos:${e}`, Zr = (e) => `tx:${e}`, gs = "wallet:state", mr = (e) => e ? S.encode(e) : void 0, Qe = (e) => e ? S.decode(e) : void 0, xr = ([e, t]) => ({
  cb: S.encode(Wt.encode(e)),
  s: S.encode(t)
}), ws = (e) => ({
  ...e,
  tapTree: mr(e.tapTree),
  forfeitTapLeafScript: xr(e.forfeitTapLeafScript),
  intentTapLeafScript: xr(e.intentTapLeafScript),
  extraWitness: e.extraWitness?.map(mr)
}), ys = (e) => ({
  ...e,
  tapTree: mr(e.tapTree),
  forfeitTapLeafScript: xr(e.forfeitTapLeafScript),
  intentTapLeafScript: xr(e.intentTapLeafScript),
  extraWitness: e.extraWitness?.map(mr)
}), br = (e) => {
  const t = Wt.decode(Qe(e.cb)), n = Qe(e.s);
  return [t, n];
}, fl = (e) => ({
  ...e,
  createdAt: new Date(e.createdAt),
  tapTree: Qe(e.tapTree),
  forfeitTapLeafScript: br(e.forfeitTapLeafScript),
  intentTapLeafScript: br(e.intentTapLeafScript),
  extraWitness: e.extraWitness?.map(Qe)
}), dl = (e) => ({
  ...e,
  tapTree: Qe(e.tapTree),
  forfeitTapLeafScript: br(e.forfeitTapLeafScript),
  intentTapLeafScript: br(e.intentTapLeafScript),
  extraWitness: e.extraWitness?.map(Qe)
});
class No {
  constructor(t) {
    this.storage = t;
  }
  async getVtxos(t) {
    const n = await this.storage.getItem(Kn(t));
    if (!n)
      return [];
    try {
      return JSON.parse(n).map(fl);
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
    await this.storage.setItem(Kn(t), JSON.stringify(r.map(ws)));
  }
  async removeVtxo(t, n) {
    const r = await this.getVtxos(t), [o, i] = n.split(":"), s = r.filter((c) => !(c.txid === o && c.vout === parseInt(i, 10)));
    await this.storage.setItem(Kn(t), JSON.stringify(s.map(ws)));
  }
  async clearVtxos(t) {
    await this.storage.removeItem(Kn(t));
  }
  async getUtxos(t) {
    const n = await this.storage.getItem(Mn(t));
    if (!n)
      return [];
    try {
      return JSON.parse(n).map(dl);
    } catch (r) {
      return console.error(`Failed to parse UTXOs for address ${t}:`, r), [];
    }
  }
  async saveUtxos(t, n) {
    const r = await this.getUtxos(t);
    n.forEach((o) => {
      const i = r.findIndex((s) => s.txid === o.txid && s.vout === o.vout);
      i !== -1 ? r[i] = o : r.push(o);
    }), await this.storage.setItem(Mn(t), JSON.stringify(r.map(ys)));
  }
  async removeUtxo(t, n) {
    const r = await this.getUtxos(t), [o, i] = n.split(":"), s = r.filter((c) => !(c.txid === o && c.vout === parseInt(i, 10)));
    await this.storage.setItem(Mn(t), JSON.stringify(s.map(ys)));
  }
  async clearUtxos(t) {
    await this.storage.removeItem(Mn(t));
  }
  async getTransactionHistory(t) {
    const n = Zr(t), r = await this.storage.getItem(n);
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
    await this.storage.setItem(Zr(t), JSON.stringify(r));
  }
  async clearTransactions(t) {
    await this.storage.removeItem(Zr(t));
  }
  async getWalletState() {
    const t = await this.storage.getItem(gs);
    if (!t)
      return null;
    try {
      return JSON.parse(t);
    } catch (n) {
      return console.error("Failed to parse wallet state:", n), null;
    }
  }
  async saveWalletState(t) {
    await this.storage.setItem(gs, JSON.stringify(t));
  }
}
const Xr = (e, t) => `contract:${e}:${t}`, Qr = (e) => `collection:${e}`;
class ll {
  constructor(t) {
    this.storage = t;
  }
  async getContractData(t, n) {
    const r = await this.storage.getItem(Xr(t, n));
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
      await this.storage.setItem(Xr(t, n), JSON.stringify(r));
    } catch (o) {
      throw console.error(`Failed to persist contract data for ${t}:${n}:`, o), o;
    }
  }
  async deleteContractData(t, n) {
    try {
      await this.storage.removeItem(Xr(t, n));
    } catch (r) {
      throw console.error(`Failed to remove contract data for ${t}:${n}:`, r), r;
    }
  }
  async getContractCollection(t) {
    const n = await this.storage.getItem(Qr(t));
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
      await this.storage.setItem(Qr(t), JSON.stringify(c));
    } catch (a) {
      throw console.error(`Failed to persist contract collection ${t}:`, a), a;
    }
  }
  async removeFromContractCollection(t, n, r) {
    if (n == null)
      throw new Error(`Invalid id provided for removal: ${String(n)}`);
    const i = (await this.getContractCollection(t)).filter((s) => s[r] !== n);
    try {
      await this.storage.setItem(Qr(t), JSON.stringify(i));
    } catch (s) {
      throw console.error(`Failed to persist contract collection removal for ${t}:`, s), s;
    }
  }
  async clearContractData() {
    await this.storage.clear();
  }
}
function fe(e, t) {
  return {
    ...t,
    forfeitTapLeafScript: e.offchainTapscript.forfeit(),
    intentTapLeafScript: e.offchainTapscript.forfeit(),
    tapTree: e.offchainTapscript.encode()
  };
}
function Po(e, t) {
  return {
    ...t,
    forfeitTapLeafScript: e.boardingTapscript.forfeit(),
    intentTapLeafScript: e.boardingTapscript.forfeit(),
    tapTree: e.boardingTapscript.encode()
  };
}
function hl(e) {
  return typeof e == "object" && e !== null && "toReadonly" in e && typeof e.toReadonly == "function";
}
class Ae {
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
      return new la(t.arkServerUrl);
    })(), o = t.arkServerUrl || r.serverUrl;
    if (!o)
      throw new Error("Could not determine arkServerUrl from provider");
    const i = t.indexerUrl || o, s = t.indexerProvider || new wa(i), c = await r.getInfo(), a = $d(c.network), u = t.esploraUrl || _d[c.network], f = t.onchainProvider || new Vd(u);
    if (t.exitTimelock) {
      const { value: A, type: B } = t.exitTimelock;
      if (A < 512n && B !== "blocks" || A >= 512n && B !== "seconds")
        throw new Error("invalid exitTimelock");
    }
    const d = t.exitTimelock ?? {
      value: c.unilateralExitDelay,
      type: c.unilateralExitDelay < 512n ? "blocks" : "seconds"
    };
    if (t.boardingTimelock) {
      const { value: A, type: B } = t.boardingTimelock;
      if (A < 512n && B !== "blocks" || A >= 512n && B !== "seconds")
        throw new Error("invalid boardingTimelock");
    }
    const l = t.boardingTimelock ?? {
      value: c.boardingExitDelay,
      type: c.boardingExitDelay < 512n ? "blocks" : "seconds"
    }, h = S.decode(c.signerPubkey).slice(1), p = new yr.Script({
      pubKey: n,
      serverPubKey: h,
      csvTimelock: d
    }), g = new yr.Script({
      pubKey: n,
      serverPubKey: h,
      csvTimelock: l
    }), y = p, x = t.storage || new ul(), b = new No(x), v = new ll(x);
    return {
      arkProvider: r,
      indexerProvider: s,
      onchainProvider: f,
      network: a,
      networkName: c.network,
      serverPubKey: h,
      offchainTapscript: y,
      boardingTapscript: g,
      dustAmount: c.dust,
      walletRepository: b,
      contractRepository: v,
      info: c
    };
  }
  static async create(t) {
    const n = await t.identity.xOnlyPublicKey();
    if (!n)
      throw new Error("Invalid configured public key");
    const r = await Ae.setupWalletConfig(t, n);
    return new Ae(t.identity, r.network, r.onchainProvider, r.indexerProvider, r.serverPubKey, r.offchainTapscript, r.boardingTapscript, r.dustAmount, r.walletRepository, r.contractRepository);
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
    i = n.filter((f) => f.virtualStatus.state === "settled").reduce((f, d) => f + d.value, 0), s = n.filter((f) => f.virtualStatus.state === "preconfirmed").reduce((f, d) => f + d.value, 0), c = n.filter((f) => te(f) && f.virtualStatus.state === "swept").reduce((f, d) => f + d.value, 0);
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
    const n = await this.getAddress(), o = (await this.getVirtualCoins(t)).map((i) => fe(this, i));
    return await this.walletRepository.saveVtxos(n, o), o;
  }
  async getVirtualCoins(t = { withRecoverable: !0, withUnrolled: !1 }) {
    const n = [S.encode(this.offchainTapscript.pkScript)], o = (await this.indexerProvider.getVtxos({ scripts: n })).vtxos;
    let i = o.filter(te);
    if (t.withRecoverable || (i = i.filter((s) => !di(s) && !ua(s))), t.withUnrolled) {
      const s = o.filter((c) => !te(c));
      i.push(...s.filter((c) => c.isUnrolled));
    }
    return i;
  }
  async getTransactionHistory() {
    const t = await this.indexerProvider.getVtxos({
      scripts: [S.encode(this.offchainTapscript.pkScript)]
    }), { boardingTxs: n, commitmentsToIgnore: r } = await this.getBoardingTxs(), o = [], i = [];
    for (const a of t.vtxos)
      te(a) ? o.push(a) : i.push(a);
    const s = pa(o, i, r), c = [...n, ...s];
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
        type: Xe.TxReceived,
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
    const t = await this.getBoardingAddress(), r = (await this.onchainProvider.getCoins(t)).map((o) => Po(this, o));
    return await this.walletRepository.saveUtxos(t, r), r;
  }
  async notifyIncomingFunds(t) {
    const n = await this.getAddress(), r = await this.getBoardingAddress();
    let o, i;
    if (this.onchainProvider && r) {
      const c = (a) => a.vout.findIndex((u) => u.scriptpubkey_address === r);
      o = await this.onchainProvider.watchAddresses([r], (a) => {
        const u = a.filter((f) => c(f) !== -1).map((f) => {
          const { txid: d, status: l } = f, h = c(f), p = Number(f.vout[h].value);
          return { txid: d, vout: h, value: p, status: l };
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
      i = async () => {
        u.abort(), await this.indexerProvider?.unsubscribeForScripts(a);
      }, (async () => {
        try {
          for await (const d of f)
            (d.newVtxos?.length > 0 || d.spentVtxos?.length > 0) && t({
              type: "vtxo",
              newVtxos: d.newVtxos.map((l) => fe(this, l)),
              spentVtxos: d.spentVtxos.map((l) => fe(this, l))
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
    const t = [S.encode(this.offchainTapscript.pkScript)];
    let { vtxos: n } = await this.indexerProvider.getVtxos({
      scripts: t
    });
    return n.filter((r) => r.virtualStatus.state !== "swept" && r.virtualStatus.state !== "settled" && r.arkTxId !== void 0).map((r) => r.arkTxId);
  }
}
class Je extends Ae {
  constructor(t, n, r, o, i, s, c, a, u, f, d, l, h, p, g, y) {
    super(t, n, o, s, c, a, u, h, p, g), this.networkName = r, this.arkProvider = i, this.serverUnrollScript = f, this.forfeitOutputScript = d, this.forfeitPubkey = l, this.identity = t, this.renewalConfig = {
      enabled: y?.enabled ?? !1,
      ...il,
      ...y
    };
  }
  static async create(t) {
    const n = await t.identity.xOnlyPublicKey();
    if (!n)
      throw new Error("Invalid configured public key");
    const r = await Ae.setupWalletConfig(t, n);
    let o;
    try {
      const a = S.decode(r.info.checkpointTapscript);
      o = vt.decode(a);
    } catch {
      throw new Error("Invalid checkpointTapscript from server");
    }
    const i = S.decode(r.info.forfeitPubkey).slice(1), s = Ie(r.network).decode(r.info.forfeitAddress), c = rt.encode(s);
    return new Je(t.identity, r.network, r.networkName, r.onchainProvider, r.arkProvider, r.indexerProvider, r.serverPubKey, r.offchainTapscript, r.boardingTapscript, o, c, i, r.dustAmount, r.walletRepository, r.contractRepository, t.renewalConfig);
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
    const t = hl(this.identity) ? await this.identity.toReadonly() : this.identity;
    return new Ae(t, this.network, this.onchainProvider, this.indexerProvider, this.arkServerPublicKey, this.offchainTapscript, this.boardingTapscript, this.dustAmount, this.walletRepository, this.contractRepository);
  }
  async sendBitcoin(t) {
    if (t.amount <= 0)
      throw new Error("Amount must be positive");
    if (!gl(t.address))
      throw new Error("Invalid Ark address " + t.address);
    const n = await this.getVirtualCoins({
      withRecoverable: !1
    });
    let r;
    if (t.selectedVtxos) {
      const p = t.selectedVtxos.map((y) => y.value).reduce((y, x) => y + x, 0);
      if (p < t.amount)
        throw new Error("Selected VTXOs do not cover specified amount");
      const g = p - t.amount;
      r = {
        inputs: t.selectedVtxos,
        changeAmount: BigInt(g)
      };
    } else
      r = wl(n, t.amount);
    const o = this.offchainTapscript.forfeit();
    if (!o)
      throw new Error("Selected leaf not found");
    const i = Ye.decode(t.address), c = [
      {
        script: BigInt(t.amount) < this.dustAmount ? i.subdustPkScript : i.pkScript,
        amount: BigInt(t.amount)
      }
    ];
    if (r.changeAmount > 0n) {
      const p = r.changeAmount < this.dustAmount ? this.arkAddress.subdustPkScript : this.arkAddress.pkScript;
      c.push({
        script: p,
        amount: BigInt(r.changeAmount)
      });
    }
    const a = this.offchainTapscript.encode(), u = tl(r.inputs.map((p) => ({
      ...p,
      tapLeafScript: o,
      tapTree: a
    })), c, this.serverUnrollScript), f = await this.identity.sign(u.arkTx), { arkTxid: d, signedCheckpointTxs: l } = await this.arkProvider.submitTx(lt.encode(f.toPSBT()), u.checkpoints.map((p) => lt.encode(p.toPSBT()))), h = await Promise.all(l.map(async (p) => {
      const g = Ct.fromPSBT(lt.decode(p)), y = await this.identity.sign(g);
      return lt.encode(y.toPSBT());
    }));
    await this.arkProvider.finalizeTx(d, h);
    try {
      const p = [], g = /* @__PURE__ */ new Set();
      let y = Number.MAX_SAFE_INTEGER;
      for (const [v, A] of r.inputs.entries()) {
        const B = fe(this, A), j = l[v], m = Ct.fromPSBT(lt.decode(j));
        if (p.push({
          ...B,
          virtualStatus: { ...B.virtualStatus, state: "spent" },
          spentBy: m.id,
          arkTxId: d,
          isSpent: !0
        }), B.virtualStatus.commitmentTxIds)
          for (const ft of B.virtualStatus.commitmentTxIds)
            g.add(ft);
        B.virtualStatus.batchExpiry && (y = Math.min(y, B.virtualStatus.batchExpiry));
      }
      const x = Date.now(), b = this.arkAddress.encode();
      if (r.changeAmount > 0n && y !== Number.MAX_SAFE_INTEGER) {
        const v = {
          txid: d,
          vout: c.length - 1,
          createdAt: new Date(x),
          forfeitTapLeafScript: this.offchainTapscript.forfeit(),
          intentTapLeafScript: this.offchainTapscript.forfeit(),
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
        await this.walletRepository.saveVtxos(b, [v]);
      }
      await this.walletRepository.saveVtxos(b, p), await this.walletRepository.saveTransactions(b, [
        {
          key: {
            boardingTxid: "",
            commitmentTxid: "",
            arkTxid: d
          },
          amount: t.amount,
          type: Xe.TxSent,
          settled: !1,
          createdAt: Date.now()
        }
      ]);
    } catch (p) {
      console.warn("error saving offchain tx to repository", p);
    } finally {
      return d;
    }
  }
  async settle(t, n) {
    if (t?.inputs) {
      for (const p of t.inputs)
        if (typeof p == "string")
          try {
            nt.fromString(p);
          } catch {
            throw new Error(`Invalid arknote "${p}"`);
          }
    }
    if (!t) {
      let p = 0;
      const y = vt.decode(S.decode(this.boardingTapscript.exitScript)).params.timelock, x = (await this.getBoardingUtxos()).filter((A) => !rl(A, y));
      p += x.reduce((A, B) => A + B.value, 0);
      const b = await this.getVtxos({ withRecoverable: !0 });
      p += b.reduce((A, B) => A + B.value, 0);
      const v = [...x, ...b];
      if (v.length === 0)
        throw new Error("No inputs found");
      t = {
        inputs: v,
        outputs: [
          {
            address: await this.getAddress(),
            amount: BigInt(p)
          }
        ]
      };
    }
    const r = [], o = [];
    let i = !1;
    for (const [p, g] of t.outputs.entries()) {
      let y;
      try {
        y = Ye.decode(g.address).pkScript, i = !0;
      } catch {
        const x = Ie(this.network).decode(g.address);
        y = rt.encode(x), r.push(p);
      }
      o.push({
        amount: g.amount,
        script: y
      });
    }
    let s;
    const c = [];
    i && (s = this.identity.signerSession(), c.push(S.encode(await s.getPublicKey())));
    const [a, u] = await Promise.all([
      this.makeRegisterIntentSignature(t.inputs, o, r, c),
      this.makeDeleteIntentSignature(t.inputs)
    ]), f = await this.safeRegisterIntent(a), d = [
      ...c,
      ...t.inputs.map((p) => `${p.txid}:${p.vout}`)
    ], l = this.createBatchHandler(f, t.inputs, s), h = new AbortController();
    try {
      const p = this.arkProvider.getEventStream(h.signal, d);
      return await Oo.join(p, l, {
        abortController: h,
        skipVtxoTreeSigning: !i,
        eventCallback: n ? (g) => Promise.resolve(n(g)) : void 0
      });
    } catch (p) {
      throw await this.arkProvider.deleteIntent(u).catch(() => {
      }), p;
    } finally {
      h.abort();
    }
  }
  async handleSettlementFinalizationEvent(t, n, r, o) {
    const i = [], s = await this.getVirtualCoins();
    let c = Ct.fromPSBT(lt.decode(t.commitmentTx)), a = !1, u = 0;
    const f = o?.leaves() || [];
    for (const d of n) {
      const l = s.find((v) => v.txid === d.txid && v.vout === d.vout);
      if (!l) {
        for (let v = 0; v < c.inputsLength; v++) {
          const A = c.getInput(v);
          if (!A.txid || A.index === void 0)
            throw new Error("The server returned incomplete data. No settlement input found in the PSBT");
          if (S.encode(A.txid) === d.txid && A.index === d.vout) {
            c.updateInput(v, {
              tapLeafScript: [d.forfeitTapLeafScript]
            }), c = await this.identity.sign(c, [
              v
            ]), a = !0;
            break;
          }
        }
        continue;
      }
      if (di(l) || fa(l, this.dustAmount))
        continue;
      if (f.length === 0)
        throw new Error("connectors not received");
      if (u >= f.length)
        throw new Error("not enough connectors received");
      const h = f[u], p = h.id, g = h.getOutput(0);
      if (!g)
        throw new Error("connector output not found");
      const y = g.amount, x = g.script;
      if (!y || !x)
        throw new Error("invalid connector output");
      u++;
      let b = Md([
        {
          txid: d.txid,
          index: d.vout,
          witnessUtxo: {
            amount: BigInt(l.value),
            script: Ot.decode(d.tapTree).pkScript
          },
          sighashType: Be.DEFAULT,
          tapLeafScript: [d.forfeitTapLeafScript]
        },
        {
          txid: p,
          index: 0,
          witnessUtxo: {
            amount: y,
            script: x
          }
        }
      ], r);
      b = await this.identity.sign(b, [0]), i.push(lt.encode(b.toPSBT()));
    }
    (i.length > 0 || a) && await this.arkProvider.submitSignedForfeitTxs(i, a ? lt.encode(c.toPSBT()) : void 0);
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
        const s = new TextEncoder().encode(t), c = pt(s), a = S.encode(c);
        let u = !0;
        for (const d of i.intentIdHashes)
          if (d === a) {
            if (!this.arkProvider)
              throw new Error("Ark provider not configured");
            await this.arkProvider.confirmRegistration(t), u = !1;
          }
        if (u)
          return { skip: u };
        const f = vt.encode({
          timelock: {
            value: i.batchExpiry,
            type: i.batchExpiry >= 512n ? "seconds" : "blocks"
          },
          pubkeys: [this.forfeitPubkey]
        }).script;
        return o = fn(f), { skip: !1 };
      },
      onTreeSigningStarted: async (i, s) => {
        if (!r)
          return { skip: !0 };
        if (!o)
          throw new Error("Sweep tap tree root not set");
        const c = i.cosignersPublicKeys.map((p) => p.slice(2)), u = (await r.getPublicKey()).subarray(1);
        if (!c.includes(S.encode(u)))
          return { skip: !0 };
        const f = Ct.fromPSBT(lt.decode(i.unsignedCommitmentTx));
        Jd(s, f, o);
        const d = f.getOutput(0);
        if (!d?.amount)
          throw new Error("Shared output not found");
        await r.init(s, o, d.amount);
        const l = S.encode(await r.getPublicKey()), h = await r.getNonces();
        return await this.arkProvider.submitTreeNonces(i.id, l, h), { skip: !1 };
      },
      onTreeNonces: async (i) => {
        if (!r)
          return { fullySigned: !0 };
        const { hasAllNonces: s } = await r.aggregatedNonces(i.txid, i.nonces);
        if (!s)
          return { fullySigned: !1 };
        const c = await r.sign(), a = S.encode(await r.getPublicKey());
        return await this.arkProvider.submitTreeSignatures(i.id, a, c), { fullySigned: !0 };
      },
      onBatchFinalization: async (i, s, c) => {
        if (!this.forfeitOutputScript)
          throw new Error("Forfeit output script not set");
        c && Qd(i.commitmentTx, c), await this.handleSettlementFinalizationEvent(i, n, this.forfeitOutputScript, c);
      }
    };
  }
  async safeRegisterIntent(t) {
    try {
      return await this.arkProvider.registerIntent(t);
    } catch (n) {
      if (n instanceof da && n.code === 0 && n.message.includes("duplicated input")) {
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
    }, c = ue.create(s, i, n), a = await this.identity.sign(c);
    return {
      proof: lt.encode(a.toPSBT()),
      message: s
    };
  }
  async makeDeleteIntentSignature(t) {
    const n = this.prepareIntentProofInputs(t), r = {
      type: "delete",
      expire_at: 0
    }, o = ue.create(r, n, []), i = await this.identity.sign(o);
    return {
      proof: lt.encode(i.toPSBT()),
      message: r
    };
  }
  async makeGetPendingTxIntentSignature(t) {
    const n = this.prepareIntentProofInputs(t), r = {
      type: "get-pending-tx",
      expire_at: 0
    }, o = ue.create(r, n, []), i = await this.identity.sign(o);
    return {
      proof: lt.encode(i.toPSBT()),
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
      const i = [S.encode(this.offchainTapscript.pkScript)];
      let { vtxos: s } = await this.indexerProvider.getVtxos({
        scripts: i
      });
      if (s = s.filter((c) => c.virtualStatus.state !== "swept" && c.virtualStatus.state !== "settled"), s.length === 0)
        return { finalized: [], pending: [] };
      t = s.map((c) => fe(this, c));
    }
    const r = [], o = [];
    for (let i = 0; i < t.length; i += 20) {
      const s = t.slice(i, i + 20), c = await this.makeGetPendingTxIntentSignature(s), a = await this.arkProvider.getPendingTxs(c);
      for (const u of a) {
        o.push(u.arkTxid);
        try {
          const f = await Promise.all(u.signedCheckpointTxs.map(async (d) => {
            const l = Ct.fromPSBT(lt.decode(d)), h = await this.identity.sign(l);
            return lt.encode(h.toPSBT());
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
      const o = Ot.decode(r.tapTree), i = pl(r.intentTapLeafScript), s = [ca.encode(r.tapTree)];
      r.extraWitness && s.push(fd.encode(r.extraWitness)), n.push({
        txid: S.decode(r.txid),
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
Je.MIN_FEE_RATE = 1;
function pl(e) {
  let t;
  try {
    const n = e[1], r = n.subarray(0, n.length - 1);
    try {
      const o = vt.decode(r).params;
      t = vo.encode(o.timelock.type === "blocks" ? { blocks: Number(o.timelock.value) } : { seconds: Number(o.timelock.value) });
    } catch {
      const o = Ze.decode(r).params;
      t = Number(o.absoluteTimelock);
    }
  } catch {
  }
  return t;
}
function gl(e) {
  try {
    return Ye.decode(e), !0;
  } catch {
    return !1;
  }
}
function wl(e, t) {
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
function ms() {
  const e = crypto.getRandomValues(new Uint8Array(16));
  return S.encode(e);
}
var Q;
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
  function o(w) {
    return w.type === "SETTLE_SUCCESS" && w.success;
  }
  e.isSettleSuccess = o;
  function i(w) {
    return w.type === "ADDRESS" && w.success === !0;
  }
  e.isAddress = i;
  function s(w) {
    return w.type === "BOARDING_ADDRESS" && w.success === !0;
  }
  e.isBoardingAddress = s;
  function c(w, E) {
    return {
      type: "ADDRESS",
      success: !0,
      address: E,
      id: w
    };
  }
  e.address = c;
  function a(w, E) {
    return {
      type: "BOARDING_ADDRESS",
      success: !0,
      address: E,
      id: w
    };
  }
  e.boardingAddress = a;
  function u(w) {
    return w.type === "BALANCE" && w.success === !0;
  }
  e.isBalance = u;
  function f(w, E) {
    return {
      type: "BALANCE",
      success: !0,
      balance: E,
      id: w
    };
  }
  e.balance = f;
  function d(w) {
    return w.type === "VTXOS" && w.success === !0;
  }
  e.isVtxos = d;
  function l(w, E) {
    return {
      type: "VTXOS",
      success: !0,
      vtxos: E,
      id: w
    };
  }
  e.vtxos = l;
  function h(w) {
    return w.type === "VIRTUAL_COINS" && w.success === !0;
  }
  e.isVirtualCoins = h;
  function p(w, E) {
    return {
      type: "VIRTUAL_COINS",
      success: !0,
      virtualCoins: E,
      id: w
    };
  }
  e.virtualCoins = p;
  function g(w) {
    return w.type === "BOARDING_UTXOS" && w.success === !0;
  }
  e.isBoardingUtxos = g;
  function y(w, E) {
    return {
      type: "BOARDING_UTXOS",
      success: !0,
      boardingUtxos: E,
      id: w
    };
  }
  e.boardingUtxos = y;
  function x(w) {
    return w.type === "SEND_BITCOIN_SUCCESS" && w.success === !0;
  }
  e.isSendBitcoinSuccess = x;
  function b(w, E) {
    return {
      type: "SEND_BITCOIN_SUCCESS",
      success: !0,
      txid: E,
      id: w
    };
  }
  e.sendBitcoinSuccess = b;
  function v(w) {
    return w.type === "TRANSACTION_HISTORY" && w.success === !0;
  }
  e.isTransactionHistory = v;
  function A(w, E) {
    return {
      type: "TRANSACTION_HISTORY",
      success: !0,
      transactions: E,
      id: w
    };
  }
  e.transactionHistory = A;
  function B(w) {
    return w.type === "WALLET_STATUS" && w.success === !0;
  }
  e.isWalletStatus = B;
  function j(w, E, U) {
    return {
      type: "WALLET_STATUS",
      success: !0,
      status: {
        walletInitialized: E,
        xOnlyPublicKey: U
      },
      id: w
    };
  }
  e.walletStatus = j;
  function m(w) {
    return w.type === "CLEAR_RESPONSE";
  }
  e.isClearResponse = m;
  function ft(w, E) {
    return {
      type: "CLEAR_RESPONSE",
      success: E,
      id: w
    };
  }
  e.clearResponse = ft;
  function D(w) {
    return w.type === "WALLET_RELOADED";
  }
  e.isWalletReloaded = D;
  function Pe(w, E) {
    return {
      type: "WALLET_RELOADED",
      success: E,
      id: w
    };
  }
  e.walletReloaded = Pe;
  function Yt(w) {
    return w.type === "VTXO_UPDATE";
  }
  e.isVtxoUpdate = Yt;
  function F(w, E) {
    return {
      type: "VTXO_UPDATE",
      id: ms(),
      // spontaneous update, not tied to a request
      success: !0,
      spentVtxos: E,
      newVtxos: w
    };
  }
  e.vtxoUpdate = F;
  function k(w) {
    return w.type === "UTXO_UPDATE";
  }
  e.isUtxoUpdate = k;
  function T(w) {
    return {
      type: "UTXO_UPDATE",
      id: ms(),
      // spontaneous update, not tied to a request
      success: !0,
      coins: w
    };
  }
  e.utxoUpdate = T;
})(Q || (Q = {}));
class yl {
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
const ml = "arkade-service-worker";
var xs;
(function(e) {
  function t(g) {
    return typeof g == "object" && g !== null && "type" in g;
  }
  e.isBase = t;
  function n(g) {
    return g.type === "INIT_WALLET" && "arkServerUrl" in g && typeof g.arkServerUrl == "string" && ("arkServerPublicKey" in g ? g.arkServerPublicKey === void 0 || typeof g.arkServerPublicKey == "string" : !0);
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
  function i(g) {
    return g.type === "GET_BOARDING_ADDRESS";
  }
  e.isGetBoardingAddress = i;
  function s(g) {
    return g.type === "GET_BALANCE";
  }
  e.isGetBalance = s;
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
  function p(g) {
    return g.type === "RELOAD_WALLET";
  }
  e.isReloadWallet = p;
})(xs || (xs = {}));
class ya {
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
class xl extends ya {
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
class Sn {
  constructor(t = ml, n = 1) {
    this.dbName = t, this.dbVersion = n, this.messagePrefix = Sn.messagePrefix, this.onNextTick = [], this.storage = new yl(t, n), this.walletRepository = new No(this.storage);
  }
  // lifecycle methods
  async start() {
  }
  async stop() {
  }
  async tick(t) {
    const n = await Promise.allSettled(this.onNextTick.map((r) => r()));
    return this.onNextTick = [], n.map((r) => r.status === "fulfilled" ? r.value : (console.error(`[${Sn.messagePrefix}] tick failed`, r.reason), null)).filter((r) => r !== null);
  }
  scheduleForNextTick(t) {
    this.onNextTick.push(t);
  }
  async handleMessage(t) {
    if (t.type === "INIT_WALLET") {
      await this.handleInitWallet(t.payload);
      const n = Q.walletInitialized(t.id);
      return { id: t.id, type: n.type, payload: n };
    }
    if (!this.handler)
      return Q.error(t.id, "Handler not initialized");
    switch (t.type) {
      case "SETTLE": {
        const n = await this.handleSettle(t.payload);
        return n ? { id: t.id, type: n.type, payload: n } : null;
      }
      case "SEND_BITCOIN": {
        const n = await this.handleSendBitcoin(t.payload);
        return n ? { id: t.id, type: n.type, payload: n } : null;
      }
      case "GET_ADDRESS": {
        const n = await this.handler.getAddress(), r = Q.address(t.id, n);
        return { id: t.id, type: r.type, payload: r };
      }
      case "GET_BOARDING_ADDRESS": {
        const n = await this.handler.getBoardingAddress(), r = Q.boardingAddress(t.id, n);
        return { id: t.id, type: r.type, payload: r };
      }
      case "GET_BALANCE": {
        const n = await this.handler.getAddress(), r = Q.address(t.id, n);
        return { id: t.id, type: r.type, payload: r };
      }
      case "GET_VTXOS": {
        const n = await this.handleGetVtxos(t);
        return n ? { id: t.id, type: n.type, payload: n } : null;
      }
      case "GET_BOARDING_UTXOS": {
        const n = await this.getAllBoardingUtxos(), r = Q.boardingUtxos(t.id, n);
        return { id: t.id, type: r.type, payload: r };
      }
      case "GET_TRANSACTION_HISTORY": {
        const n = await this.getTransactionHistory(), r = Q.transactionHistory(t.id, n);
        return { id: t.id, type: r.type, payload: r };
      }
      case "GET_STATUS": {
        const n = await this.handler.identity.xOnlyPublicKey(), r = Q.walletStatus(t.id, this.handler !== void 0, n);
        return { id: t.id, type: r.type, payload: r };
      }
      case "CLEAR": {
        await this.clear();
        const n = Q.clearResponse(t.id, !0);
        return { id: t.id, type: n.type, payload: n };
      }
      case "RELOAD_WALLET": {
        await await this.onWalletInitialized();
        const n = Q.walletReloaded(t.id, !0);
        return { id: t.id, type: n.type, payload: n };
      }
      default:
        throw console.error(`Unknown message type: ${t.type}`), new Error("Unknown message");
    }
  }
  // Wallet methods
  async handleInitWallet(t) {
    console.log("handleInitWallet", t);
    const { arkServerPublicKey: n, arkServerUrl: r } = t;
    if (this.arkProvider = new la(r), this.indexerProvider = new wa(r), "privateKey" in t.key && typeof t.key.privateKey == "string") {
      const { key: { privateKey: o } } = t, i = ln.fromHex(o), s = await Je.create({
        identity: i,
        arkServerUrl: r,
        arkServerPublicKey: n,
        storage: this.storage
        // Use unified storage for wallet too
      });
      this.handler = new xl(s);
    } else if ("publicKey" in t.key && typeof t.key.publicKey == "string") {
      const { key: { publicKey: o } } = t, i = $r.fromPublicKey(S.decode(o)), s = await Ae.create({
        identity: i,
        arkServerUrl: r,
        arkServerPublicKey: n,
        storage: this.storage
        // Use unified storage for wallet too
      });
      this.handler = new ya(s);
    } else
      throw new Error("Missing privateKey or publicKey in key object");
    await this.onWalletInitialized();
  }
  async handleGetBalance(t) {
    const [n, r, o] = await Promise.all([
      this.getAllBoardingUtxos(),
      this.getSpendableVtxos(),
      this.getSweptVtxos()
    ]);
    let i = 0, s = 0;
    for (const l of n)
      l.status.confirmed ? i += l.value : s += l.value;
    let c = 0, a = 0, u = 0;
    for (const l of r)
      l.virtualStatus.state === "settled" ? c += l.value : l.virtualStatus.state === "preconfirmed" && (a += l.value);
    for (const l of o)
      te(l) && (u += l.value);
    const f = i + s, d = c + a + u;
    return Q.balance(t.id, {
      boarding: {
        confirmed: i,
        unconfirmed: s,
        total: f
      },
      settled: c,
      preconfirmed: a,
      available: c + a,
      recoverable: u,
      total: f + d
    });
  }
  async getAllBoardingUtxos() {
    if (!this.handler)
      return [];
    const t = await this.handler.getBoardingAddress();
    return await this.walletRepository.getUtxos(t);
  }
  /**
   * Get spendable vtxos for the current wallet address
   */
  async getSpendableVtxos() {
    if (!this.handler)
      return [];
    const t = await this.handler.getAddress();
    return (await this.walletRepository.getVtxos(t)).filter(te);
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
  async onWalletInitialized() {
    if (console.log("onWalletInitialized - Initializing wallet..."), !this.handler || !this.arkProvider || !this.indexerProvider || !this.handler.offchainTapscript || !this.handler.boardingTapscript)
      return;
    const t = S.encode(this.handler.offchainTapscript.pkScript), r = (await this.indexerProvider.getVtxos({
      scripts: [t]
    })).vtxos.map((a) => fe(this.handler, a));
    try {
      const { pending: a, finalized: u } = await this.handler.handleReload(r);
      console.info(`Recovered ${u.length}/${a.length} pending transactions: ${u.join(", ")}`);
    } catch (a) {
      console.error("Error recovering pending transactions:", a);
    }
    const o = await this.handler.getAddress();
    await this.walletRepository.saveVtxos(o, r);
    const i = await this.handler.getBoardingAddress(), s = await this.handler.onchainProvider.getCoins(i);
    await this.walletRepository.saveUtxos(i, s.map((a) => Po(this.handler, a)));
    const c = await this.getTransactionHistory();
    c && await this.walletRepository.saveTransactions(o, c), this.incomingFundsSubscription && this.incomingFundsSubscription(), this.incomingFundsSubscription = await this.handler.notifyIncomingFunds(async (a) => {
      if (a.type === "vtxo") {
        const u = a.newVtxos.length > 0 ? a.newVtxos.map((d) => fe(this.handler, d)) : [], f = a.spentVtxos.length > 0 ? a.spentVtxos.map((d) => fe(this.handler, d)) : [];
        if ([...u, ...f].length === 0)
          return;
        await this.walletRepository.saveVtxos(o, [
          ...u,
          ...f
        ]), this.scheduleForNextTick(() => ({
          type: "VTXO_UPDATE",
          broadcast: !0,
          payload: Q.vtxoUpdate(u, f)
        }));
      }
      if (a.type === "utxo") {
        const u = a.coins.map((d) => Po(this.handler, d)), f = await this.handler?.getBoardingAddress();
        await this.walletRepository.clearUtxos(f), await this.walletRepository.saveUtxos(f, u), this.scheduleForNextTick(() => ({
          type: "UTXO_UPDATE",
          broadcast: !0,
          payload: Q.utxoUpdate(u)
        }));
      }
    });
  }
  async getTransactionHistory() {
    if (!this.handler)
      return [];
    let t = [];
    try {
      const { boardingTxs: n, commitmentsToIgnore: r } = await this.handler.getBoardingTxs(), { spendable: o, spent: i } = await this.getAllVtxos(), s = pa(o, i, r);
      t = [...n, ...s], t.sort(
        // place createdAt = 0 (unconfirmed txs) first, then descending
        (c, a) => c.createdAt === 0 ? -1 : a.createdAt === 0 ? 1 : a.createdAt - c.createdAt
      );
    } catch (n) {
      console.error("Error getting transaction history:", n);
    }
    return t;
  }
  async getAllVtxos() {
    if (!this.handler)
      return { spendable: [], spent: [] };
    const t = await this.handler.getAddress(), n = await this.walletRepository.getVtxos(t);
    return {
      spendable: n.filter(te),
      spent: n.filter((r) => !te(r))
    };
  }
  async handleSettle(t) {
    if (!this.handler)
      return null;
    const n = await this.handler.handleSettle(t.params, (r) => {
      this.scheduleForNextTick(() => Q.settleEvent(t.id, r));
    });
    return n ? Q.settleSuccess(t.id, n) : Q.error(t.id, "Operation not supported in readonly mode");
  }
  async handleSendBitcoin(t) {
    if (!this.handler)
      return null;
    const n = await this.handler.handleSendBitcoin(t.params);
    return n ? Q.sendBitcoinSuccess(t.id, n) : Q.error(t.id, "Operation not supported in readonly mode");
  }
  async handleGetVtxos(t) {
    if (!this.handler)
      return null;
    const n = await this.getSpendableVtxos(), r = this.handler.dustAmount, i = t.filter?.withRecoverable ?? !1 ? n : n.filter((s) => !(r != null && fa(s, r) || di(s) || ua(s)));
    return Q.vtxos(t.id, i);
  }
  async clear() {
    this.incomingFundsSubscription && this.incomingFundsSubscription(), await this.storage.clear(), this.walletRepository = new No(this.storage), this.handler = void 0, this.arkProvider = void 0, this.indexerProvider = void 0;
  }
}
Sn.messagePrefix = "WalletUpdater";
class W {
  constructor(t, n, r, o, i, s) {
    this.hasWitness = t, this.inputCount = n, this.outputCount = r, this.inputSize = o, this.inputWitnessSize = i, this.outputSize = s;
  }
  static create() {
    return new W(!1, 0, 0, 0, 0, 0);
  }
  addP2AInput() {
    return this.inputCount++, this.inputSize += W.INPUT_SIZE, this;
  }
  addKeySpendInput(t = !0) {
    return this.inputCount++, this.inputWitnessSize += 65 + (t ? 0 : 1), this.inputSize += W.INPUT_SIZE, this.hasWitness = !0, this;
  }
  addP2PKHInput() {
    return this.inputCount++, this.inputWitnessSize++, this.inputSize += W.INPUT_SIZE + W.P2PKH_SCRIPT_SIG_SIZE, this;
  }
  addTapscriptInput(t, n, r) {
    const o = 1 + W.BASE_CONTROL_BLOCK_SIZE + 1 + n + 1 + r;
    return this.inputCount++, this.inputWitnessSize += t + o, this.inputSize += W.INPUT_SIZE, this.hasWitness = !0, this.inputCount++, this;
  }
  addP2WKHOutput() {
    return this.outputCount++, this.outputSize += W.OUTPUT_SIZE + W.P2WKH_OUTPUT_SIZE, this;
  }
  addP2TROutput() {
    return this.outputCount++, this.outputSize += W.OUTPUT_SIZE + W.P2TR_OUTPUT_SIZE, this;
  }
  vsize() {
    const t = (s) => s < 253 ? 1 : s < 65535 ? 3 : s < 4294967295 ? 5 : 9, n = t(this.inputCount), r = t(this.outputCount);
    let i = (W.BASE_TX_SIZE + n + this.inputSize + r + this.outputSize) * W.WITNESS_SCALE_FACTOR;
    return this.hasWitness && (i += W.WITNESS_HEADER_SIZE + this.inputWitnessSize), bl(i);
  }
}
W.P2PKH_SCRIPT_SIG_SIZE = 108;
W.INPUT_SIZE = 41;
W.BASE_CONTROL_BLOCK_SIZE = 33;
W.OUTPUT_SIZE = 9;
W.P2WKH_OUTPUT_SIZE = 22;
W.BASE_TX_SIZE = 10;
W.WITNESS_HEADER_SIZE = 2;
W.WITNESS_SCALE_FACTOR = 4;
W.P2TR_OUTPUT_SIZE = 34;
const bl = (e) => {
  const t = BigInt(Math.ceil(e / W.WITNESS_SCALE_FACTOR));
  return {
    value: t,
    fee: (n) => n * t
  };
};
var bs;
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
        if (!(f.type === De.COMMITMENT || f.type === De.UNSPECIFIED))
          try {
            if (!(await this.explorer.getTxStatus(f.txid)).confirmed)
              return {
                type: t.WAIT,
                txid: f.txid,
                do: Tl(this.explorer, f.txid)
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
      const a = pe.fromPSBT(lt.decode(c.txs[0]));
      if (i.type === De.TREE) {
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
        do: Sl(this.bumper, this.explorer, a)
      };
    }
    /**
     * Iterate over the steps to be executed and execute them
     * @returns An async iterator over the executed steps
     */
    async *[Symbol.asyncIterator]() {
      let i;
      do {
        i !== void 0 && await El(1e3);
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
    const d = W.create();
    for (const y of a) {
      if (!y.isUnrolled)
        throw new Error(`Vtxo ${y.txid}:${y.vout} is not fully unrolled, use unroll first`);
      const x = await o.onchainProvider.getTxStatus(y.txid);
      if (!x.confirmed)
        throw new Error(`tx ${y.txid} is not confirmed`);
      const b = vl({ height: x.blockHeight, time: x.blockTime }, c, y);
      if (!b)
        throw new Error(`no available exit path found for vtxo ${y.txid}:${y.vout}`);
      const v = Ot.decode(y.tapTree).findLeaf(S.encode(b.script));
      if (!v)
        throw new Error(`spending leaf not found for vtxo ${y.txid}:${y.vout}`);
      f += BigInt(y.value), u.push({
        txid: y.txid,
        index: y.vout,
        tapLeafScript: [v],
        sequence: 4294967294,
        witnessUtxo: {
          amount: BigInt(y.value),
          script: Ot.decode(y.tapTree).pkScript
        },
        sighashType: Be.DEFAULT
      }), d.addTapscriptInput(64, v[1].length, Wt.encode(v[0]).length);
    }
    const l = new pe({ version: 2 });
    for (const y of u)
      l.addInput(y);
    d.addP2TROutput();
    let h = await o.onchainProvider.getFeeRate();
    (!h || h < Je.MIN_FEE_RATE) && (h = Je.MIN_FEE_RATE);
    const p = d.vsize().fee(BigInt(h));
    if (p > f)
      throw new Error("fee amount is greater than the total amount");
    l.addOutputAddress(s, f - p);
    const g = await o.identity.sign(l);
    return g.finalize(), await o.onchainProvider.broadcastTransaction(g.hex), g.id;
  }
  e.completeUnroll = r;
})(bs || (bs = {}));
function El(e) {
  return new Promise((t) => setTimeout(t, e));
}
function Sl(e, t, n) {
  return async () => {
    const [r, o] = await e.bumpP2A(n);
    await t.broadcastTransaction(r, o);
  };
}
function Tl(e, t) {
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
function vl(e, t, n) {
  const r = Ot.decode(n.tapTree).exitPaths();
  for (const o of r)
    if (o.params.timelock.type === "blocks") {
      if (t.height >= e.height + Number(o.params.timelock.value))
        return o;
    } else if (t.time >= e.time + Number(o.params.timelock.value))
      return o;
}
class kl {
  constructor({ updaters: t, tickIntervalMs: n = 3e4, debug: r = !1 }) {
    this.running = !1, this.tickTimeout = null, this.debug = !1, this.onMessage = async (o) => {
      const { id: i, prefix: s, payload: c } = o.data;
      this.debug && console.log(`[${s}] incoming message:`, o.data);
      const a = this.updaters.get(s);
      if (!a) {
        console.warn(`[${s}] unknown message prefix`);
        return;
      }
      try {
        const u = await a.handleMessage({ id: i, type: c.type, payload: o.data.payload });
        this.debug && console.log(`[${s}] outgoing response:`, u), u && o.source?.postMessage(u);
      } catch (u) {
        console.error(`[${s}] handleMessage failed`, u), o.source?.postMessage({ id: i, error: String(u) });
      }
    }, this.updaters = new Map(t.map((o) => [o.messagePrefix, o])), this.tickIntervalMs = n, this.debug = r;
  }
  async start() {
    if (console.log("Starting service worker..."), !this.running) {
      this.running = !0;
      for (const t of this.updaters.values())
        await t.start();
      self.addEventListener("message", this.onMessage), this.scheduleNextTick();
    }
  }
  async stop() {
    this.running = !1, this.tickTimeout !== null && clearTimeout(this.tickTimeout), self.removeEventListener("message", this.onMessage);
    for (const t of this.updaters.values())
      t.stop();
  }
  scheduleNextTick() {
    this.running && (this.tickTimeout = self.setTimeout(() => this.runTick(), this.tickIntervalMs));
  }
  async runTick() {
    if (!this.running) return;
    const t = Date.now();
    for (const n of this.updaters.values())
      try {
        const r = await n.tick(t);
        this.debug && console.log(`[${n.messagePrefix}] outgoing tick response:`, r), r && self.clients.matchAll({ includeUncontrolled: !0, type: "window" }).then((o) => {
          o.forEach((i) => {
            i.postMessage(r);
          });
        });
      } catch (r) {
        console.error(`[${n.messagePrefix}] tick failed`, r);
      }
    this.scheduleNextTick();
  }
}
const Al = new kl({
  updaters: [new Sn()],
  debug: !0
});
Al.start().catch(console.error);
const ma = "arkade-cache-v1";
self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(ma)), self.skipWaiting();
});
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((t) => Promise.all(
      t.map((n) => {
        if (n !== ma)
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
