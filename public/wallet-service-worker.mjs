/*! noble-hashes - MIT License (c) 2022 Paul Miller (paulmillr.com) */
function ao(e) {
  return e instanceof Uint8Array || ArrayBuffer.isView(e) && e.constructor.name === "Uint8Array";
}
function De(e, t = "") {
  if (!Number.isSafeInteger(e) || e < 0) {
    const n = t && `"${t}" `;
    throw new Error(`${n}expected integer >= 0, got ${e}`);
  }
}
function q(e, t, n = "") {
  const r = ao(e), i = e?.length, s = t !== void 0;
  if (!r || s && i !== t) {
    const o = n && `"${n}" `, a = s ? ` of length ${t}` : "", c = r ? `length=${i}` : `type=${typeof e}`;
    throw new Error(o + "expected Uint8Array" + a + ", got " + c);
  }
  return e;
}
function jc(e) {
  if (typeof e != "function" || typeof e.create != "function")
    throw new Error("Hash must wrapped by utils.createHasher");
  De(e.outputLen), De(e.blockLen);
}
function Gr(e, t = !0) {
  if (e.destroyed)
    throw new Error("Hash instance has been destroyed");
  if (t && e.finished)
    throw new Error("Hash#digest() has already been called");
}
function Of(e, t) {
  q(e, void 0, "digestInto() output");
  const n = t.outputLen;
  if (e.length < n)
    throw new Error('"digestInto() output" expected to be of length >=' + n);
}
function Tn(...e) {
  for (let t = 0; t < e.length; t++)
    e[t].fill(0);
}
function Zi(e) {
  return new DataView(e.buffer, e.byteOffset, e.byteLength);
}
function ee(e, t) {
  return e << 32 - t | e >>> t;
}
function Er(e, t) {
  return e << t | e >>> 32 - t >>> 0;
}
const Wc = /* @ts-ignore */ typeof Uint8Array.from([]).toHex == "function" && typeof Uint8Array.fromHex == "function", Bf = /* @__PURE__ */ Array.from({ length: 256 }, (e, t) => t.toString(16).padStart(2, "0"));
function Oi(e) {
  if (q(e), Wc)
    return e.toHex();
  let t = "";
  for (let n = 0; n < e.length; n++)
    t += Bf[e[n]];
  return t;
}
const fe = { _0: 48, _9: 57, A: 65, F: 70, a: 97, f: 102 };
function na(e) {
  if (e >= fe._0 && e <= fe._9)
    return e - fe._0;
  if (e >= fe.A && e <= fe.F)
    return e - (fe.A - 10);
  if (e >= fe.a && e <= fe.f)
    return e - (fe.a - 10);
}
function qr(e) {
  if (typeof e != "string")
    throw new Error("hex string expected, got " + typeof e);
  if (Wc)
    return Uint8Array.fromHex(e);
  const t = e.length, n = t / 2;
  if (t % 2)
    throw new Error("hex string expected, got unpadded hex of length " + t);
  const r = new Uint8Array(n);
  for (let i = 0, s = 0; i < n; i++, s += 2) {
    const o = na(e.charCodeAt(s)), a = na(e.charCodeAt(s + 1));
    if (o === void 0 || a === void 0) {
      const c = e[s] + e[s + 1];
      throw new Error('hex string expected, got non-hex character "' + c + '" at index ' + s);
    }
    r[i] = o * 16 + a;
  }
  return r;
}
function Yt(...e) {
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
function Gc(e, t = {}) {
  const n = (i, s) => e(s).update(i).digest(), r = e(void 0);
  return n.outputLen = r.outputLen, n.blockLen = r.blockLen, n.create = (i) => e(i), Object.assign(n, t), Object.freeze(n);
}
function hr(e = 32) {
  const t = typeof globalThis == "object" ? globalThis.crypto : null;
  if (typeof t?.getRandomValues != "function")
    throw new Error("crypto.getRandomValues must be defined");
  return t.getRandomValues(new Uint8Array(e));
}
const $f = (e) => ({
  oid: Uint8Array.from([6, 9, 96, 134, 72, 1, 101, 3, 4, 2, e])
});
function Nf(e, t, n) {
  return e & t ^ ~e & n;
}
function Rf(e, t, n) {
  return e & t ^ e & n ^ t & n;
}
let qc = class {
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
    this.blockLen = t, this.outputLen = n, this.padOffset = r, this.isLE = i, this.buffer = new Uint8Array(t), this.view = Zi(this.buffer);
  }
  update(t) {
    Gr(this), q(t);
    const { view: n, buffer: r, blockLen: i } = this, s = t.length;
    for (let o = 0; o < s; ) {
      const a = Math.min(i - this.pos, s - o);
      if (a === i) {
        const c = Zi(t);
        for (; i <= s - o; o += i)
          this.process(c, o);
        continue;
      }
      r.set(t.subarray(o, o + a), this.pos), this.pos += a, o += a, this.pos === i && (this.process(n, 0), this.pos = 0);
    }
    return this.length += t.length, this.roundClean(), this;
  }
  digestInto(t) {
    Gr(this), Of(t, this), this.finished = !0;
    const { buffer: n, view: r, blockLen: i, isLE: s } = this;
    let { pos: o } = this;
    n[o++] = 128, Tn(this.buffer.subarray(o)), this.padOffset > i - o && (this.process(r, 0), o = 0);
    for (let f = o; f < i; f++)
      n[f] = 0;
    r.setBigUint64(i - 8, BigInt(this.length * 8), s), this.process(r, 0);
    const a = Zi(t), c = this.outputLen;
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
const Se = /* @__PURE__ */ Uint32Array.from([
  1779033703,
  3144134277,
  1013904242,
  2773480762,
  1359893119,
  2600822924,
  528734635,
  1541459225
]), Uf = /* @__PURE__ */ Uint32Array.from([
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
]), ve = /* @__PURE__ */ new Uint32Array(64);
let Lf = class extends qc {
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
      ve[f] = t.getUint32(n, !1);
    for (let f = 16; f < 64; f++) {
      const h = ve[f - 15], p = ve[f - 2], y = ee(h, 7) ^ ee(h, 18) ^ h >>> 3, d = ee(p, 17) ^ ee(p, 19) ^ p >>> 10;
      ve[f] = d + ve[f - 7] + y + ve[f - 16] | 0;
    }
    let { A: r, B: i, C: s, D: o, E: a, F: c, G: u, H: l } = this;
    for (let f = 0; f < 64; f++) {
      const h = ee(a, 6) ^ ee(a, 11) ^ ee(a, 25), p = l + h + Nf(a, c, u) + Uf[f] + ve[f] | 0, d = (ee(r, 2) ^ ee(r, 13) ^ ee(r, 22)) + Rf(r, i, s) | 0;
      l = u, u = c, c = a, a = o + p | 0, o = s, s = i, i = r, r = p + d | 0;
    }
    r = r + this.A | 0, i = i + this.B | 0, s = s + this.C | 0, o = o + this.D | 0, a = a + this.E | 0, c = c + this.F | 0, u = u + this.G | 0, l = l + this.H | 0, this.set(r, i, s, o, a, c, u, l);
  }
  roundClean() {
    Tn(ve);
  }
  destroy() {
    this.set(0, 0, 0, 0, 0, 0, 0, 0), Tn(this.buffer);
  }
}, Cf = class extends Lf {
  // We cannot use array here since array allows indexing by variable
  // which means optimizer/compiler cannot use registers.
  A = Se[0] | 0;
  B = Se[1] | 0;
  C = Se[2] | 0;
  D = Se[3] | 0;
  E = Se[4] | 0;
  F = Se[5] | 0;
  G = Se[6] | 0;
  H = Se[7] | 0;
  constructor() {
    super(32);
  }
};
const xt = /* @__PURE__ */ Gc(
  () => new Cf(),
  /* @__PURE__ */ $f(1)
);
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const co = /* @__PURE__ */ BigInt(0), Ss = /* @__PURE__ */ BigInt(1);
function Yr(e, t = "") {
  if (typeof e != "boolean") {
    const n = t && `"${t}" `;
    throw new Error(n + "expected boolean, got type=" + typeof e);
  }
  return e;
}
function Yc(e) {
  if (typeof e == "bigint") {
    if (!Pr(e))
      throw new Error("positive bigint expected, got " + e);
  } else
    De(e);
  return e;
}
function xr(e) {
  const t = Yc(e).toString(16);
  return t.length & 1 ? "0" + t : t;
}
function Zc(e) {
  if (typeof e != "string")
    throw new Error("hex string expected, got " + typeof e);
  return e === "" ? co : BigInt("0x" + e);
}
function xe(e) {
  return Zc(Oi(e));
}
function Xc(e) {
  return Zc(Oi(Pf(q(e)).reverse()));
}
function pr(e, t) {
  De(t), e = Yc(e);
  const n = qr(e.toString(16).padStart(t * 2, "0"));
  if (n.length !== t)
    throw new Error("number too large");
  return n;
}
function Qc(e, t) {
  return pr(e, t).reverse();
}
function sr(e, t) {
  if (e.length !== t.length)
    return !1;
  let n = 0;
  for (let r = 0; r < e.length; r++)
    n |= e[r] ^ t[r];
  return n === 0;
}
function Pf(e) {
  return Uint8Array.from(e);
}
function _f(e) {
  return Uint8Array.from(e, (t, n) => {
    const r = t.charCodeAt(0);
    if (t.length !== 1 || r > 127)
      throw new Error(`string contains non-ASCII character "${e[n]}" with code ${r} at position ${n}`);
    return r;
  });
}
const Pr = (e) => typeof e == "bigint" && co <= e;
function Df(e, t, n) {
  return Pr(e) && Pr(t) && Pr(n) && t <= e && e < n;
}
function Jc(e, t, n, r) {
  if (!Df(t, n, r))
    throw new Error("expected valid " + e + ": " + n + " <= n < " + r + ", got " + t);
}
function Vf(e) {
  let t;
  for (t = 0; e > co; e >>= Ss, t += 1)
    ;
  return t;
}
const uo = (e) => (Ss << BigInt(e)) - Ss;
function Mf(e, t, n) {
  if (De(e, "hashLen"), De(t, "qByteLen"), typeof n != "function")
    throw new Error("hmacFn must be a function");
  const r = (g) => new Uint8Array(g), i = Uint8Array.of(), s = Uint8Array.of(0), o = Uint8Array.of(1), a = 1e3;
  let c = r(e), u = r(e), l = 0;
  const f = () => {
    c.fill(1), u.fill(0), l = 0;
  }, h = (...g) => n(u, Yt(c, ...g)), p = (g = i) => {
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
    return Yt(...m);
  };
  return (g, m) => {
    f(), p(g);
    let S;
    for (; !(S = m(y())); )
      p();
    return f(), S;
  };
}
function lo(e, t = {}, n = {}) {
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
function ra(e) {
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
const kt = /* @__PURE__ */ BigInt(0), St = /* @__PURE__ */ BigInt(1), Xe = /* @__PURE__ */ BigInt(2), tu = /* @__PURE__ */ BigInt(3), eu = /* @__PURE__ */ BigInt(4), nu = /* @__PURE__ */ BigInt(5), Hf = /* @__PURE__ */ BigInt(7), ru = /* @__PURE__ */ BigInt(8), Ff = /* @__PURE__ */ BigInt(9), iu = /* @__PURE__ */ BigInt(16);
function jt(e, t) {
  const n = e % t;
  return n >= kt ? n : t + n;
}
function Vt(e, t, n) {
  let r = e;
  for (; t-- > kt; )
    r *= r, r %= n;
  return r;
}
function ia(e, t) {
  if (e === kt)
    throw new Error("invert: expected non-zero number");
  if (t <= kt)
    throw new Error("invert: expected positive modulus, got " + t);
  let n = jt(e, t), r = t, i = kt, s = St;
  for (; n !== kt; ) {
    const a = r / n, c = r % n, u = i - s * a;
    r = n, n = c, i = s, s = u;
  }
  if (r !== St)
    throw new Error("invert: does not exist");
  return jt(i, t);
}
function fo(e, t, n) {
  if (!e.eql(e.sqr(t), n))
    throw new Error("Cannot find square root");
}
function su(e, t) {
  const n = (e.ORDER + St) / eu, r = e.pow(t, n);
  return fo(e, r, t), r;
}
function Kf(e, t) {
  const n = (e.ORDER - nu) / ru, r = e.mul(t, Xe), i = e.pow(r, n), s = e.mul(t, i), o = e.mul(e.mul(s, Xe), i), a = e.mul(s, e.sub(o, e.ONE));
  return fo(e, a, t), a;
}
function zf(e) {
  const t = Bi(e), n = ou(e), r = n(t, t.neg(t.ONE)), i = n(t, r), s = n(t, t.neg(r)), o = (e + Hf) / iu;
  return (a, c) => {
    let u = a.pow(c, o), l = a.mul(u, r);
    const f = a.mul(u, i), h = a.mul(u, s), p = a.eql(a.sqr(l), c), y = a.eql(a.sqr(f), c);
    u = a.cmov(u, l, p), l = a.cmov(h, f, y);
    const d = a.eql(a.sqr(l), c), g = a.cmov(u, l, d);
    return fo(a, g, c), g;
  };
}
function ou(e) {
  if (e < tu)
    throw new Error("sqrt is not defined for small field");
  let t = e - St, n = 0;
  for (; t % Xe === kt; )
    t /= Xe, n++;
  let r = Xe;
  const i = Bi(e);
  for (; sa(i, r) === 1; )
    if (r++ > 1e3)
      throw new Error("Cannot find square root: probably non-prime P");
  if (n === 1)
    return su;
  let s = i.pow(r, t);
  const o = (t + St) / Xe;
  return function(c, u) {
    if (c.is0(u))
      return u;
    if (sa(c, u) !== 1)
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
function jf(e) {
  return e % eu === tu ? su : e % ru === nu ? Kf : e % iu === Ff ? zf(e) : ou(e);
}
const Wf = [
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
function Gf(e) {
  const t = {
    ORDER: "bigint",
    BYTES: "number",
    BITS: "number"
  }, n = Wf.reduce((r, i) => (r[i] = "function", r), t);
  return lo(e, n), e;
}
function qf(e, t, n) {
  if (n < kt)
    throw new Error("invalid exponent, negatives unsupported");
  if (n === kt)
    return e.ONE;
  if (n === St)
    return t;
  let r = e.ONE, i = t;
  for (; n > kt; )
    n & St && (r = e.mul(r, i)), i = e.sqr(i), n >>= St;
  return r;
}
function au(e, t, n = !1) {
  const r = new Array(t.length).fill(n ? e.ZERO : void 0), i = t.reduce((o, a, c) => e.is0(a) ? o : (r[c] = o, e.mul(o, a)), e.ONE), s = e.inv(i);
  return t.reduceRight((o, a, c) => e.is0(a) ? o : (r[c] = e.mul(o, r[c]), e.mul(o, a)), s), r;
}
function sa(e, t) {
  const n = (e.ORDER - St) / Xe, r = e.pow(t, n), i = e.eql(r, e.ONE), s = e.eql(r, e.ZERO), o = e.eql(r, e.neg(e.ONE));
  if (!i && !s && !o)
    throw new Error("invalid Legendre symbol result");
  return i ? 1 : s ? 0 : -1;
}
function Yf(e, t) {
  t !== void 0 && De(t);
  const n = t !== void 0 ? t : e.toString(2).length, r = Math.ceil(n / 8);
  return { nBitLength: n, nByteLength: r };
}
let Zf = class {
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
  constructor(t, n = {}) {
    if (t <= kt)
      throw new Error("invalid field: expected ORDER > 0, got " + t);
    let r;
    this.isLE = !1, n != null && typeof n == "object" && (typeof n.BITS == "number" && (r = n.BITS), typeof n.sqrt == "function" && (this.sqrt = n.sqrt), typeof n.isLE == "boolean" && (this.isLE = n.isLE), n.allowedLengths && (this._lengths = n.allowedLengths?.slice()), typeof n.modFromBytes == "boolean" && (this._mod = n.modFromBytes));
    const { nBitLength: i, nByteLength: s } = Yf(t, r);
    if (s > 2048)
      throw new Error("invalid field: expected ORDER of <= 2048 bytes");
    this.ORDER = t, this.BITS = i, this.BYTES = s, this._sqrt = void 0, Object.preventExtensions(this);
  }
  create(t) {
    return jt(t, this.ORDER);
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
    return jt(-t, this.ORDER);
  }
  eql(t, n) {
    return t === n;
  }
  sqr(t) {
    return jt(t * t, this.ORDER);
  }
  add(t, n) {
    return jt(t + n, this.ORDER);
  }
  sub(t, n) {
    return jt(t - n, this.ORDER);
  }
  mul(t, n) {
    return jt(t * n, this.ORDER);
  }
  pow(t, n) {
    return qf(this, t, n);
  }
  div(t, n) {
    return jt(t * ia(n, this.ORDER), this.ORDER);
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
    return ia(t, this.ORDER);
  }
  sqrt(t) {
    return this._sqrt || (this._sqrt = jf(this.ORDER)), this._sqrt(this, t);
  }
  toBytes(t) {
    return this.isLE ? Qc(t, this.BYTES) : pr(t, this.BYTES);
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
    let c = s ? Xc(t) : xe(t);
    if (a && (c = jt(c, o)), !n && !this.isValid(c))
      throw new Error("invalid field element: outside of range 0..ORDER");
    return c;
  }
  // TODO: we don't need it here, move out to separate fn
  invertBatch(t) {
    return au(this, t);
  }
  // We can't move this out because Fp6, Fp12 implement it
  // and it's unclear what to return in there.
  cmov(t, n, r) {
    return r ? n : t;
  }
};
function Bi(e, t = {}) {
  return new Zf(e, t);
}
function cu(e) {
  if (typeof e != "bigint")
    throw new Error("field order must be bigint");
  const t = e.toString(2).length;
  return Math.ceil(t / 8);
}
function uu(e) {
  const t = cu(e);
  return t + Math.ceil(t / 2);
}
function lu(e, t, n = !1) {
  q(e);
  const r = e.length, i = cu(t), s = uu(t);
  if (r < 16 || r < s || r > 1024)
    throw new Error("expected " + s + "-1024 bytes of input, got " + r);
  const o = n ? Xc(e) : xe(e), a = jt(o, t - St) + St;
  return n ? Qc(a, i) : pr(a, i);
}
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const Sn = /* @__PURE__ */ BigInt(0), Qe = /* @__PURE__ */ BigInt(1);
function Zr(e, t) {
  const n = t.negate();
  return e ? n : t;
}
function oa(e, t) {
  const n = au(e.Fp, t.map((r) => r.Z));
  return t.map((r, i) => e.fromAffine(r.toAffine(n[i])));
}
function fu(e, t) {
  if (!Number.isSafeInteger(e) || e <= 0 || e > t)
    throw new Error("invalid window size, expected [1.." + t + "], got W=" + e);
}
function Xi(e, t) {
  fu(e, t);
  const n = Math.ceil(t / e) + 1, r = 2 ** (e - 1), i = 2 ** e, s = uo(e), o = BigInt(e);
  return { windows: n, windowSize: r, mask: s, maxNumber: i, shiftBy: o };
}
function aa(e, t, n) {
  const { windowSize: r, mask: i, maxNumber: s, shiftBy: o } = n;
  let a = Number(e & i), c = e >> o;
  a > r && (a -= s, c += Qe);
  const u = t * r, l = u + Math.abs(a) - 1, f = a === 0, h = a < 0, p = t % 2 !== 0;
  return { nextN: c, offset: l, isZero: f, isNeg: h, isNegF: p, offsetF: u };
}
const Qi = /* @__PURE__ */ new WeakMap(), du = /* @__PURE__ */ new WeakMap();
function Ji(e) {
  return du.get(e) || 1;
}
function ca(e) {
  if (e !== Sn)
    throw new Error("invalid wNAF");
}
let Xf = class {
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
    for (; n > Sn; )
      n & Qe && (r = r.add(i)), i = i.double(), n >>= Qe;
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
    const { windows: r, windowSize: i } = Xi(n, this.bits), s = [];
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
    const o = Xi(t, this.bits);
    for (let a = 0; a < o.windows; a++) {
      const { nextN: c, offset: u, isZero: l, isNeg: f, isNegF: h, offsetF: p } = aa(r, a, o);
      r = c, l ? s = s.add(Zr(h, n[p])) : i = i.add(Zr(f, n[u]));
    }
    return ca(r), { p: i, f: s };
  }
  /**
   * Implements ec unsafe (non const-time) multiplication using precomputed tables and w-ary non-adjacent form.
   * @param acc accumulator point to add result of multiplication
   * @returns point
   */
  wNAFUnsafe(t, n, r, i = this.ZERO) {
    const s = Xi(t, this.bits);
    for (let o = 0; o < s.windows && r !== Sn; o++) {
      const { nextN: a, offset: c, isZero: u, isNeg: l } = aa(r, o, s);
      if (r = a, !u) {
        const f = n[c];
        i = i.add(l ? f.negate() : f);
      }
    }
    return ca(r), i;
  }
  getPrecomputes(t, n, r) {
    let i = Qi.get(n);
    return i || (i = this.precomputeWindow(n, t), t !== 1 && (typeof r == "function" && (i = r(i)), Qi.set(n, i))), i;
  }
  cached(t, n, r) {
    const i = Ji(t);
    return this.wNAF(i, this.getPrecomputes(i, t, r), n);
  }
  unsafe(t, n, r, i) {
    const s = Ji(t);
    return s === 1 ? this._unsafeLadder(t, n, i) : this.wNAFUnsafe(s, this.getPrecomputes(s, t, r), n, i);
  }
  // We calculate precomputes for elliptic curve point multiplication
  // using windowed method. This specifies window size and
  // stores precomputed values. Usually only base point would be precomputed.
  createCache(t, n) {
    fu(n, this.bits), du.set(t, n), Qi.delete(t);
  }
  hasCache(t) {
    return Ji(t) !== 1;
  }
};
function Qf(e, t, n, r) {
  let i = t, s = e.ZERO, o = e.ZERO;
  for (; n > Sn || r > Sn; )
    n & Qe && (s = s.add(i)), r & Qe && (o = o.add(i)), i = i.double(), n >>= Qe, r >>= Qe;
  return { p1: s, p2: o };
}
function ua(e, t, n) {
  if (t) {
    if (t.ORDER !== e)
      throw new Error("Field.ORDER must match order: Fp == p, Fn == n");
    return Gf(t), t;
  } else
    return Bi(e, { isLE: n });
}
function Jf(e, t, n = {}, r) {
  if (r === void 0 && (r = e === "edwards"), !t || typeof t != "object")
    throw new Error(`expected valid ${e} CURVE object`);
  for (const c of ["p", "n", "h"]) {
    const u = t[c];
    if (!(typeof u == "bigint" && u > Sn))
      throw new Error(`CURVE.${c} must be positive bigint`);
  }
  const i = ua(t.p, n.Fp, r), s = ua(t.n, n.Fn, r), a = ["Gx", "Gy", "a", "b"];
  for (const c of a)
    if (!i.isValid(t[c]))
      throw new Error(`CURVE.${c} must be valid field element of CURVE.Fp`);
  return t = Object.freeze(Object.assign({}, t)), { CURVE: t, Fp: i, Fn: s };
}
function hu(e, t) {
  return function(r) {
    const i = e(r);
    return { secretKey: i, publicKey: t(i) };
  };
}
let pu = class {
  oHash;
  iHash;
  blockLen;
  outputLen;
  finished = !1;
  destroyed = !1;
  constructor(t, n) {
    if (jc(t), q(n, void 0, "key"), this.iHash = t.create(), typeof this.iHash.update != "function")
      throw new Error("Expected instance of class which extends utils.Hash");
    this.blockLen = this.iHash.blockLen, this.outputLen = this.iHash.outputLen;
    const r = this.blockLen, i = new Uint8Array(r);
    i.set(n.length > r ? t.create().update(n).digest() : n);
    for (let s = 0; s < i.length; s++)
      i[s] ^= 54;
    this.iHash.update(i), this.oHash = t.create();
    for (let s = 0; s < i.length; s++)
      i[s] ^= 106;
    this.oHash.update(i), Tn(i);
  }
  update(t) {
    return Gr(this), this.iHash.update(t), this;
  }
  digestInto(t) {
    Gr(this), q(t, this.outputLen, "output"), this.finished = !0, this.iHash.digestInto(t), this.oHash.update(t), this.oHash.digestInto(t), this.destroy();
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
const gu = (e, t, n) => new pu(e, t).update(n).digest();
gu.create = (e, t) => new pu(e, t);
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const la = (e, t) => (e + (e >= 0 ? t : -t) / yu) / t;
function td(e, t, n) {
  const [[r, i], [s, o]] = t, a = la(o * e, n), c = la(-i * e, n);
  let u = e - a * r - c * s, l = -a * i - c * o;
  const f = u < we, h = l < we;
  f && (u = -u), h && (l = -l);
  const p = uo(Math.ceil(Vf(n) / 2)) + wn;
  if (u < we || u >= p || l < we || l >= p)
    throw new Error("splitScalar (endomorphism): failed, k=" + e);
  return { k1neg: f, k1: u, k2neg: h, k2: l };
}
function vs(e) {
  if (!["compact", "recovered", "der"].includes(e))
    throw new Error('Signature format must be "compact", "recovered", or "der"');
  return e;
}
function ts(e, t) {
  const n = {};
  for (let r of Object.keys(t))
    n[r] = e[r] === void 0 ? t[r] : e[r];
  return Yr(n.lowS, "lowS"), Yr(n.prehash, "prehash"), n.format !== void 0 && vs(n.format), n;
}
let ed = class extends Error {
  constructor(t = "") {
    super(t);
  }
};
const Oe = {
  // asn.1 DER encoding utils
  Err: ed,
  // Basic building block is TLV (Tag-Length-Value)
  _tlv: {
    encode: (e, t) => {
      const { Err: n } = Oe;
      if (e < 0 || e > 256)
        throw new n("tlv.encode: wrong tag");
      if (t.length & 1)
        throw new n("tlv.encode: unpadded data");
      const r = t.length / 2, i = xr(r);
      if (i.length / 2 & 128)
        throw new n("tlv.encode: long form length too big");
      const s = r > 127 ? xr(i.length / 2 | 128) : "";
      return xr(e) + s + i + t;
    },
    // v - value, l - left bytes (unparsed)
    decode(e, t) {
      const { Err: n } = Oe;
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
      const { Err: t } = Oe;
      if (e < we)
        throw new t("integer: negative integers are not allowed");
      let n = xr(e);
      if (Number.parseInt(n[0], 16) & 8 && (n = "00" + n), n.length & 1)
        throw new t("unexpected DER parsing assertion: unpadded hex");
      return n;
    },
    decode(e) {
      const { Err: t } = Oe;
      if (e[0] & 128)
        throw new t("invalid signature integer: negative");
      if (e[0] === 0 && !(e[1] & 128))
        throw new t("invalid signature integer: unnecessary leading zero");
      return xe(e);
    }
  },
  toSig(e) {
    const { Err: t, _int: n, _tlv: r } = Oe, i = q(e, void 0, "signature"), { v: s, l: o } = r.decode(48, i);
    if (o.length)
      throw new t("invalid signature: left bytes after parsing");
    const { v: a, l: c } = r.decode(2, s), { v: u, l } = r.decode(2, c);
    if (l.length)
      throw new t("invalid signature: left bytes after parsing");
    return { r: n.decode(a), s: n.decode(u) };
  },
  hexFromSig(e) {
    const { _tlv: t, _int: n } = Oe, r = t.encode(2, n.encode(e.r)), i = t.encode(2, n.encode(e.s)), s = r + i;
    return t.encode(48, s);
  }
}, we = BigInt(0), wn = BigInt(1), yu = BigInt(2), Tr = BigInt(3), nd = BigInt(4);
function rd(e, t = {}) {
  const n = Jf("weierstrass", e, t), { Fp: r, Fn: i } = n;
  let s = n.CURVE;
  const { h: o, n: a } = s;
  lo(t, {}, {
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
  const u = mu(r, i);
  function l() {
    if (!r.isOdd)
      throw new Error("compression is not supported: Field does not have .isOdd()");
  }
  function f(_, E, b) {
    const { x: w, y: x } = E.toAffine(), A = r.toBytes(w);
    if (Yr(b, "isCompressed"), b) {
      l();
      const O = !r.isOdd(x);
      return Yt(wu(O), A);
    } else
      return Yt(Uint8Array.of(4), A, r.toBytes(x));
  }
  function h(_) {
    q(_, void 0, "Point");
    const { publicKey: E, publicKeyUncompressed: b } = u, w = _.length, x = _[0], A = _.subarray(1);
    if (w === E && (x === 2 || x === 3)) {
      const O = r.fromBytes(A);
      if (!r.isValid(O))
        throw new Error("bad point: is not on curve, wrong x");
      const I = d(O);
      let v;
      try {
        v = r.sqrt(I);
      } catch (j) {
        const M = j instanceof Error ? ": " + j.message : "";
        throw new Error("bad point: is not on curve, sqrt error" + M);
      }
      l();
      const N = r.isOdd(v);
      return (x & 1) === 1 !== N && (v = r.neg(v)), { x: O, y: v };
    } else if (w === b && x === 4) {
      const O = r.BYTES, I = r.fromBytes(A.subarray(0, O)), v = r.fromBytes(A.subarray(O, O * 2));
      if (!g(I, v))
        throw new Error("bad point: is not on curve");
      return { x: I, y: v };
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
  const m = r.mul(r.pow(s.a, Tr), nd), S = r.mul(r.sqr(s.b), BigInt(27));
  if (r.is0(r.add(m, S)))
    throw new Error("bad curve params: a or b");
  function k(_, E, b = !1) {
    if (!r.isValid(E) || b && r.is0(E))
      throw new Error(`bad point coordinate ${_}`);
    return E;
  }
  function R(_) {
    if (!(_ instanceof L))
      throw new Error("Weierstrass Point expected");
  }
  function C(_) {
    if (!c || !c.basises)
      throw new Error("no endo");
    return td(_, c.basises, i.ORDER);
  }
  const W = ra((_, E) => {
    const { X: b, Y: w, Z: x } = _;
    if (r.eql(x, r.ONE))
      return { x: b, y: w };
    const A = _.is0();
    E == null && (E = A ? r.ONE : r.inv(x));
    const O = r.mul(b, E), I = r.mul(w, E), v = r.mul(x, E);
    if (A)
      return { x: r.ZERO, y: r.ZERO };
    if (!r.eql(v, r.ONE))
      throw new Error("invZ was invalid");
    return { x: O, y: I };
  }), T = ra((_) => {
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
  function Q(_, E, b, w, x) {
    return b = new L(r.mul(b.X, _), b.Y, b.Z), E = Zr(w, E), b = Zr(x, b), E.add(b);
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
    static Fn = i;
    X;
    Y;
    Z;
    /** Does NOT validate if the point is valid. Use `.assertValidity()`. */
    constructor(E, b, w) {
      this.X = k("x", E), this.Y = k("y", b, !0), this.Z = k("z", w), Object.freeze(this);
    }
    static CURVE() {
      return s;
    }
    /** Does NOT validate if the point is valid. Use `.assertValidity()`. */
    static fromAffine(E) {
      const { x: b, y: w } = E || {};
      if (!E || !r.isValid(b) || !r.isValid(w))
        throw new Error("invalid affine point");
      if (E instanceof L)
        throw new Error("projective point not allowed");
      return r.is0(b) && r.is0(w) ? L.ZERO : new L(b, w, r.ONE);
    }
    static fromBytes(E) {
      const b = L.fromAffine(y(q(E, void 0, "point")));
      return b.assertValidity(), b;
    }
    static fromHex(E) {
      return L.fromBytes(qr(E));
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
      return at.createCache(this, E), b || this.multiply(Tr), this;
    }
    // TODO: return `this`
    /** A point on curve is valid if it conforms to equation. */
    assertValidity() {
      T(this);
    }
    hasEvenY() {
      const { y: E } = this.toAffine();
      if (!r.isOdd)
        throw new Error("Field doesn't support isOdd");
      return !r.isOdd(E);
    }
    /** Compare one point to another. */
    equals(E) {
      R(E);
      const { X: b, Y: w, Z: x } = this, { X: A, Y: O, Z: I } = E, v = r.eql(r.mul(b, I), r.mul(A, x)), N = r.eql(r.mul(w, I), r.mul(O, x));
      return v && N;
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
      const { a: E, b } = s, w = r.mul(b, Tr), { X: x, Y: A, Z: O } = this;
      let I = r.ZERO, v = r.ZERO, N = r.ZERO, U = r.mul(x, x), j = r.mul(A, A), M = r.mul(O, O), P = r.mul(x, A);
      return P = r.add(P, P), N = r.mul(x, O), N = r.add(N, N), I = r.mul(E, N), v = r.mul(w, M), v = r.add(I, v), I = r.sub(j, v), v = r.add(j, v), v = r.mul(I, v), I = r.mul(P, I), N = r.mul(w, N), M = r.mul(E, M), P = r.sub(U, M), P = r.mul(E, P), P = r.add(P, N), N = r.add(U, U), U = r.add(N, U), U = r.add(U, M), U = r.mul(U, P), v = r.add(v, U), M = r.mul(A, O), M = r.add(M, M), U = r.mul(M, P), I = r.sub(I, U), N = r.mul(M, j), N = r.add(N, N), N = r.add(N, N), new L(I, v, N);
    }
    // Renes-Costello-Batina exception-free addition formula.
    // There is 30% faster Jacobian formula, but it is not complete.
    // https://eprint.iacr.org/2015/1060, algorithm 1
    // Cost: 12M + 0S + 3*a + 3*b3 + 23add.
    add(E) {
      R(E);
      const { X: b, Y: w, Z: x } = this, { X: A, Y: O, Z: I } = E;
      let v = r.ZERO, N = r.ZERO, U = r.ZERO;
      const j = s.a, M = r.mul(s.b, Tr);
      let P = r.mul(b, A), F = r.mul(w, O), Y = r.mul(x, I), ut = r.add(b, w), K = r.add(A, O);
      ut = r.mul(ut, K), K = r.add(P, F), ut = r.sub(ut, K), K = r.add(b, x);
      let X = r.add(A, I);
      return K = r.mul(K, X), X = r.add(P, Y), K = r.sub(K, X), X = r.add(w, x), v = r.add(O, I), X = r.mul(X, v), v = r.add(F, Y), X = r.sub(X, v), U = r.mul(j, K), v = r.mul(M, Y), U = r.add(v, U), v = r.sub(F, U), U = r.add(F, U), N = r.mul(v, U), F = r.add(P, P), F = r.add(F, P), Y = r.mul(j, Y), K = r.mul(M, K), F = r.add(F, Y), Y = r.sub(P, Y), Y = r.mul(j, Y), K = r.add(K, Y), P = r.mul(F, K), N = r.add(N, P), P = r.mul(X, K), v = r.mul(ut, v), v = r.sub(v, P), P = r.mul(ut, F), U = r.mul(X, U), U = r.add(U, P), new L(v, N, U);
    }
    subtract(E) {
      return this.add(E.negate());
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
    multiply(E) {
      const { endo: b } = t;
      if (!i.isValidNot0(E))
        throw new Error("invalid scalar: out of range");
      let w, x;
      const A = (O) => at.cached(this, O, (I) => oa(L, I));
      if (b) {
        const { k1neg: O, k1: I, k2neg: v, k2: N } = C(E), { p: U, f: j } = A(I), { p: M, f: P } = A(N);
        x = j.add(P), w = Q(b.beta, U, M, O, v);
      } else {
        const { p: O, f: I } = A(E);
        w = O, x = I;
      }
      return oa(L, [w, x])[0];
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
      if (E === we || w.is0())
        return L.ZERO;
      if (E === wn)
        return w;
      if (at.hasCache(this))
        return this.multiply(E);
      if (b) {
        const { k1neg: x, k1: A, k2neg: O, k2: I } = C(E), { p1: v, p2: N } = Qf(L, w, A, I);
        return Q(b.beta, v, N, x, O);
      } else
        return at.unsafe(w, E);
    }
    /**
     * Converts Projective point to affine (x, y) coordinates.
     * @param invertedZ Z^-1 (inverted zero) - optional, precomputation is useful for invertBatch
     */
    toAffine(E) {
      return W(this, E);
    }
    /**
     * Checks whether Point is free of torsion elements (is in prime subgroup).
     * Always torsion-free for cofactor=1 curves.
     */
    isTorsionFree() {
      const { isTorsionFree: E } = t;
      return o === wn ? !0 : E ? E(L, this) : at.unsafe(this, a).is0();
    }
    clearCofactor() {
      const { clearCofactor: E } = t;
      return o === wn ? this : E ? E(L, this) : this.multiplyUnsafe(o);
    }
    isSmallOrder() {
      return this.multiplyUnsafe(o).is0();
    }
    toBytes(E = !0) {
      return Yr(E, "isCompressed"), this.assertValidity(), p(L, this, E);
    }
    toHex(E = !0) {
      return Oi(this.toBytes(E));
    }
    toString() {
      return `<Point ${this.is0() ? "ZERO" : this.toHex()}>`;
    }
  }
  const J = i.BITS, at = new Xf(L, t.endo ? Math.ceil(J / 2) : J);
  return L.BASE.precompute(8), L;
}
function wu(e) {
  return Uint8Array.of(e ? 2 : 3);
}
function mu(e, t) {
  return {
    secretKey: t.BYTES,
    publicKey: 1 + e.BYTES,
    publicKeyUncompressed: 1 + 2 * e.BYTES,
    publicKeyHasPrefix: !0,
    signature: 2 * t.BYTES
  };
}
function id(e, t = {}) {
  const { Fn: n } = e, r = t.randomBytes || hr, i = Object.assign(mu(e.Fp, n), { seed: uu(n.ORDER) });
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
    return lu(q(p, i.seed, "seed"), n.ORDER);
  }
  function c(p, y = !0) {
    return e.BASE.multiply(n.fromBytes(p)).toBytes(y);
  }
  function u(p) {
    const { secretKey: y, publicKey: d, publicKeyUncompressed: g } = i;
    if (!ao(p) || "_lengths" in n && n._lengths || y === d)
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
  }, h = hu(a, c);
  return Object.freeze({ getPublicKey: c, getSharedSecret: l, keygen: h, Point: e, utils: f, lengths: i });
}
function sd(e, t, n = {}) {
  jc(t), lo(n, {}, {
    hmac: "function",
    lowS: "boolean",
    randomBytes: "function",
    bits2int: "function",
    bits2int_modN: "function"
  }), n = Object.assign({}, n);
  const r = n.randomBytes || hr, i = n.hmac || ((b, w) => gu(t, b, w)), { Fp: s, Fn: o } = e, { ORDER: a, BITS: c } = o, { keygen: u, getPublicKey: l, getSharedSecret: f, utils: h, lengths: p } = id(e, n), y = {
    prehash: !0,
    lowS: typeof n.lowS == "boolean" ? n.lowS : !0,
    format: "compact",
    extraEntropy: !1
  }, d = a * yu < s.ORDER;
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
  function k(b, w) {
    vs(w);
    const x = p.signature, A = w === "compact" ? x : w === "recovered" ? x + 1 : void 0;
    return q(b, A);
  }
  class R {
    r;
    s;
    recovery;
    constructor(w, x, A) {
      if (this.r = m("r", w), this.s = m("s", x), A != null) {
        if (S(), ![0, 1, 2, 3].includes(A))
          throw new Error("invalid recovery id");
        this.recovery = A;
      }
      Object.freeze(this);
    }
    static fromBytes(w, x = y.format) {
      k(w, x);
      let A;
      if (x === "der") {
        const { r: N, s: U } = Oe.toSig(q(w));
        return new R(N, U);
      }
      x === "recovered" && (A = w[0], x = "compact", w = w.subarray(1));
      const O = p.signature / 2, I = w.subarray(0, O), v = w.subarray(O, O * 2);
      return new R(o.fromBytes(I), o.fromBytes(v), A);
    }
    static fromHex(w, x) {
      return this.fromBytes(qr(w), x);
    }
    assertRecovery() {
      const { recovery: w } = this;
      if (w == null)
        throw new Error("invalid recovery id: must be present");
      return w;
    }
    addRecoveryBit(w) {
      return new R(this.r, this.s, w);
    }
    recoverPublicKey(w) {
      const { r: x, s: A } = this, O = this.assertRecovery(), I = O === 2 || O === 3 ? x + a : x;
      if (!s.isValid(I))
        throw new Error("invalid recovery id: sig.r+curve.n != R.x");
      const v = s.toBytes(I), N = e.fromBytes(Yt(wu((O & 1) === 0), v)), U = o.inv(I), j = W(q(w, void 0, "msgHash")), M = o.create(-j * U), P = o.create(A * U), F = e.BASE.multiplyUnsafe(M).add(N.multiplyUnsafe(P));
      if (F.is0())
        throw new Error("invalid recovery: point at infinify");
      return F.assertValidity(), F;
    }
    // Signatures should be low-s, to prevent malleability.
    hasHighS() {
      return g(this.s);
    }
    toBytes(w = y.format) {
      if (vs(w), w === "der")
        return qr(Oe.hexFromSig(this));
      const { r: x, s: A } = this, O = o.toBytes(x), I = o.toBytes(A);
      return w === "recovered" ? (S(), Yt(Uint8Array.of(this.assertRecovery()), O, I)) : Yt(O, I);
    }
    toHex(w) {
      return Oi(this.toBytes(w));
    }
  }
  const C = n.bits2int || function(w) {
    if (w.length > 8192)
      throw new Error("input is too large");
    const x = xe(w), A = w.length * 8 - c;
    return A > 0 ? x >> BigInt(A) : x;
  }, W = n.bits2int_modN || function(w) {
    return o.create(C(w));
  }, T = uo(c);
  function Q(b) {
    return Jc("num < 2^" + c, b, we, T), o.toBytes(b);
  }
  function L(b, w) {
    return q(b, void 0, "message"), w ? q(t(b), void 0, "prehashed message") : b;
  }
  function J(b, w, x) {
    const { lowS: A, prehash: O, extraEntropy: I } = ts(x, y);
    b = L(b, O);
    const v = W(b), N = o.fromBytes(w);
    if (!o.isValidNot0(N))
      throw new Error("invalid private key");
    const U = [Q(N), Q(v)];
    if (I != null && I !== !1) {
      const F = I === !0 ? r(p.secretKey) : I;
      U.push(q(F, void 0, "extraEntropy"));
    }
    const j = Yt(...U), M = v;
    function P(F) {
      const Y = C(F);
      if (!o.isValidNot0(Y))
        return;
      const ut = o.inv(Y), K = e.BASE.multiply(Y).toAffine(), X = o.create(K.x);
      if (X === we)
        return;
      const le = o.create(ut * o.create(M + X * N));
      if (le === we)
        return;
      let Mn = (K.x === X ? 0 : 2) | Number(K.y & wn), Hn = le;
      return A && g(le) && (Hn = o.neg(le), Mn ^= 1), new R(X, Hn, d ? void 0 : Mn);
    }
    return { seed: j, k2sig: P };
  }
  function at(b, w, x = {}) {
    const { seed: A, k2sig: O } = J(b, w, x);
    return Mf(t.outputLen, o.BYTES, i)(A, O).toBytes(x.format);
  }
  function _(b, w, x, A = {}) {
    const { lowS: O, prehash: I, format: v } = ts(A, y);
    if (x = q(x, void 0, "publicKey"), w = L(w, I), !ao(b)) {
      const N = b instanceof R ? ", use sig.toBytes()" : "";
      throw new Error("verify expects Uint8Array signature" + N);
    }
    k(b, v);
    try {
      const N = R.fromBytes(b, v), U = e.fromBytes(x);
      if (O && N.hasHighS())
        return !1;
      const { r: j, s: M } = N, P = W(w), F = o.inv(M), Y = o.create(P * F), ut = o.create(j * F), K = e.BASE.multiplyUnsafe(Y).add(U.multiplyUnsafe(ut));
      return K.is0() ? !1 : o.create(K.x) === j;
    } catch {
      return !1;
    }
  }
  function E(b, w, x = {}) {
    const { prehash: A } = ts(x, y);
    return w = L(w, A), R.fromBytes(b, "recovered").recoverPublicKey(w).toBytes();
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
    Signature: R,
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
}, od = {
  beta: BigInt("0x7ae96a2b657c07106e64479eac3434e99cf0497512f58995c1396c28719501ee"),
  basises: [
    [BigInt("0x3086d221a7d46bcde86c90e49284eb15"), -BigInt("0xe4437ed6010e88286f547fa90abfe4c3")],
    [BigInt("0x114ca50f7a8e2f3f657c1108d9d44cfd8"), BigInt("0x3086d221a7d46bcde86c90e49284eb15")]
  ]
}, ad = /* @__PURE__ */ BigInt(0), As = /* @__PURE__ */ BigInt(2);
function cd(e) {
  const t = $i.p, n = BigInt(3), r = BigInt(6), i = BigInt(11), s = BigInt(22), o = BigInt(23), a = BigInt(44), c = BigInt(88), u = e * e * e % t, l = u * u * e % t, f = Vt(l, n, t) * l % t, h = Vt(f, n, t) * l % t, p = Vt(h, As, t) * u % t, y = Vt(p, i, t) * p % t, d = Vt(y, s, t) * y % t, g = Vt(d, a, t) * d % t, m = Vt(g, c, t) * g % t, S = Vt(m, a, t) * d % t, k = Vt(S, n, t) * l % t, R = Vt(k, o, t) * y % t, C = Vt(R, r, t) * u % t, W = Vt(C, As, t);
  if (!Xr.eql(Xr.sqr(W), e))
    throw new Error("Cannot find square root");
  return W;
}
const Xr = Bi($i.p, { sqrt: cd }), dn = /* @__PURE__ */ rd($i, {
  Fp: Xr,
  endo: od
}), Ne = /* @__PURE__ */ sd(dn, xt), fa = {};
function Qr(e, ...t) {
  let n = fa[e];
  if (n === void 0) {
    const r = xt(_f(e));
    n = Yt(r, r), fa[e] = n;
  }
  return xt(Yt(n, ...t));
}
const ho = (e) => e.toBytes(!0).slice(1), po = (e) => e % As === ad;
function Is(e) {
  const { Fn: t, BASE: n } = dn, r = t.fromBytes(e), i = n.multiply(r);
  return { scalar: po(i.y) ? r : t.neg(r), bytes: ho(i) };
}
function bu(e) {
  const t = Xr;
  if (!t.isValidNot0(e))
    throw new Error("invalid x: Fail if x ≥ p");
  const n = t.create(e * e), r = t.create(n * e + BigInt(7));
  let i = t.sqrt(r);
  po(i) || (i = t.neg(i));
  const s = dn.fromAffine({ x: e, y: i });
  return s.assertValidity(), s;
}
const Xn = xe;
function Eu(...e) {
  return dn.Fn.create(Xn(Qr("BIP0340/challenge", ...e)));
}
function da(e) {
  return Is(e).bytes;
}
function ud(e, t, n = hr(32)) {
  const { Fn: r } = dn, i = q(e, void 0, "message"), { bytes: s, scalar: o } = Is(t), a = q(n, 32, "auxRand"), c = r.toBytes(o ^ Xn(Qr("BIP0340/aux", a))), u = Qr("BIP0340/nonce", c, s, i), { bytes: l, scalar: f } = Is(u), h = Eu(l, s, i), p = new Uint8Array(64);
  if (p.set(l, 0), p.set(r.toBytes(r.create(f + h * o)), 32), !xu(p, i, s))
    throw new Error("sign: Invalid signature produced");
  return p;
}
function xu(e, t, n) {
  const { Fp: r, Fn: i, BASE: s } = dn, o = q(e, 64, "signature"), a = q(t, void 0, "message"), c = q(n, 32, "publicKey");
  try {
    const u = bu(Xn(c)), l = Xn(o.subarray(0, 32));
    if (!r.isValidNot0(l))
      return !1;
    const f = Xn(o.subarray(32, 64));
    if (!i.isValidNot0(f))
      return !1;
    const h = Eu(i.toBytes(l), ho(u), a), p = s.multiplyUnsafe(f).add(u.multiplyUnsafe(i.neg(h))), { x: y, y: d } = p.toAffine();
    return !(p.is0() || !po(d) || y !== l);
  } catch {
    return !1;
  }
}
const Te = /* @__PURE__ */ (() => {
  const n = (r = hr(48)) => lu(r, $i.n);
  return {
    keygen: hu(n, da),
    getPublicKey: da,
    sign: ud,
    verify: xu,
    Point: dn,
    utils: {
      randomSecretKey: n,
      taggedHash: Qr,
      lift_x: bu,
      pointToBytes: ho
    },
    lengths: {
      secretKey: 32,
      publicKey: 32,
      publicKeyHasPrefix: !1,
      signature: 64,
      seed: 48
    }
  };
})(), ld = /* @__PURE__ */ Uint8Array.from([
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
]), Tu = Uint8Array.from(new Array(16).fill(0).map((e, t) => t)), fd = Tu.map((e) => (9 * e + 5) % 16), Su = /* @__PURE__ */ (() => {
  const n = [[Tu], [fd]];
  for (let r = 0; r < 4; r++)
    for (let i of n)
      i.push(i[r].map((s) => ld[s]));
  return n;
})(), vu = Su[0], Au = Su[1], Iu = /* @__PURE__ */ [
  [11, 14, 15, 12, 5, 8, 7, 9, 11, 13, 14, 15, 6, 7, 9, 8],
  [12, 13, 11, 15, 6, 9, 9, 7, 12, 15, 11, 13, 7, 8, 7, 7],
  [13, 15, 14, 11, 7, 7, 6, 8, 13, 14, 13, 12, 5, 5, 6, 9],
  [14, 11, 12, 14, 8, 6, 5, 5, 15, 12, 15, 14, 9, 9, 8, 6],
  [15, 12, 13, 13, 9, 5, 8, 6, 14, 11, 12, 11, 8, 6, 5, 5]
].map((e) => Uint8Array.from(e)), dd = /* @__PURE__ */ vu.map((e, t) => e.map((n) => Iu[t][n])), hd = /* @__PURE__ */ Au.map((e, t) => e.map((n) => Iu[t][n])), pd = /* @__PURE__ */ Uint32Array.from([
  0,
  1518500249,
  1859775393,
  2400959708,
  2840853838
]), gd = /* @__PURE__ */ Uint32Array.from([
  1352829926,
  1548603684,
  1836072691,
  2053994217,
  0
]);
function ha(e, t, n, r) {
  return e === 0 ? t ^ n ^ r : e === 1 ? t & n | ~t & r : e === 2 ? (t | ~n) ^ r : e === 3 ? t & r | n & ~r : t ^ (n | ~r);
}
const Sr = /* @__PURE__ */ new Uint32Array(16);
class yd extends qc {
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
      Sr[p] = t.getUint32(n, !0);
    let r = this.h0 | 0, i = r, s = this.h1 | 0, o = s, a = this.h2 | 0, c = a, u = this.h3 | 0, l = u, f = this.h4 | 0, h = f;
    for (let p = 0; p < 5; p++) {
      const y = 4 - p, d = pd[p], g = gd[p], m = vu[p], S = Au[p], k = dd[p], R = hd[p];
      for (let C = 0; C < 16; C++) {
        const W = Er(r + ha(p, s, a, u) + Sr[m[C]] + d, k[C]) + f | 0;
        r = f, f = u, u = Er(a, 10) | 0, a = s, s = W;
      }
      for (let C = 0; C < 16; C++) {
        const W = Er(i + ha(y, o, c, l) + Sr[S[C]] + g, R[C]) + h | 0;
        i = h, h = l, l = Er(c, 10) | 0, c = o, o = W;
      }
    }
    this.set(this.h1 + a + l | 0, this.h2 + u + h | 0, this.h3 + f + i | 0, this.h4 + r + o | 0, this.h0 + s + c | 0);
  }
  roundClean() {
    Tn(Sr);
  }
  destroy() {
    this.destroyed = !0, Tn(this.buffer), this.set(0, 0, 0, 0, 0);
  }
}
const wd = /* @__PURE__ */ Gc(() => new yd());
/*! scure-base - MIT License (c) 2022 Paul Miller (paulmillr.com) */
function vn(e) {
  return e instanceof Uint8Array || ArrayBuffer.isView(e) && e.constructor.name === "Uint8Array";
}
function ku(e) {
  if (!vn(e))
    throw new Error("Uint8Array expected");
}
function Ou(e, t) {
  return Array.isArray(t) ? t.length === 0 ? !0 : e ? t.every((n) => typeof n == "string") : t.every((n) => Number.isSafeInteger(n)) : !1;
}
function go(e) {
  if (typeof e != "function")
    throw new Error("function expected");
  return !0;
}
function Ve(e, t) {
  if (typeof t != "string")
    throw new Error(`${e}: string expected`);
  return !0;
}
function _n(e) {
  if (!Number.isSafeInteger(e))
    throw new Error(`invalid integer: ${e}`);
}
function Jr(e) {
  if (!Array.isArray(e))
    throw new Error("array expected");
}
function ti(e, t) {
  if (!Ou(!0, t))
    throw new Error(`${e}: array of strings expected`);
}
function yo(e, t) {
  if (!Ou(!1, t))
    throw new Error(`${e}: array of numbers expected`);
}
// @__NO_SIDE_EFFECTS__
function gr(...e) {
  const t = (s) => s, n = (s, o) => (a) => s(o(a)), r = e.map((s) => s.encode).reduceRight(n, t), i = e.map((s) => s.decode).reduce(n, t);
  return { encode: r, decode: i };
}
// @__NO_SIDE_EFFECTS__
function Ni(e) {
  const t = typeof e == "string" ? e.split("") : e, n = t.length;
  ti("alphabet", t);
  const r = new Map(t.map((i, s) => [i, s]));
  return {
    encode: (i) => (Jr(i), i.map((s) => {
      if (!Number.isSafeInteger(s) || s < 0 || s >= n)
        throw new Error(`alphabet.encode: digit index outside alphabet "${s}". Allowed: ${e}`);
      return t[s];
    })),
    decode: (i) => (Jr(i), i.map((s) => {
      Ve("alphabet.decode", s);
      const o = r.get(s);
      if (o === void 0)
        throw new Error(`Unknown letter: "${s}". Allowed: ${e}`);
      return o;
    }))
  };
}
// @__NO_SIDE_EFFECTS__
function Ri(e = "") {
  return Ve("join", e), {
    encode: (t) => (ti("join.decode", t), t.join(e)),
    decode: (t) => (Ve("join.decode", t), t.split(e))
  };
}
// @__NO_SIDE_EFFECTS__
function md(e, t = "=") {
  return _n(e), Ve("padding", t), {
    encode(n) {
      for (ti("padding.encode", n); n.length * e % 8; )
        n.push(t);
      return n;
    },
    decode(n) {
      ti("padding.decode", n);
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
function bd(e) {
  return go(e), { encode: (t) => t, decode: (t) => e(t) };
}
function pa(e, t, n) {
  if (t < 2)
    throw new Error(`convertRadix: invalid from=${t}, base cannot be less than 2`);
  if (n < 2)
    throw new Error(`convertRadix: invalid to=${n}, base cannot be less than 2`);
  if (Jr(e), !e.length)
    return [];
  let r = 0;
  const i = [], s = Array.from(e, (a) => {
    if (_n(a), a < 0 || a >= t)
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
const Bu = (e, t) => t === 0 ? e : Bu(t, e % t), ei = /* @__NO_SIDE_EFFECTS__ */ (e, t) => e + (t - Bu(e, t)), _r = /* @__PURE__ */ (() => {
  let e = [];
  for (let t = 0; t < 40; t++)
    e.push(2 ** t);
  return e;
})();
function ks(e, t, n, r) {
  if (Jr(e), t <= 0 || t > 32)
    throw new Error(`convertRadix2: wrong from=${t}`);
  if (n <= 0 || n > 32)
    throw new Error(`convertRadix2: wrong to=${n}`);
  if (/* @__PURE__ */ ei(t, n) > 32)
    throw new Error(`convertRadix2: carry overflow from=${t} to=${n} carryBits=${/* @__PURE__ */ ei(t, n)}`);
  let i = 0, s = 0;
  const o = _r[t], a = _r[n] - 1, c = [];
  for (const u of e) {
    if (_n(u), u >= o)
      throw new Error(`convertRadix2: invalid data word=${u} from=${t}`);
    if (i = i << t | u, s + t > 32)
      throw new Error(`convertRadix2: carry overflow pos=${s} from=${t}`);
    for (s += t; s >= n; s -= n)
      c.push((i >> s - n & a) >>> 0);
    const l = _r[s];
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
function Ed(e) {
  _n(e);
  const t = 2 ** 8;
  return {
    encode: (n) => {
      if (!vn(n))
        throw new Error("radix.encode input should be Uint8Array");
      return pa(Array.from(n), t, e);
    },
    decode: (n) => (yo("radix.decode", n), Uint8Array.from(pa(n, e, t)))
  };
}
// @__NO_SIDE_EFFECTS__
function wo(e, t = !1) {
  if (_n(e), e <= 0 || e > 32)
    throw new Error("radix2: bits should be in (0..32]");
  if (/* @__PURE__ */ ei(8, e) > 32 || /* @__PURE__ */ ei(e, 8) > 32)
    throw new Error("radix2: carry overflow");
  return {
    encode: (n) => {
      if (!vn(n))
        throw new Error("radix2.encode input should be Uint8Array");
      return ks(Array.from(n), 8, e, !t);
    },
    decode: (n) => (yo("radix2.decode", n), Uint8Array.from(ks(n, e, 8, t)))
  };
}
function ga(e) {
  return go(e), function(...t) {
    try {
      return e.apply(null, t);
    } catch {
    }
  };
}
function xd(e, t) {
  return _n(e), go(t), {
    encode(n) {
      if (!vn(n))
        throw new Error("checksum.encode: input should be Uint8Array");
      const r = t(n).slice(0, e), i = new Uint8Array(n.length + e);
      return i.set(n), i.set(r, n.length), i;
    },
    decode(n) {
      if (!vn(n))
        throw new Error("checksum.decode: input should be Uint8Array");
      const r = n.slice(0, -e), i = n.slice(-e), s = t(r).slice(0, e);
      for (let o = 0; o < e; o++)
        if (s[o] !== i[o])
          throw new Error("Invalid checksum");
      return r;
    }
  };
}
const Td = typeof Uint8Array.from([]).toBase64 == "function" && typeof Uint8Array.fromBase64 == "function", Sd = (e, t) => {
  Ve("base64", e);
  const n = /^[A-Za-z0-9=+/]+$/, r = "base64";
  if (e.length > 0 && !n.test(e))
    throw new Error("invalid base64");
  return Uint8Array.fromBase64(e, { alphabet: r, lastChunkHandling: "strict" });
}, Et = Td ? {
  encode(e) {
    return ku(e), e.toBase64();
  },
  decode(e) {
    return Sd(e);
  }
} : /* @__PURE__ */ gr(/* @__PURE__ */ wo(6), /* @__PURE__ */ Ni("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"), /* @__PURE__ */ md(6), /* @__PURE__ */ Ri("")), vd = /* @__NO_SIDE_EFFECTS__ */ (e) => /* @__PURE__ */ gr(/* @__PURE__ */ Ed(58), /* @__PURE__ */ Ni(e), /* @__PURE__ */ Ri("")), Os = /* @__PURE__ */ vd("123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"), Ad = (e) => /* @__PURE__ */ gr(xd(4, (t) => e(e(t))), Os), Bs = /* @__PURE__ */ gr(/* @__PURE__ */ Ni("qpzry9x8gf2tvdw0s3jn54khce6mua7l"), /* @__PURE__ */ Ri("")), ya = [996825010, 642813549, 513874426, 1027748829, 705979059];
function Fn(e) {
  const t = e >> 25;
  let n = (e & 33554431) << 5;
  for (let r = 0; r < ya.length; r++)
    (t >> r & 1) === 1 && (n ^= ya[r]);
  return n;
}
function wa(e, t, n = 1) {
  const r = e.length;
  let i = 1;
  for (let s = 0; s < r; s++) {
    const o = e.charCodeAt(s);
    if (o < 33 || o > 126)
      throw new Error(`Invalid prefix (${e})`);
    i = Fn(i) ^ o >> 5;
  }
  i = Fn(i);
  for (let s = 0; s < r; s++)
    i = Fn(i) ^ e.charCodeAt(s) & 31;
  for (let s of t)
    i = Fn(i) ^ s;
  for (let s = 0; s < 6; s++)
    i = Fn(i);
  return i ^= n, Bs.encode(ks([i % _r[30]], 30, 5, !1));
}
// @__NO_SIDE_EFFECTS__
function $u(e) {
  const t = e === "bech32" ? 1 : 734539939, n = /* @__PURE__ */ wo(5), r = n.decode, i = n.encode, s = ga(r);
  function o(f, h, p = 90) {
    Ve("bech32.encode prefix", f), vn(h) && (h = Array.from(h)), yo("bech32.encode", h);
    const y = f.length;
    if (y === 0)
      throw new TypeError(`Invalid prefix length ${y}`);
    const d = y + 7 + h.length;
    if (p !== !1 && d > p)
      throw new TypeError(`Length ${d} exceeds limit ${p}`);
    const g = f.toLowerCase(), m = wa(g, h, t);
    return `${g}1${Bs.encode(h)}${m}`;
  }
  function a(f, h = 90) {
    Ve("bech32.decode input", f);
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
    const S = Bs.decode(m).slice(0, -6), k = wa(g, S, t);
    if (!m.endsWith(k))
      throw new Error(`Invalid checksum in ${f}: expected "${k}"`);
    return { prefix: g, words: S };
  }
  const c = ga(a);
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
const $s = /* @__PURE__ */ $u("bech32"), pn = /* @__PURE__ */ $u("bech32m"), Id = {
  encode: (e) => new TextDecoder().decode(e),
  decode: (e) => new TextEncoder().encode(e)
}, kd = typeof Uint8Array.from([]).toHex == "function" && typeof Uint8Array.fromHex == "function", Od = {
  encode(e) {
    return ku(e), e.toHex();
  },
  decode(e) {
    return Ve("hex", e), Uint8Array.fromHex(e);
  }
}, $ = kd ? Od : /* @__PURE__ */ gr(/* @__PURE__ */ wo(4), /* @__PURE__ */ Ni("0123456789abcdef"), /* @__PURE__ */ Ri(""), /* @__PURE__ */ bd((e) => {
  if (typeof e != "string" || e.length % 2 !== 0)
    throw new TypeError(`hex.decode: expected string, got ${typeof e} with length ${e.length}`);
  return e.toLowerCase();
})), ct = /* @__PURE__ */ Uint8Array.of(), Nu = /* @__PURE__ */ Uint8Array.of(0);
function An(e, t) {
  if (e.length !== t.length)
    return !1;
  for (let n = 0; n < e.length; n++)
    if (e[n] !== t[n])
      return !1;
  return !0;
}
function Ft(e) {
  return e instanceof Uint8Array || ArrayBuffer.isView(e) && e.constructor.name === "Uint8Array";
}
function Bd(...e) {
  let t = 0;
  for (let r = 0; r < e.length; r++) {
    const i = e[r];
    if (!Ft(i))
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
const Ru = (e) => new DataView(e.buffer, e.byteOffset, e.byteLength);
function yr(e) {
  return Object.prototype.toString.call(e) === "[object Object]";
}
function ae(e) {
  return Number.isSafeInteger(e);
}
const mo = {
  equalBytes: An,
  isBytes: Ft,
  concatBytes: Bd
}, Uu = (e) => {
  if (e !== null && typeof e != "string" && !Xt(e) && !Ft(e) && !ae(e))
    throw new Error(`lengthCoder: expected null | number | Uint8Array | CoderType, got ${e} (${typeof e})`);
  return {
    encodeStream(t, n) {
      if (e === null)
        return;
      if (Xt(e))
        return e.encodeStream(t, n);
      let r;
      if (typeof e == "number" ? r = e : typeof e == "string" && (r = Ee.resolve(t.stack, e)), typeof r == "bigint" && (r = Number(r)), r === void 0 || r !== n)
        throw t.err(`Wrong length: ${r} len=${e} exp=${n} (${typeof n})`);
    },
    decodeStream(t) {
      let n;
      if (Xt(e) ? n = Number(e.decodeStream(t)) : typeof e == "number" ? n = e : typeof e == "string" && (n = Ee.resolve(t.stack, e)), typeof n == "bigint" && (n = Number(n)), typeof n != "number")
        throw t.err(`Wrong length: ${n}`);
      return n;
    }
  };
}, yt = {
  BITS: 32,
  FULL_MASK: -1 >>> 0,
  // 1<<32 will overflow
  len: (e) => Math.ceil(e / 32),
  create: (e) => new Uint32Array(yt.len(e)),
  clean: (e) => e.fill(0),
  debug: (e) => Array.from(e).map((t) => (t >>> 0).toString(2).padStart(32, "0")),
  checkLen: (e, t) => {
    if (yt.len(t) !== e.length)
      throw new Error(`wrong length=${e.length}. Expected: ${yt.len(t)}`);
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
    yt.checkLen(e, t);
    const { FULL_MASK: r, BITS: i } = yt, s = i - t % i, o = s ? r >>> s << s : r, a = [];
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
  rangeDebug: (e, t, n = !1) => `[${yt.range(yt.indices(e, t, n)).map((r) => `(${r.pos}/${r.length})`).join(", ")}]`,
  setRange: (e, t, n, r, i = !0) => {
    yt.chunkLen(t, n, r);
    const { FULL_MASK: s, BITS: o } = yt, a = n % o ? Math.floor(n / o) : void 0, c = n + r, u = c % o ? Math.floor(c / o) : void 0;
    if (a !== void 0 && a === u)
      return yt.set(e, a, s >>> o - r << o - r - n, i);
    if (a !== void 0 && !yt.set(e, a, s >>> n % o, i))
      return !1;
    const l = a !== void 0 ? a + 1 : n / o, f = u !== void 0 ? u : c / o;
    for (let h = l; h < f; h++)
      if (!yt.set(e, h, s, i))
        return !1;
    return !(u !== void 0 && a !== u && !yt.set(e, u, s << o - c % o, i));
  }
}, Ee = {
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
    const r = new Error(`${e}(${Ee.path(t)}): ${typeof n == "string" ? n : n.message}`);
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
class bo {
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
    this.data = t, this.opts = n, this.stack = r, this.parent = i, this.parentOffset = s, this.view = Ru(t);
  }
  /** Internal method for pointers. */
  _enablePointers() {
    if (this.parent)
      return this.parent._enablePointers();
    this.bs || (this.bs = yt.create(this.data.length), yt.setRange(this.bs, this.data.length, 0, this.pos, this.opts.allowMultipleReads));
  }
  markBytesBS(t, n) {
    return this.parent ? this.parent.markBytesBS(this.parentOffset + t, n) : !n || !this.bs ? !0 : yt.setRange(this.bs, this.data.length, t, n, !1);
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
    return Ee.pushObj(this.stack, t, n);
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
        throw this.err(`${this.bitPos} bits left after unpack: ${$.encode(this.data.slice(this.pos))}`);
      if (this.bs && !this.parent) {
        const t = yt.indices(this.bs, this.data.length, !0);
        if (t.length) {
          const n = yt.range(t).map(({ pos: r, length: i }) => `(${r}/${i})[${$.encode(this.data.subarray(r, r + i))}]`).join(", ");
          throw this.err(`unread byte ranges: ${n} (total=${this.data.length})`);
        } else
          return;
      }
      if (!this.isEnd())
        throw this.err(`${this.leftBytes} bytes ${this.bitPos} bits left after unpack: ${$.encode(this.data.slice(this.pos))}`);
    }
  }
  // User methods
  err(t) {
    return Ee.err("Reader", this.stack, t);
  }
  offsetReader(t) {
    if (t > this.data.length)
      throw this.err("offsetReader: Unexpected end of buffer");
    return new bo(this.absBytes(t), this.opts, this.stack, this, t);
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
    if (!Ft(t))
      throw this.err(`find: needle is not bytes! ${t}`);
    if (this.bitPos)
      throw this.err("findByte: bitPos not empty");
    if (!t.length)
      throw this.err("find: needle is empty");
    for (let r = n; (r = this.data.indexOf(t[0], r)) !== -1; r++) {
      if (r === -1 || this.data.length - r < t.length)
        return;
      if (An(t, this.data.subarray(r, r + t.length)))
        return r;
    }
  }
}
class $d {
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
    this.stack = t, this.view = Ru(this.viewBuf);
  }
  pushObj(t, n) {
    return Ee.pushObj(this.stack, t, n);
  }
  writeView(t, n) {
    if (this.finished)
      throw this.err("buffer: finished");
    if (!ae(t) || t > 8)
      throw new Error(`wrong writeView length=${t}`);
    n(this.view), this.bytes(this.viewBuf.slice(0, t)), this.viewBuf.fill(0);
  }
  // User methods
  err(t) {
    if (this.finished)
      throw this.err("buffer: finished");
    return Ee.err("Reader", this.stack, t);
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
const Ns = (e) => Uint8Array.from(e).reverse();
function Nd(e, t, n) {
  if (n) {
    const r = 2n ** (t - 1n);
    if (e < -r || e >= r)
      throw new Error(`value out of signed bounds. Expected ${-r} <= ${e} < ${r}`);
  } else if (0n > e || e >= 2n ** t)
    throw new Error(`value out of unsigned bounds. Expected 0 <= ${e} < ${2n ** t}`);
}
function Lu(e) {
  return {
    // NOTE: we cannot export validate here, since it is likely mistake.
    encodeStream: e.encodeStream,
    decodeStream: e.decodeStream,
    size: e.size,
    encode: (t) => {
      const n = new $d();
      return e.encodeStream(n, t), n.finish();
    },
    decode: (t, n = {}) => {
      const r = new bo(t, n), i = e.decodeStream(r);
      return r.finish(), i;
    }
  };
}
function $t(e, t) {
  if (!Xt(e))
    throw new Error(`validate: invalid inner value ${e}`);
  if (typeof t != "function")
    throw new Error("validate: fn should be function");
  return Lu({
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
const Nt = (e) => {
  const t = Lu(e);
  return e.validate ? $t(t, e.validate) : t;
}, Ui = (e) => yr(e) && typeof e.decode == "function" && typeof e.encode == "function";
function Xt(e) {
  return yr(e) && Ui(e) && typeof e.encodeStream == "function" && typeof e.decodeStream == "function" && (e.size === void 0 || ae(e.size));
}
function Rd() {
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
      if (!yr(e))
        throw new Error(`expected plain object, got ${e}`);
      return Object.entries(e);
    }
  };
}
const Ud = {
  encode: (e) => {
    if (typeof e != "bigint")
      throw new Error(`expected bigint, got ${typeof e}`);
    if (e > BigInt(Number.MAX_SAFE_INTEGER))
      throw new Error(`element bigger than MAX_SAFE_INTEGER=${e}`);
    return Number(e);
  },
  decode: (e) => {
    if (!ae(e))
      throw new Error("element is not a safe integer");
    return BigInt(e);
  }
};
function Ld(e) {
  if (!yr(e))
    throw new Error("plain object expected");
  return {
    encode: (t) => {
      if (!ae(t) || !(t in e))
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
function Cd(e, t = !1) {
  if (!ae(e))
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
function Pd(e) {
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
const Cu = (e) => {
  if (!Ui(e))
    throw new Error("BaseCoder expected");
  return { encode: e.decode, decode: e.encode };
}, Li = { dict: Rd, numberBigint: Ud, tsEnum: Ld, decimal: Cd, match: Pd, reverse: Cu }, Eo = (e, t = !1, n = !1, r = !0) => {
  if (!ae(e))
    throw new Error(`bigint/size: wrong value ${e}`);
  if (typeof t != "boolean")
    throw new Error(`bigint/le: expected boolean, got ${typeof t}`);
  if (typeof n != "boolean")
    throw new Error(`bigint/signed: expected boolean, got ${typeof n}`);
  if (typeof r != "boolean")
    throw new Error(`bigint/sized: expected boolean, got ${typeof r}`);
  const i = BigInt(e), s = 2n ** (8n * i - 1n);
  return Nt({
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
      const a = o.bytes(r ? e : Math.min(e, o.leftBytes)), c = t ? a : Ns(a);
      let u = 0n;
      for (let l = 0; l < c.length; l++)
        u |= BigInt(c[l]) << 8n * BigInt(l);
      return n && u & s && (u = (u ^ s) - s), u;
    },
    validate: (o) => {
      if (typeof o != "bigint")
        throw new Error(`bigint: invalid value: ${o}`);
      return Nd(o, 8n * i, !!n), o;
    }
  });
}, Pu = /* @__PURE__ */ Eo(32, !1), Dr = /* @__PURE__ */ Eo(8, !0), _d = /* @__PURE__ */ Eo(8, !0, !0), Dd = (e, t) => Nt({
  size: e,
  encodeStream: (n, r) => n.writeView(e, (i) => t.write(i, r)),
  decodeStream: (n) => n.readView(e, t.read),
  validate: (n) => {
    if (typeof n != "number")
      throw new Error(`viewCoder: expected number, got ${typeof n}`);
    return t.validate && t.validate(n), n;
  }
}), wr = (e, t, n) => {
  const r = e * 8, i = 2 ** (r - 1), s = (c) => {
    if (!ae(c))
      throw new Error(`sintView: value is not safe integer: ${c}`);
    if (c < -i || c >= i)
      throw new Error(`sintView: value out of bounds. Expected ${-i} <= ${c} < ${i}`);
  }, o = 2 ** r, a = (c) => {
    if (!ae(c))
      throw new Error(`uintView: value is not safe integer: ${c}`);
    if (0 > c || c >= o)
      throw new Error(`uintView: value out of bounds. Expected 0 <= ${c} < ${o}`);
  };
  return Dd(e, {
    write: n.write,
    read: n.read,
    validate: t ? s : a
  });
}, tt = /* @__PURE__ */ wr(4, !1, {
  read: (e, t) => e.getUint32(t, !0),
  write: (e, t) => e.setUint32(0, t, !0)
}), Vd = /* @__PURE__ */ wr(4, !1, {
  read: (e, t) => e.getUint32(t, !1),
  write: (e, t) => e.setUint32(0, t, !1)
}), gn = /* @__PURE__ */ wr(4, !0, {
  read: (e, t) => e.getInt32(t, !0),
  write: (e, t) => e.setInt32(0, t, !0)
}), ma = /* @__PURE__ */ wr(2, !1, {
  read: (e, t) => e.getUint16(t, !0),
  write: (e, t) => e.setUint16(0, t, !0)
}), Ue = /* @__PURE__ */ wr(1, !1, {
  read: (e, t) => e.getUint8(t),
  write: (e, t) => e.setUint8(0, t)
}), ot = (e, t = !1) => {
  if (typeof t != "boolean")
    throw new Error(`bytes/le: expected boolean, got ${typeof t}`);
  const n = Uu(e), r = Ft(e);
  return Nt({
    size: typeof e == "number" ? e : void 0,
    encodeStream: (i, s) => {
      r || n.encodeStream(i, s.length), i.bytes(t ? Ns(s) : s), r && i.bytes(e);
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
      return t ? Ns(s) : s;
    },
    validate: (i) => {
      if (!Ft(i))
        throw new Error(`bytes: invalid value ${i}`);
      return i;
    }
  });
};
function Md(e, t) {
  if (!Xt(t))
    throw new Error(`prefix: invalid inner value ${t}`);
  return Me(ot(e), Cu(t));
}
const xo = (e, t = !1) => $t(Me(ot(e, t), Id), (n) => {
  if (typeof n != "string")
    throw new Error(`expected string, got ${typeof n}`);
  return n;
}), Hd = (e, t = { isLE: !1, with0x: !1 }) => {
  let n = Me(ot(e, t.isLE), $);
  const r = t.with0x;
  if (typeof r != "boolean")
    throw new Error(`hex/with0x: expected boolean, got ${typeof r}`);
  return r && (n = Me(n, {
    encode: (i) => `0x${i}`,
    decode: (i) => {
      if (!i.startsWith("0x"))
        throw new Error("hex(with0x=true).encode input should start with 0x");
      return i.slice(2);
    }
  })), n;
};
function Me(e, t) {
  if (!Xt(e))
    throw new Error(`apply: invalid inner value ${e}`);
  if (!Ui(t))
    throw new Error(`apply: invalid base value ${e}`);
  return Nt({
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
const Fd = (e, t = !1) => {
  if (!Ft(e))
    throw new Error(`flag/flagValue: expected Uint8Array, got ${typeof e}`);
  if (typeof t != "boolean")
    throw new Error(`flag/xor: expected boolean, got ${typeof t}`);
  return Nt({
    size: e.length,
    encodeStream: (n, r) => {
      !!r !== t && n.bytes(e);
    },
    decodeStream: (n) => {
      let r = n.leftBytes >= e.length;
      return r && (r = An(n.bytes(e.length, !0), e), r && n.bytes(e.length)), r !== t;
    },
    validate: (n) => {
      if (n !== void 0 && typeof n != "boolean")
        throw new Error(`flag: expected boolean value or undefined, got ${typeof n}`);
      return n;
    }
  });
};
function Kd(e, t, n) {
  if (!Xt(t))
    throw new Error(`flagged: invalid inner value ${t}`);
  return Nt({
    encodeStream: (r, i) => {
      Ee.resolve(r.stack, e) && t.encodeStream(r, i);
    },
    decodeStream: (r) => {
      let i = !1;
      if (i = !!Ee.resolve(r.stack, e), i)
        return t.decodeStream(r);
    }
  });
}
function To(e, t, n = !0) {
  if (!Xt(e))
    throw new Error(`magic: invalid inner value ${e}`);
  if (typeof n != "boolean")
    throw new Error(`magic: expected boolean, got ${typeof n}`);
  return Nt({
    size: e.size,
    encodeStream: (r, i) => e.encodeStream(r, t),
    decodeStream: (r) => {
      const i = e.decodeStream(r);
      if (n && typeof i != "object" && i !== t || Ft(t) && !An(t, i))
        throw r.err(`magic: invalid value: ${i} !== ${t}`);
    },
    validate: (r) => {
      if (r !== void 0)
        throw new Error(`magic: wrong value=${typeof r}`);
      return r;
    }
  });
}
function _u(e) {
  let t = 0;
  for (const n of e) {
    if (n.size === void 0)
      return;
    if (!ae(n.size))
      throw new Error(`sizeof: wrong element size=${t}`);
    t += n.size;
  }
  return t;
}
function bt(e) {
  if (!yr(e))
    throw new Error(`struct: expected plain object, got ${e}`);
  for (const t in e)
    if (!Xt(e[t]))
      throw new Error(`struct: field ${t} is not CoderType`);
  return Nt({
    size: _u(Object.values(e)),
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
function zd(e) {
  if (!Array.isArray(e))
    throw new Error(`Packed.Tuple: got ${typeof e} instead of array`);
  for (let t = 0; t < e.length; t++)
    if (!Xt(e[t]))
      throw new Error(`tuple: field ${t} is not CoderType`);
  return Nt({
    size: _u(e),
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
function Bt(e, t) {
  if (!Xt(t))
    throw new Error(`array: invalid inner value ${t}`);
  const n = Uu(typeof e == "string" ? `../${e}` : e);
  return Nt({
    size: typeof e == "number" && t.size ? e * t.size : void 0,
    encodeStream: (r, i) => {
      const s = r;
      s.pushObj(i, (o) => {
        Ft(e) || n.encodeStream(r, i.length);
        for (let a = 0; a < i.length; a++)
          o(`${a}`, () => {
            const c = i[a], u = r.pos;
            if (t.encodeStream(r, c), Ft(e)) {
              if (e.length > s.pos - u)
                return;
              const l = s.finish(!1).subarray(u, s.pos);
              if (An(l.subarray(0, e.length), e))
                throw s.err(`array: inner element encoding same as separator. elm=${c} data=${l}`);
            }
          });
      }), Ft(e) && r.bytes(e);
    },
    decodeStream: (r) => {
      const i = [];
      return r.pushObj(i, (s) => {
        if (e === null)
          for (let o = 0; !r.isEnd() && (s(`${o}`, () => i.push(t.decodeStream(r))), !(t.size && r.leftBytes < t.size)); o++)
            ;
        else if (Ft(e))
          for (let o = 0; ; o++) {
            if (An(r.bytes(e.length, !0), e)) {
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
const Dn = Ne.Point, ba = Dn.Fn, Du = Dn.Fn.ORDER, mr = (e) => e % 2n === 0n, it = mo.isBytes, $e = mo.concatBytes, ft = mo.equalBytes, Vu = (e) => wd(xt(e)), Ae = (...e) => xt(xt($e(...e))), Rs = Te.utils.randomSecretKey, So = Te.getPublicKey, Mu = Ne.getPublicKey, Ea = (e) => e.r < Du / 2n;
function jd(e, t, n = !1) {
  let r = Ne.Signature.fromBytes(Ne.sign(e, t, { prehash: !1 }));
  if (n && !Ea(r)) {
    const i = new Uint8Array(32);
    let s = 0;
    for (; !Ea(r); )
      if (i.set(tt.encode(s++)), r = Ne.Signature.fromBytes(Ne.sign(e, t, { prehash: !1, extraEntropy: i })), s > 4294967295)
        throw new Error("lowR counter overflow: report the error");
  }
  return r.toBytes("der");
}
const xa = Te.sign, vo = Te.utils.taggedHash, Lt = {
  ecdsa: 0,
  schnorr: 1
};
function In(e, t) {
  const n = e.length;
  if (t === Lt.ecdsa) {
    if (n === 32)
      throw new Error("Expected non-Schnorr key");
    return Dn.fromBytes(e), e;
  } else if (t === Lt.schnorr) {
    if (n !== 32)
      throw new Error("Expected 32-byte Schnorr key");
    return Te.utils.lift_x(xe(e)), e;
  } else
    throw new Error("Unknown key type");
}
function Hu(e, t) {
  const r = Te.utils.taggedHash("TapTweak", e, t), i = xe(r);
  if (i >= Du)
    throw new Error("tweak higher than curve order");
  return i;
}
function Wd(e, t = Uint8Array.of()) {
  const n = Te.utils, r = xe(e), i = Dn.BASE.multiply(r), s = mr(i.y) ? r : ba.neg(r), o = n.pointToBytes(i), a = Hu(o, t);
  return pr(ba.add(s, a), 32);
}
function Us(e, t) {
  const n = Te.utils, r = Hu(e, t), s = n.lift_x(xe(e)).add(Dn.BASE.multiply(r)), o = mr(s.y) ? 0 : 1;
  return [n.pointToBytes(s), o];
}
const Ao = xt(Dn.BASE.toBytes(!1)), kn = {
  bech32: "bc",
  pubKeyHash: 0,
  scriptHash: 5,
  wif: 128
}, vr = {
  bech32: "tb",
  pubKeyHash: 111,
  scriptHash: 196,
  wif: 239
};
function ni(e, t) {
  if (!it(e) || !it(t))
    throw new Error(`cmp: wrong type a=${typeof e} b=${typeof t}`);
  const n = Math.min(e.length, t.length);
  for (let r = 0; r < n; r++)
    if (e[r] != t[r])
      return Math.sign(e[r] - t[r]);
  return Math.sign(e.length - t.length);
}
function Fu(e) {
  const t = {};
  for (const n in e) {
    if (t[e[n]] !== void 0)
      throw new Error("duplicate key");
    t[e[n]] = n;
  }
  return t;
}
const gt = {
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
}, Gd = Fu(gt);
function Io(e = 6, t = !1) {
  return Nt({
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
function qd(e, t = 4, n = !0) {
  if (typeof e == "number")
    return e;
  if (it(e))
    try {
      const r = Io(t, n).decode(e);
      return r > Number.MAX_SAFE_INTEGER ? void 0 : Number(r);
    } catch {
      return;
    }
}
const z = Nt({
  encodeStream: (e, t) => {
    for (let n of t) {
      if (typeof n == "string") {
        if (gt[n] === void 0)
          throw new Error(`Unknown opcode=${n}`);
        e.byte(gt[n]);
        continue;
      } else if (typeof n == "number") {
        if (n === 0) {
          e.byte(0);
          continue;
        } else if (1 <= n && n <= 16) {
          e.byte(gt.OP_1 - 1 + n);
          continue;
        }
      }
      if (typeof n == "number" && (n = Io().encode(BigInt(n))), !it(n))
        throw new Error(`Wrong Script OP=${n} (${typeof n})`);
      const r = n.length;
      r < gt.PUSHDATA1 ? e.byte(r) : r <= 255 ? (e.byte(gt.PUSHDATA1), e.byte(r)) : r <= 65535 ? (e.byte(gt.PUSHDATA2), e.bytes(ma.encode(r))) : (e.byte(gt.PUSHDATA4), e.bytes(tt.encode(r))), e.bytes(n);
    }
  },
  decodeStream: (e) => {
    const t = [];
    for (; !e.isEnd(); ) {
      const n = e.byte();
      if (gt.OP_0 < n && n <= gt.PUSHDATA4) {
        let r;
        if (n < gt.PUSHDATA1)
          r = n;
        else if (n === gt.PUSHDATA1)
          r = Ue.decodeStream(e);
        else if (n === gt.PUSHDATA2)
          r = ma.decodeStream(e);
        else if (n === gt.PUSHDATA4)
          r = tt.decodeStream(e);
        else
          throw new Error("Should be not possible");
        t.push(e.bytes(r));
      } else if (n === 0)
        t.push(0);
      else if (gt.OP_1 <= n && n <= gt.OP_16)
        t.push(n - (gt.OP_1 - 1));
      else {
        const r = Gd[n];
        if (r === void 0)
          throw new Error(`Unknown opcode=${n.toString(16)}`);
        t.push(r);
      }
    }
    return t;
  }
}), Ta = {
  253: [253, 2, 253n, 65535n],
  254: [254, 4, 65536n, 4294967295n],
  255: [255, 8, 4294967296n, 18446744073709551615n]
}, Ci = Nt({
  encodeStream: (e, t) => {
    if (typeof t == "number" && (t = BigInt(t)), 0n <= t && t <= 252n)
      return e.byte(Number(t));
    for (const [n, r, i, s] of Object.values(Ta))
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
    const [n, r, i] = Ta[t];
    let s = 0n;
    for (let o = 0; o < r; o++)
      s |= BigInt(e.byte()) << 8n * BigInt(o);
    if (s < i)
      throw e.err(`Wrong CompactSize(${8 * r})`);
    return s;
  }
}), Qt = Me(Ci, Li.numberBigint), Gt = ot(Ci), or = Bt(Qt, Gt), ri = (e) => Bt(Ci, e), Ku = bt({
  txid: ot(32, !0),
  // hash(prev_tx),
  index: tt,
  // output number of previous tx
  finalScriptSig: Gt,
  // btc merges input and output script, executes it. If ok = tx passes
  sequence: tt
  // ?
}), Je = bt({ amount: Dr, script: Gt }), Yd = bt({
  version: gn,
  segwitFlag: Fd(new Uint8Array([0, 1])),
  inputs: ri(Ku),
  outputs: ri(Je),
  witnesses: Kd("segwitFlag", Bt("inputs/length", or)),
  // < 500000000	Block number at which this transaction is unlocked
  // >= 500000000	UNIX timestamp at which this transaction is unlocked
  // Handled as part of PSBTv2
  lockTime: tt
});
function Zd(e) {
  if (e.segwitFlag && e.witnesses && !e.witnesses.length)
    throw new Error("Segwit flag with empty witnesses array");
  return e;
}
const mn = $t(Yd, Zd), Zn = bt({
  version: gn,
  inputs: ri(Ku),
  outputs: ri(Je),
  lockTime: tt
}), Ls = $t(ot(null), (e) => In(e, Lt.ecdsa)), ii = $t(ot(32), (e) => In(e, Lt.schnorr)), Sa = $t(ot(null), (e) => {
  if (e.length !== 64 && e.length !== 65)
    throw new Error("Schnorr signature should be 64 or 65 bytes long");
  return e;
}), Pi = bt({
  fingerprint: Vd,
  path: Bt(null, tt)
}), zu = bt({
  hashes: Bt(Qt, ot(32)),
  der: Pi
}), Xd = ot(78), Qd = bt({ pubKey: ii, leafHash: ot(32) }), Jd = bt({
  version: Ue,
  // With parity :(
  internalKey: ot(32),
  merklePath: Bt(null, ot(32))
}), ie = $t(Jd, (e) => {
  if (e.merklePath.length > 128)
    throw new Error("TaprootControlBlock: merklePath should be of length 0..128 (inclusive)");
  return e;
}), th = Bt(null, bt({
  depth: Ue,
  version: Ue,
  script: Gt
})), lt = ot(null), va = ot(20), Kn = ot(32), ko = {
  unsignedTx: [0, !1, Zn, [0], [0], !1],
  xpub: [1, Xd, Pi, [], [0, 2], !1],
  txVersion: [2, !1, tt, [2], [2], !1],
  fallbackLocktime: [3, !1, tt, [], [2], !1],
  inputCount: [4, !1, Qt, [2], [2], !1],
  outputCount: [5, !1, Qt, [2], [2], !1],
  txModifiable: [6, !1, Ue, [], [2], !1],
  // TODO: bitfield
  version: [251, !1, tt, [], [0, 2], !1],
  proprietary: [252, lt, lt, [], [0, 2], !1]
}, _i = {
  nonWitnessUtxo: [0, !1, mn, [], [0, 2], !1],
  witnessUtxo: [1, !1, Je, [], [0, 2], !1],
  partialSig: [2, Ls, lt, [], [0, 2], !1],
  sighashType: [3, !1, tt, [], [0, 2], !1],
  redeemScript: [4, !1, lt, [], [0, 2], !1],
  witnessScript: [5, !1, lt, [], [0, 2], !1],
  bip32Derivation: [6, Ls, Pi, [], [0, 2], !1],
  finalScriptSig: [7, !1, lt, [], [0, 2], !1],
  finalScriptWitness: [8, !1, or, [], [0, 2], !1],
  porCommitment: [9, !1, lt, [], [0, 2], !1],
  ripemd160: [10, va, lt, [], [0, 2], !1],
  sha256: [11, Kn, lt, [], [0, 2], !1],
  hash160: [12, va, lt, [], [0, 2], !1],
  hash256: [13, Kn, lt, [], [0, 2], !1],
  txid: [14, !1, Kn, [2], [2], !0],
  index: [15, !1, tt, [2], [2], !0],
  sequence: [16, !1, tt, [], [2], !0],
  requiredTimeLocktime: [17, !1, tt, [], [2], !1],
  requiredHeightLocktime: [18, !1, tt, [], [2], !1],
  tapKeySig: [19, !1, Sa, [], [0, 2], !1],
  tapScriptSig: [20, Qd, Sa, [], [0, 2], !1],
  tapLeafScript: [21, ie, lt, [], [0, 2], !1],
  tapBip32Derivation: [22, Kn, zu, [], [0, 2], !1],
  tapInternalKey: [23, !1, ii, [], [0, 2], !1],
  tapMerkleRoot: [24, !1, Kn, [], [0, 2], !1],
  proprietary: [252, lt, lt, [], [0, 2], !1]
}, eh = [
  "txid",
  "sequence",
  "index",
  "witnessUtxo",
  "nonWitnessUtxo",
  "finalScriptSig",
  "finalScriptWitness",
  "unknown"
], nh = [
  "partialSig",
  "finalScriptSig",
  "finalScriptWitness",
  "tapKeySig",
  "tapScriptSig"
], ar = {
  redeemScript: [0, !1, lt, [], [0, 2], !1],
  witnessScript: [1, !1, lt, [], [0, 2], !1],
  bip32Derivation: [2, Ls, Pi, [], [0, 2], !1],
  amount: [3, !1, _d, [2], [2], !0],
  script: [4, !1, lt, [2], [2], !0],
  tapInternalKey: [5, !1, ii, [], [0, 2], !1],
  tapTree: [6, !1, th, [], [0, 2], !1],
  tapBip32Derivation: [7, ii, zu, [], [0, 2], !1],
  proprietary: [252, lt, lt, [], [0, 2], !1]
}, rh = [], Aa = Bt(Nu, bt({
  //  <key> := <keylen> <keytype> <keydata> WHERE keylen = len(keytype)+len(keydata)
  key: Md(Qt, bt({ type: Qt, key: ot(null) })),
  //  <value> := <valuelen> <valuedata>
  value: ot(Qt)
}));
function Cs(e) {
  const [t, n, r, i, s, o] = e;
  return { type: t, kc: n, vc: r, reqInc: i, allowInc: s, silentIgnore: o };
}
bt({ type: Qt, key: ot(null) });
function Oo(e) {
  const t = {};
  for (const n in e) {
    const [r, i, s] = e[n];
    t[r] = [n, i, s];
  }
  return Nt({
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
          l.sort((f, h) => ni(f[0], h[0]));
          for (const [f, h] of l)
            i.push({ key: { key: f, type: a }, value: h });
        }
      }
      if (r.unknown) {
        r.unknown.sort((s, o) => ni(s[0].key, o[0].key));
        for (const [s, o] of r.unknown)
          i.push({ key: s, value: o });
      }
      Aa.encodeStream(n, i);
    },
    decodeStream: (n) => {
      const r = Aa.decodeStream(n), i = {}, s = {};
      for (const o of r) {
        let a = "unknown", c = o.key.key, u = o.value;
        if (t[o.key.type]) {
          const [l, f, h] = t[o.key.type];
          if (a = l, !f && c.length)
            throw new Error(`PSBT: Non-empty key for ${a} (key=${$.encode(c)} value=${$.encode(u)}`);
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
const Bo = $t(Oo(_i), (e) => {
  if (e.finalScriptWitness && !e.finalScriptWitness.length)
    throw new Error("validateInput: empty finalScriptWitness");
  if (e.partialSig && !e.partialSig.length)
    throw new Error("Empty partialSig");
  if (e.partialSig)
    for (const [t] of e.partialSig)
      In(t, Lt.ecdsa);
  if (e.bip32Derivation)
    for (const [t] of e.bip32Derivation)
      In(t, Lt.ecdsa);
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
}), $o = $t(Oo(ar), (e) => {
  if (e.bip32Derivation)
    for (const [t] of e.bip32Derivation)
      In(t, Lt.ecdsa);
  return e;
}), ju = $t(Oo(ko), (e) => {
  if ((e.version || 0) === 0) {
    if (!e.unsignedTx)
      throw new Error("PSBTv0: missing unsignedTx");
    for (const n of e.unsignedTx.inputs)
      if (n.finalScriptSig && n.finalScriptSig.length)
        throw new Error("PSBTv0: input scriptSig found in unsignedTx");
  }
  return e;
}), ih = bt({
  magic: To(xo(new Uint8Array([255])), "psbt"),
  global: ju,
  inputs: Bt("global/unsignedTx/inputs/length", Bo),
  outputs: Bt(null, $o)
}), sh = bt({
  magic: To(xo(new Uint8Array([255])), "psbt"),
  global: ju,
  inputs: Bt("global/inputCount", Bo),
  outputs: Bt("global/outputCount", $o)
});
bt({
  magic: To(xo(new Uint8Array([255])), "psbt"),
  items: Bt(null, Me(Bt(Nu, zd([Hd(Qt), ot(Ci)])), Li.dict()))
});
function es(e, t, n) {
  for (const r in n) {
    if (r === "unknown" || !t[r])
      continue;
    const { allowInc: i } = Cs(t[r]);
    if (!i.includes(e))
      throw new Error(`PSBTv${e}: field ${r} is not allowed`);
  }
  for (const r in t) {
    const { reqInc: i } = Cs(t[r]);
    if (i.includes(e) && n[r] === void 0)
      throw new Error(`PSBTv${e}: missing required field ${r}`);
  }
}
function Ia(e, t, n) {
  const r = {};
  for (const i in n) {
    const s = i;
    if (s !== "unknown") {
      if (!t[s])
        continue;
      const { allowInc: o, silentIgnore: a } = Cs(t[s]);
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
function Wu(e) {
  const t = e && e.global && e.global.version || 0;
  es(t, ko, e.global);
  for (const o of e.inputs)
    es(t, _i, o);
  for (const o of e.outputs)
    es(t, ar, o);
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
function Ps(e, t, n, r, i) {
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
            typeof g[0] == "string" ? u.decode($.decode(g[0])) : g[0],
            typeof g[1] == "string" ? l.decode($.decode(g[1])) : g[1]
          ];
        });
        const y = {}, d = (g, m, S) => {
          if (y[g] === void 0) {
            y[g] = [m, S];
            return;
          }
          const k = $.encode(l.encode(y[g][1])), R = $.encode(l.encode(S));
          if (k !== R)
            throw new Error(`keyMap(${a}): same key=${g} oldVal=${k} newVal=${R}`);
        };
        for (const [g, m] of h) {
          const S = $.encode(u.encode(g));
          d(S, g, m);
        }
        for (const [g, m] of p) {
          const S = $.encode(u.encode(g));
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
      s[o] = l.decode($.decode(s[o]));
    else if (f && o in t && n && n[o] !== void 0 && !ft(l.encode(t[o]), l.encode(n[o])))
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
const ka = $t(ih, Wu), Oa = $t(sh, Wu), oh = {
  encode(e) {
    if (!(e.length !== 2 || e[0] !== 1 || !it(e[1]) || $.encode(e[1]) !== "4e73"))
      return { type: "p2a", script: z.encode(e) };
  },
  decode: (e) => {
    if (e.type === "p2a")
      return [1, $.decode("4e73")];
  }
};
function yn(e, t) {
  try {
    return In(e, t), !0;
  } catch {
    return !1;
  }
}
const ah = {
  encode(e) {
    if (!(e.length !== 2 || !it(e[0]) || !yn(e[0], Lt.ecdsa) || e[1] !== "CHECKSIG"))
      return { type: "pk", pubkey: e[0] };
  },
  decode: (e) => e.type === "pk" ? [e.pubkey, "CHECKSIG"] : void 0
}, ch = {
  encode(e) {
    if (!(e.length !== 5 || e[0] !== "DUP" || e[1] !== "HASH160" || !it(e[2])) && !(e[3] !== "EQUALVERIFY" || e[4] !== "CHECKSIG"))
      return { type: "pkh", hash: e[2] };
  },
  decode: (e) => e.type === "pkh" ? ["DUP", "HASH160", e.hash, "EQUALVERIFY", "CHECKSIG"] : void 0
}, uh = {
  encode(e) {
    if (!(e.length !== 3 || e[0] !== "HASH160" || !it(e[1]) || e[2] !== "EQUAL"))
      return { type: "sh", hash: e[1] };
  },
  decode: (e) => e.type === "sh" ? ["HASH160", e.hash, "EQUAL"] : void 0
}, lh = {
  encode(e) {
    if (!(e.length !== 2 || e[0] !== 0 || !it(e[1])) && e[1].length === 32)
      return { type: "wsh", hash: e[1] };
  },
  decode: (e) => e.type === "wsh" ? [0, e.hash] : void 0
}, fh = {
  encode(e) {
    if (!(e.length !== 2 || e[0] !== 0 || !it(e[1])) && e[1].length === 20)
      return { type: "wpkh", hash: e[1] };
  },
  decode: (e) => e.type === "wpkh" ? [0, e.hash] : void 0
}, dh = {
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
}, hh = {
  encode(e) {
    if (!(e.length !== 2 || e[0] !== 1 || !it(e[1])))
      return { type: "tr", pubkey: e[1] };
  },
  decode: (e) => e.type === "tr" ? [1, e.pubkey] : void 0
}, ph = {
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
}, gh = {
  encode(e) {
    const t = e.length - 1;
    if (e[t] !== "NUMEQUAL" || e[1] !== "CHECKSIG")
      return;
    const n = [], r = qd(e[t - 1]);
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
}, yh = {
  encode(e) {
    return { type: "unknown", script: z.encode(e) };
  },
  decode: (e) => e.type === "unknown" ? z.decode(e.script) : void 0
}, wh = [
  oh,
  ah,
  ch,
  uh,
  lh,
  fh,
  dh,
  hh,
  ph,
  gh,
  yh
], mh = Me(z, Li.match(wh)), ht = $t(mh, (e) => {
  if (e.type === "pk" && !yn(e.pubkey, Lt.ecdsa))
    throw new Error("OutScript/pk: wrong key");
  if ((e.type === "pkh" || e.type === "sh" || e.type === "wpkh") && (!it(e.hash) || e.hash.length !== 20))
    throw new Error(`OutScript/${e.type}: wrong hash`);
  if (e.type === "wsh" && (!it(e.hash) || e.hash.length !== 32))
    throw new Error("OutScript/wsh: wrong hash");
  if (e.type === "tr" && (!it(e.pubkey) || !yn(e.pubkey, Lt.schnorr)))
    throw new Error("OutScript/tr: wrong taproot public key");
  if ((e.type === "ms" || e.type === "tr_ns" || e.type === "tr_ms") && !Array.isArray(e.pubkeys))
    throw new Error("OutScript/multisig: wrong pubkeys array");
  if (e.type === "ms") {
    const t = e.pubkeys.length;
    for (const n of e.pubkeys)
      if (!yn(n, Lt.ecdsa))
        throw new Error("OutScript/multisig: wrong pubkey");
    if (e.m <= 0 || t > 16 || e.m > t)
      throw new Error("OutScript/multisig: invalid params");
  }
  if (e.type === "tr_ns" || e.type === "tr_ms") {
    for (const t of e.pubkeys)
      if (!yn(t, Lt.schnorr))
        throw new Error(`OutScript/${e.type}: wrong pubkey`);
  }
  if (e.type === "tr_ms") {
    const t = e.pubkeys.length;
    if (e.m <= 0 || t > 999 || e.m > t)
      throw new Error("OutScript/tr_ms: invalid params");
  }
  return e;
});
function Ba(e, t) {
  if (!ft(e.hash, xt(t)))
    throw new Error("checkScript: wsh wrong witnessScript hash");
  const n = ht.decode(t);
  if (n.type === "tr" || n.type === "tr_ns" || n.type === "tr_ms")
    throw new Error(`checkScript: P2${n.type} cannot be wrapped in P2SH`);
  if (n.type === "wpkh" || n.type === "sh")
    throw new Error(`checkScript: P2${n.type} cannot be wrapped in P2WSH`);
}
function Gu(e, t, n) {
  if (e) {
    const r = ht.decode(e);
    if (r.type === "tr_ns" || r.type === "tr_ms" || r.type === "ms" || r.type == "pk")
      throw new Error(`checkScript: non-wrapped ${r.type}`);
    if (r.type === "sh" && t) {
      if (!ft(r.hash, Vu(t)))
        throw new Error("checkScript: sh wrong redeemScript hash");
      const i = ht.decode(t);
      if (i.type === "tr" || i.type === "tr_ns" || i.type === "tr_ms")
        throw new Error(`checkScript: P2${i.type} cannot be wrapped in P2SH`);
      if (i.type === "sh")
        throw new Error("checkScript: P2SH cannot be wrapped in P2SH");
    }
    r.type === "wsh" && n && Ba(r, n);
  }
  if (t) {
    const r = ht.decode(t);
    r.type === "wsh" && n && Ba(r, n);
  }
}
function bh(e) {
  const t = {};
  for (const n of e) {
    const r = $.encode(n);
    if (t[r])
      throw new Error(`Multisig: non-uniq pubkey: ${e.map($.encode)}`);
    t[r] = !0;
  }
}
function Eh(e, t, n = !1, r) {
  const i = ht.decode(e);
  if (i.type === "unknown" && n)
    return;
  if (!["tr_ns", "tr_ms"].includes(i.type))
    throw new Error(`P2TR: invalid leaf script=${i.type}`);
  const s = i;
  if (!n && s.pubkeys)
    for (const o of s.pubkeys) {
      if (ft(o, Ao))
        throw new Error("Unspendable taproot key in leaf script");
      if (ft(o, t))
        throw new Error("Using P2TR with leaf script with same key as internal key is not supported");
    }
}
function qu(e) {
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
function _s(e, t = []) {
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
    left: _s(e.left, [e.right.hash, ...t]),
    right: _s(e.right, [e.left.hash, ...t])
  };
}
function Ds(e) {
  if (!e)
    throw new Error("taprootAddPath: empty tree");
  if (e.type === "leaf")
    return [e];
  if (e.type !== "branch")
    throw new Error(`taprootWalkTree: wrong type=${e}`);
  return [...Ds(e.left), ...Ds(e.right)];
}
function Vs(e, t, n = !1, r) {
  if (!e)
    throw new Error("taprootHashTree: empty tree");
  if (Array.isArray(e) && e.length === 1 && (e = e[0]), !Array.isArray(e)) {
    const { leafVersion: c, script: u } = e;
    if (e.tapLeafScript || e.tapMerkleRoot && !ft(e.tapMerkleRoot, ct))
      throw new Error("P2TR: tapRoot leafScript cannot have tree");
    const l = typeof u == "string" ? $.decode(u) : u;
    if (!it(l))
      throw new Error(`checkScript: wrong script type=${l}`);
    return Eh(l, t, n), {
      type: "leaf",
      version: c,
      script: l,
      hash: Qn(l, c)
    };
  }
  if (e.length !== 2 && (e = qu(e)), e.length !== 2)
    throw new Error("hashTree: non binary tree!");
  const i = Vs(e[0], t, n), s = Vs(e[1], t, n);
  let [o, a] = [i.hash, s.hash];
  return ni(a, o) === -1 && ([o, a] = [a, o]), { type: "branch", left: i, right: s, hash: vo("TapBranch", o, a) };
}
const cr = 192, Qn = (e, t = cr) => vo("TapLeaf", new Uint8Array([t]), Gt.encode(e));
function xh(e, t, n = kn, r = !1, i) {
  if (!e && !t)
    throw new Error("p2tr: should have pubKey or scriptTree (or both)");
  const s = typeof e == "string" ? $.decode(e) : e || Ao;
  if (!yn(s, Lt.schnorr))
    throw new Error("p2tr: non-schnorr pubkey");
  if (t) {
    let o = _s(Vs(t, s, r));
    const a = o.hash, [c, u] = Us(s, a), l = Ds(o).map((f) => ({
      ...f,
      controlBlock: ie.encode({
        version: (f.version || cr) + u,
        internalKey: s,
        merklePath: f.path
      })
    }));
    return {
      type: "tr",
      script: ht.encode({ type: "tr", pubkey: c }),
      address: on(n).encode({ type: "tr", pubkey: c }),
      // For tests
      tweakedPubkey: c,
      // PSBT stuff
      tapInternalKey: s,
      leaves: l,
      tapLeafScript: l.map((f) => [
        ie.decode(f.controlBlock),
        $e(f.script, new Uint8Array([f.version || cr]))
      ]),
      tapMerkleRoot: a
    };
  } else {
    const o = Us(s, ct)[0];
    return {
      type: "tr",
      script: ht.encode({ type: "tr", pubkey: o }),
      address: on(n).encode({ type: "tr", pubkey: o }),
      // For tests
      tweakedPubkey: o,
      // PSBT stuff
      tapInternalKey: s
    };
  }
}
function Th(e, t, n = !1) {
  return n || bh(t), {
    type: "tr_ms",
    script: ht.encode({ type: "tr_ms", pubkeys: t, m: e })
  };
}
const Yu = Ad(xt);
function Zu(e, t) {
  if (t.length < 2 || t.length > 40)
    throw new Error("Witness: invalid length");
  if (e > 16)
    throw new Error("Witness: invalid version");
  if (e === 0 && !(t.length === 20 || t.length === 32))
    throw new Error("Witness: invalid length for version");
}
function ns(e, t, n = kn) {
  Zu(e, t);
  const r = e === 0 ? $s : pn;
  return r.encode(n.bech32, [e].concat(r.toWords(t)));
}
function $a(e, t) {
  return Yu.encode($e(Uint8Array.from(t), e));
}
function on(e = kn) {
  return {
    encode(t) {
      const { type: n } = t;
      if (n === "wpkh")
        return ns(0, t.hash, e);
      if (n === "wsh")
        return ns(0, t.hash, e);
      if (n === "tr")
        return ns(1, t.pubkey, e);
      if (n === "pkh")
        return $a(t.hash, [e.pubKeyHash]);
      if (n === "sh")
        return $a(t.hash, [e.scriptHash]);
      throw new Error(`Unknown address type=${n}`);
    },
    decode(t) {
      if (t.length < 14 || t.length > 74)
        throw new Error("Invalid address length");
      if (e.bech32 && t.toLowerCase().startsWith(`${e.bech32}1`)) {
        let r;
        try {
          if (r = $s.decode(t), r.words[0] !== 0)
            throw new Error(`bech32: wrong version=${r.words[0]}`);
        } catch {
          if (r = pn.decode(t), r.words[0] === 0)
            throw new Error(`bech32m: wrong version=${r.words[0]}`);
        }
        if (r.prefix !== e.bech32)
          throw new Error(`wrong bech32 prefix=${r.prefix}`);
        const [i, ...s] = r.words, o = $s.fromWords(s);
        if (Zu(i, o), i === 0 && o.length === 32)
          return { type: "wsh", hash: o };
        if (i === 0 && o.length === 20)
          return { type: "wpkh", hash: o };
        if (i === 1 && o.length === 32)
          return { type: "tr", pubkey: o };
        throw new Error("Unknown witness program");
      }
      const n = Yu.decode(t);
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
const Ar = new Uint8Array(32), Sh = {
  amount: 0xffffffffffffffffn,
  script: ct
}, vh = (e) => Math.ceil(e / 4), Ah = 8, Ih = 2, Ge = 0, No = 4294967295;
Li.decimal(Ah);
const Jn = (e, t) => e === void 0 ? t : e;
function si(e) {
  if (Array.isArray(e))
    return e.map((t) => si(t));
  if (it(e))
    return Uint8Array.from(e);
  if (["number", "bigint", "boolean", "string", "undefined"].includes(typeof e))
    return e;
  if (e === null)
    return e;
  if (typeof e == "object")
    return Object.fromEntries(Object.entries(e).map(([t, n]) => [t, si(n)]));
  throw new Error(`cloneDeep: unknown type=${e} (${typeof e})`);
}
const Z = {
  DEFAULT: 0,
  ALL: 1,
  NONE: 2,
  SINGLE: 3,
  ANYONECANPAY: 128
}, an = {
  DEFAULT: Z.DEFAULT,
  ALL: Z.ALL,
  NONE: Z.NONE,
  SINGLE: Z.SINGLE,
  DEFAULT_ANYONECANPAY: Z.DEFAULT | Z.ANYONECANPAY,
  ALL_ANYONECANPAY: Z.ALL | Z.ANYONECANPAY,
  NONE_ANYONECANPAY: Z.NONE | Z.ANYONECANPAY,
  SINGLE_ANYONECANPAY: Z.SINGLE | Z.ANYONECANPAY
}, kh = Fu(an);
function Oh(e, t, n, r = ct) {
  return ft(n, t) && (e = Wd(e, r), t = So(e)), { privKey: e, pubKey: t };
}
function qe(e) {
  if (e.script === void 0 || e.amount === void 0)
    throw new Error("Transaction/output: script and amount required");
  return { script: e.script, amount: e.amount };
}
function zn(e) {
  if (e.txid === void 0 || e.index === void 0)
    throw new Error("Transaction/input: txid and index required");
  return {
    txid: e.txid,
    index: e.index,
    sequence: Jn(e.sequence, No),
    finalScriptSig: Jn(e.finalScriptSig, ct)
  };
}
function rs(e) {
  for (const t in e) {
    const n = t;
    eh.includes(n) || delete e[n];
  }
}
const is = bt({ txid: ot(32, !0), index: tt });
function Bh(e) {
  if (typeof e != "number" || typeof kh[e] != "string")
    throw new Error(`Invalid SigHash=${e}`);
  return e;
}
function Na(e) {
  const t = e & 31;
  return {
    isAny: !!(e & Z.ANYONECANPAY),
    isNone: t === Z.NONE,
    isSingle: t === Z.SINGLE
  };
}
function $h(e) {
  if (e !== void 0 && {}.toString.call(e) !== "[object Object]")
    throw new Error(`Wrong object type for transaction options: ${e}`);
  const t = {
    ...e,
    // Defaults
    version: Jn(e.version, Ih),
    lockTime: Jn(e.lockTime, 0),
    PSBTVersion: Jn(e.PSBTVersion, 0)
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
function Ra(e) {
  if (e.nonWitnessUtxo && e.index !== void 0) {
    const t = e.nonWitnessUtxo.outputs.length - 1;
    if (e.index > t)
      throw new Error(`validateInput: index(${e.index}) not in nonWitnessUtxo`);
    const n = e.nonWitnessUtxo.outputs[e.index];
    if (e.witnessUtxo && (!ft(e.witnessUtxo.script, n.script) || e.witnessUtxo.amount !== n.amount))
      throw new Error("validateInput: witnessUtxo different from nonWitnessUtxo");
    if (e.txid) {
      if (e.nonWitnessUtxo.outputs.length - 1 < e.index)
        throw new Error("nonWitnessUtxo: incorect output index");
      const i = qt.fromRaw(mn.encode(e.nonWitnessUtxo), {
        allowUnknownOutputs: !0,
        disableScriptCheck: !0,
        allowUnknownInputs: !0
      }), s = $.encode(e.txid);
      if (i.isFinal && i.id !== s)
        throw new Error(`nonWitnessUtxo: wrong txid, exp=${s} got=${i.id}`);
    }
  }
  return e;
}
function Vr(e) {
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
function Ua(e, t, n, r = !1, i = !1) {
  let { nonWitnessUtxo: s, txid: o } = e;
  typeof s == "string" && (s = $.decode(s)), it(s) && (s = mn.decode(s)), !("nonWitnessUtxo" in e) && s === void 0 && (s = t?.nonWitnessUtxo), typeof o == "string" && (o = $.decode(o)), o === void 0 && (o = t?.txid);
  let a = { ...t, ...e, nonWitnessUtxo: s, txid: o };
  !("nonWitnessUtxo" in e) && a.nonWitnessUtxo === void 0 && delete a.nonWitnessUtxo, a.sequence === void 0 && (a.sequence = No), a.tapMerkleRoot === null && delete a.tapMerkleRoot, a = Ps(_i, a, t, n, i), Bo.encode(a);
  let c;
  return a.nonWitnessUtxo && a.index !== void 0 ? c = a.nonWitnessUtxo.outputs[a.index] : a.witnessUtxo && (c = a.witnessUtxo), c && !r && Gu(c && c.script, a.redeemScript, a.witnessScript), a;
}
function La(e, t = !1) {
  let n = "legacy", r = Z.ALL;
  const i = Vr(e), s = ht.decode(i.script);
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
let qt = class Mr {
  global = {};
  inputs = [];
  // use getInput()
  outputs = [];
  // use getOutput()
  opts;
  constructor(t = {}) {
    const n = this.opts = $h(t);
    n.lockTime !== Ge && (this.global.fallbackLocktime = n.lockTime), this.global.txVersion = n.version;
  }
  // Import
  static fromRaw(t, n = {}) {
    const r = mn.decode(t), i = new Mr({ ...n, version: r.version, lockTime: r.lockTime });
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
      r = ka.decode(t);
    } catch (f) {
      try {
        r = Oa.decode(t);
      } catch {
        throw f;
      }
    }
    const i = r.global.version || 0;
    if (i !== 0 && i !== 2)
      throw new Error(`Wrong PSBT version=${i}`);
    const s = r.global.unsignedTx, o = i === 0 ? s?.version : r.global.txVersion, a = i === 0 ? s?.lockTime : r.global.fallbackLocktime, c = new Mr({ ...n, version: o, lockTime: a, PSBTVersion: i }), u = i === 0 ? s?.inputs.length : r.global.inputCount;
    c.inputs = r.inputs.slice(0, u).map((f, h) => Ra({
      finalScriptSig: ct,
      ...r.global.unsignedTx?.inputs[h],
      ...f
    }));
    const l = i === 0 ? s?.outputs.length : r.global.outputCount;
    return c.outputs = r.outputs.slice(0, l).map((f, h) => ({
      ...f,
      ...r.global.unsignedTx?.outputs[h]
    })), c.global = { ...r.global, txVersion: o }, a !== Ge && (c.global.fallbackLocktime = a), c;
  }
  toPSBT(t = this.opts.PSBTVersion) {
    if (t !== 0 && t !== 2)
      throw new Error(`Wrong PSBT version=${t}`);
    const n = this.inputs.map((s) => Ra(Ia(t, _i, s)));
    for (const s of n)
      s.partialSig && !s.partialSig.length && delete s.partialSig, s.finalScriptSig && !s.finalScriptSig.length && delete s.finalScriptSig, s.finalScriptWitness && !s.finalScriptWitness.length && delete s.finalScriptWitness;
    const r = this.outputs.map((s) => Ia(t, ar, s)), i = { ...this.global };
    return t === 0 ? (i.unsignedTx = Zn.decode(Zn.encode({
      version: this.version,
      lockTime: this.lockTime,
      inputs: this.inputs.map(zn).map((s) => ({
        ...s,
        finalScriptSig: ct
      })),
      outputs: this.outputs.map(qe)
    })), delete i.fallbackLocktime, delete i.txVersion) : (i.version = t, i.txVersion = this.version, i.inputCount = this.inputs.length, i.outputCount = this.outputs.length, i.fallbackLocktime && i.fallbackLocktime === Ge && delete i.fallbackLocktime), this.opts.bip174jsCompat && (n.length || n.push({}), r.length || r.push({})), (t === 0 ? ka : Oa).encode({
      global: i,
      inputs: n,
      outputs: r
    });
  }
  // BIP370 lockTime (https://github.com/bitcoin/bips/blob/master/bip-0370.mediawiki#determining-lock-time)
  get lockTime() {
    let t = Ge, n = 0, r = Ge, i = 0;
    for (const s of this.inputs)
      s.requiredHeightLocktime && (t = Math.max(t, s.requiredHeightLocktime), n++), s.requiredTimeLocktime && (r = Math.max(r, s.requiredTimeLocktime), i++);
    return n && n >= i ? t : r !== Ge ? r : this.global.fallbackLocktime || Ge;
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
    const n = this.outputs.map(qe);
    t += 4 * Qt.encode(this.outputs.length).length;
    for (const r of n)
      t += 32 + 4 * Gt.encode(r.script).length;
    this.hasWitnesses && (t += 2), t += 4 * Qt.encode(this.inputs.length).length;
    for (const r of this.inputs)
      t += 160 + 4 * Gt.encode(r.finalScriptSig || ct).length, this.hasWitnesses && r.finalScriptWitness && (t += or.encode(r.finalScriptWitness).length);
    return t;
  }
  get vsize() {
    return vh(this.weight);
  }
  toBytes(t = !1, n = !1) {
    return mn.encode({
      version: this.version,
      lockTime: this.lockTime,
      inputs: this.inputs.map(zn).map((r) => ({
        ...r,
        finalScriptSig: t && r.finalScriptSig || ct
      })),
      outputs: this.outputs.map(qe),
      witnesses: this.inputs.map((r) => r.finalScriptWitness || []),
      segwitFlag: n && this.hasWitnesses
    });
  }
  get unsignedTx() {
    return this.toBytes(!1, !1);
  }
  get hex() {
    return $.encode(this.toBytes(!0, this.hasWitnesses));
  }
  get hash() {
    return $.encode(Ae(this.toBytes(!0)));
  }
  get id() {
    return $.encode(Ae(this.toBytes(!0)).reverse());
  }
  // Input stuff
  checkInputIdx(t) {
    if (!Number.isSafeInteger(t) || 0 > t || t >= this.inputs.length)
      throw new Error(`Wrong input index=${t}`);
  }
  getInput(t) {
    return this.checkInputIdx(t), si(this.inputs[t]);
  }
  get inputsLength() {
    return this.inputs.length;
  }
  // Modification
  addInput(t, n = !1) {
    if (!n && !this.signStatus().addInput)
      throw new Error("Tx has signed inputs, cannot add new one");
    return this.inputs.push(Ua(t, void 0, void 0, this.opts.disableScriptCheck)), this.inputs.length - 1;
  }
  updateInput(t, n, r = !1) {
    this.checkInputIdx(t);
    let i;
    if (!r) {
      const s = this.signStatus();
      (!s.addInput || s.inputs.includes(t)) && (i = nh);
    }
    this.inputs[t] = Ua(n, this.inputs[t], i, this.opts.disableScriptCheck, this.opts.allowUnknown);
  }
  // Output stuff
  checkOutputIdx(t) {
    if (!Number.isSafeInteger(t) || 0 > t || t >= this.outputs.length)
      throw new Error(`Wrong output index=${t}`);
  }
  getOutput(t) {
    return this.checkOutputIdx(t), si(this.outputs[t]);
  }
  getOutputAddress(t, n = kn) {
    const r = this.getOutput(t);
    if (r.script)
      return on(n).encode(ht.decode(r.script));
  }
  get outputsLength() {
    return this.outputs.length;
  }
  normalizeOutput(t, n, r) {
    let { amount: i, script: s } = t;
    if (i === void 0 && (i = n?.amount), typeof i != "bigint")
      throw new Error(`Wrong amount type, should be of type bigint in sats, but got ${i} of type ${typeof i}`);
    typeof s == "string" && (s = $.decode(s)), s === void 0 && (s = n?.script);
    let o = { ...n, ...t, amount: i, script: s };
    if (o.amount === void 0 && delete o.amount, o = Ps(ar, o, n, r, this.opts.allowUnknown), $o.encode(o), o.script && !this.opts.allowUnknownOutputs && ht.decode(o.script).type === "unknown")
      throw new Error("Transaction/output: unknown output script type, there is a chance that input is unspendable. Pass allowUnknownOutputs=true, if you sure");
    return this.opts.disableScriptCheck || Gu(o.script, o.redeemScript, o.witnessScript), o;
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
      (!s.addOutput || s.outputs.includes(t)) && (i = rh);
    }
    this.outputs[t] = this.normalizeOutput(n, this.outputs[t], i);
  }
  addOutputAddress(t, n, r = kn) {
    return this.addOutput({ script: ht.encode(on(r).decode(t)), amount: n });
  }
  // Utils
  get fee() {
    let t = 0n;
    for (const r of this.inputs) {
      const i = Vr(r);
      if (!i)
        throw new Error("Empty input amount");
      t += i.amount;
    }
    const n = this.outputs.map(qe);
    for (const r of n)
      t -= r.amount;
    return t;
  }
  // Signing
  // Based on https://github.com/bitcoin/bitcoin/blob/5871b5b5ab57a0caf9b7514eb162c491c83281d5/test/functional/test_framework/script.py#L624
  // There is optimization opportunity to re-use hashes for multiple inputs for witness v0/v1,
  // but we are trying to be less complicated for audit purpose for now.
  preimageLegacy(t, n, r) {
    const { isAny: i, isNone: s, isSingle: o } = Na(r);
    if (t < 0 || !Number.isSafeInteger(t))
      throw new Error(`Invalid input idx=${t}`);
    if (o && t >= this.outputs.length || t >= this.inputs.length)
      return Pu.encode(1n);
    n = z.encode(z.decode(n).filter((l) => l !== "CODESEPARATOR"));
    let a = this.inputs.map(zn).map((l, f) => ({
      ...l,
      finalScriptSig: f === t ? n : ct
    }));
    i ? a = [a[t]] : (s || o) && (a = a.map((l, f) => ({
      ...l,
      sequence: f === t ? l.sequence : 0
    })));
    let c = this.outputs.map(qe);
    s ? c = [] : o && (c = c.slice(0, t).fill(Sh).concat([c[t]]));
    const u = mn.encode({
      lockTime: this.lockTime,
      version: this.version,
      segwitFlag: !1,
      inputs: a,
      outputs: c
    });
    return Ae(u, gn.encode(r));
  }
  preimageWitnessV0(t, n, r, i) {
    const { isAny: s, isNone: o, isSingle: a } = Na(r);
    let c = Ar, u = Ar, l = Ar;
    const f = this.inputs.map(zn), h = this.outputs.map(qe);
    s || (c = Ae(...f.map(is.encode))), !s && !a && !o && (u = Ae(...f.map((y) => tt.encode(y.sequence)))), !a && !o ? l = Ae(...h.map(Je.encode)) : a && t < h.length && (l = Ae(Je.encode(h[t])));
    const p = f[t];
    return Ae(gn.encode(this.version), c, u, ot(32, !0).encode(p.txid), tt.encode(p.index), Gt.encode(n), Dr.encode(i), tt.encode(p.sequence), l, tt.encode(this.lockTime), tt.encode(r));
  }
  preimageWitnessV1(t, n, r, i, s = -1, o, a = 192, c) {
    if (!Array.isArray(i) || this.inputs.length !== i.length)
      throw new Error(`Invalid amounts array=${i}`);
    if (!Array.isArray(n) || this.inputs.length !== n.length)
      throw new Error(`Invalid prevOutScript array=${n}`);
    const u = [
      Ue.encode(0),
      Ue.encode(r),
      // U8 sigHash
      gn.encode(this.version),
      tt.encode(this.lockTime)
    ], l = r === Z.DEFAULT ? Z.ALL : r & 3, f = r & Z.ANYONECANPAY, h = this.inputs.map(zn), p = this.outputs.map(qe);
    f !== Z.ANYONECANPAY && u.push(...[
      h.map(is.encode),
      i.map(Dr.encode),
      n.map(Gt.encode),
      h.map((d) => tt.encode(d.sequence))
    ].map((d) => xt($e(...d)))), l === Z.ALL && u.push(xt($e(...p.map(Je.encode))));
    const y = (c ? 1 : 0) | (o ? 2 : 0);
    if (u.push(new Uint8Array([y])), f === Z.ANYONECANPAY) {
      const d = h[t];
      u.push(is.encode(d), Dr.encode(i[t]), Gt.encode(n[t]), tt.encode(d.sequence));
    } else
      u.push(tt.encode(t));
    return y & 1 && u.push(xt(Gt.encode(c || ct))), l === Z.SINGLE && u.push(t < p.length ? xt(Je.encode(p[t])) : Ar), o && u.push(Qn(o, a), Ue.encode(0), gn.encode(s)), vo("TapSighash", ...u);
  }
  // Signer can be privateKey OR instance of bip32 HD stuff
  signIdx(t, n, r, i) {
    this.checkInputIdx(n);
    const s = this.inputs[n], o = La(s, this.opts.allowLegacyWitnessUtxo);
    if (!it(t)) {
      if (!s.bip32Derivation || !s.bip32Derivation.length)
        throw new Error("bip32Derivation: empty");
      const l = s.bip32Derivation.filter((h) => h[1].fingerprint == t.fingerprint).map(([h, { path: p }]) => {
        let y = t;
        for (const d of p)
          y = y.deriveChild(d);
        if (!ft(y.publicKey, h))
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
    r ? r.forEach(Bh) : r = [o.defaultSighash];
    const a = o.sighash;
    if (!r.includes(a))
      throw new Error(`Input with not allowed sigHash=${a}. Allowed: ${r.join(", ")}`);
    const { sigOutputs: c } = this.inputSighash(n);
    if (c === Z.SINGLE && n >= this.outputs.length)
      throw new Error(`Input with sighash SINGLE, but there is no output with corresponding index=${n}`);
    const u = Vr(s);
    if (o.txType === "taproot") {
      const l = this.inputs.map(Vr), f = l.map((g) => g.script), h = l.map((g) => g.amount);
      let p = !1, y = So(t), d = s.tapMerkleRoot || ct;
      if (s.tapInternalKey) {
        const { pubKey: g, privKey: m } = Oh(t, y, s.tapInternalKey, d), [S] = Us(s.tapInternalKey, d);
        if (ft(S, g)) {
          const k = this.preimageWitnessV1(n, f, a, h), R = $e(xa(k, m, i), a !== Z.DEFAULT ? new Uint8Array([a]) : ct);
          this.updateInput(n, { tapKeySig: R }, !0), p = !0;
        }
      }
      if (s.tapLeafScript) {
        s.tapScriptSig = s.tapScriptSig || [];
        for (const [g, m] of s.tapLeafScript) {
          const S = m.subarray(0, -1), k = z.decode(S), R = m[m.length - 1], C = Qn(S, R);
          if (k.findIndex((L) => it(L) && ft(L, y)) === -1)
            continue;
          const T = this.preimageWitnessV1(n, f, a, h, void 0, S, R), Q = $e(xa(T, t, i), a !== Z.DEFAULT ? new Uint8Array([a]) : ct);
          this.updateInput(n, { tapScriptSig: [[{ pubKey: y, leafHash: C }, Q]] }, !0), p = !0;
        }
      }
      if (!p)
        throw new Error("No taproot scripts signed");
      return !0;
    } else {
      const l = Mu(t);
      let f = !1;
      const h = Vu(l);
      for (const d of z.decode(o.lastScript))
        it(d) && (ft(d, l) || ft(d, h)) && (f = !0);
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
      const y = jd(p, t, this.opts.lowR);
      this.updateInput(n, {
        partialSig: [[l, $e(y, new Uint8Array([a]))]]
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
    const n = this.inputs[t], r = La(n, this.opts.allowLegacyWitnessUtxo);
    if (r.txType === "taproot") {
      if (n.tapKeySig)
        n.finalScriptWitness = [n.tapKeySig];
      else if (n.tapLeafScript && n.tapScriptSig) {
        const c = n.tapLeafScript.sort((u, l) => ie.encode(u[0]).length - ie.encode(l[0]).length);
        for (const [u, l] of c) {
          const f = l.slice(0, -1), h = l[l.length - 1], p = ht.decode(f), y = Qn(f, h), d = n.tapScriptSig.filter((m) => ft(m[0].leafHash, y));
          let g = [];
          if (p.type === "tr_ms") {
            const m = p.m, S = p.pubkeys;
            let k = 0;
            for (const R of S) {
              const C = d.findIndex((W) => ft(W[0].pubKey, R));
              if (k === m || C === -1) {
                g.push(ct);
                continue;
              }
              g.push(d[C][1]), k++;
            }
            if (k !== m)
              continue;
          } else if (p.type === "tr_ns") {
            for (const m of p.pubkeys) {
              const S = d.findIndex((k) => ft(k[0].pubKey, m));
              S !== -1 && g.push(d[S][1]);
            }
            if (g.length !== p.pubkeys.length)
              continue;
          } else if (p.type === "unknown" && this.opts.allowUnknownInputs) {
            const m = z.decode(f);
            if (g = d.map(([{ pubKey: S }, k]) => {
              const R = m.findIndex((C) => it(C) && ft(C, S));
              if (R === -1)
                throw new Error("finalize/taproot: cannot find position of pubkey in script");
              return { signature: k, pos: R };
            }).sort((S, k) => S.pos - k.pos).map((S) => S.signature), !g.length)
              continue;
          } else {
            const m = this.opts.customScripts;
            if (m)
              for (const S of m) {
                if (!S.finalizeTaproot)
                  continue;
                const k = z.decode(f), R = S.encode(k);
                if (R === void 0)
                  continue;
                const C = S.finalizeTaproot(f, R, d);
                if (C) {
                  n.finalScriptWitness = C.concat(ie.encode(u)), n.finalScriptSig = ct, rs(n);
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
      n.finalScriptSig = ct, rs(n);
      return;
    }
    if (!n.partialSig || !n.partialSig.length)
      throw new Error("Not enough partial sign");
    let i = ct, s = [];
    if (r.last.type === "ms") {
      const c = r.last.m, u = r.last.pubkeys;
      let l = [];
      for (const f of u) {
        const h = n.partialSig.find((p) => ft(f, p[0]));
        h && l.push(h[1]);
      }
      if (l = l.slice(0, c), l.length !== c)
        throw new Error(`Multisig: wrong signatures count, m=${c} n=${u.length} signatures=${l.length}`);
      i = z.encode([0, ...l]);
    } else if (r.last.type === "pk")
      i = z.encode([n.partialSig[0][1]]);
    else if (r.last.type === "pkh")
      i = z.encode([n.partialSig[0][1], n.partialSig[0][0]]);
    else if (r.last.type === "wpkh")
      i = ct, s = [n.partialSig[0][1], n.partialSig[0][0]];
    else if (r.last.type === "unknown" && !this.opts.allowUnknownInputs)
      throw new Error("Unknown inputs not allowed");
    let o, a;
    if (r.type.includes("wsh-") && (i.length && r.lastScript.length && (s = z.decode(i).map((c) => {
      if (c === 0)
        return ct;
      if (it(c))
        return c;
      throw new Error(`Wrong witness op=${c}`);
    })), s = s.concat(r.lastScript)), r.txType === "segwit" && (a = s), r.type.startsWith("sh-wsh-") ? o = z.encode([z.encode([0, xt(r.lastScript)])]) : r.type.startsWith("sh-") ? o = z.encode([...z.decode(i), r.lastScript]) : r.type.startsWith("wsh-") || r.txType !== "segwit" && (o = i), !o && !a)
      throw new Error("Unknown error finalizing input");
    o && (n.finalScriptSig = o), a && (n.finalScriptWitness = a), rs(n);
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
    const n = this.global.unsignedTx ? Zn.encode(this.global.unsignedTx) : ct, r = t.global.unsignedTx ? Zn.encode(t.global.unsignedTx) : ct;
    if (!ft(n, r))
      throw new Error("Transaction/combine: different unsigned tx");
    this.global = Ps(ko, this.global, t.global, void 0, this.opts.allowUnknown);
    for (let i = 0; i < this.inputs.length; i++)
      this.updateInput(i, t.inputs[i], !0);
    for (let i = 0; i < this.outputs.length; i++)
      this.updateOutput(i, t.outputs[i], !0);
    return this;
  }
  clone() {
    return Mr.fromPSBT(this.toPSBT(this.opts.PSBTVersion), this.opts);
  }
};
class He extends qt {
  constructor(t) {
    super(ss(t));
  }
  static fromPSBT(t, n) {
    return qt.fromPSBT(t, ss(n));
  }
  static fromRaw(t, n) {
    return qt.fromRaw(t, ss(n));
  }
}
He.ARK_TX_OPTS = {
  allowUnknown: !0,
  allowUnknownOutputs: !0,
  allowUnknownInputs: !0
};
function ss(e) {
  return { ...He.ARK_TX_OPTS, ...e };
}
class Ro extends Error {
  idx;
  // Indice of participant
  constructor(t, n) {
    super(n), this.idx = t;
  }
}
const { taggedHash: Xu, pointToBytes: Ir } = Te.utils, Jt = Ne.Point, G = Jt.Fn, ce = Ne.lengths.publicKey, Ms = new Uint8Array(ce), Ca = Me(ot(33), {
  decode: (e) => ur(e) ? Ms : e.toBytes(!0),
  encode: (e) => sr(e, Ms) ? Jt.ZERO : Jt.fromBytes(e)
}), Pa = $t(Pu, (e) => (Jc("n", e, 1n, G.ORDER), e)), bn = bt({ R1: Ca, R2: Ca }), Qu = bt({ k1: Pa, k2: Pa, publicKey: ot(ce) });
function _a(e, ...t) {
}
function Ht(e, ...t) {
  if (!Array.isArray(e))
    throw new Error("expected array");
  e.forEach((n) => q(n, ...t));
}
function Da(e) {
  if (!Array.isArray(e))
    throw new Error("expected array");
  e.forEach((t, n) => {
    if (typeof t != "boolean")
      throw new Error("expected boolean in xOnly array, got" + t + "(" + n + ")");
  });
}
const oi = (e, ...t) => G.create(G.fromBytes(Xu(e, ...t), !0)), jn = (e, t) => mr(e.y) ? t : G.neg(t);
function tn(e) {
  return Jt.BASE.multiply(e);
}
function ur(e) {
  return e.equals(Jt.ZERO);
}
function Hs(e) {
  return Ht(e, ce), e.sort(ni);
}
function Ju(e) {
  Ht(e, ce);
  for (let t = 1; t < e.length; t++)
    if (!sr(e[t], e[0]))
      return e[t];
  return Ms;
}
function tl(e) {
  return Ht(e, ce), Xu("KeyAgg list", ...e);
}
function el(e, t, n) {
  return q(e, ce), q(t, ce), sr(e, t) ? 1n : oi("KeyAgg coefficient", n, e);
}
function Fs(e, t = [], n = []) {
  if (Ht(e, ce), Ht(t, 32), t.length !== n.length)
    throw new Error("The tweaks and isXonly arrays must have the same length");
  const r = Ju(e), i = tl(e);
  let s = Jt.ZERO;
  for (let c = 0; c < e.length; c++) {
    let u;
    try {
      u = Jt.fromBytes(e[c]);
    } catch {
      throw new Ro(c, "pubkey");
    }
    s = s.add(u.multiply(el(e[c], r, i)));
  }
  let o = G.ONE, a = G.ZERO;
  for (let c = 0; c < t.length; c++) {
    const u = n[c] && !mr(s.y) ? G.neg(G.ONE) : G.ONE, l = G.fromBytes(t[c]);
    if (s = s.multiply(u).add(tn(l)), ur(s))
      throw new Error("The result of tweaking cannot be infinity");
    o = G.mul(u, o), a = G.add(l, G.mul(u, a));
  }
  return { aggPublicKey: s, gAcc: o, tweakAcc: a };
}
const Va = (e, t, n, r, i, s) => oi("MuSig/nonce", e, new Uint8Array([t.length]), t, new Uint8Array([n.length]), n, i, pr(s.length, 4), s, new Uint8Array([r]));
function Nh(e, t, n = new Uint8Array(0), r, i = new Uint8Array(0), s = hr(32)) {
  if (q(e, ce), _a(t, 32), q(n), ![0, 32].includes(n.length))
    throw new Error("wrong aggPublicKey");
  _a(), q(i), q(s, 32);
  const o = Uint8Array.of(0), a = Va(s, e, n, 0, o, i), c = Va(s, e, n, 1, o, i);
  return {
    secret: Qu.encode({ k1: a, k2: c, publicKey: e }),
    public: bn.encode({ R1: tn(a), R2: tn(c) })
  };
}
function Rh(e) {
  Ht(e, 66);
  let t = Jt.ZERO, n = Jt.ZERO;
  for (let r = 0; r < e.length; r++) {
    const i = e[r];
    try {
      const { R1: s, R2: o } = bn.decode(i);
      if (ur(s) || ur(o))
        throw new Error("infinity point");
      t = t.add(s), n = n.add(o);
    } catch {
      throw new Ro(r, "pubnonce");
    }
  }
  return bn.encode({ R1: t, R2: n });
}
class Uh {
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
    if (Ht(n, 33), Ht(i, 32), Da(s), q(r), i.length !== s.length)
      throw new Error("The tweaks and isXonly arrays must have the same length");
    const { aggPublicKey: o, gAcc: a, tweakAcc: c } = Fs(n, i, s), { R1: u, R2: l } = bn.decode(t);
    this.publicKeys = n, this.Q = o, this.gAcc = a, this.tweakAcc = c, this.b = oi("MuSig/noncecoef", t, Ir(o), r);
    const f = u.add(l.multiply(this.b));
    this.R = ur(f) ? Jt.BASE : f, this.e = oi("BIP0340/challenge", Ir(this.R), Ir(o), r), this.tweaks = i, this.isXonly = s, this.L = tl(n), this.secondKey = Ju(n);
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
    return el(r, this.secondKey, this.L);
  }
  partialSigVerifyInternal(t, n, r) {
    const { Q: i, gAcc: s, b: o, R: a, e: c } = this, u = G.fromBytes(t, !0);
    if (!G.isValid(u))
      return !1;
    const { R1: l, R2: f } = bn.decode(n), h = l.add(f.multiply(o)), p = mr(a.y) ? h : h.negate(), y = Jt.fromBytes(r), d = this.getSessionKeyAggCoeff(y), g = G.mul(jn(i, 1n), s), m = tn(u), S = p.add(y.multiply(G.mul(c, G.mul(d, g))));
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
    const { Q: i, gAcc: s, b: o, R: a, e: c } = this, { k1: u, k2: l, publicKey: f } = Qu.decode(t);
    if (t.fill(0, 0, 64), !G.isValid(u))
      throw new Error("wrong k1");
    if (!G.isValid(l))
      throw new Error("wrong k1");
    const h = jn(a, u), p = jn(a, l), y = G.fromBytes(n);
    if (G.is0(y))
      throw new Error("wrong d_");
    const d = tn(y), g = d.toBytes(!0);
    if (!sr(g, f))
      throw new Error("Public key does not match nonceGen argument");
    const m = this.getSessionKeyAggCoeff(d), S = jn(i, 1n), k = G.mul(S, G.mul(s, y)), R = G.add(h, G.add(G.mul(o, p), G.mul(c, G.mul(m, k)))), C = G.toBytes(R);
    if (!r) {
      const W = bn.encode({
        R1: tn(u),
        R2: tn(l)
      });
      if (!this.partialSigVerifyInternal(C, W, g))
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
  partialSigVerify(t, n, r) {
    const { publicKeys: i, tweaks: s, isXonly: o } = this;
    if (q(t, 32), Ht(n, 66), Ht(i, ce), Ht(s, 32), Da(o), De(r), n.length !== i.length)
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
    Ht(t, 32);
    const { Q: n, tweakAcc: r, R: i, e: s } = this;
    let o = 0n;
    for (let c = 0; c < t.length; c++) {
      const u = G.fromBytes(t[c], !0);
      if (!G.isValid(u))
        throw new Ro(c, "psig");
      o = G.add(o, u);
    }
    const a = jn(n, 1n);
    return o = G.add(o, G.mul(s, G.mul(a, r))), Yt(Ir(i), G.toBytes(o));
  }
}
function Lh(e) {
  const t = Nh(e);
  return { secNonce: t.secret, pubNonce: t.public };
}
function Ch(e) {
  return Rh(e);
}
/*! noble-hashes - MIT License (c) 2022 Paul Miller (paulmillr.com) */
function Uo(e) {
  return e instanceof Uint8Array || ArrayBuffer.isView(e) && e.constructor.name === "Uint8Array";
}
function cn(e, t = "") {
  if (!Number.isSafeInteger(e) || e < 0) {
    const n = t && `"${t}" `;
    throw new Error(`${n}expected integer >0, got ${e}`);
  }
}
function rt(e, t, n = "") {
  const r = Uo(e), i = e?.length, s = t !== void 0;
  if (!r || s && i !== t) {
    const o = n && `"${n}" `, a = s ? ` of length ${t}` : "", c = r ? `length=${i}` : `type=${typeof e}`;
    throw new Error(o + "expected Uint8Array" + a + ", got " + c);
  }
  return e;
}
function nl(e) {
  if (typeof e != "function" || typeof e.create != "function")
    throw new Error("Hash must wrapped by utils.createHasher");
  cn(e.outputLen), cn(e.blockLen);
}
function ai(e, t = !0) {
  if (e.destroyed)
    throw new Error("Hash instance has been destroyed");
  if (t && e.finished)
    throw new Error("Hash#digest() has already been called");
}
function Ph(e, t) {
  rt(e, void 0, "digestInto() output");
  const n = t.outputLen;
  if (e.length < n)
    throw new Error('"digestInto() output" expected to be of length >=' + n);
}
function ci(...e) {
  for (let t = 0; t < e.length; t++)
    e[t].fill(0);
}
function os(e) {
  return new DataView(e.buffer, e.byteOffset, e.byteLength);
}
function ne(e, t) {
  return e << 32 - t | e >>> t;
}
const rl = /* @ts-ignore */ typeof Uint8Array.from([]).toHex == "function" && typeof Uint8Array.fromHex == "function", _h = /* @__PURE__ */ Array.from({ length: 256 }, (e, t) => t.toString(16).padStart(2, "0"));
function Di(e) {
  if (rt(e), rl)
    return e.toHex();
  let t = "";
  for (let n = 0; n < e.length; n++)
    t += _h[e[n]];
  return t;
}
const de = { _0: 48, _9: 57, A: 65, F: 70, a: 97, f: 102 };
function Ma(e) {
  if (e >= de._0 && e <= de._9)
    return e - de._0;
  if (e >= de.A && e <= de.F)
    return e - (de.A - 10);
  if (e >= de.a && e <= de.f)
    return e - (de.a - 10);
}
function ui(e) {
  if (typeof e != "string")
    throw new Error("hex string expected, got " + typeof e);
  if (rl)
    return Uint8Array.fromHex(e);
  const t = e.length, n = t / 2;
  if (t % 2)
    throw new Error("hex string expected, got unpadded hex of length " + t);
  const r = new Uint8Array(n);
  for (let i = 0, s = 0; i < n; i++, s += 2) {
    const o = Ma(e.charCodeAt(s)), a = Ma(e.charCodeAt(s + 1));
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
function Dh(e, t = {}) {
  const n = (i, s) => e(s).update(i).digest(), r = e(void 0);
  return n.outputLen = r.outputLen, n.blockLen = r.blockLen, n.create = (i) => e(i), Object.assign(n, t), Object.freeze(n);
}
function Vi(e = 32) {
  const t = typeof globalThis == "object" ? globalThis.crypto : null;
  if (typeof t?.getRandomValues != "function")
    throw new Error("crypto.getRandomValues must be defined");
  return t.getRandomValues(new Uint8Array(e));
}
const Vh = (e) => ({
  oid: Uint8Array.from([6, 9, 96, 134, 72, 1, 101, 3, 4, 2, e])
});
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const Lo = /* @__PURE__ */ BigInt(0), Ks = /* @__PURE__ */ BigInt(1);
function li(e, t = "") {
  if (typeof e != "boolean") {
    const n = t && `"${t}" `;
    throw new Error(n + "expected boolean, got type=" + typeof e);
  }
  return e;
}
function il(e) {
  if (typeof e == "bigint") {
    if (!Hr(e))
      throw new Error("positive bigint expected, got " + e);
  } else
    cn(e);
  return e;
}
function kr(e) {
  const t = il(e).toString(16);
  return t.length & 1 ? "0" + t : t;
}
function sl(e) {
  if (typeof e != "string")
    throw new Error("hex string expected, got " + typeof e);
  return e === "" ? Lo : BigInt("0x" + e);
}
function Vn(e) {
  return sl(Di(e));
}
function ol(e) {
  return sl(Di(Mh(rt(e)).reverse()));
}
function Co(e, t) {
  cn(t), e = il(e);
  const n = ui(e.toString(16).padStart(t * 2, "0"));
  if (n.length !== t)
    throw new Error("number too large");
  return n;
}
function al(e, t) {
  return Co(e, t).reverse();
}
function Mh(e) {
  return Uint8Array.from(e);
}
function Hh(e) {
  return Uint8Array.from(e, (t, n) => {
    const r = t.charCodeAt(0);
    if (t.length !== 1 || r > 127)
      throw new Error(`string contains non-ASCII character "${e[n]}" with code ${r} at position ${n}`);
    return r;
  });
}
const Hr = (e) => typeof e == "bigint" && Lo <= e;
function Fh(e, t, n) {
  return Hr(e) && Hr(t) && Hr(n) && t <= e && e < n;
}
function Kh(e, t, n, r) {
  if (!Fh(t, n, r))
    throw new Error("expected valid " + e + ": " + n + " <= n < " + r + ", got " + t);
}
function zh(e) {
  let t;
  for (t = 0; e > Lo; e >>= Ks, t += 1)
    ;
  return t;
}
const Po = (e) => (Ks << BigInt(e)) - Ks;
function jh(e, t, n) {
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
function _o(e, t = {}, n = {}) {
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
function Ha(e) {
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
const cl = {
  p: 0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffefffffc2fn,
  n: 0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141n,
  h: 1n,
  a: 0n,
  b: 7n,
  Gx: 0x79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798n,
  Gy: 0x483ada7726a3c4655da4fbfc0e1108a8fd17b448a68554199c47d08ffb10d4b8n
}, { p: Le, n: Fe, Gx: Wh, Gy: Gh, b: ul } = cl, mt = 32, un = 64, fi = {
  publicKey: mt + 1,
  publicKeyUncompressed: un + 1,
  signature: un,
  seed: mt + mt / 2
}, qh = (...e) => {
  "captureStackTrace" in Error && typeof Error.captureStackTrace == "function" && Error.captureStackTrace(...e);
}, et = (e = "") => {
  const t = new Error(e);
  throw qh(t, et), t;
}, Yh = (e) => typeof e == "bigint", Zh = (e) => typeof e == "string", Xh = (e) => e instanceof Uint8Array || ArrayBuffer.isView(e) && e.constructor.name === "Uint8Array", Ct = (e, t, n = "") => {
  const r = Xh(e), i = e?.length, s = t !== void 0;
  if (!r || s && i !== t) {
    const o = n && `"${n}" `, a = s ? ` of length ${t}` : "", c = r ? `length=${i}` : `type=${typeof e}`;
    et(o + "expected Uint8Array" + a + ", got " + c);
  }
  return e;
}, Ke = (e) => new Uint8Array(e), ll = (e, t) => e.toString(16).padStart(t, "0"), fl = (e) => Array.from(Ct(e)).map((t) => ll(t, 2)).join(""), he = { _0: 48, _9: 57, A: 65, F: 70, a: 97, f: 102 }, Fa = (e) => {
  if (e >= he._0 && e <= he._9)
    return e - he._0;
  if (e >= he.A && e <= he.F)
    return e - (he.A - 10);
  if (e >= he.a && e <= he.f)
    return e - (he.a - 10);
}, dl = (e) => {
  const t = "hex invalid";
  if (!Zh(e))
    return et(t);
  const n = e.length, r = n / 2;
  if (n % 2)
    return et(t);
  const i = Ke(r);
  for (let s = 0, o = 0; s < r; s++, o += 2) {
    const a = Fa(e.charCodeAt(o)), c = Fa(e.charCodeAt(o + 1));
    if (a === void 0 || c === void 0)
      return et(t);
    i[s] = a * 16 + c;
  }
  return i;
}, hl = () => globalThis?.crypto, Ka = () => hl()?.subtle ?? et("crypto.subtle must be defined, consider polyfill"), ue = (...e) => {
  const t = Ke(e.reduce((r, i) => r + Ct(i).length, 0));
  let n = 0;
  return e.forEach((r) => {
    t.set(r, n), n += r.length;
  }), t;
}, Mi = (e = mt) => hl().getRandomValues(Ke(e)), lr = BigInt, ln = (e, t, n, r = "bad number: out of range") => Yh(e) && t <= e && e < n ? e : et(r), D = (e, t = Le) => {
  const n = e % t;
  return n >= 0n ? n : t + n;
}, me = (e) => D(e, Fe), pl = (e, t) => {
  (e === 0n || t <= 0n) && et("no inverse n=" + e + " mod=" + t);
  let n = D(e, t), r = t, i = 0n, s = 1n;
  for (; n !== 0n; ) {
    const o = r / n, a = r % n, c = i - s * o;
    r = n, n = a, i = s, s = c;
  }
  return r === 1n ? D(i, t) : et("no inverse");
}, gl = (e) => {
  const t = Fi[e];
  return typeof t != "function" && et("hashes." + e + " not set"), t;
}, as = (e) => e instanceof It ? e : et("Point expected"), yl = (e) => D(D(e * e) * e + ul), za = (e) => ln(e, 0n, Le), Fr = (e) => ln(e, 1n, Le), zs = (e) => ln(e, 1n, Fe), On = (e) => (e & 1n) === 0n, Hi = (e) => Uint8Array.of(e), Qh = (e) => Hi(On(e) ? 2 : 3), wl = (e) => {
  const t = yl(Fr(e));
  let n = 1n;
  for (let r = t, i = (Le + 1n) / 4n; i > 0n; i >>= 1n)
    i & 1n && (n = n * r % Le), r = r * r % Le;
  return D(n * n) === t ? n : et("sqrt invalid");
};
class It {
  static BASE;
  static ZERO;
  X;
  Y;
  Z;
  constructor(t, n, r) {
    this.X = za(t), this.Y = Fr(n), this.Z = za(r), Object.freeze(this);
  }
  static CURVE() {
    return cl;
  }
  /** Create 3d xyz point from 2d xy. (0, 0) => (0, 1, 0), not (0, 0, 1) */
  static fromAffine(t) {
    const { x: n, y: r } = t;
    return n === 0n && r === 0n ? Ye : new It(n, r, 1n);
  }
  /** Convert Uint8Array or hex string to Point. */
  static fromBytes(t) {
    Ct(t);
    const { publicKey: n, publicKeyUncompressed: r } = fi;
    let i;
    const s = t.length, o = t[0], a = t.subarray(1), c = Bn(a, 0, mt);
    if (s === n && (o === 2 || o === 3)) {
      let u = wl(c);
      const l = On(u);
      On(lr(o)) !== l && (u = D(-u)), i = new It(c, u, 1n);
    }
    return s === r && o === 4 && (i = new It(c, Bn(a, mt, un), 1n)), i ? i.assertValidity() : et("bad point: not on curve");
  }
  static fromHex(t) {
    return It.fromBytes(dl(t));
  }
  get x() {
    return this.toAffine().x;
  }
  get y() {
    return this.toAffine().y;
  }
  /** Equality check: compare points P&Q. */
  equals(t) {
    const { X: n, Y: r, Z: i } = this, { X: s, Y: o, Z: a } = as(t), c = D(n * a), u = D(s * i), l = D(r * a), f = D(o * i);
    return c === u && l === f;
  }
  is0() {
    return this.equals(Ye);
  }
  /** Flip point over y coordinate. */
  negate() {
    return new It(this.X, D(-this.Y), this.Z);
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
    const { X: n, Y: r, Z: i } = this, { X: s, Y: o, Z: a } = as(t), c = 0n, u = ul;
    let l = 0n, f = 0n, h = 0n;
    const p = D(u * 3n);
    let y = D(n * s), d = D(r * o), g = D(i * a), m = D(n + r), S = D(s + o);
    m = D(m * S), S = D(y + d), m = D(m - S), S = D(n + i);
    let k = D(s + a);
    return S = D(S * k), k = D(y + g), S = D(S - k), k = D(r + i), l = D(o + a), k = D(k * l), l = D(d + g), k = D(k - l), h = D(c * S), l = D(p * g), h = D(l + h), l = D(d - h), h = D(d + h), f = D(l * h), d = D(y + y), d = D(d + y), g = D(c * g), S = D(p * S), d = D(d + g), g = D(y - g), g = D(c * g), S = D(S + g), y = D(d * S), f = D(f + y), y = D(k * S), l = D(m * l), l = D(l - y), y = D(m * d), h = D(k * h), h = D(h + y), new It(l, f, h);
  }
  subtract(t) {
    return this.add(as(t).negate());
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
      return Ye;
    if (zs(t), t === 1n)
      return this;
    if (this.equals(ze))
      return vp(t).p;
    let r = Ye, i = ze;
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
    if (this.equals(Ye))
      return { x: 0n, y: 0n };
    if (r === 1n)
      return { x: t, y: n };
    const i = pl(r, Le);
    return D(r * i) !== 1n && et("inverse invalid"), { x: D(t * i), y: D(n * i) };
  }
  /** Checks if the point is valid and on-curve. */
  assertValidity() {
    const { x: t, y: n } = this.toAffine();
    return Fr(t), Fr(n), D(n * n) === yl(t) ? this : et("bad point: not on curve");
  }
  /** Converts point to 33/65-byte Uint8Array. */
  toBytes(t = !0) {
    const { x: n, y: r } = this.assertValidity().toAffine(), i = Dt(n);
    return t ? ue(Qh(r), i) : ue(Hi(4), i, Dt(r));
  }
  toHex(t) {
    return fl(this.toBytes(t));
  }
}
const ze = new It(Wh, Gh, 1n), Ye = new It(0n, 1n, 0n);
It.BASE = ze;
It.ZERO = Ye;
const Jh = (e, t, n) => ze.multiply(t, !1).add(e.multiply(n, !1)).assertValidity(), je = (e) => lr("0x" + (fl(e) || "0")), Bn = (e, t, n) => je(e.subarray(t, n)), tp = 2n ** 256n, Dt = (e) => dl(ll(ln(e, 0n, tp), un)), ml = (e) => {
  const t = je(Ct(e, mt, "secret key"));
  return ln(t, 1n, Fe, "invalid secret key: outside of range");
}, bl = (e) => e > Fe >> 1n, ep = (e) => {
  [0, 1, 2, 3].includes(e) || et("recovery id must be valid and present");
}, np = (e) => {
  e != null && !ja.includes(e) && et(`Signature format must be one of: ${ja.join(", ")}`), e === xl && et('Signature format "der" is not supported: switch to noble-curves');
}, rp = (e, t = $n) => {
  np(t);
  const n = fi.signature, r = n + 1;
  let i = `Signature format "${t}" expects Uint8Array with length `;
  t === $n && e.length !== n && et(i + n), t === hi && e.length !== r && et(i + r);
};
class di {
  r;
  s;
  recovery;
  constructor(t, n, r) {
    this.r = zs(t), this.s = zs(n), r != null && (this.recovery = r), Object.freeze(this);
  }
  static fromBytes(t, n = $n) {
    rp(t, n);
    let r;
    n === hi && (r = t[0], t = t.subarray(1));
    const i = Bn(t, 0, mt), s = Bn(t, mt, un);
    return new di(i, s, r);
  }
  addRecoveryBit(t) {
    return new di(this.r, this.s, t);
  }
  hasHighS() {
    return bl(this.s);
  }
  toBytes(t = $n) {
    const { r: n, s: r, recovery: i } = this, s = ue(Dt(n), Dt(r));
    return t === hi ? (ep(i), ue(Uint8Array.of(i), s)) : s;
  }
}
const El = (e) => {
  const t = e.length * 8 - 256;
  t > 1024 && et("msg invalid");
  const n = je(e);
  return t > 0 ? n >> lr(t) : n;
}, ip = (e) => me(El(Ct(e))), $n = "compact", hi = "recovered", xl = "der", ja = [$n, hi, xl], Wa = {
  lowS: !0,
  prehash: !0,
  format: $n,
  extraEntropy: !1
}, Ga = "SHA-256", Fi = {
  hmacSha256Async: async (e, t) => {
    const n = Ka(), r = "HMAC", i = await n.importKey("raw", e, { name: r, hash: { name: Ga } }, !1, ["sign"]);
    return Ke(await n.sign(r, i, t));
  },
  hmacSha256: void 0,
  sha256Async: async (e) => Ke(await Ka().digest(Ga, e)),
  sha256: void 0
}, sp = (e, t, n) => (Ct(e, void 0, "message"), t.prehash ? n ? Fi.sha256Async(e) : gl("sha256")(e) : e), op = Ke(0), ap = Hi(0), cp = Hi(1), up = 1e3, lp = "drbg: tried max amount of iterations", fp = async (e, t) => {
  let n = Ke(mt), r = Ke(mt), i = 0;
  const s = () => {
    n.fill(1), r.fill(0);
  }, o = (...l) => Fi.hmacSha256Async(r, ue(n, ...l)), a = async (l = op) => {
    r = await o(ap, l), n = await o(), l.length !== 0 && (r = await o(cp, l), n = await o());
  }, c = async () => (i++ >= up && et(lp), n = await o(), n);
  s(), await a(e);
  let u;
  for (; !(u = t(await c())); )
    await a();
  return s(), u;
}, dp = (e, t, n, r) => {
  let { lowS: i, extraEntropy: s } = n;
  const o = Dt, a = ip(e), c = o(a), u = ml(t), l = [o(u), c];
  if (s != null && s !== !1) {
    const y = s === !0 ? Mi(mt) : s;
    l.push(Ct(y, void 0, "extraEntropy"));
  }
  const f = ue(...l), h = a;
  return r(f, (y) => {
    const d = El(y);
    if (!(1n <= d && d < Fe))
      return;
    const g = pl(d, Fe), m = ze.multiply(d).toAffine(), S = me(m.x);
    if (S === 0n)
      return;
    const k = me(g * me(h + S * u));
    if (k === 0n)
      return;
    let R = (m.x === S ? 0 : 2) | Number(m.y & 1n), C = k;
    return i && bl(k) && (C = me(-k), R ^= 1), new di(S, C, R).toBytes(n.format);
  });
}, hp = (e) => {
  const t = {};
  return Object.keys(Wa).forEach((n) => {
    t[n] = e[n] ?? Wa[n];
  }), t;
}, pp = async (e, t, n = {}) => (n = hp(n), e = await sp(e, n, !0), dp(e, t, n, fp)), gp = (e = Mi(fi.seed)) => {
  Ct(e), (e.length < fi.seed || e.length > 1024) && et("expected 40-1024b");
  const t = D(je(e), Fe - 1n);
  return Dt(t + 1n);
}, yp = (e) => (t) => {
  const n = gp(t);
  return { secretKey: n, publicKey: e(n) };
}, Tl = (e) => Uint8Array.from("BIP0340/" + e, (t) => t.charCodeAt(0)), Sl = "aux", vl = "nonce", Al = "challenge", js = (e, ...t) => {
  const n = gl("sha256"), r = n(Tl(e));
  return n(ue(r, r, ...t));
}, Ws = async (e, ...t) => {
  const n = Fi.sha256Async, r = await n(Tl(e));
  return await n(ue(r, r, ...t));
}, Do = (e) => {
  const t = ml(e), n = ze.multiply(t), { x: r, y: i } = n.assertValidity().toAffine(), s = On(i) ? t : me(-t), o = Dt(r);
  return { d: s, px: o };
}, Vo = (e) => me(je(e)), Il = (...e) => Vo(js(Al, ...e)), kl = async (...e) => Vo(await Ws(Al, ...e)), Ol = (e) => Do(e).px, wp = yp(Ol), Bl = (e, t, n) => {
  const { px: r, d: i } = Do(t);
  return { m: Ct(e), px: r, d: i, a: Ct(n, mt) };
}, $l = (e) => {
  const t = Vo(e);
  t === 0n && et("sign failed: k is zero");
  const { px: n, d: r } = Do(Dt(t));
  return { rx: n, k: r };
}, Nl = (e, t, n, r) => ue(t, Dt(me(e + n * r))), Rl = "invalid signature produced", mp = (e, t, n = Mi(mt)) => {
  const { m: r, px: i, d: s, a: o } = Bl(e, t, n), a = js(Sl, o), c = Dt(s ^ je(a)), u = js(vl, c, i, r), { rx: l, k: f } = $l(u), h = Il(l, i, r), p = Nl(f, l, h, s);
  return Ll(p, r, i) || et(Rl), p;
}, bp = async (e, t, n = Mi(mt)) => {
  const { m: r, px: i, d: s, a: o } = Bl(e, t, n), a = await Ws(Sl, o), c = Dt(s ^ je(a)), u = await Ws(vl, c, i, r), { rx: l, k: f } = $l(u), h = await kl(l, i, r), p = Nl(f, l, h, s);
  return await Cl(p, r, i) || et(Rl), p;
}, Ep = (e, t) => e instanceof Promise ? e.then(t) : t(e), Ul = (e, t, n, r) => {
  const i = Ct(e, un, "signature"), s = Ct(t, void 0, "message"), o = Ct(n, mt, "publicKey");
  try {
    const a = je(o), c = wl(a), u = On(c) ? c : D(-c), l = new It(a, u, 1n).assertValidity(), f = Dt(l.toAffine().x), h = Bn(i, 0, mt);
    ln(h, 1n, Le);
    const p = Bn(i, mt, un);
    ln(p, 1n, Fe);
    const y = ue(Dt(h), f, s);
    return Ep(r(y), (d) => {
      const { x: g, y: m } = Jh(l, p, me(-d)).toAffine();
      return !(!On(m) || g !== h);
    });
  } catch {
    return !1;
  }
}, Ll = (e, t, n) => Ul(e, t, n, Il), Cl = async (e, t, n) => Ul(e, t, n, kl), xp = {
  keygen: wp,
  getPublicKey: Ol,
  sign: mp,
  verify: Ll,
  signAsync: bp,
  verifyAsync: Cl
}, pi = 8, Tp = 256, Pl = Math.ceil(Tp / pi) + 1, Gs = 2 ** (pi - 1), Sp = () => {
  const e = [];
  let t = ze, n = t;
  for (let r = 0; r < Pl; r++) {
    n = t, e.push(n);
    for (let i = 1; i < Gs; i++)
      n = n.add(t), e.push(n);
    t = n.double();
  }
  return e;
};
let qa;
const Ya = (e, t) => {
  const n = t.negate();
  return e ? n : t;
}, vp = (e) => {
  const t = qa || (qa = Sp());
  let n = Ye, r = ze;
  const i = 2 ** pi, s = i, o = lr(i - 1), a = lr(pi);
  for (let c = 0; c < Pl; c++) {
    let u = Number(e & o);
    e >>= a, u > Gs && (u -= s, e += 1n);
    const l = c * Gs, f = l, h = l + Math.abs(u) - 1, p = c % 2 !== 0, y = u < 0;
    u === 0 ? r = r.add(Ya(p, t[f])) : n = n.add(Ya(y, t[h]));
  }
  return e !== 0n && et("invalid wnaf"), { p: n, f: r };
};
function Ap(e, t, n) {
  return e & t ^ ~e & n;
}
function Ip(e, t, n) {
  return e & t ^ e & n ^ t & n;
}
class kp {
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
    this.blockLen = t, this.outputLen = n, this.padOffset = r, this.isLE = i, this.buffer = new Uint8Array(t), this.view = os(this.buffer);
  }
  update(t) {
    ai(this), rt(t);
    const { view: n, buffer: r, blockLen: i } = this, s = t.length;
    for (let o = 0; o < s; ) {
      const a = Math.min(i - this.pos, s - o);
      if (a === i) {
        const c = os(t);
        for (; i <= s - o; o += i)
          this.process(c, o);
        continue;
      }
      r.set(t.subarray(o, o + a), this.pos), this.pos += a, o += a, this.pos === i && (this.process(n, 0), this.pos = 0);
    }
    return this.length += t.length, this.roundClean(), this;
  }
  digestInto(t) {
    ai(this), Ph(t, this), this.finished = !0;
    const { buffer: n, view: r, blockLen: i, isLE: s } = this;
    let { pos: o } = this;
    n[o++] = 128, ci(this.buffer.subarray(o)), this.padOffset > i - o && (this.process(r, 0), o = 0);
    for (let f = o; f < i; f++)
      n[f] = 0;
    r.setBigUint64(i - 8, BigInt(this.length * 8), s), this.process(r, 0);
    const a = os(t), c = this.outputLen;
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
const Ie = /* @__PURE__ */ Uint32Array.from([
  1779033703,
  3144134277,
  1013904242,
  2773480762,
  1359893119,
  2600822924,
  528734635,
  1541459225
]), Op = /* @__PURE__ */ Uint32Array.from([
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
class Bp extends kp {
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
      const h = ke[f - 15], p = ke[f - 2], y = ne(h, 7) ^ ne(h, 18) ^ h >>> 3, d = ne(p, 17) ^ ne(p, 19) ^ p >>> 10;
      ke[f] = d + ke[f - 7] + y + ke[f - 16] | 0;
    }
    let { A: r, B: i, C: s, D: o, E: a, F: c, G: u, H: l } = this;
    for (let f = 0; f < 64; f++) {
      const h = ne(a, 6) ^ ne(a, 11) ^ ne(a, 25), p = l + h + Ap(a, c, u) + Op[f] + ke[f] | 0, d = (ne(r, 2) ^ ne(r, 13) ^ ne(r, 22)) + Ip(r, i, s) | 0;
      l = u, u = c, c = a, a = o + p | 0, o = s, s = i, i = r, r = p + d | 0;
    }
    r = r + this.A | 0, i = i + this.B | 0, s = s + this.C | 0, o = o + this.D | 0, a = a + this.E | 0, c = c + this.F | 0, u = u + this.G | 0, l = l + this.H | 0, this.set(r, i, s, o, a, c, u, l);
  }
  roundClean() {
    ci(ke);
  }
  destroy() {
    this.set(0, 0, 0, 0, 0, 0, 0, 0), ci(this.buffer);
  }
}
class $p extends Bp {
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
}
const qs = /* @__PURE__ */ Dh(
  () => new $p(),
  /* @__PURE__ */ Vh(1)
);
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const Ot = /* @__PURE__ */ BigInt(0), vt = /* @__PURE__ */ BigInt(1), en = /* @__PURE__ */ BigInt(2), _l = /* @__PURE__ */ BigInt(3), Dl = /* @__PURE__ */ BigInt(4), Vl = /* @__PURE__ */ BigInt(5), Np = /* @__PURE__ */ BigInt(7), Ml = /* @__PURE__ */ BigInt(8), Rp = /* @__PURE__ */ BigInt(9), Hl = /* @__PURE__ */ BigInt(16);
function Wt(e, t) {
  const n = e % t;
  return n >= Ot ? n : t + n;
}
function Mt(e, t, n) {
  let r = e;
  for (; t-- > Ot; )
    r *= r, r %= n;
  return r;
}
function Za(e, t) {
  if (e === Ot)
    throw new Error("invert: expected non-zero number");
  if (t <= Ot)
    throw new Error("invert: expected positive modulus, got " + t);
  let n = Wt(e, t), r = t, i = Ot, s = vt;
  for (; n !== Ot; ) {
    const a = r / n, c = r % n, u = i - s * a;
    r = n, n = c, i = s, s = u;
  }
  if (r !== vt)
    throw new Error("invert: does not exist");
  return Wt(i, t);
}
function Mo(e, t, n) {
  if (!e.eql(e.sqr(t), n))
    throw new Error("Cannot find square root");
}
function Fl(e, t) {
  const n = (e.ORDER + vt) / Dl, r = e.pow(t, n);
  return Mo(e, r, t), r;
}
function Up(e, t) {
  const n = (e.ORDER - Vl) / Ml, r = e.mul(t, en), i = e.pow(r, n), s = e.mul(t, i), o = e.mul(e.mul(s, en), i), a = e.mul(s, e.sub(o, e.ONE));
  return Mo(e, a, t), a;
}
function Lp(e) {
  const t = Ki(e), n = Kl(e), r = n(t, t.neg(t.ONE)), i = n(t, r), s = n(t, t.neg(r)), o = (e + Np) / Hl;
  return (a, c) => {
    let u = a.pow(c, o), l = a.mul(u, r);
    const f = a.mul(u, i), h = a.mul(u, s), p = a.eql(a.sqr(l), c), y = a.eql(a.sqr(f), c);
    u = a.cmov(u, l, p), l = a.cmov(h, f, y);
    const d = a.eql(a.sqr(l), c), g = a.cmov(u, l, d);
    return Mo(a, g, c), g;
  };
}
function Kl(e) {
  if (e < _l)
    throw new Error("sqrt is not defined for small field");
  let t = e - vt, n = 0;
  for (; t % en === Ot; )
    t /= en, n++;
  let r = en;
  const i = Ki(e);
  for (; Xa(i, r) === 1; )
    if (r++ > 1e3)
      throw new Error("Cannot find square root: probably non-prime P");
  if (n === 1)
    return Fl;
  let s = i.pow(r, t);
  const o = (t + vt) / en;
  return function(c, u) {
    if (c.is0(u))
      return u;
    if (Xa(c, u) !== 1)
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
function Cp(e) {
  return e % Dl === _l ? Fl : e % Ml === Vl ? Up : e % Hl === Rp ? Lp(e) : Kl(e);
}
const Pp = [
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
function _p(e) {
  const t = {
    ORDER: "bigint",
    BYTES: "number",
    BITS: "number"
  }, n = Pp.reduce((r, i) => (r[i] = "function", r), t);
  return _o(e, n), e;
}
function Dp(e, t, n) {
  if (n < Ot)
    throw new Error("invalid exponent, negatives unsupported");
  if (n === Ot)
    return e.ONE;
  if (n === vt)
    return t;
  let r = e.ONE, i = t;
  for (; n > Ot; )
    n & vt && (r = e.mul(r, i)), i = e.sqr(i), n >>= vt;
  return r;
}
function zl(e, t, n = !1) {
  const r = new Array(t.length).fill(n ? e.ZERO : void 0), i = t.reduce((o, a, c) => e.is0(a) ? o : (r[c] = o, e.mul(o, a)), e.ONE), s = e.inv(i);
  return t.reduceRight((o, a, c) => e.is0(a) ? o : (r[c] = e.mul(o, r[c]), e.mul(o, a)), s), r;
}
function Xa(e, t) {
  const n = (e.ORDER - vt) / en, r = e.pow(t, n), i = e.eql(r, e.ONE), s = e.eql(r, e.ZERO), o = e.eql(r, e.neg(e.ONE));
  if (!i && !s && !o)
    throw new Error("invalid Legendre symbol result");
  return i ? 1 : s ? 0 : -1;
}
function Vp(e, t) {
  t !== void 0 && cn(t);
  const n = t !== void 0 ? t : e.toString(2).length, r = Math.ceil(n / 8);
  return { nBitLength: n, nByteLength: r };
}
class Mp {
  ORDER;
  BITS;
  BYTES;
  isLE;
  ZERO = Ot;
  ONE = vt;
  _lengths;
  _sqrt;
  // cached sqrt
  _mod;
  constructor(t, n = {}) {
    if (t <= Ot)
      throw new Error("invalid field: expected ORDER > 0, got " + t);
    let r;
    this.isLE = !1, n != null && typeof n == "object" && (typeof n.BITS == "number" && (r = n.BITS), typeof n.sqrt == "function" && (this.sqrt = n.sqrt), typeof n.isLE == "boolean" && (this.isLE = n.isLE), n.allowedLengths && (this._lengths = n.allowedLengths?.slice()), typeof n.modFromBytes == "boolean" && (this._mod = n.modFromBytes));
    const { nBitLength: i, nByteLength: s } = Vp(t, r);
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
    return (t & vt) === vt;
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
    return Dp(this, t, n);
  }
  div(t, n) {
    return Wt(t * Za(n, this.ORDER), this.ORDER);
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
    return Za(t, this.ORDER);
  }
  sqrt(t) {
    return this._sqrt || (this._sqrt = Cp(this.ORDER)), this._sqrt(this, t);
  }
  toBytes(t) {
    return this.isLE ? al(t, this.BYTES) : Co(t, this.BYTES);
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
    let c = s ? ol(t) : Vn(t);
    if (a && (c = Wt(c, o)), !n && !this.isValid(c))
      throw new Error("invalid field element: outside of range 0..ORDER");
    return c;
  }
  // TODO: we don't need it here, move out to separate fn
  invertBatch(t) {
    return zl(this, t);
  }
  // We can't move this out because Fp6, Fp12 implement it
  // and it's unclear what to return in there.
  cmov(t, n, r) {
    return r ? n : t;
  }
}
function Ki(e, t = {}) {
  return new Mp(e, t);
}
function jl(e) {
  if (typeof e != "bigint")
    throw new Error("field order must be bigint");
  const t = e.toString(2).length;
  return Math.ceil(t / 8);
}
function Wl(e) {
  const t = jl(e);
  return t + Math.ceil(t / 2);
}
function Gl(e, t, n = !1) {
  rt(e);
  const r = e.length, i = jl(t), s = Wl(t);
  if (r < 16 || r < s || r > 1024)
    throw new Error("expected " + s + "-1024 bytes of input, got " + r);
  const o = n ? ol(e) : Vn(e), a = Wt(o, t - vt) + vt;
  return n ? al(a, i) : Co(a, i);
}
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const Nn = /* @__PURE__ */ BigInt(0), nn = /* @__PURE__ */ BigInt(1);
function gi(e, t) {
  const n = t.negate();
  return e ? n : t;
}
function Qa(e, t) {
  const n = zl(e.Fp, t.map((r) => r.Z));
  return t.map((r, i) => e.fromAffine(r.toAffine(n[i])));
}
function ql(e, t) {
  if (!Number.isSafeInteger(e) || e <= 0 || e > t)
    throw new Error("invalid window size, expected [1.." + t + "], got W=" + e);
}
function cs(e, t) {
  ql(e, t);
  const n = Math.ceil(t / e) + 1, r = 2 ** (e - 1), i = 2 ** e, s = Po(e), o = BigInt(e);
  return { windows: n, windowSize: r, mask: s, maxNumber: i, shiftBy: o };
}
function Ja(e, t, n) {
  const { windowSize: r, mask: i, maxNumber: s, shiftBy: o } = n;
  let a = Number(e & i), c = e >> o;
  a > r && (a -= s, c += nn);
  const u = t * r, l = u + Math.abs(a) - 1, f = a === 0, h = a < 0, p = t % 2 !== 0;
  return { nextN: c, offset: l, isZero: f, isNeg: h, isNegF: p, offsetF: u };
}
const us = /* @__PURE__ */ new WeakMap(), Yl = /* @__PURE__ */ new WeakMap();
function ls(e) {
  return Yl.get(e) || 1;
}
function tc(e) {
  if (e !== Nn)
    throw new Error("invalid wNAF");
}
class Hp {
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
    for (; n > Nn; )
      n & nn && (r = r.add(i)), i = i.double(), n >>= nn;
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
    const { windows: r, windowSize: i } = cs(n, this.bits), s = [];
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
    const o = cs(t, this.bits);
    for (let a = 0; a < o.windows; a++) {
      const { nextN: c, offset: u, isZero: l, isNeg: f, isNegF: h, offsetF: p } = Ja(r, a, o);
      r = c, l ? s = s.add(gi(h, n[p])) : i = i.add(gi(f, n[u]));
    }
    return tc(r), { p: i, f: s };
  }
  /**
   * Implements ec unsafe (non const-time) multiplication using precomputed tables and w-ary non-adjacent form.
   * @param acc accumulator point to add result of multiplication
   * @returns point
   */
  wNAFUnsafe(t, n, r, i = this.ZERO) {
    const s = cs(t, this.bits);
    for (let o = 0; o < s.windows && r !== Nn; o++) {
      const { nextN: a, offset: c, isZero: u, isNeg: l } = Ja(r, o, s);
      if (r = a, !u) {
        const f = n[c];
        i = i.add(l ? f.negate() : f);
      }
    }
    return tc(r), i;
  }
  getPrecomputes(t, n, r) {
    let i = us.get(n);
    return i || (i = this.precomputeWindow(n, t), t !== 1 && (typeof r == "function" && (i = r(i)), us.set(n, i))), i;
  }
  cached(t, n, r) {
    const i = ls(t);
    return this.wNAF(i, this.getPrecomputes(i, t, r), n);
  }
  unsafe(t, n, r, i) {
    const s = ls(t);
    return s === 1 ? this._unsafeLadder(t, n, i) : this.wNAFUnsafe(s, this.getPrecomputes(s, t, r), n, i);
  }
  // We calculate precomputes for elliptic curve point multiplication
  // using windowed method. This specifies window size and
  // stores precomputed values. Usually only base point would be precomputed.
  createCache(t, n) {
    ql(n, this.bits), Yl.set(t, n), us.delete(t);
  }
  hasCache(t) {
    return ls(t) !== 1;
  }
}
function Fp(e, t, n, r) {
  let i = t, s = e.ZERO, o = e.ZERO;
  for (; n > Nn || r > Nn; )
    n & nn && (s = s.add(i)), r & nn && (o = o.add(i)), i = i.double(), n >>= nn, r >>= nn;
  return { p1: s, p2: o };
}
function ec(e, t, n) {
  if (t) {
    if (t.ORDER !== e)
      throw new Error("Field.ORDER must match order: Fp == p, Fn == n");
    return _p(t), t;
  } else
    return Ki(e, { isLE: n });
}
function Kp(e, t, n = {}, r) {
  if (r === void 0 && (r = e === "edwards"), !t || typeof t != "object")
    throw new Error(`expected valid ${e} CURVE object`);
  for (const c of ["p", "n", "h"]) {
    const u = t[c];
    if (!(typeof u == "bigint" && u > Nn))
      throw new Error(`CURVE.${c} must be positive bigint`);
  }
  const i = ec(t.p, n.Fp, r), s = ec(t.n, n.Fn, r), a = ["Gx", "Gy", "a", "b"];
  for (const c of a)
    if (!i.isValid(t[c]))
      throw new Error(`CURVE.${c} must be valid field element of CURVE.Fp`);
  return t = Object.freeze(Object.assign({}, t)), { CURVE: t, Fp: i, Fn: s };
}
function Zl(e, t) {
  return function(r) {
    const i = e(r);
    return { secretKey: i, publicKey: t(i) };
  };
}
class Xl {
  oHash;
  iHash;
  blockLen;
  outputLen;
  finished = !1;
  destroyed = !1;
  constructor(t, n) {
    if (nl(t), rt(n, void 0, "key"), this.iHash = t.create(), typeof this.iHash.update != "function")
      throw new Error("Expected instance of class which extends utils.Hash");
    this.blockLen = this.iHash.blockLen, this.outputLen = this.iHash.outputLen;
    const r = this.blockLen, i = new Uint8Array(r);
    i.set(n.length > r ? t.create().update(n).digest() : n);
    for (let s = 0; s < i.length; s++)
      i[s] ^= 54;
    this.iHash.update(i), this.oHash = t.create();
    for (let s = 0; s < i.length; s++)
      i[s] ^= 106;
    this.oHash.update(i), ci(i);
  }
  update(t) {
    return ai(this), this.iHash.update(t), this;
  }
  digestInto(t) {
    ai(this), rt(t, this.outputLen, "output"), this.finished = !0, this.iHash.digestInto(t), this.oHash.update(t), this.oHash.digestInto(t), this.destroy();
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
const Ql = (e, t, n) => new Xl(e, t).update(n).digest();
Ql.create = (e, t) => new Xl(e, t);
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const nc = (e, t) => (e + (e >= 0 ? t : -t) / Jl) / t;
function zp(e, t, n) {
  const [[r, i], [s, o]] = t, a = nc(o * e, n), c = nc(-i * e, n);
  let u = e - a * r - c * s, l = -a * i - c * o;
  const f = u < be, h = l < be;
  f && (u = -u), h && (l = -l);
  const p = Po(Math.ceil(zh(n) / 2)) + En;
  if (u < be || u >= p || l < be || l >= p)
    throw new Error("splitScalar (endomorphism): failed, k=" + e);
  return { k1neg: f, k1: u, k2neg: h, k2: l };
}
function Ys(e) {
  if (!["compact", "recovered", "der"].includes(e))
    throw new Error('Signature format must be "compact", "recovered", or "der"');
  return e;
}
function fs(e, t) {
  const n = {};
  for (let r of Object.keys(t))
    n[r] = e[r] === void 0 ? t[r] : e[r];
  return li(n.lowS, "lowS"), li(n.prehash, "prehash"), n.format !== void 0 && Ys(n.format), n;
}
class jp extends Error {
  constructor(t = "") {
    super(t);
  }
}
const Be = {
  // asn.1 DER encoding utils
  Err: jp,
  // Basic building block is TLV (Tag-Length-Value)
  _tlv: {
    encode: (e, t) => {
      const { Err: n } = Be;
      if (e < 0 || e > 256)
        throw new n("tlv.encode: wrong tag");
      if (t.length & 1)
        throw new n("tlv.encode: unpadded data");
      const r = t.length / 2, i = kr(r);
      if (i.length / 2 & 128)
        throw new n("tlv.encode: long form length too big");
      const s = r > 127 ? kr(i.length / 2 | 128) : "";
      return kr(e) + s + i + t;
    },
    // v - value, l - left bytes (unparsed)
    decode(e, t) {
      const { Err: n } = Be;
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
      const { Err: t } = Be;
      if (e < be)
        throw new t("integer: negative integers are not allowed");
      let n = kr(e);
      if (Number.parseInt(n[0], 16) & 8 && (n = "00" + n), n.length & 1)
        throw new t("unexpected DER parsing assertion: unpadded hex");
      return n;
    },
    decode(e) {
      const { Err: t } = Be;
      if (e[0] & 128)
        throw new t("invalid signature integer: negative");
      if (e[0] === 0 && !(e[1] & 128))
        throw new t("invalid signature integer: unnecessary leading zero");
      return Vn(e);
    }
  },
  toSig(e) {
    const { Err: t, _int: n, _tlv: r } = Be, i = rt(e, void 0, "signature"), { v: s, l: o } = r.decode(48, i);
    if (o.length)
      throw new t("invalid signature: left bytes after parsing");
    const { v: a, l: c } = r.decode(2, s), { v: u, l } = r.decode(2, c);
    if (l.length)
      throw new t("invalid signature: left bytes after parsing");
    return { r: n.decode(a), s: n.decode(u) };
  },
  hexFromSig(e) {
    const { _tlv: t, _int: n } = Be, r = t.encode(2, n.encode(e.r)), i = t.encode(2, n.encode(e.s)), s = r + i;
    return t.encode(48, s);
  }
}, be = BigInt(0), En = BigInt(1), Jl = BigInt(2), Or = BigInt(3), Wp = BigInt(4);
function Gp(e, t = {}) {
  const n = Kp("weierstrass", e, t), { Fp: r, Fn: i } = n;
  let s = n.CURVE;
  const { h: o, n: a } = s;
  _o(t, {}, {
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
  const u = ef(r, i);
  function l() {
    if (!r.isOdd)
      throw new Error("compression is not supported: Field does not have .isOdd()");
  }
  function f(_, E, b) {
    const { x: w, y: x } = E.toAffine(), A = r.toBytes(w);
    if (li(b, "isCompressed"), b) {
      l();
      const O = !r.isOdd(x);
      return se(tf(O), A);
    } else
      return se(Uint8Array.of(4), A, r.toBytes(x));
  }
  function h(_) {
    rt(_, void 0, "Point");
    const { publicKey: E, publicKeyUncompressed: b } = u, w = _.length, x = _[0], A = _.subarray(1);
    if (w === E && (x === 2 || x === 3)) {
      const O = r.fromBytes(A);
      if (!r.isValid(O))
        throw new Error("bad point: is not on curve, wrong x");
      const I = d(O);
      let v;
      try {
        v = r.sqrt(I);
      } catch (j) {
        const M = j instanceof Error ? ": " + j.message : "";
        throw new Error("bad point: is not on curve, sqrt error" + M);
      }
      l();
      const N = r.isOdd(v);
      return (x & 1) === 1 !== N && (v = r.neg(v)), { x: O, y: v };
    } else if (w === b && x === 4) {
      const O = r.BYTES, I = r.fromBytes(A.subarray(0, O)), v = r.fromBytes(A.subarray(O, O * 2));
      if (!g(I, v))
        throw new Error("bad point: is not on curve");
      return { x: I, y: v };
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
  const m = r.mul(r.pow(s.a, Or), Wp), S = r.mul(r.sqr(s.b), BigInt(27));
  if (r.is0(r.add(m, S)))
    throw new Error("bad curve params: a or b");
  function k(_, E, b = !1) {
    if (!r.isValid(E) || b && r.is0(E))
      throw new Error(`bad point coordinate ${_}`);
    return E;
  }
  function R(_) {
    if (!(_ instanceof L))
      throw new Error("Weierstrass Point expected");
  }
  function C(_) {
    if (!c || !c.basises)
      throw new Error("no endo");
    return zp(_, c.basises, i.ORDER);
  }
  const W = Ha((_, E) => {
    const { X: b, Y: w, Z: x } = _;
    if (r.eql(x, r.ONE))
      return { x: b, y: w };
    const A = _.is0();
    E == null && (E = A ? r.ONE : r.inv(x));
    const O = r.mul(b, E), I = r.mul(w, E), v = r.mul(x, E);
    if (A)
      return { x: r.ZERO, y: r.ZERO };
    if (!r.eql(v, r.ONE))
      throw new Error("invZ was invalid");
    return { x: O, y: I };
  }), T = Ha((_) => {
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
  function Q(_, E, b, w, x) {
    return b = new L(r.mul(b.X, _), b.Y, b.Z), E = gi(w, E), b = gi(x, b), E.add(b);
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
    static Fn = i;
    X;
    Y;
    Z;
    /** Does NOT validate if the point is valid. Use `.assertValidity()`. */
    constructor(E, b, w) {
      this.X = k("x", E), this.Y = k("y", b, !0), this.Z = k("z", w), Object.freeze(this);
    }
    static CURVE() {
      return s;
    }
    /** Does NOT validate if the point is valid. Use `.assertValidity()`. */
    static fromAffine(E) {
      const { x: b, y: w } = E || {};
      if (!E || !r.isValid(b) || !r.isValid(w))
        throw new Error("invalid affine point");
      if (E instanceof L)
        throw new Error("projective point not allowed");
      return r.is0(b) && r.is0(w) ? L.ZERO : new L(b, w, r.ONE);
    }
    static fromBytes(E) {
      const b = L.fromAffine(y(rt(E, void 0, "point")));
      return b.assertValidity(), b;
    }
    static fromHex(E) {
      return L.fromBytes(ui(E));
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
      return at.createCache(this, E), b || this.multiply(Or), this;
    }
    // TODO: return `this`
    /** A point on curve is valid if it conforms to equation. */
    assertValidity() {
      T(this);
    }
    hasEvenY() {
      const { y: E } = this.toAffine();
      if (!r.isOdd)
        throw new Error("Field doesn't support isOdd");
      return !r.isOdd(E);
    }
    /** Compare one point to another. */
    equals(E) {
      R(E);
      const { X: b, Y: w, Z: x } = this, { X: A, Y: O, Z: I } = E, v = r.eql(r.mul(b, I), r.mul(A, x)), N = r.eql(r.mul(w, I), r.mul(O, x));
      return v && N;
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
      const { a: E, b } = s, w = r.mul(b, Or), { X: x, Y: A, Z: O } = this;
      let I = r.ZERO, v = r.ZERO, N = r.ZERO, U = r.mul(x, x), j = r.mul(A, A), M = r.mul(O, O), P = r.mul(x, A);
      return P = r.add(P, P), N = r.mul(x, O), N = r.add(N, N), I = r.mul(E, N), v = r.mul(w, M), v = r.add(I, v), I = r.sub(j, v), v = r.add(j, v), v = r.mul(I, v), I = r.mul(P, I), N = r.mul(w, N), M = r.mul(E, M), P = r.sub(U, M), P = r.mul(E, P), P = r.add(P, N), N = r.add(U, U), U = r.add(N, U), U = r.add(U, M), U = r.mul(U, P), v = r.add(v, U), M = r.mul(A, O), M = r.add(M, M), U = r.mul(M, P), I = r.sub(I, U), N = r.mul(M, j), N = r.add(N, N), N = r.add(N, N), new L(I, v, N);
    }
    // Renes-Costello-Batina exception-free addition formula.
    // There is 30% faster Jacobian formula, but it is not complete.
    // https://eprint.iacr.org/2015/1060, algorithm 1
    // Cost: 12M + 0S + 3*a + 3*b3 + 23add.
    add(E) {
      R(E);
      const { X: b, Y: w, Z: x } = this, { X: A, Y: O, Z: I } = E;
      let v = r.ZERO, N = r.ZERO, U = r.ZERO;
      const j = s.a, M = r.mul(s.b, Or);
      let P = r.mul(b, A), F = r.mul(w, O), Y = r.mul(x, I), ut = r.add(b, w), K = r.add(A, O);
      ut = r.mul(ut, K), K = r.add(P, F), ut = r.sub(ut, K), K = r.add(b, x);
      let X = r.add(A, I);
      return K = r.mul(K, X), X = r.add(P, Y), K = r.sub(K, X), X = r.add(w, x), v = r.add(O, I), X = r.mul(X, v), v = r.add(F, Y), X = r.sub(X, v), U = r.mul(j, K), v = r.mul(M, Y), U = r.add(v, U), v = r.sub(F, U), U = r.add(F, U), N = r.mul(v, U), F = r.add(P, P), F = r.add(F, P), Y = r.mul(j, Y), K = r.mul(M, K), F = r.add(F, Y), Y = r.sub(P, Y), Y = r.mul(j, Y), K = r.add(K, Y), P = r.mul(F, K), N = r.add(N, P), P = r.mul(X, K), v = r.mul(ut, v), v = r.sub(v, P), P = r.mul(ut, F), U = r.mul(X, U), U = r.add(U, P), new L(v, N, U);
    }
    subtract(E) {
      return this.add(E.negate());
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
    multiply(E) {
      const { endo: b } = t;
      if (!i.isValidNot0(E))
        throw new Error("invalid scalar: out of range");
      let w, x;
      const A = (O) => at.cached(this, O, (I) => Qa(L, I));
      if (b) {
        const { k1neg: O, k1: I, k2neg: v, k2: N } = C(E), { p: U, f: j } = A(I), { p: M, f: P } = A(N);
        x = j.add(P), w = Q(b.beta, U, M, O, v);
      } else {
        const { p: O, f: I } = A(E);
        w = O, x = I;
      }
      return Qa(L, [w, x])[0];
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
      if (E === be || w.is0())
        return L.ZERO;
      if (E === En)
        return w;
      if (at.hasCache(this))
        return this.multiply(E);
      if (b) {
        const { k1neg: x, k1: A, k2neg: O, k2: I } = C(E), { p1: v, p2: N } = Fp(L, w, A, I);
        return Q(b.beta, v, N, x, O);
      } else
        return at.unsafe(w, E);
    }
    /**
     * Converts Projective point to affine (x, y) coordinates.
     * @param invertedZ Z^-1 (inverted zero) - optional, precomputation is useful for invertBatch
     */
    toAffine(E) {
      return W(this, E);
    }
    /**
     * Checks whether Point is free of torsion elements (is in prime subgroup).
     * Always torsion-free for cofactor=1 curves.
     */
    isTorsionFree() {
      const { isTorsionFree: E } = t;
      return o === En ? !0 : E ? E(L, this) : at.unsafe(this, a).is0();
    }
    clearCofactor() {
      const { clearCofactor: E } = t;
      return o === En ? this : E ? E(L, this) : this.multiplyUnsafe(o);
    }
    isSmallOrder() {
      return this.multiplyUnsafe(o).is0();
    }
    toBytes(E = !0) {
      return li(E, "isCompressed"), this.assertValidity(), p(L, this, E);
    }
    toHex(E = !0) {
      return Di(this.toBytes(E));
    }
    toString() {
      return `<Point ${this.is0() ? "ZERO" : this.toHex()}>`;
    }
  }
  const J = i.BITS, at = new Hp(L, t.endo ? Math.ceil(J / 2) : J);
  return L.BASE.precompute(8), L;
}
function tf(e) {
  return Uint8Array.of(e ? 2 : 3);
}
function ef(e, t) {
  return {
    secretKey: t.BYTES,
    publicKey: 1 + e.BYTES,
    publicKeyUncompressed: 1 + 2 * e.BYTES,
    publicKeyHasPrefix: !0,
    signature: 2 * t.BYTES
  };
}
function qp(e, t = {}) {
  const { Fn: n } = e, r = t.randomBytes || Vi, i = Object.assign(ef(e.Fp, n), { seed: Wl(n.ORDER) });
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
    return Gl(rt(p, i.seed, "seed"), n.ORDER);
  }
  function c(p, y = !0) {
    return e.BASE.multiply(n.fromBytes(p)).toBytes(y);
  }
  function u(p) {
    const { secretKey: y, publicKey: d, publicKeyUncompressed: g } = i;
    if (!Uo(p) || "_lengths" in n && n._lengths || y === d)
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
  }, h = Zl(a, c);
  return Object.freeze({ getPublicKey: c, getSharedSecret: l, keygen: h, Point: e, utils: f, lengths: i });
}
function Yp(e, t, n = {}) {
  nl(t), _o(n, {}, {
    hmac: "function",
    lowS: "boolean",
    randomBytes: "function",
    bits2int: "function",
    bits2int_modN: "function"
  }), n = Object.assign({}, n);
  const r = n.randomBytes || Vi, i = n.hmac || ((b, w) => Ql(t, b, w)), { Fp: s, Fn: o } = e, { ORDER: a, BITS: c } = o, { keygen: u, getPublicKey: l, getSharedSecret: f, utils: h, lengths: p } = qp(e, n), y = {
    prehash: !0,
    lowS: typeof n.lowS == "boolean" ? n.lowS : !0,
    format: "compact",
    extraEntropy: !1
  }, d = a * Jl < s.ORDER;
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
  function k(b, w) {
    Ys(w);
    const x = p.signature, A = w === "compact" ? x : w === "recovered" ? x + 1 : void 0;
    return rt(b, A);
  }
  class R {
    r;
    s;
    recovery;
    constructor(w, x, A) {
      if (this.r = m("r", w), this.s = m("s", x), A != null) {
        if (S(), ![0, 1, 2, 3].includes(A))
          throw new Error("invalid recovery id");
        this.recovery = A;
      }
      Object.freeze(this);
    }
    static fromBytes(w, x = y.format) {
      k(w, x);
      let A;
      if (x === "der") {
        const { r: N, s: U } = Be.toSig(rt(w));
        return new R(N, U);
      }
      x === "recovered" && (A = w[0], x = "compact", w = w.subarray(1));
      const O = p.signature / 2, I = w.subarray(0, O), v = w.subarray(O, O * 2);
      return new R(o.fromBytes(I), o.fromBytes(v), A);
    }
    static fromHex(w, x) {
      return this.fromBytes(ui(w), x);
    }
    assertRecovery() {
      const { recovery: w } = this;
      if (w == null)
        throw new Error("invalid recovery id: must be present");
      return w;
    }
    addRecoveryBit(w) {
      return new R(this.r, this.s, w);
    }
    recoverPublicKey(w) {
      const { r: x, s: A } = this, O = this.assertRecovery(), I = O === 2 || O === 3 ? x + a : x;
      if (!s.isValid(I))
        throw new Error("invalid recovery id: sig.r+curve.n != R.x");
      const v = s.toBytes(I), N = e.fromBytes(se(tf((O & 1) === 0), v)), U = o.inv(I), j = W(rt(w, void 0, "msgHash")), M = o.create(-j * U), P = o.create(A * U), F = e.BASE.multiplyUnsafe(M).add(N.multiplyUnsafe(P));
      if (F.is0())
        throw new Error("invalid recovery: point at infinify");
      return F.assertValidity(), F;
    }
    // Signatures should be low-s, to prevent malleability.
    hasHighS() {
      return g(this.s);
    }
    toBytes(w = y.format) {
      if (Ys(w), w === "der")
        return ui(Be.hexFromSig(this));
      const { r: x, s: A } = this, O = o.toBytes(x), I = o.toBytes(A);
      return w === "recovered" ? (S(), se(Uint8Array.of(this.assertRecovery()), O, I)) : se(O, I);
    }
    toHex(w) {
      return Di(this.toBytes(w));
    }
  }
  const C = n.bits2int || function(w) {
    if (w.length > 8192)
      throw new Error("input is too large");
    const x = Vn(w), A = w.length * 8 - c;
    return A > 0 ? x >> BigInt(A) : x;
  }, W = n.bits2int_modN || function(w) {
    return o.create(C(w));
  }, T = Po(c);
  function Q(b) {
    return Kh("num < 2^" + c, b, be, T), o.toBytes(b);
  }
  function L(b, w) {
    return rt(b, void 0, "message"), w ? rt(t(b), void 0, "prehashed message") : b;
  }
  function J(b, w, x) {
    const { lowS: A, prehash: O, extraEntropy: I } = fs(x, y);
    b = L(b, O);
    const v = W(b), N = o.fromBytes(w);
    if (!o.isValidNot0(N))
      throw new Error("invalid private key");
    const U = [Q(N), Q(v)];
    if (I != null && I !== !1) {
      const F = I === !0 ? r(p.secretKey) : I;
      U.push(rt(F, void 0, "extraEntropy"));
    }
    const j = se(...U), M = v;
    function P(F) {
      const Y = C(F);
      if (!o.isValidNot0(Y))
        return;
      const ut = o.inv(Y), K = e.BASE.multiply(Y).toAffine(), X = o.create(K.x);
      if (X === be)
        return;
      const le = o.create(ut * o.create(M + X * N));
      if (le === be)
        return;
      let Mn = (K.x === X ? 0 : 2) | Number(K.y & En), Hn = le;
      return A && g(le) && (Hn = o.neg(le), Mn ^= 1), new R(X, Hn, d ? void 0 : Mn);
    }
    return { seed: j, k2sig: P };
  }
  function at(b, w, x = {}) {
    const { seed: A, k2sig: O } = J(b, w, x);
    return jh(t.outputLen, o.BYTES, i)(A, O).toBytes(x.format);
  }
  function _(b, w, x, A = {}) {
    const { lowS: O, prehash: I, format: v } = fs(A, y);
    if (x = rt(x, void 0, "publicKey"), w = L(w, I), !Uo(b)) {
      const N = b instanceof R ? ", use sig.toBytes()" : "";
      throw new Error("verify expects Uint8Array signature" + N);
    }
    k(b, v);
    try {
      const N = R.fromBytes(b, v), U = e.fromBytes(x);
      if (O && N.hasHighS())
        return !1;
      const { r: j, s: M } = N, P = W(w), F = o.inv(M), Y = o.create(P * F), ut = o.create(j * F), K = e.BASE.multiplyUnsafe(Y).add(U.multiplyUnsafe(ut));
      return K.is0() ? !1 : o.create(K.x) === j;
    } catch {
      return !1;
    }
  }
  function E(b, w, x = {}) {
    const { prehash: A } = fs(x, y);
    return w = L(w, A), R.fromBytes(b, "recovered").recoverPublicKey(w).toBytes();
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
    Signature: R,
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
}, Zp = {
  beta: BigInt("0x7ae96a2b657c07106e64479eac3434e99cf0497512f58995c1396c28719501ee"),
  basises: [
    [BigInt("0x3086d221a7d46bcde86c90e49284eb15"), -BigInt("0xe4437ed6010e88286f547fa90abfe4c3")],
    [BigInt("0x114ca50f7a8e2f3f657c1108d9d44cfd8"), BigInt("0x3086d221a7d46bcde86c90e49284eb15")]
  ]
}, Xp = /* @__PURE__ */ BigInt(0), Zs = /* @__PURE__ */ BigInt(2);
function Qp(e) {
  const t = zi.p, n = BigInt(3), r = BigInt(6), i = BigInt(11), s = BigInt(22), o = BigInt(23), a = BigInt(44), c = BigInt(88), u = e * e * e % t, l = u * u * e % t, f = Mt(l, n, t) * l % t, h = Mt(f, n, t) * l % t, p = Mt(h, Zs, t) * u % t, y = Mt(p, i, t) * p % t, d = Mt(y, s, t) * y % t, g = Mt(d, a, t) * d % t, m = Mt(g, c, t) * g % t, S = Mt(m, a, t) * d % t, k = Mt(S, n, t) * l % t, R = Mt(k, o, t) * y % t, C = Mt(R, r, t) * u % t, W = Mt(C, Zs, t);
  if (!yi.eql(yi.sqr(W), e))
    throw new Error("Cannot find square root");
  return W;
}
const yi = Ki(zi.p, { sqrt: Qp }), hn = /* @__PURE__ */ Gp(zi, {
  Fp: yi,
  endo: Zp
}), rc = /* @__PURE__ */ Yp(hn, qs), ic = {};
function wi(e, ...t) {
  let n = ic[e];
  if (n === void 0) {
    const r = qs(Hh(e));
    n = se(r, r), ic[e] = n;
  }
  return qs(se(n, ...t));
}
const Ho = (e) => e.toBytes(!0).slice(1), Fo = (e) => e % Zs === Xp;
function Xs(e) {
  const { Fn: t, BASE: n } = hn, r = t.fromBytes(e), i = n.multiply(r);
  return { scalar: Fo(i.y) ? r : t.neg(r), bytes: Ho(i) };
}
function nf(e) {
  const t = yi;
  if (!t.isValidNot0(e))
    throw new Error("invalid x: Fail if x ≥ p");
  const n = t.create(e * e), r = t.create(n * e + BigInt(7));
  let i = t.sqrt(r);
  Fo(i) || (i = t.neg(i));
  const s = hn.fromAffine({ x: e, y: i });
  return s.assertValidity(), s;
}
const tr = Vn;
function rf(...e) {
  return hn.Fn.create(tr(wi("BIP0340/challenge", ...e)));
}
function sc(e) {
  return Xs(e).bytes;
}
function Jp(e, t, n = Vi(32)) {
  const { Fn: r } = hn, i = rt(e, void 0, "message"), { bytes: s, scalar: o } = Xs(t), a = rt(n, 32, "auxRand"), c = r.toBytes(o ^ tr(wi("BIP0340/aux", a))), u = wi("BIP0340/nonce", c, s, i), { bytes: l, scalar: f } = Xs(u), h = rf(l, s, i), p = new Uint8Array(64);
  if (p.set(l, 0), p.set(r.toBytes(r.create(f + h * o)), 32), !sf(p, i, s))
    throw new Error("sign: Invalid signature produced");
  return p;
}
function sf(e, t, n) {
  const { Fp: r, Fn: i, BASE: s } = hn, o = rt(e, 64, "signature"), a = rt(t, void 0, "message"), c = rt(n, 32, "publicKey");
  try {
    const u = nf(tr(c)), l = tr(o.subarray(0, 32));
    if (!r.isValidNot0(l))
      return !1;
    const f = tr(o.subarray(32, 64));
    if (!i.isValidNot0(f))
      return !1;
    const h = rf(i.toBytes(l), Ho(u), a), p = s.multiplyUnsafe(f).add(u.multiplyUnsafe(i.neg(h))), { x: y, y: d } = p.toAffine();
    return !(p.is0() || !Fo(d) || y !== l);
  } catch {
    return !1;
  }
}
const Ko = /* @__PURE__ */ (() => {
  const n = (r = Vi(48)) => Gl(r, zi.n);
  return {
    keygen: Zl(n, sc),
    getPublicKey: sc,
    sign: Jp,
    verify: sf,
    Point: hn,
    utils: {
      randomSecretKey: n,
      taggedHash: wi,
      lift_x: nf,
      pointToBytes: Ho
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
function zo(e, t, n = {}) {
  e = Hs(e);
  const { aggPublicKey: r } = Fs(e);
  if (!n.taprootTweak)
    return {
      preTweakedKey: r.toBytes(!0),
      finalKey: r.toBytes(!0)
    };
  const i = Ko.utils.taggedHash("TapTweak", r.toBytes(!0).subarray(1), n.taprootTweak ?? new Uint8Array(0)), { aggPublicKey: s } = Fs(e, [i], [!0]);
  return {
    preTweakedKey: r.toBytes(!0),
    finalKey: s.toBytes(!0)
  };
}
class Br extends Error {
  constructor(t) {
    super(t), this.name = "PartialSignatureError";
  }
}
class jo {
  constructor(t, n) {
    if (this.s = t, this.R = n, t.length !== 32)
      throw new Br("Invalid s length");
    if (n.length !== 33)
      throw new Br("Invalid R length");
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
      throw new Br("Invalid partial signature length");
    if (Vn(t) >= It.CURVE().n)
      throw new Br("s value overflows curve order");
    const r = new Uint8Array(33);
    return new jo(t, r);
  }
}
function tg(e, t, n, r, i, s) {
  let o;
  if (s?.taprootTweak !== void 0) {
    const { preTweakedKey: u } = zo(Hs(r));
    o = Ko.utils.taggedHash("TapTweak", u.subarray(1), s.taprootTweak);
  }
  const c = new Uh(n, Hs(r), i, o ? [o] : void 0, o ? [!0] : void 0).sign(e, t);
  return jo.decode(c);
}
var ds, oc;
function eg() {
  if (oc) return ds;
  oc = 1;
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
  return ds = { decode: c, encode: u }, ds;
}
var Qs = eg(), Pt;
(function(e) {
  e.VtxoTaprootTree = "taptree", e.VtxoTreeExpiry = "expiry", e.Cosigner = "cosigner", e.ConditionWitness = "condition";
})(Pt || (Pt = {}));
const Wo = 222;
function ng(e, t, n, r) {
  e.updateInput(t, {
    unknown: [
      ...e.getInput(t)?.unknown ?? [],
      n.encode(r)
    ]
  });
}
function Js(e, t, n) {
  const r = e.getInput(t)?.unknown ?? [], i = [];
  for (const s of r) {
    const o = n.decode(s);
    o && i.push(o);
  }
  return i;
}
const of = {
  key: Pt.VtxoTaprootTree,
  encode: (e) => [
    {
      type: Wo,
      key: ji[Pt.VtxoTaprootTree]
    },
    e
  ],
  decode: (e) => Go(() => qo(e[0], Pt.VtxoTaprootTree) ? e[1] : null)
}, rg = {
  key: Pt.ConditionWitness,
  encode: (e) => [
    {
      type: Wo,
      key: ji[Pt.ConditionWitness]
    },
    or.encode(e)
  ],
  decode: (e) => Go(() => qo(e[0], Pt.ConditionWitness) ? or.decode(e[1]) : null)
}, to = {
  key: Pt.Cosigner,
  encode: (e) => [
    {
      type: Wo,
      key: new Uint8Array([
        ...ji[Pt.Cosigner],
        e.index
      ])
    },
    e.key
  ],
  decode: (e) => Go(() => qo(e[0], Pt.Cosigner) ? {
    index: e[0].key[e[0].key.length - 1],
    key: e[1]
  } : null)
};
Pt.VtxoTreeExpiry;
const ji = Object.fromEntries(Object.values(Pt).map((e) => [
  e,
  new TextEncoder().encode(e)
])), Go = (e) => {
  try {
    return e();
  } catch {
    return null;
  }
};
function qo(e, t) {
  const n = $.encode(ji[t]);
  return $.encode(new Uint8Array([e.type, ...e.key])).includes(n);
}
const $r = new Error("missing vtxo graph");
class fr {
  constructor(t) {
    this.secretKey = t, this.myNonces = null, this.aggregateNonces = null, this.graph = null, this.scriptRoot = null, this.rootSharedOutputAmount = null;
  }
  static random() {
    const t = Rs();
    return new fr(t);
  }
  async init(t, n, r) {
    this.graph = t, this.scriptRoot = n, this.rootSharedOutputAmount = r;
  }
  async getPublicKey() {
    return rc.getPublicKey(this.secretKey);
  }
  async getNonces() {
    if (!this.graph)
      throw $r;
    this.myNonces || (this.myNonces = this.generateNonces());
    const t = /* @__PURE__ */ new Map();
    for (const [n, r] of this.myNonces)
      t.set(n, { pubNonce: r.pubNonce });
    return t;
  }
  async aggregatedNonces(t, n) {
    if (!this.graph)
      throw $r;
    if (this.aggregateNonces || (this.aggregateNonces = /* @__PURE__ */ new Map()), this.myNonces || await this.getNonces(), this.aggregateNonces.has(t))
      return {
        hasAllNonces: this.aggregateNonces.size === this.myNonces?.size
      };
    const r = this.myNonces.get(t);
    if (!r)
      throw new Error(`missing nonce for txid ${t}`);
    const i = await this.getPublicKey();
    n.set($.encode(i.subarray(1)), r);
    const s = this.graph.find(t);
    if (!s)
      throw new Error(`missing tx for txid ${t}`);
    const o = Js(s.root, 0, to).map(
      (u) => $.encode(u.key.subarray(1))
      // xonly pubkey
    ), a = [];
    for (const u of o) {
      const l = n.get(u);
      if (!l)
        throw new Error(`missing nonce for cosigner ${u}`);
      a.push(l.pubNonce);
    }
    const c = Ch(a);
    return this.aggregateNonces.set(t, { pubNonce: c }), {
      hasAllNonces: this.aggregateNonces.size === this.myNonces?.size
    };
  }
  async sign() {
    if (!this.graph)
      throw $r;
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
      throw $r;
    const t = /* @__PURE__ */ new Map(), n = rc.getPublicKey(this.secretKey);
    for (const r of this.graph.iterator()) {
      const i = Lh(n);
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
    const i = [], s = [], o = Js(t.root, 0, to).map((u) => u.key), { finalKey: a } = zo(o, !0, {
      taprootTweak: this.scriptRoot
    });
    for (let u = 0; u < t.root.inputsLength; u++) {
      const l = ig(a, this.graph, this.rootSharedOutputAmount, t.root);
      i.push(l.amount), s.push(l.script);
    }
    const c = t.root.preimageWitnessV1(
      0,
      // always first input
      s,
      an.DEFAULT,
      i
    );
    return tg(n.secNonce, this.secretKey, r.pubNonce, o, c, {
      taprootTweak: this.scriptRoot
    });
  }
}
fr.NOT_INITIALIZED = new Error("session not initialized, call init method");
function ig(e, t, n, r) {
  const i = z.encode(["OP_1", e.slice(1)]);
  if (r.id === t.txid)
    return {
      amount: n,
      script: i
    };
  const s = r.getInput(0);
  if (!s.txid)
    throw new Error("missing parent input txid");
  const o = $.encode(s.txid), a = t.find(o);
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
const ac = Object.values(an).filter((e) => typeof e == "number");
class er {
  constructor(t) {
    this.key = t || Rs();
  }
  static fromPrivateKey(t) {
    return new er(t);
  }
  static fromHex(t) {
    return new er($.decode(t));
  }
  static fromRandomBytes() {
    return new er(Rs());
  }
  /**
   * Export the private key as a hex string.
   *
   * @returns The private key as a hex string
   */
  toHex() {
    return $.encode(this.key);
  }
  async sign(t, n) {
    const r = t.clone();
    if (!n) {
      try {
        if (!r.sign(this.key, ac))
          throw new Error("Failed to sign transaction");
      } catch (i) {
        if (!(i instanceof Error && i.message.includes("No inputs signed"))) throw i;
      }
      return r;
    }
    for (const i of n)
      if (!r.signIdx(this.key, i, ac))
        throw new Error(`Failed to sign input #${i}`);
    return r;
  }
  compressedPublicKey() {
    return Promise.resolve(Mu(this.key, !0));
  }
  xOnlyPublicKey() {
    return Promise.resolve(So(this.key));
  }
  signerSession() {
    return fr.random();
  }
  async signMessage(t, n = "schnorr") {
    return n === "ecdsa" ? pp(t, this.key, { prehash: !1 }) : xp.signAsync(t, this.key);
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
class rn {
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
    return new rn(s, o, n.prefix, i);
  }
  encode() {
    const t = new Uint8Array(65);
    t[0] = this.version, t.set(this.serverPubKey, 1), t.set(this.vtxoTaprootKey, 33);
    const n = pn.toWords(t);
    return pn.encode(this.hrp, n, 1023);
  }
  // pkScript is the script that should be used to send non-dust funds to the address
  get pkScript() {
    return z.encode(["OP_1", this.vtxoTaprootKey]);
  }
  // subdustPkScript is the script that should be used to send sub-dust funds to the address
  get subdustPkScript() {
    return z.encode(["RETURN", this.vtxoTaprootKey]);
  }
}
const mi = Io(void 0, !0);
var pt;
(function(e) {
  e.Multisig = "multisig", e.CSVMultisig = "csv-multisig", e.ConditionCSVMultisig = "condition-csv-multisig", e.ConditionMultisig = "condition-multisig", e.CLTVMultisig = "cltv-multisig";
})(pt || (pt = {}));
function af(e) {
  const t = [
    te,
    _t,
    dr,
    bi,
    Rn
  ];
  for (const n of t)
    try {
      return n.decode(e);
    } catch {
      continue;
    }
  throw new Error(`Failed to decode: script ${$.encode(e)} is not a valid tapscript`);
}
var te;
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
        type: pt.Multisig,
        params: a,
        script: Th(a.pubkeys.length, a.pubkeys).script
      };
    const c = [];
    for (let u = 0; u < a.pubkeys.length; u++)
      c.push(a.pubkeys[u]), u < a.pubkeys.length - 1 ? c.push("CHECKSIGVERIFY") : c.push("CHECKSIG");
    return {
      type: pt.Multisig,
      params: a,
      script: z.encode(c)
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
    const c = z.decode(a), u = [];
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
    if ($.encode(f.script) !== $.encode(a))
      throw new Error("Invalid script format: script reconstruction mismatch");
    return {
      type: pt.Multisig,
      params: { pubkeys: u, type: t.CHECKSIGADD },
      script: a
    };
  }
  function s(a) {
    const c = z.decode(a), u = [];
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
    if ($.encode(l.script) !== $.encode(a))
      throw new Error("Invalid script format: script reconstruction mismatch");
    return {
      type: pt.Multisig,
      params: { pubkeys: u, type: t.CHECKSIG },
      script: a
    };
  }
  function o(a) {
    return a.type === pt.Multisig;
  }
  e.is = o;
})(te || (te = {}));
var _t;
(function(e) {
  function t(i) {
    for (const u of i.pubkeys)
      if (u.length !== 32)
        throw new Error(`Invalid pubkey length: expected 32, got ${u.length}`);
    const s = mi.encode(BigInt(Qs.encode(i.timelock.type === "blocks" ? { blocks: Number(i.timelock.value) } : { seconds: Number(i.timelock.value) }))), o = [
      s.length === 1 ? s[0] : s,
      "CHECKSEQUENCEVERIFY",
      "DROP"
    ], a = te.encode(i), c = new Uint8Array([
      ...z.encode(o),
      ...a.script
    ]);
    return {
      type: pt.CSVMultisig,
      params: i,
      script: c
    };
  }
  e.encode = t;
  function n(i) {
    if (i.length === 0)
      throw new Error("Failed to decode: script is empty");
    const s = z.decode(i);
    if (s.length < 3)
      throw new Error("Invalid script: too short (expected at least 3)");
    const o = s[0];
    if (typeof o == "string")
      throw new Error("Invalid script: expected sequence number");
    if (s[1] !== "CHECKSEQUENCEVERIFY" || s[2] !== "DROP")
      throw new Error("Invalid script: expected CHECKSEQUENCEVERIFY DROP");
    const a = new Uint8Array(z.encode(s.slice(3)));
    let c;
    try {
      c = te.decode(a);
    } catch (p) {
      throw new Error(`Invalid multisig script: ${p instanceof Error ? p.message : String(p)}`);
    }
    let u;
    typeof o == "number" ? u = o : u = Number(mi.decode(o));
    const l = Qs.decode(u), f = l.blocks !== void 0 ? { type: "blocks", value: BigInt(l.blocks) } : { type: "seconds", value: BigInt(l.seconds) }, h = t({
      timelock: f,
      ...c.params
    });
    if ($.encode(h.script) !== $.encode(i))
      throw new Error("Invalid script format: script reconstruction mismatch");
    return {
      type: pt.CSVMultisig,
      params: {
        timelock: f,
        ...c.params
      },
      script: i
    };
  }
  e.decode = n;
  function r(i) {
    return i.type === pt.CSVMultisig;
  }
  e.is = r;
})(_t || (_t = {}));
var dr;
(function(e) {
  function t(i) {
    const s = new Uint8Array([
      ...i.conditionScript,
      ...z.encode(["VERIFY"]),
      ..._t.encode(i).script
    ]);
    return {
      type: pt.ConditionCSVMultisig,
      params: i,
      script: s
    };
  }
  e.encode = t;
  function n(i) {
    if (i.length === 0)
      throw new Error("Failed to decode: script is empty");
    const s = z.decode(i);
    if (s.length < 1)
      throw new Error("Invalid script: too short (expected at least 1)");
    let o = -1;
    for (let f = s.length - 1; f >= 0; f--)
      s[f] === "VERIFY" && (o = f);
    if (o === -1)
      throw new Error("Invalid script: missing VERIFY operation");
    const a = new Uint8Array(z.encode(s.slice(0, o))), c = new Uint8Array(z.encode(s.slice(o + 1)));
    let u;
    try {
      u = _t.decode(c);
    } catch (f) {
      throw new Error(`Invalid CSV multisig script: ${f instanceof Error ? f.message : String(f)}`);
    }
    const l = t({
      conditionScript: a,
      ...u.params
    });
    if ($.encode(l.script) !== $.encode(i))
      throw new Error("Invalid script format: script reconstruction mismatch");
    return {
      type: pt.ConditionCSVMultisig,
      params: {
        conditionScript: a,
        ...u.params
      },
      script: i
    };
  }
  e.decode = n;
  function r(i) {
    return i.type === pt.ConditionCSVMultisig;
  }
  e.is = r;
})(dr || (dr = {}));
var bi;
(function(e) {
  function t(i) {
    const s = new Uint8Array([
      ...i.conditionScript,
      ...z.encode(["VERIFY"]),
      ...te.encode(i).script
    ]);
    return {
      type: pt.ConditionMultisig,
      params: i,
      script: s
    };
  }
  e.encode = t;
  function n(i) {
    if (i.length === 0)
      throw new Error("Failed to decode: script is empty");
    const s = z.decode(i);
    if (s.length < 1)
      throw new Error("Invalid script: too short (expected at least 1)");
    let o = -1;
    for (let f = s.length - 1; f >= 0; f--)
      s[f] === "VERIFY" && (o = f);
    if (o === -1)
      throw new Error("Invalid script: missing VERIFY operation");
    const a = new Uint8Array(z.encode(s.slice(0, o))), c = new Uint8Array(z.encode(s.slice(o + 1)));
    let u;
    try {
      u = te.decode(c);
    } catch (f) {
      throw new Error(`Invalid multisig script: ${f instanceof Error ? f.message : String(f)}`);
    }
    const l = t({
      conditionScript: a,
      ...u.params
    });
    if ($.encode(l.script) !== $.encode(i))
      throw new Error("Invalid script format: script reconstruction mismatch");
    return {
      type: pt.ConditionMultisig,
      params: {
        conditionScript: a,
        ...u.params
      },
      script: i
    };
  }
  e.decode = n;
  function r(i) {
    return i.type === pt.ConditionMultisig;
  }
  e.is = r;
})(bi || (bi = {}));
var Rn;
(function(e) {
  function t(i) {
    const s = mi.encode(i.absoluteTimelock), o = [
      s.length === 1 ? s[0] : s,
      "CHECKLOCKTIMEVERIFY",
      "DROP"
    ], a = z.encode(o), c = new Uint8Array([
      ...a,
      ...te.encode(i).script
    ]);
    return {
      type: pt.CLTVMultisig,
      params: i,
      script: c
    };
  }
  e.encode = t;
  function n(i) {
    if (i.length === 0)
      throw new Error("Failed to decode: script is empty");
    const s = z.decode(i);
    if (s.length < 3)
      throw new Error("Invalid script: too short (expected at least 3)");
    const o = s[0];
    if (typeof o == "string" || typeof o == "number")
      throw new Error("Invalid script: expected locktime number");
    if (s[1] !== "CHECKLOCKTIMEVERIFY" || s[2] !== "DROP")
      throw new Error("Invalid script: expected CHECKLOCKTIMEVERIFY DROP");
    const a = new Uint8Array(z.encode(s.slice(3)));
    let c;
    try {
      c = te.decode(a);
    } catch (f) {
      throw new Error(`Invalid multisig script: ${f instanceof Error ? f.message : String(f)}`);
    }
    const u = mi.decode(o), l = t({
      absoluteTimelock: u,
      ...c.params
    });
    if ($.encode(l.script) !== $.encode(i))
      throw new Error("Invalid script format: script reconstruction mismatch");
    return {
      type: pt.CLTVMultisig,
      params: {
        absoluteTimelock: u,
        ...c.params
      },
      script: i
    };
  }
  e.decode = n;
  function r(i) {
    return i.type === pt.CLTVMultisig;
  }
  e.is = r;
})(Rn || (Rn = {}));
const cc = ar.tapTree[2];
function nr(e) {
  return e[1].subarray(0, e[1].length - 1);
}
class Kt {
  static decode(t) {
    const r = cc.decode(t).map((i) => i.script);
    return new Kt(r);
  }
  constructor(t) {
    this.scripts = t;
    const n = t.length % 2 !== 0 ? t.slice().reverse() : t, r = qu(n.map((s) => ({
      script: s,
      leafVersion: cr
    }))), i = xh(Ao, r, void 0, !0);
    if (!i.tapLeafScript || i.tapLeafScript.length !== t.length)
      throw new Error("invalid scripts");
    this.leaves = i.tapLeafScript, this.tweakedPublicKey = i.tweakedPubkey;
  }
  encode() {
    return cc.encode(this.scripts.map((n) => ({
      depth: 1,
      version: cr,
      script: n
    })));
  }
  address(t, n) {
    return new rn(n, this.tweakedPublicKey, t);
  }
  get pkScript() {
    return z.encode(["OP_1", this.tweakedPublicKey]);
  }
  onchainAddress(t) {
    return on(t).encode({
      type: "tr",
      pubkey: this.tweakedPublicKey
    });
  }
  findLeaf(t) {
    const n = this.leaves.find((r) => $.encode(nr(r)) === t);
    if (!n)
      throw new Error(`leaf '${t}' not found`);
    return n;
  }
  exitPaths() {
    const t = [];
    for (const n of this.leaves)
      try {
        const r = _t.decode(nr(n));
        t.push(r);
        continue;
      } catch {
        try {
          const i = dr.decode(nr(n));
          t.push(i);
        } catch {
          continue;
        }
      }
    return t;
  }
}
var uc;
(function(e) {
  class t extends Kt {
    constructor(i) {
      n(i);
      const { sender: s, receiver: o, server: a, preimageHash: c, refundLocktime: u, unilateralClaimDelay: l, unilateralRefundDelay: f, unilateralRefundWithoutReceiverDelay: h } = i, p = sg(c), y = bi.encode({
        conditionScript: p,
        pubkeys: [o, a]
      }).script, d = te.encode({
        pubkeys: [s, o, a]
      }).script, g = Rn.encode({
        absoluteTimelock: u,
        pubkeys: [s, a]
      }).script, m = dr.encode({
        conditionScript: p,
        timelock: l,
        pubkeys: [o]
      }).script, S = _t.encode({
        timelock: f,
        pubkeys: [s, o]
      }).script, k = _t.encode({
        timelock: h,
        pubkeys: [s]
      }).script;
      super([
        y,
        d,
        g,
        m,
        S,
        k
      ]), this.options = i, this.claimScript = $.encode(y), this.refundScript = $.encode(d), this.refundWithoutReceiverScript = $.encode(g), this.unilateralClaimScript = $.encode(m), this.unilateralRefundScript = $.encode(S), this.unilateralRefundWithoutReceiverScript = $.encode(k);
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
})(uc || (uc = {}));
function sg(e) {
  return z.encode(["HASH160", e, "EQUAL"]);
}
var Ei;
(function(e) {
  class t extends Kt {
    constructor(r) {
      const { pubKey: i, serverPubKey: s, csvTimelock: o = t.DEFAULT_TIMELOCK } = r, a = te.encode({
        pubkeys: [i, s]
      }).script, c = _t.encode({
        timelock: o,
        pubkeys: [i]
      }).script;
      super([a, c]), this.options = r, this.forfeitScript = $.encode(a), this.exitScript = $.encode(c);
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
})(Ei || (Ei = {}));
var ye;
(function(e) {
  e.TxSent = "SENT", e.TxReceived = "RECEIVED";
})(ye || (ye = {}));
function Re(e) {
  return !e.isSpent;
}
function Yo(e) {
  return e.virtualStatus.state === "swept" && Re(e);
}
function cf(e) {
  if (e.virtualStatus.state === "swept")
    return !0;
  const t = e.virtualStatus.batchExpiry;
  return !t || new Date(t).getFullYear() < 2025 ? !1 : t <= Date.now();
}
function uf(e, t) {
  return e.value < t;
}
async function* eo(e) {
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
class lf extends Error {
  constructor(t, n, r, i) {
    super(n), this.code = t, this.message = n, this.name = r, this.metadata = i;
  }
}
function og(e) {
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
      return "metadata" in n && ag(n.metadata) && (a = n.metadata), new lf(i, s, o, a);
    }
    return;
  } catch {
    return;
  }
}
function ag(e) {
  return typeof e == "object" && e !== null && !Array.isArray(e);
}
var Ce;
(function(e) {
  function t(i, s, o = []) {
    if (typeof i != "string" && (i = r(i)), s.length == 0)
      throw new Error("intent proof requires at least one input");
    hg(s), gg(o);
    const a = yg(i, s[0].witnessUtxo.script);
    return wg(a, s, o);
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
})(Ce || (Ce = {}));
const cg = new Uint8Array([gt.RETURN]), ug = new Uint8Array(32).fill(0), lg = 4294967295, fg = "ark-intent-proof-message";
function dg(e) {
  if (e.index === void 0)
    throw new Error("intent proof input requires index");
  if (e.txid === void 0)
    throw new Error("intent proof input requires txid");
  if (e.witnessUtxo === void 0)
    throw new Error("intent proof input requires witness utxo");
  return !0;
}
function hg(e) {
  return e.forEach(dg), !0;
}
function pg(e) {
  if (e.amount === void 0)
    throw new Error("intent proof output requires amount");
  if (e.script === void 0)
    throw new Error("intent proof output requires script");
  return !0;
}
function gg(e) {
  return e.forEach(pg), !0;
}
function yg(e, t) {
  const n = mg(e), r = new He({
    version: 0
  });
  return r.addInput({
    txid: ug,
    // zero hash
    index: lg,
    sequence: 0
  }), r.addOutput({
    amount: 0n,
    script: t
  }), r.updateInput(0, {
    finalScriptSig: z.encode(["OP_0", n])
  }), r;
}
function wg(e, t, n) {
  const r = t[0], i = t.map((o) => o.sequence || 0).reduce((o, a) => Math.max(o, a), 0), s = new He({
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
    sighashType: an.ALL
  });
  for (const [o, a] of t.entries())
    s.addInput({
      ...a,
      sighashType: an.ALL
    }), a.unknown?.length && s.updateInput(o + 1, {
      unknown: a.unknown
    });
  n.length === 0 && (n = [
    {
      amount: 0n,
      script: cg
    }
  ]);
  for (const o of n)
    s.addOutput({
      amount: o.amount,
      script: o.script
    });
  return s;
}
function mg(e) {
  return Ko.utils.taggedHash(fg, new TextEncoder().encode(e));
}
var wt;
(function(e) {
  e.BatchStarted = "batch_started", e.BatchFinalization = "batch_finalization", e.BatchFinalized = "batch_finalized", e.BatchFailed = "batch_failed", e.TreeSigningStarted = "tree_signing_started", e.TreeNonces = "tree_nonces", e.TreeTx = "tree_tx", e.TreeSignature = "tree_signature";
})(wt || (wt = {}));
class ff {
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
          message: Ce.encodeMessage(t.message)
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
          message: Ce.encodeMessage(t.message)
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
        treeNonces: bg(r)
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
        treeSignatures: Eg(r)
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
          for await (const a of eo(s)) {
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
        if (no(s)) {
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
          for await (const s of eo(r)) {
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
        if (no(r)) {
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
          message: Ce.encodeMessage(t.message)
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
        nonces: xg(t.treeNonces.nonces)
        // pubkey -> public nonce
      };
    if (t.treeTx) {
      const n = Object.fromEntries(Object.entries(t.treeTx.children).map(([r, i]) => [parseInt(r), i]));
      return {
        type: wt.TreeTx,
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
        spentVtxos: t.commitmentTx.spentVtxos.map(Nr),
        spendableVtxos: t.commitmentTx.spendableVtxos.map(Nr),
        checkpointTxs: t.commitmentTx.checkpointTxs
      }
    } : t.arkTx ? {
      arkTx: {
        txid: t.arkTx.txid,
        tx: t.arkTx.tx,
        spentVtxos: t.arkTx.spentVtxos.map(Nr),
        spendableVtxos: t.arkTx.spendableVtxos.map(Nr),
        checkpointTxs: t.arkTx.checkpointTxs
      }
    } : (t.heartbeat || console.warn("Unknown transaction notification type:", t), null);
  }
}
function bg(e) {
  const t = {};
  for (const [n, r] of e)
    t[n] = $.encode(r.pubNonce);
  return t;
}
function Eg(e) {
  const t = {};
  for (const [n, r] of e)
    t[n] = $.encode(r.encode());
  return t;
}
function xg(e) {
  return new Map(Object.entries(e).map(([t, n]) => {
    if (typeof n != "string")
      throw new Error("invalid nonce");
    return [t, { pubNonce: $.decode(n) }];
  }));
}
function no(e) {
  const t = (n) => n instanceof Error ? n.name === "TypeError" && n.message === "Failed to fetch" || n.name === "HeadersTimeoutError" || n.name === "BodyTimeoutError" || n.code === "UND_ERR_HEADERS_TIMEOUT" || n.code === "UND_ERR_BODY_TIMEOUT" : !1;
  return t(e) || t(e.cause);
}
function Nr(e) {
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
  throw og(n) ?? new Error(t);
}
class Kr {
  constructor(t, n = /* @__PURE__ */ new Map()) {
    this.root = t, this.children = n;
  }
  static create(t) {
    if (t.length === 0)
      throw new Error("empty chunks");
    const n = /* @__PURE__ */ new Map();
    for (const s of t) {
      const o = Sg(s), a = o.tx.id;
      n.set(a, o);
    }
    const r = [];
    for (const [s] of n) {
      let o = !1;
      for (const [a, c] of n)
        if (a !== s && (o = Tg(c, s), o))
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
    const i = df(r[0], n);
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
      if (!s.txid || $.encode(s.txid) !== o || s.index !== r)
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
function Tg(e, t) {
  return Object.values(e.children).includes(t);
}
function df(e, t) {
  const n = t.get(e);
  if (!n)
    return null;
  const r = n.tx, i = /* @__PURE__ */ new Map();
  for (const [s, o] of Object.entries(n.children)) {
    const a = parseInt(s), c = df(o, t);
    c && i.set(a, c);
  }
  return new Kr(r, i);
}
function Sg(e) {
  return { tx: qt.fromPSBT(Et.decode(e.tx)), children: e.children };
}
var ro;
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
        case wt.BatchStarted: {
          const d = y, { skip: g } = await i.onBatchStarted(d);
          g || (u = t.BatchStarted, a && (u = t.TreeNoncesAggregated));
          continue;
        }
        case wt.BatchFinalized: {
          if (u !== t.BatchFinalization)
            continue;
          return i.onBatchFinalized && await i.onBatchFinalized(y), y.commitmentTxid;
        }
        case wt.BatchFailed: {
          if (i.onBatchFailed) {
            await i.onBatchFailed(y);
            continue;
          }
          throw new Error(y.reason);
        }
        case wt.TreeTx: {
          if (u !== t.BatchStarted && u !== t.TreeNoncesAggregated)
            continue;
          y.batchIndex === 0 ? l.push(y.chunk) : f.push(y.chunk), i.onTreeTxEvent && await i.onTreeTxEvent(y);
          continue;
        }
        case wt.TreeSignature: {
          if (u !== t.TreeNoncesAggregated)
            continue;
          if (!h)
            throw new Error("vtxo tree not initialized");
          const d = $.decode(y.signature);
          h.update(y.txid, (g) => {
            g.updateInput(0, {
              tapKeySig: d
            });
          }), i.onTreeSignatureEvent && await i.onTreeSignatureEvent(y);
          continue;
        }
        case wt.TreeSigningStarted: {
          if (u !== t.BatchStarted)
            continue;
          h = Kr.create(l);
          const { skip: d } = await i.onTreeSigningStarted(y, h);
          d || (u = t.TreeSigningStarted);
          continue;
        }
        case wt.TreeNonces: {
          if (u !== t.TreeSigningStarted)
            continue;
          const { fullySigned: d } = await i.onTreeNonces(y);
          d && (u = t.TreeNoncesAggregated);
          continue;
        }
        case wt.BatchFinalization: {
          if (u !== t.TreeNoncesAggregated)
            continue;
          if (!h && l.length > 0 && (h = Kr.create(l)), !h && !a)
            throw new Error("vtxo tree not initialized");
          f.length > 0 && (p = Kr.create(f)), await i.onBatchFinalization(y, h, p), u = t.BatchFinalization;
          continue;
        }
        default:
          continue;
      }
    }
    throw new Error("event stream closed");
  }
  e.join = n;
})(ro || (ro = {}));
const vg = (e) => Ag[e], Ag = {
  bitcoin: Wn(kn, "ark"),
  testnet: Wn(vr, "tark"),
  signet: Wn(vr, "tark"),
  mutinynet: Wn(vr, "tark"),
  regtest: Wn({
    ...vr,
    bech32: "bcrt",
    pubKeyHash: 111,
    scriptHash: 196
  }, "tark")
};
function Wn(e, t) {
  return {
    ...e,
    hrp: t
  };
}
const Ig = {
  bitcoin: "https://mempool.space/api",
  testnet: "https://mempool.space/testnet/api",
  signet: "https://mempool.space/signet/api",
  mutinynet: "https://mutinynet.com/api",
  regtest: "http://localhost:3000"
};
class kg {
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
              f[h][p] && u.push(...f[h][p].filter(Bg));
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
    if (!Og(n))
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
function Og(e) {
  return Array.isArray(e) && e.every((t) => {
    t && typeof t == "object" && typeof t.id == "string" && t.id.length > 0 && typeof t.height == "number" && t.height >= 0 && typeof t.mediantime == "number" && t.mediantime > 0;
  });
}
const Bg = (e) => typeof e.txid == "string" && Array.isArray(e.vout) && e.vout.every((t) => typeof t.scriptpubkey_address == "string" && typeof t.value == "number") && typeof e.status == "object" && typeof e.status.confirmed == "boolean", $g = 0n, Ng = new Uint8Array([81, 2, 78, 115]), Zo = {
  script: Ng,
  amount: $g
};
$.encode(Zo.script);
function Rg(e, t, n) {
  const r = new He({
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
  }), r.addOutput(Zo), r;
}
const Ug = new Error("invalid settlement transaction outputs"), Lg = new Error("empty tree"), Cg = new Error("invalid number of inputs"), hs = new Error("wrong settlement txid"), Pg = new Error("invalid amount"), _g = new Error("no leaves"), Dg = new Error("invalid taproot script"), lc = new Error("invalid round transaction outputs"), Vg = new Error("wrong commitment txid"), Mg = new Error("missing cosigners public keys"), ps = 0, fc = 1;
function Hg(e, t) {
  if (t.validate(), t.root.inputsLength !== 1)
    throw Cg;
  const n = t.root.getInput(0), r = qt.fromPSBT(Et.decode(e));
  if (r.outputsLength <= fc)
    throw Ug;
  const i = r.id;
  if (!n.txid || $.encode(n.txid) !== i || n.index !== fc)
    throw hs;
}
function Fg(e, t, n) {
  if (t.outputsLength < ps + 1)
    throw lc;
  const r = t.getOutput(ps)?.amount;
  if (!r)
    throw lc;
  if (!e.root)
    throw Lg;
  const i = e.root.getInput(0), s = t.id;
  if (!i.txid || $.encode(i.txid) !== s || i.index !== ps)
    throw Vg;
  let o = 0n;
  for (let c = 0; c < e.root.outputsLength; c++) {
    const u = e.root.getOutput(c);
    u?.amount && (o += u.amount);
  }
  if (o !== r)
    throw Pg;
  if (e.leaves().length === 0)
    throw _g;
  e.validate();
  for (const c of e.iterator())
    for (const [u, l] of c.children) {
      const f = c.root.getOutput(u);
      if (!f?.script)
        throw new Error(`parent output ${u} not found`);
      const h = f.script.slice(2);
      if (h.length !== 32)
        throw new Error(`parent output ${u} has invalid script`);
      const p = Js(l.root, 0, to);
      if (p.length === 0)
        throw Mg;
      const y = p.map((g) => g.key), { finalKey: d } = zo(y, !0, {
        taprootTweak: n
      });
      if (!d || $.encode(d.slice(1)) !== $.encode(h))
        throw Dg;
    }
}
function Kg(e, t, n) {
  let r = !1;
  for (const [o, a] of t.entries()) {
    if (!a.script)
      throw new Error(`missing output script ${o}`);
    if (z.decode(a.script)[0] === "RETURN") {
      if (r)
        throw new Error("multiple OP_RETURN outputs");
      r = !0;
    }
  }
  const i = e.map((o) => zg(o, n));
  return {
    arkTx: hf(i.map((o) => o.input), t),
    checkpoints: i.map((o) => o.tx)
  };
}
function hf(e, t) {
  let n = 0n;
  for (const i of e) {
    const s = af(nr(i.tapLeafScript));
    if (Rn.is(s)) {
      if (n !== 0n && dc(n) !== dc(s.params.absoluteTimelock))
        throw new Error("cannot mix seconds and blocks locktime");
      s.params.absoluteTimelock > n && (n = s.params.absoluteTimelock);
    }
  }
  const r = new He({
    version: 3,
    lockTime: Number(n)
  });
  for (const [i, s] of e.entries())
    r.addInput({
      txid: s.txid,
      index: s.vout,
      sequence: n ? No - 1 : void 0,
      witnessUtxo: {
        script: Kt.decode(s.tapTree).pkScript,
        amount: BigInt(s.value)
      },
      tapLeafScript: [s.tapLeafScript]
    }), ng(r, i, of, s.tapTree);
  for (const i of t)
    r.addOutput(i);
  return r.addOutput(Zo), r;
}
function zg(e, t) {
  const n = af(nr(e.tapLeafScript)), r = new Kt([
    t.script,
    n.script
  ]), i = hf([e], [
    {
      amount: BigInt(e.value),
      script: r.pkScript
    }
  ]), s = r.findLeaf($.encode(n.script)), o = {
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
const jg = 500000000n;
function dc(e) {
  return e >= jg;
}
function Wg(e, t) {
  if (!e.status.block_time)
    return !1;
  if (t.value === 0n)
    return !0;
  if (t.type === "blocks")
    return !1;
  const n = BigInt(Math.floor(Date.now() / 1e3));
  return BigInt(Math.floor(e.status.block_time)) + t.value <= n;
}
const Gg = 4320 * 60 * 1e3, qg = {
  thresholdMs: Gg
  // 3 days
};
class dt {
  constructor(t, n, r = dt.DefaultHRP) {
    this.preimage = t, this.value = n, this.HRP = r, this.vout = 0;
    const i = xt(this.preimage);
    this.vtxoScript = new Kt([Xg(i)]);
    const s = this.vtxoScript.leaves[0];
    this.txid = $.encode(new Uint8Array(i).reverse()), this.tapTree = this.vtxoScript.encode(), this.forfeitTapLeafScript = s, this.intentTapLeafScript = s, this.value = n, this.status = { confirmed: !0 }, this.extraWitness = [this.preimage];
  }
  encode() {
    const t = new Uint8Array(dt.Length);
    return t.set(this.preimage, 0), Yg(t, this.value, this.preimage.length), t;
  }
  static decode(t, n = dt.DefaultHRP) {
    if (t.length !== dt.Length)
      throw new Error(`invalid data length: expected ${dt.Length} bytes, got ${t.length}`);
    const r = t.subarray(0, dt.PreimageLength), i = Zg(t, dt.PreimageLength);
    return new dt(r, i, n);
  }
  static fromString(t, n = dt.DefaultHRP) {
    if (t = t.trim(), !t.startsWith(n))
      throw new Error(`invalid human-readable part: expected ${n} prefix (note '${t}')`);
    const r = t.slice(n.length), i = Os.decode(r);
    if (i.length === 0)
      throw new Error("failed to decode base58 string");
    return dt.decode(i, n);
  }
  toString() {
    return this.HRP + Os.encode(this.encode());
  }
}
dt.DefaultHRP = "arknote";
dt.PreimageLength = 32;
dt.ValueLength = 4;
dt.Length = dt.PreimageLength + dt.ValueLength;
dt.FakeOutpointIndex = 0;
function Yg(e, t, n) {
  new DataView(e.buffer, e.byteOffset + n, 4).setUint32(0, t, !1);
}
function Zg(e, t) {
  return new DataView(e.buffer, e.byteOffset + t, 4).getUint32(0, !1);
}
function Xg(e) {
  return z.encode(["SHA256", e, "EQUAL"]);
}
var io;
(function(e) {
  e[e.INDEXER_TX_TYPE_UNSPECIFIED = 0] = "INDEXER_TX_TYPE_UNSPECIFIED", e[e.INDEXER_TX_TYPE_RECEIVED = 1] = "INDEXER_TX_TYPE_RECEIVED", e[e.INDEXER_TX_TYPE_SENT = 2] = "INDEXER_TX_TYPE_SENT";
})(io || (io = {}));
var xn;
(function(e) {
  e.UNSPECIFIED = "INDEXER_CHAINED_TX_TYPE_UNSPECIFIED", e.COMMITMENT = "INDEXER_CHAINED_TX_TYPE_COMMITMENT", e.ARK = "INDEXER_CHAINED_TX_TYPE_ARK", e.TREE = "INDEXER_CHAINED_TX_TYPE_TREE", e.CHECKPOINT = "INDEXER_CHAINED_TX_TYPE_CHECKPOINT";
})(xn || (xn = {}));
class pf {
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
    if (!zt.isVtxoTreeResponse(o))
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
    if (!zt.isVtxoTreeLeavesResponse(o))
      throw new Error("Invalid vtxos tree leaves data received");
    return o;
  }
  async getBatchSweepTransactions(t) {
    const n = `${this.serverUrl}/v1/indexer/batch/${t.txid}/${t.vout}/sweepTxs`, r = await fetch(n);
    if (!r.ok)
      throw new Error(`Failed to fetch batch sweep transactions: ${r.statusText}`);
    const i = await r.json();
    if (!zt.isBatchSweepTransactionsResponse(i))
      throw new Error("Invalid batch sweep transactions data received");
    return i;
  }
  async getCommitmentTx(t) {
    const n = `${this.serverUrl}/v1/indexer/commitmentTx/${t}`, r = await fetch(n);
    if (!r.ok)
      throw new Error(`Failed to fetch commitment tx: ${r.statusText}`);
    const i = await r.json();
    if (!zt.isCommitmentTx(i))
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
    if (!zt.isConnectorsResponse(o))
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
    if (!zt.isForfeitTxsResponse(o))
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
          for await (const o of eo(i)) {
            if (n?.aborted)
              break;
            try {
              const a = JSON.parse(o.data);
              a.event && (yield {
                txid: a.event.txid,
                scripts: a.event.scripts || [],
                newVtxos: (a.event.newVtxos || []).map(Rr),
                spentVtxos: (a.event.spentVtxos || []).map(Rr),
                sweptVtxos: (a.event.sweptVtxos || []).map(Rr),
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
        if (no(i)) {
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
    if (!zt.isVirtualTxsResponse(o))
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
    if (!zt.isVtxoChainResponse(o))
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
    if (!zt.isVtxosResponse(s))
      throw new Error("Invalid vtxos data received");
    return {
      vtxos: s.vtxos.map(Rr),
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
function Rr(e) {
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
var zt;
(function(e) {
  function t(T) {
    return typeof T == "object" && typeof T.totalOutputAmount == "string" && typeof T.totalOutputVtxos == "number" && typeof T.expiresAt == "string" && typeof T.swept == "boolean";
  }
  function n(T) {
    return typeof T == "object" && typeof T.txid == "string" && typeof T.expiresAt == "string" && Object.values(xn).includes(T.type) && Array.isArray(T.spends) && T.spends.every((Q) => typeof Q == "string");
  }
  function r(T) {
    return typeof T == "object" && typeof T.startedAt == "string" && typeof T.endedAt == "string" && typeof T.totalInputAmount == "string" && typeof T.totalInputVtxos == "number" && typeof T.totalOutputAmount == "string" && typeof T.totalOutputVtxos == "number" && typeof T.batches == "object" && Object.values(T.batches).every(t);
  }
  e.isCommitmentTx = r;
  function i(T) {
    return typeof T == "object" && typeof T.txid == "string" && typeof T.vout == "number";
  }
  e.isOutpoint = i;
  function s(T) {
    return Array.isArray(T) && T.every(i);
  }
  e.isOutpointArray = s;
  function o(T) {
    return typeof T == "object" && typeof T.txid == "string" && typeof T.children == "object" && Object.values(T.children).every(l) && Object.keys(T.children).every((Q) => Number.isInteger(Number(Q)));
  }
  function a(T) {
    return Array.isArray(T) && T.every(o);
  }
  e.isTxsArray = a;
  function c(T) {
    return typeof T == "object" && typeof T.amount == "string" && typeof T.createdAt == "string" && typeof T.isSettled == "boolean" && typeof T.settledBy == "string" && Object.values(io).includes(T.type) && (!T.commitmentTxid && typeof T.virtualTxid == "string" || typeof T.commitmentTxid == "string" && !T.virtualTxid);
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
    return typeof T == "object" && i(T.outpoint) && typeof T.createdAt == "string" && (T.expiresAt === null || typeof T.expiresAt == "string") && typeof T.amount == "string" && typeof T.script == "string" && typeof T.isPreconfirmed == "boolean" && typeof T.isSwept == "boolean" && typeof T.isUnrolled == "boolean" && typeof T.isSpent == "boolean" && (!T.spentBy || typeof T.spentBy == "string") && (!T.settledBy || typeof T.settledBy == "string") && (!T.arkTxid || typeof T.arkTxid == "string") && Array.isArray(T.commitmentTxids) && T.commitmentTxids.every(l);
  }
  function p(T) {
    return typeof T == "object" && typeof T.current == "number" && typeof T.next == "number" && typeof T.total == "number";
  }
  function y(T) {
    return typeof T == "object" && Array.isArray(T.vtxoTree) && T.vtxoTree.every(o) && (!T.page || p(T.page));
  }
  e.isVtxoTreeResponse = y;
  function d(T) {
    return typeof T == "object" && Array.isArray(T.leaves) && T.leaves.every(i) && (!T.page || p(T.page));
  }
  e.isVtxoTreeLeavesResponse = d;
  function g(T) {
    return typeof T == "object" && Array.isArray(T.connectors) && T.connectors.every(o) && (!T.page || p(T.page));
  }
  e.isConnectorsResponse = g;
  function m(T) {
    return typeof T == "object" && Array.isArray(T.txids) && T.txids.every(l) && (!T.page || p(T.page));
  }
  e.isForfeitTxsResponse = m;
  function S(T) {
    return typeof T == "object" && Array.isArray(T.sweptBy) && T.sweptBy.every(l);
  }
  e.isSweptCommitmentTxResponse = S;
  function k(T) {
    return typeof T == "object" && Array.isArray(T.sweptBy) && T.sweptBy.every(l);
  }
  e.isBatchSweepTransactionsResponse = k;
  function R(T) {
    return typeof T == "object" && Array.isArray(T.txs) && T.txs.every((Q) => typeof Q == "string") && (!T.page || p(T.page));
  }
  e.isVirtualTxsResponse = R;
  function C(T) {
    return typeof T == "object" && Array.isArray(T.chain) && T.chain.every(n) && (!T.page || p(T.page));
  }
  e.isVtxoChainResponse = C;
  function W(T) {
    return typeof T == "object" && Array.isArray(T.vtxos) && T.vtxos.every(h) && (!T.page || p(T.page));
  }
  e.isVtxosResponse = W;
})(zt || (zt = {}));
class Qg {
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
const Ur = (e) => `vtxos:${e}`, Lr = (e) => `utxos:${e}`, gs = (e) => `tx:${e}`, hc = "wallet:state", xi = (e) => e ? $.encode(e) : void 0, Un = (e) => e ? $.decode(e) : void 0, Ti = ([e, t]) => ({
  cb: $.encode(ie.encode(e)),
  s: $.encode(t)
}), pc = (e) => ({
  ...e,
  tapTree: xi(e.tapTree),
  forfeitTapLeafScript: Ti(e.forfeitTapLeafScript),
  intentTapLeafScript: Ti(e.intentTapLeafScript),
  extraWitness: e.extraWitness?.map(xi)
}), gc = (e) => ({
  ...e,
  tapTree: xi(e.tapTree),
  forfeitTapLeafScript: Ti(e.forfeitTapLeafScript),
  intentTapLeafScript: Ti(e.intentTapLeafScript),
  extraWitness: e.extraWitness?.map(xi)
}), Si = (e) => {
  const t = ie.decode(Un(e.cb)), n = Un(e.s);
  return [t, n];
}, Jg = (e) => ({
  ...e,
  createdAt: new Date(e.createdAt),
  tapTree: Un(e.tapTree),
  forfeitTapLeafScript: Si(e.forfeitTapLeafScript),
  intentTapLeafScript: Si(e.intentTapLeafScript),
  extraWitness: e.extraWitness?.map(Un)
}), ty = (e) => ({
  ...e,
  tapTree: Un(e.tapTree),
  forfeitTapLeafScript: Si(e.forfeitTapLeafScript),
  intentTapLeafScript: Si(e.intentTapLeafScript),
  extraWitness: e.extraWitness?.map(Un)
});
class so {
  constructor(t) {
    this.storage = t;
  }
  async getVtxos(t) {
    const n = await this.storage.getItem(Ur(t));
    if (!n)
      return [];
    try {
      return JSON.parse(n).map(Jg);
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
    await this.storage.setItem(Ur(t), JSON.stringify(r.map(pc)));
  }
  async removeVtxo(t, n) {
    const r = await this.getVtxos(t), [i, s] = n.split(":"), o = r.filter((a) => !(a.txid === i && a.vout === parseInt(s, 10)));
    await this.storage.setItem(Ur(t), JSON.stringify(o.map(pc)));
  }
  async clearVtxos(t) {
    await this.storage.removeItem(Ur(t));
  }
  async getUtxos(t) {
    const n = await this.storage.getItem(Lr(t));
    if (!n)
      return [];
    try {
      return JSON.parse(n).map(ty);
    } catch (r) {
      return console.error(`Failed to parse UTXOs for address ${t}:`, r), [];
    }
  }
  async saveUtxos(t, n) {
    const r = await this.getUtxos(t);
    n.forEach((i) => {
      const s = r.findIndex((o) => o.txid === i.txid && o.vout === i.vout);
      s !== -1 ? r[s] = i : r.push(i);
    }), await this.storage.setItem(Lr(t), JSON.stringify(r.map(gc)));
  }
  async removeUtxo(t, n) {
    const r = await this.getUtxos(t), [i, s] = n.split(":"), o = r.filter((a) => !(a.txid === i && a.vout === parseInt(s, 10)));
    await this.storage.setItem(Lr(t), JSON.stringify(o.map(gc)));
  }
  async clearUtxos(t) {
    await this.storage.removeItem(Lr(t));
  }
  async getTransactionHistory(t) {
    const n = gs(t), r = await this.storage.getItem(n);
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
    await this.storage.setItem(gs(t), JSON.stringify(r));
  }
  async clearTransactions(t) {
    await this.storage.removeItem(gs(t));
  }
  async getWalletState() {
    const t = await this.storage.getItem(hc);
    if (!t)
      return null;
    try {
      return JSON.parse(t);
    } catch (n) {
      return console.error("Failed to parse wallet state:", n), null;
    }
  }
  async saveWalletState(t) {
    await this.storage.setItem(hc, JSON.stringify(t));
  }
}
const ys = (e, t) => `contract:${e}:${t}`, ws = (e) => `collection:${e}`;
class ey {
  constructor(t) {
    this.storage = t;
  }
  async getContractData(t, n) {
    const r = await this.storage.getItem(ys(t, n));
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
      await this.storage.setItem(ys(t, n), JSON.stringify(r));
    } catch (i) {
      throw console.error(`Failed to persist contract data for ${t}:${n}:`, i), i;
    }
  }
  async deleteContractData(t, n) {
    try {
      await this.storage.removeItem(ys(t, n));
    } catch (r) {
      throw console.error(`Failed to remove contract data for ${t}:${n}:`, r), r;
    }
  }
  async getContractCollection(t) {
    const n = await this.storage.getItem(ws(t));
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
      await this.storage.setItem(ws(t), JSON.stringify(a));
    } catch (c) {
      throw console.error(`Failed to persist contract collection ${t}:`, c), c;
    }
  }
  async removeFromContractCollection(t, n, r) {
    if (n == null)
      throw new Error(`Invalid id provided for removal: ${String(n)}`);
    const s = (await this.getContractCollection(t)).filter((o) => o[r] !== n);
    try {
      await this.storage.setItem(ws(t), JSON.stringify(s));
    } catch (o) {
      throw console.error(`Failed to persist contract collection removal for ${t}:`, o), o;
    }
  }
  async clearContractData() {
    await this.storage.clear();
  }
}
function Pe(e, t) {
  return {
    ...t,
    forfeitTapLeafScript: e.offchainTapscript.forfeit(),
    intentTapLeafScript: e.offchainTapscript.forfeit(),
    tapTree: e.offchainTapscript.encode()
  };
}
function oo(e, t) {
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
    super(t, { cause: r }), this.name = "ParseError", this.#t = n, n?.input && (this.message = Ln(this.message, n));
  }
  get node() {
    return this.#t;
  }
  withAst(t) {
    return this.#t ? this : (this.#t = t, t?.input ? (this.message = Ln(this.message, t), this) : this);
  }
}
class H extends Error {
  #t;
  constructor(t, n, r) {
    super(t, { cause: r }), this.name = "EvaluationError", this.#t = n, n?.input && (this.message = Ln(this.message, n));
  }
  get node() {
    return this.#t;
  }
  withAst(t) {
    return this.#t ? this : (this.#t = t, t?.input ? (this.message = Ln(this.message, t), this) : this);
  }
}
let ny = class extends Error {
  #t;
  constructor(t, n, r) {
    super(t, { cause: r }), this.name = "TypeError", this.#t = n, n?.input && (this.message = Ln(this.message, n));
  }
  get node() {
    return this.#t;
  }
  withAst(t) {
    return this.#t ? this : (this.#t = t, t?.input ? (this.message = Ln(this.message, t), this) : this);
  }
};
function Ln(e, t) {
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
class oe {
  #t;
  constructor(t) {
    this.#t = t;
  }
  static of(t) {
    return t === void 0 ? vi : new oe(t);
  }
  static none() {
    return vi;
  }
  hasValue() {
    return this.#t !== void 0;
  }
  value() {
    if (this.#t === void 0) throw new H("Optional value is not present");
    return this.#t;
  }
  or(t) {
    if (this.#t !== void 0) return this;
    if (t instanceof oe) return t;
    throw new H("Optional.or must be called with an Optional argument");
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
const vi = Object.freeze(new oe());
class gf {
}
const yf = new gf();
function ry(e, t) {
  e.constants.set("optional", t ? yf : void 0);
}
function iy(e) {
  const t = (f, h) => e.registerFunctionOverload(f, h), n = e.enableOptionalTypes ? yf : void 0;
  e.registerType("OptionalNamespace", gf), e.registerConstant("optional", "OptionalNamespace", n), t("optional.hasValue(): bool", (f) => f.hasValue()), t("optional<A>.value(): A", (f) => f.value()), e.registerFunctionOverload("OptionalNamespace.none(): optional<T>", () => oe.none()), t("OptionalNamespace.of(A): optional<A>", (f, h) => oe.of(h));
  function r(f, h, p) {
    if (f instanceof oe) return f;
    throw new H(`${p} must be optional`, h);
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
class Ze {
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
    if (t < 0n || t > 18446744073709551615n) throw new H("Unsigned integer overflow");
    this.#t = t;
  }
  get [Symbol.toStringTag]() {
    return `value = ${this.#t}`;
  }
  [Symbol.for("nodejs.util.inspect.custom")]() {
    return `UnsignedInteger { value: ${this.#t} }`;
  }
}
const sy = {
  h: 3600000000000n,
  m: 60000000000n,
  s: 1000000000n,
  ms: 1000000n,
  us: 1000n,
  µs: 1000n,
  ns: 1n
};
class _e {
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
    return new _e(r, i);
  }
  addDuration(t) {
    const n = this.#e + t.nanos;
    return new _e(
      this.#t + t.seconds + BigInt(Math.floor(n / 1e9)),
      n % 1e9
    );
  }
  subtractDuration(t) {
    const n = this.#e - t.nanos;
    return new _e(
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
function oy(e) {
  const t = (d, g) => e.registerFunctionOverload(d, g), n = (d) => d;
  t("dyn(dyn): dyn", n);
  for (const d in rr) {
    const g = rr[d];
    g instanceof Rt && t(`type(${g.name}): type`, () => g);
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
        throw new H(`bool() conversion error: invalid string value "${d}"`);
    }
  });
  const r = Object.keys;
  t("size(string): int", (d) => BigInt(yc(d))), t("size(bytes): int", (d) => BigInt(d.length)), t("size(list): int", (d) => BigInt(d.length ?? d.size)), t(
    "size(map): int",
    (d) => BigInt(d instanceof Map ? d.size : r(d).length)
  ), t("string.size(): int", (d) => BigInt(yc(d))), t("bytes.size(): int", (d) => BigInt(d.length)), t("list.size(): int", (d) => BigInt(d.length ?? d.size)), t(
    "map.size(): int",
    (d) => BigInt(d instanceof Map ? d.size : r(d).length)
  ), t("bytes(string): bytes", (d) => o.fromString(d)), t("bytes(bytes): bytes", n), t("double(double): double", n), t("double(int): double", (d) => Number(d)), t("double(uint): double", (d) => Number(d)), t("double(string): double", (d) => {
    if (!d || d !== d.trim())
      throw new H("double() type error: cannot convert to double");
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
        throw new H("double() type error: cannot convert to double");
      }
    }
  }), t("int(int): int", n), t("int(double): int", (d) => {
    if (Number.isFinite(d)) return BigInt(Math.trunc(d));
    throw new H("int() type error: integer overflow");
  }), t("int(string): int", (d) => {
    if (d !== d.trim() || d.length > 20 || d.includes("0x"))
      throw new H("int() type error: cannot convert to int");
    try {
      const g = BigInt(d);
      if (g <= 9223372036854775807n && g >= -9223372036854775808n) return g;
    } catch {
    }
    throw new H("int() type error: cannot convert to int");
  }), t("uint(uint): uint", n), t("uint(double): uint", (d) => {
    if (Number.isFinite(d)) return BigInt(Math.trunc(d));
    throw new H("int() type error: integer overflow");
  }), t("uint(string): uint", (d) => {
    if (d !== d.trim() || d.length > 20 || d.includes("0x"))
      throw new H("uint() type error: cannot convert to uint");
    try {
      const g = BigInt(d);
      if (g <= 18446744073709551615n && g >= 0n) return g;
    } catch {
    }
    throw new H("uint() type error: cannot convert to uint");
  }), t("string(string): string", n), t("string(bool): string", (d) => `${d}`), t("string(int): string", (d) => `${d}`), t("string(bytes): string", (d) => o.toUtf8(d)), t("string(double): string", (d) => d === 1 / 0 ? "+Inf" : d === -1 / 0 ? "-Inf" : `${d}`), t("string.startsWith(string): bool", (d, g) => d.startsWith(g)), t("string.endsWith(string): bool", (d, g) => d.endsWith(g)), t("string.contains(string): bool", (d, g) => d.includes(g)), t("string.lowerAscii(): string", (d) => d.toLowerCase()), t("string.upperAscii(): string", (d) => d.toUpperCase()), t("string.trim(): string", (d) => d.trim()), t(
    "string.indexOf(string): int",
    (d, g) => BigInt(d.indexOf(g))
  ), t("string.indexOf(string, int): int", (d, g, m) => {
    if (g === "") return m;
    if (m = Number(m), m < 0 || m >= d.length)
      throw new H("string.indexOf(search, fromIndex): fromIndex out of range");
    return BigInt(d.indexOf(g, m));
  }), t(
    "string.lastIndexOf(string): int",
    (d, g) => BigInt(d.lastIndexOf(g))
  ), t("string.lastIndexOf(string, int): int", (d, g, m) => {
    if (g === "") return m;
    if (m = Number(m), m < 0 || m >= d.length)
      throw new H("string.lastIndexOf(search, fromIndex): fromIndex out of range");
    return BigInt(d.lastIndexOf(g, m));
  }), t("string.substring(int): string", (d, g) => {
    if (g = Number(g), g < 0 || g > d.length)
      throw new H("string.substring(start, end): start index out of range");
    return d.substring(g);
  }), t("string.substring(int, int): string", (d, g, m) => {
    if (g = Number(g), g < 0 || g > d.length)
      throw new H("string.substring(start, end): start index out of range");
    if (m = Number(m), m < g || m > d.length)
      throw new H("string.substring(start, end): end index out of range");
    return d.substring(g, m);
  }), t("string.matches(string): bool", (d, g) => {
    try {
      return new RegExp(g).test(d);
    } catch {
      throw new H(`Invalid regular expression: ${g}`);
    }
  }), t("string.split(string): list<string>", (d, g) => d.split(g)), t("string.split(string, int): list<string>", (d, g, m) => {
    if (m = Number(m), m === 0) return [];
    const S = d.split(g);
    if (m < 0 || S.length <= m) return S;
    const k = S.slice(0, m - 1);
    return k.push(S.slice(m - 1).join(g)), k;
  }), t("list<string>.join(): string", (d) => {
    for (let g = 0; g < d.length; g++)
      if (typeof d[g] != "string")
        throw new H("string.join(): list must contain only strings");
    return d.join("");
  }), t("list<string>.join(string): string", (d, g) => {
    for (let m = 0; m < d.length; m++)
      if (typeof d[m] != "string")
        throw new H("string.join(separator): list must contain only strings");
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
    if (g < 0 || g >= d.length) throw new H("Bytes index out of range");
    return BigInt(d[g]);
  });
  const a = "google.protobuf.Timestamp", c = "google.protobuf.Duration", u = e.registerType(a, Date).getObjectType(a).typeType, l = e.registerType(c, _e).getObjectType(c).typeType;
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
      throw new H("timestamp() requires a string in ISO 8601 format");
    const g = new Date(d);
    if (g <= 253402300799999 && g >= -621355968e5) return g;
    throw new H("timestamp() requires a string in ISO 8601 format");
  }), t(`timestamp(int): ${a}`, (d) => {
    if (d = Number(d) * 1e3, d <= 253402300799999 && d >= -621355968e5) return new Date(d);
    throw new H("timestamp() requires a valid integer unix timestamp");
  }), t(`${a}.getDate(): int`, (d) => BigInt(d.getUTCDate())), t(`${a}.getDate(string): int`, (d, g) => BigInt(f(d, g).getDate())), t(`${a}.getDayOfMonth(): int`, (d) => BigInt(d.getUTCDate() - 1)), t(
    `${a}.getDayOfMonth(string): int`,
    (d, g) => BigInt(f(d, g).getDate() - 1)
  ), t(`${a}.getDayOfWeek(): int`, (d) => BigInt(d.getUTCDay())), t(`${a}.getDayOfWeek(string): int`, (d, g) => BigInt(f(d, g).getDay())), t(`${a}.getDayOfYear(): int`, h), t(`${a}.getDayOfYear(string): int`, h), t(`${a}.getFullYear(): int`, (d) => BigInt(d.getUTCFullYear())), t(`${a}.getFullYear(string): int`, (d, g) => BigInt(f(d, g).getFullYear())), t(`${a}.getHours(): int`, (d) => BigInt(d.getUTCHours())), t(`${a}.getHours(string): int`, (d, g) => BigInt(f(d, g).getHours())), t(`${a}.getMilliseconds(): int`, (d) => BigInt(d.getUTCMilliseconds())), t(`${a}.getMilliseconds(string): int`, (d) => BigInt(d.getUTCMilliseconds())), t(`${a}.getMinutes(): int`, (d) => BigInt(d.getUTCMinutes())), t(`${a}.getMinutes(string): int`, (d, g) => BigInt(f(d, g).getMinutes())), t(`${a}.getMonth(): int`, (d) => BigInt(d.getUTCMonth())), t(`${a}.getMonth(string): int`, (d, g) => BigInt(f(d, g).getMonth())), t(`${a}.getSeconds(): int`, (d) => BigInt(d.getUTCSeconds())), t(`${a}.getSeconds(string): int`, (d, g) => BigInt(f(d, g).getSeconds()));
  const p = /(\d*\.?\d*)(ns|us|µs|ms|s|m|h)/;
  function y(d) {
    if (!d) throw new H("Invalid duration string: ''");
    const g = d[0] === "-";
    (d[0] === "-" || d[0] === "+") && (d = d.slice(1));
    let m = BigInt(0);
    for (; ; ) {
      const R = p.exec(d);
      if (!R) throw new H(`Invalid duration string: ${d}`);
      if (R.index !== 0) throw new H(`Invalid duration string: ${d}`);
      d = d.slice(R[0].length);
      const C = sy[R[2]], [W = "0", T = ""] = R[1].split("."), Q = BigInt(W) * C, L = T ? BigInt(T.slice(0, 13).padEnd(13, "0")) * C / 10000000000000n : 0n;
      if (m += Q + L, d === "") break;
    }
    const S = m >= 1000000000n ? m / 1000000000n : 0n, k = Number(m % 1000000000n);
    return g ? new _e(-S, -k) : new _e(S, k);
  }
  t("duration(string): google.protobuf.Duration", (d) => y(d)), t("google.protobuf.Duration.getHours(): int", (d) => d.getHours()), t("google.protobuf.Duration.getMinutes(): int", (d) => d.getMinutes()), t("google.protobuf.Duration.getSeconds(): int", (d) => d.getSeconds()), t("google.protobuf.Duration.getMilliseconds(): int", (d) => d.getMilliseconds()), iy(e);
}
function yc(e) {
  let t = 0;
  for (const n of e) t++;
  return t;
}
class Rt {
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
  string: new Rt("string"),
  bool: new Rt("bool"),
  int: new Rt("int"),
  uint: new Rt("uint"),
  double: new Rt("double"),
  map: new Rt("map"),
  list: new Rt("list"),
  bytes: new Rt("bytes"),
  null_type: new Rt("null"),
  type: new Rt("type")
};
class Gi {
  #t = null;
  #e = null;
  constructor(t) {
    t instanceof Gi ? (this.#t = t, this.#e = /* @__PURE__ */ new Map()) : this.#e = new Map(t);
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
class ay extends Gi {
  constructor(t = null, n = null) {
    super(t, n);
  }
  get(t) {
    const n = super.get(t);
    return n === void 0 ? Zt : n;
  }
}
function pe(e, t = Gi, n = !0) {
  return e instanceof t ? e.fork(n) : new t(e);
}
class We {
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
    if (t = t instanceof oe ? t.orValue() : t, t === void 0) return vi;
    const s = i.debugType(t);
    try {
      return oe.of(s.fieldLazy(t, n, r, i));
    } catch (o) {
      if (o instanceof H) return vi;
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
    throw new H(
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
    throw new H(
      `Field '${n}' is not of type '${this.valueType}', got '${o}'`,
      r
    );
  }
  #a(t, n, r, i) {
    if (!(typeof n == "number" || typeof n == "bigint")) return;
    const s = t[n];
    if (s === void 0)
      throw new H(
        `No such key: index out of bounds, index ${n} ${n < 0 ? "< 0" : `>= size ${t.length}`}`,
        r
      );
    const o = i.debugType(s);
    if (this.valueType.matches(o)) return s;
    throw new H(
      `List item with index '${n}' is not of type '${this.valueType}', got '${o}'`,
      r
    );
  }
  fieldLazy() {
  }
  field(t, n, r, i) {
    const s = this.fieldLazy(t, n, r, i);
    if (s !== void 0) return s;
    throw new H(`No such key: ${n}`, r);
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
function cy(e, t) {
  const n = `Macro '${e}' must `;
  return function(i) {
    const s = t(i);
    if (!s || typeof s != "object") throw new Error(`${n} must return an object.`);
    if (!s?.typeCheck) throw new Error(`${n} have a .typeCheck(checker, macro, ctx) method.`);
    if (!s?.evaluate) throw new Error(`${n} have a .evaluate(evaluator, macro, ctx) method.`);
    return s;
  };
}
class uy {
  #t;
  constructor({ name: t, receiverType: n, argTypes: r, returnType: i, handler: s }) {
    this.name = t, this.receiverType = n || null, this.argTypes = r, this.returnType = i, this.macro = r.includes(zr);
    const o = n ? `${n}.` : "";
    this.signature = `${o}${t}(${r.join(", ")}): ${i}`, this.handler = this.macro ? cy(this.signature, s) : s, Object.freeze(this);
  }
  hasPlaceholder() {
    return this.#t ??= this.returnType.hasPlaceholder() || this.receiverType?.hasPlaceholder() || this.argTypes.some((t) => t.hasPlaceholder()) || !1;
  }
  matchesArgs(t) {
    return t.length === this.argTypes.length && this.argTypes.every((n, r) => n.matches(t[r])) ? this : null;
  }
}
class Gn {
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
function wf(e) {
  return new We({
    kind: "list",
    name: `list<${e}>`,
    type: "list",
    valueType: e
  });
}
function ge(e) {
  return new We({ kind: "primitive", name: e, type: e });
}
function ly(e) {
  return new We({ kind: "message", name: e, type: e });
}
function mf(e) {
  const t = e ? `dyn<${e}>` : "dyn";
  return new We({ kind: "dyn", name: t, type: t, valueType: e });
}
function bf(e) {
  const t = e ? `optional<${e}>` : "optional";
  return new We({ kind: "optional", name: t, type: "optional", valueType: e });
}
function Ef(e, t) {
  return new We({
    kind: "map",
    name: `map<${e}, ${t}>`,
    type: "map",
    keyType: e,
    valueType: t
  });
}
function fy(e) {
  return new We({ kind: "param", name: e, type: e });
}
const Zt = mf(), zr = ge("ast"), wc = wf(Zt), mc = Ef(Zt, Zt), At = Object.freeze({
  string: ge("string"),
  bool: ge("bool"),
  int: ge("int"),
  uint: ge("uint"),
  double: ge("double"),
  bytes: ge("bytes"),
  dyn: Zt,
  null: ge("null"),
  type: ge("type"),
  optional: bf(Zt),
  list: wc,
  "list<dyn>": wc,
  map: mc,
  "map<dyn, dyn>": mc
});
class dy {
  returnType = null;
  /** @type {Array<FunctionDeclaration>} */
  declarations = [];
  constructor(t) {
    this.registry = t;
  }
  add(t) {
    this.returnType = (this.returnType ? this.returnType.unify(this.registry, t.returnType) : t.returnType) || Zt, this.declarations.push(t);
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
function bc(e) {
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
const xf = [
  [void 0, "map"],
  [Object, "map"],
  [Map, "map"],
  [Array, "list"],
  [Uint8Array, "bytes"],
  [Ze, "uint"],
  [Rt, "type"],
  [oe, "optional"]
];
typeof Buffer < "u" && xf.push([Buffer, "bytes"]);
class Xo {
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
    if (this.enableOptionalTypes = t.enableOptionalTypes ?? !1, this.objectTypes = pe(t.objectTypes), this.objectTypesByConstructor = pe(t.objectTypesByConstructor), this.objectTypeInstances = pe(t.objectTypeInstances), this.#i = pe(t.functionDeclarations), this.#r = pe(t.operatorDeclarations), this.#n = pe(
      t.typeDeclarations || Object.entries(At),
      void 0,
      !1
    ), this.constants = pe(t.constants), this.variables = t.unlistedVariablesAreDyn ? pe(t.variables, ay) : pe(t.variables), this.variables.size)
      ry(this, this.enableOptionalTypes);
    else {
      for (const n of xf) this.registerType(n[1], n[0], !0);
      for (const n in rr) this.registerConstant(n, "type", rr[n]);
    }
  }
  #g() {
    this.#t = {}, this.#e = {};
  }
  registerVariable(t, n) {
    if (this.variables.has(t)) throw new Error(`Variable already registered: ${t}`);
    return this.variables.set(t, n instanceof We ? n : this.getType(n)), this;
  }
  registerConstant(t, n, r) {
    return this.registerVariable(t, n), this.constants.set(t, r), this;
  }
  #y(t, n, r) {
    let i = this.#o.get(t);
    return i = i.get(n) || i.set(n, /* @__PURE__ */ new Map()).get(n), i.get(r) || i.set(r, new dy(this)).get(r);
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
    return t === "ast" ? zr : this.#s(t, !0);
  }
  registerType(t, n, r) {
    if (typeof t != "string" || t.length < 2)
      throw new Error(`Invalid type name: ${t}`);
    const i = {
      name: t,
      typeType: rr[t] || new Rt(t),
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
    if (r = t.match(/^[A-Z]$/), r) return this.#l(fy, t, t);
    if (r = t.match(/^dyn<(.+)>$/), r) {
      const i = this.#s(r[1].trim(), n);
      return this.#l(mf, `dyn<${i}>`, i);
    }
    if (r = t.match(/^list<(.+)>$/), r) {
      const i = this.#s(r[1].trim(), n);
      return this.#l(wf, `list<${i}>`, i);
    }
    if (r = t.match(/^map<(.+)>$/), r) {
      const i = bc(r[1]);
      if (i.length !== 2) throw new Error(`Invalid map type: ${t}`);
      const s = this.#s(i[0].trim(), n), o = this.#s(i[1].trim(), n);
      return this.#l(Ef, `map<${s}, ${o}>`, s, o);
    }
    if (r = t.match(/^optional<(.+)>$/), r) {
      const i = this.#s(r[1].trim(), n);
      return this.#l(bf, `optional<${i}>`, i);
    }
    if (n) {
      const i = new Error(`Unknown type: ${t}`);
      throw i.unknownType = t, i;
    }
    return this.#l(ly, t, t);
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
    return i.every((o) => o.returnType === s) ? s : (s.kind === "list" || s.kind === "map") && i.every((o) => o.returnType.kind === s.kind) ? s.kind === "list" ? At.list : At.map : At.dyn;
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
        const o = s ? At.dyn : n;
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
    return new Xo({
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
      return new uy({
        name: s,
        receiverType: i ? this.getType(i) : null,
        returnType: this.getType(a.trim()),
        argTypes: bc(o).map((c) => this.getFunctionType(c.trim())),
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
    return t.name !== n.name || t.argTypes.length !== n.argTypes.length || (t.receiverType || n.receiverType) && (!t.receiverType || !n.receiverType) ? !1 : !(t.receiverType !== n.receiverType && t.receiverType !== Zt && n.receiverType !== Zt) && (n.macro || t.macro || n.argTypes.every((i, s) => {
      const o = t.argTypes[s];
      return i === o || i === zr || o === zr || i === Zt || o === Zt;
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
    ), a = new Gn({ operator: `${t}_`, leftType: s, returnType: o, handler: r });
    if (this.#h(a))
      throw new Error(`Operator overload already registered: ${t}${n}`);
    this.#r.set(a.signature, a), this.#g();
  }
  #h(t) {
    for (const [, n] of this.#r) if (t.equals(n)) return !0;
    return !1;
  }
  binaryOverload(t, n, r, i, s) {
    s ??= Ec(n) ? "bool" : t;
    const o = `${t} ${n} ${r}: ${s}`, a = this.assertType(t, "left type", o), c = this.assertType(r, "right type", o), u = this.assertType(s, "return type", o);
    if (Ec(n) && u.type !== "bool")
      throw new Error(`Comparison operator '${n}' must return 'bool', got '${u.type}'`);
    const l = new Gn({ operator: n, leftType: a, rightType: c, returnType: u, handler: i });
    if (l.hasPlaceholder() && !(c.hasPlaceholder() && a.hasPlaceholder()))
      throw new Error(
        `Operator overload with placeholders must use them in both left and right types: ${o}`
      );
    if (this.#h(l))
      throw new Error(`Operator overload already registered: ${l.signature}`);
    if (n === "==") {
      const f = [
        new Gn({
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
        new Gn({
          operator: "==",
          leftType: c,
          rightType: a,
          handler(h, p, y, d) {
            return i(p, h, y, d);
          },
          returnType: u
        }),
        new Gn({
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
function Ec(e) {
  return e === "<" || e === "<=" || e === ">" || e === ">=" || e === "==" || e === "!=" || e === "in";
}
function hy(e) {
  return new Xo(e);
}
class py {
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
    if (typeof t != "object") throw new H("Context must be an object");
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
function qi(e, t) {
  if (e.op === "id") return e.args;
  throw new st(t, e);
}
function br(e, t) {
  if (typeof t == "boolean") return !1;
  if (t instanceof Error)
    return e.error ??= t, /predicate must return bool|Unknown variable/.test(t.message);
  const n = e.ev.debugRuntimeType(t, e.firstMacroIter.checkedType);
  return e.error = new H(
    `${e.macro.functionDesc} predicate must return bool, got '${n}'`,
    e.firstMacroIter
  ), !0;
}
class gy {
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
    throw new H(
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
    const s = n.eval(r.receiver, i), o = new gy(n, r, i, e, t);
    return s instanceof Promise ? o.iterateAsync(s) : o.iterate(s);
  };
}
function yy(e, t, n) {
  if (br(e, n)) throw e.error;
  n === !1 && (e.return = !1);
}
function wy(e) {
  if (e.return !== void 0) return e.return;
  if (e.error) throw e.error;
  return !0;
}
function my(e, t, n) {
  if (br(e, n)) throw e.error;
  n === !0 && (e.return = !0);
}
function by(e) {
  if (e.return !== void 0) return e.return;
  if (e.error) throw e.error;
  return !1;
}
function Ey(e, t, n) {
  if (br(e, n) || n instanceof Error) throw e.error;
  n && (e.found ? e.return = !1 : e.found = !0);
}
function xy(e) {
  return e.return !== void 0 ? e.return : e.found === !0;
}
function Tf(e) {
  return e.results || [];
}
function Ty(e, t, n) {
  if (n === !1) return;
  if (br(e, n) || n instanceof Error) throw e.error;
  const r = e.ev.eval(e.macro.second, t);
  return r instanceof Promise ? r.then((i) => (e.results ??= []).push(i)) : (e.results ??= []).push(r);
}
function Sy(e, t, n) {
  if (n instanceof Error) throw e.error;
  return (e.results ??= []).push(n);
}
function vy(e, t, n) {
  if (br(e, n) || n instanceof Error) throw e.error;
  n && (e.results ??= []).push(t.variableValue);
}
function Ay(e, t, n) {
  if (t.kind === "dyn") return t;
  if (t.kind === "list") return t.valueType;
  if (t.kind === "map") return t.keyType;
  throw new e.Error(
    `Expression of type '${t}' cannot be range of a comprehension (must be list, map, or dynamic).`,
    n.receiver
  );
}
function Qo(e, t, n) {
  const r = Ay(e, e.check(t.receiver, n), t);
  return n.forkWithVariable(r, t.predicateVar);
}
function ms({ description: e, evaluator: t }) {
  const n = `${e} invalid predicate iteration variable`;
  if (!t) throw new Error(`No evaluator provided for quantifier macro: ${e}`);
  function r(i, s, o) {
    o = Qo(i, s, o), s.variableType = o.variableType;
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
    predicateVar: qi(i[0], n),
    evaluate: t,
    typeCheck: r
  });
}
function xc(e) {
  const t = e ? "map(var, filter, transform)" : "map(var, transform)", n = `${t} invalid predicate iteration variable`, r = ir(
    e ? Ty : Sy,
    Tf
  );
  function i(s, o, a) {
    if (a = Qo(s, o, a), o.variableType = a.variableType, e) {
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
    predicateVar: qi(s[0], n),
    evaluate: r,
    typeCheck: i
  });
}
function Iy() {
  const e = "filter(var, predicate)", t = `${e} invalid predicate iteration variable`, n = ir(vy, Tf);
  function r(i, s, o) {
    o = Qo(i, s, o), s.variableType = o.variableType;
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
    predicateVar: qi(i[0], t),
    evaluate: n,
    typeCheck: r
  });
}
function ky() {
  const e = "has() invalid argument";
  function t(r, i, s) {
    const o = i.macroHasProps;
    let a = o.length, c = r.eval(o[--a], s), u;
    for (; a--; ) {
      const l = o[a];
      if (l.op === ".?" && (u ??= !0), c = r.debugType(c).fieldLazy(c, l.args[1], l, r), c === void 0) {
        if (!(!u && a && l.op === ".")) break;
        throw new H(`No such key: ${l.args[1]}`, l);
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
function Oy(e) {
  e.registerFunctionOverload("has(ast): bool", ky()), e.registerFunctionOverload(
    "list.all(ast, ast): bool",
    ms({
      description: "all(var, predicate)",
      evaluator: ir(yy, wy)
    })
  ), e.registerFunctionOverload(
    "list.exists(ast, ast): bool",
    ms({
      description: "exists(var, predicate)",
      evaluator: ir(my, by)
    })
  ), e.registerFunctionOverload(
    "list.exists_one(ast, ast): bool",
    ms({
      description: "exists_one(var, predicate)",
      evaluator: ir(Ey, xy)
    })
  ), e.registerFunctionOverload("list.map(ast, ast): list<dyn>", xc(!1)), e.registerFunctionOverload("list.map(ast, ast, ast): list<dyn>", xc(!0)), e.registerFunctionOverload("list.filter(ast, ast): list<dyn>", Iy());
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
    var: qi(i[0], "invalid variable argument"),
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
function By(e) {
  const t = e.unaryOverload.bind(e), n = e.binaryOverload.bind(e);
  function r(u, l) {
    if (u <= 9223372036854775807n && u >= -9223372036854775808n) return u;
    throw new H(`integer overflow: ${u}`, l);
  }
  t("!", "bool", (u) => !u), t("-", "int", (u) => -u), n("dyn<int>", "==", "double", (u, l) => u == l), n("dyn<int>", "==", "uint", (u, l) => u == l.valueOf()), n("int", "*", "int", (u, l, f) => r(u * l, f)), n("int", "+", "int", (u, l, f) => r(u + l, f)), n("int", "-", "int", (u, l, f) => r(u - l, f)), n("int", "/", "int", (u, l, f) => {
    if (l === 0n) throw new H("division by zero", f);
    return u / l;
  }), n("int", "%", "int", (u, l, f) => {
    if (l === 0n) throw new H("modulo by zero", f);
    return u % l;
  }), t("-", "double", (u) => -u), n("dyn<double>", "==", "int", (u, l) => u == l), n("dyn<double>", "==", "uint", (u, l) => u == l.valueOf()), n("double", "*", "double", (u, l) => u * l), n("double", "+", "double", (u, l) => u + l), n("double", "-", "double", (u, l) => u - l), n("double", "/", "double", (u, l) => u / l), n("string", "+", "string", (u, l) => u + l), n("list<V>", "+", "list<V>", (u, l) => [...u, ...l]), n("bytes", "+", "bytes", (u, l) => {
    const f = new Uint8Array(u.length + l.length);
    return f.set(u, 0), f.set(l, u.length), f;
  });
  const i = "google.protobuf.Duration";
  n(i, "+", i, (u, l) => u.addDuration(l)), n(i, "-", i, (u, l) => u.subtractDuration(l)), n(i, "==", i, (u, l) => u.seconds === l.seconds && u.nanos === l.nanos);
  const s = "google.protobuf.Timestamp";
  n(s, "==", s, (u, l) => u.getTime() === l.getTime()), n(s, "-", s, (u, l) => _e.fromMilliseconds(u.getTime() - l.getTime()), i), n(s, "-", i, (u, l) => l.subtractTimestamp(u)), n(s, "+", i, (u, l) => l.extendTimestamp(u)), n(i, "+", s, (u, l) => u.extendTimestamp(l));
  function o(u, l, f, h) {
    if (l instanceof Set && l.has(u)) return !0;
    for (const p of l) if (qn(u, p, h)) return !0;
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
        if (!qn(u[g], l[g], h)) return !1;
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
        if (!(l.has(d) && qn(g, l.get(d), h))) return !1;
      return !0;
    }
    if (u instanceof Map || l instanceof Map) {
      const d = u instanceof Map ? l : u, g = u instanceof Map ? u : l, m = Object.keys(d);
      if (g.size !== m.length) return !1;
      for (const [S, k] of g)
        if (!(S in d && qn(k, d[S], h))) return !1;
      return !0;
    }
    const p = Object.keys(u), y = Object.keys(l);
    if (p.length !== y.length) return !1;
    for (let d = 0; d < p.length; d++) {
      const g = p[d];
      if (!(g in l && qn(u[g], l[g], h))) return !1;
    }
    return !0;
  }), n("uint", "==", "uint", (u, l) => u.valueOf() === l.valueOf()), n("dyn<uint>", "==", "double", (u, l) => u.valueOf() == l), n("dyn<uint>", "==", "int", (u, l) => u.valueOf() == l), n("uint", "+", "uint", (u, l) => new Ze(u.valueOf() + l.valueOf())), n("uint", "-", "uint", (u, l) => new Ze(u.valueOf() - l.valueOf())), n("uint", "*", "uint", (u, l) => new Ze(u.valueOf() * l.valueOf())), n("uint", "/", "uint", (u, l, f) => {
    if (l.valueOf() === 0n) throw new H("division by zero", f);
    return new Ze(u.valueOf() / l.valueOf());
  }), n("uint", "%", "uint", (u, l, f) => {
    if (l.valueOf() === 0n) throw new H("modulo by zero", f);
    return new Ze(u.valueOf() % l.valueOf());
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
function qn(e, t, n) {
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
  throw new H(`Cannot compare values of type ${typeof e}`);
}
class Sf {
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
        return t === null ? this.nullType : this.objectTypesByConstructor.get(t.constructor)?.type || Tc(this, t.constructor?.name || typeof t);
      default:
        Tc(this, typeof t);
    }
  }
}
function Tc(e, t) {
  throw new e.Error(`Unsupported type: ${t}`);
}
function jr(e, t, n, r, i) {
  return n instanceof Promise || r instanceof Promise ? Promise.all([n, r]).then((s) => i(e, t, s[0], s[1])) : i(e, t, n, r);
}
function Sc(e, t, n) {
  const r = e.check(t.args[0], n);
  return t.op === "[]" && e.check(t.args[1], n), r.kind !== "optional" ? e.checkAccessOnType(t, n, r) : e.registry.getOptionalType(e.checkAccessOnType(t, n, r.valueType, !0));
}
function vc(e, t, n) {
  const r = e.check(t.args[0], n);
  t.op === "[?]" && e.check(t.args[1], n);
  const i = r.kind === "optional" ? r.valueType : r;
  return e.registry.getOptionalType(e.checkAccessOnType(t, n, i, !0));
}
function Ac(e, t, n, r, i) {
  const s = e.check(r, t);
  if (s === n || n.isEmpty()) return s;
  if (s.isEmpty()) return n;
  let o;
  throw i === 0 ? o = "List elements must have the same type," : i === 1 ? o = "Map key uses wrong type," : i === 2 && (o = "Map value uses wrong type,"), new e.Error(
    `${o} expected type '${e.formatType(n)}' but found '${e.formatType(s)}'`,
    r
  );
}
function Ic(e, t, n, r) {
  return n.unify(e.registry, e.check(r, t)) || e.dynType;
}
function Ii(e, t, n) {
  const r = e.debugRuntimeType(t, n.checkedType);
  return new e.Error(`Logical operator requires bool operands, got '${r}'`, n);
}
function $y(e, t, n) {
  const r = e.debugRuntimeType(t, n.checkedType);
  return new e.Error(`Ternary condition must be bool, got '${r}'`, n);
}
function kc(e, t, n, r) {
  if (n === !0) return e.eval(t.args[1], r);
  if (n === !1) return e.eval(t.args[2], r);
  throw $y(e, n, t.args[0]);
}
function Oc(e, t, n) {
  const r = e.debugRuntimeType(n, t.args[0].checkedType), i = e.registry.findUnaryOverload(t.op, r);
  if (i) return i.handler(n);
  throw new e.Error(`no such overload: ${t.op[0]}${r}`, t);
}
function Bc(e, t, n) {
  const r = e.eval(t.args[0], n);
  return r instanceof Promise ? r.then((i) => Oc(e, t, i)) : Oc(e, t, r);
}
function Ny(e, t, n, r) {
  const i = e.debugOperandType(n, t.args[0].checkedType), s = e.debugOperandType(r, t.args[1].checkedType), o = e.registry.findBinaryOverload(t.op, i, s);
  if (o) return o.handler(n, r, t, e);
  throw new e.Error(`no such overload: ${i} ${t.op} ${s}`, t);
}
function Ry(e, t, n) {
  return jr(e, t, e.eval(t.args[0], n), e.eval(t.args[1], n), Ny);
}
function $c(e, t, n, r) {
  if (n === !0) return !0;
  const i = e.eval(t.args[1], r);
  return i instanceof Promise ? i.then((s) => Nc(e, t, n, s)) : Nc(e, t, n, i);
}
function Nc(e, t, n, r) {
  if (r === !0) return !0;
  if (r !== !1) throw Ii(e, r, t.args[1]);
  if (n instanceof Error) throw n;
  if (n !== !1) throw Ii(e, n, t.args[0]);
  return !1;
}
function Rc(e, t, n, r) {
  if (n === !1) return !1;
  const i = e.eval(t.args[1], r);
  return i instanceof Promise ? i.then((s) => Uc(e, t, n, s)) : Uc(e, t, n, i);
}
function Uc(e, t, n, r) {
  if (r === !1) return !1;
  if (r !== !0) throw Ii(e, r, t.args[1]);
  if (n instanceof Error) throw n;
  if (n !== !0) throw Ii(e, n, t.args[0]);
  return !0;
}
function Lc(e, t, n) {
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
function Cc(e, t, n) {
  const r = t.op, i = e.check(t.args[0], n);
  if (i.kind === "dyn") return r === "!_" ? e.boolType : i;
  const s = e.registry.findUnaryOverload(r, i);
  if (s) return s.returnType;
  throw new e.Error(`no such overload: ${r[0]}${e.formatType(i)}`, t);
}
function Uy(e, t, n) {
  const r = t.op, i = e.check(t.args[0], n), s = e.check(t.args[1], n), o = e.registry.checkBinaryOverload(r, i, s);
  if (o) return o;
  throw new e.Error(
    `no such overload: ${e.formatType(i)} ${r} ${e.formatType(s)}`,
    t
  );
}
function Pc(e, t, n) {
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
function Ly(e, t, n, r) {
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
function bs(e, t, n, r = n.length) {
  let i;
  const s = new Array(r);
  for (; r--; ) (s[r] = e.eval(n[r], t)) instanceof Promise && (i ??= !0);
  return i ? Promise.all(s) : s;
}
function _c(e) {
  const t = {};
  for (let n = 0; n < e.length; n++) {
    const [r, i] = e[n];
    r === "__proto__" || r === "constructor" || r === "prototype" || (t[r] = i);
  }
  return t;
}
function Es(e, t, n, r) {
  return e.optionalType.field(n, r, t, e);
}
function xs(e, t, n, r) {
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
    check: Sc,
    evaluate(e, t, n) {
      const r = e.eval(t.args[0], n);
      return r instanceof Promise ? r.then((i) => xs(e, t, i, t.args[1])) : xs(e, t, r, t.args[1]);
    }
  },
  ".?": {
    check: vc,
    evaluate(e, t, n) {
      const r = e.eval(t.args[0], n);
      return r instanceof Promise ? r.then((i) => Es(e, t, i, t.args[1])) : Es(e, t, r, t.args[1]);
    }
  },
  "[]": {
    check: Sc,
    evaluate(e, t, n) {
      return jr(e, t, e.eval(t.args[0], n), e.eval(t.args[1], n), xs);
    }
  },
  "[?]": {
    check: vc,
    evaluate(e, t, n) {
      return jr(e, t, e.eval(t.args[0], n), e.eval(t.args[1], n), Es);
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
      const r = bs(e, n, t.args[1]);
      return r instanceof Promise ? r.then((i) => Pc(e, t, i)) : Pc(e, t, r);
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
      return t.macro ? t.macro.evaluate(e, t.macro, n) : jr(
        e,
        t,
        e.eval(t.args[1], n),
        bs(e, n, t.args[2]),
        Ly
      );
    }
  },
  list: {
    check(e, t, n) {
      const r = t.args, i = r.length;
      if (i === 0) return e.getType("list<T>");
      let s = e.check(r[0], n);
      const o = e.opts.homogeneousAggregateLiterals ? Ac : Ic;
      for (let a = 1; a < i; a++) s = o(e, n, s, r[a], 0);
      return e.registry.getListType(s);
    },
    evaluate(e, t, n) {
      return bs(e, n, t.args);
    }
  },
  map: {
    check(e, t, n) {
      const r = t.args, i = r.length;
      if (i === 0) return e.getType("map<K, V>");
      const s = e.opts.homogeneousAggregateLiterals ? Ac : Ic;
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
      return o ? Promise.all(s).then(_c) : _c(s);
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
      return r instanceof Promise ? r.then((i) => kc(e, t, i, n)) : kc(e, t, r, n);
    }
  },
  "||": {
    check: Lc,
    evaluate(e, t, n) {
      const r = e.tryEval(t.args[0], n);
      return r instanceof Promise ? r.then((i) => $c(e, t, i, n)) : $c(e, t, r, n);
    }
  },
  "&&": {
    check: Lc,
    evaluate(e, t, n) {
      const r = e.tryEval(t.args[0], n);
      return r instanceof Promise ? r.then((i) => Rc(e, t, i, n)) : Rc(e, t, r, n);
    }
  },
  "!_": { check: Cc, evaluate: Bc },
  "-_": { check: Cc, evaluate: Bc }
}, Cy = ["!=", "==", "in", "+", "-", "*", "/", "%", "<", "<=", ">", ">="];
for (const e of Cy) ki[e] = { check: Uy, evaluate: Ry };
for (const e in ki) ki[e].name = e;
const Py = (/* @__PURE__ */ new Map()).set("A", "dyn").set("T", "dyn").set("K", "dyn").set("V", "dyn");
class Dc extends Sf {
  constructor(t, n) {
    super(t), this.isEvaluating = n, this.Error = n ? H : ny;
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
    return t.hasPlaceholder() ? t.templated(this.registry, Py).name : t.name;
  }
  formatTypeList(t) {
    return t.map((n) => this.formatType(n)).join(", ");
  }
}
const B = {
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
class Jo {
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
    return [this.op, ...t.map((n) => n instanceof Jo ? n.toOldStructure() : n)];
  }
}
const Wr = {};
for (const e in B) Wr[B[e]] = e;
const _y = /* @__PURE__ */ new Set([
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
]), vf = new Uint8Array(128);
for (const e of "0123456789abcdefABCDEF") vf[e.charCodeAt(0)] = 1;
const Vc = {
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
class Dy {
  constructor(t) {
    this.input = t, this.pos = 0, this.length = t.length;
  }
  // Read next token
  nextToken() {
    for (; ; ) {
      const { pos: t, input: n, length: r } = this;
      if (t >= r) return { type: B.EOF, value: null, pos: t };
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
          return { type: B.EQ, value: "==", pos: (this.pos += 2) - 2 };
        case "&":
          if (n[t + 1] !== "&") break;
          return { type: B.AND, value: "&&", pos: (this.pos += 2) - 2 };
        case "|":
          if (n[t + 1] !== "|") break;
          return { type: B.OR, value: "||", pos: (this.pos += 2) - 2 };
        case "+":
          return { type: B.PLUS, value: "+", pos: this.pos++ };
        case "-":
          return { type: B.MINUS, value: "-", pos: this.pos++ };
        case "*":
          return { type: B.MULTIPLY, value: "*", pos: this.pos++ };
        case "/":
          if (n[t + 1] === "/") {
            for (; this.pos < r && this.input[this.pos] !== `
`; ) this.pos++;
            continue;
          }
          return { type: B.DIVIDE, value: "/", pos: this.pos++ };
        case "%":
          return { type: B.MODULO, value: "%", pos: this.pos++ };
        case "<":
          return n[t + 1] === "=" ? { type: B.LE, value: "<=", pos: (this.pos += 2) - 2 } : { type: B.LT, value: "<", pos: this.pos++ };
        case ">":
          return n[t + 1] === "=" ? { type: B.GE, value: ">=", pos: (this.pos += 2) - 2 } : { type: B.GT, value: ">", pos: this.pos++ };
        case "!":
          return n[t + 1] === "=" ? { type: B.NE, value: "!=", pos: (this.pos += 2) - 2 } : { type: B.NOT, pos: this.pos++ };
        case "(":
          return { type: B.LPAREN, pos: this.pos++ };
        case ")":
          return { type: B.RPAREN, pos: this.pos++ };
        case "[":
          return { type: B.LBRACKET, pos: this.pos++ };
        case "]":
          return { type: B.RBRACKET, pos: this.pos++ };
        case "{":
          return { type: B.LBRACE, pos: this.pos++ };
        case "}":
          return { type: B.RBRACE, pos: this.pos++ };
        case ".":
          return { type: B.DOT, pos: this.pos++ };
        case ",":
          return { type: B.COMMA, pos: this.pos++ };
        case ":":
          return { type: B.COLON, pos: this.pos++ };
        case "?":
          return { type: B.QUESTION, pos: this.pos++ };
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
    if (Number.isFinite(r)) return { type: B.NUMBER, value: r, pos: t };
    throw new st(`Invalid number: ${r}`, { pos: t, input: this.input });
  }
  _parseAsBigInt(t, n, r, i) {
    const s = this.input.substring(t, n);
    if (i === "u" || i === "U") {
      this.pos++;
      try {
        return {
          type: B.NUMBER,
          value: new Ze(s),
          pos: t
        };
      } catch {
      }
    } else
      try {
        return {
          type: B.NUMBER,
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
      for (i += 2; i < n && vf[t[i].charCodeAt(0)]; ) i++;
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
        return { type: B.BYTES, value: s, pos: r - 1 };
      }
      case "r":
      case "R":
        return { type: B.STRING, value: t, pos: r - 1 };
      default: {
        const i = this.processEscapes(t, !1);
        return { type: B.STRING, value: i, pos: r };
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
      if (Vc[s])
        r += Vc[s], i += 2;
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
        return { type: B.BOOLEAN, value: !0, pos: t };
      case "false":
        return { type: B.BOOLEAN, value: !1, pos: t };
      case "null":
        return { type: B.NULL, value: null, pos: t };
      case "in":
        return { type: B.IN, value: "in", pos: t };
      default:
        return { type: B.IDENTIFIER, value: s, pos: t };
    }
  }
}
class Vy {
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
    const i = new Jo(t, this.input, n, r);
    return this.astNodesRemaining-- || this.#t("maxAstNodes", i), i;
  }
  #n() {
    const t = this.currentToken;
    return this.type = (this.currentToken = this.lexer.nextToken()).type, t;
  }
  consume(t) {
    if (this.type === t) return this.#n();
    throw new st(
      `Expected ${Wr[t]}, got ${Wr[this.type]}`,
      { pos: this.currentToken.pos, input: this.input }
    );
  }
  match(t) {
    return this.type === t;
  }
  // Parse entry point
  parse(t) {
    this.input = t, this.lexer = new Dy(t), this.#n(), this.maxDepthRemaining = this.limits.maxDepth, this.astNodesRemaining = this.limits.maxAstNodes;
    const n = this.parseExpression();
    if (this.match(B.EOF)) return n;
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
    if (!this.match(B.QUESTION)) return ++this.maxDepthRemaining && t;
    const n = this.#n(), r = this.parseExpression();
    this.consume(B.COLON);
    const i = this.parseExpression();
    return this.maxDepthRemaining++, this.#e(n.pos, "?:", [t, r, i]);
  }
  // LogicalOr ::= LogicalAnd ('||' LogicalAnd)*
  parseLogicalOr() {
    let t = this.parseLogicalAnd();
    for (; this.match(B.OR); ) {
      const n = this.#n();
      t = this.#e(n.pos, n.value, [t, this.parseLogicalAnd()]);
    }
    return t;
  }
  // LogicalAnd ::= Equality ('&&' Equality)*
  parseLogicalAnd() {
    let t = this.parseEquality();
    for (; this.match(B.AND); ) {
      const n = this.#n();
      t = this.#e(n.pos, n.value, [t, this.parseEquality()]);
    }
    return t;
  }
  // Equality ::= Relational (('==' | '!=') Relational)*
  parseEquality() {
    let t = this.parseRelational();
    for (; this.match(B.EQ) || this.match(B.NE); ) {
      const n = this.#n();
      t = this.#e(n.pos, n.value, [t, this.parseRelational()]);
    }
    return t;
  }
  // Relational ::= Additive (('<' | '<=' | '>' | '>=' | 'in') Additive)*
  parseRelational() {
    let t = this.parseAdditive();
    for (; this.match(B.LT) || this.match(B.LE) || this.match(B.GT) || this.match(B.GE) || this.match(B.IN); ) {
      const n = this.#n();
      t = this.#e(n.pos, n.value, [t, this.parseAdditive()]);
    }
    return t;
  }
  // Additive ::= Multiplicative (('+' | '-') Multiplicative)*
  parseAdditive() {
    let t = this.parseMultiplicative();
    for (; this.match(B.PLUS) || this.match(B.MINUS); ) {
      const n = this.#n();
      t = this.#e(n.pos, n.value, [t, this.parseMultiplicative()]);
    }
    return t;
  }
  // Multiplicative ::= Unary (('*' | '/' | '%') Unary)*
  parseMultiplicative() {
    let t = this.parseUnary();
    for (; this.match(B.MULTIPLY) || this.match(B.DIVIDE) || this.match(B.MODULO); ) {
      const n = this.#n();
      t = this.#e(n.pos, n.value, [t, this.parseUnary()]);
    }
    return t;
  }
  // Unary ::= ('!' | '-')* Postfix
  parseUnary() {
    return this.type === B.NOT ? this.#e(this.#n().pos, "!_", [this.parseUnary()]) : this.type === B.MINUS ? this.#e(this.#n().pos, "-_", [this.parseUnary()]) : this.parsePostfix();
  }
  // Postfix ::= Primary (('.' IDENTIFIER ('(' ArgumentList ')')? | '[' Expression ']'))*
  parsePostfix() {
    let t = this.parsePrimary();
    const n = this.maxDepthRemaining;
    for (; ; ) {
      if (this.match(B.DOT)) {
        const r = this.#n();
        this.maxDepthRemaining-- || this.#t("maxDepth", r);
        const i = this.match(B.QUESTION) && this.registry.enableOptionalTypes && !!this.#n(), s = this.consume(B.IDENTIFIER);
        if (this.match(B.LPAREN) && this.#n()) {
          const o = this.parseArgumentList();
          this.consume(B.RPAREN), t = this.#o(
            this.#e(s.pos, "rcall", [s.value, t, o])
          );
        } else
          t = this.#e(s.pos, i ? ".?" : ".", [t, s.value]);
        continue;
      }
      if (this.match(B.LBRACKET)) {
        const r = this.#n();
        this.maxDepthRemaining-- || this.#t("maxDepth", r);
        const i = this.match(B.QUESTION) && this.registry.enableOptionalTypes && !!this.#n(), s = this.parseExpression();
        this.consume(B.RBRACKET), t = this.#e(r.pos, i ? "[?]" : "[]", [t, s]);
        continue;
      }
      break;
    }
    return this.maxDepthRemaining = n, t;
  }
  // Primary ::= NUMBER | STRING | BOOLEAN | NULL | IDENTIFIER | '(' Expression ')' | Array | Object
  parsePrimary() {
    switch (this.type) {
      case B.NUMBER:
      case B.STRING:
      case B.BYTES:
      case B.BOOLEAN:
      case B.NULL:
        return this.#a();
      case B.IDENTIFIER:
        return this.#c();
      case B.LPAREN:
        return this.#u();
      case B.LBRACKET:
        return this.parseList();
      case B.LBRACE:
        return this.parseMap();
    }
    throw new st(`Unexpected token: ${Wr[this.type]}`, {
      pos: this.currentToken.pos,
      input: this.input
    });
  }
  #a() {
    const t = this.#n();
    return this.#e(t.pos, "value", t.value);
  }
  #c() {
    const { value: t, pos: n } = this.consume(B.IDENTIFIER);
    if (_y.has(t))
      throw new st(`Reserved identifier: ${t}`, {
        pos: n,
        input: this.input
      });
    if (!this.match(B.LPAREN)) return this.#e(n, "id", t);
    this.#n();
    const r = this.parseArgumentList();
    return this.consume(B.RPAREN), this.#i(this.#e(n, "call", [t, r]));
  }
  #u() {
    this.consume(B.LPAREN);
    const t = this.parseExpression();
    return this.consume(B.RPAREN), t;
  }
  parseList() {
    const t = this.consume(B.LBRACKET), n = [];
    let r = this.limits.maxListElements;
    if (!this.match(B.RBRACKET))
      for (n.push(this.parseExpression()), r-- || this.#t("maxListElements", n.at(-1)); this.match(B.COMMA) && (this.#n(), !this.match(B.RBRACKET)); )
        n.push(this.parseExpression()), r-- || this.#t("maxListElements", n.at(-1));
    return this.consume(B.RBRACKET), this.#e(t.pos, "list", n);
  }
  parseMap() {
    const t = this.consume(B.LBRACE), n = [];
    let r = this.limits.maxMapEntries;
    if (!this.match(B.RBRACE))
      for (n.push(this.parseProperty()), r-- || this.#t("maxMapEntries", n.at(-1)[0]); this.match(B.COMMA) && (this.#n(), !this.match(B.RBRACE)); )
        n.push(this.parseProperty()), r-- || this.#t("maxMapEntries", n.at(-1)[0]);
    return this.consume(B.RBRACE), this.#e(t.pos, "map", n);
  }
  parseProperty() {
    return [this.parseExpression(), (this.consume(B.COLON), this.parseExpression())];
  }
  parseArgumentList() {
    const t = [];
    let n = this.limits.maxCallArguments;
    if (!this.match(B.RPAREN))
      for (t.push(this.parseExpression()), n-- || this.#t("maxCallArguments", t.at(-1)); this.match(B.COMMA) && (this.#n(), !this.match(B.RPAREN)); )
        t.push(this.parseExpression()), n-- || this.#t("maxCallArguments", t.at(-1));
    return t;
  }
}
const ta = Object.freeze({
  maxAstNodes: 1e5,
  maxDepth: 250,
  maxListElements: 1e3,
  maxMapEntries: 1e3,
  maxCallArguments: 32
}), My = new Set(Object.keys(ta));
function Hy(e, t = ta) {
  const n = e ? Object.keys(e) : void 0;
  if (!n?.length) return t;
  const r = { ...t };
  for (const i of n) {
    if (!My.has(i)) throw new TypeError(`Unknown limits option: ${i}`);
    const s = e[i];
    typeof s == "number" && (r[i] = s);
  }
  return Object.freeze(r);
}
const Fy = Object.freeze({
  unlistedVariablesAreDyn: !1,
  homogeneousAggregateLiterals: !0,
  enableOptionalTypes: !1,
  limits: ta
});
function Ts(e, t, n) {
  const r = e?.[n] ?? t?.[n];
  if (typeof r != "boolean") throw new TypeError(`Invalid option: ${n}`);
  return r;
}
function Ky(e, t = Fy) {
  return e ? Object.freeze({
    unlistedVariablesAreDyn: Ts(e, t, "unlistedVariablesAreDyn"),
    homogeneousAggregateLiterals: Ts(e, t, "homogeneousAggregateLiterals"),
    enableOptionalTypes: Ts(e, t, "enableOptionalTypes"),
    limits: Hy(e.limits, t.limits)
  }) : t;
}
const Yi = hy({ enableOptionalTypes: !1 });
oy(Yi);
By(Yi);
Oy(Yi);
const Mc = /* @__PURE__ */ new WeakMap();
class fn {
  #t;
  #e;
  #n;
  #r;
  #i;
  #o;
  constructor(t, n) {
    this.opts = Ky(t, n?.opts), this.#t = (n instanceof fn ? Mc.get(n) : Yi).clone(this.opts);
    const r = {
      objectTypes: this.#t.objectTypes,
      objectTypesByConstructor: this.#t.objectTypesByConstructor,
      registry: this.#t,
      opts: this.opts
    };
    this.#n = new Dc(r), this.#r = new Dc(r, !0), this.#e = new zy(r), this.#i = new Vy(this.opts.limits, this.#t), this.#o = new py(this.#t.variables, this.#t.constants), Mc.set(this, this.#t), Object.freeze(this);
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
class zy extends Sf {
  constructor(t) {
    super(t), this.Error = H;
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
const ea = "amount", jy = "expiry", Wy = "birth", Gy = "weight", qy = "inputType", Yy = "script", Cn = {
  signature: "now(): double",
  implementation: () => Math.floor(Date.now() / 1e3)
}, Hc = new fn().registerVariable(ea, "double").registerVariable(Yy, "string").registerFunction(Cn.signature, Cn.implementation), Zy = new fn().registerVariable(ea, "double").registerVariable(jy, "double").registerVariable(Wy, "double").registerVariable(Gy, "double").registerVariable(qy, "string").registerFunction(Cn.signature, Cn.implementation), Xy = new fn().registerVariable(ea, "double").registerFunction(Cn.signature, Cn.implementation);
class Ut {
  constructor(t) {
    this.value = t;
  }
  get satoshis() {
    return this.value ? Math.ceil(this.value) : 0;
  }
  add(t) {
    return new Ut(this.value + t.value);
  }
}
Ut.ZERO = new Ut(0);
class Qy {
  /**
   * Creates a new Estimator with the given config
   * @param config - Configuration containing CEL programs for fee calculation
   */
  constructor(t) {
    this.config = t, this.intentOffchainInput = t.offchainInput ? Cr(t.offchainInput, Zy) : void 0, this.intentOnchainInput = t.onchainInput ? Cr(t.onchainInput, Xy) : void 0, this.intentOffchainOutput = t.offchainOutput ? Cr(t.offchainOutput, Hc) : void 0, this.intentOnchainOutput = t.onchainOutput ? Cr(t.onchainOutput, Hc) : void 0;
  }
  /**
   * Evaluates the fee for a given vtxo input
   * @param input - The offchain input to evaluate
   * @returns The fee amount for this input
   */
  evalOffchainInput(t) {
    if (!this.intentOffchainInput)
      return Ut.ZERO;
    const n = Jy(t);
    return new Ut(this.intentOffchainInput.program(n));
  }
  /**
   * Evaluates the fee for a given boarding input
   * @param input - The onchain input to evaluate
   * @returns The fee amount for this input
   */
  evalOnchainInput(t) {
    if (!this.intentOnchainInput)
      return Ut.ZERO;
    const n = {
      amount: Number(t.amount)
    };
    return new Ut(this.intentOnchainInput.program(n));
  }
  /**
   * Evaluates the fee for a given vtxo output
   * @param output - The output to evaluate
   * @returns The fee amount for this output
   */
  evalOffchainOutput(t) {
    if (!this.intentOffchainOutput)
      return Ut.ZERO;
    const n = Fc(t);
    return new Ut(this.intentOffchainOutput.program(n));
  }
  /**
   * Evaluates the fee for a given collaborative exit output
   * @param output - The output to evaluate
   * @returns The fee amount for this output
   */
  evalOnchainOutput(t) {
    if (!this.intentOnchainOutput)
      return Ut.ZERO;
    const n = Fc(t);
    return new Ut(this.intentOnchainOutput.program(n));
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
    let s = Ut.ZERO;
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
function Jy(e) {
  const t = {
    amount: Number(e.amount),
    inputType: e.type,
    weight: e.weight
  };
  return e.expiry && (t.expiry = Math.floor(e.expiry.getTime() / 1e3)), e.birth && (t.birth = Math.floor(e.birth.getTime() / 1e3)), t;
}
function Fc(e) {
  return {
    amount: Number(e.amount),
    script: e.script
  };
}
function Cr(e, t) {
  const n = t.parse(e), r = n.check();
  if (!r.valid)
    throw new Error(`type check failed: ${r.error?.message ?? "unknown error"}`);
  if (r.type !== "double")
    throw new Error(`expected return type double, got ${r.type}`);
  return { program: n, text: e };
}
const Yn = {
  commitmentTxid: "",
  boardingTxid: "",
  arkTxid: ""
};
function tw(e, t, n) {
  const r = [...e].sort((u, l) => u.createdAt.getTime() - l.createdAt.getTime()), i = [];
  let s = [];
  const o = /* @__PURE__ */ new Map();
  for (const u of r) {
    if (u.settledBy) {
      const f = o.get(u.settledBy) ?? [];
      o.set(u.settledBy, [...f, u]);
    }
    if (u.isSpent && u.arkTxId) {
      const f = r.find((h) => h.txid === u.arkTxId);
      if (f) {
        if (!i.some((h) => h.key.arkTxid === f.txid)) {
          const p = r.filter((y) => y.arkTxId === f.txid).reduce((y, d) => y + d.value, 0);
          i.push({
            key: { ...Yn, arkTxid: f.txid },
            tag: "offchain",
            type: ye.TxSent,
            amount: p - f.value,
            settled: !0,
            createdAt: f.createdAt.getTime()
          });
        }
      } else
        i.push({
          key: { ...Yn, arkTxid: u.arkTxId },
          tag: "offchain",
          type: ye.TxSent,
          amount: u.value,
          settled: !0,
          // This is the creation time of the VTXO, not the onchain tx
          // If it is the change of a previous transaction, they will have the same createdAt
          // and possibly end up in the wrong order in the history
          createdAt: u.createdAt.getTime() + 1
        });
    }
    if (u.virtualStatus.state !== "preconfirmed" && u.virtualStatus.commitmentTxIds?.every((f) => n.has(f)))
      continue;
    const l = u.virtualStatus.commitmentTxIds?.filter((f) => o.has(f)) ?? [];
    if (l.length > 0 && u.status.isLeaf)
      for (const f of l) {
        const h = r.filter((y) => y.settledBy === f);
        if (h.length === 0)
          continue;
        const p = h.reduce((y, d) => y + d.value, 0);
        u.value < p && i.push({
          key: { ...Yn, commitmentTxid: f },
          tag: "exit",
          type: ye.TxSent,
          amount: p - u.value,
          settled: !0,
          createdAt: u.createdAt.getTime()
        }), u.value === p && u.settledBy && u.status.confirmed && i.push({
          key: { ...Yn, commitmentTxid: f },
          tag: "exit",
          type: ye.TxSent,
          amount: u.value,
          settled: !0,
          createdAt: u.createdAt.getTime()
        });
      }
    else
      i.find((h) => h.key.arkTxid === u.txid) || s.push({
        key: { ...Yn, arkTxid: u.txid },
        tag: "offchain",
        type: ye.TxReceived,
        amount: u.value,
        settled: !!u.spentBy,
        createdAt: u.createdAt.getTime()
      });
  }
  return [...t.filter((u) => !n.has(u.key.commitmentTxid)).map((u) => ({ ...u, tag: "boarding" })), ...i, ...s].sort((u, l) => l.createdAt - u.createdAt);
}
function ew(e) {
  return typeof e == "object" && e !== null && "toReadonly" in e && typeof e.toReadonly == "function";
}
class sn {
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
      return new ff(t.arkServerUrl);
    })(), i = t.arkServerUrl || r.serverUrl;
    if (!i)
      throw new Error("Could not determine arkServerUrl from provider");
    const s = t.indexerUrl || i, o = t.indexerProvider || new pf(s), a = await r.getInfo(), c = vg(a.network), u = t.esploraUrl || Ig[a.network], l = t.onchainProvider || new kg(u);
    if (t.exitTimelock) {
      const { value: R, type: C } = t.exitTimelock;
      if (R < 512n && C !== "blocks" || R >= 512n && C !== "seconds")
        throw new Error("invalid exitTimelock");
    }
    const f = t.exitTimelock ?? {
      value: a.unilateralExitDelay,
      type: a.unilateralExitDelay < 512n ? "blocks" : "seconds"
    };
    if (t.boardingTimelock) {
      const { value: R, type: C } = t.boardingTimelock;
      if (R < 512n && C !== "blocks" || R >= 512n && C !== "seconds")
        throw new Error("invalid boardingTimelock");
    }
    const h = t.boardingTimelock ?? {
      value: a.boardingExitDelay,
      type: a.boardingExitDelay < 512n ? "blocks" : "seconds"
    }, p = $.decode(a.signerPubkey).slice(1), y = new Ei.Script({
      pubKey: n,
      serverPubKey: p,
      csvTimelock: f
    }), d = new Ei.Script({
      pubKey: n,
      serverPubKey: p,
      csvTimelock: h
    }), g = y, m = t.storage || new Qg(), S = new so(m), k = new ey(m);
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
      walletRepository: S,
      contractRepository: k,
      info: a
    };
  }
  static async create(t) {
    const n = await t.identity.xOnlyPublicKey();
    if (!n)
      throw new Error("Invalid configured public key");
    const r = await sn.setupWalletConfig(t, n);
    return new sn(t.identity, r.network, r.onchainProvider, r.indexerProvider, r.serverPubKey, r.offchainTapscript, r.boardingTapscript, r.dustAmount, r.walletRepository, r.contractRepository);
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
    s = n.filter((l) => l.virtualStatus.state === "settled").reduce((l, f) => l + f.value, 0), o = n.filter((l) => l.virtualStatus.state === "preconfirmed").reduce((l, f) => l + f.value, 0), a = n.filter((l) => Re(l) && l.virtualStatus.state === "swept").reduce((l, f) => l + f.value, 0);
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
    const n = await this.getAddress(), i = (await this.getVirtualCoins(t)).map((s) => Pe(this, s));
    return await this.walletRepository.saveVtxos(n, i), i;
  }
  async getVirtualCoins(t = { withRecoverable: !0, withUnrolled: !1 }) {
    const n = [$.encode(this.offchainTapscript.pkScript)], i = (await this.indexerProvider.getVtxos({ scripts: n })).vtxos;
    let s = i.filter(Re);
    if (t.withRecoverable || (s = s.filter((o) => !Yo(o) && !cf(o))), t.withUnrolled) {
      const o = i.filter((a) => !Re(a));
      s.push(...o.filter((a) => a.isUnrolled));
    }
    return s;
  }
  async getTransactionHistory() {
    const t = await this.indexerProvider.getVtxos({
      scripts: [$.encode(this.offchainTapscript.pkScript)]
    }), { boardingTxs: n, commitmentsToIgnore: r } = await this.getBoardingTxs();
    return tw(t.vtxos, n, r);
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
        type: ye.TxReceived,
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
    const t = await this.getBoardingAddress(), r = (await this.onchainProvider.getCoins(t)).map((i) => oo(this, i));
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
        $.encode(a.pkScript)
      ]), u = new AbortController(), l = this.indexerProvider.getSubscription(c, u.signal);
      s = async () => {
        u.abort(), await this.indexerProvider?.unsubscribeForScripts(c);
      }, (async () => {
        try {
          for await (const f of l)
            (f.newVtxos?.length > 0 || f.spentVtxos?.length > 0) && t({
              type: "vtxo",
              newVtxos: f.newVtxos.map((h) => Pe(this, h)),
              spentVtxos: f.spentVtxos.map((h) => Pe(this, h))
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
    const t = [$.encode(this.offchainTapscript.pkScript)];
    let { vtxos: n } = await this.indexerProvider.getVtxos({
      scripts: t
    });
    return n.filter((r) => r.virtualStatus.state !== "swept" && r.virtualStatus.state !== "settled" && r.arkTxId !== void 0).map((r) => r.arkTxId);
  }
}
class Pn extends sn {
  constructor(t, n, r, i, s, o, a, c, u, l, f, h, p, y, d, g) {
    super(t, n, i, o, a, c, u, p, y, d), this.networkName = r, this.arkProvider = s, this.serverUnrollScript = l, this.forfeitOutputScript = f, this.forfeitPubkey = h, this.identity = t, this.renewalConfig = {
      enabled: g?.enabled ?? !1,
      ...qg,
      ...g
    };
  }
  static async create(t) {
    const n = await t.identity.xOnlyPublicKey();
    if (!n)
      throw new Error("Invalid configured public key");
    const r = await sn.setupWalletConfig(t, n);
    let i;
    try {
      const c = $.decode(r.info.checkpointTapscript);
      i = _t.decode(c);
    } catch {
      throw new Error("Invalid checkpointTapscript from server");
    }
    const s = $.decode(r.info.forfeitPubkey).slice(1), o = on(r.network).decode(r.info.forfeitAddress), a = ht.encode(o);
    return new Pn(t.identity, r.network, r.networkName, r.onchainProvider, r.arkProvider, r.indexerProvider, r.serverPubKey, r.offchainTapscript, r.boardingTapscript, i, a, s, r.dustAmount, r.walletRepository, r.contractRepository, t.renewalConfig);
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
    const t = ew(this.identity) ? await this.identity.toReadonly() : this.identity;
    return new sn(t, this.network, this.onchainProvider, this.indexerProvider, this.arkServerPublicKey, this.offchainTapscript, this.boardingTapscript, this.dustAmount, this.walletRepository, this.contractRepository);
  }
  async sendBitcoin(t) {
    if (t.amount <= 0)
      throw new Error("Amount must be positive");
    if (!rw(t.address))
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
      r = iw(n, t.amount);
    const i = this.offchainTapscript.forfeit();
    if (!i)
      throw new Error("Selected leaf not found");
    const s = rn.decode(t.address), a = [
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
    const c = this.offchainTapscript.encode(), u = Kg(r.inputs.map((y) => ({
      ...y,
      tapLeafScript: i,
      tapTree: c
    })), a, this.serverUnrollScript), l = await this.identity.sign(u.arkTx), { arkTxid: f, signedCheckpointTxs: h } = await this.arkProvider.submitTx(Et.encode(l.toPSBT()), u.checkpoints.map((y) => Et.encode(y.toPSBT()))), p = await Promise.all(h.map(async (y) => {
      const d = qt.fromPSBT(Et.decode(y)), g = await this.identity.sign(d);
      return Et.encode(g.toPSBT());
    }));
    await this.arkProvider.finalizeTx(f, p);
    try {
      const y = [], d = /* @__PURE__ */ new Set();
      let g = Number.MAX_SAFE_INTEGER;
      for (const [k, R] of r.inputs.entries()) {
        const C = Pe(this, R), W = h[k], T = qt.fromPSBT(Et.decode(W));
        if (y.push({
          ...C,
          virtualStatus: { ...C.virtualStatus, state: "spent" },
          spentBy: T.id,
          arkTxId: f,
          isSpent: !0
        }), C.virtualStatus.commitmentTxIds)
          for (const Q of C.virtualStatus.commitmentTxIds)
            d.add(Q);
        C.virtualStatus.batchExpiry && (g = Math.min(g, C.virtualStatus.batchExpiry));
      }
      const m = Date.now(), S = this.arkAddress.encode();
      if (r.changeAmount > 0n && g !== Number.MAX_SAFE_INTEGER) {
        const k = {
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
        await this.walletRepository.saveVtxos(S, [k]);
      }
      await this.walletRepository.saveVtxos(S, y), await this.walletRepository.saveTransactions(S, [
        {
          key: {
            boardingTxid: "",
            commitmentTxid: "",
            arkTxid: f
          },
          amount: t.amount,
          type: ye.TxSent,
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
            dt.fromString(y);
          } catch {
            throw new Error(`Invalid arknote "${y}"`);
          }
    }
    if (!t) {
      const { fees: y } = await this.arkProvider.getInfo(), d = new Qy(y.intentFee);
      let g = 0;
      const S = _t.decode($.decode(this.boardingTapscript.exitScript)).params.timelock, k = (await this.getBoardingUtxos()).filter((J) => !Wg(J, S)), R = [];
      for (const J of k) {
        const at = d.evalOnchainInput({
          amount: BigInt(J.value)
        });
        at.value >= J.value || (R.push(J), g += J.value - at.satoshis);
      }
      const C = await this.getVtxos({ withRecoverable: !0 }), W = [];
      for (const J of C) {
        const at = d.evalOffchainInput({
          amount: BigInt(J.value),
          type: J.virtualStatus.state === "swept" ? "recoverable" : "vtxo",
          weight: 0,
          birth: J.createdAt,
          expiry: J.virtualStatus.batchExpiry ? new Date(J.virtualStatus.batchExpiry * 1e3) : /* @__PURE__ */ new Date()
        });
        at.value >= J.value || (W.push(J), g += J.value - at.satoshis);
      }
      const T = [...R, ...W];
      if (T.length === 0)
        throw new Error("No inputs found");
      const Q = {
        address: await this.getAddress(),
        amount: BigInt(g)
      }, L = d.evalOffchainOutput({
        amount: Q.amount,
        script: $.encode(rn.decode(Q.address).pkScript)
      });
      if (Q.amount -= BigInt(L.satoshis), Q.amount <= this.dustAmount)
        throw new Error("Output amount is below dust limit");
      t = {
        inputs: T,
        outputs: [Q]
      };
    }
    const r = [], i = [];
    let s = !1;
    for (const [y, d] of t.outputs.entries()) {
      let g;
      try {
        g = rn.decode(d.address).pkScript, s = !0;
      } catch {
        const m = on(this.network).decode(d.address);
        g = ht.encode(m), r.push(y);
      }
      i.push({
        amount: d.amount,
        script: g
      });
    }
    let o;
    const a = [];
    s && (o = this.identity.signerSession(), a.push($.encode(await o.getPublicKey())));
    const [c, u] = await Promise.all([
      this.makeRegisterIntentSignature(t.inputs, i, r, a),
      this.makeDeleteIntentSignature(t.inputs)
    ]), l = await this.safeRegisterIntent(c), f = [
      ...a,
      ...t.inputs.map((y) => `${y.txid}:${y.vout}`)
    ], h = this.createBatchHandler(l, t.inputs, o), p = new AbortController();
    try {
      const y = this.arkProvider.getEventStream(p.signal, f);
      return await ro.join(y, h, {
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
    let a = qt.fromPSBT(Et.decode(t.commitmentTx)), c = !1, u = 0;
    const l = i?.leaves() || [];
    for (const f of n) {
      const h = o.find((k) => k.txid === f.txid && k.vout === f.vout);
      if (!h) {
        for (let k = 0; k < a.inputsLength; k++) {
          const R = a.getInput(k);
          if (!R.txid || R.index === void 0)
            throw new Error("The server returned incomplete data. No settlement input found in the PSBT");
          if ($.encode(R.txid) === f.txid && R.index === f.vout) {
            a.updateInput(k, {
              tapLeafScript: [f.forfeitTapLeafScript]
            }), a = await this.identity.sign(a, [
              k
            ]), c = !0;
            break;
          }
        }
        continue;
      }
      if (Yo(h) || uf(h, this.dustAmount))
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
      let S = Rg([
        {
          txid: f.txid,
          index: f.vout,
          witnessUtxo: {
            amount: BigInt(h.value),
            script: Kt.decode(f.tapTree).pkScript
          },
          sighashType: an.DEFAULT,
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
      S = await this.identity.sign(S, [0]), s.push(Et.encode(S.toPSBT()));
    }
    (s.length > 0 || c) && await this.arkProvider.submitSignedForfeitTxs(s, c ? Et.encode(a.toPSBT()) : void 0);
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
        const o = new TextEncoder().encode(t), a = xt(o), c = $.encode(a);
        let u = !0;
        for (const f of s.intentIdHashes)
          if (f === c) {
            if (!this.arkProvider)
              throw new Error("Ark provider not configured");
            await this.arkProvider.confirmRegistration(t), u = !1;
          }
        if (u)
          return { skip: u };
        const l = _t.encode({
          timelock: {
            value: s.batchExpiry,
            type: s.batchExpiry >= 512n ? "seconds" : "blocks"
          },
          pubkeys: [this.forfeitPubkey]
        }).script;
        return i = Qn(l), { skip: !1 };
      },
      onTreeSigningStarted: async (s, o) => {
        if (!r)
          return { skip: !0 };
        if (!i)
          throw new Error("Sweep tap tree root not set");
        const a = s.cosignersPublicKeys.map((y) => y.slice(2)), u = (await r.getPublicKey()).subarray(1);
        if (!a.includes($.encode(u)))
          return { skip: !0 };
        const l = qt.fromPSBT(Et.decode(s.unsignedCommitmentTx));
        Fg(o, l, i);
        const f = l.getOutput(0);
        if (!f?.amount)
          throw new Error("Shared output not found");
        await r.init(o, i, f.amount);
        const h = $.encode(await r.getPublicKey()), p = await r.getNonces();
        return await this.arkProvider.submitTreeNonces(s.id, h, p), { skip: !1 };
      },
      onTreeNonces: async (s) => {
        if (!r)
          return { fullySigned: !0 };
        const { hasAllNonces: o } = await r.aggregatedNonces(s.txid, s.nonces);
        if (!o)
          return { fullySigned: !1 };
        const a = await r.sign(), c = $.encode(await r.getPublicKey());
        return await this.arkProvider.submitTreeSignatures(s.id, c, a), { fullySigned: !0 };
      },
      onBatchFinalization: async (s, o, a) => {
        if (!this.forfeitOutputScript)
          throw new Error("Forfeit output script not set");
        a && Hg(s.commitmentTx, a), await this.handleSettlementFinalizationEvent(s, n, this.forfeitOutputScript, a);
      }
    };
  }
  async safeRegisterIntent(t) {
    try {
      return await this.arkProvider.registerIntent(t);
    } catch (n) {
      if (n instanceof lf && n.code === 0 && n.message.includes("duplicated input")) {
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
    }, a = Ce.create(o, s, n), c = await this.identity.sign(a);
    return {
      proof: Et.encode(c.toPSBT()),
      message: o
    };
  }
  async makeDeleteIntentSignature(t) {
    const n = this.prepareIntentProofInputs(t), r = {
      type: "delete",
      expire_at: 0
    }, i = Ce.create(r, n, []), s = await this.identity.sign(i);
    return {
      proof: Et.encode(s.toPSBT()),
      message: r
    };
  }
  async makeGetPendingTxIntentSignature(t) {
    const n = this.prepareIntentProofInputs(t), r = {
      type: "get-pending-tx",
      expire_at: 0
    }, i = Ce.create(r, n, []), s = await this.identity.sign(i);
    return {
      proof: Et.encode(s.toPSBT()),
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
      const s = [$.encode(this.offchainTapscript.pkScript)];
      let { vtxos: o } = await this.indexerProvider.getVtxos({
        scripts: s
      });
      if (o = o.filter((a) => a.virtualStatus.state !== "swept" && a.virtualStatus.state !== "settled"), o.length === 0)
        return { finalized: [], pending: [] };
      t = o.map((a) => Pe(this, a));
    }
    const r = [], i = [];
    for (let s = 0; s < t.length; s += 20) {
      const o = t.slice(s, s + 20), a = await this.makeGetPendingTxIntentSignature(o), c = await this.arkProvider.getPendingTxs(a);
      for (const u of c) {
        i.push(u.arkTxid);
        try {
          const l = await Promise.all(u.signedCheckpointTxs.map(async (f) => {
            const h = qt.fromPSBT(Et.decode(f)), p = await this.identity.sign(h);
            return Et.encode(p.toPSBT());
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
      const i = Kt.decode(r.tapTree), s = nw(r.intentTapLeafScript), o = [of.encode(r.tapTree)];
      r.extraWitness && o.push(rg.encode(r.extraWitness)), n.push({
        txid: $.decode(r.txid),
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
Pn.MIN_FEE_RATE = 1;
function nw(e) {
  let t;
  try {
    const n = e[1], r = n.subarray(0, n.length - 1);
    try {
      const i = _t.decode(r).params;
      t = Qs.encode(i.timelock.type === "blocks" ? { blocks: Number(i.timelock.value) } : { seconds: Number(i.timelock.value) });
    } catch {
      const i = Rn.decode(r).params;
      t = Number(i.absoluteTimelock);
    }
  } catch {
  }
  return t;
}
function rw(e) {
  try {
    return rn.decode(e), !0;
  } catch {
    return !1;
  }
}
function iw(e, t) {
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
function Kc() {
  const e = crypto.getRandomValues(new Uint8Array(16));
  return $.encode(e);
}
var V;
(function(e) {
  e.walletInitialized = (w) => ({
    type: "WALLET_INITIALIZED",
    success: !0,
    id: w
  });
  function t(w, x) {
    return {
      type: "ERROR",
      success: !1,
      message: x,
      id: w
    };
  }
  e.error = t;
  function n(w, x) {
    return {
      type: "SETTLE_EVENT",
      success: !0,
      event: x,
      id: w
    };
  }
  e.settleEvent = n;
  function r(w, x) {
    return {
      type: "SETTLE_SUCCESS",
      success: !0,
      txid: x,
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
  function a(w, x) {
    return {
      type: "ADDRESS",
      success: !0,
      address: x,
      id: w
    };
  }
  e.address = a;
  function c(w, x) {
    return {
      type: "BOARDING_ADDRESS",
      success: !0,
      address: x,
      id: w
    };
  }
  e.boardingAddress = c;
  function u(w) {
    return w.type === "BALANCE" && w.success === !0;
  }
  e.isBalance = u;
  function l(w, x) {
    return {
      type: "BALANCE",
      success: !0,
      balance: x,
      id: w
    };
  }
  e.balance = l;
  function f(w) {
    return w.type === "VTXOS" && w.success === !0;
  }
  e.isVtxos = f;
  function h(w, x) {
    return {
      type: "VTXOS",
      success: !0,
      vtxos: x,
      id: w
    };
  }
  e.vtxos = h;
  function p(w) {
    return w.type === "VIRTUAL_COINS" && w.success === !0;
  }
  e.isVirtualCoins = p;
  function y(w, x) {
    return {
      type: "VIRTUAL_COINS",
      success: !0,
      virtualCoins: x,
      id: w
    };
  }
  e.virtualCoins = y;
  function d(w) {
    return w.type === "BOARDING_UTXOS" && w.success === !0;
  }
  e.isBoardingUtxos = d;
  function g(w, x) {
    return {
      type: "BOARDING_UTXOS",
      success: !0,
      boardingUtxos: x,
      id: w
    };
  }
  e.boardingUtxos = g;
  function m(w) {
    return w.type === "SEND_BITCOIN_SUCCESS" && w.success === !0;
  }
  e.isSendBitcoinSuccess = m;
  function S(w, x) {
    return {
      type: "SEND_BITCOIN_SUCCESS",
      success: !0,
      txid: x,
      id: w
    };
  }
  e.sendBitcoinSuccess = S;
  function k(w) {
    return w.type === "TRANSACTION_HISTORY" && w.success === !0;
  }
  e.isTransactionHistory = k;
  function R(w, x) {
    return {
      type: "TRANSACTION_HISTORY",
      success: !0,
      transactions: x,
      id: w
    };
  }
  e.transactionHistory = R;
  function C(w) {
    return w.type === "WALLET_STATUS" && w.success === !0;
  }
  e.isWalletStatus = C;
  function W(w, x, A) {
    return {
      type: "WALLET_STATUS",
      success: !0,
      status: {
        walletInitialized: x,
        xOnlyPublicKey: A
      },
      id: w
    };
  }
  e.walletStatus = W;
  function T(w) {
    return w.type === "CLEAR_RESPONSE";
  }
  e.isClearResponse = T;
  function Q(w, x) {
    return {
      type: "CLEAR_RESPONSE",
      success: x,
      id: w
    };
  }
  e.clearResponse = Q;
  function L(w) {
    return w.type === "WALLET_RELOADED";
  }
  e.isWalletReloaded = L;
  function J(w, x) {
    return {
      type: "WALLET_RELOADED",
      success: x,
      id: w
    };
  }
  e.walletReloaded = J;
  function at(w) {
    return w.type === "VTXO_UPDATE";
  }
  e.isVtxoUpdate = at;
  function _(w, x) {
    return {
      type: "VTXO_UPDATE",
      id: Kc(),
      // spontaneous update, not tied to a request
      success: !0,
      spentVtxos: x,
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
      id: Kc(),
      // spontaneous update, not tied to a request
      success: !0,
      coins: w
    };
  }
  e.utxoUpdate = b;
})(V || (V = {}));
class sw {
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
const ow = "arkade-service-worker";
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
    return this.hasWitness && (s += nt.WITNESS_HEADER_SIZE + this.inputWitnessSize), aw(s);
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
const aw = (e) => {
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
class Af {
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
class cw extends Af {
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
class uw {
  constructor(t = ow, n = 1, r = () => {
  }) {
    this.dbName = t, this.dbVersion = n, this.messageCallback = r, this.storage = new sw(t, n), this.walletRepository = new so(this.storage);
  }
  /**
   * Get spendable vtxos for the current wallet address
   */
  async getSpendableVtxos() {
    if (!this.handler)
      return [];
    const t = await this.handler.getAddress();
    return (await this.walletRepository.getVtxos(t)).filter(Re);
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
      spendable: n.filter(Re),
      spent: n.filter((r) => !Re(r))
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
    this.incomingFundsSubscription && this.incomingFundsSubscription(), await this.storage.clear(), this.walletRepository = new so(this.storage), this.handler = void 0, this.arkProvider = void 0, this.indexerProvider = void 0;
  }
  async reload() {
    await this.onWalletInitialized();
  }
  async onWalletInitialized() {
    if (!this.handler || !this.arkProvider || !this.indexerProvider || !this.handler.offchainTapscript || !this.handler.boardingTapscript)
      return;
    const t = $.encode(this.handler.offchainTapscript.pkScript), r = (await this.indexerProvider.getVtxos({
      scripts: [t]
    })).vtxos.map((c) => Pe(this.handler, c));
    try {
      const { pending: c, finalized: u } = await this.handler.handleReload(r);
      console.info(`Recovered ${u.length}/${c.length} pending transactions: ${u.join(", ")}`);
    } catch (c) {
      console.error("Error recovering pending transactions:", c);
    }
    const i = await this.handler.getAddress();
    await this.walletRepository.saveVtxos(i, r);
    const s = await this.handler.getBoardingAddress(), o = await this.handler.onchainProvider.getCoins(s);
    await this.walletRepository.saveUtxos(s, o.map((c) => oo(this.handler, c)));
    const a = await this.handler.getTransactionHistory();
    a && await this.walletRepository.saveTransactions(i, a), this.incomingFundsSubscription && this.incomingFundsSubscription(), this.incomingFundsSubscription = await this.handler.notifyIncomingFunds(async (c) => {
      if (c.type === "vtxo") {
        const u = c.newVtxos.length > 0 ? c.newVtxos.map((f) => Pe(this.handler, f)) : [], l = c.spentVtxos.length > 0 ? c.spentVtxos.map((f) => Pe(this.handler, f)) : [];
        if ([...u, ...l].length === 0)
          return;
        await this.walletRepository.saveVtxos(i, [
          ...u,
          ...l
        ]), await this.sendMessageToAllClients(V.vtxoUpdate(u, l));
      }
      if (c.type === "utxo") {
        const u = c.coins.map((f) => oo(this.handler, f)), l = await this.handler?.getBoardingAddress();
        await this.walletRepository.clearUtxos(l), await this.walletRepository.saveUtxos(l, u), await this.sendMessageToAllClients(V.utxoUpdate(u));
      }
    });
  }
  async handleClear(t) {
    await this.clear(), Tt.isBase(t.data) && t.source?.postMessage(V.clearResponse(t.data.id, !0));
  }
  async handleInitWallet(t) {
    if (!Tt.isInitWallet(t.data)) {
      console.error("Invalid INIT_WALLET message format", t.data), t.source?.postMessage(V.error(t.data.id, "Invalid INIT_WALLET message format"));
      return;
    }
    const n = t.data, { arkServerPublicKey: r, arkServerUrl: i } = n;
    this.arkProvider = new ff(i), this.indexerProvider = new pf(i);
    try {
      if ("privateKey" in n.key && typeof n.key.privateKey == "string") {
        const { key: { privateKey: s } } = n, o = er.fromHex(s), a = await Pn.create({
          identity: o,
          arkServerUrl: i,
          arkServerPublicKey: r,
          storage: this.storage
          // Use unified storage for wallet too
        });
        this.handler = new cw(a);
      } else if ("publicKey" in n.key && typeof n.key.publicKey == "string") {
        const { key: { publicKey: s } } = n, o = Wi.fromPublicKey($.decode(s)), a = await sn.create({
          identity: o,
          arkServerUrl: i,
          arkServerPublicKey: r,
          storage: this.storage
          // Use unified storage for wallet too
        });
        this.handler = new Af(a);
      } else {
        const s = "Missing privateKey or publicKey in key object";
        t.source?.postMessage(V.error(n.id, s)), console.error(s);
        return;
      }
    } catch (s) {
      console.error("Error initializing wallet:", s);
      const o = s instanceof Error ? s.message : "Unknown error occurred";
      t.source?.postMessage(V.error(n.id, o));
      return;
    }
    t.source?.postMessage(V.walletInitialized(n.id)), await this.onWalletInitialized();
  }
  async handleSettle(t) {
    const n = t.data;
    if (!Tt.isSettle(n)) {
      console.error("Invalid SETTLE message format", n), t.source?.postMessage(V.error(n.id, "Invalid SETTLE message format"));
      return;
    }
    try {
      if (!this.handler) {
        console.error("Wallet not initialized"), t.source?.postMessage(V.error(n.id, "Wallet not initialized"));
        return;
      }
      const r = await this.handler.handleSettle(n.params, (i) => {
        t.source?.postMessage(V.settleEvent(n.id, i));
      });
      r ? t.source?.postMessage(V.settleSuccess(n.id, r)) : t.source?.postMessage(V.error(n.id, "Operation not supported in readonly mode"));
    } catch (r) {
      console.error("Error settling:", r);
      const i = r instanceof Error ? r.message : "Unknown error occurred";
      t.source?.postMessage(V.error(n.id, i));
    }
  }
  async handleSendBitcoin(t) {
    const n = t.data;
    if (!Tt.isSendBitcoin(n)) {
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
      const i = r instanceof Error ? r.message : "Unknown error occurred";
      t.source?.postMessage(V.error(n.id, i));
    }
  }
  async handleGetAddress(t) {
    const n = t.data;
    if (!Tt.isGetAddress(n)) {
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
      const i = r instanceof Error ? r.message : "Unknown error occurred";
      t.source?.postMessage(V.error(n.id, i));
    }
  }
  async handleGetBoardingAddress(t) {
    const n = t.data;
    if (!Tt.isGetBoardingAddress(n)) {
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
      const i = r instanceof Error ? r.message : "Unknown error occurred";
      t.source?.postMessage(V.error(n.id, i));
    }
  }
  async handleGetBalance(t) {
    const n = t.data;
    if (!Tt.isGetBalance(n)) {
      console.error("Invalid GET_BALANCE message format", n), t.source?.postMessage(V.error(n.id, "Invalid GET_BALANCE message format"));
      return;
    }
    if (!this.handler) {
      console.error("Wallet not initialized"), t.source?.postMessage(V.error(n.id, "Wallet not initialized"));
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
        Re(p) && (l += p.value);
      const f = o + a, h = c + u + l;
      t.source?.postMessage(V.balance(n.id, {
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
      t.source?.postMessage(V.error(n.id, i));
    }
  }
  async handleGetVtxos(t) {
    const n = t.data;
    if (!Tt.isGetVtxos(n)) {
      console.error("Invalid GET_VTXOS message format", n), t.source?.postMessage(V.error(n.id, "Invalid GET_VTXOS message format"));
      return;
    }
    if (!this.handler) {
      console.error("Wallet not initialized"), t.source?.postMessage(V.error(n.id, "Wallet not initialized"));
      return;
    }
    try {
      const r = await this.getSpendableVtxos(), i = this.handler.dustAmount, o = n.filter?.withRecoverable ?? !1 ? r : r.filter((a) => !(i != null && uf(a, i) || Yo(a) || cf(a)));
      t.source?.postMessage(V.vtxos(n.id, o));
    } catch (r) {
      console.error("Error getting vtxos:", r);
      const i = r instanceof Error ? r.message : "Unknown error occurred";
      t.source?.postMessage(V.error(n.id, i));
    }
  }
  async handleGetBoardingUtxos(t) {
    const n = t.data;
    if (!Tt.isGetBoardingUtxos(n)) {
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
      const i = r instanceof Error ? r.message : "Unknown error occurred";
      t.source?.postMessage(V.error(n.id, i));
    }
  }
  async handleGetTransactionHistory(t) {
    const n = t.data;
    if (!Tt.isGetTransactionHistory(n)) {
      console.error("Invalid GET_TRANSACTION_HISTORY message format", n), t.source?.postMessage(V.error(n.id, "Invalid GET_TRANSACTION_HISTORY message format"));
      return;
    }
    if (!this.handler) {
      console.error("Wallet not initialized"), t.source?.postMessage(V.error(n.id, "Wallet not initialized"));
      return;
    }
    try {
      const r = await this.handler.getTransactionHistory();
      t.source?.postMessage(V.transactionHistory(n.id, r));
    } catch (r) {
      console.error("Error getting transaction history:", r);
      const i = r instanceof Error ? r.message : "Unknown error occurred";
      t.source?.postMessage(V.error(n.id, i));
    }
  }
  async handleGetStatus(t) {
    const n = t.data;
    if (!Tt.isGetStatus(n)) {
      console.error("Invalid GET_STATUS message format", n), t.source?.postMessage(V.error(n.id, "Invalid GET_STATUS message format"));
      return;
    }
    const r = this.handler ? await this.handler.identity.xOnlyPublicKey() : void 0;
    t.source?.postMessage(V.walletStatus(n.id, this.handler !== void 0, r));
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
    if (!Tt.isReloadWallet(n)) {
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
var zc;
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
        if (!(l.type === xn.COMMITMENT || l.type === xn.UNSPECIFIED))
          try {
            if (!(await this.explorer.getTxStatus(l.txid)).confirmed)
              return {
                type: t.WAIT,
                txid: l.txid,
                do: dw(this.explorer, l.txid)
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
      const c = He.fromPSBT(Et.decode(a.txs[0]));
      if (s.type === xn.TREE) {
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
        do: fw(this.bumper, this.explorer, c)
      };
    }
    /**
     * Iterate over the steps to be executed and execute them
     * @returns An async iterator over the executed steps
     */
    async *[Symbol.asyncIterator]() {
      let s;
      do {
        s !== void 0 && await lw(1e3);
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
      const S = hw({ height: m.blockHeight, time: m.blockTime }, a, g);
      if (!S)
        throw new Error(`no available exit path found for vtxo ${g.txid}:${g.vout}`);
      const k = Kt.decode(g.tapTree).findLeaf($.encode(S.script));
      if (!k)
        throw new Error(`spending leaf not found for vtxo ${g.txid}:${g.vout}`);
      l += BigInt(g.value), u.push({
        txid: g.txid,
        index: g.vout,
        tapLeafScript: [k],
        sequence: 4294967294,
        witnessUtxo: {
          amount: BigInt(g.value),
          script: Kt.decode(g.tapTree).pkScript
        },
        sighashType: an.DEFAULT
      }), f.addTapscriptInput(64, k[1].length, ie.encode(k[0]).length);
    }
    const h = new He({ version: 2 });
    for (const g of u)
      h.addInput(g);
    f.addP2TROutput();
    let p = await i.onchainProvider.getFeeRate();
    (!p || p < Pn.MIN_FEE_RATE) && (p = Pn.MIN_FEE_RATE);
    const y = f.vsize().fee(BigInt(p));
    if (y > l)
      throw new Error("fee amount is greater than the total amount");
    h.addOutputAddress(o, l - y);
    const d = await i.identity.sign(h);
    return d.finalize(), await i.onchainProvider.broadcastTransaction(d.hex), d.id;
  }
  e.completeUnroll = r;
})(zc || (zc = {}));
function lw(e) {
  return new Promise((t) => setTimeout(t, e));
}
function fw(e, t, n) {
  return async () => {
    const [r, i] = await e.bumpP2A(n);
    await t.broadcastTransaction(r, i);
  };
}
function dw(e, t) {
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
function hw(e, t, n) {
  const r = Kt.decode(n.tapTree).exitPaths();
  for (const i of r)
    if (i.params.timelock.type === "blocks") {
      if (t.height >= e.height + Number(i.params.timelock.value))
        return i;
    } else if (t.time >= e.time + Number(i.params.timelock.value))
      return i;
}
const If = new uw();
If.start().catch(console.error);
const kf = "arkade-cache-v1";
self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(kf)), self.skipWaiting();
});
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((t) => Promise.all(
      t.map((n) => {
        if (n !== kf)
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
  e.data && e.data.type === "RELOAD_WALLET" && e.waitUntil(If.reload().catch(console.error));
});
