/*! noble-hashes - MIT License (c) 2022 Paul Miller (paulmillr.com) */
function Ns(e) {
  return e instanceof Uint8Array || ArrayBuffer.isView(e) && e.constructor.name === "Uint8Array";
}
function We(e, t = "") {
  if (!Number.isSafeInteger(e) || e < 0) {
    const r = t && `"${t}" `;
    throw new Error(`${r}expected integer >= 0, got ${e}`);
  }
}
function Z(e, t, r = "") {
  const n = Ns(e), o = e?.length, i = t !== void 0;
  if (!n || i && o !== t) {
    const s = r && `"${r}" `, c = i ? ` of length ${t}` : "", a = n ? `length=${o}` : `type=${typeof e}`;
    throw new Error(s + "expected Uint8Array" + c + ", got " + a);
  }
  return e;
}
function iu(e) {
  if (typeof e != "function" || typeof e.create != "function")
    throw new Error("Hash must wrapped by utils.createHasher");
  We(e.outputLen), We(e.blockLen);
}
function ao(e, t = !0) {
  if (e.destroyed)
    throw new Error("Hash instance has been destroyed");
  if (t && e.finished)
    throw new Error("Hash#digest() has already been called");
}
function Wd(e, t) {
  Z(e, void 0, "digestInto() output");
  const r = t.outputLen;
  if (e.length < r)
    throw new Error('"digestInto() output" expected to be of length >=' + r);
}
function An(...e) {
  for (let t = 0; t < e.length; t++)
    e[t].fill(0);
}
function mi(e) {
  return new DataView(e.buffer, e.byteOffset, e.byteLength);
}
function re(e, t) {
  return e << 32 - t | e >>> t;
}
function $r(e, t) {
  return e << t | e >>> 32 - t >>> 0;
}
const su = /* @ts-ignore */ typeof Uint8Array.from([]).toHex == "function" && typeof Uint8Array.fromHex == "function", Md = /* @__PURE__ */ Array.from({ length: 256 }, (e, t) => t.toString(16).padStart(2, "0"));
function Yo(e) {
  if (Z(e), su)
    return e.toHex();
  let t = "";
  for (let r = 0; r < e.length; r++)
    t += Md[e[r]];
  return t;
}
const ye = { _0: 48, _9: 57, A: 65, F: 70, a: 97, f: 102 };
function Tc(e) {
  if (e >= ye._0 && e <= ye._9)
    return e - ye._0;
  if (e >= ye.A && e <= ye.F)
    return e - (ye.A - 10);
  if (e >= ye.a && e <= ye.f)
    return e - (ye.a - 10);
}
function uo(e) {
  if (typeof e != "string")
    throw new Error("hex string expected, got " + typeof e);
  if (su)
    return Uint8Array.fromHex(e);
  const t = e.length, r = t / 2;
  if (t % 2)
    throw new Error("hex string expected, got unpadded hex of length " + t);
  const n = new Uint8Array(r);
  for (let o = 0, i = 0; o < r; o++, i += 2) {
    const s = Tc(e.charCodeAt(i)), c = Tc(e.charCodeAt(i + 1));
    if (s === void 0 || c === void 0) {
      const a = e[i] + e[i + 1];
      throw new Error('hex string expected, got non-hex character "' + a + '" at index ' + i);
    }
    n[o] = s * 16 + c;
  }
  return n;
}
function Zt(...e) {
  let t = 0;
  for (let n = 0; n < e.length; n++) {
    const o = e[n];
    Z(o), t += o.length;
  }
  const r = new Uint8Array(t);
  for (let n = 0, o = 0; n < e.length; n++) {
    const i = e[n];
    r.set(i, o), o += i.length;
  }
  return r;
}
function cu(e, t = {}) {
  const r = (o, i) => e(i).update(o).digest(), n = e(void 0);
  return r.outputLen = n.outputLen, r.blockLen = n.blockLen, r.create = (o) => e(o), Object.assign(r, t), Object.freeze(r);
}
function Sr(e = 32) {
  const t = typeof globalThis == "object" ? globalThis.crypto : null;
  if (typeof t?.getRandomValues != "function")
    throw new Error("crypto.getRandomValues must be defined");
  return t.getRandomValues(new Uint8Array(e));
}
const zd = (e) => ({
  oid: Uint8Array.from([6, 9, 96, 134, 72, 1, 101, 3, 4, 2, e])
});
function jd(e, t, r) {
  return e & t ^ ~e & r;
}
function Gd(e, t, r) {
  return e & t ^ e & r ^ t & r;
}
let au = class {
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
  constructor(t, r, n, o) {
    this.blockLen = t, this.outputLen = r, this.padOffset = n, this.isLE = o, this.buffer = new Uint8Array(t), this.view = mi(this.buffer);
  }
  update(t) {
    ao(this), Z(t);
    const { view: r, buffer: n, blockLen: o } = this, i = t.length;
    for (let s = 0; s < i; ) {
      const c = Math.min(o - this.pos, i - s);
      if (c === o) {
        const a = mi(t);
        for (; o <= i - s; s += o)
          this.process(a, s);
        continue;
      }
      n.set(t.subarray(s, s + c), this.pos), this.pos += c, s += c, this.pos === o && (this.process(r, 0), this.pos = 0);
    }
    return this.length += t.length, this.roundClean(), this;
  }
  digestInto(t) {
    ao(this), Wd(t, this), this.finished = !0;
    const { buffer: r, view: n, blockLen: o, isLE: i } = this;
    let { pos: s } = this;
    r[s++] = 128, An(this.buffer.subarray(s)), this.padOffset > o - s && (this.process(n, 0), s = 0);
    for (let d = s; d < o; d++)
      r[d] = 0;
    n.setBigUint64(o - 8, BigInt(this.length * 8), i), this.process(n, 0);
    const c = mi(t), a = this.outputLen;
    if (a % 4)
      throw new Error("_sha2: outputLen must be aligned to 32bit");
    const u = a / 4, f = this.get();
    if (u > f.length)
      throw new Error("_sha2: outputLen bigger than state");
    for (let d = 0; d < u; d++)
      c.setUint32(4 * d, f[d], i);
  }
  digest() {
    const { buffer: t, outputLen: r } = this;
    this.digestInto(t);
    const n = t.slice(0, r);
    return this.destroy(), n;
  }
  _cloneInto(t) {
    t ||= new this.constructor(), t.set(...this.get());
    const { blockLen: r, buffer: n, length: o, finished: i, destroyed: s, pos: c } = this;
    return t.destroyed = s, t.finished = i, t.length = o, t.pos = c, o % r && t.buffer.set(n), t;
  }
  clone() {
    return this._cloneInto();
  }
};
const Ae = /* @__PURE__ */ Uint32Array.from([
  1779033703,
  3144134277,
  1013904242,
  2773480762,
  1359893119,
  2600822924,
  528734635,
  1541459225
]), qd = /* @__PURE__ */ Uint32Array.from([
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
]), Be = /* @__PURE__ */ new Uint32Array(64);
let Yd = class extends au {
  constructor(t) {
    super(64, t, 8, !1);
  }
  get() {
    const { A: t, B: r, C: n, D: o, E: i, F: s, G: c, H: a } = this;
    return [t, r, n, o, i, s, c, a];
  }
  // prettier-ignore
  set(t, r, n, o, i, s, c, a) {
    this.A = t | 0, this.B = r | 0, this.C = n | 0, this.D = o | 0, this.E = i | 0, this.F = s | 0, this.G = c | 0, this.H = a | 0;
  }
  process(t, r) {
    for (let d = 0; d < 16; d++, r += 4)
      Be[d] = t.getUint32(r, !1);
    for (let d = 16; d < 64; d++) {
      const h = Be[d - 15], p = Be[d - 2], w = re(h, 7) ^ re(h, 18) ^ h >>> 3, y = re(p, 17) ^ re(p, 19) ^ p >>> 10;
      Be[d] = y + Be[d - 7] + w + Be[d - 16] | 0;
    }
    let { A: n, B: o, C: i, D: s, E: c, F: a, G: u, H: f } = this;
    for (let d = 0; d < 64; d++) {
      const h = re(c, 6) ^ re(c, 11) ^ re(c, 25), p = f + h + jd(c, a, u) + qd[d] + Be[d] | 0, y = (re(n, 2) ^ re(n, 13) ^ re(n, 22)) + Gd(n, o, i) | 0;
      f = u, u = a, a = c, c = s + p | 0, s = i, i = o, o = n, n = p + y | 0;
    }
    n = n + this.A | 0, o = o + this.B | 0, i = i + this.C | 0, s = s + this.D | 0, c = c + this.E | 0, a = a + this.F | 0, u = u + this.G | 0, f = f + this.H | 0, this.set(n, o, i, s, c, a, u, f);
  }
  roundClean() {
    An(Be);
  }
  destroy() {
    this.set(0, 0, 0, 0, 0, 0, 0, 0), An(this.buffer);
  }
}, Zd = class extends Yd {
  // We cannot use array here since array allows indexing by variable
  // which means optimizer/compiler cannot use registers.
  A = Ae[0] | 0;
  B = Ae[1] | 0;
  C = Ae[2] | 0;
  D = Ae[3] | 0;
  E = Ae[4] | 0;
  F = Ae[5] | 0;
  G = Ae[6] | 0;
  H = Ae[7] | 0;
  constructor() {
    super(32);
  }
};
const mt = /* @__PURE__ */ cu(
  () => new Zd(),
  /* @__PURE__ */ zd(1)
);
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const Cs = /* @__PURE__ */ BigInt(0), qi = /* @__PURE__ */ BigInt(1);
function fo(e, t = "") {
  if (typeof e != "boolean") {
    const r = t && `"${t}" `;
    throw new Error(r + "expected boolean, got type=" + typeof e);
  }
  return e;
}
function uu(e) {
  if (typeof e == "bigint") {
    if (!Xr(e))
      throw new Error("positive bigint expected, got " + e);
  } else
    We(e);
  return e;
}
function Rr(e) {
  const t = uu(e).toString(16);
  return t.length & 1 ? "0" + t : t;
}
function fu(e) {
  if (typeof e != "string")
    throw new Error("hex string expected, got " + typeof e);
  return e === "" ? Cs : BigInt("0x" + e);
}
function ke(e) {
  return fu(Yo(e));
}
function du(e) {
  return fu(Yo(Xd(Z(e)).reverse()));
}
function Tr(e, t) {
  We(t), e = uu(e);
  const r = uo(e.toString(16).padStart(t * 2, "0"));
  if (r.length !== t)
    throw new Error("number too large");
  return r;
}
function lu(e, t) {
  return Tr(e, t).reverse();
}
function lr(e, t) {
  if (e.length !== t.length)
    return !1;
  let r = 0;
  for (let n = 0; n < e.length; n++)
    r |= e[n] ^ t[n];
  return r === 0;
}
function Xd(e) {
  return Uint8Array.from(e);
}
function Jd(e) {
  return Uint8Array.from(e, (t, r) => {
    const n = t.charCodeAt(0);
    if (t.length !== 1 || n > 127)
      throw new Error(`string contains non-ASCII character "${e[r]}" with code ${n} at position ${r}`);
    return n;
  });
}
const Xr = (e) => typeof e == "bigint" && Cs <= e;
function Qd(e, t, r) {
  return Xr(e) && Xr(t) && Xr(r) && t <= e && e < r;
}
function hu(e, t, r, n) {
  if (!Qd(t, r, n))
    throw new Error("expected valid " + e + ": " + r + " <= n < " + n + ", got " + t);
}
function tl(e) {
  let t;
  for (t = 0; e > Cs; e >>= qi, t += 1)
    ;
  return t;
}
const Ps = (e) => (qi << BigInt(e)) - qi;
function el(e, t, r) {
  if (We(e, "hashLen"), We(t, "qByteLen"), typeof r != "function")
    throw new Error("hmacFn must be a function");
  const n = (x) => new Uint8Array(x), o = Uint8Array.of(), i = Uint8Array.of(0), s = Uint8Array.of(1), c = 1e3;
  let a = n(e), u = n(e), f = 0;
  const d = () => {
    a.fill(1), u.fill(0), f = 0;
  }, h = (...x) => r(u, Zt(a, ...x)), p = (x = o) => {
    u = h(i, x), a = h(), x.length !== 0 && (u = h(s, x), a = h());
  }, w = () => {
    if (f++ >= c)
      throw new Error("drbg: tried max amount of iterations");
    let x = 0;
    const T = [];
    for (; x < t; ) {
      a = h();
      const A = a.slice();
      T.push(A), x += a.length;
    }
    return Zt(...T);
  };
  return (x, T) => {
    d(), p(x);
    let A;
    for (; !(A = T(w())); )
      p();
    return d(), A;
  };
}
function _s(e, t = {}, r = {}) {
  if (!e || typeof e != "object")
    throw new Error("expected valid options object");
  function n(i, s, c) {
    const a = e[i];
    if (c && a === void 0)
      return;
    const u = typeof a;
    if (u !== s || a === null)
      throw new Error(`param "${i}" is invalid: expected ${s}, got ${u}`);
  }
  const o = (i, s) => Object.entries(i).forEach(([c, a]) => n(c, a, s));
  o(t, !1), o(r, !0);
}
function vc(e) {
  const t = /* @__PURE__ */ new WeakMap();
  return (r, ...n) => {
    const o = t.get(r);
    if (o !== void 0)
      return o;
    const i = e(r, ...n);
    return t.set(r, i), i;
  };
}
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const kt = /* @__PURE__ */ BigInt(0), St = /* @__PURE__ */ BigInt(1), tn = /* @__PURE__ */ BigInt(2), pu = /* @__PURE__ */ BigInt(3), gu = /* @__PURE__ */ BigInt(4), wu = /* @__PURE__ */ BigInt(5), nl = /* @__PURE__ */ BigInt(7), yu = /* @__PURE__ */ BigInt(8), rl = /* @__PURE__ */ BigInt(9), mu = /* @__PURE__ */ BigInt(16);
function Gt(e, t) {
  const r = e % t;
  return r >= kt ? r : t + r;
}
function Vt(e, t, r) {
  let n = e;
  for (; t-- > kt; )
    n *= n, n %= r;
  return n;
}
function kc(e, t) {
  if (e === kt)
    throw new Error("invert: expected non-zero number");
  if (t <= kt)
    throw new Error("invert: expected positive modulus, got " + t);
  let r = Gt(e, t), n = t, o = kt, i = St;
  for (; r !== kt; ) {
    const c = n / r, a = n % r, u = o - i * c;
    n = r, r = a, o = i, i = u;
  }
  if (n !== St)
    throw new Error("invert: does not exist");
  return Gt(o, t);
}
function Ls(e, t, r) {
  if (!e.eql(e.sqr(t), r))
    throw new Error("Cannot find square root");
}
function xu(e, t) {
  const r = (e.ORDER + St) / gu, n = e.pow(t, r);
  return Ls(e, n, t), n;
}
function ol(e, t) {
  const r = (e.ORDER - wu) / yu, n = e.mul(t, tn), o = e.pow(n, r), i = e.mul(t, o), s = e.mul(e.mul(i, tn), o), c = e.mul(i, e.sub(s, e.ONE));
  return Ls(e, c, t), c;
}
function il(e) {
  const t = Zo(e), r = bu(e), n = r(t, t.neg(t.ONE)), o = r(t, n), i = r(t, t.neg(n)), s = (e + nl) / mu;
  return (c, a) => {
    let u = c.pow(a, s), f = c.mul(u, n);
    const d = c.mul(u, o), h = c.mul(u, i), p = c.eql(c.sqr(f), a), w = c.eql(c.sqr(d), a);
    u = c.cmov(u, f, p), f = c.cmov(h, d, w);
    const y = c.eql(c.sqr(f), a), x = c.cmov(u, f, y);
    return Ls(c, x, a), x;
  };
}
function bu(e) {
  if (e < pu)
    throw new Error("sqrt is not defined for small field");
  let t = e - St, r = 0;
  for (; t % tn === kt; )
    t /= tn, r++;
  let n = tn;
  const o = Zo(e);
  for (; Ic(o, n) === 1; )
    if (n++ > 1e3)
      throw new Error("Cannot find square root: probably non-prime P");
  if (r === 1)
    return xu;
  let i = o.pow(n, t);
  const s = (t + St) / tn;
  return function(a, u) {
    if (a.is0(u))
      return u;
    if (Ic(a, u) !== 1)
      throw new Error("Cannot find square root");
    let f = r, d = a.mul(a.ONE, i), h = a.pow(u, t), p = a.pow(u, s);
    for (; !a.eql(h, a.ONE); ) {
      if (a.is0(h))
        return a.ZERO;
      let w = 1, y = a.sqr(h);
      for (; !a.eql(y, a.ONE); )
        if (w++, y = a.sqr(y), w === f)
          throw new Error("Cannot find square root");
      const x = St << BigInt(f - w - 1), T = a.pow(d, x);
      f = w, d = a.sqr(T), h = a.mul(h, d), p = a.mul(p, T);
    }
    return p;
  };
}
function sl(e) {
  return e % gu === pu ? xu : e % yu === wu ? ol : e % mu === rl ? il(e) : bu(e);
}
const cl = [
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
function al(e) {
  const t = {
    ORDER: "bigint",
    BYTES: "number",
    BITS: "number"
  }, r = cl.reduce((n, o) => (n[o] = "function", n), t);
  return _s(e, r), e;
}
function ul(e, t, r) {
  if (r < kt)
    throw new Error("invalid exponent, negatives unsupported");
  if (r === kt)
    return e.ONE;
  if (r === St)
    return t;
  let n = e.ONE, o = t;
  for (; r > kt; )
    r & St && (n = e.mul(n, o)), o = e.sqr(o), r >>= St;
  return n;
}
function Eu(e, t, r = !1) {
  const n = new Array(t.length).fill(r ? e.ZERO : void 0), o = t.reduce((s, c, a) => e.is0(c) ? s : (n[a] = s, e.mul(s, c)), e.ONE), i = e.inv(o);
  return t.reduceRight((s, c, a) => e.is0(c) ? s : (n[a] = e.mul(s, n[a]), e.mul(s, c)), i), n;
}
function Ic(e, t) {
  const r = (e.ORDER - St) / tn, n = e.pow(t, r), o = e.eql(n, e.ONE), i = e.eql(n, e.ZERO), s = e.eql(n, e.neg(e.ONE));
  if (!o && !i && !s)
    throw new Error("invalid Legendre symbol result");
  return o ? 1 : i ? 0 : -1;
}
function fl(e, t) {
  t !== void 0 && We(t);
  const r = t !== void 0 ? t : e.toString(2).length, n = Math.ceil(r / 8);
  return { nBitLength: r, nByteLength: n };
}
let dl = class {
  ORDER;
  BITS;
  BYTES;
  isLE;
  ZERO = kt;
  ONE = St;
  _lengths;
  _sqrt;
  // cached sqrt
  _mod;
  constructor(t, r = {}) {
    if (t <= kt)
      throw new Error("invalid field: expected ORDER > 0, got " + t);
    let n;
    this.isLE = !1, r != null && typeof r == "object" && (typeof r.BITS == "number" && (n = r.BITS), typeof r.sqrt == "function" && (this.sqrt = r.sqrt), typeof r.isLE == "boolean" && (this.isLE = r.isLE), r.allowedLengths && (this._lengths = r.allowedLengths?.slice()), typeof r.modFromBytes == "boolean" && (this._mod = r.modFromBytes));
    const { nBitLength: o, nByteLength: i } = fl(t, n);
    if (i > 2048)
      throw new Error("invalid field: expected ORDER of <= 2048 bytes");
    this.ORDER = t, this.BITS = o, this.BYTES = i, this._sqrt = void 0, Object.preventExtensions(this);
  }
  create(t) {
    return Gt(t, this.ORDER);
  }
  isValid(t) {
    if (typeof t != "bigint")
      throw new Error("invalid field element: expected bigint, got " + typeof t);
    return kt <= t && t < this.ORDER;
  }
  is0(t) {
    return t === kt;
  }
  // is valid and invertible
  isValidNot0(t) {
    return !this.is0(t) && this.isValid(t);
  }
  isOdd(t) {
    return (t & St) === St;
  }
  neg(t) {
    return Gt(-t, this.ORDER);
  }
  eql(t, r) {
    return t === r;
  }
  sqr(t) {
    return Gt(t * t, this.ORDER);
  }
  add(t, r) {
    return Gt(t + r, this.ORDER);
  }
  sub(t, r) {
    return Gt(t - r, this.ORDER);
  }
  mul(t, r) {
    return Gt(t * r, this.ORDER);
  }
  pow(t, r) {
    return ul(this, t, r);
  }
  div(t, r) {
    return Gt(t * kc(r, this.ORDER), this.ORDER);
  }
  // Same as above, but doesn't normalize
  sqrN(t) {
    return t * t;
  }
  addN(t, r) {
    return t + r;
  }
  subN(t, r) {
    return t - r;
  }
  mulN(t, r) {
    return t * r;
  }
  inv(t) {
    return kc(t, this.ORDER);
  }
  sqrt(t) {
    return this._sqrt || (this._sqrt = sl(this.ORDER)), this._sqrt(this, t);
  }
  toBytes(t) {
    return this.isLE ? lu(t, this.BYTES) : Tr(t, this.BYTES);
  }
  fromBytes(t, r = !1) {
    Z(t);
    const { _lengths: n, BYTES: o, isLE: i, ORDER: s, _mod: c } = this;
    if (n) {
      if (!n.includes(t.length) || t.length > o)
        throw new Error("Field.fromBytes: expected " + n + " bytes, got " + t.length);
      const u = new Uint8Array(o);
      u.set(t, i ? 0 : u.length - t.length), t = u;
    }
    if (t.length !== o)
      throw new Error("Field.fromBytes: expected " + o + " bytes, got " + t.length);
    let a = i ? du(t) : ke(t);
    if (c && (a = Gt(a, s)), !r && !this.isValid(a))
      throw new Error("invalid field element: outside of range 0..ORDER");
    return a;
  }
  // TODO: we don't need it here, move out to separate fn
  invertBatch(t) {
    return Eu(this, t);
  }
  // We can't move this out because Fp6, Fp12 implement it
  // and it's unclear what to return in there.
  cmov(t, r, n) {
    return n ? r : t;
  }
};
function Zo(e, t = {}) {
  return new dl(e, t);
}
function Su(e) {
  if (typeof e != "bigint")
    throw new Error("field order must be bigint");
  const t = e.toString(2).length;
  return Math.ceil(t / 8);
}
function Tu(e) {
  const t = Su(e);
  return t + Math.ceil(t / 2);
}
function vu(e, t, r = !1) {
  Z(e);
  const n = e.length, o = Su(t), i = Tu(t);
  if (n < 16 || n < i || n > 1024)
    throw new Error("expected " + i + "-1024 bytes of input, got " + n);
  const s = r ? du(e) : ke(e), c = Gt(s, t - St) + St;
  return r ? lu(c, o) : Tr(c, o);
}
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const Bn = /* @__PURE__ */ BigInt(0), en = /* @__PURE__ */ BigInt(1);
function lo(e, t) {
  const r = t.negate();
  return e ? r : t;
}
function Ac(e, t) {
  const r = Eu(e.Fp, t.map((n) => n.Z));
  return t.map((n, o) => e.fromAffine(n.toAffine(r[o])));
}
function ku(e, t) {
  if (!Number.isSafeInteger(e) || e <= 0 || e > t)
    throw new Error("invalid window size, expected [1.." + t + "], got W=" + e);
}
function xi(e, t) {
  ku(e, t);
  const r = Math.ceil(t / e) + 1, n = 2 ** (e - 1), o = 2 ** e, i = Ps(e), s = BigInt(e);
  return { windows: r, windowSize: n, mask: i, maxNumber: o, shiftBy: s };
}
function Bc(e, t, r) {
  const { windowSize: n, mask: o, maxNumber: i, shiftBy: s } = r;
  let c = Number(e & o), a = e >> s;
  c > n && (c -= i, a += en);
  const u = t * n, f = u + Math.abs(c) - 1, d = c === 0, h = c < 0, p = t % 2 !== 0;
  return { nextN: a, offset: f, isZero: d, isNeg: h, isNegF: p, offsetF: u };
}
const bi = /* @__PURE__ */ new WeakMap(), Iu = /* @__PURE__ */ new WeakMap();
function Ei(e) {
  return Iu.get(e) || 1;
}
function $c(e) {
  if (e !== Bn)
    throw new Error("invalid wNAF");
}
let ll = class {
  BASE;
  ZERO;
  Fn;
  bits;
  // Parametrized with a given Point class (not individual point)
  constructor(t, r) {
    this.BASE = t.BASE, this.ZERO = t.ZERO, this.Fn = t.Fn, this.bits = r;
  }
  // non-const time multiplication ladder
  _unsafeLadder(t, r, n = this.ZERO) {
    let o = t;
    for (; r > Bn; )
      r & en && (n = n.add(o)), o = o.double(), r >>= en;
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
  precomputeWindow(t, r) {
    const { windows: n, windowSize: o } = xi(r, this.bits), i = [];
    let s = t, c = s;
    for (let a = 0; a < n; a++) {
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
  wNAF(t, r, n) {
    if (!this.Fn.isValid(n))
      throw new Error("invalid scalar");
    let o = this.ZERO, i = this.BASE;
    const s = xi(t, this.bits);
    for (let c = 0; c < s.windows; c++) {
      const { nextN: a, offset: u, isZero: f, isNeg: d, isNegF: h, offsetF: p } = Bc(n, c, s);
      n = a, f ? i = i.add(lo(h, r[p])) : o = o.add(lo(d, r[u]));
    }
    return $c(n), { p: o, f: i };
  }
  /**
   * Implements ec unsafe (non const-time) multiplication using precomputed tables and w-ary non-adjacent form.
   * @param acc accumulator point to add result of multiplication
   * @returns point
   */
  wNAFUnsafe(t, r, n, o = this.ZERO) {
    const i = xi(t, this.bits);
    for (let s = 0; s < i.windows && n !== Bn; s++) {
      const { nextN: c, offset: a, isZero: u, isNeg: f } = Bc(n, s, i);
      if (n = c, !u) {
        const d = r[a];
        o = o.add(f ? d.negate() : d);
      }
    }
    return $c(n), o;
  }
  getPrecomputes(t, r, n) {
    let o = bi.get(r);
    return o || (o = this.precomputeWindow(r, t), t !== 1 && (typeof n == "function" && (o = n(o)), bi.set(r, o))), o;
  }
  cached(t, r, n) {
    const o = Ei(t);
    return this.wNAF(o, this.getPrecomputes(o, t, n), r);
  }
  unsafe(t, r, n, o) {
    const i = Ei(t);
    return i === 1 ? this._unsafeLadder(t, r, o) : this.wNAFUnsafe(i, this.getPrecomputes(i, t, n), r, o);
  }
  // We calculate precomputes for elliptic curve point multiplication
  // using windowed method. This specifies window size and
  // stores precomputed values. Usually only base point would be precomputed.
  createCache(t, r) {
    ku(r, this.bits), Iu.set(t, r), bi.delete(t);
  }
  hasCache(t) {
    return Ei(t) !== 1;
  }
};
function hl(e, t, r, n) {
  let o = t, i = e.ZERO, s = e.ZERO;
  for (; r > Bn || n > Bn; )
    r & en && (i = i.add(o)), n & en && (s = s.add(o)), o = o.double(), r >>= en, n >>= en;
  return { p1: i, p2: s };
}
function Rc(e, t, r) {
  if (t) {
    if (t.ORDER !== e)
      throw new Error("Field.ORDER must match order: Fp == p, Fn == n");
    return al(t), t;
  } else
    return Zo(e, { isLE: r });
}
function pl(e, t, r = {}, n) {
  if (n === void 0 && (n = e === "edwards"), !t || typeof t != "object")
    throw new Error(`expected valid ${e} CURVE object`);
  for (const a of ["p", "n", "h"]) {
    const u = t[a];
    if (!(typeof u == "bigint" && u > Bn))
      throw new Error(`CURVE.${a} must be positive bigint`);
  }
  const o = Rc(t.p, r.Fp, n), i = Rc(t.n, r.Fn, n), c = ["Gx", "Gy", "a", "b"];
  for (const a of c)
    if (!o.isValid(t[a]))
      throw new Error(`CURVE.${a} must be valid field element of CURVE.Fp`);
  return t = Object.freeze(Object.assign({}, t)), { CURVE: t, Fp: o, Fn: i };
}
function Au(e, t) {
  return function(n) {
    const o = e(n);
    return { secretKey: o, publicKey: t(o) };
  };
}
let Bu = class {
  oHash;
  iHash;
  blockLen;
  outputLen;
  finished = !1;
  destroyed = !1;
  constructor(t, r) {
    if (iu(t), Z(r, void 0, "key"), this.iHash = t.create(), typeof this.iHash.update != "function")
      throw new Error("Expected instance of class which extends utils.Hash");
    this.blockLen = this.iHash.blockLen, this.outputLen = this.iHash.outputLen;
    const n = this.blockLen, o = new Uint8Array(n);
    o.set(r.length > n ? t.create().update(r).digest() : r);
    for (let i = 0; i < o.length; i++)
      o[i] ^= 54;
    this.iHash.update(o), this.oHash = t.create();
    for (let i = 0; i < o.length; i++)
      o[i] ^= 106;
    this.oHash.update(o), An(o);
  }
  update(t) {
    return ao(this), this.iHash.update(t), this;
  }
  digestInto(t) {
    ao(this), Z(t, this.outputLen, "output"), this.finished = !0, this.iHash.digestInto(t), this.oHash.update(t), this.oHash.digestInto(t), this.destroy();
  }
  digest() {
    const t = new Uint8Array(this.oHash.outputLen);
    return this.digestInto(t), t;
  }
  _cloneInto(t) {
    t ||= Object.create(Object.getPrototypeOf(this), {});
    const { oHash: r, iHash: n, finished: o, destroyed: i, blockLen: s, outputLen: c } = this;
    return t = t, t.finished = o, t.destroyed = i, t.blockLen = s, t.outputLen = c, t.oHash = r._cloneInto(t.oHash), t.iHash = n._cloneInto(t.iHash), t;
  }
  clone() {
    return this._cloneInto();
  }
  destroy() {
    this.destroyed = !0, this.oHash.destroy(), this.iHash.destroy();
  }
};
const $u = (e, t, r) => new Bu(e, t).update(r).digest();
$u.create = (e, t) => new Bu(e, t);
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const Oc = (e, t) => (e + (e >= 0 ? t : -t) / Ru) / t;
function gl(e, t, r) {
  const [[n, o], [i, s]] = t, c = Oc(s * e, r), a = Oc(-o * e, r);
  let u = e - c * n - a * i, f = -c * o - a * s;
  const d = u < be, h = f < be;
  d && (u = -u), h && (f = -f);
  const p = Ps(Math.ceil(tl(r) / 2)) + xn;
  if (u < be || u >= p || f < be || f >= p)
    throw new Error("splitScalar (endomorphism): failed, k=" + e);
  return { k1neg: d, k1: u, k2neg: h, k2: f };
}
function Yi(e) {
  if (!["compact", "recovered", "der"].includes(e))
    throw new Error('Signature format must be "compact", "recovered", or "der"');
  return e;
}
function Si(e, t) {
  const r = {};
  for (let n of Object.keys(t))
    r[n] = e[n] === void 0 ? t[n] : e[n];
  return fo(r.lowS, "lowS"), fo(r.prehash, "prehash"), r.format !== void 0 && Yi(r.format), r;
}
let wl = class extends Error {
  constructor(t = "") {
    super(t);
  }
};
const Ue = {
  // asn.1 DER encoding utils
  Err: wl,
  // Basic building block is TLV (Tag-Length-Value)
  _tlv: {
    encode: (e, t) => {
      const { Err: r } = Ue;
      if (e < 0 || e > 256)
        throw new r("tlv.encode: wrong tag");
      if (t.length & 1)
        throw new r("tlv.encode: unpadded data");
      const n = t.length / 2, o = Rr(n);
      if (o.length / 2 & 128)
        throw new r("tlv.encode: long form length too big");
      const i = n > 127 ? Rr(o.length / 2 | 128) : "";
      return Rr(e) + i + o + t;
    },
    // v - value, l - left bytes (unparsed)
    decode(e, t) {
      const { Err: r } = Ue;
      let n = 0;
      if (e < 0 || e > 256)
        throw new r("tlv.encode: wrong tag");
      if (t.length < 2 || t[n++] !== e)
        throw new r("tlv.decode: wrong tlv");
      const o = t[n++], i = !!(o & 128);
      let s = 0;
      if (!i)
        s = o;
      else {
        const a = o & 127;
        if (!a)
          throw new r("tlv.decode(long): indefinite length not supported");
        if (a > 4)
          throw new r("tlv.decode(long): byte length is too big");
        const u = t.subarray(n, n + a);
        if (u.length !== a)
          throw new r("tlv.decode: length bytes not complete");
        if (u[0] === 0)
          throw new r("tlv.decode(long): zero leftmost byte");
        for (const f of u)
          s = s << 8 | f;
        if (n += a, s < 128)
          throw new r("tlv.decode(long): not minimal encoding");
      }
      const c = t.subarray(n, n + s);
      if (c.length !== s)
        throw new r("tlv.decode: wrong value length");
      return { v: c, l: t.subarray(n + s) };
    }
  },
  // https://crypto.stackexchange.com/a/57734 Leftmost bit of first byte is 'negative' flag,
  // since we always use positive integers here. It must always be empty:
  // - add zero byte if exists
  // - if next byte doesn't have a flag, leading zero is not allowed (minimal encoding)
  _int: {
    encode(e) {
      const { Err: t } = Ue;
      if (e < be)
        throw new t("integer: negative integers are not allowed");
      let r = Rr(e);
      if (Number.parseInt(r[0], 16) & 8 && (r = "00" + r), r.length & 1)
        throw new t("unexpected DER parsing assertion: unpadded hex");
      return r;
    },
    decode(e) {
      const { Err: t } = Ue;
      if (e[0] & 128)
        throw new t("invalid signature integer: negative");
      if (e[0] === 0 && !(e[1] & 128))
        throw new t("invalid signature integer: unnecessary leading zero");
      return ke(e);
    }
  },
  toSig(e) {
    const { Err: t, _int: r, _tlv: n } = Ue, o = Z(e, void 0, "signature"), { v: i, l: s } = n.decode(48, o);
    if (s.length)
      throw new t("invalid signature: left bytes after parsing");
    const { v: c, l: a } = n.decode(2, i), { v: u, l: f } = n.decode(2, a);
    if (f.length)
      throw new t("invalid signature: left bytes after parsing");
    return { r: r.decode(c), s: r.decode(u) };
  },
  hexFromSig(e) {
    const { _tlv: t, _int: r } = Ue, n = t.encode(2, r.encode(e.r)), o = t.encode(2, r.encode(e.s)), i = n + o;
    return t.encode(48, i);
  }
}, be = BigInt(0), xn = BigInt(1), Ru = BigInt(2), Or = BigInt(3), yl = BigInt(4);
function ml(e, t = {}) {
  const r = pl("weierstrass", e, t), { Fp: n, Fn: o } = r;
  let i = r.CURVE;
  const { h: s, n: c } = i;
  _s(t, {}, {
    allowInfinityPoint: "boolean",
    clearCofactor: "function",
    isTorsionFree: "function",
    fromBytes: "function",
    toBytes: "function",
    endo: "object"
  });
  const { endo: a } = t;
  if (a && (!n.is0(i.a) || typeof a.beta != "bigint" || !Array.isArray(a.basises)))
    throw new Error('invalid endo: expected "beta": bigint and "basises": array');
  const u = Uu(n, o);
  function f() {
    if (!n.isOdd)
      throw new Error("compression is not supported: Field does not have .isOdd()");
  }
  function d(S, m, E) {
    const { x: l, y: b } = m.toAffine(), k = n.toBytes(l);
    if (fo(E, "isCompressed"), E) {
      f();
      const N = !n.isOdd(b);
      return Zt(Ou(N), k);
    } else
      return Zt(Uint8Array.of(4), k, n.toBytes(b));
  }
  function h(S) {
    Z(S, void 0, "Point");
    const { publicKey: m, publicKeyUncompressed: E } = u, l = S.length, b = S[0], k = S.subarray(1);
    if (l === m && (b === 2 || b === 3)) {
      const N = n.fromBytes(k);
      if (!n.isValid(N))
        throw new Error("bad point: is not on curve, wrong x");
      const O = y(N);
      let U;
      try {
        U = n.sqrt(O);
      } catch (M) {
        const H = M instanceof Error ? ": " + M.message : "";
        throw new Error("bad point: is not on curve, sqrt error" + H);
      }
      f();
      const B = n.isOdd(U);
      return (b & 1) === 1 !== B && (U = n.neg(U)), { x: N, y: U };
    } else if (l === E && b === 4) {
      const N = n.BYTES, O = n.fromBytes(k.subarray(0, N)), U = n.fromBytes(k.subarray(N, N * 2));
      if (!x(O, U))
        throw new Error("bad point: is not on curve");
      return { x: O, y: U };
    } else
      throw new Error(`bad point: got length ${l}, expected compressed=${m} or uncompressed=${E}`);
  }
  const p = t.toBytes || d, w = t.fromBytes || h;
  function y(S) {
    const m = n.sqr(S), E = n.mul(m, S);
    return n.add(n.add(E, n.mul(S, i.a)), i.b);
  }
  function x(S, m) {
    const E = n.sqr(m), l = y(S);
    return n.eql(E, l);
  }
  if (!x(i.Gx, i.Gy))
    throw new Error("bad curve params: generator point");
  const T = n.mul(n.pow(i.a, Or), yl), A = n.mul(n.sqr(i.b), BigInt(27));
  if (n.is0(n.add(T, A)))
    throw new Error("bad curve params: a or b");
  function R(S, m, E = !1) {
    if (!n.isValid(m) || E && n.is0(m))
      throw new Error(`bad point coordinate ${S}`);
    return m;
  }
  function C(S) {
    if (!(S instanceof _))
      throw new Error("Weierstrass Point expected");
  }
  function $(S) {
    if (!a || !a.basises)
      throw new Error("no endo");
    return gl(S, a.basises, o.ORDER);
  }
  const V = vc((S, m) => {
    const { X: E, Y: l, Z: b } = S;
    if (n.eql(b, n.ONE))
      return { x: E, y: l };
    const k = S.is0();
    m == null && (m = k ? n.ONE : n.inv(b));
    const N = n.mul(E, m), O = n.mul(l, m), U = n.mul(b, m);
    if (k)
      return { x: n.ZERO, y: n.ZERO };
    if (!n.eql(U, n.ONE))
      throw new Error("invZ was invalid");
    return { x: N, y: O };
  }), g = vc((S) => {
    if (S.is0()) {
      if (t.allowInfinityPoint && !n.is0(S.Y))
        return;
      throw new Error("bad point: ZERO");
    }
    const { x: m, y: E } = S.toAffine();
    if (!n.isValid(m) || !n.isValid(E))
      throw new Error("bad point: x or y not field elements");
    if (!x(m, E))
      throw new Error("bad point: equation left != right");
    if (!S.isTorsionFree())
      throw new Error("bad point: not in prime-order subgroup");
    return !0;
  });
  function K(S, m, E, l, b) {
    return E = new _(n.mul(E.X, S), E.Y, E.Z), m = lo(l, m), E = lo(b, E), m.add(E);
  }
  class _ {
    // base / generator point
    static BASE = new _(i.Gx, i.Gy, n.ONE);
    // zero / infinity / identity point
    static ZERO = new _(n.ZERO, n.ONE, n.ZERO);
    // 0, 1, 0
    // math field
    static Fp = n;
    // scalar field
    static Fn = o;
    X;
    Y;
    Z;
    /** Does NOT validate if the point is valid. Use `.assertValidity()`. */
    constructor(m, E, l) {
      this.X = R("x", m), this.Y = R("y", E, !0), this.Z = R("z", l), Object.freeze(this);
    }
    static CURVE() {
      return i;
    }
    /** Does NOT validate if the point is valid. Use `.assertValidity()`. */
    static fromAffine(m) {
      const { x: E, y: l } = m || {};
      if (!m || !n.isValid(E) || !n.isValid(l))
        throw new Error("invalid affine point");
      if (m instanceof _)
        throw new Error("projective point not allowed");
      return n.is0(E) && n.is0(l) ? _.ZERO : new _(E, l, n.ONE);
    }
    static fromBytes(m) {
      const E = _.fromAffine(w(Z(m, void 0, "point")));
      return E.assertValidity(), E;
    }
    static fromHex(m) {
      return _.fromBytes(uo(m));
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
    precompute(m = 8, E = !0) {
      return I.createCache(this, m), E || this.multiply(Or), this;
    }
    // TODO: return `this`
    /** A point on curve is valid if it conforms to equation. */
    assertValidity() {
      g(this);
    }
    hasEvenY() {
      const { y: m } = this.toAffine();
      if (!n.isOdd)
        throw new Error("Field doesn't support isOdd");
      return !n.isOdd(m);
    }
    /** Compare one point to another. */
    equals(m) {
      C(m);
      const { X: E, Y: l, Z: b } = this, { X: k, Y: N, Z: O } = m, U = n.eql(n.mul(E, O), n.mul(k, b)), B = n.eql(n.mul(l, O), n.mul(N, b));
      return U && B;
    }
    /** Flips point to one corresponding to (x, -y) in Affine coordinates. */
    negate() {
      return new _(this.X, n.neg(this.Y), this.Z);
    }
    // Renes-Costello-Batina exception-free doubling formula.
    // There is 30% faster Jacobian formula, but it is not complete.
    // https://eprint.iacr.org/2015/1060, algorithm 3
    // Cost: 8M + 3S + 3*a + 2*b3 + 15add.
    double() {
      const { a: m, b: E } = i, l = n.mul(E, Or), { X: b, Y: k, Z: N } = this;
      let O = n.ZERO, U = n.ZERO, B = n.ZERO, P = n.mul(b, b), M = n.mul(k, k), H = n.mul(N, N), L = n.mul(b, k);
      return L = n.add(L, L), B = n.mul(b, N), B = n.add(B, B), O = n.mul(m, B), U = n.mul(l, H), U = n.add(O, U), O = n.sub(M, U), U = n.add(M, U), U = n.mul(O, U), O = n.mul(L, O), B = n.mul(l, B), H = n.mul(m, H), L = n.sub(P, H), L = n.mul(m, L), L = n.add(L, B), B = n.add(P, P), P = n.add(B, P), P = n.add(P, H), P = n.mul(P, L), U = n.add(U, P), H = n.mul(k, N), H = n.add(H, H), P = n.mul(H, L), O = n.sub(O, P), B = n.mul(H, M), B = n.add(B, B), B = n.add(B, B), new _(O, U, B);
    }
    // Renes-Costello-Batina exception-free addition formula.
    // There is 30% faster Jacobian formula, but it is not complete.
    // https://eprint.iacr.org/2015/1060, algorithm 1
    // Cost: 12M + 0S + 3*a + 3*b3 + 23add.
    add(m) {
      C(m);
      const { X: E, Y: l, Z: b } = this, { X: k, Y: N, Z: O } = m;
      let U = n.ZERO, B = n.ZERO, P = n.ZERO;
      const M = i.a, H = n.mul(i.b, Or);
      let L = n.mul(E, k), W = n.mul(l, N), G = n.mul(b, O), ot = n.add(E, l), j = n.add(k, N);
      ot = n.mul(ot, j), j = n.add(L, W), ot = n.sub(ot, j), j = n.add(E, b);
      let J = n.add(k, O);
      return j = n.mul(j, J), J = n.add(L, G), j = n.sub(j, J), J = n.add(l, b), U = n.add(N, O), J = n.mul(J, U), U = n.add(W, G), J = n.sub(J, U), P = n.mul(M, j), U = n.mul(H, G), P = n.add(U, P), U = n.sub(W, P), P = n.add(W, P), B = n.mul(U, P), W = n.add(L, L), W = n.add(W, L), G = n.mul(M, G), j = n.mul(H, j), W = n.add(W, G), G = n.sub(L, G), G = n.mul(M, G), j = n.add(j, G), L = n.mul(W, j), B = n.add(B, L), L = n.mul(J, j), U = n.mul(ot, U), U = n.sub(U, L), L = n.mul(ot, W), P = n.mul(J, P), P = n.add(P, L), new _(U, B, P);
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
      const { endo: E } = t;
      if (!o.isValidNot0(m))
        throw new Error("invalid scalar: out of range");
      let l, b;
      const k = (N) => I.cached(this, N, (O) => Ac(_, O));
      if (E) {
        const { k1neg: N, k1: O, k2neg: U, k2: B } = $(m), { p: P, f: M } = k(O), { p: H, f: L } = k(B);
        b = M.add(L), l = K(E.beta, P, H, N, U);
      } else {
        const { p: N, f: O } = k(m);
        l = N, b = O;
      }
      return Ac(_, [l, b])[0];
    }
    /**
     * Non-constant-time multiplication. Uses double-and-add algorithm.
     * It's faster, but should only be used when you don't care about
     * an exposed secret key e.g. sig verification, which works over *public* keys.
     */
    multiplyUnsafe(m) {
      const { endo: E } = t, l = this;
      if (!o.isValid(m))
        throw new Error("invalid scalar: out of range");
      if (m === be || l.is0())
        return _.ZERO;
      if (m === xn)
        return l;
      if (I.hasCache(this))
        return this.multiply(m);
      if (E) {
        const { k1neg: b, k1: k, k2neg: N, k2: O } = $(m), { p1: U, p2: B } = hl(_, l, k, O);
        return K(E.beta, U, B, b, N);
      } else
        return I.unsafe(l, m);
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
      return s === xn ? !0 : m ? m(_, this) : I.unsafe(this, c).is0();
    }
    clearCofactor() {
      const { clearCofactor: m } = t;
      return s === xn ? this : m ? m(_, this) : this.multiplyUnsafe(s);
    }
    isSmallOrder() {
      return this.multiplyUnsafe(s).is0();
    }
    toBytes(m = !0) {
      return fo(m, "isCompressed"), this.assertValidity(), p(_, this, m);
    }
    toHex(m = !0) {
      return Yo(this.toBytes(m));
    }
    toString() {
      return `<Point ${this.is0() ? "ZERO" : this.toHex()}>`;
    }
  }
  const z = o.BITS, I = new ll(_, t.endo ? Math.ceil(z / 2) : z);
  return _.BASE.precompute(8), _;
}
function Ou(e) {
  return Uint8Array.of(e ? 2 : 3);
}
function Uu(e, t) {
  return {
    secretKey: t.BYTES,
    publicKey: 1 + e.BYTES,
    publicKeyUncompressed: 1 + 2 * e.BYTES,
    publicKeyHasPrefix: !0,
    signature: 2 * t.BYTES
  };
}
function xl(e, t = {}) {
  const { Fn: r } = e, n = t.randomBytes || Sr, o = Object.assign(Uu(e.Fp, r), { seed: Tu(r.ORDER) });
  function i(p) {
    try {
      const w = r.fromBytes(p);
      return r.isValidNot0(w);
    } catch {
      return !1;
    }
  }
  function s(p, w) {
    const { publicKey: y, publicKeyUncompressed: x } = o;
    try {
      const T = p.length;
      return w === !0 && T !== y || w === !1 && T !== x ? !1 : !!e.fromBytes(p);
    } catch {
      return !1;
    }
  }
  function c(p = n(o.seed)) {
    return vu(Z(p, o.seed, "seed"), r.ORDER);
  }
  function a(p, w = !0) {
    return e.BASE.multiply(r.fromBytes(p)).toBytes(w);
  }
  function u(p) {
    const { secretKey: w, publicKey: y, publicKeyUncompressed: x } = o;
    if (!Ns(p) || "_lengths" in r && r._lengths || w === y)
      return;
    const T = Z(p, void 0, "key").length;
    return T === y || T === x;
  }
  function f(p, w, y = !0) {
    if (u(p) === !0)
      throw new Error("first arg must be private key");
    if (u(w) === !1)
      throw new Error("second arg must be public key");
    const x = r.fromBytes(p);
    return e.fromBytes(w).multiply(x).toBytes(y);
  }
  const d = {
    isValidSecretKey: i,
    isValidPublicKey: s,
    randomSecretKey: c
  }, h = Au(c, a);
  return Object.freeze({ getPublicKey: a, getSharedSecret: f, keygen: h, Point: e, utils: d, lengths: o });
}
function bl(e, t, r = {}) {
  iu(t), _s(r, {}, {
    hmac: "function",
    lowS: "boolean",
    randomBytes: "function",
    bits2int: "function",
    bits2int_modN: "function"
  }), r = Object.assign({}, r);
  const n = r.randomBytes || Sr, o = r.hmac || ((E, l) => $u(t, E, l)), { Fp: i, Fn: s } = e, { ORDER: c, BITS: a } = s, { keygen: u, getPublicKey: f, getSharedSecret: d, utils: h, lengths: p } = xl(e, r), w = {
    prehash: !0,
    lowS: typeof r.lowS == "boolean" ? r.lowS : !0,
    format: "compact",
    extraEntropy: !1
  }, y = c * Ru < i.ORDER;
  function x(E) {
    const l = c >> xn;
    return E > l;
  }
  function T(E, l) {
    if (!s.isValidNot0(l))
      throw new Error(`invalid signature ${E}: out of range 1..Point.Fn.ORDER`);
    return l;
  }
  function A() {
    if (y)
      throw new Error('"recovered" sig type is not supported for cofactor >2 curves');
  }
  function R(E, l) {
    Yi(l);
    const b = p.signature, k = l === "compact" ? b : l === "recovered" ? b + 1 : void 0;
    return Z(E, k);
  }
  class C {
    r;
    s;
    recovery;
    constructor(l, b, k) {
      if (this.r = T("r", l), this.s = T("s", b), k != null) {
        if (A(), ![0, 1, 2, 3].includes(k))
          throw new Error("invalid recovery id");
        this.recovery = k;
      }
      Object.freeze(this);
    }
    static fromBytes(l, b = w.format) {
      R(l, b);
      let k;
      if (b === "der") {
        const { r: B, s: P } = Ue.toSig(Z(l));
        return new C(B, P);
      }
      b === "recovered" && (k = l[0], b = "compact", l = l.subarray(1));
      const N = p.signature / 2, O = l.subarray(0, N), U = l.subarray(N, N * 2);
      return new C(s.fromBytes(O), s.fromBytes(U), k);
    }
    static fromHex(l, b) {
      return this.fromBytes(uo(l), b);
    }
    assertRecovery() {
      const { recovery: l } = this;
      if (l == null)
        throw new Error("invalid recovery id: must be present");
      return l;
    }
    addRecoveryBit(l) {
      return new C(this.r, this.s, l);
    }
    recoverPublicKey(l) {
      const { r: b, s: k } = this, N = this.assertRecovery(), O = N === 2 || N === 3 ? b + c : b;
      if (!i.isValid(O))
        throw new Error("invalid recovery id: sig.r+curve.n != R.x");
      const U = i.toBytes(O), B = e.fromBytes(Zt(Ou((N & 1) === 0), U)), P = s.inv(O), M = V(Z(l, void 0, "msgHash")), H = s.create(-M * P), L = s.create(k * P), W = e.BASE.multiplyUnsafe(H).add(B.multiplyUnsafe(L));
      if (W.is0())
        throw new Error("invalid recovery: point at infinify");
      return W.assertValidity(), W;
    }
    // Signatures should be low-s, to prevent malleability.
    hasHighS() {
      return x(this.s);
    }
    toBytes(l = w.format) {
      if (Yi(l), l === "der")
        return uo(Ue.hexFromSig(this));
      const { r: b, s: k } = this, N = s.toBytes(b), O = s.toBytes(k);
      return l === "recovered" ? (A(), Zt(Uint8Array.of(this.assertRecovery()), N, O)) : Zt(N, O);
    }
    toHex(l) {
      return Yo(this.toBytes(l));
    }
  }
  const $ = r.bits2int || function(l) {
    if (l.length > 8192)
      throw new Error("input is too large");
    const b = ke(l), k = l.length * 8 - a;
    return k > 0 ? b >> BigInt(k) : b;
  }, V = r.bits2int_modN || function(l) {
    return s.create($(l));
  }, g = Ps(a);
  function K(E) {
    return hu("num < 2^" + a, E, be, g), s.toBytes(E);
  }
  function _(E, l) {
    return Z(E, void 0, "message"), l ? Z(t(E), void 0, "prehashed message") : E;
  }
  function z(E, l, b) {
    const { lowS: k, prehash: N, extraEntropy: O } = Si(b, w);
    E = _(E, N);
    const U = V(E), B = s.fromBytes(l);
    if (!s.isValidNot0(B))
      throw new Error("invalid private key");
    const P = [K(B), K(U)];
    if (O != null && O !== !1) {
      const W = O === !0 ? n(p.secretKey) : O;
      P.push(Z(W, void 0, "extraEntropy"));
    }
    const M = Zt(...P), H = U;
    function L(W) {
      const G = $(W);
      if (!s.isValidNot0(G))
        return;
      const ot = s.inv(G), j = e.BASE.multiply(G).toAffine(), J = s.create(j.x);
      if (J === be)
        return;
      const we = s.create(ot * s.create(H + J * B));
      if (we === be)
        return;
      let qn = (j.x === J ? 0 : 2) | Number(j.y & xn), Yn = we;
      return k && x(we) && (Yn = s.neg(we), qn ^= 1), new C(J, Yn, y ? void 0 : qn);
    }
    return { seed: M, k2sig: L };
  }
  function I(E, l, b = {}) {
    const { seed: k, k2sig: N } = z(E, l, b);
    return el(t.outputLen, s.BYTES, o)(k, N).toBytes(b.format);
  }
  function S(E, l, b, k = {}) {
    const { lowS: N, prehash: O, format: U } = Si(k, w);
    if (b = Z(b, void 0, "publicKey"), l = _(l, O), !Ns(E)) {
      const B = E instanceof C ? ", use sig.toBytes()" : "";
      throw new Error("verify expects Uint8Array signature" + B);
    }
    R(E, U);
    try {
      const B = C.fromBytes(E, U), P = e.fromBytes(b);
      if (N && B.hasHighS())
        return !1;
      const { r: M, s: H } = B, L = V(l), W = s.inv(H), G = s.create(L * W), ot = s.create(M * W), j = e.BASE.multiplyUnsafe(G).add(P.multiplyUnsafe(ot));
      return j.is0() ? !1 : s.create(j.x) === M;
    } catch {
      return !1;
    }
  }
  function m(E, l, b = {}) {
    const { prehash: k } = Si(b, w);
    return l = _(l, k), C.fromBytes(E, "recovered").recoverPublicKey(l).toBytes();
  }
  return Object.freeze({
    keygen: u,
    getPublicKey: f,
    getSharedSecret: d,
    utils: h,
    lengths: p,
    Point: e,
    sign: I,
    verify: S,
    recoverPublicKey: m,
    Signature: C,
    hash: t
  });
}
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const Xo = {
  p: BigInt("0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffefffffc2f"),
  n: BigInt("0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141"),
  h: BigInt(1),
  a: BigInt(0),
  b: BigInt(7),
  Gx: BigInt("0x79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798"),
  Gy: BigInt("0x483ada7726a3c4655da4fbfc0e1108a8fd17b448a68554199c47d08ffb10d4b8")
}, El = {
  beta: BigInt("0x7ae96a2b657c07106e64479eac3434e99cf0497512f58995c1396c28719501ee"),
  basises: [
    [BigInt("0x3086d221a7d46bcde86c90e49284eb15"), -BigInt("0xe4437ed6010e88286f547fa90abfe4c3")],
    [BigInt("0x114ca50f7a8e2f3f657c1108d9d44cfd8"), BigInt("0x3086d221a7d46bcde86c90e49284eb15")]
  ]
}, Sl = /* @__PURE__ */ BigInt(0), Zi = /* @__PURE__ */ BigInt(2);
function Tl(e) {
  const t = Xo.p, r = BigInt(3), n = BigInt(6), o = BigInt(11), i = BigInt(22), s = BigInt(23), c = BigInt(44), a = BigInt(88), u = e * e * e % t, f = u * u * e % t, d = Vt(f, r, t) * f % t, h = Vt(d, r, t) * f % t, p = Vt(h, Zi, t) * u % t, w = Vt(p, o, t) * p % t, y = Vt(w, i, t) * w % t, x = Vt(y, c, t) * y % t, T = Vt(x, a, t) * x % t, A = Vt(T, c, t) * y % t, R = Vt(A, r, t) * f % t, C = Vt(R, s, t) * w % t, $ = Vt(C, n, t) * u % t, V = Vt($, Zi, t);
  if (!ho.eql(ho.sqr(V), e))
    throw new Error("Cannot find square root");
  return V;
}
const ho = Zo(Xo.p, { sqrt: Tl }), hn = /* @__PURE__ */ ml(Xo, {
  Fp: ho,
  endo: El
}), Pe = /* @__PURE__ */ bl(hn, mt), Uc = {};
function po(e, ...t) {
  let r = Uc[e];
  if (r === void 0) {
    const n = mt(Jd(e));
    r = Zt(n, n), Uc[e] = r;
  }
  return mt(Zt(r, ...t));
}
const Vs = (e) => e.toBytes(!0).slice(1), Ds = (e) => e % Zi === Sl;
function Xi(e) {
  const { Fn: t, BASE: r } = hn, n = t.fromBytes(e), o = r.multiply(n);
  return { scalar: Ds(o.y) ? n : t.neg(n), bytes: Vs(o) };
}
function Nu(e) {
  const t = ho;
  if (!t.isValidNot0(e))
    throw new Error("invalid x: Fail if x ≥ p");
  const r = t.create(e * e), n = t.create(r * e + BigInt(7));
  let o = t.sqrt(n);
  Ds(o) || (o = t.neg(o));
  const i = hn.fromAffine({ x: e, y: o });
  return i.assertValidity(), i;
}
const ir = ke;
function Cu(...e) {
  return hn.Fn.create(ir(po("BIP0340/challenge", ...e)));
}
function Nc(e) {
  return Xi(e).bytes;
}
function vl(e, t, r = Sr(32)) {
  const { Fn: n } = hn, o = Z(e, void 0, "message"), { bytes: i, scalar: s } = Xi(t), c = Z(r, 32, "auxRand"), a = n.toBytes(s ^ ir(po("BIP0340/aux", c))), u = po("BIP0340/nonce", a, i, o), { bytes: f, scalar: d } = Xi(u), h = Cu(f, i, o), p = new Uint8Array(64);
  if (p.set(f, 0), p.set(n.toBytes(n.create(d + h * s)), 32), !Pu(p, o, i))
    throw new Error("sign: Invalid signature produced");
  return p;
}
function Pu(e, t, r) {
  const { Fp: n, Fn: o, BASE: i } = hn, s = Z(e, 64, "signature"), c = Z(t, void 0, "message"), a = Z(r, 32, "publicKey");
  try {
    const u = Nu(ir(a)), f = ir(s.subarray(0, 32));
    if (!n.isValidNot0(f))
      return !1;
    const d = ir(s.subarray(32, 64));
    if (!o.isValidNot0(d))
      return !1;
    const h = Cu(o.toBytes(f), Vs(u), c), p = i.multiplyUnsafe(d).add(u.multiplyUnsafe(o.neg(h))), { x: w, y } = p.toAffine();
    return !(p.is0() || !Ds(y) || w !== f);
  } catch {
    return !1;
  }
}
const Ie = /* @__PURE__ */ (() => {
  const r = (n = Sr(48)) => vu(n, Xo.n);
  return {
    keygen: Au(r, Nc),
    getPublicKey: Nc,
    sign: vl,
    verify: Pu,
    Point: hn,
    utils: {
      randomSecretKey: r,
      taggedHash: po,
      lift_x: Nu,
      pointToBytes: Vs
    },
    lengths: {
      secretKey: 32,
      publicKey: 32,
      publicKeyHasPrefix: !1,
      signature: 64,
      seed: 48
    }
  };
})(), kl = /* @__PURE__ */ Uint8Array.from([
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
]), _u = Uint8Array.from(new Array(16).fill(0).map((e, t) => t)), Il = _u.map((e) => (9 * e + 5) % 16), Lu = /* @__PURE__ */ (() => {
  const r = [[_u], [Il]];
  for (let n = 0; n < 4; n++)
    for (let o of r)
      o.push(o[n].map((i) => kl[i]));
  return r;
})(), Vu = Lu[0], Du = Lu[1], Hu = /* @__PURE__ */ [
  [11, 14, 15, 12, 5, 8, 7, 9, 11, 13, 14, 15, 6, 7, 9, 8],
  [12, 13, 11, 15, 6, 9, 9, 7, 12, 15, 11, 13, 7, 8, 7, 7],
  [13, 15, 14, 11, 7, 7, 6, 8, 13, 14, 13, 12, 5, 5, 6, 9],
  [14, 11, 12, 14, 8, 6, 5, 5, 15, 12, 15, 14, 9, 9, 8, 6],
  [15, 12, 13, 13, 9, 5, 8, 6, 14, 11, 12, 11, 8, 6, 5, 5]
].map((e) => Uint8Array.from(e)), Al = /* @__PURE__ */ Vu.map((e, t) => e.map((r) => Hu[t][r])), Bl = /* @__PURE__ */ Du.map((e, t) => e.map((r) => Hu[t][r])), $l = /* @__PURE__ */ Uint32Array.from([
  0,
  1518500249,
  1859775393,
  2400959708,
  2840853838
]), Rl = /* @__PURE__ */ Uint32Array.from([
  1352829926,
  1548603684,
  1836072691,
  2053994217,
  0
]);
function Cc(e, t, r, n) {
  return e === 0 ? t ^ r ^ n : e === 1 ? t & r | ~t & n : e === 2 ? (t | ~r) ^ n : e === 3 ? t & n | r & ~n : t ^ (r | ~n);
}
const Ur = /* @__PURE__ */ new Uint32Array(16);
class Ol extends au {
  h0 = 1732584193;
  h1 = -271733879;
  h2 = -1732584194;
  h3 = 271733878;
  h4 = -1009589776;
  constructor() {
    super(64, 20, 8, !0);
  }
  get() {
    const { h0: t, h1: r, h2: n, h3: o, h4: i } = this;
    return [t, r, n, o, i];
  }
  set(t, r, n, o, i) {
    this.h0 = t | 0, this.h1 = r | 0, this.h2 = n | 0, this.h3 = o | 0, this.h4 = i | 0;
  }
  process(t, r) {
    for (let p = 0; p < 16; p++, r += 4)
      Ur[p] = t.getUint32(r, !0);
    let n = this.h0 | 0, o = n, i = this.h1 | 0, s = i, c = this.h2 | 0, a = c, u = this.h3 | 0, f = u, d = this.h4 | 0, h = d;
    for (let p = 0; p < 5; p++) {
      const w = 4 - p, y = $l[p], x = Rl[p], T = Vu[p], A = Du[p], R = Al[p], C = Bl[p];
      for (let $ = 0; $ < 16; $++) {
        const V = $r(n + Cc(p, i, c, u) + Ur[T[$]] + y, R[$]) + d | 0;
        n = d, d = u, u = $r(c, 10) | 0, c = i, i = V;
      }
      for (let $ = 0; $ < 16; $++) {
        const V = $r(o + Cc(w, s, a, f) + Ur[A[$]] + x, C[$]) + h | 0;
        o = h, h = f, f = $r(a, 10) | 0, a = s, s = V;
      }
    }
    this.set(this.h1 + c + f | 0, this.h2 + u + h | 0, this.h3 + d + o | 0, this.h4 + n + s | 0, this.h0 + i + a | 0);
  }
  roundClean() {
    An(Ur);
  }
  destroy() {
    this.destroyed = !0, An(this.buffer), this.set(0, 0, 0, 0, 0);
  }
}
const Ul = /* @__PURE__ */ cu(() => new Ol());
/*! scure-base - MIT License (c) 2022 Paul Miller (paulmillr.com) */
function $n(e) {
  return e instanceof Uint8Array || ArrayBuffer.isView(e) && e.constructor.name === "Uint8Array";
}
function Fu(e) {
  if (!$n(e))
    throw new Error("Uint8Array expected");
}
function Ku(e, t) {
  return Array.isArray(t) ? t.length === 0 ? !0 : e ? t.every((r) => typeof r == "string") : t.every((r) => Number.isSafeInteger(r)) : !1;
}
function Hs(e) {
  if (typeof e != "function")
    throw new Error("function expected");
  return !0;
}
function Me(e, t) {
  if (typeof t != "string")
    throw new Error(`${e}: string expected`);
  return !0;
}
function zn(e) {
  if (!Number.isSafeInteger(e))
    throw new Error(`invalid integer: ${e}`);
}
function go(e) {
  if (!Array.isArray(e))
    throw new Error("array expected");
}
function wo(e, t) {
  if (!Ku(!0, t))
    throw new Error(`${e}: array of strings expected`);
}
function Fs(e, t) {
  if (!Ku(!1, t))
    throw new Error(`${e}: array of numbers expected`);
}
// @__NO_SIDE_EFFECTS__
function vr(...e) {
  const t = (i) => i, r = (i, s) => (c) => i(s(c)), n = e.map((i) => i.encode).reduceRight(r, t), o = e.map((i) => i.decode).reduce(r, t);
  return { encode: n, decode: o };
}
// @__NO_SIDE_EFFECTS__
function Jo(e) {
  const t = typeof e == "string" ? e.split("") : e, r = t.length;
  wo("alphabet", t);
  const n = new Map(t.map((o, i) => [o, i]));
  return {
    encode: (o) => (go(o), o.map((i) => {
      if (!Number.isSafeInteger(i) || i < 0 || i >= r)
        throw new Error(`alphabet.encode: digit index outside alphabet "${i}". Allowed: ${e}`);
      return t[i];
    })),
    decode: (o) => (go(o), o.map((i) => {
      Me("alphabet.decode", i);
      const s = n.get(i);
      if (s === void 0)
        throw new Error(`Unknown letter: "${i}". Allowed: ${e}`);
      return s;
    }))
  };
}
// @__NO_SIDE_EFFECTS__
function Qo(e = "") {
  return Me("join", e), {
    encode: (t) => (wo("join.decode", t), t.join(e)),
    decode: (t) => (Me("join.decode", t), t.split(e))
  };
}
// @__NO_SIDE_EFFECTS__
function Nl(e, t = "=") {
  return zn(e), Me("padding", t), {
    encode(r) {
      for (wo("padding.encode", r); r.length * e % 8; )
        r.push(t);
      return r;
    },
    decode(r) {
      wo("padding.decode", r);
      let n = r.length;
      if (n * e % 8)
        throw new Error("padding: invalid, string should have whole number of bytes");
      for (; n > 0 && r[n - 1] === t; n--)
        if ((n - 1) * e % 8 === 0)
          throw new Error("padding: invalid, string has too much padding");
      return r.slice(0, n);
    }
  };
}
// @__NO_SIDE_EFFECTS__
function Cl(e) {
  return Hs(e), { encode: (t) => t, decode: (t) => e(t) };
}
function Pc(e, t, r) {
  if (t < 2)
    throw new Error(`convertRadix: invalid from=${t}, base cannot be less than 2`);
  if (r < 2)
    throw new Error(`convertRadix: invalid to=${r}, base cannot be less than 2`);
  if (go(e), !e.length)
    return [];
  let n = 0;
  const o = [], i = Array.from(e, (c) => {
    if (zn(c), c < 0 || c >= t)
      throw new Error(`invalid integer: ${c}`);
    return c;
  }), s = i.length;
  for (; ; ) {
    let c = 0, a = !0;
    for (let u = n; u < s; u++) {
      const f = i[u], d = t * c, h = d + f;
      if (!Number.isSafeInteger(h) || d / t !== c || h - f !== d)
        throw new Error("convertRadix: carry overflow");
      const p = h / r;
      c = h % r;
      const w = Math.floor(p);
      if (i[u] = w, !Number.isSafeInteger(w) || w * r + c !== h)
        throw new Error("convertRadix: carry overflow");
      if (a)
        w ? a = !1 : n = u;
      else continue;
    }
    if (o.push(c), a)
      break;
  }
  for (let c = 0; c < e.length - 1 && e[c] === 0; c++)
    o.push(0);
  return o.reverse();
}
const Wu = (e, t) => t === 0 ? e : Wu(t, e % t), yo = /* @__NO_SIDE_EFFECTS__ */ (e, t) => e + (t - Wu(e, t)), Jr = /* @__PURE__ */ (() => {
  let e = [];
  for (let t = 0; t < 40; t++)
    e.push(2 ** t);
  return e;
})();
function Ji(e, t, r, n) {
  if (go(e), t <= 0 || t > 32)
    throw new Error(`convertRadix2: wrong from=${t}`);
  if (r <= 0 || r > 32)
    throw new Error(`convertRadix2: wrong to=${r}`);
  if (/* @__PURE__ */ yo(t, r) > 32)
    throw new Error(`convertRadix2: carry overflow from=${t} to=${r} carryBits=${/* @__PURE__ */ yo(t, r)}`);
  let o = 0, i = 0;
  const s = Jr[t], c = Jr[r] - 1, a = [];
  for (const u of e) {
    if (zn(u), u >= s)
      throw new Error(`convertRadix2: invalid data word=${u} from=${t}`);
    if (o = o << t | u, i + t > 32)
      throw new Error(`convertRadix2: carry overflow pos=${i} from=${t}`);
    for (i += t; i >= r; i -= r)
      a.push((o >> i - r & c) >>> 0);
    const f = Jr[i];
    if (f === void 0)
      throw new Error("invalid carry");
    o &= f - 1;
  }
  if (o = o << r - i & c, !n && i >= t)
    throw new Error("Excess padding");
  if (!n && o > 0)
    throw new Error(`Non-zero padding: ${o}`);
  return n && i > 0 && a.push(o >>> 0), a;
}
// @__NO_SIDE_EFFECTS__
function Pl(e) {
  zn(e);
  const t = 2 ** 8;
  return {
    encode: (r) => {
      if (!$n(r))
        throw new Error("radix.encode input should be Uint8Array");
      return Pc(Array.from(r), t, e);
    },
    decode: (r) => (Fs("radix.decode", r), Uint8Array.from(Pc(r, e, t)))
  };
}
// @__NO_SIDE_EFFECTS__
function Ks(e, t = !1) {
  if (zn(e), e <= 0 || e > 32)
    throw new Error("radix2: bits should be in (0..32]");
  if (/* @__PURE__ */ yo(8, e) > 32 || /* @__PURE__ */ yo(e, 8) > 32)
    throw new Error("radix2: carry overflow");
  return {
    encode: (r) => {
      if (!$n(r))
        throw new Error("radix2.encode input should be Uint8Array");
      return Ji(Array.from(r), 8, e, !t);
    },
    decode: (r) => (Fs("radix2.decode", r), Uint8Array.from(Ji(r, e, 8, t)))
  };
}
function _c(e) {
  return Hs(e), function(...t) {
    try {
      return e.apply(null, t);
    } catch {
    }
  };
}
function _l(e, t) {
  return zn(e), Hs(t), {
    encode(r) {
      if (!$n(r))
        throw new Error("checksum.encode: input should be Uint8Array");
      const n = t(r).slice(0, e), o = new Uint8Array(r.length + e);
      return o.set(r), o.set(n, r.length), o;
    },
    decode(r) {
      if (!$n(r))
        throw new Error("checksum.decode: input should be Uint8Array");
      const n = r.slice(0, -e), o = r.slice(-e), i = t(n).slice(0, e);
      for (let s = 0; s < e; s++)
        if (i[s] !== o[s])
          throw new Error("Invalid checksum");
      return n;
    }
  };
}
const Ll = typeof Uint8Array.from([]).toBase64 == "function" && typeof Uint8Array.fromBase64 == "function", Vl = (e, t) => {
  Me("base64", e);
  const r = /^[A-Za-z0-9=+/]+$/, n = "base64";
  if (e.length > 0 && !r.test(e))
    throw new Error("invalid base64");
  return Uint8Array.fromBase64(e, { alphabet: n, lastChunkHandling: "strict" });
}, q = Ll ? {
  encode(e) {
    return Fu(e), e.toBase64();
  },
  decode(e) {
    return Vl(e);
  }
} : /* @__PURE__ */ vr(/* @__PURE__ */ Ks(6), /* @__PURE__ */ Jo("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"), /* @__PURE__ */ Nl(6), /* @__PURE__ */ Qo("")), Dl = /* @__NO_SIDE_EFFECTS__ */ (e) => /* @__PURE__ */ vr(/* @__PURE__ */ Pl(58), /* @__PURE__ */ Jo(e), /* @__PURE__ */ Qo("")), hr = /* @__PURE__ */ Dl("123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"), Hl = (e) => /* @__PURE__ */ vr(_l(4, (t) => e(e(t))), hr), Qi = /* @__PURE__ */ vr(/* @__PURE__ */ Jo("qpzry9x8gf2tvdw0s3jn54khce6mua7l"), /* @__PURE__ */ Qo("")), Lc = [996825010, 642813549, 513874426, 1027748829, 705979059];
function Zn(e) {
  const t = e >> 25;
  let r = (e & 33554431) << 5;
  for (let n = 0; n < Lc.length; n++)
    (t >> n & 1) === 1 && (r ^= Lc[n]);
  return r;
}
function Vc(e, t, r = 1) {
  const n = e.length;
  let o = 1;
  for (let i = 0; i < n; i++) {
    const s = e.charCodeAt(i);
    if (s < 33 || s > 126)
      throw new Error(`Invalid prefix (${e})`);
    o = Zn(o) ^ s >> 5;
  }
  o = Zn(o);
  for (let i = 0; i < n; i++)
    o = Zn(o) ^ e.charCodeAt(i) & 31;
  for (let i of t)
    o = Zn(o) ^ i;
  for (let i = 0; i < 6; i++)
    o = Zn(o);
  return o ^= r, Qi.encode(Ji([o % Jr[30]], 30, 5, !1));
}
// @__NO_SIDE_EFFECTS__
function Mu(e) {
  const t = e === "bech32" ? 1 : 734539939, r = /* @__PURE__ */ Ks(5), n = r.decode, o = r.encode, i = _c(n);
  function s(d, h, p = 90) {
    Me("bech32.encode prefix", d), $n(h) && (h = Array.from(h)), Fs("bech32.encode", h);
    const w = d.length;
    if (w === 0)
      throw new TypeError(`Invalid prefix length ${w}`);
    const y = w + 7 + h.length;
    if (p !== !1 && y > p)
      throw new TypeError(`Length ${y} exceeds limit ${p}`);
    const x = d.toLowerCase(), T = Vc(x, h, t);
    return `${x}1${Qi.encode(h)}${T}`;
  }
  function c(d, h = 90) {
    Me("bech32.decode input", d);
    const p = d.length;
    if (p < 8 || h !== !1 && p > h)
      throw new TypeError(`invalid string length: ${p} (${d}). Expected (8..${h})`);
    const w = d.toLowerCase();
    if (d !== w && d !== d.toUpperCase())
      throw new Error("String must be lowercase or uppercase");
    const y = w.lastIndexOf("1");
    if (y === 0 || y === -1)
      throw new Error('Letter "1" must be present between prefix and data only');
    const x = w.slice(0, y), T = w.slice(y + 1);
    if (T.length < 6)
      throw new Error("Data must be at least 6 characters long");
    const A = Qi.decode(T).slice(0, -6), R = Vc(x, A, t);
    if (!T.endsWith(R))
      throw new Error(`Invalid checksum in ${d}: expected "${R}"`);
    return { prefix: x, words: A };
  }
  const a = _c(c);
  function u(d) {
    const { prefix: h, words: p } = c(d, !1);
    return { prefix: h, words: p, bytes: n(p) };
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
    fromWords: n,
    fromWordsUnsafe: i,
    toWords: o
  };
}
const ts = /* @__PURE__ */ Mu("bech32"), ae = /* @__PURE__ */ Mu("bech32m"), Fl = {
  encode: (e) => new TextDecoder().decode(e),
  decode: (e) => new TextEncoder().encode(e)
}, Kl = typeof Uint8Array.from([]).toHex == "function" && typeof Uint8Array.fromHex == "function", Wl = {
  encode(e) {
    return Fu(e), e.toHex();
  },
  decode(e) {
    return Me("hex", e), Uint8Array.fromHex(e);
  }
}, v = Kl ? Wl : /* @__PURE__ */ vr(/* @__PURE__ */ Ks(4), /* @__PURE__ */ Jo("0123456789abcdef"), /* @__PURE__ */ Qo(""), /* @__PURE__ */ Cl((e) => {
  if (typeof e != "string" || e.length % 2 !== 0)
    throw new TypeError(`hex.decode: expected string, got ${typeof e} with length ${e.length}`);
  return e.toLowerCase();
})), st = /* @__PURE__ */ Uint8Array.of(), zu = /* @__PURE__ */ Uint8Array.of(0);
function Rn(e, t) {
  if (e.length !== t.length)
    return !1;
  for (let r = 0; r < e.length; r++)
    if (e[r] !== t[r])
      return !1;
  return !0;
}
function Ft(e) {
  return e instanceof Uint8Array || ArrayBuffer.isView(e) && e.constructor.name === "Uint8Array";
}
function Ml(...e) {
  let t = 0;
  for (let n = 0; n < e.length; n++) {
    const o = e[n];
    if (!Ft(o))
      throw new Error("Uint8Array expected");
    t += o.length;
  }
  const r = new Uint8Array(t);
  for (let n = 0, o = 0; n < e.length; n++) {
    const i = e[n];
    r.set(i, o), o += i.length;
  }
  return r;
}
const ju = (e) => new DataView(e.buffer, e.byteOffset, e.byteLength);
function kr(e) {
  return Object.prototype.toString.call(e) === "[object Object]";
}
function fe(e) {
  return Number.isSafeInteger(e);
}
const Ws = {
  equalBytes: Rn,
  isBytes: Ft,
  concatBytes: Ml
}, Gu = (e) => {
  if (e !== null && typeof e != "string" && !Xt(e) && !Ft(e) && !fe(e))
    throw new Error(`lengthCoder: expected null | number | Uint8Array | CoderType, got ${e} (${typeof e})`);
  return {
    encodeStream(t, r) {
      if (e === null)
        return;
      if (Xt(e))
        return e.encodeStream(t, r);
      let n;
      if (typeof e == "number" ? n = e : typeof e == "string" && (n = ve.resolve(t.stack, e)), typeof n == "bigint" && (n = Number(n)), n === void 0 || n !== r)
        throw t.err(`Wrong length: ${n} len=${e} exp=${r} (${typeof r})`);
    },
    decodeStream(t) {
      let r;
      if (Xt(e) ? r = Number(e.decodeStream(t)) : typeof e == "number" ? r = e : typeof e == "string" && (r = ve.resolve(t.stack, e)), typeof r == "bigint" && (r = Number(r)), typeof r != "number")
        throw t.err(`Wrong length: ${r}`);
      return r;
    }
  };
}, gt = {
  BITS: 32,
  FULL_MASK: -1 >>> 0,
  // 1<<32 will overflow
  len: (e) => Math.ceil(e / 32),
  create: (e) => new Uint32Array(gt.len(e)),
  clean: (e) => e.fill(0),
  debug: (e) => Array.from(e).map((t) => (t >>> 0).toString(2).padStart(32, "0")),
  checkLen: (e, t) => {
    if (gt.len(t) !== e.length)
      throw new Error(`wrong length=${e.length}. Expected: ${gt.len(t)}`);
  },
  chunkLen: (e, t, r) => {
    if (t < 0)
      throw new Error(`wrong pos=${t}`);
    if (t + r > e)
      throw new Error(`wrong range=${t}/${r} of ${e}`);
  },
  set: (e, t, r, n = !0) => !n && (e[t] & r) !== 0 ? !1 : (e[t] |= r, !0),
  pos: (e, t) => ({
    chunk: Math.floor((e + t) / 32),
    mask: 1 << 32 - (e + t) % 32 - 1
  }),
  indices: (e, t, r = !1) => {
    gt.checkLen(e, t);
    const { FULL_MASK: n, BITS: o } = gt, i = o - t % o, s = i ? n >>> i << i : n, c = [];
    for (let a = 0; a < e.length; a++) {
      let u = e[a];
      if (r && (u = ~u), a === e.length - 1 && (u &= s), u !== 0)
        for (let f = 0; f < o; f++) {
          const d = 1 << o - f - 1;
          u & d && c.push(a * o + f);
        }
    }
    return c;
  },
  range: (e) => {
    const t = [];
    let r;
    for (const n of e)
      r === void 0 || n !== r.pos + r.length ? t.push(r = { pos: n, length: 1 }) : r.length += 1;
    return t;
  },
  rangeDebug: (e, t, r = !1) => `[${gt.range(gt.indices(e, t, r)).map((n) => `(${n.pos}/${n.length})`).join(", ")}]`,
  setRange: (e, t, r, n, o = !0) => {
    gt.chunkLen(t, r, n);
    const { FULL_MASK: i, BITS: s } = gt, c = r % s ? Math.floor(r / s) : void 0, a = r + n, u = a % s ? Math.floor(a / s) : void 0;
    if (c !== void 0 && c === u)
      return gt.set(e, c, i >>> s - n << s - n - r, o);
    if (c !== void 0 && !gt.set(e, c, i >>> r % s, o))
      return !1;
    const f = c !== void 0 ? c + 1 : r / s, d = u !== void 0 ? u : a / s;
    for (let h = f; h < d; h++)
      if (!gt.set(e, h, i, o))
        return !1;
    return !(u !== void 0 && c !== u && !gt.set(e, u, i << s - a % s, o));
  }
}, ve = {
  /**
   * Internal method for handling stack of paths (debug, errors, dynamic fields via path)
   * This is looks ugly (callback), but allows us to force stack cleaning by construction (.pop always after function).
   * Also, this makes impossible:
   * - pushing field when stack is empty
   * - pushing field inside of field (real bug)
   * NOTE: we don't want to do '.pop' on error!
   */
  pushObj: (e, t, r) => {
    const n = { obj: t };
    e.push(n), r((o, i) => {
      n.field = o, i(), n.field = void 0;
    }), e.pop();
  },
  path: (e) => {
    const t = [];
    for (const r of e)
      r.field !== void 0 && t.push(r.field);
    return t.join("/");
  },
  err: (e, t, r) => {
    const n = new Error(`${e}(${ve.path(t)}): ${typeof r == "string" ? r : r.message}`);
    return r instanceof Error && r.stack && (n.stack = r.stack), n;
  },
  resolve: (e, t) => {
    const r = t.split("/"), n = e.map((s) => s.obj);
    let o = 0;
    for (; o < r.length && r[o] === ".."; o++)
      n.pop();
    let i = n.pop();
    for (; o < r.length; o++) {
      if (!i || i[r[o]] === void 0)
        return;
      i = i[r[o]];
    }
    return i;
  }
};
class Ms {
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
  constructor(t, r = {}, n = [], o = void 0, i = 0) {
    this.data = t, this.opts = r, this.stack = n, this.parent = o, this.parentOffset = i, this.view = ju(t);
  }
  /** Internal method for pointers. */
  _enablePointers() {
    if (this.parent)
      return this.parent._enablePointers();
    this.bs || (this.bs = gt.create(this.data.length), gt.setRange(this.bs, this.data.length, 0, this.pos, this.opts.allowMultipleReads));
  }
  markBytesBS(t, r) {
    return this.parent ? this.parent.markBytesBS(this.parentOffset + t, r) : !r || !this.bs ? !0 : gt.setRange(this.bs, this.data.length, t, r, !1);
  }
  markBytes(t) {
    const r = this.pos;
    this.pos += t;
    const n = this.markBytesBS(r, t);
    if (!this.opts.allowMultipleReads && !n)
      throw this.err(`multiple read pos=${this.pos} len=${t}`);
    return n;
  }
  pushObj(t, r) {
    return ve.pushObj(this.stack, t, r);
  }
  readView(t, r) {
    if (!Number.isFinite(t))
      throw this.err(`readView: wrong length=${t}`);
    if (this.pos + t > this.data.length)
      throw this.err("readView: Unexpected end of buffer");
    const n = r(this.view, this.pos);
    return this.markBytes(t), n;
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
        const t = gt.indices(this.bs, this.data.length, !0);
        if (t.length) {
          const r = gt.range(t).map(({ pos: n, length: o }) => `(${n}/${o})[${v.encode(this.data.subarray(n, n + o))}]`).join(", ");
          throw this.err(`unread byte ranges: ${r} (total=${this.data.length})`);
        } else
          return;
      }
      if (!this.isEnd())
        throw this.err(`${this.leftBytes} bytes ${this.bitPos} bits left after unpack: ${v.encode(this.data.slice(this.pos))}`);
    }
  }
  // User methods
  err(t) {
    return ve.err("Reader", this.stack, t);
  }
  offsetReader(t) {
    if (t > this.data.length)
      throw this.err("offsetReader: Unexpected end of buffer");
    return new Ms(this.absBytes(t), this.opts, this.stack, this, t);
  }
  bytes(t, r = !1) {
    if (this.bitPos)
      throw this.err("readBytes: bitPos not empty");
    if (!Number.isFinite(t))
      throw this.err(`readBytes: wrong length=${t}`);
    if (this.pos + t > this.data.length)
      throw this.err("readBytes: Unexpected end of buffer");
    const n = this.data.subarray(this.pos, this.pos + t);
    return r || this.markBytes(t), n;
  }
  byte(t = !1) {
    if (this.bitPos)
      throw this.err("readByte: bitPos not empty");
    if (this.pos + 1 > this.data.length)
      throw this.err("readBytes: Unexpected end of buffer");
    const r = this.data[this.pos];
    return t || this.markBytes(1), r;
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
    let r = 0;
    for (; t; ) {
      this.bitPos || (this.bitBuf = this.byte(), this.bitPos = 8);
      const n = Math.min(t, this.bitPos);
      this.bitPos -= n, r = r << n | this.bitBuf >> this.bitPos & 2 ** n - 1, this.bitBuf &= 2 ** this.bitPos - 1, t -= n;
    }
    return r >>> 0;
  }
  find(t, r = this.pos) {
    if (!Ft(t))
      throw this.err(`find: needle is not bytes! ${t}`);
    if (this.bitPos)
      throw this.err("findByte: bitPos not empty");
    if (!t.length)
      throw this.err("find: needle is empty");
    for (let n = r; (n = this.data.indexOf(t[0], n)) !== -1; n++) {
      if (n === -1 || this.data.length - n < t.length)
        return;
      if (Rn(t, this.data.subarray(n, n + t.length)))
        return n;
    }
  }
}
class zl {
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
    this.stack = t, this.view = ju(this.viewBuf);
  }
  pushObj(t, r) {
    return ve.pushObj(this.stack, t, r);
  }
  writeView(t, r) {
    if (this.finished)
      throw this.err("buffer: finished");
    if (!fe(t) || t > 8)
      throw new Error(`wrong writeView length=${t}`);
    r(this.view), this.bytes(this.viewBuf.slice(0, t)), this.viewBuf.fill(0);
  }
  // User methods
  err(t) {
    if (this.finished)
      throw this.err("buffer: finished");
    return ve.err("Reader", this.stack, t);
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
    const r = this.buffers.concat(this.ptrs.map((i) => i.buffer)), n = r.map((i) => i.length).reduce((i, s) => i + s, 0), o = new Uint8Array(n);
    for (let i = 0, s = 0; i < r.length; i++) {
      const c = r[i];
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
  bits(t, r) {
    if (r > 32)
      throw this.err("writeBits: cannot write more than 32 bits in single call");
    if (t >= 2 ** r)
      throw this.err(`writeBits: value (${t}) >= 2**bits (${r})`);
    for (; r; ) {
      const n = Math.min(r, 8 - this.bitPos);
      this.bitBuf = this.bitBuf << n | t >> r - n, this.bitPos += n, r -= n, t &= 2 ** r - 1, this.bitPos === 8 && (this.bitPos = 0, this.buffers.push(new Uint8Array([this.bitBuf])), this.pos++);
    }
  }
}
const es = (e) => Uint8Array.from(e).reverse();
function jl(e, t, r) {
  if (r) {
    const n = 2n ** (t - 1n);
    if (e < -n || e >= n)
      throw new Error(`value out of signed bounds. Expected ${-n} <= ${e} < ${n}`);
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
      const r = new zl();
      return e.encodeStream(r, t), r.finish();
    },
    decode: (t, r = {}) => {
      const n = new Ms(t, r), o = e.decodeStream(n);
      return n.finish(), o;
    }
  };
}
function Bt(e, t) {
  if (!Xt(e))
    throw new Error(`validate: invalid inner value ${e}`);
  if (typeof t != "function")
    throw new Error("validate: fn should be function");
  return qu({
    size: e.size,
    encodeStream: (r, n) => {
      let o;
      try {
        o = t(n);
      } catch (i) {
        throw r.err(i);
      }
      e.encodeStream(r, o);
    },
    decodeStream: (r) => {
      const n = e.decodeStream(r);
      try {
        return t(n);
      } catch (o) {
        throw r.err(o);
      }
    }
  });
}
const $t = (e) => {
  const t = qu(e);
  return e.validate ? Bt(t, e.validate) : t;
}, ti = (e) => kr(e) && typeof e.decode == "function" && typeof e.encode == "function";
function Xt(e) {
  return kr(e) && ti(e) && typeof e.encodeStream == "function" && typeof e.decodeStream == "function" && (e.size === void 0 || fe(e.size));
}
function Gl() {
  return {
    encode: (e) => {
      if (!Array.isArray(e))
        throw new Error("array expected");
      const t = {};
      for (const r of e) {
        if (!Array.isArray(r) || r.length !== 2)
          throw new Error("array of two elements expected");
        const n = r[0], o = r[1];
        if (t[n] !== void 0)
          throw new Error(`key(${n}) appears twice in struct`);
        t[n] = o;
      }
      return t;
    },
    decode: (e) => {
      if (!kr(e))
        throw new Error(`expected plain object, got ${e}`);
      return Object.entries(e);
    }
  };
}
const ql = {
  encode: (e) => {
    if (typeof e != "bigint")
      throw new Error(`expected bigint, got ${typeof e}`);
    if (e > BigInt(Number.MAX_SAFE_INTEGER))
      throw new Error(`element bigger than MAX_SAFE_INTEGER=${e}`);
    return Number(e);
  },
  decode: (e) => {
    if (!fe(e))
      throw new Error("element is not a safe integer");
    return BigInt(e);
  }
};
function Yl(e) {
  if (!kr(e))
    throw new Error("plain object expected");
  return {
    encode: (t) => {
      if (!fe(t) || !(t in e))
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
function Zl(e, t = !1) {
  if (!fe(e))
    throw new Error(`decimal/precision: wrong value ${e}`);
  if (typeof t != "boolean")
    throw new Error(`decimal/round: expected boolean, got ${typeof t}`);
  const r = 10n ** BigInt(e);
  return {
    encode: (n) => {
      if (typeof n != "bigint")
        throw new Error(`expected bigint, got ${typeof n}`);
      let o = (n < 0n ? -n : n).toString(10), i = o.length - e;
      i < 0 && (o = o.padStart(o.length - i, "0"), i = 0);
      let s = o.length - 1;
      for (; s >= i && o[s] === "0"; s--)
        ;
      let c = o.slice(0, i), a = o.slice(i, s + 1);
      return c || (c = "0"), n < 0n && (c = "-" + c), a ? `${c}.${a}` : c;
    },
    decode: (n) => {
      if (typeof n != "string")
        throw new Error(`expected string, got ${typeof n}`);
      if (n === "-0")
        throw new Error("negative zero is not allowed");
      let o = !1;
      if (n.startsWith("-") && (o = !0, n = n.slice(1)), !/^(0|[1-9]\d*)(\.\d+)?$/.test(n))
        throw new Error(`wrong string value=${n}`);
      let i = n.indexOf(".");
      i = i === -1 ? n.length : i;
      const s = n.slice(0, i), c = n.slice(i + 1).replace(/0+$/, ""), a = BigInt(s) * r;
      if (!t && c.length > e)
        throw new Error(`fractional part cannot be represented with this precision (num=${n}, prec=${e})`);
      const u = Math.min(c.length, e), f = BigInt(c.slice(0, u)) * 10n ** BigInt(e - u), d = a + f;
      return o ? -d : d;
    }
  };
}
function Xl(e) {
  if (!Array.isArray(e))
    throw new Error(`expected array, got ${typeof e}`);
  for (const t of e)
    if (!ti(t))
      throw new Error(`wrong base coder ${t}`);
  return {
    encode: (t) => {
      for (const r of e) {
        const n = r.encode(t);
        if (n !== void 0)
          return n;
      }
      throw new Error(`match/encode: cannot find match in ${t}`);
    },
    decode: (t) => {
      for (const r of e) {
        const n = r.decode(t);
        if (n !== void 0)
          return n;
      }
      throw new Error(`match/decode: cannot find match in ${t}`);
    }
  };
}
const Yu = (e) => {
  if (!ti(e))
    throw new Error("BaseCoder expected");
  return { encode: e.decode, decode: e.encode };
}, ei = { dict: Gl, numberBigint: ql, tsEnum: Yl, decimal: Zl, match: Xl, reverse: Yu }, zs = (e, t = !1, r = !1, n = !0) => {
  if (!fe(e))
    throw new Error(`bigint/size: wrong value ${e}`);
  if (typeof t != "boolean")
    throw new Error(`bigint/le: expected boolean, got ${typeof t}`);
  if (typeof r != "boolean")
    throw new Error(`bigint/signed: expected boolean, got ${typeof r}`);
  if (typeof n != "boolean")
    throw new Error(`bigint/sized: expected boolean, got ${typeof n}`);
  const o = BigInt(e), i = 2n ** (8n * o - 1n);
  return $t({
    size: n ? e : void 0,
    encodeStream: (s, c) => {
      r && c < 0 && (c = c | i);
      const a = [];
      for (let f = 0; f < e; f++)
        a.push(Number(c & 255n)), c >>= 8n;
      let u = new Uint8Array(a).reverse();
      if (!n) {
        let f = 0;
        for (f = 0; f < u.length && u[f] === 0; f++)
          ;
        u = u.subarray(f);
      }
      s.bytes(t ? u.reverse() : u);
    },
    decodeStream: (s) => {
      const c = s.bytes(n ? e : Math.min(e, s.leftBytes)), a = t ? c : es(c);
      let u = 0n;
      for (let f = 0; f < a.length; f++)
        u |= BigInt(a[f]) << 8n * BigInt(f);
      return r && u & i && (u = (u ^ i) - i), u;
    },
    validate: (s) => {
      if (typeof s != "bigint")
        throw new Error(`bigint: invalid value: ${s}`);
      return jl(s, 8n * o, !!r), s;
    }
  });
}, Zu = /* @__PURE__ */ zs(32, !1), Qr = /* @__PURE__ */ zs(8, !0), Jl = /* @__PURE__ */ zs(8, !0, !0), Ql = (e, t) => $t({
  size: e,
  encodeStream: (r, n) => r.writeView(e, (o) => t.write(o, n)),
  decodeStream: (r) => r.readView(e, t.read),
  validate: (r) => {
    if (typeof r != "number")
      throw new Error(`viewCoder: expected number, got ${typeof r}`);
    return t.validate && t.validate(r), r;
  }
}), Ir = (e, t, r) => {
  const n = e * 8, o = 2 ** (n - 1), i = (a) => {
    if (!fe(a))
      throw new Error(`sintView: value is not safe integer: ${a}`);
    if (a < -o || a >= o)
      throw new Error(`sintView: value out of bounds. Expected ${-o} <= ${a} < ${o}`);
  }, s = 2 ** n, c = (a) => {
    if (!fe(a))
      throw new Error(`uintView: value is not safe integer: ${a}`);
    if (0 > a || a >= s)
      throw new Error(`uintView: value out of bounds. Expected 0 <= ${a} < ${s}`);
  };
  return Ql(e, {
    write: r.write,
    read: r.read,
    validate: t ? i : c
  });
}, Q = /* @__PURE__ */ Ir(4, !1, {
  read: (e, t) => e.getUint32(t, !0),
  write: (e, t) => e.setUint32(0, t, !0)
}), th = /* @__PURE__ */ Ir(4, !1, {
  read: (e, t) => e.getUint32(t, !1),
  write: (e, t) => e.setUint32(0, t, !1)
}), yn = /* @__PURE__ */ Ir(4, !0, {
  read: (e, t) => e.getInt32(t, !0),
  write: (e, t) => e.setInt32(0, t, !0)
}), Dc = /* @__PURE__ */ Ir(2, !1, {
  read: (e, t) => e.getUint16(t, !0),
  write: (e, t) => e.setUint16(0, t, !0)
}), Le = /* @__PURE__ */ Ir(1, !1, {
  read: (e, t) => e.getUint8(t),
  write: (e, t) => e.setUint8(0, t)
}), it = (e, t = !1) => {
  if (typeof t != "boolean")
    throw new Error(`bytes/le: expected boolean, got ${typeof t}`);
  const r = Gu(e), n = Ft(e);
  return $t({
    size: typeof e == "number" ? e : void 0,
    encodeStream: (o, i) => {
      n || r.encodeStream(o, i.length), o.bytes(t ? es(i) : i), n && o.bytes(e);
    },
    decodeStream: (o) => {
      let i;
      if (n) {
        const s = o.find(e);
        if (!s)
          throw o.err("bytes: cannot find terminator");
        i = o.bytes(s - o.pos), o.bytes(e.length);
      } else
        i = o.bytes(e === null ? o.leftBytes : r.decodeStream(o));
      return t ? es(i) : i;
    },
    validate: (o) => {
      if (!Ft(o))
        throw new Error(`bytes: invalid value ${o}`);
      return o;
    }
  });
};
function eh(e, t) {
  if (!Xt(t))
    throw new Error(`prefix: invalid inner value ${t}`);
  return ze(it(e), Yu(t));
}
const js = (e, t = !1) => Bt(ze(it(e, t), Fl), (r) => {
  if (typeof r != "string")
    throw new Error(`expected string, got ${typeof r}`);
  return r;
}), nh = (e, t = { isLE: !1, with0x: !1 }) => {
  let r = ze(it(e, t.isLE), v);
  const n = t.with0x;
  if (typeof n != "boolean")
    throw new Error(`hex/with0x: expected boolean, got ${typeof n}`);
  return n && (r = ze(r, {
    encode: (o) => `0x${o}`,
    decode: (o) => {
      if (!o.startsWith("0x"))
        throw new Error("hex(with0x=true).encode input should start with 0x");
      return o.slice(2);
    }
  })), r;
};
function ze(e, t) {
  if (!Xt(e))
    throw new Error(`apply: invalid inner value ${e}`);
  if (!ti(t))
    throw new Error(`apply: invalid base value ${e}`);
  return $t({
    size: e.size,
    encodeStream: (r, n) => {
      let o;
      try {
        o = t.decode(n);
      } catch (i) {
        throw r.err("" + i);
      }
      return e.encodeStream(r, o);
    },
    decodeStream: (r) => {
      const n = e.decodeStream(r);
      try {
        return t.encode(n);
      } catch (o) {
        throw r.err("" + o);
      }
    }
  });
}
const rh = (e, t = !1) => {
  if (!Ft(e))
    throw new Error(`flag/flagValue: expected Uint8Array, got ${typeof e}`);
  if (typeof t != "boolean")
    throw new Error(`flag/xor: expected boolean, got ${typeof t}`);
  return $t({
    size: e.length,
    encodeStream: (r, n) => {
      !!n !== t && r.bytes(e);
    },
    decodeStream: (r) => {
      let n = r.leftBytes >= e.length;
      return n && (n = Rn(r.bytes(e.length, !0), e), n && r.bytes(e.length)), n !== t;
    },
    validate: (r) => {
      if (r !== void 0 && typeof r != "boolean")
        throw new Error(`flag: expected boolean value or undefined, got ${typeof r}`);
      return r;
    }
  });
};
function oh(e, t, r) {
  if (!Xt(t))
    throw new Error(`flagged: invalid inner value ${t}`);
  return $t({
    encodeStream: (n, o) => {
      ve.resolve(n.stack, e) && t.encodeStream(n, o);
    },
    decodeStream: (n) => {
      let o = !1;
      if (o = !!ve.resolve(n.stack, e), o)
        return t.decodeStream(n);
    }
  });
}
function Gs(e, t, r = !0) {
  if (!Xt(e))
    throw new Error(`magic: invalid inner value ${e}`);
  if (typeof r != "boolean")
    throw new Error(`magic: expected boolean, got ${typeof r}`);
  return $t({
    size: e.size,
    encodeStream: (n, o) => e.encodeStream(n, t),
    decodeStream: (n) => {
      const o = e.decodeStream(n);
      if (r && typeof o != "object" && o !== t || Ft(t) && !Rn(t, o))
        throw n.err(`magic: invalid value: ${o} !== ${t}`);
    },
    validate: (n) => {
      if (n !== void 0)
        throw new Error(`magic: wrong value=${typeof n}`);
      return n;
    }
  });
}
function Xu(e) {
  let t = 0;
  for (const r of e) {
    if (r.size === void 0)
      return;
    if (!fe(r.size))
      throw new Error(`sizeof: wrong element size=${t}`);
    t += r.size;
  }
  return t;
}
function bt(e) {
  if (!kr(e))
    throw new Error(`struct: expected plain object, got ${e}`);
  for (const t in e)
    if (!Xt(e[t]))
      throw new Error(`struct: field ${t} is not CoderType`);
  return $t({
    size: Xu(Object.values(e)),
    encodeStream: (t, r) => {
      t.pushObj(r, (n) => {
        for (const o in e)
          n(o, () => e[o].encodeStream(t, r[o]));
      });
    },
    decodeStream: (t) => {
      const r = {};
      return t.pushObj(r, (n) => {
        for (const o in e)
          n(o, () => r[o] = e[o].decodeStream(t));
      }), r;
    },
    validate: (t) => {
      if (typeof t != "object" || t === null)
        throw new Error(`struct: invalid value ${t}`);
      return t;
    }
  });
}
function ih(e) {
  if (!Array.isArray(e))
    throw new Error(`Packed.Tuple: got ${typeof e} instead of array`);
  for (let t = 0; t < e.length; t++)
    if (!Xt(e[t]))
      throw new Error(`tuple: field ${t} is not CoderType`);
  return $t({
    size: Xu(e),
    encodeStream: (t, r) => {
      if (!Array.isArray(r))
        throw t.err(`tuple: invalid value ${r}`);
      t.pushObj(r, (n) => {
        for (let o = 0; o < e.length; o++)
          n(`${o}`, () => e[o].encodeStream(t, r[o]));
      });
    },
    decodeStream: (t) => {
      const r = [];
      return t.pushObj(r, (n) => {
        for (let o = 0; o < e.length; o++)
          n(`${o}`, () => r.push(e[o].decodeStream(t)));
      }), r;
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
function At(e, t) {
  if (!Xt(t))
    throw new Error(`array: invalid inner value ${t}`);
  const r = Gu(typeof e == "string" ? `../${e}` : e);
  return $t({
    size: typeof e == "number" && t.size ? e * t.size : void 0,
    encodeStream: (n, o) => {
      const i = n;
      i.pushObj(o, (s) => {
        Ft(e) || r.encodeStream(n, o.length);
        for (let c = 0; c < o.length; c++)
          s(`${c}`, () => {
            const a = o[c], u = n.pos;
            if (t.encodeStream(n, a), Ft(e)) {
              if (e.length > i.pos - u)
                return;
              const f = i.finish(!1).subarray(u, i.pos);
              if (Rn(f.subarray(0, e.length), e))
                throw i.err(`array: inner element encoding same as separator. elm=${a} data=${f}`);
            }
          });
      }), Ft(e) && n.bytes(e);
    },
    decodeStream: (n) => {
      const o = [];
      return n.pushObj(o, (i) => {
        if (e === null)
          for (let s = 0; !n.isEnd() && (i(`${s}`, () => o.push(t.decodeStream(n))), !(t.size && n.leftBytes < t.size)); s++)
            ;
        else if (Ft(e))
          for (let s = 0; ; s++) {
            if (Rn(n.bytes(e.length, !0), e)) {
              n.bytes(e.length);
              break;
            }
            i(`${s}`, () => o.push(t.decodeStream(n)));
          }
        else {
          let s;
          i("arrayLen", () => s = r.decodeStream(n));
          for (let c = 0; c < s; c++)
            i(`${c}`, () => o.push(t.decodeStream(n)));
        }
      }), o;
    },
    validate: (n) => {
      if (!Array.isArray(n))
        throw new Error(`array: invalid value ${n}`);
      return n;
    }
  });
}
const jn = Pe.Point, Hc = jn.Fn, Ju = jn.Fn.ORDER, Ar = (e) => e % 2n === 0n, rt = Ws.isBytes, Ce = Ws.concatBytes, dt = Ws.equalBytes, Qu = (e) => Ul(mt(e)), $e = (...e) => mt(mt(Ce(...e))), ns = Ie.utils.randomSecretKey, qs = Ie.getPublicKey, tf = Pe.getPublicKey, Fc = (e) => e.r < Ju / 2n;
function sh(e, t, r = !1) {
  let n = Pe.Signature.fromBytes(Pe.sign(e, t, { prehash: !1 }));
  if (r && !Fc(n)) {
    const o = new Uint8Array(32);
    let i = 0;
    for (; !Fc(n); )
      if (o.set(Q.encode(i++)), n = Pe.Signature.fromBytes(Pe.sign(e, t, { prehash: !1, extraEntropy: o })), i > 4294967295)
        throw new Error("lowR counter overflow: report the error");
  }
  return n.toBytes("der");
}
const Kc = Ie.sign, Ys = Ie.utils.taggedHash, Rt = {
  ecdsa: 0,
  schnorr: 1
};
function On(e, t) {
  const r = e.length;
  if (t === Rt.ecdsa) {
    if (r === 32)
      throw new Error("Expected non-Schnorr key");
    return jn.fromBytes(e), e;
  } else if (t === Rt.schnorr) {
    if (r !== 32)
      throw new Error("Expected 32-byte Schnorr key");
    return Ie.utils.lift_x(ke(e)), e;
  } else
    throw new Error("Unknown key type");
}
function ef(e, t) {
  const n = Ie.utils.taggedHash("TapTweak", e, t), o = ke(n);
  if (o >= Ju)
    throw new Error("tweak higher than curve order");
  return o;
}
function ch(e, t = Uint8Array.of()) {
  const r = Ie.utils, n = ke(e), o = jn.BASE.multiply(n), i = Ar(o.y) ? n : Hc.neg(n), s = r.pointToBytes(o), c = ef(s, t);
  return Tr(Hc.add(i, c), 32);
}
function rs(e, t) {
  const r = Ie.utils, n = ef(e, t), i = r.lift_x(ke(e)).add(jn.BASE.multiply(n)), s = Ar(i.y) ? 0 : 1;
  return [r.pointToBytes(i), s];
}
const ni = mt(jn.BASE.toBytes(!1)), cn = {
  bech32: "bc",
  pubKeyHash: 0,
  scriptHash: 5,
  wif: 128
}, _e = {
  bech32: "tb",
  pubKeyHash: 111,
  scriptHash: 196,
  wif: 239
};
function mo(e, t) {
  if (!rt(e) || !rt(t))
    throw new Error(`cmp: wrong type a=${typeof e} b=${typeof t}`);
  const r = Math.min(e.length, t.length);
  for (let n = 0; n < r; n++)
    if (e[n] != t[n])
      return Math.sign(e[n] - t[n]);
  return Math.sign(e.length - t.length);
}
function nf(e) {
  const t = {};
  for (const r in e) {
    if (t[e[r]] !== void 0)
      throw new Error("duplicate key");
    t[e[r]] = r;
  }
  return t;
}
const ut = {
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
}, ah = nf(ut);
function ri(e = 6, t = !1) {
  return $t({
    encodeStream: (r, n) => {
      if (n === 0n)
        return;
      const o = n < 0, i = BigInt(n), s = [];
      for (let c = o ? -i : i; c; c >>= 8n)
        s.push(Number(c & 0xffn));
      s[s.length - 1] >= 128 ? s.push(o ? 128 : 0) : o && (s[s.length - 1] |= 128), r.bytes(new Uint8Array(s));
    },
    decodeStream: (r) => {
      const n = r.leftBytes;
      if (n > e)
        throw new Error(`ScriptNum: number (${n}) bigger than limit=${e}`);
      if (n === 0)
        return 0n;
      if (t) {
        const s = r.bytes(n, !0);
        if ((s[s.length - 1] & 127) === 0 && (n <= 1 || (s[s.length - 2] & 128) === 0))
          throw new Error("Non-minimally encoded ScriptNum");
      }
      let o = 0, i = 0n;
      for (let s = 0; s < n; ++s)
        o = r.byte(), i |= BigInt(o) << 8n * BigInt(s);
      return o >= 128 && (i &= 2n ** BigInt(n * 8) - 1n >> 1n, i = -i), i;
    }
  });
}
function uh(e, t = 4, r = !0) {
  if (typeof e == "number")
    return e;
  if (rt(e))
    try {
      const n = ri(t, r).decode(e);
      return n > Number.MAX_SAFE_INTEGER ? void 0 : Number(n);
    } catch {
      return;
    }
}
const D = $t({
  encodeStream: (e, t) => {
    for (let r of t) {
      if (typeof r == "string") {
        if (ut[r] === void 0)
          throw new Error(`Unknown opcode=${r}`);
        e.byte(ut[r]);
        continue;
      } else if (typeof r == "number") {
        if (r === 0) {
          e.byte(0);
          continue;
        } else if (1 <= r && r <= 16) {
          e.byte(ut.OP_1 - 1 + r);
          continue;
        }
      }
      if (typeof r == "number" && (r = ri().encode(BigInt(r))), !rt(r))
        throw new Error(`Wrong Script OP=${r} (${typeof r})`);
      const n = r.length;
      n < ut.PUSHDATA1 ? e.byte(n) : n <= 255 ? (e.byte(ut.PUSHDATA1), e.byte(n)) : n <= 65535 ? (e.byte(ut.PUSHDATA2), e.bytes(Dc.encode(n))) : (e.byte(ut.PUSHDATA4), e.bytes(Q.encode(n))), e.bytes(r);
    }
  },
  decodeStream: (e) => {
    const t = [];
    for (; !e.isEnd(); ) {
      const r = e.byte();
      if (ut.OP_0 < r && r <= ut.PUSHDATA4) {
        let n;
        if (r < ut.PUSHDATA1)
          n = r;
        else if (r === ut.PUSHDATA1)
          n = Le.decodeStream(e);
        else if (r === ut.PUSHDATA2)
          n = Dc.decodeStream(e);
        else if (r === ut.PUSHDATA4)
          n = Q.decodeStream(e);
        else
          throw new Error("Should be not possible");
        t.push(e.bytes(n));
      } else if (r === 0)
        t.push(0);
      else if (ut.OP_1 <= r && r <= ut.OP_16)
        t.push(r - (ut.OP_1 - 1));
      else {
        const n = ah[r];
        if (n === void 0)
          throw new Error(`Unknown opcode=${r.toString(16)}`);
        t.push(n);
      }
    }
    return t;
  }
}), Wc = {
  253: [253, 2, 253n, 65535n],
  254: [254, 4, 65536n, 4294967295n],
  255: [255, 8, 4294967296n, 18446744073709551615n]
}, oi = $t({
  encodeStream: (e, t) => {
    if (typeof t == "number" && (t = BigInt(t)), 0n <= t && t <= 252n)
      return e.byte(Number(t));
    for (const [r, n, o, i] of Object.values(Wc))
      if (!(o > t || t > i)) {
        e.byte(r);
        for (let s = 0; s < n; s++)
          e.byte(Number(t >> 8n * BigInt(s) & 0xffn));
        return;
      }
    throw e.err(`VarInt too big: ${t}`);
  },
  decodeStream: (e) => {
    const t = e.byte();
    if (t <= 252)
      return BigInt(t);
    const [r, n, o] = Wc[t];
    let i = 0n;
    for (let s = 0; s < n; s++)
      i |= BigInt(e.byte()) << 8n * BigInt(s);
    if (i < o)
      throw e.err(`Wrong CompactSize(${8 * n})`);
    return i;
  }
}), Jt = ze(oi, ei.numberBigint), Yt = it(oi), an = At(Jt, Yt), xo = (e) => At(oi, e), rf = bt({
  txid: it(32, !0),
  // hash(prev_tx),
  index: Q,
  // output number of previous tx
  finalScriptSig: Yt,
  // btc merges input and output script, executes it. If ok = tx passes
  sequence: Q
  // ?
}), nn = bt({ amount: Qr, script: Yt }), fh = bt({
  version: yn,
  segwitFlag: rh(new Uint8Array([0, 1])),
  inputs: xo(rf),
  outputs: xo(nn),
  witnesses: oh("segwitFlag", At("inputs/length", an)),
  // < 500000000	Block number at which this transaction is unlocked
  // >= 500000000	UNIX timestamp at which this transaction is unlocked
  // Handled as part of PSBTv2
  lockTime: Q
});
function dh(e) {
  if (e.segwitFlag && e.witnesses && !e.witnesses.length)
    throw new Error("Segwit flag with empty witnesses array");
  return e;
}
const bn = Bt(fh, dh), nr = bt({
  version: yn,
  inputs: xo(rf),
  outputs: xo(nn),
  lockTime: Q
}), os = Bt(it(null), (e) => On(e, Rt.ecdsa)), bo = Bt(it(32), (e) => On(e, Rt.schnorr)), Mc = Bt(it(null), (e) => {
  if (e.length !== 64 && e.length !== 65)
    throw new Error("Schnorr signature should be 64 or 65 bytes long");
  return e;
}), ii = bt({
  fingerprint: th,
  path: At(null, Q)
}), of = bt({
  hashes: At(Jt, it(32)),
  der: ii
}), lh = it(78), hh = bt({ pubKey: bo, leafHash: it(32) }), ph = bt({
  version: Le,
  // With parity :(
  internalKey: it(32),
  merklePath: At(null, it(32))
}), Ot = Bt(ph, (e) => {
  if (e.merklePath.length > 128)
    throw new Error("TaprootControlBlock: merklePath should be of length 0..128 (inclusive)");
  return e;
}), gh = At(null, bt({
  depth: Le,
  version: Le,
  script: Yt
})), ft = it(null), zc = it(20), Xn = it(32), Zs = {
  unsignedTx: [0, !1, nr, [0], [0], !1],
  xpub: [1, lh, ii, [], [0, 2], !1],
  txVersion: [2, !1, Q, [2], [2], !1],
  fallbackLocktime: [3, !1, Q, [], [2], !1],
  inputCount: [4, !1, Jt, [2], [2], !1],
  outputCount: [5, !1, Jt, [2], [2], !1],
  txModifiable: [6, !1, Le, [], [2], !1],
  // TODO: bitfield
  version: [251, !1, Q, [], [0, 2], !1],
  proprietary: [252, ft, ft, [], [0, 2], !1]
}, si = {
  nonWitnessUtxo: [0, !1, bn, [], [0, 2], !1],
  witnessUtxo: [1, !1, nn, [], [0, 2], !1],
  partialSig: [2, os, ft, [], [0, 2], !1],
  sighashType: [3, !1, Q, [], [0, 2], !1],
  redeemScript: [4, !1, ft, [], [0, 2], !1],
  witnessScript: [5, !1, ft, [], [0, 2], !1],
  bip32Derivation: [6, os, ii, [], [0, 2], !1],
  finalScriptSig: [7, !1, ft, [], [0, 2], !1],
  finalScriptWitness: [8, !1, an, [], [0, 2], !1],
  porCommitment: [9, !1, ft, [], [0, 2], !1],
  ripemd160: [10, zc, ft, [], [0, 2], !1],
  sha256: [11, Xn, ft, [], [0, 2], !1],
  hash160: [12, zc, ft, [], [0, 2], !1],
  hash256: [13, Xn, ft, [], [0, 2], !1],
  txid: [14, !1, Xn, [2], [2], !0],
  index: [15, !1, Q, [2], [2], !0],
  sequence: [16, !1, Q, [], [2], !0],
  requiredTimeLocktime: [17, !1, Q, [], [2], !1],
  requiredHeightLocktime: [18, !1, Q, [], [2], !1],
  tapKeySig: [19, !1, Mc, [], [0, 2], !1],
  tapScriptSig: [20, hh, Mc, [], [0, 2], !1],
  tapLeafScript: [21, Ot, ft, [], [0, 2], !1],
  tapBip32Derivation: [22, Xn, of, [], [0, 2], !1],
  tapInternalKey: [23, !1, bo, [], [0, 2], !1],
  tapMerkleRoot: [24, !1, Xn, [], [0, 2], !1],
  proprietary: [252, ft, ft, [], [0, 2], !1]
}, wh = [
  "txid",
  "sequence",
  "index",
  "witnessUtxo",
  "nonWitnessUtxo",
  "finalScriptSig",
  "finalScriptWitness",
  "unknown"
], yh = [
  "partialSig",
  "finalScriptSig",
  "finalScriptWitness",
  "tapKeySig",
  "tapScriptSig"
], Un = {
  redeemScript: [0, !1, ft, [], [0, 2], !1],
  witnessScript: [1, !1, ft, [], [0, 2], !1],
  bip32Derivation: [2, os, ii, [], [0, 2], !1],
  amount: [3, !1, Jl, [2], [2], !0],
  script: [4, !1, ft, [2], [2], !0],
  tapInternalKey: [5, !1, bo, [], [0, 2], !1],
  tapTree: [6, !1, gh, [], [0, 2], !1],
  tapBip32Derivation: [7, bo, of, [], [0, 2], !1],
  proprietary: [252, ft, ft, [], [0, 2], !1]
}, mh = [], jc = At(zu, bt({
  //  <key> := <keylen> <keytype> <keydata> WHERE keylen = len(keytype)+len(keydata)
  key: eh(Jt, bt({ type: Jt, key: it(null) })),
  //  <value> := <valuelen> <valuedata>
  value: it(Jt)
}));
function is(e) {
  const [t, r, n, o, i, s] = e;
  return { type: t, kc: r, vc: n, reqInc: o, allowInc: i, silentIgnore: s };
}
bt({ type: Jt, key: it(null) });
function Xs(e) {
  const t = {};
  for (const r in e) {
    const [n, o, i] = e[r];
    t[n] = [r, o, i];
  }
  return $t({
    encodeStream: (r, n) => {
      let o = [];
      for (const i in e) {
        const s = n[i];
        if (s === void 0)
          continue;
        const [c, a, u] = e[i];
        if (!a)
          o.push({ key: { type: c, key: st }, value: u.encode(s) });
        else {
          const f = s.map(([d, h]) => [
            a.encode(d),
            u.encode(h)
          ]);
          f.sort((d, h) => mo(d[0], h[0]));
          for (const [d, h] of f)
            o.push({ key: { key: d, type: c }, value: h });
        }
      }
      if (n.unknown) {
        n.unknown.sort((i, s) => mo(i[0].key, s[0].key));
        for (const [i, s] of n.unknown)
          o.push({ key: i, value: s });
      }
      jc.encodeStream(r, o);
    },
    decodeStream: (r) => {
      const n = jc.decodeStream(r), o = {}, i = {};
      for (const s of n) {
        let c = "unknown", a = s.key.key, u = s.value;
        if (t[s.key.type]) {
          const [f, d, h] = t[s.key.type];
          if (c = f, !d && a.length)
            throw new Error(`PSBT: Non-empty key for ${c} (key=${v.encode(a)} value=${v.encode(u)}`);
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
const Js = Bt(Xs(si), (e) => {
  if (e.finalScriptWitness && !e.finalScriptWitness.length)
    throw new Error("validateInput: empty finalScriptWitness");
  if (e.partialSig && !e.partialSig.length)
    throw new Error("Empty partialSig");
  if (e.partialSig)
    for (const [t] of e.partialSig)
      On(t, Rt.ecdsa);
  if (e.bip32Derivation)
    for (const [t] of e.bip32Derivation)
      On(t, Rt.ecdsa);
  if (e.requiredTimeLocktime !== void 0 && e.requiredTimeLocktime < 5e8)
    throw new Error(`validateInput: wrong timeLocktime=${e.requiredTimeLocktime}`);
  if (e.requiredHeightLocktime !== void 0 && (e.requiredHeightLocktime <= 0 || e.requiredHeightLocktime >= 5e8))
    throw new Error(`validateInput: wrong heighLocktime=${e.requiredHeightLocktime}`);
  if (e.tapLeafScript)
    for (const [t, r] of e.tapLeafScript) {
      if ((t.version & 254) !== r[r.length - 1])
        throw new Error("validateInput: tapLeafScript version mimatch");
      if (r[r.length - 1] & 1)
        throw new Error("validateInput: tapLeafScript version has parity bit!");
    }
  return e;
}), Qs = Bt(Xs(Un), (e) => {
  if (e.bip32Derivation)
    for (const [t] of e.bip32Derivation)
      On(t, Rt.ecdsa);
  return e;
}), sf = Bt(Xs(Zs), (e) => {
  if ((e.version || 0) === 0) {
    if (!e.unsignedTx)
      throw new Error("PSBTv0: missing unsignedTx");
    for (const r of e.unsignedTx.inputs)
      if (r.finalScriptSig && r.finalScriptSig.length)
        throw new Error("PSBTv0: input scriptSig found in unsignedTx");
  }
  return e;
}), xh = bt({
  magic: Gs(js(new Uint8Array([255])), "psbt"),
  global: sf,
  inputs: At("global/unsignedTx/inputs/length", Js),
  outputs: At(null, Qs)
}), bh = bt({
  magic: Gs(js(new Uint8Array([255])), "psbt"),
  global: sf,
  inputs: At("global/inputCount", Js),
  outputs: At("global/outputCount", Qs)
});
bt({
  magic: Gs(js(new Uint8Array([255])), "psbt"),
  items: At(null, ze(At(zu, ih([nh(Jt), it(oi)])), ei.dict()))
});
function Ti(e, t, r) {
  for (const n in r) {
    if (n === "unknown" || !t[n])
      continue;
    const { allowInc: o } = is(t[n]);
    if (!o.includes(e))
      throw new Error(`PSBTv${e}: field ${n} is not allowed`);
  }
  for (const n in t) {
    const { reqInc: o } = is(t[n]);
    if (o.includes(e) && r[n] === void 0)
      throw new Error(`PSBTv${e}: missing required field ${n}`);
  }
}
function Gc(e, t, r) {
  const n = {};
  for (const o in r) {
    const i = o;
    if (i !== "unknown") {
      if (!t[i])
        continue;
      const { allowInc: s, silentIgnore: c } = is(t[i]);
      if (!s.includes(e)) {
        if (c)
          continue;
        throw new Error(`Failed to serialize in PSBTv${e}: ${i} but versions allows inclusion=${s}`);
      }
    }
    n[i] = r[i];
  }
  return n;
}
function cf(e) {
  const t = e && e.global && e.global.version || 0;
  Ti(t, Zs, e.global);
  for (const s of e.inputs)
    Ti(t, si, s);
  for (const s of e.outputs)
    Ti(t, Un, s);
  const r = t ? e.global.inputCount : e.global.unsignedTx.inputs.length;
  if (e.inputs.length < r)
    throw new Error("Not enough inputs");
  const n = e.inputs.slice(r);
  if (n.length > 1 || n.length && Object.keys(n[0]).length)
    throw new Error(`Unexpected inputs left in tx=${n}`);
  const o = t ? e.global.outputCount : e.global.unsignedTx.outputs.length;
  if (e.outputs.length < o)
    throw new Error("Not outputs inputs");
  const i = e.outputs.slice(o);
  if (i.length > 1 || i.length && Object.keys(i[0]).length)
    throw new Error(`Unexpected outputs left in tx=${i}`);
  return e;
}
function ss(e, t, r, n, o) {
  const i = { ...r, ...t };
  for (const s in e) {
    const c = s, [a, u, f] = e[c], d = n && !n.includes(s);
    if (t[s] === void 0 && s in t) {
      if (d)
        throw new Error(`Cannot remove signed field=${s}`);
      delete i[s];
    } else if (u) {
      const h = r && r[s] ? r[s] : [];
      let p = t[c];
      if (p) {
        if (!Array.isArray(p))
          throw new Error(`keyMap(${s}): KV pairs should be [k, v][]`);
        p = p.map((x) => {
          if (x.length !== 2)
            throw new Error(`keyMap(${s}): KV pairs should be [k, v][]`);
          return [
            typeof x[0] == "string" ? u.decode(v.decode(x[0])) : x[0],
            typeof x[1] == "string" ? f.decode(v.decode(x[1])) : x[1]
          ];
        });
        const w = {}, y = (x, T, A) => {
          if (w[x] === void 0) {
            w[x] = [T, A];
            return;
          }
          const R = v.encode(f.encode(w[x][1])), C = v.encode(f.encode(A));
          if (R !== C)
            throw new Error(`keyMap(${c}): same key=${x} oldVal=${R} newVal=${C}`);
        };
        for (const [x, T] of h) {
          const A = v.encode(u.encode(x));
          y(A, x, T);
        }
        for (const [x, T] of p) {
          const A = v.encode(u.encode(x));
          if (T === void 0) {
            if (d)
              throw new Error(`Cannot remove signed field=${c}/${x}`);
            delete w[A];
          } else
            y(A, x, T);
        }
        i[c] = Object.values(w);
      }
    } else if (typeof i[s] == "string")
      i[s] = f.decode(v.decode(i[s]));
    else if (d && s in t && r && r[s] !== void 0 && !dt(f.encode(t[s]), f.encode(r[s])))
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
const qc = Bt(xh, cf), Yc = Bt(bh, cf), Eh = {
  encode(e) {
    if (!(e.length !== 2 || e[0] !== 1 || !rt(e[1]) || v.encode(e[1]) !== "4e73"))
      return { type: "p2a", script: D.encode(e) };
  },
  decode: (e) => {
    if (e.type === "p2a")
      return [1, v.decode("4e73")];
  }
};
function mn(e, t) {
  try {
    return On(e, t), !0;
  } catch {
    return !1;
  }
}
const Sh = {
  encode(e) {
    if (!(e.length !== 2 || !rt(e[0]) || !mn(e[0], Rt.ecdsa) || e[1] !== "CHECKSIG"))
      return { type: "pk", pubkey: e[0] };
  },
  decode: (e) => e.type === "pk" ? [e.pubkey, "CHECKSIG"] : void 0
}, Th = {
  encode(e) {
    if (!(e.length !== 5 || e[0] !== "DUP" || e[1] !== "HASH160" || !rt(e[2])) && !(e[3] !== "EQUALVERIFY" || e[4] !== "CHECKSIG"))
      return { type: "pkh", hash: e[2] };
  },
  decode: (e) => e.type === "pkh" ? ["DUP", "HASH160", e.hash, "EQUALVERIFY", "CHECKSIG"] : void 0
}, vh = {
  encode(e) {
    if (!(e.length !== 3 || e[0] !== "HASH160" || !rt(e[1]) || e[2] !== "EQUAL"))
      return { type: "sh", hash: e[1] };
  },
  decode: (e) => e.type === "sh" ? ["HASH160", e.hash, "EQUAL"] : void 0
}, kh = {
  encode(e) {
    if (!(e.length !== 2 || e[0] !== 0 || !rt(e[1])) && e[1].length === 32)
      return { type: "wsh", hash: e[1] };
  },
  decode: (e) => e.type === "wsh" ? [0, e.hash] : void 0
}, Ih = {
  encode(e) {
    if (!(e.length !== 2 || e[0] !== 0 || !rt(e[1])) && e[1].length === 20)
      return { type: "wpkh", hash: e[1] };
  },
  decode: (e) => e.type === "wpkh" ? [0, e.hash] : void 0
}, Ah = {
  encode(e) {
    const t = e.length - 1;
    if (e[t] !== "CHECKMULTISIG")
      return;
    const r = e[0], n = e[t - 1];
    if (typeof r != "number" || typeof n != "number")
      return;
    const o = e.slice(1, -2);
    if (n === o.length) {
      for (const i of o)
        if (!rt(i))
          return;
      return { type: "ms", m: r, pubkeys: o };
    }
  },
  // checkmultisig(n, ..pubkeys, m)
  decode: (e) => e.type === "ms" ? [e.m, ...e.pubkeys, e.pubkeys.length, "CHECKMULTISIG"] : void 0
}, Bh = {
  encode(e) {
    if (!(e.length !== 2 || e[0] !== 1 || !rt(e[1])))
      return { type: "tr", pubkey: e[1] };
  },
  decode: (e) => e.type === "tr" ? [1, e.pubkey] : void 0
}, $h = {
  encode(e) {
    const t = e.length - 1;
    if (e[t] !== "CHECKSIG")
      return;
    const r = [];
    for (let n = 0; n < t; n++) {
      const o = e[n];
      if (n & 1) {
        if (o !== "CHECKSIGVERIFY" || n === t - 1)
          return;
        continue;
      }
      if (!rt(o))
        return;
      r.push(o);
    }
    return { type: "tr_ns", pubkeys: r };
  },
  decode: (e) => {
    if (e.type !== "tr_ns")
      return;
    const t = [];
    for (let r = 0; r < e.pubkeys.length - 1; r++)
      t.push(e.pubkeys[r], "CHECKSIGVERIFY");
    return t.push(e.pubkeys[e.pubkeys.length - 1], "CHECKSIG"), t;
  }
}, Rh = {
  encode(e) {
    const t = e.length - 1;
    if (e[t] !== "NUMEQUAL" || e[1] !== "CHECKSIG")
      return;
    const r = [], n = uh(e[t - 1]);
    if (typeof n == "number") {
      for (let o = 0; o < t - 1; o++) {
        const i = e[o];
        if (o & 1) {
          if (i !== (o === 1 ? "CHECKSIG" : "CHECKSIGADD"))
            throw new Error("OutScript.encode/tr_ms: wrong element");
          continue;
        }
        if (!rt(i))
          throw new Error("OutScript.encode/tr_ms: wrong key element");
        r.push(i);
      }
      return { type: "tr_ms", pubkeys: r, m: n };
    }
  },
  decode: (e) => {
    if (e.type !== "tr_ms")
      return;
    const t = [e.pubkeys[0], "CHECKSIG"];
    for (let r = 1; r < e.pubkeys.length; r++)
      t.push(e.pubkeys[r], "CHECKSIGADD");
    return t.push(e.m, "NUMEQUAL"), t;
  }
}, Oh = {
  encode(e) {
    return { type: "unknown", script: D.encode(e) };
  },
  decode: (e) => e.type === "unknown" ? D.decode(e.script) : void 0
}, Uh = [
  Eh,
  Sh,
  Th,
  vh,
  kh,
  Ih,
  Ah,
  Bh,
  $h,
  Rh,
  Oh
], Nh = ze(D, ei.match(Uh)), ct = Bt(Nh, (e) => {
  if (e.type === "pk" && !mn(e.pubkey, Rt.ecdsa))
    throw new Error("OutScript/pk: wrong key");
  if ((e.type === "pkh" || e.type === "sh" || e.type === "wpkh") && (!rt(e.hash) || e.hash.length !== 20))
    throw new Error(`OutScript/${e.type}: wrong hash`);
  if (e.type === "wsh" && (!rt(e.hash) || e.hash.length !== 32))
    throw new Error("OutScript/wsh: wrong hash");
  if (e.type === "tr" && (!rt(e.pubkey) || !mn(e.pubkey, Rt.schnorr)))
    throw new Error("OutScript/tr: wrong taproot public key");
  if ((e.type === "ms" || e.type === "tr_ns" || e.type === "tr_ms") && !Array.isArray(e.pubkeys))
    throw new Error("OutScript/multisig: wrong pubkeys array");
  if (e.type === "ms") {
    const t = e.pubkeys.length;
    for (const r of e.pubkeys)
      if (!mn(r, Rt.ecdsa))
        throw new Error("OutScript/multisig: wrong pubkey");
    if (e.m <= 0 || t > 16 || e.m > t)
      throw new Error("OutScript/multisig: invalid params");
  }
  if (e.type === "tr_ns" || e.type === "tr_ms") {
    for (const t of e.pubkeys)
      if (!mn(t, Rt.schnorr))
        throw new Error(`OutScript/${e.type}: wrong pubkey`);
  }
  if (e.type === "tr_ms") {
    const t = e.pubkeys.length;
    if (e.m <= 0 || t > 999 || e.m > t)
      throw new Error("OutScript/tr_ms: invalid params");
  }
  return e;
});
function Zc(e, t) {
  if (!dt(e.hash, mt(t)))
    throw new Error("checkScript: wsh wrong witnessScript hash");
  const r = ct.decode(t);
  if (r.type === "tr" || r.type === "tr_ns" || r.type === "tr_ms")
    throw new Error(`checkScript: P2${r.type} cannot be wrapped in P2SH`);
  if (r.type === "wpkh" || r.type === "sh")
    throw new Error(`checkScript: P2${r.type} cannot be wrapped in P2WSH`);
}
function af(e, t, r) {
  if (e) {
    const n = ct.decode(e);
    if (n.type === "tr_ns" || n.type === "tr_ms" || n.type === "ms" || n.type == "pk")
      throw new Error(`checkScript: non-wrapped ${n.type}`);
    if (n.type === "sh" && t) {
      if (!dt(n.hash, Qu(t)))
        throw new Error("checkScript: sh wrong redeemScript hash");
      const o = ct.decode(t);
      if (o.type === "tr" || o.type === "tr_ns" || o.type === "tr_ms")
        throw new Error(`checkScript: P2${o.type} cannot be wrapped in P2SH`);
      if (o.type === "sh")
        throw new Error("checkScript: P2SH cannot be wrapped in P2SH");
    }
    n.type === "wsh" && r && Zc(n, r);
  }
  if (t) {
    const n = ct.decode(t);
    n.type === "wsh" && r && Zc(n, r);
  }
}
function Ch(e) {
  const t = {};
  for (const r of e) {
    const n = v.encode(r);
    if (t[n])
      throw new Error(`Multisig: non-uniq pubkey: ${e.map(v.encode)}`);
    t[n] = !0;
  }
}
function Ph(e, t, r = !1, n) {
  const o = ct.decode(e);
  if (o.type === "unknown" && r)
    return;
  if (!["tr_ns", "tr_ms"].includes(o.type))
    throw new Error(`P2TR: invalid leaf script=${o.type}`);
  const i = o;
  if (!r && i.pubkeys)
    for (const s of i.pubkeys) {
      if (dt(s, ni))
        throw new Error("Unspendable taproot key in leaf script");
      if (dt(s, t))
        throw new Error("Using P2TR with leaf script with same key as internal key is not supported");
    }
}
function tc(e) {
  const t = Array.from(e);
  for (; t.length >= 2; ) {
    t.sort((s, c) => (c.weight || 1) - (s.weight || 1));
    const n = t.pop(), o = t.pop(), i = (o?.weight || 1) + (n?.weight || 1);
    t.push({
      weight: i,
      // Unwrap children array
      // TODO: Very hard to remove any here
      childs: [o?.childs || o, n?.childs || n]
    });
  }
  const r = t[0];
  return r?.childs || r;
}
function cs(e, t = []) {
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
    left: cs(e.left, [e.right.hash, ...t]),
    right: cs(e.right, [e.left.hash, ...t])
  };
}
function as(e) {
  if (!e)
    throw new Error("taprootAddPath: empty tree");
  if (e.type === "leaf")
    return [e];
  if (e.type !== "branch")
    throw new Error(`taprootWalkTree: wrong type=${e}`);
  return [...as(e.left), ...as(e.right)];
}
function us(e, t, r = !1, n) {
  if (!e)
    throw new Error("taprootHashTree: empty tree");
  if (Array.isArray(e) && e.length === 1 && (e = e[0]), !Array.isArray(e)) {
    const { leafVersion: a, script: u } = e;
    if (e.tapLeafScript || e.tapMerkleRoot && !dt(e.tapMerkleRoot, st))
      throw new Error("P2TR: tapRoot leafScript cannot have tree");
    const f = typeof u == "string" ? v.decode(u) : u;
    if (!rt(f))
      throw new Error(`checkScript: wrong script type=${f}`);
    return Ph(f, t, r), {
      type: "leaf",
      version: a,
      script: f,
      hash: En(f, a)
    };
  }
  if (e.length !== 2 && (e = tc(e)), e.length !== 2)
    throw new Error("hashTree: non binary tree!");
  const o = us(e[0], t, r), i = us(e[1], t, r);
  let [s, c] = [o.hash, i.hash];
  return mo(c, s) === -1 && ([s, c] = [c, s]), { type: "branch", left: o, right: i, hash: Ys("TapBranch", s, c) };
}
const un = 192, En = (e, t = un) => Ys("TapLeaf", new Uint8Array([t]), Yt.encode(e));
function uf(e, t, r = cn, n = !1, o) {
  if (!e && !t)
    throw new Error("p2tr: should have pubKey or scriptTree (or both)");
  const i = typeof e == "string" ? v.decode(e) : e || ni;
  if (!mn(i, Rt.schnorr))
    throw new Error("p2tr: non-schnorr pubkey");
  if (t) {
    let s = cs(us(t, i, n));
    const c = s.hash, [a, u] = rs(i, c), f = as(s).map((d) => ({
      ...d,
      controlBlock: Ot.encode({
        version: (d.version || un) + u,
        internalKey: i,
        merklePath: d.path
      })
    }));
    return {
      type: "tr",
      script: ct.encode({ type: "tr", pubkey: a }),
      address: de(r).encode({ type: "tr", pubkey: a }),
      // For tests
      tweakedPubkey: a,
      // PSBT stuff
      tapInternalKey: i,
      leaves: f,
      tapLeafScript: f.map((d) => [
        Ot.decode(d.controlBlock),
        Ce(d.script, new Uint8Array([d.version || un]))
      ]),
      tapMerkleRoot: c
    };
  } else {
    const s = rs(i, st)[0];
    return {
      type: "tr",
      script: ct.encode({ type: "tr", pubkey: s }),
      address: de(r).encode({ type: "tr", pubkey: s }),
      // For tests
      tweakedPubkey: s,
      // PSBT stuff
      tapInternalKey: i
    };
  }
}
function ff(e, t, r = !1) {
  return r || Ch(t), {
    type: "tr_ms",
    script: ct.encode({ type: "tr_ms", pubkeys: t, m: e })
  };
}
const df = Hl(mt);
function lf(e, t) {
  if (t.length < 2 || t.length > 40)
    throw new Error("Witness: invalid length");
  if (e > 16)
    throw new Error("Witness: invalid version");
  if (e === 0 && !(t.length === 20 || t.length === 32))
    throw new Error("Witness: invalid length for version");
}
function vi(e, t, r = cn) {
  lf(e, t);
  const n = e === 0 ? ts : ae;
  return n.encode(r.bech32, [e].concat(n.toWords(t)));
}
function Xc(e, t) {
  return df.encode(Ce(Uint8Array.from(t), e));
}
function de(e = cn) {
  return {
    encode(t) {
      const { type: r } = t;
      if (r === "wpkh")
        return vi(0, t.hash, e);
      if (r === "wsh")
        return vi(0, t.hash, e);
      if (r === "tr")
        return vi(1, t.pubkey, e);
      if (r === "pkh")
        return Xc(t.hash, [e.pubKeyHash]);
      if (r === "sh")
        return Xc(t.hash, [e.scriptHash]);
      throw new Error(`Unknown address type=${r}`);
    },
    decode(t) {
      if (t.length < 14 || t.length > 74)
        throw new Error("Invalid address length");
      if (e.bech32 && t.toLowerCase().startsWith(`${e.bech32}1`)) {
        let n;
        try {
          if (n = ts.decode(t), n.words[0] !== 0)
            throw new Error(`bech32: wrong version=${n.words[0]}`);
        } catch {
          if (n = ae.decode(t), n.words[0] === 0)
            throw new Error(`bech32m: wrong version=${n.words[0]}`);
        }
        if (n.prefix !== e.bech32)
          throw new Error(`wrong bech32 prefix=${n.prefix}`);
        const [o, ...i] = n.words, s = ts.fromWords(i);
        if (lf(o, s), o === 0 && s.length === 32)
          return { type: "wsh", hash: s };
        if (o === 0 && s.length === 20)
          return { type: "wpkh", hash: s };
        if (o === 1 && s.length === 32)
          return { type: "tr", pubkey: s };
        throw new Error("Unknown witness program");
      }
      const r = df.decode(t);
      if (r.length !== 21)
        throw new Error("Invalid base58 address");
      if (r[0] === e.pubKeyHash)
        return { type: "pkh", hash: r.slice(1) };
      if (r[0] === e.scriptHash)
        return {
          type: "sh",
          hash: r.slice(1)
        };
      throw new Error(`Invalid address prefix=${r[0]}`);
    }
  };
}
const Nr = new Uint8Array(32), _h = {
  amount: 0xffffffffffffffffn,
  script: st
}, Lh = (e) => Math.ceil(e / 4), Vh = 8, Dh = 2, Xe = 0, ci = 4294967295;
ei.decimal(Vh);
const sr = (e, t) => e === void 0 ? t : e;
function Eo(e) {
  if (Array.isArray(e))
    return e.map((t) => Eo(t));
  if (rt(e))
    return Uint8Array.from(e);
  if (["number", "bigint", "boolean", "string", "undefined"].includes(typeof e))
    return e;
  if (e === null)
    return e;
  if (typeof e == "object")
    return Object.fromEntries(Object.entries(e).map(([t, r]) => [t, Eo(r)]));
  throw new Error(`cloneDeep: unknown type=${e} (${typeof e})`);
}
const X = {
  DEFAULT: 0,
  ALL: 1,
  NONE: 2,
  SINGLE: 3,
  ANYONECANPAY: 128
}, Kt = {
  DEFAULT: X.DEFAULT,
  ALL: X.ALL,
  NONE: X.NONE,
  SINGLE: X.SINGLE,
  DEFAULT_ANYONECANPAY: X.DEFAULT | X.ANYONECANPAY,
  ALL_ANYONECANPAY: X.ALL | X.ANYONECANPAY,
  NONE_ANYONECANPAY: X.NONE | X.ANYONECANPAY,
  SINGLE_ANYONECANPAY: X.SINGLE | X.ANYONECANPAY
}, Hh = nf(Kt);
function Fh(e, t, r, n = st) {
  return dt(r, t) && (e = ch(e, n), t = qs(e)), { privKey: e, pubKey: t };
}
function Je(e) {
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
    sequence: sr(e.sequence, ci),
    finalScriptSig: sr(e.finalScriptSig, st)
  };
}
function ki(e) {
  for (const t in e) {
    const r = t;
    wh.includes(r) || delete e[r];
  }
}
const Ii = bt({ txid: it(32, !0), index: Q });
function Kh(e) {
  if (typeof e != "number" || typeof Hh[e] != "string")
    throw new Error(`Invalid SigHash=${e}`);
  return e;
}
function Jc(e) {
  const t = e & 31;
  return {
    isAny: !!(e & X.ANYONECANPAY),
    isNone: t === X.NONE,
    isSingle: t === X.SINGLE
  };
}
function Wh(e) {
  if (e !== void 0 && {}.toString.call(e) !== "[object Object]")
    throw new Error(`Wrong object type for transaction options: ${e}`);
  const t = {
    ...e,
    // Defaults
    version: sr(e.version, Dh),
    lockTime: sr(e.lockTime, 0),
    PSBTVersion: sr(e.PSBTVersion, 0)
  };
  if (typeof t.allowUnknowInput < "u" && (e.allowUnknownInputs = t.allowUnknowInput), typeof t.allowUnknowOutput < "u" && (e.allowUnknownOutputs = t.allowUnknowOutput), typeof t.lockTime != "number")
    throw new Error("Transaction lock time should be number");
  if (Q.encode(t.lockTime), t.PSBTVersion !== 0 && t.PSBTVersion !== 2)
    throw new Error(`Unknown PSBT version ${t.PSBTVersion}`);
  for (const r of [
    "allowUnknownVersion",
    "allowUnknownOutputs",
    "allowUnknownInputs",
    "disableScriptCheck",
    "bip174jsCompat",
    "allowLegacyWitnessUtxo",
    "lowR"
  ]) {
    const n = t[r];
    if (n !== void 0 && typeof n != "boolean")
      throw new Error(`Transation options wrong type: ${r}=${n} (${typeof n})`);
  }
  if (t.allowUnknownVersion ? typeof t.version == "number" : ![-1, 0, 1, 2, 3].includes(t.version))
    throw new Error(`Unknown version: ${t.version}`);
  if (t.customScripts !== void 0) {
    const r = t.customScripts;
    if (!Array.isArray(r))
      throw new Error(`wrong custom scripts type (expected array): customScripts=${r} (${typeof r})`);
    for (const n of r) {
      if (typeof n.encode != "function" || typeof n.decode != "function")
        throw new Error(`wrong script=${n} (${typeof n})`);
      if (n.finalizeTaproot !== void 0 && typeof n.finalizeTaproot != "function")
        throw new Error(`wrong script=${n} (${typeof n})`);
    }
  }
  return Object.freeze(t);
}
function Qc(e) {
  if (e.nonWitnessUtxo && e.index !== void 0) {
    const t = e.nonWitnessUtxo.outputs.length - 1;
    if (e.index > t)
      throw new Error(`validateInput: index(${e.index}) not in nonWitnessUtxo`);
    const r = e.nonWitnessUtxo.outputs[e.index];
    if (e.witnessUtxo && (!dt(e.witnessUtxo.script, r.script) || e.witnessUtxo.amount !== r.amount))
      throw new Error("validateInput: witnessUtxo different from nonWitnessUtxo");
    if (e.txid) {
      if (e.nonWitnessUtxo.outputs.length - 1 < e.index)
        throw new Error("nonWitnessUtxo: incorect output index");
      const o = at.fromRaw(bn.encode(e.nonWitnessUtxo), {
        allowUnknownOutputs: !0,
        disableScriptCheck: !0,
        allowUnknownInputs: !0
      }), i = v.encode(e.txid);
      if (o.isFinal && o.id !== i)
        throw new Error(`nonWitnessUtxo: wrong txid, exp=${i} got=${o.id}`);
    }
  }
  return e;
}
function to(e) {
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
function ta(e, t, r, n = !1, o = !1) {
  let { nonWitnessUtxo: i, txid: s } = e;
  typeof i == "string" && (i = v.decode(i)), rt(i) && (i = bn.decode(i)), !("nonWitnessUtxo" in e) && i === void 0 && (i = t?.nonWitnessUtxo), typeof s == "string" && (s = v.decode(s)), s === void 0 && (s = t?.txid);
  let c = { ...t, ...e, nonWitnessUtxo: i, txid: s };
  !("nonWitnessUtxo" in e) && c.nonWitnessUtxo === void 0 && delete c.nonWitnessUtxo, c.sequence === void 0 && (c.sequence = ci), c.tapMerkleRoot === null && delete c.tapMerkleRoot, c = ss(si, c, t, r, o), Js.encode(c);
  let a;
  return c.nonWitnessUtxo && c.index !== void 0 ? a = c.nonWitnessUtxo.outputs[c.index] : c.witnessUtxo && (a = c.witnessUtxo), a && !n && af(a && a.script, c.redeemScript, c.witnessScript), c;
}
function ea(e, t = !1) {
  let r = "legacy", n = X.ALL;
  const o = to(e), i = ct.decode(o.script);
  let s = i.type, c = i;
  const a = [i];
  if (i.type === "tr")
    return n = X.DEFAULT, {
      txType: "taproot",
      type: "tr",
      last: i,
      lastScript: o.script,
      defaultSighash: n,
      sighash: e.sighashType || n
    };
  {
    if ((i.type === "wpkh" || i.type === "wsh") && (r = "segwit"), i.type === "sh") {
      if (!e.redeemScript)
        throw new Error("inputType: sh without redeemScript");
      let h = ct.decode(e.redeemScript);
      (h.type === "wpkh" || h.type === "wsh") && (r = "segwit"), a.push(h), c = h, s += `-${h.type}`;
    }
    if (c.type === "wsh") {
      if (!e.witnessScript)
        throw new Error("inputType: wsh without witnessScript");
      let h = ct.decode(e.witnessScript);
      h.type === "wsh" && (r = "segwit"), a.push(h), c = h, s += `-${h.type}`;
    }
    const u = a[a.length - 1];
    if (u.type === "sh" || u.type === "wsh")
      throw new Error("inputType: sh/wsh cannot be terminal type");
    const f = ct.encode(u), d = {
      type: s,
      txType: r,
      last: u,
      lastScript: f,
      defaultSighash: n,
      sighash: e.sighashType || n
    };
    if (r === "legacy" && !t && !e.nonWitnessUtxo)
      throw new Error("Transaction/sign: legacy input without nonWitnessUtxo, can result in attack that forces paying higher fees. Pass allowLegacyWitnessUtxo=true, if you sure");
    return d;
  }
}
let at = class eo {
  global = {};
  inputs = [];
  // use getInput()
  outputs = [];
  // use getOutput()
  opts;
  constructor(t = {}) {
    const r = this.opts = Wh(t);
    r.lockTime !== Xe && (this.global.fallbackLocktime = r.lockTime), this.global.txVersion = r.version;
  }
  // Import
  static fromRaw(t, r = {}) {
    const n = bn.decode(t), o = new eo({ ...r, version: n.version, lockTime: n.lockTime });
    for (const i of n.outputs)
      o.addOutput(i);
    if (o.outputs = n.outputs, o.inputs = n.inputs, n.witnesses)
      for (let i = 0; i < n.witnesses.length; i++)
        o.inputs[i].finalScriptWitness = n.witnesses[i];
    return o;
  }
  // PSBT
  static fromPSBT(t, r = {}) {
    let n;
    try {
      n = qc.decode(t);
    } catch (d) {
      try {
        n = Yc.decode(t);
      } catch {
        throw d;
      }
    }
    const o = n.global.version || 0;
    if (o !== 0 && o !== 2)
      throw new Error(`Wrong PSBT version=${o}`);
    const i = n.global.unsignedTx, s = o === 0 ? i?.version : n.global.txVersion, c = o === 0 ? i?.lockTime : n.global.fallbackLocktime, a = new eo({ ...r, version: s, lockTime: c, PSBTVersion: o }), u = o === 0 ? i?.inputs.length : n.global.inputCount;
    a.inputs = n.inputs.slice(0, u).map((d, h) => Qc({
      finalScriptSig: st,
      ...n.global.unsignedTx?.inputs[h],
      ...d
    }));
    const f = o === 0 ? i?.outputs.length : n.global.outputCount;
    return a.outputs = n.outputs.slice(0, f).map((d, h) => ({
      ...d,
      ...n.global.unsignedTx?.outputs[h]
    })), a.global = { ...n.global, txVersion: s }, c !== Xe && (a.global.fallbackLocktime = c), a;
  }
  toPSBT(t = this.opts.PSBTVersion) {
    if (t !== 0 && t !== 2)
      throw new Error(`Wrong PSBT version=${t}`);
    const r = this.inputs.map((i) => Qc(Gc(t, si, i)));
    for (const i of r)
      i.partialSig && !i.partialSig.length && delete i.partialSig, i.finalScriptSig && !i.finalScriptSig.length && delete i.finalScriptSig, i.finalScriptWitness && !i.finalScriptWitness.length && delete i.finalScriptWitness;
    const n = this.outputs.map((i) => Gc(t, Un, i)), o = { ...this.global };
    return t === 0 ? (o.unsignedTx = nr.decode(nr.encode({
      version: this.version,
      lockTime: this.lockTime,
      inputs: this.inputs.map(Jn).map((i) => ({
        ...i,
        finalScriptSig: st
      })),
      outputs: this.outputs.map(Je)
    })), delete o.fallbackLocktime, delete o.txVersion) : (o.version = t, o.txVersion = this.version, o.inputCount = this.inputs.length, o.outputCount = this.outputs.length, o.fallbackLocktime && o.fallbackLocktime === Xe && delete o.fallbackLocktime), this.opts.bip174jsCompat && (r.length || r.push({}), n.length || n.push({})), (t === 0 ? qc : Yc).encode({
      global: o,
      inputs: r,
      outputs: n
    });
  }
  // BIP370 lockTime (https://github.com/bitcoin/bips/blob/master/bip-0370.mediawiki#determining-lock-time)
  get lockTime() {
    let t = Xe, r = 0, n = Xe, o = 0;
    for (const i of this.inputs)
      i.requiredHeightLocktime && (t = Math.max(t, i.requiredHeightLocktime), r++), i.requiredTimeLocktime && (n = Math.max(n, i.requiredTimeLocktime), o++);
    return r && r >= o ? t : n !== Xe ? n : this.global.fallbackLocktime || Xe;
  }
  get version() {
    if (this.global.txVersion === void 0)
      throw new Error("No global.txVersion");
    return this.global.txVersion;
  }
  inputStatus(t) {
    this.checkInputIdx(t);
    const r = this.inputs[t];
    return r.finalScriptSig && r.finalScriptSig.length || r.finalScriptWitness && r.finalScriptWitness.length ? "finalized" : r.tapKeySig || r.tapScriptSig && r.tapScriptSig.length || r.partialSig && r.partialSig.length ? "signed" : "unsigned";
  }
  // Cannot replace unpackSighash, tests rely on very generic implemenetation with signing inputs outside of range
  // We will lose some vectors -> smaller test coverage of preimages (very important!)
  inputSighash(t) {
    this.checkInputIdx(t);
    const r = this.inputs[t].sighashType, n = r === void 0 ? X.DEFAULT : r, o = n === X.DEFAULT ? X.ALL : n & 3;
    return { sigInputs: n & X.ANYONECANPAY, sigOutputs: o };
  }
  // Very nice for debug purposes, but slow. If there is too much inputs/outputs to add, will be quadratic.
  // Some cache will be nice, but there chance to have bugs with cache invalidation
  signStatus() {
    let t = !0, r = !0, n = [], o = [];
    for (let i = 0; i < this.inputs.length; i++) {
      if (this.inputStatus(i) === "unsigned")
        continue;
      const { sigInputs: c, sigOutputs: a } = this.inputSighash(i);
      if (c === X.ANYONECANPAY ? n.push(i) : t = !1, a === X.ALL)
        r = !1;
      else if (a === X.SINGLE)
        o.push(i);
      else if (a !== X.NONE) throw new Error(`Wrong signature hash output type: ${a}`);
    }
    return { addInput: t, addOutput: r, inputs: n, outputs: o };
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
    for (const r of this.inputs)
      r.finalScriptWitness && r.finalScriptWitness.length && (t = !0);
    return t;
  }
  // https://en.bitcoin.it/wiki/Weight_units
  get weight() {
    if (!this.isFinal)
      throw new Error("Transaction is not finalized");
    let t = 32;
    const r = this.outputs.map(Je);
    t += 4 * Jt.encode(this.outputs.length).length;
    for (const n of r)
      t += 32 + 4 * Yt.encode(n.script).length;
    this.hasWitnesses && (t += 2), t += 4 * Jt.encode(this.inputs.length).length;
    for (const n of this.inputs)
      t += 160 + 4 * Yt.encode(n.finalScriptSig || st).length, this.hasWitnesses && n.finalScriptWitness && (t += an.encode(n.finalScriptWitness).length);
    return t;
  }
  get vsize() {
    return Lh(this.weight);
  }
  toBytes(t = !1, r = !1) {
    return bn.encode({
      version: this.version,
      lockTime: this.lockTime,
      inputs: this.inputs.map(Jn).map((n) => ({
        ...n,
        finalScriptSig: t && n.finalScriptSig || st
      })),
      outputs: this.outputs.map(Je),
      witnesses: this.inputs.map((n) => n.finalScriptWitness || []),
      segwitFlag: r && this.hasWitnesses
    });
  }
  get unsignedTx() {
    return this.toBytes(!1, !1);
  }
  get hex() {
    return v.encode(this.toBytes(!0, this.hasWitnesses));
  }
  get hash() {
    return v.encode($e(this.toBytes(!0)));
  }
  get id() {
    return v.encode($e(this.toBytes(!0)).reverse());
  }
  // Input stuff
  checkInputIdx(t) {
    if (!Number.isSafeInteger(t) || 0 > t || t >= this.inputs.length)
      throw new Error(`Wrong input index=${t}`);
  }
  getInput(t) {
    return this.checkInputIdx(t), Eo(this.inputs[t]);
  }
  get inputsLength() {
    return this.inputs.length;
  }
  // Modification
  addInput(t, r = !1) {
    if (!r && !this.signStatus().addInput)
      throw new Error("Tx has signed inputs, cannot add new one");
    return this.inputs.push(ta(t, void 0, void 0, this.opts.disableScriptCheck)), this.inputs.length - 1;
  }
  updateInput(t, r, n = !1) {
    this.checkInputIdx(t);
    let o;
    if (!n) {
      const i = this.signStatus();
      (!i.addInput || i.inputs.includes(t)) && (o = yh);
    }
    this.inputs[t] = ta(r, this.inputs[t], o, this.opts.disableScriptCheck, this.opts.allowUnknown);
  }
  // Output stuff
  checkOutputIdx(t) {
    if (!Number.isSafeInteger(t) || 0 > t || t >= this.outputs.length)
      throw new Error(`Wrong output index=${t}`);
  }
  getOutput(t) {
    return this.checkOutputIdx(t), Eo(this.outputs[t]);
  }
  getOutputAddress(t, r = cn) {
    const n = this.getOutput(t);
    if (n.script)
      return de(r).encode(ct.decode(n.script));
  }
  get outputsLength() {
    return this.outputs.length;
  }
  normalizeOutput(t, r, n) {
    let { amount: o, script: i } = t;
    if (o === void 0 && (o = r?.amount), typeof o != "bigint")
      throw new Error(`Wrong amount type, should be of type bigint in sats, but got ${o} of type ${typeof o}`);
    typeof i == "string" && (i = v.decode(i)), i === void 0 && (i = r?.script);
    let s = { ...r, ...t, amount: o, script: i };
    if (s.amount === void 0 && delete s.amount, s = ss(Un, s, r, n, this.opts.allowUnknown), Qs.encode(s), s.script && !this.opts.allowUnknownOutputs && ct.decode(s.script).type === "unknown")
      throw new Error("Transaction/output: unknown output script type, there is a chance that input is unspendable. Pass allowUnknownOutputs=true, if you sure");
    return this.opts.disableScriptCheck || af(s.script, s.redeemScript, s.witnessScript), s;
  }
  addOutput(t, r = !1) {
    if (!r && !this.signStatus().addOutput)
      throw new Error("Tx has signed outputs, cannot add new one");
    return this.outputs.push(this.normalizeOutput(t)), this.outputs.length - 1;
  }
  updateOutput(t, r, n = !1) {
    this.checkOutputIdx(t);
    let o;
    if (!n) {
      const i = this.signStatus();
      (!i.addOutput || i.outputs.includes(t)) && (o = mh);
    }
    this.outputs[t] = this.normalizeOutput(r, this.outputs[t], o);
  }
  addOutputAddress(t, r, n = cn) {
    return this.addOutput({ script: ct.encode(de(n).decode(t)), amount: r });
  }
  // Utils
  get fee() {
    let t = 0n;
    for (const n of this.inputs) {
      const o = to(n);
      if (!o)
        throw new Error("Empty input amount");
      t += o.amount;
    }
    const r = this.outputs.map(Je);
    for (const n of r)
      t -= n.amount;
    return t;
  }
  // Signing
  // Based on https://github.com/bitcoin/bitcoin/blob/5871b5b5ab57a0caf9b7514eb162c491c83281d5/test/functional/test_framework/script.py#L624
  // There is optimization opportunity to re-use hashes for multiple inputs for witness v0/v1,
  // but we are trying to be less complicated for audit purpose for now.
  preimageLegacy(t, r, n) {
    const { isAny: o, isNone: i, isSingle: s } = Jc(n);
    if (t < 0 || !Number.isSafeInteger(t))
      throw new Error(`Invalid input idx=${t}`);
    if (s && t >= this.outputs.length || t >= this.inputs.length)
      return Zu.encode(1n);
    r = D.encode(D.decode(r).filter((f) => f !== "CODESEPARATOR"));
    let c = this.inputs.map(Jn).map((f, d) => ({
      ...f,
      finalScriptSig: d === t ? r : st
    }));
    o ? c = [c[t]] : (i || s) && (c = c.map((f, d) => ({
      ...f,
      sequence: d === t ? f.sequence : 0
    })));
    let a = this.outputs.map(Je);
    i ? a = [] : s && (a = a.slice(0, t).fill(_h).concat([a[t]]));
    const u = bn.encode({
      lockTime: this.lockTime,
      version: this.version,
      segwitFlag: !1,
      inputs: c,
      outputs: a
    });
    return $e(u, yn.encode(n));
  }
  preimageWitnessV0(t, r, n, o) {
    const { isAny: i, isNone: s, isSingle: c } = Jc(n);
    let a = Nr, u = Nr, f = Nr;
    const d = this.inputs.map(Jn), h = this.outputs.map(Je);
    i || (a = $e(...d.map(Ii.encode))), !i && !c && !s && (u = $e(...d.map((w) => Q.encode(w.sequence)))), !c && !s ? f = $e(...h.map(nn.encode)) : c && t < h.length && (f = $e(nn.encode(h[t])));
    const p = d[t];
    return $e(yn.encode(this.version), a, u, it(32, !0).encode(p.txid), Q.encode(p.index), Yt.encode(r), Qr.encode(o), Q.encode(p.sequence), f, Q.encode(this.lockTime), Q.encode(n));
  }
  preimageWitnessV1(t, r, n, o, i = -1, s, c = 192, a) {
    if (!Array.isArray(o) || this.inputs.length !== o.length)
      throw new Error(`Invalid amounts array=${o}`);
    if (!Array.isArray(r) || this.inputs.length !== r.length)
      throw new Error(`Invalid prevOutScript array=${r}`);
    const u = [
      Le.encode(0),
      Le.encode(n),
      // U8 sigHash
      yn.encode(this.version),
      Q.encode(this.lockTime)
    ], f = n === X.DEFAULT ? X.ALL : n & 3, d = n & X.ANYONECANPAY, h = this.inputs.map(Jn), p = this.outputs.map(Je);
    d !== X.ANYONECANPAY && u.push(...[
      h.map(Ii.encode),
      o.map(Qr.encode),
      r.map(Yt.encode),
      h.map((y) => Q.encode(y.sequence))
    ].map((y) => mt(Ce(...y)))), f === X.ALL && u.push(mt(Ce(...p.map(nn.encode))));
    const w = (a ? 1 : 0) | (s ? 2 : 0);
    if (u.push(new Uint8Array([w])), d === X.ANYONECANPAY) {
      const y = h[t];
      u.push(Ii.encode(y), Qr.encode(o[t]), Yt.encode(r[t]), Q.encode(y.sequence));
    } else
      u.push(Q.encode(t));
    return w & 1 && u.push(mt(Yt.encode(a || st))), f === X.SINGLE && u.push(t < p.length ? mt(nn.encode(p[t])) : Nr), s && u.push(En(s, c), Le.encode(0), yn.encode(i)), Ys("TapSighash", ...u);
  }
  // Signer can be privateKey OR instance of bip32 HD stuff
  signIdx(t, r, n, o) {
    this.checkInputIdx(r);
    const i = this.inputs[r], s = ea(i, this.opts.allowLegacyWitnessUtxo);
    if (!rt(t)) {
      if (!i.bip32Derivation || !i.bip32Derivation.length)
        throw new Error("bip32Derivation: empty");
      const f = i.bip32Derivation.filter((h) => h[1].fingerprint == t.fingerprint).map(([h, { path: p }]) => {
        let w = t;
        for (const y of p)
          w = w.deriveChild(y);
        if (!dt(w.publicKey, h))
          throw new Error("bip32Derivation: wrong pubKey");
        if (!w.privateKey)
          throw new Error("bip32Derivation: no privateKey");
        return w;
      });
      if (!f.length)
        throw new Error(`bip32Derivation: no items with fingerprint=${t.fingerprint}`);
      let d = !1;
      for (const h of f)
        this.signIdx(h.privateKey, r) && (d = !0);
      return d;
    }
    n ? n.forEach(Kh) : n = [s.defaultSighash];
    const c = s.sighash;
    if (!n.includes(c))
      throw new Error(`Input with not allowed sigHash=${c}. Allowed: ${n.join(", ")}`);
    const { sigOutputs: a } = this.inputSighash(r);
    if (a === X.SINGLE && r >= this.outputs.length)
      throw new Error(`Input with sighash SINGLE, but there is no output with corresponding index=${r}`);
    const u = to(i);
    if (s.txType === "taproot") {
      const f = this.inputs.map(to), d = f.map((x) => x.script), h = f.map((x) => x.amount);
      let p = !1, w = qs(t), y = i.tapMerkleRoot || st;
      if (i.tapInternalKey) {
        const { pubKey: x, privKey: T } = Fh(t, w, i.tapInternalKey, y), [A] = rs(i.tapInternalKey, y);
        if (dt(A, x)) {
          const R = this.preimageWitnessV1(r, d, c, h), C = Ce(Kc(R, T, o), c !== X.DEFAULT ? new Uint8Array([c]) : st);
          this.updateInput(r, { tapKeySig: C }, !0), p = !0;
        }
      }
      if (i.tapLeafScript) {
        i.tapScriptSig = i.tapScriptSig || [];
        for (const [x, T] of i.tapLeafScript) {
          const A = T.subarray(0, -1), R = D.decode(A), C = T[T.length - 1], $ = En(A, C);
          if (R.findIndex((_) => rt(_) && dt(_, w)) === -1)
            continue;
          const g = this.preimageWitnessV1(r, d, c, h, void 0, A, C), K = Ce(Kc(g, t, o), c !== X.DEFAULT ? new Uint8Array([c]) : st);
          this.updateInput(r, { tapScriptSig: [[{ pubKey: w, leafHash: $ }, K]] }, !0), p = !0;
        }
      }
      if (!p)
        throw new Error("No taproot scripts signed");
      return !0;
    } else {
      const f = tf(t);
      let d = !1;
      const h = Qu(f);
      for (const y of D.decode(s.lastScript))
        rt(y) && (dt(y, f) || dt(y, h)) && (d = !0);
      if (!d)
        throw new Error(`Input script doesn't have pubKey: ${s.lastScript}`);
      let p;
      if (s.txType === "legacy")
        p = this.preimageLegacy(r, s.lastScript, c);
      else if (s.txType === "segwit") {
        let y = s.lastScript;
        s.last.type === "wpkh" && (y = ct.encode({ type: "pkh", hash: s.last.hash })), p = this.preimageWitnessV0(r, y, c, u.amount);
      } else
        throw new Error(`Transaction/sign: unknown tx type: ${s.txType}`);
      const w = sh(p, t, this.opts.lowR);
      this.updateInput(r, {
        partialSig: [[f, Ce(w, new Uint8Array([c]))]]
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
  sign(t, r, n) {
    let o = 0;
    for (let i = 0; i < this.inputs.length; i++)
      try {
        this.signIdx(t, i, r, n) && o++;
      } catch {
      }
    if (!o)
      throw new Error("No inputs signed");
    return o;
  }
  finalizeIdx(t) {
    if (this.checkInputIdx(t), this.fee < 0n)
      throw new Error("Outputs spends more than inputs amount");
    const r = this.inputs[t], n = ea(r, this.opts.allowLegacyWitnessUtxo);
    if (n.txType === "taproot") {
      if (r.tapKeySig)
        r.finalScriptWitness = [r.tapKeySig];
      else if (r.tapLeafScript && r.tapScriptSig) {
        const a = r.tapLeafScript.sort((u, f) => Ot.encode(u[0]).length - Ot.encode(f[0]).length);
        for (const [u, f] of a) {
          const d = f.slice(0, -1), h = f[f.length - 1], p = ct.decode(d), w = En(d, h), y = r.tapScriptSig.filter((T) => dt(T[0].leafHash, w));
          let x = [];
          if (p.type === "tr_ms") {
            const T = p.m, A = p.pubkeys;
            let R = 0;
            for (const C of A) {
              const $ = y.findIndex((V) => dt(V[0].pubKey, C));
              if (R === T || $ === -1) {
                x.push(st);
                continue;
              }
              x.push(y[$][1]), R++;
            }
            if (R !== T)
              continue;
          } else if (p.type === "tr_ns") {
            for (const T of p.pubkeys) {
              const A = y.findIndex((R) => dt(R[0].pubKey, T));
              A !== -1 && x.push(y[A][1]);
            }
            if (x.length !== p.pubkeys.length)
              continue;
          } else if (p.type === "unknown" && this.opts.allowUnknownInputs) {
            const T = D.decode(d);
            if (x = y.map(([{ pubKey: A }, R]) => {
              const C = T.findIndex(($) => rt($) && dt($, A));
              if (C === -1)
                throw new Error("finalize/taproot: cannot find position of pubkey in script");
              return { signature: R, pos: C };
            }).sort((A, R) => A.pos - R.pos).map((A) => A.signature), !x.length)
              continue;
          } else {
            const T = this.opts.customScripts;
            if (T)
              for (const A of T) {
                if (!A.finalizeTaproot)
                  continue;
                const R = D.decode(d), C = A.encode(R);
                if (C === void 0)
                  continue;
                const $ = A.finalizeTaproot(d, C, y);
                if ($) {
                  r.finalScriptWitness = $.concat(Ot.encode(u)), r.finalScriptSig = st, ki(r);
                  return;
                }
              }
            throw new Error("Finalize: Unknown tapLeafScript");
          }
          r.finalScriptWitness = x.reverse().concat([d, Ot.encode(u)]);
          break;
        }
        if (!r.finalScriptWitness)
          throw new Error("finalize/taproot: empty witness");
      } else
        throw new Error("finalize/taproot: unknown input");
      r.finalScriptSig = st, ki(r);
      return;
    }
    if (!r.partialSig || !r.partialSig.length)
      throw new Error("Not enough partial sign");
    let o = st, i = [];
    if (n.last.type === "ms") {
      const a = n.last.m, u = n.last.pubkeys;
      let f = [];
      for (const d of u) {
        const h = r.partialSig.find((p) => dt(d, p[0]));
        h && f.push(h[1]);
      }
      if (f = f.slice(0, a), f.length !== a)
        throw new Error(`Multisig: wrong signatures count, m=${a} n=${u.length} signatures=${f.length}`);
      o = D.encode([0, ...f]);
    } else if (n.last.type === "pk")
      o = D.encode([r.partialSig[0][1]]);
    else if (n.last.type === "pkh")
      o = D.encode([r.partialSig[0][1], r.partialSig[0][0]]);
    else if (n.last.type === "wpkh")
      o = st, i = [r.partialSig[0][1], r.partialSig[0][0]];
    else if (n.last.type === "unknown" && !this.opts.allowUnknownInputs)
      throw new Error("Unknown inputs not allowed");
    let s, c;
    if (n.type.includes("wsh-") && (o.length && n.lastScript.length && (i = D.decode(o).map((a) => {
      if (a === 0)
        return st;
      if (rt(a))
        return a;
      throw new Error(`Wrong witness op=${a}`);
    })), i = i.concat(n.lastScript)), n.txType === "segwit" && (c = i), n.type.startsWith("sh-wsh-") ? s = D.encode([D.encode([0, mt(n.lastScript)])]) : n.type.startsWith("sh-") ? s = D.encode([...D.decode(o), n.lastScript]) : n.type.startsWith("wsh-") || n.txType !== "segwit" && (s = o), !s && !c)
      throw new Error("Unknown error finalizing input");
    s && (r.finalScriptSig = s), c && (r.finalScriptWitness = c), ki(r);
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
    const r = this.global.unsignedTx ? nr.encode(this.global.unsignedTx) : st, n = t.global.unsignedTx ? nr.encode(t.global.unsignedTx) : st;
    if (!dt(r, n))
      throw new Error("Transaction/combine: different unsigned tx");
    this.global = ss(Zs, this.global, t.global, void 0, this.opts.allowUnknown);
    for (let o = 0; o < this.inputs.length; o++)
      this.updateInput(o, t.inputs[o], !0);
    for (let o = 0; o < this.outputs.length; o++)
      this.updateOutput(o, t.outputs[o], !0);
    return this;
  }
  clone() {
    return eo.fromPSBT(this.toPSBT(this.opts.PSBTVersion), this.opts);
  }
}, je = class extends at {
  constructor(t) {
    super(Ai(t));
  }
  static fromPSBT(t, r) {
    return at.fromPSBT(t, Ai(r));
  }
  static fromRaw(t, r) {
    return at.fromRaw(t, Ai(r));
  }
};
je.ARK_TX_OPTS = {
  allowUnknown: !0,
  allowUnknownOutputs: !0,
  allowUnknownInputs: !0
};
function Ai(e) {
  return { ...je.ARK_TX_OPTS, ...e };
}
class ec extends Error {
  idx;
  // Indice of participant
  constructor(t, r) {
    super(r), this.idx = t;
  }
}
const { taggedHash: hf, pointToBytes: Cr } = Ie.utils, Qt = Pe.Point, Y = Qt.Fn, le = Pe.lengths.publicKey, fs = new Uint8Array(le), na = ze(it(33), {
  decode: (e) => pr(e) ? fs : e.toBytes(!0),
  encode: (e) => lr(e, fs) ? Qt.ZERO : Qt.fromBytes(e)
}), ra = Bt(Zu, (e) => (hu("n", e, 1n, Y.ORDER), e)), Sn = bt({ R1: na, R2: na }), pf = bt({ k1: ra, k2: ra, publicKey: it(le) });
function oa(e, ...t) {
}
function Ht(e, ...t) {
  if (!Array.isArray(e))
    throw new Error("expected array");
  e.forEach((r) => Z(r, ...t));
}
function ia(e) {
  if (!Array.isArray(e))
    throw new Error("expected array");
  e.forEach((t, r) => {
    if (typeof t != "boolean")
      throw new Error("expected boolean in xOnly array, got" + t + "(" + r + ")");
  });
}
const So = (e, ...t) => Y.create(Y.fromBytes(hf(e, ...t), !0)), Qn = (e, t) => Ar(e.y) ? t : Y.neg(t);
function rn(e) {
  return Qt.BASE.multiply(e);
}
function pr(e) {
  return e.equals(Qt.ZERO);
}
function To(e) {
  return Ht(e, le), e.sort(mo);
}
function gf(e) {
  Ht(e, le);
  for (let t = 1; t < e.length; t++)
    if (!lr(e[t], e[0]))
      return e[t];
  return fs;
}
function wf(e) {
  return Ht(e, le), hf("KeyAgg list", ...e);
}
function yf(e, t, r) {
  return Z(e, le), Z(t, le), lr(e, t) ? 1n : So("KeyAgg coefficient", r, e);
}
function gr(e, t = [], r = []) {
  if (Ht(e, le), Ht(t, 32), t.length !== r.length)
    throw new Error("The tweaks and isXonly arrays must have the same length");
  const n = gf(e), o = wf(e);
  let i = Qt.ZERO;
  for (let a = 0; a < e.length; a++) {
    let u;
    try {
      u = Qt.fromBytes(e[a]);
    } catch {
      throw new ec(a, "pubkey");
    }
    i = i.add(u.multiply(yf(e[a], n, o)));
  }
  let s = Y.ONE, c = Y.ZERO;
  for (let a = 0; a < t.length; a++) {
    const u = r[a] && !Ar(i.y) ? Y.neg(Y.ONE) : Y.ONE, f = Y.fromBytes(t[a]);
    if (i = i.multiply(u).add(rn(f)), pr(i))
      throw new Error("The result of tweaking cannot be infinity");
    s = Y.mul(u, s), c = Y.add(f, Y.mul(u, c));
  }
  return { aggPublicKey: i, gAcc: s, tweakAcc: c };
}
const sa = (e, t, r, n, o, i) => So("MuSig/nonce", e, new Uint8Array([t.length]), t, new Uint8Array([r.length]), r, o, Tr(i.length, 4), i, new Uint8Array([n]));
function Mh(e, t, r = new Uint8Array(0), n, o = new Uint8Array(0), i = Sr(32)) {
  if (Z(e, le), oa(t, 32), Z(r), ![0, 32].includes(r.length))
    throw new Error("wrong aggPublicKey");
  oa(), Z(o), Z(i, 32);
  const s = Uint8Array.of(0), c = sa(i, e, r, 0, s, o), a = sa(i, e, r, 1, s, o);
  return {
    secret: pf.encode({ k1: c, k2: a, publicKey: e }),
    public: Sn.encode({ R1: rn(c), R2: rn(a) })
  };
}
function zh(e) {
  Ht(e, 66);
  let t = Qt.ZERO, r = Qt.ZERO;
  for (let n = 0; n < e.length; n++) {
    const o = e[n];
    try {
      const { R1: i, R2: s } = Sn.decode(o);
      if (pr(i) || pr(s))
        throw new Error("infinity point");
      t = t.add(i), r = r.add(s);
    } catch {
      throw new ec(n, "pubnonce");
    }
  }
  return Sn.encode({ R1: t, R2: r });
}
class jh {
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
  constructor(t, r, n, o = [], i = []) {
    if (Ht(r, 33), Ht(o, 32), ia(i), Z(n), o.length !== i.length)
      throw new Error("The tweaks and isXonly arrays must have the same length");
    const { aggPublicKey: s, gAcc: c, tweakAcc: a } = gr(r, o, i), { R1: u, R2: f } = Sn.decode(t);
    this.publicKeys = r, this.Q = s, this.gAcc = c, this.tweakAcc = a, this.b = So("MuSig/noncecoef", t, Cr(s), n);
    const d = u.add(f.multiply(this.b));
    this.R = pr(d) ? Qt.BASE : d, this.e = So("BIP0340/challenge", Cr(this.R), Cr(s), n), this.tweaks = o, this.isXonly = i, this.L = wf(r), this.secondKey = gf(r);
  }
  /**
   * Calculates the key aggregation coefficient for a given point.
   * @private
   * @param P The point to calculate the coefficient for.
   * @returns The key aggregation coefficient as a bigint.
   * @throws {Error} If the provided public key is not included in the list of pubkeys.
   */
  getSessionKeyAggCoeff(t) {
    const { publicKeys: r } = this, n = t.toBytes(!0);
    if (!r.some((i) => lr(i, n)))
      throw new Error("The signer's pubkey must be included in the list of pubkeys");
    return yf(n, this.secondKey, this.L);
  }
  partialSigVerifyInternal(t, r, n) {
    const { Q: o, gAcc: i, b: s, R: c, e: a } = this, u = Y.fromBytes(t, !0);
    if (!Y.isValid(u))
      return !1;
    const { R1: f, R2: d } = Sn.decode(r), h = f.add(d.multiply(s)), p = Ar(c.y) ? h : h.negate(), w = Qt.fromBytes(n), y = this.getSessionKeyAggCoeff(w), x = Y.mul(Qn(o, 1n), i), T = rn(u), A = p.add(w.multiply(Y.mul(a, Y.mul(y, x))));
    return T.equals(A);
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
  sign(t, r, n = !1) {
    if (Z(r, 32), typeof n != "boolean")
      throw new Error("expected boolean");
    const { Q: o, gAcc: i, b: s, R: c, e: a } = this, { k1: u, k2: f, publicKey: d } = pf.decode(t);
    if (t.fill(0, 0, 64), !Y.isValid(u))
      throw new Error("wrong k1");
    if (!Y.isValid(f))
      throw new Error("wrong k1");
    const h = Qn(c, u), p = Qn(c, f), w = Y.fromBytes(r);
    if (Y.is0(w))
      throw new Error("wrong d_");
    const y = rn(w), x = y.toBytes(!0);
    if (!lr(x, d))
      throw new Error("Public key does not match nonceGen argument");
    const T = this.getSessionKeyAggCoeff(y), A = Qn(o, 1n), R = Y.mul(A, Y.mul(i, w)), C = Y.add(h, Y.add(Y.mul(s, p), Y.mul(a, Y.mul(T, R)))), $ = Y.toBytes(C);
    if (!n) {
      const V = Sn.encode({
        R1: rn(u),
        R2: rn(f)
      });
      if (!this.partialSigVerifyInternal($, V, x))
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
  partialSigVerify(t, r, n) {
    const { publicKeys: o, tweaks: i, isXonly: s } = this;
    if (Z(t, 32), Ht(r, 66), Ht(o, le), Ht(i, 32), ia(s), We(n), r.length !== o.length)
      throw new Error("The pubNonces and publicKeys arrays must have the same length");
    if (i.length !== s.length)
      throw new Error("The tweaks and isXonly arrays must have the same length");
    if (n >= r.length)
      throw new Error("index outside of pubKeys/pubNonces");
    return this.partialSigVerifyInternal(t, r[n], o[n]);
  }
  /**
   * Aggregates partial signatures from multiple signers into a single final signature.
   * @param partialSigs An array of partial signatures from each signer (Uint8Array).
   * @param sessionCtx The session context containing all necessary information for signing.
   * @returns The final aggregate signature (Uint8Array).
   * @throws {Error} If the input is invalid, such as wrong array sizes, invalid signature.
   */
  partialSigAgg(t) {
    Ht(t, 32);
    const { Q: r, tweakAcc: n, R: o, e: i } = this;
    let s = 0n;
    for (let a = 0; a < t.length; a++) {
      const u = Y.fromBytes(t[a], !0);
      if (!Y.isValid(u))
        throw new ec(a, "psig");
      s = Y.add(s, u);
    }
    const c = Qn(r, 1n);
    return s = Y.add(s, Y.mul(i, Y.mul(c, n))), Zt(Cr(o), Y.toBytes(s));
  }
}
function Gh(e) {
  const t = Mh(e);
  return { secNonce: t.secret, pubNonce: t.public };
}
function qh(e) {
  return zh(e);
}
/*! noble-hashes - MIT License (c) 2022 Paul Miller (paulmillr.com) */
function nc(e) {
  return e instanceof Uint8Array || ArrayBuffer.isView(e) && e.constructor.name === "Uint8Array";
}
function fn(e, t = "") {
  if (!Number.isSafeInteger(e) || e < 0) {
    const r = t && `"${t}" `;
    throw new Error(`${r}expected integer >0, got ${e}`);
  }
}
function nt(e, t, r = "") {
  const n = nc(e), o = e?.length, i = t !== void 0;
  if (!n || i && o !== t) {
    const s = r && `"${r}" `, c = i ? ` of length ${t}` : "", a = n ? `length=${o}` : `type=${typeof e}`;
    throw new Error(s + "expected Uint8Array" + c + ", got " + a);
  }
  return e;
}
function mf(e) {
  if (typeof e != "function" || typeof e.create != "function")
    throw new Error("Hash must wrapped by utils.createHasher");
  fn(e.outputLen), fn(e.blockLen);
}
function vo(e, t = !0) {
  if (e.destroyed)
    throw new Error("Hash instance has been destroyed");
  if (t && e.finished)
    throw new Error("Hash#digest() has already been called");
}
function Yh(e, t) {
  nt(e, void 0, "digestInto() output");
  const r = t.outputLen;
  if (e.length < r)
    throw new Error('"digestInto() output" expected to be of length >=' + r);
}
function ko(...e) {
  for (let t = 0; t < e.length; t++)
    e[t].fill(0);
}
function Bi(e) {
  return new DataView(e.buffer, e.byteOffset, e.byteLength);
}
function oe(e, t) {
  return e << 32 - t | e >>> t;
}
const xf = /* @ts-ignore */ typeof Uint8Array.from([]).toHex == "function" && typeof Uint8Array.fromHex == "function", Zh = /* @__PURE__ */ Array.from({ length: 256 }, (e, t) => t.toString(16).padStart(2, "0"));
function ai(e) {
  if (nt(e), xf)
    return e.toHex();
  let t = "";
  for (let r = 0; r < e.length; r++)
    t += Zh[e[r]];
  return t;
}
const me = { _0: 48, _9: 57, A: 65, F: 70, a: 97, f: 102 };
function ca(e) {
  if (e >= me._0 && e <= me._9)
    return e - me._0;
  if (e >= me.A && e <= me.F)
    return e - (me.A - 10);
  if (e >= me.a && e <= me.f)
    return e - (me.a - 10);
}
function Io(e) {
  if (typeof e != "string")
    throw new Error("hex string expected, got " + typeof e);
  if (xf)
    return Uint8Array.fromHex(e);
  const t = e.length, r = t / 2;
  if (t % 2)
    throw new Error("hex string expected, got unpadded hex of length " + t);
  const n = new Uint8Array(r);
  for (let o = 0, i = 0; o < r; o++, i += 2) {
    const s = ca(e.charCodeAt(i)), c = ca(e.charCodeAt(i + 1));
    if (s === void 0 || c === void 0) {
      const a = e[i] + e[i + 1];
      throw new Error('hex string expected, got non-hex character "' + a + '" at index ' + i);
    }
    n[o] = s * 16 + c;
  }
  return n;
}
function ue(...e) {
  let t = 0;
  for (let n = 0; n < e.length; n++) {
    const o = e[n];
    nt(o), t += o.length;
  }
  const r = new Uint8Array(t);
  for (let n = 0, o = 0; n < e.length; n++) {
    const i = e[n];
    r.set(i, o), o += i.length;
  }
  return r;
}
function Xh(e, t = {}) {
  const r = (o, i) => e(i).update(o).digest(), n = e(void 0);
  return r.outputLen = n.outputLen, r.blockLen = n.blockLen, r.create = (o) => e(o), Object.assign(r, t), Object.freeze(r);
}
function ui(e = 32) {
  const t = typeof globalThis == "object" ? globalThis.crypto : null;
  if (typeof t?.getRandomValues != "function")
    throw new Error("crypto.getRandomValues must be defined");
  return t.getRandomValues(new Uint8Array(e));
}
const Jh = (e) => ({
  oid: Uint8Array.from([6, 9, 96, 134, 72, 1, 101, 3, 4, 2, e])
});
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const rc = /* @__PURE__ */ BigInt(0), ds = /* @__PURE__ */ BigInt(1);
function Ao(e, t = "") {
  if (typeof e != "boolean") {
    const r = t && `"${t}" `;
    throw new Error(r + "expected boolean, got type=" + typeof e);
  }
  return e;
}
function bf(e) {
  if (typeof e == "bigint") {
    if (!no(e))
      throw new Error("positive bigint expected, got " + e);
  } else
    fn(e);
  return e;
}
function Pr(e) {
  const t = bf(e).toString(16);
  return t.length & 1 ? "0" + t : t;
}
function Ef(e) {
  if (typeof e != "string")
    throw new Error("hex string expected, got " + typeof e);
  return e === "" ? rc : BigInt("0x" + e);
}
function Gn(e) {
  return Ef(ai(e));
}
function Sf(e) {
  return Ef(ai(Qh(nt(e)).reverse()));
}
function oc(e, t) {
  fn(t), e = bf(e);
  const r = Io(e.toString(16).padStart(t * 2, "0"));
  if (r.length !== t)
    throw new Error("number too large");
  return r;
}
function Tf(e, t) {
  return oc(e, t).reverse();
}
function Qh(e) {
  return Uint8Array.from(e);
}
function tp(e) {
  return Uint8Array.from(e, (t, r) => {
    const n = t.charCodeAt(0);
    if (t.length !== 1 || n > 127)
      throw new Error(`string contains non-ASCII character "${e[r]}" with code ${n} at position ${r}`);
    return n;
  });
}
const no = (e) => typeof e == "bigint" && rc <= e;
function ep(e, t, r) {
  return no(e) && no(t) && no(r) && t <= e && e < r;
}
function np(e, t, r, n) {
  if (!ep(t, r, n))
    throw new Error("expected valid " + e + ": " + r + " <= n < " + n + ", got " + t);
}
function rp(e) {
  let t;
  for (t = 0; e > rc; e >>= ds, t += 1)
    ;
  return t;
}
const ic = (e) => (ds << BigInt(e)) - ds;
function op(e, t, r) {
  if (fn(e, "hashLen"), fn(t, "qByteLen"), typeof r != "function")
    throw new Error("hmacFn must be a function");
  const n = (x) => new Uint8Array(x), o = Uint8Array.of(), i = Uint8Array.of(0), s = Uint8Array.of(1), c = 1e3;
  let a = n(e), u = n(e), f = 0;
  const d = () => {
    a.fill(1), u.fill(0), f = 0;
  }, h = (...x) => r(u, ue(a, ...x)), p = (x = o) => {
    u = h(i, x), a = h(), x.length !== 0 && (u = h(s, x), a = h());
  }, w = () => {
    if (f++ >= c)
      throw new Error("drbg: tried max amount of iterations");
    let x = 0;
    const T = [];
    for (; x < t; ) {
      a = h();
      const A = a.slice();
      T.push(A), x += a.length;
    }
    return ue(...T);
  };
  return (x, T) => {
    d(), p(x);
    let A;
    for (; !(A = T(w())); )
      p();
    return d(), A;
  };
}
function sc(e, t = {}, r = {}) {
  if (!e || typeof e != "object")
    throw new Error("expected valid options object");
  function n(i, s, c) {
    const a = e[i];
    if (c && a === void 0)
      return;
    const u = typeof a;
    if (u !== s || a === null)
      throw new Error(`param "${i}" is invalid: expected ${s}, got ${u}`);
  }
  const o = (i, s) => Object.entries(i).forEach(([c, a]) => n(c, a, s));
  o(t, !1), o(r, !0);
}
function aa(e) {
  const t = /* @__PURE__ */ new WeakMap();
  return (r, ...n) => {
    const o = t.get(r);
    if (o !== void 0)
      return o;
    const i = e(r, ...n);
    return t.set(r, i), i;
  };
}
/*! noble-secp256k1 - MIT License (c) 2019 Paul Miller (paulmillr.com) */
const vf = {
  p: 0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffefffffc2fn,
  n: 0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141n,
  h: 1n,
  a: 0n,
  b: 7n,
  Gx: 0x79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798n,
  Gy: 0x483ada7726a3c4655da4fbfc0e1108a8fd17b448a68554199c47d08ffb10d4b8n
}, { p: Ve, n: Ge, Gx: ip, Gy: sp, b: kf } = vf, xt = 32, dn = 64, Bo = {
  publicKey: xt + 1,
  publicKeyUncompressed: dn + 1,
  signature: dn,
  seed: xt + xt / 2
}, cp = (...e) => {
  "captureStackTrace" in Error && typeof Error.captureStackTrace == "function" && Error.captureStackTrace(...e);
}, tt = (e = "") => {
  const t = new Error(e);
  throw cp(t, tt), t;
}, ap = (e) => typeof e == "bigint", up = (e) => typeof e == "string", fp = (e) => e instanceof Uint8Array || ArrayBuffer.isView(e) && e.constructor.name === "Uint8Array", Ut = (e, t, r = "") => {
  const n = fp(e), o = e?.length, i = t !== void 0;
  if (!n || i && o !== t) {
    const s = r && `"${r}" `, c = i ? ` of length ${t}` : "", a = n ? `length=${o}` : `type=${typeof e}`;
    tt(s + "expected Uint8Array" + c + ", got " + a);
  }
  return e;
}, qe = (e) => new Uint8Array(e), If = (e, t) => e.toString(16).padStart(t, "0"), Af = (e) => Array.from(Ut(e)).map((t) => If(t, 2)).join(""), xe = { _0: 48, _9: 57, A: 65, F: 70, a: 97, f: 102 }, ua = (e) => {
  if (e >= xe._0 && e <= xe._9)
    return e - xe._0;
  if (e >= xe.A && e <= xe.F)
    return e - (xe.A - 10);
  if (e >= xe.a && e <= xe.f)
    return e - (xe.a - 10);
}, Bf = (e) => {
  const t = "hex invalid";
  if (!up(e))
    return tt(t);
  const r = e.length, n = r / 2;
  if (r % 2)
    return tt(t);
  const o = qe(n);
  for (let i = 0, s = 0; i < n; i++, s += 2) {
    const c = ua(e.charCodeAt(s)), a = ua(e.charCodeAt(s + 1));
    if (c === void 0 || a === void 0)
      return tt(t);
    o[i] = c * 16 + a;
  }
  return o;
}, $f = () => globalThis?.crypto, fa = () => $f()?.subtle ?? tt("crypto.subtle must be defined, consider polyfill"), he = (...e) => {
  const t = qe(e.reduce((n, o) => n + Ut(o).length, 0));
  let r = 0;
  return e.forEach((n) => {
    t.set(n, r), r += n.length;
  }), t;
}, fi = (e = xt) => $f().getRandomValues(qe(e)), wr = BigInt, ln = (e, t, r, n = "bad number: out of range") => ap(e) && t <= e && e < r ? e : tt(n), F = (e, t = Ve) => {
  const r = e % t;
  return r >= 0n ? r : t + r;
}, Ee = (e) => F(e, Ge), Rf = (e, t) => {
  (e === 0n || t <= 0n) && tt("no inverse n=" + e + " mod=" + t);
  let r = F(e, t), n = t, o = 0n, i = 1n;
  for (; r !== 0n; ) {
    const s = n / r, c = n % r, a = o - i * s;
    n = r, r = c, o = i, i = a;
  }
  return n === 1n ? F(o, t) : tt("no inverse");
}, Of = (e) => {
  const t = li[e];
  return typeof t != "function" && tt("hashes." + e + " not set"), t;
}, $i = (e) => e instanceof vt ? e : tt("Point expected"), Uf = (e) => F(F(e * e) * e + kf), da = (e) => ln(e, 0n, Ve), ro = (e) => ln(e, 1n, Ve), ls = (e) => ln(e, 1n, Ge), Nn = (e) => (e & 1n) === 0n, di = (e) => Uint8Array.of(e), dp = (e) => di(Nn(e) ? 2 : 3), Nf = (e) => {
  const t = Uf(ro(e));
  let r = 1n;
  for (let n = t, o = (Ve + 1n) / 4n; o > 0n; o >>= 1n)
    o & 1n && (r = r * n % Ve), n = n * n % Ve;
  return F(r * r) === t ? r : tt("sqrt invalid");
};
class vt {
  static BASE;
  static ZERO;
  X;
  Y;
  Z;
  constructor(t, r, n) {
    this.X = da(t), this.Y = ro(r), this.Z = da(n), Object.freeze(this);
  }
  static CURVE() {
    return vf;
  }
  /** Create 3d xyz point from 2d xy. (0, 0) => (0, 1, 0), not (0, 0, 1) */
  static fromAffine(t) {
    const { x: r, y: n } = t;
    return r === 0n && n === 0n ? Qe : new vt(r, n, 1n);
  }
  /** Convert Uint8Array or hex string to Point. */
  static fromBytes(t) {
    Ut(t);
    const { publicKey: r, publicKeyUncompressed: n } = Bo;
    let o;
    const i = t.length, s = t[0], c = t.subarray(1), a = Cn(c, 0, xt);
    if (i === r && (s === 2 || s === 3)) {
      let u = Nf(a);
      const f = Nn(u);
      Nn(wr(s)) !== f && (u = F(-u)), o = new vt(a, u, 1n);
    }
    return i === n && s === 4 && (o = new vt(a, Cn(c, xt, dn), 1n)), o ? o.assertValidity() : tt("bad point: not on curve");
  }
  static fromHex(t) {
    return vt.fromBytes(Bf(t));
  }
  get x() {
    return this.toAffine().x;
  }
  get y() {
    return this.toAffine().y;
  }
  /** Equality check: compare points P&Q. */
  equals(t) {
    const { X: r, Y: n, Z: o } = this, { X: i, Y: s, Z: c } = $i(t), a = F(r * c), u = F(i * o), f = F(n * c), d = F(s * o);
    return a === u && f === d;
  }
  is0() {
    return this.equals(Qe);
  }
  /** Flip point over y coordinate. */
  negate() {
    return new vt(this.X, F(-this.Y), this.Z);
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
    const { X: r, Y: n, Z: o } = this, { X: i, Y: s, Z: c } = $i(t), a = 0n, u = kf;
    let f = 0n, d = 0n, h = 0n;
    const p = F(u * 3n);
    let w = F(r * i), y = F(n * s), x = F(o * c), T = F(r + n), A = F(i + s);
    T = F(T * A), A = F(w + y), T = F(T - A), A = F(r + o);
    let R = F(i + c);
    return A = F(A * R), R = F(w + x), A = F(A - R), R = F(n + o), f = F(s + c), R = F(R * f), f = F(y + x), R = F(R - f), h = F(a * A), f = F(p * x), h = F(f + h), f = F(y - h), h = F(y + h), d = F(f * h), y = F(w + w), y = F(y + w), x = F(a * x), A = F(p * A), y = F(y + x), x = F(w - x), x = F(a * x), A = F(A + x), w = F(y * A), d = F(d + w), w = F(R * A), f = F(T * f), f = F(f - w), w = F(T * y), h = F(R * h), h = F(h + w), new vt(f, d, h);
  }
  subtract(t) {
    return this.add($i(t).negate());
  }
  /**
   * Point-by-scalar multiplication. Scalar must be in range 1 <= n < CURVE.n.
   * Uses {@link wNAF} for base point.
   * Uses fake point to mitigate side-channel leakage.
   * @param n scalar by which point is multiplied
   * @param safe safe mode guards against timing attacks; unsafe mode is faster
   */
  multiply(t, r = !0) {
    if (!r && t === 0n)
      return Qe;
    if (ls(t), t === 1n)
      return this;
    if (this.equals(Ye))
      return Lp(t).p;
    let n = Qe, o = Ye;
    for (let i = this; t > 0n; i = i.double(), t >>= 1n)
      t & 1n ? n = n.add(i) : r && (o = o.add(i));
    return n;
  }
  multiplyUnsafe(t) {
    return this.multiply(t, !1);
  }
  /** Convert point to 2d xy affine point. (X, Y, Z) ∋ (x=X/Z, y=Y/Z) */
  toAffine() {
    const { X: t, Y: r, Z: n } = this;
    if (this.equals(Qe))
      return { x: 0n, y: 0n };
    if (n === 1n)
      return { x: t, y: r };
    const o = Rf(n, Ve);
    return F(n * o) !== 1n && tt("inverse invalid"), { x: F(t * o), y: F(r * o) };
  }
  /** Checks if the point is valid and on-curve. */
  assertValidity() {
    const { x: t, y: r } = this.toAffine();
    return ro(t), ro(r), F(r * r) === Uf(t) ? this : tt("bad point: not on curve");
  }
  /** Converts point to 33/65-byte Uint8Array. */
  toBytes(t = !0) {
    const { x: r, y: n } = this.assertValidity().toAffine(), o = Lt(r);
    return t ? he(dp(n), o) : he(di(4), o, Lt(n));
  }
  toHex(t) {
    return Af(this.toBytes(t));
  }
}
const Ye = new vt(ip, sp, 1n), Qe = new vt(0n, 1n, 0n);
vt.BASE = Ye;
vt.ZERO = Qe;
const lp = (e, t, r) => Ye.multiply(t, !1).add(e.multiply(r, !1)).assertValidity(), Ze = (e) => wr("0x" + (Af(e) || "0")), Cn = (e, t, r) => Ze(e.subarray(t, r)), hp = 2n ** 256n, Lt = (e) => Bf(If(ln(e, 0n, hp), dn)), Cf = (e) => {
  const t = Ze(Ut(e, xt, "secret key"));
  return ln(t, 1n, Ge, "invalid secret key: outside of range");
}, Pf = (e) => e > Ge >> 1n, pp = (e) => {
  [0, 1, 2, 3].includes(e) || tt("recovery id must be valid and present");
}, gp = (e) => {
  e != null && !la.includes(e) && tt(`Signature format must be one of: ${la.join(", ")}`), e === Lf && tt('Signature format "der" is not supported: switch to noble-curves');
}, wp = (e, t = Pn) => {
  gp(t);
  const r = Bo.signature, n = r + 1;
  let o = `Signature format "${t}" expects Uint8Array with length `;
  t === Pn && e.length !== r && tt(o + r), t === Ro && e.length !== n && tt(o + n);
};
class $o {
  r;
  s;
  recovery;
  constructor(t, r, n) {
    this.r = ls(t), this.s = ls(r), n != null && (this.recovery = n), Object.freeze(this);
  }
  static fromBytes(t, r = Pn) {
    wp(t, r);
    let n;
    r === Ro && (n = t[0], t = t.subarray(1));
    const o = Cn(t, 0, xt), i = Cn(t, xt, dn);
    return new $o(o, i, n);
  }
  addRecoveryBit(t) {
    return new $o(this.r, this.s, t);
  }
  hasHighS() {
    return Pf(this.s);
  }
  toBytes(t = Pn) {
    const { r, s: n, recovery: o } = this, i = he(Lt(r), Lt(n));
    return t === Ro ? (pp(o), he(Uint8Array.of(o), i)) : i;
  }
}
const _f = (e) => {
  const t = e.length * 8 - 256;
  t > 1024 && tt("msg invalid");
  const r = Ze(e);
  return t > 0 ? r >> wr(t) : r;
}, yp = (e) => Ee(_f(Ut(e))), Pn = "compact", Ro = "recovered", Lf = "der", la = [Pn, Ro, Lf], ha = {
  lowS: !0,
  prehash: !0,
  format: Pn,
  extraEntropy: !1
}, pa = "SHA-256", li = {
  hmacSha256Async: async (e, t) => {
    const r = fa(), n = "HMAC", o = await r.importKey("raw", e, { name: n, hash: { name: pa } }, !1, ["sign"]);
    return qe(await r.sign(n, o, t));
  },
  hmacSha256: void 0,
  sha256Async: async (e) => qe(await fa().digest(pa, e)),
  sha256: void 0
}, mp = (e, t, r) => (Ut(e, void 0, "message"), t.prehash ? r ? li.sha256Async(e) : Of("sha256")(e) : e), xp = qe(0), bp = di(0), Ep = di(1), Sp = 1e3, Tp = "drbg: tried max amount of iterations", vp = async (e, t) => {
  let r = qe(xt), n = qe(xt), o = 0;
  const i = () => {
    r.fill(1), n.fill(0);
  }, s = (...f) => li.hmacSha256Async(n, he(r, ...f)), c = async (f = xp) => {
    n = await s(bp, f), r = await s(), f.length !== 0 && (n = await s(Ep, f), r = await s());
  }, a = async () => (o++ >= Sp && tt(Tp), r = await s(), r);
  i(), await c(e);
  let u;
  for (; !(u = t(await a())); )
    await c();
  return i(), u;
}, kp = (e, t, r, n) => {
  let { lowS: o, extraEntropy: i } = r;
  const s = Lt, c = yp(e), a = s(c), u = Cf(t), f = [s(u), a];
  if (i != null && i !== !1) {
    const w = i === !0 ? fi(xt) : i;
    f.push(Ut(w, void 0, "extraEntropy"));
  }
  const d = he(...f), h = c;
  return n(d, (w) => {
    const y = _f(w);
    if (!(1n <= y && y < Ge))
      return;
    const x = Rf(y, Ge), T = Ye.multiply(y).toAffine(), A = Ee(T.x);
    if (A === 0n)
      return;
    const R = Ee(x * Ee(h + A * u));
    if (R === 0n)
      return;
    let C = (T.x === A ? 0 : 2) | Number(T.y & 1n), $ = R;
    return o && Pf(R) && ($ = Ee(-R), C ^= 1), new $o(A, $, C).toBytes(r.format);
  });
}, Ip = (e) => {
  const t = {};
  return Object.keys(ha).forEach((r) => {
    t[r] = e[r] ?? ha[r];
  }), t;
}, Ap = async (e, t, r = {}) => (r = Ip(r), e = await mp(e, r, !0), kp(e, t, r, vp)), Bp = (e = fi(Bo.seed)) => {
  Ut(e), (e.length < Bo.seed || e.length > 1024) && tt("expected 40-1024b");
  const t = F(Ze(e), Ge - 1n);
  return Lt(t + 1n);
}, $p = (e) => (t) => {
  const r = Bp(t);
  return { secretKey: r, publicKey: e(r) };
}, Vf = (e) => Uint8Array.from("BIP0340/" + e, (t) => t.charCodeAt(0)), Df = "aux", Hf = "nonce", Ff = "challenge", hs = (e, ...t) => {
  const r = Of("sha256"), n = r(Vf(e));
  return r(he(n, n, ...t));
}, ps = async (e, ...t) => {
  const r = li.sha256Async, n = await r(Vf(e));
  return await r(he(n, n, ...t));
}, cc = (e) => {
  const t = Cf(e), r = Ye.multiply(t), { x: n, y: o } = r.assertValidity().toAffine(), i = Nn(o) ? t : Ee(-t), s = Lt(n);
  return { d: i, px: s };
}, ac = (e) => Ee(Ze(e)), Kf = (...e) => ac(hs(Ff, ...e)), Wf = async (...e) => ac(await ps(Ff, ...e)), Mf = (e) => cc(e).px, Rp = $p(Mf), zf = (e, t, r) => {
  const { px: n, d: o } = cc(t);
  return { m: Ut(e), px: n, d: o, a: Ut(r, xt) };
}, jf = (e) => {
  const t = ac(e);
  t === 0n && tt("sign failed: k is zero");
  const { px: r, d: n } = cc(Lt(t));
  return { rx: r, k: n };
}, Gf = (e, t, r, n) => he(t, Lt(Ee(e + r * n))), qf = "invalid signature produced", Op = (e, t, r = fi(xt)) => {
  const { m: n, px: o, d: i, a: s } = zf(e, t, r), c = hs(Df, s), a = Lt(i ^ Ze(c)), u = hs(Hf, a, o, n), { rx: f, k: d } = jf(u), h = Kf(f, o, n), p = Gf(d, f, h, i);
  return Zf(p, n, o) || tt(qf), p;
}, Up = async (e, t, r = fi(xt)) => {
  const { m: n, px: o, d: i, a: s } = zf(e, t, r), c = await ps(Df, s), a = Lt(i ^ Ze(c)), u = await ps(Hf, a, o, n), { rx: f, k: d } = jf(u), h = await Wf(f, o, n), p = Gf(d, f, h, i);
  return await Xf(p, n, o) || tt(qf), p;
}, Np = (e, t) => e instanceof Promise ? e.then(t) : t(e), Yf = (e, t, r, n) => {
  const o = Ut(e, dn, "signature"), i = Ut(t, void 0, "message"), s = Ut(r, xt, "publicKey");
  try {
    const c = Ze(s), a = Nf(c), u = Nn(a) ? a : F(-a), f = new vt(c, u, 1n).assertValidity(), d = Lt(f.toAffine().x), h = Cn(o, 0, xt);
    ln(h, 1n, Ve);
    const p = Cn(o, xt, dn);
    ln(p, 1n, Ge);
    const w = he(Lt(h), d, i);
    return Np(n(w), (y) => {
      const { x, y: T } = lp(f, p, Ee(-y)).toAffine();
      return !(!Nn(T) || x !== h);
    });
  } catch {
    return !1;
  }
}, Zf = (e, t, r) => Yf(e, t, r, Kf), Xf = async (e, t, r) => Yf(e, t, r, Wf), Cp = {
  keygen: Rp,
  getPublicKey: Mf,
  sign: Op,
  verify: Zf,
  signAsync: Up,
  verifyAsync: Xf
}, Oo = 8, Pp = 256, Jf = Math.ceil(Pp / Oo) + 1, gs = 2 ** (Oo - 1), _p = () => {
  const e = [];
  let t = Ye, r = t;
  for (let n = 0; n < Jf; n++) {
    r = t, e.push(r);
    for (let o = 1; o < gs; o++)
      r = r.add(t), e.push(r);
    t = r.double();
  }
  return e;
};
let ga;
const wa = (e, t) => {
  const r = t.negate();
  return e ? r : t;
}, Lp = (e) => {
  const t = ga || (ga = _p());
  let r = Qe, n = Ye;
  const o = 2 ** Oo, i = o, s = wr(o - 1), c = wr(Oo);
  for (let a = 0; a < Jf; a++) {
    let u = Number(e & s);
    e >>= c, u > gs && (u -= i, e += 1n);
    const f = a * gs, d = f, h = f + Math.abs(u) - 1, p = a % 2 !== 0, w = u < 0;
    u === 0 ? n = n.add(wa(p, t[d])) : r = r.add(wa(w, t[h]));
  }
  return e !== 0n && tt("invalid wnaf"), { p: r, f: n };
};
function Vp(e, t, r) {
  return e & t ^ ~e & r;
}
function Dp(e, t, r) {
  return e & t ^ e & r ^ t & r;
}
class Hp {
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
  constructor(t, r, n, o) {
    this.blockLen = t, this.outputLen = r, this.padOffset = n, this.isLE = o, this.buffer = new Uint8Array(t), this.view = Bi(this.buffer);
  }
  update(t) {
    vo(this), nt(t);
    const { view: r, buffer: n, blockLen: o } = this, i = t.length;
    for (let s = 0; s < i; ) {
      const c = Math.min(o - this.pos, i - s);
      if (c === o) {
        const a = Bi(t);
        for (; o <= i - s; s += o)
          this.process(a, s);
        continue;
      }
      n.set(t.subarray(s, s + c), this.pos), this.pos += c, s += c, this.pos === o && (this.process(r, 0), this.pos = 0);
    }
    return this.length += t.length, this.roundClean(), this;
  }
  digestInto(t) {
    vo(this), Yh(t, this), this.finished = !0;
    const { buffer: r, view: n, blockLen: o, isLE: i } = this;
    let { pos: s } = this;
    r[s++] = 128, ko(this.buffer.subarray(s)), this.padOffset > o - s && (this.process(n, 0), s = 0);
    for (let d = s; d < o; d++)
      r[d] = 0;
    n.setBigUint64(o - 8, BigInt(this.length * 8), i), this.process(n, 0);
    const c = Bi(t), a = this.outputLen;
    if (a % 4)
      throw new Error("_sha2: outputLen must be aligned to 32bit");
    const u = a / 4, f = this.get();
    if (u > f.length)
      throw new Error("_sha2: outputLen bigger than state");
    for (let d = 0; d < u; d++)
      c.setUint32(4 * d, f[d], i);
  }
  digest() {
    const { buffer: t, outputLen: r } = this;
    this.digestInto(t);
    const n = t.slice(0, r);
    return this.destroy(), n;
  }
  _cloneInto(t) {
    t ||= new this.constructor(), t.set(...this.get());
    const { blockLen: r, buffer: n, length: o, finished: i, destroyed: s, pos: c } = this;
    return t.destroyed = s, t.finished = i, t.length = o, t.pos = c, o % r && t.buffer.set(n), t;
  }
  clone() {
    return this._cloneInto();
  }
}
const Re = /* @__PURE__ */ Uint32Array.from([
  1779033703,
  3144134277,
  1013904242,
  2773480762,
  1359893119,
  2600822924,
  528734635,
  1541459225
]), Fp = /* @__PURE__ */ Uint32Array.from([
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
]), Oe = /* @__PURE__ */ new Uint32Array(64);
class Kp extends Hp {
  constructor(t) {
    super(64, t, 8, !1);
  }
  get() {
    const { A: t, B: r, C: n, D: o, E: i, F: s, G: c, H: a } = this;
    return [t, r, n, o, i, s, c, a];
  }
  // prettier-ignore
  set(t, r, n, o, i, s, c, a) {
    this.A = t | 0, this.B = r | 0, this.C = n | 0, this.D = o | 0, this.E = i | 0, this.F = s | 0, this.G = c | 0, this.H = a | 0;
  }
  process(t, r) {
    for (let d = 0; d < 16; d++, r += 4)
      Oe[d] = t.getUint32(r, !1);
    for (let d = 16; d < 64; d++) {
      const h = Oe[d - 15], p = Oe[d - 2], w = oe(h, 7) ^ oe(h, 18) ^ h >>> 3, y = oe(p, 17) ^ oe(p, 19) ^ p >>> 10;
      Oe[d] = y + Oe[d - 7] + w + Oe[d - 16] | 0;
    }
    let { A: n, B: o, C: i, D: s, E: c, F: a, G: u, H: f } = this;
    for (let d = 0; d < 64; d++) {
      const h = oe(c, 6) ^ oe(c, 11) ^ oe(c, 25), p = f + h + Vp(c, a, u) + Fp[d] + Oe[d] | 0, y = (oe(n, 2) ^ oe(n, 13) ^ oe(n, 22)) + Dp(n, o, i) | 0;
      f = u, u = a, a = c, c = s + p | 0, s = i, i = o, o = n, n = p + y | 0;
    }
    n = n + this.A | 0, o = o + this.B | 0, i = i + this.C | 0, s = s + this.D | 0, c = c + this.E | 0, a = a + this.F | 0, u = u + this.G | 0, f = f + this.H | 0, this.set(n, o, i, s, c, a, u, f);
  }
  roundClean() {
    ko(Oe);
  }
  destroy() {
    this.set(0, 0, 0, 0, 0, 0, 0, 0), ko(this.buffer);
  }
}
class Wp extends Kp {
  // We cannot use array here since array allows indexing by variable
  // which means optimizer/compiler cannot use registers.
  A = Re[0] | 0;
  B = Re[1] | 0;
  C = Re[2] | 0;
  D = Re[3] | 0;
  E = Re[4] | 0;
  F = Re[5] | 0;
  G = Re[6] | 0;
  H = Re[7] | 0;
  constructor() {
    super(32);
  }
}
const ws = /* @__PURE__ */ Xh(
  () => new Wp(),
  /* @__PURE__ */ Jh(1)
);
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const It = /* @__PURE__ */ BigInt(0), Tt = /* @__PURE__ */ BigInt(1), on = /* @__PURE__ */ BigInt(2), Qf = /* @__PURE__ */ BigInt(3), td = /* @__PURE__ */ BigInt(4), ed = /* @__PURE__ */ BigInt(5), Mp = /* @__PURE__ */ BigInt(7), nd = /* @__PURE__ */ BigInt(8), zp = /* @__PURE__ */ BigInt(9), rd = /* @__PURE__ */ BigInt(16);
function qt(e, t) {
  const r = e % t;
  return r >= It ? r : t + r;
}
function Dt(e, t, r) {
  let n = e;
  for (; t-- > It; )
    n *= n, n %= r;
  return n;
}
function ya(e, t) {
  if (e === It)
    throw new Error("invert: expected non-zero number");
  if (t <= It)
    throw new Error("invert: expected positive modulus, got " + t);
  let r = qt(e, t), n = t, o = It, i = Tt;
  for (; r !== It; ) {
    const c = n / r, a = n % r, u = o - i * c;
    n = r, r = a, o = i, i = u;
  }
  if (n !== Tt)
    throw new Error("invert: does not exist");
  return qt(o, t);
}
function uc(e, t, r) {
  if (!e.eql(e.sqr(t), r))
    throw new Error("Cannot find square root");
}
function od(e, t) {
  const r = (e.ORDER + Tt) / td, n = e.pow(t, r);
  return uc(e, n, t), n;
}
function jp(e, t) {
  const r = (e.ORDER - ed) / nd, n = e.mul(t, on), o = e.pow(n, r), i = e.mul(t, o), s = e.mul(e.mul(i, on), o), c = e.mul(i, e.sub(s, e.ONE));
  return uc(e, c, t), c;
}
function Gp(e) {
  const t = hi(e), r = id(e), n = r(t, t.neg(t.ONE)), o = r(t, n), i = r(t, t.neg(n)), s = (e + Mp) / rd;
  return (c, a) => {
    let u = c.pow(a, s), f = c.mul(u, n);
    const d = c.mul(u, o), h = c.mul(u, i), p = c.eql(c.sqr(f), a), w = c.eql(c.sqr(d), a);
    u = c.cmov(u, f, p), f = c.cmov(h, d, w);
    const y = c.eql(c.sqr(f), a), x = c.cmov(u, f, y);
    return uc(c, x, a), x;
  };
}
function id(e) {
  if (e < Qf)
    throw new Error("sqrt is not defined for small field");
  let t = e - Tt, r = 0;
  for (; t % on === It; )
    t /= on, r++;
  let n = on;
  const o = hi(e);
  for (; ma(o, n) === 1; )
    if (n++ > 1e3)
      throw new Error("Cannot find square root: probably non-prime P");
  if (r === 1)
    return od;
  let i = o.pow(n, t);
  const s = (t + Tt) / on;
  return function(a, u) {
    if (a.is0(u))
      return u;
    if (ma(a, u) !== 1)
      throw new Error("Cannot find square root");
    let f = r, d = a.mul(a.ONE, i), h = a.pow(u, t), p = a.pow(u, s);
    for (; !a.eql(h, a.ONE); ) {
      if (a.is0(h))
        return a.ZERO;
      let w = 1, y = a.sqr(h);
      for (; !a.eql(y, a.ONE); )
        if (w++, y = a.sqr(y), w === f)
          throw new Error("Cannot find square root");
      const x = Tt << BigInt(f - w - 1), T = a.pow(d, x);
      f = w, d = a.sqr(T), h = a.mul(h, d), p = a.mul(p, T);
    }
    return p;
  };
}
function qp(e) {
  return e % td === Qf ? od : e % nd === ed ? jp : e % rd === zp ? Gp(e) : id(e);
}
const Yp = [
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
function Zp(e) {
  const t = {
    ORDER: "bigint",
    BYTES: "number",
    BITS: "number"
  }, r = Yp.reduce((n, o) => (n[o] = "function", n), t);
  return sc(e, r), e;
}
function Xp(e, t, r) {
  if (r < It)
    throw new Error("invalid exponent, negatives unsupported");
  if (r === It)
    return e.ONE;
  if (r === Tt)
    return t;
  let n = e.ONE, o = t;
  for (; r > It; )
    r & Tt && (n = e.mul(n, o)), o = e.sqr(o), r >>= Tt;
  return n;
}
function sd(e, t, r = !1) {
  const n = new Array(t.length).fill(r ? e.ZERO : void 0), o = t.reduce((s, c, a) => e.is0(c) ? s : (n[a] = s, e.mul(s, c)), e.ONE), i = e.inv(o);
  return t.reduceRight((s, c, a) => e.is0(c) ? s : (n[a] = e.mul(s, n[a]), e.mul(s, c)), i), n;
}
function ma(e, t) {
  const r = (e.ORDER - Tt) / on, n = e.pow(t, r), o = e.eql(n, e.ONE), i = e.eql(n, e.ZERO), s = e.eql(n, e.neg(e.ONE));
  if (!o && !i && !s)
    throw new Error("invalid Legendre symbol result");
  return o ? 1 : i ? 0 : -1;
}
function Jp(e, t) {
  t !== void 0 && fn(t);
  const r = t !== void 0 ? t : e.toString(2).length, n = Math.ceil(r / 8);
  return { nBitLength: r, nByteLength: n };
}
class Qp {
  ORDER;
  BITS;
  BYTES;
  isLE;
  ZERO = It;
  ONE = Tt;
  _lengths;
  _sqrt;
  // cached sqrt
  _mod;
  constructor(t, r = {}) {
    if (t <= It)
      throw new Error("invalid field: expected ORDER > 0, got " + t);
    let n;
    this.isLE = !1, r != null && typeof r == "object" && (typeof r.BITS == "number" && (n = r.BITS), typeof r.sqrt == "function" && (this.sqrt = r.sqrt), typeof r.isLE == "boolean" && (this.isLE = r.isLE), r.allowedLengths && (this._lengths = r.allowedLengths?.slice()), typeof r.modFromBytes == "boolean" && (this._mod = r.modFromBytes));
    const { nBitLength: o, nByteLength: i } = Jp(t, n);
    if (i > 2048)
      throw new Error("invalid field: expected ORDER of <= 2048 bytes");
    this.ORDER = t, this.BITS = o, this.BYTES = i, this._sqrt = void 0, Object.preventExtensions(this);
  }
  create(t) {
    return qt(t, this.ORDER);
  }
  isValid(t) {
    if (typeof t != "bigint")
      throw new Error("invalid field element: expected bigint, got " + typeof t);
    return It <= t && t < this.ORDER;
  }
  is0(t) {
    return t === It;
  }
  // is valid and invertible
  isValidNot0(t) {
    return !this.is0(t) && this.isValid(t);
  }
  isOdd(t) {
    return (t & Tt) === Tt;
  }
  neg(t) {
    return qt(-t, this.ORDER);
  }
  eql(t, r) {
    return t === r;
  }
  sqr(t) {
    return qt(t * t, this.ORDER);
  }
  add(t, r) {
    return qt(t + r, this.ORDER);
  }
  sub(t, r) {
    return qt(t - r, this.ORDER);
  }
  mul(t, r) {
    return qt(t * r, this.ORDER);
  }
  pow(t, r) {
    return Xp(this, t, r);
  }
  div(t, r) {
    return qt(t * ya(r, this.ORDER), this.ORDER);
  }
  // Same as above, but doesn't normalize
  sqrN(t) {
    return t * t;
  }
  addN(t, r) {
    return t + r;
  }
  subN(t, r) {
    return t - r;
  }
  mulN(t, r) {
    return t * r;
  }
  inv(t) {
    return ya(t, this.ORDER);
  }
  sqrt(t) {
    return this._sqrt || (this._sqrt = qp(this.ORDER)), this._sqrt(this, t);
  }
  toBytes(t) {
    return this.isLE ? Tf(t, this.BYTES) : oc(t, this.BYTES);
  }
  fromBytes(t, r = !1) {
    nt(t);
    const { _lengths: n, BYTES: o, isLE: i, ORDER: s, _mod: c } = this;
    if (n) {
      if (!n.includes(t.length) || t.length > o)
        throw new Error("Field.fromBytes: expected " + n + " bytes, got " + t.length);
      const u = new Uint8Array(o);
      u.set(t, i ? 0 : u.length - t.length), t = u;
    }
    if (t.length !== o)
      throw new Error("Field.fromBytes: expected " + o + " bytes, got " + t.length);
    let a = i ? Sf(t) : Gn(t);
    if (c && (a = qt(a, s)), !r && !this.isValid(a))
      throw new Error("invalid field element: outside of range 0..ORDER");
    return a;
  }
  // TODO: we don't need it here, move out to separate fn
  invertBatch(t) {
    return sd(this, t);
  }
  // We can't move this out because Fp6, Fp12 implement it
  // and it's unclear what to return in there.
  cmov(t, r, n) {
    return n ? r : t;
  }
}
function hi(e, t = {}) {
  return new Qp(e, t);
}
function cd(e) {
  if (typeof e != "bigint")
    throw new Error("field order must be bigint");
  const t = e.toString(2).length;
  return Math.ceil(t / 8);
}
function ad(e) {
  const t = cd(e);
  return t + Math.ceil(t / 2);
}
function ud(e, t, r = !1) {
  nt(e);
  const n = e.length, o = cd(t), i = ad(t);
  if (n < 16 || n < i || n > 1024)
    throw new Error("expected " + i + "-1024 bytes of input, got " + n);
  const s = r ? Sf(e) : Gn(e), c = qt(s, t - Tt) + Tt;
  return r ? Tf(c, o) : oc(c, o);
}
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const _n = /* @__PURE__ */ BigInt(0), sn = /* @__PURE__ */ BigInt(1);
function Uo(e, t) {
  const r = t.negate();
  return e ? r : t;
}
function xa(e, t) {
  const r = sd(e.Fp, t.map((n) => n.Z));
  return t.map((n, o) => e.fromAffine(n.toAffine(r[o])));
}
function fd(e, t) {
  if (!Number.isSafeInteger(e) || e <= 0 || e > t)
    throw new Error("invalid window size, expected [1.." + t + "], got W=" + e);
}
function Ri(e, t) {
  fd(e, t);
  const r = Math.ceil(t / e) + 1, n = 2 ** (e - 1), o = 2 ** e, i = ic(e), s = BigInt(e);
  return { windows: r, windowSize: n, mask: i, maxNumber: o, shiftBy: s };
}
function ba(e, t, r) {
  const { windowSize: n, mask: o, maxNumber: i, shiftBy: s } = r;
  let c = Number(e & o), a = e >> s;
  c > n && (c -= i, a += sn);
  const u = t * n, f = u + Math.abs(c) - 1, d = c === 0, h = c < 0, p = t % 2 !== 0;
  return { nextN: a, offset: f, isZero: d, isNeg: h, isNegF: p, offsetF: u };
}
const Oi = /* @__PURE__ */ new WeakMap(), dd = /* @__PURE__ */ new WeakMap();
function Ui(e) {
  return dd.get(e) || 1;
}
function Ea(e) {
  if (e !== _n)
    throw new Error("invalid wNAF");
}
class tg {
  BASE;
  ZERO;
  Fn;
  bits;
  // Parametrized with a given Point class (not individual point)
  constructor(t, r) {
    this.BASE = t.BASE, this.ZERO = t.ZERO, this.Fn = t.Fn, this.bits = r;
  }
  // non-const time multiplication ladder
  _unsafeLadder(t, r, n = this.ZERO) {
    let o = t;
    for (; r > _n; )
      r & sn && (n = n.add(o)), o = o.double(), r >>= sn;
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
  precomputeWindow(t, r) {
    const { windows: n, windowSize: o } = Ri(r, this.bits), i = [];
    let s = t, c = s;
    for (let a = 0; a < n; a++) {
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
  wNAF(t, r, n) {
    if (!this.Fn.isValid(n))
      throw new Error("invalid scalar");
    let o = this.ZERO, i = this.BASE;
    const s = Ri(t, this.bits);
    for (let c = 0; c < s.windows; c++) {
      const { nextN: a, offset: u, isZero: f, isNeg: d, isNegF: h, offsetF: p } = ba(n, c, s);
      n = a, f ? i = i.add(Uo(h, r[p])) : o = o.add(Uo(d, r[u]));
    }
    return Ea(n), { p: o, f: i };
  }
  /**
   * Implements ec unsafe (non const-time) multiplication using precomputed tables and w-ary non-adjacent form.
   * @param acc accumulator point to add result of multiplication
   * @returns point
   */
  wNAFUnsafe(t, r, n, o = this.ZERO) {
    const i = Ri(t, this.bits);
    for (let s = 0; s < i.windows && n !== _n; s++) {
      const { nextN: c, offset: a, isZero: u, isNeg: f } = ba(n, s, i);
      if (n = c, !u) {
        const d = r[a];
        o = o.add(f ? d.negate() : d);
      }
    }
    return Ea(n), o;
  }
  getPrecomputes(t, r, n) {
    let o = Oi.get(r);
    return o || (o = this.precomputeWindow(r, t), t !== 1 && (typeof n == "function" && (o = n(o)), Oi.set(r, o))), o;
  }
  cached(t, r, n) {
    const o = Ui(t);
    return this.wNAF(o, this.getPrecomputes(o, t, n), r);
  }
  unsafe(t, r, n, o) {
    const i = Ui(t);
    return i === 1 ? this._unsafeLadder(t, r, o) : this.wNAFUnsafe(i, this.getPrecomputes(i, t, n), r, o);
  }
  // We calculate precomputes for elliptic curve point multiplication
  // using windowed method. This specifies window size and
  // stores precomputed values. Usually only base point would be precomputed.
  createCache(t, r) {
    fd(r, this.bits), dd.set(t, r), Oi.delete(t);
  }
  hasCache(t) {
    return Ui(t) !== 1;
  }
}
function eg(e, t, r, n) {
  let o = t, i = e.ZERO, s = e.ZERO;
  for (; r > _n || n > _n; )
    r & sn && (i = i.add(o)), n & sn && (s = s.add(o)), o = o.double(), r >>= sn, n >>= sn;
  return { p1: i, p2: s };
}
function Sa(e, t, r) {
  if (t) {
    if (t.ORDER !== e)
      throw new Error("Field.ORDER must match order: Fp == p, Fn == n");
    return Zp(t), t;
  } else
    return hi(e, { isLE: r });
}
function ng(e, t, r = {}, n) {
  if (n === void 0 && (n = e === "edwards"), !t || typeof t != "object")
    throw new Error(`expected valid ${e} CURVE object`);
  for (const a of ["p", "n", "h"]) {
    const u = t[a];
    if (!(typeof u == "bigint" && u > _n))
      throw new Error(`CURVE.${a} must be positive bigint`);
  }
  const o = Sa(t.p, r.Fp, n), i = Sa(t.n, r.Fn, n), c = ["Gx", "Gy", "a", "b"];
  for (const a of c)
    if (!o.isValid(t[a]))
      throw new Error(`CURVE.${a} must be valid field element of CURVE.Fp`);
  return t = Object.freeze(Object.assign({}, t)), { CURVE: t, Fp: o, Fn: i };
}
function ld(e, t) {
  return function(n) {
    const o = e(n);
    return { secretKey: o, publicKey: t(o) };
  };
}
class hd {
  oHash;
  iHash;
  blockLen;
  outputLen;
  finished = !1;
  destroyed = !1;
  constructor(t, r) {
    if (mf(t), nt(r, void 0, "key"), this.iHash = t.create(), typeof this.iHash.update != "function")
      throw new Error("Expected instance of class which extends utils.Hash");
    this.blockLen = this.iHash.blockLen, this.outputLen = this.iHash.outputLen;
    const n = this.blockLen, o = new Uint8Array(n);
    o.set(r.length > n ? t.create().update(r).digest() : r);
    for (let i = 0; i < o.length; i++)
      o[i] ^= 54;
    this.iHash.update(o), this.oHash = t.create();
    for (let i = 0; i < o.length; i++)
      o[i] ^= 106;
    this.oHash.update(o), ko(o);
  }
  update(t) {
    return vo(this), this.iHash.update(t), this;
  }
  digestInto(t) {
    vo(this), nt(t, this.outputLen, "output"), this.finished = !0, this.iHash.digestInto(t), this.oHash.update(t), this.oHash.digestInto(t), this.destroy();
  }
  digest() {
    const t = new Uint8Array(this.oHash.outputLen);
    return this.digestInto(t), t;
  }
  _cloneInto(t) {
    t ||= Object.create(Object.getPrototypeOf(this), {});
    const { oHash: r, iHash: n, finished: o, destroyed: i, blockLen: s, outputLen: c } = this;
    return t = t, t.finished = o, t.destroyed = i, t.blockLen = s, t.outputLen = c, t.oHash = r._cloneInto(t.oHash), t.iHash = n._cloneInto(t.iHash), t;
  }
  clone() {
    return this._cloneInto();
  }
  destroy() {
    this.destroyed = !0, this.oHash.destroy(), this.iHash.destroy();
  }
}
const pd = (e, t, r) => new hd(e, t).update(r).digest();
pd.create = (e, t) => new hd(e, t);
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const Ta = (e, t) => (e + (e >= 0 ? t : -t) / gd) / t;
function rg(e, t, r) {
  const [[n, o], [i, s]] = t, c = Ta(s * e, r), a = Ta(-o * e, r);
  let u = e - c * n - a * i, f = -c * o - a * s;
  const d = u < Se, h = f < Se;
  d && (u = -u), h && (f = -f);
  const p = ic(Math.ceil(rp(r) / 2)) + Tn;
  if (u < Se || u >= p || f < Se || f >= p)
    throw new Error("splitScalar (endomorphism): failed, k=" + e);
  return { k1neg: d, k1: u, k2neg: h, k2: f };
}
function ys(e) {
  if (!["compact", "recovered", "der"].includes(e))
    throw new Error('Signature format must be "compact", "recovered", or "der"');
  return e;
}
function Ni(e, t) {
  const r = {};
  for (let n of Object.keys(t))
    r[n] = e[n] === void 0 ? t[n] : e[n];
  return Ao(r.lowS, "lowS"), Ao(r.prehash, "prehash"), r.format !== void 0 && ys(r.format), r;
}
class og extends Error {
  constructor(t = "") {
    super(t);
  }
}
const Ne = {
  // asn.1 DER encoding utils
  Err: og,
  // Basic building block is TLV (Tag-Length-Value)
  _tlv: {
    encode: (e, t) => {
      const { Err: r } = Ne;
      if (e < 0 || e > 256)
        throw new r("tlv.encode: wrong tag");
      if (t.length & 1)
        throw new r("tlv.encode: unpadded data");
      const n = t.length / 2, o = Pr(n);
      if (o.length / 2 & 128)
        throw new r("tlv.encode: long form length too big");
      const i = n > 127 ? Pr(o.length / 2 | 128) : "";
      return Pr(e) + i + o + t;
    },
    // v - value, l - left bytes (unparsed)
    decode(e, t) {
      const { Err: r } = Ne;
      let n = 0;
      if (e < 0 || e > 256)
        throw new r("tlv.encode: wrong tag");
      if (t.length < 2 || t[n++] !== e)
        throw new r("tlv.decode: wrong tlv");
      const o = t[n++], i = !!(o & 128);
      let s = 0;
      if (!i)
        s = o;
      else {
        const a = o & 127;
        if (!a)
          throw new r("tlv.decode(long): indefinite length not supported");
        if (a > 4)
          throw new r("tlv.decode(long): byte length is too big");
        const u = t.subarray(n, n + a);
        if (u.length !== a)
          throw new r("tlv.decode: length bytes not complete");
        if (u[0] === 0)
          throw new r("tlv.decode(long): zero leftmost byte");
        for (const f of u)
          s = s << 8 | f;
        if (n += a, s < 128)
          throw new r("tlv.decode(long): not minimal encoding");
      }
      const c = t.subarray(n, n + s);
      if (c.length !== s)
        throw new r("tlv.decode: wrong value length");
      return { v: c, l: t.subarray(n + s) };
    }
  },
  // https://crypto.stackexchange.com/a/57734 Leftmost bit of first byte is 'negative' flag,
  // since we always use positive integers here. It must always be empty:
  // - add zero byte if exists
  // - if next byte doesn't have a flag, leading zero is not allowed (minimal encoding)
  _int: {
    encode(e) {
      const { Err: t } = Ne;
      if (e < Se)
        throw new t("integer: negative integers are not allowed");
      let r = Pr(e);
      if (Number.parseInt(r[0], 16) & 8 && (r = "00" + r), r.length & 1)
        throw new t("unexpected DER parsing assertion: unpadded hex");
      return r;
    },
    decode(e) {
      const { Err: t } = Ne;
      if (e[0] & 128)
        throw new t("invalid signature integer: negative");
      if (e[0] === 0 && !(e[1] & 128))
        throw new t("invalid signature integer: unnecessary leading zero");
      return Gn(e);
    }
  },
  toSig(e) {
    const { Err: t, _int: r, _tlv: n } = Ne, o = nt(e, void 0, "signature"), { v: i, l: s } = n.decode(48, o);
    if (s.length)
      throw new t("invalid signature: left bytes after parsing");
    const { v: c, l: a } = n.decode(2, i), { v: u, l: f } = n.decode(2, a);
    if (f.length)
      throw new t("invalid signature: left bytes after parsing");
    return { r: r.decode(c), s: r.decode(u) };
  },
  hexFromSig(e) {
    const { _tlv: t, _int: r } = Ne, n = t.encode(2, r.encode(e.r)), o = t.encode(2, r.encode(e.s)), i = n + o;
    return t.encode(48, i);
  }
}, Se = BigInt(0), Tn = BigInt(1), gd = BigInt(2), _r = BigInt(3), ig = BigInt(4);
function sg(e, t = {}) {
  const r = ng("weierstrass", e, t), { Fp: n, Fn: o } = r;
  let i = r.CURVE;
  const { h: s, n: c } = i;
  sc(t, {}, {
    allowInfinityPoint: "boolean",
    clearCofactor: "function",
    isTorsionFree: "function",
    fromBytes: "function",
    toBytes: "function",
    endo: "object"
  });
  const { endo: a } = t;
  if (a && (!n.is0(i.a) || typeof a.beta != "bigint" || !Array.isArray(a.basises)))
    throw new Error('invalid endo: expected "beta": bigint and "basises": array');
  const u = yd(n, o);
  function f() {
    if (!n.isOdd)
      throw new Error("compression is not supported: Field does not have .isOdd()");
  }
  function d(S, m, E) {
    const { x: l, y: b } = m.toAffine(), k = n.toBytes(l);
    if (Ao(E, "isCompressed"), E) {
      f();
      const N = !n.isOdd(b);
      return ue(wd(N), k);
    } else
      return ue(Uint8Array.of(4), k, n.toBytes(b));
  }
  function h(S) {
    nt(S, void 0, "Point");
    const { publicKey: m, publicKeyUncompressed: E } = u, l = S.length, b = S[0], k = S.subarray(1);
    if (l === m && (b === 2 || b === 3)) {
      const N = n.fromBytes(k);
      if (!n.isValid(N))
        throw new Error("bad point: is not on curve, wrong x");
      const O = y(N);
      let U;
      try {
        U = n.sqrt(O);
      } catch (M) {
        const H = M instanceof Error ? ": " + M.message : "";
        throw new Error("bad point: is not on curve, sqrt error" + H);
      }
      f();
      const B = n.isOdd(U);
      return (b & 1) === 1 !== B && (U = n.neg(U)), { x: N, y: U };
    } else if (l === E && b === 4) {
      const N = n.BYTES, O = n.fromBytes(k.subarray(0, N)), U = n.fromBytes(k.subarray(N, N * 2));
      if (!x(O, U))
        throw new Error("bad point: is not on curve");
      return { x: O, y: U };
    } else
      throw new Error(`bad point: got length ${l}, expected compressed=${m} or uncompressed=${E}`);
  }
  const p = t.toBytes || d, w = t.fromBytes || h;
  function y(S) {
    const m = n.sqr(S), E = n.mul(m, S);
    return n.add(n.add(E, n.mul(S, i.a)), i.b);
  }
  function x(S, m) {
    const E = n.sqr(m), l = y(S);
    return n.eql(E, l);
  }
  if (!x(i.Gx, i.Gy))
    throw new Error("bad curve params: generator point");
  const T = n.mul(n.pow(i.a, _r), ig), A = n.mul(n.sqr(i.b), BigInt(27));
  if (n.is0(n.add(T, A)))
    throw new Error("bad curve params: a or b");
  function R(S, m, E = !1) {
    if (!n.isValid(m) || E && n.is0(m))
      throw new Error(`bad point coordinate ${S}`);
    return m;
  }
  function C(S) {
    if (!(S instanceof _))
      throw new Error("Weierstrass Point expected");
  }
  function $(S) {
    if (!a || !a.basises)
      throw new Error("no endo");
    return rg(S, a.basises, o.ORDER);
  }
  const V = aa((S, m) => {
    const { X: E, Y: l, Z: b } = S;
    if (n.eql(b, n.ONE))
      return { x: E, y: l };
    const k = S.is0();
    m == null && (m = k ? n.ONE : n.inv(b));
    const N = n.mul(E, m), O = n.mul(l, m), U = n.mul(b, m);
    if (k)
      return { x: n.ZERO, y: n.ZERO };
    if (!n.eql(U, n.ONE))
      throw new Error("invZ was invalid");
    return { x: N, y: O };
  }), g = aa((S) => {
    if (S.is0()) {
      if (t.allowInfinityPoint && !n.is0(S.Y))
        return;
      throw new Error("bad point: ZERO");
    }
    const { x: m, y: E } = S.toAffine();
    if (!n.isValid(m) || !n.isValid(E))
      throw new Error("bad point: x or y not field elements");
    if (!x(m, E))
      throw new Error("bad point: equation left != right");
    if (!S.isTorsionFree())
      throw new Error("bad point: not in prime-order subgroup");
    return !0;
  });
  function K(S, m, E, l, b) {
    return E = new _(n.mul(E.X, S), E.Y, E.Z), m = Uo(l, m), E = Uo(b, E), m.add(E);
  }
  class _ {
    // base / generator point
    static BASE = new _(i.Gx, i.Gy, n.ONE);
    // zero / infinity / identity point
    static ZERO = new _(n.ZERO, n.ONE, n.ZERO);
    // 0, 1, 0
    // math field
    static Fp = n;
    // scalar field
    static Fn = o;
    X;
    Y;
    Z;
    /** Does NOT validate if the point is valid. Use `.assertValidity()`. */
    constructor(m, E, l) {
      this.X = R("x", m), this.Y = R("y", E, !0), this.Z = R("z", l), Object.freeze(this);
    }
    static CURVE() {
      return i;
    }
    /** Does NOT validate if the point is valid. Use `.assertValidity()`. */
    static fromAffine(m) {
      const { x: E, y: l } = m || {};
      if (!m || !n.isValid(E) || !n.isValid(l))
        throw new Error("invalid affine point");
      if (m instanceof _)
        throw new Error("projective point not allowed");
      return n.is0(E) && n.is0(l) ? _.ZERO : new _(E, l, n.ONE);
    }
    static fromBytes(m) {
      const E = _.fromAffine(w(nt(m, void 0, "point")));
      return E.assertValidity(), E;
    }
    static fromHex(m) {
      return _.fromBytes(Io(m));
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
    precompute(m = 8, E = !0) {
      return I.createCache(this, m), E || this.multiply(_r), this;
    }
    // TODO: return `this`
    /** A point on curve is valid if it conforms to equation. */
    assertValidity() {
      g(this);
    }
    hasEvenY() {
      const { y: m } = this.toAffine();
      if (!n.isOdd)
        throw new Error("Field doesn't support isOdd");
      return !n.isOdd(m);
    }
    /** Compare one point to another. */
    equals(m) {
      C(m);
      const { X: E, Y: l, Z: b } = this, { X: k, Y: N, Z: O } = m, U = n.eql(n.mul(E, O), n.mul(k, b)), B = n.eql(n.mul(l, O), n.mul(N, b));
      return U && B;
    }
    /** Flips point to one corresponding to (x, -y) in Affine coordinates. */
    negate() {
      return new _(this.X, n.neg(this.Y), this.Z);
    }
    // Renes-Costello-Batina exception-free doubling formula.
    // There is 30% faster Jacobian formula, but it is not complete.
    // https://eprint.iacr.org/2015/1060, algorithm 3
    // Cost: 8M + 3S + 3*a + 2*b3 + 15add.
    double() {
      const { a: m, b: E } = i, l = n.mul(E, _r), { X: b, Y: k, Z: N } = this;
      let O = n.ZERO, U = n.ZERO, B = n.ZERO, P = n.mul(b, b), M = n.mul(k, k), H = n.mul(N, N), L = n.mul(b, k);
      return L = n.add(L, L), B = n.mul(b, N), B = n.add(B, B), O = n.mul(m, B), U = n.mul(l, H), U = n.add(O, U), O = n.sub(M, U), U = n.add(M, U), U = n.mul(O, U), O = n.mul(L, O), B = n.mul(l, B), H = n.mul(m, H), L = n.sub(P, H), L = n.mul(m, L), L = n.add(L, B), B = n.add(P, P), P = n.add(B, P), P = n.add(P, H), P = n.mul(P, L), U = n.add(U, P), H = n.mul(k, N), H = n.add(H, H), P = n.mul(H, L), O = n.sub(O, P), B = n.mul(H, M), B = n.add(B, B), B = n.add(B, B), new _(O, U, B);
    }
    // Renes-Costello-Batina exception-free addition formula.
    // There is 30% faster Jacobian formula, but it is not complete.
    // https://eprint.iacr.org/2015/1060, algorithm 1
    // Cost: 12M + 0S + 3*a + 3*b3 + 23add.
    add(m) {
      C(m);
      const { X: E, Y: l, Z: b } = this, { X: k, Y: N, Z: O } = m;
      let U = n.ZERO, B = n.ZERO, P = n.ZERO;
      const M = i.a, H = n.mul(i.b, _r);
      let L = n.mul(E, k), W = n.mul(l, N), G = n.mul(b, O), ot = n.add(E, l), j = n.add(k, N);
      ot = n.mul(ot, j), j = n.add(L, W), ot = n.sub(ot, j), j = n.add(E, b);
      let J = n.add(k, O);
      return j = n.mul(j, J), J = n.add(L, G), j = n.sub(j, J), J = n.add(l, b), U = n.add(N, O), J = n.mul(J, U), U = n.add(W, G), J = n.sub(J, U), P = n.mul(M, j), U = n.mul(H, G), P = n.add(U, P), U = n.sub(W, P), P = n.add(W, P), B = n.mul(U, P), W = n.add(L, L), W = n.add(W, L), G = n.mul(M, G), j = n.mul(H, j), W = n.add(W, G), G = n.sub(L, G), G = n.mul(M, G), j = n.add(j, G), L = n.mul(W, j), B = n.add(B, L), L = n.mul(J, j), U = n.mul(ot, U), U = n.sub(U, L), L = n.mul(ot, W), P = n.mul(J, P), P = n.add(P, L), new _(U, B, P);
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
      const { endo: E } = t;
      if (!o.isValidNot0(m))
        throw new Error("invalid scalar: out of range");
      let l, b;
      const k = (N) => I.cached(this, N, (O) => xa(_, O));
      if (E) {
        const { k1neg: N, k1: O, k2neg: U, k2: B } = $(m), { p: P, f: M } = k(O), { p: H, f: L } = k(B);
        b = M.add(L), l = K(E.beta, P, H, N, U);
      } else {
        const { p: N, f: O } = k(m);
        l = N, b = O;
      }
      return xa(_, [l, b])[0];
    }
    /**
     * Non-constant-time multiplication. Uses double-and-add algorithm.
     * It's faster, but should only be used when you don't care about
     * an exposed secret key e.g. sig verification, which works over *public* keys.
     */
    multiplyUnsafe(m) {
      const { endo: E } = t, l = this;
      if (!o.isValid(m))
        throw new Error("invalid scalar: out of range");
      if (m === Se || l.is0())
        return _.ZERO;
      if (m === Tn)
        return l;
      if (I.hasCache(this))
        return this.multiply(m);
      if (E) {
        const { k1neg: b, k1: k, k2neg: N, k2: O } = $(m), { p1: U, p2: B } = eg(_, l, k, O);
        return K(E.beta, U, B, b, N);
      } else
        return I.unsafe(l, m);
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
      return s === Tn ? !0 : m ? m(_, this) : I.unsafe(this, c).is0();
    }
    clearCofactor() {
      const { clearCofactor: m } = t;
      return s === Tn ? this : m ? m(_, this) : this.multiplyUnsafe(s);
    }
    isSmallOrder() {
      return this.multiplyUnsafe(s).is0();
    }
    toBytes(m = !0) {
      return Ao(m, "isCompressed"), this.assertValidity(), p(_, this, m);
    }
    toHex(m = !0) {
      return ai(this.toBytes(m));
    }
    toString() {
      return `<Point ${this.is0() ? "ZERO" : this.toHex()}>`;
    }
  }
  const z = o.BITS, I = new tg(_, t.endo ? Math.ceil(z / 2) : z);
  return _.BASE.precompute(8), _;
}
function wd(e) {
  return Uint8Array.of(e ? 2 : 3);
}
function yd(e, t) {
  return {
    secretKey: t.BYTES,
    publicKey: 1 + e.BYTES,
    publicKeyUncompressed: 1 + 2 * e.BYTES,
    publicKeyHasPrefix: !0,
    signature: 2 * t.BYTES
  };
}
function cg(e, t = {}) {
  const { Fn: r } = e, n = t.randomBytes || ui, o = Object.assign(yd(e.Fp, r), { seed: ad(r.ORDER) });
  function i(p) {
    try {
      const w = r.fromBytes(p);
      return r.isValidNot0(w);
    } catch {
      return !1;
    }
  }
  function s(p, w) {
    const { publicKey: y, publicKeyUncompressed: x } = o;
    try {
      const T = p.length;
      return w === !0 && T !== y || w === !1 && T !== x ? !1 : !!e.fromBytes(p);
    } catch {
      return !1;
    }
  }
  function c(p = n(o.seed)) {
    return ud(nt(p, o.seed, "seed"), r.ORDER);
  }
  function a(p, w = !0) {
    return e.BASE.multiply(r.fromBytes(p)).toBytes(w);
  }
  function u(p) {
    const { secretKey: w, publicKey: y, publicKeyUncompressed: x } = o;
    if (!nc(p) || "_lengths" in r && r._lengths || w === y)
      return;
    const T = nt(p, void 0, "key").length;
    return T === y || T === x;
  }
  function f(p, w, y = !0) {
    if (u(p) === !0)
      throw new Error("first arg must be private key");
    if (u(w) === !1)
      throw new Error("second arg must be public key");
    const x = r.fromBytes(p);
    return e.fromBytes(w).multiply(x).toBytes(y);
  }
  const d = {
    isValidSecretKey: i,
    isValidPublicKey: s,
    randomSecretKey: c
  }, h = ld(c, a);
  return Object.freeze({ getPublicKey: a, getSharedSecret: f, keygen: h, Point: e, utils: d, lengths: o });
}
function ag(e, t, r = {}) {
  mf(t), sc(r, {}, {
    hmac: "function",
    lowS: "boolean",
    randomBytes: "function",
    bits2int: "function",
    bits2int_modN: "function"
  }), r = Object.assign({}, r);
  const n = r.randomBytes || ui, o = r.hmac || ((E, l) => pd(t, E, l)), { Fp: i, Fn: s } = e, { ORDER: c, BITS: a } = s, { keygen: u, getPublicKey: f, getSharedSecret: d, utils: h, lengths: p } = cg(e, r), w = {
    prehash: !0,
    lowS: typeof r.lowS == "boolean" ? r.lowS : !0,
    format: "compact",
    extraEntropy: !1
  }, y = c * gd < i.ORDER;
  function x(E) {
    const l = c >> Tn;
    return E > l;
  }
  function T(E, l) {
    if (!s.isValidNot0(l))
      throw new Error(`invalid signature ${E}: out of range 1..Point.Fn.ORDER`);
    return l;
  }
  function A() {
    if (y)
      throw new Error('"recovered" sig type is not supported for cofactor >2 curves');
  }
  function R(E, l) {
    ys(l);
    const b = p.signature, k = l === "compact" ? b : l === "recovered" ? b + 1 : void 0;
    return nt(E, k);
  }
  class C {
    r;
    s;
    recovery;
    constructor(l, b, k) {
      if (this.r = T("r", l), this.s = T("s", b), k != null) {
        if (A(), ![0, 1, 2, 3].includes(k))
          throw new Error("invalid recovery id");
        this.recovery = k;
      }
      Object.freeze(this);
    }
    static fromBytes(l, b = w.format) {
      R(l, b);
      let k;
      if (b === "der") {
        const { r: B, s: P } = Ne.toSig(nt(l));
        return new C(B, P);
      }
      b === "recovered" && (k = l[0], b = "compact", l = l.subarray(1));
      const N = p.signature / 2, O = l.subarray(0, N), U = l.subarray(N, N * 2);
      return new C(s.fromBytes(O), s.fromBytes(U), k);
    }
    static fromHex(l, b) {
      return this.fromBytes(Io(l), b);
    }
    assertRecovery() {
      const { recovery: l } = this;
      if (l == null)
        throw new Error("invalid recovery id: must be present");
      return l;
    }
    addRecoveryBit(l) {
      return new C(this.r, this.s, l);
    }
    recoverPublicKey(l) {
      const { r: b, s: k } = this, N = this.assertRecovery(), O = N === 2 || N === 3 ? b + c : b;
      if (!i.isValid(O))
        throw new Error("invalid recovery id: sig.r+curve.n != R.x");
      const U = i.toBytes(O), B = e.fromBytes(ue(wd((N & 1) === 0), U)), P = s.inv(O), M = V(nt(l, void 0, "msgHash")), H = s.create(-M * P), L = s.create(k * P), W = e.BASE.multiplyUnsafe(H).add(B.multiplyUnsafe(L));
      if (W.is0())
        throw new Error("invalid recovery: point at infinify");
      return W.assertValidity(), W;
    }
    // Signatures should be low-s, to prevent malleability.
    hasHighS() {
      return x(this.s);
    }
    toBytes(l = w.format) {
      if (ys(l), l === "der")
        return Io(Ne.hexFromSig(this));
      const { r: b, s: k } = this, N = s.toBytes(b), O = s.toBytes(k);
      return l === "recovered" ? (A(), ue(Uint8Array.of(this.assertRecovery()), N, O)) : ue(N, O);
    }
    toHex(l) {
      return ai(this.toBytes(l));
    }
  }
  const $ = r.bits2int || function(l) {
    if (l.length > 8192)
      throw new Error("input is too large");
    const b = Gn(l), k = l.length * 8 - a;
    return k > 0 ? b >> BigInt(k) : b;
  }, V = r.bits2int_modN || function(l) {
    return s.create($(l));
  }, g = ic(a);
  function K(E) {
    return np("num < 2^" + a, E, Se, g), s.toBytes(E);
  }
  function _(E, l) {
    return nt(E, void 0, "message"), l ? nt(t(E), void 0, "prehashed message") : E;
  }
  function z(E, l, b) {
    const { lowS: k, prehash: N, extraEntropy: O } = Ni(b, w);
    E = _(E, N);
    const U = V(E), B = s.fromBytes(l);
    if (!s.isValidNot0(B))
      throw new Error("invalid private key");
    const P = [K(B), K(U)];
    if (O != null && O !== !1) {
      const W = O === !0 ? n(p.secretKey) : O;
      P.push(nt(W, void 0, "extraEntropy"));
    }
    const M = ue(...P), H = U;
    function L(W) {
      const G = $(W);
      if (!s.isValidNot0(G))
        return;
      const ot = s.inv(G), j = e.BASE.multiply(G).toAffine(), J = s.create(j.x);
      if (J === Se)
        return;
      const we = s.create(ot * s.create(H + J * B));
      if (we === Se)
        return;
      let qn = (j.x === J ? 0 : 2) | Number(j.y & Tn), Yn = we;
      return k && x(we) && (Yn = s.neg(we), qn ^= 1), new C(J, Yn, y ? void 0 : qn);
    }
    return { seed: M, k2sig: L };
  }
  function I(E, l, b = {}) {
    const { seed: k, k2sig: N } = z(E, l, b);
    return op(t.outputLen, s.BYTES, o)(k, N).toBytes(b.format);
  }
  function S(E, l, b, k = {}) {
    const { lowS: N, prehash: O, format: U } = Ni(k, w);
    if (b = nt(b, void 0, "publicKey"), l = _(l, O), !nc(E)) {
      const B = E instanceof C ? ", use sig.toBytes()" : "";
      throw new Error("verify expects Uint8Array signature" + B);
    }
    R(E, U);
    try {
      const B = C.fromBytes(E, U), P = e.fromBytes(b);
      if (N && B.hasHighS())
        return !1;
      const { r: M, s: H } = B, L = V(l), W = s.inv(H), G = s.create(L * W), ot = s.create(M * W), j = e.BASE.multiplyUnsafe(G).add(P.multiplyUnsafe(ot));
      return j.is0() ? !1 : s.create(j.x) === M;
    } catch {
      return !1;
    }
  }
  function m(E, l, b = {}) {
    const { prehash: k } = Ni(b, w);
    return l = _(l, k), C.fromBytes(E, "recovered").recoverPublicKey(l).toBytes();
  }
  return Object.freeze({
    keygen: u,
    getPublicKey: f,
    getSharedSecret: d,
    utils: h,
    lengths: p,
    Point: e,
    sign: I,
    verify: S,
    recoverPublicKey: m,
    Signature: C,
    hash: t
  });
}
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const pi = {
  p: BigInt("0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffefffffc2f"),
  n: BigInt("0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141"),
  h: BigInt(1),
  a: BigInt(0),
  b: BigInt(7),
  Gx: BigInt("0x79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798"),
  Gy: BigInt("0x483ada7726a3c4655da4fbfc0e1108a8fd17b448a68554199c47d08ffb10d4b8")
}, ug = {
  beta: BigInt("0x7ae96a2b657c07106e64479eac3434e99cf0497512f58995c1396c28719501ee"),
  basises: [
    [BigInt("0x3086d221a7d46bcde86c90e49284eb15"), -BigInt("0xe4437ed6010e88286f547fa90abfe4c3")],
    [BigInt("0x114ca50f7a8e2f3f657c1108d9d44cfd8"), BigInt("0x3086d221a7d46bcde86c90e49284eb15")]
  ]
}, fg = /* @__PURE__ */ BigInt(0), ms = /* @__PURE__ */ BigInt(2);
function dg(e) {
  const t = pi.p, r = BigInt(3), n = BigInt(6), o = BigInt(11), i = BigInt(22), s = BigInt(23), c = BigInt(44), a = BigInt(88), u = e * e * e % t, f = u * u * e % t, d = Dt(f, r, t) * f % t, h = Dt(d, r, t) * f % t, p = Dt(h, ms, t) * u % t, w = Dt(p, o, t) * p % t, y = Dt(w, i, t) * w % t, x = Dt(y, c, t) * y % t, T = Dt(x, a, t) * x % t, A = Dt(T, c, t) * y % t, R = Dt(A, r, t) * f % t, C = Dt(R, s, t) * w % t, $ = Dt(C, n, t) * u % t, V = Dt($, ms, t);
  if (!No.eql(No.sqr(V), e))
    throw new Error("Cannot find square root");
  return V;
}
const No = hi(pi.p, { sqrt: dg }), pn = /* @__PURE__ */ sg(pi, {
  Fp: No,
  endo: ug
}), va = /* @__PURE__ */ ag(pn, ws), ka = {};
function Co(e, ...t) {
  let r = ka[e];
  if (r === void 0) {
    const n = ws(tp(e));
    r = ue(n, n), ka[e] = r;
  }
  return ws(ue(r, ...t));
}
const fc = (e) => e.toBytes(!0).slice(1), dc = (e) => e % ms === fg;
function xs(e) {
  const { Fn: t, BASE: r } = pn, n = t.fromBytes(e), o = r.multiply(n);
  return { scalar: dc(o.y) ? n : t.neg(n), bytes: fc(o) };
}
function md(e) {
  const t = No;
  if (!t.isValidNot0(e))
    throw new Error("invalid x: Fail if x ≥ p");
  const r = t.create(e * e), n = t.create(r * e + BigInt(7));
  let o = t.sqrt(n);
  dc(o) || (o = t.neg(o));
  const i = pn.fromAffine({ x: e, y: o });
  return i.assertValidity(), i;
}
const cr = Gn;
function xd(...e) {
  return pn.Fn.create(cr(Co("BIP0340/challenge", ...e)));
}
function Ia(e) {
  return xs(e).bytes;
}
function lg(e, t, r = ui(32)) {
  const { Fn: n } = pn, o = nt(e, void 0, "message"), { bytes: i, scalar: s } = xs(t), c = nt(r, 32, "auxRand"), a = n.toBytes(s ^ cr(Co("BIP0340/aux", c))), u = Co("BIP0340/nonce", a, i, o), { bytes: f, scalar: d } = xs(u), h = xd(f, i, o), p = new Uint8Array(64);
  if (p.set(f, 0), p.set(n.toBytes(n.create(d + h * s)), 32), !bd(p, o, i))
    throw new Error("sign: Invalid signature produced");
  return p;
}
function bd(e, t, r) {
  const { Fp: n, Fn: o, BASE: i } = pn, s = nt(e, 64, "signature"), c = nt(t, void 0, "message"), a = nt(r, 32, "publicKey");
  try {
    const u = md(cr(a)), f = cr(s.subarray(0, 32));
    if (!n.isValidNot0(f))
      return !1;
    const d = cr(s.subarray(32, 64));
    if (!o.isValidNot0(d))
      return !1;
    const h = xd(o.toBytes(f), fc(u), c), p = i.multiplyUnsafe(d).add(u.multiplyUnsafe(o.neg(h))), { x: w, y } = p.toAffine();
    return !(p.is0() || !dc(y) || w !== f);
  } catch {
    return !1;
  }
}
const Br = /* @__PURE__ */ (() => {
  const r = (n = ui(48)) => ud(n, pi.n);
  return {
    keygen: ld(r, Ia),
    getPublicKey: Ia,
    sign: lg,
    verify: bd,
    Point: pn,
    utils: {
      randomSecretKey: r,
      taggedHash: Co,
      lift_x: md,
      pointToBytes: fc
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
function lc(e, t, r = {}) {
  e = To(e);
  const { aggPublicKey: n } = gr(e);
  if (!r.taprootTweak)
    return {
      preTweakedKey: n.toBytes(!0),
      finalKey: n.toBytes(!0)
    };
  const o = Br.utils.taggedHash("TapTweak", n.toBytes(!0).subarray(1), r.taprootTweak ?? new Uint8Array(0)), { aggPublicKey: i } = gr(e, [o], [!0]);
  return {
    preTweakedKey: n.toBytes(!0),
    finalKey: i.toBytes(!0)
  };
}
class Lr extends Error {
  constructor(t) {
    super(t), this.name = "PartialSignatureError";
  }
}
class hc {
  constructor(t, r) {
    if (this.s = t, this.R = r, t.length !== 32)
      throw new Lr("Invalid s length");
    if (r.length !== 33)
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
    if (Gn(t) >= vt.CURVE().n)
      throw new Lr("s value overflows curve order");
    const n = new Uint8Array(33);
    return new hc(t, n);
  }
}
function hg(e, t, r, n, o, i) {
  let s;
  if (i?.taprootTweak !== void 0) {
    const { preTweakedKey: u } = lc(To(n));
    s = Br.utils.taggedHash("TapTweak", u.subarray(1), i.taprootTweak);
  }
  const a = new jh(r, To(n), o, s ? [s] : void 0, s ? [!0] : void 0).sign(e, t);
  return hc.decode(a);
}
var Ci, Aa;
function pg() {
  if (Aa) return Ci;
  Aa = 1;
  const e = 4294967295, t = 1 << 31, r = 9, n = 65535, o = 1 << 22, i = n, s = 1 << r, c = n << r;
  function a(f) {
    return f & t ? {} : f & o ? {
      seconds: (f & n) << r
    } : {
      blocks: f & n
    };
  }
  function u({ blocks: f, seconds: d }) {
    if (f !== void 0 && d !== void 0) throw new TypeError("Cannot encode blocks AND seconds");
    if (f === void 0 && d === void 0) return e;
    if (d !== void 0) {
      if (!Number.isFinite(d)) throw new TypeError("Expected Number seconds");
      if (d > c) throw new TypeError("Expected Number seconds <= " + c);
      if (d % s !== 0) throw new TypeError("Expected Number seconds as a multiple of " + s);
      return o | d >> r;
    }
    if (!Number.isFinite(f)) throw new TypeError("Expected Number blocks");
    if (f > n) throw new TypeError("Expected Number blocks <= " + i);
    return f;
  }
  return Ci = { decode: a, encode: u }, Ci;
}
var Ln = pg(), Nt;
(function(e) {
  e.VtxoTaprootTree = "taptree", e.VtxoTreeExpiry = "expiry", e.Cosigner = "cosigner", e.ConditionWitness = "condition";
})(Nt || (Nt = {}));
const pc = 222;
function gg(e, t, r, n) {
  e.updateInput(t, {
    unknown: [
      ...e.getInput(t)?.unknown ?? [],
      r.encode(n)
    ]
  });
}
function bs(e, t, r) {
  const n = e.getInput(t)?.unknown ?? [], o = [];
  for (const i of n) {
    const s = r.decode(i);
    s && o.push(s);
  }
  return o;
}
const Ed = {
  key: Nt.VtxoTaprootTree,
  encode: (e) => [
    {
      type: pc,
      key: gi[Nt.VtxoTaprootTree]
    },
    e
  ],
  decode: (e) => gc(() => wc(e[0], Nt.VtxoTaprootTree) ? e[1] : null)
}, wg = {
  key: Nt.ConditionWitness,
  encode: (e) => [
    {
      type: pc,
      key: gi[Nt.ConditionWitness]
    },
    an.encode(e)
  ],
  decode: (e) => gc(() => wc(e[0], Nt.ConditionWitness) ? an.decode(e[1]) : null)
}, Es = {
  key: Nt.Cosigner,
  encode: (e) => [
    {
      type: pc,
      key: new Uint8Array([
        ...gi[Nt.Cosigner],
        e.index
      ])
    },
    e.key
  ],
  decode: (e) => gc(() => wc(e[0], Nt.Cosigner) ? {
    index: e[0].key[e[0].key.length - 1],
    key: e[1]
  } : null)
};
Nt.VtxoTreeExpiry;
const gi = Object.fromEntries(Object.values(Nt).map((e) => [
  e,
  new TextEncoder().encode(e)
])), gc = (e) => {
  try {
    return e();
  } catch {
    return null;
  }
};
function wc(e, t) {
  const r = v.encode(gi[t]);
  return v.encode(new Uint8Array([e.type, ...e.key])).includes(r);
}
const Vr = new Error("missing vtxo graph");
class yr {
  constructor(t) {
    this.secretKey = t, this.myNonces = null, this.aggregateNonces = null, this.graph = null, this.scriptRoot = null, this.rootSharedOutputAmount = null;
  }
  static random() {
    const t = ns();
    return new yr(t);
  }
  async init(t, r, n) {
    this.graph = t, this.scriptRoot = r, this.rootSharedOutputAmount = n;
  }
  async getPublicKey() {
    return va.getPublicKey(this.secretKey);
  }
  async getNonces() {
    if (!this.graph)
      throw Vr;
    this.myNonces || (this.myNonces = this.generateNonces());
    const t = /* @__PURE__ */ new Map();
    for (const [r, n] of this.myNonces)
      t.set(r, { pubNonce: n.pubNonce });
    return t;
  }
  async aggregatedNonces(t, r) {
    if (!this.graph)
      throw Vr;
    if (this.aggregateNonces || (this.aggregateNonces = /* @__PURE__ */ new Map()), this.myNonces || await this.getNonces(), this.aggregateNonces.has(t))
      return {
        hasAllNonces: this.aggregateNonces.size === this.myNonces?.size
      };
    const n = this.myNonces.get(t);
    if (!n)
      throw new Error(`missing nonce for txid ${t}`);
    const o = await this.getPublicKey();
    r.set(v.encode(o.subarray(1)), n);
    const i = this.graph.find(t);
    if (!i)
      throw new Error(`missing tx for txid ${t}`);
    const s = bs(i.root, 0, Es).map(
      (u) => v.encode(u.key.subarray(1))
      // xonly pubkey
    ), c = [];
    for (const u of s) {
      const f = r.get(u);
      if (!f)
        throw new Error(`missing nonce for cosigner ${u}`);
      c.push(f.pubNonce);
    }
    const a = qh(c);
    return this.aggregateNonces.set(t, { pubNonce: a }), {
      hasAllNonces: this.aggregateNonces.size === this.myNonces?.size
    };
  }
  async sign() {
    if (!this.graph)
      throw Vr;
    if (!this.aggregateNonces)
      throw new Error("nonces not set");
    if (!this.myNonces)
      throw new Error("nonces not generated");
    const t = /* @__PURE__ */ new Map();
    for (const r of this.graph.iterator()) {
      const n = this.signPartial(r);
      t.set(r.txid, n);
    }
    return t;
  }
  generateNonces() {
    if (!this.graph)
      throw Vr;
    const t = /* @__PURE__ */ new Map(), r = va.getPublicKey(this.secretKey);
    for (const n of this.graph.iterator()) {
      const o = Gh(r);
      t.set(n.txid, o);
    }
    return t;
  }
  signPartial(t) {
    if (!this.graph || !this.scriptRoot || !this.rootSharedOutputAmount)
      throw yr.NOT_INITIALIZED;
    if (!this.myNonces || !this.aggregateNonces)
      throw new Error("session not properly initialized");
    const r = this.myNonces.get(t.txid);
    if (!r)
      throw new Error("missing private nonce");
    const n = this.aggregateNonces.get(t.txid);
    if (!n)
      throw new Error("missing aggregate nonce");
    const o = [], i = [], s = bs(t.root, 0, Es).map((u) => u.key), { finalKey: c } = lc(s, !0, {
      taprootTweak: this.scriptRoot
    });
    for (let u = 0; u < t.root.inputsLength; u++) {
      const f = yg(c, this.graph, this.rootSharedOutputAmount, t.root);
      o.push(f.amount), i.push(f.script);
    }
    const a = t.root.preimageWitnessV1(
      0,
      // always first input
      i,
      Kt.DEFAULT,
      o
    );
    return hg(r.secNonce, this.secretKey, n.pubNonce, s, a, {
      taprootTweak: this.scriptRoot
    });
  }
}
yr.NOT_INITIALIZED = new Error("session not initialized, call init method");
function yg(e, t, r, n) {
  const o = D.encode(["OP_1", e.slice(1)]);
  if (n.id === t.txid)
    return {
      amount: r,
      script: o
    };
  const i = n.getInput(0);
  if (!i.txid)
    throw new Error("missing parent input txid");
  const s = v.encode(i.txid), c = t.find(s);
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
const Ba = Object.values(Kt).filter((e) => typeof e == "number");
class ar {
  constructor(t) {
    this.key = t || ns();
  }
  static fromPrivateKey(t) {
    return new ar(t);
  }
  static fromHex(t) {
    return new ar(v.decode(t));
  }
  static fromRandomBytes() {
    return new ar(ns());
  }
  /**
   * Export the private key as a hex string.
   *
   * @returns The private key as a hex string
   */
  toHex() {
    return v.encode(this.key);
  }
  async sign(t, r) {
    const n = t.clone();
    if (!r) {
      try {
        if (!n.sign(this.key, Ba))
          throw new Error("Failed to sign transaction");
      } catch (o) {
        if (!(o instanceof Error && o.message.includes("No inputs signed"))) throw o;
      }
      return n;
    }
    for (const o of r)
      if (!n.signIdx(this.key, o, Ba))
        throw new Error(`Failed to sign input #${o}`);
    return n;
  }
  compressedPublicKey() {
    return Promise.resolve(tf(this.key, !0));
  }
  xOnlyPublicKey() {
    return Promise.resolve(qs(this.key));
  }
  signerSession() {
    return yr.random();
  }
  async signMessage(t, r = "schnorr") {
    return r === "ecdsa" ? Ap(t, this.key, { prehash: !1 }) : Cp.signAsync(t, this.key);
  }
  async toReadonly() {
    return new wi(await this.compressedPublicKey());
  }
}
class wi {
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
    return new wi(t);
  }
  xOnlyPublicKey() {
    return Promise.resolve(this.publicKey.slice(1));
  }
  compressedPublicKey() {
    return Promise.resolve(this.publicKey);
  }
}
let Po = class Sd {
  constructor(t, r, n, o = 0) {
    if (this.serverPubKey = t, this.vtxoTaprootKey = r, this.hrp = n, this.version = o, t.length !== 32)
      throw new Error("Invalid server public key length, expected 32 bytes, got " + t.length);
    if (r.length !== 32)
      throw new Error("Invalid vtxo taproot public key length, expected 32 bytes, got " + r.length);
  }
  static decode(t) {
    const r = ae.decodeUnsafe(t, 1023);
    if (!r)
      throw new Error("Invalid address");
    const n = new Uint8Array(ae.fromWords(r.words));
    if (n.length !== 65)
      throw new Error("Invalid data length, expected 65 bytes, got " + n.length);
    const o = n[0], i = n.slice(1, 33), s = n.slice(33, 65);
    return new Sd(i, s, r.prefix, o);
  }
  encode() {
    const t = new Uint8Array(65);
    t[0] = this.version, t.set(this.serverPubKey, 1), t.set(this.vtxoTaprootKey, 33);
    const r = ae.toWords(t);
    return ae.encode(this.hrp, r, 1023);
  }
  // pkScript is the script that should be used to send non-dust funds to the address
  get pkScript() {
    return D.encode(["OP_1", this.vtxoTaprootKey]);
  }
  // subdustPkScript is the script that should be used to send sub-dust funds to the address
  get subdustPkScript() {
    return D.encode(["RETURN", this.vtxoTaprootKey]);
  }
};
const _o = ri(void 0, !0);
var ht;
(function(e) {
  e.Multisig = "multisig", e.CSVMultisig = "csv-multisig", e.ConditionCSVMultisig = "condition-csv-multisig", e.ConditionMultisig = "condition-multisig", e.CLTVMultisig = "cltv-multisig";
})(ht || (ht = {}));
function Td(e) {
  const t = [
    te,
    Ct,
    mr,
    Lo,
    Vn
  ];
  for (const r of t)
    try {
      return r.decode(e);
    } catch {
      continue;
    }
  throw new Error(`Failed to decode: script ${v.encode(e)} is not a valid tapscript`);
}
var te;
(function(e) {
  let t;
  (function(c) {
    c[c.CHECKSIG = 0] = "CHECKSIG", c[c.CHECKSIGADD = 1] = "CHECKSIGADD";
  })(t = e.MultisigType || (e.MultisigType = {}));
  function r(c) {
    if (c.pubkeys.length === 0)
      throw new Error("At least 1 pubkey is required");
    for (const u of c.pubkeys)
      if (u.length !== 32)
        throw new Error(`Invalid pubkey length: expected 32, got ${u.length}`);
    if (c.type || (c.type = t.CHECKSIG), c.type === t.CHECKSIGADD)
      return {
        type: ht.Multisig,
        params: c,
        script: ff(c.pubkeys.length, c.pubkeys).script
      };
    const a = [];
    for (let u = 0; u < c.pubkeys.length; u++)
      a.push(c.pubkeys[u]), u < c.pubkeys.length - 1 ? a.push("CHECKSIGVERIFY") : a.push("CHECKSIG");
    return {
      type: ht.Multisig,
      params: c,
      script: D.encode(a)
    };
  }
  e.encode = r;
  function n(c) {
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
  e.decode = n;
  function o(c) {
    const a = D.decode(c), u = [];
    let f = !1;
    for (let h = 0; h < a.length; h++) {
      const p = a[h];
      if (typeof p != "string" && typeof p != "number") {
        if (p.length !== 32)
          throw new Error(`Invalid pubkey length: expected 32, got ${p.length}`);
        if (u.push(p), h + 1 >= a.length || a[h + 1] !== "CHECKSIGADD" && a[h + 1] !== "CHECKSIG")
          throw new Error("Expected CHECKSIGADD or CHECKSIG after pubkey");
        h++;
        continue;
      }
      if (h === a.length - 1) {
        if (p !== "NUMEQUAL")
          throw new Error("Expected NUMEQUAL at end of script");
        f = !0;
      }
    }
    if (!f)
      throw new Error("Missing NUMEQUAL operation");
    if (u.length === 0)
      throw new Error("Invalid script: must have at least 1 pubkey");
    const d = r({
      pubkeys: u,
      type: t.CHECKSIGADD
    });
    if (v.encode(d.script) !== v.encode(c))
      throw new Error("Invalid script format: script reconstruction mismatch");
    return {
      type: ht.Multisig,
      params: { pubkeys: u, type: t.CHECKSIGADD },
      script: c
    };
  }
  function i(c) {
    const a = D.decode(c), u = [];
    for (let d = 0; d < a.length; d++) {
      const h = a[d];
      if (typeof h != "string" && typeof h != "number") {
        if (h.length !== 32)
          throw new Error(`Invalid pubkey length: expected 32, got ${h.length}`);
        if (u.push(h), d + 1 >= a.length)
          throw new Error("Unexpected end of script");
        const p = a[d + 1];
        if (p !== "CHECKSIGVERIFY" && p !== "CHECKSIG")
          throw new Error("Expected CHECKSIGVERIFY or CHECKSIG after pubkey");
        if (d === a.length - 2 && p !== "CHECKSIG")
          throw new Error("Last operation must be CHECKSIG");
        d++;
        continue;
      }
    }
    if (u.length === 0)
      throw new Error("Invalid script: must have at least 1 pubkey");
    const f = r({ pubkeys: u, type: t.CHECKSIG });
    if (v.encode(f.script) !== v.encode(c))
      throw new Error("Invalid script format: script reconstruction mismatch");
    return {
      type: ht.Multisig,
      params: { pubkeys: u, type: t.CHECKSIG },
      script: c
    };
  }
  function s(c) {
    return c.type === ht.Multisig;
  }
  e.is = s;
})(te || (te = {}));
var Ct;
(function(e) {
  function t(o) {
    for (const u of o.pubkeys)
      if (u.length !== 32)
        throw new Error(`Invalid pubkey length: expected 32, got ${u.length}`);
    const i = _o.encode(BigInt(Ln.encode(o.timelock.type === "blocks" ? { blocks: Number(o.timelock.value) } : { seconds: Number(o.timelock.value) }))), s = [
      i.length === 1 ? i[0] : i,
      "CHECKSEQUENCEVERIFY",
      "DROP"
    ], c = te.encode(o), a = new Uint8Array([
      ...D.encode(s),
      ...c.script
    ]);
    return {
      type: ht.CSVMultisig,
      params: o,
      script: a
    };
  }
  e.encode = t;
  function r(o) {
    if (o.length === 0)
      throw new Error("Failed to decode: script is empty");
    const i = D.decode(o);
    if (i.length < 3)
      throw new Error("Invalid script: too short (expected at least 3)");
    const s = i[0];
    if (typeof s == "string")
      throw new Error("Invalid script: expected sequence number");
    if (i[1] !== "CHECKSEQUENCEVERIFY" || i[2] !== "DROP")
      throw new Error("Invalid script: expected CHECKSEQUENCEVERIFY DROP");
    const c = new Uint8Array(D.encode(i.slice(3)));
    let a;
    try {
      a = te.decode(c);
    } catch (p) {
      throw new Error(`Invalid multisig script: ${p instanceof Error ? p.message : String(p)}`);
    }
    let u;
    typeof s == "number" ? u = s : u = Number(_o.decode(s));
    const f = Ln.decode(u), d = f.blocks !== void 0 ? { type: "blocks", value: BigInt(f.blocks) } : { type: "seconds", value: BigInt(f.seconds) }, h = t({
      timelock: d,
      ...a.params
    });
    if (v.encode(h.script) !== v.encode(o))
      throw new Error("Invalid script format: script reconstruction mismatch");
    return {
      type: ht.CSVMultisig,
      params: {
        timelock: d,
        ...a.params
      },
      script: o
    };
  }
  e.decode = r;
  function n(o) {
    return o.type === ht.CSVMultisig;
  }
  e.is = n;
})(Ct || (Ct = {}));
var mr;
(function(e) {
  function t(o) {
    const i = new Uint8Array([
      ...o.conditionScript,
      ...D.encode(["VERIFY"]),
      ...Ct.encode(o).script
    ]);
    return {
      type: ht.ConditionCSVMultisig,
      params: o,
      script: i
    };
  }
  e.encode = t;
  function r(o) {
    if (o.length === 0)
      throw new Error("Failed to decode: script is empty");
    const i = D.decode(o);
    if (i.length < 1)
      throw new Error("Invalid script: too short (expected at least 1)");
    let s = -1;
    for (let d = i.length - 1; d >= 0; d--)
      i[d] === "VERIFY" && (s = d);
    if (s === -1)
      throw new Error("Invalid script: missing VERIFY operation");
    const c = new Uint8Array(D.encode(i.slice(0, s))), a = new Uint8Array(D.encode(i.slice(s + 1)));
    let u;
    try {
      u = Ct.decode(a);
    } catch (d) {
      throw new Error(`Invalid CSV multisig script: ${d instanceof Error ? d.message : String(d)}`);
    }
    const f = t({
      conditionScript: c,
      ...u.params
    });
    if (v.encode(f.script) !== v.encode(o))
      throw new Error("Invalid script format: script reconstruction mismatch");
    return {
      type: ht.ConditionCSVMultisig,
      params: {
        conditionScript: c,
        ...u.params
      },
      script: o
    };
  }
  e.decode = r;
  function n(o) {
    return o.type === ht.ConditionCSVMultisig;
  }
  e.is = n;
})(mr || (mr = {}));
var Lo;
(function(e) {
  function t(o) {
    const i = new Uint8Array([
      ...o.conditionScript,
      ...D.encode(["VERIFY"]),
      ...te.encode(o).script
    ]);
    return {
      type: ht.ConditionMultisig,
      params: o,
      script: i
    };
  }
  e.encode = t;
  function r(o) {
    if (o.length === 0)
      throw new Error("Failed to decode: script is empty");
    const i = D.decode(o);
    if (i.length < 1)
      throw new Error("Invalid script: too short (expected at least 1)");
    let s = -1;
    for (let d = i.length - 1; d >= 0; d--)
      i[d] === "VERIFY" && (s = d);
    if (s === -1)
      throw new Error("Invalid script: missing VERIFY operation");
    const c = new Uint8Array(D.encode(i.slice(0, s))), a = new Uint8Array(D.encode(i.slice(s + 1)));
    let u;
    try {
      u = te.decode(a);
    } catch (d) {
      throw new Error(`Invalid multisig script: ${d instanceof Error ? d.message : String(d)}`);
    }
    const f = t({
      conditionScript: c,
      ...u.params
    });
    if (v.encode(f.script) !== v.encode(o))
      throw new Error("Invalid script format: script reconstruction mismatch");
    return {
      type: ht.ConditionMultisig,
      params: {
        conditionScript: c,
        ...u.params
      },
      script: o
    };
  }
  e.decode = r;
  function n(o) {
    return o.type === ht.ConditionMultisig;
  }
  e.is = n;
})(Lo || (Lo = {}));
var Vn;
(function(e) {
  function t(o) {
    const i = _o.encode(o.absoluteTimelock), s = [
      i.length === 1 ? i[0] : i,
      "CHECKLOCKTIMEVERIFY",
      "DROP"
    ], c = D.encode(s), a = new Uint8Array([
      ...c,
      ...te.encode(o).script
    ]);
    return {
      type: ht.CLTVMultisig,
      params: o,
      script: a
    };
  }
  e.encode = t;
  function r(o) {
    if (o.length === 0)
      throw new Error("Failed to decode: script is empty");
    const i = D.decode(o);
    if (i.length < 3)
      throw new Error("Invalid script: too short (expected at least 3)");
    const s = i[0];
    if (typeof s == "string" || typeof s == "number")
      throw new Error("Invalid script: expected locktime number");
    if (i[1] !== "CHECKLOCKTIMEVERIFY" || i[2] !== "DROP")
      throw new Error("Invalid script: expected CHECKLOCKTIMEVERIFY DROP");
    const c = new Uint8Array(D.encode(i.slice(3)));
    let a;
    try {
      a = te.decode(c);
    } catch (d) {
      throw new Error(`Invalid multisig script: ${d instanceof Error ? d.message : String(d)}`);
    }
    const u = _o.decode(s), f = t({
      absoluteTimelock: u,
      ...a.params
    });
    if (v.encode(f.script) !== v.encode(o))
      throw new Error("Invalid script format: script reconstruction mismatch");
    return {
      type: ht.CLTVMultisig,
      params: {
        absoluteTimelock: u,
        ...a.params
      },
      script: o
    };
  }
  e.decode = r;
  function n(o) {
    return o.type === ht.CLTVMultisig;
  }
  e.is = n;
})(Vn || (Vn = {}));
const $a = Un.tapTree[2];
function ur(e) {
  return e[1].subarray(0, e[1].length - 1);
}
let pe = class vd {
  static decode(t) {
    const n = $a.decode(t).map((o) => o.script);
    return new vd(n);
  }
  constructor(t) {
    this.scripts = t;
    const r = t.length % 2 !== 0 ? t.slice().reverse() : t, n = tc(r.map((i) => ({
      script: i,
      leafVersion: un
    }))), o = uf(ni, n, void 0, !0);
    if (!o.tapLeafScript || o.tapLeafScript.length !== t.length)
      throw new Error("invalid scripts");
    this.leaves = o.tapLeafScript, this.tweakedPublicKey = o.tweakedPubkey;
  }
  encode() {
    return $a.encode(this.scripts.map((r) => ({
      depth: 1,
      version: un,
      script: r
    })));
  }
  address(t, r) {
    return new Po(r, this.tweakedPublicKey, t);
  }
  get pkScript() {
    return D.encode(["OP_1", this.tweakedPublicKey]);
  }
  onchainAddress(t) {
    return de(t).encode({
      type: "tr",
      pubkey: this.tweakedPublicKey
    });
  }
  findLeaf(t) {
    const r = this.leaves.find((n) => v.encode(ur(n)) === t);
    if (!r)
      throw new Error(`leaf '${t}' not found`);
    return r;
  }
  exitPaths() {
    const t = [];
    for (const r of this.leaves)
      try {
        const n = Ct.decode(ur(r));
        t.push(n);
        continue;
      } catch {
        try {
          const o = mr.decode(ur(r));
          t.push(o);
        } catch {
          continue;
        }
      }
    return t;
  }
};
var Ra;
(function(e) {
  class t extends pe {
    constructor(o) {
      r(o);
      const { sender: i, receiver: s, server: c, preimageHash: a, refundLocktime: u, unilateralClaimDelay: f, unilateralRefundDelay: d, unilateralRefundWithoutReceiverDelay: h } = o, p = mg(a), w = Lo.encode({
        conditionScript: p,
        pubkeys: [s, c]
      }).script, y = te.encode({
        pubkeys: [i, s, c]
      }).script, x = Vn.encode({
        absoluteTimelock: u,
        pubkeys: [i, c]
      }).script, T = mr.encode({
        conditionScript: p,
        timelock: f,
        pubkeys: [s]
      }).script, A = Ct.encode({
        timelock: d,
        pubkeys: [i, s]
      }).script, R = Ct.encode({
        timelock: h,
        pubkeys: [i]
      }).script;
      super([
        w,
        y,
        x,
        T,
        A,
        R
      ]), this.options = o, this.claimScript = v.encode(w), this.refundScript = v.encode(y), this.refundWithoutReceiverScript = v.encode(x), this.unilateralClaimScript = v.encode(T), this.unilateralRefundScript = v.encode(A), this.unilateralRefundWithoutReceiverScript = v.encode(R);
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
  function r(n) {
    const { sender: o, receiver: i, server: s, preimageHash: c, refundLocktime: a, unilateralClaimDelay: u, unilateralRefundDelay: f, unilateralRefundWithoutReceiverDelay: d } = n;
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
})(Ra || (Ra = {}));
function mg(e) {
  return D.encode(["HASH160", e, "EQUAL"]);
}
var Vo;
(function(e) {
  class t extends pe {
    constructor(n) {
      const { pubKey: o, serverPubKey: i, csvTimelock: s = t.DEFAULT_TIMELOCK } = n, c = te.encode({
        pubkeys: [o, i]
      }).script, a = Ct.encode({
        timelock: s,
        pubkeys: [o]
      }).script;
      super([c, a]), this.options = n, this.forfeitScript = v.encode(c), this.exitScript = v.encode(a);
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
})(Vo || (Vo = {}));
var Dn;
(function(e) {
  e.TxSent = "SENT", e.TxReceived = "RECEIVED";
})(Dn || (Dn = {}));
function Te(e) {
  return !e.isSpent;
}
function yc(e) {
  return e.virtualStatus.state === "swept" && Te(e);
}
function kd(e) {
  if (e.virtualStatus.state === "swept")
    return !0;
  const t = e.virtualStatus.batchExpiry;
  return !t || new Date(t).getFullYear() < 2025 ? !1 : t <= Date.now();
}
function Id(e, t) {
  return e.value < t;
}
async function* Ss(e) {
  const t = [], r = [];
  let n = null, o = null;
  const i = (c) => {
    n ? (n(c), n = null) : t.push(c);
  }, s = () => {
    const c = new Error("EventSource error");
    o ? (o(c), o = null) : r.push(c);
  };
  e.addEventListener("message", i), e.addEventListener("error", s);
  try {
    for (; ; ) {
      if (t.length > 0) {
        yield t.shift();
        continue;
      }
      if (r.length > 0)
        throw r.shift();
      const c = await new Promise((a, u) => {
        n = a, o = u;
      }).finally(() => {
        n = null, o = null;
      });
      c && (yield c);
    }
  } finally {
    e.removeEventListener("message", i), e.removeEventListener("error", s);
  }
}
let Ad = class extends Error {
  constructor(t, r, n, o) {
    super(r), this.code = t, this.message = r, this.name = n, this.metadata = o;
  }
};
function xg(e) {
  try {
    if (!(e instanceof Error))
      return;
    const t = JSON.parse(e.message);
    if (!("details" in t) || !Array.isArray(t.details))
      return;
    for (const r of t.details) {
      if (!("@type" in r) || r["@type"] !== "type.googleapis.com/ark.v1.ErrorDetails" || !("code" in r))
        continue;
      const o = r.code;
      if (!("message" in r))
        continue;
      const i = r.message;
      if (!("name" in r))
        continue;
      const s = r.name;
      let c;
      return "metadata" in r && bg(r.metadata) && (c = r.metadata), new Ad(o, i, s, c);
    }
    return;
  } catch {
    return;
  }
}
function bg(e) {
  return typeof e == "object" && e !== null && !Array.isArray(e);
}
var De;
(function(e) {
  function t(n, o, i = []) {
    if (typeof n != "string" && (n = r(n)), o.length == 0)
      throw new Error("intent proof requires at least one input");
    Ig(o), Bg(i);
    const s = $g(n, o[0].witnessUtxo.script);
    return Rg(s, o, i);
  }
  e.create = t;
  function r(n) {
    switch (n.type) {
      case "register":
        return JSON.stringify({
          type: "register",
          onchain_output_indexes: n.onchain_output_indexes,
          valid_at: n.valid_at,
          expire_at: n.expire_at,
          cosigners_public_keys: n.cosigners_public_keys
        });
      case "delete":
        return JSON.stringify({
          type: "delete",
          expire_at: n.expire_at
        });
      case "get-pending-tx":
        return JSON.stringify({
          type: "get-pending-tx",
          expire_at: n.expire_at
        });
    }
  }
  e.encodeMessage = r;
})(De || (De = {}));
const Eg = new Uint8Array([ut.RETURN]), Sg = new Uint8Array(32).fill(0), Tg = 4294967295, vg = "ark-intent-proof-message";
function kg(e) {
  if (e.index === void 0)
    throw new Error("intent proof input requires index");
  if (e.txid === void 0)
    throw new Error("intent proof input requires txid");
  if (e.witnessUtxo === void 0)
    throw new Error("intent proof input requires witness utxo");
  return !0;
}
function Ig(e) {
  return e.forEach(kg), !0;
}
function Ag(e) {
  if (e.amount === void 0)
    throw new Error("intent proof output requires amount");
  if (e.script === void 0)
    throw new Error("intent proof output requires script");
  return !0;
}
function Bg(e) {
  return e.forEach(Ag), !0;
}
function $g(e, t) {
  const r = Og(e), n = new je({
    version: 0
  });
  return n.addInput({
    txid: Sg,
    // zero hash
    index: Tg,
    sequence: 0
  }), n.addOutput({
    amount: 0n,
    script: t
  }), n.updateInput(0, {
    finalScriptSig: D.encode(["OP_0", r])
  }), n;
}
function Rg(e, t, r) {
  const n = t[0], o = t.map((s) => s.sequence || 0).reduce((s, c) => Math.max(s, c), 0), i = new je({
    version: 2,
    lockTime: o
  });
  i.addInput({
    ...n,
    txid: e.id,
    index: 0,
    witnessUtxo: {
      script: n.witnessUtxo.script,
      amount: 0n
    },
    sighashType: Kt.ALL
  });
  for (const [s, c] of t.entries())
    i.addInput({
      ...c,
      sighashType: Kt.ALL
    }), c.unknown?.length && i.updateInput(s + 1, {
      unknown: c.unknown
    });
  r.length === 0 && (r = [
    {
      amount: 0n,
      script: Eg
    }
  ]);
  for (const s of r)
    i.addOutput({
      amount: s.amount,
      script: s.script
    });
  return i;
}
function Og(e) {
  return Br.utils.taggedHash(vg, new TextEncoder().encode(e));
}
var wt;
(function(e) {
  e.BatchStarted = "batch_started", e.BatchFinalization = "batch_finalization", e.BatchFinalized = "batch_finalized", e.BatchFailed = "batch_failed", e.TreeSigningStarted = "tree_signing_started", e.TreeNonces = "tree_nonces", e.TreeTx = "tree_tx", e.TreeSignature = "tree_signature";
})(wt || (wt = {}));
let Bd = class {
  constructor(t) {
    this.serverUrl = t;
  }
  async getInfo() {
    const t = `${this.serverUrl}/v1/info`, r = await fetch(t);
    if (!r.ok) {
      const o = await r.text();
      ie(o, `Failed to get server info: ${r.statusText}`);
    }
    const n = await r.json();
    return {
      boardingExitDelay: BigInt(n.boardingExitDelay ?? 0),
      checkpointTapscript: n.checkpointTapscript ?? "",
      deprecatedSigners: n.deprecatedSigners?.map((o) => ({
        cutoffDate: BigInt(o.cutoffDate ?? 0),
        pubkey: o.pubkey ?? ""
      })) ?? [],
      digest: n.digest ?? "",
      dust: BigInt(n.dust ?? 0),
      fees: {
        intentFee: {
          ...n.fees?.intentFee,
          onchainInput: BigInt(n.fees?.intentFee?.onchainInput ?? 0),
          onchainOutput: BigInt(n.fees?.intentFee?.onchainOutput ?? 0)
        },
        txFeeRate: n?.fees?.txFeeRate ?? ""
      },
      forfeitAddress: n.forfeitAddress ?? "",
      forfeitPubkey: n.forfeitPubkey ?? "",
      network: n.network ?? "",
      scheduledSession: "scheduledSession" in n && n.scheduledSession != null ? {
        duration: BigInt(n.scheduledSession.duration ?? 0),
        nextStartTime: BigInt(n.scheduledSession.nextStartTime ?? 0),
        nextEndTime: BigInt(n.scheduledSession.nextEndTime ?? 0),
        period: BigInt(n.scheduledSession.period ?? 0)
      } : void 0,
      serviceStatus: n.serviceStatus ?? {},
      sessionDuration: BigInt(n.sessionDuration ?? 0),
      signerPubkey: n.signerPubkey ?? "",
      unilateralExitDelay: BigInt(n.unilateralExitDelay ?? 0),
      utxoMaxAmount: BigInt(n.utxoMaxAmount ?? -1),
      utxoMinAmount: BigInt(n.utxoMinAmount ?? 0),
      version: n.version ?? "",
      vtxoMaxAmount: BigInt(n.vtxoMaxAmount ?? -1),
      vtxoMinAmount: BigInt(n.vtxoMinAmount ?? 0)
    };
  }
  async submitTx(t, r) {
    const n = `${this.serverUrl}/v1/tx/submit`, o = await fetch(n, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        signedArkTx: t,
        checkpointTxs: r
      })
    });
    if (!o.ok) {
      const s = await o.text();
      ie(s, `Failed to submit virtual transaction: ${s}`);
    }
    const i = await o.json();
    return {
      arkTxid: i.arkTxid,
      finalArkTx: i.finalArkTx,
      signedCheckpointTxs: i.signedCheckpointTxs
    };
  }
  async finalizeTx(t, r) {
    const n = `${this.serverUrl}/v1/tx/finalize`, o = await fetch(n, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        arkTxid: t,
        finalCheckpointTxs: r
      })
    });
    if (!o.ok) {
      const i = await o.text();
      ie(i, `Failed to finalize offchain transaction: ${i}`);
    }
  }
  async registerIntent(t) {
    const r = `${this.serverUrl}/v1/batch/registerIntent`, n = await fetch(r, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        intent: {
          proof: t.proof,
          message: De.encodeMessage(t.message)
        }
      })
    });
    if (!n.ok) {
      const i = await n.text();
      ie(i, `Failed to register intent: ${i}`);
    }
    return (await n.json()).intentId;
  }
  async deleteIntent(t) {
    const r = `${this.serverUrl}/v1/batch/deleteIntent`, n = await fetch(r, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        intent: {
          proof: t.proof,
          message: De.encodeMessage(t.message)
        }
      })
    });
    if (!n.ok) {
      const o = await n.text();
      ie(o, `Failed to delete intent: ${o}`);
    }
  }
  async confirmRegistration(t) {
    const r = `${this.serverUrl}/v1/batch/ack`, n = await fetch(r, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        intentId: t
      })
    });
    if (!n.ok) {
      const o = await n.text();
      ie(o, `Failed to confirm registration: ${o}`);
    }
  }
  async submitTreeNonces(t, r, n) {
    const o = `${this.serverUrl}/v1/batch/tree/submitNonces`, i = await fetch(o, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        batchId: t,
        pubkey: r,
        treeNonces: Ug(n)
      })
    });
    if (!i.ok) {
      const s = await i.text();
      ie(s, `Failed to submit tree nonces: ${s}`);
    }
  }
  async submitTreeSignatures(t, r, n) {
    const o = `${this.serverUrl}/v1/batch/tree/submitSignatures`, i = await fetch(o, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        batchId: t,
        pubkey: r,
        treeSignatures: Ng(n)
      })
    });
    if (!i.ok) {
      const s = await i.text();
      ie(s, `Failed to submit tree signatures: ${s}`);
    }
  }
  async submitSignedForfeitTxs(t, r) {
    const n = `${this.serverUrl}/v1/batch/submitForfeitTxs`, o = await fetch(n, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        signedForfeitTxs: t,
        signedCommitmentTx: r
      })
    });
    if (!o.ok) {
      const i = await o.text();
      ie(i, `Failed to submit forfeit transactions: ${o.statusText}`);
    }
  }
  async *getEventStream(t, r) {
    const n = `${this.serverUrl}/v1/batch/events`, o = r.length > 0 ? `?${r.map((i) => `topics=${encodeURIComponent(i)}`).join("&")}` : "";
    for (; !t?.aborted; )
      try {
        const i = new EventSource(n + o), s = () => {
          i.close();
        };
        t?.addEventListener("abort", s);
        try {
          for await (const c of Ss(i)) {
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
        if (Ts(i)) {
          console.debug("Timeout error ignored");
          continue;
        }
        throw console.error("Event stream error:", i), i;
      }
  }
  async *getTransactionsStream(t) {
    const r = `${this.serverUrl}/v1/txs`;
    for (; !t?.aborted; )
      try {
        const n = new EventSource(r), o = () => {
          n.close();
        };
        t?.addEventListener("abort", o);
        try {
          for await (const i of Ss(n)) {
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
          t?.removeEventListener("abort", o), n.close();
        }
      } catch (n) {
        if (n instanceof Error && n.name === "AbortError")
          break;
        if (Ts(n)) {
          console.debug("Timeout error ignored");
          continue;
        }
        throw console.error("Transaction stream error:", n), n;
      }
  }
  async getPendingTxs(t) {
    const r = `${this.serverUrl}/v1/tx/pending`, n = await fetch(r, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        intent: {
          proof: t.proof,
          message: De.encodeMessage(t.message)
        }
      })
    });
    if (!n.ok) {
      const i = await n.text();
      ie(i, `Failed to get pending transactions: ${i}`);
    }
    return (await n.json()).pendingTxs;
  }
  parseSettlementEvent(t) {
    if (t.batchStarted)
      return {
        type: wt.BatchStarted,
        id: t.batchStarted.id,
        intentIdHashes: t.batchStarted.intentIdHashes,
        batchExpiry: BigInt(t.batchStarted.batchExpiry)
      };
    if (t.batchFinalization)
      return {
        type: wt.BatchFinalization,
        id: t.batchFinalization.id,
        commitmentTx: t.batchFinalization.commitmentTx
      };
    if (t.batchFinalized)
      return {
        type: wt.BatchFinalized,
        id: t.batchFinalized.id,
        commitmentTxid: t.batchFinalized.commitmentTxid
      };
    if (t.batchFailed)
      return {
        type: wt.BatchFailed,
        id: t.batchFailed.id,
        reason: t.batchFailed.reason
      };
    if (t.treeSigningStarted)
      return {
        type: wt.TreeSigningStarted,
        id: t.treeSigningStarted.id,
        cosignersPublicKeys: t.treeSigningStarted.cosignersPubkeys,
        unsignedCommitmentTx: t.treeSigningStarted.unsignedCommitmentTx
      };
    if (t.treeNoncesAggregated)
      return null;
    if (t.treeNonces)
      return {
        type: wt.TreeNonces,
        id: t.treeNonces.id,
        topic: t.treeNonces.topic,
        txid: t.treeNonces.txid,
        nonces: Cg(t.treeNonces.nonces)
        // pubkey -> public nonce
      };
    if (t.treeTx) {
      const r = Object.fromEntries(Object.entries(t.treeTx.children).map(([n, o]) => [parseInt(n), o]));
      return {
        type: wt.TreeTx,
        id: t.treeTx.id,
        topic: t.treeTx.topic,
        batchIndex: t.treeTx.batchIndex,
        chunk: {
          txid: t.treeTx.txid,
          tx: t.treeTx.tx,
          children: r
        }
      };
    }
    return t.treeSignature ? {
      type: wt.TreeSignature,
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
        spentVtxos: t.commitmentTx.spentVtxos.map(Dr),
        spendableVtxos: t.commitmentTx.spendableVtxos.map(Dr),
        checkpointTxs: t.commitmentTx.checkpointTxs
      }
    } : t.arkTx ? {
      arkTx: {
        txid: t.arkTx.txid,
        tx: t.arkTx.tx,
        spentVtxos: t.arkTx.spentVtxos.map(Dr),
        spendableVtxos: t.arkTx.spendableVtxos.map(Dr),
        checkpointTxs: t.arkTx.checkpointTxs
      }
    } : (t.heartbeat || console.warn("Unknown transaction notification type:", t), null);
  }
};
function Ug(e) {
  const t = {};
  for (const [r, n] of e)
    t[r] = v.encode(n.pubNonce);
  return t;
}
function Ng(e) {
  const t = {};
  for (const [r, n] of e)
    t[r] = v.encode(n.encode());
  return t;
}
function Cg(e) {
  return new Map(Object.entries(e).map(([t, r]) => {
    if (typeof r != "string")
      throw new Error("invalid nonce");
    return [t, { pubNonce: v.decode(r) }];
  }));
}
function Ts(e) {
  const t = (r) => r instanceof Error ? r.name === "TypeError" && r.message === "Failed to fetch" || r.name === "HeadersTimeoutError" || r.name === "BodyTimeoutError" || r.code === "UND_ERR_HEADERS_TIMEOUT" || r.code === "UND_ERR_BODY_TIMEOUT" : !1;
  return t(e) || t(e.cause);
}
function Dr(e) {
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
function ie(e, t) {
  const r = new Error(e);
  throw xg(r) ?? new Error(t);
}
let oo = class {
  constructor(t, r = /* @__PURE__ */ new Map()) {
    this.root = t, this.children = r;
  }
  static create(t) {
    if (t.length === 0)
      throw new Error("empty chunks");
    const r = /* @__PURE__ */ new Map();
    for (const i of t) {
      const s = _g(i), c = s.tx.id;
      r.set(c, s);
    }
    const n = [];
    for (const [i] of r) {
      let s = !1;
      for (const [c, a] of r)
        if (c !== i && (s = Pg(a, i), s))
          break;
      if (!s) {
        n.push(i);
        continue;
      }
    }
    if (n.length === 0)
      throw new Error("no root chunk found");
    if (n.length > 1)
      throw new Error(`multiple root chunks found: ${n.join(", ")}`);
    const o = $d(n[0], r);
    if (!o)
      throw new Error(`chunk not found for root txid: ${n[0]}`);
    if (o.nbOfNodes() !== t.length)
      throw new Error(`number of chunks (${t.length}) is not equal to the number of nodes in the graph (${o.nbOfNodes()})`);
    return o;
  }
  nbOfNodes() {
    let t = 1;
    for (const r of this.children.values())
      t += r.nbOfNodes();
    return t;
  }
  validate() {
    if (!this.root)
      throw new Error("unexpected nil root");
    const t = this.root.outputsLength, r = this.root.inputsLength;
    if (r !== 1)
      throw new Error(`unexpected number of inputs: ${r}, expected 1`);
    if (this.children.size > t - 1)
      throw new Error(`unexpected number of children: ${this.children.size}, expected maximum ${t - 1}`);
    for (const [n, o] of this.children) {
      if (n >= t)
        throw new Error(`output index ${n} is out of bounds (nb of outputs: ${t})`);
      o.validate();
      const i = o.root.getInput(0), s = this.root.id;
      if (!i.txid || v.encode(i.txid) !== s || i.index !== n)
        throw new Error(`input of child ${n} is not the output of the parent`);
      let c = 0n;
      for (let u = 0; u < o.root.outputsLength; u++) {
        const f = o.root.getOutput(u);
        f?.amount && (c += f.amount);
      }
      const a = this.root.getOutput(n);
      if (!a?.amount)
        throw new Error(`parent output ${n} has no amount`);
      if (c !== a.amount)
        throw new Error(`sum of child's outputs is not equal to the output of the parent: ${c} != ${a.amount}`);
    }
  }
  leaves() {
    if (this.children.size === 0)
      return [this.root];
    const t = [];
    for (const r of this.children.values())
      t.push(...r.leaves());
    return t;
  }
  get txid() {
    return this.root.id;
  }
  find(t) {
    if (t === this.txid)
      return this;
    for (const r of this.children.values()) {
      const n = r.find(t);
      if (n)
        return n;
    }
    return null;
  }
  update(t, r) {
    if (t === this.txid) {
      r(this.root);
      return;
    }
    for (const n of this.children.values())
      try {
        n.update(t, r);
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
function Pg(e, t) {
  return Object.values(e.children).includes(t);
}
function $d(e, t) {
  const r = t.get(e);
  if (!r)
    return null;
  const n = r.tx, o = /* @__PURE__ */ new Map();
  for (const [i, s] of Object.entries(r.children)) {
    const c = parseInt(i), a = $d(s, t);
    a && o.set(c, a);
  }
  return new oo(n, o);
}
function _g(e) {
  return { tx: at.fromPSBT(q.decode(e.tx)), children: e.children };
}
var vs;
(function(e) {
  let t;
  (function(n) {
    n.Start = "start", n.BatchStarted = "batch_started", n.TreeSigningStarted = "tree_signing_started", n.TreeNoncesAggregated = "tree_nonces_aggregated", n.BatchFinalization = "batch_finalization";
  })(t || (t = {}));
  async function r(n, o, i = {}) {
    const { abortController: s, skipVtxoTreeSigning: c = !1, eventCallback: a } = i;
    let u = t.Start;
    const f = [], d = [];
    let h, p;
    for await (const w of n) {
      if (s?.signal.aborted)
        throw new Error("canceled");
      switch (a && a(w).catch(() => {
      }), w.type) {
        case wt.BatchStarted: {
          const y = w, { skip: x } = await o.onBatchStarted(y);
          x || (u = t.BatchStarted, c && (u = t.TreeNoncesAggregated));
          continue;
        }
        case wt.BatchFinalized: {
          if (u !== t.BatchFinalization)
            continue;
          return o.onBatchFinalized && await o.onBatchFinalized(w), w.commitmentTxid;
        }
        case wt.BatchFailed: {
          if (o.onBatchFailed) {
            await o.onBatchFailed(w);
            continue;
          }
          throw new Error(w.reason);
        }
        case wt.TreeTx: {
          if (u !== t.BatchStarted && u !== t.TreeNoncesAggregated)
            continue;
          w.batchIndex === 0 ? f.push(w.chunk) : d.push(w.chunk), o.onTreeTxEvent && await o.onTreeTxEvent(w);
          continue;
        }
        case wt.TreeSignature: {
          if (u !== t.TreeNoncesAggregated)
            continue;
          if (!h)
            throw new Error("vtxo tree not initialized");
          const y = v.decode(w.signature);
          h.update(w.txid, (x) => {
            x.updateInput(0, {
              tapKeySig: y
            });
          }), o.onTreeSignatureEvent && await o.onTreeSignatureEvent(w);
          continue;
        }
        case wt.TreeSigningStarted: {
          if (u !== t.BatchStarted)
            continue;
          h = oo.create(f);
          const { skip: y } = await o.onTreeSigningStarted(w, h);
          y || (u = t.TreeSigningStarted);
          continue;
        }
        case wt.TreeNonces: {
          if (u !== t.TreeSigningStarted)
            continue;
          const { fullySigned: y } = await o.onTreeNonces(w);
          y && (u = t.TreeNoncesAggregated);
          continue;
        }
        case wt.BatchFinalization: {
          if (u !== t.TreeNoncesAggregated)
            continue;
          if (!h && f.length > 0 && (h = oo.create(f)), !h && !c)
            throw new Error("vtxo tree not initialized");
          d.length > 0 && (p = oo.create(d)), await o.onBatchFinalization(w, h, p), u = t.BatchFinalization;
          continue;
        }
        default:
          continue;
      }
    }
    throw new Error("event stream closed");
  }
  e.join = r;
})(vs || (vs = {}));
function Rd(e, t, r) {
  const n = [];
  let o = [...t];
  for (const s of [...e, ...t]) {
    if (s.virtualStatus.state !== "preconfirmed" && s.virtualStatus.commitmentTxIds && s.virtualStatus.commitmentTxIds.some((p) => r.has(p)))
      continue;
    const c = Lg(o, s);
    o = Oa(o, c);
    const a = Hr(c);
    if (s.value <= a)
      continue;
    const u = Vg(o, s);
    o = Oa(o, u);
    const f = Hr(u);
    if (s.value <= f)
      continue;
    const d = {
      commitmentTxid: "",
      boardingTxid: "",
      arkTxid: ""
    };
    let h = s.virtualStatus.state !== "preconfirmed";
    s.virtualStatus.state === "preconfirmed" ? (d.arkTxid = s.txid, s.spentBy && (h = !0)) : d.commitmentTxid = s.virtualStatus.commitmentTxIds?.[0] || "", n.push({
      key: d,
      amount: s.value - a - f,
      type: Dn.TxReceived,
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
    const a = Dg([...e, ...t], s), u = Hr(a), f = Hr(c);
    if (f <= u)
      continue;
    const d = Hg(a, c), h = {
      commitmentTxid: "",
      boardingTxid: "",
      arkTxid: ""
    };
    d.virtualStatus.state === "preconfirmed" ? h.arkTxid = u === 0 ? d.arkTxId : d.txid : h.commitmentTxid = d.virtualStatus.commitmentTxIds?.[0] || "", n.push({
      key: h,
      amount: f - u,
      type: Dn.TxSent,
      createdAt: d.createdAt.getTime(),
      settled: !0
    });
  }
  return n;
}
function Lg(e, t) {
  return t.virtualStatus.state === "preconfirmed" ? [] : e.filter((r) => r.settledBy ? t.virtualStatus.commitmentTxIds?.includes(r.settledBy) ?? !1 : !1);
}
function Vg(e, t) {
  return e.filter((r) => r.arkTxId ? r.arkTxId === t.txid : !1);
}
function Dg(e, t) {
  return e.filter((r) => r.virtualStatus.state !== "preconfirmed" && r.virtualStatus.commitmentTxIds?.includes(t) ? !0 : r.txid === t);
}
function Hr(e) {
  return e.reduce((t, r) => t + r.value, 0);
}
function Hg(e, t) {
  return e.length === 0 ? t[0] : e[0];
}
function Oa(e, t) {
  return e.filter((r) => {
    for (const n of t)
      if (r.txid === n.txid && r.vout === n.vout)
        return !1;
    return !0;
  });
}
const Fg = (e) => Kg[e], Kg = {
  bitcoin: tr(cn, "ark"),
  testnet: tr(_e, "tark"),
  signet: tr(_e, "tark"),
  mutinynet: tr(_e, "tark"),
  regtest: tr({
    ..._e,
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
const Wg = {
  bitcoin: "https://mempool.space/api",
  testnet: "https://mempool.space/testnet/api",
  signet: "https://mempool.space/signet/api",
  mutinynet: "https://mutinynet.com/api",
  regtest: "http://localhost:3000"
};
let Mg = class {
  constructor(t, r) {
    this.baseUrl = t, this.pollingInterval = r?.pollingInterval ?? 15e3, this.forcePolling = r?.forcePolling ?? !1;
  }
  async getCoins(t) {
    const r = await fetch(`${this.baseUrl}/address/${t}/utxo`);
    if (!r.ok)
      throw new Error(`Failed to fetch UTXOs: ${r.statusText}`);
    return r.json();
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
    const r = await fetch(`${this.baseUrl}/tx/${t}/outspends`);
    if (!r.ok) {
      const n = await r.text();
      throw new Error(`Failed to get transaction outspends: ${n}`);
    }
    return r.json();
  }
  async getTransactions(t) {
    const r = await fetch(`${this.baseUrl}/address/${t}/txs`);
    if (!r.ok) {
      const n = await r.text();
      throw new Error(`Failed to get transactions: ${n}`);
    }
    return r.json();
  }
  async getTxStatus(t) {
    const r = await fetch(`${this.baseUrl}/tx/${t}`);
    if (!r.ok)
      throw new Error(r.statusText);
    if (!(await r.json()).status.confirmed)
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
  async watchAddresses(t, r) {
    let n = null;
    const o = this.baseUrl.replace(/^http(s)?:/, "ws$1:") + "/v1/ws", i = async () => {
      const a = async () => (await Promise.all(t.map((p) => this.getTransactions(p)))).flat(), u = await a(), f = (h) => `${h.txid}_${h.status.block_time}`, d = new Set(u.map(f));
      n = setInterval(async () => {
        try {
          const p = (await a()).filter((w) => !d.has(f(w)));
          p.length > 0 && (p.forEach((w) => d.add(f(w))), r(p));
        } catch (h) {
          console.error("Error in polling mechanism:", h);
        }
      }, this.pollingInterval);
    };
    let s = null;
    const c = () => {
      s && s.close(), n && clearInterval(n);
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
            for (const p of [
              "mempool",
              "confirmed",
              "removed"
            ])
              d[h][p] && u.push(...d[h][p].filter(jg));
          u.length > 0 && r(u);
        } catch (u) {
          console.error("Failed to process WebSocket message:", u);
        }
      }), s.addEventListener("error", async () => {
        await i();
      });
    } catch {
      n && clearInterval(n), await i();
    }
    return c;
  }
  async getChainTip() {
    const t = await fetch(`${this.baseUrl}/blocks/tip`);
    if (!t.ok)
      throw new Error(`Failed to get chain tip: ${t.statusText}`);
    const r = await t.json();
    if (!zg(r))
      throw new Error(`Invalid chain tip: ${JSON.stringify(r)}`);
    if (r.length === 0)
      throw new Error("No chain tip found");
    const n = r[0].id;
    return {
      height: r[0].height,
      time: r[0].mediantime,
      hash: n
    };
  }
  async broadcastPackage(t, r) {
    const n = await fetch(`${this.baseUrl}/txs/package`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify([t, r])
    });
    if (!n.ok) {
      const o = await n.text();
      throw new Error(`Failed to broadcast package: ${o}`);
    }
    return n.json();
  }
  async broadcastTx(t) {
    const r = await fetch(`${this.baseUrl}/tx`, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain"
      },
      body: t
    });
    if (!r.ok) {
      const n = await r.text();
      throw new Error(`Failed to broadcast transaction: ${n}`);
    }
    return r.text();
  }
};
function zg(e) {
  return Array.isArray(e) && e.every((t) => {
    t && typeof t == "object" && typeof t.id == "string" && t.id.length > 0 && typeof t.height == "number" && t.height >= 0 && typeof t.mediantime == "number" && t.mediantime > 0;
  });
}
const jg = (e) => typeof e.txid == "string" && Array.isArray(e.vout) && e.vout.every((t) => typeof t.scriptpubkey_address == "string" && typeof t.value == "number") && typeof e.status == "object" && typeof e.status.confirmed == "boolean", Gg = 0n, qg = new Uint8Array([81, 2, 78, 115]), mc = {
  script: qg,
  amount: Gg
};
v.encode(mc.script);
function Yg(e, t, r) {
  const n = new je({
    version: 3,
    lockTime: r
  });
  let o = 0n;
  for (const i of e) {
    if (!i.witnessUtxo)
      throw new Error("input needs witness utxo");
    o += i.witnessUtxo.amount, n.addInput(i);
  }
  return n.addOutput({
    script: t,
    amount: o
  }), n.addOutput(mc), n;
}
const Zg = new Error("invalid settlement transaction outputs"), Xg = new Error("empty tree"), Jg = new Error("invalid number of inputs"), Pi = new Error("wrong settlement txid"), Qg = new Error("invalid amount"), tw = new Error("no leaves"), ew = new Error("invalid taproot script"), Ua = new Error("invalid round transaction outputs"), nw = new Error("wrong commitment txid"), rw = new Error("missing cosigners public keys"), _i = 0, Na = 1;
function ow(e, t) {
  if (t.validate(), t.root.inputsLength !== 1)
    throw Jg;
  const r = t.root.getInput(0), n = at.fromPSBT(q.decode(e));
  if (n.outputsLength <= Na)
    throw Zg;
  const o = n.id;
  if (!r.txid || v.encode(r.txid) !== o || r.index !== Na)
    throw Pi;
}
function iw(e, t, r) {
  if (t.outputsLength < _i + 1)
    throw Ua;
  const n = t.getOutput(_i)?.amount;
  if (!n)
    throw Ua;
  if (!e.root)
    throw Xg;
  const o = e.root.getInput(0), i = t.id;
  if (!o.txid || v.encode(o.txid) !== i || o.index !== _i)
    throw nw;
  let s = 0n;
  for (let a = 0; a < e.root.outputsLength; a++) {
    const u = e.root.getOutput(a);
    u?.amount && (s += u.amount);
  }
  if (s !== n)
    throw Qg;
  if (e.leaves().length === 0)
    throw tw;
  e.validate();
  for (const a of e.iterator())
    for (const [u, f] of a.children) {
      const d = a.root.getOutput(u);
      if (!d?.script)
        throw new Error(`parent output ${u} not found`);
      const h = d.script.slice(2);
      if (h.length !== 32)
        throw new Error(`parent output ${u} has invalid script`);
      const p = bs(f.root, 0, Es);
      if (p.length === 0)
        throw rw;
      const w = p.map((x) => x.key), { finalKey: y } = lc(w, !0, {
        taprootTweak: r
      });
      if (!y || v.encode(y.slice(1)) !== v.encode(h))
        throw ew;
    }
}
function sw(e, t, r) {
  let n = !1;
  for (const [s, c] of t.entries()) {
    if (!c.script)
      throw new Error(`missing output script ${s}`);
    if (D.decode(c.script)[0] === "RETURN") {
      if (n)
        throw new Error("multiple OP_RETURN outputs");
      n = !0;
    }
  }
  const o = e.map((s) => cw(s, r));
  return {
    arkTx: Od(o.map((s) => s.input), t),
    checkpoints: o.map((s) => s.tx)
  };
}
function Od(e, t) {
  let r = 0n;
  for (const o of e) {
    const i = Td(ur(o.tapLeafScript));
    if (Vn.is(i)) {
      if (r !== 0n && Ca(r) !== Ca(i.params.absoluteTimelock))
        throw new Error("cannot mix seconds and blocks locktime");
      i.params.absoluteTimelock > r && (r = i.params.absoluteTimelock);
    }
  }
  const n = new je({
    version: 3,
    lockTime: Number(r)
  });
  for (const [o, i] of e.entries())
    n.addInput({
      txid: i.txid,
      index: i.vout,
      sequence: r ? ci - 1 : void 0,
      witnessUtxo: {
        script: pe.decode(i.tapTree).pkScript,
        amount: BigInt(i.value)
      },
      tapLeafScript: [i.tapLeafScript]
    }), gg(n, o, Ed, i.tapTree);
  for (const o of t)
    n.addOutput(o);
  return n.addOutput(mc), n;
}
function cw(e, t) {
  const r = Td(ur(e.tapLeafScript)), n = new pe([
    t.script,
    r.script
  ]), o = Od([e], [
    {
      amount: BigInt(e.value),
      script: n.pkScript
    }
  ]), i = n.findLeaf(v.encode(r.script)), s = {
    txid: o.id,
    vout: 0,
    value: e.value,
    tapLeafScript: i,
    tapTree: n.encode()
  };
  return {
    tx: o,
    input: s
  };
}
const aw = 500000000n;
function Ca(e) {
  return e >= aw;
}
function uw(e, t) {
  if (!e.status.block_time)
    return !1;
  if (t.value === 0n)
    return !0;
  if (t.type === "blocks")
    return !1;
  const r = BigInt(Math.floor(Date.now() / 1e3));
  return BigInt(Math.floor(e.status.block_time)) + t.value <= r;
}
const fw = 4320 * 60 * 1e3, dw = {
  thresholdMs: fw
  // 3 days
};
let He = class Mt {
  constructor(t, r, n = Mt.DefaultHRP) {
    this.preimage = t, this.value = r, this.HRP = n, this.vout = 0;
    const o = mt(this.preimage);
    this.vtxoScript = new pe([pw(o)]);
    const i = this.vtxoScript.leaves[0];
    this.txid = v.encode(new Uint8Array(o).reverse()), this.tapTree = this.vtxoScript.encode(), this.forfeitTapLeafScript = i, this.intentTapLeafScript = i, this.value = r, this.status = { confirmed: !0 }, this.extraWitness = [this.preimage];
  }
  encode() {
    const t = new Uint8Array(Mt.Length);
    return t.set(this.preimage, 0), lw(t, this.value, this.preimage.length), t;
  }
  static decode(t, r = Mt.DefaultHRP) {
    if (t.length !== Mt.Length)
      throw new Error(`invalid data length: expected ${Mt.Length} bytes, got ${t.length}`);
    const n = t.subarray(0, Mt.PreimageLength), o = hw(t, Mt.PreimageLength);
    return new Mt(n, o, r);
  }
  static fromString(t, r = Mt.DefaultHRP) {
    if (t = t.trim(), !t.startsWith(r))
      throw new Error(`invalid human-readable part: expected ${r} prefix (note '${t}')`);
    const n = t.slice(r.length), o = hr.decode(n);
    if (o.length === 0)
      throw new Error("failed to decode base58 string");
    return Mt.decode(o, r);
  }
  toString() {
    return this.HRP + hr.encode(this.encode());
  }
};
He.DefaultHRP = "arknote";
He.PreimageLength = 32;
He.ValueLength = 4;
He.Length = He.PreimageLength + He.ValueLength;
He.FakeOutpointIndex = 0;
function lw(e, t, r) {
  new DataView(e.buffer, e.byteOffset + r, 4).setUint32(0, t, !1);
}
function hw(e, t) {
  return new DataView(e.buffer, e.byteOffset + t, 4).getUint32(0, !1);
}
function pw(e) {
  return D.encode(["SHA256", e, "EQUAL"]);
}
var ks;
(function(e) {
  e[e.INDEXER_TX_TYPE_UNSPECIFIED = 0] = "INDEXER_TX_TYPE_UNSPECIFIED", e[e.INDEXER_TX_TYPE_RECEIVED = 1] = "INDEXER_TX_TYPE_RECEIVED", e[e.INDEXER_TX_TYPE_SENT = 2] = "INDEXER_TX_TYPE_SENT";
})(ks || (ks = {}));
var vn;
(function(e) {
  e.UNSPECIFIED = "INDEXER_CHAINED_TX_TYPE_UNSPECIFIED", e.COMMITMENT = "INDEXER_CHAINED_TX_TYPE_COMMITMENT", e.ARK = "INDEXER_CHAINED_TX_TYPE_ARK", e.TREE = "INDEXER_CHAINED_TX_TYPE_TREE", e.CHECKPOINT = "INDEXER_CHAINED_TX_TYPE_CHECKPOINT";
})(vn || (vn = {}));
let Ud = class {
  constructor(t) {
    this.serverUrl = t;
  }
  async getVtxoTree(t, r) {
    let n = `${this.serverUrl}/v1/indexer/batch/${t.txid}/${t.vout}/tree`;
    const o = new URLSearchParams();
    r && (r.pageIndex !== void 0 && o.append("page.index", r.pageIndex.toString()), r.pageSize !== void 0 && o.append("page.size", r.pageSize.toString())), o.toString() && (n += "?" + o.toString());
    const i = await fetch(n);
    if (!i.ok)
      throw new Error(`Failed to fetch vtxo tree: ${i.statusText}`);
    const s = await i.json();
    if (!zt.isVtxoTreeResponse(s))
      throw new Error("Invalid vtxo tree data received");
    return s.vtxoTree.forEach((c) => {
      c.children = Object.fromEntries(Object.entries(c.children).map(([a, u]) => [
        Number(a),
        u
      ]));
    }), s;
  }
  async getVtxoTreeLeaves(t, r) {
    let n = `${this.serverUrl}/v1/indexer/batch/${t.txid}/${t.vout}/tree/leaves`;
    const o = new URLSearchParams();
    r && (r.pageIndex !== void 0 && o.append("page.index", r.pageIndex.toString()), r.pageSize !== void 0 && o.append("page.size", r.pageSize.toString())), o.toString() && (n += "?" + o.toString());
    const i = await fetch(n);
    if (!i.ok)
      throw new Error(`Failed to fetch vtxo tree leaves: ${i.statusText}`);
    const s = await i.json();
    if (!zt.isVtxoTreeLeavesResponse(s))
      throw new Error("Invalid vtxos tree leaves data received");
    return s;
  }
  async getBatchSweepTransactions(t) {
    const r = `${this.serverUrl}/v1/indexer/batch/${t.txid}/${t.vout}/sweepTxs`, n = await fetch(r);
    if (!n.ok)
      throw new Error(`Failed to fetch batch sweep transactions: ${n.statusText}`);
    const o = await n.json();
    if (!zt.isBatchSweepTransactionsResponse(o))
      throw new Error("Invalid batch sweep transactions data received");
    return o;
  }
  async getCommitmentTx(t) {
    const r = `${this.serverUrl}/v1/indexer/commitmentTx/${t}`, n = await fetch(r);
    if (!n.ok)
      throw new Error(`Failed to fetch commitment tx: ${n.statusText}`);
    const o = await n.json();
    if (!zt.isCommitmentTx(o))
      throw new Error("Invalid commitment tx data received");
    return o;
  }
  async getCommitmentTxConnectors(t, r) {
    let n = `${this.serverUrl}/v1/indexer/commitmentTx/${t}/connectors`;
    const o = new URLSearchParams();
    r && (r.pageIndex !== void 0 && o.append("page.index", r.pageIndex.toString()), r.pageSize !== void 0 && o.append("page.size", r.pageSize.toString())), o.toString() && (n += "?" + o.toString());
    const i = await fetch(n);
    if (!i.ok)
      throw new Error(`Failed to fetch commitment tx connectors: ${i.statusText}`);
    const s = await i.json();
    if (!zt.isConnectorsResponse(s))
      throw new Error("Invalid commitment tx connectors data received");
    return s.connectors.forEach((c) => {
      c.children = Object.fromEntries(Object.entries(c.children).map(([a, u]) => [
        Number(a),
        u
      ]));
    }), s;
  }
  async getCommitmentTxForfeitTxs(t, r) {
    let n = `${this.serverUrl}/v1/indexer/commitmentTx/${t}/forfeitTxs`;
    const o = new URLSearchParams();
    r && (r.pageIndex !== void 0 && o.append("page.index", r.pageIndex.toString()), r.pageSize !== void 0 && o.append("page.size", r.pageSize.toString())), o.toString() && (n += "?" + o.toString());
    const i = await fetch(n);
    if (!i.ok)
      throw new Error(`Failed to fetch commitment tx forfeitTxs: ${i.statusText}`);
    const s = await i.json();
    if (!zt.isForfeitTxsResponse(s))
      throw new Error("Invalid commitment tx forfeitTxs data received");
    return s;
  }
  async *getSubscription(t, r) {
    const n = `${this.serverUrl}/v1/indexer/script/subscription/${t}`;
    for (; !r?.aborted; )
      try {
        const o = new EventSource(n), i = () => {
          o.close();
        };
        r?.addEventListener("abort", i);
        try {
          for await (const s of Ss(o)) {
            if (r?.aborted)
              break;
            try {
              const c = JSON.parse(s.data);
              c.event && (yield {
                txid: c.event.txid,
                scripts: c.event.scripts || [],
                newVtxos: (c.event.newVtxos || []).map(Fr),
                spentVtxos: (c.event.spentVtxos || []).map(Fr),
                sweptVtxos: (c.event.sweptVtxos || []).map(Fr),
                tx: c.event.tx,
                checkpointTxs: c.event.checkpointTxs
              });
            } catch (c) {
              throw console.error("Failed to parse subscription event:", c), c;
            }
          }
        } finally {
          r?.removeEventListener("abort", i), o.close();
        }
      } catch (o) {
        if (o instanceof Error && o.name === "AbortError")
          break;
        if (Ts(o)) {
          console.debug("Timeout error ignored");
          continue;
        }
        throw console.error("Subscription error:", o), o;
      }
  }
  async getVirtualTxs(t, r) {
    let n = `${this.serverUrl}/v1/indexer/virtualTx/${t.join(",")}`;
    const o = new URLSearchParams();
    r && (r.pageIndex !== void 0 && o.append("page.index", r.pageIndex.toString()), r.pageSize !== void 0 && o.append("page.size", r.pageSize.toString())), o.toString() && (n += "?" + o.toString());
    const i = await fetch(n);
    if (!i.ok)
      throw new Error(`Failed to fetch virtual txs: ${i.statusText}`);
    const s = await i.json();
    if (!zt.isVirtualTxsResponse(s))
      throw new Error("Invalid virtual txs data received");
    return s;
  }
  async getVtxoChain(t, r) {
    let n = `${this.serverUrl}/v1/indexer/vtxo/${t.txid}/${t.vout}/chain`;
    const o = new URLSearchParams();
    r && (r.pageIndex !== void 0 && o.append("page.index", r.pageIndex.toString()), r.pageSize !== void 0 && o.append("page.size", r.pageSize.toString())), o.toString() && (n += "?" + o.toString());
    const i = await fetch(n);
    if (!i.ok)
      throw new Error(`Failed to fetch vtxo chain: ${i.statusText}`);
    const s = await i.json();
    if (!zt.isVtxoChainResponse(s))
      throw new Error("Invalid vtxo chain data received");
    return s;
  }
  async getVtxos(t) {
    if (t?.scripts && t?.outpoints)
      throw new Error("scripts and outpoints are mutually exclusive options");
    if (!t?.scripts && !t?.outpoints)
      throw new Error("Either scripts or outpoints must be provided");
    let r = `${this.serverUrl}/v1/indexer/vtxos`;
    const n = new URLSearchParams();
    t?.scripts && t.scripts.length > 0 && t.scripts.forEach((s) => {
      n.append("scripts", s);
    }), t?.outpoints && t.outpoints.length > 0 && t.outpoints.forEach((s) => {
      n.append("outpoints", `${s.txid}:${s.vout}`);
    }), t && (t.spendableOnly !== void 0 && n.append("spendableOnly", t.spendableOnly.toString()), t.spentOnly !== void 0 && n.append("spentOnly", t.spentOnly.toString()), t.recoverableOnly !== void 0 && n.append("recoverableOnly", t.recoverableOnly.toString()), t.pageIndex !== void 0 && n.append("page.index", t.pageIndex.toString()), t.pageSize !== void 0 && n.append("page.size", t.pageSize.toString())), n.toString() && (r += "?" + n.toString());
    const o = await fetch(r);
    if (!o.ok)
      throw new Error(`Failed to fetch vtxos: ${o.statusText}`);
    const i = await o.json();
    if (!zt.isVtxosResponse(i))
      throw new Error("Invalid vtxos data received");
    return {
      vtxos: i.vtxos.map(Fr),
      page: i.page
    };
  }
  async subscribeForScripts(t, r) {
    const n = `${this.serverUrl}/v1/indexer/script/subscribe`, o = await fetch(n, {
      headers: {
        "Content-Type": "application/json"
      },
      method: "POST",
      body: JSON.stringify({ scripts: t, subscriptionId: r })
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
  async unsubscribeForScripts(t, r) {
    const n = `${this.serverUrl}/v1/indexer/script/unsubscribe`, o = await fetch(n, {
      headers: {
        "Content-Type": "application/json"
      },
      method: "POST",
      body: JSON.stringify({ subscriptionId: t, scripts: r })
    });
    if (!o.ok) {
      const i = await o.text();
      console.warn(`Failed to unsubscribe to scripts: ${i}`);
    }
  }
};
function Fr(e) {
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
var zt;
(function(e) {
  function t(g) {
    return typeof g == "object" && typeof g.totalOutputAmount == "string" && typeof g.totalOutputVtxos == "number" && typeof g.expiresAt == "string" && typeof g.swept == "boolean";
  }
  function r(g) {
    return typeof g == "object" && typeof g.txid == "string" && typeof g.expiresAt == "string" && Object.values(vn).includes(g.type) && Array.isArray(g.spends) && g.spends.every((K) => typeof K == "string");
  }
  function n(g) {
    return typeof g == "object" && typeof g.startedAt == "string" && typeof g.endedAt == "string" && typeof g.totalInputAmount == "string" && typeof g.totalInputVtxos == "number" && typeof g.totalOutputAmount == "string" && typeof g.totalOutputVtxos == "number" && typeof g.batches == "object" && Object.values(g.batches).every(t);
  }
  e.isCommitmentTx = n;
  function o(g) {
    return typeof g == "object" && typeof g.txid == "string" && typeof g.vout == "number";
  }
  e.isOutpoint = o;
  function i(g) {
    return Array.isArray(g) && g.every(o);
  }
  e.isOutpointArray = i;
  function s(g) {
    return typeof g == "object" && typeof g.txid == "string" && typeof g.children == "object" && Object.values(g.children).every(f) && Object.keys(g.children).every((K) => Number.isInteger(Number(K)));
  }
  function c(g) {
    return Array.isArray(g) && g.every(s);
  }
  e.isTxsArray = c;
  function a(g) {
    return typeof g == "object" && typeof g.amount == "string" && typeof g.createdAt == "string" && typeof g.isSettled == "boolean" && typeof g.settledBy == "string" && Object.values(ks).includes(g.type) && (!g.commitmentTxid && typeof g.virtualTxid == "string" || typeof g.commitmentTxid == "string" && !g.virtualTxid);
  }
  function u(g) {
    return Array.isArray(g) && g.every(a);
  }
  e.isTxHistoryRecordArray = u;
  function f(g) {
    return typeof g == "string" && g.length === 64;
  }
  function d(g) {
    return Array.isArray(g) && g.every(f);
  }
  e.isTxidArray = d;
  function h(g) {
    return typeof g == "object" && o(g.outpoint) && typeof g.createdAt == "string" && (g.expiresAt === null || typeof g.expiresAt == "string") && typeof g.amount == "string" && typeof g.script == "string" && typeof g.isPreconfirmed == "boolean" && typeof g.isSwept == "boolean" && typeof g.isUnrolled == "boolean" && typeof g.isSpent == "boolean" && (!g.spentBy || typeof g.spentBy == "string") && (!g.settledBy || typeof g.settledBy == "string") && (!g.arkTxid || typeof g.arkTxid == "string") && Array.isArray(g.commitmentTxids) && g.commitmentTxids.every(f);
  }
  function p(g) {
    return typeof g == "object" && typeof g.current == "number" && typeof g.next == "number" && typeof g.total == "number";
  }
  function w(g) {
    return typeof g == "object" && Array.isArray(g.vtxoTree) && g.vtxoTree.every(s) && (!g.page || p(g.page));
  }
  e.isVtxoTreeResponse = w;
  function y(g) {
    return typeof g == "object" && Array.isArray(g.leaves) && g.leaves.every(o) && (!g.page || p(g.page));
  }
  e.isVtxoTreeLeavesResponse = y;
  function x(g) {
    return typeof g == "object" && Array.isArray(g.connectors) && g.connectors.every(s) && (!g.page || p(g.page));
  }
  e.isConnectorsResponse = x;
  function T(g) {
    return typeof g == "object" && Array.isArray(g.txids) && g.txids.every(f) && (!g.page || p(g.page));
  }
  e.isForfeitTxsResponse = T;
  function A(g) {
    return typeof g == "object" && Array.isArray(g.sweptBy) && g.sweptBy.every(f);
  }
  e.isSweptCommitmentTxResponse = A;
  function R(g) {
    return typeof g == "object" && Array.isArray(g.sweptBy) && g.sweptBy.every(f);
  }
  e.isBatchSweepTransactionsResponse = R;
  function C(g) {
    return typeof g == "object" && Array.isArray(g.txs) && g.txs.every((K) => typeof K == "string") && (!g.page || p(g.page));
  }
  e.isVirtualTxsResponse = C;
  function $(g) {
    return typeof g == "object" && Array.isArray(g.chain) && g.chain.every(r) && (!g.page || p(g.page));
  }
  e.isVtxoChainResponse = $;
  function V(g) {
    return typeof g == "object" && Array.isArray(g.vtxos) && g.vtxos.every(h) && (!g.page || p(g.page));
  }
  e.isVtxosResponse = V;
})(zt || (zt = {}));
let gw = class {
  constructor() {
    this.store = /* @__PURE__ */ new Map();
  }
  async getItem(t) {
    return this.store.get(t) ?? null;
  }
  async setItem(t, r) {
    this.store.set(t, r);
  }
  async removeItem(t) {
    this.store.delete(t);
  }
  async clear() {
    this.store.clear();
  }
};
const Kr = (e) => `vtxos:${e}`, Wr = (e) => `utxos:${e}`, Li = (e) => `tx:${e}`, Pa = "wallet:state", Do = (e) => e ? v.encode(e) : void 0, Hn = (e) => e ? v.decode(e) : void 0, Ho = ([e, t]) => ({
  cb: v.encode(Ot.encode(e)),
  s: v.encode(t)
}), _a = (e) => ({
  ...e,
  tapTree: Do(e.tapTree),
  forfeitTapLeafScript: Ho(e.forfeitTapLeafScript),
  intentTapLeafScript: Ho(e.intentTapLeafScript),
  extraWitness: e.extraWitness?.map(Do)
}), La = (e) => ({
  ...e,
  tapTree: Do(e.tapTree),
  forfeitTapLeafScript: Ho(e.forfeitTapLeafScript),
  intentTapLeafScript: Ho(e.intentTapLeafScript),
  extraWitness: e.extraWitness?.map(Do)
}), Fo = (e) => {
  const t = Ot.decode(Hn(e.cb)), r = Hn(e.s);
  return [t, r];
}, ww = (e) => ({
  ...e,
  createdAt: new Date(e.createdAt),
  tapTree: Hn(e.tapTree),
  forfeitTapLeafScript: Fo(e.forfeitTapLeafScript),
  intentTapLeafScript: Fo(e.intentTapLeafScript),
  extraWitness: e.extraWitness?.map(Hn)
}), yw = (e) => ({
  ...e,
  tapTree: Hn(e.tapTree),
  forfeitTapLeafScript: Fo(e.forfeitTapLeafScript),
  intentTapLeafScript: Fo(e.intentTapLeafScript),
  extraWitness: e.extraWitness?.map(Hn)
});
let Is = class {
  constructor(t) {
    this.storage = t;
  }
  async getVtxos(t) {
    const r = await this.storage.getItem(Kr(t));
    if (!r)
      return [];
    try {
      return JSON.parse(r).map(ww);
    } catch (n) {
      return console.error(`Failed to parse VTXOs for address ${t}:`, n), [];
    }
  }
  async saveVtxos(t, r) {
    const n = await this.getVtxos(t);
    for (const o of r) {
      const i = n.findIndex((s) => s.txid === o.txid && s.vout === o.vout);
      i !== -1 ? n[i] = o : n.push(o);
    }
    await this.storage.setItem(Kr(t), JSON.stringify(n.map(_a)));
  }
  async removeVtxo(t, r) {
    const n = await this.getVtxos(t), [o, i] = r.split(":"), s = n.filter((c) => !(c.txid === o && c.vout === parseInt(i, 10)));
    await this.storage.setItem(Kr(t), JSON.stringify(s.map(_a)));
  }
  async clearVtxos(t) {
    await this.storage.removeItem(Kr(t));
  }
  async getUtxos(t) {
    const r = await this.storage.getItem(Wr(t));
    if (!r)
      return [];
    try {
      return JSON.parse(r).map(yw);
    } catch (n) {
      return console.error(`Failed to parse UTXOs for address ${t}:`, n), [];
    }
  }
  async saveUtxos(t, r) {
    const n = await this.getUtxos(t);
    r.forEach((o) => {
      const i = n.findIndex((s) => s.txid === o.txid && s.vout === o.vout);
      i !== -1 ? n[i] = o : n.push(o);
    }), await this.storage.setItem(Wr(t), JSON.stringify(n.map(La)));
  }
  async removeUtxo(t, r) {
    const n = await this.getUtxos(t), [o, i] = r.split(":"), s = n.filter((c) => !(c.txid === o && c.vout === parseInt(i, 10)));
    await this.storage.setItem(Wr(t), JSON.stringify(s.map(La)));
  }
  async clearUtxos(t) {
    await this.storage.removeItem(Wr(t));
  }
  async getTransactionHistory(t) {
    const r = Li(t), n = await this.storage.getItem(r);
    if (!n)
      return [];
    try {
      return JSON.parse(n);
    } catch (o) {
      return console.error(`Failed to parse transactions for address ${t}:`, o), [];
    }
  }
  async saveTransactions(t, r) {
    const n = await this.getTransactionHistory(t);
    for (const o of r) {
      const i = n.findIndex((s) => s.key === o.key);
      i !== -1 ? n[i] = o : n.push(o);
    }
    await this.storage.setItem(Li(t), JSON.stringify(n));
  }
  async clearTransactions(t) {
    await this.storage.removeItem(Li(t));
  }
  async getWalletState() {
    const t = await this.storage.getItem(Pa);
    if (!t)
      return null;
    try {
      return JSON.parse(t);
    } catch (r) {
      return console.error("Failed to parse wallet state:", r), null;
    }
  }
  async saveWalletState(t) {
    await this.storage.setItem(Pa, JSON.stringify(t));
  }
};
const Vi = (e, t) => `contract:${e}:${t}`, Di = (e) => `collection:${e}`;
let mw = class {
  constructor(t) {
    this.storage = t;
  }
  async getContractData(t, r) {
    const n = await this.storage.getItem(Vi(t, r));
    if (!n)
      return null;
    try {
      return JSON.parse(n);
    } catch (o) {
      return console.error(`Failed to parse contract data for ${t}:${r}:`, o), null;
    }
  }
  async setContractData(t, r, n) {
    try {
      await this.storage.setItem(Vi(t, r), JSON.stringify(n));
    } catch (o) {
      throw console.error(`Failed to persist contract data for ${t}:${r}:`, o), o;
    }
  }
  async deleteContractData(t, r) {
    try {
      await this.storage.removeItem(Vi(t, r));
    } catch (n) {
      throw console.error(`Failed to remove contract data for ${t}:${r}:`, n), n;
    }
  }
  async getContractCollection(t) {
    const r = await this.storage.getItem(Di(t));
    if (!r)
      return [];
    try {
      return JSON.parse(r);
    } catch (n) {
      return console.error(`Failed to parse contract collection ${t}:`, n), [];
    }
  }
  async saveToContractCollection(t, r, n) {
    const o = await this.getContractCollection(t), i = r[n];
    if (i == null)
      throw new Error(`Item is missing required field '${String(n)}'`);
    const s = o.findIndex((a) => a[n] === i);
    let c;
    s !== -1 ? c = [
      ...o.slice(0, s),
      r,
      ...o.slice(s + 1)
    ] : c = [...o, r];
    try {
      await this.storage.setItem(Di(t), JSON.stringify(c));
    } catch (a) {
      throw console.error(`Failed to persist contract collection ${t}:`, a), a;
    }
  }
  async removeFromContractCollection(t, r, n) {
    if (r == null)
      throw new Error(`Invalid id provided for removal: ${String(r)}`);
    const i = (await this.getContractCollection(t)).filter((s) => s[n] !== r);
    try {
      await this.storage.setItem(Di(t), JSON.stringify(i));
    } catch (s) {
      throw console.error(`Failed to persist contract collection removal for ${t}:`, s), s;
    }
  }
  async clearContractData() {
    await this.storage.clear();
  }
};
function Fe(e, t) {
  return {
    ...t,
    forfeitTapLeafScript: e.offchainTapscript.forfeit(),
    intentTapLeafScript: e.offchainTapscript.forfeit(),
    tapTree: e.offchainTapscript.encode()
  };
}
function As(e, t) {
  return {
    ...t,
    forfeitTapLeafScript: e.boardingTapscript.forfeit(),
    intentTapLeafScript: e.boardingTapscript.forfeit(),
    tapTree: e.boardingTapscript.encode()
  };
}
function xw(e) {
  return typeof e == "object" && e !== null && "toReadonly" in e && typeof e.toReadonly == "function";
}
let io = class Bs {
  constructor(t, r, n, o, i, s, c, a, u, f) {
    this.identity = t, this.network = r, this.onchainProvider = n, this.indexerProvider = o, this.arkServerPublicKey = i, this.offchainTapscript = s, this.boardingTapscript = c, this.dustAmount = a, this.walletRepository = u, this.contractRepository = f;
  }
  /**
   * Protected helper to set up shared wallet configuration.
   * Extracts common logic used by both ReadonlyWallet.create() and Wallet.create().
   */
  static async setupWalletConfig(t, r) {
    const n = t.arkProvider || (() => {
      if (!t.arkServerUrl)
        throw new Error("Either arkProvider or arkServerUrl must be provided");
      return new Bd(t.arkServerUrl);
    })(), o = t.arkServerUrl || n.serverUrl;
    if (!o)
      throw new Error("Could not determine arkServerUrl from provider");
    const i = t.indexerUrl || o, s = t.indexerProvider || new Ud(i), c = await n.getInfo(), a = Fg(c.network), u = t.esploraUrl || Wg[c.network], f = t.onchainProvider || new Mg(u);
    if (t.exitTimelock) {
      const { value: C, type: $ } = t.exitTimelock;
      if (C < 512n && $ !== "blocks" || C >= 512n && $ !== "seconds")
        throw new Error("invalid exitTimelock");
    }
    const d = t.exitTimelock ?? {
      value: c.unilateralExitDelay,
      type: c.unilateralExitDelay < 512n ? "blocks" : "seconds"
    };
    if (t.boardingTimelock) {
      const { value: C, type: $ } = t.boardingTimelock;
      if (C < 512n && $ !== "blocks" || C >= 512n && $ !== "seconds")
        throw new Error("invalid boardingTimelock");
    }
    const h = t.boardingTimelock ?? {
      value: c.boardingExitDelay,
      type: c.boardingExitDelay < 512n ? "blocks" : "seconds"
    }, p = v.decode(c.signerPubkey).slice(1), w = new Vo.Script({
      pubKey: r,
      serverPubKey: p,
      csvTimelock: d
    }), y = new Vo.Script({
      pubKey: r,
      serverPubKey: p,
      csvTimelock: h
    }), x = w, T = t.storage || new gw(), A = new Is(T), R = new mw(T);
    return {
      arkProvider: n,
      indexerProvider: s,
      onchainProvider: f,
      network: a,
      networkName: c.network,
      serverPubKey: p,
      offchainTapscript: x,
      boardingTapscript: y,
      dustAmount: c.dust,
      walletRepository: A,
      contractRepository: R,
      info: c
    };
  }
  static async create(t) {
    const r = await t.identity.xOnlyPublicKey();
    if (!r)
      throw new Error("Invalid configured public key");
    const n = await Bs.setupWalletConfig(t, r);
    return new Bs(t.identity, n.network, n.onchainProvider, n.indexerProvider, n.serverPubKey, n.offchainTapscript, n.boardingTapscript, n.dustAmount, n.walletRepository, n.contractRepository);
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
    const [t, r] = await Promise.all([
      this.getBoardingUtxos(),
      this.getVtxos()
    ]);
    let n = 0, o = 0;
    for (const f of t)
      f.status.confirmed ? n += f.value : o += f.value;
    let i = 0, s = 0, c = 0;
    i = r.filter((f) => f.virtualStatus.state === "settled").reduce((f, d) => f + d.value, 0), s = r.filter((f) => f.virtualStatus.state === "preconfirmed").reduce((f, d) => f + d.value, 0), c = r.filter((f) => Te(f) && f.virtualStatus.state === "swept").reduce((f, d) => f + d.value, 0);
    const a = n + o, u = i + s + c;
    return {
      boarding: {
        confirmed: n,
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
    const r = await this.getAddress(), o = (await this.getVirtualCoins(t)).map((i) => Fe(this, i));
    return await this.walletRepository.saveVtxos(r, o), o;
  }
  async getVirtualCoins(t = { withRecoverable: !0, withUnrolled: !1 }) {
    const r = [v.encode(this.offchainTapscript.pkScript)], o = (await this.indexerProvider.getVtxos({ scripts: r })).vtxos;
    let i = o.filter(Te);
    if (t.withRecoverable || (i = i.filter((s) => !yc(s) && !kd(s))), t.withUnrolled) {
      const s = o.filter((c) => !Te(c));
      i.push(...s.filter((c) => c.isUnrolled));
    }
    return i;
  }
  async getTransactionHistory() {
    const t = await this.indexerProvider.getVtxos({
      scripts: [v.encode(this.offchainTapscript.pkScript)]
    }), { boardingTxs: r, commitmentsToIgnore: n } = await this.getBoardingTxs(), o = [], i = [];
    for (const a of t.vtxos)
      Te(a) ? o.push(a) : i.push(a);
    const s = Rd(o, i, n), c = [...r, ...s];
    return c.sort(
      // place createdAt = 0 (unconfirmed txs) first, then descending
      (a, u) => a.createdAt === 0 ? -1 : u.createdAt === 0 ? 1 : u.createdAt - a.createdAt
    ), c;
  }
  async getBoardingTxs() {
    const t = [], r = /* @__PURE__ */ new Set(), n = await this.getBoardingAddress(), o = await this.onchainProvider.getTransactions(n);
    for (const c of o)
      for (let a = 0; a < c.vout.length; a++) {
        const u = c.vout[a];
        if (u.scriptpubkey_address === n) {
          const d = (await this.onchainProvider.getTxOutspends(c.txid))[a];
          d?.spent && r.add(d.txid), t.push({
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
        type: Dn.TxReceived,
        settled: c.virtualStatus.state === "spent",
        createdAt: c.status.block_time ? new Date(c.status.block_time * 1e3).getTime() : 0
      };
      c.status.block_time ? s.push(a) : i.push(a);
    }
    return {
      boardingTxs: [...i, ...s],
      commitmentsToIgnore: r
    };
  }
  async getBoardingUtxos() {
    const t = await this.getBoardingAddress(), n = (await this.onchainProvider.getCoins(t)).map((o) => As(this, o));
    return await this.walletRepository.saveUtxos(t, n), n;
  }
  async notifyIncomingFunds(t) {
    const r = await this.getAddress(), n = await this.getBoardingAddress();
    let o, i;
    if (this.onchainProvider && n) {
      const c = (a) => a.vout.findIndex((u) => u.scriptpubkey_address === n);
      o = await this.onchainProvider.watchAddresses([n], (a) => {
        const u = a.filter((f) => c(f) !== -1).map((f) => {
          const { txid: d, status: h } = f, p = c(f), w = Number(f.vout[p].value);
          return { txid: d, vout: p, value: w, status: h };
        });
        t({
          type: "utxo",
          coins: u
        });
      });
    }
    if (this.indexerProvider && r) {
      const c = this.offchainTapscript, a = await this.indexerProvider.subscribeForScripts([
        v.encode(c.pkScript)
      ]), u = new AbortController(), f = this.indexerProvider.getSubscription(a, u.signal);
      i = async () => {
        u.abort(), await this.indexerProvider?.unsubscribeForScripts(a);
      }, (async () => {
        try {
          for await (const d of f)
            (d.newVtxos?.length > 0 || d.spentVtxos?.length > 0) && t({
              type: "vtxo",
              newVtxos: d.newVtxos.map((h) => Fe(this, h)),
              spentVtxos: d.spentVtxos.map((h) => Fe(this, h))
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
    const t = [v.encode(this.offchainTapscript.pkScript)];
    let { vtxos: r } = await this.indexerProvider.getVtxos({
      scripts: t
    });
    return r.filter((n) => n.virtualStatus.state !== "swept" && n.virtualStatus.state !== "settled" && n.arkTxId !== void 0).map((n) => n.arkTxId);
  }
}, Ko = class Nd extends io {
  constructor(t, r, n, o, i, s, c, a, u, f, d, h, p, w, y, x) {
    super(t, r, o, s, c, a, u, p, w, y), this.networkName = n, this.arkProvider = i, this.serverUnrollScript = f, this.forfeitOutputScript = d, this.forfeitPubkey = h, this.identity = t, this.renewalConfig = {
      enabled: x?.enabled ?? !1,
      ...dw,
      ...x
    };
  }
  static async create(t) {
    const r = await t.identity.xOnlyPublicKey();
    if (!r)
      throw new Error("Invalid configured public key");
    const n = await io.setupWalletConfig(t, r);
    let o;
    try {
      const a = v.decode(n.info.checkpointTapscript);
      o = Ct.decode(a);
    } catch {
      throw new Error("Invalid checkpointTapscript from server");
    }
    const i = v.decode(n.info.forfeitPubkey).slice(1), s = de(n.network).decode(n.info.forfeitAddress), c = ct.encode(s);
    return new Nd(t.identity, n.network, n.networkName, n.onchainProvider, n.arkProvider, n.indexerProvider, n.serverPubKey, n.offchainTapscript, n.boardingTapscript, o, c, i, n.dustAmount, n.walletRepository, n.contractRepository, t.renewalConfig);
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
    const t = xw(this.identity) ? await this.identity.toReadonly() : this.identity;
    return new io(t, this.network, this.onchainProvider, this.indexerProvider, this.arkServerPublicKey, this.offchainTapscript, this.boardingTapscript, this.dustAmount, this.walletRepository, this.contractRepository);
  }
  async sendBitcoin(t) {
    if (t.amount <= 0)
      throw new Error("Amount must be positive");
    if (!Ew(t.address))
      throw new Error("Invalid Ark address " + t.address);
    const r = await this.getVirtualCoins({
      withRecoverable: !1
    });
    let n;
    if (t.selectedVtxos) {
      const w = t.selectedVtxos.map((x) => x.value).reduce((x, T) => x + T, 0);
      if (w < t.amount)
        throw new Error("Selected VTXOs do not cover specified amount");
      const y = w - t.amount;
      n = {
        inputs: t.selectedVtxos,
        changeAmount: BigInt(y)
      };
    } else
      n = Sw(r, t.amount);
    const o = this.offchainTapscript.forfeit();
    if (!o)
      throw new Error("Selected leaf not found");
    const i = Po.decode(t.address), c = [
      {
        script: BigInt(t.amount) < this.dustAmount ? i.subdustPkScript : i.pkScript,
        amount: BigInt(t.amount)
      }
    ];
    if (n.changeAmount > 0n) {
      const w = n.changeAmount < this.dustAmount ? this.arkAddress.subdustPkScript : this.arkAddress.pkScript;
      c.push({
        script: w,
        amount: BigInt(n.changeAmount)
      });
    }
    const a = this.offchainTapscript.encode(), u = sw(n.inputs.map((w) => ({
      ...w,
      tapLeafScript: o,
      tapTree: a
    })), c, this.serverUnrollScript), f = await this.identity.sign(u.arkTx), { arkTxid: d, signedCheckpointTxs: h } = await this.arkProvider.submitTx(q.encode(f.toPSBT()), u.checkpoints.map((w) => q.encode(w.toPSBT()))), p = await Promise.all(h.map(async (w) => {
      const y = at.fromPSBT(q.decode(w)), x = await this.identity.sign(y);
      return q.encode(x.toPSBT());
    }));
    await this.arkProvider.finalizeTx(d, p);
    try {
      const w = [], y = /* @__PURE__ */ new Set();
      let x = Number.MAX_SAFE_INTEGER;
      for (const [R, C] of n.inputs.entries()) {
        const $ = Fe(this, C), V = h[R], g = at.fromPSBT(q.decode(V));
        if (w.push({
          ...$,
          virtualStatus: { ...$.virtualStatus, state: "spent" },
          spentBy: g.id,
          arkTxId: d,
          isSpent: !0
        }), $.virtualStatus.commitmentTxIds)
          for (const K of $.virtualStatus.commitmentTxIds)
            y.add(K);
        $.virtualStatus.batchExpiry && (x = Math.min(x, $.virtualStatus.batchExpiry));
      }
      const T = Date.now(), A = this.arkAddress.encode();
      if (n.changeAmount > 0n && x !== Number.MAX_SAFE_INTEGER) {
        const R = {
          txid: d,
          vout: c.length - 1,
          createdAt: new Date(T),
          forfeitTapLeafScript: this.offchainTapscript.forfeit(),
          intentTapLeafScript: this.offchainTapscript.forfeit(),
          isUnrolled: !1,
          isSpent: !1,
          tapTree: this.offchainTapscript.encode(),
          value: Number(n.changeAmount),
          virtualStatus: {
            state: "preconfirmed",
            commitmentTxIds: Array.from(y),
            batchExpiry: x
          },
          status: {
            confirmed: !1
          }
        };
        await this.walletRepository.saveVtxos(A, [R]);
      }
      await this.walletRepository.saveVtxos(A, w), await this.walletRepository.saveTransactions(A, [
        {
          key: {
            boardingTxid: "",
            commitmentTxid: "",
            arkTxid: d
          },
          amount: t.amount,
          type: Dn.TxSent,
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
  async settle(t, r) {
    if (t?.inputs) {
      for (const w of t.inputs)
        if (typeof w == "string")
          try {
            He.fromString(w);
          } catch {
            throw new Error(`Invalid arknote "${w}"`);
          }
    }
    if (!t) {
      let w = 0;
      const x = Ct.decode(v.decode(this.boardingTapscript.exitScript)).params.timelock, T = (await this.getBoardingUtxos()).filter((C) => !uw(C, x));
      w += T.reduce((C, $) => C + $.value, 0);
      const A = await this.getVtxos({ withRecoverable: !0 });
      w += A.reduce((C, $) => C + $.value, 0);
      const R = [...T, ...A];
      if (R.length === 0)
        throw new Error("No inputs found");
      t = {
        inputs: R,
        outputs: [
          {
            address: await this.getAddress(),
            amount: BigInt(w)
          }
        ]
      };
    }
    const n = [], o = [];
    let i = !1;
    for (const [w, y] of t.outputs.entries()) {
      let x;
      try {
        x = Po.decode(y.address).pkScript, i = !0;
      } catch {
        const T = de(this.network).decode(y.address);
        x = ct.encode(T), n.push(w);
      }
      o.push({
        amount: y.amount,
        script: x
      });
    }
    let s;
    const c = [];
    i && (s = this.identity.signerSession(), c.push(v.encode(await s.getPublicKey())));
    const [a, u] = await Promise.all([
      this.makeRegisterIntentSignature(t.inputs, o, n, c),
      this.makeDeleteIntentSignature(t.inputs)
    ]), f = await this.safeRegisterIntent(a), d = [
      ...c,
      ...t.inputs.map((w) => `${w.txid}:${w.vout}`)
    ], h = this.createBatchHandler(f, t.inputs, s), p = new AbortController();
    try {
      const w = this.arkProvider.getEventStream(p.signal, d);
      return await vs.join(w, h, {
        abortController: p,
        skipVtxoTreeSigning: !i,
        eventCallback: r ? (y) => Promise.resolve(r(y)) : void 0
      });
    } catch (w) {
      throw await this.arkProvider.deleteIntent(u).catch(() => {
      }), w;
    } finally {
      p.abort();
    }
  }
  async handleSettlementFinalizationEvent(t, r, n, o) {
    const i = [], s = await this.getVirtualCoins();
    let c = at.fromPSBT(q.decode(t.commitmentTx)), a = !1, u = 0;
    const f = o?.leaves() || [];
    for (const d of r) {
      const h = s.find((R) => R.txid === d.txid && R.vout === d.vout);
      if (!h) {
        for (let R = 0; R < c.inputsLength; R++) {
          const C = c.getInput(R);
          if (!C.txid || C.index === void 0)
            throw new Error("The server returned incomplete data. No settlement input found in the PSBT");
          if (v.encode(C.txid) === d.txid && C.index === d.vout) {
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
      if (yc(h) || Id(h, this.dustAmount))
        continue;
      if (f.length === 0)
        throw new Error("connectors not received");
      if (u >= f.length)
        throw new Error("not enough connectors received");
      const p = f[u], w = p.id, y = p.getOutput(0);
      if (!y)
        throw new Error("connector output not found");
      const x = y.amount, T = y.script;
      if (!x || !T)
        throw new Error("invalid connector output");
      u++;
      let A = Yg([
        {
          txid: d.txid,
          index: d.vout,
          witnessUtxo: {
            amount: BigInt(h.value),
            script: pe.decode(d.tapTree).pkScript
          },
          sighashType: Kt.DEFAULT,
          tapLeafScript: [d.forfeitTapLeafScript]
        },
        {
          txid: w,
          index: 0,
          witnessUtxo: {
            amount: x,
            script: T
          }
        }
      ], n);
      A = await this.identity.sign(A, [0]), i.push(q.encode(A.toPSBT()));
    }
    (i.length > 0 || a) && await this.arkProvider.submitSignedForfeitTxs(i, a ? q.encode(c.toPSBT()) : void 0);
  }
  /**
   * @implements Batch.Handler interface.
   * @param intentId - The intent ID.
   * @param inputs - The inputs of the intent.
   * @param session - The musig2 signing session, if not provided, the signing will be skipped.
   */
  createBatchHandler(t, r, n) {
    let o;
    return {
      onBatchStarted: async (i) => {
        const s = new TextEncoder().encode(t), c = mt(s), a = v.encode(c);
        let u = !0;
        for (const d of i.intentIdHashes)
          if (d === a) {
            if (!this.arkProvider)
              throw new Error("Ark provider not configured");
            await this.arkProvider.confirmRegistration(t), u = !1;
          }
        if (u)
          return { skip: u };
        const f = Ct.encode({
          timelock: {
            value: i.batchExpiry,
            type: i.batchExpiry >= 512n ? "seconds" : "blocks"
          },
          pubkeys: [this.forfeitPubkey]
        }).script;
        return o = En(f), { skip: !1 };
      },
      onTreeSigningStarted: async (i, s) => {
        if (!n)
          return { skip: !0 };
        if (!o)
          throw new Error("Sweep tap tree root not set");
        const c = i.cosignersPublicKeys.map((w) => w.slice(2)), u = (await n.getPublicKey()).subarray(1);
        if (!c.includes(v.encode(u)))
          return { skip: !0 };
        const f = at.fromPSBT(q.decode(i.unsignedCommitmentTx));
        iw(s, f, o);
        const d = f.getOutput(0);
        if (!d?.amount)
          throw new Error("Shared output not found");
        await n.init(s, o, d.amount);
        const h = v.encode(await n.getPublicKey()), p = await n.getNonces();
        return await this.arkProvider.submitTreeNonces(i.id, h, p), { skip: !1 };
      },
      onTreeNonces: async (i) => {
        if (!n)
          return { fullySigned: !0 };
        const { hasAllNonces: s } = await n.aggregatedNonces(i.txid, i.nonces);
        if (!s)
          return { fullySigned: !1 };
        const c = await n.sign(), a = v.encode(await n.getPublicKey());
        return await this.arkProvider.submitTreeSignatures(i.id, a, c), { fullySigned: !0 };
      },
      onBatchFinalization: async (i, s, c) => {
        if (!this.forfeitOutputScript)
          throw new Error("Forfeit output script not set");
        c && ow(i.commitmentTx, c), await this.handleSettlementFinalizationEvent(i, r, this.forfeitOutputScript, c);
      }
    };
  }
  async safeRegisterIntent(t) {
    try {
      return await this.arkProvider.registerIntent(t);
    } catch (r) {
      if (r instanceof Ad && r.code === 0 && r.message.includes("duplicated input")) {
        const n = await this.getVtxos({
          withRecoverable: !0
        }), o = await this.makeDeleteIntentSignature(n);
        return await this.arkProvider.deleteIntent(o), this.arkProvider.registerIntent(t);
      }
      throw r;
    }
  }
  async makeRegisterIntentSignature(t, r, n, o) {
    const i = this.prepareIntentProofInputs(t), s = {
      type: "register",
      onchain_output_indexes: n,
      valid_at: 0,
      expire_at: 0,
      cosigners_public_keys: o
    }, c = De.create(s, i, r), a = await this.identity.sign(c);
    return {
      proof: q.encode(a.toPSBT()),
      message: s
    };
  }
  async makeDeleteIntentSignature(t) {
    const r = this.prepareIntentProofInputs(t), n = {
      type: "delete",
      expire_at: 0
    }, o = De.create(n, r, []), i = await this.identity.sign(o);
    return {
      proof: q.encode(i.toPSBT()),
      message: n
    };
  }
  async makeGetPendingTxIntentSignature(t) {
    const r = this.prepareIntentProofInputs(t), n = {
      type: "get-pending-tx",
      expire_at: 0
    }, o = De.create(n, r, []), i = await this.identity.sign(o);
    return {
      proof: q.encode(i.toPSBT()),
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
      const i = [v.encode(this.offchainTapscript.pkScript)];
      let { vtxos: s } = await this.indexerProvider.getVtxos({
        scripts: i
      });
      if (s = s.filter((c) => c.virtualStatus.state !== "swept" && c.virtualStatus.state !== "settled"), s.length === 0)
        return { finalized: [], pending: [] };
      t = s.map((c) => Fe(this, c));
    }
    const n = [], o = [];
    for (let i = 0; i < t.length; i += 20) {
      const s = t.slice(i, i + 20), c = await this.makeGetPendingTxIntentSignature(s), a = await this.arkProvider.getPendingTxs(c);
      for (const u of a) {
        o.push(u.arkTxid);
        try {
          const f = await Promise.all(u.signedCheckpointTxs.map(async (d) => {
            const h = at.fromPSBT(q.decode(d)), p = await this.identity.sign(h);
            return q.encode(p.toPSBT());
          }));
          await this.arkProvider.finalizeTx(u.arkTxid, f), n.push(u.arkTxid);
        } catch (f) {
          console.error(`Failed to finalize transaction ${u.arkTxid}:`, f);
        }
      }
    }
    return { finalized: n, pending: o };
  }
  prepareIntentProofInputs(t) {
    const r = [];
    for (const n of t) {
      const o = pe.decode(n.tapTree), i = bw(n.intentTapLeafScript), s = [Ed.encode(n.tapTree)];
      n.extraWitness && s.push(wg.encode(n.extraWitness)), r.push({
        txid: v.decode(n.txid),
        index: n.vout,
        witnessUtxo: {
          amount: BigInt(n.value),
          script: o.pkScript
        },
        sequence: i,
        tapLeafScript: [n.intentTapLeafScript],
        unknown: s
      });
    }
    return r;
  }
};
Ko.MIN_FEE_RATE = 1;
function bw(e) {
  let t;
  try {
    const r = e[1], n = r.subarray(0, r.length - 1);
    try {
      const o = Ct.decode(n).params;
      t = Ln.encode(o.timelock.type === "blocks" ? { blocks: Number(o.timelock.value) } : { seconds: Number(o.timelock.value) });
    } catch {
      const o = Vn.decode(n).params;
      t = Number(o.absoluteTimelock);
    }
  } catch {
  }
  return t;
}
function Ew(e) {
  try {
    return Po.decode(e), !0;
  } catch {
    return !1;
  }
}
function Sw(e, t) {
  const r = [...e].sort((s, c) => {
    const a = s.virtualStatus.batchExpiry || Number.MAX_SAFE_INTEGER, u = c.virtualStatus.batchExpiry || Number.MAX_SAFE_INTEGER;
    return a !== u ? a - u : c.value - s.value;
  }), n = [];
  let o = 0;
  for (const s of r)
    if (n.push(s), o += s.value, o >= t)
      break;
  if (o === t)
    return { inputs: n, changeAmount: 0n };
  if (o < t)
    throw new Error("Insufficient funds");
  const i = BigInt(o - t);
  return {
    inputs: n,
    changeAmount: i
  };
}
class Tw {
  constructor(t, r = 1) {
    this.db = null, this.dbName = t, this.version = r;
  }
  async getDB() {
    if (this.db)
      return this.db;
    const t = typeof window > "u" ? self : window;
    if (!(t && "indexedDB" in t))
      throw new Error("IndexedDB is not available in this environment");
    return new Promise((r, n) => {
      const o = t.indexedDB.open(this.dbName, this.version);
      o.onerror = () => n(o.error), o.onsuccess = () => {
        this.db = o.result, r(this.db);
      }, o.onupgradeneeded = () => {
        const i = o.result;
        i.objectStoreNames.contains("storage") || i.createObjectStore("storage");
      };
    });
  }
  async getItem(t) {
    try {
      const r = await this.getDB();
      return new Promise((n, o) => {
        const c = r.transaction(["storage"], "readonly").objectStore("storage").get(t);
        c.onerror = () => o(c.error), c.onsuccess = () => {
          n(c.result || null);
        };
      });
    } catch (r) {
      return console.error(`Failed to get item for key ${t}:`, r), null;
    }
  }
  async setItem(t, r) {
    try {
      const n = await this.getDB();
      return new Promise((o, i) => {
        const a = n.transaction(["storage"], "readwrite").objectStore("storage").put(r, t);
        a.onerror = () => i(a.error), a.onsuccess = () => o();
      });
    } catch (n) {
      throw console.error(`Failed to set item for key ${t}:`, n), n;
    }
  }
  async removeItem(t) {
    try {
      const r = await this.getDB();
      return new Promise((n, o) => {
        const c = r.transaction(["storage"], "readwrite").objectStore("storage").delete(t);
        c.onerror = () => o(c.error), c.onsuccess = () => n();
      });
    } catch (r) {
      console.error(`Failed to remove item for key ${t}:`, r);
    }
  }
  async clear() {
    try {
      const t = await this.getDB();
      return new Promise((r, n) => {
        const s = t.transaction(["storage"], "readwrite").objectStore("storage").clear();
        s.onerror = () => n(s.error), s.onsuccess = () => r();
      });
    } catch (t) {
      console.error("Failed to clear storage:", t);
    }
  }
}
const vw = "arkade-service-worker";
async function kw(e) {
  if (!("serviceWorker" in navigator))
    throw new Error("Service workers are not supported in this browser");
  const t = await navigator.serviceWorker.register(e);
  await t.update();
  const r = t.active || t.waiting || t.installing;
  if (!r)
    throw new Error("Failed to get service worker instance");
  return new Promise((n, o) => {
    if (r.state === "activated")
      return n(r);
    const i = () => {
      a(), n(r);
    }, s = () => {
      a(), o(new Error("Service worker failed to activate"));
    }, c = setTimeout(() => {
      a(), o(new Error("Service worker activation timed out"));
    }, 1e4), a = () => {
      navigator.serviceWorker.removeEventListener("activate", i), navigator.serviceWorker.removeEventListener("error", s), clearTimeout(c);
    };
    navigator.serviceWorker.addEventListener("activate", i), navigator.serviceWorker.addEventListener("error", s);
  });
}
var Va;
(function(e) {
  function t(y) {
    return typeof y == "object" && y !== null && "type" in y;
  }
  e.isBase = t;
  function r(y) {
    return y.type === "INIT_WALLET" && "arkServerUrl" in y && typeof y.arkServerUrl == "string" && ("arkServerPublicKey" in y ? y.arkServerPublicKey === void 0 || typeof y.arkServerPublicKey == "string" : !0);
  }
  e.isInitWallet = r;
  function n(y) {
    return y.type === "SETTLE";
  }
  e.isSettle = n;
  function o(y) {
    return y.type === "GET_ADDRESS";
  }
  e.isGetAddress = o;
  function i(y) {
    return y.type === "GET_BOARDING_ADDRESS";
  }
  e.isGetBoardingAddress = i;
  function s(y) {
    return y.type === "GET_BALANCE";
  }
  e.isGetBalance = s;
  function c(y) {
    return y.type === "GET_VTXOS";
  }
  e.isGetVtxos = c;
  function a(y) {
    return y.type === "GET_VIRTUAL_COINS";
  }
  e.isGetVirtualCoins = a;
  function u(y) {
    return y.type === "GET_BOARDING_UTXOS";
  }
  e.isGetBoardingUtxos = u;
  function f(y) {
    return y.type === "SEND_BITCOIN" && "params" in y && y.params !== null && typeof y.params == "object" && "address" in y.params && typeof y.params.address == "string" && "amount" in y.params && typeof y.params.amount == "number";
  }
  e.isSendBitcoin = f;
  function d(y) {
    return y.type === "GET_TRANSACTION_HISTORY";
  }
  e.isGetTransactionHistory = d;
  function h(y) {
    return y.type === "GET_STATUS";
  }
  e.isGetStatus = h;
  function p(y) {
    return y.type === "CLEAR";
  }
  e.isClear = p;
  function w(y) {
    return y.type === "RELOAD_WALLET";
  }
  e.isReloadWallet = w;
})(Va || (Va = {}));
function Da() {
  const e = crypto.getRandomValues(new Uint8Array(16));
  return v.encode(e);
}
var Ha;
(function(e) {
  e.walletInitialized = (l) => ({
    type: "WALLET_INITIALIZED",
    success: !0,
    id: l
  });
  function t(l, b) {
    return {
      type: "ERROR",
      success: !1,
      message: b,
      id: l
    };
  }
  e.error = t;
  function r(l, b) {
    return {
      type: "SETTLE_EVENT",
      success: !0,
      event: b,
      id: l
    };
  }
  e.settleEvent = r;
  function n(l, b) {
    return {
      type: "SETTLE_SUCCESS",
      success: !0,
      txid: b,
      id: l
    };
  }
  e.settleSuccess = n;
  function o(l) {
    return l.type === "SETTLE_SUCCESS" && l.success;
  }
  e.isSettleSuccess = o;
  function i(l) {
    return l.type === "ADDRESS" && l.success === !0;
  }
  e.isAddress = i;
  function s(l) {
    return l.type === "BOARDING_ADDRESS" && l.success === !0;
  }
  e.isBoardingAddress = s;
  function c(l, b) {
    return {
      type: "ADDRESS",
      success: !0,
      address: b,
      id: l
    };
  }
  e.address = c;
  function a(l, b) {
    return {
      type: "BOARDING_ADDRESS",
      success: !0,
      address: b,
      id: l
    };
  }
  e.boardingAddress = a;
  function u(l) {
    return l.type === "BALANCE" && l.success === !0;
  }
  e.isBalance = u;
  function f(l, b) {
    return {
      type: "BALANCE",
      success: !0,
      balance: b,
      id: l
    };
  }
  e.balance = f;
  function d(l) {
    return l.type === "VTXOS" && l.success === !0;
  }
  e.isVtxos = d;
  function h(l, b) {
    return {
      type: "VTXOS",
      success: !0,
      vtxos: b,
      id: l
    };
  }
  e.vtxos = h;
  function p(l) {
    return l.type === "VIRTUAL_COINS" && l.success === !0;
  }
  e.isVirtualCoins = p;
  function w(l, b) {
    return {
      type: "VIRTUAL_COINS",
      success: !0,
      virtualCoins: b,
      id: l
    };
  }
  e.virtualCoins = w;
  function y(l) {
    return l.type === "BOARDING_UTXOS" && l.success === !0;
  }
  e.isBoardingUtxos = y;
  function x(l, b) {
    return {
      type: "BOARDING_UTXOS",
      success: !0,
      boardingUtxos: b,
      id: l
    };
  }
  e.boardingUtxos = x;
  function T(l) {
    return l.type === "SEND_BITCOIN_SUCCESS" && l.success === !0;
  }
  e.isSendBitcoinSuccess = T;
  function A(l, b) {
    return {
      type: "SEND_BITCOIN_SUCCESS",
      success: !0,
      txid: b,
      id: l
    };
  }
  e.sendBitcoinSuccess = A;
  function R(l) {
    return l.type === "TRANSACTION_HISTORY" && l.success === !0;
  }
  e.isTransactionHistory = R;
  function C(l, b) {
    return {
      type: "TRANSACTION_HISTORY",
      success: !0,
      transactions: b,
      id: l
    };
  }
  e.transactionHistory = C;
  function $(l) {
    return l.type === "WALLET_STATUS" && l.success === !0;
  }
  e.isWalletStatus = $;
  function V(l, b, k) {
    return {
      type: "WALLET_STATUS",
      success: !0,
      status: {
        walletInitialized: b,
        xOnlyPublicKey: k
      },
      id: l
    };
  }
  e.walletStatus = V;
  function g(l) {
    return l.type === "CLEAR_RESPONSE";
  }
  e.isClearResponse = g;
  function K(l, b) {
    return {
      type: "CLEAR_RESPONSE",
      success: b,
      id: l
    };
  }
  e.clearResponse = K;
  function _(l) {
    return l.type === "WALLET_RELOADED";
  }
  e.isWalletReloaded = _;
  function z(l, b) {
    return {
      type: "WALLET_RELOADED",
      success: b,
      id: l
    };
  }
  e.walletReloaded = z;
  function I(l) {
    return l.type === "VTXO_UPDATE";
  }
  e.isVtxoUpdate = I;
  function S(l, b) {
    return {
      type: "VTXO_UPDATE",
      id: Da(),
      // spontaneous update, not tied to a request
      success: !0,
      spentVtxos: b,
      newVtxos: l
    };
  }
  e.vtxoUpdate = S;
  function m(l) {
    return l.type === "UTXO_UPDATE";
  }
  e.isUtxoUpdate = m;
  function E(l) {
    return {
      type: "UTXO_UPDATE",
      id: Da(),
      // spontaneous update, not tied to a request
      success: !0,
      coins: l
    };
  }
  e.utxoUpdate = E;
})(Ha || (Ha = {}));
class Cd {
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
class Iw extends Cd {
  constructor(t) {
    super(t), this.wallet = t;
  }
  async handleReload(t) {
    return this.wallet.finalizePendingTxs(t.filter((r) => r.virtualStatus.state !== "swept" && r.virtualStatus.state !== "settled"));
  }
  async handleSettle(...t) {
    return this.wallet.settle(...t);
  }
  async handleSendBitcoin(...t) {
    return this.wallet.sendBitcoin(...t);
  }
}
class xr {
  constructor(t = vw, r = 1) {
    this.dbName = t, this.dbVersion = r, this.messagePrefix = xr.messagePrefix, this.onNextTick = [], this.storage = new Tw(t, r), this.walletRepository = new Is(this.storage);
  }
  // lifecycle methods
  async start() {
  }
  async stop() {
  }
  async tick(t) {
    const r = await Promise.allSettled(this.onNextTick.map((n) => n()));
    return this.onNextTick = [], r.map((n) => n.status === "fulfilled" ? n.value : (console.error(`[${xr.messagePrefix}] tick failed`, n.reason), null)).filter((n) => n !== null);
  }
  scheduleForNextTick(t) {
    this.onNextTick.push(t);
  }
  prefixed(t) {
    return {
      ...t,
      prefix: this.messagePrefix
    };
  }
  async handleMessage(t) {
    const r = t.id;
    if (console.log(`[${this.messagePrefix}] handleMessage`, t), t.type === "INIT_WALLET")
      return await this.handleInitWallet(t), this.prefixed({
        id: r,
        type: "WALLET_INITIALIZED"
      });
    if (!this.handler)
      return this.prefixed({
        id: r,
        error: new Error("Wallet handler not initialized")
      });
    try {
      switch (t.type) {
        case "SETTLE": {
          const n = await this.handleSettle(t);
          return this.prefixed({
            id: r,
            ...n
          });
        }
        case "SEND_BITCOIN": {
          const n = await this.handleSendBitcoin(t);
          return this.prefixed({
            id: r,
            ...n
          });
        }
        case "GET_ADDRESS": {
          const n = await this.handler.getAddress();
          return this.prefixed({
            id: r,
            type: "ADDRESS",
            payload: { address: n }
          });
        }
        case "GET_BOARDING_ADDRESS": {
          const n = await this.handler.getBoardingAddress();
          return this.prefixed({
            id: r,
            type: "BOARDING_ADDRESS",
            payload: { address: n }
          });
        }
        case "GET_BALANCE": {
          const n = await this.handleGetBalance();
          return this.prefixed({
            id: r,
            type: "BALANCE",
            payload: n
          });
        }
        case "GET_VTXOS": {
          const n = await this.handleGetVtxos(t);
          return {
            prefix: this.messagePrefix,
            id: r,
            type: "VTXOS",
            payload: { vtxos: n }
          };
        }
        case "GET_BOARDING_UTXOS": {
          const n = await this.getAllBoardingUtxos();
          return this.prefixed({
            id: r,
            type: "BOARDING_UTXOS",
            payload: { utxos: n }
          });
        }
        case "GET_TRANSACTION_HISTORY": {
          const n = await this.getTransactionHistory();
          return this.prefixed({
            id: r,
            type: "TRANSACTION_HISTORY",
            payload: { transactions: n }
          });
        }
        case "GET_STATUS": {
          const n = await this.handler.identity.xOnlyPublicKey();
          return this.prefixed({
            id: r,
            type: "WALLET_STATUS",
            payload: {
              walletInitialized: !0,
              xOnlyPublicKey: n
            }
          });
        }
        case "CLEAR":
          return await this.clear(), this.prefixed({
            id: r,
            type: "CLEAR_SUCCESS",
            payload: { cleared: !0 }
          });
        case "RELOAD_WALLET":
          return await this.onWalletInitialized(), this.prefixed({
            id: r,
            type: "RELOAD_SUCCESS",
            payload: { reloaded: !0 }
          });
        default:
          throw console.error("Unknown message type", t), new Error("Unknown message");
      }
    } catch (n) {
      return this.prefixed({ id: r, error: n });
    }
  }
  // Wallet methods
  async handleInitWallet({ payload: t }) {
    const { arkServerPublicKey: r, arkServerUrl: n } = t;
    if (this.arkProvider = new Bd(n), this.indexerProvider = new Ud(n), "privateKey" in t.key && typeof t.key.privateKey == "string") {
      const { key: { privateKey: o } } = t, i = ar.fromHex(o), s = await Ko.create({
        identity: i,
        arkServerUrl: n,
        arkServerPublicKey: r,
        storage: this.storage
        // Use unified storage for wallet too
      });
      this.handler = new Iw(s);
    } else if ("publicKey" in t.key && typeof t.key.publicKey == "string") {
      const { key: { publicKey: o } } = t, i = wi.fromPublicKey(v.decode(o)), s = await io.create({
        identity: i,
        arkServerUrl: n,
        arkServerPublicKey: r,
        storage: this.storage
        // Use unified storage for wallet too
      });
      this.handler = new Cd(s);
    } else
      throw new Error("Missing privateKey or publicKey in key object");
    await this.onWalletInitialized();
  }
  async handleGetBalance() {
    const [t, r, n] = await Promise.all([
      this.getAllBoardingUtxos(),
      this.getSpendableVtxos(),
      this.getSweptVtxos()
    ]);
    let o = 0, i = 0;
    for (const d of t)
      d.status.confirmed ? o += d.value : i += d.value;
    let s = 0, c = 0, a = 0;
    for (const d of r)
      d.virtualStatus.state === "settled" ? s += d.value : d.virtualStatus.state === "preconfirmed" && (c += d.value);
    for (const d of n)
      Te(d) && (a += d.value);
    const u = o + i, f = s + c + a;
    return {
      boarding: {
        confirmed: o,
        unconfirmed: i,
        total: u
      },
      settled: s,
      preconfirmed: c,
      available: s + c,
      recoverable: a,
      total: u + f
    };
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
    return (await this.walletRepository.getVtxos(t)).filter(Te);
  }
  /**
   * Get swept vtxos for the current wallet address
   */
  async getSweptVtxos() {
    if (!this.handler)
      return [];
    const t = await this.handler.getAddress();
    return (await this.walletRepository.getVtxos(t)).filter((n) => n.virtualStatus.state === "swept");
  }
  async onWalletInitialized() {
    if (!this.handler || !this.arkProvider || !this.indexerProvider || !this.handler.offchainTapscript || !this.handler.boardingTapscript)
      return;
    const t = v.encode(this.handler.offchainTapscript.pkScript), n = (await this.indexerProvider.getVtxos({
      scripts: [t]
    })).vtxos.map((a) => Fe(this.handler, a));
    try {
      const { pending: a, finalized: u } = await this.handler.handleReload(n);
      console.info(`Recovered ${u.length}/${a.length} pending transactions: ${u.join(", ")}`);
    } catch (a) {
      console.error("Error recovering pending transactions:", a);
    }
    const o = await this.handler.getAddress();
    await this.walletRepository.saveVtxos(o, n);
    const i = await this.handler.getBoardingAddress(), s = await this.handler.onchainProvider.getCoins(i);
    await this.walletRepository.saveUtxos(i, s.map((a) => As(this.handler, a)));
    const c = await this.getTransactionHistory();
    c && await this.walletRepository.saveTransactions(o, c), this.incomingFundsSubscription && this.incomingFundsSubscription(), this.incomingFundsSubscription = await this.handler.notifyIncomingFunds(async (a) => {
      if (a.type === "vtxo") {
        const u = a.newVtxos.length > 0 ? a.newVtxos.map((d) => Fe(this.handler, d)) : [], f = a.spentVtxos.length > 0 ? a.spentVtxos.map((d) => Fe(this.handler, d)) : [];
        if ([...u, ...f].length === 0)
          return;
        await this.walletRepository.saveVtxos(o, [
          ...u,
          ...f
        ]), this.scheduleForNextTick(() => this.prefixed({
          type: "VTXO_UPDATE",
          broadcast: !0,
          payload: { newVtxos: u, spentVtxos: f }
        }));
      }
      if (a.type === "utxo") {
        const u = a.coins.map((d) => As(this.handler, d)), f = await this.handler?.getBoardingAddress();
        await this.walletRepository.clearUtxos(f), await this.walletRepository.saveUtxos(f, u), this.scheduleForNextTick(() => this.prefixed({
          type: "UTXO_UPDATE",
          broadcast: !0,
          payload: { coins: u }
        }));
      }
    });
  }
  async getTransactionHistory() {
    if (!this.handler)
      return [];
    let t = [];
    try {
      const { boardingTxs: r, commitmentsToIgnore: n } = await this.handler.getBoardingTxs(), { spendable: o, spent: i } = await this.getAllVtxos(), s = Rd(o, i, n);
      t = [...r, ...s], t.sort(
        // place createdAt = 0 (unconfirmed txs) first, then descending
        (c, a) => c.createdAt === 0 ? -1 : a.createdAt === 0 ? 1 : a.createdAt - c.createdAt
      );
    } catch (r) {
      console.error("Error getting transaction history:", r);
    }
    return t;
  }
  async getAllVtxos() {
    if (!this.handler)
      return { spendable: [], spent: [] };
    const t = await this.handler.getAddress(), r = await this.walletRepository.getVtxos(t);
    return {
      spendable: r.filter(Te),
      spent: r.filter((n) => !Te(n))
    };
  }
  async handleSettle(t) {
    if (!this.handler)
      throw new Error("Wallet handler not initialized");
    const r = await this.handler.handleSettle(t.payload, (n) => {
      this.scheduleForNextTick(() => this.prefixed({
        id: t.id,
        type: "SETTLE_EVENT",
        payload: n
      }));
    });
    if (!r)
      throw new Error("Settlement failed");
    return { type: "SETTLE_SUCCESS", payload: { txid: r } };
  }
  async handleSendBitcoin(t) {
    if (!this.handler)
      throw new Error("Wallet handler not initialized");
    const r = await this.handler.handleSendBitcoin(t.payload);
    if (!r)
      throw new Error("Send bitcoin failed");
    return {
      type: "SEND_BITCOIN_SUCCESS",
      payload: { txid: r }
    };
  }
  async handleGetVtxos(t) {
    if (!this.handler)
      throw new Error("Wallet handler not initialized");
    const r = await this.getSpendableVtxos(), n = this.handler.dustAmount;
    return t.payload.filter?.withRecoverable ?? !1 ? r : r.filter((s) => !(n != null && Id(s, n) || yc(s) || kd(s)));
  }
  async clear() {
    this.incomingFundsSubscription && this.incomingFundsSubscription(), await this.storage.clear(), this.walletRepository = new Is(this.storage), this.handler = void 0, this.arkProvider = void 0, this.indexerProvider = void 0;
  }
}
xr.messagePrefix = "WalletUpdater";
let Mr = null;
const Aw = () => navigator.serviceWorker.ready, Fa = {
  setup: async (e) => (Mr = await kw(e), Mr),
  isReady: Aw,
  getServiceWorker: () => {
    if (Mr === null)
      throw new Error("SW not ready yet, try again later");
    return Mr;
  }
};
class Bw {
  constructor({ updaters: t, tickIntervalMs: r = 3e4, debug: n = !1 }) {
    this.running = !1, this.tickTimeout = null, this.debug = !1, this.onMessage = async (o) => {
      const { id: i, prefix: s } = o.data;
      if (!i || !s)
        throw console.error(o.data), new Error("Invalid message received, missing required fields");
      this.debug && console.log(`[${s}] incoming message:`, o.data);
      const c = this.updaters.get(s);
      if (!c) {
        console.warn(`[${s}] unknown message prefix '${s}', ignoring message`);
        return;
      }
      try {
        const a = await c.handleMessage(o.data);
        this.debug && console.log(`[${s}] outgoing response:`, a), a && o.source?.postMessage(a);
      } catch (a) {
        console.error(`[${s}] handleMessage failed`, a), o.source?.postMessage({ id: i, error: String(a) });
      }
    }, this.updaters = new Map(t.map((o) => [o.messagePrefix, o])), this.tickIntervalMs = r, this.debug = n;
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
    if (!this.running)
      return;
    const t = Date.now();
    for (const r of this.updaters.values())
      try {
        const n = await r.tick(t);
        this.debug && console.log(`[${r.messagePrefix}] outgoing tick response:`, n), n && n.length > 0 && self.clients.matchAll({ includeUncontrolled: !0, type: "window" }).then((o) => {
          for (const i of n)
            i.broadcast && o.forEach((s) => {
              s.postMessage(i);
            });
        });
      } catch (n) {
        console.error(`[${r.messagePrefix}] tick failed`, n);
      }
    this.scheduleNextTick();
  }
  // TODO: will be moved to the SDK and use utils package, need to manage the registration state somehow
  static getServiceWorker() {
    return Fa.getServiceWorker();
  }
  static async setup(t) {
    return Fa.setup(t);
  }
}
let ne = class Et {
  constructor(t, r, n, o, i, s) {
    this.hasWitness = t, this.inputCount = r, this.outputCount = n, this.inputSize = o, this.inputWitnessSize = i, this.outputSize = s;
  }
  static create() {
    return new Et(!1, 0, 0, 0, 0, 0);
  }
  addP2AInput() {
    return this.inputCount++, this.inputSize += Et.INPUT_SIZE, this;
  }
  addKeySpendInput(t = !0) {
    return this.inputCount++, this.inputWitnessSize += 65 + (t ? 0 : 1), this.inputSize += Et.INPUT_SIZE, this.hasWitness = !0, this;
  }
  addP2PKHInput() {
    return this.inputCount++, this.inputWitnessSize++, this.inputSize += Et.INPUT_SIZE + Et.P2PKH_SCRIPT_SIG_SIZE, this;
  }
  addTapscriptInput(t, r, n) {
    const o = 1 + Et.BASE_CONTROL_BLOCK_SIZE + 1 + r + 1 + n;
    return this.inputCount++, this.inputWitnessSize += t + o, this.inputSize += Et.INPUT_SIZE, this.hasWitness = !0, this.inputCount++, this;
  }
  addP2WKHOutput() {
    return this.outputCount++, this.outputSize += Et.OUTPUT_SIZE + Et.P2WKH_OUTPUT_SIZE, this;
  }
  addP2TROutput() {
    return this.outputCount++, this.outputSize += Et.OUTPUT_SIZE + Et.P2TR_OUTPUT_SIZE, this;
  }
  vsize() {
    const t = (s) => s < 253 ? 1 : s < 65535 ? 3 : s < 4294967295 ? 5 : 9, r = t(this.inputCount), n = t(this.outputCount);
    let i = (Et.BASE_TX_SIZE + r + this.inputSize + n + this.outputSize) * Et.WITNESS_SCALE_FACTOR;
    return this.hasWitness && (i += Et.WITNESS_HEADER_SIZE + this.inputWitnessSize), $w(i);
  }
};
ne.P2PKH_SCRIPT_SIG_SIZE = 108;
ne.INPUT_SIZE = 41;
ne.BASE_CONTROL_BLOCK_SIZE = 33;
ne.OUTPUT_SIZE = 9;
ne.P2WKH_OUTPUT_SIZE = 22;
ne.BASE_TX_SIZE = 10;
ne.WITNESS_HEADER_SIZE = 2;
ne.WITNESS_SCALE_FACTOR = 4;
ne.P2TR_OUTPUT_SIZE = 34;
const $w = (e) => {
  const t = BigInt(Math.ceil(e / ne.WITNESS_SCALE_FACTOR));
  return {
    value: t,
    fee: (r) => r * t
  };
};
var Ka;
(function(e) {
  let t;
  (function(o) {
    o[o.UNROLL = 0] = "UNROLL", o[o.WAIT = 1] = "WAIT", o[o.DONE = 2] = "DONE";
  })(t = e.StepType || (e.StepType = {}));
  class r {
    constructor(i, s, c, a) {
      this.toUnroll = i, this.bumper = s, this.explorer = c, this.indexer = a;
    }
    static async create(i, s, c, a) {
      const { chain: u } = await a.getVtxoChain(i);
      return new r({ ...i, chain: u }, s, c, a);
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
        if (!(f.type === vn.COMMITMENT || f.type === vn.UNSPECIFIED))
          try {
            if (!(await this.explorer.getTxStatus(f.txid)).confirmed)
              return {
                type: t.WAIT,
                txid: f.txid,
                do: Uw(this.explorer, f.txid)
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
      const a = je.fromPSBT(q.decode(c.txs[0]));
      if (i.type === vn.TREE) {
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
        do: Ow(this.bumper, this.explorer, a)
      };
    }
    /**
     * Iterate over the steps to be executed and execute them
     * @returns An async iterator over the executed steps
     */
    async *[Symbol.asyncIterator]() {
      let i;
      do {
        i !== void 0 && await Rw(1e3);
        const s = await this.next();
        await s.do(), yield s, i = s.type;
      } while (i !== t.DONE);
    }
  }
  e.Session = r;
  async function n(o, i, s) {
    const c = await o.onchainProvider.getChainTip();
    let a = await o.getVtxos({ withUnrolled: !0 });
    if (a = a.filter((x) => i.includes(x.txid)), a.length === 0)
      throw new Error("No vtxos to complete unroll");
    const u = [];
    let f = 0n;
    const d = ne.create();
    for (const x of a) {
      if (!x.isUnrolled)
        throw new Error(`Vtxo ${x.txid}:${x.vout} is not fully unrolled, use unroll first`);
      const T = await o.onchainProvider.getTxStatus(x.txid);
      if (!T.confirmed)
        throw new Error(`tx ${x.txid} is not confirmed`);
      const A = Nw({ height: T.blockHeight, time: T.blockTime }, c, x);
      if (!A)
        throw new Error(`no available exit path found for vtxo ${x.txid}:${x.vout}`);
      const R = pe.decode(x.tapTree).findLeaf(v.encode(A.script));
      if (!R)
        throw new Error(`spending leaf not found for vtxo ${x.txid}:${x.vout}`);
      f += BigInt(x.value), u.push({
        txid: x.txid,
        index: x.vout,
        tapLeafScript: [R],
        sequence: 4294967294,
        witnessUtxo: {
          amount: BigInt(x.value),
          script: pe.decode(x.tapTree).pkScript
        },
        sighashType: Kt.DEFAULT
      }), d.addTapscriptInput(64, R[1].length, Ot.encode(R[0]).length);
    }
    const h = new je({ version: 2 });
    for (const x of u)
      h.addInput(x);
    d.addP2TROutput();
    let p = await o.onchainProvider.getFeeRate();
    (!p || p < Ko.MIN_FEE_RATE) && (p = Ko.MIN_FEE_RATE);
    const w = d.vsize().fee(BigInt(p));
    if (w > f)
      throw new Error("fee amount is greater than the total amount");
    h.addOutputAddress(s, f - w);
    const y = await o.identity.sign(h);
    return y.finalize(), await o.onchainProvider.broadcastTransaction(y.hex), y.id;
  }
  e.completeUnroll = n;
})(Ka || (Ka = {}));
function Rw(e) {
  return new Promise((t) => setTimeout(t, e));
}
function Ow(e, t, r) {
  return async () => {
    const [n, o] = await e.bumpP2A(r);
    await t.broadcastTransaction(n, o);
  };
}
function Uw(e, t) {
  return () => new Promise((r, n) => {
    const o = setInterval(async () => {
      try {
        (await e.getTxStatus(t)).confirmed && (clearInterval(o), r());
      } catch (i) {
        clearInterval(o), n(i);
      }
    }, 5e3);
  });
}
function Nw(e, t, r) {
  const n = pe.decode(r.tapTree).exitPaths();
  for (const o of n)
    if (o.params.timelock.type === "blocks") {
      if (t.height >= e.height + Number(o.params.timelock.value))
        return o;
    } else if (t.time >= e.time + Number(o.params.timelock.value))
      return o;
}
class ge extends at {
  constructor(t) {
    super(Hi(t));
  }
  static fromPSBT(t, r) {
    return at.fromPSBT(t, Hi(r));
  }
  static fromRaw(t, r) {
    return at.fromRaw(t, Hi(r));
  }
}
ge.ARK_TX_OPTS = {
  allowUnknown: !0,
  allowUnknownOutputs: !0,
  allowUnknownInputs: !0
};
function Hi(e) {
  return { ...ge.ARK_TX_OPTS, ...e };
}
function Cw(e, t, r = {}) {
  e = To(e);
  const { aggPublicKey: n } = gr(e);
  if (!r.taprootTweak)
    return {
      preTweakedKey: n.toBytes(!0),
      finalKey: n.toBytes(!0)
    };
  const o = Br.utils.taggedHash("TapTweak", n.toBytes(!0).subarray(1), r.taprootTweak ?? new Uint8Array(0)), { aggPublicKey: i } = gr(e, [o], [!0]);
  return {
    preTweakedKey: n.toBytes(!0),
    finalKey: i.toBytes(!0)
  };
}
var Pt;
(function(e) {
  e.VtxoTaprootTree = "taptree", e.VtxoTreeExpiry = "expiry", e.Cosigner = "cosigner", e.ConditionWitness = "condition";
})(Pt || (Pt = {}));
const xc = 222;
function Pw(e, t, r, n) {
  e.updateInput(t, {
    unknown: [
      ...e.getInput(t)?.unknown ?? [],
      r.encode(n)
    ]
  });
}
function _w(e, t, r) {
  const n = e.getInput(t)?.unknown ?? [], o = [];
  for (const i of n) {
    const s = r.decode(i);
    s && o.push(s);
  }
  return o;
}
const Pd = {
  key: Pt.VtxoTaprootTree,
  encode: (e) => [
    {
      type: xc,
      key: yi[Pt.VtxoTaprootTree]
    },
    e
  ],
  decode: (e) => bc(() => Ec(e[0], Pt.VtxoTaprootTree) ? e[1] : null)
}, Lw = {
  key: Pt.ConditionWitness,
  encode: (e) => [
    {
      type: xc,
      key: yi[Pt.ConditionWitness]
    },
    an.encode(e)
  ],
  decode: (e) => bc(() => Ec(e[0], Pt.ConditionWitness) ? an.decode(e[1]) : null)
}, Vw = {
  key: Pt.Cosigner,
  encode: (e) => [
    {
      type: xc,
      key: new Uint8Array([
        ...yi[Pt.Cosigner],
        e.index
      ])
    },
    e.key
  ],
  decode: (e) => bc(() => Ec(e[0], Pt.Cosigner) ? {
    index: e[0].key[e[0].key.length - 1],
    key: e[1]
  } : null)
};
Pt.VtxoTreeExpiry;
const yi = Object.fromEntries(Object.values(Pt).map((e) => [
  e,
  new TextEncoder().encode(e)
])), bc = (e) => {
  try {
    return e();
  } catch {
    return null;
  }
};
function Ec(e, t) {
  const r = v.encode(yi[t]);
  return v.encode(new Uint8Array([e.type, ...e.key])).includes(r);
}
Object.values(Kt).filter((e) => typeof e == "number");
class Fn {
  constructor(t, r, n, o = 0) {
    if (this.serverPubKey = t, this.vtxoTaprootKey = r, this.hrp = n, this.version = o, t.length !== 32)
      throw new Error("Invalid server public key length, expected 32 bytes, got " + t.length);
    if (r.length !== 32)
      throw new Error("Invalid vtxo taproot public key length, expected 32 bytes, got " + r.length);
  }
  static decode(t) {
    const r = ae.decodeUnsafe(t, 1023);
    if (!r)
      throw new Error("Invalid address");
    const n = new Uint8Array(ae.fromWords(r.words));
    if (n.length !== 65)
      throw new Error("Invalid data length, expected 65 bytes, got " + n.length);
    const o = n[0], i = n.slice(1, 33), s = n.slice(33, 65);
    return new Fn(i, s, r.prefix, o);
  }
  encode() {
    const t = new Uint8Array(65);
    t[0] = this.version, t.set(this.serverPubKey, 1), t.set(this.vtxoTaprootKey, 33);
    const r = ae.toWords(t);
    return ae.encode(this.hrp, r, 1023);
  }
  // pkScript is the script that should be used to send non-dust funds to the address
  get pkScript() {
    return D.encode(["OP_1", this.vtxoTaprootKey]);
  }
  // subdustPkScript is the script that should be used to send sub-dust funds to the address
  get subdustPkScript() {
    return D.encode(["RETURN", this.vtxoTaprootKey]);
  }
}
const Wo = ri(void 0, !0);
var pt;
(function(e) {
  e.Multisig = "multisig", e.CSVMultisig = "csv-multisig", e.ConditionCSVMultisig = "condition-csv-multisig", e.ConditionMultisig = "condition-multisig", e.CLTVMultisig = "cltv-multisig";
})(pt || (pt = {}));
function _d(e) {
  const t = [
    ee,
    _t,
    br,
    Mo,
    Kn
  ];
  for (const r of t)
    try {
      return r.decode(e);
    } catch {
      continue;
    }
  throw new Error(`Failed to decode: script ${v.encode(e)} is not a valid tapscript`);
}
var ee;
(function(e) {
  let t;
  (function(c) {
    c[c.CHECKSIG = 0] = "CHECKSIG", c[c.CHECKSIGADD = 1] = "CHECKSIGADD";
  })(t = e.MultisigType || (e.MultisigType = {}));
  function r(c) {
    if (c.pubkeys.length === 0)
      throw new Error("At least 1 pubkey is required");
    for (const u of c.pubkeys)
      if (u.length !== 32)
        throw new Error(`Invalid pubkey length: expected 32, got ${u.length}`);
    if (c.type || (c.type = t.CHECKSIG), c.type === t.CHECKSIGADD)
      return {
        type: pt.Multisig,
        params: c,
        script: ff(c.pubkeys.length, c.pubkeys).script
      };
    const a = [];
    for (let u = 0; u < c.pubkeys.length; u++)
      a.push(c.pubkeys[u]), u < c.pubkeys.length - 1 ? a.push("CHECKSIGVERIFY") : a.push("CHECKSIG");
    return {
      type: pt.Multisig,
      params: c,
      script: D.encode(a)
    };
  }
  e.encode = r;
  function n(c) {
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
  e.decode = n;
  function o(c) {
    const a = D.decode(c), u = [];
    let f = !1;
    for (let h = 0; h < a.length; h++) {
      const p = a[h];
      if (typeof p != "string" && typeof p != "number") {
        if (p.length !== 32)
          throw new Error(`Invalid pubkey length: expected 32, got ${p.length}`);
        if (u.push(p), h + 1 >= a.length || a[h + 1] !== "CHECKSIGADD" && a[h + 1] !== "CHECKSIG")
          throw new Error("Expected CHECKSIGADD or CHECKSIG after pubkey");
        h++;
        continue;
      }
      if (h === a.length - 1) {
        if (p !== "NUMEQUAL")
          throw new Error("Expected NUMEQUAL at end of script");
        f = !0;
      }
    }
    if (!f)
      throw new Error("Missing NUMEQUAL operation");
    if (u.length === 0)
      throw new Error("Invalid script: must have at least 1 pubkey");
    const d = r({
      pubkeys: u,
      type: t.CHECKSIGADD
    });
    if (v.encode(d.script) !== v.encode(c))
      throw new Error("Invalid script format: script reconstruction mismatch");
    return {
      type: pt.Multisig,
      params: { pubkeys: u, type: t.CHECKSIGADD },
      script: c
    };
  }
  function i(c) {
    const a = D.decode(c), u = [];
    for (let d = 0; d < a.length; d++) {
      const h = a[d];
      if (typeof h != "string" && typeof h != "number") {
        if (h.length !== 32)
          throw new Error(`Invalid pubkey length: expected 32, got ${h.length}`);
        if (u.push(h), d + 1 >= a.length)
          throw new Error("Unexpected end of script");
        const p = a[d + 1];
        if (p !== "CHECKSIGVERIFY" && p !== "CHECKSIG")
          throw new Error("Expected CHECKSIGVERIFY or CHECKSIG after pubkey");
        if (d === a.length - 2 && p !== "CHECKSIG")
          throw new Error("Last operation must be CHECKSIG");
        d++;
        continue;
      }
    }
    if (u.length === 0)
      throw new Error("Invalid script: must have at least 1 pubkey");
    const f = r({ pubkeys: u, type: t.CHECKSIG });
    if (v.encode(f.script) !== v.encode(c))
      throw new Error("Invalid script format: script reconstruction mismatch");
    return {
      type: pt.Multisig,
      params: { pubkeys: u, type: t.CHECKSIG },
      script: c
    };
  }
  function s(c) {
    return c.type === pt.Multisig;
  }
  e.is = s;
})(ee || (ee = {}));
var _t;
(function(e) {
  function t(o) {
    for (const u of o.pubkeys)
      if (u.length !== 32)
        throw new Error(`Invalid pubkey length: expected 32, got ${u.length}`);
    const i = Wo.encode(BigInt(Ln.encode(o.timelock.type === "blocks" ? { blocks: Number(o.timelock.value) } : { seconds: Number(o.timelock.value) }))), s = [
      i.length === 1 ? i[0] : i,
      "CHECKSEQUENCEVERIFY",
      "DROP"
    ], c = ee.encode(o), a = new Uint8Array([
      ...D.encode(s),
      ...c.script
    ]);
    return {
      type: pt.CSVMultisig,
      params: o,
      script: a
    };
  }
  e.encode = t;
  function r(o) {
    if (o.length === 0)
      throw new Error("Failed to decode: script is empty");
    const i = D.decode(o);
    if (i.length < 3)
      throw new Error("Invalid script: too short (expected at least 3)");
    const s = i[0];
    if (typeof s == "string")
      throw new Error("Invalid script: expected sequence number");
    if (i[1] !== "CHECKSEQUENCEVERIFY" || i[2] !== "DROP")
      throw new Error("Invalid script: expected CHECKSEQUENCEVERIFY DROP");
    const c = new Uint8Array(D.encode(i.slice(3)));
    let a;
    try {
      a = ee.decode(c);
    } catch (p) {
      throw new Error(`Invalid multisig script: ${p instanceof Error ? p.message : String(p)}`);
    }
    let u;
    typeof s == "number" ? u = s : u = Number(Wo.decode(s));
    const f = Ln.decode(u), d = f.blocks !== void 0 ? { type: "blocks", value: BigInt(f.blocks) } : { type: "seconds", value: BigInt(f.seconds) }, h = t({
      timelock: d,
      ...a.params
    });
    if (v.encode(h.script) !== v.encode(o))
      throw new Error("Invalid script format: script reconstruction mismatch");
    return {
      type: pt.CSVMultisig,
      params: {
        timelock: d,
        ...a.params
      },
      script: o
    };
  }
  e.decode = r;
  function n(o) {
    return o.type === pt.CSVMultisig;
  }
  e.is = n;
})(_t || (_t = {}));
var br;
(function(e) {
  function t(o) {
    const i = new Uint8Array([
      ...o.conditionScript,
      ...D.encode(["VERIFY"]),
      ..._t.encode(o).script
    ]);
    return {
      type: pt.ConditionCSVMultisig,
      params: o,
      script: i
    };
  }
  e.encode = t;
  function r(o) {
    if (o.length === 0)
      throw new Error("Failed to decode: script is empty");
    const i = D.decode(o);
    if (i.length < 1)
      throw new Error("Invalid script: too short (expected at least 1)");
    let s = -1;
    for (let d = i.length - 1; d >= 0; d--)
      i[d] === "VERIFY" && (s = d);
    if (s === -1)
      throw new Error("Invalid script: missing VERIFY operation");
    const c = new Uint8Array(D.encode(i.slice(0, s))), a = new Uint8Array(D.encode(i.slice(s + 1)));
    let u;
    try {
      u = _t.decode(a);
    } catch (d) {
      throw new Error(`Invalid CSV multisig script: ${d instanceof Error ? d.message : String(d)}`);
    }
    const f = t({
      conditionScript: c,
      ...u.params
    });
    if (v.encode(f.script) !== v.encode(o))
      throw new Error("Invalid script format: script reconstruction mismatch");
    return {
      type: pt.ConditionCSVMultisig,
      params: {
        conditionScript: c,
        ...u.params
      },
      script: o
    };
  }
  e.decode = r;
  function n(o) {
    return o.type === pt.ConditionCSVMultisig;
  }
  e.is = n;
})(br || (br = {}));
var Mo;
(function(e) {
  function t(o) {
    const i = new Uint8Array([
      ...o.conditionScript,
      ...D.encode(["VERIFY"]),
      ...ee.encode(o).script
    ]);
    return {
      type: pt.ConditionMultisig,
      params: o,
      script: i
    };
  }
  e.encode = t;
  function r(o) {
    if (o.length === 0)
      throw new Error("Failed to decode: script is empty");
    const i = D.decode(o);
    if (i.length < 1)
      throw new Error("Invalid script: too short (expected at least 1)");
    let s = -1;
    for (let d = i.length - 1; d >= 0; d--)
      i[d] === "VERIFY" && (s = d);
    if (s === -1)
      throw new Error("Invalid script: missing VERIFY operation");
    const c = new Uint8Array(D.encode(i.slice(0, s))), a = new Uint8Array(D.encode(i.slice(s + 1)));
    let u;
    try {
      u = ee.decode(a);
    } catch (d) {
      throw new Error(`Invalid multisig script: ${d instanceof Error ? d.message : String(d)}`);
    }
    const f = t({
      conditionScript: c,
      ...u.params
    });
    if (v.encode(f.script) !== v.encode(o))
      throw new Error("Invalid script format: script reconstruction mismatch");
    return {
      type: pt.ConditionMultisig,
      params: {
        conditionScript: c,
        ...u.params
      },
      script: o
    };
  }
  e.decode = r;
  function n(o) {
    return o.type === pt.ConditionMultisig;
  }
  e.is = n;
})(Mo || (Mo = {}));
var Kn;
(function(e) {
  function t(o) {
    const i = Wo.encode(o.absoluteTimelock), s = [
      i.length === 1 ? i[0] : i,
      "CHECKLOCKTIMEVERIFY",
      "DROP"
    ], c = D.encode(s), a = new Uint8Array([
      ...c,
      ...ee.encode(o).script
    ]);
    return {
      type: pt.CLTVMultisig,
      params: o,
      script: a
    };
  }
  e.encode = t;
  function r(o) {
    if (o.length === 0)
      throw new Error("Failed to decode: script is empty");
    const i = D.decode(o);
    if (i.length < 3)
      throw new Error("Invalid script: too short (expected at least 3)");
    const s = i[0];
    if (typeof s == "string" || typeof s == "number")
      throw new Error("Invalid script: expected locktime number");
    if (i[1] !== "CHECKLOCKTIMEVERIFY" || i[2] !== "DROP")
      throw new Error("Invalid script: expected CHECKLOCKTIMEVERIFY DROP");
    const c = new Uint8Array(D.encode(i.slice(3)));
    let a;
    try {
      a = ee.decode(c);
    } catch (d) {
      throw new Error(`Invalid multisig script: ${d instanceof Error ? d.message : String(d)}`);
    }
    const u = Wo.decode(s), f = t({
      absoluteTimelock: u,
      ...a.params
    });
    if (v.encode(f.script) !== v.encode(o))
      throw new Error("Invalid script format: script reconstruction mismatch");
    return {
      type: pt.CLTVMultisig,
      params: {
        absoluteTimelock: u,
        ...a.params
      },
      script: o
    };
  }
  e.decode = r;
  function n(o) {
    return o.type === pt.CLTVMultisig;
  }
  e.is = n;
})(Kn || (Kn = {}));
const Wa = Un.tapTree[2];
function fr(e) {
  return e[1].subarray(0, e[1].length - 1);
}
class Wt {
  static decode(t) {
    const n = Wa.decode(t).map((o) => o.script);
    return new Wt(n);
  }
  constructor(t) {
    this.scripts = t;
    const r = t.length % 2 !== 0 ? t.slice().reverse() : t, n = tc(r.map((i) => ({
      script: i,
      leafVersion: un
    }))), o = uf(ni, n, void 0, !0);
    if (!o.tapLeafScript || o.tapLeafScript.length !== t.length)
      throw new Error("invalid scripts");
    this.leaves = o.tapLeafScript, this.tweakedPublicKey = o.tweakedPubkey;
  }
  encode() {
    return Wa.encode(this.scripts.map((r) => ({
      depth: 1,
      version: un,
      script: r
    })));
  }
  address(t, r) {
    return new Fn(r, this.tweakedPublicKey, t);
  }
  get pkScript() {
    return D.encode(["OP_1", this.tweakedPublicKey]);
  }
  onchainAddress(t) {
    return de(t).encode({
      type: "tr",
      pubkey: this.tweakedPublicKey
    });
  }
  findLeaf(t) {
    const r = this.leaves.find((n) => v.encode(fr(n)) === t);
    if (!r)
      throw new Error(`leaf '${t}' not found`);
    return r;
  }
  exitPaths() {
    const t = [];
    for (const r of this.leaves)
      try {
        const n = _t.decode(fr(r));
        t.push(n);
        continue;
      } catch {
        try {
          const o = br.decode(fr(r));
          t.push(o);
        } catch {
          continue;
        }
      }
    return t;
  }
}
var Ma;
(function(e) {
  class t extends Wt {
    constructor(o) {
      r(o);
      const { sender: i, receiver: s, server: c, preimageHash: a, refundLocktime: u, unilateralClaimDelay: f, unilateralRefundDelay: d, unilateralRefundWithoutReceiverDelay: h } = o, p = Dw(a), w = Mo.encode({
        conditionScript: p,
        pubkeys: [s, c]
      }).script, y = ee.encode({
        pubkeys: [i, s, c]
      }).script, x = Kn.encode({
        absoluteTimelock: u,
        pubkeys: [i, c]
      }).script, T = br.encode({
        conditionScript: p,
        timelock: f,
        pubkeys: [s]
      }).script, A = _t.encode({
        timelock: d,
        pubkeys: [i, s]
      }).script, R = _t.encode({
        timelock: h,
        pubkeys: [i]
      }).script;
      super([
        w,
        y,
        x,
        T,
        A,
        R
      ]), this.options = o, this.claimScript = v.encode(w), this.refundScript = v.encode(y), this.refundWithoutReceiverScript = v.encode(x), this.unilateralClaimScript = v.encode(T), this.unilateralRefundScript = v.encode(A), this.unilateralRefundWithoutReceiverScript = v.encode(R);
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
  function r(n) {
    const { sender: o, receiver: i, server: s, preimageHash: c, refundLocktime: a, unilateralClaimDelay: u, unilateralRefundDelay: f, unilateralRefundWithoutReceiverDelay: d } = n;
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
})(Ma || (Ma = {}));
function Dw(e) {
  return D.encode(["HASH160", e, "EQUAL"]);
}
var zo;
(function(e) {
  class t extends Wt {
    constructor(n) {
      const { pubKey: o, serverPubKey: i, csvTimelock: s = t.DEFAULT_TIMELOCK } = n, c = ee.encode({
        pubkeys: [o, i]
      }).script, a = _t.encode({
        timelock: s,
        pubkeys: [o]
      }).script;
      super([c, a]), this.options = n, this.forfeitScript = v.encode(c), this.exitScript = v.encode(a);
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
})(zo || (zo = {}));
var Wn;
(function(e) {
  e.TxSent = "SENT", e.TxReceived = "RECEIVED";
})(Wn || (Wn = {}));
function rr(e) {
  return !e.isSpent;
}
function Ld(e) {
  return e.virtualStatus.state === "swept" && rr(e);
}
function Hw(e) {
  if (e.virtualStatus.state === "swept")
    return !0;
  const t = e.virtualStatus.batchExpiry;
  return !t || new Date(t).getFullYear() < 2025 ? !1 : t <= Date.now();
}
function Fw(e, t) {
  return e.value < t;
}
async function* $s(e) {
  const t = [], r = [];
  let n = null, o = null;
  const i = (c) => {
    n ? (n(c), n = null) : t.push(c);
  }, s = () => {
    const c = new Error("EventSource error");
    o ? (o(c), o = null) : r.push(c);
  };
  e.addEventListener("message", i), e.addEventListener("error", s);
  try {
    for (; ; ) {
      if (t.length > 0) {
        yield t.shift();
        continue;
      }
      if (r.length > 0)
        throw r.shift();
      const c = await new Promise((a, u) => {
        n = a, o = u;
      }).finally(() => {
        n = null, o = null;
      });
      c && (yield c);
    }
  } finally {
    e.removeEventListener("message", i), e.removeEventListener("error", s);
  }
}
class Vd extends Error {
  constructor(t, r, n, o) {
    super(r), this.code = t, this.message = r, this.name = n, this.metadata = o;
  }
}
function Kw(e) {
  try {
    if (!(e instanceof Error))
      return;
    const t = JSON.parse(e.message);
    if (!("details" in t) || !Array.isArray(t.details))
      return;
    for (const r of t.details) {
      if (!("@type" in r) || r["@type"] !== "type.googleapis.com/ark.v1.ErrorDetails" || !("code" in r))
        continue;
      const o = r.code;
      if (!("message" in r))
        continue;
      const i = r.message;
      if (!("name" in r))
        continue;
      const s = r.name;
      let c;
      return "metadata" in r && Ww(r.metadata) && (c = r.metadata), new Vd(o, i, s, c);
    }
    return;
  } catch {
    return;
  }
}
function Ww(e) {
  return typeof e == "object" && e !== null && !Array.isArray(e);
}
var Ke;
(function(e) {
  function t(n, o, i = []) {
    if (typeof n != "string" && (n = r(n)), o.length == 0)
      throw new Error("intent proof requires at least one input");
    Yw(o), Xw(i);
    const s = Jw(n, o[0].witnessUtxo.script);
    return Qw(s, o, i);
  }
  e.create = t;
  function r(n) {
    switch (n.type) {
      case "register":
        return JSON.stringify({
          type: "register",
          onchain_output_indexes: n.onchain_output_indexes,
          valid_at: n.valid_at,
          expire_at: n.expire_at,
          cosigners_public_keys: n.cosigners_public_keys
        });
      case "delete":
        return JSON.stringify({
          type: "delete",
          expire_at: n.expire_at
        });
      case "get-pending-tx":
        return JSON.stringify({
          type: "get-pending-tx",
          expire_at: n.expire_at
        });
    }
  }
  e.encodeMessage = r;
})(Ke || (Ke = {}));
const Mw = new Uint8Array([ut.RETURN]), zw = new Uint8Array(32).fill(0), jw = 4294967295, Gw = "ark-intent-proof-message";
function qw(e) {
  if (e.index === void 0)
    throw new Error("intent proof input requires index");
  if (e.txid === void 0)
    throw new Error("intent proof input requires txid");
  if (e.witnessUtxo === void 0)
    throw new Error("intent proof input requires witness utxo");
  return !0;
}
function Yw(e) {
  return e.forEach(qw), !0;
}
function Zw(e) {
  if (e.amount === void 0)
    throw new Error("intent proof output requires amount");
  if (e.script === void 0)
    throw new Error("intent proof output requires script");
  return !0;
}
function Xw(e) {
  return e.forEach(Zw), !0;
}
function Jw(e, t) {
  const r = ty(e), n = new ge({
    version: 0
  });
  return n.addInput({
    txid: zw,
    // zero hash
    index: jw,
    sequence: 0
  }), n.addOutput({
    amount: 0n,
    script: t
  }), n.updateInput(0, {
    finalScriptSig: D.encode(["OP_0", r])
  }), n;
}
function Qw(e, t, r) {
  const n = t[0], o = t.map((s) => s.sequence || 0).reduce((s, c) => Math.max(s, c), 0), i = new ge({
    version: 2,
    lockTime: o
  });
  i.addInput({
    ...n,
    txid: e.id,
    index: 0,
    witnessUtxo: {
      script: n.witnessUtxo.script,
      amount: 0n
    },
    sighashType: Kt.ALL
  });
  for (const [s, c] of t.entries())
    i.addInput({
      ...c,
      sighashType: Kt.ALL
    }), c.unknown?.length && i.updateInput(s + 1, {
      unknown: c.unknown
    });
  r.length === 0 && (r = [
    {
      amount: 0n,
      script: Mw
    }
  ]);
  for (const s of r)
    i.addOutput({
      amount: s.amount,
      script: s.script
    });
  return i;
}
function ty(e) {
  return Br.utils.taggedHash(Gw, new TextEncoder().encode(e));
}
var yt;
(function(e) {
  e.BatchStarted = "batch_started", e.BatchFinalization = "batch_finalization", e.BatchFinalized = "batch_finalized", e.BatchFailed = "batch_failed", e.TreeSigningStarted = "tree_signing_started", e.TreeNonces = "tree_nonces", e.TreeTx = "tree_tx", e.TreeSignature = "tree_signature";
})(yt || (yt = {}));
class ey {
  constructor(t) {
    this.serverUrl = t;
  }
  async getInfo() {
    const t = `${this.serverUrl}/v1/info`, r = await fetch(t);
    if (!r.ok) {
      const o = await r.text();
      se(o, `Failed to get server info: ${r.statusText}`);
    }
    const n = await r.json();
    return {
      boardingExitDelay: BigInt(n.boardingExitDelay ?? 0),
      checkpointTapscript: n.checkpointTapscript ?? "",
      deprecatedSigners: n.deprecatedSigners?.map((o) => ({
        cutoffDate: BigInt(o.cutoffDate ?? 0),
        pubkey: o.pubkey ?? ""
      })) ?? [],
      digest: n.digest ?? "",
      dust: BigInt(n.dust ?? 0),
      fees: {
        intentFee: {
          ...n.fees?.intentFee,
          onchainInput: BigInt(n.fees?.intentFee?.onchainInput ?? 0),
          onchainOutput: BigInt(n.fees?.intentFee?.onchainOutput ?? 0)
        },
        txFeeRate: n?.fees?.txFeeRate ?? ""
      },
      forfeitAddress: n.forfeitAddress ?? "",
      forfeitPubkey: n.forfeitPubkey ?? "",
      network: n.network ?? "",
      scheduledSession: "scheduledSession" in n && n.scheduledSession != null ? {
        duration: BigInt(n.scheduledSession.duration ?? 0),
        nextStartTime: BigInt(n.scheduledSession.nextStartTime ?? 0),
        nextEndTime: BigInt(n.scheduledSession.nextEndTime ?? 0),
        period: BigInt(n.scheduledSession.period ?? 0)
      } : void 0,
      serviceStatus: n.serviceStatus ?? {},
      sessionDuration: BigInt(n.sessionDuration ?? 0),
      signerPubkey: n.signerPubkey ?? "",
      unilateralExitDelay: BigInt(n.unilateralExitDelay ?? 0),
      utxoMaxAmount: BigInt(n.utxoMaxAmount ?? -1),
      utxoMinAmount: BigInt(n.utxoMinAmount ?? 0),
      version: n.version ?? "",
      vtxoMaxAmount: BigInt(n.vtxoMaxAmount ?? -1),
      vtxoMinAmount: BigInt(n.vtxoMinAmount ?? 0)
    };
  }
  async submitTx(t, r) {
    const n = `${this.serverUrl}/v1/tx/submit`, o = await fetch(n, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        signedArkTx: t,
        checkpointTxs: r
      })
    });
    if (!o.ok) {
      const s = await o.text();
      se(s, `Failed to submit virtual transaction: ${s}`);
    }
    const i = await o.json();
    return {
      arkTxid: i.arkTxid,
      finalArkTx: i.finalArkTx,
      signedCheckpointTxs: i.signedCheckpointTxs
    };
  }
  async finalizeTx(t, r) {
    const n = `${this.serverUrl}/v1/tx/finalize`, o = await fetch(n, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        arkTxid: t,
        finalCheckpointTxs: r
      })
    });
    if (!o.ok) {
      const i = await o.text();
      se(i, `Failed to finalize offchain transaction: ${i}`);
    }
  }
  async registerIntent(t) {
    const r = `${this.serverUrl}/v1/batch/registerIntent`, n = await fetch(r, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        intent: {
          proof: t.proof,
          message: Ke.encodeMessage(t.message)
        }
      })
    });
    if (!n.ok) {
      const i = await n.text();
      se(i, `Failed to register intent: ${i}`);
    }
    return (await n.json()).intentId;
  }
  async deleteIntent(t) {
    const r = `${this.serverUrl}/v1/batch/deleteIntent`, n = await fetch(r, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        intent: {
          proof: t.proof,
          message: Ke.encodeMessage(t.message)
        }
      })
    });
    if (!n.ok) {
      const o = await n.text();
      se(o, `Failed to delete intent: ${o}`);
    }
  }
  async confirmRegistration(t) {
    const r = `${this.serverUrl}/v1/batch/ack`, n = await fetch(r, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        intentId: t
      })
    });
    if (!n.ok) {
      const o = await n.text();
      se(o, `Failed to confirm registration: ${o}`);
    }
  }
  async submitTreeNonces(t, r, n) {
    const o = `${this.serverUrl}/v1/batch/tree/submitNonces`, i = await fetch(o, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        batchId: t,
        pubkey: r,
        treeNonces: ny(n)
      })
    });
    if (!i.ok) {
      const s = await i.text();
      se(s, `Failed to submit tree nonces: ${s}`);
    }
  }
  async submitTreeSignatures(t, r, n) {
    const o = `${this.serverUrl}/v1/batch/tree/submitSignatures`, i = await fetch(o, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        batchId: t,
        pubkey: r,
        treeSignatures: ry(n)
      })
    });
    if (!i.ok) {
      const s = await i.text();
      se(s, `Failed to submit tree signatures: ${s}`);
    }
  }
  async submitSignedForfeitTxs(t, r) {
    const n = `${this.serverUrl}/v1/batch/submitForfeitTxs`, o = await fetch(n, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        signedForfeitTxs: t,
        signedCommitmentTx: r
      })
    });
    if (!o.ok) {
      const i = await o.text();
      se(i, `Failed to submit forfeit transactions: ${o.statusText}`);
    }
  }
  async *getEventStream(t, r) {
    const n = `${this.serverUrl}/v1/batch/events`, o = r.length > 0 ? `?${r.map((i) => `topics=${encodeURIComponent(i)}`).join("&")}` : "";
    for (; !t?.aborted; )
      try {
        const i = new EventSource(n + o), s = () => {
          i.close();
        };
        t?.addEventListener("abort", s);
        try {
          for await (const c of $s(i)) {
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
        if (Rs(i)) {
          console.debug("Timeout error ignored");
          continue;
        }
        throw console.error("Event stream error:", i), i;
      }
  }
  async *getTransactionsStream(t) {
    const r = `${this.serverUrl}/v1/txs`;
    for (; !t?.aborted; )
      try {
        const n = new EventSource(r), o = () => {
          n.close();
        };
        t?.addEventListener("abort", o);
        try {
          for await (const i of $s(n)) {
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
          t?.removeEventListener("abort", o), n.close();
        }
      } catch (n) {
        if (n instanceof Error && n.name === "AbortError")
          break;
        if (Rs(n)) {
          console.debug("Timeout error ignored");
          continue;
        }
        throw console.error("Transaction stream error:", n), n;
      }
  }
  async getPendingTxs(t) {
    const r = `${this.serverUrl}/v1/tx/pending`, n = await fetch(r, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        intent: {
          proof: t.proof,
          message: Ke.encodeMessage(t.message)
        }
      })
    });
    if (!n.ok) {
      const i = await n.text();
      se(i, `Failed to get pending transactions: ${i}`);
    }
    return (await n.json()).pendingTxs;
  }
  parseSettlementEvent(t) {
    if (t.batchStarted)
      return {
        type: yt.BatchStarted,
        id: t.batchStarted.id,
        intentIdHashes: t.batchStarted.intentIdHashes,
        batchExpiry: BigInt(t.batchStarted.batchExpiry)
      };
    if (t.batchFinalization)
      return {
        type: yt.BatchFinalization,
        id: t.batchFinalization.id,
        commitmentTx: t.batchFinalization.commitmentTx
      };
    if (t.batchFinalized)
      return {
        type: yt.BatchFinalized,
        id: t.batchFinalized.id,
        commitmentTxid: t.batchFinalized.commitmentTxid
      };
    if (t.batchFailed)
      return {
        type: yt.BatchFailed,
        id: t.batchFailed.id,
        reason: t.batchFailed.reason
      };
    if (t.treeSigningStarted)
      return {
        type: yt.TreeSigningStarted,
        id: t.treeSigningStarted.id,
        cosignersPublicKeys: t.treeSigningStarted.cosignersPubkeys,
        unsignedCommitmentTx: t.treeSigningStarted.unsignedCommitmentTx
      };
    if (t.treeNoncesAggregated)
      return null;
    if (t.treeNonces)
      return {
        type: yt.TreeNonces,
        id: t.treeNonces.id,
        topic: t.treeNonces.topic,
        txid: t.treeNonces.txid,
        nonces: oy(t.treeNonces.nonces)
        // pubkey -> public nonce
      };
    if (t.treeTx) {
      const r = Object.fromEntries(Object.entries(t.treeTx.children).map(([n, o]) => [parseInt(n), o]));
      return {
        type: yt.TreeTx,
        id: t.treeTx.id,
        topic: t.treeTx.topic,
        batchIndex: t.treeTx.batchIndex,
        chunk: {
          txid: t.treeTx.txid,
          tx: t.treeTx.tx,
          children: r
        }
      };
    }
    return t.treeSignature ? {
      type: yt.TreeSignature,
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
  for (const [r, n] of e)
    t[r] = v.encode(n.pubNonce);
  return t;
}
function ry(e) {
  const t = {};
  for (const [r, n] of e)
    t[r] = v.encode(n.encode());
  return t;
}
function oy(e) {
  return new Map(Object.entries(e).map(([t, r]) => {
    if (typeof r != "string")
      throw new Error("invalid nonce");
    return [t, { pubNonce: v.decode(r) }];
  }));
}
function Rs(e) {
  const t = (r) => r instanceof Error ? r.name === "TypeError" && r.message === "Failed to fetch" || r.name === "HeadersTimeoutError" || r.name === "BodyTimeoutError" || r.code === "UND_ERR_HEADERS_TIMEOUT" || r.code === "UND_ERR_BODY_TIMEOUT" : !1;
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
function se(e, t) {
  const r = new Error(e);
  throw Kw(r) ?? new Error(t);
}
class so {
  constructor(t, r = /* @__PURE__ */ new Map()) {
    this.root = t, this.children = r;
  }
  static create(t) {
    if (t.length === 0)
      throw new Error("empty chunks");
    const r = /* @__PURE__ */ new Map();
    for (const i of t) {
      const s = sy(i), c = s.tx.id;
      r.set(c, s);
    }
    const n = [];
    for (const [i] of r) {
      let s = !1;
      for (const [c, a] of r)
        if (c !== i && (s = iy(a, i), s))
          break;
      if (!s) {
        n.push(i);
        continue;
      }
    }
    if (n.length === 0)
      throw new Error("no root chunk found");
    if (n.length > 1)
      throw new Error(`multiple root chunks found: ${n.join(", ")}`);
    const o = Dd(n[0], r);
    if (!o)
      throw new Error(`chunk not found for root txid: ${n[0]}`);
    if (o.nbOfNodes() !== t.length)
      throw new Error(`number of chunks (${t.length}) is not equal to the number of nodes in the graph (${o.nbOfNodes()})`);
    return o;
  }
  nbOfNodes() {
    let t = 1;
    for (const r of this.children.values())
      t += r.nbOfNodes();
    return t;
  }
  validate() {
    if (!this.root)
      throw new Error("unexpected nil root");
    const t = this.root.outputsLength, r = this.root.inputsLength;
    if (r !== 1)
      throw new Error(`unexpected number of inputs: ${r}, expected 1`);
    if (this.children.size > t - 1)
      throw new Error(`unexpected number of children: ${this.children.size}, expected maximum ${t - 1}`);
    for (const [n, o] of this.children) {
      if (n >= t)
        throw new Error(`output index ${n} is out of bounds (nb of outputs: ${t})`);
      o.validate();
      const i = o.root.getInput(0), s = this.root.id;
      if (!i.txid || v.encode(i.txid) !== s || i.index !== n)
        throw new Error(`input of child ${n} is not the output of the parent`);
      let c = 0n;
      for (let u = 0; u < o.root.outputsLength; u++) {
        const f = o.root.getOutput(u);
        f?.amount && (c += f.amount);
      }
      const a = this.root.getOutput(n);
      if (!a?.amount)
        throw new Error(`parent output ${n} has no amount`);
      if (c !== a.amount)
        throw new Error(`sum of child's outputs is not equal to the output of the parent: ${c} != ${a.amount}`);
    }
  }
  leaves() {
    if (this.children.size === 0)
      return [this.root];
    const t = [];
    for (const r of this.children.values())
      t.push(...r.leaves());
    return t;
  }
  get txid() {
    return this.root.id;
  }
  find(t) {
    if (t === this.txid)
      return this;
    for (const r of this.children.values()) {
      const n = r.find(t);
      if (n)
        return n;
    }
    return null;
  }
  update(t, r) {
    if (t === this.txid) {
      r(this.root);
      return;
    }
    for (const n of this.children.values())
      try {
        n.update(t, r);
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
function Dd(e, t) {
  const r = t.get(e);
  if (!r)
    return null;
  const n = r.tx, o = /* @__PURE__ */ new Map();
  for (const [i, s] of Object.entries(r.children)) {
    const c = parseInt(i), a = Dd(s, t);
    a && o.set(c, a);
  }
  return new so(n, o);
}
function sy(e) {
  return { tx: at.fromPSBT(q.decode(e.tx)), children: e.children };
}
var Os;
(function(e) {
  let t;
  (function(n) {
    n.Start = "start", n.BatchStarted = "batch_started", n.TreeSigningStarted = "tree_signing_started", n.TreeNoncesAggregated = "tree_nonces_aggregated", n.BatchFinalization = "batch_finalization";
  })(t || (t = {}));
  async function r(n, o, i = {}) {
    const { abortController: s, skipVtxoTreeSigning: c = !1, eventCallback: a } = i;
    let u = t.Start;
    const f = [], d = [];
    let h, p;
    for await (const w of n) {
      if (s?.signal.aborted)
        throw new Error("canceled");
      switch (a && a(w).catch(() => {
      }), w.type) {
        case yt.BatchStarted: {
          const y = w, { skip: x } = await o.onBatchStarted(y);
          x || (u = t.BatchStarted, c && (u = t.TreeNoncesAggregated));
          continue;
        }
        case yt.BatchFinalized: {
          if (u !== t.BatchFinalization)
            continue;
          return o.onBatchFinalized && await o.onBatchFinalized(w), w.commitmentTxid;
        }
        case yt.BatchFailed: {
          if (o.onBatchFailed) {
            await o.onBatchFailed(w);
            continue;
          }
          throw new Error(w.reason);
        }
        case yt.TreeTx: {
          if (u !== t.BatchStarted && u !== t.TreeNoncesAggregated)
            continue;
          w.batchIndex === 0 ? f.push(w.chunk) : d.push(w.chunk), o.onTreeTxEvent && await o.onTreeTxEvent(w);
          continue;
        }
        case yt.TreeSignature: {
          if (u !== t.TreeNoncesAggregated)
            continue;
          if (!h)
            throw new Error("vtxo tree not initialized");
          const y = v.decode(w.signature);
          h.update(w.txid, (x) => {
            x.updateInput(0, {
              tapKeySig: y
            });
          }), o.onTreeSignatureEvent && await o.onTreeSignatureEvent(w);
          continue;
        }
        case yt.TreeSigningStarted: {
          if (u !== t.BatchStarted)
            continue;
          h = so.create(f);
          const { skip: y } = await o.onTreeSigningStarted(w, h);
          y || (u = t.TreeSigningStarted);
          continue;
        }
        case yt.TreeNonces: {
          if (u !== t.TreeSigningStarted)
            continue;
          const { fullySigned: y } = await o.onTreeNonces(w);
          y && (u = t.TreeNoncesAggregated);
          continue;
        }
        case yt.BatchFinalization: {
          if (u !== t.TreeNoncesAggregated)
            continue;
          if (!h && f.length > 0 && (h = so.create(f)), !h && !c)
            throw new Error("vtxo tree not initialized");
          d.length > 0 && (p = so.create(d)), await o.onBatchFinalization(w, h, p), u = t.BatchFinalization;
          continue;
        }
        default:
          continue;
      }
    }
    throw new Error("event stream closed");
  }
  e.join = r;
})(Os || (Os = {}));
function cy(e, t, r) {
  const n = [];
  let o = [...t];
  for (const s of [...e, ...t]) {
    if (s.virtualStatus.state !== "preconfirmed" && s.virtualStatus.commitmentTxIds && s.virtualStatus.commitmentTxIds.some((p) => r.has(p)))
      continue;
    const c = ay(o, s);
    o = za(o, c);
    const a = jr(c);
    if (s.value <= a)
      continue;
    const u = uy(o, s);
    o = za(o, u);
    const f = jr(u);
    if (s.value <= f)
      continue;
    const d = {
      commitmentTxid: "",
      boardingTxid: "",
      arkTxid: ""
    };
    let h = s.virtualStatus.state !== "preconfirmed";
    s.virtualStatus.state === "preconfirmed" ? (d.arkTxid = s.txid, s.spentBy && (h = !0)) : d.commitmentTxid = s.virtualStatus.commitmentTxIds?.[0] || "", n.push({
      key: d,
      amount: s.value - a - f,
      type: Wn.TxReceived,
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
    const a = fy([...e, ...t], s), u = jr(a), f = jr(c);
    if (f <= u)
      continue;
    const d = dy(a, c), h = {
      commitmentTxid: "",
      boardingTxid: "",
      arkTxid: ""
    };
    d.virtualStatus.state === "preconfirmed" ? h.arkTxid = u === 0 ? d.arkTxId : d.txid : h.commitmentTxid = d.virtualStatus.commitmentTxIds?.[0] || "", n.push({
      key: h,
      amount: f - u,
      type: Wn.TxSent,
      createdAt: d.createdAt.getTime(),
      settled: !0
    });
  }
  return n;
}
function ay(e, t) {
  return t.virtualStatus.state === "preconfirmed" ? [] : e.filter((r) => r.settledBy ? t.virtualStatus.commitmentTxIds?.includes(r.settledBy) ?? !1 : !1);
}
function uy(e, t) {
  return e.filter((r) => r.arkTxId ? r.arkTxId === t.txid : !1);
}
function fy(e, t) {
  return e.filter((r) => r.virtualStatus.state !== "preconfirmed" && r.virtualStatus.commitmentTxIds?.includes(t) ? !0 : r.txid === t);
}
function jr(e) {
  return e.reduce((t, r) => t + r.value, 0);
}
function dy(e, t) {
  return e.length === 0 ? t[0] : e[0];
}
function za(e, t) {
  return e.filter((r) => {
    for (const n of t)
      if (r.txid === n.txid && r.vout === n.vout)
        return !1;
    return !0;
  });
}
const ly = (e) => hy[e], hy = {
  bitcoin: er(cn, "ark"),
  testnet: er(_e, "tark"),
  signet: er(_e, "tark"),
  mutinynet: er(_e, "tark"),
  regtest: er({
    ..._e,
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
const py = {
  bitcoin: "https://mempool.space/api",
  testnet: "https://mempool.space/testnet/api",
  signet: "https://mempool.space/signet/api",
  mutinynet: "https://mutinynet.com/api",
  regtest: "http://localhost:3000"
};
class gy {
  constructor(t, r) {
    this.baseUrl = t, this.pollingInterval = r?.pollingInterval ?? 15e3, this.forcePolling = r?.forcePolling ?? !1;
  }
  async getCoins(t) {
    const r = await fetch(`${this.baseUrl}/address/${t}/utxo`);
    if (!r.ok)
      throw new Error(`Failed to fetch UTXOs: ${r.statusText}`);
    return r.json();
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
    const r = await fetch(`${this.baseUrl}/tx/${t}/outspends`);
    if (!r.ok) {
      const n = await r.text();
      throw new Error(`Failed to get transaction outspends: ${n}`);
    }
    return r.json();
  }
  async getTransactions(t) {
    const r = await fetch(`${this.baseUrl}/address/${t}/txs`);
    if (!r.ok) {
      const n = await r.text();
      throw new Error(`Failed to get transactions: ${n}`);
    }
    return r.json();
  }
  async getTxStatus(t) {
    const r = await fetch(`${this.baseUrl}/tx/${t}`);
    if (!r.ok)
      throw new Error(r.statusText);
    if (!(await r.json()).status.confirmed)
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
  async watchAddresses(t, r) {
    let n = null;
    const o = this.baseUrl.replace(/^http(s)?:/, "ws$1:") + "/v1/ws", i = async () => {
      const a = async () => (await Promise.all(t.map((p) => this.getTransactions(p)))).flat(), u = await a(), f = (h) => `${h.txid}_${h.status.block_time}`, d = new Set(u.map(f));
      n = setInterval(async () => {
        try {
          const p = (await a()).filter((w) => !d.has(f(w)));
          p.length > 0 && (p.forEach((w) => d.add(f(w))), r(p));
        } catch (h) {
          console.error("Error in polling mechanism:", h);
        }
      }, this.pollingInterval);
    };
    let s = null;
    const c = () => {
      s && s.close(), n && clearInterval(n);
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
            for (const p of [
              "mempool",
              "confirmed",
              "removed"
            ])
              d[h][p] && u.push(...d[h][p].filter(yy));
          u.length > 0 && r(u);
        } catch (u) {
          console.error("Failed to process WebSocket message:", u);
        }
      }), s.addEventListener("error", async () => {
        await i();
      });
    } catch {
      n && clearInterval(n), await i();
    }
    return c;
  }
  async getChainTip() {
    const t = await fetch(`${this.baseUrl}/blocks/tip`);
    if (!t.ok)
      throw new Error(`Failed to get chain tip: ${t.statusText}`);
    const r = await t.json();
    if (!wy(r))
      throw new Error(`Invalid chain tip: ${JSON.stringify(r)}`);
    if (r.length === 0)
      throw new Error("No chain tip found");
    const n = r[0].id;
    return {
      height: r[0].height,
      time: r[0].mediantime,
      hash: n
    };
  }
  async broadcastPackage(t, r) {
    const n = await fetch(`${this.baseUrl}/txs/package`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify([t, r])
    });
    if (!n.ok) {
      const o = await n.text();
      throw new Error(`Failed to broadcast package: ${o}`);
    }
    return n.json();
  }
  async broadcastTx(t) {
    const r = await fetch(`${this.baseUrl}/tx`, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain"
      },
      body: t
    });
    if (!r.ok) {
      const n = await r.text();
      throw new Error(`Failed to broadcast transaction: ${n}`);
    }
    return r.text();
  }
}
function wy(e) {
  return Array.isArray(e) && e.every((t) => {
    t && typeof t == "object" && typeof t.id == "string" && t.id.length > 0 && typeof t.height == "number" && t.height >= 0 && typeof t.mediantime == "number" && t.mediantime > 0;
  });
}
const yy = (e) => typeof e.txid == "string" && Array.isArray(e.vout) && e.vout.every((t) => typeof t.scriptpubkey_address == "string" && typeof t.value == "number") && typeof e.status == "object" && typeof e.status.confirmed == "boolean", my = 0n, xy = new Uint8Array([81, 2, 78, 115]), Sc = {
  script: xy,
  amount: my
};
v.encode(Sc.script);
function by(e, t, r) {
  const n = new ge({
    version: 3,
    lockTime: r
  });
  let o = 0n;
  for (const i of e) {
    if (!i.witnessUtxo)
      throw new Error("input needs witness utxo");
    o += i.witnessUtxo.amount, n.addInput(i);
  }
  return n.addOutput({
    script: t,
    amount: o
  }), n.addOutput(Sc), n;
}
const Ey = new Error("invalid settlement transaction outputs"), Sy = new Error("empty tree"), Ty = new Error("invalid number of inputs"), Fi = new Error("wrong settlement txid"), vy = new Error("invalid amount"), ky = new Error("no leaves"), Iy = new Error("invalid taproot script"), ja = new Error("invalid round transaction outputs"), Ay = new Error("wrong commitment txid"), By = new Error("missing cosigners public keys"), Ki = 0, Ga = 1;
function $y(e, t) {
  if (t.validate(), t.root.inputsLength !== 1)
    throw Ty;
  const r = t.root.getInput(0), n = at.fromPSBT(q.decode(e));
  if (n.outputsLength <= Ga)
    throw Ey;
  const o = n.id;
  if (!r.txid || v.encode(r.txid) !== o || r.index !== Ga)
    throw Fi;
}
function Ry(e, t, r) {
  if (t.outputsLength < Ki + 1)
    throw ja;
  const n = t.getOutput(Ki)?.amount;
  if (!n)
    throw ja;
  if (!e.root)
    throw Sy;
  const o = e.root.getInput(0), i = t.id;
  if (!o.txid || v.encode(o.txid) !== i || o.index !== Ki)
    throw Ay;
  let s = 0n;
  for (let a = 0; a < e.root.outputsLength; a++) {
    const u = e.root.getOutput(a);
    u?.amount && (s += u.amount);
  }
  if (s !== n)
    throw vy;
  if (e.leaves().length === 0)
    throw ky;
  e.validate();
  for (const a of e.iterator())
    for (const [u, f] of a.children) {
      const d = a.root.getOutput(u);
      if (!d?.script)
        throw new Error(`parent output ${u} not found`);
      const h = d.script.slice(2);
      if (h.length !== 32)
        throw new Error(`parent output ${u} has invalid script`);
      const p = _w(f.root, 0, Vw);
      if (p.length === 0)
        throw By;
      const w = p.map((x) => x.key), { finalKey: y } = Cw(w, !0, {
        taprootTweak: r
      });
      if (!y || v.encode(y.slice(1)) !== v.encode(h))
        throw Iy;
    }
}
function Oy(e, t, r) {
  let n = !1;
  for (const [s, c] of t.entries()) {
    if (!c.script)
      throw new Error(`missing output script ${s}`);
    if (D.decode(c.script)[0] === "RETURN") {
      if (n)
        throw new Error("multiple OP_RETURN outputs");
      n = !0;
    }
  }
  const o = e.map((s) => Uy(s, r));
  return {
    arkTx: Hd(o.map((s) => s.input), t),
    checkpoints: o.map((s) => s.tx)
  };
}
function Hd(e, t) {
  let r = 0n;
  for (const o of e) {
    const i = _d(fr(o.tapLeafScript));
    if (Kn.is(i)) {
      if (r !== 0n && qa(r) !== qa(i.params.absoluteTimelock))
        throw new Error("cannot mix seconds and blocks locktime");
      i.params.absoluteTimelock > r && (r = i.params.absoluteTimelock);
    }
  }
  const n = new ge({
    version: 3,
    lockTime: Number(r)
  });
  for (const [o, i] of e.entries())
    n.addInput({
      txid: i.txid,
      index: i.vout,
      sequence: r ? ci - 1 : void 0,
      witnessUtxo: {
        script: Wt.decode(i.tapTree).pkScript,
        amount: BigInt(i.value)
      },
      tapLeafScript: [i.tapLeafScript]
    }), Pw(n, o, Pd, i.tapTree);
  for (const o of t)
    n.addOutput(o);
  return n.addOutput(Sc), n;
}
function Uy(e, t) {
  const r = _d(fr(e.tapLeafScript)), n = new Wt([
    t.script,
    r.script
  ]), o = Hd([e], [
    {
      amount: BigInt(e.value),
      script: n.pkScript
    }
  ]), i = n.findLeaf(v.encode(r.script)), s = {
    txid: o.id,
    vout: 0,
    value: e.value,
    tapLeafScript: i,
    tapTree: n.encode()
  };
  return {
    tx: o,
    input: s
  };
}
const Ny = 500000000n;
function qa(e) {
  return e >= Ny;
}
function Cy(e, t) {
  if (!e.status.block_time)
    return !1;
  if (t.value === 0n)
    return !0;
  if (t.type === "blocks")
    return !1;
  const r = BigInt(Math.floor(Date.now() / 1e3));
  return BigInt(Math.floor(e.status.block_time)) + t.value <= r;
}
const Py = 4320 * 60 * 1e3, _y = {
  thresholdMs: Py
  // 3 days
};
class lt {
  constructor(t, r, n = lt.DefaultHRP) {
    this.preimage = t, this.value = r, this.HRP = n, this.vout = 0;
    const o = mt(this.preimage);
    this.vtxoScript = new Wt([Dy(o)]);
    const i = this.vtxoScript.leaves[0];
    this.txid = v.encode(new Uint8Array(o).reverse()), this.tapTree = this.vtxoScript.encode(), this.forfeitTapLeafScript = i, this.intentTapLeafScript = i, this.value = r, this.status = { confirmed: !0 }, this.extraWitness = [this.preimage];
  }
  encode() {
    const t = new Uint8Array(lt.Length);
    return t.set(this.preimage, 0), Ly(t, this.value, this.preimage.length), t;
  }
  static decode(t, r = lt.DefaultHRP) {
    if (t.length !== lt.Length)
      throw new Error(`invalid data length: expected ${lt.Length} bytes, got ${t.length}`);
    const n = t.subarray(0, lt.PreimageLength), o = Vy(t, lt.PreimageLength);
    return new lt(n, o, r);
  }
  static fromString(t, r = lt.DefaultHRP) {
    if (t = t.trim(), !t.startsWith(r))
      throw new Error(`invalid human-readable part: expected ${r} prefix (note '${t}')`);
    const n = t.slice(r.length), o = hr.decode(n);
    if (o.length === 0)
      throw new Error("failed to decode base58 string");
    return lt.decode(o, r);
  }
  toString() {
    return this.HRP + hr.encode(this.encode());
  }
}
lt.DefaultHRP = "arknote";
lt.PreimageLength = 32;
lt.ValueLength = 4;
lt.Length = lt.PreimageLength + lt.ValueLength;
lt.FakeOutpointIndex = 0;
function Ly(e, t, r) {
  new DataView(e.buffer, e.byteOffset + r, 4).setUint32(0, t, !1);
}
function Vy(e, t) {
  return new DataView(e.buffer, e.byteOffset + t, 4).getUint32(0, !1);
}
function Dy(e) {
  return D.encode(["SHA256", e, "EQUAL"]);
}
var Us;
(function(e) {
  e[e.INDEXER_TX_TYPE_UNSPECIFIED = 0] = "INDEXER_TX_TYPE_UNSPECIFIED", e[e.INDEXER_TX_TYPE_RECEIVED = 1] = "INDEXER_TX_TYPE_RECEIVED", e[e.INDEXER_TX_TYPE_SENT = 2] = "INDEXER_TX_TYPE_SENT";
})(Us || (Us = {}));
var kn;
(function(e) {
  e.UNSPECIFIED = "INDEXER_CHAINED_TX_TYPE_UNSPECIFIED", e.COMMITMENT = "INDEXER_CHAINED_TX_TYPE_COMMITMENT", e.ARK = "INDEXER_CHAINED_TX_TYPE_ARK", e.TREE = "INDEXER_CHAINED_TX_TYPE_TREE", e.CHECKPOINT = "INDEXER_CHAINED_TX_TYPE_CHECKPOINT";
})(kn || (kn = {}));
class Hy {
  constructor(t) {
    this.serverUrl = t;
  }
  async getVtxoTree(t, r) {
    let n = `${this.serverUrl}/v1/indexer/batch/${t.txid}/${t.vout}/tree`;
    const o = new URLSearchParams();
    r && (r.pageIndex !== void 0 && o.append("page.index", r.pageIndex.toString()), r.pageSize !== void 0 && o.append("page.size", r.pageSize.toString())), o.toString() && (n += "?" + o.toString());
    const i = await fetch(n);
    if (!i.ok)
      throw new Error(`Failed to fetch vtxo tree: ${i.statusText}`);
    const s = await i.json();
    if (!jt.isVtxoTreeResponse(s))
      throw new Error("Invalid vtxo tree data received");
    return s.vtxoTree.forEach((c) => {
      c.children = Object.fromEntries(Object.entries(c.children).map(([a, u]) => [
        Number(a),
        u
      ]));
    }), s;
  }
  async getVtxoTreeLeaves(t, r) {
    let n = `${this.serverUrl}/v1/indexer/batch/${t.txid}/${t.vout}/tree/leaves`;
    const o = new URLSearchParams();
    r && (r.pageIndex !== void 0 && o.append("page.index", r.pageIndex.toString()), r.pageSize !== void 0 && o.append("page.size", r.pageSize.toString())), o.toString() && (n += "?" + o.toString());
    const i = await fetch(n);
    if (!i.ok)
      throw new Error(`Failed to fetch vtxo tree leaves: ${i.statusText}`);
    const s = await i.json();
    if (!jt.isVtxoTreeLeavesResponse(s))
      throw new Error("Invalid vtxos tree leaves data received");
    return s;
  }
  async getBatchSweepTransactions(t) {
    const r = `${this.serverUrl}/v1/indexer/batch/${t.txid}/${t.vout}/sweepTxs`, n = await fetch(r);
    if (!n.ok)
      throw new Error(`Failed to fetch batch sweep transactions: ${n.statusText}`);
    const o = await n.json();
    if (!jt.isBatchSweepTransactionsResponse(o))
      throw new Error("Invalid batch sweep transactions data received");
    return o;
  }
  async getCommitmentTx(t) {
    const r = `${this.serverUrl}/v1/indexer/commitmentTx/${t}`, n = await fetch(r);
    if (!n.ok)
      throw new Error(`Failed to fetch commitment tx: ${n.statusText}`);
    const o = await n.json();
    if (!jt.isCommitmentTx(o))
      throw new Error("Invalid commitment tx data received");
    return o;
  }
  async getCommitmentTxConnectors(t, r) {
    let n = `${this.serverUrl}/v1/indexer/commitmentTx/${t}/connectors`;
    const o = new URLSearchParams();
    r && (r.pageIndex !== void 0 && o.append("page.index", r.pageIndex.toString()), r.pageSize !== void 0 && o.append("page.size", r.pageSize.toString())), o.toString() && (n += "?" + o.toString());
    const i = await fetch(n);
    if (!i.ok)
      throw new Error(`Failed to fetch commitment tx connectors: ${i.statusText}`);
    const s = await i.json();
    if (!jt.isConnectorsResponse(s))
      throw new Error("Invalid commitment tx connectors data received");
    return s.connectors.forEach((c) => {
      c.children = Object.fromEntries(Object.entries(c.children).map(([a, u]) => [
        Number(a),
        u
      ]));
    }), s;
  }
  async getCommitmentTxForfeitTxs(t, r) {
    let n = `${this.serverUrl}/v1/indexer/commitmentTx/${t}/forfeitTxs`;
    const o = new URLSearchParams();
    r && (r.pageIndex !== void 0 && o.append("page.index", r.pageIndex.toString()), r.pageSize !== void 0 && o.append("page.size", r.pageSize.toString())), o.toString() && (n += "?" + o.toString());
    const i = await fetch(n);
    if (!i.ok)
      throw new Error(`Failed to fetch commitment tx forfeitTxs: ${i.statusText}`);
    const s = await i.json();
    if (!jt.isForfeitTxsResponse(s))
      throw new Error("Invalid commitment tx forfeitTxs data received");
    return s;
  }
  async *getSubscription(t, r) {
    const n = `${this.serverUrl}/v1/indexer/script/subscription/${t}`;
    for (; !r?.aborted; )
      try {
        const o = new EventSource(n), i = () => {
          o.close();
        };
        r?.addEventListener("abort", i);
        try {
          for await (const s of $s(o)) {
            if (r?.aborted)
              break;
            try {
              const c = JSON.parse(s.data);
              c.event && (yield {
                txid: c.event.txid,
                scripts: c.event.scripts || [],
                newVtxos: (c.event.newVtxos || []).map(Gr),
                spentVtxos: (c.event.spentVtxos || []).map(Gr),
                sweptVtxos: (c.event.sweptVtxos || []).map(Gr),
                tx: c.event.tx,
                checkpointTxs: c.event.checkpointTxs
              });
            } catch (c) {
              throw console.error("Failed to parse subscription event:", c), c;
            }
          }
        } finally {
          r?.removeEventListener("abort", i), o.close();
        }
      } catch (o) {
        if (o instanceof Error && o.name === "AbortError")
          break;
        if (Rs(o)) {
          console.debug("Timeout error ignored");
          continue;
        }
        throw console.error("Subscription error:", o), o;
      }
  }
  async getVirtualTxs(t, r) {
    let n = `${this.serverUrl}/v1/indexer/virtualTx/${t.join(",")}`;
    const o = new URLSearchParams();
    r && (r.pageIndex !== void 0 && o.append("page.index", r.pageIndex.toString()), r.pageSize !== void 0 && o.append("page.size", r.pageSize.toString())), o.toString() && (n += "?" + o.toString());
    const i = await fetch(n);
    if (!i.ok)
      throw new Error(`Failed to fetch virtual txs: ${i.statusText}`);
    const s = await i.json();
    if (!jt.isVirtualTxsResponse(s))
      throw new Error("Invalid virtual txs data received");
    return s;
  }
  async getVtxoChain(t, r) {
    let n = `${this.serverUrl}/v1/indexer/vtxo/${t.txid}/${t.vout}/chain`;
    const o = new URLSearchParams();
    r && (r.pageIndex !== void 0 && o.append("page.index", r.pageIndex.toString()), r.pageSize !== void 0 && o.append("page.size", r.pageSize.toString())), o.toString() && (n += "?" + o.toString());
    const i = await fetch(n);
    if (!i.ok)
      throw new Error(`Failed to fetch vtxo chain: ${i.statusText}`);
    const s = await i.json();
    if (!jt.isVtxoChainResponse(s))
      throw new Error("Invalid vtxo chain data received");
    return s;
  }
  async getVtxos(t) {
    if (t?.scripts && t?.outpoints)
      throw new Error("scripts and outpoints are mutually exclusive options");
    if (!t?.scripts && !t?.outpoints)
      throw new Error("Either scripts or outpoints must be provided");
    let r = `${this.serverUrl}/v1/indexer/vtxos`;
    const n = new URLSearchParams();
    t?.scripts && t.scripts.length > 0 && t.scripts.forEach((s) => {
      n.append("scripts", s);
    }), t?.outpoints && t.outpoints.length > 0 && t.outpoints.forEach((s) => {
      n.append("outpoints", `${s.txid}:${s.vout}`);
    }), t && (t.spendableOnly !== void 0 && n.append("spendableOnly", t.spendableOnly.toString()), t.spentOnly !== void 0 && n.append("spentOnly", t.spentOnly.toString()), t.recoverableOnly !== void 0 && n.append("recoverableOnly", t.recoverableOnly.toString()), t.pageIndex !== void 0 && n.append("page.index", t.pageIndex.toString()), t.pageSize !== void 0 && n.append("page.size", t.pageSize.toString())), n.toString() && (r += "?" + n.toString());
    const o = await fetch(r);
    if (!o.ok)
      throw new Error(`Failed to fetch vtxos: ${o.statusText}`);
    const i = await o.json();
    if (!jt.isVtxosResponse(i))
      throw new Error("Invalid vtxos data received");
    return {
      vtxos: i.vtxos.map(Gr),
      page: i.page
    };
  }
  async subscribeForScripts(t, r) {
    const n = `${this.serverUrl}/v1/indexer/script/subscribe`, o = await fetch(n, {
      headers: {
        "Content-Type": "application/json"
      },
      method: "POST",
      body: JSON.stringify({ scripts: t, subscriptionId: r })
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
  async unsubscribeForScripts(t, r) {
    const n = `${this.serverUrl}/v1/indexer/script/unsubscribe`, o = await fetch(n, {
      headers: {
        "Content-Type": "application/json"
      },
      method: "POST",
      body: JSON.stringify({ subscriptionId: t, scripts: r })
    });
    if (!o.ok) {
      const i = await o.text();
      console.warn(`Failed to unsubscribe to scripts: ${i}`);
    }
  }
}
function Gr(e) {
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
var jt;
(function(e) {
  function t(g) {
    return typeof g == "object" && typeof g.totalOutputAmount == "string" && typeof g.totalOutputVtxos == "number" && typeof g.expiresAt == "string" && typeof g.swept == "boolean";
  }
  function r(g) {
    return typeof g == "object" && typeof g.txid == "string" && typeof g.expiresAt == "string" && Object.values(kn).includes(g.type) && Array.isArray(g.spends) && g.spends.every((K) => typeof K == "string");
  }
  function n(g) {
    return typeof g == "object" && typeof g.startedAt == "string" && typeof g.endedAt == "string" && typeof g.totalInputAmount == "string" && typeof g.totalInputVtxos == "number" && typeof g.totalOutputAmount == "string" && typeof g.totalOutputVtxos == "number" && typeof g.batches == "object" && Object.values(g.batches).every(t);
  }
  e.isCommitmentTx = n;
  function o(g) {
    return typeof g == "object" && typeof g.txid == "string" && typeof g.vout == "number";
  }
  e.isOutpoint = o;
  function i(g) {
    return Array.isArray(g) && g.every(o);
  }
  e.isOutpointArray = i;
  function s(g) {
    return typeof g == "object" && typeof g.txid == "string" && typeof g.children == "object" && Object.values(g.children).every(f) && Object.keys(g.children).every((K) => Number.isInteger(Number(K)));
  }
  function c(g) {
    return Array.isArray(g) && g.every(s);
  }
  e.isTxsArray = c;
  function a(g) {
    return typeof g == "object" && typeof g.amount == "string" && typeof g.createdAt == "string" && typeof g.isSettled == "boolean" && typeof g.settledBy == "string" && Object.values(Us).includes(g.type) && (!g.commitmentTxid && typeof g.virtualTxid == "string" || typeof g.commitmentTxid == "string" && !g.virtualTxid);
  }
  function u(g) {
    return Array.isArray(g) && g.every(a);
  }
  e.isTxHistoryRecordArray = u;
  function f(g) {
    return typeof g == "string" && g.length === 64;
  }
  function d(g) {
    return Array.isArray(g) && g.every(f);
  }
  e.isTxidArray = d;
  function h(g) {
    return typeof g == "object" && o(g.outpoint) && typeof g.createdAt == "string" && (g.expiresAt === null || typeof g.expiresAt == "string") && typeof g.amount == "string" && typeof g.script == "string" && typeof g.isPreconfirmed == "boolean" && typeof g.isSwept == "boolean" && typeof g.isUnrolled == "boolean" && typeof g.isSpent == "boolean" && (!g.spentBy || typeof g.spentBy == "string") && (!g.settledBy || typeof g.settledBy == "string") && (!g.arkTxid || typeof g.arkTxid == "string") && Array.isArray(g.commitmentTxids) && g.commitmentTxids.every(f);
  }
  function p(g) {
    return typeof g == "object" && typeof g.current == "number" && typeof g.next == "number" && typeof g.total == "number";
  }
  function w(g) {
    return typeof g == "object" && Array.isArray(g.vtxoTree) && g.vtxoTree.every(s) && (!g.page || p(g.page));
  }
  e.isVtxoTreeResponse = w;
  function y(g) {
    return typeof g == "object" && Array.isArray(g.leaves) && g.leaves.every(o) && (!g.page || p(g.page));
  }
  e.isVtxoTreeLeavesResponse = y;
  function x(g) {
    return typeof g == "object" && Array.isArray(g.connectors) && g.connectors.every(s) && (!g.page || p(g.page));
  }
  e.isConnectorsResponse = x;
  function T(g) {
    return typeof g == "object" && Array.isArray(g.txids) && g.txids.every(f) && (!g.page || p(g.page));
  }
  e.isForfeitTxsResponse = T;
  function A(g) {
    return typeof g == "object" && Array.isArray(g.sweptBy) && g.sweptBy.every(f);
  }
  e.isSweptCommitmentTxResponse = A;
  function R(g) {
    return typeof g == "object" && Array.isArray(g.sweptBy) && g.sweptBy.every(f);
  }
  e.isBatchSweepTransactionsResponse = R;
  function C(g) {
    return typeof g == "object" && Array.isArray(g.txs) && g.txs.every((K) => typeof K == "string") && (!g.page || p(g.page));
  }
  e.isVirtualTxsResponse = C;
  function $(g) {
    return typeof g == "object" && Array.isArray(g.chain) && g.chain.every(r) && (!g.page || p(g.page));
  }
  e.isVtxoChainResponse = $;
  function V(g) {
    return typeof g == "object" && Array.isArray(g.vtxos) && g.vtxos.every(h) && (!g.page || p(g.page));
  }
  e.isVtxosResponse = V;
})(jt || (jt = {}));
class Fy {
  constructor() {
    this.store = /* @__PURE__ */ new Map();
  }
  async getItem(t) {
    return this.store.get(t) ?? null;
  }
  async setItem(t, r) {
    this.store.set(t, r);
  }
  async removeItem(t) {
    this.store.delete(t);
  }
  async clear() {
    this.store.clear();
  }
}
const qr = (e) => `vtxos:${e}`, Yr = (e) => `utxos:${e}`, Wi = (e) => `tx:${e}`, Ya = "wallet:state", jo = (e) => e ? v.encode(e) : void 0, Mn = (e) => e ? v.decode(e) : void 0, Go = ([e, t]) => ({
  cb: v.encode(Ot.encode(e)),
  s: v.encode(t)
}), Za = (e) => ({
  ...e,
  tapTree: jo(e.tapTree),
  forfeitTapLeafScript: Go(e.forfeitTapLeafScript),
  intentTapLeafScript: Go(e.intentTapLeafScript),
  extraWitness: e.extraWitness?.map(jo)
}), Xa = (e) => ({
  ...e,
  tapTree: jo(e.tapTree),
  forfeitTapLeafScript: Go(e.forfeitTapLeafScript),
  intentTapLeafScript: Go(e.intentTapLeafScript),
  extraWitness: e.extraWitness?.map(jo)
}), qo = (e) => {
  const t = Ot.decode(Mn(e.cb)), r = Mn(e.s);
  return [t, r];
}, Ky = (e) => ({
  ...e,
  createdAt: new Date(e.createdAt),
  tapTree: Mn(e.tapTree),
  forfeitTapLeafScript: qo(e.forfeitTapLeafScript),
  intentTapLeafScript: qo(e.intentTapLeafScript),
  extraWitness: e.extraWitness?.map(Mn)
}), Wy = (e) => ({
  ...e,
  tapTree: Mn(e.tapTree),
  forfeitTapLeafScript: qo(e.forfeitTapLeafScript),
  intentTapLeafScript: qo(e.intentTapLeafScript),
  extraWitness: e.extraWitness?.map(Mn)
});
class My {
  constructor(t) {
    this.storage = t;
  }
  async getVtxos(t) {
    const r = await this.storage.getItem(qr(t));
    if (!r)
      return [];
    try {
      return JSON.parse(r).map(Ky);
    } catch (n) {
      return console.error(`Failed to parse VTXOs for address ${t}:`, n), [];
    }
  }
  async saveVtxos(t, r) {
    const n = await this.getVtxos(t);
    for (const o of r) {
      const i = n.findIndex((s) => s.txid === o.txid && s.vout === o.vout);
      i !== -1 ? n[i] = o : n.push(o);
    }
    await this.storage.setItem(qr(t), JSON.stringify(n.map(Za)));
  }
  async removeVtxo(t, r) {
    const n = await this.getVtxos(t), [o, i] = r.split(":"), s = n.filter((c) => !(c.txid === o && c.vout === parseInt(i, 10)));
    await this.storage.setItem(qr(t), JSON.stringify(s.map(Za)));
  }
  async clearVtxos(t) {
    await this.storage.removeItem(qr(t));
  }
  async getUtxos(t) {
    const r = await this.storage.getItem(Yr(t));
    if (!r)
      return [];
    try {
      return JSON.parse(r).map(Wy);
    } catch (n) {
      return console.error(`Failed to parse UTXOs for address ${t}:`, n), [];
    }
  }
  async saveUtxos(t, r) {
    const n = await this.getUtxos(t);
    r.forEach((o) => {
      const i = n.findIndex((s) => s.txid === o.txid && s.vout === o.vout);
      i !== -1 ? n[i] = o : n.push(o);
    }), await this.storage.setItem(Yr(t), JSON.stringify(n.map(Xa)));
  }
  async removeUtxo(t, r) {
    const n = await this.getUtxos(t), [o, i] = r.split(":"), s = n.filter((c) => !(c.txid === o && c.vout === parseInt(i, 10)));
    await this.storage.setItem(Yr(t), JSON.stringify(s.map(Xa)));
  }
  async clearUtxos(t) {
    await this.storage.removeItem(Yr(t));
  }
  async getTransactionHistory(t) {
    const r = Wi(t), n = await this.storage.getItem(r);
    if (!n)
      return [];
    try {
      return JSON.parse(n);
    } catch (o) {
      return console.error(`Failed to parse transactions for address ${t}:`, o), [];
    }
  }
  async saveTransactions(t, r) {
    const n = await this.getTransactionHistory(t);
    for (const o of r) {
      const i = n.findIndex((s) => s.key === o.key);
      i !== -1 ? n[i] = o : n.push(o);
    }
    await this.storage.setItem(Wi(t), JSON.stringify(n));
  }
  async clearTransactions(t) {
    await this.storage.removeItem(Wi(t));
  }
  async getWalletState() {
    const t = await this.storage.getItem(Ya);
    if (!t)
      return null;
    try {
      return JSON.parse(t);
    } catch (r) {
      return console.error("Failed to parse wallet state:", r), null;
    }
  }
  async saveWalletState(t) {
    await this.storage.setItem(Ya, JSON.stringify(t));
  }
}
const Mi = (e, t) => `contract:${e}:${t}`, zi = (e) => `collection:${e}`;
class zy {
  constructor(t) {
    this.storage = t;
  }
  async getContractData(t, r) {
    const n = await this.storage.getItem(Mi(t, r));
    if (!n)
      return null;
    try {
      return JSON.parse(n);
    } catch (o) {
      return console.error(`Failed to parse contract data for ${t}:${r}:`, o), null;
    }
  }
  async setContractData(t, r, n) {
    try {
      await this.storage.setItem(Mi(t, r), JSON.stringify(n));
    } catch (o) {
      throw console.error(`Failed to persist contract data for ${t}:${r}:`, o), o;
    }
  }
  async deleteContractData(t, r) {
    try {
      await this.storage.removeItem(Mi(t, r));
    } catch (n) {
      throw console.error(`Failed to remove contract data for ${t}:${r}:`, n), n;
    }
  }
  async getContractCollection(t) {
    const r = await this.storage.getItem(zi(t));
    if (!r)
      return [];
    try {
      return JSON.parse(r);
    } catch (n) {
      return console.error(`Failed to parse contract collection ${t}:`, n), [];
    }
  }
  async saveToContractCollection(t, r, n) {
    const o = await this.getContractCollection(t), i = r[n];
    if (i == null)
      throw new Error(`Item is missing required field '${String(n)}'`);
    const s = o.findIndex((a) => a[n] === i);
    let c;
    s !== -1 ? c = [
      ...o.slice(0, s),
      r,
      ...o.slice(s + 1)
    ] : c = [...o, r];
    try {
      await this.storage.setItem(zi(t), JSON.stringify(c));
    } catch (a) {
      throw console.error(`Failed to persist contract collection ${t}:`, a), a;
    }
  }
  async removeFromContractCollection(t, r, n) {
    if (r == null)
      throw new Error(`Invalid id provided for removal: ${String(r)}`);
    const i = (await this.getContractCollection(t)).filter((s) => s[n] !== r);
    try {
      await this.storage.setItem(zi(t), JSON.stringify(i));
    } catch (s) {
      throw console.error(`Failed to persist contract collection removal for ${t}:`, s), s;
    }
  }
  async clearContractData() {
    await this.storage.clear();
  }
}
function dr(e, t) {
  return {
    ...t,
    forfeitTapLeafScript: e.offchainTapscript.forfeit(),
    intentTapLeafScript: e.offchainTapscript.forfeit(),
    tapTree: e.offchainTapscript.encode()
  };
}
function jy(e, t) {
  return {
    ...t,
    forfeitTapLeafScript: e.boardingTapscript.forfeit(),
    intentTapLeafScript: e.boardingTapscript.forfeit(),
    tapTree: e.boardingTapscript.encode()
  };
}
function Gy(e) {
  return typeof e == "object" && e !== null && "toReadonly" in e && typeof e.toReadonly == "function";
}
class In {
  constructor(t, r, n, o, i, s, c, a, u, f) {
    this.identity = t, this.network = r, this.onchainProvider = n, this.indexerProvider = o, this.arkServerPublicKey = i, this.offchainTapscript = s, this.boardingTapscript = c, this.dustAmount = a, this.walletRepository = u, this.contractRepository = f;
  }
  /**
   * Protected helper to set up shared wallet configuration.
   * Extracts common logic used by both ReadonlyWallet.create() and Wallet.create().
   */
  static async setupWalletConfig(t, r) {
    const n = t.arkProvider || (() => {
      if (!t.arkServerUrl)
        throw new Error("Either arkProvider or arkServerUrl must be provided");
      return new ey(t.arkServerUrl);
    })(), o = t.arkServerUrl || n.serverUrl;
    if (!o)
      throw new Error("Could not determine arkServerUrl from provider");
    const i = t.indexerUrl || o, s = t.indexerProvider || new Hy(i), c = await n.getInfo(), a = ly(c.network), u = t.esploraUrl || py[c.network], f = t.onchainProvider || new gy(u);
    if (t.exitTimelock) {
      const { value: C, type: $ } = t.exitTimelock;
      if (C < 512n && $ !== "blocks" || C >= 512n && $ !== "seconds")
        throw new Error("invalid exitTimelock");
    }
    const d = t.exitTimelock ?? {
      value: c.unilateralExitDelay,
      type: c.unilateralExitDelay < 512n ? "blocks" : "seconds"
    };
    if (t.boardingTimelock) {
      const { value: C, type: $ } = t.boardingTimelock;
      if (C < 512n && $ !== "blocks" || C >= 512n && $ !== "seconds")
        throw new Error("invalid boardingTimelock");
    }
    const h = t.boardingTimelock ?? {
      value: c.boardingExitDelay,
      type: c.boardingExitDelay < 512n ? "blocks" : "seconds"
    }, p = v.decode(c.signerPubkey).slice(1), w = new zo.Script({
      pubKey: r,
      serverPubKey: p,
      csvTimelock: d
    }), y = new zo.Script({
      pubKey: r,
      serverPubKey: p,
      csvTimelock: h
    }), x = w, T = t.storage || new Fy(), A = new My(T), R = new zy(T);
    return {
      arkProvider: n,
      indexerProvider: s,
      onchainProvider: f,
      network: a,
      networkName: c.network,
      serverPubKey: p,
      offchainTapscript: x,
      boardingTapscript: y,
      dustAmount: c.dust,
      walletRepository: A,
      contractRepository: R,
      info: c
    };
  }
  static async create(t) {
    const r = await t.identity.xOnlyPublicKey();
    if (!r)
      throw new Error("Invalid configured public key");
    const n = await In.setupWalletConfig(t, r);
    return new In(t.identity, n.network, n.onchainProvider, n.indexerProvider, n.serverPubKey, n.offchainTapscript, n.boardingTapscript, n.dustAmount, n.walletRepository, n.contractRepository);
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
    const [t, r] = await Promise.all([
      this.getBoardingUtxos(),
      this.getVtxos()
    ]);
    let n = 0, o = 0;
    for (const f of t)
      f.status.confirmed ? n += f.value : o += f.value;
    let i = 0, s = 0, c = 0;
    i = r.filter((f) => f.virtualStatus.state === "settled").reduce((f, d) => f + d.value, 0), s = r.filter((f) => f.virtualStatus.state === "preconfirmed").reduce((f, d) => f + d.value, 0), c = r.filter((f) => rr(f) && f.virtualStatus.state === "swept").reduce((f, d) => f + d.value, 0);
    const a = n + o, u = i + s + c;
    return {
      boarding: {
        confirmed: n,
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
    const r = await this.getAddress(), o = (await this.getVirtualCoins(t)).map((i) => dr(this, i));
    return await this.walletRepository.saveVtxos(r, o), o;
  }
  async getVirtualCoins(t = { withRecoverable: !0, withUnrolled: !1 }) {
    const r = [v.encode(this.offchainTapscript.pkScript)], o = (await this.indexerProvider.getVtxos({ scripts: r })).vtxos;
    let i = o.filter(rr);
    if (t.withRecoverable || (i = i.filter((s) => !Ld(s) && !Hw(s))), t.withUnrolled) {
      const s = o.filter((c) => !rr(c));
      i.push(...s.filter((c) => c.isUnrolled));
    }
    return i;
  }
  async getTransactionHistory() {
    const t = await this.indexerProvider.getVtxos({
      scripts: [v.encode(this.offchainTapscript.pkScript)]
    }), { boardingTxs: r, commitmentsToIgnore: n } = await this.getBoardingTxs(), o = [], i = [];
    for (const a of t.vtxos)
      rr(a) ? o.push(a) : i.push(a);
    const s = cy(o, i, n), c = [...r, ...s];
    return c.sort(
      // place createdAt = 0 (unconfirmed txs) first, then descending
      (a, u) => a.createdAt === 0 ? -1 : u.createdAt === 0 ? 1 : u.createdAt - a.createdAt
    ), c;
  }
  async getBoardingTxs() {
    const t = [], r = /* @__PURE__ */ new Set(), n = await this.getBoardingAddress(), o = await this.onchainProvider.getTransactions(n);
    for (const c of o)
      for (let a = 0; a < c.vout.length; a++) {
        const u = c.vout[a];
        if (u.scriptpubkey_address === n) {
          const d = (await this.onchainProvider.getTxOutspends(c.txid))[a];
          d?.spent && r.add(d.txid), t.push({
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
        type: Wn.TxReceived,
        settled: c.virtualStatus.state === "spent",
        createdAt: c.status.block_time ? new Date(c.status.block_time * 1e3).getTime() : 0
      };
      c.status.block_time ? s.push(a) : i.push(a);
    }
    return {
      boardingTxs: [...i, ...s],
      commitmentsToIgnore: r
    };
  }
  async getBoardingUtxos() {
    const t = await this.getBoardingAddress(), n = (await this.onchainProvider.getCoins(t)).map((o) => jy(this, o));
    return await this.walletRepository.saveUtxos(t, n), n;
  }
  async notifyIncomingFunds(t) {
    const r = await this.getAddress(), n = await this.getBoardingAddress();
    let o, i;
    if (this.onchainProvider && n) {
      const c = (a) => a.vout.findIndex((u) => u.scriptpubkey_address === n);
      o = await this.onchainProvider.watchAddresses([n], (a) => {
        const u = a.filter((f) => c(f) !== -1).map((f) => {
          const { txid: d, status: h } = f, p = c(f), w = Number(f.vout[p].value);
          return { txid: d, vout: p, value: w, status: h };
        });
        t({
          type: "utxo",
          coins: u
        });
      });
    }
    if (this.indexerProvider && r) {
      const c = this.offchainTapscript, a = await this.indexerProvider.subscribeForScripts([
        v.encode(c.pkScript)
      ]), u = new AbortController(), f = this.indexerProvider.getSubscription(a, u.signal);
      i = async () => {
        u.abort(), await this.indexerProvider?.unsubscribeForScripts(a);
      }, (async () => {
        try {
          for await (const d of f)
            (d.newVtxos?.length > 0 || d.spentVtxos?.length > 0) && t({
              type: "vtxo",
              newVtxos: d.newVtxos.map((h) => dr(this, h)),
              spentVtxos: d.spentVtxos.map((h) => dr(this, h))
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
    const t = [v.encode(this.offchainTapscript.pkScript)];
    let { vtxos: r } = await this.indexerProvider.getVtxos({
      scripts: t
    });
    return r.filter((n) => n.virtualStatus.state !== "swept" && n.virtualStatus.state !== "settled" && n.arkTxId !== void 0).map((n) => n.arkTxId);
  }
}
class Er extends In {
  constructor(t, r, n, o, i, s, c, a, u, f, d, h, p, w, y, x) {
    super(t, r, o, s, c, a, u, p, w, y), this.networkName = n, this.arkProvider = i, this.serverUnrollScript = f, this.forfeitOutputScript = d, this.forfeitPubkey = h, this.identity = t, this.renewalConfig = {
      enabled: x?.enabled ?? !1,
      ..._y,
      ...x
    };
  }
  static async create(t) {
    const r = await t.identity.xOnlyPublicKey();
    if (!r)
      throw new Error("Invalid configured public key");
    const n = await In.setupWalletConfig(t, r);
    let o;
    try {
      const a = v.decode(n.info.checkpointTapscript);
      o = _t.decode(a);
    } catch {
      throw new Error("Invalid checkpointTapscript from server");
    }
    const i = v.decode(n.info.forfeitPubkey).slice(1), s = de(n.network).decode(n.info.forfeitAddress), c = ct.encode(s);
    return new Er(t.identity, n.network, n.networkName, n.onchainProvider, n.arkProvider, n.indexerProvider, n.serverPubKey, n.offchainTapscript, n.boardingTapscript, o, c, i, n.dustAmount, n.walletRepository, n.contractRepository, t.renewalConfig);
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
    const t = Gy(this.identity) ? await this.identity.toReadonly() : this.identity;
    return new In(t, this.network, this.onchainProvider, this.indexerProvider, this.arkServerPublicKey, this.offchainTapscript, this.boardingTapscript, this.dustAmount, this.walletRepository, this.contractRepository);
  }
  async sendBitcoin(t) {
    if (t.amount <= 0)
      throw new Error("Amount must be positive");
    if (!Yy(t.address))
      throw new Error("Invalid Ark address " + t.address);
    const r = await this.getVirtualCoins({
      withRecoverable: !1
    }), n = Zy(r, t.amount), o = this.offchainTapscript.forfeit();
    if (!o)
      throw new Error("Selected leaf not found");
    const i = Fn.decode(t.address), c = [
      {
        script: BigInt(t.amount) < this.dustAmount ? i.subdustPkScript : i.pkScript,
        amount: BigInt(t.amount)
      }
    ];
    if (n.changeAmount > 0n) {
      const w = n.changeAmount < this.dustAmount ? this.arkAddress.subdustPkScript : this.arkAddress.pkScript;
      c.push({
        script: w,
        amount: BigInt(n.changeAmount)
      });
    }
    const a = this.offchainTapscript.encode(), u = Oy(n.inputs.map((w) => ({
      ...w,
      tapLeafScript: o,
      tapTree: a
    })), c, this.serverUnrollScript), f = await this.identity.sign(u.arkTx), { arkTxid: d, signedCheckpointTxs: h } = await this.arkProvider.submitTx(q.encode(f.toPSBT()), u.checkpoints.map((w) => q.encode(w.toPSBT()))), p = await Promise.all(h.map(async (w) => {
      const y = at.fromPSBT(q.decode(w)), x = await this.identity.sign(y);
      return q.encode(x.toPSBT());
    }));
    await this.arkProvider.finalizeTx(d, p);
    try {
      const w = [], y = /* @__PURE__ */ new Set();
      let x = Number.MAX_SAFE_INTEGER;
      for (const [R, C] of n.inputs.entries()) {
        const $ = dr(this, C), V = h[R], g = at.fromPSBT(q.decode(V));
        if (w.push({
          ...$,
          virtualStatus: { ...$.virtualStatus, state: "spent" },
          spentBy: g.id,
          arkTxId: d,
          isSpent: !0
        }), $.virtualStatus.commitmentTxIds)
          for (const K of $.virtualStatus.commitmentTxIds)
            y.add(K);
        $.virtualStatus.batchExpiry && (x = Math.min(x, $.virtualStatus.batchExpiry));
      }
      const T = Date.now(), A = this.arkAddress.encode();
      if (n.changeAmount > 0n && x !== Number.MAX_SAFE_INTEGER) {
        const R = {
          txid: d,
          vout: c.length - 1,
          createdAt: new Date(T),
          forfeitTapLeafScript: this.offchainTapscript.forfeit(),
          intentTapLeafScript: this.offchainTapscript.forfeit(),
          isUnrolled: !1,
          isSpent: !1,
          tapTree: this.offchainTapscript.encode(),
          value: Number(n.changeAmount),
          virtualStatus: {
            state: "preconfirmed",
            commitmentTxIds: Array.from(y),
            batchExpiry: x
          },
          status: {
            confirmed: !1
          }
        };
        await this.walletRepository.saveVtxos(A, [R]);
      }
      await this.walletRepository.saveVtxos(A, w), await this.walletRepository.saveTransactions(A, [
        {
          key: {
            boardingTxid: "",
            commitmentTxid: "",
            arkTxid: d
          },
          amount: t.amount,
          type: Wn.TxSent,
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
  async settle(t, r) {
    if (t?.inputs) {
      for (const w of t.inputs)
        if (typeof w == "string")
          try {
            lt.fromString(w);
          } catch {
            throw new Error(`Invalid arknote "${w}"`);
          }
    }
    if (!t) {
      let w = 0;
      const x = _t.decode(v.decode(this.boardingTapscript.exitScript)).params.timelock, T = (await this.getBoardingUtxos()).filter((C) => !Cy(C, x));
      w += T.reduce((C, $) => C + $.value, 0);
      const A = await this.getVtxos({ withRecoverable: !0 });
      w += A.reduce((C, $) => C + $.value, 0);
      const R = [...T, ...A];
      if (R.length === 0)
        throw new Error("No inputs found");
      t = {
        inputs: R,
        outputs: [
          {
            address: await this.getAddress(),
            amount: BigInt(w)
          }
        ]
      };
    }
    const n = [], o = [];
    let i = !1;
    for (const [w, y] of t.outputs.entries()) {
      let x;
      try {
        x = Fn.decode(y.address).pkScript, i = !0;
      } catch {
        const T = de(this.network).decode(y.address);
        x = ct.encode(T), n.push(w);
      }
      o.push({
        amount: y.amount,
        script: x
      });
    }
    let s;
    const c = [];
    i && (s = this.identity.signerSession(), c.push(v.encode(await s.getPublicKey())));
    const [a, u] = await Promise.all([
      this.makeRegisterIntentSignature(t.inputs, o, n, c),
      this.makeDeleteIntentSignature(t.inputs)
    ]), f = await this.safeRegisterIntent(a), d = [
      ...c,
      ...t.inputs.map((w) => `${w.txid}:${w.vout}`)
    ], h = this.createBatchHandler(f, t.inputs, s), p = new AbortController();
    try {
      const w = this.arkProvider.getEventStream(p.signal, d);
      return await Os.join(w, h, {
        abortController: p,
        skipVtxoTreeSigning: !i,
        eventCallback: r ? (y) => Promise.resolve(r(y)) : void 0
      });
    } catch (w) {
      throw await this.arkProvider.deleteIntent(u).catch(() => {
      }), w;
    } finally {
      p.abort();
    }
  }
  async handleSettlementFinalizationEvent(t, r, n, o) {
    const i = [], s = await this.getVirtualCoins();
    let c = at.fromPSBT(q.decode(t.commitmentTx)), a = !1, u = 0;
    const f = o?.leaves() || [];
    for (const d of r) {
      const h = s.find((R) => R.txid === d.txid && R.vout === d.vout);
      if (!h) {
        for (let R = 0; R < c.inputsLength; R++) {
          const C = c.getInput(R);
          if (!C.txid || C.index === void 0)
            throw new Error("The server returned incomplete data. No settlement input found in the PSBT");
          if (v.encode(C.txid) === d.txid && C.index === d.vout) {
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
      if (Ld(h) || Fw(h, this.dustAmount))
        continue;
      if (f.length === 0)
        throw new Error("connectors not received");
      if (u >= f.length)
        throw new Error("not enough connectors received");
      const p = f[u], w = p.id, y = p.getOutput(0);
      if (!y)
        throw new Error("connector output not found");
      const x = y.amount, T = y.script;
      if (!x || !T)
        throw new Error("invalid connector output");
      u++;
      let A = by([
        {
          txid: d.txid,
          index: d.vout,
          witnessUtxo: {
            amount: BigInt(h.value),
            script: Wt.decode(d.tapTree).pkScript
          },
          sighashType: Kt.DEFAULT,
          tapLeafScript: [d.forfeitTapLeafScript]
        },
        {
          txid: w,
          index: 0,
          witnessUtxo: {
            amount: x,
            script: T
          }
        }
      ], n);
      A = await this.identity.sign(A, [0]), i.push(q.encode(A.toPSBT()));
    }
    (i.length > 0 || a) && await this.arkProvider.submitSignedForfeitTxs(i, a ? q.encode(c.toPSBT()) : void 0);
  }
  /**
   * @implements Batch.Handler interface.
   * @param intentId - The intent ID.
   * @param inputs - The inputs of the intent.
   * @param session - The musig2 signing session, if not provided, the signing will be skipped.
   */
  createBatchHandler(t, r, n) {
    let o;
    return {
      onBatchStarted: async (i) => {
        const s = new TextEncoder().encode(t), c = mt(s), a = v.encode(c);
        let u = !0;
        for (const d of i.intentIdHashes)
          if (d === a) {
            if (!this.arkProvider)
              throw new Error("Ark provider not configured");
            await this.arkProvider.confirmRegistration(t), u = !1;
          }
        if (u)
          return { skip: u };
        const f = _t.encode({
          timelock: {
            value: i.batchExpiry,
            type: i.batchExpiry >= 512n ? "seconds" : "blocks"
          },
          pubkeys: [this.forfeitPubkey]
        }).script;
        return o = En(f), { skip: !1 };
      },
      onTreeSigningStarted: async (i, s) => {
        if (!n)
          return { skip: !0 };
        if (!o)
          throw new Error("Sweep tap tree root not set");
        const c = i.cosignersPublicKeys.map((w) => w.slice(2)), u = (await n.getPublicKey()).subarray(1);
        if (!c.includes(v.encode(u)))
          return { skip: !0 };
        const f = at.fromPSBT(q.decode(i.unsignedCommitmentTx));
        Ry(s, f, o);
        const d = f.getOutput(0);
        if (!d?.amount)
          throw new Error("Shared output not found");
        await n.init(s, o, d.amount);
        const h = v.encode(await n.getPublicKey()), p = await n.getNonces();
        return await this.arkProvider.submitTreeNonces(i.id, h, p), { skip: !1 };
      },
      onTreeNonces: async (i) => {
        if (!n)
          return { fullySigned: !0 };
        const { hasAllNonces: s } = await n.aggregatedNonces(i.txid, i.nonces);
        if (!s)
          return { fullySigned: !1 };
        const c = await n.sign(), a = v.encode(await n.getPublicKey());
        return await this.arkProvider.submitTreeSignatures(i.id, a, c), { fullySigned: !0 };
      },
      onBatchFinalization: async (i, s, c) => {
        if (!this.forfeitOutputScript)
          throw new Error("Forfeit output script not set");
        c && $y(i.commitmentTx, c), await this.handleSettlementFinalizationEvent(i, r, this.forfeitOutputScript, c);
      }
    };
  }
  async safeRegisterIntent(t) {
    try {
      return await this.arkProvider.registerIntent(t);
    } catch (r) {
      if (r instanceof Vd && r.code === 0 && r.message.includes("duplicated input")) {
        const n = await this.getVtxos({
          withRecoverable: !0
        }), o = await this.makeDeleteIntentSignature(n);
        return await this.arkProvider.deleteIntent(o), this.arkProvider.registerIntent(t);
      }
      throw r;
    }
  }
  async makeRegisterIntentSignature(t, r, n, o) {
    const i = this.prepareIntentProofInputs(t), s = {
      type: "register",
      onchain_output_indexes: n,
      valid_at: 0,
      expire_at: 0,
      cosigners_public_keys: o
    }, c = Ke.create(s, i, r), a = await this.identity.sign(c);
    return {
      proof: q.encode(a.toPSBT()),
      message: s
    };
  }
  async makeDeleteIntentSignature(t) {
    const r = this.prepareIntentProofInputs(t), n = {
      type: "delete",
      expire_at: 0
    }, o = Ke.create(n, r, []), i = await this.identity.sign(o);
    return {
      proof: q.encode(i.toPSBT()),
      message: n
    };
  }
  async makeGetPendingTxIntentSignature(t) {
    const r = this.prepareIntentProofInputs(t), n = {
      type: "get-pending-tx",
      expire_at: 0
    }, o = Ke.create(n, r, []), i = await this.identity.sign(o);
    return {
      proof: q.encode(i.toPSBT()),
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
      const i = [v.encode(this.offchainTapscript.pkScript)];
      let { vtxos: s } = await this.indexerProvider.getVtxos({
        scripts: i
      });
      if (s = s.filter((c) => c.virtualStatus.state !== "swept" && c.virtualStatus.state !== "settled"), s.length === 0)
        return { finalized: [], pending: [] };
      t = s.map((c) => dr(this, c));
    }
    const n = [], o = [];
    for (let i = 0; i < t.length; i += 20) {
      const s = t.slice(i, i + 20), c = await this.makeGetPendingTxIntentSignature(s), a = await this.arkProvider.getPendingTxs(c);
      for (const u of a) {
        o.push(u.arkTxid);
        try {
          const f = await Promise.all(u.signedCheckpointTxs.map(async (d) => {
            const h = at.fromPSBT(q.decode(d)), p = await this.identity.sign(h);
            return q.encode(p.toPSBT());
          }));
          await this.arkProvider.finalizeTx(u.arkTxid, f), n.push(u.arkTxid);
        } catch (f) {
          console.error(`Failed to finalize transaction ${u.arkTxid}:`, f);
        }
      }
    }
    return { finalized: n, pending: o };
  }
  prepareIntentProofInputs(t) {
    const r = [];
    for (const n of t) {
      const o = Wt.decode(n.tapTree), i = qy(n.intentTapLeafScript), s = [Pd.encode(n.tapTree)];
      n.extraWitness && s.push(Lw.encode(n.extraWitness)), r.push({
        txid: v.decode(n.txid),
        index: n.vout,
        witnessUtxo: {
          amount: BigInt(n.value),
          script: o.pkScript
        },
        sequence: i,
        tapLeafScript: [n.intentTapLeafScript],
        unknown: s
      });
    }
    return r;
  }
}
Er.MIN_FEE_RATE = 1;
function qy(e) {
  let t;
  try {
    const r = e[1], n = r.subarray(0, r.length - 1);
    try {
      const o = _t.decode(n).params;
      t = Ln.encode(o.timelock.type === "blocks" ? { blocks: Number(o.timelock.value) } : { seconds: Number(o.timelock.value) });
    } catch {
      const o = Kn.decode(n).params;
      t = Number(o.absoluteTimelock);
    }
  } catch {
  }
  return t;
}
function Yy(e) {
  try {
    return Fn.decode(e), !0;
  } catch {
    return !1;
  }
}
function Zy(e, t) {
  const r = [...e].sort((s, c) => {
    const a = s.virtualStatus.batchExpiry || Number.MAX_SAFE_INTEGER, u = c.virtualStatus.batchExpiry || Number.MAX_SAFE_INTEGER;
    return a !== u ? a - u : c.value - s.value;
  }), n = [];
  let o = 0;
  for (const s of r)
    if (n.push(s), o += s.value, o >= t)
      break;
  if (o === t)
    return { inputs: n, changeAmount: 0n };
  if (o < t)
    throw new Error("Insufficient funds");
  const i = BigInt(o - t);
  return {
    inputs: n,
    changeAmount: i
  };
}
function Ja() {
  const e = crypto.getRandomValues(new Uint8Array(16));
  return v.encode(e);
}
var Qa;
(function(e) {
  e.walletInitialized = (l) => ({
    type: "WALLET_INITIALIZED",
    success: !0,
    id: l
  });
  function t(l, b) {
    return {
      type: "ERROR",
      success: !1,
      message: b,
      id: l
    };
  }
  e.error = t;
  function r(l, b) {
    return {
      type: "SETTLE_EVENT",
      success: !0,
      event: b,
      id: l
    };
  }
  e.settleEvent = r;
  function n(l, b) {
    return {
      type: "SETTLE_SUCCESS",
      success: !0,
      txid: b,
      id: l
    };
  }
  e.settleSuccess = n;
  function o(l) {
    return l.type === "SETTLE_SUCCESS" && l.success;
  }
  e.isSettleSuccess = o;
  function i(l) {
    return l.type === "ADDRESS" && l.success === !0;
  }
  e.isAddress = i;
  function s(l) {
    return l.type === "BOARDING_ADDRESS" && l.success === !0;
  }
  e.isBoardingAddress = s;
  function c(l, b) {
    return {
      type: "ADDRESS",
      success: !0,
      address: b,
      id: l
    };
  }
  e.address = c;
  function a(l, b) {
    return {
      type: "BOARDING_ADDRESS",
      success: !0,
      address: b,
      id: l
    };
  }
  e.boardingAddress = a;
  function u(l) {
    return l.type === "BALANCE" && l.success === !0;
  }
  e.isBalance = u;
  function f(l, b) {
    return {
      type: "BALANCE",
      success: !0,
      balance: b,
      id: l
    };
  }
  e.balance = f;
  function d(l) {
    return l.type === "VTXOS" && l.success === !0;
  }
  e.isVtxos = d;
  function h(l, b) {
    return {
      type: "VTXOS",
      success: !0,
      vtxos: b,
      id: l
    };
  }
  e.vtxos = h;
  function p(l) {
    return l.type === "VIRTUAL_COINS" && l.success === !0;
  }
  e.isVirtualCoins = p;
  function w(l, b) {
    return {
      type: "VIRTUAL_COINS",
      success: !0,
      virtualCoins: b,
      id: l
    };
  }
  e.virtualCoins = w;
  function y(l) {
    return l.type === "BOARDING_UTXOS" && l.success === !0;
  }
  e.isBoardingUtxos = y;
  function x(l, b) {
    return {
      type: "BOARDING_UTXOS",
      success: !0,
      boardingUtxos: b,
      id: l
    };
  }
  e.boardingUtxos = x;
  function T(l) {
    return l.type === "SEND_BITCOIN_SUCCESS" && l.success === !0;
  }
  e.isSendBitcoinSuccess = T;
  function A(l, b) {
    return {
      type: "SEND_BITCOIN_SUCCESS",
      success: !0,
      txid: b,
      id: l
    };
  }
  e.sendBitcoinSuccess = A;
  function R(l) {
    return l.type === "TRANSACTION_HISTORY" && l.success === !0;
  }
  e.isTransactionHistory = R;
  function C(l, b) {
    return {
      type: "TRANSACTION_HISTORY",
      success: !0,
      transactions: b,
      id: l
    };
  }
  e.transactionHistory = C;
  function $(l) {
    return l.type === "WALLET_STATUS" && l.success === !0;
  }
  e.isWalletStatus = $;
  function V(l, b, k) {
    return {
      type: "WALLET_STATUS",
      success: !0,
      status: {
        walletInitialized: b,
        xOnlyPublicKey: k
      },
      id: l
    };
  }
  e.walletStatus = V;
  function g(l) {
    return l.type === "CLEAR_RESPONSE";
  }
  e.isClearResponse = g;
  function K(l, b) {
    return {
      type: "CLEAR_RESPONSE",
      success: b,
      id: l
    };
  }
  e.clearResponse = K;
  function _(l) {
    return l.type === "WALLET_RELOADED";
  }
  e.isWalletReloaded = _;
  function z(l, b) {
    return {
      type: "WALLET_RELOADED",
      success: b,
      id: l
    };
  }
  e.walletReloaded = z;
  function I(l) {
    return l.type === "VTXO_UPDATE";
  }
  e.isVtxoUpdate = I;
  function S(l, b) {
    return {
      type: "VTXO_UPDATE",
      id: Ja(),
      // spontaneous update, not tied to a request
      success: !0,
      spentVtxos: b,
      newVtxos: l
    };
  }
  e.vtxoUpdate = S;
  function m(l) {
    return l.type === "UTXO_UPDATE";
  }
  e.isUtxoUpdate = m;
  function E(l) {
    return {
      type: "UTXO_UPDATE",
      id: Ja(),
      // spontaneous update, not tied to a request
      success: !0,
      coins: l
    };
  }
  e.utxoUpdate = E;
})(Qa || (Qa = {}));
class et {
  constructor(t, r, n, o, i, s) {
    this.hasWitness = t, this.inputCount = r, this.outputCount = n, this.inputSize = o, this.inputWitnessSize = i, this.outputSize = s;
  }
  static create() {
    return new et(!1, 0, 0, 0, 0, 0);
  }
  addP2AInput() {
    return this.inputCount++, this.inputSize += et.INPUT_SIZE, this;
  }
  addKeySpendInput(t = !0) {
    return this.inputCount++, this.inputWitnessSize += 65 + (t ? 0 : 1), this.inputSize += et.INPUT_SIZE, this.hasWitness = !0, this;
  }
  addP2PKHInput() {
    return this.inputCount++, this.inputWitnessSize++, this.inputSize += et.INPUT_SIZE + et.P2PKH_SCRIPT_SIG_SIZE, this;
  }
  addTapscriptInput(t, r, n) {
    const o = 1 + et.BASE_CONTROL_BLOCK_SIZE + 1 + r + 1 + n;
    return this.inputCount++, this.inputWitnessSize += t + o, this.inputSize += et.INPUT_SIZE, this.hasWitness = !0, this.inputCount++, this;
  }
  addP2WKHOutput() {
    return this.outputCount++, this.outputSize += et.OUTPUT_SIZE + et.P2WKH_OUTPUT_SIZE, this;
  }
  addP2TROutput() {
    return this.outputCount++, this.outputSize += et.OUTPUT_SIZE + et.P2TR_OUTPUT_SIZE, this;
  }
  vsize() {
    const t = (s) => s < 253 ? 1 : s < 65535 ? 3 : s < 4294967295 ? 5 : 9, r = t(this.inputCount), n = t(this.outputCount);
    let i = (et.BASE_TX_SIZE + r + this.inputSize + n + this.outputSize) * et.WITNESS_SCALE_FACTOR;
    return this.hasWitness && (i += et.WITNESS_HEADER_SIZE + this.inputWitnessSize), Xy(i);
  }
}
et.P2PKH_SCRIPT_SIG_SIZE = 108;
et.INPUT_SIZE = 41;
et.BASE_CONTROL_BLOCK_SIZE = 33;
et.OUTPUT_SIZE = 9;
et.P2WKH_OUTPUT_SIZE = 22;
et.BASE_TX_SIZE = 10;
et.WITNESS_HEADER_SIZE = 2;
et.WITNESS_SCALE_FACTOR = 4;
et.P2TR_OUTPUT_SIZE = 34;
const Xy = (e) => {
  const t = BigInt(Math.ceil(e / et.WITNESS_SCALE_FACTOR));
  return {
    value: t,
    fee: (r) => r * t
  };
};
var tu;
(function(e) {
  function t(y) {
    return typeof y == "object" && y !== null && "type" in y;
  }
  e.isBase = t;
  function r(y) {
    return y.type === "INIT_WALLET" && "arkServerUrl" in y && typeof y.arkServerUrl == "string" && ("arkServerPublicKey" in y ? y.arkServerPublicKey === void 0 || typeof y.arkServerPublicKey == "string" : !0);
  }
  e.isInitWallet = r;
  function n(y) {
    return y.type === "SETTLE";
  }
  e.isSettle = n;
  function o(y) {
    return y.type === "GET_ADDRESS";
  }
  e.isGetAddress = o;
  function i(y) {
    return y.type === "GET_BOARDING_ADDRESS";
  }
  e.isGetBoardingAddress = i;
  function s(y) {
    return y.type === "GET_BALANCE";
  }
  e.isGetBalance = s;
  function c(y) {
    return y.type === "GET_VTXOS";
  }
  e.isGetVtxos = c;
  function a(y) {
    return y.type === "GET_VIRTUAL_COINS";
  }
  e.isGetVirtualCoins = a;
  function u(y) {
    return y.type === "GET_BOARDING_UTXOS";
  }
  e.isGetBoardingUtxos = u;
  function f(y) {
    return y.type === "SEND_BITCOIN" && "params" in y && y.params !== null && typeof y.params == "object" && "address" in y.params && typeof y.params.address == "string" && "amount" in y.params && typeof y.params.amount == "number";
  }
  e.isSendBitcoin = f;
  function d(y) {
    return y.type === "GET_TRANSACTION_HISTORY";
  }
  e.isGetTransactionHistory = d;
  function h(y) {
    return y.type === "GET_STATUS";
  }
  e.isGetStatus = h;
  function p(y) {
    return y.type === "CLEAR";
  }
  e.isClear = p;
  function w(y) {
    return y.type === "RELOAD_WALLET";
  }
  e.isReloadWallet = w;
})(tu || (tu = {}));
var eu;
(function(e) {
  let t;
  (function(o) {
    o[o.UNROLL = 0] = "UNROLL", o[o.WAIT = 1] = "WAIT", o[o.DONE = 2] = "DONE";
  })(t = e.StepType || (e.StepType = {}));
  class r {
    constructor(i, s, c, a) {
      this.toUnroll = i, this.bumper = s, this.explorer = c, this.indexer = a;
    }
    static async create(i, s, c, a) {
      const { chain: u } = await a.getVtxoChain(i);
      return new r({ ...i, chain: u }, s, c, a);
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
        if (!(f.type === kn.COMMITMENT || f.type === kn.UNSPECIFIED))
          try {
            if (!(await this.explorer.getTxStatus(f.txid)).confirmed)
              return {
                type: t.WAIT,
                txid: f.txid,
                do: tm(this.explorer, f.txid)
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
      const a = ge.fromPSBT(q.decode(c.txs[0]));
      if (i.type === kn.TREE) {
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
        do: Qy(this.bumper, this.explorer, a)
      };
    }
    /**
     * Iterate over the steps to be executed and execute them
     * @returns An async iterator over the executed steps
     */
    async *[Symbol.asyncIterator]() {
      let i;
      do {
        i !== void 0 && await Jy(1e3);
        const s = await this.next();
        await s.do(), yield s, i = s.type;
      } while (i !== t.DONE);
    }
  }
  e.Session = r;
  async function n(o, i, s) {
    const c = await o.onchainProvider.getChainTip();
    let a = await o.getVtxos({ withUnrolled: !0 });
    if (a = a.filter((x) => i.includes(x.txid)), a.length === 0)
      throw new Error("No vtxos to complete unroll");
    const u = [];
    let f = 0n;
    const d = et.create();
    for (const x of a) {
      if (!x.isUnrolled)
        throw new Error(`Vtxo ${x.txid}:${x.vout} is not fully unrolled, use unroll first`);
      const T = await o.onchainProvider.getTxStatus(x.txid);
      if (!T.confirmed)
        throw new Error(`tx ${x.txid} is not confirmed`);
      const A = em({ height: T.blockHeight, time: T.blockTime }, c, x);
      if (!A)
        throw new Error(`no available exit path found for vtxo ${x.txid}:${x.vout}`);
      const R = Wt.decode(x.tapTree).findLeaf(v.encode(A.script));
      if (!R)
        throw new Error(`spending leaf not found for vtxo ${x.txid}:${x.vout}`);
      f += BigInt(x.value), u.push({
        txid: x.txid,
        index: x.vout,
        tapLeafScript: [R],
        sequence: 4294967294,
        witnessUtxo: {
          amount: BigInt(x.value),
          script: Wt.decode(x.tapTree).pkScript
        },
        sighashType: Kt.DEFAULT
      }), d.addTapscriptInput(64, R[1].length, Ot.encode(R[0]).length);
    }
    const h = new ge({ version: 2 });
    for (const x of u)
      h.addInput(x);
    d.addP2TROutput();
    let p = await o.onchainProvider.getFeeRate();
    (!p || p < Er.MIN_FEE_RATE) && (p = Er.MIN_FEE_RATE);
    const w = d.vsize().fee(BigInt(p));
    if (w > f)
      throw new Error("fee amount is greater than the total amount");
    h.addOutputAddress(s, f - w);
    const y = await o.identity.sign(h);
    return y.finalize(), await o.onchainProvider.broadcastTransaction(y.hex), y.id;
  }
  e.completeUnroll = n;
})(eu || (eu = {}));
function Jy(e) {
  return new Promise((t) => setTimeout(t, e));
}
function Qy(e, t, r) {
  return async () => {
    const [n, o] = await e.bumpP2A(r);
    await t.broadcastTransaction(n, o);
  };
}
function tm(e, t) {
  return () => new Promise((r, n) => {
    const o = setInterval(async () => {
      try {
        (await e.getTxStatus(t)).confirmed && (clearInterval(o), r());
      } catch (i) {
        clearInterval(o), n(i);
      }
    }, 5e3);
  });
}
function em(e, t, r) {
  const n = Wt.decode(r.tapTree).exitPaths();
  for (const o of n)
    if (o.params.timelock.type === "blocks") {
      if (t.height >= e.height + Number(o.params.timelock.value))
        return o;
    } else if (t.time >= e.time + Number(o.params.timelock.value))
      return o;
}
var ji = {}, nu;
function nm() {
  return nu || (nu = 1, (function(e) {
    /*! scure-base - MIT License (c) 2022 Paul Miller (paulmillr.com) */
    Object.defineProperty(e, "__esModule", { value: !0 }), e.bytes = e.stringToBytes = e.str = e.bytesToString = e.hex = e.utf8 = e.bech32m = e.bech32 = e.base58check = e.base58xmr = e.base58xrp = e.base58flickr = e.base58 = e.base64url = e.base64 = e.base32crockford = e.base32hex = e.base32 = e.base16 = e.utils = e.assertNumber = void 0;
    function t(I) {
      if (!Number.isSafeInteger(I))
        throw new Error(`Wrong integer: ${I}`);
    }
    e.assertNumber = t;
    function r(...I) {
      const S = (l, b) => (k) => l(b(k)), m = Array.from(I).reverse().reduce((l, b) => l ? S(l, b.encode) : b.encode, void 0), E = I.reduce((l, b) => l ? S(l, b.decode) : b.decode, void 0);
      return { encode: m, decode: E };
    }
    function n(I) {
      return {
        encode: (S) => {
          if (!Array.isArray(S) || S.length && typeof S[0] != "number")
            throw new Error("alphabet.encode input should be an array of numbers");
          return S.map((m) => {
            if (t(m), m < 0 || m >= I.length)
              throw new Error(`Digit index outside alphabet: ${m} (alphabet: ${I.length})`);
            return I[m];
          });
        },
        decode: (S) => {
          if (!Array.isArray(S) || S.length && typeof S[0] != "string")
            throw new Error("alphabet.decode input should be array of strings");
          return S.map((m) => {
            if (typeof m != "string")
              throw new Error(`alphabet.decode: not string element=${m}`);
            const E = I.indexOf(m);
            if (E === -1)
              throw new Error(`Unknown letter: "${m}". Allowed: ${I}`);
            return E;
          });
        }
      };
    }
    function o(I = "") {
      if (typeof I != "string")
        throw new Error("join separator should be string");
      return {
        encode: (S) => {
          if (!Array.isArray(S) || S.length && typeof S[0] != "string")
            throw new Error("join.encode input should be array of strings");
          for (let m of S)
            if (typeof m != "string")
              throw new Error(`join.encode: non-string input=${m}`);
          return S.join(I);
        },
        decode: (S) => {
          if (typeof S != "string")
            throw new Error("join.decode input should be string");
          return S.split(I);
        }
      };
    }
    function i(I, S = "=") {
      if (t(I), typeof S != "string")
        throw new Error("padding chr should be string");
      return {
        encode(m) {
          if (!Array.isArray(m) || m.length && typeof m[0] != "string")
            throw new Error("padding.encode input should be array of strings");
          for (let E of m)
            if (typeof E != "string")
              throw new Error(`padding.encode: non-string input=${E}`);
          for (; m.length * I % 8; )
            m.push(S);
          return m;
        },
        decode(m) {
          if (!Array.isArray(m) || m.length && typeof m[0] != "string")
            throw new Error("padding.encode input should be array of strings");
          for (let l of m)
            if (typeof l != "string")
              throw new Error(`padding.decode: non-string input=${l}`);
          let E = m.length;
          if (E * I % 8)
            throw new Error("Invalid padding: string should have whole number of bytes");
          for (; E > 0 && m[E - 1] === S; E--)
            if (!((E - 1) * I % 8))
              throw new Error("Invalid padding: string has too much padding");
          return m.slice(0, E);
        }
      };
    }
    function s(I) {
      if (typeof I != "function")
        throw new Error("normalize fn should be function");
      return { encode: (S) => S, decode: (S) => I(S) };
    }
    function c(I, S, m) {
      if (S < 2)
        throw new Error(`convertRadix: wrong from=${S}, base cannot be less than 2`);
      if (m < 2)
        throw new Error(`convertRadix: wrong to=${m}, base cannot be less than 2`);
      if (!Array.isArray(I))
        throw new Error("convertRadix: data should be array");
      if (!I.length)
        return [];
      let E = 0;
      const l = [], b = Array.from(I);
      for (b.forEach((k) => {
        if (t(k), k < 0 || k >= S)
          throw new Error(`Wrong integer: ${k}`);
      }); ; ) {
        let k = 0, N = !0;
        for (let O = E; O < b.length; O++) {
          const U = b[O], B = S * k + U;
          if (!Number.isSafeInteger(B) || S * k / S !== k || B - U !== S * k)
            throw new Error("convertRadix: carry overflow");
          if (k = B % m, b[O] = Math.floor(B / m), !Number.isSafeInteger(b[O]) || b[O] * m + k !== B)
            throw new Error("convertRadix: carry overflow");
          if (N)
            b[O] ? N = !1 : E = O;
          else continue;
        }
        if (l.push(k), N)
          break;
      }
      for (let k = 0; k < I.length - 1 && I[k] === 0; k++)
        l.push(0);
      return l.reverse();
    }
    const a = (I, S) => S ? a(S, I % S) : I, u = (I, S) => I + (S - a(I, S));
    function f(I, S, m, E) {
      if (!Array.isArray(I))
        throw new Error("convertRadix2: data should be array");
      if (S <= 0 || S > 32)
        throw new Error(`convertRadix2: wrong from=${S}`);
      if (m <= 0 || m > 32)
        throw new Error(`convertRadix2: wrong to=${m}`);
      if (u(S, m) > 32)
        throw new Error(`convertRadix2: carry overflow from=${S} to=${m} carryBits=${u(S, m)}`);
      let l = 0, b = 0;
      const k = 2 ** m - 1, N = [];
      for (const O of I) {
        if (t(O), O >= 2 ** S)
          throw new Error(`convertRadix2: invalid data word=${O} from=${S}`);
        if (l = l << S | O, b + S > 32)
          throw new Error(`convertRadix2: carry overflow pos=${b} from=${S}`);
        for (b += S; b >= m; b -= m)
          N.push((l >> b - m & k) >>> 0);
        l &= 2 ** b - 1;
      }
      if (l = l << m - b & k, !E && b >= S)
        throw new Error("Excess padding");
      if (!E && l)
        throw new Error(`Non-zero padding: ${l}`);
      return E && b > 0 && N.push(l >>> 0), N;
    }
    function d(I) {
      return t(I), {
        encode: (S) => {
          if (!(S instanceof Uint8Array))
            throw new Error("radix.encode input should be Uint8Array");
          return c(Array.from(S), 2 ** 8, I);
        },
        decode: (S) => {
          if (!Array.isArray(S) || S.length && typeof S[0] != "number")
            throw new Error("radix.decode input should be array of strings");
          return Uint8Array.from(c(S, I, 2 ** 8));
        }
      };
    }
    function h(I, S = !1) {
      if (t(I), I <= 0 || I > 32)
        throw new Error("radix2: bits should be in (0..32]");
      if (u(8, I) > 32 || u(I, 8) > 32)
        throw new Error("radix2: carry overflow");
      return {
        encode: (m) => {
          if (!(m instanceof Uint8Array))
            throw new Error("radix2.encode input should be Uint8Array");
          return f(Array.from(m), 8, I, !S);
        },
        decode: (m) => {
          if (!Array.isArray(m) || m.length && typeof m[0] != "number")
            throw new Error("radix2.decode input should be array of strings");
          return Uint8Array.from(f(m, I, 8, S));
        }
      };
    }
    function p(I) {
      if (typeof I != "function")
        throw new Error("unsafeWrapper fn should be function");
      return function(...S) {
        try {
          return I.apply(null, S);
        } catch {
        }
      };
    }
    function w(I, S) {
      if (t(I), typeof S != "function")
        throw new Error("checksum fn should be function");
      return {
        encode(m) {
          if (!(m instanceof Uint8Array))
            throw new Error("checksum.encode: input should be Uint8Array");
          const E = S(m).slice(0, I), l = new Uint8Array(m.length + I);
          return l.set(m), l.set(E, m.length), l;
        },
        decode(m) {
          if (!(m instanceof Uint8Array))
            throw new Error("checksum.decode: input should be Uint8Array");
          const E = m.slice(0, -I), l = S(E).slice(0, I), b = m.slice(-I);
          for (let k = 0; k < I; k++)
            if (l[k] !== b[k])
              throw new Error("Invalid checksum");
          return E;
        }
      };
    }
    e.utils = { alphabet: n, chain: r, checksum: w, radix: d, radix2: h, join: o, padding: i }, e.base16 = r(h(4), n("0123456789ABCDEF"), o("")), e.base32 = r(h(5), n("ABCDEFGHIJKLMNOPQRSTUVWXYZ234567"), i(5), o("")), e.base32hex = r(h(5), n("0123456789ABCDEFGHIJKLMNOPQRSTUV"), i(5), o("")), e.base32crockford = r(h(5), n("0123456789ABCDEFGHJKMNPQRSTVWXYZ"), o(""), s((I) => I.toUpperCase().replace(/O/g, "0").replace(/[IL]/g, "1"))), e.base64 = r(h(6), n("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"), i(6), o("")), e.base64url = r(h(6), n("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_"), i(6), o(""));
    const y = (I) => r(d(58), n(I), o(""));
    e.base58 = y("123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"), e.base58flickr = y("123456789abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ"), e.base58xrp = y("rpshnaf39wBUDNEGHJKLM4PQRST7VWXYZ2bcdeCg65jkm8oFqi1tuvAxyz");
    const x = [0, 2, 3, 5, 6, 7, 9, 10, 11];
    e.base58xmr = {
      encode(I) {
        let S = "";
        for (let m = 0; m < I.length; m += 8) {
          const E = I.subarray(m, m + 8);
          S += e.base58.encode(E).padStart(x[E.length], "1");
        }
        return S;
      },
      decode(I) {
        let S = [];
        for (let m = 0; m < I.length; m += 11) {
          const E = I.slice(m, m + 11), l = x.indexOf(E.length), b = e.base58.decode(E);
          for (let k = 0; k < b.length - l; k++)
            if (b[k] !== 0)
              throw new Error("base58xmr: wrong padding");
          S = S.concat(Array.from(b.slice(b.length - l)));
        }
        return Uint8Array.from(S);
      }
    };
    const T = (I) => r(w(4, (S) => I(I(S))), e.base58);
    e.base58check = T;
    const A = r(n("qpzry9x8gf2tvdw0s3jn54khce6mua7l"), o("")), R = [996825010, 642813549, 513874426, 1027748829, 705979059];
    function C(I) {
      const S = I >> 25;
      let m = (I & 33554431) << 5;
      for (let E = 0; E < R.length; E++)
        (S >> E & 1) === 1 && (m ^= R[E]);
      return m;
    }
    function $(I, S, m = 1) {
      const E = I.length;
      let l = 1;
      for (let b = 0; b < E; b++) {
        const k = I.charCodeAt(b);
        if (k < 33 || k > 126)
          throw new Error(`Invalid prefix (${I})`);
        l = C(l) ^ k >> 5;
      }
      l = C(l);
      for (let b = 0; b < E; b++)
        l = C(l) ^ I.charCodeAt(b) & 31;
      for (let b of S)
        l = C(l) ^ b;
      for (let b = 0; b < 6; b++)
        l = C(l);
      return l ^= m, A.encode(f([l % 2 ** 30], 30, 5, !1));
    }
    function V(I) {
      const S = I === "bech32" ? 1 : 734539939, m = h(5), E = m.decode, l = m.encode, b = p(E);
      function k(B, P, M = 90) {
        if (typeof B != "string")
          throw new Error(`bech32.encode prefix should be string, not ${typeof B}`);
        if (!Array.isArray(P) || P.length && typeof P[0] != "number")
          throw new Error(`bech32.encode words should be array of numbers, not ${typeof P}`);
        const H = B.length + 7 + P.length;
        if (M !== !1 && H > M)
          throw new TypeError(`Length ${H} exceeds limit ${M}`);
        return B = B.toLowerCase(), `${B}1${A.encode(P)}${$(B, P, S)}`;
      }
      function N(B, P = 90) {
        if (typeof B != "string")
          throw new Error(`bech32.decode input should be string, not ${typeof B}`);
        if (B.length < 8 || P !== !1 && B.length > P)
          throw new TypeError(`Wrong string length: ${B.length} (${B}). Expected (8..${P})`);
        const M = B.toLowerCase();
        if (B !== M && B !== B.toUpperCase())
          throw new Error("String must be lowercase or uppercase");
        B = M;
        const H = B.lastIndexOf("1");
        if (H === 0 || H === -1)
          throw new Error('Letter "1" must be present between prefix and data only');
        const L = B.slice(0, H), W = B.slice(H + 1);
        if (W.length < 6)
          throw new Error("Data must be at least 6 characters long");
        const G = A.decode(W).slice(0, -6), ot = $(L, G, S);
        if (!W.endsWith(ot))
          throw new Error(`Invalid checksum in ${B}: expected "${ot}"`);
        return { prefix: L, words: G };
      }
      const O = p(N);
      function U(B) {
        const { prefix: P, words: M } = N(B, !1);
        return { prefix: P, words: M, bytes: E(M) };
      }
      return { encode: k, decode: N, decodeToBytes: U, decodeUnsafe: O, fromWords: E, fromWordsUnsafe: b, toWords: l };
    }
    e.bech32 = V("bech32"), e.bech32m = V("bech32m"), e.utf8 = {
      encode: (I) => new TextDecoder().decode(I),
      decode: (I) => new TextEncoder().encode(I)
    }, e.hex = r(h(4), n("0123456789abcdef"), o(""), s((I) => {
      if (typeof I != "string" || I.length % 2)
        throw new TypeError(`hex.decode: expected string, got ${typeof I} with length ${I.length}`);
      return I.toLowerCase();
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
    }, K = `Invalid encoding type. Available types: ${Object.keys(g).join(", ")}`, _ = (I, S) => {
      if (typeof I != "string" || !g.hasOwnProperty(I))
        throw new TypeError(K);
      if (!(S instanceof Uint8Array))
        throw new TypeError("bytesToString() expects Uint8Array");
      return g[I].encode(S);
    };
    e.bytesToString = _, e.str = e.bytesToString;
    const z = (I, S) => {
      if (!g.hasOwnProperty(I))
        throw new TypeError(K);
      if (typeof S != "string")
        throw new TypeError("stringToBytes() expects string");
      return g[I].decode(S);
    };
    e.stringToBytes = z, e.bytes = e.stringToBytes;
  })(ji)), ji;
}
var Gi, ru;
function rm() {
  if (ru) return Gi;
  ru = 1;
  const { bech32: e, hex: t, utf8: r } = nm(), n = {
    // default network is bitcoin
    bech32: "bc",
    pubKeyHash: 0,
    scriptHash: 5,
    validWitnessVersions: [0]
  }, o = {
    bech32: "tb",
    pubKeyHash: 111,
    scriptHash: 196,
    validWitnessVersions: [0]
  }, i = {
    bech32: "tbs",
    pubKeyHash: 111,
    scriptHash: 196,
    validWitnessVersions: [0]
  }, s = {
    bech32: "bcrt",
    pubKeyHash: 111,
    scriptHash: 196,
    validWitnessVersions: [0]
  }, c = {
    bech32: "sb",
    pubKeyHash: 63,
    scriptHash: 123,
    validWitnessVersions: [0]
  }, a = [
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
  }, f = BigInt("2100000000000000000"), d = BigInt(1e11), h = {
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
  for (let $ = 0, V = Object.keys(h); $ < V.length; $++) {
    const g = V[$], K = h[V[$]].toString();
    p[K] = g;
  }
  const w = {
    1: ($) => t.encode(e.fromWordsUnsafe($)),
    // 256 bits
    16: ($) => t.encode(e.fromWordsUnsafe($)),
    // 256 bits
    13: ($) => r.encode(e.fromWordsUnsafe($)),
    // string variable length
    19: ($) => t.encode(e.fromWordsUnsafe($)),
    // 264 bits
    23: ($) => t.encode(e.fromWordsUnsafe($)),
    // 256 bits
    27: ($) => t.encode(e.fromWordsUnsafe($)),
    // variable
    6: x,
    // default: 3600 (1 hour)
    24: x,
    // default: 9
    3: T,
    // for extra routing info (private etc.)
    5: A
    // keep feature bits as array of 5 bit words
  };
  function y($) {
    return (V) => ({
      tagCode: parseInt($),
      words: e.encode("unknown", V, Number.MAX_SAFE_INTEGER)
    });
  }
  function x($) {
    return $.reverse().reduce((V, g, K) => V + g * Math.pow(32, K), 0);
  }
  function T($) {
    const V = [];
    let g, K, _, z, I, S = e.fromWordsUnsafe($);
    for (; S.length > 0; )
      g = t.encode(S.slice(0, 33)), K = t.encode(S.slice(33, 41)), _ = parseInt(t.encode(S.slice(41, 45)), 16), z = parseInt(
        t.encode(S.slice(45, 49)),
        16
      ), I = parseInt(t.encode(S.slice(49, 51)), 16), S = S.slice(51), V.push({
        pubkey: g,
        short_channel_id: K,
        fee_base_msat: _,
        fee_proportional_millionths: z,
        cltv_expiry_delta: I
      });
    return V;
  }
  function A($) {
    const V = $.slice().reverse().map((_) => [
      !!(_ & 1),
      !!(_ & 2),
      !!(_ & 4),
      !!(_ & 8),
      !!(_ & 16)
    ]).reduce((_, z) => _.concat(z), []);
    for (; V.length < a.length * 2; )
      V.push(!1);
    const g = {};
    a.forEach((_, z) => {
      let I;
      V[z * 2] ? I = "required" : V[z * 2 + 1] ? I = "supported" : I = "unsupported", g[_] = I;
    });
    const K = V.slice(a.length * 2);
    return g.extra_bits = {
      start_bit: a.length * 2,
      bits: K,
      has_required: K.reduce(
        (_, z, I) => I % 2 !== 0 ? _ || !1 : _ || z,
        !1
      )
    }, g;
  }
  function R($, V) {
    let g, K;
    if ($.slice(-1).match(/^[munp]$/))
      g = $.slice(-1), K = $.slice(0, -1);
    else {
      if ($.slice(-1).match(/^[^munp0-9]$/))
        throw new Error("Not a valid multiplier for the amount");
      K = $;
    }
    if (!K.match(/^\d+$/))
      throw new Error("Not a valid human readable amount");
    const _ = BigInt(K), z = g ? _ * d / u[g] : _ * d;
    if (g === "p" && _ % BigInt(10) !== BigInt(0) || z > f)
      throw new Error("Amount is outside of valid range");
    return V ? z.toString() : z;
  }
  function C($, V) {
    if (typeof $ != "string")
      throw new Error("Lightning Payment Request must be string");
    if ($.slice(0, 2).toLowerCase() !== "ln")
      throw new Error("Not a proper lightning payment request");
    const g = [], K = e.decode($, Number.MAX_SAFE_INTEGER);
    $ = $.toLowerCase();
    const _ = K.prefix;
    let z = K.words, I = $.slice(_.length + 1), S = z.slice(-104);
    z = z.slice(0, -104);
    let m = _.match(/^ln(\S+?)(\d*)([a-zA-Z]?)$/);
    if (m && !m[2] && (m = _.match(/^ln(\S+)$/)), !m)
      throw new Error("Not a proper lightning payment request");
    g.push({
      name: "lightning_network",
      letters: "ln"
    });
    const E = m[1];
    let l;
    if (V) {
      if (V.bech32 === void 0 || V.pubKeyHash === void 0 || V.scriptHash === void 0 || !Array.isArray(V.validWitnessVersions))
        throw new Error("Invalid network");
      l = V;
    } else
      switch (E) {
        case n.bech32:
          l = n;
          break;
        case o.bech32:
          l = o;
          break;
        case i.bech32:
          l = i;
          break;
        case s.bech32:
          l = s;
          break;
        case c.bech32:
          l = c;
          break;
      }
    if (!l || l.bech32 !== E)
      throw new Error("Unknown coin bech32 prefix");
    g.push({
      name: "coin_network",
      letters: E,
      value: l
    });
    const b = m[2];
    let k;
    if (b) {
      const L = m[3];
      k = R(b + L, !0), g.push({
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
    const N = x(z.slice(0, 7));
    z = z.slice(7), g.push({
      name: "timestamp",
      letters: I.slice(0, 7),
      value: N
    }), I = I.slice(7);
    let O, U, B, P;
    for (; z.length > 0; ) {
      const L = z[0].toString();
      O = p[L] || "unknown_tag", U = w[L] || y(L), z = z.slice(1), B = x(z.slice(0, 2)), z = z.slice(2), P = z.slice(0, B), z = z.slice(B), g.push({
        name: O,
        tag: I[0],
        letters: I.slice(0, 3 + B),
        value: U(P)
        // see: parsers for more comments
      }), I = I.slice(3 + B);
    }
    g.push({
      name: "signature",
      letters: I.slice(0, 104),
      value: t.encode(e.fromWordsUnsafe(S))
    }), I = I.slice(104), g.push({
      name: "checksum",
      letters: I
    });
    let M = {
      paymentRequest: $,
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
      L !== "route_hint" && Object.defineProperty(M, L, {
        get() {
          return H(L);
        }
      });
    return M;
    function H(L) {
      let W = g.find((G) => G.name === L);
      return W ? W.value : void 0;
    }
  }
  return Gi = {
    decode: C,
    hrpToMillisat: R
  }, Gi;
}
rm();
var co = class extends Error {
  isClaimable;
  isRefundable;
  pendingSwap;
  constructor(e = {}) {
    super(e.message ?? "Error during swap."), this.name = "SwapError", this.isClaimable = e.isClaimable ?? !1, this.isRefundable = e.isRefundable ?? !1, this.pendingSwap = e.pendingSwap;
  }
}, gn = class extends Error {
  statusCode;
  errorData;
  constructor(e, t, r) {
    super(e), this.name = "NetworkError", this.statusCode = t, this.errorData = r;
  }
}, ce = class extends co {
  constructor(e = {}) {
    super({ message: "Invalid API response", ...e }), this.name = "SchemaError";
  }
}, om = (e) => [
  "invoice.failedToPay",
  "transaction.claimed",
  "swap.expired"
].includes(e), im = (e) => [
  "transaction.refunded",
  "transaction.failed",
  "invoice.settled",
  // normal status for completed swaps
  "swap.expired"
].includes(e), sm = (e) => e && typeof e == "object" && typeof e.id == "string" && typeof e.timeoutBlockHeight == "number", cm = (e) => e && typeof e == "object" && typeof e.status == "string" && (e.zeroConfRejected === void 0 || typeof e.zeroConfRejected == "boolean") && (e.transaction === void 0 || e.transaction && typeof e.transaction == "object" && typeof e.transaction.id == "string" && (e.transaction.eta === void 0 || typeof e.transaction.eta == "number") && (e.transaction.hex === void 0 || typeof e.transaction.hex == "string") && (e.transaction.preimage === void 0 || typeof e.transaction.preimage == "string")), ou = (e) => e && typeof e == "object" && e.ARK && typeof e.ARK == "object" && e.ARK.BTC && typeof e.ARK.BTC == "object" && typeof e.ARK.BTC.hash == "string" && typeof e.ARK.BTC.rate == "number" && e.ARK.BTC.limits && typeof e.ARK.BTC.limits == "object" && typeof e.ARK.BTC.limits.maximal == "number" && typeof e.ARK.BTC.limits.minimal == "number" && typeof e.ARK.BTC.limits.maximalZeroConf == "number" && e.ARK.BTC.fees && typeof e.ARK.BTC.fees == "object" && typeof e.ARK.BTC.fees.percentage == "number" && typeof e.ARK.BTC.fees.minerFees == "number", am = (e) => e && typeof e == "object" && e.BTC && typeof e.BTC == "object" && e.BTC.ARK && typeof e.BTC.ARK == "object" && e.BTC.ARK.hash && typeof e.BTC.ARK.hash == "string" && typeof e.BTC.ARK.rate == "number" && e.BTC.ARK.limits && typeof e.BTC.ARK.limits == "object" && typeof e.BTC.ARK.limits.maximal == "number" && typeof e.BTC.ARK.limits.minimal == "number" && e.BTC.ARK.fees && typeof e.BTC.ARK.fees == "object" && typeof e.BTC.ARK.fees.percentage == "number" && typeof e.BTC.ARK.fees.minerFees == "object" && typeof e.BTC.ARK.fees.minerFees.claim == "number" && typeof e.BTC.ARK.fees.minerFees.lockup == "number", um = (e) => e && typeof e == "object" && typeof e.id == "string" && typeof e.address == "string" && typeof e.expectedAmount == "number" && typeof e.claimPublicKey == "string" && typeof e.acceptZeroConf == "boolean" && e.timeoutBlockHeights && typeof e.timeoutBlockHeights == "object" && typeof e.timeoutBlockHeights.unilateralClaim == "number" && typeof e.timeoutBlockHeights.unilateralRefund == "number" && typeof e.timeoutBlockHeights.unilateralRefundWithoutReceiver == "number", fm = (e) => e && typeof e == "object" && typeof e.preimage == "string", dm = (e) => e && typeof e == "object" && typeof e.id == "string" && typeof e.invoice == "string" && typeof e.onchainAmount == "number" && typeof e.lockupAddress == "string" && typeof e.refundPublicKey == "string" && e.timeoutBlockHeights && typeof e.timeoutBlockHeights == "object" && typeof e.timeoutBlockHeights.refund == "number" && typeof e.timeoutBlockHeights.unilateralClaim == "number" && typeof e.timeoutBlockHeights.unilateralRefund == "number" && typeof e.timeoutBlockHeights.unilateralRefundWithoutReceiver == "number", lm = (e) => e && typeof e == "object" && typeof e.transaction == "string" && typeof e.checkpoint == "string", wn = (e) => e && typeof e == "object" && typeof e.version == "number" && typeof e.output == "string", hm = (e) => e && typeof e == "object" && wn(e.claimLeaf) && wn(e.refundLeaf) && wn(e.refundWithoutBoltzLeaf) && wn(e.unilateralClaimLeaf) && wn(e.unilateralRefundLeaf) && wn(e.unilateralRefundWithoutBoltzLeaf), Fd = (e) => e && typeof e == "object" && hm(e.tree) && (e.amount === void 0 || typeof e.amount == "number") && typeof e.keyIndex == "number" && (e.transaction === void 0 || e.transaction && typeof e.transaction == "object" && typeof e.transaction.id == "string" && typeof e.transaction.vout == "number") && typeof e.lockupAddress == "string" && typeof e.serverPublicKey == "string" && typeof e.timeoutBlockHeight == "number" && (e.preimageHash === void 0 || typeof e.preimageHash == "string"), pm = (e) => e && typeof e == "object" && e.to === "BTC" && typeof e.id == "string" && e.from === "ARK" && e.type === "submarine" && typeof e.createdAt == "number" && typeof e.preimageHash == "string" && typeof e.status == "string" && Fd(e.refundDetails), gm = (e) => e && typeof e == "object" && e.to === "ARK" && typeof e.id == "string" && e.from === "BTC" && e.type === "reverse" && typeof e.createdAt == "number" && typeof e.preimageHash == "string" && typeof e.status == "string" && Fd(e.claimDetails), wm = (e) => Array.isArray(e) && e.every(
  (t) => gm(t) || pm(t)
), ym = {
  mutinynet: "https://api.boltz.mutinynet.arkade.sh",
  regtest: "http://localhost:9069"
}, mm = class {
  wsUrl;
  apiUrl;
  network;
  referralId;
  constructor(e) {
    this.network = e.network;
    const t = e.apiUrl || ym[e.network];
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
    if (!ou(e))
      throw new ce({ message: "error fetching submarine fees" });
    if (!am(t))
      throw new ce({ message: "error fetching reverse fees" });
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
    if (!ou(e))
      throw new ce({ message: "error fetching limits" });
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
    if (!sm(t))
      throw new ce({
        message: `error fetching txid for swap: ${e}`
      });
    return t;
  }
  async getSwapStatus(e) {
    const t = await this.request(
      `/v2/swap/${e}`,
      "GET"
    );
    if (!cm(t))
      throw new ce({
        message: `error fetching status for swap: ${e}`
      });
    return t;
  }
  async getSwapPreimage(e) {
    const t = await this.request(
      `/v2/swap/submarine/${e}/preimage`,
      "GET"
    );
    if (!fm(t))
      throw new ce({
        message: `error fetching preimage for swap: ${e}`
      });
    return t;
  }
  async createSubmarineSwap({
    invoice: e,
    refundPublicKey: t
  }) {
    if (t.length != 66)
      throw new co({
        message: "refundPublicKey must be a compressed public key"
      });
    const r = {
      from: "ARK",
      to: "BTC",
      invoice: e,
      refundPublicKey: t,
      ...this.referralId ? { referralId: this.referralId } : {}
    }, n = await this.request(
      "/v2/swap/submarine",
      "POST",
      r
    );
    if (!um(n))
      throw new ce({ message: "Error creating submarine swap" });
    return n;
  }
  async createReverseSwap({
    invoiceAmount: e,
    claimPublicKey: t,
    preimageHash: r,
    description: n
  }) {
    if (t.length != 66)
      throw new co({
        message: "claimPublicKey must be a compressed public key"
      });
    const o = {
      from: "BTC",
      to: "ARK",
      invoiceAmount: e,
      claimPublicKey: t,
      preimageHash: r,
      ...n?.trim() ? { description: n.trim() } : {},
      ...this.referralId ? { referralId: this.referralId } : {}
    }, i = await this.request(
      "/v2/swap/reverse",
      "POST",
      o
    );
    if (!dm(i))
      throw new ce({ message: "Error creating reverse swap" });
    return i;
  }
  async refundSubmarineSwap(e, t, r) {
    const n = {
      checkpoint: q.encode(r.toPSBT()),
      transaction: q.encode(t.toPSBT())
    }, o = await this.request(
      `/v2/swap/submarine/${e}/refund/ark`,
      "POST",
      n
    );
    if (!lm(o))
      throw new ce({
        message: "Error refunding submarine swap"
      });
    return {
      transaction: ge.fromPSBT(
        q.decode(o.transaction)
      ),
      checkpoint: ge.fromPSBT(
        q.decode(o.checkpoint)
      )
    };
  }
  async monitorSwap(e, t) {
    return new Promise((r, n) => {
      const o = new globalThis.WebSocket(this.wsUrl), i = setTimeout(() => {
        o.close(), n(new gn("WebSocket connection timeout"));
      }, 3e4);
      o.onerror = (s) => {
        clearTimeout(i);
        const c = "message" in s || s.toString();
        n(new gn(`WebSocket error: ${c}`));
      }, o.onopen = () => {
        clearTimeout(i), o.send(
          JSON.stringify({
            op: "subscribe",
            channel: "swap.update",
            args: [e]
          })
        );
      }, o.onclose = () => {
        clearTimeout(i), r();
      }, o.onmessage = async (s) => {
        const c = JSON.parse(s.data);
        if (c.event !== "update" || c.args[0].id !== e) return;
        c.args[0].error && (o.close(), n(new co({ message: c.args[0].error })));
        const a = c.args[0].status;
        switch (a) {
          case "invoice.settled":
          case "transaction.claimed":
          case "transaction.refunded":
          case "invoice.expired":
          case "invoice.failedToPay":
          case "transaction.failed":
          case "transaction.lockupFailed":
          case "swap.expired":
            o.close(), t(a);
            break;
          case "invoice.paid":
          case "invoice.pending":
          case "invoice.set":
          case "swap.created":
          case "transaction.claim.pending":
          case "transaction.confirmed":
          case "transaction.mempool":
            t(a);
        }
      };
    });
  }
  async restoreSwaps(e) {
    const t = {
      publicKey: e
    }, r = await this.request(
      "/v2/swap/restore",
      "POST",
      t
    );
    if (!wm(r))
      throw new ce({
        message: "Invalid schema in response for swap restoration"
      });
    return r;
  }
  async request(e, t, r) {
    const n = `${this.apiUrl}${e}`;
    try {
      const o = await globalThis.fetch(n, {
        method: t,
        headers: { "Content-Type": "application/json" },
        body: r ? JSON.stringify(r) : void 0
      });
      if (!o.ok) {
        const i = await o.text();
        let s;
        try {
          s = JSON.parse(i);
        } catch {
        }
        const c = s ? `Boltz API error: ${o.status}` : `Boltz API error: ${o.status} ${i}`;
        throw new gn(c, o.status, s);
      }
      if (o.headers.get("content-length") === "0")
        throw new gn("Empty response from Boltz API");
      return await o.json();
    } catch (o) {
      throw o instanceof gn ? o : new gn(
        `Request to ${n} failed: ${o.message}`
      );
    }
  }
}, Zr = console, xm = class or {
  constructor(t) {
    this.config = t;
  }
  static messagePrefix = "SwapUpdater";
  messagePrefix = or.messagePrefix;
  monitoredSwaps = /* @__PURE__ */ new Map();
  swapProvider;
  pollTimer = null;
  onNextTick = [];
  handleInit(t) {
    this.swapProvider = new mm({ apiUrl: t.payload.apiUrl, network: t.payload.network });
  }
  prefixed(t) {
    return { prefix: or.messagePrefix, ...t };
  }
  async handleMessage(t) {
    const r = t.id;
    if (t.type === "INIT")
      return console.log(`[${this.messagePrefix}] INIT`, t.payload), this.handleInit(t), this.prefixed({ id: r, type: "INITIALIZED" });
    if (!this.swapProvider)
      return this.prefixed({ id: r, error: new Error("Swap Provider not initialized") });
    switch (t.type) {
      case "GET_REVERSE_SWAP_TX_ID": {
        const n = await this.swapProvider.getReverseSwapTxId(
          t.payload.swapId
        );
        return this.prefixed({
          id: r,
          type: "REVERSE_SWAP_TX_ID",
          payload: { txid: n.id }
        });
      }
      case "GET_WS_URL": {
        const n = this.swapProvider.getWsUrl();
        return this.prefixed({
          id: r,
          type: "WS_URL",
          payload: { wsUrl: n }
        });
      }
      case "SWAP_STATUS_UPDATED": {
        const { swapId: n, status: o, error: i } = t.payload, s = this.monitoredSwaps.get(n);
        return s && (i && this.scheduleForNextTick(
          () => this.prefixed({
            type: "SWAP_FAILED",
            broadcast: !0,
            payload: { swap: s, error: i }
          })
        ), o !== s.status && await this.handleSwapStatusUpdate(s, o)), this.prefixed({ id: r, type: "ACK" });
      }
      case "GET_MONITORED_SWAPS":
        return this.prefixed({
          id: r,
          type: "MONITORED_SWAPS",
          payload: {
            swaps: Array.from(this.monitoredSwaps.values())
          }
        });
      case "GET_SWAP":
        return this.prefixed({
          id: r,
          type: "GET_SWAP",
          payload: {
            swap: this.monitoredSwaps.get(
              t.payload.swapId
            )
          }
        });
      case "MONITOR_SWAP": {
        const { swap: n } = t.payload;
        return this.monitoredSwaps.set(n.id, n), this.prefixed({ id: r, type: "ACK" });
      }
      case "STOP_MONITORING_SWAP": {
        const { swapId: n } = t.payload;
        return this.monitoredSwaps.delete(n), this.prefixed({ id: r, type: "ACK" });
      }
      default:
        throw console.warn(
          `[${or.messagePrefix}] Unhandled message:`,
          t
        ), new Error(`Unhandled message: ${t}`);
    }
  }
  async start() {
    await this.startPolling();
  }
  async stop() {
    return this.pollTimer && clearTimeout(this.pollTimer), Promise.resolve(void 0);
  }
  async tick(t) {
    await this.pollAllSwaps();
    const r = await Promise.allSettled(
      this.onNextTick.map((n) => n())
    );
    return this.onNextTick = [], r.map((n) => n.status === "fulfilled" ? n.value : (console.error(
      `[${or.messagePrefix}] tick failed`,
      n.reason
    ), null)).filter((n) => n !== null);
  }
  /**
   * Start regular polling
   * Polls all swaps at configured interval when WebSocket is active
   */
  startPolling() {
    this.pollTimer && clearTimeout(this.pollTimer), this.pollTimer = setTimeout(async () => {
      await this.pollAllSwaps();
    }, this.config.pollInterval);
  }
  // Swap provider specific
  /**
   * Poll all monitored swaps for status updates
   * This is called:
   * 1. After WebSocket connects
   * 2. After WebSocket reconnects
   * 3. Periodically while WebSocket is active
   * 4. As fallback when WebSocket is unavailable
   */
  async pollAllSwaps() {
    if (!this.swapProvider)
      throw new Error("Swap provider not initialized");
    if (this.monitoredSwaps.size === 0) return;
    Zr.log(`Polling ${this.monitoredSwaps.size} swaps...`);
    const t = Array.from(this.monitoredSwaps.values()).map(
      async (r) => {
        try {
          const n = await this.swapProvider.getSwapStatus(r.id);
          n.status !== r.status && await this.handleSwapStatusUpdate(
            r,
            n.status
          );
        } catch (n) {
          Zr.error(`Failed to poll swap ${r.id}:`, n);
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
  async handleSwapStatusUpdate(t, r) {
    const n = t.status;
    n !== r && (t.status = r, Zr.log(`Swap ${t.id} status: ${n} → ${r}`), this.scheduleForNextTick(
      () => this.prefixed({
        broadcast: !0,
        type: "SWAP_STATUS_UPDATED",
        payload: { swap: t, previousStatus: n }
      })
    ), this.isFinalStatus(r) && (this.monitoredSwaps.delete(t.id), Zr.log(`Swap ${t.id} completed with status: ${r}`), this.scheduleForNextTick(
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
    return im(t) || om(t);
  }
};
const bm = new Bw({
  updaters: [new xr(), new xm({ pollInterval: 3e4 })],
  debug: !1
});
bm.start().catch(console.error);
const Kd = "arkade-cache-v1";
self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(Kd)), self.skipWaiting();
});
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((t) => Promise.all(
      t.map((r) => {
        if (r !== Kd)
          return caches.delete(r);
      })
    ))
  ), self.clients.matchAll({
    includeUncontrolled: !0,
    type: "window"
  }).then((t) => {
    t.forEach((r) => {
      r.postMessage({ type: "RELOAD_PAGE" });
    });
  }), self.clients.claim();
});
